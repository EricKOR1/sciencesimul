/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 엔탈피와 열화학 반응식 [12물에03-01]
   ① 관찰: 열의 출입 (발열·흡열 반응의 온도 변화, 엔탈피 도표에서 ΔH 의 부호)
   ② 실험: 열량계 (q = c·m·ΔT → ΔH = −q/n, 열 손실)
   ③ 표기: 열화학 반응식 쓰기 (균형 · 상태 기호 · ΔH 의 부호와 크기)
   ④ 분석: ΔH 다루기 (계수 · 역반응 · 질량으로 계산한 열)
   엔탈피는 '일정한 압력에서 반응이 출입시키는 열(반응열)'로 한정해요. H = U + PV 등 열역학 함수, 생성 엔탈피 표, 결합 에너지는 다루지 않아요.

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
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9';
  const HOT = '#e2553b', COLD = '#2f7fd8';
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
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sgn = (v, d) => { const r = Math.round(Math.abs(v) * Math.pow(10, d || 0)) / Math.pow(10, d || 0); const s = r === 0 ? '' : v < 0 ? MINUS : '+'; return s + r.toFixed(d || 0); };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {                                // 20000, 20,000, +92, −54, 2.0e4, 2.0×10^4 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  /* 계수 표기: 0.5 → ½, 1.5 → 1½ */
  const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const CF = (c) => { if (c === 1) return ''; const w = Math.floor(c + 1e-9), f = Math.round((c - w) * 100) / 100; return (w ? String(w) : '') + (f ? FR[f] || String(f) : ''); };
  const fmtC = (c) => CF(Math.abs(c));

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { heat: '🌡️ 반응할 때 열이 나오고 들어가요', cal: '🧪 컵 열량계로 반응열을 재요', write: '✍️ 열화학 반응식을 써요', calc: '🔢 ΔH 를 다뤄요' };

  /* ================= 자료 ================= */
  const CW = 4.18;                                        // 물의 비열 J/(g·°C)
  const RX = [
    { k: 'neut', name: '중화 반응', eq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)', dH: -57, T0: 22.0, T1: 28.5, note: '1.0 M HCl 50 mL + 1.0 M NaOH 50 mL', colA: '#cfe9ff', colB: '#ffcf9a', rl: ['H⁺(aq)', '+ OH⁻(aq)'], pl: ['H₂O(l)'] },
    { k: 'cao', name: '산화 칼슘 + 물', eq: 'CaO(s) + H₂O(l) → Ca(OH)₂(s)', dH: -65, T0: 22.0, T1: 29.5, note: 'CaO 2.8 g(0.050 mol) + 물 100 g', colA: '#d6e6f5', colB: '#ffd9a6', rl: ['CaO(s)', '+ H₂O(l)'], pl: ['Ca(OH)₂(s)'] },
    { k: 'nh4', name: 'NH₄Cl 용해', eq: 'NH₄Cl(s) → NH₄⁺(aq) + Cl⁻(aq)', dH: 15, T0: 22.0, T1: 18.5, note: 'NH₄Cl 5.35 g(0.100 mol) + 물 100 g', colA: '#d2e6fb', colB: '#a9cdf5', rl: ['NH₄Cl(s)'], pl: ['NH₄⁺(aq)', '+ Cl⁻(aq)'] },
  ];
  /* 열량계 실험 자료 */
  const CAL = [
    { k: 'neut', name: '중화 반응', m: 100, n: 0.050, T0: 22.0, dT: { on: 6.5, off: 5.5 }, theory: -57, info: '1.0 M HCl 50 mL + 1.0 M NaOH 50 mL (용액 100 g)', colA: '#cfe9ff', colB: '#ffcf9a', ymin: 20, ymax: 30 },
    { k: 'nh4', name: 'NH₄Cl 용해', m: 105, n: 0.100, T0: 22.0, dT: { on: -3.5, off: -3.0 }, theory: 15, info: 'NH₄Cl 5.35 g(0.100 mol)을 물 100 g에 용해 (용액 약 105 g)', colA: '#d2e6fb', colB: '#a9cdf5', ymin: 16, ymax: 26 },
  ];
  const T_MIX = 30, T_END = 150, T_RISE = 12, COOL = { on: 0.006, off: 0.02 }, T_SPEED = 22;
  const qOf = (c, lid) => CAL[c].m * CW * CAL[c].dT[lid ? 'on' : 'off'] / 1000;     // kJ, 용액이 얻은 열
  const dHOf = (c, lid) => -qOf(c, lid) / CAL[c].n;                                   // kJ/mol
  function tempAt(c, lid, tt) {                                                       // 온도–시간 곡선 (최고·최저 온도가 정확히 T0 + ΔT)
    const K = CAL[c], dT = K.dT[lid ? 'on' : 'off'];
    if (tt < T_MIX) return K.T0;
    const x = tt - T_MIX;
    if (x <= T_RISE) return K.T0 + dT * sm(x / T_RISE);
    return K.T0 + dT - Math.sign(dT) * COOL[lid ? 'on' : 'off'] * (x - T_RISE);
  }

  /* ---------- 열화학 반응식 자료 ---------- */
  const ATOM = { 'H₂': { H: 2 }, 'O₂': { O: 2 }, 'H₂O': { H: 2, O: 1 }, 'C': { C: 1 }, 'CO₂': { C: 1, O: 2 }, 'N₂': { N: 2 }, 'NH₃': { N: 1, H: 3 } };
  const EQS = [
    { name: '수소의 연소', sp: ['H₂', 'O₂', 'H₂O'], st: ['g', 'g', 'l'], nR: 2, ref: 0, base: 286, refTxt: '수소 1 mol이 연소하면 286 kJ의 열이 나와요',
      stHint: ['수소는 25 °C, 1 atm에서 기체(g)예요.', '산소는 25 °C, 1 atm에서 기체(g)예요.', '25 °C, 1 atm에서 생성된 물은 액체(l)예요.'],
      cands: [[1, 1, 1], [2, 1, 2], [1, 0.5, 1], [2, 2, 2]] },
    { name: '탄소의 연소', sp: ['C', 'O₂', 'CO₂'], st: ['s', 'g', 'g'], nR: 2, ref: 0, base: 394, refTxt: '탄소(흑연) 1 mol이 완전 연소하면 394 kJ의 열이 나와요',
      stHint: ['탄소(흑연)는 고체(s)예요.', '산소는 25 °C, 1 atm에서 기체(g)예요.', '이산화 탄소는 25 °C, 1 atm에서 기체(g)예요.'],
      cands: [[1, 1, 1], [2, 1, 2], [1, 2, 1], [2, 2, 2]] },
    { name: '암모니아 합성', sp: ['N₂', 'H₂', 'NH₃'], st: ['g', 'g', 'g'], nR: 2, ref: 0, base: 92, refTxt: '질소 1 mol과 수소 3 mol이 모두 반응하면 92 kJ의 열이 나와요',
      stHint: ['질소는 기체(g)예요.', '수소는 기체(g)예요.', '암모니아는 25 °C, 1 atm에서 기체(g)예요.'],
      cands: [[1, 3, 2], [0.5, 1.5, 1], [1, 1, 2], [1, 2, 3]] },
  ];
  EQS.forEach((e) => e.cands = e.cands.map((c) => ({ c, ok: balanced(e, c), txt: eqPlain(e, c) })));
  function atomsSide(e, c, from, to) { const a = {}; for (let j = from; j < to; j++) { const at = ATOM[e.sp[j]]; for (const k in at) a[k] = (a[k] || 0) + at[k] * c[j]; } return a; }
  function balanced(e, c) {
    const L = atomsSide(e, c, 0, e.nR), R = atomsSide(e, c, e.nR, e.sp.length);
    return Object.keys(Object.assign({}, L, R)).every((k) => Math.abs((L[k] || 0) - (R[k] || 0)) < 1e-9);
  }
  function eqPlain(e, c) { const t = (j) => CF(c[j]) + e.sp[j]; return e.sp.slice(0, e.nR).map((s, j) => t(j)).join(' + ') + ' → ' + e.sp.slice(e.nR).map((s, j) => t(j + e.nR)).join(' + '); }
  function unbalMsg(e, c) {
    const L = atomsSide(e, c, 0, e.nR), R = atomsSide(e, c, e.nR, e.sp.length);
    const bad = Object.keys(Object.assign({}, L, R)).filter((k) => Math.abs((L[k] || 0) - (R[k] || 0)) > 1e-9)[0];
    return bad ? bad + ' 원자가 왼쪽 ' + (L[bad] || 0) + '개, 오른쪽 ' + (R[bad] || 0) + '개로 달라요.' : '';
  }
  const magOf = (e, c) => e.base * c[e.ref];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'heat', fade: 0, lock: false, t: 0,
    heat: { sel: 0, prog: [0, 0, 0], run: [false, false, false], place: [null, null, null], lv: [0, 0, 0], shake: 0, stamp: [0, 0, 0] },
    cal: { sel: 0, lid: true, phase: 'idle', t: 0, res: {}, solved: [false, false], q: '', h: '', okq: false, okh: false, spawned: false, flash: 0 },
    wr: { sel: 0, eq: EQS.map(() => ({ cand: -1, candOk: false, st: [null, null, null], stWrong: [], stage: 0, sign: null, mag: null, done: false, stamp: 0, msg: '' })), },
    ca: { k: 1, kd: 1, rev: false, revd: 0, q: ['', '', ''], ok: [false, false, false], pulse: 0 },
  };
  let game = null;
  const RX_N = RX.length;

  /* ================= 엔탈피 도표 (공용) ================= */
  function axisH(r) {
    D.arrow(r.x, r.y + r.h, r.x, r.y + 4, { color: '#8a95a8', width: 2, head: 9 });
    T(r.x + 8, r.y + 8, '엔탈피 H', 12.5, MUTED, 'left', 800);
  }
  function bar(x0, x1, y, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  /* 반응물 → 생성물 도표. o: {rl, pl, dH, lv(0~1), yRef, sc, ball, ghost, t} */
  function drawEnth(r, o) {
    const bw = Math.min(96, (r.w - 70) / 2), x0 = r.x + 16, x1 = r.x + r.w - 10 - bw, xa = (x0 + bw + x1) / 2;
    const lv = clamp(o.lv, 0, 1), yR = o.yRef, yP = yR - o.dH * o.sc * lv, hot = o.dH < 0, col = hot ? HOT : COLD;
    axisH(r);
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0 + bw, yR); ctx.lineTo(x1, yR); ctx.stroke(); ctx.restore();
    bar(x0, x0 + bw, yR, '#4b5d7e');
    o.rl.forEach((s, i) => T(x0 + bw / 2, yR - 28 - (o.rl.length - 1 - i) * 15, s, 12.5, INK, 'center', 800, HALO));
    T(x0 + bw / 2, yR + 20, '반응물', 12.5, MUTED, 'center', 800);
    if (o.ghost) {
      ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(x1, yR); ctx.lineTo(x1 + bw, yR); ctx.stroke(); ctx.restore();
      T(x1 + bw / 2, yR - 12, '생성물 수준은?', 13, PUR, 'center', 800, HALO);
    } else {
      bar(x1, x1 + bw, yP, col);
      o.pl.forEach((s, i) => T(x1 + bw / 2, yP - 28 - (o.pl.length - 1 - i) * 15, s, 12.5, INK, 'center', 800, HALO));
      T(x1 + bw / 2, yP + 20, '생성물', 12.5, MUTED, 'center', 800);
      if (Math.abs(yP - yR) > 6) D.arrow(xa, yR, xa, yP + (yP > yR ? -2 : 2), { color: col, width: 3.4, head: 11 });
    }
    // 구 (계의 엔탈피 수준)
    const e = o.ghost ? 0 : sm(lv), bx = x0 + bw / 2 + (x1 - x0) * e, by = yR - 11 + (yP - yR) * e - Math.sin(e * Math.PI) * 14;
    D.sphere(bx, by, 11, '#8b5cf6', { shadow: true });
    return { yP, xa, x0, x1, bw };
  }

  /* ================= ① 열의 출입 ================= */
  const HG = (i) => { const L = RC.L, sw = (L.w - 24) / 3, sx = L.x + 12 + i * sw; return { sx, sw, bx: sx + (sw - 88) / 2, bw: 88, by: L.y + 176, bh: 116 }; };
  const HS = () => S.heat;
  const heatT = (i) => RX[i].T0 + (RX[i].T1 - RX[i].T0) * sm(HS().prog[i]);
  const placed = (i) => HS().place[i] != null;
  const placeAll = () => HS().place.every((p) => p != null);
  const heatVisible = (i) => placed(i) || !S.lock;                 // 도표에 생성물 수준이 보이는가
  function runHeat(i) {
    const H = HS(); if (H.run[i] && H.prog[i] < 1) return;
    H.run[i] = true; H.prog[i] = 0.0001; Sound.click(); updateCtl();
  }
  function stepHeat(dt) {
    const H = HS();
    for (let i = 0; i < RX_N; i++) {
      if (H.run[i] && H.prog[i] < 1) { H.prog[i] = RM ? 1 : Math.min(1, H.prog[i] + dt / 2.8); if (H.prog[i] >= 1) { H.prog[i] = 1; updateCtl(); } }
      const tg = heatVisible(i) ? 1 : 0; H.lv[i] = ap2(H.lv[i], tg, dt, 4); if (Math.abs(H.lv[i] - tg) < 0.003) H.lv[i] = tg;
      if (H.stamp[i] > 0) H.stamp[i] = Math.max(0, H.stamp[i] - dt);
      // 열 입자
      if (!RM && S.mode === 'heat' && H.run[i] && H.prog[i] < 1) {
        const g = HG(i), exo = RX[i].dH < 0;
        if (Math.random() < dt * 22) {
          if (exo) parts.emit({ x: g.bx + rnd(10, g.bw - 10), y: g.by + 10, vx: rnd(-8, 8), vy: -rnd(40, 70), life: 0.9, size: 7, color: 'rgba(255,150,70,.75)', shape: 'smoke', fade: true });
          else parts.emit({ x: g.bx + rnd(8, g.bw - 8), y: g.by - 40, vx: rnd(-6, 6), vy: rnd(35, 55), life: 0.9, size: 3.2, color: '#9cc6ff', shape: 'star', fade: true });
        }
        if (Math.random() < dt * 9) parts.emit({ x: g.bx + rnd(8, g.bw - 8), y: g.by + g.bh - 12, vx: rnd(-6, 6), vy: -rnd(22, 40), life: 0.8, size: 3, color: 'rgba(255,255,255,.85)', shape: 'bubble', fade: true });
      }
    }
    if (H.shake > 0) H.shake = Math.max(0, H.shake - dt * 2.5);
  }
  function drawHeat(t) {
    const L = RC.L, H = HS();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🌡️ 세 반응에서 열이 어떻게 출입할까요?', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '용기를 눌러 고르고 「반응 시키기」를 눌러요 (25 °C, 1 atm)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    for (let i = 0; i < RX_N; i++) {
      const g = HG(i), R = RX[i], p = sm(H.prog[i]), exo = R.dH < 0, sel = i === H.sel;
      if (sel) { D.roundRect(g.sx + 2, L.y + 62, g.sw - 4, 330, 12); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(124,58,237,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      wrap(R.name, g.sw - 10, 13.5, 800).forEach((ln, k) => T(g.sx + g.sw / 2, L.y + 86 + k * 17, ln, 13.5, INK, 'center', 800));
      // 열 화살표
      if (H.run[i]) {
        const a = H.prog[i] < 1 ? 1 : 0.6, len = 34 + (H.prog[i] < 1 ? Math.sin(t * 6) * 6 : 0), by0 = g.by - 6;
        [g.bx + 18, g.bx + g.bw - 18].forEach((ax) => {
          if (exo) D.arrow(ax, by0 - 2, ax, by0 - 2 - len * Math.min(1, p * 3), { color: HOT, width: 4, head: 11, alpha: a });
          else D.arrow(ax, by0 - 2 - len * Math.min(1, p * 3), ax, by0 - 2, { color: COLD, width: 4, head: 11, alpha: a });
        });
        if (p > 0.15) T(g.sx + g.sw / 2, g.by - 62, exo ? '열 방출 ↑' : '열 흡수 ↓', 12.5, exo ? HOT : COLD, 'center', 800, HALO);
      }
      // 비커
      const liq = C.mix(R.colA, R.colB, p);
      D.beaker(g.bx, g.by, g.bw, g.bh, { level: 0.62, liquid: liq, t, wave: 1.4 });
      // 고체 알갱이 (녹으면서 사라져요)
      if (R.k !== 'neut') { const n = 9; for (let k = 0; k < n; k++) { const a = 1 - clamp(p * 1.6 - k * 0.04, 0, 1); if (a <= 0.01) continue; ctx.globalAlpha = a; D.sphere(g.bx + 12 + hash(k, i) * (g.bw - 24), g.by + g.bh - 10 - hash(k + 9, i) * 8, 4.2, R.k === 'cao' ? '#e8e2d6' : '#f4f6fa', { gloss: false, outline: '#b5bccb', outlineWidth: 0.8 }); ctx.globalAlpha = 1; } }
      // 온도계
      D.thermometer(g.bx + g.bw / 2, g.by - 36, 104, heatT(i), 14, 34, { ticks: false, color: exo ? HOT : COLD });
      const Tn = heatT(i), dTn = Tn - R.T0;
      T(g.sx + g.sw / 2, g.by + g.bh + 30, f1(Tn) + ' °C', 17, INK, 'center', 800);
      const lbl = H.run[i] ? 'ΔT ' + sgn(dTn, 1) + ' °C' : '처음 22.0 °C';
      T(g.sx + g.sw / 2, g.by + g.bh + 50, lbl, 13, H.run[i] ? (dTn > 0.05 ? HOT : dTn < -0.05 ? COLD : MUTED) : MUTED, 'center', 800);
      if (placed(i)) D.check(g.sx + g.sw - 16, L.y + 80, 10, 1);
      if (H.stamp[i] > 0) D.ring(g.bx + g.bw / 2, g.by + 50, 30 + (0.6 - H.stamp[i]) * 40, t, { color: GOOD, width: 3 });
    }
    // 아래 설명
    const R = RX[H.sel];
    T(L.x + 14, L.y + 418, R.eq, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 438, '예: ' + R.note, 12.5, MUTED, 'left', 700);
    const ran = H.run[H.sel] && H.prog[H.sel] >= 1;
    textBlock(L.x + 14, L.y + 462, L.w - 28, ran ? (R.dH < 0 ? '온도가 올랐어요. 계는 열을 주위로 내놓았고, 용액의 온도가 올랐어요.' : '온도가 내려갔어요. 계가 주위에서 열을 흡수해서, 용액의 온도가 내려갔어요.') : '아직 반응하지 않았어요. 반응을 시켜 온도 변화를 확인해요.', 13, INK, 18, 800);
  }
  function drawHeatInfo(t) {
    const R = RC.R, H = HS(), i = H.sel, X = RX[i];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 엔탈피 도표 · ' + X.name, 14, INK, 'left', 800);
    const dr = { x: R.x + 22, y: R.y + 42, w: R.w - 34, h: R.h - 150 };
    const yRef = dr.y + dr.h * 0.5 + 6, sc = Math.min(1.6, (dr.h * 0.5 - 34) / 70);
    const ghost = H.lv[i] < 0.02 && !heatVisible(i);
    const sk = H.shake > 0 && i === H.sel ? Math.sin(H.shake * 40) * 4 * H.shake : 0;
    ctx.save(); ctx.translate(sk, 0);
    drawEnth(dr, { rl: X.rl, pl: X.pl, dH: X.dH, lv: H.lv[i], yRef, sc, ghost });
    ctx.restore();
    const yb = R.y + R.h - 100;
    if (!ghost && H.lv[i] > 0.9) {
      const col = X.dH < 0 ? HOT : COLD;
      D.label(R.x + R.w / 2, yb, 'ΔH = ' + sgn(X.dH, 0) + ' kJ', { size: 15, bg: col, align: 'center' });
      textBlock(R.x + 14, yb + 26, R.w - 28, X.dH < 0 ? '생성물의 엔탈피가 더 낮아요 (ΔH < 0). 줄어든 만큼 열을 주위로 내놓아요: 발열 반응' : '생성물의 엔탈피가 더 높아요 (ΔH > 0). 늘어난 만큼 열을 주위에서 얻어요: 흡열 반응', 12.5, INK, 17, 800);
    } else {
      textBlock(R.x + 14, yb - 4, R.w - 28, H.run[i] && H.prog[i] >= 1 ? '온도 변화를 보았죠? 아래 버튼으로 생성물이 반응물보다 높은지 낮은지 골라요.' : '반응을 시켜 보면 온도가 변해요. 온도 변화로 열의 출입을 알 수 있어요.', 12.5, MUTED, 17, 700);
    }
  }

  /* ================= ② 열량계 ================= */
  const calKey = () => S.cal.sel + (S.cal.lid ? 'on' : 'off');
  const calDone = () => !!S.cal.res[calKey()];
  const calSel = () => CAL[S.cal.sel];
  const expQ = () => qOf(S.cal.sel, S.cal.lid), expH = () => dHOf(S.cal.sel, S.cal.lid);
  const tolH = () => Math.max(0.6, Math.abs(expH()) * 0.015);
  function calTimeShown() { const K = S.cal; return K.phase === 'run' ? K.t : calDone() ? T_END : 0; }
  function calCheckInputs() {
    const K = S.cal, d = calDone();
    K.okq = d && K.q !== '' && near(parseNum(K.q), expQ(), 0.03);
    K.okh = d && K.h !== '' && near(parseNum(K.h), expH(), tolH());
    if (K.okq && K.okh && K.lid && !K.solved[K.sel]) { K.solved[K.sel] = true; Sound.success(); K.flash = 1; const L = RC.L; parts.burst(L.x + 110, L.y + 170, { count: 14, speed: 120, life: 0.6, size: 3.6 }); }
  }
  function calStop() { const K = S.cal; K.phase = 'idle'; K.t = 0; K.spawned = false; }
  function calClear() { const K = S.cal; K.q = ''; K.h = ''; K.okq = false; K.okh = false; $('#cq').value = ''; $('#ch').value = ''; $('#cq').classList.remove('ok', 'bad'); $('#ch').classList.remove('ok', 'bad'); }
  function setCal(i) { const K = S.cal; if (K.sel !== i || K.phase === 'run') { K.sel = i; calStop(); calClear(); } updateCtl(); }
  function setLid(v) { const K = S.cal; if (K.lid !== v || K.phase === 'run') { K.lid = v; calStop(); calClear(); } updateCtl(); calCheckInputs(); }
  function runCal() { const K = S.cal; if (K.phase === 'run') return; K.phase = 'run'; K.t = 0; K.spawned = false; K.res[calKey()] = false; calClear(); Sound.click(); updateCtl(); }
  function stepCal(dt) {
    const K = S.cal; if (K.flash > 0) K.flash = Math.max(0, K.flash - dt * 1.4);
    if (K.phase !== 'run') return;
    K.t = Math.min(T_END, K.t + dt * T_SPEED * (RM ? 3 : 1));
    if (!K.spawned && K.t >= T_MIX) {
      K.spawned = true; Sound.tick();
      const g = CUP(), n = 16;
      for (let i = 0; i < n; i++) parts.emit({ x: g.cx + rnd(-26, 26), y: g.y - 70 - rnd(0, 30), vx: rnd(-8, 8), vy: rnd(140, 200), life: 0.45, size: K.sel === 0 ? 3.6 : 3.2, color: K.sel === 0 ? '#7ab8f0' : '#f1f3f8', gravity: 300, fade: false });
    }
    if (K.t >= T_END) { K.phase = 'done'; K.res[calKey()] = true; Sound.tick(); updateCtl(); calCheckInputs(); }
  }
  const CUP = () => { const L = RC.L; return { x: L.x + 38, y: L.y + 112, w: 150, h: 128, cx: L.x + 113 }; };
  function drawCup(t, tdisp, Tn) {
    const g = CUP(), K = S.cal, c = calSel(), x0 = g.x, y0 = g.y, wTop = g.w, wBot = g.w - 34, hh = g.h, wall = 11;
    const liq = C.mix(c.colA, c.colB, sm(clamp((tdisp - T_MIX) / T_RISE, 0, 1)));
    // 스타이로폼 컵 (단면)
    const cupPath = (inset) => { ctx.beginPath(); ctx.moveTo(x0 + inset, y0); ctx.lineTo(x0 + wTop - inset, y0); ctx.lineTo(x0 + (wTop + wBot) / 2 - inset + 0, y0 + hh); ctx.lineTo(x0 + (wTop - wBot) / 2 + inset, y0 + hh); ctx.closePath(); };
    D.shadow(() => { cupPath(0); ctx.fillStyle = '#f4f1ea'; ctx.fill(); }, { blur: 10, y: 4 });
    cupPath(0); ctx.strokeStyle = '#c9c3b4'; ctx.lineWidth = 2; ctx.stroke();
    // 용액
    ctx.save(); cupPath(wall); ctx.clip();
    const ly = y0 + hh * 0.34, gr = ctx.createLinearGradient(0, ly, 0, y0 + hh); gr.addColorStop(0, C.rgba(liq, 0.78)); gr.addColorStop(1, C.rgba(liq, 0.95));
    ctx.fillStyle = '#fbfaf6'; ctx.fillRect(x0, y0, wTop, hh);
    ctx.fillStyle = gr; ctx.fillRect(x0, ly + Math.sin(t * 3) * 1.2, wTop, hh);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x0, ly - 1, wTop, 3);
    ctx.restore();
    cupPath(wall); ctx.strokeStyle = 'rgba(160,150,130,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 저으개
    const sx = g.cx - 24 + (K.phase === 'run' && !RM ? Math.sin(t * 9) * 10 : 0);
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, y0 - 52); ctx.lineTo(sx, y0 + hh - 22); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx, y0 + hh - 26, 11, 5, 0, 0, TAU); ctx.stroke();
    // 뚜껑
    if (K.lid) {
      D.shadow(() => { D.roundRect(x0 - 8, y0 - 9, wTop + 16, 10, 4); ctx.fillStyle = '#e9e4d6'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(x0 - 8, y0 - 9, wTop + 16, 10, 4); ctx.strokeStyle = '#b9b2a0'; ctx.lineWidth = 1.6; ctx.stroke();
    } else T(g.cx, y0 - 66, '뚜껑 없음', 12.5, '#b45309', 'center', 800, HALO);
    // 온도계 (뚜껑 구멍으로)
    D.thermometer(g.cx + 26, y0 - 58, 118, Tn, c.ymin, c.ymax, { ticks: false, color: Tn >= c.T0 ? HOT : COLD });
    // 열 손실·유입 화살표
    if (tdisp > T_MIX + 2) {
      const dev = Math.abs(Tn - c.T0), lk = (K.lid ? 0.28 : 1) * clamp(dev / 3.2, 0, 1), exo = c.dT.on > 0;
      if (lk > 0.05) {
        [-46, 52].forEach((dx) => {
          const ax = g.cx + dx, ay = y0 - (K.lid ? 14 : 20), len = 22 + 26 * lk;
          if (exo) D.arrow(ax, ay, ax, ay - len, { color: AMB, width: 3.2, head: 9, alpha: 0.35 + 0.5 * lk, dash: K.lid ? [4, 4] : null });
          else D.arrow(ax, ay - len, ax, ay, { color: COLD, width: 3.2, head: 9, alpha: 0.35 + 0.5 * lk, dash: K.lid ? [4, 4] : null });
        });
        if (!K.lid) T(g.cx - 56, y0 - 70, exo ? '열 손실' : '열 유입', 12.5, exo ? '#b45309' : COLD, 'center', 800, HALO);
      }
    }
  }
  function drawCalGraph(tdisp) {
    const L = RC.L, K = S.cal, c = calSel(), gx = L.x + 54, gy = L.y + 284, gw = L.w - 74, gh = 138;
    const X = (tt) => gx + tt / T_END * gw, Y = (v) => gy + gh - (v - c.ymin) / (c.ymax - c.ymin) * gh;
    ctx.fillStyle = '#fbfdff'; D.roundRect(gx, gy, gw, gh, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = c.ymin; v <= c.ymax + 1e-6; v += 2) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); T(gx - 7, Y(v) + 4, String(v), 12, MUTED, 'right', 700); }
    for (let tt = 0; tt <= T_END + 1e-6; tt += 30) { ctx.beginPath(); ctx.moveTo(X(tt), gy); ctx.lineTo(X(tt), gy + gh); ctx.stroke(); T(X(tt), gy + gh + 16, String(tt), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    T(gx + gw, gy + gh + 33, '시간 t (초) →', 12.5, MUTED, 'right', 800); T(gx - 6, gy - 7, '온도 (°C)', 12.5, MUTED, 'left', 800);
    // 혼합 시각
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(T_MIX), gy); ctx.lineTo(X(T_MIX), gy + gh); ctx.stroke(); ctx.restore();
    T(X(T_MIX) + 4, gy + 13, '섞음', 12, PUR, 'left', 800);
    // 곡선
    if (tdisp > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      ctx.strokeStyle = c.dT.on > 0 ? HOT : COLD; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let tt = 0; tt <= tdisp + 1e-6; tt += 1) { const px = X(tt), py = Y(tempAt(K.sel, K.lid, tt)); tt === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); ctx.restore();
      D.sphere(X(tdisp), Y(tempAt(K.sel, K.lid, tdisp)), 5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 });
    }
    // ΔT 하이라이트
    if (calDone()) {
      const dT = c.dT[K.lid ? 'on' : 'off'], tp = T_MIX + T_RISE, yA = Y(c.T0), yB = Y(c.T0 + dT);
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(gx, yA); ctx.lineTo(X(tp + 38), yA); ctx.moveTo(X(tp - 6), yB); ctx.lineTo(X(tp + 38), yB); ctx.stroke(); ctx.restore();
      D.arrow(X(tp + 30), yA, X(tp + 30), yB + (dT > 0 ? 2 : -2), { color: PUR, width: 3, head: 9 });
      D.arrow(X(tp + 30), yB, X(tp + 30), yA + (dT > 0 ? -2 : 2), { color: PUR, width: 3, head: 9 });
      D.sphere(X(tp), yB, 4.5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.2 });
      T(X(tp) + 6, yB + (dT > 0 ? -9 : 17), (dT > 0 ? '최고 ' : '최저 ') + f1(c.T0 + dT) + ' °C', 12, PUR, 'left', 800, HALO);
      D.label(X(tp + 42), (yA + yB) / 2, 'ΔT = ' + sgn(dT, 1) + ' °C', { size: 13, bg: PUR, align: 'left' });
    }
  }
  function drawCal(t) {
    const L = RC.L, K = S.cal, c = calSel(), tdisp = calTimeShown(), Tn = tempAt(K.sel, K.lid, tdisp);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 컵 열량계 (스타이로폼 컵 + 온도 센서)', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, c.info, PHONE ? 11 : 12.5, MUTED, 'left', 700);
    drawCup(t, tdisp, Tn);
    // 디지털 온도 표시
    const bx = L.x + 238, by = L.y + 84;
    D.roundRect(bx, by, L.w - 238 - 16, 138, 12); ctx.fillStyle = '#f3f6fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(bx + 12, by + 24, '🌡️ 온도 센서', 13, MUTED, 'left', 800);
    T(bx + 12, by + 62, f1(Tn) + ' °C', 30, INK, 'left', 800);
    T(bx + 12, by + 88, 't = ' + f0(tdisp) + ' 초', 14, MUTED, 'left', 800);
    const stTxt = K.phase === 'run' ? (tdisp < T_MIX ? '처음 온도를 재는 중' : '반응 중') : calDone() ? '측정 끝' : '대기 중';
    D.label(bx + 12, by + 114, stTxt, { size: 12.5, bg: K.phase === 'run' ? PUR : calDone() ? GOOD : '#8a95a8', align: 'left' });
    drawCalGraph(tdisp);
    const msg = !calDone() ? (K.phase === 'run' ? '온도가 어떻게 변하는지 그래프로 지켜봐요.' : '「측정 시작」을 누르면 30초 동안 처음 온도를 잰 뒤 반응물을 섞어요.')
      : K.lid ? '뚜껑이 열 손실을 줄여 줘요. 그래프에서 ΔT 를 읽어 q 와 ΔH 를 구해요.' : '뚜껑이 없으면 열이 더 많이 빠져나가요. 뚜껑을 덮은 측정과 비교해 봐요.';
    textBlock(L.x + 14, L.y + 468, L.w - 28, msg, 13, INK, 18, 800);
    if (K.flash > 0) { ctx.fillStyle = 'rgba(20,160,88,' + (K.flash * 0.12) + ')'; D.roundRect(L.x, L.y, L.w, L.h, 14); ctx.fill(); }
  }
  function drawCalInfo(t) {
    const R = RC.R, K = S.cal, c = calSel(), d = calDone(), dT = c.dT[K.lid ? 'on' : 'off'];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 측정 기록', 14.5, INK, 'left', 800);
    const rows = [['용액의 질량 m', c.m + ' g', INK], ['반응한 물질의 양 n', c.n.toFixed(3) + ' mol', INK], ['처음 온도', f1(c.T0) + ' °C', INK], [dT > 0 ? '최고 온도' : '최저 온도', d ? f1(c.T0 + dT) + ' °C' : '—', d ? INK : '#9aa6bb'], ['온도 변화 ΔT', d ? sgn(dT, 1) + ' °C' : '—', d ? PUR : '#9aa6bb']];
    rows.forEach((r, i) => { T(R.x + 14, R.y + 52 + i * 25, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 14, R.y + 52 + i * 25, r[1], 14, r[2], 'right', 800); });
    let y = R.y + 52 + 5 * 25 + 12;
    let yEnd = y;
    const ok = K.okq && K.okh, qJ = Math.round(expQ() * 1000), kq = expQ(), kh = expH();
    D.roundRect(R.x + 10, y - 6, R.w - 20, ok ? 134 : 96, 10); ctx.fillStyle = ok ? 'rgba(20,160,88,.09)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = ok ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(R.x + 20, y + 14, 'q = c · m · ΔT', 14, INK, 'left', 800);
    T(R.x + 20, y + 36, ok ? '= 4.18 × ' + c.m + ' × ' + (dT < 0 ? '(' + sgn(dT, 1) + ')' : f1(dT)) + ' = ' + sgn(qJ, 0) + ' J' : '= 4.18 × ' + c.m + ' × ΔT  (J)', 13, ok ? '#0f6b3c' : MUTED, 'left', 800);
    if (ok) {
      T(R.x + 20, y + 56, '= ' + sgn(kq, 2) + ' kJ', 13, '#0f6b3c', 'left', 800);
      T(R.x + 20, y + 80, 'ΔH = −q / n', 14, INK, 'left', 800);
      T(R.x + 20, y + 102, '= −(' + sgn(kq, 2) + ') / ' + c.n.toFixed(3) + ' = ' + sgn(kh, 0) + ' kJ/mol', 13, '#0f6b3c', 'left', 800);
      y += 140;
      const th = c.theory, df = Math.abs(kh - th) / Math.abs(th) * 100;
      yEnd = y + 8 + textBlock(R.x + 14, y + 8, R.w - 28, K.sel === 0 ? '문헌값 약 ' + sgn(th, 0) + ' kJ/mol 과 ' + f0(df) + ' % 차이: 열이 일부 주위로 빠져나가서 ΔT 가 작게 측정돼요.' : '문헌값 약 ' + sgn(th, 0) + ' kJ/mol. 용액의 온도가 내려갔어도 ΔH 는 양수예요.', 12.5, INK, 17, 800);
    } else {
      y += 104;
      yEnd = y + 6 + textBlock(R.x + 14, y + 6, R.w - 28, d ? '위 값으로 q 와 ΔH 를 계산해 조작판의 입력칸에 적어요. 용액 쪽에서 본 q 의 부호와 반응의 ΔH 의 부호가 반대예요.' : '측정을 마치면 ΔT 가 표시돼요.', 12.5, MUTED, 17, 700);
    }
    const by = R.y + R.h - 92;
    if (yEnd + 20 < by) {
    D.roundRect(R.x + 10, by, R.w - 20, 80, 10); ctx.fillStyle = 'rgba(217,119,6,.09)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,119,6,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 20, by + 20, '🥽 열량계와 안전', 13, AMB, 'left', 800);
    textBlock(R.x + 20, by + 38, R.w - 40, '컵 열량계는 단열 컵과 뚜껑으로 열 출입을 줄여요. 보안경을 쓰고, 남은 용액은 교사의 안내대로 처리해요.', 12, INK, 16, 700);
    }
  }


  /* ================= 도표 그리기 (여러 수준) ================= */
  /* bars: [{v, x, w, col, lab:[줄...]}], arrows: [{x, va, vb, col, label, side}] — v 는 kJ (0 이 가장 높은 수준) */
  function drawLvls(r, bars, arrows, vmin) {
    const top = r.y + 62, bot = r.y + r.h - 36, Y = (v) => top + (-v) / (-vmin) * (bot - top);
    axisH({ x: r.x, y: r.y, w: r.w, h: r.h });
    bars.forEach((b) => {
      bar(b.x, b.x + b.w, Y(b.v), b.col || '#4b5d7e');
      b.lab.forEach((s, i) => T(b.x + b.w / 2, Y(b.v) - 11 - (b.lab.length - 1 - i) * 15, s, 12.5, INK, 'center', 800, HALO));
      if (b.tag) T(b.x + b.w / 2, Y(b.v) + 19, b.tag, 12.5, MUTED, 'center', 800);
    });
    arrows.forEach((a) => {
      const ya = Y(a.va), yb = Y(a.vb);
      if (Math.abs(yb - ya) < 4) return;
      D.arrow(a.x, ya, a.x, yb + (yb > ya ? -2 : 2), { color: a.col, width: 3.2, head: 10 });
      if (a.label) D.label(a.x + (a.side || 1) * 4, (ya + yb) / 2, a.label, { size: 12, bg: a.col, align: a.side < 0 ? 'right' : 'left' });
    });
    return Y;
  }

  /* ================= ③ 반응식 쓰기 ================= */
  const WE = () => S.wr.eq[S.wr.sel];
  const EQ = () => EQS[S.wr.sel];
  const wrDoneN = () => S.wr.eq.filter((e) => e.done).length;
  const STN = { s: '(s)', l: '(l)', g: '(g)', aq: '(aq)' };
  const eqCoefs = (e, E) => (E.cand >= 0 ? e.cands[E.cand].c : null);
  function drawTokens(cx, y, toks, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 800);
    const ws = toks.map((k) => ctx.measureText(k.t).width), tot = ws.reduce((a, b) => a + b, 0); let x = cx - tot / 2;
    ctx.restore();
    toks.forEach((k, i) => { T(x, y, k.t, size, k.c || INK, 'left', weight || 800, k.halo ? HALO : null); x += ws[i]; });
  }
  function wrEqToks(e, E) {
    const c = eqCoefs(e, E), toks = [];
    e.sp.forEach((s, j) => {
      if (j === e.nR) toks.push({ t: '  →  ', c: MUTED }); else if (j > 0) toks.push({ t: ' + ', c: MUTED });
      if (c) toks.push({ t: CF(c[j]), c: E.candOk ? AMB : BAD });
      else toks.push({ t: '□', c: '#9aa6bb' });
      toks.push({ t: s, c: c && !E.candOk ? BAD : INK });
      if (E.stage >= 1) {
        const st = E.st[j], wrong = E.stWrong.indexOf(j) >= 0;
        toks.push({ t: st ? STN[st] : '(  )', c: wrong ? BAD : st ? PUR : '#9aa6bb' });
      }
    });
    return toks;
  }
  function stepWr(dt) { S.wr.eq.forEach((E) => { if (E.stamp > 0) E.stamp = Math.max(0, E.stamp - dt); }); }
  function wrFinish(i) {
    const E = S.wr.eq[i]; E.done = true; E.stamp = 1.1; Sound.success();
    const L = RC.L; parts.burst(L.x + L.w / 2, L.y + 176, { count: 22, speed: 190, life: 0.9, size: 4 });
  }
  function wrFail(msg) { const E = WE(); E.msg = msg; E.bad = true; Sound.fail(); showHint(msg, 5200); }
  function pickCand(i) {
    const E = WE(), e = EQ(); if (E.stage !== 0) return;
    const cd = e.cands[i]; E.cand = i; E.candOk = cd.ok;
    if (cd.ok) { E.stage = 1; E.msg = '원자 수가 양쪽에서 같아요. 균형 반응식이에요!'; E.bad = false; E.stamp = 0.0; Sound.success(); parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 140, { count: 10, speed: 120, life: 0.6, size: 3.4 }); }
    else wrFail(unbalMsg(e, cd.c) + ' 계수를 다시 골라요.');
    updateCtl();
  }
  function pickState(j, s) {
    const E = WE(), e = EQ(); if (E.stage !== 1) return;
    E.st[j] = s; E.stWrong = E.stWrong.filter((k) => k !== j);
    Sound.tick();
    if (E.st.every((x) => x)) {
      E.stWrong = E.st.map((x, k) => (x !== e.st[k] ? k : -1)).filter((k) => k >= 0);
      if (!E.stWrong.length) { E.stage = 2; E.msg = '상태 기호를 모두 맞게 붙였어요!'; E.bad = false; Sound.success(); }
      else wrFail(e.stHint[E.stWrong[0]]);
    }
    updateCtl();
  }
  function pickSign(neg) {
    const E = WE(); if (E.stage !== 2) return;
    if (neg) { E.sign = '-'; E.stage = 3; E.msg = '열을 내놓으면 계의 엔탈피가 줄어요. ΔH < 0 (발열)'; E.bad = false; Sound.success(); }
    else wrFail('이 반응은 열을 내놓는 연소·합성이에요. 흡열이 아니라 발열이므로 ΔH 는 음수예요.');
    updateCtl();
  }
  function pickMag(m) {
    const E = WE(), e = EQ(); if (E.stage !== 3) return;
    const c = eqCoefs(e, E), want = magOf(e, c);
    if (Math.abs(m - want) < 1e-6) { E.mag = m; E.stage = 4; E.msg = 'ΔH = −' + want + ' kJ. 계수가 ' + (c[e.ref] === 1 ? '1' : CF(c[e.ref])) + '배이므로 ΔH 도 ' + (c[e.ref] === 1 ? '1' : CF(c[e.ref])) + '배예요.'; E.bad = false; wrFinish(S.wr.sel); }
    else wrFail('기준 값 ' + e.base + ' kJ 은 ' + e.sp[e.ref] + ' 1 mol 일 때예요. 식에서 ' + e.sp[e.ref] + ' 의 계수는 ' + (c[e.ref] === 1 ? '1' : CF(c[e.ref])) + ' 이므로 ΔH 는 ' + e.base + ' × ' + c[e.ref] + ' = ' + want + ' kJ 이에요.');
    updateCtl();
  }
  const STAGES = ['① 균형', '② 상태', '③ 부호', '④ 크기'];
  function drawWrite(t) {
    const L = RC.L, e = EQ(), E = WE();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '✍️ ' + e.name + ': 네 칸을 차례로 채워요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '오른쪽 조작판에서 알맞은 것을 골라요 (25 °C, 1 atm)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 단계 표시
    const pw = (L.w - 28 - 18) / 4;
    STAGES.forEach((s, i) => {
      const x = L.x + 14 + i * (pw + 6), done = E.stage > i, cur = E.stage === i;
      D.roundRect(x, L.y + 64, pw, 34, 17); ctx.fillStyle = done ? 'rgba(20,160,88,.14)' : cur ? 'rgba(124,58,237,.14)' : '#f1f3f8'; ctx.fill(); ctx.strokeStyle = done ? GOOD : cur ? PUR : '#dbe3f3'; ctx.lineWidth = cur ? 2.4 : 1.5; ctx.stroke();
      T(x + pw / 2, L.y + 86, (done ? '✔ ' : '') + s, 13.5, done ? '#0f6b3c' : cur ? PUR : '#8a95a8', 'center', 800);
    });
    // 반응식
    D.roundRect(L.x + 12, L.y + 114, L.w - 24, 128, 14); ctx.fillStyle = E.done ? 'rgba(20,160,88,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = E.done ? GOOD : '#dbe3f3'; ctx.lineWidth = E.done ? 2.4 : 1.5; ctx.stroke();
    drawTokens(L.x + L.w / 2, L.y + 168, wrEqToks(e, E), PHONE ? 21 : 23);
    // ΔH 줄
    let dtxt, dcol = '#9aa6bb';
    if (E.stage >= 4) { dtxt = 'ΔH = ' + MINUS + e.base * eqCoefs(e, E)[e.ref] + ' kJ'; dcol = HOT; }
    else if (E.stage >= 3) { dtxt = 'ΔH < 0   (크기는?)'; dcol = HOT; }
    else dtxt = 'ΔH = ?';
    T(L.x + L.w / 2, L.y + 218, dtxt, PHONE ? 19 : 21, dcol, 'center', 800);
    if (E.stamp > 0) {
      const p = 1 - E.stamp / 1.1, sc = 1 + Math.max(0, 0.35 - p) * 2.4;
      ctx.save(); ctx.translate(L.x + L.w - 72, L.y + 208); ctx.rotate(-0.22); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, p * 6);
      D.roundRect(-52, -20, 104, 40, 10); ctx.strokeStyle = GOOD; ctx.lineWidth = 4; ctx.stroke(); T(0, 7, '완성!', 22, GOOD, 'center', 800); ctx.restore();
    } else if (E.done) { ctx.save(); ctx.translate(L.x + L.w - 72, L.y + 208); ctx.rotate(-0.22); D.roundRect(-52, -20, 104, 40, 10); ctx.strokeStyle = GOOD; ctx.lineWidth = 4; ctx.stroke(); T(0, 7, '완성!', 22, GOOD, 'center', 800); ctx.restore(); }
    // 안내와 피드백
    let y = L.y + 268;
    const guide = ['① 원자의 수가 양쪽에서 같도록 계수를 골라요. (계수 1은 쓰지 않아요)', '② 각 물질이 25 °C, 1 atm 에서 어떤 상태인지 (s)(l)(g)(aq) 로 붙여요.', '③ 반응이 열을 내놓으면 ΔH < 0, 열을 얻으면 ΔH > 0 이에요.', '④ ΔH 는 식에 적힌 계수만큼의 반응에 대한 열이에요. 기준 값에 계수를 곱해요.', '네 칸을 모두 채웠어요! 다른 반응도 써 봐요.'][E.stage];
    y += textBlock(L.x + 16, y, L.w - 32, guide, 13.5, INK, 19, 800) + 6;
    if (E.msg) y += textBlock(L.x + 16, y, L.w - 32, (E.bad ? '⚠️ ' : '✅ ') + E.msg, 13, E.bad ? BAD : '#0f6b3c', 18, 800) + 6;
    if (y < L.y + L.h - 150) {
      D.roundRect(L.x + 12, L.y + L.h - 146, L.w - 24, 58, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
      T(L.x + 24, L.y + L.h - 124, '📖 보기', 12.5, MUTED, 'left', 800);
      T(L.x + 24, L.y + L.h - 102, 'NH₄Cl(s) → NH₄⁺(aq) + Cl⁻(aq)   ΔH = +15 kJ', PHONE ? 12.5 : 14, INK, 'left', 800);
    }
    D.roundRect(L.x + 12, L.y + L.h - 76, L.w - 24, 60, 12); ctx.fillStyle = 'rgba(217,119,6,.09)'; ctx.fill(); ctx.strokeStyle = 'rgba(217,119,6,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    T(L.x + 24, L.y + L.h - 52, '📌 기준', 13, AMB, 'left', 800);
    textBlock(L.x + 24, L.y + L.h - 32, L.w - 48, e.refTxt + ' (25 °C, 1 atm).', 13, INK, 17, 800);
  }
  function drawWriteInfo(t) {
    const R = RC.R, i = S.wr.sel, e = EQ();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 엔탈피 도표 (' + e.sp[e.ref] + ' 1 mol 기준)', 13.5, INK, 'left', 800);
    const r = { x: R.x + 22, y: R.y + 40, w: R.w - 34, h: R.h - 150 };
    if (i === 0) {
      const bs = [{ v: 0, x: r.x + 6, w: 62, lab: ['H₂(g)', '+ ½O₂(g)'], tag: '반응물' }, { v: -242, x: r.x + 84, w: 58, lab: ['H₂O(g)'], col: HOT }, { v: -286, x: r.x + 160, w: 58, lab: ['H₂O(l)'], col: HOT }];
      const Y = drawLvls(r, bs, [{ x: r.x + 76, va: 0, vb: -242, col: HOT, label: '', side: 1 }, { x: r.x + 151, va: 0, vb: -286, col: HOT, label: '', side: 1 }], -286);
      T(r.x + 84 + 29, Y(-242) + 19, '−242', 13, HOT, 'center', 800); T(r.x + 160 + 29, Y(-286) + 19, '−286', 13, HOT, 'center', 800);
      // 44 kJ 차이
      const xb = r.x + 232; ctx.strokeStyle = PUR; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(xb - 6, Y(-242)); ctx.lineTo(xb, Y(-242)); ctx.lineTo(xb, Y(-286)); ctx.lineTo(xb - 6, Y(-286)); ctx.stroke();
      T(xb + 6, (Y(-242) + Y(-286)) / 2 + 4, '44 kJ', 12.5, PUR, 'left', 800, HALO);
      textBlock(R.x + 14, R.y + R.h - 98, R.w - 28, 'H₂O(g) 로 생성되면 −242 kJ, H₂O(l) 로 생성되면 −286 kJ. 차이 44 kJ 은 H₂O(l) → H₂O(g) 에 드는 열이에요. 그래서 상태 기호가 꼭 필요해요.', 12.5, INK, 17, 800);
    } else {
      const lab = i === 1 ? [['C(s)', '+ O₂(g)'], ['CO₂(g)']] : [['N₂(g)', '+ 3H₂(g)'], ['2NH₃(g)']], v = i === 1 ? -394 : -92;
      const Y = drawLvls(r, [{ v: 0, x: r.x + 18, w: 100, lab: lab[0], tag: '반응물' }, { v, x: r.x + r.w - 118, w: 100, lab: lab[1], col: HOT, tag: '생성물' }], [{ x: r.x + r.w / 2, va: 0, vb: v, col: HOT, label: sgn(v, 0) + ' kJ', side: 1 }], v);
      textBlock(R.x + 14, R.y + R.h - 98, R.w - 28, i === 1 ? '반응물의 엔탈피가 더 높아요. 줄어든 394 kJ 만큼의 열이 방출돼요 (식 그대로 1회 반응 기준).' : 'N₂ 1 mol 과 H₂ 3 mol 이 반응해 NH₃ 2 mol 이 생기면 92 kJ 이 방출돼요. NH₃ 1 mol 이 생기면 46 kJ 이에요.', 12.5, INK, 17, 800);
    }
    T(R.x + 14, R.y + R.h - 14, '완성한 반응식 ' + wrDoneN() + ' / 3', 13, wrDoneN() === 3 ? GOOD : MUTED, 'left', 800);
  }

  /* ================= ④ ΔH 다루기 ================= */
  const KS = [0.5, 1, 2, 3];
  const CA = () => S.ca;
  const KCARD = [
    { t: '① 수소 5.0 g 이 H₂O(l) 로 연소할 때 방출하는 열은?', q: '구하는 값: 열 (kJ)', steps: ['n = 5.0 g / 2.0 g/mol = 2.5 mol', '열 = 2.5 mol × 286 kJ/mol = 715 kJ'], tip: 'H₂ 1 mol 당 286 kJ 이에요.' },
    { t: '② 메테인 8.0 g 이 연소할 때 방출하는 열은?', q: '구하는 값: 열 (kJ)', steps: ['n = 8.0 g / 16 g/mol = 0.50 mol', '열 = 0.50 mol × 890 kJ/mol = 445 kJ'], tip: 'CH₄ 1 mol 당 890 kJ 이에요.' },
    { t: '③ N₂ + 3H₂ → 2NH₃ 의 ΔH 는 −92 kJ. 2NH₃ → N₂ + 3H₂ 의 ΔH 는?', q: '구하는 값: ΔH (kJ), 부호도 적어요', steps: ['역반응이면 ΔH 의 부호가 반대예요.', 'ΔH = +92 kJ (흡열)'], tip: '방향이 거꾸로이면 어떻게 될까요?' },
  ];
  const KQ = [{ v: 715, tol: 5 }, { v: 445, tol: 3 }, { v: 92, tol: 1 }];
  function caEq() {
    const A = CA(), k = A.k, rev = A.rev, sp = [['H₂', 'g', k], ['O₂', 'g', k / 2], ['H₂O', 'l', k]];
    const side = (arr) => arr.map((q, j) => CF(q[2]) + q[0] + '(' + q[1] + ')').join(' + ');
    const rs = sp.slice(0, 2), ps = sp.slice(2);
    return rev ? { l: side(ps), r: side(rs), lines: [ps.map((q) => CF(q[2]) + q[0] + '(' + q[1] + ')'), rs.map((q, j) => (j ? '+ ' : '') + CF(q[2]) + q[0] + '(' + q[1] + ')')] }
      : { l: side(rs), r: side(ps), lines: [rs.map((q, j) => (j ? '+ ' : '') + CF(q[2]) + q[0] + '(' + q[1] + ')'), ps.map((q) => CF(q[2]) + q[0] + '(' + q[1] + ')')] };
  }
  const caDH = () => (CA().rev ? 1 : -1) * 286 * CA().k;
  function stepCa(dt) {
    const A = CA(); A.kd = ap2(A.kd, A.k, dt, 6); if (Math.abs(A.kd - A.k) < 0.002) A.kd = A.k;
    A.revd = ap2(A.revd, A.rev ? 1 : 0, dt, 6); if (Math.abs(A.revd - (A.rev ? 1 : 0)) < 0.002) A.revd = A.rev ? 1 : 0;
    A.pulse = ap2(A.pulse, 1, dt, 2.4); if (A.pulse > 0.995) A.pulse = 1;
  }
  function setK(k) { const A = CA(); if (A.k !== k) { A.k = k; A.pulse = 0; Sound.tick(); } updateCtl(); }
  function setRev(v) { const A = CA(); if (A.rev !== v) { A.rev = v; A.pulse = 0; Sound.tick(); } updateCtl(); }
  function drawCalc(t) {
    const L = RC.L, A = CA(), eq = caEq(), dH = caDH();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔢 계수와 방향을 바꾸면 ΔH 는?', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '아래 조작판에서 계수 배수와 방향을 바꿔 보세요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 식
    D.roundRect(L.x + 12, L.y + 60, L.w - 24, 74, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    drawTokens(L.x + L.w / 2, L.y + 92, [{ t: eq.l, c: INK }, { t: '  →  ', c: MUTED }, { t: eq.r, c: INK }], PHONE ? 15.5 : 17.5);
    T(L.x + L.w / 2, L.y + 122, 'ΔH = ' + sgn(dH, 0) + ' kJ', 18, dH < 0 ? HOT : COLD, 'center', 800);
    // 도표
    const r = { x: L.x + 50, y: L.y + 140, w: L.w - 62, h: L.h - 156 };
    const top = r.y + 70, bot = r.y + r.h - 24, VM = -858, Y = (v) => top + (v / VM) * (bot - top);
    axisH(r);
    ctx.strokeStyle = '#eef1f7'; ctx.lineWidth = 1;
    for (let v = 0; v >= VM; v -= 200) { ctx.beginPath(); ctx.moveTo(r.x + 4, Y(v)); ctx.lineTo(r.x + r.w, Y(v)); ctx.stroke(); T(r.x - 8, Y(v) + 4, sgn(v, 0), 12, MUTED, 'right', 700); }
    T(r.x - 8, r.y + 22, 'kJ', 12, MUTED, 'right', 800);
    const vs = -286 * A.kd * A.revd, ve = -286 * A.kd * (1 - A.revd), bw = 120, x0 = r.x + 22, x1 = r.x + r.w - 20 - bw, col = dH < 0 ? HOT : COLD;
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.4)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0 + bw, Y(vs)); ctx.lineTo(x1, Y(vs)); ctx.stroke(); ctx.restore();
    bar(x0, x0 + bw, Y(vs), '#4b5d7e'); bar(x1, x1 + bw, Y(ve), col);
    eq.lines[0].forEach((s, i) => T(x0 + bw / 2, Y(vs) - 28 - (eq.lines[0].length - 1 - i) * 15, s, 12.5, INK, 'center', 800, HALO));
    eq.lines[1].forEach((s, i) => T(x1 + bw / 2, Y(ve) - 28 - (eq.lines[1].length - 1 - i) * 15, s, 12.5, INK, 'center', 800, HALO));
    T(x0 + bw / 2, Y(vs) + 19, '반응물', 12.5, MUTED, 'center', 800); T(x1 + bw / 2, Y(ve) + 19, '생성물', 12.5, MUTED, 'center', 800);
    const xa = (x0 + bw + x1) / 2;
    if (Math.abs(Y(ve) - Y(vs)) > 6) D.arrow(xa, Y(vs), xa, Y(ve) + (Y(ve) > Y(vs) ? -2 : 2), { color: col, width: 3.6, head: 11 });
    D.label(xa, (Y(vs) + Y(ve)) / 2, 'ΔH ' + sgn(dH, 0), { size: 12.5, bg: col, align: 'center' });
    const e = sm(A.pulse);
    D.sphere(x0 + bw / 2 + (x1 - x0) * e, Y(vs) + (Y(ve) - Y(vs)) * e - 11 - Math.sin(e * Math.PI) * 14, 11, '#8b5cf6', { shadow: true });
    T(L.x + L.w - 14, L.y + L.h - 12, '기준 0 = H₂ + O₂ 수준', 12, MUTED, 'right', 700);
  }
  function drawCalcInfo(t) {
    const R = RC.R, A = CA(), ch = (R.h - 60) / 3;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧮 열량 계산', 14.5, INK, 'left', 800);
    KCARD.forEach((cd, i) => {
      const y = R.y + 36 + i * ch, done = A.ok[i], h = ch - 6;
      D.roundRect(R.x + 10, y, R.w - 20, h, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = done ? 2.2 : 1.4; ctx.stroke();
      let yy = y + 18; yy += textBlock(R.x + 20, yy, R.w - 40, cd.t, 12.5, INK, 16, 800) + 2;
      if (done) { cd.steps.forEach((s, k) => { yy += textBlock(R.x + 20, yy + 2, R.w - 40, s, 12.5, k === cd.steps.length - 1 ? GOOD : INK, 16, 800) + 2; }); T(R.x + R.w - 20, y + h - 8, '✅ 정답', 12.5, GOOD, 'right', 800); }
      else { T(R.x + 20, yy + 6, cd.tip, 12.5, MUTED, 'left', 700); T(R.x + 20, yy + 24, '답을 조작판의 입력칸에 적어요', 12.5, PUR, 'left', 800); }
    });
  }

  /* ================= 컨트롤 · 공통 ================= */
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  RX.forEach((r, i) => $('#rxnChips').appendChild(chipBtn(r.name, r.name, () => setSel(i))));
  CAL.forEach((c, i) => $('#calChips').appendChild(chipBtn(c.name, c.name, () => setCal(i))));
  EQS.forEach((e, i) => $('#eqChips').appendChild(chipBtn(e.name, e.name, () => setWr(i))));
  KS.forEach((k) => $('#mulChips').appendChild(chipBtn('× ' + (k === 0.5 ? '½' : k), '계수를 ' + k + '배', () => setK(k))));
  function setSel(i) { HS().sel = i; updateCtl(); }
  function setWr(i) { S.wr.sel = i; buildWrite(); updateCtl(); }
  function buildWrite() {
    const e = EQ(), box = $('#candChips'), sb = $('#stRows'), mb = $('#magChips');
    box.innerHTML = ''; e.cands.forEach((cd, i) => box.appendChild(chipBtn(cd.txt, cd.txt, () => pickCand(i))));
    sb.innerHTML = '';
    e.sp.forEach((s, j) => {
      const row = document.createElement('div'); row.className = 'qrow'; row.dataset.j = j;
      const lab = document.createElement('span'); lab.textContent = s; lab.style.cssText = 'flex:0 0 52px;align-self:center;font-weight:800;font-size:15px';
      row.appendChild(lab);
      ['s', 'l', 'g', 'aq'].forEach((st) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = st; b.dataset.st = st; b.setAttribute('aria-label', s + ' 상태 ' + st); b.addEventListener('click', () => { Sound.click(); pickState(j, st); }); row.appendChild(b); });
      sb.appendChild(row);
    });
    mb.innerHTML = ''; KS.forEach((k) => { const m = e.base * k; mb.appendChild(chipBtn(MINUS + m + ' kJ', 'ΔH ' + MINUS + m + ' kJ', () => pickMag(m))); });
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    const E = WE();
    if (S.mode === 'write') { $('#wrS1').hidden = E.stage !== 0; $('#wrS2').hidden = E.stage !== 1; $('#wrS3').hidden = E.stage !== 2; $('#wrS4').hidden = E.stage !== 3; }
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const H = HS(), i = H.sel, running = H.run[i] && H.prog[i] < 1, ran = H.run[i] && H.prog[i] >= 1;
    $$('#rxnChips button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', placed(k)); });
    $('#bRun').textContent = running ? '⏳ 반응 중…' : ran ? '↻ 다시 반응시키기' : '▶ 반응 시키기'; $('#bRun').disabled = running;
    $('#bUp').disabled = !ran || placed(i) || !S.lock; $('#bDn').disabled = !ran || placed(i) || !S.lock;
    $('#bUp').classList.toggle('done', placed(i) && H.place[i] === 'up'); $('#bDn').classList.toggle('done', placed(i) && H.place[i] === 'down');
    $('#plNote').textContent = !S.lock ? '도표에는 반응마다 생성물 수준이 표시돼요. 반응을 시켜 온도 변화와 비교해 봐요.' : placed(i) ? '✅ 이 반응을 도표에 놓았어요. 다른 반응도 놓아 봐요. (' + H.place.filter((p) => p).length + ' / 3)' : ran ? '온도 변화를 보고 골라요. 열을 내놓았다면 계의 엔탈피는 줄어들었어요.' : '반응을 시켜 온도 변화를 본 뒤, 이 반응의 생성물 수준이 반응물보다 높은지 낮은지 골라요.';
    const K = S.cal;
    $$('#calChips button').forEach((b, k) => { b.classList.toggle('on', k === K.sel); b.classList.toggle('done', K.solved[k]); });
    $('#bLidOn').setAttribute('aria-pressed', K.lid ? 'true' : 'false'); $('#bLidOff').setAttribute('aria-pressed', K.lid ? 'false' : 'true');
    $('#bCalRun').textContent = K.phase === 'run' ? '⏳ 측정 중…' : calDone() ? '↻ 다시 측정하기' : '▶ 측정 시작'; $('#bCalRun').disabled = K.phase === 'run';
    $('#cq').classList.toggle('ok', K.okq); $('#ch').classList.toggle('ok', K.okh);
    $$('#eqChips button').forEach((b, k) => { b.classList.toggle('on', k === S.wr.sel); b.classList.toggle('done', S.wr.eq[k].done); });
    $$('#candChips button').forEach((b, k) => { const bad = E.cand === k && !E.candOk; b.classList.toggle('on', E.cand === k && E.candOk); b.style.borderColor = bad ? 'var(--bad)' : ''; b.style.background = bad ? 'var(--bad-soft)' : ''; });
    $$('#stRows .qrow').forEach((row) => { const j = +row.dataset.j; $$('button', row).forEach((b) => { const on = E.st[j] === b.dataset.st, wr = E.stWrong.indexOf(j) >= 0; b.classList.toggle('on', on && !wr); b.classList.toggle('no', on && wr); }); });
    $('#bExo').classList.toggle('on', E.sign === '-');
    $$('#mulChips button').forEach((b, k) => b.classList.toggle('on', KS[k] === CA().k));
    $('#bRev').setAttribute('aria-pressed', CA().rev ? 'true' : 'false');
    ['#k1', '#k2', '#k3'].forEach((id, k) => { const inp = $(id), v = CA().q[k]; if (document.activeElement !== inp && inp.value !== v) inp.value = v; inp.classList.toggle('ok', CA().ok[k] && v !== ''); if (!inp.classList.contains('ok')) inp.classList.remove('ok'); });
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bRun').addEventListener('click', () => runHeat(HS().sel));
  function place(up) {
    const H = HS(), i = H.sel; if (placed(i)) return;
    if (!(H.run[i] && H.prog[i] >= 1)) { showHint('먼저 ▶ 반응 시키기로 온도 변화를 확인해요.'); Sound.fail(); return; }
    const truthUp = RX[i].dH > 0;
    if (up === truthUp) { H.place[i] = up ? 'up' : 'down'; H.stamp[i] = 0.6; Sound.success(); const g = HG(i); parts.burst(g.sx + g.sw / 2, g.by + 40, { count: 14, speed: 130, life: 0.6, size: 3.6 }); showHint('맞아요! ΔH ' + sgn(RX[i].dH, 0) + ' kJ', 2600); }
    else { H.shake = 1; Sound.fail(); showHint(truthUp ? '온도가 내려갔어요. 계가 주위에서 열을 흡수했으니 계의 엔탈피는 늘어났어요.' : '온도가 올랐어요. 계가 주위로 열을 내놓았으니 계의 엔탈피는 줄어들었어요.', 5000); }
    updateCtl();
  }
  $('#bUp').addEventListener('click', () => place(true));
  $('#bDn').addEventListener('click', () => place(false));
  $('#bLidOn').addEventListener('click', () => { Sound.click(); setLid(true); });
  $('#bLidOff').addEventListener('click', () => { Sound.click(); setLid(false); });
  $('#bCalRun').addEventListener('click', runCal);
  $('#bExo').addEventListener('click', () => { Sound.click(); pickSign(true); });
  $('#bEndo').addEventListener('click', () => { Sound.click(); pickSign(false); });
  $('#bRev').addEventListener('click', () => { Sound.click(); setRev(!CA().rev); });
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  $('#cq').addEventListener('input', (e) => { S.cal.q = e.target.value; e.target.classList.remove('bad'); const w = S.cal.okq; calCheckInputs(); if (S.cal.okq && !w) Sound.tick(); updateCtl(); });
  $('#ch').addEventListener('input', (e) => { S.cal.h = e.target.value; e.target.classList.remove('bad'); const w = S.cal.okh; calCheckInputs(); if (S.cal.okh && !w) Sound.tick(); updateCtl(); });
  $('#cq').addEventListener('change', (e) => {
    const v = parseNum(e.target.value); if (e.target.value === '' || S.cal.okq) return; shakeBad(e.target);
    if (!calDone()) showHint('먼저 측정을 마쳐요. 그래프에서 ΔT 를 읽을 수 있어요.');
    else if (near(Math.abs(v), Math.abs(expQ()) * 1000, 40)) showHint('kJ 단위로 적어요. 1 kJ = 1000 J 이에요.');
    else if (near(Math.abs(v), Math.abs(expQ()), 0.05)) showHint('q 는 용액이 얻은 열이에요. 용액의 온도가 ' + (expQ() > 0 ? '올랐으니 +' : '내려갔으니 −') + ' 부호예요.');
    else showHint('q = 4.18 J/(g·°C) × ' + calSel().m + ' g × ΔT 를 J 로 구한 뒤 kJ 로 바꿔요.');
  });
  $('#ch').addEventListener('change', (e) => {
    const v = parseNum(e.target.value); if (e.target.value === '' || S.cal.okh) return; shakeBad(e.target);
    if (!calDone()) showHint('먼저 측정을 마쳐요.');
    else if (near(Math.abs(v), Math.abs(expH()), tolH() + 0.5)) showHint('ΔH = −q / n 이에요. q 와 부호가 반대예요. ' + (expH() < 0 ? '발열이면 ΔH < 0.' : '흡열이면 ΔH > 0.'));
    else if (near(Math.abs(v), Math.abs(expQ()), 0.1)) showHint('q 를 물질의 양 n (mol) 으로 나눠야 kJ/mol 이 돼요.');
    else showHint('ΔH = −q / n, n = ' + calSel().n.toFixed(3) + ' mol 이에요.');
  });
  ['#k1', '#k2', '#k3'].forEach((id, k) => {
    const inp = $(id), okf = (s) => near(parseNum(s), KQ[k].v, KQ[k].tol);
    inp.addEventListener('input', () => { CA().q[k] = inp.value; const was = CA().ok[k]; CA().ok[k] = okf(inp.value); inp.classList.remove('bad'); if (CA().ok[k] && !was) { Sound.tick(); Sound.success(); } updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || CA().ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      showHint(k === 0 ? (near(v, 286, 3) ? 'H₂ 5.0 g 은 몇 mol 일까요? 몰질량 2.0 g/mol 로 몰수를 먼저 구해요.' : 'n = 5.0 / 2.0 mol 에 286 kJ/mol 을 곱해요.') : k === 1 ? (near(v, 890, 5) ? 'CH₄ 8.0 g 은 0.50 mol 이에요. 몰수를 곱해야 해요.' : 'n = 8.0 / 16 mol 에 890 kJ/mol 을 곱해요.') : (near(v, -92, 1) ? '역반응이면 ΔH 의 부호가 반대로 바뀌어요.' : '정반응 ΔH = −92 kJ 의 부호만 바꾸면 돼요.'));
    });
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'heat') { const H = HS(); H.prog = [0, 0, 0]; H.run = [false, false, false]; H.place = [null, null, null]; H.lv = [0, 0, 0]; H.shake = 0; H.stamp = [0, 0, 0]; }
    else if (S.mode === 'cal') { const K = S.cal; calStop(); K.res = {}; K.solved = [false, false]; K.lid = true; calClear(); }
    else if (S.mode === 'write') { S.wr.eq[S.wr.sel] = { cand: -1, candOk: false, st: [null, null, null], stWrong: [], stage: 0, sign: null, mag: null, done: false, stamp: 0, msg: '' }; }
    else { const A = CA(); A.k = 1; A.rev = false; A.pulse = 0; A.q = ['', '', '']; A.ok = [false, false, false]; }
    updateCtl();
  });
  /* 용기 누르기 (열의 출입) */
  SciSim.pointer(view, {
    down(p) { if (S.mode !== 'heat') return false; for (let i = 0; i < RX_N; i++) { const g = HG(i); if (inRect(p, { x: g.sx, y: RC.L.y + 62, w: g.sw, h: 330 })) { setSel(i); Sound.tick(); return false; } } return false; },
    hover(p) { if (S.mode !== 'heat') return null; for (let i = 0; i < RX_N; i++) { const g = HG(i); if (inRect(p, { x: g.sx, y: RC.L.y + 62, w: g.sw, h: 330 })) return 'pointer'; } return null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'heat') { const H = HS(), i = H.sel, X = RX[i]; L1 = '고른 반응'; a = X.name; L2 = '온도 변화'; b = H.run[i] ? sgn(heatT(i) - X.T0, 1) + ' °C' : '—'; L3 = 'ΔH'; c = heatVisible(i) ? sgn(X.dH, 0) + ' kJ' : '?'; }
    else if (S.mode === 'cal') { const K = S.cal, td = calTimeShown(); L1 = '온도'; a = f1(tempAt(K.sel, K.lid, td)) + ' °C'; L2 = '온도 변화 ΔT'; b = calDone() ? sgn(calSel().dT[K.lid ? 'on' : 'off'], 1) + ' °C' : '—'; L3 = '뚜껑'; c = K.lid ? '있음' : '없음'; }
    else if (S.mode === 'write') { const E = WE(), e = EQ(); L1 = '반응'; a = e.name; L2 = '채운 칸'; b = Math.min(E.stage, 4) + ' / 4'; L3 = '완성한 반응식'; c = wrDoneN() + ' / 3'; }
    else { const A = CA(); L1 = '계수 배수'; a = '× ' + (A.k === 0.5 ? '½' : A.k); L2 = '방향'; b = A.rev ? '거꾸로' : '정반응'; L3 = 'ΔH'; c = sgn(caDH(), 0) + ' kJ'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const resetHeat = () => { const H = HS(); H.prog = [0, 0, 0]; H.run = [false, false, false]; H.place = [null, null, null]; H.lv = [0, 0, 0]; H.shake = 0; H.stamp = [0, 0, 0]; H.sel = 0; };
  const resetCal = () => { const K = S.cal; calStop(); K.res = {}; K.solved = [false, false]; K.lid = true; K.sel = 0; calClear(); };
  const resetWr = () => { S.wr.eq = EQS.map(() => ({ cand: -1, candOk: false, st: [null, null, null], stWrong: [], stage: 0, sign: null, mag: null, done: false, stamp: 0, msg: '' })); S.wr.sel = 0; buildWrite(); };
  const resetCa = () => { const A = CA(); A.k = 1; A.kd = 1; A.rev = false; A.revd = 0; A.pulse = 1; A.q = ['', '', '']; A.ok = [false, false, false]; };
  const levels = [
    {
      title: '열의 출입: 엔탈피 변화 ΔH', short: '열의 출입', icon: '🌡️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 화학 반응에서 나오거나 들어가는 열을 어떻게 숫자로 나타내고 반응식에 적을 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 통합과학2에서</b> 발열 반응은 온도가 올라가고 흡열 반응은 온도가 내려간다고 배웠어요. 이번에는 그 열의 출입을 <b>엔탈피 변화 ΔH</b>라는 숫자와 도표로 나타내 봐요.</div>' +
        '<p>엔탈피 H는 물질이 가진 에너지의 한 척도예요. 반응 전후의 차 <b>ΔH = H(생성물) − H(반응물)</b>은 일정한 압력에서 반응이 내놓거나 흡수하는 열(반응열)과 같아요. 도표에서 <b>생성물 수준이 낮으면 ΔH &lt; 0</b>(열을 주위로 방출), <b>높으면 ΔH &gt; 0</b>(주위에서 열 흡수)예요.</p>',
      features: ['heat'],
      setup() { S.lock = false; setMode('heat'); },
      recap: '발열 반응은 생성물 수준이 낮고 ΔH < 0, 흡열 반응은 생성물 수준이 높고 ΔH > 0 이에요.',
      summary: '<ul><li><b>엔탈피 변화 ΔH</b> = H(생성물) − H(반응물). 일정한 압력에서 반응이 출입시키는 열(<b>반응열</b>)과 같아요.</li><li><b>발열 반응</b>: 생성물의 엔탈피가 더 낮아요. <b>ΔH &lt; 0</b>, 열을 주위로 방출해서 용기의 온도가 올라요 (중화 −57 kJ, CaO + H₂O −65 kJ).</li><li><b>흡열 반응</b>: 생성물의 엔탈피가 더 높아요. <b>ΔH &gt; 0</b>, 주위에서 열을 흡수해서 용기의 온도가 내려가요 (NH₄Cl 용해 +15 kJ).</li><li>ΔH 의 부호는 반응(계)의 입장에서 정해요. 발열 반응의 ΔH 는 음수예요.</li></ul>',
      missions: [
        {
          title: '세 반응을 도표에 놓기',
          goal: '세 반응을 모두 반응시키고, 온도 변화를 보고 <b>생성물 수준이 반응물보다 높은지 낮은지</b> 골라 엔탈피 도표에 놓아요.',
          hint: '용기를 눌러 반응을 고르고 「반응 시키기」를 눌러요. 온도가 올랐다면 열을 내놓은 거예요 → 생성물 수준은 낮아요. 온도가 내려갔다면 반대예요.',
          setup() { S.lock = true; resetHeat(); setMode('heat'); },
          check: () => placeAll(), hold: 0.4,
          status: () => RX.map((r, i) => r.name + ' ' + mark(placed(i))).join(' &nbsp; '),
          explain: '중화 반응과 CaO + H₂O 는 온도가 올라가는 <b>발열 반응</b>이라 생성물 수준이 낮고 ΔH &lt; 0 (−57, −65 kJ), NH₄Cl 용해는 온도가 내려가는 <b>흡열 반응</b>이라 생성물 수준이 높고 ΔH &gt; 0 (+15 kJ)이에요.',
        },
        {
          type: 'quiz', title: 'ΔH 의 부호와 온도 변화',
          goal: 'ΔH < 0 인 반응이 일어난 용기의 온도 변화는?',
          setup() { S.lock = true; setMode('heat'); },
          choices: ['온도가 내려가요. 계가 주위의 열을 흡수해요', '변하지 않아요. ΔH 는 온도와 관계가 없어요', '온도가 올라가요. 계가 열을 주위로 내놓아요', '온도가 올라가요. 발열 반응이라 ΔH 는 양수예요'],
          answer: 2,
          feedback: ['열을 흡수하는 흡열 반응은 ΔH > 0 이에요.', 'ΔH 는 반응이 출입시키는 열이어서 주위의 온도 변화로 나타나요.', '', 'ΔH 의 부호는 계의 입장에서 정해요. 열을 내놓으면 계의 엔탈피가 줄어서 ΔH < 0 이에요. 발열 반응의 ΔH 는 음수예요.'],
          explain: 'ΔH &lt; 0 이면 계의 엔탈피가 줄어든 만큼의 열이 주위로 나가 <b>용기의 온도가 올라가요</b>. 발열 반응의 ΔH 는 음수예요.',
        },
      ],
    },
    {
      title: '열량계: 반응열 재기', short: '열량계', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열의 출입을 ΔH 의 부호로 나타냈어요. 이제 <b>열량계</b>로 열의 크기를 재어 ΔH 의 값을 구해 봐요. 중학교에서 배운 열량 <b>Q = cmΔT</b> 를 그대로 써요.</div>' +
        '<p>스타이로폼 컵에 든 용액의 질량 m, 물의 비열 c = 4.18 J/(g·°C), 온도 변화 ΔT 로 용액이 얻은 열 <b>q = c·m·ΔT</b>를 구해요. 반응이 내놓은 열은 용액이 얻은 열과 같으므로 <b>ΔH = −q / n</b> (n: 반응한 물질의 양, mol)이에요.</p>',
      features: ['cal'],
      setup() { S.lock = false; setMode('cal'); },
      recap: '열량계에서 q = c·m·ΔT 로 용액이 얻은 열을 구하고, ΔH = −q / n 으로 mol 당 반응열을 구해요.',
      summary: '<ul><li>용액이 얻은 열 <b>q = c · m · ΔT</b> (c = 4.18 J/(g·°C), 용액의 밀도 1.0 g/mL 로 가정). 온도가 오르면 q &gt; 0, 내리면 q &lt; 0.</li><li>반응의 <b>ΔH = −q / n</b> (kJ/mol). 용액이 얻은 열은 반응이 내놓은 열이므로 부호가 반대예요.</li><li>중화: 100 g, ΔT = +6.5 °C → q ≈ 2.72 kJ, n = 0.050 mol → ΔH ≈ <b>−54 kJ/mol</b> (문헌값 약 −57).</li><li>NH₄Cl 용해: 105 g, ΔT = −3.5 °C → q ≈ −1.54 kJ, n = 0.100 mol → ΔH ≈ <b>+15 kJ/mol</b>.</li><li>뚜껑이 없으면 열 손실이 커서 |ΔT| 와 |ΔH| 가 작게 측정돼요.</li></ul>',
      missions: [
        {
          title: '중화 반응의 ΔH 구하기',
          goal: '<b>뚜껑을 덮고</b> 중화 반응을 측정해 q (kJ)와 ΔH (kJ/mol)를 구해 적어요.',
          hint: '「측정 시작」 뒤 ΔT 를 읽어요. q = 4.18 × 100 × ΔT 를 J 로 구해 kJ 로 바꾸고, n = 0.050 mol 이니 ΔH = −q / 0.050 이에요.',
          setup() { S.lock = true; resetCal(); setMode('cal'); },
          check: () => S.cal.solved[0], hold: 0.4,
          status: () => '뚜껑 ' + mark(S.cal.lid) + ' &nbsp; 측정 ' + mark(S.cal.sel === 0 && calDone()) + ' &nbsp; q ' + mark(S.cal.sel === 0 && S.cal.okq) + ' &nbsp; ΔH ' + mark(S.cal.sel === 0 && S.cal.okh),
          explain: 'q = 4.18 × 100 × 6.5 ≈ 2717 J ≈ 2.72 kJ, ΔH = −2.72 / 0.050 ≈ <b>−54 kJ/mol</b>. 문헌값 약 −57 kJ/mol 보다 조금 작은 까닭은 열이 일부 주위로 빠져나가 ΔT 가 작게 측정되기 때문이에요.',
        },
        {
          title: 'NH₄Cl 용해의 ΔH 구하기',
          goal: '<b>뚜껑을 덮고</b> NH₄Cl 이 물에 녹을 때의 q 와 ΔH 를 구해 적어요. 부호에 주의해요.',
          hint: 'ΔT 가 음수이면 q 도 음수예요. m = 105 g, n = 0.100 mol 이고 ΔH = −q / n 이에요.',
          setup() { S.lock = true; resetCal(); S.cal.sel = 1; setMode('cal'); },
          check: () => S.cal.solved[1], hold: 0.4,
          status: () => '뚜껑 ' + mark(S.cal.lid) + ' &nbsp; 측정 ' + mark(S.cal.sel === 1 && calDone()) + ' &nbsp; q ' + mark(S.cal.sel === 1 && S.cal.okq) + ' &nbsp; ΔH ' + mark(S.cal.sel === 1 && S.cal.okh),
          explain: 'ΔT = −3.5 °C 이므로 용액은 열을 잃었어요. q = 4.18 × 105 × (−3.5) ≈ −1536 J ≈ −1.54 kJ, ΔH = −(−1.54) / 0.100 ≈ <b>+15 kJ/mol</b> 이에요. 용액이 잃은 열을 용해 반응이 흡수한 거예요.',
        },
        {
          type: 'quiz', title: '온도는 내려가는데 ΔH 는 양수?',
          goal: 'NH₄Cl 이 녹을 때 용액의 온도는 내려가는데 ΔH 는 양수예요. 그 까닭은?',
          setup() { S.lock = true; setMode('cal'); },
          choices: ['용해가 열을 내놓기 때문에 ΔH 가 양수가 돼요', '온도가 내려가면 ΔH 는 항상 음수여서 측정이 잘못된 거예요', '열량계가 열을 잃어서 생긴 측정 오류예요', '반응(용해)이 용액에서 열을 흡수해요. 용액은 열을 잃고 반응의 ΔH 는 양수예요'],
          answer: 3,
          feedback: ['용해가 열을 내놓았다면 용액의 온도가 올라가야 해요.', 'ΔH 의 부호는 용액이 아니라 반응(계)의 입장에서 정해요. 열을 흡수하면 ΔH > 0 이에요.', '뚜껑이 없으면 오차는 생기지만 온도가 내려가는 이유는 아니에요.', ''],
          explain: '용액의 온도가 내려가는 것은 용해 반응이 용액에서 열을 <b>흡수</b>하기 때문이에요. 용액은 열을 잃고(q &lt; 0), 반응은 열을 얻어요(ΔH &gt; 0).',
        },
      ],
    },
    {
      title: '반응식 쓰기: 열화학 반응식', short: '반응식 쓰기', icon: '✍️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반응열의 값을 kJ/mol 로 구했어요. 이 값을 반응식에 함께 적은 것이 <b>열화학 반응식</b>이에요. 일반선택 화학에서 배운 균형 반응식과 몰의 개념을 써요.</div>' +
        '<p>열화학 반응식 = <b>균형 반응식</b> + 각 물질의 <b>상태 기호</b>(s, l, g, aq) + <b>ΔH</b>. ΔH 는 식에 적힌 계수만큼 반응할 때의 열이에요 (25 °C, 1 atm 기준). 네 칸을 차례로 채워 완성해요.</p>',
      features: ['write'],
      setup() { S.lock = false; setMode('write'); },
      recap: '열화학 반응식은 균형 반응식에 상태 기호와 ΔH 를 함께 쓴 것이에요. ΔH 는 식의 계수에 맞는 값이어야 해요.',
      summary: '<ul><li><b>열화학 반응식</b> = 균형 반응식 + 상태 기호 (s, l, g, aq) + ΔH (kJ). 25 °C, 1 atm 기준이에요.</li><li>H₂(g) + ½O₂(g) → H₂O(l) &nbsp; ΔH = −286 kJ</li><li>C(s) + O₂(g) → CO₂(g) &nbsp; ΔH = −394 kJ</li><li>N₂(g) + 3H₂(g) → 2NH₃(g) &nbsp; ΔH = −92 kJ</li><li>ΔH 는 식 그대로 1회 반응할 때의 열이라, 계수를 2배로 하면 ΔH 도 2배예요 (2H₂ + O₂ → 2H₂O: −572 kJ).</li><li>생성물이 H₂O(g) 이면 ΔH = −242 kJ 로, H₂O(l) 일 때보다 44 kJ(H₂O(l) → H₂O(g) 에 필요한 열) 덜 방출돼요.</li></ul>',
      missions: [
        {
          title: '열화학 반응식 3개 완성하기',
          goal: '수소의 연소, 탄소의 연소, 암모니아 합성의 열화학 반응식을 네 칸씩 모두 채워 완성해요.',
          hint: '① 원자 수가 양쪽에서 같은 식을 골라요. ② 상태는 25 °C, 1 atm 기준(물은 액체). ④ ΔH = 기준 값 × 기준 물질의 계수예요.',
          setup() { S.lock = true; resetWr(); setMode('write'); },
          check: () => wrDoneN() === 3, hold: 0.4,
          status: () => EQS.map((e, i) => e.name + ' ' + mark(S.wr.eq[i].done)).join(' &nbsp; '),
          explain: 'H₂(g) + ½O₂(g) → H₂O(l) ΔH = −286 kJ (2배 하면 2H₂(g) + O₂(g) → 2H₂O(l) ΔH = −572 kJ), C(s) + O₂(g) → CO₂(g) ΔH = −394 kJ, N₂(g) + 3H₂(g) → 2NH₃(g) ΔH = −92 kJ 예요.',
        },
        {
          type: 'quiz', title: '상태 기호를 빼면 안 되는 까닭',
          goal: '열화학 반응식에서 물질의 상태 기호를 빼면 안 되는 까닭은?',
          setup() { S.lock = true; setMode('write'); },
          choices: ['상태 기호는 반응 속도를 나타내기 때문이에요', '같은 물질도 상태에 따라 가진 에너지가 달라서 ΔH 가 달라지기 때문이에요', '상태 기호가 없으면 계수를 맞출 수 없기 때문이에요', 'ΔH 와는 관계없고 보기 좋게 하려는 표기예요'],
          answer: 1,
          feedback: ['속도는 상태 기호가 아니라 활성화 에너지 등으로 설명해요.', '', '계수는 원자 수를 보고 맞춰요. 상태와는 관계가 없어요.', '같은 반응이라도 H₂O(l) 인지 H₂O(g) 인지에 따라 ΔH 가 달라져요.'],
          explain: '물질이 가진 에너지는 고체, 액체, 기체에 따라 달라요. 그래서 <b>상태가 다르면 ΔH 도 달라지므로</b> 상태 기호가 꼭 필요해요.',
        },
        {
          type: 'quiz', title: '생성물이 수증기이면?',
          goal: 'H₂(g) + ½O₂(g) → H₂O(g) 의 ΔH 는 −242 kJ 로, H₂O(l) 이 생길 때의 −286 kJ 보다 덜 방출돼요. 그 까닭은?',
          setup() { S.lock = true; setMode('write'); },
          choices: ['수증기가 생기면 수소가 덜 반응하기 때문이에요', '수증기는 연소가 아니라서 ΔH 가 항상 작아요', '생성된 H₂O(l) 이 H₂O(g) 로 되는 데 44 kJ 의 열이 필요해서 그만큼 덜 방출돼요', '값이 책마다 달라서 어느 것이나 같다고 봐도 돼요'],
          answer: 2,
          feedback: ['두 식 모두 H₂ 1 mol 이 반응하는 같은 양의 반응이에요.', '수증기가 생겨도 연소이고 열이 방출돼요. 다만 증발에 쓰이는 열만큼 덜 방출돼요.', '', '두 값은 서로 다른 반응(생성물의 상태가 달라요)의 ΔH 예요. 차이는 증발에 필요한 열 44 kJ 이에요.'],
          explain: 'H₂O(l) → H₂O(g) 에는 44 kJ 의 열이 필요해요. 그래서 −286 + 44 = <b>−242 kJ</b> 로 방출되는 열이 줄어요.',
        },
      ],
    },
    {
      title: 'ΔH 다루기: 계수, 방향, 질량', short: 'ΔH 다루기', icon: '🔢', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ΔH 가 식의 계수에 맞는 값이라는 것을 보았어요. 이제 계수를 바꾸거나 방향을 거꾸로 할 때 ΔH 가 어떻게 달라지는지 확인하고, 반응하는 물질의 질량에서 열을 계산해 봐요.</div>' +
        '<p>세 가지 규칙을 확인해요. ① 계수를 n배 하면 ΔH 도 <b>n배</b>, ② 반응을 거꾸로 하면 ΔH 의 <b>부호가 반대</b>, ③ 실제로 나오는 열 = 반응한 물질의 몰수 × 몰당 ΔH 의 크기예요.</p>',
      features: ['calc'],
      setup() { S.lock = false; setMode('calc'); },
      recap: 'ΔH 는 계수에 비례하고, 거꾸로 하면 부호가 바뀌며, 질량은 몰수로 바꿔서 열을 계산해요.',
      summary: '<ul><li>계수를 n배 → ΔH 도 n배: 2H₂(g) + O₂(g) → 2H₂O(l) &nbsp; ΔH = −572 kJ.</li><li>반응을 거꾸로 → ΔH 의 부호 반대: 2H₂O(l) → 2H₂(g) + O₂(g) &nbsp; ΔH = +572 kJ. 2NH₃ → N₂ + 3H₂ 는 ΔH = +92 kJ.</li><li>방출되는 열 = 몰수 × |ΔH|(몰당): 수소 5.0 g = 2.5 mol → 2.5 × 286 = <b>715 kJ</b>, 메테인 8.0 g = 0.50 mol → 0.50 × 890 = <b>445 kJ</b>.</li><li>엔탈피 도표에서 ΔH 의 크기는 두 수준의 높이 차예요.</li></ul>',
      missions: [
        {
          title: '질량에서 열 계산하기',
          goal: '조작판의 세 문제를 풀어 답을 적어요: 수소 5.0 g 의 열, 메테인 8.0 g 의 열, 2NH₃ → N₂ + 3H₂ 의 ΔH.',
          hint: '① n = 5.0 / 2.0 = 2.5 mol 에 286 kJ/mol 을 곱해요. ② n = 8.0 / 16 = 0.50 mol 에 890 kJ/mol. ③ 역반응이면 −92 의 부호가 바뀌어요.',
          setup() { S.lock = true; resetCa(); setMode('calc'); },
          check: () => CA().ok[0] && CA().ok[1] && CA().ok[2], hold: 0.4,
          status: () => '① ' + mark(CA().ok[0]) + ' &nbsp; ② ' + mark(CA().ok[1]) + ' &nbsp; ③ ' + mark(CA().ok[2]),
          explain: '① 2.5 mol × 286 kJ/mol = <b>715 kJ</b>, ② 0.50 mol × 890 kJ/mol = <b>445 kJ</b>, ③ 정반응이 −92 kJ 이므로 역반응은 <b>+92 kJ</b> (흡열)이에요.',
        },
        {
          type: 'quiz', title: '계수를 2배로 하면',
          goal: '2H₂(g) + O₂(g) → 2H₂O(l) 의 ΔH 는 H₂(g) + ½O₂(g) → H₂O(l) 의 ΔH 의 몇 배일까요?',
          setup() { S.lock = true; setMode('calc'); },
          choices: ['같아요 (−286 kJ)', '4배 (−1144 kJ)', '½배 (−143 kJ)', '2배 (−572 kJ)'],
          answer: 3,
          feedback: ['식에 적힌 만큼 반응하면 열도 그만큼이에요. 2배 반응하면 2배의 열이 나와요.', '반응하는 H₂ 가 1 mol 에서 2 mol 로 2배가 되었어요. 4배가 아니에요.', '½배는 계수를 절반으로 할 때예요.', ''],
          explain: '계수가 2배이면 반응하는 양도 2배라서 방출되는 열도 2배, <b>ΔH = −572 kJ</b> 이에요. ΔH 는 계수에 비례해요.',
        },
        {
          type: 'quiz', title: '계수를 바꿔도 ΔH 는 그대로?',
          goal: '“열화학 반응식의 계수를 바꿔도 ΔH 는 그대로이다.” 이 말은?',
          setup() { S.lock = true; setMode('calc'); },
          choices: ['맞아요. 물질의 종류가 같으면 ΔH 도 같아요', '맞아요. 계수는 ΔH 에 영향을 주지 않고 상태만 영향을 줘요', '틀려요. ΔH 는 식에 적힌 계수만큼 반응할 때의 열이라 계수에 비례해요', '반응 방향을 거꾸로 할 때만 ΔH 가 달라져요'],
          answer: 2,
          feedback: ['물질의 종류가 같아도 반응하는 양이 다르면 나오는 열도 달라요.', '상태도 ΔH 에 영향을 주지만, 계수에도 비례해요.', '', '방향을 바꾸면 부호가 바뀌고, 계수를 바꾸면 크기가 바뀌어요. 둘 다 ΔH 에 영향을 줘요.'],
          explain: 'ΔH 는 <b>식에 적힌 계수만큼 반응할 때의 열</b>이에요. 그래서 계수를 n배 하면 ΔH 도 n배, 거꾸로 하면 부호가 바뀌어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-thermochem', mount: '#game', badge: '반응열 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { heat: '🌡️ 열의 출입과 엔탈피 도표', cal: '🧪 컵 열량계', write: '✍️ 열화학 반응식 쓰기', calc: '🔢 ΔH 다루기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildWrite(); setMode('heat');
  function stepAll1(dt) { S.t += dt; stepHeat(dt); stepCal(dt); stepWr(dt); stepCa(dt); }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'heat') { drawHeat(S.t); drawHeatInfo(S.t); }
    else if (S.mode === 'cal') { drawCal(S.t); drawCalInfo(S.t); }
    else if (S.mode === 'write') { drawWrite(S.t); drawWriteInfo(S.t); }
    else { drawCalc(S.t); drawCalcInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, RX, CAL, EQS, KQ, setMode, setSel, runHeat, place, setCal, setLid, runCal, calCheckInputs, expQ, expH, calDone, setWr, pickCand, pickState, pickSign, pickMag, setK, setRev, wrDoneN, placeAll, HS,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
