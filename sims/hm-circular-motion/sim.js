/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 원운동과 구심력 (4차시)
   성취기준 [12역학01-03] 물체에 작용하는 힘의 방향에 따라 물체의 운동 방향이 변할 수 있음을 원운동 등 다양한 예를 들어 설명할 수 있다.
   ① 관찰: 힘과 방향 (퍽에 속도와 같은/반대/수직/비스듬한 힘, 수직으로 유지하면 원운동)
   ② 탐구: 구심 가속도 (Δv 작도 → a = v²/r = rω²)
   ③ 분석: 구심력 (줄의 장력 F = mv²/r, F–v² 그래프, 줄 끊기, 커브 도로의 마찰력)
   ④ 적용: 놀이기구 (회전 그네·관람차·로터 센서 분석)
   원심력(관성력)·비관성계, 속력이 변하는 원운동, 경사 도로(뱅킹), 각운동량은 다루지 않아요. g = 10 m/s².
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
  const G = 10;
  const PUCK_V0 = 3, PUCK_M = 1;                 // 퍽 1 kg, 3 m/s
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const PHI_NAME = { 0: '같은 방향', 180: '반대 방향', 90: '수직', 45: '비스듬히(45°)' };
  /* 회전 그네: 회전축에서 줄 걸이까지 3.0 m, 줄 길이 2√5 m → ω = 1.0 rad/s에서 r = 5.0 m, θ = 26.6° */
  const SW_RP = 3.0, SW_L = 2 * Math.sqrt(5), SW_H = 11;
  function swingTheta(w) {
    let lo = 0, hi = Math.PI / 2 - 1e-6;
    const f = (t) => Math.tan(t) - w * w * (SW_RP + SW_L * Math.sin(t)) / G;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  }
  const swing = (w) => { const th = swingTheta(w), r = SW_RP + SW_L * Math.sin(th); return { th, r, a: w * w * r }; };
  /* 관람차: 반지름 10 m, 사람 50 kg */
  const WH_R = 10, WH_M = 50;
  const whAz = (v, psi) => 1 - (v * v / WH_R / G) * Math.sin(psi);        // 연직 센서 값 (g 단위)
  /* 로터: 반지름 2.0 m, 사람 50 kg */
  const RO_R = 2, RO_M = 50;
  const roMinW = (mu) => Math.sqrt(G / (mu * RO_R));
  /* 커브 도로: 반지름 50 m, 자동차 1000 kg */
  const RD_R = 50, RD_M = 1000;
  const rdVmax = (mu) => Math.sqrt(mu * G * RD_R);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'puck', clock: 0, fade: 0,
    pk: null,
    dv: { v: 4, r: 2, dt: 0.3, th: 0.9, dth: 0.3 * 2, pause: false, seen: {} },
    bl: { m: 0.5, r: 0.8, v: 4, ang: 0, cut: false, bx: 0, by: 0, cvx: 0, cvy: 0, trail: [], trT: 0, rec: [], ymax: 20, msg: '', rate: 0 },
    rd: { mu: 0.4, kmh: 36, ang: 0, skid: false, x: 0, y: 0, vx: 0, vy: 0, sp: 0, stop: false, trail: [], trT: 0 },
    sw: { w: 1.0, phi: 0, th: swingTheta(1.0), r: swing(1.0).r },
    wh: { v: 5, psi: -Math.PI / 2, pause: false, hist: [], hT: 0, tAll: 0 },
    ro: { w: 3.5, mu: 0.4, down: false, floorH: 1.2, fy: 1.2, vy: 0, ang: 0, st: 'idle' },
    flags: { aIn: false, kmhIn: false, thIn: false, nIn: false, hideA: false, hideN: false, hideTh: false, hideLim: false, lockW: false, lockV: false },
    seen: { sw: false },
  };
  function pkInit() {
    const keep = S.pk || {};
    S.pk = { phi: keep.phi != null ? keep.phi : 90, F: keep.F != null ? keep.F : 3, run: false, started: false, x: 5, y: 0.6, th: 0, v: PUCK_V0, t: 0, hd: 0, edge: false, stopped: false, trail: [], trT: 0, lampV: 0, lampD: 0, seen: keep.seen || { so: false, dop: false, ci: false } };
  }
  pkInit();
  let game = null;
  const eff = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['puck', 'dv', 'ball', 'road', 'swing', 'wheel', 'rotor'];
  const ALLOWED = [['puck'], ['dv'], ['ball', 'road'], ['swing', 'wheel', 'rotor']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ---------- 퍽 ---------- */
  function pkReset() { const k = S.pk; pkInit(); S.pk.phi = k.phi; S.pk.F = k.F; parts.clear(); updateCtl(); }
  function pkStep(dt) {
    const P = S.pk; if (!P.run) return;
    const sp = 1;
    const n = 8, h = dt * sp / n;
    const a = P.F / PUCK_M, ph = P.phi * RAD, ca = Math.cos(ph), sa = Math.sin(ph);
    for (let i = 0; i < n; i++) {
      const vv = Math.max(P.v, 1e-9);
      let dv = a * ca * h, dth = a * sa / vv * h;
      if (P.v + dv <= 0) { P.v = 0; P.stopped = true; P.run = false; break; }
      const vm = P.v + dv / 2, tm = P.th + dth / 2;
      P.x += vm * Math.cos(tm) * h; P.y += vm * Math.sin(tm) * h;
      P.v += dv; P.th += dth; P.hd += dth; P.t += h;
      if (P.x < 0.18 || P.x > 9.82 || P.y < 0.18 || P.y > 9.82) { P.x = clamp(P.x, 0.18, 9.82); P.y = clamp(P.y, 0.18, 9.82); P.edge = true; P.run = false; break; }
    }
    P.trT -= dt; if (P.trT <= 0) { P.trT = 0.05; P.trail.push([P.x, P.y]); if (P.trail.length > 400) P.trail.shift(); }
    const s = P.seen;
    if ((P.phi === 0 || P.phi === 180) && P.t >= 0.6 && Math.abs(P.hd) < 1e-6) s.so = true;
    if (P.phi === 90 && P.t >= 1.5 && Math.abs(P.v - PUCK_V0) < 1e-6) s.dop = true;
    if (P.phi === 90 && Math.abs(P.hd) >= TAU - 0.02) s.ci = true;
    if (!P.run) { P.trail.push([P.x, P.y]); updateCtl(); }
  }

  /* ================= ① 퍽 장면 ================= */
  function pkL() { return PHONE ? { ax: 20, ay: 12, as: 440, sc: 44, px: 12, py: 462, pw: 456, ph: 246 } : { ax: 20, ay: 20, as: 540, sc: 54, px: 574, py: 20, pw: 216, ph: 540 }; }
  function lamp(x, y, on, color, text) {
    ctx.save();
    if (on > 0.05) { D.glow(x, y, 20, color, 0.55 * on); }
    D.sphere(x, y, 9, on > 0.5 ? color : '#c9d1e0', { gloss: true, outline: on > 0.5 ? color : '#aab4c6', outlineWidth: 1 });
    ctx.restore();
    T(x + 18, y + 5, text, 14, on > 0.5 ? '#26324a' : '#7b869a', 'left', 800);
  }
  function drawPuck(dt) {
    const L = pkL(), P = S.pk;
    const X = (w) => L.ax + w * L.sc, Y = (w) => L.ay + L.as - w * L.sc;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.shadow(() => { D.roundRect(L.ax - 7, L.ay - 7, L.as + 14, L.as + 14, 16); ctx.fillStyle = '#56657f'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(L.ax, L.ay, L.as, L.as, 8); ctx.clip();
    const bg = ctx.createLinearGradient(L.ax, L.ay, L.ax + L.as, L.ay + L.as); bg.addColorStop(0, '#eaf5ff'); bg.addColorStop(1, '#cfe4f8');
    ctx.fillStyle = bg; ctx.fillRect(L.ax, L.ay, L.as, L.as);
    ctx.strokeStyle = 'rgba(90,130,175,.28)'; ctx.lineWidth = 1;
    for (let k = 1; k < 10; k++) { ctx.beginPath(); ctx.moveTo(X(k), L.ay); ctx.lineTo(X(k), L.ay + L.as); ctx.moveTo(L.ax, Y(k)); ctx.lineTo(L.ax + L.as, Y(k)); ctx.stroke(); }
    // 자취
    if (P.trail.length > 1) {
      ctx.strokeStyle = 'rgba(37,99,235,.75)'; ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      ctx.beginPath(); P.trail.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.lineTo(X(P.x), Y(P.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    const px = X(P.x), py = Y(P.y);
    D.shadow(() => D.sphere(px, py, 0.2 * L.sc, '#f26b3a', { gloss: true, outline: '#b94a1e', outlineWidth: 1.5 }), { blur: 6, y: 3 });
    // 화살표: 속도(파랑), 힘(빨강). 길이는 크기에 비례 (v: 1 m/s = 0.3 m, F: 1 N = 0.26 m)
    const vk = L.sc * 0.3, fk = L.sc * 0.26;
    if (P.v > 0.02) D.arrow(px, py, px + Math.cos(P.th) * P.v * vk, py - Math.sin(P.th) * P.v * vk, { color: BLUE, width: 4.5, head: 12 });
    const fa = P.th + P.phi * RAD;
    const showF = !P.stopped || true;
    if (showF && !P.edge) D.arrow(px, py, px + Math.cos(fa) * P.F * fk, py - Math.sin(fa) * P.F * fk, { color: RED, width: 4.5, head: 12 });
    if (P.v > 0.02) { const lx = px + Math.cos(P.th) * (P.v * vk + 16), ly = py - Math.sin(P.th) * (P.v * vk + 16); D.label(clamp(lx, L.ax + 20, L.ax + L.as - 20), clamp(ly, L.ay + 14, L.ay + L.as - 14), 'v', { bg: BLUE, size: 14, pad: 7 }); }
    if (!P.edge) { const lx = px + Math.cos(fa) * (P.F * fk + 16), ly = py - Math.sin(fa) * (P.F * fk + 16); D.label(clamp(lx, L.ax + 20, L.ax + L.as - 20), clamp(ly, L.ay + 14, L.ay + L.as - 14), 'F', { bg: RED, size: 14, pad: 7 }); }
    if (P.edge) { D.label(L.ax + L.as / 2, L.ay + 26, '판 끝에 닿아서 실험을 마쳤어요', { bg: 'rgba(30,41,59,.85)', size: 14 }); }
    else if (P.stopped) { D.label(L.ax + L.as / 2, L.ay + 26, '멈췄어요 (v = 0)', { bg: 'rgba(30,41,59,.85)', size: 14 }); }
    else if (!P.started) { D.label(L.ax + L.as / 2, L.ay + 26, 'F의 방향을 고르고 ▶ 힘 주기를 눌러요', { bg: 'rgba(30,41,59,.8)', size: 14 }); }
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    ctx.strokeStyle = '#56657f'; ctx.lineWidth = 3; D.roundRect(L.ax, L.ay, L.as, L.as, 8); ctx.stroke();
    // 패널
    P.lampV = approach(P.lampV, P.run && Math.abs(P.F * Math.cos(P.phi * RAD)) > 0.01 ? 1 : 0, dt, 12);
    P.lampD = approach(P.lampD, P.run && Math.abs(P.F * Math.sin(P.phi * RAD)) > 0.01 ? 1 : 0, dt, 12);
    panel(L.px, L.py, L.pw, L.ph, 16);
    const hd = P.hd / RAD;
    const x0 = L.px + 14;
    T(x0, L.py + 28, '🧊 퍽 1 kg · 마찰 없는 판', 14.5, '#26324a', 'left', 800);
    const sx = x0, sw = PHONE ? 200 : L.pw - 28;
    T(sx, L.py + 62, '속력 v', 13.5, '#5a6679', 'left', 800);
    T(sx + sw, L.py + 64, P.v.toFixed(1) + ' m/s', 24, BLUE, 'right', 800);
    hbar(sx, L.py + 74, sw, 14, P.v, 10, '#7cc4ff');
    T(sx, L.py + 106, '0', 13, '#7b869a', 'left', 700); T(sx + sw, L.py + 106, '10 m/s', 13, '#7b869a', 'right', 700);
    const hy = PHONE ? L.py + 150 : L.py + 232;
    T(sx, hy, '운동 방향 변화', 13.5, '#5a6679', 'left', 800);
    T(sx + sw, hy + 2, sgn(hd, 0) + '°', 24, PURPLE, 'right', 800);
    const lx = PHONE ? L.px + 236 : x0, ly = PHONE ? L.py + 40 : L.py + 148;
    lamp(lx + 8, ly, P.lampV, ORANGE, '속력이 변하는 중');
    lamp(lx + 8, ly + 34, P.lampD, PURPLE, '방향이 변하는 중');
    const gy0 = PHONE ? L.py + 112 : L.py + 292;
    T(lx, gy0, '힘과 속도 사이의 각 φ', 13.5, '#5a6679', 'left', 800);
    T(lx, gy0 + 26, 'φ = ' + P.phi + '° (' + PHI_NAME[P.phi] + ')', 15, '#26324a', 'left', 800);
    // 미니 도해: 속도(위쪽 기준)와 힘
    const mx = PHONE ? L.px + 236 + 100 : L.px + L.pw / 2, my = PHONE ? L.py + 200 : L.py + 440, ml = PHONE ? 30 : 46;
    if (!PHONE || true) {
      ctx.save(); ctx.beginPath(); ctx.rect(PHONE ? L.px + 226 : L.px + 6, PHONE ? L.py + 150 : L.py + 360, PHONE ? 224 : L.pw - 12, PHONE ? 86 : 150); ctx.clip();
      D.arrow(mx, my, mx, my - ml * 1.35, { color: BLUE, width: 3.5, head: 9 });
      const ph = P.phi * RAD;
      D.arrow(mx, my, mx - Math.sin(ph) * ml, my - Math.cos(ph) * ml, { color: RED, width: 3.5, head: 9 });
      D.sphere(mx, my, 5, '#f26b3a', { gloss: false });
      T(mx + 8, my - ml * 1.35 + 6, 'v', 14, BLUE, 'left', 800);
      T(mx - Math.sin(ph) * (ml + 12) + (Math.sin(ph) > 0.2 ? -10 : 10), my - Math.cos(ph) * (ml + 12) + (Math.cos(ph) < -0.2 ? 14 : 0), 'F', 14, RED, 'center', 800);
      ctx.restore();
    }
    // 읽기 칸
    if (!PHONE) { T(L.px + L.pw / 2, L.py + L.ph - 30, '힘은 속도에 대해', 13, '#7b869a', 'center', 700); T(L.px + L.pw / 2, L.py + L.ph - 12, '늘 같은 각도로 유지돼요', 13, '#7b869a', 'center', 700); }
  }

  /* ================= ② 구심 가속도 (Δv 작도) ================= */
  function dvL() {
    return PHONE
      ? { pic: { x: 6, y: 6, w: 468, h: 322 }, dia: { x: 6, y: 334, w: 468, h: 198 }, fo: { x: 6, y: 538, w: 468, h: 172 }, sc: 24, vk: 5, V: 76, ox: 300, oy: 506 }
      : { pic: { x: 6, y: 6, w: 424, h: 468 }, dia: { x: 436, y: 6, w: 358, h: 468 }, fo: { x: 6, y: 480, w: 788, h: 132 }, sc: 36, vk: 6, V: 120, ox: 668, oy: 360 };
  }
  const dvCalc = () => {
    const d = S.dv, w = d.v / d.r, dth = w * d.dt;
    return { w, T: TAU * d.r / d.v, a: d.v * d.v / d.r, dth, dvm: 2 * d.v * Math.sin(dth / 2), off: dth / 2 / RAD };
  };
  function drawDv(dt) {
    const L = dvL(), d = S.dv, c = dvCalc();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (!d.pause) d.th = (d.th + c.w * dt) % TAU;
    d.dth = approach(d.dth, c.dth, dt, 10);
    const dth = d.dth;
    // --- 왼쪽: 원운동 그림
    const p = L.pic; card(p.x, p.y, p.w, p.h);
    ctx.save(); D.roundRect(p.x, p.y, p.w, p.h, 10); ctx.clip();
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2 + (PHONE ? 4 : 0), R = d.r * L.sc;
    ctx.strokeStyle = 'rgba(120,135,160,.18)'; ctx.lineWidth = 1;
    for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(cx + k * L.sc, p.y); ctx.lineTo(cx + k * L.sc, p.y + p.h); ctx.moveTo(p.x, cy + k * L.sc); ctx.lineTo(p.x + p.w, cy + k * L.sc); ctx.stroke(); }
    T(p.x + p.w - 10, p.y + 22, '격자 1칸 = 1 m', 13, '#7b869a', 'right', 700);
    ctx.strokeStyle = '#b8c4da'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx, cy, 4, '#5a6679', { gloss: false }); T(cx + 8, cy + 18, 'O (중심)', 13, '#5a6679', 'left', 800);
    const pt = (th) => [cx + R * Math.cos(th), cy - R * Math.sin(th)];
    const th0 = d.th, th1 = d.th + dth;
    const [x0, y0] = pt(th0), [x1, y1] = pt(th1);
    ctx.strokeStyle = 'rgba(90,102,121,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x0, y0); ctx.stroke();
    ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    // 호 Δθ
    ctx.strokeStyle = PURPLE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Math.min(R * 0.42, 40), -th1, -th0); ctx.stroke();
    const mid = th0 + dth / 2, ra = Math.min(R * 0.42, 40) + 15;
    if (dth > 0.12) T(cx + ra * Math.cos(mid), cy - ra * Math.sin(mid) + 5, 'Δθ', 13.5, PURPLE, 'center', 800);
    // 나중 공(유령), 지금 공
    D.sphere(x1, y1, 9, 'rgba(255,184,77,.55)', { gloss: false, outline: '#e0a030', outlineWidth: 1 });
    const tx0 = -Math.sin(th0), ty0 = -Math.cos(th0), tx1 = -Math.sin(th1), ty1 = -Math.cos(th1);
    const vl = d.v * L.vk;
    D.arrow(x1, y1, x1 + tx1 * vl, y1 + ty1 * vl, { color: ORANGE, width: 3.5, head: 10, alpha: 0.85 });
    D.sphere(x0, y0, 10, '#f26b3a', { gloss: true, shadow: true });
    D.arrow(x0, y0, x0 + tx0 * vl, y0 + ty0 * vl, { color: BLUE, width: 4, head: 11 });
    const lab = (x, y, s, bg) => D.label(clamp(x, p.x + 24, p.x + p.w - 24), clamp(y, p.y + 16, p.y + p.h - 16), s, { bg, size: 13.5, pad: 7 });
    lab(x0 + tx0 * (vl + 22), y0 + ty0 * (vl + 22), 'v', BLUE);
    lab(x1 + tx1 * (vl + 22), y1 + ty1 * (vl + 22), "v'", '#d98a06');
    // 가속도 방향 (중심 쪽) : 점선 + 설명
    D.dashedLine(x0, y0, x0 + (cx - x0) * 0.5, y0 + (cy - y0) * 0.5, { color: GREEN, width: 3, dash: [3, 5] });
    T(p.x + 12, p.y + 22, '위에서 본 등속 원운동', 14, '#26324a', 'left', 800);
    T(p.x + 12, p.y + p.h - 12, '속력 일정 · 방향만 바뀌는 중 (점선: 중심 쪽)', 13, '#5a6679', 'left', 700);
    ctx.restore();
    // --- 오른쪽: 속도 변화 벡터 (공과 함께 도는 방향으로 돌려 그려요: v를 위쪽으로)
    const g = L.dia; card(g.x, g.y, g.w, g.h);
    ctx.save(); D.roundRect(g.x, g.y, g.w, g.h, 10); ctx.clip();
    const ox = L.ox, oy = L.oy, dk = L.V / d.v;
    T(g.x + 12, g.y + 22, '속도 화살표를 한 점에 모으기', 14, '#26324a', 'left', 800);
    T(g.x + 12, g.y + 42, '(화살표는 v의 길이에 맞춰 키워 그렸어요)', 13, '#7b869a', 'left', 700);
    const V = L.V;
    const vp = [ox, oy - V], vq = [ox - V * Math.sin(dth), oy - V * Math.cos(dth)];
    // 중심 방향 기준선
    D.dashedLine(vp[0], vp[1], vp[0] - 150 * (PHONE ? 0.8 : 1), vp[1], { color: GREEN, width: 2.5, dash: [5, 5] });
    T(vp[0] - (PHONE ? 90 : 100), vp[1] - 8, '중심 방향', 13, GREEN, 'center', 800);
    D.arrow(ox, oy, vp[0], vp[1], { color: BLUE, width: 4, head: 11 });
    D.arrow(ox, oy, vq[0], vq[1], { color: ORANGE, width: 3.5, head: 10, alpha: 0.9 });
    if (c.dvm * dk > 3) D.arrow(vp[0], vp[1], vq[0], vq[1], { color: RED, width: 4.5, head: Math.min(12, Math.max(6, c.dvm * dk * 0.6)) });
    D.sphere(ox, oy, 5, '#5a6679', { gloss: false });
    T(ox + 10, oy - V * 0.55, 'v', 14, BLUE, 'left', 800);
    T(vq[0] - 10, vq[1] + (vq[1] > vp[1] ? 18 : -8), "v'", 14, '#d98a06', 'right', 800);
    ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox, oy, Math.min(V * 0.5, 54), -Math.PI / 2 - dth, -Math.PI / 2); ctx.stroke();
    if (dth > 0.15) T(ox - Math.min(V * 0.5, 54) * Math.sin(dth / 2) - 14, oy - Math.min(V * 0.5, 54) * Math.cos(dth / 2) + 6, 'Δθ', 13, PURPLE, 'right', 800);
    const dvx = (vp[0] + vq[0]) / 2, dvy = (vp[1] + vq[1]) / 2;
    if (c.dvm * dk > 3) D.label(vp[0] + 16, vp[1] - 14, 'Δv = v′ − v', { bg: RED, size: 13.5, pad: 7, align: 'left' });
    lines(g.x + 12, g.y + g.h - (PHONE ? 38 : 62), PHONE ? 20 : 22, 13.5, [
      ['Δv가 중심 방향에서 벗어난 각 = Δθ/2 = ' + c.off.toFixed(1) + '°', c.off <= 3 ? GREEN : '#26324a'],
      ['Δt → 0 이면 Δv는 정확히 중심 쪽을 가리켜요', '#5a6679'],
    ].slice(0, PHONE ? 2 : 2));
    ctx.restore();
    // --- 아래: 식
    const f = L.fo; panel(f.x, f.y, f.w, f.h, 14);
    const hide = eff('hideA');
    const fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 27;
    const nv = d.v.toFixed(1), nr = d.r.toFixed(1);
    const l3 = hide ? '|Δv| / Δt = ?     a = v² / r = ?   (직접 계산해 보세요)' : '|Δv| / Δt = ' + (c.dvm / d.dt).toFixed(2) + ' m/s² (Δt = ' + d.dt.toFixed(2) + ' s)   a = v² / r = ' + c.a.toFixed(2) + ' m/s²   a = r·ω² = ' + (d.r * c.w * c.w).toFixed(2) + ' m/s²';
    if (!PHONE) {
      lines(f.x + 14, f.y + 28, lh, fs, [
        ['|Δv| = 2v·sin(Δθ/2) ≈ v·Δθ = v·ω·Δt   →   a = |Δv| / Δt = v·ω = v² / r = r·ω²', '#26324a'],
        ['v = ' + nv + ' m/s,  r = ' + nr + ' m   →   ω = v / r = ' + c.w.toFixed(2) + ' rad/s,  T = 2πr / v = ' + c.T.toFixed(2) + ' s', '#26324a'],
        [l3, hide ? '#b45309' : '#14753f'],
      ]);
    } else {
      lines(f.x + 12, f.y + 24, 23, 13.5, [
        ['|Δv| ≈ v·Δθ = v·ω·Δt  →  a = |Δv| / Δt = v·ω', '#26324a'],
        ['a = v² / r = r·ω²', '#26324a'],
        ['v = ' + nv + ' m/s, r = ' + nr + ' m → ω = ' + c.w.toFixed(2) + ' rad/s', '#26324a'],
        ['T = 2πr / v = ' + c.T.toFixed(2) + ' s', '#26324a'],
        [hide ? '|Δv| / Δt = ?, a = ? (직접 계산!)' : '|Δv| / Δt = ' + (c.dvm / d.dt).toFixed(2) + ' (Δt = ' + d.dt.toFixed(2) + ' s)', hide ? '#b45309' : '#14753f'],
        [hide ? '' : 'a = v² / r = ' + c.a.toFixed(2) + ' m/s²', '#14753f'],
      ]);
    }
    if (PHONE) { /* 폰: 식이 길어 두 줄로 나뉘어 보이지 않게 폰트를 줄여 둠 */ }
  }

  /* ================= ③ 줄에 매단 공 ================= */
  function blL() { return PHONE ? { sx: 6, sy: 6, sw: 468, sh: SH - 12, cx: 150, cy: SH / 2, sc: 78, gx: 312 } : { sx: 6, sy: 6, sw: 788, sh: SH - 12, cx: 285, cy: SH / 2, sc: 96, gx: 584 }; }
  const blF = (b) => b.m * b.v * b.v / b.r;
  function blStep(dt) {
    const b = S.bl, L = blL();
    if (!b.cut) { b.ang = (b.ang + b.v / b.r * dt) % TAU; return; }
    b.bx += b.cvx * dt; b.by += b.cvy * dt;
    b.trT -= dt; if (b.trT <= 0) { b.trT = 0.07; b.trail.push([b.bx, b.by, 1]); if (b.trail.length > 24) b.trail.shift(); }
    if (b.bx < L.sx + 12 || b.bx > L.sx + L.sw - 12 || b.by < L.sy + 12 || b.by > L.sy + L.sh - 12) {
      b.bx = clamp(b.bx, L.sx + 12, L.sx + L.sw - 12); b.by = clamp(b.by, L.sy + 12, L.sy + L.sh - 12); b.cvx = 0; b.cvy = 0; b.msg = '접선 방향으로 날아가 벽에 닿았어요';
    }
  }
  function blCut() {
    const b = S.bl, L = blL();
    if (b.cut) { b.cut = false; b.trail = []; b.msg = ''; updateCtl(); return; }
    const R = b.r * L.sc;
    b.bx = L.cx + R * Math.cos(b.ang); b.by = L.cy - R * Math.sin(b.ang);
    b.cvx = -Math.sin(b.ang) * b.v * L.sc; b.cvy = -Math.cos(b.ang) * b.v * L.sc;   // 접선 방향, 속력 v 그대로
    b.cut = true; b.trail = []; b.trT = 0; b.msg = '줄이 끊어졌어요: 접선 방향으로 직진!'; Sound.click(); updateCtl();
  }
  function blRecord() {
    const b = S.bl;
    if (b.cut) { showHint('줄이 끊어진 상태예요. ↺ 다시 매달기를 먼저 눌러요.', 2800); return; }
    const row = { m: b.m, r: b.r, v: b.v, F: blF(b) };
    const i = b.rec.findIndex((x) => x.m === row.m && x.r === row.r && x.v === row.v);
    if (i >= 0) { showHint('이 값은 이미 기록했어요. 속력을 바꿔 보세요.', 2400); return; }
    b.rec.push(row); if (b.rec.length > 7) b.rec.shift();
    Sound.click();
    const L = blL(); parts.burst(L.cx + b.r * L.sc * Math.cos(b.ang), L.cy - b.r * L.sc * Math.sin(b.ang), { count: 10, speed: 90, size: 3, colors: ['#ffd447', '#fff', '#7cc4ff'], gravity: 0, life: 0.6 });
    updateCtl();
  }
  const blGroups = () => {      // (m, r)가 같은 기록끼리 묶기
    const g = {};
    S.bl.rec.forEach((x) => { const k = x.m + '|' + x.r; (g[k] = g[k] || []).push(x); });
    return Object.keys(g).map((k) => ({ key: k, m: g[k][0].m, r: g[k][0].r, pts: g[k], nv: new Set(g[k].map((x) => x.v)).size }));
  };
  const blBest = () => blGroups().reduce((a, g) => Math.max(a, g.nv), 0);
  function drawBall(dt) {
    const L = blL(), b = S.bl;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(L.sx, L.sy, L.sw, L.sh);
    ctx.save(); D.roundRect(L.sx, L.sy, L.sw, L.sh, 10); ctx.clip();
    // 매끈한 책상 면 (위에서 본 모습)
    const g = ctx.createRadialGradient(L.cx, L.cy, 10, L.cx, L.cy, 220); g.addColorStop(0, '#f6efe0'); g.addColorStop(1, '#eadcc0');
    ctx.fillStyle = g; ctx.fillRect(L.sx, L.sy, L.gx - L.sx - 8, L.sh);
    const R = b.r * L.sc;
    ctx.strokeStyle = 'rgba(138,109,59,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(L.cx, L.cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const F = blF(b), rb = 8 + b.m * 9;
    let bx, by;
    if (!b.cut) { bx = L.cx + R * Math.cos(b.ang); by = L.cy - R * Math.sin(b.ang); } else { bx = b.bx; by = b.by; }
    // 잔상
    b.trail.forEach((q, i) => { ctx.globalAlpha = 0.12 + 0.35 * (i / Math.max(1, b.trail.length)); D.sphere(q[0], q[1], rb * 0.8, '#f26b3a', { gloss: false }); }); ctx.globalAlpha = 1;
    if (!b.cut) { ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(L.cx, L.cy); ctx.lineTo(bx, by); ctx.stroke(); }
    D.sphere(L.cx, L.cy, 7, '#5a6679', { gloss: true, shadow: true });
    D.shadow(() => D.sphere(bx, by, rb, '#f26b3a', { gloss: true }), { blur: 8, y: 4 });
    // 속도(접선)
    const tx = b.cut ? (b.cvx !== 0 || b.cvy !== 0 ? b.cvx / (b.v * L.sc) : -Math.sin(b.ang)) : -Math.sin(b.ang), ty = b.cut ? (b.cvx !== 0 || b.cvy !== 0 ? b.cvy / (b.v * L.sc) : -Math.cos(b.ang)) : -Math.cos(b.ang);
    const moving = !b.cut || b.cvx !== 0 || b.cvy !== 0;
    const vl = b.v * 13;
    if (moving) { D.arrow(bx, by, bx + tx * vl, by + ty * vl, { color: BLUE, width: 4, head: 11 }); D.label(clamp(bx + tx * (vl + 16), L.sx + 20, L.gx - 30), clamp(by + ty * (vl + 16), L.sy + 16, L.sy + L.sh - 16), 'v', { bg: BLUE, size: 14, pad: 7 }); }
    // 장력(굵기가 F에 비례)
    if (!b.cut) {
      const ux = (L.cx - bx) / R, uy = (L.cy - by) / R, al = Math.min(52, R * 0.5);
      const wdt = 3 + F * 0.14;
      D.arrow(bx + ux * (rb + 2), by + uy * (rb + 2), bx + ux * (rb + 2 + al), by + uy * (rb + 2 + al), { color: RED, width: wdt, head: Math.max(12, wdt * 2.2) });
      D.label(clamp(bx + ux * (rb + al + 26), L.sx + 40, L.gx - 40), clamp(by + uy * (rb + al + 26), L.sy + 16, L.sy + L.sh - 16), '장력 = 구심력', { bg: RED, size: 13, pad: 7 });
    } else {
      D.label((L.sx + L.gx) / 2, L.sy + 24, b.msg, { bg: 'rgba(30,41,59,.85)', size: 14 });
    }
    T(L.sx + 12, L.sy + 22, '위에서 본 줄에 매단 공 (마찰 없는 판)', 14, '#26324a', 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 장력 센서
    const gx = L.gx, gw = L.sx + L.sw - L.gx - 6;
    ctx.save(); D.roundRect(L.sx, L.sy, L.sw, L.sh, 10); ctx.clip();
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(gx - 4, L.sy, gw + 10, L.sh);
    T(gx + 4, L.sy + 24, '장력 센서', 14, '#26324a', 'left', 800);
    const barY = L.sy + 40, barH = L.sh - 120, barX = gx + 8;
    vbar(barX, barY, 34, barH, F, 80, F > 72 ? '#b91c1c' : RED);
    for (let k = 0; k <= 4; k++) { const yy = barY + barH - barH * k / 4; ctx.strokeStyle = '#9aa6bb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(barX + 34, yy); ctx.lineTo(barX + 42, yy); ctx.stroke(); T(barX + 46, yy + 5, String(k * 20), 13, '#5a6679', 'left', 700); }
    T(barX + 17, barY + barH + 22, 'N', 13, '#5a6679', 'center', 700);
    T(gx + 74, barY + 18, F.toFixed(1) + ' N', 22, RED, 'left', 800);
    lines(gx + 74, barY + 46, 22, 13.5, [['F = m·v² / r', '#26324a'], ['m = ' + b.m.toFixed(2) + ' kg', '#5a6679'], ['v = ' + b.v.toFixed(1) + ' m/s', '#5a6679'], ['r = ' + b.r.toFixed(2) + ' m', '#5a6679']]);
    ctx.restore();
    // 아래: F–v² 그래프와 표
    const gr = PHONE ? { x: PX, y: PY, w: PW, h: 186 } : { x: PX, y: PY, w: Math.round(PW * 0.55), h: PH };
    const tb = PHONE ? { x: PX, y: PY + 192, w: PW, h: PH - 192 } : { x: PX + gr.w + 8, y: PY, w: PW - gr.w - 8, h: PH };
    const need = Math.max(F, ...b.rec.map((x) => x.F));
    b.ymax = approach(b.ymax, need <= 20 ? 20 : need <= 40 ? 40 : 80, dt, 8);
    const ym = b.ymax;
    const best = blGroups().sort((p, q) => q.nv - p.nv)[0];
    const a = axes(gr, { xmin: 0, xmax: 40, xstep: 10, xd: 0, ymin: 0, ymax: ym, ystep: ym / 4, yd: ym / 4 < 5 ? 1 : 0, title: 'F – v² 그래프  (가로: v², 세로: F)', right: best && best.nv >= 3 ? '직선: 기울기 m/r' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    if (best && best.nv >= 3) {
      const sl = best.m / best.r; ctx.strokeStyle = 'rgba(56,103,244,.7)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(0)); ctx.lineTo(a.gx(40), a.gy(sl * 40)); ctx.stroke(); ctx.setLineDash([]);
    }
    const cols = ['#e2552a', '#3867f4', '#14a058', '#7c3aed', '#d98a06'];
    const grp = blGroups();
    grp.forEach((gp, gi) => gp.pts.forEach((p) => D.sphere(a.gx(p.v * p.v), a.gy(p.F), 5, cols[gi % cols.length], { gloss: false, outline: '#fff', outlineWidth: 1 })));
    // 지금 값(속이 빈 고리)
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.gx(b.v * b.v), a.gy(F), 7, 0, TAU); ctx.stroke();
    ctx.restore();
    // 표
    card(tb.x, tb.y, tb.w, tb.h);
    T(tb.x + 10, tb.y + 21, '📋 장력 기록', 13.5, '#26324a', 'left', 800);
    const hdr = ['m(kg)', 'r(m)', 'v(m/s)', 'v²', 'F(N)'], cw = (tb.w - 16) / 5, rh = 20;
    hdr.forEach((h, i) => T(tb.x + 8 + cw * i + cw / 2, tb.y + 44, h, 13, '#5a6679', 'center', 800));
    b.rec.forEach((r, i) => {
      const yy = tb.y + 44 + (i + 1) * rh;
      if (yy > tb.y + tb.h - 4) return;
      const vals = [r.m.toFixed(2), r.r.toFixed(1), r.v.toFixed(1), (r.v * r.v).toFixed(1), r.F.toFixed(1)];
      vals.forEach((s, k) => T(tb.x + 8 + cw * k + cw / 2, yy, s, 13.5, k === 4 ? RED : '#26324a', 'center', 800));
    });
    if (!b.rec.length) T(tb.x + tb.w / 2, tb.y + tb.h / 2 + 14, '📏 장력 기록을 눌러 쌓아요', 13.5, '#7b869a', 'center', 700);
  }

  /* ================= ③ 커브 도로 ================= */
  function rdL() { return PHONE ? { sx: 6, sy: 6, sw: 468, sh: SH - 12, cx: 160, cy: SH / 2, sc: 2.2, gx: 322 } : { sx: 6, sy: 6, sw: 788, sh: SH - 12, cx: 285, cy: SH / 2, sc: 2.8, gx: 584 }; }
  const rdV = () => S.rd.kmh / 3.6;
  function rdPlace() { const r = S.rd, L = rdL(); r.x = L.cx + RD_R * L.sc * Math.cos(r.ang); r.y = L.cy - RD_R * L.sc * Math.sin(r.ang); }
  function rdReset() { const r = S.rd; r.skid = false; r.stop = false; r.ang = -Math.PI / 2; r.trail = []; r.sp = 0; rdPlace(); updateCtl(); }
  function rdStep(dt) {
    const r = S.rd, L = rdL(), v = rdV();
    if (!r.skid) {
      if (v > rdVmax(r.mu) + 1e-9) {
        r.skid = true; rdPlace(); r.vx = -Math.sin(r.ang) * v * L.sc; r.vy = -Math.cos(r.ang) * v * L.sc; r.sp = v; r.trail = []; r.trT = 0; Sound.click(); updateCtl();
      } else { r.ang = (r.ang + v / RD_R * dt) % TAU; rdPlace(); return; }
    }
    if (r.stop) return;
    const k = Math.max(0, r.sp - r.mu * G * dt) / Math.max(r.sp, 1e-9);
    r.sp = Math.max(0, r.sp - r.mu * G * dt); r.vx *= k; r.vy *= k;
    r.x += r.vx * dt; r.y += r.vy * dt;
    r.trT -= dt; if (r.trT <= 0) { r.trT = 0.08; r.trail.push([r.x, r.y]); if (r.trail.length > 30) r.trail.shift(); }
    const x0 = L.sx + 14, x1 = L.gx - 22, y0 = L.sy + 14, y1 = L.sy + L.sh - 14;
    if (r.x < x0 || r.x > x1 || r.y < y0 || r.y > y1) { r.x = clamp(r.x, x0, x1); r.y = clamp(r.y, y0, y1); r.stop = true; }
    if (r.sp <= 1e-6) r.stop = true;
  }
  function carShape(x, y, ang, body) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    D.shadow(() => { D.roundRect(-14, -7, 28, 14, 5); ctx.fillStyle = body; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(-2, -5, 9, 10, 2); ctx.fill();
    ctx.fillStyle = '#ffe58a'; ctx.fillRect(12, -6, 3, 3); ctx.fillRect(12, 3, 3, 3);
    ctx.restore();
  }
  function drawRoad(dt) {
    const L = rdL(), r = S.rd, v = rdV(), mu = r.mu;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(L.sx, L.sy, L.sw, L.sh);
    ctx.save(); D.roundRect(L.sx, L.sy, L.sw, L.sh, 10); ctx.clip();
    const grass = ctx.createLinearGradient(0, L.sy, 0, L.sy + L.sh); grass.addColorStop(0, '#b9dd9e'); grass.addColorStop(1, '#9ccb82');
    ctx.fillStyle = grass; ctx.fillRect(L.sx, L.sy, L.gx - L.sx - 8, L.sh);
    // 가드레일(자동차가 멈추는 곳)
    ctx.strokeStyle = 'rgba(80,100,70,.55)'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.strokeRect(L.sx + 8, L.sy + 8, L.gx - L.sx - 30, L.sh - 16); ctx.setLineDash([]);
    const R = RD_R * L.sc, rw = 8 * L.sc;
    const road = mu >= 0.8 ? '#5b6272' : mu >= 0.4 ? '#46556e' : '#cfe0ee';
    ctx.strokeStyle = road; ctx.lineWidth = rw; ctx.beginPath(); ctx.arc(L.cx, L.cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.arc(L.cx, L.cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (mu < 0.2) { ctx.fillStyle = 'rgba(255,255,255,.65)'; for (let k = 0; k < 26; k++) { const a = k * 0.62; ctx.beginPath(); ctx.arc(L.cx + (R + Math.sin(k * 7) * rw * 0.3) * Math.cos(a), L.cy - (R + Math.sin(k * 7) * rw * 0.3) * Math.sin(a), 2.2, 0, TAU); ctx.fill(); } }
    if (mu > 0.2 && mu < 0.6) { ctx.fillStyle = 'rgba(180,215,255,.45)'; for (let k = 0; k < 18; k++) { const a = k * 0.35 + 0.1; ctx.beginPath(); ctx.ellipse(L.cx + R * Math.cos(a), L.cy - R * Math.sin(a), 5, 2.4, -a, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L.cx, L.cy); ctx.lineTo(L.cx + R * Math.cos(-0.5), L.cy - R * Math.sin(-0.5)); ctx.stroke();
    D.sphere(L.cx, L.cy, 4, '#3a465c', { gloss: false });
    T(L.cx + R * 0.5 * Math.cos(-0.5) + 6, L.cy - R * 0.5 * Math.sin(-0.5) - 6, 'r = 50 m', 13.5, '#1f3a18', 'left', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
    // 자동차
    const heading = r.skid ? Math.atan2(r.vy || -Math.cos(r.ang), r.vx || -Math.sin(r.ang)) : Math.atan2(-Math.cos(r.ang), -Math.sin(r.ang));
    r.trail.forEach((q, i) => { ctx.globalAlpha = 0.1 + 0.3 * (i / Math.max(1, r.trail.length)); ctx.fillStyle = '#3a465c'; ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    const fNeed = RD_M * v * v / RD_R, fMax = mu * RD_M * G;
    if (!r.skid) {
      const ux = (L.cx - r.x) / R, uy = (L.cy - r.y) / R, len = Math.min(fNeed, fMax) / 1000 * 6 + 6;
      carShape(r.x, r.y, heading, '#e2464b');
      D.arrow(r.x + ux * 12, r.y + uy * 12, r.x + ux * (12 + len), r.y + uy * (12 + len), { color: GREEN, width: 4, head: 10 });
      D.label(clamp(r.x + ux * (12 + len + 40), L.sx + 50, L.gx - 40), clamp(r.y + uy * (12 + len + 40) - 4, L.sy + 18, L.sy + L.sh - 14), '마찰력 = 구심력', { bg: GREEN, size: 13, pad: 7 });
    } else {
      carShape(r.x, r.y, heading, '#9aa3b2');
      D.label((L.sx + L.gx) / 2 - 4, L.sy + L.sh - 22, r.stop ? '길을 벗어나 멈췄어요 (접선 방향으로 직진)' : '미끄러져요! 접선 방향으로 직진', { bg: 'rgba(185,28,28,.9)', size: 14 });
    }
    T(L.sx + 12, L.sy + 22, '위에서 본 커브 도로 (자동차는 크게 그렸어요)', 13.5, '#1f3a18', 'left', 800);
    ctx.restore();
    // 오른쪽: 필요한 구심력 vs 최대 마찰력 (자동차 1000 kg)
    ctx.save(); D.roundRect(L.sx, L.sy, L.sw, L.sh, 10); ctx.clip();
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(L.gx - 4, L.sy, L.sw - (L.gx - L.sx) + 4, L.sh);
    const gx = L.gx + 4, barY = L.sy + 76, barH = L.sh - 150, bw = 40;
    T(L.gx + 4, L.sy + 24, '마찰력 (kN)', 13.5, '#26324a', 'left', 800);
    T(L.gx + 4, L.sy + 42, '자동차 1000 kg', 13, '#5a6679', 'left', 700);
    const over = fNeed > fMax + 1e-6;
    vbar(gx, barY, bw, barH, fNeed / 1000, 16, over ? '#b91c1c' : GREEN);
    vbar(gx + 84, barY, bw, barH, fMax / 1000, 16, '#3867f4');
    T(gx + bw / 2, barY - 7, (fNeed / 1000).toFixed(1), 14, over ? '#b91c1c' : '#14753f', 'center', 800);
    T(gx + 84 + bw / 2, barY - 7, (fMax / 1000).toFixed(1), 14, '#1d4ed8', 'center', 800);
    T(gx + bw / 2, barY + barH + 20, '필요', 13, '#5a6679', 'center', 800); T(gx + 84 + bw / 2, barY + barH + 20, '최대', 13, '#5a6679', 'center', 800);
    T(gx + bw / 2, barY + barH + 38, 'mv²/r', 13, '#5a6679', 'center', 700); T(gx + 84 + bw / 2, barY + barH + 38, 'μmg', 13, '#5a6679', 'center', 700);
        // 눈금 (kN): 0, 8, 16
    ctx.restore();
    parts.update(dt); parts.draw(ctx);
    // 아래: 설명 + 구심력–속력 그래프
    const tw = PHONE ? PW : Math.round(PW * 0.4);
    panel(PX, PY, PW, PH, 16);
    const f = PHONE ? 13.5 : 14, lh = PHONE ? 23 : 26, x0 = PX + 16;
    T(x0, PY + 28, '🚗 구심력 = 타이어와 도로의 마찰력', f, '#26324a', 'left', 800);
    const hideL = eff('hideLim');
    lines(x0, PY + 28 + lh, lh, f - 0.5, [
      ['마찰력이 모자라면 원을 따라 돌지 못하고', '#26324a'],
      ['접선 방향으로 미끄러져요.', '#26324a'],
      [hideL ? '필요 mv²/r ' + (fNeed / 1000).toFixed(1) + ' kN · 최대 μmg ' + (fMax / 1000).toFixed(1) + ' kN' : (over ? '필요 ' : '필요 ') + (fNeed / 1000).toFixed(1) + ' kN ' + (over ? '>' : '≤') + ' 최대 ' + (fMax / 1000).toFixed(1) + ' kN → ' + (over ? '미끄러져요' : '안전해요'), over ? '#b91c1c' : '#14753f'],
      ['한계: mv²/r = μmg → v = √(μ·g·r)', '#5a6679'],
    ].slice(0, PHONE ? 4 : 4));
    const gr = PHONE ? { x: PX + 8, y: PY + 128, w: PW - 16, h: PH - 136 } : { x: PX + tw, y: PY + 8, w: PW - tw - 8, h: PH - 16 };
    const a = axes(gr, { xmin: 0, xmax: 100, xstep: 20, xd: 0, ymin: 0, ymax: 16, ystep: 4, yd: 0, title: '필요한 구심력 – 속력 (kN, km/h)', right: '' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = 0; k <= 50; k++) { const kmh = k * 2, yy = RD_M * Math.pow(kmh / 3.6, 2) / RD_R / 1000; if (k) ctx.lineTo(a.gx(kmh), a.gy(yy)); else ctx.moveTo(a.gx(kmh), a.gy(yy)); } ctx.stroke();
    ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(fMax / 1000)); ctx.lineTo(a.gx(100), a.gy(fMax / 1000)); ctx.stroke(); ctx.setLineDash([]);
    if (!hideL) { const vm = rdVmax(mu) * 3.6; ctx.strokeStyle = 'rgba(185,28,28,.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(a.gx(vm), a.gy(0)); ctx.lineTo(a.gx(vm), a.gy(fMax / 1000)); ctx.stroke(); ctx.setLineDash([]); }
    D.sphere(a.gx(r.kmh), a.gy(fNeed / 1000), 6, over ? '#b91c1c' : '#f26b3a', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    ctx.restore();
    T(a.gx(100) - 4, a.gy(fMax / 1000) - 6, 'μmg', 13, '#1d4ed8', 'right', 800);
    T(a.gx(78), a.gy(RD_M * Math.pow(78 / 3.6, 2) / RD_R / 1000) - 10, 'mv²/r', 13, '#14753f', 'right', 800);
  }

  /* ================= ④ 놀이기구 공통 ================= */
  function sceneBox() { return { x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 }; }
  function person(x, yFeet, h, color, flip) {
    // 단순한 사람 그림: 다리·몸·머리
    const w = h * 0.34;
    ctx.save(); ctx.translate(x, yFeet); if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = '#3b4a68'; D.roundRect(-w * 0.45, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill(); D.roundRect(w * 0.1, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill();
    ctx.fillStyle = color; D.roundRect(-w * 0.55, -h * 0.82, w * 1.1, h * 0.46, w * 0.3); ctx.fill();
    D.sphere(0, -h * 0.9, h * 0.1, '#ffd9b3', { gloss: false, outline: '#c9a27a', outlineWidth: 1 });
    ctx.restore();
  }

  /* ----- 회전 그네 ----- */
  function drawSwing(dt) {
    const B = sceneBox(), s = S.sw;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(B.x, B.y, B.w, B.h);
    s.th = approach(s.th, swingTheta(s.w), dt, 5);
    s.phi += s.w * dt; s.r = SW_RP + SW_L * Math.sin(s.th);
    const sc = PHONE ? 19 : 22, cx = PHONE ? 130 : 260, gy = B.y + B.h - 26, ytop = gy - SW_H * sc;
    ctx.save(); D.roundRect(B.x, B.y, B.w, B.h, 10); ctx.clip();
    const sky = ctx.createLinearGradient(0, B.y, 0, gy); sky.addColorStop(0, '#cfe6fb'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(B.x, B.y, B.w, gy - B.y);
    ctx.fillStyle = '#8fc47a'; ctx.fillRect(B.x, gy, B.w, B.y + B.h - gy);
    const yc = ytop + SW_L * Math.cos(s.th) * sc;       // 의자 높이(화면)
    // 원 궤도(바닥 쪽에 비춘 그림자 + 의자 높이의 점선)
    ctx.fillStyle = 'rgba(40,60,40,.12)'; ctx.beginPath(); ctx.ellipse(cx, gy + 8, s.r * sc, s.r * sc * 0.22, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,102,121,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(cx, yc + 6, s.r * sc, s.r * sc * 0.22, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 기둥
    D.shadow(() => { D.roundRect(cx - 6, ytop, 12, gy - ytop, 3); ctx.fillStyle = '#9aa5b8'; ctx.fill(); }, { blur: 5, y: 2 });
    // 의자 4개 (뒤쪽부터)
    const ch = [0, 1, 2, 3].map((k) => { const ph = s.phi + k * Math.PI / 2; return { ph, d: Math.sin(ph), k }; }).sort((a, b) => a.d - b.d);
    const drawChair = (c) => {
      const d = c.d, k = 1 + 0.1 * d;
      const px = cx + SW_RP * sc * Math.cos(c.ph), py = ytop + d * SW_RP * sc * 0.22 + 2;
      const qx = cx + s.r * sc * Math.cos(c.ph), qy = yc + d * s.r * sc * 0.22;
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 5 * k, py); ctx.lineTo(qx - 8 * k, qy); ctx.moveTo(px + 5 * k, py); ctx.lineTo(qx + 8 * k, qy); ctx.stroke();
      D.shadow(() => { D.roundRect(qx - 11 * k, qy, 22 * k, 7 * k, 3); ctx.fillStyle = '#f2b134'; ctx.fill(); }, { blur: 3, y: 2 });
      person(qx, qy, 24 * k, c.k === 0 ? '#3867f4' : '#8b5cf6');
    };
    // 윗판 뒤쪽 절반 → 의자 → 윗판 앞쪽 (원판은 타원)
    const rx = (SW_RP + 0.7) * sc, ry = rx * 0.22;
    ctx.fillStyle = '#7a869d'; ctx.beginPath(); ctx.ellipse(cx, ytop, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.ellipse(cx, ytop - 3, rx, ry, 0, 0, TAU); ctx.fill();
    ch.forEach(drawChair);
    D.sphere(cx, ytop - 8, 6, '#e2464b', { gloss: true });
    // 회전 방향 표시
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(cx, ytop - 20, rx * 0.9, ry * 0.9, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    D.arrow(cx + rx * 0.9 * Math.cos(Math.PI * 1.9), ytop - 20 + ry * 0.9 * Math.sin(Math.PI * 1.9) - 1, cx + rx * 0.9 * Math.cos(Math.PI * 1.9) + 4, ytop - 20 + ry * 0.9 * Math.sin(Math.PI * 1.9) + 6, { color: '#e2464b', width: 2.5, head: 9 });
    T(B.x + 12, B.y + 22, '회전 그네 (옆에서 본 모습)', 14, '#26324a', 'left', 800);
    T(cx, gy + 18, '축', 13, '#26324a', 'center', 800);
    // 오른쪽: 줄의 기울기 도해 (단위 질량당 힘으로 평행사변형 그리기)
    const ix = B.x + B.w - (PHONE ? 150 : 168);
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(ix - 8, B.y, B.x + B.w - ix + 8, B.h);
    T(ix + 2, B.y + 24, '의자에 작용하는 힘', 13.5, '#26324a', 'left', 800);
    T(ix + 2, B.y + 42, '(단위 질량당)', 13, '#5a6679', 'left', 700);
    const sw = swing(s.w), kf = 6;
    const ex = ix + (PHONE ? 98 : 124), ey = B.y + B.h - 90;
    const ang = sw.th;
    const sl = 150 * (PHONE ? 0.78 : 1);
    const px0 = ex - Math.sin(ang) * sl, py0 = ey - Math.cos(ang) * sl;
    D.dashedLine(px0, py0 - 10, px0, ey + 30, { color: '#9aa6bb', width: 2, dash: [4, 5] });
    T(px0 + 6, ey + 46, '축', 13, '#5a6679', 'left', 700);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(ex, ey); ctx.stroke();
    D.sphere(ex, ey, 7, '#f26b3a', { gloss: true });
    D.arrow(ex, ey, ex, ey + G * kf, { color: '#6b7280', width: 3.5, head: 9 });
    T(ex + 10, ey + G * kf - 2, 'mg', 13.5, '#4b5563', 'left', 800);
    D.arrow(ex, ey, ex - sw.a * kf, ey, { color: RED, width: 3.5, head: 9 });
    T(ex - sw.a * kf / 2, ey + 18, 'ma', 13.5, RED, 'center', 800);
    D.arrow(ex, ey, ex - sw.a * kf, ey - G * kf, { color: PURPLE, width: 3.5, head: 9 });
    T(ex - sw.a * kf / 2 + 14, ey - G * kf / 2 + 6, '장력 T', 13.5, PURPLE, 'left', 800);
    ctx.strokeStyle = PURPLE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px0, py0, 34, Math.PI / 2 - ang, Math.PI / 2); ctx.stroke();
    T(px0 + (PHONE ? 30 : 44), py0 + 50, eff('hideTh') ? 'θ = ?' : 'θ = ' + (ang / RAD).toFixed(1) + '°', 14, PURPLE, 'left', 800);
    ctx.restore();
    // 아래: 스마트폰 센서
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16;
    T(x0, PY + 28, '📱 의자에 놓은 스마트폰 가속도 센서', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const bw = PHONE ? 250 : 380;
    const rowsY = PY + 62;
    T(x0, rowsY, '수평 (축 쪽) a = ω²r', 13.5, '#5a6679', 'left', 800);
    hbar(x0, rowsY + 8, bw, 14, sw.a, 20, RED); T(x0 + bw + 10, rowsY + 21, sw.a.toFixed(1) + ' m/s²', 15, RED, 'left', 800);
    T(x0, rowsY + 48, '수직 (위쪽) g', 13.5, '#5a6679', 'left', 800);
    hbar(x0, rowsY + 56, bw, 14, G, 20, '#6b7280'); T(x0 + bw + 10, rowsY + 69, G.toFixed(1) + ' m/s²', 15, '#4b5563', 'left', 800);
    const tot = Math.hypot(sw.a, G);
    T(x0, rowsY + 96, '합: √(수평² + 수직²)', 13.5, '#5a6679', 'left', 800);
    hbar(x0, rowsY + 104, bw, 14, tot, 20, PURPLE); T(x0 + bw + 10, rowsY + 117, tot.toFixed(1) + ' m/s² (' + (tot / G).toFixed(1) + ' g)', 15, PURPLE, 'left', 800);
    lines(x0, PY + PH - (PHONE ? 62 : 42), 20, 13.5, [['센서의 합 방향 = 줄의 방향이에요.  tanθ = a / g = ω²r / g', '#26324a'], ['ω = ' + s.w.toFixed(1) + ' rad/s,  r = ' + sw.r.toFixed(1) + ' m  →  a = ' + sw.a.toFixed(1) + ' m/s²', '#5a6679']].slice(0, 2));
  }

  /* ----- 관람차 ----- */
  function whStep(dt) {
    const w = S.wh;
    if (w.pause) return;
    w.psi += w.v / WH_R * dt; w.tAll += dt;
    w.hT -= dt; if (w.hT <= 0) { w.hT = 0.05; w.hist.push([w.tAll, whAz(w.v, w.psi)]); }
    while (w.hist.length && w.hist[0][0] < w.tAll - 12.5) w.hist.shift();
  }
  function drawWheel(dt) {
    const B = sceneBox(), w = S.wh, a = w.v * w.v / WH_R;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(B.x, B.y, B.w, B.h);
    ctx.save(); D.roundRect(B.x, B.y, B.w, B.h, 10); ctx.clip();
    const sky = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); sky.addColorStop(0, '#cfe6fb'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(B.x, B.y, B.w, B.h);
    const sc = PHONE ? 12.6 : 14.2, cx = PHONE ? 160 : 290, cy = B.y + B.h / 2 - 2, R = WH_R * sc;
    ctx.fillStyle = '#8fc47a'; ctx.fillRect(B.x, cy + R + 20, B.w, B.y + B.h - (cy + R + 20));
    // 지지대
    ctx.strokeStyle = '#8b97ad'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 34, cy + R + 20); ctx.lineTo(cx, cy); ctx.lineTo(cx + 34, cy + R + 20); ctx.stroke();
    // 바퀴
    ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.8; for (let k = 0; k < 12; k++) { const t = w.psi + k * TAU / 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(t), cy - R * Math.sin(t)); ctx.stroke(); }
    // 곤돌라 12개 (나 = k 0)
    for (let k = 11; k >= 0; k--) {
      const t = w.psi + k * TAU / 12, gx = cx + R * Math.cos(t), gy = cy - R * Math.sin(t), me = k === 0;
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + 11); ctx.stroke();
      D.shadow(() => { D.roundRect(gx - 12, gy + 10, 24, 20, 5); ctx.fillStyle = me ? '#f26b3a' : '#7cc4ff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.65)'; D.roundRect(gx - 8, gy + 14, 16, 8, 2); ctx.fill();
      D.sphere(gx, gy, 3.5, '#475569', { gloss: false });
    }
    D.sphere(cx, cy, 9, '#e2464b', { gloss: true });
    // 나의 곤돌라 쪽 화살표(속도 접선, 가속도 중심 쪽 점선)
    const mx = cx + R * Math.cos(w.psi), my = cy - R * Math.sin(w.psi);
    const tx = -Math.sin(w.psi), ty = -Math.cos(w.psi);
    D.arrow(mx, my + 20, mx + tx * w.v * 6, my + 20 + ty * w.v * 6, { color: BLUE, width: 3.5, head: 10 });
    const ux = (cx - mx) / R, uy = (cy - my) / R;
    D.dashedLine(mx, my + 20, mx + ux * 44, my + 20 + uy * 44, { color: GREEN, width: 3, dash: [3, 5] });
    D.label(clamp(mx + tx * (w.v * 6 + 18), B.x + 24, B.x + B.w - 24), clamp(my + 20 + ty * (w.v * 6 + 18), B.y + 16, B.y + B.h - 14), 'v', { bg: BLUE, size: 13.5, pad: 7 });
    T(B.x + 12, B.y + 22, '관람차 (반지름 10 m)', 14, '#26324a', 'left', 800);
    // 오른쪽 정보
    const ix = B.x + B.w - (PHONE ? 126 : 176);
    ctx.fillStyle = 'rgba(247,249,253,.94)'; ctx.fillRect(ix - 10, B.y, B.x + B.w - ix + 10, B.h);
    const az = whAz(w.v, w.psi), N = WH_M * G * az;
    T(ix, B.y + 28, '오렌지색 곤돌라', 13.5, '#26324a', 'left', 800);
    T(ix, B.y + 46, '(몸무게 500 N)', 13, '#5a6679', 'left', 700);
    T(ix, B.y + 80, '구심 가속도', 13, '#5a6679', 'left', 800); T(ix, B.y + 104, a.toFixed(2) + ' m/s²', 18, GREEN, 'left', 800);
    T(ix, B.y + 140, '센서(연직)', 13, '#5a6679', 'left', 800); T(ix, B.y + 164, az.toFixed(2) + ' g', 20, ORANGE, 'left', 800);
    T(ix, B.y + 198, '좌석 수직항력', 13, '#5a6679', 'left', 800);
    T(ix, B.y + 224, eff('hideN') ? '?' : Math.round(N) + ' N', 20, RED, 'left', 800);
    ctx.restore();
    // 아래: 센서 그래프
    const gr = { x: PX, y: PY, w: PW, h: PH };
    const ax = axes(gr, { xmin: -12, xmax: 0, xstep: 3, xd: 0, ymin: 0, ymax: 2, ystep: 0.5, yd: 1, title: '스마트폰 연직 센서 (g)  ·  가로: 지금부터 이전 시간(s)', right: w.pause ? '⏸ 멈춤' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy - 4, ax.iw, ax.ih + 8); ctx.clip();
    ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(ax.ix, ax.gy(1)); ctx.lineTo(ax.ix + ax.iw, ax.gy(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    w.hist.forEach((q, i) => { const xx = ax.gx(q[0] - w.tAll), yy = ax.gy(q[1]); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke();
    D.sphere(ax.gx(0), ax.gy(az), 6, ORANGE, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    ctx.restore();
    T(ax.ix + 6, ax.gy(1) - 6, '1.0 g (정지)', 13, '#516079', 'left', 800);
    D.label(ax.ix + ax.iw - 4, clamp(ax.gy(az) - 18, ax.iy + 10, ax.iy + ax.ih - 10), az.toFixed(2) + ' g', { bg: ORANGE, size: 13, align: 'right', pad: 7 });
  }

  /* ----- 로터 ----- */
  const RO_H0 = 1.2, RO_HT = 4.6;
  function roStep(dt) {
    const r = S.ro, N = RO_M * r.w * r.w * RO_R, fmax = r.mu * N;
    r.ang += r.w * dt;
    const target = r.down ? 0 : RO_H0, spd = r.down ? 1.7 : 2.5;
    r.floorH += clamp(target - r.floorH, -spd * dt, spd * dt);
    if (r.fy > r.floorH + 1e-9) {
      const acc = G - fmax / RO_M;                        // 아래 방향 가속도 (마찰 포함)
      if (acc > 0 || r.vy > 0) { r.vy = Math.max(0, r.vy + acc * dt); r.fy -= r.vy * dt; }
    }
    if (r.fy <= r.floorH + 1e-9) { r.fy = r.floorH; r.vy = 0; }
    if (!r.down) r.st = Math.abs(r.fy - RO_H0) < 1e-6 && Math.abs(r.floorH - RO_H0) < 1e-6 ? 'idle' : 'raise';
    else if (r.fy <= 1e-6) r.st = 'down';
    else if (r.vy > 1e-6 || fmax < RO_M * G - 1e-9) r.st = 'slide';
    else r.st = 'stuck';
  }
  function roFloor() { const r = S.ro; r.down = !r.down; Sound.click(); updateCtl(); }
  function drawRotor(dt) {
    const B = sceneBox(), r = S.ro;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(B.x, B.y, B.w, B.h);
    const N = RO_M * r.w * r.w * RO_R, fmax = r.mu * N, W = RO_M * G;
    ctx.save(); D.roundRect(B.x, B.y, B.w, B.h, 10); ctx.clip();
    const sc = PHONE ? 46 : 54, cx = PHONE ? 112 : 220, top = B.y + 34, bot = top + RO_HT * sc, half = RO_R * sc;
    ctx.fillStyle = '#e9eef7'; ctx.fillRect(B.x, B.y, B.w, B.h);
    ctx.fillStyle = '#c9d3e4'; ctx.fillRect(B.x, bot + 8, B.w, B.y + B.h - bot - 8);
    // 원통 안쪽 (뒤쪽 벽): 줄무늬가 가로로 움직여 회전을 보여 줘요
    const inL = cx - half, inR = cx + half;
    ctx.save(); ctx.beginPath(); ctx.rect(inL, top, 2 * half, bot - top); ctx.clip();
    const bgc = ctx.createLinearGradient(inL, 0, inR, 0); bgc.addColorStop(0, '#9fb0cc'); bgc.addColorStop(0.5, '#cbd7ea'); bgc.addColorStop(1, '#9fb0cc'); ctx.fillStyle = bgc; ctx.fillRect(inL, top, 2 * half, bot - top);
    for (let k = -8; k < 12; k++) { const a = r.ang + k * (TAU / 14); const xx = cx + half * Math.sin(a); if (Math.cos(a) <= 0) continue; ctx.strokeStyle = 'rgba(60,80,120,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bot); ctx.stroke(); }
    // 바닥판
    const fyPx = bot - r.floorH * sc;
    ctx.fillStyle = '#6b7280'; ctx.fillRect(inL, fyPx, 2 * half, bot - fyPx + 2);
    ctx.fillStyle = '#4b5563'; ctx.fillRect(inL, fyPx, 2 * half, 4);
    ctx.restore();
    // 벽(두꺼운 선)
    ctx.fillStyle = '#56657f'; ctx.fillRect(inL - 14, top, 14, bot - top + 6); ctx.fillRect(inR, top, 14, bot - top + 6);
    ctx.fillStyle = '#56657f'; ctx.fillRect(inL - 14, bot, 2 * half + 28, 6);
    // 사람 두 명 (벽에 등을 대요)
    const yFeet = bot - r.fy * sc, ph = 1.7 * sc;
    person(inL + 12, yFeet, ph, '#3867f4', false); person(inR - 12, yFeet, ph, '#8b5cf6', true);
    // 힘 화살표 (왼쪽 사람): 수직항력(중심 쪽, 빨강), 마찰력(위, 초록), 중력(아래, 회색) — N: 1000 N = 20 px
    const hx = inL + 12, hy = yFeet - ph * 0.55;
    const nl = Math.min(N * 0.02, half - 22);
    D.arrow(hx + 8, hy, hx + 8 + nl, hy, { color: RED, width: 4, head: 11 });
    const fr = r.down && r.fy > 1e-6 ? Math.min(fmax, W) : 0;
    if (fr > 0) D.arrow(hx - 12, hy, hx - 12, hy - fr * 0.06, { color: GREEN, width: 4, head: 10 });
    D.arrow(hx - 12 + 4, hy, hx - 12 + 4, hy + W * 0.06, { color: '#6b7280', width: 4, head: 10 });
    T(hx + 8 + nl + 6, hy - 8, 'N', 14, RED, 'left', 800);
    T(B.x + 12, B.y + 22, '로터 (반지름 2.0 m)', 14, '#26324a', 'left', 800);
    const msg = r.st === 'idle' ? '바닥이 받치고 있어요' : r.st === 'raise' ? '바닥이 올라오는 중…' : r.st === 'stuck' ? '벽에 붙어 있어요! (마찰력이 몸무게를 받쳐요)' : r.st === 'slide' ? '미끄러져 내려와요!' : '바닥까지 미끄러졌어요';
    D.label(cx, top + 22, msg, { bg: r.st === 'stuck' ? GREEN : r.st === 'slide' || r.st === 'down' ? '#b91c1c' : 'rgba(30,41,59,.85)', size: 13.5, pad: 8 });
    // 오른쪽 정보 막대
    const ix = cx + half + 40, bw = B.x + B.w - ix - 14;
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(ix - 12, B.y, B.x + B.w - ix + 12, B.h);
    const bars = [['벽이 미는 힘 N = mω²r', N, RED], ['최대 마찰력 μN', fmax, '#3867f4'], ['몸무게 mg', W, '#6b7280']];
    bars.forEach((b, i) => {
      const yy = B.y + 34 + i * 62;
      T(ix, yy, b[0], 13, '#5a6679', 'left', 800); hbar(ix, yy + 8, bw, 14, b[1], 3600, b[2]); T(ix, yy + 40, Math.round(b[1]) + ' N', 15, '#26324a', 'left', 800);
    });
    const wmin = roMinW(r.mu);
    lines(ix, B.y + 34 + 3 * 62 + 4, 20, 13, [['떨어지지 않으려면 μN ≥ mg', '#26324a'], ['→ ω ≥ √(g/μr) = ' + wmin.toFixed(1) + ' rad/s', r.w >= wmin - 1e-9 ? '#14753f' : '#b91c1c']]);
    ctx.restore();
    // 아래: 위에서 본 모습과 설명
    panel(PX, PY, PW, PH, 16);
    const R2 = PHONE ? 50 : 72, tcx = PX + 16 + R2 + 14, tcy = PY + PH / 2 + 4, k = R2 / RO_R;
    ctx.strokeStyle = '#56657f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(tcx, tcy, R2 + 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#eef3fb'; ctx.beginPath(); ctx.arc(tcx, tcy, R2, 0, TAU); ctx.fill();
    const pa = r.ang, ppx = tcx + R2 * 0.88 * Math.cos(pa), ppy = tcy - R2 * 0.88 * Math.sin(pa);
    D.dashedLine(ppx, ppy, ppx - Math.sin(pa) * 44 * (PHONE ? 0.75 : 1), ppy - Math.cos(pa) * 44 * (PHONE ? 0.75 : 1), { color: '#9aa6bb', width: 2.5, dash: [4, 5] });
    D.arrow(ppx, ppy, ppx - Math.cos(pa) * Math.min(N * 0.02, R2 * 1.1), ppy + Math.sin(pa) * Math.min(N * 0.02, R2 * 1.1), { color: RED, width: 3.5, head: 9 });
    D.sphere(ppx, ppy, 7, '#3867f4', { gloss: true });
    T(tcx, tcy + 5, '위에서', 13, '#7b869a', 'center', 700);
    const tx0 = tcx + R2 + 22;
    if (!PHONE) lines(tx0, PY + 34, 27, 14, [
      ['실제로 사람에게 작용하는 수평 방향의 힘은', '#26324a'],
      ['중심 쪽으로 미는 벽의 수직항력 N 하나뿐이에요.', '#26324a'],
      ['몸이 바깥으로 밀리는 느낌은 직진하려는 관성이에요.', '#b45309'],
      ['(점선: 직진하려는 방향)', '#5a6679'],
      ['위쪽 마찰력 f ≤ μN 이 몸무게 mg를 받쳐요.', '#26324a'],
    ]);
    else lines(tx0, PY + 34, 24, 13, [
      ['수평 방향의 힘은 중심 쪽으로', '#26324a'],
      ['미는 벽의 수직항력 N 하나뿐!', '#26324a'],
      ['바깥으로 밀리는 느낌은', '#b45309'],
      ['직진하려는 관성이에요.', '#b45309'],
      ['(점선: 직진하려는 방향)', '#5a6679'],
      ['위쪽 마찰력 f ≤ μN 이', '#26324a'],
      ['몸무게 mg를 받쳐 줘요.', '#26324a'],
    ]);
  }

  /* ================= 포인터: 구심 가속도 화면에서 공을 끌어 위치 바꾸기 ================= */
  function dvAngleFrom(p) { const L = dvL(), pc = L.pic, cx = pc.x + pc.w / 2, cy = pc.y + pc.h / 2 + (PHONE ? 4 : 0); return Math.atan2(-(p.y - cy), p.x - cx); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'dv') return false;
      const L = dvL(), pc = L.pic;
      if (p.x < pc.x || p.x > pc.x + pc.w || p.y < pc.y || p.y > pc.y + pc.h) return false;
      S.dv.pause = true; S.dv.th = (dvAngleFrom(p) + TAU) % TAU; updateCtl(); return true;
    },
    move(p) { if (S.mode === 'dv') S.dv.th = (dvAngleFrom(p) + TAU) % TAU; },
    hover(p) { if (S.mode !== 'dv') return ''; const pc = dvL().pic; return p.x > pc.x && p.x < pc.x + pc.w && p.y > pc.y && p.y < pc.y + pc.h ? 'grab' : ''; },
  });

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  const lock = () => !!(game && !game.free);
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        const c = n.getAttribute('data-calc');
        if (c && !eff(c)) on = false;
        if (n.hasAttribute('data-swctl') && eff('lockW')) on = false;
        if (n.hasAttribute('data-whctl') && eff('lockV')) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const P = S.pk;
    $$('#phiSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.phi === P.phi));
    $('#oF').textContent = P.F + ' N'; setSl('sF', P.F, 2, 6);
    $('#bGo').textContent = P.run ? '⏸ 멈추기' : (P.started && !P.edge && !P.stopped ? '▶ 이어서' : '▶ 힘 주기');
    $('#pkNote').textContent = P.phi === 90 ? '힘이 늘 속도에 수직이에요 → 속력은 그대로, 방향만 바뀌어요.' : P.phi === 0 ? '힘이 속도와 같은 방향 → 속력만 커져요.' : P.phi === 180 ? '힘이 속도와 반대 방향 → 속력만 줄어요.' : '힘이 속도와 비스듬해요 → 속력도 방향도 변해요.';
    const d = S.dv;
    $('#oDv').textContent = d.v + ' m/s'; setSl('sDv', d.v, 1, 8);
    $('#oDr').textContent = d.r.toFixed(1) + ' m'; setSl('sDr', d.r, 2, 5);
    $('#oDt').textContent = d.dt.toFixed(2) + ' s'; setSl('sDt', d.dt, 0.05, 0.4);
    $('#bDvP').textContent = d.pause ? '▶ 다시 돌리기' : '⏸ 멈추고 보기';
    const b = S.bl;
    $$('#mSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.m === b.m));
    $('#oBr').textContent = b.r.toFixed(2) + ' m'; setSl('sBr', b.r, 0.5, 1.6);
    $('#oBv').textContent = b.v.toFixed(1) + ' m/s'; setSl('sBv', b.v, 1, 6);
    $('#bCut').textContent = b.cut ? '↺ 다시 매달기' : '✂ 줄 끊기';
    $('#bRec').disabled = b.cut;
    const r = S.rd;
    $$('#rdSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.mu === r.mu));
    $('#oRv').textContent = r.kmh + ' km/h'; setSl('sRv', r.kmh, 10, 100);
    $('#oSw').textContent = S.sw.w.toFixed(1) + ' rad/s'; setSl('sSw', S.sw.w, 0.5, 1.5);
    $('#oWv').textContent = S.wh.v.toFixed(1) + ' m/s'; setSl('sWv', S.wh.v, 3, 9);
    $('#bWp').textContent = S.wh.pause ? '▶ 다시 돌리기' : '⏸ 멈추고 보기';
    $('#oRw').textContent = S.ro.w.toFixed(1) + ' rad/s'; setSl('sRw', S.ro.w, 1, 6);
    $('#oRm').textContent = S.ro.mu.toFixed(2); setSl('sRm', S.ro.mu, 0.2, 0.8);
    $('#bFl').textContent = S.ro.down ? '⬆ 바닥 올리기' : '⬇ 바닥 내리기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#phiSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pk.phi = +b.dataset.phi; pkReset(); }));
  $('#sF').addEventListener('input', (e) => { S.pk.F = +e.target.value; pkReset(); });
  $('#bGo').addEventListener('click', () => {
    const P = S.pk; Sound.click();
    if (P.edge || P.stopped) { pkReset(); S.pk.started = true; S.pk.run = true; }
    else if (!P.started) { P.started = true; P.run = true; P.trail = [[P.x, P.y]]; }
    else P.run = !P.run;
    updateCtl();
  });
  $('#bRst').addEventListener('click', () => { Sound.click(); pkReset(); });
  $('#sDv').addEventListener('input', (e) => { S.dv.v = +e.target.value; updateCtl(); });
  $('#sDr').addEventListener('input', (e) => { S.dv.r = +e.target.value; updateCtl(); });
  $('#sDt').addEventListener('input', (e) => { S.dv.dt = +e.target.value; updateCtl(); });
  $('#bDvP').addEventListener('click', () => { Sound.click(); S.dv.pause = !S.dv.pause; updateCtl(); });
  $$('#mSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.bl.m = +x.dataset.m; updateCtl(); }));
  $('#sBr').addEventListener('input', (e) => { S.bl.r = +e.target.value; updateCtl(); });
  $('#sBv').addEventListener('input', (e) => { S.bl.v = +e.target.value; updateCtl(); });
  $('#bRec').addEventListener('click', blRecord);
  $('#bCut').addEventListener('click', blCut);
  $$('#rdSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.rd.mu = +x.dataset.mu; if (S.rd.skid) rdReset(); updateCtl(); }));
  $('#sRv').addEventListener('input', (e) => { S.rd.kmh = +e.target.value; updateCtl(); });
  $('#bRdR').addEventListener('click', () => { Sound.click(); rdReset(); });
  $('#sSw').addEventListener('input', (e) => { S.sw.w = +e.target.value; updateCtl(); });
  $('#sWv').addEventListener('input', (e) => { S.wh.v = +e.target.value; S.wh.hist = []; updateCtl(); });
  $('#bWp').addEventListener('click', () => { Sound.click(); S.wh.pause = !S.wh.pause; updateCtl(); });
  $('#sRw').addEventListener('input', (e) => { S.ro.w = +e.target.value; updateCtl(); });
  $('#sRm').addEventListener('input', (e) => { S.ro.mu = +e.target.value; updateCtl(); });
  $('#bFl').addEventListener('click', roFloor);
  ['iA', 'iA2', 'iKmh', 'iTh', 'iNb', 'iNt'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'puck') {
      const P = S.pk; L1 = '속력 v'; a = P.v.toFixed(1) + ' m/s'; L2 = '운동 방향 변화'; b = sgn(P.hd / RAD, 0) + '°'; L3 = '경과 시간 t'; c = P.t.toFixed(1) + ' s';
    } else if (S.mode === 'dv') {
      const d = S.dv, k = dvCalc(), h = eff('hideA');
      L1 = '구심 가속도 a = v²/r'; a = h ? '?' : k.a.toFixed(2) + ' m/s²'; L2 = '각속도 ω = v/r'; b = k.w.toFixed(2) + ' rad/s'; L3 = '주기 T = 2πr/v'; c = k.T.toFixed(2) + ' s';
    } else if (S.mode === 'ball') {
      const bl = S.bl; L1 = '장력 F = 구심력'; a = blF(bl).toFixed(1) + ' N'; L2 = '구심 가속도 a'; b = (bl.v * bl.v / bl.r).toFixed(1) + ' m/s²'; L3 = '주기 T'; c = (TAU * bl.r / bl.v).toFixed(2) + ' s';
    } else if (S.mode === 'road') {
      const r = S.rd, v = rdV(); L1 = '자동차 속력'; a = v.toFixed(1) + ' m/s'; L2 = '필요한 구심력'; b = (RD_M * v * v / RD_R / 1000).toFixed(1) + ' kN'; L3 = '상태'; c = r.skid ? '미끄러짐 ❌' : '도로를 따라 돌아요 ✅';
    } else if (S.mode === 'swing') {
      const w = S.sw, k = swing(w.w); L1 = '수평 가속도 a = ω²r'; a = k.a.toFixed(1) + ' m/s²'; L2 = '회전 반지름 r'; b = k.r.toFixed(1) + ' m'; L3 = '줄의 각도 θ'; c = eff('hideTh') ? '?' : (k.th / RAD).toFixed(1) + '°';
    } else if (S.mode === 'wheel') {
      const w = S.wh, az = whAz(w.v, w.psi); L1 = '센서(연직)'; a = az.toFixed(2) + ' g'; L2 = '좌석 수직항력 N'; b = eff('hideN') ? '?' : Math.round(WH_M * G * az) + ' N'; L3 = '구심 가속도'; c = (w.v * w.v / WH_R).toFixed(2) + ' m/s²';
    } else {
      const r = S.ro, N = RO_M * r.w * r.w * RO_R; L1 = '벽이 미는 힘 N'; a = Math.round(N) + ' N'; L2 = '최대 마찰력 μN'; b = Math.round(r.mu * N) + ' N'; L3 = '상태'; c = { idle: '바닥이 받쳐요', raise: '바닥이 올라와요', stuck: '붙어 있어요 ✅', slide: '미끄러져요 ❌', down: '바닥에 닿았어요' }[r.st] || '—';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  const clr = (...ids) => ids.forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); });
  const pkSeen = () => S.pk.seen;
  const dvOff = () => dvCalc().off;
  const FIG_CUT = '<svg viewBox="0 0 240 180" width="240" height="180" role="img" aria-label="위에서 본 원운동. 공이 오른쪽 점에서 반시계 방향으로 돌고 있고, 네 방향 화살표 A, B, C, D가 있어요." style="max-width:100%;height:auto">' +
    '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#e2464b"/></marker></defs>' +
    '<circle cx="90" cy="90" r="56" fill="none" stroke="#9aa6bb" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="90" cy="90" r="4" fill="#5a6679"/>' +
    '<line x1="90" y1="90" x2="146" y2="90" stroke="#8a6d3b" stroke-width="2.5"/><circle cx="146" cy="90" r="9" fill="#f26b3a"/>' +
    '<path d="M 130 52 A 60 60 0 0 1 150 66" fill="none" stroke="#3867f4" stroke-width="2.5"/><path d="M 150 66 l-8 0 l6 -7 z" fill="#3867f4"/><text x="104" y="40" font-size="13" fill="#3867f4" font-weight="800">반시계 방향</text>' +
    '<line x1="156" y1="90" x2="222" y2="90" stroke="#e2464b" stroke-width="3" marker-end="url(#ah)"/><text x="206" y="82" font-size="15" font-weight="800" fill="#26324a">A</text>' +
    '<line x1="146" y1="80" x2="146" y2="14" stroke="#e2464b" stroke-width="3" marker-end="url(#ah)"/><text x="154" y="26" font-size="15" font-weight="800" fill="#26324a">B</text>' +
    '<line x1="136" y1="90" x2="112" y2="90" stroke="#e2464b" stroke-width="3" marker-end="url(#ah)"/><text x="116" y="116" font-size="15" font-weight="800" fill="#26324a">C</text>' +
    '<line x1="154" y1="98" x2="204" y2="148" stroke="#e2464b" stroke-width="3" marker-end="url(#ah)"/><text x="206" y="162" font-size="15" font-weight="800" fill="#26324a">D</text></svg>';

  const levels = [
    {
      title: '힘과 방향: 퍽에 힘 주기', short: '힘과 방향', icon: '🧊', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 놀이기구가 빙글빙글 돌 때 몸이 느끼는 힘은 어떤 방향이고 얼마나 클까? 스마트폰 센서로 직접 재서 맞힐 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 속력이 일정해도 방향이 변하면 가속도 운동이고, 그때 가속도는 원의 중심 방향이라고 배웠어요. 앞 차시에서는 속도와 수직으로 힘을 받으면 경로가 휘어지는 것도 봤어요.</div>' +
        '<p>마찰 없는 판 위의 퍽(1 kg)이 3 m/s로 달려요. 힘을 <b>속도와 같은 방향 · 반대 방향 · 수직 · 비스듬하게</b> 가하며 속력과 운동 방향이 어떻게 변하는지 관찰해요. (힘은 늘 속도에 대해 같은 각도를 유지해요.)</p>',
      features: ['puck'],
      setup() { S.pk.seen = { so: false, dop: false, ci: false }; pkReset(); setScene('puck'); },
      recap: '힘이 속도와 나란하면 속력만, 수직이면 방향만 변해요. 힘을 늘 속도에 수직으로 유지하면 속력이 일정한 원운동이 돼요.',
      summary: '<ul><li>힘의 방향에 따라 운동이 달라져요: <b>속도와 같은 방향</b> → 속력만 증가, <b>반대 방향</b> → 속력만 감소(직선), <b>수직</b> → 속력은 그대로, 방향만 변함, <b>비스듬함</b> → 속력과 방향이 모두 변해요.</li><li>힘이 늘 속도에 수직이면 퍽은 <b>속력이 일정한 원운동</b>(등속 원운동)을 해요. 예: F = 3 N, m = 1 kg, v = 3 m/s → 반지름 3 m.</li><li>속력이 같아도 방향이 바뀌면 속도가 변하므로 <b>가속도 운동</b>이에요. 힘이 없으면 직선 운동을 계속해요.</li></ul>',
      missions: [
        {
          title: '속력만, 방향만, 그리고 원운동',
          goal: '힘을 가해 <b>① 속력만 변하는 경우</b>와 <b>② 방향만 변하는 경우</b>를 만들고, <b>③ 수직으로 힘을 유지해 한 바퀴</b> 돌려 보세요.',
          hint: '“같은 방향”이나 “반대 방향”을 고르고 ▶ 힘 주기, “수직”을 고르고 ▶ 힘 주기를 눌러요. 수직은 한 바퀴를 돌 때까지 기다려요(F가 클수록 빨라요).',
          setup() { S.pk.seen = { so: false, dop: false, ci: false }; pkReset(); setScene('puck'); },
          check: () => { const s = pkSeen(); return s.so && s.dop && s.ci; },
          hold: 0.5,
          status: () => { const s = pkSeen(); return mark(s.so) + ' 속력만 변함 &nbsp; ' + mark(s.dop) + ' 방향만 변함 &nbsp; ' + mark(s.ci) + ' 원운동 한 바퀴'; },
          explain: '힘이 속도와 <b>나란하면</b> 속력만 변하고(직선), 속도에 <b>수직이면</b> 속력은 그대로이고 방향만 변해요. 수직 힘을 계속 유지하면 퍽은 원 위를 도는데, F = 3 N, m = 1 kg, v = 3 m/s이면 반지름이 3 m인 원이에요.',
        },
        {
          type: 'quiz', title: '힘이 늘 속도에 수직일 때',
          goal: '힘이 퍽의 속도에 <b>늘 수직</b>이면 퍽의 속력은 어떻게 변할까요?',
          setup() { S.pk.phi = 90; pkReset(); setScene('puck'); },
          choices: ['힘이 계속 작용하니까 점점 빨라져요', '점점 느려져요', '일정해요. 운동 방향만 계속 바뀌어요', '처음에는 일정하다가 나중에 빨라져요'],
          answer: 2,
          feedback: ['힘이 있어도 속력이 커지려면 힘이 속도 방향 성분을 가져야 해요. 수직인 힘은 속도 방향으로 일을 하지 않아요.', '반대 방향 성분이 없으니 느려지지도 않아요.', '', '힘이 계속 수직으로 유지되면 속력은 끝까지 일정해요. (힘의 방향이 고정되어 있으면 이야기가 달라져요.)'],
          explain: '속도에 수직인 힘은 속력을 바꾸지 못하고 <b>방향만</b> 바꿔요. 그래서 힘이 늘 수직이면 속력이 일정한 <b>등속 원운동</b>이 돼요.',
        },
      ],
    },
    {
      title: '구심 가속도: Δv 작도', short: '구심 가속도', icon: '📐', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수직 힘이 속력은 그대로 두고 방향만 바꿔 원운동을 만든다는 것을 봤어요. 그때의 <b>가속도는 얼마일까요?</b> 속도 화살표 두 개의 차이 Δv를 그려서 구해요.</div>' +
        '<p>등속 원운동 중인 공의 <b>속도 v</b>와 아주 짧은 시간 Δt 뒤의 <b>속도 v′</b>를 한 점에 모아 Δv = v′ − v를 그려 봐요. 가속도는 a = Δv / Δt예요. Δt를 줄이면 Δv의 방향이 어디를 향할까요?</p>',
      features: ['dv'],
      setup() { const d = S.dv; d.v = 4; d.r = 2; d.dt = 0.3; d.pause = false; d.dth = d.v / d.r * d.dt; setFlag('hideA', false); setFlag('aIn', false); setScene('dv'); },
      recap: '등속 원운동의 가속도는 크기가 a = v² / r = rω²이고 방향은 늘 원의 중심이에요. 속도(접선)와 가속도(중심)는 수직이에요.',
      summary: '<ul><li>속도 화살표 v와 v′를 한 점에 모아 <b>Δv = v′ − v</b>를 그리면, Δt가 짧아질수록 Δv는 <b>원의 중심 방향</b>을 가리켜요.</li><li>두 순간 사이 각 Δθ = ωΔt이면 |Δv| = 2v·sin(Δθ/2) ≈ vΔθ = vωΔt → <b>a = Δv/Δt = vω = v²/r = rω²</b> (ω = v/r = 2π/T).</li><li>v = 4 m/s, r = 2 m: ω = 2 rad/s, T = 3.14 s, <b>a = 8 m/s²</b>. r를 그대로 두고 v가 2배(8 m/s)면 a는 <b>4배(32 m/s²)</b>예요.</li><li>속도는 접선 방향, 가속도는 중심 방향이고 둘은 서로 수직이에요.</li></ul>',
      missions: [
        {
          title: 'Δt를 줄여 Δv의 방향 찾기',
          goal: 'v = 4 m/s, r = 2 m에서 <b>Δt를 줄여</b> Δv가 중심 방향에서 벗어난 각이 <b>3° 이하</b>가 되게 하세요.',
          hint: 'Δt 슬라이더를 왼쪽 끝(0.05 s) 쪽으로 옮겨요. 오른쪽 그림에서 빨간 Δv 화살표가 초록 점선(중심 방향)에 가까워져요.',
          setup() { const d = S.dv; d.v = 4; d.r = 2; d.dt = 0.4; d.pause = false; setFlag('hideA', false); setFlag('aIn', false); setScene('dv'); },
          check: () => S.dv.v === 4 && S.dv.r === 2 && dvOff() <= 3 + 1e-9,
          hold: 0.8,
          status: () => 'v = 4 · r = 2 ' + mark(S.dv.v === 4 && S.dv.r === 2) + ' &nbsp; 어긋난 각 ' + dvOff().toFixed(1) + '° ' + mark(dvOff() <= 3 + 1e-9),
          explain: 'Δv가 중심 방향에서 벗어난 각은 <b>Δθ/2</b>예요. Δt → 0 이면 Δθ → 0이므로 Δv는 정확히 <b>원의 중심</b>을 가리켜요. 그래서 등속 원운동의 가속도는 늘 중심 방향이에요.',
        },
        {
          title: '구심 가속도 a = v² / r 계산하기', manual: true,
          goal: 'r = 2 m로 두고 <b>v = 4 m/s</b>와 <b>v = 8 m/s</b>일 때의 구심 가속도 a를 구해 입력하세요.',
          hint: 'a = v² ÷ r 이에요. 4² ÷ 2 = 8, 그러면 v가 2배일 때는? (a = r ω², ω = v ÷ r 로도 구할 수 있어요.)',
          setup() { const d = S.dv; d.v = 4; d.r = 2; d.dt = 0.1; d.pause = false; clr('iA', 'iA2'); setFlag('hideA', true); setFlag('aIn', true); setScene('dv'); },
          check() {
            const a = num('iA'), b = num('iA2');
            if (a == null || b == null) return '두 칸에 모두 숫자를 입력해 주세요.';
            const okA = Math.abs(a - 8) <= 0.2, okB = Math.abs(b - 32) <= 0.5;
            fb([[$('#iA'), okA], [$('#iA2'), okB]]);
            if (!okA) { if (Math.abs(a - 16) <= 0.3) return 'v²만 계산했어요. 반지름 r로 나누는 것을 잊지 말아요: a = v² ÷ r.'; if (Math.abs(a - 2) <= 0.2) return 'v ÷ r = 2는 각속도 ω (rad/s)예요. a = v × ω = v² ÷ r 이에요.'; return 'a = v² ÷ r 에 v = 4 m/s, r = 2 m를 넣어 보세요.'; }
            if (!okB) return Math.abs(b - 16) <= 0.5 ? 'v가 2배이면 a는 2배가 아니라 v²에 비례해요.' : 'v = 8 m/s를 넣어 a = v² ÷ r 을 다시 계산해 보세요. (v가 2배가 되면 a는 몇 배일까요?)';
            return true;
          },
          status: () => 'a(4 m/s) ' + ($('#iA').value.trim() || '—') + ' · a(8 m/s) ' + ($('#iA2').value.trim() || '—'),
          explain: 'a = v² ÷ r = 4² ÷ 2 = <b>8 m/s²</b> (ω = v ÷ r = 2 rad/s, a = rω² = 2 × 2² = 8, T = 2πr ÷ v = 3.14 s). v를 8 m/s로 2배 하면 a = 8² ÷ 2 = <b>32 m/s²</b>로 <b>4배</b>가 돼요. a는 v²에 비례하기 때문이에요.',
        },
        {
          type: 'quiz', title: '속도와 가속도의 방향',
          goal: '등속 원운동을 하는 공의 <b>속도와 가속도</b>의 방향은?',
          setup() { setFlag('hideA', false); setFlag('aIn', false); setScene('dv'); },
          choices: ['속도는 접선 방향, 가속도는 중심 방향이고, 둘은 서로 수직이에요', '속도와 가속도 모두 접선 방향이에요', '속도는 접선 방향이고, 속력이 일정하니까 가속도는 0이에요', '속도는 중심 방향, 가속도는 접선 방향이에요'],
          answer: 0,
          feedback: ['', '접선 방향 가속도는 속력을 바꿔요. 속력이 일정한 원운동에서는 접선 방향 가속도가 없어요.', '속력이 일정해도 방향이 변하면 속도가 변하므로 가속도가 있어요. (Δv가 0이 아니에요)', '반대로 생각했어요. 공은 접선 방향으로 움직이고, 가속도(힘)가 중심을 향해요.'],
          explain: '속도는 늘 <b>접선 방향</b>, 가속도는 늘 <b>중심 방향</b>이고 둘은 수직이에요. 중심 방향 가속도는 속도의 방향만 바꾸고 속력은 바꾸지 못해요.',
        },
      ],
    },
    {
      title: '구심력: 줄의 장력과 마찰력', short: '구심력', icon: '🧵', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 등속 원운동에는 중심 방향 가속도 a = v²/r이 있다는 것을 알았어요. 뉴턴 제2법칙으로 보면 <b>그 방향으로 알짜힘이 필요</b>해요. 이 힘을 <b>구심력 F = mv²/r</b>이라고 불러요.</div>' +
        '<p>구심력은 새로운 종류의 힘이 아니라 <b>장력 · 마찰력 · 수직항력 · 중력</b> 등의 합력이에요. 줄에 매단 공에서는 줄의 장력, 커브 도로에서는 타이어와 도로 사이의 마찰력이 구심력이에요.</p>',
      features: ['ball', 'road'],
      setup() { setFlag('hideLim', false); setFlag('kmhIn', false); setScene('ball'); },
      recap: '구심력은 F = mv²/r로, 줄에서는 장력이고 도로에서는 마찰력이에요. 힘이 사라지면 물체는 접선 방향으로 직진해요.',
      summary: '<ul><li><b>구심력 F = ma = mv²/r = mrω²</b> (방향: 원의 중심). 새로운 힘이 아니라 장력·마찰력·수직항력·중력 등의 <b>합력</b>이에요.</li><li>줄에 매단 공(m = 0.50 kg, r = 0.80 m): v = 4 m/s → <b>F = 10 N</b>. v가 2배(8 m/s)면 F는 <b>4배(40 N)</b>, r가 2배(1.6 m)면 <b>½배(5 N)</b>, m이 2배면 <b>2배</b>. F–v² 그래프는 원점을 지나는 직선(기울기 m/r)이에요.</li><li>줄이 끊어지면 구심력이 사라져 공은 <b>원의 접선 방향으로 직진</b>해요. (바깥쪽 방향이 아니에요.)</li><li>커브 도로(r = 50 m): 마찰력이 구심력이라 mv²/r = μmg → <b>한계 속력 v = √(μgr)</b>. 마른 도로(μ = 0.8) 20 m/s(72 km/h), 젖은 도로(μ = 0.4) 14.1 m/s(51 km/h), 눈길(μ = 0.1) 7.1 m/s(25 km/h). 질량과 관계없어요.</li></ul>',
      missions: [
        {
          title: '장력 센서로 F–v² 직선 만들기',
          goal: '공의 <b>질량 m과 반지름 r는 그대로</b> 두고, 속력 v를 바꿔 <b>서로 다른 v로 세 번</b> 📏 장력 기록을 눌러 보세요.',
          hint: '예: m = 0.50 kg, r = 0.80 m에서 v = 2, 4, 6 m/s. 속력 슬라이더를 옮기고 📏 장력 기록을 눌러요. 점이 모이면 직선이 나타나요.',
          setup() { const b = S.bl; b.m = 0.5; b.r = 0.8; b.v = 4; b.cut = false; b.trail = []; b.rec = []; setScene('ball'); },
          check: () => blBest() >= 3,
          hold: 0.6,
          status: () => '같은 m, r에서 기록한 서로 다른 v: ' + Math.min(3, blBest()) + ' / 3',
          explain: 'F = mv²/r이므로 F는 <b>v²에 비례</b>해요. m = 0.50 kg, r = 0.80 m이면 v = 2 m/s에서 2.5 N, 4 m/s에서 10 N, 6 m/s에서 22.5 N. 점들이 원점을 지나는 직선(기울기 m/r = 0.625 kg/m)에 놓여요. v가 2배가 되면 F는 4배예요.',
        },
        {
          title: '젖은 도로의 한계 속력', manual: true,
          goal: '반지름 50 m인 커브에서 <b>마찰력이 구심력</b>이에요. <b>젖은 도로(μ = 0.4)</b>의 한계 속력을 km/h로 구해 입력하세요. (g = 10 m/s²)',
          hint: 'μmg = mv²/r 에서 v = √(μgr) = √(0.4 × 10 × 50). m/s를 km/h로 바꾸려면 3.6을 곱해요.',
          setup() { S.rd.mu = 0.4; S.rd.kmh = 36; rdReset(); clr('iKmh'); setFlag('hideLim', true); setFlag('kmhIn', true); setScene('road'); },
          check() {
            const x = num('iKmh');
            if (x == null) return '숫자를 입력해 주세요.';
            const ok = Math.abs(x - 50.9) <= 1.6; fb([[$('#iKmh'), ok]]);
            if (ok) return true;
            if (Math.abs(x - 14.1) <= 0.6) return 'm/s로 구했어요. km/h로 바꾸려면 3.6을 곱해요.';
            if (Math.abs(x - 200) <= 5) return 'v²의 값이에요. 제곱근을 취해야 속력이 돼요.';
            return 'v = √(μ × g × r) = √(0.4 × 10 × 50) m/s를 먼저 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iKmh').value.trim() || '—') + ' km/h',
          explain: 'mv²/r = μmg → v = √(μgr) = √(0.4 × 10 × 50) = √200 = <b>14.1 m/s ≈ 51 km/h</b>. 마른 도로(μ = 0.8)는 72 km/h, 눈길(μ = 0.1)은 25 km/h예요. 이 속력보다 빠르면 마찰력이 모자라 접선 방향으로 미끄러져요. 질량은 식에서 약분돼요.',
        },
        {
          type: 'quiz', title: '줄을 끊으면 공은 어디로?',
          goal: '반시계 방향으로 돌던 공의 줄이 <b>그림의 위치에서 끊어졌어요</b>. 공은 어느 방향으로 날아갈까요?', figure: FIG_CUT,
          setup() { S.bl.cut = false; S.bl.trail = []; setScene('ball'); },
          choices: ['A: 원의 바깥쪽(중심에서 멀어지는 방향)으로 날아가요', 'B: 원에 접하는 방향(접선)으로 똑바로 날아가요', 'C: 중심 쪽으로 날아가요', 'D: 비스듬히 바깥쪽 아래로 휘어서 날아가요'],
          answer: 1,
          feedback: ['공이 바깥쪽으로 밀려 나가는 힘은 없어요. 구심력이 사라지면 힘이 0이므로 순간 속도(접선) 그대로 직진해요.', '', '구심력이 사라졌는데 중심 쪽으로 가속될 이유가 없어요.', '힘이 없으면 휘어지지 않아요. 관성의 법칙에 따라 직선 운동을 해요.'],
          explain: '줄이 끊어지면 구심력이 0이 돼서 공은 끊어진 순간의 속도, 즉 <b>접선 방향으로 등속 직선 운동</b>을 해요(관성). 바깥쪽으로 밀려 나가는 것처럼 보이지만 그런 힘은 없어요. ✂ 줄 끊기로 직접 확인해 봐요.',
        },
      ],
    },
    {
      title: '놀이기구: 센서로 분석하기', short: '놀이기구', icon: '🎡', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구심력 F = mv²/r이 장력이나 마찰력 같은 실제 힘의 합력이라는 것을 알았어요. 이제 놀이기구에서 스마트폰 가속도 센서가 재는 값을 <b>식으로 예측</b>해 봐요.</div>' +
        '<p>🎠 회전 그네의 줄 각도, 🎡 관람차 최저점·최고점의 좌석 힘, 🌀 로터에서 바닥이 빠져도 떨어지지 않는 조건을 분석해요. 몸이 바깥으로 밀리는 느낌은 새로운 힘이 아니라 <b>직진하려는 관성</b>이에요.</p>',
      features: ['swing', 'wheel', 'rotor'],
      setup() { setFlag('hideTh', false); setFlag('hideN', false); setFlag('thIn', false); setFlag('nIn', false); setFlag('lockW', false); setFlag('lockV', false); setScene('swing'); },
      recap: '놀이기구의 수평 원운동은 tanθ = a/g, 수직 원운동은 N = m(g ± a)로 분석해요. 실제 힘은 중심 방향의 합력뿐이에요.',
      summary: '<ul><li><b>회전 그네</b> (ω = 1.0 rad/s, r = 5.0 m): a = ω²r = 5.0 m/s², 줄에 작용하는 장력의 수평 성분이 구심력 → <b>tanθ = a/g = 0.5, θ = 26.6°</b>. 스마트폰 센서: 수평 5.0 + 수직 10 → 합 11.2 m/s²(1.1 g), 방향은 줄과 같아요.</li><li><b>관람차</b> (r = 10 m, v = 5 m/s): a = v²/r = 2.5 m/s². 사람(500 N)의 좌석 수직항력 <b>최저점 N = m(g + a) = 625 N(1.25 g)</b>, <b>최고점 N = m(g − a) = 375 N(0.75 g)</b>. 속력이 일정해도 위치에 따라 힘이 달라요.</li><li><b>로터</b> (r = 2.0 m): 벽의 수직항력 N = mω²r이 구심력, 마찰력 f ≤ μN이 몸무게 mg를 받쳐요 → <b>ω ≥ √(g/μr)</b>. μ = 0.4면 약 3.5 rad/s, μ = 0.2면 5.0 rad/s.</li><li>몸이 바깥으로 밀리는 느낌은 <b>관성</b> 때문이고, 실제 힘은 중심 방향의 합력 하나뿐이에요.</li></ul>',
      missions: [
        {
          title: '회전 그네의 줄 각도 예측', manual: true,
          goal: '회전 그네가 ω = 1.0 rad/s, 반지름 r = 5.0 m로 돌아요. 센서 값(수평·수직)으로 <b>줄이 수직과 이루는 각 θ</b>를 예측해 입력하세요.',
          hint: '센서: 수평 a = ω²r = 5.0 m/s², 수직 g = 10 m/s². 장력의 수직 성분은 mg, 수평 성분은 ma이므로 tanθ = a ÷ g 예요.',
          setup() { S.sw.w = 1.0; clr('iTh'); setFlag('lockW', true); setFlag('hideTh', true); setFlag('thIn', true); setScene('swing'); },
          check() {
            const x = num('iTh');
            if (x == null) return '각도를 숫자(도)로 입력해 주세요.';
            const ok = Math.abs(x - 26.6) <= 1.6; fb([[$('#iTh'), ok]]);
            if (ok) return true;
            if (Math.abs(x - 63.4) <= 1.6) return 'tanθ = a ÷ g 인데 g ÷ a로 계산한 것 같아요. 수평 성분 ÷ 수직 성분이에요.';
            if (Math.abs(x - 0.5) <= 0.05) return 'tanθ = 0.5예요. 이 값이 되는 각도 θ를 구해야 해요 (θ = tan⁻¹ 0.5).';
            return 'tanθ = a ÷ g = 5.0 ÷ 10 = 0.5 에서 θ를 구해 보세요.';
          },
          status: () => '입력 ' + ($('#iTh').value.trim() || '—') + '°',
          explain: '구심 가속도 a = ω²r = 1.0² × 5.0 = <b>5.0 m/s²</b>. 장력 T의 수직 성분은 mg, 수평 성분은 ma이므로 tanθ = a ÷ g = 0.5 → <b>θ = 26.6° ≈ 27°</b>. 스마트폰 센서의 합 √(5.0² + 10²) = 11.2 m/s²(1.1 g)는 줄 방향을 가리켜요.',
        },
        {
          title: '관람차 최저점·최고점의 좌석 힘', manual: true,
          goal: '반지름 10 m 관람차가 v = 5 m/s로 돌 때, 몸무게 500 N인 사람이 받는 <b>최저점과 최고점의 좌석 수직항력 N</b>을 계산해 입력하세요.',
          hint: '구심 가속도 a = v² ÷ r = 2.5 m/s²는 늘 중심(위쪽 또는 아래쪽)을 향해요. 최저점에서는 N − mg = ma, 최고점에서는 mg − N = ma예요. 센서 그래프의 1.25 g, 0.75 g와 비교해 봐요.',
          setup() { S.wh.v = 5; S.wh.hist = []; clr('iNb', 'iNt'); setFlag('lockV', true); setFlag('hideN', true); setFlag('nIn', true); setScene('wheel'); },
          check() {
            const b = num('iNb'), t = num('iNt');
            if (b == null || t == null) return '두 칸에 모두 숫자를 입력해 주세요.';
            const okB = Math.abs(b - 625) <= 8, okT = Math.abs(t - 375) <= 8; fb([[$('#iNb'), okB], [$('#iNt'), okT]]);
            if (Math.abs(b - 375) <= 8 && Math.abs(t - 625) <= 8) return '최저점과 최고점이 바뀌었어요. 최저점에서는 중심(위쪽)을 향해 가속하므로 좌석이 몸무게보다 더 크게 떠받쳐야 해요.';
            if (!okB) return Math.abs(b - 500) <= 8 ? '최저점에서는 구심력이 필요해서 N이 몸무게(500 N)보다 커요: N = m(g + a).' : '최저점: N = m(g + a), m = 50 kg, a = 2.5 m/s²를 넣어 보세요.';
            if (!okT) return Math.abs(t - 500) <= 8 ? '최고점에서는 중력의 일부가 구심력이 돼서 N이 몸무게보다 작아요: N = m(g − a).' : '최고점: N = m(g − a), m = 50 kg, a = 2.5 m/s²를 넣어 보세요.';
            return true;
          },
          status: () => '최저점 ' + ($('#iNb').value.trim() || '—') + ' N · 최고점 ' + ($('#iNt').value.trim() || '—') + ' N',
          explain: 'a = v² ÷ r = 5² ÷ 10 = <b>2.5 m/s²</b>. 최저점: N = m(g + a) = 50 × 12.5 = <b>625 N (1.25 g)</b>, 최고점: N = m(g − a) = 50 × 7.5 = <b>375 N (0.75 g)</b>. 센서 그래프가 0.75 g ~ 1.25 g를 오르내리는 것과 같아요. 최고점에서 몸이 가볍게 느껴지는 것은 좌석이 떠받치는 힘이 줄었기 때문이에요.',
        },
        {
          type: 'quiz', title: '로터에서 옷이 미끄러우면',
          goal: '로터가 ω = 3.6 rad/s로 돌고 바닥이 내려가도 μ = 0.4인 옷은 벽에 붙어 있어요. <b>μ = 0.2</b>인 미끄러운 옷이라면 같은 ω에서 어떻게 될까요?',
          setup() { const r = S.ro; r.w = 3.6; r.mu = 0.4; r.down = false; setScene('rotor'); },
          choices: ['그대로 붙어 있어요. 벽이 미는 힘 N은 μ와 관계없으니까요', '미끄러져 내려와요. 최대 마찰력 μN이 몸무게 mg보다 작아지기 때문이에요 (붙으려면 ω ≥ 5.0 rad/s)', '바깥쪽으로 날아가요. 원심력이 작용하니까요', '더 느리게 돌아야 붙어 있어요'],
          answer: 1,
          feedback: ['N은 그대로지만 마찰력의 최댓값 μN이 절반이 돼요. 이 값이 몸무게보다 작으면 몸을 받치지 못해요.', '', '사람에게 작용하는 수평 방향의 힘은 중심 방향의 수직항력 하나뿐이에요. 바깥으로 밀리는 느낌은 직진하려는 관성이에요.', 'ω가 작으면 벽이 미는 힘 N = mω²r가 작아져서 마찰력이 더 줄어들어요. 붙어 있으려면 더 빨리 돌아야 해요.'],
          explain: '붙어 있을 조건은 μN = μmω²r ≥ mg, 즉 <b>ω ≥ √(g ÷ μr)</b>예요. μ = 0.4이면 3.5 rad/s, μ = 0.2이면 √(10 ÷ 0.4) = <b>5.0 rad/s</b>이므로 ω = 3.6 rad/s에서는 미끄러져 내려와요. 로터를 직접 돌려 확인해 봐요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-circular-motion', mount: '#game', badge: '구심력 박사', homeHref: '../../index.html#hm',
    featureLabels: { puck: '🧊 퍽에 힘 주기 · 속력·방향 변화', dv: '📐 Δv 작도 · 구심 가속도 식', ball: '🧵 줄의 장력 · F–v² 그래프 · 커브 도로', swing: '🎠 회전 그네', wheel: '🎡 관람차 센서 그래프', rotor: '🌀 로터' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('puck');
  rdReset();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    pkStep(dt); blStep(dt); rdStep(dt); whStep(dt); roStep(dt);
    switch (S.mode) {
      case 'puck': drawPuck(dt); break;
      case 'dv': drawDv(dt); break;
      case 'ball': drawBall(dt); break;
      case 'road': drawRoad(dt); break;
      case 'swing': drawSwing(dt); break;
      case 'wheel': drawWheel(dt); break;
      default: drawRotor(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, pkReset, blRecord, blCut, rdReset, roFloor, dvCalc, swing, swingTheta, whAz, roMinW, rdVmax, blBest,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { pkStep(0.02); blStep(0.02); rdStep(0.02); whStep(0.02); roStep(0.02); } },
  };
})();
