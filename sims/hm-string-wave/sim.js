/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 현의 정상파 (6차시)
   성취기준 [12역학03-05] 현악기, 관악기 등에서 소리를 내는 원리를 정상파를 이용하여 설명할 수 있다. (현의 정상파 부분)
   ① 관찰: 정상파 (양 끝 고정 줄의 공명, 입사파 + 반사파 = 정상파)
   ② 탐구: 파장 조건 (L = nλ/2, λ = 2L/n)
   ③ 분석: 진동수 (f_n = nv/2L, v = √(T/μ), 길이·장력·굵기)
   ④ 적용: 현악기 (조율, 프렛과 음정, 자연 배음)
   구동되는 줄은 복소 파수(약한 감쇠)를 쓴 정상 상태 식으로 그려요. 파동 방정식 유도는 다루지 않아요. 세로 눈금은 확대했어요.
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
  const GREEN_D = '#14532d';

  /* ================= 물리 ================= */
  const L0 = 0.5, T0 = 40, MU0 = 1.0;                            // 기준 줄: 길이 0.50 m, 장력 40 N, 1.0 g/m
  const vOf = (Tn, mu) => Math.sqrt(Tn / (mu * 1e-3));            // 줄의 파동 속력 v = √(T/μ)
  const f1Of = (L, Tn, mu) => vOf(Tn, mu) / (2 * L);              // 기본 진동수 f₁ = v/2L
  const V0 = vOf(T0, MU0);                                         // 200 m/s
  const A_DRV = 2.5, ETA = 0.03, YMAX = 34;                        // 발생기 진폭 2.5 mm, 감쇠, 그림의 세로 범위(mm)
  const WVIS = 0.8;                                                // 화면에서 보이는 진동 속도 (Hz, 실제보다 훨씬 느리게)
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const csin = (z) => [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])];
  const cexpi = (z) => { const m = Math.exp(-z[1]); return [m * Math.cos(z[0]), m * Math.sin(z[0])]; };   // e^{iz}
  /* 한쪽 끝을 구동하는 줄의 정상 상태 (복소 파수로 감쇠를 넣어요): 합성 = 입사파 + 반사파, 모두 mm */
  function strField(f) {
    const w = TAU * Math.max(0.5, f), kr = w / V0, kk = [kr, -kr * ETA], sKL = csin([kk[0] * L0, kk[1] * L0]);
    const C = cdiv([0, -0.5 * A_DRV], sKL);
    return { kr, kk, sKL, C };
  }
  function strAt(F, x, wt) {
    const s = L0 - x, ks = [F.kk[0] * s, F.kk[1] * s], ph = [Math.cos(wt), Math.sin(wt)];
    const tot = cdiv(csin(ks), F.sKL), inc = cmul(F.C, cexpi(ks)), ref = cmul(F.C, cexpi([-ks[0], -ks[1]]));
    const re = (z) => z[0] * ph[0] - z[1] * ph[1];
    return { tot: A_DRV * re(tot), inc: re(inc), ref: -re(ref) };
  }
  function ampOf(f) {
    const F = strField(f); let m = 0;
    for (let i = 0; i <= 80; i++) { const s = L0 * (1 - i / 80), z = csin([F.kk[0] * s, F.kk[1] * s]), q = cdiv(z, F.sKL), a = A_DRV * Math.hypot(q[0], q[1]); if (a > m) m = a; }
    return m;
  }
  const RES = []; for (let f = 0; f <= 800; f += 2) RES.push(ampOf(f));
  const resAt = (f) => ampOf(f);
  const FNR = (n) => n * V0 / (2 * L0);                           // 200, 400, 600 Hz

  /* ================= 상태 ================= */
  const S = {
    mode: 'drive', fade: 0, clock: 0,
    dr: { f: 0, fe: 0, found: [false, false, false], dwell: [0, 0, 0], sweep: false, parts: true, countOK: false },
    lam: { n: 1, L: 500, show: false },
    fq: { L: 500, T: 40, mu: 1, rec: {}, hide: false, base: null },
    ins: { T20: 1000, xf: 0, harm: false, got5: false, gotOct: false, hold5: 0, holdOct: 0, tuneHold: 0 },
    flags: { jump: false, count: false, lamIn: false, fqIn: false, tune: false, fret: false, harm: false },
    hit: null,
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1e = $('#v1'), v2e = $('#v2'), v3e = $('#v3');
  const MODES = ['drive', 'lam', 'freq', 'inst'];
  const ALLOWED = [['drive'], ['lam'], ['freq'], ['inst']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; const h = $('#stageHint'); if (h) h.classList.add('hide'); } updateCtl(); }
  const mm = (v, d, plus) => fx(v, d == null ? 1 : d, plus);


  function plotF(M, fn, t0, t1, col, lw, dash) {
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 1, M.iw, M.ih + 2); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); const n = Math.max(60, Math.floor(M.iw / 2));
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, x = M.ix + M.iw * i / n, y = M.gy(fn(t)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  /* ---------- 그리기 도우미 ---------- */
  function laneGeo(c, Lm, ppmMax) {
    const left = PHONE ? 54 : 92, right = PHONE ? 34 : 64, avail = c.w - left - right, ppm = ppmMax ? Math.min(avail / ppmMax, avail / Lm) : avail / Lm;
    const top = c.y + 40, hh = PHONE ? 176 : 206, cy = top + hh / 2, pmm = (hh / 2 - 4) / YMAX;
    return { sx0: c.x + left, sx1: c.x + left + Lm * ppm, ppm, top, hh, cy, pmm, X: (x) => c.x + left + x * ppm, Y: (y) => cy - y * pmm, c };
  }
  function lanePanel(G, o) {
    const c = G.c;
    D.roundRect(c.x + 6, G.top, c.w - 12, G.hh, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,135,160,.30)'; ctx.lineWidth = 1;
    [-30, -20, -10, 10, 20, 30].forEach((v) => { if (o && o.ygrid === false) return; ctx.beginPath(); ctx.moveTo(c.x + 12, G.Y(v)); ctx.lineTo(c.x + c.w - 12, G.Y(v)); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(80,95,120,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x + 12, G.cy); ctx.lineTo(c.x + c.w - 12, G.cy); ctx.stroke();
    if (!(o && o.ygrid === false)) [-20, 20].forEach((v) => T(c.x + c.w - 12, G.Y(v) - 4, (v > 0 ? '+' : MINUS) + '20', 13, '#7d8aa3', 'right', 800));
  }
  function laneRuler(G, Lm, step, lab) {
    const y = G.top + G.hh + 6; ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.X(0), y); ctx.lineTo(G.X(Lm), y); ctx.stroke();
    for (let x = 0; x <= Lm + 1e-9; x += step) {
      const major = Math.abs(x * 10 - Math.round(x * 10)) < 1e-6; ctx.beginPath(); ctx.moveTo(G.X(x), y); ctx.lineTo(G.X(x), y + (major ? 9 : 5)); ctx.stroke();
      if (major && lab !== false) T(G.X(x), y + 23, x.toFixed(1), 13, '#334155', 'center', 800);
    }
    if (lab !== false) T(G.X(Lm) + (PHONE ? 4 : 12), y + 8, 'm', 13, MUTED, 'left', 800);
    return y;
  }
  function curveX(G, fn, Lm, col, lw, alpha) {
    ctx.save(); ctx.beginPath(); ctx.rect(G.c.x + 8, G.top + 2, G.c.w - 16, G.hh - 4); ctx.clip();
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    const n = 160; for (let i = 0; i <= n; i++) { const x = Lm * i / n, y = G.Y(clamp(fn(x), -YMAX, YMAX)); i ? ctx.lineTo(G.X(x), y) : ctx.moveTo(G.X(x), y); }
    ctx.stroke(); ctx.restore();
  }
  function post(x, cy, side, label) {
    D.shadow(() => { ctx.fillStyle = '#475569'; ctx.fillRect(x - 6 + side * 6, cy - 56, 12, 112); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    for (let k = -50; k <= 50; k += 14) { ctx.beginPath(); ctx.moveTo(x + side * 12, cy + k); ctx.lineTo(x + side * 20, cy + k + 8); ctx.stroke(); }
    if (label) T(x + side * 14, cy + 76, label, 13, MUTED, 'center', 800);
  }

  /* ================= ① 정상파 ================= */
  const nearestRes = (f) => { const n = clamp(Math.round(f / FNR(1)), 1, 4); return { n, d: Math.abs(f - FNR(n)) }; };
  function drawDriveScene() {
    const c = topCard(), d = S.dr; cardBegin(c);
    T(c.x + 14, c.y + 24, '양 끝이 고정된 줄 (L = 0.50 m): 왼쪽 끝을 진동 발생기가 흔들어요', PHONE ? 12.5 : 15, INK, 'left', 800);
    const G = laneGeo(c, L0); lanePanel(G);
    const F = strField(d.fe), wt = TAU * WVIS * S.clock;
    const fld = (x) => strAt(F, x, wt);
    if (d.parts) { curveX(G, (x) => fld(x).inc, L0, BLUE, 2.4, 0.85); curveX(G, (x) => fld(x).ref, L0, ORANGE, 2.4, 0.85); }
    curveX(G, (x) => fld(x).tot, L0, GREEN, 4.4);
    // 발생기와 고정단
    const a0 = fld(0).tot;
    D.shadow(() => { D.roundRect(G.sx0 - (PHONE ? 52 : 80), G.cy - 24, PHONE ? 30 : 46, 48, 8); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 4, y: 1 });
    T(G.sx0 - (PHONE ? 37 : 57), G.cy + 5, '〰', 20, '#fff', 'center', 800);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(G.sx0 - (PHONE ? 22 : 34), G.cy); ctx.lineTo(G.sx0, G.Y(a0)); ctx.stroke();
    D.sphere(G.sx0, G.Y(a0), 5, '#334155', { gloss: false });
    T(G.sx0 - (PHONE ? 37 : 57), G.cy + 42, PHONE ? '발생기' : '진동 발생기', 13, MUTED, 'center', 800);
    post(G.sx1 + 6, G.cy, 1, PHONE ? '' : '고정단'); D.sphere(G.sx1, G.cy, 5, '#334155', { gloss: false });
    // 마디·배 표시 (배운 뒤에)
    const nr = nearestRes(d.fe);
    if (revealed('marks') && nr.d <= 12 && nr.n <= 3) {
      for (let j = 0; j <= nr.n; j++) { const x = j * L0 / nr.n; D.label(G.X(x), G.Y(-(YMAX - 6)), 'N', { bg: '#475569', size: 13 }); }
      for (let j = 1; j <= nr.n; j++) { const x = (2 * j - 1) * L0 / (2 * nr.n); D.label(G.X(x), G.Y(YMAX - 6), 'A', { bg: '#dc2626', size: 13 }); }
    }
    laneRuler(G, L0, 0.05);
    D.label(c.x + 16, G.top + 16, '합성(초록)', { bg: GREEN, size: 13, align: 'left' });
    if (d.parts) { D.label(c.x + 16 + 94, G.top + 16, '입사파(파랑)', { bg: BLUE, size: 13, align: 'left' }); D.label(c.x + 16 + 206, G.top + 16, '반사파(주황)', { bg: ORANGE, size: 13, align: 'left' }); }
    T(c.x + 14, c.y + c.h - 12, PHONE ? '느리게 본 모습 · 세로 눈금은 mm(확대)' : '느리게 본 모습이에요 (실제로는 f = ' + Math.round(d.fe) + ' Hz). 세로 눈금은 mm이고 확대했어요.', PHONE ? 13 : 13.5, MUTED, 'left', 700);
    ctx.restore();
    // ---- 아래 패널: 공명 곡선 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 130 : PH - 46;
    T(x1, PY + 22, '📈 줄의 최대 진폭(세로, mm)–진동수(가로, Hz)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: 0, x1: 800, y0: 0, y1: 32, xt: [0, 200, 400, 600, 800], yt: [0, 10, 20, 30], ml: PHONE ? 38 : 44, mr: 14, mt: 10, mb: 24 });
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip(); ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); RES.forEach((a, i) => { const x = M.gx(i * 2), y = M.gy(Math.min(a, 32)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    d.found.forEach((ok, i) => { if (ok) { const f = FNR(i + 1); dot(M, f, Math.min(resAt(f), 31), '#0f766e', 6); D.label(M.gx(f) + (i === 2 ? 18 : 30), M.gy(Math.min(resAt(f), 31)) - 14, '정상파 ' + (i + 1), { bg: '#0f766e', size: 13 }); } });
    dot(M, d.fe, Math.min(resAt(d.fe), 31.5), ORANGE, 8);
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 40) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '🔎 지금 상태', 14, INK, 'left', 800);
    T(tx + 14, ty + 52, '진동수 f = ' + Math.round(d.fe) + ' Hz', 14.5, '#b45309', 'left', 800);
    T(tx + 14, ty + 78, '최대 진폭 = ' + mm(resAt(d.fe), 1) + ' mm', 14.5, GREEN_D, 'left', 800);
    T(tx + 14, ty + 104, '찾은 정상파: ' + d.found.filter(Boolean).length + ' / 3', 14.5, INK, 'left', 800);
    if (!PHONE) para(tx + 12, ty + 130, '특정한 진동수에서만 줄이 크게 떨려요. 그때 마디의 위치는 움직이지 않아요.', tw - 24, 13.5, MUTED, 19, 700);
  }
  function dot(M, x, y, col, r) { D.sphere(M.gx(x), M.gy(y), r || 6.5, col, { gloss: false }); }

  /* ================= ② 파장 조건 ================= */
  const LP = 70;                                                   // 그림의 세로 진폭(픽셀)
  function drawLamScene() {
    const c = topCard(), s = S.lam, Lm = s.L / 1000, n = s.n, lam = 2 * Lm / n; cardBegin(c);
    T(c.x + 14, c.y + 24, '양 끝이 고정된 줄의 정상파 (n = ' + n + ', 마디 ' + (n + 1) + '개)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const G = laneGeo(c, Lm, 0.65); lanePanel(G, { ygrid: false });
    const ph = Math.cos(TAU * 0.6 * S.clock);
    ctx.save(); ctx.beginPath(); ctx.rect(c.x + 8, G.top + 2, c.w - 16, G.hh - 4); ctx.clip();
    ctx.strokeStyle = 'rgba(37,99,235,.25)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    [1, -1].forEach((sg) => { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = Lm * i / 120, y = G.cy - sg * LP * Math.abs(Math.sin(n * Math.PI * x / Lm)); i ? ctx.lineTo(G.X(x), y) : ctx.moveTo(G.X(x), y); } ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 4.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 160; i++) { const x = Lm * i / 160, y = G.cy - LP * ph * Math.sin(n * Math.PI * x / Lm); i ? ctx.lineTo(G.X(x), y) : ctx.moveTo(G.X(x), y); } ctx.stroke(); ctx.restore();
    post(G.sx0 - 6, G.cy, -1, ''); post(G.sx1 + 6, G.cy, 1, '');
    // 마디
    for (let j = 0; j <= n; j++) { const x = j * Lm / n; ctx.strokeStyle = 'rgba(220,38,38,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.X(x), G.cy - LP - 8); ctx.lineTo(G.X(x), G.top + G.hh + 6); ctx.stroke(); ctx.setLineDash([]); D.sphere(G.X(x), G.cy, 6, '#dc2626', { gloss: false }); }
    // 이웃한 마디 사이 (λ/2)
    const bx0 = G.X(0), bx1 = G.X(Lm / n), by = G.top + 20;
    D.arrow(bx0 + 3, by, bx1 - 3, by, { color: '#7c3aed', width: 2.5, head: 8 }); D.arrow(bx1 - 3, by, bx0 + 3, by, { color: '#7c3aed', width: 2.5, head: 8 });
    D.label((bx0 + bx1) / 2, by - 4 + (n === 1 ? 0 : 0), '이웃한 마디 사이' + (s.show ? ' = λ/2 = ' + fx(lam / 2, 3) + ' m' : ''), { bg: '#7c3aed', size: 13 });
    laneRuler(G, Lm, 0.025);
    T(c.x + 14, c.y + c.h - 12, PHONE ? '빨간 점 = 마디, 눈금자는 m' : '느리게 본 모습이에요. 빨간 점이 마디(움직이지 않는 곳)이고, 눈금자는 m 단위예요.', PHONE ? 13 : 13.5, MUTED, 'left', 700);
    ctx.restore();
    // ---- 아래 패널: 파장 막대 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 24, '📏 같은 길이 L = ' + fx(Lm, 3) + ' m 줄에서 정상파의 파장 (가로: m)', 14, INK, 'left', 800);
    const bx = x1 + 70, bw = PW - 28 - 70 - (PHONE ? 6 : 190), by0 = PY + 52, rowH = PHONE ? 40 : 46, ppx = bw / 1.4;
    ctx.strokeStyle = 'rgba(120,135,160,.34)'; ctx.lineWidth = 1;
    for (let v = 0; v <= 1.4001; v += 0.2) { ctx.beginPath(); ctx.moveTo(bx + v * ppx, by0 - 8); ctx.lineTo(bx + v * ppx, by0 + 3 * rowH - 6); ctx.stroke(); T(bx + v * ppx, by0 + 3 * rowH + 12, v.toFixed(1), 13, '#3a465c', 'center', 800); }
    [1, 2, 3].forEach((k, i) => {
      const yy = by0 + i * rowH, lk = 2 * Lm / k, cur = k === n;
      T(x1, yy + 22, 'n = ' + k, 14, cur ? '#b45309' : INK, 'left', 800);
      D.roundRect(bx, yy + 4, Math.max(2, lk * ppx), 26, 8); ctx.fillStyle = cur ? ORANGE : '#9fb3d4'; ctx.fill();
      if (s.show) T(bx + lk * ppx + 8, yy + 23, 'λ = ' + fx(lk, 3) + ' m', 13.5, INK, 'left', 800);
    });
    if (!PHONE) {
      const tx = PW - 170, ty = PY + 40, tw = 176, th2 = PH - 54;
      D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
      T(tx + 12, ty + 26, '💡 정상파 조건', 14, INK, 'left', 800);
      if (s.show) { T(tx + 12, ty + 56, 'L = nλ/2', 17, '#1d4ed8', 'left', 800); T(tx + 12, ty + 84, 'λ = 2L/n', 17, '#1d4ed8', 'left', 800); para(tx + 12, ty + 106, '양 끝이 마디이므로 L은 반 파장의 정수배예요.', tw - 24, 13, MUTED, 18, 700); }
      else para(tx + 12, ty + 50, '이웃한 마디 사이의 거리를 눈금자로 재서 파장을 구해 봐요.', tw - 24, 13.5, MUTED, 19, 700);
    } else if (!s.show) para(x1, by0 + 3 * rowH + 34, '이웃한 마디 사이의 거리를 눈금자로 재서 파장을 구해 봐요.', PW - 28, 13.5, MUTED, 19, 700);
  }

  /* ================= ③ 진동수 ================= */
  const fqV = () => vOf(S.fq.T, S.fq.mu), fqF1 = () => f1Of(S.fq.L / 1000, S.fq.T, S.fq.mu);
  const fqBase = (f) => Math.abs(f.L - 500) < 1e-9 && f.T === 40 && f.mu === 1;
  function fqChanged() { const f = S.fq; return (f.L !== 500 ? 1 : 0) + (f.T !== 40 ? 1 : 0) + (f.mu !== 1 ? 1 : 0); }
  function drawFreqScene() {
    const c = topCard(), q = S.fq, Lm = q.L / 1000, f1 = fqF1(), hide = q.hide; cardBegin(c);
    T(c.x + 14, c.y + 24, '기본 진동수(n = 1)로 떠는 줄', PHONE ? 13.5 : 15, INK, 'left', 800);
    const G = laneGeo(c, Lm, 0.65), hh = PHONE ? 116 : 140; G.hh = hh; G.cy = G.top + hh / 2;
    D.roundRect(c.x + 6, G.top, c.w - 12, hh, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    const ph = Math.cos(TAU * 0.7 * S.clock), amp = PHONE ? 40 : 52;
    ctx.strokeStyle = GREEN; ctx.lineWidth = 4.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 140; i++) { const x = Lm * i / 140, y = G.cy - amp * ph * Math.sin(Math.PI * x / Lm); i ? ctx.lineTo(G.X(x), y) : ctx.moveTo(G.X(x), y); } ctx.stroke();
    post(G.sx0 - 6, G.cy, -1, ''); post(G.sx1 + 6, G.cy, 1, '');
    D.arrow(G.sx0, G.top + hh - 10, G.sx1, G.top + hh - 10, { color: '#475569', width: 2, head: 8 }); D.arrow(G.sx1, G.top + hh - 10, G.sx0, G.top + hh - 10, { color: '#475569', width: 2, head: 8 });
    D.label((G.sx0 + G.sx1) / 2, G.top + hh - 10, 'L = ' + fx(Lm, 3) + ' m · T = ' + q.T + ' N · μ = ' + fx(q.mu, 1) + ' g/m', { bg: '#475569', size: 13 });
    D.label(c.x + 16, G.top + 16, hide ? '📱 소리 센서: f₁ = ?' : '📱 소리 센서: f₁ = ' + fx(f1, 0) + ' Hz', { bg: hide ? '#64748b' : '#0f766e', size: 13, align: 'left' });
    // 스펙트럼
    const sy = G.top + hh + 10, sh = c.y + c.h - 10 - sy;
    const M = frame({ x: c.x + 8, y: sy, w: c.w - 16, h: sh }, { x0: 0, x1: 3000, y0: 0, y1: 1.7, xt: [0, 500, 1000, 1500, 2000, 2500, 3000], xf: (v) => v + '', yt: [], yl: false, ml: 12, mr: 34, mt: 8, mb: 22 });
    for (let h = 1; h * f1 <= 3000 + 1e-6; h++) {
      const x = M.gx(h * f1), a = 1 / h, hgt = a * M.ih / 1.7; ctx.fillStyle = h === 1 ? ORANGE : '#6d8fd0'; ctx.fillRect(x - 4, M.iy + M.ih - hgt, 8, hgt);
      if (h <= 3 && !hide) T(x, M.iy + M.ih - hgt - 5, fx(h * f1, 0), 13, '#334155', 'center', 800);
    }
    T(M.ix + M.iw + 22, M.iy + M.ih + 17, 'Hz', 13, MUTED, 'center', 800);
    T(M.ix + 8, M.iy + 15, '소리의 진동수 스펙트럼: 기본음 f₁과 2f₁, 3f₁ … (배음)', 13, MUTED, 'left', 800);
    ctx.restore();
    // ---- 아래 패널 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 330, gh = PHONE ? 130 : PH - 46;
    T(x1, PY + 22, '📈 f₁(세로, Hz)–길이 L(가로, m)', 14, INK, 'left', 800);
    const M2 = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: 0.2, x1: 0.7, y0: 0, y1: 900, xt: [0.3, 0.4, 0.5, 0.6, 0.7], xf: (v) => v.toFixed(1), yt: [0, 200, 400, 600, 800], ml: PHONE ? 42 : 46, mr: 12, mt: 10, mb: 24 });
    plotF(M2, (L) => f1Of(L, T0, MU0), 0.25, 0.65, '#9fb3d4', 2.6, [6, 4]);
    if (!fqBase({ L: 500, T: q.T, mu: q.mu })) plotF(M2, (L) => f1Of(L, q.T, q.mu), 0.25, 0.65, GREEN, 3.4);
    if (q.rec.L) { const r = q.rec.L; dot(M2, r.L / 1000, r.f1, '#0f766e', 5.5); }
    dot(M2, Lm, f1, ORANGE, 7.5);
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34, th2 = PHONE ? PH - (gh + 40) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 22, '📋 기록한 측정 (하나씩만 바꿔요)', 14, INK, 'left', 800);
    const cx = [tx + 12, tx + 12 + tw * 0.34, tx + 12 + tw * 0.62, tx + 12 + tw * 0.84];
    ['바꾼 것', '값', 'f₁', '배율'].forEach((h, i) => T(cx[i], ty + 46, h, 13, MUTED, 'left', 800));
    const base = f1Of(L0, T0, MU0);
    const rows = [['기준', 'L 0.50 m·40 N·1.0', base, 1], ['L', q.rec.L ? fx(q.rec.L.L / 1000, 3) + ' m' : null, q.rec.L && q.rec.L.f1, q.rec.L && q.rec.L.f1 / base], ['T', q.rec.T ? q.rec.T.T + ' N' : null, q.rec.T && q.rec.T.f1, q.rec.T && q.rec.T.f1 / base], ['μ', q.rec.mu ? fx(q.rec.mu.mu, 1) + ' g/m' : null, q.rec.mu && q.rec.mu.f1, q.rec.mu && q.rec.mu.f1 / base]];
    rows.forEach((r, i) => {
      const yy = ty + 72 + i * 26;
      T(cx[0], yy, r[0], 13.5, INK, 'left', 800);
      if (i === 0) { T(cx[1], yy, 'L, T, μ', 13, MUTED, 'left', 700); } else T(cx[1], yy, r[1] || '—', 13.5, r[1] ? INK : '#9aa6bd', 'left', 800);
      T(cx[2], yy, r[2] ? fx(r[2], 0) : '—', 13.5, r[2] ? '#0f766e' : '#9aa6bd', 'left', 800); T(cx[3], yy, r[3] ? '×' + fx(r[3], 2) : '—', 13.5, r[3] ? '#6d28d9' : '#9aa6bd', 'left', 800);
    });
    if (!PHONE) para(tx + 12, ty + 72 + 4 * 26 + 6, fqChanged() === 0 ? '기준: v = 200 m/s, f₁ = 200 Hz예요.' : fqChanged() === 1 ? '하나만 바꿨어요. 📝 기록을 눌러 표에 적어요.' : '한 번에 하나만 바꿔야 효과를 알 수 있어요.', tw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ================= ④ 현악기 ================= */
  const LG = 0.65, MUG = 0.40, F0G = 330;                           // 기타 1번 줄 (E4): 길이 0.65 m, 0.40 g/m, 목표 330 Hz
  const insT = () => S.ins.T20 / 20, insLeff = () => LG - S.ins.xf / 1000;
  const insVf = () => vOf(insT(), MUG);
  const insF = () => insVf() / (2 * insLeff()) * (S.ins.harm ? 2 : 1);
  const insF1open = () => insVf() / (2 * LG);
  const insRatio = () => insF() / F0G;
  const intervalName = (r) => (Math.abs(r - 2) <= 0.02 ? '옥타브 (2 : 1)' : Math.abs(r - 1.5) <= 0.015 ? '5도 (3 : 2)' : Math.abs(r - 4 / 3) <= 0.0135 ? '4도 (4 : 3)' : null);
  const STRINGS = [['1번', 'E4', 330, 0.40], ['2번', 'B3', 247, 0.64], ['3번', 'G3', 196, 1.0], ['4번', 'D3', 147, 1.6], ['5번', 'A2', 110, 3.5], ['6번', 'E2', 82, 6.0]];
  function drawInstScene() {
    const c = topCard(), s = S.ins; cardBegin(c);
    T(c.x + 14, c.y + 24, PHONE ? '🎸 기타 1번 줄 (E4)' : '🎸 기타 1번 줄 (E4): 길이 0.65 m, 단위 길이당 질량 0.40 g/m', PHONE ? 13.5 : 15, INK, 'left', 800);
    const left = PHONE ? 40 : 70, right = PHONE ? 24 : 50, ppm = (c.w - left - right) / LG, nx0 = c.x + left, nx1 = nx0 + LG * ppm, cy = c.y + (PHONE ? 130 : 140);
    const X = (m) => nx0 + m * ppm, Leff = insLeff(), xf = s.xf / 1000;
    // 지판
    D.shadow(() => { D.roundRect(nx0 - 10, cy - 46, LG * ppm + 20, 92, 10); const g = ctx.createLinearGradient(0, cy - 46, 0, cy + 46); g.addColorStop(0, '#c08a55'); g.addColorStop(1, '#8a5a2b'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    for (let k = 1; k <= 12; k++) { const xm = LG * (1 - Math.pow(2, -k / 12)); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(xm), cy - 44); ctx.lineTo(X(xm), cy + 44); ctx.stroke(); if (k === 5 || k === 7 || k === 12) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(X(LG * (1 - Math.pow(2, -(k - 0.5) / 12))), cy + 34, 3.5, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(nx0 - 4, cy - 46, 7, 92); ctx.fillStyle = '#334155'; ctx.fillRect(nx1 - 2, cy - 46, 8, 92);
    T(nx0, cy - 56, '너트', 13, MUTED, 'center', 800); T(nx1 + 2, cy - 56, '브리지', 13, MUTED, 'center', 800);
    // 줄 (누른 곳에서 브리지까지만 울려요)
    const ph = Math.cos(TAU * 0.9 * S.clock), amp = 15, mode = s.harm ? 2 : 1;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(nx0, cy); ctx.lineTo(X(xf), cy); ctx.stroke();
    ctx.strokeStyle = '#fff7d6'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const x = xf + Leff * i / 120, y = cy - amp * ph * Math.sin(mode * Math.PI * (x - xf) / Leff); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); } ctx.stroke();
    // 손가락
    const fxp = X(xf);
    D.sphere(fxp, cy, 9, xf > 0 ? '#f59e0b' : 'rgba(245,158,11,.35)', { gloss: true });
    if (xf > 0) D.label(fxp, cy - (s.harm && PHONE ? 80 : 64), PHONE ? '누른 곳' : '누른 곳 (마디)', { bg: '#b45309', size: 13 });
    // 마디 표시 (정상파의 마디: 손가락·브리지·가운데)
    const nodes = [xf, xf + Leff]; if (s.harm) nodes.push(xf + Leff / 2);
    nodes.forEach((nxm) => { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(X(nxm), cy + 60, 5, 0, TAU); ctx.fill(); }); T(X(xf + Leff) - 8, cy + 78, '마디', 13, '#b91c1c', 'right', 800);
    if (s.harm) D.label(X(xf + Leff / 2), cy - 64, PHONE ? '🖐 가운데' : '🖐 가운데를 가볍게 (여기가 마디)', { bg: '#7c3aed', size: 13 });
    // 프렛 번호
    [5, 7, 12].forEach((k) => { const xm = LG * (1 - Math.pow(2, -k / 12)); T(X(xm), c.y + c.h - 40, k + '', 13, MUTED, 'center', 800); }); T(nx0, c.y + c.h - 40, '0', 13, MUTED, 'center', 800); T(c.x + c.w - 12, c.y + c.h - 40, '프렛 번호', 13, MUTED, 'right', 700);
    const f = insF();
    D.label(c.x + c.w - 14, c.y + 24, '🔩 장력 T = ' + fx(insT(), 1) + ' N', { bg: '#475569', size: 13, align: 'right' });
    T(c.x + 14, c.y + c.h - 14, '울리는 길이 L = ' + fx(Leff, 3) + ' m' + (s.harm ? (PHONE ? ' (n = 2)' : ' (가운데가 마디라 n = 2)') : ' (n = 1)') + ' · 소리 센서 f = ' + fx(f, 0) + ' Hz', PHONE ? 12.5 : 14, INK, 'left', 800);
    S.hit = { neck: { x0: nx0, x1: nx1, cy, ppm } };
    ctx.restore();
    // ---- 아래 패널 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, mw = PHONE ? PW - 24 : 380;
    let yy = PY + 26;
    if (revealed('tune')) {
      T(x1, yy, '🎯 조율 (목표 E4 = 330 Hz)', 14, INK, 'left', 800);
      const bx = x1 + 6, bw = mw - 12, by = yy + 24, lo = 280, hi = 380, gx2 = (v) => bx + bw * (clamp(v, lo, hi) - lo) / (hi - lo);
      D.roundRect(bx, by, bw, 18, 9); ctx.fillStyle = '#e4e9f3'; ctx.fill(); ctx.fillStyle = 'rgba(20,160,88,.55)'; ctx.fillRect(gx2(327), by, gx2(333) - gx2(327), 18);
      [280, 300, 330, 360, 380].forEach((v) => { ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx2(v), by + 18); ctx.lineTo(gx2(v), by + 23); ctx.stroke(); T(gx2(v), by + 38, v + '', 13, '#3a465c', v === 280 ? 'left' : v === 380 ? 'right' : 'center', 800); });
      const fm = s.harm || s.xf > 0 ? null : f; if (fm != null) D.sphere(gx2(fm), by + 9, 9, Math.abs(fm - F0G) <= 3 ? GREEN : ORANGE, { gloss: true });
      T(x1 + mw / 2, by + 62, fm == null ? '조율은 줄을 누르지 않고 열린 줄로 해요' : 'f = ' + fx(f, 1) + ' Hz → ' + (Math.abs(f - F0G) <= 3 ? '맞아요! 🎉' : f < F0G ? '낮아요 ↑ 장력을 올려요' : '높아요 ↓ 장력을 내려요'), 14, fm != null && Math.abs(f - F0G) <= 3 ? GREEN_D : INK, 'center', 800);
      yy += 112;
    }
    if (revealed('fret')) {
      T(x1, yy, '🎵 열린 줄(330 Hz)과의 음높이 비 f / f₀', 14, INK, 'left', 800);
      const bx = x1 + 6, bw = mw - 12, by = yy + 22, gx2 = (r) => bx + bw * (Math.log2(clamp(r, 1, 2.1)) / Math.log2(2.1));
      D.roundRect(bx, by, bw, 18, 9); ctx.fillStyle = '#e4e9f3'; ctx.fill();
      [[1, '같은 음'], [4 / 3, '4도'], [1.5, '5도'], [2, '옥타브']].forEach((q) => { const x = gx2(q[0]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, by - 3); ctx.lineTo(x, by + 21); ctx.stroke(); T(x, by + 40, q[1], 13, '#6d28d9', q[0] === 1 ? 'left' : 'center', 800); });
      const r = insRatio(); D.sphere(gx2(r), by + 9, 8, ORANGE, { gloss: true });
      const nm = intervalName(r);
      T(x1 + mw / 2, by + 66, 'f / f₀ = ' + fx(r, 2) + (nm ? ' → ' + nm : ''), 14, nm ? '#6d28d9' : INK, 'center', 800);
      yy += 100;
    }
    if (!revealed('tune') && !revealed('fret')) T(x1, yy, '🎸 줄을 울리는 길이와 장력이 음높이를 정해요', 14, INK, 'left', 800);
    // 기타 6줄 표
    const tx = PHONE ? x1 : x1 + mw + 14, ty = PHONE ? yy - 6 : PY + 12, tw = PHONE ? PW - 24 : PW - mw - 38, th2 = PHONE ? PY + PH - 12 - (yy - 6) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 22, '🎸 기타 6줄 모형 (L = 0.65 m)', 14, INK, 'left', 800);
    const cxs = [tx + 12, tx + 12 + tw * 0.2, tx + 12 + tw * 0.4, tx + 12 + tw * 0.62, tx + 12 + tw * 0.8];
    ['줄', '음', 'f₁(Hz)', 'μ(g/m)', 'T(N)'].forEach((h, i) => T(cxs[i], ty + 44, h, 13, MUTED, 'left', 800));
    STRINGS.forEach((r, i) => { const T2 = r[3] * 1e-3 * Math.pow(2 * LG * r[2], 2), y2 = ty + 66 + i * 22; [r[0], r[1], r[2] + '', fx(r[3], 2), fx(T2, 0)].forEach((v, k) => T(cxs[k], y2, v, 13, i === 0 ? '#b45309' : INK, 'left', 800)); });
    if (!PHONE && th2 > 66 + 6 * 22 + 36) para(tx + 12, ty + 66 + 6 * 22 + 6, '굵은 줄(μ 큼)일수록 낮은 음이에요. 가야금은 안족을 옮겨 울리는 길이를 바꿔요.', tw - 24, 13, MUTED, 18, 700);
  }

  /* ================= 컨트롤 연결 ================= */
  function updateCtl() {
    const modes = allowedModes(), d = S.dr;
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        const sh = n.getAttribute('data-show'); if (sh && !revealed(sh)) on = false;
        const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    syncDrive();
    $('#bSweep').textContent = d.sweep ? '■ 멈추기' : '▶ 천천히 올리기'; $('#bSweep').classList.toggle('btn-primary', !d.sweep);
    $('#bParts').textContent = d.parts ? '입사·반사파 숨기기' : '입사·반사파 보이기'; $('#bParts').classList.toggle('btn-primary', !d.parts);
    $('#nDr').textContent = '진동수를 천천히 올리면서 줄이 크게 떨리는 순간을 찾아요. 크게 떨릴 때 마디의 위치를 잘 봐요.';
    const l = S.lam; pickOn($$('#nSeg button'), 'n', l.n); setSl('sLl', l.L, 250, 650); $('#oLl').textContent = fx(l.L / 1000, 3) + ' m';
    $('#nLam').textContent = '빨간 점(마디)의 간격을 눈금자로 재요. 줄의 길이 L을 바꾸면 같은 n에서도 파장이 달라져요.';
    const q = S.fq; setSl('sFl', q.L, 250, 650); $('#oFl').textContent = fx(q.L / 1000, 3) + ' m'; pickOn($$('#tSeg button'), 't', q.T); pickOn($$('#muSeg button'), 'm', q.mu);
    $('#nFq').textContent = q.hide ? '소리 센서의 숫자는 가려져 있어요. v = √(T/μ)와 f₁ = v/(2L)로 계산해요 (1.0 g/m = 1.0 × 10⁻³ kg/m).' : '한 번에 하나씩만 바꾸고 📝 기록을 눌러 기준(200 Hz)과 비교해요.';
    const s = S.ins; setSl('sIT', s.T20, 600, 2200); $('#oIT').textContent = fx(insT(), 1) + ' N'; setSl('sIF', Math.round(s.xf / 5), 0, 65); $('#oIF').textContent = fx(s.xf / 10, 1) + ' cm';
    $('#bHarm').classList.toggle('btn-primary', s.harm); $('#bHarm').textContent = s.harm ? '🖐 손가락 떼기 (가운데 대기 해제)' : '🖐 줄의 가운데를 가볍게 대기';
    $('#nInst').textContent = '장력(조율 나사)을 돌리면 v = √(T/μ)가 달라지고, 줄을 누르면 울리는 길이가 줄어요.';
  }
  function syncDrive() { const d = S.dr; setSl('sDf', Math.round(d.f / 2) * 2, 0, 800); $('#oDf').textContent = Math.round(d.f) + ' Hz'; }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sDf').addEventListener('input', (e) => { S.dr.f = +e.target.value; S.dr.sweep = false; updateCtl(); });
  $('#bSweep').addEventListener('click', () => { Sound.click(); const d = S.dr; if (d.sweep) d.sweep = false; else { if (d.f >= 780) d.f = 0; d.sweep = true; } updateCtl(); });
  $('#bParts').addEventListener('click', () => { Sound.click(); S.dr.parts = !S.dr.parts; updateCtl(); });
  $$('#jumpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.dr.f = FNR(+b.dataset.n); S.dr.sweep = false; updateCtl(); }));
  $$('#nSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.lam.n = +b.dataset.n; updateCtl(); }));
  $('#sLl').addEventListener('input', (e) => { S.lam.L = +e.target.value; updateCtl(); });
  $('#sFl').addEventListener('input', (e) => { S.fq.L = +e.target.value; updateCtl(); });
  $$('#tSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fq.T = +b.dataset.t; updateCtl(); }));
  $$('#muSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fq.mu = +b.dataset.m; updateCtl(); }));
  $('#bRecF').addEventListener('click', () => {
    Sound.click(); const q = S.fq, n = fqChanged();
    if (n === 0) { showHint('기준 상태예요. 길이, 장력, 굵기 중 하나를 바꾼 뒤 기록해요.', 2800); return; }
    if (n > 1) { showHint('한 번에 하나만 바꿔야 어떤 것의 효과인지 알 수 있어요.', 2800); return; }
    const f1 = fqF1();
    if (q.L !== 500) q.rec.L = { L: q.L, f1 }; else if (q.T !== 40) q.rec.T = { T: q.T, f1 }; else q.rec.mu = { mu: q.mu, f1 };
    Sound.success(); showHint('기록했어요: 기본 진동수 ' + fx(f1, 0) + ' Hz', 2400); updateCtl();
  });
  $('#bBaseF').addEventListener('click', () => { Sound.click(); S.fq.L = 500; S.fq.T = 40; S.fq.mu = 1; updateCtl(); });
  $('#bHearF').addEventListener('click', () => { Sound.tone(clamp(fqF1(), 60, 1600), 0.9, 'triangle', 0.1); });
  $('#sIT').addEventListener('input', (e) => { S.ins.T20 = +e.target.value; updateCtl(); });
  $('#sIF').addEventListener('input', (e) => { S.ins.xf = +e.target.value * 5; updateCtl(); });
  $('#bHarm').addEventListener('click', () => { Sound.click(); S.ins.harm = !S.ins.harm; updateCtl(); });
  $('#bHearI').addEventListener('click', () => { Sound.tone(clamp(insF(), 60, 1600), 0.9, 'triangle', 0.1); });
  ['iA1', 'iA2', 'iA3', 'iN1', 'iN2', 'iN3', 'iW1', 'iW2', 'iW3', 'iW4', 'iFv', 'iFf'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  SciSim.pointer(view, {
    down(p) {
      const h = S.hit; if (!h || S.mode !== 'inst' || !h.neck || !revealed('fret')) return false;
      const n = h.neck; if (p.x < n.x0 - 14 || p.x > n.x1 + 6 || Math.abs(p.y - n.cy) > 54) return false;
      S.drag = true; S.ins.xf = clamp(Math.round((p.x - n.x0) / n.ppm * 1000 / 5) * 5, 0, 325); updateCtl(); return true;
    },
    move(p) { const h = S.hit; if (!S.drag || !h || !h.neck) return; const n = h.neck; S.ins.xf = clamp(Math.round((p.x - n.x0) / n.ppm * 1000 / 5) * 5, 0, 325); updateCtl(); },
    up() { S.drag = false; },
    hover(p) { const h = S.hit; return S.mode === 'inst' && h && h.neck && revealed('fret') && p.x > h.neck.x0 - 14 && p.x < h.neck.x1 + 6 && Math.abs(p.y - h.neck.cy) < 54 ? 'ew-resize' : null; },
  });

  /* ---------- 시뮬레이션 갱신 ---------- */
  function simStep(dt) {
    const d = S.dr;
    if (d.sweep) {
      const near = Math.min.apply(null, [1, 2, 3].map((n) => Math.abs(d.f - FNR(n))));
      d.f = Math.min(800, d.f + (near < 12 ? 6 : 28) * dt);
      if (d.f >= 800) { d.f = 800; d.sweep = false; updateCtl(); } else syncDrive();
    }
    d.fe = RM || Math.abs(d.fe - d.f) < 0.05 ? d.f : SciSim.approach(d.fe, d.f, dt, 10);
    [1, 2, 3].forEach((n) => {
      const i = n - 1;
      if (Math.abs(d.f - FNR(n)) <= 4 && Math.abs(d.fe - d.f) < 3) { d.dwell[i] += dt; if (d.dwell[i] >= 0.6 && !d.found[i]) { d.found[i] = true; Sound.success(); if (d.found.every(Boolean)) S.flags.jump = true; updateCtl(); } }
      else d.dwell[i] = Math.max(0, d.dwell[i] - dt * 2);
    });
    const s = S.ins;
    if (S.mode === 'inst' && !s.harm) {
      const r = insRatio();
      s.hold5 = Math.abs(r - 1.5) <= 0.015 ? s.hold5 + dt : 0; s.holdOct = Math.abs(r - 2) <= 0.02 ? s.holdOct + dt : 0;
      if (s.hold5 >= 0.6 && !s.got5) { s.got5 = true; Sound.success(); } if (s.holdOct >= 0.6 && !s.gotOct) { s.gotOct = true; Sound.success(); }
    }
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'drive') { const d = S.dr; L1 = '진동수 f'; a = Math.round(d.fe) + ' Hz'; L2 = '최대 진폭'; b = mm(resAt(d.fe), 1) + ' mm'; L3 = '찾은 정상파'; c = d.found.filter(Boolean).length + ' / 3'; }
    else if (m === 'lam') { const l = S.lam; L1 = '정상파 번호 n'; a = 'n = ' + l.n + ' (마디 ' + (l.n + 1) + '개)'; L2 = '줄의 길이 L'; b = fx(l.L / 1000, 3) + ' m'; L3 = '파장 λ'; c = l.show ? fx(2 * l.L / 1000 / l.n, 3) + ' m' : '?'; }
    else if (m === 'freq') { const q = S.fq; L1 = '줄의 속력 v'; a = q.hide ? '?' : fx(fqV(), 0) + ' m/s'; L2 = '기본 진동수 f₁'; b = q.hide ? '?' : fx(fqF1(), 0) + ' Hz'; L3 = '기준과의 비'; c = q.hide ? '?' : '×' + fx(fqF1() / f1Of(L0, T0, MU0), 2); }
    else { const s = S.ins; L1 = '울리는 길이 L'; a = fx(insLeff(), 3) + ' m'; L2 = '소리 센서 f'; b = fx(insF(), 0) + ' Hz'; L3 = '열린 줄과의 비'; c = fx(insRatio(), 2); }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1e.textContent = a; l2.textContent = L2; v2e.textContent = b; l3.textContent = L3; v3e.textContent = c;
  }

  /* ================= 미션 ================= */
  const resetDrive = () => { Object.assign(S.dr, { f: 0, fe: 0, found: [false, false, false], dwell: [0, 0, 0], sweep: false, parts: true, countOK: false }); };
  const resetFq = () => { Object.assign(S.fq, { L: 500, T: 40, mu: 1, rec: {}, hide: false }); };
  const resetIns = (T20) => { Object.assign(S.ins, { T20: T20 || 1000, xf: 0, harm: false, got5: false, gotOct: false, hold5: 0, holdOct: 0 }); };
  const levels = [
    {
      title: '정상파: 고정된 줄의 공명', short: '정상파', icon: '〰', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 기타 줄은 한 번 튕기면 왜 특정한 높이의 소리만 날까? 줄의 길이를 줄이면 음이 높아지는 까닭은?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 탄성파의 반사와 투과에서</b> 고정단에서 펄스가 뒤집혀 돌아오고, 입사파와 반사파가 만나 겹치는 것을 봤어요. <b>탄성파의 진행에서</b>는 v = fλ와 줄의 속력 v = √(T/μ)를 알아냈어요. 이번에는 양 끝이 고정된 줄에서 두 파가 겹쳐 만드는 <b>정상파</b>를 찾아요.</div>' +
        '<p>길이 0.50 m인 줄의 왼쪽 끝을 <b>진동 발생기</b>로 흔들어요. 진동수를 0부터 천천히 올리며 줄이 크게 떨리는 진동수를 찾고, 입사파(파랑)와 반사파(주황)가 겹친 합성파(초록)를 살펴봐요.</p>',
      features: ['drive'],
      setup() { resetFlags(); resetDrive(); setScene('drive'); updateCtl(); },
      recap: '양 끝이 고정된 줄은 특정한 진동수(200, 400, 600 Hz)에서만 크게 떨리는 정상파를 만들어요. 정상파는 입사파와 반사파가 겹친 것이고, 마디의 위치는 움직이지 않아요.',
      summary: '<ul><li><b>정상파</b>: 서로 반대로 진행하는 같은 진동수의 두 파(입사파 + 반사파)가 겹쳐서 만드는, 제자리에서 진동하는 파동이에요.</li>' +
        '<li><b>마디</b>(진폭 0, 위치가 고정)와 <b>배</b>(진폭이 최대인 곳)가 번갈아 있고, 이웃한 마디 사이의 거리는 <b>λ/2</b>예요.</li>' +
        '<li>양 끝이 고정된 길이 0.50 m의 줄(v = 200 m/s)은 <b>200 Hz, 400 Hz, 600 Hz</b>에서 배가 1, 2, 3개인 정상파가 생기고, 다른 진동수에서는 작게만 떨려요(공명).</li>' +
        '<li>n번째 정상파는 배가 n개, 마디가 (n + 1)개(양 끝 포함)예요.</li>' +
        '<li>정상파는 파동이 멈춘 것이 아니에요. 에너지는 이웃한 마디 사이에서만 오가고 마디를 넘어 이동하지 않아요.</li></ul>',
      missions: [
        {
          title: '정상파가 생기는 진동수 3개 찾기',
          goal: '진동수를 0부터 천천히 올리며 줄이 <b>크게 떨리는 진동수 3개</b>를 찾아요. 크게 떨리는 곳에서 잠시 머물러요.',
          hint: '▶ 천천히 올리기를 눌러 보세요. 오른쪽 아래 그래프의 봉우리가 크게 떨리는 진동수예요. 봉우리 근처에서 0.6초쯤 머물면 찾은 것으로 표시돼요.',
          setup() { resetFlags(); resetDrive(); setScene('drive'); updateCtl(); },
          check: () => S.dr.found.every(Boolean),
          hold: 0.4,
          status: () => S.dr.found.map((ok, i) => mark(ok) + ' ' + (i + 1) + '번째').join(' &nbsp; ') + ' &nbsp; (지금 ' + Math.round(S.dr.f) + ' Hz)',
          explain: '줄이 크게 떨리는 진동수는 <b>200 Hz, 400 Hz, 600 Hz</b>예요. 이때 입사파와 반사파가 겹쳐 마디와 배가 고정된 정상파가 되고, 그 사이 진동수에서는 작고 불규칙하게 떨려요.',
        },
        {
          title: '정상파의 배와 마디 세기', manual: true,
          goal: '🔖 찾은 정상파로 가서 <b>배</b>(가장 크게 떠는 곳)와 <b>마디</b>(움직이지 않는 곳)의 개수를 세어 입력하고 ✔ 확인하기를 누르세요. <b>양 끝의 고정된 점도 마디</b>예요.',
          hint: '합성파(초록)만 보려면 입사·반사파 숨기기를 눌러요. 마디는 항상 제자리에 있어요. 첫 번째 정상파에서 배는 1개예요.',
          setup() { resetFlags(); resetDrive(); S.dr.found = [true, true, true]; S.dr.f = FNR(1); S.dr.fe = FNR(1); clr('iA1', 'iA2', 'iA3', 'iN1', 'iN2', 'iN3'); setFlag('jump', true); setFlag('count', true); setScene('drive'); updateCtl(); },
          check() {
            const A = [1, 2, 3].map((i) => num('iA' + i)), N = [1, 2, 3].map((i) => num('iN' + i));
            if (A.concat(N).some((v) => v == null)) return '여섯 칸을 모두 입력해 주세요.';
            const oks = [0, 1, 2].map((i) => A[i] === i + 1 && N[i] === i + 2);
            [1, 2, 3].forEach((n) => { fb([[$('#iA' + n), A[n - 1] === n], [$('#iN' + n), N[n - 1] === n + 1]]); });
            if (oks.every(Boolean)) { S.dr.countOK = true; S.flags.marks = true; return true; }
            if (N.some((v, i) => v === i + 1)) return '줄의 양 끝(고정된 점)도 마디예요. 마디는 (배의 개수 + 1)개예요.';
            if (A.some((v, i) => v === i + 2)) return '배는 크게 떨리는 곳, 마디는 움직이지 않는 곳이에요. 서로 바뀌지 않았는지 확인해요.';
            return 'n번째 정상파는 배가 n개예요. 합성파를 보며 다시 세어 봐요.';
          },
          status: () => '입력 배 ' + [1, 2, 3].map((i) => $('#iA' + i).value.trim() || '—').join('/') + ' · 마디 ' + [1, 2, 3].map((i) => $('#iN' + i).value.trim() || '—').join('/'),
          explain: '첫 번째 정상파(200 Hz)는 배 1개·마디 2개, 두 번째(400 Hz)는 배 2개·마디 3개, 세 번째(600 Hz)는 배 3개·마디 4개예요. n번째 정상파에서 <b>배 n개, 마디 (n + 1)개</b>(양 끝 포함)이고 마디의 위치는 움직이지 않아요.',
        },
        {
          type: 'quiz', title: '정상파는 파동이 멈춘 것일까?',
          goal: '정상파에 대한 설명으로 알맞은 것은?',
          setup() { resetFlags(); resetDrive(); S.dr.found = [true, true, true]; S.dr.f = FNR(2); S.dr.fe = FNR(2); setFlag('jump', true); S.flags.marks = true; setScene('drive'); updateCtl(); },
          choices: ['정상파는 파동이 멈춘 것이라 에너지가 없어요', '정상파는 반대로 진행하는 두 파가 겹친 것이고, 마디는 항상 정지해 있어서 에너지가 이웃한 마디 사이에서만 진동해요', '정상파에서는 줄의 모든 점이 같은 진폭으로 진동해요', '정상파의 마디는 시간이 지나면서 줄을 따라 이동해요'],
          answer: 1,
          feedback: ['정상파도 줄이 계속 진동하고 있어서 에너지가 있어요. 파가 앞으로 나아가지 않을 뿐이에요.', '', '점마다 진폭이 달라요. 마디는 0이고 배는 최대예요.', '마디의 위치는 줄 위에서 움직이지 않아요. 입사파와 반사파가 만나 위치가 고정돼요.'],
          explain: '입사파와 반사파가 겹치면 어떤 점은 항상 진폭이 0(<b>마디</b>)이 되고 어떤 점은 최대(<b>배</b>)가 돼요. 파가 한 방향으로 나아가지 않아서 <b>정상</b>파라고 하지만 줄은 계속 진동해요. 에너지는 이웃한 마디 사이에서 운동 에너지와 탄성 위치 에너지로 바뀌며 오가고 마디를 넘어가지 않아요.',
        },
      ],
    },
    {
      title: '파장 조건: L = nλ/2', short: '파장 조건', icon: '📏', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 줄이 200, 400, 600 Hz에서 배가 1, 2, 3개인 정상파를 만든다는 것을 알았어요. 고정된 양 끝은 반드시 <b>마디</b>예요. 그러면 줄의 길이 L과 파장 λ는 어떤 관계일까요?</div>' +
        '<p>정상파의 번호 n(배의 개수)과 줄의 길이 L을 바꾸며 <b>이웃한 마디 사이의 거리</b>를 눈금자로 재고, 파장과 길이의 관계를 찾아요. 빨간 점이 마디예요.</p>',
      features: ['lam'],
      setup() { resetFlags(); S.lam.n = 1; S.lam.L = 500; S.lam.show = false; setScene('lam'); updateCtl(); },
      recap: '양 끝이 고정된 줄에서 정상파가 되려면 L = nλ/2, 즉 λ = 2L/n (n = 1, 2, 3 …)이어야 해요. L = 0.50 m이면 λ는 1.0 m, 0.50 m, 0.33 m예요.',
      summary: '<ul><li>양 끝이 고정되어 마디이므로 줄의 길이는 <b>반 파장의 정수배</b>: <b>L = nλ/2</b> (n = 1, 2, 3 …).</li>' +
        '<li>파장 <b>λ<sub>n</sub> = 2L/n</b>. L = 0.50 m: λ₁ = 1.0 m, λ₂ = 0.50 m, λ₃ = 0.33 m. L = 0.375 m, n = 2: λ = 0.375 m.</li>' +
        '<li>이웃한 마디 사이의 거리는 λ/2예요. 마디가 2개 늘어나면 n이 2 커져요.</li>' +
        '<li>줄의 길이가 반드시 한 파장일 필요는 없어요. 줄이 짧을수록 같은 n의 파장이 짧아져요.</li></ul>',
      missions: [
        {
          title: '정상파의 파장 구하기', manual: true,
          goal: 'L = 0.50 m에서 n = 1, 2, 3인 정상파의 <b>파장 λ</b>를 구하고, 마지막 칸에는 <b>L = 0.375 m, n = 2</b>의 파장을 입력해 ✔ 확인하기를 누르세요. (단위 m)',
          hint: '이웃한 마디 사이의 거리가 λ/2이거나 L = nλ/2에서 λ = 2L/n이에요. 마지막 칸은 줄의 길이를 0.375 m로 바꿔 눈금자로 확인해 봐요.',
          setup() { resetFlags(); S.lam.n = 1; S.lam.L = 500; S.lam.show = false; clr('iW1', 'iW2', 'iW3', 'iW4'); setFlag('lamIn', true); setScene('lam'); updateCtl(); },
          check() {
            const v = [1, 2, 3, 4].map((i) => num('iW' + i)); if (v.some((x) => x == null)) return '네 칸을 모두 입력해 주세요 (m).';
            const ans = [[1.0, 0.03], [0.5, 0.02], [1 / 3, 0.015], [0.375, 0.015]], oks = ans.map((a, i) => near(v[i], a[0], a[1]));
            fb([1, 2, 3, 4].map((i) => [$('#iW' + i), oks[i - 1]]));
            if (oks.every(Boolean)) { S.lam.show = true; return true; }
            if (near(v[0], 0.5, 0.03)) return 'n = 1이면 줄 전체가 반 파장(λ/2)이에요. 그래서 λ는 L의 2배예요.';
            if (!oks[2] && near(v[2], 0.5, 0.02)) return 'n이 커질수록 파장은 짧아져요. λ = 2L/n에서 n = 3을 넣어 보세요.';
            return 'λ = 2L/n을 써 봐요. L = 0.50 m일 때 n = 1, 2, 3이고, 마지막은 L = 0.375 m, n = 2예요.';
          },
          status: () => '입력 ' + [1, 2, 3, 4].map((i) => $('#iW' + i).value.trim() || '—').join(' / ') + ' m',
          explain: 'λ = 2L/n이므로 L = 0.50 m에서 λ₁ = <b>1.0 m</b>, λ₂ = <b>0.50 m</b>, λ₃ = <b>0.33 m</b>이고, L = 0.375 m, n = 2에서는 λ = 2 × 0.375 / 2 = <b>0.375 m</b>예요. 눈금자로 이웃한 마디 사이(λ/2)를 재서 2배 해도 같아요.',
        },
        {
          type: 'quiz', title: '마디가 2개 더 생기면 파장은?',
          goal: '길이 L인 줄에서 n = 1(마디 2개)인 정상파에서 <b>마디가 2개 더 생겨</b> n = 3(마디 4개)이 되었어요. 파장은 처음의 몇 배일까요?',
          setup() { resetFlags(); S.lam.n = 3; S.lam.L = 500; S.lam.show = true; setScene('lam'); updateCtl(); },
          choices: ['3배로 늘어나요', '1/3로 줄어요', '1/2로 줄어요', '줄의 길이가 한 파장이어야 하므로 그대로예요'],
          answer: 1,
          feedback: ['n이 커질수록 이웃한 마디 사이(λ/2)가 짧아져서 파장은 짧아져요.', '', 'λ = 2L/n이므로 n이 1에서 3으로 3배가 되면 파장은 1/3이에요. 마디가 2개 늘어난다고 파장이 1/2이 되는 것이 아니에요.', '줄의 길이가 한 파장일 필요는 없어요. L은 반 파장(λ/2)의 정수배(L = nλ/2)이면 돼요.'],
          explain: 'L = nλ/2에서 L이 같으면 λ = 2L/n이에요. n이 1에서 3이 되면 파장은 <b>1/3</b>로 줄어요(2L → 2L/3). 마디 사이의 간격 λ/2도 L/3로 좁아져요.',
        },
      ],
    },
    {
      title: '진동수: f = nv/2L', short: '진동수', icon: '🎵', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> λ = 2L/n을 알아냈고, <b>탄성파의 진행에서</b> 줄의 속력이 v = √(T/μ)임을 알았어요. 정상파의 진동수는 f = v/λ이므로 <b>f<sub>n</sub> = nv/(2L) = n f₁</b>이에요.</div>' +
        '<p>줄의 <b>길이 L, 장력 T, 굵기 μ</b>를 하나씩 바꾸며 기본 진동수 f₁이 어떻게 달라지는지 측정해요. 스마트폰 소리 센서 앱처럼 스펙트럼에서 f₁과 배음(2f₁, 3f₁ …)을 읽어요.</p>',
      features: ['freq'],
      setup() { resetFlags(); resetFq(); setScene('freq'); updateCtl(); },
      recap: 'f<sub>n</sub> = nv/(2L) = n f₁이고 v = √(T/μ)예요. 줄이 짧을수록, 장력이 클수록, 줄이 가늘수록(μ가 작을수록) 기본 진동수 f₁이 커져요.',
      summary: '<ul><li>정상파의 진동수 <b>f<sub>n</sub> = nv/(2L) = n f₁</b> (n = 1이 기본음, n ≥ 2는 배음). 줄의 속력 <b>v = √(T/μ)</b>.</li>' +
        '<li>기준 L = 0.50 m, T = 40 N, μ = 1.0 g/m: v = √(40 / 1.0×10⁻³) = 200 m/s, f₁ = 200 Hz.</li>' +
        '<li>길이를 3/4(0.375 m)로 → f₁ = <b>267 Hz</b>(×4/3), 장력을 4배(160 N)로 → v = 400 m/s, f₁ = <b>400 Hz</b>(×2), 굵기를 4배(4.0 g/m)로 → v = 100 m/s, f₁ = <b>100 Hz</b>(×1/2).</li>' +
        '<li>길이는 f₁과 <b>반비례</b>(f₁ ∝ 1/L), 장력의 제곱근에는 비례, μ의 제곱근에는 반비례해요.</li>' +
        '<li>음정은 진동수의 비: 옥타브 2:1, 5도 3:2, 4도 4:3 (줄 길이의 비 1/2, 2/3, 3/4).</li></ul>',
      missions: [
        {
          title: '길이·장력·굵기의 효과 측정하기',
          goal: '기준 상태에서 <b>길이, 장력, 굵기를 하나씩만</b> 바꾸고 <b>📝 기록</b>을 눌러 표를 채워요. 세 가지 모두 기록하세요.',
          hint: '길이 슬라이더를 움직이거나(장력·굵기는 기준 그대로) 기록하고, 기준으로 돌아가 장력을 바꿔 기록하고, 다시 굵기를 바꿔 기록해요. 한 번에 하나만 바꿔야 해요.',
          setup() { resetFlags(); resetFq(); setScene('freq'); updateCtl(); },
          check: () => !!(S.fq.rec.L && S.fq.rec.T && S.fq.rec.mu),
          hold: 0.4,
          status: () => mark(!!S.fq.rec.L) + ' 길이 &nbsp; ' + mark(!!S.fq.rec.T) + ' 장력 &nbsp; ' + mark(!!S.fq.rec.mu) + ' 굵기',
          explain: '길이를 3/4로 줄이면 f₁ = <b>267 Hz</b>(×4/3), 장력을 4배로 하면 <b>400 Hz</b>(×2), 줄을 4배 굵게(μ = 4.0 g/m) 하면 <b>100 Hz</b>(×1/2)로 낮아져요. f₁ = (1/2L)√(T/μ)와 같아요.',
        },
        {
          title: '식으로 기본 진동수 계산하기', manual: true,
          goal: 'L = 0.375 m, T = 40 N, μ = 1.0 g/m인 줄의 <b>속력 v</b>와 <b>기본 진동수 f₁</b>을 식으로 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'v = √(T/μ)에서 μ = 1.0 g/m = 1.0 × 10⁻³ kg/m이에요. 그다음 f₁ = v/(2L)을 계산해요.',
          setup() { resetFlags(); resetFq(); S.fq.hide = true; S.fq.L = 375; clr('iFv', 'iFf'); setFlag('fqIn', true); setScene('freq'); updateCtl(); },
          check() {
            const v = num('iFv'), f = num('iFf'); if (v == null || f == null) return '두 칸을 모두 입력해 주세요.';
            const oks = [near(v, 200, 3), near(f, 267, 3)]; fb([[$('#iFv'), oks[0]], [$('#iFf'), oks[1]]]);
            if (oks.every(Boolean)) { S.fq.hide = false; return true; }
            if (oks[0] && near(f, 200, 3)) return 'f₁ = v/(2L)이에요. L = 0.375 m를 넣어 2L = 0.75 m로 나눠 봐요.';
            if (oks[0] && near(f, 400, 4)) return 'f₁ = v/(2L)에서 2L = 0.75 m예요. 파장이 아니라 줄 길이 L을 2배 해요.';
            if (!oks[0]) return 'v = √(T/μ) = √(40 / 1.0×10⁻³)을 계산해 보세요. 단위 g/m를 kg/m로 바꿔야 해요.';
            return 'f₁ = v/(2L) = 200 / 0.75를 계산해 봐요.';
          },
          status: () => '입력 v ' + ($('#iFv').value.trim() || '—') + ' m/s, f₁ ' + ($('#iFf').value.trim() || '—') + ' Hz',
          explain: 'v = √(T/μ) = √(40 / 1.0×10⁻³) = <b>200 m/s</b>, 기본 진동수 f₁ = v/(2L) = 200 / (2 × 0.375) = <b>267 Hz</b>예요. 길이가 3/4가 되었으니 f₁은 200 Hz의 4/3배예요.',
        },
        {
          type: 'quiz', title: '짧게 누를수록 높은 음, 굵은 줄은 낮은 음',
          goal: '기타에서 줄을 짧게 누를수록 음이 <b>높아지고</b>, 굵은 베이스 줄이 <b>낮은 음</b>을 내는 까닭은?',
          setup() { resetFlags(); resetFq(); S.fq.L = 375; setScene('freq'); updateCtl(); },
          choices: ['길이가 짧으면 파장(2L)이 짧아져 f₁ = v/2L이 커지고, 굵은 줄은 μ가 커서 v = √(T/μ)가 작아져 f₁이 작아져요', '줄을 짧게 누르면 장력이 줄어서 음이 높아지고, 굵은 줄은 장력이 커서 음이 낮아져요', '굵은 줄은 질량이 커서 진폭이 커지기 때문에 음이 낮아져요', '줄을 짧게 누르면 줄의 속력이 느려져서 음이 높아져요'],
          answer: 0,
          feedback: ['', '장력이 줄어서 음이 높아지는 것이 아니에요. 장력이 작아지면 오히려 음이 낮아져요. 길이가 짧아지는 것이 핵심이에요.', '진폭은 소리의 크기와 관계있고 높낮이는 진동수가 정해요. 굵은 줄은 μ가 커서 속력이 작아져요.', '줄의 속력은 장력과 굵기가 정해요. 길이가 짧아지면 같은 속력에서 파장이 짧아져 진동수가 커져요.'],
          explain: 'f₁ = v/(2L)에서 <b>L이 짧을수록 f₁이 커져요</b>. 또 v = √(T/μ)이므로 <b>굵은 줄(μ 큼)은 v가 작아서 f₁이 작아요</b>(낮은 음). 그래서 기타는 줄을 눌러 길이를, 조율 나사로 장력을, 줄의 굵기를 골라 음높이를 정해요.',
        },
      ],
    },
    {
      title: '현악기: 조율과 음정', short: '현악기', icon: '🎸', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기본 진동수가 f₁ = (1/2L)√(T/μ)로 길이·장력·굵기에 따라 정해지는 것을 알았어요. 이제 이 식으로 <b>기타</b>의 음높이를 정하는 방법을 알아봐요. 가야금은 안족을 옮겨 줄의 길이를 바꿔요.</div>' +
        '<p>기타 1번 줄(E4 = 330 Hz)의 장력을 조절해 <b>조율</b>하고, 줄을 눌러 길이를 줄이며 <b>5도·옥타브</b> 같은 음정을 만들어요. 줄의 가운데를 가볍게 대면 어떻게 될까요?</p>',
      features: ['inst'],
      setup() { resetFlags(); resetIns(1000); setFlag('tune', true); setScene('inst'); updateCtl(); },
      recap: '현악기는 줄의 길이(프렛·안족), 장력(조율 나사), 굵기로 f₁ = (1/2L)√(T/μ)를 정해 음높이를 조절해요. 줄 길이를 3/4, 2/3, 1/2로 줄이면 진동수는 4/3, 3/2, 2배(4도, 5도, 옥타브)가 돼요.',
      summary: '<ul><li>기타 1번 줄(E4 = 330 Hz): L = 0.65 m이면 v = 2Lf = 2 × 0.65 × 330 ≈ <b>429 m/s</b>이고, μ = 0.40 g/m이면 T = μv² ≈ <b>74 N</b>로 조율해요.</li>' +
        '<li>프렛을 눌러 울리는 길이를 3/4, 2/3, 1/2로 줄이면 진동수는 4/3, 3/2, 2배: <b>4도(4:3), 5도(3:2), 옥타브(2:1)</b>.</li>' +
        '<li>줄 가운데를 가볍게 대면 가운데가 마디가 되어 n = 2 정상파가 생겨요: <b>f₂ = 2f₁</b>(옥타브 위, 자연 배음).</li>' +
        '<li>굵은 줄(μ 큼)은 낮은 음이에요. 기타 6줄은 길이가 같아도 굵기가 달라 음높이가 달라요.</li>' +
        '<li>가야금(12현): 안족을 옮겨 줄이 울리는 길이를 바꿔요. 짧아지면 높은 음이에요.</li></ul>',
      missions: [
        {
          title: '기타 1번 줄 조율하기',
          goal: '장력 슬라이더를 돌려 소리 센서가 <b>330 Hz(E4)</b>를 가리키도록 조율해요. 오차 3 Hz 이내로 맞춰요.',
          hint: 'v = √(T/μ)와 f₁ = v/(2L)에서 장력이 커지면 진동수가 커져요. 센서의 숫자를 보며 장력을 조금씩 바꿔 330 Hz에 맞춰요.',
          setup() { resetFlags(); resetIns(1000); setFlag('tune', true); setScene('inst'); updateCtl(); },
          check: () => !S.ins.harm && S.ins.xf === 0 && Math.abs(insF() - F0G) <= 3,
          hold: 0.8,
          status: () => mark(!S.ins.harm && S.ins.xf === 0 && Math.abs(insF() - F0G) <= 3) + ' 센서 f = ' + fx(insF(), 1) + ' Hz (목표 330 ± 3 Hz)',
          explain: 'T = μv² = μ(2Lf)² = 0.40×10⁻³ × (2 × 0.65 × 330)² ≈ <b>74 N</b>일 때 f₁ = 330 Hz예요. 장력을 높이면 줄의 속력과 진동수가 커지고, 낮추면 작아져요.',
        },
        {
          title: '프렛으로 5도와 옥타브 만들기',
          goal: '조율된 줄(330 Hz)을 눌러 울리는 길이를 줄이며 <b>5도(3 : 2)</b>와 <b>옥타브(2 : 1)</b> 음정을 만들어요. 각각 잠시 머물러요.',
          hint: '길이를 2/3로 줄이면 5도, 1/2로 줄이면 옥타브예요. 누르는 위치는 너트에서 L의 1/3, 1/2만큼이에요(0.65 m의 1/3 ≈ 21.7 cm). 아래 음높이 비 눈금자를 참고해요.',
          setup() { resetFlags(); resetIns(1472); setFlag('fret', true); setScene('inst'); updateCtl(); },
          check: () => S.ins.got5 && S.ins.gotOct,
          hold: 0.4,
          status: () => mark(S.ins.got5) + ' 5도 (3 : 2) &nbsp; ' + mark(S.ins.gotOct) + ' 옥타브 (2 : 1) &nbsp; (지금 f/f₀ = ' + fx(insRatio(), 2) + ')',
          explain: '울리는 길이를 <b>2/3</b>(너트에서 약 21.7 cm 누름)로 하면 f가 3/2배인 <b>5도</b>, <b>1/2</b>(약 32.5 cm, 12프렛)로 하면 2배인 <b>옥타브</b>예요. 길이가 3/4이면 4/3배인 4도예요.',
        },
        {
          type: 'quiz', title: '가야금 안족과 기타 한 줄의 여러 음',
          goal: '가야금에서 안족을 옮겨 줄이 <b>울리는 부분을 더 짧게</b> 하면 음은 어떻게 될까요? 기타에서 이와 같은 일을 하는 동작은?',
          setup() { resetFlags(); resetIns(1472); setFlag('tune', true); setFlag('fret', true); setFlag('harm', true); setScene('inst'); updateCtl(); },
          choices: ['음이 높아져요. 기타에서는 프렛을 눌러 울리는 길이를 줄이는 것과 같아요', '음이 낮아져요. 기타에서는 줄을 더 굵은 것으로 바꾸는 것과 같아요', '음 높이는 그대로이고 소리 크기만 달라져요', '음이 높아지는 것은 줄의 장력이 줄어들기 때문이에요'],
          answer: 0,
          feedback: ['', '울리는 길이가 짧아지면 f₁ = v/(2L)이 커져서 음은 높아져요. 굵은 줄은 낮은 음이에요.', '음높이는 진동수가 정하고, 길이가 바뀌면 진동수가 바뀌어요.', '안족을 옮기는 것은 주로 길이를 바꾸는 일이에요. 길이가 짧아져서 진동수가 커져요.'],
          explain: '줄이 울리는 길이 L이 짧아지면 <b>f₁ = v/(2L)이 커져서 음이 높아져요</b>. 기타는 한 줄로 프렛을 눌러 길이를 바꿔 여러 음을 내고, 가야금은 줄마다 안족 위치를 옮겨 음을 맞춰요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-string-wave', mount: '#game', badge: '정상파 박사', homeHref: '../../index.html#hm',
    featureLabels: { drive: '〰 진동 발생기 · 공명 곡선', lam: '📏 파장 막대 · 눈금자', freq: '🎵 길이·장력·굵기 · 소리 센서', inst: '🎸 기타 1번 줄 · 조율' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  updateCtl();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    simStep(dt);
    view.apply();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); S.hit = null;
    switch (S.mode) {
      case 'drive': drawDriveScene(); break;
      case 'lam': drawLamScene(); break;
      case 'freq': drawFreqScene(); break;
      default: drawInstScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, get hit() { return S.hit; }, setScene, setFlag, updateCtl, ampOf, FNR, strField, strAt, insF, insRatio, fqF1, f1Of, vOf, resetIns,
  };
})();
