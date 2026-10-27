/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 힘의 합성과 운동 예측 (1차시)
   성취기준 [12역학01-01] 물체에 작용하는 여러 가지 힘의 합력을 구하여 물체의 운동을 정량적으로 예측할 수 있다.
   ① 관찰: 합력 구하기 (두 힘의 평행사변형 합성, 성분의 합, 사이각에 따른 합력)
   ② 탐구: 성분 분해 (줄로 비스듬히 끌기: F cosθ, F sinθ, N = mg - F sinθ, f = μN, a)
   ③ 분석: 경사면과 장력 (mg sinθ, mg cosθ, a = g(sinθ - μcosθ), 두 줄의 장력 2T sinθ = mg)
   ④ 예측: 운동 예측 (합력 -> 가속도 -> 속도·위치, 예측과 시뮬레이션 비교)
   힘은 2차원 평면 위의 힘만 다루고 3차원·회전·공기 저항·관성력은 다루지 않아요. g = 10 m/s².
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const SH = PHONE ? 340 : 330;                         // 장면(위쪽) 높이
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;   // 아래쪽 자료 패널
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MINUS = '−';
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };
  const r2 = (x) => Math.round(x * 100 + 1e-9) / 100;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;

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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
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
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  /* 물리 벡터(y가 위쪽)를 화면에 화살표로: 시작점, 성분, 배율 */
  function vec(ox, oy, vx, vy, k, o) { return D.arrow(ox, oy, ox + vx * k, oy - vy * k, o); }
  /* 라벨을 [x0, x1] 범위 안에 두기 (정렬: center | left | right) */
  function labIn(x, y, str, o, x0, x1) {
    ctx.save(); ctx.font = D.font(Math.max(13, o.size || 13), 800); const w = ctx.measureText(str).width + 16; ctx.restore();
    const al = o.align || 'center';
    let lx = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
    lx = Math.max(x0, Math.min(x1 - w, lx));
    return D.label(al === 'left' ? lx : al === 'right' ? lx + w : lx + w / 2, y, str, Object.assign({}, o, { align: al }));
  }
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }

  /* ================= 상수 (글과 코드가 같은 값을 써요) ================= */
  const G = 10;
  const M_PUCK = 2.0;                                 // ① 퍽의 질량 (kg)
  const REC_PHI = [0, 60, 90, 120, 180];              // ① 기록할 사이각
  const PL = { m: 2.0, F: 10, mu: 0.2 };              // ② 줄로 끌기
  const SLM = 5.0;                                    // ③ 경사면 상자의 질량 (kg)
  const SLIDE_L = 6.0, SLIDE_S0 = 0.7, SLOPE_M = 8;   // 미끄러지는 거리, 처음 위치, 경사면 길이 (m)
  const ROPE_W = 60, ROPE_LIMIT = 100;                // ③ 줄에 매단 무게, 줄의 한계 장력 (N)
  const ROPE_ANG = [10, 30, 60, 90];
  const PA = { m: 0.20, v0: 2.0, F: 0.40, T: 1.5 };   // ④ A 에어 하키 퍽
  const PB = { m: 5.0, th: 30, mu: 0.2, T: 2.0 };     //    B 경사면 상자
  const PC = { F: 400, ang: 60, m: 1000, T: 4.0 };    //    C 보트

  /* ---------- 물리 계산 ---------- */
  function comb(F1, F2, phi) {
    const c = Math.cos(phi * RAD), s = Math.sin(phi * RAD);
    const Rx = F1 + F2 * c, Ry = F2 * s, R = Math.hypot(Rx, Ry);
    return { Rx, Ry, R, alpha: R > 1e-9 ? Math.atan2(Ry, Rx) / RAD : 0, a: R / M_PUCK };
  }
  function pullCalc(th) {
    const c = Math.cos(th * RAD), s = Math.sin(th * RAD);
    const fxv = PL.F * c, fyv = PL.F * s, N = PL.m * G - fyv, f = PL.mu * N, a = (fxv - f) / PL.m;
    return { fx: fxv, fy: fyv, N, f, a };
  }
  function slopeCalc(th, mu) {
    const s = Math.sin(th * RAD), c = Math.cos(th * RAD), mg = SLM * G;
    const par = mg * s, N = mg * c, fk = mu * N, slides = Math.tan(th * RAD) > mu + 1e-9;
    return { mg, par, N, fk, slides, f: slides ? fk : par, a: slides ? (par - fk) / SLM : 0 };
  }
  const ropeT = (th) => ROPE_W / (2 * Math.sin(th * RAD));
  const PULL_A2 = []; for (let t = 0; t <= 60; t++) PULL_A2.push(r2(pullCalc(t).a));
  const PULL_BEST = Math.max.apply(null, PULL_A2);
  const BEST_TH = PULL_A2.map((v, i) => (v >= PULL_BEST - 1e-9 ? i : -1)).filter((i) => i >= 0);
  const BEST_LO = BEST_TH[0], BEST_HI = BEST_TH[BEST_TH.length - 1];
  const PEAK_DEG = Math.atan(PL.mu) / RAD;           // tanθ = μ 인 각 (약 11.3°)
  const AA = PA.F / PA.m;                            // 2.0 m/s²
  const BCALC = slopeCalc(PB.th, PB.mu);
  const B_V = BCALC.a * PB.T, B_D = 0.5 * BCALC.a * PB.T * PB.T;
  const C_R = 2 * PC.F * Math.cos(PC.ang / 2 * RAD), C_A = C_R / PC.m;
  const TRUE = { Ay: 0.5 * AA * 1, Av: Math.hypot(PA.v0, AA * 1), Bv: B_V, Bd: B_D, CR: C_R };
  const TOL = { Ay: 0.1, Av: 0.1, Bv: 0.25, Bd: 0.25, CR: 8 };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'combine', clock: 0, fade: 0,
    cb: { F1: 3, F2: 4, phi: 90, rec: {}, tr: 0 },
    dc: { F1: 3, F2: 4, phi: 90 },
    pu: { th: 0, tr: 0, vis: new Set([0]), found: false, hide: false, d: 0, calc: {} },
    sl: { th: 30, mu: 0.2, st: 'idle', t: 0, s: 0, last: null },
    rp: { th: 60, rec: {}, dth: 60 },
    pr: { sc: 'A', pred: { Ay: '', Av: '', Bv: '', Bd: '', CR: '' }, st: 'idle', t: 0, done: { A: false, B: false, C: false }, okp: {} },
    flags: { rec: false, calc: false, spred: false, lock: false, ppred: false },
  };
  let game = null;
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const eff = (k) => (game && game.free ? (k === 'rec') : S.flags[k]);

  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (S.sl.st === 'run') slReset(); if (S.pr.st === 'run') prReset(); }
    S.mode = mode;
    updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= ① 합력 ================= */
  const DW = PHONE ? 300 : 545;
  const IX = DW + 8, IW = VW - IX - 8;
  const REC_ANG = REC_PHI;
  function setCombine(F1, F2, phi, quiet) {
    const c = S.cb;
    if (c.F1 === F1 && c.F2 === F2 && c.phi === phi) return;
    c.F1 = F1; c.F2 = F2; c.phi = phi; c.tr = 0; updateCtl();
  }
  function drawCombine(dt) {
    const c = S.cb, d = S.dc, k = PHONE ? 8 : 15, ox = PHONE ? 104 : 190, oy = SH - (PHONE ? 70 : 84);
    d.F1 = approach(d.F1, c.F1, dt, 12); d.F2 = approach(d.F2, c.F2, dt, 12); d.phi = approach(d.phi, c.phi, dt, 12);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, PHONE ? '🧭 퍽(2.0 kg)에 작용하는 두 힘' : '🧭 마찰 없는 바닥 위의 퍽(' + M_PUCK.toFixed(1) + ' kg)에 두 힘이 작용해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 장면 카드
    D.roundRect(8, 44, DW - 16, SH - 56, 14); ctx.fillStyle = '#f7f9fe'; ctx.fill(); ctx.strokeStyle = '#d6deec'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(8, 44, DW - 16, SH - 56); ctx.clip();
    ctx.strokeStyle = 'rgba(120,135,160,.18)'; ctx.lineWidth = 1;
    for (let gx = ox % (5 * k); gx < DW; gx += 5 * k) { ctx.beginPath(); ctx.moveTo(gx, 44); ctx.lineTo(gx, SH - 12); ctx.stroke(); }
    for (let gy = oy % (5 * k); gy < SH; gy += 5 * k) { ctx.beginPath(); ctx.moveTo(8, gy); ctx.lineTo(DW - 8, gy); ctx.stroke(); }
    ctx.restore();
    T(DW - 18, SH - 22, '한 칸 = 5 N', 13, '#7b879c', 'right', 800);
    const ph = d.phi * RAD, cp = Math.cos(ph), sp = Math.sin(ph);
    const t1 = { x: d.F1, y: 0 }, t2 = { x: d.F2 * cp, y: d.F2 * sp }, tr = { x: t1.x + t2.x, y: t1.y + t2.y };
    // 평행사변형 보조선
    if (d.F1 > 0.05 && d.F2 > 0.05) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(80,95,125,.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox + t1.x * k, oy - t1.y * k); ctx.lineTo(ox + tr.x * k, oy - tr.y * k); ctx.moveTo(ox + t2.x * k, oy - t2.y * k); ctx.lineTo(ox + tr.x * k, oy - tr.y * k); ctx.stroke(); ctx.restore();
    }
    // 사이각 호
    if (d.F1 > 0.05 && d.F2 > 0.05 && d.phi > 1) {
      const rr = PHONE ? 24 : 36;
      ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox, oy, rr, -ph, 0); ctx.stroke();
      const mx = ox + (rr + 15) * Math.cos(ph / 2), my = oy - (rr + 15) * Math.sin(ph / 2);
      if (c.phi >= 25) T(mx, my + 4, 'φ = ' + c.phi + '°', 13, '#6d3fd6', 'center', 800, { stroke: 'rgba(247,249,254,.9)', strokeWidth: 4 });
    }
    // 힘 화살표 (길이는 힘에 비례: 1 N = k px)
    const res = comb(c.F1, c.F2, c.phi);
    if (res.R > 0.05 && Math.hypot(tr.x, tr.y) > 0.05) vec(ox, oy, tr.x, tr.y, k, { color: '#e2464b', width: 7, head: 16 });
    if (d.F1 > 0.05) vec(ox, oy, t1.x, t1.y, k, { color: '#3867f4', width: 5, head: 13 });
    if (d.F2 > 0.05) vec(ox, oy, t2.x, t2.y, k, { color: '#14a058', width: 5, head: 13 });
    // 퍽
    D.sphere(ox, oy, PHONE ? 11 : 15, '#7c8aa5', { shadow: true, outline: '#4a5670' });
    // 이름표 (화살표 끝 바깥쪽에 놓아 서로 겹치지 않게)
    if (c.F1 > 0) D.label(ox + t1.x * k, oy + 26, 'F₁ = ' + c.F1 + ' N', { bg: '#3867f4', size: 13, align: 'center' });
    if (c.F2 > 0) {
      const ux = -sp, uy = cp, ex = ox + t2.x * k + ux * 52, ey = oy - t2.y * k - uy * 18;   // F₂ 방향을 반시계로 90° 돌린 쪽
      D.label(clamp(ex, 70, DW - 70), clamp(ey, 62, SH - 34), 'F₂ = ' + c.F2 + ' N', { bg: '#14a058', size: 13, align: 'center' });
    }
    if (res.R > 0.05) {
      const ra = res.alpha * RAD, ex = ox + tr.x * k + Math.cos(ra) * 56, ey = oy - tr.y * k - Math.sin(ra) * 22;
      D.label(clamp(ex, 70, DW - 70), clamp(ey, 62, SH - 34), 'R = ' + res.R.toFixed(1) + ' N', { bg: '#e2464b', size: 13.5, align: 'center' });
    } else if (c.F1 > 0 || c.F2 > 0) D.label(ox + 60, oy - 50, '합력 R = 0 → 가속도 0', { bg: '#5a6679', size: 13, align: 'left' });
    drawInset(res);
    drawCombinePanel(res);
  }
  /* 위에서 본 바닥: 합력 방향으로 가속하는 퍽의 위치 */
  function drawInset(res) {
    const c = S.cb, bx = IX, by = 44, bw = IW, bh = SH - 56;
    D.roundRect(bx, by, bw, bh, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d6deec'; ctx.lineWidth = 1.5; ctx.stroke();
    T(bx + bw / 2, by + 20, '위에서 본 바닥 (1칸 = 1 m)', 13, '#26324a', 'center', 800);
    const sc = PHONE ? 14 : 21, cx = bx + bw / 2, cy = by + bh / 2 + 12;
    ctx.save(); ctx.beginPath(); D.roundRect(bx + 2, by + 30, bw - 4, bh - 34, 10); ctx.clip();
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    for (let g = -6; g <= 6; g++) { ctx.beginPath(); ctx.moveTo(cx + g * sc, by + 30); ctx.lineTo(cx + g * sc, by + bh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx, cy + g * sc); ctx.lineTo(bx + bw, cy + g * sc); ctx.stroke(); }
    // 시간 진행 (1초 가속 + 잠시 멈춤)
    const tt = Math.min(c.tr, 1.0), ux = res.R > 1e-9 ? res.Rx / res.R : 0, uy = res.R > 1e-9 ? res.Ry / res.R : 0;
    const aVec = { x: res.Rx / M_PUCK, y: res.Ry / M_PUCK };
    const px = 0.5 * aVec.x * tt * tt, py = 0.5 * aVec.y * tt * tt;
    ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + px * sc, cy - py * sc); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 1; i * 0.2 <= tt + 1e-9; i++) { const q = i * 0.2; ctx.fillStyle = 'rgba(124,138,165,.35)'; ctx.beginPath(); ctx.arc(cx + 0.5 * aVec.x * q * q * sc, cy - 0.5 * aVec.y * q * q * sc, PHONE ? 6 : 8, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#98a2b3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, PHONE ? 6 : 8, 0, TAU); ctx.stroke();
    D.sphere(cx + px * sc, cy - py * sc, PHONE ? 8 : 10, '#7c8aa5', { shadow: true, outline: '#4a5670' });
    const vx = aVec.x * tt, vy = aVec.y * tt;
    if (Math.hypot(vx, vy) > 0.3) vec(cx + px * sc, cy - py * sc, vx, vy, PHONE ? 4 : 6, { color: '#14a058', width: 3.5, head: 9 });
    ctx.restore();
    const sp = Math.hypot(vx, vy);
    D.label(bx + bw / 2, by + bh - 18, res.R > 0.05 ? 't = ' + tt.toFixed(1) + ' s · v = ' + sp.toFixed(1) + ' m/s' : '합력이 0이면 움직이지 않아요', { bg: '#26324a', size: 13 });
  }
  function drawCombinePanel(res) {
    panel(PX, PY, PW, PH, 16);
    const c = S.cb;
    const x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 24;
    T(x0, y0, '성분으로 더하기 (F₁ 방향이 x축)', fs, '#6d3fd6', 'left', 800);
    lines(x0, y0 + lh, lh, fs, [
      ['Rx = F₁ + F₂cosφ = ' + fx(res.Rx, 1) + ' N'],
      ['Ry = F₂sinφ = ' + fx(res.Ry, 1) + ' N'],
      ['R = √(Rx² + Ry²) = ' + res.R.toFixed(1) + ' N', '#c2410c'],
      ['방향: F₁에서 ' + (res.R > 0.05 ? res.alpha.toFixed(1) + '°' : '—') + ' (tanα = Ry / Rx)'],
      ['가속도 a = R / m = ' + res.a.toFixed(1) + ' m/s²  (m = ' + M_PUCK.toFixed(1) + ' kg)', '#0b6b39'],
    ]);
    // 표: 크기가 같은 두 힘
    const tx = PHONE ? PX + 8 : PX + 420, ty = PHONE ? PY + 12 + 6 * lh + 6 : PY + 8, tw = PHONE ? PW - 16 : PW - 428, th = PHONE ? PH - 6 * lh - 26 : PH - 16;
    D.roundRect(tx, ty, tw, th, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    T(tx + 10, ty + 20, '📋 F₁ = F₂ = 10 N일 때 합력', 13.5, '#26324a', 'left', 800);
    const cw = (tw - 20) / 3, rh = Math.min(26, (th - 62) / 5), hy = ty + 44;
    ['사이각 φ', '기록한 R', '2F cos(φ/2)'].forEach((h, i) => T(tx + 12 + cw * i, hy, h, 13, '#5a6679', 'left', 800));
    REC_ANG.forEach((p, i) => {
      const y = hy + (i + 1) * rh, got = c.rec[p] != null;
      T(tx + 12, y, p + '°', 14, '#26324a', 'left', 800);
      T(tx + 12 + cw, y, got ? c.rec[p].toFixed(1) + ' N' : '—', 14, got ? '#c2410c' : '#98a2b3', 'left', 800);
      T(tx + 12 + cw * 2, y, got ? (2 * 10 * Math.cos(p / 2 * RAD)).toFixed(1) + ' N' : '', 14, '#0b6b39', 'left', 800);
    });
  }

  /* ================= ② 줄로 끌기: 성분 분해 ================= */
  function setPullTh(th) { const p = S.pu; p.th = th; p.vis.add(th); p.tr = 0; p.d = 0; if (th === 37) { /* 계산 미션용 */ } updateCtl(); }
  const FBD_X = PHONE ? 238 : 430;
  function fbdCard(title) {
    const bx = FBD_X, bw = VW - bx - 8;
    D.roundRect(bx, 44, bw, SH - 56, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d6deec'; ctx.lineWidth = 1.5; ctx.stroke();
    T(bx + bw / 2, 64, title, 13, '#26324a', 'center', 800);
    return { bx, bw, cx: bx + bw / 2 };
  }
  function drawPull(dt) {
    const p = S.pu, th = p.th, cal = pullCalc(th);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, PHONE ? '📦 줄로 비스듬히 끌기' : '📦 상자(' + PL.m.toFixed(1) + ' kg)를 줄로 비스듬히 끌어요 (F = ' + PL.F + ' N)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 시간 진행: 1.6초 가속 후 멈춤
    p.tr += dt; if (p.tr > 2.3) { p.tr = 0; p.d = 0; }
    const tt = Math.min(p.tr, 1.6), v = Math.max(0, cal.a) * tt;
    p.d = 0.5 * Math.max(0, cal.a) * tt * tt;
    const ppm = PHONE ? 22 : 36, fy = PHONE ? 250 : 250, bxc = PHONE ? 84 : 150, bw = PHONE ? 62 : 84, bh = PHONE ? 44 : 60;
    // 바닥 (눈금이 뒤로 흘러가요)
    D.roundRect(8, fy, FBD_X - 16, 14, 4); ctx.fillStyle = '#c3ccd8'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(8, fy, FBD_X - 16, 40); ctx.clip();
    const off = (p.d * ppm) % (ppm);
    for (let i = -1; i < (FBD_X) / ppm + 2; i++) { const x = i * ppm - off + 8; ctx.fillStyle = '#7f8ba0'; ctx.fillRect(x, fy, 2.5, 22); }
    ctx.restore();
    T(16, fy + 36, '바닥의 눈금 간격 = 1 m', 13, '#5a6679', 'left', 800);
    // 상자
    D.shadow(() => { D.roundRect(bxc - bw / 2, fy - bh, bw, bh, 8); const g = ctx.createLinearGradient(0, fy - bh, 0, fy); g.addColorStop(0, '#ffb070'); g.addColorStop(1, '#e2552a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#a63c14'; ctx.lineWidth = 2; D.roundRect(bxc - bw / 2, fy - bh, bw, bh, 8); ctx.stroke();
    T(bxc, fy - bh / 2 + 5, PL.m.toFixed(1) + ' kg', 14, '#fff', 'center', 800);
    // 줄과 손
    const rl = PHONE ? 78 : 118, hx = bxc + bw / 2 + rl * Math.cos(th * RAD), hy = fy - bh / 2 - rl * Math.sin(th * RAD);
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bxc + bw / 2, fy - bh / 2); ctx.lineTo(hx, hy); ctx.stroke();
    D.sphere(hx, hy, 11, '#f2c9a0', { shadow: true, outline: '#a0764a' });
    ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bxc + bw / 2, fy - bh / 2); ctx.lineTo(bxc + bw / 2 + rl * 0.7, fy - bh / 2); ctx.stroke(); ctx.setLineDash([]);
    if (th > 0) { ctx.beginPath(); ctx.arc(bxc + bw / 2, fy - bh / 2, rl * 0.45, -th * RAD, 0); ctx.stroke(); T(bxc + bw / 2 + rl * 0.62, fy - bh / 2 - 6 - (th > 20 ? 0 : 0), 'θ = ' + th + '°', 13, '#6d3fd6', 'left', 800); }
    if (v > 0.05) D.label(bxc, fy - bh - 26, 'v = ' + v.toFixed(1) + ' m/s', { bg: '#14a058', size: 13 });
    // 자유물체도
    const f = fbdCard('자유물체도 (1 N = ' + (PHONE ? 4 : 5.5) + ' px)'), k = PHONE ? 4 : 5.5, cx = f.cx, cy = SH - (PHONE ? 126 : 132);
    const aShow = cal.a;
    // 성분 분해 (점선)
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(80,95,125,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + cal.fx * k, cy); ctx.lineTo(cx + cal.fx * k, cy - cal.fy * k); ctx.stroke(); ctx.restore();
    const gap = PHONE ? 4 : 5;
    vec(cx, cy, 0, -PL.m * G, k, { color: '#5a6679', width: 5, head: 12 });                   // mg
    vec(cx, cy, 0, cal.N, k, { color: '#3867f4', width: 5, head: 12 });                       // N
    if (cal.f > 0.02) vec(cx, cy, -cal.f, 0, k, { color: '#f59e0b', width: 5, head: 11 });    // f
    if (cal.fx > 0.05) vec(cx, cy + gap * 0, cal.fx, 0, k, { color: '#f472b6', width: 4, head: 10 });   // Fx
    if (cal.fy > 0.05) vec(cx, cy, 0, cal.fy, k, { color: '#f472b6', width: 4, head: 10, dash: [6, 4] });  // Fy (점선)
    vec(cx, cy, cal.fx, cal.fy, k, { color: '#e2464b', width: 5, head: 13 });                // F
    D.sphere(cx, cy, 7, '#7c8aa5', { gloss: false, outline: '#3a465c' });
    const lab = (x, y, s, bg, al) => labIn(x, y, s, { bg, size: 13, align: al || 'center' }, f.bx + 4, VW - 12);
    lab(cx + 10, cy + PL.m * G * k * 0.7, 'mg = ' + (PL.m * G).toFixed(1) + ' N', '#5a6679', 'left');
    lab(cx + 10, cy - cal.N * k + 2, 'N = ' + cal.N.toFixed(1) + ' N', '#3867f4', 'left');
    if (cal.f > 0.02) lab(cx - cal.f * k - 6, cy + 24, 'f = ' + cal.f.toFixed(1) + ' N', '#d97706', 'right');
    lab(cx + cal.fx * k + 10, cy - cal.fy * k - 24, 'F = ' + PL.F + ' N', '#e2464b', 'left');
    if (cal.fx > 0.05) lab(cx + cal.fx * k - 4, cy + 20, 'Fx', '#db2777', 'center');
    if (cal.fy > 0.3) lab(cx + cal.fx * k + 24, cy - cal.fy * k / 2, 'Fy', '#db2777', 'left');
    drawPullPanel(cal, aShow);
  }
  function drawPullPanel(cal) {
    panel(PX, PY, PW, PH, 16);
    const p = S.pu, hide = p.hide;
    const x0 = PX + 14, lh = PHONE ? 24 : 28, fs = PHONE ? 13 : 14.5, y0 = PY + 26;
    const q = (s) => (hide ? '?' : s);
    lines(x0, y0, lh, fs, [
      ['수평 성분 Fx = F cosθ = ' + q(cal.fx.toFixed(1) + ' N')],
      ['수직 성분 Fy = F sinθ = ' + q(cal.fy.toFixed(1) + ' N')],
      ['수직항력 N = mg − Fy = ' + q(cal.N.toFixed(1) + ' N'), '#1d4ed8'],
      ['마찰력 f = μN = ' + q(cal.f.toFixed(1) + ' N'), '#b45309'],
      ['가속도 a = (Fx − f) / m = ' + q(cal.a.toFixed(2) + ' m/s²'), '#0b6b39'],
    ]);
    const rc = PHONE ? { x: PX + 8, y: PY + 5 * lh + 36, w: PW - 16, h: PH - 5 * lh - 44 } : { x: PX + 400, y: PY + 8, w: PW - 408, h: PH - 16 };
    const ax = axes(rc, { xmin: 0, xmax: 60, xstep: 10, ymin: 1, ymax: 3.4, ystep: 0.4, yd: 1, title: '가속도 a – 각도 θ', right: p.found ? '봉우리 θ ≈ ' + PEAK_DEG.toFixed(0) + '°' : '' });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.ix, ax.iy, ax.iw, ax.ih); ctx.clip();
    if (p.found || (game && game.free)) {
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath();
      for (let t = 0; t <= 60; t++) { const X = ax.gx(t), Y = ax.gy(pullCalc(t).a); if (t) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    }
    p.vis.forEach((t) => D.sphere(ax.gx(t), ax.gy(pullCalc(t).a), 4.5, '#3867f4', { gloss: false, outline: '#fff', outlineWidth: 1 }));
    const cur = pullCalc(p.th); D.sphere(ax.gx(p.th), ax.gy(cur.a), 7, '#e2464b', { gloss: false, outline: '#fff', outlineWidth: 2 });
    ctx.restore();
    T(ax.ix + ax.iw, ax.iy + ax.ih - 6, 'θ (°)', 13, '#3a465c', 'right', 800);
    if (!hide) D.label(ax.gx(p.th) < ax.ix + ax.iw * 0.6 ? ax.gx(p.th) + 10 : ax.gx(p.th) - 10, clamp(ax.gy(cur.a) - 20, ax.iy + 10, ax.iy + ax.ih - 10), 'a = ' + cur.a.toFixed(2), { bg: '#e2464b', size: 13, align: ax.gx(p.th) < ax.ix + ax.iw * 0.6 ? 'left' : 'right' });
  }
  /* 작은 그래프 틀 */
  function axes(rc, o) {
    const ml = PHONE ? 38 : 42, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      ctx.strokeStyle = Math.abs(yv - o.ymin) < 1e-9 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = Math.abs(yv - o.ymin) < 1e-9 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, o.yd != null ? yv.toFixed(o.yd) : String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    if (o.right) T(rc.x + rc.w - 8, rc.y + 21, o.right, 13.5, '#c2410c', 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }

  /* ================= ③ 경사면 ================= */
  function slReset() { const s = S.sl; s.st = 'idle'; s.t = 0; s.s = 0; updateCtl(); }
  function slRun() {
    const s = S.sl; if (s.st === 'run') return;
    s.st = 'run'; s.t = 0; s.s = 0; Sound.click(); updateCtl();
  }
  function slStep(dt) {
    const s = S.sl; if (s.st !== 'run') return;
    const c = slopeCalc(s.th, s.mu);
    s.t += dt / (RM ? 0.3 : 1);
    s.s = 0.5 * c.a * s.t * s.t;
    if (s.s >= SLIDE_L || s.t >= 4 || (!c.slides && s.t >= 1.5)) {
      if (s.s > SLIDE_L) s.s = SLIDE_L;
      s.st = 'done'; s.last = { th: s.th, mu: s.mu, a: c.a, slides: c.slides };
      Sound.success(); updateCtl();
    }
  }
  const SL = PHONE ? { bx: 232, by: 300, LR: 200 } : { bx: 345, by: 298, LR: 320 };
  function drawSlope(dt) {
    const s = S.sl, c = slopeCalc(s.th, s.mu), th = s.th * RAD;
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, PHONE ? '⛰️ 경사면의 상자(5.0 kg)' : '⛰️ 경사면 위의 상자(' + SLM.toFixed(1) + ' kg)를 놓아요 (g = 10 m/s²)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const { bx, by, LR } = SL, pps = LR / SLOPE_M, cs = Math.cos(th), sn = Math.sin(th);
    const tx = bx - LR * cs, ty = by - LR * sn;
    // 경사면
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.lineTo(tx, by); ctx.closePath(); const g = ctx.createLinearGradient(0, ty, 0, by); g.addColorStop(0, '#d6c3a4'); g.addColorStop(1, '#bfa77f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 12, by); ctx.lineTo(bx + 24, by); ctx.stroke();
    // 각도 호
    ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bx, by, PHONE ? 36 : 56, Math.PI, Math.PI + th); ctx.stroke();
    T(bx - (PHONE ? 62 : 96), by - 8, 'θ = ' + s.th + '°', 13, '#6d3fd6', 'left', 800, { stroke: '#e9f0fb', strokeWidth: 4 });
    // 거리 눈금 (경사면을 따라 1 m)
    for (let m = 0; m <= SLOPE_M; m++) { const px = tx + m * pps * cs, py = ty + m * pps * sn; ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - sn * 6, py + cs * 6); ctx.stroke(); }
    // 상자
    const bsz = PHONE ? 22 : 32, sPos = SLIDE_S0 + s.s;
    const cxp = tx + sPos * pps * cs + sn * bsz / 2, cyp = ty + sPos * pps * sn - cs * bsz / 2;
    ctx.save(); ctx.translate(cxp, cyp); ctx.rotate(th);
    D.shadow(() => { D.roundRect(-bsz * 0.8, -bsz / 2, bsz * 1.6, bsz, 5); const g = ctx.createLinearGradient(0, -bsz / 2, 0, bsz / 2); g.addColorStop(0, '#ffb070'); g.addColorStop(1, '#e2552a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#a63c14'; ctx.lineWidth = 2; D.roundRect(-bsz * 0.8, -bsz / 2, bsz * 1.6, bsz, 5); ctx.stroke();
    ctx.restore();
    if (s.st === 'run' || s.st === 'done') {
      const v = c.a * s.t;
      if (c.slides) D.label(clamp(cxp, 60, SL.bx), cyp - bsz - 14, 'v = ' + v.toFixed(1) + ' m/s', { bg: '#14a058', size: 13 });
      else if (s.t > 0.2) D.label(clamp(cxp, 70, SL.bx), cyp - bsz - 14, '미끄러지지 않아요', { bg: '#5a6679', size: 13 });
    }
    // 자유물체도
    const f = fbdCard('자유물체도 (1 N = ' + (PHONE ? 1.7 : 2.6) + ' px)'), k = PHONE ? 1.7 : 2.6, cx = f.cx + (PHONE ? -14 : 0), cy = SH - (PHONE ? 140 : 160);
    const e = { x: cs, y: -sn }, nrm = { x: sn, y: cs };              // 물리 좌표(y 위): 아래쪽 비탈 방향 e, 면에 수직 바깥 nrm
    const mg = c.mg;
    // mg 점선 보조선
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(80,95,125,.7)'; ctx.lineWidth = 2;
    const tipE = { x: cx + e.x * c.par * k, y: cy - e.y * c.par * k }, tipN = { x: cx - nrm.x * c.N * k, y: cy + nrm.y * c.N * k };
    const tipG = { x: cx, y: cy + mg * k };
    ctx.beginPath(); ctx.moveTo(tipE.x, tipE.y); ctx.lineTo(tipG.x, tipG.y); ctx.moveTo(tipN.x, tipN.y); ctx.lineTo(tipG.x, tipG.y); ctx.stroke(); ctx.restore();
    vec(cx, cy, nrm.x * c.N, nrm.y * c.N, k, { color: '#3867f4', width: 5, head: 12 });     // N
    if (c.f > 0.02) vec(cx, cy, -e.x * c.f, -e.y * c.f, k, { color: '#f59e0b', width: 5, head: 11 });   // f (비탈 위쪽)
    vec(cx, cy, e.x * c.par, e.y * c.par, k, { color: '#f472b6', width: 4, head: 10 });       // mg sinθ
    vec(cx, cy, -nrm.x * c.N, -nrm.y * c.N, k, { color: '#f472b6', width: 4, head: 10, dash: [6, 4] });  // mg cosθ
    vec(cx, cy, 0, -mg, k, { color: '#5a6679', width: 5, head: 12 });                         // mg
    D.sphere(cx, cy, 6, '#7c8aa5', { gloss: false, outline: '#3a465c' });
    const lab = (x, y, str, bg, al) => labIn(x, y, str, { bg, size: 13, align: al || 'center' }, f.bx + 4, VW - 12);
    lab(cx + 8, Math.min(SH - 22, cy + mg * k + 12), 'mg = ' + mg.toFixed(0) + ' N', '#5a6679', 'left');
    lab(cx + nrm.x * c.N * k + 10, cy - nrm.y * c.N * k - 4, 'N = ' + c.N.toFixed(1) + ' N', '#3867f4', 'left');
    if (c.f > 0.02) lab(cx - e.x * c.f * k - 6, cy - e.y * c.f * k - 18, 'f = ' + c.f.toFixed(1) + ' N', '#d97706', 'right');
    lab(tipE.x + 8, tipE.y + 12, 'mg sinθ', '#db2777', 'left');
    lab(tipN.x - 8, tipN.y + 12, 'mg cosθ', '#db2777', 'right');
    drawSlopePanel(c, s);
  }
  function drawSlopePanel(c, s) {
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    lines(x0, y0, lh, fs, [
      ['비탈 방향 성분 mg sinθ = ' + c.par.toFixed(1) + ' N'],
      ['수직 성분 mg cosθ = N = ' + c.N.toFixed(1) + ' N', '#1d4ed8'],
      [c.slides ? '마찰력 f = μN = ' + c.fk.toFixed(1) + ' N' : '마찰력 f = mg sinθ = ' + c.par.toFixed(1) + ' N (최대 μN = ' + c.fk.toFixed(1) + ' N)', '#b45309'],
      ['가속도 a = g(sinθ − μcosθ) = ' + c.a.toFixed(1) + ' m/s²', '#0b6b39'],
    ]);
    const cond = 'tanθ = ' + Math.tan(s.th * RAD).toFixed(2) + (c.slides ? ' > ' : ' ≤ ') + 'μ = ' + s.mu.toFixed(1);
    const bx = PHONE ? x0 : x0, by = y0 + 4 * lh - 6;
    D.label(bx, by + 10, cond + (c.slides ? ' → 미끄러져요' : ' → 미끄러지지 않아요'), { bg: c.slides ? '#e2552a' : '#14a058', size: 13.5, align: 'left' });
    // 미끄러진 거리 / 속력 막대
    const rc = PHONE ? { x: PX + 8, y: by + 30, w: PW - 16, h: PH - (by + 30 - PY) - 8 } : { x: PX + 440, y: PY + 8, w: PW - 448, h: PH - 16 };
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    T(rc.x + 10, rc.y + 21, '📋 놓은 결과', 13.5, '#26324a', 'left', 800);
    const L = s.last;
    if (!L) T(rc.x + 10, rc.y + 50, '▶ 놓기를 눌러요', 14, '#98a2b3', 'left', 800);
    else {
      T(rc.x + 10, rc.y + 48, L.th + '°, μ = ' + L.mu.toFixed(1) + ' → ' + (L.slides ? '미끄러져요' : '정지'), 14, '#26324a', 'left', 800);
      T(rc.x + 10, rc.y + 48 + (PHONE ? 22 : 28), '측정한 a = ' + L.a.toFixed(1) + ' m/s²', 14.5, '#0b6b39', 'left', 800);
    }
  }

  /* ================= ③ 두 줄의 장력 ================= */
  function rpRecord() {
    const r = S.rp; r.rec[r.th] = ropeT(r.th); Sound.click(); updateCtl();
  }
  function drawRope(dt) {
    const r = S.rp; r.dth = approach(r.dth, r.th, dt, 12);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, PHONE ? '🧵 두 줄에 매단 물체 (60 N)' : '🧵 무게 ' + ROPE_W + ' N(6.0 kg)의 물체를 같은 줄 두 개로 매달았어요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const th = r.dth * RAD, L = PHONE ? 140 : 168, cx = PHONE ? 240 : 400, cy0 = 86, hx = cx, hy = cy0 + L * Math.sin(th);
    const T0 = ropeT(r.th), over = T0 > ROPE_LIMIT, col = over ? '#e2464b' : '#14a058';
    // 천장
    D.roundRect(PHONE ? 20 : 60, cy0 - 14, VW - (PHONE ? 40 : 120), 14, 4); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    const ax1 = cx - L * Math.cos(th), ax2 = cx + L * Math.cos(th);
    [ax1, ax2].forEach((ax) => { ctx.fillStyle = '#5a6679'; ctx.beginPath(); ctx.arc(ax, cy0, 6, 0, TAU); ctx.fill(); });
    const off = r.th >= 90 ? 5 : 0;
    ctx.strokeStyle = over ? '#e2464b' : '#4b5563'; ctx.lineWidth = over ? 4 : 3;
    ctx.beginPath(); ctx.moveTo(ax1, cy0); ctx.lineTo(hx - off, hy); ctx.moveTo(ax2, cy0); ctx.lineTo(hx + off, hy); ctx.stroke();
    // 물체
    const bw = 54, bh = 42, by0 = hy + 36;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, by0); ctx.stroke();
    D.shadow(() => { D.roundRect(hx - bw / 2, by0, bw, bh, 8); const g = ctx.createLinearGradient(0, by0, 0, by0 + bh); g.addColorStop(0, '#6b8de0'); g.addColorStop(1, '#3a5cb8'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#2547a3'; ctx.lineWidth = 2; D.roundRect(hx - bw / 2, by0, bw, bh, 8); ctx.stroke();
    T(hx, by0 + 26, '6.0 kg', 14, '#fff', 'center', 800);
    // 장력 센서 (두 줄의 천장 쪽 끝)
    [[-1, ax1], [1, ax2]].forEach(([side, ax]) => {
      const w = 96, hh = 28, y = cy0 + 14, x = r.th >= 80 ? (side < 0 ? cx - w - 14 : cx + 14) : (side < 0 ? ax - w - 4 : ax + 4);
      D.roundRect(x, y, w, hh, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
      T(x + w / 2, y + 19, 'T = ' + T0.toFixed(1) + ' N', 13, over ? '#fca5a5' : '#9ae6b4', 'center', 800);
    });
    // 힘 화살표 (1 N = kT px)
    const kT = PHONE ? 0.5 : 0.62;
    D.arrow(hx, hy, hx - T0 * kT * Math.cos(th), hy - T0 * kT * Math.sin(th), { color: col, width: 5, head: 12 });
    D.arrow(hx, hy, hx + T0 * kT * Math.cos(th), hy - T0 * kT * Math.sin(th), { color: col, width: 5, head: 12 });
    D.arrow(hx, hy, hx, hy + ROPE_W * kT, { color: '#5a6679', width: 5, head: 12 });
    D.label(hx + 12, hy + ROPE_W * kT * 0.5 + 2, 'W = 60 N', { bg: '#5a6679', size: 13, align: 'left' });
    // 수직 성분 점선 (T sinθ 둘의 합 = W)
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(80,95,125,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx - T0 * kT * Math.cos(th), hy - T0 * kT * Math.sin(th)); ctx.lineTo(hx - T0 * kT * Math.cos(th), hy); ctx.moveTo(hx + T0 * kT * Math.cos(th), hy - T0 * kT * Math.sin(th)); ctx.lineTo(hx + T0 * kT * Math.cos(th), hy); ctx.stroke(); ctx.restore();
    // 각도 표시
    ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy, 46, -Math.PI, -Math.PI + th); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 46, -th, 0); ctx.stroke();
    T(hx - 52, hy + 22, 'θ = ' + r.th + '°', 13.5, '#6d3fd6', 'right', 800);
    if (over) D.label(VW - 14, 28, '한계 장력 ' + ROPE_LIMIT + ' N 초과! 줄이 끊어질 수 있어요', { bg: '#e2464b', size: 13, align: 'right' });
    else D.label(VW - 14, 28, '줄의 한계 장력 ' + ROPE_LIMIT + ' N', { bg: '#5a6679', size: 13, align: 'right' });
    drawRopePanel(T0);
  }
  function drawRopePanel(T0) {
    panel(PX, PY, PW, PH, 16);
    const r = S.rp, x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    lines(x0, y0, lh, fs, [
      ['위 방향 힘: 2 × T sinθ', '#26324a'],
      ['수직 평형: 2T sinθ = W = 60 N', '#26324a'],
      ['T = W / (2 sinθ) = ' + T0.toFixed(1) + ' N', '#c2410c'],
      [r.th >= 90 ? 'θ = 90°: 두 줄이 위로 똑바로 → T = W / 2' : 'θ가 작을수록(수평에 가까울수록) T가 커져요', '#0b6b39'],
    ]);
    const tx = PHONE ? PX + 8 : PX + 430, ty = PHONE ? PY + 5 * lh + 14 : PY + 8, tw = PHONE ? PW - 16 : PW - 438, th = PHONE ? PH - 5 * lh - 22 : PH - 16;
    D.roundRect(tx, ty, tw, th, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    T(tx + 10, ty + 20, '📋 장력 센서 기록', 13.5, '#26324a', 'left', 800);
    const cw = (tw - 20) / 3, rh = Math.min(26, (th - 52) / 4), hy = ty + 42;
    ['각도 θ', '장력 T', 'T / W'].forEach((h, i) => T(tx + 12 + cw * i, hy, h, 13, '#5a6679', 'left', 800));
    ROPE_ANG.forEach((a, i) => {
      const y = hy + (i + 1) * rh, got = r.rec[a] != null;
      T(tx + 12, y, a + '°', 14, '#26324a', 'left', 800);
      T(tx + 12 + cw, y, got ? r.rec[a].toFixed(1) + ' N' : '—', 14, got ? (r.rec[a] > ROPE_LIMIT ? '#e2464b' : '#c2410c') : '#98a2b3', 'left', 800);
      T(tx + 12 + cw * 2, y, got ? (r.rec[a] / ROPE_W).toFixed(2) + '배' : '', 14, '#0b6b39', 'left', 800);
    });
  }

  /* ================= ④ 운동 예측 ================= */
  function prReset() { const p = S.pr; p.st = 'idle'; p.t = 0; updateCtl(); }
  function prRun() { const p = S.pr; if (p.st === 'run') return; p.st = 'run'; p.t = 0; parts.clear(); Sound.click(); updateCtl(); }
  const prT = () => ({ A: PA.T, B: PB.T, C: PC.T }[S.pr.sc]);
  function prStep(dt) {
    const p = S.pr; if (p.st !== 'run') return;
    p.t = Math.min(prT(), p.t + dt / (RM ? 0.3 : 1));
    if (p.t >= prT() - 1e-9) {
      p.st = 'done'; p.done[p.sc] = true; Sound.success();
      const c = prCenter(); parts.burst(c.x, c.y, { count: 14, speed: 120, size: 3, colors: ['#14a058', '#ffd447', '#fff'], gravity: 140, life: 0.7 });
      updateCtl();
    }
  }
  function prCenter() { return { x: VW / 2, y: SH / 2 }; }
  const predNum = (k) => { const v = parseFloat(S.pr.pred[k]); return isFinite(v) ? v : null; };
  function drawPredict(dt) {
    const p = S.pr;
    bgFill('#e9f0fb', '#f6f9fe');
    const t = p.st === 'idle' ? 0 : p.t;
    if (p.sc === 'A') drawPA(t); else if (p.sc === 'B') drawPB(t); else drawPC(t);
    parts.update(dt); parts.draw(ctx);
    drawPredictPanel(t);
  }
  function drawPA(t) {
    T(16, 28, PHONE ? '🏒 옆바람을 받는 퍽 (0.20 kg)' : '🏒 에어 하키 퍽(0.20 kg)이 +x 방향으로 2.0 m/s로 미끄러지는데 옆바람(+y, 0.40 N)이 불어요', PHONE ? 14 : 16, '#26324a', 'left', 800);
    const sc = PHONE ? 52 : 100, ox = PHONE ? 40 : 60, oy = SH - 40;
    D.roundRect(8, 44, VW - 16, SH - 56, 14); ctx.fillStyle = '#f7f9fe'; ctx.fill(); ctx.strokeStyle = '#d6deec'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(8, 44, VW - 16, SH - 56); ctx.clip();
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    for (let g = 0; g <= 8; g++) { ctx.beginPath(); ctx.moveTo(ox + g * sc, 44); ctx.lineTo(ox + g * sc, SH - 12); ctx.stroke(); }
    for (let g = 0; g <= 6; g++) { ctx.beginPath(); ctx.moveTo(8, oy - g * sc); ctx.lineTo(VW - 8, oy - g * sc); ctx.stroke(); }
    ctx.restore();
    T(ox + 3 * sc + 6, oy + 24 - 14, '1칸 = 1 m', 13, '#7b879c', 'left', 800);
    // 예측 점선 (내가 입력한 y)
    const yp = predNum('Ay');
    if (yp != null && yp >= 0) {
      ctx.save(); ctx.setLineDash([3, 6]); ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= 30; i++) { const q = PA.T * i / 30, X = ox + PA.v0 * q * sc, Y = oy - yp * q * q * sc; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox + PA.v0 * sc, oy - yp * sc, 9, 0, TAU); ctx.stroke();
      labIn(ox + PA.v0 * sc + 16, oy - yp * sc + 26, '내 예측 (t = 1 s)', { bg: '#8a5cf6', size: 13, align: 'left' }, 12, VW - 12);
    }
    // 실제 궤적
    const pos = (q) => ({ x: PA.v0 * q, y: 0.5 * AA * q * q });
    if (t > 0) {
      ctx.strokeStyle = 'rgba(226,70,75,.6)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const q = t * i / 40, P = pos(q); if (i) ctx.lineTo(ox + P.x * sc, oy - P.y * sc); else ctx.moveTo(ox + P.x * sc, oy - P.y * sc); } ctx.stroke();
      for (let i = 0; i * 0.25 <= t + 1e-9; i++) { const P = pos(i * 0.25); ctx.fillStyle = 'rgba(124,138,165,.4)'; ctx.beginPath(); ctx.arc(ox + P.x * sc, oy - P.y * sc, 9, 0, TAU); ctx.fill(); }
    }
    const P = pos(t), px = ox + P.x * sc, py = oy - P.y * sc;
    if (t >= 1) { ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox + 2 * sc, oy - 1 * sc, 13, 0, TAU); ctx.stroke(); labIn(ox + 2 * sc - 20, oy - 1 * sc - 4, '실제 t = 1 s: (2.0, 1.0) m', { bg: '#14a058', size: 13, align: 'right' }, 12, VW - 12); }
    D.sphere(px, py, 11, '#7c8aa5', { shadow: true, outline: '#4a5670' });
    const vx = PA.v0, vy = AA * t;
    D.arrow(px, py, px + vx * (PHONE ? 16 : 24), py, { color: '#3867f4', width: 4, head: 10 });
    if (vy > 0.05) D.arrow(px, py, px, py - vy * (PHONE ? 16 : 24), { color: '#3867f4', width: 4, head: 10, dash: [6, 4] });
    D.arrow(px - 6, py, px - 6, py - 0.4 * (PHONE ? 70 : 100), { color: '#e2464b', width: 5, head: 11 });
    D.label(px - 14, py - 0.4 * (PHONE ? 70 : 100) - 14, '바람 0.40 N', { bg: '#e2464b', size: 13, align: 'right' });
    D.label(VW - 16, 60, 't = ' + t.toFixed(1) + ' s', { bg: '#26324a', size: 13.5, align: 'right' });
    if (!PHONE) {
      const cx0 = VW - 226, cy0 = 84;
      D.roundRect(cx0, cy0, 210, 84, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = '#d6deec'; ctx.lineWidth = 1.5; ctx.stroke();
      T(cx0 + 10, cy0 + 22, 'vx = ' + PA.v0.toFixed(1) + ' m/s (일정)', 13.5, '#1d4ed8', 'left', 800);
      T(cx0 + 10, cy0 + 44, 'vy = ' + (AA * t).toFixed(1) + ' m/s (a = 2.0)', 13.5, '#1d4ed8', 'left', 800);
      T(cx0 + 10, cy0 + 66, '속력 = ' + Math.hypot(PA.v0, AA * t).toFixed(1) + ' m/s', 13.5, '#0b6b39', 'left', 800);
    }
  }
  const BR = PHONE ? { bx: 410, by: 296, LR: 360 } : { bx: 560, by: 298, LR: 460 };
  function drawPB(t) {
    T(16, 28, PHONE ? '⛰️ 경사면에서 놓은 상자 (5.0 kg)' : '⛰️ 30° 경사면(μ = 0.2)에서 5.0 kg 상자를 가만히 놓아요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const th = PB.th * RAD, cs = Math.cos(th), sn = Math.sin(th), { bx, by, LR } = BR, pps = LR / 10;
    const tx = bx - LR * cs, ty = by - LR * sn;
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.lineTo(tx, by); ctx.closePath(); const g = ctx.createLinearGradient(0, ty, 0, by); g.addColorStop(0, '#d6c3a4'); g.addColorStop(1, '#bfa77f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 10, by); ctx.lineTo(bx + 20, by); ctx.stroke();
    for (let m = 0; m <= 10; m++) { const px = tx + m * pps * cs, py = ty + m * pps * sn; ctx.strokeStyle = '#7a6340'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - sn * 6, py + cs * 6); ctx.stroke(); if (m % 2 === 0) T(px - sn * 22, py + cs * 22 + 4, m + ' m', 13, '#5a6679', 'center', 800); }
    const bsz = PHONE ? 20 : 28, s0 = 0.5;
    const boxAt = (sPos, alpha, dash, col) => {
      const cxp = tx + sPos * pps * cs + sn * bsz / 2, cyp = ty + sPos * pps * sn - cs * bsz / 2;
      ctx.save(); ctx.translate(cxp, cyp); ctx.rotate(th); ctx.globalAlpha = alpha;
      if (dash) { ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 3; D.roundRect(-bsz * 0.8, -bsz / 2, bsz * 1.6, bsz, 5); ctx.stroke(); }
      else { D.shadow(() => { D.roundRect(-bsz * 0.8, -bsz / 2, bsz * 1.6, bsz, 5); const g = ctx.createLinearGradient(0, -bsz / 2, 0, bsz / 2); g.addColorStop(0, '#ffb070'); g.addColorStop(1, '#e2552a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#a63c14'; ctx.lineWidth = 2; D.roundRect(-bsz * 0.8, -bsz / 2, bsz * 1.6, bsz, 5); ctx.stroke(); }
      ctx.restore();
      return { x: cxp, y: cyp };
    };
    const dp = predNum('Bd');
    if (dp != null && dp >= 0 && s0 + dp <= 9.6) { const q = boxAt(s0 + dp, 1, true, '#8a5cf6'); D.label(q.x - sn * 46, q.y + cs * 46, '내 예측 (2 s)', { bg: '#8a5cf6', size: 13, align: 'center' }); }
    const d = 0.5 * BCALC.a * t * t;
    const q = boxAt(s0 + d, 1, false);
    if (t >= PB.T - 1e-9) D.label(VW - 16, 92, '실제 2.0 s: v = ' + B_V.toFixed(1) + ' m/s, 이동 ' + B_D.toFixed(1) + ' m', { bg: '#14a058', size: 13, align: 'right' });
    D.label(VW - 16, 60, 't = ' + t.toFixed(1) + ' s', { bg: '#26324a', size: 13.5, align: 'right' });
    if (t > 0.05) D.label(q.x - 6, q.y - bsz - 12, 'v = ' + (BCALC.a * t).toFixed(1) + ' m/s', { bg: '#14a058', size: 13, align: 'right' });
  }
  function drawPC(t) {
    T(16, 28, PHONE ? '🚤 두 견인선으로 끄는 보트' : '🚤 두 견인선이 사이각 60°로 보트(1000 kg)를 끌어요 (각 400 N)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const cx = PHONE ? 130 : 220, cy = 190, k = PHONE ? 0.2 : 0.28;
    // 물 (무늬가 뒤로 흘러가요)
    const d = 0.5 * C_A * t * t, ppm = PHONE ? 30 : 40;
    D.roundRect(8, 44, VW - 16, SH - 56, 14); ctx.fillStyle = '#cfe6fb'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(8, 44, VW - 16, SH - 56); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    for (let i = -1; i < VW / 70 + 2; i++) for (let j = 0; j < 4; j++) { const x = ((i * 70 + j * 23 - d * ppm) % (VW + 70) + VW + 70) % (VW + 70) - 35, y = 80 + j * 62; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 6, x + 20, y); ctx.stroke(); }
    ctx.restore();
    const ang = PC.ang / 2 * RAD, Lr = PHONE ? 170 : 230;
    // 견인선 + 예인선
    [-1, 1].forEach((sg) => {
      const tx = cx + 62 + Lr * Math.cos(ang), ty = cy - sg * Lr * Math.sin(ang);
      ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 62, cy); ctx.lineTo(tx, ty); ctx.stroke();
      D.roundRect(tx - 6, ty - 12, 44, 24, 8); ctx.fillStyle = '#f59e0b'; ctx.fill(); ctx.strokeStyle = '#a15c06'; ctx.lineWidth = 2; ctx.stroke();
    });
    // 보트
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(cx - 52, cy - 20); ctx.lineTo(cx + 18, cy - 20); ctx.quadraticCurveTo(cx + 54, cy - 12, cx + 62, cy); ctx.quadraticCurveTo(cx + 54, cy + 12, cx + 18, cy + 20); ctx.lineTo(cx - 52, cy + 20); ctx.closePath(); const g = ctx.createLinearGradient(0, cy - 20, 0, cy + 20); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cdd6e4'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#5a6679'; ctx.lineWidth = 2; ctx.stroke();
    T(cx - 8, cy + 5, '1000 kg', 13, '#26324a', 'center', 800);
    // 힘 화살표 (1 N = k px)
    const bow = { x: cx + 62, y: cy };
    // 평행사변형
    const f1 = { x: PC.F * Math.cos(ang), y: PC.F * Math.sin(ang) }, f2 = { x: f1.x, y: -f1.y };
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(80,95,125,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bow.x + f1.x * k, bow.y - f1.y * k); ctx.lineTo(bow.x + C_R * k, bow.y); ctx.moveTo(bow.x + f2.x * k, bow.y - f2.y * k); ctx.lineTo(bow.x + C_R * k, bow.y); ctx.stroke(); ctx.restore();
    // 내 예측 R (점선)
    const rp = predNum('CR');
    if (rp != null && rp > 0 && rp < 1200) { ctx.save(); ctx.setLineDash([3, 6]); ctx.strokeStyle = '#8a5cf6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bow.x, bow.y + 16); ctx.lineTo(bow.x + rp * k, bow.y + 16); ctx.stroke(); ctx.restore(); D.label(bow.x + rp * k + 8, bow.y + 18, '내 예측 ' + rp.toFixed(0) + ' N', { bg: '#8a5cf6', size: 13, align: 'left' }); }
    vec(bow.x, bow.y, f1.x, f1.y, k, { color: '#3867f4', width: 5, head: 12 });
    vec(bow.x, bow.y, f2.x, f2.y, k, { color: '#14a058', width: 5, head: 12 });
    vec(bow.x, bow.y, C_R, 0, k, { color: '#e2464b', width: 7, head: 15 });
    D.label(bow.x + f1.x * k + 6, bow.y - f1.y * k - 14, '400 N', { bg: '#3867f4', size: 13, align: 'left' });
    D.label(bow.x + f2.x * k + 6, bow.y - f2.y * k + 16, '400 N', { bg: '#14a058', size: 13, align: 'left' });
    D.label(bow.x + C_R * k + 10, bow.y - 20, 'R = ' + C_R.toFixed(0) + ' N', { bg: '#e2464b', size: 13.5, align: 'left' });
    T(bow.x + 40, bow.y + 62, PC.ang + '°', 13, '#6d3fd6', 'left', 800);
    const v = C_A * t;
    D.label(VW - 16, 60, 't = ' + t.toFixed(1) + ' s' + (t > 0 ? ' · v = ' + v.toFixed(1) + ' m/s' : ''), { bg: '#26324a', size: 13.5, align: 'right' });
    if (t > 0) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.restore(); }
  }
  function drawPredictPanel(t) {
    panel(PX, PY, PW, PH, 16);
    const p = S.pr, x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    const sc = p.sc, doneNow = p.st === 'done';
    let L;
    if (sc === 'A') L = [
      ['① 합력 = 바람의 힘 = 0.40 N (+y 방향뿐)'],
      ['② a_y = F / m = 0.40 / 0.20 = 2.0 m/s², a_x = 0'],
      ['③ 1 s 후  x = v₀t = 2.0 m,  y = ½ a t² = ' + (0.5 * AA).toFixed(1) + ' m', '#0b6b39'],
      ['④ 속도 (vx, vy) = (2.0, ' + AA.toFixed(1) + ') → 속력 ' + TRUE.Av.toFixed(1) + ' m/s', '#0b6b39'],
    ];
    else if (sc === 'B') L = [
      ['① 비탈 방향 mg sinθ = ' + BCALC.par.toFixed(1) + ' N,  N = ' + BCALC.N.toFixed(1) + ' N'],
      ['② f = μN = ' + BCALC.fk.toFixed(1) + ' N  → 알짜힘 = ' + (BCALC.par - BCALC.fk).toFixed(1) + ' N'],
      ['③ a = 알짜힘 / m = ' + BCALC.a.toFixed(1) + ' m/s²', '#0b6b39'],
      ['④ 2.0 s 후  v = at = ' + B_V.toFixed(1) + ' m/s,  d = ½at² = ' + B_D.toFixed(1) + ' m', '#0b6b39'],
    ];
    else L = [
      ['① 두 힘 400 N, 사이각 60° (각 힘은 보트 진행 방향에서 30°)'],
      ['② R = 2F cos30° = 2 × 400 × 0.866 = ' + C_R.toFixed(0) + ' N', '#c2410c'],
      ['③ a = R / m = ' + C_R.toFixed(0) + ' / 1000 = ' + C_A.toFixed(2) + ' m/s²', '#0b6b39'],
      ['④ 4.0 s 후  v = at = ' + (C_A * PC.T).toFixed(1) + ' m/s', '#0b6b39'],
    ];
    T(x0, y0, '합력 → 가속도 → 속도·위치 순서로 계산해요', fs, '#6d3fd6', 'left', 800);
    lines(x0, y0 + lh, lh, fs, L);
    // 결과 카드
    const rc = PHONE ? { x: PX + 8, y: PY + 5 * lh + 12, w: PW - 16, h: PH - 5 * lh - 20 } : { x: PX + 560, y: PY + 8, w: PW - 568, h: PH - 16 };
    if (rc.h > 40) {
      D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
      T(rc.x + 10, rc.y + 21, '📋 시뮬레이션 결과', 13.5, '#26324a', 'left', 800);
      ['A', 'B', 'C'].forEach((k, i) => {
        const y = rc.y + 48 + i * (PHONE ? 22 : 30);
        T(rc.x + 10, y, mark(p.done[k]) + ' ' + { A: '퍽', B: '경사면', C: '보트' }[k], 14, '#26324a', 'left', 800);
      });
    }
  }

  /* ---------- 포인터: 합력 장면에서 화살표 끝 끌기 ---------- */
  let dragK = null;
  const CBO = () => ({ k: PHONE ? 8 : 15, ox: PHONE ? 104 : 190, oy: SH - (PHONE ? 70 : 84) });
  function cbTip(which) { const { k, ox, oy } = CBO(), c = S.cb; return which === 'F1' ? { x: ox + c.F1 * k, y: oy } : { x: ox + c.F2 * k * Math.cos(c.phi * RAD), y: oy - c.F2 * k * Math.sin(c.phi * RAD) }; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'combine') return false;
      const a = cbTip('F2'), b = cbTip('F1');
      if (S.cb.F2 > 0 && Math.hypot(p.x - a.x, p.y - a.y) < 24) { dragK = 'F2'; return true; }
      if (S.cb.F1 > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 24) { dragK = 'F1'; return true; }
      return false;
    },
    move(p) {
      const { k, ox, oy } = CBO(), c = S.cb;
      if (dragK === 'F1') setCombine(clamp(Math.round((p.x - ox) / k), 0, 10), c.F2, c.phi);
      else if (dragK === 'F2') {
        const dx = (p.x - ox) / k, dy = (oy - p.y) / k, r = Math.hypot(dx, dy);
        let phi = dy < 0 ? (dx >= 0 ? 0 : 180) : Math.atan2(dy, dx) / RAD;
        phi = clamp(Math.round(phi / 5) * 5, 0, 180);
        setCombine(c.F1, clamp(Math.round(r), 0, 10), phi);
      }
    },
    up() { dragK = null; },
    hover(p) { if (S.mode !== 'combine') return ''; const a = cbTip('F2'), b = cbTip('F1'); return Math.hypot(p.x - a.x, p.y - a.y) < 24 || Math.hypot(p.x - b.x, p.y - b.y) < 24 ? 'grab' : ''; },
  });

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        if (n.hasAttribute('data-rec') && !eff('rec')) on = false;
        if (n.hasAttribute('data-calc') && !eff('calc')) on = false;
        if (n.hasAttribute('data-nocalc') && eff('calc')) on = false;
        if (n.hasAttribute('data-pred') && S.mode === 'slope' && !eff('spred')) on = false;
        if (n.hasAttribute('data-pred') && S.mode === 'predict' && !eff('ppred')) on = false;
        if (n.hasAttribute('data-nolock') && eff('lock')) on = false;
      }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const c = S.cb;
    $('#oF1').textContent = c.F1 + ' N'; $('#oF2').textContent = c.F2 + ' N'; $('#oPhi').textContent = c.phi + '°';
    [['sF1', c.F1, 0, 10], ['sF2', c.F2, 0, 10], ['sPhi', c.phi, 0, 180]].forEach(([id, v, mn, mx]) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); });
    const pu = S.pu; $('#oTh').textContent = pu.th + '°'; { const sl = $('#sTh'); if (+sl.value !== pu.th) sl.value = pu.th; sl.style.setProperty('--pct', (pu.th / 60 * 100) + '%'); }
    const sl = S.sl; $('#oSlTh').textContent = sl.th + '°'; $('#oSlMu').textContent = sl.mu.toFixed(1);
    { const a = $('#sSlTh'); if (+a.value !== sl.th) a.value = sl.th; a.style.setProperty('--pct', ((sl.th - 10) / 40 * 100) + '%'); const b = $('#sSlMu'); const mv = Math.round(sl.mu * 10); if (+b.value !== mv) b.value = mv; b.style.setProperty('--pct', (mv / 6 * 100) + '%'); }
    $('#bSlRun').disabled = sl.st === 'run';
    const rp = S.rp; $('#oRp').textContent = rp.th + '°'; { const a = $('#sRp'); if (+a.value !== rp.th) a.value = rp.th; a.style.setProperty('--pct', ((rp.th - 10) / 80 * 100) + '%'); }
    const pr = S.pr; $$('#scSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === pr.sc)); $('#bPrRun').disabled = pr.st === 'run';
    buildPredGrid();
  }
  let gridFor = '';
  const PRED_DEF = {
    A: [['Ay', '1 s 후 y 좌표 (m)'], ['Av', '1 s 후 속력 (m/s)']],
    B: [['Bv', '2.0 s 후 속력 (m/s)'], ['Bd', '2.0 s 동안 이동 거리 (m)']],
    C: [['CR', '합력 R (N)']],
  };
  function buildPredGrid() {
    const g = $('#prGrid'); if (gridFor === S.pr.sc) { ['Ay', 'Av', 'Bv', 'Bd', 'CR'].forEach((k) => { const i = g.querySelector('[data-k="' + k + '"]'); if (i && i !== document.activeElement && i.value !== S.pr.pred[k]) i.value = S.pr.pred[k]; }); return; }
    gridFor = S.pr.sc; g.innerHTML = '';
    PRED_DEF[S.pr.sc].forEach(([k, lab]) => {
      const sp = document.createElement('span'); sp.className = 'lab'; sp.textContent = lab;
      const inp = document.createElement('input'); inp.className = 'num-in'; inp.type = 'number'; inp.step = '0.1'; inp.inputMode = 'decimal'; inp.dataset.k = k; inp.setAttribute('aria-label', lab); inp.value = S.pr.pred[k];
      inp.addEventListener('input', () => { S.pr.pred[k] = inp.value; inp.classList.remove('ok', 'bad'); });
      g.appendChild(sp); g.appendChild(inp);
    });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sF1').addEventListener('input', (e) => setCombine(+e.target.value, S.cb.F2, S.cb.phi));
  $('#sF2').addEventListener('input', (e) => setCombine(S.cb.F1, +e.target.value, S.cb.phi));
  $('#sPhi').addEventListener('input', (e) => setCombine(S.cb.F1, S.cb.F2, +e.target.value));
  $('#bRec').addEventListener('click', () => {
    const c = S.cb;
    if (c.F1 !== 10 || c.F2 !== 10) { showHint('F₁과 F₂를 모두 10 N으로 맞춘 뒤 기록해요.'); return; }
    if (REC_PHI.indexOf(c.phi) < 0) { showHint('사이각을 0°, 60°, 90°, 120°, 180° 중에서 골라 기록해요.'); return; }
    c.rec[c.phi] = comb(10, 10, c.phi).R; Sound.click(); updateCtl();
  });
  $('#sTh').addEventListener('input', (e) => setPullTh(+e.target.value));
  $('#sSlTh').addEventListener('input', (e) => { const s = S.sl; if (s.st === 'run') { e.target.value = s.th; return; } s.th = +e.target.value; slReset(); });
  $('#sSlMu').addEventListener('input', (e) => { const s = S.sl; if (s.st === 'run') { e.target.value = Math.round(s.mu * 10); return; } s.mu = +e.target.value / 10; slReset(); });
  $('#bSlRun').addEventListener('click', () => { if (S.sl.st === 'done') slReset(); slRun(); });
  $('#bSlReset').addEventListener('click', () => { Sound.click(); slReset(); });
  $('#sRp').addEventListener('input', (e) => { S.rp.th = +e.target.value; updateCtl(); });
  $('#bRpRec').addEventListener('click', rpRecord);
  $$('#scSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const p = S.pr; if (p.st === 'run') return; p.sc = b.dataset.sc; p.st = 'idle'; p.t = 0; parts.clear(); updateCtl(); }));
  $('#bPrRun').addEventListener('click', () => { const p = S.pr; if (p.st === 'done') { p.st = 'idle'; p.t = 0; } prRun(); });
  $$('#calcGrid input').forEach((i) => i.addEventListener('input', () => i.classList.remove('ok', 'bad')));
  ['pN', 'pA'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const m = S.mode;
    if (m === 'combine') { const cb = S.cb, r = comb(cb.F1, cb.F2, cb.phi); L1 = '합력 R'; a = r.R.toFixed(1) + ' N'; L2 = '방향 (F₁ 기준)'; b = r.R > 0.05 ? r.alpha.toFixed(1) + '°' : '—'; L3 = '가속도 a'; c = r.a.toFixed(1) + ' m/s²'; }
    else if (m === 'pull') { const p = S.pu, cl = pullCalc(p.th), h = p.hide; L1 = '수직항력 N'; a = h ? '?' : cl.N.toFixed(1) + ' N'; L2 = '마찰력 f'; b = h ? '?' : cl.f.toFixed(1) + ' N'; L3 = '가속도 a'; c = h ? '?' : cl.a.toFixed(2) + ' m/s²'; }
    else if (m === 'slope') { const s = S.sl, cl = slopeCalc(s.th, s.mu); L1 = '수직항력 N'; a = cl.N.toFixed(1) + ' N'; L2 = '마찰력 f'; b = cl.f.toFixed(1) + ' N'; L3 = '가속도 a'; c = cl.a.toFixed(1) + ' m/s²'; }
    else if (m === 'rope') { const r = S.rp; L1 = '장력 T (줄마다)'; a = ropeT(r.th).toFixed(1) + ' N'; L2 = '무게 W'; b = ROPE_W + ' N'; L3 = '2T sinθ'; c = (2 * ropeT(r.th) * Math.sin(r.th * RAD)).toFixed(1) + ' N'; }
    else {
      const sc = S.pr.sc;
      if (sc === 'A') { L1 = '합력'; a = PA.F.toFixed(2) + ' N (+y)'; L2 = '가속도'; b = AA.toFixed(1) + ' m/s²'; L3 = '1 s 후 위치'; c = '(2.0, 1.0) m'; }
      else if (sc === 'B') { L1 = '알짜힘'; a = (BCALC.par - BCALC.fk).toFixed(1) + ' N'; L2 = '가속도'; b = BCALC.a.toFixed(1) + ' m/s²'; L3 = '2 s 후 속력'; c = B_V.toFixed(1) + ' m/s'; }
      else { L1 = '합력 R'; a = C_R.toFixed(0) + ' N'; L2 = '가속도'; b = C_A.toFixed(2) + ' m/s²'; L3 = '4 s 후 속력'; c = (C_A * PC.T).toFixed(1) + ' m/s'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const calcInputs = () => { const o = {}; $$('#calcGrid input').forEach((i) => { o[i.dataset.k] = i.value.trim(); }); return o; };
  const feedbackInputs = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const recDone = () => REC_PHI.every((p) => S.cb.rec[p] != null);
  const ropeDone = () => ROPE_ANG.every((a) => S.rp.rec[a] != null);
  const isSet = (F1, F2) => (S.cb.F1 === F1 && S.cb.F2 === F2) || (S.cb.F1 === F2 && S.cb.F2 === F1);
  const calc37 = pullCalc(37), sl37 = slopeCalc(37, 0.5);
  const R10 = (p) => comb(10, 10, p).R;
  const levels = [
    {
      title: '합력 구하기: 평행사변형과 성분', short: '합력 구하기', icon: '🧭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 상자를 줄로 끌 때, 줄을 어느 각도로 당기는 것이 가장 효과적일까? 계산만으로 움직임을 미리 맞힐 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> F = ma로 한 직선 위의 운동을 설명했고, <b>중학교</b>에서는 같은 직선 위의 두 힘의 합력(같은 방향이면 더하고 반대 방향이면 빼요)을 배웠어요. 이번에는 <b>방향이 다른 두 힘</b>을 화살표(벡터)로 더해 봐요.</div>' +
        '<p>마찰 없는 바닥 위의 퍽(' + M_PUCK.toFixed(1) + ' kg)에 두 힘 F₁, F₂를 걸어요. 두 화살표를 이웃한 두 변으로 하는 <b>평행사변형의 대각선</b>이 합력 R이에요. 퍽은 합력 방향으로 가속해요.</p>',
      features: ['combine'],
      setup() { setCombine(3, 4, 90); setFlag('rec', false); setScene('combine'); },
      recap: '합력은 두 힘 벡터를 평행사변형으로 더한 대각선(또는 성분의 합)이에요. 사이각이 클수록 합력이 작아지고, 같은 방향일 때만 크기를 그대로 더해요.',
      summary: '<ul><li><b>합력</b> R = 물체에 작용하는 모든 힘의 벡터 합. 두 힘은 <b>평행사변형</b>의 대각선, 또는 <b>x 성분끼리, y 성분끼리 더해서</b> 구해요.</li><li>F₁ = 3 N(→)과 F₂ = 4 N(↑)을 직각으로 걸면 R = √(3² + 4²) = <b>5 N</b>이고 F₁에서 약 53°예요.</li><li>크기가 같은 두 힘(F = 10 N)의 합력: R = 2F cos(φ/2) → φ = 0° 20 N, 60° 17.3 N, 90° 14.1 N, 120° 10 N, 180° 0 N.</li><li>합력의 크기는 두 힘의 크기의 합과 같지 않아요(같은 방향일 때만 같고, 방향이 다르면 더 작아요).</li><li>퍽의 가속도는 합력 방향이고 <b>a = R / m</b>이에요(F = ma).</li></ul>',
      missions: [
        {
          title: '3 N과 4 N으로 합력 5 N 만들기',
          goal: 'F₁ = 3 N, F₂ = 4 N을 걸고 <b>합력이 5 N</b>이 되도록 사이각 φ를 맞춰 보세요.',
          hint: '화살표 끝을 끌어도 되고 슬라이더로 바꿔도 돼요. 두 힘이 서로 수직이면 3² + 4² = 5²이에요.',
          setup() { setCombine(3, 4, 60); setFlag('rec', false); setScene('combine'); },
          check: () => isSet(3, 4) && Math.abs(comb(S.cb.F1, S.cb.F2, S.cb.phi).R - 5) < 0.05,
          hold: 0.8,
          status: () => { const r = comb(S.cb.F1, S.cb.F2, S.cb.phi); return mark(isSet(3, 4)) + ' 3 N과 4 N &nbsp; ' + mark(Math.abs(r.R - 5) < 0.05) + ' R = ' + r.R.toFixed(1) + ' N'; },
          explain: '두 힘이 <b>수직(φ = 90°)</b>일 때 R = √(3² + 4²) = <b>5 N</b>이에요. 성분으로는 Rx = 3 N, Ry = 4 N → R = 5 N이고, 방향은 F₁에서 tan⁻¹(4/3) ≈ 53°예요. 3 + 4 = 7 N이 아니라는 점에 주의해요.',
        },
        {
          title: '사이각에 따른 합력 기록하기',
          goal: '두 힘을 모두 <b>10 N</b>으로 맞추고, 사이각 φ가 <b>0°, 60°, 90°, 120°, 180°</b>일 때 합력을 <b>📋 기록</b>하세요.',
          hint: 'F₁과 F₂를 10 N으로 맞춘 뒤 φ를 바꿀 때마다 기록 버튼을 눌러요. 표의 오른쪽 열은 2F cos(φ/2)로 계산한 값이에요.',
          setup() { setCombine(10, 10, 0); setFlag('rec', true); setScene('combine'); },
          check: recDone,
          hold: 0.6,
          status: () => REC_PHI.map((p) => mark(S.cb.rec[p] != null) + p + '°').join(' &nbsp; '),
          explain: 'R = <b>' + REC_PHI.map((p) => R10(p).toFixed(1)).join(', ') + ' N</b> (φ = 0°, 60°, 90°, 120°, 180°). 사이각이 커질수록 합력이 작아지고 φ = 180°(반대 방향)에서는 0이 돼요. 기록한 값은 2F cos(φ/2)와 같아요.',
        },
        {
          type: 'quiz', title: '합력은 두 힘의 합일까?',
          goal: '크기가 3 N과 4 N인 두 힘의 합력에 대한 설명으로 알맞은 것은?',
          setup() { setCombine(3, 4, 90); setFlag('rec', false); setScene('combine'); },
          choices: ['합력은 언제나 3 + 4 = 7 N이에요', '두 힘이 같은 방향일 때만 7 N이고, 방향이 다르면 7 N보다 작아요', '합력은 두 힘 중 큰 힘 4 N과 항상 같아요', '두 힘 사이의 각이 클수록 합력도 커져요'],
          answer: 1,
          feedback: ['힘은 크기만 있는 양이 아니라 방향도 있는 벡터라서, 방향이 다르면 크기만 더해서는 안 돼요.', '', '두 힘이 같은 방향이면 7 N, 반대 방향이면 1 N 등 사이각에 따라 달라져요. 큰 힘과 같은 것은 아니에요.', '반대예요. 사이각이 클수록 두 힘이 서로 상쇄되어 합력이 작아졌어요(180°에서 최소).'],
          explain: '<b>합력 = 벡터 합</b>이에요. 같은 방향(0°)일 때 7 N으로 최대, 반대 방향(180°)일 때 1 N으로 최소이고, 그 사이에서는 방향이 달라질수록 작아져요(직각이면 5 N).',
        },
      ],
    },
    {
      title: '성분 분해: 줄로 비스듬히 끌기', short: '성분 분해', icon: '📦', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 힘을 합해 합력을 구했어요. 거꾸로 힘 하나를 <b>수평 성분과 수직 성분으로 나눌</b> 수도 있어요: F<sub>x</sub> = F cosθ, F<sub>y</sub> = F sinθ.</div>' +
        '<p>상자(' + PL.m.toFixed(1) + ' kg)를 줄로 비스듬히 끌면 힘의 일부는 앞으로, 일부는 위로 작용해요. 위로 당기는 성분은 바닥이 떠받치는 <b>수직항력 N = mg − F sinθ</b>를 줄여 마찰력 f = μN도 줄여요. 각도 θ가 가속도에 어떤 영향을 줄까요?</p>',
      features: ['pull'],
      setup() { S.pu.hide = false; setPullTh(0); setFlag('calc', false); setScene('pull'); },
      recap: '힘을 성분으로 나누면 방향별로 F = ma를 쓸 수 있어요. 비스듬히 끌면 N과 f는 줄지만 앞으로 가는 성분도 줄어, 가속도가 가장 큰 각도(tanθ = μ)가 있어요.',
      summary: '<ul><li>힘의 <b>성분</b>: F<sub>x</sub> = F cosθ, F<sub>y</sub> = F sinθ. 방향마다 따로 F = ma를 써요.</li><li>줄로 θ만큼 비스듬히 끌면 수직 방향 평형에서 <b>N = mg − F sinθ</b>, 마찰력은 <b>f = μN</b>, 수평 방향 <b>a = (F cosθ − f) / m</b>이에요.</li><li>θ = 37°(cos 0.8, sin 0.6), F = 10 N, m = 2.0 kg, μ = 0.2: F<sub>x</sub> = 8 N, F<sub>y</sub> = 6 N, N = 14 N, f = 2.8 N, <b>a = 2.6 m/s²</b>.</li><li>θ = 0°에서 a = 3.0 m/s²이고, θ를 조금 키우면 마찰이 줄어 a가 커졌다가 tanθ = μ인 θ ≈ ' + PEAK_DEG.toFixed(0) + '°에서 최대(약 ' + PULL_BEST.toFixed(1) + ' m/s²)가 되고, 더 키우면 F cosθ가 줄어 작아져요.</li></ul>',
      missions: [
        {
          title: 'θ = 37°에서 성분 계산하기', manual: true,
          goal: '줄이 수평과 <b>37°</b>일 때 F<sub>x</sub>, F<sub>y</sub>, N, f, a를 계산해 입력하고 <b>✔ 확인하기</b>를 누르세요. (sin37° ≈ 0.6, cos37° ≈ 0.8)',
          hint: 'Fx = 10 × 0.8, Fy = 10 × 0.6. N = mg − Fy = 20 − Fy, f = 0.2 × N, a = (Fx − f) ÷ 2.0 이에요.',
          setup() { setPullTh(37); S.pu.hide = true; $$('#calcGrid input').forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); setFlag('calc', true); setScene('pull'); },
          check() {
            const v = calcInputs(), keys = ['fx', 'fy', 'n', 'f', 'a'];
            if (keys.some((k) => v[k] === '' || !isFinite(+v[k]))) return '다섯 칸을 모두 숫자로 입력해 주세요.';
            const tgt = { fx: [8, 0.15], fy: [6, 0.15], n: [14, 0.2], f: [2.8, 0.1], a: [2.6, 0.1] };
            const inputs = $$('#calcGrid input'), res = {};
            inputs.forEach((i) => { const t = tgt[i.dataset.k]; res[i.dataset.k] = Math.abs(+i.value - t[0]) <= t[1]; });
            feedbackInputs(inputs.map((i) => [i, res[i.dataset.k]]));
            if (!res.fx || !res.fy) return '성분은 Fx = F cosθ, Fy = F sinθ예요. cos37° ≈ 0.8, sin37° ≈ 0.6으로 계산해 보세요.';
            if (!res.n) return '위로 당기는 Fy만큼 바닥이 덜 받쳐요. N = mg − Fy = 20 N − Fy예요.';
            if (!res.f) return '마찰력은 f = μN이에요. 방금 구한 N에 μ = 0.2를 곱해요.';
            if (!res.a) return '수평 방향의 알짜힘은 Fx − f이고, a = (Fx − f) ÷ m이에요. m = 2.0 kg이에요.';
            return true;
          },
          status: () => { const v = calcInputs(); return '입력한 칸 ' + Object.keys(v).filter((k) => v[k] !== '').length + ' / 5'; },
          explain: 'F<sub>x</sub> = 10 × 0.8 = <b>8 N</b>, F<sub>y</sub> = 10 × 0.6 = <b>6 N</b>. 수직 방향 평형에서 N = 20 − 6 = <b>14 N</b>, f = 0.2 × 14 = <b>2.8 N</b>, a = (8 − 2.8) ÷ 2.0 = <b>2.6 m/s²</b>이에요. (θ = 0°이면 N = 20 N, f = 4 N, a = 3.0 m/s²이므로 비스듬히 끌면 마찰이 줄어요.)',
        },
        {
          title: '가속도가 가장 큰 각도 찾기',
          goal: '줄의 각도 θ를 바꾸며 상자의 <b>가속도 a가 가장 큰 때</b>(a = ' + PULL_BEST.toFixed(2) + ' m/s²)를 찾으세요.',
          hint: 'θ를 0°에서 조금씩 키워 보세요. 그래프의 점이 가장 높은 곳이 답이고, 더 키우면 다시 낮아져요. 대략 ' + BEST_LO + '°~' + BEST_HI + '° 근처예요.',
          setup() { S.pu.hide = false; S.pu.vis = new Set([0]); S.pu.found = false; setPullTh(0); setFlag('calc', false); setScene('pull'); },
          check() { const ok = r2(pullCalc(S.pu.th).a) >= PULL_BEST - 1e-9; if (ok) S.pu.found = true; return ok; },
          hold: 0.8,
          status: () => 'θ = ' + S.pu.th + '° · a = ' + pullCalc(S.pu.th).a.toFixed(2) + ' m/s² ' + mark(r2(pullCalc(S.pu.th).a) >= PULL_BEST - 1e-9),
          explain: 'θ = ' + BEST_LO + '°~' + BEST_HI + '°에서 a가 최대(약 ' + PULL_BEST.toFixed(2) + ' m/s²)예요. 이론적으로는 <b>tanθ = μ</b>일 때, 곧 θ = tan⁻¹0.2 ≈ ' + PEAK_DEG.toFixed(1) + '°예요. θ가 커지면 위로 당기는 Fy 때문에 N과 f가 줄지만, 앞으로 가는 Fx = F cosθ도 줄어요. 처음에는 마찰 감소가 더 크지만 이 각도를 넘으면 Fx 감소가 더 커서 a가 줄어들어요(θ = 60°에서 a = ' + pullCalc(60).a.toFixed(1) + ' m/s²).',
        },
      ],
    },
    {
      title: '경사면과 장력: 중력과 줄의 힘', short: '경사면·장력', icon: '⛰️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘을 성분으로 나누어 방향별로 F = ma를 썼어요. 이번에는 <b>중력</b>을 나눠 봐요. 경사면에서는 중력이 <b>경사면 방향</b>과 <b>면에 수직인 방향</b>의 두 성분으로 나뉘어요.</div>' +
        '<p>경사면: mg sinθ(비탈을 따라 미끄러뜨리는 힘), mg cosθ(= 수직항력 N). 가속도는 a = g(sinθ − μ cosθ)이고, tanθ ≤ μ이면 미끄러지지 않아요. 줄: 대칭인 두 줄이 물체를 매달 때는 수직 방향 평형 2T sinθ = mg로 장력을 구해요.</p>',
      features: ['slope', 'rope'],
      setup() { S.sl.th = 30; S.sl.mu = 0.2; slReset(); setFlag('spred', false); setFlag('lock', false); setScene('slope'); },
      recap: '경사면에서는 중력을 mg sinθ와 mg cosθ로 나눠요(N = mg cosθ ≠ mg). 두 줄의 장력은 2T sinθ = mg이므로 줄이 수평에 가까울수록 급증해요.',
      summary: '<ul><li>경사면(각 θ)에서 중력 mg는 <b>비탈 방향 mg sinθ</b>와 <b>수직 방향 mg cosθ</b>로 나뉘고, 수직항력 <b>N = mg cosθ</b>(mg가 아니에요), 마찰력 f = μN이에요.</li><li><b>a = g(sinθ − μcosθ)</b>. m = 5.0 kg, θ = 30°이면 mg sinθ = 25 N, N = 43.3 N. 마찰이 없으면 a = 5.0 m/s², μ = 0.2이면 f = 8.7 N, a = 3.3 m/s².</li><li>θ = 37°, μ = 0.5이면 a = 10(0.6 − 0.4) = 2.0 m/s². 미끄러지지 않을 조건은 <b>tanθ ≤ μ</b>예요.</li><li>무게 60 N을 대칭인 두 줄로 매달면 <b>2T sinθ = 60 N</b>: θ = 90° T = 30 N, 60° 34.6 N, 30° 60 N, 10° 173 N → 수평에 가까울수록 장력이 급증해요.</li></ul>',
      missions: [
        {
          title: '경사면에서 N과 a 예측하고 확인하기', manual: true,
          goal: 'θ = <b>37°</b>, μ = <b>0.5</b>인 경사면에서 5.0 kg 상자의 <b>수직항력 N</b>과 <b>가속도 a</b>를 예측해 입력하고, <b>▶ 놓기</b>로 확인한 뒤 ✔ 확인하기를 누르세요.',
          hint: 'N = mg cosθ = 50 × 0.8, a = g(sinθ − μcosθ) = 10 × (0.6 − 0.5 × 0.8)이에요. 입력한 뒤 ▶ 놓기를 눌러 측정한 a와 비교해요.',
          setup() { S.sl.th = 37; S.sl.mu = 0.5; S.sl.last = null; slReset(); $('#pN').value = ''; $('#pA').value = ''; $('#pN').classList.remove('ok', 'bad'); $('#pA').classList.remove('ok', 'bad'); setFlag('spred', true); setFlag('lock', true); setScene('slope'); },
          check() {
            const nv = $('#pN').value.trim(), av = $('#pA').value.trim();
            if (nv === '' || av === '' || !isFinite(+nv) || !isFinite(+av)) return 'N과 a를 모두 숫자로 입력해 주세요.';
            const okN = Math.abs(+nv - sl37.N) <= 0.8, okA = Math.abs(+av - sl37.a) <= 0.15;
            feedbackInputs([[$('#pN'), okN], [$('#pA'), okA]]);
            if (!okN) return 'N은 mg가 아니라 mg cosθ예요. 비탈에서는 중력의 일부만 면을 눌러요(cos37° ≈ 0.8).';
            if (!okA) return 'a = g(sinθ − μcosθ)예요. 비탈 방향 성분 mg sinθ에서 마찰력 μN을 빼고 m으로 나눠 보세요.';
            const L = S.sl.last;
            if (!L || L.th !== 37 || Math.abs(L.mu - 0.5) > 1e-9) return '예측이 맞아요! ▶ 놓기를 눌러 실제 가속도를 확인한 뒤 다시 확인하기를 눌러요.';
            return true;
          },
          status: () => '입력 ' + ($('#pN').value.trim() !== '' && $('#pA').value.trim() !== '' ? '✅' : '⬜') + ' &nbsp; 놓아서 확인 ' + mark(!!S.sl.last && S.sl.last.th === 37),
          explain: 'N = mg cosθ = 50 × 0.8 ≈ <b>40 N</b>(mg = 50 N이 아니에요), mg sinθ = 30 N, f = 0.5 × 40 = 20 N, a = (30 − 20) ÷ 5.0 = <b>2.0 m/s²</b>이에요. 놓아 보면 측정한 가속도 ' + sl37.a.toFixed(1) + ' m/s²와 같아요.',
        },
        {
          title: '두 줄의 장력 표 완성하기',
          goal: '무게 60 N의 물체를 매단 두 줄의 각도 θ를 <b>10°, 30°, 60°, 90°</b>로 바꾸며 장력 T를 <b>📋 기록</b>하세요.',
          hint: '슬라이더로 각도를 맞추고 기록 버튼을 눌러요. 장력 센서 값이 2T sinθ = 60 N을 만족하는지 읽음 칸에서도 확인해요.',
          setup() { S.rp.rec = {}; S.rp.th = 60; updateCtl(); setFlag('spred', false); setFlag('lock', false); setScene('rope'); },
          check: ropeDone,
          hold: 0.6,
          status: () => ROPE_ANG.map((a) => mark(S.rp.rec[a] != null) + a + '°').join(' &nbsp; '),
          explain: 'T = 60 ÷ (2 sinθ) = <b>' + ROPE_ANG.map((a) => ropeT(a).toFixed(1)).join(', ') + ' N</b> (θ = 10°, 30°, 60°, 90°). 두 줄이 수평에 가까워질수록 sinθ가 작아져 같은 무게를 받치려면 장력이 급증해요(10°에서는 무게의 약 2.9배).',
        },
        {
          type: 'quiz', title: '수평에 가깝게 팽팽한 줄',
          goal: '빨랫줄을 수평에 가깝게 팽팽히 당길수록 빨래 무게로 줄이 끊어지기 쉬운 까닭은?',
          setup() { S.rp.th = 15; updateCtl(); setFlag('spred', false); setFlag('lock', false); setScene('rope'); },
          choices: ['줄이 수평에 가까울수록 빨래가 더 무거워지기 때문이에요', '줄이 받치는 힘의 위쪽 성분 T sinθ가 일정한 무게를 받쳐야 해서, sinθ가 작을수록 T가 커져요', '줄이 길어질수록 중력이 커지기 때문이에요', '수평 방향의 힘은 무게와 상관이 없어서 장력이 변하지 않아요'],
          answer: 1,
          feedback: ['빨래의 무게는 그대로예요. 달라지는 것은 줄이 그 무게를 받치는 방식이에요.', '', '중력은 줄 길이와 상관없이 mg로 일정해요.', '수직 평형 2T sinθ = mg에서 sinθ가 작아지면 T가 커져요. 장력은 변해요.'],
          explain: '수직 방향에서 두 줄의 위쪽 성분 2T sinθ가 무게 mg와 같아야 해요. 그러니 <b>T = mg ÷ (2 sinθ)</b>이고 줄이 수평(θ → 0°)에 가까울수록 T가 한없이 커져요. (θ = 10°에서 173 N, θ = 90°에서 30 N)',
        },
      ],
    },
    {
      title: '운동 예측: 합력에서 위치까지', short: '운동 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘 벡터를 합성하고 성분으로 나누는 방법을 익혔어요. 이제 <b>합력 → 가속도 → 속도·위치</b> 순서로 계산해 운동을 미리 맞혀 봐요.</div>' +
        '<p>시나리오 세 가지를 계산으로 예측하고, 시뮬레이션과 비교해요. 처음 속도와 <b>수직인 힘</b>이 계속 작용하면 경로가 어떻게 휘는지도 확인해요.</p>',
      features: ['predict'],
      setup() { S.pr.sc = 'A'; prReset(); setFlag('ppred', true); setFlag('spred', false); setFlag('lock', false); setScene('predict'); },
      recap: '합력을 구하면 a = F ÷ m, 그다음 v = v₀ + at, 위치 = ½at² 등으로 운동을 예측할 수 있어요. 처음 속도와 수직인 힘이 계속 작용하면 경로는 곡선으로 휘어요.',
      summary: '<ul><li>운동 예측 순서: <b>① 합력(성분 분해) → ② 가속도 a = F ÷ m → ③ 속도 v = v₀ + at, 위치 x = v₀t + ½at²</b>.</li><li>에어 하키 퍽(0.20 kg, v₀ = +x 2.0 m/s)에 +y 방향 0.40 N: a<sub>y</sub> = 2.0 m/s², 1 s 후 위치 (2.0, 1.0) m, 속도 (2.0, 2.0) m/s(속력 2.8 m/s, 45°). 경로는 포물선 모양으로 휘어요.</li><li>경사면(30°, μ = 0.2) 5.0 kg 상자: a = 3.3 m/s², 2.0 s 후 속력 6.5 m/s, 이동 거리 6.5 m.</li><li>견인선 두 개(각 400 N, 사이각 60°): 합력 R = 2 × 400 × cos30° ≈ 693 N, 방향은 두 줄의 가운데예요.</li><li>이 도구(힘 → 가속도 → 궤적)는 다음 차시의 <b>포물선 운동</b>과 원운동에서도 그대로 써요.</li></ul>',
      missions: [
        {
          title: '세 시나리오 계산으로 예측하기', manual: true,
          goal: '🏒 퍽, ⛰️ 경사면, 🚤 보트 세 시나리오를 차례로 골라, 합력 → 가속도 → 속도·위치 순서로 계산한 값을 입력하고 ✔ 확인하기를 누르세요.',
          hint: '퍽: a = 0.40 ÷ 0.20 = 2.0 m/s²이니 y = ½at². 경사면: a = 3.3 m/s²이니 v = at, d = ½at². 보트: R = 2 × 400 × cos30°.',
          setup() { const p = S.pr; p.sc = 'A'; prReset(); gridFor = ''; setFlag('ppred', true); setScene('predict'); updateCtl(); },
          check() {
            const P = S.pr.pred, keys = ['Ay', 'Av', 'Bv', 'Bd', 'CR'];
            const miss = keys.filter((k) => P[k] === '' || !isFinite(parseFloat(P[k])));
            if (miss.length) return '아직 입력하지 않은 칸이 있어요: ' + ['퍽', '경사면', '보트'].filter((nm, i) => miss.some((k) => 'ABC'[i] === k[0])).join(', ') + ' 시나리오를 골라 입력해 보세요.';
            const ok = {}; keys.forEach((k) => { ok[k] = Math.abs(parseFloat(P[k]) - TRUE[k]) <= TOL[k]; });
            $$('#prGrid input').forEach((i) => { const k = i.dataset.k; if (ok[k]) { i.classList.remove('bad'); i.classList.add('ok'); } else if (!i.classList.contains('bad')) { i.classList.remove('ok'); void i.offsetWidth; i.classList.add('bad'); } });
            if (!ok.Ay || !ok.Av) return '🏒 퍽: 힘은 +y 방향 0.40 N뿐이라서 a_y = F ÷ m이고 y = ½at²예요. 속력은 √(vx² + vy²)로 구해요.';
            if (!ok.Bv || !ok.Bd) return '⛰️ 경사면: 알짜힘 = mg sinθ − μ mg cosθ이고 a = 알짜힘 ÷ m이에요. 그다음 v = at, d = ½at²예요.';
            if (!ok.CR) return '🚤 보트: 각 힘은 진행 방향에서 30°씩 벌어져 있어요. 합력 = 2 × 400 × cos30°예요.';
            return true;
          },
          status: () => { const P = S.pr.pred, g = (a, b) => !!(P[a] !== '' && (!b || P[b] !== '')); return mark(g('Ay', 'Av')) + ' 퍽 &nbsp; ' + mark(g('Bv', 'Bd')) + ' 경사면 &nbsp; ' + mark(g('CR')) + ' 보트'; },
          explain: '🏒 a<sub>y</sub> = 0.40 ÷ 0.20 = 2.0 m/s², y = ½ × 2.0 × 1² = <b>1.0 m</b>, 속도 (2.0, 2.0) → 속력 <b>2.8 m/s</b>. ⛰️ a = 10(0.5 − 0.2 × 0.866) = 3.3 m/s², v = <b>6.5 m/s</b>, d = ½ × 3.3 × 2.0² = <b>6.5 m</b>. 🚤 R = 2 × 400 × cos30° ≈ <b>693 N</b>.',
        },
        {
          title: '예측과 시뮬레이션 비교하기',
          goal: '세 시나리오를 모두 <b>▶ 시뮬레이션</b>으로 실행해 내 예측(점선)과 실제 운동을 비교하세요.',
          hint: '시나리오를 하나씩 고르고 ▶ 시뮬레이션을 눌러요. 내 예측이 맞으면 점선이 실제 위치와 겹쳐요.',
          setup() { const p = S.pr; p.sc = 'A'; p.done = { A: false, B: false, C: false }; prReset(); gridFor = ''; setFlag('ppred', false); setScene('predict'); updateCtl(); },
          check: () => S.pr.done.A && S.pr.done.B && S.pr.done.C,
          hold: 0.6,
          status: () => mark(S.pr.done.A) + ' 퍽 &nbsp; ' + mark(S.pr.done.B) + ' 경사면 &nbsp; ' + mark(S.pr.done.C) + ' 보트',
          explain: '세 경우 모두 계산한 값과 시뮬레이션이 일치해요: 퍽은 1 s 후 (2.0, 1.0) m, 상자는 2.0 s 후 6.5 m/s·6.5 m, 보트는 합력 693 N으로 가속해요. <b>합력을 구하면 운동을 정량적으로 예측</b>할 수 있어요.',
        },
        {
          type: 'quiz', title: '수직인 힘이 계속 작용하면?',
          goal: '처음에 +x 방향으로 움직이는 물체에 <b>+y 방향의 일정한 힘</b>이 계속 작용하면 물체의 경로는?',
          setup() { S.pr.sc = 'A'; prReset(); setFlag('ppred', false); setScene('predict'); },
          choices: ['계속 +x 방향으로만 직진해요', '곧바로 +y 방향으로 꺾여 직진해요', '+y 쪽으로 점점 휘어지는 곡선(포물선 모양)이에요', '일정한 반지름의 원을 그려요'],
          answer: 2,
          feedback: ['+y 방향 힘이 있으니 y 방향으로는 가속돼요. 직진만 하지 않아요.', 'x 방향 속도는 힘이 없으니 그대로 유지돼요. 갑자기 꺾이지 않고 서서히 휘어요.', '', '이 경우 힘의 방향이 늘 +y로 일정해서 원이 아니라 포물선 모양이에요. (힘이 속도에 늘 수직이면 원운동이 되는데 이는 이후 차시에서 다뤄요.)'],
          explain: 'x 방향은 힘이 없어 등속(x = v₀t), y 방향은 일정한 가속도(y = ½at²)이므로 y ∝ x²인 <b>포물선 모양</b>으로 휘어요. 이 원리가 다음 차시의 <b>포물선 운동</b>(중력이 아래 방향 힘)이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-force-vector', mount: '#game', badge: '합력 박사', homeHref: '../../index.html#hm',
    featureLabels: { combine: '🧭 힘 화살표 합성 · 합력 표', pull: '📦 성분 분해 · a–θ 그래프', slope: '⛰️ 경사면의 중력 분해', rope: '🧵 두 줄의 장력 센서', predict: '🎯 운동 예측 시뮬레이션' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('combine');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    // 합력 장면의 퍽: 1초 가속 + 잠시 멈춤 후 다시
    S.cb.tr += dt; if (S.cb.tr > 1.8) S.cb.tr = 0;
    slStep(dt); prStep(dt);
    switch (S.mode) {
      case 'combine': drawCombine(dt); break;
      case 'pull': drawPull(dt); break;
      case 'slope': drawSlope(dt); break;
      case 'rope': drawRope(dt); break;
      default: drawPredict(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, setCombine, setPullTh, slRun, slReset, slStep, prRun, prReset, rpRecord,
    comb, pullCalc, slopeCalc, ropeT, PULL_BEST, BEST_LO, BEST_HI, TRUE, CBO, cbTip,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { slStep(0.02); prStep(0.02); } },
  };
})();
