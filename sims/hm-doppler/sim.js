/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 도플러 효과 (4차시)
   성취기준 [12역학03-03] 도플러 효과를 이해하고 물체의 속도 측정 등 다양한 장치에 이용됨을 설명할 수 있다.
   ① 관찰: 소리 높이 (구급차 사이렌 700 Hz, 스펙트럼 그래프, 744 Hz와 661 Hz)
   ② 모형: 파면 모형 (움직이는 파원은 앞쪽 파장이 줄고 뒤쪽은 늘어나요, 움직이는 관측자는 맞이하는 파면 수가 변해요)
   ③ 분석: 도플러 식 (f′ = f(v ± v_o)/(v ∓ v_s), 스마트폰으로 원판 위 스피커의 진동수 변화 측정)
   ④ 적용: 속도 측정 (반사파 Δf ≈ 2fu/v: 스피드건, 초음파 혈류 측정, 기상 레이더)
   파원과 관측자를 잇는 직선 위의 운동만 다루고, 소리의 속력은 공기에 대해 v = 340 m/s로 일정해요.
   파면은 물리 시간에 따라 정확히 계산한 원이에요(파면 중심 = 방출 순간의 파원 위치, 반지름 = v × 경과 시간).
   충격파·마하수, 바람, 상대론적 도플러 효과는 다루지 않아요.
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

  const VW = PHONE ? 480 : 800, VH = PHONE ? 780 : 620;
  const SH = PHONE ? 350 : 340;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const { ctx, D, T, panel, cardBegin, para, frame } = setupDraw(view);
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const V = 340, KT = 1 / 200;          // 소리의 속력, 화면 시간 배율(물리 시간 = 화면 시간 × KT)
  const r0 = (x) => Math.round(x + 1e-6);
  const fR = (x) => String(r0(x));
  const KMH = 3.6;

  /* ================= 파면 모형 (정확한 원) ================= */
  function RS(o) {
    this.f0 = o.f0; this.T0 = 1 / o.f0; this.vs = o.vs; this.xs0 = o.xs0; this.Rmax = o.Rmax; this.P = 0;
    this.obs = o.obs.map((q) => ({ x0: q.x0, u: q.u || 0, name: q.name, n: 0, arr: [] }));
  }
  RS.prototype.xs = function (t) { return this.xs0 + this.vs * t; };
  RS.prototype.xo = function (i, t) { const q = this.obs[i]; return q.x0 + q.u * t; };
  RS.prototype.kRange = function (P) { const kmax = Math.floor(P / this.T0); return [kmax - Math.ceil(this.Rmax / (V * this.T0)), kmax]; };
  RS.prototype.arrival = function (i, k) {
    const q = this.obs[i], tk = k * this.T0, ck = this.xs(tk);
    const tR = (V * tk + q.x0 - ck) / (V - q.u);
    if (tR >= tk && q.x0 + q.u * tR >= ck) return tR;
    const tL = (ck - q.x0 + V * tk) / (V + q.u);
    if (tL >= tk && q.x0 + q.u * tL <= ck) return tL;
    return null;
  };
  RS.prototype.advance = function (dP) {
    const P0 = this.P, P1 = P0 + dP; this.P = P1;
    const kr = this.kRange(P1);
    this.obs.forEach((q, i) => {
      const found = [];
      for (let k = kr[0] - 60; k <= kr[1]; k++) { const ta = this.arrival(i, k); if (ta != null && ta > P0 && ta <= P1) found.push(ta); }
      found.sort((a, b) => a - b).forEach((ta) => { q.n++; q.arr.push(ta); if (q.arr.length > 8) q.arr.shift(); });
    });
  };
  RS.prototype.fMeas = function (i) { const a = this.obs[i].arr; if (a.length < 4) return null; const m = Math.min(a.length, 6), first = a[a.length - m], last = a[a.length - 1]; return (m - 1) / (last - first); };
  /* 앞·뒤 파장: 파원과 가장 가까운 두 파면의 간격 (축 위) */
  RS.prototype.lamFB = function () {
    const kmax = Math.floor(this.P / this.T0), e = (k, s) => this.xs(k * this.T0) + s * V * (this.P - k * this.T0);
    return { front: e(kmax - 1, 1) - e(kmax, 1), back: e(kmax, -1) - e(kmax - 1, -1), kmax, e };
  };

  /* ================= 상태 ================= */
  const VSA = [10, 20, 30, 40];               // 구급차 속력 (m/s)
  const S = {
    mode: 'amb', fade: 0, clock: 0, ts: 1,
    amb: { vi: 1, listener: 'road', t: 0, trace: [], rec: [], done: false, fast: false },
    wf: { vi: 2, A: null, B: null, rec: [] },
    cl: { type: 'src', dir: 'app', ui: 4, fi: 1, rs: null },
    ph: { t: 0, trace: [], u: 2.0, fast: false },
    gun: { ui: 5, t: 0 }, bl: { ui: 4, t: 0 }, rd: { ui: 2, di: 0, t: 0 },
    flags: { read: false, lam: false, calc: false, phone: false, gunOK: false, bloodOK: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1e = $('#v1'), v2e = $('#v2'), v3e = $('#v3');
  const MODES = ['amb', 'wf', 'calc', 'phone', 'gun', 'blood', 'radar'];
  const ALLOWED = [['amb'], ['wf'], ['calc', 'phone'], ['gun', 'blood', 'radar']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };

  /* ----- ① 구급차: 정지한 관측자가 듣는 진동수 (파원 이동, 지연 시간까지 정확히) ----- */
  const AF = 700, AX0 = -50, AXE = 50, AOFF = 3.0;      // 사이렌 700 Hz, 도로 ±50 m, 길가에서 3 m 떨어져 서 있어요
  function ambObs(t, vs) {
    // 관측 시각 t에 들리는 진동수: 방출 시각 te에서 t − te = R(te)/V
    let te = t;
    for (let i = 0; i < 8; i++) { const xs = AX0 + vs * te; te = t - Math.hypot(xs, AOFF) / V; }
    const xs = AX0 + vs * te, R = Math.hypot(xs, AOFF), dR = xs * vs / R;
    return AF / (1 + dR / V);
  }
  const ambF = (vs, appr) => AF * V / (appr ? V - vs : V + vs);
  function ambReset() { const a = S.amb; a.t = 0; a.trace = []; a.done = false; }
  function ambStep(dt) {
    const a = S.amb, vs = VSA[a.vi]; if (a.done) return;
    a.t += dt * S.ts;
    const x = AX0 + vs * a.t;
    a.trace.push([a.t, a.listener === 'inside' ? AF : ambObs(a.t, vs)]);
    if (x >= AXE) {
      a.done = true;
      if (a.listener === 'road') {
        const fs = a.trace.map((q) => q[1]), row = { vs, hi: Math.max.apply(null, fs), lo: Math.min.apply(null, fs) };
        const i = a.rec.findIndex((r) => r.vs === vs); if (i >= 0) a.rec[i] = row; else a.rec.push(row);
        Sound.success(); updateCtl();
      }
    }
  }

  /* ================= ① 소리 높이 ================= */
  function drawAmbScene() {
    const c = topCard(), a = S.amb, vs = VSA[a.vi], inside = a.listener === 'inside'; cardBegin(c, '#dff0ff', '#eef5fb');
    T(c.x + 14, c.y + 24, '🚑 구급차가 사이렌(700 Hz)을 울리며 지나가요 (속력 ' + vs + ' m/s = ' + fx(vs * KMH, 0) + ' km/h)', PHONE ? 13 : 15, INK, 'left', 800);
    const roadY = c.y + (PHONE ? 150 : 150), x0 = c.x + 34, x1 = c.x + c.w - 34, px = (x) => x0 + (x - AX0) / (AXE - AX0) * (x1 - x0);
    ctx.fillStyle = '#c5d3e3'; ctx.fillRect(c.x, roadY - 6, c.w, 62);     // 인도
    ctx.fillStyle = '#5b6678'; ctx.fillRect(c.x, roadY - 22, c.w, 44);   // 도로
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3; ctx.setLineDash([18, 14]); ctx.beginPath(); ctx.moveTo(c.x, roadY); ctx.lineTo(c.x + c.w, roadY); ctx.stroke(); ctx.setLineDash([]);
    // 눈금
    [-50, -25, 0, 25, 50].forEach((m) => { T(px(m), roadY + 78, (m > 0 ? '+' : m < 0 ? MINUS : '') + Math.abs(m) + ' m', 13, '#3a465c', 'center', 800); ctx.strokeStyle = '#3a465c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(m), roadY + 52); ctx.lineTo(px(m), roadY + 60); ctx.stroke(); });
    // 구급차
    const x = AX0 + vs * a.t, ax = px(clamp(x, AX0, AXE));
    ctx.save(); ctx.translate(ax, roadY - 10); ctx.scale(-1, 1); T(0, 16, '🚑', 54, '#000', 'center', 700); ctx.restore();
    D.arrow(ax - 6, roadY - 66, ax + 52, roadY - 66, { color: '#16a34a', width: 4, head: 11 });
    D.label(ax + 20, roadY - 84, 'v_s = ' + vs + ' m/s', { bg: '#16a34a', size: 13 });
    // 듣는 사람
    const lx = px(0), ly = roadY + 34;
    if (!inside) { T(lx, ly + 14, '🧍', 40, '#000', 'center', 700); D.label(lx, ly + 44, '길가에서 듣는 사람', { bg: '#475569', size: 13 }); }
    else { D.label(ax + 6, roadY + 6, '🧑‍✈️ 운전자가 들어요', { bg: '#475569', size: 13 }); }
    // 듣는 진동수 표시
    const cur = a.trace.length ? a.trace[a.trace.length - 1][1] : (inside ? AF : ambObs(0, vs));
    const bx = c.x + c.w - 190, by = c.y + 44;
    D.roundRect(bx, by, 176, 52, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(bx + 88, by + 20, inside ? '운전자가 듣는 소리' : '길가에서 듣는 소리', 13, '#94a3b8', 'center', 800); T(bx + 88, by + 43, fx(cur, 0) + ' Hz', 20, cur > AF + 2 ? '#fca5a5' : cur < AF - 2 ? '#93c5fd' : '#fff', 'center', 800);
    if (S.ts > 1) D.label(c.x + 14, c.y + c.h - 14, '⏩ 빨리 감기 ×' + S.ts, { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    // 스펙트럼
    panel(PX, PY, PW, PH, 16);
    const x1p = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 190 : PH - 24;
    const tpass = (AXE - AX0) / vs;
    const xt = []; const stp = tpass > 6 ? 2 : 1; for (let s = 0; s <= tpass + 1e-9; s += stp) xt.push(s);
    const M = frame({ x: x1p, y: PY + 10, w: gw, h: gh }, { x0: 0, x1: tpass, y0: 600, y1: 800, xt, yt: [600, 650, 700, 750, 800], xf: (v) => String(v), mt: 24, mb: 26, ml: PHONE ? 44 : 50, mr: 12 });
    T(x1p + 8, PY + 27, '📈 스펙트럼: 들리는 소리의 진동수(Hz) – 시간(s)', 13.5, INK, 'left', 800);
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.ix, M.gy(AF)); ctx.lineTo(M.ix + M.iw, M.gy(AF)); ctx.stroke(); ctx.restore();
    T(M.ix + M.iw - 4, M.gy(AF) - 6, '사이렌이 내는 소리 700 Hz', 13, '#15803d', 'right', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
    ctx.strokeStyle = 'rgba(245,158,11,.35)'; ctx.lineWidth = 11; ctx.lineJoin = 'round'; ctx.beginPath(); a.trace.forEach((q, i) => { const xx = M.gx(q[0]), yy = M.gy(q[1]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3.2; ctx.beginPath(); a.trace.forEach((q, i) => { const xx = M.gx(q[0]), yy = M.gy(q[1]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke(); ctx.restore();
    if (a.trace.length) { const q = a.trace[a.trace.length - 1]; D.sphere(M.gx(q[0]), M.gy(q[1]), 6, ORANGE, { gloss: true }); }
    // 기록 표
    const tx = PHONE ? x1p : x1p + gw + 12, ty = PHONE ? PY + 10 + gh + 8 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34;
    D.roundRect(tx, ty, tw, PHONE ? PH - gh - 28 : PH - 24, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 10, ty + 24, '📋 지나간 구급차 기록 (Hz)', 14, INK, 'left', 800);
    const cx = [tx + 10, tx + 56, tx + 116, tx + 176];
    ['속력', '높음', '낮음', '폭'].forEach((h, i) => T(cx[i], ty + 48, h, 13, MUTED, 'left', 800));
    a.rec.slice().sort((p, q) => p.vs - q.vs).forEach((r, i) => { const yy = ty + 72 + i * 22; T(cx[0], yy, r.vs + ' m/s', 13, INK, 'left', 800); T(cx[1], yy, fR(r.hi), 13.5, RED, 'left', 800); T(cx[2], yy, fR(r.lo), 13.5, BLUE, 'left', 800); T(cx[3], yy, fR(r.hi - r.lo), 13.5, '#c2410c', 'left', 800); });
    if (!a.rec.length) T(cx[0], ty + 72, '길가에서 한 번 지나가면 기록돼요', 13, '#9aa6bd', 'left', 700);
    if (!PHONE) para(tx + 10, ty + 72 + 5 * 22 + 4, '구급차가 빠를수록 높음과 낮음의 차이(폭)가 커져요.', tw - 20, 13.5, '#14532d', 19, 700);
  }

  /* ================= 파면 그리기 ================= */
  function drawRings(rs, rc, ppm, cy, xl, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(rc.x, rc.y, rc.w, rc.h); ctx.clip();
    const kr = rs.kRange(rs.P);
    for (let k = kr[0]; k <= kr[1]; k++) {
      const tk = k * rs.T0, R = V * (rs.P - tk) * ppm; if (R < 1.5) continue;
      const cx = rc.x + (rs.xs(tk) - xl) * ppm, al = clamp(0.95 - R / (rs.Rmax * ppm) * 0.55, 0.3, 0.95);
      ctx.strokeStyle = col || 'rgba(37,99,235,' + al + ')'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  const SPK = (x, y, r) => { D.sphere(x, y, r, '#f59e0b', { gloss: true, shadow: true }); T(x, y + r * 0.42, '🔊', r * 1.25, '#000', 'center', 700); };
  function earIcon(x, y, name, col) {
    D.sphere(x, y, 13, col, { gloss: true, shadow: true }); T(x, y + 6, name, 14, '#fff', 'center', 800);
  }

  /* ================= ② 파면 모형 ================= */
  const wfWorld = (c) => ({ pw: Math.floor((c.w - 12 - (PHONE ? 4 : 12)) / 2), ppm: (Math.floor((c.w - 12 - (PHONE ? 4 : 12)) / 2)) / 5.7 });
  function wfNew() {
    const vs = S.wf.vi * 10;
    S.wf.A = new RS({ f0: 680, vs, xs0: 1.7, Rmax: 7, obs: [{ x0: 5.2, name: 'A' }, { x0: 0.35, name: 'B' }] });
    S.wf.B = new RS({ f0: 680, vs: 0, xs0: 3.4, Rmax: 7, obs: [{ x0: 0.7, u: vs, name: 'C' }] });
  }
  function drawWfScene() {
    const c = topCard(), w = wfWorld(c), ppm = w.ppm, vs = S.wf.vi * 10, A = S.wf.A, B = S.wf.B; cardBegin(c);
    const rcA = { x: c.x + 6, y: c.y + 34, w: w.pw, h: c.h - 44 }, rcB = { x: c.x + 6 + w.pw + (PHONE ? 4 : 12), y: c.y + 34, w: w.pw, h: c.h - 44 };
    [[rcA, '① 파원이 움직여요'], [rcB, '② 관측자가 움직여요']].forEach(([rc, tt]) => { D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); T(rc.x + 8, c.y + 24, tt, PHONE ? 13 : 14.5, INK, 'left', 800); });
    const cy = rcA.y + rcA.h * 0.5;
    drawRings(A, rcA, ppm, cy, 0); drawRings(B, rcB, ppm, cy, 0);
    // 왼쪽 패널: 파원, 관측자 A·B, 앞·뒤 파장 자
    const sx = rcA.x + A.xs(A.P) * ppm;
    A.obs.forEach((q, i) => { const ox = rcA.x + A.xo(i, A.P) * ppm; earIcon(ox, cy + 38, q.name, i ? PURPLE : TEAL); T(ox, cy + 66, i ? '뒤' : '앞', 13, MUTED, 'center', 800); });
    if (vs > 0) D.arrow(sx + 14, cy - 24, sx + 14 + Math.min(70, 16 + vs * 0.22), cy - 24, { color: '#16a34a', width: 3.5, head: 10 });
    SPK(sx, cy, 13);
    const lf = A.lamFB();
    if (lf) {
      const bx0 = rcA.x + lf.e(lf.kmax, 1) * 0 + (A.xs(lf.kmax * A.T0) + V * (A.P - lf.kmax * A.T0)) * ppm, bx1 = rcA.x + (A.xs((lf.kmax - 1) * A.T0) + V * (A.P - (lf.kmax - 1) * A.T0)) * ppm;
      const cx0 = rcA.x + (A.xs(lf.kmax * A.T0) - V * (A.P - lf.kmax * A.T0)) * ppm, cx1 = rcA.x + (A.xs((lf.kmax - 1) * A.T0) - V * (A.P - (lf.kmax - 1) * A.T0)) * ppm;
      const br = (xa, xb, yy, col, txt) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy); ctx.moveTo(xa, yy - 6); ctx.lineTo(xa, yy + 6); ctx.moveTo(xb, yy - 6); ctx.lineTo(xb, yy + 6); ctx.stroke(); if (txt) D.label((xa + xb) / 2, yy - 18, txt, { bg: col, size: 13 }); };
      if (bx1 < rcA.x + rcA.w - 4) br(bx0, bx1, cy - 52, '#e2464b', '앞 ' + fx(lf.front, 2) + ' m');
      if (cx1 > rcA.x + 4) br(cx0, cx1, cy - 52, '#2563eb', '뒤 ' + fx(lf.back, 2) + ' m');
    }
    // 오른쪽 패널: 파원은 가만히, 관측자가 움직임
    const sx2 = rcB.x + B.xs(B.P) * ppm; SPK(sx2, cy, 13);
    const ox2 = rcB.x + B.xo(0, B.P) * ppm; earIcon(ox2, cy + 38, 'C', ORANGE);
    if (vs > 0) D.arrow(ox2 + 16, cy + 38, ox2 + 16 + Math.min(70, 16 + vs * 0.22), cy + 38, { color: '#16a34a', width: 3.5, head: 10 });
    // 카운터
    const fB = B.fMeas(0), fA = A.fMeas(0), fBk = A.fMeas(1);
    T(rcA.x + 8, rcA.y + rcA.h - 38, 'A(앞): 파면 ' + A.obs[0].n + '개 · f′ ' + (fA ? fR(fA) : '—') + ' Hz', 13, TEAL, 'left', 800);
    T(rcA.x + 8, rcA.y + rcA.h - 14, 'B(뒤): 파면 ' + A.obs[1].n + '개 · f′ ' + (fBk ? fR(fBk) : '—') + ' Hz', 13, PURPLE, 'left', 800);
    T(rcB.x + 8, rcB.y + rcB.h - 38, 'C: 맞이한 파면 ' + B.obs[0].n + '개', 13, '#c2410c', 'left', 800);
    T(rcB.x + 8, rcB.y + rcB.h - 14, 'f′ = ' + (fB ? fR(fB) : '—') + ' Hz · 파면 간격 0.50 m 그대로', 13, '#c2410c', 'left', 800);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '🧩 파면의 간격과 진동수', 15, INK, 'left', 800);
    const lines = [
      ['파원이 속력 v_s로 움직이면 파면의 중심이 옮겨져요.', INK],
      ['앞쪽 파장 λ′ = (v − v_s)T, 뒤쪽 파장 λ″ = (v + v_s)T  (T = 1/f)', '#1d4ed8'],
      ['소리의 속력 v = 340 m/s는 그대로예요(속력은 매질이 정해요). 파장이 줄면 진동수 f′ = v/λ′는 커져요.', '#14532d'],
      ['관측자가 움직이면 파면 간격(파장)은 그대로이고, 초당 맞이하는 파면 수가 달라져요.', '#c2410c'],
    ];
    let yy = PY + 54; lines.forEach((l) => { yy += para(x1, yy, l[0], PW - 30, 13.5, l[1], 19, 700) + 6; });
    if (S.wf.rec.length) {
      D.roundRect(x1 - 6, yy, PW - 16, 24 + Math.min(3, S.wf.rec.length) * 22, 10); ctx.fillStyle = '#f4f7fd'; ctx.fill();
      T(x1 + 4, yy + 18, '📏 잰 앞·뒤 파장 (기록 ' + S.wf.rec.length + '개)', 13.5, INK, 'left', 800);
      S.wf.rec.slice(-3).forEach((r, i) => T(x1 + 4, yy + 40 + i * 22, 'v_s = ' + r.vs + ' m/s  →  앞 ' + fx(r.f, 2) + ' m · 뒤 ' + fx(r.b, 2) + ' m', 13.5, '#c2410c', 'left', 800));
    }
  }


  /* ================= ③ 도플러 식 ================= */
  const F0S = [680, 700, 1000];
  const clU = () => S.cl.ui * 5, clF = () => F0S[S.cl.fi];
  function clFormula() {
    const cl = S.cl, u = clU(), f = clF(), app = cl.dir === 'app';
    let val, expr, rule;
    if (cl.type === 'src') {
      val = app ? f * V / (V - u) : f * V / (V + u);
      expr = 'f′ = f · v / (v ' + (app ? MINUS : '+') + ' v_s) = ' + f + ' × 340 / (340 ' + (app ? MINUS : '+') + ' ' + u + ')';
      rule = '파원이 ' + (app ? '다가오면' : '멀어지면') + ' 파면 간격(파장)이 ' + (app ? '줄어 f′ > f' : '늘어 f′ < f');
    } else {
      val = app ? f * (V + u) / V : f * (V - u) / V;
      expr = 'f′ = f · (v ' + (app ? '+' : MINUS) + ' v_o) / v = ' + f + ' × (340 ' + (app ? '+' : MINUS) + ' ' + u + ') / 340';
      rule = '관측자가 ' + (app ? '다가오면' : '멀어지면') + ' 초당 맞이하는 파면 수가 ' + (app ? '늘어 f′ > f' : '줄어 f′ < f');
    }
    return { val, expr, rule };
  }
  function clNew() {
    const cl = S.cl, u = clU(), f = clF(), app = cl.dir === 'app';
    if (cl.type === 'src') cl.rs = new RS({ f0: f, vs: app ? u : -u, xs0: app ? 2.4 : 6.0, Rmax: 12, obs: [{ x0: 9.8, name: 'A' }] });
    else cl.rs = new RS({ f0: f, vs: 0, xs0: 5.0, Rmax: 12, obs: [{ x0: app ? 9.8 : 7.6, u: app ? -u : u, name: 'A' }] });
  }
  function drawCalcScene() {
    const c = topCard(), cl = S.cl, rs = cl.rs, ppm = (c.w - 12) / 11.6; cardBegin(c);
    const u = clU(), app = cl.dir === 'app';
    T(c.x + 14, c.y + 24, (cl.type === 'src' ? '🔊 파원이 움직여요' : '👂 관측자가 움직여요') + ' (' + (app ? '다가옴' : '멀어짐') + ', ' + u + ' m/s)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const rc = { x: c.x + 6, y: c.y + 36, w: c.w - 12, h: c.h - 46 }, cy = rc.y + rc.h * 0.5;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    drawRings(rs, rc, ppm, cy, 0);
    const sx = rc.x + rs.xs(rs.P) * ppm, ox = rc.x + rs.xo(0, rs.P) * ppm;
    SPK(sx, cy, 14); earIcon(ox, cy + 40, 'A', TEAL);
    const dirS = cl.type === 'src' ? Math.sign(rs.vs) : 0, dirO = cl.type === 'obs' ? Math.sign(rs.obs[0].u) : 0;
    if (u > 0) { if (dirS) D.arrow(sx, cy - 30, sx + dirS * (28 + u), cy - 30, { color: '#16a34a', width: 4, head: 11, label: 'v_s', labelSize: 13 }); if (dirO) D.arrow(ox, cy + 74, ox + dirO * (28 + u), cy + 74, { color: '#16a34a', width: 4, head: 11, label: 'v_o', labelSize: 13 }); }
    const fm = rs.fMeas(0);
    D.roundRect(rc.x + rc.w - 190, rc.y + 8, 180, 52, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(rc.x + rc.w - 100, rc.y + 28, '파면 센서 A가 센 진동수', 13, '#94a3b8', 'center', 800); T(rc.x + rc.w - 100, rc.y + 51, fm ? fR(fm) + ' Hz' : '재는 중…', 20, '#fff', 'center', 800);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, f = clFormula();
    T(x1, PY + 26, '🧮 도플러 식 계산', 15, INK, 'left', 800);
    T(x1, PY + 54, '일반식  f′ = f (v ± v_o) / (v ∓ v_s)   (v = 340 m/s)', PHONE ? 13 : 14.5, '#1d4ed8', 'left', 800);
    const h1 = para(x1, PY + 82, f.expr, PW - 28, PHONE ? 13.5 : 14.5, INK, 20, 800);
    T(x1, PY + 82 + h1 + 14, '= ' + fR(f.val) + ' Hz', 22, '#c2410c', 'left', 800);
    para(x1, PY + 82 + h1 + 44, f.rule + ' → 부호 규칙: 다가오면 진동수가 커지는 쪽이에요.', PW - 28, 13.5, '#14532d', 19, 700);
    const ok = fm != null && Math.abs(r0(fm) - r0(f.val)) <= 1;
    const bx = x1 - 4, by = PY + PH - 72;
    D.roundRect(bx, by, PW - 20, 58, 12); ctx.fillStyle = ok ? '#ecfdf5' : '#f4f7fd'; ctx.fill();
    T(bx + 12, by + 24, '파면 센서 ' + (fm ? fR(fm) : '—') + ' Hz  /  식 ' + fR(f.val) + ' Hz', 15, ok ? '#15803d' : MUTED, 'left', 800);
    T(bx + 12, by + 46, ok ? '✅ 그림의 파면을 센 값이 식과 같아요' : '파면이 도착할 때까지 기다려요', 13.5, ok ? '#14532d' : MUTED, 'left', 700);
  }

  /* ================= ③ 스마트폰 측정 ================= */
  const PH_F = 1000, PH_R = 0.2, PH_D = 1.5;
  function phF(t) { const u = S.ph.u, w = u / PH_R, th = w * (t - PH_D / V), vx = -u * Math.sin(th); return PH_F * V / (V - vx); }
  function drawPhoneScene() {
    const c = topCard(), p = S.ph; cardBegin(c, '#eef3fb', '#dfe7f3');
    T(c.x + 14, c.y + 24, '📱 원판 끝에 단 스피커(1000 Hz)가 돌 때 스마트폰으로 소리를 분석해요', PHONE ? 13 : 15, INK, 'left', 800);
    const dcx = c.x + (PHONE ? 78 : 130), dcy = c.y + (PHONE ? 150 : 180), R = PHONE ? 58 : 90, th = (p.u / PH_R) * p.t;
    D.shadow(() => { ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(dcx, dcy, R + 8, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
    const gd = ctx.createRadialGradient(dcx - 20, dcy - 20, 10, dcx, dcy, R); gd.addColorStop(0, '#f1f5f9'); gd.addColorStop(1, '#94a3b8'); ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(dcx, dcy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dcx, dcy); ctx.lineTo(dcx + R * Math.cos(th), dcy - R * Math.sin(th)); ctx.stroke();
    D.sphere(dcx, dcy, 5, '#475569', { gloss: false });
    const spx = dcx + R * Math.cos(th), spy = dcy - R * Math.sin(th);
    SPK(spx, spy, 13);
    D.arrow(spx, spy, spx + (-Math.sin(th)) * 40, spy - Math.cos(th) * 40, { color: '#16a34a', width: 3.5, head: 10 });
    T(dcx, dcy + R + 28, '원판 (반지름 0.20 m)', 13, MUTED, 'center', 800);
    const phx = c.x + c.w - (PHONE ? 196 : 346), phy = c.y + 40, phw = PHONE ? 184 : 332, phh = c.h - 52;
    ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(37,99,235,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dcx + R + 14, dcy); ctx.lineTo(phx, dcy); ctx.stroke(); ctx.restore();
    D.shadow(() => { D.roundRect(phx, phy, phw, phh, 16); ctx.fillStyle = '#0f172a'; ctx.fill(); }, { blur: 10, y: 4 });
    T(phx + phw / 2, phy + 22, '📱 소리 분석 앱', 13.5, '#e2e8f0', 'center', 800);
    const gr = { x: phx + 8, y: phy + 32, w: phw - 16, h: phh - 78 };
    const win = 2.5, t0 = p.t - win, xt = []; for (let s = Math.ceil(t0 * 2) / 2; s <= p.t; s += 0.5) xt.push(s);
    const Mg = frame(gr, { x0: t0, x1: p.t, y0: 989, y1: 1011, xt: [], yt: [990, 994, 998, 1002, 1006, 1010], mt: 8, mb: 8, ml: 40, mr: 8, nobox: true, xl: false });
    ctx.save(); ctx.beginPath(); ctx.rect(Mg.ix, Mg.iy - 2, Mg.iw, Mg.ih + 4);
    ctx.clip(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let st = false;
    p.trace.forEach((q) => { if (q[0] < t0) return; const x = Mg.gx(q[0]), y = Mg.gy(q[1]); st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; });
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(15,23,42,.0)'; ctx.fillRect(gr.x, gr.y, gr.w, gr.h);
    const cur = phF(p.t);
    T(phx + phw / 2, phy + phh - 30, '지금 ' + fR(cur) + ' Hz', 20, '#fff', 'center', 800); T(phx + phw / 2, phy + phh - 10, '분해능 1 Hz · 가로: 시간 (지난 2.5 s)', 13, '#94a3b8', 'center', 700);
    if (game && game.free) T(c.x + 14, c.y + c.h - 14, '원판 속력 u = ' + fx(p.u, 1) + ' m/s (ω = u / r = ' + fx(p.u / PH_R, 0) + ' rad/s)', 13, '#475569', 'left', 800);
    if (S.ts < 1) D.label(c.x + 14, c.y + c.h - 14, '🐢 슬로 모션', { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '📐 진동수 변화로 속력 구하기', 15, INK, 'left', 800);
    const lines = [['가까워질 때 가장 높고, 멀어질 때 가장 낮아요: f_max = f v/(v − u), f_min = f v/(v + u)', '#1d4ed8'], ['두 식을 이용하면  u = v (f_max − f_min) / (f_max + f_min)', '#c2410c'], ['앱의 분해능이 1 Hz이고 실내 반사가 있어 ±1 Hz 정도 오차가 생겨요. 여러 번 읽어 최댓값·최솟값을 정해요.', '#14532d']];
    let yy = PY + 54; lines.forEach((l) => { yy += para(x1, yy, l[0], PW - 30, 13.5, l[1], 19, 700) + 8; });
  }

  /* ================= ④ 속도 측정 (반사파) ================= */
  const C_LIGHT = 3.0e8, F_GUN = 24e9, F_BLOOD = 5.0e6, V_TIS = 1540, F_RAD = 10e9;
  const gunU = () => 10 + S.gun.ui * 5, bloodU = () => 0.1 * (S.bl.ui + 1);
  const gunDf = (u) => 2 * F_GUN * u / C_LIGHT, bloodDf = (u) => 2 * F_BLOOD * u / V_TIS;
  function waveTrain(x0, x1, y, lam, amp, ph, col) {
    if (x1 - x0 < 4) return; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / lam * TAU + ph) * amp; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
  }
  function drawGunScene() {
    const c = topCard(), u = gunU(), g = S.gun; cardBegin(c, '#e6f0fb', '#d8e3f2');
    T(c.x + 14, c.y + 24, '📡 스피드건: 24 GHz 전파를 쏘고 자동차에서 반사되어 돌아온 전파를 비교해요', PHONE ? 13 : 15, INK, 'left', 800);
    const roadY = c.y + c.h - 78, x0 = c.x + 90, x1 = c.x + c.w - 70, cy = c.y + 128;
    ctx.fillStyle = '#5b6678'; ctx.fillRect(c.x, roadY, c.w, 46); ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(c.x, roadY + 23); ctx.lineTo(c.x + c.w, roadY + 23); ctx.stroke(); ctx.setLineDash([]);
    const carX = x1 - ((g.t * 60) % (x1 - x0 - 40));
    const gunY = roadY + 3;
    T(x0 - 56, roadY + 16, '📡', 40, '#000', 'center', 700); T(x0 - 56, roadY + 50, '스피드건', 13, MUTED, 'center', 800);
    ctx.save(); ctx.translate(carX, roadY + 8); T(0, 18, '🚗', 46, '#000', 'center', 700); ctx.restore();
    D.arrow(carX + 30, roadY - 18, carX - 40, roadY - 18, { color: '#16a34a', width: 4, head: 11 }); D.label(carX - 6, roadY - 38, 'u = ' + u + ' m/s', { bg: '#16a34a', size: 13 });
    const dev = 0.38 * (u / 40), lam0 = 26, lamR = lam0 * (1 - dev), ph = -g.t * 6;
    waveTrain(x0 - 30, carX - 30, cy - 18, lam0, 10, ph, '#2563eb');
    waveTrain(x0 - 30, carX - 30, cy + 22, lamR, 10, g.t * 6, '#f59e0b');
    D.label(x0 + 70, cy - 46, '보낸 전파  f₀ = 24 GHz', { bg: '#2563eb', size: 13 }); D.label(x0 + 70, cy + 52, '반사된 전파  f₀ + Δf', { bg: '#d97706', size: 13 });
    T(c.x + c.w - 14, c.y + 50, '※ 실제 파장 변화는 약 10⁻⁷ 배로 아주 작아서 그림에서는 크게 과장했어요', 13, MUTED, 'right', 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1p = PX + 14, df = gunDf(u);
    T(x1p, PY + 26, '📐 반사파의 진동수 변화 (스피드건)', 15, INK, 'left', 800);
    D.roundRect(x1p - 4, PY + 40, PW - 20, 64, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(x1p + 8, PY + 64, '스피드건이 잰 진동수 변화', 13, '#94a3b8', 'left', 800); T(x1p + 8, PY + 92, 'Δf = ' + Math.round(df) + ' Hz', 24, '#fff', 'left', 800);
    para(x1p, PY + 126, '움직이는 자동차는 전파를 받을 때 한 번, 다시 반사(방출)할 때 한 번 도플러 효과를 줘서 변화량이 2배가 돼요:  Δf ≈ 2 f u / c   (c = 3.0×10⁸ m/s)', PW - 28, 13.5, '#c2410c', 19, 800);
    para(x1p, PY + 126 + (PHONE ? 78 : 58), '단속 장비는 반사파의 Δf에서 자동차의 속력을 계산해요.', PW - 28, 13.5, '#14532d', 19, 700);
  }
  function drawBloodScene() {
    const c = topCard(), u = bloodU(), b = S.bl; cardBegin(c, '#fdf0ef', '#f7dede');
    T(c.x + 14, c.y + 24, '🩺 초음파 혈류 측정: 5.0 MHz 초음파가 움직이는 혈액에서 반사돼요', PHONE ? 13 : 15, INK, 'left', 800);
    const vy = c.y + 190, vx0 = c.x + 30, vx1 = c.x + c.w - 30;
    const gt = ctx.createLinearGradient(0, c.y + 40, 0, vy - 40); gt.addColorStop(0, '#f7d9c0'); gt.addColorStop(1, '#f0b8a0'); ctx.fillStyle = gt; ctx.fillRect(c.x, c.y + 40, c.w, vy - 40 - 40 + 0.1);
    ctx.fillStyle = '#e8a79a'; ctx.fillRect(c.x, vy - 40, c.w, 80);
    ctx.fillStyle = '#b53a3a'; D.roundRect(vx0, vy - 24, vx1 - vx0, 48, 24); ctx.fill();
    ctx.fillStyle = '#7f1d1d'; D.roundRect(vx0 + 3, vy - 21, vx1 - vx0 - 6, 42, 21); ctx.fill();
    ctx.save(); D.roundRect(vx0 + 3, vy - 21, vx1 - vx0 - 6, 42, 21); ctx.clip();
    for (let i = 0; i < 18; i++) { const sp = u * 40, xx = vx0 + ((i * 47 + b.t * sp) % (vx1 - vx0 + 30)) - 10, yy = vy + Math.sin(i * 2.3) * 12; D.sphere(xx, yy, 6.5, '#ef4444', { gloss: true }); }
    ctx.restore();
    D.arrow(vx0 + 40, vy + 56, vx0 + 110, vy + 56, { color: '#16a34a', width: 4, head: 11 }); D.label(vx0 + 150, vy + 56, '혈류 u = ' + fx(u, 2) + ' m/s', { bg: '#16a34a', size: 13 });
    const px = (vx0 + vx1) / 2; D.shadow(() => { D.roundRect(px - 28, c.y + 44, 56, 30, 8); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 5, y: 2 }); T(px, c.y + 64, '탐촉자', 13, '#e2e8f0', 'center', 800);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; const ph = -b.t * 6; ctx.beginPath(); for (let y = c.y + 78; y <= vy - 20; y += 2) { const xx = px - 12 + Math.sin((y - c.y) / 12 * 1 + ph) * 6; y === c.y + 78 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y); } ctx.stroke();
    ctx.strokeStyle = '#f59e0b'; ctx.beginPath(); const dev = 0.4 * (u / 1.0), lamR = 12 * (1 - dev * 0.3); for (let y = c.y + 78; y <= vy - 20; y += 2) { const xx = px + 12 + Math.sin((y - c.y) / lamR + b.t * 6) * 6; y === c.y + 78 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y); } ctx.stroke();
    T(c.x + c.w - 14, c.y + 50, '※ 진동수 변화는 크게 과장해 그렸어요', 13, MUTED, 'right', 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1p = PX + 14, df = bloodDf(u);
    T(x1p, PY + 26, '📐 반사된 초음파의 진동수 변화', 15, INK, 'left', 800);
    D.roundRect(x1p - 4, PY + 40, PW - 20, 64, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(x1p + 8, PY + 64, '측정한 진동수 변화 (소리로 들려요 🎧)', 13, '#94a3b8', 'left', 800); T(x1p + 8, PY + 92, 'Δf ≈ ' + fx(df / 1000, 1) + ' kHz', 24, '#fff', 'left', 800);
    para(x1p, PY + 126, 'Δf ≈ 2 f u / v   (f = 5.0 MHz, 혈액 속 소리 v = 1540 m/s)', PW - 28, 13.5, '#c2410c', 19, 800);
    para(x1p, PY + 150, '혈류의 속도에 따라 Δf는 사람이 들을 수 있는 소리의 범위예요. 혈관과 탐촉자가 비스듬하면 cosθ만큼 보정하지만 여기서는 정성적으로만 알아봐요.', PW - 28, 13.5, '#14532d', 19, 700);
  }
  const WDIR = [[1, 0, '→'], [-1, 0, '←'], [0, -1, '↑'], [0, 1, '↓']];
  function radarU(cx, cy, rx, ry, di, U) {          // 레이더 방향 성분 (+: 레이더 쪽으로 다가옴)
    const dx = rx - cx, dy = ry - cy, d = Math.hypot(dx, dy) || 1, wv = WDIR[di];
    return -(wv[0] * dx + wv[1] * dy) / d * U;
  }
  function drawRadarScene() {
    const c = topCard(), r = S.rd, U = r.ui * 5, di = r.di; cardBegin(c, '#e8f0fa', '#d6e2f2');
    T(c.x + 14, c.y + 24, '🌧️ 기상 레이더: 빗방울에서 반사된 전파의 진동수 변화로 바람의 속도를 알아요', PHONE ? 13 : 15, INK, 'left', 800);
    const rx = c.x + c.w / 2, ry = c.y + c.h - 54, cols = PHONE ? 9 : 15, rows = 5, gx = (c.w - 80) / (cols - 1), gy = (c.h - 150) / (rows - 1);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = c.x + 40 + i * gx, py = c.y + 62 + j * gy, ur = radarU(rx, ry, px, py, di, U), m = clamp(Math.abs(ur) / 30, 0, 1);
      const col = Math.abs(ur) < 0.5 ? 'rgba(148,163,184,.6)' : ur > 0 ? 'rgba(37,99,235,' + (0.35 + 0.6 * m) + ')' : 'rgba(226,70,75,' + (0.35 + 0.6 * m) + ')';
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, Math.min(gx, gy) * 0.4, 0, TAU); ctx.fill();
    }
    // 바람 화살표
    const wv = WDIR[di]; if (U > 0) D.arrow(c.x + 60, c.y + 52, c.x + 60 + wv[0] * 50, c.y + 52 + wv[1] * 30, { color: '#16a34a', width: 4, head: 11 }); D.label(c.x + 128, c.y + 56, '바람 ' + WDIR[di][2] + ' ' + U + ' m/s', { bg: '#16a34a', size: 13 });
    // 레이더와 관측점
    D.sphere(rx, ry, 14, '#475569', { gloss: true, shadow: true }); T(rx, ry + 36, '레이더', 13, MUTED, 'center', 800);
    const pxs = rx + (PHONE ? 100 : 190), pys = c.y + 62 + gy * 1, up = radarU(rx, ry, pxs, pys, di, U);
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(pxs, pys); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pxs, pys, Math.min(gx, gy) * 0.55, 0, TAU); ctx.stroke();
    const sw = 14; [['#2563eb', '레이더 쪽으로 (Δf > 0)'], ['#e2464b', '레이더에서 멀어짐 (Δf < 0)']].forEach(([col, tx], i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x + c.w - (PHONE ? 150 : 196), c.y + 46 + i * 22, sw / 2, 0, TAU); ctx.fill(); T(c.x + c.w - (PHONE ? 138 : 184), c.y + 51 + i * 22, tx, 13, INK, 'left', 800); });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1p = PX + 14, df = 2 * F_RAD * up / C_LIGHT;
    T(x1p, PY + 26, '📐 검은 원 지점의 반사파 (레이더 10 GHz)', 15, INK, 'left', 800);
    D.roundRect(x1p - 4, PY + 40, PW - 20, 64, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(x1p + 8, PY + 64, '빗방울의 레이더 방향 속도 ' + (up >= 0 ? '+' : MINUS) + fx(Math.abs(up), 1) + ' m/s', 13, '#94a3b8', 'left', 800); T(x1p + 8, PY + 92, 'Δf = ' + (df >= 0 ? '+' : MINUS) + Math.round(Math.abs(df)) + ' Hz', 24, '#fff', 'left', 800);
    T(x1p, PY + 126, '📋 도플러 효과가 쓰이는 곳', 14, INK, 'left', 800);
    const cards = ['🚓 스피드건: 반사된 전파의 Δf → 자동차의 속력', '🩺 초음파 혈류계: 반사된 초음파의 Δf → 혈액의 속력', '🌧️ 기상 레이더: 빗방울의 Δf → 바람의 속도 지도', '🌌 빛에서도 같은 효과: 멀어지는 은하의 빛은 파장이 길어져요(적색 편이)'];
    let yy = PY + 150; cards.forEach((s2) => { yy += para(x1p, yy, s2, PW - 28, 13.5, INK, 19, 700) + 3; });
  }

  /* ================= 컨트롤 연결 ================= */
  function enterScene(mode) {
    S.ts = 1;
    if (mode === 'amb') { ambReset(); S.amb.fast = false; }
    else if (mode === 'wf') { wfNew(); }
    else if (mode === 'calc') { clNew(); }
    else if (mode === 'phone') { S.ph.t = 0; S.ph.trace = []; }
    else if (mode === 'gun') S.gun.t = 0; else if (mode === 'blood') S.bl.t = 0; else if (mode === 'radar') S.rd.t = 0;
  }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; enterScene(mode); } updateCtl(); }
  function updateCtl() {
    const modes = allowedModes(), free = game && game.free;
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false; if (on && n.hasAttribute('data-free') && !free) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    $('#oVs').textContent = VSA[S.amb.vi] + ' m/s'; setSl('sVs', S.amb.vi, 0, 3);
    $$('#lisSeg button').forEach((b) => b.classList.toggle('on', b.dataset.l === S.amb.listener));
    $('#bFast').textContent = S.ts > 1 ? '⏩ 보통 속도로' : '⏩ 빨리 감기'; $('#bFast').classList.toggle('btn-primary', S.ts > 1);
    $('#nAmb').textContent = S.amb.listener === 'road' ? '길가에서 구급차가 지나가는 동안 들리는 소리의 진동수(주황 선)를 봐요.' : '구급차 안에 타면 사이렌과 같이 움직여요. 들리는 진동수가 어떻게 될까요?';
    $('#oWv').textContent = S.wf.vi * 10 + ' m/s'; setSl('sWv', S.wf.vi, 0, 30);
    $('#nWf').textContent = '왼쪽은 파원이, 오른쪽은 관측자가 같은 속력으로 움직여요. 속력을 바꿔 파면 간격을 비교해요.';
    $$('#clType button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.cl.type));
    $$('#clDir button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.cl.dir));
    $$('#clF button').forEach((b) => b.classList.toggle('on', +b.dataset.f === S.cl.fi));
    $('#oClU').textContent = clU() + ' m/s'; setSl('sClU', S.cl.ui, 0, 8);
    $('#nCl').textContent = '파원이나 관측자의 속력(0~40 m/s)과 방향을 고르면 f′를 계산해요. 파면 센서가 센 값과 비교해요.';
    $$('#phU button').forEach((b) => b.classList.toggle('on', +b.dataset.u === S.ph.u));
    $('#nPh').textContent = '스마트폰 그래프에서 가장 높은 진동수와 가장 낮은 진동수를 읽어요.';
    $('#oGun').textContent = gunU() + ' m/s'; setSl('sGun', S.gun.ui, 0, 6);
    $('#nGun').textContent = '자동차가 빠를수록 반사파의 진동수 변화 Δf가 커져요 (Δf ≈ 2 f u / c).';
    $('#oBl').textContent = fx(bloodU(), 1) + ' m/s'; setSl('sBl', S.bl.ui, 0, 9);
    $('#nBl').textContent = '혈액이 빠를수록 Δf가 커져요. 5.0 MHz 초음파, 혈액 속 소리 1540 m/s예요.';
    $('#oRu').textContent = S.rd.ui * 5 + ' m/s'; setSl('sRu', S.rd.ui, 0, 6);
    $$('#rdSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.w === S.rd.di));
    $('#nRd').textContent = '바람의 방향과 세기를 바꾸면 레이더 쪽으로 오는 빗방울(파랑)과 멀어지는 빗방울(빨강) 모양이 달라져요.';
    $$('.slow-btn').forEach((b) => { b.textContent = S.ts < 1 ? '🐢 보통 속도로' : '🐢 느리게 보기'; b.classList.toggle('btn-primary', S.ts < 1); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('.slow-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ts = S.ts < 1 ? 1 : 0.25; updateCtl(); }));
  // ① 구급차
  $('#sVs').addEventListener('input', (e) => { S.amb.vi = +e.target.value; ambReset(); updateCtl(); });
  $$('#lisSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.amb.listener = b.dataset.l; ambReset(); updateCtl(); }));
  $('#bAmbGo').addEventListener('click', () => { Sound.click(); ambReset(); updateCtl(); });
  $('#bFast').addEventListener('click', () => { Sound.click(); S.ts = S.ts > 1 ? 1 : 3; updateCtl(); });
  // ② 파면 모형
  $('#sWv').addEventListener('input', (e) => { S.wf.vi = +e.target.value; wfNew(); updateCtl(); });
  $('#bMeas').addEventListener('click', () => {
    const A = S.wf.A, lf = A.lamFB(), vs = S.wf.vi * 10;
    if (!lf) return; const row = { vs, f: lf.front, b: lf.back }, i = S.wf.rec.findIndex((r) => r.vs === vs);
    if (i >= 0) S.wf.rec[i] = row; else S.wf.rec.push(row); Sound.click(); updateCtl();
  });
  $('#bClrW').addEventListener('click', () => { Sound.click(); S.wf.rec = []; updateCtl(); });
  // ③ 식 계산, 스마트폰
  $$('#clType button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cl.type = b.dataset.t; clNew(); updateCtl(); }));
  $$('#clDir button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cl.dir = b.dataset.d; clNew(); updateCtl(); }));
  $$('#clF button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cl.fi = +b.dataset.f; clNew(); updateCtl(); }));
  $('#sClU').addEventListener('input', (e) => { S.cl.ui = +e.target.value; clNew(); updateCtl(); });
  $$('#phU button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ph.u = +b.dataset.u; S.ph.t = 0; S.ph.trace = []; updateCtl(); }));
  // ④ 속도 측정
  $('#sGun').addEventListener('input', (e) => { S.gun.ui = +e.target.value; updateCtl(); });
  $('#sBl').addEventListener('input', (e) => { S.bl.ui = +e.target.value; updateCtl(); });
  $('#sRu').addEventListener('input', (e) => { S.rd.ui = +e.target.value; updateCtl(); });
  $$('#rdSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rd.di = +b.dataset.w; updateCtl(); }));
  ['iFa', 'iFr', 'iLamF', 'iF1', 'iF2', 'iPmax', 'iPmin', 'iPu', 'iGu', 'iGk', 'iBu'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'amb') {
      const q = S.amb.trace.length ? S.amb.trace[S.amb.trace.length - 1][1] : AF;
      L1 = '구급차 속력'; a = VSA[S.amb.vi] + ' m/s'; L2 = '사이렌이 내는 소리'; b = AF + ' Hz'; L3 = S.amb.listener === 'road' ? '길가에서 듣는 소리' : '운전자가 듣는 소리'; c = fR(q) + ' Hz';
    } else if (m === 'wf') {
      const lf = S.wf.A.lamFB(); L1 = '파원 속력 v_s'; a = S.wf.vi * 10 + ' m/s'; L2 = '앞 / 뒤 파장'; b = fx(lf.front, 2) + ' / ' + fx(lf.back, 2) + ' m'; L3 = '원래 파장 λ = v/f'; c = '0.50 m';
    } else if (m === 'calc') {
      const f = clFormula(), fm = S.cl.rs.fMeas(0); L1 = '움직이는 것'; a = (S.cl.type === 'src' ? '파원' : '관측자') + ' ' + (S.cl.dir === 'app' ? '다가옴' : '멀어짐'); L2 = '식으로 계산한 f′'; b = fR(f.val) + ' Hz'; L3 = '파면 센서 f′'; c = fm ? fR(fm) + ' Hz' : '—';
    } else if (m === 'phone') {
      L1 = '스피커 진동수'; a = '1000 Hz'; L2 = '지금 앱에 보이는 값'; b = fR(phF(S.ph.t)) + ' Hz'; L3 = '앱 분해능'; c = '1 Hz';
    } else if (m === 'gun') {
      L1 = '자동차 속력 u'; a = gunU() + ' m/s'; L2 = '진동수 변화 Δf'; b = Math.round(gunDf(gunU())) + ' Hz'; L3 = '전파 진동수 f'; c = '24 GHz';
    } else if (m === 'blood') {
      L1 = '혈류 속도 u'; a = fx(bloodU(), 1) + ' m/s'; L2 = '진동수 변화 Δf'; b = fx(bloodDf(bloodU()) / 1000, 1) + ' kHz'; L3 = '초음파 진동수 f'; c = '5.0 MHz';
    } else {
      L1 = '바람 방향 / 세기'; a = WDIR[S.rd.di][2] + ' ' + S.rd.ui * 5 + ' m/s'; L2 = '레이더 진동수'; b = '10 GHz'; L3 = '빗방울에 반사'; c = '파랑 ↔ 빨강';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1e.textContent = a; l2.textContent = L2; v2e.textContent = b; l3.textContent = L3; v3e.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '소리 높이: 구급차가 지나갈 때', short: '소리 높이', icon: '🚑', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 구급차가 지나가는 순간 사이렌 소리가 갑자기 낮아지는 까닭은? 소리 높이의 변화로 움직이는 물체의 속도를 잴 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 탄성파의 진행에서</b> 소리의 속력은 매질이 정하고 v = fλ임을, <b>중학교 소리 파동에서</b> 소리의 높낮이는 진동수가 정함을 배웠어요. 사이렌이 내는 진동수는 그대로인데 우리가 듣는 소리 높이는 왜 달라질까요?</div>' +
        '<p>길가에 서서 700 Hz 사이렌을 울리며 지나가는 구급차를 들어요. 아래 <b>스펙트럼</b>은 들리는 소리의 진동수를 시간에 따라 그린 거예요. (듣는 사람은 도로에서 3 m 떨어져 있지만, 멀리서는 파원과 듣는 사람을 잇는 직선 위의 운동으로 볼 수 있어요.)</p>',
      features: ['amb'],
      setup() { resetFlags(); S.amb.vi = 1; S.amb.listener = 'road'; S.amb.rec = []; S.ts = 1; setScene('amb'); enterScene('amb'); updateCtl(); },
      recap: '구급차가 다가올 때는 사이렌이 내는 소리(700 Hz)보다 높은 소리(744 Hz)가, 멀어질 때는 낮은 소리(661 Hz)가 들려요. 구급차가 빠를수록 변화 폭이 커요. 구급차 안의 사람에게는 사이렌과 같이 움직이므로 소리 높이가 변하지 않아요.',
      summary: '<ul><li><b>도플러 효과</b>: 파원이나 관측자가 움직일 때 관측되는 진동수가 파원이 내는 진동수와 달라지는 현상이에요.</li>' +
        '<li>구급차(사이렌 700 Hz, 72 km/h = 20 m/s): 다가올 때 <b>744 Hz</b>(높게), 멀어질 때 <b>661 Hz</b>(낮게) 들려요.</li>' +
        '<li>구급차가 빠를수록 높은 소리와 낮은 소리의 <b>변화 폭</b>이 커져요.</li>' +
        '<li>사이렌이 <b>내는</b> 진동수(700 Hz)가 바뀌는 것이 아니라 듣는 사람이 <b>관측하는</b> 진동수가 바뀌는 것이에요. 구급차 안의 사람은 사이렌과 같이 움직이므로 700 Hz로 들어요.</li></ul>',
      missions: [
        {
          title: '속력을 바꾸며 변화 폭 확인하기',
          goal: '구급차의 <b>속력을 세 가지 이상</b>으로 바꾸며, 길가에서 지나가는 동안 들리는 소리의 <b>높음·낮음·변화 폭</b>을 기록해요.',
          hint: '속력 슬라이더를 바꾸면 구급차가 다시 출발해요. 지나가고 나면 오른쪽 표에 자동으로 기록돼요. ⏩ 빨리 감기를 쓰면 빨리 끝나요.',
          setup() { resetFlags(); S.amb.vi = 1; S.amb.listener = 'road'; S.amb.rec = []; setScene('amb'); enterScene('amb'); updateCtl(); },
          check: () => S.amb.rec.length >= 3,
          hold: 0.5,
          status: () => mark(S.amb.rec.length >= 3) + ' 기록한 속력 ' + S.amb.rec.length + ' / 3 ' + (S.amb.rec.length ? '(' + S.amb.rec.slice().sort((a, b) => a.vs - b.vs).map((r) => r.vs + ' m/s').join(', ') + ')' : ''),
          explain: '속력이 10 → 20 → 30 → 40 m/s로 커질수록 높은 소리와 낮은 소리의 차이(변화 폭)가 약 41 → 83 → 124 → 167 Hz로 커졌어요. 구급차가 빠를수록 도플러 효과가 커져요.',
        },
        {
          title: '스펙트럼에서 높낮이 읽기', manual: true,
          goal: '구급차가 지나가는 동안 스펙트럼에서 <b>다가올 때</b>와 <b>멀어질 때</b> 들리는 진동수(Hz)를 읽어 입력하고 ✔ 확인하기를 누르세요.',
          hint: '주황 선이 700 Hz보다 높은 때가 다가오는 때, 낮은 때가 멀어지는 때예요. 위 검은 상자에 지금 들리는 진동수가 숫자로 나와요.',
          setup() { resetFlags(); clr('iFa', 'iFr'); setFlag('read', true); S.amb.vi = 1; S.amb.listener = 'road'; setScene('amb'); enterScene('amb'); updateCtl(); },
          check() {
            const a = num('iFa'), b = num('iFr'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const vs = VSA[S.amb.vi], oks = [near(a, ambF(vs, true), 6), near(b, ambF(vs, false), 6)];
            fb([[$('#iFa'), oks[0]], [$('#iFr'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (near(a, ambF(vs, false), 6) && near(b, ambF(vs, true), 6)) return '다가올 때는 높게, 멀어질 때는 낮게 들려요. 두 값이 바뀌었어요.';
            if (near(a, AF, 4) || near(b, AF, 4)) return '700 Hz는 사이렌이 내는 소리예요. 길가에서 들리는 진동수를 읽어요.';
            return '다가올 때는 700 Hz보다 높고, 멀어질 때는 낮아요. 스펙트럼의 주황 선 높이를 눈금으로 읽어 보세요.';
          },
          status: () => '입력 다가올 때 ' + ($('#iFa').value.trim() || '—') + ' Hz, 멀어질 때 ' + ($('#iFr').value.trim() || '—') + ' Hz',
          explain: '속력 20 m/s에서 다가올 때는 약 <b>744 Hz</b>, 멀어질 때는 약 <b>661 Hz</b>로 들려요. 사이렌이 내는 700 Hz가 아니라 듣는 사람이 <b>관측하는 진동수</b>가 달라진 거예요.',
        },
        {
          type: 'quiz', title: '구급차 안에서 들리는 소리',
          goal: '구급차를 운전하는 사람은 사이렌 소리를 어떻게 들을까요? <b>🚑 구급차 안에서 듣기</b>로 확인해 보세요.',
          setup() { resetFlags(); S.amb.vi = 1; S.amb.listener = 'inside'; setScene('amb'); enterScene('amb'); updateCtl(); },
          choices: ['다가갈 때는 높게, 멀어질 때는 낮게 들려요 (길가의 사람과 같아요)', '사이렌과 같이 움직이므로 소리 높이가 변하지 않고 700 Hz로 들려요', '사이렌이 내는 진동수 자체가 다가갈 때 커지고 멀어질 때 작아져요', '엔진 소리 때문에 알 수 없어요'],
          answer: 1,
          feedback: ['운전자는 사이렌과 함께 움직여서 사이렌과의 거리가 변하지 않아요. 높낮이 변화는 상대적인 움직임이 있을 때 생겨요.', '', '사이렌이 내는 진동수는 700 Hz로 일정해요. 달라지는 것은 듣는 쪽이 관측하는 진동수예요.', '스펙트럼을 보면 구급차 안에서는 진동수가 변하지 않고 일정해요.'],
          explain: '운전자는 사이렌과 <b>같이 움직이므로</b> 사이렌과의 거리가 변하지 않아서 700 Hz 그대로 들려요. 사이렌이 내는 진동수 자체가 변하는 것이 아니라, 파원과 관측자의 <b>상대적인 움직임</b> 때문에 관측되는 진동수가 달라지는 것이 도플러 효과예요.',
        },
      ],
    },
    {
      title: '파면 모형: 간격이 달라져요', short: '파면 모형', icon: '🌀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 움직이는 구급차 앞에서는 높은 소리, 뒤에서는 낮은 소리가 들렸어요. 파동의 속력은 매질이 정하고 v = fλ이니, 소리 높이(진동수)가 달라지려면 <b>파장이나 맞이하는 파면의 수</b>가 달라져야 해요.</div>' +
        '<p>소리를 내는 <b>파원</b>이 움직이며 파면(원)을 하나씩 내놓는 모습을 위에서 봐요. 파원이 움직이는 경우(왼쪽)와 관측자가 움직이는 경우(오른쪽)를 나란히 비교해요. (파면은 실제 소리의 속력 340 m/s와 진동수 680 Hz에 맞춰 정확히 계산했고, 시간은 느리게 보여 줘요.)</p>',
      features: ['wf'],
      setup() { resetFlags(); S.wf.vi = 10; S.wf.rec = []; setScene('wf'); enterScene('wf'); updateCtl(); },
      recap: '움직이는 파원 앞쪽의 파면 간격(파장)은 λ′ = (v − v_s)T로 줄고 뒤쪽은 (v + v_s)T로 늘어요. 소리의 속력은 그대로이므로 앞쪽에서는 f′ = v/λ′가 커져요. 관측자가 움직일 때는 파장은 그대로이고 초당 맞이하는 파면 수가 달라져요.',
      summary: '<ul><li><b>파원이 움직일 때</b>: 파면이 방출될 때마다 파원이 조금씩 옮겨져 있어서 앞쪽 파면은 촘촘하고 뒤쪽은 성겨요. 앞쪽 <b>λ′ = (v − v_s)T</b>, 뒤쪽 <b>λ″ = (v + v_s)T</b> (T = 1/f).</li>' +
        '<li>소리의 속력 v는 매질(공기)이 정하므로 파원이 움직여도 그대로예요. 앞쪽 관측자는 <b>f′ = v/λ′ = f v/(v − v_s)</b>로 높은 소리를 들어요.</li>' +
        '<li>v_s = 20 m/s, f = 680 Hz(T = 1/680 s)이면 앞쪽 λ′ = (340 − 20)/680 = <b>0.47 m</b>, 뒤쪽 0.53 m.</li>' +
        '<li><b>관측자가 움직일 때</b>: 파면 간격(파장)은 그대로이고, 다가가면 초당 맞이하는 파면 수가 늘어 진동수가 커져요.</li></ul>',
      missions: [
        {
          title: '앞·뒤 파장 재기',
          goal: '파원 속력을 <b>100 m/s 이상</b>으로 하고 <b>📏 앞·뒤 파장 재기</b>를 눌러요. 속력을 바꿔서 한 번 더 재서 <b>두 번 이상</b> 기록해요.',
          hint: '속력 슬라이더를 오른쪽으로 옮기면 앞쪽 파면이 더 촘촘해져요. 빨간 자(앞)와 파란 자(뒤)의 길이가 파장이에요.',
          setup() { resetFlags(); S.wf.vi = 10; S.wf.rec = []; setScene('wf'); enterScene('wf'); updateCtl(); },
          check: () => S.wf.rec.length >= 2 && S.wf.rec.some((r) => r.vs >= 100),
          hold: 0.5,
          status: () => mark(S.wf.rec.some((r) => r.vs >= 100)) + ' 100 m/s 이상 기록 &nbsp; ' + mark(S.wf.rec.length >= 2) + ' 기록 ' + S.wf.rec.length + ' / 2',
          explain: '파원이 움직이면 <b>앞쪽 파장은 원래(0.50 m)보다 짧고 뒤쪽은 길어요</b>. 예를 들어 100 m/s에서는 앞 0.35 m, 뒤 0.65 m예요. 속력이 클수록 차이가 커요.',
        },
        {
          title: '앞쪽 파장 계산하기', manual: true,
          goal: '진동수 680 Hz인 소리를 내는 파원이 <b>20 m/s</b>로 다가올 때, 앞쪽 파장 <b>λ′</b>(m)를 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'λ′ = (v − v_s) T = (v − v_s) / f예요. v = 340 m/s, 소수 둘째 자리까지 써요.',
          setup() { resetFlags(); clr('iLamF'); setFlag('lam', true); S.wf.vi = 10; setScene('wf'); enterScene('wf'); updateCtl(); },
          check() {
            const v = num('iLamF'); if (v == null) return '앞쪽 파장을 숫자로 입력해 주세요 (m).';
            const ok = near(v, 0.4706, 0.011); fb([[$('#iLamF'), ok]]);
            if (ok) return true;
            if (near(v, 0.5294, 0.011)) return '0.53 m는 뒤쪽 파장이에요. 앞쪽은 파면이 촘촘하므로 v − v_s를 써요.';
            if (near(v, 0.5, 0.01)) return '0.50 m는 파원이 정지해 있을 때의 파장이에요. 파원이 움직이면 달라져요.';
            return 'λ′ = (340 − 20) / 680을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iLamF').value.trim() || '—') + ' m',
          explain: 'λ′ = (v − v_s)/f = (340 − 20)/680 = 320/680 ≈ <b>0.47 m</b>예요. 정지했을 때의 파장 0.50 m보다 짧아요(뒤쪽은 360/680 ≈ 0.53 m). 슬라이더를 20 m/s에 맞춰 그림의 자와 비교해 보세요.',
        },
        {
          type: 'quiz', title: '파원이 소리의 속력에 가까워지면?',
          goal: '파원의 속력이 소리의 속력(340 m/s)에 <b>가까워질수록</b> 앞쪽 파장과 소리의 속력은 어떻게 될까요?',
          setup() { resetFlags(); S.wf.vi = 30; setScene('wf'); enterScene('wf'); updateCtl(); },
          choices: ['앞쪽 파장이 0에 가까워져요. 소리의 속력은 그대로예요', '파원이 움직이므로 소리의 속력이 파원의 속력만큼 빨라져요', '앞쪽 파장이 늘어나요', '파장은 변하지 않아요'],
          answer: 0,
          feedback: ['', '소리의 속력은 매질이 정해요. 파원이 움직여도 파면이 퍼지는 속력은 340 m/s 그대로예요.', '앞쪽 파장은 (v − v_s)T라서 v_s가 커질수록 줄어요.', '파원의 움직임 때문에 앞쪽·뒤쪽 파장이 달라져요.'],
          explain: '앞쪽 파장 λ′ = (v − v_s)T는 v_s → v일 때 <b>0에 가까워져요</b>(파면이 쌓여요). 파면이 퍼지는 속력은 매질(공기)이 정하므로 340 m/s 그대로예요. (v_s가 v와 같거나 넘는 경우는 이 수업에서 다루지 않아요.)',
        },
      ],
    },
    {
      title: '도플러 식: 계산하고 측정하기', short: '도플러 식', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파원이 다가오면 앞쪽 파장이 (v − v_s)T로 줄고, 관측자가 다가오면 맞이하는 파면 수가 늘어나는 것을 봤어요. 이제 이것을 <b>식</b>으로 정리하고 스마트폰으로 직접 측정해요.</div>' +
        '<p><b>🧮 식 계산</b>에서는 파원이나 관측자의 속력과 방향을 고르면 f′를 계산하고 파면 센서가 센 값과 비교해요. <b>📱 스마트폰 측정</b>에서는 돌고 있는 원판 끝 스피커의 소리를 분석 앱으로 재요.</p>',
      features: ['calc', 'phone'],
      setup() { resetFlags(); S.cl.type = 'src'; S.cl.dir = 'app'; S.cl.ui = 4; S.cl.fi = 1; S.ph.u = 2.0; setScene('calc'); enterScene('calc'); updateCtl(); },
      recap: '파원이 다가오면 f′ = f v/(v − v_s), 멀어지면 f v/(v + v_s)이고, 관측자가 다가오면 f′ = f (v + v_o)/v, 멀어지면 f (v − v_o)/v예요. 원판 위 스피커를 스마트폰으로 재면 가장 높은 값과 낮은 값으로 속력을 구할 수 있어요.',
      summary: '<ul><li><b>일반식</b>: f′ = f (v ± v_o) / (v ∓ v_s). <b>다가오면 진동수가 커지는 쪽</b>의 부호를 써요.</li>' +
        '<li>파원이 다가옴: f′ = f v/(v − v_s), 멀어짐: f v/(v + v_s). 관측자가 다가옴: f (v + v_o)/v, 멀어짐: f (v − v_o)/v.</li>' +
        '<li>f = 680 Hz, 20 m/s: 파원 다가옴 723 Hz, 관측자 다가옴 720 Hz (파원과 관측자의 움직임은 같은 속력이어도 값이 조금 달라요). 구급차 700 Hz → 744 Hz, 661 Hz.</li>' +
        '<li>스마트폰: 원판 끝 스피커(1000 Hz, 2.0 m/s)는 가까워질 때 최대 1006 Hz, 멀어질 때 최소 994 Hz(Δf ≈ 12 Hz). 속력은 <b>u = v (f_max − f_min)/(f_max + f_min) = 340 × 12/2000 = 2.0 m/s</b>.</li>' +
        '<li>측정 오차: 앱 분해능 1 Hz, 실내 벽의 반사 등.</li></ul>',
      missions: [
        {
          title: '구급차 사이렌의 진동수 계산하기', manual: true,
          goal: '사이렌 <b>700 Hz</b>인 구급차가 <b>20 m/s</b>로 다가올 때와 멀어질 때, 길가에서 듣는 진동수 <b>f′</b>(Hz)를 계산해 입력하세요. (🧮 계산 도구를 써도 돼요)',
          hint: '파원이 다가오면 f′ = f v/(v − v_s), 멀어지면 f′ = f v/(v + v_s)예요. v = 340 m/s예요.',
          setup() { resetFlags(); clr('iF1', 'iF2'); setFlag('calc', true); S.cl.type = 'src'; S.cl.dir = 'app'; S.cl.ui = 4; S.cl.fi = 1; setScene('calc'); clNew(); updateCtl(); },
          check() {
            const a = num('iF1'), b = num('iF2'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const oks = [near(a, 743.75, 1.5), near(b, 661.1, 1.5)]; fb([[$('#iF1'), oks[0]], [$('#iF2'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (near(a, 661.1, 1.5) && near(b, 743.75, 1.5)) return '다가오면 진동수가 커져요. 두 값이 바뀌었어요.';
            if (near(a, 720.6, 1.5) || near(b, 677.6, 1.5)) return '관측자가 움직이는 식을 썼어요. 파원(구급차)이 움직이는 경우는 분모에 v ∓ v_s가 들어가요.';
            return !oks[0] ? '다가올 때: 700 × 340 / (340 − 20)을 계산해 보세요.' : '멀어질 때: 700 × 340 / (340 + 20)을 계산해 보세요.';
          },
          status: () => '입력 다가올 때 ' + ($('#iF1').value.trim() || '—') + ' Hz, 멀어질 때 ' + ($('#iF2').value.trim() || '—') + ' Hz',
          explain: '다가올 때 f′ = 700 × 340/(340 − 20) = 238000/320 ≈ <b>744 Hz</b>, 멀어질 때 f′ = 700 × 340/(340 + 20) = 238000/360 ≈ <b>661 Hz</b>예요. 앞에서 스펙트럼으로 읽은 값과 같죠?',
        },
        {
          title: '스마트폰 그래프로 속력 구하기', manual: true,
          goal: '📱 스마트폰 앱 그래프에서 <b>최댓값 f_max</b>와 <b>최솟값 f_min</b>(Hz)을 읽고, 원판 끝 스피커의 속력 <b>u</b>(m/s)를 구해 입력하세요.',
          hint: '그래프가 위아래로 오르내리는 폭을 몇 초 동안 지켜보고 가장 높은 값과 낮은 값을 읽어요. u = v (f_max − f_min)/(f_max + f_min), v = 340 m/s예요.',
          setup() { resetFlags(); clr('iPmax', 'iPmin', 'iPu'); setFlag('phone', true); S.ph.u = 2.0; setScene('phone'); enterScene('phone'); updateCtl(); },
          check() {
            const a = num('iPmax'), b = num('iPmin'), u = num('iPu'); if (a == null || b == null || u == null) return '세 칸 모두 입력해 주세요.';
            const fmax = PH_F * V / (V - S.ph.u), fmin = PH_F * V / (V + S.ph.u), uc = V * (a - b) / (a + b);
            const oks = [near(a, fmax, 1.6), near(b, fmin, 1.6), near(u, S.ph.u, 0.25) && near(u, uc, 0.2)];
            fb([[$('#iPmax'), oks[0]], [$('#iPmin'), oks[1]], [$('#iPu'), oks[2]]]);
            if (oks.every(Boolean)) return true;
            if (oks[0] && oks[1]) return 'u = v (f_max − f_min)/(f_max + f_min) = 340 × (' + fx(a - b, 0) + ')/(' + fx(a + b, 0) + ')을 계산해 보세요.';
            if (near(a, PH_F, 2) && near(b, PH_F, 2)) return '1000 Hz는 스피커가 내는 소리예요. 앱 그래프에서 가장 높은 값과 낮은 값을 읽어요.';
            return '그래프가 오르내리는 가장 높은 값과 가장 낮은 값을 눈금(2 Hz 칸)으로 읽어 보세요.';
          },
          status: () => '입력 f_max ' + ($('#iPmax').value.trim() || '—') + ', f_min ' + ($('#iPmin').value.trim() || '—') + ' Hz, u ' + ($('#iPu').value.trim() || '—') + ' m/s',
          explain: '앱 그래프의 최댓값은 약 <b>1006 Hz</b>, 최솟값은 약 <b>994 Hz</b>예요. u = 340 × (1006 − 994)/(1006 + 994) = 340 × 12/2000 ≈ <b>2.0 m/s</b>예요. 소리의 높낮이로 움직이는 물체의 속력을 잰 거예요! (앱 분해능 1 Hz 때문에 ±1 Hz쯤 오차가 있어요.)',
        },
        {
          type: 'quiz', title: '파원이 다가올 때와 관측자가 다가올 때',
          goal: '같은 속력(20 m/s)으로 파원이 다가올 때(723 Hz)와 관측자가 다가올 때(720 Hz) 진동수가 <b>조금 다른 까닭</b>은?',
          setup() { resetFlags(); S.cl.type = 'obs'; S.cl.dir = 'app'; S.cl.ui = 4; S.cl.fi = 0; setScene('calc'); clNew(); updateCtl(); },
          choices: ['파원이 움직이면 파장이 달라지고, 관측자가 움직이면 파장은 그대로이고 맞이하는 파면 수만 달라져서 식이 달라요', '파원이 더 무거워서 진동수가 더 커져요', '관측자가 움직이면 소리의 속력이 달라져서 진동수가 달라져요', '둘은 원래 정확히 같고 측정 오차예요'],
          answer: 0,
          feedback: ['', '질량과는 관계없어요. 파원이 움직이면 파장이 달라지고 관측자가 움직이면 파장이 그대로예요.', '소리의 속력은 매질이 정해요. 관측자가 움직여도 파면의 속력은 같지만 관측자가 상대적으로 맞이하는 속력이 달라져요.', '두 식은 f v/(v − v_s)와 f (v + v_o)/v로 달라요. 계산하면 723 Hz와 720 Hz예요.'],
          explain: '파원이 움직이면 <b>파장이 (v − v_s)T로 바뀌고</b>(f′ = f v/(v − v_s) = 722.5 Hz), 관측자가 움직이면 <b>파장은 그대로</b>이고 초당 맞이하는 파면 수가 바뀌어요(f′ = f (v + v_o)/v = 720 Hz). 그래서 같은 속력이라도 값이 약간 달라요.',
        },
      ],
    },
    {
      title: '속도 측정: 반사파의 진동수 변화', short: '속도 측정', icon: '🚓', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진동수 변화로 속력을 구했어요(u = v (f_max − f_min)/(f_max + f_min)). 이번에는 <b>반사파</b>를 이용해요. 움직이는 물체에 전파나 초음파를 쏘면 반사되어 돌아온 파동의 진동수가 달라져요.</div>' +
        '<p>움직이는 물체는 파동을 <b>받을 때 한 번</b>(관측자), 다시 <b>반사할 때 한 번</b>(파원) 도플러 효과를 줘서 변화량이 약 2배가 돼요: <b>Δf ≈ 2fu/v</b>. 스피드건, 초음파 혈류 측정, 기상 레이더에서 이 원리를 써요.</p>',
      features: ['gun', 'blood', 'radar'],
      setup() { resetFlags(); S.gun.ui = 4; S.bl.ui = 4; S.rd.ui = 2; S.rd.di = 0; setScene('gun'); enterScene('gun'); updateCtl(); },
      recap: '움직이는 물체에서 반사된 파동의 진동수 변화량은 Δf ≈ 2fu/v(받을 때 한 번, 반사할 때 한 번)예요. 이 Δf를 재면 스피드건은 자동차의 속력을, 초음파 장치는 혈류 속도를, 기상 레이더는 바람의 속도를 알아내요.',
      summary: '<ul><li><b>반사파의 도플러 효과</b>: 움직이는 물체는 파동을 받을 때 한 번, 반사할 때 한 번 도플러 효과를 주므로 <b>Δf ≈ 2fu/v</b> (u ≪ v).</li>' +
        '<li><b>스피드건</b>(24 GHz 전파): 자동차 30 m/s(108 km/h)이면 Δf = 2 × 24×10⁹ × 30 / (3.0×10⁸) = <b>4800 Hz</b>.</li>' +
        '<li><b>초음파 혈류 측정</b>(5.0 MHz, 혈액 속 소리 1540 m/s): 혈류 0.50 m/s이면 Δf = 2 × 5.0×10⁶ × 0.50/1540 ≈ <b>3.2 kHz</b> (들리는 소리 범위).</li>' +
        '<li><b>기상 레이더</b>: 빗방울이 레이더 쪽으로 오는지 멀어지는지에 따라 Δf의 부호가 달라서 바람의 속도 지도를 만들어요.</li>' +
        '<li>빛에서도 같은 효과: 멀어지는 은하의 빛은 파장이 길게(적색 편이) 관측돼요.</li></ul>',
      missions: [
        {
          title: '스피드건의 Δf로 속력 구하기', manual: true,
          goal: '스피드건(24 GHz)이 반사파에서 <b>Δf = 4800 Hz</b>를 잰 자동차의 속력을 <b>m/s</b>와 <b>km/h</b>로 구해 입력하세요. (c = 3.0×10⁸ m/s)',
          hint: 'Δf ≈ 2 f u / c에서 u = Δf · c / (2 f)예요. m/s를 km/h로 바꾸려면 3.6을 곱해요.',
          setup() { resetFlags(); clr('iGu', 'iGk'); setFlag('gunOK', true); S.gun.ui = 4; setScene('gun'); enterScene('gun'); updateCtl(); },
          check() {
            const a = num('iGu'), b = num('iGk'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const oks = [near(a, 30, 1), near(b, 108, 3)]; fb([[$('#iGu'), oks[0]], [$('#iGk'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (near(a, 60, 2)) return '60 m/s는 Δf를 2로 나누지 않은 값이에요. Δf = 2 f u/c이므로 u = Δf c/(2f)예요.';
            if (oks[0] && !oks[1]) return 'm/s에 3.6을 곱하면 km/h예요 (30 m/s = 108 km/h).';
            return 'u = 4800 × 3.0×10⁸ / (2 × 24×10⁹)을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iGu').value.trim() || '—') + ' m/s, ' + ($('#iGk').value.trim() || '—') + ' km/h',
          explain: 'u = Δf·c/(2f) = 4800 × 3.0×10⁸ / (2 × 24×10⁹) = <b>30 m/s</b> = 30 × 3.6 = <b>108 km/h</b>예요. 변화량이 2fu/c로 2배이기 때문에 2로 나눠 줘요.',
        },
        {
          title: '초음파 혈류의 속도 구하기', manual: true,
          goal: '5.0 MHz 초음파 혈류계가 <b>Δf ≈ 3.2 kHz</b>(3200 Hz)를 잰 혈류의 속도를 <b>m/s</b>로 구해 입력하세요. (혈액 속 소리 v = 1540 m/s)',
          hint: 'Δf ≈ 2 f u / v에서 u = Δf · v / (2 f)예요. 5.0 MHz = 5.0×10⁶ Hz.',
          setup() { resetFlags(); clr('iBu'); setFlag('bloodOK', true); S.bl.ui = 4; setScene('blood'); enterScene('blood'); updateCtl(); },
          check() {
            const a = num('iBu'); if (a == null) return '속도를 숫자로 입력해 주세요 (m/s).';
            const ok = near(a, 0.5, 0.03); fb([[$('#iBu'), ok]]);
            if (ok) return true;
            if (near(a, 1.0, 0.06)) return '1.0 m/s는 Δf를 2로 나누지 않은 값이에요. u = Δf v/(2f)예요.';
            if (near(a, 0.0005, 0.0001) || a > 50) return '단위를 확인해요. Δf는 Hz, f는 Hz로 맞춰 계산하고 속도는 m/s로 써요.';
            return 'u = 3200 × 1540 / (2 × 5.0×10⁶)을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iBu').value.trim() || '—') + ' m/s',
          explain: 'u = Δf·v/(2f) = 3200 × 1540 / (2 × 5.0×10⁶) ≈ <b>0.49 m/s ≈ 0.50 m/s</b>예요. 피를 빠르게 흘려보내는 혈관 속 혈류 속도도 몸에 닿지 않고 소리의 진동수 변화로 알 수 있어요.',
        },
        {
          type: 'quiz', title: '스피드건이 변화량을 2배로 받는 까닭',
          goal: '스피드건이 받는 반사파의 진동수 변화량은 <b>Δf ≈ 2fu/c</b>예요. <b>2배</b>가 되는 까닭은?',
          setup() { resetFlags(); S.gun.ui = 4; setScene('gun'); enterScene('gun'); updateCtl(); },
          choices: ['자동차가 전파를 받을 때(움직이는 관측자) 한 번, 다시 반사할 때(움직이는 파원) 한 번 도플러 효과가 생기기 때문이에요', '전파가 두 번 반사되기 때문이에요', '자동차가 전파의 속력을 2배로 만들기 때문이에요', '스피드건이 진동수를 2배로 증폭하기 때문이에요'],
          answer: 0,
          feedback: ['', '반사는 자동차에서 한 번이에요. 도플러 효과가 받을 때와 반사할 때 두 번 일어나요.', '전파의 속력은 c로 일정해요(빛의 속력은 그대로예요).', '스피드건의 증폭이 아니라 자동차가 움직이는 파원과 관측자 역할을 모두 하기 때문이에요.'],
          explain: '움직이는 자동차는 <b>① 전파를 받을 때</b> 관측자로서 f(1 + u/c)를 받고, <b>② 그 진동수로 다시 반사할 때</b> 파원으로서 한 번 더 변해서 f(1 + 2u/c)쯤이 돼요. 그래서 변화량은 u가 아닌 <b>2u</b>에 비례하는 Δf ≈ 2fu/c예요. 도로 위 속도 단속 장비는 이 원리로 자동차의 속력을 재요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-doppler', mount: '#game', badge: '도플러 박사', homeHref: '../../index.html#hm',
    featureLabels: { amb: '🚑 구급차 사이렌 · 스펙트럼', wf: '🌀 파면 모형 (파원·관측자)', calc: '🧮 도플러 식 계산', phone: '📱 스마트폰 측정', gun: '🚓 스피드건', blood: '🩺 초음파 혈류', radar: '🌧️ 기상 레이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  enterScene('amb'); updateCtl();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    const m = S.mode;
    if (m === 'amb') ambStep(dt);
    else if (m === 'wf') {
      S.wf.A.advance(dt * KT); S.wf.B.advance(dt * KT);
      if (S.wf.A.xs(S.wf.A.P) > 4.9) { const vs = S.wf.vi * 10; S.wf.A = new RS({ f0: 680, vs, xs0: 1.7, Rmax: 7, obs: [{ x0: 5.2, name: 'A' }, { x0: 0.35, name: 'B' }] }); }
      if (S.wf.B.xo(0, S.wf.B.P) > 5.4) { const vs = S.wf.vi * 10; S.wf.B = new RS({ f0: 680, vs: 0, xs0: 3.4, Rmax: 7, obs: [{ x0: 0.7, u: vs, name: 'C' }] }); }
    } else if (m === 'calc') {
      const rs = S.cl.rs; rs.advance(dt * KT);
      if (rs.xs(rs.P) > 11.3 || rs.xs(rs.P) < 0.3 || rs.xo(0, rs.P) < 0.3 || rs.xo(0, rs.P) > 11.3) clNew();
    } else if (m === 'phone') {
      const p = S.ph; p.t += dt * S.ts; p.trace.push([p.t, phF(p.t)]); while (p.trace.length && p.trace[0][0] < p.t - 2.6) p.trace.shift();
    } else if (m === 'gun') S.gun.t += dt; else if (m === 'blood') S.bl.t += dt;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (m) {
      case 'amb': drawAmbScene(); break;
      case 'wf': drawWfScene(); break;
      case 'calc': drawCalcScene(); break;
      case 'phone': drawPhoneScene(); break;
      case 'gun': drawGunScene(); break;
      case 'blood': drawBloodScene(); break;
      default: drawRadarScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, enterScene, RS, V, ambObs, ambF, clFormula, phF, wfNew, clNew,
    run(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'amb') ambStep(0.02); else if (S.mode === 'wf') { S.wf.A.advance(0.02 * KT); S.wf.B.advance(0.02 * KT); } else if (S.mode === 'calc') S.cl.rs.advance(0.02 * KT); else if (S.mode === 'phone') { S.ph.t += 0.02; S.ph.trace.push([S.ph.t, phF(S.ph.t)]); } } },
  };
})();
