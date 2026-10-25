/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 관의 정상파와 소리 속력 (7차시)
   성취기준 [12역학03-05] 현악기, 관악기 등에서 소리를 내는 원리를 정상파를 이용하여 설명할 수 있다. (관의 정상파 부분)
   ① 모형: 관 속 정상파 (열린 끝 = 변위의 배, 닫힌 끝 = 변위의 마디; 열린 관 L = nλ/2, 닫힌 관 L = (2n−1)λ/4)
   ② 실험: 공명 실험 (소리굽쇠 512 Hz, 공명 관, 관 끝 보정 0.6r)
   ③ 분석: 음속 측정 (ΔL = λ/2, v = fλ, 기온 v ≈ 331 + 0.6t)
   ④ 적용: 관악기 (구멍 열기, 배음 구성 1:2:3과 1:3:5, 병 불기, 기온)
   공명 봉우리는 L + 0.6r이 λ/4의 홀수 배일 때 가장 높게 계산해요. 임피던스·헬름홀츠 공명기 식은 다루지 않아요.
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
  const vT = (t) => 331 + 0.6 * t;                                   // 소리의 속력 (m/s), 20 °C → 343 m/s
  const R_CM = 2.5, E_CM = 0.6 * R_CM;                               // 공명 관 안지름 5.0 cm, 관 끝 보정 0.6r = 1.5 cm
  const WRES = 1.0;                                                  // 공명 봉우리의 폭 (cm)
  const lamOf = (f, t) => Math.round(vT(t) / f * 1000) / 1000;      // 파장 (m, mm 단위로 반올림: 512 Hz → 0.670 m)
  const resL = (n, f, t) => ((2 * n - 1) * lamOf(f, t) / 4) * 100 - E_CM;   // n번째 공명 위치 L_n (cm)
  function loud(Lcm, f, t) { let m = 0; const lam = lamOf(f, t) * 100; for (let n = 1; n <= 4; n++) { const d = Lcm + E_CM - (2 * n - 1) * lam / 4; m = Math.max(m, 1 / Math.sqrt(1 + (d / WRES) * (d / WRES))); } return m; }
  const r1 = (v) => Math.round(v * 10) / 10;
  const measOf = (f, t) => ({ f, t, L1: r1(resL(1, f, t)), L2: r1(resL(2, f, t)) });
  const vFrom = (m) => m.f * 2 * (m.L2 - m.L1) / 100;               // ΔL = λ/2 → v = fλ
  const vFirst = (m) => m.f * 4 * m.L1 / 100;                        // 첫 공명만: λ = 4L₁
  const LTUBE = 110;                                                  // 공명 관의 길이 (cm)
  /* 관의 변위 정상파 (x: 열린 끝에서의 거리 / 길이). open: 양 끝 열림, closed: x = 0이 열린 끝, x = 1이 닫힌 끝 */
  const xi = (type, n, u) => (type === 'open' ? Math.cos(n * Math.PI * u) : Math.cos((2 * n - 1) * Math.PI * u / 2));
  const pr = (type, n, u) => (type === 'open' ? Math.sin(n * Math.PI * u) : Math.sin((2 * n - 1) * Math.PI * u / 2));
  const lamTube = (type, n, L) => (type === 'open' ? 2 * L / n : 4 * L / (2 * n - 1));
  function nodesOf(type, n) {                                         // [마디 위치들, 배 위치들] (u = x/L)
    const N = [], A = [];
    if (type === 'open') { for (let j = 1; j <= n; j++) N.push((2 * j - 1) / (2 * n)); for (let j = 0; j <= n; j++) A.push(j / n); }
    else { for (let j = 1; j <= n; j++) N.push((2 * j - 1) / (2 * n - 1)); for (let j = 0; j < n; j++) A.push(2 * j / (2 * n - 1)); }
    return [N, A];
  }

  /* ================= 상태 ================= */
  const S = {
    mode: 'tube', fade: 0, clock: 0,
    tb: { type: 'open', n: 1, pres: false, picks: { open: -1, closed: -1 }, tried: {}, lamOK: false },
    rs: { L: 300, f: 512, t: 20, seen: {}, rec: {}, drain: false, prev: 300 },
    ms: { f: 512, t: 20, meas: {}, run: null, show: false, err: [] },
    wd: { type: 'open', holes: [false, false, false, false, false], T: 20, hide: false },
    bt: { h: 0 },
    flags: { pick: false, tubeIn: false, vIn: false, cardsIn: false, windIn: false, env: false, eff: false },
    hit: null,
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1e = $('#v1'), v2e = $('#v2'), v3e = $('#v3');
  const MODES = ['tube', 'res', 'meas', 'wind', 'bottle'];
  const ALLOWED = [['tube'], ['res'], ['meas'], ['wind', 'bottle']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; const h = $('#stageHint'); if (h) h.classList.add('hide'); } updateCtl(); }
  const L0M = 0.5;                                                    // ① 관의 길이 (m)

  /* ---------- 도우미 ---------- */
  function plotF(M, fn, t0, t1, col, lw, dash) {
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 1, M.iw, M.ih + 2); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); const n = Math.max(60, Math.floor(M.iw / 2));
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, x = M.ix + M.iw * i / n, y = M.gy(fn(t)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function dot(M, x, y, col, r) { D.sphere(M.gx(x), M.gy(y), r || 6.5, col, { gloss: false }); }
  /* 관 속 정상파 모양 그림 (선택지·작은 그림): rect 안에 관과 변위 곡선 */
  function miniTube(x, y, w, h, type, n, o) {
    o = o || {};
    D.roundRect(x, y, w, h, 6); ctx.fillStyle = o.fill || '#f1f5fb'; ctx.fill(); ctx.strokeStyle = o.stroke || '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    if (type === 'closed') { ctx.fillStyle = '#475569'; ctx.fillRect(x + w - 4, y - 1, 5, h + 2); }
    ctx.strokeStyle = o.col || GREEN; ctx.lineWidth = o.lw || 2.6; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const u = i / 80, yy = y + h / 2 - (h / 2 - 3) * (o.fn ? o.fn(u) : xi(type, n, u)); i ? ctx.lineTo(x + w * u, yy) : ctx.moveTo(x + w * u, yy); } ctx.stroke();
    if (o.marks) { const [N, A] = nodesOf(type, n); N.forEach((u) => { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x + w * u, y + h / 2, 3.5, 0, TAU); ctx.fill(); }); A.forEach((u) => { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x + w * u, y + h / 2 - (h / 2 - 3) * xi(type, n, u), 3.5, 0, TAU); ctx.fill(); }); }
  }

  /* ================= ① 관 속 정상파 ================= */
  function drawTubeScene() {
    const c = topCard(), s = S.tb, type = s.type, n = s.n, W0 = c.w - (PHONE ? 70 : 140), tx = c.x + (PHONE ? 38 : 70), cy = c.y + (PHONE ? 196 : 202), hh = PHONE ? 62 : 70; cardBegin(c);
    T(c.x + 14, c.y + 24, type === 'open' ? '🎺 열린 관 속 공기 분자의 진동 (양 끝이 열려 있어요)' : '🎷 닫힌 관 속 공기 분자의 진동 (오른쪽 끝이 막혀 있어요)', PHONE ? 12.5 : 15, INK, 'left', 800);
    const out = 20;
    ctx.fillStyle = 'rgba(186,215,240,.30)'; ctx.fillRect(tx - out, cy - hh / 2, out, hh); if (type === 'open') ctx.fillRect(tx + W0, cy - hh / 2, out, hh);
    ctx.fillStyle = '#eaf3fb'; ctx.fillRect(tx, cy - hh / 2, W0, hh);
    const wt = TAU * 0.7 * S.clock, ph = Math.cos(wt);
    // 압력 변화 색
    if (s.pres) for (let i = 0; i < 80; i++) { const u = (i + 0.5) / 80, p = pr(type, n, u) * ph; ctx.fillStyle = p > 0 ? 'rgba(239,68,68,' + (0.5 * p) + ')' : 'rgba(37,99,235,' + (-0.5 * p) + ')'; ctx.fillRect(tx + W0 * i / 80, cy - hh / 2, W0 / 80 + 0.6, hh); }
    // 공기 분자
    const cols = PHONE ? 30 : 52, rows = 5, amp = (W0 / cols) * 0.72;
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols, xeq = tx + W0 * u, dx = amp * xi(type, n, u) * ph;
      for (let j = 0; j < rows; j++) { const yy = cy - hh / 2 + (j + 0.5) * hh / rows, hl = i % 6 === 3; ctx.fillStyle = hl ? '#dc2626' : '#475569'; ctx.beginPath(); ctx.arc(xeq + dx, yy, hl ? 3.4 : 2.6, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx - out, cy - hh / 2); ctx.lineTo(tx + W0 + (type === 'open' ? out : 0), cy - hh / 2); ctx.moveTo(tx - out, cy + hh / 2); ctx.lineTo(tx + W0 + (type === 'open' ? out : 0), cy + hh / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(71,85,105,.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(tx, cy - hh / 2 - 6); ctx.lineTo(tx, cy + hh / 2 + 6); if (type === 'open') { ctx.moveTo(tx + W0, cy - hh / 2 - 6); ctx.lineTo(tx + W0, cy + hh / 2 + 6); } ctx.stroke(); ctx.setLineDash([]);
    if (type === 'closed') { ctx.fillStyle = '#475569'; ctx.fillRect(tx + W0 - 1, cy - hh / 2 - 3, 10, hh + 6); }
    T(tx - 6, cy + hh / 2 + 22, '열린 끝', 13, MUTED, 'center', 800); T(tx + W0 + (type === 'open' ? 2 : 5), cy + hh / 2 + 22, type === 'open' ? '열린 끝' : '닫힌 끝', 13, MUTED, 'center', 800);
    // 변위 진폭 곡선과 마디·배 (맞힌 뒤에 보여 줘요)
    if (revealed('env')) {
      const ey = c.y + (PHONE ? 100 : 100), ea = PHONE ? 30 : 34;
      ctx.strokeStyle = 'rgba(80,95,120,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx, ey); ctx.lineTo(tx + W0, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(37,99,235,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); [1, -1].forEach((sg) => { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120, yy = ey - sg * ea * Math.abs(xi(type, n, u)); i ? ctx.lineTo(tx + W0 * u, yy) : ctx.moveTo(tx + W0 * u, yy); } ctx.stroke(); }); ctx.setLineDash([]);
      ctx.strokeStyle = GREEN; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120, yy = ey - ea * ph * xi(type, n, u); i ? ctx.lineTo(tx + W0 * u, yy) : ctx.moveTo(tx + W0 * u, yy); } ctx.stroke();
      const [N, A] = nodesOf(type, n);
      N.forEach((u) => { D.label(tx + W0 * u, ey + ea + 12, '마디', { bg: '#475569', size: 13 }); ctx.strokeStyle = 'rgba(71,85,105,.4)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(tx + W0 * u, ey + ea + 20); ctx.lineTo(tx + W0 * u, cy - hh / 2 - 4); ctx.stroke(); ctx.setLineDash([]); });
      A.forEach((u) => { D.label(tx + W0 * u, ey - ea - 14, '배', { bg: '#dc2626', size: 13 }); });
    } else T(c.x + 14, c.y + 70, '분자들이 어떻게 움직이는지 잘 봐요. 빨간 분자를 따라가 보세요.', 14, MUTED, 'left', 700);
    if (revealed('env')) { const lam = lamTube(type, n, L0M); D.label(c.x + c.w - 14, c.y + 24, 'λ = ' + fx(lam, 2) + ' m' + (type === 'open' ? ' = 2L/' + n : ' = 4L/' + (2 * n - 1)), { bg: '#7c3aed', size: 13, align: 'right' }); }
    T(c.x + 14, c.y + c.h - 12, '느리게 본 모습이에요. 관의 길이 L = 0.50 m' + (s.pres ? ' · 빨강 = 압축, 파랑 = 팽창' : ''), PHONE ? 12.5 : 13.5, MUTED, 'left', 700);
    ctx.restore();
    // ---- 아래 패널: 정상파 모양 비교 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, cw = (PW - 28 - 20) / 2, rowH = PHONE ? 62 : 56;
    T(x1, PY + 24, '〰 열린 관과 닫힌 관의 정상파 (같은 길이)', 14.5, INK, 'left', 800);
    if (revealed('env')) {
    ['open', 'closed'].forEach((tp, ci) => {
      const bx = x1 + ci * (cw + 20);
      T(bx, PY + 50, tp === 'open' ? '열린 관: 1 : 2 : 3' : '닫힌 관: 1 : 3 : 5', 14, tp === 'open' ? '#1d4ed8' : '#b45309', 'left', 800);
      [1, 2, 3].forEach((k, i) => {
        const yy = PY + 62 + i * rowH, cur = tp === type && k === n;
        miniTube(bx, yy + 6, cw - (PHONE ? 4 : 44), rowH - 24, tp, k, { fill: cur ? '#fff4e0' : '#f1f5fb', stroke: cur ? ORANGE : '#94a3b8', marks: revealed('env') });
        if (revealed('env')) T(bx + cw - (PHONE ? 0 : 40), yy + 6 + (rowH - 24) / 2 + 5, tp === 'open' ? k + 'f₁' : (2 * k - 1) + 'f₁', 13.5, cur ? '#b45309' : INK, PHONE ? 'right' : 'left', 800);
      });
    });
    }
    if (!revealed('env')) T(x1, PY + PH - 14, '오른쪽 🧩 칸에서 정상파 모양을 먼저 골라 봐요. 맞히면 마디·배와 비교 그림이 나와요.', 13.5, MUTED, 'left', 700);
  }

  /* ================= ② 공명 실험 (공명 관) ================= */
  function airTube(c, Lcm, f, t, o) {
    o = o || {};
    const cx = c.x + (PHONE ? 104 : 150), y0 = c.y + 80, pcm = (c.h - 80 - 24) / LTUBE, tw = 34, Y = (z) => y0 + z * pcm, yb = Y(LTUBE);
    const wt = TAU * 0.8 * S.clock, ph = Math.cos(wt);
    // 눈금자 (입구에서 아래로)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - tw / 2 - 12, y0); ctx.lineTo(cx - tw / 2 - 12, yb); ctx.stroke();
    for (let z = 0; z <= LTUBE; z += 10) { ctx.beginPath(); ctx.moveTo(cx - tw / 2 - 12, Y(z)); ctx.lineTo(cx - tw / 2 - 5, Y(z)); ctx.stroke(); T(cx - tw / 2 - 16, Y(z) + 4.5, z + '', 13, '#334155', 'right', 800); }
    T(cx - tw / 2 - 12, y0 - 10, 'cm', 13, MUTED, 'center', 800);
    // 물 (관 + 연결된 수조: 수면 높이가 같아요)
    const ys = Y(Lcm), rx = cx + tw / 2 + 56;
    ctx.fillStyle = 'rgba(96,165,250,.72)'; ctx.fillRect(cx - tw / 2, ys, tw, yb - ys); ctx.fillRect(rx - 15, ys, 30, yb - ys); ctx.fillRect(cx + tw / 2, yb - 16, rx - 15 - (cx + tw / 2), 12);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(cx - tw / 2, ys - 1, tw, 3); ctx.fillRect(rx - 15, ys - 1, 30, 3);
    // 유리관
    ctx.strokeStyle = '#7b8aa5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - tw / 2, y0); ctx.lineTo(cx - tw / 2, yb); ctx.lineTo(cx + tw / 2 - 0, yb); ctx.lineTo(cx + tw / 2, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - 15, y0); ctx.lineTo(rx - 15, yb); ctx.lineTo(rx + 15, yb); ctx.lineTo(rx + 15, y0); ctx.stroke();
    T(rx, yb + 16, '수조', 13, MUTED, 'center', 800);
    // 공기 기둥의 정상파 (변위의 진폭 곡선: 입구 쪽이 배, 수면이 마디)
    const lam = lamOf(f, t) * 100, A = loud(Lcm, f, t);
    ctx.save(); ctx.beginPath(); ctx.rect(cx - tw / 2 - 2, y0 - 36, tw + 4, ys - y0 + 36); ctx.clip();
    const amp = (tw / 2 - 3) * A;
    ctx.strokeStyle = 'rgba(37,99,235,.30)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); [1, -1].forEach((sg) => { ctx.beginPath(); for (let z = -E_CM; z <= Lcm; z += 0.5) { const xx = cx + sg * amp * Math.abs(Math.cos(TAU * (z + E_CM) / lam)); z === -E_CM ? ctx.moveTo(xx, Y(z)) : ctx.lineTo(xx, Y(z)); } ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); for (let z = -E_CM; z <= Lcm; z += 0.5) { const xx = cx + amp * ph * Math.cos(TAU * (z + E_CM) / lam); z === -E_CM ? ctx.moveTo(xx, Y(z)) : ctx.lineTo(xx, Y(z)); } ctx.stroke();
    ctx.restore();
    if (o.eff) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx - 44, Y(-E_CM)); ctx.lineTo(cx + 44, Y(-E_CM)); ctx.stroke(); ctx.setLineDash([]); D.label(cx + 46, Y(-E_CM) - 2, '실제 배', { bg: '#dc2626', size: 13, align: 'left' }); }
    // 소리굽쇠와 소리의 파면
    const fy = y0 - 30, sw = 3 + 1.6 * Math.cos(wt * 3);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 8 - sw, fy - 14); ctx.lineTo(cx - 8 - sw, fy); ctx.lineTo(cx - 8, fy + 6); ctx.lineTo(cx + 8, fy + 6); ctx.lineTo(cx + 8 + sw, fy); ctx.lineTo(cx + 8 + sw, fy - 14); ctx.moveTo(cx, fy + 6); ctx.lineTo(cx, fy + 16); ctx.stroke(); ctx.lineCap = 'butt';
    for (let k = 0; k < 3; k++) { const rr = 12 + ((S.clock * 22 + k * 12) % 36); ctx.strokeStyle = 'rgba(37,99,235,' + (0.6 - rr / 90) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, fy + 6, rr, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    D.label(cx + 62, fy - 4, '🔔 ' + f + ' Hz', { bg: '#475569', size: 13 });
    return { cx, y0, pcm, Y, ys, tw, lam, A };
  }
  function drawResScene() {
    const c = topCard(), r = S.rs; cardBegin(c);
    T(c.x + 14, c.y + 24, '🔔 공명 관 실험: 소리굽쇠 ' + r.f + ' Hz, 기온 ' + r.t + ' °C (소리 속력 ' + fx(vT(r.t), 0) + ' m/s)', PHONE ? 12.5 : 15, INK, 'left', 800);
    const G = airTube(c, r.L / 10, r.f, r.t, { eff: revealed('eff') });
    const A = loud(r.L / 10, r.f, r.t), ix = G.cx + (PHONE ? 130 : 178), iw = c.x + c.w - 12 - ix;
    T(ix, c.y + 70, 'L = ' + fx(r.L / 10, 1) + ' cm', 20, '#1d4ed8', 'left', 800);
    T(ix, c.y + 96, '입구에서 수면까지 (눈금자로 읽어요)' + (revealed('eff') ? ' · 붉은 점선: 실제 배는 입구에서 0.6r 위' : ''), 13.5, MUTED, 'left', 700);
    T(ix, c.y + 136, '🔊 소리 크기 ' + Math.round(A * 100) + ' %', 16, A >= 0.9 ? GREEN_D : INK, 'left', 800);
    D.roundRect(ix, c.y + 148, Math.min(iw, 250), 18, 9); ctx.fillStyle = '#e4e9f3'; ctx.fill();
    ctx.save(); D.roundRect(ix, c.y + 148, Math.min(iw, 250), 18, 9); ctx.clip(); ctx.fillStyle = A >= 0.9 ? GREEN : ORANGE; ctx.fillRect(ix, c.y + 148, Math.min(iw, 250) * A, 18); ctx.restore();
    if (!PHONE) para(ix, c.y + 196, A >= 0.9 ? '소리가 가장 커졌어요! 이 위치가 공명 위치예요.' : '수면을 움직이며 소리가 가장 커지는 곳(공명)을 찾아요.', iw, 14, A >= 0.9 ? GREEN_D : MUTED, 20, 700);
    else para(ix, c.y + 196, A >= 0.9 ? '소리가 가장 커졌어요!' : '소리가 가장 커지는 곳을 찾아요.', iw, 13.5, A >= 0.9 ? GREEN_D : MUTED, 19, 700);
    T(ix, c.y + c.h - 10, '관의 폭은 넓혀 그렸어요 (안지름 5.0 cm)', 12.5, MUTED, 'left', 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 500, gh = PHONE ? 150 : PH - 50;
    T(x1, PY + 22, '📈 소리 크기(세로, %)–공기 기둥 길이 L(가로, cm)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 10 }, { x0: 0, x1: LTUBE, y0: 0, y1: 1.1, xt: [0, 20, 40, 60, 80, 100], yt: [0, 0.5, 1], yf: (v) => Math.round(v * 100) + '', ml: PHONE ? 38 : 44, mr: 12, mt: 10, mb: 24 });
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip(); ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    const keys = Object.keys(r.seen).map(Number).sort((a, b) => a - b); ctx.beginPath(); let prev = -9;
    keys.forEach((k) => { const x = M.gx(k / 5), y = M.gy(r.seen[k]); if (k - prev === 1) ctx.lineTo(x, y); else ctx.moveTo(x, y); prev = k; }); ctx.stroke(); ctx.restore();
    [1, 2, 3].forEach((n) => { if (r.rec[n] != null) { dot(M, r.rec[n], loud(r.rec[n], r.f, r.t), '#0f766e', 6); D.label(M.gx(r.rec[n]) + 8, M.gy(loud(r.rec[n], r.f, r.t)) - 16, 'L' + (n === 1 ? '₁' : n === 2 ? '₂' : '₃') + ' = ' + fx(r.rec[n], 1) + ' cm', { bg: '#0f766e', size: 13, align: 'left' }); } });
    dot(M, r.L / 10, A, ORANGE, 8);
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 24 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 54) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '📋 기록한 공명 위치', 14, INK, 'left', 800);
    [1, 2].forEach((n, i) => T(tx + 14, ty + 54 + i * 26, (n === 1 ? '첫 번째 L₁' : '두 번째 L₂') + ':  ' + (r.rec[n] != null ? fx(r.rec[n], 1) + ' cm' : '—'), 14, r.rec[n] != null ? GREEN_D : '#9aa6bd', 'left', 800));
    if (!PHONE) para(tx + 12, ty + 112, '소리가 90 % 이상일 때 📍 버튼으로 기록할 수 있어요.', tw - 24, 13.5, MUTED, 19, 700);
  }

  /* ================= ③ 음속 측정 ================= */
  function drawMeasScene() {
    const c = topCard(), m = S.ms, run = m.run; cardBegin(c);
    T(c.x + 14, c.y + 24, '📏 ΔL로 소리의 속력 재기: 소리굽쇠 ' + m.f + ' Hz, 기온 ' + m.t + ' °C', PHONE ? 12.5 : 15, INK, 'left', 800);
    const Lc = run ? run.L : 30, G = airTube(c, Lc, m.f, m.t, { eff: revealed('eff') });
    // 눈금자 위에 찾은 공명 위치 표시
    const cur = m.meas[m.f] && m.meas[m.f].t === m.t ? m.meas[m.f] : null, got = run ? run.found : cur ? [cur.L1, cur.L2] : [];
    got.forEach((Lx, i) => { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(G.cx - G.tw / 2 - 16, G.Y(Lx)); ctx.lineTo(G.cx + G.tw / 2 + 4, G.Y(Lx)); ctx.stroke(); D.label(G.cx + G.tw / 2 + 14, G.Y(Lx), 'L' + (i ? '₂' : '₁'), { bg: '#dc2626', size: 13, align: 'left' }); });
    const ix = G.cx + (PHONE ? 126 : 176), iw = c.x + c.w - 12 - ix; let yy = c.y + 70;
    if (cur) {
      const dL = cur.L2 - cur.L1, lam = 2 * dL, v = vFrom(cur), v1 = vFirst(cur);
      T(ix, yy, 'L₁ = ' + fx(cur.L1, 1) + ' cm', 16, '#b91c1c', 'left', 800); yy += 26;
      T(ix, yy, 'L₂ = ' + fx(cur.L2, 1) + ' cm', 16, '#b91c1c', 'left', 800); yy += 28;
      T(ix, yy, 'ΔL = L₂ − L₁ = ' + fx(dL, 1) + ' cm', 15, '#1d4ed8', 'left', 800); yy += 28;
      if (m.show || (game && game.free)) {
        T(ix, yy, 'λ = 2ΔL = ' + fx(lam, 1) + ' cm', 15, '#6d28d9', 'left', 800); yy += 26;
        T(ix, yy, 'v = fλ = ' + fx(v, 0) + ' m/s', 17, GREEN_D, 'left', 800); yy += 30;
        para(ix, yy, '첫 공명만 쓰면 λ = 4L₁ = ' + fx(4 * cur.L1, 1) + ' cm → v = ' + fx(v1, 0) + ' m/s (끝 보정 때문에 작게 나와요).', iw, 13.5, '#b45309', 19, 700);
      } else para(ix, yy, 'ΔL = λ/2예요. λ와 v = fλ를 직접 계산해 봐요.', iw, 14, MUTED, 20, 700);
    } else para(ix, yy, run ? '수면을 내리며 소리가 가장 커지는 곳을 찾는 중…' : '📏 공명 위치 재기를 눌러 이 소리굽쇠의 L₁, L₂를 재요.', iw, 14.5, INK, 21, 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 300, gh = PHONE ? 130 : PH - 46;
    T(x1, PY + 22, '📈 소리의 속력(세로, m/s)–기온(가로, °C)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: -3, x1: 38, y0: 325, y1: 358, xt: [0, 10, 20, 30], yt: [330, 340, 350], ml: PHONE ? 42 : 46, mr: 12, mt: 10, mb: 24 });
    plotF(M, (tt) => vT(tt), -3, 38, '#9fb3d4', 2.6, [6, 4]);
    T(M.ix + M.iw - 4, M.gy(vT(36)) + 18, 'v ≈ 331 + 0.6t', 13, '#6b7a99', 'right', 800);
    if (m.show || (game && game.free)) Object.keys(m.meas).forEach((fk) => { const q = m.meas[fk]; dot(M, q.t, clamp(vFrom(q), 326, 357), q.f === m.f ? ORANGE : '#0f766e', 5.5); });
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34, th2 = PHONE ? PH - (gh + 40) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 22, '📋 측정 표 (cm, m/s)', 14, INK, 'left', 800);
    const cx0 = [tx + 12, tx + 12 + tw * 0.2, tx + 12 + tw * 0.38, tx + 12 + tw * 0.56, tx + 12 + tw * 0.74];
    ['f(Hz)', 'L₁', 'L₂', 'ΔL', 'v'].forEach((h, i) => T(cx0[i], ty + 46, h, 13, MUTED, 'left', 800));
    [512, 440, 256].forEach((fk, i) => {
      const q = m.meas[fk], yy2 = ty + 72 + i * 26, showV = m.show || (game && game.free);
      T(cx0[0], yy2, fk + '', 13.5, fk === m.f ? '#b45309' : INK, 'left', 800);
      if (q) { T(cx0[1], yy2, fx(q.L1, 1), 13.5, INK, 'left', 800); T(cx0[2], yy2, fx(q.L2, 1), 13.5, INK, 'left', 800); T(cx0[3], yy2, fx(q.L2 - q.L1, 1), 13.5, INK, 'left', 800); T(cx0[4], yy2, showV ? fx(vFrom(q), 0) : '?', 13.5, showV ? GREEN_D : MUTED, 'left', 800); }
      else [1, 2, 3, 4].forEach((k) => T(cx0[k], yy2, '—', 13.5, '#9aa6bd', 'left', 800));
    });
    if (!PHONE) para(tx + 12, ty + 72 + 3 * 26 + 6, m.show || (game && game.free) ? '진동수가 달라도 v는 같아요. 기온이 높으면 v가 커져요.' : '세 소리굽쇠로 모두 재고, ΔL → λ → v를 계산해 봐요.', tw - 24, 13.5, '#14532d', 19, 700);
  }

  /* ================= ④ 관악기 ================= */
  const INS = { open: { L0: 0.65, holes: [0.58, 0.52, 0.46, 0.41, 0.37], name: '플루트 모형 (열린 관)' }, closed: { L0: 0.58, holes: [0.52, 0.46, 0.41, 0.37, 0.33], name: '클라리넷 모형 (닫힌 관)' } };
  function windGeo() {
    const w = S.wd, I = INS[w.type]; let Le = I.L0; w.holes.forEach((o, i) => { if (o) Le = Math.min(Le, I.holes[i]); });
    const v = vT(w.T), f1 = w.type === 'open' ? v / (2 * Le) : v / (4 * Le);
    return { I, Le, v, f1 };
  }
  const BOT_L = 0.20, botL = () => BOT_L - S.bt.h / 100, botF = () => vT(20) / (4 * botL());
  function specRow(M, y, f, kind, hl, hide) {
    const top = M.iy + y, hgt = (M.ih / 2) - 46;
    ctx.fillStyle = hl ? 'rgba(245,158,11,.12)' : 'rgba(0,0,0,0)'; if (hl) { D.roundRect(M.ix, top - 2, M.iw, hgt + 26, 8); ctx.fill(); }
    for (let k = 1; k <= 16; k++) {
      const h = kind === 'open' ? k : 2 * k - 1, fr = h * f; if (fr > 2400) break;
      const x = M.gx(fr), a = 1 / h, bh = a * hgt; ctx.fillStyle = k === 1 ? ORANGE : kind === 'open' ? '#6d8fd0' : '#c08a55'; ctx.fillRect(x - 4, top + hgt - bh + 38, 8, bh);
      if (k <= 3 && !hide) T(x, top + hgt - bh + 34, fx(fr, 0), 13, '#334155', 'center', 800);
    }
  }
  function drawWindScene() {
    const c = topCard(), w = S.wd, G = windGeo(), type = w.type; cardBegin(c);
    T(c.x + 14, c.y + 24, '🎺 ' + G.I.name + ' · 기온 ' + w.T + ' °C (소리 ' + fx(G.v, 0) + ' m/s)', PHONE ? 12.5 : 15, INK, 'left', 800);
    const x0 = c.x + (PHONE ? 30 : 56), ppm = (c.w - (PHONE ? 60 : 112)) / 0.66, cy = c.y + 142, hh = 46, X = (m) => x0 + m * ppm, wt = TAU * 0.9 * S.clock, ph = Math.cos(wt);
    D.shadow(() => { D.roundRect(x0 - 4, cy - hh / 2, G.I.L0 * ppm + 8, hh, 14); const g = ctx.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2); g.addColorStop(0, type === 'open' ? '#e5e7eb' : '#3b4252'); g.addColorStop(1, type === 'open' ? '#9ca3af' : '#1f2430'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.62)'; if (G.Le < G.I.L0) ctx.fillRect(X(G.Le), cy - hh / 2 - 1, (G.I.L0 - G.Le) * ppm + 4, hh + 2);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, cy - hh / 2, G.Le * ppm, hh); ctx.clip();
    ctx.fillStyle = 'rgba(147,197,253,.30)'; ctx.fillRect(x0, cy - hh / 2, G.Le * ppm, hh);
    const xf = (u) => (type === 'open' ? Math.cos(Math.PI * u) : Math.sin(Math.PI * u / 2));   // 입 쪽(왼쪽)이 u = 0
    ctx.strokeStyle = 'rgba(37,99,235,.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); [1, -1].forEach((sg) => { ctx.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100, yy = cy - sg * (hh / 2 - 6) * Math.abs(xf(u)); i ? ctx.lineTo(X(u * G.Le), yy) : ctx.moveTo(X(u * G.Le), yy); } ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3.4; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100, yy = cy - (hh / 2 - 6) * ph * xf(u); i ? ctx.lineTo(X(u * G.Le), yy) : ctx.moveTo(X(u * G.Le), yy); } ctx.stroke(); ctx.restore();
    // 입구와 끝
    if (type === 'open') { ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(X(0.06), cy - hh / 2 + 3, 12, 5, 0, 0, TAU); ctx.fill(); D.arrow(X(0.06) - 4, cy - hh / 2 - 36, X(0.06) + 4, cy - hh / 2 - 8, { color: '#0ea5e9', width: 3, head: 9 }); T(X(0.06), cy - hh / 2 - 42, '입김', 13, '#0369a1', 'center', 800); }
    else { ctx.fillStyle = '#92400e'; ctx.fillRect(x0 - 4, cy - hh / 2 - 6, 18, 12); D.arrow(x0 - 30, cy - hh / 2 - 22, x0, cy - hh / 2 - 8, { color: '#0ea5e9', width: 3, head: 9 }); T(x0 - 4, cy - hh / 2 - 36, '입김·리드', 13, '#0369a1', 'left', 800); }
    // 구멍
    G.I.holes.forEach((d, i) => {
      const hx = X(d), on = w.holes[i]; ctx.fillStyle = on ? '#fff' : '#111827'; ctx.strokeStyle = on ? '#16a34a' : '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, cy, on ? 8 : 7, 0, TAU); ctx.fill(); ctx.stroke();
      T(hx, cy + hh / 2 + 18, String(i + 1), 13, on ? '#15803d' : MUTED, 'center', 800);
    });
    // 유효 길이 표시
    const by = cy + hh / 2 + 38; D.arrow(x0, by, X(G.Le), by, { color: '#7c3aed', width: 2.5, head: 9 }); D.arrow(X(G.Le), by, x0, by, { color: '#7c3aed', width: 2.5, head: 9 });
    D.label((x0 + X(G.Le)) / 2, by + 2, '울리는 공기 기둥 L = ' + fx(G.Le, 2) + ' m', { bg: '#7c3aed', size: 13 });
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(G.Le), cy - hh / 2 - 8); ctx.lineTo(X(G.Le), by + 10); ctx.stroke(); ctx.setLineDash([]);
    const hide = w.hide;
    T(c.x + 14, c.y + c.h - 14, hide ? '소리 센서: f₁ = ?' : '소리 센서: f₁ = ' + fx(G.f1, 0) + ' Hz  (' + (type === 'open' ? 'f₁ = v/2L' : 'f₁ = v/4L') + ')', PHONE ? 13.5 : 15, hide ? MUTED : '#0f766e', 'left', 800);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12;
    T(x1, PY + 22, '📊 소리 센서 스펙트럼: 같은 기본음일 때 배음 구성', 14, INK, 'left', 800);
    const gw = PHONE ? PW - 24 : 500, M = frame({ x: x1, y: PY + 30, w: gw, h: PH - (PHONE ? 130 : 44) }, { x0: 0, x1: 2400, y0: 0, y1: 1, xt: [0, 500, 1000, 1500, 2000], xf: (v) => v + '', yt: [], yl: false, ml: 10, mr: 30, mt: 8, mb: 22 });
    specRow(M, 4, G.f1, 'open', type === 'open', hide); specRow(M, M.ih / 2 + 4, G.f1, 'closed', type === 'closed', hide);
    T(M.ix + 6, M.iy + 14, '열린 관 (플루트 모형): 1 : 2 : 3 …', 13, '#1d4ed8', 'left', 800); T(M.ix + 6, M.iy + M.ih / 2 + 14, '닫힌 관 (클라리넷 모형): 1 : 3 : 5 …', 13, '#b45309', 'left', 800);
    T(M.ix + M.iw + 20, M.iy + M.ih + 17, 'Hz', 13, MUTED, 'center', 800);
    const tx = PHONE ? x1 : x1 + gw + 12, ty = PHONE ? PY + 30 + PH - 130 + 6 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 34, th2 = PHONE ? 104 : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    para(tx + 12, ty + 22, '입에서 가까운 구멍을 열수록 공기 기둥이 짧아져 음이 높아져요. 같은 길이에서 닫힌 관은 열린 관보다 한 옥타브 낮아요.', tw - 24, 13.5, INK, 19, 700);
  }

  /* ================= ④ 병 불기 ================= */
  function drawBottleScene() {
    const c = topCard(), h = S.bt.h / 100, L = BOT_L - h, f = botF(); cardBegin(c);
    T(c.x + 14, c.y + 24, '🍾 병 불기: 병 입구를 닫힌 관으로 생각해요 (병 속 깊이 0.20 m)', PHONE ? 12.5 : 15, INK, 'left', 800);
    const bx = c.x + (PHONE ? 130 : 230), top = c.y + 84, ppm = (c.h - 84 - 30) / BOT_L, bw = 76, Y = (z) => top + z * ppm, wt = TAU * 0.9 * S.clock, ph = Math.cos(wt);
    ctx.fillStyle = 'rgba(96,165,250,.75)'; ctx.fillRect(bx - bw / 2, Y(L), bw, Y(BOT_L) - Y(L));
    ctx.strokeStyle = '#7b8aa5'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - bw / 2 + 12, top - 18); ctx.lineTo(bx - bw / 2 + 12, top); ctx.lineTo(bx - bw / 2, top + 12); ctx.lineTo(bx - bw / 2, Y(BOT_L)); ctx.lineTo(bx + bw / 2, Y(BOT_L)); ctx.lineTo(bx + bw / 2, top + 12); ctx.lineTo(bx + bw / 2 - 12, top); ctx.lineTo(bx + bw / 2 - 12, top - 18); ctx.stroke();
    // 공기 기둥의 정상파: 입구가 배, 수면이 마디
    ctx.save(); ctx.beginPath(); ctx.rect(bx - bw / 2 + 1, top - 16, bw - 2, Y(L) - top + 16); ctx.clip();
    const amp = bw / 2 - 8; ctx.strokeStyle = 'rgba(37,99,235,.3)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); [1, -1].forEach((sg) => { ctx.beginPath(); for (let z = 0; z <= L + 1e-9; z += L / 60) { const xx = bx + sg * amp * Math.cos(Math.PI * z / (2 * L)); z === 0 ? ctx.moveTo(xx, Y(z)) : ctx.lineTo(xx, Y(z)); } ctx.stroke(); }); ctx.setLineDash([]);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 3.6; ctx.beginPath(); for (let z = 0; z <= L + 1e-9; z += L / 60) { const xx = bx + amp * ph * Math.cos(Math.PI * z / (2 * L)); z === 0 ? ctx.moveTo(xx, Y(z)) : ctx.lineTo(xx, Y(z)); } ctx.stroke(); ctx.restore();
    D.arrow(bx - 70, top - 26, bx - 8, top - 26, { color: '#0ea5e9', width: 3, head: 9 }); T(bx - 74, top - 32, '입김', 13, '#0369a1', 'right', 800);
    D.arrow(bx + bw / 2 + 28, top, bx + bw / 2 + 28, Y(L), { color: '#7c3aed', width: 2.5, head: 9 }); D.arrow(bx + bw / 2 + 28, Y(L), bx + bw / 2 + 28, top, { color: '#7c3aed', width: 2.5, head: 9 });
    D.label(bx + bw / 2 + 36, (top + Y(L)) / 2, 'L = ' + fx(L, 2) + ' m', { bg: '#7c3aed', size: 13, align: 'left' });
    T(bx, Y(BOT_L) + 18, '물 ' + S.bt.h + ' cm', 13.5, '#1d4ed8', 'center', 800);
    const ix = bx + (PHONE ? 100 : 170);
    T(ix, c.y + 80, '소리 센서', 14, MUTED, 'left', 800); T(ix, c.y + 118, fx(f, 0) + ' Hz', 30, '#0f766e', 'left', 800);
    T(ix, c.y + 146, 'f₁ = v/(4L)', 15, '#1d4ed8', 'left', 800);
    para(ix, c.y + 176, '물을 넣으면 공기 기둥이 짧아져요.', c.x + c.w - 12 - ix, 13.5, MUTED, 19, 700);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 500, gh = PHONE ? 150 : PH - 50;
    T(x1, PY + 22, '📈 병 소리의 진동수(세로, Hz)–물의 높이(가로, cm)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 10 }, { x0: 0, x1: 18, y0: 0, y1: 4500, xt: [0, 3, 6, 9, 12, 15, 18], yt: [0, 1000, 2000, 3000, 4000], ml: PHONE ? 46 : 52, mr: 14, mt: 10, mb: 24 });
    plotF(M, (hh) => vT(20) / (4 * (BOT_L - hh / 100)), 0, 18, GREEN, 3.4); dot(M, S.bt.h, f, ORANGE, 8);
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 24 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 54) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    para(tx + 12, ty + 22, '물이 늘수록 L이 짧아져 f₁ = v/(4L)이 커져요. 병 입구의 끝 보정은 무시했어요.', tw - 24, 13.5, INK, 19, 700);
  }

  /* ================= 컨트롤 연결 ================= */
  const PICK_FN = { open: [(u) => Math.cos(Math.PI * u), (u) => Math.sin(Math.PI * u), (u) => Math.cos(Math.PI * u / 2)], closed: [(u) => Math.sin(Math.PI * u / 2), (u) => Math.cos(Math.PI * u / 2), (u) => Math.cos(Math.PI * u)] };
  const PICK_OK = { open: 0, closed: 1 };
  function pickSvg(tp, i) {
    const w = 82, h = 40, pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push((4 + (w - 8) * u).toFixed(1) + ',' + (h / 2 - (h / 2 - 5) * PICK_FN[tp][i](u)).toFixed(1)); }
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + (tp === 'open' ? '열린 관' : '닫힌 관') + ' 선택지 ' + (i + 1) + '"><rect x="2" y="2" width="' + (w - 4) + '" height="' + (h - 4) + '" rx="5" fill="#f1f5fb" stroke="#94a3b8" stroke-width="2"/>' + (tp === 'closed' ? '<rect x="' + (w - 6) + '" y="0" width="5" height="' + h + '" fill="#475569"/>' : '') + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#14a058" stroke-width="3"/></svg>';
  }
  ['open', 'closed'].forEach((tp) => { const box = $(tp === 'open' ? '#pickOpen' : '#pickClosed'); [0, 1, 2].forEach((i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.dataset.tp = tp; b.innerHTML = pickSvg(tp, i); b.setAttribute('aria-label', (tp === 'open' ? '열린 관' : '닫힌 관') + ' 모양 ' + (i + 1) + '번'); b.style.padding = '3px 4px'; box.appendChild(b); b.addEventListener('click', () => {
    Sound.click(); S.tb.type = tp; S.tb.n = 1; const ok = i === PICK_OK[tp];
    if (ok) { S.tb.picks[tp] = i; Sound.success(); if (S.tb.picks.open === 0 && S.tb.picks.closed === 1) S.flags.env = true; showHint(tp === 'open' ? '맞아요! 열린 관은 양 끝이 배예요.' : '맞아요! 닫힌 관은 열린 끝이 배, 닫힌 끝이 마디예요.', 3000); }
    else { S.tb.tried[tp + i] = true; showHint(tp === 'open' ? '다시 생각해 봐요. 열린 끝에서 공기 분자는 자유롭게 움직여요.' : '다시 생각해 봐요. 닫힌 끝의 공기 분자는 움직이지 못해요.', 3000); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 600); }
    updateCtl();
  }); }); });
  const ERR_CARDS = ['관 끝 보정: 첫 공명 하나만 쓰면 L₁이 λ/4보다 짧게 나와 v가 작아져요', '온도: 기온이 달라지면 소리의 속력이 달라져요', '읽기 오차: 눈금과 소리가 가장 큰 위치를 읽는 데 한계가 있어요', '소리굽쇠의 진동수가 시간이 지나면서 크게 변해요', '소리가 관 속에서 횡파로 바뀌어요', '물의 색깔이 소리의 속력을 바꿔요'];
  ERR_CARDS.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = t; b.style.textAlign = 'left'; b.style.borderRadius = '14px'; b.style.fontSize = '14px'; b.style.lineHeight = '1.3'; $('#errChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); const a = S.ms.err, k = a.indexOf(i); if (k >= 0) a.splice(k, 1); else a.push(i); updateCtl(); }); });
  function buildHoleChips() { const I = INS[S.wd.type]; $$('#holeChips button').forEach((b) => b.remove()); I.holes.forEach((d, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = (i + 1) + '번 ' + fx(d, 2) + ' m'; $('#holeChips').appendChild(b); b.addEventListener('click', () => { Sound.click(); S.wd.holes[i] = !S.wd.holes[i]; updateCtl(); }); }); }
  buildHoleChips();

  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const sh = n.getAttribute('data-show'); if (sh && !revealed(sh)) on = false; const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const tb = S.tb; pickOn($$('#tubeSeg button'), 't', tb.type); pickOn($$('#harmSeg button'), 'n', tb.n);
    $('#bPres').classList.toggle('btn-primary', tb.pres); $('#bPres').textContent = tb.pres ? '🌡 압력 변화 숨기기' : '🌡 압력 변화 보기';
    $('#nTube').textContent = tb.pres ? '빨강은 공기가 압축된 곳, 파랑은 팽창한 곳이에요. 분자가 많이 움직이는 곳은 압력 변화가 작아요.' : '열린 끝과 닫힌 끝에서 공기 분자의 움직임이 어떻게 다른지 봐요.';
    ['open', 'closed'].forEach((tp) => $$('#' + (tp === 'open' ? 'pickOpen' : 'pickClosed') + ' button').forEach((b) => { b.classList.toggle('on', tb.picks[tp] === +b.dataset.i); }));
    const r = S.rs; setSl('sRL', r.L, 50, 1100); $('#oRL').textContent = fx(r.L / 10, 1) + ' cm';
    $('#bDrain').textContent = r.drain ? '■ 멈추기' : '💧 물 내리기'; $('#bDrain').classList.toggle('btn-primary', r.drain);
    $('#nRes').textContent = '소리굽쇠(' + r.f + ' Hz)를 입구에 대고 수면을 움직여요. 소리가 가장 커지는 곳이 공명 위치예요.';
    const m = S.ms; pickOn($$('#forkSeg button'), 'f', m.f); setSl('sTm', m.t, 0, 35); $('#oTm').textContent = m.t + ' °C';
    $('#bMeas').textContent = m.run ? '측정 중…' : '📏 공명 위치 재기'; $('#bMeas').disabled = !!m.run;
    $('#nMeas').textContent = '소리굽쇠와 기온을 바꿔 가며 재요. 기온이 바뀌면 다시 재야 해요.';
    $$('#errChips button').forEach((b) => b.classList.toggle('on', m.err.indexOf(+b.dataset.i) >= 0));
    const w = S.wd; pickOn($$('#insSeg button'), 't', w.type); pickOn($$('#windT button'), 't', w.T);
    if ($$('#holeChips button').length && $$('#holeChips button')[0].dataset.type !== w.type) { buildHoleChips(); $$('#holeChips button').forEach((b) => { b.dataset.type = w.type; }); }
    $$('#holeChips button').forEach((b) => b.classList.toggle('on', !!w.holes[+b.dataset.i]));
    $('#nWind').textContent = '구멍을 열면 가장 입에 가까운 열린 구멍까지만 공기 기둥이 울려요.';
    setSl('sBw', S.bt.h, 0, 18); $('#oBw').textContent = S.bt.h + ' cm';
    $('#nBot').textContent = '병 속 물의 높이를 바꾸며 소리의 높이를 비교해요. 공기 기둥 L = 0.20 m − 물의 높이예요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#tubeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tb.type = b.dataset.t; updateCtl(); }));
  $$('#harmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tb.n = +b.dataset.n; updateCtl(); }));
  $('#bPres').addEventListener('click', () => { Sound.click(); S.tb.pres = !S.tb.pres; updateCtl(); });
  function markSeen(a, b) { const r = S.rs, i0 = Math.round(Math.min(a, b) / 2), i1 = Math.round(Math.max(a, b) / 2); for (let i = i0; i <= i1; i++) r.seen[i] = loud(i / 5, r.f, r.t); }
  function setRL(v) { const r = S.rs; v = clamp(Math.round(v), 50, 1100); markSeen(r.L, v); r.L = v; r.prev = v; }
  $('#sRL').addEventListener('input', (e) => { S.rs.drain = false; setRL(+e.target.value); updateCtl(); });
  $('#bRLm').addEventListener('click', () => { Sound.click(); S.rs.drain = false; setRL(S.rs.L - 1); updateCtl(); });
  $('#bRLp').addEventListener('click', () => { Sound.click(); S.rs.drain = false; setRL(S.rs.L + 1); updateCtl(); });
  $('#bDrain').addEventListener('click', () => { Sound.click(); const r = S.rs; if (r.drain) r.drain = false; else { if (r.L >= 1090) setRL(50); r.drain = true; } updateCtl(); });
  $('#bRecRes').addEventListener('click', () => {
    Sound.click(); const r = S.rs, Lc = r.L / 10;
    if (loud(Lc, r.f, r.t) < 0.9) { showHint('아직 소리가 가장 큰 곳이 아니에요. 소리 크기가 90 % 이상일 때 기록해요.', 3000); return; }
    let best = 1, bd = 1e9; for (let n = 1; n <= 3; n++) { const d = Math.abs(resL(n, r.f, r.t) - Lc); if (d < bd) { bd = d; best = n; } }
    r.rec[best] = Lc; Sound.success(); showHint('L' + (best === 1 ? '₁' : best === 2 ? '₂' : '₃') + ' = ' + fx(Lc, 1) + ' cm를 기록했어요.', 2600); updateCtl();
  });
  $('#bClrRes').addEventListener('click', () => { Sound.click(); S.rs.rec = {}; updateCtl(); });
  $$('#forkSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.ms.run) return; S.ms.f = +b.dataset.f; updateCtl(); }));
  $('#sTm').addEventListener('input', (e) => { if (S.ms.run) { e.target.value = S.ms.t; return; } S.ms.t = +e.target.value; updateCtl(); });
  $('#bMeas').addEventListener('click', () => { Sound.click(); const m = S.ms; if (m.run) return; m.run = { L: 5, found: [], f: m.f, t: m.t }; updateCtl(); });
  $$('#insSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.wd.type = b.dataset.t; S.wd.holes = [false, false, false, false, false]; buildHoleChips(); $$('#holeChips button').forEach((bb) => { bb.dataset.type = S.wd.type; }); updateCtl(); }));
  $$('#windT button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.wd.T = +b.dataset.t; updateCtl(); }));
  $('#bHearW').addEventListener('click', () => { Sound.tone(clamp(windGeo().f1, 60, 1800), 0.9, 'triangle', 0.1); });
  $('#sBw').addEventListener('input', (e) => { S.bt.h = +e.target.value; updateCtl(); });
  $('#bHearB').addEventListener('click', () => { Sound.tone(clamp(botF(), 60, 3000), 0.9, 'sine', 0.1); });
  ['iLo', 'iLc', 'iV1', 'iV2', 'iV3', 'iW1', 'iW2', 'iW3'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 시뮬레이션 갱신 ---------- */
  function simStep(dt) {
    const r = S.rs;
    if (r.drain) {
      const Lc = r.L / 10, near = Math.min.apply(null, [1, 2, 3].map((n) => Math.abs(resL(n, r.f, r.t) - Lc))), sp = near < 2.5 ? 7 : 22;
      const nl = Math.min(1100, r.L + sp * 10 * dt); markSeen(r.L, nl); r.L = nl;
      if (r.L >= 1100) { r.L = 1100; r.drain = false; updateCtl(); }
      setSl('sRL', Math.round(r.L), 50, 1100); $('#oRL').textContent = fx(r.L / 10, 1) + ' cm';
    }
    const m = S.ms;
    if (m.run) {
      const run = m.run, near = Math.min.apply(null, [1, 2].map((n) => Math.abs(resL(n, run.f, run.t) - run.L))), sp = near < 3 ? 10 : 34;
      run.L += sp * dt;
      [1, 2].forEach((n) => { if (run.found.length < n && run.L >= resL(n, run.f, run.t)) run.found.push(r1(resL(n, run.f, run.t))); });
      if (run.found.length >= 2 && run.L >= resL(2, run.f, run.t) + 1.5) { m.meas[run.f] = measOf(run.f, run.t); m.run = null; Sound.success(); updateCtl(); }
    }
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const md = S.mode;
    if (md === 'tube') { const t = S.tb; L1 = '관의 종류'; a = t.type === 'open' ? '열린 관' : '닫힌 관'; L2 = '정상파'; b = (t.n === 1 ? '기본음' : t.n + '번째') + ' (' + (t.type === 'open' ? 'n = ' + t.n : '2n − 1 = ' + (2 * t.n - 1)) + ')'; L3 = '파장 λ'; c = revealed('env') ? fx(lamTube(t.type, t.n, L0M), 2) + ' m' : '?'; }
    else if (md === 'res') { const r = S.rs; L1 = '공기 기둥 L'; a = fx(r.L / 10, 1) + ' cm'; L2 = '소리 크기'; b = Math.round(loud(r.L / 10, r.f, r.t) * 100) + ' %'; L3 = '기록'; c = [1, 2].map((n) => (r.rec[n] != null ? fx(r.rec[n], 1) : '—')).join(' / ') + ' cm'; }
    else if (md === 'meas') { const m = S.ms, q = m.meas[m.f]; L1 = '소리굽쇠 / 기온'; a = m.f + ' Hz / ' + m.t + ' °C'; L2 = '공명 위치'; b = q && q.t === m.t ? fx(q.L1, 1) + ' / ' + fx(q.L2, 1) + ' cm' : '—'; L3 = '소리의 속력 v'; c = (m.show || (game && game.free)) && q && q.t === m.t ? fx(vFrom(q), 0) + ' m/s' : '?'; }
    else if (md === 'wind') { const g = windGeo(); L1 = '울리는 길이 L'; a = fx(g.Le, 2) + ' m'; L2 = '기본 진동수 f₁'; b = S.wd.hide ? '?' : fx(g.f1, 0) + ' Hz'; L3 = '소리의 속력'; c = fx(g.v, 0) + ' m/s'; }
    else { L1 = '공기 기둥 L'; a = fx(botL(), 2) + ' m'; L2 = '기본 진동수 f₁'; b = fx(botF(), 0) + ' Hz'; L3 = '물의 높이'; c = S.bt.h + ' cm'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1e.textContent = a; l2.textContent = L2; v2e.textContent = b; l3.textContent = L3; v3e.textContent = c;
  }

  /* ================= 미션 ================= */
  const resetTb = () => { Object.assign(S.tb, { type: 'open', n: 1, pres: false, picks: { open: -1, closed: -1 }, tried: {}, lamOK: false }); };
  const resetRs = () => { Object.assign(S.rs, { L: 100, f: 512, t: 20, seen: {}, rec: {}, drain: false, prev: 100 }); markSeen(100, 100); };
  const resetMs = () => { Object.assign(S.ms, { f: 512, t: 20, meas: {}, run: null, show: false, err: [] }); };
  const resetWd = () => { Object.assign(S.wd, { type: 'open', holes: [false, false, false, false, false], T: 20, hide: false }); buildHoleChips(); $$('#holeChips button').forEach((bb) => { bb.dataset.type = 'open'; }); };
  const levels = [
    {
      title: '관 속 정상파: 열린 끝과 닫힌 끝', short: '관 속 정상파', icon: '〓', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 소리는 관 속에서 어떻게 특정한 높이의 음이 될까? 소리의 속력을 정상파로 직접 잴 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 현의 정상파에서</b> 양 끝이 고정된 줄에서 L = nλ/2, f = nv/(2L)인 정상파를 배웠어요. <b>탄성파의 진행에서</b> 소리는 공기 분자가 앞뒤로 진동하는 <b>종파</b>이고 v = fλ임도 알았어요. 이번에는 관 속 <b>공기 기둥</b>의 정상파예요.</div>' +
        '<p>관 속 공기 분자의 진동을 관찰해요. <b>열린 끝</b>에서는 분자가 자유롭게 크게 진동하고(변위의 <b>배</b>), <b>닫힌 끝</b>에서는 움직이지 못해요(변위의 <b>마디</b>). 열린 관과 닫힌 관에서 가장 낮은 정상파의 모양을 골라 봐요.</p>',
      features: ['tube'],
      setup() { resetFlags(); resetTb(); setFlag('pick', true); setScene('tube'); updateCtl(); },
      recap: '관 속 공기 기둥의 정상파에서 열린 끝은 변위의 배, 닫힌 끝은 변위의 마디예요. 열린 관은 L = nλ/2(1 : 2 : 3), 한쪽이 닫힌 관은 L = (2n − 1)λ/4(1 : 3 : 5)예요. 같은 길이에서 기본 파장은 열린 관 2L, 닫힌 관 4L이에요.',
      summary: '<ul><li>소리는 종파라서 공기 분자가 <b>관의 방향</b>으로 진동해요. 정상파에서 분자의 변위가 0인 곳이 <b>마디</b>, 최대인 곳이 <b>배</b>예요.</li>' +
        '<li><b>열린 끝</b>은 변위의 배(분자가 자유롭게 진동), <b>닫힌 끝</b>은 변위의 마디(분자가 움직일 수 없음). 압력 변화는 변위와 반대로 마디에서 최대예요.</li>' +
        '<li><b>열린 관</b>(양 끝 열림): L = nλ/2, λ<sub>n</sub> = 2L/n, f<sub>n</sub> = nv/(2L) → 1 : 2 : 3 …</li>' +
        '<li><b>닫힌 관</b>(한쪽 닫힘): L = (2n − 1)λ/4, λ = 4L/(2n − 1), f = (2n − 1)v/(4L) → 1 : 3 : 5 … (짝수 배음이 없어요)</li>' +
        '<li>L = 0.50 m이면 가장 긴 파장은 열린 관 1.0 m(= 2L), 닫힌 관 2.0 m(= 4L)예요.</li></ul>',
      missions: [
        {
          title: '가장 낮은 정상파의 모양 고르기',
          goal: '<b>열린 관</b>과 <b>닫힌 관</b>에서 가장 낮은 정상파(기본음)의 <b>변위 곡선</b>을 각각 골라요. 닫힌 관은 오른쪽 끝이 막혀 있어요.',
          hint: '위 그림에서 공기 분자가 가장 크게 움직이는 곳과 거의 움직이지 않는 곳을 살펴봐요. 열린 끝은 크게, 닫힌 끝은 움직이지 못해요.',
          setup() { resetFlags(); resetTb(); setFlag('pick', true); setScene('tube'); updateCtl(); },
          check: () => S.tb.picks.open === 0 && S.tb.picks.closed === 1,
          hold: 0.3,
          status: () => mark(S.tb.picks.open === 0) + ' 열린 관 &nbsp; ' + mark(S.tb.picks.closed === 1) + ' 닫힌 관',
          explain: '<b>열린 관</b>의 가장 낮은 정상파는 양 끝이 배이고 가운데가 마디예요. <b>닫힌 관</b>은 열린 끝이 배, 닫힌 끝이 마디예요. 줄의 정상파와 달리 열린 끝은 마디가 아니라 변위의 배예요.',
        },
        {
          title: '같은 길이에서 기본 파장 비교하기', manual: true,
          goal: '길이 <b>L = 0.50 m</b>인 열린 관과 닫힌 관에서 <b>가장 긴 파장(기본음의 파장)</b>을 각각 구해 입력하고 ✔ 확인하기를 누르세요. (단위 m)',
          hint: '열린 관은 L = λ/2, 닫힌 관은 L = λ/4일 때 가장 낮은 정상파가 돼요. 그림의 곡선에서 몇 분의 몇 파장이 관 안에 들어 있는지 세어 봐요.',
          setup() { resetFlags(); resetTb(); S.tb.picks = { open: 0, closed: 1 }; S.flags.env = true; clr('iLo', 'iLc'); setFlag('tubeIn', true); setScene('tube'); updateCtl(); },
          check() {
            const a = num('iLo'), b = num('iLc'); if (a == null || b == null) return '두 칸을 모두 입력해 주세요 (m).';
            const oks = [near(a, 1.0, 0.03), near(b, 2.0, 0.05)]; fb([[$('#iLo'), oks[0]], [$('#iLc'), oks[1]]]);
            if (oks.every(Boolean)) { S.tb.lamOK = true; return true; }
            if (near(a, 0.5, 0.03) || near(b, 1.0, 0.03)) return '관의 길이가 한 파장이 아니에요. 열린 관은 L = λ/2, 닫힌 관은 L = λ/4예요.';
            if (oks[0] && near(b, 1.0, 0.05)) return '닫힌 관의 기본음은 L = λ/4예요. λ = 4L이에요.';
            return '열린 관의 λ = 2L, 닫힌 관의 λ = 4L이에요. L = 0.50 m를 넣어 계산해요.';
          },
          status: () => '입력 ' + ($('#iLo').value.trim() || '—') + ' m, ' + ($('#iLc').value.trim() || '—') + ' m',
          explain: '열린 관: L = λ/2 → λ = 2L = <b>1.0 m</b>. 닫힌 관: L = λ/4 → λ = 4L = <b>2.0 m</b>. 같은 길이에서 닫힌 관의 기본 파장이 2배 길어서 기본 진동수는 열린 관의 1/2(한 옥타브 낮음)이에요.',
        },
        {
          type: 'quiz', title: '닫힌 관에 짝수 배음이 없는 까닭',
          goal: '한쪽이 닫힌 관에서는 기본음의 1배, 3배, 5배 …의 진동수만 정상파가 돼요. 짝수 배음이 없는 까닭은?',
          setup() { resetFlags(); resetTb(); S.tb.picks = { open: 0, closed: 1 }; S.flags.env = true; S.tb.type = 'closed'; S.tb.n = 2; setScene('tube'); updateCtl(); },
          choices: ['한쪽 끝은 마디, 다른 쪽 끝은 배여야 하므로 L이 λ/4의 홀수 배(1, 3, 5 …)여야 하기 때문이에요', '닫힌 끝에서는 소리가 반사되지 않기 때문이에요', '관 입구에서는 소리가 항상 약해서 짝수 배음이 사라지기 때문이에요', '닫힌 관은 길이가 절반이라 진동수가 2배가 되기 때문이에요'],
          answer: 0,
          feedback: ['', '닫힌 끝에서도 소리는 반사돼요. 반사되어 입사파와 겹쳐 정상파가 생겨요.', '관 입구(열린 끝)는 소리가 약한 곳이 아니라 공기 분자의 진동이 가장 큰 변위의 배예요.', '닫힌 관의 길이가 절반이 되는 것이 아니에요. 닫힌 끝이 마디가 되어야 해서 가능한 파장이 달라지는 거예요.'],
          explain: '한쪽 끝(닫힌 끝)은 마디, 다른 쪽 끝(열린 끝)은 배여야 하므로 L = λ/4의 <b>홀수 배</b>, 즉 L = (2n − 1)λ/4만 가능해요. 그래서 진동수는 f, 3f, 5f …(1 : 3 : 5)이고 짝수 배음은 없어요. 관 입구는 변위의 배이지 소리가 약한 곳이 아니에요.',
        },
      ],
    },
    {
      title: '공명 실험: 소리가 커지는 위치', short: '공명 실험', icon: '🔔', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 닫힌 관의 공기 기둥은 L이 λ/4의 홀수 배일 때 정상파가 된다는 것을 알았어요. 소리굽쇠의 진동수가 공기 기둥의 고유 진동수와 같으면 <b>공명</b>이 일어나 소리가 크게 들려요. 스마트폰 소리 센서로 크기를 재듯, 소리가 가장 큰 곳을 찾아요.</div>' +
        '<p>유리관 속 수면 높이를 바꿔 <b>공기 기둥의 길이 L</b>을 조절해요. 입구에 <b>512 Hz</b> 소리굽쇠를 대고, 소리가 가장 커지는 <b>공명 위치</b>를 찾아 기록해요.</p>',
      features: ['res'],
      setup() { resetFlags(); resetRs(); setScene('res'); updateCtl(); },
      recap: '수면(닫힌 끝)이 마디, 입구 근처가 배가 되는 길이에서 공명이 일어나 소리가 가장 커져요. 512 Hz 소리굽쇠로 첫 공명 L₁ = 15.3 cm, 둘째 공명 L₂ = 48.8 cm를 찾았어요.',
      summary: '<ul><li><b>공명</b>: 소리굽쇠의 진동수가 공기 기둥의 고유 진동수와 같아지면 진폭이 쌓여 소리가 크게 들려요.</li>' +
        '<li>공기 기둥의 길이를 늘리면 소리가 커졌다 작아지기를 되풀이해요. 512 Hz(20 °C, v = 343 m/s, λ = 0.670 m)에서 <b>L₁ = 15.3 cm</b>, <b>L₂ = 48.8 cm</b>.</li>' +
        '<li>L₁ = λ/4 − 0.6r = 16.75 − 1.5 = 15.3 cm, L₂ = 3λ/4 − 0.6r = 50.25 − 1.5 = 48.8 cm (안지름 5.0 cm, r = 2.5 cm).</li>' +
        '<li>실제 배는 관 입구에서 약 0.6r만큼 <b>바깥</b>에 있어서(관 끝 보정) L이 λ/4, 3λ/4보다 조금 짧을 때 공명해요.</li></ul>',
      missions: [
        {
          title: '공명 위치 2개 찾아 기록하기',
          goal: '공기 기둥의 길이 L을 늘려 가며 소리가 가장 커지는 <b>공명 위치 2개</b>를 찾고, 각각 <b>📍 공명 위치 기록</b>을 눌러요.',
          hint: '💧 물 내리기를 누르면 수면이 천천히 내려가요. 소리 크기 그래프의 봉우리가 공명 위치예요. 소리 크기가 90 % 이상일 때 기록할 수 있고, ◀ ▶ 버튼으로 0.1 cm씩 맞춰요.',
          setup() { resetFlags(); resetRs(); setScene('res'); updateCtl(); },
          check: () => S.rs.rec[1] != null && S.rs.rec[2] != null,
          hold: 0.4,
          status: () => mark(S.rs.rec[1] != null) + ' L₁' + (S.rs.rec[1] != null ? ' ' + fx(S.rs.rec[1], 1) + ' cm' : '') + ' &nbsp; ' + mark(S.rs.rec[2] != null) + ' L₂' + (S.rs.rec[2] != null ? ' ' + fx(S.rs.rec[2], 1) + ' cm' : ''),
          explain: '첫 공명 <b>L₁ ≈ 15.3 cm</b>, 둘째 공명 <b>L₂ ≈ 48.8 cm</b>에서 소리가 가장 커져요. 공기 기둥의 길이가 λ/4와 3λ/4(에서 관 끝 보정을 뺀 값)일 때예요. 두 공명 사이의 간격이 반 파장이에요.',
        },
        {
          type: 'quiz', title: '공명할 때 소리가 커지는 까닭',
          goal: '공기 기둥의 길이가 공명 위치일 때 소리가 <b>크게</b> 들리는 까닭은?',
          setup() { resetFlags(); resetRs(); S.rs.rec = { 1: 15.3, 2: 48.8 }; setRL(153); setScene('res'); updateCtl(); },
          choices: ['소리굽쇠의 진동수가 공기 기둥의 고유 진동수와 같아져 진동의 진폭이 쌓이기 때문이에요', '소리굽쇠가 공명 위치에서 더 세게 진동하기 때문이에요', '관 속의 공기가 소리를 모두 흡수하기 때문이에요', '수면에서 소리의 속력이 빨라지기 때문이에요'],
          answer: 0,
          feedback: ['', '소리굽쇠는 같은 세기로 진동해요. 공기 기둥이 그 진동수에 맞아 반응이 커지는 거예요.', '흡수하면 소리가 작아져요. 공명에서는 반사파가 입사파와 겹쳐 진폭이 커져요.', '소리의 속력은 매질(공기)과 온도가 정해서 수면 높이와 관계없이 같아요.'],
          explain: '공기 기둥의 고유 진동수가 소리굽쇠의 진동수와 같아지면 입사파와 반사파가 같은 박자로 겹쳐 <b>진폭이 쌓여서</b> 소리가 커져요. 이것이 공명이고, 정상파가 만들어진 상태예요.',
        },
      ],
    },
    {
      title: '음속 측정: ΔL = λ/2', short: '음속 측정', icon: '📏', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 512 Hz 소리굽쇠로 공명 위치 L₁ = 15.3 cm, L₂ = 48.8 cm를 찾았어요. 인접한 두 공명 위치의 차이 <b>ΔL = L₂ − L₁ = λ/2</b>이므로 λ = 2ΔL이고, <b>v = fλ</b>로 소리의 속력을 구할 수 있어요.</div>' +
        '<p>소리굽쇠(512, 440, 256 Hz)와 기온을 바꾸어 공명 위치를 재고, ΔL로 소리의 속력을 계산해요. 첫 번째 공명만 쓰면 어떤 오차가 생기는지도 알아봐요.</p>',
      features: ['meas'],
      setup() { resetFlags(); resetMs(); setFlag('eff', true); setScene('meas'); updateCtl(); },
      recap: 'ΔL = L₂ − L₁ = λ/2이므로 v = fλ = 2fΔL예요. 관 끝 보정이 ΔL에서는 사라져서 정확하고, 첫 공명만 쓰면(λ = 4L₁) 약 9 % 작게 나와요. 소리의 속력은 진동수가 아니라 기온이 정하고 v ≈ 331 + 0.6t예요.',
      summary: '<ul><li><b>v = fλ = 2fΔL</b>. 512 Hz: ΔL = 48.8 − 15.3 = 33.5 cm → λ = 67.0 cm → v = 512 × 0.670 ≈ <b>343 m/s</b> (20 °C).</li>' +
        '<li>440 Hz(L₁ = 18.0, L₂ = 57.0 cm)와 256 Hz(L₁ = 32.0, L₂ = 99.0 cm)로 재도 v ≈ 343 m/s로 같아요. 속력은 소리굽쇠가 아니라 매질(공기)과 온도가 정해요.</li>' +
        '<li>첫 공명만 쓰면 λ = 4L₁ = 61.2 cm → v ≈ <b>313 m/s</b>로 작게 나와요. 실제 배가 입구에서 <b>0.6r</b> 바깥에 있어서이고, ΔL 방법에서는 이 보정이 서로 사라져요.</li>' +
        '<li>기온 t(°C)에서 v ≈ 331 + 0.6t m/s: 0 °C에서 331 m/s, 20 °C에서 343 m/s. 오차의 원인은 끝 보정, 기온, 눈금 읽기예요.</li></ul>',
      missions: [
        {
          title: '세 소리굽쇠로 소리의 속력 구하기', manual: true,
          goal: '<b>📏 공명 위치 재기</b>로 세 소리굽쇠의 L₁, L₂를 모두 잰 뒤, <b>ΔL</b>로 소리의 속력 v(m/s)를 각각 구해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'λ = 2ΔL = 2(L₂ − L₁)이에요. cm를 m로 바꾼 뒤 v = fλ를 계산해요. 세 값이 거의 같아야 해요.',
          setup() { resetFlags(); resetMs(); setFlag('eff', true); clr('iV1', 'iV2', 'iV3'); setFlag('vIn', true); setScene('meas'); updateCtl(); },
          check() {
            const m = S.ms, fs = [512, 440, 256], ids = ['iV1', 'iV2', 'iV3'];
            const miss = fs.filter((f) => !m.meas[f]); if (miss.length) return '먼저 ' + miss.join(', ') + ' Hz 소리굽쇠로 📏 공명 위치 재기를 눌러 측정해요.';
            const v = ids.map((id) => num(id)); if (v.some((x) => x == null)) return '세 칸을 모두 입력해 주세요 (m/s).';
            const oks = fs.map((f, i) => near(v[i], vFrom(m.meas[f]), 3)); fb(ids.map((id, i) => [$('#' + id), oks[i]]));
            if (oks.every(Boolean)) { m.show = true; return true; }
            const bad = fs.findIndex((f, i) => !oks[i]);
            if (near(v[bad], vFirst(m.meas[fs[bad]]), 4)) return '첫 공명(4L₁f)만 쓴 값이에요. ΔL = L₂ − L₁을 쓰면 λ = 2ΔL로 끝 보정이 사라져요.';
            if (near(v[bad], vFrom(m.meas[fs[bad]]) / 2, 4)) return 'λ = 2ΔL이에요. ΔL은 반 파장이라서 파장은 ΔL의 2배예요.';
            return fs[bad] + ' Hz의 값을 다시 계산해 봐요. v = f × 2(L₂ − L₁), 단위는 m로 바꿔요.';
          },
          status: () => [512, 440, 256].map((f) => mark(!!S.ms.meas[f]) + ' ' + f).join(' &nbsp; ') + ' Hz 측정',
          explain: 'v = f × 2ΔL이에요. 512 Hz: 2 × 33.5 cm = 0.670 m → <b>343 m/s</b>. 440 Hz: ΔL = 39.0 cm → <b>343 m/s</b>. 256 Hz: ΔL = 67.0 cm → <b>343 m/s</b>. 진동수가 달라도 소리의 속력은 같아요.',
        },
        {
          title: '측정 오차의 원인 고르기', manual: true,
          goal: '공명 관 실험으로 구한 소리의 속력에 <b>오차</b>를 만드는 까닭을 카드에서 <b>모두</b> 골라요. 고른 뒤 ✔ 확인하기를 눌러요.',
          hint: '그림의 붉은 점선이 실제 배의 위치예요. 첫 공명 하나만 쓸 때의 문제, 기온과 속력의 관계, 눈금을 읽는 일을 떠올려요. 소리굽쇠와 물의 색은 어떨까요?',
          setup() { resetFlags(); resetMs(); setFlag('eff', true); S.ms.show = true; S.ms.meas = { 512: measOf(512, 20) }; S.ms.err = []; setFlag('cardsIn', true); setScene('meas'); updateCtl(); },
          check() {
            const a = S.ms.err.slice().sort(), want = [0, 1, 2];
            if (!a.length) return '오차의 원인이라고 생각하는 카드를 골라 주세요.';
            if (a.some((i) => i > 2)) return '소리굽쇠의 진동수, 소리의 종류, 물의 색은 소리의 속력을 바꾸거나 측정을 크게 흔들지 않아요. 다시 살펴봐요.';
            if (a.length < 3) return '맞는 카드가 더 있어요. 끝 보정, 기온, 읽기 오차를 모두 생각해 봐요.';
            return a.join() === want.join() ? true : '다시 확인해 봐요.';
          },
          status: () => '고른 카드 ' + S.ms.err.length + '장',
          explain: '오차의 원인은 <b>관 끝 보정</b>(실제 배가 입구에서 0.6r 바깥에 있어 첫 공명만 쓰면 작게 나와요), <b>기온</b>(v ≈ 331 + 0.6t라서 기온에 따라 달라요), <b>읽기 오차</b>(눈금과 소리가 가장 큰 위치를 읽는 한계)예요. 소리굽쇠의 진동수는 거의 일정하고, 소리는 공기 속에서 계속 종파예요.',
        },
        {
          type: 'quiz', title: '소리굽쇠가 달라도 속력이 같은 이유',
          goal: '소리굽쇠를 바꿔도 소리의 속력은 같았고, 기온을 바꾸면 달라졌어요. 그 까닭은?',
          setup() { resetFlags(); resetMs(); S.ms.show = true; S.ms.meas = { 512: measOf(512, 20), 440: measOf(440, 20), 256: measOf(256, 20) }; setFlag('eff', true); setScene('meas'); updateCtl(); },
          choices: ['소리의 속력은 파원의 진동수가 아니라 매질(공기)과 온도가 정해요. 진동수가 크면 파장이 짧아질 뿐이고, 온도가 높을수록 v가 커요', '진동수가 큰 소리굽쇠일수록 소리가 더 빨리 가요', '여름에는 관이 늘어나 공명 위치가 달라져서 v가 달라 보여요', '기온은 소리의 속력에 영향을 주지 않고, 읽기 오차 때문에 다르게 나와요'],
          answer: 0,
          feedback: ['', '속력은 진동수와 관계없이 같아요. 진동수가 커지면 파장이 짧아져서(λ = v/f) 곱 fλ가 같아요.', '관의 길이 변화는 거의 없어요. 기온이 높아지면 공기 속 소리의 속력 자체가 커져요.', '기온에 따른 차이는 오차가 아니라 실제 속력의 변화예요. v ≈ 331 + 0.6t로 0 °C와 20 °C에서 12 m/s나 달라요.'],
          explain: '소리의 속력은 <b>매질의 성질과 온도</b>가 정해요. 소리굽쇠를 바꾸면 진동수 f와 파장 λ가 반대로 바뀌어 v = fλ는 같고, 기온이 높으면(여름 낮) 공기 분자가 더 빨리 움직여 v가 커요(v ≈ 331 + 0.6t). 겨울 아침에는 같은 소리굽쇠의 공명 위치도 더 짧아져요.',
        },
      ],
    },
    {
      title: '관악기: 구멍과 음높이', short: '관악기', icon: '🎺', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공명 관 실험으로 소리의 속력을 쟀어요. 같은 원리로 <b>관악기</b>의 음높이는 공기 기둥의 길이가 정해요. 구멍을 열면 공기 기둥이 짧아져서 높은 음이 나요.</div>' +
        '<p>플루트(열린 관)와 클라리넷(닫힌 관) 모형의 구멍을 열어 음높이를 바꾸고, 배음의 구성이 다른 것도 비교해 봐요. <b>병 불기</b> 화면에서는 물을 넣어 음높이가 어떻게 달라지는지 알아봐요.</p>',
      features: ['wind', 'bottle'],
      setup() { resetFlags(); resetWd(); S.bt.h = 0; setScene('wind'); updateCtl(); },
      recap: '관악기는 공기 기둥의 길이로 음높이를 정해요. 열린 관은 f₁ = v/(2L)이고 배음이 1 : 2 : 3, 닫힌 관은 f₁ = v/(4L)이고 1 : 3 : 5예요. 구멍을 열어 L을 줄이거나, 병에 물을 넣어 L을 줄이면 음이 높아져요.',
      summary: '<ul><li><b>열린 관 악기</b>(플루트, 리코더, 단소·대금 모형): f₁ = v/(2L), 배음 1 : 2 : 3 … L = 0.65 m: f₁ = 343/(2 × 0.65) = <b>264 Hz</b>, f₂ = <b>528 Hz</b>.</li>' +
        '<li><b>닫힌 관 악기</b>(클라리넷, 팬플루트): f₁ = v/(4L), 배음 1 : 3 : 5 … L = 0.58 m: f₁ ≈ 148 Hz, 다음 공명 444 Hz, 740 Hz. 같은 길이에서는 닫힌 관이 열린 관보다 한 옥타브 낮아요(0.65 m: 264 Hz와 132 Hz).</li>' +
        '<li>구멍을 열면 유효 길이가 줄어요: 0.65 m → 0.58 m이면 264 Hz → <b>296 Hz</b>. 목표 음 D4(294 Hz)는 L = v/2f ≈ 0.58 m.</li>' +
        '<li>배음 구성이 달라 같은 음높이에서도 <b>음색</b>이 달라요.</li>' +
        '<li>병 불기: 닫힌 관으로 근사해 L = 0.20 m이면 429 Hz, 물을 채워 L = 0.10 m이면 <b>858 Hz</b>로 높아져요.</li>' +
        '<li>추운 날(0 °C, v = 331 m/s)에는 같은 플루트의 f₁이 264 Hz → 255 Hz로 낮아져 조율이 달라져요.</li></ul>',
      missions: [
        {
          title: '열린 관과 병 불기의 진동수 계산하기', manual: true,
          goal: '소리의 속력 <b>343 m/s</b>에서 <b>길이 0.65 m 열린 관</b>의 f₁, f₂와 <b>공기 기둥 0.10 m 병</b>(닫힌 관으로 생각)의 f₁을 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '열린 관은 f₁ = v/(2L), f₂ = 2f₁이에요. 병은 한쪽이 닫힌 관이라 f₁ = v/(4L)이에요. 병 불기 화면에서 물을 넣어 확인해도 돼요.',
          setup() { resetFlags(); resetWd(); S.wd.hide = true; S.bt.h = 0; clr('iW1', 'iW2', 'iW3'); setFlag('windIn', true); setScene('wind'); updateCtl(); },
          check() {
            const a = num('iW1'), b = num('iW2'), c = num('iW3'); if (a == null || b == null || c == null) return '세 칸을 모두 입력해 주세요 (Hz).';
            const oks = [near(a, 264, 3), near(b, 528, 6), near(c, 858, 8)]; fb([[$('#iW1'), oks[0]], [$('#iW2'), oks[1]], [$('#iW3'), oks[2]]]);
            if (oks.every(Boolean)) { S.wd.hide = false; return true; }
            if (near(a, 132, 3)) return '열린 관은 f₁ = v/(2L)이에요. 4L을 쓰는 것은 닫힌 관이에요.';
            if (!oks[2] && near(c, 429, 5)) return 'L = 0.10 m이면 f₁ = 343 / (4 × 0.10)이에요. 0.20 m일 때의 값이에요.';
            if (!oks[2] && near(c, 1715, 10)) return '병은 한쪽이 닫힌 관이에요. f₁ = v/(4L)이에요.';
            if (!oks[1] && oks[0]) return '열린 관의 두 번째 진동수 f₂ = 2f₁이에요.';
            return '열린 관 f₁ = 343 / (2 × 0.65), 병 f₁ = 343 / (4 × 0.10)을 계산해 봐요.';
          },
          status: () => '입력 ' + ['iW1', 'iW2', 'iW3'].map((id) => $('#' + id).value.trim() || '—').join(' / ') + ' Hz',
          explain: '열린 관: f₁ = v/(2L) = 343 / 1.30 ≈ <b>264 Hz</b>, f₂ = 2f₁ ≈ <b>528 Hz</b>. 병(닫힌 관) L = 0.10 m: f₁ = v/(4L) = 343 / 0.40 ≈ <b>858 Hz</b>. 병에 물을 넣어 L이 반으로 줄면 f₁이 2배(한 옥타브 위)가 돼요.',
        },
        {
          title: '목표 음 D4(294 Hz) 내기',
          goal: '플루트 모형의 구멍을 열어 <b>D4 = 294 Hz</b>에 가까운 음(오차 3 Hz 이내)이 나게 해요. 기온은 20 °C예요.',
          hint: 'L = v/(2f) = 343 / (2 × 294) ≈ 0.58 m예요. 구멍 번호 옆의 거리를 보고, 입에서 가장 가까운 열린 구멍이 그 길이가 되도록 열어요.',
          setup() { resetFlags(); resetWd(); setScene('wind'); updateCtl(); },
          check() { const g = windGeo(); return S.wd.type === 'open' && S.wd.T === 20 && Math.abs(g.f1 - 294) <= 3; },
          hold: 0.8,
          status() { const g = windGeo(); return mark(S.wd.type === 'open' && S.wd.T === 20 && Math.abs(g.f1 - 294) <= 3) + ' 소리 센서 f₁ = ' + fx(g.f1, 0) + ' Hz (목표 294 ± 3 Hz)'; },
          explain: '목표 음 294 Hz에는 L = v/(2f) = 343 / 588 ≈ <b>0.58 m</b>가 필요해요. 1번 구멍(0.58 m)만 열면 f₁ = 343 / 1.16 ≈ 296 Hz예요. 입에서 가장 가까운 열린 구멍까지만 공기 기둥이 울려서, 그 뒤쪽 구멍은 영향을 주지 않아요.',
        },
        {
          type: 'quiz', title: '병에 물을 더 넣을수록 소리가 높아지는 까닭',
          goal: '병을 불 때 물을 더 넣을수록 소리가 <b>높아져요</b>. 그 까닭은?',
          setup() { resetFlags(); resetWd(); S.bt.h = 10; setScene('bottle'); updateCtl(); },
          choices: ['물이 늘수록 공기 기둥의 길이 L이 짧아져서 f₁ = v/(4L)이 커지기 때문이에요', '물이 소리의 속력을 더 빠르게 만들기 때문이에요', '병이 무거워져서 진폭이 커지기 때문이에요', '병 입구의 파장이 길어지기 때문이에요'],
          answer: 0,
          feedback: ['', '병 속 공기 중의 소리 속력은 물의 양과 상관없이 같아요. 달라지는 것은 공기 기둥의 길이예요.', '음높이는 진동수가 정하고, 진폭은 소리의 크기와 관계있어요.', '공기 기둥이 짧아지면 정상파의 파장(4L)도 짧아져요. 파장이 길어지면 낮은 음이에요.'],
          explain: '병은 닫힌 관으로 볼 수 있어서 f₁ = v/(4L)이에요. 물이 늘수록 <b>공기 기둥의 길이 L이 짧아져</b> f₁이 커지므로 높은 음이 나요. 같은 길이의 열린 관과 닫힌 관을 비교하면 닫힌 관의 기본음이 한 옥타브(1/2) 낮아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-air-column', mount: '#game', badge: '공기 기둥 박사', homeHref: '../../index.html#hm',
    featureLabels: { tube: '〓 관 속 공기 분자 · 정상파 모양', res: '🔔 공명 관 · 소리굽쇠', meas: '📏 ΔL로 음속 재기', wind: '🎺 플루트·클라리넷 모형', bottle: '🍾 병 불기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  markSeen(S.rs.L, S.rs.L); updateCtl();
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    simStep(dt);
    view.apply();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); S.hit = null;
    switch (S.mode) {
      case 'tube': drawTubeScene(); break;
      case 'res': drawResScene(); break;
      case 'meas': drawMeasScene(); break;
      case 'wind': drawWindScene(); break;
      default: drawBottleScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, updateCtl, loud, resL, measOf, vFrom, vFirst, windGeo, botF, setRL, markSeen, INS,
  };
})();
