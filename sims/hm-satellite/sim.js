/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 인공위성의 운동 (6차시)
   성취기준 [12역학01-04] 케플러 법칙으로부터 중력의 존재가 밝혀지는 과학사적 배경을 이해하고, 중력을 이용하여 인공위성과 행성의 운동을 분석하고 설명할 수 있다. (후반부)
   ① 탐구: 궤도 속력 (GMm/r² = mv²/r → v = √(GM/r), 속력이 어긋나면 원 궤도가 아니에요)
   ② 분석: 주기와 반지름 (T = 2πr/v, T² = 4π²r³/GM, (r, v, T) 표와 T²–r³ 그래프)
   ③ 적용: 정지 위성 (T = 24시간 → r = 4.22 × 10⁷ m, 고도 약 3.6만 km)
   ④ 분석: 질량 구하기 (M = 4π²r³/(GT²), 무중량 = 자유 낙하)
   원 궤도에 한정해요. 타원 궤도의 계산·궤도 전이·궤도 에너지는 다루지 않아요(어긋난 궤도는 '원이 아님'으로만 표시).
   G = 6.67 × 10⁻¹¹ N·m²/kg², 지구 M = 5.97 × 10²⁴ kg, R = 6.37 × 10⁶ m.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 620;
  const SH = PHONE ? 340 : 350;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MINUS = '−';
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };
  const sgn = (v, d) => (v < 0 && +Math.abs(v).toFixed(d) !== 0 ? MINUS : '+') + Math.abs(v).toFixed(d);
  const BG = '#eef2fa';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function card(x, y, w, h) { D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }
  function axes(rc, o) {
    const ml = PHONE ? 40 : 44, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    card(rc.x, rc.y, rc.w, rc.h);
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9;
      ctx.strokeStyle = z ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, o.yd != null ? yv.toFixed(o.yd) : String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, o.xd != null ? xv.toFixed(o.xd) : String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    if (o.right) T(rc.x + rc.w - 8, rc.y + 21, o.right, 13.5, '#c2410c', 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  /* 가로 막대 (값 0..max, 칸 안에서만 그려요) */
  function hbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * w;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, f, h); ctx.restore(); }
  }
  function vbar(x, y, w, h, val, max, color) {   // y = 맨 위, 아래에서부터 채워요
    D.roundRect(x, y, w, h, 6); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * h;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, 6); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y + h - f, w, f); ctx.restore(); }
  }


  /* ================= 상수·물리 ================= */
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const GN = 6.67e-11;
  const BODIES = [
    { n: '지구', M: 5.972e24, R: 6.37e6, col: '#3b82f6', hmax: 38000, hst: 100, vmax: 9.5, vst: 0.05, vd: 2 },
    { n: '달', M: 7.35e22, R: 1.737e6, col: '#c9ced9', hmax: 10400, hst: 50, vmax: 2.0, vst: 0.01, vd: 2 },
    { n: '화성', M: 6.42e23, R: 3.39e6, col: '#d9694a', hmax: 20000, hst: 100, vmax: 4.3, vst: 0.02, vd: 2 },
    { n: '목성', M: 1.898e27, R: 7.15e7, col: '#d9a066', hmax: 420000, hst: 2000, vmax: 50, vst: 0.25, vd: 2 },
  ];
  const GMb = (b) => GN * b.M;
  const vcirc = (GM, r) => Math.sqrt(GM / r);
  const GM_E = GMb(BODIES[0]), RE = BODIES[0].R;
  const T_SID = 86164;                          // 지구 자전 주기 (s)
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  const ORD_C = [
    '중력이 구심력 역할을 해요: GMm / r² = m v² / r',
    '정리하면 v² = GM / r  →  v = √(GM / r)  (m은 약분돼요)',
    '원 궤도를 한 바퀴 도는 시간: T = 2πr / v',
    'v = √(GM/r)를 넣으면 T² = 4π² r³ / (GM)',
    '→ T² ∝ r³: 케플러 제3법칙이 다시 나와요',
  ];
  const RULES_C = [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4]];
  const ordV = (ord, rules) => { const pos = {}; ord.forEach((id, i) => { pos[id] = i; }); return rules.filter(([a, b]) => pos[a] > pos[b]); };
  const MASSES = [
    { name: '이오–목성', c: '목성', r: 4.22e8, T: 1.53e5, Tt: '1.77일 = 1.53 × 10⁵ s', unit: 27, uname: '10²⁷', known: 1.898, col: '#d9a066', sat: '이오', cs: 34, ss: 7 },
    { name: '지구–태양', c: '태양', r: 1.50e11, T: 3.16e7, Tt: '1.00년 = 3.16 × 10⁷ s', unit: 30, uname: '10³⁰', known: 1.989, col: '#ffb703', sat: '지구', cs: 38, ss: 8 },
    { name: '달–지구', c: '지구', r: 3.84e8, T: 2.36e6, Tt: '27.3일 = 2.36 × 10⁶ s', unit: 24, uname: '10²⁴', known: 5.97, col: '#3b82f6', sat: '달', cs: 34, ss: 7 },
  ];
  const massOf = (p) => 4 * Math.PI * Math.PI * p.r * p.r * p.r / (GN * p.T * p.T);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'orbit', clock: 0, fade: 0,
    ob: { b: 0, h: 0, v: 5, st: 'ready', x: 0, y: 0, vx: 0, vy: 0, trail: [], trT: 0, ang: 0, last: 0, tscale: 1, scale: 0, msg: '', rst: 0, r0: 0, e0: 0, revs: 0, tt: 0, meas: false, done: false, burst: 0 },
    me: { h: 400, rec: [] },
    ge: { view: 'space', h: 20000, spd: 2, t: 0, inc: 0, track: [], trT: 0, lastKey: '' },
    ms: { i: 0, ang: 0 },
    wl: { h: 400, t: 0 },
    ordC: [3, 0, 4, 2, 1], ordBadC: {},
    flags: { order: false, gIn: false, mIn: false, hideT: false, hideAns: false },
  };
  let game = null;
  const eff = (k) => (game && game.free ? false : S.flags[k]);
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['orbit', 'meas', 'geo', 'mass', 'wless'];
  const ALLOWED = [['orbit'], ['meas'], ['geo'], ['mass', 'wless']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    if (mode === 'meas') { S.ob.meas = true; obRelaunch(); } else if (mode === 'orbit') { if (S.ob.meas) { S.ob.meas = false; obReady(); } }
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ---------- 궤도 엔진 (중력 하나만으로 움직이는 원 궤도 실험) ---------- */
  const bodyNow = () => (S.ob.meas ? BODIES[0] : BODIES[S.ob.b]);
  const hNow = () => (S.ob.meas ? S.me.h : S.ob.h);
  const r0Now = () => bodyNow().R + hNow() * 1000;
  const vcNow = () => vcirc(GMb(bodyNow()), r0Now()) / 1000;           // km/s
  const vNow = () => (S.ob.meas ? vcNow() : S.ob.v);
  function obReady() {
    const o = S.ob; o.st = 'ready'; o.trail = []; o.msg = ''; o.revs = 0; o.ang = 0; o.tt = 0; o.rst = 0; o.done = false;
    const r = r0Now(); o.x = r; o.y = 0; o.vx = 0; o.vy = vNow() * 1000; o.r0 = r;
    const ratio = vNow() / vcNow(); o.e0 = Math.abs(ratio * ratio - 1);
  }
  function obLaunch() {
    const o = S.ob; if (o.st === 'run') return;
    obReady(); const r = o.r0, GM = GMb(bodyNow());
    const Tc = TAU * r / vcirc(GM, r); o.tscale = Tc / 6; o.st = 'run'; o.last = 0; Sound.click(); updateCtl();
  }
  function obRelaunch() { obReady(); obLaunch(); }
  function obStep(dt) {
    const o = S.ob;
    if (o.st === 'ready') { return; }
    if (o.st !== 'run') { o.rst -= dt; if (o.rst <= 0) { if (o.meas) obRelaunch(); else obReady(); updateCtl(); } return; }
    const b = bodyNow(), GM = GMb(b);
    const dts = dt * o.tscale * (RM ? 1 : 1), n = 60, h = dts / n;
    let ax, ay, r;
    for (let i = 0; i < n; i++) {
      r = Math.hypot(o.x, o.y); ax = -GM * o.x / (r * r * r); ay = -GM * o.y / (r * r * r);
      o.vx += ax * h / 2; o.vy += ay * h / 2;
      const pa = Math.atan2(o.y, o.x);
      o.x += o.vx * h; o.y += o.vy * h;
      let da = Math.atan2(o.y, o.x) - pa; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; o.ang += da;
      r = Math.hypot(o.x, o.y); ax = -GM * o.x / (r * r * r); ay = -GM * o.y / (r * r * r);
      o.vx += ax * h / 2; o.vy += ay * h / 2;
    }
    o.tt += dts; o.revs = Math.abs(o.ang) / TAU;
    r = Math.hypot(o.x, o.y);
    o.trT -= dt; if (o.trT <= 0) { o.trT = 0.02; o.trail.push([o.x, o.y]); if (o.trail.length > 900) o.trail.shift(); }
    if (r < b.R * 0.985) { o.st = 'crash'; o.msg = '지표에 부딪혔어요! 속력이 모자라 원 궤도를 못 돌아요'; o.rst = 2.2; o.burst = 1; Sound.click(); updateCtl(); }
    else if (r > 3.2 * o.r0) { o.st = 'away'; o.msg = '너무 멀리 벗어났어요 (원 궤도가 아니에요)'; o.rst = 2.2; updateCtl(); }
    if (o.st === 'run' && !o.meas && o.revs >= 1 && o.e0 <= 0.035 && !o.done) { o.done = true; }
  }
  const orbitCircular = () => S.ob.st !== 'crash' && S.ob.st !== 'away' && S.ob.done && S.ob.e0 <= 0.035;
  const recDistinct = () => S.me.rec.length;
  function meRecord() {
    const m = S.me, r = RE + m.h * 1000, v = vcirc(GM_E, r), T = TAU * r / v;
    if (m.rec.some((q) => Math.abs(q.r - r) / r < 0.05)) { showHint('비슷한 고도는 이미 기록했어요. 고도를 많이 바꿔 보세요.', 2600); return; }
    m.rec.push({ h: m.h, r, v, T }); if (m.rec.length > 6) m.rec.shift(); Sound.click();
    parts.burst(PX + 60, PY + 40, { count: 8, speed: 70, size: 3, colors: ['#ffd447', '#fff'], gravity: 0, life: 0.5 });
    updateCtl();
  }

  /* ================= ①② 궤도 장면 ================= */
  const topCard = () => ({ x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 });
  function bodyDraw(b, x, y, r, t) {
    ctx.save();
    if (b.n === '지구') D.glow(x, y, r * 1.25, '#7cc4ff', 0.28);
    D.sphere(x, y, r, b.col, { gloss: false, light: b.n === '달' ? '#f4f6fa' : undefined });
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    if (b.n === '지구') { ctx.fillStyle = 'rgba(70,170,100,.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.34, r * 0.5, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + r * 0.45, y + r * 0.3, r * 0.22, r * 0.32, -0.4, 0, TAU); ctx.fill(); }
    if (b.n === '달') { ctx.fillStyle = 'rgba(120,125,140,.35)'; [[-.3, -.2, .18], [.35, .1, .13], [-.05, .45, .1], [.2, -.45, .09]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, TAU); ctx.fill(); }); }
    if (b.n === '화성') { ctx.fillStyle = 'rgba(120,50,30,.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y + r * 0.1, r * 0.4, r * 0.18, 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.92, r * 0.3, r * 0.12, 0, 0, TAU); ctx.fill(); }
    if (b.n === '목성') { [['rgba(150,90,50,.35)', -.45], ['rgba(255,235,200,.35)', -.15], ['rgba(150,90,50,.4)', .2], ['rgba(255,235,200,.3)', .5]].forEach((c) => { ctx.fillStyle = c[0]; ctx.fillRect(x - r, y + c[1] * r - r * 0.09, 2 * r, r * 0.18); }); }
    ctx.restore();
  }
  function satDraw(x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    D.shadow(() => { ctx.fillStyle = '#e8edf6'; D.roundRect(-5 * s, -4 * s, 10 * s, 8 * s, 2); ctx.fill(); }, { blur: 4, y: 1 });
    ctx.fillStyle = '#3867f4'; ctx.fillRect(-7 * s, -13 * s, 14 * s, 7 * s); ctx.fillRect(-7 * s, 6 * s, 14 * s, 7 * s);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.strokeRect(-7 * s, -13 * s, 14 * s, 7 * s); ctx.strokeRect(-7 * s, 6 * s, 14 * s, 7 * s);
    ctx.restore();
  }
  function drawOrbitTop(dt) {
    const o = S.ob, c = topCard(), b = bodyNow(), GM = GMb(b);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 80 });
    const cx = PHONE ? c.x + c.w / 2 : c.x + 300, cy = c.y + c.h / 2;
    const r0 = o.st === 'ready' ? r0Now() : o.r0;
    const tgt = 0.3 * c.h / r0Now();
    if (!(o.scale > 0)) o.scale = tgt; else if (o.st === 'ready') o.scale = Math.exp(approach(Math.log(o.scale), Math.log(tgt), dt, 6));
    const sc = o.scale;
    // 원 궤도 안내선
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(cx, cy, r0 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    bodyDraw(b, cx, cy, Math.max(4, b.R * sc), S.clock);
    // 자취
    if (o.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,200,90,.85)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
      o.trail.forEach((q, i) => (i ? ctx.lineTo(cx + q[0] * sc, cy - q[1] * sc) : ctx.moveTo(cx + q[0] * sc, cy - q[1] * sc))); ctx.stroke();
    }
    const px = cx + o.x * sc, py = cy - o.y * sc, r = Math.hypot(o.x, o.y), sp = Math.hypot(o.vx, o.vy);
    const vang = Math.atan2(-o.vy, o.vx);
    if (o.st !== 'crash') satDraw(px, py, vang, 1);
    // 화살표: 속도, 중력 가속도(빨강), 필요한 구심 가속도(초록 점선) — 가속도 두 화살표는 같은 축척
    if (o.st === 'ready' || o.st === 'run') {
      const vc0 = vcirc(GM, r0), g0 = GM / (r0 * r0), K = 56;
      const gA = GM / (r * r), nA = sp * sp / r;
      const ux = -o.x / r, uy = o.y / r;                         // 중심 방향(화면 좌표)
      const lg = Math.min(150, K * gA / g0), ln = Math.min(150, K * nA / g0), lv = Math.min(150, 50 * sp / vc0);
      D.arrow(px, py, px + Math.cos(vang) * lv, py + Math.sin(vang) * lv, { color: '#7cc4ff', width: 3.5, head: 10 });
      if (Math.abs(lg - ln) > 1.5) D.arrow(px + 5, py + 4, px + 5 + ux * ln, py + 4 + uy * ln, { color: '#7ee8a4', width: 3, head: 9, dash: [5, 4] });
      D.arrow(px, py, px + ux * lg, py + uy * lg, { color: '#ff7b7b', width: 3.5, head: 10 });
      if (Math.abs(lg - ln) <= 1.5) D.label(clamp(px + ux * (lg + 48), c.x + 60, c.x + c.w - 60), clamp(py + uy * (lg + 18) - 4, c.y + 16, c.y + c.h - 16), '같아요 → 원 궤도', { bg: GREEN, size: 13, pad: 7 });
    }
    if (o.burst > 0) { parts.burst(px, py, { count: 26, speed: 140, size: 3.5, colors: ['#ff9f43', '#ffd447', '#fff'], gravity: 0, life: 0.9 }); o.burst = 0; }
    parts.update(dt); parts.draw(ctx);
    T(c.x + 12, c.y + 24, bodyNow().n + ' 둘레의 위성 (위에서 본 모습)', 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    if (o.msg) D.label(c.x + c.w / 2, c.y + c.h - 22, o.msg, { bg: o.st === 'crash' ? 'rgba(185,28,28,.92)' : 'rgba(30,41,59,.88)', size: 14, pad: 9 });
    if (o.st === 'run' && !o.meas) T(c.x + 12, c.y + c.h - 12, (Math.floor(o.revs * 10) / 10).toFixed(1) + ' 바퀴', 14, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 오른쪽 범례
    if (!PHONE) {
      const x0 = c.x + c.w - 220;
      ctx.fillStyle = 'rgba(247,249,253,.95)'; ctx.fillRect(x0 - 12, c.y, c.x + c.w - x0 + 12, c.h);
      T(x0, c.y + 26, '화살표 읽는 법', 14, '#26324a', 'left', 800);
      D.arrow(x0, c.y + 58, x0 + 40, c.y + 58, { color: '#4aa8e8', width: 3.5, head: 9 }); T(x0 + 50, c.y + 63, '속도 v', 13.5, '#26324a', 'left', 800);
      D.arrow(x0, c.y + 92, x0 + 40, c.y + 92, { color: '#ff7b7b', width: 3.5, head: 9 }); T(x0 + 50, c.y + 97, '중력 가속도 GM/r²', 13.5, '#26324a', 'left', 800);
      D.arrow(x0, c.y + 126, x0 + 40, c.y + 126, { color: '#48c882', width: 3, head: 9, dash: [5, 4] }); T(x0 + 50, c.y + 131, '필요한 구심가속도 v²/r', 13.5, '#26324a', 'left', 800);
      T(x0, c.y + 166, '두 가속도 화살표는 같은 축척이에요.', 13, '#5a6679', 'left', 700);
      T(x0, c.y + 184, '두 화살표가 같으면 원 궤도예요.', 13, '#5a6679', 'left', 700);
    }
    ctx.restore();
  }
  function verdict() {
    const o = S.ob, vc = vcNow(), v = vNow(), ratio = v / vc, e = Math.abs(ratio * ratio - 1);
    if (e <= 0.035) return { t: '속력이 알맞아요 → 원 궤도 ✅', c: '#14753f' };
    return ratio < 1 ? { t: '속력이 모자라요 → 안쪽으로 떨어져 원이 아니에요', c: '#b91c1c' } : { t: '속력이 남아요 → 바깥쪽으로 벗어나 원이 아니에요', c: '#b45309' };
  }
  function drawOrbit(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    drawOrbitTop(dt);
    const o = S.ob, b = bodyNow(), GM = GMb(b);
    panel(PX, PY, PW, PH, 16);
    const r = r0Now(), vc = vcNow(), v = vNow(), gA = GM / (r * r), nA = (v * 1000) * (v * 1000) / r;
    const x0 = PX + 16, fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 29;
    T(x0, PY + 28, '🛰️ 원 궤도 조건: 중력 = 구심력', 15, '#26324a', 'left', 800);
    lines(x0, PY + 28 + lh, lh, fs, [
      ['r = R + h = ' + sci(r, 2) + ' m', '#26324a'],
      ['GMm / r² = m v² / r  →  v꜀ = √(GM / r) = ' + vc.toFixed(2) + ' km/s', '#1d4ed8'],
      ['내가 정한 속력 v = ' + v.toFixed(2) + ' km/s  (v꜀의 ' + (v / vc * 100).toFixed(0) + ' %)', '#c2410c'],
    ].slice(0, 3));
    const by = PY + 28 + lh * 4 + 6, bw = PHONE ? PW - 150 : 380;
    T(x0, by, '중력 가속도 GM/r²', 13.5, '#5a6679', 'left', 800); hbar(x0, by + 8, bw, 14, gA, Math.max(gA, nA, 1) * 1.1, RED); T(x0 + bw + 10, by + 21, gA.toFixed(2) + ' m/s²', 14, RED, 'left', 800);
    T(x0, by + 46, '필요한 구심 가속도 v²/r', 13.5, '#5a6679', 'left', 800); hbar(x0, by + 54, bw, 14, nA, Math.max(gA, nA, 1) * 1.1, GREEN); T(x0 + bw + 10, by + 67, nA.toFixed(2) + ' m/s²', 14, '#14753f', 'left', 800);
    const vd = verdict();
    T(x0, by + 100, vd.t, 14.5, vd.c, 'left', 800);
    if (PHONE) lines(x0, by + 128, 22, 13, [['파란 화살표: 속도 · 빨간 화살표: 중력 가속도', '#5a6679'], ['초록 점선: 필요한 구심 가속도 (같은 축척)', '#5a6679']]);
  }

  /* ================= ② 주기·반지름 표와 그래프 ================= */
  function drawMeas(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    drawOrbitTop(dt);
    const m = S.me, tb = PHONE ? { x: PX, y: PY, w: PW, h: 176 } : { x: PX, y: PY, w: 392, h: PH }, gr = PHONE ? { x: PX, y: PY + 182, w: PW, h: PH - 182 } : { x: PX + 400, y: PY, w: PW - 400, h: PH };
    card(tb.x, tb.y, tb.w, tb.h);
    T(tb.x + 10, tb.y + 21, '📋 원 궤도 측정 기록', 13.5, '#26324a', 'left', 800);
    const cs = [0.2, 0.2, 0.2, 0.2, 0.2].map((f) => f * (tb.w - 12)), hd = ['h(km)', 'r(10⁶m)', 'v(km/s)', 'T(분)', 'T²/r³(10⁻¹⁴)'];
    let xx = tb.x + 6; const cxs = cs.map((w) => { const c = xx + w / 2; xx += w; return c; });
    hd.forEach((h, i) => T(cxs[i], tb.y + 44, h, 13, '#5a6679', 'center', 800));
    const rh = PHONE ? 21 : 25;
    m.rec.forEach((q, i) => {
      const yy = tb.y + 44 + (i + 1) * rh; if (yy > tb.y + tb.h - 3) return;
      const k = q.T * q.T / (q.r * q.r * q.r);
      [String(q.h), (q.r / 1e6).toFixed(2), (q.v / 1000).toFixed(2), (q.T / 60).toFixed(1), (k * 1e14).toFixed(2)].forEach((s, c) => T(cxs[c], yy, s, 13, c === 2 ? BLUE : c === 3 ? '#c2410c' : '#26324a', 'center', 800));
    });
    if (!m.rec.length) T(tb.x + tb.w / 2, tb.y + tb.h / 2 + 14, '📏 측정 기록을 눌러 표를 채워요', 13.5, '#7b869a', 'center', 700);
    // 그래프
    const need = m.rec.reduce((a, q) => Math.max(a, q.r * q.r * q.r / 1e20, q.T * q.T / 1e7), 0), cand = [10, 30, 100, 300, 1000];
    m.ax = approach(m.ax || 10, cand.find((c) => c >= Math.max(need * 1.1, 10)) || 1000, dt, 6);
    const mx = m.ax;
    const a = axes(gr, { xmin: 0, xmax: mx, xstep: mx / 4, xd: mx >= 100 ? 0 : 1, ymin: 0, ymax: mx, ystep: mx / 4, yd: mx >= 100 ? 0 : 1, title: 'T² – r³ (T² 10⁷ s², r³ 10²⁰ m³)', right: m.rec.length >= 3 ? '직선' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    if (m.rec.length >= 3) { const k = 4 * Math.PI * Math.PI / GM_E * 1e13; ctx.strokeStyle = 'rgba(56,103,244,.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(0)); ctx.lineTo(a.gx(mx), a.gy(mx * k)); ctx.stroke(); ctx.setLineDash([]); }
    m.rec.forEach((q) => D.sphere(a.gx(q.r * q.r * q.r / 1e20), a.gy(q.T * q.T / 1e7), 5, '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 1 }));
    ctx.restore();
    if (m.rec.length >= 3) T(a.ix + a.iw - 6, a.iy + a.ih - 10, '기울기 = 4π² / GM = 9.9 × 10⁻¹⁴ s²/m³', 13, '#1d4ed8', 'right', 800);
  }

  /* ================= ③ 정지 위성 ================= */
  const GEO_R = Math.cbrt(GM_E * T_SID * T_SID / (4 * Math.PI * Math.PI));         // 4.22e7 m
  const GEO_H = (GEO_R - RE) / 1000;                                                // 약 35800 km
  const SAT_DEF = [{ n: '국제우주정거장', short: 'ISS', h: 400, u0: 1.6, col: '#e8edf6' }, { n: 'GPS 위성', short: 'GPS', h: 20200, u0: 4.2, col: '#d9a8ff' }];
  const periodOf = (h) => TAU * Math.sqrt(Math.pow(RE + h * 1000, 3) / GM_E);
  const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  function geStep(dt) {
    const g = S.ge;
    g.t += dt * g.spd * 3600;
    if (S.mode === 'geo' && g.view === 'map') {
      g.trT -= dt; if (g.trT <= 0) { g.trT = 0.03; g.track.push(mapPos(g.t)); if (g.track.length > 700) g.track.shift(); }
    }
  }
  function mapPos(t) {
    const g = S.ge, T = periodOf(g.h), u = TAU * t / T + 0.7, i = g.inc * RAD;
    const lat = Math.asin(Math.sin(i) * Math.sin(u)), lonI = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u));
    return [wrapPi(lonI - TAU * t / T_SID) / RAD, lat / RAD];
  }
  function geReset() { const g = S.ge; g.track = []; g.trT = 0; }
  function drawGeo(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const g = S.ge, c = topCard();
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 80 });
    const Tm = periodOf(g.h), nM = TAU / Tm, wE = TAU / T_SID, rel = Math.abs(nM - wE) * T_SID / TAU;     // 지구 자전 대비 (바퀴/일)
    const stationary = rel < 0.02;
    if (g.view !== 'map') {
      const cx = PHONE ? c.x + c.w / 2 : c.x + 300, cy = c.y + c.h / 2 + 4, tg = (PHONE ? 118 : 150) / Math.max(RE + g.h * 1000, RE + 20200e3) * 0.98;
      if (!(g.sc > 0)) g.sc = tg; g.sc = Math.exp(approach(Math.log(g.sc), Math.log(tg), dt, 5)); const sc = g.sc;
      const phiE = wE * g.t, rot = g.view === 'ground' ? -phiE : 0;
      // 궤도 고리
      const ring = (r, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]); };
      ring(RE + 400e3, 'rgba(232,237,246,.35)', 1.2); ring(RE + 20200e3, 'rgba(217,168,255,.4)', 1.2);
      ring(RE + g.h * 1000, 'rgba(255,200,90,.7)', 1.8);
      // 지구 (북극 위에서 본 모습)
      const Rp = RE * sc;
      D.glow(cx, cy, Rp * 1.5, '#7cc4ff', 0.3); D.sphere(cx, cy, Rp, '#3b82f6', { gloss: false });
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(70,170,100,.85)';
      [[0.3, 0.1, 0.5], [1.7, 0.45, 0.35], [3.6, 0.3, 0.4], [4.9, 0.55, 0.3]].forEach((q) => { const a = q[0] + phiE + rot; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * Rp * q[1], cy - Math.sin(a) * Rp * q[1], Rp * q[2] * 0.6, 0, TAU); ctx.fill(); });
      ctx.restore();
      // 지상의 집 (적도, 경도 0°)
      const ha = phiE + rot;
      const hx = cx + Math.cos(ha) * Rp, hy = cy - Math.sin(ha) * Rp;
      D.sphere(hx, hy, 4, '#ffd447', { gloss: false, outline: '#fff', outlineWidth: 1.2 });
      if (g.view === 'ground') { D.dashedLine(cx, cy, hx + Math.cos(ha) * 14, hy - Math.sin(ha) * 14, { color: 'rgba(255,212,71,.7)', width: 1.5 }); }
      // 위성
      const sats = SAT_DEF.map((s) => ({ ...s, r: RE + s.h * 1000, T: periodOf(s.h) })).concat([{ n: '내 위성', short: '내 위성', h: g.h, u0: 0.7, col: ORANGE, r: RE + g.h * 1000, T: Tm, me: true }]);
      sats.forEach((s) => {
        const a = TAU * g.t / s.T + s.u0 + rot, x = cx + Math.cos(a) * s.r * sc, y = cy - Math.sin(a) * s.r * sc;
        if (s.me) { D.glow(x, y, 16, ORANGE, 0.5); }
        D.sphere(x, y, s.me ? 6 : 4, s.col, { gloss: false, outline: s.me ? '#fff' : 'rgba(255,255,255,.6)', outlineWidth: 1 });
        D.label(clamp(x + 4, c.x + 30, c.x + c.w - 30), clamp(y - 14, c.y + 36, c.y + c.h - 12), s.short, { bg: s.me ? ORANGE : 'rgba(255,255,255,.18)', color: '#fff', size: 12.5, pad: 6 });
      });
      T(c.x + 12, c.y + 24, g.view === 'space' ? '북극 위에서 본 지구와 위성 (적도 궤도)' : '지상의 집에서 본 모습 (지구가 멈춘 것으로 보여요)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    } else {
      const mw = Math.min(c.w - 24, (c.h - 56) * 2), mh = mw / 2, mx = c.x + (c.w - mw) / 2, my = c.y + 34;
      const MX = (lon) => mx + mw * (lon + 180) / 360, MY = (lat) => my + mh * (90 - lat) / 180;
      const og = ctx.createLinearGradient(0, my, 0, my + mh); og.addColorStop(0, '#173a73'); og.addColorStop(1, '#0f2a57'); ctx.fillStyle = og; ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = 'rgba(70,170,100,.55)'; [[-100, 40, 50, 30], [10, 10, 25, 38], [90, 45, 55, 24], [135, -25, 24, 12], [-60, -20, 18, 28]].forEach((q) => { ctx.beginPath(); ctx.ellipse(MX(q[0]), MY(q[1]), mw * q[2] / 360, mh * q[3] / 180, 0, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; for (let lo = -150; lo <= 150; lo += 30) { ctx.beginPath(); ctx.moveTo(MX(lo), my); ctx.lineTo(MX(lo), my + mh); ctx.stroke(); } for (let la = -60; la <= 60; la += 30) { ctx.beginPath(); ctx.moveTo(mx, MY(la)); ctx.lineTo(mx + mw, MY(la)); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, MY(0)); ctx.lineTo(mx + mw, MY(0)); ctx.stroke();
      T(mx + 4, MY(0) - 4, '적도', 13, '#fff', 'left', 700);
      // 지상 궤적
      ctx.strokeStyle = 'rgba(255,200,90,.95)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
      let prev = null; g.track.forEach((q) => { if (!prev || Math.abs(q[0] - prev[0]) > 180) ctx.moveTo(MX(q[0]), MY(q[1])); else ctx.lineTo(MX(q[0]), MY(q[1])); prev = q; }); ctx.stroke();
      const cur = mapPos(g.t); D.sphere(MX(cur[0]), MY(cur[1]), 6, ORANGE, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      D.sphere(MX(0), MY(0), 5, '#ffd447', { gloss: false, outline: '#fff', outlineWidth: 1.2 }); T(MX(0) + 8, MY(0) + 18, '집', 13, '#ffe58a', 'left', 800);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mw, mh);
      T(c.x + 12, c.y + 24, '지도 위의 위성 자취 (' + (g.inc === 0 ? '적도 궤도' : '극 궤도') + ', 주기 ' + (eff('hideT') ? '?' : (Tm / 3600).toFixed(1) + '시간') + ')', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    }
    if (g.view === 'ground' || (g.view === 'map' && g.inc === 0)) D.label(c.x + c.w - 16 - (PHONE ? 0 : 0), c.y + c.h - 20, stationary ? '지상에서 정지해 보여요 ✅' : (nM > wE ? '동쪽으로 흘러가요' : '서쪽으로 뒤처져요'), { bg: stationary ? GREEN : 'rgba(30,41,59,.85)', size: 13.5, pad: 8, align: 'right' });
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 비교 표
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, rows = [['국제우주정거장', 400], ['GPS 위성', 20200], ['내 위성', g.h]];
    T(x0, PY + 28, '🛰️ 위성의 주기와 지상에서 본 모습', 14.5, '#26324a', 'left', 800);
    const cw = [PW * 0.3, PW * 0.2, PW * 0.2, PW * 0.3];
    const hdr = ['위성', '고도(km)', '주기', '하루에 도는 바퀴'];
    let xx = x0; const cxs = cw.map((w, i) => { const x = xx; xx += w; return x; });
    hdr.forEach((h, i) => T(cxs[i], PY + 60, h, 13, '#5a6679', 'left', 800));
    rows.forEach((r, i) => {
      const T0 = periodOf(r[1]), me = i === 2, hide = me && eff('hideT'), yy = PY + 88 + i * (PHONE ? 30 : 34);
      if (me) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(x0 - 8, yy - 18, PW - 16, 28, 8); ctx.fill(); }
      const tt = T0 >= 7200 ? (T0 / 3600).toFixed(1) + ' 시간' : (T0 / 60).toFixed(0) + ' 분';
      [r[0], String(r[1]), hide ? '?' : tt, hide ? '?' : (86400 / T0).toFixed(1) + ' 바퀴'].forEach((s, k) => T(cxs[k], yy, s, 14, me ? '#b45309' : '#26324a', 'left', 800));
    });
    lines(x0, PY + 88 + 3 * (PHONE ? 30 : 34) + 22, PHONE ? 22 : 24, PHONE ? 13 : 13.5, PHONE ? [
      ['T = 2π√(r³ / GM), 자전 주기는 24시간이에요.', '#26324a'],
      ['정지 위성: 자전과 같은 방향·같은 주기,', '#5a6679'],
      ['적도 상공의 궤도여야 해요.', '#5a6679'],
    ] : [
      ['T = 2π√(r³ / GM) 이고 지구 자전 주기는 24시간(86164 s)이에요.', '#26324a'],
      ['정지 위성은 자전과 같은 방향·같은 주기·적도 궤도여야 지상에서 정지해 보여요.', '#5a6679'],
    ]);
  }

  /* ================= ④ 질량 구하기 ================= */
  function massSteps(p) { return { r3: Math.pow(p.r, 3), T2: p.T * p.T, M: massOf(p) }; }
  function drawMass(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), ms = S.ms, p = MASSES[ms.i], st = massSteps(p), hide = eff('hideAns');
    ms.ang += dt * TAU / 6;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 80 });
    const cx = PHONE ? c.x + 100 : c.x + 230, cy = c.y + c.h / 2 + 8, R = PHONE ? 66 : 112;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (p.c === '태양') { D.glow(cx, cy, p.cs * 2.6, '#ffd447', 0.5); D.sphere(cx, cy, p.cs * (PHONE ? 0.7 : 1), p.col, { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
    else D.sphere(cx, cy, p.cs * (PHONE ? 0.7 : 1), p.col, { gloss: true });
    const sx = cx + R * Math.cos(ms.ang), sy = cy - R * Math.sin(ms.ang);
    D.sphere(sx, sy, p.ss * (PHONE ? 0.8 : 1), p.sat === '이오' ? '#f2d45c' : p.sat === '지구' ? '#3b82f6' : '#d9dde6', { gloss: true });
    D.label(clamp(sx, c.x + 30, c.x + c.w - 30), clamp(sy - 18, c.y + 36, c.y + c.h - 12), p.sat, { bg: 'rgba(255,255,255,.2)', color: '#fff', size: 12.5, pad: 6 });
    D.label(cx, cy + (PHONE ? 48 : 72), p.c, { bg: 'rgba(255,255,255,.22)', color: '#fff', size: 13, pad: 7 });
    D.dashedLine(cx, cy, sx, sy, { color: 'rgba(255,255,255,.55)', width: 1.5, dash: [3, 4] });
    D.label((cx + sx) / 2, (cy + sy) / 2 - 12, 'r', { bg: BLUE, size: 13, pad: 7 });
    T(c.x + 12, c.y + 24, PHONE ? p.sat + ' 관측' : p.name + ': 위성의 관측 자료', PHONE ? 13.5 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 계산 카드
    const x0 = PHONE ? c.x + 196 : c.x + 400;
    ctx.fillStyle = 'rgba(247,249,253,.96)'; ctx.fillRect(x0 - 12, c.y, c.x + c.w - x0 + 12, c.h);
    T(x0, c.y + 26, '⚖️ M = 4π²r³ / (G T²)', 14.5, '#26324a', 'left', 800);
    lines(x0, c.y + 56, PHONE ? 26 : 30, PHONE ? 13 : 14, [
      ['r = ' + sci(p.r, 2) + ' m', '#1d4ed8'],
      ['T = ' + p.Tt, '#c2410c'],
      ['r³ = ' + sci(st.r3, 2) + ' m³', '#26324a'],
      ['T² = ' + sci(st.T2, 2) + ' s²', '#26324a'],
      ['G = 6.67 × 10⁻¹¹ N·m²/kg²', '#5a6679'],
      ['M(' + p.c + ') = ' + (hide ? '?' : sci(st.M, 2) + ' kg'), hide ? '#b45309' : '#14753f'],
    ]);
    if (!hide) T(x0, c.y + c.h - 16, '알려진 값 ' + p.known.toFixed(p.unit === 24 ? 2 : 3) + ' × ' + p.uname.replace('10', '10') + ' kg', 13, '#5a6679', 'left', 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, lh = PHONE ? 25 : 29, fs = PHONE ? 13.5 : 14.5;
    T(x1, PY + 28, '🧮 위성의 운동으로 중심 천체의 질량을 구해요', 15, '#26324a', 'left', 800);
    lines(x1, PY + 28 + lh, lh, fs, [
      ['GMm / r² = m (2π/T)² r  →  M = 4π² r³ / (G T²)', '#1d4ed8'],
      ['식에 위성의 질량 m이 없어요 → ' + p.sat + '의 질량은 이 자료로 구할 수 없어요.', '#b45309'],
      ['중심 천체의 질량은 위성의 r와 T만 알면 구할 수 있어요.', '#26324a'],
    ].slice(0, PHONE ? 3 : 3));
    if (!hide) {
      const y2 = PY + 28 + lh * 4.4;
      MASSES.forEach((q, i) => { const m = massOf(q) / Math.pow(10, q.unit); T(x1, y2 + i * (PHONE ? 24 : 27), q.name + ': M(' + q.c + ') = ' + m.toFixed(2) + ' × ' + q.uname + ' kg', fs - 0.5, i === ms.i ? '#14753f' : '#5a6679', 'left', 800); });
    }
  }

  /* ================= ④ 무중량 ================= */
  function drawWless(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), w = S.wl, r = RE + w.h * 1000, gO = GM_E / (r * r), g0 = GM_E / (RE * RE);
    w.t += dt;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 70 });
    // 왼쪽: 궤도에서 떨어지는 위성
    const ex = PHONE ? c.x + 92 : c.x + 150, ey = c.y + c.h / 2 + 6, Re = PHONE ? 28 : 42, Ro = PHONE ? 68 : 116;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(ex, ey, Ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.glow(ex, ey, Re * 1.4, '#7cc4ff', 0.3); D.sphere(ex, ey, Re, '#3b82f6', { gloss: true });
    const a = -w.t * 0.9 + 2.2, sx = ex + Ro * Math.cos(a), sy = ey - Ro * Math.sin(a);
    const tx = Math.sin(a), ty = Math.cos(a);              // 접선(시계 방향)
    D.dashedLine(sx, sy, sx + tx * 60, sy + ty * 60, { color: '#ffe58a', width: 2, dash: [4, 4] });
    D.arrow(sx, sy, sx + (ex - sx) / Ro * 40, sy + (ey - sy) / Ro * 40, { color: '#ff7b7b', width: 3.5, head: 10 });
    satDraw(sx, sy, Math.atan2(ty, tx), 0.9);
    T(c.x + 12, c.y + 24, PHONE ? '가려다 계속 떨어져요' : '위성은 접선 방향으로 가려다 계속 떨어져요', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    if (!PHONE) T(c.x + 12, c.y + c.h - 12, '노란 점선: 중력이 없을 때의 직선 경로', 13, '#ffe58a', 'left', 700, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 오른쪽: 위성 안
    const bx = PHONE ? c.x + 180 : c.x + 360, by = c.y + 14, bw = c.x + c.w - bx - 10, bh = c.h - 28;
    ctx.fillStyle = '#e8eef8'; D.roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#d3dcec'; D.roundRect(bx + 10, by + 10, bw - 20, bh - 20, 10); ctx.fill();
    const lg = 46 * gO / g0;                                   // 가속도 화살표 길이 (지표 g = 46 px)
    const ax = bx + bw * 0.3 + Math.sin(w.t * 0.8) * 8, ay = by + bh * 0.5 + Math.sin(w.t * 0.6) * 10;
    person(ax, ay + 34, 70, '#3867f4', false);
    const dx = bx + bw * 0.72 + Math.sin(w.t * 0.5 + 1) * 10, dy = by + bh * 0.42 + Math.cos(w.t * 0.7) * 10;
    ctx.save(); ctx.fillStyle = 'rgba(120,190,255,.85)'; ctx.beginPath(); ctx.arc(dx, dy, 13, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(dx - 4, dy - 5, 4, 2.4, -0.6, 0, TAU); ctx.fill(); ctx.restore();
    D.arrow(ax + 30, ay - 14, ax + 30, ay - 14 + lg, { color: RED, width: 3.5, head: 9 });
    D.arrow(dx + 22, dy - 4, dx + 22, dy - 4 + lg, { color: RED, width: 3.5, head: 9 });
    T(ax + 38, ay - 14 + lg / 2 + 5, 'g', 14, RED, 'left', 800); T(dx + 30, dy - 4 + lg / 2 + 5, 'g', 14, RED, 'left', 800);
    D.label(bx + bw / 2, by + 26, '위성 안: 우주인과 물방울이 둥둥 떠요', { bg: 'rgba(30,41,59,.85)', size: 13, pad: 8 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, lh = PHONE ? 25 : 29, fs = PHONE ? 13.5 : 14.5;
    T(x0, PY + 28, '🧑‍🚀 무중량 = 자유 낙하', 15, '#26324a', 'left', 800);
    lines(x0, PY + 28 + lh, lh, fs, [
      ['고도 h = ' + w.h + ' km에서 중력 가속도 g = GM / r² = ' + gO.toFixed(2) + ' m/s²', '#c2410c'],
      ['(지표 g = ' + g0.toFixed(1) + ' m/s²의 ' + (gO / g0 * 100).toFixed(0) + ' %) — 중력은 없어지지 않아요!', '#26324a'],
      ['위성과 우주인이 같은 가속도로 함께 떨어지는 중이에요.', '#26324a'],
      ['서로 눌러 주는 힘(수직항력)이 없어서 몸무게를 못 느껴요.', '#14753f'],
    ].slice(0, 4));
  }

  /* ================= 컨트롤 연결 ================= */
  function person(x, yFeet, h, color) {
    const w = h * 0.34;
    ctx.save(); ctx.translate(x, yFeet);
    ctx.fillStyle = '#3b4a68'; D.roundRect(-w * 0.45, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill(); D.roundRect(w * 0.1, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill();
    ctx.fillStyle = color; D.roundRect(-w * 0.55, -h * 0.82, w * 1.1, h * 0.46, w * 0.3); ctx.fill();
    D.sphere(0, -h * 0.9, h * 0.1, '#ffd9b3', { gloss: false, outline: '#c9a27a', outlineWidth: 1 });
    ctx.restore();
  }
  const ordSigC = { v: '' };
  function renderOrderC() {
    const ord = S.ordC, bad = S.ordBadC, sig = ord.join() + '|' + Object.keys(bad).join();
    if (sig === ordSigC.v) return; ordSigC.v = sig;
    const box = $('#ordC'); box.innerHTML = '';
    ord.forEach((id, pos) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;border:2px solid ' + (bad[id] ? 'var(--bad)' : 'var(--line)') + ';border-radius:12px;background:' + (bad[id] ? 'var(--bad-soft)' : '#fff');
      const nm = document.createElement('b'); nm.textContent = String(pos + 1); nm.style.cssText = 'flex:none;width:22px;text-align:center;color:var(--muted)';
      const tx = document.createElement('div'); tx.textContent = ORD_C[id]; tx.style.cssText = 'flex:1;font-size:13.5px;font-weight:700;line-height:1.3';
      const mk = (lab, d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.style.cssText = 'flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-weight:900;cursor:pointer'; b.setAttribute('aria-label', ORD_C[id] + (d < 0 ? ' 위로' : ' 아래로')); b.disabled = (d < 0 && pos === 0) || (d > 0 && pos === ord.length - 1); b.addEventListener('click', () => moveC(pos, d)); return b; };
      row.append(nm, tx, mk('▲', -1), mk('▼', 1)); box.appendChild(row);
    });
  }
  function moveC(pos, d) { const a = S.ordC, j = pos + d; if (j < 0 || j >= a.length) return; const t = a[pos]; a[pos] = a[j]; a[j] = t; S.ordBadC = {}; Sound.click(); updateCtl(); }
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  function applyBodyRanges() {
    const b = BODIES[S.ob.b], sh = $('#sH'), sv = $('#sV');
    if (+sh.max !== b.hmax) { sh.max = b.hmax; sh.step = b.hst; }
    if (+sv.max !== b.vmax) { sv.max = b.vmax; sv.step = b.vst; }
  }
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false;
        if (n.hasAttribute('data-gmap') && S.ge.view !== 'map') on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const o = S.ob, b = BODIES[o.b];
    applyBodyRanges();
    $$('#bdSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.bd === o.b));
    $('#oH').textContent = o.h + ' km'; setSl('sH', o.h, 0, b.hmax);
    $('#oV').textContent = o.v.toFixed(2) + ' km/s'; setSl('sV', o.v, 0, b.vmax);
    $('#bLaunch').disabled = o.st === 'run';
    $('#oH2').textContent = S.me.h + ' km'; setSl('sH2', S.me.h, 0, 38000);
    const g = S.ge;
    $$('#gvSeg button').forEach((x) => x.classList.toggle('on', x.dataset.gv === g.view));
    $$('#giSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.gi === g.inc));
    $('#oGh').textContent = g.h + ' km'; setSl('sGh', g.h, 0, 40000);
    $('#oGs').textContent = g.spd.toFixed(1) + ' 시간/초'; setSl('sGs', g.spd, 0.5, 6);
    $$('#msSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.ms === S.ms.i));
    const p = MASSES[S.ms.i]; $('#mInLab').textContent = 'M (× ' + p.uname + ' kg)'; $('#mInHead').textContent = '📝 ' + p.c + '의 질량 M';
    $('#oWh').textContent = S.wl.h + ' km'; setSl('sWh', S.wl.h, 0, 36000);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#bdSeg button').forEach((x) => x.addEventListener('click', () => {
    Sound.click(); const o = S.ob; o.b = +x.dataset.bd; o.h = 0; const b = BODIES[o.b];
    applyBodyRanges(); const vc = vcirc(GMb(b), b.R) / 1000; o.v = Math.round(vc * 0.7 / b.vst) * b.vst; obReady(); updateCtl();
  }));
  $('#sH').addEventListener('input', (e) => { S.ob.h = +e.target.value; obReady(); updateCtl(); });
  $('#sV').addEventListener('input', (e) => { S.ob.v = +e.target.value; obReady(); updateCtl(); });
  $('#bLaunch').addEventListener('click', obLaunch);
  $('#bReset').addEventListener('click', () => { Sound.click(); obReady(); updateCtl(); });
  $('#sH2').addEventListener('input', (e) => { S.me.h = +e.target.value; obRelaunch(); updateCtl(); });
  $('#bMeas').addEventListener('click', meRecord);
  $('#bMeasC').addEventListener('click', () => { Sound.click(); S.me.rec = []; updateCtl(); });
  $$('#gvSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ge.view = x.dataset.gv; geReset(); updateCtl(); }));
  $$('#giSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ge.inc = +x.dataset.gi; geReset(); updateCtl(); }));
  $('#sGh').addEventListener('input', (e) => { S.ge.h = +e.target.value; geReset(); updateCtl(); });
  $('#sGs').addEventListener('input', (e) => { S.ge.spd = +e.target.value; updateCtl(); });
  $$('#msSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ms.i = +x.dataset.ms; clr('iM'); updateCtl(); }));
  $('#sWh').addEventListener('input', (e) => { S.wl.h = +e.target.value; updateCtl(); });
  ['iGh', 'iM'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'orbit' || S.mode === 'meas') {
      const vc = vcNow(), v = vNow(), o = S.ob;
      L1 = '원 궤도 속력 v꜀'; a = vc.toFixed(2) + ' km/s';
      if (S.mode === 'orbit') { L2 = '정한 속력 v'; b = v.toFixed(2) + ' km/s'; const vd = verdict(); L3 = '궤도 판정'; c = o.st === 'crash' ? '충돌 ❌' : vd.t.indexOf('원 궤도 ✅') >= 0 ? '원 궤도 ✅' : '원이 아니에요 ❌'; }
      else { const r = r0Now(); L2 = '주기 T = 2πr / v'; b = (TAU * r / (vc * 1000) / 60).toFixed(1) + ' 분'; L3 = '반지름 r'; c = sci(r, 2) + ' m'; }
    } else if (S.mode === 'geo') {
      const T0 = periodOf(S.ge.h), h = eff('hideT');
      L1 = '내 위성의 주기 T'; a = h ? '?' : (T0 / 3600).toFixed(1) + ' 시간'; L2 = '궤도 반지름 r'; b = sci(RE + S.ge.h * 1000, 2) + ' m'; L3 = '속력 v'; c = (vcirc(GM_E, RE + S.ge.h * 1000) / 1000).toFixed(2) + ' km/s';
    } else if (S.mode === 'mass') {
      const p = MASSES[S.ms.i], h = eff('hideAns'); L1 = '관측한 r'; a = sci(p.r, 2) + ' m'; L2 = '관측한 T'; b = sci(p.T, 2) + ' s'; L3 = 'M(' + p.c + ')'; c = h ? '?' : sci(massOf(p), 2) + ' kg';
    } else {
      const r = RE + S.wl.h * 1000; L1 = '궤도의 중력 가속도'; a = (GM_E / (r * r)).toFixed(2) + ' m/s²'; L2 = '지표 g의 비율'; b = (GM_E / (r * r) / (GM_E / (RE * RE)) * 100).toFixed(0) + ' %'; L3 = '위성 안 몸무게'; c = '느끼지 못해요 (자유 낙하)';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  function clr(...ids) { ids.forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); }); }
  const seen = { surf: false, iss: false };
  function orbitWatch() {   // 원 궤도를 한 바퀴 돌았는지 확인 (지표 근처 / 고도 400 km)
    const o = S.ob;
    if (o.done && !o.meas && o.b === 0 && o.st === 'run') { if (o.h === 0) seen.surf = true; if (o.h === 400) seen.iss = true; }
  }
  const km = (x) => x.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const vcE0 = vcirc(GM_E, RE) / 1000, vcE400 = vcirc(GM_E, RE + 400e3) / 1000;
  const levels = [
    {
      title: '궤도 속력: 중력이 구심력', short: '궤도 속력', icon: '🛰️', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 인공위성이 떨어지지 않고 지구를 도는 속력은 정확히 얼마일까? 궤도가 높을수록 위성은 빨라질까, 느려질까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 인공위성은 지구 쪽으로 계속 떨어지면서 옆으로 충분히 빠르게 움직여 공전한다고 배웠어요(ISS 약 7.7 km/s, 92분). 앞 차시에서는 <b>중력 F = GMm/r²이 구심력</b>이 되어 행성이 원운동함을 확인했어요.</div>' +
        '<p>중심 천체와 고도, 처음 속력을 정해 위성을 발사해요. <b>중력 가속도 GM/r²</b>(빨강)와 원운동에 <b>필요한 구심 가속도 v²/r</b>(초록)이 같을 때만 원 궤도가 돼요. 속력이 다르면 원이 아닌 궤도가 되는 것만 확인하고, 그 모양은 계산하지 않아요.</p>',
      features: ['orbit'],
      setup() { seen.surf = false; seen.iss = false; const o = S.ob; o.b = 0; o.h = 0; o.v = 5; o.meas = false; obReady(); setScene('orbit'); },
      recap: '중력이 구심력이므로 GMm/r² = mv²/r에서 원 궤도 속력은 v = √(GM/r)이에요. 궤도가 높을수록 속력은 작아지고, 질량 m과는 관계없어요.',
      summary: '<ul><li><b>중력 = 구심력</b>: GMm/r² = mv²/r → <b>v = √(GM/r)</b>. 위성의 질량 m은 약분되어 <b>속력은 위성의 질량과 관계없어요</b>.</li><li>지구: G = 6.67 × 10⁻¹¹ N·m²/kg², M = 5.97 × 10²⁴ kg, R = 6.37 × 10⁶ m → <b>GM = 3.98 × 10¹⁴ m³/s²</b>.</li><li>지표 근처(r = R): v = √(GM/R) = <b>7.9 km/s</b>(제1우주 속도), 주기 84분. 고도 400 km(ISS): <b>7.67 km/s</b>, 중력 가속도 8.7 m/s².</li><li>속력이 √(GM/r)보다 작으면 중력이 더 커서 안쪽으로 떨어지고, 크면 바깥쪽으로 벗어나 <b>원 궤도가 아니에요</b>. 궤도가 높을수록 v는 작아져요(ISS 7.67 → GPS 3.87 → 정지 위성 3.07 → 달 1.02 km/s).</li></ul>',
      missions: [
        {
          title: '지표 근처와 400 km 원 궤도 만들기',
          goal: '지구에서 <b>① 고도 0 km(지표 근처)</b>와 <b>② 고도 400 km</b>의 원 궤도를 만들어 한 바퀴씩 돌리세요.',
          hint: '고도 슬라이더를 맞추고 속력을 √(GM/r)에 가깝게 놓은 뒤 🚀 발사해요(고도 0 km → 약 7.9 km/s, 400 km → 약 7.67 km/s). 빨간 화살표와 초록 점선 화살표 길이가 같아지면 돼요.',
          setup() { seen.surf = false; seen.iss = false; const o = S.ob; o.b = 0; o.h = 0; o.v = 5; o.meas = false; obReady(); setScene('orbit'); },
          check: () => { orbitWatch(); return seen.surf && seen.iss; },
          hold: 0.5,
          status: () => mark(seen.surf) + ' 지표 근처(7.9 km/s 부근) &nbsp; ' + mark(seen.iss) + ' 고도 400 km(7.67 km/s 부근)',
          explain: '지표 근처: v = √(GM/R) = √(3.98 × 10¹⁴ ÷ 6.37 × 10⁶) = <b>7.9 km/s</b>. 고도 400 km(r = 6.77 × 10⁶ m): <b>7.67 km/s</b>. 속력이 조금만 모자라도 지표 근처에서는 땅에 닿아요. 원 궤도에서는 중력 가속도와 v²/r가 같아요.',
        },
        {
          type: 'quiz', title: '위성의 질량과 궤도 속력',
          goal: '같은 원 궤도를 도는 인공위성의 질량을 <b>2배로</b> 키우면 원 궤도 속력은 어떻게 될까요?',
          setup() { setScene('orbit'); },
          choices: ['무거운 만큼 2배로 빨리 돌아야 해요', '같아요. 질량과 관계없이 v = √(GM/r)이에요', '절반으로 줄어요', '√2배가 돼요'],
          answer: 1,
          feedback: ['무거워지면 중력(GMm/r²)도 m에 비례해서 커져요. 구심력 mv²/r에도 m이 있으니 약분돼요.', '', '질량이 커지면 중력도 구심력도 같은 비율로 커져서 속력은 변하지 않아요.', 'v = √(GM/r)에는 위성의 질량 m이 들어 있지 않아요.'],
          explain: 'GMm/r² = mv²/r의 양변에서 <b>m이 약분</b>돼요. 그래서 v = √(GM/r)은 위성의 질량과 관계없이 <b>중심 천체의 질량 M과 궤도 반지름 r</b>로만 정해져요.',
        },
      ],
    },
    {
      title: '주기와 반지름: v와 T', short: '주기와 반지름', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원 궤도 속력 v = √(GM/r)을 구했어요. 이제 <b>주기 T = 2πr/v</b>를 이어서 구하고, 앞 차시의 <b>케플러 제3법칙</b>이 중력에서 다시 나오는지 확인해요.</div>' +
        '<p>식의 유도 순서를 세운 뒤, 여러 고도에서 원 궤도 위성의 <b>(r, v, T)</b>를 측정해 표와 <b>T²–r³ 그래프</b>를 만들어요.</p>',
      features: ['meas'],
      setup() { S.ordC = [3, 0, 4, 2, 1]; S.ordBadC = {}; ordSigC.v = ''; S.me.h = 400; S.me.rec = []; setFlag('order', false); setScene('meas'); },
      recap: '중력 = 구심력에서 v = √(GM/r), T = 2πr/v, T² = 4π²r³/GM이 나와요. r가 4배면 v는 1/2배, T는 8배예요.',
      summary: '<ul><li>중력 = 구심력: GMm/r² = mv²/r → <b>v = √(GM/r)</b>, 주기 <b>T = 2πr/v = 2π√(r³/GM)</b>.</li><li>양변을 제곱하면 <b>T² = (4π²/GM) r³</b> → 앞 차시의 케플러 제3법칙이 만유인력에서 다시 나와요. 지구 둘레: 기울기 4π²/GM = <b>9.9 × 10⁻¹⁴ s²/m³</b>.</li><li>예: 고도 400 km(r = 6.77 × 10⁶ m): v = 7.67 km/s, T = 92분. GPS(r = 2.66 × 10⁷ m): v = 3.87 km/s, T = 12시간.</li><li>r가 <b>4배</b>이면 v는 <b>1/2배</b>(v ∝ r⁻¹ᐟ²), T는 <b>8배</b>(T ∝ r³ᐟ²)예요.</li></ul>',
      missions: [
        {
          title: '식 유도 순서 정렬하기', manual: true,
          goal: '다섯 장의 카드를 <b>▲▼ 버튼</b>으로 중력 = 구심력에서 T²의 식까지 유도하는 순서대로 정렬하고 ✔ 확인하기를 누르세요.',
          hint: '중력 = 구심력 → v의 식 → (T = 2πr/v) → T² 식 → 케플러 제3법칙 순서예요.',
          setup() { S.ordC = [3, 0, 4, 2, 1]; S.ordBadC = {}; ordSigC.v = ''; setFlag('order', true); setScene('meas'); },
          check() {
            const v = ordV(S.ordC, RULES_C);
            if (!v.length) { S.ordBadC = {}; return true; }
            const bad = {}; v.forEach(([a, b]) => { bad[a] = true; bad[b] = true; });
            if (Object.keys(bad).join() !== Object.keys(S.ordBadC).join()) { S.ordBadC = bad; updateCtl(); }
            return '순서가 맞지 않는 카드가 빨간 테두리로 표시돼요. 중력 = 구심력 → v → T → T² → 케플러 제3법칙을 떠올려요.';
          },
          status: () => '맞지 않는 쌍 ' + ordV(S.ordC, RULES_C).length + '개',
          explain: '<b>① GMm/r² = mv²/r → ② v = √(GM/r) → ③ T = 2πr/v → ④ T² = 4π²r³/GM → ⑤ T² ∝ r³</b>. 구심력과 만유인력을 같다고 놓으면 케플러 제3법칙이 따라 나와요.',
        },
        {
          title: '네 가지 반지름에서 v와 T 측정하기',
          goal: '서로 <b>다른 고도 네 곳</b>에서 📏 v·T 측정 기록을 눌러 표와 그래프를 채우세요.',
          hint: '고도 슬라이더를 바꿔 가며 기록해요. 예: 400 km, 2,000 km, 10,000 km, 20,200 km. 그래프의 점이 직선 위에 놓여요.',
          setup() { S.me.h = 400; S.me.rec = []; setFlag('order', false); setScene('meas'); },
          check: () => recDistinct() >= 4,
          hold: 0.6,
          status: () => '기록한 고도 ' + Math.min(4, recDistinct()) + ' / 4',
          explain: '높이 올라갈수록 v는 작아지고 T는 길어져요(400 km: 7.67 km/s·92분 → 20,200 km: 3.87 km/s·12시간). 모든 점에서 T²/r³ = 4π²/GM = 9.9 × 10⁻¹⁴ s²/m³로 같아서 T²–r³ 그래프가 <b>원점을 지나는 직선</b>이에요.',
        },
        {
          type: 'quiz', title: '궤도 반지름을 4배로 하면',
          goal: '위성의 원 궤도 반지름을 <b>4배</b>로 하면 속력 v와 주기 T는 각각 몇 배가 될까요?',
          setup() { setFlag('order', false); setScene('meas'); },
          choices: ['v는 1/2배, T는 8배', 'v는 1/4배, T는 4배', 'v는 1/2배, T는 4배', 'v는 2배, T는 1/8배'],
          answer: 0,
          feedback: ['', 'v = √(GM/r)이므로 r가 4배면 v는 1/√4 = 1/2배예요. 1/4배가 아니에요.', 'T = 2πr/v에서 r가 4배, v가 1/2배이므로 T는 4 ÷ ½ = 8배예요.', '반대로 생각했어요. 높이 올라갈수록 속력은 줄고 주기는 길어져요.'],
          explain: 'v ∝ r⁻¹ᐟ²이므로 r가 4배면 <b>v는 1/2배</b>, T = 2πr/v ∝ r³ᐟ²이므로 <b>T는 4³ᐟ² = 8배</b>예요. (T² ∝ r³: 앞 차시의 케플러 제3법칙)',
        },
      ],
    },
    {
      title: '정지 위성: 주기 24시간', short: '정지 위성', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반지름이 커지면 주기가 길어진다는 것을 식 T² = 4π²r³/GM으로 확인했어요. 통합과학에서 배운 <b>정지 위성(약 3.6만 km)</b>의 고도를 이제 식으로 직접 구해요.</div>' +
        '<p>주기가 지구 자전 주기(24시간)와 같으면 지상에서 위성이 <b>정지해 보여요</b>. 우주에서·지상에서·지도에서 위성이 어떻게 보이는지 비교하며 조건을 찾아요.</p>',
      features: ['geo'],
      setup() { const g = S.ge; g.view = 'space'; g.h = 20000; g.inc = 0; g.spd = 2; g.t = 0; geReset(); setFlag('hideT', false); setFlag('gIn', false); setScene('geo'); },
      recap: '정지 위성은 주기 24시간, 적도 상공, 자전과 같은 방향의 원 궤도예요: r = 4.22 × 10⁷ m, 고도 약 3.6만 km, 속력 3.07 km/s.',
      summary: '<ul><li>주기 T = 24시간(86 164 s)인 원 궤도: r³ = GMT²/4π² = 7.5 × 10²² m³ → <b>r = 4.22 × 10⁷ m</b>, 고도 = r − R = <b>3.58 × 10⁴ km(약 3.6만 km)</b>, 속력 <b>3.07 km/s</b>.</li><li>지상에서 정지해 보이려면 ① <b>주기 24시간</b> ② <b>적도 상공</b> ③ <b>자전과 같은 방향</b>이어야 해요. 같은 24시간 주기라도 극 궤도 위성은 남북으로 오가서 정지해 보이지 않아요.</li><li>비교: ISS(92분, 하루 약 15.6바퀴), GPS 위성(고도 약 2.0만 km, 주기 12시간, 하루 2바퀴).</li><li>통신·방송 위성은 안테나를 한 방향에 고정해도 계속 통신할 수 있어서 정지 위성을 써요.</li></ul>',
      missions: [
        {
          title: '정지 위성의 고도 계산하기', manual: true,
          goal: '주기가 지구 자전 주기 <b>24시간(86 164 s)</b>인 원 궤도의 <b>지표면 위 고도 h</b>를 계산해 만 km 단위로 입력하세요. (GM = 3.98 × 10¹⁴ m³/s², R = 6.37 × 10⁶ m)',
          hint: 'r³ = GMT² ÷ 4π² 이므로 r를 먼저 구하고(r ≈ 4.2 × 10⁷ m), 고도는 h = r − R이에요. 단위는 만 km예요(예: 1.2).',
          setup() { const g = S.ge; g.view = 'ground'; g.h = 20000; g.inc = 0; g.t = 0; geReset(); clr('iGh'); setFlag('hideT', true); setFlag('gIn', true); setScene('geo'); },
          check() {
            const x = num('iGh');
            if (x == null) return '고도를 만 km 단위의 숫자로 입력해 주세요. (예: 1.5)';
            const ok = Math.abs(x - GEO_H / 1e4) <= 0.15; fb([[$('#iGh'), ok]]);
            if (ok) return true;
            if (Math.abs(x - 4.22) <= 0.1) return 'r는 지구 중심에서 잰 거리예요. 지표면 위 고도는 r에서 지구 반지름(약 6400 km)을 빼야 해요.';
            if (x > 100) return '단위가 만 km예요. 35,800 km는 3.58만 km예요.';
            return 'r³ = GMT² ÷ 4π²에서 r를 구한 다음 h = r − R을 계산해요. 지상에서 보기에서 위성이 멈춰 보이는지도 확인해 보세요.';
          },
          status: () => '입력 ' + ($('#iGh').value.trim() || '—') + ' 만 km',
          explain: 'r³ = GMT² ÷ 4π² = 3.98 × 10¹⁴ × (86 164)² ÷ 39.5 = 7.5 × 10²² m³ → <b>r = 4.22 × 10⁷ m</b>. 고도 h = r − R = 4.22 × 10⁷ − 6.4 × 10⁶ = <b>3.58 × 10⁷ m ≈ 3.6만 km</b>. 이때 속력은 v = 2πr / T = 3.07 km/s예요.',
        },
        {
          type: 'quiz', title: '24시간 극 궤도 위성은 왜 멈춰 보이지 않을까',
          goal: '주기가 같은 24시간이라도 <b>극 궤도</b>(지도 화면에서 확인해요) 위성은 지상에서 정지해 보이지 않아요. 그 까닭은?',
          setup() { const g = S.ge; g.view = 'map'; g.h = Math.round(GEO_H / 100) * 100; g.inc = 90; g.t = 0; geReset(); setFlag('hideT', false); setFlag('gIn', false); setScene('geo'); },
          choices: ['극 궤도에서는 중력이 작용하지 않아서예요', '위성이 남북으로 오가며 위도가 계속 바뀌어, 지상의 한 점 위에 머물지 못해서예요', '극 궤도 위성의 주기는 24시간보다 짧아서예요', '지구 자전과 같은 방향으로 돌아서예요'],
          answer: 1,
          feedback: ['어느 궤도에서나 중력은 작용해요. 중력이 구심력이 되어 위성이 돌아요.', '', '같은 높이이므로 주기는 똑같이 24시간이에요. 문제는 궤도면의 방향이에요.', '같은 방향으로 도는 것은 정지 위성의 조건 중 하나예요. 극 궤도는 궤도면이 적도면과 달라요.'],
          explain: '정지해 보이려면 <b>적도 상공</b>의 궤도여야 해요. 극 궤도는 궤도면이 적도면과 수직이라 위성이 <b>북극과 남극 사이를 오가며</b> 지도 위에서 지그재그 자취를 그려요. 주기가 24시간이어도 위치는 계속 달라져요.',
        },
        {
          type: 'quiz', title: '통신 위성은 왜 정지 위성일까',
          goal: '방송·통신 위성이 <b>정지 위성</b>인 까닭으로 가장 알맞은 것은?',
          setup() { const g = S.ge; g.view = 'ground'; g.inc = 0; g.h = Math.round(GEO_H / 100) * 100; g.t = 0; geReset(); setScene('geo'); },
          choices: ['정지 위성이 지구에서 가장 가까워서 신호가 빨라서예요', '정지 위성은 속력이 가장 빨라서예요', '지상 안테나를 한 방향에 고정해도 위성이 늘 같은 하늘 위치에 있어서 계속 통신할 수 있어서예요', '정지 위성에서는 지구 자전 때문에 중력이 사라져서예요'],
          answer: 2,
          feedback: ['정지 위성(약 3.6만 km)은 ISS(약 400 km)보다 훨씬 멀어요.', '궤도가 높을수록 속력은 작아져요. 정지 위성은 3.07 km/s로 ISS(7.67 km/s)보다 느려요.', '', '정지 위성도 중력(약 0.22 m/s²)을 받아요. 그 중력이 구심력이에요.'],
          explain: '정지 위성은 지상에서 <b>늘 같은 위치</b>에 있어서 안테나를 한 방향에 고정해도 끊김 없이 통신해요. 대신 높이가 약 3.6만 km로 멀어 신호 지연이 있어요. 속력은 3.07 km/s로 낮아요.',
        },
      ],
    },
    {
      title: '질량 구하기: 위성으로 천체 재기', short: '질량 구하기', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위성의 r와 T만 알면 T² = 4π²r³/GM을 쓸 수 있다는 것을 알았어요. 이 식을 거꾸로 풀면 <b>M = 4π²r³/(GT²)</b>이에요. 눈으로 볼 수 없는 천체의 질량도 위성의 운동으로 잴 수 있어요.</div>' +
        '<p>이오–목성, 지구–태양, 달–지구의 관측 자료로 <b>중심 천체의 질량</b>을 구해 봐요. 그리고 위성 안에서 우주인이 떠 있는 까닭(<b>무중량 = 자유 낙하</b>)도 확인해요.</p>',
      features: ['mass', 'wless'],
      setup() { S.ms.i = 0; clr('iM'); setFlag('hideAns', false); setFlag('mIn', false); setScene('mass'); },
      recap: '중심 천체의 질량은 M = 4π²r³/(GT²)로 구해요. 위성의 질량은 식에 없어서 구할 수 없고, 위성 안의 무중량은 중력이 없어서가 아니라 자유 낙하 때문이에요.',
      summary: '<ul><li>위성의 r와 T로 <b>M = 4π²r³ / (G T²)</b>. 이오(r = 4.22 × 10⁸ m, T = 1.77일 = 1.53 × 10⁵ s) → 목성 <b>M = 1.9 × 10²⁷ kg</b>. 지구(r = 1.50 × 10¹¹ m, T = 1.00년 = 3.16 × 10⁷ s) → 태양 <b>2.0 × 10³⁰ kg</b>. 달(r = 3.84 × 10⁸ m, T = 2.36 × 10⁶ s) → 지구 <b>6.0 × 10²⁴ kg</b>(알려진 5.97 × 10²⁴ kg와 약 1 % 차이).</li><li>식에는 <b>위성의 질량 m이 없어서</b> 위성(작은 천체)의 질량은 이 방법으로 구할 수 없어요. 달의 질량은 달 둘레를 도는 위성의 자료가 필요해요.</li><li><b>무중량</b>: 고도 400 km에서도 중력 가속도는 8.7 m/s²(지표의 약 89 %)예요. 위성과 우주인이 <b>같은 가속도로 함께 떨어지는 중(자유 낙하)</b>이라 서로 누르는 힘이 없어 몸무게를 느끼지 못해요.</li></ul>',
      missions: [
        {
          title: '이오의 관측으로 목성의 질량 구하기', manual: true,
          goal: '이오의 r = 4.22 × 10⁸ m, T = 1.53 × 10⁵ s로 <b>M = 4π²r³ / (GT²)</b>을 계산해 목성의 질량을 <b>× 10²⁷ kg</b> 단위로 입력하세요.',
          hint: '화면의 r³과 T²을 이용해요: M = 4π² × r³ ÷ (6.67 × 10⁻¹¹ × T²). 계산 결과가 1.9 × 10²⁷ 꼴이에요.',
          setup() { S.ms.i = 0; clr('iM'); setFlag('hideAns', true); setFlag('mIn', true); setScene('mass'); },
          check() {
            const x = num('iM');
            if (x == null) return '숫자를 입력해 주세요. (× 10²⁷ kg 단위)';
            const ok = Math.abs(x - 1.9) <= 0.07; fb([[$('#iM'), ok]]);
            if (ok) return true;
            if (x < 0.1 || x > 50) return '자릿수를 확인해요. 계산 결과를 × 10²⁷ kg 단위로 바꿔 입력해요 (예: 3.2).';
            return 'M = 4π²r³ ÷ (GT²)에 r = 4.22 × 10⁸, T = 1.53 × 10⁵를 넣어요. G = 6.67 × 10⁻¹¹을 잊지 말아요.';
          },
          status: () => '입력 ' + ($('#iM').value.trim() || '—') + ' × 10²⁷ kg',
          explain: 'r³ = 7.5 × 10²⁵ m³, T² = 2.34 × 10¹⁰ s² → M = 4π² × 7.5 × 10²⁵ ÷ (6.67 × 10⁻¹¹ × 2.34 × 10¹⁰) = <b>1.9 × 10²⁷ kg</b>. 목성의 질량은 지구의 약 318배예요.',
        },
        {
          title: '달의 관측으로 지구의 질량 구해 비교하기', manual: true,
          goal: '달–지구 자료(r = 3.84 × 10⁸ m, T = 2.36 × 10⁶ s)로 지구의 질량을 <b>× 10²⁴ kg</b> 단위로 계산해 입력하세요. 알려진 값 5.97 × 10²⁴ kg과 비교해 봐요.',
          hint: 'M = 4π²r³ ÷ (GT²). 위성이 달이고 중심 천체가 지구예요. 화면의 달–지구 자료를 선택해요.',
          setup() { S.ms.i = 2; clr('iM'); setFlag('hideAns', true); setFlag('mIn', true); setScene('mass'); },
          check() {
            const x = num('iM');
            if (x == null) return '숫자를 입력해 주세요. (× 10²⁴ kg 단위)';
            const ok = Math.abs(x - 6.02) <= 0.2; fb([[$('#iM'), ok]]);
            if (ok) return true;
            if (x < 0.1 || x > 100) return '자릿수를 확인해요. 계산 결과를 × 10²⁴ kg 단위로 바꿔 입력해요 (예: 6.0).';
            return 'M = 4π²r³ ÷ (GT²)에 r = 3.84 × 10⁸, T = 2.36 × 10⁶을 넣어요. 중심 천체는 지구예요.';
          },
          status: () => '입력 ' + ($('#iM').value.trim() || '—') + ' × 10²⁴ kg',
          explain: 'M = 4π²(3.84 × 10⁸)³ ÷ (6.67 × 10⁻¹¹ × (2.36 × 10⁶)²) = <b>6.0 × 10²⁴ kg</b>. 알려진 값 5.97 × 10²⁴ kg과 약 1 % 차이예요(관측값을 반올림해서 생긴 차이). 달이 아니라 <b>지구</b>의 질량을 구한 것에 주의해요.',
        },
        {
          type: 'quiz', title: '위성 안의 우주인은 왜 둥둥 뜰까',
          goal: '고도 400 km의 위성 안에서 우주인이 <b>둥둥 떠 있는</b> 까닭은?',
          setup() { setFlag('hideAns', false); setFlag('mIn', false); setScene('wless'); },
          choices: ['그곳에는 지구의 중력이 거의 없어서예요', '위성과 우주인이 같은 가속도(약 8.7 m/s²)로 함께 떨어지고 있어서 서로 누르는 힘이 없기 때문이에요', '우주에는 공기가 없어서예요', '위성이 빨라서 생기는 원심력이 중력을 없애서예요'],
          answer: 1,
          feedback: ['고도 400 km에서도 중력 가속도는 지표의 약 89 %(8.7 m/s²)예요. 중력이 거의 있는 곳이에요.', '', '공기가 있어도 마찬가지예요. 떠 있는 까닭은 공기가 아니라 자유 낙하 때문이에요.', '원심력은 이 과정에서 쓰지 않아요. 중력은 그대로 있고, 그 중력이 구심력이 되어 위성과 우주인이 함께 원운동(낙하)해요.'],
          explain: '위성과 우주인은 같은 중력 가속도 g = GM/r² ≈ <b>8.7 m/s²</b>로 함께 <b>자유 낙하</b> 중이에요. 바닥이 우주인을 떠받치는 수직항력이 없으니 몸무게를 못 느껴요. 중력이 0이 아니라 <b>같이 떨어지고 있는 것</b>이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-satellite', mount: '#game', badge: '위성 박사', homeHref: '../../index.html#hm',
    featureLabels: { orbit: '🛰️ 궤도 시뮬레이션 · 중력과 구심 가속도', meas: '📏 (r, v, T) 표 · T²–r³ 그래프', geo: '🌍 정지 위성 · 우주·지상·지도 시점', mass: '⚖️ 천체 질량 계산', wless: '🧑‍🚀 위성 안의 무중량' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  obReady(); setScene('orbit');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    if (S.mode === 'orbit' || S.mode === 'meas') obStep(dt);
    orbitWatch(); geStep(dt);
    renderOrderC();
    switch (S.mode) {
      case 'orbit': drawOrbit(dt); break;
      case 'meas': drawMeas(dt); break;
      case 'geo': drawGeo(dt); break;
      case 'mass': drawMass(dt); break;
      default: drawWless(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, obLaunch, obReady, obRelaunch, vcNow, meRecord, mapPos, periodOf, GEO_R, GEO_H, massOf, MASSES, seen, ordV, RULES_C, orbitCircular,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { obStep(0.02); orbitWatch(); geStep(0.02); } },
  };
})();
