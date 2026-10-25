/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 탄성파의 진행 (2차시)
   성취기준 [12역학03-02] 탄성파의 진행, 투과, 반사를 이해하고, 탄성파가 활용되는 예를 찾음으로써 과학의 유용성을 인식할 수 있다. (진행 부분)
   ① 관찰: 연결 모형 (질량–용수철 사슬에서 펄스가 진행, 매질의 각 부분은 제자리에서 진동)
   ② 실험: 종파·횡파 (파동 용수철 4.0 m, 진행 속력 측정)
   ③ 분석: v = fλ (진동수를 바꾸며 파장 측정, 위치–변위·시간–변위 그래프)
   ④ 탐구: 속력 요인 (줄의 장력·단위 길이당 질량, 소리의 속력 비교)
   파동 방정식은 쓰지 않아요: 질량 m이 용수철 k로 이어진 사슬을 뉴턴 운동 법칙(힘 → 가속도)으로 계산해요.
   줄은 아주 작은 질량(μ·Δx)이 장력(T/Δx)으로 이어진 사슬이에요. v = √(T/μ)는 측정한 관계로만 정리해요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const MINUS = '−';
  const BG = '#eef2fa';
  const INK = '#26324a', MUTED = '#5a6679';
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed', TEAL = '#0d9488';
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  /* 부호는 −, 소수 자릿수 d (기본 2), plus이면 + 도 붙여요 */
  function fx(v, d, plus) {
    d = d == null ? 2 : d; const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    const z = Math.abs(r) < Math.pow(10, -d) / 2 ? 0 : r;
    return (z < 0 ? MINUS : plus && z > 0 ? '+' : '') + Math.abs(z).toFixed(d);
  }
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); return v === '' || !isFinite(+v) ? null : +v; };
  const near = (v, a, tol) => v != null && Math.abs(v - a) <= tol;
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  function setupDraw(view) {
    const ctx = view.ctx, D = SciSim.draw(ctx);
    const _dtext = D.text, _dlabel = D.label;
    D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
    D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
    const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
    function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
    function cardBegin(c, a, b) {
      ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
      const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
    }
    function wrapLines(str, maxW, size, weight) {
      ctx.save(); ctx.font = D.font(size, weight || 700);
      const out = []; let line = '';
      str.split(' ').forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = wd; } else line = t2; });
      if (line) out.push(line);
      ctx.restore(); return out;
    }
    function para(x, y, str, maxW, size, color, lh, weight, align) {
      const ls = wrapLines(str, maxW, size, weight);
      ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
      return ls.length * lh;
    }
    function frame(rc, o) {
      const ml = o.ml != null ? o.ml : (PHONE ? 44 : 50), mr = o.mr != null ? o.mr : 12, mt = o.mt != null ? o.mt : 26, mb = o.mb != null ? o.mb : 28;
      const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
      const gx = (v) => ix + iw * (v - o.x0) / (o.x1 - o.x0), gy = (v) => iy + ih - ih * (v - o.y0) / (o.y1 - o.y0);
      if (!o.nobox) { D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); }
      (o.xminor || []).forEach((v) => { ctx.strokeStyle = 'rgba(120,135,160,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(v), iy); ctx.lineTo(gx(v), iy + ih); ctx.stroke(); });
      (o.xt || []).forEach((v) => { ctx.strokeStyle = 'rgba(120,135,160,.34)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(v), iy); ctx.lineTo(gx(v), iy + ih); ctx.stroke(); if (o.xl !== false) T(gx(v), iy + ih + 17, o.xf ? o.xf(v) : String(v), 13, '#3a465c', 'center', 800); });
      (o.yt || []).forEach((v) => { ctx.strokeStyle = Math.abs(v) < 1e-9 ? 'rgba(80,95,120,.55)' : 'rgba(120,135,160,.34)'; ctx.lineWidth = Math.abs(v) < 1e-9 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(v)); ctx.lineTo(ix + iw, gy(v)); ctx.stroke(); if (o.yl !== false) T(ix - 6, gy(v) + 5, o.yf ? o.yf(v) : String(v), 13, '#3a465c', 'right', 800); });
      ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, iy - 2); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix + iw + 2, iy + ih); ctx.stroke();
      return { gx, gy, ix, iy, iw, ih };
    }
    /* 코일 용수철 */
    function spring(x1, y1, x2, y2, coils, wd, col, lw) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, lead = Math.min(12, L * 0.15);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [['rgba(255,255,255,.55)', (lw || 4) * 0.55, -1.2], [col || '#64748b', lw || 4, 0]].forEach(([c, w, off]) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1 + nx * off, y1 + ny * off); ctx.lineTo(x1 + ux * lead + nx * off, y1 + uy * lead + ny * off);
        const n = coils * 2;
        for (let i = 1; i <= n; i++) { const f = i / n, px = x1 + ux * (lead + (L - 2 * lead) * f), py = y1 + uy * (lead + (L - 2 * lead) * f), s = (i % 2 ? 1 : -1) * wd; ctx.lineTo(px + nx * (s + off), py + ny * (s + off)); }
        ctx.lineTo(x2 + nx * off, y2 + ny * off); ctx.stroke();
      });
      ctx.restore();
    }
    return { ctx, D, T, panel, cardBegin, wrapLines, para, frame, spring };
  }
  /* 가장 가까운 선택지를 고르는 작은 도우미 */
  const pickOn = (btns, attr, val) => btns.forEach((b) => b.classList.toggle('on', b.dataset[attr] === String(val)));

  /* ================= 질량–용수철 사슬 (파동 방정식 없이, 이웃끼리 힘을 주고받는 모형) =================
     노드 i의 질량 m[i], 이웃과 용수철 k[i](i와 i+1 사이). 변위 y[i]는 횡파에서는 위아래, 종파에서는 앞뒤.
     끝: 'source'(손으로 흔들기, 반사 없이 받아 주는 끝) · 'absorb'(댐퍼: 파를 흡수) · 'fixed'(벽에 고정) · 'free'(고리) */
  function Chain(o) {
    const n = o.n, N = n + 1;
    this.n = n; this.N = N; this.a = o.a; this.L = o.a * n;
    this.y = new Float64Array(N); this.v = new Float64Array(N); this.F = new Float64Array(N);
    this.k = new Float64Array(n); this.m = new Float64Array(N);
    for (let i = 0; i < n; i++) this.k[i] = o.k(i);
    for (let i = 0; i < N; i++) this.m[i] = o.m(i);
    this.left = o.left || 'absorb'; this.right = o.right || 'absorb';
    this.Z0 = Math.sqrt(this.k[0] * this.m[0]); this.Z1 = Math.sqrt(this.k[n - 1] * this.m[n]);
    if (this.left !== 'fixed') this.m[0] *= 0.5;
    if (this.right !== 'fixed') this.m[n] *= 0.5;
    this.t = 0;
  }
  Chain.prototype.step = function (dt, vd) {
    const n = this.n, y = this.y, v = this.v, k = this.k, m = this.m, F = this.F;
    F[0] = k[0] * (y[1] - y[0]);
    for (let i = 1; i < n; i++) F[i] = k[i] * (y[i + 1] - y[i]) - k[i - 1] * (y[i] - y[i - 1]);
    F[n] = -k[n - 1] * (y[n] - y[n - 1]);
    for (let i = 0; i <= n; i++) v[i] += dt * F[i] / m[i];
    if (this.left === 'source' || this.left === 'absorb') { const g = dt * this.Z0 / m[0]; v[0] = (v[0] + g * (this.left === 'source' ? vd : 0)) / (1 + g); }
    else if (this.left === 'fixed') v[0] = 0;
    if (this.right === 'absorb') { const g = dt * this.Z1 / m[n]; v[n] = v[n] / (1 + g); }
    else if (this.right === 'fixed') v[n] = 0;
    for (let i = 0; i <= n; i++) y[i] += dt * v[i];
    if (this.left === 'fixed') y[0] = 0;
    if (this.right === 'fixed') y[n] = 0;
    this.t += dt;
  };
  Chain.prototype.energy = function (i0, i1) {
    let E = 0; const y = this.y, v = this.v, k = this.k, m = this.m;
    for (let i = i0; i <= i1; i++) E += 0.5 * m[i] * v[i] * v[i];
    for (let i = Math.max(0, i0); i < Math.min(this.n, i1); i++) E += 0.5 * k[i] * (y[i + 1] - y[i]) * (y[i + 1] - y[i]);
    return E;
  };
  /* 시간에 따라 어떤 값의 가장 높은 점(봉우리)이 지나가는 순간을 찾아요 */
  function PeakDet(thr) { this.thr = thr; this.p2 = 0; this.p1 = 0; this.n = 0; }
  PeakDet.prototype.reset = function () { this.p2 = 0; this.p1 = 0; this.n = 0; };
  PeakDet.prototype.push = function (val, t, dt) {
    let res = null;
    if (this.n >= 2 && this.p1 > this.p2 && this.p1 >= val && this.p1 > this.thr) {
      const den = this.p2 - 2 * this.p1 + val, off = den < -1e-15 ? 0.5 * (this.p2 - val) / den : 0;
      res = (t - dt) + off * dt;
    }
    this.p2 = this.p1; this.p1 = val; this.n++;
    return res;
  };

  const VW = PHONE ? 480 : 800, VH = PHONE ? 780 : 620;
  const SH = PHONE ? 350 : 340;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const { ctx, D, T, panel, cardBegin, para, frame, spring } = setupDraw(view);
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const DT = 4e-4;
  const KS = [12.5, 25, 50, 100], MS = [0.02, 0.04, 0.08, 0.16];
  const TS = [10, 20, 30, 40], MUS = [0.1, 0.2, 0.3, 0.4];
  const FS = [1.0, 1.5, 2.0, 2.5, 3.0];
  const A_T = 0.30, A_L = 0.12, A_S = 0.15;           // 진폭: 사슬 횡파, 사슬 종파, 줄
  const KL_FACTOR = 1.1378, kLT = (d) => (d === 'L' ? 25.2 * KL_FACTOR : 25.2);                          // 파동 용수철: 앞뒤 방향 힘이 위아래보다 조금 커요 (v_L/v_T = 2.667/2.5)
  const fm3 = (v) => v.toFixed(3);
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

  /* ================= 상태 ================= */
  const S = {
    mode: 'model', fade: 0, clock: 0, ts: 1, paused: false, sc: null,
    kv: 1, mv: 1,
    mk: { max: [0, 0, 0] },
    meas: { v: null, vr: null, k: null, m: null },
    lt: { dir: 'T', time: { T: null, L: null } },
    fl: { fi: 2, rec: [], boost: false },
    sp: { Tv: 0, mv: 0, rec: [], t1: null },
    snd: { temp: 15, race: null, ran: false },
    flags: { speeds: false, speedsOK: false, read: false, pred: false, form: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['model', 'lt', 'fl', 'sp', 'snd'];
  const ALLOWED = [['model'], ['lt'], ['fl'], ['sp', 'snd']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };

  /* ================= 장면 만들기 ================= */
  function newSc(ch, o) {
    const sc = Object.assign({ ch, acc: 0, drv: { kind: 'none' }, pk: [], dets: [], hist: [], minT: 0, v0: 0, tau: 0.2, A: 0.3 }, o);
    sc.gates.forEach((g, i) => { sc.dets[i] = new PeakDet(0.5 * sc.A); sc.pk[i] = null; sc.hist[i] = []; });
    return sc;
  }
  function chainSc(kind, k, m) {              // 질량–용수철 사슬 (a = 0.1 m, 65칸)
    const ch = new Chain({ n: 65, a: 0.1, k: () => k, m: () => m, left: 'source', right: 'absorb' });
    const v0 = 0.1 * Math.sqrt(k / m), A = kind === 'L' ? A_L : A_T;
    return newSc(ch, { kind, gates: [10, 30, 50], A, v0, tau: 0.8 / v0, name: 'chain' });
  }
  function stringSc(Tn, mu, a, n, gates, A, w) {   // 줄: 질량 μ·a, 용수철 T/a인 사슬
    const ch = new Chain({ n, a, k: () => Tn / a, m: () => mu * a, left: 'source', right: 'absorb' });
    const v0 = Math.sqrt(Tn / mu);
    return newSc(ch, { kind: 'T', gates, A, v0, tau: w / v0, name: 'string' });
  }
  function buildScene(mode) {
    if (mode === 'model') S.sc = chainSc('T', KS[S.kv], MS[S.mv]);
    else if (mode === 'lt') S.sc = chainSc(S.lt.dir, kLT(S.lt.dir), 0.04);
    else if (mode === 'fl') {
      S.sc = stringSc(0.625, 0.1, 0.04, 150, [75], A_S, 0.5);
      const d = S.sc.drv; d.kind = 'wave'; d.on = true; d.f = FS[S.fl.fi]; d.ph = 0; d.env = 0; d.A = A_S; S.sc.changeT = 0;
    } else if (mode === 'sp') S.sc = stringSc(TS[S.sp.Tv], MUS[S.sp.mv], 0.05, 200, [20, 180], A_S, 0.6);
    else S.sc = null;
    S.mk.max = [0, 0, 0]; S.sc && (S.sc.sendT = null);
  }
  function startPulse(sc) {
    if (sc.busy) { sc.ch.y.fill(0); sc.ch.v.fill(0); }
    sc.drv = { kind: 'pulse', t0: sc.ch.t, tau: sc.tau, A: sc.A };
    sc.minT = sc.ch.t; sc.done = false; sc.finT = null; sc.pk = sc.pk.map(() => null); sc.dets.forEach((d) => d.reset()); sc.sendT = sc.ch.t; sc.busy = true;
  }
  function substep(sc, h) {
    const d = sc.drv; let vd = 0;
    if (d.kind === 'pulse') {
      const s = sc.ch.t - d.t0;
      if (s > 5.4 * d.tau) d.kind = 'none'; else { const z = (s - 2.6 * d.tau) / d.tau; vd = 2 * d.A * Math.exp(-z * z) * (-2 * z / d.tau); }
    } else if (d.kind === 'wave') {
      const tgt = d.on ? 1 : 0; d.env += clamp(tgt - d.env, -h * d.f * 0.7, h * d.f * 0.7); d.ph += TAU * d.f * h;
      vd = 2 * d.A * d.env * TAU * d.f * Math.cos(d.ph); if (!d.on && d.env <= 0) d.kind = 'none';
    }
    sc.ch.step(h, vd);
    for (let i = 0; i < sc.gates.length; i++) {
      const val = sc.ch.y[sc.gates[i]], tp = sc.dets[i].push(val, sc.ch.t, h);
      if (tp != null && sc.pk[i] == null && sc.sendT != null && tp >= sc.minT && d.kind !== 'wave') sc.pk[i] = tp;
    }
    if (sc.name === 'chain' && S.mode === 'model') for (let i = 0; i < 3; i++) S.mk.max[i] = Math.max(S.mk.max[i], Math.abs(sc.ch.y[sc.gates[i]]));
  }
  function simStep(dt) {
    const sc = S.sc; if (!sc || S.paused) return;
    let mult = S.ts;
    if (sc.name === 'string' && S.mode === 'fl' && S.fl.boost) mult = 3;
    sc.acc += dt * mult; let n = 0;
    while (sc.acc >= DT && n < 200) { substep(sc, DT); sc.acc -= DT; n++; }
    if (n >= 200) sc.acc = 0;
    // 표시용 시간 기록
    if (sc.name === 'chain') { const tr = sc.kind; sc.hist.forEach((hs, i) => { hs.push([sc.ch.t, sc.ch.y[sc.gates[i]]]); while (hs.length && hs[0][0] < sc.ch.t - 5) hs.shift(); }); void tr; }
    else if (sc.name === 'string' && S.mode === 'fl') { const hs = sc.hist[0]; hs.push([sc.ch.t, sc.ch.y[sc.gates[0]]]); while (hs.length && hs[0][0] < sc.ch.t - 3.2) hs.shift(); }
    if (sc.busy && sc.pk.length && sc.pk.every((p) => p != null)) {
      if (sc.finT == null) sc.finT = sc.ch.t;
      if (sc.ch.t - sc.finT > 0.6 / Math.max(0.5, sc.v0) * 2) { sc.busy = false; sc.finT = null; }
    }
    if (sc.name === 'chain' && S.mode === 'model') updateMeasure(sc);
    if (S.mode === 'lt') updateLT(sc);
    if (S.mode === 'sp') updateSP(sc);
    if (S.mode === 'fl') { const d = sc.drv; if (S.fl.boost && sc.ch.t - sc.changeT > settleT()) S.fl.boost = false; void d; }
  }
  const settleT = () => 6.0 / 2.5 + 1.6 / FS[S.fl.fi];
  const flReady = () => S.mode === 'fl' && S.sc && S.sc.ch.t - S.sc.changeT >= settleT();
  function updateMeasure(sc) {
    if (sc.done || sc.pk.some((p) => p == null)) return;
    const dtm = sc.pk[2] - sc.pk[0]; if (dtm <= 0) return;
    sc.done = true;
    S.meas = { v: 4.0 / dtm, vr: r1(4.0 / dtm), k: S.kv, m: S.mv, dt: dtm, t: sc.pk.map((p) => p - sc.sendT) };
    Sound.success(); updateCtl();
  }
  function updateLT(sc) {
    if (sc.done || sc.pk[0] == null || sc.pk[2] == null) return;
    sc.done = true; S.lt.time[S.lt.dir] = r2(sc.pk[2] - sc.pk[0]); Sound.success(); updateCtl();
  }
  function updateSP(sc) {
    if (sc.done || sc.pk[0] == null || sc.pk[1] == null) return;
    sc.done = true;
    const t = r2(sc.pk[1] - sc.pk[0]), Tn = TS[S.sp.Tv], mu = MUS[S.sp.mv];
    const row = { T: Tn, mu, t, v: r1(8.0 / t) };
    const i = S.sp.rec.findIndex((r) => r.T === Tn && r.mu === mu);
    if (i >= 0) S.sp.rec[i] = row; else if (S.sp.rec.length < 8) S.sp.rec.push(row); else { S.sp.rec.shift(); S.sp.rec.push(row); }
    Sound.success(); updateCtl();
  }

  /* ================= 그리기 도구 ================= */
  const MARKC = ['#e2464b', '#14a058', '#2563eb'];
  function drawHand(x, y) {
    D.shadow(() => { D.roundRect(x - 24, y - 17, 15, 34, 6); ctx.fillStyle = '#f59e0b'; ctx.fill(); }, { blur: 4, y: 1 });
    ctx.fillStyle = '#fcd34d'; ctx.fillRect(x - 22, y - 12, 4, 24);
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 2, y); ctx.stroke();
  }
  function drawDamper(x, y, label) {
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke();
    D.shadow(() => { D.roundRect(x + 14, y - 15, 30, 30, 5); const g = ctx.createLinearGradient(0, y - 15, 0, y + 15); g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#8a97ab'); ctx.fillStyle = g; ctx.fill(); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y - 9); ctx.lineTo(x + 22, y + 9); ctx.moveTo(x + 28, y - 9); ctx.lineTo(x + 28, y + 9); ctx.moveTo(x + 34, y - 9); ctx.lineTo(x + 34, y + 9); ctx.stroke();
    T(x + 29, y + 32, label || '흡수 끝', 13, MUTED, 'center', 800);
  }
  function ruler(X0, y, ppm, L, step) {
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X0 + L * ppm, y); ctx.stroke();
    for (let m = 0; m <= L + 1e-9; m += step) { const px = X0 + m * ppm; ctx.beginPath(); ctx.moveTo(px, y - 4); ctx.lineTo(px, y + 4); ctx.stroke(); T(px, y + 19, fx(m, 0), 13, '#3a465c', 'center', 800); }
    T(X0 + L * ppm + 6, y + 19, 'm', 13, MUTED, 'left', 700);
  }
  function flag(px, y0, y1, col, label) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke(); ctx.restore();
    D.label(px, y0 - 12, label, { bg: col, size: 13 });
  }
  /* 횡파 사슬 그리기 */
  function drawChainT(c, sc, o) {
    const ch = sc.ch, { X0, ppm } = chainGeom(c), Yc = o.Yc, a = ch.a, g = sc.gates;
    ruler(X0, Yc + 62, ppm, ch.L, 1);
    const px = (i) => X0 + i * a * ppm, py = (i) => Yc - ch.y[i] * ppm;
    // 표시점 안내선
    (o.marks || []).forEach((gi, k) => { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = o.markCol ? o.markCol[k] : MARKC[k]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px(gi), Yc - 52); ctx.lineTo(px(gi), Yc + 52); ctx.stroke(); ctx.restore(); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= ch.n; i++) i ? ctx.lineTo(px(i), py(i)) : ctx.moveTo(px(i), py(i));
    ctx.stroke();
    const r = clamp(a * ppm * 0.4, 3, 6.5);
    for (let i = 0; i <= ch.n; i++) D.sphere(px(i), py(i), r, '#fb923c', { gloss: r > 4.5 });
    (o.marks || []).forEach((gi, k) => {
      const col = o.markCol ? o.markCol[k] : MARKC[k];
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(px(gi), py(gi), r + 4.5, 0, TAU); ctx.stroke();
      D.sphere(px(gi), py(gi), r + 0.5, col, { gloss: true });
      D.label(px(gi), Yc + 90, o.markName ? o.markName[k] : '①②③'[k], { bg: col, size: 13 });
    });
    drawHand(X0, py(0)); T(X0 - 22, Yc - 28, '손', 13, MUTED, 'center', 800);
    drawDamper(X0 + ch.L * ppm, py(ch.n), '흡수 끝');
    return { X0, ppm, px, py, Yc };
  }
  /* 종파 사슬 그리기 */
  function drawChainL(c, sc, o) {
    const ch = sc.ch, { X0, ppm } = chainGeom(c), Yc = o.Yc, a = ch.a, n = ch.n;
    ruler(X0, Yc + 62, ppm, ch.L, 1);
    const px = (i) => X0 + (i * a + ch.y[i]) * ppm;
    // 밀·소 띠
    let imin = 0, imax = 0, smin = 0, smax = 0;
    for (let i = 0; i < n; i++) {
      const s = (ch.y[i + 1] - ch.y[i]) / a;
      if (s < smin) { smin = s; imin = i; } if (s > smax) { smax = s; imax = i; }
      const al = Math.min(0.85, Math.abs(s) * 6);
      if (al > 0.03) { ctx.fillStyle = s < 0 ? 'rgba(226,70,75,' + al + ')' : 'rgba(37,99,235,' + al + ')'; ctx.fillRect(px(i), Yc + 34, px(i + 1) - px(i) + 0.8, 11); }
    }
    ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fillRect(X0, Yc + 45, ch.L * ppm, 1.5);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px(0), Yc); ctx.lineTo(px(n), Yc); ctx.stroke();
    if (o.mark != null) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e2464b'; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; const gx = X0 + o.mark * a * ppm; ctx.beginPath(); ctx.moveTo(gx - A_L * ppm * 1.3, Yc - 32); ctx.lineTo(gx + A_L * ppm * 1.3, Yc - 32); ctx.stroke(); ctx.restore(); }
    for (let i = 0; i <= n; i++) {
      const x = px(i), s = i < n ? (ch.y[i + 1] - ch.y[i]) / a : 0, isM = i === o.mark;
      ctx.fillStyle = isM ? '#e2464b' : s < -0.02 ? '#c2410c' : '#f59e0b';
      D.roundRect(x - (isM ? 3.2 : 2.2), Yc - 24, isM ? 6.4 : 4.4, 48, 2.2); ctx.fill();
    }
    if (smin < -0.04) D.label(px(imin) + 6, Yc - 46, '밀', { bg: RED, size: 13 });
    if (smax > 0.04) D.label(px(imax) + 6, Yc - 46, '소', { bg: BLUE, size: 13 });
    drawHand(px(0), Yc); T(X0 - 22, Yc - 30, '손', 13, MUTED, 'center', 800);
    drawDamper(px(n), Yc, '흡수 끝');
    return { X0, ppm, px, Yc };
  }
  const chainGeom = (c) => { const ppm = (c.w - 30 - 64) / 6.5; return { X0: c.x + 30, ppm }; };

  /* 시간 그래프 (한 점의 변위–시간) */
  function traceGraph(rc, hs, col, label, A, tnow, win, showT, ruleT) {
    const t0 = tnow - win, xt = [];
    for (let s = Math.max(0, Math.ceil(t0)); s <= tnow; s++) xt.push(s);
    const M = frame(rc, { x0: t0, x1: tnow, y0: -A * 1.3, y1: A * 1.3, xt, yt: [-A, 0, A], yf: (v) => fx(v, 2, true).replace('+0.00', '0'), xl: showT, mt: 8, mb: showT ? 24 : 6, ml: PHONE ? 46 : 50, mr: 8 });
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let st = false;
    hs.forEach((p) => { if (p[0] < t0) return; const x = M.gx(p[0]), y = M.gy(clamp(p[1], -A * 1.3, A * 1.3)); st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; });
    ctx.stroke(); ctx.restore();
    T(M.ix + 6, rc.y + 17, label, 13, col, 'left', 800);
    if (showT) T(rc.x + rc.w - 8, rc.y + 17, 't (s)', 13, MUTED, 'right', 700);
    if (hs.length) { const p = hs[hs.length - 1]; D.sphere(M.gx(p[0]), M.gy(clamp(p[1], -A * 1.3, A * 1.3)), 5.5, col, { gloss: false }); }
    return M;
  }
  /* 사슬 모형의 확대 보기 (이웃 질량이 용수철로 이어져 있어요) */
  function drawMagnifier(cx, cy, R, sc, idx) {
    const ch = sc.ch, ppm = chainGeom(topCard()).ppm, sp = 33, ys = ppm * 1.25;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    const pts = [];
    for (let d = -2; d <= 2; d++) pts.push([cx + d * sp, cy - ch.y[idx + d] * ys * 0.8]);
    for (let d = 0; d < 4; d++) spring(pts[d][0], pts[d][1], pts[d + 1][0], pts[d + 1][1], 3, 6, '#64748b', 2.8);
    for (let d = 0; d < 5; d++) { const mid = d === 2; D.sphere(pts[d][0], pts[d][1], mid ? 10 : 8.5, mid ? MARKC[1] : '#fb923c', { gloss: true, shadow: true }); }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - R * 0.7, cy + R * 0.7); ctx.lineTo(cx - R * 1.0, cy + R * 1.0); ctx.stroke(); ctx.lineCap = 'butt';
    T(Math.min(cx, VW - 12 - 78), cy + R + 17, '🔍 확대: 용수철로 연결', 13, MUTED, 'center', 800);
  }
  const markDirTxt = (hs, k) => '';

  /* ================= ① 연결 모형 ================= */
  function drawModelScene() {
    const c = topCard(), sc = S.sc; cardBegin(c);
    T(c.x + 14, c.y + 24, '질량–용수철 사슬: 질량 ' + (sc.ch.N) + '개가 용수철로 이어져 있어요', PHONE ? 13.5 : 15, INK, 'left', 800);
    const Yc = c.y + (PHONE ? 236 : 226);
    const g = drawChainT(c, sc, { Yc, marks: sc.gates });
    drawMagnifier(c.x + c.w - (PHONE ? 78 : 96), c.y + (PHONE ? 112 : 96), PHONE ? 58 : 64, sc, sc.gates[1]);
    const d = sc.drv;
    [0, 1, 2].forEach((i) => T(c.x + 14, c.y + 52 + i * 21, '①②③'[i] + ' 위아래 ' + fx(sc.ch.y[sc.gates[i]], 2, true) + ' m · 좌우 이동 0.00 m', 13.5, MARKC[i], 'left', 800));
    if (d.kind === 'wave') T(c.x + 14, c.y + 124, '〰 계속 흔드는 중 (진동수 1 Hz)', 13, TEAL, 'left', 800);
    if (S.ts < 1) D.label(c.x + c.w - 14, c.y + 24, '🐢 슬로 모션', { bg: '#475569', size: 13, align: 'right' });
    ctx.restore();
    // 아래 칸
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, tnow = sc.ch.t, win = 4;
    const gw = PHONE ? PW - 24 : 470, gh = PHONE ? 62 : 64;
    T(x1, PY + 24, '📈 표시점의 위아래 위치–시간 그래프', 14, INK, 'left', 800);
    [0, 1, 2].forEach((i) => traceGraph({ x: x1, y: PY + 34 + i * (gh + 6), w: gw, h: gh }, sc.hist[i], MARKC[i], '표시점 ' + '①②③'[i] + ' (x = ' + fx(sc.gates[i] * sc.ch.a, 1) + ' m)', A_T, tnow, win, i === 2));
    const bx = PHONE ? x1 : x1 + gw + 14, by = PHONE ? PY + 34 + 3 * (gh + 6) + 6 : PY + 14, bw = PHONE ? PW - 24 : PW - gw - 38;
    D.roundRect(bx, by, bw, PHONE ? 150 : PH - 28, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(bx + 12, by + 26, '⏱ 속력 센서 (① → ③, 4.0 m)', 14, INK, 'left', 800);
    const m = S.meas, ok = m.v != null && m.k === S.kv && m.m === S.mv;
    if (ok) {
      T(bx + 12, by + 52, '도착 시각  ① ' + fx(m.t[0], 2) + ' s · ② ' + fx(m.t[1], 2) + ' s · ③ ' + fx(m.t[2], 2) + ' s', 13.5, MUTED, 'left', 700);
      T(bx + 12, by + 78, 'Δt = ' + fx(m.dt, 2) + ' s', 15, INK, 'left', 800);
      T(bx + 12, by + 104, 'v = 4.0 m / ' + fx(m.dt, 2) + ' s = ' + fx(m.vr, 1) + ' m/s', 16, '#1d4ed8', 'left', 800);
    } else T(bx + 12, by + 56, S.sc.busy ? '펄스가 달리는 중…' : '👆 펄스를 보내면 속력을 재요', 14, MUTED, 'left', 800);
    para(bx + 12, by + (PHONE ? 126 : 134), 'k가 클수록 이웃을 세게 당겨 빨라지고, m이 클수록 이웃이 늦게 움직여 느려져요.', bw - 24, 13.5, '#c2410c', 19, 700);
    if (!PHONE) para(bx + 12, by + 200, '표시점은 위아래로만 움직여요. 오른쪽으로 가는 것은 펄스의 모양이에요.', bw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ================= ② 종파·횡파 ================= */
  function drawLTScene() {
    const c = topCard(), sc = S.sc, L = sc.kind === 'L'; cardBegin(c);
    T(c.x + 14, c.y + 24, L ? '↔ 종파: 용수철을 앞뒤로 흔들어요 (파동 용수철 모형)' : '↕ 횡파: 용수철을 위아래로 흔들어요 (파동 용수철 모형)', PHONE ? 13.5 : 15, L ? '#c2410c' : '#1d4ed8', 'left', 800);
    const Yc = c.y + (PHONE ? 196 : 176), { X0, ppm } = chainGeom(c);
    if (L) drawChainL(c, sc, { Yc, mark: 30 }); else drawChainT(c, sc, { Yc, marks: [30], markCol: ['#e2464b'], markName: ['표시한 고리'] });
    const xs = (m) => X0 + m * ppm;
    flag(xs(1.0), Yc - 74, Yc + 56, '#16a34a', '출발선'); flag(xs(5.0), Yc - 74, Yc + 56, '#dc2626', '도착선');
    D.label((xs(1.0) + xs(5.0)) / 2, Yc + 106, '↔ 측정 구간 4.0 m', { bg: '#475569', size: 13 });
    // 스톱워치
    const t1 = sc.pk[0], t2 = sc.pk[2], run = t1 != null && t2 == null ? sc.ch.t - t1 : t1 != null ? t2 - t1 : 0;
    const swx = c.x + c.w - 124, swy = c.y + 34;
    D.roundRect(swx, swy, 112, 56, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(swx + 56, swy + 22, '⏱ 스톱워치', 13, '#94a3b8', 'center', 800);
    T(swx + 56, swy + 46, fx(run, 2) + ' s', 20, t2 != null ? '#4ade80' : '#fff', 'center', 800);
    if (S.ts < 1) D.label(c.x + 14, c.y + c.h - 16, '🐢 슬로 모션 (스톱워치는 실제 시간)', { bg: '#475569', size: 13, align: 'left' });
    // 방향 설명
    const bx = c.x + 14, by = c.y + 50;
    D.arrow(bx, by, bx + 40, by, { color: MUTED, width: 3, head: 9 }); T(bx + 46, by + 5, '진행 방향', 13, MUTED, 'left', 800);
    if (L) D.arrow(bx + 140, by, bx + 180, by, { color: '#e2464b', width: 3, head: 9 }); else D.arrow(bx + 160, by + 10, bx + 160, by - 12, { color: '#e2464b', width: 3, head: 9 });
    T(bx + 190, by + 5, '고리의 진동 방향', 13, '#e2464b', 'left', 800);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, sp = revealed('speedsOK') || (game && game.free);
    T(x1, PY + 26, '📋 4.0 m 통과 시간 기록', 14.5, INK, 'left', 800);
    const cx = PHONE ? [x1, x1 + 130, x1 + 250] : [x1, x1 + 190, x1 + 340];
    ['파동', '통과 시간', '속력 v'].forEach((h, i) => T(cx[i], PY + 54, h, 13.5, MUTED, 'left', 800));
    [['T', '↕ 횡파 (위아래)', BLUE], ['L', '↔ 종파 (앞뒤)', '#c2410c']].forEach((r, i) => {
      const yy = PY + 82 + i * 28, tm = S.lt.time[r[0]];
      T(cx[0], yy, r[1], 14, r[2], 'left', 800);
      T(cx[1], yy, tm == null ? '—' : fx(tm, 2) + ' s', 14.5, INK, 'left', 800);
      T(cx[2], yy, tm == null ? '—' : sp ? fx(4.0 / tm, 1) + ' m/s' : '?', 14.5, sp ? '#1d4ed8' : ORANGE, 'left', 800);
    });
    const ty = PY + 150;
    D.roundRect(x1 - 4, ty, PW - 20, PH - 160, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(x1 + 8, ty + 24, '🌍 우리 주변의 종파와 횡파', 14, INK, 'left', 800);
    const lines = ['소리: 종파 (공기가 밀했다 소했다 해요)', '물결·줄 위의 파: 횡파', '지진파: P파는 종파(약 6 km/s), S파는 횡파(약 3.5 km/s)'];
    lines.forEach((s2, i) => para(x1 + 8, ty + 50 + i * (PHONE ? 38 : 24), s2, PW - 50, 13.5, i === 2 ? '#c2410c' : INK, 19, 700));
  }

  /* ================= ③ v = fλ ================= */
  function flMeasure() {
    const sc = S.sc; if (!sc || S.mode !== 'fl') return null;
    const ch = sc.ch, a = ch.a, y = ch.y, i0 = Math.round(0.5 / a), i1 = ch.n - Math.round(0.8 / a), pk = [];
    for (let i = i0 + 1; i < i1; i++) if (y[i] > y[i - 1] && y[i] >= y[i + 1] && y[i] > 0.7 * A_S) {
      const den = y[i - 1] - 2 * y[i] + y[i + 1], off = den < -1e-12 ? 0.5 * (y[i - 1] - y[i + 1]) / den : 0;
      pk.push((i + off) * a);
    }
    if (pk.length < 2) return null;
    const j = Math.floor((pk.length - 2) / 2);
    return { x1: pk[j], x2: pk[j + 1], lam: pk[j + 1] - pk[j] };
  }
  function flMeasureT() {
    const sc = S.sc; if (!sc) return null;
    const hs = sc.hist[0], pk = [];
    for (let i = 1; i < hs.length - 1; i++) if (hs[i][1] > hs[i - 1][1] && hs[i][1] >= hs[i + 1][1] && hs[i][1] > 0.7 * A_S) {
      const den = hs[i - 1][1] - 2 * hs[i][1] + hs[i + 1][1], off = den < -1e-12 ? 0.5 * (hs[i - 1][1] - hs[i + 1][1]) / den : 0;
      pk.push(hs[i][0] + off * (hs[i + 1][0] - hs[i][0]));
    }
    if (pk.length < 2) return null;
    return { t1: pk[pk.length - 2], t2: pk[pk.length - 1], T: pk[pk.length - 1] - pk[pk.length - 2] };
  }
  function drawFlScene() {
    const c = topCard(), sc = S.sc, ch = sc.ch; cardBegin(c);
    T(c.x + 14, c.y + 24, '📷 위치–변위 그래프: 지금 이 순간 줄의 모양', PHONE ? 13.5 : 15, INK, 'left', 800);
    const rc = { x: c.x + 8, y: c.y + 34, w: c.w - 16, h: c.h - 44 };
    const M = frame(rc, { x0: 0, x1: 6, y0: -0.24, y1: 0.24, xt: [0, 1, 2, 3, 4, 5, 6], xminor: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5], yt: [-0.2, -0.1, 0, 0.1, 0.2], yf: (v) => fx(v, 1, true).replace('+0.0', '0'), xf: (v) => String(v), ml: PHONE ? 46 : 54, mr: 52, mt: 12, mb: 28 });
    T(M.ix + M.iw + 8, M.iy + M.ih + 20, 'x (m)', 13, MUTED, 'left', 700); T(rc.x + 8, rc.y + 14, 'y (m)', 13, MUTED, 'left', 700);
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
    ctx.strokeStyle = BLUE; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= ch.n; i++) { const x = M.gx(i * ch.a), y = M.gy(ch.y[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    const lm = flReady() ? flMeasure() : null;
    if (lm) {
      const yy = M.iy + 14;
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(M.gx(lm.x1), yy); ctx.lineTo(M.gx(lm.x2), yy); ctx.stroke();
      [lm.x1, lm.x2].forEach((xv) => { ctx.save(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(M.gx(xv), yy - 6); ctx.lineTo(M.gx(xv), M.gy(A_S)); ctx.stroke(); ctx.restore(); D.sphere(M.gx(xv), M.gy(A_S), 5.5, ORANGE, { gloss: false }); });
      D.label((M.gx(lm.x1) + M.gx(lm.x2)) / 2, yy + 16, 'λ = ' + fx(lm.lam, 2) + ' m', { bg: ORANGE, size: 13 });
    }
    // 손과 흡수 끝
    drawHand(M.ix + 18, M.gy(ch.y[0])); drawDamper(M.ix + M.iw + 4, M.gy(ch.y[ch.n]), '흡수 끝');
    D.label(M.gx(3.0), M.iy + M.ih - 12, '▼ 시간 그래프의 점 (x = 3.0 m)', { bg: '#475569', size: 13 });
    ctx.fillStyle = TEAL; D.sphere(M.gx(3.0), M.gy(ch.y[sc.gates[0]]), 6, TEAL, { gloss: true });
    if (S.paused) D.label(c.x + c.w - 70, c.y + 24, '⏸ 멈춤', { bg: '#475569', size: 13 });
    else if (S.fl.boost) D.label(c.x + c.w - 90, c.y + 24, '⏩ 빨리 감기', { bg: TEAL, size: 13 });
    if (!lm && !S.paused) T(c.x + c.w / 2, c.y + c.h - 52, flReady() ? '파장을 잴 봉우리가 부족해요' : '파가 줄 끝까지 퍼지는 중…', 13, MUTED, 'center', 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 130 : PH - 24;
    const tn = ch.t, M2 = traceGraph({ x: x1, y: PY + 10, w: gw, h: gh }, sc.hist[0], TEAL, '⏱ 시간–변위 그래프: x = 3.0 m인 점', A_S, tn, 3.2, true);
    const tm = flMeasureT();
    if (tm && flReady() && tm.t1 > tn - 3.2) {
      const yy = M2.iy + 12;
      ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(M2.gx(tm.t1), yy); ctx.lineTo(M2.gx(tm.t2), yy); ctx.stroke();
      [tm.t1, tm.t2].forEach((tv) => { ctx.save(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(M2.gx(tv), yy - 4); ctx.lineTo(M2.gx(tv), M2.gy(A_S)); ctx.stroke(); ctx.restore(); });
      D.label((M2.gx(tm.t1) + M2.gx(tm.t2)) / 2, yy + 15, 'T = ' + fx(tm.T, 2) + ' s', { bg: PURPLE, size: 13 });
    }
    // 기록표
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 10 + gh + 8 : PY + 10, tw = PHONE ? PW - 24 : PW - gw - 38;
    D.roundRect(tx, ty, tw, PHONE ? 190 : PH - 20, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '📋 측정 기록 (' + S.fl.rec.length + ')', 14, INK, 'left', 800);
    const cx = [tx + 12, tx + 86, tx + 174];
    ['f (Hz)', 'λ (m)', 'f × λ (m/s)'].forEach((h, i) => T(cx[i], ty + 50, h, 13, MUTED, 'left', 800));
    S.fl.rec.slice().sort((a, b) => a.f - b.f).forEach((r, i) => { const yy = ty + 76 + i * 24; T(cx[0], yy, fx(r.f, 1), 14, INK, 'left', 800); T(cx[1], yy, fx(r.lam, 2), 14, INK, 'left', 800); T(cx[2], yy, fx(r.fl, 2), 14, '#1d4ed8', 'left', 800); });
    if (!S.fl.rec.length) T(cx[0], ty + 76, '📍 기록하기를 눌러요', 13, '#9aa6bd', 'left', 700);
    if (S.fl.rec.length >= 3 && !PHONE) para(tx + 12, ty + 76 + 5 * 24 + 6, 'f × λ가 거의 같아요 → 이 줄에서 파동의 속력은 f를 바꿔도 변하지 않아요.', tw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ================= ④ 속력 요인 ================= */
  const MUC = ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b'];
  function drawSpScene() {
    const c = topCard(), sc = S.sc, ch = sc.ch, Tn = TS[S.sp.Tv], mu = MUS[S.sp.mv]; cardBegin(c);
    T(c.x + 14, c.y + 24, '🧵 줄 파동 (길이 10 m)  장력 T = ' + Tn + ' N, 단위 길이당 질량 μ = ' + fx(mu, 1) + ' kg/m', PHONE ? 13 : 15, INK, 'left', 800);
    const rc = { x: c.x + 8, y: c.y + 38, w: c.w - 16, h: c.h - 48 };
    const M = frame(rc, { x0: 0, x1: 10, y0: -0.24, y1: 0.24, xt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], yt: [-0.2, 0, 0.2], yf: (v) => fx(v, 1, true).replace('+0.0', '0'), ml: PHONE ? 44 : 50, mr: 52, mt: 22, mb: 28 });
    T(M.ix + M.iw + 8, M.iy + M.ih + 20, 'x (m)', 13, MUTED, 'left', 700);
    [[1.0, '#16a34a', '출발선'], [9.0, '#dc2626', '도착선']].forEach(([xv, col, lb]) => { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(M.gx(xv), M.iy + 8); ctx.lineTo(M.gx(xv), M.iy + M.ih); ctx.stroke(); ctx.restore(); D.label(M.gx(xv), M.iy + 2, lb, { bg: col, size: 13 }); });
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4);
    ctx.clip(); ctx.strokeStyle = MUC[S.sp.mv]; ctx.lineWidth = 2.2 + mu * 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= ch.n; i++) { const x = M.gx(i * ch.a), y = M.gy(ch.y[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    drawHand(M.ix + 18, M.gy(ch.y[0])); drawDamper(M.ix + M.iw + 4, M.gy(ch.y[ch.n]), '흡수 끝');
    const t1 = sc.pk[0], t2 = sc.pk[1], run = t1 != null && t2 == null ? ch.t - t1 : t1 != null ? t2 - t1 : 0;
    const swx = M.gx(5.4), swy = M.gy(-0.035);
    D.roundRect(swx, swy, 114, 52, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(swx + 57, swy + 20, '⏱ 8.0 m 통과', 13, '#94a3b8', 'center', 800);
    T(swx + 57, swy + 43, fx(t2 != null ? r2(t2 - t1) : run, 2) + ' s', 19, t2 != null ? '#4ade80' : '#fff', 'center', 800);
    if (S.ts < 1) D.label(M.ix + 12, M.iy + M.ih - 16, '🐢 슬로 모션 (스톱워치는 실제 시간)', { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, tw = PHONE ? PW - 24 : 372;
    T(x1, PY + 24, '📋 측정 기록 (' + S.sp.rec.length + ')', 14, INK, 'left', 800);
    const cx = PHONE ? [x1, x1 + 76, x1 + 170, x1 + 270] : [x1, x1 + 74, x1 + 172, x1 + 262];
    ['T (N)', 'μ (kg/m)', '시간 (s)', 'v = 8.0 m / t'].forEach((h, i) => T(cx[i], PY + 50, h, 13, MUTED, 'left', 800));
    S.sp.rec.slice().sort((a, b) => a.mu - b.mu || a.T - b.T).forEach((r, i) => {
      const yy = PY + 76 + i * 23, col = MUC[MUS.indexOf(r.mu)];
      T(cx[0], yy, String(r.T), 14, INK, 'left', 800); T(cx[1], yy, fx(r.mu, 1), 14, col, 'left', 800); T(cx[2], yy, fx(r.t, 2), 14, INK, 'left', 800); T(cx[3], yy, fx(r.v, 1) + ' m/s', 14, '#1d4ed8', 'left', 800);
    });
    if (!S.sp.rec.length) T(cx[0], PY + 76, '🔔 펄스를 보내면 자동으로 기록돼요', 13, '#9aa6bd', 'left', 700);
    const gx0 = PHONE ? x1 : x1 + tw + 12, gy0 = PHONE ? PY + 76 + 8 * 23 + 8 : PY + 12, gw = PHONE ? PW - 24 : PW - tw - 36, gh = PHONE ? PH - (76 + 8 * 23 + 16) : PH - 24;
    if (gh > 90) {
      const M2 = frame({ x: gx0, y: gy0, w: gw, h: gh }, { x0: 0, x1: 7, y0: 0, y1: 24, xt: [0, 2, 4, 6], yt: [0, 5, 10, 15, 20], xf: (v) => String(v), ml: PHONE ? 40 : 44, mr: 10, mt: 24, mb: 28 });
      T(gx0 + 8, gy0 + 16, 'v (m/s) – √T (N^½) 그래프', 13, INK, 'left', 800);
      if (revealed('form')) {
        const mus = Array.from(new Set(S.sp.rec.map((r) => r.mu)));
        mus.forEach((mu2) => { const s2 = 1 / Math.sqrt(mu2), xe = Math.min(7, 24 / s2); ctx.strokeStyle = MUC[MUS.indexOf(mu2)]; ctx.globalAlpha = 0.55; ctx.setLineDash([6, 4]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(M2.gx(0), M2.gy(0)); ctx.lineTo(M2.gx(xe), M2.gy(xe * s2)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; });
      }
      S.sp.rec.forEach((r) => D.sphere(M2.gx(Math.sqrt(r.T)), M2.gy(r.v), 6.5, MUC[MUS.indexOf(r.mu)], { gloss: false }));
      const cur = { x: Math.sqrt(Tn), y: Math.sqrt(Tn / mu) };
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(M2.gx(cur.x), M2.gy(cur.y), 9, 0, TAU); ctx.stroke();
    }
    if (revealed('form') && !PHONE) {
      D.roundRect(x1 - 2, PY + PH - 62, tw + 4, 50, 10); ctx.fillStyle = '#ecfdf5'; ctx.fill();
      T(x1 + 8, PY + PH - 42, '측정으로 얻은 관계: v = √(T/μ)', 14.5, '#15803d', 'left', 800);
      T(x1 + 8, PY + PH - 22, 'T가 4배 → v는 2배, μ가 4배 → v는 1/2', 13.5, '#14532d', 'left', 700);
    }
  }

  /* ================= 소리의 속력 ================= */
  const vAir = () => 331 + 0.6 * S.snd.temp;
  const SND_ROWS = [['공기', null, '#0ea5e9'], ['물', 1500, '#2563eb'], ['강철', 5900, '#64748b']];
  function drawSndScene() {
    const c = topCard(); cardBegin(c);
    T(c.x + 14, c.y + 24, '🔊 소리가 100 m를 가는 데 걸리는 시간 (소리는 종파)', PHONE ? 13 : 15, INK, 'left', 800);
    const lx = c.x + (PHONE ? 62 : 84), lw = c.w - (PHONE ? 62 : 84) - 24, r = S.snd.race;
    SND_ROWS.forEach((row, i) => {
      const v = row[1] || vAir(), y = c.y + 76 + i * (PHONE ? 76 : 80);
      T(c.x + 12, y + 5, row[0], 14.5, INK, 'left', 800);
      D.shadow(() => { D.roundRect(lx, y - 14, lw, 28, 14); ctx.fillStyle = '#e6edf8'; ctx.fill(); }, { blur: 4, y: 1 });
      const p = r ? clamp(r.t * RACE_K * v / 100, 0, 1) : 0;
      if (p > 0) { D.roundRect(lx, y - 14, lw * p, 28, 14); ctx.fillStyle = 'rgba(' + (i === 0 ? '14,165,233' : i === 1 ? '37,99,235' : '100,116,139') + ',.35)'; ctx.fill(); }
      ctx.fillStyle = '#16a34a'; ctx.fillRect(lx + 4, y - 18, 3, 36); ctx.fillStyle = '#dc2626'; ctx.fillRect(lx + lw - 7, y - 18, 3, 36);
      D.sphere(lx + 14 + (lw - 28) * p, y, 11, row[2], { gloss: true, shadow: true });
      const tt = 100 / v;
      T(lx, y + 33, 'v = ' + Math.round(v) + ' m/s', 13.5, MUTED, 'left', 800);
      if (r && p >= 1) T(lx + lw, y + 33, '도착! 100 m / ' + Math.round(v) + ' m/s = ' + fx(tt, tt < 0.1 ? 3 : 2) + ' s', 13.5, '#14753f', 'right', 800);
    });
    T(lx, c.y + c.h - 18, '출발', 13, '#16a34a', 'left', 800); T(lx + lw, c.y + c.h - 18, '100 m', 13, '#dc2626', 'right', 800);
    D.label(c.x + c.w / 2, c.y + c.h - 18, '영상은 실제 시간의 1/20로 느리게 보여 줘요', { bg: '#475569', size: 13 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '📋 소리의 속력', 15, INK, 'left', 800);
    const rows = [['공기 0 °C', '331 m/s'], ['공기 15 °C', '340 m/s'], ['공기 20 °C', '343 m/s'], ['공기 35 °C', '352 m/s'], ['물 (약)', '1500 m/s'], ['강철 (약)', '5900 m/s']];
    rows.forEach((rw, i) => { const col = i % 2, ro = Math.floor(i / 2); T(x1 + col * (PHONE ? 220 : 250), PY + 56 + ro * 26, rw[0], 14, INK, 'left', 800); T(x1 + col * (PHONE ? 220 : 250) + (PHONE ? 112 : 124), PY + 56 + ro * 26, rw[1], 14, '#1d4ed8', 'left', 800); });
    D.roundRect(x1 - 4, PY + 148, PW - 20, PH - 160, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(x1 + 8, PY + 174, '지금 기온 ' + S.snd.temp + ' °C → 공기 중 소리 v ≈ 331 + 0.6 × ' + S.snd.temp + ' = ' + fx(vAir(), 1) + ' m/s', PHONE ? 13.5 : 15, '#c2410c', 'left', 800);
    para(x1 + 8, PY + 202, '매질이 다르면 속력이 달라요. 같은 소리라도 공기가 따뜻할수록 빨라요. 속력은 매질의 성질이 정해요.', PW - 44, 13.5, INK, 19, 700);
    para(x1 + 8, PY + 202 + (PHONE ? 58 : 40), '물과 강철은 변형에 대한 복원력(탄성)이 공기보다 훨씬 커서 소리가 빨라요.', PW - 44, 13.5, '#14532d', 19, 700);
  }
  const RACE_K = 1 / 20;

  /* ================= 컨트롤 연결 ================= */
  function enterScene(mode) {
    S.paused = false; S.ts = mode === 'sp' ? 0.25 : 1;
    if (mode === 'model') { S.meas = { v: null, vr: null, k: null, m: null }; }
    if (mode === 'fl') { S.fl.boost = false; }
    if (mode === 'snd') { S.snd.race = null; }
    buildScene(mode);
    if (mode === 'fl') { S.sc.changeT = S.sc.ch.t; S.fl.boost = true; }
  }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; enterScene(mode); } updateCtl(); }
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    $('#oK').textContent = KS[S.kv] + ' N/m'; setSl('sK', S.kv, 0, 3);
    $('#oMm').textContent = fm3(MS[S.mv]) + ' kg'; setSl('sMm', S.mv, 0, 3);
    const sc = S.sc, wv = sc && sc.drv.kind === 'wave' && sc.drv.on;
    $('#bWave1').textContent = wv ? '■ 흔들기 멈추기' : '〰 계속 흔들기'; $('#bWave1').classList.toggle('btn-primary', !!wv);
    $('#nModel').textContent = wv ? '계속 흔들면 마루와 골이 규칙적으로 이어진 주기파가 돼요 (펄스 속력은 한 번 보낼 때 잰다).' : 'k와 m을 바꾸면 사슬이 새로 만들어져요. 펄스를 보내 속력을 재요.';
    $$('#dirSeg button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.lt.dir));
    $('#nLt').textContent = S.lt.dir === 'T' ? '고리가 위아래로 움직여요. 진동 방향이 진행 방향과 수직이에요.' : '고리가 앞뒤로 움직여요. 진동 방향이 진행 방향과 나란해요. 고리가 모인 곳이 밀, 벌어진 곳이 소예요.';
    $('#oF').textContent = fx(FS[S.fl.fi], 1) + ' Hz'; setSl('sF', S.fl.fi, 0, 4);
    $('#bPause').textContent = S.paused ? '▶ 계속 보기' : '⏸ 멈추고 읽기'; $('#bPause').classList.toggle('btn-primary', S.paused);
    $('#nFl').textContent = '진동수를 바꾸면 파가 줄 끝까지 퍼진 뒤 파장이 재어져요. 📍 기록하기로 표를 채워요.';
    $('#oT').textContent = TS[S.sp.Tv] + ' N'; setSl('sT', S.sp.Tv, 0, 3);
    $('#oMu').textContent = fx(MUS[S.sp.mv], 1) + ' kg/m'; setSl('sMu', S.sp.mv, 0, 3);
    $('#nSp').textContent = '장력이나 줄의 굵기를 바꾸면 새 줄이 준비돼요. 🔔 펄스를 보내면 8.0 m 통과 시간이 기록돼요.';
    $('#oTemp').textContent = S.snd.temp + ' °C'; setSl('sTemp', S.snd.temp / 5, 0, 7);
    $('#nSnd').textContent = '🏁 출발을 누르면 세 매질에서 소리가 100 m를 달려요.';
    $$('.slow-btn').forEach((b) => { b.textContent = S.ts < 1 ? '🐢 보통 속도로' : '🐢 느리게 보기'; b.classList.toggle('btn-primary', S.ts < 1); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('.slow-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ts = S.ts < 1 ? 1 : 0.25; updateCtl(); }));
  // ① 연결 모형
  $('#sK').addEventListener('input', (e) => { S.kv = +e.target.value; enterScene('model'); updateCtl(); });
  $('#sMm').addEventListener('input', (e) => { S.mv = +e.target.value; enterScene('model'); updateCtl(); });
  $('#bPulse1').addEventListener('click', () => { Sound.click(); const sc = S.sc; if (sc.drv.kind === 'wave') { sc.ch.y.fill(0); sc.ch.v.fill(0); sc.drv = { kind: 'none' }; } S.meas = { v: null, vr: null, k: null, m: null }; startPulse(sc); updateCtl(); });
  $('#bWave1').addEventListener('click', () => {
    Sound.click(); const sc = S.sc, d = sc.drv;
    if (d.kind === 'wave' && d.on) d.on = false; else { if (d.kind === 'pulse') { sc.ch.y.fill(0); sc.ch.v.fill(0); } sc.drv = { kind: 'wave', on: true, f: 1.0, ph: 0, env: 0, A: A_T }; sc.sendT = null; sc.busy = false; }
    updateCtl();
  });
  // ② 종파·횡파
  $$('#dirSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.lt.dir = b.dataset.d; buildScene('lt'); updateCtl(); }));
  $('#bPulse2').addEventListener('click', () => { Sound.click(); startPulse(S.sc); updateCtl(); });
  // ③ v = fλ
  $('#sF').addEventListener('input', (e) => { S.fl.fi = +e.target.value; if (S.sc) { S.sc.drv.f = FS[S.fl.fi]; S.sc.changeT = S.sc.ch.t; S.fl.boost = true; } updateCtl(); });
  $('#bPause').addEventListener('click', () => { Sound.click(); S.paused = !S.paused; updateCtl(); });
  $('#bRecF').addEventListener('click', () => {
    const lm = flReady() ? flMeasure() : null;
    if (!lm) { showHint('파가 줄 끝까지 퍼진 뒤에 기록해요. 잠깐 기다려 주세요.', 2600); return; }
    const f = FS[S.fl.fi], lam = r2(lm.lam), row = { f, lam, fl: r2(f * lam) };
    const i = S.fl.rec.findIndex((r) => r.f === f); if (i >= 0) S.fl.rec[i] = row; else S.fl.rec.push(row);
    Sound.click(); updateCtl();
  });
  $('#bClrF').addEventListener('click', () => { Sound.click(); S.fl.rec = []; updateCtl(); });
  // ④ 속력 요인
  $('#sT').addEventListener('input', (e) => { S.sp.Tv = +e.target.value; enterScene('sp'); updateCtl(); });
  $('#sMu').addEventListener('input', (e) => { S.sp.mv = +e.target.value; enterScene('sp'); updateCtl(); });
  $('#bPulse4').addEventListener('click', () => { Sound.click(); startPulse(S.sc); updateCtl(); });
  $('#bClr4').addEventListener('click', () => { Sound.click(); S.sp.rec = []; updateCtl(); });
  $('#sTemp').addEventListener('input', (e) => { S.snd.temp = +e.target.value * 5; S.snd.race = null; updateCtl(); });
  $('#bRace').addEventListener('click', () => { Sound.click(); S.snd.race = { t: 0 }; S.snd.ran = true; updateCtl(); });
  ['iVT', 'iVL', 'iLam', 'iTp', 'iVv', 'iPr'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode, sc = S.sc;
    if (m === 'model') {
      const ok = S.meas.v != null && S.meas.k === S.kv && S.meas.m === S.mv;
      L1 = 'k / m'; a = KS[S.kv] + ' N/m / ' + fm3(MS[S.mv]) + ' kg'; L2 = '펄스 속력 v (측정)'; b = ok ? fx(S.meas.vr, 1) + ' m/s' : '—'; L3 = '표시점 통과'; c = S.mk.max.filter((v) => v >= 0.8 * A_T).length + ' / 3';
    } else if (m === 'lt') {
      const tm = S.lt.time[S.lt.dir];
      L1 = '파동'; a = S.lt.dir === 'T' ? '횡파 (↕)' : '종파 (↔)'; L2 = '4.0 m 통과 시간'; b = tm == null ? '—' : fx(tm, 2) + ' s'; L3 = '진동 방향'; c = S.lt.dir === 'T' ? '진행에 수직' : '진행과 나란함';
    } else if (m === 'fl') {
      const lm = flReady() ? flMeasure() : null;
      L1 = '진동수 f'; a = fx(FS[S.fl.fi], 1) + ' Hz'; L2 = '파장 λ (측정)'; b = lm ? fx(lm.lam, 2) + ' m' : '—'; L3 = '주기 T = 1/f'; c = fx(1 / FS[S.fl.fi], 2) + ' s';
    } else if (m === 'sp') {
      const r = S.sp.rec.find((q) => q.T === TS[S.sp.Tv] && q.mu === MUS[S.sp.mv]);
      L1 = 'T / μ'; a = TS[S.sp.Tv] + ' N / ' + fx(MUS[S.sp.mv], 1) + ' kg/m'; L2 = '8.0 m 통과 시간'; b = r ? fx(r.t, 2) + ' s' : '—'; L3 = '속력 v'; c = r ? fx(r.v, 1) + ' m/s' : '—';
    } else { L1 = '기온'; a = S.snd.temp + ' °C'; L2 = '공기 중 소리'; b = fx(vAir(), 1) + ' m/s'; L3 = '물 / 강철'; c = '1500 / 5900 m/s'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미리 계산 (미션 준비용) ================= */
  function preRoll(sc, sec) {
    const n = Math.round(sec / DT);
    for (let i = 0; i < n; i++) {
      substep(sc, DT);
      if (i % 50 === 0 && sc.name === 'string' && S.mode === 'fl') { const hs = sc.hist[0]; hs.push([sc.ch.t, sc.ch.y[sc.gates[0]]]); while (hs.length && hs[0][0] < sc.ch.t - 3.2) hs.shift(); }
    }
  }
  function quickLT(dir) {
    const sc = chainSc(dir, kLT(dir), 0.04); startPulse(sc);
    for (let i = 0; i < 12000 && (sc.pk[0] == null || sc.pk[2] == null); i++) substep(sc, DT);
    return r2(sc.pk[2] - sc.pk[0]);
  }
  const fbMsg = (id, txt) => txt;

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '연결 모형: 무엇이 이동할까?', short: '연결 모형', icon: '🧩', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 파동은 무엇이 이동하는 걸까? 속력을 결정하는 것은 파장일까, 진동수일까, 매질일까?</p>' +
        '<div class="si-link">🔗 <b>중학교 소리 파동에서</b> 진폭·진동수·파장을, <b>앞 차시 용수철 진자</b>에서 질량과 용수철이 만드는 진동을 배웠어요. 이 진동자를 줄줄이 이어 붙인 것이 파동 모형이에요.</div>' +
        '<p><b>질량이 용수철로 이어진 사슬</b>이에요. 맨 앞 질량을 한 번 당기면 이웃이 차례로 끌려가며 <b>펄스</b>가 오른쪽으로 진행해요. 표시점 ①②③이 어떻게 움직이는지 살펴봐요. (파동 방정식은 쓰지 않고, 이웃끼리 힘을 주고받는 모형으로 설명해요.)</p>',
      features: ['model'],
      setup() { resetFlags(); S.kv = 1; S.mv = 1; setScene('model'); enterScene('model'); },
      recap: '파동은 이웃한 부분이 힘을 주고받으며 차례로 퍼져 나가는 현상이에요. 매질의 각 부분은 제자리에서 진동하고, 이동하는 것은 진동 상태(모양)와 에너지예요. 이웃을 당기는 힘(k)이 클수록 빠르고, 질량(m)이 클수록 느려요.',
      summary: '<ul><li><b>연결 모형</b>: 질량이 용수철로 이어진 사슬에서 한 곳을 흔들면 이웃이 힘을 받아 차례로 움직여요. 이것이 <b>탄성파의 진행</b>이에요.</li>' +
        '<li>매질의 각 부분(표시점)은 <b>제자리에서 진동</b>할 뿐 파동을 따라 이동하지 않아요. 이동하는 것은 <b>진동 상태(펄스의 모양)와 에너지</b>예요.</li>' +
        '<li>용수철 상수 k가 클수록(이웃을 세게 당길수록) 펄스는 빨라지고, 질량 m이 클수록 느려져요. 속력은 <b>매질의 성질</b>이 정해요.</li>' +
        '<li>계속 흔들면 마루와 골이 규칙적으로 이어진 주기파가 돼요.</li></ul>',
      missions: [
        {
          title: '펄스를 보내 표시점 추적하기',
          goal: '<b>👆 펄스 보내기</b>를 눌러 펄스가 표시점 <b>①②③</b>을 차례로 지나가게 해요. 표시점이 어느 방향으로 움직이는지 살펴봐요.',
          hint: '펄스가 사슬 끝까지 가는 동안 아래 그래프에서 표시점 ①②③이 차례로 솟아올라요. 🐢 느리게 보기를 켜도 돼요.',
          setup() { resetFlags(); S.kv = 1; S.mv = 1; setScene('model'); enterScene('model'); updateCtl(); },
          check: () => S.mk.max.every((v) => v >= 0.8 * A_T),
          hold: 0.5,
          status: () => S.mk.max.map((v, i) => mark(v >= 0.8 * A_T) + ' ' + '①②③'[i] + ' 통과').join(' &nbsp; '),
          explain: '세 표시점 모두 <b>제자리에서 위아래로만</b> 움직였어요(좌우 이동은 0). 펄스가 지나갈 때만 솟았다 내려오고, 이웃에게 힘을 전해 다음 질량이 같은 동작을 되풀이해요. 오른쪽으로 이동한 것은 질량이 아니라 <b>진동 상태와 에너지</b>예요.',
        },
        {
          title: '더 빠른 펄스 만들기',
          goal: '<b>k</b>와 <b>m</b>을 바꿔서 펄스 속력이 <b>6 m/s 이상</b>이 되게 해요. 바꾼 뒤에는 펄스를 새로 보내 속력 센서로 확인해요.',
          hint: 'k는 크게(100 N/m), m은 작게(0.020 kg) 해 봐요. 슬라이더를 바꿀 때마다 펄스를 다시 보내야 속력이 측정돼요.',
          setup() { resetFlags(); S.kv = 1; S.mv = 1; setScene('model'); enterScene('model'); updateCtl(); },
          check: () => S.meas.v != null && S.meas.k === S.kv && S.meas.m === S.mv && S.meas.vr >= 6.0,
          hold: 0.5,
          status() { const ok = S.meas.v != null && S.meas.k === S.kv && S.meas.m === S.mv; return mark(ok && S.meas.vr >= 6.0) + ' 측정 v = ' + (ok ? fx(S.meas.vr, 1) : '—') + ' m/s (목표 6.0 이상) &nbsp; k = ' + KS[S.kv] + ' N/m, m = ' + fm3(MS[S.mv]) + ' kg'; },
          explain: 'k = 100 N/m, m = 0.020 kg일 때 펄스 속력은 약 <b>7 m/s</b>예요. 이웃을 당기는 힘이 클수록(k↑) 이웃이 빨리 따라오고, 이웃의 질량이 클수록(m↑) 반응이 늦어져 느려져요. 처음의 k = 25 N/m, m = 0.040 kg에서는 2.5 m/s였어요.',
        },
        {
          type: 'quiz', title: '파도는 물을 실어 나를까?',
          goal: '바다의 파도가 해안 쪽으로 밀려오는 것을 연결 모형으로 생각해 보면, <b>파도가 진행할 때 이동하는 것</b>은 무엇일까요?',
          setup() { resetFlags(); S.kv = 1; S.mv = 1; setScene('model'); enterScene('model'); startPulse(S.sc); updateCtl(); },
          choices: ['물(매질)이 파도와 함께 해안까지 이동해요', '매질의 각 부분은 제자리에서 진동하고, 진동 상태(모양)와 에너지가 이동해요', '파도가 한 번 지나가면 매질이 한 칸씩 앞으로 옮겨져요', '매질이 이동하지 않으므로 에너지도 전달되지 않아요'],
          answer: 1,
          feedback: ['표시점은 위아래로 오르내릴 뿐 오른쪽으로 가지 않았어요. 물 위의 나뭇잎도 파도에 제자리에서 오르내려요.', '', '표시점의 위치는 파가 지나간 뒤 원래 자리로 돌아왔어요. 매질은 옮겨지지 않아요.', '매질은 이동하지 않지만, 이웃에게 힘을 전하며 에너지를 전달해요. 해안에 닿은 파도가 일을 하는 까닭이에요.'],
          explain: '파동이 진행해도 <b>매질의 각 부분은 제자리에서 진동</b>할 뿐이에요. 이웃에게 힘을 전해 <b>진동 상태와 에너지</b>가 차례로 퍼져 나가는 것이 파동의 진행이에요.',
        },
      ],
    },
    {
      title: '종파와 횡파: 흔드는 방향', short: '종파·횡파', icon: '↕', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 펄스가 이웃에게 힘을 전하며 진행하고, 매질은 제자리에서 진동하는 것을 봤어요. 그런데 <b>흔드는 방향</b>을 바꾸면 어떻게 달라질까요?</div>' +
        '<p>파동 용수철의 한쪽 끝을 <b>위아래로(횡파)</b> 또는 <b>앞뒤로(종파)</b> 한 번 흔들어요. 표시한 고리의 진동 방향을 보고, 스톱워치로 출발선에서 도착선까지 <b>4.0 m 통과 시간</b>을 재요.</p>',
      features: ['lt'],
      setup() { resetFlags(); S.lt.dir = 'T'; S.lt.time = { T: null, L: null }; setScene('lt'); enterScene('lt'); },
      recap: '횡파는 매질의 진동 방향이 진행 방향에 수직이고, 종파는 나란해요. 종파에서는 매질이 밀한 곳과 소한 곳이 이동해요. 소리는 종파, 물결·줄 위의 파동은 횡파이고, 지진파는 P파(종파)가 S파(횡파)보다 빨라요.',
      summary: '<ul><li><b>횡파</b>: 매질의 진동 방향이 진행 방향에 <b>수직</b> (줄 위의 파, 물결, 빛, 지진파의 S파).</li>' +
        '<li><b>종파</b>: 매질의 진동 방향이 진행 방향과 <b>나란함</b>. 매질이 모인 곳(<b>밀</b>)과 벌어진 곳(<b>소</b>)이 이동해요 (소리, 지진파의 P파).</li>' +
        '<li>파동 용수철 4.0 m: 횡파 1.60 s → <b>2.5 m/s</b>, 종파 1.50 s → <b>2.7 m/s</b>. (속력 = 거리 / 시간)</li>' +
        '<li>지진파: P파(종파) 약 6 km/s, S파(횡파) 약 3.5 km/s → P파가 먼저 도착해요.</li>' +
        '<li>기체는 모양이 변할 때 되돌리려는 힘이 없어서 소리가 종파(밀·소)로만 전달돼요.</li></ul>',
      missions: [
        {
          title: '횡파와 종파 만들어 시간 재기',
          goal: '<b>↕ 횡파</b>와 <b>↔ 종파</b>를 각각 한 번씩 보내서, 출발선에서 도착선까지의 <b>4.0 m 통과 시간</b>을 재요.',
          hint: '파동 종류를 고른 뒤 👆 한 번 흔들기를 눌러요. 도착선을 지나면 스톱워치가 멈추고 기록돼요. 🐢 느리게 보기를 써도 돼요.',
          setup() { resetFlags(); S.lt.dir = 'T'; S.lt.time = { T: null, L: null }; setScene('lt'); enterScene('lt'); updateCtl(); },
          check: () => S.lt.time.T != null && S.lt.time.L != null,
          hold: 0.5,
          status: () => mark(S.lt.time.T != null) + ' 횡파 ' + (S.lt.time.T != null ? fx(S.lt.time.T, 2) + ' s' : '아직') + ' &nbsp; ' + mark(S.lt.time.L != null) + ' 종파 ' + (S.lt.time.L != null ? fx(S.lt.time.L, 2) + ' s' : '아직'),
          explain: '횡파에서는 표시한 고리가 <b>진행 방향에 수직</b>(위아래)으로, 종파에서는 <b>진행 방향과 나란히</b>(앞뒤) 진동했어요. 종파에서는 고리가 모인 <b>밀</b>과 벌어진 <b>소</b>가 오른쪽으로 이동했어요.',
        },
        {
          title: '두 파동의 속력 계산하기', manual: true,
          goal: '기록한 통과 시간으로 <b>횡파와 종파의 속력</b>(m/s)을 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '속력 = 거리 / 시간이에요. 거리는 출발선에서 도착선까지 4.0 m예요.',
          setup() {
            resetFlags(); clr('iVT', 'iVL'); setFlag('speeds', true);
            if (S.lt.time.T == null) S.lt.time.T = quickLT('T'); if (S.lt.time.L == null) S.lt.time.L = quickLT('L');
            setScene('lt'); updateCtl();
          },
          check() {
            const a = num('iVT'), b = num('iVL'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const ta = S.lt.time.T, tb = S.lt.time.L, oks = [near(a, 4.0 / ta, 0.08), near(b, 4.0 / tb, 0.08)];
            fb([[$('#iVT'), oks[0]], [$('#iVL'), oks[1]]]);
            if (oks.every(Boolean)) { S.flags.speedsOK = true; return true; }
            if (near(a, 4.0 / tb, 0.08) && near(b, 4.0 / ta, 0.08)) return '횡파와 종파의 시간이 바뀌었어요. 표를 다시 확인해요.';
            if (!oks[0] && near(a, ta, 0.05)) return '통과 시간(s)이 아니라 속력(m/s)을 구해요. 4.0 m를 시간으로 나눠요.';
            return !oks[0] ? '횡파: 4.0 m / ' + fx(ta, 2) + ' s를 계산해 보세요.' : '종파: 4.0 m / ' + fx(tb, 2) + ' s를 계산해 보세요.';
          },
          status: () => '입력 횡파 ' + ($('#iVT').value.trim() || '—') + ' m/s, 종파 ' + ($('#iVL').value.trim() || '—') + ' m/s',
          explain: '횡파 4.0 m / 1.60 s = <b>2.5 m/s</b>, 종파 4.0 m / 1.50 s ≈ <b>2.7 m/s</b>예요. 같은 파동 용수철에서도 파동의 종류에 따라 속력이 조금 달라요(앞뒤로 밀고 당기는 힘이 위아래로 당기는 힘보다 조금 커서 종파가 약간 더 빨라요).',
        },
        {
          type: 'quiz', title: '지진파 P파와 S파',
          goal: '진원에서 <b>210 km</b> 떨어진 관측소에 P파(종파, 약 6 km/s)와 S파(횡파, 약 3.5 km/s)가 도착해요. 어느 쪽이 먼저 오고, 도착 시간 차는?',
          setup() { resetFlags(); S.flags.speedsOK = true; setScene('lt'); enterScene('lt'); updateCtl(); },
          choices: ['S파(횡파)가 먼저 도착하고, 약 25 s 차이예요', 'P파(종파)가 먼저 도착하고, 약 25 s 차이예요', 'P파(종파)가 먼저 도착하고, 약 60 s 차이예요', '같은 땅속을 지나므로 동시에 도착해요'],
          answer: 1,
          feedback: ['속력이 큰 P파가 먼저 도착해요. P파 약 6 km/s, S파 약 3.5 km/s예요.', '', '60 s는 S파가 도착하는 시각(210 / 3.5)이에요. 차이는 60 s − 35 s예요.', '지진파의 종류에 따라 속력이 달라서 도착 시각이 달라요.'],
          explain: 'P파는 210 / 6 = <b>35 s</b>, S파는 210 / 3.5 = <b>60 s</b> 후에 도착해서 차이는 <b>25 s</b>예요. 이 시간 차로 진원까지의 거리를 알 수 있어요. 소리가 종파인 까닭도 같아요: 기체는 모양이 변할 때 되돌리려는 힘이 없어 밀·소(종파)로만 전달돼요.',
        },
      ],
    },
    {
      title: 'v = fλ: 진동수와 파장', short: 'v = fλ', icon: '〰', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 펄스의 속력을 거리와 시간으로 쟀어요. 이제 줄의 끝을 <b>일정한 진동수 f</b>로 계속 흔들어 규칙적인 파를 만들고, 진동수·파장·속력의 관계를 찾아요.</div>' +
        '<p>위쪽 그래프는 <b>지금 이 순간 줄의 모양</b>(위치–변위), 아래 그래프는 <b>한 점의 시간에 따른 움직임</b>(시간–변위)이에요. 마루–마루 거리가 <b>파장 λ</b>, 한 번 진동하는 시간이 <b>주기 T = 1/f</b>예요.</p>',
      features: ['fl'],
      setup() { resetFlags(); S.fl.fi = 2; S.fl.rec = []; setScene('fl'); enterScene('fl'); },
      recap: '주기파에서 파동은 한 주기 T 동안 한 파장 λ만큼 진행하므로 v = λ/T = fλ예요. 줄의 성질이 같으면 속력은 일정하므로 진동수를 높이면 파장이 짧아져요(f와 λ는 반비례).',
      summary: '<ul><li><b>파장 λ</b>: 마루에서 이웃한 마루까지의 거리. <b>주기 T</b>: 한 점이 한 번 진동하는 시간. <b>진동수 f = 1/T</b>.</li>' +
        '<li>한 주기 동안 파동은 한 파장만큼 진행해요: <b>v = λ/T = fλ</b>.</li>' +
        '<li>측정(속력 2.5 m/s인 줄): f = 1.0 Hz → λ = 2.5 m, 2.0 Hz → 1.25 m, 3.0 Hz → 0.83 m. <b>f × λ는 일정(2.5 m/s)</b>.</li>' +
        '<li>진동수를 2배로 하면 파장은 1/2이 되고 <b>속력은 그대로</b>예요. 속력은 매질이 정해요.</li>' +
        '<li>위치–변위 그래프에서는 파장 λ를, 시간–변위 그래프에서는 주기 T를 읽어요.</li></ul>',
      missions: [
        {
          title: '진동수 세 가지로 파장 재기',
          goal: '진동수 f를 <b>세 가지 이상</b> 골라 파장이 재어지면 <b>📍 기록하기</b>를 눌러요. 표의 <b>f × λ</b>를 비교해요.',
          hint: '진동수를 바꾸면 파가 줄 끝까지 퍼질 때까지 잠깐 기다려요(⏩ 빨리 감기). 주황색 자로 λ가 재어지면 기록하기를 눌러요.',
          setup() { resetFlags(); S.fl.fi = 2; S.fl.rec = []; setScene('fl'); enterScene('fl'); updateCtl(); },
          check: () => new Set(S.fl.rec.map((r) => r.f)).size >= 3,
          hold: 0.5,
          status: () => mark(S.fl.rec.length >= 3) + ' 기록한 진동수 ' + S.fl.rec.length + ' / 3 ' + (S.fl.rec.length ? '(' + S.fl.rec.slice().sort((a, b) => a.f - b.f).map((r) => fx(r.f, 1) + ' Hz').join(', ') + ')' : ''),
          explain: 'f = 1.0 Hz에서 λ ≈ 2.5 m, 2.0 Hz에서 ≈ 1.25 m, 3.0 Hz에서 ≈ 0.83 m예요. 진동수가 커질수록 파장은 짧아지지만 <b>f × λ는 약 2.5 m/s로 거의 같아요</b>. 이것이 이 줄에서 파동의 속력이에요.',
        },
        {
          title: '두 그래프에서 λ와 T 읽기', manual: true,
          goal: 'f = 2.0 Hz인 파의 두 그래프를 읽어 <b>λ</b>(m)와 <b>T</b>(s)를 입력하고, <b>v = λ/T</b>를 계산해 ✔ 확인하기를 누르세요.',
          hint: '⏸ 멈추고 읽기를 누르면 그래프가 멈춰요. 위치 그래프에서 마루–마루 거리가 λ, 시간 그래프에서 마루–마루 시간이 T예요.',
          setup() {
            resetFlags(); clr('iLam', 'iTp', 'iVv'); setFlag('read', true); S.fl.fi = 2; setScene('fl'); enterScene('fl');
            const sc = S.sc; sc.drv.f = FS[2]; preRoll(sc, settleT() + 3.4); sc.changeT = sc.ch.t - settleT() - 0.1; S.fl.boost = false; updateCtl();
          },
          check() {
            const lam = num('iLam'), tp = num('iTp'), v = num('iVv'); if (lam == null || tp == null || v == null) return '세 칸 모두 입력해 주세요.';
            const oks = [near(lam, 1.25, 0.07), near(tp, 0.5, 0.03), near(v, 2.5, 0.2) && near(v, lam / tp, 0.2)];
            fb([[$('#iLam'), oks[0]], [$('#iTp'), oks[1]], [$('#iVv'), oks[2]]]);
            if (oks.every(Boolean)) return true;
            if (!oks[0] && near(lam, 0.625, 0.04)) return '마루에서 골까지는 반 파장이에요. 마루에서 이웃한 마루까지가 λ예요.';
            if (!oks[1] && near(tp, 1.0, 0.05)) return '이웃한 두 마루 사이의 시간이 T예요. 두 주기를 읽은 것 같아요.';
            if (!oks[2] && oks[0] && oks[1]) return 'v = λ / T = ' + fx(lam, 2) + ' m / ' + fx(tp, 2) + ' s를 계산해 보세요.';
            return !oks[0] ? '위치–변위 그래프에서 이웃한 마루 사이의 거리를 눈금(0.5 m 칸)으로 읽어 보세요.' : !oks[1] ? '시간–변위 그래프에서 이웃한 마루 사이의 시간을 눈금(1 s 칸)과 비교해 읽어 보세요.' : 'v = λ / T를 다시 계산해 보세요.';
          },
          status: () => '입력 λ ' + ($('#iLam').value.trim() || '—') + ' m, T ' + ($('#iTp').value.trim() || '—') + ' s, v ' + ($('#iVv').value.trim() || '—') + ' m/s',
          explain: '위치 그래프에서 λ ≈ <b>1.25 m</b>, 시간 그래프에서 T ≈ <b>0.50 s</b>예요. v = λ/T = 1.25 / 0.50 = <b>2.5 m/s</b>이고, f = 1/T = 2.0 Hz이므로 v = fλ = 2.0 × 1.25 = 2.5 m/s로 같아요.',
        },
        {
          type: 'quiz', title: '진동수를 2배로 하면?',
          goal: '같은 줄의 한쪽 끝을 흔드는 진동수를 <b>2배</b>로 높이면 파장과 파동의 속력은 어떻게 될까요?',
          setup() { resetFlags(); S.flags.read = false; setScene('fl'); enterScene('fl'); updateCtl(); },
          choices: ['파장은 그대로이고 속력이 2배가 돼요', '파장은 1/2이 되고 속력은 그대로예요', '파장이 2배가 되고 속력은 1/2이 돼요', '파장도 속력도 모두 1/2이 돼요'],
          answer: 1,
          feedback: ['속력은 매질(줄)이 정해요. 진동수를 바꿔도 같은 줄에서는 속력이 그대로예요.', '', '진동수가 커지면 한 주기 동안 가는 거리가 짧아져 파장이 짧아져요. 길어지지 않아요.', '속력은 줄이 정하므로 그대로예요. 파장만 1/2이 돼요 (v = fλ에서 f가 2배, v 일정이면 λ는 1/2).'],
          explain: '속력은 줄의 성질이 정하므로 일정해요. <b>v = fλ</b>에서 v가 일정할 때 f가 2배가 되면 <b>λ는 1/2</b>이 돼요(1.0 Hz에서 2.5 m → 2.0 Hz에서 1.25 m). 진동수를 높인다고 파동이 더 빨리 가는 것은 아니에요.',
        },
      ],
    },
    {
      title: '속력 요인: 줄과 소리', short: '속력 요인', icon: '🧵', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 줄에서는 진동수가 달라도 속력이 같다는 것을 알았어요. 그렇다면 <b>속력은 무엇이 정할까요?</b> 줄을 팽팽하게 당기거나 굵은 줄로 바꾸어 펄스가 8.0 m를 가는 시간을 재요.</div>' +
        '<p>줄의 <b>장력 T</b>(N)와 <b>단위 길이당 질량 μ</b>(kg/m)를 바꾸며 펄스의 속력을 재고 규칙을 찾아요. 이어서 <b>소리의 속력</b>이 매질과 온도에 따라 어떻게 다른지 비교해요.</p>',
      features: ['sp', 'snd'],
      setup() { resetFlags(); S.sp.Tv = 0; S.sp.mv = 0; S.sp.rec = []; S.snd.temp = 15; setScene('sp'); enterScene('sp'); },
      recap: '줄에서 펄스의 속력은 장력이 클수록, 줄이 가벼울수록 커요(측정: T가 4배 → v 2배, μ가 4배 → v 1/2, 정리하면 v = √(T/μ)). 소리의 속력은 공기에서 약 340 m/s(온도가 높을수록 빨라짐)이고, 탄성이 큰 물과 강철에서 훨씬 빨라요.',
      summary: '<ul><li>줄 파동의 속력은 <b>매질(줄)의 성질</b>이 정해요: 장력 T가 클수록 빠르고, 단위 길이당 질량 μ가 클수록 느려요.</li>' +
        '<li>측정: μ = 0.1 kg/m에서 T = 10 N → 10 m/s, T = 40 N → 20 m/s (<b>T 4배 → v 2배</b>), μ = 0.4 kg/m, T = 10 N → 5 m/s.</li>' +
        '<li>이 측정 결과를 정리하면 <b>v = √(T/μ)</b> (유도 없이 측정에서 얻은 관계).</li>' +
        '<li>공기 중 소리의 속력: 0 °C에서 331 m/s, 약 <b>v ≈ 331 + 0.6t</b> (t: 섭씨 온도). 15 °C에서 340 m/s.</li>' +
        '<li>물(약 1500 m/s)과 강철(약 5900 m/s)에서는 탄성이 커서 소리가 훨씬 빨라요.</li></ul>',
      missions: [
        {
          title: '장력과 줄의 굵기를 바꿔 속력 재기',
          goal: 'μ = 0.1 kg/m인 줄에서 장력 <b>10, 20, 40 N</b>의 속력을 재요. 그다음 줄을 무겁게(<b>μ = 0.4</b>) 하고 T = 10 N에서 한 번 더 재요.',
          hint: '🔔 펄스를 보내면 8.0 m 통과 시간이 자동으로 기록돼요. 🐢 느리게 보기로 펄스가 가는 모습을 보세요. 값을 바꿀 때마다 새 줄이 준비돼요.',
          setup() { resetFlags(); S.sp.Tv = 0; S.sp.mv = 0; S.sp.rec = []; setScene('sp'); enterScene('sp'); updateCtl(); },
          check() { const has = (T2, m2) => S.sp.rec.some((r) => r.T === T2 && r.mu === m2); const ok = has(10, 0.1) && has(20, 0.1) && has(40, 0.1) && has(10, 0.4); if (ok) S.flags.form = true; return ok; },
          hold: 0.5,
          status() { const has = (T2, m2) => S.sp.rec.some((r) => r.T === T2 && r.mu === m2); return mark(has(10, 0.1)) + ' T 10 N &nbsp; ' + mark(has(20, 0.1)) + ' T 20 N &nbsp; ' + mark(has(40, 0.1)) + ' T 40 N &nbsp; ' + mark(has(10, 0.4)) + ' μ 0.4'; },
          explain: 'μ = 0.1 kg/m에서 T = 10, 20, 40 N일 때 v ≈ 10, 14, 20 m/s예요. <b>장력이 4배(10 → 40 N)가 되면 속력은 2배</b>(10 → 20 m/s)예요. 줄을 무겁게 한 μ = 0.4 kg/m에서는 5 m/s로 느려요. 정리하면 <b>v = √(T/μ)</b>예요(측정에서 얻은 관계).',
        },
        {
          title: '장력 4배일 때 속력 예측하기', manual: true,
          goal: 'μ = 0.1 kg/m인 줄의 장력이 10 N일 때 속력은 10 m/s예요. 장력을 <b>4배(40 N)</b>로 하면 속력은 몇 m/s일까요? 예측해서 입력하세요.',
          hint: 'v가 장력의 제곱근에 비례해요. 4배의 제곱근은 2배예요.',
          setup() { resetFlags(); S.flags.form = true; clr('iPr'); setFlag('pred', true); setScene('sp'); enterScene('sp'); updateCtl(); },
          check() {
            const v = num('iPr'); if (v == null) return '예측한 속력을 숫자로 입력해 주세요 (m/s).';
            const ok = near(v, 20, 1); fb([[$('#iPr'), ok]]);
            if (ok) return true;
            if (near(v, 40, 2)) return '장력이 4배이면 속력은 4배가 아니라 √4 = 2배예요.';
            if (near(v, 10, 1)) return '10 m/s는 장력이 10 N일 때의 속력이에요. 장력이 4배가 되었어요.';
            return 'v는 T의 제곱근에 비례해요. 10 m/s의 몇 배가 될까요?';
          },
          status: () => '입력 ' + ($('#iPr').value.trim() || '—') + ' m/s',
          explain: 'v = √(T/μ) = √(40/0.1) = <b>20 m/s</b>예요. 장력이 4배가 되면 속력은 √4 = <b>2배</b>(10 → 20 m/s)가 돼요.',
        },
        {
          type: 'quiz', title: '소리는 왜 물에서 더 빠를까?',
          goal: '소리는 공기(약 340 m/s)보다 <b>물(약 1500 m/s)</b>에서 훨씬 빨리 진행해요. 그 까닭으로 알맞은 것은?',
          setup() { resetFlags(); S.flags.form = true; setScene('snd'); enterScene('snd'); S.snd.race = { t: 0 }; updateCtl(); },
          choices: ['물이 공기보다 가벼워서 소리가 쉽게 지나가요', '소리의 진동수가 물에서 더 커서 더 빨리 가요', '물은 변형되면 되돌리려는 힘(탄성)이 공기보다 훨씬 커서 이웃에 힘이 빨리 전해져요', '물속에서는 소리가 횡파로 바뀌어서 더 빨라요'],
          answer: 2,
          feedback: ['물은 공기보다 밀도가 커요(무거워요). 그래도 빠른 것은 탄성이 그보다 훨씬 크기 때문이에요.', '소리의 속력은 진동수가 아니라 매질이 정해요. 진동수가 달라도 같은 매질에서는 속력이 같아요.', '', '소리는 물속에서도 종파(밀·소)예요. 속력은 매질의 탄성이 커서 빨라요.'],
          explain: '속력은 매질의 성질이 정해요. 연결 모형에서 <b>k(이웃을 당기는 힘)가 클수록 빠르다</b>는 것을 떠올려 보세요. 물은 공기보다 변형에 대한 복원력(탄성)이 훨씬 커서 소리가 약 1500 m/s로 빨라요. 강철은 더 커서 약 5900 m/s예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-wave-propagation', mount: '#game', badge: '탄성파 박사', homeHref: '../../index.html#hm',
    featureLabels: { model: '🧩 질량–용수철 사슬 · 속력 센서', lt: '↕↔ 종파·횡파 · 스톱워치', fl: '〰 주기파 · 위치/시간 그래프', sp: '🧵 줄의 장력·굵기 · 측정표', snd: '🔊 소리의 속력' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  enterScene('model'); updateCtl();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    simStep(dt);
    if (S.snd.race) S.snd.race.t += dt;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'model': drawModelScene(); break;
      case 'lt': drawLTScene(); break;
      case 'fl': drawFlScene(); break;
      case 'sp': drawSpScene(); break;
      default: drawSndScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, enterScene, startPulse, preRoll, flMeasure, flMeasureT, flReady, settleT,
    get sc() { return S.sc; }, KS, MS, TS, MUS, FS,
    run(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) { substep(S.sc, DT); } },
  };
})();
