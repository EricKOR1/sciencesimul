/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 탄성파의 반사와 투과 (3차시)
   성취기준 [12역학03-02] 탄성파의 진행, 투과, 반사를 이해하고, 탄성파가 활용되는 예를 찾음으로써 과학의 유용성을 인식할 수 있다. (반사·투과 부분)
   ① 관찰: 끝에서 반사 (고정단: 위상 반전, 자유단: 위상 그대로)
   ② 탐구: 경계 통과 (두 줄의 경계: 반사파·투과파의 위상과 진폭, 진동수 불변·파장 변화)
   ③ 분석: 에코 거리 (d = vt/2, 소나)
   ④ 적용: 초음파 활용 (초음파 영상, 비파괴 검사)
   줄은 질량(μ·Δx)이 장력(T/Δx)으로 이어진 사슬이고 뉴턴 운동 법칙으로 계산해요(파동 방정식·임피던스 식은 쓰지 않아요).
   반사·투과 진폭과 에너지 몫은 시뮬레이션에서 측정한 값이에요. 세로 눈금은 가로보다 확대해서 그렸어요.
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
  const { ctx, D, T, panel, cardBegin, para, frame } = setupDraw(view);
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const DT = 4e-4;
  const A0 = 0.06;                     // 입사 펄스 진폭 6.0 cm
  const TEN = 40, MU1 = 0.1, MU2 = 0.4, AA = 0.05, NN = 240, XB = 6.0;
  const v1 = Math.sqrt(TEN / MU1), v2 = Math.sqrt(TEN / MU2);     // 20, 10 m/s
  const XA = 2.5, XBP = 9.5;           // 센서 위치
  const cm = (m) => m * 100;
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const sgn = (v, d) => (v >= 0 ? '+' : MINUS) + Math.abs(cm(v)).toFixed(d == null ? 1 : d);

  /* ================= 상태 ================= */
  const S = {
    mode: 'end', fade: 0, clock: 0, ts: 0.25, sc: null,
    end: { kind: 'fixed', ok: { fixed: false, free: false }, tried: { fixed: null, free: null }, seen: { fixed: false, free: false } },
    bd: { dir: 'LH', res: { LH: null, HL: null }, judged: { LH: null, HL: null }, ok: { LH: false, HL: false } },
    echo: { scen: 'A', run: null, done: { A: false, B: false, bat: false }, shown: false },
    us: { pos: 20, gel: true, fi: 1, scan: {}, auto: null, t: 0 },
    nd: { pos: 4, cursor: 10.0, found: false },
    flags: { judge: false, judge2: false, lam: false, echoA: false, echoB: false, echoOK: false, usOK: false, ndOK: false, depth: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1e = $('#v1'), v2e = $('#v2'), v3e = $('#v3');
  const MODES = ['end', 'bd', 'echo', 'img', 'ndt'];
  const ALLOWED = [['end'], ['bd'], ['echo'], ['img', 'ndt']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };

  /* ================= 센서 (한 점의 변위를 시간에 따라 기록) ================= */
  function Probe(idx, x) { this.idx = idx; this.x = x; this.reset(); }
  Probe.prototype.reset = function () { this.segs = []; this.cur = null; this.series = []; this.n = 0; };
  Probe.prototype.push = function (val, t) {
    const thr = 0.15 * A0;
    if (this.n++ % 10 === 0) this.series.push([t, val]);
    if (!this.cur) { if (Math.abs(val) > thr) this.cur = { ext: val, tx: t }; }
    else {
      if (Math.abs(val) > Math.abs(this.cur.ext)) { this.cur.ext = val; this.cur.tx = t; }
      if (Math.abs(val) < thr * 0.5 && t - this.cur.tx > 0.01) { this.segs.push({ peak: this.cur.ext, t: this.cur.tx }); this.cur = null; }
    }
  };

  /* ================= 줄 만들기 ================= */
  function buildString(kind) {
    let ch;
    if (kind === 'fixed' || kind === 'free') ch = new Chain({ n: NN, a: AA, k: () => TEN / AA, m: () => MU1 * AA, left: 'source', right: kind });
    else {
      const muAt = (i) => { const x = i * AA, eps = 1e-9; return x < XB - eps ? (kind === 'LH' ? MU1 : MU2) : x > XB + eps ? (kind === 'LH' ? MU2 : MU1) : 0.5 * (MU1 + MU2); };
      ch = new Chain({ n: NN, a: AA, k: () => TEN / AA, m: (i) => muAt(i) * AA, left: 'source', right: 'absorb' });
    }
    const left = kind === 'HL' ? v2 : v1;
    const sc = { kind, ch, acc: 0, drv: { kind: 'none' }, vL: left, tau: 0.6 / left, pA: new Probe(Math.round(XA / AA), XA), pB: new Probe(Math.round(XBP / AA), XBP), sent: false, tHit: null, cap: null, busy: false };
    return sc;
  }
  function startPulse(sc) {
    sc.ch.y.fill(0); sc.ch.v.fill(0); sc.ch.t = 0; sc.acc = 0;
    sc.drv = { kind: 'pulse', t0: 0, tau: sc.tau, A: A0 }; sc.pA.reset(); sc.pB.reset(); sc.sent = true; sc.tHit = null; sc.cap = null; sc.busy = true; sc.fin = false;
  }
  function startWave(sc, f) { sc.drv = { kind: 'wave', on: true, f, ph: 0, env: 0, A: A0 }; sc.sent = false; sc.busy = false; }
  function stopWave(sc) { if (sc.drv.kind === 'wave') sc.drv.on = false; }
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
    if (sc.sent) {
      sc.pA.push(sc.ch.y[sc.pA.idx], sc.ch.t); sc.pB.push(sc.ch.y[sc.pB.idx], sc.ch.t);
      if (sc.kind === 'LH' || sc.kind === 'HL') {
        if (sc.tHit == null && sc.pA.segs.length >= 1) sc.tHit = sc.pA.segs[0].t + (XB - XA) / sc.vL;
        if (sc.tHit != null && sc.cap == null && sc.ch.t >= sc.tHit + 0.12) {
          const nb = Math.round(XB / AA), EL = sc.ch.energy(0, nb - 1), ER = sc.ch.energy(nb + 1, NN), tot = EL + ER;
          sc.cap = { refl: EL / tot, trans: ER / tot };
        }
      }
      if (sc.busy && sc.ch.t > (sc.kind === 'fixed' || sc.kind === 'free' ? 1.5 : 1.6)) { sc.busy = false; sc.fin = true; onPulseDone(sc); }
    }
  }
  function onPulseDone(sc) {
    const inc = sc.pA.segs[0], k = sc.kind;
    if (k === 'fixed' || k === 'free') {
      const rf = sc.pA.segs[1]; if (!inc || !rf) return;
      S.end.seen[k] = true; S.flags.judge = true;
    } else {
      const rf = sc.pA.segs[1], tr = sc.pB.segs[0]; if (!inc || !rf || !tr) return;
      S.bd.res[k] = { inc: inc.peak, refl: rf.peak, trans: tr.peak, E: sc.cap };
      S.flags.judge2 = true;
    }
    Sound.click(); updateCtl();
  }
  function simStep(dt) {
    const sc = S.sc; if (!sc) return;
    sc.acc += dt * S.ts; let n = 0;
    while (sc.acc >= DT && n < 200) { substep(sc, DT); sc.acc -= DT; n++; }
    if (n >= 200) sc.acc = 0;
  }
  function enterScene(mode) {
    if (mode === 'end') { S.sc = buildString(S.end.kind); S.ts = 0.25; }
    else if (mode === 'bd') { S.sc = buildString(S.bd.dir); S.ts = 0.25; }
    else S.sc = null;
    if (mode === 'echo') { S.echo.run = null; S.ts = 1; }
    if (mode === 'img') { S.us.auto = null; }
    S.ts = (mode === 'end' || mode === 'bd') ? 0.25 : 1;
  }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; enterScene(mode); } updateCtl(); }

  /* ================= 그리기: 줄 ================= */
  function drawHand(x, y) {
    D.shadow(() => { D.roundRect(x - 24, y - 17, 15, 34, 6); ctx.fillStyle = '#f59e0b'; ctx.fill(); }, { blur: 4, y: 1 });
    ctx.fillStyle = '#fcd34d'; ctx.fillRect(x - 22, y - 12, 4, 24);
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 2, y); ctx.stroke();
  }
  function drawDamper(x, y) {
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y); ctx.stroke();
    D.shadow(() => { D.roundRect(x + 12, y - 14, 28, 28, 5); const g = ctx.createLinearGradient(0, y - 14, 0, y + 14); g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#8a97ab'); ctx.fillStyle = g; ctx.fill(); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); [20, 26, 32].forEach((dx) => { ctx.moveTo(x + dx, y - 8); ctx.lineTo(x + dx, y + 8); }); ctx.stroke();
    T(x + 26, y + 31, '흡수 끝', 13, MUTED, 'center', 800);
  }
  function drawWall(x, y) {
    D.shadow(() => { ctx.fillStyle = '#475569'; ctx.fillRect(x + 4, y - 56, 12, 112); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    for (let k = -50; k <= 50; k += 14) { ctx.beginPath(); ctx.moveTo(x + 16, y + k); ctx.lineTo(x + 24, y + k + 8); ctx.stroke(); }
    T(x + 14, y + 74, '벽 (고정단)', 13, MUTED, 'center', 800);
  }
  function drawFreeEnd(x, y) {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x - 2.5, y - 56, 5, 112);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.fillRect(x - 12, y - 60, 24, 5); ctx.fillRect(x - 12, y + 55, 24, 5);
    T(x + 4, y + 82, '막대에 걸린 고리 (자유단)', 13, MUTED, 'center', 800);
  }
  /* 줄 그래프. o: {boundary, kind} */
  function stringFrame(c, sc, o) {
    const rc = { x: c.x + 8, y: c.y + 40, w: c.w - 16, h: c.h - 50 };
    const M = frame(rc, { x0: 0, x1: 12, y0: -8, y1: 8, xt: [0, 2, 4, 6, 8, 10, 12], xminor: [1, 3, 5, 7, 9, 11], yt: [-6, 0, 6], yf: (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v), ml: PHONE ? 44 : 52, mr: 62, mt: 14, mb: 28 });
    T(M.ix + M.iw + 10, M.iy + M.ih + 20, 'x (m)', 13, MUTED, 'left', 700); T(rc.x + 8, rc.y + 14, 'y (cm)', 13, MUTED, 'left', 700);
    const ch = sc.ch;
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
    const seg = (i0, i1, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = i0; i <= i1; i++) { const x = M.gx(i * ch.a), y = M.gy(cm(clamp(ch.y[i], -0.078, 0.078))); i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
    if (o.boundary) {
      const nb = Math.round(XB / ch.a), lh = sc.kind === 'LH';
      ctx.fillStyle = 'rgba(37,99,235,.06)'; ctx.fillRect(M.gx(0), M.iy, M.gx(XB) - M.gx(0), M.ih); ctx.fillStyle = 'rgba(245,158,11,.10)'; ctx.fillRect(M.gx(XB), M.iy, M.gx(12) - M.gx(XB), M.ih);
      seg(0, nb, lh ? '#2563eb' : '#b45309', lh ? 2.6 : 6.5); seg(nb, ch.n, lh ? '#b45309' : '#2563eb', lh ? 6.5 : 2.6);
    } else seg(0, ch.n, BLUE, 3.6);
    ctx.restore();
    return { M, rc };
  }
  function sensorMark(M, sc, p, label, col) {
    const x = M.gx(p.x), y = M.gy(cm(clamp(sc.ch.y[p.idx], -0.078, 0.078)));
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, M.iy + 20); ctx.lineTo(x, M.iy + M.ih); ctx.stroke(); ctx.restore();
    D.sphere(x, y, 6.5, col, { gloss: true });
    D.label(x, M.iy + 12, label, { bg: col, size: 13 });
  }
  /* 시간 그래프 (센서) */
  function scope(rc, p, col, label, twin, showT) {
    const xt = []; for (let s = 0; s <= twin + 1e-9; s += twin > 1 ? 0.5 : 0.25) xt.push(+s.toFixed(2));
    const M = frame(rc, { x0: 0, x1: twin, y0: -8, y1: 8, xt, yt: [-6, 0, 6], yf: (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v), xf: (v) => v.toFixed(1), xl: showT, mt: 8, mb: showT ? 24 : 6, ml: PHONE ? 46 : 50, mr: 8 });
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4);
    ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); let st = false;
    p.series.forEach((q) => { const x = M.gx(q[0]), y = M.gy(cm(clamp(q[1], -0.078, 0.078))); st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; });
    ctx.stroke(); ctx.restore();
    T(M.ix + 6, rc.y + 17, label, 13, col, 'left', 800);
    if (showT) T(rc.x + rc.w - 8, rc.y + 17, 't (s)', 13, MUTED, 'right', 700);
    return M;
  }

  /* ================= ① 끝에서 반사 ================= */
  function drawEndScene() {
    const c = topCard(), sc = S.sc, fixed = S.end.kind === 'fixed'; cardBegin(c);
    T(c.x + 14, c.y + 24, fixed ? '줄의 오른쪽 끝이 벽에 고정되어 있어요 (고정단)' : '줄의 오른쪽 끝이 막대에 걸린 고리예요 (자유단)', PHONE ? 13.5 : 15, fixed ? '#1d4ed8' : '#c2410c', 'left', 800);
    const { M } = stringFrame(c, sc, {});
    const yEnd = M.gy(cm(clamp(sc.ch.y[sc.ch.n], -0.078, 0.078)));
    drawHand(M.ix + 18, M.gy(cm(sc.ch.y[0])));
    if (fixed) drawWall(M.ix + M.iw - 2, M.gy(0)); else drawFreeEnd(M.ix + M.iw + 6, yEnd);
    sensorMark(M, sc, sc.pA, '센서 A', TEAL);
    const d = sc.drv; if (d.kind === 'wave') T(c.x + c.w - 14, c.y + 24, '〰 연속파 5 Hz: 입사파와 반사파가 겹쳐요', 13, TEAL, 'right', 800);
    D.label(c.x + 14, c.y + c.h - 14, '🐢 슬로 모션 ×' + (S.ts === 0.25 ? '1/4' : '1/10') + ' · t = ' + fx(sc.ch.t, 2) + ' s', { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470;
    T(x1, PY + 24, '📈 센서 A의 변위–시간 그래프 (입사 후 반사)', 14, INK, 'left', 800);
    const M2 = scope({ x: x1, y: PY + 34, w: gw, h: PHONE ? 150 : 150 }, sc.pA, TEAL, 'A: x = ' + XA + ' m', 1.4, true);
    const inc = sc.pA.segs[0], rf = sc.pA.segs[1];
    [inc, rf].forEach((sg, i) => { if (sg) { D.sphere(M2.gx(sg.t), M2.gy(cm(sg.peak)), 5.5, i ? ORANGE : TEAL, { gloss: false }); D.label(M2.gx(sg.t), M2.gy(cm(sg.peak)) + (sg.peak > 0 ? -16 : 18), (i ? '반사 ' : '입사 ') + sgn(sg.peak) + ' cm', { bg: i ? ORANGE : TEAL, size: 13 }); } });
    const bx = PHONE ? x1 : x1 + gw + 14, by = PHONE ? PY + 34 + 160 : PY + 14, bw = PHONE ? PW - 24 : PW - gw - 38, bh = PHONE ? PH - 34 - 170 : PH - 28;
    D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(bx + 12, by + 26, '🔎 반사된 펄스', 14, INK, 'left', 800);
    const rows = [['고정단', S.end.seen.fixed], ['자유단', S.end.seen.free]];
    rows.forEach((r, i) => {
      const yy = by + 54 + i * 26, k = i ? 'free' : 'fixed', sg = k === S.end.kind && sc.pA.segs[1] ? sc.pA.segs[1] : null;
      T(bx + 12, yy, r[0] + ':', 14, INK, 'left', 800);
      T(bx + 80, yy, r[1] ? (k === 'fixed' ? '뒤집혀서 돌아와요' : '그대로 돌아와요') : '아직 안 봤어요', 13.5, r[1] ? (k === 'fixed' ? '#1d4ed8' : '#c2410c') : '#9aa6bd', 'left', 800);
      void sg;
    });
    para(bx + 12, by + 54 + 2 * 26 + 8, '고정단에서는 벽이 줄에 반대 방향 힘을 줘서 위상이 반대(π)가 되고, 자유단에서는 위상이 그대로예요.', bw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ================= ② 경계 통과 ================= */
  function drawBdScene() {
    const c = topCard(), sc = S.sc, lh = sc.kind === 'LH'; cardBegin(c);
    T(c.x + 14, c.y + 24, lh ? '가벼운 줄 → 무거운 줄' : '무거운 줄 → 가벼운 줄', PHONE ? 13.5 : 15, INK, 'left', 800);
    const { M } = stringFrame(c, sc, { boundary: true });
    drawHand(M.ix + 18, M.gy(cm(sc.ch.y[0]))); drawDamper(M.ix + M.iw + 4, M.gy(cm(clamp(sc.ch.y[sc.ch.n], -0.078, 0.078))));
    ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(M.gx(XB), M.iy + 24); ctx.lineTo(M.gx(XB), M.iy + M.ih); ctx.stroke(); ctx.restore();
    D.label(M.gx(XB), M.iy + 12, '경계', { bg: '#16a34a', size: 13 });
    T(M.gx(3), M.iy + M.ih - 10, (lh ? '가벼운 줄' : '무거운 줄') + ': v₁ = ' + (lh ? v1 : v2) + ' m/s', 13.5, lh ? '#1d4ed8' : '#b45309', 'center', 800);
    T(M.gx(9), M.iy + M.ih - 10, (lh ? '무거운 줄' : '가벼운 줄') + ': v₂ = ' + (lh ? v2 : v1) + ' m/s', 13.5, lh ? '#b45309' : '#1d4ed8', 'center', 800);
    sensorMark(M, sc, sc.pA, '센서 A', TEAL); sensorMark(M, sc, sc.pB, '센서 B', PURPLE);
    const d = sc.drv; if (d.kind === 'wave') T(c.x + c.w - 14, c.y + 24, '〰 연속파 f = 20 Hz', 13, TEAL, 'right', 800);
    D.label(c.x + 14, c.y + c.h - 14, '🐢 슬로 모션 ×' + (S.ts === 0.25 ? '1/4' : '1/10') + ' · t = ' + fx(sc.ch.t, 2) + ' s', { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 400, gh = PHONE ? 62 : 70;
    T(x1, PY + 22, '📈 센서의 변위–시간 그래프', 14, INK, 'left', 800);
    const twin = 1.6;
    const MA = scope({ x: x1, y: PY + 30, w: gw, h: gh }, sc.pA, TEAL, 'A: x = ' + XA + ' m (경계 왼쪽)', twin, false);
    const MB = scope({ x: x1, y: PY + 30 + gh + 6, w: gw, h: gh }, sc.pB, PURPLE, 'B: x = ' + XBP + ' m (경계 오른쪽)', twin, true);
    [[sc.pA.segs, MA, [TEAL, ORANGE]], [sc.pB.segs, MB, [PURPLE]]].forEach(([sg, Mx, cols]) => sg.forEach((s2, i) => D.sphere(Mx.gx(s2.t), Mx.gy(cm(s2.peak)), 5.5, cols[i] || ORANGE, { gloss: false })));
    // 측정 표
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 30 + 2 * gh + 40 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34;
    D.roundRect(tx, ty, tw, PHONE ? PH - (30 + 2 * gh + 50) : PH - 24, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 10, ty + 22, '📋 진폭 측정 (cm)', 14, INK, 'left', 800);
    const cx = [tx + 10, tx + 56, tx + 106, tx + 156];
    ['방향', '입사', '반사', '투과'].forEach((h, i) => T(cx[i], ty + 46, h, 13, MUTED, 'left', 800));
    [['LH', '가→무'], ['HL', '무→가']].forEach((r, i) => {
      const yy = ty + 72 + i * 24, rs = S.bd.res[r[0]];
      T(cx[0], yy, r[1], 13.5, INK, 'left', 800);
      if (rs) { T(cx[1], yy, sgn(rs.inc), 13.5, TEAL, 'left', 800); T(cx[2], yy, sgn(rs.refl), 13.5, ORANGE, 'left', 800); T(cx[3], yy, sgn(rs.trans), 13.5, PURPLE, 'left', 800); } else T(cx[1], yy, '—', 13.5, '#9aa6bd', 'left', 800);
    });
    const rc2 = S.bd.res[S.bd.dir];
    if (rc2 && rc2.E) {
      const yy = ty + 130;
      T(tx + 10, yy, '에너지 몫 (측정)', 13, INK, 'left', 800);
      const bw2 = tw - 20, bx2 = tx + 10, pr = Math.round(rc2.E.refl * 100), pt = Math.round(rc2.E.trans * 100);
      D.roundRect(bx2, yy + 8, bw2, 18, 9); ctx.fillStyle = '#e8edf6'; ctx.fill();
      ctx.save(); D.roundRect(bx2, yy + 8, bw2, 18, 9); ctx.clip(); ctx.fillStyle = ORANGE; ctx.fillRect(bx2, yy + 8, bw2 * rc2.E.refl, 18); ctx.fillStyle = PURPLE; ctx.fillRect(bx2 + bw2 * rc2.E.refl, yy + 8, bw2 * rc2.E.trans, 18); ctx.restore();
      T(bx2, yy + 46, '반사 ' + pr + '%', 13, '#b45309', 'left', 800); T(bx2 + bw2, yy + 46, '투과 ' + pt + '%', 13, '#6d28d9', 'right', 800);
    }
    if (!PHONE && !(rc2 && rc2.E)) para(tx + 10, ty + 134, '진폭은 입사 +6.0 cm를 기준으로 비교해요.', tw - 20, 13.5, MUTED, 19, 700);
    if (!PHONE && rc2 && rc2.E) para(tx + 10, ty + 186, '투과파 진폭이 입사파보다 커도 에너지는 늘지 않아요. 반사 + 투과 = 100 %예요.', tw - 20, 13.5, '#14532d', 19, 700);
  }

  /* ================= ③ 에코 거리 ================= */
  const SCEN = {
    A: { v: 1500, lay: [{ d: 1500, s: 1, name: '바다 밑바닥' }], tmax: 4.0, k: 1, bat: false },
    B: { v: 1500, lay: [{ d: 750, s: 0.55, name: '물고기 떼' }, { d: 1200, s: 1, name: '바다 밑바닥' }], tmax: 4.0, k: 1, bat: false },
    bat: { v: 340, lay: [{ d: 3.4, s: 1, name: '벽' }], tmax: 0.04, k: 0.01, bat: true },
  };
  const echoT = (sc, i) => 2 * sc.lay[i].d / sc.v;
  function beamArcs(sx, sy, ux, uy, ppm, dpx, R, back, col) {
    // back=false: 보내는 파면(중심 = 소나), back=true: 되돌아오는 파면(중심 = 거울상, 2d만큼 떨어진 점)
    const cx = back ? sx + ux * 2 * dpx : sx, cy = back ? sy + uy * 2 * dpx : sy;
    const ang = Math.atan2(uy, ux) + (back ? Math.PI : 0);
    ctx.save(); ctx.beginPath();
    if (uy) ctx.rect(sx - 400, sy, 800, dpx); else ctx.rect(sx, sy - 400, dpx, 800);
    ctx.clip(); ctx.lineCap = 'round';
    [0, 1, 2].forEach((i) => { const r = R - i * 9; if (r < 6) return; ctx.strokeStyle = col; ctx.globalAlpha = [0.95, 0.6, 0.32][i]; ctx.lineWidth = 3.4 - i * 0.7; ctx.beginPath(); ctx.arc(cx, cy, r, ang - 0.7, ang + 0.7); ctx.stroke(); });
    ctx.restore();
  }
  function drawEchoScene() {
    const c = topCard(), sc = SCEN[S.echo.scen], run = S.echo.run, tt = run ? run.t : 0; cardBegin(c);
    const bat = sc.bat, vt = sc.v * tt;
    T(c.x + 14, c.y + 24, bat ? '🦇 박쥐가 초음파를 내고 에코로 벽까지의 거리를 알아요 (공기 중 340 m/s)' : S.echo.scen === 'A' ? '🚢 소나로 바다 깊이를 재요 (바닷물 속 소리 1500 m/s)' : '🚢 소나에 에코가 두 번 돌아와요 (바닷물 속 소리 1500 m/s)', PHONE ? 13 : 15, INK, 'left', 800);
    let sx, sy, ux, uy, ppm, lw;
    if (!bat) {
      const y0 = c.y + 64, bot = c.y + c.h - 14; ppm = (bot - y0) / 1550; sx = c.x + 96; sy = y0; ux = 0; uy = 1;
      const g = ctx.createLinearGradient(0, y0, 0, bot); g.addColorStop(0, '#8fd0f2'); g.addColorStop(1, '#1c5d8f'); ctx.fillStyle = g; ctx.fillRect(c.x, y0, c.w, bot - y0);
      ctx.fillStyle = '#e9f5fc'; ctx.fillRect(c.x, c.y + 36, c.w, y0 - c.y - 36);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = c.x; x <= c.x + c.w; x += 8) { const y = y0 + Math.sin(x / 14 + S.clock * 2) * 2.4; x === c.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      const floor = sc.lay[sc.lay.length - 1].d; const fy = y0 + floor * ppm;
      ctx.fillStyle = '#8a6a43'; ctx.beginPath(); ctx.moveTo(c.x, fy); for (let x = c.x; x <= c.x + c.w; x += 12) ctx.lineTo(x, fy + Math.sin(x / 40) * 3); ctx.lineTo(c.x + c.w, bot + 14); ctx.lineTo(c.x, bot + 14); ctx.closePath(); ctx.fill();
      T(c.x + c.w - 96, fy + 22, '바다 밑바닥', 13, '#f3e3c6', 'right', 800);
      sc.lay.forEach((ly) => { if (ly.name === '물고기 떼') { const yy = y0 + ly.d * ppm; [[-44, 0], [0, 0], [44, 0], [-22, 20], [22, 20]].forEach(([dx, dy]) => T(sx + dx, yy + dy + 6, '🐟', 20, '#fff', 'center', 700)); T(sx + 76, yy + 6, '물고기 떼 (' + ly.d + ' m)', 13, '#fff', 'left', 800, { stroke: 'rgba(0,50,90,.6)', strokeWidth: 3 }); } });
      T(sx, y0 - 8, '🚢', 40, '#000', 'center', 700);
      // 깊이 눈금
      const rx = c.x + c.w - 24;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y0 + 1500 * ppm); ctx.stroke();
      [0, 500, 1000, 1500].forEach((dm) => { const yy = y0 + dm * ppm; ctx.beginPath(); ctx.moveTo(rx - 5, yy); ctx.lineTo(rx + 5, yy); ctx.stroke(); T(rx - 9, yy + 5, dm + ' m', 13, '#fff', 'right', 800, { stroke: 'rgba(0,50,90,.55)', strokeWidth: 3 }); });
      // 빔
      ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
      [-0.7, 0.7].forEach((a) => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(a) * 400, sy + Math.cos(a) * 400); ctx.stroke(); }); ctx.restore();
      lw = floor;
    } else {
      const cy0 = c.y + c.h * 0.55; ppm = (c.w - 190) / 3.4; sx = c.x + 96; sy = cy0; ux = 1; uy = 0; const wx = sx + 3.4 * ppm;
      ctx.fillStyle = '#f2f6fb'; ctx.fillRect(c.x, c.y + 40, c.w, c.h - 40);
      D.shadow(() => { ctx.fillStyle = '#7c8aa0'; ctx.fillRect(wx, cy0 - 90, 18, 180); }, { blur: 5, y: 1 });
      ctx.strokeStyle = '#a5b1c4'; ctx.lineWidth = 2; for (let k = -80; k <= 80; k += 16) { ctx.beginPath(); ctx.moveTo(wx + 18, cy0 + k); ctx.lineTo(wx + 28, cy0 + k + 10); ctx.stroke(); }
      T(wx + 9, cy0 + 112, '벽', 13, MUTED, 'center', 800);
      T(sx - 8, cy0 + 10, '🦇', 44, '#000', 'center', 700);
      const ry = cy0 + 70; ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, ry); ctx.lineTo(wx, ry); ctx.stroke();
      [0, 1, 2, 3].forEach((m) => { const x = sx + m * ppm; ctx.beginPath(); ctx.moveTo(x, ry - 4); ctx.lineTo(x, ry + 4); ctx.stroke(); T(x, ry + 19, m + ' m', 13, '#3a465c', 'center', 800); });
      ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.5;
      [-0.7, 0.7].forEach((a) => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 3.4 * ppm * 1.2, sy + Math.sin(a) * 3.4 * ppm * 1.2); ctx.stroke(); }); ctx.restore();
      lw = 3.4;
    }
    // 파면
    if (run) {
      const R = vt * ppm, dpx = lw * ppm;
      if (vt < lw) beamArcs(sx, sy, ux, uy, ppm, dpx, R, false, '#ffffff');
      sc.lay.forEach((ly, li) => {
        const dpl = ly.d * ppm;
        if (vt >= ly.d && vt <= 2 * ly.d) { ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * ly.s; beamArcs(sx, sy, ux, uy, ppm, dpl, R, true, '#ff9d2e'); ctx.restore(); }
        if ((tt >= 2 * ly.d / sc.v && tt < 2 * ly.d / sc.v + 0.3 * sc.k) || (run.done && li === sc.lay.length - 1)) D.ring(sx + ux * 4, sy + uy * 4, 24, S.clock, { color: '#f59e0b' });
      });
    }
    // 스톱워치
    const sw = bat ? fx(tt * 1000, 1) + ' ms' : fx(tt, 2) + ' s';
    const bx = c.x + (PHONE ? c.w - 130 : c.w - 150), by = c.y + 38;
    D.roundRect(bx, by, 118, 50, 12); ctx.fillStyle = '#1e293b'; ctx.fill();
    T(bx + 59, by + 20, '⏱ 경과 시간', 13, '#94a3b8', 'center', 800); T(bx + 59, by + 42, sw, 19, run && run.done ? '#4ade80' : '#fff', 'center', 800);
    if (bat) D.label(c.x + 14, c.y + c.h - 14, '시간을 100배 느리게 보여 줘요', { bg: '#475569', size: 13, align: 'left' });
    ctx.restore();
    // 아래 칸: 에코 그래프
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 150 : 158;
    T(x1, PY + 24, '📡 신호와 에코 (센서에 받은 소리의 세기)', 14, INK, 'left', 800);
    const tmaxd = bat ? 40 : sc.tmax, xt = []; for (let s = 0; s <= tmaxd + 1e-9; s += bat ? 10 : 1) xt.push(s);
    const M = frame({ x: x1, y: PY + 34, w: gw, h: gh }, { x0: 0, x1: tmaxd, y0: 0, y1: 1.25, xt, yt: [0, 1], xf: (v) => String(v), yf: (v) => (v ? '세기' : '0'), mt: 22, mb: 26, ml: PHONE ? 44 : 50, mr: 12 });
    T(M.ix + M.iw, M.iy + M.ih + 22, bat ? 't (ms)' : 't (s)', 13, MUTED, 'right', 700);
    const spike = (tv, a, col, lab) => { const px = M.gx(tv), top = M.gy(a); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, M.gy(0)); ctx.lineTo(px, top); ctx.stroke(); D.label(px + (px > M.ix + M.iw - 50 ? -34 : 30), top + 4, lab, { bg: col, size: 13 }); };
    spike(0, 1.0, BLUE, '신호');
    sc.lay.forEach((ly, i) => { const te = echoT(sc, i); if (run && tt >= te - 1e-9) spike(bat ? te * 1000 : te, ly.s, ORANGE, '에코 ' + (bat ? fx(te * 1000, 1) + ' ms' : fx(te, 2) + ' s')); });
    if (run) { const px = M.gx(bat ? tt * 1000 : tt); ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, M.iy); ctx.lineTo(px, M.gy(0)); ctx.stroke(); ctx.setLineDash([]); }
    else T(M.ix + M.iw / 2, M.iy + M.ih / 2, '📡 신호를 보내면 에코가 돌아와요', 14, MUTED, 'center', 700);
    // 계산 칸
    const bx2 = PHONE ? x1 : x1 + gw + 14, by2 = PHONE ? PY + 34 + gh + 8 : PY + 14, bw = PHONE ? PW - 24 : PW - gw - 38, bh = PHONE ? PH - gh - 52 : PH - 28;
    D.roundRect(bx2, by2, bw, bh, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(bx2 + 12, by2 + 26, '🧮 거리 계산', 14, INK, 'left', 800);
    T(bx2 + 12, by2 + 52, '소리 속력 v = ' + sc.v + ' m/s', 13.5, INK, 'left', 800);
    sc.lay.forEach((ly, i) => {
      const te = echoT(sc, i), got = run && tt >= te - 1e-9, yy = by2 + 78 + i * 46;
      T(bx2 + 12, yy, ly.name + ' 에코 시간 t = ' + (got ? (bat ? fx(te * 1000, 1) + ' ms' : fx(te, 2) + ' s') : '?'), 13.5, got ? '#c2410c' : MUTED, 'left', 800);
      T(bx2 + 12, yy + 22, 'd = v t / 2 = ' + (got && revealed('echoOK') ? fm(sc.v * te / 2) + (bat ? ' m' : ' m') : '?'), 13.5, got && revealed('echoOK') ? '#14753f' : MUTED, 'left', 800);
    });
  }
  const fm = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(1));

  /* ================= ④ 초음파 활용 ================= */
  const V_TIS = 1540, V_STL = 5900, FQ = [2, 3.5, 7];
  const PPC = 24, IMGN = 41, IMGH = 100;
  const ORG = { xc: 4.0, zc: 6.5, R: 1.5 }, CYST = { xc: 6.4, zc: 3.2, R: 0.7 };
  const GAIN = 8;
  function boundsAt(x) {
    const b = [{ z: 0.1, s: S.us.gel ? 0.05 : 0.999, nm: '피부 표면' }, { z: 0.6, s: 0.22, nm: '지방층 경계' }, { z: 1.5, s: 0.32, nm: '근육 경계' }];
    [[ORG, 0.85, 0.5, '장기 윗면', '장기 아랫면'], [CYST, 0.6, 0.4, '물혹 윗면', '물혹 아랫면']].forEach(([o, st, sb, nt, nb]) => {
      const dx = x - o.xc; if (Math.abs(dx) < o.R) { const q = Math.sqrt(o.R * o.R - dx * dx); b.push({ z: o.zc - q, s: st, nm: nt }, { z: o.zc + q, s: sb, nm: nb }); }
    });
    return b;
  }
  const usAmp = (bk, f) => bk.s * Math.pow(10, -f * bk.z / 20) * GAIN * (bk.z > 0.2 && !S.us.gel ? 0.0015 : 1);
  function usEchoes(x) {
    const f = FQ[S.us.fi]; const out = [];
    boundsAt(x).forEach((bk) => { const a = Math.min(1, usAmp(bk, f)); if (a > 0.04) out.push({ z: bk.z, t: 2 * bk.z / 100 / V_TIS * 1e6, a, nm: bk.nm }); });
    return out;
  }
  const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  let usCv = null, usDirty = true;
  function renderUs() {
    if (!usCv) { usCv = document.createElement('canvas'); usCv.width = IMGN; usCv.height = IMGH; }
    const g = usCv.getContext('2d'), im = g.createImageData(IMGN, IMGH), f = FQ[S.us.fi];
    const sig = Math.max(0.05, 2.5 * (V_TIS / (f * 1e6)) * 100);       // 분해능(cm): 파장 λ에 비례
    for (let xi = 0; xi < IMGN; xi++) {
      if (!S.us.scan[xi]) { for (let zi = 0; zi < IMGH; zi++) { const o = (zi * IMGN + xi) * 4; im.data[o] = 11; im.data[o + 1] = 18; im.data[o + 2] = 32; im.data[o + 3] = 255; } continue; }
      const bs = boundsAt(xi * 0.2).map((bk) => ({ z: bk.z, a: usAmp(bk, f) }));
      for (let zi = 0; zi < IMGH; zi++) {
        const z = (zi + 0.5) * 0.1; let v = 0;
        bs.forEach((bk) => { const d = (z - bk.z) / sig; if (Math.abs(d) < 4) v += bk.a * Math.exp(-0.5 * d * d); });
        const tissue = (S.us.gel ? 1 : 0.0015) * Math.pow(10, -f * z / 20) * GAIN * 0.12 * (0.4 + hash2(xi, zi));
        v = Math.min(1, v + tissue); const gr = Math.round(255 * Math.pow(v, 0.8)), o = (zi * IMGN + xi) * 4;
        im.data[o] = gr; im.data[o + 1] = gr; im.data[o + 2] = Math.min(255, gr + 16); im.data[o + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0); usDirty = false;
  }
  function usMark(x) { S.us.scan[Math.round(x / 0.2)] = true; usDirty = true; }
  function pingDots(ox, oy, ppcv, zlist, vms, run, maxZ) {
    // 보내는 펄스(파란 점)와 경계에서 되돌아오는 에코(주황 점)
    const zc = vms * run * 100;             // cm
    if (zc <= maxZ + 0.5) D.sphere(ox, oy + zc * ppcv, 6, '#2563eb', { gloss: false, shadow: true });
    zlist.forEach((e) => { const z = 2 * e.z - zc; if (zc >= e.z && z >= 0) { ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * e.a; D.sphere(ox, oy + z * ppcv, 5.5, '#f59e0b', { gloss: false }); ctx.restore(); } });
  }
  function aScan(rc, echoes, tmax, tick, colr, cur, runT, label, unit) {
    const xt = []; for (let s = 0; s <= tmax + 1e-9; s += tick) xt.push(s);
    const M = frame(rc, { x0: 0, x1: tmax, y0: 0, y1: 1.2, xt, yt: [0], yf: () => '0', xf: (v) => String(v), mt: 22, mb: 26, ml: PHONE ? 30 : 36, mr: 12 });
    T(rc.x + 8, rc.y + 17, label, 13.5, INK, 'left', 800); T(M.ix + M.iw, M.iy + M.ih + 22, 't (' + unit + ')', 13, MUTED, 'right', 700);
    const sp = (t2, a, col) => { ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(M.gx(t2), M.gy(0)); ctx.lineTo(M.gx(t2), M.gy(a)); ctx.stroke(); };
    sp(0, 1.0, BLUE); D.label(M.gx(0) + 30, M.gy(1.0) + 2, '송신', { bg: BLUE, size: 13 });
    echoes.forEach((e) => { if (runT != null && e.t > runT) return; sp(e.t, e.a, colr); });
    if (cur != null) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.gx(cur), M.iy); ctx.lineTo(M.gx(cur), M.gy(0)); ctx.stroke(); ctx.restore(); }
    return M;
  }
  function drawImgScene() {
    const c = topCard(), u = S.us, f = FQ[u.fi], x = u.pos * 0.2; cardBegin(c);
    T(c.x + 14, c.y + 24, '🩺 초음파 영상: 탐촉자가 보낸 소리의 에코로 몸속을 봐요', PHONE ? 13 : 15, INK, 'left', 800);
    const W = 8 * PPC, H = 10 * PPC, ox = c.x + (PHONE ? 12 : 20), oy = c.y + 82, bx = ox + W + 38;
    // 몸 단면
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip();
    ctx.fillStyle = '#f2c4a0'; ctx.fillRect(ox, oy, W, 0.6 * PPC); ctx.fillStyle = '#f7de9c'; ctx.fillRect(ox, oy + 0.6 * PPC, W, 0.9 * PPC);
    const gm = ctx.createLinearGradient(0, oy + 1.5 * PPC, 0, oy + H); gm.addColorStop(0, '#e08a8a'); gm.addColorStop(1, '#b85c64'); ctx.fillStyle = gm; ctx.fillRect(ox, oy + 1.5 * PPC, W, H);
    [[ORG, '#9a5aa5', '장기'], [CYST, '#7fb4e8', '물혹']].forEach(([o, col, nm]) => { D.sphere(ox + o.xc * PPC, oy + o.zc * PPC, o.R * PPC, col, { gloss: false }); T(ox + o.xc * PPC, oy + o.zc * PPC + 5, nm, 13, '#fff', 'center', 800); });
    ctx.restore();
    ctx.strokeStyle = '#8a6a55'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, W, H);
    // 탐촉자와 젤
    const px = ox + x * PPC;
    if (u.gel) { ctx.fillStyle = 'rgba(125,211,252,.85)'; ctx.beginPath(); ctx.ellipse(px, oy - 3, 24, 7, 0, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(px - 20, oy - 8, 40, 7); T(px + 40, oy - 7, '공기', 13, '#64748b', 'left', 800); }
    D.shadow(() => { D.roundRect(px - 20, oy - 40, 40, 32, 7); const gp = ctx.createLinearGradient(0, oy - 40, 0, oy - 8); gp.addColorStop(0, '#475569'); gp.addColorStop(1, '#1e293b'); ctx.fillStyle = gp; ctx.fill(); }, { blur: 5, y: 2 });
    T(px, oy - 20, '탐촉자', 13, '#e2e8f0', 'center', 800);
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(37,99,235,.6)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + H); ctx.stroke(); ctx.restore();
    const ping = u.ping, echoes = usEchoes(x);
    if (ping) { ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip(); pingDots(px, oy, PPC, echoes, V_TIS, ping.t * 1e-6, 10); ctx.restore(); }
    // 깊이 눈금
    [0, 2, 4, 6, 8, 10].forEach((z) => { T(ox + W + 6, oy + z * PPC + 5, z + '', 13, '#3a465c', 'left', 800); });
    T(ox + W + 6, oy - 6, 'cm', 13, MUTED, 'left', 700);
    // B-모드 화면
    if (usDirty) renderUs();
    ctx.save(); D.roundRect(bx, oy, W, H, 6); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(usCv, 0, 0, IMGN, IMGH, bx, oy, W, H); ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; D.roundRect(bx, oy, W, H, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(34,211,238,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + x / 8 * W, oy); ctx.lineTo(bx + x / 8 * W, oy + H); ctx.stroke();
    T(bx + W / 2, oy - 8, 'B-모드 화면 (밝기 = 에코 세기)', 13, INK, 'center', 800);
    if (!Object.keys(u.scan).length) T(bx + W / 2, oy + H / 2, '탐촉자를 움직이며 스캔해요', 13, '#94a3b8', 'center', 800);
    S.hit = { x: px - 24, y: oy - 44, w: 48, h: 40, ox, ppc: PPC, W, kind: 'img' };
    if (!PHONE) {
      const ix = bx + W + 22, iw = c.x + c.w - ix - 12; D.roundRect(ix, oy - 18, iw, H + 18, 12); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
      T(ix + 12, oy + 8, '🧴 젤: ' + (u.gel ? '바름' : '안 바름'), 14, u.gel ? '#14753f' : RED, 'left', 800);
      para(ix + 12, oy + 34, u.gel ? '공기가 없어서 초음파가 몸속으로 들어가요.' : '공기와 피부 경계에서 약 99.9 %가 반사돼요. 영상이 거의 안 나와요.', iw - 24, 13.5, INK, 19, 700);
      T(ix + 12, oy + 98, '📡 진동수 ' + f + ' MHz', 14, INK, 'left', 800);
      T(ix + 12, oy + 122, 'λ = v / f = ' + fx(V_TIS / (f * 1e6) * 1000, 2) + ' mm', 14, '#1d4ed8', 'left', 800);
      para(ix + 12, oy + 148, f >= 7 ? '높은 진동수: 작은 구조가 선명하지만 얕은 곳만 보여요.' : f <= 2 ? '낮은 진동수: 깊은 곳까지 보이지만 덜 선명해요.' : '중간 진동수: 선명함과 깊이의 균형이 좋아요.', iw - 24, 13.5, '#c2410c', 19, 700);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 140 : PH - 24;
    const runT = ping ? ping.t : null;
    const M = aScan({ x: x1, y: PY + 10, w: gw, h: gh }, echoes, 130, 20, ORANGE, null, runT, '📈 에코 그래프 (탐촉자 아래 한 줄)', 'μs');
    echoes.forEach((e) => { if (runT != null && e.t > runT) return; if (e.a > 0.12 && e.z > 0.2) D.label(M.gx(e.t) + (M.gx(e.t) > M.ix + M.iw - 60 ? -34 : 30), M.gy(e.a) + 2, fx(e.t, 0) + ' μs', { bg: '#c2410c', size: 13 }); });
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 10 + gh + 8 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34;
    D.roundRect(tx, ty, tw, PHONE ? PH - gh - 28 : PH - 24, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '🔊 되돌아온 에코', 14, INK, 'left', 800);
    const list = echoes.filter((e) => e.z > 0.2).slice(0, 5);
    if (!list.length) T(tx + 12, ty + 52, u.gel ? '에코가 없어요' : '몸속 에코가 거의 없어요', 13.5, MUTED, 'left', 700);
    list.forEach((e, i) => { const got = runT == null || e.t <= runT; T(tx + 12, ty + 52 + i * 24, e.nm + ' ' + (got ? fx(e.t, 0) + ' μs' : '…'), 13.5, got ? '#c2410c' : '#9aa6bd', 'left', 800); });
    para(tx + 12, ty + 52 + Math.max(1, list.length) * 24 + 6, '소리 속력 1540 m/s로 에코 시간에서 깊이를 구해요 (d = v t / 2).', tw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ----- 비파괴 검사 (강철 판) ----- */
  const CRK = { x0: 8.5, x1: 11.5, z: 3.0 }, PLT = { w: 20, th: 5.0 };
  function ndEchoes(x) {
    const ap = 0.5, ov = Math.max(0, Math.min(x + ap, CRK.x1) - Math.max(x - ap, CRK.x0)) / (2 * ap), out = [];
    if (ov > 0.05) out.push({ z: CRK.z, t: 2 * CRK.z / 100 / V_STL * 1e6, a: 0.9 * ov, nm: '균열', crack: true });
    out.push({ z: PLT.th, t: 2 * PLT.th / 100 / V_STL * 1e6, a: 0.85 * (1 - 0.8 * ov), nm: '아랫면' });
    return out;
  }
  const ndX = () => S.nd.pos * 0.5;
  function drawNdtScene() {
    const c = topCard(), u = S.nd, x = ndX(); cardBegin(c);
    T(c.x + 14, c.y + 24, '🔩 비파괴 검사: 두께 5.0 cm 강철 판 속을 초음파로 살펴요 (강철 속 소리 5900 m/s)', PHONE ? 13 : 15, INK, 'left', 800);
    const ppc = PHONE ? 21.5 : 28, W = PLT.w * ppc, H = PLT.th * ppc, ox = c.x + (c.w - W) / 2, oy = c.y + 110;
    D.shadow(() => { const g = ctx.createLinearGradient(0, oy, 0, oy + H); g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#94a3b8'); ctx.fillStyle = g; ctx.fillRect(ox, oy, W, H); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, W, H);
    for (let k = 1; k < 20; k++) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox + k * ppc, oy); ctx.lineTo(ox + k * ppc, oy + H); ctx.stroke(); }
    // 눈금
    for (let m = 0; m <= 20; m += 5) { T(ox + m * ppc, oy + H + 20, m + '', 13, '#3a465c', 'center', 800); } T(ox + W + 8, oy + H + 20, 'cm', 13, MUTED, 'left', 700);
    for (let z = 0; z <= 5; z++) T(ox - 8, oy + z * ppc + 5, z + '', 13, '#3a465c', 'right', 800); T(ox - 8, oy - 8, 'cm', 13, MUTED, 'right', 700);
    if (u.found || (game && game.free)) {
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); const cx0 = ox + CRK.x0 * ppc, cx1 = ox + CRK.x1 * ppc, cz = oy + CRK.z * ppc;
      ctx.moveTo(cx0, cz); for (let k = 0; k <= 12; k++) ctx.lineTo(cx0 + (cx1 - cx0) * k / 12, cz + (k % 2 ? -2.6 : 2.6)); for (let k = 12; k >= 0; k--) ctx.lineTo(cx0 + (cx1 - cx0) * k / 12, cz + (k % 2 ? 3.4 : -3.4)); ctx.closePath(); ctx.fill();
      D.label((cx0 + cx1) / 2, cz + 22, '균열', { bg: RED, size: 13 });
    }
    const px = ox + x * ppc;
    ctx.fillStyle = 'rgba(125,211,252,.9)'; ctx.fillRect(px - 20, oy - 5, 40, 5);
    D.shadow(() => { D.roundRect(px - 20, oy - 38, 40, 32, 7); const gp = ctx.createLinearGradient(0, oy - 38, 0, oy - 6); gp.addColorStop(0, '#475569'); gp.addColorStop(1, '#1e293b'); ctx.fillStyle = gp; ctx.fill(); }, { blur: 5, y: 2 });
    T(px, oy - 18, '탐촉자', 13, '#e2e8f0', 'center', 800);
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, oy + H); ctx.stroke(); ctx.restore();
    const ec = ndEchoes(x);
    if (u.ping) { ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip(); pingDots(px, oy, ppc, ec, V_STL, u.ping.t * 1e-6, PLT.th); ctx.restore(); }
    T(c.x + c.w / 2, c.y + c.h - 16, '탐촉자를 좌우로 옮기며 에코 그래프를 살펴요 (슬라이더 또는 탐촉자 끌기)', 13.5, MUTED, 'center', 700);
    S.hit = { x: px - 24, y: oy - 42, w: 48, h: 40, ox, ppc, W };
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 500, gh = PHONE ? 150 : PH - 24;
    const runT = u.ping ? u.ping.t : null;
    const M = aScan({ x: x1, y: PY + 10, w: gw, h: gh }, ec, 20, 5, ORANGE, u.cursor, runT, '📈 에코 그래프 (탐촉자 아래 한 줄)', 'μs');
    ec.forEach((e) => { if (runT != null && e.t > runT) return; if (e.a > 0.1) D.label(M.gx(e.t) + (M.gx(e.t) > M.ix + M.iw - 60 ? -34 : 34), M.gy(e.a) + 2, fx(e.t, 1) + ' μs', { bg: '#c2410c', size: 13 }); });
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 10 + gh + 8 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34;
    D.roundRect(tx, ty, tw, PHONE ? PH - gh - 28 : PH - 24, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '📍 깊이 읽기 (보라색 줄)', 14, INK, 'left', 800);
    const d = V_STL * u.cursor * 1e-6 / 2 * 100;
    T(tx + 12, ty + 52, '시간 t = ' + fx(u.cursor, 1) + ' μs', 14, '#6d28d9', 'left', 800);
    T(tx + 12, ty + 78, 'd = v t / 2 = ' + fx(d, 1) + ' cm', 15, '#6d28d9', 'left', 800);
    const hasC = ec.some((e) => e.crack);
    para(tx + 12, ty + 110, hasC ? '밑면 에코보다 일찍 온 에코가 있어요. 그 에코에 보라색 줄을 맞춰요.' : '밑면(5.0 cm)에서만 에코가 와요. 탐촉자를 옮겨 봐요.', tw - 24, 13.5, hasC ? '#c2410c' : MUTED, 19, 700);
  }

  /* ================= 컨트롤 연결 ================= */
  function updateCtl() {
    const modes = allowedModes(), seen = S.end.seen[S.end.kind];
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false; if (on && c2 === 'judge' && !seen) on = false; if (on && c2 === 'judge2' && !S.bd.res[S.bd.dir]) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    $$('#endSeg button').forEach((b) => b.classList.toggle('on', b.dataset.e === S.end.kind));
    const sc = S.sc, wv = sc && sc.drv.kind === 'wave' && sc.drv.on;
    $('#bWave1').textContent = wv ? '■ 연속파 멈추기' : '〰 연속파 보내기 (5 Hz)'; $('#bWave1').classList.toggle('btn-primary', !!wv);
    $('#bWave2').textContent = wv ? '■ 주기파 멈추기' : '〰 주기파 보내기 (20 Hz)'; $('#bWave2').classList.toggle('btn-primary', !!wv);
    $('#nEnd').textContent = S.end.kind === 'fixed' ? '벽에 고정된 끝이에요. 펄스를 보내고 센서 A가 입사와 반사를 차례로 기록하는 것을 봐요.' : '막대에 걸린 고리가 자유롭게 오르내리는 끝이에요. 펄스를 보내 반사를 살펴요.';
    $$('#bdSeg button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.bd.dir));
    $('#nBd').textContent = '같은 장력 40 N의 줄이에요. 가벼운 줄 v = 20 m/s, 무거운 줄 v = 10 m/s예요.';
    $$('#scenSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.echo.scen));
    { const swp = $('.scen-wrap'); swp.hidden = swp.hidden || !((game && game.free) || S.flags.scenAll); }
    $('#nEcho').textContent = '신호를 보내면 파면이 퍼지고 반사되어 돌아와요. 돌아온 시간이 에코 시간이에요.';
    $('#oPos').textContent = fx(S.us.pos * 0.2, 1) + ' cm'; setSl('sPos', S.us.pos, 0, 40);
    $$('#freqSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.f === S.us.fi));
    $('#bGel').textContent = S.us.gel ? '🧴 젤 바름 (눌러서 닦기)' : '🧴 젤 바르기'; $('#bGel').classList.toggle('btn-primary', !S.us.gel);
    $('#bScan').textContent = S.us.auto ? '■ 스캔 멈추기' : '▶ 자동 스캔'; $('#bScan').classList.toggle('btn-primary', !!S.us.auto);
    $('#nImg').textContent = '탐촉자를 끌거나 슬라이더로 옮기며 B-모드 화면을 채워요. 젤과 진동수를 바꿔 비교해요.';
    $('#oNd').textContent = fx(ndX(), 1) + ' cm'; setSl('sNd', S.nd.pos, 0, 40);
    $('#oCur').textContent = fx(S.nd.cursor, 1) + ' μs'; setSl('sCur', Math.round(S.nd.cursor * 10), 0, 200);
    $('#nNd').textContent = '탐촉자를 옮기며 에코 그래프를 보고, 균열의 에코를 찾으면 보라색 줄로 시간을 읽어 깊이를 구해요.';
    $$('.slow-btn').forEach((b) => { const echo = S.mode === 'echo'; b.textContent = echo ? (S.ts < 1 ? '🐢 보통 속도로' : '🐢 느리게 보기') : (S.ts < 0.25 ? '🐢 조금 빠르게 (×1/4)' : '🐢 더 느리게 (×1/10)'); b.classList.toggle('btn-primary', echo ? S.ts < 1 : S.ts < 0.25); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('.slow-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.mode === 'echo') S.ts = S.ts < 1 ? 1 : 0.5; else S.ts = S.ts < 0.25 ? 0.25 : 0.1; updateCtl(); }));
  const toggleWave = (f) => { Sound.click(); const sc = S.sc, d = sc.drv; if (d.kind === 'wave' && d.on) stopWave(sc); else { sc.ch.y.fill(0); sc.ch.v.fill(0); sc.pA.reset(); sc.pB.reset(); sc.sent = false; sc.busy = false; startWave(sc, f); } updateCtl(); };
  $$('#endSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.end.kind = b.dataset.e; S.sc = buildString(S.end.kind); updateCtl(); }));
  $('#bSend1').addEventListener('click', () => { Sound.click(); const sc = S.sc; if (sc.drv.kind === 'wave') sc.drv = { kind: 'none' }; startPulse(sc); updateCtl(); });
  $('#bWave1').addEventListener('click', () => toggleWave(5));
  $$('#bdSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.bd.dir = b.dataset.d; S.sc = buildString(S.bd.dir); updateCtl(); }));
  $('#bSend2').addEventListener('click', () => { Sound.click(); const sc = S.sc; if (sc.drv.kind === 'wave') sc.drv = { kind: 'none' }; startPulse(sc); updateCtl(); });
  $('#bWave2').addEventListener('click', () => toggleWave(20));
  function judge(k, ch) {
    const sc = S.sc, inc = sc.pA.segs[0], rf = sc.pA.segs[1]; if (!inc || !rf || sc.kind !== k) return null;
    const truth = Math.sign(inc.peak) === Math.sign(rf.peak) ? 'same' : 'inv';
    return { ok: truth === ch, truth };
  }
  [['#bJ1s', 'same'], ['#bJ1i', 'inv']].forEach(([id, ch]) => $(id).addEventListener('click', () => {
    const k = S.end.kind, j = judge(k, ch); if (!j) { showHint('먼저 펄스를 보내서 반사된 펄스를 확인해요.', 2400); return; }
    S.end.tried[k] = ch;
    if (j.ok) { S.end.ok[k] = true; Sound.success(); showHint('맞아요! ' + (k === 'fixed' ? '고정단에서는 펄스가 뒤집혀서 돌아와요.' : '자유단에서는 펄스가 그대로 돌아와요.'), 3200); }
    else { Sound.click(); showHint('다시 한번 그래프를 봐요. 입사 펄스와 반사 펄스의 방향(부호)을 비교해요.', 3000); $(id).classList.remove('bad'); void $(id).offsetWidth; $(id).classList.add('bad'); setTimeout(() => $(id).classList.remove('bad'), 600); }
    updateCtl();
  }));
  [['#bJ2s', 'same'], ['#bJ2i', 'inv']].forEach(([id, ch]) => $(id).addEventListener('click', () => {
    const k = S.bd.dir, j = judge(k, ch); if (!j) { showHint('먼저 펄스를 보내서 센서 A의 반사 펄스를 확인해요.', 2400); return; }
    S.bd.judged[k] = ch;
    if (j.ok) { S.bd.ok[k] = true; Sound.success(); showHint('맞아요! ' + (k === 'LH' ? '가벼운 줄에서 무거운 줄로 갈 때 반사 펄스는 뒤집혀요.' : '무거운 줄에서 가벼운 줄로 갈 때 반사 펄스는 그대로예요.'), 3400); }
    else { Sound.click(); showHint('센서 A의 그래프에서 입사(+)와 반사의 부호를 비교해요.', 3000); $(id).classList.remove('bad'); void $(id).offsetWidth; $(id).classList.add('bad'); setTimeout(() => $(id).classList.remove('bad'), 600); }
    updateCtl();
  }));
  $$('#scenSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.echo.scen = b.dataset.s; S.echo.run = null; updateCtl(); }));
  $('#bPing').addEventListener('click', () => { Sound.click(); S.echo.run = { t: 0, done: false }; updateCtl(); });
  $('#sPos').addEventListener('input', (e) => { S.us.pos = +e.target.value; usMark(S.us.pos * 0.2); updateCtl(); });
  $$('#freqSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.us.fi = +b.dataset.f; usDirty = true; updateCtl(); }));
  $('#bGel').addEventListener('click', () => { Sound.click(); S.us.gel = !S.us.gel; usDirty = true; updateCtl(); });
  $('#bPing4').addEventListener('click', () => { Sound.click(); usMark(S.us.pos * 0.2); S.us.ping = { t: 0 }; updateCtl(); });
  $('#bScan').addEventListener('click', () => { Sound.click(); if (S.us.auto) S.us.auto = null; else { S.us.pos = 0; S.us.auto = { acc: 0 }; usMark(0); } updateCtl(); });
  $('#sNd').addEventListener('input', (e) => { S.nd.pos = +e.target.value; ndCheckFound(); updateCtl(); });
  $('#sCur').addEventListener('input', (e) => { S.nd.cursor = +e.target.value / 10; updateCtl(); });
  function ndCheckFound() { if (ndEchoes(ndX()).some((e) => e.crack && e.a >= 0.4)) S.nd.found = true; }
  ['iDep', 'iD1', 'iGap', 'iL1', 'iL2', 'iUs'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  // 탐촉자 끌기 (초음파 영상·비파괴 검사 화면)
  SciSim.pointer(view, {
    down(p) { const h = S.hit; if (!h || (S.mode !== 'img' && S.mode !== 'ndt')) return false; if (p.x < h.x - 8 || p.x > h.x + h.w + 8 || p.y < h.y - 8 || p.y > h.y + h.h + 20) return false; S.drag = true; S.us.auto = null; return true; },
    move(p) {
      const h = S.hit; if (!h || !S.drag) return;
      if (S.mode === 'img') { S.us.pos = clamp(Math.round((p.x - h.ox) / h.ppc / 0.2), 0, 40); usMark(S.us.pos * 0.2); }
      else { S.nd.pos = clamp(Math.round((p.x - h.ox) / h.ppc / 0.5), 0, 40); ndCheckFound(); }
      updateCtl();
    },
    up() { S.drag = false; },
    hover(p) { const h = S.hit; return h && (S.mode === 'img' || S.mode === 'ndt') && p.x > h.x - 6 && p.x < h.x + h.w + 6 && p.y > h.y - 6 && p.y < h.y + h.h + 6 ? 'grab' : null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode, sc = S.sc;
    if (m === 'end') {
      const seg = sc && sc.pA.segs;
      L1 = '끝의 종류'; a = S.end.kind === 'fixed' ? '고정단' : '자유단'; L2 = '입사 펄스'; b = seg && seg[0] ? sgn(seg[0].peak) + ' cm' : '—'; L3 = '반사 펄스'; c = seg && seg[1] ? sgn(seg[1].peak) + ' cm' : '—';
    } else if (m === 'bd') {
      const r = S.bd.res[S.bd.dir];
      L1 = '방향'; a = S.bd.dir === 'LH' ? '가벼운 → 무거운' : '무거운 → 가벼운'; L2 = '반사 / 투과 진폭'; b = r ? sgn(r.refl) + ' / ' + sgn(r.trans) + ' cm' : '—'; L3 = '입사 진폭'; c = r ? sgn(r.inc) + ' cm' : '—';
    } else if (m === 'echo') {
      const sn = SCEN[S.echo.scen], run = S.echo.run, bat = sn.bat;
      L1 = '소리 속력 v'; a = sn.v + ' m/s'; L2 = '경과 시간'; b = run ? (bat ? fx(run.t * 1000, 1) + ' ms' : fx(run.t, 2) + ' s') : '—'; L3 = '받은 에코'; c = run ? sn.lay.filter((ly, i) => run.t >= echoT(sn, i) - 1e-9).length + ' / ' + sn.lay.length : '—';
    } else if (m === 'img') {
      const e = usEchoes(S.us.pos * 0.2).filter((q) => q.z > 0.2);
      L1 = '진동수 / 젤'; a = FQ[S.us.fi] + ' MHz / ' + (S.us.gel ? '바름' : '없음'); L2 = '탐촉자 위치'; b = fx(S.us.pos * 0.2, 1) + ' cm'; L3 = '몸속 에코'; c = e.length + '개';
    } else {
      const e = ndEchoes(ndX());
      L1 = '탐촉자 위치'; a = fx(ndX(), 1) + ' cm'; L2 = '에코 개수'; b = e.length + '개'; L3 = '커서 깊이'; c = fx(V_STL * S.nd.cursor * 1e-6 / 2 * 100, 1) + ' cm';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1e.textContent = a; l2.textContent = L2; v2e.textContent = b; l3.textContent = L3; v3e.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '끝에서 반사: 고정단과 자유단', short: '끝에서 반사', icon: '🔁', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 파동이 벽에 부딪히면 어떻게 될까? 반사되어 돌아온 신호의 시간으로 보이지 않는 곳의 거리를 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 탄성파의 진행에서</b> 줄 위의 펄스가 속력 v로 진행하는 것을, <b>물리학에서</b> 파동이 겹치는 중첩 원리를 배웠어요. 이번에는 펄스가 줄의 <b>끝에 닿았을 때</b>를 알아봐요.</div>' +
        '<p>줄의 한쪽 끝은 손으로 흔들고, 다른 쪽 끝은 <b>벽에 고정(고정단)</b>하거나 <b>막대에 걸린 고리(자유단)</b>로 해요. 펄스를 보내 <b>센서 A</b>의 그래프에서 입사 펄스와 반사 펄스를 비교해요. (세로 눈금은 가로보다 확대해서 그렸어요.)</p>',
      features: ['end'],
      setup() { resetFlags(); S.end.kind = 'fixed'; S.end.ok = { fixed: false, free: false }; S.end.seen = { fixed: false, free: false }; setScene('end'); enterScene('end'); updateCtl(); },
      recap: '고정단에서 반사된 펄스는 뒤집혀서(위상이 반대, π) 돌아오고, 자유단에서는 그대로(위상 같음) 돌아와요. 반사된 펄스도 같은 속력으로 진행해요.',
      summary: '<ul><li><b>반사</b>: 파동이 매질의 끝이나 경계에서 되돌아오는 현상.</li>' +
        '<li><b>고정단 반사</b>: 벽이 줄에 <b>반대 방향 힘</b>을 주므로 반사 펄스는 <b>뒤집혀요</b>(위상 변화 π). 입사 +6.0 cm → 반사 −6.0 cm.</li>' +
        '<li><b>자유단 반사</b>: 끝이 자유롭게 움직이므로 반사 펄스는 <b>그대로</b>예요(위상 변화 없음). +6.0 cm → +6.0 cm.</li>' +
        '<li>주기적인 파동을 보내면 입사파와 반사파가 만나 겹쳐져(중첩) 정상파 모양이 돼요 (뒤에서 자세히 배워요).</li></ul>',
      missions: [
        {
          title: '고정단 반사 확인하기',
          goal: '줄의 오른쪽 끝을 <b>고정단</b>으로 하고 <b>👆 펄스 보내기</b>를 눌러요. 반사되어 돌아온 펄스가 입사 펄스와 같은 방향인지 골라요.',
          hint: '센서 A 그래프에 먼저 입사 펄스(+)가 지나가고, 잠시 뒤 반사 펄스가 지나가요. 두 펄스의 방향(부호)을 비교한 뒤 아래 버튼을 눌러요.',
          setup() { resetFlags(); S.end.kind = 'fixed'; S.end.ok = { fixed: false, free: false }; S.end.seen = { fixed: false, free: false }; setScene('end'); enterScene('end'); updateCtl(); },
          check: () => S.end.ok.fixed,
          hold: 0.4,
          status: () => mark(S.end.seen.fixed) + ' 펄스 보내기 &nbsp; ' + mark(S.end.ok.fixed) + ' 반사 위상 판정',
          explain: '고정단에서 반사된 펄스는 입사 펄스(+6.0 cm)와 <b>반대 방향(−6.0 cm)</b>으로 돌아와요. 위상이 반대(π)가 되었어요.',
        },
        {
          title: '자유단 반사 확인하기',
          goal: '이번에는 오른쪽 끝을 <b>자유단</b>(막대에 걸린 고리)으로 바꾸고 펄스를 보내요. 반사 펄스의 방향을 판정해요.',
          hint: '오른쪽 끝 종류를 자유단으로 바꾼 뒤 👆 펄스 보내기를 눌러요. 입사와 반사의 부호가 같은지 봐요.',
          setup() { resetFlags(); S.end.kind = 'free'; S.end.ok.free = false; S.end.seen.free = false; setScene('end'); enterScene('end'); updateCtl(); },
          check: () => S.end.ok.free,
          hold: 0.4,
          status: () => mark(S.end.seen.free) + ' 펄스 보내기 &nbsp; ' + mark(S.end.ok.free) + ' 반사 위상 판정',
          explain: '자유단에서 반사된 펄스는 입사 펄스와 <b>같은 방향(+6.0 cm)</b>으로 돌아와요. 위상이 그대로예요.',
        },
        {
          type: 'quiz', title: '고정단에서 펄스가 뒤집히는 까닭',
          goal: '고정단에서 반사된 펄스가 <b>뒤집혀서</b> 돌아오는 까닭으로 알맞은 것은?',
          setup() { resetFlags(); S.end.kind = 'fixed'; setScene('end'); enterScene('end'); startPulse(S.sc); updateCtl(); },
          choices: ['벽이 줄을 위로 올리는 펄스에 반대 방향(아래쪽) 힘을 주기 때문이에요', '반사파는 어떤 경우에도 항상 위상이 반대가 돼요', '펄스가 벽에 부딪히며 에너지를 모두 잃고 새로 만들어져요', '벽에서 줄이 늘어나 속력이 달라지기 때문이에요'],
          answer: 0,
          feedback: ['', '자유단에서는 위상이 그대로 반사돼요. 끝이 고정되어 있는지 자유로운지에 따라 달라요.', '반사된 펄스의 크기는 입사 펄스와 같아요(6.0 cm). 에너지가 보존돼요.', '반사된 펄스도 같은 줄 위를 같은 속력(20 m/s)으로 진행해요. 속력은 변하지 않아요.'],
          explain: '줄이 벽을 위로 당기면 벽은 줄을 <b>아래로</b>(반대 방향) 당겨요(작용·반작용). 그래서 반사 펄스가 뒤집혀요. 자유단에서는 끝이 자유롭게 움직여 반대 힘이 없으므로 그대로 반사돼요. 반사파가 항상 위상이 반대인 것은 아니에요.',
        },
      ],
    },
    {
      title: '경계 통과: 반사와 투과', short: '경계 통과', icon: '🧵', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 끝에서의 반사를 봤어요. 이번에는 끝이 아니라 <b>두 줄이 이어진 경계</b>예요. 속력이 다른 매질로 들어가면 일부는 반사되고 일부는 <b>투과</b>해요.</div>' +
        '<p>같은 장력의 <b>가벼운 줄</b>(v = 20 m/s)과 <b>무거운 줄</b>(v = 10 m/s)을 이었어요. 입사 펄스는 +6.0 cm예요. 센서 A(경계 왼쪽)와 센서 B(경계 오른쪽)로 반사 펄스와 투과 펄스의 위상과 진폭을 측정해요.</p>',
      features: ['bd'],
      setup() { resetFlags(); S.bd.dir = 'LH'; S.bd.res = { LH: null, HL: null }; S.bd.judged = { LH: null, HL: null }; S.bd.ok = { LH: false, HL: false }; setScene('bd'); enterScene('bd'); updateCtl(); },
      recap: '속력이 큰 매질에서 작은 매질로 갈 때 반사파는 위상이 반전되고 투과파는 위상이 그대로예요. 반대로 속력이 작은 매질에서 큰 매질로 갈 때는 반사파·투과파 모두 위상이 그대로예요. 경계를 지나도 진동수는 같고 파장만 변해요(λ = v/f).',
      summary: '<ul><li>가벼운 줄(v = 20 m/s) → 무거운 줄(v = 10 m/s): 반사 <b>−2.0 cm(위상 반전)</b>, 투과 <b>+4.0 cm(위상 그대로)</b>.</li>' +
        '<li>무거운 줄(v = 10 m/s) → 가벼운 줄(v = 20 m/s): 반사 <b>+2.0 cm(위상 그대로)</b>, 투과 <b>+8.0 cm(위상 그대로)</b>.</li>' +
        '<li>규칙: 파동이 속력이 <b>큰 매질에서 작은 매질</b>로 가면 반사파의 위상이 반전돼요(고정단과 비슷). 반대면 반사파의 위상은 그대로(자유단과 비슷).</li>' +
        '<li>투과파의 진폭이 입사파보다 커도 에너지는 늘지 않아요: <b>반사 + 투과 에너지 = 입사 에너지</b>.</li>' +
        '<li>경계를 지나도 <b>진동수 f는 불변</b>이고, 속력이 바뀌므로 파장이 바뀌어요(v = fλ): f = 20 Hz에서 λ = 1.0 m → 0.5 m.</li></ul>',
      missions: [
        {
          title: '두 방향의 반사 위상 판정하기',
          goal: '<b>가벼운 → 무거운</b> 줄과 <b>무거운 → 가벼운</b> 줄에서 각각 펄스를 보내고, 센서 A로 본 <b>반사 펄스의 위상</b>(같음/반전)을 판정해요.',
          hint: '방향을 고르고 👆 펄스 보내기를 눌러요. 센서 A에 입사 펄스(+6.0 cm)와 반사 펄스가 차례로 기록돼요. 방향을 바꿔 한 번 더 해요.',
          setup() { resetFlags(); S.bd.dir = 'LH'; S.bd.res = { LH: null, HL: null }; S.bd.judged = { LH: null, HL: null }; S.bd.ok = { LH: false, HL: false }; setScene('bd'); enterScene('bd'); updateCtl(); },
          check: () => S.bd.ok.LH && S.bd.ok.HL,
          hold: 0.4,
          status: () => mark(S.bd.ok.LH) + ' 가벼운 → 무거운 &nbsp; ' + mark(S.bd.ok.HL) + ' 무거운 → 가벼운',
          explain: '속력이 큰 가벼운 줄에서 작은 무거운 줄로 갈 때 반사 펄스는 <b>−2.0 cm로 뒤집혀요</b>. 반대 방향에서는 <b>+2.0 cm로 그대로</b> 반사돼요. 투과 펄스는 두 경우 모두 위상이 그대로(+4.0 cm, +8.0 cm)예요.',
        },
        {
          title: '경계 전후의 파장 계산하기', manual: true,
          goal: '진동수 <b>f = 20 Hz</b>인 주기파가 가벼운 줄(v = 20 m/s)에서 무거운 줄(v = 10 m/s)로 들어가요. 경계 <b>왼쪽 λ₁</b>과 <b>오른쪽 λ₂</b>(m)를 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'v = fλ에서 λ = v / f예요. 진동수 20 Hz는 경계 전후에서 같아요. 속도가 달라지는 만큼 파장이 달라져요.',
          setup() { resetFlags(); clr('iL1', 'iL2'); setFlag('lam', true); S.bd.dir = 'LH'; setScene('bd'); enterScene('bd'); toggleWaveSilent(20); updateCtl(); },
          check() {
            const a = num('iL1'), b = num('iL2'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const oks = [near(a, 1.0, 0.05), near(b, 0.5, 0.03)]; fb([[$('#iL1'), oks[0]], [$('#iL2'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (near(a, 0.5, 0.03) && near(b, 1.0, 0.05)) return '왼쪽이 가벼운 줄(v = 20 m/s)이에요. 속력이 큰 쪽의 파장이 더 길어요.';
            if (oks[0] && near(b, 1.0, 0.05)) return '진동수는 그대로지만 속력이 1/2이 되었어요. 파장 λ = v / f도 1/2이 돼요.';
            return !oks[0] ? 'λ₁ = v₁ / f = 20 m/s / 20 Hz를 계산해 보세요.' : 'λ₂ = v₂ / f = 10 m/s / 20 Hz를 계산해 보세요.';
          },
          status: () => '입력 λ₁ ' + ($('#iL1').value.trim() || '—') + ' m, λ₂ ' + ($('#iL2').value.trim() || '—') + ' m',
          explain: 'λ₁ = v₁/f = 20/20 = <b>1.0 m</b>, λ₂ = v₂/f = 10/20 = <b>0.5 m</b>이에요. 진동수 20 Hz는 그대로이고 속력이 1/2이 되니 파장도 1/2로 짧아졌어요. 그림에서 오른쪽 파장이 더 촘촘하죠?',
        },
        {
          type: 'quiz', title: '경계를 지난 파동의 진동수',
          goal: '파동이 경계를 지나 다른 줄로 들어갈 때, <b>진동수와 파장</b>은 각각 어떻게 될까요?',
          setup() { resetFlags(); S.bd.dir = 'LH'; setScene('bd'); enterScene('bd'); toggleWaveSilent(20); updateCtl(); },
          choices: ['진동수는 바뀌고 파장은 그대로예요', '진동수도 파장도 모두 바뀌어요', '진동수는 그대로이고, 속력이 바뀌는 만큼 파장이 바뀌어요', '진동수도 파장도 그대로이고 진폭만 바뀌어요'],
          answer: 2,
          feedback: ['반대예요. 진동수는 그대로이고 파장이 바뀌어요.', '진동수는 바뀌지 않아요. 경계의 점이 입사파와 같은 진동수로 떨며 파를 넘겨주기 때문이에요.', '', '속력이 달라지므로 파장도 달라져요(λ = v/f). 오른쪽 파가 더 촘촘한 것을 봐요.'],
          explain: '경계의 점이 <b>입사파와 같은 진동수로 떨며</b> 다음 줄에 파를 넘겨주므로 진동수 f는 변하지 않아요. 새 매질의 속력이 달라지면 <b>λ = v/f</b>에 따라 파장이 바뀌어요(속력이 느린 매질에서는 파장이 짧아져요).',
        },
      ],
    },
    {
      title: '에코 거리: d = vt/2', short: '에코 거리', icon: '📡', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파동이 경계에서 반사되어 돌아오는 것을 봤어요. 반사되어 돌아오는 <b>시간</b>을 재면 보이지 않는 곳까지의 <b>거리</b>를 알 수 있어요. 소나, 박쥐와 돌고래의 반향 정위, 지진파로 지구 속을 알아내는 방법이 모두 같은 원리예요.</div>' +
        '<p>배에서 소나 신호를 바다 밑으로 보내고, 에코가 돌아오는 시간 t를 재요. 소리의 속력이 v이면 거리는 <b>d = vt/2</b>예요.</p>',
      features: ['echo'],
      setup() { resetFlags(); S.echo.scen = 'A'; S.echo.run = null; S.echo.done = { A: false, B: false, bat: false }; setScene('echo'); enterScene('echo'); updateCtl(); },
      recap: '신호가 나갔다가 돌아오는 데 걸린 왕복 시간이 t이면, 편도 거리는 d = vt/2예요. 바다에서 소리 속력은 약 1500 m/s이므로 에코가 2.0 s 만에 돌아오면 깊이는 1500 m예요.',
      summary: '<ul><li><b>펄스–에코</b>: 신호를 보내고 반사파(에코)가 돌아오는 시간 t를 재어 거리를 구하는 방법(소나, 초음파 영상, 박쥐·돌고래, 지진파 탐사).</li>' +
        '<li>신호는 갔다가 돌아오므로 걸린 시간은 <b>왕복</b>이에요: <b>d = vt/2</b>.</li>' +
        '<li>바다(소리 속력 1500 m/s): 에코 2.0 s → d = 1500 × 2.0 / 2 = <b>1500 m</b>.</li>' +
        '<li>층이 둘이면 에코가 두 번 돌아와요: 1.0 s → 750 m, 1.6 s → 1200 m, 두 층 사이 간격 <b>450 m</b>.</li>' +
        '<li>박쥐(공기 중 340 m/s): 에코가 20 ms 만에 돌아오면 벽까지 3.4 m.</li></ul>',
      missions: [
        {
          title: '에코 시간으로 바다 깊이 구하기', manual: true,
          goal: '<b>📡 신호 보내기</b>를 눌러 에코가 돌아오는 시간을 재고, <b>바다 깊이</b>(m)를 구해 입력한 뒤 ✔ 확인하기를 누르세요. (소리 속력 1500 m/s)',
          hint: '신호가 밑바닥까지 갔다가 돌아오는 데 걸린 시간이 에코 시간이에요. 깊이는 편도 거리이므로 d = v t / 2예요.',
          setup() { resetFlags(); clr('iDep'); setFlag('echoA', true); S.echo.scen = 'A'; S.echo.run = null; S.echo.done.A = false; setScene('echo'); enterScene('echo'); updateCtl(); },
          check() {
            if (!S.echo.done.A) return '먼저 📡 신호를 보내 에코가 돌아오는 시간을 재어요.';
            const v = num('iDep'); if (v == null) return '깊이를 숫자로 입력해 주세요 (m).';
            const ok = near(v, 1500, 30); fb([[$('#iDep'), ok]]);
            if (ok) { S.flags.echoOK = true; return true; }
            if (near(v, 3000, 60)) return '3000 m는 신호가 왕복한 거리예요. 깊이는 편도이므로 2로 나눠요.';
            if (near(v, 2, 0.1)) return '2.0 s는 에코 시간이에요. 거리 = 속력 × 시간 / 2를 계산해요.';
            return 'd = v t / 2 = 1500 m/s × (에코 시간) / 2를 계산해 보세요.';
          },
          status: () => mark(S.echo.done.A) + ' 에코 시간 재기 &nbsp; 입력 ' + ($('#iDep').value.trim() || '—') + ' m',
          explain: '에코는 <b>2.00 s</b> 만에 돌아왔어요. 이 시간은 신호가 밑바닥까지 가는 시간과 돌아오는 시간의 합(왕복)이므로 d = vt/2 = 1500 × 2.00 / 2 = <b>1500 m</b>예요.',
        },
        {
          title: '두 층 사이의 간격 구하기', manual: true,
          goal: '이번 바다에는 층이 두 개 있어요. 📡 신호를 보내 에코 두 개의 시간을 재고, <b>첫 번째 층의 깊이</b>와 <b>두 층 사이의 간격</b>(m)을 구해 입력하세요.',
          hint: '에코 시간 두 개로 각각 깊이를 구해요(d = v t / 2). 두 깊이의 차이가 층 사이 간격이에요.',
          setup() { resetFlags(); S.flags.echoOK = true; clr('iD1', 'iGap'); setFlag('echoB', true); S.echo.scen = 'B'; S.echo.run = null; S.echo.done.B = false; setScene('echo'); enterScene('echo'); updateCtl(); },
          check() {
            if (!S.echo.done.B) return '먼저 📡 신호를 보내 에코 두 개를 받아요.';
            const a = num('iD1'), b = num('iGap'); if (a == null || b == null) return '두 칸 모두 입력해 주세요.';
            const oks = [near(a, 750, 15), near(b, 450, 15)]; fb([[$('#iD1'), oks[0]], [$('#iGap'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (!oks[1] && (near(b, 1200, 30) || near(b, 0.6, 0.05))) return '두 층 사이의 간격은 깊이의 차이예요. 둘째 층 깊이에서 첫째 층 깊이를 빼요.';
            if (!oks[0] && near(a, 1500, 30)) return '1.0 s를 그대로 곱하면 왕복 거리예요. 2로 나눠서 첫 층의 깊이를 구해요.';
            return !oks[0] ? '첫 번째 에코 시간 1.0 s로 d = 1500 × 1.0 / 2를 구해요.' : '두 번째 에코(1.6 s)의 깊이 1200 m와 첫 층 750 m의 차이를 구해요.';
          },
          status: () => mark(S.echo.done.B) + ' 에코 두 개 받기 &nbsp; 입력 d₁ ' + ($('#iD1').value.trim() || '—') + ' m, 간격 ' + ($('#iGap').value.trim() || '—') + ' m',
          explain: '에코 시간 1.0 s → d₁ = 1500 × 1.0 / 2 = <b>750 m</b>, 1.6 s → d₂ = 1500 × 1.6 / 2 = <b>1200 m</b>이에요. 두 층 사이의 간격은 1200 − 750 = <b>450 m</b>예요.',
        },
        {
          type: 'quiz', title: '왕복 시간을 2로 나누는 까닭',
          goal: '에코 시간 t로 거리를 구할 때 <b>d = vt/2</b>처럼 <b>2로 나누는 까닭</b>은?',
          setup() { resetFlags(); S.flags.echoOK = true; S.flags.scenAll = true; S.echo.scen = 'bat'; S.echo.run = { t: 0, done: false }; setScene('echo'); enterScene('echo'); S.echo.scen = 'bat'; S.echo.run = { t: 0, done: false }; updateCtl(); },
          choices: ['신호의 속력이 반으로 줄어들기 때문이에요', '에코 시간은 신호가 갔다가 돌아오는 왕복 시간이어서, 편도 거리를 구하려면 반으로 나눠야 해요', '반사될 때 에너지가 반으로 줄기 때문이에요', '소리가 두 번 반사되기 때문이에요'],
          answer: 1,
          feedback: ['속력은 매질이 정해요. 속력은 그대로이고 거리가 왕복이에요.', '', '에너지 손실은 에코의 세기와 관련이 있고, 거리 계산과는 관계없어요.', '반사는 한 번이에요. 신호가 물체까지 갔다가(편도) 돌아오는(편도) 두 구간을 지나요.'],
          explain: '신호는 물체까지 <b>갔다가 돌아오므로</b> 걸린 시간 t 동안 간 거리는 2d예요. 그래서 vt = 2d, <b>d = vt/2</b>예요. 박쥐도 같은 원리예요: 에코가 20 ms 만에 돌아오면 벽까지 340 × 0.020 / 2 = 3.4 m예요.',
        },
      ],
    },
    {
      title: '초음파 활용: 영상과 비파괴 검사', short: '초음파 활용', icon: '🩺', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에코 시간으로 거리를 구하는 d = vt/2를 배웠어요. 사람이 듣지 못하는 <b>초음파</b>(진동수 20000 Hz 이상)를 쓰면 몸속이나 금속 속을 같은 방법으로 볼 수 있어요.</div>' +
        '<p><b>초음파 영상</b>은 탐촉자가 보낸 초음파의 에코 시간·세기로 몸속 경계의 위치와 차이를 화면(밝기)으로 보여 주고, <b>비파괴 검사</b>는 부수지 않고 금속 속의 균열을 찾아요.</p>',
      features: ['img', 'ndt'],
      setup() { resetFlags(); usSet({ pos: 20, gel: true, fi: 1 }, 0, 0, null); S.nd = { pos: 4, cursor: 12.0, found: false }; setScene('img'); updateCtl(); },
      recap: '초음파는 경계에서 반사되어 돌아오는 에코의 시간으로 깊이(d = vt/2)를, 세기로 경계의 차이를 알려 줘요. 젤은 공기를 없애 초음파가 몸속으로 들어가게 하고, 비파괴 검사는 일찍 돌아온 에코로 균열의 위치를 찾아요.',
      summary: '<ul><li><b>초음파 영상</b>: 탐촉자가 펄스를 보내고 경계에서 돌아온 에코의 시간으로 깊이를, 세기로 경계의 차이(밝기)를 알아요. 몸속 소리 속력 1540 m/s: 에코 65 μs → d = 1540 × 65×10⁻⁶ / 2 ≈ <b>5.0 cm</b>.</li>' +
        '<li><b>젤</b>: 공기와 피부 경계에서는 초음파의 약 99.9 %가 반사되어 몸속으로 들어가지 못해요. 젤이 공기를 없애요.</li>' +
        '<li>진동수가 높을수록(3.5 MHz → λ = v/f = 0.44 mm) 작은 구조가 선명하지만 더 빨리 약해져 얕은 곳만 봐요.</li>' +
        '<li><b>비파괴 검사</b>: 강철 판(소리 5900 m/s, 두께 5.0 cm)의 아랫면 에코는 17 μs, 균열이 있으면 더 일찍(10 μs) 에코가 와서 깊이 5900 × 10×10⁻⁶ / 2 ≈ <b>3.0 cm</b>.</li>' +
        '<li>초음파는 사람 몸에 해가 적고 물체를 부수지 않고 속을 볼 수 있어 의료·산업에 널리 쓰여요.</li></ul>',
      missions: [
        {
          title: '에코 시간으로 몸속 깊이 구하기', manual: true,
          goal: '초음파 영상에서 장기 윗면의 에코가 <b>65 μs</b> 만에 돌아왔어요. 몸속 소리 속력 <b>1540 m/s</b>로 이 경계의 깊이(cm)를 구해 입력하세요.',
          hint: 'd = v t / 2예요. 65 μs = 65 × 10⁻⁶ s. 구한 값은 m 단위이니 cm로 바꿔요(1 m = 100 cm).',
          setup() { resetFlags(); clr('iUs'); setFlag('usOK', true); usSet({ pos: 20, gel: true, fi: 1 }, 14, 26, { t: 0 }); setScene('img'); updateCtl(); },
          check() {
            const v = num('iUs'); if (v == null) return '깊이를 숫자로 입력해 주세요 (cm).';
            const ok = near(v, 5.0, 0.2); fb([[$('#iUs'), ok]]);
            if (ok) return true;
            if (near(v, 10.0, 0.4)) return '10 cm는 신호가 왕복한 거리예요. 2로 나눠서 깊이를 구해요.';
            if (near(v, 0.05, 0.003)) return '0.05는 m 단위예요. cm로 바꾸면 얼마일까요?';
            if (near(v, 50, 2)) return '50은 mm 단위예요. cm로는 얼마일까요?';
            return 'd = 1540 × 65×10⁻⁶ / 2를 계산하고 cm로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#iUs').value.trim() || '—') + ' cm',
          explain: 'd = vt/2 = 1540 × (65×10⁻⁶) / 2 ≈ 0.050 m = <b>5.0 cm</b>예요. 에코가 장기 윗면에서 반사되어 돌아온 시간이에요. 몸 표면에서 5.0 cm 깊이에 장기가 있어요.',
        },
        {
          title: '강철 판의 균열 깊이 찾기',
          goal: '강철 판 위에서 <b>탐촉자를 옮기며</b> 아랫면 에코보다 <b>일찍 오는 에코</b>를 찾아요. 그 에코에 <b>보라색 줄</b>을 맞춰 균열의 깊이를 읽어요.',
          hint: '탐촉자를 좌우로 옮기면 어느 위치에서 아랫면(17 μs) 에코 말고 더 일찍 오는 에코가 생겨요. 슬라이더로 보라색 줄을 그 에코에 맞추면 깊이가 표시돼요.',
          setup() { resetFlags(); S.nd = { pos: 4, cursor: 12.0, found: false, ping: { t: 0 } }; setScene('ndt'); enterScene('ndt'); S.nd.ping = { t: 0 }; updateCtl(); },
          check() { const ec = ndEchoes(ndX()).find((e) => e.crack && e.a >= 0.4); if (!ec) return false; const d = V_STL * S.nd.cursor * 1e-6 / 2 * 100; return Math.abs(d - 3.0) <= 0.1; },
          hold: 0.6,
          status() { const ec = ndEchoes(ndX()).find((e) => e.crack && e.a >= 0.4); const d = V_STL * S.nd.cursor * 1e-6 / 2 * 100; return mark(!!ec) + ' 균열 에코 찾기 &nbsp; ' + mark(!!ec && Math.abs(d - 3.0) <= 0.1) + ' 읽은 깊이 ' + fx(d, 1) + ' cm'; },
          explain: '균열이 있는 곳에서는 아랫면(약 17 μs)보다 <b>일찍(약 10 μs)</b> 에코가 돌아와요. 깊이 = 5900 × (10.2×10⁻⁶) / 2 ≈ <b>3.0 cm</b>이므로 균열은 표면에서 3.0 cm 깊이에 있어요. 판을 부수지 않고 알아냈어요.',
        },
        {
          type: 'quiz', title: '젤을 바르지 않으면?',
          goal: '초음파 검사를 할 때 탐촉자와 피부 사이에 <b>젤</b>을 바르지 않으면 영상이 잘 나오지 않아요. 그 까닭은?',
          setup() { resetFlags(); usSet({ pos: 20, gel: false, fi: 1 }, 8, 32, null); setScene('img'); updateCtl(); },
          choices: ['젤이 초음파의 진동수를 높여 주기 때문이에요', '공기와 피부의 경계에서 초음파의 약 99.9 %가 반사되어 몸속으로 거의 들어가지 못하기 때문이에요', '젤이 몸속 소리의 속력을 느리게 만들기 때문이에요', '젤이 없으면 초음파가 몸속에서 횡파로 바뀌기 때문이에요'],
          answer: 1,
          feedback: ['젤은 진동수를 바꾸지 않아요. 공기층을 없애는 역할을 해요.', '', '속력은 매질(몸속 조직)이 정해요. 젤은 속력이 아니라 공기를 없애는 역할을 해요.', '초음파는 몸속에서도 종파예요. 문제는 공기와 피부 사이의 경계예요.'],
          explain: '공기와 피부는 소리를 전달하는 성질(밀도·탄성)이 많이 달라서 <b>경계에서 약 99.9 %가 반사</b>돼요. 젤은 탐촉자와 피부 사이의 <b>공기를 없애</b> 초음파가 몸속으로 들어가게 해요. 화면에서 젤을 바르지 않으면 영상이 거의 보이지 않죠?',
        },
      ],
    },
  ];
  function usSet(o, k0, k1, ping) { Object.assign(S.us, o); S.us.auto = null; S.us.ping = ping; S.us.scan = {}; for (let k = k0; k <= k1 && k1 > 0; k++) S.us.scan[k] = true; usDirty = true; }
  function toggleWaveSilent(f) { const sc = S.sc; sc.ch.y.fill(0); sc.ch.v.fill(0); sc.sent = false; sc.busy = false; startWave(sc, f); }

  game = SciSim.game({
    simId: 'hm-wave-reflection', mount: '#game', badge: '반사·투과 박사', homeHref: '../../index.html#hm',
    featureLabels: { end: '🔁 고정단·자유단 반사', bd: '🧵 두 줄의 경계 · 센서 A·B', echo: '📡 소나 에코 · d = vt/2', img: '🩺 초음파 영상 (B-모드)', ndt: '🔩 비파괴 검사 (강철 판)' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  enterScene('end'); updateCtl();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    simStep(dt);
    if (S.mode === 'echo' && S.echo.run && !S.echo.run.done) {
      const r = S.echo.run, sn = SCEN[S.echo.scen], last = echoT(sn, sn.lay.length - 1);
      r.t += dt * S.ts * sn.k;
      if (r.t >= last) { r.t = last; r.done = true; S.echo.done[S.echo.scen] = true; Sound.success(); updateCtl(); }
    }
    if (S.mode === 'img') {
      const u = S.us;
      if (u.ping) { u.ping.t += dt * 37; if (u.ping.t >= 136) u.ping = null; }
      if (u.auto) { u.auto.acc += dt; while (u.auto.acc > 0.1) { u.auto.acc -= 0.1; if (u.pos < 40) { u.pos++; usMark(u.pos * 0.2); updateCtl(); } else { u.auto = null; updateCtl(); } } }
    }
    if (S.mode === 'ndt') { const n = S.nd; if (!n.ping) n.ping = { t: 0 }; n.ping.t += dt * 4.2; if (n.ping.t > 24) n.ping.t = 0; }
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); S.hit = null;
    switch (S.mode) {
      case 'end': drawEndScene(); break;
      case 'bd': drawBdScene(); break;
      case 'echo': drawEchoScene(); break;
      case 'img': drawImgScene(); break;
      default: drawNdtScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, enterScene, startPulse, startWave, buildString, usEchoes, ndEchoes, ndX, SCEN, echoT,
    get sc() { return S.sc; }, v1, v2,
    run(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) substep(S.sc, DT); },
  };
})();
