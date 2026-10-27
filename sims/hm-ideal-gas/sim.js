/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 이상 기체 법칙 (3차시)
   성취기준 [12역학02-02] 열에 의한 물질의 상태 변화를 이해하고, 이상 기체의 온도, 압력, 부피의 관계를 설명할 수 있다. (뒷부분: 이상 기체 법칙)
   ① 관찰: 기체 모형 (분자 충돌 = 압력, 온도 = 분자 평균 운동 에너지)
   ② 실험: 센서 실험 (등온 P–V·P–1/V, 정압 V–t, 정적 P–t, 절대 영도 −273 °C)
   ③ 모형: PV = nRT (R = 8.31 J/(mol·K), 세 개를 정하면 나머지 하나가 계산)
   ④ 적용: 타이어, 잠수·헬륨 풍선, 열기구 설계
   분자 운동론의 정량 유도, 실제 기체, 속력 분포, 부분 압력, 열역학 과정은 다루지 않아요.
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
  const fN = (v) => Math.round(v).toLocaleString('en-US');
  const f1 = (x) => { const r = Math.round(x * 10) / 10; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(1); };
  const f2 = (x) => { const r = Math.round(x * 100) / 100; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(2); };
  const sgn = (v) => (v < 0 ? MINUS : '') + Math.abs(v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  function hbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * w;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, f, h); ctx.restore(); }
  }
  function axes(rc, o) {
    const ml = PHONE ? 42 : 48, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9;
      ctx.strokeStyle = z ? '#8a95a8' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, sgn(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      const z = Math.abs(xv) < 1e-9 && o.xmin < 0;
      ctx.strokeStyle = z ? '#8a95a8' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, sgn(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, INK, 'left', 800);
    if (o.xl) T(rc.x + rc.w - 8, rc.y + 21, o.xl, 13, MUTED, 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  function bgGrad(c, a, b) {
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, ''); return v === '' || !isFinite(+v) ? null : +v; };
  const nearRel = (v, a, r) => v != null && Math.abs(v - a) <= Math.abs(a) * r;

  /* ================= 자료 ================= */
  const R_GAS = 8.31, KB = 1.38e-23, NA = 6.0e23;
  const K0 = 100 * 20 / 300;                    // 주사기 공기: P V / T = 100 kPa × 20 mL / 300 K (kPa·mL/K)
  const N_SYR = 100e3 * 20e-6 / (R_GAS * 300);  // 8.0 × 10⁻⁴ mol
  const keAvg = (Tk) => 1.5 * KB * Tk;           // 분자 하나의 평균 운동 에너지 (J)
  const nz = (x, seed) => 0.005 * Math.sin(x * 12.9898 + seed * 78.233);     // 측정 오차 ±0.5 % (같은 값이면 같은 오차)
  // 센서 실험
  const EXPS = {
    iso: { name: '등온', lab: '부피 V', unit: 'mL', mn: 8, mx: 24, def: 20, need: 8 },
    isob: { name: '정압', lab: '온도 t', unit: '°C', mn: 0, mx: 100, def: 27, need: 60 },
    isoc: { name: '정적', lab: '온도 t', unit: '°C', mn: 0, mx: 100, def: 27, need: 60 },
  };
  function sxRead(ex, x) {
    if (ex === 'iso') { const V = x; return { V, P: 100 * 20 / V * (1 + nz(V, 1)), t: 27, TK: 300 }; }
    if (ex === 'isob') { return { V: 20 * (x + 273) / 300 * (1 + nz(x, 2)), P: 100, t: x, TK: x + 273 }; }
    return { V: 20, P: 100 * (x + 273) / 300 * (1 + nz(x, 3)), t: x, TK: x + 273 };
  }
  // 응용 자료
  const TIRE_P0 = 320;                           // 27 °C에서 절대 압력 (계기압 220 + 대기압 100) kPa
  const tireAbs = (tc) => TIRE_P0 * (tc + 273) / 300;
  const lungV = (d) => 6 * 2 / (1 + d / 10);     // 수심 10 m(2기압)에서 6 L
  const balAt = (f) => { const P = 1 - 0.5 * f, Tk = 300 - 30 * f; return { P, Tk, V: 10 * (1.0 / P) * (Tk / 300) }; };
  const P_ATM = 101300, M_AIR = 0.029, T_OUT = 293, M_FIXED = 330, M_PASS = 80, MARGIN = 20;
  const rho = (Tk) => P_ATM * M_AIR / (R_GAS * Tk);
  const hotLift = (tc, V) => (rho(T_OUT) - rho(tc + 273)) * V;

  /* ================= 상태 ================= */
  const S = {
    mode: 'model', clock: 0, fade: 0, kel: false,
    m: { V: 20, T: 300, sawV: false, sawT: false, hp: 0, gauge: new SciSim.Spring(100, { stiffness: 120, damping: 16 }), flame: 0 },
    sx: { exp: 'iso', x: { iso: 20, isob: 27, isoc: 27 }, rec: { iso: [], isob: [], isoc: [] }, hp: 0, msg: '' },
    ig: { P: 100, V: 25, T: 300, n: 1, un: 'V', gauge: new SciSim.Spring(100, { stiffness: 120, damping: 16 }) },
    ap: { tc: 27, dd: 10, dh: 0, hT: 100, hV: 2000, hP: 4, alt: 0, vel: 0 },
    flags: { syr: false, vol: false, app: false, zero: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const lockedBy = (k) => (game && game.free ? false : S.flags[k]);
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['model', 'sensor', 'eq', 'tire', 'dive', 'hot'];
  const ALLOWED = [['model'], ['sensor'], ['eq'], ['tire', 'dive', 'hot']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  const kelOn = () => S.kel || (game && game.free);

  /* ================= 기체 분자 모형 (피스톤 안) ================= */
  const R_M = PHONE ? 4.6 : 5.4;
  let GM = [];
  const hitsQ = [];
  function gasSync(cnt, W, H) {
    const live = GM.filter((p) => !p.dying);
    for (let i = live.length; i < cnt; i++) { const th = Math.random() * TAU; GM.push({ x: R_M + Math.random() * Math.max(1, W - 2 * R_M), y: R_M + Math.random() * Math.max(1, H - 2 * R_M), ux: Math.cos(th), uy: Math.sin(th), m: 0.82 + Math.random() * 0.36, fade: 0, dying: false }); }
    for (let i = live.length - 1; i >= cnt; i--) live[i].dying = true;
  }
  function gasStep(dt, W, H, TK, onHit) {
    const spd = (PHONE ? 66 : 92) * Math.sqrt(Math.max(TK, 1) / 300);
    for (let i = GM.length - 1; i >= 0; i--) {
      const p = GM[i];
      if (p.dying) { p.fade -= dt * 4; if (p.fade <= 0) { GM.splice(i, 1); continue; } } else if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 4);
      const v = spd * p.m * dt;
      p.x += p.ux * v; p.y += p.uy * v;
      if (p.x < R_M) { p.x = R_M; p.ux = Math.abs(p.ux); } else if (p.x > W - R_M) { p.x = W - R_M; p.ux = -Math.abs(p.ux); }
      if (p.y < R_M) { p.y = R_M; p.uy = Math.abs(p.uy); if (!p.dying) { hitsQ.push(S.clock); if (onHit) onHit(p.x); } }
      if (p.y > H - R_M) { p.y = Math.max(R_M, H - R_M); p.uy = -Math.abs(p.uy); }
      if (p.x > W - R_M) p.x = Math.max(R_M, W - R_M);
    }
  }
  const hitsPerSec = () => { while (hitsQ.length && hitsQ[0] < S.clock - 2) hitsQ.shift(); return Math.round(hitsQ.length / 2); };
  const molColor = (TK) => SciSim.color.mix('#4aa3ff', '#ff5a4a', clamp((TK - 250) / 200, 0, 1));
  /* 피스톤 실린더: x0 = 왼쪽, yb = 바닥, W = 폭, hp = 기체 높이(px), hmax = 최대 높이 */
  function gasCyl(o) {
    const { x0, yb, W, hp, hmax, TK } = o, top = yb - hmax - 20;
    D.roundRect(x0 - 16, yb + 38, W + 32, 14, 5); ctx.fillStyle = '#6b7a90'; ctx.fill();
    if (o.flame > 0.03) D.flame(x0 + W / 2, yb + 38, 18 + o.flame * 30, S.clock);
    // 실린더 안 (피스톤 위는 빈 공간)
    ctx.fillStyle = 'rgba(240,246,255,.9)'; ctx.fillRect(x0, top, W, yb - top);
    const gc = SciSim.color.mix('#cfe0ff', '#ffc0a8', clamp((TK - 250) / 200, 0, 1));
    ctx.fillStyle = SciSim.color.rgba(gc, 0.5); ctx.fillRect(x0, yb - hp, W, hp);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, yb - hp, W, hp); ctx.clip();
    const col = molColor(TK);
    GM.forEach((p) => { D.sphere(x0 + p.x, yb - hp + p.y, R_M, col, { gloss: true }); ctx.globalAlpha = 1; });
    ctx.restore();
    // 벽
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, yb); ctx.lineTo(x0 + W, yb); ctx.lineTo(x0 + W, top); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 7, top + 6); ctx.lineTo(x0 + 7, yb - 8); ctx.stroke();
    // 피스톤
    const py = yb - hp;
    ctx.fillStyle = '#516079'; ctx.fillRect(x0 + W / 2 - 4, top - 4, 8, py - top + 2);
    D.shadow(() => { D.roundRect(x0 + 2, py - 12, W - 4, 12, 4); const g = ctx.createLinearGradient(0, py - 12, 0, py); g.addColorStop(0, '#9aa8bd'); g.addColorStop(1, '#5e6c84'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    if (o.mode === 'hand') { T(x0 + W / 2, top - 8, '🖐️', 22, INK, 'center', 700); }
    else if (o.mode === 'weights') {
      for (let i = 0; i < 3; i++) { D.roundRect(x0 + W / 2 - 34, py - 26 - i * 15, 68, 14, 3); ctx.fillStyle = i % 2 ? '#7d8aa0' : '#94a1b6'; ctx.fill(); }
    } else if (o.mode === 'lock') {
      ctx.fillStyle = '#e2464b'; ctx.fillRect(x0 - 8, py - 6, 16, 6); ctx.fillRect(x0 + W - 8, py - 6, 16, 6);
      T(x0 + W / 2, py - 20, '고정', 13, '#b91c1c', 'center', 800);
    }
    // 충돌 불꽃
    return { top, py };
  }
  function hitSpark(x0, py) { return (x) => { if (RM) return; if (Math.random() < 0.55) parts.emit({ x: x0 + x, y: py + 2, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 30, life: 0.28, size: 2.4, color: 'rgba(255,200,60,.95)', gravity: 0, fade: true }); }; }

  /* ================= ① 기체 모형 ================= */
  const MV = { N: 24, kpx: PHONE ? 4.4 : 4.6, W: PHONE ? 112 : 150 };
  const Pm = () => K0 * S.m.T / S.m.V;
  function drawModel(dt) {
    const c = topCard(), m = S.m, P = Pm();
    bgGrad(c);
    const hT = m.V * MV.kpx, yb = c.y + c.h - 74, hmax = 40 * MV.kpx;
    m.hp = approach(m.hp || hT, hT, dt, 9);
    const x0 = c.x + (PHONE ? 20 : 44);
    gasSync(MV.N, MV.W, m.hp); gasStep(dt, MV.W, m.hp, m.T, hitSpark(x0, yb - m.hp));
    m.flame = approach(m.flame, clamp((m.T - 250) / 200, 0, 1), dt, 5);
    const cy = gasCyl({ x0, yb, W: MV.W, hp: m.hp, hmax, TK: m.T, mode: 'hand', flame: m.flame });
    T(x0 + MV.W / 2, yb + 70, '부피 V = ' + m.V + ' mL', PHONE ? 13 : 14.5, INK, 'center', 800);
    // 압력계
    const dx = c.x + (PHONE ? 250 : 340), dy = c.y + (PHONE ? 118 : 138), dr = PHONE ? 64 : 76;
    m.gauge.target = P; m.gauge.update(dt);
    D.dial(dx, dy, dr, clamp(m.gauge.value, 0, 400), 0, 400, { ticks: 4, label: 'kPa', color: '#e2464b' });
    T(dx, dy + dr + 30, '압력 P = ' + f1(P) + ' kPa', PHONE ? 14.5 : 16, '#b91c1c', 'center', 800);
    T(dx, dy + dr + 52, '충돌 ' + hitsPerSec() + ' 번/초 (피스톤)', 13.5, MUTED, 'center', 800);
    // 온도계
    const tx = c.x + (PHONE ? 405 : 560);
    D.thermometer(tx, c.y + 46, PHONE ? 150 : 170, m.T, 250, 450, { ticks: false, color: molColor(m.T) });
    D.label(tx, c.y + (PHONE ? 238 : 258), m.T + ' K', { bg: m.T > 330 ? RED : '#2563eb', size: 13, pad: 9 });
    T(tx, c.y + (PHONE ? 266 : 286), '(' + (m.T - 273) + ' °C)', 13.5, MUTED, 'center', 800);
    if (!PHONE) {
      T(c.x + 600, c.y + 70, '분자 하나의', 14, MUTED, 'left', 800);
      T(c.x + 600, c.y + 92, '평균 운동 에너지', 14, MUTED, 'left', 800);
      T(c.x + 600, c.y + 118, f1(keAvg(m.T) * 1e21) + ' × 10⁻²¹ J', 15, '#c2410c', 'left', 800);
      T(c.x + 600, c.y + 146, '= (3/2) k T', 13.5, MUTED, 'left', 800);
    }
    T(c.x + 12, c.y + 24, '피스톤을 누르고(부피 ↓) 가열해(온도 ↑) 압력을 바꿔 봐요', PHONE ? 13 : 14.5, INK, 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 세 막대
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, bw = PW - 32;
    T(x1, PY + 28, '🔍 분자 수준으로 보기', 15, INK, 'left', 800);
    const rows = [
      ['분자의 평균 운동 에너지 ∝ T  (' + m.T + ' K)', m.T, 450, '#ef4444'],
      ['벽(피스톤)에 부딪히는 횟수  (' + hitsPerSec() + ' 번/초)', hitsPerSec(), 40, '#f59e0b'],
      ['압력 P  (' + f1(P) + ' kPa)', P, 400, '#e2464b'],
    ];
    rows.forEach((r, i) => { const yy = PY + 56 + i * (PHONE ? 50 : 46); T(x1, yy, r[0], PHONE ? 13 : 14.5, INK, 'left', 800); hbar(x1, yy + 8, bw, 16, r[1], r[2], r[3]); });
    const ly = PY + 56 + 3 * (PHONE ? 50 : 46) + 6;
    const lines = PHONE ? ['부피를 줄이면 부딪히는 횟수가 늘어요.', '온도를 높이면 분자가 빨라져 횟수와 세기가 커져요.'] : ['부피를 줄이면 분자가 벽에 더 자주 부딪혀요 → 압력 ↑', '온도를 높이면 분자가 빨라져 더 자주, 더 세게 부딪혀요 → 압력 ↑'];
    lines.forEach((l, i) => T(x1, ly + i * 22, l, PHONE ? 13 : 14, '#1d4ed8', 'left', 800));
  }

  /* ================= ② 센서 실험 ================= */
  const SXK = PHONE ? 6.6 : 7;
  const sxCur = () => sxRead(S.sx.exp, S.sx.x[S.sx.exp]);
  function sxFit(ex) {
    const r = S.sx.rec[ex]; if (r.length < 3) return null;
    const n = r.length, sx = r.reduce((a, q) => a + q.x, 0), sy = r.reduce((a, q) => a + q.y, 0), sxx = r.reduce((a, q) => a + q.x * q.x, 0), sxy = r.reduce((a, q) => a + q.x * q.y, 0);
    const den = n * sxx - sx * sx; if (Math.abs(den) < 1e-9) return null;
    const a = (n * sxy - sx * sy) / den, b = (sy - a * sx) / n; return { a, b, x0: -b / a };
  }
  function sxRec(quiet) {
    const s = S.sx, ex = s.exp, x = s.x[ex], rd = sxRead(ex, x), list = s.rec[ex];
    if (list.some((q) => q.x === x)) { if (!quiet) showHint('같은 값은 한 번만 기록해요. 값을 바꿔 다시 기록해 보세요.', 3200); return; }
    if (list.length >= 8) { if (!quiet) showHint('기록은 8점까지예요. 🗑️ 지우기를 눌러 다시 시작해요.', 3200); return; }
    list.push({ x, y: ex === 'iso' ? rd.P : ex === 'isob' ? rd.V : rd.P, P: rd.P, V: rd.V, t: rd.t, born: S.clock - 1 });
    if (!quiet) Sound.click(); updateCtl();
  }
  function sxFill() { const s = S.sx; [['iso', [20, 15, 12, 10, 8]], ['isob', [0, 27, 50, 75, 100]], ['isoc', [0, 27, 50, 75, 100]]].forEach(([ex, xs]) => { s.rec[ex] = []; xs.forEach((x) => { s.exp = ex; s.x[ex] = x; sxRec(true); }); }); s.exp = 'iso'; updateCtl(); }
  function sxClear() { S.sx.rec[S.sx.exp] = []; Sound.click(); updateCtl(); }
  const sxOk = (ex) => { const r = S.sx.rec[ex]; if (r.length < 5) return false; const xs = r.map((q) => q.x); return Math.max(...xs) - Math.min(...xs) >= EXPS[ex].need; };
  function drawSensor(dt) {
    const c = topCard(), s = S.sx, ex = s.exp, rd = sxCur(), E = EXPS[ex];
    bgGrad(c);
    const hT = (ex === 'iso' ? rd.V : ex === 'isob' ? rd.V : 20) * SXK, yb = c.y + c.h - 74, hmax = 25 * SXK;
    s.hp = approach(s.hp || hT, hT, dt, 9);
    const x0 = c.x + (PHONE ? 20 : 50), W = PHONE ? 112 : 150;
    gasSync(MV.N, W, s.hp); gasStep(dt, W, s.hp, rd.TK, hitSpark(x0, yb - s.hp));
    const fl = ex === 'iso' ? 0 : clamp(rd.t / 100, 0.05, 1);
    gasCyl({ x0, yb, W, hp: s.hp, hmax, TK: rd.TK, mode: ex === 'iso' ? 'hand' : ex === 'isob' ? 'weights' : 'lock', flame: fl });
    if (PHONE) T(c.x + 10, yb + 70, ex === 'iso' ? '손으로 피스톤을 눌러요' : ex === 'isob' ? '추의 압력이 일정해요' : '피스톤을 고정해요', 13, INK, 'left', 800);
    else T(x0 + W / 2, yb + 70, ex === 'iso' ? '손으로 피스톤을 눌러요' : ex === 'isob' ? '추가 누르는 압력은 일정해요' : '피스톤을 고정해 부피가 일정해요', 14, INK, 'center', 800);
    // 센서 상자
    const bx = c.x + (PHONE ? 160 : 270), bw = PHONE ? 298 : 190, bh = PHONE ? 62 : 78, by0 = c.y + (PHONE ? 44 : 50), gap = PHONE ? 10 : 14;
    const boxes = [['📟 압력 센서', f1(rd.P) + ' kPa', '#e2464b'], ['🌡️ 온도 센서', f1(rd.t) + ' °C', '#f59e0b', (kelOn() ? '(' + f1(rd.TK) + ' K)' : '')], ['📏 부피', f1(rd.V) + ' mL', '#2563eb']];
    boxes.forEach((b, i) => {
      const yy = by0 + i * (bh + gap);
      D.shadow(() => { D.roundRect(bx, yy, bw, bh, 12); ctx.fillStyle = '#1e293b'; ctx.fill(); }, { blur: 6, y: 2 });
      T(bx + 12, yy + 22, b[0], 13, '#cbd5e1', 'left', 800);
      T(bx + 12, yy + bh - 14, b[1], PHONE ? 19 : 22, '#fff', 'left', 800);
      if (b[3]) T(bx + bw - 12, yy + bh - 14, b[3], 14, '#fcd34d', 'right', 800);
      ctx.fillStyle = b[2]; ctx.beginPath(); ctx.arc(bx + bw - 16, yy + 16, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx, yy + bh / 2); ctx.lineTo(x0 + W + 8, yb - hmax * 0.3 - i * 36); ctx.stroke(); ctx.setLineDash([]);
    });
    if (!PHONE) {
      const rx = c.x + 480;
      T(rx, c.y + 70, E.name + ' 과정: ' + (ex === 'iso' ? 'T = 300 K 일정' : ex === 'isob' ? 'P = 100 kPa 일정' : 'V = 20 mL 일정'), 14.5, INK, 'left', 800);
      T(rx, c.y + 98, ex === 'iso' ? 'V를 바꾸고 📏 기록해요.' : '온도 t를 바꾸고 📏 기록해요.', 14, MUTED, 'left', 800);
      const rcd = s.rec[ex];
      T(rx, c.y + 132, '기록한 점  ' + rcd.length + ' / 5', 15, rcd.length >= 5 ? '#14753f' : '#c2410c', 'left', 800);
      if (ex === 'iso') T(rx, c.y + 168, 'P × V = ' + fN(rd.P * rd.V) + ' kPa·mL', 15, '#1d4ed8', 'left', 800);
      else if (kelOn()) T(rx, c.y + 168, (ex === 'isob' ? 'V / T = ' + (rd.V / rd.TK).toFixed(4) + ' mL/K' : 'P / T = ' + (rd.P / rd.TK).toFixed(4) + ' kPa/K'), 15, '#1d4ed8', 'left', 800);
      if (ex === 'iso') T(rx, c.y + 192, '(측정 오차 ±0.5 %)', 13, MUTED, 'left', 700);
    }
    T(c.x + 12, c.y + 24, '센서로 압력·부피·온도를 읽어요', PHONE ? 13 : 14.5, INK, 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 그래프
    panel(PX, PY, PW, PH, 16);
    const rec = s.rec[ex], fit = sxFit(ex);
    if (ex === 'iso') {
      const gw = PHONE ? PW - 8 : (PW - 12) / 2, gh = PHONE ? (PH - 12) / 2 : PH - 8;
      const r1 = { x: PX + 4, y: PY + 4, w: gw, h: gh }, r2 = PHONE ? { x: PX + 4, y: PY + 8 + gh, w: gw, h: gh } : { x: PX + 8 + gw, y: PY + 4, w: gw, h: gh };
      const a1 = axes(r1, { xmin: 0, xmax: 24, xstep: 4, ymin: 0, ymax: 300, ystep: 100, title: 'P – V', xl: 'V (mL)  ↔  P (kPa)' });
      const a2 = axes(r2, { xmin: 0, xmax: 140, xstep: 20, ymin: 0, ymax: 300, ystep: 100, title: 'P – 1/V', xl: '1/V (× 10⁻³ /mL)' });
      if (rec.length >= 3) {
        const k = rec.reduce((a, q) => a + q.P * q.V, 0) / rec.length;
        ctx.save(); ctx.beginPath(); ctx.rect(a1.ix, a1.iy, a1.iw, a1.ih); ctx.clip(); ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath();
        for (let V = 6; V <= 24; V += 0.25) { const X = a1.gx(V), Y = a1.gy(k / V); V === 6 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(a2.ix, a2.iy, a2.iw, a2.ih); ctx.clip(); ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a2.gx(0), a2.gy(0)); ctx.lineTo(a2.gx(140), a2.gy(k / 1000 * 140)); ctx.stroke(); ctx.restore();
      }
      rec.forEach((q) => { const p = RM ? 1 : clamp((S.clock - q.born) / 0.4, 0, 1); D.sphere(a1.gx(q.V), a1.gy(q.P), 5 + (1 - p) * 4, '#e2464b', { gloss: false }); D.sphere(a2.gx(1000 / q.V), a2.gy(q.P), 5 + (1 - p) * 4, '#e2464b', { gloss: false }); });
      const cur = rd; ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a1.gx(cur.V), a1.gy(cur.P), 8, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(a2.gx(1000 / cur.V), a2.gy(cur.P), 8, 0, TAU); ctx.stroke();
      if (rec.length >= 3) T(r2.x + r2.w - 10, r2.y + r2.h - 36, '원점을 지나는 직선', 13, '#1d4ed8', 'right', 800);
    } else {
      const gw = PHONE ? PW - 8 : 480, gh = PH - 8;
      const r1 = { x: PX + 4, y: PY + 4, w: gw, h: gh };
      const isV = ex === 'isob';
      const a = axes(r1, { xmin: -300, xmax: 120, xstep: 100, ymin: 0, ymax: isV ? 30 : 140, ystep: isV ? 10 : 20, title: isV ? 'V – t  (압력 일정)' : 'P – t  (부피 일정)', xl: 't (°C)  ↔  ' + (isV ? 'V (mL)' : 'P (kPa)') });
      ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy, a.iw, a.ih); ctx.clip();
      if (fit) {
        const xa = Math.min(...rec.map((q) => q.x)), xb = Math.max(...rec.map((q) => q.x));
        ctx.strokeStyle = 'rgba(37,99,235,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.gx(xb), a.gy(fit.a * xb + fit.b)); ctx.lineTo(a.gx(xa), a.gy(fit.a * xa + fit.b)); ctx.stroke();
        ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(a.gx(xa), a.gy(fit.a * xa + fit.b)); ctx.lineTo(a.gx(fit.x0), a.gy(0)); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
      if (fit && fit.x0 > -300 && fit.x0 < 0) {
        const X = a.gx(fit.x0), Y = a.gy(0); D.ring(X, Y, 9, S.clock, { color: '#14a058', width: 3 });
        if (!showCalc('zero')) T(X + 6, Y - 18, '연장선: 약 ' + sgn(Math.round(fit.x0)) + ' °C (절대 영도)', 13.5, '#14753f', 'left', 800);
        else T(X, Y - 18, '연장선이 x축과 만나는 곳은?', 13.5, '#c2410c', 'center', 800);
      }
      rec.forEach((q) => { const p = RM ? 1 : clamp((S.clock - q.born) / 0.4, 0, 1); D.sphere(a.gx(q.x), a.gy(q.y), 5 + (1 - p) * 4, '#e2464b', { gloss: false }); });
      ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.gx(rd.t), a.gy(isV ? rd.V : rd.P), 8, 0, TAU); ctx.stroke();
      if (!PHONE) {
        const tx = PX + 4 + gw + 12, tw = PW - gw - 24;
        T(tx, PY + 28, '📋 기록한 값', 14.5, INK, 'left', 800);
        T(tx, PY + 52, 't (°C)', 13, MUTED, 'left', 800); T(tx + 70, PY + 52, kelOn() ? 'T (K)' : '', 13, MUTED, 'left', 800); T(tx + 140, PY + 52, isV ? 'V (mL)' : 'P (kPa)', 13, MUTED, 'left', 800);
        rec.slice(0, 8).forEach((q, i) => { const yy = PY + 76 + i * 22; T(tx, yy, String(q.x), 13.5, INK, 'left', 800); if (kelOn()) T(tx + 70, yy, String(q.x + 273), 13.5, INK, 'left', 800); T(tx + 140, yy, f1(isV ? q.V : q.P), 13.5, INK, 'left', 800); });
        if (!rec.length) T(tx, PY + 80, '📏 측정 기록을 눌러요', 13.5, '#c2410c', 'left', 800);
      } else T(PX + 60, PY + 56, '기록 ' + rec.length + ' / 5', 13.5, '#c2410c', 'left', 800);
    }
  }

  /* ================= ③ PV = nRT ================= */
  const IG_LIM = { P: [50, 300], V: [5, 50], T: [200, 500], n: [0.5, 3] };
  function igSolve() {
    const g = S.ig, un = g.un;
    if (S.flags.syr && !(game && game.free)) return { P: 100, V: 0.02, T: 300, n: 100 * 0.02 / (R_GAS * 300), syr: true };
    const o = { P: g.P, V: g.V, T: g.T, n: g.n };
    if (un === 'P') o.P = o.n * R_GAS * o.T / o.V; else if (un === 'V') o.V = o.n * R_GAS * o.T / o.P; else if (un === 'T') o.T = o.P * o.V / (o.n * R_GAS); else o.n = o.P * o.V / (R_GAS * o.T);
    return o;
  }
  const fVal = (k, v) => k === 'P' ? f1(v) : k === 'V' ? (v < 1 ? f1(v * 1000) : f1(v)) : k === 'T' ? f1(v) : (v < 0.01 ? f1(v * 1e4) : f2(v));
  const fUnit = (k, v) => k === 'P' ? 'kPa' : k === 'V' ? (v < 1 ? 'mL' : 'L') : k === 'T' ? 'K' : (v < 0.01 ? '× 10⁻⁴ mol' : 'mol');
  function drawEq(dt) {
    const c = topCard(), o = igSolve(), g = S.ig, un = g.un, syr = !!o.syr;
    bgGrad(c);
    const hideN = syr && showCalc('syr'), hideV = !syr && un === 'V' && showCalc('vol');
    const unk = syr ? 'n' : un;
    T(c.x + 12, c.y + 24, syr ? '주사기 속 공기:  P V = n R T  에서 n을 구해요' : '세 개를 정하면 나머지 하나가 계산돼요:  P V = n R T', PHONE ? 13 : 14.5, INK, 'left', 800);
    // 왼쪽: 실린더 (분자 수는 n에 비례)
    const cylW = PHONE ? 0 : 128;
    if (!PHONE) {
      const hh = clamp(syr ? 40 : 40 + 40 * Math.log10(Math.max(o.V, 0.02) / 0.02), 40, 190), yb = c.y + c.h - 74, hmax = 190;
      g.hp = approach(g.hp || hh, hh, dt, 8);
      const cnt = syr ? 4 : clamp(Math.round(o.n * 8), 4, 24), x0 = c.x + 30;
      gasSync(cnt, cylW, g.hp); gasStep(dt, cylW, g.hp, o.T, hitSpark(x0, yb - g.hp));
      gasCyl({ x0, yb, W: cylW, hp: g.hp, hmax, TK: o.T, mode: 'hand', flame: clamp((o.T - 200) / 300, 0, 1) });
      T(x0 + cylW / 2, yb + 70, syr ? '주사기 20 mL' : 'n에 비례해 분자 수가 달라요', 13.5, MUTED, 'center', 800);
    }
    // 타일
    const defs = [['P', '압력', 'P', '#e2464b'], ['V', '부피', 'V', '#2563eb'], ['eq', '=', '', ''], ['n', '몰 수', 'n', '#14a058'], ['R', '기체 상수', 'R', '#64748b'], ['T', '온도', 'T', '#f59e0b']];
    const tx0 = c.x + (PHONE ? 8 : 168), tw = PHONE ? 74 : 92, eqw = PHONE ? 20 : 26, gp = PHONE ? 4 : 6, ty = c.y + 52, th = PHONE ? 112 : 120;
    let cx = tx0;
    defs.forEach((d) => {
      if (d[0] === 'eq') { T(cx + eqw / 2, ty + th / 2 + 10, '=', 28, INK, 'center', 800); cx += eqw + gp; return; }
      const k = d[0];
      D.shadow(() => { D.roundRect(cx, ty, tw, th, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      const isU = k === unk;
      if (isU) { ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); D.roundRect(cx, ty, tw, th, 12); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = d[3]; D.roundRect(cx, ty, tw, 8, 4); ctx.fill();
      T(cx + tw / 2, ty + 36, d[2], 26, d[3], 'center', 800);
      T(cx + tw / 2, ty + 56, d[1], 13, MUTED, 'center', 800);
      let val, unit;
      if (k === 'R') { val = '8.31'; unit = 'J/(mol·K)'; }
      else { const v = o[k]; val = (isU && ((k === 'n' && hideN) || (k === 'V' && hideV))) ? '?' : fVal(k, v); unit = fUnit(k, v); }
      T(cx + tw / 2, ty + 86, val, PHONE ? 19 : 22, isU ? (val === '?' ? ORANGE : '#14753f') : INK, 'center', 800);
      T(cx + tw / 2, ty + 106, unit, 13, MUTED, 'center', 800);
      cx += tw + gp;
    });
    // 압력계 + 분자 하나의 운동 에너지
    const ky = ty + th + 22;
    T(tx0, ky + 8, '분자 하나의 평균 운동 에너지 (3/2)kT = ' + sci(keAvg(o.T), 1) + ' J', PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
    hbar(tx0, ky + 20, PHONE ? c.w - 20 : c.w - 168 - 14, 14, o.T, 500, '#f59e0b');
    T(tx0, ky + 54, '온도 T가 높을수록 분자의 평균 운동 에너지가 커요 (T에 비례)', 13.5, MUTED, 'left', 800);
    if (!PHONE) T(tx0, ky + 76, 'P V의 단위: kPa × L = J (1 Pa × 1 m³ = 1 J)', 13.5, MUTED, 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 식 대입과 PV/T–n 그래프
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    const hidden = hideN || hideV;
    T(x1, PY + 28, '🧮 식에 넣어 보기', 15, INK, 'left', 800);
    const left = syr ? '100 kPa × 0.020 L = 2.0 J' : (hidden ? 'P V = ?' : f1(o.P) + ' kPa × ' + f1(o.V) + ' L = ' + fN(o.P * o.V) + ' J');
    const right = syr ? (hideN ? 'n × 8.31 × 300 K = ?' : f2(o.n * 1e4) + ' × 10⁻⁴ mol × 8.31 × 300 K') : (hidden ? 'n R T = ?' : f2(o.n) + ' mol × 8.31 × ' + f1(o.T) + ' K = ' + fN(o.n * R_GAS * o.T) + ' J');
    T(x1, PY + 58, left, PHONE ? 13.5 : 15, '#b91c1c', 'left', 800);
    T(x1, PY + 82, '= ' + right, PHONE ? 13.5 : 15, '#14753f', 'left', 800);
    const gw = PHONE ? PW - 12 : 340, gh = PHONE ? 150 : PH - 8, gx0 = PHONE ? PX + 6 : PX + PW - gw - 4, gy0 = PHONE ? PY + PH - gh - 4 : PY + 4;
    const a = axes({ x: gx0, y: gy0, w: gw, h: gh }, { xmin: 0, xmax: 3, xstep: 0.5, ymin: 0, ymax: 30, ystep: 10, title: 'PV / T – n', xl: 'n (mol)' });
    ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(0)); ctx.lineTo(a.gx(3), a.gy(3 * R_GAS)); ctx.stroke();
    if (!hidden) { const pvT = o.P * o.V / o.T; D.sphere(a.gx(clamp(o.n, 0, 3)), a.gy(clamp(pvT * 1, 0, 30)), 7, '#e2464b', { gloss: false }); T(Math.min(a.gx(clamp(o.n, 0, 3)), a.ix + a.iw - 30), a.gy(clamp(pvT, 0, 30)) - 12, f2(pvT) + ' J/K', 13, '#b91c1c', 'center', 800); }
    T(a.ix + a.iw - 6, a.gy(3 * R_GAS) + 20, '기울기 = R = 8.31 J/(mol·K)', 13, '#1d4ed8', 'right', 800);
    if (!PHONE) { T(x1, PY + 118, 'PV / T = n R  →  기체의 양 n에 비례해요', 14, '#1d4ed8', 'left', 800); T(x1, PY + 144, '같은 온도·압력에서 같은 부피 → 같은 분자 수', 13.5, MUTED, 'left', 800); T(x1, PY + 168, '(기체의 종류와 상관없어요)', 13.5, MUTED, 'left', 800); }
  }

  /* ================= ④ 적용 ================= */
  function drawTire(dt) {
    const c = topCard(), a = S.ap, Pabs = tireAbs(a.tc), gauge = Pabs - 100, hide = showCalc('app');
    bgGrad(c, '#dbeafe', '#eef2fb');
    D.sky(c.x, c.y, c.w, c.h * 0.7, a.tc < 5 ? '#c9d9ee' : '#bfe3ff', '#eef7ff');
    ctx.fillStyle = a.tc < 0 ? '#e7eef7' : '#9aa5b5'; ctx.fillRect(c.x, c.y + c.h - 54, c.w, 54);
    if (a.tc < 3 && !RM) { for (let i = 0; i < 16; i++) { const px = c.x + ((i * 97 + S.clock * 24) % c.w), py = c.y + 40 + ((i * 53 + S.clock * 50) % (c.h - 100)); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); } }
    // 타이어
    const tx = c.x + (PHONE ? 130 : 230), ty = c.y + c.h - 54 - (PHONE ? 78 : 96), r = PHONE ? 78 : 96;
    const sq = clamp((220 - gauge) / 120, 0, 0.35);
    ctx.save(); ctx.translate(tx, ty + r); ctx.scale(1, 1 - sq * 0.2); ctx.translate(-tx, -(ty + r));
    ctx.fillStyle = '#2b3445'; ctx.beginPath(); ctx.arc(tx, ty, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c8d0dc'; ctx.beginPath(); ctx.arc(tx, ty, r * 0.62, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { const an = i * TAU / 5 + 0.3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(an) * r * 0.58, ty + Math.sin(an) * r * 0.58); ctx.stroke(); }
    D.sphere(tx, ty, 12, '#8a95a8', { gloss: true });
    // 타이어 안 공기 (색: 압력)
    ctx.strokeStyle = SciSim.color.rgba('#3b82f6', clamp(0.2 + (Pabs - 250) / 200, 0.2, 0.8)); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(tx, ty, r * 0.8, 0, TAU); ctx.stroke();
    ctx.restore();
    // 압력계
    const dx = c.x + (PHONE ? 330 : 470), dy = c.y + 130, dr = PHONE ? 62 : 72;
    a.gv = approach(a.gv == null ? gauge : a.gv, gauge, dt, 7);
    D.dial(dx, dy, dr, clamp(hide ? 220 : a.gv, 0, 400), 0, 400, { ticks: 4, label: 'kPa', color: '#e2464b', target: [200, 240] });
    T(dx, dy + dr + 30, '계기압 ' + (hide ? '?' : f1(gauge) + ' kPa'), PHONE ? 14.5 : 16, hide ? ORANGE : (gauge < 200 ? '#b91c1c' : '#14753f'), 'center', 800);
    T(dx, dy + dr + 52, '절대 압력 ' + (hide ? '?' : f1(Pabs) + ' kPa'), 13.5, MUTED, 'center', 800);
    if (!hide && gauge < 200) { const bl = Math.sin(S.clock * 7) > 0; D.label(dx, c.y + 36, bl ? '⚠️ 타이어 경고등' : '타이어 경고등', { bg: '#f59e0b', size: 13, pad: 10 }); }
    T(c.x + 12, c.y + 24, '27 °C에서 계기압 220 kPa (절대 압력 320 kPa) · 부피는 일정해요', PHONE ? 13 : 14.5, INK, 'left', 800);
    D.thermometer(c.x + (PHONE ? 30 : 60), c.y + 54, 130, clamp(a.tc, -20, 40), -20, 40, { ticks: false, color: a.tc < 5 ? '#2563eb' : '#e2464b' });
    D.label(c.x + (PHONE ? 30 : 60), c.y + 224, sgn(a.tc) + ' °C', { bg: a.tc < 5 ? '#2563eb' : RED, size: 13, pad: 9 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    T(x1, PY + 28, '🚗 타이어 안 공기 (부피 일정)', 15, INK, 'left', 800);
    T(x1, PY + 58, '절대 압력은 절대 온도에 비례해요:  P / T = 일정', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(x1, PY + 86, hide ? '320 kPa × (T / 300 K) = ?' : '320 × ' + (a.tc + 273) + ' / 300 = ' + f1(Pabs) + ' kPa  →  계기압 = ' + f1(Pabs) + ' − 100 = ' + f1(gauge) + ' kPa', PHONE ? 13 : 15, hide ? ORANGE : '#14753f', 'left', 800);
    T(x1, PY + 118, '주의: 압력계가 보여 주는 계기압 = 절대 압력 − 대기압 (100 kPa)', PHONE ? 13 : 14, MUTED, 'left', 800);
    hbar(x1, PY + 140, PW - 32, 16, hide ? 0 : Pabs, 400, '#e2464b');
    T(x1, PY + 176, hide ? '' : '절대 압력 ' + f1(Pabs) + ' kPa  (최대 400 kPa 눈금)', 13, MUTED, 'left', 800);
    T(x1, PY + 204, '겨울에 타이어 경고등이 켜지는 까닭: 공기가 식어 압력이 줄어서예요.', PHONE ? 13 : 14, '#1d4ed8', 'left', 800);
  }
  function drawDive(dt) {
    const c = topCard(), a = S.ap, hide = showCalc('app');
    bgGrad(c, '#d6ecff', '#e9f3ff');
    const half = c.w / 2;
    // 왼쪽: 바다와 잠수부
    ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, half - 4, c.h); ctx.clip();
    ctx.fillStyle = '#d9f0ff'; ctx.fillRect(c.x, c.y, half, c.h * 0.22);
    const sg = ctx.createLinearGradient(0, c.y + c.h * 0.22, 0, c.y + c.h); sg.addColorStop(0, '#6fc0ff'); sg.addColorStop(1, '#1d6fb8'); ctx.fillStyle = sg; ctx.fillRect(c.x, c.y + c.h * 0.22, half, c.h * 0.78);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h * 0.22); ctx.lineTo(c.x + half, c.y + c.h * 0.22); ctx.stroke();
    const y0 = c.y + c.h * 0.22, y1 = c.y + c.h - 96;
    a.dv = approach(a.dv == null ? a.dd : a.dv, a.dd, dt, 8);
    const dy = y0 + (y1 - y0) * a.dv / 10, dx = c.x + half * 0.5;
    for (let m = 0; m <= 10; m += 5) { const yy = y0 + (y1 - y0) * m / 10; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(c.x, yy); ctx.lineTo(c.x + half, yy); ctx.stroke(); ctx.setLineDash([]); T(c.x + 8, yy - 4, m + ' m', 13, '#fff', 'left', 800); }
    // 잠수부와 폐 (부피 비례)
    D.sphere(dx, dy, 18, '#f2c9a0', { gloss: false }); ctx.fillStyle = '#1e293b'; ctx.fillRect(dx - 12, dy - 7, 24, 8);
    const lv = lungV(a.dd), lr = 12 + (Math.cbrt(lv / 6) - 1) * 14 + 10;
    D.shadow(() => { D.sphere(dx, dy + 44, lr, '#ff8a9a', { gloss: true }); }, { blur: 6, y: 2 });
    ctx.restore();
    T(c.x + 12, c.y + 24, '🤿 수심 ' + a.dd + ' m: ' + (1 + a.dd / 10).toFixed(1) + '기압', PHONE ? 13 : 14.5, '#fff', 'left', 800, { stroke: 'rgba(20,60,110,.7)', strokeWidth: 4 });
    D.label(dx, dy - 34, '폐 속 공기 ' + (hide ? '?' : f1(lv) + ' L'), { bg: hide ? ORANGE : '#e11d48', size: 13, pad: 9 });
    // 오른쪽: 풍선
    const rx = c.x + half + 4, rw = half - 4;
    ctx.save(); ctx.beginPath(); ctx.rect(rx, c.y, rw, c.h); ctx.clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); sk.addColorStop(0, '#6aa7e6'); sk.addColorStop(1, '#dff0ff'); ctx.fillStyle = sk; ctx.fillRect(rx, c.y, rw, c.h);
    const b = balAt(a.dh / 100);
    a.bv = approach(a.bv == null ? b.V : a.bv, b.V, dt, 8);
    const bx = rx + rw * 0.5, by = c.y + c.h - 62 - (a.dh / 100) * (c.h - 150), br = 24 + Math.cbrt(a.bv / 10) * 22;
    ctx.fillStyle = '#6b8f5c'; ctx.fillRect(rx, c.y + c.h - 24, rw, 24);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + br); ctx.lineTo(bx, c.y + c.h - 24); ctx.stroke();
    D.shadow(() => { D.sphere(bx, by, br, '#ef4444', { gloss: true }); }, { blur: 8, y: 3 });
    T(rx + 12, c.y + 24, '🎈 헬륨 풍선: ' + b.P.toFixed(2).replace(/0$/, '') + '기압, ' + Math.round(b.Tk) + ' K', PHONE ? 13 : 14.5, '#fff', 'left', 800, { stroke: 'rgba(20,60,110,.7)', strokeWidth: 4 });
    D.label(bx, c.y + c.h - 40, '풍선 ' + (hide ? '?' : f1(b.V) + ' L'), { bg: hide ? ORANGE : '#dc2626', size: 13, pad: 9 });
    ctx.restore();
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, bd = balAt(a.dh / 100);
    T(x1, PY + 28, '🤿 잠수: 수심 10 m(2기압)에서 폐 속 공기 6 L를 참고 올라와요 (온도 일정)', PHONE ? 13 : 14.5, INK, 'left', 800);
    T(x1, PY + 56, hide ? 'P₁V₁ = P₂V₂ → V₂ = ?' : '2기압 × 6 L = ' + (1 + a.dd / 10).toFixed(1) + '기압 × ' + f1(lungV(a.dd)) + ' L  (보일 법칙)', PHONE ? 13.5 : 15, hide ? ORANGE : '#14753f', 'left', 800);
    hbar(x1, PY + 70, PW - 32, 14, hide ? 0 : lungV(a.dd), 12, '#e11d48');
    T(x1, PY + 104, hide ? '' : '폐가 12 L를 넘으면 위험해요. 올라오며 숨을 내쉬어야 해요!', 13.5, '#b91c1c', 'left', 800);
    T(x1, PY + 142, '🎈 풍선: 지상 (1.0기압, 300 K) 10 L → 상공 (0.5기압, 270 K)', PHONE ? 13 : 14.5, INK, 'left', 800);
    T(x1, PY + 170, hide ? 'P₁V₁/T₁ = P₂V₂/T₂ → V₂ = ?' : '1.0 × 10 / 300 = ' + bd.P.toFixed(2) + ' × ' + f1(bd.V) + ' / ' + Math.round(bd.Tk), PHONE ? 13.5 : 15, hide ? ORANGE : '#14753f', 'left', 800);
    hbar(x1, PY + 184, PW - 32, 14, hide ? 0 : bd.V, 20, '#dc2626');
    T(x1, PY + 218, '압력이 줄면 부피가 커지고, 온도가 낮아지면 부피가 줄어요.', 13.5, MUTED, 'left', 800);
  }
  const hotCalc = () => { const a = S.ap, lift = hotLift(a.hT, a.hV), mass = M_FIXED + a.hP * M_PASS, net = lift - mass; return { lift, mass, net, ok: net >= MARGIN && a.hP === 4 }; };
  function drawHot(dt) {
    const c = topCard(), a = S.ap, h = hotCalc();
    bgGrad(c, '#9fd2ff', '#eaf6ff');
    D.sky(c.x, c.y, c.w, c.h, '#8ec9ff', '#eaf6ff');
    ctx.fillStyle = '#7dbb6c'; ctx.fillRect(c.x, c.y + c.h - 40, c.w, 40);
    // 고도: 순수 양력 > 0이면 올라가요 (net / 300 으로 목표 높이, 최대 한계)
    const target = h.net > 0 ? clamp(0.3 + h.net / 200, 0.3, 1) : 0;
    a.alt = approach(a.alt, target, dt, 1.6);
    const room = PHONE ? 76 : 82;
    const cx = c.x + (PHONE ? 140 : 250), br = 28 + Math.cbrt(a.hV / 1500) * 24, gy = c.y + c.h - 40, byb = gy - 24 - a.alt * room;
    const by = byb - br - 24;
    // 풍선 천 (부피에 비례) + 안쪽 공기 색
    const tcol = SciSim.color.mix('#f59e0b', '#ef4444', clamp((a.hT - 80) / 40, 0, 1));
    D.shadow(() => { ctx.fillStyle = tcol; ctx.beginPath(); ctx.ellipse(cx, by, br * 0.92, br, 0, 0, TAU); ctx.fill(); }, { blur: 8, y: 4 });
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, by, br * 0.92, br, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * br * 0.36 - 3, by - br, 6, br * 2);
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - br * 0.5, by + br * 0.8); ctx.lineTo(cx - 14, byb); ctx.moveTo(cx + br * 0.5, by + br * 0.8); ctx.lineTo(cx + 14, byb); ctx.stroke();
    D.roundRect(cx - 18, byb, 36, 24, 4); ctx.fillStyle = '#a3763f'; ctx.fill();
    if (a.hP > 0) for (let i = 0; i < Math.min(a.hP, 6); i++) D.sphere(cx - 13 + i * 5.2, byb - 2, 4.4, ['#f2c9a0', '#e8b98c', '#f6d7b8'][i % 3], { gloss: false });
    D.flame(cx, byb - 6, 22 + (a.hT - 80) * 0.6, S.clock, { glow: '#ffb347' });
    if (!RM && h.net > 0 && Math.random() < 0.2) parts.emit({ x: cx + (Math.random() - 0.5) * 10, y: byb - 30, vx: 0, vy: -24, life: 0.8, size: 5, color: 'rgba(255,200,120,.6)', gravity: 0, shape: 'smoke', fade: true, grow: 4 });
    // 힘 화살표 (질량으로 환산: kg → 길이)
    const k = 0.07, ax = cx + br * 1.25, KM = 70;
    D.arrow(ax, by, ax, by - clamp(h.lift * k, 4, KM), { color: '#14a058', width: 5, head: 12 });
    D.arrow(ax + 36, by, ax + 36, by + clamp(h.mass * k, 4, KM), { color: '#e2464b', width: 5, head: 12 });
    T(ax - 4, by - clamp(h.lift * k, 4, KM) - 8, '양력 ' + fN(h.lift) + ' kg', 13.5, '#14753f', 'left', 800);
    T(ax + 36, by + clamp(h.mass * k, 4, KM) + 20, '총 질량 ' + fN(h.mass) + ' kg', 13.5, '#b91c1c', 'center', 800);
    T(c.x + 12, c.y + 24, '공기 밀도 ρ = P M / (R T)  (바깥 20 °C, 1기압)', PHONE ? 13 : 14.5, INK, 'left', 800);
    if (!PHONE) {
      const rx = c.x + 520;
      T(rx, c.y + 70, '바깥 공기 (293 K)  ρ = ' + rho(T_OUT).toFixed(2) + ' kg/m³', 14, INK, 'left', 800);
      T(rx, c.y + 96, '풍선 안 (' + (a.hT + 273) + ' K)  ρ = ' + rho(a.hT + 273).toFixed(2) + ' kg/m³', 14, '#c2410c', 'left', 800);
      T(rx, c.y + 132, '양력 = (ρ바깥 − ρ안) × V', 14, INK, 'left', 800);
      T(rx, c.y + 156, '= (' + rho(T_OUT).toFixed(2) + ' − ' + rho(a.hT + 273).toFixed(2) + ') × ' + a.hV, 13.5, MUTED, 'left', 800);
      T(rx, c.y + 180, '≈ ' + fN(h.lift) + ' kg', 15, '#14753f', 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, bw = PW - 32, mx = 800;
    T(x1, PY + 28, '🎈 열기구 설계: 승객 4명을 태우고 떠오르게 해요', 15, INK, 'left', 800);
    T(x1, PY + 56, '양력 ' + fN(h.lift) + ' kg', 14.5, '#14753f', 'left', 800); hbar(x1, PY + 62, bw, 16, h.lift, mx, '#14a058');
    T(x1, PY + 106, '총 질량 ' + fN(h.mass) + ' kg  (장비 330 + 승객 ' + a.hP + ' × 80)', PHONE ? 13 : 14.5, '#b91c1c', 'left', 800); hbar(x1, PY + 112, bw, 16, h.mass, mx, '#e2464b');
    const lx = x1 + bw * clamp(h.mass / mx, 0, 1); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, PY + 56); ctx.lineTo(lx, PY + 82); ctx.stroke();
    const msg = h.ok ? '✅ 양력이 총 질량보다 ' + fN(h.net) + ' kg 커요. 떠올라요!' : (h.net >= MARGIN ? '승객이 4명이 아니에요. 승객 4명으로 맞춰 주세요.' : h.net > 0 ? '떠오르지만 여유가 ' + fN(h.net) + ' kg로 부족해요 (20 kg 이상 필요).' : '양력이 총 질량보다 작아 못 떠요. 온도나 부피를 키워요.');
    T(x1, PY + 158, msg, PHONE ? 13.5 : 15, h.ok ? '#14753f' : '#b45309', 'left', 800);
    T(x1, PY + 186, '밀도 ρ = P M / (R T): 온도 T가 높으면 밀도가 작아져 위로 떠요.', 13.5, MUTED, 'left', 800);
    T(x1, PY + 208, 'M = 0.029 kg/mol, P = 1.013 × 10⁵ Pa, R = 8.31 J/(mol·K)', 13.5, MUTED, 'left', 800);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; const lk = n.getAttribute('data-lock'); if (lk && lockedBy(lk)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const m = S.m; $('#oMV').textContent = m.V + ' mL'; setSl('sMV', m.V, 10, 40); $('#oMT').textContent = m.T + ' K'; setSl('sMT', m.T, 250, 450);
    const s = S.sx, ex = s.exp, E = EXPS[ex];
    $$('#sxSel button').forEach((b) => b.classList.toggle('on', b.dataset.ex === ex));
    const sl = $('#sSx'); sl.min = E.mn; sl.max = E.mx; $('#lSx').textContent = E.lab; $('#oSx').textContent = s.x[ex] + ' ' + E.unit; setSl('sSx', s.x[ex], E.mn, E.mx);
    $('#nSx').textContent = '기록: ' + s.rec[ex].length + ' / 5점' + (sxOk(ex) ? ' ✅' : '');
    const g = S.ig;
    $$('#eqSel button').forEach((b) => b.classList.toggle('on', b.dataset.un === g.un));
    $$('#eqSl .eq-sl').forEach((d) => { d.hidden = d.dataset.var === g.un; });
    $('#oEP').textContent = g.P + ' kPa'; setSl('sEP', g.P, 50, 300); $('#oEV').textContent = g.V + ' L'; setSl('sEV', g.V, 5, 50); $('#oET').textContent = g.T + ' K'; setSl('sET', g.T, 200, 500); $('#oEN').textContent = g.n.toFixed(1) + ' mol'; setSl('sEN', g.n, 0.5, 3);
    const a = S.ap;
    $('#oTt').textContent = sgn(a.tc) + ' °C'; setSl('sTt', a.tc, -20, 40); $('#oDd').textContent = a.dd + ' m'; setSl('sDd', a.dd, 0, 10); $('#oDh').textContent = a.dh + ' %'; setSl('sDh', a.dh, 0, 100);
    $('#oHT').textContent = a.hT + ' °C'; setSl('sHT', a.hT, 80, 120); $('#oHV').textContent = a.hV + ' m³'; setSl('sHV', a.hV, 1500, 2500); $('#oHP').textContent = a.hP + '명'; setSl('sHP', a.hP, 0, 6);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sMV').addEventListener('input', (e) => { S.m.V = +e.target.value; updateCtl(); });
  $('#sMT').addEventListener('input', (e) => { S.m.T = +e.target.value; updateCtl(); });
  $('#bMR').addEventListener('click', () => { Sound.click(); S.m.V = 20; S.m.T = 300; updateCtl(); });
  $$('#sxSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sx.exp = b.dataset.ex; S.sx.hp = 0; updateCtl(); }));
  $('#sSx').addEventListener('input', (e) => { S.sx.x[S.sx.exp] = +e.target.value; updateCtl(); });
  $('#bSxRec').addEventListener('click', () => sxRec(false));
  $('#bSxClr').addEventListener('click', sxClear);
  $$('#eqSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const g = S.ig, o = igSolve(); const un = b.dataset.un; if (un === g.un) return; const snap = (v, k) => { const lim = IG_LIM[k], st = { P: 10, V: 1, T: 10, n: 0.5 }[k]; return clamp(Math.round(v / st) * st, lim[0], lim[1]); }; g[g.un] = snap(o[g.un], g.un); g.un = un; updateCtl(); }));
  [['sEP', 'P'], ['sEV', 'V'], ['sET', 'T'], ['sEN', 'n']].forEach(([id, k]) => $('#' + id).addEventListener('input', (e) => { S.ig[k] = +e.target.value; updateCtl(); }));
  $('#sTt').addEventListener('input', (e) => { S.ap.tc = +e.target.value; updateCtl(); });
  $('#sDd').addEventListener('input', (e) => { S.ap.dd = +e.target.value; updateCtl(); });
  $('#sDh').addEventListener('input', (e) => { S.ap.dh = +e.target.value; updateCtl(); });
  $('#sHT').addEventListener('input', (e) => { S.ap.hT = +e.target.value; updateCtl(); });
  $('#sHV').addEventListener('input', (e) => { S.ap.hV = +e.target.value; updateCtl(); });
  $('#sHP').addEventListener('input', (e) => { S.ap.hP = +e.target.value; updateCtl(); });
  ['iZ', 'iN', 'iV', 'iTire', 'iLung', 'iBal'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'model') { L1 = '압력 P'; a = f1(Pm()) + ' kPa'; L2 = '부피 V'; b = S.m.V + ' mL'; L3 = '온도 T'; c = S.m.T + ' K'; }
    else if (m === 'sensor') { const rd = sxCur(); L1 = '압력 P'; a = f1(rd.P) + ' kPa'; L2 = '부피 V'; b = f1(rd.V) + ' mL'; L3 = '온도'; c = f1(rd.t) + ' °C'; }
    else if (m === 'eq') { const o = igSolve(); L1 = 'P V (J)'; L2 = 'n R T (J)'; L3 = 'R'; c = '8.31 J/(mol·K)'; if (o.syr) { a = '2.0 J'; b = showCalc('syr') ? '?' : '2.0 J'; } else if (showCalc('vol') && S.ig.un === 'V') { a = '?'; b = '?'; } else { a = fN(o.P * o.V) + ' J'; b = fN(o.n * R_GAS * o.T) + ' J'; } }
    else if (m === 'tire') { const hide = showCalc('app'); L1 = '바깥 온도'; a = sgn(S.ap.tc) + ' °C (' + (S.ap.tc + 273) + ' K)'; L2 = '절대 압력'; b = hide ? '?' : f1(tireAbs(S.ap.tc)) + ' kPa'; L3 = '계기압'; c = hide ? '?' : f1(tireAbs(S.ap.tc) - 100) + ' kPa'; }
    else if (m === 'dive') { const hide = showCalc('app'); L1 = '수심'; a = S.ap.dd + ' m'; L2 = '폐 속 공기'; b = hide ? '?' : f1(lungV(S.ap.dd)) + ' L'; L3 = '풍선 부피'; c = hide ? '?' : f1(balAt(S.ap.dh / 100).V) + ' L'; }
    else { const h = hotCalc(); L1 = '양력'; a = fN(h.lift) + ' kg'; L2 = '총 질량'; b = fN(h.mass) + ' kg'; L3 = '여유 (양력 − 질량)'; c = (h.net < 0 ? MINUS : '') + fN(Math.abs(h.net)) + ' kg'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const mReset = () => { S.m.V = 20; S.m.T = 300; S.m.sawV = false; S.m.sawT = false; };

  const levels = [
    {
      title: '기체 모형: 충돌이 만드는 압력', short: '기체 모형', icon: '🔬', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 주사기 속 공기를 누르거나 데우면 압력·부피·온도는 어떤 규칙으로 함께 변할까? 세 법칙을 하나로 합칠 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 보일 법칙(온도 일정, 압력 × 부피 일정)과 샤를 법칙(압력 일정, 온도가 오르면 부피 증가)을 배웠어요. 이번에는 먼저 <b>분자 수준</b>에서 압력과 온도가 무엇인지 보고, 세 법칙을 <b>하나의 식</b>으로 합쳐요.</div>' +
        '<p>밀폐된 실린더 속 분자는 쉬지 않고 움직이며 벽에 부딪혀요. 이 충돌이 <b>압력</b>이에요. 🖐️ 부피와 🔥 온도를 바꿔 압력이 어떻게 변하는지 봐요. (온도는 <b>절대 온도 K</b>로 나타내요.)</p>',
      features: ['model'],
      setup() { mReset(); setScene('model'); },
      recap: '압력은 분자가 벽에 충돌하는 힘이에요. 부피를 줄이면 충돌 횟수가 늘고, 온도를 높이면 분자가 빨라져 충돌이 더 잦고 세져서 압력이 커져요. 분자 자체가 커지는 것은 아니에요.',
      summary: '<ul><li><b>압력</b> = 기체 분자가 벽에 충돌하며 가하는 힘(단위 면적당). 부피를 줄이면 분자가 벽에 더 <b>자주</b> 부딪혀 압력이 커져요.</li>' +
        '<li><b>온도</b> = 분자의 <b>평균 운동 에너지</b>의 척도(절대 온도 T에 비례). 가열하면 분자가 빨라져 충돌이 더 잦고 <b>세져서</b> 압력이 커져요.</li>' +
        '<li>주사기 공기(20 mL, 300 K)는 100 kPa이고, 같은 온도에서 10 mL로 줄이면 200 kPa, 같은 부피에서 400 K로 가열하면 약 133 kPa이에요.</li>' +
        '<li>분자 하나의 평균 운동 에너지 (3/2)kT는 300 K에서 6.2 × 10⁻²¹ J이에요 (주어진 값).</li></ul>',
      missions: [
        {
          title: '부피를 줄여 압력 높이기',
          goal: '온도 300 K 그대로 피스톤을 눌러 <b>부피를 10 mL 이하</b>로 줄이고, 압력이 <b>200 kPa</b>에 이르게 하세요.',
          hint: '부피 슬라이더를 10 mL까지 줄여요. 분자가 벽에 더 자주 부딪혀요.',
          setup() { mReset(); setScene('model'); },
          check: () => S.m.V <= 10 && S.m.T <= 300 && Pm() >= 199.9,
          hold: 0.8,
          status: () => mark(S.m.V <= 10) + ' 부피 ' + S.m.V + ' mL &nbsp; ' + mark(S.m.T <= 300) + ' 온도 ' + S.m.T + ' K &nbsp; ' + mark(Pm() >= 199.9) + ' 압력 ' + f1(Pm()) + ' kPa',
          explain: '온도가 같으면 부피를 절반(20 → 10 mL)으로 줄일 때 충돌 횟수가 2배가 되어 압력도 <b>2배(100 → 200 kPa)</b>가 돼요. 이것이 보일 법칙(P × V 일정)이에요.',
        },
        {
          title: '가열해서 압력 높이기',
          goal: '부피 20 mL 그대로 <b>온도를 400 K 이상</b>으로 올리고, 압력이 <b>130 kPa 이상</b>이 되게 하세요.',
          hint: '온도 슬라이더를 400 K까지 올려요. 분자들이 빨라지는 것을 보세요.',
          setup() { mReset(); setScene('model'); },
          check: () => S.m.T >= 400 && S.m.V >= 20 && Pm() >= 130,
          hold: 0.8,
          status: () => mark(S.m.T >= 400) + ' 온도 ' + S.m.T + ' K &nbsp; ' + mark(S.m.V >= 20) + ' 부피 ' + S.m.V + ' mL &nbsp; ' + mark(Pm() >= 130) + ' 압력 ' + f1(Pm()) + ' kPa',
          explain: '300 → 400 K로 가열하면 분자의 평균 운동 에너지가 커져 더 빠르고 세게 충돌해요. 부피가 같을 때 압력은 절대 온도에 비례하므로 100 × 400/300 ≈ <b>133 kPa</b>이에요.',
        },
        {
          type: 'quiz', title: '압력이 커지는 까닭',
          goal: '기체의 압력이 커지는 두 가지 방법(부피 줄이기, 가열하기)을 분자 수준으로 옳게 설명한 것은?',
          setup() { setScene('model'); },
          choices: ['분자가 커져서 벽을 더 세게 밀어요', '부피를 줄이면 분자가 벽에 더 자주 부딪히고, 가열하면 분자가 빨라져 더 자주·더 세게 부딪혀요', '부피를 줄이면 분자 수가 늘어나서 압력이 커져요', '가열하면 분자 수가 늘어나서 압력이 커져요'],
          answer: 1,
          feedback: ['분자의 크기는 변하지 않아요. 바뀌는 것은 충돌 횟수와 충돌 세기예요.', '', '분자 수는 그대로예요(밀폐 용기). 같은 수의 분자가 더 좁은 공간에서 더 자주 부딪혀요.', '분자 수는 그대로예요. 분자가 빨라져서 충돌이 더 잦고 세져요.'],
          explain: '밀폐 용기에서 분자 수는 그대로이고, <b>부피 ↓ → 충돌 횟수 ↑</b>, <b>온도 ↑ → 분자 속력 ↑ → 충돌 횟수·세기 ↑</b>로 압력이 커져요. 분자 자체가 커지는 것은 아니에요.',
        },
      ],
    },
    {
      title: '센서 실험: P, V, T의 관계', short: '센서 실험', icon: '📟', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력과 온도는 분자의 충돌로 이해했어요. 이번에는 <b>압력·온도 센서와 주사기</b>로 세 가지 실험의 데이터를 직접 모아 그래프로 분석해요(공기 20 mL, 300 K, 100 kPa에서 시작).</div>' +
        '<p><b>(a) 등온</b>(T 일정): V를 바꾸며 P 측정 → P–V 곡선과 P–1/V 직선. <b>(b) 정압</b>(P 일정): 온도 t(°C)를 바꾸며 V 측정. <b>(c) 정적</b>(V 일정): t를 바꾸며 P 측정. (b)(c)의 직선을 낮은 온도로 연장해 보면 놀라운 일이 일어나요!</p>',
      features: ['sensor'],
      setup() { S.sx.rec = { iso: [], isob: [], isoc: [] }; S.sx.exp = 'iso'; S.sx.x = { iso: 20, isob: 27, isoc: 27 }; S.kel = false; setFlag('zero', false); setScene('sensor'); },
      recap: '등온에서 P는 1/V에 비례(P × V 일정)하고, 정압의 V–t와 정적의 P–t는 직선이에요. 이 직선을 연장하면 모두 −273 °C에서 V나 P가 0이 돼요. 그래서 절대 온도 T(K) = t(°C) + 273을 써요.',
      summary: '<ul><li><b>등온(보일)</b>: P–V는 곡선, P–(1/V)는 원점을 지나는 직선. P × V = 2000 kPa·mL 일정(오차 ±0.5 %).</li>' +
        '<li><b>정압(샤를)</b>: P = 100 kPa에서 t = 0, 27, 50, 100 °C일 때 V = 18.2, 20.0, 21.5, 24.9 mL. <b>정적(게이뤼삭)</b>: V = 20 mL에서 P = 91, 100, 108, 124 kPa.</li>' +
        '<li>V–t, P–t 직선을 낮은 온도로 연장하면 <b>약 −273 °C</b>에서 0이 돼요(절대 영도). 그래서 0점을 −273 °C로 한 <b>절대 온도 T(K) = t(°C) + 273</b>를 써요.</li>' +
        '<li>V와 P는 t(°C)에 비례하지 않고(0 °C에서 0이 아님), <b>T(K)에 비례</b>해요. V/T, P/T가 일정해요.</li></ul>',
      missions: [
        {
          title: '세 실험의 데이터 5점씩 모으기',
          goal: '<b>등온, 정압, 정적</b> 세 실험에서 값을 바꾸고 <b>📏 측정 기록</b>을 눌러 실험마다 5점 이상 모으세요. (값을 넓게 골라야 해요.)',
          hint: '등온은 V를 8 ~ 20 mL에서, 정압·정적은 t를 0 ~ 100 °C에서 골고루 골라 기록해요. 같은 값은 한 번만 기록돼요.',
          setup() { S.sx.rec = { iso: [], isob: [], isoc: [] }; S.sx.exp = 'iso'; setFlag('zero', false); setScene('sensor'); },
          check: () => sxOk('iso') && sxOk('isob') && sxOk('isoc'),
          hold: 0.5,
          status: () => ['iso', 'isob', 'isoc'].map((e) => mark(sxOk(e)) + ' ' + EXPS[e].name + ' ' + S.sx.rec[e].length + '/5').join(' &nbsp; '),
          explain: '등온에서는 P × V ≈ 2000 kPa·mL로 일정하고 P–1/V가 직선이에요. 정압에서는 V–t, 정적에서는 P–t가 <b>직선</b>이에요. 이제 이 직선을 낮은 온도 쪽으로 연장해 봐요.',
        },
        {
          title: '연장선이 만나는 절대 영도 읽기', manual: true,
          goal: '정압(V–t) 또는 정적(P–t) 그래프의 직선을 낮은 온도로 연장했을 때 <b>V 또는 P가 0이 되는 온도</b>(°C)를 읽어 입력하고 ✔ 확인하기를 누르세요.',
          hint: '점선으로 연장된 직선이 x축(V나 P = 0)과 만나는 곳을 읽어요. −300과 −200 사이, 조금 더 −300에 가까워요. (그래프에 초록 고리가 나타나요.)',
          setup() { sxFill(); S.sx.exp = 'isob'; clr('iZ'); setFlag('zero', true); setScene('sensor'); },
          check() {
            const v = num('iZ'); if (v == null) return '온도를 숫자로 입력해 주세요 (°C).';
            const ok = v >= -290 && v <= -255; fb([[$('#iZ'), ok]]);
            if (ok) { setFlag('zero', false); return true; }
            if (v === 273) return '부호를 확인해요. 0 °C보다 낮은 온도라 음수예요.';
            if (v > -20) return '연장선이 x축과 만나는 곳은 0 °C보다 훨씬 낮은 곳이에요. −300 ~ −200 사이를 봐요.';
            return '그래프에서 점선이 x축과 만나는 눈금을 읽어 보세요 (약 −270 °C 근처).';
          },
          status: () => '입력 ' + ($('#iZ').value.trim() || '—') + ' °C',
          explain: '두 직선 모두 <b>약 −273 °C</b>에서 V 또는 P가 0이 돼요. 이 온도를 절대 영도라 하고, 여기를 0으로 하는 <b>절대 온도 T(K) = t(°C) + 273</b>을 써요. 0 °C = 273 K, 27 °C = 300 K예요.',
        },
        {
          type: 'quiz', title: 'V–t 그래프는 직선인데 왜 비례가 아닐까?',
          goal: '정압 실험의 V–t(°C) 그래프는 직선이지만 V가 t에 비례하지는 않아요. 올바른 설명은?',
          setup() { sxFill(); S.kel = true; S.sx.exp = 'isob'; setFlag('zero', false); setScene('sensor'); },
          choices: ['0 °C일 때 기체의 부피가 0이기 때문이에요', '직선을 연장하면 V = 0이 되는 온도가 −273 °C(0 K)라서, V는 절대 온도 T(K)에 비례하고 t(°C)에는 비례하지 않아요', '기체는 −100 °C에서 액체가 되기 때문이에요', '섭씨 온도는 틀린 온도라서 쓰면 안 돼요'],
          answer: 1,
          feedback: ['0 °C(273 K)에서 부피는 18.2 mL로 0이 아니에요. V = 0은 −273 °C에서 일어나요.', '', '이 실험의 범위에서는 기체 상태가 유지돼요. 직선은 이상 기체를 가정한 연장이에요.', '섭씨 온도도 맞는 온도예요. 다만 비례 관계를 쓸 때는 0점이 절대 영도인 켈빈 온도가 편해요.'],
          explain: 'V = a(t + 273)의 꼴이라 V는 <b>T = t + 273 (K)</b>에 비례해요. 0 °C(= 273 K)에서도 부피가 0이 아닌 까닭이에요. 그래서 기체 법칙에는 항상 <b>절대 온도 K</b>를 써요.',
        },
      ],
    },
    {
      title: 'PV = nRT: 세 법칙을 하나로', short: 'PV=nRT', icon: '🧮', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> P × V 일정(보일), V/T 일정(샤를), P/T 일정(게이뤼삭)을 확인했어요. 세 가지를 모두 합치면 <b>PV / T = 일정</b>이에요. 이 일정한 값은 기체의 양에 따라 달라지는데…</div>' +
        '<p>기체의 양을 <b>몰 수 n</b>(1 mol = 6.0 × 10²³개)으로 나타내면 일정한 값은 <b>n에 비례</b>하고, 비례 상수가 <b>기체 상수 R = 8.31 J/(mol·K)</b>예요. 그래서 <b>PV = nRT</b>예요. (Pa × m³ = J)</p>',
      features: ['eq'],
      setup() { setFlag('syr', false); setFlag('vol', false); S.ig.un = 'V'; S.ig.P = 100; S.ig.V = 25; S.ig.T = 300; S.ig.n = 1; setScene('eq'); },
      recap: '세 법칙을 합치면 PV/T = 일정이고, 그 값은 몰 수 n에 비례해요: PV = nRT (R = 8.31 J/(mol·K)). 같은 온도·압력에서 같은 부피에는 기체의 종류와 상관없이 같은 수의 분자가 들어 있어요.',
      summary: '<ul><li><b>PV = nRT</b>: P(Pa) × V(m³) = n(mol) × 8.31 J/(mol·K) × T(K). kPa × L = J이므로 kPa와 L를 그대로 써도 돼요.</li>' +
        '<li>주사기 공기: n = PV/RT = (1.0 × 10⁵ × 2.0 × 10⁻⁵)/(8.31 × 300) = <b>8.0 × 10⁻⁴ mol</b> (분자 수 4.8 × 10²⁰개).</li>' +
        '<li>1 mol, 300 K, 1.0 × 10⁵ Pa에서 V = nRT/P = 8.31 × 300/10⁵ = 2.5 × 10⁻² m³ = <b>25 L</b>.</li>' +
        '<li>세 개를 정하면 나머지 하나가 정해져요. 분자 하나의 평균 운동 에너지는 T에 비례해요: (3/2)kT (300 K에서 6.2 × 10⁻²¹ J).</li></ul>',
      missions: [
        {
          title: '주사기 공기의 몰 수 구하기', manual: true,
          goal: '주사기 속 공기는 P = 1.0 × 10⁵ Pa, V = 20 mL = 2.0 × 10⁻⁵ m³, T = 300 K예요. <b>n = PV / RT</b>를 계산해 <b>× 10⁻⁴ mol</b> 단위의 숫자로 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'n = (1.0 × 10⁵ × 2.0 × 10⁻⁵) / (8.31 × 300). 분자를 먼저 계산하면 2.0 J이에요. 답은 8 정도의 숫자예요.',
          setup() { S.ig.un = 'n'; clr('iN'); setFlag('vol', false); setFlag('syr', true); setScene('eq'); },
          check() {
            let v = num('iN'); if (v == null) return '몰 수를 숫자로 입력해 주세요 (× 10⁻⁴ mol).';
            if (v > 0 && v < 0.01) v *= 1e4;
            const ok = v >= 7.7 && v <= 8.3; fb([[$('#iN'), ok]]);
            if (ok) return true;
            if (nearRel(v, 8.02e-1, 0.1) || nearRel(v, 80.2, 0.1)) return '자릿수를 확인해요. 8.0 × 10⁻⁴ mol이면 입력값은 8.0이에요. 부피를 m³로 바꿨나요? (20 mL = 2.0 × 10⁻⁵ m³)';
            if (nearRel(v, 2.0 / 300, 0.1) || nearRel(v, 2.0 / 8.31 * 1e4, 0.1)) return 'R = 8.31 J/(mol·K)을 분모에 곱했는지 확인해요. n = PV / (R T)예요.';
            return 'PV = 1.0 × 10⁵ × 2.0 × 10⁻⁵ = 2.0 J, RT = 8.31 × 300을 계산해서 나눠 보세요.';
          },
          status: () => '입력 ' + ($('#iN').value.trim() || '—') + ' × 10⁻⁴ mol',
          explain: 'PV = 1.0 × 10⁵ × 2.0 × 10⁻⁵ = 2.0 J, RT = 8.31 × 300 ≈ 2493 J/mol이므로 n = 2.0 / 2493 ≈ <b>8.0 × 10⁻⁴ mol</b>이에요. 분자 수는 8.0 × 10⁻⁴ × 6.0 × 10²³ ≈ <b>4.8 × 10²⁰개</b>예요.',
        },
        {
          title: '1 mol 기체의 부피 구하기', manual: true,
          goal: '<b>1 mol</b>의 기체가 <b>300 K, 1.0 × 10⁵ Pa</b>일 때의 부피를 <b>V = nRT / P</b>로 계산해 <b>리터(L)</b>로 입력하고 ✔ 확인하기를 누르세요. (1 m³ = 1000 L)',
          hint: 'V = (1 × 8.31 × 300) / (1.0 × 10⁵) m³ = 0.0249 m³ 정도예요. 리터로 바꾸면 얼마일까요?',
          setup() { S.ig.un = 'V'; S.ig.P = 150; S.ig.T = 400; S.ig.n = 2; clr('iV'); setFlag('syr', false); setFlag('vol', true); setScene('eq'); },
          check() {
            const v = num('iV'); if (v == null) return '부피를 숫자로 입력해 주세요 (L).';
            const ok = v >= 24 && v <= 26; fb([[$('#iV'), ok]]);
            if (ok) { setFlag('vol', false); return true; }
            if (nearRel(v, 0.0249, 0.1)) return '단위를 확인해요. 0.0249 m³는 24.9 L예요 (1 m³ = 1000 L).';
            if (nearRel(v, 24.9 * 1000, 0.1)) return 'm³를 L로 바꿀 때 1000을 곱해요. 1000으로 나누지 않아요.';
            return 'V = nRT / P = (1 × 8.31 × 300) / (1.0 × 10⁵)을 계산한 뒤 L로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#iV').value.trim() || '—') + ' L',
          explain: 'V = nRT/P = (1 × 8.31 × 300) / (1.0 × 10⁵) = 2.49 × 10⁻² m³ ≈ <b>25 L</b>예요. 1기압·실온에서 기체 1 mol은 약 25 L를 차지해요. 슬라이더로 n = 1.0, T = 300 K, P = 100 kPa로 맞추면 같은 값(24.9 L)이 나와요.',
        },
        {
          type: 'quiz', title: '압력 2배, 온도 2배일 때 부피',
          goal: '몰 수 n이 일정한 기체의 <b>압력을 2배</b>, <b>절대 온도를 2배</b>로 하면 부피는 어떻게 될까요?',
          setup() { setFlag('syr', false); setFlag('vol', false); setScene('eq'); },
          choices: ['4배가 돼요', '변화가 없어요', '1/4배가 돼요', '2배가 돼요'],
          answer: 1,
          feedback: ['V = nRT/P에서 T가 2배면 V도 2배, P가 2배면 V는 1/2배라 서로 상쇄돼요.', '', 'T가 2배라 V는 2배가 되고, P가 2배라 1/2이 되는 것을 곱해 보세요.', 'T가 2배라 V는 2배가 되지만, P가 2배라 V는 다시 1/2배가 돼요.'],
          explain: 'V = nRT / P에서 T와 P가 모두 2배이면 V = n R (2T) / (2P) = <b>그대로</b>예요. 또 같은 온도·압력에서 같은 부피에는 기체의 종류와 상관없이 같은 수(같은 n)의 분자가 들어 있어요.',
        },
      ],
    },
    {
      title: '생활 적용: 타이어, 잠수, 열기구', short: '생활 적용', icon: '🎈', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> PV = nRT와 그 변형(PV/T 일정)을 만들었어요. 이제 <b>일상의 열 현상</b> 세 가지에 적용해요. 압력은 <b>절대 압력</b>, 온도는 <b>켈빈</b>으로 계산하는 것을 잊지 마요.</div>' +
        '<p>🚗 겨울 타이어 압력, 🤿 잠수부의 폐와 🎈 헬륨 풍선의 부피를 계산하고, 마지막으로 🎈 <b>열기구</b>를 설계해 승객을 태우고 떠오르게 해요. 정답은 하나가 아니에요.</p>',
      features: ['tire', 'dive', 'hot'],
      setup() { setFlag('app', false); S.ap.tc = 27; S.ap.dd = 10; S.ap.dh = 0; setScene('tire'); },
      recap: '부피가 일정하면 P/T가 일정해 겨울에 타이어 압력이 줄어요(계기압 + 대기압 = 절대 압력). 압력이 줄면 부피가 커져 폐와 풍선이 팽창해요. 열기구는 풍선 안 공기가 가열되어 밀도가 작아지면서 양력을 얻어요.',
      summary: '<ul><li><b>타이어</b>: 27 °C(300 K)에서 계기압 220 kPa = 절대 압력 320 kPa. −13 °C(260 K)에서 부피 일정이면 P = 320 × 260/300 ≈ 277 kPa, <b>계기압 177 kPa</b> → 경고등.</li>' +
        '<li><b>잠수</b>: 수심 10 m(2기압)에서 폐 속 공기 6 L를 참고 수면(1기압)으로 오르면 보일 법칙으로 <b>12 L</b>(위험). <b>헬륨 풍선</b>: 지상 10 L → 상공(0.5기압, 270 K) V = 10 × (1.0/0.5) × (270/300) = <b>18 L</b>.</li>' +
        '<li><b>열기구</b>: 밀도 ρ = PM/RT (M = 0.029 kg/mol). 20 °C 1.2 kg/m³, 100 °C 0.95 kg/m³. 부피 2000 m³이면 양력 ≈ (1.2 − 0.95) × 2000 ≈ 520 kg이고, 총 질량(장비 + 승객)이 이보다 작아야 떠요.</li>' +
        '<li>스프레이 캔을 가열하면 부피가 일정해 압력이 커져 터질 수 있어요. 높은 산 위에서 과자 봉지가 부푸는 것은 바깥 압력이 줄었기 때문이에요.</li></ul>',
      missions: [
        {
          title: '타이어·폐·풍선 계산하고 확인하기', manual: true,
          goal: '① −13 °C에서 타이어의 <b>계기압</b>(kPa), ② 수면에서 폐 속 공기(L), ③ 상공 헬륨 풍선(L)을 계산해 입력하고 ✔ 확인하기를 누르세요. 맞으면 장면에서 값을 확인할 수 있어요.',
          hint: '① 절대 압력 320 kPa × 260/300 에서 대기압 100 kPa를 빼요. ② 2기압 × 6 L = 1기압 × V. ③ P₁V₁/T₁ = P₂V₂/T₂에서 T는 켈빈.',
          setup() { S.ap.tc = 27; S.ap.dd = 10; S.ap.dh = 0; clr('iTire', 'iLung', 'iBal'); setFlag('app', true); setScene('tire'); },
          check() {
            const xs = ['iTire', 'iLung', 'iBal'].map(num);
            if (xs.some((x) => x == null)) return '세 칸에 모두 숫자를 입력해 주세요.';
            const ans = [177.3, 12, 18], tol = [3, 0.5, 0.5], oks = xs.map((x, i) => Math.abs(x - ans[i]) <= tol[i]);
            fb(oks.map((o, i) => [$('#' + ['iTire', 'iLung', 'iBal'][i]), o]));
            if (oks.every(Boolean)) { setFlag('app', false); return true; }
            if (!oks[0] && Math.abs(xs[0] - 190.7) <= 3) return '타이어는 계기압이 아니라 절대 압력(계기압 + 100 kPa)에 비례해요. 절대 압력으로 계산한 뒤 100 kPa를 빼요.';
            if (!oks[0] && Math.abs(xs[0] - 277.3) <= 3) return '그것은 절대 압력이에요. 계기압은 절대 압력에서 대기압 100 kPa를 뺀 값이에요.';
            if (!oks[1]) return '폐: 압력이 2기압 → 1기압으로 절반이 되면 부피는 2배가 돼요 (온도 일정).';
            if (!oks[2]) return '풍선: 압력은 1/2배라 부피 ×2, 온도는 270/300배라 부피 ×0.9예요. 둘 다 곱해요.';
            return '붉은 칸을 다시 계산해 보세요.';
          },
          status: () => '입력 ' + ['iTire', 'iLung', 'iBal'].filter((id) => $('#' + id).value.trim()).length + ' / 3',
          explain: '① P = 320 × 260/300 ≈ 277 kPa(절대), 계기압 = 277 − 100 = <b>177 kPa</b>. ② 2 × 6 = 1 × V → <b>12 L</b>(폐가 2배로 부풀어 위험!). ③ V = 10 × (1.0/0.5) × (270/300) = <b>18 L</b>.',
        },
        {
          title: '열기구 설계하기',
          goal: '풍선 안 공기 온도와 부피를 골라, <b>승객 4명</b>(80 kg씩)과 장비 330 kg(총 650 kg)을 태우고 <b>양력이 총 질량보다 20 kg 이상</b> 크게 하세요.',
          hint: '양력 = (ρ바깥 − ρ안) × V. 온도가 높고 부피가 클수록 양력이 커요. 예: 115 °C, 2300 m³는 약 679 kg이에요. 정답은 하나가 아니에요.',
          setup() { setFlag('app', false); S.ap.hT = 100; S.ap.hV = 2000; S.ap.hP = 4; setScene('hot'); },
          check: () => hotCalc().ok,
          hold: 1.0,
          status() { const h = hotCalc(); return mark(S.ap.hP === 4) + ' 승객 ' + S.ap.hP + '명 &nbsp; ' + mark(h.ok) + ' 양력 ' + fN(h.lift) + ' kg / 총 질량 ' + fN(h.mass) + ' kg (여유 ' + (h.net < 0 ? MINUS : '') + fN(Math.abs(h.net)) + ' kg)'; },
          explain: '공기를 데우면 같은 압력에서 밀도 ρ = PM/RT가 작아져(20 °C 1.21 → 100 °C 0.95 kg/m³) 바깥 공기보다 가벼워져요. 그 차이 × 부피가 <b>양력</b>(= 뜨게 하는 힘을 질량으로 나타낸 값)이에요. 온도를 높이거나 풍선을 키우면 양력이 커져요.',
        },
        {
          type: 'quiz', title: '밀폐된 스프레이 캔을 가열하면?',
          goal: '밀폐된 스프레이 캔을 불 가까이 두면 터질 수 있어요. 까닭으로 알맞은 것은? (🚗🤿🎈 장면에서 PV = nRT를 떠올려 봐요.)',
          setup() { setFlag('app', false); setScene('tire'); },
          choices: ['캔 속 분자 수가 늘어나서 압력이 커져요', '캔의 부피가 일정한 채 온도가 오르면 P = nRT/V에서 압력이 커져서 캔이 견디지 못해요', '온도가 오르면 기체의 부피가 줄어들어서 압력이 커져요', '캔 속 기체가 액체로 변하면서 압력이 커져요'],
          answer: 1,
          feedback: ['밀폐 용기라 분자 수는 그대로예요. 분자가 빨라져 압력이 커지는 거예요.', '', '부피는 캔이 정해서 변하지 않아요(일정). 온도가 오르면 분자가 빨라져 압력이 커져요.', '가열하면 액체가 아니라 기체 쪽으로 가요. P = nRT/V의 T가 커져서 압력이 커져요.'],
          explain: '밀폐 캔은 n과 V가 일정하므로 <b>P ∝ T</b>예요. 가열하면 절대 압력이 커져 캔이 터질 수 있어요. 높은 산 위에서 과자 봉지가 부푸는 것은 반대로 바깥 압력이 줄어(P↓) 안의 기체 부피가 커지기 때문이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-ideal-gas', mount: '#game', badge: '기체 박사', homeHref: '../../index.html#hm',
    featureLabels: { model: '🔬 기체 모형 · 충돌과 압력', sensor: '📟 센서 실험 · 그래프 분석', eq: '🧮 PV = nRT 계산기', tire: '🚗 겨울 타이어', dive: '🤿 잠수와 헬륨 풍선', hot: '🎈 열기구 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('model');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    // 미션용 기록 (부피·온도를 거쳐 간 적이 있는지)
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'model': drawModel(dt); break;
      case 'sensor': drawSensor(dt); break;
      case 'eq': drawEq(dt); break;
      case 'tire': drawTire(dt); break;
      case 'dive': drawDive(dt); break;
      default: drawHot(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, sxRec, sxFill, sxFit, sxRead, igSolve, hotCalc, hotLift, tireAbs, lungV, balAt, Pm, N_SYR, K0,
  };
})();
