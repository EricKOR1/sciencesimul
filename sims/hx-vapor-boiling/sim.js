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
    vap: { L: PHONE ? { x: 8, y: 50, w: 464, h: 548 } : { x: 12, y: 50, w: 470, h: 498 }, R: PHONE ? { x: 8, y: 606, w: 464, h: 346 } : { x: 490, y: 50, w: 298, h: 498 } },
    curve: { L: PHONE ? { x: 8, y: 50, w: 464, h: 700 } : { x: 12, y: 50, w: 776, h: 498 } },
    press: { L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 }, R: PHONE ? { x: 8, y: 558, w: 464, h: 392 } : { x: 490, y: 50, w: 298, h: 498 } },
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
    if (PHONE) return { cx: L.x + 18, cy: L.y + 78, cw: 250, ch: 246, mx: L.x + 330, my: L.y + 78, mh: 230, ex: L.x + 16, ey: L.y + 404 };
    return { cx: L.x + 26, cy: L.y + 78, cw: 256, ch: 244, mx: L.x + 352, my: L.y + 78, mh: 236, ex: L.x + 16, ey: L.y + 386 };
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
    v.eqT = okNow ? v.eqT + dt : 0; const eqNew = v.eqT > 1.2; if (eqNew !== v.eq) { v.eq = eqNew; updateCtl(); }
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
    drawEnergy(null, Rr.x + 10, Rr.y + 10, Rr.w - 20, PHONE ? 142 : 214, v.Td);
    const y0 = Rr.y + (PHONE ? 158 : 240);
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

  /* ================= ② 증기압 곡선 ================= */
  const cRect = () => {
    const L = RC.curve.L;
    if (PHONE) return { plot: { x: L.x + 62, y: L.y + 50, w: 388, h: 330 }, info: { x: L.x + 10, y: L.y + 452, w: 444, h: L.h - 462 } };
    return { plot: { x: L.x + 76, y: L.y + 50, w: 470, h: 350 }, info: { x: L.x + 566, y: L.y + 44, w: 198, h: L.h - 56 } };
  };
  const CY = 1800, CXM = 120;
  const cX = (P, t) => P.x + t / CXM * P.w, cY = (P, v) => P.y + P.h - clamp(v, 0, CY) / CY * P.h;
  const cTb = (k) => LIQ[k].tb;
  const nearBoil = (k, Tc) => S.curve.show[k] && Tc >= LIQ[k].Tmin && Tc <= LIQ[k].tmax && Math.abs(LIQ[k].P(Tc) - ATM) <= 30;
  function stepCurve(dt) {
    const c = S.curve;
    LK.forEach((k) => { c.ap[k] = SciSim.approach(c.ap[k], c.show[k] ? 1 : 0, dt, 3); if (Math.abs(c.ap[k] - (c.show[k] ? 1 : 0)) < 0.01) c.ap[k] = c.show[k] ? 1 : 0; });
    if (S.mode === 'curve') LK.forEach((k) => { if (c.ap[k] > 0.95 && nearBoil(k, c.Tc) && !c.found[k]) { c.found[k] = true; Sound.success(); const P = cRect().plot; if (!RM) parts.burst(cX(P, cTb(k)), cY(P, ATM), { count: 14, speed: 140, life: 0.7, colors: [LIQ[k].c, '#fff', '#ffb400'], gravity: 160 }); } });
    if (S.mode === 'curve' && c.Tc === 20 && LK.every((k) => c.show[k] && c.ap[k] > 0.95)) c.sawAt20 = true;
  }
  function drawCurve(t) {
    const L = RC.curve.L, c = S.curve, R0 = cRect(), P = R0.plot;
    T(14, 26, MODE_LABEL.curve, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 16, L.y + 28, '온도(가로)에 따른 증기압(세로)', 14.5, INK, 'left', 800);
    D.roundRect(P.x, P.y, P.w, P.h, 8); ctx.fillStyle = '#fbfcff'; ctx.fill();
    for (let v = 0; v <= CY; v += 300) {
      const y = cY(P, v); ctx.strokeStyle = v === 0 ? '#8a95a8' : '#e3e8f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, y); ctx.lineTo(P.x + P.w, y); ctx.stroke(); T(P.x - 8, y + 4.5, String(v), 12.5, MUTED, 'right', 700);
    }
    for (let tt = 0; tt <= CXM; tt += 20) { const x = cX(P, tt); ctx.strokeStyle = '#e3e8f2'; ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); T(x, P.y + P.h + 18, String(tt), 12.5, MUTED, 'center', 700); }
    T(P.x + P.w / 2, P.y + P.h + 38, '온도 (°C)', 13, MUTED, 'center', 800); T(L.x + 14, P.y - 10, '증기압(mmHg)', 12.5, MUTED, 'left', 800);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; D.roundRect(P.x, P.y, P.w, P.h, 8); ctx.stroke();
    // 외부 압력 760 mmHg
    const y760 = cY(P, ATM);
    ctx.strokeStyle = BAD; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(P.x, y760); ctx.lineTo(P.x + P.w, y760); ctx.stroke(); ctx.setLineDash([]);
    D.label(P.x + 8, y760 - 14, '외부 압력 1 atm = 760 mmHg', { size: 12.5, bg: BAD, align: 'left' });
    // 곡선
    LK.forEach((k) => {
      const q = LIQ[k], ap = c.ap[k]; if (ap < 0.02) return;
      const tmaxD = Math.min(q.tmax, CXM), tEnd = q.Tmin + (tmaxD - q.Tmin) * sm(ap);
      ctx.save(); ctx.globalAlpha = Math.min(1, ap * 1.2); ctx.strokeStyle = q.c; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let tt = q.Tmin; tt <= tEnd + 1e-6; tt += 1) { const x = cX(P, tt), y = cY(P, q.P(tt)); if (tt === q.Tmin) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
      if (ap > 0.9) T(cX(P, tmaxD) - 4, cY(P, q.P(tmaxD)) - 10, q.short, 13.5, q.c, 'right', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
    });
    // 찾은 끓는점
    LK.forEach((k) => {
      if (!c.found[k]) return; const x = cX(P, cTb(k)), y = y760;
      D.glow(x, y, 20, LIQ[k].c, 0.5); D.sphere(x, y, 7, LIQ[k].c, { gloss: true, outline: '#fff' });
      ctx.strokeStyle = LIQ[k].c; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
      D.label(x, P.y + P.h - 40, cTb(k) + ' °C', { size: 12.5, bg: LIQ[k].c, align: 'center' });
    });
    // 눈금 (세로선)
    const cx = cX(P, c.Tc);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, P.y); ctx.lineTo(cx, P.y + P.h); ctx.stroke();
    D.roundRect(cx - 12, P.y + P.h - 2, 24, 14, 5); ctx.fillStyle = INK; ctx.fill();
    LK.forEach((k) => { const q = LIQ[k]; if (c.ap[k] < 0.95 || c.Tc < q.Tmin || c.Tc > q.tmax) return; D.sphere(cx, cY(P, q.P(c.Tc)), 6.5, q.c, { gloss: true, outline: '#fff' }); });
    T(cx, P.y - 8, c.Tc + ' °C', 13.5, INK, 'center', 800);
    // 정보 칸
    const I = R0.info;
    D.roundRect(I.x, I.y, I.w, I.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.6; ctx.stroke();
    T(I.x + 14, I.y + 26, c.Tc + ' °C의 증기압', 14.5, INK, 'left', 800);
    LK.forEach((k, i) => {
      const q = LIQ[k], y = I.y + 44 + i * (PHONE ? 62 : 80), on = c.show[k], inr = c.Tc >= q.Tmin && c.Tc <= q.tmax;
      D.sphere(I.x + 20, y + 12, 6, q.c, { gloss: false });
      T(I.x + 32, y + 17, q.short, 14, q.c, 'left', 800);
      T(I.x + I.w - 14, y + 17, !on ? '(숨김)' : inr ? fmtP(q.P(c.Tc)) + ' mmHg' : '데이터 없음', 14, on && inr ? INK : MUTED, 'right', 800);
      const fh = textBlock(I.x + 32, y + 35, I.w - 46, q.force, 12.5, MUTED, 15, 700);
      if (c.found[k]) T(I.x + 32, y + 35 + fh + 2, '끓는점 ' + cTb(k) + ' °C ✅', 12.5, '#14803f', 'left', 800);
    });
    const ny = I.y + 44 + 3 * (PHONE ? 62 : 80) + 6;
    textBlock(I.x + 14, ny + 6, I.w - 28, c.Tc === 20 ? '20 °C: 분자 간 힘이 작을수록 증기압이 커요. 에터 > 에탄올 > 물' : '증기압이 760 mmHg와 같아지는 온도가 정상 끓는점이에요.', 13, '#5b21b6', 18, 800);
  }
  LK.forEach((k) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = k; bt.innerHTML = '<span style="color:' + LIQ[k].c + '">●</span> ' + LIQ[k].short; $('#cChips').appendChild(bt); });
  $('#cChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); S.curve.show[bt.dataset.v] = !S.curve.show[bt.dataset.v]; updateCtl(); });
  const setCT = (v) => { S.curve.Tc = clamp(Math.round(v), 0, 120); updateCtl(); };
  $('#sCT').addEventListener('input', (e) => setCT(+e.target.value));
  $('#ctMinus').addEventListener('click', () => { Sound.tick(); setCT(S.curve.Tc - 1); });
  $('#ctPlus').addEventListener('click', () => { Sound.tick(); setCT(S.curve.Tc + 1); });

  /* ================= ③ 압력과 끓는점 ================= */
  const PRESETS = [['일반 1 atm', 1.0], ['산 위 0.70', 0.70], ['에베레스트 0.33', 0.33], ['압력솥 2.00', 2.0]];
  const pMM = () => S.press.P * ATM;
  const pTb = () => Tbw(pMM());
  const pBoil = () => S.press.Tset >= pTb() - 0.05;
  function stepPress(dt) {
    const p = S.press, tb = pTb(), tgt = Math.min(p.Tset, tb);
    p.Teff = SciSim.approach(p.Teff, tgt, dt, 6); if (Math.abs(p.Teff - tgt) < 0.03) p.Teff = tgt;
    const boil = p.Tset >= tb - 0.05 && Math.abs(p.Teff - tb) < 0.15;
    p.boilT = boil ? p.boilT + dt : 0;
    const Pv = Pw(p.Teff), ratio = Pv / pMM();
    const rt = boil ? 13 + Math.min(10, (p.Tset - tb) * 1.2) : clamp(ratio, 0, 1) * 5;
    p.bubR = SciSim.approach(p.bubR, rt, dt, 5);
    if (S.mode === 'press' && boil && !RM) {
      p.emit += dt * (4 + Math.min(10, (p.Tset - tb) * 1.5));
      const g = pressGeo();
      while (p.emit >= 1) { p.emit -= 1; p.bubs.push({ x: g.px + 40 + Math.random() * (g.pw - 80), y: g.py + g.ph - 18, r: rnd(3.5, 7.5), vy: rnd(70, 110), ph: rnd(0, TAU) }); }
    }
    for (let i = p.bubs.length - 1; i >= 0; i--) { const b = p.bubs[i]; b.y -= b.vy * dt; b.x += Math.sin(b.ph + b.y * 0.05) * 14 * dt; b.r += dt * 1.6; if (b.y < pressGeo().wy) p.bubs.splice(i, 1); }
    if (p.bubs.length > 60) p.bubs.splice(0, p.bubs.length - 60);
    // 찾은 끓는점 기록
    if (p.boilT > 1.0) {
      if (Math.abs(p.P - 0.70) < 0.0051 && !p.found.p70) { p.found.p70 = Math.round(tb * 10) / 10; Sound.success(); }
      if (Math.abs(p.P - 2.0) < 0.0051 && !p.found.p2) { p.found.p2 = Math.round(tb * 10) / 10; Sound.success(); }
    }
  }
  const pressGeo = () => {
    const L = RC.press.L;
    const pw = PHONE ? 230 : 250, ph = PHONE ? 190 : 210, px = L.x + (PHONE ? 30 : 36), py = L.y + (PHONE ? 148 : 160);
    return { px, py, pw, ph, wy: py + 52, tx: px + pw + (PHONE ? 70 : 76) };
  };
  function drawPress(t) {
    const L = RC.press.L, Rr = RC.press.R, p = S.press, g = pressGeo(), Pm = pMM(), tb = pTb(), boil = p.boilT > 0.05, Pv = Pw(p.Teff);
    T(14, 26, MODE_LABEL.press, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 28, '🍲 물을 가열하며 끓는 때를 찾아요', 14.5, INK, 'left', 800);
    // 외부 압력 화살표
    const aw = 3 + Pm / 1520 * 7, ax0 = [g.px + g.pw * 0.2, g.px + g.pw * 0.5, g.px + g.pw * 0.8];
    ax0.forEach((x, i) => D.arrow(x, L.y + 58, x, g.py - 6 + 0, { color: BLU, width: aw, head: 8 + aw, alpha: 0.9 }));
    D.label(g.px + g.pw / 2, L.y + 46, '외부 압력 ' + Math.round(Pm) + ' mmHg (' + p.P.toFixed(2) + ' atm)', { size: 13, bg: BLU, align: 'center' });
    // 뚜껑
    D.roundRect(g.px - 10, g.py - 6, g.pw + 20, 12, 5); ctx.fillStyle = '#94a3b8'; ctx.fill();
    // 냄비
    const wl = g.wy;
    ctx.save(); D.roundRect(g.px, g.py, g.pw, g.ph, 12); ctx.clip();
    ctx.fillStyle = 'rgba(245,249,255,.9)'; ctx.fillRect(g.px, g.py, g.pw, g.ph);
    const lg = ctx.createLinearGradient(0, wl, 0, g.py + g.ph); lg.addColorStop(0, 'rgba(120,200,255,.6)'); lg.addColorStop(1, 'rgba(60,150,235,.8)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(g.px, wl); for (let i = 0; i <= 24; i++) ctx.lineTo(g.px + g.pw * i / 24, wl + Math.sin(t * 2 + i * 0.7) * (boil ? 2.4 : 1)); ctx.lineTo(g.px + g.pw, g.py + g.ph); ctx.lineTo(g.px, g.py + g.ph); ctx.closePath(); ctx.fill();
    p.bubs.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); });
    // 바닥의 기포 (증기압 = 외부 압력이면 커져요)
    [0.3, 0.55, 0.78].forEach((fx, i) => { const r = p.bubR * (0.75 + 0.25 * Math.sin(t * 6 + i * 2)) * (boil ? 1 : 0.9) * (i === 1 ? 1 : 0.8); const bx = g.px + g.pw * fx, by = g.py + g.ph - 8 - r; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, Math.max(1.5, r), 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); });
    ctx.restore();
    ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3.4; D.roundRect(g.px, g.py, g.pw, g.ph, 12); ctx.stroke();
    // 불꽃
    const fs = clamp((p.Tset - 20) / 105, 0, 1) * 60 + (p.Tset > 25 ? 10 : 0);
    if (fs > 0) [g.px + g.pw * 0.3, g.px + g.pw * 0.5, g.px + g.pw * 0.7].forEach((x, i) => D.flame(x, g.py + g.ph + 40, fs * (i === 1 ? 1 : 0.75), t + i));
    D.roundRect(g.px + 10, g.py + g.ph + 40, g.pw - 20, 8, 4); ctx.fillStyle = '#64748b'; ctx.fill();
    // 온도계
    D.thermometer(g.tx, g.py + 10, g.ph - 40, p.Teff, 20, 125, { step: 20 });
    T(g.tx, g.py - 6, f1(p.Teff) + ' °C', 15, INK, 'center', 800);
    // 상태 문구
    const sy = g.py + g.ph + 78;
    D.roundRect(L.x + 14, sy, L.w - 28, 34, 17); ctx.fillStyle = boil ? '#e8effc' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = boil ? BLU : '#c9d2df'; ctx.lineWidth = 2; ctx.stroke();
    T(L.x + L.w / 2, sy + 22, boil ? '끓고 있어요! 증기압 = 외부 압력' : Pv < Pm - 0.5 ? '아직 안 끓어요: 증기압 ' + Math.round(Pv) + ' < 외부 압력 ' + Math.round(Pm) : '끓기 직전이에요', 14, boil ? '#2548b8' : MUTED, 'center', 800);
    // 오른쪽: 기포 확대
    panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    T(Rr.x + 14, Rr.y + 28, '🔍 기포 한 개를 확대', 14.5, INK, 'left', 800);
    const bcx = Rr.x + Rr.w / 2, bcy = Rr.y + (PHONE ? 116 : 150), br = (PHONE ? 26 : 36) + clamp(p.bubR, 0, 24) * (PHONE ? 0.7 : 1.0);
    ctx.fillStyle = 'rgba(120,200,255,.28)'; D.roundRect(Rr.x + 12, Rr.y + 42, Rr.w - 24, PHONE ? 148 : 214, 12); ctx.fill();
    ctx.beginPath(); ctx.arc(bcx, bcy, br, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 1.4; ctx.stroke();
    const sc = 80 / 1600;
    const aIn = Pv * sc, aOut = Pm * sc;
    D.arrow(bcx, bcy, bcx, bcy - Math.max(14, aIn) , { color: '#e2464b', width: 5, head: 12 });
    D.arrow(bcx, bcy - br - Math.max(14, aOut) - 6 + 0, bcx, bcy - br - 6, { color: BLU, width: 5, head: 12 });
    T(bcx + 12, bcy + 24, '증기압 ' + Math.round(Pv), 12.5, '#b91c1c', 'left', 800);
    T(bcx + 14, bcy - br - 12, '외부 ' + Math.round(Pm), 12.5, '#2548b8', 'left', 800);
    const vy = Rr.y + (PHONE ? 200 : 274);
    D.roundRect(Rr.x + 12, vy, Rr.w - 24, 40, 10); ctx.fillStyle = boil ? '#e8effc' : '#f1f5f9'; ctx.fill();
    textBlock(Rr.x + 22, vy + 17, Rr.w - 44, boil ? '증기압 = 외부 압력: 기포가 커지고 떠올라요 (끓음)' : '증기압 < 외부 압력: 기포가 눌려서 커지지 못해요', 12.5, boil ? '#2548b8' : MUTED, 16, 800);
    T(Rr.x + 14, vy + 66, '압력에 따른 물의 끓는점', 13.5, INK, 'left', 800);
    [['⛰️ 산 위 0.70 atm', 0.70], ['🏔️ 에베레스트 0.33 atm', 0.33], ['🍲 압력솥 2.00 atm', 2.0], ['🌫️ 진공 증발 0.30 atm', 0.30]].forEach((q, i) => {
      const yy = vy + 76 + i * 25; D.roundRect(Rr.x + 12, yy, Rr.w - 24, 22, 8); ctx.fillStyle = '#f7f3ff'; ctx.fill();
      T(Rr.x + 20, yy + 16, q[0], 12.5, INK, 'left', 800); T(Rr.x + Rr.w - 20, yy + 16, f1(Tbw(q[1] * ATM)) + ' °C', 13, PUR, 'right', 800);
    });
  }
  PRESETS.forEach((q) => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.v = q[1]; bt.textContent = q[0]; bt.style.fontSize = '13.5px'; $('#pChips').appendChild(bt); });
  $('#pChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); setP(+bt.dataset.v); });
  const setP = (v) => { S.press.P = clamp(Math.round(v * 100) / 100, 0.3, 2); updateCtl(); };
  $('#sP').addEventListener('input', (e) => setP(+e.target.value));
  $('#pMinus').addEventListener('click', () => { Sound.tick(); setP(S.press.P - 0.01); });
  $('#pPlus').addEventListener('click', () => { Sound.tick(); setP(S.press.P + 0.01); });
  const setHT = (v) => { S.press.Tset = clamp(Math.round(v), 20, 125); updateCtl(); };
  $('#sHT').addEventListener('input', (e) => setHT(+e.target.value));
  $('#htMinus').addEventListener('click', () => { Sound.tick(); setHT(S.press.Tset - 1); });
  $('#htPlus').addEventListener('click', () => { Sound.tick(); setHT(S.press.Tset + 1); });

  /* ================= ④ 상평형 그림 ================= */
  const phGeo = () => { const L = RC.phase.L; return PHONE ? { x: L.x + 60, y: L.y + 40, w: 388, h: 330 } : { x: L.x + 68, y: L.y + 40, w: 436, h: 380 }; };
  const phX = (G, t) => G.x + (t - TR[0]) / (TR[1] - TR[0]) * G.w;
  const phY = (G, p) => G.y + G.h - (Math.log10(p) - LP[0]) / (LP[1] - LP[0]) * G.h;
  const SCOL = { solid: '#cfe3ff', liquid: '#cdf1d8', gas: '#fff0c4' };
  const SNAME = { water: { solid: '고체 (얼음)', liquid: '액체 (물)', gas: '기체 (수증기)' }, co2: { solid: '고체 (드라이아이스)', liquid: '액체 이산화 탄소', gas: '기체 이산화 탄소' } };
  const SDOT = { solid: '#3867f4', liquid: '#14a058', gas: '#d97706' };
  const regionCache = {};
  function regionImg(sub, G) {
    const key = sub + G.w + 'x' + G.h; if (regionCache[key]) return regionCache[key];
    const cv = document.createElement('canvas'); cv.width = Math.round(G.w); cv.height = Math.round(G.h); const c2 = cv.getContext('2d');
    for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
      const t = TR[0] + (x + 1) / cv.width * (TR[1] - TR[0]), lp = LP[0] + (1 - (y + 1) / cv.height) * (LP[1] - LP[0]);
      c2.fillStyle = SCOL[stateOf(sub, t, Math.pow(10, lp))]; c2.fillRect(x, y, 2, 2);
    }
    regionCache[key] = cv; return cv;
  }
  const fmtAtm = (P) => (P >= 100 ? String(Math.round(P)) : P >= 10 ? P.toFixed(1) : P >= 1 ? String(Math.round(P * 100) / 100) : P >= 0.1 ? P.toFixed(2) : P.toFixed(3));
  const fmtTT = (t) => (Math.abs(t - 0.01) < 0.005 ? '0.01' : sgn(Math.round(t * 10) / 10));
  function phPath(G, fn, from, to, n) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const t = from + (to - from) * i / n, p = fn(t); const x = phX(G, t), y = phY(G, clamp(p, 1e-3, 1e3)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function ptLabel(G, t, p, txt, dx, dy, align, bg) {
    const x = phX(G, t), y = phY(G, p);
    D.sphere(x, y, 5.5, '#26324a', { gloss: false, outline: '#fff', outlineWidth: 1.6 });
    D.label(x + dx, y + dy, txt, { size: 12.5, bg: bg || '#26324a', align: align || 'left', pad: 6 });
  }
  function drawFusion(x, y, w, h, sub) {
    const d = PH[sub], w0 = sub === 'water' ? [-10, 2] : [-62, -30];
    D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.4; ctx.stroke();
    const px = x + 34, py = y + 28, pw = w - 46, ph = h - 88, X = (t) => px + (t - w0[0]) / (w0[1] - w0[0]) * pw, Y = (p) => py + ph - (Math.log10(p) - LP[0]) / (LP[1] - LP[0]) * ph;
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.fillStyle = SCOL.solid; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px, py);
    for (let k = 0; k <= 40; k++) { const p = Math.pow(10, LP[1] - (LP[1] - Math.log10(d.tp.P)) * k / 40); ctx.lineTo(X(d.fus(p)), Y(p)); }
    ctx.lineTo(X(d.tp.T), py + ph); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SCOL.liquid; ctx.beginPath(); ctx.moveTo(px + pw, py); for (let k = 0; k <= 40; k++) { const p = Math.pow(10, LP[1] - (LP[1] - Math.log10(d.tp.P)) * k / 40); ctx.lineTo(X(d.fus(p)), Y(p)); } ctx.lineTo(px + pw, Y(d.tp.P)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.6; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const p = Math.pow(10, LP[1] - (LP[1] - Math.log10(d.tp.P)) * k / 40); if (k) ctx.lineTo(X(d.fus(p)), Y(p)); else ctx.moveTo(X(d.fus(p)), Y(p)); } ctx.stroke();
    const ph0 = S.phase; if (ph0.sub === sub || S.sub.phase === sub) { const cx = X(ph0.T), cy = Y(ph0.P); if (cx > px && cx < px + pw) D.sphere(cx, cy, 5, SDOT[S.phase.st], { gloss: false, outline: '#fff' }); }
    ctx.restore();
    T(x + 10, y + 18, '🔍 고체–액체 경계선 확대', 12.5, INK, 'left', 800);
    T(px + 6, py + ph - 8, '고체', 13, '#2548b8', 'left', 800); T(px + pw - 6, py + 22, '액체', 13, '#14803f', 'right', 800);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    [w0[0], (w0[0] + w0[1]) / 2, w0[1]].forEach((t) => { T(X(t), py + ph + 15, String(Math.round(t * 10) / 10).replace('-', '−'), 12.5, MUTED, 'center', 700); });
    textBlock(x + 10, y + h - 30, w - 20, sub === 'water' ? '압력↑ → 녹는점 ↓ (경계선이 왼쪽으로 기울어요)' : '압력↑ → 녹는점 ↑ (경계선이 오른쪽으로 기울어요)', 12.5, sub === 'water' ? '#2548b8' : '#b45309', 15, 800);
  }
  function drawPhase(t) {
    const L = RC.phase.L, Rr = RC.phase.R, ph = S.phase, sub = S.sub.phase, d = PH[sub], G = phGeo();
    T(14, 26, MODE_LABEL.phase, PHONE ? 15 : 17, INK, 'left', 800);
    panel(L.x, L.y, L.w, L.h, 14); panel(Rr.x, Rr.y, Rr.w, Rr.h, 14);
    ctx.drawImage(regionImg(sub, G), G.x, G.y, G.w, G.h);
    // 눈금
    for (let tt = -100; tt <= 400; tt += 100) { const x = phX(G, tt); ctx.strokeStyle = 'rgba(80,90,110,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, G.y); ctx.lineTo(x, G.y + G.h); ctx.stroke(); T(x, G.y + G.h + 17, sgn(tt), 12.5, MUTED, 'center', 700); }
    for (let k = LP[0]; k <= LP[1]; k++) { const y = phY(G, Math.pow(10, k)); ctx.strokeStyle = 'rgba(80,90,110,.18)'; ctx.beginPath(); ctx.moveTo(G.x, y); ctx.lineTo(G.x + G.w, y); ctx.stroke(); T(G.x - 6, y + 4.5, fmtAtm(Math.pow(10, k)), 12.5, MUTED, 'right', 700); }
    T(G.x + G.w / 2, G.y + G.h + 36, '온도 (°C)', 13, MUTED, 'center', 800); T(L.x + 14, G.y - 10, '압력(atm, 로그 눈금)', 12.5, MUTED, 'left', 800);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; ctx.strokeRect(G.x, G.y, G.w, G.h);
    // 1 atm
    const y1 = phY(G, 1); ctx.strokeStyle = 'rgba(38,50,74,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(G.x, y1); ctx.lineTo(G.x + G.w, y1); ctx.stroke(); ctx.setLineDash([]);
    T(G.x + G.w - 6, y1 - 5, '1 atm', 12.5, INK, 'right', 800);
    // 경계선
    ctx.save(); ctx.beginPath(); ctx.rect(G.x, G.y, G.w, G.h); ctx.clip();
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    phPath(G, d.vap, d.tp.T, d.cp.T, 90);
    phPath(G, d.sub, Math.max(TR[0], d.subT0), d.tp.T, 50);
    ctx.beginPath(); for (let k = 0; k <= 60; k++) { const p = Math.pow(10, Math.log10(d.tp.P) + (LP[1] - Math.log10(d.tp.P)) * k / 60); const x = phX(G, d.fus(p)), y = phY(G, p); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
    // 영역 이름
    if (sub === 'water') { T(phX(G, -60), phY(G, 30), '고체', 17, '#2548b8', 'center', 800); T(phX(G, 150), phY(G, 60), '액체', 17, '#14803f', 'center', 800); T(phX(G, 260), phY(G, 0.08), '기체', 17, '#b45309', 'center', 800); }
    else { T(phX(G, -82), phY(G, 60), '고체', 17, '#2548b8', 'center', 800); T(phX(G, 8), phY(G, 300), '액체', 17, '#14803f', 'center', 800); T(phX(G, 150), phY(G, 0.3), '기체', 17, '#b45309', 'center', 800); }
    // 특별한 점
    if (sub === 'water') {
      ptLabel(G, 0.01, 0.006, '삼중점 0.01 °C · 0.006 atm', 10, 14, 'left');
      ptLabel(G, 0, 1, '정상 녹는점 0 °C', -10, -17, 'right', '#2548b8');
      ptLabel(G, 100, 1, '정상 끓는점 100 °C', 8, 18, 'left', '#b45309');
      ptLabel(G, 374, 218, '임계점 374 °C · 218 atm', -10, -4, 'right');
    } else {
      ptLabel(G, -57, 5.1, '삼중점 −57 °C · 5.1 atm', 10, 14, 'left');
      ptLabel(G, -78.5, 1, '1 atm: −78.5 °C 승화', 10, 18, 'left', '#2548b8');
      ptLabel(G, 31, 73, '임계점 31 °C · 73 atm', 10, -12, 'left');
    }
    // 현재 점
    const px = phX(G, clamp(ph.T, TR[0], TR[1])), py = phY(G, clamp(ph.P, 1e-3, 1e3));
    const tc = SDOT[ph.st];
    ctx.save(); D.shadow(() => { ctx.beginPath(); ctx.arc(px, py, ph.drag ? 11 : 9.5, 0, TAU); ctx.fillStyle = tc; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.arc(px, py, ph.drag ? 11 : 9.5, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    if (!RM) D.ring(px, py, 14, t, { color: tc, width: 2 });
    // 오른쪽 패널
    const md = ph.md, sc = PHONE ? 10 : 9.5, bw = GW * sc, bh = GH * sc, bx = PHONE ? Rr.x + 16 : Rr.x + (Rr.w - bw) / 2, by = Rr.y + (PHONE ? 38 : 38);
    T(Rr.x + 14, Rr.y + 24, '🔍 분자 모형 상자', 13.5, INK, 'left', 800);
    ctx.fillStyle = C.mix('#f1f5f9', SCOL[ph.st], 0.65); D.roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    for (let i = 0; i < md.N; i++) { if (sub === 'water') bentMol(bx + md.x[i] * sc, by + md.y[i] * sc, md.ang[i], sc / 15 * 1.1, '#38bdf8'); else linMol(bx + md.x[i] * sc, by + md.y[i] * sc, md.ang[i], sc / 15 * 1.25); }
    ctx.restore(); ctx.strokeStyle = '#7d8da6'; ctx.lineWidth = 3; D.roundRect(bx, by, bw, bh, 8); ctx.stroke();
    const tx = PHONE ? bx + bw + 14 : Rr.x + 14, ty = PHONE ? by + 4 : by + bh + 8, tw = PHONE ? Rr.w - bw - 44 : Rr.w - 28;
    T(tx, ty + 16, SNAME[sub][ph.st], 16, SDOT[ph.st], 'left', 800);
    T(tx, ty + 38, 'T = ' + fmtTT(ph.T) + ' °C · P = ' + fmtAtm(ph.P) + ' atm', 13.5, INK, 'left', 800);
    const tp = Math.abs(ph.T - d.tp.T) < 0.6 && Math.abs(Math.log10(ph.P / d.tp.P)) < 0.06;
    textBlock(tx, ty + 60, tw, tp ? '삼중점: 고체 · 액체 · 기체가 함께 있어요' : sub === 'co2' && Math.abs(ph.P - 1) < 0.15 && ph.st !== 'liquid' ? '1 atm에는 액체 영역이 없어요. 고체가 곧바로 기체가 돼요(승화)' : ph.st === 'solid' ? '입자가 규칙적인 자리에서 떨고 있어요' : ph.st === 'liquid' ? '입자가 모여 있지만 자리를 바꿔요' : '입자가 멀리 흩어져 빠르게 움직여요', 12.5, MUTED, 16.5, 700);
    const iy = PHONE ? by + bh + 12 : by + bh + 8 + 112, ih = PHONE ? Rr.y + Rr.h - iy - 10 : Rr.y + Rr.h - iy - 10;
    drawFusion(Rr.x + 12, iy, Rr.w - 24, ih, sub);
  }
  function phEnter(st) {
    const ph = S.phase, md = ph.md;
    if (st === 'solid') { assignSites(md); md.latk = 6; md.eps = 1; md.kT = 0.05; }
    else if (st === 'liquid') { md.latk = 0; md.eps = 1; md.kT = 0.42; }
    else { md.latk = 0; md.eps = 0.04; md.kT = 0.8; }
    if (!RM && ph.st !== st) parts.burst(phGeo().x + phGeo().w / 2, phGeo().y + 30, { count: 0 });
    ph.st = st;
  }
  function phInit() { const ph = S.phase; ph.md = makeMD(36, GW, GH); ph.st = stateOf(S.sub.phase, ph.T, ph.P); phEnter(ph.st); mdWarm(ph.md, 20); }
  function stepPhase(dt) {
    const ph = S.phase, st = stateOf(S.sub.phase, ph.T, ph.P);
    if (st !== ph.st) { const old = ph.st; phEnter(st); if (S.mode === 'phase') { Sound.tick(); if (!RM) { const G = phGeo(); parts.burst(phX(G, ph.T), phY(G, ph.P), { count: 12, speed: 110, life: 0.6, colors: [SDOT[st], '#fff'], gravity: 120 }); } } void old; }
    mdAdvance(ph.md, dt);
    if (S.mode === 'phase') {
      if (S.sub.phase === 'water') { const seq = ['solid', 'liquid', 'gas']; while (ph.prog < 3 && ph.st === seq[ph.prog]) ph.prog++; }
      else if (Math.abs(ph.P - 1) <= 0.15) { if (ph.st === 'solid') ph.co2s = true; if (ph.st === 'gas') ph.co2g = true; }
      if (S.sub.phase === 'co2' && ph.st === 'liquid') ph.co2liq = true;
    }
  }
  const setPhase = (T0, P0) => { const ph = S.phase; ph.T = clamp(T0, TR[0], TR[1]); ph.P = clamp(P0, 1e-3, 1e3); updateCtl(); };
  function phSub(k) { if (S.sub.phase === k) return; S.sub.phase = k; S.fade = 0.6; if (k === 'water') setPhase(-50, 1); else setPhase(-100, 1); const ph = S.phase; ph.st = stateOf(k, ph.T, ph.P); phEnter(ph.st); buildPhChips(); updateCtl(); }
  $('#phSub').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); phSub(bt.dataset.v === 'co2' ? 'co2' : 'water'); });
  function buildPhChips() {
    const c = $('#phChips'); c.innerHTML = '';
    const list = S.sub.phase === 'water' ? [['삼중점', 0.01, 0.006], ['정상 녹는점', 0, 1], ['정상 끓는점', 100, 1], ['임계점', 374, 218]] : [['삼중점', -57, 5.1], ['1 atm 승화', -78.5, 1], ['임계점', 31, 73]];
    list.forEach((q) => { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = q[0]; bt.dataset.t = q[1]; bt.dataset.p = q[2]; bt.style.fontSize = '13.5px'; c.appendChild(bt); });
  }
  $('#phChips').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; Sound.click(); setPhase(+bt.dataset.t, +bt.dataset.p); });
  const sPTin = (v) => setPhase(v, S.phase.P);
  $('#sPT').addEventListener('input', (e) => sPTin(+e.target.value));
  $('#ptMinus').addEventListener('click', () => { Sound.tick(); setPhase(Math.round(S.phase.T) - 1, S.phase.P); });
  $('#ptPlus').addEventListener('click', () => { Sound.tick(); setPhase(Math.round(S.phase.T) + 1, S.phase.P); });
  $('#sPP').addEventListener('input', (e) => setPhase(S.phase.T, Math.pow(10, +e.target.value)));
  $('#ppMinus').addEventListener('click', () => { Sound.tick(); setPhase(S.phase.T, Math.pow(10, Math.log10(S.phase.P) - 0.1)); });
  $('#ppPlus').addEventListener('click', () => { Sound.tick(); setPhase(S.phase.T, Math.pow(10, Math.log10(S.phase.P) + 0.1)); });

  /* ================= 포인터 ================= */
  let dragMode = null;
  function dragTo(p) {
    if (dragMode === 'phase') { const G = phGeo(); const tt = TR[0] + (clamp(p.x, G.x, G.x + G.w) - G.x) / G.w * (TR[1] - TR[0]); const lp = LP[0] + (1 - (clamp(p.y, G.y, G.y + G.h) - G.y) / G.h) * (LP[1] - LP[0]); setPhase(Math.round(tt), Math.pow(10, Math.round(lp * 50) / 50)); }
    else if (dragMode === 'curve') { const P = cRect().plot; setCT((clamp(p.x, P.x, P.x + P.w) - P.x) / P.w * CXM); }
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'phase') { const G = phGeo(); if (inRect(p, { x: G.x - 10, y: G.y - 10, w: G.w + 20, h: G.h + 20 })) { dragMode = 'phase'; S.phase.drag = true; dragTo(p); return true; } }
      if (S.mode === 'curve') { const P = cRect().plot; if (inRect(p, { x: P.x - 8, y: P.y - 8, w: P.w + 16, h: P.h + 30 })) { dragMode = 'curve'; dragTo(p); return true; } }
      return false;
    },
    move(p) { dragTo(p); },
    up() { dragMode = null; S.phase.drag = false; },
    hover(p) { if (S.mode === 'phase') { const G = phGeo(); return inRect(p, G) ? 'crosshair' : null; } if (S.mode === 'curve') { const P = cRect().plot; return inRect(p, P) ? 'ew-resize' : null; } return null; },
  });

  /* ================= 컨트롤 · 공통 ================= */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const v = S.vap;
    $$('#vTChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === v.T); b.classList.toggle('done', !!v.rec[+b.dataset.v]); });
    $('#bRec').disabled = !v.eq;
    const c = S.curve;
    $$('#cChips button').forEach((b) => b.classList.toggle('on', !!c.show[b.dataset.v]));
    $('#oCT').textContent = c.Tc + ' °C'; $('#sCT').value = c.Tc; $('#ctMinus').disabled = c.Tc <= 0; $('#ctPlus').disabled = c.Tc >= 120;
    const p = S.press;
    $$('#pChips button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v - p.P) < 0.004));
    $('#oP').textContent = p.P.toFixed(2) + ' atm'; $('#sP').value = p.P; $('#pMinus').disabled = p.P <= 0.3; $('#pPlus').disabled = p.P >= 2;
    $('#oHT').textContent = p.Tset + ' °C'; $('#sHT').value = p.Tset; $('#htMinus').disabled = p.Tset <= 20; $('#htPlus').disabled = p.Tset >= 125;
    const ph = S.phase;
    $$('#phSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.phase));
    $('#oPT').textContent = fmtTT(ph.T) + ' °C'; $('#sPT').value = Math.round(ph.T); $('#oPP').textContent = fmtAtm(ph.P) + ' atm'; $('#sPP').value = Math.round(Math.log10(ph.P) * 50) / 50;
    $('#ptMinus').disabled = ph.T <= TR[0]; $('#ptPlus').disabled = ph.T >= TR[1]; $('#ppMinus').disabled = ph.P <= 1.001e-3; $('#ppPlus').disabled = ph.P >= 999;
    $$('#phChips button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.t - ph.T) < 0.3 && Math.abs(Math.log10(+b.dataset.p / ph.P)) < 0.03));
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5;
    if (S.mode === 'vap') { S.vap.rec = {}; vapReset(); }
    else if (S.mode === 'curve') { S.curve.show = { ether: true, ethanol: true, water: true }; S.curve.Tc = 20; S.curve.found = {}; }
    else if (S.mode === 'press') { S.press.P = 1; S.press.Tset = 25; S.press.Teff = 25; S.press.found = {}; S.press.bubs = []; }
    else { S.phase.prog = 0; phSub('water'); setPhase(-50, 1); }
    updateCtl();
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'vap') { const v = S.vap; L1 = '온도'; a = Math.round(v.Td) + ' °C'; L2 = '증기압'; b = fmtP(v.Pd) + ' mmHg'; L3 = '상태'; c = v.eq ? '동적 평형' : '평형 이전'; }
    else if (S.mode === 'curve') { const cc = S.curve; L1 = '눈금 온도'; a = cc.Tc + ' °C'; L2 = '찾은 끓는점'; b = LK.filter((k) => cc.found[k]).map((k) => cTb(k)).join(' · ') || '—'; L3 = '찾은 개수'; c = Object.keys(cc.found).length + ' / 3'; }
    else if (S.mode === 'press') { const p = S.press; L1 = '외부 압력'; a = p.P.toFixed(2) + ' atm (' + Math.round(pMM()) + ' mmHg)'; L2 = '물의 끓는점'; b = f1(pTb()) + ' °C'; L3 = '물의 온도'; c = f1(p.Teff) + ' °C ' + (p.boilT > 0.05 ? '(끓는 중)' : ''); }
    else { const ph = S.phase; L1 = '온도 · 압력'; a = fmtTT(ph.T) + ' °C · ' + fmtAtm(ph.P) + ' atm'; L2 = '상태'; b = SNAME[S.sub.phase][ph.st]; L3 = '물질'; c = PH[S.sub.phase].nm; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const foundCount = () => LK.filter((k) => S.curve.found[k]).length;
  const recOK = (t) => { const r = S.vap.rec[t]; return !!r && Math.abs(r - LIQ.water.P(t)) <= 0.03 * LIQ.water.P(t); };
  const levels = [
    {
      title: '증기압: 밀폐 용기 속 평형', short: '증기압', icon: '🧪', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 산 위에서는 라면이 설익고, 압력솥에서는 잘 익는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 화학에서</b> 증발과 응축이 같은 속도로 일어나는 <b>동적 평형</b>을 배웠고, 앞 차시에서 분자 간 힘이 클수록 끓는점이 높다는 것을 추론했어요. 이번에는 이것을 <b>증기압</b>으로 설명해요.</div>' +
        '<p>뚜껑을 닫은 용기에 물을 넣으면 일부가 증발해 기체가 돼요. 시간이 지나면 증발과 응축이 같아지고 기체의 압력이 일정해져요. 이 압력이 그 온도에서의 <b>증기압</b>이에요. 온도를 바꾸어 증기압의 변화를 마노미터로 읽어요.</p>',
      features: ['vap'],
      setup() { S.lock = false; S.gate = ''; setMode('vap'); },
      recap: '증발과 응축이 같아진 동적 평형에서 기체의 압력이 증기압이에요. 증기압은 온도가 높을수록 커요.',
      summary: '<ul><li><b>증기압</b>: 밀폐 용기에서 증발과 응축이 같은 속도가 된 동적 평형 상태의 기체 압력이에요.</li><li>물의 증기압: 20 °C <b>17.5</b>, 40 °C <b>55</b>, 60 °C <b>149</b> mmHg. 온도가 높을수록 커요(1 atm = 760 mmHg).</li><li>온도가 높아지면 증발할 수 있는 큰 운동 에너지를 가진 분자의 비율이 늘어요.</li><li>증기압은 온도(와 액체의 종류)로 정해져요. 액체의 양이나 용기의 크기와는 상관없어요.</li></ul>',
      missions: [
        {
          title: '증발과 응축이 같아지는 평형',
          goal: '20 °C에서 빈 용기에 증기가 차오르다가 <b>증발 속도 = 응축 속도</b>가 되어 압력이 일정해지는 <b>동적 평형</b>을 만들어요. (약 6초)',
          hint: '온도 20 °C를 고른 채 기다려요. 마노미터의 수은 높이 차가 일정해지고 ↑ 증발과 ↓ 응축 막대가 같아지면 평형이에요.',
          setup() { S.lock = true; S.gate = ''; S.vap.T = 20; S.vap.rec = {}; vapReset(); setMode('vap'); },
          check: () => S.vap.T === 20 && S.vap.eq, hold: 0.6,
          status: () => '온도 20 °C ' + mark(S.vap.T === 20) + ' &nbsp; 평형 ' + mark(S.vap.eq) + ' &nbsp; 증기압 ' + fmtP(S.vap.Pd) + ' mmHg',
          explain: '처음에는 증발만 일어나 기체가 늘고 압력이 올라가요. 기체가 늘면 응축도 늘어서 결국 <b>증발 속도 = 응축 속도</b>가 되고 압력이 일정해져요. 이때의 압력이 <b>증기압</b>이에요(20 °C의 물은 17.5 mmHg).',
        },
        {
          title: '온도 세 곳에서 증기압 기록하기',
          goal: '20 °C, 40 °C, 60 °C 각각에서 평형이 되면 <b>📝 증기압 기록</b>을 눌러 세 값을 모두 기록해요.',
          hint: '20 °C에서 평형이 되면 기록해요. 40 °C 단추를 누르고 압력이 다시 일정해질 때까지 기다린 뒤 기록하고, 60 °C도 같은 방법으로 해요.',
          setup() { S.lock = true; S.gate = ''; S.vap.T = 20; S.vap.rec = {}; vapReset(); setMode('vap'); },
          check: () => [20, 40, 60].every(recOK), hold: 0.4,
          status: () => '20 °C ' + mark(recOK(20)) + ' &nbsp; 40 °C ' + mark(recOK(40)) + ' &nbsp; 60 °C ' + mark(recOK(60)),
          explain: '물의 증기압은 20 °C에서 <b>17.5</b>, 40 °C에서 <b>55</b>, 60 °C에서 <b>149 mmHg</b>예요. 온도가 높아질수록 큰 운동 에너지를 가진 분자의 비율이 늘어 증발이 빨라지고, 더 많은 기체 분자가 있어야 응축이 증발을 따라잡아서 증기압이 커져요.',
        },
        {
          type: 'quiz', title: '액체를 더 넣으면?',
          goal: '온도를 그대로 두고 용기에 <b>액체를 더 넣었어요</b>. 평형에 이른 뒤의 증기압은?',
          setup() { S.lock = true; S.gate = ''; setMode('vap'); },
          choices: ['액체가 많아졌으니 증기압도 더 커져요', '변하지 않아요. 증기압은 온도(와 액체의 종류)로 정해져요', '액체가 많아져서 증기가 줄어 더 작아져요', '넣은 액체의 양에 정확히 비례해요'],
          answer: 1,
          feedback: ['액체가 늘면 증발이 일어나는 표면에서 같은 일이 일어날 뿐이에요. 평형 증기압은 달라지지 않아요.', '', '증기가 줄지 않아요. 평형에서는 증발과 응축이 같은 속도로 일어나 압력이 그대로예요.', '증기압은 액체의 양과 상관없어요. 온도가 정해지면 값이 정해져요.'],
          explain: '증기압은 <b>온도와 액체의 종류</b>로 정해지고 액체의 양이나 용기 크기와는 상관없어요. 💧 액체 더 넣기를 눌러 봐도 같은 값에서 평형이 돼요.',
        },
      ],
    },
    {
      title: '증기압 곡선: 끓는점 읽기', short: '증기압 곡선', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 증기압이 온도에 따라 커진다는 것을 보았어요. 이제 <b>세 액체</b>의 증기압을 한 그래프에 그려 비교해요.</div>' +
        '<p>다이에틸 에터, 에탄올, 물의 증기압 곡선이에요. 눈금을 움직여 값을 읽어요. 외부 압력이 1 atm(<b>760 mmHg</b>)일 때, 증기압이 760 mmHg와 같아지는 온도가 <b>정상 끓는점</b>이에요.</p>',
      features: ['curve'],
      setup() { S.lock = false; S.gate = ''; setMode('curve'); },
      recap: '같은 온도에서 분자 간 힘이 작은 액체일수록 증기압이 커요. 증기압이 760 mmHg가 되는 온도가 정상 끓는점이라서 증기압이 큰 액체는 끓는점이 낮아요.',
      summary: '<ul><li>20 °C의 증기압: 다이에틸 에터 <b>442</b> &gt; 에탄올 <b>44</b> &gt; 물 <b>17.5</b> mmHg. 분자 간 힘이 작을수록 증기압이 커요.</li><li>증기압 = 760 mmHg(1 atm)인 온도가 <b>정상 끓는점</b>: 에터 <b>35 °C</b>, 에탄올 <b>78 °C</b>, 물 <b>100 °C</b>.</li><li>증기압이 큰 액체는 끓는점이 낮아요. 에터는 수소 결합이 없고, 에탄올과 물은 수소 결합이 있어요.</li></ul>',
      missions: [
        {
          title: '곡선에서 끓는점 세 개 읽기',
          goal: '눈금 온도를 움직여 세 곡선이 <b>760 mmHg 가로선</b>과 만나는 온도를 각각 찾아요.',
          hint: '그래프를 끌거나 슬라이더로 눈금을 움직여요. 다이에틸 에터는 낮은 온도, 물은 높은 온도에서 760 mmHg가 돼요. 에탄올은 그 사이예요.',
          setup() { S.lock = true; S.gate = ''; S.curve.show = { ether: true, ethanol: true, water: true }; S.curve.Tc = 20; S.curve.found = {}; setMode('curve'); },
          check: () => foundCount() === 3, hold: 0.4,
          status: () => LK.map((k) => LIQ[k].short + ' ' + mark(!!S.curve.found[k])).join(' &nbsp; '),
          explain: '곡선이 760 mmHg 선과 만나는 온도는 다이에틸 에터 <b>35 °C</b>, 에탄올 <b>78 °C</b>, 물 <b>100 °C</b>예요. 20 °C에서 증기압이 에터(442) &gt; 에탄올(44) &gt; 물(17.5)인 순서와 끓는점이 낮은 순서가 같아요.',
        },
        {
          type: 'quiz', title: '증기압과 끓는점',
          goal: '20 °C에서 증기압이 가장 큰 <b>다이에틸 에터</b>의 정상 끓는점은 세 액체 중 어떨까요?',
          setup() { S.lock = true; S.gate = ''; setMode('curve'); },
          choices: ['세 액체 중 가장 높아요', '에탄올과 같아요', '세 액체 중 가장 낮아요', '증기압과 끓는점은 관계가 없어요'],
          answer: 2,
          feedback: ['증기압이 크면 760 mmHg에 더 낮은 온도에서 도달해요. 끓는점은 가장 낮아요.', '곡선이 760 mmHg와 만나는 온도가 서로 달라요(에터 35, 에탄올 78 °C).', '', '끓는점은 증기압이 외부 압력과 같아지는 온도라서 증기압과 깊은 관계가 있어요.'],
          explain: '증기압이 큰 액체는 더 낮은 온도에서 증기압이 760 mmHg에 닿아요. 분자 간 힘이 작은 에터는 증기압이 크고 <b>끓는점(35 °C)이 가장 낮아요</b>.',
        },
      ],
    },
    {
      title: '압력과 끓는점: 산 위와 압력솥', short: '압력과 끓는점', icon: '🌡️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 외부 압력이 1 atm일 때 증기압이 760 mmHg가 되는 온도가 끓는점임을 읽었어요. 외부 압력이 달라지면 끓는점도 달라질까요?</div>' +
        '<p>냄비 속 물을 가열하면 기포의 안쪽에서는 <b>증기압</b>이 밖으로 밀고, 바깥에서는 <b>외부 압력</b>이 눌러요. 증기압이 외부 압력과 같아져야 기포가 커지고 떠올라 물이 끓어요. 외부 압력을 바꾸어 끓는점을 찾아봐요.</p>',
      features: ['press'],
      setup() { S.lock = false; S.gate = ''; setMode('press'); },
      recap: '액체는 증기압이 외부 압력과 같아지는 온도에서 끓어요. 외부 압력이 낮으면 끓는점이 낮고, 높으면 끓는점이 높아요.',
      summary: '<ul><li>끓음: 액체 속에서 기포가 커지려면 <b>증기압 = 외부 압력</b>이어야 해요.</li><li>물의 끓는점: 1 atm에서 <b>100 °C</b>, 0.70 atm(고도 약 3000 m)에서 약 <b>90 °C</b>, 0.33 atm(에베레스트 산 정상)에서 약 <b>71~72 °C</b>, 2 atm(압력솥)에서 약 <b>120 °C</b>예요.</li><li>높은 산에서는 물이 낮은 온도에서 끓어 음식이 설익고, 압력솥은 압력을 높여 끓는점을 올려요. 진공 증발은 낮은 온도에서 물을 끓여 없애요.</li></ul>',
      missions: [
        {
          title: '0.70 atm과 2 atm에서 끓는점 찾기',
          goal: '외부 압력을 <b>0.70 atm</b>(산 위)으로 두고 물이 끓는 온도를, 이어서 <b>2.00 atm</b>(압력솥)에서 끓는 온도를 찾아요. 각각 1초 이상 끓어야 해요.',
          hint: '장소 단추 「산 위 0.70」을 누르고 🔥 가열 정도를 올려 물이 끓는 때를 찾아요. 이어서 「압력솥 2.00」으로 바꾸고 더 높이 가열해요. 온도계가 더 오르지 않는 때가 끓는점이에요.',
          setup() { S.lock = true; S.gate = ''; S.press.P = 1; S.press.Tset = 25; S.press.Teff = 25; S.press.found = {}; S.press.bubs = []; setMode('press'); },
          check: () => !!S.press.found.p70 && !!S.press.found.p2, hold: 0.3,
          status: () => '0.70 atm ' + mark(!!S.press.found.p70) + (S.press.found.p70 ? ' (' + S.press.found.p70 + ' °C)' : '') + ' &nbsp; 2.00 atm ' + mark(!!S.press.found.p2) + (S.press.found.p2 ? ' (' + S.press.found.p2 + ' °C)' : ''),
          explain: '0.70 atm(532 mmHg)에서는 증기압이 532 mmHg가 되는 약 <b>90 °C</b>에서, 2.00 atm(1520 mmHg)에서는 약 <b>120 °C</b>에서 물이 끓어요. 외부 압력이 클수록 증기압이 그만큼 커져야 하므로 끓는점이 높아요.',
        },
        {
          type: 'quiz', title: '에베레스트 산의 밥',
          goal: '에베레스트 산 정상에서는 물이 약 71 °C에서 끓어요. 그런데도 밥이 설익는 까닭은?',
          setup() { S.lock = true; S.gate = ''; S.press.P = 0.33; setMode('press'); },
          choices: ['물이 끓는 온도가 낮아서 밥을 익힐 만큼 뜨거워지지 않기 때문이에요', '산 위에서는 물이 아예 끓지 않기 때문이에요', '산 위에는 산소가 부족해서 불이 약해지기 때문이에요', '물 분자가 더 커져서 밥에 스며들지 못하기 때문이에요'],
          answer: 0,
          feedback: ['', '낮은 온도에서 끓지만 끓기는 해요. 문제는 끓는 물의 온도예요.', '불의 세기가 아니라 물이 끓는 온도가 낮은 것이 문제예요.', '물 분자의 크기는 달라지지 않아요.'],
          explain: '물은 끓는 동안 끓는점보다 뜨거워지지 않아요. 외부 압력이 낮은 산 위에서는 끓는점이 약 71 °C까지 낮아져서 밥이 설익어요.',
        },
        {
          type: 'quiz', title: '압력솥의 원리',
          goal: '압력솥에서 음식이 빨리 익는 까닭은?',
          setup() { S.lock = true; S.gate = ''; S.press.P = 2; setMode('press'); },
          choices: ['물이 더 많이 증발하기 때문이에요', '뚜껑이 열을 가두어 물 분자가 작아지기 때문이에요', '솥 안의 증기압이 낮아지기 때문이에요', '솥 안 압력이 높아져 물의 끓는점이 100 °C보다 높아지기 때문이에요(약 120 °C)'],
          answer: 3,
          feedback: ['증발량이 늘어서가 아니에요. 온도가 달라지는 것이 핵심이에요.', '물 분자의 크기는 변하지 않아요.', '압력솥에서는 솥 안 압력이 높아서 끓는점이 올라가요.', ''],
          explain: '압력솥은 수증기를 가두어 솥 안 압력을 약 2 atm으로 높여요. 그러면 물의 끓는점이 약 <b>120 °C</b>까지 올라가서 더 뜨거운 물로 음식을 익혀요.',
        },
      ],
    },
    {
      title: '상평형 그림: 기체 · 액체 · 고체', short: '상평형 그림', icon: '🗺️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력에 따라 끓는점이 달라진다는 것을 보았어요. 온도와 압력을 함께 놓으면 물질이 어떤 상태로 존재하는지 한눈에 볼 수 있어요.</div>' +
        '<p><b>상평형 그림</b>은 온도(가로)와 압력(세로)에 따라 물질이 <b>고체 · 액체 · 기체</b> 중 어느 상태로 있는지 보여 주는 그림이에요. 점을 끌어서 옮기며 분자 모형 상자가 어떻게 바뀌는지 봐요. 압력 눈금은 로그 눈금이에요.</p>',
      features: ['phase'],
      setup() { S.lock = false; S.gate = ''; setMode('phase'); },
      recap: '온도와 압력에 따라 물질은 고체, 액체, 기체로 존재해요. 경계선 위에서는 두 상이 공존하고, 삼중점에서는 세 상이 함께 있어요. 이산화 탄소는 1 atm에서 액체가 없이 승화해요.',
      summary: '<ul><li><b>물</b>: 삼중점 0.01 °C, 0.006 atm / 정상 녹는점 0 °C, 정상 끓는점 100 °C / 임계점 374 °C, 218 atm.</li><li>물의 고체–액체 경계선은 <b>왼쪽으로 기울어요</b>: 압력이 커지면 녹는점이 조금 낮아져요(얼음이 물에 뜨는 것과 같은 방향).</li><li><b>이산화 탄소</b>: 삼중점 −57 °C, 5.1 atm. 1 atm에서는 액체 영역이 없어서 −78.5 °C 부근에서 고체가 곧바로 기체가 돼요(승화, 드라이아이스).</li><li>액체 CO₂는 5.1 atm 이상으로 압축해야 만들 수 있어요(소화기 속).</li></ul>',
      missions: [
        {
          title: '물의 점으로 고체 → 액체 → 기체',
          goal: '<b>물</b>의 점을 옮겨서 <b>고체 → 액체 → 기체</b> 순서로 상태가 바뀌게 해요. (1 atm에서 온도를 올려도 돼요)',
          hint: '그림 위의 점을 끌어 오른쪽으로 옮겨요. 1 atm 선 위에서 0 °C를 지나면 액체, 100 °C를 지나면 기체가 돼요.',
          setup() { S.lock = true; S.gate = ''; phSub('water'); setPhase(-50, 1); S.phase.prog = 0; setMode('phase'); },
          check: () => S.sub.phase === 'water' && S.phase.prog >= 3, hold: 0.3,
          status: () => '고체 ' + mark(S.phase.prog >= 1) + ' &nbsp; 액체 ' + mark(S.phase.prog >= 2) + ' &nbsp; 기체 ' + mark(S.phase.prog >= 3),
          explain: '1 atm에서 온도를 올리면 <b>0 °C에서 녹아 액체</b>가 되고 <b>100 °C에서 끓어 기체</b>가 돼요. 경계선을 지날 때 분자 모형 상자의 입자 배열이 격자에서 액체, 기체로 바뀌어요.',
        },
        {
          title: '이산화 탄소는 1 atm에서 액체가 없어요',
          goal: '<b>이산화 탄소</b>를 골라 1 atm에서 온도를 올리며 <b>액체 없이 고체 → 기체</b>가 되는 것을 확인하고, 압력을 높여 <b>액체 이산화 탄소</b>도 만들어요.',
          hint: '이산화 탄소 단추를 누르고 압력을 1 atm으로 둔 채 온도를 −100 °C에서 −50 °C 쪽으로 올려요. 이어서 압력을 5.1 atm보다 높이고 온도를 −57 °C ~ 30 °C 사이로 맞춰요.',
          setup() { S.lock = true; S.gate = ''; phSub('co2'); setPhase(-100, 1); S.phase.co2s = false; S.phase.co2g = false; S.phase.co2liq = false; setMode('phase'); },
          check: () => S.sub.phase === 'co2' && S.phase.co2s && S.phase.co2g && S.phase.co2liq, hold: 0.3,
          status: () => '1 atm 고체 ' + mark(S.phase.co2s) + ' &nbsp; 1 atm 기체 ' + mark(S.phase.co2g) + ' &nbsp; 액체 CO₂ ' + mark(S.phase.co2liq),
          explain: '이산화 탄소의 삼중점은 <b>−57 °C, 5.1 atm</b>이라서 1 atm에서는 액체 영역을 지나지 않고 −78.5 °C 부근에서 승화해요. 액체 이산화 탄소는 5.1 atm 이상에서만 만들 수 있어요.',
        },
        {
          type: 'quiz', title: '액체 이산화 탄소 만들기',
          goal: '1 atm에서는 액체 이산화 탄소가 없어요. 액체 이산화 탄소를 만들려면?',
          setup() { S.lock = true; S.gate = ''; phSub('co2'); setPhase(-30, 1); setMode('phase'); },
          choices: ['1 atm에서 온도를 아주 높여요', '1 atm에서 온도를 아주 낮춰요', '압력을 삼중점의 압력(5.1 atm) 이상으로 높여 압축해요', '압력을 0.5 atm으로 낮춰요'],
          answer: 2,
          feedback: ['1 atm에서는 온도를 높여도 기체가 될 뿐 액체 영역을 지나지 않아요.', '온도를 낮추면 고체(드라이아이스)가 돼요. 액체 영역이 1 atm에는 없어요.', '', '압력을 낮추면 액체 영역에서 더 멀어져요.'],
          explain: '액체 영역은 삼중점의 압력(5.1 atm)보다 높은 쪽에만 있어요. 그래서 이산화 탄소 기체를 <b>5.1 atm 이상으로 압축</b>해야 액체가 돼요(소화기 속).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-vapor-boiling', mount: '#game', badge: '증기압 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { vap: '🧪 밀폐 용기와 마노미터', curve: '📈 세 액체의 증기압 곡선', press: '🌡️ 압력과 끓는 물', phase: '🗺️ 상평형 그림' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  Object.assign(S.phase, { prog: 0, co2s: false, co2g: false, co2liq: false });
  buildPhChips(); phInit(); vapReset();
  setMode('vap');
  function stepAll1(dt) {
    if (S.mode === 'vap') stepVap(dt);
    stepCurve(dt);
    if (S.mode === 'press') stepPress(dt);
    if (S.mode === 'phase') stepPhase(dt);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if ((S.lock || S.gate) && game && game.phase !== 'active') { S.lock = false; S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'vap') drawVap(t); else if (S.mode === 'curve') drawCurve(t); else if (S.mode === 'press') drawPress(t); else drawPhase(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, LIQ, PH, stateOf, Tbw, setMode, setCT, setP, setHT, setPhase, phSub, vapReset, pTb, cRect, phGeo, phX, phY, pMM, pBoil,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
