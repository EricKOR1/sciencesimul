/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 분자 간 힘과 액체 [12물에01-03]
   ① 관찰: 인력과 열운동 (분자 모형 상자: 온도 · 인력의 세기에 따라 모여 있거나 흩어져요)
   ② 모형: 세 가지 힘 (분산력 · 쌍극자-쌍극자 힘 · 수소 결합, 분자 카드 분류)
   ③ 탐구: 끓는점 추론 (14 ~ 17족 수소 화합물 끓는점 그래프, 요인 검증표)
   ④ 예측: 순서 예측 (쌍 비교 6문제, 가열해서 먼저 끓는 쪽 확인)
   분자 간 힘의 세기는 크기감(대략)으로만 다뤄요. 퍼텐셜 에너지 식, 이온-쌍극자 힘, 끓는점 계산은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 950 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4';
  const BG = '#f3f0fb';

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
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const degC = (k) => Math.round(k - 273);

  /* ================= 분자 모형 상자 (2차원 레너드-존스 입자, 단위: σ) ================= */
  const TAU_S = 0.15;            // 시뮬레이션 시간 단위 1 = 0.15 초
  const KT_PER_K = 1 / 520;      // kT = T / 520 (ε = 1인 물질이 약 270 K 근처에서 흩어져요)
  function makeMD(N, W, H) {
    const m = { N, W, H, x: new Float64Array(N), y: new Float64Array(N), vx: new Float64Array(N), vy: new Float64Array(N), fx: new Float64Array(N), fy: new Float64Array(N), spin: new Float64Array(N), ang: new Float64Array(N), eps: 1, kT: 0.2, g: 0.03, acc: 0, coh: 0, trail: [] };
    const cols = Math.max(2, Math.floor((W - 2) / 1.25));
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      m.x[i] = 1 + c * 1.25 + (r % 2) * 0.6; m.y[i] = H - 1 - r * 1.1;
      const a = rnd(0, TAU), v = Math.sqrt(0.4) * rnd(0.6, 1.4); m.vx[i] = Math.cos(a) * v; m.vy[i] = Math.sin(a) * v;
      m.spin[i] = rnd(-1.6, 1.6); m.ang[i] = rnd(0, TAU); m.trail.push([]);
    }
    mdForces(m);
    return m;
  }
  function mdForces(m) {
    const { N, x, y, fx, fy, eps } = m;
    for (let i = 0; i < N; i++) { fx[i] = 0; fy[i] = m.g; }
    for (let i = 0; i < N - 1; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = x[i] - x[j], dy = y[i] - y[j]; let r2 = dx * dx + dy * dy;
        if (r2 > 6.25) continue; if (r2 < 0.64) r2 = 0.64;
        const i2 = 1 / r2, s6 = i2 * i2 * i2; let f = 24 * eps * (2 * s6 * s6 - s6) * i2; if (f > 300) f = 300; else if (f < -300) f = -300;
        fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
      }
    }
  }
  function mdStep(m, h) {
    const { N, x, y, vx, vy, fx, fy, W, H } = m;
    for (let i = 0; i < N; i++) {
      vx[i] += 0.5 * h * fx[i]; vy[i] += 0.5 * h * fy[i]; x[i] += h * vx[i]; y[i] += h * vy[i];
      if (x[i] < 0.5) { x[i] = 1 - x[i]; vx[i] = Math.abs(vx[i]); } else if (x[i] > W - 0.5) { x[i] = 2 * (W - 0.5) - x[i]; vx[i] = -Math.abs(vx[i]); }
      if (y[i] < 0.5) { y[i] = 1 - y[i]; vy[i] = Math.abs(vy[i]); } else if (y[i] > H - 0.5) { y[i] = 2 * (H - 0.5) - y[i]; vy[i] = -Math.abs(vy[i]); }
    }
    mdForces(m);
    let ke = 0;
    for (let i = 0; i < N; i++) { vx[i] += 0.5 * h * fx[i]; vy[i] += 0.5 * h * fy[i]; ke += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); }
    const tin = ke / N;
    if (tin > 1e-9) { let lam = Math.sqrt(1 + (h / 0.1) * (m.kT / tin - 1)); lam = lam < 0.95 ? 0.95 : lam > 1.05 ? 1.05 : lam; for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; } }
  }
  function mdAdvance(m, dt) {            // dt: 실제 시간(초)
    m.acc += dt / TAU_S; let n = 0;
    while (m.acc >= 0.01 && n < 14) { mdStep(m, 0.01); m.acc -= 0.01; n++; }
    if (m.acc > 0.2) m.acc = 0;
    for (let i = 0; i < m.N; i++) m.ang[i] += m.spin[i] * dt;
  }
  function mdCoh(m) {
    let c = 0; const { N, x, y } = m;
    for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) { const dx = x[i] - x[j], dy = y[i] - y[j]; if (dx * dx + dy * dy < 2.25) c += 2; }
    return c / N;
  }
  function mdWarm(m, tau) { const n = Math.round(tau / 0.01); for (let i = 0; i < n; i++) mdStep(m, 0.01); m.coh = mdCoh(m); }

  /* ================= 자료 ================= */
  const SUB = {
    A: { id: 'A', name: '물질 A', desc: '인력 약함', eps: 0.5, ttr: 160, c: '#0ea5a4' },
    B: { id: 'B', name: '물질 B', desc: '인력 중간', eps: 1.0, ttr: 290, c: '#8b5cf6' },
    C: { id: 'C', name: '물질 C', desc: '인력 강함', eps: 1.8, ttr: 480, c: '#e2464b' },
  };
  const SK = ['A', 'B', 'C'];
  const COH_ON = 2.5, COH_OFF = 1.9;
  const MDW = 24, MDH = 21;
  const SC = PHONE ? 15.5 : 15;

  const FI = {
    disp: { key: 'disp', name: '분산력', full: '분산력 (런던 힘)', col: '#0ea5a4', range: [0.1, 40], ex: 'Ar, CH₄, CO₂, I₂ …', txt: '모든 분자 사이에 작용해요. 전자 구름이 순간적으로 한쪽으로 쏠리면 이웃 분자에도 반대 전하가 생겨서 서로 끌어당겨요. 전자가 많은(분자량이 큰) 분자일수록 구름이 잘 쏠려서 힘이 커요.' },
    dip: { key: 'dip', name: '쌍극자–쌍극자 힘', full: '쌍극자–쌍극자 힘', col: '#f59e0b', range: [5, 25], ex: 'HCl, HBr …', txt: '극성 분자는 한쪽이 부분 양전하(δ+), 다른 쪽이 부분 음전하(δ−)예요. 이웃 분자의 δ+와 δ−가 마주 보도록 방향을 맞추어 끌어당겨요.' },
    hb: { key: 'hb', name: '수소 결합', full: '수소 결합', col: '#e2464b', range: [10, 40], ex: 'H₂O, HF, NH₃ …', txt: 'N, O, F에 결합한 H가 이웃 분자의 N, O, F에 있는 비공유 전자쌍을 끌어당겨요. 분자 안의 공유 결합이 아니라 분자 사이의 힘이고, 분자 간 힘 중 가장 강해요.' },
  };
  const FK = ['disp', 'dip', 'hb'];
  const SZ = {
    he: { nm: 'He', r: 34, e: 2, bp: -269, arrow: 0.3, dots: 2 },
    ar: { nm: 'Ar', r: 52, e: 18, bp: -186, arrow: 0.65, dots: 7 },
    xe: { nm: 'Xe', r: 72, e: 54, bp: -108, arrow: 1.0, dots: 12 },
  };
  const MOL = {
    h2o: { nm: 'H₂O', heavy: 'O', col: '#e2464b', R: 15, H: [-52, 52], LP: [-125, 125] },
    hf: { nm: 'HF', heavy: 'F', col: '#5fbf6a', R: 14, H: [0], LP: [180, 125, -125] },
    nh3: { nm: 'NH₃', heavy: 'N', col: '#3867f4', R: 15, H: [110, 180, 250], LP: [0] },
  };
  const HBL = {                     // 수소 결합 장면: 분자 배치 (영역 안 비율 좌표)
    h2o: { pts: [[0.16, 0.66], [0.5, 0.34], [0.84, 0.66]], links: [[0, 1], [1, 2]] },
    hf: { pts: [[0.17, 0.5], [0.5, 0.5], [0.83, 0.5]], links: [[0, 1], [1, 2]] },
    nh3: { pts: [[0.16, 0.7], [0.5, 0.3], [0.84, 0.7]], links: [[0, 1], [1, 2]] },
  };
  const CARDS = [
    { id: 'h2o', f: 'H₂O', hint: '굽은형 · O–H', ans: 2 },
    { id: 'ar', f: 'Ar', hint: '단원자 분자', ans: 0 },
    { id: 'hcl', f: 'HCl', hint: '극성 공유 결합', ans: 1 },
    { id: 'co2', f: 'CO₂', hint: '직선형 · C=O', ans: 0 },
    { id: 'nh3', f: 'NH₃', hint: '삼각뿔형 · N–H', ans: 2 },
    { id: 'ch4', f: 'CH₄', hint: '정사면체 · C–H', ans: 0 },
    { id: 'hf', f: 'HF', hint: '극성 공유 결합', ans: 2 },
    { id: 'hbr', f: 'HBr', hint: '극성 공유 결합', ans: 1 },
  ];
  const BINS = [
    { nm: '분산력', sub: '무극성 분자', col: '#0ea5a4' },
    { nm: '쌍극자–쌍극자 힘', sub: '극성 분자 (수소 결합 제외)', col: '#f59e0b' },
    { nm: '수소 결합', sub: 'N·O·F에 직접 결합한 H', col: '#e2464b' },
  ];
  const GROUPS = [14, 15, 16, 17];
  const BPD = {
    14: { col: '#6b7280', nm: ['CH₄', 'SiH₄', 'GeH₄', 'SnH₄'], v: [-162, -112, -89, -52], M: [16, 32, 77, 123] },
    15: { col: '#3867f4', nm: ['NH₃', 'PH₃', 'AsH₃', 'SbH₃'], v: [-33, -88, -62, -17], M: [17, 34, 78, 125] },
    16: { col: '#e2464b', nm: ['H₂O', 'H₂S', 'H₂Se', 'H₂Te'], v: [100, -60, -41, -2], M: [18, 34, 81, 130] },
    17: { col: '#14a058', nm: ['HF', 'HCl', 'HBr', 'HI'], v: [20, -85, -67, -35], M: [20, 36, 81, 128] },
  };
  const isAnom = (g, i) => i === 0 && g >= 15;
  const ANOM_NOTE = {
    15: 'NH₃: H 3개, 비공유 전자쌍 1개 → 분자 하나가 평균 수소 결합 1개 정도',
    16: 'H₂O: H 2개, 비공유 전자쌍 2개 → 분자 하나가 수소 결합 2개를 만들 수 있어요',
    17: 'HF: H 1개 → 분자 하나가 수소 결합 1개 (그래도 HCl보다 훨씬 높아요)',
  };
  const TBL_ROWS = ['분자량', '극성', '수소 결합'];
  const TBL_COLS = ['(a) 14족은 주기가 클수록 끓는점이 올라가요', '(b) NH₃ · H₂O · HF만 같은 족에서 유난히 높아요', '(c) H₂O가 HF보다 끓는점이 높아요'];
  //            (a)  (b)  (c)       0 = ○, 1 = △, 2 = ×
  const TBL_ANS = [[0, 2, 2], [2, 1, 2], [2, 0, 0]];
  const TBL_SYM = ['', '○', '△', '×'];
  const TBL_EXP = [
    ['14족은 모두 무극성인데 분자량이 커질수록 끓는점이 올라가요.', '같은 족에서 NH₃·H₂O·HF는 분자량이 가장 작은데도 가장 높아요.', 'HF(20)가 H₂O(18)보다 분자량이 더 큰데도 끓는점은 낮아요.'],
    ['14족은 모두 무극성이라 극성으로는 오름세를 설명할 수 없어요.', '세 분자는 극성이지만 극성인 H₂S·HCl 등도 낮아서 극성만으로는 일부만 설명돼요.', 'H₂O와 HF는 둘 다 극성이 비슷해서 H₂O가 더 높은 까닭을 알 수 없어요.'],
    ['14족(C-H)에는 수소 결합이 없어서 오름세는 수소 결합 때문이 아니에요.', 'N, O, F에 결합한 H가 있어서 수소 결합으로 잘 설명돼요.', '분자당 수소 결합 수가 H₂O는 2개, HF는 1개라서 H₂O가 더 높아요.'],
  ];
  const PAIRS = [
    { a: { f: 'CH₃OCH₃', nm: '다이메틸 에터', bp: -24, M: 46, tag: 'O에 H가 직접 결합하지 않아요' }, b: { f: 'C₂H₅OH', nm: '에탄올', bp: 78, M: 46, tag: 'O에 H가 직접 결합(O–H)' }, hi: 'b', why: '분자량(46)이 같아도 에탄올은 O–H 결합이 있어 분자 사이에 수소 결합을 만들어요. 다이메틸 에터는 수소 결합을 만들 수 없어서 더 낮은 온도에서 끓어요.' },
    { a: { f: 'I₂', nm: '아이오딘', bp: 184, M: 254, tag: '무극성 · 전자가 많아요' }, b: { f: 'F₂', nm: '플루오린', bp: -188, M: 38, tag: '무극성 · 전자가 적어요' }, hi: 'a', why: '둘 다 무극성이라 분산력만 작용해요. 전자가 많은(분자량이 큰) I₂의 분산력이 훨씬 커서 끓는점이 높아요.' },
    { a: { f: 'HCl', nm: '염화 수소', bp: -85, M: 36, tag: '극성 · 수소 결합 없음' }, b: { f: 'HF', nm: '플루오린화 수소', bp: 20, M: 20, tag: '극성 · F에 H 결합' }, hi: 'b', why: 'HF는 F에 H가 결합해 수소 결합을 만들어요. 분자량이 더 큰 HCl은 쌍극자–쌍극자 힘과 분산력만 작용해서 끓는점이 낮아요.' },
    { a: { f: 'H₂O', nm: '물', bp: 100, M: 18, tag: 'O에 H 2개 · 수소 결합' }, b: { f: 'H₂S', nm: '황화 수소', bp: -60, M: 34, tag: 'S에 H 결합 · 수소 결합 없음' }, hi: 'a', why: '물은 수소 결합을 만들지만 H₂S는 만들지 못해요. 분자량이 작은 물이 훨씬 높은 100 °C에서 끓어요.' },
    { a: { f: 'C₄H₁₀', nm: '뷰테인', bp: -1, M: 58, tag: '곧은 사슬 모양' }, b: { f: 'C₄H₁₀', nm: '아이소뷰테인', bp: -12, M: 58, tag: '가지가 있는 둥근 모양' }, hi: 'a', why: '분자식과 분자량이 같아도 곧은 사슬 모양은 분자끼리 닿는 면이 넓어서 분산력이 커요. 가지가 있는 아이소뷰테인은 접촉 면이 좁아서 조금 더 낮은 온도에서 끓어요.' },
    { a: { f: 'CH₄', nm: '메테인', bp: -162, M: 16, tag: '무극성 · 분산력만' }, b: { f: 'NH₃', nm: '암모니아', bp: -33, M: 17, tag: '극성 · N에 H 3개' }, hi: 'b', why: '분자량은 비슷하지만 NH₃는 수소 결합을 만들고 CH₄는 약한 분산력만 있어요. 그래서 NH₃의 끓는점이 훨씬 높아요.' },
  ];

  /* ---------- 배치 ---------- */
  const RC = {
    heat: { L: PHONE ? { x: 8, y: 50, w: 464, h: 492 } : { x: 12, y: 50, w: 470, h: 498 }, R: PHONE ? { x: 8, y: 550, w: 464, h: 388 } : { x: 490, y: 50, w: 298, h: 498 } },
    forces: { L: PHONE ? { x: 8, y: 50, w: 464, h: 860 } : { x: 12, y: 50, w: 776, h: 498 } },
    bp: { L: PHONE ? { x: 8, y: 50, w: 464, h: 860 } : { x: 12, y: 50, w: 776, h: 498 } },
    pred: { L: PHONE ? { x: 8, y: 50, w: 464, h: 780 } : { x: 12, y: 50, w: 776, h: 498 } },
  };
  const MODE_LABEL = { heat: '🌡️ 인력과 열운동', forces: '🔍 분자 간 힘 세 가지', bp: '📈 수소 화합물의 끓는점', pred: '🎯 끓는점 순서 예측' };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'heat', fade: 0, lock: false, gate: '', t: 0, sub: { forces: 'look', bp: 'graph' },
    heat: { sub: 'B', T: 100, Td: 100, lines: true, md: null, coh: 0, st: 'cond', z: 0, seen: { A: { c: false, g: false }, B: { c: false, g: false }, C: { c: false, g: false } }, pair: { a: false, c: false }, tc: null, lastT: 100 },
    forces: { f: 'disp', size: 'ar', hb: 'h2o', rd: 52, ad: 0.65, viewed: { disp: false, dip: false, hb: false }, vt: 0, dipA: [], cards: [], sel: null, seq: 0, wrongNote: '', hbBlink: 0 },
    bp: { groups: { 14: true, 15: false, 16: false, 17: false }, ap: { 14: 1, 15: 0, 16: 0, 17: 0 }, found: {}, sel: null, msg: '', tbl: [null, null, null, null, null, null, null, null, null], flag: {}, shake: {}, ptShake: null },
    pred: { q: 0, pick: [null, null, null, null, null, null], res: [null, null, null, null, null, null], ph: 'pick', ht: 0, mdA: null, mdB: null, Tlo: 0, Thi: 0, T: 0, boil: [false, false], first: null, st: [0, 0] },
    flash: [],
  };
  let game = null;

  /* ---------- 공통 그리기 ---------- */
  // 구부러진 3원자 분자 (큰 원자 1개 + 작은 원자 2개)
  function bentMol(x, y, ang, s, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const R0 = 5.6 * s, r1 = 2.7 * s, d = 4.9 * s;
    const sp = [[Math.cos(0.95) * d, Math.sin(0.95) * d], [Math.cos(-0.95) * d, Math.sin(-0.95) * d]];
    D.sphere(sp[0][0], sp[0][1], r1, '#f1f5f9', { gloss: false });
    D.sphere(sp[1][0], sp[1][1], r1, '#f1f5f9', { gloss: false });
    D.sphere(0, 0, R0, col, { gloss: R0 > 4 });
    ctx.restore();
  }
  function dotRing(x, y, r, col, a) { ctx.save(); ctx.strokeStyle = C.rgba(col, a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); }

  /* ================= ① 열운동 ================= */
  function heatInit() {
    const h = S.heat; h.md = makeMD(60, MDW, MDH); h.md.eps = SUB[h.sub].eps; h.md.kT = h.Td * KT_PER_K; mdWarm(h.md, 30);
    h.coh = h.md.coh; h.st = h.coh >= COH_ON ? 'cond' : 'gas'; h.z = h.st === 'gas' ? 1 : 0;
  }
  function heatReset() {
    const h = S.heat; h.sub = 'B'; h.T = 100; h.Td = 100; h.tc = null; h.lastT = 100;
    h.md = makeMD(60, MDW, MDH); h.md.eps = SUB.B.eps; h.md.kT = h.Td * KT_PER_K; mdWarm(h.md, 30); h.coh = h.md.coh; h.st = h.coh >= COH_ON ? 'cond' : 'gas'; h.z = h.st === 'gas' ? 1 : 0;
  }
  function stepHeat(dt) {
    const h = S.heat; if (!h.md) return;
    h.Td = SciSim.approach(h.Td, h.T, dt, 5); if (Math.abs(h.Td - h.T) < 0.3) h.Td = h.T;
    h.md.kT = h.Td * KT_PER_K; h.md.eps = SUB[h.sub].eps;
    mdAdvance(h.md, dt);
    h.coh = SciSim.approach(h.coh, mdCoh(h.md), dt, 4);
    const prev = h.st;
    if (h.st === 'cond' && h.coh <= COH_OFF) h.st = 'gas'; else if (h.st === 'gas' && h.coh >= COH_ON) h.st = 'cond';
    if (prev === 'cond' && h.st === 'gas') h.tc = Math.round(h.Td / 10) * 10;
    const sn = h.seen[h.sub]; if (h.st === 'cond') sn.c = true; else sn.g = true;
    if (h.Td >= 250 && h.Td <= 310) { if (h.sub === 'A' && h.st === 'gas') h.pair.a = true; if (h.sub === 'C' && h.st === 'cond') h.pair.c = true; }
    h.z = SciSim.approach(h.z, h.st === 'gas' ? 1 : 0, dt, 2.5);
    // 자취
    if (!RM) h.md.trail.forEach((tr, i) => { if (i < 5) { tr.push([h.md.x[i], h.md.y[i]]); if (tr.length > 14) tr.shift(); } });
  }
  const heatBox = () => { const L = RC.heat.L, w = MDW * SC, hh = MDH * SC; return { x: L.x + (L.w - w) / 2, y: L.y + 44, w, h: hh }; };
  function drawHeat(t) {
    const L = RC.heat.L, Rr = RC.heat.R, h = S.heat, sub = SUB[h.sub], md = h.md;
    T(14, 26, MODE_LABEL.heat, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 28, '🧪 분자 모형 상자 · ' + sub.name + ' (' + sub.desc + ')', 14.5, INK, 'left', 800);
    const b = heatBox();
    ctx.fillStyle = 'rgba(235,242,255,.75)'; D.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    // 인력 점선
    if (h.lines) {
      ctx.strokeStyle = C.rgba(PUR, 0.2 + 0.5 * Math.min(1, sub.eps / 1.2)); ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]); ctx.beginPath();
      let cnt = 0;
      for (let i = 0; i < md.N - 1 && cnt < 260; i++) for (let j = i + 1; j < md.N && cnt < 260; j++) {
        const dx = md.x[i] - md.x[j], dy = md.y[i] - md.y[j];
        if (dx * dx + dy * dy < 2.25) { ctx.moveTo(b.x + md.x[i] * SC, b.y + md.y[i] * SC); ctx.lineTo(b.x + md.x[j] * SC, b.y + md.y[j] * SC); cnt++; }
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 자취
    if (!RM) md.trail.forEach((tr, i) => {
      if (i >= 5 || tr.length < 2) return;
      for (let k = 1; k < tr.length; k++) { ctx.strokeStyle = C.rgba(sub.c, 0.5 * k / tr.length); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(b.x + tr[k - 1][0] * SC, b.y + tr[k - 1][1] * SC); ctx.lineTo(b.x + tr[k][0] * SC, b.y + tr[k][1] * SC); ctx.stroke(); }
    });
    for (let i = 0; i < md.N; i++) bentMol(b.x + md.x[i] * SC, b.y + md.y[i] * SC, md.ang[i], SC / 15 * 1.12, sub.c);
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(b.x, b.y, b.w, b.h, 8); ctx.stroke();
    // 상태 칩
    const cond = h.st === 'cond';
    const cy = b.y + b.h + 14, cw = 300;
    D.roundRect(L.x + (L.w - cw) / 2, cy, cw, 32, 16); ctx.fillStyle = cond ? '#e6f7ee' : '#e8effc'; ctx.fill(); ctx.strokeStyle = cond ? GOOD : BLU; ctx.lineWidth = 2; ctx.stroke();
    T(L.x + L.w / 2, cy + 21.5, cond ? '모여 있어요 (액체·고체 상태)' : '흩어져 있어요 (기체 상태)', 14.5, cond ? '#14803f' : '#2548b8', 'center', 800);
    // 막대: 열운동 대 인력
    const bx = L.x + 156, bw = L.w - 156 - 16, by1 = cy + 46, by2 = by1 + (PHONE ? 30 : 32);
    T(L.x + 14, by1 + 14, '열운동 (∝ T)', 13.5, '#b45309', 'left', 800);
    D.roundRect(bx, by1, bw, 20, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by1, bw, 20, 8); ctx.clip(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, by1, bw * clamp(h.Td / 600, 0, 1), 20); ctx.restore();
    T(L.x + 14, by2 + 14, '분자 간 인력', 13.5, PUR, 'left', 800);
    D.roundRect(bx, by2, bw, 20, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by2, bw, 20, 8); ctx.clip(); ctx.fillStyle = PUR; ctx.fillRect(bx, by2, bw * clamp(sub.ttr / 600, 0, 1), 20); ctx.restore();
    // 인력 막대 끝에 열운동 막대가 닿는 위치 표시
    const mx = bx + bw * clamp(sub.ttr / 600, 0, 1);
    ctx.strokeStyle = PUR; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mx, by1 - 4); ctx.lineTo(mx, by2 + 24); ctx.stroke(); ctx.setLineDash([]);
    // 오른쪽 패널
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 28, '🌡️ 온도계', 14.5, INK, 'left', 800);
    const th = PHONE ? 156 : 190, tx = Rr.x + 40, ty = Rr.y + 52, tw = 22;
    D.roundRect(tx, ty, tw, th, 11); ctx.fillStyle = '#eef1f7'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    const fillH = th * clamp((h.Td - 50) / 550, 0, 1);
    ctx.save(); D.roundRect(tx, ty, tw, th, 11); ctx.clip(); const gr = ctx.createLinearGradient(0, ty + th, 0, ty); gr.addColorStop(0, '#3867f4'); gr.addColorStop(1, '#e2464b'); ctx.fillStyle = gr; ctx.fillRect(tx + 3, ty + th - fillH, tw - 6, fillH + 2); ctx.restore();
    [100, 200, 300, 400, 500, 600].forEach((v) => { const y = ty + th - th * (v - 50) / 550; ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx + tw + 2, y); ctx.lineTo(tx + tw + 9, y); ctx.stroke(); T(tx + tw + 13, y + 4.5, v + ' K', 12.5, MUTED, 'left', 700); });
    D.sphere(tx + tw / 2, ty + th + 12, 14, '#e2464b', { gloss: true });
    const ix = Rr.x + (PHONE ? 190 : 150);
    T(ix, ty + 22, 'T = ' + Math.round(h.Td) + ' K', PHONE ? 24 : 22, INK, 'left', 800);
    T(ix, ty + 48, '(' + sgn(Math.round(h.Td) - 273) + ' °C)', 15, MUTED, 'left', 700);
    textBlock(ix, ty + 78, Rr.x + Rr.w - ix - 12, '평균 운동 에너지는 절대 온도(K)에 비례해요. 분자 종류와 상관없어요.', 13, MUTED, 18, 700);
    // 확대 상자
    const zy = PHONE ? Rr.y + 238 : Rr.y + 288, zh = Rr.h - (zy - Rr.y) - 12;
    D.roundRect(Rr.x + 12, zy, Rr.w - 24, zh, 12); ctx.fillStyle = '#f7f3ff'; ctx.fill(); ctx.strokeStyle = '#d6c9f5'; ctx.lineWidth = 1.6; ctx.stroke();
    T(Rr.x + 22, zy + 22, '🔍 분자 두 개를 확대', 13.5, PUR, 'left', 800);
    const zcx = Rr.x + Rr.w / 2, zcy = PHONE ? zy + 62 : zy + zh * 0.5 - 4, dd = lerp(66, Math.min(150, (Rr.w - 24) * 0.72), sm(h.z));
    const sw = Math.sin(t * 1.4) * 0.12;
    const m1 = [zcx - dd / 2, zcy + Math.sin(t * 2) * 1.5], m2 = [zcx + dd / 2, zcy + Math.cos(t * 2.2) * 1.5];
    const a1 = Math.PI + sw, a2 = 0 - sw;
    const bondLine = (mx, my, ang) => { [0.95, -0.95].forEach((o) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(ang + o) * 4.9 * 3.1, my + Math.sin(ang + o) * 4.9 * 3.1); ctx.stroke(); }); };
    bondLine(m1[0], m1[1], a1); bondLine(m2[0], m2[1], a2);
    bentMol(m1[0], m1[1], a1, 3.1, sub.c); bentMol(m2[0], m2[1], a2, 3.1, sub.c);
    const attr = 1 - sm(h.z);
    if (attr > 0.04) {
      ctx.save(); ctx.strokeStyle = C.rgba(PUR, 0.85 * attr); ctx.lineWidth = 2.4; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 12;
      ctx.beginPath(); ctx.moveTo(m1[0] + 22, m1[1]); ctx.lineTo(m2[0] - 22, m2[1]); ctx.stroke(); ctx.restore();
      if (attr > 0.5) T(zcx, zcy - 30, '분자 사이 인력', 12.5, PUR, 'center', 800);
    }
    textBlock(Rr.x + 22, zy + zh - (PHONE ? 20 : 52), Rr.w - 44, h.z > 0.5 ? '분자 사이 거리만 멀어졌어요. 분자 안의 결합(실선)은 그대로예요.' : '분자 사이 거리가 가까워서 인력이 작용해요. 분자 안의 결합(실선)은 그대로예요.', 12.5, INK, 17, 800);
  }

  /* ---------- ① 컨트롤 ---------- */
  SK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.innerHTML = SUB[k].name.replace('물질 ', '') + ' · ' + SUB[k].desc; bt.style.fontSize = '13.5px'; $('#subChips').appendChild(bt); });
  function setSub(k) {
    const h = S.heat; if (h.sub === k) return; h.sub = k; h.md.eps = SUB[k].eps; updateCtl();
  }
  $('#subChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); setSub(bt.dataset.v); });
  const setT = (v) => { S.heat.T = clamp(Math.round(v / 10) * 10, 50, 600); updateCtl(); };
  $('#sT').addEventListener('input', (e) => setT(+e.target.value));
  $('#tMinus').addEventListener('click', () => { Sound.tick(); setT(S.heat.T - 10); });
  $('#tPlus').addEventListener('click', () => { Sound.tick(); setT(S.heat.T + 10); });
  $('#bLines').addEventListener('click', () => { Sound.click(); S.heat.lines = !S.heat.lines; updateCtl(); });

  /* ================= ② 세 가지 힘 ================= */
  const fL = () => (PHONE ? Object.assign({}, RC.forces.L, { h: S.sub.forces === 'look' ? 860 : 604 }) : RC.forces.L);
  function lookRects(L) {
    if (PHONE) return { demo: { x: L.x + 10, y: L.y + 44, w: 444, h: 290 }, chart: { x: L.x + 10, y: L.y + 346, w: 444, h: 150 }, info: { x: L.x + 10, y: L.y + 508, w: 444, h: L.h - 518 } };
    return { demo: { x: L.x + 14, y: L.y + 44, w: 470, h: 284 }, chart: { x: L.x + 14, y: L.y + 340, w: 470, h: 148 }, info: { x: L.x + 500, y: L.y + 44, w: 262, h: L.h - 56 } };
  }
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
  const rad = (d) => d * Math.PI / 180;

  function drawStrength(r, f) {
    T(r.x + 4, r.y + 16, '분자 사이 힘의 세기 (크기감, kJ/mol · 로그 눈금)', 13, INK, 'left', 800);
    const rows = [['disp', '분산력', FI.disp.range, FI.disp.col], ['dip', '쌍극자–쌍극자', FI.dip.range, FI.dip.col], ['hb', '수소 결합', FI.hb.range, FI.hb.col], ['cov', '공유 결합(참고)', [150, 500], '#64748b']];
    const ax = r.x + 122, aw = r.w - 122 - 8, y0 = r.y + 28, rh = 24;
    const X = (v) => ax + (Math.log10(v) + 1) / 4 * aw;
    rows.forEach((q, i) => {
      const y = y0 + i * rh, on = q[0] === f;
      T(r.x + 4, y + 15, q[1], 13, on ? q[3] : MUTED, 'left', 800);
      D.roundRect(ax, y + 4, aw, 14, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const x1 = X(q[2][0]), x2 = X(q[2][1]);
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.45; D.roundRect(x1, y + 4, Math.max(8, x2 - x1), 14, 7); ctx.fillStyle = q[3]; ctx.fill(); ctx.restore();
      const txt = q[0] === 'cov' ? '약 150 ~ 500' : q[2][0] + ' ~ ' + q[2][1];
      ctx.save(); ctx.font = D.font(12.5, 800); const tw = ctx.measureText(txt).width; ctx.restore();
      if (x2 + 6 + tw < ax + aw) T(x2 + 6, y + 16, txt, 12.5, on ? INK : MUTED, 'left', 800); else T(x1 - 6, y + 16, txt, 12.5, on ? INK : MUTED, 'right', 800);
    });
    const ay = y0 + rows.length * rh + 4;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.stroke();
    [0.1, 1, 10, 100, 1000].forEach((v) => { const x = X(v); ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 5); ctx.stroke(); T(x, ay + 19, String(v), 12.5, MUTED, 'center', 700); });
  }

  function drawDisp(rc, t) {
    const F = S.forces, z = SZ[F.size];
    const r = F.rd, cy = rc.y + rc.h * 0.4, cxm = rc.x + rc.w / 2, x1 = cxm - (r + 20), x2 = cxm + (r + 20);
    const amp = r * 0.3, ph = t * 2.3, o1 = RM ? amp * 0.7 : amp * Math.sin(ph), o2 = o1 * 0.85;
    [[x1, o1, 0], [x2, o2, 1]].forEach(([cx, off, k]) => {
      const gr = ctx.createRadialGradient(cx + off, cy, r * 0.1, cx + off, cy, r);
      gr.addColorStop(0, 'rgba(56,103,244,.42)'); gr.addColorStop(1, 'rgba(56,103,244,.06)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx + off, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(56,103,244,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx + off, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < z.dots; i++) { const a = t * (1.4 + (i % 3) * 0.5) + i * 2.4 + k, rr = r * (0.35 + 0.5 * ((i * 37) % 10) / 10); D.sphere(cx + off + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, 3.4, '#9db4ff', { gloss: false }); }
      D.sphere(cx, cy, 9, '#475569', { gloss: false, text: '+', textScale: 1.2 });
    });
    // 부분 전하 이름표
    const big = Math.abs(o1) > amp * 0.35;
    if (big) {
      const s1 = o1 > 0 ? '−' : '+', s2 = o2 > 0 ? '+' : '−';
      const lab = (x, y, s) => D.label(x, y, 'δ' + s, { size: 14, bg: s === '+' ? '#e2464b' : '#3867f4', align: 'center' });
      lab(x1 + r * 0.62, cy - r - 16, s1); lab(x2 - r * 0.62, cy - r - 16, s2);
    }
    // 인력 화살표 (길이 = 상대 크기)
    const al = 18 + F.ad * 56, ay = cy + r + 30, act = Math.abs(o1) / amp;
    D.arrow(x1, ay, x1 + al, ay, { color: FI.disp.col, width: 3 + 2.5 * act, alpha: 0.5 + 0.5 * act });
    D.arrow(x2, ay, x2 - al, ay, { color: FI.disp.col, width: 3 + 2.5 * act, alpha: 0.5 + 0.5 * act });
    T(cxm, ay - 10, '분산력', 13.5, FI.disp.col, 'center', 800);
    T(cxm, ay + 22, '전자 구름이 쏠렸다 돌아오며 이웃에 반대 전하를 만들어요', 13, MUTED, 'center', 700);
    // 끓는점 칩
    ['he', 'ar', 'xe'].forEach((k, i) => {
      const w = (rc.w - 24) / 3, x = rc.x + 8 + i * (w + 4), y = rc.y + rc.h - 30, on = k === F.size;
      D.roundRect(x, y, w, 24, 12); ctx.fillStyle = on ? '#e6f7f6' : '#f1f5f9'; ctx.fill(); if (on) { ctx.strokeStyle = FI.disp.col; ctx.lineWidth = 1.8; ctx.stroke(); }
      T(x + w / 2, y + 17, SZ[k].nm + ' 끓는점 ' + sgn(SZ[k].bp) + ' °C', 12.5, on ? '#0b6d6c' : MUTED, 'center', 800);
    });
  }

  function dipPoles(cx, cy, a) { return { h: [cx + Math.cos(a) * -26, cy + Math.sin(a) * -26], cl: [cx + Math.cos(a) * 17, cy + Math.sin(a) * 17] }; }
  function dipCenters(rc) { const xs = [0.2, 0.5, 0.8]; return [[xs[0], 0.26], [xs[1], 0.26], [xs[2], 0.26], [xs[0], 0.6], [xs[1], 0.6], [xs[2], 0.6]].map((p) => [rc.x + rc.w * p[0], rc.y + rc.h * p[1]]); }
  const DIP_T = [0, 0, 0, Math.PI, Math.PI, Math.PI];
  function dipScatter() { S.forces.dipA = DIP_T.map(() => rnd(-3.1, 3.1)); }
  function drawDip(rc, t) {
    const F = S.forces, cs = dipCenters(rc), P = F.dipA.map((a, i) => dipPoles(cs[i][0], cs[i][1], a + (RM ? 0 : Math.sin(t * 2.1 + i * 1.3) * 0.07)));
    const err = F.dipA.map((a, i) => Math.abs(angDiff(a, DIP_T[i])));
    // 끌어당김 점선: 한 분자의 Cl(δ−)과 이웃 분자의 H(δ+)
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      if (i === j) continue;
      const a = P[i].cl, b = P[j].h, d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 128) continue;
      const al = clamp(1 - (err[i] + err[j]) / 1.4, 0, 1) * clamp(1.15 - (d - 60) / 90, 0.2, 1);
      if (al < 0.05) continue;
      ctx.save(); ctx.strokeStyle = C.rgba(FI.dip.col, 0.9 * al); ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 14; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      const p = P[i];
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.h[0], p.h[1]); ctx.lineTo(p.cl[0], p.cl[1]); ctx.stroke();
      D.sphere(p.cl[0], p.cl[1], 19, '#22b14c', { gloss: true });
      D.sphere(p.h[0], p.h[1], 10, '#f8fafc', { gloss: false, outline: '#94a3b8' });
      T(p.h[0], p.h[1] - 15, 'δ+', 13, BAD, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      T(p.cl[0], p.cl[1] - 24, 'δ−', 13, BLU, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    }
    const aligned = err.every((e) => e < 0.25);
    T(rc.x + rc.w / 2, rc.y + rc.h - 40, 'HCl: H쪽은 δ+, Cl쪽은 δ−인 극성 분자', 13.5, INK, 'center', 800);
    T(rc.x + rc.w / 2, rc.y + rc.h - 18, aligned ? '이웃의 δ+와 δ−가 마주 보도록 정렬되어 서로 끌어당겨요' : '방향이 제각각이면 인력이 약해요. 곧 정렬돼요', 13, aligned ? '#b45309' : MUTED, 'center', 700);
  }

  function hbMols(key, rc) {
    const def = MOL[key], lay = HBL[key];
    const pts = lay.pts.map((p) => [rc.x + rc.w * (0.08 + 0.84 * p[0] / 1), rc.y + rc.h * (0.1 + 0.62 * p[1])]);
    pts.forEach((p, i) => { p[0] = rc.x + rc.w * lay.pts[i][0]; });
    const ang = (a, b) => Math.atan2(pts[b][1] - pts[a][1], pts[b][0] - pts[a][0]);
    const accFrom = {}, donTo = {};
    lay.links.forEach(([i, j]) => { accFrom[j] = i; donTo[i] = j; });
    return pts.map((p, k) => {
      const m = { x: p[0], y: p[1], th: 0, don: -1, to: -1, def };
      if (accFrom[k] != null) m.th = ang(k, accFrom[k]) - rad(def.LP[0]); else if (donTo[k] != null) m.th = ang(k, donTo[k]) - rad(def.H[0]);
      if (donTo[k] != null) { const want = ang(k, donTo[k]); let bd = 9; def.H.forEach((h, hi) => { const d = Math.abs(angDiff(m.th + rad(h), want)); if (d < bd) { bd = d; m.don = hi; } }); m.to = donTo[k]; }
      return m;
    });
  }
  function drawHB(rc, t) {
    const key = S.forces.hb, def = MOL[key], mols = hbMols(key, rc);
    const BL = 34;
    const hpos = (m, hi) => [m.x + Math.cos(m.th + rad(def.H[hi])) * BL, m.y + Math.sin(m.th + rad(def.H[hi])) * BL];
    // 수소 결합 (분자 사이)
    let first = null;
    mols.forEach((m, k) => {
      if (m.don < 0) return;
      const h = hpos(m, m.don), tg = mols[m.to], dx = tg.x - h[0], dy = tg.y - h[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const ex = tg.x - ux * (def.R + 7), ey = tg.y - uy * (def.R + 7);
      const al = RM ? 0.9 : 0.55 + 0.45 * Math.sin(t * 5 + k * 1.7);
      ctx.save(); ctx.strokeStyle = C.rgba(BAD, al); ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 16; ctx.beginPath(); ctx.moveTo(h[0] + ux * 8, h[1] + uy * 8); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
      if (!first) first = { x: (h[0] + ex) / 2, y: Math.min(h[1], ey) - 30 };
    });
    mols.forEach((m, k) => {
      // 공유 결합 (분자 안)
      def.H.forEach((rel, hi) => {
        const h = hpos(m, hi);
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(h[0], h[1]); ctx.stroke();
      });
      // 비공유 전자쌍
      def.LP.forEach((rel) => {
        const a = m.th + rad(rel), px = m.x + Math.cos(a) * (def.R + 9), py = m.y + Math.sin(a) * (def.R + 9), nx = -Math.sin(a) * 3.6, ny = Math.cos(a) * 3.6;
        D.sphere(px + nx, py + ny, 2.6, '#334155', { gloss: false }); D.sphere(px - nx, py - ny, 2.6, '#334155', { gloss: false });
      });
      D.sphere(m.x, m.y, def.R, def.col, { gloss: true, text: def.heavy, textScale: 1.0 });
      def.H.forEach((rel, hi) => { const h = hpos(m, hi); D.sphere(h[0], h[1], 9, '#f8fafc', { gloss: false, outline: '#94a3b8' }); });
      if (m.don >= 0) { const h = hpos(m, m.don); T(h[0], h[1] - 15, 'δ+', 13, BAD, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
      if (k > 0) T(m.x, m.y - def.R - 22, 'δ−', 13, BLU, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    });
    if (first) D.label(first.x, first.y, '수소 결합 (분자 사이)', { size: 12.5, bg: BAD, align: 'center' });
    const m0 = mols[0], h0 = hpos(m0, m0.don >= 0 ? (m0.don + 1) % def.H.length : 0);
    const cvx = (m0.x + h0[0]) / 2, cvy = (m0.y + h0[1]) / 2;
    D.label(Math.max(rc.x + 70, Math.min(rc.x + rc.w - 70, cvx - 38)), Math.min(rc.y + rc.h - 70, cvy + 44), '공유 결합 (분자 안)', { size: 12.5, bg: '#64748b', align: 'center' });
    T(rc.x + rc.w / 2, rc.y + rc.h - 40, 'H가 N·O·F에 결합 + 이웃 분자의 N·O·F 비공유 전자쌍(••)', 13.5, INK, 'center', 800);
    T(rc.x + rc.w / 2, rc.y + rc.h - 18, key === 'h2o' ? 'H₂O: 분자 하나가 수소 결합을 최대 2개까지 만들 수 있어요' : key === 'hf' ? 'HF: 분자 하나가 수소 결합 1개 (H가 1개뿐이에요)' : 'NH₃: 비공유 전자쌍이 1개뿐이라 분자당 수소 결합은 1개 정도예요', 13, MUTED, 'center', 700);
  }
  function drawLook(L, t) {
    const F = S.forces, R0 = lookRects(L), f = FI[F.f];
    D.roundRect(R0.demo.x, R0.demo.y, R0.demo.w, R0.demo.h, 12); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(R0.demo.x, R0.demo.y, R0.demo.w, R0.demo.h); ctx.clip();
    if (F.f === 'disp') drawDisp(R0.demo, t); else if (F.f === 'dip') drawDip(R0.demo, t); else drawHB(R0.demo, t);
    ctx.restore();
    T(R0.demo.x + 12, R0.demo.y + 22, '🔍 분자 돋보기', 13.5, f.col, 'left', 800);
    drawStrength(R0.chart, F.f);
    const I = R0.info;
    D.roundRect(I.x, I.y, I.w, I.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = f.col; ctx.lineWidth = 2.2; ctx.stroke();
    T(I.x + 14, I.y + 28, f.full, 16, f.col, 'left', 800);
    let y = I.y + 52; y += textBlock(I.x + 14, y, I.w - 28, f.txt, 13.5, INK, 19.5, 700) + 8;
    y += textBlock(I.x + 14, y, I.w - 28, '예: ' + f.ex, 13.5, MUTED, 19, 800) + 4;
    const extra = F.f === 'disp' ? '모든 분자 사이에 있어요. 큰 분자일수록 커요.' : F.f === 'dip' ? '무극성 분자에는 없어요. (분산력은 늘 함께 있어요)' : '분자 간 힘 중 가장 강해요. 공유 결합보다는 훨씬 약해요.';
    y += textBlock(I.x + 14, y, I.w - 28, extra, 13.5, f.col, 19, 800) + 10;
    const bn = F.f === 'disp' ? '끓는점과의 관계: 전자가 많을수록 분산력↑ → 끓는점↑' : F.f === 'dip' ? '끓는점과의 관계: 분자량이 비슷하면 극성 분자의 끓는점이 더 높은 경향' : '끓는점과의 관계: 수소 결합이 있으면 분자량이 비슷한 분자보다 끓는점이 훨씬 높아요 (H₂O 100 °C, H₂S −60 °C)';
    const bh = PHONE ? 62 : 80;
    if (y + bh < I.y + I.h) { D.roundRect(I.x + 10, I.y + I.h - bh - 10, I.w - 20, bh, 10); ctx.fillStyle = C.rgba(f.col, 0.1); ctx.fill(); textBlock(I.x + 20, I.y + I.h - bh + 12, I.w - 40, bn, 13, INK, 18, 800); }
  }

  /* ---------- 분류 카드 ---------- */
  const CW = PHONE ? 66 : 72, CH = PHONE ? 44 : 46;
  const sortRC = () => {
    const L = fL();
    const bw = PHONE ? 148 : 240, gap = PHONE ? 6 : 12, bh = PHONE ? 262 : 206, bx0 = L.x + (L.w - (3 * bw + 2 * gap)) / 2, by = L.y + 44;
    const bins = [0, 1, 2].map((i) => ({ x: bx0 + i * (bw + gap), y: by, w: bw, h: bh }));
    const ty = by + bh + (PHONE ? 38 : 40);
    return { L, bins, trayY: ty, bh };
  };
  const homeOf = (idx) => {
    const rc = sortRC();
    if (PHONE) { const x0 = rc.L.x + (rc.L.w - (4 * CW + 3 * 8)) / 2; return [x0 + (idx % 4) * (CW + 8), rc.trayY + Math.floor(idx / 4) * (CH + 8)]; }
    const x0 = rc.L.x + (rc.L.w - (8 * CW + 7 * 8)) / 2; return [x0 + idx * (CW + 8), rc.trayY];
  };
  function slotOf(binIdx, k) {
    const rc = sortRC(), b = rc.bins[binIdx], cols = PHONE ? 2 : 3, tw = cols * CW + (cols - 1) * 6, x0 = b.x + (b.w - tw) / 2;
    return [x0 + (k % cols) * (CW + 6), b.y + 58 + Math.floor(k / cols) * (CH + 6)];
  }
  function cardsInit() {
    S.forces.cards = CARDS.map((c, i) => { const h = homeOf(i); return { id: c.id, f: c.f, hint: c.hint, ans: c.ans, x: h[0], y: h[1], tx: h[0], ty: h[1], bin: null, seq: 0, lift: 0, shake: 0, flag: false, drag: false }; });
    S.forces.sel = null; S.forces.wrongNote = '';
  }
  function cardsLayout() {
    const F = S.forces;
    for (let b = 0; b < 3; b++) {
      F.cards.filter((c) => c.bin === b).sort((a, c) => a.seq - c.seq).forEach((c, k) => { if (!c.drag) { const s = slotOf(b, k); c.tx = s[0]; c.ty = s[1]; } });
    }
    F.cards.forEach((c, i) => { if (c.bin === null && !c.drag) { const h = homeOf(i); c.tx = h[0]; c.ty = h[1]; } });
  }
  function placeCard(c, b) {
    const F = S.forces; c.bin = b; c.seq = ++F.seq; c.flag = false; cardsLayout();
    const rc = sortRC(); if (b !== null && !RM) parts.burst(rc.bins[b].x + rc.bins[b].w / 2, rc.bins[b].y + 40, { count: 6, speed: 70, life: 0.45, colors: [BINS[b].col], gravity: 100, size: 3 });
    updateCtl();
  }
  function stepCards(dt) {
    S.forces.cards.forEach((c) => {
      if (!c.drag) { c.x = SciSim.approach(c.x, c.tx, dt, 12); c.y = SciSim.approach(c.y, c.ty, dt, 12); }
      c.lift = SciSim.approach(c.lift, c.drag || S.forces.sel === c.id ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 2.5);
    });
  }
  function drawCard(c) {
    const sx = c.shake > 0 ? Math.sin(c.shake * 40) * 4 * c.shake : 0, lf = c.lift;
    ctx.save(); ctx.translate(c.x + CW / 2 + sx, c.y + CH / 2 - lf * 5); const sc = 1 + lf * 0.07; ctx.scale(sc, sc);
    D.shadow(() => { D.roundRect(-CW / 2, -CH / 2, CW, CH, 11); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + lf * 10, y: 2 + lf * 5 });
    D.roundRect(-CW / 2, -CH / 2, CW, CH, 11); ctx.strokeStyle = c.flag ? BAD : S.forces.sel === c.id ? PUR : c.bin !== null ? BINS[c.bin].col : '#c9d2df'; ctx.lineWidth = c.flag || S.forces.sel === c.id ? 3 : 2; ctx.stroke();
    T(0, 6, c.f, 18, INK, 'center', 800);
    ctx.restore();
  }
  function drawSort(L, t) {
    const F = S.forces, rc = sortRC();
    rc.bins.forEach((b, i) => {
      const B = BINS[i];
      D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(B.col, 0.08); ctx.fill(); ctx.strokeStyle = B.col; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(b.x + b.w / 2, b.y + 24, (i + 1 === 1 ? '' : '') + B.nm, PHONE ? 14.5 : 16, B.col, 'center', 800);
      textBlock(b.x + b.w / 2, b.y + 44, b.w - 12, B.sub, 12.5, MUTED, 15, 700, 'center');
      if (F.sel !== null && !F.cards.some((c) => c.drag)) { const a = 0.35 + 0.25 * Math.sin(t * 5); ctx.save(); ctx.strokeStyle = C.rgba(B.col, a); ctx.lineWidth = 4; D.roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 16); ctx.stroke(); ctx.restore(); }
    });
    T(L.x + 16, rc.trayY - 12, '🗂️ 분자 카드 (끌어서 상자에 놓아요)', 13.5, INK, 'left', 800);
    const placed = F.cards.filter((c) => c.bin !== null).length;
    T(L.x + L.w - 16, rc.trayY - 12, '분류한 카드 ' + placed + ' / 8', 13.5, placed === 8 ? '#14803f' : MUTED, 'right', 800);
    // 카드 (끌고 있는 카드가 맨 위)
    F.cards.filter((c) => !c.drag).forEach(drawCard); F.cards.filter((c) => c.drag).forEach(drawCard);
    // 설명
    const cur = F.cards.find((c) => c.drag) || F.cards.find((c) => c.id === F.sel);
    const ty0 = rc.trayY + (PHONE ? 2 * CH + 22 : CH + 26);
    D.roundRect(L.x + 12, ty0, L.w - 24, 24, 12); ctx.fillStyle = cur ? '#f7f3ff' : 'transparent'; ctx.fill();
    if (cur) T(L.x + 22, ty0 + 17, cur.f + ' · ' + cur.hint, 13.5, PUR, 'left', 800);
    let y = ty0 + 44;
    y += textBlock(L.x + 16, y, L.w - 32, '분류 순서  ① N·O·F에 직접 결합한 H가 있다 → 수소 결합\n② 없지만 극성 분자다 → 쌍극자–쌍극자 힘\n③ 무극성 분자다 → 분산력', 13, INK, 19, 800) + 4;
    textBlock(L.x + 16, y, L.w - 32, '분산력은 모든 분자 사이에 작용해요. 여기서는 그 분자에서 가장 두드러지는 힘을 골라요.', 13, MUTED, 18, 700);
    if (F.wrongNote) { const wy = ty0 + 14 + (PHONE ? 0 : 0); void wy; }
  }

  /* ---------- ② 컨트롤 ---------- */
  FK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.textContent = FI[k].name; $('#fChips').appendChild(bt); });
  function setForce(k) { const F = S.forces; if (F.f === k && S.mode === 'forces') { updateCtl(); return; } F.f = k; F.vt = 0; S.fade = Math.max(S.fade, 0.5); if (k === 'dip') dipScatter(); updateCtl(); }
  $('#fChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); setForce(bt.dataset.v); });
  $('#fSub').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.sub.forces = bt.dataset.v; S.fade = 0.6; if (bt.dataset.v === 'look') { S.forces.vt = 0; if (S.forces.f === 'dip') dipScatter(); } cardsLayout(); updateCtl(); });
  $('#szSeg').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.forces.size = bt.dataset.v; updateCtl(); });
  $('#hbSeg').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.forces.hb = bt.dataset.v; S.fade = 0.4; updateCtl(); });
  $('#bScatter').addEventListener('click', () => { Sound.click(); dipScatter(); });
  $('#bCardsReset').addEventListener('click', () => { Sound.click(); cardsInit(); cardsLayout(); updateCtl(); });

  /* ================= ③ 끓는점 추론 ================= */
  const bL = () => (PHONE ? Object.assign({}, RC.bp.L, { h: S.sub.bp === 'graph' ? 820 : 560 }) : RC.bp.L);
  function bpRects(L) {
    if (PHONE) return { plot: { x: L.x + 60, y: L.y + 76, w: 388, h: 350 }, info: { x: L.x + 10, y: L.y + 472, w: 444, h: L.h - 482 } };
    return { plot: { x: L.x + 72, y: L.y + 76, w: 440, h: 366 }, info: { x: L.x + 540, y: L.y + 44, w: 224, h: L.h - 56 } };
  }
  const Y_TOP = 120, Y_BOT = -180;
  function bpPoints() {
    const L = bL(), P = bpRects(L).plot, out = [];
    GROUPS.forEach((g, gi) => {
      for (let i = 0; i < 4; i++) {
        const ap = S.bp.ap[g];
        out.push({ g, i, gi, ap, x: P.x + 42 + i * (P.w - 84) / 3 + (gi - 1.5) * 11, y: P.y + (Y_TOP - BPD[g].v[i]) / (Y_TOP - Y_BOT) * P.h - (1 - ap) * 36, v: BPD[g].v[i] });
      }
    });
    return out;
  }
  const ptKey = (g, i) => g + '-' + i;
  function drawGraph(L, t) {
    const B = S.bp, R0 = bpRects(L), P = R0.plot;
    T(L.x + 16, L.y + 28, '14 ~ 17족 수소 화합물의 끓는점', 14.5, INK, 'left', 800);
    // 범례
    GROUPS.forEach((g, i) => { const x = L.x + (PHONE ? 16 : 16) + i * (PHONE ? 78 : 92), on = B.groups[g]; ctx.save(); ctx.globalAlpha = on ? 1 : 0.35; D.sphere(x + 6, L.y + 48, 6, BPD[g].col, { gloss: false }); T(x + 17, L.y + 53, g + '족', 13.5, INK, 'left', 800); ctx.restore(); });
    D.roundRect(P.x, P.y, P.w, P.h, 8); ctx.fillStyle = '#fbfcff'; ctx.fill();
    for (let v = -150; v <= 100; v += 50) {
      const y = P.y + (Y_TOP - v) / (Y_TOP - Y_BOT) * P.h;
      ctx.strokeStyle = v === 0 ? '#8a95a8' : '#e3e8f2'; ctx.lineWidth = v === 0 ? 1.8 : 1; ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke();
      T(P.x - 8, y + 4.5, sgn(v), 12.5, MUTED, 'right', 700);
    }
    T(P.x - 8, P.y - 10, '끓는점(°C)', 12.5, MUTED, 'right', 800);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; D.roundRect(P.x, P.y, P.w, P.h, 8); ctx.stroke();
    for (let i = 0; i < 4; i++) { const x = P.x + 42 + i * (P.w - 84) / 3; ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); T(x, P.y + P.h + 20, (i + 2) + '주기', 13, MUTED, 'center', 800); }
    T(P.x + P.w / 2, P.y + P.h + 40, '중심 원자의 주기 (오른쪽일수록 분자량이 커요)', 12.5, MUTED, 'center', 700);
    const pts = bpPoints();
    GROUPS.forEach((g) => {
      const ap = B.ap[g]; if (ap < 0.02) return;
      const gp = pts.filter((p) => p.g === g);
      ctx.save(); ctx.globalAlpha = Math.min(1, ap); ctx.strokeStyle = BPD[g].col; ctx.lineWidth = 2.6; ctx.beginPath(); gp.forEach((p, k) => { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    });
    pts.forEach((p) => {
      if (p.ap < 0.02) return;
      const key = ptKey(p.g, p.i), sel = B.sel && B.sel.g === p.g && B.sel.i === p.i, fnd = B.found[key], sh = B.ptShake === key ? Math.sin(t * 60) * 3 : 0;
      ctx.save(); ctx.globalAlpha = Math.min(1, p.ap);
      if (fnd) D.glow(p.x, p.y, 20, BAD, 0.55);
      D.sphere(p.x + sh, p.y, sel ? 8.5 : 6.5, BPD[p.g].col, { gloss: true, outline: sel ? INK : '#fff', outlineWidth: sel ? 2.2 : 1.6 });
      if (sel) { ctx.strokeStyle = C.rgba(INK, 0.5 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, TAU); ctx.stroke(); }
      if (fnd || sel) { const txt = BPD[p.g].nm[p.i] + ' ' + sgn(p.v); const lx = p.i >= 3 ? p.x - 14 : p.x + 14; T(lx, p.y - 11, txt, 12.5, INK, p.i >= 3 ? 'right' : 'left', 800, { stroke: 'rgba(255,255,255,.95)', strokeWidth: 3.5 }); }
      ctx.restore();
    });
    // 정보 칸
    const I = R0.info;
    D.roundRect(I.x, I.y, I.w, I.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    const found = Object.keys(B.found).length;
    if (!B.sel) {
      T(I.x + 14, I.y + 28, '점을 눌러 보세요', 15, INK, 'left', 800);
      textBlock(I.x + 14, I.y + 54, I.w - 28, '족을 바꾸어 가며 같은 족에서 흐름을 벗어난 점을 찾아요.\n\n찾은 비정상 점: ' + found + ' / 3', 13.5, MUTED, 19.5, 700);
    } else {
      const g = B.sel.g, i = B.sel.i, nm = BPD[g].nm[i];
      T(I.x + 14, I.y + 30, nm, 20, BPD[g].col, 'left', 800);
      T(I.x + 14, I.y + 54, g + '족 · ' + (i + 2) + '주기', 13.5, MUTED, 'left', 700);
      T(I.x + 14, I.y + 78, '끓는점 ' + sgn(BPD[g].v[i]) + ' °C', 15, INK, 'left', 800);
      T(I.x + 14, I.y + 100, '분자량 ' + BPD[g].M[i], 15, INK, 'left', 800);
      const isA = isAnom(g, i), fd = B.found[ptKey(g, i)];
      const msg = B.msg || '';
      textBlock(I.x + 14, I.y + 128, I.w - 28, msg, 13.5, fd ? '#b91c1c' : MUTED, 19.5, 800);
      void isA;
    }
    T(I.x + 14, I.y + I.h - 12, '찾은 비정상 점 ' + found + ' / 3', 13.5, found >= 3 ? '#14803f' : MUTED, 'left', 800);
  }
  function tblRC(L) {
    const x0 = L.x + 14, c0 = PHONE ? 70 : 104, cw = (L.w - 28 - c0) / 3, hh = PHONE ? 132 : 96, rh = PHONE ? 66 : 72, y0 = L.y + 46;
    return { x0, c0, cw, hh, rh, y0 };
  }
  function cellRect(k, L) { const g = tblRC(L), r = Math.floor(k / 3), c = k % 3; return { x: g.x0 + g.c0 + c * g.cw + 4, y: g.y0 + g.hh + r * g.rh + 4, w: g.cw - 8, h: g.rh - 8 }; }
  const SYMC = ['#14a058', '#d97706', '#e2464b'];
  function drawTable(L, t) {
    const B = S.bp, g = tblRC(L);
    T(L.x + 16, L.y + 28, '📋 요인 검증표: 어떤 요인이 어떤 관찰을 설명할까요?', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    for (let c = 0; c < 3; c++) {
      const x = g.x0 + g.c0 + c * g.cw + 4;
      D.roundRect(x, g.y0, g.cw - 8, g.hh - 8, 10); ctx.fillStyle = '#f7f3ff'; ctx.fill();
      textBlock(x + 8, g.y0 + 22, g.cw - 24, TBL_COLS[c], PHONE ? 12.5 : 13.5, INK, PHONE ? 16.5 : 18.5, 800);
    }
    for (let r = 0; r < 3; r++) {
      const y = g.y0 + g.hh + r * g.rh + 4;
      D.roundRect(g.x0, y, g.c0 - 6, g.rh - 8, 10); ctx.fillStyle = '#eef1f7'; ctx.fill();
      T(g.x0 + (g.c0 - 6) / 2, y + (g.rh - 8) / 2 + 5, TBL_ROWS[r], PHONE ? 13 : 15, INK, 'center', 800);
    }
    for (let k = 0; k < 9; k++) {
      const q = cellRect(k, L), v = B.tbl[k], sh = B.shake[k] > 0 ? Math.sin(B.shake[k] * 40) * 4 * B.shake[k] : 0, fl = B.flag[k];
      ctx.save(); ctx.translate(sh, 0);
      D.roundRect(q.x, q.y, q.w, q.h, 12); ctx.fillStyle = v === null ? '#fff' : C.rgba(SYMC[v], 0.1); ctx.fill(); ctx.strokeStyle = fl ? BAD : v === null ? '#c9d2df' : SYMC[v]; ctx.lineWidth = fl ? 3.2 : 2.2; if (v === null) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (v !== null) T(q.x + q.w / 2, q.y + q.h / 2 + 9, TBL_SYM[v + 1], 28, SYMC[v], 'center', 800); else T(q.x + q.w / 2, q.y + q.h / 2 + 5, '눌러 고르기', 12.5, '#9aa5b6', 'center', 700);
      ctx.restore();
    }
    const by = g.y0 + g.hh + 3 * g.rh + 14;
    const cs = B.cellSel;
    if (cs !== null && cs !== undefined && B.tbl[cs] === TBL_ANS[Math.floor(cs / 3)][cs % 3]) {
      const r = Math.floor(cs / 3), c = cs % 3;
      D.roundRect(L.x + 14, by, L.w - 28, PHONE ? 78 : 62, 12); ctx.fillStyle = '#e6f7ee'; ctx.fill();
      textBlock(L.x + 26, by + 22, L.w - 52, '✅ ' + TBL_ROWS[r] + ' × ' + TBL_COLS[c].slice(0, 3) + ': ' + TBL_EXP[r][c], 13.5, '#14803f', 19, 800);
    } else {
      textBlock(L.x + 16, by + 14, L.w - 32, '○ 설명할 수 있다 · △ 일부만 설명한다 · × 설명할 수 없다. 앞에서 본 그래프를 떠올리며 9칸을 모두 채워요.', 13.5, MUTED, 19, 700);
    }
    void t;
  }
  function drawBP(t) {
    const L = bL();
    T(14, 26, MODE_LABEL.bp, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    if (S.sub.bp === 'graph') drawGraph(L, t); else drawTable(L, t);
  }
  function stepBP(dt) {
    const B = S.bp; GROUPS.forEach((g) => { B.ap[g] = SciSim.approach(B.ap[g], B.groups[g] ? 1 : 0, dt, 4); if (Math.abs(B.ap[g] - (B.groups[g] ? 1 : 0)) < 0.01) B.ap[g] = B.groups[g] ? 1 : 0; });
    for (const k in B.shake) { B.shake[k] = Math.max(0, B.shake[k] - dt * 2.5); }
    if (B.ptShakeT > 0) { B.ptShakeT -= dt; if (B.ptShakeT <= 0) B.ptShake = null; }
  }
  GROUPS.forEach((g) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = g; bt.innerHTML = '<span style="color:' + BPD[g].col + '">●</span> ' + g + '족'; $('#gChips').appendChild(bt); });
  { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = 'all'; bt.textContent = '모두 보기'; $('#gChips').appendChild(bt); }
  $('#gChips').addEventListener('click', (e) => {
    const bt = e.target.closest('button'); if (!bt) return; Sound.click();
    if (bt.dataset.v === 'all') GROUPS.forEach((g) => { S.bp.groups[g] = true; });
    else { const g = +bt.dataset.v; S.bp.groups[g] = !S.bp.groups[g]; }
    updateCtl();
  });
  $('#bSub').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.sub.bp = bt.dataset.v; S.fade = 0.6; updateCtl(); });
  $('#bTblReset').addEventListener('click', () => { Sound.click(); S.bp.tbl = S.bp.tbl.map(() => null); S.bp.flag = {}; S.bp.cellSel = null; updateCtl(); });
  function bpTap(p) {
    const B = S.bp, L = bL();
    if (S.sub.bp === 'graph') {
      let best = null, bd = 17;
      bpPoints().forEach((q) => { if (q.ap < 0.5) return; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } });
      if (!best) return false;
      Sound.click(); B.sel = { g: best.g, i: best.i }; const key = ptKey(best.g, best.i);
      if (isAnom(best.g, best.i)) {
        if (!B.found[key]) { B.found[key] = true; Sound.success(); if (!RM) parts.burst(best.x, best.y, { count: 14, speed: 150, life: 0.7, colors: [BAD, '#f59e0b', '#fff'], gravity: 160 }); }
        B.msg = best.g + '족에서 분자량이 가장 작은데도 끓는점이 가장 높아요. 분자량으로는 설명할 수 없는 비정상 점이에요!\n' + ANOM_NOTE[best.g];
      } else {
        B.msg = best.g === 14 ? '14족은 주기가 커질수록(분자량이 클수록) 끓는점이 올라가는 흐름이에요.' : '이 점은 같은 족의 흐름을 따라가요. 비정상 점이 아니에요.';
        B.ptShake = key; B.ptShakeT = 0.3; Sound.fail();
      }
      updateCtl(); return true;
    }
    for (let k = 0; k < 9; k++) {
      const q = cellRect(k, L);
      if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) {
        Sound.click(); const v = B.tbl[k]; B.tbl[k] = v === null ? 0 : v === 2 ? null : v + 1; B.flag[k] = false; B.cellSel = k; updateCtl(); return true;
      }
    }
    return false;
  }

  /* ================= ④ 순서 예측 ================= */
  const PW = 15, PH = 17, PSC = PHONE ? 12.5 : 14;
  const bpK = (o) => o.bp + 273;
  function predSetup(q) {
    const P = S.pred, pr = PAIRS[q];
    const ta = bpK(pr.a), tb = bpK(pr.b);
    P.q = q; P.Tlo = Math.max(40, Math.min(ta, tb) - 60); P.Thi = Math.max(ta, tb) + 50;
    P.mdA = makeMD(30, PW, PH); P.mdB = makeMD(30, PW, PH);
    const done = P.res[q] !== null;
    P.ht = done ? 1 : 0; P.ph = done ? 'result' : 'pick'; P.T = done ? P.Thi : P.Tlo; P.first = null; P.st = [0, 0];
    predApply(P.mdA, ta, P.T); predApply(P.mdB, tb, P.T); mdWarm(P.mdA, 25); mdWarm(P.mdB, 25);
    P.boil = [P.T >= ta, P.T >= tb];
    if (P.boil[0] || P.boil[1]) P.first = ta < tb ? 0 : 1;
    updateCtl();
  }
  function predApply(md, Tb, TK) {
    const g = sm((TK - (Tb - 10)) / 20);
    md.eps = 1.0 * (1 - g) + 0.04 * g; md.kT = Math.max(0.06, 0.42 * TK / Tb) + 0.45 * g;
  }
  function predHeatStart() {
    const P = S.pred; if (P.pick[P.q] === null || P.ph !== 'pick') return;
    Sound.click(); P.ph = 'heat'; P.ht = 0; P.T = P.Tlo; updateCtl();
  }
  function stepPred(dt) {
    const P = S.pred; if (!P.mdA) return;
    const pr = PAIRS[P.q], ta = bpK(pr.a), tb = bpK(pr.b);
    if (P.ph === 'heat') {
      P.ht = Math.min(1, P.ht + dt / (RM ? 4 : 10)); P.T = P.Tlo + (P.Thi - P.Tlo) * P.ht;
      const b0 = P.T >= ta, b1 = P.T >= tb;
      if (b0 && !P.boil[0]) { P.boil[0] = true; if (P.first === null) P.first = 0; predBoilFx(0); }
      if (b1 && !P.boil[1]) { P.boil[1] = true; if (P.first === null) P.first = 1; predBoilFx(1); }
      if (P.ht >= 1) {
        P.ph = 'result';
        const hiIs = pr.hi === 'a' ? 0 : 1, pickIs = P.pick[P.q];
        P.res[P.q] = pickIs === hiIs; Sound[P.res[P.q] ? 'success' : 'fail']();
        if (P.res[P.q] && !RM) { const bx = predBoxes()[hiIs]; parts.burst(bx.x + bx.w / 2, bx.y + 30, { count: 18, speed: 170, life: 0.9 }); }
        updateCtl();
      }
    }
    predApply(P.mdA, ta, P.T); predApply(P.mdB, tb, P.T);
    mdAdvance(P.mdA, dt); mdAdvance(P.mdB, dt);
    P.st = [SciSim.approach(P.st[0], P.boil[0] ? 1 : 0, dt, 4), SciSim.approach(P.st[1], P.boil[1] ? 1 : 0, dt, 4)];
  }
  function predBoxes() {
    const L = RC.pred.L, w = PW * PSC, h = PH * PSC;
    if (PHONE) { const y = L.y + 136; return [{ x: L.x + 8 + (224 - w) / 2, y, w, h }, { x: L.x + 232 + (224 - w) / 2, y, w, h }]; }
    const y = L.y + 120; return [{ x: L.x + 14 + 34, y, w, h }, { x: L.x + L.w - 14 - 34 - w, y, w, h }];
  }
  function predBoilFx(i) {
    const bx = predBoxes()[i]; Sound.tick();
    if (!RM) parts.burst(bx.x + bx.w / 2, bx.y + bx.h - 24, { count: 12, speed: 120, life: 0.8, shape: 'bubble', colors: ['#7cc4ff'], gravity: -80, size: 5 });
  }
  function drawBox2(b, md, color, boilK) {
    ctx.fillStyle = 'rgba(235,242,255,.75)'; D.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    for (let i = 0; i < md.N; i++) bentMol(b.x + md.x[i] * PSC, b.y + md.y[i] * PSC, md.ang[i], PSC / 15 * 1.12, color);
    ctx.restore();
    ctx.strokeStyle = boilK > 0.5 ? '#2563eb' : '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(b.x, b.y, b.w, b.h, 8); ctx.stroke();
  }
  function drawPred(t) {
    const L = RC.pred.L, P = S.pred, pr = PAIRS[P.q], bx = predBoxes(), res = P.res[P.q], done = P.ph === 'result';
    T(14, 26, MODE_LABEL.pred, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 16, L.y + 28, '문제 ' + (P.q + 1) + ' / 6 · 끓는점이 더 높은 쪽은 어느 쪽일까요?', PHONE ? 14 : 15.5, INK, 'left', 800);
    const cols = ['#8b5cf6', '#e2464b'], sides = [pr.a, pr.b];
    const cw = PHONE ? 224 : 372;
    [0, 1].forEach((i) => {
      const s = sides[i], x = PHONE ? L.x + 8 + i * 224 : L.x + 14 + i * (L.w - 28 - cw), y = L.y + 44, ch = PHONE ? 84 : 66, picked = P.pick[P.q] === (i === 0 ? 0 : 1);
      D.roundRect(x + 4, y, cw - 8, ch, 12); ctx.fillStyle = picked ? '#f3ecff' : '#fff'; ctx.fill(); ctx.strokeStyle = picked ? PUR : '#c9d2df'; ctx.lineWidth = picked ? 3 : 2; ctx.stroke();
      T(x + 14, y + 26, s.f, PHONE ? 19 : 21, cols[i], 'left', 800);
      T(x + cw - 14, y + 26, s.nm, PHONE ? 13.5 : 14.5, INK, 'right', 800);
      T(x + 14, y + 48, 'M = ' + s.M, 13.5, MUTED, 'left', 800);
      if (PHONE) textBlock(x + 14, y + 66, cw - 28, s.tag, 12.5, MUTED, 15, 700); else T(x + cw - 14, y + 48, s.tag, 13, MUTED, 'right', 700);
      if (picked) D.check(x + 10, y + 6, 11, 1, { color: PUR });
      if (done) T(x + 14, y + ch - 10, '끓는점 ' + sgn(s.bp) + ' °C', 13.5, (pr.hi === 'a') === (i === 0) ? '#14803f' : MUTED, 'left', 800);
    });
    drawBox2(bx[0], P.mdA, cols[0], P.st[0]); drawBox2(bx[1], P.mdB, cols[1], P.st[1]);
    [0, 1].forEach((i) => {
      const b = bx[i], on = P.boil[i], first = P.first === i && (P.ph !== 'pick'), cy = b.y + b.h + 10, w = Math.min(b.w, 190);
      D.roundRect(b.x + (b.w - w) / 2, cy, w, 28, 14); ctx.fillStyle = on ? '#e8effc' : '#e6f7ee'; ctx.fill(); ctx.strokeStyle = on ? BLU : GOOD; ctx.lineWidth = 1.8; ctx.stroke();
      T(b.x + b.w / 2, cy + 19, on ? (first ? '① 먼저 끓었어요!' : '② 이제 끓어요') : '액체 · 모여 있어요', 13.5, on ? '#2548b8' : '#14803f', 'center', 800);
    });
    // 온도계
    const Tc = P.T - 273;
    if (!PHONE) {
      const tx = L.x + L.w / 2 - 11, ty = L.y + 156, th = 190, tw = 22;
      T(L.x + L.w / 2, ty - 12, sgn(Math.round(Tc)) + ' °C', 17, INK, 'center', 800);
      D.roundRect(tx, ty, tw, th, 11); ctx.fillStyle = '#eef1f7'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
      const lvl = clamp((P.T - P.Tlo) / (P.Thi - P.Tlo), 0, 1);
      ctx.save(); D.roundRect(tx, ty, tw, th, 11); ctx.clip(); const gr = ctx.createLinearGradient(0, ty + th, 0, ty); gr.addColorStop(0, '#3867f4'); gr.addColorStop(1, '#e2464b'); ctx.fillStyle = gr; ctx.fillRect(tx + 3, ty + th - th * lvl, tw - 6, th * lvl + 2); ctx.restore();
      D.sphere(tx + tw / 2, ty + th + 12, 14, '#e2464b', { gloss: true });
      [pr.a, pr.b].forEach((s, i) => {
        if (!P.boil[i]) return;
        const yy = ty + th - th * clamp((bpK(s) - P.Tlo) / (P.Thi - P.Tlo), 0, 1);
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(i === 0 ? tx - 8 : tx + tw, yy); ctx.lineTo(i === 0 ? tx + tw / 2 : tx + tw + 8, yy); ctx.stroke();
        T(i === 0 ? tx - 12 : tx + tw + 12, yy + 4.5, sgn(s.bp) + ' °C', 12.5, cols[i], i === 0 ? 'right' : 'left', 800);
      });
    } else {
      const tx = L.x + 24, ty = L.y + 420, tw = L.w - 48, th = 22;
      T(L.x + L.w / 2, ty - 12, '온도 ' + sgn(Math.round(Tc)) + ' °C', 16, INK, 'center', 800);
      D.roundRect(tx, ty, tw, th, 11); ctx.fillStyle = '#eef1f7'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
      const lvl = clamp((P.T - P.Tlo) / (P.Thi - P.Tlo), 0, 1);
      ctx.save(); D.roundRect(tx, ty, tw, th, 11); ctx.clip(); const gr = ctx.createLinearGradient(tx, 0, tx + tw, 0); gr.addColorStop(0, '#3867f4'); gr.addColorStop(1, '#e2464b'); ctx.fillStyle = gr; ctx.fillRect(tx, ty + 3, tw * lvl, th - 6); ctx.restore();
      [pr.a, pr.b].forEach((s, i) => {
        if (!P.boil[i]) return;
        const xx = tx + tw * clamp((bpK(s) - P.Tlo) / (P.Thi - P.Tlo), 0, 1);
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xx, ty - 4); ctx.lineTo(xx, ty + th + 6); ctx.stroke();
        T(clamp(xx, tx + 34, tx + tw - 34), ty + th + 24 + i * 0, sgn(s.bp) + ' °C', 12.5, cols[i], 'center', 800);
      });
    }
    // 결과 · 안내
    const ry = PHONE ? L.y + 500 : L.y + bx[0].y - L.y + bx[0].h + 56;
    if (done) {
      const ok = res;
      D.roundRect(L.x + 14, ry - 10, L.w - 28, PHONE ? 130 : 84, 12); ctx.fillStyle = ok ? '#e6f7ee' : '#fdecec'; ctx.fill();
      T(L.x + 26, ry + 12, ok ? '🎉 맞았어요! 먼저 끓은 쪽이 끓는점이 낮은 쪽이에요.' : '아쉬워요. 먼저 끓은 쪽이 끓는점이 낮은 쪽이에요.', 14, ok ? '#14803f' : '#b91c1c', 'left', 800);
      textBlock(L.x + 26, ry + 34, L.w - 52, pr.why, 13, INK, 18, 700);
    } else if (P.ph === 'heat') {
      textBlock(L.x + 16, ry + 8, L.w - 32, '온도를 천천히 올리고 있어요. 분자 사이 인력이 작은 쪽이 먼저 흩어져요(끓어요). 잘 지켜봐요!', 13.5, MUTED, 19, 700);
    } else {
      textBlock(L.x + 16, ry + 8, L.w - 32, P.pick[P.q] === null ? '두 물질의 분자 사이 힘을 비교해서 끓는점이 더 높은 쪽을 골라요. 카드를 눌러도 돼요.' : '선택했어요! 🔥 가열해서 확인을 눌러 맞는지 봐요.', 13.5, MUTED, 19, 700);
    }
  }
  function predReset() {
    const P = S.pred; P.pick = P.pick.map(() => null); P.res = P.res.map(() => null); predSetup(0);
  }
  const predScore = () => S.pred.res.filter((r) => r === true).length;
  const predAnswered = () => S.pred.res.filter((r) => r !== null).length;
  [1, 2, 3, 4, 5, 6].forEach((n) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = n - 1; bt.textContent = n; $('#qRow').appendChild(bt); });
  $('#qRow').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.fade = 0.5; predSetup(+bt.dataset.v); });
  const pick = (i) => { const P = S.pred; if (P.ph !== 'pick') return; Sound.click(); P.pick[P.q] = i; updateCtl(); };
  $('#pickA').addEventListener('click', () => pick(0));
  $('#pickB').addEventListener('click', () => pick(1));
  $('#bHeat').addEventListener('click', predHeatStart);

  /* ================= 포인터 (카드 끌기 · 점/칸 누르기 · 카드 고르기) ================= */
  let dragCard = null, dragOff = [0, 0], dragStart = [0, 0], dragMoved = 0;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  function cardAt(p) {
    const cs = S.forces.cards; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CH) return c; } return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'forces' && S.sub.forces === 'sort') {
        const c = cardAt(p);
        if (c) { dragCard = c; c.drag = true; dragOff = [p.x - c.x, p.y - c.y]; dragStart = [p.x, p.y]; dragMoved = 0; Sound.tick(); return true; }
        const rc = sortRC(), bi = rc.bins.findIndex((b) => inRect(p, b));
        if (bi >= 0 && S.forces.sel !== null) { const sc = S.forces.cards.find((x) => x.id === S.forces.sel); if (sc) { S.forces.sel = null; placeCard(sc, bi); Sound.success(); } }
        return false;
      }
      if (S.mode === 'bp') return bpTap(p) && false;
      if (S.mode === 'pred' && S.pred.ph === 'pick') {
        const bx = predBoxes(), L = RC.pred.L, cw = PHONE ? 224 : 372;
        const ra = { x: PHONE ? L.x + 8 : L.x + 14, y: L.y + 44, w: cw, h: PHONE ? 84 : 66 }, rb = { x: PHONE ? L.x + 232 : L.x + L.w - 14 - cw, y: L.y + 44, w: cw, h: PHONE ? 84 : 66 };
        if (inRect(p, ra) || inRect(p, bx[0])) { pick(0); return false; }
        if (inRect(p, rb) || inRect(p, bx[1])) { pick(1); return false; }
      }
      return false;
    },
    move(p) {
      const c = dragCard; if (!c) return;
      dragMoved = Math.max(dragMoved, Math.hypot(p.x - dragStart[0], p.y - dragStart[1]));
      c.x = clamp(p.x - dragOff[0], 0, VW - CW); c.y = clamp(p.y - dragOff[1], 0, VH - CH);
    },
    up(p) {
      const c = dragCard; if (!c) return; dragCard = null; c.drag = false;
      const F = S.forces;
      if (dragMoved < 6) {                         // 누르기: 카드 고르기
        F.sel = F.sel === c.id ? null : c.id; cardsLayout(); return;
      }
      const rc = sortRC(), bi = rc.bins.findIndex((b) => inRect(p, b));
      F.sel = null;
      if (bi >= 0) { placeCard(c, bi); Sound.success(); } else { c.bin = null; c.flag = false; cardsLayout(); Sound.click(); updateCtl(); }
    },
    hover(p) {
      if (S.mode === 'forces' && S.sub.forces === 'sort') return cardAt(p) ? 'grab' : null;
      if (S.mode === 'bp') { if (S.sub.bp === 'graph') return bpPoints().some((q) => q.ap > 0.5 && Math.hypot(q.x - p.x, q.y - p.y) < 17) ? 'pointer' : null; return null; }
      return null;
    },
  });

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      if (on && n.hasAttribute('data-gate-f')) on = S.forces.f === n.getAttribute('data-gate-f');
      n.hidden = !on;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const h = S.heat;
    $$('#subChips button').forEach((b) => b.classList.toggle('on', b.dataset.v === h.sub));
    $('#oT').textContent = h.T + ' K'; $('#sT').value = h.T; $('#tMinus').disabled = h.T <= 50; $('#tPlus').disabled = h.T >= 600;
    $('#bLines').setAttribute('aria-pressed', h.lines ? 'true' : 'false'); $('#bLines').textContent = h.lines ? '👁️ 인력 점선: 켜짐' : '👁️ 인력 점선: 꺼짐';
    const F = S.forces;
    $$('#fSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.forces));
    $$('#fChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === F.f); b.classList.toggle('done', !!F.viewed[b.dataset.v] && b.dataset.v !== F.f); });
    $$('#szSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === F.size));
    $$('#hbSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === F.hb));
    const B = S.bp;
    $$('#bSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.bp));
    $$('#gChips button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'all' ? GROUPS.every((g) => B.groups[g]) : !!B.groups[+b.dataset.v]));
    const P = S.pred, pr = PAIRS[P.q];
    $$('#qRow button').forEach((b) => { const q = +b.dataset.v; b.classList.toggle('on', q === P.q); b.classList.toggle('ok', P.res[q] === true); b.classList.toggle('no', P.res[q] === false); });
    $('#pickA').textContent = '◀ ' + pr.a.nm; $('#pickB').textContent = pr.b.nm + ' ▶';
    $('#pickA').classList.toggle('btn-primary', P.pick[P.q] === 0); $('#pickB').classList.toggle('btn-primary', P.pick[P.q] === 1);
    $('#pickA').disabled = $('#pickB').disabled = P.ph !== 'pick';
    $('#bHeat').disabled = !(P.ph === 'pick' && P.pick[P.q] !== null);
    $('#bHeat').textContent = P.ph === 'heat' ? '🔥 가열하는 중…' : P.ph === 'result' ? '✅ 확인했어요' : '🔥 가열해서 확인';
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m;
    if (m === 'forces' && S.sub.forces === 'look' && S.forces.f === 'dip') dipScatter();
    if (m === 'forces') cardsLayout();
    if (m === 'pred' && !S.pred.mdA) predSetup(S.pred.q);
    updateCtl();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5;
    if (S.mode === 'heat') heatReset();
    else if (S.mode === 'forces') { if (S.sub.forces === 'sort') { cardsInit(); cardsLayout(); } else { S.forces.f = 'disp'; S.forces.size = 'ar'; S.forces.hb = 'h2o'; S.forces.vt = 0; } }
    else if (S.mode === 'bp') { if (S.sub.bp === 'graph') { S.bp.groups = { 14: true, 15: false, 16: false, 17: false }; S.bp.found = {}; S.bp.sel = null; S.bp.msg = ''; } else { S.bp.tbl = S.bp.tbl.map(() => null); S.bp.flag = {}; S.bp.cellSel = null; } }
    else predReset();
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'heat') {
      const h = S.heat;
      L1 = '물질 · 온도'; a = SUB[h.sub].name.replace('물질 ', '') + ' · ' + Math.round(h.Td) + ' K (' + sgn(Math.round(h.Td) - 273) + ' °C)';
      L2 = '평균 운동 에너지'; b = '× ' + (Math.round(h.Td / 3) / 100).toFixed(2) + ' (300 K = 1)';
      L3 = '모습'; c = h.st === 'cond' ? '모여 있음' : '흩어짐' + (h.tc ? '' : '');
    } else if (S.mode === 'forces') {
      const F = S.forces;
      if (S.sub.forces === 'look') { L1 = '보는 힘'; a = FI[F.f].name; L2 = '대표 분자'; b = F.f === 'disp' ? SZ[F.size].nm + ' (전자 ' + SZ[F.size].e + '개)' : F.f === 'dip' ? 'HCl' : MOL[F.hb].nm; L3 = '세기(kJ/mol)'; c = FI[F.f].range[0] + ' ~ ' + FI[F.f].range[1]; }
      else { const pl = F.cards.filter((x) => x.bin !== null).length; L1 = '분류한 카드'; a = pl + ' / 8'; L2 = '상자 속'; b = [0, 1, 2].map((i) => F.cards.filter((x) => x.bin === i).length).join(' · '); L3 = '선택한 카드'; c = F.sel ? F.cards.find((x) => x.id === F.sel).f : '—'; }
    } else if (S.mode === 'bp') {
      const B = S.bp;
      if (S.sub.bp === 'graph') { L1 = '선택한 점'; a = B.sel ? BPD[B.sel.g].nm[B.sel.i] : '—'; L2 = '끓는점'; b = B.sel ? sgn(BPD[B.sel.g].v[B.sel.i]) + ' °C' : '—'; L3 = '찾은 비정상 점'; c = Object.keys(B.found).length + ' / 3'; }
      else { L1 = '채운 칸'; a = B.tbl.filter((v) => v !== null).length + ' / 9'; L2 = '요인'; b = '분자량 · 극성 · 수소 결합'; L3 = '기호'; c = '○ △ ×'; }
    } else {
      const P = S.pred; L1 = '문제'; a = (P.q + 1) + ' / 6'; L2 = '맞힌 쌍'; b = predScore() + ' / ' + predAnswered() + ' (푼 문제)'; L3 = '온도'; c = Math.round(P.T - 273) + ' °C';
    }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const heatFresh = () => { const h = S.heat; h.seen = { A: { c: false, g: false }, B: { c: false, g: false }, C: { c: false, g: false } }; h.pair = { a: false, c: false }; h.tc = null; };
  const placedN = () => S.forces.cards.filter((c) => c.bin !== null).length;
  const viewedN = () => FK.filter((k) => S.forces.viewed[k]).length;
  const foundN = () => Object.keys(S.bp.found).length;
  const levels = [
    {
      title: '인력과 열운동: 모이는가 흩어지는가', short: '인력과 열운동', icon: '🌡️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 왜 어떤 물질은 방 안에서 액체이고, 같은 모양의 분자인데 끓는점은 이렇게 다를까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 화학에서</b> 극성이 큰 분자일수록 분자 사이 인력이 크다고 배웠고, <b>중학교에서</b> 끓는점이 물질마다 다른 특성임을 배웠어요. 이번에는 분자 사이의 <b>인력</b>과 분자의 <b>열운동</b>이 겨루는 모습으로 그 까닭을 살펴봐요.</div>' +
        '<p>분자 모형 상자에서 <b>물질(인력의 세기)</b>과 <b>온도</b>를 바꾸어 봐요. 열운동이 인력을 이기면 분자가 흩어져 기체가 돼요.</p>',
      features: ['heat'],
      setup() { S.lock = false; S.gate = ''; setMode('heat'); },
      recap: '인력이 열운동을 이기면 분자가 모여 있고(액체·고체), 열운동이 인력을 이기면 흩어져요(기체). 인력이 클수록 더 높은 온도에서 흩어져요.',
      summary: '<ul><li>물질이 액체로 존재하려면 분자 사이에 <b>인력</b>이 있어야 해요. 온도가 낮으면 인력이 이겨 분자가 모이고, 온도가 높아 <b>열운동</b>이 이기면 흩어져 기체가 돼요.</li><li>분자의 평균 운동 에너지는 <b>절대 온도(K)에 비례</b>하고 분자의 종류와 상관없어요.</li><li>같은 온도에서 분자 간 인력이 큰 물질은 모여 있고, 작은 물질은 흩어져요 → 인력이 클수록 <b>끓는점이 높아요</b>.</li><li>끓을 때는 <b>분자 사이 거리</b>만 멀어져요. 분자 안의 공유 결합은 끊어지지 않아요.</li></ul>',
      missions: [
        {
          title: '가열해서 모임에서 흩어짐으로',
          goal: '<b>물질 B</b>를 골라 온도를 올리면서 분자가 <b>모여 있는 상태</b>와 <b>흩어진 상태</b>를 모두 만들어 봐요. (몇 초 기다려야 해요)',
          hint: '온도를 100 K에서 조금씩 올려요. 물질 B는 300 K쯤에서 흩어지기 시작해요. 350 K까지 올리고 몇 초 지켜봐요.',
          setup() { S.lock = true; S.gate = ''; heatFresh(); heatReset(); setMode('heat'); },
          check: () => S.heat.sub === 'B' && S.heat.seen.B.c && S.heat.seen.B.g, hold: 0.4,
          status: () => '모여 있음 ' + mark(S.heat.seen[S.heat.sub].c) + ' &nbsp; 흩어짐 ' + mark(S.heat.seen[S.heat.sub].g) + (S.heat.tc ? ' &nbsp; 흩어진 온도 약 ' + S.heat.tc + ' K' : ''),
          explain: '온도가 낮으면 열운동이 약해서 인력이 분자를 붙잡아 <b>모여 있어요</b>(액체·고체). 온도가 올라 열운동이 인력을 이기면 분자가 <b>흩어져 기체</b>가 돼요. 이때 분자 사이의 거리만 멀어지고 분자 안의 결합은 그대로예요.',
        },
        {
          title: '같은 온도, 다른 물질',
          goal: '온도를 <b>250 ~ 310 K</b>에 두고 물질 A와 C를 번갈아 골라요. <b>A는 흩어지고 C는 모여 있는</b> 모습을 모두 확인해요.',
          hint: '온도를 250 ~ 310 K로 맞추고 물질 A를 골라 몇 초 기다려요(흩어짐). 이어서 물질 C를 고르고 몇 초 기다리면 분자가 모여요.',
          setup() { S.lock = true; S.gate = ''; heatFresh(); heatReset(); S.heat.sub = 'A'; S.heat.md.eps = SUB.A.eps; setMode('heat'); },
          check: () => S.heat.pair.a && S.heat.pair.c, hold: 0.4,
          status: () => 'A 흩어짐 ' + mark(S.heat.pair.a) + ' &nbsp; C 모여 있음 ' + mark(S.heat.pair.c) + ' &nbsp; 온도 ' + Math.round(S.heat.Td) + ' K ' + mark(S.heat.Td >= 250 && S.heat.Td <= 310),
          explain: '같은 온도에서는 열운동의 세기(평균 운동 에너지)가 같아요. 인력이 약한 A는 열운동이 이겨서 <b>흩어지고</b>, 인력이 강한 C는 인력이 이겨서 <b>모여 있어요</b>. 인력이 클수록 더 높은 온도가 되어야 흩어지므로 끓는점이 높아요.',
        },
        {
          type: 'quiz', title: '끓을 때 일어나는 일',
          goal: '액체가 끓어 기체가 될 때 일어나는 일로 알맞은 것은?',
          setup() { S.lock = true; S.gate = ''; setMode('heat'); },
          choices: ['분자 안의 공유 결합이 끊어져 원자로 나뉘어요', '분자 사이의 거리가 멀어지고 분자 사이 인력을 이겨요', '분자 하나하나의 크기가 커져요', '분자의 수가 늘어나요'],
          answer: 1,
          feedback: ['물이 끓어도 수증기는 여전히 H₂O 분자예요. 분자 안의 결합은 끊어지지 않아요.', '', '분자의 크기는 변하지 않아요. 변하는 것은 분자 사이의 거리예요.', '분자의 수는 그대로예요. 분자들이 서로 멀어질 뿐이에요.'],
          explain: '끓을 때는 <b>분자 사이의 인력</b>을 이기고 분자가 멀어져요. 분자 자체와 분자 안의 공유 결합은 그대로예요. 그래서 끓는점은 분자 간 힘의 세기로 설명해요.',
        },
      ],
    },
    {
      title: '세 가지 분자 간 힘', short: '세 가지 힘', icon: '🧲', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 인력이 클수록 더 높은 온도에서 흩어진다는 것을 보았어요. 이 <b>인력의 정체</b>를 분자 돋보기로 들여다봐요.</div>' +
        '<p>분자 사이의 힘은 <b>분산력</b>, <b>쌍극자–쌍극자 힘</b>, <b>수소 결합</b> 세 가지로 나눌 수 있어요. 각 힘이 생기는 까닭을 보고, 분자 카드를 알맞은 상자에 분류해요.</p>',
      features: ['forces'],
      setup() { S.lock = false; S.gate = ''; S.sub.forces = 'look'; S.forces.f = 'disp'; S.forces.vt = 0; setMode('forces'); },
      recap: '분산력은 모든 분자 사이에, 쌍극자–쌍극자 힘은 극성 분자 사이에, 수소 결합은 N·O·F에 결합한 H가 있는 분자 사이에 작용해요.',
      summary: '<ul><li><b>분산력</b>: 모든 분자 사이. 전자 구름이 순간적으로 쏠려 이웃에 반대 전하가 생겨 끌어당겨요. 전자가 많은(분자량이 큰) 분자일수록 커요. (He −269, Ar −186, Xe −108 °C)</li><li><b>쌍극자–쌍극자 힘</b>: 극성 분자 사이에서 δ+와 δ−가 끌어당겨요.</li><li><b>수소 결합</b>: N·O·F에 결합한 H와 이웃 분자의 N·O·F 비공유 전자쌍 사이의 힘. 분자 사이의 힘이며 공유 결합이 아니에요.</li><li>크기감: 공유 결합(수백 kJ/mol) ≫ 수소 결합(10~40) &gt; 쌍극자–쌍극자(5~25). 분산력(0.1~40)은 큰 분자에서 극성 분자 간 힘보다 클 수도 있어요.</li></ul>',
      missions: [
        {
          title: '세 가지 힘 살펴보기',
          goal: '<b>분산력</b>, <b>쌍극자–쌍극자 힘</b>, <b>수소 결합</b> 화면을 모두 2초 이상 살펴봐요.',
          hint: '🔍 힘 살펴보기에서 힘 이름 단추를 하나씩 눌러 보세요. 분산력은 He · Ar · Xe를, 수소 결합은 H₂O · HF · NH₃를 바꿔 볼 수 있어요.',
          setup() { S.lock = true; S.gate = ''; S.sub.forces = 'look'; S.forces.f = 'disp'; S.forces.vt = 0; S.forces.viewed = { disp: false, dip: false, hb: false }; setMode('forces'); },
          check: () => viewedN() === 3, hold: 0.3,
          status: () => '분산력 ' + mark(S.forces.viewed.disp) + ' &nbsp; 쌍극자 ' + mark(S.forces.viewed.dip) + ' &nbsp; 수소 결합 ' + mark(S.forces.viewed.hb),
          explain: '<b>분산력</b>은 순간적으로 쏠린 전자 구름이 이웃에 반대 전하를 만들어 모든 분자 사이에 생기고, <b>쌍극자–쌍극자 힘</b>은 극성 분자의 δ+와 δ−가 서로 당기며, <b>수소 결합</b>은 N·O·F에 결합한 H가 이웃의 비공유 전자쌍을 당겨요.',
        },
        {
          title: '분자 카드 분류하기', manual: true,
          goal: '분자 카드 8장을 가장 알맞은 힘의 상자에 끌어 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '순서대로 물어요. ① N·O·F에 직접 결합한 H가 있나요? → 수소 결합. ② 없다면 극성 분자인가요? → 쌍극자–쌍극자 힘. ③ 무극성 분자(CO₂·CH₄는 대칭 구조)면 분산력이에요.',
          setup() { S.lock = true; S.gate = ''; S.sub.forces = 'sort'; cardsInit(); cardsLayout(); setMode('forces'); },
          check() {
            const F = S.forces, un = F.cards.filter((c) => c.bin === null).length;
            if (un) return '아직 상자에 놓지 않은 카드가 ' + un + '장 있어요.';
            const wr = F.cards.filter((c) => c.bin !== c.ans);
            if (wr.length) {
              wr.forEach((c) => { if (!c.flag) { c.flag = true; c.shake = 1; } });
              return wr.length + '장이 알맞지 않은 상자에 있어요. 빨간 테두리 카드를 다시 생각해 봐요. (① N·O·F에 결합한 H가 있나? ② 극성인가? ③ 무극성인가?)';
            }
            return true;
          },
          status: () => '분류한 카드 ' + placedN() + ' / 8 ' + mark(placedN() === 8),
          explain: 'Ar · CH₄ · CO₂는 <b>무극성</b>이라 분산력만 있고(CO₂와 CH₄는 모양이 대칭이라 극성이 상쇄돼요), HCl · HBr은 <b>극성</b>이라 쌍극자–쌍극자 힘이, H₂O · NH₃ · HF는 N·O·F에 결합한 H가 있어 <b>수소 결합</b>이 가장 두드러져요.',
        },
        {
          type: 'quiz', title: '수소 결합이란?',
          goal: '수소 결합에 대한 설명으로 옳은 것은?',
          setup() { S.lock = true; S.gate = ''; S.sub.forces = 'look'; S.forces.f = 'hb'; setMode('forces'); },
          choices: ['H와 O 사이의 공유 결합이에요', '분자 안의 원자들을 붙잡는 이온 결합이에요', '분자 사이에 작용하는 힘이고 분자 간 힘 중 가장 강해요', '모든 분자 사이에 작용하는 가장 약한 힘이에요'],
          answer: 2,
          feedback: ['H와 O 사이의 공유 결합은 분자 안의 결합(실선)이에요. 수소 결합은 이웃 분자 사이의 힘(점선)이에요.', '이온 결합이 아니에요. 수소 결합은 분자와 분자 사이에 작용하는 힘이에요.', '', '가장 약한 힘은 분산력이에요. 수소 결합은 분자 간 힘 중 가장 강한 힘이에요.'],
          explain: '수소 결합은 <b>공유 결합이 아니라 분자 사이에 작용하는 힘</b>이에요. 공유 결합(수백 kJ/mol)보다는 훨씬 약하지만(10 ~ 40 kJ/mol) 분자 간 힘 중에서는 가장 강해요.',
        },
      ],
    },
    {
      title: '끓는점 추론: 비정상 점을 찾아라', short: '끓는점 추론', icon: '📈', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분산력, 쌍극자–쌍극자 힘, 수소 결합을 알았어요. 이제 수소 화합물의 <b>끓는점 자료</b>로 어떤 요인이 끓는점을 정하는지 추론해 봐요.</div>' +
        '<p>후보 요인은 <b>분자량</b>, <b>극성</b>, <b>수소 결합</b> 세 가지예요. 14 ~ 17족 수소 화합물의 끓는점 그래프에서 흐름을 벗어난 점을 찾고, 각 요인이 무엇을 설명하고 어디서 실패하는지 검증표로 정리해요.</p>',
      features: ['bp'],
      setup() { S.lock = false; S.gate = ''; S.sub.bp = 'graph'; setMode('bp'); },
      recap: '14족은 분자량(분산력)으로 설명되지만, 2주기 NH₃ · H₂O · HF는 분자량으로도 극성만으로도 설명되지 않고 수소 결합으로 설명돼요.',
      summary: '<ul><li><b>14족</b>(무극성): 주기가 클수록 분자량 · 전자 수가 커서 분산력이 커져요 → 끓는점이 올라가요. (CH₄ −162 → SnH₄ −52 °C)</li><li><b>15 · 16 · 17족</b>: 2주기 NH₃(−33), H₂O(100), HF(20)만 비정상적으로 높아요. 분자량으로는 설명할 수 없고, 극성만으로도 설명이 부족해요(HCl · H₂S도 극성이지만 낮아요) → <b>수소 결합</b>.</li><li>H₂O(100 °C)가 HF(20 °C)보다 높은 까닭: 분자 하나가 만드는 수소 결합 수가 H₂O는 2개, HF는 1개예요.</li><li>CH₄가 SiH₄보다 낮은 까닭: 둘 다 무극성이고 CH₄는 전자가 적어 분산력이 작기 때문이에요.</li></ul>',
      missions: [
        {
          title: '그래프에서 비정상 점 3개 찾기',
          goal: '14 ~ 17족을 모두 보고, 같은 족의 흐름과 달리 <b>유난히 높은 점 3개</b>를 눌러 찾아요.',
          hint: '15족, 16족, 17족 단추를 눌러 점을 모두 켜요. 가장 왼쪽(2주기) 점이 같은 족의 나머지 점보다 훨씬 위에 있어요.',
          setup() { S.lock = true; S.gate = ''; S.sub.bp = 'graph'; S.bp.groups = { 14: true, 15: false, 16: false, 17: false }; S.bp.found = {}; S.bp.sel = null; S.bp.msg = ''; setMode('bp'); },
          check: () => foundN() === 3, hold: 0.4,
          status: () => '찾은 비정상 점 ' + foundN() + ' / 3 ' + mark(foundN() === 3),
          explain: '15족의 <b>NH₃</b>, 16족의 <b>H₂O</b>, 17족의 <b>HF</b>가 각 족에서 분자량이 가장 작은데도 끓는점이 가장 높아요. 분자량(분산력)만으로는 설명할 수 없는 점들이에요.',
        },
        {
          title: '요인 검증표 완성하기', manual: true,
          goal: '분자량 · 극성 · 수소 결합이 각 관찰을 얼마나 설명하는지 ○ △ ×로 채우고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '(a) 14족은 모두 무극성이고 수소 결합이 없어요. (b) 비정상 점은 분자량이 가장 작지만 수소 결합이 있어요. 극성인 HCl · H₂S는 낮아요. (c) H₂O와 HF는 둘 다 극성이에요. 분자 하나의 H 수와 비공유 전자쌍 수를 비교해 봐요.',
          setup() { S.lock = true; S.gate = ''; S.sub.bp = 'table'; S.bp.tbl = S.bp.tbl.map(() => null); S.bp.flag = {}; S.bp.cellSel = null; setMode('bp'); },
          check() {
            const B = S.bp, em = B.tbl.filter((v) => v === null).length;
            if (em) return '비어 있는 칸이 ' + em + '개 있어요. 9칸을 모두 채워요.';
            const wr = []; B.tbl.forEach((v, k) => { if (v !== TBL_ANS[Math.floor(k / 3)][k % 3]) wr.push(k); });
            if (wr.length) { wr.forEach((k) => { if (!B.flag[k]) { B.flag[k] = true; B.shake[k] = 1; } }); return wr.length + '칸이 달라요. 빨간 테두리 칸을 다시 생각해 봐요. 그래프와 앞 단계의 세 가지 힘을 떠올려요.'; }
            return true;
          },
          status: () => '채운 칸 ' + S.bp.tbl.filter((v) => v !== null).length + ' / 9',
          explain: '<b>분자량</b>은 14족의 오름세만 설명해요. <b>극성</b>은 비정상 점을 일부만 설명해요(극성인 HCl · H₂S는 낮아요). <b>수소 결합</b>만 NH₃ · H₂O · HF의 비정상적인 높이와 H₂O > HF의 순서까지 설명해요.',
        },
        {
          type: 'quiz', title: 'CH₄ 와 SiH₄',
          goal: 'CH₄(−162 °C)가 SiH₄(−112 °C)보다 끓는점이 낮은 까닭은?',
          setup() { S.lock = true; S.gate = ''; S.sub.bp = 'graph'; setMode('bp'); },
          choices: ['둘 다 무극성이고 CH₄는 전자 수(분자량)가 작아 분산력이 더 작기 때문이에요', 'CH₄는 수소 결합을 하지만 SiH₄는 하지 못하기 때문이에요', 'CH₄가 SiH₄보다 극성이 더 커서 분자끼리 밀어내기 때문이에요', 'CH₄ 분자 안의 C–H 결합이 약해서 쉽게 끊어지기 때문이에요'],
          answer: 0,
          feedback: ['', 'C에 결합한 H는 수소 결합을 만들지 않아요. 수소 결합은 N · O · F에 결합한 H만 해당돼요.', '두 분자 모두 정사면체 구조라 무극성이에요. 극성 때문이 아니에요.', '끓을 때 분자 안의 결합은 끊어지지 않아요. 분자 사이의 힘이 문제예요.'],
          explain: 'CH₄와 SiH₄는 모두 <b>무극성</b>이라 분산력만 작용해요. SiH₄는 전자가 더 많아서(분자량 32 대 16) 분산력이 커서 끓는점이 더 높아요.',
        },
      ],
    },
    {
      title: '끓는점 순서 예측: 누가 먼저 끓을까', short: '순서 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분자량(분산력)과 수소 결합이 끓는점을 정한다는 것을 추론했어요. 이제 <b>처음 보는 쌍</b>의 끓는점 순서를 예측해 봐요.</div>' +
        '<p>여섯 쌍의 분자마다 끓는점이 더 높은 쪽을 먼저 고르고, 🔥 가열해서 확인해요. 먼저 끓는 쪽이 분자 간 힘이 약한 쪽이에요. <b>5쌍 이상</b> 맞히면 성공이에요.</p>',
      features: ['pred'],
      setup() { S.lock = false; S.gate = ''; setMode('pred'); },
      recap: '끓는점은 수소 결합 여부를 먼저 보고, 같은 종류의 힘이면 분자량(전자 수)을, 분자량이 같으면 분자 모양을 비교해 예측해요.',
      summary: '<ul><li>끓는점 비교 순서: <b>수소 결합</b> 여부 → (같은 종류의 힘이면) <b>분자량 · 전자 수</b> → 분자 <b>모양</b>(접촉 면적).</li><li>에탄올(78 °C) &gt; 다이메틸 에터(−24 °C): 분자량 46으로 같지만 O–H 결합이 있어 수소 결합을 해요.</li><li>I₂(184) &gt; F₂(−188): 분산력(분자량). HF(20) &gt; HCl(−85), H₂O(100) &gt; H₂S(−60), NH₃(−33) &gt; CH₄(−162): 수소 결합.</li><li>뷰테인(−1) &gt; 아이소뷰테인(−12): 곧은 사슬은 접촉 면이 넓어 분산력이 커요.</li></ul>',
      missions: [
        {
          title: '6쌍 중 5쌍 이상 맞히기',
          goal: '여섯 쌍마다 끓는점이 더 높은 쪽을 고르고 <b>🔥 가열해서 확인</b>해요. <b>5쌍 이상</b> 맞히면 성공이에요.',
          hint: '먼저 수소 결합(N · O · F에 결합한 H)이 있는지 비교하고, 같으면 분자량, 분자량이 같으면 분자 모양을 비교해요. 5쌍을 못 맞혔다면 ↺ 단추로 처음부터 다시 풀어요.',
          setup() { S.lock = true; S.gate = ''; predReset(); setMode('pred'); },
          check: () => predAnswered() === 6 && predScore() >= 5, hold: 0.4,
          status: () => '푼 문제 ' + predAnswered() + ' / 6 &nbsp; 맞힌 쌍 ' + predScore() + ' ' + mark(predAnswered() === 6 && predScore() >= 5),
          explain: '끓는점은 분자 간 힘의 세기로 예측해요. <b>수소 결합</b>이 있으면 가장 유리하고, 같은 종류의 힘이면 <b>분자량(전자 수)</b>이 큰 쪽, 분자량이 같으면 <b>접촉 면적</b>이 넓은 곧은 모양이 높아요.',
        },
        {
          type: 'quiz', title: '분자량이 같은데 끓는점이 다른 까닭',
          goal: '에탄올과 다이메틸 에터는 분자량이 같은데 끓는점이 다른 까닭은?',
          setup() { S.lock = true; S.gate = ''; setMode('pred'); },
          choices: ['분자 안 공유 결합의 세기가 달라서 끓을 때 더 많은 결합이 끊어지기 때문이에요', '분자의 질량이 서로 다르기 때문이에요', '분자식이 같으면 끓는점도 항상 같아요', '분자 사이에 작용하는 힘의 종류가 달라서예요 (수소 결합 여부 등)'],
          answer: 3,
          feedback: ['끓을 때 분자 안의 결합은 끊어지지 않아요. 분자 사이의 힘이 달라서예요.', '두 분자의 분자량은 모두 46으로 같아요.', '분자식이 같아도 구조가 다르면 분자 간 힘이 달라서 끓는점이 달라요.', ''],
          explain: '분자량이 같아도 <b>분자 간 힘의 종류와 세기</b>가 다르면 끓는점이 달라요. 에탄올은 O–H 결합이 있어 수소 결합을 하고, 다이메틸 에터는 하지 못해요. (뷰테인과 아이소뷰테인처럼 분자 모양에 따른 분산력 차이도 있어요.)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-intermolecular', mount: '#game', badge: '분자 간 힘 탐정', homeHref: '../../index.html#hx',
    featureLabels: { heat: '🌡️ 분자 모형 상자', forces: '🔍 분자 돋보기 · 카드 분류', bp: '📈 끓는점 그래프 · 요인 검증표', pred: '🎯 가열 확인 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  heatInit(); cardsInit(); dipScatter(); S.bp.cellSel = null; S.bp.ptShakeT = 0;
  setMode('heat');
  function stepForces(dt) {
    const F = S.forces;
    F.rd = SciSim.approach(F.rd, SZ[F.size].r, dt, 6); F.ad = SciSim.approach(F.ad, SZ[F.size].arrow, dt, 6);
    if (S.mode === 'forces' && S.sub.forces === 'look') {
      F.vt += dt; if (F.vt > 2 && !F.viewed[F.f]) { F.viewed[F.f] = true; updateCtl(); }
      if (F.f === 'dip') F.dipA = F.dipA.map((a, i) => { const d = angDiff(DIP_T[i], a); return a + d * (1 - Math.exp(-dt * 1.8)); });
    }
    stepCards(dt);
  }
  function stepAll1(dt) {
    S.flash = [];
    if (S.mode === 'heat') stepHeat(dt);
    stepForces(dt); stepBP(dt);
    if (S.mode === 'pred') stepPred(dt);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if ((S.lock || S.gate) && game && game.phase !== 'active') { S.lock = false; S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'heat') drawHeat(t);
    else if (S.mode === 'forces') { T(14, 26, MODE_LABEL.forces, PHONE ? 15 : 17, INK, 'left', 800); const L = fL(); panel(L.x, L.y, L.w, L.h, 14); T(L.x + 16, L.y + 28, S.sub.forces === 'look' ? '🔍 어떤 힘이 분자를 붙잡을까?' : '🗂️ 가장 알맞은 힘에 분류하기', PHONE ? 14 : 15.5, INK, 'left', 800); if (S.sub.forces === 'look') drawLook(L, t); else drawSort(L, t); }
    else if (S.mode === 'bp') drawBP(t);
    else drawPred(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, SUB, PAIRS, CARDS, BPD, TBL_ANS, mdCoh, COH_ON, COH_OFF, setT, setSub, setForce, setMode, predSetup, predScore, predAnswered, cardsLayout, placeCard, heatReset, sortRC, slotOf, bpPoints, cellRect, bL, predBoxes, tblRC, bpTap,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
