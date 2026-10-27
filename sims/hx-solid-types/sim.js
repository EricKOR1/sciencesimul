/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 결정성 고체의 분류 [12물에01-04]
   ① 관찰: 결정과 비결정 (확대경 속 입자 배열, 가열 곡선의 평탄 구간)
   ② 설명: 네 가지 결정 (이온 · 분자 · 공유 · 금속 결정, 대표 물질 12개 분류)
   ③ 실험: 성질 시험 (녹는점 · 전기 전도성(고체 / 액체 / 수용액) · 망치, 성질 비교표)
   ④ 적용: 미지 시료 분류 (판단 순서도: 전도성 → 녹는점 → 단단함)
   결정 구조(단위 세포, 배위수, 충전율)는 다루지 않고, 입자 배열은 '규칙적이다 / 아니다' 수준의 2차원 그림으로만 보여 줘요.
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
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ================= 자료 ================= */
  const TY = {
    ion: { nm: '이온 결정', col: '#3867f4', unit: '양이온 · 음이온', bond: '이온 결합', ex: 'NaCl, MgO, CaCl₂', note: '화학식은 이온 수의 비를 나타내는 실험식이에요 (NaCl).' },
    mol: { nm: '분자 결정', col: '#0ea5a4', unit: '분자', bond: '분자 안은 공유 결합, 분자 사이는 약한 분자 간 힘', ex: '얼음, 드라이아이스(CO₂), I₂, 설탕, 나프탈렌', note: '분자 사이의 힘이 약해서 녹는점이 낮아요.' },
    cov: { nm: '공유 결정', col: '#7c3aed', unit: '원자', bond: '공유 결합이 그물처럼 이어진 거대 구조', ex: '다이아몬드(C), 석영(SiO₂), 규소(Si)', note: 'SiO₂는 분자가 아니라 원자가 이어진 그물을 나타내는 실험식이에요.' },
    metal: { nm: '금속 결정', col: '#d97706', unit: '금속 양이온 · 자유 전자', bond: '금속 결합', ex: 'Na, Cu, Fe', note: '자유 전자 덕분에 전기가 잘 통하고 펴져요.' },
  };
  const TK = ['ion', 'mol', 'cov', 'metal'];
  const HS = {
    salt: { id: 'salt', nm: '소금', f: 'NaCl', crystal: true, mp: 801, T0: 25, T1: 1000, kind: 'salt', c: '#3867f4', note: '소금의 녹는점은 801 °C예요.' },
    sugar: { id: 'sugar', nm: '설탕', f: 'C₁₂H₂₂O₁₁', crystal: true, mp: 186, T0: 25, T1: 260, kind: 'mol', c: '#f59e0b', note: '설탕은 약 186 °C에서 녹으며 분해되기 시작해요.' },
    ice: { id: 'ice', nm: '얼음', f: 'H₂O', crystal: true, mp: 0, T0: -30, T1: 30, kind: 'mol', c: '#38bdf8', note: '얼음의 녹는점은 0 °C예요.' },
    cu: { id: 'cu', nm: '구리', f: 'Cu', crystal: true, mp: 1085, T0: 25, T1: 1300, kind: 'metal', c: '#d97706', note: '구리의 녹는점은 1085 °C예요.' },
    glass: { id: 'glass', nm: '유리', f: 'SiO₂ 등', crystal: false, T0: 25, T1: 800, soft: [500, 600], kind: 'glass', c: '#7c8aa3', note: '유리는 약 500 ~ 600 °C에서 서서히 무르게 돼요.' },
    plastic: { id: 'plastic', nm: '플라스틱', f: '고분자', crystal: false, T0: 25, T1: 220, soft: [60, 160], kind: 'chain', c: '#e2464b', note: '플라스틱은 온도가 오르면 서서히 물러져요.' },
  };
  const HK = ['salt', 'sugar', 'ice', 'cu', 'glass', 'plastic'];
  const PL = [0.36, 0.62];                                  // 결정이 녹는 구간 (가열 진행도)
  const HT = (h, p) => (h.crystal ? (p < PL[0] ? lerp(h.T0, h.mp, p / PL[0]) : p <= PL[1] ? h.mp : lerp(h.mp, h.T1, (p - PL[1]) / (1 - PL[1]))) : lerp(h.T0, h.T1, p));
  const HORD = (h, p) => (!h.crystal ? 0 : p < PL[0] ? 1 : p <= PL[1] ? 1 - (p - PL[0]) / (PL[1] - PL[0]) : 0);
  const HSOFT = (h, T0) => (h.crystal ? 0 : sm((T0 - h.soft[0]) / (h.soft[1] - h.soft[0])));
  const HDUR = 5;

  // 시험 시료 (8개)
  const SP = {
    nacl: { id: 'nacl', nm: '소금 NaCl', type: 'ion', mp: 801, mpTxt: '801 °C', solid: 0, liquid: 1, aq: 1, hammer: 'break', mpHigh: true, mol: false },
    cacl2: { id: 'cacl2', nm: 'CaCl₂', type: 'ion', mp: 772, mpTxt: '772 °C', solid: 0, liquid: 1, aq: 1, hammer: 'break', mpHigh: true },
    sugar: { id: 'sugar', nm: '설탕', type: 'mol', mp: 186, mpTxt: '약 186 °C (분해)', solid: 0, liquid: 0, aq: 0, hammer: 'break', mpHigh: false },
    naph: { id: 'naph', nm: '나프탈렌', type: 'mol', mp: 80, mpTxt: '80 °C', solid: 0, liquid: 0, aq: -1, hammer: 'break', mpHigh: false },
    dia: { id: 'dia', nm: '다이아몬드', type: 'cov', mp: 3550, mpTxt: '약 3550 °C (승화 · 고압)', solid: 0, liquid: 0, aq: -1, hammer: 'break', mpHigh: true, hard: true },
    quartz: { id: 'quartz', nm: '석영 SiO₂', type: 'cov', mp: 1713, mpTxt: '1713 °C', solid: 0, liquid: 0, aq: -1, hammer: 'break', mpHigh: true, hard: true },
    cu: { id: 'cu', nm: '구리 Cu', type: 'metal', mp: 1085, mpTxt: '1085 °C', solid: 1, liquid: 1, aq: -1, hammer: 'flat', mpHigh: true },
    fe: { id: 'fe', nm: '철 Fe', type: 'metal', mp: 1538, mpTxt: '1538 °C', solid: 1, liquid: 1, aq: -1, hammer: 'flat', mpHigh: true },
  };
  const SPK = ['nacl', 'cacl2', 'sugar', 'naph', 'dia', 'quartz', 'cu', 'fe'];
  const XT = [['mp', '🌡️ 녹는점'], ['solid', '⚡ 고체 전도'], ['liquid', '⚡ 액체 전도'], ['aq', '⚡ 수용액 전도'], ['hammer', '🔨 망치']];
  // 비교표 (유형 × 성질): 값 0 = ○ / 높음 / 부서짐, 1 = × / 낮음 / 펴짐, 2 = — (시험 불가)
  const TCOLS = [['solid', '고체 전도', ['○', '×', '—']], ['liquid', '액체 전도', ['○', '×', '—']], ['aq', '수용액 전도', ['○', '×', '—']], ['mp', '녹는점', ['높음', '낮음']], ['hammer', '망치', ['부서짐', '펴짐']]];
  const TANS = {
    ion: [1, 0, 0, 0, 0], mol: [1, 1, 1, 1, 0], cov: [1, 1, 2, 0, 0], metal: [0, 0, 2, 0, 1],
  };
  const TEXP = {
    ion: '이온 결정: 고체는 이온이 고정되어 부도체, 녹거나 물에 녹으면 이온이 움직여 도체예요. 녹는점이 높고 세게 치면 부서져요.',
    mol: '분자 결정: 분자 사이의 힘이 약해 녹는점이 낮고, 전하를 나르는 입자가 없어 고체 · 액체 · 수용액 모두 전기가 통하지 않아요.',
    cov: '공유 결정: 공유 결합이 그물처럼 이어져 녹는점이 매우 높고 단단해요. 자유로운 전하가 없어 전기가 통하지 않고 물에 녹지 않아요(—).',
    metal: '금속 결정: 자유 전자 때문에 고체 · 액체 모두 전기가 통하고, 힘을 주면 층이 미끄러져 펴져요. 물에 녹지 않아요(—).',
  };
  // 카드 (결정 12개)
  const CARDS = [
    { id: 'nacl', f: 'NaCl', hint: '소금 · 양이온과 음이온', ans: 0 }, { id: 'ice', f: '얼음', hint: 'H₂O · 물 분자', ans: 1 }, { id: 'dia', f: '다이아몬드', hint: 'C · 탄소 원자', ans: 2 },
    { id: 'na', f: 'Na', hint: '나트륨 · 금속', ans: 3 }, { id: 'mgo', f: 'MgO', hint: '산화 마그네슘', ans: 0 }, { id: 'co2', f: 'CO₂', hint: '드라이아이스 · CO₂ 분자', ans: 1 },
    { id: 'sio2', f: 'SiO₂', hint: '석영 · 원자의 그물', ans: 2 }, { id: 'cu', f: 'Cu', hint: '구리 · 금속', ans: 3 }, { id: 'cacl2', f: 'CaCl₂', hint: '염화 칼슘', ans: 0 },
    { id: 'i2', f: 'I₂', hint: '아이오딘 · I₂ 분자', ans: 1 }, { id: 'si', f: 'Si', hint: '규소 · 원자의 그물', ans: 2 }, { id: 'fe', f: 'Fe', hint: '철 · 금속', ans: 3 },
  ];
  // 미지 시료
  const UNK = {
    A: { type: 'ion', solid: 0, liquid: 1, aq: 1, mp: 900, hammer: 'break', hard: false },
    B: { type: 'mol', solid: 0, liquid: 0, aq: 0, mp: 60, hammer: 'break', hard: false },
    C: { type: 'cov', solid: 0, liquid: -1, aq: -1, mp: 3550, hammer: 'hard', hard: true },
    D: { type: 'metal', solid: 1, liquid: 1, aq: -1, mp: 1100, hammer: 'flat', hard: false },
    E: { type: 'ion', solid: 0, liquid: 1, aq: 1, mp: 700, hammer: 'break', hard: false },
    F: { type: 'mol', solid: 0, liquid: 0, aq: -1, mp: 114, hammer: 'break', hard: false },
  };
  const UK = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ---------- 배치 ---------- */
  const RC = {
    heat: { L: PHONE ? { x: 8, y: 50, w: 464, h: 382 } : { x: 12, y: 50, w: 330, h: 498 }, R: PHONE ? { x: 8, y: 440, w: 464, h: 510 } : { x: 350, y: 50, w: 438, h: 498 } },
    types: { L: PHONE ? { x: 8, y: 50, w: 464, h: 880 } : { x: 12, y: 50, w: 776, h: 498 } },
    bench: { L: PHONE ? { x: 8, y: 50, w: 464, h: 880 } : { x: 12, y: 50, w: 776, h: 498 } },
    cls: { L: PHONE ? { x: 8, y: 50, w: 464, h: 880 } : { x: 12, y: 50, w: 776, h: 498 } },
  };
  const MODE_LABEL = { heat: '🔍 결정과 비결정', types: '💎 네 가지 결정', bench: '🧪 성질 시험', cls: '🕵️ 미지 시료 분류' };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'heat', fade: 0, lock: false, gate: '', t: 0, sub: { types: 'look', bench: 'rig' },
    heat: { cur: 'salt', run: null, fast: false, smp: {}, msg: '', msgT: 0 },
    types: { cur: 'ion', cards: [], sel: null, seq: 0, ph: 0 },
    bench: { cur: 'nacl', x: 'mp', anim: null, log: {}, tbl: {}, flag: {}, shake: {}, cellSel: null },
    cls: { cur: 'A', path: {}, ans: {} },
  };
  let game = null;
  HK.forEach((k) => { S.heat.smp[k] = { prog: 0, done: false, trace: [], tag: null, wrongT: 0 }; });
  SPK.forEach((k) => { S.bench.log[k] = {}; });
  TK.forEach((k) => { S.bench.tbl[k] = [null, null, null, null, null]; S.bench.flag[k] = [false, false, false, false, false]; S.bench.shake[k] = [0, 0, 0, 0, 0]; });
  UK.forEach((k) => { S.cls.path[k] = []; });

  /* ================= 입자 배치 만들기 (2차원, 규칙 대 불규칙) ================= */
  function dartDisc(n, minD, R, rng, fixed) {
    const pts = (fixed || []).slice(); let guard = 0;
    while (pts.length < n && guard++ < 6000) {
      const a = rng() * TAU, r = R * Math.sqrt(rng()), x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (pts.every((p) => Math.hypot(p[0] - x, p[1] - y) >= minD)) pts.push([x, y]);
    }
    while (pts.length < n) pts.push([rnd(-R, R) * 0.7, rnd(-R, R) * 0.7]);
    return pts;
  }
  const LAYOUT = {};
  function layoutOf(kind) {
    if (LAYOUT[kind]) return LAYOUT[kind];
    const rng = seeded(kind.length * 977 + kind.charCodeAt(0)), L = { kind, ord: [], rnd: [], r: [], col: [], th: [], rth: [], bonds: [], el: [] };
    if (kind === 'salt') {
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { L.ord.push([(i - 2.5) * 0.27, (j - 2.5) * 0.27]); const p = (i + j) % 2; L.col.push(p ? '#22b14c' : '#f59e0b'); L.r.push(p ? 0.105 : 0.075); }
      L.rnd = dartDisc(36, 0.19, 0.86, rng);
    } else if (kind === 'mol') {
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { L.ord.push([(i - 2) * 0.33 + (j % 2) * 0.165 - 0.08, (j - 2) * 0.3]); L.th.push(0); L.rth.push(rng() * TAU); L.r.push(0.1); L.col.push(''); }
      L.rnd = dartDisc(25, 0.22, 0.86, rng);
    } else if (kind === 'metal') {
      for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) { L.ord.push([(i - 2) * 0.3 + (j % 2) * 0.15 - 0.07, (j - 2.5) * 0.26]); L.r.push(0.085); L.col.push('#d97706'); }
      L.rnd = dartDisc(30, 0.2, 0.86, rng);
      L.el = Array.from({ length: 26 }, () => ({ x: rng() * 1.6 - 0.8, y: rng() * 1.6 - 0.8, a: rng() * TAU, v: 0.25 + rng() * 0.3 }));
    } else if (kind === 'glass') {
      const pts = dartDisc(34, 0.2, 0.84, rng); L.ord = pts; L.rnd = pts;
      pts.forEach((p, i) => { L.r.push(i % 2 ? 0.07 : 0.095); L.col.push(i % 2 ? '#e2464b' : '#94a3b8'); });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 0.3) L.bonds.push([i, j]);
    } else {
      const pts = []; for (let c = 0; c < 4; c++) { let x = rng() * 1.3 - 0.65, y = rng() * 1.3 - 0.65, a = rng() * TAU; for (let k = 0; k < 9; k++) { pts.push([x, y]); a += (rng() - 0.5) * 2.2; x = clamp(x + Math.cos(a) * 0.16, -0.82, 0.82); y = clamp(y + Math.sin(a) * 0.16, -0.82, 0.82); if (Math.abs(x) > 0.8 || Math.abs(y) > 0.8) a += Math.PI; } }
      L.ord = pts; L.rnd = pts; pts.forEach(() => { L.r.push(0.062); L.col.push('#f87171'); });
      for (let c = 0; c < 4; c++) for (let k = 0; k < 8; k++) L.bonds.push([c * 9 + k, c * 9 + k + 1]);
    }
    LAYOUT[kind] = L; return L;
  }
  function bentMol(x, y, ang, s, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const R0 = 5.6 * s, r1 = 2.7 * s, d = 4.9 * s;
    D.sphere(Math.cos(0.95) * d, Math.sin(0.95) * d, r1, '#f1f5f9', { gloss: false });
    D.sphere(Math.cos(-0.95) * d, Math.sin(-0.95) * d, r1, '#f1f5f9', { gloss: false });
    D.sphere(0, 0, R0, col, { gloss: R0 > 4 });
    ctx.restore();
  }
  // 확대경 속 입자 그리기: cx, cy, R(픽셀 반지름), ord(0~1), jit(흔들림), soft(0~1)
  function drawParticles(kind, cx, cy, R, ord, jit, t, col) {
    const L = layoutOf(kind), n = L.ord.length, P = [];
    for (let i = 0; i < n; i++) {
      const a = L.ord[i], b = L.rnd[i], k = 1 - ord;
      const wob = RM ? 0 : 1, ph = i * 1.7;
      const jx = Math.sin(t * (2.2 + (i % 5) * 0.37) + ph) * jit * wob, jy = Math.cos(t * (2.7 + (i % 4) * 0.41) + ph * 1.3) * jit * wob;
      const rw = k > 0.001 ? 0.035 * k * (RM ? 0 : 1) : 0;
      P.push([cx + (lerp(a[0], b[0], k) + jx + Math.sin(t * 0.9 + ph) * rw) * R, cy + (lerp(a[1], b[1], k) + jy + Math.cos(t * 1.1 + ph) * rw) * R]);
    }
    if (L.bonds.length) { ctx.strokeStyle = kind === 'chain' ? 'rgba(220,70,70,.7)' : 'rgba(100,116,139,.7)'; ctx.lineWidth = kind === 'chain' ? 3 : 2.4; ctx.beginPath(); L.bonds.forEach(([i, j]) => { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }); ctx.stroke(); }
    for (let i = 0; i < n; i++) {
      if (kind === 'mol') { const th = lerp(L.th[i], L.rth[i], 1 - ord) + (RM ? 0 : Math.sin(t * 1.3 + i) * 0.1 * (0.3 + jit * 6)); bentMol(P[i][0], P[i][1], th, R * 0.0105 * 1.6, col || '#38bdf8'); }
      else D.sphere(P[i][0], P[i][1], Math.max(3.5, L.r[i] * R), L.col[i], { gloss: L.r[i] * R > 6 });
    }
    if (kind === 'metal') { // 자유 전자
      L.el.forEach((e) => { const x = cx + (((e.x + Math.cos(e.a + t * e.v * 1.4) * 0.3 + 1.6) % 1.6) - 0.8) * R * 1.0, y = cy + (e.y + Math.sin(e.a * 1.3 + t * e.v) * 0.25) * R; D.sphere(x, y, 2.8, '#fde047', { gloss: false }); });
    }
  }

  /* ================= ① 결정과 비결정 ================= */
  const hGeo = () => {
    const L = RC.heat.L;
    return PHONE ? { cx: L.x + L.w / 2, cy: L.y + 148, R: 96 } : { cx: L.x + L.w / 2, cy: L.y + 168, R: 124 };
  };
  const cellRC = (i) => {
    const Rr = RC.heat.R, w = (Rr.w - 30) / 2, h = PHONE ? 152 : 144;
    return { x: Rr.x + 10 + (i % 2) * (w + 10), y: Rr.y + 40 + Math.floor(i / 2) * (h + 8), w, h };
  };
  const hCur = () => HS[S.heat.cur], hSm = (id) => S.heat.smp[id || S.heat.cur];
  function stepHeat(dt) {
    const h = S.heat; if (h.msgT > 0) h.msgT -= dt;
    HK.forEach((k) => { const s = S.heat.smp[k]; if (s.wrongT > 0) s.wrongT = Math.max(0, s.wrongT - dt * 2.5); });
    if (h.run) {
      const hs = HS[h.run], s = hSm(h.run);
      s.prog = Math.min(1, s.prog + dt / (HDUR / (h.fast ? 2.4 : 1)));
      s.trace.push([s.prog, HT(hs, s.prog)]);
      if (s.prog >= 1) { s.done = true; h.run = null; Sound.success(); if (!RM) { const g = hGeo(); parts.burst(g.cx, g.cy, { count: 10, speed: 120, life: 0.6 }); } updateCtl(); }
    }
  }
  function stateTxt(hs, s) {
    const T0 = HT(hs, s.prog);
    if (hs.crystal) return s.prog <= 0 ? '고체' : s.prog < PL[0] ? '고체' : s.prog <= PL[1] ? '녹는 중 · 온도가 일정해요' : '액체';
    const sf = HSOFT(hs, T0); return sf < 0.04 ? '단단한 고체' : sf < 0.7 ? '서서히 무르는 중' : '많이 무른 상태';
  }
  function drawHeat(t) {
    const L = RC.heat.L, Rr = RC.heat.R, h = S.heat, hs = hCur(), s = hSm(), g = hGeo();
    T(14, 26, MODE_LABEL.heat, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 28, '🔍 확대경 속 ' + hs.nm + ' (' + hs.f + ')', 14.5, INK, 'left', 800);
    // 확대경
    const T0 = HT(hs, s.prog), ord = HORD(hs, s.prog), soft = HSOFT(hs, T0);
    const melt = hs.crystal ? (s.prog / PL[1]) : 0;
    ctx.save(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.clip();
    const bgc = ctx.createRadialGradient(g.cx - g.R * 0.3, g.cy - g.R * 0.3, g.R * 0.2, g.cx, g.cy, g.R); bgc.addColorStop(0, '#fbfdff'); bgc.addColorStop(1, '#e6eefb'); ctx.fillStyle = bgc; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
    const heatK = clamp((T0 - hs.T0) / (hs.T1 - hs.T0), 0, 1);
    const jit = hs.crystal ? (ord > 0.5 ? 0.008 + 0.022 * heatK : 0.045) : 0.01 + 0.05 * soft;
    drawParticles(hs.kind, g.cx, g.cy, g.R, ord, jit, t, hs.c);
    if (soft > 0.05) { ctx.fillStyle = 'rgba(255,170,60,' + soft * 0.12 + ')'; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2); }
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R + 5, 0.6, 2.4); ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.cx + g.R * 0.7, g.cy + g.R * 0.72); ctx.lineTo(g.cx + g.R * 1.05, g.cy + g.R * 1.1); ctx.stroke(); ctx.lineCap = 'butt';
    if (h.run) D.flame(g.cx, g.cy + g.R + 38, 30 + 10 * Math.sin(t * 5), t);
    // 범례 (이온)
    if (hs.kind === 'salt') { D.sphere(L.x + 20, g.cy + g.R + 26, 6, '#f59e0b', { gloss: false }); T(L.x + 32, g.cy + g.R + 31, 'Na⁺', 13, INK, 'left', 800); D.sphere(L.x + 80, g.cy + g.R + 26, 8, '#22b14c', { gloss: false }); T(L.x + 94, g.cy + g.R + 31, 'Cl⁻', 13, INK, 'left', 800); }
    // 상태 줄
    const yy = g.cy + g.R + (PHONE ? 52 : 56);
    const ordTxt = hs.crystal ? (ord > 0.5 ? '입자가 규칙적으로 배열 (결정)' : '입자 배열이 흐트러졌어요 (액체)') : '입자가 불규칙하게 배열 (비결정)';
    T(L.x + L.w / 2, yy, ordTxt, 14.5, ord > 0.5 ? BLU : '#b45309', 'center', 800);
    T(L.x + L.w / 2, yy + 24, stateTxt(hs, s), 14, INK, 'center', 800);
    // 온도 막대
    const bx = L.x + 18, bw = L.w - 36, by = yy + 40;
    D.roundRect(bx, by, bw, 16, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, 16, 8); ctx.clip(); const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#3867f4'); gr.addColorStop(1, '#e2464b'); ctx.fillStyle = gr; ctx.fillRect(bx, by, bw * clamp((T0 - hs.T0) / (hs.T1 - hs.T0), 0, 1), 16); ctx.restore();
    T(bx, by + 34, '온도 ' + sgn(Math.round(T0)) + ' °C', 14, INK, 'left', 800);
    T(bx + bw, by + 34, s.done ? '가열 끝 ✅' : h.run ? '가열하는 중…' : '🔥 가열하기를 눌러요', 13.5, s.done ? '#14803f' : MUTED, 'right', 800);
    void melt;
    // 오른쪽: 가열 곡선 6개
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 26, '📈 가열 곡선 (일정한 화력)', 14.5, INK, 'left', 800);
    HK.forEach((k, i) => {
      const c = cellRC(i), q = HS[k], sp = hSm(k), on = k === h.cur;
      D.roundRect(c.x, c.y, c.w, c.h, 10); ctx.fillStyle = on ? '#f3ecff' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = on ? PUR : '#dbe3f3'; ctx.lineWidth = on ? 2.6 : 1.4; ctx.stroke();
      T(c.x + 8, c.y + 18, q.nm + ' ' + q.f, 13, INK, 'left', 800);
      if (sp.tag) T(c.x + c.w - 8, c.y + 18, sp.tag === 'crystal' ? (q.crystal ? '💎 ✅' : '💎 ❌') : (!q.crystal ? '🌫️ ✅' : '🌫️ ❌'), 13, INK, 'right', 800);
      const px = c.x + 36, py = c.y + 28, pw = c.w - 46, ph = c.h - 50;
      ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
      const Y = (v) => py + ph - (v - q.T0) / (q.T1 - q.T0) * ph;
      T(px - 4, py + 6, String(q.T1), 12.5, MUTED, 'right', 700); T(px - 4, py + ph, sgn(q.T0), 12.5, MUTED, 'right', 700);
      if (q.soft) { const y1 = Y(q.soft[1]), y0 = Y(q.soft[0]); ctx.fillStyle = 'rgba(245,158,11,.16)'; ctx.fillRect(px, y1, pw, y0 - y1); }
      if (q.crystal && sp.prog > PL[0]) { const yy2 = Y(q.mp); ctx.strokeStyle = 'rgba(56,103,244,.28)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, yy2); ctx.lineTo(px + pw, yy2); ctx.stroke(); ctx.setLineDash([]); }
      if (sp.trace.length > 1) { ctx.strokeStyle = q.crystal ? BLU : '#e2464b'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); sp.trace.forEach((pt, j) => { const x = px + pt[0] * pw, y = Y(pt[1]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); const last = sp.trace[sp.trace.length - 1]; D.sphere(px + last[0] * pw, Y(last[1]), 4.5, q.crystal ? BLU : '#e2464b', { gloss: false }); }
      if (sp.done) {
        if (q.crystal) { const yy3 = Y(q.mp); D.label(px + pw * 0.8, yy3 - 14 + (q.mp > (q.T0 + q.T1) / 2 ? 22 : 0), '평탄 구간 ' + q.mp + ' °C', { size: 12, bg: BLU, align: 'center', pad: 5 }); }
        else T(px + pw / 2, py + ph - 8, '평탄 구간 없음', 12.5, '#b91c1c', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      }
      T(c.x + c.w / 2, c.y + c.h - 4, '시간 →', 12, MUTED, 'center', 700);
    });
  }
  HK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.textContent = HS[k].nm; $('#hChips').appendChild(bt); });
  function setHeatCur(k) { if (S.heat.run) { showHint('가열이 끝난 뒤에 다른 시료를 골라요.', 2600); return; } S.heat.cur = k; S.fade = 0.4; updateCtl(); }
  $('#hChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); setHeatCur(bt.dataset.v); });
  $('#bHeat').addEventListener('click', () => {
    const h = S.heat; if (h.run) return; Sound.click(); const s = hSm(); s.prog = 0; s.done = false; s.trace = []; s.tag = null; h.run = h.cur; updateCtl();
  });
  $('#bFast').addEventListener('click', () => { Sound.click(); S.heat.fast = !S.heat.fast; updateCtl(); });
  function tagIt(kind) {
    const h = S.heat, s = hSm(), hs = hCur(); if (!s.done) return; Sound.click(); s.tag = kind;
    const ok = (kind === 'crystal') === hs.crystal;
    if (ok) { Sound.success(); h.msg = ''; } else { Sound.fail(); s.wrongT = 1; h.msg = hs.crystal ? hs.nm + ' 곡선에는 온도가 일정한 평탄 구간이 있어요. 다시 살펴봐요.' : hs.nm + ' 곡선에는 평탄 구간이 없이 계속 올라가요. 다시 살펴봐요.'; h.msgT = 4; showHint(h.msg, 4200); }
    updateCtl();
  }
  $('#tagC').addEventListener('click', () => tagIt('crystal'));
  $('#tagA').addEventListener('click', () => tagIt('amorph'));

  /* ================= ② 네 가지 결정 ================= */
  const tL = () => (PHONE ? Object.assign({}, RC.types.L, { h: S.sub.types === 'look' ? 760 : 700 }) : RC.types.L);
  function modelRects(L) {
    if (PHONE) return { m: { x: L.x + 10, y: L.y + 44, w: 444, h: 330 }, info: { x: L.x + 10, y: L.y + 388, w: 444, h: L.h - 398 } };
    return { m: { x: L.x + 14, y: L.y + 44, w: 490, h: 430 }, info: { x: L.x + 520, y: L.y + 44, w: 242, h: L.h - 56 } };
  }
  function drawModel(type, rc, t) {
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.fillStyle = '#f7f9ff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(rc.x, rc.y, rc.w, rc.h); ctx.clip();
    const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2 - 6, R = Math.min(rc.w, rc.h) * 0.46, col = TY[type].col;
    const wob = (i) => (RM ? 0 : Math.sin(t * 2.4 + i * 1.9) * 1.6);
    if (type === 'ion') {
      const sp = R * 0.34, P = [];
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) P.push([cx + (i - 2.5) * sp, cy + (j - 2.5) * sp, (i + j) % 2]);
      ctx.strokeStyle = 'rgba(56,103,244,.55)'; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 10;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const a = P[j * 6 + i]; if (i < 5) { const b = P[j * 6 + i + 1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } if (j < 5) { const b = P[(j + 1) * 6 + i]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      ctx.setLineDash([]);
      P.forEach((p, i) => D.sphere(p[0] + wob(i) * 0.5, p[1] + wob(i + 3) * 0.5, p[2] ? 17 : 12, p[2] ? '#22b14c' : '#f59e0b', { gloss: true, text: p[2] ? '−' : '+', textScale: 1.3 }));
      D.label(cx, rc.y + rc.h - 22, '양이온(+)과 음이온(−)이 이온 결합(점선)으로 규칙적으로 배열', { size: 13, bg: TY.ion.col, align: 'center' });
    } else if (type === 'mol') {
      const sp = R * 0.42, P = [];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) P.push([cx + (i - 1.5) * sp + (j % 2) * sp * 0.5 - sp * 0.25, cy + (j - 1.5) * sp * 0.86]);
      ctx.strokeStyle = 'rgba(14,165,164,.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) if (Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]) < sp * 1.15) { ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); }
      ctx.setLineDash([]);
      P.forEach((p, i) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; [0.95, -0.95].forEach((o) => { ctx.beginPath(); ctx.moveTo(p[0] + wob(i), p[1] + wob(i + 2)); ctx.lineTo(p[0] + wob(i) + Math.cos(o) * 22, p[1] + wob(i + 2) + Math.sin(o) * 22); ctx.stroke(); }); bentMol(p[0] + wob(i), p[1] + wob(i + 2), 0, 4.4, '#38bdf8'); });
      D.label(cx, rc.y + rc.h - 22, '분자(실선: 공유 결합)가 약한 분자 간 힘(점선)으로 모여 규칙적으로 배열', { size: 13, bg: TY.mol.col, align: 'center' });
    } else if (type === 'cov') {
      const sp = R * 0.34, P = [];
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) P.push([cx + (i - 2.5) * sp, cy + (j - 2.5) * sp]);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const a = P[j * 6 + i]; if (i < 5) { const b = P[j * 6 + i + 1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } if (j < 5) { const b = P[(j + 1) * 6 + i]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      ctx.lineCap = 'butt';
      P.forEach((p, i) => D.sphere(p[0] + wob(i) * 0.3, p[1] + wob(i + 1) * 0.3, 13, '#7c3aed', { gloss: true }));
      D.label(cx, rc.y + rc.h - 22, '원자들이 공유 결합(실선)으로 그물처럼 끝없이 이어져 있어요', { size: 13, bg: TY.cov.col, align: 'center' });
    } else {
      const sp = R * 0.36, P = [];
      for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) P.push([cx + (i - 2) * sp + (j % 2) * sp * 0.5 - sp * 0.25, cy + (j - 2.5) * sp * 0.86]);
      for (let k = 0; k < 44; k++) { const a = k * 2.399, rr = 0.2 + ((k * 37) % 100) / 100, x = cx + Math.cos(a + t * (0.5 + (k % 5) * 0.12)) * R * 0.95 * Math.min(1, rr), y = cy + Math.sin(a * 1.3 + t * (0.4 + (k % 4) * 0.15)) * R * 0.85 * Math.min(1, rr); D.sphere(x, y, 3.6, '#fde047', { gloss: false }); }
      P.forEach((p, i) => D.sphere(p[0] + wob(i) * 0.4, p[1] + wob(i + 4) * 0.4, 15, '#d97706', { gloss: true, text: '+', textScale: 1.1 }));
      D.label(cx, rc.y + rc.h - 22, '금속 양이온(+)이 자유 전자(●)의 바다에 잠겨 있어요 (금속 결합)', { size: 13, bg: TY.metal.col, align: 'center' });
    }
    ctx.restore();
    T(rc.x + 12, rc.y + 22, '🔍 ' + TY[type].nm + ' (2차원 모형)', 13.5, TY[type].col, 'left', 800);
  }
  function drawTypeLook(L, t) {
    const R0 = modelRects(L), ty = S.types.cur, I = R0.info, q = TY[ty];
    drawModel(ty, R0.m, t);
    D.roundRect(I.x, I.y, I.w, I.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = q.col; ctx.lineWidth = 2.4; ctx.stroke();
    T(I.x + 14, I.y + 28, q.nm, 17, q.col, 'left', 800);
    let y = I.y + 50;
    [['구성 입자', q.unit], ['결합', q.bond], ['예', q.ex]].forEach(([k, v]) => { T(I.x + 14, y, k, 13, MUTED, 'left', 800); y += 17; y += textBlock(I.x + 14, y, I.w - 28, v, 13.5, INK, 18.5, 800) + 8; });
    textBlock(I.x + 14, y + 2, I.w - 28, q.note, 13, q.col, 18, 800);
  }
  /* ---------- 분류 카드 ---------- */
  const CW = PHONE ? 78 : 82, CH = 44;
  const sortRC = () => {
    const L = tL();
    if (PHONE) { const bw = 226, bh = 190, gap = 8, x0 = L.x + (L.w - 2 * bw - gap) / 2, by = L.y + 44; return { L, bins: [0, 1, 2, 3].map((i) => ({ x: x0 + (i % 2) * (bw + gap), y: by + Math.floor(i / 2) * (bh + gap), w: bw, h: bh })), trayY: by + 2 * bh + gap + 38 }; }
    const bw = 184, gap = 6, bh = 232, x0 = L.x + (L.w - 4 * bw - 3 * gap) / 2, by = L.y + 44;
    return { L, bins: [0, 1, 2, 3].map((i) => ({ x: x0 + i * (bw + gap), y: by, w: bw, h: bh })), trayY: by + bh + 36 };
  };
  const homeOf = (idx) => {
    const rc = sortRC(), per = PHONE ? 4 : 6, gx = 8, x0 = rc.L.x + (rc.L.w - (per * CW + (per - 1) * gx)) / 2;
    return [x0 + (idx % per) * (CW + gx), rc.trayY + Math.floor(idx / per) * (CH + 8)];
  };
  function slotOf(binIdx, k, n) {
    const rc = sortRC(), b = rc.bins[binIdx], cols = 2, tw = cols * CW + (cols - 1) * 6, x0 = b.x + (b.w - tw) / 2, rows = Math.max(1, Math.ceil(n / cols));
    const rowH = Math.min(CH + 6, (b.h - 64) / rows);
    return [x0 + (k % cols) * (CW + 6), b.y + 58 + Math.floor(k / cols) * rowH];
  }
  function cardsInit() {
    S.types.cards = CARDS.map((c, i) => { const h = homeOf(i); return { id: c.id, f: c.f, hint: c.hint, ans: c.ans, x: h[0], y: h[1], tx: h[0], ty: h[1], bin: null, seq: 0, lift: 0, shake: 0, flag: false, drag: false }; });
    S.types.sel = null;
  }
  function cardsLayout() {
    const F = S.types;
    for (let b = 0; b < 4; b++) { const list = F.cards.filter((c) => c.bin === b).sort((a, c) => a.seq - c.seq); list.forEach((c, k) => { if (!c.drag) { const s = slotOf(b, k, list.length); c.tx = s[0]; c.ty = s[1]; } }); }
    F.cards.forEach((c, i) => { if (c.bin === null && !c.drag) { const h = homeOf(i); c.tx = h[0]; c.ty = h[1]; } });
  }
  function placeCard(c, b) {
    c.bin = b; c.seq = ++S.types.seq; c.flag = false; cardsLayout();
    const rc = sortRC(); if (b !== null && !RM) parts.burst(rc.bins[b].x + rc.bins[b].w / 2, rc.bins[b].y + 40, { count: 6, speed: 70, life: 0.45, colors: [TY[TK[b]].col], gravity: 100, size: 3 });
    updateCtl();
  }
  function stepCards(dt) {
    S.types.cards.forEach((c) => {
      if (!c.drag) { c.x = SciSim.approach(c.x, c.tx, dt, 12); c.y = SciSim.approach(c.y, c.ty, dt, 12); }
      c.lift = SciSim.approach(c.lift, c.drag || S.types.sel === c.id ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 2.5);
    });
  }
  function drawCard(c) {
    const sx = c.shake > 0 ? Math.sin(c.shake * 40) * 4 * c.shake : 0, lf = c.lift;
    ctx.save(); ctx.translate(c.x + CW / 2 + sx, c.y + CH / 2 - lf * 5); const sc = 1 + lf * 0.07; ctx.scale(sc, sc);
    D.shadow(() => { D.roundRect(-CW / 2, -CH / 2, CW, CH, 11); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + lf * 10, y: 2 + lf * 5 });
    D.roundRect(-CW / 2, -CH / 2, CW, CH, 11); ctx.strokeStyle = c.flag ? BAD : S.types.sel === c.id ? PUR : c.bin !== null ? TY[TK[c.bin]].col : '#c9d2df'; ctx.lineWidth = c.flag || S.types.sel === c.id ? 3 : 2; ctx.stroke();
    ctx.save(); ctx.font = D.font(16, 800); const w = ctx.measureText(c.f).width; ctx.restore();
    T(0, 6, c.f, w > CW - 10 ? 14 : 16, INK, 'center', 800);
    ctx.restore();
  }
  function drawSort(L, t) {
    const F = S.types, rc = sortRC();
    rc.bins.forEach((b, i) => {
      const q = TY[TK[i]];
      D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(q.col, 0.08); ctx.fill(); ctx.strokeStyle = q.col; ctx.lineWidth = 2.4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(b.x + b.w / 2, b.y + 24, q.nm, 15.5, q.col, 'center', 800);
      T(b.x + b.w / 2, b.y + 44, i === 0 ? '이온 결합' : i === 1 ? '분자 간 힘' : i === 2 ? '공유 결합 그물' : '금속 결합', 13, MUTED, 'center', 700);
      if (F.sel !== null && !F.cards.some((c) => c.drag)) { const a = 0.35 + 0.25 * Math.sin(t * 5); ctx.save(); ctx.strokeStyle = C.rgba(q.col, a); ctx.lineWidth = 4; D.roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 16); ctx.stroke(); ctx.restore(); }
    });
    const placed = F.cards.filter((c) => c.bin !== null).length;
    T(L.x + 16, rc.trayY - 12, '🗂️ 대표 물질 카드 12장 (끌어서 상자에 놓아요)', 13.5, INK, 'left', 800);
    T(L.x + L.w - 16, rc.trayY - 12, '분류한 카드 ' + placed + ' / 12', 13.5, placed === 12 ? '#14803f' : MUTED, 'right', 800);
    F.cards.filter((c) => !c.drag).forEach(drawCard); F.cards.filter((c) => c.drag).forEach(drawCard);
    const cur = F.cards.find((c) => c.drag) || F.cards.find((c) => c.id === F.sel);
    const ty0 = rc.trayY + (PHONE ? 3 * (CH + 8) : 2 * (CH + 8)) + 6;
    if (cur) { D.roundRect(L.x + 12, ty0, L.w - 24, 26, 13); ctx.fillStyle = '#f7f3ff'; ctx.fill(); T(L.x + 22, ty0 + 18, cur.f + ' · ' + cur.hint, 13.5, PUR, 'left', 800); }
    textBlock(L.x + 16, ty0 + 48, L.w - 32, '구성 입자와 결합을 떠올려요. 이온 결합이면 이온 결정, 분자 사이의 힘이면 분자 결정, 원자가 공유 결합으로 이어졌으면 공유 결정, 자유 전자가 있으면 금속 결정이에요.', 13, MUTED, 18, 700);
  }
  TK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.innerHTML = '<span style="color:' + TY[k].col + '">●</span> ' + TY[k].nm; bt.style.fontSize = '13.5px'; $('#tChips').appendChild(bt); });
  $('#tChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.types.cur = bt.dataset.v; S.types.seen = S.types.seen || {}; S.types.seen[bt.dataset.v] = true; S.fade = 0.5; updateCtl(); });
  $('#tSub').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.sub.types = bt.dataset.v; S.fade = 0.6; cardsLayout(); updateCtl(); });
  $('#bCardsReset').addEventListener('click', () => { Sound.click(); cardsInit(); cardsLayout(); updateCtl(); });

  /* ================= ③ 성질 시험 ================= */
  const bL = () => (PHONE ? Object.assign({}, RC.bench.L, { h: S.sub.bench === 'rig' ? 800 : S.sub.bench === 'log' ? 560 : 640 }) : RC.bench.L);
  function rigRects(L) {
    if (PHONE) return { rig: { x: L.x + 10, y: L.y + 44, w: 444, h: 330 }, res: { x: L.x + 10, y: L.y + 384, w: 444, h: 96 }, info: { x: L.x + 10, y: L.y + 490, w: 444, h: L.h - 500 } };
    return { rig: { x: L.x + 14, y: L.y + 44, w: 490, h: 340 }, res: { x: L.x + 14, y: L.y + 394, w: 490, h: 92 }, info: { x: L.x + 520, y: L.y + 44, w: 242, h: L.h - 56 } };
  }
  const SBLK = { nacl: '#f1f5f9', cacl2: '#f4f1ea', sugar: '#fffdf5', naph: '#e8ecef', dia: '#d7f0ff', quartz: '#e6eef7', cu: '#d98a45', fe: '#8d96a3' };
  const fmtC = (v) => (v === 1 ? '○' : v === 0 ? '×' : '—');
  function benchResult(id, test) {
    const sp = SP[id];
    if (test === 'mp') return { val: sp.mpTxt, txt: sp.nm + '의 녹는점은 ' + sp.mpTxt + '예요.' + (id === 'dia' ? ' 일반 압력에서는 녹지 않고 승화해요.' : id === 'sugar' ? ' 녹으면서 갈색으로 변해요.' : sp.mpHigh ? ' 녹는점이 높아요.' : ' 녹는점이 낮아요.') };
    if (test === 'hammer') return { val: sp.hammer, txt: sp.hammer === 'flat' ? sp.nm + ': 부서지지 않고 얇게 펴져요. (펴짐)' : sp.hard ? sp.nm + ': 매우 단단해서 쉽게 깨지지 않지만 세게 치면 조각나요. (부서짐)' : sp.nm + ': 와르르 부서져요. (부서짐)' };
    const v = sp[test];
    if (test === 'solid') return { val: v, txt: v ? '고체 상태에서도 전구가 켜져요. 전류가 흘러요. (○)' : '고체 상태에서는 전구가 켜지지 않아요. 전류가 흐르지 않아요. (×)' };
    if (test === 'liquid') {
      if (id === 'dia') return { val: 0, txt: '3500 °C 이상이라 녹일 수 없어요. 자유롭게 움직이는 전하가 없으니 전류가 흐르지 않아요. (×)' };
      if (id === 'quartz') return { val: 0, txt: '1713 °C로 녹여도 전구가 켜지지 않아요. (×)' };
      if (id === 'sugar') return { val: 0, txt: '설탕은 녹으며 분해되기 시작하지만 전구가 켜지지 않아요. (×)' };
      return { val: v, txt: v ? '녹인 액체에서는 전구가 켜져요. 전류가 흘러요. (○)' : '녹여도 전구가 켜지지 않아요. (×)' };
    }
    if (v === -1) return { val: -1, txt: sp.nm + '은(는) 물에 녹지 않아요. 수용액 시험은 해당 없음이에요. (—)' };
    return { val: v, txt: v ? '물에 녹인 수용액에서 전구가 켜져요. (○)' : '물에 녹지만 전구가 켜지지 않아요. (×)' };
  }
  const DUR = 3.4;
  function startTest(test) {
    const b = S.bench; if (b.anim && !b.anim.done) return;
    Sound.click(); b.x = test; b.anim = { test, id: b.cur, t: 0, done: false, rec: false }; updateCtl();
  }
  function stepBench(dt) {
    const b = S.bench, a = b.anim; if (!a) return;
    a.t += dt;
    if (!a.rec && a.t > 1.9) { a.rec = true; b.log[a.id][a.test] = benchResult(a.id, a.test).val; Sound.success(); updateCtl(); }
    if (a.t > DUR && !a.done) { a.done = true; updateCtl(); }
  }
  function wireLoop(pts, t, on) {
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    if (!on) return;
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    const n = Math.round(tot / 26);
    for (let k = 0; k < n; k++) {
      let d = ((k / n + (RM ? 0 : t * 0.5)) % 1) * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const u = d / seg[i], x = lerp(pts[i][0], pts[i + 1][0], u), y = lerp(pts[i][1], pts[i + 1][1], u);
      D.sphere(x, y, 4, '#fde047', { gloss: false, outline: '#b45309', outlineWidth: 1 });
    }
  }
  function drawRig(rc, t) {
    const b = S.bench, a = b.anim, sp = SP[b.cur];
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.fillStyle = '#f3f6fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#d7dee9'; ctx.fillRect(rc.x + 4, rc.y + rc.h - 44, rc.w - 8, 40);          // 실험대
    T(rc.x + 12, rc.y + 22, '🧪 시험대 · ' + sp.nm, 13.5, INK, 'left', 800);
    if (!a) { T(rc.x + rc.w / 2, rc.y + rc.h / 2 - 20, '시험을 고르면 시험대에서 실험을 해 보여요', 15, MUTED, 'center', 800); sampleBlock(rc.x + rc.w / 2, rc.y + rc.h / 2 + 30, 1, 0, sp, t); return; }
    const test = a.test, res = benchResult(a.id, test), spA = SP[a.id], p = clamp(a.t / DUR, 0, 1);
    const ox = rc.x, oy = rc.y;
    if (test === 'solid' || test === 'liquid' || test === 'aq') {
      const on = res.val === 1 && a.t > 0.9;
      // 건전지, 전구
      const bx = ox + 54, by = oy + 130;
      D.roundRect(bx - 20, by, 40, 78, 7); ctx.fillStyle = '#334155'; ctx.fill(); ctx.fillStyle = '#e2464b'; ctx.fillRect(bx - 20, by, 40, 18); T(bx, by + 52, '전지', 13, '#e2e8f0', 'center', 800);
      const lx = ox + rc.w * 0.44, ly = oy + 80;
      if (on) D.glow(lx, ly, 60, '#fde047', 0.85);
      ctx.fillStyle = on ? '#fff3a3' : '#eef1f5'; ctx.beginPath(); ctx.arc(lx, ly, 24, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = on ? '#f59e0b' : '#9aa5b6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx - 8, ly + 12); ctx.quadraticCurveTo(lx, ly - 12, lx + 8, ly + 12); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.fillRect(lx - 12, ly + 24, 24, 12);
      // 시료 용기와 전극
      const vx = ox + rc.w * 0.74, vy = oy + rc.h - 44, ex1 = vx - 46, ex2 = vx + 46, etop = oy + 150;
      const wire1 = [[bx - 10, by], [bx - 10, ly], [lx - 24, ly]];
      const wire2 = [[lx + 24, ly], [ex1, ly], [ex1, etop]];
      const wire3 = [[ex2, etop], [ex2, oy + 100], [ox + rc.w - 16, oy + 100], [ox + rc.w - 16, by + 100], [bx + 10, by + 100], [bx + 10, by + 78]];
      [wire1, wire2, wire3].forEach((w) => wireLoop(w, a.t, on));
      // 전극
      ctx.fillStyle = '#9aa3b2'; ctx.fillRect(ex1 - 5, etop, 10, vy - etop - 20); ctx.fillRect(ex2 - 5, etop, 10, vy - etop - 20);
      if (test === 'solid') {
        sampleBlock(vx, vy - 46, 1.3, 0, spA, t, 80, 70);
        T(vx, vy + 22, '고체 시료', 13, MUTED, 'center', 700);
      } else if (test === 'liquid') {
        D.shadow(() => { ctx.beginPath(); ctx.moveTo(vx - 62, vy - 76); ctx.lineTo(vx + 62, vy - 76); ctx.lineTo(vx + 46, vy - 6); ctx.lineTo(vx - 46, vy - 6); ctx.closePath(); ctx.fillStyle = '#cfd6e0'; ctx.fill(); }, { blur: 5, y: 2 });
        const melt = sm((a.t - 0.2) / 1.2);
        ctx.fillStyle = C.mix(SBLK[a.id], '#ff9a3c', melt); ctx.beginPath(); ctx.moveTo(vx - 56, vy - 52); ctx.lineTo(vx + 56, vy - 52); ctx.lineTo(vx + 44, vy - 10); ctx.lineTo(vx - 44, vy - 10); ctx.closePath(); ctx.fill();
        if (melt > 0.2 && !RM) D.glow(vx, vy - 40, 70, '#ff9a3c', 0.35 * melt);
        D.flame(vx, vy + 18, 34 + 6 * Math.sin(t * 6), t); T(vx, vy + 40, a.id === 'dia' ? '(녹일 수 없어요)' : '녹인 액체', 13, MUTED, 'center', 700);
      } else {
        const ins = spA.aq === -1;
        D.beaker(vx - 62, vy - 90, 124, 84, { level: 0.65, liquid: '#7cc4ff', t });
        if (ins) { for (let k = 0; k < 6; k++) D.sphere(vx - 40 + k * 15, vy - 14, 6, SBLK[a.id], { gloss: false, outline: '#8a95a8', outlineWidth: 1 }); }
        else if (!RM) for (let k = 0; k < 8; k++) { const ph = (t * 0.7 + k * 0.37) % 1; D.sphere(vx - 40 + (k * 11) % 80, vy - 60 + ph * 30, 3, spA.type === 'ion' ? (k % 2 ? '#22b14c' : '#f59e0b') : '#38bdf8', { gloss: false }); }
        T(vx, vy + 22, ins ? '물에 녹지 않아요' : '물에 녹인 수용액', 13, MUTED, 'center', 700);
      }
      // 결과 표지
      if (a.t > 1.9) D.label(lx, ly + 60, on ? '전류가 흘러요 ○' : res.val === -1 ? '시험 해당 없음 —' : '전류가 흐르지 않아요 ×', { size: 13, bg: on ? GOOD : res.val === -1 ? '#64748b' : BAD, align: 'center' });
    } else if (test === 'mp') {
      const cx0 = ox + rc.w * 0.4, cy0 = oy + rc.h - 110, Tcur = lerp(25, spA.mp, sm(a.t / 2.2)), meltp = clamp((a.t - 1.6) / 0.8, 0, 1);
      D.shadow(() => { ctx.beginPath(); ctx.moveTo(cx0 - 70, cy0 - 70); ctx.lineTo(cx0 + 70, cy0 - 70); ctx.lineTo(cx0 + 52, cy0); ctx.lineTo(cx0 - 52, cy0); ctx.closePath(); ctx.fillStyle = '#cfd6e0'; ctx.fill(); }, { blur: 5, y: 2 });
      if (a.id === 'dia' || a.id === 'quartz' && false) { sampleBlock(cx0, cy0 - 40, 1.1, 0, spA, t, 70, 40); }
      else if (meltp > 0) { ctx.fillStyle = C.mix(a.id === 'sugar' ? '#b9722a' : '#ff9a3c', '#ff9a3c', 0.3); ctx.beginPath(); ctx.moveTo(cx0 - 62, cy0 - 30 - 12 * (1 - meltp)); ctx.lineTo(cx0 + 62, cy0 - 30 - 12 * (1 - meltp)); ctx.lineTo(cx0 + 48, cy0 - 4); ctx.lineTo(cx0 - 48, cy0 - 4); ctx.closePath(); ctx.fill(); }
      else sampleBlock(cx0, cy0 - 40, 1.1, 0, spA, t, 70, 40);
      D.flame(cx0, cy0 + 40, 40 + 8 * Math.sin(t * 6), t);
      D.roundRect(cx0 - 60, cy0 + 44, 120, 8, 4); ctx.fillStyle = '#64748b'; ctx.fill();
      const tmax = Math.ceil(spA.mp * 1.2 / 50) * 50; D.thermometer(ox + rc.w * 0.8, oy + 60, 190, clamp(Tcur, 0, tmax), 0, tmax, { step: Math.round(tmax / 4 / 10) * 10 || tmax / 4, color: '#e2464b' });
      T(ox + rc.w * 0.8, oy + 50, Math.round(Tcur) + ' °C', 15, INK, 'center', 800);
      if (a.t > 1.9) D.label(cx0, oy + 66, a.id === 'dia' ? '녹지 않아요 (승화 · 고압에서 약 3550 °C)' : '녹았어요! 녹는점 ' + spA.mpTxt, { size: 13, bg: '#b45309', align: 'center' });
    } else {
      const ax = ox + rc.w * 0.5, ay = oy + rc.h - 70, bt = a.t;
      D.roundRect(ax - 62, ay, 124, 26, 5); ctx.fillStyle = '#64748b'; ctx.fill();
      const hit = bt > 0.85;
      // 시료
      if (!hit) sampleBlock(ax, ay - 28, 1.2, 0, spA, t, 66, 52);
      else if (res.val === 'flat') { const k = sm((bt - 0.85) / 0.35); sampleBlock(ax, ay - 14 - 14 * (1 - k), 1.2, 0, spA, t, 66 + 56 * k, 52 - 36 * k); }
      else { const k = clamp((bt - 0.85) / 1.0, 0, 1); for (let i = 0; i < 8; i++) { const an = -0.6 - i * 0.28, v = 90 + (i % 3) * 25; sampleBlock(ax + Math.cos(an) * v * k * (i % 2 ? 1 : -1), ay - 18 + Math.sin(an) * v * k * 0.5 + 60 * k * k, 0.6, an * k * 4, spA, t, 22, 18); } }
      // 망치
      const ang = bt < 0.6 ? -1.1 + bt * 0.3 : bt < 0.85 ? lerp(-0.92, 0.15, (bt - 0.6) / 0.25) : 0.15 - 0.05 * Math.min(1, (bt - 0.85) * 3);
      ctx.save(); ctx.translate(ax + 70, ay - 90); ctx.rotate(ang); ctx.fillStyle = '#a16207'; ctx.fillRect(-70, -4, 80, 8); ctx.fillStyle = '#475569'; D.roundRect(-84, -22, 40, 44, 6); ctx.fill(); ctx.restore();
      if (hit && bt < 1.4 && !RM) D.spark(ax, ay - 30, 18, t * 2, '#fff6c2');
      if (a.t > 1.9) D.label(ax, oy + 54, res.val === 'flat' ? '펴져요 (부서지지 않아요)' : '부서져요', { size: 13, bg: res.val === 'flat' ? '#b45309' : '#475569', align: 'center' });
    }
  }
  function sampleBlock(x, y, s, rot, sp, t, w, h) {
    w = w || 40 * s; h = h || 30 * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 6); ctx.fillStyle = SBLK[sp.id] || '#ddd'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.4; D.roundRect(-w / 2, -h / 2, w, h, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 4, w * 0.5, 4);
    ctx.restore();
  }
  function drawBenchInfo(I) {
    const b = S.bench, sp = SP[b.cur], q = TY[sp.type];
    D.roundRect(I.x, I.y, I.w, I.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = q.col; ctx.lineWidth = 2.2; ctx.stroke();
    T(I.x + 14, I.y + 28, sp.nm, 17, INK, 'left', 800);
    D.label(I.x + I.w - 14, I.y + 24, q.nm, { size: 12.5, bg: q.col, align: 'right', pad: 6 });
    T(I.x + 14, I.y + 54, '측정 기록', 13.5, MUTED, 'left', 800);
    XT.forEach(([k, nm], i) => {
      const y = I.y + 64 + i * 34, v = b.log[b.cur][k];
      D.roundRect(I.x + 10, y, I.w - 20, 28, 9); ctx.fillStyle = v === undefined ? '#f1f5f9' : '#e6f7ee'; ctx.fill();
      T(I.x + 20, y + 19, nm, 13.5, INK, 'left', 800);
      T(I.x + I.w - 20, y + 19, v === undefined ? '아직 안 했어요' : logTxt(k, v), 13.5, v === undefined ? MUTED : '#14803f', 'right', 800);
    });
  }
  const logTxt = (k, v) => (k === 'mp' ? v : k === 'hammer' ? (v === 'flat' ? '펴짐' : '부서짐') : fmtC(v));
  function drawBenchRig(L, t) {
    const R0 = rigRects(L), b = S.bench;
    drawRig(R0.rig, t);
    const r = R0.res;
    D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    const a = b.anim;
    if (a && a.t > 1.9) { T(r.x + 14, r.y + 24, '📋 ' + SP[a.id].nm + ' · ' + XT.find((x) => x[0] === a.test)[1].slice(2), 13.5, MUTED, 'left', 800); textBlock(r.x + 14, r.y + 48, r.w - 28, benchResult(a.id, a.test).txt, 14, INK, 19, 800); }
    else T(r.x + 14, r.y + 36, a ? '시험하는 중…' : '시료와 시험을 골라 실험해 보세요.', 14, MUTED, 'left', 800);
    drawBenchInfo(R0.info);
  }
  function drawBenchLog(L) {
    T(L.x + 16, L.y + 28, '📊 시료 8개의 측정 기록', 14.5, INK, 'left', 800);
    const x0 = L.x + 12, c0 = PHONE ? 92 : 130, cw = (L.w - 24 - c0) / 5, y0 = L.y + 46, hh = PHONE ? 46 : 38, rh = PHONE ? 54 : 48;
    XT.forEach(([k, nm], c) => { D.roundRect(x0 + c0 + c * cw + 2, y0, cw - 4, hh - 4, 8); ctx.fillStyle = '#f7f3ff'; ctx.fill(); textBlock(x0 + c0 + c * cw + cw / 2, y0 + 17, cw - 10, nm.slice(2), PHONE ? 12.5 : 13.5, INK, 15, 800, 'center'); });
    SPK.forEach((id, r) => {
      const y = y0 + hh + r * rh, sp = SP[id], q = TY[sp.type];
      D.roundRect(x0, y, c0 - 4, rh - 4, 8); ctx.fillStyle = C.rgba(q.col, 0.12); ctx.fill();
      T(x0 + 8, y + (PHONE ? 22 : 20), sp.nm, PHONE ? 13 : 14, INK, 'left', 800); T(x0 + 8, y + (PHONE ? 41 : 38), q.nm, 12.5, q.col, 'left', 800);
      XT.forEach(([k], c) => { const v = S.bench.log[id][k], xx = x0 + c0 + c * cw + 2; D.roundRect(xx, y, cw - 4, rh - 4, 8); ctx.fillStyle = v === undefined ? '#fff' : '#e6f7ee'; ctx.fill(); ctx.strokeStyle = '#e3e8f2'; ctx.lineWidth = 1; ctx.stroke(); textBlock(xx + (cw - 4) / 2, y + (rh - 4) / 2 + 2 - (k === 'mp' && v !== undefined && String(v).length > 8 ? 6 : 0), cw - 10, v === undefined ? '·' : logTxt(k, v), PHONE ? 12.5 : 14, v === undefined ? '#9aa5b6' : '#14803f', 15, 800, 'center'); });
    });
    T(L.x + 16, y0 + hh + 8 * rh + 18, '시험대에서 시험을 하면 이곳에 기록돼요. ○ 전류가 흘러요 · × 흐르지 않아요 · — 해당 없음', 13, MUTED, 'left', 700);
  }
  const tgeo = (L) => { const c0 = PHONE ? 80 : 108, cw = (L.w - 28 - c0) / 5, hh = PHONE ? 54 : 52, rh = PHONE ? 70 : 74; return { x0: L.x + 14, c0, cw, hh, rh, y0: L.y + 46 }; };
  function tcell(r, c, L) { const g = tgeo(L); return { x: g.x0 + g.c0 + c * g.cw + 3, y: g.y0 + g.hh + r * g.rh + 3, w: g.cw - 6, h: g.rh - 6 }; }
  const TSYM = (c, v) => TCOLS[c][2][v];
  function drawBenchTbl(L, t) {
    const b = S.bench, g = tgeo(L);
    T(L.x + 16, L.y + 28, '📋 네 가지 결정의 성질 비교표', 14.5, INK, 'left', 800);
    TCOLS.forEach(([k, nm], c) => { D.roundRect(g.x0 + g.c0 + c * g.cw + 3, g.y0, g.cw - 6, g.hh - 4, 8); ctx.fillStyle = '#f7f3ff'; ctx.fill(); textBlock(g.x0 + g.c0 + c * g.cw + g.cw / 2, g.y0 + 22, g.cw - 12, nm, PHONE ? 12.5 : 14, INK, 16, 800, 'center'); });
    TK.forEach((ty, r) => {
      const q = TY[ty], y = g.y0 + g.hh + r * g.rh + 3;
      D.roundRect(g.x0, y, g.c0 - 4, g.rh - 6, 8); ctx.fillStyle = C.rgba(q.col, 0.14); ctx.fill(); ctx.strokeStyle = q.col; ctx.lineWidth = 1.6; ctx.stroke();
      textBlock(g.x0 + (g.c0 - 4) / 2, y + (g.rh - 6) / 2 - 2, g.c0 - 12, q.nm, PHONE ? 13 : 14.5, q.col, 17, 800, 'center');
      for (let c = 0; c < 5; c++) {
        const k = tcell(r, c, L), v = b.tbl[ty][c], fl = b.flag[ty][c], sh = b.shake[ty][c] > 0 ? Math.sin(b.shake[ty][c] * 40) * 4 * b.shake[ty][c] : 0, sel = b.cellSel && b.cellSel[0] === ty && b.cellSel[1] === c;
        ctx.save(); ctx.translate(sh, 0); D.roundRect(k.x, k.y, k.w, k.h, 10); ctx.fillStyle = v === null ? '#fff' : '#f1f7ff'; ctx.fill(); ctx.strokeStyle = fl ? BAD : sel ? PUR : v === null ? '#c9d2df' : '#7aa2ff'; ctx.lineWidth = fl || sel ? 3 : 2; if (v === null) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
        const s = v === null ? '눌러서' : TSYM(c, v); T(k.x + k.w / 2, k.y + k.h / 2 + (v === null ? 5 : 8), s, v === null ? 12.5 : (s.length > 2 ? 16 : 26), v === null ? '#9aa5b6' : INK, 'center', 800); ctx.restore();
      }
    });
    const by = g.y0 + g.hh + 4 * g.rh + 12, cs = b.cellSel;
    if (cs && b.tbl[cs[0]][cs[1]] === TANS[cs[0]][cs[1]]) { D.roundRect(L.x + 14, by, L.w - 28, PHONE ? 74 : 54, 12); ctx.fillStyle = '#e6f7ee'; ctx.fill(); textBlock(L.x + 26, by + 22, L.w - 52, '✅ ' + TEXP[cs[0]], 13, '#14803f', 18, 800); }
    else textBlock(L.x + 16, by + 14, L.w - 32, '○ 전류가 흘러요 · × 흐르지 않아요 · — 해당 없음(물에 녹지 않아요). 시험대에서 얻은 기록을 떠올려 20칸을 모두 채워요.', 13, MUTED, 18, 700);
    void t;
  }
  function drawBench(t) {
    const L = bL();
    T(14, 26, MODE_LABEL.bench, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    if (S.sub.bench === 'rig') drawBenchRig(L, t); else if (S.sub.bench === 'log') drawBenchLog(L); else drawBenchTbl(L, t);
  }
  SPK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.textContent = SP[k].nm; bt.style.fontSize = '13.5px'; $('#sChips').appendChild(bt); });
  XT.forEach(([k, nm]) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.textContent = nm; bt.style.fontSize = '13.5px'; $('#xChips').appendChild(bt); });
  $('#sChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); if (S.bench.anim && !S.bench.anim.done) return; S.bench.cur = bt.dataset.v; S.bench.anim = null; S.fade = 0.4; updateCtl(); });
  $('#xChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; startTest(bt.dataset.v); });
  $('#bSub').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.sub.bench = bt.dataset.v; S.fade = 0.5; updateCtl(); });
  $('#bTblReset').addEventListener('click', () => { Sound.click(); TK.forEach((k) => { S.bench.tbl[k] = [null, null, null, null, null]; S.bench.flag[k] = [false, false, false, false, false]; }); S.bench.cellSel = null; updateCtl(); });
  function benchTap(p) {
    if (S.sub.bench !== 'tbl') return false;
    const L = bL(), b = S.bench;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const k = tcell(r, c, L);
      if (inRect(p, k)) { Sound.click(); const ty = TK[r], n = TCOLS[c][2].length, v = b.tbl[ty][c]; b.tbl[ty][c] = v === null ? 0 : v + 1 >= n ? null : v + 1; b.flag[ty][c] = false; b.cellSel = [ty, c]; updateCtl(); return true; }
    }
    return false;
  }

  /* ================= ④ 미지 시료 분류 ================= */
  const cLy = () => {
    const L = RC.cls.L;
    if (PHONE) return { L: Object.assign({}, L, { h: 800 }), data: { x: L.x + 10, y: L.y + 44, w: 444, h: 236 }, flow: { x: L.x + 10, y: L.y + 292, w: 444, h: 440 } };
    return { L, data: { x: L.x + 14, y: L.y + 44, w: 318, h: 440 }, flow: { x: L.x + 344, y: L.y + 44, w: 418, h: 440 } };
  };
  const NODES = [
    { q: '고체 상태에서 전기가 통하나요?', yes: 'metal', short: '고체 전도' },
    { q: '녹는점이 낮은가요? (약 150 °C 이하)', yes: 'mol', short: '녹는점' },
    { q: '녹인 액체(또는 수용액)에서 전기가 통하나요?', yes: 'ion', no: 'cov', short: '액체·수용액 전도' },
  ];
  function leafOf(path) {
    if (path.length >= 1 && path[0] === 'yes') return 'metal';
    if (path.length >= 2 && path[1] === 'yes') return 'mol';
    if (path.length >= 3) return path[2] === 'yes' ? 'ion' : 'cov';
    return null;
  }
  const uTxt = {
    solid: (u) => (u.solid ? '○ 통해요' : '× 안 통해요'),
    liquid: (u) => (u.liquid === -1 ? '녹일 수 없어요' : u.liquid ? '○ 통해요' : '× 안 통해요'),
    aq: (u) => (u.aq === -1 ? '물에 녹지 않아요' : u.aq ? '○ 통해요' : '× 안 통해요'),
    mp: (u) => (u.mp >= 3000 ? '3000 °C 이상' : u.mp + ' °C'),
    hammer: (u) => (u.hammer === 'flat' ? '펴져요 (늘어나요)' : u.hammer === 'hard' ? '매우 단단해요' : '부서져요'),
  };
  function drawCls(t) {
    const R0 = cLy(), L = R0.L, c = S.cls, cur = c.cur, u = UNK[cur], path = c.path[cur], leaf = leafOf(path);
    T(14, 26, MODE_LABEL.cls, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 16, L.y + 28, '🕵️ 시료 ' + cur + '는 어떤 결정일까?', 15, INK, 'left', 800);
    const d = R0.data;
    D.roundRect(d.x, d.y, d.w, d.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    D.sphere(d.x + 34, d.y + 36, 22, '#8b5cf6', { gloss: true, text: cur, textScale: 1.1 });
    T(d.x + 66, d.y + 42, '측정 자료', 15, INK, 'left', 800);
    [['고체 전기 전도', uTxt.solid(u)], ['액체 전기 전도', uTxt.liquid(u)], ['수용액 전기 전도', uTxt.aq(u)], ['녹는점', uTxt.mp(u)], ['망치 시험', uTxt.hammer(u)]].forEach((q, i) => {
      const y = d.y + 62 + i * (PHONE ? 33 : 46);
      D.roundRect(d.x + 10, y, d.w - 20, PHONE ? 29 : 40, 9); ctx.fillStyle = i % 2 ? '#f7f9ff' : '#f1f5f9'; ctx.fill();
      T(d.x + 20, y + (PHONE ? 20 : 26), q[0], 13.5, MUTED, 'left', 800); T(d.x + d.w - 20, y + (PHONE ? 20 : 26), q[1], 14.5, INK, 'right', 800);
    });
    // 순서도
    const f = R0.flow;
    D.roundRect(f.x, f.y, f.w, f.h, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(f.x + 12, f.y + 22, '🧭 판단 순서도 (전도성 → 녹는점 → 단단함)', 13.5, INK, 'left', 800);
    const nw = 214, nh = 70, nx = f.x + 12, gap = 24, ly = f.y + 36;
    const lw = 140, lx = f.x + f.w - lw - 12;
    NODES.forEach((n, i) => {
      const y = ly + i * (nh + gap), asked = path.length > i, active = !leaf && path.length === i, a = path[i];
      D.roundRect(nx, y, nw, nh, 12); ctx.fillStyle = active ? '#f3ecff' : asked ? '#e6f0ff' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = active ? PUR : asked ? BLU : '#c9d2df'; ctx.lineWidth = active ? 3 : 2; ctx.stroke();
      if (active && !RM) D.ring(nx + nw - 6, y + 6, 6, t, { color: PUR, width: 2 });
      textBlock(nx + 10, y + 22, nw - 20, (i + 1) + '. ' + n.q, 13.5, INK, 17, 800);
      if (asked) { D.label(nx + nw - 8, y + nh - 4, a === 'yes' ? '예' : '아니요', { size: 12.5, bg: a === 'yes' ? GOOD : '#64748b', align: 'right', pad: 6 }); }
      // 화살표 아래 (아니요)
      if (i < 2) { const on = asked && a === 'no'; D.arrow(nx + 40, y + nh + 2, nx + 40, y + nh + gap - 4, { color: on ? '#64748b' : '#c9d2df', width: 3, head: 9 }); T(nx + 52, y + nh + gap / 2 + 4, '아니요', 12.5, on ? '#475569' : '#9aa5b6', 'left', 800); }
      // 예 → 결과
      const yesType = n.yes, ly2 = y + nh / 2 - 21, on2 = asked && a === 'yes', q = TY[yesType];
      D.arrow(nx + nw + 2, y + nh / 2, lx - 4, y + nh / 2, { color: on2 ? q.col : '#c9d2df', width: 3, head: 9 }); T((nx + nw + lx) / 2, y + nh / 2 - 8, '예', 12.5, on2 ? q.col : '#9aa5b6', 'center', 800);
      D.roundRect(lx, ly2, lw, 42, 12); ctx.fillStyle = on2 ? C.rgba(q.col, 0.2) : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on2 ? q.col : '#c9d2df'; ctx.lineWidth = on2 ? 3 : 2; ctx.stroke(); T(lx + lw / 2, ly2 + 26, q.nm, 14.5, on2 ? q.col : '#9aa5b6', 'center', 800);
    });
    // 마지막 아니요 → 공유 결정
    { const y = ly + 2 * (nh + gap), q = TY.cov, on = path.length >= 3 && path[2] === 'no', ly2 = y + nh + 6;
      D.arrow(nx + 40, y + nh + 2, nx + 40, y + nh + 22, { color: on ? '#64748b' : '#c9d2df', width: 3, head: 9 });
      D.roundRect(nx, ly2 + 4, nw - 60, 40, 12); ctx.fillStyle = on ? C.rgba(q.col, 0.2) : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on ? q.col : '#c9d2df'; ctx.lineWidth = on ? 3 : 2; ctx.stroke(); T(nx + (nw - 60) / 2, ly2 + 30, q.nm, 14.5, on ? q.col : '#9aa5b6', 'center', 800);
      T(nx + nw - 52, ly2 + 30, '(아니요)', 12.5, MUTED, 'left', 700); }
    // 근거와 결과
    const by = f.y + f.h - (PHONE ? 70 : 78);
    if (leaf) {
      const ok = leaf === u.type, q = TY[leaf];
      D.roundRect(f.x + 8, by, f.w - 16, PHONE ? 64 : 70, 12); ctx.fillStyle = ok ? '#e6f7ee' : '#fdecec'; ctx.fill();
      const ev = path.map((a, i) => NODES[i].short + (a === 'yes' ? ' ○' : ' ×')).join(', ');
      T(f.x + 20, by + 22, '판단: ' + q.nm + (ok ? ' ✅' : ' ❌ 다시 살펴봐요'), 14.5, ok ? '#14803f' : '#b91c1c', 'left', 800);
      textBlock(f.x + 20, by + 42, f.w - 40, '근거: ' + ev + ' → ' + q.nm, 13, INK, 17, 700);
    } else textBlock(f.x + 16, by + 16, f.w - 32, '자료 카드를 보고 현재 질문(보라색)에 예 또는 아니요로 답해요.', 13.5, MUTED, 19, 700);
  }
  UK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.textContent = k; $('#cChips').appendChild(bt); });
  $('#cChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.cls.cur = bt.dataset.v; S.fade = 0.4; updateCtl(); });
  function clsAnswer(a) {
    const c = S.cls, p = c.path[c.cur]; if (leafOf(p)) return; Sound.click(); p.push(a);
    const lf = leafOf(p);
    if (lf) { c.ans[c.cur] = lf; if (lf === UNK[c.cur].type) { Sound.success(); if (!RM) { const R0 = cLy(); parts.burst(R0.flow.x + R0.flow.w - 90, R0.flow.y + R0.flow.h - 50, { count: 14, speed: 150, life: 0.7 }); } } else Sound.fail(); }
    updateCtl();
  }
  $('#bYes').addEventListener('click', () => clsAnswer('yes'));
  $('#bNo').addEventListener('click', () => clsAnswer('no'));
  $('#bRedo').addEventListener('click', () => { Sound.click(); S.cls.path[S.cls.cur] = []; delete S.cls.ans[S.cls.cur]; updateCtl(); });

  /* ================= 포인터 ================= */
  let dragCard = null, dragOff = [0, 0], dragStart = [0, 0], dragMoved = 0;
  function cardAt(p) { const cs = S.types.cards; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CH) return c; } return null; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'types' && S.sub.types === 'sort') {
        const c = cardAt(p);
        if (c) { dragCard = c; c.drag = true; dragOff = [p.x - c.x, p.y - c.y]; dragStart = [p.x, p.y]; dragMoved = 0; Sound.tick(); return true; }
        const rc = sortRC(), bi = rc.bins.findIndex((b) => inRect(p, b));
        if (bi >= 0 && S.types.sel !== null) { const sc = S.types.cards.find((x) => x.id === S.types.sel); if (sc) { S.types.sel = null; placeCard(sc, bi); Sound.success(); } }
        return false;
      }
      if (S.mode === 'bench') { benchTap(p); return false; }
      return false;
    },
    move(p) { const c = dragCard; if (!c) return; dragMoved = Math.max(dragMoved, Math.hypot(p.x - dragStart[0], p.y - dragStart[1])); c.x = clamp(p.x - dragOff[0], 0, VW - CW); c.y = clamp(p.y - dragOff[1], 0, VH - CH); },
    up(p) {
      const c = dragCard; if (!c) return; dragCard = null; c.drag = false; const F = S.types;
      if (dragMoved < 6) { F.sel = F.sel === c.id ? null : c.id; cardsLayout(); return; }
      const rc = sortRC(), bi = rc.bins.findIndex((b) => inRect(p, b)); F.sel = null;
      if (bi >= 0) { placeCard(c, bi); Sound.success(); } else { c.bin = null; c.flag = false; cardsLayout(); Sound.click(); updateCtl(); }
    },
    hover(p) { if (S.mode === 'types' && S.sub.types === 'sort') return cardAt(p) ? 'grab' : null; if (S.mode === 'bench' && S.sub.bench === 'tbl') { const L = bL(); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (inRect(p, tcell(r, c, L))) return 'pointer'; } return null; },
  });

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(S.sub[S.mode]) >= 0;
      n.hidden = !on;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const h = S.heat, s = hSm();
    $$('#hChips button').forEach((b) => { const q = hSm(b.dataset.v); b.classList.toggle('on', b.dataset.v === h.cur); b.classList.toggle('done', q.done && q.tag !== null && (HS[b.dataset.v].crystal === (q.tag === 'crystal'))); });
    $('#bHeat').disabled = !!h.run; $('#bHeat').textContent = h.run ? '🔥 가열하는 중…' : s.done ? '🔥 다시 가열' : '🔥 가열하기';
    $('#bFast').setAttribute('aria-pressed', h.fast ? 'true' : 'false'); $('#bFast').textContent = h.fast ? '⏩ 빠르게: 켜짐' : '⏩ 빠르게';
    $('#tagC').disabled = !s.done; $('#tagA').disabled = !s.done;
    $('#tagC').classList.toggle('btn-primary', s.tag === 'crystal'); $('#tagA').classList.toggle('btn-primary', s.tag === 'amorph');
    $('#tagNote').textContent = s.done ? (s.tag === null ? '가열 곡선에 평탄 구간이 있는지 보고 분류해요.' : s.tag === 'crystal' === HS[h.cur].crystal ? '맞아요! ' + HS[h.cur].note : '다시 한번 곡선을 살펴봐요.') : '시료를 가열한 뒤에 표시할 수 있어요. 🥽 실제 실험에서는 보안경과 보호 장갑을 쓰고, 뜨거운 시료는 만지지 않아요.';
    $$('#tSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.types));
    $$('#tChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.types.cur); b.classList.toggle('done', !!(S.types.seen && S.types.seen[b.dataset.v]) && b.dataset.v !== S.types.cur); });
    const bn = S.bench;
    $$('#bSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.bench));
    $$('#sChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === bn.cur); b.classList.toggle('done', XT.every(([k]) => bn.log[b.dataset.v][k] !== undefined) && b.dataset.v !== bn.cur); });
    $$('#xChips button').forEach((b) => { b.classList.toggle('on', !!bn.anim && bn.anim.test === b.dataset.v && bn.anim.id === bn.cur); b.classList.toggle('done', bn.log[bn.cur][b.dataset.v] !== undefined); b.disabled = !!(bn.anim && !bn.anim.done); });
    const c = S.cls, p = c.path[c.cur], lf = leafOf(p);
    $$('#cChips button').forEach((b) => { b.classList.toggle('on', b.dataset.v === c.cur); const a = c.ans[b.dataset.v]; b.classList.toggle('ok', a !== undefined && a === UNK[b.dataset.v].type); b.classList.toggle('no', a !== undefined && a !== UNK[b.dataset.v].type); });
    $('#qHead').textContent = lf ? '판단 끝: ' + TY[lf].nm : (p.length + 1) + '. ' + NODES[p.length].q;
    $('#bYes').disabled = !!lf; $('#bNo').disabled = !!lf; $('#bRedo').disabled = p.length === 0;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; if (m === 'types') cardsLayout(); updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5;
    if (S.mode === 'heat') { if (S.heat.run) S.heat.run = null; HK.forEach((k) => { S.heat.smp[k] = { prog: 0, done: false, trace: [], tag: null, wrongT: 0 }; }); S.heat.cur = 'salt'; }
    else if (S.mode === 'types') { if (S.sub.types === 'sort') { cardsInit(); cardsLayout(); } else S.types.cur = 'ion'; }
    else if (S.mode === 'bench') { if (S.sub.bench === 'tbl') { TK.forEach((k) => { S.bench.tbl[k] = [null, null, null, null, null]; S.bench.flag[k] = [false, false, false, false, false]; }); S.bench.cellSel = null; } else { S.bench.anim = null; SPK.forEach((k) => { S.bench.log[k] = {}; }); } }
    else { UK.forEach((k) => { S.cls.path[k] = []; }); S.cls.ans = {}; S.cls.cur = 'A'; }
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const heatedN = () => HK.filter((k) => S.heat.smp[k].done).length;
  const tagOK = (k) => { const q = S.heat.smp[k]; return q.done && q.tag !== null && (q.tag === 'crystal') === HS[k].crystal; };
  const cardOK = () => S.types.cards.filter((c) => c.bin === c.ans).length;
  const placedN = () => S.types.cards.filter((c) => c.bin !== null).length;
  const clsOK = () => UK.filter((k) => S.cls.ans[k] !== undefined && S.cls.ans[k] === UNK[k].type).length;
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'heat') { const hs = hCur(), s = hSm(); L1 = '시료'; a = hs.nm + ' (' + hs.f + ')'; L2 = '온도'; b = sgn(Math.round(HT(hs, s.prog))) + ' °C'; L3 = '가열한 시료'; c = heatedN() + ' / 6'; }
    else if (S.mode === 'types') { if (S.sub.types === 'look') { L1 = '보는 결정'; a = TY[S.types.cur].nm; L2 = '구성 입자'; b = TY[S.types.cur].unit; L3 = '결합'; c = TY[S.types.cur].bond.length > 12 ? TY[S.types.cur].bond.slice(0, 12) + '…' : TY[S.types.cur].bond; } else { L1 = '분류한 카드'; a = placedN() + ' / 12'; L2 = '상자 속'; b = [0, 1, 2, 3].map((i) => S.types.cards.filter((x) => x.bin === i).length).join(' · '); L3 = '선택한 카드'; c = S.types.sel ? S.types.cards.find((x) => x.id === S.types.sel).f : '—'; } }
    else if (S.mode === 'bench') { const bn = S.bench, sp = SP[bn.cur]; L1 = '시료'; a = sp.nm; L2 = '한 시험'; b = XT.filter(([k]) => bn.log[bn.cur][k] !== undefined).length + ' / 5'; L3 = '분류'; c = TY[sp.type].nm; }
    else { L1 = '시료'; a = S.cls.cur; L2 = '판단한 시료'; b = Object.keys(S.cls.ans).length + ' / 6'; L3 = '맞은 시료'; c = clsOK() + ' / 6'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const condTested = () => SPK.some((k) => ['solid', 'liquid', 'aq'].every((t) => S.bench.log[k][t] !== undefined));
  const condN = () => Math.max(0, ...SPK.map((k) => ['solid', 'liquid', 'aq'].filter((t) => S.bench.log[k][t] !== undefined).length));
  const levels = [
    {
      title: '결정과 비결정: 입자 배열 살펴보기', short: '결정과 비결정', icon: '🔍', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 소금, 설탕, 다이아몬드, 구리, 유리는 모두 고체인데 무엇이 같고 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학과 일반선택 화학에서</b> 이온 결합 · 공유 결합 · 금속 결합과 결합에 따른 전기 전도성을 배웠어요. 이번에는 이 결합을 바탕으로 <b>고체를 분류</b>해요.</div>' +
        '<p>확대경으로 여섯 가지 고체 속 입자를 들여다보고 가열해 봐요. 입자가 <b>규칙적으로 배열</b>된 고체는 <b>결정</b>, 규칙이 없는 고체는 <b>비결정</b>이에요. 가열 곡선에서도 차이가 나타나요.</p>',
      features: ['heat'],
      setup() { S.lock = false; S.gate = ''; setMode('heat'); },
      recap: '결정은 입자가 규칙적으로 배열되어 녹는점에서 온도가 일정한 평탄 구간이 있고, 비결정은 입자 배열이 불규칙해서 평탄 구간 없이 서서히 무르게 돼요.',
      summary: '<ul><li><b>결정</b>: 구성 입자가 규칙적으로 배열된 고체. 가열하면 <b>녹는점</b>에서 온도가 일정한 <b>평탄 구간</b>이 나타나요. (소금 801 °C, 설탕 약 186 °C, 얼음 0 °C, 구리 1085 °C)</li><li><b>비결정</b>: 입자 배열이 불규칙한 고체(유리, 플라스틱). 평탄 구간 없이 온도가 계속 오르며 서서히 무르게 돼요(유리는 약 500 ~ 600 °C).</li><li>단단하다고 모두 결정은 아니에요. 유리는 고체이지만 결정이 아니에요.</li></ul>',
      missions: [
        {
          title: '여섯 시료를 가열해 곡선 분류하기',
          goal: '시료 여섯 개를 모두 <b>🔥 가열</b>해 곡선을 얻고, <b>평탄 구간이 있으면 결정, 없으면 비결정</b>으로 표시해요.',
          hint: '시료를 고르고 가열하기를 눌러요. ⏩ 빠르게를 켜면 더 빨리 끝나요. 곡선에서 온도가 한동안 일정한 구간이 있으면 결정이에요. 가열이 끝나면 💎 결정 또는 🌫️ 비결정 단추로 표시해요.',
          setup() { S.lock = true; S.gate = ''; S.heat.run = null; HK.forEach((k) => { S.heat.smp[k] = { prog: 0, done: false, trace: [], tag: null, wrongT: 0 }; }); S.heat.cur = 'salt'; setMode('heat'); },
          check: () => HK.every(tagOK), hold: 0.4,
          status: () => '가열 ' + heatedN() + ' / 6 &nbsp; 올바른 분류 ' + HK.filter(tagOK).length + ' / 6 ' + mark(HK.every(tagOK)),
          explain: '소금 · 설탕 · 얼음 · 구리는 입자가 <b>규칙적으로 배열</b>된 결정이라 녹는점에서 <b>온도가 일정한 평탄 구간</b>이 생겨요. 유리와 플라스틱은 <b>불규칙한 배열</b>의 비결정이라 평탄 구간이 없이 서서히 물러져요.',
        },
        {
          type: 'quiz', title: '유리는 어떤 고체일까?',
          goal: '유리에 대한 설명으로 옳은 것은?',
          setup() { S.lock = true; S.gate = ''; S.heat.cur = 'glass'; setMode('heat'); },
          choices: ['단단하니까 결정이에요', '고체가 아니라 액체예요', '고체이지만 입자 배열이 불규칙해서 결정이 아니에요', '녹는점에서 온도가 일정하게 유지돼요'],
          answer: 2,
          feedback: ['단단하다고 모두 결정은 아니에요. 입자 배열의 규칙성이 기준이에요.', '유리는 모양이 변하지 않는 고체예요. 다만 입자 배열이 불규칙할 뿐이에요.', '', '유리는 평탄 구간이 없이 서서히 물러져요. 일정한 녹는점이 없어요.'],
          explain: '유리는 <b>고체이지만 입자 배열이 불규칙한 비결정</b>이에요. 그래서 일정한 녹는점이 없고 가열하면 서서히 무르게 돼요.',
        },
      ],
    },
    {
      title: '네 가지 결정: 결합으로 분류하기', short: '네 가지 결정', icon: '💎', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 결정은 입자가 규칙적으로 배열된 고체임을 알았어요. 결정을 이루는 <b>입자와 결합의 종류</b>에 따라 다시 네 가지로 나눌 수 있어요.</div>' +
        '<p><b>이온 결정</b>(이온 결합), <b>분자 결정</b>(분자 사이의 힘), <b>공유 결정</b>(공유 결합 그물), <b>금속 결정</b>(금속 결합)이에요. 입자 배열은 규칙적인지 아닌지 정도로만 그림으로 봐요. 모형을 살펴보고 대표 물질을 분류해요.</p>',
      features: ['types'],
      setup() { S.lock = false; S.gate = ''; S.sub.types = 'look'; setMode('types'); },
      recap: '결정성 고체는 결합에 따라 이온 결정, 분자 결정, 공유 결정, 금속 결정으로 나눠요.',
      summary: '<ul><li><b>이온 결정</b>: 양이온 · 음이온이 이온 결합 (NaCl, MgO, CaCl₂)</li><li><b>분자 결정</b>: 분자가 약한 분자 간 힘으로 모임 (얼음, 드라이아이스 CO₂, I₂, 설탕, 나프탈렌)</li><li><b>공유 결정</b>: 원자가 공유 결합으로 그물처럼 이어진 거대 구조 (다이아몬드, 석영 SiO₂, 규소 Si)</li><li><b>금속 결정</b>: 금속 양이온과 자유 전자의 금속 결합 (Na, Cu, Fe)</li><li>NaCl, SiO₂ 같은 화학식은 입자 수의 비를 나타내는 <b>실험식</b>이에요.</li></ul>',
      missions: [
        {
          title: '대표 물질 12개 분류하기',
          goal: '대표 물질 카드 12장을 네 가지 결정의 상자에 끌어 놓아요. <b>10장 이상</b> 알맞게 분류하면 성공이에요.',
          hint: '구성 입자와 결합을 떠올려요. 금속 원소 + 비금속 원소의 화합물은 이온 결정, 비금속 분자는 분자 결정, 탄소와 규소 계열의 거대 구조는 공유 결정, 금속 원소는 금속 결정이에요. 카드를 누르면 설명이 나와요.',
          setup() { S.lock = true; S.gate = ''; S.sub.types = 'sort'; cardsInit(); cardsLayout(); setMode('types'); },
          check: () => cardOK() >= 10, hold: 0.5,
          status: () => '분류한 카드 ' + placedN() + ' / 12 &nbsp; 알맞게 분류 ' + cardOK() + ' / 10 ' + mark(cardOK() >= 10),
          explain: '<b>이온 결정</b>: NaCl, MgO, CaCl₂ · <b>분자 결정</b>: 얼음, CO₂(드라이아이스), I₂ · <b>공유 결정</b>: 다이아몬드, SiO₂, Si · <b>금속 결정</b>: Na, Cu, Fe. 이름은 구성 입자와 결합에서 와요.',
        },
        {
          type: 'quiz', title: '얼음은 어떤 결정일까?',
          goal: '얼음 속 물 분자는 수소 결합으로 규칙적으로 배열되어 있어요. 얼음은 어떤 결정일까요?',
          setup() { S.lock = true; S.gate = ''; S.sub.types = 'look'; S.types.cur = 'mol'; setMode('types'); },
          choices: ['이온 결정이에요 (수소 결합은 이온 결합이라서)', '공유 결정이에요 (물 분자 안에 공유 결합이 있어서)', '금속 결정이에요 (규칙적으로 배열되어 있어서)', '분자 결정이에요 (분자가 분자 간 힘으로 규칙적으로 배열돼요)'],
          answer: 3,
          feedback: ['수소 결합은 이온 결합이 아니라 분자 사이에 작용하는 힘이에요.', '공유 결합은 물 분자 안에 있어요. 결정을 이루는 힘은 분자 사이의 힘이에요.', '자유 전자가 없고 분자가 단위예요. 금속 결정이 아니에요.', ''],
          explain: '얼음은 <b>분자(H₂O)가 분자 간 힘(수소 결합)으로 규칙적으로 배열</b>된 <b>분자 결정</b>이에요. 분자 결정은 분자 사이의 힘이 약해서 녹는점이 낮아요.',
        },
      ],
    },
    {
      title: '성질 시험: 녹는점 · 전도성 · 망치', short: '성질 시험', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 결정을 결합에 따라 네 가지로 나누었어요. 결합이 다르면 성질도 다를까요? 가상 실험대에서 <b>전기 전도성</b>을 중심으로 시험해 봐요.</div>' +
        '<p>시료 8개로 <b>녹는점</b>, <b>전기 전도성(고체 · 액체 · 수용액)</b>, <b>망치</b> 시험을 할 수 있어요. 측정 기록을 모아 네 가지 결정의 성질을 <b>비교표</b>로 정리해요. 전기 전도성이 가장 중요한 단서예요.</p>',
      features: ['bench'],
      setup() { S.lock = false; S.gate = ''; S.sub.bench = 'rig'; setMode('bench'); },
      recap: '이온 결정은 고체 부도체 · 액체 도체, 분자 결정은 어디서나 부도체, 공유 결정은 녹는점이 매우 높은 부도체, 금속 결정은 고체도 도체이고 펴져요.',
      summary: '<ul><li><b>이온 결정</b>: 고체는 부도체, 액체 · 수용액은 도체. 녹는점이 높고 단단하지만 세게 치면 부서져요.</li><li><b>분자 결정</b>: 녹는점이 낮고 고체 · 액체 · 수용액 어디서나 대부분 부도체예요(설탕).</li><li><b>공유 결정</b>: 녹는점이 매우 높고 단단한 부도체예요(다이아몬드, 석영). 규소는 반도체로 약하게 통해요.</li><li><b>금속 결정</b>: 고체 · 액체 모두 도체이고 전성 · 연성이 있어 펴져요.</li></ul>',
      missions: [
        {
          title: '전도도 시험 세 가지 해 보기',
          goal: '시료 하나로 <b>고체 · 액체 · 수용액</b> 전기 전도성 시험을 모두 해 봐요.',
          hint: '시험대에서 시료를 고르고 「⚡ 고체 전도」, 「⚡ 액체 전도」, 「⚡ 수용액 전도」를 차례로 눌러요. 전구가 켜지는지 지켜봐요. 소금 NaCl로 해 보면 좋아요.',
          setup() { S.lock = true; S.gate = ''; S.sub.bench = 'rig'; S.bench.anim = null; SPK.forEach((k) => { S.bench.log[k] = {}; }); setMode('bench'); },
          check: condTested, hold: 0.4,
          status: () => '한 시료에서 한 전도도 시험 ' + condN() + ' / 3 ' + mark(condTested()),
          explain: '소금(이온 결정)은 <b>고체 ×, 액체 ○, 수용액 ○</b>예요. 이온이 고체에서는 제자리에 있지만 녹거나 물에 녹으면 움직일 수 있기 때문이에요.',
        },
        {
          title: '성질 비교표 완성하기', manual: true,
          goal: '측정 기록(📊)을 보고 네 가지 결정의 성질 비교표 <b>20칸</b>을 모두 채우고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '시험을 많이 해 볼수록 쉬워요(📊 측정 기록 확인). 물에 녹지 않으면 수용액 시험은 해당 없음(—)이에요. 공유 결정과 금속 결정은 물에 녹지 않아요.',
          setup() { S.lock = true; S.gate = ''; S.sub.bench = 'tbl'; TK.forEach((k) => { S.bench.tbl[k] = [null, null, null, null, null]; S.bench.flag[k] = [false, false, false, false, false]; }); S.bench.cellSel = null; setMode('bench'); },
          check() {
            const b = S.bench; let em = 0; const wr = [];
            TK.forEach((ty) => b.tbl[ty].forEach((v, c) => { if (v === null) em++; else if (v !== TANS[ty][c]) wr.push([ty, c]); }));
            if (em) return '비어 있는 칸이 ' + em + '개 있어요. 20칸을 모두 채워요.';
            if (wr.length) { wr.forEach(([ty, c]) => { if (!b.flag[ty][c]) { b.flag[ty][c] = true; b.shake[ty][c] = 1; } }); return wr.length + '칸이 달라요. 빨간 테두리 칸을 다시 생각해 봐요. 측정 기록에서 확인할 수 있어요.'; }
            return true;
          },
          status: () => '채운 칸 ' + TK.reduce((a, k) => a + S.bench.tbl[k].filter((v) => v !== null).length, 0) + ' / 20',
          explain: '<b>이온</b>: × ○ ○ 높음 부서짐 · <b>분자</b>: × × × 낮음 부서짐 · <b>공유</b>: × × — 높음(매우) 부서짐 · <b>금속</b>: ○ ○ — 높음 펴짐. 전기 전도성(특히 고체 · 액체)과 녹는점이 결정의 종류를 알려 줘요.',
        },
        {
          type: 'quiz', title: '고체 상태에서 전기가 통하면?',
          goal: '어떤 고체가 <b>고체 상태에서 전기가 통해요</b>. 이 고체는 어떤 결정일까요?',
          setup() { S.lock = true; S.gate = ''; S.sub.bench = 'log'; setMode('bench'); },
          choices: ['이온 결정이에요', '금속 결정이에요', '분자 결정이에요', '공유 결정이에요'],
          answer: 1,
          feedback: ['이온 결정은 고체 상태에서 이온이 움직이지 못해 전기가 통하지 않아요. 녹이거나 물에 녹여야 통해요.', '', '분자 결정은 전하를 나르는 입자가 없어서 고체 · 액체 · 수용액 모두 전기가 통하지 않아요.', '다이아몬드나 석영 같은 공유 결정은 자유로운 전하가 없어서 전기가 통하지 않아요. (규소는 반도체라 아주 약하게만 통해요.)'],
          explain: '고체 상태에서 전기가 통하는 것은 <b>자유 전자</b>가 있는 <b>금속 결정</b>뿐이에요. 이온 결정은 녹아야 통하고, 분자 결정과 공유 결정은 통하지 않아요.',
        },
      ],
    },
    {
      title: '미지 시료 분류: 탐정이 되어', short: '미지 시료 분류', icon: '🕵️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 결정의 종류에 따라 전도성과 녹는점이 다르다는 것을 확인했어요. 이제 성질 자료만 보고 <b>미지 시료</b>의 종류를 알아내요.</div>' +
        '<p>시료 A ~ F의 측정 자료가 있어요. <b>판단 순서도</b>를 따라 전도성 → 녹는점 → 단단함 순서로 질문에 답하면 결정의 종류가 정해져요.</p>',
      features: ['cls'],
      setup() { S.lock = false; S.gate = ''; setMode('cls'); },
      recap: '고체 도체이면 금속 결정, 녹는점이 낮으면 분자 결정, 녹인 액체가 도체이면 이온 결정, 모두 아니면 공유 결정으로 분류해요.',
      summary: '<ul><li>판단 순서: ① <b>고체에서 전기가 통하면 금속 결정</b> → ② 녹는점이 낮으면 <b>분자 결정</b> → ③ 녹인 액체(수용액)에서 통하면 <b>이온 결정</b>, 아니면 <b>공유 결정</b>(매우 단단하고 녹는점이 아주 높아요).</li><li>다이아몬드와 석영은 원자가 공유 결합으로 이어진 <b>공유 결정</b>, 드라이아이스(CO₂)는 분자가 약한 힘으로 모인 <b>분자 결정</b>이에요.</li><li>SiO₂는 분자가 아니라 원자가 이어진 그물을 나타내는 <b>실험식</b>이에요. 같은 탄소로 된 다이아몬드와 흑연은 원자의 결합 방식이 달라 성질이 달라요.</li></ul>',
      missions: [
        {
          title: '미지 시료 A ~ F 분류하기',
          goal: '시료 A ~ F의 자료를 보고 판단 순서도로 <b>여섯 시료를 모두 알맞게</b> 분류해요.',
          hint: '시료를 고르고 현재 질문에 자료를 보며 예 / 아니요로 답해요. 고체에서 전기가 통하는지, 녹는점이 150 °C 이하인지, 녹인 액체가 전기가 통하는지 차례로 물어요. 틀렸다면 ↺ 다시 판단을 눌러요.',
          setup() { S.lock = true; S.gate = ''; UK.forEach((k) => { S.cls.path[k] = []; }); S.cls.ans = {}; S.cls.cur = 'A'; setMode('cls'); },
          check: () => clsOK() === 6, hold: 0.4,
          status: () => '판단 ' + Object.keys(S.cls.ans).length + ' / 6 &nbsp; 알맞은 분류 ' + clsOK() + ' / 6 ' + mark(clsOK() === 6),
          explain: 'A · E는 <b>이온 결정</b>(고체 ×, 녹인 액체 ○, 녹는점 높음), B · F는 <b>분자 결정</b>(녹는점 낮음, 부도체), C는 <b>공유 결정</b>(매우 단단, 녹는점 3000 °C 이상, 부도체), D는 <b>금속 결정</b>(고체 도체, 펴짐)이에요.',
        },
        {
          type: 'quiz', title: 'SiO₂는 분자일까?',
          goal: '석영의 화학식 SiO₂에 대한 설명으로 옳은 것은?',
          setup() { S.lock = true; S.gate = ''; setMode('cls'); },
          choices: ['SiO₂는 분자식이 아니라 Si와 O 원자가 1 : 2로 이어진 그물을 나타내는 실험식이에요', 'SiO₂는 Si 원자 1개와 O 원자 2개로 된 분자 하나를 나타내요', 'SiO₂는 CO₂처럼 분자 결정이에요', 'SiO₂는 이온 결합으로 된 이온 결정이에요'],
          answer: 0,
          feedback: ['', '석영에는 SiO₂ 분자가 따로 없어요. 원자가 끝없이 이어진 거대 구조예요.', 'CO₂는 분자 결정이지만 SiO₂는 공유 결합이 그물처럼 이어진 공유 결정이에요.', 'Si와 O는 모두 비금속이라 공유 결합을 해요. 이온 결정이 아니에요.'],
          explain: '석영은 Si와 O 원자가 공유 결합으로 이어진 <b>공유 결정</b>이고, SiO₂는 원자 수의 비 1 : 2를 나타낸 <b>실험식</b>이에요. NaCl도 이온 수의 비를 나타낸 실험식이에요.',
        },
        {
          type: 'quiz', title: '같은 탄소, 다른 성질',
          goal: '다이아몬드와 흑연은 모두 탄소(C)로 되어 있지만 성질이 매우 달라요(다이아몬드는 절연체, 흑연은 전기가 통해요). 까닭으로 알맞은 것은?',
          setup() { S.lock = true; S.gate = ''; setMode('cls'); },
          choices: ['구성 원소가 서로 달라서예요', '탄소 원자가 결합하는 방식(배열)이 달라서예요', '다이아몬드는 이온 결합, 흑연은 금속 결합만 하기 때문이에요', '흑연은 분자 결정이라서예요'],
          answer: 1,
          feedback: ['둘 다 탄소 원자로만 되어 있어요.', '', '두 물질 모두 탄소 원자의 공유 결합으로 이루어져요. 원자가 이어진 방식이 달라요.', '흑연은 원자가 층 모양으로 공유 결합한 구조라 분자 결정이 아니에요.'],
          explain: '다이아몬드는 탄소 원자가 3차원으로 공유 결합한 그물이고, 흑연은 층 모양으로 결합한 구조라서(층 안에 움직일 수 있는 전자가 있어요) 성질이 달라요. 같은 원소도 <b>원자의 결합 방식</b>에 따라 성질이 달라져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-solid-types', mount: '#game', badge: '결정 탐정', homeHref: '../../index.html#hx',
    featureLabels: { heat: '🔍 확대경과 가열 곡선', types: '💎 결정 모형 · 카드 분류', bench: '🧪 성질 시험대 · 비교표', cls: '🕵️ 판단 순서도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  cardsInit(); setMode('heat');
  function stepAll1(dt) {
    if (S.mode === 'heat') stepHeat(dt);
    if (S.mode === 'types') {
      stepCards(dt);
      // 12장을 모두 놓았는데 10장 미만이면 틀린 카드에 빨간 테두리 (같은 카드는 한 번만 흔들어요)
      if (placedN() === 12 && cardOK() < 10) S.types.cards.forEach((c) => { if (c.bin !== c.ans && !c.flag) { c.flag = true; c.shake = 1; } });
    }
    if (S.mode === 'bench') { stepBench(dt); const b = S.bench; for (const ty in b.shake) for (let i = 0; i < 5; i++) b.shake[ty][i] = Math.max(0, b.shake[ty][i] - dt * 2.5); }
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
    else if (S.mode === 'types') { T(14, 26, MODE_LABEL.types, PHONE ? 15 : 17, INK, 'left', 800); const L = tL(); panel(L.x, L.y, L.w, L.h, 14); T(L.x + 16, L.y + 28, S.sub.types === 'look' ? '💎 결정의 구성 입자와 결합' : '🗂️ 결정의 종류에 따라 분류하기', PHONE ? 14 : 15.5, INK, 'left', 800); if (S.sub.types === 'look') drawTypeLook(L, t); else drawSort(L, t); }
    else if (S.mode === 'bench') drawBench(t);
    else drawCls(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, HS, HK, SP, SPK, TY, TK, TANS, UNK, UK, setMode, cardsLayout, placeCard, sortRC, slotOf, bL, tcell, benchTap, startTest, benchResult, hGeo, cLy, leafOf, clsAnswer, cellRC, HT, setHeatCur,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
