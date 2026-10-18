/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 등가속도 운동 분석 (단원 2차시)
   성취기준 [12물리01-02] 뉴턴 운동 법칙으로 등가속도 운동을 설명하고, 교통안전 사고 예방에 적용할 수 있다. (등가속도 운동 분석 부분)
   ① 관찰: 영상 분석 (프레임 간격 0.2 s, 마커 찍기, 구간 평균 속도)
   ② 분석: 속도–시간 그래프 (점 → 최적 직선, 기울기 = 가속도, 넓이 = 이동 거리)
   ③ 모형: 운동 식 (v = v₀ + at, s = v₀t + ½at², 2as = v² − v₀²)과 데이터 검증
   ④ 적용: 급제동 자동차와 위로 던진 공의 예측
   직선(1차원) 운동만 다루고, 원인(알짜힘)은 다음 차시(운동 법칙과 교통안전)에서 다뤄요.
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
  const fnum = (v, d) => (v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);          // 부호 있는 숫자 (같은 반올림)
  const fsg = (v, d) => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(d);

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

  /* ================= 데이터 (영상 분석 결과) ================= */
  const DT = 0.2;                                   // 프레임 간격 (s)
  const V0 = 1.0, A0 = 2.0;                          // 수레의 처음 속도 (m/s)와 가속도 (m/s²)
  const NFR = 5;                                    // 분석할 프레임 수 (프레임 1~5, 프레임 0은 기준)
  const MEAS_CM = [0, 25, 55, 95, 145, 200];         // 마커로 읽은 위치 (cm, 읽기 오차 ±1 cm)
  const xTrue = (t) => V0 * t + 0.5 * A0 * t * t;    // 수레의 실제 위치 (m)
  const xMeas = (k) => MEAS_CM[k] / 100;
  const VBAR = (i) => (MEAS_CM[i] - MEAS_CM[i - 1]) / 20;     // 구간 i의 평균 속도 = Δx ÷ 0.2 s (m/s)
  const TMID = (i) => DT * (i - 0.5);
  const BALL_DM = [0, 18, 32, 42, 48, 50, 48, 42, 32, 18, 0];  // 위로 던진 공의 높이 (dm), 0.2 s 간격
  const NBALL = 10;
  const BV = (i) => (BALL_DM[i] - BALL_DM[i - 1]) / 2;         // 공의 구간 평균 속도 (m/s, 위쪽 +)
  const FIT = { cart: { v0: V0, a: A0 }, ball: { v0: 10, a: -10 } };
  const PTS = {
    cart: () => [1, 2, 3, 4, 5].map((i) => ({ t: TMID(i), v: VBAR(i) })),
    ball: () => { const r = []; for (let i = 1; i <= NBALL; i++) r.push({ t: TMID(i), v: BV(i) }); return r; },
  };
  const sse = (vid, v0, a) => PTS[vid]().reduce((s, p) => s + Math.pow(p.v - (v0 + a * p.t), 2), 0);
  const AREA_T = 2.0;                                // 넓이로 이동 거리를 구할 시각 (s)
  const AREA_V = V0 + A0 * AREA_T;                   // 그 때의 속도 (m/s)
  const AREA_S = (V0 + AREA_V) / 2 * AREA_T;         // 사다리꼴 넓이 = 이동 거리 (m)
  const SCN = {                                      // 운동 식 단계의 두 상황
    cart: { name: '수레(가속)', v0: V0, a: A0, tmax: 2.0, vmax: 6, tick: 1 },
    brake: { name: '브레이크(감속)', v0: 6.0, a: -2.0, tmax: 3.0, vmax: 7, tick: 1 },
  };
  const CAR = { v0: 20, a: -5, tEnd: 4 };            // 급제동 자동차
  const CAR_T = -CAR.v0 / CAR.a;                     // 정지까지 시간 = 4 s
  const CAR_S = -CAR.v0 * CAR.v0 / (2 * CAR.a);      // 정지 거리 = 40 m
  const BAL = { v0: 10, a: -10 };                    // 위로 던진 공
  const BAL_T = -BAL.v0 / BAL.a;                     // 최고점 시각 = 1.0 s
  const BAL_H = BAL.v0 * BAL.v0 / (2 * -BAL.a);      // 최고점 높이 = 5 m

  /* ---------- 상태 ---------- */
  const S = { mode: 'video', clock: 0, fade: 0, vd: null, gr: null, md: null, ap: null, flags: { vt: false, area: false, order: false } };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (mode === 'graph' && S.gr) S.gr.t0 = S.clock; if (S.vd) S.vd.play = false; if (S.ap) S.ap.play = false; }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= 영상 (프레임 분석) ================= */
  const TH = 9 * Math.PI / 180;                       // 비탈의 경사각 (그림)
  const VPPM = PHONE ? 175 : 285;                     // 1 m당 화소
  const MX = 12, MY = 40, MW = VW - 24, MH = SH - 48;
  const VO = { x: PHONE ? 58 : 80, y: MY + 80 };   // 위치 0 m의 비탈 위 점
  const rampPt = (s, off) => ({ x: VO.x + s * VPPM * Math.cos(TH) - (off || 0) * Math.sin(TH), y: VO.y + s * VPPM * Math.sin(TH) + (off || 0) * Math.cos(TH) });
  const CART_OFF = -27;                               // 수레 중심(빨간 점)의 비탈에서의 높이
  const cartPt = (s) => rampPt(s, CART_OFF);
  function resetVideo() {
    S.vd = { t: 0, play: false, mk: [true, false, false, false, false, false], pop: [1, 0, 0, 0, 0, 0], vin: ['', '', '', '', ''], sel: {}, vOK: false, bad: {} };
    updateCtl();
  }
  const frameOf = (t) => { const k = Math.round(t / DT); return Math.abs(t - k * DT) < 1e-6 ? k : -1; };
  const nMarks = () => S.vd.mk.slice(1).filter(Boolean).length;
  function setFrame(k) { const v = S.vd; v.play = false; v.t = clamp(k, 0, NFR) * DT; updateCtl(); }
  function togglePlay() {
    const v = S.vd; Sound.click();
    if (v.play) { v.play = false; updateCtl(); return; }
    if (v.t >= NFR * DT - 1e-9) v.t = 0;
    v.play = true; updateCtl();
  }
  function placeMarker() {
    const v = S.vd;
    if (v.play) { v.play = false; v.t = Math.round(v.t / DT) * DT; updateCtl(); showHint('프레임에서 멈췄어요. 한 번 더 누르면 마커가 찍혀요.'); return; }
    const k = frameOf(v.t);
    if (k < 0) return;
    if (k === 0) { showHint('0번 프레임은 기준점(0 m)이에요. 1~5번 프레임에서 마커를 찍어요.'); return; }
    if (v.mk[k]) { showHint('이 프레임에는 이미 마커가 있어요.'); return; }
    v.mk[k] = true; v.pop[k] = 0; Sound.success();
    const p = rampPt(xMeas(k), 33);
    parts.burst(p.x, p.y, { count: 10, speed: 110, size: 3, colors: ['#e2464b', '#ffd447', '#fff'], gravity: 80, life: 0.6 });
    updateCtl();
  }
  function clearMarkers() { const v = S.vd; Sound.click(); v.mk = [true, false, false, false, false, false]; v.pop = [1, 0, 0, 0, 0, 0]; v.vOK = false; updateCtl(); }
  function stepVideo(dt) {
    const v = S.vd;
    if (v.play) { v.t += dt * 0.5; if (v.t >= NFR * DT) { v.t = NFR * DT; v.play = false; updateCtl(); } }
    for (let k = 0; k <= NFR; k++) v.pop[k] = approach(v.pop[k], v.mk[k] ? 1 : 0, dt, 12);
  }
  function drawCart(s, alpha, dim) {
    const cw = 0.34 * VPPM, o = rampPt(s, 0);
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(o.x, o.y); ctx.rotate(TH);
    const body = () => { D.roundRect(-cw / 2, -44, cw, 34, 8); };
    if (dim) { body(); ctx.fillStyle = '#f26b3a'; ctx.fill(); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 1.5; ctx.stroke(); }
    else {
      D.shadow(() => { body(); const g = ctx.createLinearGradient(0, -44, 0, -10); g.addColorStop(0, '#ff9a63'); g.addColorStop(1, '#e2552a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.strokeStyle = '#a63c14'; ctx.lineWidth = 2; body(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-cw / 2 + 8, -40, cw - 16, 5);
    }
    [-0.3, 0.3].forEach((f) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(f * cw, -8, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(f * cw, -8, 3, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#e2464b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -27, dim ? 4 : 6, 0, TAU); ctx.fill(); if (!dim) ctx.stroke();
    ctx.restore();
  }
  /* 비탈 + 눈금자 (영상 화면 안쪽) */
  function drawRamp() {
    const a = rampPt(-0.4, 0), b = rampPt(2.45, 0), c = rampPt(2.45, 14), d = rampPt(-0.4, 14);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    const g = ctx.createLinearGradient(a.x, a.y, c.x, c.y); g.addColorStop(0, '#e0b57a'); g.addColorStop(1, '#b8844a'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(c.x - 7, c.y, 14, MY + MH - c.y - 6);
    // 눈금자
    const r0 = rampPt(0, 22), r1 = rampPt(2.1, 22), r2 = rampPt(2.1, 48), r3 = rampPt(0, 48);
    ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.lineTo(r3.x, r3.y); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill(); ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i <= 21; i++) {
      const s = i / 10, big = i % 5 === 0, p0 = rampPt(s, 22), p1 = rampPt(s, 22 + (big ? 17 : 9));
      ctx.strokeStyle = big ? '#26324a' : '#5a6679'; ctx.lineWidth = big ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      if (big) { const q = rampPt(s, 66); T(q.x, q.y + 4, i === 0 ? '0' : (s % 1 === 0 ? s.toFixed(1) : s.toFixed(1)), 13, '#26324a', 'center', 800); }
    }
    const u = rampPt(2.25, 66); T(u.x, u.y + 4, 'm', 13, '#26324a', 'left', 800);
  }
  function drawVideo(dt) {
    const v = S.vd, t = v.t, k = frameOf(t);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, '🎞️ 영상 분석: 프레임마다 수레의 위치를 찍어요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    D.shadow(() => { D.roundRect(MX, MY, MW, MH, 14); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); D.roundRect(MX + 5, MY + 5, MW - 10, MH - 10, 10); ctx.clip();
    const sg = ctx.createLinearGradient(0, MY, 0, MY + MH); sg.addColorStop(0, '#dbeafe'); sg.addColorStop(1, '#f1f7ff'); ctx.fillStyle = sg; ctx.fillRect(MX, MY, MW, MH);
    drawRamp();
    // 마커 (고스트 수레 + 눈금자 위의 핀)
    for (let j = 0; j <= NFR; j++) {
      if (!v.mk[j] || v.pop[j] < 0.02) continue;
      const pop = v.pop[j];
      drawCart(xTrue(DT * j), 0.3 * pop, true);
      const pin = rampPt(xMeas(j), 35), top = cartPt(xTrue(DT * j));
      D.dashedLine(top.x, top.y + 6, pin.x, pin.y, { color: 'rgba(226,70,75,.7)', width: 1.6, dash: [3, 3] });
      D.sphere(pin.x, pin.y, 7 * pop, '#e2464b', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      const lb = rampPt(xMeas(j), -62);
      if (j > 0) D.label(lb.x, lb.y, fnum(xMeas(j), 2) + ' m', { bg: '#e2464b', size: 13 }); else D.label(lb.x, lb.y, '기준 0', { bg: '#5a6679', size: 13 });
    }
    // 지금 보이는 수레
    const sNow = xTrue(t);
    drawCart(sNow, 1, false);
    if (k > 0 && !v.mk[k] && !v.play) { const p = cartPt(sNow); D.ring(p.x, p.y, 20, S.clock, { color: '#e2464b', width: 3 }); }
    // 화면 위 HUD: 시간 · 타임라인 (오른쪽 위)
    const hx1 = PHONE ? MX + 18 + 200 : MX + MW - 18, hx0 = hx1 - (PHONE ? 200 : 250), ty = PHONE ? MY + MH - 20 : MY + 46;
    T(hx1, PHONE ? MY + MH - 40 : MY + 30, (v.play ? '▶ ' : '⏸ ') + 't = ' + t.toFixed(1) + ' s' + (k >= 0 ? ' · 프레임 ' + k : ''), 14, '#26324a', 'right', 800);
    ctx.strokeStyle = 'rgba(38,50,74,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx0, ty); ctx.lineTo(hx1, ty); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(hx0, ty); ctx.lineTo(hx0 + (hx1 - hx0) * t / (NFR * DT), ty); ctx.stroke(); ctx.lineCap = 'butt';
    for (let j = 0; j <= NFR; j++) { const x = hx0 + (hx1 - hx0) * j / NFR; D.sphere(x, ty, 5, v.mk[j] ? '#e2464b' : '#fff', { gloss: false, outline: '#26324a', outlineWidth: 1.2 }); }
    ctx.restore();
    if (nMarks() === NFR) D.label(VW - 22, MY + MH - 22, '마커 간격이 점점 넓어져요!', { bg: '#14a058', size: PHONE ? 13 : 14.5, align: 'right' });
    drawVideoPanel();
    parts.update(dt); parts.draw(ctx);
  }
  function drawVideoPanel() {
    const v = S.vd;
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, w = PW - 32;
    T(x0, PY + 26, '📋 위치–시간 표 (마커를 찍으면 자동으로 기록돼요)', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    const cols = [x0, x0 + w * 0.15, x0 + w * 0.31, x0 + w * 0.55, x0 + w * 0.8];
    ['프레임', 't (s)', '위치 x (m)', '구간 Δx (m)', '평균 속도 v̄'].forEach((h, i) => T(cols[i], PY + 52, h, PHONE ? 13 : 13.5, '#5a6679', 'left', 800));
    const rh = PHONE ? 30 : 27;
    for (let j = 0; j <= NFR; j++) {
      const y = PY + 62 + j * rh, cur = frameOf(v.t) === j;
      if (cur) { D.roundRect(x0 - 6, y, w + 12, rh - 2, 7); ctx.fillStyle = 'rgba(242,107,58,.13)'; ctx.fill(); }
      const has = v.mk[j], hasPrev = j > 0 && v.mk[j] && v.mk[j - 1];
      T(cols[0] + 14, y + rh - 9, String(j), 14, '#26324a', 'center', 800);
      T(cols[1], y + rh - 9, (DT * j).toFixed(1), 14, '#26324a', 'left', 800);
      T(cols[2], y + rh - 9, has ? fnum(xMeas(j), 2) : '?', 14, has ? '#c0392b' : '#98a2b3', 'left', 800);
      T(cols[3], y + rh - 9, j === 0 ? '—' : hasPrev ? fnum((MEAS_CM[j] - MEAS_CM[j - 1]) / 100, 2) : '?', 14, hasPrev ? '#26324a' : '#98a2b3', 'left', 800);
      T(cols[4], y + rh - 9, j === 0 ? '—' : v.vOK && hasPrev ? fnum(VBAR(j), 2) + ' m/s' : '?', 14, v.vOK && hasPrev ? '#0b6b39' : '#98a2b3', 'left', 800);
    }
    if (!PHONE) T(x0 + w, PY + 26, '위치는 눈금 읽기 오차 ±0.01 m가 있어요', 13, '#5a6679', 'right', 700);
  }

  /* ================= 속도–시간 그래프 ================= */
  const GR = PHONE ? { x0: 56, x1: VW - 18, y0: 66, y1: SH - 38 } : { x0: 80, x1: VW - 248, y0: 66, y1: SH - 38 };
  function axes(o) {
    const gx = (t) => o.x0 + (o.x1 - o.x0) * (t - o.tmin) / (o.tmax - o.tmin), gy = (v) => o.y1 - (o.y1 - o.y0) * (v - o.vmin) / (o.vmax - o.vmin);
    D.roundRect(o.x0 - 6, o.y0 - 8, o.x1 - o.x0 + 12, o.y1 - o.y0 + 16, 10); ctx.fillStyle = '#fff'; ctx.fill();
    for (let v = o.vmin; v <= o.vmax + 1e-9; v += o.vstep) {
      ctx.strokeStyle = Math.abs(v) < 1e-9 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = Math.abs(v) < 1e-9 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(o.x0, gy(v)); ctx.lineTo(o.x1, gy(v)); ctx.stroke();
      T(o.x0 - 10, gy(v) + 5, fnum(v, 0), 13, '#3a465c', 'right', 800);
    }
    for (let t = o.tmin; t <= o.tmax + 1e-9; t += o.tstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(t), o.y0); ctx.lineTo(gx(t), o.y1); ctx.stroke();
      T(gx(t), o.y1 + 22, t.toFixed(1), 13, '#3a465c', 'center', 800);
    }
    T(o.x1, o.y1 + 38, '시간 t (s)', 13, '#3a465c', 'right', 800);
    T(o.x0 - 6, o.y0 - 16, '속도 v (m/s)', 13, '#3a465c', 'left', 800);
    return { gx, gy };
  }
  function resetGraph(keepLatch) {
    const p = S.gr;
    S.gr = { vid: 'cart', fit: { cart: { v0: 2, a: 0 }, ball: { v0: 2, a: 0 } }, latch: keepLatch && p ? p.latch : { cart: false, ball: false }, t0: S.clock, area: '', areaOK: false, areaShown: false };
    updateCtl();
  }
  function grSet(k, val) {
    const g = S.gr, f = g.fit[g.vid]; if (f[k] === val) return; f[k] = val; updateCtl();
  }
  function grVid(vid) { if (S.gr.vid === vid) return; S.gr.vid = vid; S.gr.t0 = S.clock; parts.clear(); updateCtl(); }
  function stepGraph() {
    const g = S.gr;
    ['cart', 'ball'].forEach((id) => { const f = g.fit[id]; if (f.v0 === FIT[id].v0 && f.a === FIT[id].a) { if (!g.latch[id]) { g.latch[id] = true; if (g.vid === id) { Sound.success(); } } } });
  }
  function drawGraph(dt) {
    const g = S.gr, vid = g.vid, pts = PTS[vid](), ball = vid === 'ball';
    const lock = S.flags.area, f = lock ? FIT.cart : g.fit[vid];
    bgFill('#eaf1fb', '#f7faff');
    T(16, 28, '📈 속도–시간 그래프: 점들에 가장 잘 맞는 직선', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const o = Object.assign({ tmin: 0, tmax: 2.0, tstep: 0.5, vmin: ball ? -12 : 0, vmax: ball ? 12 : 6, vstep: ball ? 4 : 1 }, GR);
    const { gx, gy } = axes(o);
    // 영상 범위 밖 (수레는 t > 1.0 s)
    if (!ball) { ctx.fillStyle = 'rgba(124,92,255,.07)'; ctx.fillRect(gx(NFR * DT), o.y0, o.x1 - gx(NFR * DT), o.y1 - o.y0); T(gx(NFR * DT) + 8, o.y0 + 18, '영상 밖 (예측)', 13, '#6d4fd6', 'left', 800); }
    ctx.save(); ctx.beginPath(); ctx.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); ctx.clip();
    // 넓이 칠하기 (넓이 미션)
    if (S.flags.area && !ball) {
      const vEnd = V0 + A0 * AREA_T;
      ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(0), gy(V0)); ctx.lineTo(gx(AREA_T), gy(vEnd)); ctx.lineTo(gx(AREA_T), gy(0)); ctx.closePath();
      ctx.fillStyle = 'rgba(20,160,88,.25)'; ctx.fill(); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.stroke();
    }
    // 직선과 오차
    const lineY = (t) => f.v0 + f.a * t;
    pts.forEach((p, i) => {
      const k = clamp((S.clock - g.t0 - i * 0.1) / 0.5, 0, 1);
      if (k >= 1) { ctx.strokeStyle = 'rgba(124,92,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx(p.t), gy(p.v)); ctx.lineTo(gx(p.t), gy(lineY(p.t))); ctx.stroke(); ctx.setLineDash([]); }
    });
    ctx.strokeStyle = g.latch[vid] || lock ? '#14a058' : '#e2552a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx(0), gy(f.v0)); ctx.lineTo(gx(2.0), gy(f.v0 + f.a * 2.0)); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    // 점 (표에서 날아와 꽂혀요)
    pts.forEach((p, i) => {
      const k = clamp((S.clock - g.t0 - i * 0.1) / 0.5, 0, 1), e = RM ? 1 : SciSim.ease.outBack(k), fx = VW / 2, fy = PY + 40;
      const X = gx(p.t), Y = gy(p.v);
      if (k <= 0) return;
      D.sphere(fx + (X - fx) * e, fy + (Y - fy) * e, 6.5, '#3867f4', { gloss: false, outline: '#fff', outlineWidth: 2 });
    });
    // 기울기 삼각형 (Δt = 1.0 s)
    const lf2 = f;
    if (!lock && Math.abs(f.a) > 0.01) {
      const t1 = 0.5, t2 = 1.5, P1 = { x: gx(t1), y: gy(lineY(t1)) }, P2 = { x: gx(t2), y: gy(lineY(t2)) };
      if (P1.y > o.y0 && P1.y < o.y1 && P2.y > o.y0 && P2.y < o.y1) {
        ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P1.x, P1.y); ctx.lineTo(P2.x, P1.y); ctx.lineTo(P2.x, P2.y); ctx.stroke();
        T((P1.x + P2.x) / 2, P1.y + (f.a > 0 ? 18 : -8), 'Δt = 1.0 s', 13, '#6d4fd6', 'center', 800);
        T(P2.x + 6, (P1.y + P2.y) / 2 + 5, 'Δv = ' + fnum(f.a, 1), 13, '#6d4fd6', 'left', 800);
      }
    }
    if (S.flags.area && !ball) {
      const vEnd = V0 + A0 * AREA_T;
      T(gx(0) + 8, gy(V0) - 8, 'v₀ = ' + V0.toFixed(1), 13, '#0b6b39', 'left', 800);
      T(gx(AREA_T) - 8, gy(vEnd) - 8, 'v = ' + vEnd.toFixed(1), 13, '#0b6b39', 'right', 800);
      D.label((gx(0) + gx(AREA_T)) / 2, gy(1.2), '넓이 = ? m (밑변 ' + AREA_T.toFixed(1) + ' s)', { bg: '#14a058', size: 13 });
    }
    if (g.latch[vid] && !lock) D.label(gx(0) + 10, o.y0 + 16, '✅ 최적 직선!', { bg: '#14a058', size: 14, align: 'left' });
    // 오른쪽 카드 (태블릿)
    if (!PHONE) {
      const cx = o.x1 + 24, cw = VW - cx - 12, cy = o.y0 - 8;
      panel(cx, cy, cw, o.y1 - o.y0 + 16, 14);
      T(cx + 12, cy + 26, '📌 직선 v = v₀ + a·t', 14.5, '#26324a', 'left', 800);
      T(cx + 12, cy + 52, 'v₀ = ' + fnum(lf2.v0, 1) + ' m/s', 14, '#26324a', 'left', 800);
      T(cx + 12, cy + 74, 'a = ' + fnum(lf2.a, 1) + ' m/s²', 14, '#c2410c', 'left', 800);
      T(cx + 12, cy + 102, '점과 직선의 차이', 13.5, '#5a6679', 'left', 800);
      T(cx + 12, cy + 124, 'Σ(오차)² = ' + sse(vid, lf2.v0, lf2.a).toFixed(3), 14, g.latch[vid] ? '#0b6b39' : '#26324a', 'left', 800);
      textBlock(cx + 12, cy + 152, cw - 22, g.latch[vid] ? '오차가 가장 작아요!' : '보라색 점선이 짧아지도록 맞춰요.', 13.5, '#3a465c', 18, 700);
    }
    drawGraphPanel(g, vid, f, pts, lf2);
    parts.update(dt); parts.draw(ctx);
  }
  function drawGraphPanel(g, vid, f, pts, lf) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 16, bw = PW - 32, ball = vid === 'ball';
    T(bx, PY + 26, ball ? '⚽ 위로 던진 공 영상의 구간 평균 속도 (위쪽 +)' : '🛒 수레 영상의 구간 평균 속도 (구간 가운데 시각에 찍어요)', PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
    // 두 줄 표
    const n = pts.length, cw = (bw - 70) / n, y1 = PY + 54;
    T(bx, y1 + 18, 't (s)', 13, '#5a6679', 'left', 800); T(bx, y1 + 44, 'v̄ (m/s)', 13, '#5a6679', 'left', 800);
    pts.forEach((p, i) => {
      const x = bx + 70 + cw * (i + 0.5);
      D.roundRect(x - cw / 2 + 2, y1, cw - 4, 56, 8); ctx.fillStyle = '#f5f7fc'; ctx.fill();
      T(x, y1 + 20, p.t.toFixed(1), 13.5, '#26324a', 'center', 800);
      T(x, y1 + 46, ball ? fnum(p.v, 0) : fnum(p.v, 2), 13.5, '#3867f4', 'center', 800);
    });
    const ty = y1 + 84;
    if (S.flags.area && !ball) {
      T(bx, ty, '사다리꼴 넓이 = (윗변 + 아랫변) × 높이 ÷ 2', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
      T(bx, ty + 26, '윗변 v₀ = ' + V0.toFixed(1) + ' m/s, 아랫변 v = ' + AREA_V.toFixed(1) + ' m/s, 높이(시간) = ' + AREA_T.toFixed(1) + ' s', PHONE ? 13 : 14.5, '#0b6b39', 'left', 800);
      textBlock(bx, ty + 52, bw, '넓이의 단위는 (m/s) × s = m, 곧 이동 거리예요. 밑변이 시간이고 높이가 속도이니까요.', 13.5, '#3a465c', 18, 700);
    } else {
      T(bx, ty, '직선: v = ' + fnum(lf.v0, 1) + ' ' + (lf.a < 0 ? MINUS : '+') + ' ' + Math.abs(lf.a).toFixed(1) + ' t', PHONE ? 16 : 18, '#c2410c', 'left', 800);
      T(bx, ty + 26, '기울기 a = Δv ÷ Δt = ' + (lf.a * 1.0).toFixed(1).replace('-', MINUS) + ' m/s ÷ 1.0 s = ' + fnum(lf.a, 1) + ' m/s²', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      textBlock(bx, ty + 52, bw, g.latch[vid] ? (ball ? '속도가 일정하게 줄어요 → 기울기가 음수(−10 m/s²)예요.' : '속도가 1초에 2.0 m/s씩 늘어나요 → 가속도 a = 2.0 m/s².') : '점들은 직선 둘레에 조금씩 흩어져 있어요. 오차의 합이 가장 작은 직선이 최적 직선이에요.', 13.5, '#3a465c', 18, 700);
    }
  }

  /* ================= 운동 식 이끌기 ================= */
  const ORD = [{ k: 'A', t: 'A. 그래프의 기울기 → v = v₀ + at' }, { k: 'B', t: 'B. 그래프 아래 넓이 → s = v₀t + ½at²' }, { k: 'C', t: 'C. 두 식에서 t를 없애기 → 2as = v² − v₀²' }];
  const ORD_ANS = ['A', 'B', 'C'];
  function resetModel() {
    const p = S.md;
    S.md = { stage: 1, sc: 'cart', t: 1.0, v0: 0.5, a: 1.0, order: ['', '', ''], orderOK: [undefined, undefined, undefined], verified: false, t0: S.clock };
    if (p) S.md.t0 = S.clock;
    updateCtl();
  }
  function mdSetStage(n) { S.md.stage = n; S.md.t0 = S.clock; parts.clear(); updateCtl(); }
  function mdSc(sc) { const m = S.md; m.sc = sc; m.t = Math.min(m.t, SCN[sc].tmax); m.t = Math.max(0.5, m.t); updateCtl(); }
  const mdPos = (v0, a, t) => v0 * t + 0.5 * a * t * t;
  const mdVel = (v0, a, t) => v0 + a * t;
  const predCm = (k) => Math.round(100 * mdPos(S.md.v0, S.md.a, DT * k));
  const mdOK = () => { for (let k = 1; k <= NFR; k++) if (Math.abs(predCm(k) - MEAS_CM[k]) > 1) return false; return true; };
  function stepModel() { /* 상태 변화 없음 (검증은 mdOK로 계산) */ }
  function drawModel(dt) {
    const m = S.md;
    bgFill('#eaf1fb', '#f7faff');
    if (m.stage === 4) { drawVerify(dt); return; }
    const sc = SCN[m.sc], t = m.t, v = mdVel(sc.v0, sc.a, t), s = mdPos(sc.v0, sc.a, t);
    T(16, 28, '🧮 ' + ['', '① 기울기에서 v = v₀ + at', '② 넓이에서 s = v₀t + ½at²', '③ t를 없애서 2as = v² − v₀²'][m.stage] + ' · ' + sc.name, PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    const o = Object.assign({ tmin: 0, tmax: sc.tmax, tstep: 0.5, vmin: 0, vmax: sc.vmax, vstep: 1 }, GR);
    const { gx, gy } = axes(o);
    ctx.save(); ctx.beginPath(); ctx.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); ctx.clip();
    const grow = RM ? 1 : SciSim.ease.outCubic(clamp((S.clock - m.t0) / 0.7, 0, 1));
    if (m.stage >= 2) {
      if (sc.a >= 0) {   // 직사각형 v₀t + 삼각형 ½·t·(at)
        ctx.fillStyle = 'rgba(56,103,244,.28)'; ctx.fillRect(gx(0), gy(sc.v0), gx(t) - gx(0), gy(0) - gy(sc.v0));
        ctx.beginPath(); ctx.moveTo(gx(0), gy(sc.v0)); ctx.lineTo(gx(t), gy(sc.v0)); ctx.lineTo(gx(t), gy(v)); ctx.closePath(); ctx.fillStyle = 'rgba(20,160,88,.35)'; ctx.fill();
      } else {           // 직선 아래가 실제 이동 거리, 위쪽 삼각형은 감속으로 줄어든 만큼
        ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(0), gy(sc.v0)); ctx.lineTo(gx(t), gy(v)); ctx.lineTo(gx(t), gy(0)); ctx.closePath(); ctx.fillStyle = 'rgba(56,103,244,.28)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(gx(0), gy(sc.v0)); ctx.lineTo(gx(t), gy(sc.v0)); ctx.lineTo(gx(t), gy(v)); ctx.closePath(); ctx.fillStyle = 'rgba(226,70,75,.30)'; ctx.fill();
        ctx.strokeStyle = 'rgba(56,103,244,.8)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; ctx.strokeRect(gx(0), gy(sc.v0), gx(t) - gx(0), gy(0) - gy(sc.v0)); ctx.setLineDash([]);
      }
    }
    ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx(0), gy(sc.v0)); ctx.lineTo(gx(sc.tmax), gy(sc.v0 + sc.a * sc.tmax)); ctx.stroke(); ctx.lineCap = 'butt';
    if (m.stage === 1 || m.stage === 3) {
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx(0), gy(sc.v0)); ctx.lineTo(gx(t * grow), gy(sc.v0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx(t), gy(sc.v0)); ctx.lineTo(gx(t), gy(sc.v0 + (v - sc.v0) * grow)); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(38,50,74,.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx(t), gy(0)); ctx.lineTo(gx(t), gy(v)); ctx.moveTo(gx(0), gy(v)); ctx.lineTo(gx(t), gy(v)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(gx(t), gy(v), 7, '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 2 });
    D.label(gx(0) - 2, gy(v), 'v = ' + fnum(v, 1), { bg: '#e2552a', size: 13, align: 'left' });
    T(gx(t), gy(0) - 6, 't = ' + t.toFixed(1), 13, '#26324a', 'center', 800);
    if (m.stage === 1) {
      T(gx(t / 2), gy(sc.v0) + (sc.a >= 0 ? 20 : -10), 't', 13.5, '#6d4fd6', 'center', 800);
      T(gx(t) + 8, (gy(sc.v0) + gy(v)) / 2 + 5, 'Δv = a·t = ' + fnum(sc.a * t, 1), 13.5, '#6d4fd6', 'left', 800);
    }
    if (m.stage >= 2) {
      if (sc.a >= 0) {
        T(gx(t / 2), gy(sc.v0 / 2) + 5, 'v₀t', 14, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
        if (Math.abs(sc.a * t) > 0.6) T(gx(t * 0.66), gy(sc.v0 + (v - sc.v0) * 0.33) + 16, '½·t·at', 13.5, '#0b6b39', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
      } else {
        T(gx(t * 0.4), gy(sc.v0 * 0.35) + 5, '실제 이동 거리 s', 13.5, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
        if (Math.abs(sc.a * t) > 0.6) T(gx(t * 0.6), gy(sc.v0 + (v - sc.v0) * 0.2) - 6, '½at² (−)', 13.5, '#c0392b', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 });
      }
    }
    if (!PHONE) {
      const cx = o.x1 + 24, cw = VW - cx - 12, cy = o.y0 - 8;
      panel(cx, cy, cw, o.y1 - o.y0 + 16, 14);
      T(cx + 12, cy + 26, '📌 값', 14.5, '#26324a', 'left', 800);
      T(cx + 12, cy + 52, 'v₀ = ' + fnum(sc.v0, 1) + ' m/s', 14, '#26324a', 'left', 800);
      T(cx + 12, cy + 74, 'a = ' + fnum(sc.a, 1) + ' m/s²', 14, '#26324a', 'left', 800);
      T(cx + 12, cy + 96, 't = ' + t.toFixed(1) + ' s', 14, '#26324a', 'left', 800);
      T(cx + 12, cy + 126, 'v = ' + fnum(v, 1) + ' m/s', 14.5, '#c2410c', 'left', 800);
      T(cx + 12, cy + 150, 's = ' + fnum(s, 2) + ' m', 14.5, '#0b6b39', 'left', 800);
    }
    drawModelPanel(m, sc, t, v, s);
    parts.update(dt); parts.draw(ctx);
  }
  function drawModelPanel(m, sc, t, v, s) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 16, bw = PW - 32, fs = PHONE ? 13.5 : 15.5;
    const L = (i, str, col, size) => T(bx, PY + 28 + i * (PHONE ? 29 : 31), str, size || fs, col || '#26324a', 'left', 800);
    const as = sc.a * t;
    if (m.stage === 1) {
      L(0, '그래프의 기울기 = (v − v₀) ÷ t = a');
      L(1, '→ v − v₀ = a·t   ∴  v = v₀ + at', '#c2410c', PHONE ? 15 : 18);
      L(2, 'v = ' + fnum(sc.v0, 1) + ' ' + (sc.a < 0 ? MINUS : '+') + ' ' + Math.abs(sc.a).toFixed(1) + ' × ' + t.toFixed(1) + ' = ' + fnum(v, 1) + ' m/s');
      textBlock(bx, PY + 28 + 3 * (PHONE ? 29 : 31) + 4, bw, sc.a < 0 ? 'a가 음수(−)이면 시간이 지날수록 속도가 줄어요. 속도와 가속도의 방향이 반대예요.' : '시간 t가 1초 늘 때마다 속도가 a만큼 늘어요.', 13.5, '#3a465c', 18, 700);
    } else if (m.stage === 2) {
      L(0, '그래프 아래 넓이 = 이동 거리 s');
      L(1, '직사각형 v₀t + 삼각형 ½·t·(at)  ∴  s = v₀t + ½at²', '#c2410c', PHONE ? 13.5 : 16.5);
      L(2, 'v₀t = ' + fnum(sc.v0 * t, 2) + ' m   ½at² = ' + fnum(0.5 * sc.a * t * t, 2) + ' m');
      L(3, 's = ' + fnum(sc.v0 * t, 2) + ' ' + (sc.a < 0 ? MINUS : '+') + ' ' + Math.abs(0.5 * sc.a * t * t).toFixed(2) + ' = ' + fnum(s, 2) + ' m', '#0b6b39');
    } else {
      L(0, '① t = (v − v₀) ÷ a 를 ② s = v₀t + ½at²에 넣으면');
      L(1, '2as = v² − v₀²', '#c2410c', PHONE ? 17 : 20);
      L(2, '왼쪽 2as = 2 × ' + fnum(sc.a, 1) + ' × ' + fnum(s, 2) + ' = ' + fnum(2 * sc.a * s, 2));
      L(3, '오른쪽 v² − v₀² = ' + fnum(v, 1) + '² − ' + fnum(sc.v0, 1) + '² = ' + fnum(v * v - sc.v0 * sc.v0, 2), '#0b6b39');
      T(bx + bw, PY + 28 + 3 * (PHONE ? 29 : 31), Math.abs(2 * sc.a * s - (v * v - sc.v0 * sc.v0)) < 1e-9 ? '같아요 ✔' : '', 15, '#0b6b39', 'right', 800);
      textBlock(bx, PY + 28 + 4 * (PHONE ? 29 : 31) + 2, bw, '시간을 모를 때도 속도와 거리의 관계를 바로 구할 수 있어요.', 13.5, '#3a465c', 18, 700);
    }
  }
  function drawVerify(dt) {
    const m = S.md;
    T(16, 28, '🧮 ④ 식으로 예측한 위치(고리)와 영상에서 읽은 위치(핀) 비교', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    D.shadow(() => { D.roundRect(MX, MY, MW, MH, 14); ctx.fillStyle = '#1f2937'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); D.roundRect(MX + 5, MY + 5, MW - 10, MH - 10, 10); ctx.clip();
    const sg = ctx.createLinearGradient(0, MY, 0, MY + MH); sg.addColorStop(0, '#dbeafe'); sg.addColorStop(1, '#f1f7ff'); ctx.fillStyle = sg; ctx.fillRect(MX, MY, MW, MH);
    drawRamp();
    for (let j = 0; j <= NFR; j++) {
      drawCart(xTrue(DT * j), 0.28, true);
      const pin = rampPt(xMeas(j), 35);
      D.sphere(pin.x, pin.y, 6, '#e2464b', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      const pr = rampPt(mdPos(m.v0, m.a, DT * j), 35), ok = j === 0 || Math.abs(predCm(j) - MEAS_CM[j]) <= 1;
      ctx.strokeStyle = ok ? '#14a058' : '#7c5cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pr.x, pr.y, 11, 0, TAU); ctx.stroke();
      if (j > 0) { const lb = rampPt(mdPos(m.v0, m.a, DT * j), -62); D.label(lb.x, lb.y, fnum(predCm(j) / 100, 2), { bg: ok ? '#14a058' : '#7c5cff', size: 13 }); }
    }
    ctx.restore();
    const okAll = mdOK();
    D.label(MX + MW - 14, MY + 24, okAll ? '모두 ±0.01 m 이내!' : '고리와 핀이 겹치도록 v₀와 a를 맞춰요', { bg: okAll ? '#14a058' : '#26324a', size: PHONE ? 13 : 14.5, align: 'right' });
    // 표
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, w = PW - 32;
    T(x0, PY + 26, '🧮 s = v₀t + ½at²  (v₀ = ' + m.v0.toFixed(1) + ' m/s, a = ' + m.a.toFixed(1) + ' m/s²)', PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
    const cols = [x0, x0 + w * 0.17, x0 + w * 0.36, x0 + w * 0.58, x0 + w * 0.8];
    ['프레임', 't (s)', '예측 x (m)', '측정 x (m)', '차이 (m)'].forEach((h, i) => T(cols[i], PY + 52, h, 13, '#5a6679', 'left', 800));
    const rh = PHONE ? 30 : 27;
    for (let j = 1; j <= NFR; j++) {
      const y = PY + 62 + (j - 1) * rh, dcm = predCm(j) - MEAS_CM[j], ok = Math.abs(dcm) <= 1;
      T(cols[0] + 14, y + rh - 9, String(j), 14, '#26324a', 'center', 800);
      T(cols[1], y + rh - 9, (DT * j).toFixed(1), 14, '#26324a', 'left', 800);
      T(cols[2], y + rh - 9, fnum(predCm(j) / 100, 2), 14, '#6d4fd6', 'left', 800);
      T(cols[3], y + rh - 9, fnum(MEAS_CM[j] / 100, 2), 14, '#c0392b', 'left', 800);
      T(cols[4], y + rh - 9, fsg(dcm / 100, 2), 14, ok ? '#0b6b39' : '#c0392b', 'left', 800);
    }
    T(x0, PY + 62 + 5 * rh + 18, okAll ? '차이가 ±0.01 m 이내예요. 눈금 읽기 오차 정도라서 식이 잘 맞아요!' : '차이가 ±0.01 m보다 크면 아직 식이 영상과 맞지 않아요.', 13.5, okAll ? '#0b6b39' : '#7a4b00', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= 적용: 급제동 자동차 · 위로 던진 공 ================= */
  const APPM = PHONE ? 9.4 : 16.4;                          // 1 m당 화소 (자동차)
  const CX0 = PHONE ? 34 : 56, CRY = SH - 62;
  const BPPM = PHONE ? 34 : 38, BGY = SH - 30;               // 공: 1 m당 화소, 바닥 높이
  function resetApply() {
    S.ap = { sc: 'car', t: 0, play: false, played: { car: false, ball: false }, sparkT: 0 };
    ['aT', 'aS', 'bT', 'bH'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
    const f = $('#aFormula'); if (f) { f.value = ''; f.classList.remove('ok', 'bad'); }
    updateCtl();
  }
  const apEnd = () => (S.ap.sc === 'car' ? CAR.tEnd : 2.0);
  const carX = (t) => (t >= CAR_T ? CAR_S : CAR.v0 * t + 0.5 * CAR.a * t * t);
  const carV = (t) => (t >= CAR_T ? 0 : CAR.v0 + CAR.a * t);
  const ballY = (t) => BAL.v0 * t + 0.5 * BAL.a * t * t;
  const ballV = (t) => BAL.v0 + BAL.a * t;
  function apSc(sc) { const a = S.ap; if (a.sc === sc) return; a.sc = sc; a.t = 0; a.play = false; parts.clear(); updateCtl(); }
  function apPlay() {
    const a = S.ap; Sound.click();
    if (a.play) { a.play = false; updateCtl(); return; }
    if (a.t >= apEnd() - 1e-9) a.t = 0;
    a.play = true; updateCtl();
  }
  function stepApply(dt) {
    const a = S.ap;
    if (a.play) {
      a.t += dt;
      if (a.sc === 'car' && !RM && a.t < CAR_T && Math.random() < 0.55) { const x = CX0 + carX(a.t) * APPM - (PHONE ? 24 : 34); parts.burst(x, CRY + 6, { count: 2, speed: 70, size: 2.4, colors: ['#ffd447', '#ff9a63', '#fff'], gravity: 160, life: 0.35 }); }
      if (a.t >= apEnd()) { a.t = apEnd(); a.play = false; a.played[a.sc] = true; Sound.success(); updateCtl(); }
    }
  }
  const numIn = (id) => { const e = $('#' + id); if (!e || e.value.trim() === '') return null; const n = +e.value; return isFinite(n) ? n : null; };
  function drawApply(dt) {
    const a = S.ap, car = a.sc === 'car', t = a.t;
    bgFill(car ? '#e6f0fb' : '#e8f3fb', car ? '#f6f9fe' : '#f4f9fe');
    T(16, 28, car ? (PHONE ? '🚗 급제동: v₀ = 20 m/s, a = −5 m/s²' : '🚗 급제동 자동차: 20 m/s(72 km/h)에서 a = −5 m/s²') : (PHONE ? '⚽ 던진 공: v₀ = +10, a = −10 (위쪽 +)' : '⚽ 위로 던진 공: v₀ = +10 m/s, a = −10 m/s² (위쪽 +)'), PHONE ? 14 : 17, '#26324a', 'left', 800);
    if (car) {
      // 도로
      ctx.fillStyle = '#7a8599'; ctx.fillRect(0, CRY + 18, VW, SH - CRY - 18); ctx.fillStyle = '#f5f7fa';
      for (let x = 12; x < VW; x += 40) ctx.fillRect(x, CRY + 34, 22, 3);
      // 눈금: 10 m마다
      for (let m = 0; m <= 40; m += 10) { const x = CX0 + m * APPM; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, CRY + 18); ctx.lineTo(x, CRY + 30); ctx.stroke(); T(x, CRY + 55, m + ' m', 13, '#fff', 'center', 800); }
      // 내 예측 깃발
      const pS = numIn('aS');
      if (pS != null && pS >= 0 && pS <= 45) {
        const x = CX0 + pS * APPM; ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, CRY - 126); ctx.lineTo(x, CRY + 18); ctx.stroke(); ctx.setLineDash([]);
        D.label(x, CRY - 138, '내 예측 ' + fnum(pS, 1) + ' m', { bg: '#7c5cff', size: 13 });
      }
      // 자동차 (차의 가운데가 위치 x)
      const x = CX0 + carX(t) * APPM, y = CRY, k = PHONE ? 1.0 : 1.4;
      if (t > 0) { ctx.strokeStyle = 'rgba(30,30,40,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(CX0, y + 16); ctx.lineTo(x - 22 * k, y + 16); ctx.stroke(); }
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      D.shadow(() => { D.roundRect(-34, -26, 70, 28, 9); const g = ctx.createLinearGradient(0, -26, 0, 2); g.addColorStop(0, '#5b8ae8'); g.addColorStop(1, '#2f55b6'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      D.roundRect(-18, -42, 38, 20, 8); ctx.fillStyle = '#9fc2f5'; ctx.fill(); ctx.strokeStyle = '#2f55b6'; ctx.lineWidth = 2; ctx.stroke();
      [-20, 20].forEach((dx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(dx, 2, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(dx, 2, 3.5, 0, TAU); ctx.fill(); });
      if (a.play || t > 0) { ctx.fillStyle = '#e2464b'; ctx.fillRect(-36, -18, 5, 8); }
      ctx.restore();
      D.label(x, y - 70 * (PHONE ? 0.85 : 1.15), carV(t).toFixed(1) + ' m/s', { bg: '#14a058', size: 13 });
      if (t >= CAR_T) D.label(x, y - 100 * (PHONE ? 0.9 : 1.2), '정지! ' + CAR_S.toFixed(1) + ' m', { bg: '#e2464b', size: 14 });
    } else {
      // 공 (세로 운동)
      const bx = PHONE ? VW * 0.42 : VW * 0.36;
      ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, BGY, VW, SH - BGY); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, BGY, VW, 3);
      for (let m = 0; m <= 6; m++) { const y = BGY - m * BPPM; ctx.strokeStyle = m === 0 ? '#516079' : 'rgba(120,135,160,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 80, y); ctx.lineTo(bx + 80, y); ctx.stroke(); T(bx - 88, y + 5, m + ' m', 13, '#3a465c', 'right', 800); }
      const pH = numIn('bH');
      if (pH != null && pH >= 0 && pH <= 7) {
        const y = BGY - pH * BPPM; ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(bx - 80, y); ctx.lineTo(bx + 120, y); ctx.stroke(); ctx.setLineDash([]);
        D.label(bx + 120, y - 14, '내 예측 ' + fnum(pH, 1) + ' m', { bg: '#7c5cff', size: 13, align: 'right' });
      }
      // 지난 자리 (0.2 s마다 고스트)
      for (let k = 0; k <= 10; k++) { const tk = 0.2 * k; if (tk > t + 1e-9) break; D.sphere(bx, BGY - ballY(tk) * BPPM - 10, 7, 'rgba(242,107,58,.35)', { gloss: false }); }
      const y = BGY - ballY(t) * BPPM - 10;
      D.sphere(bx, y, 12, '#f26b3a', { shadow: true });
      D.arrow(bx + 40, y, bx + 40, y - clamp(ballV(t) * 3.6, -45, 45), { color: '#14a058', width: 4, head: 9, label: fsg(ballV(t), 1) + ' m/s', labelOffset: -50 });
      if (Math.abs(t - BAL_T) < 0.06) D.label(bx - 52, y, '최고점', { bg: '#e2464b', size: 13 });
    }
    // 시간 막대
    const tb0 = PHONE ? 20 : 30, tb1 = VW - (PHONE ? 20 : 30), ty = 52;
    ctx.strokeStyle = 'rgba(38,50,74,.3)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tb0, ty); ctx.lineTo(tb1, ty); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(tb0, ty); ctx.lineTo(tb0 + (tb1 - tb0) * t / apEnd(), ty); ctx.stroke(); ctx.lineCap = 'butt';
    T(tb1, ty + 22, 't = ' + t.toFixed(1) + ' s', 13.5, '#26324a', 'right', 800);
    drawApplyPanel(a);
    parts.update(dt); parts.draw(ctx);
  }
  const ROWS_CAR = [0, 1, 2, 3, 4], ROWS_BALL = [0, 0.5, 1, 1.5, 2];
  function drawApplyPanel(a) {
    panel(PX, PY, PW, PH, 16);
    const car = a.sc === 'car', x0 = PX + 16, w = PW - 32, t = a.t;
    T(x0, PY + 26, car ? '📋 영상 분석 결과 (재생하면 채워져요)' : '📋 영상 분석 결과 (재생하면 채워져요)', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    const cols = [x0, x0 + w * 0.2, x0 + w * 0.45, x0 + w * 0.72];
    ['t (s)', car ? '위치 x (m)' : '높이 y (m)', '속도 v (m/s)', car ? '' : ''].forEach((h, i) => T(cols[i], PY + 52, h, 13, '#5a6679', 'left', 800));
    const rows = car ? ROWS_CAR : ROWS_BALL, rh = PHONE ? 30 : 27;
    rows.forEach((tr, i) => {
      const y = PY + 62 + i * rh, seen = a.played[a.sc] || (t > 0 && t >= tr - 1e-9);
      const xv = car ? carX(tr) : ballY(tr), vv = car ? carV(tr) : ballV(tr);
      T(cols[0], y + rh - 9, tr.toFixed(1), 14, '#26324a', 'left', 800);
      T(cols[1], y + rh - 9, seen ? fnum(xv, 1) : '?', 14, seen ? '#c0392b' : '#98a2b3', 'left', 800);
      T(cols[2], y + rh - 9, seen ? fnum(vv, 1) : '?', 14, seen ? '#0b6b39' : '#98a2b3', 'left', 800);
    });
    const ey = PY + 62 + 5 * rh + 16;
    if (car) {
      const pT = numIn('aT'), pS = numIn('aS'); const sT = pT == null ? '—' : pT.toFixed(1) + ' s', sS = pS == null ? '—' : pS.toFixed(1) + ' m';
      T(x0, ey, '내 예측: 시간 ' + sT + ' · 거리 ' + sS + (a.played.car ? '  → 영상: ' + CAR_T.toFixed(1) + ' s · ' + CAR_S.toFixed(1) + ' m' : ''), PHONE ? 13 : 14.5, '#6d4fd6', 'left', 800);
    } else {
      const pT = numIn('bT'), pH = numIn('bH'); const sT = pT == null ? '—' : pT.toFixed(1) + ' s', sH = pH == null ? '—' : pH.toFixed(1) + ' m';
      T(x0, ey, '내 예측: 시간 ' + sT + ' · 높이 ' + sH + (a.played.ball ? '  → 영상: ' + BAL_T.toFixed(1) + ' s · ' + BAL_H.toFixed(1) + ' m' : ''), PHONE ? 13 : 14.5, '#6d4fd6', 'left', 800);
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    const fl = S.flags;
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        if (n.hasAttribute('data-vt') && !fl.vt) on = false;
        if (n.hasAttribute('data-novt') && fl.vt) on = false;
        if (n.hasAttribute('data-area') && !fl.area) on = false;
        if (n.hasAttribute('data-noarea') && fl.area) on = false;
        if (n.hasAttribute('data-order') && !fl.order) on = false;
        if (n.hasAttribute('data-noorder') && fl.order) on = false;
        if (n.dataset.stage && S.md && n.dataset.stage.split(' ').indexOf(String(S.md.stage)) < 0) on = false;
        if (n.dataset.scen && S.ap && n.dataset.scen !== S.ap.sc) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const v = S.vd;
    if (v) {
      const k = frameOf(v.t);
      $('#oFrame').textContent = (k >= 0 ? k : '재생 중') + ' (t = ' + v.t.toFixed(1) + ' s)';
      const sl = $('#sFrame'); if (k >= 0 && +sl.value !== k) sl.value = k; sl.style.setProperty('--pct', (clamp(v.t / (NFR * DT), 0, 1) * 100) + '%');
      $('#frMinus').disabled = v.t <= 1e-9; $('#frPlus').disabled = v.t >= NFR * DT - 1e-9;
      $('#bPlay').textContent = v.play ? '⏸ 멈춤' : '▶ 재생';
      $('#bMark').disabled = false;
    }
    const g = S.gr;
    if (g) {
      $$('#gVidSeg button').forEach((b) => b.classList.toggle('on', b.dataset.vid === g.vid));
      const f = g.fit[g.vid];
      $('#oGv0').textContent = fnum(f.v0, 1) + ' m/s'; $('#oGa').textContent = fnum(f.a, 1) + ' m/s²';
      const s1 = $('#sGv0'), s2 = $('#sGa'); if (+s1.value !== f.v0) s1.value = f.v0; if (+s2.value !== f.a) s2.value = f.a;
      s1.style.setProperty('--pct', ((f.v0 + 2) / 14 * 100) + '%'); s2.style.setProperty('--pct', ((f.a + 12) / 18 * 100) + '%');
    }
    const m = S.md;
    if (m) {
      $$('#mStageSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.st === m.stage));
      $$('#mScenSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === m.sc));
      const sc = SCN[m.sc], st = $('#sMt'); st.max = sc.tmax; if (+st.value !== m.t) st.value = m.t; $('#oMt').textContent = m.t.toFixed(1) + ' s';
      st.style.setProperty('--pct', ((m.t - 0.5) / (sc.tmax - 0.5) * 100) + '%');
      const a0 = $('#sMv0'), a1 = $('#sMa'); if (+a0.value !== m.v0) a0.value = m.v0; if (+a1.value !== m.a) a1.value = m.a;
      $('#oMv0').textContent = m.v0.toFixed(1) + ' m/s'; $('#oMa').textContent = m.a.toFixed(1) + ' m/s²';
      a0.style.setProperty('--pct', (m.v0 / 3 * 100) + '%'); a1.style.setProperty('--pct', (m.a / 4 * 100) + '%');
    }
    const a = S.ap;
    if (a) { $$('#aScenSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === a.sc)); $('#bAPlay').textContent = a.play ? '⏸ 멈춤' : '▶ 영상 재생'; }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sFrame').addEventListener('input', (e) => { setFrame(+e.target.value); });
  $('#frMinus').addEventListener('click', () => { Sound.click(); const k = frameOf(S.vd.t); setFrame((k < 0 ? Math.floor(S.vd.t / DT) : k) - (k < 0 ? 0 : 1)); });
  $('#frPlus').addEventListener('click', () => { Sound.click(); const k = frameOf(S.vd.t); setFrame((k < 0 ? Math.ceil(S.vd.t / DT) : k + 1)); });
  $('#bPlay').addEventListener('click', togglePlay);
  $('#bMark').addEventListener('click', placeMarker);
  $('#bClear').addEventListener('click', clearMarkers);
  $$('#gVidSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); grVid(b.dataset.vid); }));
  $('#sGv0').addEventListener('input', (e) => { grSet('v0', +e.target.value); });
  $('#sGa').addEventListener('input', (e) => { grSet('a', +e.target.value); });
  $('#areaIn').addEventListener('input', () => { S.gr.area = $('#areaIn').value; $('#areaIn').classList.remove('ok', 'bad'); });
  $('#bAreaDone').addEventListener('click', () => { Sound.click(); showHint('입력했어요. ✔ 확인하기를 눌러 주세요.'); });
  $$('#mStageSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); mdSetStage(+b.dataset.st); }));
  $$('#mScenSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); mdSc(b.dataset.sc); }));
  $('#sMt').addEventListener('input', (e) => { S.md.t = +e.target.value; updateCtl(); });
  $('#sMv0').addEventListener('input', (e) => { S.md.v0 = +e.target.value; updateCtl(); });
  $('#sMa').addEventListener('input', (e) => { S.md.a = +e.target.value; updateCtl(); });
  $$('#aScenSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); apSc(b.dataset.sc); }));
  $('#bAPlay').addEventListener('click', apPlay);
  ['aT', 'aS', 'bT', 'bH'].forEach((id) => $('#' + id).addEventListener('input', (e) => { e.target.classList.remove('ok', 'bad'); }));
  $('#aFormula').addEventListener('change', (e) => { e.target.classList.remove('ok', 'bad'); Sound.click(); });

  /* 구간 평균 속도 입력 표 + 선택 (영상 분석 단계의 manual 미션) */
  const vtInputs = [];
  (function buildVt() {
    const grid = $('#vtGrid');
    for (let i = 1; i <= NFR; i++) {
      const lab = document.createElement('span'); lab.className = 'lab';
      lab.textContent = (DT * (i - 1)).toFixed(1) + '–' + (DT * i).toFixed(1) + ' s · Δx = ' + ((MEAS_CM[i] - MEAS_CM[i - 1]) / 100).toFixed(2) + ' m';
      const inp = document.createElement('input'); inp.className = 'num-in'; inp.type = 'number'; inp.step = '0.01'; inp.inputMode = 'decimal';
      inp.setAttribute('aria-label', (DT * (i - 1)).toFixed(1) + '초부터 ' + (DT * i).toFixed(1) + '초까지의 평균 속도 (미터 매 초)');
      inp.addEventListener('input', () => { S.vd.vin[i - 1] = inp.value; inp.classList.remove('ok', 'bad'); S.vd.bad[i] = undefined; });
      grid.appendChild(lab); grid.appendChild(inp); vtInputs.push(inp);
    }
    const box = $('#vtSel');
    [{ q: '마커 사이의 간격은 시간이 지날수록', o: ['점점 넓어져요', '일정해요', '점점 좁아져요'], a: 0 }, { q: '수레의 속도는 시간이 지날수록', o: ['점점 커져요', '일정해요', '점점 작아져요'], a: 0 }].forEach((q, j) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const qq = document.createElement('div'); qq.className = 'q'; qq.textContent = q.q;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', q.q);
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '고르세요'; sel.appendChild(o0);
      q.o.forEach((t, k) => { const o = document.createElement('option'); o.value = String(k); o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.vd.sel[j] = sel.value; sel.classList.remove('ok', 'bad'); S.vd.bad['s' + j] = undefined; Sound.click(); });
      row.appendChild(qq); row.appendChild(sel); box.appendChild(row); q.el = sel; q.ans = q.a;
    });
    box._qs = null;
  })();
  const VT_SEL = [$('#vtSel').querySelectorAll('select')[0], $('#vtSel').querySelectorAll('select')[1]];
  function resetVt() { vtInputs.forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); VT_SEL.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  /* 식을 이끄는 순서 선택 */
  const ordSel = [];
  (function buildOrder() {
    const box = $('#orderRows');
    ['1번째', '2번째', '3번째'].forEach((lab, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const qq = document.createElement('div'); qq.className = 'q'; qq.textContent = lab + ' 카드';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', lab + ' 카드 고르기');
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '고르세요'; sel.appendChild(o0);
      ORD.forEach((c) => { const o = document.createElement('option'); o.value = c.k; o.textContent = c.t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.md.order[i] = sel.value; S.md.orderOK[i] = undefined; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(qq); row.appendChild(sel); box.appendChild(row); ordSel.push(sel);
    });
  })();
  function resetOrder() { ordSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 캔버스 입력: 영상에서 수레(빨간 점) 누르기 ---------- */
  view.canvas.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'video' || S.flags.vt) return;
    const p = view.toLocal(e), v = S.vd, c = cartPt(xTrue(v.t));
    if (Math.hypot(p.x - c.x, p.y - c.y) < 46) placeMarker();
    else if (p.y > MY && p.y < MY + MH) showHint('수레의 빨간 점을 눌러 마커를 찍어요.');
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const m = S.mode;
    if (m === 'video') {
      const v = S.vd, k = frameOf(v.t);
      L1 = '시간 t'; a = v.t.toFixed(1) + ' s'; L2 = '마커로 읽은 위치'; b = k >= 0 && v.mk[k] ? fnum(xMeas(k), 2) + ' m' : '—'; L3 = '찍은 마커'; c = nMarks() + ' / ' + NFR;
    } else if (m === 'graph') {
      const g = S.gr, f = g.fit[g.vid];
      L1 = '기울기 a'; a = fnum(f.a, 1) + ' m/s²'; L2 = '처음 속도 v₀'; b = fnum(f.v0, 1) + ' m/s'; L3 = 'Σ(오차)²'; c = sse(g.vid, f.v0, f.a).toFixed(3);
    } else if (m === 'model') {
      const md = S.md;
      if (md.stage === 4) { L1 = '식에 넣은 v₀'; a = md.v0.toFixed(1) + ' m/s'; L2 = '식에 넣은 a'; b = md.a.toFixed(1) + ' m/s²'; L3 = '영상과 비교'; c = mdOK() ? '±0.01 m 이내 ✔' : '아직 달라요'; }
      else { const sc = SCN[md.sc]; L1 = '시간 t'; a = md.t.toFixed(1) + ' s'; L2 = '속도 v'; b = fnum(mdVel(sc.v0, sc.a, md.t), 1) + ' m/s'; L3 = '이동 거리 s'; c = fnum(mdPos(sc.v0, sc.a, md.t), 2) + ' m'; }
    } else {
      const ap = S.ap, car = ap.sc === 'car';
      L1 = '시간 t'; a = ap.t.toFixed(1) + ' s'; L2 = car ? '위치 x' : '높이 y'; b = fnum(car ? carX(ap.t) : ballY(ap.t), 1) + ' m'; L3 = '속도 v'; c = fnum(car ? carV(ap.t) : ballV(ap.t), 1) + ' m/s';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const vtList = () => [1, 2, 3, 4, 5].map((i) => fnum(VBAR(i), 2)).join(', ');
  const levels = [
    {
      title: '영상 분석: 프레임마다 위치 찍기', short: '영상 분석', icon: '🎞️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 움직이는 영상 속 물체가 일정하게 빨라지고 있는지, 영상만으로 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 다중 섬광 사진으로 낙하하는 물체의 위치가 점점 멀어지는 것을 봤어요. 이번에는 <b>비탈을 내려가는 수레 영상</b>을 ' + DT.toFixed(1) + '초 간격 프레임으로 나누어, 위치를 찍어 <b>숫자로</b> 분석해 봐요.</div>' +
        '<p>프레임마다 수레의 위치에 마커를 찍으면 <b>위치–시간 표</b>가 자동으로 만들어져요. 마커 사이의 간격으로 속도가 어떻게 변하는지 알아봐요. (직선 위의 운동만 다뤄요.)</p>',
      features: ['video'],
      setup() { resetVideo(); resetVt(); setFlag('vt', false); setScene('video'); },
      recap: '마커 간격이 점점 넓어지면 속도가 점점 커진다는 뜻이에요. 구간 평균 속도 = Δx ÷ Δt로 숫자로 나타낼 수 있어요.',
      summary: '<ul><li>동영상을 프레임(간격 ' + DT.toFixed(1) + ' s)마다 멈추고 물체의 위치를 찍으면 <b>위치–시간 표</b>를 만들 수 있어요.</li><li>마커 간격이 <b>점점 넓어지면</b> 속도가 점점 커지는 운동이에요.</li><li><b>구간 평균 속도</b> v̄ = Δx ÷ Δt. 이 수레는 ' + vtList() + ' m/s로 거의 일정하게 늘어요.</li><li>눈금 읽기에는 오차(±0.01 m)가 있어서 값이 조금씩 흩어져요.</li></ul>',
      missions: [
        {
          title: '프레임마다 마커 찍기',
          goal: '프레임 <b>1~5번</b>에서 수레의 위치에 마커를 찍어 <b>5개</b>를 모두 채우세요.',
          hint: '슬라이더나 ◀ ▶로 프레임을 고르고, 수레의 빨간 점을 누르거나 📍 마커 찍기를 눌러요.',
          setup() { resetVideo(); setFlag('vt', false); setScene('video'); },
          check: () => nMarks() === NFR,
          hold: 0.6,
          status: () => '찍은 마커 ' + nMarks() + ' / ' + NFR + ' ' + [1, 2, 3, 4, 5].map((k) => mark(S.vd.mk[k])).join(''),
          explain: '마커 사이 간격이 <b>' + [1, 2, 3, 4, 5].map((i) => fnum((MEAS_CM[i] - MEAS_CM[i - 1]) / 100, 2) + ' m').join(' → ') + '</b>로 점점 넓어졌어요. 같은 0.2 s 동안 이동한 거리가 커진다는 것은 수레가 점점 빨라진다는 뜻이에요. (이 값은 읽기 오차 ±0.01 m가 있는 측정값이에요.)',
        },
        {
          title: '구간 평균 속도 계산하기', manual: true,
          goal: '표의 각 구간에서 <b>평균 속도 = Δx ÷ 0.2 s</b>를 계산해 채우고, 간격과 속도의 변화를 고르세요. 그리고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '예) 첫 구간은 0.25 m ÷ 0.2 s. 소수 둘째 자리까지 쓰면 정확해요(첫째 자리까지만 써도 괜찮아요).',
          setup() {
            const v = S.vd; v.mk = [true, true, true, true, true, true]; v.pop = [1, 1, 1, 1, 1, 1]; v.t = NFR * DT; v.play = false; v.vOK = false; resetVt(); v.vin = ['', '', '', '', '']; v.sel = {}; v.bad = {};
            setFlag('vt', true); setScene('video');
          },
          check() {
            const v = S.vd; let bad = 0, miss = 0;
            vtInputs.forEach((inp, i) => {
              const raw = inp.value.trim();
              if (raw === '' || !isFinite(+raw)) { miss++; return; }
              const ok = Math.abs(+raw - VBAR(i + 1)) <= 0.06;
              if (!ok) { bad++; if (v.bad[i + 1] !== false) { inp.classList.remove('ok', 'bad'); void inp.offsetWidth; inp.classList.add('bad'); } } else { inp.classList.remove('bad'); inp.classList.add('ok'); }
              v.bad[i + 1] = ok;
            });
            let sbad = 0;
            VT_SEL.forEach((sel, j) => {
              if (sel.value === '') { miss++; return; }
              const ok = +sel.value === 0;
              if (!ok) { sbad++; if (v.bad['s' + j] !== false) { sel.classList.remove('ok', 'bad'); void sel.offsetWidth; sel.classList.add('bad'); } } else { sel.classList.remove('bad'); sel.classList.add('ok'); }
              v.bad['s' + j] = ok;
            });
            if (miss) return '아직 비어 있거나 고르지 않은 칸이 ' + miss + '개 있어요.';
            if (bad) return '빨간 칸을 다시 계산해 보세요. 평균 속도 = 구간의 Δx ÷ 0.2 s예요.';
            if (sbad) return '마커 간격이 어떻게 변했는지 표를 다시 보세요.';
            v.vOK = true;
            return true;
          },
          status: () => '입력한 칸 ' + vtInputs.filter((i) => i.value.trim() !== '').length + ' / 5 · 고른 문장 ' + VT_SEL.filter((s) => s.value !== '').length + ' / 2',
          explain: '구간 평균 속도는 <b>' + vtList() + ' m/s</b>예요(예: 0.25 m ÷ 0.2 s = 1.25 m/s). 간격이 넓어지는 만큼 속도가 점점 커지고 있어요. 다음 단계에서 이 값들을 그래프에 찍어 볼 거예요.',
        },
      ],
    },
    {
      title: '속도–시간 그래프: 기울기 = 가속도', short: '속도 그래프', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구간 평균 속도 ' + vtList() + ' m/s를 구했어요. 중학교에서 시간–속력 그래프의 기울기는 1초당 속력 변화라고 배웠죠. 이제 <b>방향이 있는 속도</b>로 그래프를 그려 가속도를 구해요.</div>' +
        '<p>구간 평균 속도는 그 <b>구간 한가운데 시각</b>의 속도로 보고 점을 찍어요. 점들이 놓인 직선의 <b>기울기가 가속도 a</b>(단위 m/s²)예요. 위로 던진 공 영상도 같은 방법으로 분석해요.</p>',
      features: ['graph'],
      setup() { resetGraph(false); setFlag('area', false); setScene('graph'); },
      recap: '속도–시간 그래프의 기울기가 가속도예요. 그래프 아래 넓이는 이동 거리이고, 속도가 0인 순간에도 가속도는 0이 아닐 수 있어요.',
      summary: '<ul><li>구간 평균 속도를 구간 <b>가운데 시각</b>에 점으로 찍으면 점들이 한 직선 둘레에 놓여요.</li><li><b>기울기 = 가속도</b> a = Δv ÷ Δt (단위 m/s²). 수레: v = 1.0 + 2.0t → a = 2.0 m/s², 던진 공: v = 10 − 10t → a = −10 m/s².</li><li>측정값은 오차가 있어서 점이 직선에서 조금 벗어나요. 오차의 합이 가장 작은 직선을 <b>최적 직선</b>으로 골라요.</li><li><b>그래프 아래 넓이 = 이동 거리</b>. 수레를 t = 2.0 s까지: (1.0 + 5.0) ÷ 2 × 2.0 = 6.0 m.</li><li>속도가 0이 된 최고점에서도 a = −10 m/s²는 그대로예요. 속도가 0이라고 가속도도 0은 아니에요.</li></ul>',
      missions: [
        {
          title: '두 영상의 최적 직선 찾기',
          goal: '<b>수레</b>와 <b>위로 던진 공</b> 영상 각각에서 점들에 가장 잘 맞는 직선(오차의 합이 가장 작은 직선)을 찾으세요.',
          hint: '처음 속도 v₀와 기울기 a 슬라이더를 움직여 Σ(오차)²가 가장 작아지는 곳을 찾아요. 보라색 점선이 짧아지면 잘 맞는 거예요.',
          setup() { resetGraph(false); setFlag('area', false); setScene('graph'); },
          check: () => S.gr.latch.cart && S.gr.latch.ball,
          hold: 0.6,
          status: () => mark(S.gr.latch.cart) + ' 🛒 수레 (지금 ' + (S.gr.vid === 'cart' ? 'Σ(오차)² ' + sse('cart', S.gr.fit.cart.v0, S.gr.fit.cart.a).toFixed(3) : '다른 화면') + ') &nbsp; ' + mark(S.gr.latch.ball) + ' ⚽ 공',
          explain: '수레는 <b>v = ' + FIT.cart.v0.toFixed(1) + ' + ' + FIT.cart.a.toFixed(1) + 't</b>일 때 오차 제곱합이 ' + sse('cart', FIT.cart.v0, FIT.cart.a).toFixed(3) + '로 가장 작아요 → <b>a = ' + FIT.cart.a.toFixed(1) + ' m/s²</b>. 공은 점들이 정확히 한 직선 위에 있어서 <b>v = ' + FIT.ball.v0 + ' ' + MINUS + ' ' + Math.abs(FIT.ball.a) + 't</b>, <b>a = ' + MINUS + Math.abs(FIT.ball.a) + ' m/s²</b>예요. 위로 올라갈 때나 내려올 때나 가속도는 똑같아요.',
        },
        {
          title: '그래프 아래 넓이로 거리 구하기', manual: true,
          goal: '수레의 직선 아래 넓이(밑변 ' + AREA_T.toFixed(1) + ' s)를 구해 t = 0부터 ' + AREA_T.toFixed(1) + ' s까지의 <b>이동 거리</b>를 입력하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사다리꼴 넓이 = (윗변 + 아랫변) × 높이 ÷ 2. 윗변 v₀ = ' + V0.toFixed(1) + ', 아랫변 v = ' + AREA_V.toFixed(1) + ', 높이는 시간 ' + AREA_T.toFixed(1) + ' s예요.',
          setup() { resetGraph(true); S.gr.vid = 'cart'; setFlag('area', true); const e = $('#areaIn'); e.value = ''; e.classList.remove('ok', 'bad'); setScene('graph'); },
          check() {
            const raw = $('#areaIn').value.trim();
            if (raw === '' || !isFinite(+raw)) return '이동 거리(m)를 숫자로 입력해 주세요.';
            const val = +raw;
            if (Math.abs(val - AREA_S) <= 0.05) return true;
            if (Math.abs(val - (V0 + AREA_V) * AREA_T) <= 0.05) return '사다리꼴 넓이는 (윗변 + 아랫변) × 높이에서 2로 나누어야 해요.';
            return '넓이를 다시 계산해 보세요. 사다리꼴: (' + V0.toFixed(1) + ' + ' + AREA_V.toFixed(1) + ') × ' + AREA_T.toFixed(1) + ' ÷ 2.';
          },
          status: () => '입력한 값 ' + ($('#areaIn').value.trim() === '' ? '—' : $('#areaIn').value + ' m'),
          explain: '넓이 = (' + V0.toFixed(1) + ' + ' + AREA_V.toFixed(1) + ') ÷ 2 × ' + AREA_T.toFixed(1) + ' = <b>' + AREA_S.toFixed(1) + ' m</b>. 그래프 아래 넓이의 단위는 (m/s) × s = m라서 이동 거리가 돼요.',
        },
        {
          type: 'quiz', title: '최고점에서의 가속도',
          goal: '위로 던진 공이 최고점에 올랐을 때 순간 속도는 0이에요. 이때 공의 가속도는?',
          setup() { resetGraph(true); S.gr.vid = 'ball'; setFlag('area', false); setScene('graph'); },
          choices: ['0 m/s² (속도가 0이니까)', '−10 m/s² 그대로', '+10 m/s²로 바뀐다', '알 수 없다'],
          answer: 1,
          feedback: ['속도가 0인 것은 한 순간일 뿐이에요. 직선의 기울기는 그 점에서도 −10 m/s²예요.', '', '가속도는 위로 올라갈 때나 내려올 때나 아래쪽(−)으로 같아요.', '그래프의 기울기가 일정하니까 어느 순간에도 알 수 있어요.'],
          explain: '속도–시간 그래프는 기울기가 일정한 직선이에요. 최고점에서 v = 0이지만 직선의 기울기는 그대로 <b>−10 m/s²</b>예요. 속도가 0이라고 가속도가 0인 것은 아니에요.',
        },
      ],
    },
    {
      title: '운동 식 이끌기와 검증', short: '운동 식', icon: '🧮', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 그래프의 기울기가 가속도이고, 넓이가 이동 거리라는 것을 확인했어요. 이 두 가지 읽기에서 <b>세 가지 운동 식</b>이 바로 나와요.</div>' +
        '<p>그래프에서 식을 하나씩 이끌고, 수레 영상의 위치와 비교해서 식이 맞는지 확인해요. 가속도가 일정한 직선 운동에서만 쓸 수 있는 식이에요.</p>',
      features: ['model'],
      setup() { resetModel(); resetOrder(); setFlag('order', false); setScene('model'); },
      recap: '기울기에서 v = v₀ + at, 넓이에서 s = v₀t + ½at², t를 없애면 2as = v² − v₀²가 나와요. 식으로 예측한 위치는 영상과 오차 범위 안에서 맞아요.',
      summary: '<ul><li>① 기울기 = 가속도 → <b>v = v₀ + at</b></li><li>② 그래프 아래 넓이 = 이동 거리 → <b>s = v₀t + ½at²</b> (직사각형 v₀t + 삼각형 ½·t·at)</li><li>①에서 t = (v − v₀) ÷ a를 ②에 넣어 t를 없애면 → <b>2as = v² − v₀²</b> (시간을 모를 때 편해요)</li><li>수레 v₀ = 1.0 m/s, a = 2.0 m/s²: t = 2.0 s에서 v = 5.0 m/s, s = 6.0 m.</li><li>감속하면 a의 부호가 <b>−</b>예요. 속도와 가속도의 방향이 반대라는 뜻이에요.</li><li>식과 영상의 차이가 눈금 읽기 오차(±0.01 m) 정도이면 식이 맞다고 볼 수 있어요.</li></ul>',
      missions: [
        {
          title: '식을 이끄는 순서 정하기', manual: true,
          goal: '세 식을 이끄는 카드를 <b>순서대로</b> 골라 보세요. (먼저 ① → ② 단계를 눌러 그래프에서 확인해 봐도 좋아요.)',
          hint: '기울기(A)와 넓이(B)에서 두 식이 먼저 나와야, 그 두 식에서 t를 없앨 수 있어요(C).',
          setup() { resetModel(); resetOrder(); setFlag('order', true); setScene('model'); },
          check() {
            const o = S.md.order, miss = o.filter((x) => x === '').length;
            if (miss) return '아직 고르지 않은 카드가 ' + miss + '개 있어요.';
            if (new Set(o).size < 3) return '같은 카드를 두 번 골랐어요. 세 카드를 한 번씩 써요.';
            const ok = [o[0] !== 'C', o[1] !== 'C', o[2] === 'C'];
            ok.forEach((v, i) => { const sel = ordSel[i]; if (!v && S.md.orderOK[i] !== false) { sel.classList.remove('ok', 'bad'); void sel.offsetWidth; sel.classList.add('bad'); } if (v) { sel.classList.remove('bad'); sel.classList.add('ok'); } S.md.orderOK[i] = v; });
            if (!ok.every(Boolean)) return 't를 없애는 C는 앞의 두 식이 있어야 하니까 맨 마지막에 와야 해요.';
            return true;
          },
          status: () => '고른 카드 ' + S.md.order.filter((x) => x !== '').length + ' / 3',
          explain: '기울기에서 <b>v = v₀ + at</b>, 넓이에서 <b>s = v₀t + ½at²</b>(A와 B는 순서가 바뀌어도 돼요)를 얻은 뒤, 두 식에서 t를 없애면 <b>2as = v² − v₀²</b>가 나와요.',
        },
        {
          title: '식으로 예측한 위치를 영상에 맞추기',
          goal: '④ 검증 화면에서 <b>v₀와 a</b>를 맞춰, 식으로 예측한 위치(고리)가 영상에서 읽은 위치(핀)와 <b>±0.01 m 이내</b>로 겹치게 하세요.',
          hint: '앞 단계에서 구한 최적 직선의 값을 쓰면 돼요. v₀는 그래프의 절편, a는 기울기예요.',
          setup() { resetModel(); S.md.stage = 4; setFlag('order', false); setScene('model'); },
          check: () => S.md.stage === 4 && mdOK(),
          hold: 0.8,
          status: () => (S.md.stage === 4 ? '식에 넣은 값 v₀ = ' + S.md.v0.toFixed(1) + ', a = ' + S.md.a.toFixed(1) + ' → ' + (mdOK() ? '모든 프레임 ±0.01 m 이내 ✅' : '아직 ±0.01 m보다 큰 차이가 있어요 ⬜') : '④ 검증 단계를 눌러요 ⬜'),
          explain: 'v₀ = ' + V0.toFixed(1) + ' m/s, a = ' + A0.toFixed(1) + ' m/s²를 s = v₀t + ½at²에 넣으면 ' + [1, 2, 3, 4, 5].map((k) => fnum(xTrue(DT * k), 2)).join(', ') + ' m가 나와요. 영상에서 읽은 ' + [1, 2, 3, 4, 5].map((k) => fnum(xMeas(k), 2)).join(', ') + ' m와 최대 0.01 m 차이예요. 이 정도 차이는 눈금 읽기 오차와 프레임 간격 같은 측정 한계로 설명돼요.',
        },
        {
          type: 'quiz', title: 'a의 부호가 −인 까닭',
          goal: '브레이크를 밟은 자동차(v₀ = +6.0 m/s, a = −2.0 m/s²)에서 <b>a가 음수</b>인 것은 무엇을 뜻할까요?',
          setup() { S.md.stage = 1; S.md.sc = 'brake'; S.md.t = 1.0; setFlag('order', false); setScene('model'); },
          choices: ['속력이 줄어드는 감속 운동으로, 가속도 방향이 속도 방향과 반대라는 뜻이에요', '자동차가 뒤로 움직이고 있다는 뜻이에요', '자동차가 멈춰 있다는 뜻이에요', '속도가 음수가 된다는 뜻이에요'],
          answer: 0,
          feedback: ['', '자동차는 여전히 앞(+)으로 가고 있어요. a의 부호는 속도의 변화 방향을 나타내요.', '멈춰 있으면 v = 0이고 a는 따로 정해져요. a < 0이라고 멈춘 것은 아니에요.', '처음에는 v가 +6.0 m/s이고 시간이 지나며 줄어들어 3.0 s에 0이 돼요. 그 뒤는 반대 방향으로 가는 거예요.'],
          explain: '속도는 +방향인데 가속도가 −이면 <b>속도가 점점 줄어요</b>(v = 6.0 − 2.0t → 3.0 s에 정지, s = 9.0 m). 가속도의 방향이 속도와 같으면 빨라지고, 반대이면 느려져요.',
        },
      ],
    },
    {
      title: '계산과 예측: 급제동과 공 던지기', short: '적용', icon: '🚗', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 영상과 맞는 세 가지 운동 식을 이끌었어요. 이제 <b>영상을 보기 전에 식으로 먼저 예측</b>하고, 영상을 재생해 예측과 비교해 봐요.</div>' +
        '<p>급제동하는 자동차는 얼마 만에, 얼마나 가서 멈출까요? 위로 던진 공은 언제, 얼마나 높이 올라갈까요? 위쪽(또는 앞쪽)을 +로 정하고 식을 써서 계산해 봐요. 가속도의 원인(힘)은 다음 차시에서 다뤄요.</p>',
      features: ['apply'],
      setup() { resetApply(); setScene('apply'); },
      recap: '운동 식으로 시간과 거리를 미리 예측하고, 영상과 비교해 확인했어요. 예측과 실제가 조금 다르다면 마찰, 공기 저항, 측정 오차를 따져 봐요.',
      summary: '<ul><li><b>급제동</b>: v₀ = 20 m/s, a = −5 m/s² → 정지 시간 t = (0 − 20) ÷ (−5) = 4 s, 정지 거리 2as = v² − v₀² → s = 400 ÷ 10 = 40 m.</li><li><b>위로 던진 공</b>(위쪽 +): v₀ = +10 m/s, a = −10 m/s² → 최고점(v = 0)까지 t = 1.0 s, 높이 H = 100 ÷ 20 = 5 m, 2.0 s에 출발점으로 돌아오고 속도는 −10 m/s.</li><li>모르는 값이 시간이면 v = v₀ + at와 s = v₀t + ½at², 시간이 없으면 2as = v² − v₀²를 골라 써요.</li><li>예상과 측정이 다른 까닭: 마찰, 공기 저항, 프레임 간격, 눈금 읽기 오차.</li></ul>',
      missions: [
        {
          title: '급제동 자동차 예측하기', manual: true,
          goal: '자동차(v₀ = ' + CAR.v0 + ' m/s, a = ' + MINUS + Math.abs(CAR.a) + ' m/s²)가 <b>멈출 때까지 걸리는 시간</b>과 <b>정지 거리</b>를 식으로 예측해 입력하고, <b>▶ 영상 재생</b>으로 확인한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '정지하면 v = 0이에요. v = v₀ + at로 시간을, 시간을 몰라도 쓸 수 있는 2as = v² − v₀²로 거리를 구해요.',
          setup() { resetApply(); S.ap.sc = 'car'; setScene('apply'); updateCtl(); },
          check() {
            const f = $('#aFormula'), tI = $('#aT'), sI = $('#aS'), a = S.ap;
            const t = numIn('aT'), s = numIn('aS');
            if (f.value === '' || t == null || s == null) return '식을 고르고, 시간과 거리를 모두 입력해 주세요.';
            const okF = +f.value === 2, okT = Math.abs(t - CAR_T) <= 0.05, okS = Math.abs(s - CAR_S) <= 0.5;
            [[f, okF], [tI, okT], [sI, okS]].forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
            if (!okF) return '시간을 몰라도 속도와 거리의 관계를 바로 주는 식은 어느 것일까요? v² − v₀²가 들어간 식이에요.';
            if (!okT) return '정지하면 v = 0이에요. 0 = ' + CAR.v0 + ' + (' + MINUS + Math.abs(CAR.a) + ')t에서 t를 구해 보세요.';
            if (!okS) return '2as = v² − v₀²에서 v = 0, v₀ = ' + CAR.v0 + ', a = ' + MINUS + Math.abs(CAR.a) + '를 넣어 s를 구해 보세요.';
            if (!a.played.car) return '▶ 영상 재생으로 예측이 영상과 맞는지 확인해 주세요.';
            return true;
          },
          status: () => '예측 ' + (numIn('aT') != null && numIn('aS') != null ? '입력함' : '아직') + ' · 영상 확인 ' + mark(S.ap.played.car),
          explain: '정지할 때 v = 0이므로 t = (0 − ' + CAR.v0 + ') ÷ (' + MINUS + Math.abs(CAR.a) + ') = <b>' + CAR_T + ' s</b>, 2as = v² − v₀² → s = (0 − ' + CAR.v0 * CAR.v0 + ') ÷ (2 × ' + MINUS + Math.abs(CAR.a) + ') = <b>' + CAR_S + ' m</b>. 영상의 마지막 프레임도 ' + CAR_S + ' m예요. 실제 도로에서는 노면 마찰과 브레이크 상태에 따라 조금 달라질 수 있어요.',
        },
        {
          title: '위로 던진 공 예측하기', manual: true,
          goal: '공(위쪽 +, v₀ = +' + BAL.v0 + ' m/s, a = ' + MINUS + Math.abs(BAL.a) + ' m/s²)이 <b>최고점까지 걸리는 시간</b>과 <b>최고점의 높이</b>를 예측해 입력하고, <b>▶ 영상 재생</b>으로 확인한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '최고점에서는 v = 0이에요. 시간은 v = v₀ + at로, 높이는 2as = v² − v₀²로 구해요.',
          setup() { resetApply(); S.ap.sc = 'ball'; setScene('apply'); updateCtl(); },
          check() {
            const tI = $('#bT'), hI = $('#bH'), a = S.ap, t = numIn('bT'), h = numIn('bH');
            if (t == null || h == null) return '시간과 높이를 모두 입력해 주세요.';
            const okT = Math.abs(t - BAL_T) <= 0.05, okH = Math.abs(h - BAL_H) <= 0.1;
            [[tI, okT], [hI, okH]].forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
            if (!okT) return '최고점에서 v = 0이에요. 0 = ' + BAL.v0 + ' + (' + MINUS + Math.abs(BAL.a) + ')t에서 t를 구해 보세요.';
            if (!okH) return '2as = v² − v₀²에서 v = 0이에요. 올라간 높이 s를 구해 보세요.';
            if (!a.played.ball) return '▶ 영상 재생으로 예측이 영상과 맞는지 확인해 주세요.';
            return true;
          },
          status: () => '예측 ' + (numIn('bT') != null && numIn('bH') != null ? '입력함' : '아직') + ' · 영상 확인 ' + mark(S.ap.played.ball),
          explain: 't = (0 − ' + BAL.v0 + ') ÷ (' + MINUS + Math.abs(BAL.a) + ') = <b>' + BAL_T.toFixed(1) + ' s</b>, H = (0 − ' + BAL.v0 * BAL.v0 + ') ÷ (2 × ' + MINUS + Math.abs(BAL.a) + ') = <b>' + BAL_H + ' m</b>. 올라간 시간과 내려오는 시간이 같아서 2.0 s에 출발점으로 돌아오고 그때 속도는 −' + BAL.v0 + ' m/s예요.',
        },
        {
          type: 'quiz', title: '예상과 측정이 다를 때',
          goal: '실제 도로 실험에서 같은 조건(20 m/s, a = −5 m/s²)으로 측정한 정지 거리가 예측한 40 m보다 조금 짧은 38 m였어요. 가능한 까닭으로 가장 알맞은 것은?',
          setup() { setScene('apply'); },
          choices: ['운동 식이 완전히 틀렸다는 증거예요', '실제 가속도가 −5 m/s²보다 조금 컸거나(마찰), 위치 측정에 오차가 있었기 때문일 수 있어요', '측정값이 예측과 달라서는 안 되고, 다르면 실험이 무효예요', '가속도가 일정하지 않으면 거리가 언제나 짧아져요'],
          answer: 1,
          feedback: ['식은 이상적인 조건(일정한 가속도)에서 세운 모형이에요. 작은 차이가 곧 식이 틀렸다는 뜻은 아니에요.', '', '작은 차이는 늘 있어요. 차이가 나는 까닭을 찾는 것이 실험 보고서의 중요한 부분이에요.', '가속도가 변하면 거리가 길어질 수도 짧아질 수도 있어요. 이 경우는 가속도 크기가 달랐을 가능성이 높아요.'],
          explain: '예상 값과 측정 값의 차이는 <b>마찰의 크기(가속도의 차이), 공기 저항, 프레임 간격, 눈금 읽기 오차</b> 같은 까닭으로 생겨요. 예) a = −5.26 m/s²이면 s = 400 ÷ 10.5 ≈ 38 m예요. 차이가 크게 나면 가정(일정한 가속도)을 다시 점검해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-equal-accel', mount: '#game', badge: '영상 분석가', homeHref: '../../index.html#hp',
    featureLabels: { video: '🎞️ 동영상 · 마커 · 위치–시간 표', graph: '📈 속도–시간 그래프 · 최적 직선', model: '🧮 운동 식 유도 · 영상과 비교', apply: '🚗 급제동 · 공 던지기 예측' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetVideo(); resetGraph(false); resetModel(); resetApply();
  setScene('video');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    switch (S.mode) {
      case 'video': stepVideo(dt); drawVideo(dt); break;
      case 'graph': stepGraph(dt); drawGraph(dt); break;
      case 'model': stepModel(dt); drawModel(dt); break;
      default: stepApply(dt); drawApply(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFrame, placeMarker, togglePlay, grSet, grVid, mdSetStage, mdSc, mdOK, apSc, apPlay, setFlag, resetVideo, resetGraph, resetModel, resetApply,
    cartPt, xTrue, VBAR, sse, PTS, FIT, AREA_S, CAR_T, CAR_S, BAL_T, BAL_H, MEAS_CM, TMID, BV, MY, MH,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      const fn = { video: stepVideo, graph: stepGraph, model: stepModel, apply: stepApply }[S.mode];
      for (let i = 0; i < n; i++) fn(0.02);
    },
  };
})();
