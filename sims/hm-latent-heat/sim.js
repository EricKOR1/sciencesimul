/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 비열과 잠열 (2차시)
   성취기준 [12역학02-02] 열에 의한 물질의 상태 변화를 이해하고, 이상 기체의 온도, 압력, 부피의 관계를 설명할 수 있다. (앞부분: 비열·잠열)
   ① 실험: 비열 (같은 열, 네 물질, c = Q/(mΔT))
   ② 실험: 잠열 (얼음 0.10 kg 가열 곡선, 입자 돋보기, L_f)
   ③ 분석: 열량 계산 (Q = cmΔT, Q = mL 구간별 합산)
   ④ 적용: 열평형(열량계)과 보냉 팩 설계
   열화학 반응식·엔탈피, 상평형 도표, 증기압 곡선, 이상 기체의 몰비열은 다루지 않아요.
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
  const TAU = Math.PI * 2;
  const MINUS = '−';
  const BG = '#eef2fa';
  const INK = '#26324a', MUTED = '#5a6679';
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';

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
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  const topCard = () => ({ x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 });
  const fN = (v) => Math.round(v).toLocaleString('en-US');
  const f1 = (x) => { const r = Math.round(x * 10) / 10; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(1); };
  const sgn = (v) => (v < 0 ? MINUS : '') + Math.abs(v);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function hbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * w;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, f, h); ctx.restore(); }
  }
  /* 쌓아 올린 가로 막대: segs = [[값, 색], ...] */
  function stackBar(x, y, w, h, segs, max) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip();
    let cx = x;
    segs.forEach((s) => { const sw = clamp(s[0] / max, 0, 1) * w; if (sw > 0.01) { ctx.fillStyle = s[1]; ctx.fillRect(cx, y, sw, h); } cx += sw; });
    ctx.restore();
  }
  function axes(rc, o) {
    const ml = PHONE ? 40 : 46, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9 || Math.abs(yv) < 1e-9;
      ctx.strokeStyle = z ? '#8a95a8' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, sgn(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, INK, 'left', 800);
    if (o.xl) T(rc.x + rc.w - 8, rc.y + 21, o.xl, 13, MUTED, 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  function bgGrad(c, a, b) {
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  /* 열 색 (차가움 → 뜨거움) */
  const HEAT = [[0, [43, 83, 230]], [0.25, [40, 190, 230]], [0.5, [60, 200, 90]], [0.75, [250, 210, 40]], [1, [235, 50, 40]]];
  function heatColor(f, a) {
    f = clamp(f, 0, 1); let i = 0; while (i < HEAT.length - 2 && f > HEAT[i + 1][0]) i++;
    const p = HEAT[i], q = HEAT[i + 1], u = (f - p[0]) / (q[0] - p[0]);
    return 'rgba(' + Math.round(p[1][0] + (q[1][0] - p[1][0]) * u) + ',' + Math.round(p[1][1] + (q[1][1] - p[1][1]) * u) + ',' + Math.round(p[1][2] + (q[1][2] - p[1][2]) * u) + ',' + (a == null ? 1 : a) + ')';
  }
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, ''); return v === '' || !isFinite(+v) ? null : +v; };

  /* ================= 자료 ================= */
  const P_H = 500;                                   // 히터 (W)
  const C_ICE = 2100, C_W = 4200, LF = 334000, LV = 2260000;
  const SUB = [
    { n: '물', c: 4200, col: '#7cc4ff' },
    { n: '식용유', c: 2000, col: '#f2c14e' },
    { n: '모래', c: 800, col: '#d7b76b' },
    { n: '철', c: 450, col: '#8a96a8' },
  ];
  const M_SP = 0.20, T_ROOM = 20, SP_SEC = 20;
  const dTfull = (i) => P_H * SP_SEC / (M_SP * SUB[i].c);   // 20초 가열 뒤 온도 상승 (°C)
  // 가열 곡선 (얼음 0.10 kg, −20 °C, 500 W)
  const M_CU = 0.10;
  const Q1 = M_CU * C_ICE * 20, Q2 = M_CU * LF, Q3 = M_CU * C_W * 100, Q4 = M_CU * LV;
  const QT = Q1 + Q2 + Q3 + Q4;
  const T1 = Q1 / P_H, T2 = (Q1 + Q2) / P_H, T3 = (Q1 + Q2 + Q3) / P_H, T4 = QT / P_H;      // 8.4, 75.2, 159.2, 611.2 s
  function cuAt(t) {
    const Q = clamp(P_H * t, 0, QT);
    let Tc, ph, fm = 0, fv = 0;
    if (Q < Q1) { Tc = -20 + Q / (M_CU * C_ICE); ph = 0; }
    else if (Q < Q1 + Q2) { Tc = 0; ph = 1; fm = (Q - Q1) / Q2; }
    else if (Q < Q1 + Q2 + Q3) { Tc = (Q - Q1 - Q2) / (M_CU * C_W); ph = 2; fm = 1; }
    else if (Q < QT - 1e-9) { Tc = 100; ph = 3; fm = 1; fv = (Q - Q1 - Q2 - Q3) / Q4; }
    else { Tc = 100; ph = 4; fm = 1; fv = 1; }
    const Ql = fm * Q2 + fv * Q4;
    return { Q, T: Tc, ph, fm, fv, Ql, Qt: Q - Ql };
  }
  const PHCOL = ['#38bdf8', '#7c3aed', '#f59e0b', '#ef4444'];
  // 열평형 (열량계)
  const M_WATER = 0.20;
  function mixCalc(mi, Tw) {
    const avail = M_WATER * C_W * Tw, need = mi * LF;
    if (avail >= need) { const Tf = (M_WATER * C_W * Tw - need) / ((M_WATER + mi) * C_W); return { Tf, melted: 1, Qtot: M_WATER * C_W * (Tw - Tf), all: true }; }
    return { Tf: 0, melted: avail / need, Qtot: avail, all: false };
  }
  // 보냉 팩 (도시락) : 상자 속 C_B, 바깥과 K, 팩과 G
  const PK = [
    { n: '물 (5 °C)', short: '물', T0: 5, c: 4200 },
    { n: '얼음 (0 °C)', short: '얼음', Tm: 0, L: 334000, cs: 2100, cl: 4200 },
    { n: '소금물 얼음 (−10 °C)', short: '소금물 얼음', Tm: -10, L: 250000, cs: 2000, cl: 3800 },
  ];
  const C_B = 1500, K_LEAK = 0.6, G_PK = 6, T_OUT = 30, T_B0 = 5, PK_END = 14400, PK_DT = 2;
  function pkTemp(mat, m, H) {
    if (mat.Tm == null) return mat.T0 + H / (m * mat.c);
    if (H <= 0) return mat.Tm + H / (m * mat.cs);
    if (H <= m * mat.L) return mat.Tm;
    return mat.Tm + (H - m * mat.L) / (m * mat.cl);
  }
  function pkRun(mi, m) {
    const mat = PK[mi]; let Tb = T_B0, H = 0, mx = Tb, mn = Tb;
    const tb = [], tp = [], melt = [], qs = []; let nextS = 0;
    for (let t = 0; t <= PK_END + 1e-9; t += PK_DT) {
      const Tp = pkTemp(mat, m, H), qp = G_PK * (Tb - Tp);
      if (t >= nextS - 1e-9) { tb.push(Tb); tp.push(Tp); melt.push(mat.Tm == null ? 0 : clamp(H / (m * mat.L), 0, 1)); qs.push(qp); nextS += 60; }
      Tb += (K_LEAK * (T_OUT - Tb) - qp) / C_B * PK_DT; H += qp * PK_DT;
      mx = Math.max(mx, Tb); mn = Math.min(mn, Tb);
    }
    const mxr = Math.round(mx * 10) / 10, mnr = Math.round(mn * 10) / 10;
    return { tb, tp, melt, qs, max: mxr, min: mnr, ok: mxr <= 10 && mnr >= 0, hot: mxr > 10, cold: mnr < 0 };
  }

  /* ================= 상태 ================= */
  const S = {
    mode: 'spec', clock: 0, fade: 0,
    sp: { sel: 0, run: false, t: 0, done: [false, false, false, false], dT: [0, 0, 0, 0] },
    cu: { run: false, t: 0, done: false, spd: 45, label: 0 },
    cl: { m: 0.1 },
    mx: { mi: 0.05, Tw: 30, run: false, u: 0, done: false, ranOk: false, fbShown: false },
    pk: { mat: 1, m: 0.5, run: false, t: 0, done: false, res: null },
    flags: { iron: false, lf: false, seg: false, tv: false, cal: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const lockedBy = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['spec', 'curve', 'calc', 'mix', 'pack'];
  const ALLOWED = [['spec'], ['curve'], ['calc'], ['mix', 'pack']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= ① 비열 ================= */
  function spReset() { const s = S.sp; s.run = false; s.t = 0; s.done = [false, false, false, false]; s.dT = [0, 0, 0, 0]; parts.clear(); updateCtl(); }
  function spFill() { const s = S.sp; s.run = false; s.t = 0; s.done = [true, true, true, true]; s.dT = [0, 1, 2, 3].map(dTfull); updateCtl(); }
  function spRun() {
    const s = S.sp; if (s.run) return;
    s.run = true; s.t = 0; s.done[s.sel] = false; s.dT[s.sel] = 0; Sound.click(); updateCtl();
  }
  function spStep(dt) {
    const s = S.sp; if (!s.run) return;
    s.t += dt * (SP_SEC / 4);                      // 20초 가열을 4초에 보여 줘요
    if (s.t >= SP_SEC) { s.t = SP_SEC; s.run = false; s.done[s.sel] = true; s.dT[s.sel] = dTfull(s.sel); Sound.success(); updateCtl(); const i = s.sel; parts.burst(spSlotX(i), spBaseY() - 60, { count: 12, speed: 90, size: 3, colors: ['#ffd447', '#fff', '#7ee8a4'], gravity: 40, life: 0.7 }); }
    else s.dT[s.sel] = P_H * s.t / (M_SP * SUB[s.sel].c);
  }
  const spSlotW = () => topCard().w / 4;
  const spSlotX = (i) => topCard().x + spSlotW() * (i + 0.5) - (PHONE ? 8 : 14);
  const spBaseY = () => topCard().y + topCard().h - 92;
  function drawSample(i, cx, base, dT, hot) {
    const cw = PHONE ? 54 : 78, ch = PHONE ? 90 : 118, f = clamp(dT / 120, 0, 1);
    if (i < 2) {
      const liq = SUB[i].col, tint = SciSim.color.mix(liq, '#ff5a3c', f * 0.55);
      D.beaker(cx - cw / 2, base - ch, cw, ch, { level: 0.62, liquid: tint, t: S.clock, wave: 1.2 });
      if (i === 1) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(cx - cw / 2 + 5, base - ch * 0.62 + 3, cw - 10, 3); }
    } else if (i === 2) {
      ctx.fillStyle = '#9aa6b8'; ctx.beginPath(); ctx.moveTo(cx - cw / 2 - 6, base - 26); ctx.lineTo(cx + cw / 2 + 6, base - 26); ctx.lineTo(cx + cw / 2 - 6, base); ctx.lineTo(cx - cw / 2 + 6, base); ctx.closePath(); ctx.fill();
      const sand = SciSim.color.mix('#d7b76b', '#f06a3c', f * 0.6);
      const g = ctx.createLinearGradient(0, base - 70, 0, base - 26); g.addColorStop(0, SciSim.color.shade(sand, 0.25)); g.addColorStop(1, sand);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - cw / 2 - 4, base - 26); ctx.quadraticCurveTo(cx - cw * 0.2, base - 74, cx, base - 70); ctx.quadraticCurveTo(cx + cw * 0.25, base - 72, cx + cw / 2 + 4, base - 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,90,40,.35)'; for (let k = 0; k < 16; k++) { ctx.fillRect(cx - cw * 0.4 + ((k * 37) % (cw * 0.8)), base - 30 - ((k * 23) % 26), 2, 2); }
    } else {
      const bw = cw * 0.9, bh = ch * 0.62, col = SciSim.color.mix('#8a96a8', '#ee5a3a', f * 0.9);
      D.shadow(() => { D.roundRect(cx - bw / 2, base - bh, bw, bh, 6); const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); g.addColorStop(0, SciSim.color.shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, SciSim.color.shade(col, -0.3)); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - bw / 2 + 6, base - bh + 6, 8, bh - 12);
      if (f > 0.15) D.glow(cx, base - bh / 2, bw * 0.9, '#ff6a3c', f * 0.5);
    }
  }
  function drawSpec(dt) {
    const c = topCard(), s = S.sp;
    bgGrad(c);
    const tShown = s.run ? s.t : (s.done[s.sel] ? SP_SEC : 0);
    T(c.x + 12, c.y + 24, '같은 질량 0.20 kg에 같은 열을 줘요  Q = 500 W × ' + (s.run ? s.t.toFixed(0) : tShown) + ' s = ' + fN(P_H * (s.run ? s.t : tShown)) + ' J', PHONE ? 13 : 14.5, INK, 'left', 800);
    const base = spBaseY();
    SUB.forEach((m, i) => {
      const cx = spSlotX(i), sel = i === s.sel, dT = s.dT[i], Tn = T_ROOM + dT;
      if (sel) { ctx.fillStyle = 'rgba(245,158,11,.12)'; D.roundRect(c.x + spSlotW() * i + 5, c.y + 40, spSlotW() - 10, c.h - 48, 12); ctx.fill(); ctx.strokeStyle = 'rgba(245,158,11,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); }
      // 히터
      D.roundRect(cx - (PHONE ? 36 : 50), base + 40, PHONE ? 72 : 100, 14, 5); ctx.fillStyle = '#6b7a90'; ctx.fill();
      if (sel && s.run) {
        D.flame(cx - 14, base + 40, 38, S.clock); D.flame(cx + 14, base + 40, 38, S.clock + 1.3);
        if (!RM && Math.random() < 0.5) parts.emit({ x: cx + (Math.random() - 0.5) * 40, y: base + 10, vx: (Math.random() - 0.5) * 12, vy: -50 - Math.random() * 30, life: 0.7, size: 2.2, color: 'rgba(255,170,60,.9)', gravity: 0, fade: true });
      }
      drawSample(i, cx, base, dT);
      // 온도계
      const th = PHONE ? 84 : 112;
      D.thermometer(cx + (PHONE ? 41 : 58), base - th - 8, th, Tn, 20, 140, { ticks: false, color: '#e2464b' });
      T(cx, base + 72, m.n + ' 0.20 kg', PHONE ? 13 : 14, INK, 'center', 800);
      T(cx, base + 90, f1(Tn) + ' °C', PHONE ? 13.5 : 15, dT > 0.5 ? '#b91c1c' : MUTED, 'center', 800);
    });
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 측정표
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 14, xs = PHONE ? [x0, x0 + 66, 0, x0 + 124, x0 + 330] : [x0, x0 + 92, x0 + 220, x0 + 300, x0 + 596];
    T(x0, PY + 26, '📋 측정표 — 비열 c = Q / (m × ΔT)', 15, INK, 'left', 800);
    const hy = PY + 54;
    T(xs[0], hy, '물질', 13.5, MUTED, 'left', 800);
    if (!PHONE) { T(xs[1], hy, '열량 Q', 13.5, MUTED, 'left', 800); T(xs[2], hy, 'ΔT (°C)', 13.5, MUTED, 'left', 800); }
    else T(xs[1], hy, 'ΔT (°C)', 13.5, MUTED, 'left', 800);
    T(xs[3], hy, '온도 상승 (막대)', 13.5, MUTED, 'left', 800);
    T(xs[4], hy, 'c (J/(kg·K))', 13.5, MUTED, 'left', 800);
    const barW = PHONE ? 140 : 236;
    SUB.forEach((m, i) => {
      const yy = hy + 30 + i * (PHONE ? 30 : 31), dT = s.dT[i], has = s.done[i] || (s.run && s.sel === i), fin = s.done[i];
      if (i === s.sel) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(PX + 6, yy - 20, PW - 12, 27, 8); ctx.fill(); }
      ctx.fillStyle = m.col; ctx.beginPath(); ctx.arc(xs[0] + 6, yy - 6, 6, 0, TAU); ctx.fill();
      T(xs[0] + 16, yy, m.n, 14.5, INK, 'left', 800);
      if (!PHONE) { T(xs[1], yy, has ? fN(P_H * (fin ? SP_SEC : s.t)) + ' J' : '—', 14, INK, 'left', 800); T(xs[2], yy, has ? f1(dT) : '—', 14.5, '#b91c1c', 'left', 800); }
      else T(xs[1], yy, has ? f1(dT) : '—', 14.5, '#b91c1c', 'left', 800);
      hbar(xs[3], yy - 13, barW, 14, has ? dT : 0, 120, i === 0 ? '#3b82f6' : i === 1 ? '#e0a100' : i === 2 ? '#c2a15c' : '#64748b');
      const hide = i === 3 && showCalc('iron');
      T(xs[4], yy, fin ? (hide ? '?' : fN(P_H * SP_SEC / (M_SP * dT))) : '—', 14.5, fin ? (hide ? ORANGE : '#14753f') : '#9aa6bd', 'left', 800);
    });
    T(x0, PY + PH - 12, PHONE ? '같은 열을 받을 때 비열이 클수록 온도가 덜 올라요.' : '같은 열을 받을 때 비열 c가 클수록 온도가 덜 올라요 (열을 많이 저장해요).', 13.5, '#1d4ed8', 'left', 800);
  }

  /* ================= ② 가열 곡선 ================= */
  const NM = 36;
  const MOLS = [];
  (function initMols() {
    const rk = []; for (let i = 0; i < NM; i++) rk.push(i);
    let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = rk.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = rk[i]; rk[i] = rk[j]; rk[j] = t; }
    for (let i = 0; i < NM; i++) {
      MOLS.push({ gx: i % 6, gy: Math.floor(i / 6), rank: (rk[i] + 0.5) / NM, x: 0, y: 0, vx: 0, vy: 0, st: 0, ph1: rnd() * TAU, ph2: rnd() * TAU, ang: rnd() * TAU, init: false });
    }
  })();
  function insetBox() { const c = topCard(); return PHONE ? { x: c.x + 172, y: c.y + 42, w: c.w - 182, h: 176 } : { x: c.x + 250, y: c.y + 42, w: 270, h: 260 }; }
  function stepMols(dt, state) {
    const b = insetBox(), TK = state.T + 273, sp = 52 * Math.sqrt(TK / 273) * (PHONE ? 0.8 : 1);
    const padx = 14, sx = (b.w - 2 * padx - 20) / 5, sy = (b.h * 0.5 - 20) / 5;
    MOLS.forEach((m) => {
      let st = 0;
      if (state.fv > 0) st = m.rank < state.fv ? 2 : 1;
      else if (state.fm > 0) st = m.rank < state.fm ? 1 : 0;
      if (state.fm >= 1 && state.fv <= 0) st = 1;
      const siteX = b.x + padx + 10 + m.gx * sx, siteY = b.y + b.h - 18 - (5 - m.gy) * sy;     // 아래쪽에 격자
      if (!m.init) { m.x = siteX; m.y = siteY; m.init = true; }
      if (st !== m.st) {
        if (st > 0 && m.st === 0) { const a = Math.random() * TAU; m.vx = Math.cos(a) * sp * 0.6; m.vy = Math.sin(a) * sp * 0.6; }
        if (st === 2 && m.st === 1) { const a = -Math.random() * Math.PI; m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp; }
        m.st = st;
      }
      const amp = 1.0 + 1.9 * Math.sqrt(Math.max(TK, 0) / 273) * 0.9;
      if (st === 0) {
        const tx = siteX + Math.sin(S.clock * (7 + m.ph1) + m.ph1) * amp, ty = siteY + Math.sin(S.clock * (8 + m.ph2) + m.ph2) * amp;
        m.x = approach(m.x, tx, dt, 14); m.y = approach(m.y, ty, dt, 14); m.vx = 0; m.vy = 0;
      } else {
        const sv = st === 2 ? sp * 1.5 : sp, top = st === 2 ? b.y + 10 : b.y + b.h * (0.42 + 0.5 * state.fv);
        const v = Math.hypot(m.vx, m.vy) || 1; const k = approach(v, sv, dt, 3) / v; m.vx *= k; m.vy *= k;
        if (st === 1) m.vy += 70 * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        const r = 9;
        if (m.x < b.x + r) { m.x = b.x + r; m.vx = Math.abs(m.vx); } else if (m.x > b.x + b.w - r) { m.x = b.x + b.w - r; m.vx = -Math.abs(m.vx); }
        if (m.y > b.y + b.h - r) { m.y = b.y + b.h - r; m.vy = -Math.abs(m.vy); }
        if (m.y < top + r) { m.y = top + r; m.vy = Math.abs(m.vy); }
      }
      m.ang += dt * (st === 0 ? 0 : st === 1 ? 1.4 : 2.6);
    });
  }
  function drawMol(m, alpha) {
    const k = PHONE ? 0.72 : 1;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.ang); ctx.globalAlpha = alpha == null ? 1 : alpha;
    D.sphere(0, 0, 7.2 * k, '#e2464b', { gloss: false });
    D.sphere(-6.4 * k, 5.4 * k, 4.2 * k, '#e8eefc', { gloss: false, outline: 'rgba(100,120,160,.5)', outlineWidth: 1 }); D.sphere(6.4 * k, 5.4 * k, 4.2 * k, '#e8eefc', { gloss: false, outline: 'rgba(100,120,160,.5)', outlineWidth: 1 });
    ctx.restore();
  }
  function drawInset(state) {
    const b = insetBox();
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#fbfdff'); g.addColorStop(1, state.fm > 0 ? '#e1efff' : '#dcecff'); ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
    if (state.fm > 0 && state.fv < 1) { const pt = b.y + b.h * (0.42 + 0.5 * state.fv); ctx.fillStyle = 'rgba(80,150,235,.18)'; ctx.fillRect(b.x, pt, b.w, b.y + b.h - pt); }
    // 결합선: 고체 이웃끼리
    ctx.strokeStyle = 'rgba(80,100,140,.55)'; ctx.lineWidth = 2;
    MOLS.forEach((m, i) => {
      if (m.st !== 0) return;
      const r = MOLS[i + 1], d = MOLS[i + 6];
      if (r && (i % 6) < 5 && r.st === 0) { ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(r.x, r.y); ctx.stroke(); }
      if (d && d.st === 0) { ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
    });
    MOLS.forEach((m) => drawMol(m));
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.stroke();
    T(b.x + b.w / 2, b.y - 8, '🔍 입자 모형으로 보기', PHONE ? 13 : 14, INK, 'center', 800);
    const nm = ['고체: 격자에서 떨림', '녹는 중: 결합이 끊어져요', '액체: 서로 미끄러져요', '끓는 중: 결합을 완전히 끊어요', '모두 기체'][state.ph];
    D.label(b.x + b.w / 2, b.y + b.h - 14, nm, { bg: 'rgba(38,50,74,.88)', size: 13, pad: 9 });
  }
  function drawCurve(dt) {
    const c = topCard(), s = S.cu, st = cuAt(s.t);
    bgGrad(c);
    stepMols(dt, st);
    // 비커·히터
    const bw = PHONE ? 100 : 130, bh = PHONE ? 140 : 180, bx = c.x + (PHONE ? 14 : 30), by = c.y + (PHONE ? 62 : 74);
    D.roundRect(bx + 8, by + bh + 20, bw - 16, 14, 5); ctx.fillStyle = '#6b7a90'; ctx.fill();
    if (s.run) { D.flame(bx + bw / 2 - 12, by + bh + 20, 36, S.clock); D.flame(bx + bw / 2 + 12, by + bh + 20, 36, S.clock + 1.1); }
    const tot = 0.62;
    const waterLvl = clamp((st.fm - st.fv) * tot, 0, tot);
    const liq = SciSim.color.mix('#7cc4ff', '#9fd2ff', 0.4);
    D.beaker(bx, by, bw, bh, { level: waterLvl, liquid: liq, t: S.clock, wave: st.ph >= 3 ? 2.6 : 1.2 });
    // 얼음
    const iceFrac = 1 - st.fm;
    if (iceFrac > 0.001) {
      const iw = (bw - 24) * Math.cbrt(iceFrac), ih = (bh * 0.34) * Math.cbrt(iceFrac), iy = (st.fm > 0 ? by + bh - waterLvl * bh - ih * 0.72 : by + bh - 6 - ih);
      D.shadow(() => { D.roundRect(bx + bw / 2 - iw / 2, iy, iw, ih, 8); const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, 'rgba(236,250,255,.97)'); g.addColorStop(1, 'rgba(170,220,250,.95)'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 2; ctx.stroke(); }, { blur: 5, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(bx + bw / 2 - iw / 2 + 6, iy + 5, 5, ih * 0.5);
    }
    // 끓는 거품·수증기
    if (st.ph === 3 && !RM) {
      if (Math.random() < 0.6) parts.emit({ x: bx + 14 + Math.random() * (bw - 28), y: by + bh - 8, vx: 0, vy: -50 - Math.random() * 30, life: 0.8, size: 3 + Math.random() * 2.5, color: 'rgba(255,255,255,.9)', gravity: 0, shape: 'bubble', fade: true });
      if (Math.random() < 0.5) parts.emit({ x: bx + 16 + Math.random() * (bw - 32), y: by - 4, vx: (Math.random() - 0.5) * 14, vy: -34 - Math.random() * 16, life: 1.4, size: 9, color: 'rgba(235,240,248,.75)', gravity: 0, shape: 'smoke', fade: true, grow: 9 });
    }
    if (st.ph === 4 && !RM && Math.random() < 0.3) parts.emit({ x: bx + 16 + Math.random() * (bw - 32), y: by + 4, vx: (Math.random() - 0.5) * 14, vy: -34, life: 1.4, size: 9, color: 'rgba(235,240,248,.7)', gravity: 0, shape: 'smoke', fade: true, grow: 9 });
    if (!PHONE) T(bx + bw / 2, by + bh + 62, '얼음 0.10 kg · 히터 500 W', 14, INK, 'center', 800);
    D.thermometer(bx + bw + 28, by + 8, bh - 34, st.T, -20, 100, { ticks: false, color: '#e2464b' });
    D.label(bx + bw + 28, by - 10, f1(st.T) + ' °C', { bg: st.T > 60 ? RED : st.T >= 0 ? '#3b82f6' : '#2563eb', size: 13, pad: 8 });
    parts.update(dt); parts.draw(ctx);
    drawInset(st);
    // 열의 쓰임
    const hx = PHONE ? c.x + 12 : c.x + 540, hw = PHONE ? c.w - 24 : 240, hy = PHONE ? c.y + 236 : c.y + 56;
    T(hx, hy, '받은 열 Q = ' + fN(st.Q) + ' J', 14, INK, 'left', 800);
    stackBar(hx, hy + 10, hw, 16, [[st.Qt, '#f59e0b'], [st.Ql, '#7c3aed']], QT);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(hx, hy + 38, 12, 12); T(hx + 18, hy + 49, '온도를 올리는 데 ' + fN(st.Qt) + ' J', 13, INK, 'left', 800);
    ctx.fillStyle = '#7c3aed'; ctx.fillRect(hx, hy + 58, 12, 12); T(hx + 18, hy + 69, '결합을 푸는 데 ' + fN(st.Ql) + ' J', 13, INK, 'left', 800);
    const ky = hy + (PHONE ? 90 : 100);
    T(hx, ky, '분자 평균 운동 에너지 ∝ T = ' + f1(st.T + 273) + ' K', 13.5, INK, 'left', 800);
    hbar(hx, ky + 8, hw, 16, st.T + 273, 373, '#ef4444');
    if (st.ph === 1 || st.ph === 3) T(hx, ky + (PHONE ? 42 : 48), (st.ph === 1 ? '녹는 동안' : '끓는 동안') + ' 온도(운동 에너지)는 일정해요', 13, '#7c3aed', 'left', 800);
    T(c.x + 12, c.y + 24, '시계 ' + f1(s.t) + ' s  ·  ' + ['얼음 가열 ①', '융해 ② (0 °C 일정)', '물 가열 ③', '기화 ④ (100 °C 일정)', '모두 수증기'][st.ph], PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
    ctx.restore();
    // 아래: 가열 곡선
    panel(PX, PY, PW, PH, 16);
    const rc = { x: PX + 4, y: PY + 4, w: PW - 8, h: PH - 8 };
    const ax = axes(rc, { xmin: 0, xmax: 700, xstep: 100, ymin: -20, ymax: 120, ystep: 20, title: '가열 곡선 — 온도 (°C)', xl: '시간 (s)' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix - 1, ax.iy - 1, ax.iw + 2, ax.ih + 2); ctx.clip();
    const tEnd = Math.min(s.t, T4), seg = (a, b, col, w) => { const aa = Math.min(a, tEnd), bb = Math.min(b, tEnd); if (bb <= aa) return; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); for (let t = aa; t < bb + 1e-6; t += Math.max(0.25, (bb - aa) / 160)) { const q = cuAt(Math.min(t, bb)); t === aa ? ctx.moveTo(ax.gx(t), ax.gy(q.T)) : ctx.lineTo(ax.gx(t), ax.gy(q.T)); } const q2 = cuAt(bb); ctx.lineTo(ax.gx(bb), ax.gy(q2.T)); ctx.stroke(); };
    seg(0, T1, PHCOL[0], 4); seg(T1, T2, PHCOL[1], 6); seg(T2, T3, PHCOL[2], 4); seg(T3, T4, PHCOL[3], 6);
    ctx.restore();
    if (s.t > 0 && s.t < T4 + 1) { const q = cuAt(s.t); D.sphere(ax.gx(Math.min(s.t, T4)), ax.gy(q.T), 6, '#1b2333', { gloss: false }); }
    // 시간 표지 (도달한 구간만)
    const lines = [[T1, '① 0 ~ ' + f1(T1) + ' s: 얼음 가열'], [T2, '② ' + f1(T1) + ' ~ ' + f1(T2) + ' s: 융해 (0 °C)'], [T3, '③ ' + f1(T2) + ' ~ ' + f1(T3) + ' s: 물 가열'], [T4, '④ ' + f1(T3) + ' ~ ' + f1(T4) + ' s: 기화 (100 °C)']];
    const lx = ax.ix + ax.iw * (PHONE ? 0.34 : 0.4), ly = ax.gy(60);
    lines.forEach((l, i) => { if (s.t >= l[0] - 1e-6 || (game && game.free && s.done)) T(lx, ly + i * (PHONE ? 20 : 22), l[1], PHONE ? 13 : 13.5, PHCOL[i] === '#38bdf8' ? '#0284c7' : PHCOL[i], 'left', 800); });
    if (!s.run && s.t === 0) T(ax.ix + ax.iw / 2, ax.gy(40), '▶ 가열 시작을 눌러 곡선을 그려요', 14.5, '#c2410c', 'center', 800);
  }
  function cuReset() { const s = S.cu; s.run = false; s.t = 0; s.done = false; parts.clear(); updateCtl(); }
  function cuFill() { const s = S.cu; s.run = false; s.t = T4; s.done = true; updateCtl(); }
  function cuRun() { const s = S.cu; if (s.run) return; if (s.done || s.t >= T4) { s.t = 0; s.done = false; } s.run = true; Sound.click(); updateCtl(); }
  function cuStep(dt) {
    const s = S.cu; if (!s.run) return;
    const prev = cuAt(s.t).ph;
    s.t += dt * s.spd;
    if (s.t >= T4) { s.t = T4; s.run = false; s.done = true; Sound.success(); updateCtl(); }
    else { const ph = cuAt(s.t).ph; if (ph !== prev && (ph === 1 || ph === 3)) Sound.tick(); }
  }

  /* ================= ③ 열량 계산 ================= */
  const SCALE_ROW = 0.4 * LV, SCALE_TOT = 0.4 * (Q1 + Q2 + Q3 + Q4) / M_CU;
  const clQ = (m) => [m * C_ICE * 20, m * LF, m * C_W * 100, m * LV];
  const fT = (sec) => { const s = Math.round(sec); return s >= 60 ? s + ' s (약 ' + Math.floor(s / 60) + '분 ' + (s % 60) + '초)' : s + ' s'; };
  function drawCalc(dt) {
    const c = topCard(), m = S.cl.m, q = clQ(m), hide = showCalc('seg');
    bgGrad(c);
    T(c.x + 12, c.y + 24, '얼음 ' + m.toFixed(2) + ' kg (−20 °C)을 수증기 (100 °C)까지  ·  히터 500 W', PHONE ? 13 : 14.5, INK, 'left', 800);
    const forms = [
      '① 얼음 −20 → 0 °C   Q = c m ΔT = 2100 × ' + m.toFixed(2) + ' × 20',
      '② 융해 (0 °C)   Q = m L_f = ' + m.toFixed(2) + ' × 3.34 × 10⁵',
      '③ 물 0 → 100 °C   Q = 4200 × ' + m.toFixed(2) + ' × 100',
      '④ 기화 (100 °C)   Q = m L_v = ' + m.toFixed(2) + ' × 2.26 × 10⁶',
    ];
    const rh = PHONE ? 68 : 71, y0 = c.y + 40, bw = c.w - 32 - (PHONE ? 0 : 128);
    q.forEach((v, i) => {
      const yy = y0 + i * rh;
      ctx.fillStyle = PHCOL[i]; D.roundRect(c.x + 12, yy, 6, rh - 12, 3); ctx.fill();
      T(c.x + 26, yy + 15, forms[i], PHONE ? 13 : 14.5, INK, 'left', 800);
      hbar(c.x + 26, yy + 26, bw - 12, 16, v, SCALE_ROW, PHCOL[i]);
      T(c.x + c.w - 12, yy + (PHONE ? 58 : 40), hide ? '?' : fN(v) + ' J', PHONE ? 14.5 : 16, hide ? ORANGE : INK, 'right', 800);
      if (!PHONE) T(c.x + c.w - 12, yy + 58, hide ? '' : '(' + f1(v / P_H) + ' s)', 13, MUTED, 'right', 700);
      else if (!hide) T(c.x + 26, yy + 58, '(' + f1(v / P_H) + ' s)', 13, MUTED, 'left', 700);
    });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, tot = q[0] + q[1] + q[2] + q[3];
    T(x0, PY + 28, '🔥 전체 열량 Q = ' + (hide ? '?' : fN(tot) + ' J'), 15.5, INK, 'left', 800);
    stackBar(x0, PY + 42, PW - 32, 24, q.map((v, i) => [v, PHCOL[i]]), SCALE_TOT);
    T(x0, PY + 86, '필요한 시간 (500 W)  t = Q / P = ' + (hide ? '?' : fT(tot / P_H)), 14.5, INK, 'left', 800);
    const notes = [
      ['기화열 L_v = 2.26 × 10⁶ J/kg은 융해열 L_f = 3.34 × 10⁵ J/kg의 약 7배예요.', INK],
      ['같은 질량이라도 액체 → 기체에는 고체 → 액체보다 훨씬 많은 열이 필요해요.', MUTED],
      ['막대는 모두 같은 눈금이에요. 질량이 2배면 모든 막대가 2배로 길어져요.', MUTED],
    ];
    notes.forEach((n, i) => { let ls = [n[0]]; if (PHONE && n[0].length > 24) { const k = Math.ceil(n[0].length / 2); const sp = n[0].indexOf(' ', k - 4); ls = sp > 0 ? [n[0].slice(0, sp), n[0].slice(sp + 1)] : [n[0]]; } ls.forEach((l, j) => T(x0, PY + 116 + i * (PHONE ? 46 : 28) + j * 20, l, PHONE ? 13 : 14, n[1], 'left', 800)); });
  }

  /* ================= ④ 열평형 (열량계) ================= */
  const MX_SEC = 6.5;
  function mxRun() { const s = S.mx; if (s.run) return; s.run = true; s.u = 0; s.done = false; s.fbShown = false; Sound.click(); updateCtl(); }
  function mxReset() { const s = S.mx; s.run = false; s.u = 0; s.done = false; s.fbShown = false; parts.clear(); updateCtl(); }
  function mxStep(dt) {
    const s = S.mx; if (!s.run) return;
    s.u += dt / MX_SEC;
    if (s.u >= 1) { s.u = 1; s.run = false; s.done = true; Sound.success(); updateCtl(); mxFeedback(); }
  }
  function mxFeedback() {
    const s = S.mx, r = mixCalc(s.mi, s.Tw);
    if (!showCalc('cal')) return;
    const v = num('iTf');
    if (v == null) showHint('시뮬레이션 결과는 ' + f1(r.Tf) + ' °C예요. 예상 최종 온도를 입력해 비교해 보세요.', 4200);
    else if (Math.abs(v - r.Tf) <= 0.3) showHint('예상 ' + f1(v) + ' °C가 시뮬레이션 ' + f1(r.Tf) + ' °C와 맞아요!', 3600);
    else showHint('예상 ' + f1(v) + ' °C와 시뮬레이션 ' + f1(r.Tf) + ' °C가 달라요. 물이 잃은 열 = 얼음이 얻은 열로 다시 계산해 보세요.', 5200);
  }
  function mxState() {
    const s = S.mx, r = mixCalc(s.mi, s.Tw), u = s.u, Q = r.Qtot * u;
    const Tw = s.Tw - Q / (M_WATER * C_W);
    const melted = Math.min(1, Q / (s.mi * LF));
    const Tm = Q > s.mi * LF ? (Q - s.mi * LF) / (s.mi * C_W) : 0;
    return { r, Q, Tw, melted, Tm, gainMelt: Math.min(Q, s.mi * LF), gainWarm: Math.max(0, Q - s.mi * LF) };
  }
  function drawMix(dt) {
    const c = topCard(), s = S.mx, st = mxState();
    bgGrad(c);
    T(c.x + 12, c.y + 24, '열량계: 물 0.20 kg + 얼음 ' + s.mi.toFixed(3) + ' kg (0 °C)   (열 손실은 없다고 해요)', PHONE ? 13 : 14.5, INK, 'left', 800);
    const bw = PHONE ? 190 : 230, bh = PHONE ? 166 : 176, bx = c.x + (PHONE ? 40 : 70), by = c.y + 112;
    const lvl = 0.6, surf = by + bh - bh * lvl;
    const wcol = SciSim.color.mix('#7cc4ff', '#ff9a5c', clamp((st.Tw - 20) / 80, 0, 0.6));
    D.beaker(bx, by, bw, bh, { level: lvl, liquid: wcol, t: S.clock, wave: 1.4 });
    // 얼음 조각: 질량만큼 개수, 녹으면 작아져요
    const n = Math.max(1, Math.round(s.mi / 0.01));
    const nShow = Math.min(n, 10), remain = 1 - st.melted;
    const drop = s.run || s.done ? clamp(s.u / 0.06, 0, 1) : 0;
    for (let i = 0; i < nShow; i++) {
      const sz = ((bw - 30) / Math.min(5, nShow) * 0.78) * Math.cbrt(Math.max(remain, 0));
      if (sz < 1) break;
      const cols = Math.min(5, nShow), row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, nShow - row * cols);
      const px = bx + bw / 2 + (col - (inRow - 1) / 2) * ((bw - 30) / cols) + Math.sin(S.clock * 1.3 + i) * 2;
      const py0 = surf - sz * 0.55 - row * sz * 0.8 + Math.sin(S.clock * 1.7 + i * 1.3) * 1.5;
      const yy = (s.run || s.done) ? lerp(c.y + 74 - row * sz * 0.8, py0, sm(drop)) : c.y + 74 - row * sz * 0.8;
      D.roundRect(px - sz / 2, yy - sz / 2, sz, sz, 5); const g = ctx.createLinearGradient(0, yy - sz / 2, 0, yy + sz / 2); g.addColorStop(0, 'rgba(240,252,255,.97)'); g.addColorStop(1, 'rgba(168,218,250,.95)'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 1.8; ctx.stroke();
    }
    if (!s.run && !s.done) T(bx + bw / 2, c.y + 48, '얼음 ' + s.mi.toFixed(3) + ' kg · 0 °C', 13.5, '#0369a1', 'center', 800);
    // 열 이동 화살표
    if (s.run && !RM) for (let i = 0; i < 3; i++) { const ax = bx + bw * (0.25 + 0.25 * i); D.arrow(ax, surf + 70 - ((S.clock * 40 + i * 20) % 30), ax, surf + 24, { color: 'rgba(226,70,75,.7)', width: 3, head: 9 }); }
    D.thermometer(bx + bw + 36, by + 12, bh - 50, st.Tw, 0, 60, { ticks: false, color: '#e2464b' });
    D.label(bx + bw + 36, by + bh + 20, '물 ' + f1(st.Tw) + ' °C', { bg: st.Tw > 25 ? RED : '#3b82f6', size: 13, pad: 8 });
    if (s.done || s.run) {
      if (st.melted >= 1) T(bx + bw / 2, by + bh + 22, '녹은 물 ' + f1(st.Tm) + ' °C', 13.5, '#0369a1', 'center', 800);
      else T(bx + bw / 2, by + bh + 22, '남은 얼음 ' + fN(remain * s.mi * 1000) + ' g (0 °C)', 13.5, '#0369a1', 'center', 800);
    } else T(bx + bw / 2, by + bh + 22, '물 0.20 kg · ' + s.Tw + ' °C', 13.5, INK, 'center', 800);
    if (!PHONE) {
      const rx = c.x + 440;
      T(rx, c.y + 80, '열량 보존 (열 손실 없음)', 15, INK, 'left', 800);
      T(rx, c.y + 110, '물이 잃은 열 = 얼음이 얻은 열', 14.5, '#1d4ed8', 'left', 800);
      T(rx, c.y + 150, '얼음이 얻는 열', 14, MUTED, 'left', 800);
      T(rx, c.y + 174, '① 녹는 데  m L_f = ' + fN(s.mi * LF) + ' J', 14, '#7c3aed', 'left', 800);
      T(rx, c.y + 198, '② 녹은 물을 데우는 데  m c T', 14, '#f59e0b', 'left', 800);
      T(rx, c.y + 238, '땀 100 g이 증발하면', 14, MUTED, 'left', 800);
      T(rx, c.y + 260, '0.10 × 2.26 × 10⁶ = 2.26 × 10⁵ J 흡수', 14, '#0369a1', 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 에너지 장부
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, bwid = PW - 32 - (PHONE ? 0 : 0), maxQ = M_WATER * C_W * 60;
    const hideT = showCalc('cal') && !s.done;
    T(x0, PY + 28, '⚖️ 열의 장부 (J)', 15, INK, 'left', 800);
    T(x0, PY + 56, '물이 내놓은 열', 14, '#b91c1c', 'left', 800); T(PX + PW - 16, PY + 56, fN(st.Q) + ' J', 14.5, '#b91c1c', 'right', 800);
    stackBar(x0, PY + 62, bwid, 16, [[st.Q, '#ef4444']], maxQ);
    T(x0, PY + 104, '얼음이 얻은 열', 14, '#4338ca', 'left', 800); T(PX + PW - 16, PY + 104, fN(st.gainMelt + st.gainWarm) + ' J', 14.5, '#4338ca', 'right', 800);
    stackBar(x0, PY + 110, bwid, 16, [[st.gainMelt, '#7c3aed'], [st.gainWarm, '#f59e0b']], maxQ);
    const r = st.r;
    const res = hideT ? '최종 온도 T = ? (예상해서 입력해 보세요)' : (r.all ? '최종 온도 T = ' + f1(r.Tf) + ' °C' : '얼음이 다 녹지 못해 0 °C에서 열평형 (녹은 양 ' + fN(r.melted * s.mi * 1000) + ' g)');
    T(x0, PY + 152, res, PHONE ? 14 : 15.5, r.all ? '#14753f' : '#b45309', 'left', 800);
    const l1s = '0.20 × 4200 × (' + s.Tw + ' − T) = ' + fN(s.mi * LF) + ' + ' + s.mi.toFixed(3) + ' × 4200 × T';
    T(x0, PY + 182, l1s, PHONE ? 13 : 14.5, MUTED, 'left', 800);
    T(x0, PY + 206, r.all ? '→ ' + fN(M_WATER * C_W * s.Tw - s.mi * LF) + ' = ' + fN((M_WATER + s.mi) * C_W) + ' × T' : '→ 물이 내놓을 수 있는 열 ' + fN(r.Qtot) + ' J < 녹는 데 필요한 열 ' + fN(s.mi * LF) + ' J', PHONE ? 13 : 14.5, MUTED, 'left', 800);
    if (PHONE) T(x0, PY + 232, '땀 100 g 증발 = 2.26 × 10⁵ J 흡수', 13, '#0369a1', 'left', 800);
  }

  /* ================= ④ 보냉 팩 ================= */
  const PK_SEC = 9;
  function pkCompute() { S.pk.res = pkRun(S.pk.mat, S.pk.m); }
  function pkReset() { const s = S.pk; s.run = false; s.t = 0; s.done = false; pkCompute(); updateCtl(); }
  function pkGo() { const s = S.pk; if (s.run) return; s.t = 0; s.done = false; s.run = true; pkCompute(); Sound.click(); updateCtl(); }
  function pkStep(dt) {
    const s = S.pk; if (!s.run) return;
    s.t += dt * PK_END / PK_SEC;
    if (s.t >= PK_END) { s.t = PK_END; s.run = false; s.done = true; (s.res.ok ? Sound.success : Sound.fail).call(Sound); updateCtl(); if (s.res.ok) parts.burst(PHONE ? 130 : 230, 170, { count: 18, speed: 130, size: 3, colors: ['#ffd447', '#fff', '#7ee8a4'], gravity: 40, life: 0.8 }); }
  }
  function pkAt(t) { const r = S.pk.res, i = clamp(Math.floor(t / 60), 0, r.tb.length - 1), j = Math.min(i + 1, r.tb.length - 1), f = clamp(t / 60 - i, 0, 1); const L = (a) => a[i] + (a[j] - a[i]) * f; return { Tb: L(r.tb), Tp: L(r.tp), melt: L(r.melt), q: L(r.qs) }; }
  const fHM = (sec) => Math.floor(sec / 3600) + '시간 ' + String(Math.floor((sec % 3600) / 60)).padStart(2, '0') + '분';
  function drawPack(dt) {
    const c = topCard(), s = S.pk, res = s.res || (pkCompute(), S.pk.res), mat = PK[s.mat];
    const now = pkAt(s.t);
    bgGrad(c, '#fff6e8', '#f0e4cf');
    D.sphere(c.x + c.w - 40, c.y + 40, 20, '#ffd447', { gloss: false }); D.glow(c.x + c.w - 40, c.y + 40, 46, '#ffd447', 0.5);
    T(c.x + 12, c.y + 24, '도시락 (바깥 30 °C) · 처음 5 °C · 팩 ' + mat.short + ' ' + s.m.toFixed(1) + ' kg', PHONE ? 13 : 14.5, INK, 'left', 800);
    const bx = c.x + (PHONE ? 16 : 40), by = c.y + (PHONE ? 90 : 100), bwid = PHONE ? 300 : 430, bhei = PHONE ? 150 : 170;
    // 상자 (단열 벽)
    D.shadow(() => { D.roundRect(bx, by, bwid, bhei, 16); ctx.fillStyle = '#c9b48c'; ctx.fill(); }, { blur: 10, y: 4 });
    D.roundRect(bx + 10, by + 10, bwid - 20, bhei - 20, 10); ctx.fillStyle = '#fffdf6'; ctx.fill();
    // 팩
    const pw = PHONE ? 66 : 96, px = bx + 18, py = by + 20, ph = bhei - 40;
    const col = mat.Tm == null ? '#7cc4ff' : mat.Tm < 0 ? '#c4b5fd' : '#bfe8ff';
    D.roundRect(px, py, pw, ph, 10); ctx.fillStyle = 'rgba(160,210,250,.35)'; ctx.fill(); ctx.strokeStyle = '#6aa8e8'; ctx.lineWidth = 2.5; ctx.stroke();
    if (mat.Tm != null && now.melt < 0.99) {
      const sizeF = Math.cbrt(Math.max(0.04, 1 - now.melt)) * (0.55 + 0.45 * clamp(s.m / 1.0, 0, 1)), iw = (pw - 14) * sizeF, ih = (ph - 14) * sizeF;
      const iy = py + ph - 7 - ih;
      D.roundRect(px + pw / 2 - iw / 2, iy, iw, ih, 8); const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, 'rgba(246,253,255,.98)'); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 1.5; ctx.stroke();
      if (now.melt > 0.02) { const wl = (ph - 14) * (0.15 + 0.35 * clamp(s.m, 0, 1)) * now.melt; ctx.fillStyle = 'rgba(120,190,250,.55)'; ctx.fillRect(px + 5, py + ph - 7 - wl, pw - 10, wl); }
    } else if (mat.Tm == null) {
      const lv = 0.2 + 0.45 * clamp(s.m, 0, 1); ctx.fillStyle = SciSim.color.mix('#7cc4ff', '#ff9a5c', clamp((now.Tp - 5) / 40, 0, 1)); ctx.fillRect(px + 5, py + ph - 7 - (ph - 14) * lv, pw - 10, (ph - 14) * lv);
    }
    T(px + pw / 2, py + ph + 24, '팩 ' + f1(now.Tp) + ' °C', PHONE ? 13 : 14, '#1d4ed8', 'center', 800);
    // 음식
    const fx = px + pw + (PHONE ? 20 : 40), fw = bx + bwid - 20 - fx - (PHONE ? 34 : 60), fy = by + 30;
    const food = SciSim.color.mix('#f5deb3', '#ffd9a0', 0.4);
    D.roundRect(fx, fy + ph * 0.28, fw, ph * 0.55, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d6c7a4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fbfaf3'; D.roundRect(fx + 8, fy + ph * 0.3, fw - 16, ph * 0.26, 8); ctx.fill();
    ctx.fillStyle = food; D.roundRect(fx + 14, fy + ph * 0.6, fw * 0.45, ph * 0.18, 8); ctx.fill(); ctx.fillStyle = '#6dbb6d'; D.roundRect(fx + fw * 0.55, fy + ph * 0.6, fw * 0.3, ph * 0.18, 8); ctx.fill();
    T(fx + fw / 2, fy + ph * 0.28 - 6, '음식', 13.5, INK, 'center', 800);
    // 온도계
    const tx = bx + bwid - (PHONE ? 22 : 36);
    D.thermometer(tx, by + 14, bhei - 50, clamp(now.Tb, -10, 30), -10, 30, { ticks: false, color: now.Tb > 10 ? '#e2464b' : now.Tb < 0 ? '#7c3aed' : '#2563eb' });
    D.label(tx - (PHONE ? 8 : 0), by + bhei + 24, '상자 ' + f1(now.Tb) + ' °C', { bg: now.Tb > 10 ? RED : now.Tb < 0 ? PURPLE : '#2563eb', size: 13, pad: 8 });
    // 열 화살표 (바깥 → 상자, 상자 → 팩)
    const leak = K_LEAK * (T_OUT - now.Tb), qp = now.q;
    const aw = (P) => clamp(1.5 + P * 0.5, 1.5, 10);
    for (let i = 0; i < 3; i++) { const ax = bx + bwid * (0.35 + 0.22 * i); D.arrow(ax, by - 34, ax, by - 6, { color: 'rgba(226,70,75,.85)', width: aw(leak) * 0.8, head: 9 }); }
    T(bx + bwid / 2, by - 44, '바깥에서 들어오는 열 ' + f1(leak) + ' W', 13.5, '#b91c1c', 'center', 800);
    D.arrow(px + pw + 34, by + bhei * 0.5, px + pw + 6, by + bhei * 0.5, { color: 'rgba(37,99,235,.85)', width: aw(qp), head: 10 });
    T(px + pw + 20, by + bhei * 0.5 - 16, f1(qp) + ' W', 13, '#1d4ed8', 'center', 800);
    // 기록 시계
    T(bx, by + bhei + 24, '경과 ' + fHM(s.t) + ' / 4시간', PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
    if (s.done) D.label(PHONE ? c.x + c.w / 2 : c.x + 630, PHONE ? c.y + 300 : c.y + 84, res.ok ? '✅ 4시간 내내 0 ~ 10 °C' : res.hot ? '❌ 10 °C를 넘었어요 (최고 ' + f1(res.max) + ' °C)' : '❌ 0 °C 아래로 얼었어요 (최저 ' + f1(res.min) + ' °C)', { bg: res.ok ? GREEN : RED, size: 13, pad: 9 });
    if (!PHONE) {
      const rx = c.x + 500;
      T(rx, c.y + 130, '팩 상태', 14.5, INK, 'left', 800);
      T(rx, c.y + 156, mat.Tm == null ? '온도만 올라요 (c m ΔT)' : '녹은 비율 ' + Math.round(now.melt * 100) + ' %', 14, '#1d4ed8', 'left', 800);
      T(rx, c.y + 180, mat.Tm == null ? '흡수한 열 ' + fN(Math.max(0, (now.Tp - mat.T0) * s.m * mat.c)) + ' J' : '잠열로 흡수 ' + fN(now.melt * s.m * mat.L) + ' J', 14, '#7c3aed', 'left', 800);
      T(rx, c.y + 214, '팩 재료의 잠열 (예시 값)', 13.5, MUTED, 'left', 800);
      T(rx, c.y + 236, mat.Tm == null ? '얼음 334, 소금물 얼음 250 kJ/kg' : mat.n.replace(/ \(.*$/, '') + ' ' + fN(mat.L / 1000) + ' kJ/kg', 13.5, MUTED, 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 시간 - 온도 그래프
    panel(PX, PY, PW, PH, 16);
    const rc = { x: PX + 4, y: PY + 4, w: PW - 8, h: PH - 8 };
    const ax = axes(rc, { xmin: 0, xmax: 240, xstep: 60, ymin: -10, ymax: 30, ystep: 10, title: '상자 속 온도 (°C)', xl: '시간 (분)' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix - 1, ax.iy - 1, ax.iw + 2, ax.ih + 2); ctx.clip();
    ctx.fillStyle = 'rgba(20,160,88,.10)'; ctx.fillRect(ax.ix, ax.gy(10), ax.iw, ax.gy(0) - ax.gy(10));
    ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(ax.ix, ax.gy(10)); ctx.lineTo(ax.ix + ax.iw, ax.gy(10)); ctx.stroke(); ctx.setLineDash([]);
    const draw = (arr, color, w, dash) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); const n = Math.min(arr.length - 1, Math.floor(s.t / 60)); for (let i = 0; i <= n; i++) { const X = ax.gx(i), Y = ax.gy(arr[i]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } if (s.t / 60 > n && n < arr.length - 1) { const f = s.t / 60 - n; ctx.lineTo(ax.gx(s.t / 60), ax.gy(arr[n] + (arr[n + 1] - arr[n]) * f)); } ctx.stroke(); ctx.setLineDash([]); };
    draw(res.tp, '#94a3b8', 2.5, [5, 4]); draw(res.tb, '#2563eb', 4);
    ctx.restore();
    if (s.t > 0) D.sphere(ax.gx(s.t / 60), ax.gy(now.Tb), 6, '#1b2333', { gloss: false });
    T(ax.ix + ax.iw - 4, ax.gy(10) - 6, '한계 10 °C', 13, RED, 'right', 800);
    T(ax.ix + 8, ax.gy(-7), '━ 상자 속   ┅ 팩', 13, MUTED, 'left', 800);
    if (!s.run && s.t === 0) T(ax.ix + ax.iw / 2, ax.gy(20), '▶ 4시간 시뮬레이션을 눌러요 (약 9초)', 14.5, '#c2410c', 'center', 800);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  (function build() {
    const ss = $('#spSel'); SUB.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sp = i; b.textContent = m.n; ss.appendChild(b); });
    const pm = $('#pkMat'); PK.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.pm = i; b.textContent = m.n; pm.appendChild(b); });
  })();
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; const lk = n.getAttribute('data-lock'); if (lk && lockedBy(lk)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const sp = S.sp;
    $$('#spSel button').forEach((b) => { b.classList.toggle('on', +b.dataset.sp === sp.sel); b.disabled = sp.run; });
    $('#bSpRun').disabled = sp.run; $('#bSpRun').textContent = sp.done[sp.sel] ? '▶ 다시 가열 (20초)' : '▶ 500 W로 20초 가열';
    const cu = S.cu;
    $('#bCuRun').disabled = cu.run; $('#bCuRun').textContent = cu.done ? '▶ 다시 가열' : '▶ 가열 시작';
    $$('#cuSpd button').forEach((b) => b.classList.toggle('on', +b.dataset.sp === cu.spd));
    $('#oMass').textContent = S.cl.m.toFixed(2) + ' kg'; setSl('sMass', S.cl.m, 0.05, 0.4);
    const mx = S.mx;
    $('#oMi').textContent = mx.mi.toFixed(3) + ' kg'; setSl('sMi', mx.mi, 0.02, 0.1); $('#oTw').textContent = mx.Tw + ' °C'; setSl('sTw', mx.Tw, 20, 60);
    $('#sMi').disabled = mx.run; $('#sTw').disabled = mx.run;
    $('#bMxRun').disabled = mx.run; $('#bMxRun').textContent = mx.done ? '▶ 다시 넣기' : '▶ 얼음 넣기';
    const pk = S.pk;
    $$('#pkMat button').forEach((b) => { b.classList.toggle('on', +b.dataset.pm === pk.mat); b.disabled = pk.run; });
    $('#oPkM').textContent = pk.m.toFixed(1) + ' kg'; setSl('sPkM', pk.m, 0.1, 1); $('#sPkM').disabled = pk.run;
    $('#bPkRun').disabled = pk.run; $('#bPkRun').textContent = pk.done ? '▶ 다시 시뮬레이션' : '▶ 4시간 시뮬레이션';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#spSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (!S.sp.run) { S.sp.sel = +b.dataset.sp; updateCtl(); } }));
  $('#bSpRun').addEventListener('click', spRun);
  $('#bSpR').addEventListener('click', () => { Sound.click(); spReset(); });
  $('#bCuRun').addEventListener('click', cuRun);
  $('#bCuR').addEventListener('click', () => { Sound.click(); cuReset(); });
  $$('#cuSpd button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cu.spd = +b.dataset.sp; updateCtl(); }));
  $('#sMass').addEventListener('input', (e) => { S.cl.m = Math.round(+e.target.value * 100) / 100; updateCtl(); });
  $('#sMi').addEventListener('input', (e) => { S.mx.mi = Math.round(+e.target.value * 100) / 100; mxReset(); });
  $('#sTw').addEventListener('input', (e) => { S.mx.Tw = +e.target.value; mxReset(); });
  $('#bMxRun').addEventListener('click', mxRun);
  $('#bMxR').addEventListener('click', () => { Sound.click(); mxReset(); });
  $$('#pkMat button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (!S.pk.run) { S.pk.mat = +b.dataset.pm; pkReset(); } }));
  $('#sPkM').addEventListener('input', (e) => { if (S.pk.run) return; S.pk.m = Math.round(+e.target.value * 10) / 10; pkReset(); });
  $('#bPkRun').addEventListener('click', pkGo);
  $('#bPkR').addEventListener('click', () => { Sound.click(); pkReset(); });
  ['iFe', 'iLf', 'iQ1', 'iQ2', 'iQ3', 'iQ4', 'iQt', 'iTv', 'iTf'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  // 캔버스 터치: 비열 시료 고르기
  SciSim.pointer(view, {
    down(p) { if (S.mode !== 'spec' || S.sp.run) return false; const c = topCard(); if (p.y < c.y + 36 || p.y > c.y + c.h) return false; const i = clamp(Math.floor((p.x - c.x) / spSlotW()), 0, 3); if (i !== S.sp.sel) { S.sp.sel = i; Sound.click(); updateCtl(); } return false; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'spec') { const s = S.sp; L1 = '고른 시료'; a = SUB[s.sel].n; L2 = '온도 상승 ΔT'; b = f1(s.dT[s.sel]) + ' °C'; L3 = '받은 열 Q'; c = fN(P_H * (s.run ? s.t : s.done[s.sel] ? SP_SEC : 0)) + ' J'; }
    else if (m === 'curve') { const st = cuAt(S.cu.t); L1 = '온도'; a = f1(st.T) + ' °C'; L2 = '받은 열 Q'; b = fN(st.Q) + ' J'; L3 = '시계'; c = f1(S.cu.t) + ' s'; }
    else if (m === 'calc') { const q = clQ(S.cl.m), hide = showCalc('seg'), tot = q[0] + q[1] + q[2] + q[3]; L1 = '질량 m'; a = S.cl.m.toFixed(2) + ' kg'; L2 = '전체 열량 Q'; b = hide ? '?' : fN(tot) + ' J'; L3 = '필요한 시간 (500 W)'; c = hide ? '?' : fT(tot / P_H); }
    else if (m === 'mix') { const st = mxState(); L1 = '물 온도'; a = f1(st.Tw) + ' °C'; L2 = '물이 내놓은 열'; b = fN(st.Q) + ' J'; L3 = '최종 온도'; c = (showCalc('cal') && !S.mx.done) ? '?' : (S.mx.run ? '…' : f1(st.r.Tf) + ' °C'); }
    else { const now = pkAt(S.pk.t), r = S.pk.res || (pkCompute(), S.pk.res); L1 = '상자 속 온도'; a = f1(now.Tb) + ' °C'; L2 = '4시간 최고 온도'; b = S.pk.done ? f1(r.max) + ' °C' : '—'; L3 = '4시간 최저 온도'; c = S.pk.done ? f1(r.min) + ' °C' : '—'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const nearRel = (v, a, r) => v != null && Math.abs(v - a) <= Math.abs(a) * r;

  const levels = [
    {
      title: '비열: 같은 열, 다른 온도', short: '비열', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 불로 가열해도 물질마다 온도가 다르게 오르는 까닭은? 얼음을 끓는 물까지 가열하려면 열이 얼마나 필요할까?</p>' +
        '<div class="si-link">🔗 <b>중학교와 물리학에서</b> 비열이 큰 물질은 온도가 잘 변하지 않는다고 배웠고, Q = cmΔT를 한 번 써 보았어요. 이번에는 실제로 <b>숫자를 재서 비열 c를 직접 구해요.</b></div>' +
        '<p>질량이 같은 <b>물·식용유·모래·철</b> 0.20 kg에 똑같이 500 W 히터로 20초(<b>Q = 10 000 J</b>)씩 열을 주고 <b>온도가 얼마나 오르는지</b> 재요. Q = c m ΔT에서 <b>c = Q / (m ΔT)</b>예요.</p>',
      features: ['spec'],
      setup() { spReset(); setFlag('iron', false); setScene('spec'); },
      recap: '같은 열을 받아도 비열 c가 큰 물질일수록 온도가 덜 올라요. c = Q / (m ΔT)로 물질마다 구할 수 있고, 물 4200 > 식용유 2000 > 모래 800 > 철 450 J/(kg·K)이에요.',
      summary: '<ul><li><b>비열 c</b>: 물질 1 kg의 온도를 1 K(1 °C) 올리는 데 필요한 열. 단위 J/(kg·K). 물질마다 다른 고유한 값이에요.</li>' +
        '<li><b>Q = c m ΔT</b>. 0.20 kg에 Q = 10 000 J를 주면 ΔT = Q / (m c): 물 11.9 °C, 식용유 25.0 °C, 모래 62.5 °C, 철 111.1 °C.</li>' +
        '<li>c는 물 4200, 식용유 약 2000, 모래 약 800, 철 450 J/(kg·K). <b>c가 클수록 온도가 덜 올라가고, 식을 때도 덜 내려가요.</b> (열을 많이 저장해요.)</li>' +
        '<li>그래서 바닷가는 물의 큰 비열 때문에 하루 기온 변화가 내륙보다 작아요.</li></ul>',
      missions: [
        {
          title: '네 물질을 같은 열로 가열하기',
          goal: '시료를 하나씩 고르고 <b>▶ 500 W로 20초 가열</b>을 눌러 <b>물, 식용유, 모래, 철</b> 네 가지의 온도 상승을 모두 측정하세요.',
          hint: '시료 버튼(또는 화면의 그릇)을 골라 가열을 끝까지 기다려요. 네 가지를 다 가열하면 측정표가 채워져요.',
          setup() { spReset(); setFlag('iron', false); setScene('spec'); },
          check: () => S.sp.done.every(Boolean),
          hold: 0.5,
          status: () => S.sp.done.map((d, i) => mark(d) + ' ' + SUB[i].n).join(' &nbsp; '),
          explain: '같은 열 10 000 J을 주었는데 온도는 물 11.9 °C, 식용유 25.0 °C, 모래 62.5 °C, 철 111.1 °C로 달라졌어요. <b>비열이 작은 철이 가장 많이 올랐어요.</b>',
        },
        {
          title: '철의 비열 계산하기', manual: true,
          goal: '철의 측정값(m = 0.20 kg, Q = 10 000 J, ΔT는 측정표)으로 <b>c = Q / (m ΔT)</b>를 계산해 J/(kg·K) 단위로 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'c = 10 000 / (0.20 × ΔT). 철의 ΔT는 측정표에서 읽어요(약 111 °C). 답은 몇백 J/(kg·K) 정도예요.',
          setup() { spFill(); S.sp.sel = 3; clr('iFe'); setFlag('iron', true); setScene('spec'); },
          check() {
            const v = num('iFe'); if (v == null) return '철의 비열을 숫자로 입력해 주세요 (J/(kg·K)).';
            const ok = v >= 430 && v <= 470; fb([[$('#iFe'), ok]]);
            if (ok) return true;
            if (v > 0 && v < 5) return '단위를 확인해요. 0.45 같은 값은 kJ 단위예요. J/(kg·K)로 답해 주세요.';
            if (nearRel(v, 90, 0.1) || nearRel(v, 22.5, 0.1)) return 'm = 0.20 kg과 ΔT를 모두 나누었는지 확인해요. c = Q / (m ΔT)예요.';
            return 'c = 10 000 / (0.20 × 111)을 계산해 보세요. 철은 물보다 훨씬 작아요.';
          },
          status: () => '입력 ' + ($('#iFe').value.trim() || '—') + ' J/(kg·K)',
          explain: 'c = Q / (m ΔT) = 10 000 / (0.20 × 111.1) ≈ <b>450 J/(kg·K)</b>예요. 물(4200)의 약 1/9밖에 안 돼서 같은 열로 온도가 훨씬 많이 올랐어요.',
        },
        {
          type: 'quiz', title: '해안 지방의 기온 변화',
          goal: '바닷가는 내륙보다 하루 중 기온 변화가 작아요. 그 까닭으로 알맞은 것은?',
          setup() { setFlag('iron', false); setScene('spec'); },
          choices: ['물은 비열이 커서 열을 많이 얻거나 잃어도 온도가 조금만 변해요', '물은 비열이 작아서 열을 거의 흡수하지 못해요', '비열이 큰 물질은 열을 받으면 온도가 빨리 올라요', '바닷물은 햇빛을 모두 반사해서 열을 전혀 받지 않아요'],
          answer: 0,
          feedback: ['', '물의 비열은 4200 J/(kg·K)로 가장 큰 편이에요. 열을 많이 저장할 수 있어요.', '반대예요. 비열이 클수록 같은 열에 온도가 덜 올라요. 물은 11.9 °C, 철은 111.1 °C 올랐어요.', '바닷물도 햇빛을 받아 열을 흡수해요. 다만 비열이 커서 온도가 조금만 변해요.'],
          explain: '물은 비열이 커서 낮에 열을 흡수해도 천천히 데워지고, 밤에도 천천히 식어요. 그래서 바닷가는 <b>낮과 밤의 기온 차가 작아요.</b> 비열이 큰 것은 온도가 빨리 오르는 것이 아니라 <b>온도가 잘 변하지 않는 것</b>이에요.',
        },
      ],
    },
    {
      title: '잠열: 온도가 오르지 않는 구간', short: '잠열', icon: '🔥', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열을 받으면 온도가 오른다고 생각했는데, Q = c m ΔT는 <b>온도가 변할 때</b>만 써요. 이번에는 <b>상태가 변하는 동안</b>의 열을 살펴봐요.</div>' +
        '<p>얼음 0.10 kg(−20 °C)을 <b>500 W</b> 히터로 계속 가열해 <b>시간 – 온도 가열 곡선</b>을 그려요. 0 °C와 100 °C에서 <b>온도가 오르지 않는 수평 구간</b>이 생겨요. 🔍 입자 돋보기로 그동안 분자에서 무슨 일이 일어나는지 봐요.</p>',
      features: ['curve'],
      setup() { cuReset(); setFlag('lf', false); setScene('curve'); },
      recap: '상태가 변하는 동안은 열을 계속 받아도 온도가 일정해요. 받은 열이 분자의 운동 에너지가 아니라 분자 사이의 결합을 푸는 데 쓰이기 때문이에요. 이 열이 잠열(Q = mL)이고, 기화열이 융해열보다 훨씬 커요.',
      summary: '<ul><li><b>가열 곡선</b>(얼음 0.10 kg, 500 W): 얼음 가열 → <b>0 °C 수평(융해)</b> → 물 가열 → <b>100 °C 수평(기화)</b>.</li>' +
        '<li>수평 구간에서는 열을 계속 받아도 <b>온도(= 분자의 평균 운동 에너지)가 일정</b>해요. 열은 분자 사이의 결합을 끊는 데 쓰여요.</li>' +
        '<li><b>잠열</b> Q = mL. 물의 융해열 L<sub>f</sub> = 3.34 × 10⁵ J/kg, 기화열 L<sub>v</sub> = 2.26 × 10⁶ J/kg (융해열의 약 7배).</li>' +
        '<li>수평 구간의 시간으로 L을 구해요: L<sub>f</sub> = P t / m = 500 × 66.8 / 0.10 = 3.34 × 10⁵ J/kg.</li></ul>',
      missions: [
        {
          title: '가열 곡선 완성하기',
          goal: '<b>▶ 가열 시작</b>을 눌러 얼음 0.10 kg이 모두 수증기가 될 때까지 가열 곡선을 끝까지 그리세요.',
          hint: '시간 빠르기를 "빠르게"로 바꾸면 더 빨리 끝나요. 곡선이 두 번 수평이 되는 것을 입자 돋보기와 함께 보세요.',
          setup() { cuReset(); setFlag('lf', false); setScene('curve'); },
          check: () => S.cu.done,
          hold: 0.6,
          status: () => mark(S.cu.done) + ' 가열 곡선 완성 &nbsp; (' + f1(S.cu.t) + ' / ' + f1(T4) + ' s)',
          explain: '곡선에는 <b>0 °C와 100 °C의 수평 구간</b>이 있어요. 융해 구간 66.8 s, 기화 구간 452 s 동안 히터는 계속 500 W의 열을 주지만 온도는 일정했어요.',
        },
        {
          title: '수평 구간의 시간으로 융해열 구하기', manual: true,
          goal: '0 °C 수평 구간의 시간(그래프에 표시)으로 <b>L<sub>f</sub> = P t / m</b>을 계산해 <b>× 10⁵ J/kg</b> 단위의 숫자로 입력하고 ✔ 확인하기를 누르세요.',
          hint: '융해 구간은 ② 8.4 s ~ 75.2 s예요. t = 75.2 − 8.4 s, P = 500 W, m = 0.10 kg. 답은 3 정도의 숫자예요.',
          setup() { cuFill(); clr('iLf'); setFlag('lf', true); setScene('curve'); },
          check() {
            let v = num('iLf'); if (v == null) return '융해열을 숫자로 입력해 주세요 (× 10⁵ J/kg).';
            if (v > 1000) v /= 1e5;
            const ok = v >= 3.2 && v <= 3.5; fb([[$('#iLf'), ok]]);
            if (ok) return true;
            if (nearRel(v, 0.334, 0.05) || nearRel(v, 33.4, 0.05)) return '단위를 확인해요. 3.34 × 10⁵ J/kg이면 입력값은 3.34예요.';
            if (nearRel(v, 3.34 * 0.1, 0.2)) return 'm = 0.10 kg으로 나누었는지 확인해요. L = P t / m이에요.';
            return 'L = 500 × 66.8 / 0.10 = 334 000 J/kg을 × 10⁵ 단위로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#iLf').value.trim() || '—') + ' × 10⁵ J/kg',
          explain: '융해 구간의 시간은 75.2 − 8.4 = 66.8 s이므로 받은 열 Q = 500 × 66.8 = 33 400 J. <b>L<sub>f</sub> = Q / m = 33 400 / 0.10 = 3.34 × 10⁵ J/kg</b>예요. 얼음 1 kg을 0 °C 물로 만드는 데 334 kJ이 필요해요.',
        },
        {
          type: 'quiz', title: '수평 구간에서 열이 쓰이는 곳',
          goal: '얼음이 녹는 동안(0 °C 수평 구간)에도 히터는 계속 열을 주는데 온도가 오르지 않아요. 열은 어디에 쓰일까요?',
          setup() { setFlag('lf', false); setScene('curve'); },
          choices: ['열이 사라지거나 온도계가 고장 난 거예요', '분자의 운동 에너지를 늘리지 않고, 분자 사이의 결합을 끊는 데 쓰여요', '얼음이 열을 반사해서 열을 받지 않아요', '분자가 빨라지지만 온도계가 천천히 반응할 뿐이에요'],
          answer: 1,
          feedback: ['에너지는 사라지지 않아요(보존). 열은 결합을 푸는 데 쓰였어요. 입자 돋보기에서 결합선이 끊어지는 것을 보세요.', '', '히터의 열은 모두 얼음이 흡수해요. 받은 열 Q 막대가 계속 늘어나는 것을 봤죠.', '분자의 평균 운동 에너지(온도) 막대는 일정했어요. 온도계가 느린 것이 아니에요.'],
          explain: '온도는 분자의 <b>평균 운동 에너지</b>의 척도예요. 수평 구간에서는 받은 열이 운동 에너지가 아니라 <b>분자 사이의 결합(퍼텐셜 에너지)을 푸는 데</b> 쓰여서 온도가 그대로예요. 이 열이 잠열이에요.',
        },
      ],
    },
    {
      title: '열량 계산: 네 구간의 합', short: '열량 계산', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 변하는 구간은 Q = c m ΔT, 상태가 변하는 구간은 잠열 Q = m L을 써야 한다는 것을 알았어요. 이제 가열 곡선의 <b>네 구간을 각각 계산해 더해요.</b></div>' +
        '<p>얼음 0.10 kg(−20 °C)을 수증기(100 °C)로 만드는 전체 열량은 ① 얼음 가열 + ② 융해 + ③ 물 가열 + ④ 기화예요. 막대의 길이는 열량에 비례해요.</p>',
      features: ['calc'],
      setup() { S.cl.m = 0.1; setFlag('seg', false); setFlag('tv', false); setScene('calc'); },
      recap: '전체 열량은 네 구간의 합이에요: 4 200 + 33 400 + 42 000 + 226 000 = 305 600 J (약 10분). 가장 큰 것은 기화열이에요.',
      summary: '<ul><li>① 얼음 −20 → 0 °C: Q = 0.10 × 2100 × 20 = <b>4 200 J</b> (8.4 s)</li>' +
        '<li>② 융해 0 °C: Q = 0.10 × 3.34 × 10⁵ = <b>33 400 J</b> (66.8 s)</li>' +
        '<li>③ 물 0 → 100 °C: Q = 0.10 × 4200 × 100 = <b>42 000 J</b> (84 s)</li>' +
        '<li>④ 기화 100 °C: Q = 0.10 × 2.26 × 10⁶ = <b>226 000 J</b> (452 s)</li>' +
        '<li>합계 305 600 J ≈ 3.06 × 10⁵ J, 500 W로 약 611 s (10분). 질량이 2배면 모든 구간이 2배예요. <b>온도 변화</b>에는 cmΔT, <b>상태 변화</b>에는 mL!</li></ul>',
      missions: [
        {
          title: '네 구간 열량과 합계 계산하기', manual: true,
          goal: '질량 0.10 kg일 때 네 구간의 열량(J)과 <b>합계</b>를 계산해 입력하고 ✔ 확인하기를 누르세요. (c<sub>얼음</sub> 2100, c<sub>물</sub> 4200 J/(kg·K), L<sub>f</sub> 3.34 × 10⁵, L<sub>v</sub> 2.26 × 10⁶ J/kg)',
          hint: '구간 ①, ③은 Q = c m ΔT (ΔT는 20 °C, 100 °C), 구간 ②, ④는 Q = m L이에요. 마지막 칸은 네 값의 합이에요.',
          setup() { S.cl.m = 0.1; clr('iQ1', 'iQ2', 'iQ3', 'iQ4', 'iQt'); setFlag('tv', false); setFlag('seg', true); setScene('calc'); },
          check() {
            const ans = [Q1, Q2, Q3, Q4, QT], ids = ['iQ1', 'iQ2', 'iQ3', 'iQ4', 'iQt'], xs = ids.map(num);
            if (xs.some((x) => x == null)) return '다섯 칸에 모두 숫자를 입력해 주세요 (J).';
            const oks = xs.map((x, i) => nearRel(x, ans[i], 0.02)); fb(oks.map((o, i) => [$('#' + ids[i]), o]));
            if (oks.every(Boolean)) return true;
            const i = oks.findIndex((o) => !o);
            if (i === 4) return '합계는 네 구간을 모두 더해요. 먼저 붉은 칸을 고친 뒤 다시 더해 보세요.';
            if (i === 1 || i === 3) return '상태가 변하는 구간은 Q = m L이에요. 온도 변화 ΔT를 곱하지 않아요.';
            return '온도가 변하는 구간은 Q = c m ΔT예요. ΔT는 ' + (i === 0 ? '0 − (−20) = 20 °C' : '100 − 0 = 100 °C') + '예요.';
          },
          status: () => '입력 ' + ['iQ1', 'iQ2', 'iQ3', 'iQ4', 'iQt'].filter((id) => $('#' + id).value.trim()).length + ' / 5',
          explain: '① 0.10 × 2100 × 20 = <b>4 200 J</b>, ② 0.10 × 3.34 × 10⁵ = <b>33 400 J</b>, ③ 0.10 × 4200 × 100 = <b>42 000 J</b>, ④ 0.10 × 2.26 × 10⁶ = <b>226 000 J</b>. 합계는 <b>305 600 J</b> (≈ 3.06 × 10⁵ J)예요.',
        },
        {
          title: '물 0.10 kg을 모두 기화시키는 시간', manual: true,
          goal: '100 °C 물 0.10 kg을 500 W 히터로 모두 수증기로 만드는 데 걸리는 시간(s)을 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '필요한 열 Q = m L_v = 0.10 × 2.26 × 10⁶ J. 시간 t = Q / P이에요.',
          setup() { S.cl.m = 0.1; clr('iTv'); setFlag('seg', false); setFlag('tv', true); setScene('calc'); },
          check() {
            const v = num('iTv'); if (v == null) return '시간을 숫자로 입력해 주세요 (s).';
            const ok = Math.abs(v - 452) <= 3; fb([[$('#iTv'), ok]]);
            if (ok) return true;
            if (Math.abs(v - 452 / 60) < 0.3) return '초(s) 단위로 답해 주세요. 7.5분이 아니라 몇 초인지 구해요.';
            if (Math.abs(v - 66.8) <= 3) return '그건 융해(얼음) 시간이에요. 기화에는 L_v = 2.26 × 10⁶ J/kg을 써요.';
            return 't = Q / P = (0.10 × 2.26 × 10⁶) / 500을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iTv').value.trim() || '—') + ' s',
          explain: 'Q = m L<sub>v</sub> = 0.10 × 2.26 × 10⁶ = 226 000 J, t = Q / P = 226 000 / 500 = <b>452 s</b>(약 7분 32초)예요. 융해(66.8 s)보다 약 7배 오래 걸려요.',
        },
        {
          type: 'quiz', title: '가장 열이 많이 드는 구간',
          goal: '(질량 m을 바꿔 막대를 비교해 보세요.) 네 구간 중 열이 가장 많이 드는 구간과 그 까닭은?',
          setup() { setFlag('seg', false); setFlag('tv', false); setScene('calc'); },
          choices: ['① 얼음 가열: 시작 온도가 가장 낮아서', '③ 물 가열: 온도 변화(100 °C)가 가장 커서', '④ 기화: 분자 사이의 결합을 완전히 끊어야 해서 기화열이 융해열의 약 7배예요', '② 융해: 얼음이 녹는 모습이 가장 눈에 띄어서'],
          answer: 2,
          feedback: ['① 구간은 4 200 J로 가장 작은 구간이에요.', '물을 100 °C까지 데우는 데는 42 000 J이지만, 기화에는 226 000 J이 들어 약 5배예요. 온도 변화가 크다고 열이 가장 많이 드는 것은 아니에요.', '', '융해는 33 400 J로 기화(226 000 J)보다 훨씬 작아요.'],
          explain: '④ 기화는 226 000 J로 전체(305 600 J)의 약 <b>74 %</b>예요. 액체 분자를 서로 완전히 떼어 기체로 만들어야 하므로 L<sub>v</sub> = 2.26 × 10⁶ J/kg이 L<sub>f</sub>의 약 7배예요.',
        },
      ],
    },
    {
      title: '열평형과 보냉 팩 설계', short: '열평형', icon: '🧊', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도 변화(cmΔT)와 상태 변화(mL)의 열량을 계산했어요. 두 물체가 열을 주고받아 <b>열평형</b>에 이르면 <b>물체가 잃은 열 = 다른 물체가 얻은 열</b>이에요(열 손실은 무시).</div>' +
        '<p>먼저 열량계에서 0 °C 얼음을 30 °C 물에 넣었을 때 <b>최종 온도</b>를 계산으로 예측하고 시뮬레이션으로 확인해요. 그 뒤 <b>도시락 보냉 팩</b>을 직접 설계해요. 정답은 하나가 아니에요.</p>',
      features: ['mix', 'pack'],
      setup() { mxReset(); pkReset(); setFlag('cal', false); setScene('mix'); },
      recap: '열량 보존: 물이 잃은 열 = 얼음이 얻은 열(녹는 데 mL + 데우는 데 cmT). 얼음은 녹으면서 같은 질량의 0 °C 물보다 훨씬 많은 열을 흡수하므로 보냉 팩에 효과적이에요.',
      summary: '<ul><li><b>열평형</b>: 열 손실이 없으면 물체가 잃은 열 = 얻은 열. 물 0.20 kg(30 °C) + 얼음 0.050 kg(0 °C): 0.20 × 4200 × (30 − T) = 0.050 × 3.34 × 10⁵ + 0.050 × 4200 × T → <b>T ≈ 8.1 °C</b> (먼저 얼음이 다 녹는지 확인: 물이 내놓을 수 있는 열 25 200 J > 16 700 J).</li>' +
        '<li>땀 100 g이 증발하면 0.10 × 2.26 × 10⁶ = 2.26 × 10⁵ J을 흡수해 몸을 식혀요(체온 조절).</li>' +
        '<li>얼음 500 g이 녹으며 흡수하는 열은 167 kJ로, 같은 질량의 물을 5 → 25 °C로 데우는 열(42 kJ)의 약 4배예요. <b>잠열을 쓰는 보냉 팩이 효율적</b>이에요.</li>' +
        '<li>100 °C 수증기는 피부에서 액화하며 기화열(2260 kJ/kg)을 내놓아 같은 질량의 100 °C 물보다 훨씬 위험해요.</li></ul>',
      missions: [
        {
          title: '열량계 최종 온도 예측하고 확인하기',
          goal: '물 0.20 kg(30 °C)에 0 °C 얼음 0.050 kg을 넣을 때의 <b>최종 온도</b>를 계산해 입력한 뒤, <b>▶ 얼음 넣기</b>로 시뮬레이션과 비교하세요.',
          hint: '먼저 얼음이 다 녹는지 확인: 물이 내놓을 수 있는 열 0.20 × 4200 × 30 = 25 200 J, 녹는 데 필요한 열 0.050 × 3.34 × 10⁵ = 16 700 J. 그다음 0.20 × 4200 × (30 − T) = 16 700 + 0.050 × 4200 × T를 풀어요.',
          setup() { S.mx.mi = 0.05; S.mx.Tw = 30; mxReset(); clr('iTf'); setFlag('cal', true); setScene('mix'); },
          check() { const v = num('iTf'); const r = mixCalc(0.05, 30); return S.mx.done && S.mx.mi === 0.05 && S.mx.Tw === 30 && v != null && Math.abs(v - r.Tf) <= 0.3; },
          hold: 0.6,
          status() { const v = num('iTf'); return '예상 ' + (v == null ? '—' : f1(v) + ' °C') + ' &nbsp; ' + mark(S.mx.done) + ' 시뮬레이션 &nbsp; ' + mark(S.mx.done && v != null && Math.abs(v - mixCalc(0.05, 30).Tf) <= 0.3) + ' 일치'; },
          explain: '얼음이 다 녹는 데 16 700 J이 필요하고 물이 25 200 J까지 내놓을 수 있으므로 모두 녹아요. 25 200 − 840 T = 16 700 + 210 T → 8 500 = 1 050 T → <b>T ≈ 8.1 °C</b>. 시뮬레이션에서 두 막대(잃은 열 = 얻은 열)가 같은 길이가 돼요.',
        },
        {
          title: '도시락 보냉 팩 설계하기',
          goal: '팩 재료와 질량을 골라 <b>4시간 동안 도시락 속 온도가 0 °C 이상 10 °C 이하</b>를 유지하는 팩을 만들고 시뮬레이션으로 확인하세요.',
          hint: '물 팩은 온도만 올라 금방 따뜻해져요. 얼음은 녹는 동안 잠열로 흡수해요. 소금물 얼음은 너무 차가워 음식이 얼 수 있어요. 얼음은 0.7 kg 이상에서 시작해 보세요.',
          setup() { S.pk.mat = 0; S.pk.m = 0.3; pkReset(); setFlag('cal', false); setScene('pack'); },
          check: () => S.pk.done && S.pk.res && S.pk.res.ok,
          hold: 0.6,
          status() { const r = S.pk.res; return mark(S.pk.done) + ' 4시간 시뮬레이션 &nbsp; ' + (S.pk.done && r ? mark(r.max <= 10) + ' 최고 ' + f1(r.max) + ' °C &nbsp; ' + mark(r.min >= 0) + ' 최저 ' + f1(r.min) + ' °C' : '⬜ 최고·최저 온도'); },
          explain: '<b>얼음 0.7 kg 이상</b>이면 4시간 동안 잠열(0.7 kg × 334 kJ/kg ≈ 234 kJ)로 새어 드는 열을 흡수해 상자가 약 3 °C에 머물러요. 물 팩은 온도만 오르므로(cmΔT가 작음) 금방 실패하고, 소금물 얼음은 −10 °C에서 녹아 음식이 얼 수 있어요. 정답은 하나가 아니에요(얼음 0.7~1.0 kg).',
        },
        {
          type: 'quiz', title: '끓는 물과 수증기의 화상',
          goal: '100 °C의 끓는 물과 100 °C의 수증기가 같은 질량만큼 피부에 닿으면 수증기가 더 위험해요. 그 까닭은?',
          setup() { setFlag('cal', false); setScene('mix'); },
          choices: ['수증기의 온도가 끓는 물보다 훨씬 높아서', '수증기가 물로 액화하면서 기화열(약 2260 kJ/kg)을 피부에 내놓아서', '수증기는 기체라서 피부 속으로 스며들어서', '수증기의 비열이 물보다 매우 커서'],
          answer: 1,
          feedback: ['둘 다 100 °C로 온도가 같아요. 달라지는 것은 액화할 때 내놓는 열이에요.', '', '피부 속으로 스며드는 것이 아니라 피부 표면에서 액화하며 열을 방출하는 것이 핵심이에요.', '수증기의 비열은 물보다 작아요(약 2000 J/(kg·K)). 핵심은 액화할 때 방출하는 기화열이에요.'],
          explain: '수증기가 피부에서 100 °C 물로 <b>액화</b>하면 m L<sub>v</sub>의 열을 내놓아요(1 g당 약 2260 J). 같은 질량의 100 °C 물은 식으면서 내놓는 열(c m ΔT)만 있어서 훨씬 적어요. 그래서 수증기 화상이 더 위험해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-latent-heat', mount: '#game', badge: '열량 박사', homeHref: '../../index.html#hm',
    featureLabels: { spec: '🧪 비열 · 같은 열 다른 온도', curve: '🔥 가열 곡선 · 입자 돋보기', calc: '🧮 구간별 열량 계산', mix: '🧊 열량계 · 열평형', pack: '🥪 보냉 팩 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('spec');
  pkCompute();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    spStep(dt); cuStep(dt); mxStep(dt); pkStep(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'spec': drawSpec(dt); break;
      case 'curve': drawCurve(dt); break;
      case 'calc': drawCalc(dt); break;
      case 'mix': drawMix(dt); break;
      default: drawPack(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, spRun, spFill, cuAt, cuRun, cuFill, mixCalc, mxRun, pkRun, pkGo, pkCompute, T1, T2, T3, T4, QT, Q1, Q2, Q3, Q4, dTfull,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { spStep(0.02); cuStep(0.02); mxStep(0.02); pkStep(0.02); } },
  };
})();
