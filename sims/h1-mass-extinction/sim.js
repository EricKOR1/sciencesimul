(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  // 받침 유무에 따라 조사 고르기: josa('사과', '이/가') -> '가'
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? 1.14 : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        let cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  /* 줄바꿈해서 그리기: align center/left, 반환 = 마지막 y */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 말풍선(안내 글) : 반투명 흰 판 + 글 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }

  /* ======================================================
     카드 보드: 카드를 칸(zone)에 끌어다 놓기 / 눌러서 고르고 칸 누르기
     ====================================================== */
  class Board {
    constructor(o) {
      this.zones = o.zones || []; this.tray = o.tray; this.cw = o.cw; this.ch = o.ch; this.gap = o.gap == null ? 8 : o.gap;
      this.onDrop = o.onDrop || (() => true); this.onPlace = o.onPlace || (() => {}); this.onReject = o.onReject || (() => {});
      this.onTap = o.onTap || null; this.vertical = !!o.vertical; this.cards = []; this.drag = null; this.selected = null; this.hoverZone = null;
      this.enabled = true; this.trayLabel = o.trayLabel || '';
    }
    add(c) {
      c.w = c.w || this.cw; c.h = c.h || this.ch; c.zone = c.zone || null; c.lift = 0; c.shake = 0; c.pop = 1;
      c.ord = this.cards.length; c.size = 15; const tw = this.vertical ? c.w - 10 : c.w - (c.draw ? c.h + 6 : 16);
      const maxLines = this.vertical ? 2 : 3;
      for (let s = 15; s >= 13; s--) { c.size = s; c.lines = wrapLines(c.label, tw, s, 800); if (c.lines.length <= maxLines && c.lines.length * s * FS * 1.25 <= (this.vertical ? c.h - (c.draw ? 36 : 8) : c.h - 6)) break; }
      c.x = c.tx = c.x || 0; c.y = c.ty = c.y || 0; this.cards.push(c); return c;
    }
    zone(id) { return this.zones.find((z) => z.id === id); }
    inZone(id) { return this.cards.filter((c) => c.zone === id); }
    layout(snap) {
      const trayCards = this.cards.filter((c) => !c.zone).sort((a, b) => a.ord - b.ord);
      const T = this.tray;
      if (T) {
        const cols = T.cols || Math.max(1, Math.floor((T.w + this.gap) / (this.cw + this.gap)));
        trayCards.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols), n = Math.min(cols, trayCards.length - row * cols);
          const rowW = n * this.cw + (n - 1) * this.gap;
          c.tx = T.x + (T.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = T.y + this.ch / 2 + row * (this.ch + this.gap);
        });
      }
      this.zones.forEach((z) => {
        const zc = this.inZone(z.id), head = z.head == null ? 28 : z.head;
        const cols = z.cols || Math.max(1, Math.floor((z.w - 8 + this.gap) / (this.cw + this.gap)));
        zc.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          c.tx = z.x + (z.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = z.center ? z.y + z.h / 2 : z.y + head + 4 + this.ch / 2 + row * (this.ch + this.gap);
        });
      });
      if (snap || RM) this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) { c.x = c.tx; c.y = c.ty; } });
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.sel = false; }); this.selected = null; this.drag = null; this.layout(true); }
    update(dt) {
      this.cards.forEach((c) => {
        const dragging = this.drag && this.drag.c === c;
        if (!dragging) { c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14); }
        c.lift = approach(c.lift, dragging ? 1 : 0, dt, 16);
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      });
    }
    hit(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (c.fixed) continue;
        if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c;
      }
      return null;
    }
    zoneAt(p) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (p.x >= z.x - 4 && p.x <= z.x + z.w + 4 && p.y >= z.y - 4 && p.y <= z.y + z.h + 4) return z;
      }
      return null;
    }
    down(p) {
      if (!this.enabled) return false;
      const c = this.hit(p);
      if (c) {
        const i = this.cards.indexOf(c); this.cards.splice(i, 1); this.cards.push(c);
        this.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
        Sound.click(); return true;
      }
      if (this.selected) { const z = this.zoneAt(p); if (z) { this.place(this.selected, z, p); this.selected.sel = false; this.selected = null; } }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 9) d.moved = true;
      this.hoverZone = d.moved ? this.zoneAt(p) : null;
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hoverZone = null;
      const c = d.c;
      if (!d.moved) {
        if (this.selected === c) { c.sel = false; this.selected = null; }
        else { if (this.selected) this.selected.sel = false; this.selected = c; c.sel = true; }
        this.onTap && this.onTap(c);
        return;
      }
      if (this.selected) { this.selected.sel = false; this.selected = null; }
      const z = this.zoneAt(p);
      if (z) this.place(c, z, p); else { c.zone = null; this.layout(); }
    }
    place(c, z, p) {
      const res = this.onDrop(c, z);
      if (res === 'keep') { c.zone = null; this.layout(); return; }
      if (res !== true) { c.shake = 0.45; Sound.fail(); this.onReject(c, z, typeof res === 'string' ? res : ''); this.layout(); return; }
      if (z.cap) {
        const occ = this.inZone(z.id).filter((x) => x !== c);
        if (occ.length >= z.cap) {
          if (z.cap === 1) occ[0].zone = null;
          else { c.shake = 0.45; Sound.fail(); this.onReject(c, z, '이 칸은 가득 찼어요'); this.layout(); return; }
        }
      }
      c.zone = z.id; this.layout();
      Sound.tick();
      parts.burst(c.tx, c.ty, { count: 8, speed: 90, size: 3, life: 0.5, colors: [z.color || '#16a34a', '#fff'] });
      this.onPlace(c, z);
    }
    drawCard(c, t) {
      const sc = 1 + c.lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y - c.lift * 3); ctx.scale(sc, sc);
      const w = c.w, h = c.h;
      D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-w / 2, -h / 2, w, h, 11).fill(); }, { blur: 3 + c.lift * 9, y: 2 + c.lift * 4 });
      ctx.strokeStyle = c.sel ? '#f59e0b' : c.border || '#cfd8e6'; ctx.lineWidth = c.sel ? 3.5 : 2; rr(-w / 2, -h / 2, w, h, 11).stroke();
      let tx = 0, ty0 = 0, tw = w - 14;
      if (c.draw) {
        if (this.vertical) { c.draw(0, -h / 2 + 22, 30, t); ty0 = 16; }
        else { const iw = h - 6; ctx.save(); rr(-w / 2 + 4, -h / 2 + 4, iw - 2, h - 8, 8).clip(); ctx.fillStyle = c.iconBg || 'rgba(0,0,0,.04)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, iw, h - 8); c.draw(-w / 2 + 4 + (iw - 2) / 2, 0, h - 14, t); ctx.restore(); tx = (iw + 2) / 2; tw = w - iw - 12; }
      }
      const lh = c.size * FS * 1.22, n = c.lines.length, y0 = ty0 - ((n - 1) * lh) / 2 + c.size * FS * 0.36;
      c.lines.forEach((l, i) => D.text(tx, y0 + i * lh, l, { size: c.size, weight: 800, color: c.color || '#1e293b' }));
      if (c.badge) D.text(w / 2 - 12, -h / 2 + 15, c.badge, { size: 14, weight: 800, color: c.badgeColor || '#16a34a' });
      ctx.restore();
    }
    draw(t) {
      this.zones.forEach((z) => {
        const hv = this.hoverZone === z;
        const sel = this.selected;
        ctx.save();
        D.shadow(() => { ctx.fillStyle = z.fill || 'rgba(255,255,255,.75)'; rr(z.x, z.y, z.w, z.h, 14).fill(); }, { blur: 4, y: 1 });
        ctx.setLineDash(hv ? [] : [7, 5]); ctx.strokeStyle = hv ? (z.color || '#16a34a') : (z.line || '#b6c3d4'); ctx.lineWidth = hv ? 3.5 : 2.2; rr(z.x, z.y, z.w, z.h, 14).stroke(); ctx.setLineDash([]);
        ctx.restore();
        if (z.label) D.text(z.x + 12, z.y + 20, z.label, { size: z.lsize || 14.5, weight: 800, color: z.color || '#334155', align: 'left' });
        if (z.sub) D.text(z.x + z.w - 10, z.y + 20, z.sub, { size: 13, weight: 700, color: '#64748b', align: 'right' });
        if (sel && !this.drag) D.ring(z.x + z.w / 2, z.y + z.h / 2, Math.min(z.w, z.h) * 0.18, t, { color: z.color || '#16a34a', speed: 0.9, width: 2 });
        if (z.draw) z.draw(z, t);
      });
      const dragC = this.drag && this.drag.c;
      this.cards.forEach((c) => { if (c !== dragC) this.drawCard(c, t); });
      if (dragC) this.drawCard(dragC, t);
    }
  }

  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1);
    const lines = wrapLines(flash.text, VW - 60, PHONE ? 13 : 14.5, 800), lh = (PHONE ? 13 : 14.5) * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(VW / 2 - (VW - 40) / 2, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + (PHONE ? 13 : 14.5) * FS * 0.95 + i * lh, l, { size: PHONE ? 13 : 14.5, weight: 800, color: '#fff' }));
    ctx.restore();
  }

  /* ======================================================
     생물 · 화석 그림 (단순한 벡터 모양). crit(kind, x, y, 크기, {color, fossil, alpha, flip, rot, t})
     ====================================================== */
  function crit(kind, x, y, s, o) {
    o = o || {};
    const col = o.color || '#475569';
    const fill = o.fossil ? '#efe5cf' : col, line = o.fossil ? '#7a6648' : shade(col, -0.35);
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s * (o.flip ? -1 : 1), s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 0.035;
    const FS_ = () => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.stroke(); };
    const L = (x1, y1, x2, y2) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); };
    switch (kind) {
      case 'trilobite': {
        ctx.beginPath(); ctx.ellipse(0.04, 0, 0.5, 0.3, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.ellipse(-0.3, 0, 0.2, 0.3, 0, 0, TAU); ctx.fillStyle = o.fossil ? '#e2d5b8' : shade(col, -0.15); ctx.fill(); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const xx = -0.1 + i * 0.1, h = 0.28 - i * 0.03; L(xx, -h, xx, h); } L(-0.1, 0, 0.5, 0); ctx.stroke();
        ctx.fillStyle = line; ctx.beginPath(); ctx.arc(-0.34, -0.12, 0.035, 0, TAU); ctx.arc(-0.34, 0.12, 0.035, 0, TAU); ctx.fill(); break;
      }
      case 'graptolite': {
        ctx.lineWidth = 0.06; ctx.strokeStyle = line; ctx.beginPath(); L(-0.5, 0.05, 0.5, -0.05); ctx.stroke();
        ctx.lineWidth = 0.03; ctx.fillStyle = fill;
        for (let i = 0; i < 10; i++) { const xx = -0.46 + i * 0.1, yy = 0.05 - (xx + 0.5) * 0.1; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 0.05, yy - 0.15); ctx.lineTo(xx + 0.1, yy - 0.005); ctx.closePath(); FS_(); }
        break;
      }
      case 'ammonite': {
        ctx.beginPath(); ctx.arc(0, 0, 0.44, 0, TAU); FS_();
        ctx.lineWidth = 0.03; ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const th = (i / 60) * 3.1 * Math.PI, r = 0.022 * Math.exp(0.3 * th), xx = Math.cos(th) * r, yy = Math.sin(th) * r; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.lineWidth = 0.022; ctx.beginPath();
        for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; L(Math.cos(a) * 0.3, Math.sin(a) * 0.3, Math.cos(a) * 0.43, Math.sin(a) * 0.43); }
        ctx.stroke(); break;
      }
      case 'nummulite': {
        ctx.beginPath(); ctx.arc(0, 0, 0.44, 0, TAU); FS_();
        ctx.lineWidth = 0.022; ctx.beginPath(); ctx.arc(0, 0, 0.16, 0, TAU); ctx.arc(0, 0, 0.28, 0, TAU); ctx.arc(0, 0, 0.37, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; L(Math.cos(a) * 0.16, Math.sin(a) * 0.16, Math.cos(a) * 0.44, Math.sin(a) * 0.44); } ctx.stroke(); break;
      }
      case 'mammoth': {
        ctx.beginPath(); ctx.ellipse(-0.05, -0.02, 0.36, 0.24, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.arc(-0.12, -0.2, 0.15, Math.PI, TAU); FS_();
        ctx.beginPath(); ctx.ellipse(0.34, 0.0, 0.17, 0.2, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.moveTo(0.42, 0.08); ctx.bezierCurveTo(0.56, 0.16, 0.54, 0.34, 0.44, 0.44); ctx.lineWidth = 0.09; ctx.strokeStyle = fill; ctx.stroke();
        ctx.lineWidth = 0.035; ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(0.42, 0.08); ctx.bezierCurveTo(0.56, 0.16, 0.54, 0.34, 0.44, 0.44); ctx.lineWidth = 0.012; ctx.stroke();
        [-0.25, -0.08, 0.12, 0.25].forEach((lx) => { ctx.beginPath(); rr(lx - 0.045, 0.1, 0.09, 0.33, 0.03); FS_(); });
        ctx.lineWidth = 0.05; ctx.strokeStyle = o.fossil ? '#fffaf0' : '#f5ead0'; ctx.beginPath(); ctx.moveTo(0.38, 0.1); ctx.bezierCurveTo(0.62, 0.12, 0.66, 0.3, 0.5, 0.36); ctx.stroke();
        ctx.fillStyle = line; ctx.beginPath(); ctx.arc(0.4, -0.04, 0.025, 0, TAU); ctx.fill(); break;
      }
      case 'dino': {
        ctx.beginPath(); ctx.moveTo(-0.3, -0.04); ctx.quadraticCurveTo(-0.52, 0.0, -0.68, 0.1); ctx.quadraticCurveTo(-0.4, 0.14, -0.28, 0.12); ctx.closePath(); FS_();
        ctx.beginPath(); ctx.ellipse(-0.06, 0.0, 0.3, 0.17, -0.05, 0, TAU); FS_();
        ctx.beginPath(); ctx.moveTo(0.14, -0.1); ctx.quadraticCurveTo(0.3, -0.2, 0.34, -0.4); ctx.lineTo(0.48, -0.4); ctx.quadraticCurveTo(0.58, -0.38, 0.54, -0.3); ctx.lineTo(0.38, -0.26); ctx.quadraticCurveTo(0.32, 0.0, 0.2, 0.08); ctx.closePath(); FS_();
        ctx.lineWidth = 0.09; ctx.strokeStyle = fill; ctx.beginPath(); L(-0.06, 0.1, -0.1, 0.36); L(-0.1, 0.36, 0.0, 0.4); L(0.1, 0.1, 0.16, 0.36); L(0.16, 0.36, 0.26, 0.4); ctx.stroke();
        ctx.fillStyle = line; ctx.beginPath(); ctx.arc(0.43, -0.35, 0.02, 0, TAU); ctx.fill(); break;
      }
      case 'dinobone': {
        ctx.lineWidth = 0.06; ctx.strokeStyle = line; ctx.beginPath(); L(-0.5, -0.08, 0.28, -0.08); ctx.stroke();
        ctx.lineWidth = 0.05; for (let i = 0; i < 6; i++) { const xx = -0.4 + i * 0.12; ctx.beginPath(); ctx.moveTo(xx, -0.08); ctx.quadraticCurveTo(xx + 0.1, 0.12, xx - 0.02, 0.3 - Math.abs(i - 2.5) * 0.04); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0.4, -0.1, 0.14, 0.09, 0.15, 0, TAU); FS_(); ctx.fillStyle = line; ctx.beginPath(); ctx.arc(0.43, -0.12, 0.022, 0, TAU); ctx.fill(); break;
      }
      case 'stroma': {
        for (let k = 4; k >= 1; k--) { ctx.beginPath(); ctx.arc(0, 0.3, 0.12 * k, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = k % 2 ? (o.fossil ? '#e8dcc0' : shade(col, 0.15)) : (o.fossil ? '#d6c7a4' : shade(col, -0.1)); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 'cyano': {
        ctx.fillStyle = fill;
        [[-0.2, -0.1, 0.3], [0.1, 0.1, -0.4], [0.0, -0.28, 0.1]].forEach((c) => { for (let i = 0; i < 5; i++) { const px = c[0] + (i - 2) * 0.09 * Math.cos(c[2]), py = c[1] + (i - 2) * 0.09 * Math.sin(c[2]); ctx.beginPath(); ctx.ellipse(px, py, 0.075, 0.05, c[2], 0, TAU); FS_(); } });
        break;
      }
      case 'ediacara': {
        ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.46, 0, 0, TAU); FS_();
        ctx.beginPath(); L(0, -0.44, 0, 0.44); for (let i = -4; i <= 4; i++) { L(0, i * 0.1, -0.15, i * 0.1 - 0.07); L(0, i * 0.1, 0.15, i * 0.1 - 0.07); } ctx.lineWidth = 0.022; ctx.stroke(); break;
      }
      case 'fish': {
        ctx.beginPath(); ctx.ellipse(0.04, 0, 0.36, 0.17, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.moveTo(-0.28, 0); ctx.lineTo(-0.5, -0.16); ctx.lineTo(-0.5, 0.16); ctx.closePath(); FS_();
        ctx.beginPath(); ctx.moveTo(0.0, -0.15); ctx.lineTo(0.1, -0.3); ctx.lineTo(0.2, -0.14); ctx.closePath(); FS_();
        ctx.fillStyle = o.fossil ? line : '#fff'; ctx.beginPath(); ctx.arc(0.24, -0.04, 0.03, 0, TAU); ctx.fill(); break;
      }
      case 'fern': {
        ctx.strokeStyle = fill === col ? shade(col, -0.1) : line; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0, 0.46); ctx.quadraticCurveTo(0.05, 0, -0.05, -0.46); ctx.stroke();
        ctx.lineWidth = 0.03; ctx.beginPath(); for (let i = 0; i < 9; i++) { const yy = 0.38 - i * 0.1, w = 0.24 * (1 - i / 11); L(0.01, yy, -w, yy - 0.09); L(0.01, yy, w + 0.02, yy - 0.09); } ctx.stroke(); break;
      }
      case 'tree': {
        ctx.fillStyle = o.fossil ? fill : '#6b4a2a'; ctx.beginPath(); rr(-0.05, -0.1, 0.1, 0.56, 0.03); ctx.fill();
        ctx.fillStyle = fill; ctx.strokeStyle = line;
        [[0, -0.34, 0.26], [-0.2, -0.16, 0.18], [0.2, -0.16, 0.18]].forEach((c) => { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, TAU); FS_(); }); break;
      }
      case 'coral': {
        ctx.lineWidth = 0.075; ctx.strokeStyle = fill; ctx.beginPath();
        L(0, 0.4, 0, 0.0); L(0, 0.0, -0.18, -0.22); L(0, 0.0, 0.2, -0.26); L(0, 0.2, -0.2, 0.02); L(0, 0.2, 0.2, 0.06); L(-0.18, -0.22, -0.26, -0.4); L(-0.18, -0.22, -0.06, -0.4); L(0.2, -0.26, 0.28, -0.42); L(0.2, -0.26, 0.1, -0.42); ctx.stroke(); break;
      }
      case 'shrew': {
        ctx.beginPath(); ctx.ellipse(-0.04, 0.05, 0.27, 0.15, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.moveTo(0.18, -0.02); ctx.lineTo(0.5, 0.06); ctx.lineTo(0.2, 0.18); ctx.closePath(); FS_();
        ctx.beginPath(); ctx.arc(0.1, -0.08, 0.06, 0, TAU); FS_();
        ctx.lineWidth = 0.035; ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(-0.3, 0.08); ctx.quadraticCurveTo(-0.5, 0.18, -0.55, -0.05); ctx.stroke();
        ctx.lineWidth = 0.06; ctx.strokeStyle = fill; ctx.beginPath(); L(-0.12, 0.15, -0.13, 0.3); L(0.08, 0.15, 0.1, 0.3); ctx.stroke(); break;
      }
      case 'bird': {
        ctx.beginPath(); ctx.ellipse(0, 0.04, 0.28, 0.17, -0.25, 0, TAU); FS_();
        ctx.beginPath(); ctx.arc(0.26, -0.12, 0.1, 0, TAU); FS_();
        ctx.beginPath(); ctx.moveTo(0.34, -0.14); ctx.lineTo(0.5, -0.1); ctx.lineTo(0.34, -0.06); ctx.closePath(); ctx.fillStyle = '#f59e0b'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-0.25, 0.1); ctx.lineTo(-0.52, 0.2); ctx.lineTo(-0.5, 0.0); ctx.closePath(); FS_();
        ctx.beginPath(); ctx.ellipse(-0.04, -0.02, 0.16, 0.09, -0.5, 0, TAU); ctx.fillStyle = shade(col, -0.15); ctx.fill(); break;
      }
      case 'conifer': {
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-0.04, 0.2, 0.08, 0.26);
        ctx.fillStyle = fill; for (let i = 0; i < 3; i++) { const yy = 0.22 - i * 0.22, w = 0.34 - i * 0.08; ctx.beginPath(); ctx.moveTo(0, yy - 0.32); ctx.lineTo(w, yy); ctx.lineTo(-w, yy); ctx.closePath(); ctx.fill(); } break;
      }
      case 'insect': {
        ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.1, 0, 0, TAU); FS_();
        ctx.beginPath(); ctx.arc(0.22, 0, 0.07, 0, TAU); FS_();
        ctx.beginPath(); ctx.ellipse(-0.02, -0.12, 0.2, 0.08, 0.5, 0, TAU); ctx.fillStyle = rgba('#fff', 0.7); ctx.fill(); ctx.stroke(); break;
      }
      default: break;
    }
    ctx.restore();
  }

  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 생물 대멸종의 원인
     성취기준 [10통과2-01-01] (뒷부분) 탐구 활동 '생물 대멸종의 원인과 그 이후의 변화를 설명하는 여러 가설들의
     타당성 평가하기'. 정답 하나를 외우는 것이 아니라 증거로 가설을 비교·평가하는 과정이 핵심.
     ① 관찰: 대멸종 기록 (해양 생물 다양성 그래프에서 급감 5곳 찾기)
     ② 탐구: 원인 가설 (소행성 충돌 · 화산 활동 · 기후/해수면 변화의 인과 애니메이션)
     ③ 분석: 증거 평가 (증거 카드를 지지/반박으로 놓고 타당성 막대 비교)
     ④ 분석: 멸종 이후 (회복 시간 읽기 · 빈 생태적 지위를 채운 생물)
     ※ 감소 비율은 자료에 따라 다른 대략값, 개별 지층 연대 측정·종 분화 메커니즘은 다루지 않음
     ========================================================= */
  initStage('#eaf1f8', 800, 560, 520, 760);

  /* ---------- 자료 ---------- */
  const ERAS = [
    { name: '고생대', start: 540, end: 252, col: '#2fa56b' },
    { name: '중생대', start: 252, end: 66, col: '#e08a2e' },
    { name: '신생대', start: 66, end: 0, col: '#3b82f6' },
  ];
  const EXT = [
    { name: '오르도비스기 말', yr: '약 4.4억 년 전', ago: 444, pct: 85, cause: '빙하기와 해수면 하강' },
    { name: '데본기 후기', yr: '약 3.7억 년 전', ago: 372, pct: 75, cause: '환경 변화(원인은 아직 논의 중)' },
    { name: '페름기 말', yr: '약 2.5억 년 전', ago: 252, pct: 90, cause: '대규모 화산 활동 → 온난화·해양 산성화·산소 부족', big: true },
    { name: '트라이아스기 말', yr: '약 2.0억 년 전', ago: 201, pct: 80, cause: '대규모 화산 활동과 기후 변화(논의 중)' },
    { name: '백악기 말', yr: '약 6600만 년 전', ago: 66, pct: 75, cause: '소행성 충돌과 화산 활동 (공룡 멸종)' },
  ];
  // 해양 생물 다양성(상대값, 현재 = 100). 급감 폭은 각 대멸종의 감소 비율과 같게 그림 (직전 값 × (1 − 감소 비율))
  const DPTS = [[540, 10], [520, 30], [500, 48], [470, 60], [445, 60], [443, 9], [425, 50], [400, 56], [373, 62], [371, 15.5], [350, 55], [320, 62], [290, 68], [253, 70], [251, 7], [245, 20], [225, 40], [205, 60], [201, 60], [199, 12], [180, 45], [150, 60], [100, 76], [67, 80], [65, 20], [56, 55], [40, 75], [20, 90], [0, 100]];
  function dAt(ago) {
    for (let i = 0; i < DPTS.length - 1; i++) { const a = DPTS[i], b = DPTS[i + 1]; if (ago <= a[0] && ago >= b[0]) return lerp(a[1], b[1], (a[0] - ago) / (a[0] - b[0])); }
    return 100;
  }
  // 급감 직전·직후 값 (그림의 점과 같은 값)
  const DROPS = [[445, 443], [373, 371], [253, 251], [201, 199], [67, 65]].map((d) => ({ a0: d[0], a1: d[1], v0: dAt(d[0]), v1: dAt(d[1]) }));
  const HYP = [
    { id: 'imp', name: '소행성 충돌', col: '#dc2626', short: '충돌' },
    { id: 'vol', name: '대규모 화산 활동', col: '#ea580c', short: '화산' },
    { id: 'cli', name: '기후 변화·해수면 하강', col: '#2563eb', short: '기후·해수면' },
  ];

  const chartFrame = (r, title) => {
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    D.text(r.x + 14, r.y + 22, title, { size: PHONE ? 13 : 14.5, weight: 800, color: '#0c4a6e', align: 'left' });
  };

  /* ======================================================
     화면 ①: 대멸종 기록 (그래프에서 급감한 곳 찾기)
     ====================================================== */
  const RC = { found: [false, false, false, false, false], pop: [0, 0, 0, 0, 0], prog: 0, miss: null, missT: 0 };
  const rcG = () => (PHONE
    ? { ch: { x: 8, y: 8, w: 504, h: 300 }, cards: (i) => ({ x: 8, y: 318 + i * 68, w: 504, h: 62 }), foot: 664 }
    : { ch: { x: 14, y: 12, w: 772, h: 286 }, cards: (i) => ({ x: 14 + i * 156, y: 310, w: 148, h: 236 }), foot: 0 });
  function rcPlot() { const g = rcG(), r = g.ch; return { px0: r.x + 52, px1: r.x + r.w - 16, py0: r.y + 40, py1: r.y + r.h - 50 }; }
  const rcX = (ago) => { const q = rcPlot(); return q.px0 + (540 - ago) / 540 * (q.px1 - q.px0); };
  const rcY = (v) => { const q = rcPlot(); return q.py1 - (v / 100) * (q.py1 - q.py0); };
  const rcFound = () => RC.found.filter(Boolean).length;
  function resetRecord() { RC.found = [false, false, false, false, false]; RC.pop = [0, 0, 0, 0, 0]; RC.prog = 0; RC.miss = null; }
  function rcTap(p) {
    const q = rcPlot();
    if (p.x < q.px0 - 8 || p.x > q.px1 + 8 || p.y < q.py0 - 10 || p.y > q.py1 + 6) return;
    let best = -1, bd = 1e9;
    EXT.forEach((e, i) => { const d = Math.abs(p.x - rcX(e.ago)); if (d < bd) { bd = d; best = i; } });
    if (bd <= 20) {
      if (RC.found[best]) { say(EXT[best].name + ': 이미 찾았어요.', false, 1.6); return; }
      RC.found[best] = true; RC.pop[best] = 0; SciSim.tween(RC.pop, { [best]: 1 }, { duration: RM ? 0.01 : 0.6, ease: 'outBack' });
      Sound.success(); parts.burst(rcX(EXT[best].ago), rcY(DROPS[best].v1) - 10, { count: 14, speed: 140, size: 3.5, life: 0.7, colors: ['#ef4444', '#f59e0b', '#fff'] });
      say('찾았어요! ' + EXT[best].name + ' (' + EXT[best].yr + ')', false, 2.4);
    } else { RC.miss = { x: p.x, y: p.y }; RC.missT = 0.7; Sound.fail(); say('그래프가 급격히 줄어든 곳이 아니에요. 곡선이 갑자기 떨어지는 곳을 찾아봐요.', true, 2.6); }
  }
  function stepRecord(dt) { RC.prog = approach(RC.prog, 1, dt, 1.6); if (RC.prog > 0.995) RC.prog = 1; if (RC.missT > 0) RC.missT -= dt; }
  function drawRecord(t) {
    const g = rcG(), r = g.ch, q = rcPlot();
    chartFrame(r, PHONE ? '해양 생물 다양성 (단순화)' : '해양 생물 다양성의 변화 (단순화 · 상대값)');
    ctx.save(); ctx.font = D.font(12.5, 700);
    [0, 50, 100].forEach((v) => { ctx.strokeStyle = '#e8eef6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(q.px0, rcY(v)); ctx.lineTo(q.px1, rcY(v)); ctx.stroke(); D.text(q.px0 - 6, rcY(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.restore();
    D.text(r.x + r.w - 14, r.y + 22, '현재 = 100', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    // 곡선
    const lim = 540 - 540 * RC.prog;
    const pts = DPTS.filter((d) => d[0] >= lim).map((d) => [rcX(d[0]), rcY(d[1])]);
    if (RC.prog < 1) pts.push([rcX(lim), rcY(dAt(lim))]);
    ctx.save(); ctx.lineJoin = 'round';
    const gr = ctx.createLinearGradient(0, q.py0, 0, q.py1); gr.addColorStop(0, rgba('#0ea5e9', 0.35)); gr.addColorStop(1, rgba('#0ea5e9', 0.03));
    if (pts.length > 1) { ctx.beginPath(); ctx.moveTo(pts[0][0], q.py1); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], q.py1); ctx.closePath(); ctx.fillStyle = gr; ctx.fill(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.restore();
    // 찾은 곳 표시
    EXT.forEach((e, i) => {
      if (!RC.found[i]) return;
      const x = rcX(e.ago), y0 = rcY(DROPS[i].v0), y1 = rcY(DROPS[i].v1), sc = Math.max(0.2, RC.pop[i]);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.lineTo(x, q.py1); ctx.stroke(); ctx.setLineDash([]);
      D.ring(x, (y0 + y1) / 2, 17 * sc, t, { color: '#ef4444', speed: 0.9, width: 3 });
      D.sphere(x, y0 - 26, 11 * sc, '#ef4444', { shadow: true, text: String(i + 1), textScale: 1.15 });
      D.text(x, y1 + (PHONE ? 22 : 24), '▼ ' + EXT[i].pct + ' %', { size: 12.5, weight: 800, color: '#b91c1c' });
    });
    if (RC.missT > 0) { ctx.save(); ctx.globalAlpha = RC.missT / 0.7; D.text(RC.miss.x, RC.miss.y + 6, '✕', { size: 22, weight: 800, color: '#dc2626' }); ctx.restore(); }
    // 축 · 시대 띠
    [540, 400, 300, 200, 100, 0].forEach((a, i) => { const x = rcX(a); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, q.py1); ctx.lineTo(x, q.py1 + 5); ctx.stroke(); D.text(x, q.py1 + 19, a === 0 ? '현재' : a >= 100 ? (a / 100) + '억' : a + '만', { size: 12.5, weight: 700, color: '#64748b', align: i === 0 ? 'left' : i === 5 ? 'right' : 'center' }); });
    const by = r.y + r.h - 24;
    ERAS.forEach((e) => { const a = rcX(e.start), b = rcX(e.end); ctx.fillStyle = e.col; ctx.fillRect(a, by, b - a, 18); D.text((a + b) / 2, by + 14, e.name, { size: 12.5, weight: 800, color: '#fff' }); });
    D.text(q.px0 - 6, by + 14, '시대', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    if (rcFound() < 5) D.label(q.px0 + (q.px1 - q.px0) * (PHONE ? 0.62 : 0.66), r.y + 22, '👆 곡선이 급격히 떨어지는 곳을 눌러요', { bg: rgba('#0f172a', 0.85), size: PHONE ? 11.5 : 13.5 });
    // 카드
    for (let i = 0; i < 5; i++) {
      const c = g.cards(i), e = EXT[i], on = RC.found[i], sc = on ? Math.max(0.6, RC.pop[i]) : 1;
      ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(sc, sc); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
      if (on) {
        D.shadow(() => { ctx.fillStyle = '#fff'; rr(c.x, c.y, c.w, c.h, 12).fill(); }, { blur: 4, y: 2 });
        ctx.strokeStyle = e.big ? '#dc2626' : '#cfd8e6'; ctx.lineWidth = e.big ? 3 : 2; rr(c.x, c.y, c.w, c.h, 12).stroke();
        D.sphere(c.x + 18, c.y + 20, 11, '#ef4444', { text: String(i + 1), textScale: 1.15 });
        if (!PHONE) {
          D.text(c.x + 36, c.y + 25, e.name, { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
          D.text(c.x + 12, c.y + 52, e.yr, { size: 13, weight: 700, color: '#475569', align: 'left' });
          D.text(c.x + 12, c.y + 76, '종 약 ' + e.pct + ' % 감소', { size: 13.5, weight: 800, color: '#b91c1c', align: 'left' });
          ctx.fillStyle = '#fee2e2'; rr(c.x + 12, c.y + 84, c.w - 24, 10, 5).fill(); ctx.fillStyle = '#ef4444'; rr(c.x + 12, c.y + 84, (c.w - 24) * e.pct / 100, 10, 5).fill();
          drawWrap(c.x + c.w / 2, c.y + 118, e.cause, c.w - 20, 13, { weight: 700, color: '#334155', lh: 1.25 });
          if (e.big) D.label(c.x + c.w / 2, c.y + c.h - 18, '가장 큰 규모', { bg: '#dc2626', size: 12.5 });
        } else {
          D.text(c.x + 36, c.y + 24, e.name + ' · ' + e.yr, { size: 14, weight: 800, color: '#1e293b', align: 'left' });
          D.text(c.x + 36, c.y + 46, '종 약 ' + e.pct + ' % 감소 · ' + e.cause, { size: 12.5, weight: 700, color: '#475569', align: 'left' });
        }
      } else {
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#b6c3d4'; ctx.lineWidth = 2; rr(c.x, c.y, c.w, c.h, 12).stroke(); ctx.setLineDash([]);
        D.text(c.x + c.w / 2, c.y + c.h / 2 + 5, (i + 1) + '번째 대멸종 ?', { size: 14, weight: 700, color: '#b6c3d4' });
      }
      ctx.restore();
    }
    if (PHONE) D.text(VW / 2, g.foot, '※ 감소 비율은 자료에 따라 달라요(약)', { size: 12.5, weight: 700, color: '#64748b' });
    else D.text(VW / 2, 556, '※ 종의 감소 비율은 연구 자료에 따라 달라요(약, 단순화)', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     화면 ②: 원인 가설 (인과 애니메이션)
     ====================================================== */
  const HY = { sel: 0, t: 0, opened: [false, false, false], did: {}, emit: 0 };
  const hyG = () => (PHONE
    ? { card: (i) => ({ x: 8 + i * 172, y: 8, w: 164, h: 62 }), sc: { x: 8, y: 80, w: 504, h: 300 }, chain: { x: 8, y: 392, w: 504, h: 232 } }
    : { card: (i) => ({ x: 14 + i * 262, y: 10, w: 250, h: 62 }), sc: { x: 14, y: 82, w: 772, h: 336 }, chain: { x: 14, y: 430, w: 772, h: 118 } });
  const CHAIN = [
    [['먼지·그을음이 하늘을 덮어 햇빛이 가려짐', 1.8], ['광합성이 줄어 식물·플랑크톤이 감소', 4.5], ['먹이 사슬이 무너져 많은 생물이 멸종', 7]],
    [['이산화 탄소·황산화물이 대량으로 방출됨', 1.6], ['지구가 더워지고 바닷물이 산성으로 변함', 4.5], ['서식 환경이 나빠져 많은 생물이 멸종', 7]],
    [['기온이 변하고 해수면이 낮아짐', 1.6], ['얕은 바다 등 서식지가 줄어듦', 4.5], ['살 곳 경쟁이 심해져 많은 생물이 멸종', 7]],
  ];
  function selectHyp(i, quiet) {
    HY.sel = i; HY.t = 0; HY.opened[i] = true; HY.did = {}; parts.clear(); if (!quiet) Sound.click();
    if (!quiet && HY.opened.every(Boolean) && !HY.allSaid) { HY.allSaid = true; say('세 가설을 모두 열어 봤어요! 이제 🔗 연결하기로 넘어가 봐요.', false, 3.5); }
  }
  function stepHyp(dt) { HY.t += dt; }
  const sceneBox = (R) => ({ gy: R.y + R.h * 0.7, shoreX: R.x + R.w * 0.6 });
  // 바다 바닥 모양: x -> y
  function basinY(R, x) {
    const f = (x - R.x) / R.w;
    if (f <= 0.6) return R.y + R.h * 0.7;
    if (f <= 0.8) return lerp(R.y + R.h * 0.7, R.y + R.h * 0.82, (f - 0.6) / 0.2);
    if (f <= 0.85) return lerp(R.y + R.h * 0.82, R.y + R.h * 0.96, (f - 0.8) / 0.05);
    return R.y + R.h * 0.96;
  }
  function drawWorld(R, o, t) {
    const gy = R.y + R.h * 0.7;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sky = ctx.createLinearGradient(0, R.y, 0, gy);
    sky.addColorStop(0, mixc('#2b3550', mixc('#6cc0f0', o.tintCol || '#c9844a', o.tint || 0), o.sun)); sky.addColorStop(1, mixc('#4a4a55', mixc('#cfeaff', o.tintCol || '#e9b27a', o.tint || 0), o.sun));
    ctx.fillStyle = sky; ctx.fillRect(R.x, R.y, R.w, R.h);
    const sx = R.x + R.w * 0.84, sy = R.y + R.h * 0.2;
    D.glow(sx, sy, 80, '#fff2b0', 0.8 * o.sun); D.sphere(sx, sy, 17, mixc('#8a8a8a', '#fde047', o.sun), { gloss: false });
    // 땅
    const lg = ctx.createLinearGradient(0, gy, 0, R.y + R.h); lg.addColorStop(0, mixc('#8c7a58', '#7bc96f', o.plant)); lg.addColorStop(1, '#6f5b3a');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(R.x, R.y + R.h);
    for (let x = R.x; x <= R.x + R.w; x += 8) ctx.lineTo(x, basinY(R, x));
    ctx.lineTo(R.x + R.w, R.y + R.h); ctx.closePath(); ctx.fill();
    // 바다
    const lvl = o.lvl == null ? 1 : o.lvl, ys = R.y + R.h * (0.74 + (1 - lvl) * 0.14);
    ctx.save(); ctx.beginPath(); ctx.moveTo(R.x + R.w * 0.55, R.y + R.h);
    for (let x = R.x + R.w * 0.55; x <= R.x + R.w; x += 6) ctx.lineTo(x, basinY(R, x));
    ctx.lineTo(R.x + R.w, R.y + R.h); ctx.closePath(); ctx.clip();
    const wg = ctx.createLinearGradient(0, ys, 0, R.y + R.h); const sea = o.seaCol || '#38bdf8';
    wg.addColorStop(0, rgba(sea, 0.85)); wg.addColorStop(1, rgba(shade(sea, -0.55), 0.95));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(R.x + R.w * 0.55, ys); for (let x = R.x + R.w * 0.55; x <= R.x + R.w; x += 8) ctx.lineTo(x, ys + Math.sin(t * 2 + x * 0.08) * 1.6); ctx.lineTo(R.x + R.w, R.y + R.h); ctx.lineTo(R.x + R.w * 0.55, R.y + R.h); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 땅 위 생물
    const pl = o.plant;
    [[0.08, 40], [0.2, 52], [0.33, 44]].forEach((c, i) => { crit('conifer', R.x + R.w * c[0], gy - c[1] * 0.42 * (R.h / 336) * (0.55 + 0.45 * pl) + 4, c[1] * (R.h / 336) * (0.55 + 0.45 * pl) * 1.2, { color: mixc('#8a6a3a', '#2f7d3a', pl) }); });
    crit('fern', R.x + R.w * 0.46, gy - 14, 36 * (R.h / 336), { color: mixc('#8a6a3a', '#3f9a4a', pl) });
    if (o.dino > 0.02) { crit('dino', R.x + R.w * 0.36, gy - 26 * (R.h / 336), 72 * (R.h / 336), { color: '#3f6212', alpha: o.dino }); crit('dino', R.x + R.w * 0.5, gy - 20 * (R.h / 336), 52 * (R.h / 336), { color: '#4d7c0f', alpha: o.dino, flip: true }); }
    // 얕은 바다 생물
    if (o.fish > 0.02) { crit('coral', R.x + R.w * 0.72, basinY(R, R.x + R.w * 0.72) - 12, 30 * (R.h / 336), { color: '#f472b6', alpha: o.fish }); crit('fish', R.x + R.w * 0.7, ys + 22 * (R.h / 336), 30 * (R.h / 336), { color: '#2563eb', alpha: o.fish }); crit('fish', R.x + R.w * 0.9, ys + 40 * (R.h / 336), 26 * (R.h / 336), { color: '#1d4ed8', alpha: 0.9 }); }
    if (o.shells != null) for (let k = 0; k < 4; k++) { const x = R.x + R.w * (0.66 + k * 0.08); ctx.fillStyle = rgba('#fff', 0.9 * o.shells); ctx.beginPath(); ctx.arc(x, basinY(R, x) - 5, 6 * Math.max(0.2, o.shells), Math.PI, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 14).stroke();
    return { gy, ys };
  }
  function smokeLayer(R, a, t, col) {
    if (a <= 0.01) return;
    ctx.save(); rr(R.x, R.y, R.w, R.h * 0.72, 14).clip();
    for (let i = 0; i < 16; i++) { const x = R.x + ((i * 97) % 100) / 100 * R.w + Math.sin(t * 0.3 + i) * 14, y = R.y + R.h * (0.05 + ((i * 53) % 60) / 100), r = 52 + (i % 4) * 22; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, 0.9 * a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function meter(x, y, w, h, v, col, label) {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(x, y, w, h, 8).fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y, w, h, 8).stroke();
    ctx.fillStyle = col; rr(x + 3, y + 3, Math.max(0, (w - 6) * clamp(v, 0, 1)), h - 6, 5).fill();
    D.text(x + w / 2, y - 6, label, { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.65)', strokeWidth: 3.5 });
  }
  function drawHypScene(t) {
    const g = hyG(), R = g.sc, T = HY.t, h = HY.sel, k = R.h / 336;
    if (h === 0) {
      const ix = R.x + R.w * 0.58, iy = R.y + R.h * 0.7, fall = clamp(T / 2, 0, 1), dust = smooth((T - 2.2) / 3.5), plant = 1 - 0.88 * smooth((T - 4) / 3.5), dino = 1 - smooth((T - 6.3) / 2.6);
      const sun = 1 - 0.92 * dust;
      drawWorld(R, { sun, tint: dust, tintCol: '#6b5b4b', plant, dino, shells: null, fish: 1 }, t);
      smokeLayer(R, dust * 0.9, T, '#3b3530');
      if (fall < 1) {
        const e = fall * fall, ax = lerp(R.x + R.w * 0.08, ix, e), ay = lerp(R.y + R.h * 0.04, iy - 8, e);
        for (let q = 0; q < 2; q++) parts.emit({ x: ax + rnd(-6, 6), y: ay + rnd(-6, 6), vx: rnd(-30, 10), vy: rnd(-40, -10), life: 0.6, size: rnd(4, 8), color: ['#fb923c', '#fde68a'][q], shape: 'circle', gravity: -20 });
        D.glow(ax, ay, 46, '#fb923c', 0.7); D.sphere(ax, ay, 14 * (0.6 + 0.4 * k), '#57534e', { shadow: false });
      }
      if (T >= 2 && !HY.did.boom) { HY.did.boom = true; parts.burst(ix, iy, { count: 40, speed: 280, size: 5, life: 1.2, colors: ['#fb923c', '#fde68a', '#78716c'], gravity: 380 }); Sound.fail(); }
      if (T >= 2 && T < 3.6) { const p = (T - 2) / 1.6; D.glow(ix, iy, 40 + 220 * p, '#ffffff', 0.9 * (1 - p)); ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip(); ctx.strokeStyle = rgba('#fff', 0.8 * (1 - p)); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(ix, iy, 30 + 340 * p, 8 + 40 * p, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (T >= 2.3) { ctx.save(); ctx.fillStyle = '#44403c'; ctx.beginPath(); ctx.ellipse(ix, iy + 2, 38, 8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      meter(R.x + 14, R.y + 34, 130, 18, sun, '#facc15', '지표에 닿는 햇빛');
      meter(R.x + 14, R.y + 76, 130, 18, plant, '#22c55e', '광합성하는 식물');
      meter(R.x + 14, R.y + 118, 130, 18, Math.max(0, dino), '#a16207', '큰 동물의 먹이');
    } else if (h === 1) {
      const ph = smooth((T - 1) / 7), acid = smooth((T - 3) / 5), plant = 1 - 0.5 * smooth((T - 5) / 4), dino = 1 - 0.65 * smooth((T - 7) / 2.5);
      drawWorld(R, { sun: 1 - 0.35 * ph, tint: ph * 0.8, tintCol: '#c97a3a', plant, dino, seaCol: mixc('#38bdf8', '#9a9f5a', acid), shells: 1 - acid, fish: 1 - 0.7 * acid }, t);
      const vx = R.x + R.w * 0.2, vy = R.y + R.h * 0.7;
      ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.moveTo(vx - 110, vy); ctx.lineTo(vx - 26, vy - R.h * 0.34); ctx.lineTo(vx + 26, vy - R.h * 0.34); ctx.lineTo(vx + 110, vy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3d2f24'; ctx.beginPath(); ctx.moveTo(vx - 26, vy - R.h * 0.34); ctx.lineTo(vx, vy - R.h * 0.31); ctx.lineTo(vx + 26, vy - R.h * 0.34); ctx.closePath(); ctx.fill();
      smokeLayer(R, ph * 0.55, T, '#7a6a5a');
      if (T > 0.8) { D.glow(vx, vy - R.h * 0.34, 60, '#fb923c', 0.8); const n = RM ? 0 : 3; for (let q = 0; q < n; q++) { parts.emit({ x: vx + rnd(-14, 14), y: vy - R.h * 0.34, vx: rnd(-70, 70), vy: rnd(-260, -150), life: 1.1, size: rnd(3, 6), color: ['#f97316', '#fbbf24', '#ef4444'][q], gravity: 330, shape: 'circle' }); parts.emit({ x: vx + rnd(-10, 10), y: vy - R.h * 0.36, vx: rnd(10, 70), vy: rnd(-90, -50), life: 2.2, size: rnd(16, 30), color: '#6b6258', shape: 'smoke', gravity: -10, grow: 12 }); } }
      meter(R.x + R.w * 0.6 - 10, R.y + 34, 120, 18, ph, '#64748b', '대기의 이산화 탄소');
      meter(R.x + R.w * 0.6 - 10, R.y + 76, 120, 18, ph, '#ef4444', '지구의 기온');
      meter(R.x + R.w * 0.6 - 10, R.y + 118, 120, 18, acid, '#a3a82d', '바닷물의 산성 정도');
    } else {
      const lvl = 1 - 0.95 * smooth((T - 1) / 6), temp = 0.5 + 0.35 * Math.sin(T * 1.1) - 0.15 * smooth(T / 8);
      const shelf = clamp((lvl - 0.43) / 0.57, 0, 1);
      const info = drawWorld(R, { sun: 1, tint: 0.1, tintCol: '#9db7c9', plant: 1 - 0.25 * smooth((T - 3) / 5), dino: 1, lvl, seaCol: '#38bdf8', fish: shelf }, t);
      meter(R.x + 14, R.y + 34, 130, 18, temp, '#ef4444', '기온 (오르내림)');
      meter(R.x + 14, R.y + 76, 130, 18, clamp((lvl - 0.05) / 0.95, 0, 1), '#0ea5e9', '해수면 높이');
      meter(R.x + 14, R.y + 118, 130, 18, shelf, '#38bdf8', '얕은 바다 서식지');
      if (shelf > 0.2) D.label(R.x + R.w * 0.72, info.ys - 16, '얕은 바다', { bg: rgba('#0369a1', 0.85), size: 12.5 });
    }
    // 가설 이름표
    D.label(R.x + R.w - 12, R.y + 20, HYP[h].name + ' 가설', { bg: HYP[h].col, size: PHONE ? 12.5 : 13.5, align: 'right' });
    // 인과 칩
    const C = g.chain, ch = CHAIN[h];
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(C.x, C.y, C.w, C.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(C.x, C.y, C.w, C.h, 14).stroke();
    D.text(C.x + 14, C.y + 22, '일어나는 환경 변화 (원인 → 결과)', { size: PHONE ? 13 : 14.5, weight: 800, color: '#0c4a6e', align: 'left' });
    if (!PHONE) {
      const bw = (C.w - 40 - 48) / 3;
      ch.forEach((c, i) => { const on = HY.t >= c[1], x = C.x + 20 + i * (bw + 24), a = on ? 1 : 0.25; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(HYP[h].col, 0.1); rr(x, C.y + 34, bw, C.h - 46, 10).fill(); ctx.strokeStyle = rgba(HYP[h].col, 0.5); ctx.lineWidth = 2; rr(x, C.y + 34, bw, C.h - 46, 10).stroke(); D.text(x + 14, C.y + 58, '①②③'[i], { size: 15, weight: 800, color: HYP[h].col, align: 'left' }); drawWrap(x + bw / 2 + 6, C.y + 58, c[0], bw - 44, 13.5, { weight: 700, color: '#1e293b', lh: 1.25 }); ctx.restore(); if (i < 2) D.arrow(x + bw + 3, C.y + C.h / 2 + 12, x + bw + 21, C.y + C.h / 2 + 12, { color: '#94a3b8', width: 3, head: 9, alpha: HY.t >= ch[i + 1][1] ? 1 : 0.3 }); });
    } else {
      ch.forEach((c, i) => { const on = HY.t >= c[1], y = C.y + 34 + i * 62; ctx.save(); ctx.globalAlpha = on ? 1 : 0.25; ctx.fillStyle = rgba(HYP[h].col, 0.1); rr(C.x + 12, y, C.w - 24, 54, 10).fill(); ctx.strokeStyle = rgba(HYP[h].col, 0.5); ctx.lineWidth = 2; rr(C.x + 12, y, C.w - 24, 54, 10).stroke(); D.text(C.x + 26, y + 33, '①②③'[i], { size: 15, weight: 800, color: HYP[h].col, align: 'left' }); drawWrap(C.x + C.w / 2 + 12, y + 24, c[0], C.w - 90, 13.5, { weight: 700, color: '#1e293b', lh: 1.2 }); ctx.restore(); });
    }
    // 가설 카드
    HYP.forEach((hp, i) => {
      const c = g.card(i), sel = HY.sel === i;
      D.shadow(() => { ctx.fillStyle = sel ? '#fff' : '#f8fafc'; rr(c.x, c.y, c.w, c.h, 12).fill(); }, { blur: sel ? 9 : 3, y: sel ? 4 : 2 });
      ctx.strokeStyle = sel ? hp.col : '#cfd8e6'; ctx.lineWidth = sel ? 4 : 2; rr(c.x, c.y, c.w, c.h, 12).stroke();
      ctx.fillStyle = rgba(hp.col, 0.14); rr(c.x + 5, c.y + 5, 8, c.h - 10, 4).fill();
      D.text(c.x + 22, c.y + 24, '가설 ' + '㉠㉡㉢'[i], { size: 12.5, weight: 800, color: hp.col, align: 'left' });
      drawWrap(c.x + 22 + (c.w - 54) / 2, c.y + 45, hp.name, c.w - 54, PHONE ? 13 : 14.5, { weight: 800, color: '#1e293b', lh: 1.1 });
      if (HY.opened[i]) D.text(c.x + c.w - 14, c.y + 22, '✔', { size: 15, weight: 800, color: '#16a34a' });
    });
  }

  /* ======================================================
     화면 ③: 증거 평가 (증거 카드 → 가설 패널의 지지 / 반박 칸)
     ====================================================== */
  const EVD = [
    { id: 'e1', label: '이리듐 층', desc: '전 세계 백악기 말 경계 점토층에서 이리듐이 크게 늘어요. 이리듐은 지각에는 드물고 운석에는 많아요.' },
    { id: 'e2', label: '충격 받은 석영', desc: '아주 강한 충격을 받아야 생기는 \'충격 받은 석영\'이 경계 지층에서 발견돼요.' },
    { id: 'e3', label: '유카탄 크레이터', desc: '멕시코 유카탄 반도에서 지름 약 180 km의 충돌 크레이터가 발견됐어요.' },
    { id: 'e4', label: '데칸 용암 대지', desc: '인도 데칸 지역의 용암 대지는 수십만~백만 km² 규모예요. 이산화 탄소와 황산화물이 대량 방출됐을 것으로 추정해요.' },
    { id: 'e5', label: '해수면 곡선', desc: '백악기 말 무렵 해수면이 낮아졌다가 다시 오른 기록(해퇴)이 있어요.' },
    { id: 'e6', label: '화석 기록', desc: '일부 생물군은 경계보다 수백만 년 앞서 서서히 줄어든 흔적이 있어요(일부 연구). 한 번의 갑작스러운 사건만으로는 설명하기 어렵다는 근거로 쓰여요.' },
    { id: 'e7', label: '전 세계 분포', desc: '이리듐과 충격 받은 석영이 여러 대륙과 바다의 경계 지층에서 똑같이 나타나요.' },
    { id: 'e8', label: '시기 일치', desc: '유카탄 크레이터와 데칸 용암 대지의 연대가 모두 약 6600만 년 전, 백악기 말 경계 무렵이에요.' },
  ];
  // 증거 → 가설 관계 (+1 지지, -1 반박, 없으면 해당 없음)
  const REL = { e1: { 0: 1 }, e2: { 0: 1 }, e3: { 0: 1 }, e4: { 1: 1 }, e5: { 2: 1 }, e6: { 0: -1, 1: 1 }, e7: { 0: 1 }, e8: { 0: 1, 1: 1 } };
  const REL_TOTAL = Object.keys(REL).reduce((n, k) => n + Object.keys(REL[k]).length, 0);
  const EVS = { chips: [], sc: [0, 0, 0], info: '', pick: '', pickMsg: '' };
  let eBoard = null;
  const evChips = (zid) => EVS.chips.filter((c) => c.zone === zid);
  const evScore = (h) => EVS.chips.filter((c) => c.h === h).reduce((n, c) => n + c.sign, 0);
  const evG3 = () => (PHONE
    ? { px: (h) => ({ x: 8 + h * 172, y: 8, w: 164, h: 356 }), tray: { x: 14, y: 392, w: 492 }, trayLabel: 376, info: { x: 8, y: 616, w: 504, h: 136 }, chip: { w: 150, h: 28, cols: 1 } }
    : { px: (h) => ({ x: 14 + h * 262, y: 8, w: 250, h: 306 }), tray: { x: 14, y: 336, w: 772 }, trayLabel: 322, info: { x: 14, y: 460, w: 772, h: 90 }, chip: { w: 112, h: 28, cols: 2 } });
  function chipPos(z, i) { const g = evG3().chip; return { x: z.x + 6 + (i % g.cols) * (g.w + 6), y: z.y + 26 + Math.floor(i / g.cols) * 32 }; }
  function buildEvid() {
    const g = evG3(), zones = [];
    for (let h = 0; h < 3; h++) {
      const P = g.px(h), pad = 6, zw = P.w - 2 * pad;
      const sH = PHONE ? 188 : 124, rH = PHONE ? 64 : 80, y0 = P.y + (PHONE ? 92 : 82);
      const mk = (kind, y, hh) => ({ id: 'h' + h + kind, x: P.x + pad, y, w: zw, h: hh, label: kind === 's' ? '👍 지지하는 증거' : '👎 반박하는 증거', lsize: 13, color: kind === 's' ? '#16a34a' : '#dc2626', fill: kind === 's' ? 'rgba(220,252,231,.6)' : 'rgba(254,226,226,.55)', head: 0, cap: 99, hyp: h, kind,
        draw: (z, t) => { evChips(z.id).forEach((c, i) => { const q = chipPos(z, i), sc = Math.max(0.2, c.pop); ctx.save(); ctx.translate(q.x + g.chip.w / 2, q.y + g.chip.h / 2); ctx.scale(sc, sc); D.shadow(() => { ctx.fillStyle = '#fff'; rr(-g.chip.w / 2, -g.chip.h / 2, g.chip.w, g.chip.h, 8).fill(); }, { blur: 3, y: 1 }); ctx.strokeStyle = z.color; ctx.lineWidth = 2; rr(-g.chip.w / 2, -g.chip.h / 2, g.chip.w, g.chip.h, 8).stroke(); D.text(0, 5, c.label, { size: 13, weight: 800, color: '#1e293b' }); ctx.restore(); }); } });
      zones.push(mk('s', y0, sH)); zones.push(mk('r', y0 + sH + 8, rH));
    }
    eBoard = new Board({ zones, tray: { x: g.tray.x, y: g.tray.y, w: g.tray.w, cols: PHONE ? 2 : 4 }, cw: PHONE ? 244 : 184, ch: PHONE ? 46 : 52, gap: 8, vertical: false,
      onDrop: (c, z) => {
        const rel = REL[c.id][z.hyp], want = z.kind === 's' ? 1 : -1;
        if (EVS.chips.some((x) => x.cid === c.id && x.h === z.hyp)) return '이미 이 가설에 놓은 증거예요.';
        if (rel === want) {
          const chip = { cid: c.id, h: z.hyp, sign: want, zone: z.id, label: c.label, pop: 0 };
          EVS.chips.push(chip); SciSim.tween(chip, { pop: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outBack' });
          const q = chipPos(z, evChips(z.id).length - 1); parts.burst(q.x + 50, q.y + 14, { count: 10, speed: 110, size: 3, life: 0.6, colors: [z.color, '#fff'] }); Sound.success();
          say((want > 0 ? '지지하는' : '반박하는') + ' 증거로 놓았어요. 타당성 점수가 ' + (want > 0 ? '올라가요!' : '내려가요!'), false, 2.2);
          return 'keep';
        }
        if (rel == null) return '\'' + c.label + '\'' + josa(c.label, '은/는') + ' 이 가설과 직접 관련이 없는 증거예요(해당 없음).';
        return '이 증거는 이 가설을 ' + (rel > 0 ? '지지' : '반박') + '해요. 반대쪽 칸에 놓아 봐요.';
      },
      onReject: (c, z, m) => say(m, true, 3.6) });
    EVD.forEach((e) => eBoard.add({ id: e.id, label: e.label, desc: e.desc, border: '#cfd8e6' }));
    eBoard.layout(true);
  }
  function resetEvid() { EVS.chips = []; EVS.sc = [0, 0, 0]; EVS.info = ''; EVS.pick = ''; EVS.pickMsg = ''; if (eBoard) { eBoard.reset(); } }
  function stepEvid(dt) { eBoard.update(dt); for (let h = 0; h < 3; h++) EVS.sc[h] = approach(EVS.sc[h], evScore(h), dt, 8); eBoard.cards.forEach((c) => { const tot = Object.keys(REL[c.id]).length, got = EVS.chips.filter((x) => x.cid === c.id).length; c.badge = got ? (got === tot ? '✔' : got + '/' + tot) : ''; c.badgeColor = got === tot ? '#16a34a' : '#d97706'; }); }
  function drawEvid(t) {
    const g = evG3();
    for (let h = 0; h < 3; h++) {
      const P = g.px(h), hp = HYP[h];
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(P.x, P.y, P.w, P.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = hp.col; ctx.lineWidth = 2.5; rr(P.x, P.y, P.w, P.h, 14).stroke();
      ctx.fillStyle = hp.col; rr(P.x, P.y, P.w, 6, 3).fill();
      drawWrap(P.x + P.w / 2, P.y + (PHONE ? 26 : 28), hp.name, P.w - 14, PHONE ? 13.5 : 15, { weight: 800, color: hp.col, lh: 1.15 });
      // 타당성 막대 (-2 ~ 6 범위, 눈금 표시)
      const bx = P.x + 10, bw = P.w - 20, by = P.y + (PHONE ? 52 : 40), bh = PHONE ? 16 : 18, lo = -2, hi = 6, X = (v) => bx + (clamp(v, lo, hi) - lo) / (hi - lo) * bw, v = EVS.sc[h];
      ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, bh, 9).fill();
      ctx.fillStyle = v >= 0 ? '#22c55e' : '#ef4444'; const x0 = X(0), x1 = X(v); ctx.save(); rr(bx, by, bw, bh, 9).clip(); ctx.fillRect(Math.min(x0, x1), by, Math.abs(x1 - x0), bh); ctx.restore();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, by - 3); ctx.lineTo(x0, by + bh + 3); ctx.stroke();
      const sc = evScore(h);
      D.text(P.x + P.w / 2, by + bh + 17, '타당성 점수 ' + (sc > 0 ? '+' : '') + sc, { size: 13, weight: 800, color: sc > 0 ? '#15803d' : sc < 0 ? '#b91c1c' : '#64748b' });
    }
    if (!eBoard.zones.length) return;
    eBoard.draw(t);
    D.text(PHONE ? 14 : 14, g.trayLabel + 4, '🗂 증거 카드 — 가설 칸에 끌어다 놓아요 (한 증거가 여러 가설에 쓰일 수 있어요)', { size: PHONE ? 12.5 : 14, weight: 800, color: '#075985', align: 'left' });
    // 안내 상자
    const I = g.info, c = EVS.info && EVD.find((e) => e.id === EVS.info);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(I.x, I.y, I.w, I.h, 12).fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(I.x, I.y, I.w, I.h, 12).stroke();
    if (c) { D.text(I.x + 14, I.y + 24, '🔎 ' + c.label, { size: 14.5, weight: 800, color: '#0c4a6e', align: 'left' }); drawWrap(I.x + 14, I.y + 46, c.desc, I.w - 28, PHONE ? 13 : 13.5, { weight: 700, color: '#334155', align: 'left', lh: 1.3 }); }
    else { D.text(I.x + 14, I.y + 24, '📏 가설을 평가하는 기준', { size: 14.5, weight: 800, color: '#0c4a6e', align: 'left' }); drawWrap(I.x + 14, I.y + 46, '① 멸종 시기와 일치하는가? ② 전 지구 규모의 증거가 있는가? ③ 왜 어떤 생물만 사라졌는지 설명하는가? ④ 다른 대멸종에도 적용되는가? — 증거 카드를 눌러 내용을 읽어 봐요.', I.w - 28, PHONE ? 13 : 13.5, { weight: 700, color: '#334155', align: 'left', lh: 1.3 }); }
  }

  /* ======================================================
     화면 ④: 멸종 이후 (회복 시간 읽기 · 빈 생태적 지위)
     ====================================================== */
  const AFD = [
    { name: '페름기 말 대멸종', pct: 90, T: 10, icons: ['trilobite', 'fish', 'coral', 'ammonite', 'fern'], yr: '약 2.5억 년 전' },
    { name: '백악기 말 대멸종', pct: 75, T: 5, icons: ['dino', 'ammonite', 'fish', 'conifer', 'coral'], yr: '약 6600만 년 전' },
  ];
  const AF = { ev: 0, x: [5, 5], pin: [null, null], ok: [false, false], dsp: 5 };
  const afD = (e, x) => { const d = AFD[e], r0 = 100 - d.pct; return x < 0 ? 100 : x >= d.T ? 100 : r0 + (100 - r0) * x / d.T; };
  const afG = () => (PHONE ? { ch: { x: 8, y: 8, w: 504, h: 300 }, tab: (i) => ({ x: 14 + i * 150, y: 36, w: 142, h: 30 }), ic: { x: 8, y: 318, w: 504, h: 150 } }
    : { ch: { x: 14, y: 10, w: 772, h: 300 }, tab: (i) => ({ x: 24 + i * 170, y: 36, w: 162, h: 30 }), ic: { x: 14, y: 322, w: 772, h: 226 } });
  const afPlot = () => { const r = afG().ch; return { px0: r.x + 56, px1: r.x + r.w - 24, py0: r.y + 84, py1: r.y + r.h - 44 }; };
  const afX = (m) => { const q = afPlot(); return q.px0 + (m + 2) / 18 * (q.px1 - q.px0); };
  const afY = (v) => { const q = afPlot(); return q.py1 - v / 110 * (q.py1 - q.py0); };
  function resetAfter() { AF.ev = 0; AF.x = [5, 5]; AF.pin = [null, null]; AF.ok = [false, false]; AF.dsp = 5; }
  function afPin() {
    const e = AF.ev, x = AF.x[e], d = AFD[e], v = afD(e, x);
    AF.pin[e] = x;
    if (Math.abs(x - d.T) <= 1) { AF.ok[e] = true; Sound.success(); say(d.name + ': 다양성이 처음 100 %로 돌아오기까지 약 ' + d.T + '백만 년이 걸렸어요!', false, 3.2); parts.burst(afX(d.T), afY(100), { count: 14, speed: 130, size: 3.5, life: 0.7 }); }
    else { AF.ok[e] = false; Sound.fail(); say(v < 100 ? '이때는 다양성이 ' + Math.round(v) + ' %로 아직 회복 중이에요. 처음 100 %로 돌아오는 때를 찾아봐요.' : '이미 완전히 회복한 뒤예요. 곡선이 처음 100 %에 닿는 때를 찾아봐요.', true, 3.4); }
  }
  function drawAfter(t) {
    const g = afG(), r = g.ch, q = afPlot(), e = AF.ev, d = AFD[e], x = AF.dsp;
    chartFrame(r, '대멸종 직후 해양 생물 다양성의 회복 (단순화)');
    AFD.forEach((dd, i) => { const tb = g.tab(i), on = e === i; ctx.fillStyle = on ? '#0284c7' : '#f1f5f9'; rr(tb.x, tb.y, tb.w, tb.h, 15).fill(); ctx.strokeStyle = on ? '#0284c7' : '#cbd5e1'; ctx.lineWidth = 2; rr(tb.x, tb.y, tb.w, tb.h, 15).stroke(); D.text(tb.x + tb.w / 2, tb.y + 20, dd.name.replace(' 대멸종', '') + (AF.ok[i] ? ' ✔' : ''), { size: 13.5, weight: 800, color: on ? '#fff' : '#475569' }); });
    [0, 50, 100].forEach((v) => { ctx.strokeStyle = v === 100 ? '#94a3b8' : '#e8eef6'; ctx.lineWidth = v === 100 ? 1.8 : 1.2; if (v === 100) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(q.px0, afY(v)); ctx.lineTo(q.px1, afY(v)); ctx.stroke(); ctx.setLineDash([]); D.text(q.px0 - 6, afY(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(q.px1, afY(100) - 6, '대멸종 직전 = 100', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    for (let m = 0; m <= 16; m += 2) { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(afX(m), q.py1); ctx.lineTo(afX(m), q.py1 + 5); ctx.stroke(); D.text(afX(m), q.py1 + 19, String(m), { size: 12.5, weight: 700, color: '#64748b' }); }
    D.text((q.px0 + q.px1) / 2, q.py1 + 37, '대멸종 뒤 흐른 시간 (백만 년)', { size: 12.5, weight: 700, color: '#64748b' });
    // 곡선
    ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(afX(-2), afY(100)); ctx.lineTo(afX(0), afY(100)); ctx.lineTo(afX(0), afY(100 - d.pct)); ctx.lineTo(afX(d.T), afY(100)); ctx.lineTo(afX(16), afY(100)); ctx.stroke(); ctx.restore();
    D.label(afX(0) + 10, afY(100 - d.pct / 2) - 4, '급감 ▼ ' + d.pct + ' %', { bg: '#dc2626', size: 12.5, align: 'left' });
    // 눈금선 · 표시
    const mx = afX(x); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, q.py0 - 14); ctx.lineTo(mx, q.py1); ctx.stroke();
    const v = afD(e, AF.x[e]); D.sphere(mx, afY(afD(e, x)), 7, '#ef4444', { shadow: true });
    D.label(clamp(mx, q.px0 + 70, q.px1 - 70), q.py0 - 20, '경과 ' + AF.x[e] + '백만 년 · 다양성 ' + Math.round(v) + ' %', { bg: '#0f172a', size: 12.5 });
    if (AF.pin[e] != null) { const px = afX(AF.pin[e]); ctx.strokeStyle = AF.ok[e] ? '#16a34a' : '#f59e0b'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px, q.py1); ctx.lineTo(px, afY(100)); ctx.stroke(); ctx.setLineDash([]); D.label(px, afY(100) - 22, (AF.ok[e] ? '✔ ' : '') + '표시: ' + AF.pin[e] + '백만 년', { bg: AF.ok[e] ? '#16a34a' : '#d97706', size: 12.5 }); }
    // 아이콘 (20칸 = 대멸종 직전)
    const I = g.ic, n = Math.round(v / 5), cols = PHONE ? 10 : 10, rows = 2, cw = (I.w - 40) / cols, ch = PHONE ? 52 : 70;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(I.x, I.y, I.w, I.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(I.x, I.y, I.w, I.h, 14).stroke();
    D.text(I.x + 14, I.y + 24, '그때 남은 생물의 종류 (한 칸 = 직전의 5 %)', { size: PHONE ? 13 : 14.5, weight: 800, color: '#0c4a6e', align: 'left' });
    for (let k = 0; k < 20; k++) { const cx = I.x + 20 + (k % cols) * cw + cw / 2, cy = I.y + 44 + Math.floor(k / cols) * (ch + 6) + ch / 2, on = k < n; ctx.fillStyle = on ? rgba('#0ea5e9', 0.1) : '#f8fafc'; rr(cx - cw / 2 + 2, cy - ch / 2, cw - 4, ch, 8).fill(); if (!on) { ctx.setLineDash([4, 4]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(cx - cw / 2 + 2, cy - ch / 2, cw - 4, ch, 8).stroke(); ctx.setLineDash([]); } else crit(d.icons[k % 5], cx, cy, Math.min(cw - 10, ch - 10) * 0.9, { color: ['#0369a1', '#0f766e', '#be185d', '#b45309', '#15803d'][k % 5] }); }
    D.text(I.x + I.w / 2, I.y + I.h - 10, n + ' / 20칸 (빈 칸 = 사라진 종류 → 새로운 생물이 채울 자리)', { size: PHONE ? 12.5 : 13.5, weight: 700, color: '#475569' });
  }
  const afSet = (v) => { AF.x[AF.ev] = clamp(Math.round(v * 2) / 2, 0, 15); const s = $('#rAf'); if (s) { s.value = AF.x[AF.ev]; s.dispatchEvent(new Event('input')); } };
  function afSwitch(i) { AF.ev = i; const s = $('#rAf'); if (s) { s.value = AF.x[i]; s.dispatchEvent(new Event('input')); } }

  /* ---------- 빈 생태적 지위 짝짓기 ---------- */
  const NICHE = [
    { id: 'rep', label: '파충류·공룡이 다양해지며 번성', z: 'n0', k: 'dino', col: '#3f6212' },
    { id: 'gym', label: '겉씨식물(소철·침엽수)의 숲이 넓어짐', z: 'n0', k: 'conifer', col: '#166534' },
    { id: 'mam', label: '포유류가 다양해지며 번성', z: 'n1', k: 'shrew', col: '#78350f' },
    { id: 'brd', label: '새(조류)가 다양해짐', z: 'n1', k: 'bird', col: '#1d4ed8' },
  ];
  let nBoard = null; const NF = { n0: 0, n1: 0 };
  function buildNiche() {
    const tw = PHONE ? 118 : 184, th = PHONE ? 76 : 56, gap = PHONE ? 6 : 8, zw = PHONE ? 504 : 772, zh = PHONE ? 206 : 196;
    const zones = [['n0', '페름기 말 대멸종 이후', 'n0'], ['n1', '백악기 말 대멸종 이후', 'n1']].map((z, i) => ({
      id: z[0], x: PHONE ? 8 : 14, y: PHONE ? 52 + i * 216 : 54 + i * 206, w: zw, h: zh, label: z[1], lsize: 15, color: i ? '#2563eb' : '#ea580c', fill: i ? 'rgba(219,234,254,.5)' : 'rgba(255,237,213,.55)', cols: 2, cap: 4, head: 30,
      draw: (zz, t) => {
        const bx = zz.x + (PHONE ? 262 : 400), bw = (zz.x + zz.w - 12 - bx - 2 * 8) / 3, bh = PHONE ? 76 : 70, by = zz.y + 40, cards = nBoard.inZone(zz.id);
        D.text(bx, zz.y + 24, '생태적 지위 (환경 조건과 먹이 자리)', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#64748b', align: 'left' });
        for (let k = 0; k < 6; k++) {
          const cx = bx + (k % 3) * (bw + 8), cy = by + Math.floor(k / 3) * (bh + 8), ci = Math.floor(k / 3) < 2 ? k % 3 : 0, fillN = NF[zz.id], on = k < Math.min(6, Math.round(fillN * 3)), who = cards[k % Math.max(1, cards.length)];
          ctx.setLineDash(on ? [] : [5, 4]); ctx.strokeStyle = on ? rgba('#16a34a', 0.7) : '#b6c3d4'; ctx.lineWidth = 2; ctx.fillStyle = on ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)'; rr(cx, cy, bw, bh, 10).fill(); rr(cx, cy, bw, bh, 10).stroke(); ctx.setLineDash([]);
          if (on && who) { const N = NICHE.find((n) => n.id === who.id); crit(N.k, cx + bw / 2, cy + bh / 2, Math.min(bw, bh) * 0.7, { color: N.col, alpha: clamp(fillN * 3 - k, 0, 1) }); } else D.text(cx + bw / 2, cy + bh / 2 + 6, '빈 자리', { size: 12.5, weight: 700, color: '#b6c3d4' });
        }
      } }));
    nBoard = new Board({ zones, tray: { x: PHONE ? 15 : 14, y: PHONE ? 490 : 480, w: PHONE ? 490 : 772, cols: 4 }, cw: tw, ch: th, gap, vertical: PHONE, onReject: (c, z, m) => say(m, true) });
    [2, 0, 3, 1].forEach((i) => { const n = NICHE[i]; nBoard.add({ id: n.id, label: n.label, z: n.z, draw: (x, y, s) => crit(n.k, x, y, s * 0.95, { color: n.col }), iconBg: 'rgba(0,0,0,.05)', border: '#cfd8e6' }); });
    nBoard.layout(true);
  }
  function stepNiche(dt) { nBoard.update(dt); ['n0', 'n1'].forEach((z) => { NF[z] = approach(NF[z], nBoard.inZone(z).length, dt, 3); }); }
  function drawNiche(t) {
    D.text(VW / 2, PHONE ? 30 : 34, '🌱 대멸종 뒤 빈 자리를 채운 생물을 짝지어요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    nBoard.draw(t);
    D.text(VW / 2, PHONE ? 482 : 474, '👇 아직 놓지 않은 카드', { size: 13, weight: 800, color: '#64748b' });
  }

  /* ---------- 원인 가설 연결 보드 ---------- */
  const LINK = [
    { id: 'l0', label: '먼지와 그을음이 햇빛을 가려 광합성이 줄어듦', hz: 'hz0' },
    { id: 'l1', label: '충돌 직후 하늘이 어두워지고 기온이 갑자기 내려감', hz: 'hz0' },
    { id: 'l2', label: '이산화 탄소가 늘어 지구가 더워짐', hz: 'hz1' },
    { id: 'l3', label: '바닷물이 산성으로 변해 껍데기 생물이 피해를 입음', hz: 'hz1' },
    { id: 'l4', label: '해수면이 낮아져 얕은 바다 서식지가 줄어듦', hz: 'hz2' },
    { id: 'l5', label: '서서히 일어난 기온 변화로 살 수 있는 지역이 줄어듦', hz: 'hz2' },
  ];
  let lBoard = null;
  function buildLink() {
    const zones = HYP.map((hp, i) => PHONE
      ? { id: 'hz' + i, x: 8, y: 52 + i * 124, w: 504, h: 116, label: '가설 ' + '㉠㉡㉢'[i] + '  ' + hp.name, lsize: 14, color: hp.col, fill: rgba(hp.col, 0.08), cols: 2, cap: 4, head: 26 }
      : { id: 'hz' + i, x: 14 + i * 262, y: 54, w: 250, h: 232, label: '가설 ' + '㉠㉡㉢'[i] + ' ' + hp.name, lsize: 14, color: hp.col, fill: rgba(hp.col, 0.08), cols: 1, cap: 4, head: 28 });
    lBoard = new Board({ zones, tray: PHONE ? { x: 12, y: 456, w: 496, cols: 2 } : { x: 14, y: 336, w: 772, cols: 3 }, cw: PHONE ? 244 : 244, ch: PHONE ? 56 : 62, gap: 8, onReject: (c, z, m) => say(m, true) });
    [3, 0, 5, 2, 4, 1].forEach((i) => lBoard.add({ id: LINK[i].id, label: LINK[i].label, hz: LINK[i].hz, border: '#cfd8e6' }));
    lBoard.layout(true);
  }
  function drawLink(t) {
    D.text(VW / 2, PHONE ? 30 : 34, '🔗 환경 변화 카드를 그 변화가 일어나는 가설에 연결해요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    lBoard.draw(t);
    D.text(VW / 2, PHONE ? 446 : 326, '👇 아직 연결하지 않은 카드', { size: 13, weight: 800, color: '#64748b' });
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  let MODE = 'record', SUB = '', fade = 0, game = null;
  const DEFSUB = { record: '', hyp: 'play', evid: 'sort', after: 'recov' };
  const MODE_LABEL = { record: '📈 대멸종 기록', hyp: '☄️ 원인 가설', evid: '⚖️ 증거 평가', after: '🌱 멸종 이후' };
  const curBoard = () => (MODE === 'hyp' && SUB === 'link' ? lBoard : MODE === 'evid' ? eBoard : MODE === 'after' && SUB === 'niche' ? nBoard : null);
  function setMode(m, sub) {
    const s = sub != null ? sub : DEFSUB[m];
    if (MODE !== m || SUB !== s) fade = 1;
    MODE = m; SUB = s; [lBoard, eBoard, nBoard].forEach((b) => { if (b) { b.drag = null; b.hoverZone = null; } });
    if (m === 'hyp' && s === 'play' && !HY.opened.some(Boolean)) selectHyp(0, true);
    updateCtl();
  }
  const ensure = (m, sub) => { if (MODE !== m || (sub != null && SUB !== sub)) setMode(m, sub); };
  function updateCtl() {
    const key = MODE + (SUB ? ':' + SUB : '');
    $('#tbLabel').textContent = MODE_LABEL[MODE];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(MODE)); });
    const fr = !!(game && game.free);
    $('#modeSeg').hidden = !fr;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === MODE));
    [['#subHyp', 'hyp', true], ['#subEvid', 'evid', fr], ['#subAfter', 'after', fr]].forEach(([id, m, show]) => { $(id).hidden = !show; $(id + 'Wrap').hidden = !(show && MODE === m); $$(id + ' button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB)); });
    $('#oRec').textContent = rcFound() + ' / 5';
    $('#oHyp').textContent = HY.opened.filter(Boolean).length + ' / 3';
    $('#oLink').textContent = lBoard.cards.filter((c) => c.zone).length + ' / 6';
    $('#oEvd').textContent = EVS.chips.length + ' / ' + REL_TOTAL;
    $$('#pickSeg button').forEach((b) => b.classList.toggle('on', b.dataset.pick === EVS.pick));
    $('#pickNote').textContent = EVS.pickMsg || '지금까지 모은 증거로 가장 지지받는 설명을 골라요.';
    $('#oAf').textContent = AF.x[AF.ev] + '백만 년';
    $$('#afSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.ev === AF.ev));
    $('#bAfPin').textContent = '📍 이때 처음 100 %로 회복했어요';
    $('#oNiche').textContent = nBoard.cards.filter((c) => c.zone).length + ' / 4';
    $('#afOk').textContent = AFD.map((d, i) => (AF.ok[i] ? '✅ ' : '⬜ ') + d.name.replace(' 대멸종', '') + (AF.ok[i] ? ' ≈ ' + d.T + '백만 년' : '')).join('   ');
  }
  $('#bReplay').addEventListener('click', () => selectHyp(HY.sel));
  $('#bLinkReset').addEventListener('click', () => { Sound.click(); lBoard.reset(); updateCtl(); });
  $('#bEvdReset').addEventListener('click', () => { Sound.click(); resetEvid(); updateCtl(); });
  $('#bNicheReset').addEventListener('click', () => { Sound.click(); nBoard.reset(); updateCtl(); });
  $('#bAfPin').addEventListener('click', () => { Sound.click(); afPin(); updateCtl(); });
  $('#rAf').addEventListener('input', () => { AF.x[AF.ev] = +$('#rAf').value; updateCtl(); });
  SciSim.bindRange($('#rAf'), null, null, null);
  $$('#afSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); afSwitch(+b.dataset.ev); updateCtl(); }));
  const PICKMSG = {
    imp: () => '충돌 가설은 증거 점수가 가장 높아요(+' + evScore(0) + '). 하지만 화산 활동(+' + evScore(1) + ')도 시기가 겹쳐요.',
    vol: () => '화산 활동 가설(+' + evScore(1) + ')도 증거가 있지만 충돌 가설(+' + evScore(0) + ')보다 낮아요.',
    cli: () => '기후·해수면 가설은 증거가 가장 적어요(+' + evScore(2) + '). 막대를 다시 비교해 봐요.',
    combo: () => '충돌과 화산이 겹쳐 작용했을 가능성도 널리 논의되고 있어요. 두 가설 모두 시기가 맞아요.',
  };
  $$('#pickSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); EVS.pick = b.dataset.pick; EVS.pickMsg = PICKMSG[EVS.pick](); updateCtl(); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  [['#subHyp', 'hyp'], ['#subEvid', 'evid'], ['#subAfter', 'after']].forEach(([id, m]) => $$(id + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(m, b.dataset.sub); })));

  /* ---------- 포인터 ---------- */
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  SciSim.pointer(view, {
    down(p) {
      if (MODE === 'record') { rcTap(p); updateCtl(); return false; }
      if (MODE === 'hyp') {
        if (SUB === 'link') return lBoard.down(p);
        const g = hyG(); for (let i = 0; i < 3; i++) if (inRect(p, g.card(i))) { selectHyp(i); updateCtl(); }
        return false;
      }
      if (MODE === 'evid') { const r = eBoard.down(p); if (r && eBoard.drag) EVS.info = eBoard.drag.c.id; return r; }
      if (MODE === 'after') {
        if (SUB === 'niche') return nBoard.down(p);
        const g = afG(); for (let i = 0; i < 2; i++) if (inRect(p, g.tab(i))) { afSwitch(i); updateCtl(); return false; }
        const q = afPlot(); if (p.x >= q.px0 - 10 && p.x <= q.px1 + 10 && p.y >= q.py0 - 30 && p.y <= q.py1 + 10) { AF.dragging = true; afSet(((p.x - q.px0) / (q.px1 - q.px0)) * 18 - 2); updateCtl(); return true; }
      }
      return false;
    },
    move(p) {
      const b = curBoard(); if (b) { b.move(p); return; }
      if (MODE === 'after' && AF.dragging) { const q = afPlot(); afSet(((p.x - q.px0) / (q.px1 - q.px0)) * 18 - 2); updateCtl(); }
    },
    up(p) { const b = curBoard(); if (b) { b.up(p); updateCtl(); } AF.dragging = false; },
    hover(p) {
      if (MODE === 'record') { const q = rcPlot(); return p.x >= q.px0 && p.x <= q.px1 && p.y >= q.py0 && p.y <= q.py1 ? 'crosshair' : 'default'; }
      if (MODE === 'hyp' && SUB === 'play') { const g = hyG(); for (let i = 0; i < 3; i++) if (inRect(p, g.card(i))) return 'pointer'; return 'default'; }
      const b = curBoard(); if (b) return b.hit(p) ? 'grab' : 'default';
      if (MODE === 'after') { const q = afPlot(); return p.x >= q.px0 && p.x <= q.px1 && p.y >= q.py0 - 30 && p.y <= q.py1 ? 'ew-resize' : 'default'; }
      return 'default';
    },
  });

  function readouts() {
    if (MODE === 'record') setReadouts(['찾은 대멸종', rcFound() + ' / 5', '가장 큰 규모', rcFound() === 5 ? '페름기 말 (약 90 % 이상)' : '?', '감소 비율', '약 75~90 %']);
    else if (MODE === 'hyp' && SUB === 'play') setReadouts(['열어 본 가설', HY.opened.filter(Boolean).length + ' / 3', '지금 보는 가설', HYP[HY.sel].name, '경과', Math.min(9, HY.t).toFixed(1) + ' 초']);
    else if (MODE === 'hyp') setReadouts(['연결한 카드', lBoard.cards.filter((c) => c.zone).length + ' / 6', '가설', '3개', '핵심', '가설 → 환경 변화']);
    else if (MODE === 'evid') setReadouts(['소행성 충돌', '점수 ' + (evScore(0) > 0 ? '+' : '') + evScore(0), '화산 활동', '점수 ' + (evScore(1) > 0 ? '+' : '') + evScore(1), '기후·해수면', '점수 ' + (evScore(2) > 0 ? '+' : '') + evScore(2)]);
    else if (SUB === 'recov') setReadouts(['대멸종', AFD[AF.ev].name.replace(' 대멸종', ''), '경과 시간', AF.x[AF.ev] + '백만 년', '그때의 다양성', Math.round(afD(AF.ev, AF.x[AF.ev])) + ' %']);
    else setReadouts(['놓은 카드', nBoard.cards.filter((c) => c.zone).length + ' / 4', '채워진 빈 자리', Math.round(NF.n0 * 3 + NF.n1 * 3) + '곳', '핵심', '빈 생태적 지위']);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { resetRecord(); setMode('record'); }
    else if (li === 1) { HY.opened = [false, false, false]; buildLink(); selectHyp(0, true); setMode('hyp', 'play'); }
    else if (li === 2) { buildEvid(); resetEvid(); setMode('evid', 'sort'); }
    else { resetAfter(); buildNiche(); afSwitch(0); setMode('after', 'recov'); }
    updateCtl();
  }
  const levels = [
    {
      title: '대멸종 기록: 급감한 다섯 곳', short: '대멸종 기록', icon: '📈', phase: '관찰',
      features: ['record'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구 생물의 대부분이 한꺼번에 사라진 까닭은 무엇이고, 그 뒤에 무슨 일이 일어났을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 지질시대를 따라 환경이 바뀌면 생물다양성도 바뀌어 왔음을 봤어요. 이번에는 그중 가장 극적인 사건인 <b>대멸종</b>을 살펴봐요. 원인이 하나로 정해진 것이 아니라서, <b>증거로 여러 가설을 비교·평가</b>해 보는 것이 핵심이에요.</div>' +
        '<p>고생대 이후 해양 생물의 다양성 그래프에서 <b>급격히 줄어드는 곳</b>을 찾아 표시해 봐요. (자료는 단순화한 값이고, 감소 비율은 자료에 따라 달라요.)</p>',
      setup() { enterLevel(0); },
      recap: '고생대 이후 대멸종이 다섯 번 있었어요. 대멸종은 짧은 기간에 많은 종이 사라진 사건이고, 페름기 말이 가장 큰 규모였어요.',
      summary: '<ul><li><b>대멸종</b> = 비교적 짧은 기간에 전 지구에서 많은 종이 한꺼번에 사라진 사건(모든 생물이 사라진 것은 아님).</li><li>다섯 번의 대멸종(해양 생물 종의 감소 비율은 대략값, 자료에 따라 달라요): 오르도비스기 말(약 4.4억 년 전, 약 85 %) · 데본기 후기(약 3.7억 년 전, 약 75 %) · <b>페름기 말(약 2.5억 년 전, 약 90 % 이상 = 최대)</b> · 트라이아스기 말(약 2.0억 년 전, 약 80 %) · 백악기 말(약 6600만 년 전, 약 75 %, 공룡 멸종).</li></ul>',
      missions: [
        {
          title: '급감한 곳 5곳 찾기', goal: '그래프에서 다양성이 <b>갑자기 크게 떨어지는 곳</b> 5곳을 눌러 표시하세요.',
          hint: '곡선이 거의 수직으로 뚝 떨어지는 곳이에요. 왼쪽(고생대)부터 오른쪽(신생대) 사이에 모두 5곳이 있어요.',
          setup() { ensure('record'); },
          check: () => rcFound() === 5, hold: 0.5,
          status: () => mark(rcFound() === 5) + ' 찾은 곳 ' + rcFound() + ' / 5',
          explain: '고생대부터 지금까지 <b>다섯 번</b>의 큰 급감이 있었어요. 곡선이 서서히 오르내리는 것과 달리 대멸종 때는 아주 짧은 기간에 다양성이 크게 줄었어요.',
        },
        {
          type: 'quiz', title: '가장 큰 대멸종', goal: '다섯 번의 대멸종 중 <b>사라진 종의 비율이 가장 컸던</b> 때는?',
          setup() { ensure('record'); },
          choices: ['오르도비스기 말', '데본기 후기', '페름기 말', '트라이아스기 말', '백악기 말 (공룡이 사라진 때)'],
          answer: 2,
          feedback: ['약 85 %가 사라졌지만 더 큰 사건이 있어요.', '약 75 %예요. 더 큰 사건이 있어요.', '', '약 80 %예요. 그래프에서 가장 깊이 떨어진 곳을 찾아봐요.', '공룡이 사라진 사건으로 가장 유명하지만 감소 비율은 약 75 %로 페름기 말(약 90 % 이상)보다 작아요.'],
          explain: '<b>페름기 말</b> 대멸종은 해양 생물 종의 약 90 % 이상이 사라진 최대 규모의 사건이에요. 백악기 말은 공룡이 사라져 가장 유명하지만 규모는 더 작아요.',
        },
        {
          type: 'quiz', title: '대멸종의 뜻', goal: '<b>대멸종</b>을 가장 알맞게 설명한 것은?',
          setup() { ensure('record'); },
          choices: ['비교적 짧은 기간에 전 지구에서 많은 종이 한꺼번에 사라진 사건', '지구의 모든 생물이 완전히 사라진 사건', '한 지역에서 한 종이 사라진 사건', '종이 수억 년에 걸쳐 조금씩 사라지는 일'],
          answer: 0,
          feedback: ['', '모든 생물이 사라진 것은 아니에요. 살아남은 생물이 이후 다시 다양해졌어요.', '그것은 지역적 멸종이에요. 대멸종은 전 지구 규모예요.', '대멸종은 지질학적으로 짧은 기간에 일어난 급격한 사건이에요.'],
          explain: '대멸종은 <b>짧은 기간 · 전 지구 · 많은 종</b>이 핵심이에요. 모든 생물이 사라진 것은 아니고, 살아남은 생물들이 이후 생물다양성을 다시 채워 나갔어요.',
        },
      ],
    },
    {
      title: '원인 가설: 무슨 일이 일어났을까?', short: '원인 가설', icon: '☄️', phase: '탐구',
      features: ['hyp'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대멸종이 다섯 번 있었고 백악기 말(공룡의 멸종)을 비롯해 시기마다 원인에 대한 여러 의견이 있다는 것을 알았어요.</div>' +
        '<p>백악기 말을 사례로 <b>세 가지 가설</b>(㉠ 소행성 충돌, ㉡ 대규모 화산 활동, ㉢ 기후 변화·해수면 하강)이 있어요. 가설이 맞다면 <b>어떤 환경 변화가 일어났을지</b>를 애니메이션으로 확인해 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '가설마다 다른 환경 변화가 일어나요. 충돌은 햇빛 차단, 화산 활동은 이산화 탄소 증가에 따른 온난화와 바닷물 산성화, 기후·해수면 변화는 서식지 감소로 이어져요.',
      summary: '<ul><li><b>㉠ 소행성 충돌</b>: 먼지·그을음이 햇빛을 가림 → 광합성 감소 → 먹이 사슬 붕괴.</li><li><b>㉡ 대규모 화산 활동</b>: 이산화 탄소 증가 → 온난화 · 바닷물 산성화.</li><li><b>㉢ 기후 변화·해수면 하강</b>: 얕은 바다 등 서식지 감소.</li><li>가설은 <b>어떤 환경 변화가 일어났는지</b>를 예측하게 해 주고, 그 예측을 증거로 확인해요.</li></ul>',
      missions: [
        {
          title: '가설과 환경 변화 연결하기', goal: '<b>🎞 가설 보기</b>에서 세 가설을 모두 열어 본 뒤, <b>🔗 연결하기</b>에서 환경 변화 카드 6장을 <b>그 변화가 일어나는 가설</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '위쪽 가설 카드를 눌러 애니메이션을 다시 보세요. 햇빛이 가려지는 것은 충돌, 이산화 탄소는 화산, 해수면은 기후 변화 쪽이에요.',
          manual: true, setup() { ensure('hyp', HY.opened.every(Boolean) ? 'link' : 'play'); },
          check() {
            const un = lBoard.cards.filter((c) => !c.zone);
            if (!HY.opened.every(Boolean)) return '먼저 <b>세 가설</b>의 애니메이션을 모두 열어 봐요. (오른쪽 위 <b>🎞 가설 보기</b>에서 가설 카드를 눌러요.)';
            if (un.length) return '아직 ' + un.length + '장이 남았어요.';
            const bad = lBoard.cards.filter((c) => c.zone !== c.hz);
            if (bad.length) return '<b>' + bad[0].label + '</b> 카드는 다른 가설에서 일어나는 변화예요. 가설 애니메이션을 다시 떠올려 봐요.';
            return true;
          },
          explain: '충돌 가설은 <b>햇빛 차단·어둡고 추워짐</b>, 화산 가설은 <b>이산화 탄소 증가에 따른 온난화와 바닷물 산성화</b>, 기후·해수면 가설은 <b>얕은 바다 서식지 감소</b>를 예측해요. 가설마다 남기는 증거도 달라질 거예요.',
        },
        {
          type: 'quiz', title: '충돌 뒤의 먹이 사슬', goal: '소행성 충돌 뒤 하늘을 덮은 먼지와 그을음은 <b>먹이 사슬</b>에 어떤 영향을 줄까요?',
          setup() { ensure('hyp', 'play'); },
          choices: ['광합성이 줄어 식물·플랑크톤이 줄고, 이를 먹는 동물과 그 포식자까지 차례로 줄어든다', '식물이 더 많이 자라 초식 동물이 늘어난다', '바닷물만 영향을 받고 육지의 생물은 변하지 않는다', '햇빛이 늘어나 먹이 사슬이 더 튼튼해진다'],
          answer: 0,
          feedback: ['', '햇빛이 가려졌으니 식물의 광합성은 줄어요.', '육지에서도 광합성이 줄어 영향이 커요.', '먼지가 햇빛을 가리기 때문에 햇빛은 오히려 줄어요.'],
          explain: '먹이 사슬의 맨 아래는 광합성을 하는 <b>생산자</b>예요. 광합성이 줄면 생산자 → 초식 동물 → 육식 동물 순으로 먹이가 부족해져 큰 동물일수록 더 큰 피해를 입어요.',
        },
      ],
    },
    {
      title: '증거 평가: 어느 가설이 타당할까?', short: '증거 평가', icon: '⚖️', phase: '분석',
      features: ['evid'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 가설이 각각 어떤 환경 변화를 예측하는지 알았어요. 이제 <b>실제 지층과 화석에서 찾은 증거</b>로 가설을 평가해요.</div>' +
        '<p>증거 카드 8장을 가설 패널의 <b>👍 지지</b> 또는 <b>👎 반박</b> 칸에 놓으면 <b>타당성 점수</b> 막대가 변해요. 한 증거가 여러 가설에 쓰일 수도 있어요. 정답을 외우는 것이 아니라 <b>증거를 따져 보는 연습</b>이에요.</p>',
      setup() { enterLevel(2); },
      recap: '여러 증거를 모아 가설을 비교하면 어느 설명이 더 타당한지 판단할 수 있어요. 지금까지는 충돌 가설의 증거가 가장 많지만 화산 활동도 시기가 겹쳐, 복합 원인도 논의 중이에요.',
      summary: '<ul><li>평가 기준: ① 멸종 시기와 일치하는가 ② 전 지구 규모의 증거가 있는가 ③ 멸종의 선택성(왜 어떤 생물만?)을 설명하는가 ④ 다른 대멸종에도 적용되는가.</li><li>백악기 말의 증거: 경계 점토층의 <b>이리듐</b>, <b>충격 받은 석영</b>, 유카탄 반도의 <b>크레이터</b>(충돌), 인도 <b>데칸 용암 대지</b>(화산), 해수면 기록, 화석 기록.</li><li>지금까지 <b>충돌 가설</b>이 가장 지지받지만 <b>화산 활동과 겹쳤을 가능성</b>도 논의 중이에요. 새 증거가 나오면 평가는 바뀔 수 있어요.</li></ul>',
      missions: [
        {
          title: '증거 카드 분류하기', goal: '증거 카드를 가설 패널의 <b>지지 / 반박</b> 칸에 모두 놓아 보세요. (관련 없는 곳에 놓으면 튕겨 나와요.)',
          hint: '카드를 눌러 아래 설명을 읽어 보세요. 이리듐·충격 석영·크레이터는 충돌 쪽, 용암 대지는 화산 쪽이에요. 어떤 카드는 두 가설에 쓰이고, 한 카드는 반박 칸에도 놓여요.',
          setup() { ensure('evid', 'sort'); },
          check: () => EVS.chips.length === REL_TOTAL, hold: 0.6,
          status: () => mark(EVS.chips.length === REL_TOTAL) + ' 분류 ' + EVS.chips.length + ' / ' + REL_TOTAL + ' · 점수 ㉠ ' + evScore(0) + ' ㉡ ' + evScore(1) + ' ㉢ ' + evScore(2),
          explain: '증거마다 어떤 가설과 어울리는지가 달라요. <b>이리듐 층 · 충격 석영 · 크레이터 · 전 세계 분포</b>는 충돌, <b>용암 대지</b>는 화산, <b>해수면 곡선</b>은 기후·해수면 가설과 어울려요. <b>시기 일치</b>는 충돌과 화산 모두에 쓰이고, <b>화석 기록(일부 연구)</b>은 충돌 가설과 어긋나요.',
        },
        {
          title: '가장 타당한 설명 고르기', goal: '막대를 비교해 <b>지금까지의 증거로 가장 지지받는 설명</b>을 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '점수가 가장 높은 가설은 어느 것인가요? 두 가설의 증거가 겹치는 카드도 있었어요.',
          manual: true, setup() { ensure('evid', 'pick'); },
          check() {
            const k = EVS.pick;
            if (!k) return '먼저 아래에서 하나를 골라요.';
            if (k === 'imp' || k === 'combo') return true;
            return PICKMSG[k]();
          },
          explain: '소행성 충돌 가설은 <b>증거 점수가 가장 높고 전 지구 규모의 증거</b>가 있어요. 한편 데칸 용암 대지도 시기가 겹쳐 <b>충돌과 화산 활동이 함께 작용했을 가능성</b>이 널리 논의되고, 아직 논쟁이 이어지고 있어요. 그래서 &lsquo;정답&rsquo;보다 &lsquo;지금까지 가장 지지받는 설명&rsquo;이라고 말해요.',
        },
        {
          type: 'quiz', title: '증거 하나로는 부족해요', goal: '증거 하나만으로 대멸종의 원인을 결론짓기 어려운 까닭은?',
          setup() { ensure('evid', 'sort'); },
          choices: ['한 증거는 여러 가설과 어울릴 수 있고, 새로운 증거가 나오면 평가가 바뀔 수 있기 때문이다', '과학에서는 가설을 하나만 세워야 하기 때문이다', '증거가 많을수록 가설은 반드시 틀린 것이기 때문이다', '대멸종은 한 번만 일어나서 증거를 모을 수 없기 때문이다'],
          answer: 0,
          feedback: ['', '과학에서는 여러 가설을 세우고 증거로 비교해요.', '증거가 가설을 지지하면 타당성이 높아져요.', '대멸종은 다섯 번 일어났고 지층과 화석에 기록이 남아 있어요.'],
          explain: '예를 들어 &lsquo;시기 일치&rsquo; 증거는 충돌과 화산 모두에 쓰였어요. 여러 증거를 <b>종합</b>해 비교하고, 새 증거가 나오면 평가를 고치는 것이 과학적 추론이에요.',
        },
      ],
    },
    {
      title: '멸종 이후: 비어 있던 자리', short: '멸종 이후', icon: '🌱', phase: '분석',
      features: ['after'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 증거로 대멸종의 원인 가설을 평가했어요. 그렇다면 대멸종이 지나간 <b>다음</b>에는 어떤 일이 일어났을까요?</div>' +
        '<p>대멸종 직후 다양성 곡선에서 <b>회복에 걸린 시간</b>을 읽고, 사라진 생물이 비워 둔 <b>생태적 지위</b>를 새로운 생물이 어떻게 채웠는지 알아봐요.</p>',
      setup() { enterLevel(3); },
      recap: '대멸종 뒤 다양성이 회복되는 데에는 수백만~천만 년이 걸렸고, 비어 있던 생태적 지위를 살아남은 생물이 채우며 번성해 생물다양성이 달라졌어요.',
      summary: '<ul><li>대멸종으로 다양성이 급감한 뒤 이전 수준으로 회복하는 데 <b>수백만~천만 년</b>이 걸려요(이 자료: 페름기 말 약 10백만 년, 백악기 말 약 5백만 년).</li><li>사라진 생물이 차지하던 <b>생태적 지위</b>(환경 조건과 먹이 자리)가 비면, 살아남은 생물이 그 자리를 채우며 갈라져 번성해요.</li><li>페름기 말 이후 <b>파충류·공룡</b>이, 백악기 말 이후 <b>포유류</b>가 번성했어요. 대멸종은 이후 생물다양성의 방향을 바꾸는 계기가 되었어요.</li><li>오늘날 생물이 사라지는 속도가 빨라 &lsquo;여섯 번째 대멸종&rsquo;이 논의되고 있고, 인간 활동이 큰 영향을 준다고 해요.</li></ul>',
      missions: [
        {
          title: '회복에 걸린 시간 읽기', goal: '두 대멸종에서 다양성이 <b>처음으로 대멸종 직전 수준(100 %)</b>으로 돌아오는 때를 슬라이더(또는 그래프)로 찾아 📍으로 표시하세요.',
          hint: '급감한 뒤 곡선이 올라가다 처음 점선(100)에 닿는 곳이에요. 페름기 말과 백악기 말은 서로 달라요.',
          setup() { ensure('after', 'recov'); },
          check: () => AF.ok[0] && AF.ok[1], hold: 0.5,
          status: () => AFD.map((d, i) => mark(AF.ok[i]) + ' ' + d.name.replace(' 대멸종', '')).join(' · '),
          explain: '이 단순화한 자료에서 <b>페름기 말</b>은 약 10백만 년(1000만 년), <b>백악기 말</b>은 약 5백만 년(500만 년) 걸려 회복했어요. 사라진 비율이 클수록 회복에 더 오래 걸리는 경향이 있어요.',
        },
        {
          title: '빈 자리를 채운 생물 짝짓기', goal: '대멸종 뒤에 번성한 생물 카드 4장을 <b>어느 대멸종 이후인지</b> 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '공룡이 번성한 중생대는 페름기 말 대멸종 뒤에 시작됐어요. 포유류와 새가 크게 다양해진 때는 공룡이 사라진 뒤예요.',
          manual: true, setup() { ensure('after', 'niche'); },
          check() {
            const un = nBoard.cards.filter((c) => !c.zone); if (un.length) return '아직 ' + un.length + '장이 남았어요.';
            const bad = nBoard.cards.filter((c) => c.zone !== c.z); if (bad.length) return '<b>' + bad[0].label + '</b> 카드는 다른 대멸종 이후에 번성한 생물이에요.';
            return true;
          },
          explain: '<b>페름기 말</b> 대멸종 뒤에는 <b>파충류·공룡</b>과 겉씨식물 숲이, <b>백악기 말</b> 대멸종 뒤에는 <b>포유류와 조류</b>가 크게 번성했어요. 사라진 생물이 비운 생태적 지위를 살아남은 생물이 채웠기 때문이에요.',
        },
        {
          type: 'quiz', title: '대멸종이 바꾼 생물다양성', goal: '대멸종 뒤에 새로운 생물 무리가 크게 번성할 수 있었던 까닭은?',
          setup() { ensure('after', 'niche'); },
          choices: ['멸종으로 비어 있던 생태적 지위를 살아남은 생물이 채우며 다양하게 갈라졌기 때문이다', '대멸종 직후에는 환경 변화가 없어서 같은 생물이 그대로 늘었기 때문이다', '사라진 생물이 곧바로 다시 생겨났기 때문이다', '대멸종은 생물다양성에 아무 영향도 주지 않았기 때문이다'],
          answer: 0,
          feedback: ['', '대멸종 뒤에는 생물의 구성이 크게 달라졌어요.', '사라진 종은 다시 생겨나지 않아요. 살아남은 생물이 새로운 종으로 갈라졌어요.', '대멸종은 이후 생물다양성의 방향을 크게 바꿨어요.'],
          explain: '대멸종은 많은 생물을 없앴지만 <b>빈 생태적 지위</b>를 만들어 살아남은 생물이 번성할 기회가 되었어요. 참고로 지금 인간 활동 때문에 생물이 사라지는 속도가 빨라 &lsquo;여섯 번째 대멸종&rsquo;이 논의되고 있어요.',
        },
      ],
    },
  ];

  buildLink(); buildEvid(); buildNiche(); resetEvid(); afSwitch(0);
  game = SciSim.game({
    simId: 'h1-mass-extinction', mount: '#game', badge: '대멸종 탐정', homeHref: '../../index.html#h1b',
    featureLabels: { record: '📈 다양성 그래프 · 급감 찾기', hyp: '☄️ 가설 애니메이션 · 환경 변화 연결', evid: '⚖️ 증거 카드 · 타당성 막대', after: '🌱 회복 곡선 · 빈 생태적 지위' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false, ctlT = 0;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    ctlT += dt; if (ctlT > 0.25) { ctlT = 0; updateCtl(); }
    if (MODE === 'record') stepRecord(dt);
    else if (MODE === 'hyp') { if (SUB === 'play') stepHyp(dt); else lBoard.update(dt); }
    else if (MODE === 'evid') stepEvid(dt);
    else { if (SUB === 'recov') AF.dsp = approach(AF.dsp, AF.x[AF.ev], dt, 14); else stepNiche(dt); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf1f8'; ctx.fillRect(0, 0, VW, VH);
    if (MODE === 'record') drawRecord(t);
    else if (MODE === 'hyp') { if (SUB === 'play') drawHypScene(t); else drawLink(t); }
    else if (MODE === 'evid') { drawEvid(t); if (SUB === 'pick') { const g = evG3(); ['imp', 'vol', 'cli'].forEach((k, h) => { if (EVS.pick === k || EVS.pick === 'combo' && h < 2) { const P = g.px(h); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; rr(P.x - 2, P.y - 2, P.w + 4, P.h + 4, 16).stroke(); } }); } }
    else { if (SUB === 'recov') drawAfter(t); else drawNiche(t); }
    if (MODE === 'hyp' && SUB === 'play') { const R = hyG().sc; ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip(); parts.draw(ctx); ctx.restore(); } else parts.draw(ctx);
    drawFlash(dt, PHONE ? VH - 70 : VH - 66);
    if (fade > 0.005) { ctx.fillStyle = 'rgba(234,241,248,' + fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); fade = RM ? 0 : SciSim.approach(fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    get game() { return game; }, get MODE() { return MODE; }, get SUB() { return SUB; }, VW, VH, RC, HY, EVS, AF, AFD, EXT, REL, EVD, HYP,
    setMode, enterLevel, updateCtl, rcTap, rcX, rcY, rcPlot, selectHyp, hyG, afPin, afSet, afSwitch, evG3, evScore, afG, afPlot, afX, afY,
    get lBoard() { return lBoard; }, get eBoard() { return eBoard; }, get nBoard() { return nBoard; },
    solveRecord() { EXT.forEach((e) => rcTap({ x: rcX(e.ago), y: rcY(DROPS[EXT.indexOf(e)].v1) })); },
    openAll() { [0, 1, 2].forEach((i) => selectHyp(i, true)); },
    solveLink() { lBoard.cards.forEach((c) => lBoard.place(c, lBoard.zone(c.hz))); updateCtl(); },
    dropEvid(id, h, kind) { const c = eBoard.cards.find((x) => x.id === id); eBoard.place(c, eBoard.zone('h' + h + kind)); updateCtl(); },
    solveEvid() { Object.keys(REL).forEach((id) => Object.keys(REL[id]).forEach((h) => { const c = eBoard.cards.find((x) => x.id === id); eBoard.place(c, eBoard.zone('h' + h + (REL[id][h] > 0 ? 's' : 'r'))); })); updateCtl(); },
    solveNiche() { nBoard.cards.forEach((c) => nBoard.place(c, nBoard.zone(c.z))); updateCtl(); },
  };
})();
