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
     통합과학2 Ⅰ. 변화와 다양성 - 지질시대와 환경 변화
     성취기준 [10통과2-01-01] 지질시대를 통해 지구 환경이 끊임없이 변화해 왔으며 이러한 환경 변화가
     생물다양성에 미치는 영향을 추론할 수 있다. (앞부분: 환경 변화와 생물다양성의 관계)
     ① 관찰: 지층과 화석 (굴착 · 화석 채집 · 생물이 크게 바뀌는 경계)
     ② 분석: 지질시대 (46억 년 = 24시간 지구 시계 · 시대별 대표 생물)
     ③ 탐구: 환경 변화 (대기 산소 · 기온 · 대륙 이동 · 화석으로 환경 알기)
     ④ 예측: 생물 변화 (환경 변화 카드 → 생물 종류 수 예측)
     ※ 연대 측정 계산, 기(紀) 단위 암기, 대멸종 원인 평가는 다루지 않음
     ========================================================= */
  initStage('#eaf3fb', 800, 560, 520, 780);
  const G = {}; // 게임 객체

  /* ---------- 자료 ---------- */
  const ERAS = [
    { name: '선캄브리아시대', short: '선캄브리아', start: 4600, end: 540, col: '#8a7a64', dur: '약 21시간 11분', pct: '약 88 %', range: '46억 ~ 5.4억 년 전' },
    { name: '고생대', short: '고생대', start: 540, end: 250, col: '#2fa56b', dur: '약 1시간 30분', pct: '약 6 %', range: '5.4억 ~ 2.5억 년 전' },
    { name: '중생대', short: '중생대', start: 250, end: 66, col: '#e08a2e', dur: '약 58분', pct: '약 4 %', range: '2.5억 ~ 6600만 년 전' },
    { name: '신생대', short: '신생대', start: 66, end: 0, col: '#3b82f6', dur: '약 21분', pct: '약 1.4 %', range: '6600만 년 전 ~ 현재' },
  ];
  const hrOf = (ago) => ((4600 - ago) / 4600) * 24;      // 지구 시계 시각(시)
  const hm = (h) => { const m = Math.round(h * 60); return Math.floor(m / 60) + '시 ' + (m % 60 < 10 ? '0' : '') + (m % 60) + '분'; };
  const eraAt = (ago) => (ago > 540 ? 0 : ago > 250 ? 1 : ago > 66 ? 2 : 3);
  function agoText(ago) {
    if (ago <= 0.5) return '현재';
    if (ago >= 100) return (Math.round(ago / 10) / 10).toString().replace(/\.0$/, '') + '억 년 전';
    return Math.round(ago) * 100 / 100 >= 1 ? (Math.round(ago) * 100).toLocaleString('ko-KR') + '만 년 전' : '약 ' + Math.round(ago * 100) + '만 년 전';
  }
  const O2PTS = [[4600, 0], [2700, 0.1], [2500, 0.8], [1000, 2], [540, 12], [300, 30], [250, 15], [0, 21]];
  function o2At(ago) {
    for (let i = 0; i < O2PTS.length - 1; i++) {
      const a = O2PTS[i], b = O2PTS[i + 1];
      if (ago <= a[0] && ago >= b[0]) return lerp(a[1], b[1], (a[0] - ago) / (a[0] - b[0]));
    }
    return 21;
  }
  const TPTS = [[540, 1], [480, 1.3], [445, -0.9], [420, 1], [360, 1.2], [320, -1.6], [290, -1.2], [252, 1.4], [200, 1.5], [120, 2], [90, 2.2], [66, 1.6], [50, 2.4], [34, 0.6], [15, 1.1], [5, 0.3], [0, -0.7]];
  function tAt(ago) {
    if (ago > 540) return null;
    for (let i = 0; i < TPTS.length - 1; i++) {
      const a = TPTS[i], b = TPTS[i + 1];
      if (ago <= a[0] && ago >= b[0]) return lerp(a[1], b[1], (a[0] - ago) / (a[0] - b[0]));
    }
    return -0.7;
  }
  /* 시간 슬라이더(u: 0~1000)와 시간(ago) 변환 : 선캄브리아시대는 압축한 축 */
  const FSPLIT = 0.42;
  const fracOf = (ago) => (ago >= 540 ? FSPLIT * (4600 - ago) / 4060 : FSPLIT + (1 - FSPLIT) * (540 - ago) / 540);
  const agoOfFrac = (f) => (f <= FSPLIT ? 4600 - (f / FSPLIT) * 4060 : 540 - ((f - FSPLIT) / (1 - FSPLIT)) * 540);

  /* ======================================================
     화면 ①: 지층 단면과 화석
     ====================================================== */
  const LAYERS = [
    { name: '매머드', kinds: [['mammoth', 1]], note: '코끼리와 닮은 털북숭이 큰 포유류', col: '#cdaa72' },
    { name: '화폐석', kinds: [['nummulite', 1]], note: '동전처럼 생긴 바다 생물', col: '#c29c62' },
    { name: '공룡 뼈', kinds: [['dinobone', 1]], note: '땅 위를 걷던 거대한 파충류', col: '#ab824f' },
    { name: '암모나이트', kinds: [['ammonite', 1]], note: '소라처럼 감긴 껍데기의 바다 동물', col: '#9c7449' },
    { name: '삼엽충·필석', kinds: [['trilobite', 0.62], ['graptolite', 0.62]], note: '아주 오래된 바다 생물', col: '#826c58' },
    { name: '화석 거의 없음', kinds: [['cyano', 0.5]], note: '눈에 띄는 화석이 거의 없어요', col: '#625d55' },
  ];
  const BOUNDS = [2, 4, 5]; // 화석이 크게 바뀌는 경계: 이 번호 지층의 윗면
  const ST = { dug: 0, anim: null, reveal: LAYERS.map(() => 0), bd: 0, fly: null, cap: '', dust: 0, tapT: 0 };
  const stG = () => (PHONE
    ? { cx: 12, cy: 64, cw: 496, lh: 56, sx0: 132, sx1: 316, tx: 12, ty: 484, tw: 242, th: 54, cols: 2 }
    : { cx: 20, cy: 88, cw: 516, lh: 68, sx0: 172, sx1: 376, tx: 556, ty: 74, tw: 226, th: 60, cols: 1 });
  const layRect = (i) => { const g = stG(); return { x: g.cx, y: g.cy + i * g.lh, w: g.cw, h: g.lh }; };
  const slotRect = (i) => { const g = stG(), col = i % g.cols, row = Math.floor(i / g.cols); return { x: g.tx + col * (g.tw + 8), y: g.ty + row * (g.th + 8), w: g.tw, h: g.th }; };
  function resetStrata() { ST.dug = 0; ST.anim = null; ST.reveal = LAYERS.map(() => 0); ST.bd = 0; ST.fly = null; ST.cap = ''; }
  function digLayer(i) {
    if (ST.anim) return;
    if (i !== ST.dug) { say(i < ST.dug ? '이미 파낸 지층이에요. 아래 지층을 파 봐요!' : '위에서부터 차례로 파야 해요. 먼저 윗 지층을 파 봐요!', true); return; }
    ST.anim = { i, t: 0 }; Sound.click();
  }
  function digAll() {
    ST.anim = null; ST.dug = LAYERS.length; ST.reveal = LAYERS.map(() => 1); ST.bd = 1; ST.fly = null;
    ST.cap = '6개 지층을 모두 파냈어요. 화석이 크게 바뀌는 경계가 3곳 있어요.';
  }
  function stepStrata(dt) {
    const A = ST.anim, g = stG();
    if (A) {
      A.t += dt / (RM ? 0.3 : 1.15);
      const r = layRect(A.i), cx = (g.sx0 + g.sx1) / 2;
      ST.dust -= dt;
      if (ST.dust <= 0 && A.t < 0.95) {
        ST.dust = 0.07;
        for (let k = 0; k < 3; k++) parts.emit({ x: cx + rnd(-50, 50), y: r.y + r.h * clamp(A.t, 0.1, 0.9), vx: rnd(-60, 60), vy: rnd(-90, -20), life: 0.7, size: rnd(2, 4.5), color: ['#b08a5a', '#8a6a42', '#d2b27e'][k], gravity: 320, shape: 'square', drag: 1.2 });
      }
      if (A.t >= 1) {
        ST.dug = A.i + 1; ST.anim = null;
        const fx = cx, fy = r.y + r.h / 2, sl = slotRect(A.i);
        parts.burst(fx, fy, { count: 16, speed: 150, size: 3.5, life: 0.7, colors: ['#fde68a', '#fff', '#f59e0b'] });
        SciSim.tween(ST.reveal, { [A.i]: 1 }, { duration: 0.6, ease: 'outBack' });
        ST.fly = { i: A.i, t: 0, x0: fx, y0: fy, x1: sl.x + 28, y1: sl.y + sl.h / 2 };
        ST.cap = '🔎 ' + LAYERS[A.i].name + ' — ' + LAYERS[A.i].note;
        Sound.success();
        if (ST.dug === LAYERS.length) { setTimeout(() => { SciSim.tween(ST, { bd: 1 }, { duration: 1.2, ease: 'outCubic' }); ST.cap = '6개 지층을 모두 파냈어요. 화석이 크게 바뀌는 경계가 3곳 있어요.'; }, RM ? 0 : 900); }
      }
    }
    if (ST.fly) { ST.fly.t += dt / (RM ? 0.1 : 0.7); if (ST.fly.t >= 1) ST.fly = null; }
    if (ST.tapT > 0) ST.tapT -= dt;
  }
  function pebbleSet(i, w, h) {
    if (!pebbleSet.c) pebbleSet.c = {};
    const key = i + ':' + w + ':' + h; if (pebbleSet.c[key]) return pebbleSet.c[key];
    let s = 7919 * (i + 3); const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const a = []; for (let k = 0; k < 26; k++) a.push({ x: r() * w, y: 6 + r() * (h - 12), r: 1.5 + r() * 3.2, a: r() });
    return (pebbleSet.c[key] = a);
  }
  function drawStrata(t) {
    const g = stG();
    D.sky(0, 0, VW, g.cy, '#cfe9fb', '#eaf6ff');
    D.text(VW / 2, PHONE ? 28 : 38, '⛏ 절벽 단면을 위에서 아래로 파내려 가며 화석을 찾아요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    // 풀
    ctx.fillStyle = '#7ccf7a'; rr(g.cx - 4, g.cy - 14, g.cw + 8, 18, 8).fill();
    ctx.fillStyle = '#5eb85e'; for (let x = g.cx; x < g.cx + g.cw; x += 14) { ctx.beginPath(); ctx.moveTo(x, g.cy - 8); ctx.lineTo(x + 5, g.cy - 20 - ((x * 7) % 5)); ctx.lineTo(x + 10, g.cy - 8); ctx.fill(); }
    // 지층
    ctx.save(); rr(g.cx, g.cy, g.cw, g.lh * LAYERS.length, 10).clip();
    LAYERS.forEach((L, i) => {
      const r = layRect(i), gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      gr.addColorStop(0, shade(L.col, 0.12)); gr.addColorStop(1, shade(L.col, -0.1));
      ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = rgba('#000', 0.1); ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); for (let x = 0; x <= r.w; x += 16) { const yy = r.y + r.h * k / 4 + Math.sin(x * 0.04 + i * 2 + k) * 2.4; x ? ctx.lineTo(r.x + x, yy) : ctx.moveTo(r.x + x, yy); } ctx.stroke(); }
      pebbleSet(i, r.w, r.h).forEach((p) => { ctx.fillStyle = rgba(p.a > 0.5 ? '#fff' : '#000', 0.14); ctx.beginPath(); ctx.arc(r.x + p.x, r.y + p.y, p.r, 0, TAU); ctx.fill(); });
      ctx.fillStyle = rgba('#000', 0.18); ctx.fillRect(r.x, r.y + r.h - 2, r.w, 2);
    });
    ctx.restore();
    ctx.strokeStyle = '#6b5236'; ctx.lineWidth = 3; rr(g.cx, g.cy, g.cw, g.lh * LAYERS.length, 10).stroke();
    // 지층 번호
    LAYERS.forEach((L, i) => { const r = layRect(i); D.text(r.x + 12, r.y + r.h / 2 + 5, '지층 ' + (i + 1), { size: PHONE ? 13 : 14, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(60,40,20,.55)', strokeWidth: 3.5 }); });
    // 굴
    const A = ST.anim, sw = g.sx1 - g.sx0, cxs = (g.sx0 + g.sx1) / 2;
    const depthY = g.cy + g.lh * ST.dug + (A ? g.lh * smooth(A.t) : 0);
    if (depthY > g.cy + 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(g.sx0, g.cy, sw, depthY - g.cy); ctx.clip();
      const sg = ctx.createLinearGradient(g.sx0, 0, g.sx1, 0); sg.addColorStop(0, '#2d2218'); sg.addColorStop(0.12, '#4a3a2a'); sg.addColorStop(0.88, '#4a3a2a'); sg.addColorStop(1, '#2d2218');
      ctx.fillStyle = sg; ctx.fillRect(g.sx0, g.cy, sw, depthY - g.cy);
      // 파낸 칸마다 화석
      for (let i = 0; i < LAYERS.length; i++) {
        const r = layRect(i), rv = ST.reveal[i];
        if (rv <= 0.01 || i >= ST.dug) continue;
        D.glow(cxs, r.y + r.h / 2, r.h * 0.9, '#fde68a', 0.28 * rv);
        const L = LAYERS[i], n = L.kinds.length;
        L.kinds.forEach((k, j) => { const px = n === 1 ? cxs : cxs + (j - 0.5) * sw * 0.46, sz = r.h * 0.78 * k[1] * (k[0] === 'graptolite' ? 1.25 : 1) * Math.max(0.2, rv); crit(k[0], px, r.y + r.h / 2, sz, { fossil: true }); });
        if (rv > 0.7 && rv < 1.05) D.spark(cxs + sw * 0.32, r.y + r.h * 0.28, 8 + 4 * Math.sin(t * 6), t, '#fff6c2');
        if (i === 5) { ctx.fillStyle = rgba('#fff', 0.5); for (let q = 0; q < 6; q++) { ctx.beginPath(); ctx.arc(cxs - 60 + q * 24, r.y + r.h * (0.3 + 0.4 * ((q * 7) % 3) / 3), 1.6, 0, TAU); ctx.fill(); } }
      }
      ctx.restore();
      ctx.strokeStyle = '#2d2218'; ctx.lineWidth = 3; ctx.strokeRect(g.sx0, g.cy, sw, depthY - g.cy);
    }
    // 굴착 중: 곡괭이
    if (A) {
      const r = layRect(A.i), swing = Math.sin(A.t * 20) * 0.5;
      ctx.save(); ctx.translate(cxs + 36, r.y + r.h * clamp(A.t, 0.15, 0.85) - 10); ctx.rotate(-0.7 + swing);
      ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, 36); ctx.lineTo(-6, -26); ctx.stroke();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.quadraticCurveTo(-6, -38, 20, -20); ctx.stroke();
      ctx.restore();
    }
    // 이름표 (파낸 지층)
    LAYERS.forEach((L, i) => {
      if (i >= ST.dug || ST.reveal[i] < 0.5) return; const r = layRect(i);
      D.text(g.sx1 + 14, r.y + r.h / 2 + 5, L.name, { size: PHONE ? 13.5 : 15.5, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(40,25,10,.7)', strokeWidth: 4, alpha: smooth((ST.reveal[i] - 0.5) * 2) });
    });
    // 다음에 팔 곳 표시
    if (ST.dug < LAYERS.length && !A) { const r = layRect(ST.dug); D.ring(cxs, r.y + r.h / 2, 24, t, { color: '#f59e0b', speed: 0.9, width: 3 }); D.text(cxs, r.y + r.h / 2 + 6, '⛏', { size: 22 }); }
    // 경계선
    if (ST.bd > 0.01) {
      const cols = ['#ef4444', '#8b5cf6', '#0ea5e9'];
      BOUNDS.forEach((bi, k) => {
        const y = g.cy + bi * g.lh, p = clamp(ST.bd * 1.6 - k * 0.3, 0, 1);
        if (p <= 0) return;
        ctx.save(); ctx.strokeStyle = cols[k]; ctx.lineWidth = 3.5; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.moveTo(g.cx, y); ctx.lineTo(g.cx + g.cw * p, y); ctx.stroke(); ctx.restore();
        if (p > 0.95) D.label(g.cx + g.cw - 54, y, '경계 ' + '①②③'[k], { bg: cols[k], size: 13 });
      });
    }
    // 캡션
    if (ST.cap) note(g.cx, PHONE ? g.cy + g.lh * 6 + 12 : g.cy + g.lh * 6 + 10, PHONE ? g.cw : g.cw, ST.cap, PHONE ? 13 : 14.5, { border: '#d6c4a0' });
    // 채집 카드
    D.text(g.tx + (PHONE ? 4 : 2), g.ty - (PHONE ? 14 : 12), '🧺 채집한 화석 ' + ST.dug + ' / ' + LAYERS.length, { size: PHONE ? 14 : 15.5, weight: 800, color: '#075985', align: 'left' });
    LAYERS.forEach((L, i) => {
      const s = slotRect(i), got = i < ST.dug && !(ST.fly && ST.fly.i === i);
      ctx.save();
      if (got) {
        D.shadow(() => { ctx.fillStyle = '#fff'; rr(s.x, s.y, s.w, s.h, 11).fill(); }, { blur: 4, y: 2 });
        ctx.strokeStyle = '#d6c4a0'; ctx.lineWidth = 2; rr(s.x, s.y, s.w, s.h, 11).stroke();
        ctx.fillStyle = L.col; rr(s.x + 4, s.y + 4, 46, s.h - 8, 8).fill();
        L.kinds.forEach((k, j) => crit(k[0], s.x + 27 + (L.kinds.length > 1 ? (j - 0.5) * 10 : 0), s.y + s.h / 2 + (L.kinds.length > 1 ? (j - 0.5) * 20 : 0), (s.h - 16) * (L.kinds.length > 1 ? 0.62 : 0.9) * k[1], { fossil: true }));
        D.text(s.x + 58, s.y + s.h / 2 - 4, '지층 ' + (i + 1), { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
        D.text(s.x + 58, s.y + s.h / 2 + 15, L.name, { size: PHONE ? 13 : 15, weight: 800, color: '#1e293b', align: 'left' });
      } else {
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#b6c3d4'; ctx.lineWidth = 2; rr(s.x, s.y, s.w, s.h, 11).stroke(); ctx.setLineDash([]);
        D.text(s.x + s.w / 2, s.y + s.h / 2 + 6, '지층 ' + (i + 1) + ' ?', { size: 14, weight: 700, color: '#b6c3d4' });
      }
      ctx.restore();
    });
    if (ST.fly) { const f = ST.fly, e = SciSim.ease.inOutCubic(clamp(f.t, 0, 1)), L = LAYERS[f.i]; L.kinds.forEach((k, j) => crit(k[0], lerp(f.x0, f.x1, e) + j * 12, lerp(f.y0, f.y1, e) - Math.sin(e * Math.PI) * 50, lerp(46, 32, e), { fossil: true })); }
  }

  /* ======================================================
     화면 ②: 지구 시계 (경계 3개 놓기) + 시대별 대표 생물 짝짓기
     ====================================================== */
  const BDS = [
    { ago: 540, name: '선캄브리아시대 → 고생대', yr: '약 5.4억 년 전' },
    { ago: 250, name: '고생대 → 중생대', yr: '약 2.5억 년 전' },
    { ago: 66, name: '중생대 → 신생대', yr: '약 6600만 년 전' },
  ];
  const CK = { placed: [false, false, false], pp: [0, 0, 0], drag: null, sweep: -1, sweeping: false, hand: 0, hover: -1 };
  const ckG = () => (PHONE
    ? { cx: 260, cy: 232, R: 150, tx: 12, ty: 440, tw: 496, th: 56, gap: 6, ly: 646, rh: 27 }
    : { cx: 252, cy: 308, R: 186, tx: 506, ty: 84, tw: 284, th: 74, gap: 12, ly: 384, rh: 36 });
  const tokRect = (k) => { const g = ckG(); return { x: g.tx, y: g.ty + k * (g.th + g.gap), w: g.tw, h: g.th }; };
  const angOf = (h) => (h / 24) * TAU - Math.PI / 2;
  const ckDone = () => CK.placed.every(Boolean);
  function resetClock() { CK.placed = [false, false, false]; CK.pp = [0, 0, 0]; CK.drag = null; CK.sweep = -1; CK.sweeping = false; CK.hand = 0; }
  function clockDrop(k, p) {
    const g = ckG(), dx = p.x - g.cx, dy = p.y - g.cy, r = Math.hypot(dx, dy), tr = hrOf(BDS[k].ago);
    if (r < g.R * 0.32) { say('시계의 눈금 쪽(가장자리)에 놓아야 해요', true); Sound.fail(); return; }
    let h = (Math.atan2(dx, -dy) / TAU) * 24; if (h < 0) h += 24;
    const diff = ((h - tr + 36) % 24) - 12, minErr = Math.abs(diff) * 60;
    if (minErr <= 25) {
      CK.placed[k] = true; CK.pp[k] = 0;
      SciSim.tween(CK.pp, { [k]: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'outCubic' });
      const ax = g.cx + Math.sin(TAU * tr / 24) * g.R, ay = g.cy - Math.cos(TAU * tr / 24) * g.R;
      parts.burst(ax, ay, { count: 14, speed: 130, size: 3.5, life: 0.7, colors: [ERAS[k].col, ERAS[k + 1].col, '#fff'] });
      Sound.success();
      if (ckDone()) say('지구 시계가 완성됐어요! 시대마다 길이가 달라요.', false, 3.5);
    } else {
      Sound.fail();
      say('그곳은 ' + hm(h) + '이에요. ' + hm(tr) + '은 ' + (diff < 0 ? '조금 더 시계 방향(오른쪽)' : '조금 더 반시계 방향(왼쪽)') + '으로 가 봐요. (맨 위 = 0시, 3시간마다 숫자가 있어요)', true, 4.5);
    }
  }
  function stepClock(dt) {
    if (CK.sweeping) {
      CK.hand += dt * (RM ? 24 : 24 / 8.5);
      if (CK.hand >= 24) { CK.hand = 24; CK.sweeping = false; CK.sweep = 24; Sound.success(); }
    }
  }
  function drawDial(t) {
    const g = ckG(), { cx, cy, R } = g;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, TAU); ctx.fill(); }, { blur: 12, y: 4 });
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, TAU); ctx.stroke();
    // 시대 띠
    const hs = [0, hrOf(540), hrOf(250), hrOf(66), 24], bw = PHONE ? 22 : 28;
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = bw; ctx.beginPath(); ctx.arc(cx, cy, R - bw / 2, 0, TAU); ctx.stroke();
    for (let e = 0; e < 4; e++) {
      const needA = e === 0 ? true : CK.placed[e - 1], needB = e === 3 ? true : CK.placed[e];
      if (!(needA && needB)) continue;
      const pr = Math.min(e === 0 ? CK.pp[0] : e === 3 ? CK.pp[2] : Math.min(CK.pp[e - 1], CK.pp[e]), 1);
      const a0 = angOf(hs[e]), a1 = a0 + (angOf(hs[e + 1]) - a0) * pr;
      ctx.strokeStyle = ERAS[e].col; ctx.lineWidth = bw; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, R - bw / 2, a0, a1); ctx.stroke();
    }
    // 눈금
    for (let h = 0; h < 24; h++) {
      const a = angOf(h), major = h % 3 === 0;
      ctx.strokeStyle = major ? '#334155' : '#94a3b8'; ctx.lineWidth = major ? 2.5 : 1.4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)); ctx.lineTo(cx + Math.cos(a) * (R + (major ? 1 : 5)), cy + Math.sin(a) * (R + (major ? 1 : 5))); ctx.stroke();
      if (major) D.text(cx + Math.cos(a) * (R - bw - 14), cy + Math.sin(a) * (R - bw - 14) + 5, h === 0 ? '0시' : String(h), { size: PHONE ? 13 : 14.5, weight: 800, color: '#334155' });
    }
    D.text(cx, cy + R + (PHONE ? 36 : 40), '맨 위 0시 = 지구가 생긴 때, 시계 방향으로 24시 = 지금', { size: PHONE ? 12.5 : 13.5, weight: 700, color: '#64748b' });
    // 놓은 경계 핀 (번호 표시)
    BDS.forEach((b, k) => {
      if (!CK.placed[k]) return;
      const h = hrOf(b.ago), a = angOf(h), ex = cx + Math.cos(a) * (R + 14), ey = cy + Math.sin(a) * (R + 14);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - bw), cy + Math.sin(a) * (R - bw)); ctx.lineTo(ex, ey); ctx.stroke();
      D.sphere(cx + Math.cos(a) * (R + 26), cy + Math.sin(a) * (R + 26), 11, ERAS[k + 1].col, { shadow: true, text: String(k + 1), textScale: 1.15 });
    });
    // 가운데 안내
    if (ckDone()) {
      const hr = CK.sweeping || CK.sweep >= 0 ? CK.hand : -1;
      const e = hr >= 0 ? (hr < hs[1] ? 0 : hr < hs[2] ? 1 : hr < hs[3] ? 2 : 3) : -1;
      if (e >= 0) {
        D.text(cx, cy - 34, ERAS[e].name, { size: PHONE ? 16 : 19, weight: 800, color: ERAS[e].col });
        const show = [['cyano', 'ediacara'], ['trilobite', 'fish'], ['dino', 'ammonite'], ['mammoth', 'nummulite']][e];
        crit(show[0], cx - 36, cy + 8, 50, { color: shade(ERAS[e].col, -0.2) }); crit(show[1], cx + 38, cy + 8, 50, { color: shade(ERAS[e].col, -0.2) });
        D.text(cx, cy + 56, ERAS[e].range, { size: 13, weight: 700, color: '#64748b' });
      } else {
        D.text(cx, cy - 12, '지구 시계 완성!', { size: PHONE ? 15 : 17, weight: 800, color: '#0f766e' });
        D.text(cx, cy + 12, '46억 년 = 24시간', { size: 13.5, weight: 700, color: '#64748b' });
        D.text(cx, cy + 32, '▶ 시계 돌리기를 눌러 봐요', { size: 12.5, weight: 700, color: '#94a3b8' });
      }
      // 현생 인류 표시 (23시 59분 54초 무렵)
      const a = angOf(23.9985);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - bw - 4), cy + Math.sin(a) * (R - bw - 4)); ctx.lineTo(cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16)); ctx.stroke();
      D.label(cx + (PHONE ? 70 : 82), cy - R - (PHONE ? 30 : 34), '현생 인류 ≈ 마지막 5~6초', { bg: '#dc2626', size: PHONE ? 12 : 13 });
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + 6, cy - R - 18); ctx.lineTo(cx + (PHONE ? 20 : 26), cy - R - (PHONE ? 26 : 30)); ctx.stroke();
      if (hr >= 0) {
        const ha = angOf(hr);
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * (R - 6), cy + Math.sin(ha) * (R - 6)); ctx.stroke();
        D.sphere(cx, cy, 6, '#0f172a', { gloss: false });
        D.text(cx, cy + 76, hm(hr) + ' · ' + agoText(4600 - (hr / 24) * 4600), { size: 12.5, weight: 800, color: '#0f172a' });
      }
    } else {
      D.text(cx, cy - 6, '46억 년', { size: PHONE ? 19 : 22, weight: 800, color: '#0369a1' });
      D.text(cx, cy + 20, '= 24시간', { size: PHONE ? 15 : 17, weight: 800, color: '#64748b' });
    }
  }
  function drawTokens(t) {
    const g = ckG();
    D.text(g.tx + (PHONE ? 4 : 2), g.ty - 12, '🧭 경계를 시계의 알맞은 시각에 끌어다 놓아요', { size: PHONE ? 13 : 14.5, weight: 800, color: '#075985', align: 'left' });
    BDS.forEach((b, k) => {
      const r = tokRect(k), dragging = CK.drag && CK.drag.k === k;
      if (CK.placed[k] || dragging) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = CK.placed[k] ? '#16a34a' : '#b6c3d4'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 12).stroke(); ctx.restore();
        if (CK.placed[k]) D.text(r.x + r.w / 2, r.y + r.h / 2 + 5, '✔ ' + '①②③'[k] + ' ' + b.name.replace(' → ', '·') + ' 놓음', { size: PHONE ? 13 : 14, weight: 800, color: '#16a34a' });
      }
      if (!CK.placed[k]) drawToken(k, dragging ? CK.drag.x : r.x + r.w / 2, dragging ? CK.drag.y : r.y + r.h / 2, dragging, t);
    });
  }
  function drawToken(k, x, y, lift, t) {
    const r = tokRect(k), b = BDS[k];
    ctx.save(); ctx.translate(x, y - (lift ? 4 : 0)); if (lift) ctx.scale(1.05, 1.05);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-r.w / 2, -r.h / 2, r.w, r.h, 12).fill(); }, { blur: lift ? 14 : 4, y: lift ? 6 : 2 });
    ctx.fillStyle = ERAS[k + 1].col; rr(-r.w / 2, -r.h / 2, 10, r.h, 6).fill();
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(-r.w / 2, -r.h / 2, r.w, r.h, 12).stroke();
    D.text(-r.w / 2 + 20, -2 - (PHONE ? 2 : 6), '①②③'[k] + ' ' + b.name, { size: PHONE ? 13.5 : 15, weight: 800, color: '#1e293b', align: 'left' });
    D.text(-r.w / 2 + 20, PHONE ? 17 : 20, b.yr + ' · ⏰ ' + hm(hrOf(b.ago)), { size: PHONE ? 12.5 : 13.5, weight: 700, color: '#475569', align: 'left' });
    ctx.restore();
  }
  function drawLegend(t) {
    const g = ckG(), done = ckDone();
    for (let e = 0; e < 4; e++) {
      const y = g.ly + e * g.rh, hr = CK.sweeping || CK.sweep >= 0 ? CK.hand : -1, on = hr >= 0 && e === (hr < hrOf(540) ? 0 : hr < hrOf(250) ? 1 : hr < hrOf(66) ? 2 : 3);
      const known = done || (e === 0 ? CK.placed[0] : e === 3 ? CK.placed[2] : CK.placed[e - 1] && CK.placed[e]);
      const x0 = PHONE ? 12 : 506, w = PHONE ? 496 : 284;
      ctx.save(); ctx.globalAlpha = known ? 1 : 0.45;
      if (on) { ctx.fillStyle = rgba(ERAS[e].col, 0.18); rr(x0 - 4, y - g.rh * 0.62, w + 8, g.rh - 2, 8).fill(); }
      ctx.fillStyle = ERAS[e].col; rr(x0, y - 11, 14, 14, 4).fill();
      D.text(x0 + 22, y + 1, ERAS[e].name, { size: PHONE ? 13 : 14, weight: 800, color: '#1e293b', align: 'left' });
      D.text(x0 + w, y + 1, known ? (ERAS[e].dur + ' · ' + ERAS[e].pct) : '길이는? (시계를 완성하면 보여요)', { size: PHONE ? 12 : 13, weight: 700, color: '#475569', align: 'right' });
      ctx.restore();
    }
    if (done) D.text(PHONE ? 12 : 506, g.ly + 4 * g.rh + 2, '현생 인류: 하루의 마지막 약 5~6초', { size: PHONE ? 12.5 : 13, weight: 800, color: '#dc2626', align: 'left' });
  }
  function drawClock(t) {
    D.text(VW / 2, PHONE ? 26 : 32, '⏰ 지구 시계 — 46억 년을 24시간으로 줄여 봐요', { size: PHONE ? 15 : 18.5, weight: 800, color: '#075985' });
    drawDial(t); drawTokens(t); drawLegend(t);
  }

  /* ---------- 시대별 대표 생물 짝짓기 ---------- */
  const ORG = [
    { id: 'cyano', label: '시아노박테리아', era: 0 }, { id: 'ediacara', label: '에디아카라 생물', era: 0 },
    { id: 'trilobite', label: '삼엽충', era: 1 }, { id: 'graptolite', label: '필석', era: 1 },
    { id: 'dino', label: '공룡', era: 2 }, { id: 'ammonite', label: '암모나이트', era: 2 },
    { id: 'nummulite', label: '화폐석', era: 3 }, { id: 'mammoth', label: '매머드', era: 3 },
  ];
  let mBoard = null;
  function buildMatch() {
    const tw = PHONE ? 118 : 172, th = PHONE ? 68 : 56, gap = PHONE ? 6 : 8;
    const zp = PHONE ? [[8, 52], [264, 52], [8, 242], [264, 242]] : [[16, 54], [408, 54], [16, 226], [408, 226]];
    const zw = PHONE ? 248 : 376, zh = PHONE ? 182 : 164;
    const zones = ERAS.map((e, i) => ({ id: 'e' + i, x: zp[i][0], y: zp[i][1], w: zw, h: zh, label: e.name, sub: PHONE ? '' : e.range, color: e.col, fill: rgba(e.col, 0.1), line: rgba(e.col, 0.6), cols: 2, cap: 4, lsize: PHONE ? 14 : 15.5 }));
    mBoard = new Board({ zones, tray: { x: PHONE ? 15 : 44, y: PHONE ? 442 : 412, w: PHONE ? 490 : 712, cols: 4 }, cw: tw, ch: th, gap, vertical: PHONE,
      onReject: (c, z, m) => say(m, true),
      onPlace: () => { mBoard.cards.forEach((c) => { c.badge = ''; }); } });
    [3, 6, 0, 5, 2, 7, 4, 1].forEach((i) => {
      const o = ORG[i];
      mBoard.add({ id: o.id, label: o.label, era: o.era, draw: (x, y, s) => crit(o.id, x, y, s * 0.95, { color: shade(ERAS[o.era].col, -0.25) }), iconBg: rgba(ERAS[o.era].col, 0.14), border: '#cfd8e6' });
    });
    mBoard.layout(true);
  }
  function matchResult() {
    const bad = mBoard.cards.filter((c) => !c.zone || c.zone !== 'e' + c.era);
    return bad;
  }
  function drawMatch(t) {
    D.text(VW / 2, PHONE ? 30 : 34, '🦕 대표 생물 카드를 알맞은 지질시대 칸에 놓아요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    mBoard.draw(t);
    if (PHONE) D.text(VW / 2, 612, '카드를 끌어다 놓거나, 카드를 누른 뒤 칸을 눌러요', { size: 13, weight: 700, color: '#64748b' });
    else D.text(VW / 2, 404, '👇 아직 놓지 않은 카드', { size: 13.5, weight: 800, color: '#64748b' });
  }

  /* ======================================================
     화면 ③: 환경 변화 (시간 슬라이더 · 대륙 · 장면 · 산소/기온 그래프)
     ====================================================== */
  const EV = { u: 0, disp: 0, pin1: false, pin2: false, dragging: false, hoverChart: false };
  const evAgo = () => agoOfFrac(EV.u);
  const evG = () => (PHONE
    ? { map: { x: 8, y: 8, w: 504, h: 188 }, sc: { x: 8, y: 204, w: 504, h: 188 }, o2: { x: 8, y: 400, w: 504, h: 176 }, tp: { x: 8, y: 584, w: 504, h: 114 }, band: { y: 704, h: 22 }, l: 44, r: 14 }
    : { map: { x: 14, y: 12, w: 380, h: 224 }, sc: { x: 406, y: 12, w: 380, h: 224 }, o2: { x: 14, y: 246, w: 772, h: 168 }, tp: { x: 14, y: 420, w: 772, h: 106 }, band: { y: 530, h: 20 }, l: 52, r: 16 });
  const evX = (ago) => { const g = evG(); return g.o2.x + g.l + fracOf(ago) * (g.o2.w - g.l - g.r); };
  const fracOfX = (x) => { const g = evG(); return clamp((x - (g.o2.x + g.l)) / (g.o2.w - g.l - g.r), 0, 1); };
  function setU(f, quiet) { EV.u = clamp(f, 0, 1); const s = $('#rTime'); if (s) { s.value = Math.round(EV.u * 1000); s.dispatchEvent(new Event('input')); } }
  function setAgo(a) { setU(fracOf(clamp(a, 0, 4600))); }
  function pinTry(which) {
    const a = evAgo();
    if (which === 1) {
      if (a >= 2300 && a <= 2900) { EV.pin1 = true; EV.p1a = a; Sound.success(); say('좋아요! 약 27억~25억 년 전부터 광합성 생물이 산소를 내놓기 시작했어요.', false, 3.5); parts.burst(evX(a), evG().o2.y + 60, { count: 12, speed: 120, size: 3, life: 0.7 }); }
      else { Sound.fail(); say('아직 이른 때(또는 늦은 때)예요. 장면에서 산소 방울이 올라오고 바닷속 철이 붉게 가라앉는 때를 찾아봐요.', true, 4); }
    } else {
      const o = o2At(a);
      if (o >= 10 && a >= 500 && a <= 700) { EV.pin2 = true; EV.p2a = a; Sound.success(); say('맞아요! 약 6억 년 전 무렵부터 산소 농도가 10 %를 넘어섰어요.', false, 3.5); parts.burst(evX(a), evG().o2.y + 60, { count: 12, speed: 120, size: 3, life: 0.7 }); }
      else if (o < 10) { Sound.fail(); say('이때는 산소 농도가 ' + (o < 1 ? '1 % 미만' : '약 ' + Math.round(o) + ' %') + '예요. 10 %를 막 넘는 때를 찾아봐요.', true, 3.5); }
      else { Sound.fail(); say('산소가 이미 ' + Math.round(o) + ' %예요. 10 %를 처음 넘은 때는 더 앞(왼쪽)이에요.', true, 3.5); }
    }
  }
  /* ---- 대륙 ---- */
  const CONT = [
    { n: '북아메리카', pts: [-.10, -.07, -.02, -.12, .08, -.10, .13, -.04, .10, .04, .04, .08, .02, .15, -.02, .12, -.06, .04, -.12, 0], k: [[540, .22, .56], [300, .38, .34], [150, .31, .30], [0, .19, .33]] },
    { n: '유라시아', pts: [-.18, -.04, -.10, -.10, .02, -.12, .14, -.10, .24, -.06, .22, .02, .14, .06, .08, .10, 0, .08, -.08, .04, -.16, .04], k: [[540, .62, .20], [300, .53, .27], [150, .55, .26], [0, .62, .27]] },
    { n: '남아메리카', pts: [-.05, -.10, .04, -.08, .08, 0, .04, .10, -.01, .18, -.05, .10, -.08, 0], k: [[540, .40, .80], [300, .41, .62], [150, .36, .66], [0, .30, .68]] },
    { n: '아프리카', pts: [-.08, -.10, .02, -.12, .09, -.04, .08, .06, .03, .15, -.04, .12, -.07, .02, -.10, -.04], k: [[540, .50, .72], [300, .52, .54], [150, .50, .58], [0, .52, .56]] },
    { n: '인도', pts: [-.03, -.05, .03, -.05, .02, .04, 0, .07, -.03, .02], k: [[540, .62, .88], [300, .59, .70], [150, .60, .80], [0, .69, .52]] },
    { n: '오스트레일리아', pts: [-.08, -.03, 0, -.06, .08, -.02, .07, .05, -.02, .06, -.08, .03], k: [[540, .74, .74], [300, .66, .78], [150, .68, .84], [0, .84, .72]] },
    { n: '남극', pts: [-.14, -.03, -.04, -.05, .06, -.04, .15, -.02, .12, .04, 0, .06, -.10, .04], k: [[540, .44, .92], [300, .54, .86], [150, .53, .90], [0, .50, .91]] },
  ];
  function contPos(c, ago) {
    const k = c.k; if (ago >= 540) return [k[0][1], k[0][2]];
    for (let i = 0; i < k.length - 1; i++) if (ago <= k[i][0] && ago >= k[i + 1][0]) { const f = smooth((k[i][0] - ago) / (k[i][0] - k[i + 1][0])); return [lerp(k[i][1], k[i + 1][1], f), lerp(k[i][2], k[i + 1][2], f)]; }
    return [k[k.length - 1][1], k[k.length - 1][2]];
  }
  function drawMap(r, ago, t) {
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#9fd3f2'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 });
    rr(r.x, r.y, r.w, r.h, 14).clip();
    const gr = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, '#8fcbee'); gr.addColorStop(1, '#6fb4e3'); ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (ago > 560) {
      ctx.fillStyle = rgba('#fff', 0.5); ctx.fillRect(r.x, r.y, r.w, r.h);
      drawWrap(r.x + r.w / 2, r.y + r.h / 2 - 8, '5.4억 년 전보다 이전의 대륙 배치는 단순화를 위해 그리지 않아요', r.w - 60, PHONE ? 13.5 : 14.5, { color: '#0c4a6e' });
    } else {
      const alpha = 1, scl = r.h * 1.18, ptsDraw = (c, x, y) => { ctx.beginPath(); for (let i = 0; i < c.pts.length; i += 2) { const px = x + c.pts[i] * scl, py = y + c.pts[i + 1] * scl; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
      CONT.forEach((c) => {
        const [fx, fy] = contPos(c, ago), x = r.x + fx * r.w, y = r.y + fy * r.h;
        ptsDraw(c, x, y); ctx.fillStyle = '#9ccf7a'; ctx.globalAlpha = alpha; ctx.fill(); ctx.strokeStyle = '#5b8f3e'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      });
      const pg = clamp(1 - Math.abs(ago - 290) / 70, 0, 1) * (ago < 330 && ago > 230 ? 1 : 0);
      if (pg > 0.02) D.label(r.x + r.w * 0.5, r.y + r.h - 20, '판게아 (초대륙)', { bg: rgba('#7c2d12', 0.92), size: PHONE ? 13 : 14 });
      if (ago < 3) CONT.forEach((c) => { const [fx, fy] = contPos(c, ago); D.text(r.x + fx * r.w + (c.n === '인도' ? 12 : 0), r.y + fy * r.h + 5, c.n === '오스트레일리아' ? '호주' : c.n === '북아메리카' ? '북미' : c.n === '남아메리카' ? '남미' : c.n === '유라시아' ? '유라시아' : c.n, { size: 13, weight: 800, color: '#14532d', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 }); });
    }
    ctx.restore();
    D.text(r.x + 12, r.y + 22, '🌍 대륙의 위치 (모식도)', { size: PHONE ? 13.5 : 14.5, weight: 800, color: '#0c4a6e', align: 'left', stroke: 'rgba(255,255,255,.75)', strokeWidth: 3.5 });
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
  }
  /* ---- 장면 ---- */
  const ORGS = [
    { k: 'cyano', from: 3600, to: 0, zone: 'sea', x: 0.1, y: 0.68, s: 20, c: '#10b981' }, { k: 'cyano', from: 3600, to: 0, zone: 'sea', x: 0.3, y: 0.62, s: 16, c: '#10b981' },
    { k: 'stroma', from: 3000, to: 540, zone: 'floor', x: 0.14, y: 0.0, s: 34, c: '#8a7a64' }, { k: 'stroma', from: 3000, to: 540, zone: 'floor', x: 0.4, y: 0.0, s: 28, c: '#8a7a64' },
    { k: 'ediacara', from: 600, to: 540, zone: 'sea', x: 0.24, y: 0.82, s: 40, c: '#a78bfa' },
    { k: 'trilobite', from: 520, to: 252, zone: 'floor', x: 0.28, y: 0.0, s: 34, c: '#6b7280' },
    { k: 'coral', from: 500, to: 0, zone: 'floor', x: 0.08, y: 0.0, s: 40, c: '#f472b6' },
    { k: 'ammonite', from: 400, to: 66, zone: 'sea', x: 0.2, y: 0.76, s: 36, c: '#d97706' },
    { k: 'fish', from: 480, to: 0, zone: 'sea', x: 0.42, y: 0.68, s: 38, c: '#2563eb' },
    { k: 'nummulite', from: 56, to: 34, zone: 'floor', x: 0.5, y: 0.0, s: 26, c: '#a8a29e' },
    { k: 'fern', from: 470, to: 0, zone: 'land', x: 0.62, y: 0, s: 40, c: '#16a34a' },
    { k: 'tree', from: 360, to: 300, zone: 'land', x: 0.74, y: 0, s: 92, c: '#15803d' }, { k: 'tree', from: 360, to: 300, zone: 'land', x: 0.9, y: 0, s: 80, c: '#166534' },
    { k: 'conifer', from: 250, to: 66, zone: 'land', x: 0.9, y: 0, s: 66, c: '#166534' },
    { k: 'dino', from: 230, to: 66, zone: 'land', x: 0.76, y: 0, s: 78, c: '#3f6212' },
    { k: 'shrew', from: 66, to: 0, zone: 'land', x: 0.6, y: 0.04, s: 34, c: '#78350f' },
    { k: 'mammoth', from: 5, to: 0, zone: 'land', x: 0.8, y: 0, s: 78, c: '#6b4423' },
  ];
  const bump = (a, hi, lo, fh, fl) => clamp((hi - a) / fh, 0, 1) * clamp((a - lo) / fl, 0, 1);
  function sceneCaption(a) {
    if (a > 2900) return '산소가 거의 없는 대기예요. 바닷물에는 철 이온이 녹아 있어요.';
    if (a > 1800) return '광합성 생물이 산소를 내놓아요. 산소는 바닷속 철과 결합해 붉은 산화 철로 가라앉아요.';
    if (a > 630) return '산소가 바다와 대기에 서서히 쌓여 가요.';
    if (a > 470) return '산소 농도가 10 %를 넘고 오존층이 만들어지기 시작해요.';
    if (a > 360) return '오존층이 자외선을 막아 주어 생물이 육지로 올라와요.';
    if (a > 300) return '석탄기: 거대한 숲이 생기고 산소 농도가 약 30 %까지 올라가요.';
    if (a > 250) return '산소가 줄고 대륙이 한데 모여 판게아가 만들어져요.';
    if (a > 66) return '판게아가 갈라지고 온난 습윤한 기후가 이어져요. 공룡이 번성해요.';
    return '포유류가 번성하고, 후기에는 빙하기와 간빙기가 반복돼요.';
  }
  function drawScene(r, ago, t) {
    const o2 = o2At(ago), k = smooth(o2 / 18), cap = sceneCaption(ago);
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 });
    rr(r.x, r.y, r.w, r.h, 14).clip();
    const sg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.7); sg.addColorStop(0, mixc('#a9785a', '#74bff0', k)); sg.addColorStop(1, mixc('#e5c4a0', '#d6efff', k));
    ctx.fillStyle = sg; ctx.fillRect(r.x, r.y, r.w, r.h);
    D.glow(r.x + r.w * 0.86, r.y + r.h * 0.5, 40, '#fff7c2', 0.8); D.sphere(r.x + r.w * 0.86, r.y + r.h * 0.5, 13, '#fde047', { gloss: false });
    // 자외선 / 오존층
    const oz = smooth((o2 - 5) / 7), uvOn = ago < 3500;
    if (uvOn) {
      for (let i = 0; i < 4; i++) {
        const ux = r.x + r.w * (0.6 + i * 0.1), phase = (t * 0.5 + i * 0.25) % 1, y0 = r.y + r.h * 0.4, y1 = r.y + r.h * 0.66;
        const stop = oz > 0.5 ? y0 + 6 : y1; const yy = lerp(y0, stop, phase);
        ctx.strokeStyle = rgba('#7c3aed', 0.75 * (1 - phase * 0.3) * (oz > 0.5 ? 0.6 : 1)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ux, yy - 12); ctx.lineTo(ux + 4, yy); ctx.stroke();
      }
      D.text(r.x + r.w * 0.56, r.y + r.h * 0.4 - 2, '자외선', { size: 12.5, weight: 800, color: '#6d28d9', align: 'left' });
    }
    if (oz > 0.02) { const og = ctx.createLinearGradient(0, r.y + r.h * 0.33, 0, r.y + r.h * 0.41); og.addColorStop(0, rgba('#a78bfa', 0)); og.addColorStop(0.5, rgba('#8b5cf6', 0.55 * oz)); og.addColorStop(1, rgba('#a78bfa', 0)); ctx.fillStyle = og; ctx.fillRect(r.x, r.y + r.h * 0.33, r.w, r.h * 0.08); D.text(r.x + r.w - 10, r.y + r.h * 0.4 - 1, '오존층', { size: 13, weight: 800, color: rgba('#4c1d95', oz), align: 'right' }); }
    // 지형
    const seaTop = r.y + r.h * 0.58, landTop = r.y + r.h * 0.68, shoreX = r.x + r.w * 0.55, bot = r.y + r.h;
    const green = smooth((470 - ago) / 60) * (ago <= 470 ? 1 : 0);
    const lg = ctx.createLinearGradient(0, landTop, 0, bot); lg.addColorStop(0, mixc('#c9b99a', '#7bc96f', green)); lg.addColorStop(1, mixc('#9c8a6a', '#8a7a4a', green));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(shoreX - 30, bot); ctx.lineTo(shoreX + 6, landTop + 4); ctx.lineTo(shoreX + 28, landTop); ctx.lineTo(r.x + r.w, landTop); ctx.lineTo(r.x + r.w, bot); ctx.closePath(); ctx.fill();
    const wg = ctx.createLinearGradient(0, seaTop, 0, bot); wg.addColorStop(0, rgba('#38bdf8', 0.9)); wg.addColorStop(1, rgba('#0c4a6e', 0.95));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(r.x, seaTop); for (let x = 0; x <= shoreX - r.x + 6; x += 12) ctx.lineTo(r.x + x, seaTop + Math.sin(t * 2 + x * 0.1) * 1.6); ctx.lineTo(shoreX + 6, landTop + 4); ctx.lineTo(shoreX - 30, bot); ctx.lineTo(r.x, bot); ctx.closePath(); ctx.fill();
    // 바닥: 호상 철광층
    const bif = bump(ago, 2900, 1800, 150, 250);
    const floorY = bot - 20;
    ctx.fillStyle = '#7a6a52'; ctx.beginPath(); ctx.moveTo(r.x, floorY); ctx.lineTo(shoreX - 28, floorY); ctx.lineTo(shoreX - 30, bot); ctx.lineTo(r.x, bot); ctx.closePath(); ctx.fill();
    if (bif > 0.02) for (let q = 0; q < 4; q++) { ctx.fillStyle = rgba(q % 2 ? '#7c2d12' : '#b91c1c', 0.75 * bif); ctx.fillRect(r.x, floorY + q * 5, shoreX - 30 - r.x, 4); }
    if (bif > 0.02) for (let q = 0; q < 7; q++) { const ph = (t * 0.35 + q * 0.17) % 1; ctx.fillStyle = rgba('#b91c1c', 0.8 * bif * (1 - ph)); ctx.beginPath(); ctx.arc(r.x + r.w * (0.06 + 0.07 * q), seaTop + 24 + ph * (floorY - seaTop - 28), 3, 0, TAU); ctx.fill(); }
    // 산소 방울
    const bb = bump(ago, 3000, 1500, 200, 400);
    if (bb > 0.02) for (let q = 0; q < 9; q++) { const ph = (t * 0.28 + q * 0.11) % 1, bx = r.x + r.w * (0.05 + 0.05 * q), by = floorY - ph * (floorY - seaTop + 40); ctx.strokeStyle = rgba('#fff', 0.85 * bb * (1 - ph * 0.5)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 3 + (q % 3), 0, TAU); ctx.stroke(); }
    if (bb > 0.3) D.label(r.x + r.w * 0.2, seaTop + 18, 'O₂ 방울', { bg: rgba('#0369a1', 0.9), size: 12.5 });
    // 생물
    ORGS.forEach((o) => {
      const aIn = o.to === 0 ? 1 : clamp((ago - o.to) / (0.04 * o.to + 4), 0, 1), aOut = clamp((o.from - ago) / (0.04 * o.from + 5), 0, 1), al = aIn * aOut;
      if (al < 0.03) return;
      const sz = o.s * (r.h / 224), x = r.x + o.x * r.w;
      let y;
      if (o.zone === 'sea') y = r.y + o.y * r.h; else if (o.zone === 'floor') y = floorY - sz * 0.3 + 6; else y = landTop - sz * (o.k === 'tree' ? 0.42 : o.k === 'dino' ? 0.3 : o.k === 'mammoth' ? 0.3 : 0.38) + 6 + (o.y || 0) * r.h;
      crit(o.k, x, y, sz, { color: o.c, alpha: al, flip: o.k === 'mammoth' || o.k === 'dino' ? false : false });
    });
    ctx.restore();
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    // 글자
    const ei = eraAt(ago); D.label(r.x + 12 + 0, r.y + 18, ERAS[ei].name, { bg: ERAS[ei].col, size: PHONE ? 12.5 : 13.5, align: 'left' });
    note(r.x + 8, r.y + (PHONE ? 30 : 34), r.w - 16, cap, PHONE ? 12.5 : 13, { bg: 'rgba(255,255,255,.9)' });
  }
  /* ---- 그래프 ---- */
  function chartFrame(r, title) {
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    D.text(r.x + 14, r.y + 22, title, { size: PHONE ? 13 : 14.5, weight: 800, color: '#0c4a6e', align: 'left' });
  }
  function drawO2(g, ago, dispAgo, t) {
    const r = g.o2, px0 = r.x + g.l, px1 = r.x + r.w - g.r, py0 = r.y + 34, py1 = r.y + r.h - 26, X = (a) => px0 + fracOf(a) * (px1 - px0), Y = (v) => py1 - (v / 35) * (py1 - py0);
    chartFrame(r, PHONE ? '대기 중 산소 농도 (%) · 단순화 자료' : '대기 중 산소 농도 (%) · 단순화한 자료 (5.4억 년 전 이전은 눈금을 압축했어요)');
    ctx.font = D.font(12.5, 700);
    [0, 10, 20, 30].forEach((v) => { ctx.strokeStyle = '#e8eef6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); D.text(px0 - 6, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(px0, Y(21)); ctx.lineTo(px1, Y(21)); ctx.stroke(); ctx.restore();
    D.text(px0 + 4, Y(21) - 5, '현재 21 %', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    // 곡선
    const pts = []; for (let i = 0; i <= 240; i++) { const f = i / 240, a = agoOfFrac(f); pts.push([px0 + f * (px1 - px0), Y(o2At(a)), a]); }
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
    const cur = pts.filter((p) => p[2] >= dispAgo - 1e-6);
    if (cur.length > 1) {
      const gr = ctx.createLinearGradient(0, py0, 0, py1); gr.addColorStop(0, rgba('#38bdf8', 0.4)); gr.addColorStop(1, rgba('#38bdf8', 0.03));
      ctx.beginPath(); ctx.moveTo(cur[0][0], py1); cur.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(cur[cur.length - 1][0], py1); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath(); cur.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.restore();
    // 축 눈금
    [[4600, '46억'], [2700, '27억'], [540, '5.4억'], [250, '2.5억'], [66, '6600만'], [0, '현재']].forEach(([a, l], i) => {
      const x = X(a); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, py1); ctx.lineTo(x, py1 + 5); ctx.stroke();
      D.text(i === 4 ? x - 14 : i === 5 ? px1 + 8 : Math.max(x, px0 + 10), py1 + 19, l, { size: 12.5, weight: 700, color: '#64748b', align: i === 0 ? 'left' : i === 5 ? 'right' : 'center' });
    });
    // 축 생략 표시
    const bx = X(540); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 3, py1 + 2); ctx.lineTo(bx + 3, py1 - 5); ctx.stroke();
    // 표시선
    const mx = X(ago), my = Y(o2At(ago));
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, py0 - 4); ctx.lineTo(mx, py1); ctx.stroke();
    D.sphere(mx, my, 7, '#ef4444', { shadow: true });
    const o2v = o2At(ago), lab = (o2v < 1 ? '1 % 미만' : o2v.toFixed(0) + ' %');
    D.label(clamp(mx, px0 + 50, px1 - 50), my - 18 < py0 ? my + 22 : my - 18, '산소 ' + lab, { bg: '#0f172a', size: 12.5 });
    // 핀
    [[EV.pin1, 'pin1'], [EV.pin2, 'pin2']].forEach(([on, k]) => { if (!on) return; const a = k === 'pin1' ? EV.p1a : EV.p2a, x = X(a); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, py1); ctx.lineTo(x, py0 + 14); ctx.stroke(); D.label(x, py0 + 10, k === 'pin1' ? '📍 산소 증가 시작' : '📍 산소 10 % 돌파', { bg: '#16a34a', size: 12 }); });
  }
  function drawTemp(g, ago) {
    const r = g.tp, px0 = r.x + g.l, px1 = r.x + r.w - g.r, py0 = r.y + 30, py1 = r.y + r.h - 12, X = (a) => px0 + fracOf(a) * (px1 - px0), Y = (v) => lerp(py1, py0, (v + 2) / 4.6);
    chartFrame(r, '지구 평균 기온의 경향 (단순화 · 높고 낮음만 표시)');
    D.text(px0 - 6, py0 + 5, '높음', { size: 12.5, weight: 700, color: '#ef4444', align: 'right' }); D.text(px0 - 6, py1 + 3, '낮음', { size: 12.5, weight: 700, color: '#3b82f6', align: 'right' });
    const x540 = X(540);
    ctx.save(); rr(px0, py0 - 4, x540 - px0, py1 - py0 + 8, 6).clip(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; for (let x = px0 - 40; x < x540 + 40; x += 12) { ctx.beginPath(); ctx.moveTo(x, py1 + 6); ctx.lineTo(x + 30, py0 - 6); ctx.stroke(); } ctx.restore();
    D.text(px0 + (x540 - px0) / 2, (py0 + py1) / 2 + 5, '기온 자료는 5.4억 년 전부터 표시', { size: 12.5, weight: 700, color: '#94a3b8' });
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(x540, Y(0.2)); ctx.lineTo(px1, Y(0.2)); ctx.stroke(); ctx.restore();
    const pts = []; for (let a = 540; a >= 0; a -= 4) pts.push([X(a), Y(tAt(a)), a]); pts.push([X(0), Y(tAt(0)), 0]);
    const gr = ctx.createLinearGradient(0, py0, 0, py1); gr.addColorStop(0, '#ef4444'); gr.addColorStop(1, '#3b82f6');
    ctx.save(); ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.stroke();
    const cur = pts.filter((p) => p[2] >= ago - 1e-6); if (cur.length > 1) { ctx.beginPath(); cur.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = gr; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.restore();
    [[445, '빙하기'], [320, '빙하기']].forEach(([a, l]) => D.text(X(a), Y(tAt(a)) + 17, l, { size: 12.5, weight: 800, color: '#2563eb' }));
    D.text(px1 - 4, py0 + 8, '빙하기·간빙기 반복', { size: 12.5, weight: 800, color: '#2563eb', align: 'right' });
    const mx = X(ago); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, py0 - 6); ctx.lineTo(mx, py1 + 4); ctx.stroke();
    const tv = tAt(ago); if (tv != null) D.sphere(mx, Y(tv), 6, '#ef4444', { shadow: true });
  }
  function drawBand(g) {
    const px0 = g.o2.x + g.l, px1 = g.o2.x + g.o2.w - g.r, y = g.band.y, h = g.band.h;
    ERAS.forEach((e) => { const a = px0 + fracOf(e.start) * (px1 - px0), b = px0 + fracOf(e.end) * (px1 - px0); ctx.fillStyle = e.col; ctx.fillRect(a, y, b - a, h); if (b - a > 54) D.text((a + b) / 2, y + h - 5, e.short, { size: 12.5, weight: 800, color: '#fff' }); });
    D.text(px0 - 6, y + h - 5, '시대', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
  }
  function drawEnv(t) {
    const g = evG(), ago = evAgo(), disp = agoOfFrac(EV.disp);
    drawMap(g.map, disp, t); drawScene(g.sc, disp, t); drawO2(g, ago, 0.0 + ago, t); drawTemp(g, ago); drawBand(g);
    if (!EV.touched) D.label(g.o2.x + g.o2.w - 14, g.o2.y + 22, '👆 그래프를 끌어 시간을 바꿔 봐요', { bg: rgba('#0f172a', 0.85), size: PHONE ? 11.5 : 13.5, align: 'right' });
  }
  function stepEnv(dt) { EV.disp = approach(EV.disp, EV.u, dt, 8); if (Math.abs(EV.disp - EV.u) < 0.0004) EV.disp = EV.u; }

  /* ---------- 인과 카드 순서 / 화석-환경 짝짓기 ---------- */
  let oBoard = null, fBoard = null;
  const CAUSE = [
    { id: 'c1', label: '시아노박테리아 같은 광합성 생물이 산소를 내놓기 시작함', n: 0 },
    { id: 'c2', label: '바닷속과 대기에 산소가 늘어남', n: 1 },
    { id: 'c3', label: '산소로 오존층이 만들어져 자외선을 막아 줌', n: 2 },
    { id: 'c4', label: '생물이 육지로 올라와 살기 시작함', n: 3 },
  ];
  function iconSea(x, y, s) { ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill(); crit('coral', x, y, s * 0.8, { color: '#f472b6' }); }
  function buildOrder() {
    const slotW = PHONE ? 496 : 176, slotH = PHONE ? 74 : 112, cw = PHONE ? 480 : 168, ch = PHONE ? 64 : 100;
    const zones = [0, 1, 2, 3].map((i) => PHONE
      ? { id: 's' + i, x: 12, y: 60 + i * (slotH + 14), w: slotW, h: slotH, label: (i + 1) + '번째', cap: 1, center: true, color: '#0284c7', fill: 'rgba(224,242,254,.7)', head: 0 }
      : { id: 's' + i, x: 16 + i * (slotW + 18), y: 70, w: slotW, h: slotH, label: (i + 1) + '번째', cap: 1, center: true, color: '#0284c7', fill: 'rgba(224,242,254,.7)', head: 0 });
    oBoard = new Board({ zones, tray: PHONE ? { x: 20, y: 60 + 4 * (slotH + 14) + 30, w: 480, cols: 1 } : { x: 16, y: 262, w: 768, cols: 4 }, cw, ch, gap: PHONE ? 6 : 18, onReject: (c, z, m) => say(m, true) });
    [2, 0, 3, 1].forEach((i) => oBoard.add({ id: CAUSE[i].id, label: CAUSE[i].label, n: CAUSE[i].n }));
    oBoard.layout(true);
  }
  function orderStatus() {
    const placed = oBoard.cards.filter((c) => c.zone).length;
    const wrong = oBoard.cards.filter((c) => c.zone && c.zone !== 's' + c.n);
    return { placed, wrong };
  }
  function drawOrder(t) {
    D.text(VW / 2, PHONE ? 30 : 36, '⛓ 원인과 결과의 순서대로 카드를 놓아요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    oBoard.draw(t);
    if (!PHONE) { ctx.fillStyle = '#0284c7'; for (let i = 0; i < 3; i++) { const x = 16 + (i + 1) * 194 - 18; ctx.beginPath(); ctx.moveTo(x - 4, 118); ctx.lineTo(x + 8, 126); ctx.lineTo(x - 4, 134); ctx.closePath(); ctx.fill(); } D.text(VW / 2, 246, '👇 아직 놓지 않은 카드', { size: 13.5, weight: 800, color: '#64748b' }); }
  }
  const FOS = [
    { id: 'f1', k: 'coral', label: '산호 화석', env: 'warmsea', c: '#f472b6' },
    { id: 'f2', k: 'fern', label: '고사리 화석', env: 'warmland', c: '#16a34a' },
    { id: 'f3', k: 'mammoth', label: '매머드 화석', env: 'cold', c: '#6b4423' },
  ];
  const ENVS = [['warmsea', '따뜻하고 얕은 바다'], ['warmland', '따뜻하고 습한 육지'], ['cold', '춥고 건조한 한랭 환경']];
  function buildFossil() {
    const zw = PHONE ? 496 : 248, zh = PHONE ? 78 : 132, cw = PHONE ? 230 : 200, ch = PHONE ? 62 : 70;
    const zones = ENVS.map((e, i) => PHONE
      ? { id: e[0], x: 12, y: 58 + i * (zh + 12), w: zw, h: zh, label: e[1], cap: 1, center: true, head: 0, color: '#0284c7', fill: 'rgba(224,242,254,.7)', lsize: 14 }
      : { id: e[0], x: 14 + i * (zw + 14), y: 70, w: zw, h: zh, label: e[1], cap: 1, color: '#0284c7', fill: 'rgba(224,242,254,.7)', lsize: 15.5 });
    fBoard = new Board({ zones, tray: PHONE ? { x: 20, y: 58 + 3 * (zh + 12) + 30, w: 480, cols: 2 } : { x: 14, y: 290, w: 772, cols: 3 }, cw, ch, gap: PHONE ? 8 : 20, onReject: (c, z, m) => say(m, true) });
    [2, 0, 1].forEach((i) => { const f = FOS[i]; fBoard.add({ id: f.id, label: f.label, env: f.env, draw: (x, y, s) => crit(f.k, x, y, s * 0.85, { fossil: true }), iconBg: '#d9c7a0' }); });
    fBoard.layout(true);
  }
  function drawFossil(t) {
    D.text(VW / 2, PHONE ? 30 : 36, '🔎 화석은 옛 환경을 알려 주는 단서예요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#075985' });
    fBoard.draw(t);
    D.text(VW / 2, PHONE ? 58 + 3 * 90 + 14 : 274, '👇 화석 카드를 알맞은 환경 칸으로', { size: 13.5, weight: 800, color: '#64748b' });
  }

  /* ======================================================
     화면 ④: 환경 변화 → 생물 종류 수 예측
     ====================================================== */
  const PRD = [
    { id: 'pangea', tip: '판게아 형성', title: '대륙이 한데 모임', sub: '판게아 형성', end: 62, col: '#dc4a2a', mid: '얕은 바다(해안선)가 줄고 내륙은 건조해져요', out: '해양 생물의 서식지가 줄어 종류가 줄어요' },
    { id: 'o2', tip: '산소 증가', title: '대기 산소 증가', sub: '오존층 형성', end: 132, col: '#16a34a', mid: '산소를 쓰는 생물이 커지고, 오존층이 자외선을 막아 육지 서식지가 열려요', out: '육지까지 서식지가 넓어져 종류가 늘어요' },
    { id: 'warm', tip: '온난·습윤', title: '온난·습윤한 기후', sub: '따뜻하고 비가 많음', end: 124, col: '#d98e0b', mid: '숲과 습지가 넓어지고 먹이가 풍부해져요', out: '서식지와 먹이가 늘어 종류가 늘어요' },
    { id: 'ice', tip: '빙하기', title: '빙하기', sub: '춥고 건조함', end: 72, col: '#2f6fd1', mid: '얼음이 넓어지고 해수면이 낮아져 살 수 있는 곳과 먹이가 줄어요', out: '서식지와 먹이가 줄어 종류가 줄어요' },
  ];
  const PR = { sel: 0, pred: [null, null, null, null], shown: [0, 0, 0, 0] };
  const prG = () => (PHONE
    ? { cw: 246, ch: 84, cards: (i) => ({ x: 8 + (i % 2) * 258, y: 8 + Math.floor(i / 2) * 92 }), chart: { x: 8, y: 200, w: 504, h: 290 }, chain: { x: 8, y: 500, w: 504, h: 200 } }
    : { cw: 186, ch: 100, cards: (i) => ({ x: 14 + i * 194, y: 12 }), chart: { x: 14, y: 122, w: 772, h: 300 }, chain: { x: 14, y: 432, w: 772, h: 118 } });
  const prDone = (i) => PR.pred[i] != null && PR.shown[i] > 0.995;
  const prCorrect = (i) => PR.pred[i] === (PRD[i].end > 100 ? 'up' : 'down');
  function resetPredict() { PR.sel = 0; PR.pred = [null, null, null, null]; PR.shown = [0, 0, 0, 0]; }
  function prSelect(i) { PR.sel = i; Sound.click(); updateCtl(); }
  function prPredict(dir) {
    const i = PR.sel; if (PR.pred[i] != null) return;
    PR.pred[i] = dir; Sound.click();
    SciSim.tween(PR.shown, { [i]: 1 }, { duration: RM ? 0.01 : 2.2, ease: 'inOutSine', onDone: () => {
      const ok = prCorrect(i); Sound.tick();
      say((ok ? '예측이 맞았어요! ' : '예측과 달랐어요. ') + PRD[i].out + '.', !ok, 4.2);
      const g = prG(); parts.burst(g.chart.x + g.chart.w - 90, g.chart.y + 120, { count: ok ? 16 : 6, speed: 130, size: 3.5, life: 0.8, colors: [PRD[i].col, '#fff'] });
      updateCtl();
    } });
    updateCtl();
  }
  function prIcon(i, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    if (i === 0) { ctx.fillStyle = '#9ccf7a'; ctx.strokeStyle = '#5b8f3e'; ctx.lineWidth = 2; [[-s * 0.32, -4], [s * 0.2, 4]].forEach((c) => { ctx.beginPath(); ctx.ellipse(c[0], c[1], s * 0.3, s * 0.22, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }); D.arrow(-s * 0.55, s * 0.4, -s * 0.15, s * 0.1, { color: '#dc4a2a', width: 2.5, head: 8 }); D.arrow(s * 0.55, -s * 0.4, s * 0.2, -s * 0.1, { color: '#dc4a2a', width: 2.5, head: 8 }); }
    else if (i === 1) { D.sphere(-s * 0.15, s * 0.05, s * 0.3, '#7dd3fc', { text: 'O₂', textScale: 0.7, textColor: '#075985' }); D.sphere(s * 0.3, -s * 0.25, s * 0.17, '#bae6fd', { gloss: true }); D.sphere(s * 0.34, s * 0.3, s * 0.12, '#bae6fd', { gloss: true }); }
    else if (i === 2) { D.sphere(-s * 0.1, -s * 0.2, s * 0.22, '#fde047', { gloss: false }); ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(s * 0.05, 0, s * 0.4, s * 0.17, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; [-0.2, 0.05, 0.3].forEach((dx) => { ctx.beginPath(); ctx.moveTo(s * dx, s * 0.2); ctx.lineTo(s * (dx - 0.06), s * 0.42); ctx.stroke(); }); }
    else { ctx.strokeStyle = '#2f6fd1'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42); ctx.lineTo(-Math.cos(a) * s * 0.42, -Math.sin(a) * s * 0.42); ctx.stroke(); } }
    ctx.restore();
  }
  function drawPredict(t) {
    const g = prG();
    PRD.forEach((c, i) => {
      const p = g.cards(i), sel = PR.sel === i, done = prDone(i);
      D.shadow(() => { ctx.fillStyle = sel ? '#fff' : '#f8fafc'; rr(p.x, p.y, g.cw, g.ch, 14).fill(); }, { blur: sel ? 10 : 4, y: sel ? 4 : 2 });
      ctx.strokeStyle = sel ? c.col : '#cfd8e6'; ctx.lineWidth = sel ? 4 : 2; rr(p.x, p.y, g.cw, g.ch, 14).stroke();
      ctx.fillStyle = rgba(c.col, 0.13); rr(p.x + 6, p.y + 6, 58, g.ch - 12, 10).fill();
      prIcon(i, p.x + 35, p.y + g.ch / 2, 46);
      drawWrap(p.x + 70 + (g.cw - 78) / 2, p.y + 28, c.title, g.cw - 82, PHONE ? 14 : 15, { weight: 800, color: '#1e293b', lh: 1.15 });
      D.text(p.x + 70 + (g.cw - 78) / 2, p.y + g.ch - (PHONE ? 26 : 30), c.sub, { size: 12.5, weight: 700, color: '#64748b' });
      if (PR.pred[i]) D.text(p.x + 70 + (g.cw - 78) / 2, p.y + g.ch - 9, '예측 ' + (PR.pred[i] === 'up' ? '▲ 늘어남' : '▼ 줄어듦') + (done ? (prCorrect(i) ? ' ✔' : ' ✘') : ''), { size: 13, weight: 800, color: done ? (prCorrect(i) ? '#16a34a' : '#dc2626') : '#475569' });
      else D.text(p.x + 70 + (g.cw - 78) / 2, p.y + g.ch - 9, '예측해 보세요', { size: 13, weight: 800, color: sel ? c.col : '#94a3b8' });
    });
    // 그래프
    const r = g.chart, px0 = r.x + 56, px1 = r.x + r.w - (PHONE ? 100 : 150), py0 = r.y + 40, py1 = r.y + r.h - 34, Y = (v) => lerp(py1, py0, (v - 40) / 120);
    chartFrame(r, '생물의 종류 수 변화 (단순화 · 상대값)');
    [50, 100, 150].forEach((v) => { ctx.strokeStyle = v === 100 ? '#94a3b8' : '#e8eef6'; ctx.lineWidth = v === 100 ? 2 : 1.2; if (v === 100) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1 + (PHONE ? 90 : 140), Y(v)); ctx.stroke(); ctx.setLineDash([]); D.text(px0 - 8, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(px0 + 6, Y(100) - 6, '환경 변화 전 = 100', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    D.text((px0 + px1) / 2, py1 + 24, '환경 변화가 일어난 뒤 시간의 흐름 →', { size: 13, weight: 700, color: '#64748b' });
    const tips = [];
    PRD.forEach((c, i) => {
      const sh = PR.shown[i]; if (sh <= 0.001) return;
      const sel = PR.sel === i;
      ctx.save(); ctx.globalAlpha = sel ? 1 : 0.55; ctx.strokeStyle = c.col; ctx.lineWidth = sel ? 4.5 : 3; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = 40; for (let k = 0; k <= n; k++) { const f = (k / n) * sh, v = 100 + (c.end - 100) * smooth(f), x = px0 + f * (px1 - px0), y = Y(v); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
      const f = sh, v = 100 + (c.end - 100) * smooth(f), x = px0 + f * (px1 - px0); D.sphere(x, Y(v), 6, c.col, { shadow: true });
      if (sh > 0.99) tips.push({ i, y: Y(c.end), x: px1 });
    });
    tips.sort((a, b) => a.y - b.y); for (let k = 1; k < tips.length; k++) if (tips[k].y - tips[k - 1].y < 25) tips[k].y = tips[k - 1].y + 25;
    tips.forEach((tp) => { const c = PRD[tp.i]; D.label(tp.x + 12, tp.y, c.tip, { bg: c.col, size: 12.5, align: 'left' }); });
    // 설명 상자
    const ch = g.chain, c = PRD[PR.sel], known = prDone(PR.sel);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(ch.x, ch.y, ch.w, ch.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8e6'; ctx.lineWidth = 2; rr(ch.x, ch.y, ch.w, ch.h, 14).stroke();
    const boxes = [['환경 변화', c.title, c.col], ['서식지 · 먹이의 변화', known ? c.mid : '? (예측하면 알려 줘요)', '#475569'], ['생물의 종류와 수', known ? c.out : '? (예측하면 알려 줘요)', known ? (c.end > 100 ? '#16a34a' : '#dc2626') : '#475569']];
    if (!PHONE) {
      const bw = (ch.w - 40 - 56) / 3;
      boxes.forEach((b, k) => { const bx = ch.x + 20 + k * (bw + 28); ctx.fillStyle = rgba(b[2], 0.1); rr(bx, ch.y + 12, bw, ch.h - 24, 10).fill(); D.text(bx + bw / 2, ch.y + 32, b[0], { size: 13, weight: 800, color: b[2] }); drawWrap(bx + bw / 2, ch.y + 54, b[1], bw - 14, 13.5, { weight: 700, color: '#1e293b', lh: 1.25 }); if (k < 2) D.arrow(bx + bw + 4, ch.y + ch.h / 2, bx + bw + 24, ch.y + ch.h / 2, { color: '#94a3b8', width: 3, head: 9 }); });
    } else {
      boxes.forEach((b, k) => { const by = ch.y + 8 + k * 64; ctx.fillStyle = rgba(b[2], 0.1); rr(ch.x + 12, by, ch.w - 24, 54, 10).fill(); D.text(ch.x + 22, by + 19, b[0], { size: 13, weight: 800, color: b[2], align: 'left' }); drawWrap(ch.x + 22 + (ch.w - 44) / 2, by + 38, b[1], ch.w - 52, 13, { weight: 700, color: '#1e293b', align: 'center', lh: 1.15 }); if (k < 2) D.text(ch.x + ch.w / 2, by + 63, '▼', { size: 12, color: '#94a3b8' }); });
    }
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  let MODE = 'strata', SUB = '', fade = 0, game = null;
  const DEFSUB = { strata: '', clock: 'dial', env: 'explore', predict: '' };
  const MODE_LABEL = { strata: '⛏ 지층과 화석', clock: '⏰ 지구 시계', env: '🌍 환경 변화', predict: '🎯 생물 변화 예측' };
  const o2Txt = (v) => (v < 1 ? '1 % 미만' : Math.round(v) + ' %');
  function setMode(m, sub) {
    const s = sub != null ? sub : DEFSUB[m];
    if (MODE !== m || SUB !== s) fade = 1;
    MODE = m; SUB = s; CK.drag = null; [mBoard, oBoard, fBoard].forEach((b) => { if (b) { b.drag = null; b.hoverZone = null; } });
    updateCtl();
  }
  const ensure = (m, sub) => { if (MODE !== m || (sub != null && SUB !== sub)) setMode(m, sub); };
  function updateCtl() {
    const key = MODE + (SUB ? ':' + SUB : '');
    $('#tbLabel').textContent = MODE_LABEL[MODE];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(MODE)); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === MODE));
    $('#modeSeg').hidden = !(game && game.free);
    const fr = !!(game && game.free);
    $('#subClock').hidden = !fr; $('#subEnv').hidden = !fr; $('#subClockWrap').hidden = !(fr && MODE === 'clock'); $('#subEnvWrap').hidden = !(fr && MODE === 'env');
    $$('#subClock button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB));
    $$('#subEnv button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB));
    $('#oDug').textContent = ST.dug + ' / 6';
    $('#bDig').disabled = !!ST.anim || ST.dug >= 6;
    $('#bDig').textContent = ST.dug >= 6 ? '✔ 모두 파냈어요' : ST.anim ? '⛏ 파는 중…' : '⛏ 다음 지층 파기';
    $('#oClock').textContent = CK.placed.filter(Boolean).length + ' / 3';
    $('#bSweep').disabled = !ckDone() || CK.sweeping;
    $('#bSweep').textContent = CK.sweeping ? '⏳ 시계가 돌아가는 중…' : '▶ 지구 시계 돌리기';
    $('#oMatch').textContent = (mBoard ? mBoard.cards.filter((c) => c.zone).length : 0) + ' / 8';
    $('#oTime').textContent = agoText(evAgo());
    $('#bPin1').classList.toggle('done', EV.pin1); $('#bPin2').classList.toggle('done', EV.pin2);
    $('#bPin1').textContent = EV.pin1 ? '✅ 산소 증가 시작 표시함' : '📍 산소가 늘기 시작한 때';
    $('#bPin2').textContent = EV.pin2 ? '✅ 산소 10 % 돌파 표시함' : '📍 산소가 10 %를 넘은 때';
    $('#oOrder').textContent = (oBoard ? oBoard.cards.filter((c) => c.zone).length : 0) + ' / 4';
    $('#oFossil').textContent = (fBoard ? fBoard.cards.filter((c) => c.zone).length : 0) + ' / 3';
    const pd = PR.pred.filter(Boolean).length, c = PRD[PR.sel];
    $('#oPred').textContent = pd + ' / 4';
    $('#prSel').innerHTML = '선택한 카드: <b>' + c.title + '</b>';
    const decided = PR.pred[PR.sel] != null;
    $('#bUp').disabled = decided; $('#bDown').disabled = decided;
    $('#bUp').classList.toggle('on', PR.pred[PR.sel] === 'up'); $('#bDown').classList.toggle('on', PR.pred[PR.sel] === 'down');
    $('#prRes').textContent = decided ? (prDone(PR.sel) ? (prCorrect(PR.sel) ? '✔ 예측이 맞았어요: ' : '✘ 예측과 달랐어요: ') + c.out : '그래프가 그려지는 중…') : '카드를 고르고 예측해요. 카드는 아무 순서로 해도 돼요.';
  }
  $('#bDig').addEventListener('click', () => digLayer(ST.dug));
  $('#bStrataReset').addEventListener('click', () => { Sound.click(); resetStrata(); updateCtl(); });
  $('#bSweep').addEventListener('click', () => { if (!ckDone() || CK.sweeping) return; Sound.click(); CK.sweeping = true; CK.hand = 0; CK.sweep = 0; updateCtl(); });
  $('#bClockReset').addEventListener('click', () => { Sound.click(); resetClock(); updateCtl(); });
  $('#bMatchReset').addEventListener('click', () => { Sound.click(); mBoard.reset(); updateCtl(); });
  $('#bOrderReset').addEventListener('click', () => { Sound.click(); oBoard.reset(); updateCtl(); });
  $('#bFossilReset').addEventListener('click', () => { Sound.click(); fBoard.reset(); updateCtl(); });
  $('#bPredReset').addEventListener('click', () => { Sound.click(); resetPredict(); updateCtl(); });
  $('#bUp').addEventListener('click', () => prPredict('up'));
  $('#bDown').addEventListener('click', () => prPredict('down'));
  $('#bPin1').addEventListener('click', () => { Sound.click(); pinTry(1); updateCtl(); });
  $('#bPin2').addEventListener('click', () => { Sound.click(); pinTry(2); updateCtl(); });
  $('#rTime').addEventListener('input', (e) => { EV.u = +$('#rTime').value / 1000; if (e.isTrusted) EV.touched = true; updateCtl(); });
  $$('#jumpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); EV.touched = true; setAgo(+b.dataset.ago); updateCtl(); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#subClock button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode('clock', b.dataset.sub); }));
  $$('#subEnv button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode('env', b.dataset.sub); }));
  SciSim.bindRange($('#rTime'), null, null, null);

  /* ---------- 포인터 ---------- */
  const chartHit = (p) => { const g = evG(); return p.x >= g.o2.x + g.l - 4 && p.x <= g.o2.x + g.o2.w - g.r + 4 && p.y >= g.o2.y + 20 && p.y <= g.tp.y + g.tp.h + 22; };
  SciSim.pointer(view, {
    down(p) {
      if (MODE === 'strata') {
        const g = stG();
        if (p.x >= g.cx && p.x <= g.cx + g.cw && p.y >= g.cy && p.y <= g.cy + g.lh * 6) { digLayer(Math.floor((p.y - g.cy) / g.lh)); updateCtl(); }
        else for (let i = 0; i < 6; i++) { const s = slotRect(i); if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h && i < ST.dug) { ST.cap = '🔎 ' + LAYERS[i].name + ' — ' + LAYERS[i].note; Sound.tick(); } }
        return false;
      }
      if (MODE === 'clock') {
        if (SUB === 'match') return mBoard.down(p);
        for (let k = 2; k >= 0; k--) { if (CK.placed[k]) continue; const r = tokRect(k); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { CK.drag = { k, x: p.x, y: p.y, ox: p.x - (r.x + r.w / 2), oy: p.y - (r.y + r.h / 2) }; Sound.click(); return true; } }
        return false;
      }
      if (MODE === 'env') {
        if (SUB === 'order') return oBoard.down(p);
        if (SUB === 'fossil') return fBoard.down(p);
        if (chartHit(p)) { EV.dragging = true; EV.touched = true; EV.u = fracOfX(p.x); setU(EV.u); updateCtl(); return true; }
        return false;
      }
      if (MODE === 'predict') { const g = prG(); for (let i = 0; i < 4; i++) { const c = g.cards(i); if (p.x >= c.x && p.x <= c.x + g.cw && p.y >= c.y && p.y <= c.y + g.ch) prSelect(i); } return false; }
      return false;
    },
    move(p) {
      if (MODE === 'clock') { if (SUB === 'match') mBoard.move(p); else if (CK.drag) { CK.drag.x = p.x - CK.drag.ox; CK.drag.y = p.y - CK.drag.oy; CK.drag.px = p.x; CK.drag.py = p.y; } }
      else if (MODE === 'env') { if (SUB === 'order') oBoard.move(p); else if (SUB === 'fossil') fBoard.move(p); else if (EV.dragging) { setU(fracOfX(p.x)); updateCtl(); } }
    },
    up(p) {
      if (MODE === 'clock') {
        if (SUB === 'match') { mBoard.up(p); updateCtl(); }
        else if (CK.drag) { const d = CK.drag; CK.drag = null; clockDrop(d.k, p); updateCtl(); }
      } else if (MODE === 'env') {
        if (SUB === 'order') { oBoard.up(p); updateCtl(); } else if (SUB === 'fossil') { fBoard.up(p); updateCtl(); } else EV.dragging = false;
      }
    },
    hover(p) {
      if (MODE === 'strata') { const g = stG(); return p.x >= g.cx && p.x <= g.cx + g.cw && p.y >= g.cy && p.y <= g.cy + g.lh * 6 ? 'pointer' : 'default'; }
      if (MODE === 'env' && SUB === 'explore') return chartHit(p) ? 'ew-resize' : 'default';
      if (MODE === 'predict') { const g = prG(); for (let i = 0; i < 4; i++) { const c = g.cards(i); if (p.x >= c.x && p.x <= c.x + g.cw && p.y >= c.y && p.y <= c.y + g.ch) return 'pointer'; } }
      const b = MODE === 'clock' && SUB === 'match' ? mBoard : MODE === 'env' && SUB === 'order' ? oBoard : MODE === 'env' && SUB === 'fossil' ? fBoard : null;
      if (b) return b.hit(p) ? 'grab' : 'default';
      if (MODE === 'clock') { for (let k = 0; k < 3; k++) { if (CK.placed[k]) continue; const r = tokRect(k); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'grab'; } }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (MODE === 'strata') setReadouts(['파낸 지층', ST.dug + ' / 6', '가장 최근 화석', ST.dug ? LAYERS[ST.dug - 1].name : '—', '화석이 크게 바뀐 경계', ST.bd > 0.95 ? '3곳' : '찾는 중']);
    else if (MODE === 'clock' && SUB === 'dial') setReadouts(['놓은 경계', CK.placed.filter(Boolean).length + ' / 3', '지구 시계', '46억 년 = 24시간', '시계 1시간', '약 1.9억 년']);
    else if (MODE === 'clock') setReadouts(['놓은 카드', mBoard.cards.filter((c) => c.zone).length + ' / 8', '지질시대', '4개', '구분 기준', '화석(생물)의 변화']);
    else if (MODE === 'env' && SUB === 'explore') { const a = evAgo(); setReadouts(['시기', agoText(a), '대기 중 산소', o2Txt(o2At(a)), '지질시대', ERAS[eraAt(a)].name]); }
    else if (MODE === 'env') { const b = SUB === 'order' ? oBoard : fBoard; setReadouts(['놓은 카드', b.cards.filter((c) => c.zone).length + ' / ' + b.cards.length, '핵심', SUB === 'order' ? '원인 → 결과' : '화석 → 옛 환경', '다음 단계', '생물 변화 예측']); }
    else setReadouts(['예측한 카드', PR.pred.filter(Boolean).length + ' / 4', '예측이 맞은 수', PRD.filter((c, i) => prDone(i) && prCorrect(i)).length + '개', '선택한 환경 변화', PRD[PR.sel].title]);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { resetStrata(); setMode('strata'); }
    else if (li === 1) { resetClock(); buildMatch(); setMode('clock', 'dial'); }
    else if (li === 2) { EV.u = 0; EV.disp = 0; EV.pin1 = false; EV.pin2 = false; EV.touched = false; setU(0); buildOrder(); buildFossil(); setMode('env', 'explore'); }
    else { resetPredict(); setMode('predict'); }
    updateCtl();
  }
  const levels = [
    {
      title: '지층과 화석: 지구 역사의 기록', short: '지층과 화석', icon: '⛏', phase: '관찰',
      features: ['strata'],
      intro: '<p class="si-q">❓ 탐구 질문: 지금의 지구는 처음부터 이런 모습이었을까? 환경이 바뀌면 생물은 어떻게 될까?</p>' +
        '<div class="si-link">🔗 <b>초등학교·중학교에서</b> 지층이 아래에서 위로 쌓이는 것과 화석을 배웠어요(초5~6 \'지층과 화석\', 중2 \'지권의 변화\'). 이번에는 화석의 변화를 따라 <b>지구 환경이 어떻게 달라져 왔는지</b> 거꾸로 추리해 봐요.</div>' +
        '<p>절벽 단면의 지층 6겹을 <b>위에서 아래로</b> 한 층씩 파 내려가며 화석을 모아요. 층마다 어떤 생물의 흔적이 나올까요?</p>',
      setup() { enterLevel(0); },
      recap: '지층은 아래층일수록 오래되었고, 층마다 다른 화석이 나와요. 화석이 크게 바뀌는 경계는 그 무렵 생물이 크게 달라졌음을 뜻해요.',
      summary: '<ul><li>지층은 아래에서 위로 쌓이므로 <b>아래 지층일수록 오래된</b> 지층이에요.</li><li><b>화석</b>은 과거 생물과 그 환경의 단서예요. 층마다 나오는 화석의 종류가 달라요.</li><li>화석의 종류가 <b>크게 바뀌는 경계</b>는 그 무렵 생물이 크게 달라졌다는 뜻이고, 이를 기준으로 지질시대를 나눠요.</li></ul>',
      missions: [
        {
          title: '화석 채집하기', goal: '절벽의 지층을 <b>위에서부터 차례로 4개 이상</b> 파서 화석을 채집하세요. 지층이나 <b>⛏ 다음 지층 파기</b>를 눌러요.',
          hint: '맨 위 지층 1부터 눌러요. 반짝이는 고리가 다음에 팔 곳을 알려 줘요.',
          setup() { ensure('strata'); },
          check: () => ST.dug >= 4, hold: 0.4,
          status: () => mark(ST.dug >= 4) + ' 파낸 지층 ' + ST.dug + ' / 6 (4개 이상)',
          explain: '위에서 아래로 파 내려가면 <b>매머드 → 화폐석 → 공룡 뼈 → 암모나이트 → 삼엽충·필석</b> 순서로 전혀 다른 화석이 나와요. 지층마다 그때 살던 생물이 다르다는 뜻이에요.',
        },
        {
          type: 'quiz', title: '화석이 크게 바뀌는 경계',
          goal: '6개 지층을 모두 파 보니, 화석의 종류가 크게 바뀌는 경계가 <b>3곳</b> 있었어요. 옳은 설명은?',
          setup() { ensure('strata'); digAll(); updateCtl(); },
          choices: ['아래 지층일수록 오래된 지층이고, 경계는 그 무렵 생물의 종류가 크게 달라졌음을 뜻한다', '위 지층일수록 오래된 지층이고, 경계에서는 화석의 크기만 달라진 것이다', '경계 위아래 지층은 같은 시기에 쌓였지만 장소만 달라서 화석이 다르다', '화석은 지층의 나이와 관계없이 아무 층에나 섞여 들어 있다'],
          answer: 0,
          feedback: ['', '지층은 아래에서 위로 쌓이므로 아래층이 더 오래됐어요. 경계에서는 화석의 종류가 바뀌어요.', '같은 장소의 위아래 지층이에요. 아래층이 먼저, 위층이 나중에 쌓였어요.', '화석은 쌓인 시기의 생물이 묻힌 것이라 지층마다 종류가 달라요.'],
          explain: '지층은 아래에서 위로 쌓이니 아래층일수록 <b>오래된</b> 지층이에요. 화석이 크게 바뀌는 경계는 그 무렵 <b>생물이 크게 달라진 때</b>예요. 과학자들은 이 변화를 기준으로 지질시대를 나눠요.',
        },
      ],
    },
    {
      title: '지질시대: 46억 년을 하루로', short: '지질시대', icon: '⏰', phase: '분석',
      features: ['clock'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화석이 크게 바뀌는 경계가 3곳 있다는 것을 알았어요. 이 경계로 나눈 시대가 <b>지질시대</b>예요.</div>' +
        '<p>지구가 생긴 지 약 46억 년! 이 긴 시간을 <b>24시간 시계</b>로 줄이면 경계는 몇 시일까요? 경계 3개를 시계에 놓고, 시대마다 길이와 대표 생물이 어떻게 다른지 비교해 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '지질시대는 선캄브리아시대, 고생대, 중생대, 신생대로 나눠요. 길이는 서로 크게 달라서 선캄브리아시대가 가장 길고, 인류는 아주 최근에 나타났어요.',
      summary: '<ul><li>지질시대: <b>선캄브리아시대</b>(약 46억~5.4억 년 전) · <b>고생대</b>(5.4억~2.5억) · <b>중생대</b>(2.5억~6600만) · <b>신생대</b>(6600만~현재).</li><li>46억 년 = 24시간이면 선캄브리아시대 약 21시간 11분(약 88 %), 고생대 약 1시간 30분, 중생대 약 58분, 신생대 약 21분(약 1.4 %).</li><li>대표 생물: 선캄브리아(세균·시아노박테리아) · 고생대(삼엽충, 필석) · 중생대(공룡, 암모나이트) · 신생대(화폐석, 포유류).</li><li>현생 인류는 하루의 마지막 약 5~6초에 나타났어요. 공룡과 인류는 같은 시대에 살지 않았어요.</li></ul>',
      missions: [
        {
          title: '지구 시계 완성하기', goal: '경계 카드 3개를 시계의 알맞은 시각에 끌어다 놓아 <b>4개 시대</b>를 만든 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '맨 위가 0시이고 3시간마다 숫자가 있어요. 21시 11분은 18시(왼쪽)와 24시(맨 위) 사이, 맨 위에 가까운 곳이에요.',
          manual: true, setup() { ensure('clock', 'dial'); },
          check() { const n = CK.placed.filter(Boolean).length; return n === 3 ? true : '아직 ' + (3 - n) + '개의 경계가 남았어요. 카드를 시계의 알맞은 시각으로 끌어다 놓아요.'; },
          explain: '46억 년 = 24시간이면 <b>1시간 ≈ 1.9억 년</b>이에요. 선캄브리아시대가 21시 11분까지 하루의 대부분을 차지하고, 고생대·중생대·신생대는 마지막 약 3시간 안에 모두 들어가요. 시대의 길이는 서로 달라요.',
        },
        {
          title: '시대별 대표 생물 짝짓기', goal: '대표 생물 카드 8장을 알맞은 <b>지질시대</b> 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시아노박테리아는 가장 오래된 생물이에요. 삼엽충은 고생대, 공룡은 중생대, 매머드는 가장 최근 시대의 생물이에요.',
          manual: true, setup() { ensure('clock', 'match'); },
          check() {
            const bad = mBoard.cards.filter((c) => c.zone !== 'e' + c.era), un = mBoard.cards.filter((c) => !c.zone);
            if (un.length) return '아직 ' + un.length + '장이 남았어요. 모든 카드를 시대 칸에 놓아요.';
            if (bad.length) return '<b>' + bad.slice(0, 3).map((c) => c.label).join(', ') + '</b> 카드는 다른 시대의 생물이에요. 다시 옮겨 봐요.';
            return true;
          },
          explain: '선캄브리아시대에는 <b>시아노박테리아 · 에디아카라 생물</b>, 고생대에는 <b>삼엽충 · 필석</b>, 중생대에는 <b>공룡 · 암모나이트</b>, 신생대에는 <b>화폐석 · 매머드</b>가 대표적이에요. 화석으로 시대를 구분할 수 있는 이유예요.',
        },
        {
          type: 'quiz', title: '지구 시계로 읽기', goal: '지구 시계에서 <b>현생 인류</b>가 나타난 때는 언제쯤일까요?',
          setup() { ensure('clock', 'dial'); },
          choices: ['하루의 맨 마지막 몇 초 (약 5~6초)', '23시 39분 무렵, 신생대가 시작될 때', '중생대 한가운데, 공룡과 함께 살던 때', '21시 11분, 고생대가 시작될 때'],
          answer: 0,
          feedback: ['', '신생대는 약 21분 동안인데, 인류는 그 마지막 아주 짧은 순간에 나타났어요.', '공룡은 중생대 끝(6600만 년 전)에 사라졌고 인류는 약 30만 년 전에 나타났어요. 함께 살지 않았어요.', '고생대가 시작될 때는 바다 생물이 가득했어요. 인류와는 아주 멀어요.'],
          explain: '현생 인류는 약 30만 년 전에 나타났어요. 46억 년을 24시간으로 줄이면 겨우 <b>마지막 약 5~6초</b>예요. 지질시대의 길이는 모두 달라서 <b>가장 긴 시대는 선캄브리아시대</b>(약 88 %)예요.',
        },
      ],
    },
    {
      title: '환경 변화: 산소·기후·대륙', short: '환경 변화', icon: '🌍', phase: '탐구',
      features: ['env'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지질시대마다 대표 생물이 달랐어요. 그렇다면 그때 지구 환경은 어떻게 달라졌을까요?</div>' +
        '<p><b>시간 슬라이더</b>로 46억 년 전부터 현재까지 움직이며 <b>대기의 산소 농도, 기온의 경향, 대륙의 위치</b>가 어떻게 바뀌는지 살펴봐요. 화석으로 옛 환경을 알아내는 방법도 배워요. (자료는 단순화한 모식 자료예요.)</p>',
      setup() { enterLevel(2); },
      recap: '광합성 생물이 산소를 내놓아 대기의 산소가 늘고 오존층이 생겨 생물이 육지로 올라왔어요. 기온과 대륙 배치도 계속 바뀌어 왔어요.',
      summary: '<ul><li>약 27억~25억 년 전부터 <b>광합성 생물(시아노박테리아)</b>이 산소를 내놓았어요. 산소는 바닷속 철 이온과 결합해 산화 철로 가라앉았어요(호상 철광층).</li><li>산소가 늘어 <b>오존층</b>이 만들어지고, 자외선이 줄어 생물이 <b>육지로 진출</b>했어요(고생대 중기 이후).</li><li>산소 농도(대략): 약 25억 년 전 1 % 미만 → 5.4억 년 전 10~15 % → 석탄기 약 30 % → 페름기 말 약 15 % → 현재 21 %.</li><li>고생대 말 대륙이 모여 <b>판게아</b>가 되었다가 중생대에 갈라졌어요. 신생대 후기에는 <b>빙하기와 간빙기</b>가 반복돼요.</li><li>화석으로 환경을 알 수 있어요: 산호 = 따뜻한 얕은 바다, 고사리 = 따뜻하고 습한 육지, 매머드 = 한랭한 환경.</li></ul>',
      missions: [
        {
          title: '산소가 늘어난 때 찾기', goal: '시간 슬라이더(또는 그래프)를 움직여 <b>① 광합성 생물이 산소를 내놓기 시작한 때</b>와 <b>② 산소가 10 %를 넘은 때</b>를 찾아 📍 버튼으로 표시하세요.',
          hint: '① 장면에서 산소(O₂) 방울이 올라오고 바닷속에 붉은 산화 철이 쌓이는 때예요(약 27억~25억 년 전). ② 그래프가 크게 오르는 5.4억 년 전보다 조금 앞이에요.',
          setup() { ensure('env', 'explore'); },
          check: () => EV.pin1 && EV.pin2, hold: 0.4,
          status: () => mark(EV.pin1) + ' 산소 증가 시작 · ' + mark(EV.pin2) + ' 산소 10 % 돌파',
          explain: '약 27억~25억 년 전 <b>시아노박테리아</b>의 광합성으로 산소가 만들어졌지만 처음에는 바닷속 철과 결합해 가라앉았어요. 그 뒤 서서히 늘어 약 6억 년 전 무렵 10 %를 넘었고, 석탄기에는 약 30 %까지 올랐어요.',
        },
        {
          title: '산소 → 오존층 → 육상 진출', goal: '원인과 결과의 순서대로 카드 4장을 <b>1~4번 칸</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산소를 내놓는 생물이 먼저 있어야 산소가 늘고, 산소가 늘어야 오존층이 생기고, 자외선이 막혀야 육지에 살 수 있어요.',
          manual: true, setup() { ensure('env', 'order'); },
          check() {
            const s = orderStatus();
            if (s.placed < 4) return '카드 ' + (4 - s.placed) + '장이 아직 칸 밖에 있어요. 4칸을 모두 채워요.';
            if (s.wrong.length) { const c = s.wrong.sort((a, b) => a.n - b.n)[0]; return (c.n + 1) + '번째에 와야 할 카드가 다른 칸에 있어요. 원인이 되는 일이 먼저 일어나야 해요.'; }
            return true;
          },
          explain: '<b>광합성 생물 등장 → 산소 증가 → 오존층 형성 → 육상 진출</b>. 환경이 바뀌어 새로운 서식지가 열리면 생물의 종류도 크게 달라져요.',
        },
        {
          title: '화석으로 옛 환경 알아내기', goal: '화석 카드 3장을 <b>그 생물이 살던 환경</b> 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산호는 따뜻하고 얕은 바다에서 자라고, 고사리는 따뜻하고 습한 곳을 좋아해요. 털북숭이 매머드는 추위에 적응했어요.',
          manual: true, setup() { ensure('env', 'fossil'); },
          check() {
            const un = fBoard.cards.filter((c) => !c.zone); if (un.length) return '아직 ' + un.length + '장이 남았어요.';
            const bad = fBoard.cards.filter((c) => c.zone !== c.env); if (bad.length) return '<b>' + bad.map((c) => c.label).join(', ') + '</b>' + josa(bad[bad.length - 1].label, '은/는') + ' 다른 환경에서 살던 생물이에요.';
            return true;
          },
          explain: '살던 환경이 한정된 생물의 화석은 그 지층이 쌓일 때의 환경을 알려 줘요(<b>시상 화석</b>의 원리). <b>산호 = 따뜻한 얕은 바다, 고사리 = 따뜻하고 습한 육지, 매머드 = 한랭한 환경</b>이에요.',
        },
      ],
    },
    {
      title: '생물의 변화: 환경이 바뀌면', short: '생물 변화', icon: '🎯', phase: '예측',
      features: ['predict'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소·기온·대륙 배치가 계속 바뀌어 왔고, 생물이 환경 변화에 따라 달라졌다는 것을 봤어요.</div>' +
        '<p>환경 변화 카드 4장을 하나씩 고르고, <b>생물의 종류 수가 늘어날지 줄어들지 먼저 예측</b>한 뒤 단순화한 그래프로 확인해요. 환경 변화 → 서식지·먹이의 변화 → 생물의 종류와 수의 변화가 이어져요.</p>',
      setup() { enterLevel(3); },
      recap: '환경이 바뀌면 서식지와 먹이가 달라지고, 그에 따라 생물의 종류와 수(생물다양성)가 늘거나 줄어요. 이런 변화는 지구 역사 내내 반복되었어요.',
      summary: '<ul><li>환경 변화 → <b>서식지·먹이의 변화</b> → 생물의 <b>종류와 수(생물다양성)</b> 변화.</li><li>서식지가 넓어지고 먹이가 풍부해지면(산소 증가, 온난·습윤) 종류가 늘고, 서식지와 먹이가 줄면(대륙이 모여 얕은 바다 감소, 빙하기) 종류가 줄어요.</li><li>이런 변화는 지구 역사 내내 계속되었고 지금도 진행 중이에요.</li></ul>',
      missions: [
        {
          title: '환경 변화 예측하기', goal: '환경 변화 카드 <b>4장 모두</b>에 대해 생물의 종류 수가 <b>▲ 늘어날지 ▼ 줄어들지</b> 예측하고 그래프를 확인하세요.',
          hint: '그 환경 변화로 서식지와 먹이가 늘어나는지 줄어드는지 생각해 보세요.',
          setup() { ensure('predict'); },
          check: () => PRD.every((c, i) => prDone(i)), hold: 0.5,
          status: () => PRD.map((c, i) => (prDone(i) ? (prCorrect(i) ? '✅' : '❌') : '⬜') + ' ' + c.title).join('<br>'),
          explain: '서식지와 먹이가 <b>늘면 종류가 늘고</b>(산소 증가, 온난·습윤), <b>줄면 종류가 줄어요</b>(대륙이 모임, 빙하기). 틀린 예측이 있어도 괜찮아요. 근거를 따져 보는 것이 추론이에요.',
        },
        {
          type: 'quiz', title: '판게아와 얕은 바다 생물', goal: '고생대 말 대륙이 한데 모여 <b>판게아</b>가 만들어질 무렵, 얕은 바다에 살던 생물이 크게 줄어든 까닭은?',
          setup() { ensure('predict'); },
          choices: ['대륙이 모이면서 얕은 바다(해안선)의 면적이 줄어 서식지가 사라졌기 때문이다', '대륙이 모이면 바닷물이 모두 증발하기 때문이다', '대륙이 모이면서 화석이 만들어지지 않았기 때문이다', '얕은 바다 생물은 원래 수가 매우 적었기 때문이다'],
          answer: 0,
          feedback: ['', '바닷물이 모두 사라지지는 않았어요. 얕은 바다와 해안선이 줄었어요.', '화석이 안 만들어진 것이 아니라 실제로 생물의 종류가 줄었어요.', '고생대 바다에는 얕은 바다 생물이 아주 많았어요.'],
          explain: '대륙이 한데 모이면 <b>얕은 바다와 해안선이 줄어</b> 많은 해양 생물이 서식지를 잃고, 내륙은 건조해져요. 환경 변화 → 서식지 변화 → 생물다양성 변화의 좋은 예예요.',
        },
        {
          type: 'quiz', title: '지금의 환경 변화', goal: '지금 일어나는 기후 변화 같은 환경 변화는 <b>미래의 생물다양성</b>에 영향을 줄까요?',
          setup() { ensure('predict'); },
          choices: ['영향을 줄 수 있다. 환경 변화는 서식지와 먹이를 바꿔 생물의 종류와 수를 바꿔 왔다', '영향을 주지 않는다. 생물은 환경과 관계없이 일정하게 살아간다', '지구 역사에서는 환경이 한 번도 바뀐 적이 없으므로 알 수 없다', '환경이 바뀌면 모든 생물의 종류가 항상 늘어난다'],
          answer: 0,
          feedback: ['', '지질시대 동안 환경이 바뀔 때마다 생물의 종류와 수도 달라졌어요.', '이번 차시에서 산소·기온·대륙 배치가 계속 바뀌어 왔음을 확인했어요.', '환경 변화에 따라 늘어나기도 하고 줄어들기도 했어요.'],
          explain: '지질시대의 기록은 <b>환경이 변하면 서식지·먹이가 변하고 생물다양성도 변한다</b>는 것을 보여 줘요. 오늘날의 기후 변화도 같은 방식으로 미래의 생물다양성에 영향을 줄 수 있어요.',
        },
      ],
    },
  ];

  buildMatch(); buildOrder(); buildFossil(); setU(0);
  game = SciSim.game({
    simId: 'h1-geologic-time', mount: '#game', badge: '지질시대 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { strata: '⛏ 지층 굴착 · 화석 채집', clock: '⏰ 지구 시계 · 대표 생물 카드', env: '🌍 시간 슬라이더 · 산소/기온 그래프 · 대륙', predict: '🎯 환경 변화 카드 · 예측 그래프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false, ctlT = 0;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    ctlT += dt; if (ctlT > 0.25) { ctlT = 0; updateCtl(); }
    if (MODE === 'strata') stepStrata(dt);
    else if (MODE === 'clock') { if (SUB === 'dial') stepClock(dt); else mBoard.update(dt); }
    else if (MODE === 'env') { stepEnv(dt); if (SUB === 'order') oBoard.update(dt); else if (SUB === 'fossil') fBoard.update(dt); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf3fb'; ctx.fillRect(0, 0, VW, VH);
    if (MODE === 'strata') drawStrata(t);
    else if (MODE === 'clock') { if (SUB === 'dial') drawClock(t); else drawMatch(t); }
    else if (MODE === 'env') { if (SUB === 'explore') drawEnv(t); else { if (SUB === 'order') drawOrder(t); else drawFossil(t); } }
    else drawPredict(t);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? VH - 74 : VH - 66);
    if (fade > 0.005) { ctx.fillStyle = 'rgba(234,243,251,' + fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); fade = RM ? 0 : SciSim.approach(fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    get game() { return game; }, get MODE() { return MODE; }, get SUB() { return SUB; }, VW, VH, ST, CK, EV, PR, PRD, LAYERS, ERAS, BDS,
    setMode, enterLevel, updateCtl, digLayer, digAll, clockDrop, hrOf, setAgo, setU, pinTry, prPredict, prSelect, evG, stG, slotRect, layRect, ckG, tokRect, prG,
    get mBoard() { return mBoard; }, get oBoard() { return oBoard; }, get fBoard() { return fBoard; },
    placeCard(board, id, zone) { const b = board; const c = b.cards.find((x) => x.id === id); const z = b.zone(zone); b.place(c, z); updateCtl(); },
    solveClock() { for (let k = 0; k < 3; k++) { const g = ckG(), a = (hrOf(BDS[k].ago) / 24) * TAU; clockDrop(k, { x: g.cx + Math.sin(a) * g.R, y: g.cy - Math.cos(a) * g.R }); } },
    solveMatch() { mBoard.cards.forEach((c) => mBoard.place(c, mBoard.zone('e' + c.era))); updateCtl(); },
    solveOrder() { oBoard.cards.forEach((c) => oBoard.place(c, oBoard.zone('s' + c.n))); updateCtl(); },
    solveFossil() { fBoard.cards.forEach((c) => fBoard.place(c, fBoard.zone(c.env))); updateCtl(); },
  };
})();
