/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 반응 속도식 [12물에04-01]
   ① 관찰: 농도의 영향 (농도 2배 → 속도 1배·2배·4배 = 0차·1차·2차)
   ② 탐구: 초기 속도법 (변인이 하나만 바뀐 두 실험 짝짓기)
   ③ 분석: 속도식 v = k[A]ᵐ[B]ⁿ 완성, 속도 상수 k 의 값과 단위, 속도 예측
   ④ 적용: 계수 ≠ 차수, 전체 반응 차수, 농도 배수 표
   적분 속도식, 반응 메커니즘, 속도 결정 단계, 분수·음수 차수는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 960 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9', TEAL = '#0d9488';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const HALO = { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3 };
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const f4 = (v) => (Math.round(v * 10000) / 10000).toFixed(4);
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sg = (v, fn) => (v < 0 ? MINUS : v > 0 ? '+' : '') + fn(Math.abs(v));
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUPM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {                                  // 0.0080, 8.0e-3, 8.0×10⁻³, −5.0 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPM[c]).join(''))
      .replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([+-]?[0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  /* 속도 입력은 10⁻³ M/s 단위로 읽어요. 0.0080 처럼 M/s 로 적어도 같은 값으로 읽어요. */
  function rateIn(s) { const n = parseNum(s); if (isNaN(n)) return NaN; return Math.abs(n) > 0 && Math.abs(n) < 0.1 ? n * 1000 : n; }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;


  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { obs: '🧫 농도를 바꾸면 처음 속도는 어떻게 변할까요?', pair: '🔎 한 가지만 바뀐 두 실험을 짝지어요', law: '🧾 속도식과 속도 상수 k 를 구해요', chk: '🔍 계수와 반응 차수는 달라요' };
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  const sci = (v, d) => { const e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e); return m.toFixed(d) + '×10' + sup(e); };

  /* ================= 자료 ================= */
  /* 초기 속도 자료 (일정 온도). rows: [농도..., v₀(M/s), v₀ 표기] */
  const DATA = {
    A: { key: 'A', name: '자료 A', eq: '2NO(g) + 2H₂(g) → N₂(g) + 2H₂O(g)', sp: ['NO', 'H₂'], coef: [2, 2], ord: [2, 1], k: 1.2, kTxt: '1.2', rows: [[0.10, 0.10, 1.2e-3, '1.2×10⁻³'], [0.20, 0.10, 4.8e-3, '4.8×10⁻³'], [0.10, 0.20, 2.4e-3, '2.4×10⁻³']] },
    B: { key: 'B', name: '자료 B', eq: 'A + B → C', sp: ['A', 'B'], coef: [1, 1], ord: [1, 0], k: 2.0e-2, kTxt: '2.0×10⁻²', rows: [[0.10, 0.10, 2.0e-3, '2.0×10⁻³'], [0.20, 0.10, 4.0e-3, '4.0×10⁻³'], [0.10, 0.30, 2.0e-3, '2.0×10⁻³']] },
    C: { key: 'C', name: '자료 C', eq: '2NO₂(g) → 2NO(g) + O₂(g)', sp: ['NO₂'], coef: [2], ord: [2], k: 0.54, kTxt: '0.54', rows: [[0.10, 5.4e-3, '5.4×10⁻³'], [0.20, 2.16e-2, '2.16×10⁻²'], [0.30, 4.86e-2, '4.86×10⁻²']] },
  };
  const UNITS = ['M/s', 's⁻¹', 'M⁻¹s⁻¹', 'M⁻²s⁻¹'];                  // 전체 차수 0, 1, 2, 3 의 k 단위
  const totOrd = (d) => d.ord.reduce((a, b) => a + b, 0);
  const kUnitIdx = (d) => totOrd(d);
  const cnt = (d) => d.sp.length;
  const vOf = (d, r, ords, k) => { let v = k; for (let j = 0; j < cnt(d); j++) v *= Math.pow(d.rows[r][j], ords[j]); return v; };   // k × 농도^차수
  const MAPTBL = [['1배', '0차'], ['2배', '1차'], ['4배', '2차']];
  const mulTxt = (o, m) => String(Math.pow(m, o));

  /* ---------- 상태 ---------- */
  const ORD = [1, 2, 0];                                      // 반응기 ①②③ 의 차수 (처음에는 숨겨져 있어요)
  const NMAX = 24;
  const S = {
    mode: 'obs', fade: 0, lock: false, t: 0,
    ob: { m: [1, 1, 1], rec: [false, false, false], P: [[], [], []], acc: [0, 0, 0], fl: [[], [], []], bar: [1 / 9, 1 / 9, 1 / 9], seen: [{}, {}, {}] },
    pr: { pair: -1, seen: [false, false, false], m: -1, n: -1, shake: 0, flash: 0 },
    lw: { ds: 'A', ord: { A: [-1, -1], B: [-1, -1], C: [-1] }, k: { A: '', B: '', C: '' }, u: { A: -1, B: -1, C: -1 }, pred: '', stamp: 1 },
    ck: { rx: 'A', mul: 2, seenMul: {}, pulse: 1 },
  };
  let game = null;
  let ALLOW = { A: true, B: true, C: true };                  // 미션마다 열어 둘 자료

  /* ================= ① 농도의 영향 ================= */
  const OB = () => S.ob;
  const boxOb = (i) => { const L = RC.L, cw = (L.w - 24) / 3; return { x: L.x + 12 + i * cw + 6, y: L.y + 92, w: cw - 12, h: 172, cx: L.x + 12 + i * cw + cw / 2 }; };
  const vRel = (i, m) => Math.pow(m, ORD[i]);
  function obInit() {
    const O = OB();
    for (let i = 0; i < 3; i++) {
      const b = boxOb(i); O.P[i] = [];
      for (let k = 0; k < NMAX; k++) { const a = Math.random() * TAU, sp = rnd(22, 40); O.P[i].push({ x: b.x + 12 + Math.random() * (b.w - 24), y: b.y + 12 + Math.random() * (b.h - 24), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, al: k < 8 * O.m[i] ? 1 : 0 }); }
      O.acc[i] = 0; O.fl[i] = [];
    }
  }
  function setMul(i, m) {
    const O = OB(); if (O.m[i] === m) return; O.m[i] = m; O.acc[i] = 0; O.seen[i][m] = true; Sound.tick();
    if (m === 2 && !O.rec[i]) { O.rec[i] = true; Sound.success(); const b = boxOb(i); parts.burst(b.cx, b.y + b.h + 50, { count: 12, speed: 110, life: 0.6, size: 3.4 }); }
    updateCtl();
  }
  function stepOb(dt) {
    const O = OB();
    for (let i = 0; i < 3; i++) {
      const b = boxOb(i), v = vRel(i, O.m[i]);
      O.P[i].forEach((p, k) => {
        p.al = ap2(p.al, k < 8 * O.m[i] ? 1 : 0, dt, 5);
        p.x += p.vx * dt; p.y += p.vy * dt;
        const m = 7;
        if (p.x < b.x + m) { p.x = b.x + m; p.vx = Math.abs(p.vx); } else if (p.x > b.x + b.w - m) { p.x = b.x + b.w - m; p.vx = -Math.abs(p.vx); }
        if (p.y < b.y + m) { p.y = b.y + m; p.vy = Math.abs(p.vy); } else if (p.y > b.y + b.h - m) { p.y = b.y + b.h - m; p.vy = -Math.abs(p.vy); }
      });
      O.bar[i] = ap2(O.bar[i], v / 9, dt, 6); if (Math.abs(O.bar[i] - v / 9) < 0.002) O.bar[i] = v / 9;
      if (S.mode === 'obs') {                                  // 반응 섬광: 1초에 v 번 (v 는 상대 속도)
        O.acc[i] += dt * v;
        while (O.acc[i] >= 1) { O.acc[i] -= 1; const vis = O.P[i].filter((p, k) => k < 8 * O.m[i]); const p = vis[Math.floor(Math.random() * vis.length)]; if (p) O.fl[i].push({ x: p.x, y: p.y, t: 0 }); }
      }
      O.fl[i] = O.fl[i].filter((f) => (f.t += dt) < 0.45);
    }
  }
  const OBC = ['#4a7bf0', '#9b5de5', '#0d9488'];
  function drawObs(t) {
    const L = RC.L, O = OB();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧫 반응기 3개: 반응물 농도를 바꿔 봐요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '온도 일정 · 처음 속도 v₀ 를 상대값으로 비교해요 (처음 농도의 v₀ = 1)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    for (let i = 0; i < 3; i++) {
      const b = boxOb(i), m = O.m[i], v = vRel(i, m);
      T(b.cx, L.y + 78, '반응기 ' + '①②③'[i], 14, INK, 'center', 800);
      D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 10); ctx.clip();
      O.fl[i].forEach((f) => { const u = f.t / 0.45; D.glow(f.x, f.y, 10 + u * 20, '#ffb020', 0.8 * (1 - u)); });
      O.P[i].forEach((p) => { if (p.al > 0.02) { ctx.globalAlpha = p.al; D.sphere(p.x, p.y, 5.4, OBC[i], { gloss: true }); ctx.globalAlpha = 1; } });
      ctx.restore();
      T(b.cx, b.y + b.h + 20, '농도 ×' + m, 14, OBC[i], 'center', 800);
      // 속도 막대 (v / 9 로 눈금)
      const by = b.y + b.h + 34, bw = b.w;
      D.roundRect(b.x, by, bw, 16, 6); ctx.fillStyle = '#eceff6'; ctx.fill();
      const w = clamp(O.bar[i], 0, 1) * bw; if (w > 0.5) { D.roundRect(b.x, by, Math.max(w, 0), 16, 6); ctx.fillStyle = '#f59e0b'; ctx.fill(); }
      T(b.cx, by + 38, '속도 v = ' + f0(v) + '배', 14, INK, 'center', 800);
      T(b.cx, by + 58, '(초당 반응 ' + f0(v) + '회)', 12.5, MUTED, 'center', 700);
      if (O.rec[i]) D.check(b.x + b.w - 12, L.y + 74, 8, 1);
    }
    // 눈금 설명
    T(L.x + 14, L.y + 420, '막대 길이: 속도 v (맨 오른쪽 = 처음의 9배)', 12.5, MUTED, 'left', 700);
    const n = O.rec.filter(Boolean).length;
    textBlock(L.x + 14, L.y + 446, L.w - 28, n < 3 ? '반응기마다 농도를 ×2 로 올려 처음 속도가 몇 배가 되는지 확인해요. (' + n + ' / 3)' : '농도를 2배로 올렸을 때 속도가 1배, 2배, 4배로 달라요. 오른쪽 대응표에서 차수를 읽어요.', 13, INK, 18, 800);
  }
  function drawObsInfo(t) {
    const R = RC.R, O = OB();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 농도 2배일 때 속도', 14.5, INK, 'left', 800);
    const rh = PHONE ? 36 : 44, y0 = R.y + 38;
    for (let i = 0; i < 3; i++) {
      const y = y0 + i * (rh + 4);
      D.roundRect(R.x + 10, y, R.w - 20, rh, 10); ctx.fillStyle = O.rec[i] ? 'rgba(20,160,88,.08)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = O.rec[i] ? GOOD : '#d9d0f5'; ctx.lineWidth = 1.5; ctx.stroke();
      T(R.x + 22, y + rh / 2 + 5, '반응기 ' + '①②③'[i], 13.5, OBC[i], 'left', 800);
      T(R.x + R.w - 22, y + rh / 2 + 5, O.rec[i] ? '2배 → ' + f0(vRel(i, 2)) + '배  (' + ORD[i] + '차)' : '2배 → ?', 14, O.rec[i] ? '#0f6b3c' : '#9aa6bb', 'right', 800);
    }
    const y1 = y0 + 3 * (rh + 4) + 8;
    D.roundRect(R.x + 10, y1, R.w - 20, PHONE ? 100 : 128, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, y1 + 20, '대응표: 농도 2배일 때', 13, PUR, 'left', 800);
    MAPTBL.forEach((q, i) => { const yy = y1 + 44 + i * (PHONE ? 22 : 28); T(R.x + 24, yy, '속도 ' + q[0], 14, INK, 'left', 800); T(R.x + R.w / 2 - 6, yy, '→', 14, MUTED, 'center', 800); T(R.x + R.w - 24, yy, q[1] + ' 반응', 14, PUR, 'right', 800); });
    const y2 = y1 + (PHONE ? 112 : 142);
    if (y2 + 20 < R.y + R.h) textBlock(R.x + 14, y2 + 8, R.w - 28, '반응 차수 n: 농도를 2배로 하면 속도는 2ⁿ배가 돼요. (0차: 변화 없음)', 12.5, MUTED, 17, 700);
  }

  /* ================= ② 초기 속도법 ================= */
  const PR = () => S.pr;
  const PAIRS = [[0, 1], [0, 2], [1, 2]];
  const pairName = (p) => '실험 ' + (PAIRS[p][0] + 1) + '·' + (PAIRS[p][1] + 1);
  function pairInfo(p) {
    const A = DATA.A, [i, j] = PAIRS[p], r = A.rows, ch = [0, 1].map((k) => Math.abs(r[j][k] / r[i][k] - 1) > 1e-9);
    return { i, j, dNO: r[j][0] / r[i][0], dH: r[j][1] / r[i][1], dv: r[j][2] / r[i][2], one: ch[0] !== ch[1], who: ch[0] && !ch[1] ? 0 : ch[1] && !ch[0] ? 1 : -1 };
  }
  function setPair(p) { const P = PR(); P.pair = p; if (p >= 0 && !P.seen[p]) { P.seen[p] = true; Sound.tick(); } updateCtl(); }
  function pairResult() {
    const P = PR();
    if (!P.seen[0] || !P.seen[1]) return '변인이 하나만 바뀐 두 실험 짝(1·2, 1·3)을 모두 비교해 봐요.';
    if (P.m < 0 || P.n < 0) return 'NO 와 H₂ 의 차수를 모두 골라요.';
    if (P.m !== 2) return P.m === 1 ? '실험 1·2 에서 NO 가 2배일 때 속도는 4배예요. 2배 → 4배는 몇 차일까요?' : (P.m === 0 ? '속도가 달라졌으니 NO 의 차수는 0차가 아니에요.' : 'NO 의 차수를 다시 확인해요. 2배 → 4배는 1차(2배)보다 큰 쪽이에요.');
    if (P.n !== 1) return P.n === 2 ? '실험 1·3 에서 H₂ 가 2배일 때 속도는 2배예요. 2배 → 4배가 2차예요.' : P.n === 0 ? '속도가 달라졌으니 H₂ 의 차수는 0차가 아니에요.' : 'H₂ 의 차수를 다시 확인해요.';
    return true;
  }
  const rowY = (k, L, y0, rh) => y0 + rh * (k + 1);
  function drawPair(t) {
    const L = RC.L, P = PR(), A = DATA.A;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔎 자료 A: 초기 속도 v₀ (일정 온도)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, A.eq, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const x0 = L.x + 14, W = L.w - 28, rh = 48, y0 = L.y + 62, cw = [46, 100, 100, W - 246];
    const cx = [x0, x0 + cw[0], x0 + cw[0] + cw[1], x0 + cw[0] + cw[1] + cw[2]];
    D.roundRect(x0, y0, W, rh - 8, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    ['실험', '[NO] (M)', '[H₂] (M)', '초기 속도 v₀ (M/s)'].forEach((h, k) => T(cx[k] + cw[k] / 2, y0 + 22, h, 13, INK, 'center', 800));
    const info = P.pair >= 0 ? pairInfo(P.pair) : null;
    for (let k = 0; k < 3; k++) {
      const y = y0 + rh * (k + 1) - 2, sel = info && (info.i === k || info.j === k);
      D.roundRect(x0, y, W, rh - 6, 10); ctx.fillStyle = sel ? 'rgba(124,58,237,.10)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2.4 : 1.3; ctx.stroke();
      T(cx[0] + cw[0] / 2, y + 28, String(k + 1), 16, sel ? PUR : INK, 'center', 800);
      // 변한 농도 강조
      const ch0 = info && sel && info.dNO !== 1 && k === info.j, ch1 = info && sel && info.dH !== 1 && k === info.j;
      T(cx[1] + cw[1] / 2, y + 28, f2(A.rows[k][0]), 15, ch0 ? AMB : INK, 'center', 800);
      T(cx[2] + cw[2] / 2, y + 28, f2(A.rows[k][1]), 15, ch1 ? AMB : INK, 'center', 800);
      // 속도 막대
      const bw = cw[3] - 20, w = A.rows[k][2] / 5e-3 * bw;
      D.roundRect(cx[3] + 8, y + 24, bw, 12, 5); ctx.fillStyle = '#eceff6'; ctx.fill(); D.roundRect(cx[3] + 8, y + 24, Math.min(bw, w), 12, 5); ctx.fillStyle = sel ? '#f59e0b' : '#e8b063'; ctx.fill();
      T(cx[3] + cw[3] / 2, y + 18, A.rows[k][3], 14, INK, 'center', 800);
    }
    // 비교 결과
    const yb = y0 + rh * 4 + 6;
    D.roundRect(L.x + 12, yb, L.w - 24, L.y + L.h - yb - 12, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    if (!info) { textBlock(L.x + 26, yb + 30, L.w - 52, '조작판에서 비교할 두 실험을 골라요. 변인이 하나만 바뀐 짝에서 차수를 읽어요.', 14, MUTED, 20, 800); return; }
    T(L.x + 26, yb + 26, pairName(P.pair) + ' 비교', 14.5, PUR, 'left', 800);
    const fmt = (x) => '×' + (Math.round(x * 100) / 100);
    if (info.one) {
      const nm = ['NO', 'H₂'][info.who], dc = info.who === 0 ? info.dNO : info.dH;
      T(L.x + 26, yb + 54, '바뀐 농도: [' + nm + '] ' + fmt(dc) + '  (다른 농도는 그대로)', 14, INK, 'left', 800);
      T(L.x + 26, yb + 80, '속도 v₀ 의 변화: ' + fmt(info.dv), 14, INK, 'left', 800);
      T(L.x + 26, yb + 108, '농도 ' + fmt(dc) + ' → 속도 ' + fmt(info.dv) + '  ⇒  ' + (info.dv > 3.5 ? '2차' : info.dv > 1.5 ? '1차' : '0차') + ' 반응물', 15, '#0f6b3c', 'left', 800);
      T(L.x + 26, yb + 134, '(2배 → 1배: 0차, 2배: 1차, 4배: 2차)', 12.5, MUTED, 'left', 700);
    } else {
      T(L.x + 26, yb + 54, '바뀐 농도: [NO] ' + fmt(info.dNO) + ',  [H₂] ' + fmt(info.dH), 14, AMB, 'left', 800);
      T(L.x + 26, yb + 80, '속도 v₀ 의 변화: ' + fmt(info.dv), 14, INK, 'left', 800);
      textBlock(L.x + 26, yb + 108, L.w - 52, '두 농도가 한꺼번에 바뀌었어요. 속도의 변화가 어느 농도 때문인지 알 수 없어요. 변인이 하나만 바뀐 짝을 골라요.', 13, BAD, 18, 800);
    }
    if (P.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + P.flash * 0.1 + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawPairInfo(t) {
    const R = RC.R, P = PR();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧭 초기 속도법', 14.5, INK, 'left', 800);
    const tx = ['① 두 실험을 짝지어요', '② 한 반응물의 농도만 달라야 해요', '③ 농도 몇 배 → 속도 몇 배?', '④ 대응표로 차수를 읽어요'];
    tx.forEach((s, i) => { const done = i === 0 ? P.seen[0] || P.seen[1] : i === 3 ? P.m >= 0 && P.n >= 0 : P.seen[0] && P.seen[1]; T(R.x + 16, R.y + 54 + i * 26, (done ? '✅ ' : '⬜ ') + s, 13, done ? '#0f6b3c' : INK, 'left', 800); });
    const y1 = R.y + 168;
    D.roundRect(R.x + 10, y1, R.w - 20, PHONE ? 88 : 118, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, y1 + 20, '대응표 (농도 2배일 때)', 13, PUR, 'left', 800);
    MAPTBL.forEach((q, i) => { const yy = y1 + 44 + i * (PHONE ? 20 : 26); T(R.x + 24, yy, '속도 ' + q[0], 13.5, INK, 'left', 800); T(R.x + R.w - 24, yy, q[1], 13.5, PUR, 'right', 800); });
    const y2 = y1 + (PHONE ? 98 : 130);
    if (y2 + 40 < R.y + R.h) {
      const m = P.m >= 0 ? String(P.m) : '?', n = P.n >= 0 ? String(P.n) : '?';
      D.roundRect(R.x + 10, y2, R.w - 20, 56, 10); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(124,58,237,.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      T(R.x + R.w / 2, y2 + 24, '속도식의 모양', 12.5, MUTED, 'center', 800);
      T(R.x + R.w / 2, y2 + 46, 'v = k[NO]' + (P.m >= 0 ? sup(P.m) : 'ᵐ') + '[H₂]' + (P.n >= 0 ? sup(P.n) : 'ⁿ'), 16, PUR, 'center', 800);
    }
  }

  /* ================= ③ 속도식 완성 ================= */
  const LW = () => S.lw, DS = () => DATA[S.lw.ds];
  const lwOrd = (k) => LW().ord[k || LW().ds];
  const lwOrdOk = (k) => { const d = DATA[k || LW().ds], o = lwOrd(k); return o.every((v, j) => v === d.ord[j]); };
  const lwKVal = (k) => parseNum(LW().k[k || LW().ds]);
  const lwKOk = (k) => { const d = DATA[k || LW().ds], v = lwKVal(k); return LW().k[k || LW().ds] !== '' && !isNaN(v) && Math.abs(v - d.k) <= d.k * 0.02; };
  const lwUOk = (k) => LW().u[k || LW().ds] === kUnitIdx(DATA[k || LW().ds]);
  const lwDone = (k) => lwOrdOk(k) && lwKOk(k) && lwUOk(k);
  const predVal = () => { const n = parseNum(LW().pred); return isNaN(n) ? NaN : (n > 0 && n < 0.1 ? n * 100 : n); };
  const predOk = () => LW().pred !== '' && near(predVal(), 1.08, 0.02);
  const lawStr = (d, ords) => 'v = k' + d.sp.map((s, j) => (ords[j] === 0 ? '' : '[' + s + ']' + (ords[j] === 1 ? '' : sup(ords[j])))).join('');
  function setDs(k) { if (!ALLOW[k]) return; const L = LW(); if (L.ds !== k) { L.ds = k; L.stamp = 0; Sound.tick(); } updateCtl(); }
  function drawLaw(t) {
    const L = RC.L, W = LW(), d = DS(), n = cnt(d);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧾 ' + d.name + ': 초기 속도로 속도식 만들기', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, d.eq, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 표
    const x0 = L.x + 14, Wt = L.w - 28, rh = 34, y0 = L.y + 58;
    const ncol = n + 3, labW = 44, vW = 112, chkW = 110, concW = (Wt - labW - vW - chkW) / n;
    const cxs = [x0]; cxs.push(x0 + labW); for (let j = 0; j < n; j++) cxs.push(x0 + labW + concW * (j + 1)); cxs.push(x0 + labW + concW * n); cxs.push(x0 + labW + concW * n + vW);
    D.roundRect(x0, y0, Wt, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(x0 + labW / 2, y0 + 19, '실험', 12.5, INK, 'center', 800);
    d.sp.forEach((s, j) => T(x0 + labW + concW * j + concW / 2, y0 + 19, '[' + s + '] (M)', 12.5, INK, 'center', 800));
    T(x0 + labW + concW * n + vW / 2, y0 + 19, 'v₀ (M/s)', 12.5, INK, 'center', 800); T(x0 + labW + concW * n + vW + chkW / 2, y0 + 19, '내 속도식', 12.5, INK, 'center', 800);
    const ords = lwOrd(), kv = lwKVal(), ready = ords.every((o) => o >= 0) && !isNaN(kv) && kv > 0;
    for (let r = 0; r < 3; r++) {
      const y = y0 + rh * (r + 1) - 2;
      D.roundRect(x0, y, Wt, rh - 5, 8); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = '#e1dcf3'; ctx.lineWidth = 1.2; ctx.stroke();
      T(x0 + labW / 2, y + 21, String(r + 1), 14, INK, 'center', 800);
      for (let j = 0; j < n; j++) T(x0 + labW + concW * j + concW / 2, y + 21, f2(d.rows[r][j]), 14, INK, 'center', 800);
      T(x0 + labW + concW * n + vW / 2, y + 21, d.rows[r][n + 1], 13.5, INK, 'center', 800);
      if (ready) { const vc = vOf(d, r, ords, kv), ok = Math.abs(vc / d.rows[r][n] - 1) < 0.03; T(x0 + labW + concW * n + vW + chkW / 2, y + 21, (ok ? '✅ ' : '❌ ') + sci(vc, 2), 12.5, ok ? '#0f6b3c' : BAD, 'center', 800); }
      else T(x0 + labW + concW * n + vW + chkW / 2, y + 21, '—', 13, '#aab3c4', 'center', 800);
    }
    // 속도식 조립
    const yb = y0 + rh * 4 + 10, e = sm(W.stamp);
    D.roundRect(L.x + 12, yb, L.w - 24, 76, 12); ctx.fillStyle = lwOrdOk() ? 'rgba(20,160,88,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = lwOrdOk() ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    const shown = ords.map((o, j) => (o < 0 ? '□' : String(o)));
    const form = 'v = k' + d.sp.map((s, j) => '[' + s + ']' + (ords[j] < 0 ? '□' : sup(ords[j]))).join('');
    T(L.x + L.w / 2, yb + 34, form, PHONE ? 19 : 22, lwOrdOk() ? '#0f6b3c' : INK, 'center', 800);
    T(L.x + L.w / 2, yb + 60, lwOrdOk() ? '= ' + lawStr(d, ords) + ' (차수 0 인 반응물은 속도식에서 빠져요)' : '조작판에서 각 반응물의 차수를 골라요', 12.5, MUTED, 'center', 700);
    // k 계산 안내
    const yk = yb + 90;
    D.roundRect(L.x + 12, yk, L.w - 24, 74, 12); ctx.fillStyle = lwKOk() && lwOrdOk() ? 'rgba(20,160,88,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = lwKOk() && lwOrdOk() ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(L.x + 26, yk + 24, 'k = v₀ / (' + d.sp.map((s, j) => '[' + s + ']' + (ords[j] < 0 ? '□' : sup(ords[j]))).join('') + ')  ← 실험 1 의 값을 넣어요', 13.5, INK, 'left', 800);
    const tot = ords.every((o) => o >= 0) ? ords.reduce((a, b) => a + b, 0) : -1;
    T(L.x + 26, yk + 50, '전체 반응 차수 = ' + (tot >= 0 ? ords.join(' + ') + ' = ' + tot + '차' : '?'), 13.5, tot >= 0 ? PUR : MUTED, 'left', 800);
    T(L.x + L.w - 26, yk + 50, 'k 의 단위: ' + (lwOrdOk() ? UNITS[kUnitIdx(d)] : '?'), 13.5, lwOrdOk() ? PUR : MUTED, 'right', 800);
    // 예측 (자료 A)
    const yp = yk + 86;
    if (W.ds === 'A' && yp + 60 < L.y + L.h) {
      D.roundRect(L.x + 12, yp, L.w - 24, L.y + L.h - yp - 12, 12); ctx.fillStyle = predOk() ? 'rgba(20,160,88,.08)' : '#fffaf0'; ctx.fill(); ctx.strokeStyle = predOk() ? GOOD : '#f2c27d'; ctx.lineWidth = 1.6; ctx.stroke();
      T(L.x + 26, yp + 24, '🎯 예측: [NO] 0.30 M, [H₂] 0.10 M', 13.5, '#b45309', 'left', 800);
      T(L.x + 26, yp + 48, predOk() ? 'v₀ = 1.2 × 0.30² × 0.10 = 1.08×10⁻² M/s  (처음의 9배)' : 'v₀ = ?  (조작판에 ×10⁻² M/s 단위로 적어요)', 13.5, predOk() ? '#0f6b3c' : MUTED, 'left', 800);
    } else if (W.ds === 'B') {
      textBlock(L.x + 26, yp + 6, L.w - 52, '[B] 를 3배로 해도 v₀ 는 그대로예요. B 는 0차라 속도식에서 빠져요.', 13.5, '#0f6b3c', 19, 800);
    }
  }
  function drawLawInfo(t) {
    const R = RC.R, d = DS(), W = LW();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🗒 속도식 만들기 순서', 14.5, INK, 'left', 800);
    const st = [['① 변인이 하나만 바뀐 짝으로 차수 m, n 찾기', lwOrdOk()], ['② 실험 1 의 값으로 k 계산하기', lwKOk() && lwOrdOk()], ['③ k 의 단위 정하기', lwUOk() && lwOrdOk()], ['④ 새 농도에서 속도 예측하기', W.ds === 'A' ? predOk() : false]];
    let y = R.y + 52;
    st.forEach((s, i) => { if (i === 3 && W.ds !== 'A') return; const h = textBlock(R.x + 16, y, R.w - 32, (s[1] ? '✅ ' : '⬜ ') + s[0], 13, s[1] ? '#0f6b3c' : INK, 18, 800); y += h + 6; });
    y += 4;
    D.roundRect(R.x + 10, y, R.w - 20, PHONE ? 100 : 150, 10); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, y + 20, 'k 의 단위 (전체 차수에 따라)', 12.5, PUR, 'left', 800);
    [['0차', 'M/s'], ['1차', 's⁻¹'], ['2차', 'M⁻¹s⁻¹'], ['3차', 'M⁻²s⁻¹']].forEach((q, i) => { const yy = y + 44 + i * (PHONE ? 15 : 24), on = lwOrdOk() && kUnitIdx(d) === i; T(R.x + 26, yy, q[0], 13, on ? '#0f6b3c' : INK, 'left', 800); T(R.x + R.w - 26, yy, q[1], 13.5, on ? '#0f6b3c' : INK, 'right', 800); });
    y += (PHONE ? 112 : 162);
    if (y + 40 < R.y + R.h) textBlock(R.x + 14, y + 8, R.w - 28, 'k 는 온도와 촉매가 같으면 농도가 달라져도 변하지 않아요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ④ 차수의 의미 ================= */
  const CK = () => S.ck;
  function drawChk(t) {
    const L = RC.L, K = CK(), d = DATA[K.rx];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔍 반응식의 계수 vs 반응 차수', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, d.name + ' · ' + d.eq, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 종목별 카드
    const cw = (L.w - 28 - 8 * (cnt(d) - 1)) / cnt(d), y0 = L.y + 62;
    d.sp.forEach((s, j) => {
      const x = L.x + 14 + j * (cw + 8), same = d.coef[j] === d.ord[j];
      D.roundRect(x, y0, cw, 118, 12); ctx.fillStyle = '#fbfaff'; ctx.fill(); ctx.strokeStyle = same ? '#9bd5b3' : '#f2c27d'; ctx.lineWidth = 2; ctx.stroke();
      T(x + cw / 2, y0 + 24, s, 17, INK, 'center', 800);
      T(x + 14, y0 + 52, '반응식의 계수', 12.5, MUTED, 'left', 700); T(x + cw - 14, y0 + 52, String(d.coef[j]), 17, BLU, 'right', 800);
      T(x + 14, y0 + 78, '실험으로 구한 차수', 12.5, MUTED, 'left', 700); T(x + cw - 14, y0 + 78, String(d.ord[j]), 17, PUR, 'right', 800);
      T(x + cw / 2, y0 + 106, same ? '계수 = 차수 (우연히 같음)' : '계수 ≠ 차수', 12.5, same ? '#0f6b3c' : '#b45309', 'center', 800);
    });
    T(L.x + L.w / 2, y0 + 142, lawStr(d, d.ord) + '   (전체 ' + totOrd(d) + '차)', PHONE ? 15 : 17, PUR, 'center', 800);
    // 배수 표
    const ty = y0 + 168, rh = 36, x0 = L.x + 14, W = L.w - 28, c1 = W * 0.34, c2 = (W - c1) / 3;
    T(x0, ty + 6, '농도를 몇 배로 하면 속도는 몇 배? (한 반응물만)', 13, INK, 'left', 800);
    const hy = ty + 18;
    D.roundRect(x0, hy, W, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(x0 + c1 / 2, hy + 20, '반응 차수', 13, INK, 'center', 800);
    [2, 3, 4].forEach((m, j) => { const on = K.mul === m; T(x0 + c1 + c2 * j + c2 / 2, hy + 20, '농도 ×' + m, 13, on ? PUR : INK, 'center', 800); });
    [0, 1, 2].forEach((o, i) => {
      const y = hy + rh * (i + 1) - 2, mine = d.ord.indexOf(o) >= 0;
      D.roundRect(x0, y, W, rh - 5, 8); ctx.fillStyle = mine ? 'rgba(124,58,237,.08)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = mine ? PUR : '#e1dcf3'; ctx.lineWidth = mine ? 1.8 : 1.2; ctx.stroke();
      T(x0 + c1 / 2, y + 21, o + '차' + (mine ? ' ★' : ''), 14, mine ? PUR : INK, 'center', 800);
      [2, 3, 4].forEach((m, j) => { const on = K.mul === m; if (on) { D.roundRect(x0 + c1 + c2 * j + 6, y + 3, c2 - 12, rh - 11, 6); ctx.fillStyle = 'rgba(245,158,11,.18)'; ctx.fill(); } T(x0 + c1 + c2 * j + c2 / 2, y + 21, mulTxt(o, m) + '배', 14.5, on ? '#b45309' : INK, 'center', 800); });
    });
    textBlock(L.x + 14, hy + rh * 4 + 16, L.w - 28, '★ 표시는 이 반응에 들어 있는 차수예요. 차수가 같아도 반응식의 계수와는 상관이 없어요.', 12.5, MUTED, 17, 700);
  }
  function drawChkInfo(t) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📌 세 반응 비교', 14.5, INK, 'left', 800);
    const rows = ['A', 'B', 'C'], rh = PHONE ? 78 : 100;
    rows.forEach((k, i) => {
      const d = DATA[k], y = R.y + 38 + i * (rh + 4), sel = CK().rx === k;
      D.roundRect(R.x + 10, y, R.w - 20, rh, 10); ctx.fillStyle = sel ? 'rgba(124,58,237,.08)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#d9d0f5'; ctx.lineWidth = sel ? 2.2 : 1.4; ctx.stroke();
      T(R.x + 20, y + 20, d.name, 13.5, INK, 'left', 800);
      wrap(d.eq, R.w - 40, 12, 700).slice(0, 1).forEach((ln) => T(R.x + 20, y + 40, ln, 12, MUTED, 'left', 700));
      T(R.x + 20, y + 62, lawStr(d, d.ord), 14, PUR, 'left', 800);
      if (!PHONE) T(R.x + 20, y + 84, '계수 ' + d.coef.join(', ') + ' / 차수 ' + d.ord.join(', '), 12.5, '#b45309', 'left', 800);
    });
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  function build() {
    const ob = $('#obsRows');
    for (let i = 0; i < 3; i++) {
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = '반응기 ' + '①②③'[i]; ob.appendChild(lab);
      const box = document.createElement('div'); box.className = 'chips tight'; box.id = 'ob' + i; ob.appendChild(box);
      [1, 2, 3].forEach((m) => box.appendChild(chipBtn('×' + m, '반응기 ' + (i + 1) + ' 농도 ' + m + '배', () => setMul(i, m))));
    }
    PAIRS.forEach((p, k) => $('#pairChips').appendChild(chipBtn(pairName(k), pairName(k), () => setPair(k))));
    [0, 1, 2].forEach((o) => { $('#pm').appendChild(chipBtn(o + '차', 'NO ' + o + '차', () => { PR().m = o; updateCtl(); })); $('#pn').appendChild(chipBtn(o + '차', 'H₂ ' + o + '차', () => { PR().n = o; updateCtl(); })); });
    ['A', 'B', 'C'].forEach((k) => $('#dsChips').appendChild(chipBtn(DATA[k].name, DATA[k].name, () => setDs(k))));
    [0, 1, 2].forEach((o) => { $('#lm').appendChild(chipBtn(o + '차', o + '차', () => { LW().ord[LW().ds][0] = o; LW().stamp = 0; updateCtl(); })); $('#ln').appendChild(chipBtn(o + '차', o + '차', () => { LW().ord[LW().ds][1] = o; LW().stamp = 0; updateCtl(); })); });
    UNITS.forEach((u, i) => $('#lu').appendChild(chipBtn(u, 'k 의 단위 ' + u, () => { LW().u[LW().ds] = i; if (lwOrdOk() && i !== kUnitIdx(DS())) { shakeBadChips(); showHint('k 의 단위는 전체 반응 차수로 정해져요. 전체 차수가 ' + totOrd(DS()) + '차이면 ' + UNITS[kUnitIdx(DS())] + ' 예요.'); } updateCtl(); })));
    ['A', 'B', 'C'].forEach((k) => $('#ckChips').appendChild(chipBtn(DATA[k].name, DATA[k].name, () => { CK().rx = k; CK().pulse = 0; updateCtl(); })));
    [2, 3, 4].forEach((m) => $('#ckMul').appendChild(chipBtn('×' + m, '농도 ' + m + '배', () => { CK().mul = m; CK().seenMul[m] = true; updateCtl(); })));
  }
  const shakeBadChips = () => { Sound.fail(); };
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const O = OB(), P = PR(), W = LW(), d = DS(), K = CK();
    for (let i = 0; i < 3; i++) $$('#ob' + i + ' button').forEach((b, k) => b.classList.toggle('on', O.m[i] === k + 1));
    $$('#pairChips button').forEach((b, k) => { b.classList.toggle('on', P.pair === k); b.classList.toggle('done', P.seen[k] && P.pair !== k); });
    $$('#pm button').forEach((b, k) => b.classList.toggle('on', P.m === k)); $$('#pn button').forEach((b, k) => b.classList.toggle('on', P.n === k));
    $$('#dsChips button').forEach((b, k) => { const key = 'ABC'[k]; b.classList.toggle('on', W.ds === key); b.disabled = !ALLOW[key]; b.classList.toggle('done', lwDone(key) && W.ds !== key); });
    $('#lwL0').textContent = '[' + d.sp[0] + '] 의 차수'; $('#lwL1').textContent = cnt(d) > 1 ? '[' + d.sp[1] + '] 의 차수' : '';
    $('#lwL1').hidden = cnt(d) < 2; $('#ln').hidden = cnt(d) < 2;
    $$('#lm button').forEach((b, k) => { b.classList.toggle('on', W.ord[W.ds][0] === k); });
    $$('#ln button').forEach((b, k) => { b.classList.toggle('on', W.ord[W.ds][1] === k); });
    const lk = $('#lk'); if (document.activeElement !== lk && lk.value !== W.k[W.ds]) lk.value = W.k[W.ds]; lk.classList.toggle('ok', lwKOk() && lwOrdOk());
    $$('#lu button').forEach((b, k) => { const on = W.u[W.ds] === k; b.classList.toggle('on', on && (!lwOrdOk() || lwUOk())); b.classList.toggle('no', on && lwOrdOk() && !lwUOk()); });
    $('#predBox').hidden = S.mode !== 'law' || W.ds !== 'A';
    const lp = $('#lp'); if (document.activeElement !== lp && lp.value !== W.pred) lp.value = W.pred; lp.classList.toggle('ok', predOk());
    $('#lkNote').textContent = '실험 1 의 값을 속도식에 넣어 k 를 구해요. 숫자만 적고 단위는 아래에서 골라요.';
    $$('#ckChips button').forEach((b, k) => b.classList.toggle('on', K.rx === 'ABC'[k]));
    $$('#ckMul button').forEach((b, k) => b.classList.toggle('on', K.mul === [2, 3, 4][k]));
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#lk').addEventListener('input', (e) => { const W = LW(); W.k[W.ds] = e.target.value; e.target.classList.remove('bad'); const was = lwKOk(); if (lwKOk() && lwOrdOk() && !was) Sound.success(); updateCtl(); });
  $('#lk').addEventListener('change', (e) => {
    const W = LW(), d = DS(); if (e.target.value === '' || lwKOk()) return; shakeBad(e.target); const v = lwKVal();
    if (!lwOrdOk()) showHint('먼저 반응 차수를 구해요. 차수를 알아야 k 를 계산할 수 있어요.');
    else if (near(v, d.rows[0][cnt(d)], 1e-9) || v < d.k * 0.02) showHint('v₀ 를 농도의 거듭제곱 항으로 나누어야 해요. k = v₀ / (' + d.sp.map((s, j) => '[' + s + ']' + (d.ord[j] === 1 ? '' : sup(d.ord[j]))).join('') + ').');
    else showHint('실험 1 의 농도와 v₀ 를 넣어 계산해요. ' + (W.ds === 'A' ? 'k = 1.2×10⁻³ / (0.10² × 0.10)' : W.ds === 'B' ? 'k = 2.0×10⁻³ / 0.10' : 'k = 5.4×10⁻³ / 0.10²') + ' 를 계산해요.');
  });
  $('#lp').addEventListener('input', (e) => { LW().pred = e.target.value; e.target.classList.remove('bad'); if (predOk()) { Sound.success(); } updateCtl(); });
  $('#lp').addEventListener('change', (e) => {
    if (e.target.value === '' || predOk()) return; shakeBad(e.target); const v = predVal();
    if (!lwDone('A')) showHint('먼저 자료 A 의 속도식과 k 를 완성해요.');
    else if (near(v, 1.2 * 0.3 * 0.1 * 100, 0.02) || near(v, 0.36, 0.01)) showHint('NO 는 2차예요. 0.30 을 제곱해야 해요.');
    else if (near(v, 1.2 * 0.09 * 0.1 * 1000, 0.1)) showHint('단위가 달라요. ×10⁻² M/s 단위로 적어요 (예: 0.0108 M/s = 1.08).');
    else showHint('v₀ = k[NO]²[H₂] = 1.2 × 0.30² × 0.10 을 계산해요.');
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'obs') resetObs(); else if (S.mode === 'pair') resetPair(); else if (S.mode === 'law') resetLaw(); else resetChk();
    updateCtl();
  });
  const resetObs = () => { const O = OB(); O.m = [1, 1, 1]; O.rec = [false, false, false]; O.seen = [{}, {}, {}]; O.fl = [[], [], []]; O.acc = [0, 0, 0]; O.P.forEach((arr) => arr.forEach((p, k) => { p.al = k < 8 ? 1 : 0; })); O.bar = [1 / 9, 1 / 9, 1 / 9]; };
  const resetPair = () => { const P = PR(); P.pair = -1; P.seen = [false, false, false]; P.m = -1; P.n = -1; P.shake = 0; P.flash = 0; };
  const resetLaw = () => { const W = LW(); W.ds = ALLOW.A ? 'A' : (ALLOW.C ? 'C' : 'B'); W.ord = { A: [-1, -1], B: [-1, -1], C: [-1] }; W.k = { A: '', B: '', C: '' }; W.u = { A: -1, B: -1, C: -1 }; W.pred = ''; W.stamp = 1; ['#lk', '#lp'].forEach((id) => { $(id).value = ''; $(id).classList.remove('ok', 'bad'); }); };
  const resetChk = () => { const K = CK(); K.rx = 'A'; K.mul = 2; K.seenMul = {}; K.pulse = 1; };
  /* 캔버스의 표 누르기: 자료 A 의 두 실험 짝 */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'obs') { for (let i = 0; i < 3; i++) { const b = boxOb(i); if (inRect(p, { x: b.x, y: b.y, w: b.w, h: b.h + 100 })) { setMul(i, OB().m[i] % 3 + 1); return false; } } }
      return false;
    },
    hover(p) { if (S.mode === 'obs') { for (let i = 0; i < 3; i++) { const b = boxOb(i); if (inRect(p, { x: b.x, y: b.y, w: b.w, h: b.h + 100 })) return 'pointer'; } } return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'obs') { const O = OB(); L1 = '농도 (① ② ③)'; a = O.m.map((m) => '×' + m).join(' · '); L2 = '속도 v (① ② ③)'; b = O.m.map((m, i) => f0(vRel(i, m)) + '배').join(' · '); L3 = '2배 확인한 반응기'; c = O.rec.filter(Boolean).length + ' / 3'; }
    else if (S.mode === 'pair') { const P = PR(); L1 = '고른 짝'; a = P.pair >= 0 ? pairName(P.pair) : '—'; L2 = 'NO 의 차수 m'; b = P.m >= 0 ? P.m + '차' : '?'; L3 = 'H₂ 의 차수 n'; c = P.n >= 0 ? P.n + '차' : '?'; }
    else if (S.mode === 'law') { const W = LW(), d = DS(); L1 = '자료'; a = d.name; L2 = '속도식'; b = lwOrdOk() ? lawStr(d, d.ord) : '?'; L3 = '속도 상수 k'; c = lwKOk() && lwOrdOk() ? d.kTxt + ' ' + UNITS[kUnitIdx(d)] : '?'; }
    else { const K = CK(), d = DATA[K.rx]; L1 = '반응'; a = d.name; L2 = '전체 반응 차수'; b = totOrd(d) + '차'; L3 = '농도 ×' + K.mul; c = d.ord.map((o) => mulTxt(o, K.mul) + '배').join(' · '); }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const obsFresh = () => resetObs();
  const levels = [
    {
      title: '농도의 영향: 처음 속도 비교', short: '농도의 영향', icon: '🧫', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 반응물의 농도를 2배, 3배로 늘리면 반응 속도는 몇 배가 될까? 그 규칙을 식으로 쓸 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 반응 속도를 농도 변화율(M/s)로 나타냈고, 반응이 진행되어 농도가 줄면 속도도 줄어드는 것을 보았어요. 이번에는 <b>농도를 바꾸었을 때 속도가 어떻게 달라지는지</b>를 규칙으로 정리해요.</div>' +
        '<p>반응이 막 시작할 때의 속도를 <b>초기 속도 v₀</b>라 해요. 반응물의 농도를 처음의 2배로 했을 때 v₀ 가 <b>1배</b>(변화 없음), <b>2배</b>, <b>4배</b>가 되는 반응물을 각각 <b>0차, 1차, 2차</b> 반응물이라고 해요. 세 반응기에서 농도를 바꾸어 직접 확인해 봐요.</p>',
      features: ['obs'],
      setup() { S.lock = false; setMode('obs'); },
      recap: '농도를 2배로 할 때 속도가 1배, 2배, 4배로 변하면 각각 0차, 1차, 2차 반응물이에요.',
      summary: '<ul><li><b>초기 속도 v₀</b> = 반응이 막 시작할 때의 속도. 한 반응물의 농도만 바꾸어 v₀ 를 비교해요 (온도 일정).</li><li>농도 2배 → 속도 1배: <b>0차</b>, 2배: <b>1차</b>, 4배: <b>2차</b> (n차이면 2ⁿ배).</li><li>농도를 3배로 하면 0차 1배, 1차 3배, 2차 9배예요.</li><li>0차 반응물은 농도를 바꾸어도 속도가 변하지 않아요.</li></ul>',
      missions: [
        {
          title: '세 반응기에서 농도 2배 확인',
          goal: '세 반응기 모두 농도를 <b>×2</b>로 올려, 처음 속도가 몇 배가 되는지 확인해요.',
          hint: '조작판에서 반응기마다 ×2 를 눌러요. 막대 길이와 오른쪽 표의 「2배 → 몇 배」를 읽어요.',
          setup() { S.lock = true; resetObs(); setMode('obs'); },
          check: () => OB().rec.every(Boolean), hold: 0.5,
          status: () => '① ' + mark(OB().rec[0]) + ' &nbsp; ② ' + mark(OB().rec[1]) + ' &nbsp; ③ ' + mark(OB().rec[2]),
          explain: '농도를 2배로 올리면 반응기 ①은 속도 <b>2배</b>(1차), ②는 <b>4배</b>(2차), ③은 <b>1배</b>(0차, 변화 없음)가 돼요. 같은 농도 변화에도 반응물마다 속도가 변하는 정도가 달라요.',
        },
        {
          type: 'quiz', title: '4배가 된 반응물의 차수',
          goal: '반응물의 농도를 2배로 했더니 처음 속도가 4배가 되었어요. 이 반응물의 차수는?',
          setup() { S.lock = true; setMode('obs'); },
          choices: ['0차', '1차', '2차', '4차'],
          answer: 2,
          feedback: ['0차는 농도를 바꾸어도 속도가 변하지 않아요.', '1차이면 농도를 2배로 할 때 속도도 2배예요.', '', '속도가 4배라는 것은 2ⁿ = 4 에서 n = 2 예요. 배수(4)를 차수로 쓰면 안 돼요.'],
          explain: '농도를 2배 할 때 속도가 2ⁿ배가 돼요. 2ⁿ = 4 이므로 n = 2, 즉 <b>2차</b> 반응물이에요.',
        },
      ],
    },
    {
      title: '초기 속도법: 두 실험 짝짓기', short: '초기 속도법', icon: '🔎', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도가 2배일 때 속도가 1배, 2배, 4배면 0차, 1차, 2차라는 대응을 알았어요. 이 대응을 실제 <b>실험 자료</b>에 적용해 반응 차수를 구해요.</div>' +
        '<p><b>초기 속도법</b>: 한 반응물의 농도만 바꾼 두 실험의 처음 속도를 비교해요. 자료 A (2NO + 2H₂ → N₂ + 2H₂O, 일정 온도) 의 세 실험 중에서 변인이 하나만 다른 짝을 찾아 <b>NO 와 H₂ 의 차수</b>를 구해 봐요. 반응 차수는 반응식의 계수가 아니라 <b>실험으로만</b> 알 수 있어요.</p>',
      features: ['pair'],
      setup() { S.lock = false; setMode('pair'); },
      recap: '변인이 하나만 바뀐 두 실험에서 「농도 몇 배 → 속도 몇 배」를 읽어 차수를 구해요 (NO 2차, H₂ 1차).',
      summary: '<ul><li><b>초기 속도법</b>: 한 반응물의 농도만 바꾼 두 실험의 초기 속도를 비교해 반응 차수를 구해요.</li><li>자료 A: 실험 1·2 에서 [NO] 2배 → v₀ 4배 → NO 는 <b>2차</b>. 실험 1·3 에서 [H₂] 2배 → v₀ 2배 → H₂ 는 <b>1차</b>.</li><li>실험 2·3 처럼 두 농도가 한꺼번에 바뀐 짝은 속도 변화의 원인을 알 수 없어서 차수를 바로 구하기 어려워요.</li><li>반응 차수는 반응식의 계수와 관계없이 실험으로만 정해요.</li></ul>',
      missions: [
        {
          title: '실험 짝을 골라 NO 와 H₂ 의 차수 구하기',
          goal: '변인이 하나만 바뀐 두 실험 짝을 비교하고, <b>NO 와 H₂ 의 차수</b>를 골라 확인해요.',
          hint: '실험 1·2 는 NO 만, 실험 1·3 은 H₂ 만 2배예요. NO: 2배 → 4배 → 2차. H₂: 2배 → 2배 → 1차.',
          manual: true,
          setup() { S.lock = true; resetPair(); setMode('pair'); },
          check: () => pairResult(),
          explain: '실험 1·2: [NO] 2배 → v₀ 4배 → NO 는 <b>2차</b>. 실험 1·3: [H₂] 2배 → v₀ 2배 → H₂ 는 <b>1차</b>. 속도식은 v = k[NO]²[H₂] 의 모양이에요.',
        },
        {
          type: 'quiz', title: '실험 2·3 은 왜 안 될까?',
          goal: '실험 2 와 3 을 비교해서는 차수를 바로 구하기 어려워요. 그 까닭은?',
          setup() { S.lock = true; PR().pair = 2; PR().seen[2] = true; setMode('pair'); },
          choices: ['두 실험 모두 속도가 같기 때문이에요', '두 농도가 한꺼번에 바뀌어서 속도 변화가 어느 농도 때문인지 알 수 없기 때문이에요', '실험 2·3 은 온도가 달라서 비교할 수 없기 때문이에요', 'H₂ 의 농도는 속도와 관계가 없기 때문이에요'],
          answer: 1,
          feedback: ['실험 2 와 3 의 속도는 4.8×10⁻³ 과 2.4×10⁻³ 으로 서로 달라요.', '', '온도는 모든 실험에서 일정해요. 달라지는 것은 농도예요.', 'H₂ 의 농도를 2배로 하면 속도가 2배가 되는 것이 실험 1·3 에서 확인돼요.'],
          explain: '실험 2·3 에서는 [NO] 와 [H₂] 가 <b>동시에</b> 바뀌어요. 한 가지만 바뀐 짝을 골라야 속도 변화의 원인이 그 농도라고 말할 수 있어요.',
        },
      ],
    },
    {
      title: '속도식 완성: k 와 예측', short: '속도식 완성', icon: '🧾', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자료 A 의 NO 는 2차, H₂ 는 1차임을 구했어요. 이제 이 차수를 모아 <b>속도식 v = k[NO]ᵐ[H₂]ⁿ</b> 을 쓰고, 비례 상수 <b>속도 상수 k</b>를 구해요.</div>' +
        '<p>속도식 v = k[A]ᵐ[B]ⁿ 에서 k 는 <b>속도 상수</b>, m + n 은 <b>전체 반응 차수</b>예요. k 는 실험 1 의 값(농도와 v₀)을 속도식에 넣어 구하고, <b>단위는 전체 차수에 따라 달라요</b> (1차 s⁻¹, 2차 M⁻¹s⁻¹, 3차 M⁻²s⁻¹). 속도식이 완성되면 새로운 농도에서 속도를 예측할 수 있어요.</p>',
      features: ['law'],
      setup() { S.lock = false; ALLOW = { A: true, B: true, C: false }; setMode('law'); },
      recap: 'v = k[NO]²[H₂], k = 1.2 M⁻²s⁻¹. 속도식으로 새로운 농도에서 속도를 예측할 수 있고, k 는 온도가 같으면 일정해요.',
      summary: '<ul><li><b>속도식</b> v = k[A]ᵐ[B]ⁿ. k: 속도 상수, m, n: 각 반응물의 차수, m + n: 전체 반응 차수.</li><li>자료 A: v = k[NO]²[H₂]. 실험 1 에서 k = 1.2×10⁻³ / (0.10² × 0.10) = <b>1.2 M⁻²s⁻¹</b> (3차 반응이라 단위가 M⁻²s⁻¹).</li><li>k 의 단위: 0차 M/s, 1차 s⁻¹, 2차 M⁻¹s⁻¹, 3차 M⁻²s⁻¹.</li><li>예측: [NO] 0.30 M, [H₂] 0.10 M → v = 1.2 × 0.30² × 0.10 = <b>1.08×10⁻² M/s</b> (처음의 9배).</li><li>자료 B (A + B → C): v = k[A], k = 2.0×10⁻² s⁻¹. B 는 0차라 속도식에서 빠져요.</li><li>k 는 농도가 아니라 <b>온도·촉매</b>에 따라 달라져요.</li></ul>',
      missions: [
        {
          title: '자료 A 의 속도식과 k 구하기',
          goal: '자료 A 에서 <b>NO 와 H₂ 의 차수</b>를 고르고, <b>k 의 값과 단위</b>를 구해요.',
          hint: 'NO 2차, H₂ 1차예요. 실험 1: k = v₀ / ([NO]² [H₂]) = 1.2×10⁻³ / (0.10² × 0.10). 전체 3차이니 단위는 M⁻²s⁻¹.',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: false }; resetLaw(); LW().ds = 'A'; setMode('law'); },
          check: () => lwDone('A'), hold: 0.5,
          status: () => '차수 ' + mark(lwOrdOk('A')) + ' &nbsp; k ' + mark(lwKOk('A') && lwOrdOk('A')) + ' &nbsp; 단위 ' + mark(lwUOk('A') && lwOrdOk('A')),
          explain: 'v = k[NO]²[H₂] 에서 실험 1 의 값을 넣으면 k = 1.2×10⁻³ / (0.10² × 0.10) = <b>1.2</b>. 전체 반응 차수가 3 이므로 k 의 단위는 <b>M⁻²s⁻¹</b> 이에요 (M/s = k × M³ 에서).',
        },
        {
          title: '새 농도에서 속도 예측하기',
          goal: '[NO] = 0.30 M, [H₂] = 0.10 M 일 때의 초기 속도를 예측해 ×10⁻² M/s 단위로 적어요.',
          hint: 'v₀ = k[NO]²[H₂] = 1.2 × 0.30² × 0.10 = 0.0108 M/s = 1.08×10⁻² M/s.',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: false }; const W = LW(); W.ds = 'A'; W.ord.A = [2, 1]; W.k.A = '1.2'; W.u.A = 3; W.pred = ''; $('#lp').value = ''; setMode('law'); },
          check: () => predOk(), hold: 0.5,
          status: () => '예측 ' + mark(predOk()),
          explain: 'NO 가 2차이므로 농도가 0.10 → 0.30 으로 <b>3배</b>가 되면 속도는 3² = 9배예요. v₀ = 1.2 × 0.30² × 0.10 = <b>1.08×10⁻² M/s</b> 로 처음(1.2×10⁻³)의 9배예요.',
        },
        {
          type: 'quiz', title: 'k 는 농도에 따라 변할까?',
          goal: '“반응물의 농도가 바뀌면 속도 상수 k 도 달라진다.” 이 말은?',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: false }; setMode('law'); },
          choices: ['맞아요. 농도가 클수록 k 도 커져요', '틀려요. 같은 온도에서는 농도가 달라져도 k 는 일정해요 (k 는 온도와 촉매에 따라 변해요)', '맞아요. 반응이 진행되면 k 가 점점 작아져요', '틀려요. k 는 어떤 경우에도 변하지 않아요'],
          answer: 1,
          feedback: ['농도가 커지면 속도 v 가 커질 뿐 k 는 일정해요. 자료 A 의 세 실험 모두 같은 k = 1.2 가 나와요.', '', '반응이 진행되며 농도가 줄어 v 가 작아지는 것이지 k 가 작아지는 것은 아니에요.', 'k 는 온도나 촉매가 달라지면 변해요 (다음 차시들에서 배워요).'],
          explain: '속도 v 는 농도에 따라 변하지만 비례 상수 <b>k 는 온도가 같으면 일정</b>해요. 온도가 오르거나 촉매를 쓰면 k 가 변해요.',
        },
      ],
    },
    {
      title: '차수의 의미: 계수와 다르다', short: '차수의 의미', icon: '🔍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 속도식 v = k[NO]²[H₂] 를 완성했어요. 이 반응의 반응식에서 H₂ 의 계수는 2 인데 차수는 1 이었어요. <b>반응 차수는 반응식의 계수가 아니라 실험으로 정해요.</b> 새 자료로 연습하고 자주 하는 실수를 점검해 봐요.</div>' +
        '<p>자료 C (2NO₂ → 2NO + O₂) 로 스스로 속도식을 구해 보고, 자료 A, B 와 비교해 <b>계수 ≠ 차수</b>인 경우를 확인해요. 전체 반응 차수는 각 반응물의 차수의 합이에요. 농도를 3배로 하면 1차 반응은 3배, 2차 반응은 9배가 돼요.</p>',
      features: ['chk'],
      setup() { S.lock = false; ALLOW = { A: true, B: true, C: true }; setMode('chk'); },
      recap: '반응 차수는 반응식의 계수와 달라요. 실험 자료로만 구하고, 전체 차수는 차수의 합이에요.',
      summary: '<ul><li>자료 C: [NO₂] 0.10 → 0.20 에서 v₀ 가 5.4×10⁻³ → 2.16×10⁻² (4배) → <b>2차</b>. v = k[NO₂]², k = 5.4×10⁻³ / 0.10² = <b>0.54 M⁻¹s⁻¹</b>.</li><li><b>계수 ≠ 차수</b>: 2NO + 2H₂ → N₂ + 2H₂O 에서 H₂ 의 계수 2, 차수 1. 자료 B 의 B 는 계수 1, 차수 0. (2NO₂ 처럼 우연히 같을 수도 있어요.)</li><li><b>전체 반응 차수</b> = 차수의 합. v = k[NO]²[H₂] 는 2 + 1 = 3차 (계수의 합 4 가 아니에요).</li><li>농도를 3배로 하면: 0차 1배, 1차 3배, 2차 9배.</li></ul>',
      missions: [
        {
          title: '자료 C 의 속도식 구하기',
          goal: '2NO₂ → 2NO + O₂ 의 자료 C 에서 <b>NO₂ 의 차수</b>를 고르고 <b>k 의 값과 단위</b>를 구해요.',
          hint: '[NO₂] 0.10 → 0.20 (2배) 일 때 v₀ 가 5.4×10⁻³ → 2.16×10⁻² (4배) → 2차. k = 5.4×10⁻³ / 0.10² = 0.54, 단위 M⁻¹s⁻¹.',
          setup() { S.lock = true; ALLOW = { A: false, B: false, C: true }; resetLaw(); LW().ds = 'C'; setMode('law'); },
          check: () => lwDone('C'), hold: 0.5,
          status: () => '차수 ' + mark(lwOrdOk('C')) + ' &nbsp; k ' + mark(lwKOk('C') && lwOrdOk('C')) + ' &nbsp; 단위 ' + mark(lwUOk('C') && lwOrdOk('C')),
          explain: 'NO₂ 의 농도가 2배 → 속도 4배이므로 <b>2차</b>예요. k = 5.4×10⁻³ / 0.10² = <b>0.54 M⁻¹s⁻¹</b>. 반응식의 계수 2 와 차수 2 가 우연히 같을 뿐, 계수로 차수를 알 수는 없어요.',
        },
        {
          type: 'quiz', title: '계수와 차수',
          goal: '2NO + 2H₂ → N₂ + 2H₂O 에서 H₂ 의 계수는 2 이지만 속도식은 v = k[NO]²[H₂] 예요. H₂ 의 차수가 1 인 까닭은?',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: true }; CK().rx = 'A'; setMode('chk'); },
          choices: ['반응 차수는 반응식의 계수를 그대로 쓰므로 H₂ 는 2차예요', '반응 차수는 반응식의 계수가 아니라 실험으로 정하기 때문이에요', '계수가 큰 물질은 차수가 항상 1 이기 때문이에요', 'H₂ 의 농도는 0.10 M 로 일정하기 때문이에요'],
          answer: 1,
          feedback: ['계수를 차수로 쓰는 것은 흔한 오개념이에요. 자료 A 에서 H₂ 를 2배로 하면 속도는 2배(1차)였어요.', '', '계수와 차수 사이에 그런 규칙은 없어요.', '실험 1·3 에서 H₂ 의 농도를 바꾸었을 때 속도가 변했어요.'],
          explain: '반응 차수는 <b>실험 자료</b>로만 구해요. 자료 A 에서 [H₂] 가 2배일 때 속도가 2배이므로 H₂ 는 1차예요. 자료 B 의 B 는 계수가 1 이지만 0차예요.',
        },
        {
          type: 'quiz', title: '전체 반응 차수',
          goal: 'v = k[NO]²[H₂] 인 반응의 <b>전체 반응 차수</b>는?',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: true }; CK().rx = 'A'; setMode('chk'); },
          choices: ['2차 (NO 의 차수만)', '3차 (2 + 1)', '4차 (반응물의 계수 2 + 2)', '1차 (H₂ 의 차수만)'],
          answer: 1,
          feedback: ['H₂ 의 차수도 더해야 해요.', '', '계수의 합이 아니라 속도식의 차수(지수)를 더해요.', 'NO 의 차수 2 도 더해야 해요.'],
          explain: '전체 반응 차수 = 각 반응물의 차수의 합 = 2 + 1 = <b>3차</b> 예요. 그래서 k 의 단위가 M⁻²s⁻¹ 이에요.',
        },
        {
          type: 'quiz', title: '농도를 3배로 늘리면',
          goal: '반응물의 농도를 3배로 늘렸을 때, 이 반응물이 1차이면 속도는 몇 배, 2차이면 몇 배가 될까요?',
          setup() { S.lock = true; ALLOW = { A: true, B: true, C: true }; CK().mul = 3; CK().seenMul[3] = true; setMode('chk'); },
          choices: ['1차 3배, 2차 6배', '1차 3배, 2차 9배', '1차 2배, 2차 4배', '1차 3배, 2차 3배'],
          answer: 1,
          feedback: ['2차는 3²= 9배예요. 3 × 2 = 6 이 아니에요.', '', '2배, 4배는 농도를 2배로 할 때의 값이에요.', '2차이면 농도의 제곱에 비례해서 9배가 돼요.'],
          explain: 'n차 반응물은 농도를 a배로 하면 속도가 aⁿ배가 돼요. 3배일 때 1차는 3¹ = <b>3배</b>, 2차는 3² = <b>9배</b>예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-rate-law', mount: '#game', badge: '속도식 해석가', homeHref: '../../index.html#hx',
    featureLabels: { obs: '🧫 농도의 영향', pair: '🔎 초기 속도법', law: '🧾 속도식 완성', chk: '🔍 차수의 의미' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  build(); obInit(); setMode('obs');
  function stepAll1(dt) { S.t += dt; stepOb(dt); const P = PR(); if (P.flash > 0) P.flash = Math.max(0, P.flash - dt * 1.5); S.lw.stamp = ap2(S.lw.stamp, 1, dt, 4); if (S.lw.stamp > 0.995) S.lw.stamp = 1; }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) ALLOW = { A: true, B: true, C: true }; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'obs') { drawObs(S.t); drawObsInfo(S.t); }
    else if (S.mode === 'pair') { drawPair(S.t); drawPairInfo(S.t); }
    else if (S.mode === 'law') { drawLaw(S.t); drawLawInfo(S.t); }
    else { drawChk(S.t); drawChkInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, DATA, UNITS, ORD, setMode, setMul, setPair, setDs, boxOb, lwDone, lwOrdOk, lwKOk, lwUOk, predOk, pairResult, updateCtl, vRel,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
