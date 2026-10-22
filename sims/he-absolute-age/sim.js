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
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
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

  /* 흰 판 (그래프·장면 바탕) */
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || 'rgba(255,255,255,.94)'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: o.blur == null ? 6 : o.blur, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 21, o.title, { size: o.tsize || 14.5, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }
  /* '예시 자료' 꼬리표 */
  function dataTag(x, y, txt, align) {
    D.label(x, y, txt || '예시 자료', { bg: '#fff7e0', color: '#a16207', size: 12.5, pad: 7, border: '#f2d38a', align: align || 'right' });
  }
  /* 그래프 틀: R={x,y,w,h} 안쪽 여백으로 그림 상자를 만들고 눈금을 그려요. 반환 {gx, gy, x0, x1, y0, y1} */
  function plotFrame(R, o) {
    const x0 = R.x + (o.l == null ? 46 : o.l), x1 = R.x + R.w - (o.r == null ? 16 : o.r), y0 = R.y + (o.t == null ? 34 : o.t), y1 = R.y + R.h - (o.b == null ? 34 : o.b);
    const fx = o.fx || ((v) => v), fy = o.fy || ((v) => v);
    const ax0 = fx(o.xmin), ax1 = fx(o.xmax), ay0 = fy(o.ymin), ay1 = fy(o.ymax);
    const gx = (v) => x0 + (x1 - x0) * clamp((fx(v) - ax0) / (ax1 - ax0), 0, 1);
    const gy = (v) => (o.yDown ? y0 + (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1) : y1 - (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1));
    if (o.noDraw) return { gx, gy, x0, x1, y0, y1 };
    ctx.save();
    ctx.fillStyle = o.bg || '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e1e8f0';
    (o.xticks || []).forEach((v) => { const xx = gx(v); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); });
    (o.yticks || []).forEach((v) => { const yy = gy(v); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    const ts = o.size || 12.5;
    (o.xticks || []).forEach((v, i) => D.text(gx(v), (o.xTop ? y0 - 7 : y1 + 15 * FS * 0.92), (o.xfmt ? o.xfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b' }));
    (o.yticks || []).forEach((v, i) => D.text(x0 - 6, gy(v) + 4.5, (o.yfmt ? o.yfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b', align: 'right' }));
    if (o.xlabel) D.text((x0 + x1) / 2, R.y + R.h - 4, o.xlabel, { size: 13, weight: 800, color: '#475569' });
    if (o.ylabel) { ctx.save(); ctx.translate(R.x + 12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, o.ylabel, { size: 13, weight: 800, color: '#475569' }); ctx.restore(); }
    return { gx, gy, x0, x1, y0, y1 };
  }
  /* 선 그리기 */
  function polyline(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(v) : v; }
  /* 슬라이더 연결 */
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }

  /* 체크 칸 (✅ 대신 그림으로) */
  function chkBox(x, y, ok, s) {
    s = s || 15; const top = y - s + 3;
    ctx.save(); ctx.fillStyle = ok ? '#16a34a' : '#fff'; ctx.strokeStyle = ok ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2;
    rr(x, top, s, s, 4).fill(); rr(x, top, s, s, 4).stroke();
    if (ok) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x + s * 0.24, top + s * 0.54); ctx.lineTo(x + s * 0.43, top + s * 0.74); ctx.lineTo(x + s * 0.78, top + s * 0.28); ctx.stroke(); }
    ctx.restore();
  }



  /* ======================================================
     지질 그림 도구: 난수, 암석 무늬, 다각형, 순서 정하기 위젯
     ====================================================== */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tx = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const LITH_BASE = {
    gravel: '#b9b1a5', sand: '#ecd08a', mud: '#b59f94', shale: '#8e9aa8', lime: '#e9e5d3', tuff: '#f2f0ea', igneous: '#6d5d78',
    clay: '#c58a6c', conglo: '#cdbb9b', granite: '#e3a9a0', gneiss: '#b9a8b8', silt: '#c9b79c', coal: '#3c3f46',
  };
  const patCache = {};
  /* 암석 무늬(작은 타일을 반복): 물체가 회전·확대돼도 같이 변해요 */
  function lithFill(kind) {
    if (patCache[kind]) return patCache[kind];
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), R = mulberry(kind.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const base = LITH_BASE[kind] || '#ccc';
    g.fillStyle = base; g.fillRect(0, 0, N, N);
    const dots = (n, r0, r1, cols, wrap) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(R() * N, R() * N, r0 + R() * (r1 - r0), 0, TAU); g.fill(); } };
    const lines = (n, col, w, len) => { g.strokeStyle = col; g.lineWidth = w; for (let i = 0; i < n; i++) { const y = (i + 0.5) * (N / n) + (R() - 0.5) * 3, x = R() * N; g.beginPath(); g.moveTo(x - len, y); g.lineTo(x + len, y + (R() - 0.5) * 2); g.stroke(); } };
    const pebble = (x, y, r, col, edge) => { g.fillStyle = col; g.strokeStyle = edge || 'rgba(60,45,30,.55)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y, r, r * (0.7 + R() * 0.25), R() * 3, 0, TAU); g.fill(); g.stroke(); };
    if (kind === 'sand') dots(120, 0.7, 1.5, ['#c9a45c', '#f6e3ad', '#b88e48'], 1);
    else if (kind === 'silt') dots(160, 0.5, 1, ['#a89570', '#e3d3b6'], 1);
    else if (kind === 'mud') { dots(60, 0.5, 1, ['#8e7a70', '#cdb9ad']); lines(7, 'rgba(90,70,60,.25)', 1, 22); }
    else if (kind === 'clay') { dots(40, 0.5, 0.9, ['#a96e52', '#d8a487']); }
    else if (kind === 'shale') lines(16, 'rgba(50,62,78,.40)', 1.2, 30);
    else if (kind === 'lime') { g.strokeStyle = 'rgba(120,110,80,.30)'; g.lineWidth = 1; for (let r = 0; r < 4; r++) { const y = r * 32 + 16; g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); for (let k = 0; k < 3; k++) { const x = ((k * 2 + (r % 2)) * 21 + 6) % N; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } dots(14, 1, 2, ['rgba(150,140,110,.35)']); }
    else if (kind === 'tuff') { dots(90, 0.6, 1.6, ['#d6d3c8', '#fff', '#bdb8a8']); }
    else if (kind === 'gravel' || kind === 'conglo') { const cols = ['#8d8a84', '#a89a86', '#6e6a64', '#b9a58a', '#9b8f86']; for (let i = 0; i < 9; i++) pebble(R() * N, R() * N, 8 + R() * 8, cols[i % cols.length]); dots(70, 0.7, 1.3, ['#8a7e6c']); }
    else if (kind === 'igneous') { dots(46, 1.3, 3, ['#e9dff0', '#2d2735', '#b9a7c6']); g.strokeStyle = 'rgba(30,20,40,.25)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(R() * N, R() * N); g.lineTo(R() * N, R() * N); g.stroke(); } }
    else if (kind === 'granite') { dots(60, 1.2, 3, ['#fff3ee', '#2f2a2d', '#c97f78', '#f0c8c0']); }
    else if (kind === 'gneiss') { for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#e7dce6' : '#4b4350'; const y = i * 13 + R() * 3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(40, y + 5, 80, y - 5, N, y + 2); g.lineTo(N, y + 5); g.bezierCurveTo(80, y, 40, y + 10, 0, y + 6); g.closePath(); g.fill(); } }
    else if (kind === 'coal') { dots(30, 0.6, 1.4, ['#555a63', '#24262b']); }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(0.5));
    patCache[kind] = pat || base;
    return patCache[kind];
  }
  /* 현재 경로를 암석 무늬로 채우기 (경로는 미리 그려 두어요) */
  function fillLith(kind, alpha) { ctx.save(); if (alpha != null) ctx.globalAlpha = alpha; ctx.fillStyle = lithFill(kind); ctx.fill(); ctx.restore(); }
  function lithRect(kind, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); fillLith(kind); }
  /* 둥근 자갈 하나 */
  function pebbleAt(x, y, r, kind, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, TAU);
    ctx.fillStyle = LITH_BASE[kind] || '#999'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = lithFill(kind); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    ctx.strokeStyle = 'rgba(40,30,30,.65)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }

  /* 상단 안내 막대 (장면 안에서 단계 설명) */
  function banner(x, y, w, text, color, size) {
    const h = note(x, y, w, text, size || 14, { bg: color || 'rgba(255,255,255,.95)', border: '#cbd5e1' });
    return h;
  }

  /* ======================================================
     순서 정하기 위젯: 칩을 눌러 위에서부터 차례로 담아요
     ====================================================== */
  function makeSeq(host, items, opt) {
    opt = opt || {};
    const by = {}; items.forEach((it) => { by[it.id] = it; });
    let pool = (opt.order || items.map((i) => i.id)).slice(), ans = [];
    const poolEl = document.createElement('div'), ansEl = document.createElement('ol');
    poolEl.className = 'seq-pool'; ansEl.className = 'seq-ans';
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-sm'; clr.textContent = '↺ 다시 정하기';
    host.append(poolEl, ansEl, clr);
    function render() {
      poolEl.innerHTML = ''; ansEl.innerHTML = '';
      pool.forEach((id) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.id = id; b.innerHTML = by[id].label; b.addEventListener('click', () => { Sound.click(); pool = pool.filter((x) => x !== id); ans.push(id); render(); opt.onChange && opt.onChange(ans.slice()); }); poolEl.appendChild(b); });
      if (!pool.length) { const e = document.createElement('div'); e.className = 'seq-done'; e.textContent = '모두 담았어요'; poolEl.appendChild(e); }
      ans.forEach((id, i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'chip on'; b.dataset.id = id; b.innerHTML = '<b>' + (opt.numbers ? opt.numbers[i] : (i + 1) + '.') + '</b> ' + by[id].label; b.addEventListener('click', () => { Sound.click(); ans = ans.filter((x) => x !== id); pool.push(id); render(); opt.onChange && opt.onChange(ans.slice()); }); li.appendChild(b); ansEl.appendChild(li); });
    }
    clr.addEventListener('click', () => { Sound.click(); pool = (opt.order || items.map((i) => i.id)).slice(); ans = []; render(); opt.onChange && opt.onChange([]); });
    render();
    return { ids: () => ans.slice(), reset() { pool = (opt.order || items.map((i) => i.id)).slice(); ans = []; render(); }, set(a) { ans = a.slice(); pool = (opt.order || items.map((i) => i.id)).filter((x) => !a.includes(x)); render(); } };
  }
  /* 화면 안내: 손가락/마우스 올리기 */
  const cursorOf = (b) => (b ? 'pointer' : 'default');


  /* =========================================================
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 방사성 반감기와 연령
     [12지구02-01] 방사성 동위 원소를 이용한 광물의 절대 연령 자료로 암석의 절대 연령을 구한다
     ① 방사성 붕괴 입자 모형  ② 반감기와 붕괴 곡선  ③ 연령 계산(n × 반감기)  ④ 연대 해석(상대 + 절대 연령)
     반감기의 정수배와 그래프 읽기 수준으로 다루고, 로그·지수 방정식 풀이나 핵반응식은 다루지 않아요.
     ========================================================= */
  initStage('#eef3f9', 800, 560, 600, 840, 1.25);
  const f0 = (x) => String(Math.round(x));
  const gcl = { ink: '#334155', mute: '#64748b', good: '#15803d', bad: '#b91c1c', blue: '#0369a1' };
  const C_P = '#3b82f6', C_D = '#f97316';
  const NATOM = 128, NCOL = 16, NROW = 8;
  const pct = (n) => 100 * Math.pow(0.5, n);                // 모원소 비율 (%)
  const fmtPct = (v) => (Math.round(v * 100) / 100).toString().replace(/\.0+$/, '');
  const ISO = [
    { id: 'c14', sym: '¹⁴C', name: '탄소-14', dau: '¹⁴N', T: 5730, tl: '5730년', use: '유기물, 약 5만 년 이내' },
    { id: 'u235', sym: '²³⁵U', name: '우라늄-235', dau: '²⁰⁷Pb', T: 7.0e8, tl: '7.0억 년', use: '' },
    { id: 'k40', sym: '⁴⁰K', name: '칼륨-40', dau: '⁴⁰Ar', T: 1.25e9, tl: '12.5억 년', use: '' },
    { id: 'u238', sym: '²³⁸U', name: '우라늄-238', dau: '²⁰⁶Pb', T: 4.47e9, tl: '44.7억 년', use: '지르콘 등' },
  ];
  const ISO_BY = {}; ISO.forEach((i) => { ISO_BY[i.id] = i; });

  const S = {
    view: 'decay', clock: 0, fade: 0,
    dec: { t: 0, play: false, temp: 600, press: 1.0, tpOn: false, countOn: true, reveal: false, count: null, moved: { temp: false, press: false }, atoms: null, flash: [], shakeT: 0 },
    cv: { tableOn: true, cursorOn: false, rows: [0, 1, 2, 3].map((n) => ({ n, ok: false, pt: { p: 0 } })), n: 0, marks: { 50: false, 25: false, 12.5: false }, markFx: {} },
    iso: { target: '1e4' },
    age: { sel: 0, rec: [null, null, null, null], fx: [0, 0, 0, 0] },
    pick: { ans: [null, null, null] },
    sect: { young: 0, old: 200, yD: 0, oD: 200 },
  };
  let game = null;

  /* ---------- 원자 128개 : 반감기마다 정확히 절반이 변하도록 (확률적인 순서) ---------- */
  function initAtoms() {
    const R = mulberry(20260501), idx = [];
    for (let i = 0; i < NATOM; i++) idx.push(i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    S.dec.atoms = [];
    for (let k = 1; k <= NATOM; k++) {
      const cell = idx[k - 1];
      // k번째로 붕괴하는 원자: 남은 모원소가 128/2^t 가 되는 시각 (k - 0.5 번째 지점)
      S.dec.atoms[cell] = { tk: Math.log2(NATOM / (NATOM - k + 0.5)), mix: 0, ph: R() * 6.28, col: cell % NCOL, row: Math.floor(cell / NCOL) };
    }
  }
  initAtoms();
  const decayedAt = (t) => S.dec.atoms.filter((a) => a.tk <= t + 1e-9).length;
  const remainAt = (t) => NATOM - decayedAt(t);

  /* =========================================================
     장면 1: 방사성 붕괴 입자 모형
     ========================================================= */
  const DL = PHONE
    ? { cell: 33, fr: { x: 12, y: 116, w: 576, h: 288 }, gx: 36, gy: 128, grain: { x: 98, y: 52 }, bar: { x: 36, y: 436, w: 528 }, plot: { x: 12, y: 496, w: 576, h: 334 }, note: null }
    : { cell: 25, fr: { x: 14, y: 112, w: 428, h: 228 }, gx: 28, gy: 126, grain: { x: 84, y: 54 }, bar: { x: 28, y: 386, w: 400 }, plot: { x: 456, y: 12, w: 332, h: 328 }, note: { x: 456, y: 352, w: 332, h: 196 } };
  function decaySetT(t) { S.dec.t = clamp(Math.round(t * 20) / 20, 0, 4); }
  function drawDecayPlot(R, t, o) {
    o = o || {};
    panel(R.x, R.y, R.w, R.h, { title: '모원소 비율과 시간', border: '#bfdbfe' });
    const P = plotFrame({ x: R.x, y: R.y + 6, w: R.w, h: R.h - 6 }, { l: 50, r: 16, t: 36, b: 40, xmin: 0, xmax: 4, ymin: 0, ymax: 100, xticks: [0, 1, 2, 3, 4], yticks: [0, 25, 50, 75, 100], yfmt: (v) => v + '%', xlabel: '경과 시간 (반감기 수 n)' });
    // 곡선 (이상적인 값)
    const pts = []; for (let n = 0; n <= 4.001; n += 0.05) pts.push([P.gx(n), P.gy(pct(n))]);
    polyline(pts, '#93c5fd', 3);
    [0, 1, 2, 3, 4].forEach((n) => { D.sphere(P.gx(n), P.gy(pct(n)), 5, C_P, { gloss: false }); });
    // 현재 위치
    const cx = P.gx(t), cy = P.gy(pct(t));
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(30,64,175,.55)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, P.y1); ctx.lineTo(cx, cy); ctx.lineTo(P.x0, cy); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 8, '#1d4ed8', { shadow: true });
    if (o.reveal) D.label(Math.min(P.x1 - 30, Math.max(P.x0 + 60, cx + 40)), Math.max(P.y0 + 14, cy - 18), fmtPct((remainAt(t) / NATOM) * 100) + '%', { bg: '#1e3a8a', size: 13, pad: 7 });
  }
  function drawDecay(t, dt) {
    const Dc = S.dec, fr = DL.fr, cell = DL.cell;
    // 광물 알갱이 + 돋보기
    const g = DL.grain;
    ctx.save(); ctx.translate(g.x, g.y); ctx.beginPath(); [[-34, -6], [-18, -28], [14, -30], [34, -4], [20, 24], [-16, 26]].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    const gg = ctx.createLinearGradient(-30, -30, 30, 30); gg.addColorStop(0, '#f1d6e4'); gg.addColorStop(1, '#b57a9a'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#6b3a55'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    D.text(g.x, g.y + 48, '광물 알갱이', { size: 13, weight: 800, color: gcl.ink });
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(g.x + 30, g.y - 24); ctx.lineTo(fr.x + 12, fr.y); ctx.moveTo(g.x + 30, g.y + 22); ctx.lineTo(fr.x + 12, fr.y + fr.h * 0.9); ctx.stroke(); ctx.restore();
    D.label(fr.x + fr.w - 16, fr.y - 4, '🔍 입자 모형으로 보기', { bg: '#475569', size: 13, pad: 9, align: 'right' });
    // 결정 틀 (온도 → 붉은 기운, 압력 → 누르는 화살표)
    const heat = clamp((Dc.temp - 200) / 1000, 0, 1);
    D.shadow(() => { ctx.fillStyle = '#f8fafc'; rr(fr.x, fr.y, fr.w, fr.h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.save(); rr(fr.x, fr.y, fr.w, fr.h, 16).clip(); ctx.fillStyle = 'rgba(249,115,22,' + (heat * 0.25) + ')'; ctx.fillRect(fr.x, fr.y, fr.w, fr.h); ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.2; rr(fr.x, fr.y, fr.w, fr.h, 16).stroke();
    const al = 8 + (Dc.press - 0.2) * 12;
    [[fr.x + fr.w / 2, fr.y - 2, 0, 1], [fr.x + fr.w / 2, fr.y + fr.h + 2, 0, -1], [fr.x - 2, fr.y + fr.h / 2, 1, 0], [fr.x + fr.w + 2, fr.y + fr.h / 2, -1, 0]].forEach(([x, y, ux, uy]) => {
      if (Dc.tpOn || game && game.free) D.arrow(x - ux * al, y - uy * al, x, y, { color: '#7c3aed', width: 3, head: 9, alpha: 0.8 });
    });
    // 원자
    const jit = 0.4 + heat * 1.8;
    Dc.atoms.forEach((a, i) => {
      const dec = a.tk <= Dc.t + 1e-9;
      const tgt = dec ? 1 : 0;
      if (Math.abs(a.mix - tgt) > 0.001) { const was = a.mix; a.mix = approach(a.mix, tgt, dt, 10); if (tgt === 1 && was < 0.2 && !RM && Math.random() < 0.9) parts.burst(DL.gx + (a.col + 0.5) * cell, DL.gy + (a.row + 0.5) * cell, { count: 4, speed: 50, size: 2, colors: [C_D, '#fde68a'], life: 0.35, gravity: 0 }); }
      const x = DL.gx + (a.col + 0.5) * cell + Math.sin(t * 5 + a.ph) * jit, y = DL.gy + (a.row + 0.5) * cell + Math.cos(t * 4.3 + a.ph * 1.7) * jit;
      D.sphere(x, y, cell * 0.38, mixc(C_P, C_D, a.mix), { shadow: false });
    });
    // 개수 (읽기 값을 숨겨요: 세어 보기)
    const nd = decayedAt(Dc.t), np = NATOM - nd, show = Dc.reveal || (game && game.free);
    const b = DL.bar;
    tx(b.x, b.y - 8, '모원소(파랑) → 자원소(주황)', 13.5, gcl.mute, 'left', 800);
    ctx.save(); rr(b.x, b.y, b.w, 30, 10).clip(); if (show) { ctx.fillStyle = C_P; ctx.fillRect(b.x, b.y, b.w, 30); ctx.fillStyle = C_D; ctx.fillRect(b.x + b.w * (np / NATOM), b.y, b.w * (nd / NATOM), 30); } else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(b.x, b.y, b.w, 30); } ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(b.x, b.y, b.w, 30, 10).stroke();
    if (show) {
      tx(b.x + 10, b.y + 21, '모원소 ' + np + '개 (' + fmtPct((np / NATOM) * 100) + '%)', 14, '#fff', 'left', 800);
      if (nd > 0) tx(b.x + b.w - 10, b.y + 21, '자원소 ' + nd + '개', 14, '#fff', 'right', 800);
      const ratio = nd === 0 ? '모원소 : 자원소 = 1 : 0' : '모원소 : 자원소 = ' + (np ? '1 : ' + fmtPct(nd / np) : '0 : ' + nd);
      tx(b.x, b.y + 56, ratio, 14.5, gcl.ink, 'left', 800);
    } else tx(b.x + b.w / 2, b.y + 21, '파란 원자를 세어 보세요', 14, '#fff', 'center', 800);
    // 그래프
    drawDecayPlot(DL.plot, Dc.t, { reveal: show });
    if (!PHONE) {
      const N = DL.note; panel(N.x, N.y, N.w, N.h, { title: '붕괴 모형', border: '#bfdbfe' });
      const k = Math.floor(Dc.t + 1e-9);
      const msgs = [
        '원자 하나가 언제 붕괴할지는 알 수 없어요. 하지만 많은 원자 전체로 보면 일정한 비율로 줄어요.',
        '반감기가 지나는 동안 모원소 절반이 자원소로 변해요.',
        '반감기가 한 번 더 지나면 남은 모원소의 절반이 또 변해요. 전부 사라지지 않아요.',
      ];
      note(N.x + 10, N.y + 36, N.w - 20, msgs[k <= 0 ? 0 : k === 1 ? 1 : 2], 13.5, { bg: '#eff6ff', border: '#bfdbfe' });
      if (Dc.tpOn || (game && game.free)) note(N.x + 10, N.y + 110, N.w - 20, '온도 ' + Dc.temp + ' °C · 압력 ' + f1(Dc.press) + ' GPa: 원자는 더 흔들리거나 눌려도 붕괴하는 비율은 그대로예요.', 13, { bg: '#fffbeb', border: '#fde68a' });
    }
  }

  /* =========================================================
     장면 2: 붕괴 곡선 (표 채우고 점 찍기, 곡선 읽기)
     ========================================================= */
  const CV = PHONE ? { x: 12, y: 12, w: 576, h: 520 } : { x: 12, y: 10, w: 520, h: 540 };
  const CVI = PHONE ? { x: 12, y: 544, w: 576, h: 284 } : { x: 544, y: 10, w: 244, h: 540 };
  const rowsDone = () => S.cv.rows.every((r) => r.ok);
  function drawCurve(t, dt) {
    const V = S.cv;
    panel(CV.x, CV.y, CV.w, CV.h, { title: '모원소 비율 (%) — 반감기 수 n', border: '#bfdbfe' });
    const P = plotFrame({ x: CV.x, y: CV.y + 6, w: CV.w, h: CV.h - 6 }, { l: 58, r: 22, t: 40, b: 46, xmin: 0, xmax: 4, ymin: 0, ymax: 100, xticks: [0, 1, 2, 3, 4], yticks: [0, 12.5, 25, 50, 75, 100], yfmt: (v) => v + '%', xlabel: '경과 시간 (반감기가 지난 횟수 n)', size: 13 });
    const full = rowsDone() || V.cursorOn || (game && game.free);
    // 완성된 점들과 곡선
    const done = V.rows.filter((r) => r.ok);
    if (full) { const pts = []; for (let n = 0; n <= 4.001; n += 0.05) pts.push([P.gx(n), P.gy(pct(n))]); polyline(pts, '#3b82f6', 3.5); }
    else {
      const ds = done.map((r) => r.n).sort((a, b) => a - b);
      for (let i = 0; i + 1 < ds.length; i++) if (ds[i + 1] === ds[i] + 1) { const pts = []; for (let n = ds[i]; n <= ds[i + 1] + 1e-6; n += 0.05) pts.push([P.gx(n), P.gy(pct(n))]); polyline(pts, '#3b82f6', 3.5); }
    }
    V.rows.forEach((r, i) => {
      if (!r.ok && r.pt.p <= 0) return;
      const tx2 = P.gx(r.n), ty2 = P.gy(pct(r.n)), p = r.pt.p, sx = CV.x + CV.w - 30, sy = CV.y + 20;
      const k = SciSim.ease.outBack(clamp(p, 0, 1)), x = sx + (tx2 - sx) * k, y = sy + (ty2 - sy) * k;
      D.sphere(x, y, 8, C_P, { shadow: true });
      if (p >= 1) { D.label(x + 12, y - 16, 'n=' + r.n + ' · ' + fmtPct(pct(r.n)) + '%', { bg: '#1e3a8a', size: 12.5, pad: 6, align: 'left' }); }
    });
    // 기준선 (50, 25, 12.5)
    if (full) {
      [50, 25, 12.5].forEach((v) => { ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(P.x0, P.gy(v)); ctx.lineTo(P.x1, P.gy(v)); ctx.stroke(); ctx.restore(); });
    }
    // 읽는 점
    if (V.cursorOn || (game && game.free && full)) {
      const n = V.n, cx = P.gx(n), cy = P.gy(pct(n));
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, P.y1); ctx.lineTo(cx, cy); ctx.lineTo(P.x0, cy); ctx.stroke(); ctx.restore();
      D.sphere(cx, cy, 9, '#e11d48', { shadow: true });
      D.label(clamp(cx + 52, P.x0 + 50, P.x1 - 40), clamp(cy - 22, P.y0 + 12, P.y1 - 8), 'n = ' + fmtPct(n) + ' · ' + f1(pct(n)) + '%', { bg: '#9f1239', size: 13, pad: 8 });
    }
    // 찍은 지점
    [50, 25, 12.5].forEach((v) => {
      if (!V.marks[v]) return;
      const n = Math.log2(100 / v), x = P.gx(n), y = P.gy(v);
      D.check(x, y, 11, 1);
      D.label(x + 16, y + 20, v + '%', { bg: '#15803d', size: 12.5, pad: 6, align: 'left' });
    });
    // 안내 판
    panel(CVI.x, CVI.y, CVI.w, CVI.h, { title: '곡선을 읽는 규칙', border: '#bfdbfe' });
    const info = [['반감기 1번', '모원소가 처음의 1/2'], ['반감기 2번', '처음의 1/2의 1/2 = 1/4'], ['반감기 3번', '처음의 1/8'], ['모원소가 줄면', '그만큼 자원소가 늘어요']];
    info.forEach((it, i) => { const y = CVI.y + 44 + i * (PHONE ? 52 : 66); D.label(CVI.x + 12, y + 8, it[0], { bg: '#1d4ed8', size: 13, pad: 8, align: 'left' }); if (PHONE) tx(CVI.x + 150, y + 13, it[1], 14, gcl.ink, 'left', 700); else tx(CVI.x + 12, y + 40, it[1], 13.5, gcl.ink, 'left', 700); });
    if (!PHONE) note(CVI.x + 10, CVI.y + CVI.h - 112, CVI.w - 20, '붕괴 속도는 온도·압력과 관계없이 일정해서 곡선 모양이 늘 같아요.', 13, { bg: '#fffbeb', border: '#fde68a' });
  }

  /* =========================================================
     장면 3: 동위 원소별 반감기 (로그 눈금)
     ========================================================= */
  const IR = PHONE ? { x: 12, y: 12, w: 576, h: 816 } : { x: 12, y: 10, w: 776, h: 540 };
  const LOGT = [3, 4, 5, 6, 7, 8, 9, 10], LOGLAB = ['1천', '1만', '10만', '100만', '1000만', '1억', '10억', '100억'];
  function isoRes(targetYr, iso) {
    const n = targetYr / iso.T, f = n >= 100 ? 0 : pct(n);
    const nTxt = n < 0.01 ? 'n ≈ 0' : n >= 100 ? 'n ≈ ' + comma(n) : 'n ≈ ' + (n >= 10 ? f0(n) : String(Math.round(n * 100) / 100));
    const fTxt = n >= 100 ? '거의 0 %' : n < 0.01 ? '거의 100 %' : (f >= 10 ? f1(f) : String(Math.round(f * 100) / 100)) + ' %';
    const verdict = n < 0.05 ? '거의 줄지 않아요' : n > 10 ? '거의 남지 않아요' : '측정하기 알맞아요';
    return { n, f, nTxt, fTxt, verdict, ok: n >= 0.05 && n <= 10 };
  }
  function drawIso(t) {
    const tgt = +S.iso.target;
    panel(IR.x, IR.y, IR.w, IR.h, { title: '동위 원소의 반감기 (가로 눈금은 10배씩 늘어나요)', border: '#bfdbfe' });
    const ax = IR.x + (PHONE ? 20 : 190), aw = IR.w - (PHONE ? 60 : 190 + 250), topY = IR.y + 62;
    const rowH = PHONE ? 134 : 78, axY = topY + rowH * 4 + 8;
    const gx = (lg) => ax + (aw * (lg - 3)) / 7;
    LOGT.forEach((lg, i) => {
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx(lg), topY - 6); ctx.lineTo(gx(lg), axY); ctx.stroke();
      if (!PHONE || i % 2 === 1 || i === 0) D.text(gx(lg), axY + 18, LOGLAB[i], { size: PHONE ? 11.5 : 12, weight: 700, color: gcl.mute });
    });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, axY); ctx.lineTo(ax + aw, axY); ctx.stroke(); D.text(ax - 8, axY + 18, '(년)', { size: 12, weight: 700, color: gcl.mute, align: 'right' });
    // 선택한 나이 표시선
    const tl = Math.log10(tgt), tlab = tgt >= 1e8 ? tgt / 1e8 + '억 년' : tgt / 1e4 + '만 년';
    ctx.save(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(gx(tl), topY - 10); ctx.lineTo(gx(tl), axY); ctx.stroke(); ctx.restore();
    D.label(gx(tl), topY - 22, '측정할 나이 ' + tlab, { bg: '#be123c', size: 13, pad: 8 });
    ISO.forEach((iso, i) => {
      const y = topY + i * rowH, lgT = Math.log10(iso.T), r = isoRes(tgt, iso);
      const by = PHONE ? y + 40 : y + 14, bh = 26;
      if (PHONE) { tx(IR.x + 20, y + 28, iso.sym + ' ' + iso.name + ' → ' + iso.dau, 14.5, gcl.ink, 'left', 800); } else { tx(IR.x + 16, y + 28, iso.sym + ' ' + iso.name, 15, gcl.ink, 'left', 800); tx(IR.x + 16, y + 48, '→ ' + iso.dau + ' · 반감기 ' + iso.tl, 12.5, gcl.mute, 'left', 700); }
      ctx.save(); rr(ax, by, gx(lgT) - ax, bh, 8); ctx.fillStyle = r.ok ? '#3b82f6' : '#94a3b8'; ctx.fill(); ctx.restore();
      if (gx(lgT) - ax > 150) D.label(gx(lgT), by + bh / 2, '반감기 ' + iso.tl, { bg: '#1e293b', size: 12.5, pad: 7, align: 'right' }); else D.label(gx(lgT) + 6, by + bh / 2, '반감기 ' + iso.tl, { bg: '#1e293b', size: 12.5, pad: 7, align: 'left' });
      // 결과
      const rx = PHONE ? IR.x + 20 : ax + aw + 14, ry = PHONE ? by + bh + 24 : y + 20;
      tx(rx, ry, r.nTxt + ' · 남은 모원소 ' + r.fTxt, PHONE ? 13.5 : 13, gcl.ink, 'left', 800);
      D.label(rx, ry + (PHONE ? 26 : 22), r.verdict, { bg: r.ok ? '#15803d' : '#b45309', size: 12.5, pad: 7, align: 'left' });
    });
    note(IR.x + 12, IR.y + IR.h - (PHONE ? 74 : 64), IR.w - 24, '측정하려는 나이와 반감기가 비슷해야 해요. 반감기가 너무 짧으면 모원소가 거의 남지 않고, 너무 길면 거의 줄지 않아 측정하기 어려워요. (¹⁴C: 유기물, 약 5만 년 이내)', 13, { bg: '#fffbeb', border: '#fde68a' });
  }


  /* =========================================================
     장면 4: 시료의 연령 계산
     ========================================================= */
  const SMP = [
    { iso: 'c14', name: '유적에서 나온 목탄', kind: 'coal', parent: 25, n: 2, unit: '년', ans: 11460, give: '모원소 25 %' },
    { iso: 'c14', name: '유적에서 나온 뼈', kind: 'bone', parent: 12.5, n: 3, unit: '년', ans: 17190, give: '모원소 12.5 %' },
    { iso: 'k40', name: '화강암 속 운모', kind: 'mica', ratio: [1, 3], n: 2, unit: '억 년', ans: 25, give: '모원소 : 자원소 = 1 : 3' },
    { iso: 'k40', name: '오래된 편마암', kind: 'gneiss', parent: 12.5, n: 3, unit: '억 년', ans: 37.5, give: '모원소 12.5 %' },
  ];
  SMP.forEach((s) => { s.pp = s.ratio ? (100 * s.ratio[0]) / (s.ratio[0] + s.ratio[1]) : s.parent; s.Tv = s.unit === '년' ? ISO_BY[s.iso].T : ISO_BY[s.iso].T / 1e8; });
  const smpAge = (s) => s.n * s.Tv;
  const fmtAge = (s, v) => (s.unit === '년' ? comma(v) : String(Math.round(v * 10) / 10)) + s.unit;
  const AG = PHONE ? { x: 12, y: 12, w: 576, h: 520 } : { x: 12, y: 10, w: 480, h: 540 };
  const AGI = PHONE ? { x: 12, y: 544, w: 576, h: 284 } : { x: 504, y: 10, w: 284, h: 540 };
  function drawSample(kind, x, y, w, h) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2);
    if (kind === 'coal') {
      [[-46, 4, 34, 0.3], [4, -10, 40, -0.4], [48, 8, 28, 0.9]].forEach(([dx, dy, r, rot]) => { ctx.save(); ctx.translate(dx, dy); ctx.rotate(rot); polyPath([[-r, -r * 0.4], [-r * 0.2, -r * 0.7], [r, -r * 0.3], [r * 0.8, r * 0.5], [-r * 0.4, r * 0.6]]); ctx.fillStyle = LITH_BASE.coal; ctx.fill(); fillLith('coal'); ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); });
    } else if (kind === 'bone') {
      ctx.rotate(-0.35); ctx.fillStyle = '#f3ead7'; ctx.strokeStyle = '#8a7a58'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(-52, -9, 104, 18); ctx.fill(); ctx.stroke();
      [[-54, -14], [-54, 14], [54, -14], [54, 14]].forEach(([bx, by]) => { ctx.beginPath(); ctx.arc(bx, by, 14, 0, TAU); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#f3ead7'; ctx.fillRect(-52, -8, 104, 16);
    } else if (kind === 'mica') {
      ctx.beginPath(); ctx.ellipse(0, 0, 78, 46, 0.1, 0, TAU); ctx.fillStyle = LITH_BASE.granite; ctx.fill(); fillLith('granite'); ctx.strokeStyle = '#6b2f2f'; ctx.lineWidth = 2.5; ctx.stroke();
      [[-30, -8], [10, 12], [34, -14], [-6, -24]].forEach(([mx, my], k) => { ctx.save(); ctx.translate(mx, my); ctx.rotate(k); polyPath([[-11, 0], [-5, -10], [6, -10], [11, 0], [5, 10], [-6, 10]]); ctx.fillStyle = '#7c5a2a'; ctx.fill(); ctx.strokeStyle = '#3b2a10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); });
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, 78, 46, -0.1, 0, TAU); ctx.fillStyle = LITH_BASE.gneiss; ctx.fill(); fillLith('gneiss'); ctx.strokeStyle = '#4b3a54'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  }
  function drawAge(t, dt) {
    const A = S.age, s = SMP[A.sel], iso = ISO_BY[s.iso], rec = A.rec[A.sel], fx = A.fx[A.sel];
    panel(AG.x, AG.y, AG.w, AG.h, { title: '시료 ' + ['①', '②', '③', '④'][A.sel] + ' · ' + s.name, border: '#bfdbfe' });
    // 그림
    ctx.save(); rr(AG.x + 14, AG.y + 44, AG.w - 28, 120, 14).clip(); ctx.fillStyle = '#e8eef6'; ctx.fillRect(AG.x, AG.y, AG.w, AG.h); drawSample(s.kind, AG.x + 14, AG.y + 44, AG.w - 28, 120); ctx.restore();
    // 모원소 / 자원소 막대
    const bx = AG.x + 22, bw = AG.w - 44, by = AG.y + 214;
    tx(bx, by - 10, '측정한 값: ' + s.give + ' (' + iso.sym + ' → ' + iso.dau + ')', 14.5, gcl.ink, 'left', 800);
    ctx.save(); rr(bx, by, bw, 36, 10).clip(); ctx.fillStyle = C_P; ctx.fillRect(bx, by, bw, 36); ctx.fillStyle = C_D; ctx.fillRect(bx + bw * (s.pp / 100), by, bw * (1 - s.pp / 100), 36); ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(bx, by, bw, 36, 10).stroke();
    tx(bx + 10, by + 25, '모원소 ' + fmtPct(s.pp) + '%', 14, '#fff', 'left', 800); tx(bx + bw - 10, by + 25, '자원소 ' + fmtPct(100 - s.pp) + '%', 14, '#fff', 'right', 800);
    // 반감기 자
    const ry = by + 100, rw = bw, seg = rw / 3, shown = rec ? rec.n : 0;
    tx(bx, ry - 18, '반감기 자 (한 칸 = 반감기 ' + (s.unit === '년' ? comma(iso.T) + '년' : s.Tv + '억 년') + ')', 14, gcl.mute, 'left', 800);
    for (let i = 0; i < 3; i++) {
      const on = i < shown, p = on ? clamp(fx * 3 - i, 0, 1) : 0;
      ctx.fillStyle = '#e2e8f0'; rr(bx + i * seg + 2, ry, seg - 4, 34, 8).fill();
      if (p > 0) { ctx.fillStyle = '#16a34a'; rr(bx + i * seg + 2, ry, (seg - 4) * p, 34, 8).fill(); }
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; rr(bx + i * seg + 2, ry, seg - 4, 34, 8).stroke();
      D.text(bx + i * seg + seg / 2, ry + 23, (i + 1) + '번째', { size: 13, weight: 800, color: on && p > 0.5 ? '#fff' : '#64748b' });
    }
    A.fx[A.sel] = rec ? approach(fx, 1, dt, 1.6) : 0;
    const f = rec ? s.n + ' × ' + (s.unit === '년' ? comma(iso.T) + '년' : s.Tv + '억 년') + ' = ' + fmtAge(s, s.ans) : '연령 = n × 반감기 = ?';
    D.label(bx + rw / 2, ry + 74, f, { bg: rec ? '#15803d' : '#475569', size: 15, pad: 12 });
    // 전체 진행
    const nOk = A.rec.filter((r) => r).length;
    tx(bx, AG.y + AG.h - 14, '기록한 시료 ' + nOk + ' / 4', 13.5, gcl.mute, 'left', 800);
    // 오른쪽 정보
    panel(AGI.x, AGI.y, AGI.w, AGI.h, { title: '동위 원소 정보', border: '#bfdbfe' });
    D.label(AGI.x + 14, AGI.y + 56, iso.sym + ' → ' + iso.dau, { bg: '#1d4ed8', size: 16, pad: 11, align: 'left' });
    tx(AGI.x + 14, AGI.y + 98, '반감기 ' + iso.tl, 17, gcl.ink, 'left', 800);
    if (iso.use) tx(AGI.x + 14, AGI.y + 124, iso.use, 13.5, gcl.mute, 'left', 700);
    const steps = ['① 모원소가 처음의 몇 분의 1인지 읽어요', '② 반감기가 지난 횟수 n을 구해요 (1/2을 n번 곱하면?)', '③ 연령 = n × 반감기'];
    steps.forEach((st, i) => { note(AGI.x + 10, AGI.y + 150 + i * (PHONE ? 38 : 60), AGI.w - 20, st, 13, { bg: '#f0f9ff', border: '#bfdbfe' }); });
    if (!PHONE) {
      const tb2 = [['n', '모원소', '모 : 자'], ['1', '1/2', '1 : 1'], ['2', '1/4', '1 : 3'], ['3', '1/8', '1 : 7']];
      tx(AGI.x + 14, AGI.y + 346, '참고표', 13, gcl.mute, 'left', 800);
      tb2.forEach((r, i) => r.forEach((c, k) => tx(AGI.x + 40 + k * 100, AGI.y + 376 + i * 28, c, 13.5, i ? gcl.ink : gcl.mute, 'center', 800)));
    }
  }

  /* =========================================================
     장면 5: 알맞은 동위 원소 고르기
     ========================================================= */
  const PICKS = [
    { name: '동굴 유적의 목탄', age: 1e4, label: '약 1만 년 전', ans: 'c14', icon: '🔥' },
    { name: '매우 오래된 지르콘 광물', age: 4e9, label: '약 40억 년 전', ans: 'u238', icon: '💎' },
    { name: '화성암 속 광물', age: 6.5e8, label: '약 6.5억 년 전', ans: 'u235', icon: '🪨' },
  ];
  const pickFb = (i, id) => {
    const p = PICKS[i], iso = ISO_BY[id], n = p.age / iso.T;
    return iso.sym + ': n ≈ ' + (n < 0.01 ? '0' : n >= 100 ? comma(n) : String(Math.round(n * 100) / 100));
  };
  function drawPick(t) {
    const Pk = S.pick;
    panel(12, 10, VW - 24, PHONE ? 132 : 112, { title: '동위 원소의 반감기', border: '#bfdbfe' });
    ISO.forEach((iso, i) => {
      const cw = (VW - 24 - 20) / 4, x = 22 + i * cw;
      D.label(x + cw / 2, PHONE ? 62 : 58, iso.sym, { bg: '#1d4ed8', size: 15, pad: 12 });
      tx(x + cw / 2, PHONE ? 100 : 94, iso.tl, 14, gcl.ink, 'center', 800);
      if (PHONE) tx(x + cw / 2, 122, iso.use ? iso.use.slice(0, 8) : '', 11, gcl.mute, 'center', 700);
      else tx(x + cw / 2, 112 - 2, iso.use, 12, gcl.mute, 'center', 700);
    });
    const top = PHONE ? 154 : 134, ch = PHONE ? 200 : 404, cw = PHONE ? VW - 24 : (VW - 24 - 16) / 3;
    PICKS.forEach((p, i) => {
      const x = PHONE ? 12 : 12 + i * (cw + 8), y = PHONE ? top + i * (ch + 10) : top, ans = Pk.ans[i], ok = ans === p.ans;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, cw, ch, 14).fill(); }, { blur: 5, y: 3 });
      ctx.strokeStyle = ans ? (ok ? '#16a34a' : '#e2464b') : '#cbd5e1'; ctx.lineWidth = ans ? 3.5 : 2; rr(x, y, cw, ch, 14).stroke();
      tx(x + 14, y + 28, '문항 ' + (i + 1), 14, gcl.mute, 'left', 800);
      D.text(x + (PHONE ? 54 : cw / 2), y + (PHONE ? 96 : 100), p.icon, { size: PHONE ? 48 : 60 });
      const tx0 = PHONE ? x + 100 : x + cw / 2, al = PHONE ? 'left' : 'center';
      tx(tx0, y + (PHONE ? 70 : 170), p.name, 16, gcl.ink, al, 800);
      tx(tx0, y + (PHONE ? 100 : 198), '측정할 나이: ' + p.label, 14.5, '#be123c', al, 800);
      if (ans) {
        tx(tx0, y + (PHONE ? 128 : 232), '고른 원소 ' + ISO_BY[ans].sym + ' (' + ISO_BY[ans].tl + ')', 14, gcl.ink, al, 800);
        tx(tx0, y + (PHONE ? 152 : 258), pickFb(i, ans), 14, gcl.mute, al, 800);
        D.label(tx0, y + (PHONE ? 180 : 292), ok ? '✓ 반감기가 가장 비슷해요' : '더 알맞은 원소가 있어요', { bg: ok ? '#15803d' : '#b91c1c', size: 13, pad: 9, align: PHONE ? 'left' : 'center' });
      } else tx(tx0, y + (PHONE ? 140 : 250), '(오른쪽에서 원소를 골라요)'.replace('오른쪽', PHONE ? '아래' : '오른쪽'), 13.5, '#94a3b8', al, 700);
    });
  }

  /* =========================================================
     장면 6: 연대 해석 (관입암 D 150 Ma, 용암 L 120 Ma, 지층 E)
     ========================================================= */
  const SB = PHONE ? { x: 24, y: 14, w: 552, h: 360 } : { x: 24, y: 14, w: 450, h: 470 };
  const SY = { lava: [0, 0.1], lime: [0.34, 0.56], sand: [0.56, 0.78], shale: [0.78, 1] };
  const sbU = (x) => SB.y + SB.h * 0.3 + 4 * Math.sin((x - SB.x) / 31) + 3 * Math.sin((x - SB.x) / 12 + 1);
  const sbDx = SB.x + SB.w * 0.58, sbDw = SB.w * 0.075;
  function drawSect(t, dt) {
    const Sc = S.sect;
    Sc.yD = approach(Sc.yD, Sc.young, dt, 8); Sc.oD = approach(Sc.oD, Sc.old, dt, 8);
    ctx.save(); ctx.beginPath(); ctx.rect(SB.x, SB.y, SB.w, SB.h); ctx.clip();
    const band = (k, kd) => { const y1 = SB.y + SB.h * SY[k][0], y2 = SB.y + SB.h * SY[k][1]; ctx.beginPath(); ctx.rect(SB.x, y1, SB.w, y2 - y1); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd); ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); };
    // E (역암) : 부정합면 위 ~ 용암 아래
    ctx.beginPath(); ctx.moveTo(SB.x, SB.y + SB.h * 0.1); ctx.lineTo(SB.x + SB.w, SB.y + SB.h * 0.1); for (let x = SB.x + SB.w; x >= SB.x; x -= 4) ctx.lineTo(x, sbU(x)); ctx.closePath(); ctx.fillStyle = LITH_BASE.conglo; ctx.fill(); fillLith('conglo');
    ctx.save(); ctx.beginPath(); ctx.moveTo(SB.x, sbU(SB.x)); for (let x = SB.x; x <= SB.x + SB.w; x += 4) ctx.lineTo(x, sbU(x)); ctx.lineTo(SB.x + SB.w, SB.y + SB.h); ctx.lineTo(SB.x, SB.y + SB.h); ctx.closePath(); ctx.clip();
    band('lime', 'lime'); band('sand', 'sand'); band('shale', 'shale');
    // 틈 사이 (U 와 석회암 위 경계 사이 빈 곳은 석회암)
    ctx.beginPath(); ctx.rect(SB.x, SB.y + SB.h * 0.2, SB.w, SB.h * 0.14 + 1); ctx.fillStyle = LITH_BASE.lime; ctx.fill(); fillLith('lime');
    const dk = [[sbDx - sbDw / 2, SB.y + SB.h + 4], [sbDx + sbDw / 2, SB.y + SB.h + 4], [sbDx + sbDw / 2, SB.y + 10], [sbDx - sbDw / 2, SB.y + 10]];
    polyPath(dk); ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(40,30,30,.28)'; ctx.stroke();
    polyPath(dk); ctx.fillStyle = LITH_BASE.igneous; ctx.fill(); fillLith('igneous'); ctx.strokeStyle = '#2b1b36'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // E 속 D 자갈
    [[-24, 8], [0, 9], [24, 7], [46, 9]].forEach(([dx, r], k) => { const x = sbDx + dx; pebbleAt(x, sbU(x) - r * 0.7, r, 'igneous', k); });
    // 용암 L
    const ly1 = SB.y, ly2 = SB.y + SB.h * 0.1; ctx.beginPath(); ctx.rect(SB.x, ly1, SB.w, ly2 - ly1); ctx.fillStyle = '#3f3a46'; ctx.fill(); fillLith('igneous');
    ctx.fillStyle = 'rgba(255,120,40,.18)'; ctx.fillRect(SB.x, ly2 - 7, SB.w, 7);
    ctx.strokeStyle = 'rgba(30,25,20,.6)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(SB.x, ly2); ctx.lineTo(SB.x + SB.w, ly2); ctx.stroke();
    ctx.save(); ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = '#be123c'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = SB.x; x <= SB.x + SB.w; x += 4) { x === SB.x ? ctx.moveTo(x, sbU(x)) : ctx.lineTo(x, sbU(x)); } ctx.stroke(); ctx.restore();
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(SB.x, SB.y, SB.w, SB.h);
    const L = (x, y, text, bg, col, al) => D.label(x, y, text, { bg: bg || 'rgba(255,255,255,.94)', color: col || '#334155', size: 13, pad: 7, border: bg ? null : '#94a3b8', align: al || 'left' });
    L(SB.x + 8, SB.y + SB.h * 0.05, '용암 L  120 Ma', '#3b3340', '#fff');
    L(SB.x + 8, SB.y + SB.h * 0.2, '지층 E  (연령은?)', '#c2410c', '#fff');
    L(SB.x + 8, SB.y + SB.h * 0.45, '석회암'); L(SB.x + 8, SB.y + SB.h * 0.67, '사암'); L(SB.x + 8, SB.y + SB.h * 0.89, '셰일');
    L(sbDx + sbDw / 2 + 12, SB.y + SB.h * 0.62, '관입암 D  150 Ma', '#5b4a6b', '#fff');
    D.label(SB.x + SB.w - 8, sbU(SB.x + SB.w - 90) + 18, '부정합면', { bg: '#be123c', size: 13, pad: 7, align: 'right' });
    // 연령 축
    const AX = PHONE ? { x: 36, y: 506, w: 528 } : { x: 508, y: 130, w: 262 };
    const IRp = PHONE ? { x: 12, y: 392, w: 576, h: 436 } : { x: 494, y: 10, w: 294, h: 540 };
    panel(IRp.x, IRp.y, IRp.w, IRp.h, { title: '연령 축 (Ma = 100만 년 전)', border: '#bfdbfe' });
    const ax = (v) => AX.x + (AX.w * v) / 200;
    ctx.fillStyle = '#e2e8f0'; rr(AX.x, AX.y, AX.w, 18, 6).fill();
    // 범위 띠
    const yv = Sc.yD, ov = Sc.oD;
    if (ov > yv) { ctx.save(); ctx.fillStyle = 'rgba(194,65,12,.55)'; ctx.fillRect(ax(yv), AX.y, ax(ov) - ax(yv), 18); ctx.restore(); }
    [0, 50, 100, 150, 200].forEach((v) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax(v), AX.y + 18); ctx.lineTo(ax(v), AX.y + 26); ctx.stroke(); D.text(ax(v), AX.y + 42, String(v), { size: 12.5, weight: 700, color: gcl.mute }); });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rr(AX.x, AX.y, AX.w, 18, 6).stroke();
    // D, L 표시
    [[150, '관입암 D', '#5b4a6b', true], [120, '용암 L', '#3b3340', false]].forEach(([v, n, c, up]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax(v), AX.y - (up ? 12 : 0)); ctx.lineTo(ax(v), AX.y + 18 + (up ? 0 : 0)); ctx.stroke();
      D.label(ax(v), AX.y - (up ? 26 : 50) + (up ? 0 : 0), n + ' ' + v + ' Ma', { bg: c, size: 12.5, pad: 7 });
    });
    const txt = ov > yv ? (Math.round(yv) + ' Ma < E < ' + Math.round(ov) + ' Ma') : '범위가 맞지 않아요';
    D.label(AX.x + AX.w / 2, AX.y + 74, 'E의 연령: ' + txt, { bg: '#c2410c', size: 14, pad: 10 });
    const clues = ['① 부정합면이 D의 윗부분을 잘랐고 그 위에 E가 쌓였어요 → E는 D보다 나중', '② 용암 L이 E 위를 덮었어요 → E는 L보다 먼저', '③ 따라서 L(120 Ma)보다 오래되고 D(150 Ma)보다 젊어요'];
    clues.forEach((c, i) => note(IRp.x + 10, AX.y + 100 + i * (PHONE ? 58 : 74), IRp.w - 20, c, 13, { bg: i === 2 ? '#fff7ed' : '#f0f9ff', border: i === 2 ? '#fdba74' : '#bfdbfe' }));
  }

  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { decay: '⚛️ 방사성 붕괴: 입자 모형', curve: '📉 붕괴 곡선: 모원소 비율', iso: '📏 동위 원소별 반감기', age: '🧮 시료의 연령 계산', pick: '🧭 알맞은 동위 원소 고르기', sect: '🗺️ 지층 E의 연령 범위' };
  const sT = $('#sT'), oT = $('#oT'), sTemp = $('#sTemp'), oTemp = $('#oTemp'), sPress = $('#sPress'), oPress = $('#oPress'), sCur = $('#sCur'), oCur = $('#oCur'), sYoung = $('#sYoung'), oYoung = $('#oYoung'), sOld = $('#sOld'), oOld = $('#oOld');
  const smpBtns = $$('#smpSeg .opt'), isoBtns = $$('#isoSeg .opt'), markBtns = $$('#markSeg .opt');
  const syncT = () => setSlider(sT, oT, S.dec.t, (v) => (Math.round(v * 100) / 100).toFixed(2) + ' 반감기');
  const PICK_OPTS = ISO.map((i) => [i.id, i.sym + ' (' + i.tl + ')']);
  $('#pickRows').innerHTML = PICKS.map((p, i) => '<div class="cap-lbl">' + (i + 1) + '. ' + p.icon + ' ' + p.name + ' · ' + p.label + '</div><select class="mini-sel" data-i="' + i + '" aria-label="문항 ' + (i + 1) + '의 동위 원소"><option value="">고르세요</option>' + PICK_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select>').join('');
  const pickSels = $$('#pickRows select');
  $('#cvTable').innerHTML = [0, 1, 2, 3].map((n) => '<div class="cv-row" data-i="' + n + '"><b>n=' + n + '</b><input class="num-in cvP" type="text" inputmode="decimal" placeholder="%" aria-label="n=' + n + ' 일 때 모원소 비율(%)" autocomplete="off"><span>1 :</span><input class="num-in cvD" type="text" inputmode="decimal" placeholder="□" aria-label="n=' + n + ' 일 때 모원소 대 자원소 비의 자원소 값" autocomplete="off"><button class="btn btn-sm" type="button">점 찍기</button></div>').join('');
  const cvRows = $$('#cvTable .cv-row');

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    const fr = !!(game && game.free);
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $('#tpBox').hidden = $('#tpBox').hidden || !(S.dec.tpOn || fr);
    $('#countBox').hidden = $('#countBox').hidden || !(S.dec.countOn && !fr);
    $('#tableBox').hidden = $('#tableBox').hidden || !(S.cv.tableOn || fr);
    $('#cursorBox').hidden = $('#cursorBox').hidden || !(S.cv.cursorOn || fr);
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $('#modeSeg').hidden = !fr;
    syncT(); $('#bPlay').textContent = S.dec.play ? '⏸ 멈추기' : (S.dec.t >= 4 ? '▶ 다시 흐르게' : '▶ 시간 흐르게');
    setSlider(sTemp, oTemp, S.dec.temp, (v) => v + ' °C'); setSlider(sPress, oPress, S.dec.press, (v) => f1(v) + ' GPa');
    setSlider(sCur, oCur, S.cv.n, (v) => 'n = ' + fmtPct(v));
    markBtns.forEach((b) => { b.classList.toggle('good', !!S.cv.marks[b.dataset.k]); });
    cvRows.forEach((r, i) => { const row = S.cv.rows[i]; r.querySelectorAll('input').forEach((x) => { x.disabled = row.ok; }); r.querySelector('button').disabled = row.ok; r.querySelector('button').textContent = row.ok ? '✓ 완료' : '점 찍기'; r.classList.toggle('ok', row.ok); });
    isoBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.iso.target));
    smpBtns.forEach((b) => { b.classList.toggle('on', +b.dataset.k === S.age.sel); b.classList.toggle('good', !!S.age.rec[+b.dataset.k]); });
    const sm = SMP[S.age.sel]; $('#ageUnit').textContent = '연령의 단위: ' + sm.unit + (S.age.rec[S.age.sel] ? ' · 이 시료는 기록했어요' : '');
    pickSels.forEach((s) => { s.value = S.pick.ans[+s.dataset.i] || ''; });
    setSlider(sYoung, oYoung, S.sect.young, (v) => v + ' Ma'); setSlider(sOld, oOld, S.sect.old, (v) => v + ' Ma');
  }
  const parseNum = (s) => parseFloat(String(s).replace(/,/g, '').replace(/\s/g, ''));
  /* 붕괴 모형 */
  sT.addEventListener('input', () => { S.dec.play = false; S.dec.t = +sT.value; updateCtl(); });
  $('#bPlay').addEventListener('click', () => { Sound.click(); const D2 = S.dec; if (D2.play) { D2.play = false; decaySetT(D2.t); } else { if (D2.t >= 4) D2.t = 0; D2.play = true; } updateCtl(); });
  $('#bDecReset').addEventListener('click', () => { Sound.click(); S.dec.play = false; S.dec.t = 0; updateCtl(); });
  sTemp.addEventListener('input', () => { S.dec.temp = +sTemp.value; if (Math.abs(S.dec.temp - 600) >= 300) S.dec.moved.temp = true; updateCtl(); });
  sPress.addEventListener('input', () => { S.dec.press = +sPress.value; if (Math.abs(S.dec.press - 1) >= 0.5 - 1e-9) S.dec.moved.press = true; updateCtl(); });
  function recordCount() {
    const D2 = S.dec, v = parseNum($('#inCount').value);
    if (isNaN(v)) { Sound.fail(); say('세어 본 개수를 숫자로 써요.', true, 2.2); return; }
    if (Math.abs(D2.t - 1) > 0.01) { Sound.fail(); say('먼저 경과 시간을 1 반감기로 맞춰요.', true, 2.6); return; }
    if (v === remainAt(D2.t)) { D2.count = v; D2.reveal = true; Sound.success(); say('맞아요! 모원소는 ' + v + '개 남았어요. 128개의 절반이에요.', false, 3); parts.burst(DL.gx + 100, DL.gy + 100, { count: 16, speed: 140, colors: [C_P, '#fff', '#93c5fd'] }); }
    else { Sound.fail(); say('다시 세어 봐요. 파란 원자만 세요. (자원소는 주황색이에요)', true, 3); }
    updateCtl();
  }
  $('#bCount').addEventListener('click', recordCount);
  $('#inCount').addEventListener('keydown', (e) => { if (e.key === 'Enter') recordCount(); });
  /* 붕괴 곡선 */
  cvRows.forEach((r, i) => r.querySelector('button').addEventListener('click', () => {
    const V = S.cv, row = V.rows[i], p = parseNum(r.querySelector('.cvP').value), d = parseNum(r.querySelector('.cvD').value);
    if (isNaN(p) || isNaN(d)) { Sound.fail(); say('모원소 비율(%)과 자원소 값을 모두 써요.', true, 2.4); return; }
    if (Math.abs(p - pct(i)) > 0.01) { Sound.fail(); say('n=' + i + ': 반감기가 ' + i + '번 지나면 모원소는 (1/2)을 ' + i + '번 곱한 만큼 남아요. 다시 계산해 봐요.', true, 3.6); return; }
    if (Math.abs(d - (Math.pow(2, i) - 1)) > 0.001) { Sound.fail(); say('모원소를 1로 맞추면 자원소는 몇 배일까요? 모원소 ' + fmtPct(pct(i)) + '%, 자원소 ' + fmtPct(100 - pct(i)) + '%예요.', true, 3.6); return; }
    row.ok = true; row.pt.p = 0; Sound.success(); SciSim.tween(row.pt, { p: 1 }, { duration: 0.9, ease: 'linear' }); updateCtl();
  }));
  bindSlider(sCur, oCur, (v) => 'n = ' + fmtPct(v), (v) => { S.cv.n = v; });
  markBtns.forEach((b) => b.addEventListener('click', () => {
    const v = +b.dataset.k, want = Math.log2(100 / v);
    if (Math.abs(S.cv.n - want) <= 0.03) { S.cv.marks[v] = true; Sound.success(); const g = S.cv; say('맞아요! 모원소가 ' + v + '%인 곳은 n = ' + want + ' 이에요.', false, 2.6); }
    else { Sound.fail(); say('지금 점은 모원소 ' + f1(pct(S.cv.n)) + '%예요. 곡선을 따라 ' + v + '%인 곳으로 옮겨 봐요.', true, 3); }
    updateCtl();
  }));
  isoBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.iso.target = b.dataset.k; updateCtl(); }));
  /* 연령 계산 */
  smpBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.age.sel = +b.dataset.k; $('#inN').value = ''; $('#inAge').value = ''; updateCtl(); }));
  function recordAge() {
    const A = S.age, s = SMP[A.sel], n = parseNum($('#inN').value);
    let a = parseNum($('#inAge').value);
    if (isNaN(n) || isNaN(a)) { Sound.fail(); say('n과 연령을 모두 숫자로 써요.', true, 2.4); return; }
    if (s.unit === '억 년' && a > 1e6) a = a / 1e8;
    if (n !== s.n) { Sound.fail(); say('n이 맞지 않아요. 모원소가 처음의 1/2을 몇 번 곱한 값인지 생각해 봐요.', true, 3.2); return; }
    if (Math.abs(a - s.ans) > Math.max(0.01, s.ans * 0.002)) { Sound.fail(); say('연령 = n × 반감기예요. ' + n + ' × ' + (s.unit === '년' ? comma(ISO_BY[s.iso].T) + '년' : s.Tv + '억 년') + ' 를 계산해 봐요.', true, 3.6); return; }
    A.rec[A.sel] = { n, age: s.ans }; A.fx[A.sel] = 0; Sound.success(); say('시료 ' + ['①', '②', '③', '④'][A.sel] + '의 연령은 ' + fmtAge(s, s.ans) + '이에요.', false, 2.8);
    $('#inN').value = ''; $('#inAge').value = ''; updateCtl();
  }
  $('#bAge').addEventListener('click', recordAge);
  ['#inN', '#inAge'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') recordAge(); }));
  pickSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.pick.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  bindSlider(sYoung, oYoung, (v) => v + ' Ma', (v) => { S.sect.young = v; });
  bindSlider(sOld, oOld, (v) => v + ' Ma', (v) => { S.sect.old = v; });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'decay') { const D2 = S.dec, nd = decayedAt(D2.t), np = NATOM - nd, show = D2.reveal || (game && game.free); setReadouts(['경과 시간', (Math.round(D2.t * 100) / 100).toFixed(2) + ' 반감기', '모원소 (파랑)', show ? np + '개 (' + fmtPct((np / NATOM) * 100) + '%)' : '세어 보세요', '자원소 (주황)', show ? nd + '개' : '?']); }
    else if (v === 'curve') { const V = S.cv, d = V.rows.filter((r) => r.ok).length; setReadouts(['찍은 점', d + ' / 4', '곡선 위 점', V.cursorOn || (game && game.free) ? 'n = ' + fmtPct(V.n) + ' · ' + f1(pct(V.n)) + '%' : '—', '표시한 지점', Object.keys(V.marks).filter((k) => V.marks[k]).length + ' / 3']); }
    else if (v === 'iso') { const tg = +S.iso.target; setReadouts(['측정할 나이', tg >= 1e8 ? tg / 1e8 + '억 년' : tg / 1e4 + '만 년', '¹⁴C 반감기', '5730년', '²³⁸U 반감기', '44.7억 년']); }
    else if (v === 'age') { const A = S.age, s = SMP[A.sel], iso = ISO_BY[s.iso]; setReadouts(['시료', ['①', '②', '③', '④'][A.sel] + ' ' + s.name, '원소 · 반감기', iso.sym + ' · ' + iso.tl, '기록한 시료', A.rec.filter((r) => r).length + ' / 4']); }
    else if (v === 'pick') { const n = S.pick.ans.filter((a) => a).length, k = S.pick.ans.filter((a, i) => a === PICKS[i].ans).length; setReadouts(['고른 문항', n + ' / 3', '맞힌 문항', k + ' / 3', '기준', '반감기가 가장 비슷한 원소']); }
    else { const Sc = S.sect; setReadouts(['관입암 D', '150 Ma', '용암 L', '120 Ma', '지층 E', Sc.old > Sc.young ? Sc.young + ' ~ ' + Sc.old + ' Ma' : '범위 오류']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    const D2 = S.dec;
    if (li === 0) { D2.t = 0; D2.play = false; D2.temp = 600; D2.press = 1; D2.moved = { temp: false, press: false }; D2.count = null; D2.reveal = false; D2.tpOn = false; D2.countOn = true; $('#inCount').value = ''; setView('decay'); showHint('시간을 1 반감기에 맞추고 파란 원자를 세어 봐요', 5200); }
    else if (li === 1) { D2.play = false; S.cv.rows.forEach((r) => { r.ok = false; r.pt.p = 0; }); S.cv.marks = { 50: false, 25: false, 12.5: false }; S.cv.n = 0; S.cv.tableOn = true; S.cv.cursorOn = false; cvRows.forEach((r) => r.querySelectorAll('input').forEach((x) => { x.value = ''; })); setView('curve'); showHint('표를 채우고 점 찍기를 눌러 곡선을 그려요', 5200); }
    else if (li === 2) { D2.play = false; S.age.rec = [null, null, null, null]; S.age.sel = 0; $('#inN').value = ''; $('#inAge').value = ''; setView('age'); showHint('시료의 모원소 비율에서 n을 구해요', 5200); }
    else { S.pick.ans = [null, null, null]; S.sect.young = 0; S.sect.old = 200; S.sect.yD = 0; S.sect.oD = 200; setView('pick'); showHint('반감기가 비슷한 원소를 골라요', 5200); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 반감기와 시료 값은 교육용 <b>예시 자료</b>예요.</p>';
  const TABLE = tb([['n', '모원소', '자원소', '모 : 자'], ['0', '100 %', '0 %', '1 : 0'], ['1', '50 %', '50 %', '1 : 1'], ['2', '25 %', '75 %', '1 : 3'], ['3', '12.5 %', '87.5 %', '1 : 7']]);
  const tpOk = () => Math.abs(S.dec.t - 1) < 0.01 && Math.abs(S.dec.temp - 600) >= 300 && Math.abs(S.dec.press - 1) >= 0.5 - 1e-9;
  const pickOk = () => S.pick.ans.every((a, i) => a === PICKS[i].ans);

  const levels = [
    {
      title: '방사성 붕괴: 원자는 어떻게 줄어들까', short: '방사성 붕괴', icon: '⚛️', phase: '모형', features: ['decay'],
      intro: '<p class="si-q">❓ 탐구 질문: 수천만 년, 수억 년 전의 암석 나이를 어떻게 숫자로 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 지층의 선후 관계로 “어느 쪽이 먼저인가(상대 연령)”를 알았어요. 이번에는 “몇 년 전인가(절대 연령)”를 구해요. <b>통합과학</b>에서 배운 지구의 나이 약 46억 년도 이 방법으로 구해요.</div>' +
        '<p>광물 속에는 시간이 지나면 다른 원소로 변하는 <b>방사성 동위 원소(모원소)</b>가 들어 있어요. 모원소가 변해서 생긴 원소가 <b>자원소</b>예요. 광물 알갱이를 입자 수준으로 확대해서 모원소(파랑)가 자원소(주황)로 변하는 모습을 관찰해 봐요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '모원소는 자원소로 변해요. 원자 하나가 변하는 때는 예측할 수 없지만, 많은 원자 전체는 일정한 비율로 줄고, 온도나 압력이 달라도 변하지 않아요.',
      summary: '<ul><li><b>절대 연령</b>: 지질 사건 이후 지난 시간을 햇수로 나타낸 것.</li><li>방사성 동위 원소(<b>모원소</b>)는 일정한 속도로 붕괴하여 다른 원소(<b>자원소</b>)가 돼요.</li><li>붕괴 속도는 <b>온도·압력·화학 결합 상태</b>와 관계없이 일정해요.</li><li>원자 하나가 언제 붕괴할지는 알 수 없지만(확률), 많은 원자는 일정한 비율로 줄어요.</li></ul>',
      missions: [
        {
          title: '1 반감기 뒤 남은 모원소 세기',
          goal: '경과 시간을 <b>1 반감기</b>로 맞추고, 남은 <b>모원소(파랑)</b> 개수를 세어 📝 기록해요.',
          hint: '시간 슬라이더를 1로 맞추면 파란 원자 일부가 주황색으로 바뀌어요. 남은 파란 원자의 수를 세어서 써요. (전체 128개)',
          hold: 0.4, setup() { const D2 = S.dec; D2.t = 0; D2.play = false; D2.count = null; D2.reveal = false; D2.countOn = true; D2.tpOn = false; $('#inCount').value = ''; setView('decay'); },
          status: () => '시간 1.00 ' + mark(Math.abs(S.dec.t - 1) < 0.01) + ' · 개수 기록 ' + mark(S.dec.count != null),
          check: () => S.dec.count != null && S.dec.count === 64,
          explain: '1 반감기가 지나면 모원소 128개의 절반인 <b>64개</b>가 남고, 나머지 64개는 자원소가 돼요. 어느 원자가 먼저 변할지는 알 수 없지만, 전체는 반감기마다 정확히 절반씩 줄어요.',
        },
        {
          title: '온도와 압력을 바꿔도 같을까',
          goal: '시간을 <b>1 반감기</b>에 두고, 온도를 <b>300 °C 이상</b>, 압력을 <b>0.5 GPa 이상</b> 바꿔서 결과가 그대로인지 확인해요.',
          hint: '온도의 처음 값은 600 °C, 압력은 1.0 GPa예요. 둘 다 크게 바꾼 상태에서 시간 슬라이더를 1로 맞춰요.',
          hold: 0.5, setup() { const D2 = S.dec; D2.t = 1; D2.play = false; D2.temp = 600; D2.press = 1; D2.moved = { temp: false, press: false }; D2.tpOn = true; D2.countOn = false; D2.reveal = true; setView('decay'); },
          status: () => '시간 1.00 ' + mark(Math.abs(S.dec.t - 1) < 0.01) + ' · 온도 변경 ' + mark(Math.abs(S.dec.temp - 600) >= 300) + ' · 압력 변경 ' + mark(Math.abs(S.dec.press - 1) >= 0.5 - 1e-9) + ' · 남은 모원소 ' + remainAt(S.dec.t) + '개',
          check: () => tpOk(),
          explain: '온도나 압력을 아무리 바꿔도 1 반감기 뒤 남은 모원소는 <b>64개</b>로 같아요. 붕괴 속도는 일정해서, 암석이 땅속 깊은 곳에서 열과 압력을 받아도 방사성 시계는 그대로 흘러요.',
        },
        {
          type: 'quiz', title: '반감기가 두 번 지나면', goal: '반감기가 <b>2번</b> 지났을 때 모원소는 어떻게 될까요?', setup() { S.dec.tpOn = false; S.dec.countOn = false; S.dec.reveal = true; S.dec.t = 2; setView('decay'); },
          choices: ['모두 사라져요', '처음의 25 %가 남아요', '처음의 50 %가 그대로 남아요', '온도가 높으면 더 빨리 사라져요'],
          answer: 1,
          feedback: ['반감기는 “절반이 되는 시간”이에요. 두 번 지나도 남은 것의 절반이 또 변할 뿐 전부 사라지지 않아요.', '', '1 반감기에 50 %가 남고, 2 반감기에 그 절반인 25 %가 남아요.', '붕괴 속도는 온도와 관계없이 일정해요.'],
          explain: '반감기마다 남은 모원소가 절반이 돼요. 2 반감기 뒤에는 100 → 50 → <b>25 %</b>예요. 원자 하나가 변하는 때는 알 수 없어도 많은 원자 전체는 일정한 비율로 줄어요.',
        },
      ],
    },
    {
      title: '반감기: 붕괴 곡선 그리기', short: '반감기', icon: '📉', phase: '분석', features: ['curve', 'iso'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반감기마다 모원소가 절반으로 줄어드는 것을 확인했어요.</div>' +
        '<p><b>반감기</b>는 모원소가 처음 양의 절반이 되는 데 걸리는 시간이에요. 반감기가 <b>n번</b> 지나면 모원소는 처음의 (1/2)<sup>n</sup>, 자원소는 1 − (1/2)<sup>n</sup>이 돼요. 표를 채워 붕괴 곡선을 그리고 곡선에서 값을 읽어 봐요. 원소마다 반감기가 아주 달라요.</p>' + SRC,
      setup() { enterLevel(1); },
      recap: 'n번의 반감기 뒤 모원소는 처음의 (1/2)^n이고, 모원소 : 자원소 = 1 : (2^n − 1)이에요. 측정할 나이와 반감기가 비슷한 원소를 써야 해요.',
      summary: TABLE + '<ul><li>반감기 n번 후 모원소 = (1/2)<sup>n</sup>, 자원소 = 1 − (1/2)<sup>n</sup>, 모원소 : 자원소 = 1 : (2<sup>n</sup> − 1)</li><li>반감기: ¹⁴C 5730년, ²³⁵U 7.0억 년, ⁴⁰K 12.5억 년, ²³⁸U 44.7억 년</li><li>¹⁴C는 유기물, 약 5만 년 이내의 연령 측정에 써요.</li></ul>',
      missions: [
        {
          title: '표를 채우고 붕괴 곡선 그리기', manual: true,
          goal: 'n = 0, 1, 2, 3일 때 <b>모원소 비율(%)</b>과 <b>모원소 : 자원소 = 1 : □</b>의 □를 쓰고 <b>점 찍기</b>를 눌러 곡선을 그려요. 모두 찍으면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '반감기가 지날 때마다 모원소는 절반이에요: 100 → 50 → … 자원소는 100에서 모원소를 뺀 값이에요. 모원소를 1로 맞추면 자원소는 몇 배일까요?',
          setup() { S.cv.tableOn = true; S.cv.cursorOn = false; setView('curve'); },
          status: () => '찍은 점 ' + S.cv.rows.filter((r) => r.ok).length + ' / 4',
          check: () => { const i = S.cv.rows.findIndex((r) => !r.ok); return i < 0 ? true : 'n = ' + i + '인 행에서 점을 아직 찍지 않았어요.'; },
          explain: '모원소는 <b>100 → 50 → 25 → 12.5 %</b>, 모원소 : 자원소는 <b>1:0 → 1:1 → 1:3 → 1:7</b>이에요. 자원소는 (2<sup>n</sup> − 1) 배예요. 점을 이으면 처음에는 가파르다가 점점 완만해지는 붕괴 곡선이 돼요.',
        },
        {
          title: '곡선에서 50·25·12.5 % 지점 읽기',
          goal: '곡선 위의 점을 움직여 모원소가 <b>50 %, 25 %, 12.5 %</b>인 곳에서 각각 버튼을 눌러 표시해요.',
          hint: '“곡선 위의 점” 슬라이더를 움직여요. 50 %는 반감기 1번, 25 %는 2번, 12.5 %는 3번 지난 곳이에요.',
          hold: 0.5, setup() { S.cv.rows.forEach((r) => { r.ok = true; r.pt.p = 1; }); S.cv.tableOn = false; S.cv.cursorOn = true; S.cv.marks = { 50: false, 25: false, 12.5: false }; setView('curve'); },
          status: () => '50 % ' + mark(S.cv.marks[50]) + ' · 25 % ' + mark(S.cv.marks[25]) + ' · 12.5 % ' + mark(S.cv.marks[12.5]),
          check: () => S.cv.marks[50] && S.cv.marks[25] && S.cv.marks[12.5],
          explain: '모원소 50 %는 <b>n = 1</b>, 25 %는 <b>n = 2</b>, 12.5 %는 <b>n = 3</b>인 곳이에요. 곡선은 한 반감기 동안 가로로 같은 거리만큼 가면 세로로 절반씩 내려가요.',
        },
        {
          type: 'quiz', title: '¹⁴C로 1억 년 된 암석을?', goal: '<b>¹⁴C</b>(반감기 5730년)로 <b>1억 년</b> 된 암석의 나이를 재기 어려운 까닭은?', setup() { S.cv.cursorOn = false; S.iso.target = '1e8'; setView('iso'); },
          choices: ['반감기가 너무 짧아서 이미 모원소가 거의 남지 않았어요', '¹⁴C는 온도가 높은 곳에서만 붕괴해서요', '반감기가 너무 길어서 변한 양이 거의 없어요', '암석에는 방사성 동위 원소가 없어서요'],
          answer: 0,
          feedback: ['', '붕괴 속도는 온도와 관계없이 일정해요. 문제는 반감기의 길이예요.', '¹⁴C의 반감기는 5730년으로 짧은 편이에요. 오히려 너무 짧아요.', '암석 속 광물에도 방사성 동위 원소가 들어 있어요. 어떤 원소를 쓰는지가 중요해요.'],
          explain: '1억 년은 ¹⁴C 반감기의 약 1만 7천 배예요. 모원소가 거의 0이 되어 재기 어려워요. 그래서 오래된 암석에는 ²³⁵U, ⁴⁰K, ²³⁸U처럼 <b>반감기가 긴 원소</b>를 써요.',
        },
      ],
    },
    {
      title: '연령 계산: n × 반감기', short: '연령 계산', icon: '🧮', phase: '적용', features: ['age'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> n번의 반감기 뒤 모원소 비율과 비를 표로 정리했어요.</div>' +
        '<p>광물이 마그마에서 <b>결정</b>이 되는 순간부터 닫힌 계가 되어, 그때는 자원소가 0이었다고 봐요. 지금의 <b>모원소 : 자원소</b> 비로 n을 구하면 <b>연령 = n × 반감기</b>예요. 시료 4개의 연령을 구해 봐요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '지금의 모원소 비율(또는 모 : 자 비)에서 반감기가 지난 횟수 n을 구하고, 연령 = n × 반감기로 계산해요.',
      summary: '<ul><li>광물이 결정이 되는 순간 자원소는 0 → 지금의 모 : 자 비로 연령을 구해요.</li><li>연령 = n × 반감기. 모원소 100 → 50 → 25 → 12.5 % 에서 n = 0 → 1 → 2 → 3.</li><li>시료 ① ¹⁴C 목탄 25 % → 11460년, ② ¹⁴C 뼈 12.5 % → 17190년, ③ ⁴⁰K 운모 1 : 3 → 25억 년, ④ ⁴⁰K 편마암 12.5 % → 37.5억 년</li></ul>',
      missions: [
        {
          title: '시료 4개의 연령 계산',
          goal: '시료 ①~④에서 <b>n</b>을 구하고 <b>연령 = n × 반감기</b>를 계산해 기록해요. 네 시료 모두 해 봐요.',
          hint: '모원소가 25 %면 1/2을 2번 곱한 값이라 n = 2예요. 모 : 자 = 1 : 3이면 모원소는 전체의 1/4이에요. 단위(년 / 억 년)에 주의해요.',
          hold: 0.5, setup() { setView('age'); },
          status: () => S.age.rec.map((r, i) => ['①', '②', '③', '④'][i] + ' ' + mark(r)).join(' · '),
          check: () => S.age.rec.every((r) => r),
          explain: '① 25 % → n = 2 → 2 × 5730 = <b>11460년</b> ② 12.5 % → n = 3 → <b>17190년</b> ③ 1 : 3 → 모원소 1/4 → n = 2 → 2 × 12.5억 = <b>25억 년</b> ④ 12.5 % → n = 3 → 3 × 12.5억 = <b>37.5억 년</b>이에요.',
        },
        {
          type: 'quiz', title: '모 : 자 = 1 : 7', goal: '모원소 : 자원소 = <b>1 : 7</b>이면 반감기는 몇 번 지났을까요?', setup() { setView('age'); },
          choices: ['1번', '2번', '3번', '7번'],
          answer: 2,
          feedback: ['1번이면 모 : 자 = 1 : 1이에요.', '2번이면 모 : 자 = 1 : 3이에요.', '', '비의 숫자가 아니라 모원소가 전체의 몇 분의 1인지 봐야 해요. 1 : 7이면 모원소는 전체의 1/8이에요.'],
          explain: '모 : 자 = 1 : 7이면 모원소는 전체 8 중 1이라 처음의 1/8 = (1/2)<sup>3</sup>이에요. 그러므로 반감기가 <b>3번</b> 지났어요.',
        },
      ],
    },
    {
      title: '연대 해석: 상대 + 절대 연령', short: '연대 해석', icon: '🗺️', phase: '분석', features: ['pick', 'sect'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모원소 비율로 시료의 연령을 구했고, <b>앞 차시에서</b> 지층의 선후 관계(관입, 부정합)를 배웠어요.</div>' +
        '<p>실제로는 두 가지를 함께 써요. 먼저 측정할 나이에 알맞은 동위 원소를 고르고, 퇴적암은 직접 재기 어려우므로 <b>화성암의 절대 연령</b>과 <b>상대 연령(선후 관계)</b>을 합쳐 연령의 <b>범위</b>를 정해요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '측정할 나이와 반감기가 비슷한 원소를 고르고, 퇴적암은 위아래 화성암의 절대 연령과 선후 관계로 연령 범위를 정해요.',
      summary: '<ul><li>동위 원소는 측정할 나이와 <b>반감기가 비슷한 것</b>을 골라요. (1만 년 → ¹⁴C, 6.5억 년 → ²³⁵U, 40억 년 → ²³⁸U)</li><li>퇴적암 속 광물은 원래 암석에서 온 알갱이라 그 연령이 퇴적 시기가 아니에요. 그래서 <b>화성암</b>의 연령으로 퇴적암의 연령 <b>범위</b>를 정해요.</li><li>예: 관입암 D 150 Ma, 부정합 위의 용암 L 120 Ma → 지층 E는 120 Ma보다 오래되고 150 Ma보다 젊어요.</li></ul>',
      missions: [
        {
          title: '알맞은 동위 원소 고르기', manual: true,
          goal: '세 시료에 가장 알맞은 동위 원소를 각각 골라요. 측정할 나이와 <b>반감기가 가장 비슷한</b> 원소예요. 모두 고르면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '표에서 반감기를 비교해요. 나이가 반감기보다 너무 길면 모원소가 남지 않고, 너무 짧으면 변화가 거의 없어요.',
          setup() { S.pick.ans = [null, null, null]; setView('pick'); },
          status: () => '고른 문항 ' + S.pick.ans.filter((a) => a).length + ' / 3',
          check: () => {
            const a = S.pick.ans, n = a.findIndex((x) => !x); if (n >= 0) return '문항 ' + (n + 1) + '의 원소를 아직 고르지 않았어요.';
            const w = a.findIndex((x, i) => x !== PICKS[i].ans);
            return w < 0 ? true : '문항 ' + (w + 1) + ': ' + pickFb(w, a[w]) + ' — 측정할 나이와 반감기가 더 비슷한 원소를 찾아봐요.';
          },
          explain: '1만 년 목탄은 <b>¹⁴C</b>(5730년), 약 6.5억 년 된 화성암 광물은 <b>²³⁵U</b>(7.0억 년), 약 40억 년 된 지르콘은 <b>²³⁸U</b>(44.7억 년)가 알맞아요. 반감기가 나이와 비슷해야 모원소가 적당히 남아 측정할 수 있어요.',
        },
        {
          title: '지층 E의 연령 범위 정하기',
          goal: '관입암 D(150 Ma)와 용암 L(120 Ma)의 연령과 단면의 선후 관계로 <b>지층 E의 연령 범위</b>를 정해요.',
          hint: 'E는 D의 윗부분이 깎인 뒤에 쌓였으니 D보다 젊고(150 Ma보다 작음), 위를 덮은 L보다 오래됐어요(120 Ma보다 큼). 최소 연령 120, 최대 연령 150으로 맞춰요.',
          hold: 0.8, setup() { S.sect.young = 0; S.sect.old = 200; S.sect.yD = 0; S.sect.oD = 200; setView('sect'); },
          status: () => '최소 연령 120 Ma ' + mark(S.sect.young === 120) + ' · 최대 연령 150 Ma ' + mark(S.sect.old === 150),
          check: () => S.sect.young === 120 && S.sect.old === 150,
          explain: '부정합면이 D를 잘랐고 그 위에 E가 쌓였으니 <b>E는 D(150 Ma)보다 젊어요</b>. 용암 L(120 Ma)이 E를 덮었으니 <b>E는 L보다 오래됐어요</b>. 그래서 <b>120 Ma &lt; E &lt; 150 Ma</b>예요. 상대 연령(선후 관계)과 절대 연령을 함께 쓴 거예요.',
        },
        {
          type: 'quiz', title: '퇴적암의 연령 측정', goal: '퇴적암 속 광물의 방사성 연령을 그대로 <b>퇴적된 시기</b>로 쓸 수 없는 까닭은? (그래서 연령 측정에 유리한 것은?)', setup() { setView('sect'); },
          choices: ['광물은 원래 있던 암석에서 떨어져 나온 알갱이라, 그 연령은 퇴적 시기보다 오래돼요. 화성암이 측정에 유리해요', '퇴적암에는 방사성 동위 원소가 전혀 없어요. 변성암이 유리해요', '퇴적암은 온도가 낮아 붕괴가 느려져요. 화성암은 붕괴가 빨라서 유리해요', '퇴적암 속 광물은 연령이 가장 젊게 나와요. 퇴적암이 유리해요'],
          answer: 0,
          feedback: ['', '퇴적암 속 광물에도 방사성 동위 원소가 있지만, 그 연령이 퇴적 시기를 뜻하지 않는 게 문제예요.', '붕괴 속도는 온도와 관계없이 일정해요.', '퇴적물 알갱이는 원래 암석이 만들어진 때를 기억해서 퇴적 시기보다 오래된 연령이 나와요.'],
          explain: '퇴적암의 알갱이는 더 오래된 암석이 부서져 온 거라 광물의 연령은 <b>퇴적 시기가 아니라 원래 암석의 연령</b>이에요. 마그마가 식어 결정이 된 때를 알려 주는 <b>화성암</b>의 연령으로 퇴적암의 연령 범위를 정해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-absolute-age', mount: '#game', badge: '연령 측정가', homeHref: '../../index.html#he',
    featureLabels: { decay: '⚛️ 붕괴 입자 모형 · 온도·압력', curve: '📉 붕괴 곡선 · 표', iso: '📏 동위 원소 반감기 눈금', age: '🧮 시료 연령 계산', pick: '🧭 동위 원소 고르기', sect: '🗺️ 지층 E의 연령 범위' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const D2 = S.dec;
    if (D2.play) { D2.t = Math.min(4, D2.t + dt * 0.28); syncT(); if (D2.t >= 4) { D2.play = false; updateCtl(); } }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef3f9'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'decay') drawDecay(t, dt);
    else if (S.view === 'curve') drawCurve(t, dt);
    else if (S.view === 'iso') drawIso(t);
    else if (S.view === 'age') drawAge(t, dt);
    else if (S.view === 'pick') drawPick(t);
    else drawSect(t, dt);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 52);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SMP, ISO, PICKS, remainAt, decayedAt, pct, isoRes, setView, updateCtl, enterLevel, NATOM,
    get game() { return game; },
  };

})();

