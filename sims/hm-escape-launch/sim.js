/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 탈출 속도와 로켓 (7차시)
   성취기준 [12역학01-05] 역학적 에너지 보존을 이용하여 행성에 따라 탈출 속도가 다름을 이해하고, 운동량 보존을 이용하여 우주선이 발사되어 궤도에 오르는 원리를 설명할 수 있다.
   ① 탐구: 탈출 조건 (E_p = −GMm/r, 총 에너지 E = ½mv² − GMm/r ≥ 0 이면 탈출)
   ② 비교: 행성 비교 (v_탈출 = √(2GM/R), 대기 분자의 열운동 속력과 비교 — 정성적)
   ③ 설명: 로켓 원리 (작용 반작용·운동량 보존, 정성적: 로켓 방정식 없음)
   ④ 적용: 궤도 진입 (수직 상승 → 수평 가속 → 자유 낙하하는 원 궤도, 다단 로켓 정성 비교)
   G = 6.67 × 10⁻¹¹ N·m²/kg², 지구 M = 5.97 × 10²⁴ kg, R = 6.37 × 10⁶ m. 타원 궤도·호만 전이·로켓 방정식·공기 저항 정량은 다루지 않아요.
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
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };
  const BG = '#eef2fa';

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
  function card(x, y, w, h) { D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }
  const topCard = () => ({ x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 });
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  /* 가로 막대 (값 0..max, 칸 안에서만 그려요) */
  function hbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * w;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, f, h); ctx.restore(); }
  }
  /* 0을 가운데 두는 막대 (lo..hi 범위) */
  function dbar(x, y, w, h, val, lo, hi, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const z = x + w * (-lo) / (hi - lo), v = clamp(val, lo, hi), e = x + w * (v - lo) / (hi - lo);
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(Math.min(z, e), y, Math.abs(e - z), h); ctx.restore();
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z, y - 3); ctx.lineTo(z, y + h + 3); ctx.stroke();
  }

  /* ================= 상수·물리 ================= */
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const GN = 6.67e-11;
  const ME = 5.97e24, RE = 6.37e6, GM = GN * ME;         // GM = 3.98 × 10¹⁴ m³/s²
  const G0 = GM / (RE * RE);                              // 지표 중력 가속도 9.81 m/s²
  const VESC_E = Math.sqrt(2 * GM / RE) / 1000;           // 11.18 km/s
  const EK_MAX = 80, EP_MIN = -70;                        // MJ/kg 눈금 범위
  const ep = (r) => -GM / r / 1e6;                        // 1 kg당 위치 에너지 (MJ/kg)
  const etot = (v0) => (0.5 * v0 * v0 * 1e6) / 1e6 + ep(RE);        // v0: km/s → 0.5 v² (MJ/kg)
  function hmaxOf(v0) {   // 연직으로 v0(km/s) 발사했을 때 최고 고도 (km), 탈출하면 Infinity
    const k = v0 * v0 * 1e6 / (2 * GM), inv = 1 / RE - k;
    if (inv <= 1e-18) return Infinity;
    return (1 / inv - RE) / 1000;
  }
  const BODIES = [
    { n: '달', M: 7.35e22, R: 1.737e6, Tk: 390, col: '#c9ced9', can: true },
    { n: '타이탄', M: 1.345e23, R: 2.575e6, Tk: 94, col: '#e0a24a', can: true },
    { n: '수성', M: 3.30e23, R: 2.43e6, Tk: 700, col: '#a99b8c', can: false, note: '수성은 낮에 약 700 K까지 달아오르고 태양풍도 세서 대기가 거의 없어요. 여기서는 탈출 속도만 비교해요.' },
    { n: '화성', M: 6.42e23, R: 3.39e6, Tk: 210, col: '#d9694a', can: true },
    { n: '금성', M: 4.87e24, R: 6.05e6, Tk: 735, col: '#e8c07a', can: true },
    { n: '지구', M: 5.97e24, R: 6.37e6, Tk: 300, col: '#3b82f6', can: true },
    { n: '목성', M: 1.898e27, R: 7.15e7, Tk: 165, col: '#d9a066', can: true },
    { n: '태양', M: 1.989e30, R: 6.957e8, Tk: 5800, col: '#ffb703', can: false, note: '태양은 기체 덩어리라 대기 분자 모형은 없어요. 탈출 속도(618 km/s)만 비교해요.' },
  ];
  const vescOf = (b) => Math.sqrt(2 * GN * b.M / b.R) / 1000;   // km/s
  BODIES.forEach((b) => { b.vesc = vescOf(b); });
  const GASES = [
    { n: 'H₂', c: '#38bdf8', k: 111.2, r: 5.5 },    // v_rms = k·√T  (m/s)
    { n: 'N₂', c: '#22c55e', k: 29.84, r: 7 },
    { n: 'CO₂', c: '#f97316', k: 23.81, r: 8.5 },
  ];
  const vrmsOf = (g, Tk) => g.k * Math.sqrt(Tk) / 1000;      // km/s
  const stays = (b, g) => b.vesc >= 6 * vrmsOf(g, b.Tk);      // v_탈출 ≥ 6 v_rms 이면 오래 남아요
  const SIX = 6;
  const PBODIES = [5, 0, 3, 6, 1];                              // 예측할 천체: 지구, 달, 화성, 목성, 타이탄
  const CALCB = [2, 4, 3, 6];                                   // 계산 입력: 수성, 금성, 화성, 목성

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'well', clock: 0, fade: 0,
    w: { v0: 8, st: 'ready', r: RE, v: 0, trail: [], trT: 0, apex: 0, msg: '', rst: 0, rec: [], esc: false, last: 0, burst: 0, retSeen: false, escSeen: false, tt: 0 },
    pl: { i: 5, pred: [0, 0, 0], checked: {}, open: {}, lid: 1, mol: [], gone: [0, 0, 0], respawn: 0, msg: '', msgT: 0, bi: -1 },
    as: { m: 5, v: 10, st: 'ready', t: 0, x: 0, bx: 0, thrown: [], msg: '' },
    rk: { env: 'space', u: 3, f: 3, firing: false, vel: 0, t: 0, y: 0, seenU: { lo: false, hi: false }, seenF: { lo: false, hi: false }, lift: false, msg: '', sc: 0, burn: 0 },
    ln: { path: 'orbit', dir: 'E', p: 0, playing: false, orb: 0, done: false, played: 0 },
    sg: { n: 1, s1: 50, s2: 30, st: 'ready', t: 0, hist: [], v: 0, sidx: 0, done: false, ok: false, tried: {}, fly: 0, drops: [] },
    ordC: [3, 1, 0, 4, 2], ordBadC: {},
    flags: { pred: false, calc: false, order: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const eff = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['well', 'planet', 'astro', 'rocket', 'launch', 'stage'];
  const ALLOWED = [['well'], ['planet'], ['astro', 'rocket'], ['launch', 'stage']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    if (mode === 'planet') plInit();
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ---------- 공통 그림: 사람, 로켓 ---------- */
  function person(x, yFeet, h, color, helmet) {
    const w = h * 0.34;
    ctx.save(); ctx.translate(x, yFeet);
    ctx.fillStyle = '#3b4a68'; D.roundRect(-w * 0.45, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill(); D.roundRect(w * 0.1, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill();
    ctx.fillStyle = color; D.roundRect(-w * 0.55, -h * 0.82, w * 1.1, h * 0.46, w * 0.3); ctx.fill();
    D.sphere(0, -h * 0.9, h * 0.11, helmet ? '#e8f1ff' : '#ffd9b3', { gloss: !!helmet, outline: '#9db0cf', outlineWidth: 1.2 });
    if (helmet) { ctx.fillStyle = 'rgba(40,70,140,.55)'; ctx.beginPath(); ctx.ellipse(w * 0.03, -h * 0.9, h * 0.065, h * 0.055, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  /* 로켓: 몸통 길이 약 46·s, ang = 0이면 위쪽, flame 0..1 */
  function rocket(x, y, ang, s, flame, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); ctx.scale(s, s);
    if (flame > 0.02) {
      const fl = (22 + 30 * flame) * (1 + Math.sin((t || 0) * 40) * 0.08);
      D.glow(0, 28 + fl * 0.4, 30 * flame + 10, '#ffa733', 0.45);
      const g = ctx.createLinearGradient(0, 22, 0, 22 + fl); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.4, '#ffa733'); g.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-8, 22); ctx.quadraticCurveTo(0, 22 + fl * 1.15, 8, 22); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-22, 28); ctx.lineTo(-8, 22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(22, 28); ctx.lineTo(8, 22); ctx.closePath(); ctx.fill();
    const g2 = ctx.createLinearGradient(-14, 0, 14, 0); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.55, '#e6ecf7'); g2.addColorStop(1, '#aebbd3');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(16, -18, 14, 4, 14, 22); ctx.lineTo(-14, 22); ctx.bezierCurveTo(-14, 4, -16, -18, 0, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8fa0bd'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(8, -24, 11, -18, 12, -14); ctx.lineTo(-12, -14); ctx.bezierCurveTo(-11, -18, -8, -24, 0, -30); ctx.closePath(); ctx.fill();
    D.sphere(0, -2, 6, '#7cc4ff', { gloss: true, outline: '#516079', outlineWidth: 1.2 });
    ctx.restore();
  }

  /* ================= ① 탈출 조건 ================= */
  const LNMAX = Math.log(100);
  const XLN = (r) => clamp(Math.log(Math.max(r, RE) / RE) / LNMAX, 0, 1);       // r = R..100R → 0..1 (로그 눈금)
  const TICKS = [1, 2, 5, 10, 20, 50, 100];
  function wReady() {
    const w = S.w; w.st = 'ready'; w.r = RE; w.v = w.v0 * 1000; w.trail = []; w.apex = 0; w.msg = ''; w.esc = false; w.rst = 0; w.last = 0; w.tt = 0;
  }
  function wLaunch() {
    const w = S.w; if (w.st === 'run') return;
    wReady(); w.st = 'run'; w.v = w.v0 * 1000; Sound.click(); updateCtl();
  }
  function wRecord(v0) {
    const h = hmaxOf(v0), w = S.w;
    if (!isFinite(h)) return;
    if (w.rec.some((q) => Math.abs(q.v0 - v0) < 0.35)) return;
    w.rec.push({ v0, h }); if (w.rec.length > 6) w.rec.shift();
  }
  function wStep(dt) {
    const w = S.w;
    if (w.st === 'end') { w.rst -= dt; if (w.rst <= 0) { wReady(); updateCtl(); } return; }
    if (w.st !== 'run') return;
    const lnr = Math.log(w.r / RE), rate = 0.42 + 0.5 * clamp(lnr / 2, 0, 1);
    const vc = Math.sqrt(GM / w.r);
    let total = dt * rate * w.r / Math.max(Math.abs(w.v), 0.3 * vc), guard = 0;
    while (total > 1e-9 && guard++ < 2500) {
      const h = Math.min(total, 0.01 * Math.sqrt(w.r * w.r * w.r / GM));
      const a0 = -GM / (w.r * w.r), pv = w.v;
      w.r += w.v * h + 0.5 * a0 * h * h;
      const a1 = -GM / (w.r * w.r); w.v += 0.5 * (a0 + a1) * h; total -= h;
      if (pv > 0 && w.v <= 0 && !w.apex) {
        w.apex = w.r;
        if (etot(w.v0) < 0) { wRecord(w.v0); if (w.v0 >= 11.0) w.retSeen = true; w.msg = '최고점 도달! 총 에너지가 음수라서 여기서 멈추고 되돌아가요'; Sound.click(); }
      }
      if (w.r <= RE && w.v < 0) { w.r = RE; w.st = 'end'; w.rst = 2.4; w.msg = '지표로 되돌아왔어요 (최고 고도 ' + sci(hmaxOf(w.v0), 1) + ' km)'; w.burst = 1; break; }
      if (w.r >= 100 * RE) {
        w.r = 100 * RE;
        if (etot(w.v0) >= 0) { w.st = 'end'; w.rst = 3.2; w.esc = true; w.escSeen = w.escSeen || (w.v0 >= 11.2 && w.v0 <= 11.3); w.msg = '탈출! 총 에너지가 0 이상이라 다시 돌아오지 않아요'; w.burst = 2; }
        else { w.st = 'end'; w.rst = 2.4; w.msg = '아주 멀리까지 갔다가 되돌아와요'; }
        break;
      }
    }
    w.trT -= dt; if (w.trT <= 0) { w.trT = 0.03; w.trail.push(w.r); if (w.trail.length > 700) w.trail.shift(); }
  }
  function drawWell(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), w = S.w, E = etot(w.v0), lw = PHONE ? 150 : 262;
    // ----- 왼쪽: 로켓이 나는 모습 (로그 눈금)
    ctx.save(); D.roundRect(c.x, c.y, lw, c.h, 12); ctx.clip();
    D.space(c.x, c.y, lw, c.h, S.clock, { stars: 40 });
    const gAtm = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); gAtm.addColorStop(0, 'rgba(60,140,255,0)'); gAtm.addColorStop(0.7, 'rgba(60,140,255,.12)'); gAtm.addColorStop(1, 'rgba(110,190,255,.55)');
    ctx.fillStyle = gAtm; ctx.fillRect(c.x, c.y, lw, c.h);
    const yb = c.y + c.h - 46, yt = c.y + 44, ax = c.x + (PHONE ? 44 : 40), sx = c.x + lw * (PHONE ? 0.68 : 0.6);
    const Y = (r) => yb - XLN(r) * (yb - yt);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(ax, yb); ctx.lineTo(ax, yt); ctx.stroke(); ctx.setLineDash([]);
    TICKS.forEach((k) => { const yy = Y(k * RE); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(ax - 4, yy); ctx.lineTo(ax + 4, yy); ctx.stroke(); T(ax - 8, yy + 5, k + 'R', 13, '#dbe7ff', 'right', 800); });
    // 달
    const ym = Y(60 * RE); D.sphere(sx + (PHONE ? 12 : 66), ym, 7, '#cfd3dc', { gloss: false }); T(sx + (PHONE ? 12 : 66), ym - 12, '달 (60R)', 13, '#e8eefc', 'center', 800);
    // 지구 (아래 곡면)
    const eg = ctx.createLinearGradient(0, yb, 0, c.y + c.h); eg.addColorStop(0, '#5aa7ff'); eg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(c.x + lw * 0.55, yb + 150, lw * 1.1, 150 + 0, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,170,100,.85)'; ctx.beginPath(); ctx.ellipse(c.x + lw * 0.3, yb + 24, 26, 9, 0.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(c.x + lw * 0.85, yb + 28, 20, 7, -0.1, 0, TAU); ctx.fill();
    // 자취
    if (w.trail.length > 1) { ctx.strokeStyle = 'rgba(255,200,90,.85)'; ctx.lineWidth = 3; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(sx, Y(w.trail[0])); w.trail.forEach((r) => ctx.lineTo(sx, Y(r))); ctx.stroke(); ctx.setLineDash([]); }
    if (w.apex) { const ya = Y(w.apex); D.dashedLine(ax, ya, c.x + lw - 6, ya, { color: '#ffe58a', width: 1.5, dash: [4, 4] }); D.label(sx + (PHONE ? 4 : 0), ya - 14, '최고점 ' + sci((w.apex - RE) / 1000, 1) + ' km', { bg: 'rgba(30,41,59,.88)', size: 13, pad: 6 }); }
    // 우주선
    const sy = Y(w.r);
    if (w.st === 'run') { const fl = w.apex ? 0 : 0; rocket(sx, sy - 18, w.v >= 0 ? 0 : Math.PI, 0.7, fl, S.clock); }
    else if (w.st === 'ready') { rocket(sx, yb - 17, 0, 0.7, 0, S.clock); { D.ring(sx, yb - 17, 24, S.clock, { color: '#ffd447', width: 2.5 }); } }
    else if (w.st === 'end' && w.esc) { rocket(sx, c.y + 30, 0, 0.7, 0, S.clock); }
    if (w.burst > 0) { parts.burst(sx, w.esc ? c.y + 40 : yb - 10, { count: w.burst === 2 ? 34 : 18, speed: 130, size: 3.2, colors: ['#ffd447', '#fff', '#ff9f43'], gravity: 40, life: 0.9 }); w.burst = 0; }
    parts.update(dt); parts.draw(ctx);
    T(c.x + 10, c.y + 24, PHONE ? '연직 발사' : '지구에서 연직 위로 발사', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    T(c.x + 10, c.y + c.h - 8, '고도 눈금: 로그', 13, '#dbe7ff', 'left', 700, { stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
    ctx.restore();
    // ----- 오른쪽: 에너지 그래프
    const gx = c.x + lw + 8, gw = c.w - lw - 8, g = { x: gx, y: c.y, w: gw, h: c.h };
    card(g.x, g.y, g.w, g.h);
    const ml = PHONE ? 38 : 46, mr = 14, mt = 38, mb = 34, ix = g.x + ml, iy = g.y + mt, iw = g.w - ml - mr, ih = g.h - mt - mb;
    const EY = (e) => iy + ih - ih * (e - (-80)) / (100);       // −80 .. +20 MJ/kg
    const GX = (xv) => ix + iw * xv;
    for (let e = -80; e <= 20; e += 20) {
      const z = e === 0; ctx.strokeStyle = z ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, EY(e)); ctx.lineTo(ix + iw, EY(e)); ctx.stroke();
      T(ix - 6, EY(e) + 5, (e < 0 ? MINUS + Math.abs(e) : String(e)), 13, '#3a465c', 'right', 800);
    }
    TICKS.forEach((k) => { const xv = Math.log(k) / LNMAX; ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(GX(xv), iy); ctx.lineTo(GX(xv), iy + ih); ctx.stroke(); T(GX(xv), iy + ih + 17, k + 'R', 13, '#3a465c', 'center', 800); });
    T(g.x + 10, g.y + 22, PHONE ? '1 kg당 에너지 (MJ/kg)' : '1 kg당 에너지 E (MJ/kg) — 거리 r (R = 지구 반지름)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy - 6, iw, ih + 12); ctx.clip();
    // 위치 에너지 곡선
    ctx.strokeStyle = BLUE; ctx.lineWidth = 3.5; ctx.beginPath();
    for (let i = 0; i <= 140; i++) { const xv = i / 140, r = RE * Math.exp(xv * LNMAX); i ? ctx.lineTo(GX(xv), EY(ep(r))) : ctx.moveTo(GX(xv), EY(ep(r))); } ctx.stroke();
    // 총 에너지선
    const Ey = EY(E), turn = E < 0 ? XLN(-GM / (E * 1e6)) : 1;
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(GX(0), Ey); ctx.lineTo(GX(turn), Ey); ctx.stroke(); ctx.setLineDash([]);
    if (E >= 0) { D.arrow(GX(0.82), Ey, GX(1) - 2, Ey, { color: ORANGE, width: 3, head: 9 }); }
    // 운동 에너지 (곡선과 총 에너지선 사이)
    const rr = clamp(w.r, RE, 100 * RE), px = GX(XLN(rr)), py = EY(ep(rr));
    if (w.st === 'run' || w.st === 'ready' || w.st === 'end') {
      const kin = E - ep(rr);
      if (kin > 0.05) { ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, Ey); ctx.stroke(); ctx.lineCap = 'butt'; }
    }
    if (E < 0) { const tx = GX(turn); ctx.fillStyle = '#fff'; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, Ey - 8); ctx.lineTo(tx + 8, Ey); ctx.lineTo(tx, Ey + 8); ctx.lineTo(tx - 8, Ey); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    D.sphere(px, py, 7, w.st === 'ready' ? '#94a3b8' : '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 1.6 });
    ctx.restore();
    if (E < 0) D.label(clamp(GX(turn), g.x + 70, g.x + g.w - 70), Ey - 18, '최고점: E_p = E합', { bg: 'rgba(245,158,11,.95)', size: 13, pad: 6 });
    else D.label(g.x + g.w - 86, Ey - 18, 'E합 ≥ 0: 끝없이 멀어져요', { bg: 'rgba(245,158,11,.95)', size: 13, pad: 6 });
    // 범례 (곡선 설명)
    const lg = PHONE ? { x: ix + 6, y: iy + ih - 60 } : { x: ix + 12, y: iy + ih - 62 };
    ctx.fillStyle = BLUE; ctx.fillRect(lg.x, lg.y, 16, 4); T(lg.x + 22, lg.y + 5, 'E_p = −GM/r', 13, '#1d4ed8', 'left', 800);
    ctx.fillStyle = ORANGE; ctx.fillRect(lg.x, lg.y + 20, 16, 4); T(lg.x + 22, lg.y + 25, 'E합', 13, '#b45309', 'left', 800);
    ctx.fillStyle = GREEN; ctx.fillRect(lg.x, lg.y + 40, 16, 4); T(lg.x + 22, lg.y + 45, 'E_k (합 − E_p)', 13, '#14753f', 'left', 800);
    if (w.msg) D.label(g.x + g.w / 2, g.y + g.h - 52 < iy + 14 ? iy + 14 : iy + 16, w.msg, { bg: w.esc ? 'rgba(20,160,88,.95)' : 'rgba(30,41,59,.9)', size: 13, pad: 8 });
    // ----- 아래 패널
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, r = clamp(w.r, RE, 100 * RE), vNow = w.st === 'ready' ? w.v0 * 1000 : Math.abs(w.v);
    const EkNow = 0.5 * vNow * vNow / 1e6, EpNow = ep(r), EtNow = E;
    T(x0, PY + 26, '⚡ 역학적 에너지 보존: ½mv² − GMm/r = 일정  (1 kg당, MJ/kg)', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    const bw = PHONE ? PW - 150 : 250, bx = x0 + (PHONE ? 62 : 70), by = PY + 40, rowH = 28;
    [['E_k', EkNow, GREEN], ['E_p', EpNow, BLUE], ['E합', EtNow, ORANGE]].forEach((q, i) => {
      T(x0, by + i * rowH + 15, q[0], 14, '#26324a', 'left', 800);
      dbar(bx, by + i * rowH + 4, bw, 14, q[1], EP_MIN, EK_MAX, q[2]);
      T(bx + bw + 8, by + i * rowH + 16, fx(q[1], 1), 14, '#26324a', 'left', 800);
    });
    if (!PHONE) {
      // mgh 비교
      const ty = by + 3 * rowH + 20;
      T(x0, ty, '낮은 곳에서는 ΔE_p ≈ mgh  (1 kg당, 위로 올라갈 때 늘어나는 E_p)', 14, '#26324a', 'left', 800);
      const cw = [60, 150, 130, 80];
      [['h', 'GM/R − GM/(R+h)', 'g h (g = 9.81)', '차이']].forEach((row) => { let xx = x0; row.forEach((s, i) => { T(xx, ty + 24, s, 13, '#5a6679', 'left', 800); xx += cw[i]; }); });
      [10, 100, 1000].forEach((hk, i) => {
        const ex = GM * (1 / RE - 1 / (RE + hk * 1000)), ap = G0 * hk * 1000, df = (ap - ex) / ex * 100;
        let xx = x0; [hk + ' km', (ex / 1e6).toFixed(3) + ' MJ/kg', (ap / 1e6).toFixed(3) + ' MJ/kg', df.toFixed(1) + ' %'].forEach((s, k) => { T(xx, ty + 48 + i * 22, s, 13.5, k === 3 ? '#c2410c' : '#26324a', 'left', 800); xx += cw[k]; });
      });
    }
    // 기록 표
    if (PHONE) {
      const ty = by + 3 * rowH + 18, h1 = 100e3, ex = GM * (1 / RE - 1 / (RE + h1)), ap = G0 * h1;
      T(x0, ty, '낮은 곳에서는 ΔE_p ≈ mgh (h = 100 km)', 13.5, '#26324a', 'left', 800);
      T(x0, ty + 22, (ex / 1e6).toFixed(3) + ' ≈ ' + (ap / 1e6).toFixed(3) + ' MJ/kg (차이 ' + ((ap - ex) / ex * 100).toFixed(1) + ' %)', 13.5, '#c2410c', 'left', 800);
    }
    const rx = PHONE ? x0 : PX + 470, ry = PHONE ? PY + 40 + 3 * rowH + 18 + 48 : PY + 26;
    T(rx, ry, '📋 발사 기록: 속력 → 최고 고도', 14.5, '#26324a', 'left', 800);
    const cwr = [90, 200];
    let xx = rx; ['발사 속력 v₀', '최고 고도 h'].forEach((s, i) => { T(xx, ry + 24, s, 13, '#5a6679', 'left', 800); xx += cwr[i]; });
    const rowsMax = PHONE ? 4 : 6;
    w.rec.slice(-rowsMax).forEach((q, i) => {
      const yy = ry + 48 + i * 22; xx = rx;
      [q.v0.toFixed(1) + ' km/s', sci(q.h, 1) + ' km'].forEach((s, k) => { T(xx, yy, s, 13.5, k === 1 ? '#c2410c' : '#26324a', 'left', 800); xx += cwr[k]; });
    });
    if (!w.rec.length) T(rx, ry + 52, '🚀 발사하면 최고 고도가 기록돼요', 13.5, '#7b869a', 'left', 700);
    if (w.escSeen) T(rx, ry + 48 + Math.min(rowsMax, Math.max(1, w.rec.length)) * 22 + 6, '11.2 km/s: 탈출 (E합 ≥ 0)', 14, '#14753f', 'left', 800);
  }

  /* ================= ② 행성 비교 ================= */
  const VSHOW = [1, 0, 2, 3, 4, 5, 6];          // 막대 그래프에 보일 천체 (달, 타이탄, 수성, 화성, 금성, 지구, 목성 → BODIES 인덱스)
  const BAR_ORDER = [0, 1, 2, 3, 4, 5, 6];       // BODIES 순서 그대로 (탈출 속도가 작은 것부터)
  const MPK = 90;                                // 분자 속력 1 km/s = 90 px/s (화면 표시용)
  const ATM = { w: PHONE ? 444 : 438, h: PHONE ? 188 : 198 };
  function plBody() { return BODIES[S.pl.i]; }
  const plOpen = () => !(eff('pred')) || !!S.pl.open[S.pl.i];
  function plInit() {
    const p = S.pl, b = plBody(); p.mol = []; p.gone = [0, 0, 0]; p.respawn = 0; p.msg = ''; p.msgT = 0;
    if (!b.can) return;
    GASES.forEach((g, gi) => {
      const sp = vrmsOf(g, b.Tk) * MPK;
      for (let k = 0; k < 9; k++) {
        const a = Math.random() * TAU, f = 0.55 + Math.random() * 0.9;
        p.mol.push({ g: gi, x: 14 + Math.random() * (ATM.w - 28), y: 14 + Math.random() * (ATM.h - 28), vx: Math.cos(a) * sp * f, vy: Math.sin(a) * sp * f, out: 0, alive: true, a: 1 });
      }
    });
  }
  function plSelect(i) {
    const p = S.pl; if (p.i === i) return; p.i = i; plInit();
    if (eff('pred')) { p.pred = [0, 0, 0]; }
    updateCtl();
  }
  function plStep(dt) {
    const p = S.pl, b = plBody();
    p.lid = approach(p.lid, plOpen() ? 0 : 1, dt, 5);
    if (p.msgT > 0) p.msgT -= dt;
    if (!b.can) return;
    const open = p.lid < 0.35;
    let lostAlive = 0, lostTotal = 0;
    p.mol.forEach((m) => {
      const g = GASES[m.g], lost = !stays(b, g);
      if (lost) { lostTotal++; if (m.alive) lostAlive++; }
      if (!m.alive) return;
      if (m.a < 1) m.a = Math.min(1, m.a + dt * 1.5);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.out) { m.out += dt; if (m.y < -60 || m.out > 1.4) { m.alive = false; p.gone[m.g]++; } return; }
      if (m.x < g.r) { m.x = g.r; m.vx = Math.abs(m.vx); } else if (m.x > ATM.w - g.r) { m.x = ATM.w - g.r; m.vx = -Math.abs(m.vx); }
      if (m.y > ATM.h - g.r) { m.y = ATM.h - g.r; m.vy = -Math.abs(m.vy); }
      if (m.y < g.r) {
        if (open && lost) { m.out = 0.001; m.vy = -Math.abs(m.vy) - 30; m.vx *= 0.6; }
        else { m.y = g.r; m.vy = Math.abs(m.vy); }
      }
    });
    // 빠져나간 기체가 모두 사라지면 잠시 뒤에 처음 상태로
    if (open && lostTotal > 0 && lostAlive === 0) {
      p.respawn += dt;
      if (p.respawn > 2.2) {
        p.respawn = 0; p.gone = [0, 0, 0];
        p.mol.forEach((m) => {
          if (stays(b, GASES[m.g])) return;
          const sp = vrmsOf(GASES[m.g], b.Tk) * MPK, a = Math.random() * TAU, f = 0.55 + Math.random() * 0.9;
          m.x = 14 + Math.random() * (ATM.w - 28); m.y = ATM.h * 0.4 + Math.random() * (ATM.h * 0.55); m.vx = Math.cos(a) * sp * f; m.vy = Math.sin(a) * sp * f; m.out = 0; m.alive = true; m.a = 0;
        });
      }
    }
  }
  function plCheck() {
    const p = S.pl, b = plBody();
    if (!b.can) return;
    if (p.pred.some((x) => x === 0)) { showHint('세 기체 모두 "남아요" 또는 "빠져나가요"를 골라 주세요.', 2800); return; }
    p.open[p.i] = true;
    const bad = [];
    GASES.forEach((g, gi) => { const truth = stays(b, g) ? 1 : 2; if (p.pred[gi] !== truth) bad.push(g.n); });
    p.checked[p.i] = { ok: bad.length === 0 };
    p.msg = bad.length ? '예측과 달라요: ' + bad.join(', ') + ' — 뚜껑이 열렸어요. 결과를 보고 다시 골라요' : '예측이 모두 맞아요 ✅'; p.msgT = 4.5; Sound.click();
    if (!bad.length) parts.burst(PX + 120, 130, { count: 16, speed: 110, size: 3, colors: ['#ffd447', '#fff', '#7ee8a4'], gravity: 60, life: 0.8 });
    updateCtl();
  }
  function calcRows() { return CALCB.map((i) => BODIES[i]); }
  function drawPlanet(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), p = S.pl, b = plBody(), calc = showCalc('calc'), hide = calc;
    const orb = b.vesc / Math.SQRT2;
    // ----- 막대 그래프 (탈출 속도 비교)
    function barsAt(x, y, w, rowH, fs) {
      const order = BAR_ORDER;
      order.forEach((bi, k) => {
        const q = BODIES[bi], yy = y + k * rowH, sel = bi === p.i;
        if (sel) { ctx.fillStyle = 'rgba(245,158,11,.16)'; D.roundRect(x - 6, yy - 2, w + 12, rowH - 2, 8); ctx.fill(); }
        T(x, yy + rowH * 0.62, q.n, fs, sel ? '#b45309' : '#26324a', 'left', 800);
        const bx = x + 62, bw = w - 62 - 84;
        hbar(bx, yy + rowH * 0.2, bw, rowH * 0.5, q.vesc, 65, sel ? ORANGE : q.col);
        T(bx + bw + 8, yy + rowH * 0.62, q.vesc.toFixed(1) + ' km/s', fs - 0.5, sel ? '#b45309' : '#26324a', 'left', 800);
      });
      const sun = BODIES[7];
      T(x, y + order.length * rowH + rowH * 0.62, '태양 ' + Math.round(sun.vesc) + ' km/s (막대 범위 밖)', fs - 0.5, p.i === 7 ? '#b45309' : '#5a6679', 'left', 800);
    }
    if (!PHONE) {
      card(c.x, c.y, 318, c.h);
      T(c.x + 12, c.y + 24, '🚀 표면 탈출 속력 √(2GM/R) 비교', 14, '#26324a', 'left', 800);
      if (!hide) barsAt(c.x + 14, c.y + 36, 294, 34, 14);
      else { T(c.x + 14, c.y + 130, '아래 표의 M, R로 직접 계산해 보세요.', 14, '#5a6679', 'left', 800); T(c.x + 14, c.y + 156, '계산이 끝나면 비교 막대가 나타나요.', 14, '#5a6679', 'left', 700); }
    }
    // ----- 대기 분자 상자
    const ax = PHONE ? c.x : c.x + 326, aw = PHONE ? c.w : c.w - 326;
    card(ax, c.y, aw, c.h);
    T(ax + 12, c.y + 24, (b.can ? b.n + ' 표면 근처의 기체 분자' : b.n), 14, '#26324a', 'left', 800);
    if (b.can) T(ax + aw - 12, c.y + 24, '표면 온도 약 ' + b.Tk + ' K', 13.5, '#c2410c', 'right', 800);
    const bxx = ax + 12, byy = c.y + 104;
    if (b.can) {
      GASES.forEach((g, gi) => { const lx = bxx + gi * (PHONE ? 146 : 142); D.sphere(lx + 7, c.y + 48, g.r + 1, g.c, { gloss: false }); T(lx + 20, c.y + 53, g.n + ' ' + vrmsOf(g, b.Tk).toFixed(2) + ' km/s', 13, '#26324a', 'left', 800); });
      T(bxx, c.y + 78, '분자 속력(v_rms)에 비례해 움직여요', 13, '#5a6679', 'left', 700);
    }
    ctx.save(); D.roundRect(bxx, c.y + 88, ATM.w, c.h - 88 - 12, 10); ctx.clip();
    D.space(bxx, c.y + 88, ATM.w, c.h - 100, S.clock, { stars: 24, top: '#243b6b', bottom: '#0a1228' });
    if (b.can) {
      const og = ctx.createLinearGradient(0, byy, 0, byy + ATM.h); og.addColorStop(0, 'rgba(90,130,200,.18)'); og.addColorStop(1, 'rgba(120,170,240,.34)'); ctx.fillStyle = og; ctx.fillRect(bxx, byy, ATM.w, ATM.h);
      // 표면
      const gy = byy + ATM.h, gcol = b.col; ctx.fillStyle = gcol; ctx.fillRect(bxx, gy, ATM.w, c.y + c.h - gy); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(bxx, gy, ATM.w, 3);
      T(bxx + ATM.w / 2, gy + 14, b.n + ' 표면', 13, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
      // 분자
      p.mol.forEach((m) => {
        if (!m.alive) return; const g = GASES[m.g];
        ctx.save(); ctx.globalAlpha = (m.out ? clamp(1 - m.out / 1.4, 0, 1) : 1) * m.a;
        D.glow(bxx + m.x, byy + m.y, g.r * 2.4, g.c, 0.25);
        D.sphere(bxx + m.x, byy + m.y, g.r, g.c, { gloss: true });
        ctx.restore();
      });
      // 대기의 맨 위 경계와 뚜껑
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(bxx, byy); ctx.lineTo(bxx + ATM.w, byy); ctx.stroke(); ctx.setLineDash([]);
      T(bxx + 8, byy - 6, '우주 ↑', 13, '#cfe0ff', 'left', 800);
      T(bxx + ATM.w - 8, byy - 6, '대기의 맨 위 ↓', 13, '#cfe0ff', 'right', 800);
      if (p.lid > 0.02) {
        const hw = ATM.w / 2 * p.lid;
        [[bxx, -1], [bxx + ATM.w - hw, 1]].forEach(([lx]) => { ctx.fillStyle = '#94a3b8'; ctx.fillRect(lx, byy - 5, hw, 10); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < hw; k += 12) ctx.fillRect(lx + k, byy - 5, 5, 10); });
        if (p.lid > 0.8) D.label(bxx + ATM.w / 2, byy - 22, '🔒 예측 중: 뚜껑이 닫혀 있어요', { bg: 'rgba(30,41,59,.92)', size: 13, pad: 7 });
      }
      // 빠져나간 개수
      if (p.lid < 0.35 && p.gone.some((n) => n > 0)) T(bxx + ATM.w - 8, gy - 8, '빠져나간 분자: ' + GASES.map((g, gi) => g.n + ' ' + p.gone[gi] + '/9').join('  '), 13, '#ffe58a', 'right', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    } else {
      T(bxx + ATM.w / 2, byy + ATM.h / 2 - 20, b.n, 20, '#fff', 'center', 800);
      wrapText(b.note, bxx + ATM.w / 2, byy + ATM.h / 2 + 8, ATM.w - 40, 20, 14, '#e8eefc');
    }
    parts.update(dt); parts.draw(ctx);
    if (p.msgT > 0) D.label(bxx + ATM.w / 2, c.y + 116, p.msg, { bg: p.msg.indexOf('✅') >= 0 ? 'rgba(20,160,88,.95)' : 'rgba(185,28,28,.92)', size: 13, pad: 8 });
    ctx.restore();

    // ----- 아래 패널
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, lh = PHONE ? 23 : 28, fs = PHONE ? 13 : 14.5;
    if (PHONE && !hide) { T(x0, PY + 24, '🚀 표면 탈출 속력 √(2GM/R) 비교', 14, '#26324a', 'left', 800); barsAt(x0, PY + 32, PW - 32, 21, 13.5); }
    let yy0 = PHONE && !hide ? PY + 32 + 8 * 21 + 18 : PY + 28;
    if (hide) {
      T(x0, yy0, '📝 천체의 자료 (G = 6.67 × 10⁻¹¹ N·m²/kg²)', 15, '#26324a', 'left', 800);
      const cw = PHONE ? [110, 170, 150] : [130, 220, 220];
      let xx = x0; ['천체', '질량 M (kg)', '반지름 R (m)'].forEach((s, i) => { T(xx, yy0 + 30, s, 13.5, '#5a6679', 'left', 800); xx += cw[i]; });
      calcRows().forEach((q, i) => { xx = x0; [q.n, sci(q.M, 2), sci(q.R, 2)].forEach((s, k) => { T(xx, yy0 + 58 + i * 28, s, 14.5, '#26324a', 'left', 800); xx += cw[k]; }); });
      T(x0, yy0 + 58 + 4 * 28 + 6, 'v = √(2GM / R)를 계산해 km/s 단위로 입력해요.', 14, '#1d4ed8', 'left', 800);
      return;
    }
    const gasX = PHONE ? x0 : PX + 410;
    // 계산 줄
    const m = b.M, R = b.R;
    if (!PHONE) {
      T(x0, yy0, '🧮 ' + b.n + ': 탈출 속도 계산', 15, '#26324a', 'left', 800);
      lines(x0, yy0 + lh, lh, fs, [
        ['M = ' + sci(m, 2) + ' kg,  R = ' + sci(R, 2) + ' m', '#26324a'],
        ['v탈출 = √(2GM / R) = ' + b.vesc.toFixed(1) + ' km/s', '#1d4ed8'],
        ['표면 원 궤도 속력 √(GM/R) = ' + orb.toFixed(1) + ' km/s  →  × √2', '#5a6679'],
        ['E합 = ½mv² − GMm/R ≥ 0 이면 탈출 (m은 약분)', '#5a6679'],
      ]);
    } else {
      T(x0, yy0, b.n + ': v탈출 = √(2GM / R) = ' + b.vesc.toFixed(1) + ' km/s', 14, '#1d4ed8', 'left', 800);
      T(x0, yy0 + 22, 'M = ' + sci(m, 2) + ' kg, R = ' + sci(R, 2) + ' m', 13, '#5a6679', 'left', 800);
    }
    // 기체 표
    if (b.can) {
      const ty = PHONE ? yy0 + 52 : PY + 28;
      const cw = PHONE ? [58, 66, 160, 100] : [50, 64, 150, 94];
      let xx = gasX; ['기체', 'v_rms', '6 v_rms ↔ v탈출', '결과'].forEach((s, i) => { T(xx, ty, s, 13, '#5a6679', 'left', 800); xx += cw[i]; });
      const known = !eff('pred') || p.open[p.i];
      GASES.forEach((g, gi) => {
        const yy = ty + 28 + gi * (PHONE ? 24 : 32), vr = vrmsOf(g, b.Tk), st = stays(b, g);
        xx = gasX;
        D.sphere(xx + 6, yy - 5, 6, g.c, { gloss: false }); T(xx + 16, yy, g.n, 14, '#26324a', 'left', 800); xx += cw[0];
        T(xx, yy, vr.toFixed(2), 14, '#26324a', 'left', 800); xx += cw[1];
        const bw = cw[2] - 12, sc = b.vesc * 1.5;
        D.roundRect(xx, yy - 12, bw, 14, 7); ctx.fillStyle = '#e4eaf5'; ctx.fill();
        const f = clamp(SIX * vr / sc, 0, 1) * bw;
        ctx.save(); D.roundRect(xx, yy - 12, bw, 14, 7); ctx.clip(); ctx.fillStyle = known ? (st ? GREEN : RED) : '#94a3b8'; ctx.fillRect(xx, yy - 12, f, 14); ctx.restore();
        const lx = xx + bw * (b.vesc / sc); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, yy - 17); ctx.lineTo(lx, yy + 6); ctx.stroke();
        if (SIX * vr > sc) T(xx + bw - 2, yy + 1, '▶', 13, '#fff', 'right', 800);
        xx += cw[2];
        T(xx, yy, known ? (st ? '남아요' : '빠져나가요') : '?', 14, known ? (st ? '#14753f' : '#b91c1c') : '#b45309', 'left', 800);
      });
      const ly = ty + 28 + 3 * (PHONE ? 24 : 32) + 6;
      T(gasX, ly, '검은 선 = 탈출 속도,  막대 = 분자 속력의 6배', 13, '#5a6679', 'left', 700);
      if (!PHONE) T(gasX, ly + 20, '막대가 선보다 짧으면 오래 남아요 (경험 기준)', 13, '#5a6679', 'left', 700);
    } else {
      T(gasX, PHONE ? yy0 + 52 : PY + 40, b.note, 13.5, '#5a6679', 'left', 700);
    }
  }
  function wrapText(str, cx, y, maxW, lh, size, color) {
    ctx.save(); ctx.font = D.font(size, 800); const words = str.split(' '); let line = '', yy = y; const out = [];
    words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = wd; } else line = t2; });
    out.push(line); ctx.restore();
    out.forEach((l, i) => T(cx, yy + i * lh, l, size, color, 'center', 800));
  }

  /* ================= ③ 우주인과 공 ================= */
  const M_ASTRO = 80;                      // 우주인의 질량 (공 제외, kg)
  const PXS = 25;                          // 화면 표시 배율: 1 m/s = 25 px/s
  const astroPeople = () => S.as;
  function asReady() { const a = S.as; a.st = 'ready'; a.t = 0; a.x = 0; a.bx = 0; a.msg = ''; a.hist = []; }
  function asThrow() {
    const a = S.as; if (a.st === 'fly') return;
    asReady(); a.st = 'fly'; a.cm = a.m; a.cv = a.v;
    if (!a.thrown.some((q) => q.m === a.m && q.v === a.v)) a.thrown.push({ m: a.m, v: a.v });
    Sound.click(); updateCtl();
  }
  const asVA = () => S.as.m * S.as.v / M_ASTRO;                  // 우주인 속력 (m/s)
  function asStep(dt) {
    const a = S.as; if (a.st !== 'fly') return;
    a.t += dt;
    const va = a.cm * a.cv / M_ASTRO;
    a.x -= va * PXS * dt; a.bx += a.cv * PXS * dt;
    a.hist.push(a.x); if (a.hist.length > 600) a.hist.shift();
    if (a.t > 3.6 || a.bx > 700) { a.st = 'done'; }
  }
  function drawAstro(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), a = S.as;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 90 });
    // 정지한 눈금 (기준)
    const ry = c.y + c.h - 46;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(c.x, ry, c.w, 34);
    for (let xx = c.x + 10; xx < c.x + c.w; xx += 40) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xx, ry); ctx.lineTo(xx, ry + ((xx - c.x - 10) % 200 === 0 ? 22 : 12)); ctx.stroke(); }
    T(c.x + 12, ry + 28, PHONE ? '정지한 눈금' : '우주 공간에 정지해 있는 눈금 (기준)', 13, '#e8eefc', 'left', 700);
    const cx0 = c.x + c.w * (PHONE ? 0.62 : 0.42), ay = c.y + c.h * 0.62;
    const ax = cx0 + a.x, bxr = 22 + Math.min(16, a.m * 1.0 + 6);
    // 우주인 이동 자취
    if (a.hist.length > 1) { ctx.fillStyle = 'rgba(255,229,138,.7)'; for (let i = 0; i < a.hist.length; i += 25) { ctx.beginPath(); ctx.arc(cx0 + a.hist[i], ay + 6, 2.5, 0, TAU); ctx.fill(); } }
    person(ax, ay + 40, 112, '#f2f5fb', true);
    const ballR = 7 + a.m * 0.9, bx = ax + 34 + a.bx, by = ay - 18;
    const holding = a.st === 'ready';
    if (bx < c.x + c.w + 30) {
      D.sphere(bx, by, ballR, '#ff8a3d', { gloss: true, shadow: false });
      T(bx, by + 4.5, a.m + ' kg', 13, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.4)', strokeWidth: 2.5 });
    }
    // 운동량 화살표 (공 +p, 우주인 −p: 길이가 같아요)
    if (a.st !== 'ready') {
      const p = a.cm * a.cv, L = 24 + p / 160 * 130;
      if (bx < c.x + c.w - L - 60) D.arrow(bx + ballR + 6, by - ballR - 14, bx + ballR + 6 + L, by - ballR - 14, { color: '#7cc4ff', width: 4, head: 11, label: '+' + p + ' kg·m/s', labelOffset: -18, labelBg: 'rgba(30,41,59,.85)', labelColor: '#fff' });
      D.arrow(ax - 4, ay - 70, ax - 4 - L, ay - 70, { color: '#ffb36b', width: 4, head: 11, label: MINUS + p + ' kg·m/s', labelOffset: 18, labelBg: 'rgba(30,41,59,.85)', labelColor: '#fff' });
    } else {
      D.label(ax, ay - 98, holding ? '정지 상태: 전체 운동량 = 0' : '', { bg: 'rgba(30,41,59,.85)', size: 13, pad: 8 });
    }
    T(c.x + 12, c.y + 24, '우주 공간의 우주인 (질량 ' + M_ASTRO + ' kg)이 공을 던져요', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    if (a.st === 'done') D.label(c.x + c.w / 2, c.y + 56, '공이 앞으로 간 만큼 우주인은 뒤로 가요', { bg: 'rgba(20,160,88,.92)', size: 13, pad: 8 });
    ctx.restore();
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 29;
    const m = a.st === 'ready' ? a.m : a.cm, v = a.st === 'ready' ? a.v : a.cv, p = m * v, vA = p / M_ASTRO, thrown = a.st !== 'ready';
    T(x0, PY + 28, '⚖️ 운동량 보존: 던지기 전 합 = 0 → 던진 뒤에도 합 = 0', 15, '#26324a', 'left', 800);
    const bw = PHONE ? PW - 120 : 340, bx0 = x0 + 8, by0 = PY + 52;
    T(x0, by0 + 12, '공  p = m v', 14, BLUE, 'left', 800);
    dbar(bx0, by0 + 20, bw, 16, thrown ? p : 0, -180, 180, '#3b82f6'); T(bx0 + bw + 10, by0 + 33, thrown ? '+' + p : '0', 14, BLUE, 'left', 800);
    T(x0, by0 + 62, '우주인  p = M v′', 14, '#c2410c', 'left', 800);
    dbar(bx0, by0 + 70, bw, 16, thrown ? -p : 0, -180, 180, '#f59e0b'); T(bx0 + bw + 10, by0 + 83, thrown ? MINUS + p : '0', 14, '#c2410c', 'left', 800);
    T(x0, by0 + 112, '합', 14, '#26324a', 'left', 800); T(bx0 + 26, by0 + 112, '=  ' + (thrown ? '+' + p + '  ' + MINUS + '  ' + p : '0') + '  =  0 kg·m/s', 14.5, '#14753f', 'left', 800);
    const yy = PY + 52 + 140;
    lines(x0, yy, lh - 2, fs - 0.5, [
      ['공: ' + m + ' kg × ' + v + ' m/s = ' + p + ' kg·m/s (오른쪽)', '#26324a'],
      ['우주인 속력 v′ = ' + p + ' / ' + M_ASTRO + ' = ' + vA.toFixed(2) + ' m/s (왼쪽)', '#26324a'],
    ].concat(PHONE ? [] : [['공을 무겁게 하거나 빠르게 던질수록 우주인은 더 빨리 물러나요.', '#5a6679']]));
  }

  /* ================= ③ 로켓 분출 ================= */
  const WEIGHT = 10;                            // 발사대의 로켓 무게 (상대값)
  const rkThrust = () => S.rk.u * S.rk.f;
  function rkReset() { const r = S.rk; r.firing = false; r.vel = 0; r.t = 0; r.y = 0; r.msg = ''; r.sc = 0; r.burn = 0; r.lifted = false; parts.clear(); updateCtl(); }
  function rkToggle() {
    const r = S.rk;
    if (r.firing) { r.firing = false; } else { r.firing = true; r.burn = 0; if (r.env === 'pad' && r.y > 1) { /* 계속 */ } Sound.click(); }
    updateCtl();
  }
  function rkStep(dt) {
    const r = S.rk, th = rkThrust();
    if (r.env === 'space') {
      if (r.firing) {
        r.vel += th * 0.25 * dt; r.burn += dt;
        if (r.burn >= 1) { if (r.u <= 2) r.seenU.lo = true; if (r.u >= 4) r.seenU.hi = true; if (r.f <= 2) r.seenF.lo = true; if (r.f >= 4) r.seenF.hi = true; }
      }
      r.sc = (r.sc + r.vel * dt * 6) % 80;
    } else {
      const a = (r.firing ? th : 0) - WEIGHT;
      if (r.y > 0 || a > 0) {
        r.vel += a * 0.2 * dt * 6; r.y += r.vel * dt * 6;
        if (r.y <= 0) { r.y = 0; r.vel = 0; }
      }
      if (r.firing && a > 0 && r.y > 30) r.lifted = true;
      if (r.y > 700) { r.msg = '이륙 성공! 추력이 무게보다 컸어요'; r.firing = false; r.y = 0; r.vel = 0; updateCtl(); r.msgT = 2.5; }
    }
    if (r.msgT > 0) r.msgT -= dt;
  }
  const rkLifted = () => S.rk.lifted;
  function drawRocket(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), r = S.rk, th = rkThrust(), cx = c.x + c.w * (PHONE ? 0.58 : 0.5), pad = r.env === 'pad';
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    let nozzle;
    if (!pad) {
      D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 60 });
      // 흐르는 별 줄무늬 (속력이 클수록 길어요)
      const L = clamp(r.vel * 1.4, 0, 90);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      for (let k = 0; k < 16; k++) { const xx = c.x + ((k * 97 - r.sc * 12) % (c.w + 80) + c.w + 80) % (c.w + 80) - 40, yy = c.y + 30 + ((k * 53) % (c.h - 60)); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + (L > 4 ? L : 0), yy); ctx.stroke(); if (L <= 4) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xx, yy, 1.5, 0, TAU); ctx.fill(); } }
      const ry = c.y + c.h * 0.46;
      nozzle = { x: cx - 24, y: ry };
      rocket(cx, ry, Math.PI / 2, 1.5, r.firing ? 0.25 + th / 40 : 0, S.clock);
      // 분출 입자 (로켓에 대해 뒤쪽으로)
      if (r.firing) {
        r.acc = (r.acc || 0) + dt * (10 + r.f * 14);
        while (r.acc >= 1) { r.acc -= 1; parts.emit({ x: nozzle.x - 4, y: nozzle.y + (Math.random() - 0.5) * 10, vx: -(r.u * 70 + Math.random() * 20) - r.vel * 2, vy: (Math.random() - 0.5) * 30, life: 1.2, size: 3.2 + Math.random() * 2.4, color: Math.random() < 0.5 ? '#ffd447' : '#ff9f43', gravity: 0, drag: 0, shape: 'circle', fade: true }); }
      }
      D.label(cx, ry - 70, '밀어낼 공기가 없는 진공이에요', { bg: 'rgba(30,41,59,.85)', size: 13, pad: 8 });
      if (r.firing) { D.arrow(nozzle.x - 6 - 18, ry + 52, nozzle.x - 6 - 18 - clamp(th * 5, 30, 130), ry + 52, { color: '#ffb36b', width: 4, head: 11, label: '가스: 뒤로', labelOffset: 18, labelBg: 'rgba(30,41,59,.85)', labelColor: '#fff' }); D.arrow(cx + 6, ry + 52, cx + 6 + clamp(th * 5, 30, 130), ry + 52, { color: '#7cc4ff', width: 4, head: 11, label: '로켓: 앞으로', labelOffset: 18, labelBg: 'rgba(30,41,59,.85)', labelColor: '#fff' }); }
    } else {
      const sky = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); const dk = clamp(r.y / 600, 0, 1);
      sky.addColorStop(0, SciSim.color.mix('#7cc4ff', '#0b1535', dk)); sky.addColorStop(1, SciSim.color.mix('#d6efff', '#1d2b55', dk * 0.8));
      ctx.fillStyle = sky; ctx.fillRect(c.x, c.y, c.w, c.h);
      const gy0 = c.y + c.h - 52, rise = Math.min(r.y, 160), shift = Math.max(0, r.y - 160) * 0.9, gy = gy0 + shift;
      if (gy < c.y + c.h + 20) {
        D.ground(c.x, gy, c.w, c.h);
        ctx.fillStyle = '#7b869a'; ctx.fillRect(cx - 42, gy - 14, 84, 14); ctx.fillStyle = '#5a6679'; ctx.fillRect(cx + 130, gy - 130, 10, 130); ctx.fillRect(cx + 120, gy - 130, 24, 6);
      }
      const sy = gy0 - 14 - 33 - rise;
      nozzle = { x: cx, y: sy + 38 };
      const jig = (r.firing && th <= WEIGHT && r.y <= 0) ? Math.sin(S.clock * 60) * 1.5 : 0;
      rocket(cx + jig, sy, 0, 1.5, r.firing ? 0.3 + th / 40 : 0, S.clock);
      if (r.firing) {
        r.acc = (r.acc || 0) + dt * (10 + r.f * 14);
        while (r.acc >= 1) { r.acc -= 1; parts.emit({ x: nozzle.x + (Math.random() - 0.5) * 12, y: nozzle.y + 10, vx: (Math.random() - 0.5) * 60, vy: r.u * 70 + Math.random() * 20, life: 1.0, size: 3 + Math.random() * 2.4, color: Math.random() < 0.5 ? '#ffd447' : '#ff9f43', gravity: 0, drag: 0.4, shape: 'circle', fade: true }); }
        if (r.y <= 0 && gy < c.y + c.h) { if (Math.random() < 0.5) parts.emit({ x: cx + (Math.random() - 0.5) * 50, y: gy - 6, vx: (Math.random() - 0.5) * 140, vy: -10 - Math.random() * 20, life: 1.2, size: 7 + Math.random() * 6, color: 'rgba(230,230,235,.8)', gravity: 0, drag: 1, shape: 'smoke', fade: true, grow: 6 }); }
      }
      // 힘 화살표 (같은 축척)
      const K = 6;
      if (r.firing) { const tl = Math.min(th * K, sy - c.y - 26); D.arrow(cx + 40, sy, cx + 40, sy - tl, { color: '#14a058', width: 5, head: 12 }); D.label(cx + 56, sy - tl + 12, '추력 ' + th, { bg: '#14a058', size: 13, pad: 7, align: 'left' }); }
      D.arrow(cx - 40, sy, cx - 40, sy + WEIGHT * K, { color: '#e2464b', width: 5, head: 12 });
      D.label(cx - 90, sy + WEIGHT * K - 10, '무게 ' + WEIGHT, { bg: '#e2464b', size: 13, pad: 7 });
      const net = (r.firing ? th : 0) - WEIGHT;
      D.label(c.x + c.w - 12, c.y + 56, r.y > 1 ? '날아오르는 중 (알짜힘 위쪽)' : (r.firing && net <= 0 ? '추력 ≤ 무게: 뜨지 못해요' : '출발 준비'), { bg: net > 0 && r.firing ? 'rgba(20,160,88,.92)' : 'rgba(30,41,59,.88)', size: 13, pad: 8, align: 'right' });
    }
    parts.update(dt); parts.draw(ctx);
    T(c.x + 12, c.y + 24, pad ? '지구의 발사대: 추력과 무게' : '우주 공간 (중력 무시)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    if (r.msgT > 0 && r.msg) D.label(c.x + c.w / 2, c.y + c.h / 2 - 20, r.msg, { bg: 'rgba(20,160,88,.95)', size: 14, pad: 10 });
    ctx.restore();
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 29;
    T(x0, PY + 28, '🔥 분출 가스와 로켓의 운동량 (1초 동안, 상대값)', 15, '#26324a', 'left', 800);
    const bw = PHONE ? PW - 130 : 340, bx0 = x0 + 8, by0 = PY + 50, mom = r.firing ? th : 0;
    T(x0, by0 + 12, '가스  (뒤쪽 −)', 14, '#c2410c', 'left', 800);
    dbar(bx0, by0 + 20, bw, 16, -mom, -26, 26, '#f59e0b'); T(bx0 + bw + 10, by0 + 33, mom ? MINUS + mom : '0', 14, '#c2410c', 'left', 800);
    T(x0, by0 + 62, '로켓  (앞쪽 +)', 14, BLUE, 'left', 800);
    dbar(bx0, by0 + 70, bw, 16, mom, -26, 26, '#3b82f6'); T(bx0 + bw + 10, by0 + 83, mom ? '+' + mom : '0', 14, BLUE, 'left', 800);
    T(x0, by0 + 112, '합 = 0  →  운동량 보존', 14.5, '#14753f', 'left', 800);
    const yy = by0 + 142;
    lines(x0, yy, lh - 2, fs - 0.5, pad ? [
      ['추력 = 분출 속력 × 분출량 = ' + r.u + ' × ' + r.f + ' = ' + th + '   (상대값)', '#26324a'],
      ['무게 = ' + WEIGHT + '   →   ' + (th > WEIGHT ? '추력 > 무게: 알짜힘이 위쪽, 이륙해요' : '추력 ≤ 무게: 땅에서 떨어지지 못해요'), th > WEIGHT ? '#14753f' : '#b91c1c'],
    ] : [
      ['추력 = 분출 속력 × 분출량 = ' + r.u + ' × ' + r.f + ' = ' + th + '   (상대값)', '#26324a'],
      ['추력이 클수록 가속이 커요. 연료가 줄어드는 효과는 무시해요.', '#5a6679'],
    ]);
  }

  /* ================= ④ 궤도 진입 (발사 순서) ================= */
  const V_ORB = 7.7, V_ROT = 0.46;                 // 필요한 수평 속력, 적도의 자전 속력 (km/s)
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const EARTH_R = PHONE ? 70 : 92, RING_R = PHONE ? 108 : 142;
  const PHI_TAB = (function () {
    const n = 400, t = [0]; let acc = 0;
    for (let i = 1; i <= n; i++) { const s = i / n; acc += smooth((s - 0.1) / 0.75) / n; t.push(acc); }
    const tot = t[n]; return t.map((q) => q / tot * 2.2);          // s = 1에서 약 126°
  })();
  const phiOf = (s) => { const k = clamp(s, 0, 1) * 400, i = Math.min(399, Math.floor(k)); return PHI_TAB[i] + (PHI_TAB[i + 1] - PHI_TAB[i]) * (k - i); };
  const PHI_END = PHI_TAB[400], OMEGA = (PHI_TAB[400] - PHI_TAB[399]) * 400 / 10;          // 엔진을 끈 뒤 각속도 (rad/s)
  const STAGE_PTS = [{ s: 0.3, t: '1단 분리' }, { s: 0.55, t: '2단 분리' }, { s: 0.85, t: '엔진 정지' }];
  const lnSpeed = (s) => V_ORB * smooth((s - 0.1) / 0.75);                       // 지구 중심 기준 수평 속력 (km/s)
  function lnPos(s, orbExtra) {   // 지구 중심 기준 극좌표 → 화면 (중심 0,0), E는 반시계(왼쪽), W는 시계(오른쪽)
    const l = S.ln; let rho, ph;
    if (l.path === 'vert') { rho = EARTH_R + (RING_R - EARTH_R) * 1.5 * Math.sin(Math.PI * s); ph = 0; }
    else { const e = smooth(s / 0.6); rho = EARTH_R + (RING_R - EARTH_R) * (1 - Math.pow(1 - clamp(s / 0.55, 0, 1), 2.4)); ph = phiOf(s) + (orbExtra || 0); }
    const sg = l.dir === 'E' ? -1 : 1;
    return { x: sg * rho * Math.sin(ph), y: -rho * Math.cos(ph), rho, ph };
  }
  function lnReset() { const l = S.ln; l.p = 0; l.playing = false; l.orb = 0; l.done = false; l.passed = 0; parts.clear(); updateCtl(); }
  function lnPlay() {
    const l = S.ln; if (l.p >= 1 && l.path === 'orbit') { l.p = 0; l.orb = 0; l.done = false; } else if (l.p >= 1) { l.p = 0; l.done = false; }
    l.playing = true; l.passed = 0; Sound.click(); updateCtl();
  }
  function lnStep(dt) {
    const l = S.ln; if (!l.playing) return;
    const prev = l.p; l.p = Math.min(1, l.p + dt / 10);
    STAGE_PTS.forEach((q, i) => { if (prev < q.s && l.p >= q.s) { l.passed = i + 1; if (l.path === 'orbit') l.dropAt = { i, t: S.clock }; Sound.click(); } });
    if (l.p >= 1) { l.done = true; l.orb += OMEGA * dt; if (l.path === 'vert') l.playing = false; l.played = (l.played || 0) + (prev < 1 ? 1 : 0); l.seen = l.seen || {}; l.seen[l.path + l.dir] = true; }
  }
  function drawLaunch(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), l = S.ln;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 70 });
    const ecx = c.x + (PHONE ? c.w / 2 : 250), ecy = c.y + c.h / 2 + 22;
    // 궤도 고리
    ctx.strokeStyle = 'rgba(255,229,138,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(ecx, ecy, RING_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 지구 (북극 위에서 본 적도 단면)
    D.glow(ecx, ecy, EARTH_R * 1.4, '#7cc4ff', 0.3); D.sphere(ecx, ecy, EARTH_R, '#3b82f6', { gloss: false });
    ctx.save(); ctx.beginPath(); ctx.arc(ecx, ecy, EARTH_R, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(70,170,100,.85)';
    [[0.3, 0.55, 0.3], [2.1, 0.5, 0.26], [3.9, 0.45, 0.3], [5.2, 0.6, 0.22]].forEach((q) => { const a = q[0] + S.clock * 0.05; ctx.beginPath(); ctx.arc(ecx + Math.cos(a) * EARTH_R * q[1], ecy - Math.sin(a) * EARTH_R * q[1], EARTH_R * q[2], 0, TAU); ctx.fill(); }); ctx.restore();
    // 자전 방향 (동쪽 = 왼쪽, 북극 위에서 보면 반시계)
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ecx, ecy, EARTH_R * 0.55, -Math.PI * 0.95, -Math.PI * 0.05, true); ctx.stroke();
    D.arrow(ecx + EARTH_R * 0.55 * Math.cos(-Math.PI * 0.95) + 1, ecy + EARTH_R * 0.55 * Math.sin(-Math.PI * 0.95) + 6, ecx + EARTH_R * 0.55 * Math.cos(-Math.PI * 0.95) - 2, ecy + EARTH_R * 0.55 * Math.sin(-Math.PI * 0.95) - 2, { color: '#fff', width: 2.5, head: 9 });
    T(ecx, ecy + 8, '자전', 13, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
    // 발사 지점(적도)
    const lx = ecx, ly = ecy - EARTH_R;
    D.sphere(lx, ly, 4.5, '#ffd447', { gloss: false, outline: '#fff', outlineWidth: 1.2 });
    // 자전 속력 화살표 (지표가 움직이는 방향)
    const sgd = -1; D.arrow(lx, ly + 10, lx + sgd * 34, ly + 10, { color: '#ffd447', width: 3, head: 9 });
    T(lx + sgd * 40, ly + 15, '동', 13, '#ffe58a', 'right', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 }); T(lx + 40, ly + 15, '서', 13, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    // 자취
    const orbExtra = l.done && l.path === 'orbit' ? l.orb : 0;
    if (l.p > 0) {
      ctx.strokeStyle = 'rgba(255,200,90,.9)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = Math.max(2, Math.floor(l.p * 160)); for (let i = 0; i <= n; i++) { const q = lnPos(l.p * i / n, 0); i ? ctx.lineTo(ecx + q.x, ecy + q.y) : ctx.moveTo(ecx + q.x, ecy + q.y); } ctx.stroke();
      if (orbExtra > 0) { const q0 = lnPos(1, 0), sg = l.dir === 'E' ? -1 : 1; ctx.beginPath(); for (let a = 0; a <= orbExtra; a += 0.05) { const q = lnPos(1, a); a ? ctx.lineTo(ecx + q.x, ecy + q.y) : ctx.moveTo(ecx + q.x, ecy + q.y); } ctx.stroke(); }
      // 분리 표지
      if (l.path === 'orbit') STAGE_PTS.forEach((q, i) => { if (l.p >= q.s) { const pp = lnPos(q.s, 0); D.sphere(ecx + pp.x, ecy + pp.y, 4.5, i === 2 ? GREEN : '#fff', { gloss: false, outline: '#334155', outlineWidth: 1 }); } });
    }
    // 로켓
    const q = lnPos(l.p, orbExtra), q2 = lnPos(Math.min(1, l.p + 0.01), orbExtra + (l.p >= 1 ? 0.02 : 0)), q1 = lnPos(Math.max(0, l.p - 0.01), Math.max(0, orbExtra - (l.p >= 1 ? 0.02 : 0)));
    let ang = Math.atan2(q2.x - q1.x, -(q2.y - q1.y)); if (l.p <= 0.001) ang = 0;
    if (l.path === 'vert' && l.p > 0.5) ang = Math.PI;          // 떨어질 때는 거꾸로
    const eng = l.playing && l.path === 'orbit' && l.p < 0.85 || (l.playing && l.path === 'vert' && l.p < 0.5);
    rocket(ecx + q.x, ecy + q.y - (l.p <= 0.001 ? 14 : 0), ang, PHONE ? 0.55 : 0.7, eng ? 0.7 : 0, S.clock);
    if (eng && Math.random() < 0.7) parts.emit({ x: ecx + q.x - Math.sin(ang) * -24 * 0.7, y: ecy + q.y + Math.cos(ang) * -24 * 0.7 * -1, vx: (Math.random() - 0.5) * 20 - Math.sin(ang) * 30, vy: (Math.random() - 0.5) * 20 + Math.cos(ang) * 30, life: 0.9, size: 3 + Math.random() * 2, color: '#ffd447', gravity: 0, drag: 1, shape: 'circle', fade: true });
    if (l.dropAt && S.clock - l.dropAt.t < 0.1 && l.path === 'orbit') { parts.burst(ecx + q.x, ecy + q.y, { count: 14, speed: 70, size: 3, colors: ['#e8eefc', '#94a3b8', '#fff'], gravity: 30, life: 1.0, shape: 'square' }); l.dropAt = null; }
    parts.update(dt); parts.draw(ctx);
    // 안내
    T(c.x + 12, c.y + 24, '북극 위에서 본 지구 (적도 단면, 축척 아님)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    if (l.path === 'vert' && l.p >= 1) D.label(ecx, c.y + c.h - 24, '수평 속력이 없으면 그대로 떨어져요 ❌', { bg: 'rgba(185,28,28,.92)', size: 13, pad: 8 });
    if (l.path === 'vert' && l.p > 0.45 && l.p < 1) D.label(ecx, c.y + c.h - 24, '올라간 만큼 다시 떨어져요', { bg: 'rgba(30,41,59,.9)', size: 13, pad: 8 });
    if (l.path === 'orbit' && l.done) D.label(ecx, c.y + c.h - 24, '엔진 정지: 자유 낙하하며 원 궤도를 돌아요 ✅', { bg: 'rgba(20,160,88,.92)', size: 13, pad: 8 });
    // 오른쪽 안내 (순서와 속력)
    if (!PHONE) {
      const x0 = c.x + 470, w0 = c.w - 470 - 12;
      ctx.fillStyle = 'rgba(247,249,253,.96)'; ctx.fillRect(x0 - 12, c.y, c.x + c.w - x0 + 12, c.h);
      T(x0, c.y + 26, '🚀 발사 순서', 14.5, '#26324a', 'left', 800);
      const ph = [['① 수직 상승', '두꺼운 대기를 빨리 벗어나요', 0, 0.12], ['② 서서히 기울이기', '수평 방향으로 향해요', 0.12, 0.3], ['③ 수평 가속', '수평 속력을 올려요', 0.3, 0.85], ['④ 엔진 정지', '자유 낙하하는 원 궤도', 0.85, 2]];
      ph.forEach((q2, i) => {
        const on = l.path === 'orbit' && l.p > 0 && l.p >= q2[2] && l.p < q2[3] || (i === 3 && l.path === 'orbit' && l.p >= 1), yy = c.y + 52 + i * 46;
        ctx.fillStyle = on ? 'rgba(245,158,11,.2)' : 'rgba(0,0,0,0)'; D.roundRect(x0 - 6, yy - 18, w0 + 8, 40, 8); ctx.fill();
        T(x0, yy, q2[0], 14, on ? '#b45309' : '#26324a', 'left', 800); T(x0, yy + 18, q2[1], 13, '#5a6679', 'left', 700);
      });
      const sp = l.path === 'orbit' ? lnSpeed(l.p) : 0;
      T(x0, c.y + 52 + 4 * 46 + 6, '수평 속력 (지구 중심 기준)', 13, '#26324a', 'left', 800);
      hbar(x0, c.y + 52 + 4 * 46 + 16, w0 - 70, 14, sp, 8.5, BLUE); T(x0 + w0 - 62, c.y + 52 + 4 * 46 + 28, sp.toFixed(1) + ' km/s', 13.5, BLUE, 'left', 800);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 29, E = l.dir === 'E';
    T(x0, PY + 28, '🧭 지구가 자전하는 방향으로 쏘면 이득이에요', 15, '#26324a', 'left', 800);
    const need = E ? V_ORB - V_ROT : V_ORB + V_ROT;
    const bw = PHONE ? PW - 190 : 330, bx0 = x0 + 70;
    [['동쪽', V_ORB - V_ROT, '#14a058', E], ['서쪽', V_ORB + V_ROT, '#e2464b', !E]].forEach((q2, i) => {
      const yy = PY + 56 + i * 34;
      T(x0, yy + 13, q2[0], 14, q2[3] ? '#b45309' : '#26324a', 'left', 800);
      hbar(bx0, yy, bw, 16, q2[1], 9, q2[3] ? q2[2] : '#c8d2e6'); T(bx0 + bw + 10, yy + 13, q2[1].toFixed(2) + ' km/s', 14, q2[3] ? '#26324a' : '#7b869a', 'left', 800);
    });
    lines(x0, PY + 56 + 2 * 34 + 14, lh - 2, fs - 0.5, [
      ['필요한 수평 속력 ' + V_ORB + ' km/s,  자전 ' + V_ROT + ' km/s (적도)', '#26324a'],
      ['로켓이 낼 몫 = ' + V_ORB + (E ? ' − ' : ' + ') + V_ROT + ' = ' + need.toFixed(2) + ' km/s (' + (E ? '동쪽' : '서쪽') + ' 발사)', E ? '#14753f' : '#b91c1c'],
    ].concat(PHONE ? [] : [['위로만 쏘면 수평 속력이 0이라 올라간 만큼 다시 떨어져요.', '#5a6679']]));
    if (PHONE) lines(x0, PY + 56 + 2 * 34 + 14 + 2 * (lh - 2), lh - 2, 13, [['수평 속력 (지구 중심 기준): ' + (l.path === 'orbit' ? lnSpeed(l.p).toFixed(1) : '0.0') + ' km/s', BLUE], ['①수직 상승 ②기울이기 ③수평 가속 ④엔진 정지', '#5a6679']]);
  }

  /* ================= ④ 다단 로켓 ================= */
  const SG_MASS = 100, SG_PAY = 1, SG_FUEL = 90, SG_STRUCT = 0.1, SG_REQ = 2.95, SG_RATE = 10;
  function sgPlan() {
    const g = S.sg, n = g.n; let f;
    if (n === 1) f = [100]; else if (n === 2) f = [g.s1, 100 - g.s1]; else f = [g.s1, g.s2, 100 - g.s1 - g.s2];
    return f.map((p) => { const fuel = SG_FUEL * p / 100; return { fuel, st: fuel * SG_STRUCT }; });
  }
  function sgModel(plan) {      // 단별 시작 질량, 가속도 구간, 최종 속도 (분출 속력 단위)
    let m = SG_MASS, v = 0, t = 0; const segs = [];
    plan.forEach((s) => { const m0 = m, m1 = m - s.fuel; segs.push({ m0, m1, t0: t, t1: t + s.fuel, v0: v, fuel: s.fuel, st: s.st }); v += Math.log(m0 / m1); t += s.fuel; m = m1 - s.st; });
    return { segs, v, score: v / SG_REQ * 100 };
  }
  const SG_BASE = (function () { const mm = sgModelFor([{ fuel: 90, st: 9 }]); return mm.score; })();
  function sgModelFor(plan) { let m = SG_MASS, v = 0; plan.forEach((s) => { const m0 = m, m1 = m - s.fuel; v += Math.log(m0 / m1); m = m1 - s.st; }); return { v, score: v / SG_REQ * 100 }; }
  function sgReset() { const g = S.sg; g.st = 'ready'; g.t = 0; g.v = 0; g.sidx = 0; g.done = false; g.drops = []; g.fly = 0; parts.clear(); updateCtl(); }
  function sgLaunch() { const g = S.sg; if (g.st === 'run') return; sgReset(); g.st = 'run'; g.model = sgModel(sgPlan()); Sound.click(); updateCtl(); }
  function sgNow() {     // 현재 t에서의 (단 번호, 질량, 가속도, 속도)
    const g = S.sg, M = g.model; if (!M) return { i: 0, m: SG_MASS, a: 1 / SG_MASS, v: 0 };
    const t = Math.min(g.t, M.segs[M.segs.length - 1].t1);
    let i = M.segs.findIndex((q) => t < q.t1 - 1e-9); if (i < 0) i = M.segs.length - 1;
    const q = M.segs[i], burned = t - q.t0, m = q.m0 - burned;
    return { i, m, a: 1 / m, v: q.v0 + Math.log(q.m0 / m) };
  }
  function sgStep(dt) {
    const g = S.sg; if (g.st !== 'run') { g.fly = approach(g.fly, g.st === 'done' ? 1 : 0, dt, 2); return; }
    const M = g.model, tEnd = M.segs[M.segs.length - 1].t1;
    const before = sgNow().i;
    g.t = Math.min(tEnd, g.t + dt * SG_RATE);
    const now = sgNow(); g.v = now.v;
    if (g.t >= tEnd) {
      g.st = 'done'; g.done = true; g.ok = M.score >= 100 - 1e-9; g.tried[g.n] = { score: M.score, ok: g.ok };
      g.v = M.v; Sound.click();
      if (g.ok) parts.burst(PX + 150, 150, { count: 30, speed: 140, size: 3.4, colors: ['#ffd447', '#fff', '#7ee8a4'], gravity: 50, life: 1.0 });
      updateCtl();
    }
    // 단 분리: 연료가 다 탄 단을 떼어 내요 (마지막 단 제외)
    M.segs.forEach((q, i) => { if (i < M.segs.length - 1 && g.t >= q.t1 - 1e-9 && !q.dropped) { q.dropped = true; g.drops.push({ i, y: 0, vy: 40, rot: 0, vr: (i % 2 ? -1 : 1) * 1.2, a: 1, x: 0, vx: (i % 2 ? -1 : 1) * 25 }); Sound.click(); } });
    g.drops.forEach((d) => { d.vy += 220 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.rot += d.vr * dt; d.a = Math.max(0, d.a - dt * 0.55); });
    g.drops = g.drops.filter((d) => d.a > 0.02);
  }
  function drawStage(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), g = S.sg, plan = sgPlan(), model = g.model && g.st !== 'ready' ? g.model : sgModel(plan), now = sgNow(), run = g.st === 'run';
    const prog = clamp((g.st === 'ready' ? 0 : g.v) / (model.v || 1), 0, 1);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const k = g.st === 'ready' ? 0 : clamp(g.v / SG_REQ, 0, 1);
    const sk = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); sk.addColorStop(0, SciSim.color.mix('#8fd0ff', '#070b1a', Math.min(1, k * 1.6))); sk.addColorStop(1, SciSim.color.mix('#dff2ff', '#1d2b55', Math.min(1, k * 1.3)));
    ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    if (k > 0.2) { ctx.globalAlpha = Math.min(1, (k - 0.2) * 2); D.space(c.x, c.y, PHONE ? c.w : 180, c.h, S.clock, { stars: 30, top: 'rgba(0,0,0,0)', bottom: 'rgba(0,0,0,0)' }); ctx.globalAlpha = 1; }
    const sx = c.x + (PHONE ? c.w * 0.18 : 90), gy0 = c.y + c.h - 40, gshift = clamp(k * 520, 0, 260) * (g.st === 'ready' ? 0 : 1);
    if (gy0 + gshift < c.y + c.h + 10) { D.ground(c.x, gy0 + gshift, PHONE ? c.w : 180, 80); ctx.fillStyle = '#7b869a'; ctx.fillRect(sx - 36, gy0 + gshift - 8, 72, 8); }
    // 로켓 탑: 위에서부터 위성, 단 (맨 위 = 마지막 단)
    const n = plan.length, hs = plan.map((p) => 22 + p.fuel * 0.9), ws = plan.map((p, i) => 48 - 7 * i);
    let yTop = gy0 - 8 - hs.reduce((a, b) => a + b, 0) - 30;
    const baseY = gy0 - 8 - (g.st === 'ready' ? 0 : Math.min(60, gshift * 0.2));
    const tNow = g.t, M = model;
    // 단 그리기 (아래에서 위로)
    let yy = baseY;
    const rolls = [];
    for (let i = 0; i < n; i++) {
      const seg = M.segs[i], gone = g.st !== 'ready' && tNow >= seg.t1 - 1e-9 && i < n - 1;
      const h = hs[i], w = ws[i];
      if (!gone) {
        const burnedFrac = g.st === 'ready' ? 0 : clamp((tNow - seg.t0) / (seg.t1 - seg.t0), 0, 1);
        const gr = ctx.createLinearGradient(sx - w / 2, 0, sx + w / 2, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, ['#e1e8f5', '#e8eef9', '#f2f5fb'][i]); gr.addColorStop(1, '#a7b4cc');
        D.roundRect(sx - w / 2, yy - h, w, h, 5); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#8fa0bd'; ctx.lineWidth = 1.5; ctx.stroke();
        // 연료 탱크
        const ih = h - 12; ctx.save(); D.roundRect(sx - w / 2 + 6, yy - h + 6, w - 12, ih, 3); ctx.clip(); ctx.fillStyle = 'rgba(40,60,100,.18)'; ctx.fillRect(sx - w / 2 + 6, yy - h + 6, w - 12, ih);
        ctx.fillStyle = '#ffa733'; const fh = ih * (1 - burnedFrac); ctx.fillRect(sx - w / 2 + 6, yy - 6 - fh, w - 12, fh); ctx.restore();
        T(sx, yy - h / 2 + 5, (i + 1) + '단', 13, '#26324a', 'center', 800);
        if (run && tNow < seg.t1 && tNow >= seg.t0) { rolls.push([sx, yy, 0.5 + 0.5 * (w / 48)]); }
        yy -= h;
      } else {
        // 분리된 단: 떨어져요
        const d = g.drops.find((q) => q.i === i);
        if (d) { ctx.save(); ctx.globalAlpha = d.a; ctx.translate(sx + d.x, yy0For(i) + d.y); ctx.rotate(d.rot); D.roundRect(-w / 2, -h, w, h, 5); ctx.fillStyle = '#cbd5e6'; ctx.fill(); ctx.strokeStyle = '#8fa0bd'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      }
    }
    function yy0For(i) { let y = baseY; for (let j = 0; j < i; j++) { const gone2 = g.st !== 'ready' && tNow >= M.segs[j].t1 - 1e-9 && j < n - 1; if (!gone2) y -= hs[j]; } return y; }
    // 위성 (맨 위)
    const payFail = g.st === 'done' && !g.ok;
    { ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(sx, yy - 30); ctx.lineTo(sx + 12, yy); ctx.lineTo(sx - 12, yy); ctx.closePath(); ctx.fill(); D.sphere(sx, yy - 10, 5, '#ffd447', { gloss: false, outline: '#fff', outlineWidth: 1 }); }
    if (g.st === 'done') { if (g.ok) D.ring(sx, yy - 14, 26, S.clock, { color: GREEN, width: 2.5 }); else T(sx + 26, yy - 8, '❌', 18, '#b91c1c', 'left', 800); }
    // 불꽃
    rolls.forEach(([fx0, fy0, sc]) => { const fl = 18 + 30 * sc + Math.sin(S.clock * 40) * 3; D.glow(fx0, fy0 + fl * 0.5, 34, '#ffa733', 0.4); const gg = ctx.createLinearGradient(0, fy0, 0, fy0 + fl); gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.4, '#ffa733'); gg.addColorStop(1, 'rgba(255,80,30,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(fx0 - 9 * sc, fy0); ctx.quadraticCurveTo(fx0, fy0 + fl * 1.2, fx0 + 9 * sc, fy0); ctx.closePath(); ctx.fill(); });
    // 도착/실패 표시
    const gx = PHONE ? c.x + 150 : c.x + 190, gw = c.w - (gx - c.x) - 10;
    ctx.restore();
    // 그래프 (가속도–시간)
    const gr = PHONE ? { x: c.x + 130, y: c.y + 8, w: c.w - 138, h: c.h - 16 } : { x: c.x + 190, y: c.y, w: c.w - 190, h: c.h };
    card(gr.x, gr.y, gr.w, gr.h);
    const ml = 42, mr = 12, mt = 34, mb = 30, ix = gr.x + ml, iy = gr.y + mt, iw = gr.w - ml - mr, ih2 = gr.h - mt - mb;
    const maxA = Math.max(0.1, ...M.segs.map((q, i) => 1 / (i < M.segs.length - 1 ? q.m1 - q.st : q.m1)));
    const AY = [0.2, 0.4, 0.6].find((v) => v >= maxA * 1.04) || 0.6, GX = (t) => ix + iw * t / SG_FUEL, GY = (a) => iy + ih2 - ih2 * clamp(a / AY, 0, 1);
    for (let a = 0; a <= AY + 1e-9; a += 0.1) { ctx.strokeStyle = a === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = a === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, GY(a)); ctx.lineTo(ix + iw, GY(a)); ctx.stroke(); T(ix - 6, GY(a) + 5, a.toFixed(1), 13, '#3a465c', 'right', 800); }
    [0, 30, 60, 90].forEach((t) => { ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.beginPath(); ctx.moveTo(GX(t), iy); ctx.lineTo(GX(t), iy + ih2); ctx.stroke(); T(GX(t), iy + ih2 + 17, String(t), 13, '#3a465c', 'center', 800); });
    T(gr.x + 10, gr.y + 22, PHONE ? '가속도 a = 추력 / 질량' : '가속도 a = 추력 / 질량 (상대값)  —  가로: 연료를 쓴 양', 13.5, '#26324a', 'left', 800);
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy - 4, iw, ih2 + 8); ctx.clip();
    // 단일 로켓(비교, 회색 점선)
    const one = sgModel([{ fuel: 90, st: 9 }]); ctx.strokeStyle = '#a3aec2'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath();
    for (let t = 0; t <= 90; t += 1.5) { const m = SG_MASS - t; t ? ctx.lineTo(GX(t), GY(1 / m)) : ctx.moveTo(GX(t), GY(1 / m)); } ctx.stroke(); ctx.setLineDash([]);
    // 내 설계
    const tShow = g.st === 'ready' ? 90 : g.t; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3.5; ctx.beginPath(); let started = false;
    M.segs.forEach((q) => { const ta = q.t0, tb = Math.min(q.t1, tShow); if (tb <= ta) return; for (let t = ta; t <= tb + 1e-9; t += 0.75) { const tt = Math.min(t, tb), m = q.m0 - (tt - q.t0); if (!started) { ctx.moveTo(GX(tt), GY(1 / m)); started = true; } else ctx.lineTo(GX(tt), GY(1 / m)); if (tt === tb) break; } if (tb >= q.t1 - 1e-9) { const mnext = q.m1 - q.st; ctx.lineTo(GX(q.t1), GY(1 / mnext)); } });
    ctx.stroke();
    if (g.st === 'run') D.sphere(GX(g.t), GY(now.a), 6, '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    ctx.restore();
    ctx.strokeStyle = '#a3aec2'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(gr.x + gr.w - 190, gr.y + 20); ctx.lineTo(gr.x + gr.w - 164, gr.y + 20); ctx.stroke(); ctx.setLineDash([]);
    if (!PHONE) { T(gr.x + gr.w - 158, gr.y + 25, '단일 로켓(비교)', 13, '#5a6679', 'left', 800); }
    // 단 분리 지점 표시
    M.segs.forEach((q, i) => { if (i < M.segs.length - 1) { ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(GX(q.t1), iy); ctx.lineTo(GX(q.t1), iy + ih2); ctx.stroke(); ctx.setLineDash([]); T(GX(q.t1) + 3, iy + 14, (i + 1) + '단 분리', 13, '#b91c1c', 'left', 800); } });
    // 결과 라벨
    if (g.st === 'done') D.label(gr.x + gr.w / 2, gr.y + gr.h - 52 < iy + 40 ? iy + 40 : iy + ih2 * 0.45, g.ok ? '궤도 속력에 도달! 위성을 올렸어요 ✅' : '속력이 모자라요: 위성이 궤도에 못 올라요 ❌', { bg: g.ok ? 'rgba(20,160,88,.95)' : 'rgba(185,28,28,.92)', size: 14, pad: 10 });
    parts.update(dt); parts.draw(ctx);
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13.5 : 14.5, lh = PHONE ? 25 : 29;
    T(x0, PY + 28, '🎯 궤도 속력 달성도 (상대 점수)', 15, '#26324a', 'left', 800);
    const bw = PHONE ? PW - 150 : 360, bx0 = x0 + 4, by = PY + 46;
    const liveScore = g.st === 'ready' ? model.score : (g.st === 'done' ? model.score : g.v / SG_REQ * 100);
    const barMax = 130;
    [['단일 로켓(비교)', SG_BASE, '#94a3b8', 0], ['내 설계 (' + g.n + '단)', liveScore, g.st === 'ready' ? '#cbd5e6' : (liveScore >= 100 ? GREEN : ORANGE), 1]].forEach((q, i) => {
      const yy = by + i * 48; T(x0, yy + 12, q[0], 14, '#26324a', 'left', 800);
      hbar(bx0, yy + 20, bw, 16, q[1], barMax, q[2]); T(bx0 + bw + 10, yy + 33, Math.round(q[1]) + ' %', 14, '#26324a', 'left', 800);
    });
    const lx = bx0 + bw * 100 / barMax; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, by + 16); ctx.lineTo(lx, by + 48 + 40); ctx.stroke(); T(lx, by + 104, '100 % = 궤도 속력', 13, '#1e293b', 'center', 800);
    lines(x0, by + 128, lh - 3, fs - 1, [
      ['단을 버리면 질량이 줄어 같은 추력으로도 가속도가 껑충 커져요.', '#26324a'],
      ['점수는 비교용 상대값이에요 (로켓 방정식은 다루지 않아요).', '#5a6679'],
    ].slice(0, PHONE ? 2 : 2));
  }

  /* ================= 컨트롤 연결 ================= */
  const ORD_C = [
    '발사대에서 추력이 무게보다 커져 이륙해요',
    '수직으로 올라가 두꺼운 대기를 빨리 벗어나요',
    '서서히 기울여 수평 방향으로 속력을 올려요',
    '수평 속력이 약 7.7 km/s에 이르면 엔진을 꺼요',
    '엔진 없이 지구로 계속 떨어지며 원 궤도를 돌아요 (자유 낙하)',
  ];
  const RULES_C = [[0, 1], [1, 2], [2, 3], [3, 4]];
  const ordV = (ord, rules) => { const pos = {}; ord.forEach((id, i) => { pos[id] = i; }); return rules.filter(([a, b]) => pos[a] > pos[b]); };
  const ordSigC = { v: '' };
  function renderOrderC() {
    const ord = S.ordC, bad = S.ordBadC, sig = ord.join() + '|' + Object.keys(bad).join();
    if (sig === ordSigC.v) return; ordSigC.v = sig;
    const box = $('#ordC'); box.innerHTML = '';
    ord.forEach((id, pos) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;border:2px solid ' + (bad[id] ? 'var(--bad)' : 'var(--line)') + ';border-radius:12px;background:' + (bad[id] ? 'var(--bad-soft)' : '#fff');
      const nm = document.createElement('b'); nm.textContent = String(pos + 1); nm.style.cssText = 'flex:none;width:22px;text-align:center;color:var(--muted)';
      const tx = document.createElement('div'); tx.textContent = ORD_C[id]; tx.style.cssText = 'flex:1;font-size:13.5px;font-weight:700;line-height:1.3';
      const mk = (lab, d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.style.cssText = 'flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-weight:900;cursor:pointer'; b.setAttribute('aria-label', ORD_C[id] + (d < 0 ? ' 위로' : ' 아래로')); b.disabled = (d < 0 && pos === 0) || (d > 0 && pos === ord.length - 1); b.addEventListener('click', () => moveC(pos, d)); return b; };
      row.append(nm, tx, mk('▲', -1), mk('▼', 1)); box.appendChild(row);
    });
  }
  function moveC(pos, d) { const a = S.ordC, j = pos + d; if (j < 0 || j >= a.length) return; const t = a[pos]; a[pos] = a[j]; a[j] = t; S.ordBadC = {}; Sound.click(); updateCtl(); }
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };

  /* 정적 버튼 만들기 */
  (function buildBtns() {
    const seg = $('#plSeg');
    BODIES.forEach((b, i) => { const x = document.createElement('button'); x.type = 'button'; x.dataset.pl = i; x.textContent = b.n; seg.appendChild(x); });
    const row = $('#predRow');
    GASES.forEach((g, i) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-sm'; x.dataset.pg = i; row.appendChild(x); });
  })();
  const PRED_TXT = ['?', '남아요', '빠져나가요'];
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const w = S.w;
    $('#oV0').textContent = w.v0.toFixed(1) + ' km/s'; setSl('sV0', w.v0, 6, 12);
    $('#bWL').disabled = w.st === 'run';
    $$('#plSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.pl === S.pl.i));
    $$('#predRow button').forEach((x) => { const gi = +x.dataset.pg; x.textContent = GASES[gi].n + ': ' + PRED_TXT[S.pl.pred[gi]]; x.classList.toggle('btn-primary', S.pl.pred[gi] !== 0); });
    const a = S.as;
    $$('#amSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.am === a.m));
    $('#oAv').textContent = a.v + ' m/s'; setSl('sAv', a.v, 4, 16); $('#bAT').disabled = a.st === 'fly';
    const r = S.rk;
    $$('#rkEnv button').forEach((x) => x.classList.toggle('on', x.dataset.env === r.env));
    $('#oRu').textContent = r.u; setSl('sRu', r.u, 1, 5); $('#oRf').textContent = r.f; setSl('sRf', r.f, 1, 5);
    $('#bRF').textContent = r.firing ? '⏹ 분출 멈추기' : '🔥 분출 시작';
    const l = S.ln;
    $$('#lnPath button').forEach((x) => x.classList.toggle('on', x.dataset.lp === l.path));
    $$('#lnDir button').forEach((x) => x.classList.toggle('on', x.dataset.ld === l.dir));
    $('#bLP').textContent = l.playing ? '⏸ 진행 중' : (l.p >= 1 ? '▶ 다시 발사' : '▶ 발사'); $('#bLP').disabled = l.playing;
    const g = S.sg;
    $$('#sgN button').forEach((x) => x.classList.toggle('on', +x.dataset.sn === g.n));
    const s1max = g.n === 3 ? 70 : 70; $('#sS1').max = s1max;
    $('#oS1').textContent = g.s1 + ' %'; setSl('sS1', g.s1, 20, 70);
    const s2max = Math.max(10, 90 - g.s1); $('#sS2').max = s2max; if (g.s2 > s2max) g.s2 = s2max;
    $('#oS2').textContent = g.s2 + ' %'; setSl('sS2', g.s2, 10, s2max);
    $('#s2wrap').hidden = g.n !== 3; $('#sS1').closest('.control').querySelector('.control-head').style.display = g.n === 1 ? 'none' : ''; $('#sS1').closest('.range-row').style.display = g.n === 1 ? 'none' : '';
    $('#bSG').disabled = g.st === 'run';
    if (g.n === 1) { /* 1단은 연료 전부 */ }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sV0').addEventListener('input', (e) => { S.w.v0 = +e.target.value; wReady(); updateCtl(); });
  $('#bWL').addEventListener('click', wLaunch);
  $('#bWR').addEventListener('click', () => { Sound.click(); wReady(); updateCtl(); });
  $$('#plSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); plSelect(+x.dataset.pl); }));
  $$('#predRow button').forEach((x) => x.addEventListener('click', () => { Sound.click(); const gi = +x.dataset.pg; S.pl.pred[gi] = (S.pl.pred[gi] + 1) % 3; if (S.pl.pred[gi] === 0) S.pl.pred[gi] = 1; updateCtl(); }));
  $('#bPred').addEventListener('click', plCheck);
  $$('#amSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.as.m = +x.dataset.am; asReady(); updateCtl(); }));
  $('#sAv').addEventListener('input', (e) => { S.as.v = +e.target.value; asReady(); updateCtl(); });
  $('#bAT').addEventListener('click', asThrow);
  $('#bAR').addEventListener('click', () => { Sound.click(); asReady(); updateCtl(); });
  $$('#rkEnv button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.rk.env = x.dataset.env; rkReset(); updateCtl(); }));
  $('#sRu').addEventListener('input', (e) => { S.rk.u = +e.target.value; S.rk.burn = 0; updateCtl(); });
  $('#sRf').addEventListener('input', (e) => { S.rk.f = +e.target.value; S.rk.burn = 0; updateCtl(); });
  $('#bRF').addEventListener('click', rkToggle);
  $('#bRR').addEventListener('click', () => { Sound.click(); rkReset(); });
  $$('#lnPath button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ln.path = x.dataset.lp; lnReset(); }));
  $$('#lnDir button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ln.dir = x.dataset.ld; lnReset(); }));
  $('#bLP').addEventListener('click', lnPlay);
  $('#bLR').addEventListener('click', () => { Sound.click(); lnReset(); });
  $$('#sgN button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.sg.n = +x.dataset.sn; sgReset(); }));
  $('#sS1').addEventListener('input', (e) => { S.sg.s1 = +e.target.value; sgReset(); });
  $('#sS2').addEventListener('input', (e) => { S.sg.s2 = +e.target.value; sgReset(); });
  $('#bSG').addEventListener('click', sgLaunch);
  $('#bSR').addEventListener('click', () => { Sound.click(); sgReset(); });
  ['iC0', 'iC1', 'iC2', 'iC3'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'well') {
      const w = S.w, E = etot(w.v0);
      L1 = '발사 속력 v₀'; a = w.v0.toFixed(1) + ' km/s'; L2 = '총 에너지 E합'; b = fx(E, 1) + ' MJ/kg';
      L3 = '판정'; c = E >= 0 ? '탈출해요 (E합 ≥ 0)' : '되돌아와요 (최고 ' + sci(hmaxOf(w.v0), 1) + ' km)';
    } else if (S.mode === 'planet') {
      const p = S.pl, bd = BODIES[p.i];
      if (showCalc('calc')) { L1 = '탈출 속도'; a = '직접 계산해요'; L2 = '표면 원 궤도 속력'; b = '—'; L3 = '식'; c = 'v = √(2GM / R)'; }
      else {
        L1 = bd.n + '의 탈출 속도'; a = bd.vesc.toFixed(1) + ' km/s'; L2 = '표면 원 궤도 속력'; b = (bd.vesc / Math.SQRT2).toFixed(1) + ' km/s'; L3 = '탈출 / 원 궤도'; c = '√2배';
      }
    } else if (S.mode === 'astro') {
      const as = S.as, m = as.st === 'ready' ? as.m : as.cm, v = as.st === 'ready' ? as.v : as.cv, th = as.st !== 'ready';
      L1 = '공의 운동량'; a = th ? '+' + m * v + ' kg·m/s' : '0'; L2 = '우주인의 운동량'; b = th ? MINUS + m * v + ' kg·m/s' : '0'; L3 = '운동량의 합'; c = '0 (보존)';
    } else if (S.mode === 'rocket') {
      const r = S.rk, th = rkThrust();
      L1 = '추력 = 속력 × 분출량'; a = r.u + ' × ' + r.f + ' = ' + th; L2 = r.env === 'pad' ? '무게' : '로켓 속력 (상대)'; b = r.env === 'pad' ? String(WEIGHT) : r.vel.toFixed(0);
      L3 = '상태'; c = r.env === 'pad' ? (r.y > 1 ? '날아올라요' : (r.firing ? (th > WEIGHT ? '추력 > 무게' : '추력 ≤ 무게') : '대기')) : (r.firing ? '가속 중' : '분출 멈춤');
    } else if (S.mode === 'launch') {
      const l = S.ln, E = l.dir === 'E';
      L1 = '로켓이 낼 속력'; a = (E ? V_ORB - V_ROT : V_ORB + V_ROT).toFixed(2) + ' km/s'; L2 = '발사 방향'; b = E ? '동쪽 (자전 도움)' : '서쪽 (자전 반대)';
      L3 = '수평 속력'; c = (l.path === 'orbit' ? lnSpeed(l.p) : 0).toFixed(1) + ' km/s';
    } else {
      const g = S.sg, mm = g.st === 'ready' ? sgModel(sgPlan()) : g.model;
      L1 = '로켓의 단 수'; a = g.n + '단'; L2 = '달성도'; b = (g.st === 'run' ? Math.round(g.v / SG_REQ * 100) : Math.round(mm.score)) + ' %';
      L3 = '결과'; c = g.st === 'done' ? (g.ok ? '궤도 도달 ✅' : '속력 부족 ❌') : (g.st === 'run' ? '비행 중' : '발사 전');
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  function clr(...ids) { ids.forEach((id) => { const e = $('#' + id); e.value = ''; e.classList.remove('ok', 'bad'); }); }
  const hk = (v) => sci(hmaxOf(v), 1);
  const PNAMES = PBODIES.map((i) => BODIES[i].n);
  function resetPlanet(i) { const p = S.pl; p.i = i; p.pred = [0, 0, 0]; p.checked = {}; p.open = {}; p.lid = 1; plInit(); }

  const levels = [
    {
      title: '탈출 조건: 에너지 보존', short: '탈출 조건', icon: '📈', phase: '탐구',
      intro: '<p class="si-q">❓ 탐구 질문: 지구에서 우주선을 얼마나 빠르게 쏘아야 다시 돌아오지 않을까? 무거운 우주선은 더 빨리 쏘아야 할까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 중력 위치 에너지 mgh와 역학적 에너지 보존을 배웠고, 앞 차시에서는 지표 근처 원 궤도 속력이 <b>7.9 km/s</b>임을 구했어요. 이제 우주선이 지구에서 아주 멀리 올라가는 문제로 넓혀요. 높이가 크게 변하면 mgh 대신 <b>E_p = −GMm/r</b>을 써야 해요.</div>' +
        '<p>발사 속력을 정해 우주선을 <b>연직 위로</b> 쏘아 보세요. 파란 곡선은 위치 에너지, 주황 선은 총 에너지예요. 총 에너지 선이 곡선과 <b>만나는 곳이 최고점</b>이고, 만나지 못하면 영원히 멀어져요. 공기 저항과 지구 자전은 무시해요.</p>',
      features: ['well'],
      setup() { const w = S.w; w.v0 = 8; w.rec = []; w.retSeen = false; w.escSeen = false; wReady(); setScene('well'); },
      recap: 'E_p = −GMm/r (무한히 먼 곳이 0)이고 총 에너지 ½mv² − GMm/R이 0 이상이면 되돌아오지 않아요. 그 경계의 속력이 탈출 속도 √(2GM/R) = 11.2 km/s예요.',
      summary: '<ul><li><b>위치 에너지</b>: 무한히 먼 곳을 0으로 두면 <b>E_p = −GMm/r</b> (항상 음수). 높이 h가 지구 반지름보다 아주 작을 때만 ΔE_p ≈ mgh예요 (h = 10 km: ' + (10e3 / RE * 100).toFixed(1) + ' %, 100 km: ' + (100e3 / RE * 100).toFixed(1) + ' %, 1000 km: ' + (1000e3 / RE * 100).toFixed(1) + ' % 차이).</li>' +
        '<li><b>에너지 보존</b>: ½mv² − GMm/r = 일정. 발사 때 총 에너지 E = ½mv₀² − GMm/R이 <b>음수</b>이면 E_p = E인 최고점에서 되돌아와요 (8 km/s → 약 ' + hk(8) + ' km, 10 km/s → 약 ' + hk(10) + ' km, 11 km/s → 약 ' + hk(11) + ' km).</li>' +
        '<li><b>탈출 조건</b>: E ≥ 0. 경계 E = 0에서 ½mv² = GMm/R → <b>v탈출 = √(2GM/R) = 11.2 km/s</b> (지표 원 궤도 속력 7.9 km/s의 √2배).</li>' +
        '<li>양변에서 <b>m이 약분</b>돼요. 탈출 속도는 우주선의 질량과 관계없이 천체의 M과 R로만 정해져요.</li></ul>',
      missions: [
        {
          title: '발사 속력 세 가지로 최고 고도 기록하기',
          goal: '서로 다른 발사 속력 <b>세 가지</b>(0.4 km/s 이상 차이)로 우주선을 쏘아 <b>최고 고도</b>가 기록표에 쌓이게 하세요.',
          hint: '예: 8, 10, 11 km/s. 슬라이더를 정하고 🚀 발사를 누르면 최고점에 도달할 때 기록돼요(한 번 쏘는 데 몇 초 걸려요).',
          setup() { S.w.rec = []; wReady(); setScene('well'); },
          check: () => S.w.rec.length >= 3,
          hold: 0.5,
          status: () => '기록한 속력 ' + Math.min(3, S.w.rec.length) + ' / 3',
          explain: '발사 속력이 조금만 커져도 최고 고도가 크게 늘어요: 8 km/s → 약 ' + hk(8) + ' km, 10 km/s → 약 ' + hk(10) + ' km, 11 km/s → 약 ' + hk(11) + ' km. 세 경우 모두 총 에너지가 음수라서 최고점에서 멈추고 되돌아와요.',
        },
        {
          title: '되돌아오지 않는 가장 작은 속력 찾기',
          goal: '<b>11 km/s 근처</b>에서 속력을 0.1 km/s씩 바꿔 가며 쏘아 보세요. 되돌아오는 마지막 속력과 <b>탈출하는 첫 속력</b>을 찾아요.',
          hint: '11.0 → 11.1 → 11.2 km/s 순서로 쏘아 보세요. 11.1 km/s까지는 아주 멀리 갔다가 되돌아오고, 한 단계 위에서는 주황 선이 곡선과 만나지 않아요.',
          setup() { const w = S.w; w.v0 = 11.0; w.retSeen = false; w.escSeen = false; wReady(); setScene('well'); },
          check: () => S.w.retSeen && S.w.escSeen,
          hold: 0.4,
          status: () => mark(S.w.retSeen) + ' 11.0 km/s 이상에서 되돌아옴 &nbsp; ' + mark(S.w.escSeen) + ' 11.2 km/s 탈출',
          explain: 'v₀ = 11.1 km/s에서는 총 에너지가 아주 조금 음수라서 약 ' + hk(11.1) + ' km까지 갔다가 되돌아와요. <b>v₀ = 11.2 km/s</b>부터는 E ≥ 0이라 최고점이 없어요. 정확한 값은 √(2GM/R) = <b>11.18 km/s ≈ 11.2 km/s</b>예요.',
        },
        {
          type: 'quiz', title: '탈출 속도와 우주선의 질량',
          goal: '우주선의 질량을 <b>2배</b>로 키우면 지구의 탈출 속도는 어떻게 될까요?',
          setup() { setScene('well'); },
          choices: ['무거운 만큼 2배 빠르게 쏘아야 해요', '같아요. ½mv²와 GMm/R 양쪽에 m이 있어서 약분돼요', '절반으로 줄어요', '무거울수록 중력이 커서 √2배가 돼요'],
          answer: 1,
          feedback: ['무거워지면 중력도 커지지만 운동 에너지도 같은 비율로 커져요. ½mv² = GMm/R에서 m이 약분돼요.', '', '질량이 커져도 탈출 속도는 줄지 않아요. 식에 m이 없어요.', 'v = √(2GM/R)에는 우주선의 질량 m이 들어 있지 않아요.'],
          explain: '½mv² − GMm/R = 0에서 양변의 <b>m이 약분</b>되어 v = √(2GM/R)이에요. 탈출 속도는 우주선의 질량이 아니라 <b>천체의 질량 M과 반지름 R</b>로 정해져요.',
        },
      ],
    },
    {
      title: '행성 비교: 탈출 속도와 대기', short: '행성 비교', icon: '🪐', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탈출 속도 v = √(2GM/R)를 얻었어요. 이 식은 M과 R만 알면 어느 천체에든 쓸 수 있어요. 이제 행성마다 탈출 속도가 어떻게 다른지, 그것이 <b>대기의 성분</b>과 어떤 관계인지 살펴봐요.</div>' +
        '<p>지구에는 수소가 거의 없는데 목성은 수소로 가득해요. 천체별 탈출 속도를 계산해 비교하고, 기체 분자의 <b>열운동 속력</b>과 견주어 어떤 기체가 대기에 남을지 예측해요. 분자 속력은 주어진 값을 크기만 비교해요.</p>',
      features: ['planet'],
      setup() { setFlag('pred', false); setFlag('calc', false); resetPlanet(5); setScene('planet'); },
      recap: '탈출 속도는 천체마다 달라요 (달 2.4, 화성 5.0, 지구 11.2, 목성 59.5 km/s). 분자 속력의 약 6배가 탈출 속도보다 크면 그 기체는 대기에서 빠져나가요.',
      summary: '<ul><li><b>탈출 속도 √(2GM/R)</b>: 달 2.4, 타이탄 2.6, 수성 4.3, 화성 5.0, 금성 10.4, 지구 11.2, 목성 59.5, 태양 618 km/s. M이 크고 R이 작을수록 커요.</li>' +
        '<li>기체 분자의 열운동 속력(300 K): H₂ 1.9, N₂ 0.52, CO₂ 0.41 km/s. 같은 온도에서 <b>가벼운 분자일수록 빠르고</b>, 온도가 높을수록 빨라요.</li>' +
        '<li><b>경험 기준(대략)</b>: 탈출 속도가 분자 속력의 약 <b>6배</b>보다 크면 수십억 년 동안 대기에 남고, 작으면 서서히 우주로 빠져나가요.</li>' +
        '<li>지구: H₂는 서서히 빠져나가 거의 없고 N₂·O₂·CO₂는 남아요. 달(2.4 km/s)은 거의 모든 기체를 잃어 대기가 없어요. 화성은 무거운 CO₂를 유지하고 H₂는 잃어요. 목성(59.5 km/s)은 H₂를 붙잡아 대기의 주성분이에요. 타이탄은 탈출 속도가 낮아도 매우 차가워(약 94 K) N₂ 대기를 유지해요.</li></ul>',
      missions: [
        {
          title: '네 행성의 탈출 속도 계산하기', manual: true,
          goal: '아래 표의 M, R로 <b>수성·금성·화성·목성</b>의 탈출 속도 √(2GM/R)을 계산해 km/s 단위로 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'v = √(2 × 6.67×10⁻¹¹ × M / R) (m/s)를 구하고 1000으로 나눠 km/s로 바꿔요. 예: 달 (M = 7.35×10²², R = 1.737×10⁶)은 2.4 km/s예요.',
          setup() { setFlag('pred', false); setFlag('calc', true); clr('iC0', 'iC1', 'iC2', 'iC3'); resetPlanet(2); setScene('planet'); },
          check() {
            const ans = CALCB.map((i) => BODIES[i].vesc), xs = ['iC0', 'iC1', 'iC2', 'iC3'].map(num);
            if (xs.some((x) => x == null)) return '네 칸에 모두 숫자를 입력해 주세요. (km/s 단위)';
            const oks = xs.map((x, i) => Math.abs(x - ans[i]) <= Math.max(0.15, ans[i] * 0.03));
            fb(xs.map((x, i) => [$('#iC' + i), oks[i]]));
            if (oks.every(Boolean)) return true;
            const bi = oks.findIndex((o) => !o), x = xs[bi], a = ans[bi];
            if (Math.abs(x - a / Math.SQRT2) <= a * 0.04) return '붉은 칸은 √(GM/R)에 가까워요. 탈출 속도는 표면 원 궤도 속력의 √2배(2GM/R)예요.';
            if (x > a * 20 || x < a / 20) return '단위를 확인해요. m/s로 구했다면 1000으로 나눠 km/s로 바꿔요.';
            return '붉은 칸을 다시 계산해 보세요. v = √(2GM / R), G = 6.67 × 10⁻¹¹이고 R은 m 단위예요.';
          },
          status: () => '입력 ' + ['iC0', 'iC1', 'iC2', 'iC3'].filter((id) => $('#' + id).value.trim()).length + ' / 4',
          explain: '수성 √(2 × 6.67×10⁻¹¹ × 3.30×10²³ / 2.44×10⁶) = <b>4.3 km/s</b>, 금성 <b>10.4 km/s</b>, 화성 <b>5.0 km/s</b>, 목성 <b>59.5 km/s</b>예요. 모두 그 천체 표면 원 궤도 속력의 √2배예요. 목성은 질량이 커서 지구의 약 5배예요.',
        },
        {
          title: '남을 기체 예측하고 확인하기',
          goal: '<b>지구·달·화성·목성·타이탄</b>에서 H₂, N₂, CO₂가 남을지 눌러 예측하고 🔍 결과 보기를 누르세요. 다섯 천체 모두 맞히면 성공이에요.',
          hint: '막대(분자 속력의 6배)가 검은 선(탈출 속도)보다 짧으면 남아요. 천체마다 온도가 달라 분자 속력도 달라요(타이탄은 매우 차가워요). 틀리면 뚜껑이 열리니 결과를 보고 다시 골라요.',
          setup() { setFlag('calc', false); setFlag('pred', true); resetPlanet(PBODIES[0]); setScene('planet'); },
          check: () => PBODIES.every((i) => S.pl.checked[i] && S.pl.checked[i].ok),
          hold: 0.4,
          status: () => PBODIES.map((i) => mark(S.pl.checked[i] && S.pl.checked[i].ok) + ' ' + BODIES[i].n).join(' &nbsp;'),
          explain: '지구는 H₂만 빠져나가고, 달은 세 기체 모두 빠져나가요. 화성은 H₂만 잃고 N₂·CO₂를 남겨요. 목성은 세 기체를 모두 붙잡아요. 타이탄은 탈출 속도가 2.6 km/s로 낮아도 약 94 K로 차가워 분자가 느려서 N₂와 CO₂를 남기고 H₂만 잃어요.',
        },
        {
          type: 'quiz', title: '수소가 지구에는 거의 없고 목성에는 가득한 까닭',
          goal: '지구에는 수소(H₂)가 거의 없는데 <b>목성</b>은 대기의 대부분이 수소예요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setFlag('pred', false); setFlag('calc', false); resetPlanet(6); setScene('planet'); },
          choices: ['지구는 수소를 모두 써 버렸고 목성은 쓰지 않았기 때문이에요', '수소는 무거워서 지구에서는 땅속으로 가라앉기 때문이에요', '목성은 탈출 속도(59.5 km/s)가 매우 커서 가벼운 수소도 붙잡아 두지만, 지구(11.2 km/s)에서는 가벼워 빠른 수소가 서서히 빠져나가기 때문이에요', '목성이 훨씬 뜨거워서 수소가 많이 만들어지기 때문이에요'],
          answer: 2,
          feedback: ['쓰고 안 쓰고의 문제가 아니에요. 대기에 남느냐는 분자 속력과 탈출 속도의 비교로 정해져요.', '수소는 가장 가벼운 분자라서 같은 온도에서 가장 빨라요. 그래서 오히려 가장 먼저 빠져나가요.', '', '목성의 구름 꼭대기는 약 165 K로 차가워요. 온도가 높아지면 분자가 빨라져 대기를 유지하기 불리해요.'],
          explain: '같은 온도에서 H₂는 가장 가벼워 가장 빨라요(300 K에서 1.9 km/s). 지구(11.2 km/s)에서는 6 × 1.9 ≈ 11.6 km/s가 탈출 속도를 넘어 서서히 빠져나가지만, 목성(59.5 km/s)에서는 붙잡아요. 달(2.4 km/s)처럼 탈출 속도가 낮은 천체는 무거운 기체도 잃어 대기가 거의 없어요.',
        },
      ],
    },
    {
      title: '로켓 원리: 운동량 보존', short: '로켓 원리', icon: '🔥', phase: '설명',
      intro: '<div class="si-link">🔗 <b>물리학에서</b> 서로 밀면 두 물체가 반대 방향으로 움직이고 전체 운동량의 합은 변하지 않는다고 배웠어요(작용 반작용, 운동량 보존). 우주 공간에는 밀고 나갈 땅도 공기도 없는데 로켓은 어떻게 앞으로 갈까요?</div>' +
        '<p class="si-q">❓ 탐구 질문: 로켓은 우주의 진공에서 무엇을 밀면서 날아갈까?</p>' +
        '<p>먼저 우주 공간의 우주인이 공을 던지는 장면으로 운동량 보존을 확인하고, 이어서 로켓의 가스 분출로 넘어가요. 이 단계는 <b>정성적</b>으로만 다뤄요(로켓 방정식은 없어요).</p>',
      features: ['astro', 'rocket'],
      setup() { asReady(); S.as.thrown = []; rkReset(); S.rk.seenU = { lo: false, hi: false }; S.rk.seenF = { lo: false, hi: false }; S.rk.lifted = false; S.rk.env = 'space'; setScene('astro'); },
      recap: '공을 앞으로 던지면 우주인이 뒤로 밀려나듯, 로켓은 가스를 뒤로 분출하며 앞으로 나아가요. 가스와 로켓의 운동량은 크기가 같고 방향이 반대라 합은 0이에요. 이륙하려면 추력이 무게보다 커야 해요.',
      summary: '<ul><li>정지한 우주인이 공을 던지면 <b>공의 운동량 +p, 우주인의 운동량 −p</b>로 합이 처음과 같은 0이에요. 공이 무겁거나 빠를수록 우주인은 더 빨리 물러나요.</li>' +
        '<li>로켓은 연료를 태운 <b>가스를 뒤로 분출</b>해요. 가스가 뒤쪽 운동량을 얻은 만큼 로켓은 앞쪽으로 같은 크기의 운동량을 얻어요(작용 반작용). 합은 0이에요.</li>' +
        '<li>밀어내는 대상은 <b>분출한 가스</b>이지 공기나 발사대가 아니에요. 그래서 공기가 없는 진공에서도 가속해요.</li>' +
        '<li>분출 속력이 클수록, 분출량이 많을수록 추력이 커서 가속이 커요. 이륙하려면 <b>추력 &gt; 무게(mg)</b>가 되어 알짜힘이 위쪽이어야 해요.</li></ul>',
      missions: [
        {
          title: '공을 던지고 가스를 뿜어 확인하기',
          goal: '<b>🧑‍🚀 우주인과 공</b>에서 서로 다른 공을 두 번 던지고, <b>🔥 로켓 분출</b>에서 분출 속력과 분출량을 작게·크게 바꿔 비교한 뒤, 발사대에서 로켓을 이륙시키세요.',
          hint: '우주인: 공의 질량이나 속력을 바꿔 두 번 던져요. 로켓(우주 공간): 분출 속력을 1~2와 4~5로, 분출량도 1~2와 4~5로 바꿔 1초 이상 분출해요. 발사대: 추력(속력 × 분출량)이 무게 10보다 크게 해요(예: 4 × 3).',
          setup() { asReady(); S.as.thrown = []; rkReset(); S.rk.seenU = { lo: false, hi: false }; S.rk.seenF = { lo: false, hi: false }; S.rk.lifted = false; S.rk.env = 'space'; setScene('astro'); },
          check: () => S.as.thrown.length >= 2 && S.rk.seenU.lo && S.rk.seenU.hi && S.rk.seenF.lo && S.rk.seenF.hi && S.rk.lifted,
          hold: 0.4,
          status: () => mark(S.as.thrown.length >= 2) + ' 공 두 번 던지기 &nbsp; ' + mark(S.rk.seenU.lo && S.rk.seenU.hi) + ' 분출 속력 비교 &nbsp; ' + mark(S.rk.seenF.lo && S.rk.seenF.hi) + ' 분출량 비교 &nbsp; ' + mark(S.rk.lifted) + ' 발사대 이륙',
          explain: '우주인과 공의 운동량은 크기가 같고 방향이 반대여서 합이 늘 0이에요. 로켓도 같아요: 가스의 운동량(뒤쪽)과 로켓의 운동량(앞쪽)이 같은 크기라서 합이 0이에요. 분출 속력과 분출량이 클수록 추력이 커서 가속이 커지고, 지구에서는 <b>추력이 무게보다 클 때</b> 알짜힘이 위쪽이 되어 이륙해요.',
        },
        {
          type: 'quiz', title: '진공에서 로켓이 가속하는 까닭',
          goal: '공기가 없는 우주 공간에서도 로켓이 앞으로 가속하는 까닭은?',
          setup() { rkReset(); S.rk.env = 'space'; setScene('rocket'); },
          choices: ['로켓이 발사대나 공기를 밀면서 올라가기 때문이에요', '우주에는 중력이 없어서 가만히 있어도 움직이기 때문이에요', '로켓이 가스를 뒤로 내보내면 가스가 로켓을 앞으로 미는 반작용을 받고, 운동량의 합이 0으로 보존되기 때문이에요', '분출한 가스가 우주 공간의 먼지를 밀기 때문이에요'],
          answer: 2,
          feedback: ['밀어내는 것은 로켓 안의 연료가 만든 가스예요. 우주에는 밀 공기도 땅도 없어요.', '중력이 없어도 정지한 물체는 가만히 있어요(관성). 힘을 받아야 가속해요.', '', '먼지는 거의 없고, 로켓이 미는 것은 자기가 내보낸 가스예요.'],
          explain: '로켓은 <b>자기가 분출한 가스</b>를 뒤로 밀어내고, 그 반작용으로 앞으로 밀려요. 가스가 뒤쪽 운동량을 얻은 만큼 로켓이 앞쪽 운동량을 얻어 합은 0으로 보존돼요. 그래서 공기가 없는 진공에서도 가속해요.',
        },
      ],
    },
    {
      title: '궤도 진입: 수평 속력과 다단 로켓', short: '궤도 진입', icon: '🛰️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 로켓이 가스를 뒤로 분출해 앞으로 나아가는 원리를 알았어요. 앞 차시에서 고도 400 km의 원 궤도 속력은 약 <b>7.7 km/s</b>였어요. 높이 올라가기만 하면 위성이 될까요?</div>' +
        '<p>발사 순서를 따라가며 로켓이 왜 옆으로 기울어 가속하는지, 왜 동쪽으로 쏘는지, 왜 여러 단으로 만드는지 알아봐요. 이 단계도 <b>정성적</b>이에요(점수는 비교용 상대값).</p>',
      features: ['launch', 'stage'],
      setup() { const l = S.ln; l.path = 'orbit'; l.dir = 'E'; S.sg.n = 1; S.sg.tried = {}; sgReset(); setFlag('order', false); lnReset(); setScene('launch'); },
      recap: '위성은 높이 올라가서가 아니라 약 7.7 km/s의 수평 속력으로 떨어지면서 지표에 닿지 않아 궤도를 돌아요. 동쪽으로 쏘면 자전 속력을 얻고, 다단 로켓은 빈 단을 버려 질량을 줄여요.',
      summary: '<ul><li><b>발사 순서</b>: 이륙(추력 &gt; 무게) → 수직 상승으로 두꺼운 대기를 빨리 벗어나기 → 서서히 기울여 수평 가속 → 수평 속력 약 <b>7.7 km/s</b>에서 엔진 정지 → 자유 낙하하며 원 궤도.</li>' +
        '<li>위로만 쏘면 수평 속력이 0이라 올라간 만큼 <b>다시 떨어져요</b>. 궤도에 오르려면 높이보다 <b>수평 속력</b>이 중요해요.</li>' +
        '<li>적도에서 <b>동쪽</b>으로 쏘면 지구 자전 속력 약 0.46 km/s를 얻어 로켓이 낼 속력이 7.7 − 0.46 = 7.24 km/s로 줄어요(서쪽은 8.16 km/s).</li>' +
        '<li><b>다단 로켓</b>: 연료를 다 쓴 단(빈 껍질)을 버리면 질량이 줄어 같은 추력으로도 가속도(= 추력/질량)가 커져요. 그래서 한 단짜리보다 더 큰 속력을 얻어요. 누리호는 3단 로켓이에요.</li></ul>',
      missions: [
        {
          title: '발사 순서 정렬하기', manual: true,
          goal: '다섯 장의 카드를 <b>▲▼ 버튼</b>으로 위성을 궤도에 올리는 발사 순서대로 정렬하고 ✔ 확인하기를 누르세요.',
          hint: '이륙 → 수직 상승 → 기울여 수평 가속 → 7.7 km/s에서 엔진 정지 → 자유 낙하하며 원 궤도 순서예요.',
          setup() { S.ordC = [3, 1, 4, 0, 2]; S.ordBadC = {}; ordSigC.v = ''; lnReset(); S.ln.path = 'orbit'; setFlag('order', true); setScene('launch'); },
          check() {
            const v = ordV(S.ordC, RULES_C);
            if (!v.length) { S.ordBadC = {}; return true; }
            const bad = {}; v.forEach(([a, b]) => { bad[a] = true; bad[b] = true; });
            if (Object.keys(bad).join() !== Object.keys(S.ordBadC).join()) { S.ordBadC = bad; updateCtl(); }
            return '순서가 맞지 않는 카드가 빨간 테두리로 표시돼요. 위의 ▶ 발사로 순서를 보고 다시 정렬해요.';
          },
          status: () => '맞지 않는 쌍 ' + ordV(S.ordC, RULES_C).length + '개',
          explain: '<b>이륙 → 수직 상승(대기 벗어나기) → 기울여 수평 가속 → 약 7.7 km/s에서 엔진 정지 → 자유 낙하하는 원 궤도</b> 순서예요. 위성은 엔진 없이 지구로 계속 떨어지지만, 수평 속력이 충분해서 지표에 닿지 않아요.',
        },
        {
          title: '1단 로켓과 다단 로켓 비교하기',
          goal: '<b>1단 로켓</b>을 발사해 본 뒤, <b>2단 또는 3단</b> 로켓의 연료 배분을 정해 <b>달성도 100 % 이상</b>으로 위성을 궤도에 올리세요.',
          hint: '1단 로켓은 연료를 다 써도 약 78 %예요. 3단으로 바꾸고 1단 연료 40 %, 2단 30 % 정도로 놓아 🚀 발사해 보세요. 점선(단일 로켓)보다 단을 버릴 때 가속도가 껑충 뛰는 것을 봐요.',
          setup() { setFlag('order', false); S.sg.n = 1; S.sg.tried = {}; sgReset(); setScene('stage'); },
          check: () => !!S.sg.tried[1] && [2, 3].some((n) => S.sg.tried[n] && S.sg.tried[n].ok),
          hold: 0.5,
          status: () => mark(!!S.sg.tried[1]) + ' 1단 로켓 발사 &nbsp; ' + mark([2, 3].some((n) => S.sg.tried[n] && S.sg.tried[n].ok)) + ' 다단 로켓 궤도 도달',
          explain: '연료를 다 쓴 단은 빈 껍질일 뿐이라 버리면 <b>질량이 줄어</b>요. 같은 추력이면 가속도 a = 추력/질량이 커져요. 그래서 같은 연료로도 한 단짜리보다 더 큰 속력을 얻어요. 단을 너무 가볍게 나누거나 1단 연료를 너무 적게 두면 오히려 모자랄 수 있어요.',
        },
        {
          type: 'quiz', title: '왜 옆으로 기울여 가속하고, 왜 동쪽일까',
          goal: '위성을 쏘는 로켓은 높이만 올리지 않고 옆으로 기울어 가속해요. 또 가능하면 <b>동쪽</b>으로 쏘아요. 그 까닭으로 알맞은 것은?',
          setup() { setFlag('order', false); S.ln.path = 'orbit'; S.ln.dir = 'E'; lnReset(); setScene('launch'); },
          choices: ['높이 올라가면 중력이 사라지므로 높이만 충분하면 저절로 돌기 때문이에요. 동쪽은 해가 뜨는 쪽이라서요', '낙하하면서도 지표에 닿지 않을 만큼 수평 속력(약 7.7 km/s)이 필요하기 때문이에요. 동쪽으로 쏘면 지구 자전 속력(약 0.46 km/s)을 보태 로켓이 낼 속력이 줄어요', '엔진을 계속 켜 두어야 궤도를 돌 수 있기 때문이에요. 동쪽은 바람이 약해서요', '수직 속력이 클수록 오래 돌 수 있기 때문이에요. 서쪽은 자전과 부딪혀서요'],
          answer: 1,
          feedback: ['높은 곳에서도 중력은 있어요(고도 400 km에서 8.7 m/s²). 위성이 도는 것은 수평 속력이 있기 때문이에요.', '', '궤도에서는 엔진을 꺼도 중력만으로 자유 낙하하며 돌아요.', '궤도를 도는 데 필요한 것은 수직 속력이 아니라 수평 속력이에요.'],
          explain: '위성은 중력으로 계속 떨어지고 있지만 수평 속력이 약 <b>7.7 km/s</b>라 지표가 휘어 나가는 만큼 땅이 비껴가요. 위로만 쏘면 수평 속력이 0이라 그대로 떨어져요. 동쪽은 지구 자전 방향이어서 적도에서 <b>0.46 km/s</b>를 공짜로 얻어 로켓이 낼 속력이 7.7 − 0.46 = 7.24 km/s로 줄어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-escape-launch', mount: '#game', badge: '로켓 박사', homeHref: '../../index.html#hm',
    featureLabels: { well: '📈 E_p 곡선 · 총 에너지 · 탈출 조건', planet: '🪐 행성별 탈출 속도 · 대기 분자', astro: '🧑‍🚀 우주인과 공 · 운동량 보존', rocket: '🔥 로켓 분출 · 추력과 무게', launch: '🛰️ 궤도 진입 · 발사 순서', stage: '🧱 다단 로켓 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  wReady(); plInit(); asReady(); setScene('well');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    wStep(dt); plStep(dt); asStep(dt); rkStep(dt); lnStep(dt); sgStep(dt);
    renderOrderC();
    switch (S.mode) {
      case 'well': drawWell(dt); break;
      case 'planet': drawPlanet(dt); break;
      case 'astro': drawAstro(dt); break;
      case 'rocket': drawRocket(dt); break;
      case 'launch': drawLaunch(dt); break;
      default: drawStage(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, wLaunch, wReady, hmaxOf, etot, BODIES, GASES, stays, vrmsOf, plCheck, plSelect, asThrow, rkToggle, lnPlay, sgLaunch, sgModel, sgPlan, SG_BASE, ordV, RULES_C,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { wStep(0.02); plStep(0.02); asStep(0.02); rkStep(0.02); lnStep(0.02); sgStep(0.02); } },
  };
})();
