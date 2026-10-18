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


  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 전자의 이동과 산화·환원 (단원 6차시)
     성취기준 [10통과2-01-03] 광합성, 화석 연료 사용, 철의 제련 등에서 공통점을 찾아 산화와 환원을 이해하고,
     생활 주변의 다양한 변화를 산화와 환원의 특징과 규칙성으로 분석할 수 있다. (이번 차시: 전자의 이동 관점)
     ① 실험: 금속과 이온   ② 모형: 전자의 이동   ③ 분석: 규칙성   ④ 적용: 생활 속 변화
     ※ 산화수 표기·계산, 산화제·환원제 용어, 전지의 전압, 이온화 경향 순위표는 다루지 않음 (이온의 전하와 전자 개수만 사용)
     ========================================================= */
  initStage('#f5f3ff', 800, 560, 520, 820);

  const SPEED = 0.17;   // 자동 반응 진행 속도 (1초에 17 %)
  const sm = (x) => smooth(x);
  const sleft = (t, a, b) => smooth((t - a) / (b - a));
  const LAY = () => (PHONE ? { B: { x: 10, y: 8, w: 500, h: 346 }, P: { x: 10, y: 364, w: 500, h: 446 } } : { B: { x: 10, y: 10, w: 404, h: 540 }, P: { x: 424, y: 10, w: 366, h: 540 } });

  /* ---------- 입자(원자·이온) 모양 ---------- */
  const VIS = {
    'Zn,0': { c: '#8c98a8', t: 'Zn', r: 0.075 }, 'Zn,2': { c: '#dbe3ee', t: 'Zn²⁺', r: 0.06, dark: true },
    'Cu,0': { c: '#c8743a', t: 'Cu', r: 0.075 }, 'Cu,2': { c: '#38bdf8', t: 'Cu²⁺', r: 0.062 },
    'Ag,0': { c: '#e5e7eb', t: 'Ag', r: 0.07, dark: true }, 'Ag,1': { c: '#c7d2fe', t: 'Ag⁺', r: 0.058, dark: true },
    'Mg,0': { c: '#b6c0cd', t: 'Mg', r: 0.075, dark: true }, 'Mg,2': { c: '#c7d2fe', t: 'Mg²⁺', r: 0.055, dark: true },
    'O,0': { c: '#ef4444', t: 'O', r: 0.06 }, 'O,-2': { c: '#fb7185', t: 'O²⁻', r: 0.075 },
  };
  const visOf = (el, q, mode) => { if (mode === 'oxygen') return VIS[el + ',0'] || VIS[el + ',' + q]; return VIS[el + ',' + q] || VIS[el + ',0']; };
  function electronDot(x, y, r) {
    D.sphere(x, y, r, '#facc15', { gloss: true, outline: '#a16207', outlineWidth: 1 });
    ctx.strokeStyle = '#713f12'; ctx.lineWidth = Math.max(1.4, r * 0.22); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x + r * 0.45, y); ctx.stroke();
  }

  /* ---------- 자동 진행 입자 장면 (IonSim) ---------- */
  const N_ = (id, el, x, y, q0) => ({ id, el, x, y, q: q0 });
  function znCu() {
    const nodes = [], events = [], moves = []; const U = (k) => 0.16 + 0.2 * k;
    for (let k = 0; k < 4; k++) nodes.push(N_('z' + k, 'Zn', U(k), 0.8, 0));
    for (let k = 0; k < 4; k++) nodes.push(N_('c' + k, 'Cu', U(k) + 0.06, 0.3, 2));
    for (let k = 0; k < 4; k++) {
      const t0 = k * 0.2; events.push({ from: 'z' + k, to: 'c' + k, t0, t1: t0 + 0.14 }, { from: 'z' + k, to: 'c' + k, t0: t0 + 0.06, t1: t0 + 0.2 });
      moves.push({ id: 'z' + k, to: [U(k) + 0.06, 0.3], t0: t0 + 0.2, t1: t0 + 0.3, bow: 0.1 }, { id: 'c' + k, to: [U(k), 0.8], t0: t0 + 0.2, t1: t0 + 0.3, bow: -0.1 });
    }
    return { nodes, events, moves, total: 1.0 };
  }
  function cuAg() {
    const nodes = [N_('u0', 'Cu', 0.25, 0.8, 0), N_('u1', 'Cu', 0.65, 0.8, 0)], events = [], moves = [];
    const ag = [[0.12, 0.3], [0.36, 0.3], [0.52, 0.3], [0.8, 0.3]];
    ag.forEach((p, i) => nodes.push(N_('a' + i, 'Ag', p[0], p[1], 1)));
    const fin = [[0.12, 0.8], [0.38, 0.8], [0.52, 0.8], [0.8, 0.8]];
    [[0, 0, 0], [0, 1, 0.2], [1, 2, 0.45], [1, 3, 0.65]].forEach(([u, a, t0]) => {
      events.push({ from: 'u' + u, to: 'a' + a, t0, t1: t0 + 0.16 }); moves.push({ id: 'a' + a, to: fin[a], t0: t0 + 0.16, t1: t0 + 0.28, bow: 0.04 });
    });
    moves.push({ id: 'u0', to: [0.25, 0.5], t0: 0.38, t1: 0.52, bow: 0.05 }, { id: 'u1', to: [0.66, 0.5], t0: 0.82, t1: 0.96, bow: 0.05 });
    return { nodes, events, moves, total: 1.0 };
  }
  function mgO() {
    const nodes = [N_('m0', 'Mg', 0.2, 0.7, 0), N_('m1', 'Mg', 0.52, 0.7, 0), N_('o0', 'O', 0.62, 0.2, 0), N_('o1', 'O', 0.8, 0.2, 0)], events = [], moves = [];
    events.push({ from: 'm0', to: 'o0', t0: 0.4, t1: 0.58 }, { from: 'm0', to: 'o0', t0: 0.44, t1: 0.62 }, { from: 'm1', to: 'o1', t0: 0.5, t1: 0.68 }, { from: 'm1', to: 'o1', t0: 0.54, t1: 0.72 });
    moves.push({ id: 'o0', to: [0.34, 0.7], t0: 0.2, t1: 0.52, bow: 0.18, up: true }, { id: 'o1', to: [0.66, 0.7], t0: 0.25, t1: 0.58, bow: 0.18, up: true });
    return { nodes, events, moves, total: 1.0 };
  }
  const SIMS = { zn: znCu(), ag: cuAg(), mg: mgO() };
  Object.keys(SIMS).forEach((k) => { SIMS[k].key = k; SIMS[k].prog = 0; SIMS[k].run = false; SIMS[k].done = false; });
  function simStep(dt) {
    Object.keys(SIMS).forEach((k) => { const s = SIMS[k]; if (s.run && s.prog < 1) { s.prog = Math.min(1, s.prog + dt * SPEED); if (s.prog >= 1) { s.run = false; s.done = true; Sound.success(); } } });
  }
  function simReset(k) { const s = SIMS[k]; s.prog = 0; s.run = false; s.done = false; }
  const nodeById = (s, id) => s.nodes.find((n) => n.id === id);
  function nodeQ(s, n, prog) { let q = n.q; s.events.forEach((e) => { if (prog >= e.t1) { if (e.from === n.id) q += 1; if (e.to === n.id) q -= 1; } }); return q; }
  function nodeXY(s, n, prog) {
    let x = n.x, y = n.y;
    s.moves.forEach((m) => { if (m.id !== n.id) return; const k = SciSim.ease.inOutCubic(clamp((prog - m.t0) / (m.t1 - m.t0), 0, 1)); if (prog < m.t0) return; const x0 = m.fx != null ? m.fx : n.x, y0 = m.fy != null ? m.fy : n.y; x = lerp(x0, m.to[0], k) + (m.bow || 0) * Math.sin(Math.PI * k) * (m.up ? 0 : 1); y = lerp(y0, m.to[1], k) - (m.up ? (m.bow || 0) * Math.sin(Math.PI * k) : 0); });
    return { x, y };
  }
  const ionsLeft = (s, el, prog) => s.nodes.filter((n) => n.el === el && nodeQ(s, n, prog) === (el === 'Cu' ? 2 : 1)).length;
  const countQ = (s, el, q, prog) => s.nodes.filter((n) => n.el === el && nodeQ(s, n, prog) === q).length;
  const movedE = (s, prog) => s.events.filter((e) => prog >= e.t1).length;

  /* 입자 패널: mode 'electron' = 전자와 전하를 보여 줌 / 'oxygen' = 산소의 움직임만 */
  function drawIonPanel(R, s, o) {
    o = o || {};
    const prog = s.prog, mode = o.mode || 'electron', showE = o.showE !== false && mode === 'electron', t = o.t || 0;
    D.shadow(() => { ctx.fillStyle = '#ffffff'; rr(R.x, R.y, R.w, R.h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 16).stroke();
    D.text(R.x + 14, R.y + 26, o.title || '🔍 입자 모형 (확대)', { size: 15, weight: 800, color: '#4c1d95', align: 'left' });
    if (o.eq) D.label(R.x + R.w / 2, R.y + 54, o.eq, { bg: '#4c1d95', size: PHONE ? 13.5 : 15 });
    const top = o.eq ? 74 : 50, bottom = o.legend === false ? 12 : 44, s2 = Math.min(R.w - 20, R.h - top - bottom), ox = R.x + (R.w - s2) / 2, oy = R.y + top + (R.h - top - bottom - s2) / 2;
    ctx.fillStyle = o.bg || '#f5f3ff'; rr(ox, oy, s2, s2, 14).fill();
    if (o.solution) { ctx.save(); rr(ox, oy, s2, s2 * 0.64, 14).clip(); ctx.fillStyle = o.solution; ctx.fillRect(ox, oy, s2, s2 * 0.64); ctx.restore(); }
    if (o.plate) { ctx.fillStyle = o.plate; rr(ox, oy + s2 * 0.68, s2, s2 * 0.32, 12).fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(ox + 4, oy + s2 * 0.68 + 3, s2 - 8, 4); }
    const X = (u) => ox + u * s2, Y = (v) => oy + v * s2;
    // 산소 관점에서의 이동 경로 + 결합선 (마그네슘)
    const pos = {}; s.nodes.forEach((n) => { pos[n.id] = nodeXY(s, n, prog); });
    if (mode === 'oxygen' || o.bondMg) {
      [['m0', 'o0'], ['m1', 'o1']].forEach(([a, b]) => { const al = sleft(prog, 0.55, 0.75); if (al > 0.03 && pos[a]) { ctx.save(); ctx.globalAlpha = al * (mode === 'oxygen' ? 1 : 0.5); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.setLineDash(mode === 'oxygen' ? [] : [6, 6]); ctx.beginPath(); ctx.moveTo(X(pos[a].x), Y(pos[a].y)); ctx.lineTo(X(pos[b].x), Y(pos[b].y)); ctx.stroke(); ctx.restore(); } });
      const ob = 1 - sleft(prog, 0.2, 0.34); if (ob > 0.03) { ctx.save(); ctx.globalAlpha = ob; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(X(pos.o0.x), Y(pos.o0.y)); ctx.lineTo(X(pos.o1.x), Y(pos.o1.y)); ctx.stroke(); ctx.restore(); }
    }
    if (mode === 'electron' && o.attract) { [['m0', 'o0'], ['m1', 'o1']].forEach(([a, b]) => { const al = sleft(prog, 0.78, 0.95); if (al > 0.03) { ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(X(pos[a].x), Y(pos[a].y)); ctx.lineTo(X(pos[b].x), Y(pos[b].y)); ctx.stroke(); ctx.restore(); D.text(X((pos[a].x + pos[b].x) / 2), Y(pos[a].y) - 28 * (s2 / 340), '+ ↔ −', { size: 12.5, weight: 800, color: '#7c3aed', alpha: al }); } }); }
    // 원자·이온
    s.nodes.forEach((n) => {
      const q = nodeQ(s, n, prog), v = visOf(n.el, q, mode), p = pos[n.id], r = v.r * s2;
      const moving = s.moves.some((m) => m.id === n.id && prog > m.t0 && prog < m.t1);
      if (mode === 'oxygen' && n.el === 'O' && moving) D.glow(X(p.x), Y(p.y), r * 2.4, '#ef4444', 0.45);
      D.sphere(X(p.x), Y(p.y), r, v.c, { shadow: true, text: mode === 'oxygen' ? n.el : v.t, textColor: v.dark ? '#334155' : '#fff', textScale: (mode === 'oxygen' || v.t.length <= 2) ? 1.05 : 0.8 });
      if (showE) {
        // 아직 내놓지 않은 전자 (내놓을 전자 수만큼 둘레에 표시)
        const mine = s.events.filter((e) => e.from === n.id), left = mine.filter((e) => prog < e.t0);
        left.forEach((e, i) => { const a = -1.1 + i * 1.5 + t * 0.9; electronDot(X(p.x) + Math.cos(a) * r * 1.5, Y(p.y) + Math.sin(a) * r * 1.5, Math.max(6, r * 0.28)); });
      }
    });
    // 날아가는 전자
    if (showE) s.events.forEach((e) => {
      if (prog < e.t0 || prog > e.t1) return;
      const k = SciSim.ease.inOutCubic((prog - e.t0) / (e.t1 - e.t0)), a = pos[e.from], b = pos[e.to];
      const ex = lerp(a.x, b.x, k), ey = lerp(a.y, b.y, k) - 0.12 * Math.sin(Math.PI * k);
      D.glow(X(ex), Y(ey), 18, '#facc15', 0.6); electronDot(X(ex), Y(ey), Math.max(7, 0.03 * s2 + 2));
    });
    if (o.legend !== false) {
      const items = o.legendItems || [];
      const lw = (R.w - 16) / Math.max(1, items.length);
      items.forEach((it, i) => { const x = R.x + 8 + i * lw + lw / 2; if (it.e) electronDot(x - lw * 0.3, R.y + R.h - 22, 7); else D.sphere(x - lw * 0.3, R.y + R.h - 22, 7, it.c, { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); D.text(x - lw * 0.3 + 11, R.y + R.h - 17, it.t, { size: 12.5, weight: 700, color: '#475569', align: 'left' }); });
    }
    return { ox, oy, s: s2, X, Y, pos };
  }

  /* ---------- ① 실험대: 금속과 이온 ---------- */
  const BENCH = { k: 'zn', showE: false };
  function plateDeposit(rx, ry, rw, rh, prog, col, seed) {
    const n = Math.round(90 * prog);
    for (let i = 0; i < n; i++) { const px = rx + 2 + hash2(i, seed) * (rw - 4), py = ry + 2 + hash2(i + 50, seed) * (rh - 4); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 1.6 + hash2(i, seed + 3) * 2.4, 0, TAU); ctx.fill(); }
  }
  const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  // 은 결정 가지 (결정론적)
  const AGTREE = (() => {
    const segs = []; let id = 0; const rnd = (i) => hash2(i, 9);
    function grow(x, y, ang, len, depth) {
      if (depth > 4) return; const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; segs.push({ x, y, x2, y2, depth, i: segs.length });
      const n = depth < 2 ? 3 : 2;
      for (let b = 0; b < n; b++) { id++; grow(x2, y2, ang + (b - (n - 1) / 2) * (0.55 + rnd(id) * 0.4), len * (0.62 + rnd(id + 7) * 0.12), depth + 1); }
    }
    for (let k = 0; k < 4; k++) grow(0.2 + k * 0.2 + hash2(k, 5) * 0.06, 0, -Math.PI / 2 + (k - 1.5) * 0.18, 0.34 + hash2(k, 8) * 0.08, 0);
    return segs;
  })();
  function drawBenchScene(B, k, t, dt) {
    const s = SIMS[k], prog = s.prog;
    const g = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); g.addColorStop(0, '#faf5ff'); g.addColorStop(1, '#ede9fe');
    D.shadow(() => { ctx.fillStyle = g; rr(B.x, B.y, B.w, B.h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rr(B.x, B.y, B.w, B.h, 16).stroke();
    const ph = PHONE, cx = B.x + B.w * 0.5, bw = Math.min(B.w * 0.62, 250), bh = B.h * (ph ? 0.5 : 0.42), bx = cx - bw / 2, by = B.y + B.h * (ph ? 0.36 : 0.32), tableY = B.y + B.h * 0.92;
    ctx.fillStyle = '#d6c7b0'; rr(B.x + 14, tableY, B.w - 28, 12, 6).fill();
    // 용액 색
    let col;
    if (k === 'zn') { const left = ionsLeft(s, 'Cu', prog) / 4; col = mixc('#ecf6ff', '#1d9bf0', left); }
    else { const cu2 = countQ(s, 'Cu', 2, prog) / 2; col = mixc('#f1f5f9', '#3aa8ee', cu2 * 0.85); }
    // 비커 (아래에 놓기)
    const beY = by + 0, beH = tableY - beY - 2;
    D.beaker(bx, beY, bw, beH, { level: 0.62, liquid: col, t, ticks: 5 });
    const liqTop = beY + beH * (1 - 0.62);
    // 금속 막대/전선 (위에서 매달림)
    if (k === 'zn') {
      const pw = bw * 0.22, px = cx - pw / 2, py0 = B.y + B.h * 0.08, ph2 = beY + beH * 0.78 - py0;
      ctx.fillStyle = '#6b7280'; rr(cx - 3, B.y + 24, 6, py0 - B.y - 20, 3).fill();
      D.shadow(() => { const gg = ctx.createLinearGradient(px, 0, px + pw, 0); gg.addColorStop(0, '#b4bdc9'); gg.addColorStop(1, '#8a95a5'); ctx.fillStyle = gg; rr(px, py0, pw, ph2, 4).fill(); }, { blur: 4, y: 2 });
      ctx.save(); ctx.beginPath(); ctx.rect(px, liqTop, pw, py0 + ph2 - liqTop); ctx.clip(); plateDeposit(px, liqTop, pw, py0 + ph2 - liqTop, prog, '#b4532a', 3); ctx.restore();
      D.text(cx + pw / 2 + 8, liqTop - 6, '아연판 Zn', { size: 13, weight: 800, color: '#475569', align: 'left' });
    } else {
      const wx = cx, wy0 = B.y + B.h * 0.08, wy1 = beY + beH * 0.8;
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wx, B.y + 24); ctx.lineTo(wx, wy0); ctx.stroke();
      const cuCol = mixc('#c8743a', '#b0653a', 0.5);
      ctx.strokeStyle = cuCol; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(wx, wy0); ctx.lineTo(wx, wy1 - 20); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 20; i++) { const yy = wy1 - 20 + i * 1.0, xx = wx + Math.sin(i * 0.6) * 10; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      // 은 결정 가지
      const nSeg = Math.round(AGTREE.length * sm(prog)), baseY = wy1 - 2, sc = Math.min(bw, 220) * 0.6;
      ctx.save(); ctx.beginPath(); ctx.rect(bx + 4, liqTop, bw - 8, beH); ctx.clip();
      ctx.strokeStyle = '#eef2f7'; ctx.lineCap = 'round';
      for (let i = 0; i < nSeg; i++) { const sg = AGTREE[i]; ctx.lineWidth = Math.max(1.5, 3.4 - sg.depth * 0.6); ctx.strokeStyle = sg.depth % 2 ? '#e2e8f0' : '#f8fafc'; ctx.beginPath(); ctx.moveTo(wx - sc * 0.3 + sg.x * sc * 0.75 + 0, baseY + sg.y * sc * 0.8); ctx.lineTo(wx - sc * 0.3 + sg.x2 * sc * 0.75, baseY + sg.y2 * sc * 0.8); ctx.stroke(); }
      ctx.restore();
      D.text(wx + 16, liqTop - 6, '구리선 Cu', { size: 13, weight: 800, color: '#9a3412', align: 'left' });
    }
    D.text(cx, B.y + 30, k === 'zn' ? '아연판을 황산 구리(Ⅱ) 수용액(Cu²⁺)에 넣어요' : '구리선을 질산 은 수용액(Ag⁺)에 넣어요', { size: PHONE ? 13.5 : 14.5, weight: 800, color: '#4c1d95', align: 'center' });
    // 관찰 결과 메모
    const memo = k === 'zn' ? [['푸른색', prog > 0.5 ? '옅어졌어요' : '진해요'], ['아연판', prog > 0.3 ? '붉은 구리가 붙어요' : '은회색']] : [['구리선', prog > 0.3 ? '가지 모양 은이 자라요' : '붉은색'], ['용액', prog > 0.5 ? '푸른색으로 변해요' : '무색']];
    if (prog > 0.02) memo.forEach((m, i) => D.label(B.x + B.w / 2, B.y + B.h * (ph ? 0.15 : 0.15) + i * 30, m[0] + ': ' + m[1], { bg: '#7c3aed', size: ph ? 12.5 : 13.5 }));
  }
  function benchPanel(k, t) {
    const R = LAY().P, s = SIMS[k];
    const sol = k === 'zn' ? mixc('#e8f5ff', '#7cc7f6', ionsLeft(s, 'Cu', s.prog) / 4) : mixc('#f1f5f9', '#9fd0f3', countQ(s, 'Cu', 2, s.prog) / 2);
    return drawIonPanel(R, s, { t, eq: k === 'zn' ? 'Zn + Cu²⁺ → Zn²⁺ + Cu' : 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag', showE: BENCH.showE, solution: sol, plate: k === 'zn' ? '#aab3c0' : '#d9a074',
      legendItems: k === 'zn' ? [{ c: VIS['Zn,0'].c, t: '아연 Zn' }, { c: VIS['Cu,2'].c, t: 'Cu²⁺' }, { e: 1, t: '전자' }] : [{ c: VIS['Cu,0'].c, t: '구리 Cu' }, { c: VIS['Ag,1'].c, t: 'Ag⁺' }, { e: 1, t: '전자' }] });
  }

  /* ======================================================
     ② 전자를 끌어 옮기기 (직접 조작)
     ====================================================== */
  const MV = { zn: [], ions: [], drag: null, done: false, msg: '', msgT: 0, t: 0 };
  function mvLay() {
    return PHONE
      ? { sc: { x: 10, y: 34, w: 500, h: 556 }, plate: { x: 10, y: 470, w: 500, h: 120 }, eq: { x: 10, y: 604, w: 500, h: 206 }, zn: [[130, 522], [330, 522]], slots: [[230, 522], [430, 522]], ions: [[190, 190], [370, 270]], r: 32 }
      : { sc: { x: 12, y: 40, w: 560, h: 508 }, plate: { x: 12, y: 410, w: 560, h: 138 }, eq: { x: 584, y: 40, w: 204, h: 508 }, zn: [[130, 466], [340, 466]], slots: [[235, 466], [445, 466]], ions: [[190, 190], [400, 250]], r: 34 };
  }
  function mvInit() {
    const L = mvLay(); MV.done = false; MV.drag = null; MV.msg = ''; MV.msgT = 0;
    MV.zn = L.zn.map((p, i) => ({ x: p[0], y: p[1], by: p[1], lost: 0, away: 0, e: [0, 1].map((k) => { const a = -2.35 + k * 1.55, hx = p[0] + Math.cos(a) * (L.r + 20), hy = p[1] + Math.sin(a) * (L.r + 20); return { st: 'home', x: hx, y: hy, hx, hy, tw: null }; }) }));
    MV.ions = L.ions.map((p, i) => ({ x: p[0], y: p[1], got: 0, done: false, slot: L.slots[i], fall: 0, bob: i * 2 }));
  }
  const mvMoved = () => MV.zn.reduce((s, z) => s + z.e.filter((e) => e.st === 'gone').length, 0);
  const mvPend = () => MV.zn.reduce((s, z) => s + z.e.filter((e) => e.st === 'fly').length, 0);
  function mvSay(m, bad) { MV.msg = m; MV.msgT = 3; MV.bad = !!bad; }
  function mvDown(p) {
    for (const z of MV.zn) for (const e of z.e) { if (e.st === 'home' && Math.hypot(p.x - e.x, p.y - e.y) <= 30) { MV.drag = { z, e, ox: p.x - e.x, oy: p.y - e.y }; e.st = 'drag'; Sound.click(); return true; } }
    return false;
  }
  function mvMove(p) { const d = MV.drag; if (!d) return; d.e.x = p.x - d.ox; d.e.y = p.y - d.oy; }
  function mvUp(p) {
    const d = MV.drag; if (!d) return; MV.drag = null; const e = d.e, L = mvLay();
    const ion = MV.ions.find((o) => Math.hypot(p.x - o.x, p.y - o.y) <= L.r + 26);
    if (ion && !ion.done && ion.got < 2) {
      e.st = 'fly'; ion.got++;           // 받을 전자를 미리 예약
      SciSim.tween(e, { x: ion.x, y: ion.y }, { duration: 0.35, ease: 'outCubic', onDone: () => {
        e.st = 'gone'; Sound.tick(); parts.burst(ion.x, ion.y, { count: 10, speed: 110, size: 3.5, life: 0.6, colors: ['#facc15', '#fff'] });
        if (ion.got >= 2 && !ion.done) { ion.done = true; Sound.success(); parts.burst(ion.x, ion.y, { count: 18, speed: 160, size: 4 }); mvSay('Cu²⁺가 전자 2개를 받아 구리 원자(Cu)가 되었어요!'); }
        if (d.z.e.every((x) => x.st === 'gone') && !d.z.dis) { d.z.dis = true; mvSay('아연 원자가 전자 2개를 잃고 아연 이온(Zn²⁺)이 되어 녹아요'); }
        if (MV.zn.every((z) => z.e.every((x) => x.st === 'gone')) && !MV.done) { MV.done = true; ctlUpdate(); }
      } });
    } else {
      let m = '전자는 (+)전하를 띤 구리 이온(Cu²⁺) 위에 놓아요';
      if (ion && (ion.done || ion.got >= 2)) m = '이 구리 이온은 이미 전자를 2개 받았어요';
      else if (MV.zn.some((z) => Math.hypot(p.x - z.x, p.y - z.y) <= L.r + 14)) m = '아연 원자 쪽이 아니라 구리 이온(Cu²⁺) 쪽으로 옮겨요';
      mvSay(m, true); Sound.fail(); e.st = 'back'; e.sh = 0.4;
      SciSim.tween(e, { x: e.hx, y: e.hy }, { duration: 0.4, ease: 'outBack', onDone: () => { e.st = 'home'; } });
    }
  }
  function drawMove(t, dt) {
    const L = mvLay(), r = L.r; MV.t += dt;
    D.text(PHONE ? 260 : 292, PHONE ? 22 : 28, '노란 전자를 끌어 구리 이온(Cu²⁺)에게 옮겨요', { size: PHONE ? 14 : 16.5, weight: 800, color: '#4c1d95' });
    // 용액
    const sc = L.sc, pl = L.plate;
    const left = MV.ions.filter((o) => !o.done).length / 2;
    D.shadow(() => { const g = ctx.createLinearGradient(0, sc.y, 0, pl.y); g.addColorStop(0, mixc('#e8f5ff', '#bfe5fc', left)); g.addColorStop(1, mixc('#e6f2fb', '#8fd0f6', left)); ctx.fillStyle = g; rr(sc.x, sc.y, sc.w, sc.h, 16).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(sc.x, sc.y, sc.w, sc.h, 16).clip();
    // 판
    const gp = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h); gp.addColorStop(0, '#b3bcc8'); gp.addColorStop(1, '#8b95a4'); ctx.fillStyle = gp; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(pl.x, pl.y, pl.w, 5);
    ctx.restore();
    D.text(sc.x + 12, pl.y + pl.h - 12, '아연판 (Zn)', { size: 13, weight: 800, color: '#fff', align: 'left' });
    D.text(sc.x + 12, sc.y + 24, '구리(Ⅱ) 이온이 든 수용액', { size: 13, weight: 800, color: '#0369a1', align: 'left' });
    // 아연 원자
    MV.zn.forEach((z, i) => {
      const lost = z.e.filter((e) => e.st === 'gone' || e.st === 'fly').length, gone = z.e.every((e) => e.st === 'gone');
      if (gone) { z.away = approach(z.away, 1, dt, 3); z.x = lerp(L.zn[i][0], L.zn[i][0] + 30, z.away); z.y = lerp(L.zn[i][1], L.ions[i][1] + 60 + i * 20, sm(z.away)); }
      const q = lost >= 2 ? 2 : 0, v = visOf('Zn', gone ? 2 : 0, 'electron');
      D.sphere(z.x, z.y, r * (gone ? 0.8 : 1), v.c, { shadow: true, text: v.t, textColor: '#334155', textScale: v.t.length > 2 ? 0.8 : 1.05 });
      if (!gone) D.text(z.x, z.y + r + 18, 'Zn', { size: 12.5, weight: 800, color: '#fff' });
    });
    // 구리 이온 / 구리 원자
    MV.ions.forEach((o, i) => {
      if (o.done) { o.fall = approach(o.fall, 1, dt, 2.4); }
      const x = lerp(o.x, o.slot[0], sm(o.fall)), y = lerp(o.y, o.slot[1], sm(o.fall)) + (o.done ? 0 : (RM ? 0 : Math.sin(t * 1.6 + o.bob) * 3));
      const v = visOf('Cu', o.done ? 0 : 2, 'electron'), rad = r * (o.done ? 0.95 : 0.8);
      const need = !o.done && MV.drag; if (need) D.ring(x, y, r + 8, t, { color: '#facc15', speed: 1.1, width: 2.5 });
      D.sphere(x, y, rad, v.c, { shadow: true, text: v.t, textColor: '#fff', textScale: v.t.length > 2 ? 0.74 : 1 });
      if (!o.done) { const need2 = 2 - o.got; D.label(x, y - rad - 16, need2 > 0 ? '전자 ' + need2 + '개 필요' : '전자 받는 중', { bg: 'rgba(30,41,59,.85)', size: 12.5 }); }
      else D.text(x, y + rad + 16, 'Cu', { size: 12.5, weight: 800, color: '#9a3412' });
    });
    // 전자
    MV.zn.forEach((z) => z.e.forEach((e, k) => {
      if (e.st === 'gone') return;
      const gone = z.e.every((x) => x.st === 'gone');
      if (e.st === 'home') { const a = -2.35 + k * 1.55 + (RM ? 0 : Math.sin(t * 1.5 + k) * 0.12); e.x = z.x + Math.cos(a) * (r + 20); e.y = z.y + Math.sin(a) * (r + 20); }
      if (e.st === 'home') D.ring(e.x, e.y, 15, t + k * 0.3, { color: '#facc15', speed: 0.9, width: 2 });
      if (e.st === 'drag' || e.st === 'fly') D.glow(e.x, e.y, 22, '#facc15', 0.7);
      electronDot(e.x + (e.sh > 0 ? Math.sin(e.sh * 50) * 4 : 0), e.y, e.st === 'drag' ? 12 : 10);
      if (e.sh > 0) e.sh = Math.max(0, e.sh - dt);
    }));
    if (MV.msgT > 0) { MV.msgT -= dt; ctx.save(); ctx.globalAlpha = clamp(MV.msgT / 0.4, 0, 1); D.label(sc.x + sc.w / 2, sc.y + sc.h * (PHONE ? 0.5 : 0.62) - 30, MV.msg, { bg: MV.bad ? '#b91c1c' : '#15803d', size: PHONE ? 12.5 : 14 }); ctx.restore(); }
    // 식 칸
    const E = L.eq;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(E.x, E.y, E.w, E.h, 16).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rr(E.x, E.y, E.w, E.h, 16).stroke();
    D.text(E.x + E.w / 2, E.y + 28, '전자의 이동 기록', { size: 15.5, weight: 800, color: '#4c1d95' });
    const zdone = MV.zn.filter((z) => z.e.every((e) => e.st === 'gone')).length, cdone = MV.ions.filter((o) => o.done).length, mv = mvMoved();
    const rows = [['Zn 원자', zdone + ' / 2개가 이온으로', '#64748b'], ['Cu²⁺ 이온', cdone + ' / 2개가 원자로', '#c2410c'], ['옮긴 전자', mv + ' / 4개', '#a16207']];
    rows.forEach((rw, i) => { const y = E.y + 70 + i * (PHONE ? 44 : 80); if (PHONE) { D.text(E.x + 20, y, rw[0], { size: 14, weight: 800, color: '#334155', align: 'left' }); D.text(E.x + E.w - 20, y, rw[1], { size: 14, weight: 800, color: rw[2], align: 'right' }); } else { D.text(E.x + E.w / 2, y, rw[0], { size: 14, weight: 800, color: '#334155' }); D.text(E.x + E.w / 2, y + 26, rw[1], { size: 15, weight: 800, color: rw[2] }); } });
    if (MV.done) D.label(E.x + E.w / 2, E.y + E.h - (PHONE ? 30 : 40), '전자 4개를 모두 옮겼어요', { bg: '#15803d', size: 13.5 });
  }

  /* ======================================================
     ③ 규칙성: 두 관점 + 전자 장부
     ====================================================== */
  function dualLay() {
    return PHONE ? { a: { x: 10, y: 6, w: 500, h: 402 }, b: { x: 10, y: 412, w: 500, h: 402 } } : { a: { x: 10, y: 10, w: 392, h: 540 }, b: { x: 408, y: 10, w: 382, h: 540 } };
  }
  function drawDual(t, dt) {
    const L = dualLay(), s = SIMS.mg, prog = s.prog;
    const a = drawIonPanel(L.a, s, { t, mode: 'oxygen', title: '👁️ 산소의 눈', eq: '2Mg + O₂ → 2MgO', legendItems: [{ c: VIS['Mg,0'].c, t: '마그네슘' }, { c: VIS['O,0'].c, t: '산소 원자' }] });
    const b = drawIonPanel(L.b, s, { t, mode: 'electron', title: '👁️ 전자의 눈', eq: 'Mg → Mg²⁺ + 2e⁻', attract: true, legendItems: [{ c: VIS['Mg,0'].c, t: 'Mg' }, { c: VIS['O,0'].c, t: 'O' }, { e: 1, t: '전자' }] });
    const f1k = sleft(prog, 0.55, 0.8);
    if (prog >= 0.75) { D.label(L.a.x + L.a.w / 2, L.a.y + L.a.h - 46, '산소를 얻었어요 → 산화', { bg: '#7c3aed', size: PHONE ? 13 : 14, }); D.label(L.b.x + L.b.w / 2, L.b.y + L.b.h - 46, '전자를 잃었어요 → 산화', { bg: '#7c3aed', size: PHONE ? 13 : 14 }); }
    if (prog >= 0.98) D.text(L.b.x + L.b.w / 2, L.b.y + 96, '산소 O는 전자 2개를 얻어 O²⁻', { size: 13, weight: 800, color: '#be185d' });
  }

  /* --- 전자 장부 (저울) --- */
  const LG = { cu: 1, ag: 1, ang: 0, bal: { 1: false, 2: false }, t: 0, flash: 0 };
  const lgLost = () => 2 * LG.cu, lgGot = () => LG.ag, lgBalanced = () => lgLost() === lgGot();
  function lgRecord() { if (lgBalanced() && LG.cu <= 2) { if (!LG.bal[LG.cu]) { LG.bal[LG.cu] = true; Sound.success(); LG.flash = 1; } } }
  function drawLedger(t, dt) {
    LG.t += dt;
    const diff = lgLost() - lgGot(), tgt = clamp(-diff * 0.05, -0.28, 0.28);
    LG.ang = approach(LG.ang, tgt, dt, 4);
    const px = VW / 2, py = PHONE ? 230 : 170, arm = PHONE ? 148 : 250, hang = PHONE ? 110 : 120;
    D.text(VW / 2, PHONE ? 26 : 30, 'Cu + Ag⁺ 반응의 전자 장부: 잃은 전자 = 얻은 전자', { size: PHONE ? 14 : 17, weight: 800, color: '#4c1d95' });
    // 받침
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(px - 36, py + hang + 150 - (PHONE ? 20 : 0)); ctx.lineTo(px + 36, py + hang + 150 - (PHONE ? 20 : 0)); ctx.lineTo(px + 8, py); ctx.lineTo(px - 8, py); ctx.closePath(); ctx.fill();
    const lx = px - Math.cos(LG.ang) * arm, ly = py - Math.sin(LG.ang) * arm, rx = px + Math.cos(LG.ang) * arm, ry = py + Math.sin(LG.ang) * arm;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
    D.sphere(px, py, 12, '#64748b', { gloss: true });
    const pan = (x, y, col, label, n, kind) => {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 70, y + hang); ctx.moveTo(x, y); ctx.lineTo(x + 70, y + hang); ctx.stroke();
      D.shadow(() => { ctx.fillStyle = rgba(col, 0.14); rr(x - 100, y + hang, 200, PHONE ? 116 : 122, 14).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(x - 100, y + hang, 200, PHONE ? 116 : 122, 14).stroke();
      D.text(x, y + hang + (PHONE ? 100 : 108), label, { size: 13, weight: 800, color: col });
      for (let i = 0; i < n; i++) {
        const c = i % 4, rw = Math.floor(i / 4), cx2 = x - 66 + c * 44, cy2 = y + hang + 30 + rw * 48;
        if (kind === 'cu') { const v = VIS['Cu,0']; D.sphere(cx2, cy2, 17, v.c, { text: 'Cu', textScale: 0.95 }); electronDot(cx2 - 12, cy2 - 20, 6.5); electronDot(cx2 + 12, cy2 - 20, 6.5); }
        else { const v = VIS['Ag,1']; D.sphere(cx2, cy2, 15, v.c, { text: 'Ag⁺', textColor: '#334155', textScale: 0.78 }); ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx2, cy2 - 19, 6.5, 0, TAU); ctx.stroke(); ctx.restore(); }
      }
    };
    pan(lx, ly, '#c2410c', '구리 ' + LG.cu + '개: 각각 전자 2개 내놓음', LG.cu, 'cu');
    pan(rx, ry, '#4f46e5', '은 이온 ' + LG.ag + '개: 각각 전자 1개 필요', LG.ag, 'ag');
    // 균형일 때 전자 흐름
    const bal = lgBalanced();
    if (bal) {
      const n = lgLost();
      for (let i = 0; i < n; i++) { const u = (t * 0.5 + i / n) % 1, x0 = lx + 4, y0 = ly + hang + 6, x1 = rx - 4, y1 = ry + hang + 6, xm = (x0 + x1) / 2, ym = Math.min(y0, y1) - 130; const xx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * xm + u * u * x1, yy = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * ym + u * u * y1; electronDot(xx, yy, 7); }
      D.glow(px, py + 30, 90, '#22c55e', 0.35);
    }
    // 장부 글
    const ty = PHONE ? 560 : 440;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(16, ty, VW - 32, PHONE ? 220 : 108, 14).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = bal ? '#16a34a' : '#ddd6fe'; ctx.lineWidth = bal ? 3 : 2; rr(16, ty, VW - 32, PHONE ? 220 : 108, 14).stroke();
    if (PHONE) {
      D.text(VW / 2, ty + 34, '잃은 전자 = 2 × ' + LG.cu + ' = ' + lgLost() + '개', { size: 17, weight: 800, color: '#c2410c' });
      D.text(VW / 2, ty + 70, '얻은 전자 = 1 × ' + LG.ag + ' = ' + lgGot() + '개', { size: 17, weight: 800, color: '#4f46e5' });
    } else {
      D.text(VW * 0.27, ty + 38, '잃은 전자 = 2 × ' + LG.cu + ' = ' + lgLost() + '개', { size: 18, weight: 800, color: '#c2410c' });
      D.text(VW * 0.73, ty + 38, '얻은 전자 = 1 × ' + LG.ag + ' = ' + lgGot() + '개', { size: 18, weight: 800, color: '#4f46e5' });
    }
    const co = (n) => (n === 1 ? '' : n);
    const eq = bal ? co(LG.cu) + 'Cu + ' + co(LG.ag) + 'Ag⁺ → ' + co(LG.cu) + 'Cu²⁺ + ' + co(LG.ag) + 'Ag' : '전자 수가 같아야 반응식이 완성돼요';
    D.label(VW / 2, ty + (PHONE ? 118 : 74), eq, { bg: bal ? '#15803d' : '#64748b', size: PHONE ? 14 : 15.5 });
    if (PHONE) D.text(VW / 2, ty + 160, bal ? '잃은 전자 수 = 얻은 전자 수 ✓' : (diff > 0 ? '전자가 남아요: 은 이온을 늘려요' : '전자가 모자라요: 은 이온을 줄이거나 구리를 늘려요'), { size: 13.5, weight: 700, color: bal ? '#15803d' : '#b45309' });
    else D.text(VW / 2, ty + 100, bal ? '' : (diff > 0 ? '전자가 남아요: 은 이온을 늘려요' : '전자가 모자라요: 은 이온을 줄이거나 구리를 늘려요'), { size: 13, weight: 700, color: '#b45309' });
    const ck = (n) => (LG.bal[n] ? '✅' : '⬜');
    D.text(VW / 2, ty + (PHONE ? 196 : 98) + (PHONE ? 0 : 0), '', { size: 1 });
    if (PHONE) D.text(VW / 2, ty + 196, '맞춘 기록: 구리 1개 ' + ck(1) + ' · 구리 2개 ' + ck(2), { size: 13.5, weight: 800, color: '#475569' });
    else D.text(VW - 30, ty + 98, '기록: 구리 1개 ' + ck(1) + ' · 구리 2개 ' + ck(2), { size: 13.5, weight: 800, color: '#475569', align: 'right' });
  }

  function boardCheck(b, want) {
    const un = b.cards.filter((c) => !c.zone).length;
    if (un) return '아직 놓지 않은 카드가 <b>' + un + '장</b> 있어요. 모든 카드를 칸에 놓은 뒤 확인해요.';
    const bad = b.cards.filter((c) => c.zone !== want(c));
    b.cards.forEach((c) => { const isBad = bad.includes(c); if (isBad && c.badge !== '✗') c.shake = 0.45; c.badge = isBad ? '✗' : ''; c.badgeColor = '#dc2626'; });
    if (bad.length) return '<b>' + bad.length + '장</b>이 알맞지 않은 칸에 있어요. ✗ 표시가 붙은 카드를 다시 생각해 봐요.';
    return true;
  }
  /* ======================================================
     ④ 생활 속 변화 카드 분류
     ====================================================== */
  const LCARDS = [
    { id: 'p1', label: '광합성의 이산화 탄소', t: 'gain', why: '이산화 탄소가 전자를 얻어(산소는 잃어) 포도당이 돼요 → 환원' },
    { id: 'p2', label: '광합성의 물', t: 'lose', why: '물에서 전자가 떠나 산소 기체가 나와요 → 산화' },
    { id: 'r1', label: '세포 호흡의 포도당', t: 'lose', why: '포도당이 전자를 잃고(산소를 얻어) 이산화 탄소가 돼요 → 산화' },
    { id: 'r2', label: '세포 호흡의 산소', t: 'gain', why: '산소가 전자를 얻어 물이 돼요 → 환원' },
    { id: 'f1', label: '연료 연소의 산소', t: 'gain', why: '연료가 탈 때 산소는 전자를 얻어요 → 환원 (연료는 산화)' },
    { id: 'i1', label: '철의 제련의 철광석', t: 'gain', why: '철 이온이 전자를 얻어 철이 돼요 → 환원' },
    { id: 'i2', label: '녹슬 때의 철', t: 'lose', why: '철이 전자를 잃고 산화 철이 돼요 → 산화' },
    { id: 'a1', label: '갈변하는 사과 속 물질', t: 'lose', why: '사과 속 물질이 공기 중 산소와 만나 전자를 잃어요 → 산화' },
    { id: 'v1', label: '갈변을 늦추는 비타민 C', t: 'lose', why: '비타민 C가 대신 전자를 잃어(산화되어) 사과를 지켜요' },
    { id: 's1', label: '검게 변하는 은 식기의 은', t: 'lose', why: '은이 전자를 잃고 황 화합물이 되어 검게 변해요 → 산화' },
  ];
  let lBoard = null; const LF = { sel: null };
  function buildLBoard() {
    const cw = PHONE ? 118 : 186, ch = PHONE ? 70 : 50;
    const pos = PHONE ? [{ x: 6, y: 312, w: 252, h: 270 }, { x: 262, y: 312, w: 252, h: 270 }] : [{ x: 12, y: 258, w: 388, h: 214 }, { x: 402, y: 258, w: 388, h: 214 }];
    const zones = [{ id: 'lose', label: '⬆️ 전자를 잃는 물질 (산화)', color: '#c2410c', fill: rgba('#c2410c', 0.08), line: rgba('#c2410c', 0.6), cap: 6, lsize: PHONE ? 12.5 : 15 }, { id: 'gain', label: '⬇️ 전자를 얻는 물질 (환원)', color: '#4f46e5', fill: rgba('#4f46e5', 0.08), line: rgba('#4f46e5', 0.6), cap: 6, lsize: PHONE ? 12.5 : 15 }].map((z, i) => Object.assign(z, pos[i]));
    lBoard = new Board({ zones, tray: PHONE ? { x: 12, y: 50, w: 496, cols: 4 } : { x: 14, y: 54, w: 772, cols: 4 }, cw, ch, gap: PHONE ? 6 : 8, vertical: PHONE,
      onTap: (c) => { LF.sel = LCARDS.find((x) => x.id === c.id); }, onPlace: (c) => { LF.sel = LCARDS.find((x) => x.id === c.id); lBoard.cards.forEach((k) => { k.badge = ''; }); ctlUpdate(); } });
    [0, 3, 6, 9, 1, 4, 7, 2, 5, 8].forEach((i) => lBoard.add({ id: LCARDS[i].id, label: LCARDS[i].label, t: LCARDS[i].t }));
    lBoard.layout(true);
  }
  function drawLife(t, dt) {
    D.text(VW / 2, PHONE ? 28 : 32, '🏠 생활 속 변화 카드를 전자의 이동으로 분류해요', { size: PHONE ? 14.5 : 17, weight: 800, color: '#4c1d95' });
    lBoard.update(dt); lBoard.draw(t);
    const c = LF.sel, y = PHONE ? 600 : 486; let txt = '카드를 누르면 설명이 나와요. 전자를 잃으면 산화, 얻으면 환원이에요.', bd = '#ddd6fe';
    if (c) { const card = lBoard.cards.find((x) => x.id === c.id), ok = card && card.zone === c.t; txt = c.label + (ok ? ': ' + c.why : ': 전자를 잃을까요, 얻을까요? 칸에 놓으면 설명이 나와요.'); bd = ok ? '#16a34a' : '#ddd6fe'; }
    note(14, y, VW - 28, txt, PHONE ? 13.5 : 14, { bg: 'rgba(255,255,255,.95)', border: bd });
    drawFlash(dt, PHONE ? 700 : 10);
  }

  /* ======================================================
     조작판 · 화면 전환
     ====================================================== */
  let MODE = 'bench', SUB = '', game = null, S_fade = 0, hintTimer2 = null, MODE_PREV = '';
  const MODE_LABEL = { bench: '🧪 금속과 이온', move: '⚡ 전자의 이동', rule: '📒 규칙성', life: '🏠 생활 속 변화' };
  const pctOf = (s) => Math.round(s.prog * 100);
  const HF = { a: { n: '', t: '' }, b: { n: '', t: '' } };
  function setMode(m, sub) {
    MODE = m; SUB = sub || (m === 'rule' ? (MODE_PREV === 'rule' && SUB ? SUB : 'dual') : ''); MODE_PREV = m; S_fade = 1;
    if (lBoard) { lBoard.drag = null; lBoard.hoverZone = null; }
    MV.drag = null; parts.clear();
    $('#tbLabel').textContent = MODE_LABEL[m];
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    const h = $('#stageHint'); if (h) h.classList.add('hide');
    ctlUpdate();
  }
  function ctlUpdate() {
    $('#modeSeg').hidden = !(game && game.free);
    const key = MODE + ':' + SUB;
    $$('#ctrlCard [data-show]').forEach((n) => { const k = n.dataset.show; n.hidden = !(k === MODE || k === key); });
    $$('#benchSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === BENCH.k));
    $$('#ruleSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB));
    const bs = SIMS[BENCH.k];
    $('#bRun1').textContent = bs.done ? '✓ 반응 완료' : bs.run ? '반응 중…' : '▶ 반응 시작'; $('#bRun1').disabled = bs.run || bs.done;
    $('#oBench').textContent = bs.done ? '완료' : bs.run ? pctOf(bs) + ' %' : '대기';
    $('#bElec').classList.toggle('on', BENCH.showE); $('#bElec').textContent = BENCH.showE ? '🔍 전자 숨기기' : '🔍 전자 보기';
    $('#note1').innerHTML = BENCH.k === 'zn' ? '아연판을 <b>푸른 황산 구리(Ⅱ) 수용액</b>에 넣어요. 용액의 푸른색과 아연판의 변화를 관찰해요.' : '구리선을 <b>무색 질산 은 수용액</b>에 넣어요. 구리선 둘레와 용액의 색을 관찰해요.';
    $('#oMove').textContent = mvMoved() + ' / 4';
    $('#note2').innerHTML = MV.done ? '전자를 모두 옮겼어요! 이제 위 식의 빈칸을 채우고 <b>✔ 확인하기</b>를 눌러요.' : '아연 원자 둘레의 <b>노란 전자</b>를 끌어서 구리 이온(Cu²⁺) 위에 놓아요.';
    const ds = SIMS.mg; $('#bRun3').textContent = ds.done ? '✓ 반응 완료' : ds.run ? '반응 중…' : '▶ 반응 보기'; $('#bRun3').disabled = ds.run || ds.done;
    $('#oDual').textContent = ds.done ? '완료' : ds.run ? pctOf(ds) + ' %' : '대기';
    $('#numCu').textContent = LG.cu; $('#numAg').textContent = LG.ag;
    $('#oLedger').textContent = lgBalanced() ? '균형 ✓' : '맞추기';
    $('#note3').innerHTML = '구리 원자 1개는 전자 <b>2개</b>를 내놓고, 은 이온 1개는 전자 <b>1개</b>를 받아요. 잃은 전자 수와 얻은 전자 수가 같아지도록 맞춰요.';
    $('#oLife').textContent = (lBoard ? lBoard.cards.filter((c) => c.zone).length : 0) + ' / 10';
  }
  $('#benchSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); BENCH.k = b.dataset.k; ctlUpdate(); } });
  $('#bRun1').addEventListener('click', () => { const s = SIMS[BENCH.k]; if (s.run || s.done) return; s.run = true; Sound.click(); ctlUpdate(); });
  $('#bReset1').addEventListener('click', () => { Sound.click(); simReset(BENCH.k); parts.clear(); ctlUpdate(); });
  $('#bElec').addEventListener('click', () => { Sound.click(); BENCH.showE = !BENCH.showE; ctlUpdate(); });
  $('#bReset2').addEventListener('click', () => { Sound.click(); mvInit(); ctlUpdate(); });
  $('#ruleSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); SUB = b.dataset.sub; ctlUpdate(); } });
  $('#bRun3').addEventListener('click', () => { const s = SIMS.mg; if (s.run || s.done) return; s.run = true; Sound.click(); ctlUpdate(); });
  $('#bReset3').addEventListener('click', () => { Sound.click(); simReset('mg'); parts.clear(); ctlUpdate(); });
  const lgSet = (k, d, lo, hi) => { LG[k] = clamp(LG[k] + d, lo, hi); Sound.tick(); lgRecord(); ctlUpdate(); };
  $('#cuMinus').addEventListener('click', () => lgSet('cu', -1, 1, 3)); $('#cuPlus').addEventListener('click', () => lgSet('cu', 1, 1, 3));
  $('#agMinus').addEventListener('click', () => lgSet('ag', -1, 1, 8)); $('#agPlus').addEventListener('click', () => lgSet('ag', 1, 1, 8));
  $('#bLifeReset').addEventListener('click', () => { Sound.click(); lBoard.reset(); LF.sel = null; ctlUpdate(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer2); hintTimer2 = setTimeout(() => h.classList.add('hide'), ms || 4500); }

  // 반쪽 반응식 칸
  function buildHalfRows() {
    const box = $('#halfRows'); box.innerHTML = '';
    const defs = [['a', 'Zn → Zn²⁺ +', 'e⁻'], ['b', 'Cu²⁺ +', 'e⁻ → Cu']];
    defs.forEach(([k, pre, post]) => {
      const row = document.createElement('div'); row.className = 'tag-row three'; row.style.gridTemplateColumns = '1fr';
      const lab = document.createElement('div'); lab.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap'; 
      const sp1 = document.createElement('span'); sp1.textContent = pre; lab.appendChild(sp1);
      const mk = (opts, key, aria) => { const s = document.createElement('select'); s.setAttribute('aria-label', aria); s.style.cssText = 'width:auto;min-width:64px'; opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = HF[k][key]; s.addEventListener('change', () => { s.classList.remove('ok', 'bad'); HF[k][key] = s.value; Sound.click(); }); s.dataset.k = k; s.dataset.f = key; return s; };
      lab.appendChild(mk([['', '?'], ['1', '1'], ['2', '2'], ['3', '3']], 'n', k === 'a' ? '내놓은 전자 수' : '받은 전자 수'));
      const sp2 = document.createElement('span'); sp2.textContent = post; lab.appendChild(sp2);
      lab.appendChild(mk([['', '고르기'], ['ox', '산화'], ['re', '환원']], 't', k === 'a' ? 'Zn의 변화' : 'Cu²⁺의 변화'));
      row.appendChild(lab); box.appendChild(row);
    });
  }
  function halfCheck() {
    if (!MV.done) return '먼저 <b>전자 4개를 모두 옮겨</b> 반응을 완성해요.';
    const ans = { a: { n: '2', t: 'ox' }, b: { n: '2', t: 're' } }; let miss = 0, wrong = 0;
    ['a', 'b'].forEach((k) => ['n', 't'].forEach((f) => { const v = HF[k][f]; if (!v) miss++; else if (v !== ans[k][f]) wrong++; }));
    $$('#halfRows select').forEach((s) => { const v = HF[s.dataset.k][s.dataset.f]; if (v) { s.classList.remove('ok', 'bad'); s.classList.add(v === ({ a: { n: '2', t: 'ox' }, b: { n: '2', t: 're' } })[s.dataset.k][s.dataset.f] ? 'ok' : 'bad'); } });
    if (miss) return '빈칸이 <b>' + miss + '개</b> 남았어요. 전자 수와 산화·환원을 모두 골라요.';
    if (wrong) return '<b>' + wrong + '곳</b>이 알맞지 않아요. 아연 원자 1개는 전자를 몇 개 내놓았는지, 전자를 잃으면 산화인지 환원인지 떠올려요.';
    return true;
  }

  function enterLevel(li) {
    simReset('zn'); simReset('ag'); simReset('mg'); BENCH.k = 'zn'; BENCH.showE = false; mvInit(); LG.cu = 1; LG.ag = 1; LG.ang = 0; LG.bal = { 1: false, 2: false };
    HF.a.n = HF.a.t = HF.b.n = HF.b.t = ''; buildHalfRows(); lBoard.reset(); LF.sel = null;
    if (li === 0) { setMode('bench'); showHint('▶ 반응 시작을 눌러 용액의 색과 금속의 변화를 관찰해요', 5500); }
    else if (li === 1) setMode('move');
    else if (li === 2) { setMode('rule', 'dual'); }
    else setMode('life');
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) { if (MODE === 'move') return mvDown(p); if (MODE === 'life') return lBoard.down(p); return false; },
    move(p) { if (MODE === 'move') mvMove(p); else if (MODE === 'life') lBoard.move(p); },
    up(p) { if (MODE === 'move') { mvUp(p); ctlUpdate(); } else if (MODE === 'life') { lBoard.up(p); ctlUpdate(); } },
    hover(p) {
      if (MODE === 'move') { for (const z of MV.zn) for (const e of z.e) if (e.st === 'home' && Math.hypot(p.x - e.x, p.y - e.y) <= 30) return 'grab'; return 'default'; }
      if (MODE === 'life') return lBoard.hit(p) ? 'grab' : 'default'; return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (MODE === 'bench') { const s = SIMS[BENCH.k]; setReadouts(['실험', BENCH.k === 'zn' ? '아연 + 황산 구리(Ⅱ)' : '구리 + 질산 은', '진행', pctOf(s) + ' %', BENCH.k === 'zn' ? '남은 푸른 Cu²⁺ 이온' : '생긴 Cu²⁺ 이온', BENCH.k === 'zn' ? ionsLeft(s, 'Cu', s.prog) + ' / 4개' : countQ(s, 'Cu', 2, s.prog) + ' / 2개']); }
    else if (MODE === 'move') setReadouts(['옮긴 전자', mvMoved() + ' / 4개', 'Zn²⁺가 된 아연', MV.zn.filter((z) => z.e.every((e) => e.st === 'gone')).length + ' / 2개', 'Cu가 된 이온', MV.ions.filter((o) => o.done).length + ' / 2개']);
    else if (MODE === 'rule' && SUB === 'dual') { const s = SIMS.mg; setReadouts(['반응', '2Mg + O₂ → 2MgO', '진행', pctOf(s) + ' %', '옮겨 간 전자', movedE(s, s.prog) + ' / ' + s.events.length + '개']); }
    else if (MODE === 'rule') setReadouts(['잃은 전자', lgLost() + '개', '얻은 전자', lgGot() + '개', '장부', lgBalanced() ? '맞음 ✓' : lgLost() > lgGot() ? '전자가 남음' : '전자가 모자람']);
    else setReadouts(['놓은 카드', lBoard.cards.filter((c) => c.zone).length + ' / 10', '전자를 잃는 쪽', lBoard.inZone('lose').length + '장', '전자를 얻는 쪽', lBoard.inZone('gain').length + '장']);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const ensure = (m, s) => { if (MODE !== m || (s && SUB !== s)) setMode(m, s); };
  const levels = [
    {
      title: '금속과 이온: 무엇이 바뀔까', short: '금속과 이온', icon: '🧪', phase: '실험',
      features: ['bench'],
      intro: '<p class="si-q">❓ 탐구 질문: 산소가 없는데도 산화·환원이라고 부를 수 있는 반응이 있을까? 무엇이 이동할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 원자가 전자를 잃거나 얻어 이온이 되는 것을 배웠어요(중2 \'이온의 형성\'). <b>앞 차시</b>에서는 산화를 산소를 얻는 것, 환원을 산소를 잃는 것으로 정리했어요.</div>' +
        '<p>금속판을 다른 금속 이온이 든 수용액에 넣으면 어떤 일이 일어날까요? <b>아연판 + 황산 구리(Ⅱ) 수용액</b>, <b>구리선 + 질산 은 수용액</b> 실험을 하고, 입자 모형으로 이온과 원자를 들여다봐요. (이온의 전하와 전자 개수만 사용해요.)</p>',
      setup() { enterLevel(0); },
      recap: '금속을 다른 금속의 이온이 든 용액에 넣으면, 금속이 이온이 되어 녹아 나오고 용액 속 이온은 금속 원자가 되어 달라붙어요.',
      summary: '<ul><li>아연판 + 황산 구리(Ⅱ) 수용액: 푸른색이 옅어지고 아연판에 <b>붉은 구리</b>가 붙어요. Zn + Cu²⁺ → Zn²⁺ + Cu</li><li>구리선 + 질산 은 수용액: 구리선에 <b>은</b>이 가지 모양으로 자라고 용액은 <b>푸른색</b>이 돼요. Cu + 2Ag⁺ → Cu²⁺ + 2Ag</li><li>금속 원자는 이온이 되고, 이온은 금속 원자가 돼요. 이때 이동하는 것이 <b>전자</b>예요.</li></ul>',
      missions: [
        {
          title: '두 가지 금속 실험',
          goal: '<b>아연 + Cu²⁺</b>와 <b>구리 + Ag⁺</b> 실험을 각각 <b>▶ 반응 시작</b>해 석출물을 관찰하세요. <b>🔍 전자 보기</b>를 눌러 입자 모형도 살펴봐요.',
          hint: '위쪽 단추로 두 실험을 바꿔 가며 시작해요. 반응이 끝날 때까지 기다려요.',
          setup() { ensure('bench'); },
          check: () => SIMS.zn.done && SIMS.ag.done, hold: 0.4,
          status: () => mark(SIMS.zn.done) + ' 아연 + Cu²⁺ · ' + mark(SIMS.ag.done) + ' 구리 + Ag⁺' + (SIMS.zn.run ? ' (' + pctOf(SIMS.zn) + ' %)' : SIMS.ag.run ? ' (' + pctOf(SIMS.ag) + ' %)' : ''),
          explain: '아연판에는 <b>붉은 구리</b>가, 구리선에는 <b>은 결정</b>이 붙었어요. 입자 모형에서 용액 속 이온이 금속 원자가 되어 붙고, 금속 원자는 이온이 되어 용액으로 녹아 들어가는 모습을 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '푸른색이 옅어지는 까닭',
          goal: '아연판을 넣은 황산 구리(Ⅱ) 수용액의 <b>푸른색이 옅어지는 까닭</b>은?',
          setup() { ensure('bench'); },
          choices: ['용액이 증발해서 양이 줄기 때문이다', '푸른색을 띠는 Cu²⁺ 이온이 구리 원자가 되어 줄어들기 때문이다', '아연판이 푸른 색소를 흡수하기 때문이다', '구리 원자가 용액에 더 많이 녹기 때문이다'],
          answer: 1,
          feedback: ['증발과는 상관없어요. 용액 속 이온의 종류가 바뀌어요.', '', '색소가 아니라 이온이 변해서 색이 바뀌어요.', '구리는 오히려 이온에서 원자가 되어 용액 밖(아연판)으로 나와요.'],
          explain: '용액의 푸른색은 <b>Cu²⁺ 이온</b> 때문이에요. Cu²⁺가 전자를 받아 구리 원자가 되어 아연판에 붙으니 이온 수가 줄어 색이 옅어져요. 아연 원자는 대신 Zn²⁺ 이온이 되어 용액에 녹아요(Zn²⁺는 무색).',
        },
      ],
    },
    {
      title: '전자의 이동: 직접 옮겨 보기', short: '전자 이동', icon: '⚡', phase: '모형',
      features: ['move'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 아연 원자는 Zn²⁺ 이온이 되어 녹고, Cu²⁺ 이온은 구리 원자가 되어 붙는 것을 봤어요. 그 사이에 <b>무엇이 오갔을까요?</b></div>' +
        '<p>아연 원자가 가진 <b>전자(노란 구슬)</b>를 끌어서 구리 이온 Cu²⁺에게 옮겨 보세요. 전자를 모두 옮기면 반쪽 반응식을 완성할 수 있어요.</p>',
      setup() { enterLevel(1); },
      recap: '아연은 전자 2개를 잃고 Zn²⁺가 되어(산화), Cu²⁺는 전자 2개를 얻어 구리 원자가 돼요(환원). 전자를 잃으면 산화, 얻으면 환원이에요.',
      summary: '<ul><li><b>산화 = 전자를 잃는 반응</b>, <b>환원 = 전자를 얻는 반응</b>.</li><li>Zn → Zn²⁺ + 2e⁻ (아연이 전자 2개를 잃음: 산화)</li><li>Cu²⁺ + 2e⁻ → Cu (구리 이온이 전자 2개를 얻음: 환원)</li><li>전체: Zn + Cu²⁺ → Zn²⁺ + Cu</li></ul>',
      missions: [
        {
          title: '전자를 옮기기',
          goal: '아연 원자의 <b>전자 4개</b>를 모두 끌어서 <b>Cu²⁺ 이온</b>에게 옮기세요. 이온마다 전자가 몇 개 필요한지 확인해요.',
          hint: '노란 전자를 눌러 끌고 가서 푸른 Cu²⁺ 이온 위에 놓아요. Cu²⁺ 하나에는 전자 2개가 필요해요.',
          setup() { ensure('move'); },
          check: () => MV.done, hold: 0.5,
          status: () => mark(mvMoved() >= 4) + ' 옮긴 전자 ' + mvMoved() + ' / 4 · ' + mark(MV.ions.filter((o) => o.done).length === 2) + ' 구리 원자 ' + MV.ions.filter((o) => o.done).length + ' / 2',
          explain: '전자 2개를 받은 Cu²⁺는 <b>구리 원자</b>가 되어 판에 붙었고, 전자 2개를 잃은 아연 원자는 <b>Zn²⁺ 이온</b>이 되어 녹아 나왔어요. 전자는 아연에서 구리 이온으로 옮겨 갔어요.',
        },
        {
          title: '반쪽 반응식 채우기',
          goal: '<b>Zn → Zn²⁺ + □e⁻</b>와 <b>Cu²⁺ + □e⁻ → Cu</b>의 빈칸(전자 수)과 산화·환원을 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아연 원자 1개가 내놓은 전자의 수와, Cu²⁺ 이온 1개가 받은 전자의 수를 떠올려요. 전자를 잃으면 산화, 얻으면 환원이에요.',
          manual: true,
          setup() { ensure('move'); },
          check: () => halfCheck(),
          explain: 'Zn → Zn²⁺ + <b>2</b>e⁻ 는 전자를 잃으므로 <b>산화</b>, Cu²⁺ + <b>2</b>e⁻ → Cu 는 전자를 얻으므로 <b>환원</b>이에요. 산화와 환원은 항상 동시에 일어나고, 아연이 잃은 전자 2개를 구리 이온이 그대로 받아요.',
        },
        {
          type: 'quiz', title: '전자와 산화·환원',
          goal: '아연 원자가 Zn²⁺ 이온으로 변할 때 일어나는 일로 알맞은 것은?',
          setup() { ensure('move'); },
          choices: ['전자를 얻으므로 환원된다', '전자를 잃으므로 산화된다', '전자를 잃으므로 환원된다', '전자 수는 변하지 않고 색만 변한다'],
          answer: 1,
          feedback: ['아연은 전자를 얻은 것이 아니라 잃었어요.', '', '전자를 잃는 것은 환원이 아니라 산화예요.', '이온이 되면 전자 수가 바뀌어요. 그래서 +2의 전하를 띠어요.'],
          explain: '<b>전자를 잃는 쪽이 산화</b>예요. 아연 원자는 전자 2개를 잃어 +2의 전하를 띤 Zn²⁺가 되었어요. 산소가 없어도 전자를 기준으로 산화·환원을 판단할 수 있어요.',
        },
      ],
    },
    {
      title: '규칙성: 산소와 전자, 그리고 전자의 수', short: '규칙성', icon: '📒', phase: '분석',
      features: ['rule'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자를 잃으면 산화, 얻으면 환원이라는 것을 알았어요. 그런데 앞 차시에서는 <b>산소를 얻으면 산화</b>라고 했어요. 두 설명은 어떻게 이어질까요?</div>' +
        '<p>마그네슘의 연소를 <b>산소의 눈</b>과 <b>전자의 눈</b>으로 동시에 보고, 잃은 전자 수와 얻은 전자 수가 늘 같다는 규칙을 <b>전자 장부</b>로 확인해요.</p>',
      setup() { enterLevel(2); },
      recap: '산소를 얻는 산화는 전자를 잃는 산화의 한 경우예요. 산화와 환원은 항상 동시에 일어나고, 잃은 전자 수와 얻은 전자 수는 같아요.',
      summary: '<ul><li>마그네슘 연소: 2Mg + O₂ → 2MgO. Mg → Mg²⁺ + 2e⁻ (산화), O₂ + 4e⁻ → 2O²⁻ (환원).</li><li>산소를 얻는 반응은 <b>전자를 잃는 반응</b>이기도 해요. 산소의 이동은 전자의 이동의 한 경우예요(산소가 전자를 끌어당겨요).</li><li>규칙: 산화와 환원은 <b>동시에</b> 일어나고 <b>잃은 전자 수 = 얻은 전자 수</b>. 예) Cu + 2Ag⁺ → Cu²⁺ + 2Ag (전자 2개 이동)</li></ul>',
      missions: [
        {
          title: '같은 반응, 두 개의 눈',
          goal: '<b>▶ 반응 보기</b>로 마그네슘 연소를 <b>산소의 눈</b>(왼쪽)과 <b>전자의 눈</b>(오른쪽)으로 동시에 끝까지 관찰하세요.',
          hint: '왼쪽에서는 산소 원자가 움직이고, 오른쪽에서는 같은 순간에 노란 전자가 마그네슘에서 산소로 옮겨 가요.',
          setup() { ensure('rule', 'dual'); },
          check: () => SIMS.mg.done, hold: 0.4,
          status: () => mark(SIMS.mg.run || SIMS.mg.done) + ' 반응 시작 · ' + mark(SIMS.mg.done) + ' 끝까지 관찰 (' + pctOf(SIMS.mg) + ' %)',
          explain: '왼쪽에서는 마그네슘이 <b>산소를 얻었고</b>, 오른쪽에서는 같은 순간 마그네슘이 <b>전자 2개를 잃었어요</b>. 두 눈으로 본 결론은 같아요. 마그네슘은 <b>산화</b>되었어요. 산소는 전자를 얻어 O²⁻가 되었으니 환원이에요.',
        },
        {
          title: '전자 장부 맞추기',
          goal: '구리 원자 <b>1개</b>와 <b>2개</b>일 때 각각 잃은 전자 수와 얻은 전자 수가 같도록 <b>은 이온 수</b>를 맞춘 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '구리 원자 1개는 전자 2개를 내놓고 은 이온 1개는 전자 1개를 받아요. 구리 1개일 때 은 이온 2개, 구리 2개일 때는 몇 개일까요?',
          manual: true,
          setup() { ensure('rule', 'ledger'); },
          check: () => {
            if (!LG.bal[1]) return '먼저 <b>구리 원자 1개</b>일 때 은 이온 수를 맞춰 보세요. 저울이 수평이 되면 성공이에요.';
            if (!LG.bal[2]) return '이번에는 <b>구리 원자를 2개</b>로 늘려서도 전자 수를 맞춰 봐요.';
            return true;
          },
          explain: '구리 1개는 전자 <b>2개</b>를 잃으므로 전자를 1개씩 받는 은 이온 <b>2개</b>가 필요해요(Cu + 2Ag⁺ → Cu²⁺ + 2Ag). 구리가 2개면 은 이온은 4개예요. <b>잃은 전자 수 = 얻은 전자 수</b>가 규칙이에요.',
        },
        {
          type: 'quiz', title: '이동한 전자 수',
          goal: 'Zn + 2Ag⁺ → Zn²⁺ + 2Ag 반응에서 <b>아연이 잃은 전자는 몇 개</b>이고, 이때 은 이온 쪽에서는 어떤 일이 일어날까요?',
          setup() { ensure('rule', 'ledger'); },
          choices: ['전자 1개를 잃고, 은 이온은 산화된다', '전자 2개를 잃고, 은 이온 2개가 그 전자를 받아 환원된다', '전자 2개를 잃고, 은 이온은 전자를 잃어 산화된다', '전자 4개를 잃고, 은 이온 2개가 2개씩 받는다'],
          answer: 1,
          feedback: ['아연은 Zn²⁺가 되므로 전자 2개를 잃어요.', '', '은 이온은 전자를 받아 은 원자가 되므로 환원이에요.', '아연은 전자 2개만 잃어요. 받는 쪽도 모두 합해 2개예요.'],
          explain: '아연 1개가 전자 <b>2개</b>를 잃고(산화), 은 이온 2개가 전자를 1개씩 받아 은 원자가 돼요(환원). 잃은 전자 2개 = 얻은 전자 2개이고, 산화와 환원은 <b>동시에</b> 일어났어요.',
        },
      ],
    },
    {
      title: '생활 속 변화: 전자의 눈으로 보기', short: '생활 속 변화', icon: '🏠', phase: '적용',
      features: ['life'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산화와 환원이 항상 짝으로 일어나고 전자 수가 같다는 규칙을 확인했어요. 이 규칙을 우리 주변의 변화에 적용해 봐요.</div>' +
        '<p>광합성, 세포 호흡, 연소, 철의 제련, 녹슮, 사과의 갈변, 은 식기의 변색에 나오는 물질을 <b>전자를 잃는 쪽</b>과 <b>전자를 얻는 쪽</b>으로 분류해요. 카드를 놓으면 까닭이 나와요.</p>',
      setup() { enterLevel(3); },
      recap: '광합성·호흡·연소·제련·녹슮 모두 전자가 이동하는 산화·환원이에요. 광합성과 호흡은 서로 반대 방향의 산화·환원이고, 전자가 이동할 때 에너지가 출입해요.',
      summary: '<ul><li>산화(전자를 잃음): 물(광합성) · 포도당(호흡) · 연료 · 철(녹슮) · 비타민 C · 은 식기의 은 · 사과 속 물질.</li><li>환원(전자를 얻음): 이산화 탄소(광합성) · 산소(호흡·연소) · 철광석(제련).</li><li><b>광합성</b>은 물이 산화되고 이산화 탄소가 환원되며 빛에너지를 저장하고, <b>세포 호흡</b>은 포도당이 산화되고 산소가 환원되며 에너지를 방출해요. 서로 <b>반대 방향</b>의 산화·환원이에요.</li><li>비타민 C는 사과 대신 산화되어 갈변을 늦춰요.</li></ul>',
      missions: [
        {
          title: '생활 속 카드 10장 분류',
          goal: '카드 <b>10장</b>을 <b>전자를 잃는 쪽(산화)</b>과 <b>전자를 얻는 쪽(환원)</b> 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '같은 반응에서 한쪽이 산화이면 다른 쪽은 환원이에요. 광합성에서 이산화 탄소는 산소를 잃어요(환원). 산소가 나오는 물은 산화예요.',
          manual: true,
          setup() { ensure('life'); },
          check: () => boardCheck(lBoard, (c) => c.t),
          explain: '연료·포도당·철·비타민 C·은은 전자를 <b>잃어</b> 산화되고, 산소·이산화 탄소·철광석은 전자를 <b>얻어</b> 환원돼요. 같은 반응에서 산화되는 물질과 환원되는 물질이 짝으로 있어요.',
        },
        {
          type: 'quiz', title: '광합성과 세포 호흡',
          goal: '<b>광합성</b>과 <b>세포 호흡</b>의 관계로 알맞은 것은?',
          setup() { ensure('life'); },
          choices: ['둘 다 포도당이 산화되는 같은 반응이다', '광합성은 물이 산화되고 이산화 탄소가 환원되며, 호흡은 포도당이 산화되고 산소가 환원되어 서로 반대 방향이다', '광합성에서는 산화만, 호흡에서는 환원만 일어난다', '둘 다 에너지를 방출하는 반응이다'],
          answer: 1,
          feedback: ['광합성에서는 포도당이 만들어져요(환원 쪽). 호흡에서만 포도당이 산화돼요.', '', '두 반응 모두 산화와 환원이 동시에 일어나요.', '광합성은 빛에너지를 흡수·저장하고, 호흡은 에너지를 방출해요.'],
          explain: '광합성에서는 물이 전자를 잃고(산화) 이산화 탄소가 전자를 얻어(환원) 에너지가 <b>저장</b>돼요. 세포 호흡은 반대로 포도당이 전자를 잃고(산화) 산소가 전자를 얻어(환원) 에너지를 <b>방출</b>해요.',
        },
        {
          type: 'quiz', title: '세 사례의 공통점',
          goal: '앞 차시의 세 사례(<b>광합성 · 화석 연료의 사용 · 철의 제련</b>)의 공통점을 <b>전자</b>로 말하면?',
          setup() { ensure('life'); },
          choices: ['모두 한 물질에서 다른 물질로 전자가 이동하는 산화·환원이고, 이때 에너지가 출입한다', '모두 전자가 새로 만들어져 늘어나는 반응이다', '모두 산화만 일어나고 환원은 일어나지 않는다', '모두 전자의 이동 없이 원자의 배열만 바뀌는 반응이다'],
          answer: 0,
          feedback: ['', '전자는 새로 생기지 않고 한 물질에서 다른 물질로 옮겨 가요.', '산화와 환원은 항상 동시에 일어나요.', '세 사례 모두 전자가 이동해요. 그래서 산화·환원이라고 해요.'],
          explain: '광합성(에너지 저장), 연료의 연소(에너지 방출), 철의 제련은 모두 <b>전자가 한 물질에서 다른 물질로 이동</b>하는 산화·환원이에요. 이 공통된 규칙으로 자연과 인류의 역사에 큰 변화를 가져온 반응과 생활 주변의 변화를 모두 설명할 수 있어요.',
        },
      ],
    },
  ];

  mvInit(); buildLBoard(); buildHalfRows();
  game = SciSim.game({
    simId: 'h1-redox-electron', mount: '#game', badge: '전자 이동 탐정', homeHref: '../../index.html#h1b',
    featureLabels: { bench: '🧪 금속·이온 실험 · 🔍 전자 보기', move: '⚡ 전자 끌어 옮기기 · 반쪽 반응식', rule: '📒 산소/전자 두 관점 · 전자 장부', life: '🏠 생활 속 카드 분류' },
    onFeatures() { ctlUpdate(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, lastKey = '';
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    simStep(dt);
    if (LG.flash > 0) LG.flash = Math.max(0, LG.flash - dt);
    const key = [MODE, SUB, BENCH.k, BENCH.showE, SIMS.zn.done, SIMS.ag.done, SIMS.mg.done, SIMS.zn.run, SIMS.ag.run, SIMS.mg.run, MV.done, mvMoved(), LG.cu, LG.ag, lBoard.cards.filter((c) => c.zone).length].join('|');
    if (key !== lastKey) { lastKey = key; ctlUpdate(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#f5f3ff'; ctx.fillRect(0, 0, VW, VH);
    if (MODE === 'bench') { drawBenchScene(LAY().B, BENCH.k, t, dt); benchPanel(BENCH.k, t); }
    else if (MODE === 'move') drawMove(t, dt);
    else if (MODE === 'rule') { if (SUB === 'dual') drawDual(t, dt); else drawLedger(t, dt); }
    else drawLife(t, dt);
    parts.draw(ctx);
    if (S_fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S_fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S_fade = RM ? 0 : approach(S_fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    SIMS, MV, LG, HF, BENCH, VW, VH, get game() { return game; }, get lBoard() { return lBoard; }, setMode, ctlUpdate, mvInit, mvMoved, mvLay, lgBalanced, lgRecord, LCARDS, buildHalfRows,
    get MODE() { return MODE; }, get SUB() { return SUB; },
    solveLife() { lBoard.cards.forEach((c) => { c.zone = c.t; }); lBoard.layout(true); ctlUpdate(); },
    finishMove() { MV.zn.forEach((z) => z.e.forEach((e) => { e.st = 'gone'; })); MV.ions.forEach((o) => { o.got = 2; o.done = true; }); MV.done = true; ctlUpdate(); },
  };
})();
