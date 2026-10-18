/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 물의 전기 분해 [12화학02-01]
   ① 관찰: 전해질 필요 (순수한 물 vs 전해질 수용액, 전류계, 안전 수칙)
   ② 실험: 전기 분해 (호프만 장치 모형, 9 V에서 8분 동안 2분마다 기록, 기체 확인 시험)
   ③ 분석: 부피비 (시간-부피 그래프 두 선의 기울기 비 2 : 1, 계수비 · 몰수비)
   ④ 모형: 입자 모형 (2H₂O → 2H₂ + O₂, 원자 수 보존, 몰 · 질량 계산)
   ※ 전극 반응식과 전기량(패러데이) 계산은 다루지 않아요. 전자의 이동은 정성적인 그림으로만 나타내요.
   ※ 장치의 전압 → 기체 발생 속도는 모의 값이에요: 3 V 이상에서 분해가 시작되고,
      (−)극 기체의 발생 속도 = (전압 − 3) ÷ 6 mL/분 (9 V에서 1.0 mL/분), (+)극은 그 절반이에요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const { tween, approach, Particles } = SciSim;
  const CO = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 920 : 560;
  const FS = PHONE ? 1.12 : 1;
  const fs = (n) => Math.round(n * FS);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const fx = new Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size: fs(size), color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(fs(size), weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill, stroke) {
    D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
    if (stroke) { D.roundRect(x, y, w, h, r || 14); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  const INK = '#1b2333', MUTED = '#5d6879', GOOD = '#14a058', BAD = '#d6453d', ELEC = '#f5b400';
  const CAT = '#e8604c', ANI = '#3b6df0', PUR = '#7c3aed';
  const H_COL = '#8fa3d9', O_COL = '#e2574c';       // 수소 · 산소 원자 색

  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hintOff() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k; $('#roL' + i).textContent = label; $('#roV' + i).innerHTML = value;
  }

  /* ---------- 물리 · 화학 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const V_START = 3, V_REF = 9, V_MAX = 12;           // 분해 시작 전압, 기준 전압, 최대 전압 (V)
  const MA_PER_V = 22;                                 // 전류 = 22 mA × (전압 − 3 V)
  const TMAX = 8, TS = 1;                              // 8분까지, 실제 1초 = 실험 1분
  const rateH = (V) => Math.max(0, (V - V_START) / 6);  // (−)극 기체 발생 속도 (mL/분)
  const rateO = (V) => rateH(V) / 2;                    // (+)극 기체 발생 속도 (mL/분)
  const curOf = (V) => (V >= V_START ? Math.round(MA_PER_V * (V - V_START)) : 0);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  // 몰 계산 (25 °C, 1 mol = 24.5 L), 원자량 H 1.0 · O 16.0
  const VM = 24.5, M_H2 = 2.0, M_O2 = 32.0, M_H2O = 18.0;
  const BASE_H = rateH(V_REF) * TMAX, BASE_O = rateO(V_REF) * TMAX;      // 8.0 mL, 4.0 mL
  const N_H2 = BASE_H / 1000 / VM, N_O2 = BASE_O / 1000 / VM, N_H2O = N_H2;   // mol (H₂O : H₂ = 2 : 2)
  const MG_H2 = N_H2 * M_H2 * 1000, MG_O2 = N_O2 * M_O2 * 1000, MG_H2O = N_H2O * M_H2O * 1000; // mg
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function sci(x) {
    const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    const es = String(Math.abs(e)).split('').map((c) => SUPD[+c]).join('');
    return (Math.round(m * 100) / 100).toFixed(2) + '×10' + (e < 0 ? '⁻' : '') + es;
  }
  const sig = (x, d) => Number(x.toPrecision(d)).toString();

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'lab', t: 0, fade: 0, gate: '',
    V: V_REF, elec: false, on: false,
    run: { t: 0, V: null }, gas: { h: 0, o: 0 }, draining: false,
    rows: [], base: null,
    cmp: { pure: 0, elec: 0, pureI: null, elecI: null },
    id: { L: null, R: null }, tests: {}, testMsg: '', test: null,
    gr: { h: 0, o: 0, hd: false, od: false, pick: null },
    m: { t: 0, tt: 0, play: false },
    ord: [2, 0, 3, 1], phase: 0, funnel: 0,
  };
  let game = null;
  const gameLevel = () => (game ? game.level : 0);
  const isFree = () => !!(game && game.free);
  const curI = () => (S.on && S.elec ? curOf(S.V) : 0);
  const flowing = () => curI() > 0 && !S.draining && S.run.t < TMAX;

  /* =========================================================
     장치 (호프만 장치 모형) — 장치 안의 좌표(local)에 그린 뒤 확대·이동해 놓아요
     ========================================================= */
  const K = PHONE ? 0.78 : 1;
  const OX = PHONE ? (VW - 440 * K) / 2 - 4 * K : 8, OY = PHONE ? 6 : 0;
  const TLX = 120, TRX = 330, FUNX = 225;
  const TUBE_TOP = 100, ML_PX = 21, TUBE_BOT = 388, U_Y = 414;
  const CAP = 12;                                       // 눈금의 최댓값 (mL)
  const LP = (x, y) => [OX + x * K, OY + y * K];        // local → canvas
  const fromCanvas = (x, y) => [(x - OX) / K, (y - OY) / K];
  const TL_ = (x, y, s, size, color, align, weight, extra) => T(x, y, s, size / K, color, align, weight, extra);
  const SURF = (side) => TUBE_TOP + (side === 'L' ? S.gas.h : S.gas.o) * ML_PX;
  const FUN_L0 = 80, FUN_RATIO = 7.0;
  const funnelLevel = () => FUN_L0 - (S.gas.h + S.gas.o) * ML_PX / FUN_RATIO;
  const SUP = { x: 95, y: 462, w: 260, h: 92 };
  const WIRE_L = [[SUP.x + 35, SUP.y], [SUP.x + 35, 442], [60, 442], [60, 372], [TLX - 28, 372]];       // 전자: 전원 (−) → 왼쪽 전극
  const WIRE_R = [[TRX + 28, 372], [392, 372], [392, 442], [SUP.x + SUP.w - 35, 442], [SUP.x + SUP.w - 35, SUP.y]];   // 전자: 오른쪽 전극 → 전원 (+)
  function pathInfo(P) {
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P, cum, len: cum[cum.length - 1] };
  }
  const PWL = pathInfo(WIRE_L), PWR = pathInfo(WIRE_R);
  function atPath(pi, s) {
    s = clamp(s, 0, pi.len);
    for (let i = 1; i < pi.P.length; i++) {
      if (s <= pi.cum[i] + 1e-6) {
        const k = (s - pi.cum[i - 1]) / Math.max(1e-6, pi.cum[i] - pi.cum[i - 1]);
        return [pi.P[i - 1][0] + (pi.P[i][0] - pi.P[i - 1][0]) * k, pi.P[i - 1][1] + (pi.P[i][1] - pi.P[i - 1][1]) * k];
      }
    }
    return pi.P[pi.P.length - 1];
  }
  const bubbles = [];                     // 기포 (local 좌표)
  const acc = { L: 0, R: 0 };
  const waterCol = () => (S.elec ? '#b9dcfb' : '#cde9ff');

  function drainNow() {
    S.on = false; S.draining = true;
    S.run.t = 0; S.run.V = null; S.rows = []; S.done8 = false; S.phase = 0;
    S.id = { L: null, R: null };
    bubbles.length = 0;
    tween(S.gas, { h: 0, o: 0 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic', onDone: () => { S.gas.h = 0; S.gas.o = 0; S.draining = false; updateUI(); } });
    updateUI();
  }
  function setElec(v) {
    v = !!v;
    if (v === S.elec) return;
    const had = S.run.t > 0 || S.gas.h > 0.001;
    S.elec = v;
    if (had) drainNow();
    else S.on = false;
    if (v) { for (let i = 0; i < 12; i++) { const p = LP(FUNX - 40 + Math.random() * 80, 24 + Math.random() * 14); fx.emit({ x: p[0], y: p[1], vx: rnd(-20, 20), vy: rnd(60, 130), life: 0.7, size: 3, color: '#ffffff', shape: 'square', gravity: 200 }); } }
    updateUI();
  }
  function setV(v) {
    v = clamp(Math.round(v), 0, V_MAX);
    if (v === S.V) return;
    const had = S.run.t > 0 || S.gas.h > 0.001;
    S.V = v;
    if (had) { drainNow(); showHint('전압을 바꾸면 처음부터 다시 실험해요. 장치를 비웠어요.', 3600); }
    updateUI();
  }
  function togglePower() {
    if (S.draining) return;
    if (!S.on && S.run.t >= TMAX - 1e-9) { showHint('8분이 지났어요. 🧹 장치 비우기를 눌러 다시 시작해요.', 3600); Sound.fail(); return; }
    S.on = !S.on; Sound.click(); updateUI();
  }

  function labStep(dt) {
    const I = curI();
    S.phase += (I > 0 ? 40 + I * 0.9 : 0) * dt;
    if (!S.draining && S.on && I > 0 && S.run.t < TMAX) {
      if (S.run.V == null) S.run.V = S.V;
      S.run.t = Math.min(TMAX, S.run.t + dt * TS);
      S.gas.h = rateH(S.run.V) * S.run.t; S.gas.o = rateO(S.run.V) * S.run.t;
      while (S.rows.length < 4 && S.run.t >= 2 * (S.rows.length + 1) - 1e-9) {
        const tt = 2 * (S.rows.length + 1);
        S.rows.push({ t: tt, h: rateH(S.run.V) * tt, o: rateO(S.run.V) * tt, V: S.run.V });
        Sound.tick();
      }
      if (S.run.t >= TMAX) {
        S.on = false;
        if (S.run.V === V_REF) S.base = S.rows.map((r) => Object.assign({}, r));
        toast('8분 동안의 전기 분해가 끝났어요!', 'good', 2000);
        updateUI();
      }
      // 기포: (−)극은 (+)극의 2배
      const eL = rateH(S.run.V) * 11 / 1.0, eR = rateO(S.run.V) * 11 / 1.0;
      acc.L += eL * dt; acc.R += eR * dt;
      while (acc.L >= 1) { acc.L -= 1; if (bubbles.length < 90) bubbles.push({ x: TLX + rnd(-9, 9), y: 346, vy: rnd(50, 80), r: rnd(2.2, 3.6), side: 'L', ph: rnd(0, TAU) }); }
      while (acc.R >= 1) { acc.R -= 1; if (bubbles.length < 90) bubbles.push({ x: TRX + rnd(-9, 9), y: 346, vy: rnd(50, 80), r: rnd(2.2, 3.6), side: 'R', ph: rnd(0, TAU) }); }
    }
    // 비교 관찰 (1단계)
    if (!S.draining && S.on && S.V >= V_START) {
      if (!S.elec) { S.cmp.pure += dt; S.cmp.pureI = curI(); }
      else if (curI() > 0) { S.cmp.elec += dt; S.cmp.elecI = curI(); }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.y -= b.vy * dt; b.x += Math.sin(S.t * 6 + b.ph) * 4 * dt;
      if (b.y <= SURF(b.side) + 2) { bubbles.splice(i, 1); }
    }
    S.funnel = approach(S.funnel, funnelLevel(), dt, 8);
  }

  /* ---------- 장치 그리기 ---------- */
  function glassTube(cx, gasMl, side) {
    const x0 = cx - 28, w = 56, topY = 86;
    const surf = TUBE_TOP + gasMl * ML_PX;
    // 물
    ctx.save();
    D.roundRect(x0 + 5, topY + 4, w - 10, TUBE_BOT - topY, 18); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0, topY, w, TUBE_BOT - topY);
    const wg = ctx.createLinearGradient(0, surf, 0, TUBE_BOT); wg.addColorStop(0, CO.rgba(waterCol(), 0.75)); wg.addColorStop(1, CO.rgba(waterCol(), 0.95));
    ctx.fillStyle = wg; ctx.fillRect(x0, surf, w, TUBE_BOT - surf + 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0, surf - 1, w, 3);
    ctx.restore();
    // 유리
    D.roundRect(x0, topY, w, TUBE_BOT - topY + 4, 22); ctx.strokeStyle = 'rgba(110,135,170,.95)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 9, topY + 20); ctx.lineTo(x0 + 9, TUBE_BOT - 26); ctx.stroke();
    // 눈금 (바깥쪽)
    const dir = side === 'L' ? -1 : 1, bx = side === 'L' ? x0 : x0 + w;
    ctx.strokeStyle = '#5d6879'; ctx.fillStyle = '#5d6879'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= CAP; i++) {
      const y = TUBE_TOP + i * ML_PX, len = i % 2 === 0 ? 11 : 6;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + dir * len, y); ctx.stroke();
      if (i % 2 === 0) TL_(bx + dir * 14, y + 4, String(i), 12.5, '#5d6879', dir < 0 ? 'right' : 'left', 700);
    }
    TL_(bx + dir * 14, TUBE_TOP - 10, 'mL', 12.5, '#5d6879', dir < 0 ? 'right' : 'left', 800);
  }
  function drawGasLabels() {
    [['L', TLX, S.gas.h], ['R', TRX, S.gas.o]].forEach(([k, cx, v]) => {
      const idn = S.id[k];
      if (v * ML_PX > 30) TL_(cx, TUBE_TOP + v * ML_PX / 2 + 5, idn === 'h2' ? 'H₂' : idn === 'o2' ? 'O₂' : '기체', 14, '#5b6b85', 'center', 900);
    });
  }
  function drawElectrode(cx, neg) {
    const g = ctx.createLinearGradient(cx - 9, 0, cx + 9, 0); g.addColorStop(0, '#e8edf4'); g.addColorStop(0.5, '#a9b4c4'); g.addColorStop(1, '#7c8799');
    D.roundRect(cx - 8, 344, 16, 38, 3); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    D.sphere(cx, 386, 5, neg ? ANI : CAT, { gloss: false });
  }
  function drawApparatus() {
    ctx.save(); ctx.translate(OX, OY); ctx.scale(K, K);
    // 연결관 (U자) + 가운데 줄기
    const pipe = (lw, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(TLX, TUBE_BOT - 4); ctx.lineTo(TLX, U_Y); ctx.lineTo(TRX, U_Y); ctx.lineTo(TRX, TUBE_BOT - 4);
      ctx.moveTo(FUNX, 118); ctx.lineTo(FUNX, U_Y); ctx.stroke();
    };
    pipe(20, 'rgba(110,135,170,.9)'); pipe(15, CO.rgba(waterCol(), 0.95));
    // 깔때기(물통)
    const fl = S.funnel || funnelLevel();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(FUNX - 62, 28); ctx.lineTo(FUNX - 62, 100); ctx.quadraticCurveTo(FUNX - 62, 120, FUNX - 30, 122); ctx.lineTo(FUNX + 30, 122); ctx.quadraticCurveTo(FUNX + 62, 120, FUNX + 62, 100); ctx.lineTo(FUNX + 62, 28);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); ctx.save(); ctx.clip();
    ctx.fillStyle = CO.rgba(waterCol(), 0.85); ctx.fillRect(FUNX - 70, fl, 140, 130);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(FUNX - 70, fl - 1, 140, 3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(110,135,170,.95)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    TL_(FUNX, 48, S.elec ? '전해질 수용액' : '순수한 물', 13, '#34507a', 'center', 800);
    glassTube(TLX, S.gas.h, 'L'); glassTube(TRX, S.gas.o, 'R');
    drawGasLabels();
    drawElectrode(TLX, true); drawElectrode(TRX, false);
    // 기포
    bubbles.forEach((b) => {
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke();
    });
    // 마개 + 극 이름
    [[TLX, 'L', '(−)극', ANI], [TRX, 'R', '(+)극', CAT]].forEach(([cx, k, name, col]) => {
      D.roundRect(cx - 9, 70, 18, 16, 3); ctx.fillStyle = '#7c8799'; ctx.fill();
      D.roundRect(cx - 4, 62, 8, 10, 2); ctx.fillStyle = '#4a5363'; ctx.fill();
      const idn = S.id[k];
      const txt = name + (idn ? ' · ' + (idn === 'h2' ? 'H₂' : 'O₂') : '');
      D.label(cx, 40, txt, { size: fs(13 / K), bg: idn ? '#0b6b39' : col });
    });
    // 전선 + 전원 장치
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [WIRE_L, WIRE_R].forEach((P) => {
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#3d4657'; ctx.lineWidth = 6; ctx.stroke();
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 2.5; ctx.stroke();
    });
    const I = curI();
    if (I > 0 && !S.draining) {
      [PWL, PWR].forEach((pi) => {
        const n = Math.floor(pi.len / 26);
        for (let k = 0; k < n; k++) { const pt = atPath(pi, (S.phase + k * 26) % pi.len); D.sphere(pt[0], pt[1], 4.2, ELEC, { gloss: false, outline: 'rgba(120,70,0,.5)', outlineWidth: 1 }); }
      });
    }
    drawSupply(I);
    ctx.restore();
  }
  function drawSupply(I) {
    const s = SUP;
    D.shadow(() => { D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fillStyle = '#2f3a4d'; ctx.fill(); }, { blur: 8, y: 3 });
    const g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h); g.addColorStop(0, '#46546e'); g.addColorStop(1, '#2b3649');
    D.roundRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6, 10); ctx.fillStyle = g; ctx.fill();
    D.sphere(s.x + 35, s.y, 7, ANI, { gloss: false }); D.sphere(s.x + s.w - 35, s.y, 7, CAT, { gloss: false });
    TL_(s.x + 35, s.y + 22, '−', 18, '#fff', 'center', 900); TL_(s.x + s.w - 35, s.y + 22, '+', 18, '#fff', 'center', 900);
    // 표시창
    const disp = (x, w, a, b) => {
      D.roundRect(x, s.y + 26, w, 40, 6); ctx.fillStyle = '#10202f'; ctx.fill();
      TL_(x + w / 2, s.y + 40, a, 11, '#8fb6d9', 'center', 700);
      TL_(x + w / 2, s.y + 60, b, 14.5, '#7dffb2', 'center', 900);
    };
    disp(s.x + 14, 62, '전압', S.V + ' V');
    disp(s.x + 82, 92, '전류', I + ' mA');
    disp(s.x + 180, 66, '시간', f1(S.run.t) + '분');
    // 스위치
    const on = S.on;
    D.roundRect(s.x + 14, s.y + 72, 40, 12, 6); ctx.fillStyle = on ? '#14a058' : '#6b7588'; ctx.fill();
    D.sphere(s.x + (on ? 46 : 22), s.y + 78, 7, '#fff', { gloss: false });
    TL_(s.x + 62, s.y + 83, on ? '켜짐' : '꺼짐', 12.5, on ? '#7dffb2' : '#c3ccd9', 'left', 800);
  }

  /* ---------- 오른쪽(아래) 패널 ---------- */
  const PN = PHONE
    ? { x: 16, w: VW - 32, inY: 452, inH: 140, bY: 600, bH: 196, tY: 804, tH: 108 }
    : { x: 454, w: 330, inY: 14, inH: 150, bY: 174, bH: 212, tY: 396, tH: 150 };
  // 이온 모형 (작은 창)
  const ions = [];
  function buildIons() {
    ions.length = 0;
    const w = PN.w, h = PN.inH;
    for (let i = 0; i < 16; i++) ions.push({ k: 'w', x: rnd(18, w - 18), y: rnd(34, h - 14), vx: rnd(-14, 14), vy: rnd(-14, 14), a: rnd(0, TAU) });
    for (let i = 0; i < 6; i++) ions.push({ k: 'na', x: rnd(18, w - 18), y: rnd(34, h - 14), vx: rnd(-18, 18), vy: rnd(-18, 18), a: 0 });
    for (let i = 0; i < 3; i++) ions.push({ k: 'so4', x: rnd(18, w - 18), y: rnd(34, h - 14), vx: rnd(-18, 18), vy: rnd(-18, 18), a: 0 });
  }
  buildIons();
  function stepIons(dt) {
    const w = PN.w, h = PN.inH, I = curI(), dr = I > 0 ? 14 : 0;
    ions.forEach((p) => {
      if (Math.random() < 2 * dt) { const a = Math.random() * TAU, sp = p.k === 'w' ? rnd(8, 18) : rnd(14, 30); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
      let d = 0; if (p.k === 'na') d = -dr; if (p.k === 'so4') d = dr;
      p.x += (p.vx + d) * dt; p.y += p.vy * dt; p.a += dt * 0.6;
      const r = p.k === 'w' ? 7 : p.k === 'na' ? 10 : 15, lo = 24 + r - 7, hi = w - 24 - r + 7;
      if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx); } if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx); }
      if (p.y < 34 + r) { p.y = 34 + r; p.vy = Math.abs(p.vy); } if (p.y > h - 8 - r) { p.y = h - 8 - r; p.vy = -Math.abs(p.vy); }
    });
  }
  function drawInset() {
    const x = PN.x, y = PN.inY, w = PN.w, h = PN.inH;
    panel(x, y, w, h, 14, '#fff', '#e3dcf5');
    T(x + 12, y + 22, '🔍 입자 모형으로 보기', 14, '#4c1d95', 'left', 900);
    T(x + w - 12, y + 22, S.elec ? 'Na₂SO₄ 수용액' : '순수한 물', 13, MUTED, 'right', 800);
    ctx.save(); D.roundRect(x + 10, y + 32, w - 20, h - 42, 10); ctx.clip();
    ctx.fillStyle = CO.rgba(waterCol(), 0.7); ctx.fillRect(x, y + 30, w, h);
    // 극판
    const plate = (px, c, lab) => { ctx.fillStyle = c; ctx.fillRect(px, y + 32, 14, h - 42); };
    plate(x + 10, ANI); plate(x + w - 24, CAT);
    ctx.restore();
    T(x + 17, y + 46, '−', 15, '#fff', 'center', 900); T(x + w - 17, y + 46, '+', 15, '#fff', 'center', 900);
    ions.forEach((p) => {
      if (p.k === 'w') { ctx.save(); ctx.translate(x + p.x, y + p.y); ctx.rotate(p.a); D.sphere(0, 0, 4.4, '#7fb6e8', { gloss: false }); D.sphere(-4.4, 3, 2.4, '#fff', { gloss: false, outline: 'rgba(80,120,170,.5)', outlineWidth: 0.7 }); D.sphere(4.4, 3, 2.4, '#fff', { gloss: false, outline: 'rgba(80,120,170,.5)', outlineWidth: 0.7 }); ctx.restore(); }
      else if (!S.elec) return;
      else if (p.k === 'na') D.sphere(x + p.x, y + p.y, 9, CAT, { text: '+', textScale: 1.1, outline: 'rgba(110,30,20,.5)', outlineWidth: 1 });
      else D.sphere(x + p.x, y + p.y, 14, ANI, { text: '2−', textScale: 0.9, outline: 'rgba(20,40,120,.5)', outlineWidth: 1 });
    });
    const msg = S.elec ? (curI() > 0 ? '이온(Na⁺, SO₄²⁻)이 이동해 전류가 흘러요' : '이온이 많아서 전류가 흐를 수 있어요') : '물 분자뿐, 이온이 거의 없어요';
    D.label(x + w / 2, y + h - 16, msg, { size: fs(12.5), bg: 'rgba(27,35,51,.85)' });
  }
  function drawInfoCard() {
    const x = PN.x, y = PN.bY, w = PN.w, h = PN.bH;
    panel(x, y, w, h, 14, '#fff', '#e3dcf5');
    T(x + 12, y + 24, '⚡ 전류계로 전류 확인', 14.5, '#4c1d95', 'left', 900);
    const I = curI();
    D.label(x + w / 2, y + 62, S.on ? (S.elec ? '전해질 수용액' : '순수한 물') + ' · ' + S.V + ' V · ' + I + ' mA' : '전원이 꺼져 있어요', { size: fs(16), bg: I > 0 ? GOOD : '#6b7588' });
    const lines = !S.on ? '전원을 켜고 순수한 물과 전해질 수용액에서 전류가 어떻게 다른지 비교해요. 전압은 3 V 이상이어야 분해가 시작돼요.' :
      !S.elec ? '순수한 물에는 이온이 거의 없어서 전류가 거의 흐르지 않고 기포도 생기지 않아요.' :
        S.V < V_START ? '전압이 ' + V_START + ' V보다 낮으면 물이 분해되지 않아요. 전압을 올려 보세요.' : '전해질에서 생긴 이온이 전하를 나르고, 두 극에서 기체 기포가 생겨요.';
    textBlock(x + 14, y + 100, w - 28, lines, 14, INK, 21, 700);
    T(x + 14, y + h - 14, '🥽 보안경 · 실험복 · 화기 금지', 13, '#b45309', 'left', 800);
  }
  function drawTable() {
    const x = PN.x, y = PN.bY, w = PN.w, h = PN.bH;
    panel(x, y, w, h, 14, '#fff', '#e3dcf5');
    T(x + 12, y + 24, '📋 기록표 · 기체 부피 (2분마다 자동 기록)', 14, '#4c1d95', 'left', 900);
    const cs = [x + 44, x + w * 0.38, x + w * 0.62, x + w * 0.86];
    const hl = S.id.L === 'h2' ? 'H₂' : '(−)극', hr = S.id.R === 'o2' ? 'O₂' : '(+)극';
    const hy = y + 52;
    T(cs[0], hy, '시간(분)', 12.5, MUTED, 'center', 800); T(cs[1], hy, hl + ' (mL)', 12.5, MUTED, 'center', 800); T(cs[2], hy, hr + ' (mL)', 12.5, MUTED, 'center', 800); T(cs[3], hy, '부피비', 12.5, MUTED, 'center', 800);
    const rh = 28;
    for (let i = 0; i < 4; i++) {
      const ry = y + 62 + i * rh, r = S.rows[i], tgt = 2 * (i + 1);
      D.roundRect(x + 8, ry, w - 16, rh - 3, 7); ctx.fillStyle = i % 2 ? 'rgba(139,92,246,.04)' : 'rgba(139,92,246,.09)'; ctx.fill();
      T(cs[0], ry + 19, String(tgt), 14, r ? INK : '#a2abb9', 'center', 800);
      if (r) {
        T(cs[1], ry + 19, f1(r.h), 15, INK, 'center', 900); T(cs[2], ry + 19, f1(r.o), 15, INK, 'center', 900);
        T(cs[3], ry + 19, f1(r.h / r.o) + ' : 1', 14, '#4c1d95', 'center', 900);
      } else { ['—', '—', '—'].forEach((s, k) => T(cs[k + 1], ry + 19, s, 14, '#c3cad6', 'center', 700)); }
    }
    const ty = y + 62 + 4 * rh + 8;
    const t = S.run.t;
    D.roundRect(x + 14, ty + 8, w - 28, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill();
    if (t > 0.01) { D.roundRect(x + 14, ty + 8, Math.max(10, (w - 28) * t / TMAX), 10, 5); ctx.fillStyle = S.run.V === V_REF ? '#8b5cf6' : '#a78bfa'; ctx.fill(); }
    T(x + 14, ty + 38, '⏱ 경과 시간 ' + f1(t) + ' / ' + TMAX + '분', 13.5, INK, 'left', 800);
    T(x + w - 14, ty + 38, S.run.V != null ? '실험 전압 ' + S.run.V + ' V' : '전압 ' + S.V + ' V', 13.5, S.run.V === V_REF || (S.run.V == null && S.V === V_REF) ? '#0b6b39' : '#b45309', 'right', 800);
  }
  // 기체 확인 도구
  const TOOLS = PHONE
    ? [{ id: 'match', name: '성냥불', hx: PN.x + 100, hy: PN.tY + 66 }, { id: 'splint', name: '꺼져 가는 불씨', hx: PN.x + PN.w - 120, hy: PN.tY + 66 }]
    : [{ id: 'match', name: '성냥불', hx: PN.x + 84, hy: PN.tY + 108 }, { id: 'splint', name: '꺼져 가는 불씨', hx: PN.x + PN.w - 96, hy: PN.tY + 108 }];
  TOOLS.forEach((t) => { t.x = t.hx; t.y = t.hy; t.drag = false; t.lift = 0; t.at = null; });
  const tubeTip = (k) => LP(k === 'L' ? TLX : TRX, 64);       // 마개(꼭지) 위치 (canvas)
  const toolsOn = () => (gameLevel() >= 1 || isFree());
  function drawTool(t) {
    const x = t.x, y = t.y, lift = t.lift;
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.55); ctx.scale(1 + 0.12 * lift, 1 + 0.12 * lift);
    // 막대 (끝이 (0,0)이고 아래쪽으로 뻗어요)
    ctx.shadowColor = 'rgba(0,0,0,' + (0.18 + 0.15 * lift) + ')'; ctx.shadowBlur = 6 + 8 * lift; ctx.shadowOffsetY = 3 + 5 * lift;
    D.roundRect(-3, 0, 6, 64, 3); ctx.fillStyle = t.id === 'match' ? '#d9b27a' : '#c49a64'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.restore();
    const lit = t.lit || 0;
    if (t.id === 'match') {
      // 성냥 머리와 불꽃
      D.sphere(x, y, 4.6, '#d6453d', { gloss: false });
      if (lit > 0.02) D.flame(x, y - 3, 30 * lit * (t.big ? 1.5 : 1), S.t, { glow: '#ffa733' });
    } else {
      // 향 막대의 불씨
      D.glow(x, y, 20 + 8 * (t.ember || 0.5), '#ff7a1a', 0.45 * (t.ember != null ? t.ember : 0.5) + 0.1);
      D.sphere(x, y, 4, t.ember > 0.05 || t.ember == null ? '#ff8a3d' : '#5a4a3a', { gloss: false });
      if (t.flame > 0.02) D.flame(x, y - 3, 34 * t.flame, S.t, { glow: '#ffa733' });
    }
  }
  function drawTools() {
    const x = PN.x, y = PN.tY, w = PN.w, h = PN.tH;
    panel(x, y, w, h, 14, '#fff', '#e3dcf5');
    T(x + 12, y + 24, '🧰 기체 확인 도구 (끌어서 꼭지에 가져가요)', 14, '#4c1d95', 'left', 900);
    TOOLS.forEach((t) => { T(t.hx, t.hy + (PHONE ? 38 : 34), t.name, 13, MUTED, 'center', 800); });
    const msg = S.testMsg || '기체가 1 mL 이상 모이면 꼭지에 도구를 가까이 해 봐요. (꼭지에서 아주 조금만 뽑아 시험해요)';
    if (!PHONE) textBlock(x + 14, y + 46, w - 28, msg, 13, S.testMsg ? INK : MUTED, 18, 700);
    else textBlock(x + 14, y + 44, w - 28, msg, 13, S.testMsg ? INK : MUTED, 17, 700);
    // 꼭지 표시 (도구를 끌 때)
    TOOLS.forEach((t) => {
      if (t.drag) ['L', 'R'].forEach((k) => { const p = tubeTip(k); D.ring(p[0], p[1] - 4, 22, S.t, { color: '#8b5cf6' }); });
    });
    TOOLS.forEach((t) => drawTool(t));
  }
  function toolSet(t, dt) {
    if (S.test && S.test.tool === t.id) return;
    if (!t.drag) { t.x = approach(t.x, t.hx, dt, 10); t.y = approach(t.y, t.hy, dt, 10); }
    t.lift = approach(t.lift, t.drag ? 1 : 0, dt, 14);
    t.lit = approach(t.lit || 0, t.drag ? 1 : 0, dt, 12); t.big = false; t.ember = 0.5; t.flame = 0;
  }
  function startTest(toolId, side) {
    const t = TOOLS.find((q) => q.id === toolId);
    const gas = side === 'L' ? S.gas.h : S.gas.o;
    if (gas < 1) { showHint('기체가 1 mL 이상 모여야 시험할 수 있어요.', 3200); Sound.fail(); return false; }
    const kind = toolId === 'match' ? (side === 'L' ? 'pop' : 'bright') : (side === 'R' ? 'relight' : 'out');
    S.test = { tool: toolId, side, t0: S.t, kind, state: 'go', done: false };
    t.drag = false; t.lit = 1;
    return true;
  }
  function testStep(dt) {
    const te = S.test; if (!te) return;
    const t = TOOLS.find((q) => q.id === te.tool), tp = tubeTip(te.side);
    const age = S.t - te.t0;
    if (age < 0.5) { t.x = approach(t.x, tp[0], dt, 12); t.y = approach(t.y, tp[1] - 2, dt, 12); }
    else if (age >= 0.5 && !te.done && age < 2.4) {
      t.x = tp[0]; t.y = tp[1] - 2;
      if (te.kind === 'pop') { t.lit = clamp(1 - (age - 0.5) * 6, 0, 1); }
      else if (te.kind === 'bright') { t.big = true; }
      else if (te.kind === 'relight') { t.ember = 1; t.flame = clamp((age - 0.7) * 2, 0, 1); }
      else if (te.kind === 'out') { t.ember = clamp(0.5 - (age - 0.5) * 0.5, 0, 1); }
    }
    if (age >= 0.6 && !te.fired) {
      te.fired = true;
      if (te.kind === 'pop') {
        Sound.tone(160, 0.2, 'sawtooth', 0.16); Sound.tone(420, 0.12, 'square', 0.08, 0.02);
        fx.burst(tp[0], tp[1] - 8, { count: 14, colors: ['#fff3b0', '#ffb400', '#ffffff'], speed: 170, size: 3.4, gravity: 40, life: 0.5 });
        S.id.L = 'h2'; S.testMsg = '성냥불을 가까이 하자 "퍽!" 소리가 났어요 → (−)극 기체는 수소(H₂)예요.';
      } else if (te.kind === 'relight') {
        Sound.success(); fx.burst(tp[0], tp[1] - 10, { count: 10, colors: ['#ffd34d', '#ffffff', '#ff9a3c'], speed: 110, size: 3, gravity: -30, life: 0.7 });
        S.id.R = 'o2'; S.testMsg = '꺼져 가는 불씨가 다시 활활 타올랐어요 → (+)극 기체는 산소(O₂)예요.';
      } else if (te.kind === 'bright') {
        S.testMsg = '성냥불이 더 밝게 탔어요. 산소가 불을 타오르게 하는 기체일 수 있어요. 꺼져 가는 불씨로도 확인해 봐요.'; Sound.click();
      } else { S.testMsg = '불씨가 꺼졌어요. 이 기체는 불이 타는 것을 돕지 않아요. 성냥불로도 확인해 봐요.'; Sound.fail(); }
      S.tests[te.tool + ':' + te.side] = true;
      updateUI();
    }
    if (age >= 2.4) { t.lit = 0; t.big = false; t.ember = 0.5; t.flame = 0; S.test = null; }
  }
  function drawTestEffects() {
    const te = S.test; if (!te) return;
    const age = S.t - te.t0, tp = tubeTip(te.side);
    if (te.kind === 'pop' && age > 0.6 && age < 1.2) {
      const k = (age - 0.6) / 0.6; ctx.globalAlpha = 1 - k;
      D.ring(tp[0], tp[1] - 8, 20 + 40 * k, 0, { color: '#ffb400', width: 4 });
      T(tp[0], tp[1] - 34 - 14 * k, '퍽!', 24, '#b45309', 'center', 900, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 5 });
      ctx.globalAlpha = 1;
    } else if (te.kind === 'relight' && age > 0.8 && age < 2.2) {
      T(tp[0], tp[1] - 52, '활활!', 20, '#b45309', 'center', 900, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 5 });
    }
  }

  /* =========================================================
     ③ 그래프
     ========================================================= */
  const GR = PHONE
    ? { x: 56, y: 54, w: 392, h: 262 }
    : { x: 66, y: 50, w: 420, h: 368 };
  const GP = PHONE
    ? { x: 16, y: 378, w: VW - 32 }
    : { x: 516, y: 20, w: 268 };
  const gX = (t) => GR.x + (t / TMAX) * GR.w, gY = (v) => GR.y + GR.h - (v / 10) * GR.h;
  const slopeOf = (key) => (S.base ? S.base[S.base.length - 1][key] / S.base[S.base.length - 1].t : 0);
  const ratioTxt = () => { const a = slopeOf('h'), b = slopeOf('o'); return b > 0 ? a / b : 0; };
  function drawGraph() {
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    panel(GR.x - 52, GR.y - 28, GR.w + 76, GR.h + 82, 14, '#fff', '#e3dcf5');
    T(GR.x - 40, GR.y - 18, '기체 부피 (mL)', 13, MUTED, 'left', 800);
    // 격자 + 눈금
    ctx.strokeStyle = 'rgba(140,150,175,.28)'; ctx.lineWidth = 1;
    for (let v = 0; v <= 10; v += 2) { ctx.beginPath(); ctx.moveTo(GR.x, gY(v)); ctx.lineTo(GR.x + GR.w, gY(v)); ctx.stroke(); T(GR.x - 8, gY(v) + 4, String(v), 13, MUTED, 'right', 700); }
    for (let t = 0; t <= TMAX; t += 2) { ctx.beginPath(); ctx.moveTo(gX(t), GR.y); ctx.lineTo(gX(t), GR.y + GR.h); ctx.stroke(); T(gX(t), GR.y + GR.h + 18, String(t), 13, MUTED, 'center', 700); }
    T(GR.x + GR.w, GR.y + GR.h + 38, '시간 (분)', 13, MUTED, 'right', 800);
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GR.x, GR.y); ctx.lineTo(GR.x, GR.y + GR.h); ctx.lineTo(GR.x + GR.w, GR.y + GR.h); ctx.stroke();
    if (!S.base) { T(GR.x + GR.w / 2, GR.y + GR.h / 2, '앞 단계에서 9 V로 8분 실험을 하면 그래프가 그려져요', 14, MUTED, 'center', 800); }
    else {
      const lineFor = (key, prog, col, name) => {
        const pts = [[0, 0]].concat(S.base.map((r) => [r.t, r[key]]));
        const n = pts.length - 1, upto = prog * n;
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gX(0), gY(0));
        for (let i = 1; i <= n; i++) {
          const f = clamp(upto - (i - 1), 0, 1); if (f <= 0) break;
          const a = pts[i - 1], b = pts[i]; ctx.lineTo(gX(a[0] + (b[0] - a[0]) * f), gY(a[1] + (b[1] - a[1]) * f));
        }
        ctx.stroke();
        pts.forEach((p, i) => {
          if (i > upto + 1e-6) return;
          const pop = clamp((upto - i) * 3 + 1, 0, 1);
          D.sphere(gX(p[0]), gY(p[1]), 5.5 * (0.5 + 0.5 * pop), col, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
        });
        if (prog > 0.98) { const e = pts[n]; D.label(gX(e[0]) - 6, gY(e[1]) - 18, name + ' ' + f1(e[1]) + ' mL', { size: fs(13), bg: col, align: 'right' }); }
      };
      lineFor('h', S.gr.h, H_COL === '#8fa3d9' ? '#4f6bd8' : H_COL, 'H₂');
      lineFor('o', S.gr.o, '#e2574c', 'O₂');
    }
    // 오른쪽(아래): 기울기 카드
    const x = GP.x, w = GP.w; let y = GP.y;
    const card = (h, title, body, ok) => {
      panel(x, y, w, h, 14, '#fff', ok ? '#9bdcb8' : '#e3dcf5');
      T(x + 12, y + 22, title, 13.5, '#4c1d95', 'left', 900);
      body && body(x + 12, y + 44);
      y += h + 8;
    };
    const sH = slopeOf('h'), sO = slopeOf('o'), lastT = S.base ? S.base[S.base.length - 1].t : TMAX;
    const lastH = S.base ? S.base[S.base.length - 1].h : 0, lastO = S.base ? S.base[S.base.length - 1].o : 0;
    card(74, 'H₂ 그래프의 기울기', (bx, by) => { T(bx, by + 6, S.gr.hd ? f1(lastH) + ' mL ÷ ' + lastT + ' 분 = ' + f1(sH) + ' mL/분' : '그래프를 그리면 나타나요', 14.5, S.gr.hd ? INK : '#a2abb9', 'left', 800); }, S.gr.hd);
    card(74, 'O₂ 그래프의 기울기', (bx, by) => { T(bx, by + 6, S.gr.od ? f1(lastO) + ' mL ÷ ' + lastT + ' 분 = ' + f1(sO) + ' mL/분' : '그래프를 그리면 나타나요', 14.5, S.gr.od ? INK : '#a2abb9', 'left', 800); }, S.gr.od);
    const okR = S.gr.pick === '2:1';
    card(74, '기울기의 비 H₂ : O₂', (bx, by) => { T(bx, by + 6, okR ? f1(sH) + ' : ' + f1(sO) + ' = 2 : 1' : S.gr.pick ? '다시 계산해 보세요 (' + f1(sH) + ' ÷ ' + f1(sO) + ')' : '아래에서 골라요', 14.5, okR ? '#0b6b39' : S.gr.pick ? BAD : '#a2abb9', 'left', 800); }, okR);
    if (okR || isFree()) {
      const h = PHONE ? 150 : 148;
      panel(x, y, w, h, 14, '#f3effd', '#c9bfe8');
      T(x + 12, y + 22, '🔗 계수비 = 부피비 = 몰수비', 13.5, '#4c1d95', 'left', 900);
      T(x + w / 2, y + 52, '2H₂O → 2H₂ + O₂', 18, INK, 'center', 900);
      textBlock(x + 12, y + 76, w - 24, '같은 온도 · 압력에서 기체의 부피비 = 몰수비 = 반응식의 계수비 예요. H₂ : O₂ = 2 : 1', 13, INK, 18, 700);
    }
  }

  /* =========================================================
     ④ 입자 모형 (2H₂O → 2H₂ + O₂)
     ========================================================= */
  const MC = PHONE
    ? { x0: 52, x1: VW - 52, y0: 92, y1: 430 }
    : { x0: 64, x1: VW - 64, y0: 78, y1: 346 };
  const SC = PHONE ? 1.0 : 1.3;                   // 원자 크기 배율
  const R_O = 17 * SC, R_H = 10 * SC;
  function buildAtoms() {
    const W = MC.x1 - MC.x0, H = MC.y1 - MC.y0, cx = (MC.x0 + MC.x1) / 2, cy = (MC.y0 + MC.y1) / 2 - 6;
    const d = 34 * SC, ax = Math.sin(52.25 * Math.PI / 180) * d, ay = Math.cos(52.25 * Math.PI / 180) * d;
    const sep = PHONE ? 78 : 116;
    const A = [
      { id: 'OA', el: 'O', P0: [cx - sep, cy - 10 * SC] },
      { id: 'HA1', el: 'H', P0: [cx - sep - ax, cy - 10 * SC + ay] },
      { id: 'HA2', el: 'H', P0: [cx - sep + ax, cy - 10 * SC + ay] },
      { id: 'OB', el: 'O', P0: [cx + sep, cy - 10 * SC] },
      { id: 'HB1', el: 'H', P0: [cx + sep - ax, cy - 10 * SC + ay] },
      { id: 'HB2', el: 'H', P0: [cx + sep + ax, cy - 10 * SC + ay] },
    ];
    const fh = PHONE ? 0.16 : 0.13, fo = PHONE ? 0.84 : 0.87;
    const h1 = [MC.x0 + W * fh, cy - H * 0.2], h2 = [MC.x0 + W * fh, cy + H * 0.2], o2 = [MC.x0 + W * fo, cy];
    const hb = 15 * SC, ob = 19 * SC;
    const fin = { HA1: [h1[0] - hb, h1[1]], HA2: [h1[0] + hb, h1[1]], HB1: [h2[0] - hb, h2[1]], HB2: [h2[0] + hb, h2[1]], OA: [o2[0] - ob, o2[1]], OB: [o2[0] + ob, o2[1]] };
    A.forEach((a) => {
      a.P3 = fin[a.id];
      const own = a.id[0] === 'O' ? a.P0 : (a.id[1] === 'A' ? A[0].P0 : A[3].P0);
      a.P1 = a.el === 'H' ? [own[0] + (a.P0[0] - own[0]) * 1.55, own[1] + (a.P0[1] - own[1]) * 1.55] : a.P0.slice();
      const k = 0.55; a.P2 = [a.P1[0] + (a.P3[0] - a.P1[0]) * k, a.P1[1] + (a.P3[1] - a.P1[1]) * k + (a.el === 'H' ? (a.id.endsWith('1') ? -14 : 14) * SC : (a.id === 'OA' ? -16 : 16) * SC)];
    });
    return A;
  }
  const ATOMS = buildAtoms();
  const ABY = {}; ATOMS.forEach((a) => { ABY[a.id] = a; });
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function atomPos(a, t) {
    const seg = Math.min(2, Math.floor(t * 3)), f = smooth(t * 3 - seg);
    const P = [a.P0, a.P1, a.P2, a.P3];
    return [P[seg][0] + (P[seg + 1][0] - P[seg][0]) * f, P[seg][1] + (P[seg + 1][1] - P[seg][1]) * f];
  }
  const STAGES = ['① 물 분자 2개', '② O–H 결합이 끊어져요', '③ 새 짝을 찾아요', '④ H₂ 2개 + O₂ 1개'];
  const stageOf = (t) => (t < 0.17 ? 0 : t < 0.5 ? 1 : t < 0.85 ? 2 : 3);
  const MP = PHONE ? { y: 472 } : { y: 394 };
  const mWire = () => ({ y: PHONE ? 52 : 40, xl: MC.x0 + 7, xr: MC.x1 - 7, bl: VW / 2 - 52, br: VW / 2 + 52 });
  function drawBond(p, q, a, dbl, col, dash) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col || '#5d6879'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash([7, 6]);
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const offs = dbl ? [-3.2 * SC, 3.2 * SC] : [0];
    offs.forEach((o) => { ctx.lineWidth = (dbl ? 3 : 5) * SC; ctx.beginPath(); ctx.moveTo(p[0] + nx * o, p[1] + ny * o); ctx.lineTo(q[0] + nx * o, q[1] + ny * o); ctx.stroke(); });
    ctx.restore();
  }
  function drawModel() {
    const t = S.m.t, W = MC.x1 - MC.x0, H = MC.y1 - MC.y0, wr = mWire();
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    // 전선 + 전지
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wire = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#3d4657'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 2.5; ctx.stroke(); };
    wire([[wr.bl, wr.y], [wr.xl, wr.y], [wr.xl, MC.y0 - 4]]); wire([[wr.br, wr.y], [wr.xr, wr.y], [wr.xr, MC.y0 - 4]]);
    ctx.restore();
    D.shadow(() => { D.roundRect(wr.bl, wr.y - 17, wr.br - wr.bl, 34, 8); ctx.fillStyle = '#2b3a52'; ctx.fill(); }, { blur: 8, y: 3 });
    T(wr.bl + 10, wr.y + 1, '−', 22, '#fff', 'center', 900, { baseline: 'middle' }); T(wr.br - 10, wr.y + 1, '+', 22, '#fff', 'center', 900, { baseline: 'middle' }); T(VW / 2, wr.y + 1, '전지', 13.5, '#fff', 'center', 800, { baseline: 'middle' });
    const on = t > 0.04 && t < 0.97;
    if (on) {
      const pl = pathInfo([[wr.bl, wr.y], [wr.xl, wr.y], [wr.xl, MC.y0 - 4]]), pr = pathInfo([[wr.xr, MC.y0 - 4], [wr.xr, wr.y], [wr.br, wr.y]]);
      const ph = (S.t * 90) % 26;
      [pl, pr].forEach((pi) => { for (let k = 0; k < Math.floor(pi.len / 26); k++) { const pt = atPath(pi, (ph + k * 26) % pi.len); D.sphere(pt[0], pt[1], 4, ELEC, { gloss: false, outline: 'rgba(120,70,0,.5)', outlineWidth: 1 }); } });
    }
    // 용기: 물 + 두 극
    const wg = ctx.createLinearGradient(0, MC.y0, 0, MC.y1); wg.addColorStop(0, 'rgba(185,220,251,.55)'); wg.addColorStop(1, 'rgba(160,205,245,.85)');
    ctx.fillStyle = wg; ctx.fillRect(MC.x0, MC.y0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(MC.x0, MC.y0, W, 3);
    D.roundRect(MC.x0 - 14, MC.y1, W + 28, 10, 4); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    const plate = (x, neg) => { const c = neg ? ANI : CAT; const gg = ctx.createLinearGradient(x, 0, x + 14, 0); gg.addColorStop(0, CO.shade(c, 0.25)); gg.addColorStop(1, CO.shade(c, -0.25)); D.shadow(() => { D.roundRect(x, MC.y0 - 6, 14, H + 10, 4); ctx.fillStyle = gg; ctx.fill(); }, { blur: 5, y: 2 }); };
    plate(MC.x0 - 14, true); plate(MC.x1, false);
    T(MC.x0 - 7, MC.y1 + 30, '(−)극', 13.5, ANI, 'center', 900); T(MC.x1 + 7, MC.y1 + 30, '(+)극', 13.5, CAT, 'center', 900);
    // 결합선 (원자 아래)
    const P = {}; ATOMS.forEach((a) => { P[a.id] = atomPos(a, t); });
    const bOH = t < 0.17 ? 1 : clamp(1 - (t - 0.17) / 0.4, 0, 1), bNew = clamp((t - 0.7) / 0.28, 0, 1), dsh = t > 0.12;
    drawBond(P.OA, P.HA1, bOH, false, null, dsh); drawBond(P.OA, P.HA2, bOH, false, null, dsh); drawBond(P.OB, P.HB1, bOH, false, null, dsh); drawBond(P.OB, P.HB2, bOH, false, null, dsh);
    drawBond(P.HA1, P.HA2, bNew, false, '#4f6bd8'); drawBond(P.HB1, P.HB2, bNew, false, '#4f6bd8'); drawBond(P.OA, P.OB, bNew, true, '#b8352c');
    // 에너지 번쩍임 (결합이 끊어지는 순간)
    if (t > 0.15 && t < 0.5) { const k = Math.sin((t - 0.15) / 0.35 * Math.PI); [ABY.OA, ABY.OB].forEach((a) => D.glow(P[a.id][0], P[a.id][1], 56 * SC * (0.6 + k * 0.6), '#ffd34d', 0.5 * k)); }
    // 원자
    ATOMS.forEach((a) => {
      const p = P[a.id];
      if (a.el === 'O') D.sphere(p[0], p[1], R_O, O_COL, { text: 'O', textScale: 1.05, shadow: true, outline: 'rgba(110,30,20,.5)', outlineWidth: 1.2 });
      else D.sphere(p[0], p[1], R_H, '#ffffff', { text: 'H', textScale: 1.1, textColor: '#2f4a8a', shadow: true, outline: '#7d8aa0', outlineWidth: 1.4 });
    });
    // 분자 이름 표시
    if (t < 0.12) { T(P.OA[0], P.OA[1] + 52 * SC, 'H₂O', 15, '#34507a', 'center', 900); T(P.OB[0], P.OB[1] + 52 * SC, 'H₂O', 15, '#34507a', 'center', 900); }
    if (t > 0.96) {
      T((P.HA1[0] + P.HA2[0]) / 2, P.HA1[1] - 24 * SC, 'H₂', 16, '#2f4a8a', 'center', 900); T((P.HB1[0] + P.HB2[0]) / 2, P.HB1[1] + 34 * SC, 'H₂', 16, '#2f4a8a', 'center', 900);
      T((P.OA[0] + P.OB[0]) / 2, P.OA[1] - 30 * SC, 'O₂', 16, '#b8352c', 'center', 900);
    }
    // 전자 이동 안내 (정성적)
    if (t > 0.72) {
      const al = clamp((t - 0.72) / 0.2, 0, 1); ctx.globalAlpha = al;
      textBlock(MC.x0 + 10, MC.y0 + 20, PHONE ? 130 : 190, '(−)극에서 물이 전자를 받아 H₂가 생겨요', 12.5, '#1d3a8a', 17, 800);
      textBlock(MC.x1 - (PHONE ? 140 : 200), MC.y0 + 20, PHONE ? 130 : 190, '(+)극에서 물이 전자를 내놓아 O₂가 생겨요', 12.5, '#8a1d17', 17, 800);
      ctx.globalAlpha = 1;
    }
    // 단계 칩
    const st = stageOf(t), cw = (W + 28 - (PHONE ? 8 : 24)) / (PHONE ? 2 : 4), cx0 = MC.x0 - 14;
    STAGES.forEach((s, i) => {
      const col = PHONE ? i % 2 : i, row = PHONE ? Math.floor(i / 2) : 0, x = cx0 + col * (cw + 8), y = MP.y + row * 52;
      const on2 = i === st;
      D.roundRect(x, y, cw, 44, 12); ctx.fillStyle = on2 ? '#f3effd' : '#fff'; ctx.fill(); ctx.strokeStyle = on2 ? '#8b5cf6' : '#e3dcf5'; ctx.lineWidth = on2 ? 2.5 : 1.5; ctx.stroke();
      const nl = wrap(s, cw - 12, 13.5, on2 ? 900 : 700).length;
      textBlock(x + cw / 2, y + 27 - (nl - 1) * 8.5, cw - 12, s, 13.5, on2 ? '#4c1d95' : MUTED, 17, on2 ? 900 : 700, 'center');
    });
    // 원자 수 + 반응식
    const by = MP.y + (PHONE ? 112 : 54);
    const nH = ATOMS.filter((a) => a.el === 'H').length, nO = ATOMS.filter((a) => a.el === 'O').length;
    panel(cx0, by, W + 28, PHONE ? 150 : 100, 14, '#fff', '#e3dcf5');
    T(cx0 + 16, by + 26, '원자 수 보존', 14, '#4c1d95', 'left', 900);
    D.sphere(cx0 + 40, by + 54, 10, '#ffffff', { text: 'H', textScale: 1.1, textColor: '#2f4a8a', outline: '#7d8aa0', outlineWidth: 1.4, gloss: false });
    T(cx0 + 56, by + 60, '수소 원자 ' + nH + '개', 15, INK, 'left', 900);
    D.sphere(cx0 + 40, by + 82, 11, O_COL, { text: 'O', textScale: 1.0, outline: 'rgba(110,30,20,.5)', outlineWidth: 1.2, gloss: false });
    T(cx0 + 56, by + 88, '산소 원자 ' + nO + '개', 15, INK, 'left', 900);
    const ex = PHONE ? cx0 + 16 : cx0 + 250, ey = PHONE ? by + 118 : by + 56;
    T(ex, ey, '2H₂O → 2H₂ + O₂', 20, '#4c1d95', 'left', 900);
    T(ex, ey + 22, '반응 전후 원자의 종류와 수는 그대로예요', 13, MUTED, 'left', 700);
  }

  /* ---------- 장면 / 전체 UI ---------- */
  const SCENE_LABEL = { lab: '⚡ 호프만 전기 분해 장치', graph: '📈 시간 – 부피 그래프', model: '🔬 물 분자의 변화 모형' };
  function setScene(sc) {
    if (S.scene !== sc) { S.fade = 1; fx.clear(); hintOff(); }
    S.scene = sc; $('#tbLabel').textContent = SCENE_LABEL[sc]; updateUI();
  }
  const setHidden = (id, hide) => { const e = $(id); if (e) e.hidden = !!hide; };
  function updateUI() {
    const sc = S.scene, g = S.gate;
    setHidden('#cs-lab', sc !== 'lab');
    setHidden('#cs-graph', sc !== 'graph');
    setHidden('#cs-model', !(sc === 'model' && !g));
    setHidden('#cs-ord', !(sc === 'model' && g === 'ord'));
    setHidden('#cs-calc', !(sc === 'model' && g === 'calc'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    $$('#solSeg button').forEach((b) => { b.classList.toggle('on', (+b.dataset.v === 1) === S.elec); b.disabled = S.draining; });
    const sv = $('#sVolt'); if (+sv.value !== S.V) sv.value = S.V;
    sv.style.setProperty('--pct', (S.V / V_MAX * 100) + '%'); $('#oVolt').textContent = S.V + ' V';
    $('#vMinus').disabled = S.V <= 0; $('#vPlus').disabled = S.V >= V_MAX;
    const pb = $('#powerBtn'); pb.textContent = S.on ? '⏻ 전원 끄기' : '⏻ 전원 켜기'; pb.classList.toggle('sw-on', S.on); pb.disabled = S.draining;
    $('#drainBtn').disabled = S.draining || (S.run.t === 0 && S.gas.h < 0.001 && !S.on);
    $('#drawH').classList.toggle('done', S.gr.hd); $('#drawO').classList.toggle('done', S.gr.od);
    $('#drawH').disabled = !S.base; $('#drawO').disabled = !S.base;
    $$('#ratioSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.gr.pick); b.disabled = !(S.gr.hd && S.gr.od); });
    const pl = $('#playBtn'); pl.textContent = S.m.play ? '⏸ 멈추기' : '▶ 처음부터 재생';
    const sm = $('#sMod'); if (+sm.value !== Math.round(S.m.tt * 100)) sm.value = Math.round(S.m.tt * 100); sm.style.setProperty('--pct', Math.round(S.m.tt * 100) + '%'); $('#oMod').textContent = Math.round(S.m.tt * 100) + ' %';
    const note = $('#ctlNote'); let nt = '';
    if (sc === 'lab') nt = gameLevel() === 0 && !isFree() ? '순수한 물과 전해질 수용액에서 전원을 켜 보고 전류계의 값을 비교해요. 🥽 실험 중에는 보안경을 써요.' : '전압을 바꾸면 처음부터 다시 실험해요. 9 V에서 8분 동안(실험 1분 = 실제 1초) 전기 분해를 해 봐요.';
    if (sc === 'graph') nt = '두 그래프를 그린 뒤 기울기의 비를 골라요.';
    if (sc === 'model' && !g) nt = '반응 진행 슬라이더를 움직이거나 재생해서 원자들이 어떻게 바뀌는지 봐요.';
    note.textContent = nt; note.hidden = !nt;
  }

  /* ---------- 폼 도우미 ---------- */
  function makeSelects(box, defs) {
    box.innerHTML = '';
    return defs.map((d) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const q = document.createElement('div'); q.className = 'q'; q.innerHTML = d.q; row.appendChild(q);
      const s = document.createElement('select'); s.className = 'sel-in'; s.setAttribute('aria-label', d.q.replace(/<[^>]+>/g, ''));
      s.appendChild(new Option('— 고르기 —', ''));
      d.opts.forEach((tx, k) => s.appendChild(new Option(tx, String(k + 1))));
      s.addEventListener('change', () => { Sound.tick(); s.classList.remove('ok', 'bad'); });
      row.appendChild(s); box.appendChild(row); return s;
    });
  }
  // 몰 계산 (선택지는 계산값에서 만들어요)
  const nf = (x) => sci(x) + ' mol';
  const mgTxt = (x) => (Math.round(x * 100) / 100).toFixed(2) + ' mg';
  const CALC_DEFS = [
    { q: '① H₂ ' + f1(BASE_H) + ' mL의 몰수 = ' + f1(BASE_H) + ' mL ÷ 24500 mL/mol', opts: [nf(N_H2 * 10), nf(N_H2), nf(N_O2), nf(N_H2 * 2)], ans: 1 },
    { q: '② 분해된 H₂O의 몰수 (2H₂O → 2H₂ + O₂, H₂O : H₂ = 2 : 2)', opts: [nf(N_H2 / 2), nf(N_H2), nf(N_H2 * 2), nf(N_H2 * 18)], ans: 1 },
    { q: '③ 분해된 H₂O의 질량 (몰수 × 18 g/mol)', opts: [mgTxt(MG_H2), mgTxt(MG_O2), mgTxt(MG_H2O), mgTxt(MG_H2O * 10)], ans: 2 },
  ];
  const calcSel = makeSelects($('#calcSel'), CALC_DEFS);
  const calcOK = () => CALC_DEFS.map((d, i) => +calcSel[i].value - 1 === d.ans);
  function calcMark() { calcSel.forEach((s, i) => { s.classList.remove('ok', 'bad'); if (s.value) s.classList.add(+s.value - 1 === CALC_DEFS[i].ans ? 'ok' : 'bad'); }); }
  calcSel.forEach((s) => s.addEventListener('change', () => calcMark()));
  // 순서 맞추기 카드
  const ORD_TEXT = [
    '물 분자(H₂O) 2개가 있어요',
    '전기 에너지를 받아 O–H 결합이 끊어져요',
    '수소 원자끼리, 산소 원자끼리 새로 짝을 이뤄요',
    'H₂ 2개와 O₂ 1개가 생겨요 (원자의 종류와 수는 그대로)',
  ];
  function renderOrd() {
    const box = $('#ordList'); box.innerHTML = '';
    S.ord.forEach((ci, pos) => {
      const row = document.createElement('div'); row.className = 'ord-row' + (S.ordMark && S.ordMark[pos] != null ? (S.ordMark[pos] ? ' ok' : ' bad') : '');
      row.innerHTML = '<span class="no">' + (pos + 1) + '</span><span class="tx">' + ORD_TEXT[ci] + '</span>';
      const up = document.createElement('button'); up.type = 'button'; up.textContent = '▲'; up.setAttribute('aria-label', '위로'); up.disabled = pos === 0;
      const dn = document.createElement('button'); dn.type = 'button'; dn.textContent = '▼'; dn.setAttribute('aria-label', '아래로'); dn.disabled = pos === S.ord.length - 1;
      up.addEventListener('click', () => moveOrd(pos, -1)); dn.addEventListener('click', () => moveOrd(pos, 1));
      row.append(up, dn); box.appendChild(row);
    });
  }
  function moveOrd(pos, d) {
    const j = pos + d; if (j < 0 || j >= S.ord.length) return;
    const a = S.ord.slice(); const t = a[pos]; a[pos] = a[j]; a[j] = t; S.ord = a; S.ordMark = null; Sound.tick(); renderOrd();
  }
  const ordCorrect = () => S.ord.every((v, i) => v === i);

  /* ---------- 버튼 연결 ---------- */
  $$('#solSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setElec(+b.dataset.v === 1); }));
  $('#sVolt').addEventListener('input', (e) => setV(+e.target.value));
  $('#vMinus').addEventListener('click', () => { Sound.tick(); setV(S.V - 1); });
  $('#vPlus').addEventListener('click', () => { Sound.tick(); setV(S.V + 1); });
  $('#powerBtn').addEventListener('click', togglePower);
  $('#drainBtn').addEventListener('click', () => { Sound.click(); drainNow(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'lab') drainNow();
    else if (S.scene === 'graph') { S.gr.h = 0; S.gr.o = 0; S.gr.hd = false; S.gr.od = false; S.gr.pick = null; updateUI(); }
    else { S.m.play = false; S.m.tt = 0; updateUI(); }
  });
  function drawLine(which) {
    if (!S.base) return;
    const k = which === 'h' ? 'h' : 'o', dk = which === 'h' ? 'hd' : 'od';
    S.gr[k] = 0; S.gr[dk] = false;
    tween(S.gr, { [k]: 1 }, { duration: RM ? 0.01 : 1.3, ease: 'inOutQuad', onDone: () => { S.gr[dk] = true; Sound.success(); updateUI(); } });
    Sound.click(); updateUI();
  }
  $('#drawH').addEventListener('click', () => drawLine('h'));
  $('#drawO').addEventListener('click', () => drawLine('o'));
  $$('#ratioSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gr.pick = b.dataset.v; updateUI(); }));
  $('#sMod').addEventListener('input', (e) => { S.m.play = false; S.m.tt = +e.target.value / 100; updateUI(); });
  $('#playBtn').addEventListener('click', () => {
    Sound.click();
    if (S.m.play) { S.m.play = false; }
    else { S.m.tt = 0; S.m.t = 0; S.m.play = true; }
    updateUI();
  });

  // 도구 끌기
  SciSim.pointer(view, {
    down(p) {
      if (S.scene !== 'lab' || !toolsOn() || S.test) return false;
      for (const t of TOOLS) { if (Math.hypot(p.x - t.x, p.y - t.y - 26) < 40) { t.drag = true; t.dx = p.x - t.x; t.dy = p.y - t.y; Sound.tick(); return true; } }
      return false;
    },
    move(p) { TOOLS.forEach((t) => { if (t.drag) { t.x = clamp(p.x - t.dx, 20, VW - 20); t.y = clamp(p.y - t.dy, 40, VH - 20); } }); },
    up(p) {
      TOOLS.forEach((t) => {
        if (!t.drag) return;
        t.drag = false;
        // 놓은 자리가 어느 꼭지(마개) 근처인지 포인터 위치로 판단
        let hit = null;
        ['L', 'R'].forEach((k) => { const tp = tubeTip(k); if (Math.hypot(p.x - tp[0], p.y - tp[1]) < 64 * K + 10) hit = k; });
        if (hit) startTest(t.id, hit);
      });
    },
    hover(p) { return S.scene === 'lab' && toolsOn() && TOOLS.some((t) => Math.hypot(p.x - t.x, p.y - t.y - 26) < 40) ? 'grab' : 'default'; },
  });

  /* ---------- 읽기 값 ---------- */
  function readouts() {
    if (S.scene === 'graph') {
      setRO(1, 'H₂ 기울기', S.gr.hd ? f1(slopeOf('h')) + ' mL/분' : '—'); setRO(2, 'O₂ 기울기', S.gr.od ? f1(slopeOf('o')) + ' mL/분' : '—');
      setRO(3, '기울기의 비', S.gr.pick === '2:1' ? 'H₂ : O₂ = 2 : 1' : '—'); return;
    }
    if (S.scene === 'model') {
      const st = stageOf(S.m.t);
      setRO(1, '진행', Math.round(S.m.t * 100) + ' %'); setRO(2, '단계', STAGES[st]); setRO(3, '원자 수', 'H 4개 · O 2개 (그대로)'); return;
    }
    setRO(1, '전류', curI() + ' mA');
    setRO(2, (S.id.L === 'h2' ? 'H₂ 부피 ((−)극)' : '(−)극 기체 부피'), f1(S.gas.h) + ' mL');
    setRO(3, (S.id.R === 'o2' ? 'O₂ 부피 ((+)극)' : '(+)극 기체 부피'), f1(S.gas.o) + ' mL');
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '전해질이 필요해요', short: '전해질 필요', icon: '🧂', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전기를 흘리면 물은 어떻게 변할까? 왜 수소가 산소의 두 배일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 물을 전기 분해하면 수소와 산소가 생긴다고 배웠고, <b>통합과학에서</b> 물 분자는 O–H 공유 결합으로 이루어졌다고 배웠어요. 이번에는 직접 실험 장치를 다뤄 봐요.</div>' +
        '<p>전기 분해 장치(호프만 장치)에 전극을 넣고 전류계를 확인해요. <b>순수한 물</b>과 <b>전해질(황산 나트륨, Na₂SO₄)을 조금 넣은 물</b>에서 전류가 어떻게 다른지 비교해 봐요. 🥽 실험할 때는 보안경과 실험복을 착용해요.</p>',
      features: ['lab'],
      setup() { S.gate = ''; resetAll(); setScene('lab'); updateUI(); },
      recap: '순수한 물에는 이온이 거의 없어 전류가 거의 흐르지 않아요. 전해질을 조금 넣으면 이온이 전하를 날라 전류가 흐르고, 전극에서 기체가 생겨요.',
      summary: '<ul><li><b>순수한 물</b>은 이온이 거의 없어서 전류가 <b>거의 흐르지 않아요</b>.</li><li>황산 나트륨(Na₂SO₄) 같은 <b>전해질</b>을 조금 넣으면 Na⁺와 SO₄²⁻ 이온이 전하를 날라 전류가 흘러요. 전압은 3 V 이상이어야 물이 분해돼요(이 장치에서).</li><li><b>안전 수칙</b>: 보안경 · 실험복 착용, 수소 기체 주변에서 화기 금지, 전해질 용액을 만진 뒤 손 씻기, 실험 후 용액은 실험실 폐수 처리 기준에 따라 처리해요.</li></ul>',
      missions: [
        {
          title: '순수한 물 vs 전해질 수용액',
          goal: '전압을 <b>3 V 이상</b>으로 하고 전원을 켜서, <b>순수한 물</b>과 <b>전해질 수용액</b>의 전류를 각각 확인하세요.',
          hint: '물에 넣은 것을 순수한 물로 하고 ⏻ 전원 켜기를 눌러요. 1~2초 지켜본 뒤, 전해질 수용액으로 바꿔 한 번 더 해요. (바꾸면 전원이 꺼져요)',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          check: () => S.cmp.pure >= 1.5 && S.cmp.elec >= 1.5,
          hold: 0.4,
          status: () => mark(S.cmp.pure >= 1.5) + ' 순수한 물' + (S.cmp.pure >= 1.5 ? ': ' + S.cmp.pureI + ' mA' : '') + ' &nbsp; ' + mark(S.cmp.elec >= 1.5) + ' 전해질 수용액' + (S.cmp.elec >= 1.5 ? ': ' + S.cmp.elecI + ' mA' : ''),
          explain: '순수한 물에서는 전류가 <b>0 mA</b>(거의 흐르지 않음)이고 기포도 생기지 않았어요. 전해질 수용액에서는 전류가 흐르고 두 극에서 기포가 생겼어요.',
        },
        {
          type: 'quiz', title: '전해질을 넣는 까닭',
          goal: '물을 전기 분해할 때 황산 나트륨 같은 전해질을 조금 넣는 까닭은?',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          choices: ['전해질이 물을 수소와 산소로 직접 바꿔 주어서', '전하를 나르는 이온을 공급해 전류가 잘 흐르게 하려고', '물의 온도를 높여서 기체가 빨리 생기게 하려고', '전극이 녹지 않게 보호하려고'],
          answer: 1,
          feedback: ['전해질은 분해되는 물질이 아니에요. 물이 분해되어 수소와 산소가 생겨요.', '', '전해질을 넣는다고 온도가 올라가는 것은 아니에요.', '전극 보호가 목적이 아니에요. 전류가 흐르려면 무엇이 필요했는지 떠올려 봐요.'],
          explain: '순수한 물에는 이온이 거의 없어 전류가 흐르기 어려워요. 전해질을 넣으면 <b>전하를 나르는 이온</b>이 생겨 전류가 흐르고, 그 에너지로 물이 분해돼요. 전해질 자체는 거의 변하지 않아요.',
        },
        {
          type: 'quiz', title: '안전 수칙',
          goal: '물의 전기 분해 실험에서 <b>옳은</b> 안전 수칙은?',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          choices: ['잘 보이도록 보안경은 벗고 실험한다', '수소는 불이 붙기 쉬우므로 기체 주변에 화기를 가까이 하지 않고, 보안경을 쓴다', '실험이 끝난 용액은 싱크대에 그냥 버린다', '전원이 켜진 상태에서 전극을 손으로 잡고 살펴본다'],
          answer: 1,
          feedback: ['보안경과 실험복은 실험 내내 착용해야 해요.', '', '남은 용액은 실험실 폐수 · 폐기물 처리 기준과 방법에 따라 처리해야 해요.', '전원이 켜진 전극은 감전 위험이 있어요. 전원을 끄고 다뤄요.'],
          explain: '수소 기체는 불이 붙으면 폭발할 수 있어서 <b>화기를 멀리</b> 하고, <b>보안경 · 실험복</b>을 착용해요. 실험이 끝나면 남은 용액은 <b>실험실 폐수 처리 기준</b>에 따라 처리하고 손을 씻어요.',
        },
      ],
    },
    {
      title: '물을 전기 분해해 기체 모으기', short: '전기 분해', icon: '⚡', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전해질을 넣으면 전류가 흐르고 기포가 생긴다는 것을 확인했어요. 이제 <b>어떤 기체가 얼마나</b> 생기는지 알아봐요.</div>' +
        '<p>전해질 수용액을 담은 호프만 장치로 <b>전압 9 V에서 8분 동안</b> 전기 분해해요(실험 1분 = 실제 1초). 2분마다 두 극에 모인 기체의 부피가 표에 기록돼요. 그다음 <b>성냥불</b>과 <b>꺼져 가는 불씨</b>로 기체의 종류를 확인해요. 🥽 수소 확인 시험은 아주 적은 양으로, 안전 수칙을 지켜요.</p>',
      features: ['tests'],
      setup() { S.gate = ''; resetAll(true); setScene('lab'); updateUI(); },
      recap: '(−)극에서는 수소, (+)극에서는 산소가 생기고, 같은 시간 동안 수소의 부피가 산소의 2배예요. 수소는 성냥불에 "퍽" 소리가 나고, 산소는 꺼져 가는 불씨를 되살려요.',
      summary: '<table class="mini"><tr><th>시간(분)</th><th>H₂ ((−)극)</th><th>O₂ ((+)극)</th></tr><tr><td>2</td><td>2.0 mL</td><td>1.0 mL</td></tr><tr><td>4</td><td>4.0 mL</td><td>2.0 mL</td></tr><tr><td>6</td><td>6.0 mL</td><td>3.0 mL</td></tr><tr><td>8</td><td>8.0 mL</td><td>4.0 mL</td></tr></table><ul><li>9 V, 8분: (−)극 8.0 mL, (+)극 4.0 mL → 부피비 <b>2 : 1</b>.</li><li>수소: 성냥불을 가까이 하면 "퍽" 소리. 산소: 꺼져 가는 불씨를 다시 타오르게 해요.</li><li>산소는 물에 조금 더 녹아서 실제 실험에서는 부피비가 2 : 1보다 약간 크게 나올 수 있어요.</li></ul>',
      missions: [
        {
          title: '9 V로 8분 동안 전기 분해하기',
          goal: '용액을 <b>전해질 수용액</b>, 전압을 <b>9 V</b>로 하고 전원을 켜서 <b>8분</b>이 될 때까지 지켜보세요.',
          hint: '전압을 9 V로 맞추고 ⏻ 전원 켜기를 눌러요. 도중에 전원을 끄면 이어서 켤 수 있어요. 전압을 바꾸면 처음부터 다시 해요.',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          check: () => !!S.base && S.base.length === 4,
          hold: 0.5,
          status: () => mark(S.elec) + ' 전해질 수용액 &nbsp; ' + mark(S.V === V_REF) + ' 9 V &nbsp; ' + [2, 4, 6, 8].map((t, i) => mark(S.rows.length > i && S.run.V === V_REF) + ' ' + t + '분').join(' '),
          explain: '9 V에서 8분 동안 (−)극에 <b>8.0 mL</b>, (+)극에 <b>4.0 mL</b>의 기체가 모였어요. 2분마다 기록한 값을 보면 같은 시간 동안 (−)극 기체가 (+)극 기체의 <b>2배</b>예요.',
        },
        {
          title: '기체 확인 시험 2가지',
          goal: '(−)극 기체에 <b>성냥불</b>을, (+)극 기체에 <b>꺼져 가는 불씨</b>를 가까이 해서 기체의 종류를 확인하세요.',
          hint: '기체가 1 mL 이상 모여 있어야 해요. 아래 도구를 손가락으로 끌어 장치 위쪽의 꼭지(마개) 위에 놓아요. 먼저 8분 실험을 마치면 편해요.',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          check: () => S.id.L === 'h2' && S.id.R === 'o2',
          hold: 0.5,
          status: () => mark(S.id.L === 'h2') + ' (−)극: 성냥불 → 퍽! &nbsp; ' + mark(S.id.R === 'o2') + ' (+)극: 불씨 → 활활!',
          explain: '(−)극 기체는 성냥불에 "퍽" 소리가 나는 <b>수소(H₂)</b>, (+)극 기체는 꺼져 가는 불씨를 되살리는 <b>산소(O₂)</b>예요. 물이 분해되어 수소와 산소가 생겼어요.',
        },
        {
          type: 'quiz', title: '수소가 모이는 극',
          goal: '실험에서 수소 기체는 어느 극에 모였고, 그 부피는 어땠나요?',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          choices: ['(+)극에 모이고, 부피가 산소의 절반이에요', '(−)극에 모이고, 부피가 산소의 2배예요', '(−)극에 모이고, 부피가 산소와 같아요', '두 극 모두에 같은 양이 모여요'],
          answer: 1,
          feedback: ['(+)극에서는 산소가 생겼어요. 성냥불 시험에서 "퍽" 소리가 난 쪽이 어디였나요?', '', '표를 다시 보세요. 같은 시간 동안 두 극의 부피가 같지 않았어요.', '두 극에 모이는 기체의 종류도 양도 달랐어요.'],
          explain: '수소는 <b>(−)극</b>에 모이고 부피는 산소의 <b>2배</b>예요. 8분 동안 H₂ 8.0 mL, O₂ 4.0 mL가 모였어요.',
        },
      ],
    },
    {
      title: '기체 부피의 비를 그래프로', short: '부피비', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> (−)극에 수소, (+)극에 산소가 모이고 부피가 2 : 1이라는 것을 봤어요. 단원 33에서 배운 <b>화학 반응식의 계수비 = 몰수비 = (기체의) 부피비</b>와 연결해 봐요.</div>' +
        '<p>기록표를 <b>시간–부피 그래프</b>로 나타내고 두 직선의 <b>기울기의 비</b>를 구해 봐요. 그 비가 반응식 2H₂O → 2H₂ + O₂의 계수비와 같은지 확인해요.</p>',
      features: ['graph'],
      setup() { S.gate = ''; S.gr = { h: 0, o: 0, hd: false, od: false, pick: null }; setScene('graph'); updateUI(); },
      recap: '시간–부피 그래프에서 H₂의 기울기는 1.0 mL/분, O₂는 0.5 mL/분으로 비가 2 : 1이에요. 같은 온도 · 압력에서 기체의 부피비 = 몰수비 = 반응식의 계수비예요.',
      summary: '<ul><li>그래프의 두 직선은 원점을 지나고, 기울기는 H₂ <b>1.0 mL/분</b>, O₂ <b>0.5 mL/분</b>이에요. 기울기의 비 = <b>2 : 1</b></li><li>2H₂O → 2H₂ + O₂ 에서 계수비 H₂ : O₂ = 2 : 1. 같은 온도 · 압력에서 <b>부피비 = 몰수비 = 계수비</b></li><li>질량비로 바꾸면 H₂ : O₂ = (2 × 2.0) : (1 × 32.0) = 4 : 32 = <b>1 : 8</b> (중3의 물의 일정 성분비와 같아요)</li></ul>',
      missions: [
        {
          title: '그래프를 그리고 기울기의 비 구하기',
          goal: 'H₂와 O₂ <b>두 그래프를 모두 그리고</b>, 두 기울기의 비를 골라 보세요.',
          hint: '각 그래프를 그리면 기울기(부피 ÷ 시간)가 계산되어 나와요. H₂의 기울기를 O₂의 기울기로 나눠 보세요.',
          setup() { S.gate = ''; setScene('graph'); updateUI(); },
          check: () => S.gr.hd && S.gr.od && S.gr.pick === '2:1',
          hold: 0.5,
          status: () => mark(S.gr.hd) + ' H₂ 그래프 &nbsp; ' + mark(S.gr.od) + ' O₂ 그래프 &nbsp; ' + (S.gr.pick === '2:1' ? '✅' : S.gr.pick ? '❌' : '⬜') + ' 기울기의 비' + (S.gr.pick && S.gr.pick !== '2:1' ? ' (다시 계산)' : ''),
          explain: 'H₂의 기울기 ' + f1(BASE_H) + ' ÷ ' + TMAX + ' = <b>' + f1(BASE_H / TMAX) + ' mL/분</b>, O₂의 기울기 ' + f1(BASE_O) + ' ÷ ' + TMAX + ' = <b>' + f1(BASE_O / TMAX) + ' mL/분</b>이라서 비가 <b>2 : 1</b>이에요. 반응식 2H₂O → 2H₂ + O₂의 계수비와 같아요.',
        },
        {
          type: 'quiz', title: '부피비 2 : 1을 질량비로 바꾸면?',
          goal: '같은 온도 · 압력에서 H₂ : O₂의 부피비는 2 : 1이에요. 질량비로 바꾸면 <b>1 : 8</b>이 되는 까닭은? (몰질량 H₂ 2 g/mol, O₂ 32 g/mol)',
          setup() { S.gate = ''; setScene('graph'); updateUI(); },
          choices: ['몰수비 2 : 1에 몰질량비 2 : 32를 곱하면 (2×2) : (1×32) = 4 : 32 = 1 : 8이라서', '수소가 산소보다 8배 무거워서', '수소 분자가 산소 분자보다 8배 많아서', '질량비는 부피비와 항상 같아서'],
          answer: 0,
          feedback: ['', '수소가 산소보다 훨씬 가벼워요. 몰질량이 2 g/mol과 32 g/mol이었어요.', '분자 수의 비(몰수비)는 2 : 1이에요. 8배가 아니에요.', '질량은 (몰수 × 몰질량)이라서 몰질량이 다르면 부피비와 질량비가 달라요.'],
          explain: '질량 = 몰수 × 몰질량이에요. H₂ : O₂ = (2 mol × 2.0) : (1 mol × 32.0) = 4 : 32 = <b>1 : 8</b>. 이것은 중3에서 배운 <b>물의 일정 성분비</b>(수소 : 산소 = 1 : 8)와 같아요.',
        },
      ],
    },
    {
      title: '입자 모형: 결합이 끊어지고 새로 만들어져요', short: '입자 모형', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부피비가 반응식의 계수비와 같다는 것을 확인했어요. 입자 수준에서는 무슨 일이 일어날까요?</div>' +
        '<p>물 분자 2개가 전기 에너지를 받아 <b>O–H 결합이 끊어지고</b>, 수소 원자 4개와 산소 원자 2개가 <b>새로운 짝</b>을 이루어 H₂ 2개와 O₂ 1개가 돼요. 원자의 종류와 수는 변하지 않아요. 마지막으로 분해된 물의 양을 몰과 질량으로 계산해 봐요.</p>',
      features: ['model'],
      setup() { S.gate = ''; S.m = { t: 0, tt: 0, play: false }; setScene('model'); updateUI(); },
      recap: '물 분자 2개의 O–H 결합이 끊어지고 원자들이 새로 짝을 이루어 H₂ 2개와 O₂ 1개가 생겨요. 원자의 종류와 수는 보존돼요. H₂ 8.0 mL는 물 약 5.9 mg이 분해된 양이에요.',
      summary: '<ul><li>물(공유 결합) 분자 2개 → <b>O–H 결합이 끊어지고</b> 수소 원자 4개 · 산소 원자 2개가 새로 짝을 이루어 <b>H₂ 2개 + O₂ 1개</b></li><li>원자의 종류와 수는 <b>보존</b>돼요(H 4개, O 2개). 물질이 사라지는 것이 아니라 원자의 짝이 바뀌어요.</li><li>(−)극에서 물이 전자를 받아 H₂, (+)극에서 물이 전자를 내놓아 O₂가 생겨요(정성적).</li><li>H₂ ' + f1(BASE_H) + ' mL = ' + sci(N_H2) + ' mol → H₂O ' + sci(N_H2O) + ' mol → <b>' + mgTxt(MG_H2O) + '</b> (≈ ' + f1(MG_H2O) + ' mg)이 분해됐어요. 수소 ' + sig(MG_H2, 3) + ' mg + 산소 ' + sig(MG_O2, 3) + ' mg, 질량비 1 : 8</li></ul>',
      missions: [
        {
          title: '분자가 바뀌는 순서 맞추기', manual: true,
          goal: '물 분자가 수소와 산소로 바뀌는 과정을 <b>일어나는 순서대로</b> ▲▼로 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '반응 진행 슬라이더를 처음부터 끝까지 움직이며 원자들이 어떻게 변하는지 보세요.',
          setup() { S.gate = 'ord'; S.ordMark = null; S.ord = [2, 0, 3, 1]; renderOrd(); setScene('model'); updateUI(); },
          check: () => {
            if (ordCorrect()) { S.ordMark = [true, true, true, true]; renderOrd(); return true; }
            return '순서가 맞지 않아요. 가장 처음에는 무엇이 있었나요? 슬라이더를 0 %부터 100 %까지 움직여 봐요.';
          },
          status: () => '순서 ' + S.ord.filter((v, i) => v === i).length + ' / 4 자리가 맞아요',
          explain: '① 물 분자 2개 → ② 전기 에너지로 <b>O–H 결합이 끊어짐</b> → ③ 원자가 <b>새로운 짝</b>을 찾음 → ④ <b>H₂ 2개 + O₂ 1개</b> 생성. 원자의 종류와 수는 처음과 같아요.',
        },
        {
          title: '분해된 물의 양 계산하기',
          goal: '(−)극에 모인 H₂ <b>' + f1(BASE_H) + ' mL</b>(25 °C, 1 mol = 24.5 L)에서 <b>분해된 물의 질량</b>까지 세 칸을 모두 맞게 고르세요.',
          hint: 'mL를 L로 바꾸는 것을 잊지 마세요(8.0 mL = 8.0×10⁻³ L). 반응식에서 H₂O : H₂ = 2 : 2 = 1 : 1이에요.',
          setup() { S.gate = 'calc'; calcSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); setScene('model'); updateUI(); },
          check: () => calcOK().every(Boolean),
          hold: 0.6,
          status: () => calcSel.map((s, i) => (s.value ? (calcOK()[i] ? '✅' : '❌') : '⬜') + ' ' + ['H₂ 몰수', 'H₂O 몰수', 'H₂O 질량'][i]).join(' &nbsp; '),
          explain: 'H₂ ' + f1(BASE_H) + ' mL = ' + f1(BASE_H) + '×10⁻³ L ÷ 24.5 L/mol = <b>' + sci(N_H2) + ' mol</b>. 2H₂O → 2H₂ + O₂ 에서 H₂O의 몰수도 같으니 <b>' + sci(N_H2O) + ' mol</b>. 질량 = ' + sci(N_H2O) + ' × 18 = <b>' + mgTxt(MG_H2O) + '</b> ≈ ' + f1(MG_H2O) + ' mg이에요. (수소 ' + sig(MG_H2, 3) + ' mg + 산소 ' + sig(MG_O2, 3) + ' mg, 질량비 1 : 8)',
        },
        {
          type: 'quiz', title: '물이 분해되면 물질이 사라질까?',
          goal: '물이 수소와 산소로 분해되는 과정에 대한 설명으로 <b>옳은 것</b>은?',
          setup() { S.gate = ''; setScene('model'); updateUI(); },
          choices: ['물이 분해되면서 일부 원자가 사라져요', '수소 원자와 산소 원자가 새로 만들어져요', '원자는 사라지거나 생기지 않고 짝만 바뀌어서 원자의 종류와 수가 그대로예요', '물 분자 속 결합은 끊어지지 않고 그대로 모양만 바뀌어요'],
          answer: 2,
          feedback: ['원자의 수를 세어 보세요. 반응 전후 수소 4개, 산소 2개로 같았어요.', '원자는 새로 만들어지지 않아요. 원래 물 분자 속에 있던 원자예요.', '', '물 분자의 O–H 결합이 끊어지고 새로운 결합(H–H, O=O)이 만들어졌어요.'],
          explain: '화학 반응에서는 <b>결합이 끊어지고 새로 만들어질 뿐</b> 원자는 사라지거나 생기지 않아요. 그래서 반응 전후 원자의 종류와 수가 같아요(질량 보존).',
        },
      ],
    },
  ];

  function resetAll(keepElec) {
    S.on = false; S.draining = false; S.run = { t: 0, V: null }; S.gas.h = 0; S.gas.o = 0; S.rows = []; S.base = null; S.done8 = false;
    S.id = { L: null, R: null }; S.tests = {}; S.testMsg = ''; S.test = null; S.phase = 0; S.funnel = 0;
    S.cmp = { pure: 0, elec: 0, pureI: null, elecI: null };
    S.V = V_REF; S.elec = !!keepElec; bubbles.length = 0; acc.L = 0; acc.R = 0;
    S.funnel = funnelLevel();
    TOOLS.forEach((t) => { t.x = t.hx; t.y = t.hy; t.drag = false; });
  }

  game = SciSim.game({
    simId: 'hc-water-electrolysis', mount: '#game', badge: '전기 분해 박사', homeHref: '../../index.html#hc',
    featureLabels: { lab: '⚡ 호프만 전기 분해 장치 · 전류계', tests: '🔥 기체 확인 도구 · 기록표', graph: '📈 시간–부피 그래프', model: '🔬 물 분자 변화 모형' },
    onFeatures() { updateUI(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.funnel = funnelLevel();
  renderOrd();
  updateUI();
  function update(dt) {
    S.t += dt;
    if (S.scene === 'lab') { labStep(dt); stepIons(dt); TOOLS.forEach((t) => toolSet(t, dt)); testStep(dt); }
    else if (S.scene === 'model') {
      if (S.m.play) { S.m.tt = Math.min(1, S.m.tt + dt / 9); if (S.m.tt >= 1) { S.m.play = false; updateUI(); } if (Math.round(S.m.tt * 100) !== +$('#sMod').value) updateUI(); }
      S.m.t = RM ? S.m.tt : approach(S.m.t, S.m.tt, dt, 6); if (Math.abs(S.m.t - S.m.tt) < 0.0005) S.m.t = S.m.tt;
    } else if (S.scene === 'graph') { /* 트윈이 그려 줘요 */ }
    if (S.scene !== 'lab' && S.on) { S.on = false; updateUI(); }
    fx.update(dt);
  }
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt) => {
    if (game && (game.free !== lastFree || game.level !== lastLevel)) { lastFree = game.free; lastLevel = game.level; updateUI(); }
    update(dt);
    view.apply();
    if (S.scene === 'graph') drawGraph();
    else if (S.scene === 'model') drawModel();
    else {
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      drawApparatus();
      drawInset();
      if (gameLevel() === 0 && !isFree()) drawInfoCard();
      else { drawTable(); drawTools(); }
      drawTestEffects();
    }
    fx.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, K, TOOLS, PN, MC, ATOMS, CALC_DEFS, calcSel, get game() { return game; },
    setScene, setV, setElec, togglePower, drainNow, drawLine, startTest, tubeTip, orderFix() { S.ord = [0, 1, 2, 3]; renderOrd(); },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) update(0.02); },
    N_H2, N_O2, MG_H2, MG_O2, MG_H2O, rateH, rateO, curOf, sci,
  };
})();
