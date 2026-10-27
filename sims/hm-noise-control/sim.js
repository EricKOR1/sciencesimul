/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 음파 간섭과 소음 제어 (5차시)
   성취기준 [12역학03-04] 음향 장치 또는 실내외 공간에서의 소음 제어에 음파의 간섭이 활용됨을 이해하고, 실생활에 사용되는 사례를 조사할 수 있다.
   ① 관찰: 소리 중첩 (위상차와 합성 진폭 2A|cos(Δφ/2)|, 맥놀이)
   ② 실험: 스피커 간섭 (경로차 mλ 보강, (m+½)λ 상쇄, 소리의 속력 340 m/s)
   ③ 분석: 소음 상쇄 (능동 소음 제거: 반대 위상, 위상 오차 2A sin(ε/2), 지연 시간과 진동수)
   ④ 적용: 공간 설계 (사례 분류, 공연장 스피커 배치와 데드 스팟)
   두 스피커에서 온 소리의 크기는 거의 같다고 보고 거리에 따른 감소는 무시해요. 회절·실내 음향 정량은 다루지 않아요.
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
  const VS = 340;                                   // 소리의 속력 (m/s)
  const F1 = 440;                                   // 맥놀이·위상차 실험의 기준 진동수 (Hz)
  const SPF = [340, 425, 510, 595, 680, 765, 850, 935, 1020];
  const GREEN_D = '#14532d';

  /* ================= 상태 ================= */
  const S = {
    mode: 'sum', fade: 0, clock: 0,
    sum: { sub: 'phase', ph: 0, f2: 444, rec: {}, beatOK: false },
    spk: { fi: 4, d10: 10, x10: 0, rec: {} },
    anc: { f: 100, B: 100, phi: 90, td: 0, hideNum: false },
    cards: { place: [-1, -1, -1, -1, -1, -1], order: [[], [], []], sel: 0, drag: null },
    hall: { f: 680, xa: -2.5, xb: 2.5 },
    flags: { beatTab: false, beatIn: false, recDark: false, ancA: false, ancB: false, ancIn: false },
    hit: null,
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1e = $('#v1'), v2e = $('#v2'), v3e = $('#v3');
  const MODES = ['sum', 'spk', 'anc', 'cards', 'hall'];
  const ALLOWED = [['sum'], ['spk'], ['anc'], ['cards', 'hall']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; const h = $('#stageHint'); if (h) h.classList.add('hide'); } updateCtl(); }

  /* ================= 물리 계산 (화면·판정이 모두 이 함수를 써요) ================= */
  const ampPhase = (deg) => 2 * Math.abs(Math.cos(deg * Math.PI / 360));            // 합성 진폭 2A|cos(Δφ/2)|
  const spkF = () => SPF[S.spk.fi], spkD = () => S.spk.d10 / 10, spkX = () => S.spk.x10 / 10;
  const lamOf = (f) => VS / f;
  const WALK = 10;                                                                     // 걷는 선까지의 거리 (m)
  function paths(x, d) { const r1 = Math.hypot(x + d / 2, WALK), r2 = Math.hypot(x - d / 2, WALK); return { r1, r2, dr: Math.abs(r1 - r2) }; }
  const ampSpk = (dr, lam) => 2 * Math.abs(Math.cos(Math.PI * dr / lam));
  const isDarkSpot = (dr, lam) => dr > 1e-6 && Math.abs(dr - lam / 2) <= Math.max(0.01 * lam, 0.006);      // 0.1 m 칸에서 가장 가까운 자리만 인정 (680 Hz: 2.6 m, 340 Hz: 5.7~5.9 m)
  /* 능동 소음 제거: 소음 sin(ωt), 스피커 소리 B sin(ωt + ψ), ψ = 설정한 위상 − 360° f t_d (지연 때문에 늦어져요) */
  function ancCalc() {
    const a = S.anc, B = a.B / 100, psi = a.phi - 360 * a.f * a.td / 1e5;
    let eps = ((psi - 180) % 360 + 540) % 360 - 180;                                    // 위상 오차 (−180°~180°)
    const R = Math.sqrt(Math.max(0, 1 + B * B - 2 * B * Math.cos(eps * Math.PI / 180)));
    return { B, psi, eps, R, db: R < 1e-3 ? -Infinity : 20 * Math.log10(R) };
  }
  const dbTxt = (R) => (R < 0.001 ? '−60 dB 이하' : fx(20 * Math.log10(R), 1, true) + ' dB');
  const Rtxt = (R) => fx(R, 2) + ' A';

  /* ---------- 그래프 도우미 ---------- */
  function plotF(M, fn, t0, t1, col, lw, dash) {
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 1, M.iw, M.ih + 2); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); const n = Math.max(60, Math.floor(M.iw / 2));
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, x = M.ix + M.iw * i / n, y = M.gy(fn(t)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  const ampLbl = (v) => (v === 0 ? '0' : (v < 0 ? MINUS : '') + Math.abs(v));
  function dot(M, x, y, col, r) { D.sphere(M.gx(x), M.gy(y), r || 6.5, col, { gloss: false }); }

  /* ================= ① 소리 중첩 ================= */
  const TWIN = 1.0;                                                                    // 맥놀이 화면의 시간 폭 (s)
  function beatBand(M, f1, f2, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 1, M.iw, M.ih + 2); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let px = 0; px < M.iw; px++) {
      const tc = (px + 0.5) / M.iw * TWIN; let mn = 9, mx = -9;
      for (let k = 0; k < 12; k++) { const t = tc + (k / 11 - 0.5) * 1.5 / f1, y = Math.sin(TAU * f1 * t) + Math.sin(TAU * f2 * t); if (y < mn) mn = y; if (y > mx) mx = y; }
      ctx.moveTo(M.ix + px + 0.5, M.gy(mn)); ctx.lineTo(M.ix + px + 0.5, M.gy(mx));
    }
    ctx.stroke(); ctx.restore();
  }
  function drawSumScene() {
    const c = topCard(), s = S.sum; cardBegin(c);
    if (s.sub === 'phase') {
      T(c.x + 14, c.y + 24, '같은 진동수(440 Hz)의 소리 A, B를 겹쳐요', PHONE ? 13.5 : 15, INK, 'left', 800);
      const th = TAU * 0.35 * S.clock, tw = 3 / F1 * 1000, amp = ampPhase(s.ph), hh = (c.h - 50) / 2;
      const rc1 = { x: c.x + 8, y: c.y + 38, w: c.w - 16, h: hh - 2 }, rc2 = { x: c.x + 8, y: c.y + 38 + hh + 2, w: c.w - 16, h: hh - 2 };
      const o = { x0: 0, x1: tw, y0: -2.4, y1: 2.4, xt: [0, 2, 4, 6], yt: [-2, 0, 2], yf: (v) => ampLbl(v) + (v ? 'A' : ''), ml: PHONE ? 44 : 52, mr: 14, mt: 8, mb: 8, xl: false };
      const M1 = frame(rc1, o);
      plotF(M1, (t) => Math.sin(TAU * F1 * t / 1000 - th), 0, tw, BLUE, 3.4);
      plotF(M1, (t) => Math.sin(TAU * F1 * t / 1000 - th - s.ph * Math.PI / 180), 0, tw, ORANGE, 3.4);
      D.label(M1.ix + 8, M1.iy + 14, '소리 A', { bg: BLUE, size: 13, align: 'left' }); D.label(M1.ix + 78, M1.iy + 14, '소리 B (위상 ' + s.ph + '° 늦음)', { bg: ORANGE, size: 13, align: 'left' });
      const M2 = frame(rc2, Object.assign({}, o, { xl: true, xf: (v) => v + ' ms', mb: 24 }));
      [amp, -amp].forEach((a) => { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(20,160,88,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(M2.ix, M2.gy(a)); ctx.lineTo(M2.ix + M2.iw, M2.gy(a)); ctx.stroke(); ctx.restore(); });
      plotF(M2, (t) => Math.sin(TAU * F1 * t / 1000 - th) + Math.sin(TAU * F1 * t / 1000 - th - s.ph * Math.PI / 180), 0, tw, GREEN, 4);
      D.label(M2.ix + 8, M2.iy + 14, 'A + B (합성)', { bg: GREEN, size: 13, align: 'left' });
      D.label(M2.ix + M2.iw - 8, M2.iy + 14, '합성 진폭 ' + fx(amp, 2) + ' A', { bg: GREEN_D, size: 13, align: 'right' });
    } else {
      const f2 = s.f2, df = f2 - F1;
      T(c.x + 14, c.y + 24, '진동수가 조금 다른 두 소리: 440 Hz + ' + f2 + ' Hz', PHONE ? 13.5 : 15, INK, 'left', 800);
      const hh1 = Math.round((c.h - 50) * 0.5), hh2 = c.h - 50 - hh1;
      const rc1 = { x: c.x + 8, y: c.y + 38, w: c.w - 16, h: hh1 - 2 };
      const o = { x0: 0, x1: TWIN, y0: -2.4, y1: 2.4, xt: [0, 0.25, 0.5, 0.75, 1], yt: [-2, 0, 2], yf: (v) => ampLbl(v) + (v ? 'A' : ''), ml: PHONE ? 44 : 52, mr: 14, mt: 8, mb: 22, xf: (v) => v.toFixed(2) };
      const M1 = frame(rc1, o);
      beatBand(M1, F1, f2, GREEN);
      plotF(M1, (t) => 2 * Math.abs(Math.cos(Math.PI * df * t)), 0, TWIN, GREEN_D, 2.2); plotF(M1, (t) => -2 * Math.abs(Math.cos(Math.PI * df * t)), 0, TWIN, GREEN_D, 2.2);
      for (let k = 0; k < df; k++) { const t = k / df; { ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.arc(M1.gx(t), M1.gy(2), 4.5, 0, TAU); ctx.fill(); } }
      D.label(M1.ix + 8, M1.iy + 14, 'A + B의 크기 변화 (1초 동안, 초록 띠)', { bg: GREEN, size: 13, align: 'left' });
      const ph = (S.clock * 0.25) % 1; ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(M1.gx(ph), M1.iy); ctx.lineTo(M1.gx(ph), M1.iy + M1.ih); ctx.stroke(); ctx.restore();
      // 확대 창 두 개: 같은 위상(보강)일 때와 반대 위상(상쇄)일 때
      const y2 = c.y + 38 + hh1 + 4, wz = (c.w - 16 - 10) / 2, hz = hh2 - 8 - 18;
      [[0, '맨 처음: 두 소리가 같은 위상 → 크게'], [1 / (2 * df), (1 / (2 * df)).toFixed(3) + ' s 뒤: 반대 위상 → 작게']].forEach((q, i) => {
        const rz = { x: c.x + 8 + i * (wz + 10), y: y2 + 18, w: wz, h: hz }, span = 0.016, t0 = q[0] - span / 2;
        const Mz = frame(rz, { x0: 0, x1: span * 1000, y0: -2.4, y1: 2.4, xt: [], yt: [0], yl: false, ml: 8, mr: 8, mt: 6, mb: 6, xl: false });
        plotF(Mz, (t) => Math.sin(TAU * F1 * (t0 + t / 1000)), 0, span * 1000, BLUE, 2.2); plotF(Mz, (t) => Math.sin(TAU * f2 * (t0 + t / 1000)), 0, span * 1000, ORANGE, 2.2);
        plotF(Mz, (t) => Math.sin(TAU * F1 * (t0 + t / 1000)) + Math.sin(TAU * f2 * (t0 + t / 1000)), 0, span * 1000, GREEN, 3.4);
        T(rz.x + 4, rz.y - 5, q[1], 13, i ? '#b91c1c' : GREEN_D, 'left', 800);
      });
    }
    ctx.restore();
    // ---- 아래 패널 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12;
    if (s.sub === 'phase') {
      const gw = PHONE ? PW - 24 : 470, gh = PHONE ? 150 : PH - 46;
      T(x1, PY + 22, '📈 합성 진폭(세로)–위상차(가로) 그래프', 14, INK, 'left', 800);
      const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: 0, x1: 180, y0: 0, y1: 2.4, xt: [0, 45, 90, 135, 180], xf: (v) => v + '°', yt: [0, 1, 2], yf: (v) => v + 'A', ml: PHONE ? 40 : 46, mr: 14, mt: 10, mb: 24 });
      plotF(M, (p) => ampPhase(p), 0, 180, GREEN, 3.4);
      Object.keys(s.rec).forEach((k) => { if (s.rec[k]) dot(M, +k, ampPhase(+k), '#0f766e', 6); });
      dot(M, s.ph, ampPhase(s.ph), ORANGE, 8);
      D.label(M.gx(s.ph) + (s.ph > 120 ? -8 : 10), M.gy(ampPhase(s.ph)) - 18, fx(ampPhase(s.ph), 2) + ' A', { bg: ORANGE, size: 13, align: s.ph > 120 ? 'right' : 'left' });
      const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 40) : PH - 24;
      D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
      T(tx + 12, ty + 24, '📋 기록한 합성 진폭', 14, INK, 'left', 800);
      [0, 90, 180].forEach((p, i) => {
        const yy = ty + 54 + i * 28, ok = s.rec[p];
        T(tx + 14, yy, '위상차 ' + p + '°', 14, INK, 'left', 800);
        T(tx + tw - 14, yy, ok ? fx(ampPhase(p), 2) + ' A' : '—', 14, ok ? GREEN_D : '#9aa6bd', 'right', 800);
      });
      if (!PHONE) para(tx + 12, ty + 54 + 3 * 28 + 6, '합성 진폭 = 2A|cos(Δφ/2)|. 위상이 같으면 2A, 반대면 0이에요.', tw - 24, 13.5, '#14532d', 19, 700);
    } else {
      D.roundRect(x1, PY + 12, PW - 24, PH - 24, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
      T(x1 + 14, PY + 38, '🥁 맥놀이: 합성 소리의 크기가 주기적으로 변해요', 14.5, INK, 'left', 800);
      const lines = ['소리 A: 440 Hz', '소리 B: ' + s.f2 + ' Hz', s.beatOK ? '맥놀이 진동수 |f₁ − f₂| = ' + Math.abs(s.f2 - F1) + ' Hz (1초에 ' + Math.abs(s.f2 - F1) + '번)' : '위 그래프의 주황색 점은 소리가 가장 커지는 순간이에요. 1초 동안 몇 번인지 세어 봐요.'];
      lines.forEach((ln, i) => { if (i < 2) T(x1 + 14, PY + 66 + i * 26, ln, 14, i ? '#b45309' : '#1d4ed8', 'left', 800); });
      para(x1 + 14, PY + 66 + 2 * 26 + 4, lines[2], PW - 52, 14, s.beatOK ? GREEN_D : INK, 20, 700);
      if (!PHONE) para(x1 + 14, PY + 66 + 2 * 26 + 4 + 62, '아래 두 개의 확대 그림에서 두 소리가 같은 위상으로 만나면 크게(보강), 반대 위상으로 만나면 작게(상쇄) 들려요.', PW - 52, 13.5, MUTED, 19, 700);
    }
  }

  /* ================= ② 스피커 간섭 ================= */
  const CELL = 4;
  let fieldCv = null, fctx = null, fimg = null, fgeo = null;
  function roomGeo(c) {
    const s = Math.min((c.w - 24) / 20, (c.h - 48) / 11.6), w = 20 * s, h = 11.6 * s, x0 = c.x + (c.w - w) / 2, y0 = c.y + 40;
    return { s, w, h, x0, y0, X: (x) => x0 + (x + 10) * s, Y: (y) => y0 + (y + 0.8) * s };
  }
  function ensureField(G, d) {
    const nx = Math.ceil(G.w / CELL), ny = Math.ceil(10.8 * G.s / CELL), key = [nx, ny, d, G.s].join('|');
    if (fgeo && fgeo.key === key) return fgeo;
    if (!fieldCv) { fieldCv = document.createElement('canvas'); fctx = fieldCv.getContext('2d'); }
    fieldCv.width = nx; fieldCv.height = ny; fimg = fctx.createImageData(nx, ny);
    const r1 = new Float32Array(nx * ny), r2 = new Float32Array(nx * ny);
    for (let j = 0, k = 0; j < ny; j++) { const yy = (j + 0.5) * CELL / G.s; for (let i = 0; i < nx; i++, k++) { const xx = -10 + (i + 0.5) * CELL / G.s; r1[k] = Math.hypot(xx + d / 2, yy); r2[k] = Math.hypot(xx - d / 2, yy); } }
    fgeo = { key, nx, ny, r1, r2 }; return fgeo;
  }
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const C_BASE = hexRgb('#eef2f9'), C_POS = hexRgb('#f59e0b'), C_NEG = hexRgb('#2563eb');
  function hyper(G, d, delta) {                   // 경로차 delta인 곡선 (두 가지 가지)
    const a = delta / 2, c2 = d / 2, b2 = c2 * c2 - a * a;
    const pts = [[], []];
    for (let y = 0; y <= 10.8 + 1e-9; y += 0.12) { const x = delta < 1e-9 ? 0 : a * Math.sqrt(1 + y * y / b2); pts[0].push([G.X(x), G.Y(y)]); pts[1].push([G.X(-x), G.Y(y)]); }
    return pts;
  }
  function drawSpkScene() {
    const c = topCard(), d = spkD(), f = spkF(), lam = lamOf(f), x = spkX(); cardBegin(c);
    T(c.x + 14, c.y + 24, PHONE ? 'f = ' + f + ' Hz · 스피커 2개' : '위에서 본 방: 같은 소리를 내는 스피커 2개 (f = ' + f + ' Hz)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const G = roomGeo(c), fg = ensureField(G, d);
    // 파면 지도 (찰나의 모습, 느리게)
    const k = TAU / lam, ph = TAU * 0.45 * S.clock, data = fimg.data, n = fg.nx * fg.ny;
    for (let q = 0; q < n; q++) {
      const v = (Math.cos(k * fg.r1[q] - ph) + Math.cos(k * fg.r2[q] - ph)) * 0.5, a = Math.abs(v), t = v >= 0 ? C_POS : C_NEG, o = q * 4;
      data[o] = C_BASE[0] + (t[0] - C_BASE[0]) * a; data[o + 1] = C_BASE[1] + (t[1] - C_BASE[1]) * a; data[o + 2] = C_BASE[2] + (t[2] - C_BASE[2]) * a; data[o + 3] = 255;
    }
    fctx.putImageData(fimg, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.Y(0), G.w, 10.8 * G.s); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(fieldCv, G.x0, G.Y(0), fg.nx * CELL, fg.ny * CELL);
    // 보강선(주황 점선)과 상쇄선(남색 실선)
    for (let m = 0; m < 40; m++) {
      const db = m * lam, dd = (m + 0.5) * lam;
      if (db < d - 1e-6) { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); hyper(G, d, db).forEach((pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }); }
      if (dd < d - 1e-6) { ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2.6; ctx.setLineDash([]); hyper(G, d, dd).forEach((pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }); }
    }
    ctx.restore(); ctx.setLineDash([]);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.strokeRect(G.x0, G.Y(-0.8), G.w, 11.6 * G.s);
    // 벽과 스피커
    ctx.fillStyle = '#64748b'; ctx.fillRect(G.x0, G.Y(-0.8), G.w, 0.8 * G.s);
    [-d / 2, d / 2].forEach((sx, i) => {
      const px = G.X(sx), py = G.Y(0);
      D.shadow(() => { D.roundRect(px - 11, py - 17, 22, 20, 5); ctx.fillStyle = '#1e293b'; ctx.fill(); }, { blur: 4, y: 1 });
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(px, py - 6, 5.5, 0, TAU); ctx.fill();
      T(px + (i ? 18 : -18), py - 6, 'S' + (i + 1), 13, '#fff', i ? 'left' : 'right', 800);
    });
    // 걷는 선과 세기 띠
    const wy = G.Y(WALK); ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(30,41,59,.65)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(G.x0, wy); ctx.lineTo(G.x0 + G.w, wy); ctx.stroke(); ctx.restore();
    for (let px = 0; px < G.w; px += 3) {
      const xx = -10 + (px + 1.5) / G.s, p = paths(xx, d), a = ampSpk(p.dr, lam) / 2, t = a * a;
      ctx.fillStyle = 'rgb(' + Math.round(30 + 223 * t) + ',' + Math.round(58 + 156 * t) + ',' + Math.round(138 - 28 * t) + ')'; ctx.fillRect(G.x0 + px, wy + 7, 3, 9);
    }
    T(G.x0 + 4, wy - 6, '걷는 선 (스피커에서 10 m)', 13, '#334155', 'left', 800, { stroke: 'rgba(238,242,250,.85)', strokeWidth: 3 });
    // 사람(마이크)
    const mx = G.X(x), pp = paths(x, d);
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.X(-d / 2), G.Y(0)); ctx.lineTo(mx, wy); ctx.moveTo(G.X(d / 2), G.Y(0)); ctx.lineTo(mx, wy); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(mx, wy, 9, PURPLE, { gloss: true }); T(mx, wy - 14, '🎤', 20, '#000', 'center', 700);
    S.hit = { mic: { x: mx, y: wy, G } };
    // 범례
    const lx = c.x + c.w - 14;
    const lb = D.label(lx, c.y + 24, '상쇄선 (m+½)λ', { bg: '#1e3a8a', size: 13, align: 'right' });
    D.label(lb.x - 8, c.y + 24, '보강선 mλ', { bg: '#b45309', size: 13, align: 'right' });
    ctx.restore();
    // ---- 아래 패널 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 470, gh = PHONE ? 120 : PH - 46;
    T(x1, PY + 22, '📈 걷는 선 위의 합성 소리 크기 (진폭, A)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: -10, x1: 10, y0: 0, y1: 2.4, xt: [-10, -5, 0, 5, 10], xf: (v) => v + ' m', yt: [0, 1, 2], yf: (v) => v + 'A', ml: PHONE ? 40 : 46, mr: 14, mt: 10, mb: 24 });
    plotF(M, (xx) => ampSpk(paths(xx, d).dr, lam), -10, 10, GREEN, 3.2);
    Object.keys(S.spk.rec).forEach((kf) => { const r = S.spk.rec[kf]; if (r) [r.x, -r.x].forEach((xx) => { ctx.fillStyle = '#0f766e'; ctx.beginPath(); ctx.moveTo(M.gx(xx), M.iy + M.ih - 1); ctx.lineTo(M.gx(xx) - 6, M.iy + M.ih - 13); ctx.lineTo(M.gx(xx) + 6, M.iy + M.ih - 13); ctx.closePath(); ctx.fill(); }); });
    dot(M, x, ampSpk(pp.dr, lam), PURPLE, 8);
    const am = ampSpk(pp.dr, lam);
    D.label(M.gx(x) + (x > 4 ? -10 : 12), M.gy(am) - 18, fx(am, 2) + ' A', { bg: PURPLE, size: 13, align: x > 4 ? 'right' : 'left' });
    // 정보 칸
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 40) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 22, '📏 경로차 눈금자 (m)', 14, INK, 'left', 800);
    const rx = tx + 16, rw = tw - 32, ry = ty + 64;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rw, ry); ctx.stroke();
    const nHalf = Math.floor(d / (lam / 2) + 1e-9), skip = rw * (lam / 2) / d < 34 ? 2 : 1;
    for (let q = 0; q <= nHalf; q += 1) {
      const xx = rx + rw * (q * lam / 2) / d; ctx.beginPath(); ctx.moveTo(xx, ry - 6); ctx.lineTo(xx, ry + 6); ctx.stroke();
      if (q % skip === 0) { const lab = q === 0 ? '0' : q === 1 ? 'λ/2' : q % 2 === 0 ? (q / 2 === 1 ? 'λ' : q / 2 + 'λ') : q + 'λ/2'; T(xx, ry + 24, lab, 13, '#334155', 'center', 800); }
    }
    const px = rx + rw * clamp(pp.dr / d, 0, 1); D.sphere(px, ry, 7, PURPLE, { gloss: false });
    T(rx, ry - 14, '경로차 = ' + fx(pp.dr, 2) + ' m', 14, '#6d28d9', 'left', 800);
    T(tx + 12, ry + 52, 'r₁ = ' + fx(pp.r1, 2) + ' m, r₂ = ' + fx(pp.r2, 2) + ' m', 13.5, INK, 'left', 800);
    T(tx + 12, ry + 76, '파장 λ = ' + fx(lam, 2) + ' m (λ/2 = ' + fx(lam / 2, 2) + ' m)', 13.5, '#1d4ed8', 'left', 800);
    const verdict = am >= 1.8 ? ['크게 들려요 (보강)', GREEN_D] : am <= 0.4 ? ['작게 들려요 (상쇄)', '#b91c1c'] : ['중간 크기로 들려요', MUTED];
    T(tx + 12, ry + 102, verdict[0], 14.5, verdict[1], 'left', 800);
  }

  /* ================= ③ 소음 상쇄 ================= */
  const ancXt = (f) => (f <= 100 ? [0, 10, 20, 30] : f <= 500 ? [0, 2, 4, 6] : [0, 0.5, 1, 1.5]);
  function ancScope(rc, fn, col, lw, tag, tagCol, refs) {
    const a = S.anc, tw = 3 / a.f * 1000;
    const M = frame(rc, { x0: 0, x1: tw, y0: -2.4, y1: 2.4, xt: ancXt(a.f), xf: (v) => (v % 1 ? v.toFixed(1) : v) + '', yt: [-2, -1, 0, 1, 2], yf: (v) => ampLbl(v), ml: PHONE ? 30 : 34, mr: 8, mt: 6, mb: PHONE ? 6 : 22, xl: !PHONE });
    (refs || []).forEach((r) => { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(226,70,75,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(M.ix, M.gy(r)); ctx.lineTo(M.ix + M.iw, M.gy(r)); ctx.stroke(); ctx.restore(); });
    plotF(M, fn, 0, tw, col, lw);
    D.label(M.ix + 6, M.iy + 12, tag, { bg: tagCol, size: 13, align: 'left' });
    return M;
  }
  function drawAncScene() {
    const c = topCard(), a = S.anc, q = ancCalc(); cardBegin(c);
    T(c.x + 14, c.y + 24, PHONE ? '헤드폰 모형 (소음 ' + a.f + ' Hz) · 가로: ms' : '능동 소음 제거 헤드폰 모형 (소음 ' + a.f + ' Hz, 가로: 시간 ms, 세로: 진폭 A)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const th = TAU * 0.35 * S.clock, w = TAU * a.f / 1000, psi = q.psi * Math.PI / 180;     // t는 ms
    const noise = (t) => Math.sin(w * t - th), anti = (t) => q.B * Math.sin(w * t - th + psi), sum = (t) => noise(t) + anti(t);
    // 신호 흐름 그림: 마이크 → 처리(뒤집기 + 지연) → 스피커
    const dy = c.y + (PHONE ? 32 : 36), bw = PHONE ? 138 : 200, bh = PHONE ? 30 : 38, gap = PHONE ? 15 : 36;
    const bx0 = c.x + (c.w - (3 * bw + 2 * gap)) / 2;
    [['🎤 마이크', '#475569'], [PHONE ? '⚙ 뒤집기+지연' : '⚙ 위상 뒤집기 + 지연 ' + fx(a.td / 100, 2) + ' ms', '#7c3aed'], ['🔈 스피커', '#2563eb']].forEach((b, i) => {
      const x = bx0 + i * (bw + gap); D.roundRect(x, dy, bw, bh, 10); ctx.fillStyle = b[1]; ctx.fill(); T(x + bw / 2, dy + bh / 2 + 5, b[0], 13.5, '#fff', 'center', 800);
      if (i < 2) D.arrow(x + bw + 3, dy + bh / 2, x + bw + gap - 3, dy + bh / 2, { color: '#475569', width: 3, head: 9 });
    });
    const sy = dy + bh + (PHONE ? 8 : 14);
    const hide = a.hideNum;
    let rcs;
    if (PHONE) { const hh = Math.floor((c.y + c.h - 8 - sy) / 3); rcs = [0, 1, 2].map((i) => ({ x: c.x + 8, y: sy + i * hh, w: c.w - 16, h: hh - 4 })); }
    else { const ww = (c.w - 16 - 2 * 30) / 3, hh = c.y + c.h - 10 - sy; rcs = [0, 1, 2].map((i) => ({ x: c.x + 8 + i * (ww + 30), y: sy, w: ww, h: hh })); [0, 1].forEach((i) => T(rcs[i].x + ww + 15, sy + hh / 2 + 10, i ? '=' : '+', 30, '#475569', 'center', 800)); }
    ancScope(rcs[0], noise, RED, 3.2, PHONE ? '소음' : '소음 (밖에서 들어와요)', RED);
    ancScope(rcs[1], anti, BLUE, 3.2, PHONE ? '+ 스피커 소리' : '스피커 소리 (크기 ' + a.B + '%)', BLUE);
    ancScope(rcs[2], sum, GREEN, 4, PHONE ? '= 귀에 들리는 소리' + (hide ? '' : ' (' + Rtxt(q.R) + ')') : '귀에 들리는 소리' + (hide ? '' : ' (진폭 ' + Rtxt(q.R) + ')'), GREEN_D, [1, -1]);
    ctx.restore();
    // ---- 아래 패널 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 440, gh = PHONE ? 130 : PH - 46;
    T(x1, PY + 22, '📈 잔여 소음 진폭(세로)–위상 오차 ε(가로)', 14, INK, 'left', 800);
    const M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 8 }, { x0: 0, x1: 180, y0: 0, y1: 2.4, xt: [0, 30, 60, 90, 120, 150, 180], xf: (v) => v + '°', yt: [0, 1, 2], yf: (v) => v + 'A', ml: PHONE ? 40 : 46, mr: 14, mt: 10, mb: 24 });
    ctx.fillStyle = 'rgba(226,70,75,.10)'; const yr = M.gy(1), yt0 = M.iy; ctx.fillRect(M.ix, yt0, M.iw, yr - yt0);
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(M.ix, yr); ctx.lineTo(M.ix + M.iw, yr); ctx.stroke(); ctx.restore();
    T(M.ix + M.iw - 4, yr - 6, '소음보다 커져요', 13, '#b91c1c', 'right', 800);
    plotF(M, (e) => Math.sqrt(Math.max(0, 1 + q.B * q.B - 2 * q.B * Math.cos(e * Math.PI / 180))), 0, 180, GREEN, 3.4);
    if (!hide) {
      const ae = Math.abs(q.eps); dot(M, ae, q.R, ORANGE, 8);
      D.label(M.gx(ae) + (ae > 120 ? -10 : 12), M.gy(q.R) + (q.R > 1.9 ? 20 : -18), '오차 ' + fx(ae, 0) + '° → ' + Rtxt(q.R), { bg: ORANGE, size: 13, align: ae > 120 ? 'right' : 'left' });
    }
    // 데시벨 계기
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 18 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 40) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(tx + 12, ty + 24, '🔉 소음의 변화 (dB)', 14, INK, 'left', 800);
    const bx = tx + 14, bw2 = tw - 28, by = ty + 56, bh2 = 20, lo = -40, hi = 10, gx2 = (v) => bx + bw2 * (clamp(v, lo, hi) - lo) / (hi - lo);
    D.roundRect(bx, by, bw2, bh2, 10); ctx.fillStyle = '#e4e9f3'; ctx.fill();
    if (!hide) {
      const v = q.db === -Infinity ? lo : clamp(q.db, lo, hi);
      ctx.save(); D.roundRect(bx, by, bw2, bh2, 10); ctx.clip(); ctx.fillStyle = q.db <= -20 ? GREEN : q.db < 0 ? ORANGE : RED; ctx.fillRect(bx, by, gx2(v) - bx, bh2); ctx.restore();
    }
    [-40, -20, 0].forEach((v) => { ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx2(v), by + bh2); ctx.lineTo(gx2(v), by + bh2 + 5); ctx.stroke(); T(gx2(v), by + bh2 + 21, v === 0 ? '0' : MINUS + Math.abs(v), 13, '#3a465c', 'center', 800); });
    T(bx + bw2, by + bh2 + 21, '+10', 13, '#3a465c', 'right', 800);
    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx2(-20), by - 4); ctx.lineTo(gx2(-20), by + bh2 + 4); ctx.stroke();
    T(gx2(-20), by - 8, '목표', 13, '#15803d', 'center', 800);
    const big = hide ? '?' : q.db === -Infinity || q.R < 0.001 ? '−60 dB 이하' : dbTxt(q.R);
    T(tx + 14, ty + 130, hide ? '잔여 소음 진폭: ?' : '잔여 소음 진폭: ' + Rtxt(q.R), 14.5, INK, 'left', 800);
    T(tx + 14, ty + 156, '소음 변화: ' + big, 15, hide ? MUTED : q.db <= -20 ? GREEN_D : q.db < 0 ? '#b45309' : '#b91c1c', 'left', 800);
    T(tx + 14, ty + 182, '위상 오차: ' + fx(Math.abs(q.eps), 0) + '°', 14, INK, 'left', 800);
    if (!PHONE) T(tx + 14, ty + 206, '진폭 1/10 → −20 dB', 13, MUTED, 'left', 700);
  }

  /* ================= ④ 사례 분류 ================= */
  const CATS = [{ t: '간섭으로 상쇄', col: '#2563eb', bg: '#e8f0ff' }, { t: '흡수·반사로 차단', col: '#b45309', bg: '#fdf1dc' }, { t: '간섭으로 증폭', col: '#15803d', bg: '#e6f7ec' }];
  const CASES = [
    { ic: '🎧', n: '소음 제거 헤드폰', cat: 0, p: '마이크로 소음을 받아 반대 위상의 소리를 스피커로 내요. 두 소리가 상쇄 간섭해요.', g: '비행기·엔진 같은 낮은 진동수의 지속음에 효과적이에요.', l: '지연 때문에 높은 진동수나 갑작스러운 소리는 지우기 어려워요.' },
    { ic: '🚗', n: '자동차 실내 장치', cat: 0, p: '엔진 소음을 마이크로 재고, 실내 스피커로 반대 위상의 소리를 내 상쇄해요.', g: '무거운 방음재 없이도 엔진 소음(낮은 진동수)을 줄여요.', l: '귀의 위치에 따라 상쇄되는 정도가 달라요.' },
    { ic: '💨', n: '간섭형 머플러', cat: 0, p: '배기 소리를 두 갈래 관으로 나눴다 합쳐요. 경로차가 반 파장(λ/2)이면 상쇄 간섭해요.', g: '전기 장치 없이 특정한 진동수의 배기 소음을 줄여요.', l: '정해진 진동수 근처에서만 효과가 커요.' },
    { ic: '🧱', n: '도로 방음벽', cat: 1, p: '소리를 반사하고 흡수해 벽 뒤쪽 직접음의 세기를 낮춰요. 약 5~10 dB 줄어요.', g: '여러 진동수의 소음을 한꺼번에 줄여요.', l: '벽 위로 넘어가거나 틈으로 새는 소리는 막지 못해요.' },
    { ic: '🎶', n: '흡음 패널', cat: 1, p: '구멍이 많은 재료가 소리를 열로 바꿔 흡수해요. 음악실의 울림을 줄여요.', g: '실내의 반사음과 울림을 줄여 소리가 또렷해져요.', l: '두꺼울수록 효과가 커서 공간이 필요해요.' },
    { ic: '🏟', n: '공연장 스피커', cat: 2, p: '스피커의 위치와 간격을 골라 관객석에서 소리가 보강 간섭하게 해 소리를 키워요.', g: '멀리 있는 관객에게도 크고 고르게 들려요.', l: '상쇄되는 곳(데드 스팟)이 생기지 않게 배치해야 해요.' },
  ];
  const CAP = 3;
  const cd = () => (PHONE ? { w: 136, h: 40 } : { w: 112, h: 52 });
  function cardGeo(c) {
    const d = cd(), by = c.y + 34, bh = PHONE ? 30 + 3 * 44 + 4 : 30 + 2 * 58 + 6;
    const bw = PHONE ? 148 : (c.w - 16 * 4) / 3, bxs = [0, 1, 2].map((i) => c.x + (PHONE ? 6 : 16) + i * (bw + (PHONE ? 6 : 16)));
    const bucket = (i) => ({ x: bxs[i], y: by, w: bw, h: bh });
    const slot = (b, k) => { const r = bucket(b); return PHONE ? { x: r.x + 6, y: r.y + 30 + k * 44, w: d.w, h: d.h } : { x: r.x + 8 + (k % 2) * (d.w + 5), y: r.y + 30 + Math.floor(k / 2) * 58, w: d.w, h: d.h }; };
    const ty = by + bh + (PHONE ? 30 : 34);
    const tray = (i) => (PHONE ? { x: c.x + 8 + (i % 3) * 152, y: ty + Math.floor(i / 3) * 46, w: 146, h: 40 } : { x: c.x + 16 + i * 128, y: ty, w: d.w, h: d.h });
    return { d, bucket, slot, tray, ty, bh, by };
  }
  function cardRect(i, c) {
    const G = cardGeo(c), p = S.cards.place[i];
    return p < 0 ? G.tray(i) : G.slot(p, S.cards.order[p].indexOf(i));
  }
  function drawChip(r, i, o) {
    o = o || {}; const cs = CASES[i];
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: o.lift ? 10 : 4, y: o.lift ? 4 : 1 });
    D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = o.sel ? ORANGE : '#cfd8e8'; ctx.lineWidth = o.sel ? 3 : 1.5; ctx.stroke();
    if (PHONE) { T(r.x + 6, r.y + r.h / 2 + 8, cs.ic, 22, '#000', 'left', 700); T(r.x + 34, r.y + r.h / 2 + 5, cs.n, 13, INK, 'left', 800); }
    else { T(r.x + r.w / 2, r.y + 24, cs.ic, 22, '#000', 'center', 700); T(r.x + r.w / 2, r.y + 44, cs.n, 13, INK, 'center', 800); }
    ctx.restore();
  }
  function drawCardsScene() {
    const c = topCard(), cs = S.cards; cardBegin(c);
    const G = cardGeo(c);
    T(c.x + 14, c.y + 24, PHONE ? '카드를 끌어 알맞은 칸에 놓아요' : '소음 제어 사례를 원리별로 분류해요 (카드를 끌어 놓거나, 카드 → 칸 순서로 눌러요)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    CATS.forEach((ct, b) => {
      const r = G.bucket(b);
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = ct.bg; ctx.fill(); ctx.strokeStyle = ct.col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(r.x + r.w / 2, r.y + 21, ct.t, PHONE ? 13.5 : 15, ct.col, 'center', 800);
      T(r.x + r.w - 8, r.y + r.h - 7, cs.order[b].length + '/' + CAP, 13, ct.col, 'right', 800);
    });
    T(c.x + 16, G.ty - 10, '아직 분류하지 않은 카드', 13.5, MUTED, 'left', 800);
    const hits = [];
    for (let i = 0; i < CASES.length; i++) {
      if (cs.drag && cs.drag.i === i) continue;
      const r = cardRect(i, c); drawChip(r, i, { sel: cs.sel === i }); hits.push({ i, r });
    }
    if (cs.drag && cs.drag.moved) { const dr = cs.drag, r = { x: dr.x - dr.dx, y: dr.y - dr.dy, w: cd().w, h: cd().h }; drawChip(r, dr.i, { sel: true, lift: true }); }
    else if (cs.drag) { const r = cardRect(cs.drag.i, c); drawChip(r, cs.drag.i, { sel: true }); }
    S.hit = { cards: hits, G, c };
    ctx.restore();
    // ---- 아래 패널: 선택한 카드의 조사 내용 ----
    panel(PX, PY, PW, PH, 16);
    const cse = CASES[cs.sel], x1 = PX + 14;
    T(x1, PY + 28, '🔎 조사 카드: ' + cse.ic + ' ' + cse.n, 15, INK, 'left', 800);
    const rows = [['원리', cse.p, '#1d4ed8'], ['장점', cse.g, '#15803d'], ['한계', cse.l, '#b45309']];
    let yy = PY + 56;
    rows.forEach((r) => { D.label(x1, yy + 4, r[0], { bg: r[2], size: 13, align: 'left' }); const hgt = para(x1 + 56, yy, r[1], PW - 100, 14, INK, 20, 700); yy += Math.max(32, hgt + 12); });
    if (!PHONE) para(x1, PY + PH - 54, '카드를 눌러 선택하면 원리·장점·한계를 볼 수 있어요. 소음 제어에는 소리를 간섭으로 없애는 방법, 막거나 흡수하는 방법, 간섭으로 키우는 방법이 있어요.', PW - 40, 13.5, MUTED, 19, 700);
  }

  /* ================= ④ 공연장 배치 ================= */
  const HX0 = -8, HX1 = 8, HY0 = 6, HY1 = 14, HC = 0.25, HNX = 64, HNY = 32;
  const dCache = {};
  function deadSpots(f, xa, xb) {
    const key = f + '|' + xa.toFixed(3) + '|' + xb.toFixed(3); if (dCache[key]) return dCache[key];
    const lam = lamOf(f), dead = new Uint8Array(HNX * HNY);
    for (let j = 0; j < HNY; j++) { const y = HY0 + (j + 0.5) * HC; for (let i = 0; i < HNX; i++) { const x = HX0 + (i + 0.5) * HC, cc = Math.cos(Math.PI * (Math.hypot(x - xa, y) - Math.hypot(x - xb, y)) / lam); dead[j * HNX + i] = cc * cc < 0.12 ? 1 : 0; } }
    const seen = new Uint8Array(HNX * HNY), out = [];
    for (let s0 = 0; s0 < dead.length; s0++) {
      if (!dead[s0] || seen[s0]) continue;
      const st = [s0]; seen[s0] = 1; let sx = 0, sy = 0, n = 0;
      while (st.length) { const q = st.pop(), qi = q % HNX, qj = (q - qi) / HNX; sx += qi; sy += qj; n++; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ni = qi + di, nj = qj + dj; if (ni < 0 || nj < 0 || ni >= HNX || nj >= HNY) continue; const nq = nj * HNX + ni; if (dead[nq] && !seen[nq]) { seen[nq] = 1; st.push(nq); } } }
      if (n >= 4) out.push({ cx: HX0 + (sx / n + 0.5) * HC, cy: HY0 + (sy / n + 0.5) * HC, n });
    }
    out.sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    const keys = Object.keys(dCache); if (keys.length > 400) delete dCache[keys[0]];
    return (dCache[key] = out);
  }
  const hallDead = () => deadSpots(S.hall.f, S.hall.xa, S.hall.xb);
  const hallD = () => Math.abs(S.hall.xb - S.hall.xa);
  let heatCv = null, heatKey = '';
  function hallGeo(c) {
    const s = Math.min(PHONE ? (c.w - 24) / 20 : (c.w - 330) / 20, (c.h - 46) / 16.6), w = 20 * s, x0 = PHONE ? c.x + (c.w - w) / 2 : c.x + 14, y0 = c.y + 38;
    return { s, w, x0, y0, X: (x) => x0 + (x + 10) * s, Y: (y) => y0 + (y + 2) * s };
  }
  function ensureHeat(G) {
    const h = S.hall, key = [h.f, h.xa.toFixed(3), h.xb.toFixed(3), G.s.toFixed(3)].join('|'); if (key === heatKey && heatCv) return;
    heatKey = key; const lam = lamOf(h.f), nx = Math.ceil(G.w / 4), ny = Math.ceil(14.6 * G.s / 4);
    if (!heatCv) heatCv = document.createElement('canvas'); heatCv.width = nx; heatCv.height = ny; const g = heatCv.getContext('2d'), im = g.createImageData(nx, ny);
    for (let j = 0, k = 0; j < ny; j++) { const y = (j + 0.5) * 4 / G.s; for (let i = 0; i < nx; i++, k++) { const x = -10 + (i + 0.5) * 4 / G.s, cc = Math.cos(Math.PI * (Math.hypot(x - h.xa, y) - Math.hypot(x - h.xb, y)) / lam), t = cc * cc, o = k * 4; im.data[o] = 30 + 223 * t; im.data[o + 1] = 58 + 156 * t; im.data[o + 2] = 138 - 28 * t; im.data[o + 3] = 255; } }
    g.putImageData(im, 0, 0);
  }
  function drawHallScene() {
    const c = topCard(), h = S.hall, G = hallGeo(c), lam = lamOf(h.f); cardBegin(c);
    T(c.x + 14, c.y + 24, '🏛 공연장을 위에서 본 모습 (밝을수록 소리가 크게 들려요)', PHONE ? 13 : 15, INK, 'left', 800);
    ensureHeat(G);
    ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.Y(0), G.w, 14.6 * G.s); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(heatCv, G.x0, G.Y(0), heatCv.width * 4, heatCv.height * 4); ctx.restore();
    ctx.fillStyle = '#475569'; ctx.fillRect(G.x0, G.Y(-2), G.w, 2 * G.s); T(G.x0 + G.w / 2, G.Y(-1) + 5, '무대', 14, '#fff', 'center', 800);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.strokeRect(G.x0, G.Y(-2), G.w, 16.6 * G.s);
    // 관객석
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.strokeRect(G.X(HX0), G.Y(HY0), (HX1 - HX0) * G.s, (HY1 - HY0) * G.s); ctx.restore();
    D.label(G.X(HX0) + 4, G.Y(HY0) - 10, '관객석', { bg: 'rgba(30,41,59,.85)', size: 13, align: 'left' });
    const dead = hallDead();
    for (let sy = HY0 + 0.5; sy < HY1; sy += 1) for (let sx = HX0 + 0.5; sx < HX1; sx += 1) {
      const cc = Math.cos(Math.PI * (Math.hypot(sx - h.xa, sy) - Math.hypot(sx - h.xb, sy)) / lam); ctx.fillStyle = cc * cc < 0.12 ? '#ef4444' : 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(G.X(sx), G.Y(sy), 2.3, 0, TAU); ctx.fill();
    }
    dead.forEach((q, i) => { const px = G.X(q.cx), py = G.Y(q.cy); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 11, 0, TAU); ctx.stroke(); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(px, py, 9.5, 0, TAU); ctx.fill(); T(px, py + 5, String(i + 1), 13, '#fff', 'center', 800); });
    // 스피커
    const sp = [h.xa, h.xb]; S.hit = { hall: sp.map((sx) => ({ x: G.X(sx), y: G.Y(0) })), G };
    sp.forEach((sx, i) => { const px = G.X(sx), py = G.Y(0); D.shadow(() => { D.roundRect(px - 12, py - 20, 24, 22, 6); ctx.fillStyle = '#0f172a'; ctx.fill(); }, { blur: 4, y: 1 }); ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(px, py - 9, 6, 0, TAU); ctx.fill(); T(px, py + 18, 'S' + (i + 1), 13, '#fff', 'center', 800, { stroke: 'rgba(15,23,42,.8)', strokeWidth: 3 }); });
    if (!PHONE) {
      const rx = G.x0 + G.w + 18, rw = c.x + c.w - rx - 12;
      T(rx, c.y + 64, '데드 스팟', 15, INK, 'left', 800);
      T(rx, c.y + 110, dead.length + '개', 40, dead.length <= 2 ? GREEN_D : '#b91c1c', 'left', 800);
      T(rx, c.y + 136, '목표: 2개 이하', 14, MUTED, 'left', 800);
      para(rx, c.y + 168, '빨간 점이 소리가 거의 안 들리는 자리(데드 스팟)이고, 번호가 붙은 원이 한 덩어리예요.', rw, 13.5, INK, 19, 700);
      T(rx, c.y + 250, 'S1 x = ' + fx(h.xa, 1) + ' m', 13.5, INK, 'left', 800); T(rx, c.y + 272, 'S2 x = ' + fx(h.xb, 1) + ' m', 13.5, INK, 'left', 800); T(rx, c.y + 294, '간격 d = ' + fx(hallD(), 1) + ' m', 13.5, '#1d4ed8', 'left', 800);
    }
    ctx.restore();
    // ---- 아래 패널: 간격별 데드 스팟 수 ----
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 12, gw = PHONE ? PW - 24 : 520, gh = PHONE ? 150 : PH - 48;
    T(x1, PY + 22, '📊 간격 d(m, 가로)별 데드 스팟 수(세로) · ' + h.f + ' Hz', 14, INK, 'left', 800);
    const ctr = (h.xa + h.xb) / 2, ds = []; for (let d2 = 0.5; d2 <= 8.0001; d2 += 0.5) ds.push(d2);
    const cnts = ds.map((d2) => { const xa = clamp(ctr - d2 / 2, -9, 9 - d2), xb = xa + d2; return deadSpots(h.f, xa, xb).length; });
    const ymax = 40, M = frame({ x: x1, y: PY + 30, w: gw, h: gh + 10 }, { x0: 0.25, x1: 8.25, y0: 0, y1: ymax, xt: [1, 2, 3, 4, 5, 6, 7, 8], xf: (v) => v + '', yt: [0, 10, 20, 30, 40], ml: PHONE ? 36 : 40, mr: 12, mt: 10, mb: 24 });
    const curI = ds.findIndex((d2) => Math.abs(d2 - hallD()) < 1e-6);
    ds.forEach((d2, i) => {
      const n = i === curI ? dead.length : cnts[i], bx = M.gx(d2 - 0.17), bwid = M.gx(d2 + 0.17) - bx, hh = Math.min(n, ymax) / ymax * M.ih;
      ctx.fillStyle = i === curI ? ORANGE : n <= 2 ? '#86d6a4' : '#9fb3d4'; ctx.fillRect(bx, M.iy + M.ih - hh, bwid, hh);
    });
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.ix, M.gy(2)); ctx.lineTo(M.ix + M.iw, M.gy(2)); ctx.stroke(); ctx.restore();
    T(M.ix + M.iw - 4, M.gy(2) - 6, '2개 이하', 13, '#15803d', 'right', 800); 
    const tx = PHONE ? x1 : x1 + gw + 14, ty = PHONE ? PY + 30 + gh + 24 : PY + 12, tw = PHONE ? PW - 24 : PW - gw - 38, th2 = PHONE ? PH - (gh + 50) : PH - 24;
    D.roundRect(tx, ty, tw, th2, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    if (PHONE) { T(tx + 12, ty + 26, '데드 스팟 ' + dead.length + '개 (목표 2개 이하) · 간격 ' + fx(hallD(), 1) + ' m', 14, dead.length <= 2 ? GREEN_D : '#b91c1c', 'left', 800); para(tx + 12, ty + 52, '막대는 같은 진동수에서 간격만 바꿨을 때의 데드 스팟 수예요.', tw - 24, 13.5, MUTED, 19, 700); }
    else para(tx + 12, ty + 24, '막대는 지금 진동수와 스피커 중심 위치에서 간격만 바꿨을 때의 데드 스팟 수예요. 주황 막대가 지금 배치예요.', tw - 24, 13.5, INK, 19, 700);
  }

  /* ================= 컨트롤 연결 ================= */
  function updateCtl() {
    const modes = allowedModes(), s = S.sum;
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        const sub = n.getAttribute('data-sub'); if (sub && S.mode === 'sum' && sub !== s.sub) on = false;
        const sh = n.getAttribute('data-show'); if (sh && !revealed(sh)) on = false;
        const c2 = n.getAttribute('data-calc'); if (c2 && !showCalc(c2)) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    pickOn($$('#sumSeg button'), 's', s.sub); pickOn($$('#f2Seg button'), 'f', s.f2);
    setSl('sPh', s.ph, 0, 180); $('#oPh').textContent = s.ph + '°';
    $('#nPh').textContent = '위상차를 바꾸며 초록색 합성 파형의 높이(진폭)를 읽어요. 읽은 값은 아래 그래프와 표에 기록돼요.';
    $('#nBeat').textContent = s.beatOK ? '두 진동수의 차이가 클수록 소리가 더 빨리 커졌다 작아져요.' : '초록 띠의 바깥 모양이 1초 동안 몇 번 커졌다 작아지는지 세어 봐요.';
    const sp = S.spk; setSl('sSf', sp.fi, 0, 8); $('#oSf').textContent = spkF() + ' Hz'; setSl('sSd', sp.d10, 5, 20); $('#oSd').textContent = fx(spkD(), 1) + ' m'; setSl('sSx', sp.x10, -100, 100); $('#oSx').textContent = (spkX() < 0 ? MINUS : '') + Math.abs(spkX()).toFixed(1) + ' m';
    $('#nSpk').textContent = '걷는 사람(🎤)을 좌우로 옮기며 경로차와 소리 크기를 비교해요. 지도를 직접 끌어도 돼요.';
    const a = S.anc; setSl('sAp', a.phi, 0, 360); $('#oAp').textContent = a.phi + '°'; setSl('sAb', a.B, 70, 130); $('#oAb').textContent = a.B + ' %';
    pickOn($$('#aFSeg button'), 'f', a.f); setSl('sAd', a.td, 0, 20); $('#oAd').textContent = fx(a.td / 100, 2) + ' ms';
    $('#nAnc').textContent = a.hideNum ? '파형은 보이지만 잔여 진폭의 숫자는 가려져 있어요. 식으로 직접 계산해 봐요.' : '소음(빨강)과 스피커 소리(파랑)가 더해져 귀에 들리는 소리(초록)가 돼요.';
    $('#nCards').textContent = '카드를 끌어서 알맞은 칸에 놓아요. 놓은 카드는 다시 옮길 수 있어요. 선택한 카드의 조사 내용이 아래에 나와요.';
    pickOn($$('#hFSeg button'), 'f', S.hall.f); { const d10 = clamp(Math.round(hallD() * 2) * 5, 5, 80); setSl('sHd', d10, 5, 80); $('#oHd').textContent = fx(hallD(), 1) + ' m'; }
    $('#nHall').textContent = '스피커를 끌어 옮기거나 간격 슬라이더를 움직여요. 데드 스팟이 2개 이하가 되도록 해 봐요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#sumSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sum.sub = b.dataset.s; updateCtl(); }));
  $$('#f2Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sum.f2 = +b.dataset.f; updateCtl(); }));
  $('#sPh').addEventListener('input', (e) => { S.sum.ph = +e.target.value; updateCtl(); });
  $('#bRecPh').addEventListener('click', () => { Sound.click(); S.sum.rec[S.sum.ph] = true; showHint('위상차 ' + S.sum.ph + '°에서 합성 진폭 ' + fx(ampPhase(S.sum.ph), 2) + ' A를 기록했어요.', 2600); updateCtl(); });
  $('#sSf').addEventListener('input', (e) => { S.spk.fi = +e.target.value; updateCtl(); });
  $('#sSd').addEventListener('input', (e) => { S.spk.d10 = +e.target.value; updateCtl(); });
  $('#sSx').addEventListener('input', (e) => { S.spk.x10 = +e.target.value; updateCtl(); });
  $('#bRecDark').addEventListener('click', () => {
    Sound.click(); const p = paths(spkX(), spkD()), lam = lamOf(spkF());
    if (isDarkSpot(p.dr, lam)) { S.spk.rec[spkF()] = { x: Math.abs(spkX()), dr: p.dr }; Sound.success(); showHint(spkF() + ' Hz: 첫 상쇄 위치 ±' + Math.abs(spkX()).toFixed(1) + ' m를 기록했어요.', 2800); }
    else showHint('아직 첫 상쇄 위치가 아니에요. 경로차가 λ/2가 되어 소리가 가장 작아지는 첫 위치에서 눌러요.', 3200);
    updateCtl();
  });
  $('#bClrDark').addEventListener('click', () => { Sound.click(); S.spk.rec = {}; updateCtl(); });
  $('#sAp').addEventListener('input', (e) => { S.anc.phi = +e.target.value; updateCtl(); });
  $('#sAb').addEventListener('input', (e) => { S.anc.B = +e.target.value; updateCtl(); });
  $('#sAd').addEventListener('input', (e) => { S.anc.td = +e.target.value; updateCtl(); });
  $$('#aFSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.anc.f = +b.dataset.f; updateCtl(); }));
  $$('#hFSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.hall.f = +b.dataset.f; updateCtl(); }));
  $('#sHd').addEventListener('input', (e) => { setHallD(+e.target.value / 10); updateCtl(); });
  function setHallD(d) {
    const h = S.hall, ctr = (h.xa + h.xb) / 2; let xa = ctr - d / 2, xb = ctr + d / 2;
    if (xa < -9) { xb += -9 - xa; xa = -9; } if (xb > 9) { xa -= xb - 9; xb = 9; }
    h.xa = Math.round(xa * 100) / 100; h.xb = Math.round(xb * 100) / 100;
  }
  ['iBeat', 'iAnc'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 카드 놓기 ---------- */
  const inR = (p, r, m) => p.x >= r.x - (m || 0) && p.x <= r.x + r.w + (m || 0) && p.y >= r.y - (m || 0) && p.y <= r.y + r.h + (m || 0);
  function putCard(i, b) {
    const cs = S.cards, old = cs.place[i];
    if (old === b) return true;
    if (b >= 0 && cs.order[b].length >= CAP) { showHint('한 칸에는 카드를 3장까지 놓을 수 있어요.', 2600); return false; }
    if (old >= 0) cs.order[old].splice(cs.order[old].indexOf(i), 1);
    cs.place[i] = b; if (b >= 0) cs.order[b].push(i);
    Sound.click(); updateCtl(); return true;
  }
  function bucketAt(p) { const h = S.hit; if (!h || !h.G) return -1; for (let b = 0; b < 3; b++) if (inR(p, h.G.bucket(b))) return b; return -1; }
  SciSim.pointer(view, {
    down(p) {
      const h = S.hit; if (!h) return false;
      if (S.mode === 'spk' && h.mic) { if (Math.hypot(p.x - h.mic.x, p.y - h.mic.y) > 26) return false; S.drag = 'mic'; return true; }
      if (S.mode === 'hall' && h.hall) {
        let best = -1, bd = 30; h.hall.forEach((q, i) => { const d = Math.hypot(p.x - q.x, p.y - (q.y - 8)); if (d < bd) { bd = d; best = i; } });
        if (best < 0) return false; S.drag = 'sp' + best; return true;
      }
      if (S.mode === 'cards' && h.cards) {
        for (let k = h.cards.length - 1; k >= 0; k--) { const q = h.cards[k]; if (inR(p, q.r)) { S.cards.sel = q.i; S.cards.drag = { i: q.i, dx: p.x - q.r.x, dy: p.y - q.r.y, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; return true; } }
        const b = bucketAt(p); if (b >= 0 && S.cards.sel >= 0) putCard(S.cards.sel, b);
        return false;
      }
      return false;
    },
    move(p) {
      const h = S.hit;
      if (S.drag === 'mic' && h && h.mic) { S.spk.x10 = clamp(Math.round(((p.x - h.mic.G.x0) / h.mic.G.s - 10) * 10), -100, 100); updateCtl(); }
      else if (typeof S.drag === 'string' && S.drag.indexOf('sp') === 0 && h && h.G) {
        const i = +S.drag.slice(2), hl = S.hall, other = i ? hl.xa : hl.xb; let x = Math.round(clamp((p.x - h.G.x0) / h.G.s - 10, -9, 9) * 10) / 10;
        if (Math.abs(x - other) < 0.3) x = other + (x >= other ? 0.3 : -0.3);
        x = clamp(x, -9, 9); if (i) hl.xb = Math.round(x * 100) / 100; else hl.xa = Math.round(x * 100) / 100; updateCtl();
      } else if (S.cards.drag) { const dr = S.cards.drag; dr.x = p.x; dr.y = p.y; if (Math.hypot(p.x - dr.sx, p.y - dr.sy) > 6) dr.moved = true; }
    },
    up(p) {
      const dr = S.cards.drag; S.drag = null;
      if (dr) {
        S.cards.drag = null;
        if (dr.moved) { const b = bucketAt(p); if (b >= 0) putCard(dr.i, b); else if (p.y > (S.hit && S.hit.G ? S.hit.G.ty - 24 : 0)) putCard(dr.i, -1); }
        updateCtl();
      }
    },
    hover(p) {
      const h = S.hit; if (!h) return null;
      if (S.mode === 'spk' && h.mic) return Math.hypot(p.x - h.mic.x, p.y - h.mic.y) < 26 ? 'grab' : null;
      if (S.mode === 'hall' && h.hall) return h.hall.some((q) => Math.hypot(p.x - q.x, p.y - (q.y - 8)) < 30) ? 'grab' : null;
      if (S.mode === 'cards' && h.cards) return h.cards.some((q) => inR(p, q.r)) ? 'grab' : null;
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'sum') {
      const s = S.sum;
      if (s.sub === 'phase') { L1 = '위상차 Δφ'; a = s.ph + '°'; L2 = '합성 진폭'; b = fx(ampPhase(s.ph), 2) + ' A'; L3 = '기록한 값'; c = [0, 90, 180].filter((p) => s.rec[p]).length + ' / 3'; }
      else { L1 = '소리 A / B'; a = '440 Hz / ' + s.f2 + ' Hz'; L2 = '맥놀이 진동수'; b = s.beatOK ? Math.abs(s.f2 - F1) + ' Hz' : '?'; L3 = '합성 소리'; c = '커졌다 작아져요'; }
    } else if (m === 'spk') {
      const p = paths(spkX(), spkD()), lam = lamOf(spkF());
      L1 = '경로차 |r₂ − r₁|'; a = fx(p.dr, 2) + ' m'; L2 = '파장 λ'; b = fx(lam, 2) + ' m'; L3 = '합성 진폭'; c = fx(ampSpk(p.dr, lam), 2) + ' A';
    } else if (m === 'anc') {
      const q = ancCalc(), hide = S.anc.hideNum;
      L1 = '잔여 소음 진폭'; a = hide ? '?' : Rtxt(q.R); L2 = '소음 변화'; b = hide ? '?' : dbTxt(q.R); L3 = '위상 오차'; c = fx(Math.abs(q.eps), 0) + '°';
    } else if (m === 'cards') {
      const cs = S.cards, un = cs.place.filter((p) => p < 0).length;
      L1 = '분류한 카드'; a = (6 - un) + ' / 6'; L2 = '선택한 카드'; b = CASES[cs.sel].n; L3 = '남은 카드'; c = un + '장';
    } else {
      L1 = '데드 스팟'; a = hallDead().length + '개'; L2 = '스피커 간격'; b = fx(hallD(), 1) + ' m'; L3 = '시험용 소리'; c = S.hall.f + ' Hz';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1e.textContent = a; l2.textContent = L2; v2e.textContent = b; l3.textContent = L3; v3e.textContent = c;
  }

  /* ================= 미션 ================= */
  const isFirstDark = () => { const p = paths(spkX(), spkD()); return isDarkSpot(p.dr, lamOf(spkF())); };
  function initSum() { S.sum.sub = 'phase'; S.sum.ph = 0; S.sum.f2 = 444; S.sum.rec = {}; S.sum.beatOK = false; }
  function initSpk() { S.spk.fi = 4; S.spk.d10 = 10; S.spk.x10 = 0; S.spk.rec = {}; }
  function initAnc() { Object.assign(S.anc, { f: 100, B: 100, phi: 90, td: 0, hideNum: false }); }
  function initHall() { Object.assign(S.hall, { f: 680, xa: -2.5, xb: 2.5 }); }
  const levels = [
    {
      title: '소리 중첩: 위상차와 맥놀이', short: '소리 중첩', icon: '🌊', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 소리 두 개를 겹치면 항상 더 커질까? 소음을 \'더 큰 소리로 막는\' 것이 아니라 \'소리로 지우는\' 방법이 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학 \'빛의 간섭\'에서</b> 두 파동이 만나면 경로차에 따라 보강하거나 상쇄하고, 소음 제거 헤드폰이 그 원리를 쓴다는 것을 배웠어요. 이번에는 <b>소리</b>로 직접 확인해요. 앞 차시 도플러 효과에서처럼 소리의 파형은 스마트폰 앱(오실로스코프 화면)으로 볼 수 있어요.</div>' +
        '<p>진동수와 진폭이 같은 두 소리 A, B를 겹쳐요. 위상차를 바꾸면서 <b>합성 파형의 진폭</b>이 어떻게 달라지는지 읽고, 진동수가 조금 다른 두 소리를 겹쳤을 때 나타나는 <b>맥놀이</b>도 살펴봐요.</p>',
      features: ['sum'],
      setup() { resetFlags(); initSum(); setScene('sum'); updateCtl(); },
      recap: '같은 진동수의 두 소리를 겹치면 합성 진폭은 위상차에 따라 2A(같은 위상)에서 0(반대 위상)까지 변해요. 진동수가 조금 다른 두 소리는 크기가 주기적으로 변하는 맥놀이를 만들고, 맥놀이 진동수는 |f₁ − f₂|예요.',
      summary: '<ul><li><b>중첩</b>: 두 소리가 만나면 그 순간의 변위를 더한 것이 합성 파형이에요.</li>' +
        '<li>진폭 A, 진동수가 같은 두 소리의 위상차가 Δφ이면 합성 진폭은 <b>2A|cos(Δφ/2)|</b>: 0° → 2A(마루끼리 만나는 <b>보강</b>), 90° → 1.41A, 180° → 0(마루와 골이 만나는 <b>상쇄</b>).</li>' +
        '<li><b>맥놀이</b>: 440 Hz + 444 Hz처럼 진동수가 조금 다른 두 소리를 겹치면 소리가 1초에 4번 커졌다 작아져요. 맥놀이 진동수 = |f₁ − f₂| = <b>4 Hz</b>.</li>' +
        '<li>소리가 작아지는 위치가 생기면 커지는 위치도 생겨요. 소리 에너지가 사라지는 것이 아니라 위치에 따라 다시 나뉘어요(② 단계에서 확인).</li></ul>',
      missions: [
        {
          title: '위상차 0°, 90°, 180°의 합성 진폭 기록하기',
          goal: '위상차 슬라이더를 <b>0°, 90°, 180°</b>로 맞추고, 각각 <b>📝 합성 진폭 기록</b>을 눌러 표를 채워요.',
          hint: '위상차 슬라이더를 움직이면 초록색 합성 파형의 높이가 변해요. 값을 맞춘 뒤 기록 버튼을 눌러요.',
          setup() { resetFlags(); initSum(); setScene('sum'); updateCtl(); },
          check: () => !!(S.sum.rec[0] && S.sum.rec[90] && S.sum.rec[180]),
          hold: 0.4,
          status: () => mark(!!S.sum.rec[0]) + ' 0° &nbsp; ' + mark(!!S.sum.rec[90]) + ' 90° &nbsp; ' + mark(!!S.sum.rec[180]) + ' 180°',
          explain: '위상차 0°에서는 마루끼리 만나 합성 진폭이 <b>2.00 A</b>(보강), 90°에서는 <b>1.41 A</b>(= 2A cos 45°), 180°에서는 마루와 골이 만나 <b>0</b>(상쇄)이에요. 합성 진폭 = 2A|cos(Δφ/2)|.',
        },
        {
          title: '맥놀이 진동수 읽기', manual: true,
          goal: '두 번째 소리를 <b>444 Hz</b>로 고르세요. 440 Hz와 겹친 소리가 <b>1초 동안 커졌다 작아지는 횟수</b>(맥놀이 진동수, Hz)를 세어 입력하고 ✔ 확인하기를 누르세요.',
          hint: '그래프의 주황색 점은 소리가 가장 커지는 순간이에요. 1초 동안 몇 개인지 세어 봐요.',
          setup() { resetFlags(); S.sum.sub = 'beat'; S.sum.f2 = 444; S.sum.beatOK = false; clr('iBeat'); setFlag('beatTab', true); setFlag('beatIn', true); setScene('sum'); updateCtl(); },
          check() {
            if (S.sum.f2 !== 444) return '두 번째 소리를 444 Hz로 골라 주세요.';
            const v = num('iBeat'); if (v == null) return '맥놀이 진동수를 숫자로 입력해 주세요 (Hz).';
            const ok = near(v, 4, 0.3); fb([[$('#iBeat'), ok]]);
            if (ok) { S.sum.beatOK = true; return true; }
            if (near(v, 884, 5)) return '두 진동수를 더하는 것이 아니에요. 맥놀이는 두 진동수의 차이와 관계있어요.';
            if (near(v, 1, 0.3) || near(v, 2, 0.3) || near(v, 8, 0.3)) return '그래프에서 1초 동안 주황색 점이 몇 개인지 다시 세어 봐요. 444 Hz − 440 Hz도 확인해요.';
            return '1초 동안 소리가 커진 횟수를 다시 세어 봐요.';
          },
          status: () => '입력 ' + ($('#iBeat').value.trim() || '—') + ' Hz',
          explain: '1초 동안 소리가 <b>4번</b> 커졌다 작아져요. 맥놀이 진동수 = |f₁ − f₂| = |444 − 440| = <b>4 Hz</b>예요. 아래 확대 그림처럼 두 소리가 같은 위상으로 만날 때 크게, 반대 위상으로 만날 때 작게 들려요.',
        },
        {
          type: 'quiz', title: '두 소리를 겹치면 항상 커질까?',
          goal: '두 소리를 겹쳤을 때의 설명으로 알맞은 것은?',
          setup() { resetFlags(); S.sum.sub = 'phase'; S.sum.ph = 180; S.sum.rec = { 0: true, 90: true, 180: true }; setFlag('beatTab', true); setScene('sum'); updateCtl(); },
          choices: ['두 소리가 겹치면 언제나 합성 소리가 더 커져요', '소리가 작아지는 곳이 생기는 대신 커지는 곳도 생기고, 전체 에너지는 보존돼요', '반대 위상으로 겹친 곳에서는 소리 에너지가 사라지고 보강되는 곳에서는 에너지가 새로 생겨요', '진동수가 다른 두 소리도 항상 서로 완전히 지워져요'],
          answer: 1,
          feedback: ['위상차가 180°이면 합성 진폭이 0이에요. 겹쳤다고 언제나 커지지는 않아요.', '', '에너지가 새로 생기거나 사라지지는 않아요. 상쇄로 작아진 만큼 다른 위치에서 보강으로 커져서 전체 에너지는 보존돼요.', '진동수가 다르면 완전히 지워지지 않고 맥놀이처럼 커졌다 작아지기를 되풀이해요.'],
          explain: '상쇄하는 곳에서는 소리가 작아지고 보강하는 곳에서는 더 커져요. 두 스피커가 만드는 소리의 <b>전체 에너지는 보존</b>되고 위치에 따라 다시 나뉘어요. 겹치면 항상 커지는 것은 아니에요.',
        },
      ],
    },
    {
      title: '스피커 간섭: 보강과 상쇄 위치', short: '스피커 간섭', icon: '🔊', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위상차가 0°이면 합성 진폭이 2A, 180°이면 0이 되는 것을 봤어요. 스피커 두 개에서 나온 같은 소리는 걷는 위치마다 <b>경로차</b>가 달라서 위상차도 달라져요.</div>' +
        '<p>같은 소리를 같은 위상으로 내는 스피커 S1, S2가 있고, 10 m 앞 \'걷는 선\' 위를 🎤 사람이 걸으며 소리 크기를 재요. 경로차가 <b>mλ</b>이면 보강, <b>(m + ½)λ</b>이면 상쇄예요. (두 스피커에서 온 소리의 크기는 거의 같다고 봐요.)</p>',
      features: ['spk'],
      setup() { resetFlags(); initSpk(); setScene('spk'); updateCtl(); },
      recap: '경로차 |r₂ − r₁|이 mλ이면 소리가 커지고(보강), (m + ½)λ이면 작아져요(상쇄). 진동수가 높을수록 파장이 짧아서 보강과 상쇄 위치의 간격이 좁아져요.',
      summary: '<ul><li>같은 위상으로 소리를 내는 두 스피커: 경로차 <b>mλ</b> → 보강(합성 진폭 2A), <b>(m + ½)λ</b> → 상쇄(합성 진폭 0).</li>' +
        '<li>f = 680 Hz(λ = 0.50 m), 간격 d = 1.0 m, 정면 10 m 앞 걷는 선: 중앙은 경로차 0이라 보강, 중앙에서 약 <b>2.6 m</b> 지점에서 경로차가 λ/2 = 0.25 m가 되어 <b>첫 상쇄</b>, 약 5.8 m 지점에서 경로차 λ = 0.50 m로 다시 보강.</li>' +
        '<li>진동수를 높이면(파장이 짧아지면) 보강·상쇄 간격이 좁아지고, 스피커 간격 d를 늘려도 좁아져요.</li>' +
        '<li>소리가 큰 곳과 작은 곳이 번갈아 나타나는 것이 <b>간섭 무늬</b>예요. 스피커 하나가 고장 난 것이 아니에요.</li></ul>',
      missions: [
        {
          title: '첫 상쇄 위치를 찾아 기록하고 비교하기',
          goal: '🎤 사람을 옮겨 <b>소리가 처음으로 가장 작아지는 위치</b>(경로차 λ/2)를 찾아 <b>📝 첫 상쇄 위치 기록</b>을 눌러요. <b>680 Hz</b>와 <b>340 Hz</b> 두 진동수에서 모두 기록해요.',
          hint: '간격은 1.0 m로 두고 🎤 사람을 중앙에서 천천히 옮겨요. 경로차 눈금자의 보라색 점이 λ/2 눈금에 닿는 곳이 소리가 가장 작아지는 첫 위치예요.',
          setup() { resetFlags(); initSpk(); setFlag('recDark', true); setScene('spk'); updateCtl(); },
          check: () => !!(S.spk.rec[340] && S.spk.rec[680]),
          hold: 0.4,
          status() { const p = paths(spkX(), spkD()), lam = lamOf(spkF()), r = S.spk.rec; return mark(!!r[680]) + ' 680 Hz' + (r[680] ? ' ±' + r[680].x.toFixed(1) + ' m' : '') + ' &nbsp; ' + mark(!!r[340]) + ' 340 Hz' + (r[340] ? ' ±' + r[340].x.toFixed(1) + ' m' : '') + '<br>지금 경로차 ' + fx(p.dr, 2) + ' m (λ/2 = ' + fx(lam / 2, 2) + ' m)'; },
          explain: '680 Hz(λ = 0.50 m)에서는 중앙에서 약 <b>2.6 m</b>에서 경로차가 <b>0.25 m = λ/2</b>가 되어 두 소리가 반대 위상으로 만나 합성 진폭이 거의 0이에요. 340 Hz(λ = 1.0 m)에서는 약 <b>5.8 m</b>에서 처음 상쇄돼요. 진동수가 2배가 되면 파장이 절반이라 상쇄 위치가 더 가까워져요.',
        },
        {
          type: 'quiz', title: '진동수가 높을수록 상쇄 지점이 가까워지는 까닭',
          goal: '진동수를 높였더니 소리가 작아지는 지점들이 서로 더 <b>가까워졌어요</b>. 그 까닭은?',
          setup() { resetFlags(); S.spk.fi = 8; S.spk.d10 = 10; S.spk.x10 = 0; setFlag('recDark', true); setScene('spk'); updateCtl(); },
          choices: ['파장이 짧아져서 경로차가 λ/2가 되는 위치가 더 가까워지기 때문이에요', '진동수가 높으면 스피커 하나가 고장 나서 소리가 작아지기 때문이에요', '진동수가 높으면 소리의 속력이 빨라지기 때문이에요', '진동수가 높으면 합성 진폭이 항상 작아지기 때문이에요'],
          answer: 0,
          feedback: ['', '두 스피커는 모두 정상이에요. 소리가 작은 지점은 두 소리가 반대 위상으로 만나서 생겨요.', '소리의 속력은 매질(공기)이 정해요. 진동수가 달라지면 파장(λ = v/f)이 달라져요.', '진동수와 상관없이 같은 위상으로 만나는 곳에서는 합성 진폭이 2A예요.'],
          explain: 'λ = v/f이므로 진동수가 높을수록 파장이 짧아요. 경로차 λ/2, λ, 3λ/2 …를 만드는 위치가 서로 가까워져서 큰 소리와 작은 소리의 무늬가 촘촘해져요.',
        },
      ],
    },
    {
      title: '소음 상쇄: 능동 소음 제거', short: '소음 상쇄', icon: '🎧', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 소리가 반대 위상으로 만나면 서로 지워지는 것을 봤어요. 같은 원리로, 소음을 마이크로 받아 <b>반대 위상의 소리</b>를 스피커로 내면 소음을 지울 수 있어요. 이것이 <b>능동 소음 제거</b> 헤드폰이에요.</div>' +
        '<p>헤드폰 안에서 소음(빨강)과 스피커 소리(파랑)가 합쳐져 귀에 들리는 소리(초록)가 돼요. 스피커 소리의 <b>위상·크기·처리 지연</b>이 달라지면 소음이 얼마나 줄어드는지 알아봐요.</p>',
      features: ['anc'],
      setup() { resetFlags(); initAnc(); setFlag('ancA', true); setScene('anc'); updateCtl(); },
      recap: '반대 위상(180°)이고 크기가 같은 소리를 더하면 소음이 지워져요. 위상 오차가 ε이면 잔여 진폭이 2A sin(ε/2)이라 오차가 클수록 덜 지워지고, 처리 지연이 같아도 진동수가 높을수록 위상 오차(360° × f × t_d)가 커서 제거하기 어려워요.',
      summary: '<ul><li><b>능동 소음 제거</b>: 마이크로 소음을 받아 <b>반대 위상</b>의 같은 크기 소리를 스피커로 내 귀에서 상쇄 간섭시켜요.</li>' +
        '<li>진폭 규칙: 진폭이 1/10이면 −20 dB (소음 세기 1/100). 크기 오차 10 %이면 잔여 진폭 0.1A → <b>−20 dB</b>.</li>' +
        '<li>위상 오차 ε의 잔여 진폭 = <b>2A sin(ε/2)</b>: 6° → 0.10A(−20 dB), 30° → 0.52A(약 −6 dB), 72° → 1.18A(오히려 소음이 커져요).</li>' +
        '<li>처리 지연 t_d → 위상 오차 = 360° × f × t_d. 지연 0.1 ms: 500 Hz → 18°(0.31A, −10 dB), 2000 Hz → 72°(1.18A).</li>' +
        '<li>그래서 엔진·비행기처럼 <b>낮은 진동수의 지속음</b>에 효과적이고, 높은 진동수나 갑작스러운 소리는 귀마개 같은 <b>수동 차음</b>과 함께 써요.</li></ul>',
      missions: [
        {
          title: '반대 위상으로 소음 20 dB 줄이기',
          goal: '엔진 소음(100 Hz)을 지워요. 스피커 소리의 <b>위상과 크기</b>를 조절해서 소음을 <b>20 dB 이상</b> 줄여 보세요.',
          hint: '스피커 소리의 위상을 소음과 정확히 반대인 180°로 맞추고, 크기를 100 %에 가깝게 해요. 초록 파형이 평평해질수록 잘 지워진 거예요.',
          setup() { resetFlags(); initAnc(); setFlag('ancA', true); setScene('anc'); updateCtl(); },
          check: () => ancCalc().R <= 0.1,
          hold: 0.6,
          status() { const q = ancCalc(); return mark(q.R <= 0.1) + ' 소음 변화 ' + dbTxt(q.R) + ' (목표 −20 dB 이하)'; },
          explain: '스피커 소리를 <b>180°(반대 위상)</b>, 크기 100 %로 맞추면 두 소리가 서로 지워져요. 위상 오차가 약 6° 이내이고 크기 오차가 10 % 이내이면 잔여 진폭이 0.1A 이하가 되어 <b>−20 dB</b> 이상 줄어요.',
        },
        {
          title: '지연 때문에 생기는 잔여 소음 계산하기', manual: true,
          goal: '처리 지연이 <b>0.10 ms</b>인 시스템에서 <b>2000 Hz</b> 소음의 잔여 진폭은 소음 진폭 A의 몇 배일까요? 위상 오차를 먼저 구해서 입력하고 ✔ 확인하기를 누르세요.',
          hint: '위상 오차 ε = 360° × f × t_d예요. 잔여 진폭 = 2A sin(ε/2). 2000 Hz, 0.10 ms를 넣어 계산해 보세요.',
          setup() { resetFlags(); initAnc(); S.anc.f = 2000; S.anc.phi = 180; S.anc.td = 10; S.anc.hideNum = true; clr('iAnc'); setFlag('ancB', true); setFlag('ancIn', true); setScene('anc'); updateCtl(); },
          check() {
            const v = num('iAnc'); if (v == null) return '잔여 진폭을 숫자로 입력해 주세요 (A의 몇 배).';
            const ok = near(v, 1.18, 0.04); fb([[$('#iAnc'), ok]]);
            if (ok) { S.anc.hideNum = false; return true; }
            if (near(v, 72, 2)) return '72°는 위상 오차예요. 잔여 진폭 2 sin(ε/2)를 계산해 보세요.';
            if (near(v, 0.31, 0.03)) return '0.31A는 500 Hz일 때예요. 2000 Hz에서는 위상 오차가 더 커져요.';
            if (near(v, 0, 0.05)) return '지연이 있으면 완전히 지워지지 않아요. 위상 오차 ε = 360° × f × t_d를 먼저 구해 봐요.';
            return 'ε = 360° × 2000 × 0.0001 = 72°예요. 잔여 진폭 = 2 sin(36°)를 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iAnc').value.trim() || '—') + ' A',
          explain: '위상 오차 ε = 360° × 2000 Hz × 0.10 ms = <b>72°</b>예요. 잔여 진폭 = 2A sin(72°/2) = 2A sin 36° ≈ <b>1.18A</b>로 소음(1A)보다 <b>오히려 커져요</b>. 같은 지연에서 500 Hz는 ε = 18°, 잔여 0.31A(−10 dB)이므로 높은 진동수일수록 어려워요.',
        },
        {
          type: 'quiz', title: '비행기 엔진 소리에는 잘 듣고 말소리에는 덜 듣는 까닭',
          goal: '소음 제거 헤드폰은 비행기 엔진 소리에는 효과가 크지만 사람의 말소리에는 효과가 작아요. 그 까닭은?',
          setup() { resetFlags(); initAnc(); S.anc.phi = 180; S.anc.td = 10; setFlag('ancB', true); setScene('anc'); updateCtl(); },
          choices: ['엔진 소리는 낮은 진동수로 계속 이어져 반대 위상을 만들기 쉽고, 말소리는 진동수가 높고 계속 바뀌어 지연에 따른 위상 오차가 커지기 때문이에요', '헤드폰은 큰 소리만 지울 수 있기 때문이에요', '높은 진동수의 소리는 간섭을 일으키지 않기 때문이에요', '엔진 소리에는 에너지가 없어서 저절로 사라지기 때문이에요'],
          answer: 0,
          feedback: ['', '소리의 크기가 아니라 진동수와 변화 속도, 지연 시간에 따라 위상 오차가 달라져요.', '어떤 진동수의 소리도 간섭해요. 다만 높은 진동수일수록 같은 지연에서 위상 오차가 커서 잘 지워지지 않아요.', '엔진 소리도 에너지가 있어요. 반대 위상의 소리를 더해서 상쇄 간섭으로 줄이는 거예요.'],
          explain: '위상 오차 = 360° × f × t_d이므로 같은 지연이라도 <b>진동수가 높을수록 오차가 커요</b>. 또 말소리는 빠르게 바뀌어 반대 위상 신호를 미리 만들기 어려워요. 그래서 낮은 진동수의 지속음에 효과적이고, 나머지는 귀마개 같은 수동 차음과 함께 써요.',
        },
      ],
    },
    {
      title: '공간 설계: 소음 제어 사례', short: '공간 설계', icon: '🏛', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 간섭으로 소리를 지우는 능동 소음 제거를 분석했어요. 생활 속에는 소리를 <b>막거나 흡수</b>하는 방법과, 간섭으로 소리를 <b>키우는</b> 방법도 있어요.</div>' +
        '<p>소음 제어 사례 카드 6장을 원리별로 분류하고, 공연장에서 스피커 두 개의 위치와 간격을 바꿔 <b>소리가 고르게 들리는</b> 배치를 만들어 봐요. 카드를 눌러 원리·장점·한계도 조사해요.</p>',
      features: ['cards', 'hall'],
      setup() { resetFlags(); S.cards.place = [-1, -1, -1, -1, -1, -1]; S.cards.order = [[], [], []]; S.cards.sel = 0; initHall(); setScene('cards'); updateCtl(); },
      recap: '소음 제어에는 간섭으로 지우는 방법(능동 소음 제거, 간섭형 머플러), 반사·흡수로 막는 방법(방음벽, 흡음재), 간섭으로 키우는 방법(공연장 스피커 배치)이 있어요. 스피커 두 개의 소리가 만나면 위치에 따라 상쇄되는 데드 스팟이 생기므로 간격과 위치를 정해야 해요.',
      summary: '<ul><li><b>간섭으로 상쇄</b>: 능동 소음 제거 헤드폰, 자동차 실내 소음 제거, 간섭형 머플러(경로차 λ/2).</li>' +
        '<li><b>반사·흡수로 차단</b>: 도로 방음벽(직접음 약 5~10 dB 감소), 흡음 패널(구멍 많은 재료가 소리를 열로 바꿔 흡수).</li>' +
        '<li><b>간섭으로 증폭</b>: 공연장 스피커 배치로 관객석에서 보강 간섭이 일어나게 해요. 상쇄되는 곳(<b>데드 스팟</b>)이 생기지 않게 간격과 위치를 골라요.</li>' +
        '<li>방음벽은 이미 지나가는 소리를 막고, 능동 소음 제거는 반대 위상의 소리를 더해 지워요. 서로 보완해서 써요.</li></ul>',
      missions: [
        {
          title: '소음 제어 사례 분류하기', manual: true,
          goal: '카드 6장을 <b>간섭으로 상쇄 / 흡수·반사로 차단 / 간섭으로 증폭</b> 칸으로 분류하고 ✔ 확인하기를 누르세요.',
          hint: '카드를 눌러 원리를 읽어 봐요. 반대 위상의 소리를 내거나 경로차를 이용하면 상쇄, 소리를 반사·흡수하면 차단, 소리를 키우는 배치면 증폭이에요.',
          setup() { resetFlags(); S.cards.place = [-1, -1, -1, -1, -1, -1]; S.cards.order = [[], [], []]; S.cards.sel = 0; setScene('cards'); updateCtl(); },
          check() {
            const cs = S.cards, un = cs.place.filter((p) => p < 0).length;
            if (un) return '아직 분류하지 않은 카드가 ' + un + '장 있어요.';
            const wrong = CASES.map((q, i) => (cs.place[i] === q.cat ? -1 : i)).filter((i) => i >= 0);
            if (!wrong.length) return true;
            return wrong.length + '장이 알맞지 않아요. 예를 들어 「' + CASES[wrong[0]].n + '」 카드를 다시 살펴봐요. 소리를 간섭으로 없애는지, 막거나 흡수하는지, 간섭으로 키우는지 생각해 봐요.';
          },
          status: () => '분류한 카드 ' + S.cards.place.filter((p) => p >= 0).length + ' / 6',
          explain: '<b>간섭으로 상쇄</b>: 소음 제거 헤드폰, 자동차 실내 장치, 간섭형 머플러. <b>흡수·반사로 차단</b>: 도로 방음벽, 흡음 패널. <b>간섭으로 증폭</b>: 공연장 스피커 배치. 방음벽·흡음재는 간섭이 아니라 소리를 반사하거나 열로 바꿔 줄여요.',
        },
        {
          title: '공연장 데드 스팟 2개 이하로 줄이기',
          goal: '공연장 스피커 두 개를 옮기고 간격을 바꿔, 관객석의 <b>데드 스팟을 2개 이하</b>로 줄여요.',
          hint: '스피커 간격이 넓거나 진동수가 높을수록 상쇄선이 많아져요. 간격을 줄이거나 진동수를 낮춰 보세요. 아래 막대그래프의 초록 막대를 참고해요.',
          setup() { resetFlags(); initHall(); setScene('hall'); updateCtl(); },
          check: () => hallDead().length <= 2,
          hold: 0.8,
          status: () => mark(hallDead().length <= 2) + ' 데드 스팟 ' + hallDead().length + '개 (목표 2개 이하)',
          explain: '스피커 두 개의 소리는 경로차가 (m + ½)λ인 곳에서 상쇄해요. 간격이 넓을수록, 진동수가 높을수록(파장이 짧을수록) 상쇄선이 촘촘해져 데드 스팟이 늘어요. 간격을 줄이거나 낮은 진동수를 쓰면 관객석에서 소리가 고르게 들려요.',
        },
        {
          type: 'quiz', title: '방음벽과 능동 소음 제거의 차이',
          goal: '도로 <b>방음벽</b>과 <b>능동 소음 제거</b>의 차이로 알맞은 것은?',
          setup() { resetFlags(); setScene('cards'); updateCtl(); },
          choices: ['방음벽은 소리를 반사·흡수해서 막고, 능동 소음 제거는 반대 위상의 소리를 더해 간섭으로 상쇄해요', '둘 다 소음보다 더 큰 소리로 덮어서 가려요', '방음벽은 간섭으로 소리를 없애고, 능동 소음 제거는 소리를 열로 흡수해요', '능동 소음 제거는 소리의 진동수를 바꿔서 들리지 않게 해요'],
          answer: 0,
          feedback: ['', '소리를 키워서 덮는 것이 아니에요. 한쪽은 막거나 흡수하고, 다른 쪽은 반대 위상의 소리로 지워요.', '설명이 서로 바뀌었어요. 흡수하는 쪽은 방음벽·흡음재이고, 간섭을 쓰는 쪽은 능동 소음 제거예요.', '진동수를 바꾸는 것이 아니라 같은 진동수의 반대 위상 소리를 더해요.'],
          explain: '<b>방음벽</b>은 소리를 반사하거나 흡수해서 직접음의 세기를 낮추고, <b>능동 소음 제거</b>는 마이크로 받은 소음에 반대 위상의 소리를 더해 상쇄 간섭을 일으켜요. 방음벽은 여러 진동수에 쓸 수 있고, 능동 소음 제거는 낮은 진동수의 지속음에 특히 효과적이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-noise-control', mount: '#game', badge: '소음 제어 박사', homeHref: '../../index.html#hm',
    featureLabels: { sum: '🌊 파형 중첩 · 오실로스코프', spk: '🔊 스피커 간섭 · 소리 센서', anc: '🎧 소음 상쇄 헤드폰', cards: '🗂 소음 제어 사례 분류', hall: '🏛 공연장 스피커 배치' },
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
    view.apply();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); S.hit = null;
    switch (S.mode) {
      case 'sum': drawSumScene(); break;
      case 'spk': drawSpkScene(); break;
      case 'anc': drawAncScene(); break;
      case 'cards': drawCardsScene(); break;
      default: drawHallScene();
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, get hit() { return S.hit; }, setScene, setFlag, updateCtl, ampPhase, paths, lamOf, ancCalc, hallDead, deadSpots, putCard, CASES, CAP, isFirstDark, setHallD,
  };
})();
