/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 운동 법칙과 교통안전 (단원 3차시)
   성취기준 [12물리01-02] 뉴턴 운동 법칙으로 등가속도 운동을 설명하고, 교통안전 사고 예방에 적용할 수 있다. (운동 법칙, 교통안전 부분)
   ① 실험: 힘과 가속도 (일정한 질량에서 a ∝ F, F–a 그래프의 기울기 = 1/m)
   ② 실험: 질량과 가속도 (일정한 힘에서 a ∝ 1/m, F = ma, 도르래로 연결된 수레와 추)
   ③ 탐구: 제동 거리 (a = μg, s = v²/(2μg), 반응 거리 + 제동 거리)
   ④ 적용: 안전 설계 (어린이 보호구역, 비 오는 날 감속, 졸음운전)
   직선 운동만 다루고 마찰력은 f = μN(운동 마찰)까지만 써요. 비탈면·공기 저항·회전은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const SH = PHONE ? 312 : 300;                         // 장면(위쪽) 높이
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;   // 아래쪽 자료 패널
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const MINUS = '−';
  const fnum = (v, d) => (v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);
  const fm = (x) => String(+x.toFixed(2));                      // 거리(m): 소수 둘째 자리까지, 끝의 0은 생략 (모든 곳에서 같은 반올림)

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  /* 캔버스 글자는 가상 좌표에서 13px 이상으로 */
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    size = Math.max(13, size);
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    size = Math.max(13, size);
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgFill(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const approach = (a, b, dt, k) => SciSim.approach(a, b, dt, k);

  /* ================= 상수 (글과 코드가 같은 값을 써요) ================= */
  const G = 10;                                     // N/kg
  const FM = 2.0;                                   // 힘 실험의 수레 질량 (kg)
  const F_LIST = [0, 2, 4, 6, 8];                   // 당기는 힘 (N)
  const MF = 6;                                     // 질량 실험의 힘 (N)
  const M_LIST = [1, 2, 3, 6];                      // 수레의 질량 (kg)
  const T_RUN = 1.0;                                // 측정 시간 (s)
  const X0M = 0.5;                                  // 수레의 처음 위치 (m)
  const V0_ZERO_F = 1.0;                            // F = 0일 때 처음에 살짝 밀어 준 속력 (m/s)
  const PUL = { M: 1.5, m: 0.5, T_RUN: 1.0 };       // 도르래: 수레 질량, 추의 질량
  const PUL_A = PUL.m * G / (PUL.M + PUL.m);         // 2.5 m/s²
  const PUL_T = PUL.M * PUL_A;                       // 3.75 N
  const PUL_W = PUL.m * G;                           // 5.0 N
  const CAR_KG = 1000, TRUCK_KG = 5000;
  const ROADS = { dry: { mu: 0.8, name: '마른 도로' }, wet: { mu: 0.4, name: '젖은 도로' }, snow: { mu: 0.1, name: '눈길' } };
  const T_ALERT = 0.7, T_SLEEPY = 2.0;               // 반응 시간 (s)
  const KMH = 3.6;
  const BR_SPEEDS = [36, 54, 72, 90, 108];
  const RAIN_LIMIT = 100, RAIN_CUT = 0.2;            // 제한 속도 (km/h), 비 오는 날 감속 비율
  const RAIN_SPEED = Math.round(RAIN_LIMIT * (1 - RAIN_CUT));   // 80 km/h
  const SCEN = {
    school: { name: '어린이 보호구역', road: 'dry', d: 12, drv: 'alert', icon: '🧒', speed: 50 },
    rain: { name: '비 오는 날', road: 'wet', d: 60, drv: 'alert', icon: '🚧', speed: 50 },
    sleepy: { name: '졸음운전', road: 'dry', d: 50, drv: 'sleepy', icon: '🚧', speed: 70 },
  };
  /* 제동 계산 (속력 kmh, 도로, 반응 시간) */
  function stopCalc(kmh, road, tr) {
    const v = kmh / KMH, mu = ROADS[road].mu, a = mu * G;
    const r = v * tr, b = v * v / (2 * a);
    return { v, mu, a, tr, r, b, total: r + b, tBrake: v / a };
  }
  const niceMax = (x) => [25, 50, 75, 100, 150, 200, 250, 300, 500, 750].find((n) => n >= x * 1.04) || 1000;

  /* ---------- 상태 ---------- */
  const S = { mode: 'force', clock: 0, fade: 0, fo: null, ms: null, pu: null, br: null, sf: null, flags: { fcheck: false, rule: false, cards: false }, rule: {}, ruleOK: {}, card: {}, cardOK: {} };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  /* 장면이 바뀌면 진행 중이던 측정·영상은 멈춰서, 중간 상태가 남지 않게 해요 */
  function settleRuns() {
    [S.fo, S.ms].forEach((r) => { if (r && r.st === 'run') { r.st = 'idle'; r.run = null; r.t = 0; } });
    if (S.pu && S.pu.st === 'run') { S.pu.st = 'idle'; S.pu.t = 0; S.pu.auto = 0; }
    if (S.br && S.br.st === 'run') { S.br.st = 'idle'; S.br.run = null; S.br.tau = 0; }
    if (S.sf && S.sf.st === 'run') { S.sf.st = 'idle'; S.sf.run = null; S.sf.tau = 0; }
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); settleRuns(); }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= 트랙 장면 (힘 · 질량) ================= */
  const TK = PHONE ? { x0: 26, ppm: 86, gy: 200 } : { x0: 56, ppm: 140, gy: 196 };
  const RUN_COL = { force: { 0: '#94a3b8', 2: '#3867f4', 4: '#14a058', 6: '#f59e0b', 8: '#e2464b' }, mass: { 1: '#e2464b', 2: '#3867f4', 3: '#14a058', 6: '#7c5cff' } };
  function newRun(kind, p) {   // kind: force | mass
    const F = kind === 'force' ? p : MF, m = kind === 'force' ? FM : p;
    return { F, m, a: F / m, v0: kind === 'force' && F === 0 ? V0_ZERO_F : 0 };
  }
  function resetForce(keepRec) {
    const p = S.fo;
    S.fo = { F: p ? p.F : 2, st: 'idle', t: 0, run: null, rec: keepRec && p ? p.rec : {}, slope: '', mass: '' };
    updateCtl();
  }
  function resetMass(keepRec) {
    const p = S.ms;
    S.ms = { m: p ? p.m : 2, st: 'idle', t: 0, run: null, rec: keepRec && p ? p.rec : {}, g: p ? p.g : 'am' };
    updateCtl();
  }
  const runVel = (r, t) => r.v0 + r.a * t;
  const runPos = (r, t) => X0M + r.v0 * t + 0.5 * r.a * t * t;
  function startRun(S0, kind) {
    if (S0.st === 'run') return;
    const p = kind === 'force' ? S0.F : S0.m;
    S0.run = newRun(kind, p); S0.t = 0; S0.st = 'run'; parts.clear(); Sound.click(); updateCtl();
  }
  function stepRun(S0, kind, dt) {
    if (S0.st !== 'run') return;
    S0.t = Math.min(T_RUN, S0.t + dt / (RM ? 0.25 : 1));
    if (S0.t >= T_RUN) {
      S0.st = 'done';
      const r = S0.run, aMeas = Math.round(((runVel(r, T_RUN) - runVel(r, 0)) / T_RUN) * 1000) / 1000;   // v–t 그래프의 기울기
      S0.rec[kind === 'force' ? r.F : r.m] = aMeas;
      Sound.success(); parts.burst(TK.x0 + runPos(r, T_RUN) * TK.ppm, TK.gy - 30, { count: 12, speed: 120, size: 3, colors: ['#14a058', '#ffd447', '#fff'], gravity: 140, life: 0.7 });
      updateCtl();
    }
  }
  const recKeys = (rec) => Object.keys(rec).map(Number).sort((a, b) => a - b);
  function drawCartBody(cx, gy, m, sc) {   // 질량 m kg의 수레: 본체 1 kg + 추 (m − 1)개
    const w = 74 * sc, h = 26 * sc, slab = 8 * sc, n = Math.max(0, Math.round(m) - 1);
    D.shadow(() => { D.roundRect(cx - w / 2, gy - 8 * sc - h, w, h, 7 * sc); const g = ctx.createLinearGradient(0, gy - h, 0, gy); g.addColorStop(0, '#ff9a63'); g.addColorStop(1, '#e2552a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#a63c14'; ctx.lineWidth = 2; D.roundRect(cx - w / 2, gy - 8 * sc - h, w, h, 7 * sc); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const y = gy - 8 * sc - h - (i + 1) * slab;
      D.roundRect(cx - w / 2 + 6 * sc, y, w - 12 * sc, slab - 1, 2); ctx.fillStyle = i % 2 ? '#6b7a99' : '#8794b0'; ctx.fill(); ctx.strokeStyle = '#4b5a78'; ctx.lineWidth = 1; ctx.stroke();
    }
    [-0.3, 0.3].forEach((f) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(cx + f * w, gy - 8 * sc, 8 * sc, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(cx + f * w, gy - 8 * sc, 3 * sc, 0, TAU); ctx.fill(); });
    return { top: gy - 8 * sc - h - n * slab, front: cx + w / 2, w, h };
  }
  function trackBase(title) {
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, title, PHONE ? 14 : 17, '#26324a', 'left', 800);
    const gy = TK.gy, x0 = TK.x0, x1 = TK.x0 + 5 * TK.ppm;
    ctx.fillStyle = '#c3ccd8'; D.roundRect(x0 - 14, gy, 5 * TK.ppm + 28, 14, 5); ctx.fill(); ctx.fillStyle = '#97a3b5'; ctx.fillRect(x0 - 14, gy, 5 * TK.ppm + 28, 3);
    for (let m = 0; m <= 5; m++) { const x = x0 + m * TK.ppm; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, gy + 14); ctx.lineTo(x, gy + 22); ctx.stroke(); T(x, gy + 40, m + (m === 5 ? ' m' : ''), 13, '#3a465c', 'center', 800); }
    T(x1 + 14, gy + 40, '', 13, '#3a465c');
  }
  function drawTrackScene(S0, kind, dt) {
    const gy = TK.gy, sc = PHONE ? 0.95 : 1.5;
    const run = S0.run, idle = S0.st === 'idle', tNow = idle ? 0 : S0.t;
    const Fsel = kind === 'force' ? S0.F : MF, msel = kind === 'force' ? FM : S0.m;
    const rr = run && !idle ? run : newRun(kind, kind === 'force' ? Fsel : msel);
    const x = runPos(rr, tNow), v = runVel(rr, tNow);
    trackBase(kind === 'force' ? '🧪 마찰 없는 트랙의 수레(' + FM.toFixed(1) + ' kg)를 힘 센서로 당겨요' : '⚖️ 같은 힘(' + MF + ' N)으로 질량이 다른 수레를 당겨요');
    const cx = TK.x0 + x * TK.ppm, body = drawCartBody(cx, gy, rr.m, sc);
    // 줄 · 힘 센서 · 당기는 장치
    const ropeY = gy - 8 * sc - body.h * 0.5, px = body.front + 70 * sc;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(body.front, ropeY); ctx.lineTo(px - 14, ropeY); ctx.stroke();
    const sx = body.front + 18 * sc;
    D.roundRect(sx, ropeY - 15, 52 * sc, 28, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
    T(sx + 26 * sc, ropeY - 2, '센서', 13, '#9ae6b4', 'center', 800); T(sx + 26 * sc, ropeY + 11, rr.F + ' N', 13, '#9ae6b4', 'center', 800);
    D.sphere(px, ropeY, 12, '#8e9ab0', { gloss: true, outline: '#5a6679' });
    // 힘 화살표 (길이는 힘에 비례)
    if (rr.F > 0) D.arrow(body.front + 2, body.top - 18, body.front + 2 + rr.F * 9.5 * sc, body.top - 18, { color: '#e2464b', width: 6, head: 13, label: 'F = ' + rr.F + ' N', labelOffset: -20 });
    else D.label(body.front + 70, body.top - 18, 'F = 0 (처음에 살짝 밀기만)', { bg: '#5a6679', size: 13, align: 'left' });
    // 속도 화살표 (길이는 속력에 비례)
    if (v > 0.02) D.arrow(cx, gy + 66, cx + v * 20 * sc, gy + 66, { color: '#14a058', width: 5, head: 12, label: 'v = ' + v.toFixed(1) + ' m/s', labelOffset: -18 });
    if (!idle) D.label(VW - 14, 28, 't = ' + tNow.toFixed(1) + ' s', { bg: '#26324a', size: 13.5, align: 'right' });
    else D.label(VW - 14, 28, '▶ 측정하기를 눌러요', { bg: '#5a6679', size: 13, align: 'right' });
    drawTrackPanel(S0, kind, rr, tNow, idle);
    parts.update(dt); parts.draw(ctx);
  }
  /* 작은 그래프 틀: rect 안에 제목 · 눈금 · 격자 */
  function miniAxes(rc, o) {
    const ml = PHONE ? 38 : 40, mr = 10, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill();
    const gx = (xv) => ix + iw * xv / o.xmax, gy = (yv) => iy + ih - ih * yv / o.ymax;
    for (let yv = 0; yv <= o.ymax + 1e-9; yv += o.ystep) {
      ctx.strokeStyle = yv === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = yv === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = 0; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    if (o.right) T(rc.x + rc.w - 8, rc.y + 21, o.right, 13.5, o.rightColor || '#c2410c', 'right', 800);
    T(ix + iw, iy + ih + 17 + 0, '', 13, '#000');
    return { gx, gy, ix, iy, iw, ih };
  }
  const PCOLS = () => PHONE
    ? { vt: { x: PX + 4, y: PY + 4, w: 226, h: 136 }, law: { x: PX + 238, y: PY + 4, w: 226, h: 136 }, tb: { x: PX + 8, y: PY + 144, w: PW - 16, h: PH - 148 } }
    : { vt: { x: PX + 8, y: PY + 8, w: 228, h: PH - 16 }, law: { x: PX + 246, y: PY + 8, w: 228, h: PH - 16 }, tb: { x: PX + 486, y: PY + 8, w: PW - 494, h: PH - 16 } };
  function drawTrackPanel(S0, kind, rr, tNow, idle) {
    const pc = PCOLS(), force = kind === 'force';
    panel(PX, PY, PW, PH, 16);
    // v–t 그래프
    const vmax = force ? 5 : 7;
    const doneA = S0.st === 'done' ? S0.rec[force ? rr.F : rr.m] : null;
    const ax = miniAxes(pc.vt, { xmax: T_RUN, xstep: 0.2, ymax: vmax, ystep: 1, title: '속도–시간 (v–t)', right: doneA != null ? 'a = ' + doneA.toFixed(1) + ' m/s²' : '', rightColor: '#0b6b39' });
    const keys = recKeys(S0.rec), colors = RUN_COL[kind];
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    keys.forEach((k) => {
      const r = newRun(kind, k), cur = !idle && rr.F === r.F && rr.m === r.m;
      ctx.strokeStyle = colors[k]; ctx.globalAlpha = cur ? 1 : 0.55; ctx.lineWidth = cur ? 3.5 : 2.2;
      ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(runVel(r, 0))); ctx.lineTo(ax.gx(T_RUN), ax.gy(runVel(r, T_RUN))); ctx.stroke(); ctx.globalAlpha = 1;
    });
    if (!idle && S0.st === 'run') {   // 측정 중인 점 (0.1 s마다)
      ctx.strokeStyle = colors[kind === 'force' ? rr.F : rr.m]; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(runVel(rr, 0))); ctx.lineTo(ax.gx(tNow), ax.gy(runVel(rr, tNow))); ctx.stroke();
      for (let k = 0; k * 0.1 <= tNow + 1e-9; k++) D.sphere(ax.gx(k * 0.1), ax.gy(runVel(rr, k * 0.1)), 4.5, colors[kind === 'force' ? rr.F : rr.m], { gloss: false });
    }
    ctx.restore();
    // 법칙 그래프
    if (force) drawFA(pc.law, S0, keys);
    else drawAM(pc.law, S0, keys);
    // 표
    const tb = pc.tb, hdr = force ? ['F (N)', 'a (m/s²)', 'a / F (kg⁻¹)'] : ['m (kg)', 'a (m/s²)', 'm × a (N)'];
    if (!PHONE) { D.roundRect(tb.x, tb.y, tb.w, tb.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }
    T(tb.x + 10, tb.y + (PHONE ? 16 : 21), '📋 측정 기록', 13.5, '#26324a', 'left', 800);
    const c0 = tb.x + 12, cw = (tb.w - 20) / 3, rh = PHONE ? 21 : 25, hy = tb.y + (PHONE ? 36 : 46);
    hdr.forEach((h, i) => T(c0 + cw * i, hy, h, 13, '#5a6679', 'left', 800));
    if (!keys.length) T(c0, hy + rh, '아직 기록이 없어요', 13.5, '#98a2b3', 'left', 700);
    keys.slice(0, 5).forEach((k, i) => {
      const y = hy + (i + 1) * rh, a = S0.rec[k];
      D.roundRect(c0 - 6, y - rh + 5, 8, 14, 2); ctx.fillStyle = colors[k]; ctx.fill();
      T(c0 + 8, y, String(k), 14, '#26324a', 'left', 800);
      T(c0 + cw, y, a.toFixed(1), 14, '#26324a', 'left', 800);
      T(c0 + cw * 2, y, force ? (k === 0 ? '—' : (a / k).toFixed(2)) : (k * a).toFixed(1), 14, '#0b6b39', 'left', 800);
    });
  }
  const faFit = (rec) => { const ks = recKeys(rec).filter((k) => k > 0); if (ks.length < 2) return null; let num = 0, den = 0; ks.forEach((k) => { num += k * rec[k]; den += k * k; }); return num / den; };
  function drawFA(rc, S0, keys) {
    const slope = faFit(S0.rec);
    const ax = miniAxes(rc, { xmax: 8, xstep: 2, ymax: 5, ystep: 1, title: 'F–a 그래프', right: slope != null ? '기울기 ' + slope.toFixed(2) + ' kg⁻¹' : '' });
    T(rc.x + rc.w - 6, ax.iy + ax.ih + 17, '', 13, '#000');
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    if (slope != null) { ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(8), ax.gy(8 * slope)); ctx.stroke(); ctx.setLineDash([]); }
    keys.forEach((k) => D.sphere(ax.gx(k), ax.gy(S0.rec[k]), 6, RUN_COL.force[k], { gloss: false, outline: '#fff', outlineWidth: 1.5 }));
    ctx.restore();
    T(ax.ix + ax.iw, ax.iy + ax.ih - 6, 'F (N)', 13, '#3a465c', 'right', 800);
  }
  function drawAM(rc, S0, keys) {
    const inv = S0.g === 'ainv', n = keys.length;
    const ax = miniAxes(rc, inv ? { xmax: 1, xstep: 0.25, ymax: 8, ystep: 2, title: 'a–(1/m) 그래프', right: n >= 2 ? '기울기 = F' : '' } : { xmax: 6, xstep: 2, ymax: 8, ystep: 2, title: 'a–m 그래프', right: n >= 3 ? '반비례' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    if (inv && n >= 2) { ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(1), ax.gy(MF)); ctx.stroke(); ctx.setLineDash([]); }
    if (!inv && n >= 3) { ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); for (let m = 0.7; m <= 6.01; m += 0.1) { const X = ax.gx(m), Y = ax.gy(MF / m); if (m < 0.71) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); ctx.setLineDash([]); }
    keys.forEach((k) => D.sphere(inv ? ax.gx(1 / k) : ax.gx(k), ax.gy(S0.rec[k]), 6, RUN_COL.mass[k], { gloss: false, outline: '#fff', outlineWidth: 1.5 }));
    ctx.restore();
    T(ax.ix + ax.iw, ax.iy + ax.ih - 6, inv ? '1/m (kg⁻¹)' : 'm (kg)', 13, '#3a465c', 'right', 800);
  }

  /* ================= 도르래: 수레 + 추 ================= */
  function resetPulley(auto) { S.pu = { st: 'idle', t: 0, auto: auto ? 0.5 : 0, done: false }; updateCtl(); }
  function startPulley() { const p = S.pu; if (p.st === 'run') return; p.st = 'run'; p.t = 0; Sound.click(); updateCtl(); }
  function stepPulley(dt) {
    const p = S.pu;
    if (p.auto > 0) { p.auto -= dt; if (p.auto <= 0) { p.auto = 0; startPulley(); } }
    if (p.st !== 'run') return;
    p.t = Math.min(PUL.T_RUN, p.t + dt / (RM ? 0.25 : 1));
    if (p.t >= PUL.T_RUN) { p.st = 'done'; p.done = true; Sound.success(); updateCtl(); }
  }
  function drawPulley(dt) {
    const p = S.pu, sc = PHONE ? 0.85 : 1.3, ppm = PHONE ? 70 : 80;   // 1 m당 화소 (추가 내려와도 mg 화살표가 아래 자료 패널에 가려지지 않게)
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, '🧵 수레(' + PUL.M.toFixed(1) + ' kg)와 추(' + PUL.m.toFixed(1) + ' kg)를 줄로 연결해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const tabY = PHONE ? 100 : 96, x0 = PHONE ? 40 : 70, edge = PHONE ? 330 : 470, t = p.t, run = p.st !== 'idle';
    const d = 0.5 * PUL_A * t * t;                           // 이동 거리 (m)
    // 탁자
    D.roundRect(x0 - 24, tabY, edge - x0 + 24 + 10, 16, 5); ctx.fillStyle = '#b8844a'; ctx.fill(); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x0 - 24, tabY, edge - x0 + 34, 4);
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x0 - 14, tabY + 16, 12, SH - tabY - 40);
    ctx.fillRect(edge - 12, tabY + 16, 12, SH - tabY - 40);
    // 도르래
    const pxc = edge + 14, pyc = tabY - 12;
    D.sphere(pxc, pyc, 16, '#c3ccd8', { gloss: true, outline: '#5a6679' });
    ctx.fillStyle = '#5a6679'; ctx.beginPath(); ctx.arc(pxc, pyc, 4, 0, TAU); ctx.fill();
    // 수레
    const cx = x0 + 40 * sc + d * ppm;
    const cartW = 74 * sc, ropeY = tabY - 8 * sc - 13 * sc, front = cx + cartW / 2;
    drawCartBody(cx, tabY, PUL.M, sc);
    // 줄: 수레 앞 → 도르래 → 추
    const blockTop = pyc + 16 + (PHONE ? 22 : 30) + d * ppm;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(front, ropeY); ctx.lineTo(pxc, pyc - 16); ctx.arc(pxc, pyc, 16, -Math.PI / 2, 0); ctx.lineTo(pxc + 16, blockTop); ctx.stroke();
    // 장력 센서 (수레 가까이)
    const sx = front + 12 * sc;
    D.roundRect(sx, ropeY - 31, 66 * sc, 28, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
    const tShown = run ? PUL_T : PUL_W;
    T(sx + 33 * sc, ropeY - 18, '장력 T', 13, '#9ae6b4', 'center', 800); T(sx + 33 * sc, ropeY - 5, fnum(tShown, 2) + ' N', 13, '#9ae6b4', 'center', 800);
    // 추
    const bw = PHONE ? 30 : 38, bx = pxc + 16 - bw / 2;
    D.shadow(() => { D.roundRect(bx, blockTop, bw, bw * 1.1, 6); const g = ctx.createLinearGradient(0, blockTop, 0, blockTop + bw); g.addColorStop(0, '#6b8de0'); g.addColorStop(1, '#3a5cb8'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#2547a3'; ctx.lineWidth = 2; D.roundRect(bx, blockTop, bw, bw * 1.1, 6); ctx.stroke();
    T(bx + bw / 2, blockTop + bw * 0.62, PUL.m.toFixed(1), 13, '#fff', 'center', 800);
    // 힘 화살표 (1 N당 같은 길이)
    const sN = PHONE ? 8 : 11;
    D.arrow(bx + bw + 12, blockTop + 4, bx + bw + 12, blockTop + 4 + PUL_W * sN, { color: '#e2464b', width: 5, head: 11, label: 'mg = ' + PUL_W.toFixed(1) + ' N', labelOffset: PHONE ? -50 : -58 });
    D.arrow(bx - 12, blockTop + 4 + (run ? PUL_T : PUL_W) * sN, bx - 12, blockTop + 4, { color: '#14a058', width: 5, head: 11, label: 'T = ' + fnum(run ? PUL_T : PUL_W, 2) + ' N', labelOffset: PHONE ? -52 : -60 });
    if (!run) D.label(VW - 14, 28, '손으로 잡고 있을 때 T = mg', { bg: '#5a6679', size: 13, align: 'right' });
    else D.label(VW - 14, 28, 't = ' + t.toFixed(1) + ' s', { bg: '#26324a', size: 13.5, align: 'right' });
    drawPulleyPanel(p);
    parts.update(dt); parts.draw(ctx);
  }
  function drawPulleyPanel(p) {
    panel(PX, PY, PW, PH, 16);
    const pc = PCOLS(), done = p.done;
    const ax = miniAxes(pc.vt, { xmax: PUL.T_RUN, xstep: 0.2, ymax: 3, ystep: 1, title: '속도–시간 (v–t)', right: done ? 'a = ' + (PUL_A).toFixed(1) + ' m/s²' : '', rightColor: '#0b6b39' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    if (p.st !== 'idle') { ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(p.t), ax.gy(PUL_A * p.t)); ctx.stroke(); for (let k = 0; k * 0.1 <= p.t + 1e-9; k++) D.sphere(ax.gx(k * 0.1), ax.gy(PUL_A * k * 0.1), 4.5, '#3867f4', { gloss: false }); }
    ctx.restore();
    const x0 = PHONE ? PX + 14 : pc.law.x + 4, w = PHONE ? PW - 28 : PW - (pc.law.x - PX) - 14, y0 = PHONE ? PY + 160 : PY + 28, lh = PHONE ? 22 : 27, fs = PHONE ? 13 : 14.5;
    const Ls = [
      ['① 전체 질량 = ' + PUL.M.toFixed(1) + ' + ' + PUL.m.toFixed(1) + ' = ' + (PUL.M + PUL.m).toFixed(1) + ' kg', '#26324a'],
      ['② 알짜힘 = 추의 무게 mg = ' + PUL.m.toFixed(1) + ' × ' + G + ' = ' + PUL_W.toFixed(1) + ' N', '#26324a'],
      ['③ a = ' + PUL_W.toFixed(1) + ' / ' + (PUL.M + PUL.m).toFixed(1) + ' = ' + PUL_A.toFixed(1) + ' m/s²', '#c2410c'],
      ['④ 수레: T = Ma = ' + PUL.M.toFixed(1) + ' × ' + PUL_A.toFixed(1) + ' = ' + PUL_T.toFixed(2) + ' N', '#0b6b39'],
      ['⑤ 추: mg − T = ' + PUL_W.toFixed(1) + ' − ' + PUL_T.toFixed(2) + ' = ' + (PUL_W - PUL_T).toFixed(2) + ' N = ma', '#0b6b39'],
    ];
    Ls.forEach((l, i) => T(x0, y0 + i * lh, l[0], fs, l[1], 'left', 800));
    textBlock(x0, y0 + 5 * lh + 2, w, PHONE ? '센서: 잡을 때 ' + PUL_W.toFixed(2) + ' N, 움직일 때 ' + PUL_T.toFixed(2) + ' N' : '센서: 잡고 있을 때 ' + PUL_W.toFixed(2) + ' N, 움직일 때 ' + PUL_T.toFixed(2) + ' N → T는 mg보다 작아요.', PHONE ? 13 : 14, '#3a465c', 19, 700);
  }

  /* ================= 도로 장면 (제동 · 안전 공통) ================= */
  const RY = SH - 74, X0R = PHONE ? 78 : 112, RTRACK = VW - X0R - (PHONE ? 22 : 36);
  function drawVehicle(xf, veh, braking, sc) {   // xf: 앞 범퍼의 x, 바닥은 RY
    const y = RY + 2;
    ctx.save(); ctx.translate(xf, y); ctx.scale(sc, sc);
    if (veh === 'truck') {
      D.shadow(() => { D.roundRect(-120, -60, 86, 52, 5); ctx.fillStyle = '#e8edf5'; ctx.fill(); D.roundRect(-34, -40, 36, 32, 6); ctx.fillStyle = '#f2873a'; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.strokeStyle = '#5a6679'; ctx.lineWidth = 2; D.roundRect(-120, -60, 86, 52, 5); ctx.stroke(); D.roundRect(-34, -40, 36, 32, 6); ctx.stroke();
      ctx.fillStyle = '#a8d4ff'; ctx.fillRect(-14, -34, 12, 12);
      [-100, -66, -18].forEach((dx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(dx, -2, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(dx, -2, 3.5, 0, TAU); ctx.fill(); });
      T(-77, -28, '5000 kg', 13, '#26324a', 'center', 800);
      if (braking) { ctx.fillStyle = '#e2464b'; ctx.fillRect(-122, -30, 5, 10); }
    } else {
      D.shadow(() => { D.roundRect(-74, -30, 74, 28, 9); const g = ctx.createLinearGradient(0, -30, 0, -2); g.addColorStop(0, '#5b8ae8'); g.addColorStop(1, '#2f55b6'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      D.roundRect(-56, -46, 40, 20, 8); ctx.fillStyle = '#9fc2f5'; ctx.fill(); ctx.strokeStyle = '#2f55b6'; ctx.lineWidth = 2; ctx.stroke();
      [-54, -20].forEach((dx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(dx, -2, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(dx, -2, 3.5, 0, TAU); ctx.fill(); });
      if (braking) { ctx.fillStyle = '#e2464b'; ctx.fillRect(-76, -22, 5, 9); }
    }
    ctx.restore();
  }
  /* o: {veh, road, d, braking, r, b, axisMax, obst} - 거리(m)는 가운데 축척으로 그려요 */
  function drawRoad(o) {
    const scl = RTRACK / o.axisMax;
    const asph = o.road === 'snow' ? '#aeb8c6' : o.road === 'wet' ? '#5a6a82' : '#7a8599';
    ctx.fillStyle = asph; ctx.fillRect(0, RY, VW, SH - RY);
    if (o.road === 'wet') { ctx.fillStyle = 'rgba(160,200,255,.25)'; ctx.fillRect(0, RY, VW, 10); }
    if (o.road === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, RY, VW, 7); }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 8; x < VW; x += 44) ctx.fillRect(x, RY + 44, 24, 3);
    const step = o.axisMax / 5;
    for (let i = 0; i <= 5; i++) { const x = X0R + i * step * scl; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, RY); ctx.lineTo(x, RY + 8); ctx.stroke(); T(x, RY + 38, String(+(i * step).toFixed(1)) + (i === 5 ? ' m' : ''), 13, '#fff', 'center', 800); }
    // 반응 거리(주황) · 제동 거리(빨강) 띠 (차가 지나간 만큼)
    const rEnd = Math.min(o.d, o.r), bEnd = Math.max(0, o.d - o.r);
    if (o.d > 0) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(X0R, RY + 12, rEnd * scl, 12); }
    if (bEnd > 0) { ctx.fillStyle = '#e2464b'; ctx.fillRect(X0R + o.r * scl, RY + 12, bEnd * scl, 12); }
    if (o.obst) {
      const ox = X0R + o.obst.d * scl;
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(ox, RY - 70); ctx.lineTo(ox, RY + 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.font = D.font(PHONE ? 26 : 32, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.obst.icon, ox + 4, RY - 6); ctx.restore();
      D.label(ox, RY - 82, o.obst.d + ' m 앞', { bg: '#26324a', size: 13 });
    }
    drawVehicle(X0R + o.d * scl, o.veh, o.braking, PHONE ? 0.74 : 1);
    return scl;
  }
  const roadParticles = (o, xf, dt) => {
    if (RM || !o.braking) return;
    if (Math.random() < 0.6) {
      if (o.road === 'wet') parts.burst(xf - 60, RY + 4, { count: 2, speed: 90, size: 2.6, colors: ['#7cc4ff', '#bfe3ff'], gravity: 260, life: 0.5 });
      else if (o.road === 'snow') parts.burst(xf - 60, RY + 4, { count: 2, speed: 70, size: 2.6, colors: ['#ffffff', '#e8f0fb'], gravity: 80, life: 0.7 });
      else parts.burst(xf - 60, RY + 4, { count: 2, speed: 70, size: 2.2, colors: ['#ffd447', '#ff9a63', '#fff'], gravity: 160, life: 0.35 });
    }
  };

  /* ================= 제동 거리 ================= */
  const TA = 3.2;                                           // 한 번의 제동 영상이 걸리는 시간 (s)
  function resetBrake(keepRec) {
    const p = S.br;
    S.br = { veh: p ? p.veh : 'car', road: p ? p.road : 'dry', kmh: p ? p.kmh : 72, st: 'idle', tau: 0, run: null, rec: keepRec && p ? p.rec : [] };
    updateCtl();
  }
  const vehKg = (veh) => (veh === 'truck' ? TRUCK_KG : CAR_KG);
  function brRun() {
    const b = S.br; if (b.st === 'run') return;
    const c = stopCalc(b.kmh, b.road, T_ALERT), tTot = T_ALERT + c.tBrake;
    b.run = { veh: b.veh, road: b.road, kmh: b.kmh, c, tTot, kfast: Math.max(1, tTot / TA) };
    b.tau = 0; b.st = 'run'; parts.clear(); Sound.click(); updateCtl();
  }
  function stepBrake(dt) {
    const b = S.br; if (b.st !== 'run') return;
    b.tau += dt / (RM ? 0.12 : 1) * (RM ? 1 : 1);
    const run = b.run, ph = b.tau * run.kfast;
    if (ph >= run.tTot - 1e-9 || (RM && b.tau > 0.01)) {
      b.st = 'done'; b.tau = run.tTot / run.kfast;
      const key = (x) => x.veh + '|' + x.road + '|' + x.kmh;
      const row = { veh: run.veh, road: run.road, kmh: run.kmh, r: run.c.r, b: run.c.b, total: run.c.total };
      const i = b.rec.findIndex((x) => key(x) === key(row)); if (i >= 0) b.rec.splice(i, 1);
      b.rec.push(row); if (b.rec.length > 16) b.rec.shift();
      Sound.success(); updateCtl();
    }
  }
  function brState(b) {   // 지금 (물리) 시각과 위치
    if (!b.run || b.st === 'idle') return { d: 0, v: b.kmh / KMH, braking: false, ph: 0 };
    const run = b.run, c = run.c; let ph = b.st === 'done' ? run.tTot : Math.min(run.tTot, b.tau * run.kfast);
    let d, v, braking;
    if (ph <= T_ALERT) { d = c.v * ph; v = c.v; braking = false; }
    else { const u = ph - T_ALERT; d = c.r + c.v * u - 0.5 * c.a * u * u; v = Math.max(0, c.v - c.a * u); braking = v > 0.001; }
    return { d, v, braking, ph };
  }
  function drawBrake(dt) {
    const b = S.br, st = brState(b), run = b.run && b.st !== 'idle' ? b.run : null;
    const road = run ? run.road : b.road, veh = run ? run.veh : b.veh, kmh = run ? run.kmh : b.kmh;
    const c = run ? run.c : stopCalc(kmh, road, T_ALERT);
    bgFill(road === 'snow' ? '#eef3fa' : '#e8f1fb', '#f6f9fe');
    T(16, 28, '🛑 급제동: ' + (veh === 'truck' ? '트럭 5000 kg' : '승용차 1000 kg') + ' · ' + ROADS[road].name + ' · ' + kmh + ' km/h', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    const axisMax = niceMax(c.total);
    const scl = drawRoad({ veh, road, d: st.d, braking: st.braking, r: c.r, b: c.b, axisMax });
    roadParticles({ road, braking: st.braking }, X0R + st.d * scl, dt);
    // 숫자 막대 (반응 + 제동 = 정지 거리)
    const bx = X0R, by = 52, bw = RTRACK, bh = 24;
    D.roundRect(bx, by, bw, bh, 7); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    const rw = c.r * scl, bwid = c.b * scl;
    ctx.save(); D.roundRect(bx, by, bw, bh, 7); ctx.clip(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, by, rw, bh); ctx.fillStyle = '#e2464b'; ctx.fillRect(bx + rw, by, bwid, bh); ctx.restore();
    if (rw > 56) T(bx + rw / 2, by + 17, '반응 ' + fm(c.r) + ' m', 13, '#fff', 'center', 800);
    if (bwid > 70) T(bx + rw + bwid / 2, by + 17, '제동 ' + fm(c.b) + ' m', 13, '#fff', 'center', 800);
    T(bx + rw + bwid + 8 > bx + bw - 120 ? bx + bw : bx + rw + bwid + 8, by + 17, '정지 거리 ' + fm(c.total) + ' m', 13.5, '#26324a', bx + rw + bwid + 8 > bx + bw - 120 ? 'right' : 'left', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    if (run && run.kfast > 1.2) D.label(VW - 14, 28, '⏩ ×' + run.kfast.toFixed(1) + ' 빠르게 감기', { bg: '#5a6679', size: 13, align: 'right' });
    else if (run && b.st === 'run') D.label(VW - 14, 28, '🐌 슬로 없이 실제 시간', { bg: '#5a6679', size: 13, align: 'right' });
    drawBrakePanel(b, c, road, veh, kmh);
    parts.update(dt); parts.draw(ctx);
  }
  function drawBrakePanel(b, c, road, veh, kmh) {
    panel(PX, PY, PW, PH, 16);
    const rc = PHONE ? { x: PX + 8, y: PY + 6, w: PW - 16, h: 128 } : { x: PX + 8, y: PY + 8, w: 322, h: PH - 16 };
    const mu = ROADS[road].mu, ymax = niceMax(stopCalc(108, road, 0).b);
    const ax = miniAxes(rc, { xmax: 108, xstep: 18, ymax, ystep: ymax / 5, title: '제동 거리 – 속력 (' + ROADS[road].name + ')', right: '' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath();
    for (let k = 0; k <= 108; k += 2) { const X = ax.gx(k), Y = ax.gy(stopCalc(Math.max(k, 0.0001), road, 0).b); if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    b.rec.filter((x) => x.road === road).forEach((x) => { if (x.veh === 'truck') { ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax.gx(x.kmh), ax.gy(x.b), 8, 0, TAU); ctx.stroke(); } else D.sphere(ax.gx(x.kmh), ax.gy(x.b), 5.5, '#3867f4', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); });
    ctx.restore();
    T(ax.ix + ax.iw, ax.iy + ax.ih - 6, '속력 (km/h)', 13, '#3a465c', 'right', 800);
    // 식 + 표
    const tx = PHONE ? PX + 14 : rc.x + rc.w + 14, tw = PHONE ? PW - 28 : PW - (rc.w + 30), ty = PHONE ? PY + 146 : PY + 24, fs = PHONE ? 13 : 14.5;
    T(tx, ty, '제동력 f = μmg = ' + mu + ' × ' + vehKg(veh) + ' × ' + G + ' = ' + String(Math.round(mu * vehKg(veh) * G)) + ' N', fs, '#26324a', 'left', 800);
    T(tx, ty + 22, 'a = f / m = μg = ' + mu + ' × ' + G + ' = ' + (mu * G).toFixed(1) + ' m/s²', fs, '#c2410c', 'left', 800);
    T(tx, ty + 44, 's = v² / (2a) = ' + fm(c.v * c.v) + ' / ' + (2 * mu * G).toFixed(1) + ' = ' + fm(c.b) + ' m', fs, '#0b6b39', 'left', 800);
    const hy = ty + 70, cols = [tx, tx + tw * 0.2, tx + tw * 0.42, tx + tw * 0.6, tx + tw * 0.8], rh = PHONE ? 21 : 23;
    ['차·도로', '속력', '반응', '제동', '합계'].forEach((h, i) => T(cols[i], hy, h, 13, '#5a6679', 'left', 800));
    const rows = b.rec.slice(PHONE ? -3 : -5);
    if (!rows.length) T(tx, hy + rh, '아직 기록이 없어요', 13.5, '#98a2b3', 'left', 700);
    rows.forEach((x, i) => {
      const y = hy + (i + 1) * rh;
      T(cols[0], y, (x.veh === 'truck' ? '🚚' : '🚗') + ROADS[x.road].name.replace(' 도로', ''), 13.5, '#26324a', 'left', 800);
      T(cols[1], y, String(x.kmh), 13.5, '#26324a', 'left', 800); T(cols[2], y, fm(x.r), 13.5, '#d97706', 'left', 800); T(cols[3], y, fm(x.b), 13.5, '#c0392b', 'left', 800); T(cols[4], y, fm(x.total), 13.5, '#26324a', 'left', 800);
    });
  }

  /* ================= 안전: 시나리오 (사고 없이 멈추기) ================= */
  function resetSafety() {
    const p = S.sf; const sc = p ? p.sc : 'school';
    S.sf = { sc, kmh: SCEN[sc].speed, drv: SCEN[sc].drv, st: 'idle', tau: 0, run: null, hit: {}, rec: [] };
    updateCtl();
  }
  function sfSet(sc) { const s = S.sf; s.sc = sc; s.kmh = SCEN[sc].speed; s.drv = SCEN[sc].drv; s.st = 'idle'; s.run = null; parts.clear(); updateCtl(); }
  function sfResult(kmh, road, drv, d) {
    const c = stopCalc(kmh, road, drv === 'sleepy' ? T_SLEEPY : T_ALERT);
    const hit = c.total > d + 1e-9;
    let vHit = 0;
    if (hit) vHit = c.r >= d ? c.v : Math.sqrt(Math.max(0, c.v * c.v - 2 * c.a * (d - c.r)));
    return { c, hit, vHit, kmhHit: Math.round(vHit * KMH), spare: d - c.total };
  }
  function sfRun() {
    const s = S.sf; if (s.st === 'run') return;
    const sc = SCEN[s.sc], res = sfResult(s.kmh, sc.road, s.drv, sc.d);
    const stopD = Math.min(res.c.total, sc.d), tEnd = res.hit ? (res.c.r >= sc.d ? sc.d / res.c.v : res.c.tr + (res.c.v - Math.sqrt(res.c.v * res.c.v - 2 * res.c.a * (sc.d - res.c.r))) / res.c.a) : res.c.tr + res.c.tBrake;
    s.run = { sc: s.sc, kmh: s.kmh, drv: s.drv, res, d: sc.d, stopD, tEnd, kfast: Math.max(1, tEnd / TA) };
    s.tau = 0; s.st = 'run'; parts.clear(); Sound.click(); updateCtl();
  }
  function stepSafety(dt) {
    const s = S.sf; if (s.st !== 'run') return;
    s.tau += dt / (RM ? 0.12 : 1);
    const run = s.run, ph = s.tau * run.kfast;
    if (ph >= run.tEnd - 1e-9 || (RM && s.tau > 0.01)) {
      s.st = 'done'; s.tau = run.tEnd / run.kfast;
      const key = run.sc + '|' + run.kmh + '|' + run.drv; s.hit[key] = run.res.hit ? 'hit' : 'safe';
      if (run.res.hit) { Sound.fail(); parts.burst(X0R + run.d * (RTRACK / run.axis || 1), RY - 20, { count: 20, speed: 160, size: 3.4, colors: ['#e2464b', '#ffd447', '#fff'], gravity: 160, life: 0.7 }); } else Sound.success();
      s.rec.push({ sc: run.sc, kmh: run.kmh, drv: run.drv, hit: run.res.hit, kmhHit: run.res.kmhHit }); if (s.rec.length > 12) s.rec.shift();
      updateCtl();
    }
  }
  const sfHas = (sc, kmh, drv, what) => S.sf.hit[sc + '|' + kmh + '|' + drv] === what;
  function sfState(s) {
    if (!s.run || s.st === 'idle') return { d: 0, v: s.kmh / KMH, braking: false };
    const run = s.run, c = run.res.c; const ph = s.st === 'done' ? run.tEnd : Math.min(run.tEnd, s.tau * run.kfast);
    let d, v, braking;
    if (ph <= c.tr) { d = c.v * ph; v = c.v; braking = false; }
    else { const u = ph - c.tr; d = c.r + c.v * u - 0.5 * c.a * u * u; v = Math.max(0, c.v - c.a * u); braking = v > 0.001; }
    d = Math.min(d, run.d);
    if (s.st === 'done' && run.res.hit) { v = 0; braking = false; d = run.d; }
    return { d, v, braking };
  }
  function drawSafety(dt) {
    const s = S.sf, sc = SCEN[s.sc], run = s.run && s.st !== 'idle' ? s.run : null;
    const kmh = run ? run.kmh : s.kmh, drv = run ? run.drv : s.drv;
    const res = sfResult(kmh, sc.road, drv, sc.d), st = sfState(s);
    bgFill(sc.road === 'wet' ? '#e3ebf6' : '#e9f0fb', '#f6f9fe');
    T(16, 28, '🛡️ ' + sc.name + ' · ' + ROADS[sc.road].name + ' (μ = ' + ROADS[sc.road].mu + ')', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const axisMax = niceMax(Math.max(sc.d, res.c.total));
    if (run) run.axis = axisMax;
    const scl = drawRoad({ veh: 'car', road: sc.road, d: st.d, braking: st.braking, r: res.c.r, b: res.c.b, axisMax, obst: { d: sc.d, icon: sc.icon } });
    roadParticles({ road: sc.road, braking: st.braking }, X0R + st.d * scl, dt);
    if (s.st === 'done' && run.res.hit) D.label(X0R + sc.d * scl - 40, RY - 110, '💥 충돌! 약 ' + run.res.kmhHit + ' km/h', { bg: '#e2464b', size: 14 });
    else if (s.st === 'done') D.label(X0R + st.d * scl - 40, RY - 110, '✅ 안전하게 정지', { bg: '#14a058', size: 14 });
    if (run && run.kfast > 1.2) D.label(VW - 14, 28, '⏩ ×' + run.kfast.toFixed(1) + ' 빠르게 감기', { bg: '#5a6679', size: 13, align: 'right' });
    // 필요한 정지 거리 vs 장애물 거리 막대
    const bx = X0R, by = 52, bw = RTRACK, bh = 24;
    D.roundRect(bx, by, bw, bh, 7); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, bh, 7); ctx.clip(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, by, res.c.r * scl, bh); ctx.fillStyle = '#e2464b'; ctx.fillRect(bx + res.c.r * scl, by, res.c.b * scl, bh); ctx.restore();
    const ox = bx + sc.d * scl; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, by - 6); ctx.lineTo(ox, by + bh + 6); ctx.stroke();
    drawSafetyPanel(s, sc, res, kmh, drv);
    parts.update(dt); parts.draw(ctx);
  }
  function drawSafetyPanel(s, sc, res, kmh, drv) {
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, w = PW - 32, fs = PHONE ? 13.5 : 15, lh = PHONE ? 26 : 28, c = res.c;
    T(x0, PY + 26, '🧮 속력 ' + kmh + ' km/h = ' + fm(c.v) + ' m/s · 반응 시간 ' + c.tr.toFixed(1) + ' s' + (drv === 'sleepy' ? ' (졸음)' : ''), fs, '#26324a', 'left', 800);
    T(x0, PY + 26 + lh, '반응 거리 = v × t = ' + fm(c.v) + ' × ' + c.tr.toFixed(1) + ' = ' + fm(c.r) + ' m', fs, '#d97706', 'left', 800);
    T(x0, PY + 26 + 2 * lh, '제동 거리 = v² / (2μg) = ' + fm(c.v * c.v) + ' / ' + (2 * c.mu * G).toFixed(1) + ' = ' + fm(c.b) + ' m', fs, '#c0392b', 'left', 800);
    T(x0, PY + 26 + 3 * lh, '정지 거리 = ' + fm(c.total) + ' m   (장애물까지 ' + sc.d + ' m)', fs, '#26324a', 'left', 800);
    const ok = !res.hit, y4 = PY + 26 + 4 * lh + 4;
    D.roundRect(x0, y4 - 18, w, 32, 10); ctx.fillStyle = ok ? '#e7f7ee' : '#fdeceb'; ctx.fill();
    T(x0 + w / 2, y4 + 4, ok ? '멈출 수 있어요 · 남는 거리 ' + fm(res.spare) + ' m' : '멈추지 못해요 · ' + fm(c.total - sc.d) + ' m 부족 → 충돌 속력 약 ' + res.kmhHit + ' km/h', fs, ok ? '#0b6b39' : '#a3262b', 'center', 800);
    const note = s.sc === 'rain' ? '제한 속도 ' + RAIN_LIMIT + ' km/h 도로에서 비 오는 날 ' + Math.round(RAIN_CUT * 100) + ' % 감속하면 ' + RAIN_SPEED + ' km/h예요.' : s.sc === 'school' ? '어린이 보호구역에서는 속력을 낮추면 반응 거리와 제동 거리가 모두 줄어요.' : '졸음운전은 반응 시간이 ' + T_ALERT.toFixed(1) + ' s에서 ' + T_SLEEPY.toFixed(1) + ' s로 길어져 반응 거리가 늘어나요.';
    textBlock(x0, y4 + 30, w, note + ' ABS는 바퀴가 잠기는 것을 막아 μ를 높게 유지해 줘요.', PHONE ? 13 : 13.5, '#3a465c', 18, 700);
  }

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    const fl = game && game.free ? {} : S.flags;   // 자유 탐구에서는 미션용 입력 칸 대신 실험 도구를 보여 줘요
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        if (n.hasAttribute('data-fcheck') && !fl.fcheck) on = false;
        if (n.hasAttribute('data-nofcheck') && fl.fcheck) on = false;
        if (n.hasAttribute('data-rule') && !fl.rule) on = false;
        if (n.hasAttribute('data-norule') && fl.rule) on = false;
        if (n.hasAttribute('data-cards') && !fl.cards) on = false;
        if (n.hasAttribute('data-nocards') && fl.cards) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const fo = S.fo;
    if (fo) {
      $('#oF').textContent = fo.F + ' N';
      const sl = $('#sF'); if (+sl.value !== fo.F) sl.value = fo.F; sl.style.setProperty('--pct', (fo.F / 8 * 100) + '%');
      $('#bFRun').disabled = fo.st === 'run';
    }
    const ms = S.ms;
    if (ms) {
      $$('#mSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === ms.m));
      $$('#mGraphSeg button').forEach((b) => b.classList.toggle('on', b.dataset.g === ms.g));
      $('#bMRun').disabled = ms.st === 'run';
    }
    const pu = S.pu; if (pu) $('#bPRun').disabled = pu.st === 'run';
    const br = S.br;
    if (br) {
      $$('#bVehSeg button').forEach((b) => b.classList.toggle('on', b.dataset.veh === br.veh));
      $$('#bRoadSeg button').forEach((b) => b.classList.toggle('on', b.dataset.road === br.road));
      $('#oBSpeed').textContent = br.kmh + ' km/h';
      const sl = $('#sBSpeed'); if (+sl.value !== br.kmh) sl.value = br.kmh; sl.style.setProperty('--pct', ((br.kmh - 36) / 72 * 100) + '%');
      $('#bBRun').disabled = br.st === 'run';
    }
    const sf = S.sf;
    if (sf) {
      $$('#sScSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === sf.sc));
      $$('#sDrvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.drv === sf.drv));
      $('#oSSpeed').textContent = sf.kmh + ' km/h';
      const sl = $('#sSSpeed'); if (+sl.value !== sf.kmh) sl.value = sf.kmh; sl.style.setProperty('--pct', ((sf.kmh - 10) / 90 * 100) + '%');
      $('#bSRun').disabled = sf.st === 'run';
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sF').addEventListener('input', (e) => { const f = S.fo; if (f.st === 'run') { e.target.value = f.F; return; } f.F = +e.target.value; f.st = 'idle'; f.run = null; f.t = 0; parts.clear(); updateCtl(); });
  $('#bFRun').addEventListener('click', () => { const f = S.fo; if (f.st === 'done') { f.st = 'idle'; } startRun(f, 'force'); });
  $('#bFClear').addEventListener('click', () => { Sound.click(); parts.clear(); resetForce(false); });
  $$('#mSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const m = S.ms; if (m.st === 'run') return; m.m = +b.dataset.m; m.st = 'idle'; m.run = null; m.t = 0; parts.clear(); updateCtl(); }));
  $('#bMRun').addEventListener('click', () => { const m = S.ms; if (m.st === 'done') m.st = 'idle'; startRun(m, 'mass'); });
  $('#bMClear').addEventListener('click', () => { Sound.click(); parts.clear(); resetMass(false); });
  $$('#mGraphSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ms.g = b.dataset.g; updateCtl(); }));
  $('#bPRun').addEventListener('click', () => { const p = S.pu; if (p.st === 'done') { p.st = 'idle'; p.t = 0; } startPulley(); });
  $('#bPReset').addEventListener('click', () => { Sound.click(); resetPulley(false); });
  $$('#bVehSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const r = S.br; if (r.st === 'run') return; r.veh = b.dataset.veh; r.st = 'idle'; r.run = null; parts.clear(); updateCtl(); }));
  $$('#bRoadSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const r = S.br; if (r.st === 'run') return; r.road = b.dataset.road; r.st = 'idle'; r.run = null; parts.clear(); updateCtl(); }));
  $('#sBSpeed').addEventListener('input', (e) => { const r = S.br; if (r.st === 'run') { e.target.value = r.kmh; return; } r.kmh = +e.target.value; r.st = 'idle'; r.run = null; parts.clear(); updateCtl(); });
  $('#bBRun').addEventListener('click', () => { const r = S.br; if (r.st === 'done') r.st = 'idle'; brRun(); });
  $('#bBClear').addEventListener('click', () => { Sound.click(); parts.clear(); resetBrake(false); });
  $$('#sScSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.sf.st === 'run') return; sfSet(b.dataset.sc); }));
  $('#sSSpeed').addEventListener('input', (e) => { const s = S.sf; if (s.st === 'run') { e.target.value = s.kmh; return; } s.kmh = +e.target.value; s.st = 'idle'; s.run = null; parts.clear(); updateCtl(); });
  $$('#sDrvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const s = S.sf; if (s.st === 'run') return; s.drv = b.dataset.drv; s.st = 'idle'; s.run = null; parts.clear(); updateCtl(); }));
  $('#bSRun').addEventListener('click', () => { const s = S.sf; if (s.st === 'done') s.st = 'idle'; sfRun(); });
  ['slopeIn', 'massIn'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* F = ma 완성하기 (질량 단계의 manual 미션) */
  const RULE_Q = [
    { q: '① 질량이 같을 때, 가속도 a는 알짜힘 F에', opts: ['비례해요', '반비례해요', '관계없어요'], ans: 0 },
    { q: '② 힘이 같을 때, 가속도 a는 질량 m에', opts: ['비례해요', '반비례해요', '관계없어요'], ans: 1 },
    { q: '③ 두 관계를 합친 뉴턴의 운동 제2법칙은', opts: ['F = m + a', 'F = m × a', 'F = m ÷ a'], ans: 1 },
    { q: '④ 알짜힘이 0이면 (제1법칙)', opts: ['물체의 가속도는 0이에요 (정지 또는 등속 직선 운동)', '물체는 반드시 정지해요', '물체는 계속 빨라져요'], ans: 0 },
  ];
  const ruleSel = [];
  (function buildRule() {
    const box = $('#ruleRows');
    RULE_Q.forEach((q, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const qq = document.createElement('div'); qq.className = 'q'; qq.textContent = q.q;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', q.q);
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '고르세요'; sel.appendChild(o0);
      q.opts.forEach((t, j) => { const o = document.createElement('option'); o.value = String(j); o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.rule[i] = sel.value; sel.classList.remove('ok', 'bad'); S.ruleOK[i] = undefined; Sound.click(); });
      row.appendChild(qq); row.appendChild(sel); box.appendChild(row); ruleSel.push(sel);
    });
  })();
  function resetRule() { S.rule = {}; S.ruleOK = {}; ruleSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  /* 안전 수칙과 까닭 연결 (안전 설계 단계의 manual 미션) */
  const CARD_Q = [
    { q: '어린이 보호구역에서 속력을 낮추는 까닭은?', opts: ['속력이 절반이면 제동 거리가 약 1/4로 줄어서 (s ∝ v²)', '속력이 느리면 마찰력이 더 커져서', '속력과 관계없이 정지 거리가 같아서'], ans: 0 },
    { q: '비 오는 날 속력을 줄여서 달리라고 하는 까닭은?', opts: ['비가 오면 자동차 질량이 커져서', '젖은 도로는 마찰 계수 μ가 작아 같은 속력에서 제동 거리가 길어져서', '비가 오면 반응 시간이 0이 되어서'], ans: 1 },
    { q: '졸음운전이 위험한 까닭은?', opts: ['반응 시간이 길어져 브레이크를 밟기 전에 달리는 반응 거리가 늘어서', '졸리면 제동 거리의 식이 바뀌어서', '졸리면 자동차의 질량이 줄어서'], ans: 0 },
    { q: '계산한 정지 거리보다 실제 정지 거리가 더 길게 나오는 까닭은?', opts: ['뉴턴의 운동 법칙은 도로 위에서는 성립하지 않아서', '타이어 마모와 노면 상태로 실제 μ가 계산에 쓴 값보다 작고, 반응 시간·측정에 오차가 있어서', '자동차 질량이 줄어들어서'], ans: 1 },
  ];
  const cardSel = [];
  (function buildCards() {
    const box = $('#cardRows');
    CARD_Q.forEach((q, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const qq = document.createElement('div'); qq.className = 'q'; qq.textContent = q.q;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', q.q);
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '고르세요'; sel.appendChild(o0);
      q.opts.forEach((t, j) => { const o = document.createElement('option'); o.value = String(j); o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.card[i] = sel.value; sel.classList.remove('ok', 'bad'); S.cardOK[i] = undefined; Sound.click(); });
      row.appendChild(qq); row.appendChild(sel); box.appendChild(row); cardSel.push(sel);
    });
  })();
  function resetCards() { S.card = {}; S.cardOK = {}; cardSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const m = S.mode;
    if (m === 'force') { const f = S.fo, r = f.run && f.st !== 'idle' ? f.run : newRun('force', f.F); L1 = '힘 F'; a = r.F + ' N'; L2 = '가속도 a'; b = f.st === 'done' ? f.rec[r.F].toFixed(1) + ' m/s²' : '—'; L3 = '질량 m'; c = FM.toFixed(1) + ' kg'; }
    else if (m === 'mass') { const s = S.ms, r = s.run && s.st !== 'idle' ? s.run : newRun('mass', s.m); L1 = '힘 F'; a = MF + ' N'; L2 = '가속도 a'; b = s.st === 'done' ? s.rec[r.m].toFixed(1) + ' m/s²' : '—'; L3 = '질량 m'; c = r.m.toFixed(1) + ' kg'; }
    else if (m === 'pulley') { const p = S.pu; L1 = '장력 T'; a = fnum(p.st === 'idle' ? PUL_W : PUL_T, 2) + ' N'; L2 = '가속도 a'; b = p.st === 'idle' ? '—' : PUL_A.toFixed(1) + ' m/s²'; L3 = '추의 무게 mg'; c = PUL_W.toFixed(1) + ' N'; }
    else if (m === 'brake') { const r = S.br, cc = stopCalc(r.kmh, r.road, T_ALERT); L1 = '반응 거리'; a = fm(cc.r) + ' m'; L2 = '제동 거리'; b = fm(cc.b) + ' m'; L3 = '정지 거리'; c = fm(cc.total) + ' m'; }
    else { const s = S.sf, sc = SCEN[s.sc], res = sfResult(s.kmh, sc.road, s.drv, sc.d); L1 = '정지 거리'; a = fm(res.c.total) + ' m'; L2 = '장애물까지'; b = sc.d + ' m'; L3 = '결과'; c = res.hit ? '충돌 위험 ❌' : '멈출 수 있어요 ✅'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const forcesDone = () => [2, 4, 6, 8].filter((k) => S.fo.rec[k] != null);
  const massesDone = () => M_LIST.filter((k) => S.ms.rec[k] != null);
  const hasBr = (veh, road, kmh) => S.br.rec.some((x) => x.veh === veh && x.road === road && x.kmh === kmh);
  const dryCarSpeeds = () => BR_SPEEDS.filter((k) => hasBr('car', 'dry', k));
  const bs = (road, kmh) => stopCalc(kmh, road, T_ALERT);
  const aList = [2, 4, 6, 8].map((F) => (F / FM).toFixed(1)).join(', ');
  const levels = [
    {
      title: '힘과 가속도: F–a 그래프', short: '힘과 가속도', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 브레이크를 밟아도 비 오는 날과 눈 오는 날 멈추는 거리가 왜 이렇게 다를까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 알짜힘이 0이면 속도가 변하지 않는다는 관성과, 충격량 = 운동량의 변화를 배웠어요. 이번에는 알짜힘이 있을 때 <b>가속도가 무엇에 따라 정해지는지</b>를 힘 센서와 속도 센서로 정량적으로 알아봐요. (앞 차시에서 배운 a = Δv ÷ Δt를 써요.)</div>' +
        '<p>마찰이 없는 트랙의 수레(' + FM.toFixed(1) + ' kg)를 일정한 힘 <b>F</b>로 당기고, 속도–시간 그래프의 기울기로 가속도 <b>a</b>를 재요. 힘을 바꾸면 가속도는 어떻게 될까요?</p>',
      features: ['force'],
      setup() { resetForce(false); setFlag('fcheck', false); setScene('force'); },
      recap: '질량이 같을 때 가속도는 힘에 비례해요. F–a 그래프는 원점을 지나는 직선이고 기울기는 1/m이에요.',
      summary: '<ul><li>수레의 질량이 일정할 때 <b>가속도 a는 알짜힘 F에 비례</b>해요 (a ∝ F). F–a 그래프는 원점을 지나는 직선이에요.</li><li>' + FM.toFixed(1) + ' kg 수레: F = 2, 4, 6, 8 N → a = ' + aList + ' m/s².</li><li>F–a 그래프의 <b>기울기 = a ÷ F = 1/m</b> = ' + (1 / FM).toFixed(2) + ' kg⁻¹ → m = ' + FM.toFixed(1) + ' kg.</li><li>힘이 2배가 되면 <b>가속도가 2배</b>가 돼요(속도가 2배가 되는 것이 아니에요).</li><li>힘이 0이면 가속도도 0 → 속도가 일정해요(제1법칙).</li></ul>',
      missions: [
        {
          title: '힘을 바꿔 가속도 측정하기',
          goal: '수레를 당기는 힘 F를 <b>2, 4, 6, 8 N</b> 네 가지로 바꾸며 <b>▶ 측정하기</b>를 눌러 가속도를 재세요.',
          hint: '슬라이더로 F를 고르고 측정해요. 속도–시간 그래프가 위로 올라가는 기울기가 가속도 a예요.',
          setup() { resetForce(false); setFlag('fcheck', false); setScene('force'); },
          check: () => forcesDone().length === 4,
          hold: 0.6,
          status: () => [2, 4, 6, 8].map((k) => mark(S.fo.rec[k] != null) + k + ' N').join(' &nbsp; '),
          explain: 'F = 2, 4, 6, 8 N일 때 a = <b>' + aList + ' m/s²</b>로, 힘이 2배, 3배, 4배가 되면 가속도도 2배, 3배, 4배가 돼요. 힘과 가속도는 <b>비례</b>해요.',
        },
        {
          title: 'F–a 그래프의 기울기 읽기', manual: true,
          goal: 'F–a 그래프의 점들은 <b>원점을 지나는 직선</b> 위에 있어요. 직선의 기울기(a ÷ F)와, 이 값으로 구한 수레의 질량 m = 1 ÷ 기울기를 입력하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '기울기 = a ÷ F. 예) F = 4 N일 때 a = 2.0 m/s²이면 2.0 ÷ 4 = ? 그 값의 역수가 질량이에요.',
          setup() { resetForce(true); [2, 4, 6, 8].forEach((F) => { if (S.fo.rec[F] == null) S.fo.rec[F] = F / FM; }); $('#slopeIn').value = ''; $('#massIn').value = ''; setFlag('fcheck', true); setScene('force'); },
          check() {
            const si = $('#slopeIn'), mi = $('#massIn');
            const sv = si.value.trim(), mv = mi.value.trim();
            if (sv === '' || mv === '' || !isFinite(+sv) || !isFinite(+mv)) return '기울기와 질량을 모두 숫자로 입력해 주세요.';
            const okS = Math.abs(+sv - 1 / FM) <= 0.02, okM = Math.abs(+mv - FM) <= 0.05;
            [[si, okS], [mi, okM]].forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
            if (!okS) return '기울기는 a ÷ F예요. 점 하나를 골라 가속도를 힘으로 나눠 보세요.';
            if (!okM) return 'a = F ÷ m이므로 기울기 = 1 ÷ m이에요. 기울기의 역수를 구해 보세요.';
            return true;
          },
          status: () => '기울기 ' + ($('#slopeIn').value.trim() === '' ? '—' : $('#slopeIn').value) + ' · 질량 ' + ($('#massIn').value.trim() === '' ? '—' : $('#massIn').value),
          explain: '기울기 = a ÷ F = ' + (1 / FM).toFixed(2) + ' kg⁻¹이에요(예: 2.0 ÷ 4 = 0.50). a = F ÷ m이므로 기울기는 <b>1/m</b>이고, m = 1 ÷ ' + (1 / FM).toFixed(2) + ' = <b>' + FM.toFixed(1) + ' kg</b>으로 수레의 질량과 같아요.',
        },
        {
          type: 'quiz', title: '힘을 2배로 하면?',
          goal: '같은 수레를 당기는 힘을 2 N에서 4 N으로 <b>2배</b>로 키우면 가속도는 어떻게 될까요?',
          setup() { setFlag('fcheck', false); setScene('force'); },
          choices: ['속도가 2배가 돼요', '가속도가 2배(1.0 → 2.0 m/s²)가 돼요', '가속도가 4배가 돼요', '가속도는 그대로예요'],
          answer: 1,
          feedback: ['힘이 속도에 비례하는 것이 아니에요. 힘은 속도의 변화율인 가속도에 비례해요.', '', 'a ∝ F이므로 힘이 2배이면 가속도도 2배예요. 4배가 되려면 힘이 4배여야 해요.', '알짜힘이 커지면 가속도도 커져요. 그래프에서 확인했죠.'],
          explain: '질량이 같으면 a = F ÷ m이므로 <b>힘이 2배이면 가속도도 2배</b>예요(1.0 → 2.0 m/s²). 힘은 속도 자체가 아니라 <b>속도가 변하는 정도(가속도)</b>를 정해요.',
        },
      ],
    },
    {
      title: '질량과 가속도: F = ma', short: '질량과 가속도', icon: '⚖️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량이 같을 때 가속도는 힘에 비례한다는 것을 확인했어요. 이번에는 <b>힘을 ' + MF + ' N으로 고정</b>하고 수레 위에 추를 얹어 질량을 바꿔요. 질량이 커지면 가속도는 어떻게 될까요?</div>' +
        '<p>두 결과를 합치면 뉴턴의 운동 제2법칙 <b>F = ma</b>(1 N = 1 kg·m/s²)가 돼요. 도르래로 연결된 수레와 추도 전체 질량에 이 식을 적용해 봐요.</p>',
      features: ['mass', 'pulley'],
      setup() { resetMass(false); resetRule(); resetPulley(false); setFlag('rule', false); setScene('mass'); },
      recap: '힘이 같을 때 가속도는 질량에 반비례해요. 두 관계를 합치면 F = ma예요. 연결된 물체는 전체 질량에 적용해요.',
      summary: '<ul><li>힘이 일정할 때 <b>가속도는 질량에 반비례</b>해요 (a ∝ 1/m). a–1/m 그래프는 원점을 지나는 직선이고 기울기는 힘 F예요.</li><li>F = ' + MF + ' N: m = 1, 2, 3, 6 kg → a = ' + M_LIST.map((m) => (MF / m).toFixed(1)).join(', ') + ' m/s² (m × a = ' + MF.toFixed(1) + ' N 일정).</li><li><b>운동 제2법칙 F = ma</b> (알짜힘 F, 단위 1 N = 1 kg·m/s²). 알짜힘이 0이면 a = 0 (제1법칙).</li><li>도르래 문제: 전체 질량 ' + (PUL.M + PUL.m).toFixed(1) + ' kg에 알짜힘 mg = ' + PUL_W.toFixed(1) + ' N → a = ' + PUL_A.toFixed(1) + ' m/s², 줄의 장력 T = Ma = ' + PUL_T.toFixed(2) + ' N (추의 무게 ' + PUL_W.toFixed(1) + ' N보다 작아요).</li></ul>',
      missions: [
        {
          title: '질량을 바꿔 가속도 측정하기',
          goal: '힘 ' + MF + ' N으로 수레의 질량 m을 <b>1, 2, 3, 6 kg</b> 네 가지로 바꾸며 가속도를 재세요.',
          hint: '질량 버튼을 고르고 ▶ 측정하기를 눌러요. 그래프 보기를 a–1/m으로 바꾸면 직선이 보여요.',
          setup() { resetMass(false); setFlag('rule', false); setScene('mass'); },
          check: () => massesDone().length === M_LIST.length,
          hold: 0.6,
          status: () => M_LIST.map((k) => mark(S.ms.rec[k] != null) + k + ' kg').join(' &nbsp; '),
          explain: 'm = 1, 2, 3, 6 kg일 때 a = <b>' + M_LIST.map((m) => (MF / m).toFixed(1)).join(', ') + ' m/s²</b>예요. 질량이 2배가 되면 가속도는 1/2배로 줄어요(<b>반비례</b>). 어느 경우든 m × a = ' + MF.toFixed(1) + ' N이에요.',
        },
        {
          title: 'F = ma 규칙 완성하기', manual: true,
          goal: '두 단계의 실험에서 알게 된 규칙을 네 문장으로 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '힘을 2배로 하면 가속도가 2배(비례), 질량을 2배로 하면 가속도가 1/2배(반비례)였어요.',
          setup() { resetRule(); setFlag('rule', true); setScene('mass'); },
          check() {
            const miss = RULE_Q.filter((q, i) => S.rule[i] === undefined || S.rule[i] === '');
            if (miss.length) return '아직 고르지 않은 문장이 ' + miss.length + '개 있어요.';
            let bad = 0;
            RULE_Q.forEach((q, i) => {
              const ok = +S.rule[i] === q.ans;
              if (!ok) bad++;
              if (!ok && S.ruleOK[i] !== false) { ruleSel[i].classList.remove('ok', 'bad'); void ruleSel[i].offsetWidth; ruleSel[i].classList.add('bad'); }
              if (ok) { ruleSel[i].classList.remove('bad'); ruleSel[i].classList.add('ok'); }
              S.ruleOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 골라 보세요. 힘이 2배일 때와 질량이 2배일 때 가속도가 어떻게 변했나요?';
            return true;
          },
          status: () => '고른 문장 ' + RULE_Q.filter((q, i) => S.rule[i]).length + ' / ' + RULE_Q.length,
          explain: 'a ∝ F, a ∝ 1/m을 합치면 <b>a = F ÷ m</b>, 곧 <b>F = ma</b>예요. 알짜힘이 0이면 a = 0이라서 물체는 정지해 있거나 등속 직선 운동을 해요(관성, 제1법칙은 제2법칙의 특수한 경우).',
        },
        {
          type: 'quiz', title: '줄의 장력이 추의 무게보다 작은 까닭',
          goal: '수레(' + PUL.M.toFixed(1) + ' kg)와 추(' + PUL.m.toFixed(1) + ' kg)를 도르래로 연결했어요. 움직일 때 줄의 장력 T는 추의 무게 ' + PUL_W.toFixed(1) + ' N보다 작은 ' + PUL_T.toFixed(2) + ' N이에요. 그 까닭은?',
          setup() { resetPulley(true); setFlag('rule', false); setScene('pulley'); },
          choices: ['추도 아래로 가속되고 있어서, 알짜힘 mg − T = ma가 필요해서', '줄이 늘어나서 힘이 줄어서', '도르래가 장력을 줄여 주어서', '수레가 추보다 무거워서 힘이 사라져서'],
          answer: 0,
          feedback: ['', '줄의 늘어남은 무시하는 가벼운 줄이에요. 장력이 작은 까닭은 추의 운동 때문이에요.', '이상적인 도르래는 장력의 크기를 바꾸지 않고 방향만 바꿔요.', '힘이 사라지는 것이 아니라, 추를 가속시키는 알짜힘이 남아야 해요.'],
          explain: '추가 아래로 a = ' + PUL_A.toFixed(1) + ' m/s²로 가속하려면 알짜힘 mg − T = ma가 있어야 해요. 그래서 T = mg − ma = ' + PUL_W.toFixed(1) + ' − ' + (PUL.m * PUL_A).toFixed(2) + ' = <b>' + PUL_T.toFixed(2) + ' N</b>로 mg보다 작아요(손으로 잡아 가속하지 않을 때만 T = mg).',
        },
      ],
    },
    {
      title: '제동 거리: 도로 상태와 속력', short: '제동 거리', icon: '🛑', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘이 질량과 가속도에 어떻게 연결되는지(F = ma) 알았어요. 자동차가 브레이크를 밟을 때 알짜힘은 타이어와 도로 사이의 <b>마찰력 f = μmg</b>예요. 앞 차시의 식 2as = v² − v₀²를 함께 쓰면 제동 거리를 예측할 수 있어요.</div>' +
        '<p>제동 가속도 a = f ÷ m = <b>μg</b>(질량이 없어요). 정지 거리 = <b>반응 거리</b>(운전자가 브레이크를 밟기 전, v × ' + T_ALERT.toFixed(1) + ' s) + <b>제동 거리</b>(v² ÷ 2μg)예요. 도로와 속력을 바꿔 가며 확인해요.</p>',
      features: ['brake'],
      setup() { resetBrake(false); setFlag('cards', false); setScene('brake'); },
      recap: '제동 거리 s = v² ÷ 2μg는 속력의 제곱에 비례하고 도로의 마찰 계수 μ에 반비례해요. 질량과는 관계없어요.',
      summary: '<ul><li>제동력 f = μmg → 제동 가속도 <b>a = μg</b> (질량과 무관). 정지 거리 = 반응 거리 + 제동 거리.</li><li>72 km/h = 20 m/s: 반응 거리 ' + fm(bs('dry', 72).r) + ' m, 제동 거리 마른 도로(μ = 0.8) <b>' + fm(bs('dry', 72).b) + ' m</b>, 젖은 도로(0.4) <b>' + fm(bs('wet', 72).b) + ' m</b>, 눈길(0.1) <b>' + fm(bs('snow', 72).b) + ' m</b>.</li><li>속력이 2배(36 → 72 km/h)이면 제동 거리는 <b>4배</b>(' + fm(bs('dry', 36).b) + ' → ' + fm(bs('dry', 72).b) + ' m): s ∝ v².</li><li>트럭(5000 kg)도 승용차와 제동 거리가 같아요. 마찰력도 질량에 비례해서 a = μg는 같기 때문이에요. (다만 멈춰야 할 운동량·에너지는 더 커서 실제로는 브레이크가 견딜 수 있는 한계가 있어요.)</li></ul>',
      missions: [
        {
          title: '세 도로에서 72 km/h 급제동',
          goal: '승용차(1000 kg)로 <b>마른 도로 · 젖은 도로 · 눈길</b>에서 각각 <b>72 km/h</b>로 급제동하며 정지 거리를 기록하세요.',
          hint: '자동차를 승용차로, 속력을 72 km/h로 두고 도로 상태를 바꿔 가며 🛑 급제동을 눌러요.',
          setup() { resetBrake(false); S.br.kmh = 72; updateCtl(); setFlag('cards', false); setScene('brake'); },
          check: () => ['dry', 'wet', 'snow'].every((r) => hasBr('car', r, 72)),
          hold: 0.6,
          status: () => ['dry', 'wet', 'snow'].map((r) => mark(hasBr('car', r, 72)) + ROADS[r].name.replace(' 도로', '')).join(' &nbsp; '),
          explain: '같은 72 km/h에서 반응 거리는 모두 ' + fm(bs('dry', 72).r) + ' m지만 제동 거리는 마른 도로 <b>' + fm(bs('dry', 72).b) + ' m</b>, 젖은 도로 <b>' + fm(bs('wet', 72).b) + ' m</b>, 눈길 <b>' + fm(bs('snow', 72).b) + ' m</b>예요. a = μg이므로 μ가 작을수록 제동 거리가 길어져요(정지 거리는 ' + fm(bs('dry', 72).total) + ' m, ' + fm(bs('wet', 72).total) + ' m, ' + fm(bs('snow', 72).total) + ' m).',
        },
        {
          title: '속력과 질량에 따른 제동 거리 점 찍기',
          goal: '<b>마른 도로</b>에서 승용차로 속력을 바꿔 <b>네 가지 속력</b>을 기록하고, <b>트럭(5000 kg)으로 72 km/h</b>도 기록해서 제동 거리–속력 그래프를 채우세요.',
          hint: '속력 슬라이더를 36, 54, 72, 90 km/h로 바꿔 가며 급제동해요. 트럭은 자동차 버튼에서 골라요.',
          setup() { resetBrake(true); S.br.road = 'dry'; S.br.veh = 'car'; updateCtl(); setFlag('cards', false); setScene('brake'); },
          check: () => dryCarSpeeds().length >= 4 && hasBr('truck', 'dry', 72),
          hold: 0.6,
          status: () => '승용차 속력 ' + Math.min(4, dryCarSpeeds().length) + ' / 4 &nbsp; ' + mark(hasBr('truck', 'dry', 72)) + ' 트럭 72 km/h',
          explain: '36 km/h에서 <b>' + fm(bs('dry', 36).b) + ' m</b>, 72 km/h에서 <b>' + fm(bs('dry', 72).b) + ' m</b>로 속력이 2배일 때 제동 거리는 4배예요(s = v² ÷ 2μg, 그래프는 포물선). 트럭도 72 km/h에서 <b>' + fm(bs('dry', 72).b) + ' m</b>로 같아요: 제동력 f = μmg = ' + String(Math.round(0.8 * TRUCK_KG * G)) + ' N이 질량 ' + TRUCK_KG + ' kg에 비례해서 a = μg가 같기 때문이에요.',
        },
        {
          type: 'quiz', title: '무거운 트럭이 더 오래 미끄러질까?',
          goal: '마른 도로에서 같은 속력으로 달리던 트럭(5000 kg)과 승용차(1000 kg)가 급제동할 때, 제동 거리에 대한 설명으로 알맞은 것은?',
          setup() { setFlag('cards', false); setScene('brake'); },
          choices: ['무거울수록 관성이 커서 제동 거리가 항상 더 길어요', '마찰력도 질량에 비례하므로 a = μg가 같아서 이상적으로는 제동 거리가 같아요', '트럭은 마찰 계수가 더 작아서 제동 거리가 더 길어요', '질량이 클수록 반응 시간이 길어져서 제동 거리가 길어요'],
          answer: 1,
          feedback: ['관성(질량)이 커도 제동력이 질량에 비례해서 커져요. 가속도의 크기는 같아요.', '', '마찰 계수 μ는 타이어와 도로의 성질이에요. 질량과는 관계없어요.', '반응 시간은 운전자의 반응 속도에 따라 달라지고, 질량과 상관없어요.'],
          explain: 'f = μmg와 F = ma에서 <b>a = μg</b>로 질량이 없어져요. 그래서 이상적으로는 제동 거리가 같아요. 다만 트럭은 멈춰야 할 운동량과 에너지가 더 커서 <b>브레이크가 견딜 수 있는 한계</b>를 넘으면 실제로 더 길어질 수 있어요.',
        },
      ],
    },
    {
      title: '안전 설계: 사고 없이 멈추기', short: '안전 설계', icon: '🛡️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정지 거리 = 반응 거리 + 제동 거리이고, 속력과 도로 상태에 따라 크게 달라진다는 것을 알았어요. 이제 이 식으로 <b>교통안전 수칙</b>이 왜 필요한지 따져 봐요.</div>' +
        '<p>시나리오(어린이 보호구역, 비 오는 날, 졸음운전)마다 장애물이 일정한 거리에 있어요. 속력을 바꿔 사고 없이 멈출 수 있는지 시뮬레이션하고, 안전 수칙의 까닭을 연결해 봐요.</p>',
      features: ['safety'],
      setup() { resetSafety(); resetCards(); setFlag('cards', false); setScene('safety'); },
      recap: '정지 거리가 장애물까지 거리보다 짧아야 사고를 막을 수 있어요. 속력을 줄이고, 젖은 도로에서는 더 조심하고, 졸지 않는 것이 반응 거리와 제동 거리를 줄여 줘요.',
      summary: '<ul><li>사고 없이 멈추려면 <b>정지 거리 = 반응 거리 + 제동 거리 ≤ 장애물까지의 거리</b>예요.</li><li>어린이 보호구역(마른 도로, 장애물 ' + SCEN.school.d + ' m): 30 km/h는 약 ' + fm(sfResult(30, 'dry', 'alert', SCEN.school.d).c.total) + ' m라서 멈추지만 50 km/h는 ' + fm(sfResult(50, 'dry', 'alert', SCEN.school.d).c.total) + ' m라서 충돌해요.</li><li>비 오는 날(μ = 0.4, 장애물 ' + SCEN.rain.d + ' m): 60 km/h는 ' + fm(sfResult(60, 'wet', 'alert', SCEN.rain.d).c.total) + ' m로 멈추지만 70 km/h는 ' + fm(sfResult(70, 'wet', 'alert', SCEN.rain.d).c.total) + ' m라서 충돌해요. 제한 속도 ' + RAIN_LIMIT + ' km/h를 ' + Math.round(RAIN_CUT * 100) + ' % 줄이면 ' + RAIN_SPEED + ' km/h예요.</li><li>졸음운전은 반응 시간이 ' + T_ALERT.toFixed(1) + ' s → ' + T_SLEEPY.toFixed(1) + ' s로 길어져, 72 km/h에서 반응 거리가 ' + fm(bs('dry', 72).r) + ' m → ' + fm(20 * T_SLEEPY) + ' m로 늘어요.</li><li>ABS는 바퀴가 잠겨 미끄러지는 것을 막아 높은 μ를 유지해서 제동 거리를 줄여 줘요.</li></ul>',
      missions: [
        {
          title: '비 오는 날 사고 없이 멈추는 속력 찾기',
          goal: '🌧️ 비 오는 날(젖은 도로, 장애물 ' + SCEN.rain.d + ' m, 맑은 정신)에서 <b>사고 없이 멈추는 가장 빠른 속력</b>을 찾으세요. 멈추는 속력과 처음 충돌하는 속력을 각각 시험해 보세요.',
          hint: '비 오는 날 상황에서 속력을 10 km/h씩 올리며 🚗 출발을 눌러요. 멈추는 마지막 속력과 충돌하는 첫 속력이 경계예요.',
          setup() { resetSafety(); sfSet('rain'); resetCards(); setFlag('cards', false); setScene('safety'); },
          check: () => sfHas('rain', 60, 'alert', 'safe') && sfHas('rain', 70, 'alert', 'hit'),
          hold: 0.6,
          status: () => mark(sfHas('rain', 60, 'alert', 'safe')) + ' 60 km/h 정지 &nbsp; ' + mark(sfHas('rain', 70, 'alert', 'hit')) + ' 70 km/h 충돌',
          explain: '젖은 도로(μ = 0.4)에서 60 km/h는 반응 ' + fm(sfResult(60, 'wet', 'alert', SCEN.rain.d).c.r) + ' m + 제동 ' + fm(sfResult(60, 'wet', 'alert', SCEN.rain.d).c.b) + ' m = <b>' + fm(sfResult(60, 'wet', 'alert', SCEN.rain.d).c.total) + ' m</b>로 ' + SCEN.rain.d + ' m 앞에서 멈추고, 70 km/h는 <b>' + fm(sfResult(70, 'wet', 'alert', SCEN.rain.d).c.total) + ' m</b>라서 충돌해요(충돌 속력 약 ' + sfResult(70, 'wet', 'alert', SCEN.rain.d).kmhHit + ' km/h). 그래서 비 오는 날에는 속력을 줄여야 해요.',
        },
        {
          title: '안전 수칙과 까닭 연결하기', manual: true,
          goal: '교통안전 수칙마다 알맞은 까닭을 골라 연결하고 <b>✔ 확인하기</b>를 누르세요. 계산한 값과 실제가 다른 까닭도 골라요.',
          hint: '제동 거리 s = v² ÷ 2μg, 반응 거리 = v × 반응 시간이에요. 어느 값이 달라지는지 떠올려 보세요.',
          setup() { resetCards(); setFlag('cards', true); setScene('safety'); },
          check() {
            const miss = CARD_Q.filter((q, i) => S.card[i] === undefined || S.card[i] === '');
            if (miss.length) return '아직 고르지 않은 항목이 ' + miss.length + '개 있어요.';
            let bad = 0;
            CARD_Q.forEach((q, i) => {
              const ok = +S.card[i] === q.ans;
              if (!ok) bad++;
              if (!ok && S.cardOK[i] !== false) { cardSel[i].classList.remove('ok', 'bad'); void cardSel[i].offsetWidth; cardSel[i].classList.add('bad'); }
              if (ok) { cardSel[i].classList.remove('bad'); cardSel[i].classList.add('ok'); }
              S.cardOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 골라 보세요. 반응 거리와 제동 거리 중 무엇이 달라지는지 생각해 봐요.';
            return true;
          },
          status: () => '고른 항목 ' + CARD_Q.filter((q, i) => S.card[i]).length + ' / ' + CARD_Q.length,
          explain: '속력이 절반이면 제동 거리는 약 <b>1/4</b>(s ∝ v²), 젖은 도로는 <b>μ가 작아</b> 제동 거리가 길어져요. 졸음운전은 <b>반응 시간이 ' + T_ALERT.toFixed(1) + ' s → ' + T_SLEEPY.toFixed(1) + ' s</b>로 길어져 반응 거리가 늘어요. 계산값과 실제가 다른 것은 <b>실제 μ와 반응 시간, 측정 오차</b> 때문이에요. ABS는 바퀴 잠김을 막아 μ를 높게 유지해요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 상태를 쓸 수 있고 그 장면이 덮어써지지 않도록, 장면 상태를 게임보다 먼저 만들어요 */
  resetForce(false); resetMass(false); resetPulley(false); resetBrake(false); resetSafety(); resetRule(); resetCards();
  setScene('force');
  game = SciSim.game({
    simId: 'hp-newton-safety', mount: '#game', badge: '교통안전 박사', homeHref: '../../index.html#hp',
    featureLabels: { force: '🧪 힘 센서 · 속도 센서 · F–a 그래프', mass: '⚖️ 질량 바꾸기 · a–m 그래프', pulley: '🧵 도르래 · 장력 센서', brake: '🛑 급제동 · 제동 거리–속력 그래프', safety: '🛡️ 안전 시나리오 · 충돌 판정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    switch (S.mode) {
      case 'force': stepRun(S.fo, 'force', dt); drawTrackScene(S.fo, 'force', dt); break;
      case 'mass': stepRun(S.ms, 'mass', dt); drawTrackScene(S.ms, 'mass', dt); break;
      case 'pulley': stepPulley(dt); drawPulley(dt); break;
      case 'brake': stepBrake(dt); drawBrake(dt); break;
      default: stepSafety(dt); drawSafety(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, startRun, resetForce, resetMass, resetPulley, startPulley, brRun, resetBrake, sfSet, sfRun, resetSafety, stopCalc, sfResult, SCEN, ROADS, PUL_A, PUL_T, PUL_W, FM, MF, faFit,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      const fn = { force: (d) => stepRun(S.fo, 'force', d), mass: (d) => stepRun(S.ms, 'mass', d), pulley: stepPulley, brake: stepBrake, safety: stepSafety }[S.mode];
      for (let i = 0; i < n; i++) fn(0.02);
    },
  };
})();
