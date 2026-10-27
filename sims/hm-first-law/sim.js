/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 열역학 제1법칙 (4차시)
   성취기준 [12역학02-03] 계에 가해진 열이 계의 내부 에너지를 변화시키거나 외부에 일을 할 수 있음을 이해하고, 일상생활 속의 예를 찾음으로써 흥미를 느낄 수 있다.
   ① 관찰: 열과 일 (고정·자유 피스톤, 눌러 압축, 에너지 장부 Q = ΔU + W)
   ② 분석: P–V 그래프 (등압 W = PΔV, 곡선 아래 넓이 = 일, 격자 세기)
   ③ 탐구: 네 가지 과정 (등적·등압·등온·단열의 Q, W, ΔU, ΔT)
   ④ 적용: 생활 속 예 분류, 자전거 펌프 설계
   부호: Q = 계가 흡수한 열(+), W = 계가 외부에 한 일(+), ΔU = Q − W. 단원자 이상 기체 1.00 mol, U = (3/2)nRT, R = 8.31 J/(mol·K).
   몰비열의 유도, 단열 과정의 식(PV^γ), 등온 일의 로그 식, 사이클 해석, 제2법칙은 다루지 않아요(넓이는 시뮬레이션이 계산해 보여 줘요).
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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  const topCard = () => ({ x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 });
  const fN = (v) => { const r = Math.round(v); return (r < 0 ? MINUS : '') + Math.abs(r).toLocaleString('en-US'); };
  const f1 = (x) => { const r = Math.round(x * 10) / 10; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(1); };
  const fS = (v) => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? MINUS : '') + Math.abs(r).toLocaleString('en-US'); };
  const sgn = (v) => (v < 0 ? MINUS : '') + Math.abs(v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function bgGrad(c, a, b) {
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  /* 0을 가운데 두는 막대 (−max .. +max). 막대 칸 밖으로 나가지 않아요 */
  function dbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const z = x + w / 2, e = z + clamp(val / max, -1, 1) * w / 2;
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(Math.min(z, e), y, Math.abs(e - z), h); ctx.restore();
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z, y - 3); ctx.lineTo(z, y + h + 3); ctx.stroke();
  }
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); return v === '' || !isFinite(+v) ? null : +v; };
  const nearRel = (v, a, r) => v != null && Math.abs(v - a) <= Math.abs(a) * r;

  /* ================= 자료 (단원자 이상 기체 1.00 mol, 300 K, 1.0 × 10⁵ Pa) ================= */
  const R = 8.31, NMOL = 1, T0 = 300;
  const V0 = NMOL * R * T0 / 1e5 * 1000;          // 24.93 L
  const CV = 1.5 * NMOL * R;                       // (3/2) n R = 12.465 J/K
  const QD = 2.5 * NMOL * R * 100;                 // 같은 열 (등압으로 100 K 올리는 열) = 2077.5 J
  const W_EXT = 500;                               // 단열 압축에서 외부가 해 주는 일
  const U0 = CV * T0;                              // 3.74 × 10³ J
  const molColor = (TK) => SciSim.color.mix('#4aa3ff', '#ff5a4a', clamp((TK - 250) / 300, 0, 1));
  /* 과정 계산: kind iv(등적) ib(등압) it(등온) ia(단열), p = 크기(T₂ / T₂ / V₂ / 계가 한 일 W) */
  function procCalc(kind, p) {
    let T2 = T0, V2 = V0, W, dU, Q;
    if (kind === 'iv') { T2 = p; dU = CV * (T2 - T0); W = 0; Q = dU; }
    else if (kind === 'ib') { T2 = p; V2 = V0 * T2 / T0; W = NMOL * R * (T2 - T0); dU = CV * (T2 - T0); Q = dU + W; }
    else if (kind === 'it') { V2 = p; W = NMOL * R * T0 * Math.log(V2 / V0); dU = 0; Q = W; }
    else { W = p; dU = -W; T2 = T0 + dU / CV; V2 = V0 * Math.pow(T0 / T2, 1.5); Q = 0; }
    const P2 = NMOL * R * T2 / (V2 / 1000) / 1e5;
    const path = (u) => {
      if (kind === 'iv') { const T = T0 + (T2 - T0) * u; return { V: V0, P: T / T0, T }; }
      if (kind === 'ib') { const T = T0 + (T2 - T0) * u; return { V: V0 * T / T0, P: 1, T }; }
      if (kind === 'it') { const V = V0 + (V2 - V0) * u; return { V, P: V0 / V, T: T0 }; }
      const T = T0 + (T2 - T0) * u, V = V0 * Math.pow(T0 / T, 1.5); return { V, P: (T / T0) * V0 / V, T };
    };
    return { kind, V1: V0, P1: 1, T1: T0, V2, P2, T2, Q, W, dU, dT: T2 - T0, path };
  }
  const KIND_NAME = { iv: '등적', ib: '등압', it: '등온', ia: '단열' };

  /* ================= 상태 ================= */
  const S = {
    mode: 'piston', clock: 0, fade: 0,
    pi: { mode: 'fix', u: 0, run: false, done: { fix: false, free: false, press: false }, res: {}, hp: 0, flame: 0 },
    pv: { kind: 'ib', T2: 400, V2: 50, grid: false, u: 1 },
    pr: { kind: 'iv', p: { iv: 400, ib: 400, it: 50, ia: -500 }, u: 1, seen: {} },
    cls: ['', '', '', '', ''], clsOk: false,
    pu: { f: 0, u: 0, run: false, done: false, sel: -1 },
    flags: { w1: false, w2: false, tab: false, dt: false, cls: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const lockedBy = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['piston', 'pv', 'proc', 'life', 'pump'];
  const ALLOWED = [['piston'], ['pv'], ['proc'], ['life', 'pump']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= 기체 분자 (피스톤 안) ================= */
  const R_M = PHONE ? 4.6 : 5.4;
  let GM = [];
  function gasSync(cnt, W, H) {
    const live = GM.filter((p) => !p.dying);
    for (let i = live.length; i < cnt; i++) { const th = Math.random() * TAU; GM.push({ x: R_M + Math.random() * Math.max(1, W - 2 * R_M), y: R_M + Math.random() * Math.max(1, H - 2 * R_M), ux: Math.cos(th), uy: Math.sin(th), m: 0.82 + Math.random() * 0.36, fade: 0, dying: false }); }
    for (let i = live.length - 1; i >= cnt; i--) live[i].dying = true;
  }
  function gasStep(dt, W, H, TK, onHit) {
    const spd = (PHONE ? 62 : 86) * Math.sqrt(Math.max(TK, 1) / 300);
    for (let i = GM.length - 1; i >= 0; i--) {
      const p = GM[i];
      if (p.dying) { p.fade -= dt * 4; if (p.fade <= 0) { GM.splice(i, 1); continue; } } else if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 4);
      const v = spd * p.m * dt;
      p.x += p.ux * v; p.y += p.uy * v;
      if (p.x < R_M) { p.x = R_M; p.ux = Math.abs(p.ux); } else if (p.x > W - R_M) { p.x = Math.max(R_M, W - R_M); p.ux = -Math.abs(p.ux); }
      if (p.y < R_M) { p.y = R_M; p.uy = Math.abs(p.uy); if (!p.dying && onHit) onHit(p.x); }
      if (p.y > H - R_M) { p.y = Math.max(R_M, H - R_M); p.uy = -Math.abs(p.uy); }
    }
  }
  function hitSpark(x0, py) { return (x) => { if (RM) return; if (Math.random() < 0.5) parts.emit({ x: x0 + x, y: py + 2, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 30, life: 0.28, size: 2.4, color: 'rgba(255,200,60,.95)', gravity: 0, fade: true }); }; }
  /* 실린더 + 피스톤 (x0 왼쪽, yb 바닥, W 폭, hp 기체 높이, hmax 최대 높이) */
  function gasCyl(o) {
    const { x0, yb, W, hp, hmax, TK } = o, top = yb - hmax - 20;
    D.roundRect(x0 - 16, yb + 38, W + 32, 14, 5); ctx.fillStyle = '#6b7a90'; ctx.fill();
    if (o.flame > 0.03) D.flame(x0 + W / 2, yb + 38, 16 + o.flame * 32, S.clock);
    ctx.fillStyle = 'rgba(240,246,255,.9)'; ctx.fillRect(x0, top, W, yb - top);
    const gc = SciSim.color.mix('#cfe0ff', '#ffc0a8', clamp((TK - 250) / 300, 0, 1));
    ctx.fillStyle = SciSim.color.rgba(gc, 0.55); ctx.fillRect(x0, yb - hp, W, hp);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, yb - hp, W, hp); ctx.clip();
    const col = molColor(TK);
    GM.forEach((p) => { D.sphere(x0 + p.x, yb - hp + p.y, R_M, col, { gloss: true }); });
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, yb); ctx.lineTo(x0 + W, yb); ctx.lineTo(x0 + W, top); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 7, top + 6); ctx.lineTo(x0 + 7, yb - 8); ctx.stroke();
    const py = yb - hp;
    ctx.fillStyle = '#516079'; ctx.fillRect(x0 + W / 2 - 4, top - 4, 8, py - top + 2);
    D.shadow(() => { D.roundRect(x0 + 2, py - 12, W - 4, 12, 4); const g = ctx.createLinearGradient(0, py - 12, 0, py); g.addColorStop(0, '#9aa8bd'); g.addColorStop(1, '#5e6c84'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    if (o.mode === 'hand') T(x0 + W / 2, top - 8, '🖐️', 22, INK, 'center', 700);
    else if (o.mode === 'weights') { for (let i = 0; i < 3; i++) { D.roundRect(x0 + W / 2 - 34, py - 26 - i * 15, 68, 14, 3); ctx.fillStyle = i % 2 ? '#7d8aa0' : '#94a1b6'; ctx.fill(); } }
    else if (o.mode === 'lock') { ctx.fillStyle = '#e2464b'; ctx.fillRect(x0 - 8, py - 6, 16, 6); ctx.fillRect(x0 + W - 8, py - 6, 16, 6); T(x0 + W / 2, py - 20, '고정', 13, '#b91c1c', 'center', 800); }
    return { top, py };
  }
  /* 열·일·내부 에너지 장부: 세 개의 막대 (Q, W, ΔU = Q − W) */
  function ledger(x, y, w, v, o) {
    o = o || {};
    const rows = [['열 Q (흡수 +)', v.Q, '#ef4444'], ['일 W (계가 한 일 +)', v.W, '#2563eb'], ['내부 에너지 ΔU = Q − W', v.dU, '#14a058']];
    const rh = o.rh || (PHONE ? 52 : 50), mx = o.max || 2500, tw = o.hide || {};
    rows.forEach((r, i) => {
      const yy = y + i * rh;
      T(x, yy + 14, r[0], PHONE ? 13 : 14, INK, 'left', 800);
      const hid = (i === 0 && tw.Q) || (i === 1 && tw.W) || (i === 2 && tw.dU);
      T(x + w, yy + 14, hid ? '?' : fS(r[1]) + ' J', PHONE ? 14 : 15, hid ? ORANGE : r[2], 'right', 800);
      dbar(x, yy + 22, w, 14, hid ? 0 : r[1], mx, r[2]);
    });
    return rows.length * rh;
  }
  /* ================= ① 열과 일 ================= */
  const PI_MODES = { fix: '🔒 고정 피스톤', free: '🔓 자유 피스톤', press: '🖐️ 눌러 압축' };
  function piCalc(mode, u) {
    if (mode === 'fix') { const q = QD * u, dT = q / CV; return { T: T0 + dT, V: V0, Q: q, W: 0, dU: q, dT }; }
    if (mode === 'free') { const q = QD * u, dT = q / (2.5 * NMOL * R); return { T: T0 + dT, V: V0 * (T0 + dT) / T0, Q: q, W: NMOL * R * dT, dU: CV * dT, dT }; }
    const dU = W_EXT * u, dT = dU / CV, Tn = T0 + dT; return { T: Tn, V: V0 * Math.pow(T0 / Tn, 1.5), Q: 0, W: -dU, dU, dT };
  }
  function piRun() { const p = S.pi; if (p.run) return; p.u = 0; p.run = true; p.done[p.mode] = false; Sound.click(); updateCtl(); }
  function piReset(all) { const p = S.pi; p.run = false; p.u = 0; if (all) { p.done = { fix: false, free: false, press: false }; p.res = {}; } else { p.done[p.mode] = false; delete p.res[p.mode]; } parts.clear(); updateCtl(); }
  function piFill(mode) { const p = S.pi; p.done[mode] = true; p.res[mode] = piCalc(mode, 1); }
  function piStep(dt) {
    const p = S.pi; if (!p.run) return;
    p.u += dt / 4.2;
    if (p.u >= 1) { p.u = 1; p.run = false; p.done[p.mode] = true; p.res[p.mode] = piCalc(p.mode, 1); Sound.success(); updateCtl(); }
  }
  function drawPiston(dt) {
    const c = topCard(), p = S.pi, st = piCalc(p.mode, p.u);
    bgGrad(c);
    const k = PHONE ? 3.9 : 4.2, yb = c.y + c.h - 74, hmax = 45 * k, hp = st.V * k;
    p.flame = approach(p.flame, p.run && p.mode !== 'press' ? 1 : 0, dt, 6);
    const x0 = c.x + (PHONE ? 18 : 40), W = PHONE ? 112 : 150;
    gasSync(24, W, hp); gasStep(dt, W, hp, st.T, hitSpark(x0, yb - hp));
    // 눌러 압축: 손이 내려와요
    const cy = gasCyl({ x0, yb, W, hp, hmax, TK: st.T, mode: p.mode === 'fix' ? 'lock' : p.mode === 'free' ? 'weights' : 'hand', flame: p.flame });
    T(x0 + W / 2, yb + 70, PI_MODES[p.mode].replace(/^\S+ /, ''), PHONE ? 13 : 14.5, INK, 'center', 800);
    // 화살표: 열(들어옴), 일(나감/들어옴)
    if (p.run && p.mode !== 'press') D.arrow(x0 + W / 2, yb + 34, x0 + W / 2, yb + 4, { color: 'rgba(239,68,68,.85)', width: 5, head: 11 });
    if (p.mode === 'free' && st.W > 5) D.arrow(x0 + W + 18, yb - hp - 12, x0 + W + 18, yb - hp - 12 - clamp(st.W / 12, 6, 60), { color: '#2563eb', width: 5, head: 11 });
    if (p.mode === 'press' && p.u > 0) D.arrow(x0 + W / 2 + 26, cy.top - 6, x0 + W / 2 + 26, cy.top + 14 + clamp(st.dU / 12, 4, 40), { color: '#2563eb', width: 5, head: 11 });
    // 온도계
    const tx = c.x + (PHONE ? 168 : 280);
    D.thermometer(tx, c.y + 46, PHONE ? 150 : 170, clamp(st.T, 250, 500), 250, 500, { ticks: false, color: molColor(st.T) });
    D.label(tx, c.y + (PHONE ? 240 : 260), f1(st.T) + ' K', { bg: st.T > 340 ? RED : '#2563eb', size: 13, pad: 9 });
    T(tx, c.y + (PHONE ? 268 : 288), 'ΔT = ' + (st.dT < 0 ? MINUS : '+') + f1(Math.abs(st.dT)) + ' K', 13.5, MUTED, 'center', 800);
    // 장부
    const lx = c.x + (PHONE ? 210 : 350), lw = PHONE ? c.w - 210 - 12 : 400;
    T(lx, c.y + (PHONE ? 46 : 34), p.mode === 'press' ? '외부가 500 J의 일을 해 줘요 (Q = 0)' : '같은 열 Q = ' + fN(QD) + ' J를 줘요', PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
    const hh = ledger(lx, c.y + (PHONE ? 62 : 54), lw, { Q: st.Q, W: st.W, dU: st.dU });
    const dQ = Math.round(st.Q), dW = Math.round(st.W);
    T(lx, c.y + (PHONE ? 62 : 54) + hh + 14, 'Q = ΔU + W :  ' + fN(dQ) + ' = ' + fN(dQ - dW) + ' + ' + (dW < 0 ? '(' + fN(dW) + ')' : fN(dW)), PHONE ? 13.5 : 15, '#14753f', 'left', 800);
    T(c.x + 12, c.y + 24, '기체(계)에 열을 주면 그 열은 어디로 갈까요?', PHONE ? 13 : 14.5, INK, 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 결과 표
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '📋 실험 결과 (같은 열 / 같은 일)', 15, INK, 'left', 800);
    const cols = PHONE ? [x1, x1 + 110, x1 + 180, x1 + 250, x1 + 330, 0] : [x1, x1 + 170, x1 + 290, x1 + 410, x1 + 540, x1 + 640];
    const hy = PY + 52;
    ['실험', 'Q (J)', 'W (J)', 'ΔU (J)', 'ΔT (K)'].forEach((h, i) => T(cols[i], hy, h, 13.5, MUTED, 'left', 800));
    if (!PHONE) T(cols[5], hy, '나중 T (K)', 13.5, MUTED, 'left', 800);
    ['fix', 'free', 'press'].forEach((m, i) => {
      const yy = hy + 30 + i * 32, r = p.res[m], cur = m === p.mode;
      if (cur) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(PX + 6, yy - 20, PW - 12, 27, 8); ctx.fill(); }
      T(cols[0], yy, PHONE ? PI_MODES[m].replace(' 피스톤', '').replace('눌러 ', '') : PI_MODES[m], PHONE ? 13 : 14.5, INK, 'left', 800);
      const vals = r ? [fN(Math.round(r.Q)), fS(r.W).replace('+', ''), fN(Math.round(r.Q) - Math.round(r.W)), f1(r.dT), f1(r.T)] : ['—', '—', '—', '—', '—'];
      vals.slice(0, PHONE ? 4 : 5).forEach((v, j) => T(cols[j + 1], yy, v, 14.5, r ? (j === 3 ? '#b91c1c' : INK) : '#9aa6bd', 'left', 800));
    });
    const both = p.res.fix && p.res.free;
    const msg = both ? '같은 열 ' + fN(QD) + ' J인데 자유 피스톤은 ΔT = ' + f1(p.res.free.dT) + ' K로 고정(' + f1(p.res.fix.dT) + ' K)보다 덜 올라요. 열의 일부(W = ' + fN(p.res.free.W) + ' J)가 일로 나갔기 때문이에요.' : '고정과 자유를 각각 실행해 같은 열을 줘 보세요. 온도가 같이 오를까요?';
    const ls = []; { ctx.save(); ctx.font = D.font(PHONE ? 13 : 14, 800); let line = ''; msg.split(' ').forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > PW - 32 && line) { ls.push(line); line = wd; } else line = t2; }); ls.push(line); ctx.restore(); }
    ls.forEach((l, i) => T(x1, PY + 170 + i * 21, l, PHONE ? 13 : 14, both ? '#1d4ed8' : MUTED, 'left', 800));
  }

  /* ================= P–V 그래프 ================= */
  const XMAX = 60, YMAX = 2.0;
  function pvFrame(rc) {
    const ml = PHONE ? 44 : 50, mr = 14, mt = 30, mb = 34;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    const gx = (V) => ix + iw * V / XMAX, gy = (P) => iy + ih - ih * P / YMAX;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i <= 12; i++) { ctx.strokeStyle = i % 2 === 0 ? 'rgba(120,135,160,.38)' : 'rgba(120,135,160,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(i * 5), iy); ctx.lineTo(gx(i * 5), iy + ih); ctx.stroke(); if (i % 2 === 0) T(gx(i * 5), iy + ih + 17, String(i * 5), 13, '#3a465c', 'center', 800); }
    for (let j = 0; j <= 10; j++) { ctx.strokeStyle = j % 2 === 0 ? 'rgba(120,135,160,.38)' : 'rgba(120,135,160,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix, gy(j * 0.2)); ctx.lineTo(ix + iw, gy(j * 0.2)); ctx.stroke(); if (j % 2 === 0) T(ix - 6, gy(j * 0.2) + 5, (j * 0.2).toFixed(1), 13, '#3a465c', 'right', 800); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ix, iy - 2); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix + iw + 2, iy + ih); ctx.stroke();
    T(rc.x + 10, rc.y + 21, 'P (× 10⁵ Pa)', 13.5, INK, 'left', 800);
    T(rc.x + rc.w - 10, rc.y + 21, 'V (L)  ·  한 칸 = 100 J', 13.5, MUTED, 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  /* 경로 그리기: u(0~1)까지, 넓이 색칠, 점 A·B */
  function drawPV(M, pc, u, o) {
    o = o || {};
    const N = 70, pts = []; for (let i = 0; i <= N; i++) pts.push(pc.path(u * i / N));
    const last = pts[pts.length - 1], first = pts[0];
    if (Math.abs(last.V - first.V) > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip();
      ctx.fillStyle = last.V > first.V ? 'rgba(37,99,235,' + (o.light ? 0.07 : 0.2) + ')' : 'rgba(226,70,75,' + (o.light ? 0.08 : 0.22) + ')';
      ctx.beginPath(); ctx.moveTo(M.gx(first.V), M.gy(0)); pts.forEach((q) => ctx.lineTo(M.gx(q.V), M.gy(q.P))); ctx.lineTo(M.gx(last.V), M.gy(0)); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix - 2, M.iy - 2, M.iw + 4, M.ih + 4); ctx.clip();
    if (o.ghost) { ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); for (let i = 0; i <= N; i++) { const q = pc.path(i / N); i ? ctx.lineTo(M.gx(q.V), M.gy(q.P)) : ctx.moveTo(M.gx(q.V), M.gy(q.P)); } ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = o.color || '#1d4ed8'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => { i ? ctx.lineTo(M.gx(q.V), M.gy(q.P)) : ctx.moveTo(M.gx(q.V), M.gy(q.P)); }); ctx.stroke();
    ctx.restore();
    D.sphere(M.gx(first.V), M.gy(first.P), 7, '#64748b', { gloss: false }); T(M.gx(first.V) - 14, M.gy(first.P) - 8, 'A', 14, '#334155', 'center', 800);
    D.sphere(M.gx(last.V), M.gy(last.P), 7.5, '#e2464b', { gloss: false });
    if (u > 0.98) T(M.gx(last.V) + (last.V >= first.V ? 14 : -14), M.gy(last.P) - 10, 'B', 14, '#b91c1c', 'center', 800);
  }
  /* 격자 세기: 완전히 덮인 칸 / 일부 덮인 칸 / 넓이(칸 수) */
  function cellCover(pc, kind) {
    const Va = Math.min(pc.V1, pc.V2), Vb = Math.max(pc.V1, pc.V2), full = [], part = []; let area = 0;
    const Pf = (V) => (kind === 'ib' ? 1 : V0 / V);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 10; j++) {
      let cnt = 0; const NS = 8;
      for (let a = 0; a < NS; a++) for (let b = 0; b < NS; b++) { const V = i * 5 + (a + 0.5) * 5 / NS, P = j * 0.2 + (b + 0.5) * 0.2 / NS; if (V >= Va && V <= Vb && P <= Pf(V)) cnt++; }
      if (cnt === NS * NS) full.push([i, j]); else if (cnt > 0) part.push([i, j, cnt / (NS * NS)]);
      area += cnt / (NS * NS);
    }
    return { full, part, area };
  }
  function drawCells(M, cv) {
    cv.full.forEach(([i, j]) => { ctx.fillStyle = 'rgba(20,160,88,.38)'; ctx.fillRect(M.gx(i * 5) + 1, M.gy((j + 1) * 0.2) + 1, M.gx(5) - M.gx(0) - 2, M.gy(0) - M.gy(0.2) - 2); });
    cv.part.forEach(([i, j]) => { ctx.fillStyle = 'rgba(245,158,11,.38)'; ctx.fillRect(M.gx(i * 5) + 1, M.gy((j + 1) * 0.2) + 1, M.gx(5) - M.gx(0) - 2, M.gy(0) - M.gy(0.2) - 2); });
  }
  const pvProc = () => (S.pv.kind === 'ib' ? procCalc('ib', S.pv.T2) : procCalc('it', S.pv.V2));
  function drawPVScene(dt) {
    const c = topCard(), v = S.pv, pc = pvProc(), hide = showCalc('w1') || showCalc('w2');
    bgGrad(c);
    v.u = approach(v.u, 1, dt, 3.2);
    const rc = PHONE ? { x: c.x + 4, y: c.y + 4, w: c.w - 8, h: c.h - 8 } : { x: c.x + 6, y: c.y + 4, w: 520, h: c.h - 8 };
    const M = pvFrame(rc);
    let cv = null;
    if (v.grid) { const key = v.kind + '|' + v.T2 + '|' + v.V2; if (!v.cc || v.cc.key !== key) v.cc = { key, val: cellCover(pc, v.kind) }; cv = v.cc.val; ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip(); drawCells(M, cv); ctx.restore(); }
    drawPV(M, pc, v.u, { ghost: true, light: v.grid });
    if (!PHONE) {
      const rx = c.x + 548, rw = c.w - 548 - 10;
      T(rx, c.y + 30, '상태 A → B', 15, INK, 'left', 800);
      T(rx, c.y + 58, 'A: V = ' + f1(pc.V1) + ' L, T = 300 K', 13.5, '#334155', 'left', 800);
      T(rx, c.y + 80, 'B: V = ' + f1(pc.V2) + ' L, T = ' + Math.round(pc.T2) + ' K', 13.5, '#b91c1c', 'left', 800);
      T(rx, c.y + 112, v.kind === 'ib' ? '압력 일정 (P = 1.0 × 10⁵ Pa)' : '온도 일정 (T = 300 K)', 13.5, MUTED, 'left', 800);
      T(rx, c.y + 150, '계가 한 일 W', 14.5, INK, 'left', 800);
      T(rx, c.y + 178, v.kind === 'ib' ? 'W = P × ΔV' : 'W = 곡선 아래 넓이', 15, '#1d4ed8', 'left', 800);
      T(rx, c.y + 206, hide ? 'W = ?' : 'W = ' + fS(pc.W).replace('+', '') + ' J', 18, hide ? ORANGE : '#14753f', 'left', 800);
      if (v.grid && cv) {
        T(rx, c.y + 244, '완전히 덮인 칸 ' + cv.full.length + '개', 13.5, '#14753f', 'left', 800);
        T(rx, c.y + 266, '일부 덮인 칸 ' + cv.part.length + '개', 13.5, '#b45309', 'left', 800);
        T(rx, c.y + 292, '약 (' + cv.full.length + ' + ' + cv.part.length + '/2) × 100 J', 14, INK, 'left', 800);
        T(rx, c.y + 314, '= ' + fN((cv.full.length + cv.part.length / 2) * 100) + ' J', 15, INK, 'left', 800);
      } else T(rx, c.y + 252, '🔢 격자 세기를 켜면 칸을 셀 수 있어요', 13, MUTED, 'left', 700);
    }
    ctx.restore();
    // 아래: 제1법칙 장부
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, lw = PHONE ? PW - 32 : 380;
    T(x1, PY + 28, '⚖️ 제1법칙  ΔU = Q − W', 15, INK, 'left', 800);
    const dW = Math.round(pc.W), dQ = Math.round(pc.Q);
    const val = { Q: pc.Q, W: pc.W, dU: pc.dU };
    ledger(x1, PY + 40, lw, val, { hide: { Q: hide, W: hide } });
    const tx = PHONE ? x1 : x1 + lw + 24, ty = PHONE ? PY + 40 + 3 * 52 + 14 : PY + 54;
    const lines = [];
    lines.push([v.kind === 'ib' ? '등압 팽창: 부피가 늘어 W > 0 (계가 일을 해요)' : '등온 팽창: T 일정 → ΔU = 0 → Q = W', INK]);
    lines.push([pc.W < 0 ? '압축: W < 0 (외부가 계에 일을 해 줘요)' : pc.W > 0 ? '팽창: W > 0 (계가 외부에 일을 해요)' : '', pc.W < 0 ? '#b91c1c' : '#1d4ed8']);
    if (!hide) lines.push([v.kind === 'ib' ? 'Q = ΔU + W = ' + fN(dQ - dW) + ' + ' + fN(dW) + ' = ' + fN(dQ) + ' J' : 'Q = W = ' + fN(dW) + ' J', '#14753f']);
    lines.push(['제1법칙은 에너지 보존 법칙의 다른 표현이에요.', MUTED]);
    let yy = ty; lines.forEach((l) => { if (!l[0]) return; ctx.save(); ctx.font = D.font(PHONE ? 13 : 14, 800); const words = l[0].split(' '); let line = ''; const out = []; words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > (PHONE ? PW - 32 : PW - 32 - lw - 24) && line) { out.push(line); line = wd; } else line = t2; }); out.push(line); ctx.restore(); out.forEach((o2) => { T(tx, yy, o2, PHONE ? 13 : 14, l[1], 'left', 800); yy += PHONE ? 20 : 22; }); yy += 6; });
  }

  /* ================= ③ 네 가지 과정 ================= */
  const PR_RANGE = { iv: [200, 500, 10, '나중 온도 T₂', (v) => v + ' K'], ib: [200, 500, 10, '나중 온도 T₂', (v) => v + ' K'], it: [13, 60, 1, '나중 부피 V₂', (v) => v + ' L'], ia: [-500, 500, 50, '계가 한 일 W', (v) => sgn(v) + ' J'] };
  const prProc = () => procCalc(S.pr.kind, S.pr.p[S.pr.kind]);
  const PRC = { iv: '#2563eb', ib: '#14a058', it: '#f59e0b', ia: '#e2464b' };
  function drawProc(dt) {
    const c = topCard(), r = S.pr, pc = prProc(), hideDT = showCalc('dt') && r.kind === 'ia';
    bgGrad(c);
    r.u = approach(r.u, 1, dt, 3.2);
    const rc = PHONE ? { x: c.x + 4, y: c.y + 4, w: c.w - 8, h: c.h - 8 } : { x: c.x + 6, y: c.y + 4, w: 480, h: c.h - 8 };
    const M = pvFrame(rc);
    // 등온선(점선)을 비교용으로 함께
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip(); ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 5]); ctx.beginPath(); for (let V = 8; V <= 60; V += 0.5) { const X = M.gx(V), Y = M.gy(V0 / V); V === 8 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    T(M.gx(54), M.gy(V0 / 54) - 6, '등온선', 13, '#64748b', 'center', 700);
    drawPV(M, pc, r.u, { ghost: true, color: PRC[r.kind] });
    T(rc.x + rc.w / 2, rc.y + 21, KIND_NAME[r.kind] + ' 과정', 15, PRC[r.kind], 'center', 800);
    if (!PHONE) {
      const rx = c.x + 500, rw = c.w - 500 - 10;
      T(rx, c.y + 30, '열·일·내부 에너지', 15, INK, 'left', 800);
      ledger(rx, c.y + 44, rw, { Q: pc.Q, W: pc.W, dU: pc.dU }, { rh: 56 });
      T(rx, c.y + 44 + 3 * 56 + 22, '온도 변화 ΔT = ' + (hideDT ? '?' : (pc.dT < -0.05 ? MINUS : pc.dT > 0.05 ? '+' : '') + f1(Math.abs(pc.dT)) + ' K'), 15, hideDT ? ORANGE : '#c2410c', 'left', 800);
    }
    ctx.restore();
    // 아래: 표
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, tab = showCalc('tab');
    if (PHONE) {
      T(x1, PY + 26, '🔀 현재 과정  ΔT = ' + (hideDT ? '?' : (pc.dT < -0.05 ? MINUS : pc.dT > 0.05 ? '+' : '') + f1(Math.abs(pc.dT)) + ' K'), 14, '#c2410c', 'left', 800);
      ledger(x1, PY + 38, PW - 28, { Q: pc.Q, W: pc.W, dU: pc.dU }, { rh: 40 });
    }
    const ty0 = PHONE ? PY + 38 + 3 * 40 + 14 : PY + 26;
    T(x1, ty0, '📋 과정 표 (한 칸이 ? 이면 ΔU = Q − W로 구해요)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const cols = PHONE ? [x1, 0, x1 + 130, x1 + 230, x1 + 330] : [x1, x1 + 110, x1 + 340, x1 + 450, x1 + 560];
    const hy = ty0 + 26;
    ['과정', '조건', 'Q (J)', 'W (J)', 'ΔU (J)'].forEach((h, i) => { if (PHONE && i === 1) return; T(cols[i], hy, h, 13.5, MUTED, 'left', 800); });
    const std = [procCalc('iv', 400), procCalc('ib', 400), procCalc('it', 50), procCalc('ia', -500)];
    const rows = [
      ['iv', '300 → 400 K', tab ? '?' : fN(std[0].Q), '0', fN(std[0].dU)],
      ['ib', '300 → 400 K', tab ? '?' : fN(std[1].Q), fN(std[1].W), fN(std[1].dU)],
      ['it', PHONE ? '25 → 50 L' : '부피 25 → 50 L', tab ? '?' : fN(std[2].Q), '≈ 1.7 × 10³', '0'],
      ['ia', PHONE ? '압축' : '압축 (계가 한 일 ' + MINUS + '500 J)', '0', MINUS + '500', tab ? '?' : fN(std[3].dU)],
    ];
    rows.forEach((row, i) => {
      const yy = hy + 28 + i * (PHONE ? 28 : 33), cur = row[0] === r.kind;
      if (cur) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(PX + 6, yy - 20, PW - 12, 27, 8); ctx.fill(); }
      ctx.fillStyle = PRC[row[0]]; ctx.beginPath(); ctx.arc(cols[0] + 6, yy - 6, 6, 0, TAU); ctx.fill();
      T(cols[0] + 16, yy, KIND_NAME[row[0]], 14.5, INK, 'left', 800);
      if (!PHONE) T(cols[1], yy, row[1], 13.5, MUTED, 'left', 800);
      [row[2], row[3], row[4]].forEach((v, j) => T(cols[2 + j], yy, v, 15, v === '?' ? ORANGE : INK, 'left', 800));
    });
    if (PHONE) T(x1, hy + 28 + 4 * 28 + 10, '등적 300 → 400 K · 등압 300 → 400 K · 등온 25 → 50 L · 단열 압축', 13, MUTED, 'left', 700);
  }

  /* ================= ④ 생활 속 예, 펌프 ================= */
  const CARDS = [
    { ic: '🚲', n: '자전거 펌프', d: '손잡이를 빠르게 누르면 노즐이 뜨거워져요', ans: 'ac', t: '온도 ↑' },
    { ic: '🧴', n: '스프레이 캔', d: '계속 뿌리면 캔이 차가워져요', ans: 'ae', t: '온도 ↓' },
    { ic: '☁️', n: '구름의 생성', d: '상승 기류가 위로 오르며 팽창해 식어요', ans: 'ae', t: '온도 ↓' },
    { ic: '🚛', n: '디젤 엔진', d: '공기를 빠르게 압축해 연료가 저절로 점화돼요', ans: 'ac', t: '온도 ↑' },
    { ic: '🍲', n: '압력솥', d: '뚜껑을 꽉 닫고 가열하면 압력이 올라가요', ans: 'iv', t: '압력 ↑' },
  ];
  const CLS_OPT = [['', '고르세요'], ['iv', '등적 가열 (W = 0)'], ['ac', '단열 압축 (Q = 0, W < 0)'], ['ae', '단열 팽창 (Q = 0, W > 0)']];
  const CLS_SIG = { iv: 'Q > 0, W = 0, ΔU = Q > 0', ac: 'Q = 0, W < 0, ΔU > 0', ae: 'Q = 0, W > 0, ΔU < 0' };
  const clsOkAll = () => CARDS.every((cd, i) => S.cls[i] === cd.ans);
  function drawLife(dt) {
    const c = topCard(); bgGrad(c);
    T(c.x + 12, c.y + 24, '일상 속 열역학: 제1법칙으로 읽어요', PHONE ? 13 : 14.5, INK, 'left', 800);
    const done = clsOkAll() || !showCalc('cls');
    const cols = PHONE ? 3 : 5, gw = (c.w - 24 - (cols - 1) * 8) / cols, gh = PHONE ? 130 : 252;
    CARDS.forEach((cd, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = c.x + 12 + col * (gw + 8), y = c.y + 40 + row * (gh + 10);
      const picked = S.cls[i], show = (game && game.free) || !showCalc('cls') || S.clsOk;
      D.shadow(() => { D.roundRect(x, y, gw, gh, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      if (show) { ctx.strokeStyle = 'rgba(20,160,88,.7)'; ctx.lineWidth = 2.5; D.roundRect(x, y, gw, gh, 12); ctx.stroke(); }
      T(x + gw / 2, y + (PHONE ? 38 : 54), cd.ic, PHONE ? 32 : 44, INK, 'center', 700);
      T(x + gw / 2, y + (PHONE ? 62 : 84), cd.n, PHONE ? 13 : 14.5, INK, 'center', 800);
      if (!PHONE) { const ls = cd.d.length > 14 ? [cd.d.slice(0, Math.ceil(cd.d.length / 2.0)).replace(/\s+\S*$/, ''), ''] : [cd.d]; ctx.save(); ctx.font = D.font(13, 700); const words = cd.d.split(' '); let line = ''; const out = []; words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > gw - 14 && line) { out.push(line); line = wd; } else line = t2; }); out.push(line); ctx.restore(); out.forEach((o2, k) => T(x + gw / 2, y + 106 + k * 18, o2, 13, MUTED, 'center', 700)); }
      if (show) {
        T(x + gw / 2, y + gh - (PHONE ? 38 : 72), ({ iv: '등적 가열', ac: '단열 압축', ae: '단열 팽창' })[cd.ans], PHONE ? 13 : 14.5, '#14753f', 'center', 800);
        if (!PHONE) { T(x + gw / 2, y + gh - 50, CLS_SIG[cd.ans].split(', ')[0] + ', ' + CLS_SIG[cd.ans].split(', ')[1], 13, INK, 'center', 700); T(x + gw / 2, y + gh - 31, CLS_SIG[cd.ans].split(', ')[2], 13, INK, 'center', 700); T(x + gw / 2, y + gh - 11, cd.t, 13, cd.t.includes('↑') ? '#b91c1c' : '#1d4ed8', 'center', 800); }
        else T(x + gw / 2, y + gh - 14, cd.t, 13, cd.t.includes('↑') ? '#b91c1c' : '#1d4ed8', 'center', 800);
      } else T(x + gw / 2, y + gh - (PHONE ? 22 : 40), picked ? '골랐어요' : '❓', 16, picked ? MUTED : '#9aa6bd', 'center', 800);
    });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    T(x1, PY + 28, '📋 제1법칙 부호표  ΔU = Q − W', 15, INK, 'left', 800);
    const rows = [['등적 가열', 'Q > 0', 'W = 0', 'ΔU > 0', '온도 ↑ (일 없이 열만 내부 에너지로)'], ['단열 압축', 'Q = 0', 'W < 0', 'ΔU > 0', '온도 ↑ (일을 받아 뜨거워져요)'], ['단열 팽창', 'Q = 0', 'W > 0', 'ΔU < 0', '온도 ↓ (일을 하느라 내부 에너지가 줄어요)']];
    const cx = PHONE ? [x1, x1 + 80, x1 + 136, x1 + 194] : [x1, x1 + 120, x1 + 210, x1 + 300];
    rows.forEach((r, i) => {
      const yy = PY + 62 + i * (PHONE ? 52 : 40);
      T(cx[0], yy, r[0], 14.5, INK, 'left', 800);
      [r[1], r[2], r[3]].forEach((v, j) => T(cx[j + 1], yy, v, 14.5, '#1d4ed8', 'left', 800));
      T(PHONE ? x1 : x1 + 410, PHONE ? yy + 20 : yy, r[4], 13, MUTED, 'left', 700);
    });
    T(x1, PY + PH - 16, '빠른 변화는 열이 드나들 시간이 없어 Q ≈ 0 (단열)으로 볼 수 있어요.', PHONE ? 13 : 14, '#c2410c', 'left', 800);
  }
  /* 펌프 */
  const pumpCalc = () => { const f = S.pu.f / 100, Qo = f * W_EXT, dU = W_EXT - Qo; return { Win: W_EXT, Qout: Qo, dU, dT: dU / 12.5, f }; };   // 화면에 쓴 식(ΔU / 12.5)과 같게: 50 %이면 정확히 20 K
  function puRun() { const p = S.pu; if (p.run) return; p.u = 0; p.run = true; p.done = false; Sound.click(); updateCtl(); }
  function puReset() { const p = S.pu; p.run = false; p.u = 0; p.done = false; parts.clear(); updateCtl(); }
  function puStep(dt) {
    const p = S.pu; if (!p.run) return;
    p.u += dt / 3.2;
    if (p.u >= 1) { p.u = 1; p.run = false; p.done = true; Sound.success(); updateCtl(); }
  }
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function drawPump(dt) {
    const c = topCard(), p = S.pu, pc = pumpCalc(), e = sm(p.u);
    bgGrad(c);
    const k = PHONE ? 4.0 : 4.4, W = PHONE ? 96 : 120, x0 = c.x + (PHONE ? 22 : 40), yb = c.y + c.h - 74, hmax = PHONE ? 180 : 190;
    // 공기 부피: 처음 V0 → 눌러서 단열처럼 줄어요 (손 위치만 부드럽게)
    const Vad = V0 * Math.pow(T0 / (T0 + W_EXT / CV), 1.5), Viso = V0 * Math.exp(-W_EXT / (NMOL * R * T0));   // 같은 500 J: 단열 20.7 L ~ 등온 20.4 L (열이 빠질수록 조금 더 줄어요)
    const Vn = lerp(V0, lerp(Vad, Viso, pc.f), e), hp = Vn * k;
    const Tn = T0 + pc.dT * e;
    gasSync(20, W, hp); gasStep(dt, W, hp, Tn, hitSpark(x0, yb - hp));
    const cy = gasCyl({ x0, yb, W, hp, hmax, TK: Tn, mode: 'hand', flame: 0 });
    // 열이 빠져나가는 화살표
    const nA = 4; for (let i = 0; i < nA; i++) { const yy = yb - hp + 30 + i * (hp - 36) / nA; if (pc.f > 0 && e > 0.02) { D.arrow(x0 + W + 4, yy, x0 + W + 4 + clamp(pc.f * (PHONE ? 26 : 38), 6, PHONE ? 26 : 38), yy, { color: 'rgba(37,99,235,.8)', width: 2 + pc.f * 4, head: 9 }); D.arrow(x0 - 4, yy, x0 - 4 - clamp(pc.f * 28, 6, 28), yy, { color: 'rgba(37,99,235,.8)', width: 2 + pc.f * 4, head: 9 }); } }
    if (p.run || p.u > 0) D.arrow(x0 + W / 2 + 22, cy.top - 8, x0 + W / 2 + 22, cy.top + 16, { color: '#2563eb', width: 5, head: 11 });
    if (PHONE) T(c.x + 10, yb + 70, '펌프 속 공기 (1 mol)', 13, INK, 'left', 800); else T(x0 + W / 2, yb + 70, '펌프 속 공기 (1 mol로 이상화)', 14, INK, 'center', 800);
    // 노즐 온도계
    const tx = c.x + (PHONE ? 176 : 290);
    D.thermometer(tx, c.y + 46, PHONE ? 150 : 170, clamp(Tn, 290, 350), 290, 350, { ticks: false, color: molColor(Tn + 40) });
    D.label(tx, c.y + (PHONE ? 238 : 258), '노즐 ' + f1(Tn) + ' K', { bg: Tn - T0 > 20 ? RED : '#2563eb', size: 13, pad: 9 });
    T(tx, c.y + (PHONE ? 266 : 286), '(+' + f1(Tn - T0) + ' K)', 13.5, MUTED, 'center', 800);
    // 장부
    const lx = c.x + (PHONE ? 222 : 350), lw = PHONE ? c.w - 222 - 12 : 400;
    T(lx, c.y + (PHONE ? 46 : 34), '같은 압축 일 500 J로 누를 때', PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
    const rows = [['입력한 일 (외부가 한 일)', W_EXT * e, '#2563eb'], ['주위로 빠진 열 Q 방출', pc.Qout * e, '#7c3aed'], ['공기의 내부 에너지 증가 ΔU', pc.dU * e, '#ef4444']];
    rows.forEach((r, i) => { const yy = c.y + (PHONE ? 62 : 54) + i * 52; T(lx, yy + 14, r[0], PHONE ? 13 : 14, INK, 'left', 800); T(lx + lw, yy + 14, fN(r[1]) + ' J', PHONE ? 14 : 15, r[2], 'right', 800); dbar(lx, yy + 22, lw, 14, r[1], W_EXT, r[2]); });
    T(lx, c.y + (PHONE ? 62 : 54) + 3 * 52 + 16, '500 = ' + fN(pc.Qout * e) + ' + ' + fN(pc.dU * e), PHONE ? 13.5 : 15, '#14753f', 'left', 800);
    T(c.x + 12, c.y + 24, '🚲 펌프를 누르면 공기가 뜨거워질까요?', PHONE ? 13 : 14.5, INK, 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    T(x1, PY + 28, '🛠️ 설계: 노즐이 덜 뜨거워지게', 15, INK, 'left', 800);
    T(x1, PY + 58, 'Q = ' + MINUS + fN(pc.Qout) + ' J (방출),  W = ' + MINUS + '500 J (일을 받음)', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(x1, PY + 84, 'ΔU = Q − W = (' + MINUS + fN(pc.Qout) + ') − (' + MINUS + '500) = ' + fN(pc.dU) + ' J', PHONE ? 13.5 : 15, '#14753f', 'left', 800);
    T(x1, PY + 110, 'ΔT = ΔU / ((3/2) n R) = ' + fN(pc.dU) + ' / 12.5 = ' + f1(pc.dT) + ' K', PHONE ? 13.5 : 15, '#c2410c', 'left', 800);
    const ideas = ['빠르게 눌러요 → 열이 빠질 틈이 없어요 (0 ~ 10 %)', '천천히 눌러요 → 열이 주위로 새요 (50 % 이상)', '금속 몸통·방열 핀 → 열이 잘 빠져요 (70 % 이상)', '단열재로 감싸요 → 오히려 뜨거워져요 (0 %)'];
    ideas.forEach((s2, i) => T(x1, PY + 148 + i * (PHONE ? 38 : 24), s2, PHONE ? 13 : 14, MUTED, 'left', 700));
    if (!PHONE) T(x1, PY + 148 + 4 * 24 + 14, '목표: 노즐 온도 상승 20 K 이하 (열이 50 % 이상 빠져야 해요)', 14, '#1d4ed8', 'left', 800);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  (function build() {
    const box = $('#clsBox');
    CARDS.forEach((cd, i) => {
      const w = document.createElement('div'); w.className = 'cls-row';
      const q = document.createElement('div'); q.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:3px'; q.textContent = cd.ic + ' ' + cd.n;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.id = 'sC' + i; sel.setAttribute('aria-label', cd.n + '의 과정');
      CLS_OPT.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.cls[i] = sel.value; sel.classList.remove('ok', 'bad'); updateCtl(); });
      w.append(q, sel); box.appendChild(w);
    });
  })();
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; const lk = n.getAttribute('data-lock'); if (lk && lockedBy(lk)) on = false; const kd = n.getAttribute('data-kind'); if (kd && kd !== S.pv.kind) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const pi = S.pi;
    $$('#piMode button').forEach((b) => { b.classList.toggle('on', b.dataset.pm === pi.mode); b.disabled = pi.run; });
    $('#bPiRun').disabled = pi.run; $('#bPiRun').textContent = pi.mode === 'press' ? (pi.done.press ? '▶ 다시 누르기' : '▶ 500 J 일 해 주기') : (pi.done[pi.mode] ? '▶ 다시 열 주기' : '▶ 열 ' + fN(QD).replace(',', ' ') + ' J 주기');
    $('#nPi').textContent = pi.mode === 'press' ? '피스톤을 눌러 기체에 500 J의 일을 해 줘요 (열은 주지 않아요).' : '열 Q = ' + fN(QD).replace(',', ' ') + ' J을 ' + (pi.mode === 'fix' ? '피스톤을 고정하고' : '피스톤을 자유롭게 두고') + ' 줘요.';
    const v = S.pv;
    $$('#pvKind button').forEach((b) => b.classList.toggle('on', b.dataset.k === v.kind));
    $('#oPvT').textContent = v.T2 + ' K'; setSl('sPvT', v.T2, 200, 500); $('#oPvV').textContent = v.V2 + ' L'; setSl('sPvV', v.V2, 13, 60);
    $('#bPvGrid').textContent = v.grid ? '🔢 격자 세기 끄기' : '🔢 격자 세기 켜기'; $('#bPvGrid').classList.toggle('btn-primary', v.grid);
    const r = S.pr, R2 = PR_RANGE[r.kind];
    $$('#prKind button').forEach((b) => b.classList.toggle('on', b.dataset.k === r.kind));
    const sl = $('#sPr'); sl.min = R2[0]; sl.max = R2[1]; sl.step = R2[2]; $('#lPr').textContent = R2[3]; $('#oPr').textContent = R2[4](r.p[r.kind]); setSl('sPr', r.p[r.kind], R2[0], R2[1]);
    $('#sPr').hidden = false;
    $$('#clsBox select').forEach((s2, i) => { if (s2.value !== S.cls[i]) s2.value = S.cls[i]; });
    const pu = S.pu; $('#oPf').textContent = pu.f + ' %'; setSl('sPf', pu.f, 0, 100); $('#bPuRun').disabled = pu.run; $('#sPf').disabled = pu.run; $('#bPuRun').textContent = pu.done ? '▶ 다시 누르기' : '▶ 500 J로 누르기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#piMode button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.pi.run) return; S.pi.mode = b.dataset.pm; S.pi.u = 0; GM = []; updateCtl(); }));
  $('#bPiRun').addEventListener('click', piRun);
  $('#bPiR').addEventListener('click', () => { Sound.click(); piReset(true); });
  $$('#pvKind button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pv.kind = b.dataset.k; S.pv.u = 0; updateCtl(); }));
  $('#sPvT').addEventListener('input', (e) => { S.pv.T2 = +e.target.value; S.pv.u = 0; updateCtl(); });
  $('#sPvV').addEventListener('input', (e) => { S.pv.V2 = +e.target.value; S.pv.u = 0; updateCtl(); });
  $('#bPvGrid').addEventListener('click', () => { Sound.click(); S.pv.grid = !S.pv.grid; updateCtl(); });
  $$('#prKind button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pr.kind = b.dataset.k; S.pr.seen[b.dataset.k] = true; S.pr.u = 0; updateCtl(); }));
  $('#sPr').addEventListener('input', (e) => { S.pr.p[S.pr.kind] = +e.target.value; S.pr.u = 0; updateCtl(); });
  $('#sPf').addEventListener('input', (e) => { if (S.pu.run) return; S.pu.f = +e.target.value; puReset(); });
  $('#bPuRun').addEventListener('click', puRun);
  $('#bPuR').addEventListener('click', () => { Sound.click(); puReset(); });
  ['iW1', 'iW2', 'iP1', 'iP2', 'iP3', 'iP4', 'iDT'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'piston') { const st = piCalc(S.pi.mode, S.pi.u); L1 = '열 Q'; a = fN(st.Q) + ' J'; L2 = '일 W'; b = fN(st.W) + ' J'; L3 = '내부 에너지 ΔU'; c = fN(Math.round(st.Q) - Math.round(st.W)) + ' J'; }
    else if (m === 'pv') { const pc = pvProc(), hide = showCalc('w1') || showCalc('w2'); L1 = '열 Q'; a = hide ? '?' : fN(pc.Q) + ' J'; L2 = '일 W'; b = hide ? '?' : fN(pc.W) + ' J'; L3 = '내부 에너지 ΔU'; c = fN(pc.dU) + ' J'; }
    else if (m === 'proc') { const pc = prProc(); L1 = '열 Q'; a = fN(pc.Q) + ' J'; L2 = '일 W'; b = fN(pc.W) + ' J'; L3 = 'ΔU'; c = fN(pc.dU) + ' J'; }
    else if (m === 'life') { L1 = '맞게 분류한 카드'; a = CARDS.filter((cd, i) => S.cls[i] === cd.ans).length + ' / 5'; L2 = '제1법칙'; b = 'ΔU = Q − W'; L3 = '단열'; c = 'Q = 0'; }
    else { const pc = pumpCalc(); L1 = '방출한 열'; a = fN(pc.Qout) + ' J'; L2 = '내부 에너지 증가'; b = fN(pc.dU) + ' J'; L3 = '노즐 온도 상승'; c = f1(pc.dT) + ' K'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }

  const levels = [
    {
      title: '열과 일: 열은 어디로 갈까?', short: '열과 일', icon: '🔥', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 기체에 열을 주면 그 열은 어디로 갈까? 온도만 올리고, 때로는 일도 할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> PV = nRT로 기체의 상태(P, V, T)를 나타냈어요. 이번에는 그 기체를 <b>계</b>로 보고, 계에 열을 주거나 일을 해 줄 때 에너지가 어떻게 바뀌는지 봐요. 물리학에서 배운 일 W = Fs와 에너지 보존도 이어져요.</div>' +
        '<p>피스톤 속 기체 1.00 mol(단원자 분자, 300 K)에 <b>같은 열</b>을 줘요. 피스톤을 <b>고정</b>하면 어떻게 될까요? <b>자유롭게</b> 두면요? 아래 <b>에너지 장부</b>에서 열 Q, 일 W, 내부 에너지 변화 ΔU를 비교해요. (W는 계가 외부에 한 일이에요.)</p>',
      features: ['piston'],
      setup() { piReset(true); S.pi.mode = 'fix'; GM = []; setScene('piston'); },
      recap: '기체에 준 열은 내부 에너지(온도)를 올리거나 외부에 일을 하는 데 쓰여요: Q = ΔU + W. 같은 열이라도 피스톤이 움직이면 일을 하느라 온도가 덜 올라요. 일을 받으면(압축) 열 없이도 뜨거워져요.',
      summary: '<ul><li><b>계</b>(기체)와 주위: 계가 흡수한 열을 <b>Q(+)</b>, 계가 외부에 한 일을 <b>W(+)</b>, 내부 에너지 변화를 <b>ΔU</b>라 해요.</li>' +
        '<li>피스톤 <b>고정</b>(W = 0): 열이 모두 내부 에너지로 → 2078 J이면 ΔU = 2078 J, ΔT = 167 K(단원자 이상 기체 1 mol, ΔU = (3/2)nRΔT).</li>' +
        '<li>피스톤 <b>자유</b>(압력 일정): 열의 일부가 추를 들어 올리는 일 W = 831 J로 나가 ΔU = 1247 J, ΔT = 100 K만 올라요.</li>' +
        '<li><b>눌러 압축</b>: 외부가 계에 500 J의 일을 해 주면(W = −500 J) 열 없이도 ΔU = +500 J, 온도가 약 40 K 올라요.</li>' +
        '<li>열을 받아도 온도가 오르지 않을 수도 있어요(등온 팽창에서는 받은 열이 모두 일로 나가요).</li></ul>',
      missions: [
        {
          title: '피스톤을 고정하고 열 주기',
          goal: '<b>🔒 고정</b>에서 <b>▶ 열 2 078 J 주기</b>를 끝까지 실행하고, 온도가 얼마나 오르는지 확인하세요.',
          hint: '피스톤이 움직이지 않으면 기체는 일을 할 수 없어요 (W = 0). 에너지 장부에서 ΔU가 Q와 같아지는 것을 보세요.',
          setup() { piReset(true); S.pi.mode = 'fix'; GM = []; setScene('piston'); },
          check: () => S.pi.done.fix,
          hold: 0.5,
          status: () => mark(S.pi.done.fix) + ' 고정 피스톤' + (S.pi.res.fix ? ' → ΔT = ' + f1(S.pi.res.fix.dT) + ' K' : ''),
          explain: '피스톤이 고정되어 W = 0이므로 열이 모두 내부 에너지로 쓰였어요: ΔU = Q = 2078 J. ΔU = (3/2)nRΔT에서 ΔT = 2078 / 12.5 ≈ <b>167 K</b>예요.',
        },
        {
          title: '피스톤을 자유롭게 하고 같은 열 주기',
          goal: '<b>🔓 자유</b>로 바꾸고 같은 열 <b>2 078 J</b>을 주어, 고정일 때와 온도가 얼마나 다르게 오르는지 비교하세요.',
          hint: '피스톤이 올라가면서 추를 들어 올려요(일). 에너지 장부에서 W 막대가 생기고 ΔU가 줄어드는 것을 보세요.',
          setup() { piFill('fix'); S.pi.mode = 'free'; S.pi.run = false; S.pi.u = 0; S.pi.done.free = false; delete S.pi.res.free; GM = []; setScene('piston'); },
          check: () => S.pi.done.free && S.pi.done.fix,
          hold: 0.5,
          status: () => mark(S.pi.done.free) + ' 자유 피스톤' + (S.pi.res.free ? ' → ΔT = ' + f1(S.pi.res.free.dT) + ' K (고정 ' + f1(S.pi.res.fix.dT) + ' K)' : ''),
          explain: '자유 피스톤은 팽창하며 추를 들어 올려 <b>일 W = 831 J</b>을 해요. 열 2078 J 중 ΔU = 1247 J만 내부 에너지가 되어 ΔT = <b>100 K</b>만 올라요(고정: 167 K). Q = ΔU + W: 2078 = 1247 + 831.',
        },
        {
          type: 'quiz', title: '같은 열인데 온도가 덜 오르는 까닭',
          goal: '같은 열을 줬는데 피스톤이 움직이는 쪽의 온도가 덜 올랐어요. 알맞은 설명은?',
          setup() { setScene('piston'); },
          choices: ['열의 일부가 사라졌어요', '받은 열의 일부가 피스톤을 밀어 올리는 일(W)로 나가서, 내부 에너지(온도) 증가가 작아요', '열을 주면 온도는 항상 같은 만큼 오르는데, 자유 피스톤은 온도계가 늦게 반응해요', '피스톤이 움직이면 열이 더 많이 새어 나가요'],
          answer: 1,
          feedback: ['에너지는 사라지지 않아요(보존). 열 2078 J = ΔU 1247 J + W 831 J로 모두 설명돼요.', '', '열을 받는다고 온도가 항상 똑같이 오르는 것은 아니에요. 고정이면 167 K, 자유면 100 K로 달랐어요.', '이 장면에는 열 손실이 없어요. 차이는 일 W 때문이에요.'],
          explain: '제1법칙 <b>Q = ΔU + W</b>에서 같은 Q라도 W가 있으면 ΔU(= (3/2)nRΔT)가 줄어요. 그래서 자유 피스톤은 온도가 덜 올라요. 열을 주면 반드시 온도가 오르는 것도 아니에요(등온 팽창에서는 받은 열이 전부 일이 돼요).',
        },
      ],
    },
    {
      title: 'P–V 그래프: 넓이가 일', short: 'P–V 그래프', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체가 팽창하며 일을 하는 것을 봤어요. 물리학에서 일은 W = Fs였죠? 피스톤 면적을 A라 하면 F = PA, s = ΔV/A이므로 <b>W = PΔV</b>가 돼요(압력이 일정할 때).</div>' +
        '<p><b>P–V 그래프</b>에서 압력이 일정한 팽창은 <b>아래 직사각형의 넓이</b>가 일이고, 압력이 변하면 <b>곡선 아래 넓이</b>가 일이에요. 한 칸이 <b>100 J</b>인 격자로 일을 읽어 봐요. 팽창은 W &gt; 0, 압축은 W &lt; 0예요.</p>',
      features: ['pv'],
      setup() { S.pv.kind = 'ib'; S.pv.T2 = 400; S.pv.V2 = 50; S.pv.grid = false; S.pv.u = 0; setFlag('w1', false); setFlag('w2', false); setScene('pv'); },
      recap: '압력이 일정하면 W = PΔV(직사각형 넓이), 압력이 변해도 곡선 아래 넓이가 계가 한 일이에요. 팽창이면 W > 0, 압축이면 W < 0이고, ΔU = Q − W는 에너지 보존의 다른 표현이에요.',
      summary: '<ul><li><b>W = PΔV</b>(압력 일정): P–V 그래프에서 아래 직사각형의 넓이. 등압 팽창 24.9 → 33.2 L, P = 1.0 × 10⁵ Pa이면 W = 1.0 × 10⁵ × 8.31 × 10⁻³ = <b>831 J</b>.</li>' +
        '<li>압력이 변하면 <b>곡선 아래 넓이</b>가 W예요. 등온 팽창(300 K) 24.9 → 50 L에서 격자 세기로 W ≈ <b>1.7 × 10³ J</b>(시뮬레이션이 정확히 계산: 1735 J).</li>' +
        '<li>팽창 <b>W &gt; 0</b>(계가 일을 함), 압축 <b>W &lt; 0</b>(계가 일을 받음). 같은 ΔV라도 압력이 크면 일이 커요.</li>' +
        '<li><b>제1법칙 ΔU = Q − W</b> (Q: 계가 흡수한 열, W: 계가 한 일). 열 에너지와 일을 모두 세어도 에너지가 보존된다는 뜻이에요.</li></ul>',
      missions: [
        {
          title: '등압 팽창의 일 읽기', manual: true,
          goal: '<b>등압</b>에서 T₂ = 400 K(24.9 → 33.2 L, P = 1.0 × 10⁵ Pa)로 팽창할 때 계가 한 일 <b>W = PΔV</b>를 그래프에서 읽어 J 단위로 입력하고 ✔ 확인하기를 누르세요.',
          hint: '한 칸 = 100 J. 직사각형의 가로 ΔV = 8.31 L(1.66칸), 세로 P = 1.0 (5칸). 또는 W = 1.0 × 10⁵ Pa × 8.31 × 10⁻³ m³를 계산해요.',
          setup() { S.pv.kind = 'ib'; S.pv.T2 = 400; S.pv.grid = false; S.pv.u = 0; clr('iW1'); setFlag('w2', false); setFlag('w1', true); setScene('pv'); },
          check() {
            if (S.pv.kind !== 'ib' || S.pv.T2 !== 400) return '등압 과정에서 나중 온도 T₂를 400 K로 맞춰 주세요.';
            const v = num('iW1'); if (v == null) return '일 W를 숫자로 입력해 주세요 (J).';
            const ok = Math.abs(v - 831) <= 30; fb([[$('#iW1'), ok]]);
            if (ok) return true;
            if (nearRel(v, 0.831, 0.1)) return '단위를 확인해요. 0.831 kJ는 831 J예요.';
            if (nearRel(v, 8.31, 0.1)) return '한 칸이 100 J이라는 것을 잊지 말아요. 8.3칸은 830 J이에요.';
            return 'W = PΔV = 1.0 × 10⁵ Pa × 8.31 × 10⁻³ m³를 계산해 보세요 (L = 10⁻³ m³).';
          },
          status: () => '입력 ' + ($('#iW1').value.trim() || '—') + ' J',
          explain: '등압에서 W = PΔV = 1.0 × 10⁵ Pa × (33.2 − 24.9) × 10⁻³ m³ = <b>831 J</b>이에요. 그래프에서는 가로 8.31 L, 세로 1.0 × 10⁵ Pa인 직사각형의 넓이(약 8.3칸 × 100 J)예요. 이때 Q = ΔU + W = 1247 + 831 = 2078 J이에요.',
        },
        {
          title: '곡선 아래 넓이로 등온 팽창의 일 읽기', manual: true,
          goal: '<b>등온</b>(300 K)으로 V₂ = 50 L까지 팽창할 때, <b>🔢 격자 세기</b>로 곡선 아래 칸을 세어 계가 한 일 W를 <b>kJ</b> 단위로(소수 첫째 자리) 입력하고 ✔ 확인하기를 누르세요.',
          hint: '초록 칸(완전히 덮임)은 1칸, 주황 칸(일부 덮임)은 반칸으로 보고 (초록 + 주황/2) × 100 J을 계산해요. 약 1.7 kJ이 나와요.',
          setup() { S.pv.kind = 'it'; S.pv.V2 = 50; S.pv.grid = true; S.pv.u = 0; clr('iW2'); setFlag('w1', false); setFlag('w2', true); setScene('pv'); },
          check() {
            if (S.pv.kind !== 'it' || S.pv.V2 !== 50) return '등온 과정에서 나중 부피 V₂를 50 L로 맞춰 주세요.';
            let v = num('iW2'); if (v == null) return '일 W를 숫자로 입력해 주세요 (kJ).';
            if (v > 100) v /= 1000;
            const ok = v >= 1.5 && v <= 1.9; fb([[$('#iW2'), ok]]);
            if (ok) return true;
            if (v < 0.5) return '단위를 확인해요. 칸 수 × 100 J이고, 1000 J = 1 kJ이에요.';
            return '(완전한 칸 + 일부 칸/2) × 100 J을 계산해서 kJ로 바꿔 보세요 (약 17칸).';
          },
          status: () => '입력 ' + ($('#iW2').value.trim() || '—') + ' kJ',
          explain: '곡선 아래 넓이는 약 17칸이고 한 칸이 100 J이므로 W ≈ <b>1.7 × 10³ J</b>(시뮬레이션 계산 1735 J)이에요. 등온에서는 ΔU = 0이므로 Q = W, 받은 열이 모두 일로 나가요.',
        },
        {
          type: 'quiz', title: '압축할 때 일의 부호',
          goal: '기체를 압축할 때 계가 한 일 W의 부호와 이유로 알맞은 것은?',
          setup() { setFlag('w1', false); setFlag('w2', false); S.pv.kind = 'ib'; S.pv.T2 = 300; S.pv.grid = false; S.pv.u = 0; setScene('pv'); },
          choices: ['W > 0: 기체가 일을 하기 때문이에요', 'W < 0: 부피가 줄어(ΔV < 0) 외부가 기체에 일을 해 주므로, 계가 한 일은 음수예요', 'W = 0: 압축할 때는 일이 없어요', 'W < 0: 압력이 줄어서예요'],
          answer: 1,
          feedback: ['팽창일 때 W > 0이에요. 압축은 부피가 줄어 반대예요.', '', '압축하려면 외부가 힘을 가해야 하므로 일이 있어요(부호만 음수).', '부호는 부피 변화 ΔV의 부호로 정해져요(W = PΔV에서 ΔV < 0).'],
          explain: 'W = PΔV에서 압축은 ΔV &lt; 0이라 <b>W &lt; 0</b>(계가 일을 받음)이에요. 같은 ΔV라도 압력 P가 크면 |W|가 커요(직사각형이 높아져서 넓이가 커져요). 압축하면 ΔU = Q − W에서 −W가 + 되어 내부 에너지가 늘어요.',
        },
      ],
    },
    {
      title: '네 가지 과정: 등적·등압·등온·단열', short: '네 가지 과정', icon: '🔀', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> P–V 그래프의 넓이가 일이고 ΔU = Q − W라는 것을 알았어요. 이제 이상 기체의 <b>네 가지 과정</b>을 비교해요: <b>등적</b>(V 일정), <b>등압</b>(P 일정), <b>등온</b>(T 일정), <b>단열</b>(Q = 0).</div>' +
        '<p>이상 기체의 내부 에너지는 <b>온도만의 함수</b>예요: <b>U = (3/2)nRT</b>(단원자 분자). 그래서 등온이면 ΔU = 0이에요. 과정을 골라 슬라이더를 움직이며 Q, W, ΔU, ΔT를 읽고 표를 완성해요.</p>',
      features: ['proc'],
      setup() { S.pr.kind = 'iv'; S.pr.p = { iv: 400, ib: 400, it: 50, ia: -500 }; S.pr.u = 0; setFlag('tab', false); setFlag('dt', false); setScene('proc'); },
      recap: '등적 W = 0 (Q = ΔU), 등압 W = PΔV (Q = ΔU + W), 등온 ΔU = 0 (Q = W), 단열 Q = 0 (ΔU = −W). 내부 에너지는 온도만으로 정해져요. 단열이라도 온도는 변해요(압축하면 올라요).',
      summary: '<ul><li><b>등적</b>(V 일정): W = 0, Q = ΔU = 1247 J (300 → 400 K).</li><li><b>등압</b>(P 일정): W = PΔV = 831 J, ΔU = 1247 J(T 변화만의 함수), Q = 2078 J. 같은 열 2078 J이면 등적은 167 K, 등압은 100 K만 올라요.</li>' +
        '<li><b>등온</b>(T 일정): ΔU = 0, Q = W ≈ 1.7 × 10³ J(넓이).</li><li><b>단열</b>(Q = 0): ΔU = −W. 외부가 500 J의 일을 해 주면 ΔU = +500 J, ΔT = 500 / 12.5 ≈ 40 K(300 → 340 K).</li>' +
        '<li>P–V 그래프에서 단열 곡선은 등온 곡선보다 더 가파르게 내려가요(압축하면 온도가 올라 압력이 더 커져요).</li></ul>',
      missions: [
        {
          title: '네 과정의 표 완성하기', manual: true,
          goal: '아래 표에서 <b>?</b> 칸을 <b>ΔU = Q − W</b>(즉 Q = ΔU + W)로 구해 입력하고 ✔ 확인하기를 누르세요. (등적·등압·등온은 Q, 단열은 ΔU)',
          hint: '등적: W = 0이므로 Q = ΔU. 등압: Q = 1247 + 831. 등온: ΔU = 0이므로 Q = W(≈ 1.7 × 10³ J). 단열: Q = 0이므로 ΔU = −W = −(−500).',
          setup() { S.pr.kind = 'iv'; S.pr.u = 0; clr('iP1', 'iP2', 'iP3', 'iP4'); setFlag('dt', false); setFlag('tab', true); setScene('proc'); },
          check() {
            const xs = ['iP1', 'iP2', 'iP3', 'iP4'].map(num);
            if (xs.some((x) => x == null)) return '네 칸에 모두 숫자를 입력해 주세요 (J).';
            const kj = (x, a) => (x > 0 && x < 20 ? x * 1000 : x);
            const q3 = kj(xs[2]);
            const oks = [nearRel(xs[0], 1246.5, 0.03), nearRel(xs[1], 2077.5, 0.02), nearRel(q3, 1735, 0.08), nearRel(xs[3], 500, 0.03)];
            fb(oks.map((o, i) => [$('#iP' + (i + 1)), o]));
            if (oks.every(Boolean)) return true;
            if (!oks[3] && Math.abs(xs[3] + 500) < 20) return '단열 압축에서 계가 한 일 W = −500 J이므로 ΔU = Q − W = 0 − (−500) = +500 J이에요 (부호 주의).';
            if (!oks[1] && nearRel(xs[1], 831, 0.05)) return '등압의 Q는 ΔU만이 아니라 ΔU + W예요 (1247 + 831).';
            if (!oks[0] && nearRel(xs[0], 831, 0.05)) return '등적에서는 W = 0이라 Q = ΔU = 1247 J이에요.';
            if (!oks[2]) return '등온에서는 ΔU = 0이므로 Q = W예요. 표의 W ≈ 1.7 × 10³ J을 그대로 써요.';
            return '붉은 칸을 ΔU = Q − W로 다시 계산해 보세요.';
          },
          status: () => '입력 ' + ['iP1', 'iP2', 'iP3', 'iP4'].filter((id) => $('#' + id).value.trim()).length + ' / 4',
          explain: '등적 Q = ΔU + 0 = <b>1247 J</b>, 등압 Q = 1247 + 831 = <b>2078 J</b>, 등온 Q = 0 + W ≈ <b>1.7 × 10³ J</b>, 단열 ΔU = Q − W = 0 − (−500) = <b>+500 J</b>이에요. 모든 과정에서 ΔU = Q − W가 성립해요.',
        },
        {
          title: '단열 압축의 온도 상승 계산하기', manual: true,
          goal: '<b>단열</b> 과정에서 <b>계가 한 일 W = −500 J</b>(외부가 500 J의 일을 함)일 때 온도 상승 <b>ΔT</b>(K)를 계산해 입력하고 ✔ 확인하기를 누르세요. (ΔU = (3/2)nRΔT, n = 1.00 mol, R = 8.31)',
          hint: 'Q = 0이므로 ΔU = −W = +500 J. ΔT = ΔU / ((3/2)nR) = 500 / 12.5 예요.',
          setup() { S.pr.kind = 'ia'; S.pr.p.ia = -500; S.pr.u = 0; clr('iDT'); setFlag('tab', false); setFlag('dt', true); setScene('proc'); },
          check() {
            if (S.pr.kind !== 'ia') return '단열 과정으로 계산하는 문제예요.';
            const v = num('iDT'); if (v == null) return '온도 상승을 숫자로 입력해 주세요 (K).';
            const ok = Math.abs(v - 40.1) <= 2; fb([[$('#iDT'), ok]]);
            if (ok) return true;
            if (nearRel(v, 500 / 8.31, 0.05)) return '내부 에너지는 (3/2)nRΔT이에요. 3/2을 곱한 12.5로 나눠야 해요.';
            if (Math.abs(v + 40) <= 2) return '압축하면 온도가 올라가요. 부호를 확인해요.';
            return 'ΔT = 500 / (1.5 × 1.00 × 8.31)을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#iDT').value.trim() || '—') + ' K',
          explain: 'Q = 0이므로 ΔU = −W = +500 J. ΔU = (3/2)nRΔT에서 ΔT = 500 / 12.465 ≈ <b>40 K</b>(300 → 340 K)예요. 열을 주지 않아도 일을 받으면 뜨거워져요.',
        },
        {
          type: 'quiz', title: '내부 에너지가 변하지 않는 과정',
          goal: '이상 기체에서 <b>ΔU = 0</b>인 과정은 어느 것일까요?',
          setup() { setFlag('tab', false); setFlag('dt', false); S.pr.kind = 'it'; S.pr.u = 0; setScene('proc'); },
          choices: ['단열 과정: Q = 0이라 온도가 변하지 않기 때문에', '등온 과정: 온도가 일정하므로 U = (3/2)nRT도 일정해요', '등적 과정: W = 0이라서', '등압 과정: 압력이 일정하므로'],
          answer: 1,
          feedback: ['단열 과정은 Q = 0이지만 ΔU = −W라서 일을 하면 내부 에너지가 변해요(온도도 변해요).', '', '등적에서는 W = 0이지만 열을 받으면 ΔU = Q ≠ 0이에요.', '등압에서는 온도가 변하므로 ΔU도 변해요.'],
          explain: '이상 기체의 U = (3/2)nRT는 <b>온도만의 함수</b>라서 <b>등온 과정에서 ΔU = 0</b>이에요(그래서 Q = W). 단열 과정은 Q = 0일 뿐이고 일을 하면 온도가 변해요(압축하면 올라가요).',
        },
      ],
    },
    {
      title: '생활 속 예: 제1법칙 찾기', short: '생활 속 예', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 네 가지 과정의 Q, W, ΔU를 구했어요. 이제 일상에서 제1법칙이 어디에 숨어 있는지 찾아요. <b>빠른 압축·팽창</b>은 열이 드나들 시간이 없어 Q ≈ 0(단열)으로 볼 수 있어요.</div>' +
        '<p>다섯 가지 현상을 <b>등적 가열, 단열 압축, 단열 팽창</b>으로 분류하고, 마지막으로 <b>자전거 펌프</b>의 노즐이 덜 뜨거워지도록 설계해요. 정답은 하나가 아니에요.</p>',
      features: ['life', 'pump'],
      setup() { S.cls = ['', '', '', '', '']; S.clsOk = false; $$('#clsBox select').forEach((s2) => { s2.classList.remove('ok', 'bad'); }); puReset(); S.pu.f = 0; setFlag('cls', false); setScene('life'); },
      recap: '제1법칙 ΔU = Q − W는 에너지 보존의 다른 표현이에요. 단열 압축은 일을 받아 뜨거워지고, 단열 팽창은 일을 하며 차가워져요. 열이 주위로 빠지면 압축해도 덜 뜨거워져요.',
      summary: '<ul><li><b>단열 압축</b>(Q = 0, W &lt; 0, ΔU &gt; 0): 자전거 펌프를 빨리 누르면 공기가 뜨거워져요. 디젤 엔진은 공기를 빠르게 압축해 연료를 점화해요.</li>' +
        '<li><b>단열 팽창</b>(Q = 0, W &gt; 0, ΔU &lt; 0): 스프레이 캔이 차가워지고, 상승 기류의 공기가 팽창해 식으며 구름이 생겨요.</li>' +
        '<li><b>등적 가열</b>(W = 0, Q = ΔU): 압력솥은 부피가 일정해 열이 모두 내부 에너지가 되어 압력이 올라가요.</li>' +
        '<li>펌프 설계: 같은 일 500 J로 눌러도 열이 주위로 50 % 이상 빠지면 ΔT = 500(1 − f)/12.5 ≤ 20 K. 천천히 누르거나 금속 몸통·방열 핀으로 열이 빠지게 해요.</li>' +
        '<li>제1법칙은 <b>에너지 보존 법칙</b>이에요. 열과 일을 모두 에너지로 세면 총량이 보존돼요.</li></ul>',
      missions: [
        {
          title: '생활 속 다섯 가지 분류하기', manual: true,
          goal: '다섯 가지 현상을 <b>등적 가열, 단열 압축, 단열 팽창</b> 중 알맞은 과정으로 분류하고 ✔ 확인하기를 누르세요.',
          hint: '빠르게 누르거나 부풀리는 것은 열이 드나들 시간이 없는 단열이에요. 누르면(압축) 일을 받아 온도 ↑, 팽창하면 일을 하며 온도 ↓. 부피가 일정한 용기를 가열하는 것은 등적이에요.',
          setup() { S.cls = ['', '', '', '', '']; S.clsOk = false; updateCtl(); setFlag('cls', true); setScene('life'); },
          check() {
            if (S.cls.some((c) => !c)) return '다섯 가지를 모두 골라 주세요.';
            const oks = CARDS.map((cd, i) => S.cls[i] === cd.ans);
            CARDS.forEach((cd, i) => { const el = $('#sC' + i); if (oks[i]) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
            if (oks.every(Boolean)) { S.clsOk = true; return true; }
            const i = oks.findIndex((o) => !o), cd = CARDS[i];
            return '"' + cd.n + '": ' + (cd.ans === 'iv' ? '부피가 일정한 용기를 가열해요 (W = 0).' : cd.ans === 'ac' ? '빠르게 압축해서 일을 받아요 (온도가 올라요).' : '빠르게 팽창하며 일을 해요 (온도가 내려가요).');
          },
          status: () => '분류 ' + S.cls.filter((c) => c).length + ' / 5, 맞은 것 ' + CARDS.filter((cd, i) => S.cls[i] === cd.ans).length + '개',
          explain: '자전거 펌프·디젤 엔진은 <b>단열 압축</b>(일을 받아 뜨거워짐), 스프레이 캔·구름은 <b>단열 팽창</b>(일을 하며 차가워짐), 압력솥은 <b>등적 가열</b>(W = 0이라 열이 모두 내부 에너지가 돼 압력이 올라감)이에요.',
        },
        {
          title: '펌프 노즐이 덜 뜨거워지게 설계하기',
          goal: '같은 압축 일 500 J로 눌렀을 때 <b>열이 주위로 빠지는 정도</b>를 골라 노즐 온도 상승이 <b>20 K 이하</b>가 되게 하고 ▶ 500 J로 누르기로 확인하세요.',
          hint: 'ΔT = 500 × (1 − f) / 12.5 (f는 열이 빠지는 비율). 20 K 이하가 되려면 f를 50 % 이상으로 해야 해요. 금속 몸통·방열 핀·천천히 누르기를 떠올려 봐요.',
          setup() { puReset(); S.pu.f = 0; setFlag('cls', false); setScene('pump'); },
          check: () => S.pu.done && pumpCalc().dT <= 20,
          hold: 0.6,
          status() { const pc = pumpCalc(); return mark(S.pu.done) + ' 실행 &nbsp; ' + mark(pc.dT <= 20) + ' 노즐 온도 상승 ' + f1(pc.dT) + ' K (목표 20 K 이하)'; },
          explain: '열이 많이 빠질수록(Q 방출 ↑) ΔU = Q − W = −Q방출 + 500이 작아져 덜 뜨거워져요. f = 0 %(단열)이면 ΔT = 40 K, f = 60 %이면 16 K, f = 100 %(등온에 가까움)이면 0 K이에요. 그래서 금속 몸통과 방열 핀으로 열을 빼거나 천천히 눌러 열이 새게 해요.',
        },
        {
          type: 'quiz', title: '제1법칙은 왜 에너지 보존일까?',
          goal: '열역학 제1법칙 ΔU = Q − W를 올바르게 해석한 것은?',
          setup() { setFlag('cls', false); setScene('pump'); },
          choices: ['열은 일로 모두 바뀌고 내부 에너지는 변하지 않아요', '계가 받은 열은 내부 에너지 증가와 계가 외부에 한 일로 나뉘며, 에너지의 총량은 변하지 않아요', '일을 하면 에너지가 새로 만들어져요', '열을 주지 않으면 내부 에너지는 절대 변하지 않아요'],
          answer: 1,
          feedback: ['열이 모두 일로 바뀌는 것은 등온 과정뿐이고, 일반적으로는 ΔU도 변해요.', '', '에너지는 새로 생기거나 사라지지 않아요. 한 형태에서 다른 형태로 바뀔 뿐이에요.', '열을 주지 않아도(Q = 0) 일을 받으면 ΔU = −W만큼 변해요 (펌프 노즐이 뜨거워지는 까닭).'],
          explain: 'Q = ΔU + W는 <b>들어온 열 = 내부 에너지 증가 + 외부에 한 일</b>이에요. 열과 일도 에너지의 한 형태로 세면 총량이 보존되므로 제1법칙은 <b>에너지 보존 법칙의 다른 표현</b>이에요. (다음 차시: 이렇게 열을 일로 바꾸는 열기관!)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-first-law', mount: '#game', badge: '열역학 박사', homeHref: '../../index.html#hm',
    featureLabels: { piston: '🔥 피스톤 · 열과 일', pv: '📈 P–V 그래프 · 넓이 = 일', proc: '🔀 등적·등압·등온·단열 비교', life: '🌍 생활 속 제1법칙 분류', pump: '🚲 자전거 펌프 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('piston');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    piStep(dt); puStep(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'piston': drawPiston(dt); break;
      case 'pv': drawPVScene(dt); break;
      case 'proc': drawProc(dt); break;
      case 'life': drawLife(dt); break;
      default: drawPump(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, procCalc, piCalc, piRun, piFill, pumpCalc, puRun, cellCover, pvProc, prProc, CARDS, V0, CV, QD,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { piStep(0.02); puStep(0.02); } },
  };
})();
