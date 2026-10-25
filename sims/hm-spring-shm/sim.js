/* =========================================================
   역학과 에너지 Ⅲ. 탄성파와 소리 - 용수철 진자와 단진동 (1차시)
   성취기준 [12역학03-01] 용수철 진자를 통해 단진동을 이해하고, 가속도와 변위 사이의 관계를 설명할 수 있다.
   ① 관찰: 진자 관찰 (수평·수직 용수철, x–t 그래프, 주기 센서와 10번 왕복 스톱워치)
   ② 탐구: 복원력 (F = −kx, a–x 직선의 기울기 −ω² = −k/m)
   ③ 분석: 주기 (T = 2π√(m/k), 진폭·중력과 무관)
   ④ 모형: 에너지·위상 (x, v, a 그래프의 위상, 기준 원, E_k + E_p = ½kA²)
   m = 0.50 kg, k = 50 N/m, g = 10 m/s² (달 1.6 m/s²). 운동은 x = x₀ cos ωt 로 정확히 계산해요(오일러 적분 아님).
   감쇠·강제 진동·공명, 단진자의 주기식, 미분 방정식, 합성 진동, 용수철의 질량은 다루지 않아요.
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
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const lerp = (a, b, t) => a + (b - a) * t;
  /* 부호는 −, 소수 자릿수 d (기본 2), plus이면 + 도 붙여요 */
  function fx(v, d, plus) {
    d = d == null ? 2 : d; const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    const z = Math.abs(r) < Math.pow(10, -d) / 2 ? 0 : r;
    return (z < 0 ? MINUS : plus && z > 0 ? '+' : '') + Math.abs(z).toFixed(d);
  }
  const fm = (v) => { const t = v.toFixed(3); return /0$/.test(t) ? v.toFixed(2) : t; };
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); return v === '' || !isFinite(+v) ? null : +v; };
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
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    (o.xminor || []).forEach((v) => { ctx.strokeStyle = 'rgba(120,135,160,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(v), iy); ctx.lineTo(gx(v), iy + ih); ctx.stroke(); });
    (o.xt || []).forEach((v) => { ctx.strokeStyle = 'rgba(120,135,160,.34)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(v), iy); ctx.lineTo(gx(v), iy + ih); ctx.stroke(); if (o.xl !== false) T(gx(v), iy + ih + 17, o.xf ? o.xf(v) : String(v), 13, '#3a465c', 'center', 800); });
    (o.yt || []).forEach((v) => { ctx.strokeStyle = Math.abs(v) < 1e-9 ? 'rgba(80,95,120,.55)' : 'rgba(120,135,160,.34)'; ctx.lineWidth = Math.abs(v) < 1e-9 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(v)); ctx.lineTo(ix + iw, gy(v)); ctx.stroke(); if (o.yl !== false) T(ix - 6, gy(v) + 5, o.yf ? o.yf(v) : String(v), 13, '#3a465c', 'right', 800); });
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, iy - 2); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix + iw + 2, iy + ih); ctx.stroke();
    return { gx, gy, ix, iy, iw, ih };
  }

  /* ================= 물리 ================= */
  const G = { h: 10, e: 10, m: 1.6 };
  const S = {
    mode: 'obs', clock: 0, fade: 0,
    o: { m: 0.5, k: 50, orient: 'h', g: 10, x0: 0.10, t0: 0, t: 0, paused: false, freeze: null, ts: 1, drag: false },
    sens: { cross: [], T: null },
    sw: { on: false, done: false, t0: 0, res: 0, A: 0, count: 0 },
    ob: { orient: 'h', A: 10 },
    fo: { mode: 'go', xs: 10, rec: [], trail: [] },
    pe: { env: 'h', mv: 4, kv: 2, av: 10, rec: [] },
    en: { goT: 0 },
    lab: ['', '', ''], labSlot: ['a', 'x', 'v'],
    flags: { read: false, slope: false, pred: false, lab: false, en: false, m1: false, labOK: false, enOK: false, slopeOK: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['obs', 'force', 'period', 'energy'];
  const ALLOWED = [['obs'], ['force'], ['period'], ['energy']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  const omega = () => Math.sqrt(S.o.k / S.o.m);
  function osc() {
    const o = S.o, w = omega();
    const tau = o.paused ? 0 : o.freeze != null ? o.freeze : o.t - o.t0;
    const x = o.x0 * Math.cos(w * tau), v = -o.x0 * w * Math.sin(w * tau);
    return { x, v, a: -w * w * x, w, T: TAU / w, tau };
  }
  function release(x0) {
    const o = S.o; o.x0 = x0; o.t0 = o.t; o.paused = false; o.freeze = null; S.sens = { cross: [], T: null }; S.fo.trail = [];
    if (S.sw.on) { S.sw.on = false; }
  }
  function holdAt(x0) { const o = S.o; o.x0 = x0; o.paused = true; o.freeze = null; S.sens = { cross: [], T: null }; S.fo.trail = []; S.sw.on = false; }
  function oscStep(dt) {
    const o = S.o, prevTau = o.paused || o.freeze != null ? null : o.t - o.t0;
    o.t += dt * o.ts;
    if (prevTau != null) {
      const w = omega(), tauNow = o.t - o.t0;
      const n0 = Math.floor((w * prevTau - Math.PI / 2) / Math.PI), n1 = Math.floor((w * tauNow - Math.PI / 2) / Math.PI);
      for (let n = n0 + 1; n <= n1; n++) {
        const tc = o.t0 + (Math.PI / 2 + n * Math.PI) / w; S.sens.cross.push(tc);
        const c = S.sens.cross; if (c.length >= 2) S.sens.T = 2 * (c[c.length - 1] - c[c.length - 2]);
      }
      if (S.sw.on) {
        const el = o.t - S.sw.t0, Tn = TAU / w; S.sw.count = Math.min(10, Math.floor(el / Tn));
        if (el >= 10 * Tn) { S.sw.on = false; S.sw.done = true; S.sw.res = 10 * Tn; S.sw.count = 10; Sound.success(); updateCtl(); }
      }
    }
  }
  const periodT = () => TAU / omega();

  /* ================= 용수철 진자 그림 ================= */
  function spring(x1, y1, x2, y2, coils, wd, col) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, lead = Math.min(12, L * 0.15);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [['rgba(255,255,255,.55)', 2.2, -1.2], [col || '#64748b', 4, 0]].forEach(([c, w, off]) => {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1 + nx * off, y1 + ny * off); ctx.lineTo(x1 + ux * lead + nx * off, y1 + uy * lead + ny * off);
      const n = coils * 2;
      for (let i = 1; i <= n; i++) { const f = i / n, px = x1 + ux * (lead + (L - 2 * lead) * f), py = y1 + uy * (lead + (L - 2 * lead) * f), s = (i % 2 ? 1 : -1) * wd; ctx.lineTo(px + nx * (s + off), py + ny * (s + off)); }
      ctx.lineTo(x2 + nx * off, y2 + ny * off); ctx.stroke();
    });
    ctx.restore();
  }
  function massBlock(cx, cy, w, h, label, lift) {
    D.shadow(() => { D.roundRect(cx - w / 2, cy - h / 2, w, h, 9); const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#c2410c'); ctx.fillStyle = g; ctx.fill(); }, { blur: lift ? 14 : 7, y: lift ? 7 : 3 });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - w / 2 + 6, cy - h / 2 + 5, w - 12, 4);
    T(cx, cy + 5, label, 13.5, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.2)', strokeWidth: 3 });
  }
  /* 진자 그리기. rc: 영역, orient: 'h' | 'v', opt: {arrows, ruler, label} → 물체 터치 영역 반환 */
  function drawOsc(rc, orient, opt) {
    opt = opt || {};
    const o = S.o, q = osc(), g = o.g, xe = o.m * g / o.k;
    let sPx, hit;
    if (orient === 'h') {
      const wallX = rc.x + 14, Ls = Math.min(rc.w * 0.45, 330), xO = wallX + Ls, cy = rc.y + rc.h * (opt.arrows ? 0.47 : rc.h < 145 ? 0.58 : 0.56), hw = 30;
      sPx = Math.min(1500, (Ls - hw - 26) / 0.15, (rc.w - 14 - Ls - hw - 12) / 0.15);
      // 트랙·눈금
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(wallX, cy + 28, rc.w - 20, 5);
      D.shadow(() => { ctx.fillStyle = '#64748b'; ctx.fillRect(wallX - 10, cy - 52, 10, 90); }, { blur: 4, y: 1 });
      for (let v = -0.15; v <= 0.1501; v += 0.05) {
        const px = xO + v * sPx; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, cy + 33); ctx.lineTo(px, cy + 41); ctx.stroke();
        T(px, cy + 57, Math.abs(v) < 1e-6 ? '0' : fx(v, 2, true), 13, '#3a465c', 'center', 800);
      }
      T(xO + 0.15 * sPx + 34, cy + 57, 'm', 13, MUTED, 'center', 700);
      // 평형점 O
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xO, cy - 60); ctx.lineTo(xO, cy + 32); ctx.stroke(); ctx.restore();
      if (!opt.arrows) D.label(xO, cy - 70, 'O 평형점', { bg: '#16a34a', size: 13 }); else T(xO + 8, cy - 58, 'O', 14, '#16a34a', 'left', 800);
      const mx = xO + q.x * sPx;
      spring(wallX, cy, mx - hw, cy, 14, 13, '#64748b');
      massBlock(mx, cy, hw * 2, 52, fm(o.m) + ' kg', o.drag);
      if (opt.arrows) {
        const F = -o.k * q.x, al = Math.abs(F) * 20, ar = Math.abs(q.a) * 7.5;
        if (al > 3) D.arrow(mx, cy - 42, mx + Math.sign(F) * al, cy - 42, { color: RED, width: 5, head: 11 });
        if (ar > 3 && opt.arrows === 2) D.arrow(mx, cy + 74, mx + Math.sign(q.a) * ar, cy + 74, { color: GREEN, width: 5, head: 11 });
        T(rc.x + 26, rc.y + 16, '🔴 복원력 F   🟢 가속도 a', 13, MUTED, 'left', 800);
      }
      hit = { x: mx - hw, y: cy - 26, w: hw * 2, h: 52, axis: 'h', xO, sPx };
    } else {
      const ceilY = rc.y + 14, cx = rc.x + rc.w * 0.45, yO = rc.y + rc.h * 0.56, hh = 24, hw = Math.min(30, rc.w * 0.2);
      sPx = Math.min(620, (yO - ceilY - 66) / 0.15, (rc.y + rc.h - yO - hh - 14) / 0.15);
      ctx.fillStyle = '#64748b'; ctx.fillRect(cx - 40, ceilY - 8, 80, 8);
      for (let v = -0.1; v <= 0.1001; v += 0.05) {
        const py = yO + v * sPx; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + hw + 8, py); ctx.lineTo(cx + hw + 16, py); ctx.stroke();
        T(cx + hw + 20, py + 5, Math.abs(v) < 1e-6 ? '0' : fx(v, 2, true), 13, '#3a465c', 'left', 800);
      }
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - hw - 30, yO); ctx.lineTo(cx + hw + 8, yO); ctx.stroke(); ctx.restore();
      D.label(cx - hw - 8, yO - 17, PHONE ? 'O' : 'O 평형점', { bg: '#16a34a', size: 13, align: 'right' });
      const yn = yO - xe * sPx;      // 용수철의 자연 길이 끝
      ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx - hw - 24, yn - hh); ctx.lineTo(cx - hw - 4, yn - hh); ctx.stroke(); ctx.setLineDash([]);
      const my = yO + q.x * sPx;
      spring(cx, ceilY, cx, my - hh, 12, 11, '#64748b');
      massBlock(cx, my, hw * 2, hh * 2, fm(o.m) + ' kg', o.drag);
      if (xe * sPx > 40 && !PHONE) T(cx - hw - 28, yn - hh + 5, '자연 길이', 13, MUTED, 'right', 700);
      if (opt.label !== false) para(rc.x + 8, rc.y + rc.h - 26, '평형점은 mg/k = ' + fx(xe, 3) + ' m 늘어난 곳 (g = ' + fm(g) + ')', rc.w - 14, 13, MUTED, 17, 700);
      hit = { x: cx - hw, y: my - hh, w: hw * 2, h: hh * 2, axis: 'v', yO, sPx };
    }
    S.hit = hit; S.hitSc = sPx;
    return hit;
  }

  /* ================= ① 진자 관찰 ================= */
  const AXT = { x0: 0, x1: 2.4, y0: -0.15, y1: 0.15 };
  function drawXT(rc) {
    const M = frame(rc, { x0: 0, x1: 2.4, y0: -0.15, y1: 0.15, xt: [0, 0.5, 1, 1.5, 2], xminor: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3], yt: [-0.1, -0.05, 0, 0.05, 0.1], yf: (v) => fx(v, 2, true).replace('+0.00', '0'), xf: (v) => v.toFixed(1), ml: PHONE ? 46 : 52 });
    T(rc.x + 8, rc.y + 18, '위치 센서: x–t 그래프', 13.5, INK, 'left', 800); T(rc.x + rc.w - 8, rc.y + 18, 'x (m)', 13, MUTED, 'right', 700); T(M.ix + M.iw, M.iy + M.ih + 17, 't (s)', 13, MUTED, 'right', 700);
    const o = S.o, w = omega(), q = osc();
    if (!o.paused) {
      const tm = Math.min(q.tau, 2.4);
      ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
      ctx.strokeStyle = BLUE; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let s = 0; s <= tm + 1e-9; s += 0.01) { const px = M.gx(s), py = M.gy(o.x0 * Math.cos(w * s)); s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); ctx.restore();
      if (q.tau <= 2.4) D.sphere(M.gx(q.tau), M.gy(q.x), 6, BLUE, { gloss: false });
    } else T(M.ix + M.iw / 2, M.iy + M.ih / 2, '물체를 놓으면 그래프가 그려져요', 14, MUTED, 'center', 700);
    return M;
  }
  function drawObsScene(dt) {
    const c = topCard(), orient = S.ob.orient;
    cardBegin(c);
    if (orient === 'h') {
      drawOsc({ x: c.x + 8, y: c.y + 6, w: c.w - 16, h: 150 }, 'h', {});
      drawXT({ x: c.x + 8, y: c.y + 162, w: c.w - 16, h: c.h - 168 });
    } else {
      drawOsc({ x: c.x + 8, y: c.y + 6, w: PHONE ? 164 : 214, h: c.h - 12 }, 'v', {});
      drawXT({ x: c.x + (PHONE ? 178 : 230), y: c.y + 6, w: c.w - (PHONE ? 178 : 230) - 8, h: c.h - 12 });
    }
    if (S.o.drag) D.label(c.x + c.w / 2, c.y + c.h - 14, '놓으면 진동이 시작돼요', { bg: '#475569', size: 13 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, o = S.o, q = osc(), Ts = S.sens.T;
    T(x1, PY + 28, '📏 센서와 스톱워치', PHONE ? 14 : 15, INK, 'left', 800);
    const rows = [
      ['진폭 A (평형점에서 가장 먼 거리)', fx(Math.abs(o.x0), 2) + ' m'],
      ['주기 T (센서: 한 번 왕복하는 시간)', Ts == null ? (o.paused ? '—' : '재는 중…') : fx(Ts, 2) + ' s'],
      ['진동수 f = 1/T (1초 동안의 왕복 수)', Ts == null ? '—' : fx(1 / Ts, 1) + ' Hz'],
    ];
    rows.forEach((r, i) => { const yy = PY + 58 + i * 28; T(x1, yy, r[0], PHONE ? 13 : 14, MUTED, 'left', 700); T(PX + PW - 16 - (PHONE ? 0 : 0), yy, r[1], PHONE ? 15 : 16, '#1d4ed8', 'right', 800); });
    const sw = S.sw, sy = PY + 58 + 3 * 28 + 18;
    D.roundRect(x1, sy - 18, PW - 32, 66, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(x1 + 12, sy + 4, '⏱ 스톱워치: 10번 왕복', 14, INK, 'left', 800);
    const cnt = sw.done ? 10 : sw.on ? sw.count : 0;
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i < cnt ? GREEN : '#cbd5e1'; ctx.beginPath(); ctx.arc(x1 + 18 + i * (PHONE ? 20 : 24), sy + 26, 7, 0, TAU); ctx.fill(); }
    const swTxt = sw.done ? '10번 왕복 ' + fx(sw.res, 1) + ' s → T = ' + fx(sw.res / 10, 2) + ' s' : sw.on ? '재는 중… ' + fx(Math.max(0, o.t - sw.t0), 1) + ' s' : '▶ ⏱ 10번 왕복 재기를 눌러요';
    T(PX + PW - 16, sy + 4, swTxt, PHONE ? 13.5 : 14.5, sw.done ? '#14753f' : MUTED, 'right', 800);
    para(x1, sy + 70, orient === 'v' ? '수직으로 매달아도 평형점 O만 mg/k 아래로 옮겨질 뿐, 물체는 O를 중심으로 같은 방식으로 왕복해요.' : '마찰 없는 트랙에서 물체는 평형점 O를 가운데 두고 같은 구간을 왕복해요. 물체를 끌었다 놓아도 돼요.', PW - 32, 13.5, '#c2410c', 19, 700);
  }

  /* ================= ② 복원력 ================= */
  function foPoints() { return S.fo.rec.map((cm) => ({ x: cm / 100, a: -omega() * omega() * cm / 100 })); }
  function drawForceScene(dt) {
    const c = topCard(), fo = S.fo, q = osc(), o = S.o;
    cardBegin(c);
    drawOsc({ x: c.x + 8, y: c.y + 4, w: c.w - 16, h: 150 }, 'h', { arrows: 2 });
    // a–x 그래프
    const gr = PHONE ? { x: c.x + 8, y: c.y + 160, w: c.w - 16, h: c.h - 166 } : { x: c.x + 8, y: c.y + 160, w: 400, h: c.h - 166 };
    const M = frame(gr, { x0: -0.12, x1: 0.12, y0: -12, y1: 12, xt: [-0.1, -0.05, 0, 0.05, 0.1], yt: [-10, -5, 0, 5, 10], xf: (v) => (Math.abs(v) < 1e-9 ? '0' : fx(v, 2, true)), yf: (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v), mt: 24, mb: 26, ml: PHONE ? 40 : 46 });
    T(gr.x + 8, gr.y + 17, '가속도 센서: a (m/s²) – x (m) 그래프', 13.5, INK, 'left', 800);
    const pts = foPoints();
    if (pts.length >= 2) {
      const xs = pts.map((p) => p.x), mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length, mx = mean(xs), my = mean(pts.map((p) => p.a));
      let sxx = 0, sxy = 0; pts.forEach((p) => { sxx += (p.x - mx) * (p.x - mx); sxy += (p.x - mx) * (p.a - my); });
      if (sxx > 1e-9) { const sl = sxy / sxx, b = my - sl * mx; ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip(); ctx.strokeStyle = 'rgba(37,99,235,.65)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M.gx(-0.12), M.gy(sl * -0.12 + b)); ctx.lineTo(M.gx(0.12), M.gy(sl * 0.12 + b)); ctx.stroke(); ctx.restore(); }
    }
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip();
    fo.trail.forEach((p, i) => { ctx.fillStyle = 'rgba(245,158,11,' + (0.15 + 0.5 * i / fo.trail.length) + ')'; ctx.beginPath(); ctx.arc(M.gx(p[0]), M.gy(p[1]), 3, 0, TAU); ctx.fill(); });
    ctx.restore();
    pts.forEach((p) => D.sphere(M.gx(p.x), M.gy(p.a), 6.5, '#2563eb', { gloss: false }));
    D.sphere(M.gx(clamp(q.x, -0.12, 0.12)), M.gy(clamp(q.a, -12, 12)), 8, ORANGE, { gloss: true, shadow: true });
    if (!PHONE) {
      const rx = c.x + 420, rw = c.w - 420 - 8, ry = c.y + 168;
      D.roundRect(rx, ry, rw, c.h - 174, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
      T(rx + 12, ry + 24, '🧩 가속도는 어디서 나올까?', 14, INK, 'left', 800);
      const st = ['① 용수철이 미는 힘 (훅의 법칙)  F = −kx', '② 뉴턴 제2법칙  F = ma', '③ 합치면  ma = −kx', '④ a = −(k/m) x = −ω²x  (ω = √(k/m))'];
      st.forEach((s2, i) => { const hl = Math.floor(S.clock / 1.6) % 4 === i; T(rx + 12, ry + 54 + i * 28, s2, 13.5, hl ? '#c2410c' : INK, 'left', hl ? 800 : 700); });
      T(rx + 12, ry + 54 + 4 * 28 - 2, '− 부호: 변위와 반대, 항상 평형점을 향해요', 13, MUTED, 'left', 700);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    T(x1, PY + 28, '📊 지금 값 (m = ' + fm(o.m) + ' kg, k = ' + o.k + ' N/m)', PHONE ? 14 : 15, INK, 'left', 800);
    const F = -o.k * q.x;
    const rows = [['변위 x', fx(q.x, 2, true) + ' m', '#1d4ed8'], ['복원력 F = −kx', fx(F, 1, true) + ' N', RED], ['가속도 a = F / m', fx(q.a, 1, true) + ' m/s²', '#14753f'], ['속력 |v|', fx(Math.abs(q.v), 2) + ' m/s', MUTED]];
    rows.forEach((r, i) => { const yy = PY + 62 + i * 30; T(x1, yy, r[0], PHONE ? 14 : 15, INK, 'left', 800); T(PX + PW - 16, yy, r[1], PHONE ? 16 : 17, r[2], 'right', 800); });
    const pts2 = fo.rec.slice().sort((a, b) => a - b);
    T(x1, PY + 62 + 4 * 30 + 12, '기록한 점 ' + pts2.length + '개: ' + (pts2.length ? pts2.map((v) => (v === 0 ? '0' : fx(v / 100, 2, true))).join(', ') + ' m' : '—'), PHONE ? 13 : 14, MUTED, 'left', 700);
    para(x1, PY + 62 + 4 * 30 + 40, '평형점에서는 a = 0이지만 속력은 가장 커요. 양 끝에서는 순간 멈추지만 가속도는 가장 커요.', PW - 32, 13.5, '#c2410c', 19, 700);
  }

  /* ================= ③ 주기 ================= */
  const peM = () => S.pe.mv * 0.125, peK = () => S.pe.kv * 25, peA = () => S.pe.av / 100;
  const ENVN = { h: '수평', e: '지구 수직', m: '달 수직' };
  function peApply(rel) {
    const p = S.pe, o = S.o; o.m = peM(); o.k = peK(); o.orient = p.env === 'h' ? 'h' : 'v'; o.g = p.env === 'm' ? 1.6 : 10;
    if (rel) release(peA());
  }
  function peRecord() {
    const p = S.pe, r = { m: peM(), k: peK(), A: peA(), env: p.env, T: TAU / Math.sqrt(peK() / peM()), s: Math.sqrt(peM() / peK()) };
    if (p.rec.some((q) => q.m === r.m && q.k === r.k && q.A === r.A && q.env === r.env)) { showHint('같은 조건은 이미 기록했어요. 값을 바꿔서 기록해 보세요.', 2600); return; }
    if (p.rec.length >= 8) { showHint('표가 가득 찼어요. 🗑 표 지우기를 눌러 주세요.', 2800); return; }
    p.rec.push(r); Sound.click(); updateCtl();
  }
  function peEff() {
    const R = S.pe.rec, same = (a, b, ks) => ks.every((k) => a[k] === b[k]), diff = (a, b, k) => a[k] !== b[k];
    let m = false, k = false, A = false;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
      if (same(R[i], R[j], ['k', 'A', 'env']) && diff(R[i], R[j], 'm')) m = true;
      if (same(R[i], R[j], ['m', 'A', 'env']) && diff(R[i], R[j], 'k')) k = true;
      if (same(R[i], R[j], ['m', 'k', 'env']) && diff(R[i], R[j], 'A')) A = true;
    }
    return { m, k, A };
  }
  function drawPeriodScene(dt) {
    const c = topCard(), p = S.pe, o = S.o, q = osc(), orient = o.orient;
    cardBegin(c);
    const fo = revealed('m1');
    let grc;
    if (orient === 'h') {
      drawOsc({ x: c.x + 8, y: c.y + 4, w: c.w - 16, h: PHONE ? 140 : 150 }, 'h', { label: true });
      grc = { x: c.x + 8, y: c.y + (PHONE ? 150 : 160), w: c.w - 16, h: c.h - (PHONE ? 156 : 166) };
    } else {
      drawOsc({ x: c.x + 8, y: c.y + 4, w: PHONE ? 164 : 214, h: c.h - 8 }, 'v', { label: false });
      grc = { x: c.x + (PHONE ? 178 : 230), y: c.y + 6, w: c.w - (PHONE ? 178 : 230) - 8, h: c.h - 12 };
    }
    if (orient === 'h') T(c.x + c.w - 12, c.y + 22, '환경: ' + ENVN[p.env], 13, MUTED, 'right', 800);
    // T–√(m/k) 그래프
    const M = frame(grc, { x0: 0, x1: 0.4, y0: 0, y1: 2.5, xt: [0, 0.1, 0.2, 0.3, 0.4], yt: [0, 0.5, 1, 1.5, 2, 2.5], xf: (v) => v.toFixed(1), yf: (v) => v.toFixed(1), mt: 26, mb: 28, ml: PHONE ? 38 : 44 });
    T(grc.x + 8, grc.y + 17, 'T (s) – √(m/k) (s) 그래프 (가로축은 √(m/k))', 13.5, INK, 'left', 800);
    if (fo) { ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(M.gx(0), M.gy(0)); ctx.lineTo(M.gx(0.4), M.gy(TAU * 0.4)); ctx.stroke(); ctx.setLineDash([]); T(M.gx(0.31), M.gy(TAU * 0.31) - 12, 'T = 2π√(m/k)', 13, '#1d4ed8', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
    p.rec.forEach((r) => { D.sphere(M.gx(r.s), M.gy(r.T), 6.5, r.env === 'h' ? BLUE : r.env === 'e' ? GREEN : PURPLE, { gloss: false }); });
    const cur = { s: Math.sqrt(o.m / o.k), T: TAU / omega() };
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(M.gx(cur.s), M.gy(cur.T), 9, 0, TAU); ctx.stroke();
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '📋 측정 기록 (' + p.rec.length + ' / 8)', PHONE ? 14 : 15, INK, 'left', 800);
    const cols = PHONE ? [x1, x1 + 70, x1 + 140, x1 + 214, x1 + 292, x1 + 366] : [x1, x1 + 90, x1 + 180, x1 + 270, x1 + 360, x1 + 440];
    ['환경', 'm (kg)', 'k (N/m)', 'A (m)', 'T (s)'].forEach((h, i) => T(cols[i], PY + 52, h, 13.5, MUTED, 'left', 800));
    for (let i = 0; i < 8; i++) {
      const yy = PY + 76 + i * 22, r = p.rec[i];
      if (r) {
        T(cols[0], yy, ENVN[r.env].replace(' 수직', ''), 13.5, r.env === 'h' ? BLUE : r.env === 'e' ? '#15803d' : PURPLE, 'left', 800);
        [fm(r.m), String(r.k), fx(r.A, 2), fx(r.T, 2)].forEach((v, j) => T(cols[j + 1], yy, v, 14, INK, 'left', 800));
      } else if (i === p.rec.length) T(cols[0], yy, '📍 주기 기록하기를 눌러요', 13, '#9aa6bd', 'left', 700);
    }
    if (!PHONE) {
      const tx = x1 + 520, tw = PW - 520 - 28, ef = peEff();
      T(tx, PY + 26, '🔎 바꿔 본 변수', 14.5, INK, 'left', 800);
      [['질량 m', ef.m], ['용수철 상수 k', ef.k], ['진폭 A', ef.A]].forEach((r, i) => T(tx, PY + 56 + i * 26, mark(r[1]) + ' ' + r[0], 14, r[1] ? '#14753f' : MUTED, 'left', 800));
      D.roundRect(tx - 6, PY + 140, tw + 6, 96, 10); ctx.fillStyle = fo ? '#ecfdf5' : '#f4f7fd'; ctx.fill();
      T(tx + 4, PY + 164, fo ? '정리: T = 2π√(m/k)' : '정리해 보세요', 15, fo ? '#15803d' : MUTED, 'left', 800);
      para(tx + 4, PY + 188, fo ? 'm이 클수록 느리고, k가 클수록 빨라요. 진폭 A와 중력 g는 주기에 영향을 주지 않아요.' : '표의 T가 어떤 변수에 따라 달라지는지 비교해요.', tw - 10, 13.5, fo ? '#14532d' : MUTED, 19, 700);
    } else {
      const ef = peEff(), yy = PY + 76 + 8 * 22 + 22;
      T(x1, yy, '바꿔 본 변수: ' + mark(ef.m) + ' m  ' + mark(ef.k) + ' k  ' + mark(ef.A) + ' A', 13.5, INK, 'left', 800);
      if (fo) T(x1, yy + 26, '정리: T = 2π√(m/k) (A와 g는 상관없어요)', 14, '#15803d', 'left', 800);
    }
  }

  /* ================= ④ 에너지·위상 ================= */
  const KA = 0.10;
  function enPeriodSetup() { const o = S.o; o.m = 0.5; o.k = 50; o.orient = 'h'; o.g = 10; o.ts = o.ts; }
  function drawRef(c, q) {
    // 기준 원 + 그림자 + 트랙
    const R = PHONE ? 52 : 66, cx = c.x + (PHONE ? 112 : 168), cy = c.y + (PHONE ? 86 : 92), sc = R / KA, th = omega() * q.tau;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,135,160,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R - 14, cy); ctx.lineTo(cx + R + 14, cy); ctx.moveTo(cx, cy - R - 10); ctx.lineTo(cx, cy + R + 10); ctx.stroke();
    const px = cx + R * Math.cos(th) * Math.sign(S.o.x0 || 1), py = cy - R * Math.sin(th) * Math.sign(S.o.x0 || 1);
    ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    const ty = cy + R + (PHONE ? 52 : 70), mx = cx + q.x * sc;
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, ty - 24); ctx.stroke(); ctx.restore();
    D.sphere(px, py, 8, ORANGE, { gloss: true, shadow: true });
    T(cx, cy - R - 14, '기준 원: 반지름 A, 각속도 ω', 13, MUTED, 'center', 700);
    // 트랙·용수철·물체
    const wallX = c.x + 16;
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(wallX, ty + 22, c.x + (PHONE ? 220 : 340) - wallX, 4);
    D.shadow(() => { ctx.fillStyle = '#64748b'; ctx.fillRect(wallX - 8, ty - 22, 8, 46); }, { blur: 3, y: 1 });
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, ty - 28); ctx.lineTo(cx, ty + 26); ctx.stroke(); ctx.restore();
    T(cx, ty + 44, 'O', 13, '#16a34a', 'center', 800);
    spring(wallX, ty, mx - 18, ty, 11, 9, '#64748b');
    massBlock(mx, ty, 36, 32, '', false);
    // 속도·가속도 화살표
    if (Math.abs(q.v) * 70 > 3) D.arrow(mx, ty - 26, mx + q.v * 70, ty - 26, { color: BLUE, width: 4, head: 9 });
    if (Math.abs(q.a) * 7 > 3) D.arrow(mx, ty + 56, mx + q.a * 7, ty + 56, { color: GREEN, width: 4, head: 9 });
    if (!PHONE) { T(wallX + 4, ty - 36, 'v', 13, BLUE, 'left', 800); T(wallX + 4, ty + 70, 'a', 13, GREEN, 'left', 800); }
    return { cx, cy, R, ty };
  }
  function drawEnergyBars(rc, q, hide) {
    const o = S.o, E = 0.5 * o.k * KA * KA, Ep = 0.5 * o.k * q.x * q.x, Ek = 0.5 * o.m * q.v * q.v;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    T(rc.x + rc.w / 2, rc.y + 20, '에너지 (J)', 13.5, INK, 'center', 800);
    const top = rc.y + 64, base = rc.y + rc.h - 30, bw = (rc.w - 24) / 3 - 8, sc = (base - top) / E;
    [['E_p', Ep, ORANGE], ['E_k', Ek, BLUE], ['합', Ep + Ek, '#14a058']].forEach(([n, v, col], i) => {
      const bx = rc.x + 12 + i * (bw + 12), hh = clamp(v, 0, E * 1.001) * sc;
      ctx.fillStyle = '#e8edf6'; ctx.fillRect(bx, top, bw, base - top);
      ctx.fillStyle = col; ctx.fillRect(bx, base - hh, bw, hh);
      T(bx + bw / 2, base + 17, n, 13.5, INK, 'center', 800);
      T(bx + bw / 2, base - hh - 5, hide ? '?' : fx(v, 2), 13, hide ? ORANGE : col, 'center', 800);
    });
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(rc.x + 6, top); ctx.lineTo(rc.x + rc.w - 6, top); ctx.stroke(); ctx.setLineDash([]);
    T(rc.x + rc.w / 2, top - 22, hide ? '전체 ?' : '전체 ' + fx(E, 2) + ' J', 13, MUTED, 'center', 700);
  }
  function phaseGraph(rc, kind, q, name, hideU) {
    const A = KA, w = omega(), Tt = TAU / w, span = 2 * Tt;
    const col = { x: BLUE, v: '#dc2626', a: GREEN }[kind], fn = { x: (t) => Math.cos(w * t), v: (t) => -Math.sin(w * t), a: (t) => -Math.cos(w * t) }[kind];
    const unit = { x: 'm', v: 'm/s', a: 'm/s²' }[kind], mx = { x: A, v: A * w, a: A * w * w }[kind];
    const M = frame(rc, { x0: 0, x1: span, y0: -1.15, y1: 1.15, xt: [0, Tt / 2, Tt, 1.5 * Tt, span], yt: [-1, 0, 1], xl: false, yl: false, mt: 16, mb: 6, ml: PHONE ? 40 : 44, mr: 8 });
    T(rc.x + 6, rc.y + 14, name, 13, col, 'left', 800);
    [-1, 1].forEach((s) => T(rc.x + (PHONE ? 38 : 42), M.gy(s) + 5, hideU ? (s > 0 ? '+최대' : MINUS + '최대') : (s > 0 ? '+' : MINUS) + (kind === 'x' ? fx(mx, 2) : kind === 'v' ? fx(mx, 1) : fx(mx, 0)), 13, '#3a465c', 'right', 800));
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy - 2, M.iw, M.ih + 4); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let s = 0; s <= span + 1e-9; s += span / 120) { const px = M.gx(s), py = M.gy(fn(s)); s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.stroke(); ctx.restore();
    const tc = ((q.tau % span) + span) % span;
    ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.gx(tc), M.iy - 2); ctx.lineTo(M.gx(tc), M.iy + M.ih); ctx.stroke();
    D.sphere(M.gx(tc), M.gy(fn(tc)), 6, col, { gloss: false });
    return M;
  }
  const SLOT_NAME = { x: '위치 x', v: '속도 v', a: '가속도 a' };
  function drawEnergyScene(dt) {
    const c = topCard(), q = osc(), hideLab = showCalc('lab'), hideEn = showCalc('en');
    cardBegin(c);
    drawRef(c, q);
    const names = (slot, i) => (hideLab ? '그래프 ' + (i + 1) : SLOT_NAME[slot] + ' (' + ({ x: 'm', v: 'm/s', a: 'm/s²' }[slot]) + ')');
    if (!PHONE) {
      const gx0 = c.x + 350, gw = 290, gh = 100;
      S.labSlot.forEach((slot, i) => phaseGraph({ x: gx0, y: c.y + 6 + i * (gh + 6), w: gw, h: gh }, slot, q, names(slot, i), hideLab));
      drawEnergyBars({ x: c.x + 652, y: c.y + 6, w: c.w - 652 - 8, h: c.h - 12 }, q, hideEn);
    } else {
      drawEnergyBars({ x: c.x + 220, y: c.y + 6, w: c.w - 220 - 8, h: c.h - 12 }, q, hideEn);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    if (PHONE) {
      const gh = 94;
      S.labSlot.forEach((slot, i) => phaseGraph({ x: PX + 6, y: PY + 8 + i * (gh + 6), w: PW - 12, h: gh }, slot, q, names(slot, i), hideLab));
      T(x1, PY + 8 + 3 * (gh + 6) + 20, 'x = ' + fx(q.x, 2, true) + ' m · v = ' + fx(q.v, 2, true) + ' m/s · a = ' + fx(q.a, 1, true) + ' m/s²', 13.5, INK, 'left', 800);
      T(x1, PY + 8 + 3 * (gh + 6) + 44, '주황 점: 같은 순간. 세 그래프를 세로로 비교해요.', 13, MUTED, 'left', 700);
    } else {
      T(x1, PY + 28, '🔭 지금 값', 15, INK, 'left', 800);
      T(x1, PY + 56, 'x = ' + fx(q.x, 2, true) + ' m    v = ' + fx(q.v, 2, true) + ' m/s    a = ' + fx(q.a, 1, true) + ' m/s²', 15, '#1d4ed8', 'left', 800);
      const hideN = hideEn;
      T(x1, PY + 84, 'E_p = ½kx² = ' + (hideN ? '?' : fx(0.5 * S.o.k * q.x * q.x, 2)) + ' J,  E_k = ½mv² = ' + (hideN ? '?' : fx(0.5 * S.o.m * q.v * q.v, 2)) + ' J', 14.5, ORANGE === 0 ? INK : '#c2410c', 'left', 800);
      const tx = x1 + 470, tw = PW - 470 - 28;
      D.roundRect(tx - 10, PY + 14, tw + 14, PH - 28, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
      T(tx, PY + 38, '📌 위상 관계', 14.5, INK, 'left', 800);
      para(tx, PY + 64, 'x가 최대일 때 v = 0, |a|는 최대(평형점을 향함)', tw, 13.5, INK, 19, 700);
      para(tx, PY + 108, 'x = 0일 때 |v| 최대 (v_max = Aω), a = 0', tw, 13.5, INK, 19, 700);
      para(tx, PY + 152, 'v는 x보다 ¼주기 앞서고, a는 x와 반대(a = −ω²x)', tw, 13.5, '#c2410c', 19, 800);
      para(x1, PY + 120, '기준 원: 반지름 A인 원을 각속도 ω로 도는 점의 그림자가 용수철 진자의 x와 같아요. 원이 한 바퀴(2π) 도는 시간이 주기 T = 2π/ω예요.', 440, 13.5, MUTED, 19, 700);
      para(x1, PY + 190, '마찰이 없고 탄성력만 일을 하므로 E_k + E_p = ½kA²가 일정해요. 평형점에서는 모두 운동 에너지, 양 끝에서는 모두 탄성 위치 에너지예요.', 440, 13.5, '#14532d', 19, 700);
    }
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  (function build() {
    const g = $('#labGrid');
    [0, 1, 2].forEach((i) => {
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = '그래프 ' + (i + 1);
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.id = 'sL' + i; sel.setAttribute('aria-label', '그래프 ' + (i + 1) + '의 이름');
      [['', '고르세요'], ['x', '위치 x'], ['v', '속도 v'], ['a', '가속도 a']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.lab[i] = sel.value; sel.classList.remove('ok', 'bad'); });
      g.append(lab, sel);
    });
  })();
  function enterScene(mode) {
    const o = S.o;
    if (mode === 'obs') { o.m = 0.5; o.k = 50; o.orient = S.ob.orient; o.g = 10; o.drag = false; release(S.ob.A / 100); }
    else if (mode === 'force') { o.m = 0.5; o.k = 50; o.orient = 'h'; o.g = 10; if (S.fo.mode === 'hold') holdAt(S.fo.xs / 100); else release(Math.abs(S.fo.xs) < 2 ? 0.10 : S.fo.xs / 100); }
    else if (mode === 'period') { peApply(true); }
    else { o.m = 0.5; o.k = 50; o.orient = 'h'; o.g = 10; release(KA); }
  }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; S.mode = mode; enterScene(mode); } updateCtl(); }
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    $$('#oriSeg button').forEach((b) => b.classList.toggle('on', b.dataset.o === S.ob.orient));
    $('#oA1').textContent = fx(S.ob.A / 100, 2) + ' m'; setSl('sA1', S.ob.A, 2, 12);
    $('#bSw').disabled = false; $('#bSw').textContent = S.sw.on ? '⏱ 재는 중…' : '⏱ 10번 왕복 재기';
    $('#nObs').textContent = '물체를 직접 끌었다 놓아도 돼요. 진폭은 ' + fx(S.ob.A / 100, 2) + ' m이에요.';
    $$('.slow-btn').forEach((b) => { b.textContent = S.o.ts < 1 ? '🐢 보통 속도로' : '🐢 느리게 보기'; b.classList.toggle('btn-primary', S.o.ts < 1); });
    $$('#fMode button').forEach((b) => b.classList.toggle('on', b.dataset.f === S.fo.mode));
    $('#oX').textContent = fx(S.fo.xs / 100, 2, true) + ' m'; setSl('sX', S.fo.xs, -12, 12);
    $('#bRec').disabled = S.fo.mode !== 'hold';
    $('#nFo').textContent = S.fo.mode === 'hold' ? '변위를 정하고 📍 a 기록하기를 눌러 a–x 그래프에 점을 찍어요 (' + S.fo.rec.length + '개).' : '진동하는 동안 주황 점이 a–x 그래프에서 어떻게 움직이는지 봐요.';
    $$('#envSeg button').forEach((b) => b.classList.toggle('on', b.dataset.e === S.pe.env));
    $('#oM').textContent = fm(peM()) + ' kg'; setSl('sM', S.pe.mv, 1, 16);
    $('#oK').textContent = peK() + ' N/m'; setSl('sK', S.pe.kv, 1, 8);
    $('#oA3').textContent = fx(peA(), 2) + ' m'; setSl('sA3', S.pe.av, 2, 12);
    $('#nEn').textContent = S.o.freeze != null ? '진동을 멈춰 x = 0.06 m인 순간이에요. 에너지 막대를 보세요.' : '진동하는 동안 세 그래프의 같은 순간(주황 점)을 비교해요.';
    $('#bGo4').textContent = S.o.freeze != null ? '▶ 진동시키기' : '↺ 처음부터 보기';
    $$('#labGrid select').forEach((s2, i) => { if (s2.value !== S.lab[i]) s2.value = S.lab[i]; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#oriSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ob.orient = b.dataset.o; S.o.orient = b.dataset.o; release(S.ob.A / 100); updateCtl(); }));
  $('#sA1').addEventListener('input', (e) => { S.ob.A = +e.target.value; release(S.ob.A / 100); updateCtl(); });
  $('#bRel').addEventListener('click', () => { Sound.click(); release(S.ob.A / 100); updateCtl(); });
  $('#bSw').addEventListener('click', () => { Sound.click(); release(S.ob.A / 100); S.sw = { on: true, done: false, t0: S.o.t, res: 0, A: S.ob.A / 100, count: 0 }; updateCtl(); });
  $$('.slow-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.o.ts = S.o.ts < 1 ? 1 : 0.25; updateCtl(); }));
  $$('#fMode button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fo.mode = b.dataset.f; if (b.dataset.f === 'hold') holdAt(S.fo.xs / 100); else release(Math.abs(S.fo.xs) < 2 ? 0.10 : S.fo.xs / 100); updateCtl(); }));
  $('#sX').addEventListener('input', (e) => { S.fo.xs = +e.target.value; if (S.fo.mode === 'hold') holdAt(S.fo.xs / 100); else release(Math.abs(S.fo.xs) < 2 ? 0.10 : S.fo.xs / 100); updateCtl(); });
  $('#bRec').addEventListener('click', () => {
    if (S.fo.mode !== 'hold') { showHint('✋ 위치 정하기로 바꾼 뒤에 기록해요.', 2400); return; }
    if (S.fo.rec.indexOf(S.fo.xs) >= 0) { showHint('이 위치는 이미 기록했어요.', 2000); return; }
    S.fo.rec.push(S.fo.xs); Sound.click(); updateCtl();
  });
  $('#bRecR').addEventListener('click', () => { Sound.click(); S.fo.rec = []; updateCtl(); });
  $$('#envSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pe.env = b.dataset.e; peApply(true); updateCtl(); }));
  [['sM', 'mv'], ['sK', 'kv'], ['sA3', 'av']].forEach(([id, k]) => $('#' + id).addEventListener('input', (e) => { S.pe[k] = +e.target.value; peApply(true); updateCtl(); }));
  $('#bRec3').addEventListener('click', peRecord);
  $('#bClr3').addEventListener('click', () => { Sound.click(); S.pe.rec = []; updateCtl(); });
  $('#bGo4').addEventListener('click', () => { Sound.click(); release(KA); updateCtl(); });
  $('#bX06').addEventListener('click', () => { Sound.click(); const o = S.o; o.x0 = KA; o.paused = false; o.t0 = o.t; o.freeze = Math.acos(0.6) / omega(); S.sens = { cross: [], T: null }; updateCtl(); });
  ['iT1', 'iA1', 'iSl', 'iKk', 'iPr', 'iEp', 'iEk'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  // 물체 끌기 (관찰·복원력 화면)
  SciSim.pointer(view, {
    down(p) {
      if ((S.mode !== 'obs' && !(S.mode === 'force')) || !S.hit) return false;
      const h = S.hit; if (p.x < h.x - 10 || p.x > h.x + h.w + 10 || p.y < h.y - 10 || p.y > h.y + h.h + 10) return false;
      S.o.drag = true; holdAt(S.o.paused ? S.o.x0 : osc().x); return true;
    },
    move(p) {
      const h = S.hit; if (!h || !S.o.drag) return;
      let x = h.axis === 'h' ? (p.x - h.xO - 0) / h.sPx : (p.y - h.yO) / h.sPx;
      x = clamp(Math.round(x * 100) / 100, -0.12, 0.12);
      S.o.x0 = x; S.o.paused = true; S.drag = x;
      if (S.mode === 'force') { S.fo.xs = Math.round(x * 100); if (S.fo.mode !== 'hold') { S.fo.mode = 'hold'; } }
      updateCtl();
    },
    up() {
      if (!S.o.drag) return; S.o.drag = false;
      const adj = (x) => (Math.abs(x) < 0.02 ? (x < 0 ? -0.02 : 0.02) : x);
      if (S.mode === 'obs') { const x = adj(S.o.x0); S.ob.A = Math.round(Math.abs(x) * 100); release(x); }
      else if (S.mode === 'force') { S.fo.xs = Math.round(S.o.x0 * 100); holdAt(S.o.x0); }
      updateCtl();
    },
    hover(p) { const h = S.hit; return h && (S.mode === 'obs' || S.mode === 'force') && p.x > h.x - 6 && p.x < h.x + h.w + 6 && p.y > h.y - 6 && p.y < h.y + h.h + 6 ? 'grab' : null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode, q = osc(), o = S.o, Ts = S.sens.T;
    if (m === 'obs') { L1 = '진폭 A'; a = fx(Math.abs(o.x0), 2) + ' m'; L2 = '주기 T (센서)'; b = Ts == null ? '—' : fx(Ts, 2) + ' s'; L3 = '진동수 f'; c = Ts == null ? '—' : fx(1 / Ts, 1) + ' Hz'; }
    else if (m === 'force') { L1 = '변위 x'; a = fx(q.x, 2, true) + ' m'; L2 = '복원력 F = −kx'; b = fx(-o.k * q.x, 1, true) + ' N'; L3 = '가속도 a'; c = fx(q.a, 1, true) + ' m/s²'; }
    else if (m === 'period') { L1 = 'm / k / A'; a = fm(o.m) + ' kg / ' + o.k + ' / ' + fx(Math.abs(o.x0), 2); L2 = '주기 T (센서)'; b = fx(periodT(), 2) + ' s'; L3 = '기록한 점'; c = S.pe.rec.length + ' / 8'; }
    else { L1 = '위치 x'; a = fx(q.x, 2, true) + ' m'; L2 = '속도 v'; b = fx(q.v, 2, true) + ' m/s'; L3 = '가속도 a'; c = fx(q.a, 1, true) + ' m/s²'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };
  const near = (v, a, tol) => v != null && Math.abs(v - a) <= tol;

  const levels = [
    {
      title: '진자 관찰: 왕복 운동의 규칙', short: '진자 관찰', icon: '🌀', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 용수철에 매단 추의 왕복 운동은 어떤 규칙을 따를까? 주기는 무엇이 결정할까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 훅의 법칙 F = kx와 탄성 위치 에너지 ½kx²를 배웠고, <b>중3에서</b> 역학적 에너지 보존을 배웠어요. 이번에는 거기서 다루지 않은 <b>왕복 운동의 주기와 가속도</b>를 알아봐요. (g = 10 m/s²)</div>' +
        '<p>마찰 없는 트랙 위의 용수철 진자예요. 물체를 <b>끌었다 놓으면</b> 평형점 O를 가운데 두고 왕복해요. 위치 센서가 그리는 <b>x–t 그래프</b>와 <b>주기 센서</b>, <b>스톱워치</b>로 운동의 모습을 읽어 봐요.</p>',
      features: ['obs'],
      setup() { resetFlags(); S.ob.orient = 'h'; S.ob.A = 10; S.sw = { on: false, done: false, t0: 0, res: 0, A: 0, count: 0 }; setScene('obs'); enterScene('obs'); },
      recap: '용수철 진자는 평형점 O를 중심으로 같은 구간을 되풀이해 왕복하고, 위치–시간 그래프는 코사인 모양이에요. 한 번 왕복하는 시간이 주기 T, 1초 동안의 왕복 수가 진동수 f = 1/T예요. 수직으로 매달아도 평형점만 옮겨질 뿐 같은 운동이에요.',
      summary: '<ul><li><b>평형점 O</b>: 알짜힘이 0인 위치. 수평 트랙에서는 용수철이 자연 길이일 때, 수직으로 매달면 mg = kx가 되는 곳(mg/k만큼 늘어난 곳)이에요.</li>' +
        '<li><b>진폭 A</b>: 평형점에서 가장 먼 거리. <b>주기 T</b>: 한 번 왕복하는 시간. <b>진동수 f = 1/T</b>(단위 Hz).</li>' +
        '<li>예: A = 0.10 m, m = 0.50 kg, k = 50 N/m이면 10번 왕복에 6.3 s → <b>T = 0.63 s</b>, f ≈ 1.6 Hz.</li>' +
        '<li>위치 x–t 그래프는 <b>코사인(사인) 곡선</b>이에요. 그래프에서 진폭과 주기를 읽을 수 있어요.</li>' +
        '<li>수직으로 매달아도 평형점만 mg/k만큼 아래로 옮겨지고, 그 점을 중심으로 같은 운동을 해요.</li></ul>',
      missions: [
        {
          title: '10번 왕복 시간으로 주기 재기',
          goal: '<b>진폭 0.10 m</b>로 놓고 <b>⏱ 10번 왕복 재기</b>를 눌러 스톱워치가 멈출 때까지 기다려요. 10번 왕복 시간으로 주기를 구해요.',
          hint: '진폭 슬라이더를 0.10 m에 맞추고(처음 값) ⏱ 10번 왕복 재기를 눌러요. 🐢 느리게 보기를 켜면 더 오래 걸려요.',
          setup() { resetFlags(); S.sw = { on: false, done: false, t0: 0, res: 0, A: 0, count: 0 }; S.ob.orient = 'h'; S.ob.A = 10; setScene('obs'); enterScene('obs'); },
          check: () => S.sw.done && Math.abs(S.sw.A - 0.10) < 1e-6 && S.sw.res > 6 && S.sw.res < 6.6,
          hold: 0.6,
          status: () => mark(Math.abs(S.ob.A - 10) < 1e-6) + ' 진폭 0.10 m &nbsp; ' + mark(S.sw.done) + ' 10번 왕복 ' + (S.sw.done ? fx(S.sw.res, 1) + ' s → T = ' + fx(S.sw.res / 10, 2) + ' s' : S.sw.on ? '재는 중' : '아직'),
          explain: '10번 왕복에 약 <b>6.3 s</b> 걸렸으므로 한 번 왕복하는 시간은 <b>T = 6.3 / 10 = 0.63 s</b>예요(여러 번 재서 나누면 오차가 줄어요). 진동수는 f = 1/T ≈ 1.6 Hz예요.',
        },
        {
          title: 'x–t 그래프에서 주기와 진폭 읽기', manual: true,
          goal: '그래프의 눈금을 보고 <b>주기 T</b>(s)와 <b>진폭 A</b>(m)를 읽어 입력하고 ✔ 확인하기를 누르세요.',
          hint: '그래프에서 이웃한 두 봉우리 사이의 시간이 주기예요. 진폭은 평형점(0)에서 봉우리까지의 높이예요.',
          setup() { resetFlags(); clr('iT1', 'iA1'); setFlag('read', true); setScene('obs'); enterScene('obs'); },
          check() {
            const t = num('iT1'), a = num('iA1'); if (t == null || a == null) return '두 칸 모두 입력해 주세요.';
            const Tn = periodT(), An = Math.abs(S.o.x0);
            const oks = [near(t, Tn, 0.04), near(a, An, 0.011)];
            fb([[$('#iT1'), oks[0]], [$('#iA1'), oks[1]]]);
            if (oks.every(Boolean)) return true;
            if (!oks[0] && near(t, Tn * 2, 0.06)) return '이웃한 봉우리 사이(한 번 왕복)의 시간이 주기예요. 두 번 왕복한 시간을 읽은 것 같아요.';
            if (!oks[1] && near(a, 2 * An, 0.02)) return '진폭은 평형점에서 봉우리까지예요. 봉우리와 골 사이 전체 높이가 아니에요.';
            if (!oks[1] && a > 1) return '진폭 단위는 m예요. cm가 아니라 m로 입력해요 (예: 0.10).';
            return !oks[0] ? '봉우리에서 다음 봉우리까지 걸린 시간을 눈금(0.1 s 칸)으로 읽어 보세요.' : '평형점(0)에서 봉우리까지의 높이를 눈금으로 읽어 보세요.';
          },
          status: () => '입력 T = ' + ($('#iT1').value.trim() || '—') + ' s, A = ' + ($('#iA1').value.trim() || '—') + ' m',
          explain: '이웃한 봉우리 사이의 시간이 <b>주기 T ≈ 0.63 s</b>, 평형점에서 봉우리까지의 높이가 <b>진폭 A = 0.10 m</b>예요. 스톱워치로 잰 값과 같죠?',
        },
        {
          type: 'quiz', title: '평형점은 어디일까?',
          goal: '수직으로 매단 용수철 진자에서 <b>평형점</b>(O)의 정의로 알맞은 것은?',
          setup() { resetFlags(); S.ob.orient = 'v'; S.ob.A = 10; setScene('obs'); S.o.orient = 'v'; release(0.10); updateCtl(); },
          choices: ['용수철이 자연 길이일 때 물체가 있는 곳', '물체에 작용하는 알짜힘이 0인 곳, 수직 용수철에서는 중력 mg와 탄성력 kx가 같아지는 곳', '물체가 가장 아래로 내려간 곳', '물체의 속력이 0인 곳'],
          answer: 1,
          feedback: ['수평 트랙에서는 그렇지만, 수직으로 매달면 중력 때문에 자연 길이보다 mg/k만큼 늘어난 곳이 평형점이에요.', '', '가장 아래는 진폭의 끝이에요. 거기서는 알짜힘이 0이 아니에요(위로 당기는 힘이 더 커요).', '속력이 0인 곳은 양 끝점이에요. 거기서는 알짜힘이 가장 커요.'],
          explain: '평형점은 <b>알짜힘이 0인 위치</b>예요. 수직으로 매달면 mg = kx에서 x = mg/k만큼 늘어난 곳(m = 0.50 kg, k = 50 N/m이면 0.10 m)이에요. 물체는 그 점을 중심으로 왕복해요.',
        },
      ],
    },
    {
      title: '복원력: 변위에 비례해 반대로', short: '복원력', icon: '🧲', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물체가 평형점 O를 중심으로 왕복하는 것을 봤어요. 왜 되돌아올까요? 훅의 법칙의 힘 <b>F = −kx</b>가 항상 평형점을 향하기 때문이에요.</div>' +
        '<p>물체를 평형점에서 x만큼 옮기고 <b>가속도 센서</b> 값 a를 재어 <b>a–x 그래프</b>에 점을 찍어요. 점이 놓이는 모양에서 가속도와 변위의 관계를 찾고, 뉴턴 제2법칙으로 <b>a = −(k/m)x = −ω²x</b>를 정리해요.</p>',
      features: ['force'],
      setup() { resetFlags(); S.fo.mode = 'hold'; S.fo.xs = 0; S.fo.rec = []; setScene('force'); enterScene('force'); },
      recap: '용수철 진자의 복원력 F = −kx는 항상 평형점을 향하고, 뉴턴 제2법칙 ma = −kx에서 가속도 a = −(k/m)x = −ω²x(ω = √(k/m))예요. 가속도는 변위에 비례하고 방향은 반대예요.',
      summary: '<ul><li>복원력 <b>F = −kx</b>: 변위 x와 반대 방향(항상 평형점을 향함), 크기는 변위에 비례해요.</li>' +
        '<li>뉴턴 제2법칙 F = ma에서 <b>a = −(k/m)x = −ω²x</b> (<b>ω = √(k/m)</b>). 가속도는 변위에 비례하고 방향은 반대예요.</li>' +
        '<li>a–x 그래프는 <b>원점을 지나는 직선</b>이고 기울기는 −ω² = −k/m. m = 0.50 kg, k = 50 N/m이면 ' + MINUS + '100 s⁻²(ω = 10 rad/s).</li>' +
        '<li>평형점(x = 0)에서 a = 0이고 속력은 최대. 양 끝점(|x| = A)에서 속력은 0이지만 |a|는 최대(a_max = Aω² = 10 m/s²)예요.</li></ul>',
      missions: [
        {
          title: '변위별 가속도 측정하고 점 찍기',
          goal: '<b>✋ 위치 정하기</b>에서 <b>x = ' + MINUS + '0.10, ' + MINUS + '0.05, 0, +0.05, +0.10 m</b> 다섯 곳에서 각각 <b>📍 a 기록하기</b>를 눌러 a–x 그래프에 점을 찍어요.',
          hint: '변위 슬라이더를 −0.10 m로 맞추고 📍 a 기록하기, 다음 위치로 옮기고 또 기록해요. 물체를 직접 끌어도 돼요.',
          setup() { resetFlags(); S.fo.mode = 'hold'; S.fo.xs = 0; S.fo.rec = []; setScene('force'); enterScene('force'); holdAt(0); updateCtl(); },
          check: () => [-10, -5, 0, 5, 10].every((v) => S.fo.rec.indexOf(v) >= 0),
          hold: 0.5,
          status: () => [-10, -5, 0, 5, 10].map((v) => mark(S.fo.rec.indexOf(v) >= 0) + ' ' + (v === 0 ? '0' : fx(v / 100, 2, true))).join(' &nbsp; '),
          explain: '다섯 점 (x, a) = (' + MINUS + '0.10, +10), (' + MINUS + '0.05, +5), (0, 0), (+0.05, ' + MINUS + '5), (+0.10, ' + MINUS + '10)은 <b>원점을 지나는 직선</b> 위에 있어요. 변위가 +이면 가속도는 −, 변위가 −이면 가속도는 +예요(항상 평형점 방향).',
        },
        {
          title: '직선의 기울기에서 k 구하기', manual: true,
          goal: 'a–x 그래프의 <b>기울기</b>(s⁻²)를 읽고, 기울기 = <b>' + MINUS + 'k/m</b>를 이용해 <b>용수철 상수 k</b>(N/m)를 구해 입력하세요. (m = 0.50 kg)',
          hint: '기울기 = Δa / Δx. 예를 들어 x = 0.10 m에서 a = ' + MINUS + '10 m/s²이므로 기울기는 ' + MINUS + '10 / 0.10이에요. k = (기울기의 크기) × m.',
          setup() { resetFlags(); S.fo.mode = 'hold'; S.fo.xs = 10; S.fo.rec = [-10, -5, 0, 5, 10]; clr('iSl', 'iKk'); setFlag('slope', true); setScene('force'); enterScene('force'); holdAt(0.10); updateCtl(); },
          check() {
            const sl = num('iSl'), k = num('iKk'); if (sl == null || k == null) return '두 칸 모두 입력해 주세요.';
            const oks = [near(sl, -100, 6), near(k, 50, 3)];
            fb([[$('#iSl'), oks[0]], [$('#iKk'), oks[1]]]);
            if (oks.every(Boolean)) { S.flags.slopeOK = true; return true; }
            if (!oks[0] && near(sl, 100, 6)) return '기울기의 부호를 확인해요. a는 x와 반대 방향이라 직선은 오른쪽 아래로 내려가요. 기울기가 −예요.';
            if (!oks[0]) return '기울기 = Δa / Δx = (' + MINUS + '10 − 10) / (0.10 − (' + MINUS + '0.10))을 계산해 보세요.';
            return 'k = 기울기의 크기 × m = 100 × 0.50이에요.';
          },
          status: () => '입력 기울기 ' + ($('#iSl').value.trim() || '—') + ' s⁻², k ' + ($('#iKk').value.trim() || '—') + ' N/m',
          explain: '기울기 = Δa/Δx = (' + MINUS + '10 − 10)/(0.10 + 0.10) = <b>' + MINUS + '100 s⁻²</b>. a = ' + MINUS + '(k/m)x이므로 기울기 = ' + MINUS + 'k/m = ' + MINUS + 'ω²에서 ω² = 100, <b>ω = 10 rad/s</b>, k = 100 × 0.50 = <b>50 N/m</b>예요.',
        },
        {
          type: 'quiz', title: '평형점과 양 끝점의 가속도',
          goal: '진동하는 물체의 <b>평형점</b>과 <b>양 끝점</b>에서의 가속도와 속력에 대한 설명으로 알맞은 것은?',
          setup() { resetFlags(); S.fo.mode = 'go'; S.fo.xs = 10; setScene('force'); enterScene('force'); release(0.10); updateCtl(); },
          choices: ['평형점에서 가속도가 가장 크고, 양 끝점에서는 정지하므로 가속도도 0이에요', '평형점에서 가속도는 0이고 속력은 최대, 양 끝점에서는 속력이 0이지만 가속도의 크기가 최대예요', '평형점에서 속력도 가속도도 모두 최대예요', '양 끝점에서는 속력도 가속도도 모두 0이에요'],
          answer: 1,
          feedback: ['반대로 알고 있어요. a = −ω²x이므로 x = 0에서 a = 0이고, 끝점에서 |a|가 최대예요. 순간 멈춘다고 가속도가 0은 아니에요.', '', '평형점에서는 복원력이 0이라 가속도가 0이에요. 속력만 최대예요.', '끝점에서는 용수철이 가장 많이 늘어나(줄어들어) 복원력이 최대예요. 속력만 0이에요.'],
          explain: 'a = ' + MINUS + 'ω²x이므로 <b>x = 0에서 a = 0</b>(복원력 0, 속력은 최대)이고, <b>|x| = A에서 |a| = Aω²로 최대</b>예요(그 순간 속력은 0이라서 돌아서요). 속도가 0인 것과 가속도가 0인 것은 달라요.',
        },
      ],
    },
    {
      title: '주기: 무엇이 결정할까?', short: '주기', icon: '⏱️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> a = ' + MINUS + '(k/m)x = ' + MINUS + 'ω²x임을 알았어요. 그렇다면 한 번 왕복하는 시간(주기)은 질량 m, 용수철 상수 k, 진폭 A 중 무엇에 달려 있을까요?</div>' +
        '<p><b>질량, 용수철 상수, 진폭</b>을 하나씩 바꾸며 주기를 <b>기록</b>해요. 표와 그래프에서 규칙을 찾고, <b>수직 용수철</b>과 <b>달</b>에서도 같은 실험을 해 봐요.</p>',
      features: ['period'],
      setup() { resetFlags(); S.pe.env = 'h'; S.pe.mv = 4; S.pe.kv = 2; S.pe.av = 10; S.pe.rec = []; setScene('period'); enterScene('period'); },
      recap: '주기는 T = 2π√(m/k)로, 질량이 클수록 길고 용수철 상수가 클수록 짧아요. 진폭이 달라도, 중력이 달라도(수직·달) 주기는 같아요. 평형점만 mg/k만큼 달라져요.',
      summary: '<ul><li><b>주기 T = 2π/ω = 2π√(m/k)</b>, 진동수 f = 1/T.</li>' +
        '<li>m이 4배 → T는 2배 (m = 2.0 kg이면 T = 1.26 s). k가 4배 → T는 1/2 (k = 200 N/m이면 T = 0.31 s).</li>' +
        '<li><b>진폭이 달라도 주기는 같아요.</b> 진폭이 크면 더 멀리 가지만 가속도도 그만큼 커져 한 번 왕복하는 시간은 같아요.</li>' +
        '<li>수직 용수철: 평형점이 mg/k만큼 늘어난 곳으로 옮겨질 뿐 <b>주기는 수평일 때와 같아요</b>. 달(g = 1.6 m/s²)에서는 늘어남이 0.016 m로 작지만 주기는 같아요.</li>' +
        '<li>T–√(m/k) 그래프는 원점을 지나는 직선이고 기울기는 2π예요.</li></ul>',
      missions: [
        {
          title: '세 변수의 효과 하나씩 측정하기',
          goal: '<b>📍 주기 기록하기</b>로 기록하면서 <b>질량 m</b>만, <b>용수철 상수 k</b>만, <b>진폭 A</b>만 바꾼 측정을 각각 만들어요. (한 번에 하나씩만 바꿔요)',
          hint: '먼저 기본 값(0.50 kg, 50 N/m, 0.10 m)으로 기록하고, m만 바꿔 기록, 다시 k만 바꿔 기록, A만 바꿔 기록해요.',
          setup() { resetFlags(); S.pe.env = 'h'; S.pe.mv = 4; S.pe.kv = 2; S.pe.av = 10; S.pe.rec = []; setScene('period'); enterScene('period'); peApply(true); updateCtl(); },
          check() { const e = peEff(); const ok = e.m && e.k && e.A; if (ok) S.flags.m1 = true; return ok; },
          hold: 0.5,
          status() { const e = peEff(); return mark(e.m) + ' m만 바꾸기 &nbsp; ' + mark(e.k) + ' k만 바꾸기 &nbsp; ' + mark(e.A) + ' A만 바꾸기 &nbsp; (기록 ' + S.pe.rec.length + '개)'; },
          explain: '표를 보면 <b>m이 커지면 T가 길어지고</b>, <b>k가 커지면 T가 짧아지고</b>, <b>진폭 A를 바꿔도 T는 그대로</b>예요. 이 관계를 한 식으로 쓰면 <b>T = 2π√(m/k)</b>예요(그래프의 점이 모두 한 직선 위에 있어요).',
        },
        {
          title: 'm = 2.0 kg일 때 주기 예측하기', manual: true,
          goal: 'k = 50 N/m는 그대로 두고 질량을 <b>2.0 kg</b>(0.50 kg의 4배)으로 하면 주기는 몇 초일까요? 예측해서 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'T = 2π√(m/k). m이 4배가 되면 √(m/k)는 2배, 그러므로 T도 2배예요. 0.63 s의 2배는?',
          setup() { resetFlags(); S.flags.m1 = true; clr('iPr'); setFlag('pred', true); setScene('period'); enterScene('period'); updateCtl(); },
          check() {
            const v = num('iPr'); if (v == null) return '예측한 주기를 숫자로 입력해 주세요 (s).';
            const ok = near(v, 1.26, 0.04); fb([[$('#iPr'), ok]]);
            if (ok) return true;
            if (near(v, 2.52, 0.08)) return 'm이 4배면 T는 4배가 아니라 √4 = 2배예요.';
            if (near(v, 0.63, 0.04)) return '0.63 s는 m = 0.50 kg일 때의 주기예요. m이 4배가 되었어요.';
            return 'T = 2π√(2.0 / 50)을 계산하거나, 0.63 s의 2배를 생각해 보세요.';
          },
          status: () => '입력 ' + ($('#iPr').value.trim() || '—') + ' s',
          explain: 'T = 2π√(m/k) = 2π√(2.0/50) = 2π × 0.2 = <b>1.26 s</b>예요. 질량이 4배가 되었는데 주기는 4배가 아니라 <b>√4 = 2배</b>(0.63 → 1.26 s)예요.',
        },
        {
          type: 'quiz', title: '진폭과 달에서의 주기',
          goal: '같은 용수철 진자를 <b>달</b>(g = 1.6 m/s²)로 가져가 수직으로 매달고 진폭도 2배로 해서 진동시켰어요. 주기는 지구의 수평 진자와 비교해 어떨까요?',
          setup() { resetFlags(); S.flags.m1 = true; S.pe.env = 'm'; setScene('period'); enterScene('period'); peApply(true); updateCtl(); },
          choices: ['중력이 작으니 더 천천히 진동해서 주기가 길어져요', '진폭이 커서 한 번 왕복하는 데 시간이 더 걸려요', '주기는 같아요. 주기는 m과 k로만 정해지고, 중력은 평형점의 위치만 바꿔요', '달에서는 용수철이 늘어나지 않아서 진동하지 않아요'],
          answer: 2,
          feedback: ['중력이 작으면 평형점에서 늘어나는 길이(mg/k)만 줄어들어요. 주기를 정하는 것은 m과 k예요.', '진폭이 커지면 가속도의 크기도 같은 비율로 커져서 한 번 왕복하는 시간은 같아요.', '', '달에서도 용수철은 늘어나요(0.016 m). 평형점이 더 위로 올라올 뿐 진동은 같아요.'],
          explain: '<b>T = 2π√(m/k)</b>에는 진폭 A도 중력 g도 없어요. 달에서는 평형점의 늘어남이 mg/k = 0.016 m로 작아질 뿐이고, 같은 m과 k라면 주기는 지구에서와 <b>같아요</b>. 진폭을 2배로 해도 마찬가지예요.',
        },
      ],
    },
    {
      title: '에너지·위상: 시간 그래프의 짝', short: '에너지·위상', icon: '📊', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> a = ' + MINUS + 'ω²x와 주기 T = 2π/ω를 알았어요. <b>등속 원운동</b>의 각속도 ω(hm-circular-motion)를 기억하나요? 용수철 진자의 단진동은 반지름 A인 원을 각속도 ω로 도는 점의 <b>그림자</b>와 같아요.</div>' +
        '<p><b>위치 x, 속도 v, 가속도 a</b>의 시간 그래프를 나란히 놓고 주황 점(같은 순간)을 비교해요. 누가 누구보다 얼마나 앞서는지 찾고, <b>운동 에너지와 탄성 위치 에너지</b>가 서로 바뀌면서 합이 일정한 것도 확인해요.</p>',
      features: ['energy'],
      setup() { resetFlags(); S.lab = ['', '', '']; setScene('energy'); enterScene('energy'); },
      recap: 'x가 최대일 때 v = 0이고 |a|는 최대이며, x = 0일 때 |v|가 최대이고 a = 0이에요. v는 x보다 ¼주기 앞서고, a는 x와 반대예요. 마찰이 없으면 E_k + E_p = ½kA²가 일정해요.',
      summary: '<ul><li><b>x = A cos ωt</b>, <b>v = ' + MINUS + 'Aω sin ωt</b>, <b>a = ' + MINUS + 'Aω² cos ωt</b>.</li>' +
        '<li>x가 최대(끝점)일 때 v = 0, a는 크기 최대(평형점 방향). x = 0일 때 |v| = Aω = 1.0 m/s(최대), a = 0.</li>' +
        '<li>v는 x보다 <b>¼주기 앞서고</b>, a는 x와 <b>반대 위상</b>(a = ' + MINUS + 'ω²x).</li>' +
        '<li><b>기준 원</b>: 반지름 A, 각속도 ω로 도는 점의 그림자가 단진동의 x예요.</li>' +
        '<li>에너지: E = ½kA² = ½mv² + ½kx² = 0.25 J(A = 0.10 m, k = 50 N/m)로 일정. x = 0.06 m에서 E_p = 0.09 J, E_k = 0.16 J.</li>' +
        '<li>마찰이 없고 탄성력만 일을 하므로 역학적 에너지가 보존돼요. 양 끝에서는 모두 E_p, 평형점에서는 모두 E_k예요.</li></ul>',
      missions: [
        {
          title: '세 그래프에 이름 붙이기', manual: true,
          goal: '<b>▶ 진동</b>하는 모습과 기준 원을 보면서 세 그래프가 각각 <b>위치 x, 속도 v, 가속도 a</b> 중 무엇인지 골라 ✔ 확인하기를 누르세요.',
          hint: '물체가 오른쪽 끝(x 최대)에 있을 때 속도는 0이에요. 가속도는 변위와 반대 방향이라 그때 가장 작은(−) 값이에요. 주황 점이 세 그래프에서 어떤 값에 있는지 비교해요.',
          setup() { resetFlags(); S.lab = ['', '', '']; clrSel('#labGrid select'); setFlag('lab', true); setScene('energy'); enterScene('energy'); },
          check() {
            if (S.lab.some((v) => !v)) return '세 그래프에 모두 이름을 골라 주세요.';
            const oks = S.labSlot.map((s2, i) => S.lab[i] === s2);
            fb(oks.map((o2, i) => [$('#sL' + i), o2]));
            if (oks.every(Boolean)) { S.flags.labOK = true; return true; }
            const i = oks.findIndex((o2) => !o2);
            return '그래프 ' + (i + 1) + (i === 1 ? '를' : '을') + ' 다시 보세요. ' + (S.labSlot[i] === 'x' ? '처음(t = 0)에 물체가 오른쪽 끝에 있으니 x는 최댓값이에요.' : S.labSlot[i] === 'v' ? '처음에는 물체가 순간 멈춰 있으니 v는 0이에요.' : '처음에 a는 가장 작은(−) 값이에요. 변위와 반대 방향의 최대 가속도예요.');
          },
          status: () => '이름 붙인 그래프 ' + S.lab.filter((v) => v).length + ' / 3',
          explain: 't = 0에서 물체는 오른쪽 끝(x = +A)에 있고 잠깐 멈춰 있어요: <b>x는 최댓값, v는 0, a는 ' + MINUS + '최댓값</b>. 그래서 x는 코사인, v는 ' + MINUS + '사인(x보다 ¼주기 앞섬), a는 ' + MINUS + '코사인(x와 반대)이에요.',
        },
        {
          title: 'x = 0.06 m에서 E_p와 E_k 구하기', manual: true,
          goal: '<b>📏 x = 0.06 m에서 멈추기</b>를 눌러 그 순간을 보고, 탄성 위치 에너지 <b>E_p = ½kx²</b>와 운동 에너지 <b>E_k</b>(J)를 구해 입력하세요. (전체 에너지 ½kA² = 0.25 J)',
          hint: 'E_p = ½ × 50 × 0.06² = ? 그리고 E_k = 전체 에너지 − E_p예요 (또는 v = 0.80 m/s에서 ½mv²).',
          setup() { resetFlags(); S.flags.labOK = true; clr('iEp', 'iEk'); setFlag('en', true); setScene('energy'); enterScene('energy'); $('#bX06').click(); },
          check() {
            const p = num('iEp'), k = num('iEk'); if (p == null || k == null) return '두 칸 모두 입력해 주세요 (J).';
            const oks = [near(p, 0.09, 0.006), near(k, 0.16, 0.006)];
            fb([[$('#iEp'), oks[0]], [$('#iEk'), oks[1]]]);
            if (oks.every(Boolean)) { S.flags.enOK = true; return true; }
            if (!oks[0] && near(p, 0.18, 0.01)) return 'E_p = ½kx²이에요. ½를 곱했나요? ½ × 50 × 0.06²을 계산해요.';
            if (!oks[0] && near(p, 0.25, 0.01)) return '0.25 J은 전체 에너지(양 끝에서의 E_p)예요. x = 0.06 m의 E_p를 구해요.';
            if (!oks[1] && oks[0]) return '전체 에너지 0.25 J에서 E_p를 빼면 E_k예요.';
            return 'E_p = ½kx² = ½ × 50 × (0.06)², E_k = 0.25 − E_p예요.';
          },
          status: () => '입력 E_p ' + ($('#iEp').value.trim() || '—') + ' J, E_k ' + ($('#iEk').value.trim() || '—') + ' J',
          explain: 'E_p = ½kx² = ½ × 50 × 0.06² = <b>0.09 J</b>, 전체 E = ½kA² = 0.25 J이므로 E_k = 0.25 ' + MINUS + ' 0.09 = <b>0.16 J</b>이에요(v = ω√(A² ' + MINUS + ' x²) = 0.80 m/s에서 ½mv² = 0.16 J과 같아요).',
        },
        {
          type: 'quiz', title: '속력이 가장 큰 곳과 에너지 합',
          goal: '진동하는 물체의 <b>속력이 가장 큰 위치</b>와 그 까닭으로 알맞은 것은?',
          setup() { resetFlags(); S.flags.labOK = true; S.flags.enOK = true; setScene('energy'); enterScene('energy'); updateCtl(); },
          choices: ['양 끝점: 복원력(가속도)이 가장 커서 가장 빠르게 움직여요', '평형점: 마찰이 없고 탄성력만 일을 해 E_k + E_p가 일정한데, 평형점에서 E_p = 0이라 E_k가 최대이기 때문이에요', '평형점: 가속도가 가장 커서 속력도 가장 커요', '속력은 위치와 상관없이 일정해요'],
          answer: 1,
          feedback: ['끝점에서는 가속도 크기가 최대이지만 속력은 0이에요. 속력이 큰 곳과 가속도가 큰 곳은 달라요.', '', '평형점에서는 가속도가 0이에요. 속력이 최대인 것은 E_p가 0이어서 에너지가 모두 운동 에너지이기 때문이에요.', '속력은 평형점에서 최대(Aω), 끝점에서 0으로 계속 변해요.'],
          explain: '마찰이 없고 탄성력만 일을 하므로 <b>E_k + E_p = ½kA²</b>가 일정해요. 평형점에서 E_p = 0이므로 E_k = ½kA² = 0.25 J로 최대 → <b>v_max = Aω = 1.0 m/s</b>. 양 끝점에서는 E_k = 0(속력 0)이고 E_p가 최대예요.',
        },
      ],
    },
  ];
  function clrSel(sel) { $$(sel).forEach((s2) => { s2.value = ''; s2.classList.remove('ok', 'bad'); }); }

  game = SciSim.game({
    simId: 'hm-spring-shm', mount: '#game', badge: '단진동 박사', homeHref: '../../index.html#hm',
    featureLabels: { obs: '🌀 진자 · x–t 그래프 · 스톱워치', force: '🧲 복원력 · a–x 그래프', period: '⏱️ 주기 측정과 T–√(m/k)', energy: '📊 x·v·a 위상과 에너지' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  enterScene('obs'); updateCtl();
  let lastFree = false, lastLevel = -1, trT = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    oscStep(dt);
    if (S.mode === 'force' && !S.o.paused) { trT += dt; if (trT > 0.04) { trT = 0; const q = osc(); S.fo.trail.push([clamp(q.x, -0.12, 0.12), clamp(q.a, -12, 12)]); if (S.fo.trail.length > 40) S.fo.trail.shift(); } }
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    S.hit = null;
    switch (S.mode) {
      case 'obs': drawObsScene(dt); break;
      case 'force': drawForceScene(dt); break;
      case 'period': drawPeriodScene(dt); break;
      default: drawEnergyScene(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, osc, omega, periodT, release, holdAt, peRecord, peEff, enterScene, G,
    step(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) oscStep(0.02 / S.o.ts); },
    get hit() { return S.hit; },
  };
})();
