/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 케플러 법칙과 중력 (5차시)
   성취기준 [12역학01-04] 케플러 법칙으로부터 중력의 존재가 밝혀지는 과학사적 배경을 이해하고, 중력을 이용하여 인공위성과 행성의 운동을 분석하고 설명할 수 있다. (앞부분)
   ① 관찰: 관측 자료 (행성 r·T 기록표, 티코의 화성 관측 점, 같은 시간 부채꼴 넓이)
   ② 탐구: 제3법칙 (T²–r³ 그래프, 직선 맞추기, 소행성 주기 예측)
   ③ 모형: 구심력 연결 (F = 4π²mr/T², T² = kr³ → F ∝ 1/r²)
   ④ 설명: 만유인력 (사과와 달, F = GMm/r², 과학사 연표)
   원 궤도로 단순화한 정량 분석만 다뤄요. 타원 궤도의 정량적 설명(제2법칙 식, 이심률, 타원 궤도의 에너지)은 다루지 않아요.
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


  /* ================= 자료·물리 ================= */
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const G_NEWTON = 6.67e-11;
  /* 태양계 관측 자료: 긴반지름 r(AU), 공전 주기 T(년) */
  const PL = [
    { n: '수성', r: 0.387, T: 0.241, c: '#a8a29e', sz: 4.5, ph: 0.6 },
    { n: '금성', r: 0.723, T: 0.615, c: '#f2c46d', sz: 6, ph: 2.4 },
    { n: '지구', r: 1.000, T: 1.000, c: '#3b82f6', sz: 6.5, ph: 4.0 },
    { n: '화성', r: 1.524, T: 1.881, c: '#ef6a4a', sz: 5.5, ph: 5.3 },
    { n: '목성', r: 5.203, T: 11.86, c: '#e0a96d', sz: 10, ph: 1.2 },
    { n: '토성', r: 9.537, T: 29.46, c: '#d9c27a', sz: 9, ph: 3.3 },
  ];
  const r3 = (p) => p.r * p.r * p.r, t2 = (p) => p.T * p.T;
  const rat = (p) => t2(p) / r3(p);
  const f3 = (v) => v.toFixed(3);
  /* 케플러 방정식 (제2법칙 모형: 이심률을 크게 그린 가상 행성 e = 0.6, 화성 관측 점 e = 0.093) */
  function kepE(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
  function kpos(M, e, a) { const E = kepE(M, e); return { x: a * (Math.cos(E) - e), y: a * Math.sqrt(1 - e * e) * Math.sin(E), E }; }
  const E_AREA = 0.6, E_MARS = 0.0934, A_MARS = 1.524, MARS_W = 25 * RAD;
  const MARS_N = 12;
  const marsObs = (k) => {
    const M = (k * 30 + 10) * RAD, p = kpos(M, E_MARS, A_MARS), rr = Math.hypot(p.x, p.y) + 0.004 * Math.sin(k * 2.7 + 1), th = Math.atan2(p.y, p.x) + MARS_W + 0.004 * Math.cos(k * 1.9);
    return { x: rr * Math.cos(th), y: rr * Math.sin(th) };
  };
  /* 같은 시간(T/12) 동안 쓸고 가는 넓이 (태양 초점 기준, 타원 전체의 비율) */
  function sectorFrac(M0, e) {
    const n = 48, pts = [];
    for (let i = 0; i <= n; i++) pts.push(kpos((M0 + (30 * RAD) * i / n), e, 1));
    let A = 0; for (let i = 0; i < n; i++) A += (pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y) / 2;
    return A / (Math.PI * Math.sqrt(1 - e * e));
  }
  /* 순서 배열 카드 */
  const ORD_A = [
    '원 궤도 가속도: a = v² / r, v = 2πr / T  →  a = 4π²r / T²',
    '행성이 받는 힘(구심력): F = ma = 4π²mr / T²',
    '케플러 제3법칙: T² = k·r³ (k는 상수)',
    '대입하면: F = 4π²mr / (k·r³) = 4π²m / (k·r²)',
    '따라서 F ∝ 1 / r²: 태양이 당기는 힘은 거리의 제곱에 반비례',
  ];
  const RULES_A = [[0, 1], [1, 3], [2, 3], [3, 4]];
  const ORD_B = [
    '코페르니쿠스: 지구가 태양 둘레를 돈다는 지동설을 주장했어요',
    '티코 브라헤: 맨눈으로 행성의 위치를 아주 정밀하게 관측했어요',
    '케플러: 관측 자료에서 행성 운동의 세 법칙을 찾아냈어요',
    '갈릴레이: 망원경으로 목성의 위성을 관측하고 낙하를 연구했어요',
    '뉴턴: 만유인력 법칙으로 케플러 법칙을 설명했어요 (프린키피아)',
    '해왕성의 발견: 중력 법칙으로 보이지 않는 행성의 위치를 예측했어요',
  ];
  const RULES_B = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 6; j++) RULES_B.push([i, j]);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sys', clock: 0, fade: 0,
    ob: { sel: 2, zm: 'in', zr: 1.75, spd: 0.4, t: 0, rec: [false, false, false, false, false, false], mk: 0, mkT: [], arc: 0, ph: 0, M: 0, sec: [], secPop: 0 },
    gr: { done: [false, false, false, false, false, false], fly: [], k: 0.6, ast: false, cur: -1 },
    fo: { r: 1, th: 0, seen2: false },
    mo: { ang: 0 },
    ordA: [3, 0, 4, 2, 1], ordB: [4, 1, 5, 0, 3, 2], ordBadA: {}, ordBadB: {},
    flags: { kfit: false, astIn: false, order: false, ratIn: false, maIn: false, tl: false, hideCmp: false },
  };
  let game = null;
  const eff = (k) => (game && game.free ? false : S.flags[k]);
  const showCalc = (k) => (game && game.free ? k === 'kfit' : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['sys', 'mars', 'area', 'graph', 'force', 'moon'];
  const ALLOWED = [['sys', 'mars', 'area'], ['graph'], ['force'], ['moon']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const ordV = (ord, rules) => { const pos = {}; ord.forEach((id, i) => { pos[id] = i; }); return rules.filter(([a, b]) => pos[a] > pos[b]); };

  /* 궤도 시간 */
  function obStep(dt) {
    const o = S.ob;
    o.t += dt * o.spd;
    o.M = (o.M + dt * o.spd / 0.4 * TAU / 10) % TAU;
    o.zr = approach(o.zr, o.zm === 'in' ? 1.75 : 10.2, dt, 4);
    o.arc = o.mk >= MARS_N ? Math.min(1, o.arc + dt / 1.6) : 0;
  }

  /* ================= ① 태양계·화성 관측·같은 시간 ================= */
  function obL() { return PHONE ? { c: { x: 6, y: 6, w: 468, h: 346 }, pn: { x: 6, y: 358, w: 468, h: 352 } } : { c: { x: 6, y: 6, w: 520, h: 608 }, pn: { x: 532, y: 6, w: 262, h: 608 } }; }
  function sunDraw(x, y, r) { D.glow(x, y, r * 3.2, '#ffd447', 0.5); D.sphere(x, y, r, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
  function recTable(x, y, w, rh) {
    const o = S.ob, cw = [0.34, 0.33, 0.33];
    T(x, y + 18, '📋 관측 기록표', 14, '#26324a', 'left', 800);
    const hy = y + 44;
    ['행성', '거리 r (AU)', '주기 T (년)'].forEach((h, i) => T(x + w * (i ? cw[0] + (i - 1) * cw[1] + (i === 1 ? 0 : 0) : 0) + (i ? w * 0.0 : 0) + (i ? w * 0.165 : 0), hy, h, 13, '#5a6679', 'center', 800));
    PL.forEach((p, i) => {
      const yy = hy + 10 + i * rh, sel = o.sel === i;
      if (sel) { ctx.fillStyle = 'rgba(56,103,244,.1)'; D.roundRect(x - 6, yy - 2, w + 12, rh - 2, 8); ctx.fill(); }
      D.sphere(x + 6, yy + rh / 2 - 2, 5, p.c, { gloss: false });
      T(x + 18, yy + rh / 2 + 3, p.n, 14, '#26324a', 'left', 800);
      const got = o.rec[i];
      T(x + w * 0.5 + 0, yy + rh / 2 + 3, got ? p.r.toFixed(3) : '?', 14, got ? '#1d4ed8' : '#b4bccb', 'center', 800);
      T(x + w * 0.83, yy + rh / 2 + 3, got ? p.T.toFixed(3) : '?', 14, got ? '#c2410c' : '#b4bccb', 'center', 800);
    });
  }
  function drawSys(dt) {
    const L = obL(), o = S.ob, c = L.c;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock);
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2, k = (Math.min(c.w, c.h) / 2 - 16) / o.zr;
    PL.forEach((p, i) => {
      const R = p.r * k;
      ctx.strokeStyle = i === o.sel ? 'rgba(255,255,255,.75)' : 'rgba(180,200,255,.28)'; ctx.lineWidth = i === o.sel ? 2.2 : 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    });
    sunDraw(cx, cy, Math.max(6, Math.min(14, 11 * (1.75 / o.zr) ** 0.35)));
    PL.forEach((p, i) => {
      const th = p.ph + TAU * o.t / p.T, R = p.r * k, x = cx + R * Math.cos(th), y = cy - R * Math.sin(th);
      const rr = p.sz * (o.zm === 'in' ? 1 : 0.8);
      D.sphere(x, y, rr, p.c, { gloss: true });
      if (i === o.sel) { D.ring(x, y, rr + 8, S.clock, { color: '#ffffff', width: 2 }); D.label(x, y - rr - 20, p.n, { bg: 'rgba(255,255,255,.9)', color: '#1b2333', size: 13, pad: 7 }); }
    });
    // 눈금 (1 AU)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x + 14, c.y + c.h - 18); ctx.lineTo(c.x + 14 + k, c.y + c.h - 18); ctx.stroke();
    T(c.x + 14, c.y + c.h - 26, '1 AU = 지구–태양 거리', 13, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    T(c.x + 12, c.y + 24, '위에서 본 태양계 (원 궤도로 단순화)', 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    T(c.x + c.w - 12, c.y + 24, 't = ' + o.t.toFixed(1) + ' 년', 14, '#ffe58a', 'right', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    ctx.restore();
    // 오른쪽(또는 아래) 패널
    const pn = L.pn; panel(pn.x, pn.y, pn.w, pn.h, 14);
    const p = PL[o.sel], rh = PHONE ? 29 : 40, tx = pn.x + 16, tw = pn.w - 32;
    recTable(tx, pn.y + 6, tw, rh);
    const iy = pn.y + 56 + 6 * rh + 22;
    ctx.fillStyle = '#f4f7fd'; D.roundRect(pn.x + 10, iy, pn.w - 20, PHONE ? 100 : 160, 12); ctx.fill();
    D.sphere(pn.x + 34, iy + 26, 11, p.c, { gloss: true });
    T(pn.x + 54, iy + 32, p.n + ' 관측 자료', 15, '#26324a', 'left', 800);
    T(pn.x + 24, iy + 60, '태양까지 거리 r = ' + p.r.toFixed(3) + ' AU', 14, '#1d4ed8', 'left', 800);
    T(pn.x + 24, iy + 84, '공전 주기 T = ' + p.T.toFixed(3) + ' 년', 14, '#c2410c', 'left', 800);
    if (!PHONE) { T(pn.x + 24, iy + 112, '1 AU = 1.5 × 10¹¹ m', 13, '#5a6679', 'left', 700); T(pn.x + 24, iy + 136, '(r는 원 궤도 반지름 = 긴반지름)', 13, '#5a6679', 'left', 700); }
    parts.update(dt); parts.draw(ctx);
  }
  function drawMars(dt) {
    const L = obL(), o = S.ob, c = L.c;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 60 });
    const sc = (Math.min(c.w, c.h) / 2 - 26) / 1.75, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const X = (x) => cx + x * sc, Y = (y) => cy - y * sc;
    // 기준 원 (중심: 타원의 중심)
    const ecx = -A_MARS * E_MARS * Math.cos(MARS_W) * -1, ecy = -A_MARS * E_MARS * Math.sin(MARS_W) * -1;      // 타원 중심(태양이 한 초점)
    const ox = -A_MARS * E_MARS * Math.cos(MARS_W), oy = -A_MARS * E_MARS * Math.sin(MARS_W);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(X(ox), Y(oy), A_MARS * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 맞춘 타원 곡선(관측 점을 모두 찍으면 그려져요)
    if (o.arc > 0) {
      ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 3; ctx.beginPath();
      const n = Math.floor(120 * o.arc);
      for (let i = 0; i <= n; i++) { const E = TAU * i / 120, x = A_MARS * (Math.cos(E) - E_MARS), y = A_MARS * Math.sqrt(1 - E_MARS * E_MARS) * Math.sin(E); const px = x * Math.cos(MARS_W) - y * Math.sin(MARS_W), py = x * Math.sin(MARS_W) + y * Math.cos(MARS_W); if (i) ctx.lineTo(X(px), Y(py)); else ctx.moveTo(X(px), Y(py)); }
      ctx.stroke();
    }
    sunDraw(X(0), Y(0), 10);
    T(X(0) + 14, Y(0) + 24, '태양 (초점)', 13, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    D.sphere(X(ox), Y(oy), 3, '#fff', { gloss: false }); T(X(ox) + 6, Y(oy) - 8, '원의 중심', 13, '#dfe8ff', 'left', 700, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    for (let k = 0; k < o.mk; k++) {
      const q = marsObs(k), age = Math.min(1, (S.clock - (o.mkT[k] || 0)) / 0.35), s = RM ? 1 : SciSim.ease.outBack(Math.max(0, age));
      D.sphere(X(q.x), Y(q.y), 6.5 * s, '#ef6a4a', { gloss: true, outline: '#fff', outlineWidth: 1.5 });
    }
    T(c.x + 12, c.y + 24, '티코 브라헤의 화성 관측 점 (태양 기준)', 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    T(c.x + 12, c.y + c.h - 14, '관측 점 ' + o.mk + ' / ' + MARS_N, 14, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    ctx.restore();
    const pn = L.pn; panel(pn.x, pn.y, pn.w, pn.h, 14);
    const x0 = pn.x + 16, fs = PHONE ? 13.5 : 14, lh = PHONE ? 24 : 27;
    T(x0, pn.y + 28, '🔭 제1법칙: 타원 궤도', 15, '#26324a', 'left', 800);
    lines(x0, pn.y + 28 + lh, lh, fs, [
      ['화성의 관측 점을 이어 보면', '#26324a'],
      ['원이 아니라 약간 찌그러진', '#26324a'],
      ['타원이에요.', '#26324a'],
      [o.mk >= MARS_N ? '태양은 타원의 한 초점에 있어요' : '', '#14753f'],
      [o.mk >= MARS_N ? '(점선 원의 중심이 아니에요).' : '', '#14753f'],
    ]);
    if (o.mk >= MARS_N) lines(x0, pn.y + 28 + lh * 7, lh, fs, [['화성 궤도는 타원이지만 원에', '#5a6679'], ['매우 가까워요 (이심률 0.09).', '#5a6679'], ['이 차시의 계산은 원 궤도로', '#5a6679'], ['단순화해서 다뤄요.', '#5a6679']]);
    parts.update(dt); parts.draw(ctx);
  }
  const secKind = (M0) => { const mc = Math.cos(M0 + 15 * RAD); return mc > 0.49 ? 'near' : mc < -0.49 ? 'far' : 'mid'; };
  const secName = { near: '근일점 쪽', far: '원일점 쪽', mid: '중간' };
  function drawArea(dt) {
    const L = obL(), o = S.ob, c = L.c;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 60 });
    const a = PHONE ? 112 : 168, cx = c.x + c.w / 2, cy = c.y + c.h / 2 + 10, b = a * Math.sqrt(1 - E_AREA * E_AREA);
    const sx0 = cx - a * E_AREA, sy0 = cy;                     // 태양(초점)
    const P = (M) => { const q = kpos(M, E_AREA, a); return [sx0 - q.x, sy0 - q.y]; };     // 근일점이 왼쪽
    ctx.strokeStyle = 'rgba(180,200,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, TAU); ctx.stroke();
    const cols = ['rgba(255,99,99,.55)', 'rgba(80,170,255,.55)', 'rgba(120,220,120,.55)', 'rgba(255,200,60,.55)'];
    o.sec.forEach((s, i) => {
      ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.moveTo(sx0, sy0);
      for (let j = 0; j <= 36; j++) { const q = P(s.M0 + (30 * RAD) * j / 36); ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      const mq = P(s.M0 + 15 * RAD), tx = sx0 + (mq[0] - sx0) * 0.55, ty = sy0 + (mq[1] - sy0) * 0.55;
      D.label(tx, ty, String(i + 1), { bg: 'rgba(30,41,59,.8)', size: 13, pad: 6 });
    });
    // 행성과 속도 화살표(길이 ∝ 속력)
    const M = o.M, q = P(M), E = kepE(M, E_AREA);
    const dE = 1 / (1 - E_AREA * Math.cos(E));
    const vx = -a * Math.sin(E) * dE, vy = b / a * a * Math.cos(E) * dE;      // 단위: a·n
    const vlen = Math.hypot(vx, vy), vs = 56 / 1;
    const rr = Math.hypot(q[0] - sx0, q[1] - sy0);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]);
    sunDraw(sx0, sy0, 9);
    D.sphere(q[0], q[1], 8, '#3b82f6', { gloss: true });
    const ux = -vx / a, uy = -vy / a;                                       // 화면 방향(180° 회전 반영)
    D.arrow(q[0], q[1], q[0] + ux * vs, q[1] + uy * vs, { color: '#ffd447', width: 3.5, head: 10 });
    T(c.x + 12, c.y + 24, '같은 시간 동안 쓸고 가는 넓이 (이심률을 크게 그린 모형)', PHONE ? 13.5 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    T(c.x + 12, c.y + c.h - 14, '화살표 길이 = 속력 · 가까울수록 빨라요', 13.5, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    const startM = (S.ob.ph) * RAD, sp = P(startM);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sp[0], sp[1]); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(sp[0], sp[1], 5, '#fff', { gloss: false });
    ctx.restore();
    const pn = L.pn; panel(pn.x, pn.y, pn.w, pn.h, 14);
    const x0 = pn.x + 16, fs = PHONE ? 13.5 : 14, lh = PHONE ? 24 : 27;
    T(x0, pn.y + 28, '⏱ 제2법칙: 같은 시간, 같은 넓이', 15, '#26324a', 'left', 800);
    lines(x0, pn.y + 28 + lh, lh, fs - 0.5, [
      ['행성과 태양을 이은 선이 같은 시간', '#26324a'],
      ['동안 쓸고 가는 넓이는 같아요.', '#26324a'],
      ['→ 태양에 가까울 때 더 빨라요.', '#b45309'],
    ]);
    const y1 = pn.y + 28 + lh * 4.6;
    T(x0, y1, '색칠한 부채꼴 (시간 T/12)', 13.5, '#5a6679', 'left', 800);
    o.sec.forEach((s, i) => {
      const yy = y1 + 26 + i * (PHONE ? 24 : 30);
      ctx.fillStyle = cols[i % 4].replace('.55', '.9'); D.roundRect(x0, yy - 13, 18, 18, 5); ctx.fill();
      T(x0 + 9, yy + 1, String(i + 1), 13, '#1b2333', 'center', 800);
      T(x0 + 28, yy + 2, secName[secKind(s.M0)] + ' · 넓이 ' + (sectorFrac(s.M0, E_AREA) * 100).toFixed(1) + ' %', 14, '#26324a', 'left', 800);
    });
    if (!o.sec.length) T(x0, y1 + 28, '위치를 고르고 🎨 색칠을 눌러요', 13.5, '#7b869a', 'left', 700);
    else T(x0, y1 + 26 + o.sec.length * (PHONE ? 24 : 30) + 6, '(타원 전체 넓이에 대한 비율)', 13, '#7b869a', 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② T²–r³ 그래프 ================= */
  const fmtV = (v) => (v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0));
  function grL() {
    return PHONE
      ? { tb: { x: 6, y: 6, w: 468, h: 262 }, g: { x: 6, y: 274, w: 468, h: 436 }, rh: 31 }
      : { tb: { x: 6, y: 6, w: 452, h: 608 }, g: { x: 464, y: 6, w: 330, h: 608 }, rh: 44 };
  }
  const grCols = () => { const w = grL().tb.w - 16; return [0.19, 0.12, 0.13, 0.17, 0.17, 0.22].map((f) => f * w); };
  function grRowY(i) { const L = grL(); return L.tb.y + 64 + i * L.rh; }
  function grCellX(ci) { const L = grL(), cs = grCols(); let x = L.tb.x + 8; for (let k = 0; k < ci; k++) x += cs[k]; return x + cs[ci] / 2; }
  function grDone() { return S.gr.done.filter(Boolean).length; }
  function grProcess(i) {
    const g = S.gr;
    if (i == null) i = g.done.indexOf(false);
    if (i < 0 || g.done[i]) { if (i >= 0) showHint('이 행성은 이미 찍었어요.', 2000); return; }
    g.done[i] = true; g.fly.push({ i, t: 0 }); g.cur = i; Sound.click(); updateCtl();
  }
  function grStep(dt) { const g = S.gr; g.fly.forEach((f) => { f.t = Math.min(1, f.t + dt / (RM ? 0.01 : 0.8)); }); }
  function grPlot(L) {
    const a = axes(L.g, { xmin: 0, xmax: 900, xstep: 300, xd: 0, ymin: 0, ymax: 900, ystep: 300, yd: 0, title: 'T² – r³ 그래프', right: '가로 r³ (AU³) · 세로 T² (년²)' });
    return a;
  }
  function drawGraph(dt) {
    const L = grL(), g = S.gr;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 표
    const tb = L.tb, cs = grCols(); card(tb.x, tb.y, tb.w, tb.h);
    T(tb.x + 12, tb.y + 24, '📋 관측 자료 → T², r³ 계산', 14, '#26324a', 'left', 800);
    ['행성', 'r (AU)', 'T (년)', 'r³', 'T²', 'T² / r³'].forEach((h, i) => T(grCellX(i), tb.y + 54, h, 13, '#5a6679', 'center', 800));
    PL.forEach((p, i) => {
      const y = grRowY(i), done = g.done[i];
      if (g.cur === i) { ctx.fillStyle = 'rgba(56,103,244,.1)'; D.roundRect(tb.x + 4, y - 2, tb.w - 8, L.rh - 4, 8); ctx.fill(); }
      const ty = y + L.rh / 2 + 3;
      D.sphere(tb.x + 16, ty - 5, 4.5, p.c, { gloss: false });
      T(grCellX(0) + 6, ty, p.n, 14, '#26324a', 'center', 800);
      T(grCellX(1), ty, p.r.toFixed(3), 13.5, '#1d4ed8', 'center', 800);
      T(grCellX(2), ty, p.T.toFixed(3), 13.5, '#c2410c', 'center', 800);
      T(grCellX(3), ty, done ? fmtV(r3(p)) : '·', 13.5, done ? '#26324a' : '#b4bccb', 'center', 800);
      T(grCellX(4), ty, done ? fmtV(t2(p)) : '·', 13.5, done ? '#26324a' : '#b4bccb', 'center', 800);
      T(grCellX(5), ty, done ? rat(p).toFixed(2) : '·', 14, done ? '#14753f' : '#b4bccb', 'center', 800);
    });
    const done = grDone();
    if (done === 6) T(tb.x + tb.w / 2, grRowY(6) + 8, '모든 행성에서 T² / r³ = 1.00 (년²/AU³)', 14, '#14753f', 'center', 800);
    else T(tb.x + tb.w / 2, grRowY(6) + 8, '행을 누르거나 📍 버튼으로 하나씩 찍어요 (' + done + ' / 6)', 13.5, '#7b869a', 'center', 700);
    if (!PHONE) { lines(tb.x + 14, grRowY(6) + 44, 24, 13.5, [['관측 오차 안에서 T² / r³는 일정해요 (0.999 ~ 1.002).', '#5a6679'], ['SI 단위로는 T² / r³ = 4π² / (GM태양) = 2.97 × 10⁻¹⁹ s²/m³', '#5a6679']]); }
    // 그래프
    const a = grPlot(L), gg = L.g;
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    if (done === 6 || (game && game.free && done > 0)) {
      const hit = Math.abs(g.k - 1) <= 0.02;
      ctx.strokeStyle = hit ? GREEN : '#7c3aed'; ctx.lineWidth = 3; ctx.setLineDash(hit ? [] : [8, 5]);
      ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(0)); ctx.lineTo(a.gx(900), a.gy(900 * g.k)); ctx.stroke(); ctx.setLineDash([]);
    }
    const drawPt = (i, ax, gx2, gy2, rad) => {
      const f = g.fly.find((q) => q.i === i), p = PL[i];
      if (!g.done[i]) return;
      const tx = a.gx(r3(p)), ty = a.gy(t2(p));
      let x = tx, y = ty;
      if (f && f.t < 1) { const e = SciSim.ease.outCubic(f.t), sx = grCellX(4), sy = grRowY(i) + L.rh / 2; x = sx + (tx - sx) * e; y = sy + (ty - sy) * e - Math.sin(e * Math.PI) * 40; }
      D.sphere(x, y, rad, p.c, { gloss: false, outline: '#1b2333', outlineWidth: 1 });
    };
    PL.forEach((p, i) => drawPt(i, a, 0, 0, 5.5));
    if (g.ast) { D.sphere(a.gx(64), a.gy(64), 6, '#8b5cf6', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); }
    ctx.restore();
    if (g.ast) T(a.gx(64) + 10, a.gy(64) + 5, '소행성 8년', 13, '#6d28d9', 'left', 800);
    // 확대 그림 (안쪽 행성)
    const ins = { x: gg.x + gg.w - (PHONE ? 150 : 150) - 8, y: gg.y + gg.h - (PHONE ? 176 : 180) - 24, w: PHONE ? 150 : 150, h: PHONE ? 150 : 150 };
    ctx.fillStyle = '#f7f9fd'; D.roundRect(ins.x - 4, ins.y - 20, ins.w + 8, ins.h + 26, 8); ctx.fill(); ctx.strokeStyle = '#d4dbe8'; ctx.lineWidth = 1.5; ctx.stroke();
    T(ins.x + 2, ins.y - 6, '🔍 안쪽 행성 확대 (0~4)', 13, '#26324a', 'left', 800);
    const ix = (v) => ins.x + 8 + (ins.w - 16) * v / 4, iy = (v) => ins.y + ins.h - 8 - (ins.h - 16) * v / 4;
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ix(0), iy(4)); ctx.lineTo(ix(0), iy(0)); ctx.lineTo(ix(4), iy(0)); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(ins.x, ins.y, ins.w, ins.h); ctx.clip();
    if (done === 6 || (game && game.free && done > 0)) { ctx.strokeStyle = Math.abs(g.k - 1) <= 0.02 ? GREEN : '#7c3aed'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ix(0), iy(0)); ctx.lineTo(ix(4), iy(4 * g.k)); ctx.stroke(); }
    PL.forEach((p, i) => { if (g.done[i] && r3(p) <= 4.2) { const f = g.fly.find((q) => q.i === i); if (!f || f.t >= 1) D.sphere(ix(r3(p)), iy(t2(p)), 4.5, p.c, { gloss: false, outline: '#1b2333', outlineWidth: 1 }); } });
    ctx.restore();
    if (Math.abs(g.k - 1) <= 0.02 && done === 6) D.label(a.ix + a.iw * 0.34, a.iy + 26, 'k = ' + g.k.toFixed(2) + ' ✓ 모든 점을 지나요', { bg: GREEN, size: 13.5, pad: 8 });
    else if (done === 6) T(a.ix + 10, a.iy + 22, 'k = ' + g.k.toFixed(2), 14, '#6d28d9', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'graph') return false;
      const L = grL(), tb = L.tb;
      if (p.x < tb.x || p.x > tb.x + tb.w) return false;
      for (let i = 0; i < 6; i++) { const y = grRowY(i); if (p.y >= y - 2 && p.y <= y + L.rh - 2) { grProcess(i); return false; } }
      return false;
    },
    hover(p) { if (S.mode !== 'graph') return ''; const L = grL(); if (p.x < L.tb.x || p.x > L.tb.x + L.tb.w) return ''; for (let i = 0; i < 6; i++) { const y = grRowY(i); if (p.y >= y - 2 && p.y <= y + L.rh - 2 && !S.gr.done[i]) return 'pointer'; } return ''; },
  });

  /* ================= ③ 힘과 거리 ================= */
  const foRatio = () => 1 / (S.fo.r * S.fo.r);
  function foStep(dt) { const f = S.fo; f.th += TAU * 0.4 * dt / Math.pow(f.r, 1.5); if (Math.abs(f.r - 2) < 1e-9) f.seen2 = true; }
  function drawForce(dt) {
    const f = S.fo, c = { x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 };
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 70 });
    const kk = PHONE ? 32 : 38, ax = PHONE ? 150 : 240, cy = c.y + c.h / 2 + 4;
    ctx.strokeStyle = 'rgba(180,200,255,.3)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
    [1, 2, 3, 4].forEach((r) => { ctx.beginPath(); ctx.arc(ax, cy, r * kk, 0, TAU); ctx.stroke(); T(ax + r * kk + 4, cy - 4, r + ' AU', 13, 'rgba(220,230,255,.85)', 'left', 700); }); ctx.setLineDash([]);
    sunDraw(ax, cy, 12);
    const px = ax + f.r * kk * Math.cos(f.th), py = cy - f.r * kk * Math.sin(f.th);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(px, py, 8, '#3b82f6', { gloss: true });
    D.label(ax + (px - ax) / 2, cy + (py - cy) / 2 - (py < cy ? 14 : -14), 'r = ' + f.r.toFixed(1) + ' AU', { bg: 'rgba(255,255,255,.9)', color: '#1b2333', size: 13, pad: 7 });
    T(c.x + 12, c.y + 24, PHONE ? '태양에서 r만큼 떨어진 행성' : '같은 질량의 행성이 태양에서 r만큼 떨어져 돌 때', 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 오른쪽: 태양이 당기는 힘 화살표 (길이는 F에 비례, r = 1 AU일 때 = 기준)
    const x0 = PHONE ? 292 : 480, aw = PHONE ? 90 : 190, y0 = c.y + 52, rowH = PHONE ? 50 : 54;
    ctx.fillStyle = 'rgba(247,249,253,.95)'; ctx.fillRect(x0 - 12, c.y, c.x + c.w - x0 + 12, c.h);
    T(x0, c.y + 26, '태양이 행성을 당기는 힘', 14, '#26324a', 'left', 800);
    const rows = [1, 2, 3, 4]; if (rows.indexOf(f.r) < 0) rows.push(f.r); rows.sort((p, q) => p - q);
    rows.forEach((r, i) => {
      const y = y0 + 6 + i * (PHONE ? 44 : 46), cur = Math.abs(r - f.r) < 1e-9, len = aw / (r * r);
      if (cur) { ctx.fillStyle = 'rgba(56,103,244,.1)'; D.roundRect(x0 - 8, y - 14, c.x + c.w - x0 - 2, PHONE ? 38 : 40, 8); ctx.fill(); }
      T(x0, y + 8, 'r = ' + r + ' AU', 13.5, '#26324a', 'left', 800);
      D.arrow(x0 + (PHONE ? 62 : 80), y + 4, x0 + (PHONE ? 62 : 80) + Math.max(len, 3), y + 4, { color: cur ? RED : '#e89a9d', width: cur ? 5 : 4, head: Math.min(10, Math.max(4, len * 0.45)) });
      T(c.x + c.w - 10, y + 9, (r === 1 ? 'F₀' : (1 / (r * r)).toFixed(3).replace(/0+$/, '') + ' F₀'), 13.5, cur ? RED : '#5a6679', 'right', 800);
    });
    ctx.restore();
    // 아래: F/F0 – r 그래프
    const gr = { x: PX, y: PY, w: PW, h: PH };
    const a = axes(gr, { xmin: 0.5, xmax: 4.5, xstep: 0.5, xd: 1, ymin: 0, ymax: 1.2, ystep: 0.3, yd: 1, title: '힘의 크기 F / F₀ – 거리 r (AU)', right: 'F ∝ 1 / r²' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const r = 0.85 + (4.5 - 0.85) * i / 80, y = 1 / (r * r); if (i) ctx.lineTo(a.gx(r), a.gy(y)); else ctx.moveTo(a.gx(r), a.gy(y)); } ctx.stroke();
    [1, 2, 3, 4].forEach((r) => D.sphere(a.gx(r), a.gy(1 / (r * r)), 5, '#7b869a', { gloss: false, outline: '#fff', outlineWidth: 1 }));
    ctx.restore();
    D.ring(a.gx(f.r), a.gy(foRatio()), 9, S.clock, { color: '#3867f4', width: 2.5 });
    D.label(clamp(a.gx(f.r) + 70, a.ix + 80, a.ix + a.iw - 70), clamp(a.gy(foRatio()) - 24, a.iy + 14, a.iy + a.ih - 14), 'F / F₀ = 1 / r² = ' + foRatio().toFixed(3), { bg: '#3867f4', size: 13.5, pad: 8 });
    parts.update(dt); parts.draw(ctx);
  }
  /* ================= ④ 사과와 달 ================= */
  const MOON_R = 3.84e8, MOON_T = 2.36e6, G_SURF = 9.8;
  const moonA = () => 4 * Math.PI * Math.PI * MOON_R / (MOON_T * MOON_T);
  function drawMoon(dt) {
    const m = S.mo, c = { x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 };
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 70 });
    m.ang += 0.5 * dt;
    const ex = PHONE ? 88 : 190, ey = c.y + c.h / 2 + 6, Re = PHONE ? 22 : 44, Ro = PHONE ? 70 : 156;
    ctx.strokeStyle = 'rgba(180,200,255,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(ex, ey, Ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(ex, ey, Re, '#3b82f6', { gloss: true, shadow: true });
    ctx.fillStyle = 'rgba(80,190,110,.85)'; ctx.beginPath(); ctx.arc(ex - Re * 0.25, ey + Re * 0.15, Re * 0.45, 0, TAU); ctx.fill();
    const mx = ex + Ro * Math.cos(m.ang), my = ey - Ro * Math.sin(m.ang);
    D.sphere(mx, my, PHONE ? 8 : 11, '#d9dde6', { gloss: true });
    // 달: 속도(접선, 점선)와 구심 가속도(×3600)
    const tx = -Math.sin(m.ang), ty = -Math.cos(m.ang), ux = (ex - mx) / Ro, uy = (ey - my) / Ro;
    D.dashedLine(mx, my, mx + tx * 40, my + ty * 40, { color: '#ffe58a', width: 2.5, dash: [4, 4] });
    D.arrow(mx, my, mx + ux * 50, my + uy * 50, { color: GREEN, width: 4, head: 11 });
    D.label(clamp(mx - ux * 44, 56, (PHONE ? 128 : 400)), clamp(my - uy * 30 - 6, 40, 330), '달: a × 3600', { bg: GREEN, size: 13, pad: 7 });
    // 사과
    const ax = ex, ay = ey - Re - 12;
    D.sphere(ax, ay, 8, '#e2464b', { gloss: true });
    ctx.strokeStyle = '#6b8e3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(ax + 3, ay - 15); ctx.stroke();
    D.arrow(ax + 18, ay - 4, ax + 18, ay + 46, { color: RED, width: 4, head: 11 });
    if (PHONE) D.label(ax + 26, ay + 24, '사과: g', { bg: RED, size: 13, pad: 7, align: 'left' }); else D.label(ax - 24, ay + 20, '사과: g', { bg: RED, size: 13, pad: 7, align: 'right' });
    T(c.x + 12, c.y + 24, PHONE ? '그림은 축척이 아니에요' : '그림은 축척이 아니에요 (달까지 거리 = 지구 반지름의 60배)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 계산 카드
    const x0 = PHONE ? 190 : 440, hide = eff('hideCmp'), a = moonA();
    ctx.fillStyle = 'rgba(247,249,253,.96)'; ctx.fillRect(x0 - 12, c.y, c.x + c.w - x0 + 12, c.h);
    T(x0, c.y + 26, '🌙 달의 구심 가속도 (원 궤도)', 14, '#26324a', 'left', 800);
    lines(x0, c.y + 54, PHONE ? 25 : 29, PHONE ? 13 : 14, [
      ['r = 3.84 × 10⁸ m', '#1d4ed8'],
      ['T = 27.3일 = 2.36 × 10⁶ s', '#c2410c'],
      ['T² = ' + (MOON_T * MOON_T / 1e12).toFixed(2) + ' × 10¹² s²', '#26324a'],
      ['4π²r = ' + (4 * Math.PI * Math.PI * MOON_R / 1e10).toFixed(2) + ' × 10¹⁰ m', '#26324a'],
      ['a = 4π²r / T² = ' + (hide ? '?' : (a * 1000).toFixed(2) + ' × 10⁻³ m/s²'), hide ? '#b45309' : '#14753f'],
      ['g / 3600 = 9.8 / 3600 = ' + (hide ? '?' : (G_SURF / 3600 * 1000).toFixed(2) + ' × 10⁻³ m/s²'), hide ? '#b45309' : '#14753f'],
    ]);
    if (!hide) D.label(x0 + (PHONE ? 90 : 120), c.y + c.h - 34, '같은 값 → 같은 중력!', { bg: GREEN, size: 14, pad: 9 });
    ctx.restore();
    // 아래: 연표
    panel(PX, PY, PW, PH, 16);
    const yrs = [[1543, '코페르니쿠스', '#7b869a'], [1585, '티코 브라헤', '#7b869a'], [1609, '케플러', '#e2552a'], [1610, '갈릴레이', '#7b869a'], [1687, '뉴턴', '#3867f4'], [1846, '해왕성 발견', '#14a058']];
    T(PX + 16, PY + 28, '📜 과학사 연표', 14.5, '#26324a', 'left', 800);
    if (eff('tl')) { T(PX + 16, PY + 62, '카드를 시간 순서대로 정렬하면 연표가 나타나요.', 14, '#7b869a', 'left', 700); return; }
    const lx0 = PX + 40, lx1 = PX + PW - 40, ly = PY + (PHONE ? 150 : 112), X = (y) => lx0 + (lx1 - lx0) * (y - 1500) / 380;
    ctx.strokeStyle = '#9aa6bb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke();
    [1500, 1600, 1700, 1800].forEach((y) => { ctx.strokeStyle = '#9aa6bb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(y), ly - 5); ctx.lineTo(X(y), ly + 5); ctx.stroke(); T(X(y), ly + 22, y + '', 13, '#7b869a', 'center', 700); });
    const dy = PHONE ? 60 : 46, lv = [-dy, dy + 22, -dy, dy + 22 + 46, -dy, dy + 22];
    yrs.forEach((e, i) => {
      const x = X(e[0]), yy = ly + lv[i], up = lv[i] < 0;
      ctx.strokeStyle = e[2]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ly + (up ? -6 : 6)); ctx.lineTo(x, up ? yy + 22 : yy - 15); ctx.stroke();
      D.sphere(x, ly, 6, e[2], { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      T(Math.min(Math.max(x, PX + 56), PX + PW - 56), yy, e[1], PHONE ? 13 : 14, '#26324a', 'center', 800); T(Math.min(Math.max(x, PX + 56), PX + PW - 56), yy + 17, (e[0] === 1585 ? '1570~1600' : e[0]) + '', 13, e[2], 'center', 800);
    });
  }

  /* ================= 순서 배열 UI ================= */
  const ordSig = { A: '', B: '' };
  function renderOrder(key, boxId, ord, items, bad, move) {
    const sig = ord.join() + '|' + Object.keys(bad).join();
    if (sig === ordSig[key]) return; ordSig[key] = sig;
    const box = $('#' + boxId); box.innerHTML = '';
    ord.forEach((id, pos) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;border:2px solid ' + (bad[id] ? 'var(--bad)' : 'var(--line)') + ';border-radius:12px;background:' + (bad[id] ? 'var(--bad-soft)' : '#fff');
      const nm = document.createElement('b'); nm.textContent = String(pos + 1); nm.style.cssText = 'flex:none;width:22px;text-align:center;color:var(--muted)';
      const tx = document.createElement('div'); tx.textContent = items[id]; tx.style.cssText = 'flex:1;font-size:13.5px;font-weight:700;line-height:1.3';
      const mk = (lab, d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.style.cssText = 'flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-weight:900;cursor:pointer'; b.setAttribute('aria-label', items[id] + (d < 0 ? ' 위로' : ' 아래로')); b.disabled = (d < 0 && pos === 0) || (d > 0 && pos === ord.length - 1); b.addEventListener('click', () => move(pos, d)); return b; };
      row.append(nm, tx, mk('▲', -1), mk('▼', 1)); box.appendChild(row);
    });
  }
  function moveOrd(ord, pos, d, reset) { const j = pos + d; if (j < 0 || j >= ord.length) return; const t = ord[pos]; ord[pos] = ord[j]; ord[j] = t; reset(); Sound.click(); updateCtl(); }
  const moveA = (pos, d) => moveOrd(S.ordA, pos, d, () => { S.ordBadA = {}; });
  const moveB = (pos, d) => moveOrd(S.ordB, pos, d, () => { S.ordBadB = {}; });

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; if (c === 'kfit' && grDone() < 6) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const o = S.ob;
    $$('#plSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.pl === o.sel));
    $$('#zmSeg button').forEach((b) => b.classList.toggle('on', b.dataset.zm === o.zm));
    $('#bRecP').textContent = o.rec[o.sel] ? '✅ ' + PL[o.sel].n + ' 기록함' : '📋 ' + PL[o.sel].n + ' 표에 기록';
    $('#oSp').textContent = o.spd.toFixed(1) + ' 년/초'; setSl('sSp', o.spd, 0.1, 1);
    $('#bMk').disabled = o.mk >= MARS_N; $('#bMkAll').disabled = o.mk >= MARS_N;
    $('#mkNote').textContent = o.mk >= MARS_N ? '12개를 모두 찍었어요. 곡선을 맞춰 봤어요!' : '찍은 점 ' + o.mk + ' / ' + MARS_N + ' (날짜 순서대로 하나씩)';
    $('#oPh').textContent = o.ph + '°'; setSl('sPh', o.ph, 0, 345);
    const g = S.gr;
    $('#bPt').disabled = grDone() >= 6;
    $('#ptNote').textContent = grDone() >= 6 ? '여섯 점을 모두 찍었어요. 직선의 기울기 k를 맞춰 보세요.' : (g.cur >= 0 ? PL[g.cur].n + '까지 찍었어요.' : '표의 행을 누르거나 버튼을 눌러요.');
    $('#oK').textContent = g.k.toFixed(2); setSl('sK', g.k, 0.5, 1.5);
    $('#oRd').textContent = S.fo.r.toFixed(1) + ' AU'; setSl('sRd', S.fo.r, 1, 4);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#plSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ob.sel = +b.dataset.pl; updateCtl(); }));
  $('#bRecP').addEventListener('click', () => { const o = S.ob; if (o.rec[o.sel]) { showHint('이미 기록했어요. 다른 행성을 골라요.', 2200); return; } o.rec[o.sel] = true; Sound.click(); const L = obL(); parts.burst(L.pn.x + 40, L.pn.y + 70 + o.sel * 30, { count: 8, speed: 70, size: 3, colors: ['#ffd447', '#fff'], gravity: 0, life: 0.5 }); updateCtl(); });
  $$('#zmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ob.zm = b.dataset.zm; updateCtl(); }));
  $('#sSp').addEventListener('input', (e) => { S.ob.spd = +e.target.value; updateCtl(); });
  $('#bMk').addEventListener('click', () => { const o = S.ob; if (o.mk >= MARS_N) return; o.mkT[o.mk] = S.clock; o.mk++; Sound.click(); updateCtl(); });
  $('#bMkAll').addEventListener('click', () => { const o = S.ob; for (let k = o.mk; k < MARS_N; k++) o.mkT[k] = S.clock + (k - o.mk) * 0.09; o.mk = MARS_N; Sound.success(); updateCtl(); });
  $('#sPh').addEventListener('input', (e) => { S.ob.ph = +e.target.value; updateCtl(); });
  $('#bSec').addEventListener('click', () => { const o = S.ob; o.sec.push({ M0: o.ph * RAD }); if (o.sec.length > 4) o.sec.shift(); Sound.click(); updateCtl(); });
  $('#bSecC').addEventListener('click', () => { Sound.click(); S.ob.sec = []; updateCtl(); });
  $('#bPt').addEventListener('click', () => grProcess());
  $('#sK').addEventListener('input', (e) => { S.gr.k = +e.target.value; updateCtl(); });
  $('#sRd').addEventListener('input', (e) => { S.fo.r = +e.target.value; updateCtl(); });
  ['iT', 'iRat', 'iMa'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const o = S.ob;
    if (S.mode === 'sys') { const p = PL[o.sel]; L1 = p.n + ' 공전 주기 T'; a = p.T.toFixed(3) + ' 년'; L2 = p.n + ' 거리 r'; b = p.r.toFixed(3) + ' AU'; L3 = '표에 기록한 행성'; c = o.rec.filter(Boolean).length + ' / 6'; }
    else if (S.mode === 'mars') { L1 = '찍은 관측 점'; a = o.mk + ' / ' + MARS_N; L2 = '궤도 모양'; b = o.mk >= MARS_N ? '타원 (원에 가까움)' : '—'; L3 = '태양 위치'; c = o.mk >= MARS_N ? '한 초점' : '—'; }
    else if (S.mode === 'area') {
      const s = o.sec[o.sec.length - 1]; const E = kepE(o.M, E_AREA);
      L1 = '색칠한 부채꼴'; a = o.sec.length + '개'; L2 = '마지막 부채꼴 넓이'; b = s ? (sectorFrac(s.M0, E_AREA) * 100).toFixed(1) + ' %' : '—'; L3 = '지금 거리 r/a'; c = (1 - E_AREA * Math.cos(E)).toFixed(2);
    } else if (S.mode === 'graph') {
      const g = S.gr, p = g.cur >= 0 ? PL[g.cur] : null;
      L1 = '찍은 점'; a = grDone() + ' / 6'; L2 = p ? p.n + ' T² / r³' : 'T² / r³'; b = p ? rat(p).toFixed(2) + ' 년²/AU³' : '—'; L3 = '직선의 기울기 k'; c = grDone() >= 6 ? g.k.toFixed(2) : '—';
    } else if (S.mode === 'force') {
      const r = S.fo.r; L1 = '태양과의 거리 r'; a = r.toFixed(1) + ' AU'; L2 = '힘 F / F₀ = 1 / r²'; b = foRatio().toFixed(3); L3 = '공전 주기 T (= r^1.5)'; c = Math.pow(r, 1.5).toFixed(2) + ' 년';
    } else {
      const h = eff('hideCmp'); L1 = '달의 a (구심)'; a = h ? '?' : (moonA() * 1000).toFixed(2) + '×10⁻³ m/s²'; L2 = 'g / 3600'; b = h ? '?' : (G_SURF / 3600 * 1000).toFixed(2) + '×10⁻³ m/s²'; L3 = '비교'; c = h ? '—' : '같아요 ✅';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  const clr = (...ids) => ids.forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); });
  const recN = () => S.ob.rec.filter(Boolean).length;
  const secHas = (kind) => S.ob.sec.some((s) => secKind(s.M0) === kind);
  const orderCheck = (key, ord, rules, hint) => {
    const v = ordV(ord, rules);
    if (!v.length) { if (key === 'A') S.ordBadA = {}; else S.ordBadB = {}; return true; }
    const bad = {}; v.forEach(([a, b]) => { bad[a] = true; bad[b] = true; });
    const cur = key === 'A' ? S.ordBadA : S.ordBadB;
    if (Object.keys(bad).join() !== Object.keys(cur).join()) { if (key === 'A') S.ordBadA = bad; else S.ordBadB = bad; updateCtl(); }
    return hint;
  };
  const levels = [
    {
      title: '관측 자료: 행성은 어떻게 도는가', short: '관측 자료', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 행성들의 공전 주기와 거리 사이에 숨은 규칙이 있다면, 그 규칙은 어떤 힘을 가리킬까?</p>' +
        '<div class="si-link">🔗 <b>지구과학에서</b> 행성이 태양 둘레를 원 궤도로 공전한다고 단순화하고 공전 주기를 비교했어요. <b>통합과학에서</b>는 달이 지구 쪽으로 계속 떨어지고 있다는 것도 배웠어요.</div>' +
        '<p>케플러는 티코 브라헤의 정밀한 관측 자료에서 규칙을 찾아냈어요. 먼저 <b>태양계 관측 기록표</b>를 만들고, 화성의 관측 점으로 <b>궤도의 모양</b>을, 같은 시간에 쓸고 가는 <b>넓이</b>로 행성의 속력 변화를 살펴봐요.</p>',
      features: ['sys', 'mars', 'area'],
      setup() { const o = S.ob; o.rec = [false, false, false, false, false, false]; o.mk = 0; o.mkT = []; o.arc = 0; o.sec = []; o.ph = 0; setScene('sys'); },
      recap: '행성은 태양을 한 초점으로 하는 타원 궤도를 돌고, 태양에 가까울수록 빨라요. 이 차시의 계산은 원 궤도의 반지름 r와 공전 주기 T로 해요.',
      summary: '<ul><li><b>관측 자료</b>(긴반지름 r, 공전 주기 T): 수성 0.387 AU·0.241년, 금성 0.723·0.615, 지구 1.000·1.000, 화성 1.524·1.881, 목성 5.203·11.86, 토성 9.537·29.46. (1 AU = 지구–태양 거리 = 1.5 × 10¹¹ m)</li><li><b>제1법칙</b>(타원 궤도): 행성은 태양을 한 초점으로 하는 타원 궤도를 돌아요. 화성은 원에 매우 가까운 타원(이심률 약 0.09)이에요.</li><li><b>제2법칙</b>(면적 속도 일정): 행성과 태양을 이은 선이 <b>같은 시간 동안 쓸고 가는 넓이는 같아요</b> → 태양에 가까울수록 빨라요. (지구: 1월 초 근일점 약 30.3 km/s, 7월 초 원일점 약 29.3 km/s)</li><li>이 단원의 정량적 계산은 <b>원 궤도</b>(반지름 r)로 단순화해서 다뤄요. 제3법칙은 다음 단계에서 확인해요.</li></ul>',
      missions: [
        {
          title: '관측 기록표 만들기',
          goal: '🌌 태양계에서 <b>행성 세 개 이상</b>의 r와 T를 표에 기록하고, 🔭 화성의 <b>관측 점 12개</b>를 모두 찍어 보세요.',
          hint: '행성 버튼을 눌러 고른 뒤 📋 표에 기록을 눌러요. 🔭 화성 관측 화면에서 ⏭ 모두 찍기를 눌러도 돼요.',
          setup() { const o = S.ob; o.rec = [false, false, false, false, false, false]; o.mk = 0; o.mkT = []; o.arc = 0; setScene('sys'); },
          check: () => recN() >= 3 && S.ob.mk >= MARS_N,
          hold: 0.6,
          status: () => mark(recN() >= 3) + ' 기록한 행성 ' + Math.min(3, recN()) + ' / 3 &nbsp; ' + mark(S.ob.mk >= MARS_N) + ' 화성 관측 점 ' + S.ob.mk + ' / ' + MARS_N,
          explain: '화성의 관측 점들을 이어 보면 <b>원이 아니라 약간 찌그러진 타원</b>이에요. 태양은 원의 중심이 아니라 타원의 <b>한 초점</b>에 있어요(제1법칙). 행성이 태양에서 멀수록 공전 주기가 길다는 것도 표에서 보여요.',
        },
        {
          title: '같은 시간, 같은 넓이',
          goal: '⏱ 같은 시간 화면에서 <b>근일점 쪽</b>과 <b>원일점 쪽</b>에 같은 시간(T/12) 동안의 부채꼴을 각각 하나씩 색칠하세요.',
          hint: '부채꼴 시작 위치를 0°(근일점 쪽)로 두고 🎨 색칠, 그다음 180° 부근(원일점 쪽)에서 다시 색칠해요.',
          setup() { S.ob.sec = []; S.ob.ph = 0; setScene('area'); },
          check: () => secHas('near') && secHas('far'),
          hold: 0.6,
          status: () => mark(secHas('near')) + ' 근일점 쪽 &nbsp; ' + mark(secHas('far')) + ' 원일점 쪽',
          explain: '두 부채꼴은 모양이 달라도 <b>넓이가 같아요</b>(타원 전체의 1/12 = 8.3 %). 태양에 가까울 때는 길고 가늘게, 멀 때는 짧고 넓게 쓸고 가요. 같은 시간에 쓸고 가는 넓이가 같으려면 <b>가까울 때 더 빨라야</b> 해요.',
        },
        {
          type: 'quiz', title: '태양에 가까울 때 행성의 속력',
          goal: '행성이 태양에 <b>가까이 있을 때</b> 공전 속력은 멀리 있을 때보다 어떨까요?',
          setup() { setScene('area'); },
          choices: ['항상 일정한 속력으로 공전해요', '태양에 가까울수록 느려요', '태양에 가까울수록 빨라요', '거리와 상관없이 같은 시간에 같은 거리를 가요'],
          answer: 2,
          feedback: ['제2법칙에 따르면 속력이 일정하지 않아요. 같은 시간에 쓸고 가는 넓이가 같으려면 거리에 따라 속력이 달라져야 해요.', '반대예요. 가까울 때 선분이 짧아지므로 같은 넓이를 쓸려면 더 빨리 움직여야 해요.', '', '같은 시간에 가는 거리가 같지 않아요. 가까울 때는 더 멀리 움직이고 멀 때는 덜 움직여요.'],
          explain: '제2법칙: 같은 시간 동안 쓸고 가는 넓이가 같아요. 태양에 가까울 때 선분이 짧으므로 <b>더 빨리</b> 움직여야 넓이가 같아져요. 그래서 근일점에서 가장 빠르고 원일점에서 가장 느려요.',
        },
      ],
    },
    {
      title: '제3법칙: T²과 r³', short: '제3법칙', icon: '📊', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 행성마다 r와 T가 다르고 태양에서 멀수록 T가 길다는 것을 봤어요. 이제 <b>정확히 어떤 관계</b>인지 표와 그래프로 찾아요. (원 궤도 반지름 r와 공전 주기 T)</div>' +
        '<p>여섯 행성에서 <b>T²과 r³</b>을 계산해 그래프에 점을 찍어요. 점들이 어떤 모양으로 놓일까요? 그 규칙으로 아직 관측하지 않은 천체의 주기도 예측해 봐요.</p>',
      features: ['graph'],
      setup() { const g = S.gr; g.done = [false, false, false, false, false, false]; g.fly = []; g.k = 0.6; g.ast = false; g.cur = -1; setFlag('kfit', true); setFlag('astIn', false); setScene('graph'); },
      recap: '모든 행성에서 T² / r³ = 1 년²/AU³로 일정해요. 즉 T² ∝ r³ (케플러 제3법칙)이고, r가 4배면 T는 8배예요.',
      summary: '<ul><li>T²과 r³ 계산: 수성 0.058/0.058, 금성 0.378/0.378, 지구 1/1, 화성 3.54/3.54, 목성 140.7/140.9, 토성 867.9/867.4 (T² / r³ = 0.999 ~ 1.002).</li><li>T²–r³ 그래프의 점은 <b>원점을 지나는 직선</b> 위에 있고 기울기는 1 년²/AU³예요 → <b>T² ∝ r³</b> (제3법칙).</li><li>SI 단위로는 T² / r³ = 4π² / (GM태양) = 2.97 × 10⁻¹⁹ s²/m³.</li><li>r = 4.00 AU인 소행성: T² = 4³ = 64 → <b>T = 8.0년</b>. r가 4배이면 T는 4배가 아니라 <b>8배</b>예요.</li></ul>',
      missions: [
        {
          title: '여섯 점 찍고 직선 맞추기',
          goal: '여섯 행성의 점을 모두 찍고, 직선의 <b>기울기 k</b>를 맞춰 <b>모든 점이 직선 위</b>에 놓이게 하세요.',
          hint: '📍 다음 행성 점 찍기를 여섯 번 눌러요(표의 행을 눌러도 돼요). 그다음 k 슬라이더로 직선이 점들을 모두 지나게 맞춰요.',
          setup() { const g = S.gr; g.done = [false, false, false, false, false, false]; g.fly = []; g.k = 0.6; g.ast = false; g.cur = -1; setFlag('kfit', true); setFlag('astIn', false); setScene('graph'); },
          check: () => grDone() === 6 && Math.abs(S.gr.k - 1) <= 0.02 + 1e-9,
          hold: 0.8,
          status: () => mark(grDone() === 6) + ' 점 ' + grDone() + ' / 6 &nbsp; ' + mark(grDone() === 6 && Math.abs(S.gr.k - 1) <= 0.02 + 1e-9) + ' 직선 k = ' + S.gr.k.toFixed(2),
          explain: '여섯 점이 모두 <b>원점을 지나는 직선</b> 위에 놓여요. 기울기 k = T² / r³ = <b>1.00 년²/AU³</b>이에요. 표의 마지막 열도 모두 1.00이에요. 그래서 <b>T² = k r³</b>, 곧 T²은 r³에 비례해요.',
        },
        {
          title: '소행성의 공전 주기 예측', manual: true,
          goal: '태양에서 <b>r = 4.00 AU</b> 떨어진 원 궤도의 소행성의 공전 주기 T(년)를 제3법칙으로 예측해 입력하세요.',
          hint: 'T² = k r³ 에서 k = 1 년²/AU³이므로 T² = 4³ = 64예요. T는 그 제곱근이에요.',
          setup() { const g = S.gr; g.done = [true, true, true, true, true, true]; g.fly = []; g.cur = 5; g.k = 1; g.ast = false; clr('iT'); setFlag('kfit', true); setFlag('astIn', true); setScene('graph'); },
          check() {
            const x = num('iT');
            if (x == null) return '숫자(년)를 입력해 주세요.';
            const ok = Math.abs(x - 8) <= 0.15; fb([[$('#iT'), ok]]);
            if (ok) { S.gr.ast = true; return true; }
            if (Math.abs(x - 64) <= 1) return 'T² = 64예요. T는 그 제곱근이에요.';
            if (Math.abs(x - 4) <= 0.2) return 'T가 r에 비례한다고 생각했어요. 제3법칙은 T²이 r³에 비례해요: T² = 4³.';
            return 'T² = r³ = 4³ = 64 에서 T를 구해 보세요.';
          },
          status: () => '입력 ' + ($('#iT').value.trim() || '—') + ' 년',
          explain: 'T² = r³ = 4.00³ = 64 → <b>T = 8.0년</b>. 그래프에서도 (r³ = 64, T² = 64)인 점이 직선 위에 놓여요. 거리가 4배이면 주기는 4배가 아니라 √(4³) = <b>8배</b>예요.',
        },
        {
          type: 'quiz', title: '거리가 4배이면 주기는?',
          goal: '다른 태양계 천체가 <b>지구보다 4배 먼 원 궤도</b>를 돈다면 공전 주기는 지구의 몇 배일까요?',
          setup() { setFlag('astIn', false); setScene('graph'); },
          choices: ['4배', '8배', '16배', '2배'],
          answer: 1,
          feedback: ['T가 r에 비례하는 것이 아니에요. 제3법칙은 T² ∝ r³이에요.', '', 'T²이 r³에 비례하니 T² = 64배가 아니라 T = √64예요. 16배는 r²이에요.', '2배는 r의 제곱근이에요. T = r^(3/2)이에요.'],
          explain: 'T² ∝ r³ → T ∝ r^(3/2). r가 4배이면 T는 4^(3/2) = √64 = <b>8배</b>예요. (그래서 지구 1년의 8배인 8년이에요.)',
        },
      ],
    },
    {
      title: '구심력 연결: 힘은 거리의 제곱에 반비례', short: '구심력 연결', icon: '🔗', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 제3법칙 T² = k r³을 찾았어요. 앞 차시에서 배운 <b>구심력 F = mv²/r</b>과 만나면 행성을 붙잡는 힘이 거리와 어떤 관계인지 알 수 있어요.</div>' +
        '<p>행성이 태양을 도는 원운동의 구심력은 <b>태양이 행성을 당기는 힘</b>이에요. 구심력에 T² = k r³을 대입하면 힘이 r의 몇 제곱에 비례하는지 나와요. 유도 과정을 순서대로 세워 보세요.</p>',
      features: ['force'],
      setup() { S.fo.r = 1; S.fo.seen2 = false; S.ordA = [3, 0, 4, 2, 1]; S.ordBadA = {}; ordSig.A = ''; setFlag('order', false); setFlag('ratIn', false); setScene('force'); },
      recap: '태양이 행성을 당기는 힘은 F ∝ m / r²이에요. 거리가 2배, 3배가 되면 힘은 1/4, 1/9로 줄어요.',
      summary: '<ul><li>원 궤도: 가속도 a = v²/r, v = 2πr/T → <b>a = 4π²r / T²</b>, 구심력 <b>F = 4π²mr / T²</b>.</li><li>제3법칙 T² = k r³을 대입하면 <b>F = 4π²m / (k r²)</b> → <b>F ∝ m / r²</b>: 태양이 행성을 당기는 힘은 거리의 제곱에 반비례해요(역제곱 법칙).</li><li>거리가 2배이면 힘은 <b>1/4</b>, 3배이면 <b>1/9</b>, 4배이면 1/16이에요.</li><li>이 힘이 바로 <b>중력</b>이에요. 힘이 거리에 비례하지 않고 제곱에 반비례한다는 근거는 제3법칙(T² ∝ r³)이에요.</li></ul>',
      missions: [
        {
          title: '유도 과정 순서 맞추기', manual: true,
          goal: '다섯 장의 카드를 <b>▲▼ 버튼</b>으로 힘이 거리의 제곱에 반비례함을 유도하는 순서대로 정렬하고 ✔ 확인하기를 누르세요.',
          hint: '가속도 → 구심력 → (제3법칙 준비) → 대입 → 결론 순서예요. 제3법칙 카드는 대입하기 전에만 오면 돼요.',
          setup() { S.ordA = [3, 0, 4, 2, 1]; S.ordBadA = {}; ordSig.A = ''; setFlag('order', true); setFlag('ratIn', false); setScene('force'); },
          check: () => orderCheck('A', S.ordA, RULES_A, '순서가 맞지 않는 카드가 빨간 테두리로 표시돼요. 가속도 → 구심력 → 대입 → 결론 순서를 떠올려요.'),
          status: () => '맞지 않는 쌍 ' + ordV(S.ordA, RULES_A).length + '개',
          explain: '<b>① a = 4π²r/T² → ② F = 4π²mr/T² → ③ T² = k r³ → ④ 대입: F = 4π²m/(k r²) → ⑤ F ∝ 1/r²</b>. 관측으로 찾은 제3법칙과 구심력의 식을 합치면 힘의 거리 의존성이 나와요.',
        },
        {
          title: '거리가 2배일 때 힘의 비', manual: true,
          goal: '지구 궤도(1 AU)의 같은 질량 행성이 받는 힘을 F₀라고 할 때, <b>2 AU</b>에 있는 행성이 받는 힘은 F₀의 몇 배일까요? 소수로 입력하세요.',
          hint: 'F ∝ 1 / r²이에요. r가 2배가 되면 (1/2)²예요. 슬라이더로 r = 2 AU를 놓고 화살표 길이를 비교해 봐요.',
          setup() { S.fo.r = 1; S.fo.seen2 = false; clr('iRat'); setFlag('order', false); setFlag('ratIn', true); setScene('force'); },
          check() {
            const x = num('iRat');
            if (x == null) return '숫자를 입력해 주세요. (예: 0.5)';
            const ok = Math.abs(x - 0.25) <= 0.01; fb([[$('#iRat'), ok]]);
            if (ok) return true;
            if (Math.abs(x - 0.5) <= 0.02) return '거리에 반비례(1/2)라고 생각했어요. 힘은 거리의 제곱에 반비례해요.';
            if (Math.abs(x - 4) <= 0.1 || Math.abs(x - 2) <= 0.1) return '거리가 멀어지면 힘은 커지지 않고 작아져요.';
            return 'F ∝ 1 / r²에서 r가 2배이면 힘은 1 ÷ 2² = ?';
          },
          status: () => '입력 ' + ($('#iRat').value.trim() || '—'),
          explain: 'F ∝ 1/r²이므로 r가 2배이면 F = (1/2)² = <b>1/4 = 0.25 F₀</b>예요(3배이면 1/9, 4배이면 1/16). 힘이 거리에 비례하지 않고 <b>제곱에 반비례</b>하는 근거는 케플러 제3법칙(T² ∝ r³)이에요.',
        },
      ],
    },
    {
      title: '만유인력: 사과와 달', short: '만유인력', icon: '🍎', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양이 행성을 당기는 힘이 1/r²에 비례함을 알았어요. 뉴턴은 이 힘이 <b>사과를 떨어뜨리는 힘과 같은 중력</b>이 아닐까 생각했어요. 통합과학에서 배운 달의 중력 가속도 약 1/3600을 이제 계산으로 확인해요.</div>' +
        '<p>달의 원 궤도에서 구심 가속도 <b>a = 4π²r / T²</b>를 계산해 지표의 g를 (지구 반지름의 60배)² = 3600으로 나눈 값과 비교해요. 그다음 <b>만유인력 법칙 F = GMm/r²</b>과 이 발견에 이른 과학사의 흐름을 정리해요.</p>',
      features: ['moon'],
      setup() { clr('iMa'); S.ordB = [4, 1, 5, 0, 3, 2]; S.ordBadB = {}; ordSig.B = ''; setFlag('hideCmp', false); setFlag('maIn', false); setFlag('tl', false); setScene('moon'); },
      recap: '달의 구심 가속도는 g/3600과 같아서 사과를 떨어뜨리는 힘과 달을 붙잡는 힘은 같은 중력이에요: F = GMm / r².',
      summary: '<ul><li><b>달 검증</b>: r = 3.84 × 10⁸ m, T = 27.3일 = 2.36 × 10⁶ s → a = 4π²r/T² = <b>2.72 × 10⁻³ m/s²</b>. 지표 g = 9.8 m/s²를 (r / R지구)² = 60² = 3600으로 나눈 9.8 / 3600 = <b>2.72 × 10⁻³ m/s²</b>와 같아요 → 사과를 떨어뜨리는 힘과 달을 붙잡는 힘은 <b>같은 중력</b>이에요.</li><li><b>만유인력 법칙</b>: F = GMm / r², G = 6.67 × 10⁻¹¹ N·m²/kg²(캐번디시, 1798). 두 질량 M, m 모두에 비례하고 거리의 제곱에 반비례해요. 작용 반작용이라 두 물체가 서로 당기는 힘은 크기가 같아요.</li><li><b>과학사</b>: 코페르니쿠스(1543, 지동설) → 티코 브라헤(1570~1600, 정밀 관측) → 케플러(1609·1619, 법칙) → 갈릴레이(1610, 망원경) → 뉴턴(1687, 프린키피아) → 해왕성의 예측과 발견(1846, 천왕성 궤도의 어긋남으로 위치를 예측).</li><li>달이 지구로 떨어지지 않는 것은 계속 떨어지고 있지만 <b>옆으로 충분히 빠르게</b> 움직이기 때문이에요.</li></ul>',
      missions: [
        {
          title: '달의 구심 가속도 계산하기', manual: true,
          goal: '달의 r = 3.84 × 10⁸ m, T = 2.36 × 10⁶ s로 구심 가속도 <b>a = 4π²r / T²</b>를 계산해 <b>×10⁻³ m/s² 단위</b>로 입력하세요.',
          hint: '화면의 4π²r = 1.52 × 10¹⁰ m와 T² = 5.57 × 10¹² s²를 나누면 돼요: 1.52 × 10¹⁰ ÷ 5.57 × 10¹² ≈ 2.7 × 10⁻³.',
          setup() { clr('iMa'); setFlag('hideCmp', true); setFlag('maIn', true); setFlag('tl', false); setScene('moon'); },
          check() {
            const x = num('iMa');
            if (x == null) return '숫자를 입력해 주세요. (×10⁻³ m/s² 단위)';
            const ok = Math.abs(x - 2.72) <= 0.06; fb([[$('#iMa'), ok]]);
            if (ok) { S.flags.hideCmp = false; return true; }
            if (x < 0.1) return '단위를 확인해요. 입력 칸은 ×10⁻³ m/s² 단위예요 (예: 2.7).';
            if (Math.abs(x - 27.2) <= 1) return '자릿수가 한 자리 틀려요. 1.52 × 10¹⁰ ÷ 5.57 × 10¹²를 다시 계산해 보세요.';
            return 'a = 4π²r ÷ T² = (1.52 × 10¹⁰) ÷ (5.57 × 10¹²) m/s²를 계산해요.';
          },
          status: () => '입력 ' + ($('#iMa').value.trim() || '—') + ' × 10⁻³ m/s²',
          explain: 'a = 4π²r / T² = 1.52 × 10¹⁰ ÷ 5.57 × 10¹² = <b>2.72 × 10⁻³ m/s²</b>. 지표의 g = 9.8을 3600으로 나눈 값 9.8 / 3600 = 2.72 × 10⁻³과 <b>같아요</b>. 달이 지구까지의 거리 60 R에서 받는 중력은 지표의 1/60² = 1/3600이라는 뜻이에요.',
        },
        {
          title: '과학사 연표 정렬하기', manual: true,
          goal: '여섯 장의 카드를 <b>▲▼ 버튼</b>으로 <b>시간 순서</b>(오래된 것이 위)로 정렬하고 ✔ 확인하기를 누르세요.',
          hint: '지동설(1543) → 정밀 관측(1570~1600) → 케플러 법칙(1609·1619) → 갈릴레이 망원경(1610) → 뉴턴(1687) → 해왕성(1846) 순서예요.',
          setup() { S.ordB = [4, 1, 5, 0, 3, 2]; S.ordBadB = {}; ordSig.B = ''; setFlag('hideCmp', false); setFlag('maIn', false); setFlag('tl', true); setScene('moon'); },
          check: () => orderCheck('B', S.ordB, RULES_B, '순서가 맞지 않는 카드가 빨간 테두리로 표시돼요. 관측 → 법칙 → 원인(중력) → 예측의 흐름을 떠올려요.'),
          status: () => '맞지 않는 쌍 ' + ordV(S.ordB, RULES_B).length + '개',
          explain: '<b>관측(티코) → 법칙(케플러) → 원인(뉴턴의 중력)</b>의 순서로 과학이 진행됐어요. 1846년에는 천왕성 궤도의 어긋남과 중력 법칙으로 <b>보이지 않던 해왕성의 위치를 예측</b>해 실제로 발견했어요.',
        },
        {
          type: 'quiz', title: '지구와 사과가 서로 당기는 힘',
          goal: '만유인력 F = GMm/r²에서 <b>지구가 사과를 당기는 힘</b>과 <b>사과가 지구를 당기는 힘</b>의 크기를 비교하면?',
          setup() { setFlag('tl', false); setFlag('maIn', false); setScene('moon'); },
          choices: ['크기가 같아요 (작용 반작용)', '지구가 당기는 힘이 훨씬 커요 (지구의 질량이 크니까)', '사과가 당기는 힘이 더 커요 (사과가 떨어지니까)', '사과는 지구를 당기지 않아요'],
          answer: 0,
          feedback: ['', '식 F = GMm/r²에는 M과 m이 모두 들어 있어요. 두 힘은 작용 반작용이라 크기가 같아요. 질량이 큰 지구는 가속도가 아주 작을 뿐이에요.', '떨어지는 것은 질량이 작아 가속도가 크기 때문이에요. 힘의 크기는 같아요.', '질량이 있는 모든 물체는 서로 당겨요. 사과도 지구를 같은 크기의 힘으로 당겨요.'],
          explain: '두 힘은 <b>작용과 반작용</b>이라 크기가 같고 방향이 반대예요: F = GMm/r². 같은 힘이지만 a = F/m이라 질량이 작은 사과의 가속도(9.8 m/s²)가 훨씬 커서 사과만 떨어지는 것처럼 보여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-kepler-gravity', mount: '#game', badge: '케플러 박사', homeHref: '../../index.html#hm',
    featureLabels: { sys: '🌌 태양계 · 관측 기록표', mars: '🔭 화성 관측 점 · 타원', area: '⏱ 같은 시간 부채꼴', graph: '📊 T²–r³ 그래프 · 직선 맞추기', force: '🔗 거리에 따른 힘 · 유도 카드', moon: '🍎 사과와 달 · 과학사 연표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('sys');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    obStep(dt); grStep(dt); foStep(dt);
    renderOrder('A', 'ordA', S.ordA, ORD_A, S.ordBadA, moveA); renderOrder('B', 'ordB', S.ordB, ORD_B, S.ordBadB, moveB);
    switch (S.mode) {
      case 'sys': drawSys(dt); break;
      case 'mars': drawMars(dt); break;
      case 'area': drawArea(dt); break;
      case 'graph': drawGraph(dt); break;
      case 'force': drawForce(dt); break;
      default: drawMoon(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, grProcess, sectorFrac, kepE, marsObs, moonA, PL, rat, ordV, RULES_A, RULES_B,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { obStep(0.02); grStep(0.02); foStep(0.02); } },
  };
})();
