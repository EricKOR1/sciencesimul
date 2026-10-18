/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 무선 충전의 원리 (단원 7차시)
   성취기준 [12물리02-06] 전자기 유도 현상이 센서, 무선통신, 무선충전 등 에너지 전달 기술에 적용되어 현대 문명에 미친 영향을 인식할 수 있다.
   (무선 충전 구현 · 에너지 전달 부분)
   ① 관찰: 유도 전달 (직류 / 교류, 수신 코일 감은 수)
   ② 탐구: 충전기 구현 (감은 수 · 간격 · 어긋남 · 주파수, 변인 통제)
   ③ 분석: 효율과 에너지 손실 (간격–효율 그래프, 동전 이물질)
   ④ 적용: 기술과 영향 (장면 카드, 장점과 한계)
   패러데이 식과 렌츠 법칙, 상호 인덕턴스 식, 공진 결합의 수학, 차폐 설계는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const r2 = (v) => Math.round(v * 100) / 100;
  const fHz = (f) => (f >= 1000 ? (f / 1000) + ' kHz' : f + ' Hz');

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const P_TX = 5.0;                                              // 송신 전력 (W)
  const V_TX = 5.0, C1 = 0.6, V_TH = 2.0, V_MAX = 6.0;          // ① 송신 전압(최댓값), 간격 5 mm 결합 계수, LED 켜지는 전압, 최대 밝기 전압
  const NT1 = 20, TAU_DC = 0.3, F_AC = 100000, SLOW_WL = 50000;  // 송신 코일 감은 수, 직류 스위치 순간 신호의 감쇠 시간(s), 교류 주파수, 화면 느리게 하는 배수
  const FVIS = F_AC / SLOW_WL;                                   // 화면에서 보이는 교류 진동수 (Hz)
  const GAP_PTS = [[0, 75], [5, 65], [10, 45], [20, 15]];       // 간격(mm) → 효율(%) (기준 충전기)
  const etaGap = (d) => {
    d = clamp(d, 0, 20);
    for (let i = 0; i < GAP_PTS.length - 1; i++) {
      const a = GAP_PTS[i], b = GAP_PTS[i + 1];
      if (d <= b[0]) return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]);
    }
    return GAP_PTS[GAP_PTS.length - 1][1];
  };
  const offFac = (o) => 1 - (1 - 50 / 75) * (Math.abs(o) / 10);        // 어긋남 10 mm에서 0.667 (75 % → 50 %)
  const H_F = { 50: 0.02, 1000: 0.10, 10000: 0.45, 100000: 1.0, 150000: 1.0 };
  const turnFac = (nt, nr) => 1 / (1 + 0.25 * Math.log(nr / nt) * Math.log(nr / nt));
  const REF = { Nt: 20, Nr: 20, gap: 5, off: 0, f: 100000 };
  const TARGET_P = 3.0, TARGET_GAP = 5;
  const E_BATT = 40;                                             // 화면용 작은 배터리 (J)
  const COIN_ABS = 0.5, C_COIN = 0.25, H_COIN = 0.04, T_ROOM = 20, T_HOT = 40;   // 동전: 수신될 에너지 중 가로채는 비율, 열용량(J/°C), 방열 계수(W/°C)
  const EV_KWH = 60, EV_EFF = 0.9, PH_EFF = etaGap(5) / 100;
  const evalCh = (d) => {
    const eta = etaGap(d.gap) / 100 * offFac(d.off) * H_F[d.f] * turnFac(d.Nt, d.Nr);
    const kv = C1 * (etaGap(d.gap) / etaGap(5)) * offFac(d.off) * H_F[d.f];
    return { eta, etaPct: Math.round(eta * 1000) / 10, P: r2(P_TX * eta), V: Math.round(V_TX * (d.Nr / d.Nt) * kv * 10) / 10, rate: P_TX * eta / E_BATT * 100 };
  };

  /* ---------- 배치 ---------- */
  const SCN = PHONE ? { x: 12, y: 12, w: 456, h: 250 } : { x: 14, y: 14, w: 430, h: 300 };
  const PA = PHONE ? { x: 12, y: 272, w: 456, h: 214 } : { x: 456, y: 14, w: 330, h: 300 };
  const PB = PHONE ? { x: 12, y: 496, w: 456, h: 212 } : { x: 14, y: 326, w: 772, h: 220 };
  const PXMM = PHONE ? 4.2 : 7, PADW = PHONE ? 220 : 250, BODYW = PHONE ? 140 : 160, COILW = PHONE ? 104 : 124;
  const GROUND = SCN.y + SCN.h - 26, PADTOP = GROUND - 40, TXY = GROUND - 27, CX = SCN.x + SCN.w / 2 + (PHONE ? 10 : 20);
  const rxYof = (gap) => PADTOP - 18 - gap * PXMM;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', fade: 0, t: 0,
    w: { src: 'ac', on: false, everOn: false, Nr: 20, ph: 0, tSw: 99, vTx: 0, vRx: 0, vEnv: 0, bT: 0, b: 0, hist: [], hAcc: 0, seen: {}, hold: {}, lastOn: false, field: 0 },
    d: { Nt: 20, Nr: 35, gap: 5, off: 6, offS: 6, f: 1000, batt: 0, full: 0, rows: [], ph: 0 },
    g: { gap: 5, coin: false, detect: false, tc: T_ROOM, pts: {}, cut: false, cutT: 0, seen: {}, choice: '', ph: 0, pc: 0, dispP: 0 },
    c: { cls: {}, bad: {}, shake: {} },
    drag: null, hits: [], press: null,
  };
  let game = null, need = '';
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ---------- 화면(뷰) ---------- */
  const VIEWS = [
    { id: 'obs', label: '🔌 유도 전달', grp: 0 },
    { id: 'build', label: '🛠️ 충전기 구현', grp: 1 },
    { id: 'eff', label: '📉 효율 분석', grp: 2 },
    { id: 'tech', label: '🌍 기술과 영향', grp: 3 },
  ];
  const viewSeg = $('#viewSeg');
  VIEWS.forEach((v) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v.id; b.textContent = v.label;
    b.addEventListener('click', () => { Sound.click(); setScene(v.id); });
    viewSeg.appendChild(b);
  });
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.press = null; S.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = VIEWS.find((v) => v.id === mode).label;
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      n.hidden = !on;
    });
    const lvl = game ? game.level : 0, free = !!(game && game.free);
    let shown = 0;
    $$('#viewSeg button').forEach((b) => {
      const v = VIEWS.find((x) => x.id === b.dataset.view);
      const vis = free || v.grp === lvl;
      b.hidden = !vis; if (vis) shown++;
      b.classList.toggle('on', b.dataset.view === S.mode);
    });
    $('#viewCtl').hidden = shown < 2;
    const on = (id, f) => $$(id + ' button').forEach((b) => b.classList.toggle('on', f(b.dataset.v)));
    on('#srcSeg', (v) => v === S.w.src); on('#nrSeg', (v) => +v === S.w.Nr);
    $('#bSw').textContent = S.w.on ? '스위치 끄기' : '스위치 켜기';
    const rng = (id, out, v, min, max, fmt) => { const e = $(id); if (+e.value !== v) e.value = v; e.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%'); $(out).textContent = fmt(v); };
    rng('#sNt', '#oNt', S.d.Nt, 10, 40, (v) => v + '회'); rng('#sNr', '#oNr', S.d.Nr, 10, 40, (v) => v + '회');
    rng('#sGap', '#oGap', S.d.gap, 0, 20, (v) => v + ' mm'); rng('#sOff', '#oOff', Math.abs(S.d.offS), 0, 10, (v) => v + ' mm');
    on('#fSeg', (v) => +v === S.d.f);
    rng('#sGap3', '#oGap3', S.g.gap, 0, 20, (v) => v + ' mm');
    on('#coinSeg', (v) => (v === '1') === S.g.coin); on('#detSeg', (v) => (v === '1') === S.g.detect);
  }

  /* ================= ① 유도 전달 ================= */
  const vPeak1 = () => V_TX * (S.w.Nr / NT1) * C1;
  function stepObs(dt) {
    const w = S.w;
    w.ph += TAU * FVIS * dt; if (w.ph > 1e4) w.ph -= 1e4 - (1e4 % TAU);
    if (w.on) w.everOn = true;
    if (w.on !== w.lastOn) { w.tSw = 0; w.lastOn = w.on; } else w.tSw += dt;
    const vp = vPeak1(); let env = 0, vrx = 0, vtx = 0, fld = 0;
    if (w.src === 'ac') {
      if (w.on) { vtx = V_TX * Math.sin(w.ph); vrx = vp * Math.cos(w.ph); env = vp; fld = Math.sin(w.ph); }
    } else {
      vtx = w.on ? V_TX : 0;
      const dec = Math.exp(-w.tSw / TAU_DC);
      vrx = (w.on ? 1 : -1) * vp * dec; env = Math.abs(vrx);        // 스위치를 켜거나 끄는 순간에만 잠깐 유도
      if (!w.everOn && !w.on) { vrx = 0; env = 0; }
      fld = w.on ? 1 - dec : dec;                                     // 자기장의 세기 (켜면 늘어나고, 끄면 줄어요)
    }
    w.vTx = vtx; w.vRx = vrx; w.vEnv = env; w.field = fld;
    w.bT = clamp((env - V_TH) / (V_MAX - V_TH), 0, 1);
    w.b = SciSim.approach(w.b, w.bT, dt, 20);
    w.hAcc += dt; while (w.hAcc >= 0.02) { w.hAcc -= 0.02; w.hist.push({ t: S.t, tx: vtx, rx: vrx }); }
    while (w.hist.length && S.t - w.hist[0].t > 2.05) w.hist.shift();
    // 미션 기록
    const sn = w.seen, hd = w.hold;
    if (w.src === 'dc' && w.bT > 0.05) sn.flash = true;
    if (w.src === 'dc' && w.on && w.tSw > 1.5 && w.bT === 0) { hd.dc = (hd.dc || 0) + dt; if (hd.dc > 1.0) sn.dcOff = true; } else hd.dc = 0;
    if (w.src === 'ac' && w.on && w.Nr === 20 && w.bT >= 0.15) { hd.a20 = (hd.a20 || 0) + dt; if (hd.a20 > 1.0) sn.ac20 = true; } else hd.a20 = 0;
    if (w.src === 'ac' && w.on && w.Nr === 40 && w.bT >= 0.9) { hd.a40 = (hd.a40 || 0) + dt; if (hd.a40 > 1.0) sn.ac40 = true; } else hd.a40 = 0;
  }

  /* ---------- 코일 · 휴대폰 장면 (① ② ③ 공통) ---------- */
  function drawCoilRow(cx, y, n, w, wireC, current) {
    const k = Math.max(3, Math.round(n / 4)), sp = w / k;
    for (let i = 0; i < k; i++) {
      const x = cx - w / 2 + (i + 0.5) * sp;
      ctx.beginPath(); ctx.arc(x, y, 5.4, 0, TAU); ctx.fillStyle = wireC; ctx.fill(); ctx.strokeStyle = 'rgba(70,40,10,.7)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - 1.6, y - 1.8, 1.6, 0, TAU); ctx.fill();
      if (current && Math.abs(current) > 0.05) { ctx.strokeStyle = current > 0 ? '#fff' : '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); if (current > 0) { ctx.arc(x, y, 1.4, 0, TAU); } else { ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); } ctx.stroke(); }
    }
  }
  // o: {Nt, Nr, gap, offS, field (-1~1, 크기와 부호), moving, led (0~1 | null), batt (0~1 | null), coin ({T}|null), srcLabel, srcOn, ph}
  function drawCharger(o) {
    const rx = CX + o.offS * PXMM, ry = rxYof(o.gap);
    // 바닥과 충전 패드
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(SCN.x + 4, GROUND, SCN.w - 8, SCN.y + SCN.h - GROUND - 4); ctx.fillStyle = '#b89870'; ctx.fillRect(SCN.x + 4, GROUND, SCN.w - 8, 3);
    D.shadow(() => { D.roundRect(CX - PADW / 2, PADTOP, PADW, 40, 8); ctx.fillStyle = '#4a5568'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#5b667a'; ctx.fillRect(CX - PADW / 2 + 6, PADTOP + 2, PADW - 12, 3);
    T(CX - PADW / 2 + 12, GROUND - 6, '충전 패드 (송신 코일 ' + o.Nt + '회)', 12, '#cfd6e2', 'left', 800);
    // 전원 상자
    const sx = SCN.x + 12, sy = GROUND - 62, sw = PHONE ? 62 : 74, sh = 50;
    D.shadow(() => { D.roundRect(sx, sy, sw, sh, 8); ctx.fillStyle = o.srcOn ? '#394258' : '#6b7488'; ctx.fill(); }, { blur: 5, y: 2 });
    T(sx + sw / 2, sy + 20, '전원', 12, '#fff', 'center', 800); T(sx + sw / 2, sy + 40, o.srcLabel || '', 13, '#ffd447', 'center', 800);
    ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + sw, sy + 25); ctx.lineTo(CX - PADW / 2 - 4, sy + 25); ctx.lineTo(CX - PADW / 2 - 4, TXY); ctx.lineTo(CX - COILW / 2 - 8, TXY); ctx.stroke();
    // 자기장
    const amp = Math.abs(o.field);
    if (amp > 0.03) {
      ctx.save(); ctx.lineWidth = 1.8; ctx.setLineDash(o.moving ? [5, 6] : [4, 5]); ctx.lineDashOffset = o.moving ? -S.t * 20 : 0;
      for (let k = -2; k <= 2; k++) {
        const u = k / 2, xt = CX + u * COILW / 2, xr = rx + u * COILW / 2 * 0.9, yt = TXY - 8, yr = ry + 8, xm = (xt + xr) / 2 + u * (26 + o.gap * 1.1);
        ctx.strokeStyle = C.rgba('#7c5cff', 0.15 + 0.7 * amp * (1 - Math.abs(u) * 0.3)); ctx.beginPath(); ctx.moveTo(xt, yt); ctx.quadraticCurveTo(xm, (yt + yr) / 2, xr, yr); ctx.stroke();
      }
      ctx.restore();
    }
    drawCoilRow(CX, TXY, o.Nt, COILW, '#d98b3a', 0);
    if (o.coin) {
      const hot = clamp((o.coin.T - T_ROOM) / (T_HOT * 2 - T_ROOM + 20), 0, 1);
      D.shadow(() => { ctx.beginPath(); ctx.ellipse(CX, PADTOP - 2, 26, 3.2, 0, 0, TAU); ctx.fillStyle = C.mix('#cfd6e2', '#ff5a1f', hot); ctx.fill(); }, { blur: 4 });
      ctx.fillStyle = C.mix('#aab3c2', '#ff8a3b', hot); ctx.fillRect(CX - 26, PADTOP - 4, 52, 3);
      if (hot > 0.15) D.glow(CX, PADTOP - 4, 46, '#ff6a2b', 0.5 * hot);
      T(CX + 34, PADTOP - 8, '동전 ' + Math.round(o.coin.T) + ' °C', 12.5, hot > 0.3 ? '#b42318' : '#26324a', 'left', 800);
    }
    // 수신 쪽 (휴대폰 또는 LED 보드)
    const bh = 72, bt = ry - bh + 14;
    D.shadow(() => { D.roundRect(rx - BODYW / 2, bt, BODYW, bh, 12); ctx.fillStyle = o.led != null ? '#7a8599' : '#1f2937'; ctx.fill(); }, { blur: 8, y: 3 });
    if (o.led == null) {
      D.roundRect(rx - BODYW / 2 + 6, bt + 6, BODYW - 12, bh - 24, 6); ctx.fillStyle = '#0f172a'; ctx.fill();
      // 배터리 막대
      const bx = rx - BODYW / 2 + 14, by = bt + 14, bw = BODYW - 28;
      ctx.strokeStyle = '#9fb0cc'; ctx.lineWidth = 2; D.roundRect(bx, by, bw, 16, 4); ctx.stroke();
      if (o.batt > 0.01) { D.roundRect(bx + 2, by + 2, (bw - 4) * clamp(o.batt, 0, 1), 12, 3); ctx.fillStyle = o.batt >= 1 ? '#14a058' : '#37d67a'; ctx.fill(); }
      T(rx, by + 32, o.charging ? '충전 중 ⚡' : (o.stopped ? '충전 중지' : '충전 안 됨'), 12.5, o.charging ? '#8be0a8' : '#cbd5e1', 'center', 800);
    } else {
      T(rx - BODYW / 2 + 12, bt + 20, '수신 코일 ' + o.Nr + '회', 12.5, '#fff', 'left', 800);
      const lx = rx + BODYW / 2 - 28, ly = bt + 26, b = o.led;
      if (b > 0.01) D.glow(lx, ly, 18 + 34 * Math.sqrt(b), '#ffd447', 0.3 + 0.6 * Math.sqrt(b));
      D.sphere(lx, ly, 11, b > 0.02 ? C.mix('#a89a6a', '#fff3a8', 0.25 + 0.75 * Math.sqrt(b)) : '#9a9484', { gloss: true });
      T(lx, ly + 30, 'LED', 11.5, '#fff', 'center', 800);
    }
    drawCoilRow(rx, ry, o.Nr, COILW, '#e6a04f', o.rxCur || 0);
    if (o.led == null) T(rx, bt - 8, '수신 코일 ' + o.Nr + '회', 12, '#5a6679', 'center', 800);
    // 간격 치수선
    if (o.gap > 0 && o.dim) {
      const x = CX - PADW / 2 - 6 + (PHONE ? 2 : 0) - 0;
      const y1 = PADTOP - 4, y2 = ry + 14, xx = SCN.x + SCN.w - 30;
      ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(xx, y1); ctx.lineTo(xx, y2); ctx.moveTo(xx - 5, y1); ctx.lineTo(xx + 5, y1); ctx.moveTo(xx - 5, y2); ctx.lineTo(xx + 5, y2); ctx.stroke();
      T(xx - 8, (y1 + y2) / 2 + 4, '간격 ' + o.gap + ' mm', 12.5, '#26324a', 'right', 800);
    }
    return { x: rx - BODYW / 2, y: bt, w: BODYW, h: bh, rx, ry };
  }
  let lastBody = null;

  function drawObs(dt) {
    const w = S.w;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(SCN.x, SCN.y, SCN.w, SCN.h, 14);
    T(SCN.x + 14, SCN.y + 26, '송신 코일 → 수신 코일', PHONE ? 13 : 14, '#26324a', 'left', 800);
    T(SCN.x + SCN.w - 14, SCN.y + 26, w.src === 'ac' ? '화면은 실제보다 ' + SLOW_WL + '배 느려요' : '', PHONE ? 11.5 : 12.5, '#5a6679', 'right', 700);
    ctx.save(); D.roundRect(SCN.x, SCN.y, SCN.w, SCN.h, 14); ctx.clip();
    const rxc = w.vRx === 0 ? 0 : Math.sign(w.vRx);
    lastBody = drawCharger({ Nt: NT1, Nr: w.Nr, gap: 5, offS: 0, field: w.field, moving: w.src === 'ac' && w.on, led: w.b, rxCur: rxc, srcOn: w.on, srcLabel: w.on ? (w.src === 'ac' ? '교류' : '직류 5 V') : '꺼짐', dim: true });
    ctx.restore();
    // 오실로스코프
    panel(PA.x, PA.y, PA.w, PA.h, 14);
    T(PA.x + 14, PA.y + 24, '전압의 변화 (최근 2초)', 13.5, '#26324a', 'left', 800);
    const pw = PA.w - 28, ph = PHONE ? 52 : 90;
    const plot = (y, title, key, amax, col, th) => {
      const x = PA.x + 14, yb = y + ph / 2;
      T(x, y - 6, title, 12.5, '#26324a', 'left', 800);
      ctx.fillStyle = '#f7f9fd'; ctx.fillRect(x, y, pw, ph); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + pw, yb); ctx.stroke();
      if (th) { ctx.strokeStyle = 'rgba(226,70,75,.7)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; [-1, 1].forEach((s) => { const yy = yb - s * th / amax * (ph / 2 - 2); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + pw, yy); ctx.stroke(); }); ctx.setLineDash([]); T(x + pw - 3, yb - th / amax * (ph / 2 - 2) - 3, 'LED 켜지는 전압 ' + f1(th) + ' V', 10.5, '#b42318', 'right', 800); }
      T(x + 3, y + 12, '+' + f1(amax), 10.5, '#5a6679', 'left', 700); T(x + 3, y + ph - 3, '−' + f1(amax), 10.5, '#5a6679', 'left', 700);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, pw, ph); ctx.clip(); ctx.beginPath(); let first = true;
      w.hist.forEach((h) => { const px = x + pw - (S.t - h.t) / 2 * pw, py = yb - clamp(h[key] / amax, -1, 1) * (ph / 2 - 2); if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); });
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    };
    plot(PA.y + 58, '송신 코일 전압 (V)', 'tx', V_TX, '#2f6df6', 0);
    plot(PA.y + 58 + ph + 36, '수신 코일 전압 (V)', 'rx', V_MAX, '#e2552a', V_TH);
    T(PA.x + PA.w - 14, PA.y + PA.h - 8, '지금 →', 11, '#7b8aa3', 'right', 700);
    // 에너지 흐름
    panel(PB.x, PB.y, PB.w, PB.h, 14);
    T(PB.x + 14, PB.y + 24, '에너지의 흐름', 13.5, '#26324a', 'left', 800);
    const bw = PHONE ? 130 : 200, bh = PHONE ? 52 : 60, y = PB.y + 40, gapx = (PB.w - 28 - bw * 3) / 2;
    const xs = [PB.x + 14, PB.x + 14 + bw + gapx, PB.x + 14 + 2 * (bw + gapx)];
    [['전원', '전기 에너지', '#2f6df6'], ['자기장', '자기 에너지', '#7c5cff'], ['수신 코일', '전기 에너지', '#f2873a']].forEach((b, i) => {
      D.roundRect(xs[i], y, bw, bh, 12); ctx.fillStyle = C.rgba(b[2], 0.12); ctx.fill(); ctx.strokeStyle = b[2]; ctx.lineWidth = 2; ctx.stroke();
      T(xs[i] + bw / 2, y + 22, b[0], PHONE ? 12 : 13, b[2], 'center', 800); T(xs[i] + bw / 2, y + 43, b[1], PHONE ? 12.5 : 14.5, '#26324a', 'center', 800);
    });
    const a1 = w.on ? 1 : 0, a2 = clamp(Math.abs(w.vRx) / V_MAX, 0, 1);
    D.arrow(xs[0] + bw + 3, y + bh / 2, xs[1] - 3, y + bh / 2, { color: '#2f6df6', width: 2 + 10 * a1, head: 10 + 6 * a1, alpha: 0.35 + 0.65 * a1 });
    D.arrow(xs[1] + bw + 3, y + bh / 2, xs[2] - 3, y + bh / 2, { color: '#f2873a', width: 2 + 12 * a2, head: 10 + 7 * a2, alpha: 0.25 + 0.75 * Math.min(1, a2 * 3) });
    const msg = w.src === 'ac' ? (w.on ? '자기장의 세기가 계속 변해요 → 수신 코일에 전류가 유도돼요 (LED ' + (w.bT > 0.02 ? '켜짐' : '꺼짐') + ')' : '스위치가 꺼져 있어요. 스위치를 켜 보세요.')
      : (w.on ? (w.tSw < 1.2 ? '스위치를 켠 순간: 자기장이 0에서 늘어나는 중 → 잠깐 유도돼요' : '자기장이 일정해졌어요 → 변하지 않아서 유도되지 않아요 (LED 꺼짐)') : (w.tSw < 1.2 && w.everOn ? '스위치를 끈 순간: 자기장이 줄어드는 중 → 반대 방향으로 잠깐 유도돼요' : '스위치가 꺼져 있어요. 스위치를 켜 보세요.'));
    textBlock(PB.x + 14, y + bh + 36, PB.w - 28, msg, PHONE ? 13 : 15, '#26324a', PHONE ? 19 : 22, 800);
    textBlock(PB.x + 14, y + bh + 36 + (PHONE ? 60 : 56), PB.w - 28, '수신 코일의 최대 전압 = 송신 전압 ' + f1(V_TX) + ' V × (수신 감은 수 ÷ 송신 감은 수 ' + NT1 + '회) × ' + f1(C1) + ' = ' + f1(vPeak1()) + ' V  (LED는 ' + f1(V_TH) + ' V부터 켜져요)', PHONE ? 11.5 : 12.5, '#5a6679', PHONE ? 17 : 18, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② 충전기 구현 ================= */
  const curD = () => ({ Nt: S.d.Nt, Nr: S.d.Nr, gap: S.d.gap, off: Math.abs(S.d.offS), f: S.d.f });
  function stepBuild(dt) {
    const d = S.d, ev = evalCh(curD());
    d.ph += TAU * FVIS * dt; if (d.ph > 1e4) d.ph -= 1e4 - (1e4 % TAU);
    d.ev = ev;
    if (S.mode === 'build' || true) {
      d.batt += ev.rate / 100 * dt;
      if (d.batt >= 1) { d.batt = 1; d.full += dt; if (d.full > 1.2) { d.batt = 0; d.full = 0; } } else d.full = 0;
    }
  }
  const rowEq = (r, d) => r.Nt === d.Nt && r.Nr === d.Nr && r.gap === d.gap && r.off === d.off && r.f === d.f;
  const diffVars = (r) => ['Nt', 'Nr', 'gap', 'off', 'f'].filter((k) => r[k] !== REF[k]);
  function record() {
    const d = curD(), ev = evalCh(d);
    const row = { Nt: d.Nt, Nr: d.Nr, gap: d.gap, off: d.off, f: d.f, P: ev.P, eta: ev.etaPct };
    if (diffVars(row).length > 1 && !(game && game.free)) { SciSim.toast('한 번에 하나만 바꿔요. 기준 설계(20회 · 20회 · 5 mm · 0 mm · 100 kHz)에서 하나만 바꾼 값을 기록해요.', 'bad'); Sound.fail(); return; }
    const i = S.d.rows.findIndex((r) => rowEq(r, row));
    if (i >= 0) S.d.rows[i] = row; else S.d.rows.push(row);
    Sound.success(); parts.burst(CX, TXY - 60, { count: 8, speed: 100, size: 3, colors: ['#ffb400', '#f26b3a', '#3867f4'], gravity: 150 });
  }
  const KNAME = { Nt: '송신 감은 수', Nr: '수신 감은 수', gap: '간격', off: '어긋남', f: '주파수' };
  function drawBuild(dt) {
    const d = S.d, ev = d.ev || evalCh(curD());
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(SCN.x, SCN.y, SCN.w, SCN.h, 14);
    T(SCN.x + 14, SCN.y + 26, '내가 만든 무선 충전기 (휴대폰을 끌어서 옮겨 보세요)', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(SCN.x, SCN.y, SCN.w, SCN.h, 14); ctx.clip();
    const fieldAmp = clamp(ev.eta * 1.3, 0, 1) * (H_F[d.f] > 0.05 ? 1 : 0.15);
    lastBody = drawCharger({ Nt: d.Nt, Nr: d.Nr, gap: d.gap, offS: d.offS, field: Math.sin(d.ph) * fieldAmp, moving: true, led: null, batt: d.batt, charging: ev.P >= 0.05, stopped: false, srcOn: true, srcLabel: fHz(d.f), dim: true });
    ctx.restore();
    // 수신 전력 계기판
    panel(PA.x, PA.y, PA.w, PA.h, 14);
    T(PA.x + 14, PA.y + 24, '성능 측정', 13.5, '#26324a', 'left', 800);
    const rows = [['송신 전력', f2(P_TX) + ' W', '#1d4ed8'], ['수신 전력', f2(ev.P) + ' W', ev.P >= TARGET_P && d.gap === TARGET_GAP ? '#0f7a43' : '#b8420f'], ['효율 (수신 / 송신)', ev.etaPct.toFixed(1) + ' %', '#26324a'], ['수신 코일 전압(최대)', f1(ev.V) + ' V', '#26324a']];
    const rh = PHONE ? 26 : 38;
    rows.forEach((r, i) => { const y = PA.y + 48 + i * rh; T(PA.x + 14, y + 16, r[0], PHONE ? 12.5 : 13.5, '#3a465c', 'left', 800); T(PA.x + PA.w - 14, y + 16, r[1], PHONE ? 15 : 18, r[2], 'right', 800); });
    const by = PA.y + 48 + rows.length * rh + 10, bw = PA.w - 28;
    T(PA.x + 14, by + 8, '목표: 간격 ' + TARGET_GAP + ' mm에서 ' + f1(TARGET_P) + ' W 이상', PHONE ? 12 : 13, '#26324a', 'left', 800);
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(PA.x + 14, by + 16, bw, 14);
    const pw = bw * clamp(ev.P / P_TX, 0, 1); if (pw > 0.1) { ctx.fillStyle = ev.P >= TARGET_P ? '#14a058' : '#f2873a'; ctx.fillRect(PA.x + 14, by + 16, pw, 14); }
    const tx = PA.x + 14 + bw * TARGET_P / P_TX; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tx, by + 12); ctx.lineTo(tx, by + 34); ctx.stroke();
    T(PA.x + 14, by + 46, '0 W', 11, '#5a6679', 'left', 700); T(PA.x + 14 + bw, by + 46, f1(P_TX) + ' W', 11, '#5a6679', 'right', 700); T(tx, by + 46, f1(TARGET_P), 11, '#26324a', 'center', 800);
    if (!PHONE) T(PA.x + 14, PA.y + PA.h - 12, '충전 속도 ' + f1(ev.rate) + ' %/초 (화면용 배터리 ' + E_BATT + ' J)', 12.5, '#5a6679', 'left', 700);
    // 기록표
    panel(PB.x, PB.y, PB.w, PB.h, 14);
    T(PB.x + 14, PB.y + 24, '측정 기록표 (기준 설계: ' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + REF.gap + ' mm · ' + REF.off + ' mm · ' + fHz(REF.f) + ')', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    const cx = PHONE ? [14, 62, 110, 160, 218, 306, 384] : [18, 108, 198, 288, 378, 496, 618], hy = PB.y + 48;
    ['송신', '수신', '간격', '어긋남', '주파수', '수신 전력', '효율'].forEach((h, i) => T(PB.x + cx[i], hy, h, 12, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(PB.x + 10, hy + 6); ctx.lineTo(PB.x + PB.w - 10, hy + 6); ctx.stroke();
    const rh2 = PHONE ? 24 : 26, nrows = Math.floor((PB.h - 68) / rh2), rws = d.rows.slice(-nrows);
    rws.forEach((r, i) => {
      const y = hy + 8 + i * rh2 + rh2 / 2 + 4, hi = (k) => (r[k] !== REF[k] ? '#c2410c' : '#26324a');
      T(PB.x + cx[0], y, r.Nt + '회', 13.5, hi('Nt'), 'left', 800); T(PB.x + cx[1], y, r.Nr + '회', 13.5, hi('Nr'), 'left', 800); T(PB.x + cx[2], y, r.gap + ' mm', 13.5, hi('gap'), 'left', 800);
      T(PB.x + cx[3], y, r.off + ' mm', 13.5, hi('off'), 'left', 800); T(PB.x + cx[4], y, fHz(r.f), 13.5, hi('f'), 'left', 800); T(PB.x + cx[5], y, f2(r.P) + ' W', 13.5, '#14653b', 'left', 800); T(PB.x + cx[6], y, r.eta.toFixed(1) + ' %', 13.5, '#26324a', 'left', 800);
    });
    if (!rws.length) T(PB.x + PB.w / 2, hy + 46, '📏 기록하기를 눌러 설계와 결과를 모아요', 13.5, '#98a2b3', 'center', 700);
    T(PB.x + PB.w - 14, PB.y + PB.h - 8, '주황색 = 기준 설계와 다른 값', 11, '#7b8aa3', 'right', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ③ 효율 분석 ================= */
  const coinEv = (g) => {
    const d = { Nt: REF.Nt, Nr: REF.Nr, gap: g.gap, off: 0, f: REF.f };
    const e0 = evalCh(d), cut = g.cut, ptx = cut ? 0 : P_TX;
    const prx0 = ptx * e0.eta, pc = g.coin ? COIN_ABS * prx0 : 0, prx = prx0 - pc;
    const rx2 = r2(prx), pc2 = r2(pc), ot2 = r2(ptx - rx2 - pc2);
    return { ptx, prx: rx2, pc: pc2, other: ot2, pcRaw: pc, eta: ptx > 0 ? Math.round(rx2 / ptx * 1000) / 10 : 0, etaRef: e0.etaPct };
  };
  function stepEff(dt) {
    const g = S.g;
    g.ph += TAU * FVIS * dt; if (g.ph > 1e4) g.ph -= 1e4 - (1e4 % TAU);
    if (g.detect && g.coin && !g.cut) { g.cutT += dt; if (g.cutT > 0.6) { g.cut = true; Sound.fail(); } } else if (!(g.detect && g.coin)) { g.cutT = 0; g.cut = false; }
    const ev = coinEv(g); g.ev = ev;
    if (g.coin) { g.tc += (ev.pcRaw - H_COIN * (g.tc - T_ROOM)) / C_COIN * dt; if (g.tc < T_ROOM) g.tc = T_ROOM; } else g.tc = T_ROOM;
    g.batt = (g.batt || 0) + ev.prx / E_BATT * dt; if (g.batt >= 1) { g.fullT = (g.fullT || 0) + dt; if (g.fullT > 1.2) { g.batt = 0; g.fullT = 0; } else g.batt = 1; }
    if (g.coin && g.tc >= T_HOT) g.seen.hot = true;
    if (g.coin && g.cut) g.seen.cut = true;
  }
  function recordPoint() {
    const g = S.g;
    if (g.coin) { SciSim.toast('동전을 치우고 점을 찍어요. 기준 충전기의 효율을 재요.', 'bad'); Sound.fail(); return; }
    g.pts[g.gap] = Math.round(etaGap(g.gap) * 10) / 10; Sound.success();
  }
  function drawEff(dt) {
    const g = S.g, ev = g.ev || coinEv(g);
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    panel(SCN.x, SCN.y, SCN.w, SCN.h, 14);
    T(SCN.x + 14, SCN.y + 26, '기준 충전기 (' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + fHz(REF.f) + ' · 정렬)', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(SCN.x, SCN.y, SCN.w, SCN.h, 14); ctx.clip();
    lastBody = drawCharger({ Nt: REF.Nt, Nr: REF.Nr, gap: g.gap, offS: 0, field: g.cut ? 0 : Math.sin(g.ph) * clamp(ev.etaRef / 80, 0, 1), moving: !g.cut, led: null, batt: g.batt || 0, charging: ev.prx > 0.01, stopped: g.cut, srcOn: !g.cut, srcLabel: g.cut ? '차단' : fHz(REF.f), coin: g.coin ? { T: g.tc } : null, dim: true });
    ctx.restore();
    if (g.cut) D.label(SCN.x + SCN.w / 2, SCN.y + 54, '이물질 감지! 충전 중지', { bg: '#e2464b', size: 13 });
    // 그래프
    panel(PA.x, PA.y, PA.w, PA.h, 14);
    T(PA.x + 14, PA.y + 24, '간격에 따른 효율', 13.5, '#26324a', 'left', 800);
    const gx0 = PA.x + 46, gx1 = PA.x + PA.w - 16, gy0 = PA.y + 56, gy1 = PA.y + PA.h - 36;
    const X = (d) => gx0 + d / 20 * (gx1 - gx0), Y = (v) => gy1 - clamp(v / 100, 0, 1) * (gy1 - gy0);
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 6, Y(v) + 4, v + '', 11.5, '#3a465c', 'right', 800); });
    [0, 5, 10, 15, 20].forEach((d) => { ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(d), gy0); ctx.lineTo(X(d), gy1); ctx.stroke(); T(X(d), gy1 + 16, d + '', 11.5, '#3a465c', 'center', 800); });
    T(gx1, gy1 + 30, '간격 (mm)', 11.5, '#5a6679', 'right', 800); T(PA.x + 14, gy0 - 8, '효율 (%)', 11.5, '#5a6679', 'left', 800);
    const ks = Object.keys(g.pts).map(Number).sort((a, b) => a - b);
    if (ks.length > 1) { ctx.beginPath(); ks.forEach((k, i) => (i ? ctx.lineTo(X(k), Y(g.pts[k])) : ctx.moveTo(X(k), Y(g.pts[k])))); ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke(); }
    ks.forEach((k) => { D.sphere(X(k), Y(g.pts[k]), 6, '#2f6df6', { shadow: true }); T(X(k), Y(g.pts[k]) - 10, g.pts[k].toFixed(0), 12, '#1d4ed8', 'center', 800); });
    ctx.strokeStyle = '#f26b3a'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X(g.gap), gy0); ctx.lineTo(X(g.gap), gy1); ctx.stroke(); ctx.setLineDash([]);
    T(X(g.gap) + (g.gap > 14 ? -4 : 4), gy0 + 14, '지금 ' + g.gap + ' mm', 11.5, '#c2410c', g.gap > 14 ? 'right' : 'left', 800);
    // 에너지 흐름 + 동전
    panel(PB.x, PB.y, PB.w, PB.h, 14);
    T(PB.x + 14, PB.y + 24, '송신 전력이 나뉘는 모습 (눈금 0 ~ ' + f1(P_TX) + ' W)', 13.5, '#26324a', 'left', 800);
    const bx = PB.x + 14, bw = PB.w - 28, by = PB.y + 40, bh = 26;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx, by, bw, bh);
    const segs = [[ev.prx, '#14a058', '수신 전력'], [ev.pc, '#ff7a2b', '동전의 열'], [ev.other, '#e2464b', '코일 저항·새는 자기장의 열']];
    let xx = bx; segs.forEach((s) => { const w = bw * s[0] / P_TX; if (w > 0.2) { ctx.fillStyle = s[1]; ctx.fillRect(xx, by, w, bh); } xx += w; });
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    T(bx, by + bh + 16, '0', 11, '#5a6679', 'left', 700); T(bx + bw, by + bh + 16, f1(P_TX) + ' W', 11, '#5a6679', 'right', 700);
    const lw = PHONE ? bw : bw / 3, ly = by + bh + 40;
    segs.forEach((s, i) => {
      const lx = bx + (PHONE ? 0 : i * lw), yy = ly + (PHONE ? i * 19 : 0);
      ctx.fillStyle = s[1]; ctx.fillRect(lx, yy - 11, 12, 12); T(lx + 18, yy, s[2] + ' ' + f2(s[0]) + ' W', PHONE ? 12.5 : 13, '#26324a', 'left', 800);
    });
    const iy = ly + (PHONE ? 62 : 40);
    T(bx, iy, '송신 ' + f2(ev.ptx) + ' W = 수신 ' + f2(ev.prx) + ' + 동전 ' + f2(ev.pc) + ' + 그 밖의 열 ' + f2(ev.other) + ' (W)', PHONE ? 11.5 : 14, '#26324a', 'left', 800);
    T(bx, iy + (PHONE ? 20 : 28), '효율 ' + ev.eta.toFixed(1) + ' %   ·   동전 온도 ' + Math.round(g.tc) + ' °C', PHONE ? 12.5 : 14.5, g.tc >= T_HOT ? '#b42318' : '#c2410c', 'left', 800);
    if (!PHONE) textBlock(bx, iy + 58, bw, g.coin ? (g.detect ? '이물질 감지 기능이 동전을 찾으면 전원을 차단해서 열을 막아요.' : '동전 안에 소용돌이 모양의 전류(와전류)가 생겨 동전이 뜨거워지고, 수신 전력은 줄어요.') : '코일 사이에 금속 이물질이 없을 때의 기준 효율이에요.', 13.5, '#5a6679', 20, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ④ 기술과 영향 ================= */
  const TECH = [
    ['📱', '스마트폰 패드', '5 W · 효율 약 ' + Math.round(PH_EFF * 100) + ' % (간격 5 mm)', '선 없이 올려 놓기만 해요'],
    ['🚗', '전기차 충전 패드', '3.3 ~ 11 kW · 효율 약 ' + Math.round(EV_EFF * 100) + ' %', '주차만 하면 충전돼요'],
    ['🪥', '전동 칫솔·스마트워치', '적은 전력', '접점이 없어 방수가 쉬워요'],
    ['🫀', '의료용 임플란트', '아주 적은 전력', '피부를 뚫지 않고 충전해요'],
    ['🚌', '교통카드 (NFC)', '정보를 읽는 데 쓰는 소량', '배터리 없이 가까이 대면 작동해요'],
  ];
  const STMT = [
    ['선으로 충전할 때보다 에너지 손실이 큰 편이에요', 'con'],
    ['선을 꽂지 않아도 돼서 편리해요', 'pro'],
    ['간격이 멀어지면 효율이 크게 떨어져요', 'con'],
    ['접점이 닳지 않아 오래 쓸 수 있어요', 'pro'],
    ['금속 이물질이 끼면 뜨거워질 수 있어요', 'con'],
    ['접점이 없어서 방수 처리가 쉬워요', 'pro'],
    ['코일이 어긋나면 충전이 느려져요', 'con'],
    ['몸속 기기를 피부를 뚫지 않고 충전해요', 'pro'],
  ];
  const KLAB = { pro: '장점', con: '한계' }, KCOL = { pro: '#14a058', con: '#e2464b' };
  function drawTech(dt) {
    const c = S.c;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    // 장면 카드
    const cw = PHONE ? 142 : 146, ch = PHONE ? 112 : 172, gap = 8;
    const colsN = PHONE ? 3 : 5;
    TECH.forEach((t, i) => {
      const col = i % colsN, row = Math.floor(i / colsN);
      const x = 12 + col * (cw + gap) + (PHONE ? 0 : 0), y = 12 + row * (ch + gap);
      panel(x, y, cw, ch, 14);
      T(x + 14, y + 36, t[0], PHONE ? 26 : 32, '#26324a', 'left', 800);
      textBlock(x + (PHONE ? 50 : 56), y + 24, cw - (PHONE ? 58 : 64), t[1], PHONE ? 12 : 13, '#26324a', 15, 800);
      textBlock(x + 12, y + (PHONE ? 58 : 70), cw - 22, '⚡ ' + t[2], PHONE ? 11 : 12, '#b8420f', PHONE ? 14 : 16, 800);
      textBlock(x + 12, y + (PHONE ? 94 : 124), cw - 22, '✔ ' + t[3], PHONE ? 11 : 12, '#3a465c', PHONE ? 14 : 16, 700);
    });
    // 분류
    const y0 = PHONE ? 12 + 2 * (ch + gap) + 6 : 12 + ch + gap + 6;
    T(14, y0 + 16, '무선 충전의 장점과 한계를 분류해요', 14, '#26324a', 'left', 800);
    const rh = PHONE ? 50 : 62, rw = PHONE ? 456 : 380, cols2 = PHONE ? 1 : 2;
    STMT.forEach((s, i) => {
      const col = Math.floor(i / (STMT.length / cols2)), row = i % (STMT.length / cols2);
      const x = 12 + col * (rw + 12), y = y0 + 28 + row * rh;
      D.roundRect(x, y, rw, rh - 6, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.6; ctx.stroke();
      textBlock(x + 12, y + (PHONE ? 20 : 24), rw - 122, s[0], PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 800);
      const k = c.cls[i], bad = c.bad[i], sh = c.shake[i] ? Math.sin((S.t - c.shake[i]) * 50) * 4 * Math.max(0, 1 - (S.t - c.shake[i]) / 0.4) : 0;
      const px = x + rw - 100 + sh, pw = 90, ph = 34, py = y + (rh - 6 - ph) / 2;
      D.roundRect(px, py, pw, ph, 17); ctx.fillStyle = k ? C.rgba(KCOL[k], 0.14) : '#fff'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = bad ? '#e2464b' : k ? KCOL[k] : '#b9c1d0'; if (!k) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(px + pw / 2, py + 22, k ? KLAB[k] : '눌러서 분류', 13, k ? KCOL[k] : '#7b8aa3', 'center', 800);
      S.hits.push({ x: px - 6, y: y, w: pw + 12, h: rh - 6, fn: () => { const o = ['', 'pro', 'con']; c.cls[i] = o[(o.indexOf(c.cls[i] || '') + 1) % 3] || ''; delete c.bad[i]; Sound.click(); } });
    });
    parts.update(dt); parts.draw(ctx);
  }
  const techDone = () => STMT.every((s, i) => S.c.cls[i]);

  /* ---------- 포인터 (끌기 · 버튼) ---------- */
  function hitAt(p) { for (let i = S.hits.length - 1; i >= 0; i--) { const h = S.hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  const inBody = (p) => lastBody && p.x >= lastBody.x && p.x <= lastBody.x + lastBody.w && p.y >= lastBody.y && p.y <= lastBody.y + lastBody.h;
  SciSim.pointer(view, {
    down(p) {
      if ((S.mode === 'build' || S.mode === 'eff') && inBody(p)) { S.drag = { dx: p.x - lastBody.rx, dy: p.y - lastBody.ry }; return true; }
      const h = hitAt(p); if (h) { S.press = { hit: h, x: p.x, y: p.y }; return true; }
      return false;
    },
    move(p) {
      if (!S.drag) return;
      const gap = clamp(Math.round((PADTOP - 18 - (p.y - S.drag.dy)) / PXMM), 0, 20);
      if (S.mode === 'build') { S.d.gap = gap; S.d.offS = clamp(Math.round((p.x - S.drag.dx - CX) / PXMM), -10, 10); }
      else S.g.gap = gap;
      updateCtl();
    },
    up(p) { S.drag = null; if (S.press && Math.hypot(p.x - S.press.x, p.y - S.press.y) < 14) S.press.hit.fn(); S.press = null; },
    hover(p) { return ((S.mode === 'build' || S.mode === 'eff') && inBody(p)) || (S.mode === 'tech' && hitAt(p)) ? 'pointer' : 'default'; },
  });

  /* ---------- 컨트롤 연결 ---------- */
  $$('#srcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.w.src = b.dataset.v; S.w.on = false; S.w.everOn = false; S.w.lastOn = false; S.w.tSw = 99; S.w.hist.length = 0; updateCtl(); }));
  $('#bSw').addEventListener('click', () => { Sound.click(); S.w.on = !S.w.on; updateCtl(); });
  $$('#nrSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.w.Nr = +b.dataset.v; updateCtl(); }));
  $('#sNt').addEventListener('input', (e) => { S.d.Nt = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sNr').addEventListener('input', (e) => { S.d.Nr = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sGap').addEventListener('input', (e) => { S.d.gap = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sOff').addEventListener('input', (e) => { S.d.offS = (S.d.offS < 0 ? -1 : 1) * +e.target.value; Sound.tick(); updateCtl(); });
  $$('#fSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.d.f = +b.dataset.v; updateCtl(); }));
  $('#bRec').addEventListener('click', record);
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.d.rows = []; });
  $('#sGap3').addEventListener('input', (e) => { S.g.gap = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bPt').addEventListener('click', recordPoint);
  $('#bPtClear').addEventListener('click', () => { Sound.click(); S.g.pts = {}; });
  $$('#coinSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.g.coin = b.dataset.v === '1'; updateCtl(); }));
  $$('#detSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.g.detect = b.dataset.v === '1'; updateCtl(); }));
  $('#coinSel').addEventListener('change', (e) => { S.g.choice = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  $('#bClearTech').addEventListener('click', () => { Sound.click(); S.c.cls = {}; S.c.bad = {}; });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'obs') {
      const w = S.w;
      L1 = '수신 코일 전압'; a = (w.vRx >= 0 ? '+' : '−') + f1(Math.abs(w.vRx)) + ' V';
      L2 = 'LED'; b = w.bT > 0.02 ? '켜짐 ' + Math.round(w.bT * 100) + ' %' : '꺼짐';
      L3 = '전원'; c = !w.on ? '스위치 꺼짐' : (w.src === 'ac' ? '교류 · 계속 변함' : '직류 · 일정');
    } else if (S.mode === 'build') {
      const ev = S.d.ev || evalCh(curD());
      L1 = '수신 전력'; a = f2(ev.P) + ' W'; L2 = '효율'; b = ev.etaPct.toFixed(1) + ' %'; L3 = '간격 · 어긋남'; c = S.d.gap + ' mm · ' + Math.abs(S.d.offS) + ' mm';
    } else if (S.mode === 'eff') {
      const ev = S.g.ev || coinEv(S.g);
      L1 = '간격'; a = S.g.gap + ' mm'; L2 = '효율'; b = ev.eta.toFixed(1) + ' %'; L3 = '동전 온도'; c = S.g.coin ? Math.round(S.g.tc) + ' °C' : '동전 없음';
    } else {
      L1 = '분류한 문장'; a = STMT.filter((s, i) => S.c.cls[i]).length + ' / ' + STMT.length; L2 = '전기차 패드 효율'; b = '약 ' + Math.round(EV_EFF * 100) + ' %'; L3 = '스마트폰 패드 효율'; c = '약 ' + Math.round(PH_EFF * 100) + ' %';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const nPts = () => [0, 5, 10, 20].filter((g) => S.g.pts[g] != null).length;
  const baseRow = () => S.d.rows.find((r) => diffVars(r).length === 0);
  const oneVarRows = () => { const ks = {}; S.d.rows.forEach((r) => { const dv = diffVars(r); if (dv.length === 1) ks[dv[0]] = true; }); return Object.keys(ks); };
  const levels = [
    {
      title: '전선 없이 에너지가 전달되는 까닭', short: '유도 전달', icon: '🔌', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전선이 없는데 어떻게 스마트폰이 충전될까? 멀리 떼면 왜 충전이 안 될까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 코일을 지나는 자기장의 세기가 <b>변할 때</b> 코일에 전류가 유도된다는 <b>전자기 유도</b>를 배웠어요. 이번에는 이것을 <b>에너지를 전달</b>하는 기술로 살펴봐요.</div>' +
        '<p>송신 코일(전원에 연결)과 수신 코일(LED에 연결)을 가까이 놓고, 전원이 <b>직류</b>일 때와 <b>교류</b>일 때 LED가 어떻게 되는지 관찰해요.</p>',
      features: ['obs'],
      setup() { S.w = { src: 'dc', on: false, everOn: false, Nr: 20, ph: 0, tSw: 99, vTx: 0, vRx: 0, vEnv: 0, bT: 0, b: 0, hist: [], hAcc: 0, seen: {}, hold: {}, lastOn: false, field: 0 }; need = ''; setScene('obs'); updateCtl(); },
      recap: '전원이 켜지거나 꺼지는 순간, 또는 교류처럼 자기장의 세기가 계속 변할 때만 수신 코일에 전류가 유도돼 에너지가 전달돼요. 수신 코일의 감은 수가 많으면 유도 전압이 커져요.',
      summary: '<ul><li>송신 코일의 <b>변하는 자기장</b> → 수신 코일에 <b>유도 전류</b>: 전기 에너지 → 자기장 → 전기 에너지로 전달돼요.</li><li><b>직류</b>는 스위치를 켜거나 끄는 <b>순간</b>에만 자기장이 변해 LED가 잠깐 깜박이고, 일정해지면 유도되지 않아요.</li><li><b>교류</b>는 자기장이 계속 변하므로 LED가 계속 켜져요.</li><li>수신 코일의 감은 수가 송신의 <b>2배</b>이면 수신 전압도 약 <b>2배</b> (' + f1(V_TX) + ' V × 2 × ' + f1(C1) + ' = ' + f1(V_TX * 2 * C1) + ' V).</li></ul>',
      missions: [
        {
          title: '직류와 교류, 수신 코일 비교하기',
          goal: '① <b>직류</b>: 스위치를 켜는 순간 LED가 깜박이는 것과, 계속 켜 두면 꺼지는 것 ② <b>교류</b>: LED가 켜지는 것 ③ 교류에서 수신 코일을 <b>40회</b>로 하면 더 밝아지는 것을 관찰하세요.',
          hint: '직류를 고르고 스위치를 켜요. 순간 깜박인 뒤 1.5초가 지나면 꺼져요. 그다음 교류로 바꾸고 스위치를 켜서 1초 이상 기다리고, 수신 코일을 40회로 바꿔요.',
          setup() { need = ''; S.w.seen = {}; S.w.hold = {}; updateCtl(); setScene('obs'); },
          check: () => S.w.seen.flash && S.w.seen.dcOff && S.w.seen.ac20 && S.w.seen.ac40,
          hold: 0.3,
          status: () => mark(S.w.seen.flash) + ' 직류: 켜는 순간 깜박 &nbsp; ' + mark(S.w.seen.dcOff) + ' 직류: 계속 켜면 꺼짐<br>' + mark(S.w.seen.ac20) + ' 교류 20회: 켜짐 &nbsp; ' + mark(S.w.seen.ac40) + ' 교류 40회: 더 밝음',
          explain: '<b>직류</b>는 스위치를 켠 순간만 자기장이 0에서 늘어나 LED가 잠깐 깜박이고(' + f1(V_TX * C1) + ' V), 일정해지면 <b>유도되지 않아요</b>. <b>교류</b>는 자기장이 계속 변해 LED가 계속 켜져요. 수신 코일을 40회로 하면 최대 전압이 ' + f1(V_TX * (20 / NT1) * C1) + ' V에서 <b>' + f1(V_TX * (40 / NT1) * C1) + ' V</b>로 커져 더 밝아요.',
        },
        {
          type: 'quiz', title: '왜 교류여야 할까?',
          goal: '무선 충전기에 <b>교류</b>를 쓰는 까닭으로 가장 알맞은 것은?',
          setup() { need = ''; updateCtl(); setScene('obs'); },
          choices: ['교류가 직류보다 전압이 항상 더 높아서', '교류는 전류와 자기장의 세기가 계속 변해 수신 코일에 전류가 계속 유도되어서', '교류는 자기장을 만들지 않아서', '직류는 코일에 흐를 수 없어서'],
          answer: 1,
          feedback: ['전압의 높낮이가 아니라 자기장이 변하는지가 중요해요.', '', '교류도 코일에 흐르면 자기장을 만들어요. 그 자기장이 계속 변해서 유도가 계속돼요.', '직류도 코일에 흐르지만 자기장이 일정해지면 유도되지 않아요.'],
          explain: '수신 코일에 전류가 계속 유도되려면 코일을 지나는 <b>자기장의 세기가 계속 변해야</b> 해요. 교류는 전류의 크기와 방향이 계속 바뀌어 자기장도 계속 변하므로 에너지가 끊임없이 전달돼요.',
        },
      ],
    },
    {
      title: '무선 충전기 구현하기', short: '충전기 구현', icon: '🛠️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변하는 자기장으로 에너지가 전달되고, 수신 코일의 감은 수가 전압에 영향을 준다는 것을 알았어요. 이제 <b>충전 성능</b>을 높이는 충전기를 <b>직접 구현</b>해요.</div>' +
        '<p>송신·수신 코일의 감은 수, 코일 <b>간격</b>, 중심 <b>어긋남</b>, 교류 <b>주파수</b>를 골라 <b>수신 전력</b>을 재요. 송신 전력은 ' + f1(P_TX) + ' W예요. <b>목표</b>: 간격 ' + TARGET_GAP + ' mm에서 <b>' + f1(TARGET_P) + ' W 이상</b> 수신하기. 휴대폰을 손가락으로 끌어 옮겨 볼 수도 있어요.</p>',
      features: ['build'],
      setup() { S.d = { Nt: 20, Nr: 35, gap: 5, off: 6, offS: 6, f: 1000, batt: 0, full: 0, rows: [], ph: 0 }; need = ''; setScene('build'); updateCtl(); },
      recap: '효율은 코일 간격이 가까울수록, 중심이 잘 맞을수록, 주파수가 높을수록(약 100 kHz 이상), 송·수신 코일이 알맞을수록 커요. 한 번에 하나의 변인만 바꾸어야 각 요인의 영향을 알 수 있어요.',
      summary: '<ul><li>무선 충전기는 <b>코일 간격 · 중심 어긋남 · 주파수 · 감은 수</b>에 따라 성능이 달라져요.</li><li>기준 설계(' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + REF.gap + ' mm · ' + REF.off + ' mm · ' + fHz(REF.f) + ')에서 송신 ' + f1(P_TX) + ' W → 수신 <b>' + f2(evalCh(REF).P) + ' W</b> (효율 ' + evalCh(REF).etaPct.toFixed(1) + ' %).</li><li><b>50 Hz</b> 같은 낮은 주파수에서는 거의 전달되지 않고, 약 <b>100 kHz</b> 이상에서 잘 전달돼요.</li><li><b>변인 통제</b>: 한 번에 하나만 바꾸어 기록해야 어느 요인 때문인지 알 수 있어요.</li></ul>',
      missions: [
        {
          title: '목표를 만족하는 충전기 설계',
          goal: '코일 간격을 <b>' + TARGET_GAP + ' mm</b>로 두고 수신 전력이 <b>' + f1(TARGET_P) + ' W 이상</b>이 되는 설계를 찾으세요.',
          hint: '주파수가 낮으면 거의 전달되지 않아요. 100 kHz 이상으로 올리고, 어긋남을 줄이고, 송신·수신 감은 수를 비슷하게 맞춰 보세요.',
          setup() { need = ''; updateCtl(); setScene('build'); },
          check: () => S.d.gap === TARGET_GAP && evalCh(curD()).P >= TARGET_P,
          hold: 0.8,
          status: () => { const ev = evalCh(curD()); return mark(S.d.gap === TARGET_GAP) + ' 간격 ' + S.d.gap + ' mm (목표 ' + TARGET_GAP + ' mm) &nbsp; ' + mark(ev.P >= TARGET_P) + ' 수신 ' + f2(ev.P) + ' W (목표 ' + f1(TARGET_P) + ' W 이상)'; },
          explain: '주파수 <b>100 kHz 이상</b>, 어긋남 <b>작게</b>, 송수신 감은 수를 <b>비슷하게</b> 하면 효율이 ' + evalCh(REF).etaPct.toFixed(1) + ' %에 가까워져요. 기준 설계는 ' + f1(P_TX) + ' W 중 <b>' + f2(evalCh(REF).P) + ' W</b>를 수신해요. 어긋남이 커지거나 주파수가 낮으면 목표에 못 미쳐요.',
        },
        {
          title: '변수를 하나씩 바꿔 기록하기', manual: true,
          goal: '기준 설계(' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + REF.gap + ' mm · ' + REF.off + ' mm · ' + fHz(REF.f) + ')를 기록한 뒤, 변수를 <b>하나씩만</b> 바꾼 설계를 <b>3가지 변수</b> 이상 기록하고 ✔ 확인하기를 누르세요.',
          hint: '먼저 기준 값으로 맞추고 📏 기록하기를 눌러요. 그다음 간격만, 주파수만, 어긋남만처럼 한 가지씩 바꿔 기록해요.',
          setup() { need = ''; S.d.rows = []; updateCtl(); setScene('build'); },
          check() {
            if (!baseRow()) return '먼저 기준 설계(' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + REF.gap + ' mm · ' + REF.off + ' mm · ' + fHz(REF.f) + ')를 기록해요.';
            const n = oneVarRows().length;
            if (n < 3) return '기준에서 변수를 하나씩만 바꾼 기록이 ' + n + '가지예요. ' + (3 - n) + '가지 더 기록해요.';
            return true;
          },
          status: () => mark(!!baseRow()) + ' 기준 기록 &nbsp; 하나씩 바꾼 변수 ' + oneVarRows().length + ' / 3' + (oneVarRows().length ? ' (' + oneVarRows().map((k) => KNAME[k]).join(', ') + ')' : ''),
          explain: '기준에서 변수를 <b>하나씩</b> 바꿔 기록하면 각 요인의 영향이 보여요. 간격이 늘면 효율이 줄고, 어긋남이 커지면 줄고, 주파수가 낮으면 크게 줄어요.',
        },
        {
          type: 'quiz', title: '변수를 하나씩만 바꾸는 까닭',
          goal: '간격과 주파수를 <b>동시에</b> 바꾸어 기록하면 안 되는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('build'); },
          choices: ['측정 시간이 길어지기 때문에', '수신 전력이 달라진 까닭이 어느 변수 때문인지 알 수 없기 때문에', '코일이 뜨거워지기 때문에', '기록표가 가득 차기 때문에'],
          answer: 1,
          feedback: ['시간 때문이 아니에요. 결과를 해석할 수 있는지가 중요해요.', '', '이 실험에서는 코일의 열이 문제가 되지 않아요.', '기록표의 크기는 이유가 아니에요.'],
          explain: '두 변수를 함께 바꾸면 수신 전력이 변해도 <b>어느 변수 때문인지</b> 알 수 없어요. 그래서 한 번에 <b>하나의 변인만</b> 바꾸고 나머지는 같게 하는 <b>변인 통제</b>가 필요해요.',
        },
      ],
    },
    {
      title: '효율과 에너지 손실 분석하기', short: '효율 분석', icon: '📉', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충전기의 성능이 간격과 주파수에 따라 달라지는 것을 봤어요. 이제 <b>효율</b> = 수신 전력 ÷ 송신 전력을 그래프로 분석하고, 사라지는 에너지가 어디로 가는지 살펴봐요.</div>' +
        '<p>기준 충전기(' + REF.Nt + '회 · ' + REF.Nr + '회 · ' + fHz(REF.f) + ' · 정렬)에서 간격을 바꿔 효율을 재고, 코일 사이에 <b>동전</b> 같은 금속을 넣었을 때를 관찰해요.</p>',
      features: ['eff'],
      setup() { S.g = { gap: 5, coin: false, detect: false, tc: T_ROOM, pts: {}, cut: false, cutT: 0, seen: {}, choice: '', ph: 0 }; need = ''; $('#coinSel').value = ''; setScene('eff'); updateCtl(); },
      recap: '효율은 간격이 멀어질수록 줄어요. 효율이 100 %보다 작은 것은 에너지가 사라져서가 아니라 일부가 열이 되기 때문이에요. 금속 이물질은 와전류로 뜨거워지므로 감지해서 전원을 차단해야 해요.',
      summary: '<ul><li><b>효율 = 수신 전력 ÷ 송신 전력 × 100</b>. 기준 충전기: 간격 0 mm <b>75 %</b>, 5 mm <b>65 %</b>, 10 mm <b>45 %</b>, 20 mm <b>15 %</b>.</li><li>송신 전력 = 수신 전력 + 열(코일 저항 I²R, 새어 나간 자기장, 이물질). <b>에너지는 보존</b>되지만 일부가 열이 돼요.</li><li>코일 사이의 <b>금속 이물질</b>에는 <b>와전류</b>가 생겨 뜨거워지고 효율이 줄어요 → 이물질을 <b>감지해서 전원을 차단</b>해요.</li><li>선 충전보다 에너지 손실이 큰 편이에요.</li></ul>',
      missions: [
        {
          title: '간격–효율 그래프 점 찍기',
          goal: '코일 간격을 <b>0 · 5 · 10 · 20 mm</b>로 바꾸면서 각각 <b>📍 점 찍기</b>를 눌러 그래프를 완성하세요.',
          hint: '간격 슬라이더를 0, 5, 10, 20 mm로 맞추고 점 찍기를 눌러요. 휴대폰을 위아래로 끌어서도 간격을 바꿀 수 있어요. 동전은 치워 두세요.',
          setup() { need = ''; S.g.coin = false; updateCtl(); setScene('eff'); },
          check: () => nPts() === 4,
          hold: 0.5,
          status: () => [0, 5, 10, 20].map((g) => mark(S.g.pts[g] != null) + ' ' + g + ' mm' + (S.g.pts[g] != null ? ' (' + S.g.pts[g].toFixed(0) + ' %)' : '')).join(' &nbsp; '),
          explain: '간격이 0 mm → 5 → 10 → 20 mm로 멀어지면 효율은 <b>75 → 65 → 45 → 15 %</b>로 줄어요. 코일이 멀어질수록 송신 코일의 자기장이 수신 코일을 적게 지나가서 유도되는 에너지가 줄기 때문이에요.',
        },
        {
          title: '이물질이 끼었을 때', manual: true,
          goal: '코일 사이에 <b>동전</b>을 올려 동전이 <b>' + T_HOT + ' °C 이상</b> 뜨거워지는 것을 관찰한 뒤, 충전기가 어떻게 대처해야 하는지 고르고 ✔ 확인하기를 누르세요.',
          hint: '동전 올려 놓기를 누르고 몇 초 기다리면 동전 온도가 올라가요. 이물질 감지 기능을 켜 보면 충전기가 어떻게 되는지 볼 수 있어요.',
          setup() { need = 'coin'; S.g.seen = {}; S.g.choice = ''; $('#coinSel').value = ''; $('#coinSel').classList.remove('ok', 'bad'); updateCtl(); setScene('eff'); },
          check() {
            const sel = $('#coinSel');
            if (!S.g.seen.hot) { return '먼저 동전을 올려 동전이 ' + T_HOT + ' °C 이상 뜨거워지는 것을 관찰해요.'; }
            if (!S.g.choice) return '충전기의 대처를 골라 주세요.';
            if (S.g.choice === 'cut') { sel.classList.remove('bad'); sel.classList.add('ok'); return true; }
            sel.classList.remove('ok'); sel.classList.add('bad');
            return S.g.choice === 'keep' ? '계속 충전하면 동전이 점점 더 뜨거워져 위험해요.' : '출력을 높이면 동전에서 나오는 열도 더 커져요.';
          },
          status: () => mark(S.g.seen.hot) + ' 동전 ' + T_HOT + ' °C 이상 &nbsp; 지금 동전 ' + Math.round(S.g.tc) + ' °C' + (S.g.seen.cut ? ' &nbsp; ✅ 감지 후 차단 확인' : ''),
          explain: '코일 사이의 금속에는 <b>와전류</b>가 생겨 열이 나요(동전이 뜨거워지고 수신 전력은 줄어요). 그래서 충전기는 <b>이물질을 감지하고 전원을 차단</b>해 화상과 화재를 막아요.',
        },
        {
          type: 'quiz', title: '효율이 100 %보다 작은 까닭',
          goal: '무선 충전의 효율이 100 %보다 작은 까닭으로 옳은 것은?',
          setup() { need = ''; updateCtl(); setScene('eff'); },
          choices: ['에너지의 일부가 없어져 버려서', '에너지는 보존되지만 일부가 열(코일 저항, 새어 나간 자기장 등)로 바뀌어서', '수신 코일이 에너지를 만들어 내서', '교류의 에너지는 계산할 수 없어서'],
          answer: 1,
          feedback: ['에너지는 없어지지 않아요(에너지 보존). 다른 형태로 바뀔 뿐이에요.', '', '수신 코일은 에너지를 만들지 못하고 전달받기만 해요.', '교류의 전력도 계산할 수 있어요.'],
          explain: '에너지는 <b>보존</b>돼요. 송신한 에너지가 수신 전력과 열(코일 저항 I²R, 새어 나간 자기장, 이물질)로 나뉘어 <b>합이 같아요</b>. 이 열 때문에 충전 중에 휴대폰이 따뜻해지고, 선 충전보다 손실이 큰 편이에요.',
        },
      ],
    },
    {
      title: '무선 충전 기술과 우리 생활', short: '기술의 영향', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 무선 충전은 변하는 자기장으로 에너지를 전달하고, 간격과 어긋남에 민감하며 열 손실이 있다는 것을 알았어요. 이 기술이 <b>우리 생활</b>에 어떻게 쓰이는지 알아봐요.</div>' +
        '<p>장면 카드를 비교하고, 무선 충전의 <b>장점</b>(편리, 방수, 접점 마모 없음)과 <b>한계</b>(효율, 열, 거리)를 나눠 정리해요. 에너지 효율의 관점에서 알맞은 방식을 고르는 문제도 풀어 봐요.</p>',
      features: ['tech'],
      setup() { S.c = { cls: {}, bad: {}, shake: {} }; need = ''; setScene('tech'); updateCtl(); },
      recap: '무선 충전은 편리하고 방수가 쉽고 접점이 닳지 않는 장점이 있지만, 선 충전보다 손실이 크고 간격과 어긋남에 민감해요. 쓰임새에 따라 필요한 전력과 효율이 달라서 알맞은 설계를 선택해야 해요.',
      summary: '<ul><li><b>장점</b>: 선을 꽂지 않아 편리, 접점이 없어 방수가 쉬움, 접점이 닳지 않음, 피부를 뚫지 않고 충전(임플란트).</li><li><b>한계</b>: 선 충전보다 손실이 큼, 간격·어긋남에 민감, 열 발생, 금속 이물질 위험.</li><li>스마트폰 패드 ' + f1(P_TX) + ' W(효율 약 ' + Math.round(PH_EFF * 100) + ' %), 전기차 패드 3.3 ~ 11 kW(효율 약 ' + Math.round(EV_EFF * 100) + ' %): 큰 전력일수록 효율이 중요해요.</li><li>충전하면 휴대폰이 따뜻해지는 것은 일부 에너지가 열이 되기 때문, 코일이 어긋나면 수신 코일을 지나는 자기장이 줄어 충전이 느려져요.</li></ul>',
      missions: [
        {
          title: '장점과 한계 분류하기', manual: true,
          goal: '여덟 문장을 무선 충전의 <b>장점</b>과 <b>한계</b>로 분류한 뒤 ✔ 확인하기를 누르세요.',
          hint: '편리함·방수·접점·몸속 충전은 장점, 손실·간격·이물질·어긋남은 한계예요. 오른쪽 칸을 누를 때마다 분류가 바뀌어요.',
          setup() { need = ''; updateCtl(); setScene('tech'); },
          check() {
            const miss = STMT.filter((s, i) => !S.c.cls[i]);
            if (miss.length) return '아직 분류하지 않은 문장이 ' + miss.length + '개 있어요.';
            let bad = 0;
            STMT.forEach((s, i) => { const ok = S.c.cls[i] === s[1]; if (!ok) { bad++; if (!S.c.bad[i]) { S.c.bad[i] = true; S.c.shake[i] = S.t; } } else delete S.c.bad[i]; });
            return bad ? '빨간 테두리 문장을 다시 분류해 보세요. 장점은 좋은 점, 한계는 아쉬운 점이에요.' : true;
          },
          status: () => '분류한 문장 ' + STMT.filter((s, i) => S.c.cls[i]).length + ' / ' + STMT.length,
          explain: '<b>장점</b>은 편리함, 방수, 접점이 닳지 않음, 몸속 기기 충전이고, <b>한계</b>는 에너지 손실, 간격에 민감함, 이물질로 인한 열, 어긋나면 느려지는 것이에요.',
        },
        {
          type: 'quiz', title: '전기차에 알맞은 방식은?',
          goal: '전기차(배터리 ' + EV_KWH + ' kWh)를 하룻밤에 충전하려고 해요. 에너지 효율의 관점에서 가장 알맞은 것은?',
          setup() { need = ''; updateCtl(); setScene('tech'); },
          choices: ['스마트폰용 ' + f1(P_TX) + ' W 무선 패드를 여러 개 쓴다', '전기차용 3.3 ~ 11 kW 급 패드(효율 약 ' + Math.round(EV_EFF * 100) + ' %)를 쓴다', '코일 간격이 20 mm인 패드(효율 ' + Math.round(etaGap(20)) + ' %)를 쓴다', '효율은 상관없으니 어떤 것이든 좋다'],
          answer: 1,
          feedback: ['' + f1(P_TX) + ' W로는 ' + EV_KWH + ' kWh를 채우는 데 너무 오래 걸려요. 필요한 전력이 달라요.', '', '효율이 ' + Math.round(etaGap(20)) + ' %이면 대부분의 에너지가 열로 사라져요.', '효율이 낮으면 같은 에너지를 채우는 데 더 많은 전기를 써야 해서 손실과 비용이 커져요.'],
          explain: '배터리 ' + EV_KWH + ' kWh를 채울 때 효율 ' + Math.round(EV_EFF * 100) + ' %이면 약 ' + f1(EV_KWH / EV_EFF) + ' kWh를 쓰고, 효율 ' + Math.round(PH_EFF * 100) + ' %이면 약 ' + f1(EV_KWH / PH_EFF) + ' kWh를 써야 해요. 큰 전력을 다루는 전기차에서는 <b>효율</b>이 특히 중요해서 kW 급 · 효율 약 ' + Math.round(EV_EFF * 100) + ' %의 전용 패드를 써요.',
        },
        {
          type: 'quiz', title: '코일이 어긋나면 충전이 느린 까닭',
          goal: '충전 패드와 휴대폰의 코일 중심이 <b>어긋나면</b> 충전이 느린 까닭은?',
          setup() { need = ''; updateCtl(); setScene('tech'); },
          choices: ['수신 코일을 지나는 자기장이 줄어 유도되는 에너지가 줄어서', '송신 코일의 전류가 거꾸로 흘러서', '휴대폰의 배터리가 작아져서', '교류가 직류로 바뀌어서'],
          answer: 0,
          feedback: ['', '전류의 방향 문제가 아니에요. 자기장이 수신 코일을 지나는 정도가 달라져요.', '배터리 크기는 변하지 않아요.', '전원은 그대로 교류예요.'],
          explain: '코일이 어긋나면 송신 코일이 만든 자기장 중 <b>수신 코일을 지나는 부분이 줄어</b> 유도되는 에너지가 작아져요. 이 모형에서 간격 0 mm일 때 중심이 10 mm 어긋나면 효율이 ' + Math.round(etaGap(0)) + ' %에서 <b>' + Math.round(etaGap(0) * offFac(10)) + ' %</b>로 줄어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-wireless-charging', mount: '#game', badge: '무선 충전 엔지니어', homeHref: '../../index.html#hp',
    featureLabels: { obs: '🔌 송신·수신 코일 · LED · 전압 파형', build: '🛠️ 감은 수·간격·어긋남·주파수 조절', eff: '📉 효율 그래프 · 동전 이물질', tech: '🌍 기술 카드 · 장점과 한계 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('obs');
  updateCtl();
  let lastFree = false, lastLvl = -1, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.free !== lastFree || game.level !== lastLvl)) { lastFree = game.free; lastLvl = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    stepObs(dt); stepBuild(dt); stepEff(dt);
    view.apply();
    if (S.mode !== 'tech') S.hits = [];
    if (S.mode === 'obs') drawObs(dt); else if (S.mode === 'build') drawBuild(dt); else if (S.mode === 'eff') drawEff(dt); else drawTech(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, evalCh, coinEv, etaGap, offFac, curD, record, recordPoint, updateCtl, REF, STMT, TARGET_P, vPeak1, T_HOT, PADTOP, PXMM, CX, rxYof,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepObs(0.02); stepBuild(0.02); stepEff(0.02); } },
  };
})();
