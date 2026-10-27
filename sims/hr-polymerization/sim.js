/* 단위체와 고분자 - 화학 반응의 세계 Ⅲ. 탄소 화합물과 반응 [12반응03-03]
   ① 모형: 에틸렌 사슬 모형 · 몰질량 28n  ② 탐구: 중합도 n과 물질의 상태 · 단위체/고분자/용도
   ③ 관찰: PET · 단백질 · 녹말이 연결될 때 물이 빠짐  ④ 적용: 단위체 카드 → 고분자 · 용도 · 합성/천연 분류.
   첨가 중합 · 축합 중합의 분류나 반응 메커니즘은 다루지 않고, 고분자가 단위체의 반복 결합이라는 점만 다뤄요. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';
  const GOODC = '#14a058', WARN = '#b45309', BADC = '#dc2626';
  const GC = { OH: '#2563eb', COOH: '#dc2626', NH2: '#16a34a' };
  const MINUS = '−';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣][^\s가-힣]*|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function textW(str, size, weight) { ctx.save(); ctx.font = D.font(size, weight || 700); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  /* 아래첨자가 있는 식: segs = ['문자열', ['sub', 'n'], ...] */
  function fx(x, y, size, color, segs, align, weight) {
    weight = weight || 800;
    const ps = segs.map((s) => (typeof s === 'string' ? { t: s, k: 0 } : { t: s[1], k: s[0] === 'sub' ? 1 : -1 }));
    ctx.save(); let w = 0;
    ps.forEach((p) => { ctx.font = D.font(p.k ? size * 0.7 : size, weight); p.w = ctx.measureText(p.t).width; w += p.w; });
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ps.forEach((p) => { ctx.font = D.font(p.k ? size * 0.7 : size, weight); ctx.fillText(p.t, cx, y + (p.k > 0 ? size * 0.2 : p.k < 0 ? -size * 0.38 : 0)); cx += p.w; });
    ctx.restore(); return w;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');
  const hasBatchim = (s) => { const c = String(s).charCodeAt(String(s).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  const josa = (s, withB, noB) => s + (hasBatchim(s) ? withB : noB);
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const S = { mode: '', gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  const MODE_LABEL = { chain: '⛓️ 에틸렌 사슬 모형', state: '🌡️ 중합도와 물질의 상태', match: '🔗 단위체 · 고분자 · 용도', build: '💧 물이 빠지며 연결되는 사슬', design: '🧩 고분자 설계' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb) tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 13, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad, align: o.align });
    ctx.restore(); return rc;
  }

  /* ---------- 원자 · 결합 그리기 ---------- */
  const ELC = { H: '#f8fafc', C: '#475569' };
  function atom(x, y, r, el) {
    const dark = el === 'H';
    D.sphere(x, y, r, ELC[el], { text: r >= 8.5 ? el : null, textColor: dark ? '#334155' : '#fff', textScale: 1.15, outline: dark ? '#94a3b8' : null, outlineWidth: 1.1, gloss: r > 6 });
  }
  function line(x1, y1, x2, y2, w, col) { ctx.strokeStyle = col || '#64748b'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  /* 에틸렌 한 단위: 탄소 2개(가운데 기준 좌우) + 수소 4개. oc=2 이중 결합 → oc=1 단일 결합 */
  function drawEth(cx, cy, P, dir, oc, o) {
    o = o || {};
    ctx.save();
    if (o.al != null) ctx.globalAlpha = o.al;
    const sc = o.sc || 1; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (o.shadow) { ctx.fillStyle = 'rgba(20,40,80,.16)'; ctx.beginPath(); ctx.ellipse(cx, cy + P * 0.62, P * 0.62, P * 0.11, 0, 0, TAU); ctx.fill(); }
    const ax = cx - dir * P / 4, bx = cx + dir * P / 4, second = clamp(oc - 1, 0, 1), off = P * 0.075 * second;
    ctx.save(); ctx.globalAlpha *= 1;
    line(ax, cy + off, bx, cy + off, Math.max(2.6, P * 0.075));
    if (second > 0.03) { ctx.globalAlpha *= second; line(ax, cy - off, bx, cy - off, Math.max(2.6, P * 0.075)); }
    ctx.restore();
    [[ax, -dir], [bx, dir]].forEach(([x, side]) => {
      const lean = side * 0.15 * P * second;
      [-1, 1].forEach((sg) => { const hx = x + lean, hy = cy + sg * 0.46 * P; line(x, cy, hx, hy, Math.max(2, P * 0.06)); });
    });
    [[ax, -dir], [bx, dir]].forEach(([x, side]) => {
      const lean = side * 0.15 * P * second;
      [-1, 1].forEach((sg) => atom(x + lean, cy + sg * 0.46 * P, P * 0.13, 'H'));
    });
    atom(ax, cy, P * 0.235, 'C'); atom(bx, cy, P * 0.235, 'C');
    ctx.restore();
  }

  /* ============ ① 사슬 모형 ============ */
  const CH_MAX = 30, CAP = PHONE ? 10 : 12;
  const CH = { units: [], queue: 0, qT: 0, drag: null, ret: null, shake: 0, sel: -1, massShow: 0, calc: NaN, calcOk: false, calcBad: false };
  const cGeo = () => PHONE
    ? { pool: { x: 16, y: 88, w: 448, h: 108 }, area: { x: 16, y: 204, w: 448, h: 264 }, P: 38, rowY: (r) => 262 + r * 80, pm: (i) => ({ x: 16 + 78 + i * 146, y: 88 + 56 }) }
    : { pool: { x: 24, y: 84, w: 178, h: 296 }, area: { x: 214, y: 84, w: 560, h: 296 }, P: 42, rowY: (r) => 152 + r * 84, pm: (i) => ({ x: 113, y: 84 + 78 + i * 82 }) };
  function unitTarget(i) {
    const G = cGeo(), row = Math.floor(i / CAP), col = i % CAP, dir = row % 2 === 0 ? 1 : -1, ci = dir > 0 ? col : CAP - 1 - col;
    const pad = (G.area.w - CAP * G.P) / 2;
    return { x: G.area.x + pad + (ci + 0.5) * G.P, y: G.rowY(row), dir, row };
  }
  const chN = () => CH.units.filter((u) => u.arr).length;
  function chAddUnit(sx, sy) {
    if (CH.units.length >= CH_MAX) { showHint('사슬이 가득 찼어요 (최대 ' + CH_MAX + '개). “사슬 비우기”로 다시 시작해요.', 3200); CH.shake = 0.4; Sound.fail(); return false; }
    const t = unitTarget(CH.units.length);
    CH.units.push({ x: sx, y: sy, oc: 2, link: 0, arr: false, sc: 1.18, dir: t.dir });
    Sound.tick(); updateCtl(); return true;
  }
  function chAdd(k) {
    const room = CH_MAX - CH.units.length - CH.queue;
    if (room <= 0) { showHint('사슬이 가득 찼어요 (최대 ' + CH_MAX + '개). “사슬 비우기”로 다시 시작해요.', 3200); CH.shake = 0.4; Sound.fail(); return; }
    CH.queue += Math.min(k, room); CH.qT = 0;
  }
  function chReset() { CH.units = []; CH.queue = 0; CH.drag = null; CH.ret = null; updateCtl(); }
  function stepChain(dt) {
    if (CH.queue > 0) {
      CH.qT -= dt;
      if (CH.qT <= 0) { const p = cGeo().pm(0); if (chAddUnit(p.x, p.y)) CH.queue--; else CH.queue = 0; CH.qT = RM ? 0.02 : 0.12; }
    }
    CH.units.forEach((u, i) => {
      const t = unitTarget(i);
      u.x = ap(u.x, t.x, dt, RM ? 60 : 9); u.y = ap(u.y, t.y, dt, RM ? 60 : 9); u.sc = ap(u.sc, 1, dt, 9);
      if (!u.arr && Math.hypot(u.x - t.x, u.y - t.y) < 2.5) {
        u.arr = true; Sound.tick();
        parts.burst(t.x, t.y, { count: 9, speed: 80, size: 2.6, colors: ['#a78bfa', '#c4b5fd', '#ffffff'] });
      }
      const open = i > 0 ? u.arr : (CH.units.length > 1 && CH.units[1].arr);
      u.oc = ap(u.oc, open ? 1 : 2, dt, RM ? 60 : 5);
      u.link = ap(u.link, u.arr && i > 0 ? 1 : 0, dt, 9);
    });
    if (CH.ret) { const r = CH.ret; r.x = ap(r.x, r.tx, dt, 14); r.y = ap(r.y, r.ty, dt, 14); if (Math.hypot(r.x - r.tx, r.y - r.ty) < 3) CH.ret = null; }
    CH.massShow = ap(CH.massShow, 28 * chN(), dt, 9); if (Math.abs(CH.massShow - 28 * chN()) < 0.6) CH.massShow = 28 * chN();
    CH.shake = Math.max(0, CH.shake - dt);
  }
  const EV = [
    { ico: '🛍️', name: '비닐봉지', poly: '폴리에틸렌', mono: '에틸렌' },
    { ico: '🧴', name: '페트병', poly: 'PET', mono: '테레프탈산 + 에틸렌 글라이콜' },
    { ico: '💇', name: '머리카락', poly: '단백질', mono: '아미노산' },
    { ico: '🍚', name: '녹말', poly: '녹말', mono: '포도당' },
    { ico: '🧬', name: 'DNA', poly: '핵산', mono: '뉴클레오타이드' },
  ];
  const evRect = (i) => PHONE ? { x: INFO.x + 12 + i * 89, y: INFO.y + 158, w: 84, h: 62 } : { x: INFO.x + 398 + i * 74, y: INFO.y + 34, w: 68, h: 58 };
  function drawChainInfo(t) {
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const n = chN();
    const dy = PHONE ? -10 : 0;
    T(INFO.x + 16, INFO.y + 24 + dy, '반응식', 15, WARN, 'left', 800);
    fx(INFO.x + 16, INFO.y + 62 + dy, PHONE ? 20 : 23, INK, ['n C₂H₄  →  [–CH₂CH₂–]', ['sub', 'n']]);
    T(INFO.x + 16, INFO.y + 86 + dy, '단위체(작은 분자)  →  고분자(아주 큰 분자)', 13.5, MUTED, 'left', 700);
    const mshow = Math.round(CH.massShow);
    if (n >= 1) fx(INFO.x + 16, INFO.y + 120 + dy, PHONE ? 16 : 17, '#5b21b6', ['몰질량 ≈ 28 × ' + n + ' = ' + fmtN(mshow) + ' g/mol']);
    else T(INFO.x + 16, INFO.y + 120 + dy, '단위체를 이어 붙이면 몰질량이 나와요', 14, MUTED, 'left', 700);
    T(INFO.x + 16, INFO.y + 142 + dy, '(에틸렌 한 분자 C₂H₄ = 28 g/mol)', 13, MUTED, 'left', 700);
    const lx = PHONE ? INFO.x + 12 : INFO.x + 398;
    T(lx, PHONE ? INFO.y + 148 : INFO.y + 24, '🏠 일상 속 고분자 (카드를 눌러 보세요)', PHONE ? 14 : 14.5, WARN, 'left', 800);
    EV.forEach((e, i) => {
      const r = evRect(i), on = CH.sel === i;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? '#ede9fe' : '#fff'; ctx.fill(); }, { blur: on ? 9 : 4, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = on ? PUR : '#cbd5e1'; ctx.lineWidth = on ? 2.6 : 1.4; ctx.stroke();
      T(r.x + r.w / 2, r.y + 28, e.ico, 25, INK, 'center', 700);
      T(r.x + r.w / 2, r.y + r.h - 9, e.name, 13, INK, 'center', 800);
    });
    const cy = PHONE ? INFO.y + 242 : INFO.y + 112;
    if (CH.sel >= 0) {
      const e = EV[CH.sel];
      textBlock(lx, cy, PHONE ? INFO.w - 24 : 366, e.name + ' = ' + e.poly + ' : 단위체인 ' + josa(e.mono, '이', '가') + ' 반복해서 이어진 긴 사슬이에요.', 13.5, '#166534', 17, 800);
    } else textBlock(lx, cy, PHONE ? INFO.w - 24 : 366, '모두 크기는 달라도 “단위체가 반복해서 이어진 긴 사슬”이에요.', 13.5, MUTED, 17, 700);
  }
  function drawChain(t) {
    const G = cGeo(), P = G.P;
    T(14, 26, '⛓️ 에틸렌을 이어 붙여 폴리에틸렌 사슬을 만들어요', PHONE ? 13.5 : 17, INK, 'left', 800);
    // 단위체 통
    panel(G.pool.x, G.pool.y, G.pool.w, G.pool.h, 14, '#faf8ff');
    T(G.pool.x + (PHONE ? 14 : G.pool.w / 2), G.pool.y + 22, '단위체 통', 15, WARN, PHONE ? 'left' : 'center', 800);
    T(G.pool.x + (PHONE ? G.pool.w - 14 : G.pool.w / 2), PHONE ? G.pool.y + 22 : G.pool.y + G.pool.h - 12, '에틸렌 C₂H₄', 13.5, MUTED, PHONE ? 'right' : 'center', 800);
    for (let i = 0; i < 3; i++) {
      const p = G.pm(i), bob = RM ? 0 : Math.sin(t * 2 + i * 2.1) * 3, dragging = CH.drag && CH.drag.pi === i;
      drawEth(p.x, p.y + bob, P * 1.2, 1, 2, { al: dragging ? 0.28 : 1 });
      if (!dragging && !RM && chN() === 0 && i === 0) D.ring(p.x, p.y, P * 1.0, t, { color: PUR, width: 2.5 });
    }
    // 사슬 영역
    const A = G.area;
    panel(A.x, A.y, A.w, A.h, 14);
    if (CH.drag) { D.roundRect(A.x + 5, A.y + 5, A.w - 10, A.h - 10, 12); ctx.setLineDash([9, 7]); ctx.strokeStyle = C.rgba(PUR, 0.5 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
    T(A.x + 16, A.y + 26, '폴리에틸렌 사슬', 15, WARN, 'left', 800);
    const n = chN();
    pill(A.x + A.w - 14, A.y + 22, 'n = ' + n, { bg: PUR, color: '#fff', border: null, size: 14, align: 'right' });
    if (CH.units.length === 0) {
      T(A.x + A.w / 2, A.y + A.h / 2 + 4, PHONE ? '위의 에틸렌을 끌어다 놓거나 “＋1개”를 눌러요' : '왼쪽 에틸렌을 끌어다 놓거나 “＋1개”를 눌러요', PHONE ? 14 : 15, MUTED, 'center', 700);
    }
    // 연결 결합
    CH.units.forEach((u, i) => {
      if (i === 0 || u.link < 0.03) return;
      const pv = CH.units[i - 1], bx = pv.x + pv.dir * P / 4, ax = u.x - u.dir * P / 4;
      ctx.save(); ctx.globalAlpha = u.link;
      if (pv.dir === u.dir) line(bx, pv.y, ax, u.y, Math.max(2.8, P * 0.085), '#7c3aed');
      else {
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = Math.max(2.8, P * 0.085); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, pv.y); ctx.bezierCurveTo(bx + pv.dir * 0.95 * P, pv.y, ax + pv.dir * 0.95 * P, u.y, ax, u.y); ctx.stroke();
      }
      ctx.restore();
    });
    CH.units.forEach((u) => drawEth(u.x, u.y, P, u.dir, u.oc, { sc: u.sc }));
    // 반복 단위 표시(가장 최근 한 단위)
    if (n >= 2) {
      const u = CH.units[n - 1];
      if (u.arr) {
        const ph = RM ? 1 : 0.6 + 0.4 * Math.sin(t * 3);
        D.roundRect(u.x - P * 0.5 + 1, u.y - P * 0.68, P - 2, P * 1.36, 10); ctx.strokeStyle = C.rgba('#f59e0b', 0.5 + 0.35 * ph); ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
        pill(clamp(u.x, A.x + 72, A.x + A.w - 142), u.y - P * 0.68 - 14, '반복 단위 –CH₂CH₂–', { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', size: 13 });
      }
    }
    // 끌고 있는 단위체
    if (CH.ret) drawEth(CH.ret.x, CH.ret.y, P * 1.2, 1, 2, { sc: 1.1, shadow: true });
    if (CH.drag && CH.drag.moved) drawEth(CH.drag.x, CH.drag.y, P * 1.2, 1, 2, { sc: 1.16, shadow: true });
    drawChainInfo(t);
  }

  /* ============ ② 중합도와 상태 / 짝짓기 ============ */
  const NSV = [1, 10, 20, 100, 1000];
  const SDATA = [
    { ico: '💨', name: '기체', short: '기체', desc: '에틸렌 분자 하나하나가 따로따로 빠르게 날아다녀요. 분자 사이의 끌어당기는 힘이 아주 작아요.', box: '#eef6ff' },
    { ico: '🧈', name: '무른 왁스', short: '무른 왁스', desc: '사슬이 짧아서 서로 끌어당기는 힘이 약해요. 손으로 만지면 무르고, 열을 조금만 줘도 녹아요.', box: '#fff7e6' },
    { ico: '🕯️', name: '파라핀 왁스', short: '파라핀 왁스', desc: '양초 재료인 파라핀 왁스와 비슷해요. 굳어 있지만 잘 부서지고, 필름이나 용기를 만들 수는 없어요.', box: '#fff3d6' },
    { ico: '🪨', name: '딱딱한 왁스', short: '딱딱한 왁스', desc: '사슬이 더 길어져 단단하지만 잘 부서져요. 아직 비닐봉지처럼 질기게 늘어나지는 못해요.', box: '#f3ecfa' },
    { ico: '🛍️', name: '플라스틱', short: '플라스틱', desc: '사슬이 아주 길게 엉켜 서로를 단단히 붙들어요. 질기고 단단한 비닐봉지·용기 재료가 돼요.', box: '#ede9fe' },
  ];
  const ST = { i: 0, sets: [], visited: [true, false, false, false, false], gauge: 0.04, mshow: 28 };
  const stBox = () => PHONE ? { x: 16, y: 90, w: 448, h: 212 } : { x: 24, y: 84, w: 440, h: 262 };
  const CHSPEC = [
    { cnt: 14, len: 1, sp: 6, r: 8, v: 120, kap: 0.002 },
    { cnt: 7, len: 10, sp: 8.6, r: 4.6, v: 44, kap: 0.045 },
    { cnt: 5, len: 20, sp: 6.8, r: 3.6, v: 32, kap: 0.05 },
    { cnt: 3, len: 100, sp: 3.8, r: 1.7, v: 17, kap: 0.07 },
    { cnt: 2, len: 1000, sp: 2.4, r: 1.0, v: 8, kap: 0.1 },
  ];
  const CHCOL = ['#7c3aed', '#2563eb', '#0d9488', '#d97706', '#db2777', '#4f46e5', '#059669'];
  function chainAdvance(c, B, dt) {
    const m = 8, x0 = B.x + m, x1 = B.x + B.w - m, y0 = B.y + m + 26, y1 = B.y + B.h - m;
    const d = c.v * dt;
    c.hd += (Math.random() - 0.5) * 2 * c.kap * d * 6;
    c.hx += Math.cos(c.hd) * d; c.hy += Math.sin(c.hd) * d;
    if (c.hx < x0) { c.hx = x0; c.hd = Math.PI - c.hd; } else if (c.hx > x1) { c.hx = x1; c.hd = Math.PI - c.hd; }
    if (c.hy < y0) { c.hy = y0; c.hd = -c.hd; } else if (c.hy > y1) { c.hy = y1; c.hd = -c.hd; }
    if (c.len > 1) {
      const last = c.pts[0] || { x: 1e9, y: 1e9 };
      if (Math.hypot(c.hx - last.x, c.hy - last.y) >= c.sp) { c.pts.unshift({ x: c.hx, y: c.hy }); if (c.pts.length > c.len - 1) c.pts.pop(); }
    } else c.spin += dt * c.sv;
  }
  function makeSet(ni) {
    const sp = CHSPEC[ni], B = stBox(), chains = [];
    for (let k = 0; k < sp.cnt; k++) {
      const c = { len: sp.len, sp: sp.sp, r: sp.r, v: sp.v, kap: sp.kap, hx: B.x + 30 + Math.random() * (B.w - 60), hy: B.y + 50 + Math.random() * (B.h - 70), hd: Math.random() * TAU, pts: [], col: CHCOL[k % CHCOL.length], spin: Math.random() * TAU, sv: (Math.random() - 0.5) * 3 };
      if (c.len > 1) { let guard = 0; while (c.pts.length < c.len - 1 && guard++ < 20000) chainAdvance(c, B, (c.sp * 0.5) / c.v); }
      chains.push(c);
    }
    return { ni, al: 0, targ: 1, chains };
  }
  function stSet(ni) {
    ni = clamp(Math.round(ni), 0, 4);
    if (ST.sets.length && ST.sets[ST.sets.length - 1].ni === ni && ST.sets[ST.sets.length - 1].targ === 1) { ST.i = ni; ST.visited[ni] = true; return; }
    ST.sets.forEach((s) => { s.targ = 0; });
    ST.sets.push(makeSet(ni)); ST.i = ni; ST.visited[ni] = true; updateCtl();
  }
  function stReset() { ST.visited = [true, false, false, false, false]; ST.sets = []; ST.i = 0; ST.sets.push(makeSet(0)); ST.sets[0].al = 1; updateCtl(); }
  function stepState(dt) {
    const B = stBox();
    ST.sets.forEach((s) => {
      s.al = RM ? s.targ : ap(s.al, s.targ, dt, 6);
      if (s.al > 0.01) s.chains.forEach((c) => chainAdvance(c, B, dt));
    });
    ST.sets = ST.sets.filter((s) => s.targ === 1 || s.al > 0.02);
    const gt = 0.08 + 0.92 * Math.log10(NSV[ST.i]) / 3;
    ST.gauge = ap(ST.gauge, gt, dt, 5);
    ST.mshow = ap(ST.mshow, 28 * NSV[ST.i], dt, 9); if (Math.abs(ST.mshow - 28 * NSV[ST.i]) < 0.6) ST.mshow = 28 * NSV[ST.i];
  }
  function drawSetChains(s, B) {
    ctx.save(); ctx.globalAlpha = clamp(s.al, 0, 1);
    D.roundRect(B.x + 2, B.y + 2, B.w - 4, B.h - 4, 12); ctx.clip();
    const n = NSV[s.ni];
    s.chains.forEach((c) => {
      if (c.len === 1) {
        drawEthMini(c.hx, c.hy, c.r, c.hd + c.spin);
      } else if (c.len <= 20) {
        const pts = [{ x: c.hx, y: c.hy }].concat(c.pts);
        ctx.strokeStyle = C.rgba(c.col, 0.55); ctx.lineWidth = c.r * 0.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        pts.forEach((p) => { ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(p.x, p.y, c.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p.x - c.r * 0.3, p.y - c.r * 0.35, c.r * 0.32, 0, TAU); ctx.fill(); });
      } else {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(c.hx, c.hy); c.pts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = C.rgba('#1e1b4b', 0.45); ctx.lineWidth = c.r * 2 + 1.2; ctx.stroke();
        ctx.strokeStyle = c.col; ctx.lineWidth = c.r * 2; ctx.stroke();
      }
    });
    ctx.restore();
  }
  function drawEthMini(x, y, r, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    line(-r * 0.55, 0, r * 0.55, 0, 2.2);
    [[-0.55, -1], [-0.55, 1], [0.55, -1], [0.55, 1]].forEach(([dx, dy]) => { line(dx * r, 0, dx * r * 1.45, dy * r * 0.8, 1.6); });
    [[-0.55, -1], [-0.55, 1], [0.55, -1], [0.55, 1]].forEach(([dx, dy]) => { ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dx * r * 1.45, dy * r * 0.8, r * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = '#475569'; [-0.55, 0.55].forEach((dx) => { ctx.beginPath(); ctx.arc(dx * r, 0, r * 0.42, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawState(t) {
    const B = stBox(), d = SDATA[ST.i], n = NSV[ST.i];
    T(14, 26, '🌡️ 단위체 수 n에 따라 물질의 상태가 달라져요', PHONE ? 13.5 : 17, INK, 'left', 800);
    const boxFill = d.box;
    panel(B.x, B.y, B.w, B.h, 14, boxFill);
    D.roundRect(B.x, B.y, B.w, B.h, 14); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.stroke();
    pill(B.x + 12, B.y + 22, '🔍 입자 모형으로 보기', { bg: '#fff', color: '#5b21b6', border: '#a78bfa', size: 13.5, align: 'left' });
    ST.sets.forEach((s) => drawSetChains(s, B));
    pill(B.x + B.w - 12, B.y + 22, 'n = ' + fmtN(n), { bg: PUR, color: '#fff', border: null, size: 14, align: 'right' });
    // 상태 카드
    const K = PHONE ? { x: 16, y: 312, w: 448, h: 164 } : { x: 478, y: 84, w: 296, h: 262 };
    panel(K.x, K.y, K.w, K.h, 14);
    T(K.x + 36, K.y + 54, d.ico, PHONE ? 38 : 46, INK, 'center', 700);
    T(K.x + 76, K.y + 42, d.name, PHONE ? 20 : 23, '#5b21b6', 'left', 900);
    T(K.x + 76, K.y + 66, 'n = ' + fmtN(n) + ' · 몰질량 ≈ 28 × n', 13.5, MUTED, 'left', 800);
    fx(K.x + 16, K.y + 94, 17, INK, ['≈ ' + fmtN(Math.round(ST.mshow)) + ' g/mol']);
    textBlock(K.x + 16, K.y + 118, K.w - 32, d.desc, 13.5, INK, 17.5, 700);
    // 분자 사이 인력 게이지(질적)
    const gy = PHONE ? K.y + K.h - 22 : K.y + K.h - 30, gx = K.x + 16, gw = K.w - 32;
    T(gx, gy - 12, '분자 사이의 끌어당기는 힘 (질적 비교)', 13, MUTED, 'left', 800);
    D.roundRect(gx, gy - 4, gw, 14, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, '#93c5fd'); gg.addColorStop(1, '#7c3aed');
    D.roundRect(gx, gy - 4, Math.max(14, gw * ST.gauge), 14, 7); ctx.fillStyle = gg; ctx.fill();
    // 설명선
    if (!PHONE) T(B.x + B.w / 2, B.y + B.h + 22, '※ 사슬이 길수록 구슬을 작게 그렸어요. 사슬은 모두 상자 안에 있어요.', 13, MUTED, 'center', 700);
    // 기록표
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '📋 기록 : 폴리에틸렌의 n에 따른 상태', 15, WARN, 'left', 800);
    const cols = PHONE ? 5 : 5, cw = (INFO.w - 32 - (cols - 1) * 6) / cols;
    NSV.forEach((v, i) => {
      const x = INFO.x + 16 + i * (cw + 6), y = INFO.y + 40, h = PHONE ? 84 : 62, on = ST.i === i, seen = ST.visited[i];
      D.roundRect(x, y, cw, h, 10); ctx.fillStyle = on ? '#ede9fe' : seen ? '#f0fdf4' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on ? PUR : seen ? '#86efac' : '#cbd5e1'; ctx.lineWidth = on ? 2.6 : 1.4; ctx.stroke();
      T(x + cw / 2, y + 20, 'n = ' + fmtN(v), 13.5, INK, 'center', 800);
      if (PHONE) { T(x + cw / 2, y + 46, seen ? SDATA[i].ico : '?', 22, INK, 'center', 700); T(x + cw / 2, y + 72, seen ? SDATA[i].short : '아직', 12.5, seen ? '#166534' : MUTED, 'center', 800); }
      else { T(x + cw / 2, y + 44, seen ? SDATA[i].ico + ' ' + SDATA[i].short : '? 아직 몰라요', 13.5, seen ? '#166534' : MUTED, 'center', 800); }
    });
    const ny = PHONE ? INFO.y + 150 : INFO.y + 128;
    textBlock(INFO.x + 16, ny, INFO.w - 32, '실제 비닐봉지·용기용 폴리에틸렌은 n이 수천 이상이에요. 같은 에틸렌으로 만들어도 사슬 길이(n)에 따라 쓰임새가 크게 달라져요.', 13.5, MUTED, 17.5, 700);
  }

  /* ---- 짝짓기 ---- */
  const POLYS = [['pe', '폴리에틸렌'], ['pvc', '폴리염화 비닐 (PVC)'], ['ps', '폴리스타이렌']];
  const USES = [['pipe', '수도관'], ['film', '포장 필름 · 비닐봉지'], ['cup', '일회용 컵 · 스티로폼']];
  const MT = [
    { id: 'pvc', mono: '염화 비닐', f: 'CH₂=CHCl', M: '62.5', poly: 'pvc', use: 'pipe', ico: '🚰' },
    { id: 'pe', mono: '에틸렌', f: 'CH₂=CH₂', M: '28', poly: 'pe', use: 'film', ico: '🛍️' },
    { id: 'ps', mono: '스타이렌', f: 'CH₂=CH–C₆H₅', M: '104', poly: 'ps', use: 'cup', ico: '☕' },
  ];
  const MS = { sel: MT.map(() => ({ p: '', u: '' })), res: MT.map(() => 0), selects: [] };
  const polyName = (k) => (POLYS.find((q) => q[0] === k) || [0, ''])[1];
  const useName = (k) => (USES.find((q) => q[0] === k) || [0, ''])[1];
  const mtOk = (i) => MS.sel[i].p === MT[i].poly && MS.sel[i].u === MT[i].use;
  const mtN = () => MT.filter((m, i) => mtOk(i)).length;
  const mtFilled = () => MS.sel.every((s) => s.p && s.u);
  function drawMatch(t) {
    T(14, 26, '🔗 단위체 → 고분자 → 용도를 짝지어요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const rowH = PHONE ? 124 : 108, y0 = MAIN.y + (PHONE ? 14 : 12);
    MT.forEach((m, i) => {
      const y = y0 + i * rowH, s = MS.sel[i], ok = MS.res[i] === 1, bad = MS.res[i] === -1;
      if (PHONE) {
        const w1 = MAIN.w - 24, x = MAIN.x + 12;
        D.roundRect(x, y, w1, 38, 10); ctx.fillStyle = '#f5f3ff'; ctx.fill(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.6; ctx.stroke();
        T(x + 12, y + 24, m.mono, 15, '#5b21b6', 'left', 900); T(x + w1 - 12, y + 24, m.f + ' · ' + m.M + ' g/mol', 13, INK, 'right', 800);
        const bw = (w1 - 26) / 2, by = y + 52;
        matchBox(x, by, bw, 50, s.p ? polyName(s.p) : '고분자 ?', !!s.p, ok, bad);
        T(x + bw + 13, by + 31, '→', 18, '#94a3b8', 'center', 900);
        matchBox(x + bw + 26, by, bw, 50, s.u ? useName(s.u) : '용도 ?', !!s.u, ok, bad);
        T(x + w1 / 2, y + 36, '', 1, INK);
      } else {
        const cx = MAIN.x + 16, cw = 218, bw = 220;
        D.roundRect(cx, y + 12, cw, 72, 12); ctx.fillStyle = '#f5f3ff'; ctx.fill(); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.6; ctx.stroke();
        T(cx + 14, y + 40, m.mono, 17, '#5b21b6', 'left', 900);
        T(cx + 14, y + 62, m.f, 14, INK, 'left', 800); T(cx + 14, y + 79, m.M + ' g/mol', 13, MUTED, 'left', 800);
        const ax = cx + cw + 8, bx = ax + 34, ux = bx + bw + 34;
        D.arrow(ax, y + 48, ax + 28, y + 48, { color: '#94a3b8', width: 3 });
        matchBox(bx, y + 18, bw, 60, s.p ? polyName(s.p) : '고분자 ?', !!s.p, ok, bad);
        D.arrow(bx + bw + 4, y + 48, bx + bw + 30, y + 48, { color: '#94a3b8', width: 3 });
        matchBox(ux, y + 18, MAIN.x + MAIN.w - 16 - ux, 60, s.u ? useName(s.u) : '용도 ?', !!s.u, ok, bad);
      }
    });
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '중합 반응식 : n개의 단위체 → 고분자', 15, WARN, 'left', 800);
    const eqs = [
      [['n CH₂=CH₂  →  [–CH₂CH₂–]', ['sub', 'n']], '몰질량 ≈ 28 × n'],
      [['n CH₂=CHCl  →  [–CH₂CHCl–]', ['sub', 'n']], '몰질량 ≈ 62.5 × n'],
      [['n CH₂=CH–C₆H₅  →  [–CH₂CH(C₆H₅)–]', ['sub', 'n']], '몰질량 ≈ 104 × n'],
    ];
    eqs.forEach((q, i) => {
      const yy = INFO.y + (PHONE ? 62 + i * 44 : 56 + i * 31);
      fx(INFO.x + 16, yy, PHONE ? 15 : 17, INK, q[0]);
      T(PHONE ? INFO.x + 16 : INFO.x + INFO.w - 16, PHONE ? yy + 20 : yy, q[1], 13.5, '#5b21b6', PHONE ? 'left' : 'right', 800);
    });
    if (PHONE) textBlock(INFO.x + 16, INFO.y + 206, INFO.w - 32, '단위체의 이중 결합이 열리며 반복해서 이어져요. 단위체가 달라지면 고분자의 성질도 달라져요.', 13.5, MUTED, 18, 700);
  }
  function matchBox(x, y, w, h, text, filled, ok, bad) {
    D.shadow(() => { D.roundRect(x, y, w, h, 12); ctx.fillStyle = ok ? '#dcfce7' : bad ? '#fee2e2' : filled ? '#fff' : '#f8fafc'; ctx.fill(); }, { blur: filled ? 6 : 2, y: 2 });
    D.roundRect(x, y, w, h, 12); ctx.strokeStyle = ok ? GOODC : bad ? BADC : filled ? PUR : '#cbd5e1'; ctx.lineWidth = filled ? 2.2 : 1.6; if (!filled) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    let fs = 15; while (textW(text, fs, 800) > w - 14 && fs > 12) fs -= 0.5;
    T(x + w / 2, y + h / 2 + 5, text, fs, filled ? INK : MUTED, 'center', 800);
    if (ok) T(x + w - 14, y + 18, '✓', 16, GOODC, 'center', 900);
  }

  /* ============ ③ 물이 빠지며 연결 ============ */
  const KIND = {
    tpa: { id: 'tpa', name: '테레프탈산', lab: ['테레프탈산'], m: 166, w: 76, lc: 'COOH', rc: 'COOH', up: false },
    eg: { id: 'eg', name: '에틸렌 글라이콜', lab: ['에틸렌', '글라이콜'], m: 62, w: 60, lc: 'OH', rc: 'OH', up: true },
    gly: { id: 'gly', name: '글리신', lab: ['글리신'], m: 75, w: 96, lc: 'NH2', rc: 'COOH', R: 'H' },
    ala: { id: 'ala', name: '알라닌', lab: ['알라닌'], m: 89, w: 96, lc: 'NH2', rc: 'COOH', R: 'CH₃' },
    ser: { id: 'ser', name: '세린', lab: ['세린'], m: 105, w: 96, lc: 'NH2', rc: 'COOH', R: 'CH₂OH' },
    glc: { id: 'glc', name: '포도당', lab: ['포도당'], m: 180, w: 76, lc: 'OH', rc: 'OH' },
  };
  const SYS = {
    pet: { name: 'PET (페트병)', kinds: ['tpa', 'eg'], max: 10, alt: true, rule: '테레프탈산(–COOH 2개)과 에틸렌 글라이콜(–OH 2개)이 번갈아 연결돼요. –COOH의 OH와 –OH의 H가 만나 H₂O로 빠져나가요.' },
    pro: { name: '단백질', kinds: ['gly', 'ala', 'ser'], max: 6, rule: '한 아미노산의 –COOH와 다음 아미노산의 H₂N–가 만나 H₂O가 빠지며 연결돼요 (펩타이드 결합).' },
    sta: { name: '녹말', kinds: ['glc'], max: 6, rule: '포도당의 –OH끼리 만나 H₂O가 빠지며 연결돼요. 포도당 C₆H₁₂O₆(180)이 이어질 때마다 한 단위는 C₆H₁₀O₅(162)가 돼요.' },
  };
  const GAP0 = 18, GAP1 = 3;
  const BD = { sys: 'pet', chains: { pet: [], pro: [], sta: [] }, water: { pet: [], pro: [], sta: [] }, drag: null, ret: null, shake: 0, pop: null, wrong: 0 };
  const bdMaxW = (sk) => {
    const s = SYS[sk];
    if (s.alt) return Math.ceil(s.max / 2) * KIND.tpa.w + Math.floor(s.max / 2) * KIND.eg.w + (s.max - 1) * GAP1;
    return s.max * Math.max.apply(null, s.kinds.map((k) => KIND[k].w)) + (s.max - 1) * GAP1;
  };
  const bdK = (sk) => Math.min(1, (MAIN.w - 56) / bdMaxW(sk || BD.sys));
  const bdX0 = () => MAIN.x + 28;
  const bdCY = () => MAIN.y + (PHONE ? 214 : 190);
  const bdTrayY = () => MAIN.y + (PHONE ? 92 : 70);
  const bdTrayBottom = () => MAIN.y + (PHONE ? 150 : 140);
  function bdTrayPos(i) { const kinds = SYS[BD.sys].kinds, k = bdK(); let x = bdX0(); for (let q = 0; q < i; q++) x += KIND[kinds[q]].w * k + (PHONE ? 20 : 34); return { x, y: bdTrayY(), w: KIND[kinds[i]].w * k, h: 50 * k }; }
  const wtGeo = () => PHONE ? { x: MAIN.x + 12, y: MAIN.y + 330, w: MAIN.w - 24, h: 84 } : { x: MAIN.x + MAIN.w - 262, y: MAIN.y + 258, w: 250, h: 76 };
  function wtSlot(i) { const G = wtGeo(), cols = 5, pitch = Math.min(46, (G.w - 24) / cols); return { x: G.x + 22 + (i % cols) * pitch + (G.w - 24 - cols * pitch) / 2, y: G.y + 32 + Math.floor(i / cols) * 30 }; }
  function bdStats(sk) {
    sk = sk || BD.sys;
    const ch = BD.chains[sk], arr = ch.filter((it) => it.arr);
    const water = ch.filter((it, i) => i > 0 && it.spawned).length;
    const mass = arr.reduce((a, it) => a + KIND[it.k].m, 0) - 18 * water;
    const cnt = {}; arr.forEach((it) => { cnt[it.k] = (cnt[it.k] || 0) + 1; });
    return { n: arr.length, water, mass, cnt };
  }
  function bdAdd(kid, sx, sy) {
    const sd = SYS[BD.sys], ch = BD.chains[BD.sys];
    if (ch.length >= sd.max) { showHint('이 사슬은 단위체 ' + sd.max + '개까지 만들 수 있어요. “처음부터”로 다시 해 봐요.', 3400); BD.shake = 0.4; Sound.fail(); return false; }
    if (sd.alt && ch.length && ch[ch.length - 1].k === kid) {
      showHint(kid === 'tpa' ? '–COOH끼리는 연결되지 않아요. 에틸렌 글라이콜(–OH)을 붙여야 해요.' : '–OH끼리는 연결되지 않아요. 테레프탈산(–COOH)을 붙여야 해요.', 4200);
      BD.shake = 0.4; BD.wrong++; Sound.fail(); return false;
    }
    ch.push({ k: kid, x: sx, y: sy, tx: sx, arr: false, j: ch.length ? 0 : 1, spawned: false, sc: 1.1 });
    Sound.tick(); updateCtl(); return true;
  }
  function bdReset(sk) {
    sk = sk || BD.sys; BD.chains[sk] = []; BD.water[sk] = []; BD.drag = null; BD.ret = null; BD.pop = null; updateCtl();
  }
  function bdResetAll() { ['pet', 'pro', 'sta'].forEach((s) => { BD.chains[s] = []; BD.water[s] = []; }); BD.drag = null; BD.ret = null; BD.pop = null; BD.wrong = 0; updateCtl(); }
  function bdSetSys(sk) { if (BD.sys === sk) return; BD.sys = sk; BD.drag = null; BD.ret = null; BD.pop = null; S.fade = 0.7; buildBdChips(); updateCtl(); }
  function stepBuild(dt) {
    ['pet', 'pro', 'sta'].forEach((sk) => {
      const ch = BD.chains[sk], k = bdK(sk), cy = bdCY();
      let x = bdX0();
      ch.forEach((it, i) => {
        const kd = KIND[it.k];
        if (i > 0) x += lerp(GAP0, GAP1, sm(it.j));
        it.tx = x; x += kd.w * k;
        it.x = ap(it.x, it.tx, dt, RM ? 60 : 9); it.y = ap(it.y, cy, dt, RM ? 60 : 9); it.sc = ap(it.sc, 1, dt, 9);
        if (!it.arr && Math.hypot(it.x - it.tx, it.y - cy) < 2.5) { it.arr = true; Sound.tick(); }
        if (it.arr && i > 0 && it.j < 1) it.j = Math.min(1, it.j + dt / (RM ? 0.05 : 0.9));
        if (i > 0 && it.arr && it.j >= 0.35 && !it.spawned) {
          it.spawned = true;
          const jx = it.x - lerp(GAP0, GAP1, sm(it.j)) / 2, jy = cy - 26 * k;
          const W = BD.water[sk]; W.push({ sx: jx, sy: jy, t: 0, slot: W.length, sc: 1 });
          parts.burst(jx, cy, { count: 8, speed: 70, size: 2.4, colors: ['#93c5fd', '#bfdbfe', '#ffffff'], gravity: 40 });
          if (sk === BD.sys) { BD.pop = { x: jx, y: cy - 46, t: 0 }; Sound.pop && Sound.pop(); }
        }
      });
      BD.water[sk].forEach((w) => { w.t = Math.min(1.35, w.t + dt); if (w.t >= 1.35) w.sc = ap(w.sc, 1, dt, 10); });
    });
    if (BD.ret) { const r = BD.ret; r.x = ap(r.x, r.tx, dt, 14); r.y = ap(r.y, r.ty, dt, 14); if (Math.hypot(r.x - r.tx, r.y - r.ty) < 3) BD.ret = null; }
    if (BD.pop) { BD.pop.t += dt; if (BD.pop.t > 2.2) BD.pop = null; }
    BD.shake = Math.max(0, BD.shake - dt);
  }
  function hexPath(cx, cy, r, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); }
  function drawTile(kd, x, cy, k, o) {
    o = o || {};
    const w = kd.w * k, h = 50 * k, cw = 17 * k, capL = o.capL == null ? 1 : o.capL, capR = o.capR == null ? 1 : o.capR;
    ctx.save();
    if (o.al != null) ctx.globalAlpha = o.al;
    const sc = o.sc || 1, mx = x + w / 2; ctx.translate(mx, cy); ctx.scale(sc, sc); ctx.translate(-mx, -cy);
    D.shadow(() => { D.roundRect(x, cy - h / 2, w, h, 10 * k); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: o.lift ? 14 : 5, y: o.lift ? 8 : 2 });
    ctx.save(); D.roundRect(x, cy - h / 2, w, h, 10 * k); ctx.clip();
    ctx.fillStyle = GC[kd.lc]; ctx.fillRect(x, cy - h / 2, cw * capL, h);
    ctx.fillStyle = GC[kd.rc]; ctx.fillRect(x + w - cw * capR, cy - h / 2, cw * capR, h);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x, cy - h / 2, w, h * 0.3);
    ctx.restore();
    D.roundRect(x, cy - h / 2, w, h, 10 * k); ctx.strokeStyle = '#8795ab'; ctx.lineWidth = 1.6; ctx.stroke();
    if (kd.id === 'tpa') {
      hexPath(mx, cy, 14 * k, Math.PI / 6); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, cy, 8 * k, 0, TAU); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.stroke();
    } else if (kd.id === 'eg') {
      line(mx - 6 * k, cy, mx + 6 * k, cy, 2.6, '#64748b');
      [-1, 1].forEach((s) => { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(mx + s * 7 * k, cy, 5 * k, 0, TAU); ctx.fill(); });
    } else if (kd.id === 'glc') {
      hexPath(mx, cy, 14 * k, 0); ctx.fillStyle = '#fff7ed'; ctx.fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(mx + 14 * k, cy, 4 * k, 0, TAU); ctx.fill();
    } else {
      T(mx, cy + 5, kd.R, 13, INK, 'center', 900);
    }
    ctx.restore();
  }
  function drawTileLabel(kd, x, cy, k, below) {
    const w = kd.w * k, h = 50 * k;
    if (below) kd.lab.forEach((s, i) => T(x + w / 2, cy + h / 2 + 16 + i * 15, s, 13, INK, 'center', 800));
    else kd.lab.forEach((s, i) => T(x + w / 2, cy - h / 2 - 9 - (kd.lab.length - 1 - i) * 15, s, 13, INK, 'center', 800));
  }
  function dropShape(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.5);
    ctx.bezierCurveTo(x + r * 0.2, y - r * 0.9, x + r, y - r * 0.2, x + r, y + r * 0.35);
    ctx.arc(x, y + r * 0.35, r, 0, Math.PI, false);
    ctx.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.2, y - r * 0.9, x, y - r * 1.5); ctx.closePath();
  }
  function drawDrop(x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    dropShape(x, y, r); const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#2563eb');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y + r * 0.05, r * 0.2, r * 0.38, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBuild(t) {
    const sk = BD.sys, sd = SYS[sk], ch = BD.chains[sk], k = bdK(), cy = bdCY(), st = bdStats();
    T(14, 26, '💧 단위체가 연결될 때마다 물이 빠져나와요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 범례
    const lg = sk === 'pet' ? [['COOH', '–COOH'], ['OH', '–OH']] : sk === 'pro' ? [['NH2', 'H₂N–'], ['COOH', '–COOH']] : [['OH', '–OH']];
    lg.forEach(([g, tx], i) => pill(MAIN.x + MAIN.w - 14 - i * 74, MAIN.y + 22, tx, { bg: GC[g], color: '#fff', border: null, size: 13.5, align: 'right' }));
    T(MAIN.x + 16, MAIN.y + 26, '단위체 타일 (끌어서 사슬에 붙여요)', PHONE ? 13 : 14.5, WARN, 'left', 800);
    // 트레이
    sd.kinds.forEach((kid, i) => {
      const p = bdTrayPos(i), kd = KIND[kid], dragging = BD.drag && BD.drag.kid === kid;
      const bob = RM ? 0 : Math.sin(t * 2 + i) * 2;
      drawTile(kd, p.x, p.y + bob, k, { al: dragging ? 0.3 : 1 });
      drawTileLabel(kd, p.x, p.y, k, true);
    });
    if (BD.drag) { D.roundRect(MAIN.x + 8, bdTrayBottom() + 4, MAIN.w - 16, MAIN.y + MAIN.h - bdTrayBottom() - 12, 12); ctx.setLineDash([9, 7]); ctx.strokeStyle = C.rgba(PUR, 0.45 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
    if (!ch.length) T(MAIN.x + MAIN.w / 2, cy + 5, '타일을 끌어다 놓거나 아래 단추를 눌러 사슬을 시작해요', PHONE ? 13.5 : 15, MUTED, 'center', 700);
    // 사슬
    ch.forEach((it, i) => {
      const kd = KIND[it.k];
      const prev = i > 0 ? ch[i - 1] : null;
      const capL = i > 0 ? 1 - sm(it.j * 1.25) : 1, capR = (i < ch.length - 1) ? 1 - sm(ch[i + 1].j * 1.25) : 1;
      const sh = BD.shake > 0 && i === ch.length - 1 ? Math.sin(BD.shake * 70) * 3 : 0;
      drawTile(kd, it.x + sh, it.y, k, { capL, capR, sc: it.sc });
      if (it.arr) drawTileLabel(kd, it.x, it.y, k, PHONE && k < 0.8 ? !kd.up : true);
      if (prev && it.j > 0.15) {
        const jx = it.x - lerp(GAP0, GAP1, sm(it.j)) / 2, a = sm((it.j - 0.15) / 0.6);
        ctx.save(); ctx.globalAlpha = a; D.roundRect(jx - 5, cy - 12 * k, 10, 24 * k, 4); ctx.fillStyle = '#7c3aed'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      }
    });
    // 반복 단위 표시 (PET)
    if (sk === 'pet' && st.n >= 2 && ch[0].arr && ch[1].arr) {
      const a = ch[0], b = ch[1], x1 = a.x - 4, x2 = b.x + KIND[b.k].w * k + 4, yy = cy + 25 * k + 52;
      ctx.save(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x1, yy - 7); ctx.lineTo(x1, yy); ctx.lineTo(x2, yy); ctx.lineTo(x2, yy - 7); ctx.stroke(); ctx.restore();
      const lbl = PHONE ? '반복 단위 C₁₀H₈O₄' : '반복 단위 C₁₀H₈O₄ (192 g/mol)';
      pill((x1 + x2) / 2, yy + 16, lbl, { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', size: 13 });
    }
    // 물 모음통
    const wg = wtGeo(), W = BD.water[sk];
    panel(wg.x, wg.y, wg.w, wg.h, 12, '#eff6ff');
    T(wg.x + 14, wg.y + 20, '💧 빠져나온 물 H₂O', 14, '#1d4ed8', 'left', 800);
    for (let i = 0; i < 10; i++) { const p = wtSlot(i); ctx.beginPath(); ctx.arc(p.x, p.y + 4, 9, 0, TAU); ctx.fillStyle = 'rgba(147,197,253,.28)'; ctx.fill(); }
    W.forEach((w) => {
      const e = sm(w.t / 1.3), tp = wtSlot(w.slot);
      const x = lerp(w.sx, tp.x, e), y = lerp(w.sy, tp.y + 4, e) - Math.sin(Math.PI * e) * (PHONE ? 40 : 56);
      const r = lerp(11, 8, e), sq = w.t >= 1.35 ? 1 + 0.18 * Math.sin(Math.max(0, 1 - w.sc) * 40) : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(1 / sq, sq); drawDrop(0, 0, r); ctx.restore();
      if (e < 0.7) T(x + 14, y - 6, 'H₂O', 13, '#1d4ed8', 'left', 900, { stroke: '#fff', strokeWidth: 3, alpha: 1 - e / 0.7 });
    });
    if (BD.pop && W.length) {
      const a = clamp(1 - Math.max(0, BD.pop.t - 1.4) / 0.8, 0, 1);
      pill(clamp(BD.pop.x, MAIN.x + 110, MAIN.x + MAIN.w - 110), BD.pop.y, '연결 지점마다 H₂O 1분자가 빠져요', { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa', size: 13, alpha: a });
    }
    if (BD.drag && BD.drag.moved) { const kd = KIND[BD.drag.kid]; drawTile(kd, BD.drag.x - kd.w * k / 2, BD.drag.y, k, { lift: 1, sc: 1.08 }); }
    if (BD.ret) { const kd = KIND[BD.ret.kid]; drawTile(kd, BD.ret.x - kd.w * k / 2, BD.ret.y, k, { lift: 1, sc: 1.05 }); }
    // 하단 정보
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const terms = sd.kinds.filter((q) => st.cnt[q]).map((q) => KIND[q].m + ' × ' + st.cnt[q]).join(' + ');
    T(INFO.x + 16, INFO.y + 24, '몰질량 계산 (단위체 몰질량의 합 − 빠져나간 물)', 15, WARN, 'left', 800);
    if (st.n) textBlock(INFO.x + 16, INFO.y + 50, INFO.w - 32, '(' + terms + ') − 18 × ' + st.water + ' = ' + fmtN(st.mass) + ' g/mol', PHONE ? 16 : 18, '#5b21b6', 22, 900);
    else T(INFO.x + 16, INFO.y + 50, '단위체를 이어 붙이면 계산식이 나와요', 15, MUTED, 'left', 700);
    let note;
    if (sk === 'pet') note = '반복 단위 C₁₀H₈O₄ = 테레프탈산 166 + 에틸렌 글라이콜 62 − 물 2 × 18 = 192 g/mol. 반복 단위 하나당 물이 2분자씩 빠져요.';
    else if (sk === 'pro') note = '아미노산 20종을 다양한 순서로 이으면 서로 다른 단백질이 돼요. 길이 n인 사슬은 20ⁿ가지 순서가 가능해요.';
    else note = '포도당 180 − 물 18 = 162 (녹말의 한 단위). 같은 포도당이 다르게 이어지면 셀룰로스(식물 뼈대)도 돼요.';
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 104 : 120), INFO.w - 32, note, 13.5, INK, 17, 700);
    textBlock(INFO.x + 16, INFO.y + (PHONE ? 176 : 78), INFO.w - 32, sd.rule, 14, MUTED, 18, 700);
  }

  /* ============ ④ 고분자 설계 ============ */
  const DCARD = [
    { id: 'pet', name: '테레프탈산 + 에틸렌 글라이콜', f: '–COOH 2개 + –OH 2개', poly: 'PET', origin: 'syn', deg: 'no', col: '#2563eb', info: 'PET : 두 단위체가 번갈아 연결돼요(물이 빠짐). 페트병과 옷감 섬유에 써요.' },
    { id: 'pe', name: '에틸렌', f: 'C₂H₄ · 28 g/mol', poly: '폴리에틸렌', origin: 'syn', deg: 'no', col: '#7c3aed', info: '폴리에틸렌 : 에틸렌이 수천 번 이상 반복돼요. 가볍고 질겨서 포장 필름과 비닐봉지에 써요.' },
    { id: 'glc', name: '포도당', f: 'C₆H₁₂O₆ · 180 g/mol', poly: '녹말 · 셀룰로스', origin: 'nat', deg: 'yes', col: '#d97706', info: '녹말 · 셀룰로스 : 포도당이 반복돼요(물이 빠짐). 녹말은 에너지를 저장하고, 셀룰로스는 식물의 뼈대가 돼요.' },
    { id: 'ps', name: '스타이렌', f: 'C₈H₈ · 104 g/mol', poly: '폴리스타이렌', origin: 'syn', deg: 'no', col: '#0d9488', info: '폴리스타이렌 : 스타이렌이 반복돼요. 가볍고 열을 잘 막아서 일회용 컵과 스티로폼에 써요.' },
    { id: 'aa', name: '아미노산', f: '20종 · H₂N– 와 –COOH', poly: '단백질', origin: 'nat', deg: 'yes', col: '#16a34a', info: '단백질 : 아미노산이 다양한 순서로 연결돼요(물이 빠짐). 효소와 머리카락 등을 이뤄요.' },
    { id: 'vc', name: '염화 비닐', f: 'C₂H₃Cl · 62.5 g/mol', poly: 'PVC', origin: 'syn', deg: 'no', col: '#db2777', info: 'PVC : 염화 비닐이 반복돼요. 단단하고 잘 녹슬지 않아 수도관 등에 써요.' },
  ];
  const DSLOT = [
    { need: 'aa', use: '효소 · 머리카락', ico: '💇' },
    { need: 'vc', use: '수도관', ico: '🚰' },
    { need: 'pet', use: '페트병 · 섬유', ico: '🧴' },
    { need: 'glc', use: '에너지 저장 · 식물 뼈대', ico: '🌾' },
    { need: 'pe', use: '포장 필름 · 비닐봉지', ico: '🛍️' },
    { need: 'ps', use: '일회용 컵 · 단열재', ico: '☕' },
  ];
  const ORIG = { syn: '합성 고분자', nat: '천연 고분자' }, DEGN = { no: '자연에서 잘 분해되지 않아요', yes: '미생물이 분해해요 (생분해)' }, DEGS = { no: '분해 안 됨', yes: '생분해' };
  const dHome = (i) => PHONE ? { x: 16 + (i % 2) * 226, y: 98 + Math.floor(i / 2) * 44, w: 218, h: 38 } : { x: 24, y: 94 + i * 47, w: 236, h: 44 };
  const dSlotR = (j) => PHONE ? { x: 16 + (j % 2) * 226, y: 236 + Math.floor(j / 2) * 76, w: 218, h: 72 } : { x: 276 + (j % 2) * 248, y: 94 + Math.floor(j / 2) * 96, w: 240, h: 88 };
  const DS = {
    cards: DCARD.map((c, i) => ({ i, loc: -1, x: 0, y: 0, lift: 0, fade: 0, shake: 0 })),
    slots: DSLOT.map(() => ({ card: -1, prog: 0, origin: '', deg: '', badO: false, badD: false })),
    drag: null, sel: -1, selSlot: -1, wrong: 0, msg: '',
  };
  function dsInit() { DS.cards.forEach((c, i) => { const h = dHome(i); c.x = h.x; c.y = h.y; c.loc = -1; c.fade = 0; c.lift = 0; c.shake = 0; }); }
  dsInit();
  const dsPlaced = () => DS.cards.filter((c) => c.loc >= 0).length;
  const dsOk = (j) => { const s = DS.slots[j]; return s.card >= 0 && s.origin === DCARD[s.card].origin && s.deg === DCARD[s.card].deg; };
  const dsTagged = () => DS.slots.filter((s) => s.card >= 0 && s.origin && s.deg).length;
  function dsReset() {
    DS.slots.forEach((s) => { s.card = -1; s.prog = 0; s.origin = ''; s.deg = ''; s.badO = false; s.badD = false; });
    DS.drag = null; DS.sel = -1; DS.selSlot = -1; dsInit(); updateCtl();
  }
  function dsPlace(ci, sj) {
    const c = DS.cards[ci], s = DS.slots[sj];
    if (c.loc >= 0) return false;
    if (s.card >= 0) { showHint('이미 다른 카드가 들어 있는 칸이에요.', 2400); Sound.fail(); return false; }
    if (DSLOT[sj].need !== DCARD[ci].id) {
      DS.wrong++; c.shake = 0.4; Sound.fail();
      showHint('“' + DCARD[ci].name + '”로 만든 고분자는 이 용도가 아니에요. 단위체와 용도를 다시 살펴봐요.', 3600); return false;
    }
    c.loc = sj; s.card = ci; s.prog = 0; DS.sel = -1; DS.selSlot = sj; Sound.success();
    const r = dSlotR(sj); flash(r.x + r.w / 2, r.y + r.h / 2, [DCARD[ci].col, '#fbbf24', '#ffffff']);
    updateCtl(); return true;
  }
  function stepDesign(dt) {
    DS.cards.forEach((c, i) => {
      const dragging = DS.drag && DS.drag.ci === i;
      let tx, ty;
      if (c.loc >= 0) { const r = dSlotR(c.loc); tx = r.x + 22; ty = r.y + r.h / 2 - 17; } else { const h = dHome(i); tx = h.x; ty = h.y; }
      if (!dragging) { c.x = ap(c.x, tx, dt, RM ? 60 : 12); c.y = ap(c.y, ty, dt, RM ? 60 : 12); }
      c.lift = ap(c.lift, dragging ? 1 : 0, dt, 12);
      c.fade = ap(c.fade, c.loc >= 0 ? 1 : 0, dt, c.loc >= 0 ? 7 : 12);
      c.shake = Math.max(0, c.shake - dt);
    });
    DS.slots.forEach((s) => { s.prog = s.card >= 0 ? Math.min(1, s.prog + dt / (RM ? 0.05 : 1.1)) : 0; });
  }
  function drawDCard(c, t) {
    const d = DCARD[c.i], h = dHome(c.i), w = h.w, hh = h.h, sel = DS.sel === c.i;
    const sx = c.shake > 0 ? Math.sin(c.shake * 60) * 5 * c.shake * 2 : 0;
    ctx.save();
    ctx.globalAlpha = 1 - c.fade;
    const cx0 = c.x + w / 2, cy0 = c.y + hh / 2, s2 = 1 + 0.06 * c.lift; ctx.translate(cx0, cy0); ctx.scale(s2, s2); ctx.translate(-cx0, -cy0); ctx.translate(sx, 0);
    D.shadow(() => { D.roundRect(c.x, c.y, w, hh, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 3 + 12 * c.lift, y: 1 + 7 * c.lift });
    D.roundRect(c.x, c.y, w, hh, 10); ctx.strokeStyle = sel ? PUR : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 1.6; ctx.stroke();
    ctx.fillStyle = d.col; D.roundRect(c.x + 2, c.y + 2, 7, hh - 4, 3); ctx.fill();
    let fs = PHONE ? 13.5 : 14.5; while (textW(d.name, fs, 800) > w - 28 && fs > 13) fs -= 0.5;
    if (PHONE) T(c.x + 18, c.y + hh / 2 + 5, d.name, fs, INK, 'left', 800);
    else { T(c.x + 18, c.y + 19, d.name, fs, INK, 'left', 800); let f2 = 13; T(c.x + 18, c.y + 36, d.f, f2, MUTED, 'left', 700); }
    ctx.restore();
  }
  function miniChain(x, y, n, prog, col, step, alt) {
    for (let i = 0; i < n; i++) {
      const a = clamp(prog * (n + 1) - i, 0, 1); if (a <= 0) continue;
      const bx = x + i * step;
      if (i) { ctx.globalAlpha = a; line(bx - step, y, bx, y, 3, '#7c3aed'); }
      ctx.globalAlpha = a; ctx.fillStyle = alt && i % 2 ? '#dc2626' : col; ctx.beginPath(); ctx.arc(bx, y, 5.5 * (0.6 + 0.4 * a), 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(bx - 1.8, y - 2, 1.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawDesign(t) {
    T(14, 26, '🧩 단위체 카드를 알맞은 용도 칸에 연결해요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    T(MAIN.x + 16, MAIN.y + 28, '단위체 카드', 14.5, WARN, 'left', 800);
    if (!PHONE) T(276, MAIN.y + 28, '고분자의 용도 (카드를 끌어다 놓아요)', 14.5, WARN, 'left', 800);
    else T(MAIN.x + 250, MAIN.y + 28, '↓ 아래 용도 칸에 놓아요', 13, MUTED, 'left', 800);
    // 빈 카드 자리
    DS.cards.forEach((c, i) => { const h = dHome(i); D.roundRect(h.x, h.y, h.w, h.h, 10); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#d6dbe6'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); if (c.loc >= 0) { const gt = '✓ ' + DCARD[i].name + ' 연결됨'; let gf = 13; while (textW(gt, gf, 800) > h.w - 20 && gf > 10) gf -= 0.5; T(h.x + 14, h.y + h.h / 2 + 5, gt, gf, '#86a393', 'left', 800, { alpha: c.fade }); } });
    // 용도 칸
    DSLOT.forEach((sl, j) => {
      const r = dSlotR(j), s = DS.slots[j], filled = s.card >= 0, over = DS.drag && DS.drag.over === j, selS = DS.selSlot === j && filled;
      const d = filled ? DCARD[s.card] : null;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = filled ? '#fff' : over ? '#ede9fe' : '#f8fafc'; ctx.fill(); }, { blur: filled ? 7 : 2, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = selS ? PUR : filled ? d.col : over ? PUR : '#b6bfce'; ctx.lineWidth = selS ? 3.4 : filled ? 2.2 : over ? 3 : 1.8; if (!filled) ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      const bad = filled && (s.badO || s.badD);
      if (bad) { D.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10); ctx.strokeStyle = BADC; ctx.lineWidth = 2.4; ctx.stroke(); }
      if (!filled) {
        T(r.x + r.w / 2, r.y + r.h / 2 - 2, sl.ico, PHONE ? 22 : 27, INK, 'center', 700);
        T(r.x + r.w / 2, r.y + r.h / 2 + (PHONE ? 20 : 24), sl.use, PHONE ? 13.5 : 14, INK, 'center', 800);
      } else {
        T(r.x + 14, r.y + 20, sl.ico + ' ' + sl.use, 13.5, MUTED, 'left', 800);
        const p = clamp(s.prog, 0, 1), nameA = sm((p - 0.5) / 0.5);
        T(r.x + 14, r.y + (PHONE ? 42 : 47), d.poly, PHONE ? 16 : 17, '#5b21b6', 'left', 900, { alpha: 0.15 + 0.85 * nameA });
        const nB = PHONE ? 7 : 8, step = PHONE ? 11 : 11.5;
        miniChain(r.x + r.w - 14 - (nB - 1) * step, r.y + (PHONE ? 38 : 42), nB, p, d.col, step, d.id === 'pet');
        const py = r.y + r.h - (PHONE ? 15 : 17);
        const a = s.origin ? pill(r.x + 14, py, ORIG[s.origin].replace(' 고분자', ''), { bg: s.badO ? '#fee2e2' : '#eef2ff', color: s.badO ? '#a3262b' : '#3730a3', border: s.badO ? BADC : '#a5b4fc', size: 13, align: 'left' }) : pill(r.x + 14, py, '합성/천연 ?', { bg: '#f1f5f9', color: MUTED, border: '#cbd5e1', size: 13, align: 'left' });
        pill(r.x + 14 + a.w + 6, py, s.deg ? DEGS[s.deg] : '분해 여부 ?', { bg: s.deg ? (s.badD ? '#fee2e2' : '#ecfdf5') : '#f1f5f9', color: s.deg ? (s.badD ? '#a3262b' : '#166534') : MUTED, border: s.deg ? (s.badD ? BADC : '#86efac') : '#cbd5e1', size: 13, align: 'left' });
      }
    });
    DS.cards.filter((c) => !(DS.drag && DS.drag.ci === c.i)).forEach((c) => drawDCard(c, t));
    if (DS.drag) drawDCard(DS.cards[DS.drag.ci], t);
    // 하단 정보
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 24, '연결 ' + dsPlaced() + ' / 6 · 표시한 고분자 ' + dsTagged() + ' / 6', 15, WARN, 'left', 800);
    const sj = DS.selSlot;
    if (sj >= 0 && DS.slots[sj].card >= 0) {
      const d = DCARD[DS.slots[sj].card];
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, d.info, 14, INK, 19, 700);
      textBlock(INFO.x + 16, INFO.y + (PHONE ? 130 : 108), INFO.w - 32, '👉 이 칸이 선택되었어요. 오른쪽(아래) 단추로 합성/천연과 분해 여부를 표시해요.', 13.5, '#166534', 18, 800);
    } else {
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '카드를 끌어서 용도 칸에 놓으면 단위체가 이어져 고분자가 돼요. 연결된 칸을 누르면 그 고분자를 합성/천연, 분해 여부로 표시할 수 있어요.', 14, INK, 19, 700);
    }
  }

  /* ---------- 입력 ---------- */
  function onLeave() { CH.drag = null; BD.drag = null; DS.drag = null; }
  const chPoolHit = (p) => { const G = cGeo(); for (let i = 0; i < 3; i++) { const q = G.pm(i); if (Math.abs(p.x - q.x) < G.P * 0.95 && Math.abs(p.y - q.y) < G.P * 0.85) return i; } return -1; };
  const bdTileRect = (i) => { const r = bdTrayPos(i); return { x: r.x - 4, y: r.y - r.h / 2 - 4, w: r.w + 8, h: r.h + 8 }; };
  const dsSlotAt = (p) => { for (let j = 0; j < 6; j++) if (pointInRect(p, dSlotR(j))) return j; return -1; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'chain') {
        for (let i = 0; i < EV.length; i++) if (pointInRect(p, evRect(i))) { CH.sel = CH.sel === i ? -1 : i; Sound.click(); return false; }
        const pi = chPoolHit(p);
        if (pi >= 0) { CH.drag = { pi, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; return true; }
      } else if (S.mode === 'build') {
        const kinds = SYS[BD.sys].kinds;
        for (let i = 0; i < kinds.length; i++) if (pointInRect(p, bdTileRect(i))) { BD.drag = { kid: kinds[i], i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; return true; }
      } else if (S.mode === 'design') {
        for (let i = DS.cards.length - 1; i >= 0; i--) {
          const c = DS.cards[i]; if (c.loc >= 0) continue;
          const h = dHome(i);
          if (pointInRect(p, { x: c.x, y: c.y, w: h.w, h: h.h })) { DS.drag = { ci: i, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false, over: null }; return true; }
        }
        const sj = dsSlotAt(p);
        if (sj >= 0) {
          if (DS.slots[sj].card >= 0) { DS.selSlot = sj; Sound.click(); updateCtl(); }
          else if (DS.sel >= 0) dsPlace(DS.sel, sj);
        }
      }
      return false;
    },
    move(p) {
      if (CH.drag) { const d = CH.drag; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
      if (BD.drag) { const d = BD.drag; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
      if (DS.drag) {
        const d = DS.drag, c = DS.cards[d.ci], h = dHome(d.ci);
        c.x = clamp(p.x - d.ox, 0, VW - h.w); c.y = clamp(p.y - d.oy, 0, VH - h.h);
        if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
        const sj = dsSlotAt(p); d.over = sj >= 0 && DS.slots[sj].card < 0 ? sj : null;
      }
    },
    up(p) {
      if (CH.drag) {
        const d = CH.drag; CH.drag = null; const G = cGeo();
        if (!d.moved) { const q = G.pm(d.pi); chAddUnit(q.x, q.y); }
        else if (pointInRect(p, G.area)) chAddUnit(p.x, p.y);
        else { const q = G.pm(d.pi); CH.ret = { x: p.x, y: p.y, tx: q.x, ty: q.y }; }
      }
      if (BD.drag) {
        const d = BD.drag; BD.drag = null; const kd = KIND[d.kid], k = bdK(), tp = bdTrayPos(d.i);
        if (!d.moved) bdAdd(d.kid, tp.x, tp.y);
        else if (p.y > bdTrayBottom() && pointInRect(p, MAIN)) { if (!bdAdd(d.kid, p.x - kd.w * k / 2, p.y)) BD.ret = { kid: d.kid, x: p.x, y: p.y, tx: tp.x + tp.w / 2, ty: tp.y }; }
        else BD.ret = { kid: d.kid, x: p.x, y: p.y, tx: tp.x + tp.w / 2, ty: tp.y };
      }
      if (DS.drag) {
        const d = DS.drag; DS.drag = null; const c = DS.cards[d.ci];
        if (!d.moved) { DS.sel = DS.sel === d.ci ? -1 : d.ci; Sound.click(); }
        else { const sj = dsSlotAt(p); if (sj >= 0) dsPlace(d.ci, sj); }
        void c;
      }
    },
    hover(p) {
      if (S.mode === 'chain') { if (chPoolHit(p) >= 0) return 'grab'; if (EV.some((e, i) => pointInRect(p, evRect(i)))) return 'pointer'; }
      if (S.mode === 'build' && SYS[BD.sys].kinds.some((q, i) => pointInRect(p, bdTileRect(i)))) return 'grab';
      if (S.mode === 'design') { if (DS.cards.some((c) => c.loc < 0 && pointInRect(p, { x: c.x, y: c.y, w: dHome(c.i).w, h: dHome(c.i).h }))) return 'grab'; if (DS.slots.some((s, j) => s.card >= 0 && pointInRect(p, dSlotR(j)))) return 'pointer'; }
      return '';
    },
  });
  function drawDragOverlay() {}

  /* ---------- 조작 장치 ---------- */
  $('#chAdd1').addEventListener('click', () => { Sound.click(); chAdd(1); });
  $('#chAdd5').addEventListener('click', () => { Sound.click(); chAdd(5); });
  $('#chAdd10').addEventListener('click', () => { Sound.click(); chAdd(10); });
  $('#chReset').addEventListener('click', () => { Sound.click(); chReset(); });
  const calcIn = $('#calcIn');
  function parseCalc(s) { const t = String(s).replace(/[,\s]/g, ''); return t === '' || !/^[0-9]*\.?[0-9]+(e[0-9]+)?$/i.test(t) ? NaN : +t; }
  calcIn.addEventListener('input', () => { CH.calc = parseCalc(calcIn.value); calcIn.classList.remove('bad', 'ok'); });
  calcIn.addEventListener('change', () => { CH.calc = parseCalc(calcIn.value); });
  const nRange = $('#nRange');
  nRange.addEventListener('input', () => { stSet(+nRange.value); Sound.tick(); });
  $('#nMinus').addEventListener('click', () => { Sound.click(); stSet(ST.i - 1); });
  $('#nPlus').addEventListener('click', () => { Sound.click(); stSet(ST.i + 1); });
  (function () {
    const host = $('#matchBox');
    MT.forEach((m, i) => {
      const d = document.createElement('div'); d.className = 'match-row';
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = m.mono + ' (' + m.f + ')'; d.appendChild(lab);
      const mk = (opts, ph, key) => {
        const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', m.mono + ' ' + ph);
        [['', ph]].concat(opts).forEach(([v, tx]) => { const o = document.createElement('option'); o.value = v; o.textContent = tx; sel.appendChild(o); });
        sel.addEventListener('change', () => { Sound.click(); MS.sel[i][key] = sel.value; MS.res[i] = 0; updateCtl(); });
        d.appendChild(sel); return sel;
      };
      MS.selects[i] = { p: mk(POLYS, '만들어지는 고분자 고르기', 'p'), u: mk(USES, '주된 용도 고르기', 'u') };
      host.appendChild(d);
    });
  })();
  function matchReset() { MS.sel.forEach((s) => { s.p = ''; s.u = ''; }); MS.res.fill(0); MS.selects.forEach((q) => { q.p.value = ''; q.u.value = ''; }); }
  function buildBdChips() {
    makeChips($('#bdSys'), Object.keys(SYS).map((s) => [s, SYS[s].name.split(' ')[0]]), (s) => bdSetSys(s));
    makeChips($('#bdAdd'), SYS[BD.sys].kinds.map((q) => [q, '＋ ' + KIND[q].name]), (q) => { const tp = bdTrayPos(SYS[BD.sys].kinds.indexOf(q)); bdAdd(q, tp.x, tp.y); });
  }
  buildBdChips();
  $('#bdReset').addEventListener('click', () => { Sound.click(); bdReset(); });
  makeChips($('#dsOriginChips'), [['syn', '합성 고분자'], ['nat', '천연 고분자']], (v) => dsTag('origin', v));
  makeChips($('#dsDegradeChips'), [['no', '자연에서 잘 분해되지 않아요'], ['yes', '미생물이 분해해요 (생분해)']], (v) => dsTag('deg', v));
  function dsTag(key, v) {
    const j = DS.selSlot; if (j < 0 || DS.slots[j].card < 0) return;
    const s = DS.slots[j]; s[key] = v; if (key === 'origin') s.badO = false; else s.badD = false; updateCtl();
  }
  $('#dsReset').addEventListener('click', () => { Sound.click(); dsReset(); });

  function uiExtra() {
    const full = CH.units.length + CH.queue >= CH_MAX;
    ['chAdd1', 'chAdd5', 'chAdd10'].forEach((id) => { $('#' + id).disabled = full; });
    $('#chNote').textContent = full ? '사슬이 가득 찼어요 (최대 ' + CH_MAX + '개). “사슬 비우기”를 눌러요.' : PHONE ? '위쪽 통의 에틸렌을 끌어서 사슬 영역에 놓아도 돼요.' : '왼쪽 통의 에틸렌을 끌어서 사슬 영역에 놓아도 돼요.';
    nRange.value = String(ST.i); nRange.style.setProperty('--pct', (ST.i / 4 * 100) + '%');
    $('#nOut').textContent = 'n = ' + fmtN(NSV[ST.i]);
    $('#nMinus').disabled = ST.i <= 0; $('#nPlus').disabled = ST.i >= 4;
    MT.forEach((m, i) => { const q = MS.selects[i]; q.p.value = MS.sel[i].p; q.u.value = MS.sel[i].u; q.p.classList.toggle('ok', MS.res[i] === 1); q.u.classList.toggle('ok', MS.res[i] === 1); q.p.classList.toggle('bad', MS.res[i] === -1); q.u.classList.toggle('bad', MS.res[i] === -1); });
    markChips($('#bdSys'), BD.sys, (function () { const o = {}; Object.keys(SYS).forEach((s) => { o[s] = BD.chains[s].length >= (s === 'pet' ? 10 : 3); }); return o; })());
    const sdd = SYS[BD.sys], fullB = BD.chains[BD.sys].length >= sdd.max;
    $$('#bdAdd button').forEach((b) => { b.disabled = fullB; });
    $('#bdHead').textContent = '💧 ' + sdd.name.split(' ')[0] + ' : 단위체 이어 붙이기';
    $('#bdNote').textContent = fullB ? '단위체 ' + sdd.max + '개까지 만들 수 있어요. “처음부터”로 다시 해 봐요.' : sdd.alt ? '같은 단위체를 연속으로 붙일 수는 없어요. 번갈아 붙여요.' : '타일을 끌어서 사슬 쪽에 놓아도 돼요.';
    const j = DS.selSlot, on = j >= 0 && DS.slots[j].card >= 0, s = on ? DS.slots[j] : null;
    $('#dsOrigin').classList.toggle('dis', !on); $('#dsDegrade').classList.toggle('dis', !on);
    markChips($('#dsOriginChips'), s ? s.origin : '', {}); markChips($('#dsDegradeChips'), s ? s.deg : '', {});
    $('#dsHead').textContent = on ? '🧩 ' + DCARD[s.card].poly + ' 표시하기' : '🧩 고분자 표시하기';
    $('#dsNote').textContent = on ? '두 가지를 모두 골라요. 다른 칸을 눌러 바꿀 수 있어요.' : '단위체 카드를 끌어서 알맞은 용도 칸에 놓아요. 카드를 누른 뒤 칸을 눌러도 돼요.';
    $('#calcIn').disabled = false;
  }

  function readouts() {
    const m = S.mode;
    if (m === 'chain') { const n = chN(); setRead('단위체 수 n', String(n), '몰질량 ≈ 28 × n', fmtN(28 * n) + ' g/mol', '사슬', n === 0 ? '비어 있어요' : n === 1 ? '단위체 1개' : n + '개가 이어졌어요'); }
    else if (m === 'state') setRead('중합도 n', fmtN(NSV[ST.i]), '몰질량 ≈ 28 × n', fmtN(28 * NSV[ST.i]) + ' g/mol', '상태', SDATA[ST.i].name);
    else if (m === 'match') setRead('맞게 짝지은 줄', MS.res.filter((r) => r === 1).length + ' / 3', '고른 줄', MS.sel.filter((s) => s.p && s.u).length + ' / 3', '단위체', MT.map((q) => q.mono).join(' · '));
    else if (m === 'build') { const st = bdStats(); setRead('사슬의 단위체 수', String(st.n), '몰질량', st.n ? fmtN(st.mass) + ' g/mol' : '—', '고른 사슬', SYS[BD.sys].name); }
    else setRead('연결한 카드', dsPlaced() + ' / 6', '표시한 고분자', dsTagged() + ' / 6', '틀린 시도', DS.wrong + '번');
  }

  /* ================= 미션 ================= */
  const resetStep1 = () => { chReset(); CH.calc = NaN; calcIn.value = ''; calcIn.classList.remove('ok', 'bad'); CH.sel = -1; };
  const levels = [
    {
      title: '에틸렌 사슬 모형', short: '사슬 모형', icon: '⛓️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 비닐봉지, 페트병, 머리카락, DNA는 모두 아주 큰 분자인데 어떻게 만들어졌을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 단백질은 아미노산이, 핵산(DNA)은 뉴클레오타이드가 길게 이어진 분자라고 배웠어요. 단위체가 반복해서 이어져 큰 분자가 되는 원리는 비닐봉지나 페트병 같은 플라스틱도 같아요.</div>' +
        '<p>작은 분자인 <b>단위체</b>가 반복해서 이어지는 반응을 <b>중합 반응</b>, 만들어진 큰 분자를 <b>고분자</b>(중합체)라고 해요. 가장 간단한 예인 <b>에틸렌(C₂H₄)</b>을 하나씩 이어 붙여 <b>폴리에틸렌</b> 사슬을 만들고, 몰질량이 어떻게 변하는지 알아봐요.</p>',
      features: ['chain'],
      setup() { resetStep1(); S.gate = ''; setScene('chain'); },
      recap: '에틸렌(단위체) n개가 반복해서 이어지는 중합 반응으로 폴리에틸렌(고분자)이 만들어져요. 고분자의 몰질량은 약 28 × n g/mol이에요.',
      summary: '<ul><li><b>단위체</b> : 고분자를 이루는 작은 분자. <b>중합 반응</b> : 단위체가 반복해서 이어지는 반응. <b>고분자(중합체)</b> : 단위체가 수없이 이어진 아주 큰 분자.</li><li>에틸렌 n개 → 폴리에틸렌 : <b>n C₂H₄ → [–CH₂CH₂–]<sub>n</sub></b>. 에틸렌의 C=C 이중 결합이 열리며 단위체끼리 이어져요.</li><li>중합도 <b>n</b> = 이어진 단위체(반복 단위)의 수. 몰질량 ≈ <b>28 × n</b> g/mol (n = 1000이면 28,000).</li><li>비닐봉지(폴리에틸렌), 페트병(PET), 머리카락(단백질), 녹말, DNA는 모두 단위체가 반복된 긴 사슬이에요.</li></ul>',
      missions: [
        {
          title: '단위체 10개 이어 붙이기',
          goal: '에틸렌 <b>10개</b>를 이어 붙여 폴리에틸렌 사슬(n = 10)을 만들어 보세요.',
          hint: (PHONE ? '위쪽' : '왼쪽') + ' 통의 에틸렌을 끌어서 사슬 영역에 놓거나, “＋5개” “＋10개” 단추를 눌러요.',
          setup() { S.gate = ''; setScene('chain'); },
          check: () => chN() >= 10, hold: 0.8,
          status: () => '이어 붙인 단위체 ' + chN() + ' / 10 ' + mark(chN() >= 10),
          explain: '에틸렌의 C=C 이중 결합 하나가 열리면서 이웃한 에틸렌과 새 결합이 생겨 사슬이 길어져요. 이렇게 같은 단위체가 <b>반복해서 결합</b>한 것이 폴리에틸렌이에요.',
        },
        {
          title: '고분자의 몰질량 계산', manual: true,
          goal: 'n = 1000인 폴리에틸렌의 <b>몰질량(g/mol)</b>을 계산해 쓰고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '에틸렌 한 분자(C₂H₄)의 몰질량이 28 g/mol이므로, 폴리에틸렌의 몰질량은 28 × n 이에요. n = 1000을 넣어 보세요.',
          setup() { S.gate = 'calc'; setScene('chain'); updateCtl(); },
          check() {
            const v = CH.calc;
            if (isNaN(v)) { calcIn.classList.remove('ok'); return '숫자를 입력해 주세요.'; }
            if (v === 28000) { calcIn.classList.add('ok'); calcIn.classList.remove('bad'); return true; }
            calcIn.classList.add('bad');
            if (v === 28) return '28은 단위체 하나(n = 1)의 몰질량이에요. n = 1000이면 단위체가 1000개 이어져 있어요.';
            if (v === 2800 || v === 280) return '0이 하나 모자라거나 많아요. 28 × 1000을 다시 계산해 보세요.';
            return '다시 계산해 보세요. 폴리에틸렌의 몰질량 ≈ 28 × n 이에요.';
          },
          explain: '몰질량 ≈ 28 g/mol × 1000 = <b>28,000 g/mol</b>. 단위체 하나(28 g/mol)보다 1000배나 큰 거대한 분자예요. 그래서 고분자라고 불러요.',
        },
        {
          type: 'quiz', title: '단위체와 고분자의 차이',
          goal: '<b>단위체</b>와 <b>고분자</b>에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; setScene('chain'); },
          choices: ['고분자는 단위체와 전혀 다른 원소로 이루어져 있어요', '고분자는 작은 분자인 단위체가 수없이 반복해서 이어진 아주 큰 분자예요', '단위체는 고분자를 이루는 원자 하나하나를 말해요', '고분자는 서로 다른 분자들이 그냥 섞여 있는 혼합물이에요'],
          answer: 1,
          feedback: ['폴리에틸렌은 에틸렌과 같은 C와 H로 이루어져 있어요. 원소가 달라지는 것이 아니라 같은 단위가 반복돼요.', '', '단위체는 원자 하나가 아니라 에틸렌(C₂H₄)처럼 하나의 작은 분자예요.', '고분자는 단위체가 결합으로 이어진 하나의 큰 분자예요. 단순히 섞인 혼합물이 아니에요.'],
          explain: '단위체는 <b>작은 분자</b>(에틸렌 등)이고, 고분자는 그 단위체가 <b>반복해서 결합</b>한 아주 큰 분자예요. 크기(몰질량)가 크고 같은 단위가 반복된다는 점이 핵심이에요.',
        },
      ],
    },
    {
      title: '중합도와 물질의 상태', short: '중합도', icon: '🌡️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에틸렌을 n개 이어 붙이면 몰질량이 28 × n으로 커지는 것을 확인했어요. 같은 에틸렌으로 만들어도 <b>n이 달라지면</b> 물질의 성질은 어떻게 달라질까요?</div>' +
        '<p>중합도 <b>n</b>을 1, 10, 20, 100, 1000으로 바꾸며 폴리에틸렌의 상태를 관찰해요. 사슬이 길어질수록 분자 사이의 <b>끌어당기는 힘</b>이 커지고 사슬이 서로 얽혀 단단해져요. 이어서 염화 비닐과 스타이렌 같은 다른 단위체로 만든 고분자와 그 쓰임도 짝지어 봐요.</p>',
      features: ['state', 'match'],
      setup() { stReset(); matchReset(); S.gate = ''; setScene('state'); },
      recap: '같은 단위체라도 사슬이 길어질수록(n이 커질수록) 기체 → 무른 왁스 → 딱딱한 왁스 → 질긴 플라스틱으로 성질이 달라져요. 실제 플라스틱은 n이 수천 이상이에요.',
      summary: '<table class="mini"><tr><th>n</th><th>몰질량 ≈ 28n</th><th>상태</th></tr><tr><td>1</td><td>28</td><td>기체 (에틸렌)</td></tr><tr><td>10</td><td>280</td><td>무른 왁스</td></tr><tr><td>20</td><td>560</td><td>파라핀 왁스</td></tr><tr><td>100</td><td>2,800</td><td>딱딱한 왁스</td></tr><tr><td>1000</td><td>28,000</td><td>플라스틱</td></tr></table><ul><li>사슬이 길수록 분자 사이 끌어당기는 힘이 커지고 서로 얽혀서 단단해져요.</li><li>염화 비닐 → PVC(수도관), 스타이렌 → 폴리스타이렌(컵 · 스티로폼), 에틸렌 → 폴리에틸렌(비닐봉지). 단위체가 달라지면 고분자의 성질과 쓰임도 달라져요.</li></ul>',
      missions: [
        {
          title: 'n을 바꿔 상태 기록하기',
          goal: '중합도 <b>n = 1, 10, 20, 100, 1000</b>일 때의 상태를 모두 관찰해 기록표를 채우세요.',
          hint: '“🌡️ 상태” 화면의 슬라이더를 움직여요. − ＋ 단추로 한 칸씩 바꿀 수도 있어요.',
          setup() { S.gate = ''; setScene('state'); },
          check: () => ST.visited.every(Boolean), hold: 0.8,
          status: () => NSV.map((v, i) => fmtN(v) + ' ' + mark(ST.visited[i])).join(' &nbsp;'),
          explain: 'n이 작을 때는 기체나 무른 왁스지만, n이 1000에 이르면 질기고 단단한 플라스틱이 돼요. 사슬이 길수록 분자 사이의 끌어당기는 힘이 커지고 사슬이 서로 얽히기 때문이에요.',
        },
        {
          title: '단위체 · 고분자 · 용도 짝짓기', manual: true,
          goal: '단위체 세 가지마다 만들어지는 <b>고분자</b>와 주된 <b>용도</b>를 골라 짝을 맞추고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '에틸렌은 비닐봉지를 만드는 폴리에틸렌, 염화 비닐은 단단한 PVC, 스타이렌은 가볍고 단열이 좋은 폴리스타이렌이 돼요.',
          setup() { S.gate = ''; setScene('match'); },
          check() {
            if (!mtFilled()) return '고분자와 용도를 모든 줄에서 골라 주세요.';
            let ok = 0; const bad = [];
            MT.forEach((m, i) => { if (mtOk(i)) { MS.res[i] = 1; ok++; } else { if (MS.res[i] !== -1) MS.res[i] = -1; bad.push(m.mono); } });
            if (ok === 3) return true;
            updateCtl();
            return '“' + bad.join('”, “') + '” 줄을 다시 확인해 보세요. 빨간 칸이 틀린 곳이에요.';
          },
          explain: '<b>에틸렌 → 폴리에틸렌</b>(포장 필름 · 비닐봉지), <b>염화 비닐 → PVC</b>(수도관), <b>스타이렌 → 폴리스타이렌</b>(일회용 컵 · 스티로폼). 이름이 단위체 이름에서 나왔어요.',
        },
        {
          type: 'quiz', title: 'n이 작으면 플라스틱이 안 되는 까닭',
          goal: 'n = 10인 폴리에틸렌은 비닐봉지처럼 질기고 단단하지 않고 무른 왁스예요. 그 까닭은?',
          setup() { S.gate = ''; setScene('state'); },
          choices: ['단위체가 에틸렌이 아닌 다른 물질로 바뀌기 때문이에요', '사슬이 짧아 분자 사이의 끌어당기는 힘이 작고 사슬이 서로 얽히기 어렵기 때문이에요', 'n이 작으면 탄소와 수소의 비율이 달라지기 때문이에요', '이중 결합이 많이 남아 있기 때문이에요'],
          answer: 1,
          feedback: ['단위체는 에틸렌 그대로예요. 달라진 것은 이어진 개수(n)뿐이에요.', '', '반복 단위가 –CH₂CH₂–로 같으므로 C와 H의 비율은 거의 같아요. 사슬의 길이가 달라졌을 뿐이에요.', '중합이 일어나면 이중 결합이 열려 단일 결합이 돼요. 이중 결합이 남아 있는 것은 아니에요.'],
          explain: '사슬이 짧으면 분자 사이의 끌어당기는 힘이 작고 서로 얽히지 못해 쉽게 녹고 부서져요. 단위체가 <b>수천 개 이상</b> 이어져야 질기고 단단한 플라스틱이 돼요.',
        },
      ],
    },
    {
      title: '물이 빠지며 연결', short: '물이 빠짐', icon: '💧', phase: '관찰',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에틸렌은 이중 결합이 열리며 이어졌어요. 그런데 어떤 단위체는 연결될 때마다 <b>물 분자(H₂O)가 빠져나와요.</b> 단원 앞 차시에서 배운 알코올의 <b>–OH</b>와 카복실산의 <b>–COOH</b>가 만나는 경우가 대표적이에요.</div>' +
        '<p><b>PET</b>(페트병 재료)는 –COOH가 2개인 <b>테레프탈산</b>과 –OH가 2개인 <b>에틸렌 글라이콜</b>이 번갈아 이어져요. 단위체를 하나씩 붙여 연결 지점마다 물이 빠지는 것을 세어 보고, <b>단백질</b>과 <b>녹말</b> 같은 천연 고분자도 같은 방식으로 이어지는지 확인해요.</p>',
      features: ['build'],
      setup() { bdResetAll(); S.gate = ''; setScene('build'); bdSetSys('pet'); },
      recap: 'PET는 테레프탈산과 에틸렌 글라이콜이 번갈아 이어지고, 연결 지점마다 H₂O가 1분자씩 빠져나가요. 단백질(아미노산)과 녹말(포도당)도 물이 빠지며 단위체가 반복해서 이어져요.',
      summary: '<ul><li><b>PET</b> : 테레프탈산(–COOH 2개) + 에틸렌 글라이콜(–OH 2개)이 번갈아 연결, 연결 지점마다 <b>H₂O 1분자</b>가 빠져나가요. 단위체 2n개가 이어지면 (2n − 1)분자가 빠져요.</li><li>PET 반복 단위 C₁₀H₈O₄ = 166 + 62 − 2 × 18 = <b>192 g/mol</b> (n = 100이면 약 19,200).</li><li><b>단백질</b>은 아미노산 사이마다, <b>녹말</b>은 포도당 사이마다 물이 빠지며 이어져요.</li><li>합성 고분자(PET)와 천연 고분자(단백질 · 녹말) 모두 <b>단위체의 반복적 결합</b>으로 만들어져요.</li></ul>',
      missions: [
        {
          title: 'PET 사슬 만들기',
          goal: '테레프탈산과 에틸렌 글라이콜을 <b>번갈아</b> 이어 붙여 <b>반복 단위 5개</b>(단위체 10개)짜리 PET 사슬을 만드세요.',
          hint: '같은 단위체를 연달아 붙일 수는 없어요. 테레프탈산 → 에틸렌 글라이콜 → 테레프탈산 … 순서로 붙여요. 타일을 끌어다 놓거나 아래 단추를 눌러요.',
          setup() { S.gate = ''; setScene('build'); bdSetSys('pet'); },
          check: () => { const s = bdStats('pet'); return s.n >= 10 && s.water >= 9; }, hold: 0.9,
          status: () => { const s = bdStats('pet'); return '단위체 ' + s.n + ' / 10 · 반복 단위 ' + Math.floor(s.n / 2) + ' / 5 ' + mark(s.n >= 10 && s.water >= 9); },
          explain: '–COOH(테레프탈산)와 –OH(에틸렌 글라이콜)가 만나면 <b>H₂O</b>가 빠지며 연결돼요. 같은 끝끼리(–COOH끼리, –OH끼리)는 이렇게 연결되지 않아서 두 단위체가 <b>번갈아</b> 이어져요.',
        },
        {
          title: '천연 고분자도 같은 방식으로',
          goal: '<b>단백질</b>(아미노산)과 <b>녹말</b>(포도당)을 각각 단위체 <b>3개 이상</b> 이어 붙여 보세요.',
          hint: '화면 위쪽 “단백질”, “녹말” 단추로 사슬을 바꾼 뒤, 타일을 끌어다 놓거나 단추를 눌러요. 아미노산은 어떤 순서로 붙여도 돼요.',
          setup() { S.gate = ''; setScene('build'); bdSetSys('pro'); },
          check: () => { const a = bdStats('pro'), b = bdStats('sta'); return a.n >= 3 && a.water >= 2 && b.n >= 3 && b.water >= 2; }, hold: 0.9,
          status: () => { const a = bdStats('pro'), b = bdStats('sta'); return '단백질 ' + Math.min(a.n, 3) + ' / 3 ' + mark(a.n >= 3 && a.water >= 2) + ' &nbsp;녹말 ' + Math.min(b.n, 3) + ' / 3 ' + mark(b.n >= 3 && b.water >= 2); },
          explain: '아미노산이 이어질 때마다, 포도당이 이어질 때마다 <b>H₂O가 1분자씩 빠져나가요.</b> 천연 고분자도 합성 고분자처럼 단위체가 반복해서 결합한 큰 분자예요.',
        },
        {
          type: 'quiz', title: '빠져나간 물 분자 수',
          goal: '테레프탈산 <b>4개</b>와 에틸렌 글라이콜 <b>4개</b>가 번갈아 한 줄로 연결될 때, 빠져나가는 물 분자는 모두 몇 개일까요?',
          setup() { S.gate = ''; setScene('build'); bdSetSys('pet'); },
          choices: ['4개', '7개', '8개', '16개'],
          answer: 1,
          feedback: ['단위체가 8개이므로 연결 지점은 4곳보다 많아요. 연결 지점마다 물이 1분자씩 빠져요.', '', '단위체가 8개라도 한 줄로 이어 붙일 때 연결 지점은 8곳이 아니라 (8 − 1)곳이에요.', '연결 지점마다 물 1분자가 빠져요. 각 단위체가 2번씩 물을 내놓는 것이 아니에요.'],
          explain: '한 줄로 연결하면 단위체 8개 사이의 연결 지점은 <b>8 − 1 = 7곳</b>이에요. 연결 지점마다 H₂O가 1분자씩 빠져나가므로 모두 <b>7개</b>예요. 단위체가 아주 많으면 반복 단위(2개)당 약 2분자가 빠진다고 볼 수 있어요.',
        },
      ],
    },
    {
      title: '고분자 설계', short: '고분자 설계', icon: '🧩', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 합성 고분자(PET)와 천연 고분자(단백질 · 녹말)가 모두 단위체의 반복 결합으로 만들어지는 것을 확인했어요. 이제 단위체에 알맞은 고분자와 쓰임을 연결해 <b>고분자를 설계</b>해 봐요.</div>' +
        '<p>단위체 카드 6장을 알맞은 <b>용도 칸</b>에 끌어다 놓으면 단위체가 이어져 고분자가 돼요. 그다음 각 고분자가 <b>합성 고분자인지 천연 고분자인지</b>, 자연에서 <b>분해되는지</b> 표시해요. 단위체의 종류가 달라지면 고분자의 성질과 쓰임도 달라져요.</p>',
      features: ['design'],
      setup() { dsReset(); S.gate = ''; setScene('design'); },
      recap: '단위체의 종류에 따라 고분자의 성질과 쓰임이 달라져요. 합성 고분자도 천연 고분자도 단위체의 반복 결합이며, 합성 고분자는 대부분 자연에서 잘 분해되지 않고 천연 고분자는 미생물이 분해해요.',
      summary: '<table class="mini"><tr><th>단위체</th><th>고분자</th><th>용도</th><th>구분</th></tr><tr><td>에틸렌</td><td>폴리에틸렌</td><td>비닐봉지</td><td>합성</td></tr><tr><td>염화 비닐</td><td>PVC</td><td>수도관</td><td>합성</td></tr><tr><td>스타이렌</td><td>폴리스타이렌</td><td>컵 · 스티로폼</td><td>합성</td></tr><tr><td>테레프탈산 + 에틸렌 글라이콜</td><td>PET</td><td>페트병 · 섬유</td><td>합성</td></tr><tr><td>아미노산</td><td>단백질</td><td>효소 · 머리카락</td><td>천연</td></tr><tr><td>포도당</td><td>녹말 · 셀룰로스</td><td>에너지 저장 · 식물 뼈대</td><td>천연</td></tr></table><ul><li>합성 · 천연 모두 <b>단위체의 반복적 결합</b>이에요. 단위체의 종류와 배열이 고분자의 성질을 정해요.</li><li>합성 고분자는 대부분 자연에서 잘 분해되지 않아 폐기물 문제가 생겨요. 천연 고분자는 미생물이 분해해요.</li></ul>',
      missions: [
        {
          title: '카드 연결하고 표시하기', manual: true,
          goal: '단위체 카드 <b>6장</b>을 알맞은 용도 칸에 연결하고, 고분자마다 <b>합성/천연</b>과 <b>분해 여부</b>를 표시한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '단위체 이름에서 고분자 이름을 떠올려요. 연결된 칸을 누르면 오른쪽(아래)에 표시 단추가 나타나요. 사람이 만든 것은 합성, 생물이 만든 것은 천연이에요.',
          setup() { S.gate = ''; setScene('design'); },
          check() {
            const pl = dsPlaced();
            if (pl < 6) return '아직 연결하지 못한 카드가 ' + (6 - pl) + '장 있어요.';
            const miss = DS.slots.filter((s) => !s.origin || !s.deg).length;
            if (miss) return '표시하지 않은 고분자가 ' + miss + '개 있어요. 연결된 칸을 눌러 합성/천연과 분해 여부를 골라요.';
            let nbad = 0;
            DS.slots.forEach((s, j) => { const d = DCARD[s.card]; if (s.origin !== d.origin) { nbad++; s.badO = true; } if (s.deg !== d.deg) { nbad++; s.badD = true; } });
            if (nbad) { updateCtl(); return '틀린 표시가 ' + nbad + '곳 있어요. 빨간색으로 표시된 곳을 다시 확인해 보세요.'; }
            return true;
          },
          status: () => '연결 ' + dsPlaced() + ' / 6 · 표시한 칸 ' + dsTagged() + ' / 6',
          explain: '합성 고분자(폴리에틸렌 · PVC · 폴리스타이렌 · PET)는 대부분 자연에서 잘 분해되지 않아요. 천연 고분자(단백질 · 녹말 · 셀룰로스)는 미생물이 분해해요. 모두 <b>단위체의 반복적 결합</b>으로 만들어졌어요.',
        },
        {
          type: 'quiz', title: '고분자에 대한 옳은 설명',
          goal: '고분자에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; setScene('design'); },
          choices: ['단백질과 녹말 같은 천연 고분자는 단위체의 반복 결합이 아니라 하나의 큰 덩어리로 만들어져요', '합성 고분자와 천연 고분자는 모두 단위체가 반복해서 결합한 큰 분자예요', '단위체의 종류를 바꿔도 고분자의 성질은 달라지지 않아요', '합성 고분자는 모두 자연에서 쉽게 분해돼요'],
          answer: 1,
          feedback: ['단백질은 아미노산, 녹말은 포도당이 반복해서 결합한 것이에요. 천연 고분자도 단위체의 반복 결합이에요.', '', '폴리에틸렌, PVC, 폴리스타이렌처럼 단위체가 달라지면 성질과 쓰임이 달라져요.', '플라스틱 같은 합성 고분자는 대부분 자연에서 잘 분해되지 않아서 폐기물 문제가 생겨요.'],
          explain: '합성 고분자(폴리에틸렌, PET …)와 천연 고분자(단백질, 녹말, DNA …)는 <b>모두 단위체의 반복 결합</b>이에요. 단위체의 종류가 달라지면 성질과 쓰임이 달라져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-polymerization', mount: '#game', badge: '고분자 설계사', homeHref: '../../index.html#hr',
    featureLabels: { chain: '⛓️ 에틸렌 사슬 모형 · 몰질량 계산', state: '🌡️ 중합도 슬라이더 · 상태 기록', match: '🔗 단위체 · 고분자 · 용도 짝짓기', build: '💧 PET · 단백질 · 녹말 연결 · 물 모으기', design: '🧩 고분자 카드 설계 · 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  stReset();
  setScene('chain');
  function stepAll1(dt) { stepChain(dt); stepState(dt); stepBuild(dt); stepDesign(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'chain') drawChain(t); else if (S.mode === 'state') drawState(t); else if (S.mode === 'match') drawMatch(t); else if (S.mode === 'build') drawBuild(t); else drawDesign(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, CH, ST, MS, BD, DS, MT, SYS, KIND, DCARD, DSLOT, NSV, VW, VH, PHONE, MAIN, INFO,
    chAdd, chAddUnit, chReset, chN, stSet, mtOk, mtN, bdAdd, bdStats, bdReset, bdResetAll, bdSetSys, dsPlace, dsReset, dsPlaced, dsTagged, dsOk, cGeo, bdTrayPos, bdTrayBottom, dHome, dSlotR, wtGeo, evRect, bdK,
    get game() { return game; }, setScene, uiExtra, matchReset,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
