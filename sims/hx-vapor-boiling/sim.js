/* =========================================================
   물질과 에너지 Ⅰ. 물질의 세 가지 상태 - 증기압과 끓는점 [12물에01-03]
   ① 관찰: 증기압 (밀폐 용기: 증발 = 응축인 동적 평형, 마노미터, 온도와 증기압)
   ② 분석: 증기압 곡선 (에터 · 에탄올 · 물, 760 mmHg와 만나는 온도 = 정상 끓는점)
   ③ 탐구: 압력과 끓는점 (외부 압력 = 증기압일 때 끓음, 산 위 · 압력솥)
   ④ 모형: 상평형 그림 (물과 CO₂의 고체 · 액체 · 기체 영역, 삼중점)
   클라우지우스-클라페이롱 식, 임계 현상의 설명, 상평형 그림의 정량 계산은 다루지 않아요.
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sgn = (v) => (v < 0 ? '−' : '') + Math.abs(v);
  const fmtP = (v) => (v < 100 ? v.toFixed(1) : String(Math.round(v)));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ================= 단조 3차 보간 (표의 값을 정확히 지나요) ================= */
  function pchip(xs, ys) {
    const n = xs.length, h = [], d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return (x) => {
      x = clamp(x, xs[0], xs[n - 1]); let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }
  const logCurve = (xs, ps) => { const f = pchip(xs, ps.map(Math.log)); return (x) => Math.exp(f(x)); };

  /* ================= 자료 (증기압, mmHg) ================= */
  const LIQ = {
    ether: { id: 'ether', nm: '다이에틸 에터', short: '에터', c: '#8b5cf6', tmax: 50, force: '수소 결합 없음 (분산력 · 약한 쌍극자)', tb: 35, t: [0, 10, 20, 30, 35, 40, 50], p: [185, 292, 442, 647, 760, 921, 1276] },
    ethanol: { id: 'ethanol', nm: '에탄올', short: '에탄올', c: '#f59e0b', tmax: 100, force: '수소 결합 (O–H)', tb: 78, t: [0, 10, 20, 30, 40, 50, 60, 70, 78, 90, 100], p: [12, 24, 44, 79, 135, 222, 352, 543, 760, 1187, 1693] },
    water: { id: 'water', nm: '물', short: '물', c: '#0ea5e9', tmax: 125, force: '수소 결합 (분자당 2개)', tb: 100, t: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 125], p: [4.6, 9.2, 17.5, 31.8, 55, 92.5, 149, 234, 355, 526, 760, 1075, 1489, 1740] },
  };
  const LK = ['ether', 'ethanol', 'water'];
  LK.forEach((k) => { const L = LIQ[k]; L.P = logCurve(L.t, L.p); L.Tmin = L.t[0]; });
  const Pw = (t) => LIQ.water.P(t);
  function Tbw(pmm) { let lo = 0, hi = 125; for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (Pw(mid) < pmm) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  const ATM = 760;

  /* ---------- 상평형 자료 (atm) ---------- */
  const PH = {
    water: {
      nm: '물', tp: { T: 0.01, P: 0.006 }, cp: { T: 374, P: 218 }, col: '#0ea5e9',
      vap: logCurve([0.01, 20, 40, 60, 80, 100, 120, 150, 200, 250, 300, 350, 374], [0.006, 0.0230, 0.0724, 0.196, 0.467, 1.0, 1.959, 4.76, 15.5, 39.2, 85.8, 165.2, 218]),
      sub: logCurve([-21, -15, -10, -5, 0.01], [0.00093, 0.00163, 0.00257, 0.00395, 0.006]),
      subT0: -21, fus: (P) => 0.01 - 0.0075 * (P - 0.006), slope: -1,
    },
    co2: {
      nm: '이산화 탄소', tp: { T: -57, P: 5.1 }, cp: { T: 31, P: 73 }, col: '#64748b',
      vap: logCurve([-57, -50, -40, -30, -20, -10, 0, 10, 20, 31], [5.1, 6.7, 10.0, 14.3, 19.7, 26.1, 34.0, 44.0, 56.5, 73.0]),
      sub: (t) => Math.exp(-3188 * (1 / (t + 273.15) - 1 / 194.65)), subT0: -140,
      fus: (P) => -57 + 0.02 * (P - 5.1), slope: 1,
    },
  };
  const TR = [-100, 400], LP = [-3, 3];
  const stateOf = (sub, T, P) => {
    const d = PH[sub], Ptp = d.tp.P, Ttp = d.tp.T;
    if (P >= Ptp) {
      if (T <= d.fus(P)) return 'solid';
      if (T < d.cp.T && P >= d.vap(T)) return 'liquid';
      return 'gas';
    }
    if (T < Ttp) { if (T < d.subT0) return 'solid'; return P > d.sub(T) ? 'solid' : 'gas'; }
    return 'gas';
  };

  /* ---------- 배치 ---------- */
  const RC = {
    vap: { L: PHONE ? { x: 8, y: 50, w: 464, h: 548 } : { x: 12, y: 50, w: 470, h: 498 }, R: PHONE ? { x: 8, y: 606, w: 464, h: 332 } : { x: 490, y: 50, w: 298, h: 498 } },
    curve: { L: PHONE ? { x: 8, y: 50, w: 464, h: 700 } : { x: 12, y: 50, w: 776, h: 498 } },
    press: { L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 }, R: PHONE ? { x: 8, y: 558, w: 464, h: 380 } : { x: 490, y: 50, w: 298, h: 498 } },
    phase: { L: PHONE ? { x: 8, y: 50, w: 464, h: 460 } : { x: 12, y: 50, w: 520, h: 498 }, R: PHONE ? { x: 8, y: 518, w: 464, h: 420 } : { x: 540, y: 50, w: 248, h: 498 } },
  };
  const MODE_LABEL = { vap: '🧪 밀폐 용기 속 증기압', curve: '📈 세 액체의 증기압 곡선', press: '🌡️ 외부 압력과 끓는점', phase: '🗺️ 물질의 상평형 그림' };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'vap', fade: 0, lock: false, gate: '', t: 0, sub: { phase: 'water' },
    vap: { T: 20, Td: 20, Pd: 0, nLiq: 70, gas: [], exch: 0, evT: [], coT: [], spawnT: 0, absT: 0, eqT: 0, eq: false, rec: {}, pulse: 0 },
    curve: { show: { ether: true, ethanol: true, water: true }, ap: { ether: 0, ethanol: 0, water: 0 }, Tc: 20, found: {}, sawAt20: false, drag: false },
    press: { P: 1.0, Tset: 25, Teff: 25, found: {}, boilT: 0, bubs: [], bubR: 4, emit: 0 },
    phase: { T: -50, P: 1.0, drag: false, seen: [], co2sub: false, co2liq: false, md: null, st: 'solid', tpulse: 0 },
  };
  let game = null;

  /* ================= 입자 상자 (분자 모형, 2차원) ================= */
  const TAU_S = 0.15, GW = 15, GH = 17;
  function makeMD(N, W, H) {
    const m = { N, W, H, x: new Float64Array(N), y: new Float64Array(N), vx: new Float64Array(N), vy: new Float64Array(N), fx: new Float64Array(N), fy: new Float64Array(N), lx: new Float64Array(N), ly: new Float64Array(N), spin: new Float64Array(N), ang: new Float64Array(N), eps: 1, kT: 0.4, g: 0.03, acc: 0, latk: 0 };
    const cols = Math.max(2, Math.floor((W - 2) / 1.25));
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      m.x[i] = 1 + c * 1.25 + (r % 2) * 0.6; m.y[i] = H - 1 - r * 1.1;
      const a = rnd(0, TAU), v = Math.sqrt(0.4) * rnd(0.6, 1.4); m.vx[i] = Math.cos(a) * v; m.vy[i] = Math.sin(a) * v;
      m.spin[i] = rnd(-1.6, 1.6); m.ang[i] = rnd(0, TAU);
    }
    // 격자 자리 (고체 상태에서 붙잡아 줄 자리, 입자 번호는 위치 순서로 짝지어요)
    const sites = []; for (let i = 0; i < N; i++) { const c = i % cols, r = Math.floor(i / cols); sites.push([1.2 + c * 1.3 + (r % 2) * 0.65, H - 1.2 - r * 1.12]); }
    m.sites = sites;
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
    if (m.latk > 0) for (let i = 0; i < N; i++) { fx[i] += m.latk * (m.lx[i] - x[i]); fy[i] += m.latk * (m.ly[i] - y[i]); }
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
    if (m.latk > 0) { const dmp = 1 - Math.min(0.5, 5 * h); for (let i = 0; i < N; i++) { vx[i] *= dmp; vy[i] *= dmp; } }
  }
  function mdAdvance(m, dt) {
    m.acc += dt / TAU_S; let n = 0;
    while (m.acc >= 0.01 && n < 14) { mdStep(m, 0.01); m.acc -= 0.01; n++; }
    if (m.acc > 0.2) m.acc = 0;
    for (let i = 0; i < m.N; i++) m.ang[i] += m.spin[i] * dt;
  }
  function assignSites(m) {            // 위쪽 줄부터 가까운 자리로 짝지어요
    const idx = Array.from({ length: m.N }, (_, i) => i).sort((a, b) => (m.y[a] - m.y[b]) || (m.x[a] - m.x[b]));
    const sites = m.sites.slice().sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
    idx.forEach((pi, k) => { m.lx[pi] = sites[k][0]; m.ly[pi] = sites[k][1]; });
  }
  function mdWarm(m, tau) { const n = Math.round(tau / 0.01); for (let i = 0; i < n; i++) mdStep(m, 0.01); }

  function bentMol(x, y, ang, s, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    const R0 = 5.6 * s, r1 = 2.7 * s, d = 4.9 * s;
    D.sphere(Math.cos(0.95) * d, Math.sin(0.95) * d, r1, '#f1f5f9', { gloss: false });
    D.sphere(Math.cos(-0.95) * d, Math.sin(-0.95) * d, r1, '#f1f5f9', { gloss: false });
    D.sphere(0, 0, R0, col, { gloss: R0 > 4 });
    ctx.restore();
  }
  function linMol(x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    D.sphere(-6.2 * s, 0, 3.2 * s, '#e2464b', { gloss: false }); D.sphere(6.2 * s, 0, 3.2 * s, '#e2464b', { gloss: false }); D.sphere(0, 0, 3.6 * s, '#64748b', { gloss: s > 0.9 });
    ctx.restore();
  }

  /* ================= ① 증기압: 밀폐 용기 ================= */
  const U_MM = 4;                                   // 기체 분자 1개 ≈ 4 mmHg (그림의 눈금)
  const P_REF = 160;                                // 마노미터 눈금의 끝 (mmHg)
  const vapGeo = () => {
    const L = RC.vap.L;
    if (PHONE) return { cx: L.x + 18, cy: L.y + 78, cw: 250, ch: 246, mx: L.x + 330, my: L.y + 78, mh: 230, ex: L.x + 16, ey: L.y + 392 };
    return { cx: L.x + 26, cy: L.y + 78, cw: 256, ch: 244, mx: L.x + 352, my: L.y + 78, mh: 236, ex: L.x + 16, ey: L.y + 362 };
  };
  const RP = 6.2;
  const liqCols = () => Math.floor(vapGeo().cw / (2 * RP + 1));
  const surfY = () => { const g = vapGeo(), cols = liqCols(), rows = Math.ceil(S.vap.nLiq / cols); return g.ch - rows * (2 * RP * 0.9) - 4; };
  const slotPos = (i) => { const g = vapGeo(), cols = liqCols(), r = Math.floor(i / cols), c = i % cols, rows = Math.ceil(S.vap.nLiq / cols); void rows; return [8 + RP + c * (2 * RP + 1) + (r % 2) * 3, g.ch - RP - 2 - r * (2 * RP * 0.9)]; };
  function vapReset(emptyVapor) {
    const v = S.vap; v.gas = []; v.exch = 0; v.evT = []; v.coT = []; v.spawnT = 0; v.absT = 0; v.eqT = 0; v.eq = false; v.Pd = 0; v.nLiq = 70; v.Td = v.T;
  }
  const vapSpeed = () => (PHONE ? 62 : 74) * Math.sqrt((S.vap.Td + 273) / 293);
  function vapSpawn() {
    const v = S.vap, i = Math.max(0, v.nLiq - 1), sp = slotPos(i), th = rnd(-2.5, -0.65), s = vapSpeed() * rnd(0.8, 1.2);
    v.nLiq = Math.max(1, v.nLiq - 1);
    v.gas.push({ x: sp[0], y: sp[1] - 4, vx: Math.cos(th) * s, vy: Math.sin(th) * s, ab: false, fade: 0, ang: rnd(0, TAU), spin: rnd(-2, 2) });
    v.evT.push(S.t); v.pulse = 1;
  }
  function vapAbsorb(preferLow) {
    const v = S.vap, live = v.gas.filter((p) => !p.ab); if (!live.length) return false;
    live.sort((a, b) => b.y - a.y); const p = preferLow ? live[0] : live[Math.floor(Math.random() * live.length)];
    p.ab = true; v.coT.push(S.t); return true;
  }
  function stepVap(dt) {
    const v = S.vap, g = vapGeo();
    v.Td = SciSim.approach(v.Td, v.T, dt, 3); if (Math.abs(v.Td - v.T) < 0.05) v.Td = v.T;
    const Peq = LIQ.water.P(v.Td);
    v.Pd = SciSim.approach(v.Pd, Peq, dt, 1.0); if (Math.abs(v.Pd - Peq) < 0.004 * Peq) v.Pd = Peq;
    const target = Math.round(v.Pd / U_MM);
    let live = v.gas.filter((p) => !p.ab).length;
    v.spawnT -= dt; v.absT -= dt;
    if (live < target && v.spawnT <= 0 && v.nLiq > 3) { vapSpawn(); v.spawnT = 0.06; live++; }
    else if (live > target && v.absT <= 0) { if (vapAbsorb(true)) v.absT = 0.06; }
    // 평형에서는 증발과 응축이 같은 속도로 계속 일어나요
    if (live >= 1 && Math.abs(live - target) <= 1) {
      v.exch += (0.9 + 0.22 * target) * dt;
      while (v.exch >= 1) { v.exch -= 1; if (vapAbsorb(false)) { if (v.nLiq > 3) vapSpawn(); } }
    }
    // 기체 입자 움직임
    const sy = surfY(), spd = vapSpeed();
    for (let i = v.gas.length - 1; i >= 0; i--) {
      const p = v.gas[i];
      if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 5);
      p.ang += p.spin * dt;
      if (p.ab) {
        const tx = p.x + (slotPos(v.nLiq)[0] - p.x) * 0.25, ty = sy;
        p.x += (tx - p.x) * Math.min(1, dt * 4); p.y += 120 * dt; p.vx = 0; p.vy = 0;
        if (p.y >= sy - 2) { v.gas.splice(i, 1); v.nLiq++; }
        continue;
      }
      const k = spd / Math.max(1, Math.hypot(p.vx, p.vy)); p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 6) { p.x = 6; p.vx = Math.abs(p.vx); } else if (p.x > g.cw - 6) { p.x = g.cw - 6; p.vx = -Math.abs(p.vx); }
      if (p.y < 6) { p.y = 6; p.vy = Math.abs(p.vy); } else if (p.y > sy - 5) { p.y = sy - 5; p.vy = -Math.abs(p.vy); }
    }
    v.evT = v.evT.filter((t0) => S.t - t0 < 3); v.coT = v.coT.filter((t0) => S.t - t0 < 3);
    const okNow = Math.abs(v.Pd - Peq) < 1e-6 && Math.abs(live - target) <= 1 && v.nLiq > 0;
    v.eqT = okNow ? v.eqT + dt : 0; v.eq = v.eqT > 1.2;
    v.pulse = Math.max(0, v.pulse - dt * 4);
  }
  const rateOf = (arr) => arr.filter((t0) => S.t - t0 < 3).length / 3;
  function drawEnergy(R0, x, y, w, h, Tc) {
    // 에너지 분포 (모식도): f(E) ∝ √E · exp(−E/kT), 문턱 에너지 이상인 분자의 비율 = 색칠한 면적
    const E_TH = 4.5, EMAX = 9, kT = (Tc + 273) / 293;
    D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    const px = x + 12, pw = w - 24, py = y + 26, ph = h - 56;
    const f = (E, kt) => Math.sqrt(E) * Math.exp(-E / kt) / (Math.sqrt(Math.PI) / 2 * Math.pow(kt, 1.5));
    const X = (E) => px + E / EMAX * pw, Y = (v) => py + ph - clamp(v, 0, 0.62) / 0.62 * ph;
    ctx.save(); ctx.beginPath(); ctx.moveTo(X(E_TH), Y(0));
    for (let e = E_TH; e <= EMAX + 0.01; e += 0.1) ctx.lineTo(X(e), Y(f(e, kT)));
    ctx.lineTo(X(EMAX), Y(0)); ctx.closePath(); ctx.fillStyle = 'rgba(226,70,75,.38)'; ctx.fill(); ctx.restore();
    [[1.0, 'rgba(120,130,150,.35)'], [(60 + 273) / 293, 'rgba(120,130,150,.35)']].forEach(([k0, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.beginPath(); for (let e = 0.02; e <= EMAX; e += 0.1) { const yy = Y(f(e, k0)); if (e < 0.03) ctx.moveTo(X(e), yy); else ctx.lineTo(X(e), yy); } ctx.stroke(); ctx.setLineDash([]); });
    ctx.strokeStyle = BLU; ctx.lineWidth = 3; ctx.beginPath(); for (let e = 0.02; e <= EMAX; e += 0.05) { const yy = Y(f(e, kT)); if (e < 0.03) ctx.moveTo(X(e), yy); else ctx.lineTo(X(e), yy); } ctx.stroke();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    ctx.strokeStyle = BAD; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(E_TH), py - 2); ctx.lineTo(X(E_TH), py + ph); ctx.stroke(); ctx.setLineDash([]);
    T(X(E_TH) + 4, py + 10, '증발할 수 있는', 12.5, BAD, 'left', 800); T(X(E_TH) + 4, py + 25, '문턱 에너지', 12.5, BAD, 'left', 800);
    T(px + pw, py + ph + 18, '분자의 운동 에너지 →', 12.5, MUTED, 'right', 800);
    T(px, py + ph + 18, '(모식도)', 12.5, MUTED, 'left', 700);
    T(x + 12, y + 18, '운동 에너지 분포 · ' + Math.round(Tc) + ' °C', 13, INK, 'left', 800);
  }
  function drawVap(t) {
    const L = RC.vap.L, Rr = RC.vap.R, v = S.vap, g = vapGeo();
    T(14, 26, MODE_LABEL.vap, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 28, '🧪 뚜껑을 닫은 용기와 마노미터 (물, ' + Math.round(v.Td) + ' °C)', 14.5, INK, 'left', 800);
    // 항온 수조
    const hot = clamp((v.Td - 20) / 40, 0, 1);
    D.roundRect(g.cx - 12, g.cy + 20, g.cw + 24, g.ch + 32, 14); ctx.fillStyle = C.mix('#cfe8ff', '#ffd9b0', hot); ctx.fill(); ctx.strokeStyle = '#9db4d6'; ctx.lineWidth = 2; ctx.stroke();
    T(g.cx - 4, g.cy + g.ch + 46, '항온 수조 ' + Math.round(v.Td) + ' °C', 13, '#4a5b78', 'left', 800);
    // 용기
    ctx.fillStyle = 'rgba(240,247,255,.9)'; D.roundRect(g.cx, g.cy, g.cw, g.ch, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(g.cx, g.cy, g.cw, g.ch); ctx.clip();
    const sy = surfY();
    const lg = ctx.createLinearGradient(0, g.cy + sy, 0, g.cy + g.ch); lg.addColorStop(0, 'rgba(100,190,255,.55)'); lg.addColorStop(1, 'rgba(60,140,230,.7)');
    ctx.fillStyle = lg; ctx.fillRect(g.cx, g.cy + sy, g.cw, g.ch - sy);
    for (let i = 0; i < v.nLiq; i++) { const p = slotPos(i), wob = RM ? 0 : Math.sin(t * 3 + i * 1.7) * 0.9; bentMol(g.cx + p[0] + wob, g.cy + p[1] + Math.cos(t * 2.6 + i) * (RM ? 0 : 0.7), i * 0.9, 0.95, '#38bdf8'); }
    v.gas.forEach((p) => bentMol(g.cx + p.x, g.cy + p.y, p.ang, 1.05, '#0ea5e9', p.fade));
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(g.cx, g.cy, g.cw, g.ch, 8); ctx.stroke();
    D.roundRect(g.cx - 4, g.cy - 10, g.cw + 8, 12, 5); ctx.fillStyle = '#94a3b8'; ctx.fill();   // 뚜껑
    T(g.cx + g.cw / 2, g.cy - 16, '뚜껑 닫힘 · 용기 속 공기는 뺐어요', 12.5, MUTED, 'center', 700);
    // 증발 · 응축 화살표
    // 배관과 마노미터
    const pipeY = g.cy + g.ch * 0.4;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.cx + g.cw, pipeY); ctx.lineTo(g.mx, pipeY); ctx.lineTo(g.mx, g.my + g.mh); ctx.stroke(); ctx.lineCap = 'butt';
    const aw = 34, lx = g.mx, rx = g.mx + 46, top = g.my, bot = g.my + g.mh;
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx - 7, top + 14); ctx.lineTo(lx - 7, bot); ctx.arc((lx + rx) / 2, bot, (rx - lx) / 2 + 7, Math.PI, 0, true); ctx.lineTo(rx + 7, top + 14); ctx.stroke();
    const dh = clamp(v.Pd, 0, 180) * 0.9;            // 높이 차 (px) = 증기압 (1 mmHg = 0.9 px)
    const base = top + 100;
    const yL = base + dh / 2, yR = base - dh / 2;
    ctx.fillStyle = '#9aa3b2'; ctx.fillRect(lx - 5, yL, 10, bot - yL); ctx.fillRect(rx - 5, yR, 10, bot - yR);
    ctx.beginPath(); ctx.arc((lx + rx) / 2, bot, (rx - lx) / 2 + 5, Math.PI, 0, true); ctx.arc((lx + rx) / 2, bot, (rx - lx) / 2 - 5, 0, Math.PI, false); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(lx - 3, yL, 2, 5); ctx.fillRect(rx - 3, yR, 2, 5);
    ctx.fillStyle = 'rgba(180,190,210,.35)'; ctx.fillRect(rx - 5, top + 14, 10, yR - top - 14);     // 닫힌 쪽 진공
    T(rx, top + 8, '진공', 12.5, MUTED, 'center', 700);
    // 높이 차를 보여 주는 화살표
    D.arrow(rx + 20, yL, rx + 20, yR, { color: BAD, width: 2.5, head: 9 });
    D.label(rx + 20, (yL + yR) / 2, fmtP(v.Pd) + ' mmHg', { size: 13, bg: '#0b3a7a', align: 'right', pad: 6 });
    T(g.mx + 23, bot + 28, '마노미터', 13, INK, 'center', 800);
    // 증발 · 응축 계기
    const ey = g.ey, bw = L.w - 190;
    const re = rateOf(v.evT), rc = rateOf(v.coT);
    const row = (yy, lab, r, col) => {
      T(g.ex, yy + 15, lab, 13.5, col, 'left', 800);
      D.roundRect(g.ex + 98, yy + 2, bw, 18, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(g.ex + 98, yy + 2, bw, 18, 8); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(g.ex + 98, yy + 2, bw * clamp(r / 12, 0, 1), 18); ctx.restore();
      T(g.ex + 98 + bw + 8, yy + 16, f1(r) + ' 개/초', 13, INK, 'left', 800);
    };
    row(ey, '↑ 증발', re, '#f59e0b'); row(ey + 28, '↓ 응축', rc, '#3867f4');
    D.roundRect(g.ex, ey + 62, PHONE ? 440 : 440, 30, 15); ctx.fillStyle = v.eq ? '#e6f7ee' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = v.eq ? GOOD : '#c9d2df'; ctx.lineWidth = 2; ctx.stroke();
    T(g.ex + 220, ey + 82, v.eq ? '⚖️ 동적 평형: 증발 속도 = 응축 속도, 압력 일정' : '아직 평형이 아니에요 (증발이 더 많거나 응축이 더 많아요)', 13, v.eq ? '#14803f' : MUTED, 'center', 800);
    // 오른쪽 패널
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    drawEnergy(null, Rr.x + 10, Rr.y + 10, Rr.w - 20, PHONE ? 190 : 214, v.Td);
    const y0 = Rr.y + (PHONE ? 214 : 240);
    T(Rr.x + 14, y0 + 20, '증기압 (물, ' + Math.round(v.Td) + ' °C)', 14, INK, 'left', 800);
    T(Rr.x + 14, y0 + 54, fmtP(v.Pd) + ' mmHg', 28, v.eq ? '#14803f' : INK, 'left', 800);
    T(Rr.x + Rr.w - 14, y0 + 54, '≈ ' + (v.Pd / ATM).toFixed(3) + ' atm', 13.5, MUTED, 'right', 800);
    T(Rr.x + 14, y0 + 82, '📝 기록 (평형일 때만)', 13.5, INK, 'left', 800);
    [20, 40, 60].forEach((tt, i) => {
      const yy = y0 + 92 + i * 28, rec = v.rec[tt];
      D.roundRect(Rr.x + 12, yy, Rr.w - 24, 24, 10); ctx.fillStyle = rec ? '#e6f7ee' : '#f1f5f9'; ctx.fill();
      T(Rr.x + 22, yy + 17, tt + ' °C', 13.5, INK, 'left', 800); T(Rr.x + Rr.w - 22, yy + 17, rec ? fmtP(rec) + ' mmHg ✅' : '—', 13.5, rec ? '#14803f' : MUTED, 'right', 800);
    });
  }
  [20, 40, 60].forEach((tt) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = tt; bt.textContent = tt + ' °C'; $('#vTChips').appendChild(bt); });
  $('#vTChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.vap.T = +bt.dataset.v; updateCtl(); });
  $('#bMore').addEventListener('click', () => { const v = S.vap; Sound.click(); if (v.nLiq + v.gas.length >= 150) { showHint('용기가 가득 찼어요. ↺ 단추로 처음부터 해요.', 3000); return; } v.nLiq += 15; });
  $('#bRec').addEventListener('click', () => {
    const v = S.vap; if (!v.eq) return; Sound.success(); v.rec[v.T] = v.Pd; if (!RM) parts.burst(RC.vap.R.x + 60, RC.vap.R.y + 300, { count: 10, speed: 120, life: 0.6 }); updateCtl();
  });
  let hintTimer = 0;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
