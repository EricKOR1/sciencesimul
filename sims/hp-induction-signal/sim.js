/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 유도와 신호 전달 (단원 8차시)
   성취기준 [12물리02-06] 전자기 유도 현상이 센서, 무선통신, 무선충전 등 에너지 전달 기술에 적용되어 현대 문명에 미친 영향을 인식할 수 있다.
   (센서 · 무선통신 · 신호 전달 부분)
   ① 관찰: 움직임 → 신호 (다이내믹 마이크 · 바퀴 속도 센서 · 기타 픽업)
   ② 실험: 금속 탐지기와 교통카드 (에너지 전달 + 신호)
   ③ 모형: 무선통신 (변조 · 동조, 송수신 순서)
   ④ 조사: 현대 문명의 변화 (에너지 전달 vs 신호 전달)
   맥스웰 방정식, 안테나 이득 계산, 공진 주파수 식, 변조 방식의 수학은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 680 : 560;
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
  const sg = (v) => (v >= 0 ? '+' : '−');

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const SLOW_S = 250;                                           // 소리 진동은 화면에서 실제의 1/250 속도로 보여 줘요
  const SEEN_FR = 0.15;                                         // 파형을 확인했다고 보는 크기 (눈금의 15 %)
  const MIC_A = 0.5, K_MIC = 0.02, MIC_AX = 10;                // 마이크: 100 %일 때 진동판 진폭(mm), 전압 계수(mV/(mm·Hz)), 파형 눈금(mV)
  const TEETH = 8, K_W = 1.5, W_AX = 5;                         // 바퀴 센서: 톱니 수, 전압 계수(V per 회/초), 눈금(V)
  const G_A0 = 2.0, K_G = 0.2, G_AX = 400, TAU_G = 1.5;         // 기타: 100 %일 때 줄 진폭(mm), 전압 계수(mV/(mm·Hz)), 눈금(mV), 줄 진동이 줄어드는 시간(s)
  const DET_TH = 10;                                            // 금속 탐지기가 울리는 신호 변화(%)
  const D0 = 5.0, V_CARD0 = 3.2, V_ON = 1.5, F_NFC = 13.56;     // 카드: 결합 거리(cm), 거리 0에서 칩 전압(V), 칩 동작 전압(V), 판독기 진동수(MHz)
  const W_TUNE = 30, CLEAR_TH = 0.8;                            // 동조 폭(kHz), 선명하게 들리는 기준(80 %)
  const STN = [
    { f: 700, name: '뉴스 라디오', icon: '📰', col: '#2f6df6' },
    { f: 1000, name: '음악 방송', icon: '🎵', col: '#e2464b' },
    { f: 1400, name: '스포츠 중계', icon: '⚽', col: '#14a058' },
  ];
  const FM_MIN = 530, FM_MAX = 1600;
  const gStn = (f, i) => { const x = (f - STN[i].f) / W_TUNE; return 1 / (1 + x * x); };
  const cardV = (d, ang) => r2(V_CARD0 / Math.pow(1 + (d / D0) * (d / D0), 1.5) * Math.abs(Math.cos(ang * Math.PI / 180)));
  const OBJS = [
    { id: 'coin', name: '동전', metal: true, d: 35 },
    { id: 'plastic', name: '플라스틱 자', metal: false, d: 0 },
    { id: 'iron', name: '철판', metal: true, d: 60 },
    { id: 'wood', name: '나무 막대', metal: false, d: 0 },
    { id: 'alu', name: '알루미늄 판', metal: true, d: 45 },
    { id: 'glass', name: '유리 조각', metal: false, d: 0 },
    { id: 'cu', name: '구리 고리', metal: true, d: 25 },
    { id: 'paper', name: '종이', metal: false, d: 0 },
  ];

  /* ---------- 배치 ---------- */
  const DV = PHONE ? { x: 12, y: 12, w: 456, h: 232 } : { x: 14, y: 14, w: 430, h: 330 };
  const SCP = PHONE ? { x: 12, y: 254, w: 456, h: 190 } : { x: 456, y: 14, w: 330, h: 330 };
  const INF = PHONE ? { x: 12, y: 454, w: 456, h: 214 } : { x: 14, y: 356, w: 772, h: 190 };
  const DT = PHONE ? { x: 12, y: 12, w: 456, h: 238 } : { x: 14, y: 14, w: 500, h: 330 };       // 금속 탐지기·카드 장면
  const MT = PHONE ? { x: 12, y: 260, w: 456, h: 128 } : { x: 526, y: 14, w: 260, h: 330 };       // 계기판
  const TR = PHONE ? { x: 12, y: 396, w: 456, h: 276 } : { x: 14, y: 356, w: 772, h: 190 };       // 물체 상자 / 설명

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sensor', fade: 0, t: 0,
    sn: { kind: 'mic', lvl: 0.5, pit: 400, rev: 1, str: 440, pluck: 0.5, ph: 0, th: 0, a: 0, plT: 99, sig: 0, hist: [], hAcc: 0, seen: {}, hold: {}, vpk: 0, fsig: 0 },
    dt: { obj: null, sig: 0, dwell: 0, tested: {}, ph: 0, objs: {}, drag: null },
    cd: { d: 2.0, ang: 0, v: 0, on: false, seen: {}, hold: {}, ph: 0 },
    rd: { f: 800, ph: 0, seen: {}, hold: 0, G: [0, 0, 0], max: 0, idx: 0, drag: false },
    od: { seq: [], bad: {}, shake: {} },
    cl: { cls: {}, bad: {}, shake: {} },
    lf: { pair: {}, sel: -1, bad: {}, shake: {} },
    hits: [], press: null,
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ---------- 화면(뷰) ---------- */
  const VIEWS = [
    { id: 'sensor', label: '🎙️ 움직임 → 신호', grp: 0 },
    { id: 'detector', label: '🔍 금속 탐지기', grp: 1 },
    { id: 'card', label: '💳 교통카드', grp: 1 },
    { id: 'radio', label: '📻 라디오 동조', grp: 2 },
    { id: 'order', label: '🔢 송수신 순서', grp: 2 },
    { id: 'classify', label: '🗂️ 에너지 vs 신호', grp: 3 },
    { id: 'life', label: '🔗 바뀐 생활', grp: 3 },
  ];
  const viewSeg = $('#viewSeg');
  VIEWS.forEach((v) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v.id; b.textContent = v.label;
    b.addEventListener('click', () => { Sound.click(); setScene(v.id); });
    viewSeg.appendChild(b);
  });
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.press = null; S.dt.drag = null; S.rd.drag = false; }
    S.mode = mode;
    $('#tbLabel').textContent = VIEWS.find((v) => v.id === mode).label;
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub') === S.sn.kind;
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
    on('#snSeg', (v) => v === S.sn.kind); on('#strSeg', (v) => +v === S.sn.str); on('#oriSeg', (v) => +v === S.cd.ang);
    const rng = (id, out, v, min, max, fmt) => { const e = $(id); if (+e.value !== v) e.value = v; e.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%'); $(out).textContent = fmt(v); };
    rng('#sLvl', '#oLvl', Math.round(S.sn.lvl * 100), 0, 100, (v) => v + ' %');
    rng('#sPit', '#oPit', S.sn.pit, 200, 1000, (v) => v + ' Hz');
    rng('#sRev', '#oRev', S.sn.rev, 0, 3, (v) => f1(v) + ' 회/초');
    rng('#sPluck', '#oPluck', Math.round(S.sn.pluck * 100), 10, 100, (v) => v + ' %');
    rng('#sDist', '#oDist', S.cd.d, 0, 10, (v) => f1(v) + ' cm');
    rng('#sFreq', '#oFreq', S.rd.f, FM_MIN, FM_MAX, (v) => v + ' kHz');
  }

  /* ---------- 공통: 오실로스코프 ---------- */
  function scope(x, y, w, h, title, key, amax, unit, col, th) {
    const hist = S.sn.hist, yb = y + h / 2;
    T(x, y - 6, title, 12.5, '#26324a', 'left', 800);
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + w, yb); ctx.stroke();
    T(x + 3, y + 12, '+' + amax + ' ' + unit, 10.5, '#5a6679', 'left', 700); T(x + 3, y + h - 3, '−' + amax + ' ' + unit, 10.5, '#5a6679', 'left', 700);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.beginPath(); let first = true;
    hist.forEach((p) => { const px = x + w - (S.t - p.t) / 2 * w, py = yb - clamp(p.v / amax, -1, 1) * (h / 2 - 2); if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); });
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    T(x + w - 3, y + h + 14, '지금 →', 10.5, '#7b8aa3', 'right', 700);
  }
  const KIND_INFO = {
    mic: { name: '다이내믹 마이크', ax: MIC_AX, unit: 'mV', col: '#e2552a' },
    wheel: { name: '바퀴 속도 센서', ax: W_AX, unit: 'V', col: '#2f6df6' },
    guitar: { name: '기타 픽업', ax: G_AX, unit: 'mV', col: '#14a058' },
  };

  /* ================= ① 움직임 → 신호 ================= */
  const micA = (s) => MIC_A * s.lvl;                           // 진동판 진폭 (mm)
  const micV = (s) => K_MIC * micA(s) * s.pit;                 // 전압의 최댓값 (mV)
  const wheelV = (s) => K_W * s.rev;                           // 전압의 최댓값 (V)
  const gtrA = (s) => G_A0 * s.pluck;                          // 처음 줄 진폭 (mm)
  const gtrV = (s) => K_G * gtrA(s) * s.str;                   // 처음 전압의 최댓값 (mV)
  function stepSensor(dt) {
    const s = S.sn;
    s.plT += dt;
    let v = 0;
    if (s.kind === 'mic') {
      s.ph += TAU * (s.pit / SLOW_S) * dt; if (s.ph > 1e4) s.ph -= 1e4 - (1e4 % TAU);
      s.x = micA(s) * Math.sin(s.ph); v = micV(s) * Math.cos(s.ph); s.vpk = micV(s);
    } else if (s.kind === 'wheel') {
      // 펄스가 매우 좁아서(수 ms) 2 ms 간격으로 잘게 계산해야 파형이 실제 값과 같아요
      const pitch = TAU / TEETH, sigma = pitch * 0.12, n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
      for (let i = 1; i <= n; i++) {
        s.th += TAU * s.rev * h; if (s.th > 1e4) s.th -= 1e4 - (1e4 % TAU);
        const u = ((s.th % pitch) + pitch) % pitch, x = (u > pitch / 2 ? u - pitch : u) / sigma;   // x = 0: 톱니의 한가운데가 센서 아래
        v = wheelV(s) * x * Math.exp(0.5 - x * x / 2);
        s.hist.push({ t: S.t - dt + i * h, v });
      }
      s.vpk = wheelV(s);
    } else {
      s.ph += TAU * (s.str / SLOW_S) * dt; if (s.ph > 1e4) s.ph -= 1e4 - (1e4 % TAU);
      const dec = Math.exp(-s.plT / TAU_G); s.a = gtrA(s) * dec;
      s.x = s.a * Math.sin(s.ph); v = K_G * s.a * s.str * Math.cos(s.ph); s.vpk = K_G * s.a * s.str;
    }
    s.sig = v;
    if (s.kind !== 'wheel') { s.hAcc += dt; while (s.hAcc >= 0.02) { s.hAcc -= 0.02; s.hist.push({ t: S.t, v }); } }
    while (s.hist.length && S.t - s.hist[0].t > 2.05) s.hist.shift();
    // 미션 기록
    const ax = KIND_INFO[s.kind].ax, big = s.kind !== 'guitar' && Math.abs(s.vpk) >= SEEN_FR * ax;
    if (big) s.hold[s.kind] = (s.hold[s.kind] || 0) + dt; else s.hold[s.kind] = 0;
    if (s.hold[s.kind] > 1.0) s.seen[s.kind] = true;
    if (s.kind === 'mic' && s.lvl >= 0.8) s.hold.big = (s.hold.big || 0) + dt; else s.hold.big = 0;
    if (s.kind === 'mic' && s.pit >= 800 && s.lvl > 0) s.hold.high = (s.hold.high || 0) + dt; else s.hold.high = 0;
    if (s.hold.big > 1.0) s.seen.big = true;
    if (s.hold.high > 1.0) s.seen.high = true;
  }
  function pluck() { const s = S.sn; s.plT = 0; if (gtrV(s) >= SEEN_FR * G_AX) s.seen.guitar = true; Sound.click(); parts.burst(DV.x + DV.w / 2, DV.y + DV.h / 2, { count: 5, speed: 60, size: 2, colors: ['#ffd447', '#fff'], gravity: 60, life: 0.4 }); }
  function drawCoilIcon(x, y, w, h, n) {
    D.roundRect(x, y, w, h, 3); ctx.fillStyle = '#d9b27a'; ctx.fill();
    ctx.strokeStyle = '#a65d22'; ctx.lineWidth = 2; for (let k = 0; k < n; k++) { const xx = x + (k + 0.5) * w / n; ctx.beginPath(); ctx.moveTo(xx, y + 1); ctx.lineTo(xx, y + h - 1); ctx.stroke(); }
  }
  function drawSensorDevice() {
    const s = S.sn, g = DV, cx = g.x + g.w / 2, cy = g.y + g.h / 2 + 8;
    panel(g.x, g.y, g.w, g.h, 14);
    T(g.x + 14, g.y + 26, KIND_INFO[s.kind].name, PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(g.x + 2, g.y + 34, g.w - 4, g.h - 38, 12); ctx.clip();
    if (s.kind === 'mic') {
      const px = 30 * (PHONE ? 0.8 : 1), mx = cx + 10, X = s.x * 30;           // 진동판 위치 확대(1 mm = 30 px)
      // 자석
      const bw = PHONE ? 110 : 140;
      D.roundRect(mx, cy - 70, bw, 34, 5); ctx.fillStyle = '#6a8ef0'; ctx.fill(); D.roundRect(mx, cy + 36, bw, 34, 5); ctx.fill();
      D.roundRect(mx, cy - 24, bw, 48, 5); ctx.fillStyle = '#e2464b'; ctx.fill();
      T(mx + bw / 2, cy + 6, 'N', 18, '#fff', 'center', 800); T(mx + bw / 2, cy - 48, 'S', 14, '#fff', 'center', 800); T(mx + bw / 2, cy + 58, 'S', 14, '#fff', 'center', 800);
      // 진동판 + 코일
      const dxp = mx - 52 + X;
      ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(dxp, cy - 88); ctx.lineTo(dxp, cy + 88); ctx.stroke();
      ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dxp, cy - 30); ctx.lineTo(mx + 30 + X, cy - 30); ctx.moveTo(dxp, cy + 30); ctx.lineTo(mx + 30 + X, cy + 30); ctx.stroke();
      drawCoilIcon(mx + 10 + X, cy - 52, 38, 12, 6); drawCoilIcon(mx + 10 + X, cy + 40, 38, 12, 6);
      T(dxp - 6, cy - 96, '진동판', 12, '#5a6679', 'right', 800);
      // 음파
      for (let k = 0; k < 4; k++) { const ph = (S.t * (s.pit / SLOW_S) * 0.5 + k / 4) % 1, r = 10 + ph * 70; ctx.strokeStyle = C.rgba('#3867f4', 0.45 * (1 - ph) * s.lvl); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(g.x + 36, cy, r, -0.9, 0.9); ctx.stroke(); }
      T(g.x + 30, g.y + g.h - 22, '소리', 13, '#2f6df6', 'left', 800);
      T(g.x + g.w - 14, g.y + g.h - 12, '진동판 진폭 ' + f2(micA(s)) + ' mm (1 mm = 30 px로 확대)', PHONE ? 10.5 : 11.5, '#5a6679', 'right', 700);
    } else if (s.kind === 'wheel') {
      const R = PHONE ? 56 : 84, wx = cx - 20, wy = cy + (PHONE ? 6 : 20);
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(s.th);
      D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.fillStyle = '#8a95a8'; ctx.fill(); }, { blur: 6, y: 2 });
      for (let i = 0; i < TEETH; i++) { ctx.save(); ctx.rotate(i * TAU / TEETH); D.roundRect(-R * 0.13, -R, R * 0.26, R * 0.3, 3); ctx.fillStyle = '#6b7488'; ctx.fill(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, TAU); ctx.fillStyle = '#394258'; ctx.fill(); ctx.restore();
      // 센서 (자석 + 코일)
      const sx = wx - 30, sy = wy - R - 40;
      D.shadow(() => { D.roundRect(sx, sy, 60, 34, 5); ctx.fillStyle = '#cfd6e2'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#2f6df6'; ctx.fillRect(sx + 2, sy + 2, 27, 30); ctx.fillStyle = '#e2464b'; ctx.fillRect(sx + 31, sy + 2, 27, 30); T(sx + 15, sy + 22, 'S', 13, '#fff', 'center', 800); T(sx + 45, sy + 22, 'N', 13, '#fff', 'center', 800);
      drawCoilIcon(sx + 6, sy + 34, 48, 12, 8);
      T(sx + 70, sy + 24, '자석 + 코일', 12, '#5a6679', 'left', 800);
      T(wx, wy + R + 22, '톱니 ' + TEETH + '개 · ' + f1(s.rev) + ' 회/초 → 1초에 톱니 ' + Math.round(TEETH * s.rev) + '번 지나감', PHONE ? 11 : 12, '#26324a', 'center', 800);
    } else {
      const yS = cy - 20, x0 = g.x + 30, x1 = g.x + g.w - 30, ampPx = 10;     // 줄 진폭 확대(1 mm = 10 px)
      // 픽업
      const px = cx - 34, py = yS + 36;
      D.shadow(() => { D.roundRect(px, py, 68, 42, 6); ctx.fillStyle = '#2a2f3a'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.fillStyle = '#cfd6e2'; ctx.fillRect(px + 28, py - 6, 12, 10); T(px + 34, py - 8, 'N', 10, '#e2464b', 'center', 800);
      drawCoilIcon(px + 6, py + 12, 56, 16, 9);
      T(px + 78, py + 24, '자석 + 코일', 12, '#5a6679', 'left', 800);
      // 줄
      ctx.beginPath(); for (let x = x0; x <= x1; x += 4) { const u = (x - x0) / (x1 - x0), y = yS + s.x * ampPx * Math.sin(Math.PI * u) * 1; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = '#b8a070'; ctx.lineWidth = 3; ctx.stroke();
      [x0, x1].forEach((x) => D.roundRect(x - 4, yS - 16, 8, 32, 3)); ctx.fillStyle = '#6b7488'; [x0, x1].forEach((x) => { D.roundRect(x - 4, yS - 16, 8, 32, 3); ctx.fill(); });
      S.hits = [{ x: x0, y: yS - 40, w: x1 - x0, h: 80, fn: pluck }];
      T(cx, yS - 40, '자화된 금속 줄 (눌러서 튕기기)', 12, '#5a6679', 'center', 800);
      T(g.x + g.w - 14, g.y + g.h - 12, '줄 진폭 ' + f2(s.a) + ' mm (1 mm = ' + ampPx + ' px로 확대)', PHONE ? 10.5 : 11.5, '#5a6679', 'right', 700);
    }
    ctx.restore();
  }
  function drawSensor(dt) {
    const s = S.sn, k = KIND_INFO[s.kind];
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    drawSensorDevice();
    panel(SCP.x, SCP.y, SCP.w, SCP.h, 14);
    T(SCP.x + 14, SCP.y + 24, '유도 전압의 파형 (최근 2초)', 13.5, '#26324a', 'left', 800);
    scope(SCP.x + 14, SCP.y + 62, SCP.w - 28, SCP.h - 108, '코일에 유도된 전압 (' + k.unit + ')', 'v', k.ax, k.unit, k.col);
    T(SCP.x + 14, SCP.y + SCP.h - 10, s.kind === 'wheel' ? '실제 시간으로 보여 줘요' : '화면은 실제보다 ' + SLOW_S + '배 느려요', 11.5, '#5a6679', 'left', 700);
    // 설명
    panel(INF.x, INF.y, INF.w, INF.h, 14);
    T(INF.x + 14, INF.y + 26, '움직임이 신호가 되는 까닭', 14, '#26324a', 'left', 800);
    const unit = k.unit, vp = s.vpk;
    const lines = s.kind === 'mic' ? ['진동판의 진폭 ' + f2(micA(s)) + ' mm · 진동수 ' + s.pit + ' Hz', '전압의 최댓값 ' + f2(vp) + ' mV  (= ' + f2(K_MIC) + ' × ' + f2(micA(s)) + ' × ' + s.pit + ')', '소리가 크고(진폭 ↑) 높을수록(진동수 ↑) 코일이 빨리 움직여서 신호가 커져요.']
      : s.kind === 'wheel' ? ['회전 속도 ' + f1(s.rev) + ' 회/초 → 1초에 톱니 ' + Math.round(TEETH * s.rev) + '번 지나감', '톱니 하나가 지나갈 때마다 펄스 1개 · 전압의 최댓값 ' + f2(vp) + ' V  (= ' + f1(K_W) + ' × ' + f1(s.rev) + ')', '빠르게 돌수록 펄스가 더 자주, 더 크게 나와요. (ABS는 이 신호로 바퀴 속도를 알아요)']
      : ['줄 진동수 ' + s.str + ' Hz · 지금 줄 진폭 ' + f2(s.a) + ' mm', '전압의 최댓값 ' + f1(vp) + ' mV  (= ' + f2(K_G) + ' × ' + f2(s.a) + ' × ' + s.str + ')', '자화된 줄이 진동하면 코일을 지나는 자기장이 변해서 전압이 유도돼요. 줄의 진동이 잦아들면 신호도 작아져요.'];
    lines.forEach((l, i) => textBlock(INF.x + 14, INF.y + 54 + i * (PHONE ? 46 : 36), INF.w - 28, l, PHONE ? 12.5 : 14.5, i === 1 ? '#c2410c' : '#26324a', PHONE ? 17 : 20, 800));
    textBlock(INF.x + 14, INF.y + INF.h - (PHONE ? 28 : 14), INF.w - 28, '코일 근처의 자석(또는 자화된 물체)이 움직이면 자기장이 변해 전압이 유도돼요 → 움직임이 전기 신호가 돼요.', PHONE ? 10.5 : 12, '#5a6679', 14, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② 금속 탐지기 · 카드 ================= */
  OBJS.forEach((o, i) => { S.dt.objs[o.id] = { x: 0, y: 0, sc: 1, mode: 'home', i }; });
  const TRAY_COLS = PHONE ? 2 : 4;
  const cellW = (TR.w - 24 - (TRAY_COLS - 1) * 8) / TRAY_COLS, cellH = PHONE ? 50 : 66;
  const homeOf = (id) => { const i = OBJS.findIndex((o) => o.id === id), c = i % TRAY_COLS, r = Math.floor(i / TRAY_COLS); return { x: TR.x + 12 + c * (cellW + 8) + 30, y: TR.y + 40 + r * (cellH + 6) + cellH / 2 - 4 }; };
  const HEAD = { x: DT.x + DT.w / 2 - (PHONE ? 20 : 30), y: DT.y + (PHONE ? 70 : 90) };
  const SLOT = { x: HEAD.x, y: DT.y + DT.h - (PHONE ? 52 : 62) };
  const ZONE = { x: SLOT.x - 80, y: SLOT.y - 44, w: 160, h: 80 };
  OBJS.forEach((o) => { const h = homeOf(o.id), p = S.dt.objs[o.id]; p.x = h.x; p.y = h.y; });
  function putObj(id) {
    const d = S.dt;
    if (d.obj === id) return;
    if (d.obj) d.objs[d.obj].mode = 'home';
    d.obj = id; d.objs[id].mode = 'slot'; d.dwell = 0; Sound.click();
  }
  function releaseObj() { const d = S.dt; if (d.obj) { d.objs[d.obj].mode = 'home'; d.obj = null; d.dwell = 0; } }
  function stepDetector(dt) {
    const d = S.dt;
    d.ph += TAU * 1.2 * dt;
    const o = d.obj ? OBJS.find((x) => x.id === d.obj) : null;
    const target = o ? o.d : 0;
    d.sig = Math.abs(d.sig - target) < 0.2 ? target : SciSim.approach(d.sig, target, dt, 8);
    OBJS.forEach((ob) => {
      const p = d.objs[ob.id];
      let tx, ty, ts = 1, rate = 14;
      if (d.drag && d.drag.id === ob.id) { tx = d.drag.x; ty = d.drag.y; ts = 1.2; rate = 30; }
      else if (p.mode === 'slot') { tx = SLOT.x; ty = SLOT.y; rate = 14; }
      else { const h = homeOf(ob.id); tx = h.x; ty = h.y; }
      p.x = SciSim.approach(p.x, tx, dt, rate); p.y = SciSim.approach(p.y, ty, dt, rate); p.sc = SciSim.approach(p.sc, ts, dt, 16);
    });
    if (o && S.mode === 'detector' && !d.drag) {
      const p = d.objs[o.id];
      if (Math.hypot(p.x - SLOT.x, p.y - SLOT.y) < 5 && Math.abs(d.sig - target) < 0.5) d.dwell += dt; else d.dwell = 0;
      if (d.dwell >= 0.8 && !d.tested[o.id]) { d.tested[o.id] = true; Sound.success(); }
    } else d.dwell = 0;
  }
  function drawObjIcon(id, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(r / 20, r / 20); ctx.globalAlpha = a == null ? 1 : a; ctx.lineJoin = 'round';
    const metal = (x0, y0, x1, y1, c) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#f2f5fa'); g.addColorStop(0.5, c || '#b9c2d0'); g.addColorStop(1, '#7f8a9c'); return g; };
    if (id === 'coin') { D.sphere(0, 0, 16, '#d49a5a', { gloss: true }); ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = 1.4; ctx.stroke(); }
    else if (id === 'iron') { D.roundRect(-18, -12, 36, 24, 3); ctx.fillStyle = metal(-18, -12, 18, 12, '#9aa3b2'); ctx.fill(); ctx.strokeStyle = '#586274'; ctx.lineWidth = 1.4; ctx.stroke(); [[-12, -6], [12, -6], [-12, 6], [12, 6]].forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, TAU); ctx.fillStyle = '#586274'; ctx.fill(); }); }
    else if (id === 'alu') { D.roundRect(-18, -12, 36, 24, 3); ctx.fillStyle = metal(-18, -12, 18, 12, '#d6dce6'); ctx.fill(); ctx.strokeStyle = '#8791a3'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(4, 8); ctx.stroke(); }
    else if (id === 'cu') { ctx.strokeStyle = '#a65d22'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#e39a45'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 12, 0.3, 2.6); ctx.stroke(); }
    else if (id === 'plastic') { D.roundRect(-20, -6, 40, 12, 3); ctx.fillStyle = 'rgba(120,200,240,.7)'; ctx.fill(); ctx.strokeStyle = '#3a8fc0'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.strokeStyle = '#2a6f98'; ctx.lineWidth = 1; for (let k = -16; k <= 16; k += 4) { ctx.beginPath(); ctx.moveTo(k, -6); ctx.lineTo(k, k % 8 === 0 ? 0 : -2); ctx.stroke(); } }
    else if (id === 'wood') { D.roundRect(-20, -7, 40, 14, 3); ctx.fillStyle = '#c4935f'; ctx.fill(); ctx.strokeStyle = '#8a5f35'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.strokeStyle = '#9a6c3d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(14, -2); ctx.moveTo(-14, 3); ctx.lineTo(16, 3); ctx.stroke(); }
    else if (id === 'glass') { ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-6, -12); ctx.lineTo(12, -8); ctx.lineTo(16, 6); ctx.lineTo(0, 12); ctx.closePath(); ctx.fillStyle = 'rgba(160,210,240,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,140,190,.9)'; ctx.lineWidth = 1.6; ctx.stroke(); }
    else if (id === 'paper') { D.roundRect(-16, -12, 32, 24, 2); ctx.fillStyle = '#fbfaf3'; ctx.fill(); ctx.strokeStyle = '#b9b49a'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.strokeStyle = '#c9c4aa'; ctx.lineWidth = 1; for (let k = -6; k <= 6; k += 6) { ctx.beginPath(); ctx.moveTo(-10, k); ctx.lineTo(10, k); ctx.stroke(); } }
    ctx.restore();
  }
  function drawDetector(dt) {
    const d = S.dt;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    panel(DT.x, DT.y, DT.w, DT.h, 14);
    T(DT.x + 14, DT.y + 26, '금속 탐지기 헤드 (송신 코일 + 수신 코일)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(DT.x + 2, DT.y + 34, DT.w - 4, DT.h - 38, 12); ctx.clip();
    // 바닥
    const gy = DT.y + DT.h - (PHONE ? 30 : 36);
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(DT.x + 2, gy, DT.w - 4, 40); ctx.fillStyle = '#b89870'; ctx.fillRect(DT.x + 2, gy, DT.w - 4, 3);
    // 헤드와 자기장
    const o = d.obj ? OBJS.find((x) => x.id === d.obj) : null, amp = 0.5 + 0.5 * Math.sin(d.ph);
    const hw = PHONE ? 130 : 160, hh = 34;
    ctx.save(); ctx.lineWidth = 1.8; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -S.t * 22;
    for (let k = -2; k <= 2; k++) { ctx.strokeStyle = C.rgba('#7c5cff', 0.25 + 0.5 * amp * (1 - Math.abs(k) * 0.2)); ctx.beginPath(); ctx.moveTo(HEAD.x + k * hw / 5, HEAD.y + hh); ctx.quadraticCurveTo(HEAD.x + k * hw / 5 * 1.5, (HEAD.y + hh + SLOT.y) / 2 + 6, HEAD.x + k * hw / 5 * 1.1, SLOT.y - 14); ctx.stroke(); }
    ctx.restore();
    D.shadow(() => { D.roundRect(HEAD.x - hw / 2, HEAD.y, hw, hh, 12); ctx.fillStyle = '#4a5568'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#d98b3a'; ctx.lineWidth = 3.4; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(HEAD.x - 24, HEAD.y + hh / 2, 6 + k * 4, 5 + k * 2.4, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = '#e6a04f'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(HEAD.x + 34, HEAD.y + hh / 2, 5 + k * 4, 4 + k * 2.4, 0, 0, TAU); ctx.stroke(); }
    T(HEAD.x - 24, HEAD.y - 8, '송신 코일', 11.5, '#5a6679', 'center', 800); T(HEAD.x + 34, HEAD.y - 8, '수신 코일', 11.5, '#5a6679', 'center', 800);
    ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(HEAD.x, HEAD.y); ctx.lineTo(HEAD.x, DT.y + 40); ctx.stroke();
    // 놓는 자리
    if (!o || d.drag) { ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; D.roundRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h, 12); ctx.stroke(); ctx.restore(); T(SLOT.x, ZONE.y + ZONE.h + 14, d.drag ? '여기에 놓기' : '물체를 여기에', 12, '#5a6679', 'center', 800); if (d.drag) D.ring(SLOT.x, SLOT.y, 26, S.t, { color: '#14a058' }); }
    // 와전류
    if (o && o.metal && Math.hypot(d.objs[o.id].x - SLOT.x, d.objs[o.id].y - SLOT.y) < 8) {
      const a = clamp(o.d / 60, 0.3, 1);
      ctx.save(); ctx.strokeStyle = C.rgba('#e2552a', 0.85 * a); ctx.lineWidth = 2.4;
      [[-10, 0, 10], [10, 0, 10]].forEach((c) => { ctx.beginPath(); ctx.arc(SLOT.x + c[0], SLOT.y - 2, c[2] * 0.8, S.t * 4 * (c[0] < 0 ? 1 : -1), S.t * 4 * (c[0] < 0 ? 1 : -1) + 4.6); ctx.stroke(); });
      ctx.restore(); T(SLOT.x, SLOT.y - 30, '금속 속에 전류(와전류)가 유도돼요', PHONE ? 11 : 12, '#b42318', 'center', 800);
    }
    ctx.restore();
    // 계기판
    panel(MT.x, MT.y, MT.w, MT.h, 14);
    T(MT.x + 14, MT.y + 24, '수신 신호의 변화', 13.5, '#26324a', 'left', 800);
    const bx = MT.x + 16, bw = MT.w - 32, by = MT.y + (PHONE ? 40 : 50), bh = 22;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx, by, bw, bh);
    const w = bw * clamp(d.sig / 100, 0, 1); if (w > 0.1) { ctx.fillStyle = d.sig >= DET_TH ? '#e2464b' : '#f2873a'; ctx.fillRect(bx, by, w, bh); }
    const tx = bx + bw * DET_TH / 100; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tx, by - 5); ctx.lineTo(tx, by + bh + 5); ctx.stroke();
    T(bx, by + bh + 17, '0', 11.5, '#5a6679', 'left', 700); T(bx + bw, by + bh + 17, '100 %', 11.5, '#5a6679', 'right', 700); T(bx + bw, by - 8, '울리는 기준 ' + DET_TH + ' %', 11.5, '#26324a', 'right', 800);
    T(MT.x + 14, by + bh + (PHONE ? 38 : 50), '신호 변화 ' + Math.round(d.sig) + ' %', PHONE ? 15 : 20, d.sig >= DET_TH ? '#b42318' : '#26324a', 'left', 800);
    const det = d.sig >= DET_TH;
    D.sphere(MT.x + MT.w - 34, by + bh + (PHONE ? 30 : 42), 13, det ? '#ff4d4d' : '#9aa3b2', { gloss: true }); if (det) D.glow(MT.x + MT.w - 34, by + bh + (PHONE ? 30 : 42), 34, '#ff4d4d', 0.6);
    if (!PHONE) { textBlock(MT.x + 14, by + bh + 90, MT.w - 28, o ? (o.metal ? '금속이 있어요! 송신 코일의 교류 자기장이 금속에 전류를 유도하고, 그 전류가 만든 자기장이 수신 코일의 신호를 바꿔요.' : '신호가 변하지 않아요. 전류가 흐르지 않는 물체는 자기장을 바꾸지 못해요.') : '물체를 헤드 아래에 놓아 보세요.', 13, '#3a465c', 19, 800); }
    // 물체 상자
    panel(TR.x, TR.y, TR.w, TR.h, 14);
    T(TR.x + 14, TR.y + 26, '물체 상자 (' + OBJS.filter((x) => d.tested[x.id]).length + ' / ' + OBJS.length + ' 확인)', 13.5, '#26324a', 'left', 800);
    OBJS.forEach((ob, i) => {
      const c = i % TRAY_COLS, r = Math.floor(i / TRAY_COLS), x = TR.x + 12 + c * (cellW + 8), y = TR.y + 40 + r * (cellH + 6);
      D.roundRect(x, y, cellW, cellH, 12); ctx.fillStyle = '#f5f7fb'; ctx.fill(); ctx.strokeStyle = d.tested[ob.id] ? (ob.metal ? '#e2464b' : '#98a2b3') : '#e1e6ef'; ctx.lineWidth = 2; ctx.stroke();
      T(x + 62, y + cellH / 2 - 2, ob.name, PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      if (d.tested[ob.id]) T(x + 62, y + cellH / 2 + 18, ob.metal ? '신호 변함 (+' + ob.d + ' %)' : '변화 없음', 12, ob.metal ? '#b42318' : '#5a6679', 'left', 800);
      const s = d.objs[ob.id]; if (s.mode !== 'home' || (d.drag && d.drag.id === ob.id)) { ctx.strokeStyle = '#cfd6e2'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(homeOf(ob.id).x, homeOf(ob.id).y, 20, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    });
    OBJS.slice().sort((a, b) => (d.drag && d.drag.id === a.id ? 1 : 0) - (d.drag && d.drag.id === b.id ? 1 : 0)).forEach((ob) => { const p = d.objs[ob.id]; if (d.drag && d.drag.id === ob.id) D.shadow(() => { ctx.beginPath(); ctx.arc(p.x, p.y + 8, 14, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); }, { blur: 10 }); drawObjIcon(ob.id, p.x, p.y, 21 * p.sc, 1); });
    parts.update(dt); parts.draw(ctx);
  }
  const inZone = (p) => p.x >= ZONE.x && p.x <= ZONE.x + ZONE.w && p.y >= ZONE.y && p.y <= ZONE.y + ZONE.h;
  const pickObj = (p) => { for (let i = OBJS.length - 1; i >= 0; i--) { const s = S.dt.objs[OBJS[i].id]; if (Math.hypot(p.x - s.x, p.y - s.y) <= 26) return OBJS[i]; } return null; };

  // 교통카드
  function stepCard(dt) {
    const c = S.cd;
    c.ph += TAU * 1.5 * dt;
    c.v = cardV(c.d, c.ang); c.on = c.v >= V_ON;
    const sn = c.seen, hd = c.hold;
    if (c.ang === 0 && c.on && c.d >= 3) hd.ok = (hd.ok || 0) + dt; else hd.ok = 0;                 // 평평하게 3 cm 이상 떨어져서도 인식
    if (c.ang === 0 && !c.on && c.d >= 4.5) hd.far = (hd.far || 0) + dt; else hd.far = 0;
    if (c.ang === 90 && !c.on && c.d <= 1) hd.tilt = (hd.tilt || 0) + dt; else hd.tilt = 0;
    if (hd.ok > 0.8) sn.ok = true; if (hd.far > 0.8) sn.far = true; if (hd.tilt > 0.8) sn.tilt = true;
  }
  function drawCard(dt) {
    const c = S.cd;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    panel(DT.x, DT.y, DT.w, DT.h, 14);
    T(DT.x + 14, DT.y + 26, '교통카드 단말기(판독기)와 카드 · 옆에서 본 모습', PHONE ? 12 : 14, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(DT.x + 2, DT.y + 34, DT.w - 4, DT.h - 38, 12); ctx.clip();
    const PXCM = PHONE ? 11 : 17, HL = PHONE ? 38 : 52, rdy = DT.y + DT.h - (PHONE ? 52 : 62), rdx = DT.x + DT.w / 2 - (PHONE ? 30 : 40), rw = PHONE ? 150 : 190;
    D.shadow(() => { D.roundRect(rdx - rw / 2, rdy, rw, 44, 10); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 8, y: 3 });
    T(rdx, rdy + 36, '판독기 코일 ' + F_NFC + ' MHz', 11.5, '#cfd6e2', 'center', 800);
    ctx.strokeStyle = '#e6a04f'; ctx.lineWidth = 3.2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(rdx, rdy + 14, 18 + k * 9, 4 + k * 1.2, 0, 0, TAU); ctx.stroke(); }
    // 카드 위치
    const ang = c.ang * Math.PI / 180, lowY = rdy - c.d * PXCM, cy = lowY - HL * Math.sin(ang) - 5 * Math.cos(ang);   // d = 카드의 가장 가까운 곳과 판독기 사이의 거리
    // 자기장
    const amp = 0.4 + 0.6 * Math.abs(Math.sin(c.ph));
    ctx.save(); ctx.lineWidth = 1.8; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -S.t * 22;
    for (let k = -2; k <= 2; k++) { const str = clamp(c.v / V_CARD0, 0, 1); ctx.strokeStyle = C.rgba('#7c5cff', 0.12 + 0.5 * amp); ctx.beginPath(); ctx.moveTo(rdx + k * 16, rdy + 4); ctx.quadraticCurveTo(rdx + k * 34, (rdy + cy) / 2, rdx + k * 12, cy + 4); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.translate(rdx, cy); ctx.rotate(-ang);
    D.shadow(() => { D.roundRect(-HL, -5, HL * 2, 10, 4); ctx.fillStyle = c.on ? '#2f9bd6' : '#5b7aa0'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(-HL * 0.58 + k * 3, 0, (14 - k * 2.4) * HL / 52, 3.4, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = c.on ? '#fff3a8' : '#8d97a8'; D.roundRect(HL * 0.5, -4.5, 14, 9, 2); ctx.fill();
    ctx.restore();
    if (c.on) D.glow(rdx + Math.cos(-ang) * HL * 0.63, cy + Math.sin(-ang) * HL * 0.63, 30, '#ffd447', 0.7);
    T(rdx + HL + 18, cy + 4, '교통카드', 12.5, '#26324a', 'left', 800);
    // 거리 눈금 (1 cm마다)
    for (let k = 0; k <= 10; k++) { const yy = rdy - k * PXCM; ctx.strokeStyle = 'rgba(38,50,74,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(DT.x + 10, yy); ctx.lineTo(DT.x + (k % 2 ? 18 : 26), yy); ctx.stroke(); if (k % 2 === 0) T(DT.x + 30, yy + 4, k + ' cm', 10.5, '#7b8aa3', 'left', 700); }
    // 거리 치수
    const x = DT.x + DT.w - 36; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, rdy); ctx.lineTo(x, lowY); ctx.moveTo(x - 5, rdy); ctx.lineTo(x + 5, rdy); ctx.moveTo(x - 5, lowY); ctx.lineTo(x + 5, lowY); ctx.stroke();
    T(x - 8, (rdy + lowY) / 2 + 4, f1(c.d) + ' cm', 12.5, '#26324a', 'right', 800);
    ctx.restore();
    // 계기판
    panel(MT.x, MT.y, MT.w, MT.h, 14);
    T(MT.x + 14, MT.y + 24, '카드 칩에 유도된 전압', 13.5, '#26324a', 'left', 800);
    const bx = MT.x + 16, bw = MT.w - 32, by = MT.y + (PHONE ? 40 : 50), bh = 22;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx, by, bw, bh); const w = bw * clamp(c.v / V_CARD0, 0, 1); if (w > 0.1) { ctx.fillStyle = c.on ? '#14a058' : '#f2873a'; ctx.fillRect(bx, by, w, bh); }
    const tx = bx + bw * V_ON / V_CARD0; ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tx, by - 5); ctx.lineTo(tx, by + bh + 5); ctx.stroke();
    T(bx, by + bh + 17, '0', 11.5, '#5a6679', 'left', 700); T(bx + bw, by + bh + 17, f1(V_CARD0) + ' V', 11.5, '#5a6679', 'right', 700); T(tx, by + bh + 17, f1(V_ON) + ' V', 11.5, '#26324a', 'center', 800);
    T(MT.x + 14, by + bh + (PHONE ? 38 : 50), f2(c.v) + ' V', PHONE ? 15 : 20, c.on ? '#0f7a43' : '#b8420f', 'left', 800);
    T(MT.x + MT.w - 14, by + bh + (PHONE ? 38 : 50), c.on ? '인식됨' : '인식 안 됨', PHONE ? 13 : 15, c.on ? '#0f7a43' : '#b42318', 'right', 800);
    if (!PHONE) { textBlock(MT.x + 14, by + bh + 80, MT.w - 28, c.on ? '칩이 ' + f1(V_ON) + ' V 이상의 전력을 받아 작동하고, 카드 ID 신호를 주고받아요.' : '유도된 전압이 ' + f1(V_ON) + ' V보다 작아서 칩이 작동하지 못해요.', 13, '#3a465c', 19, 800); }
    // 설명
    panel(TR.x, TR.y, TR.w, TR.h, 14);
    T(TR.x + 14, TR.y + 26, '에너지 전달 + 신호 전달', 14, '#26324a', 'left', 800);
    const items = [['⚡ 에너지', '판독기의 교류 자기장 → 카드 코일에 전류가 유도되어 칩에 전력을 줘요 (카드에는 배터리가 없어요)', '#b8420f'], ['📡 신호', c.on ? '칩이 깨어나 카드 ID (4F-21-A7)를 판독기에 보내요' : '칩이 작동하지 않아 ID 신호를 보내지 못해요', c.on ? '#0f7a43' : '#7b8aa3'], ['📏 거리', '통신 거리는 약 4 cm 이내예요. 거리가 멀거나 카드를 세우면 유도 전압이 작아져요', '#3a465c']];
    items.forEach((it, i) => { const y = TR.y + 44 + i * (PHONE ? 70 : 44); T(TR.x + 14, y + 14, it[0], 14, it[2], 'left', 800); textBlock(TR.x + (PHONE ? 14 : 100), y + (PHONE ? 36 : 14), TR.w - (PHONE ? 28 : 116), it[1], PHONE ? 12.5 : 14, '#26324a', 18, 800); });
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ③ 무선통신 ================= */
  const msg = [
    (t) => 0.6 * Math.sin(TAU * 0.9 * t) + 0.3 * Math.sin(TAU * 2.2 * t),
    (t) => 0.5 * Math.sin(TAU * 0.6 * t) + 0.35 * Math.sin(TAU * 1.5 * t + 1) + 0.15 * Math.sin(TAU * 3.1 * t),
    (t) => 0.55 * Math.tanh(3 * Math.sin(TAU * 1.3 * t)),
  ];
  const CAR = [6, 9, 13];                                       // 화면에 그리는 반송파 (실제보다 훨씬 느려요)
  const noiseF = (t) => 0.5 * Math.sin(t * 37.3) * Math.sin(t * 11.1 + 1) + 0.5 * Math.sin(t * 53.7 + 2);
  function stepRadio(dt) {
    const r = S.rd; r.ph += dt;
    r.G = STN.map((s, i) => gStn(r.f, i)); r.max = Math.max.apply(null, r.G); r.idx = r.G.indexOf(r.max);
    if (r.max < 0.05) { let b = 0; STN.forEach((s, i) => { if (Math.abs(STN[i].f - r.f) < Math.abs(STN[b].f - r.f)) b = i; }); r.near = b; } else r.near = r.idx;
    r.clear = Math.round(r.max * 100) >= CLEAR_TH * 100;
    if (r.clear) { r.hold += dt; if (r.hold > 1.0) r.seen[r.idx] = true; } else r.hold = 0;
  }
  const RD = PHONE ? { top: { x: 12, y: 12, w: 456, h: 172 }, mod: { x: 12, y: 194, w: 456, h: 206 }, rcv: { x: 12, y: 410, w: 456, h: 262 } } : { top: { x: 14, y: 14, w: 772, h: 198 }, mod: { x: 14, y: 224, w: 380, h: 322 }, rcv: { x: 406, y: 224, w: 380, h: 322 } };
  function miniPlot(x, y, w, h, title, fn, col, amax) {
    T(x, y - 5, title, 12, '#26324a', 'left', 800);
    ctx.fillStyle = '#f7f9fd'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.beginPath();
    for (let px = 0; px <= w; px += 2) { const tt = S.t - (w - px) / w * 1.6, v = fn(tt); const py = y + h / 2 - clamp(v / amax, -1, 1) * (h / 2 - 2); px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py); }
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
  function drawDial(cx, cy, r) {
    const rd = S.rd;
    D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, r + 8, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#fbfaf3'; ctx.fill();
    const ang = (f) => Math.PI + (f - FM_MIN) / (FM_MAX - FM_MIN) * Math.PI;
    for (let f = 600; f <= 1600; f += 100) { const a = ang(f), major = f % 200 === 0; ctx.strokeStyle = '#2b3140'; ctx.lineWidth = major ? 2 : 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9); ctx.lineTo(cx + Math.cos(a) * r * (major ? 0.74 : 0.8), cy + Math.sin(a) * r * (major ? 0.74 : 0.8)); ctx.stroke(); if (major) T(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6 + 4, String(f), PHONE ? 9.5 : 10.5, '#2b3140', 'center', 800); }
    STN.forEach((s) => { const a = ang(s.f); D.sphere(cx + Math.cos(a) * r * 0.96 * 0.0 + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93, 3.4, s.col, { gloss: false }); });
    const a = ang(clamp(rd.f, FM_MIN, FM_MAX));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 8, '#394258', { gloss: false });
    T(cx, cy + 22, rd.f + ' kHz', PHONE ? 13 : 15, '#26324a', 'center', 800);
  }
  function drawRadio(dt) {
    const r = S.rd;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    // 장면: 송신 안테나 3개 → 전자기파 → 수신 안테나와 라디오
    const tp = RD.top; panel(tp.x, tp.y, tp.w, tp.h, 14);
    T(tp.x + 14, tp.y + 24, '방송국 → 전자기파 → 라디오', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const sx = tp.x + (PHONE ? 38 : 60), rx = tp.x + tp.w - (PHONE ? 120 : 170), gy = tp.y + tp.h - 22;
    STN.forEach((s, i) => {
      const yy = tp.y + 46 + i * (PHONE ? 38 : 46), ax = sx;
      ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, yy + 12); ctx.lineTo(ax, yy - 10); ctx.moveTo(ax - 7, yy - 10); ctx.lineTo(ax, yy - 2); ctx.lineTo(ax + 7, yy - 10); ctx.stroke();
      T(ax + 16, yy + 4, s.icon + ' ' + s.name + ' ' + s.f + ' kHz', PHONE ? 11 : 12.5, s.col, 'left', 800);
      // 전자기파
      const g = r.G[i];
      for (let k = 0; k < 3; k++) { const ph = (S.t * 0.5 + k / 3 + i * 0.2) % 1; const x = ax + (PHONE ? 100 : 156) + ph * (rx - ax - (PHONE ? 110 : 170)); ctx.strokeStyle = C.rgba(s.col, 0.55 * (1 - ph)); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, yy, 7 + ph * 5, -1.1, 1.1); ctx.stroke(); }
    });
    // 수신 안테나(코일)와 라디오
    ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx - 10, tp.y + 40); ctx.lineTo(rx - 10, tp.y + 90); ctx.stroke();
    ctx.strokeStyle = '#d98b3a'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(rx - 10, tp.y + 50 + k * 9, 9, 3.4, 0, 0, TAU); ctx.stroke(); }
    T(rx - 24, tp.y + 62, '수신 안테나', 11.5, '#5a6679', 'right', 800);
    drawDial(rx + (PHONE ? 52 : 70), gy - 6, PHONE ? 52 : 66);
    // 수신 패널
    const mp = RD.mod, rp = RD.rcv, near = r.near;
    panel(mp.x, mp.y, mp.w, mp.h, 14);
    T(mp.x + 14, mp.y + 24, '변조: ' + STN[near].icon + ' ' + STN[near].name + ' (' + STN[near].f + ' kHz)', PHONE ? 12.5 : 14, STN[near].col, 'left', 800);
    const pw = mp.w - 28, ph = PHONE ? 34 : 70, m0 = mp.y + (PHONE ? 44 : 52);
    miniPlot(mp.x + 14, m0, pw, ph, '① 소리 신호', (t) => msg[near](t), '#e2552a', 1);
    miniPlot(mp.x + 14, m0 + ph + (PHONE ? 19 : 26), pw, ph, '② 반송파 (진동수 ' + STN[near].f + ' kHz)', (t) => Math.sin(TAU * CAR[near] * t), '#2f6df6', 1);
    miniPlot(mp.x + 14, m0 + 2 * (ph + (PHONE ? 19 : 26)), pw, ph, '③ 방송 신호 = 반송파의 크기를 소리 신호로 바꾼 것(변조)', (t) => (0.5 + 0.5 * msg[near](t)) * Math.sin(TAU * CAR[near] * t) * 1.0, '#7c3aed', 1);
    T(mp.x + mp.w - 14, mp.y + mp.h - 8, '반송파는 실제보다 훨씬 느리게 그렸어요', 10.5, '#7b8aa3', 'right', 700);
    panel(rp.x, rp.y, rp.w, rp.h, 14);
    T(rp.x + 14, rp.y + 24, '수신기 안', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const rpw = rp.w - 28, rph = PHONE ? 40 : 54, r0 = rp.y + (PHONE ? 46 : 52), rowH = PHONE ? 22 : 26;
    miniPlot(rp.x + 14, r0, rpw, rph, '안테나에 유도된 전류 (세 방송이 섞여 있어요)', (t) => (0.5 + 0.5 * msg[0](t)) * Math.sin(TAU * CAR[0] * t) * 0.34 + (0.5 + 0.5 * msg[1](t)) * Math.sin(TAU * CAR[1] * t) * 0.34 + (0.5 + 0.5 * msg[2](t)) * Math.sin(TAU * CAR[2] * t) * 0.34, '#8a95a8', 1);
    const G = r.G, mx = r.max;
    miniPlot(rp.x + 14, r0 + rph + (PHONE ? 22 : 26), rpw, rph, '동조 후 소리 신호 (선명도 ' + Math.round(mx * 100) + ' %)', (t) => { let v = 0; for (let i = 0; i < 3; i++) v += G[i] * msg[i](t); return v + 0.5 * (1 - mx) * noiseF(t) * 1.6; }, r.clear ? '#14a058' : '#e2464b', 1);
    const by = r0 + 2 * rph + (PHONE ? 46 : 58);
    T(rp.x + 14, by, '방송국별 수신 세기', 12.5, '#26324a', 'left', 800);
    STN.forEach((s, i) => { const y = by + 10 + i * rowH, bw = rpw - 130; T(rp.x + 14, y + 12, s.icon + ' ' + s.f + ' kHz', 12, s.col, 'left', 800); ctx.fillStyle = '#eef1f7'; ctx.fillRect(rp.x + 110, y + 2, bw, 14); const w = bw * G[i]; if (w > 0.1) { ctx.fillStyle = s.col; ctx.fillRect(rp.x + 110, y + 2, w, 14); } T(rp.x + 110 + bw + 8, y + 14, Math.round(G[i] * 100) + ' %', 12, '#26324a', 'left', 800); });
    const tx = rp.x + 110 + (rpw - 130) * CLEAR_TH; ctx.strokeStyle = '#26324a'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx, by + 6); ctx.lineTo(tx, by + 10 + 3 * rowH - 4); ctx.stroke(); ctx.setLineDash([]);
    T(tx, by + 10 + 3 * rowH + 8, '선명 ' + Math.round(CLEAR_TH * 100) + ' %', 10.5, '#26324a', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }
  // 다이얼 끌기
  const DIAL = () => { const tp = RD.top, rx = tp.x + tp.w - (PHONE ? 120 : 170), gy = tp.y + tp.h - 22; return { cx: rx + (PHONE ? 52 : 70), cy: gy - 6, r: PHONE ? 52 : 66 }; };
  function dialSet(p) {
    const d = DIAL(); let ang = Math.atan2(-(p.y - d.cy), p.x - d.cx); if (ang < -Math.PI / 2) ang = Math.PI; else if (ang < 0) ang = 0;
    S.rd.f = clamp(Math.round((FM_MIN + (Math.PI - ang) / Math.PI * (FM_MAX - FM_MIN)) / 10) * 10, FM_MIN, FM_MAX); updateCtl();
  }

  // 송수신 순서
  const ORDER = [
    ['🎙️', '마이크가 소리를 전기 신호로 바꿔요'],
    ['〰️', '신호를 반송파에 실어(변조) 송신 안테나에 교류 전류로 흘려요'],
    ['📡', '송신 안테나에서 변하는 전기장·자기장이 전자기파로 퍼져 나가요'],
    ['🌀', '수신 안테나(코일)에 같은 진동수의 유도 전류가 생겨요'],
    ['📻', '동조 회로가 원하는 방송을 고르고 신호를 증폭·복원해요'],
    ['🔊', '스피커가 전기 신호를 소리로 바꿔요'],
  ];
  const ORD_SHOW = [3, 0, 5, 2, 4, 1];                           // 화면에 보이는 카드 순서 (섞어 놓음)
  function drawOrder(dt) {
    const o = S.od;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    T(14, 28, '일어나는 순서대로 카드를 눌러 번호를 붙여요 (' + o.seq.length + ' / ' + ORDER.length + ')', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const cw = PHONE ? 456 : 380, ch = PHONE ? 90 : 128, cols = PHONE ? 1 : 2;
    ORD_SHOW.forEach((idx, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = 12 + col * (cw + 12), y = 44 + row * (ch + 10);
      const pos = o.seq.indexOf(idx), bad = o.bad[idx];
      const sh = o.shake[idx] ? Math.sin((S.t - o.shake[idx]) * 50) * 4 * Math.max(0, 1 - (S.t - o.shake[idx]) / 0.4) : 0;
      panel(x + sh, y, cw, ch, 14);
      D.roundRect(x + sh, y, cw, ch, 14); ctx.lineWidth = pos >= 0 ? 3 : 1.6; ctx.strokeStyle = bad ? '#e2464b' : pos >= 0 ? '#f26b3a' : '#e1e6ef'; ctx.stroke();
      T(x + 16 + sh, y + (PHONE ? 52 : 70), ORDER[idx][0], PHONE ? 30 : 38, '#26324a', 'left', 800);
      textBlock(x + (PHONE ? 62 : 74) + sh, y + (PHONE ? 38 : 52), cw - (PHONE ? 130 : 160), ORDER[idx][1], PHONE ? 13 : 15, '#26324a', PHONE ? 18 : 22, 800);
      D.sphere(x + cw - 40 + sh, y + ch / 2, 20, pos >= 0 ? '#f26b3a' : '#d5dbe6', { gloss: pos >= 0, text: pos >= 0 ? String(pos + 1) : '?', textColor: pos >= 0 ? '#fff' : '#7b8aa3' });
      S.hits.push({ x, y, w: cw, h: ch, fn: () => { const j = o.seq.indexOf(idx); if (j >= 0) o.seq.splice(j, 1); else o.seq.push(idx); o.bad = {}; Sound.click(); } });
    });
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ④ 현대 문명 ================= */
  const TECH = [
    { icon: '⚡', name: '전력 송전·발전기', ans: 'en', desc: '변압기와 발전기 속 전자기 유도로 큰 전력을 만들고 보내요', life: '발전소의 전기를 먼 도시와 가정까지 보내 쓸 수 있게 해요 (전력)' },
    { icon: '📱', name: '무선 충전', ans: 'en', desc: '코일 사이로 전기 에너지를 전달해 배터리를 충전해요', life: '충전선 없이 충전해서 방수 기기와 몸속 기기가 가능해졌어요 (생활·의료)' },
    { icon: '💳', name: '교통카드·NFC', ans: 'both', desc: '판독기 코일이 카드에 전력을 주고 카드 ID 신호도 주고받아요', life: '표를 사지 않고 카드 한 장으로 대중교통을 이용해요 (교통)' },
    { icon: '📻', name: '라디오·TV 방송', ans: 'sig', desc: '전자기파에 소리·영상 신호를 실어 멀리 보내요', life: '먼 곳의 소식과 방송을 동시에 들을 수 있게 되었어요 (통신)' },
    { icon: '📶', name: '스마트폰 통신', ans: 'sig', desc: '전자기파로 음성·데이터 신호를 주고받아요', life: '언제 어디서나 통화하고 정보를 찾을 수 있어요 (통신)' },
    { icon: '🛂', name: '금속 탐지·보안 검색', ans: 'sig', desc: '금속에 유도된 전류가 만드는 신호 변화로 금속을 찾아내요', life: '공항과 건물의 보안 검색으로 안전을 지켜요 (안전)' },
  ];
  const CLS_LAB = { en: '에너지 전달', sig: '신호 전달', both: '둘 다' }, CLS_COL = { en: '#f2873a', sig: '#2f6df6', both: '#7c3aed' };
  function drawClassify(dt) {
    const c = S.cl;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    T(14, 28, '기술이 전달하는 것은 에너지일까, 신호일까?', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const cols = PHONE ? 1 : 2, cw = PHONE ? 456 : 380, ch = PHONE ? 96 : 140;
    TECH.forEach((t, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = 12 + col * (cw + 12), y = 44 + row * (ch + 10);
      panel(x, y, cw, ch, 14);
      T(x + 14, y + 40, t.icon, PHONE ? 28 : 34, '#26324a', 'left', 800);
      T(x + (PHONE ? 54 : 62), y + 28, t.name, PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
      textBlock(x + (PHONE ? 54 : 62), y + (PHONE ? 48 : 52), cw - (PHONE ? 70 : 78), t.desc, PHONE ? 11.5 : 13, '#5a6679', PHONE ? 15 : 18, 700);
      const k = c.cls[i], bad = c.bad[i], sh = c.shake[i] ? Math.sin((S.t - c.shake[i]) * 50) * 4 * Math.max(0, 1 - (S.t - c.shake[i]) / 0.4) : 0;
      const pw = 124, ph = 34, px = x + cw - pw - 12 + sh, py = y + ch - ph - 10;
      D.roundRect(px, py, pw, ph, 17); ctx.fillStyle = k ? C.rgba(CLS_COL[k], 0.14) : '#fff'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = bad ? '#e2464b' : k ? CLS_COL[k] : '#b9c1d0'; if (!k) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(px + pw / 2, py + 22, k ? CLS_LAB[k] : '눌러서 분류', 13, k ? CLS_COL[k] : '#7b8aa3', 'center', 800);
      S.hits.push({ x: px - 6, y: py - 6, w: pw + 12, h: ph + 12, fn: () => { const o = ['', 'en', 'sig', 'both']; c.cls[i] = o[(o.indexOf(c.cls[i] || '') + 1) % 4] || ''; delete c.bad[i]; Sound.click(); } });
    });
    parts.update(dt); parts.draw(ctx);
  }
  const LIFE_ORDER = [4, 2, 5, 0, 3, 1];                         // 오른쪽 카드의 순서(섞음)
  const LF = PHONE ? { lx: 10, lw: 214, rx: 256, rw: 214, y0: 46, h: 82, gap: 96 } : { lx: 14, lw: 340, rx: 446, rw: 340, y0: 46, h: 76, gap: 84 };
  const lifeColor = ['#7c5cff', '#14a058', '#f2873a', '#2f9bd6', '#e2464b', '#c2410c'];
  function drawLife(dt) {
    const f = S.lf, g = LF;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    S.hits = [];
    T(g.lx, 28, '기술', 14, '#26324a', 'left', 800); T(g.rx + g.rw, 28, '바꾼 생활', 14, '#26324a', 'right', 800);
    const used = {}; Object.keys(f.pair).forEach((k) => (used[f.pair[k]] = +k));
    Object.keys(f.pair).forEach((k) => {
      const i = +k, j = LIFE_ORDER.indexOf(f.pair[k]), y1 = g.y0 + i * g.gap + g.h / 2, y2 = g.y0 + j * g.gap + g.h / 2;
      ctx.strokeStyle = f.bad[i] ? '#e2464b' : lifeColor[i]; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const xa = g.lx + g.lw, xb = g.rx; ctx.beginPath(); ctx.moveTo(xa, y1); ctx.bezierCurveTo(xa + (xb - xa) * 0.5, y1, xa + (xb - xa) * 0.5, y2, xb, y2); ctx.stroke();
    });
    TECH.forEach((t, i) => {
      const y = g.y0 + i * g.gap, sel = f.sel === i, paired = f.pair[i] != null, bad = f.bad[i];
      const sh = f.shake[i] ? Math.sin((S.t - f.shake[i]) * 50) * 4 * Math.max(0, 1 - (S.t - f.shake[i]) / 0.4) : 0;
      panel(g.lx + sh, y, g.lw, g.h, 12);
      D.roundRect(g.lx + sh, y, g.lw, g.h, 12); ctx.lineWidth = sel ? 4 : 2.4; ctx.strokeStyle = bad ? '#e2464b' : sel ? '#f26b3a' : paired ? lifeColor[i] : '#dfe5ef'; ctx.stroke();
      T(g.lx + 12 + sh, y + 38, t.icon, PHONE ? 24 : 30, '#26324a', 'left', 800);
      textBlock(g.lx + (PHONE ? 46 : 56) + sh, y + (PHONE ? 26 : 32), g.lw - (PHONE ? 54 : 66), t.name, PHONE ? 12.5 : 14.5, '#26324a', 17, 800);
      if (!PHONE) textBlock(g.lx + 56 + sh, y + 50, g.lw - 66, t.desc, 11.5, '#5a6679', 14, 700);
      D.sphere(g.lx + g.lw, y + g.h / 2, 6, paired ? lifeColor[i] : '#c9d1de', { gloss: false });
      if (sel) D.ring(g.lx + g.lw, y + g.h / 2, 7, S.t, { color: '#f26b3a', width: 3 });
      S.hits.push({ x: g.lx, y, w: g.lw, h: g.h, fn: () => { if (f.pair[i] != null) { delete f.pair[i]; delete f.bad[i]; f.sel = -1; } else f.sel = f.sel === i ? -1 : i; Sound.click(); } });
    });
    LIFE_ORDER.forEach((ti, j) => {
      const y = g.y0 + j * g.gap, owner = used[ti], taken = owner != null;
      panel(g.rx, y, g.rw, g.h, 12);
      D.roundRect(g.rx, y, g.rw, g.h, 12); ctx.lineWidth = 2.4; ctx.strokeStyle = taken ? (f.bad[owner] ? '#e2464b' : lifeColor[owner]) : (f.sel >= 0 ? '#f2873a' : '#dfe5ef'); if (!taken && f.sel >= 0) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      textBlock(g.rx + 14, y + (PHONE ? 22 : 26), g.rw - 28, TECH[ti].life, PHONE ? 11.5 : 13, '#26324a', PHONE ? 15 : 18, 800);
      D.sphere(g.rx, y + g.h / 2, 6, taken ? lifeColor[owner] : '#c9d1de', { gloss: false });
      S.hits.push({ x: g.rx, y, w: g.rw, h: g.h, fn: () => {
        if (taken) { delete f.pair[owner]; delete f.bad[owner]; Sound.click(); return; }
        if (f.sel < 0) { showHint('먼저 왼쪽에서 기술을 눌러요.', 2600); return; }
        f.pair[f.sel] = ti; delete f.bad[f.sel]; f.sel = -1; Sound.click();
      } });
    });
    T(VW / 2, VH - 12, '이은 짝 ' + Object.keys(f.pair).length + ' / ' + TECH.length, 14, '#c2410c', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 포인터 ---------- */
  function hitAt(p) { for (let i = S.hits.length - 1; i >= 0; i--) { const h = S.hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'detector') {
        const o = pickObj(p);
        if (o) { S.dt.drag = { id: o.id, x: p.x, y: p.y, was: S.dt.objs[o.id].mode === 'slot', moved: false, sx: p.x, sy: p.y }; if (S.dt.objs[o.id].mode === 'slot') { S.dt.obj = null; S.dt.objs[o.id].mode = 'home'; S.dt.dwell = 0; } return true; }
        return false;
      }
      if (S.mode === 'radio') {
        const d = DIAL(); if (Math.hypot(p.x - d.cx, p.y - d.cy) <= d.r + 12 && p.y <= d.cy + 14) { S.rd.drag = true; dialSet(p); return true; }
        return false;
      }
      const h = hitAt(p); if (h) { S.press = { hit: h, x: p.x, y: p.y }; return true; }
      return false;
    },
    move(p) { if (S.dt.drag) { S.dt.drag.x = p.x; S.dt.drag.y = p.y; if (Math.hypot(p.x - S.dt.drag.sx, p.y - S.dt.drag.sy) > 8) S.dt.drag.moved = true; } else if (S.rd.drag) dialSet(p); },
    up(p) {
      if (S.dt.drag) {
        const dr = S.dt.drag; S.dt.drag = null;
        if (!dr.moved) { if (!dr.was) putObj(dr.id); }
        else if (inZone(p)) putObj(dr.id);
        else S.dt.objs[dr.id].mode = 'home';
        return;
      }
      if (S.rd.drag) { S.rd.drag = false; return; }
      if (S.press && Math.hypot(p.x - S.press.x, p.y - S.press.y) < 14) S.press.hit.fn(); S.press = null;
    },
    hover(p) { if (S.mode === 'detector') return pickObj(p) ? 'grab' : 'default'; return hitAt(p) ? 'pointer' : 'default'; },
  });

  /* ---------- 컨트롤 연결 ---------- */
  $$('#snSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sn.kind = b.dataset.v; S.sn.hist.length = 0; S.sn.plT = 99; updateCtl(); }));
  $('#sLvl').addEventListener('input', (e) => { S.sn.lvl = +e.target.value / 100; Sound.tick(); updateCtl(); });
  $('#sPit').addEventListener('input', (e) => { S.sn.pit = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sRev').addEventListener('input', (e) => { S.sn.rev = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#strSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sn.str = +b.dataset.v; updateCtl(); }));
  $('#sPluck').addEventListener('input', (e) => { S.sn.pluck = +e.target.value / 100; Sound.tick(); updateCtl(); });
  $('#bPluck').addEventListener('click', pluck);
  $('#bClearObj').addEventListener('click', () => { Sound.click(); releaseObj(); });
  $('#sDist').addEventListener('input', (e) => { S.cd.d = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#oriSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cd.ang = +b.dataset.v; updateCtl(); }));
  $('#sFreq').addEventListener('input', (e) => { S.rd.f = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bClearOrd').addEventListener('click', () => { Sound.click(); S.od.seq = []; S.od.bad = {}; });
  $('#bClearCls').addEventListener('click', () => { Sound.click(); S.cl.cls = {}; S.cl.bad = {}; });
  $('#bClearLife').addEventListener('click', () => { Sound.click(); S.lf.pair = {}; S.lf.bad = {}; S.lf.sel = -1; });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'sensor') {
      const s = S.sn, k = KIND_INFO[s.kind];
      L1 = '센서'; a = k.name; L2 = '전압의 최댓값'; b = (s.kind === 'wheel' ? f2(s.vpk) : s.kind === 'guitar' ? f1(s.vpk) : f2(s.vpk)) + ' ' + k.unit;
      L3 = '움직임'; c = s.kind === 'mic' ? '진폭 ' + f2(micA(s)) + ' mm · ' + s.pit + ' Hz' : s.kind === 'wheel' ? f1(s.rev) + ' 회/초' : s.str + ' Hz · 진폭 ' + f2(s.a) + ' mm';
    } else if (S.mode === 'detector') {
      const d = S.dt, o = d.obj ? OBJS.find((x) => x.id === d.obj) : null;
      L1 = '탐지기 아래'; a = o ? o.name : '없음'; L2 = '신호 변화'; b = Math.round(d.sig) + ' %'; L3 = '확인한 물체'; c = OBJS.filter((x) => d.tested[x.id]).length + ' / ' + OBJS.length;
    } else if (S.mode === 'card') {
      const k = S.cd;
      L1 = '칩 전압'; a = f2(k.v) + ' V'; L2 = '카드 인식'; b = k.on ? '인식됨' : '인식 안 됨'; L3 = '거리 · 방향'; c = f1(k.d) + ' cm · ' + (k.ang === 0 ? '평평' : k.ang === 90 ? '세움' : '비스듬')
    } else if (S.mode === 'radio') {
      const r = S.rd;
      L1 = '동조 주파수'; a = r.f + ' kHz'; L2 = '가장 센 방송'; b = STN[r.idx].name + ' ' + Math.round(r.max * 100) + ' %'; L3 = '소리'; c = r.clear ? '선명해요' : (r.max > 0.3 ? '잡음이 섞여요' : '잡음만 들려요');
    } else if (S.mode === 'order') {
      L1 = '고른 카드'; a = S.od.seq.length + ' / ' + ORDER.length; L2 = '첫 단계'; b = '소리 → 전기 신호'; L3 = '마지막 단계'; c = '전기 신호 → 소리';
    } else if (S.mode === 'classify') {
      L1 = '분류한 기술'; a = TECH.filter((t, i) => S.cl.cls[i]).length + ' / ' + TECH.length; L2 = '에너지 전달'; b = '전력을 보내요'; L3 = '신호 전달'; c = '정보를 보내요';
    } else {
      L1 = '이은 짝'; a = Object.keys(S.lf.pair).length + ' / ' + TECH.length; L2 = '고른 기술'; b = S.lf.sel >= 0 ? TECH[S.lf.sel].name : '—'; L3 = '남은 짝'; c = (TECH.length - Object.keys(S.lf.pair).length) + '개';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const nObj = () => OBJS.filter((o) => S.dt.tested[o.id]).length;
  const levels = [
    {
      title: '움직임이 전기 신호가 되는 센서', short: '움직임 → 신호', icon: '🎙️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 마이크, 교통카드, 라디오는 전혀 달라 보이는데 공통으로 쓰는 원리가 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 센서가 소리·빛·움직임을 <b>전기 신호</b>로 바꾸고, 코일 근처의 자석이 움직이면 <b>전자기 유도</b>로 전류가 생긴다고 배웠어요. 이번에는 그 원리가 센서에 어떻게 쓰이는지 살펴봐요.</div>' +
        '<p>자석과 코일의 상대 운동을 이용하는 센서 세 개 — <b>다이내믹 마이크, 바퀴 속도 센서, 기타 픽업</b> — 의 신호를 파형으로 관찰해요.</p>',
      features: ['sensor'],
      setup() { S.sn = { kind: 'mic', lvl: 0.5, pit: 400, rev: 1, str: 440, pluck: 0.5, ph: 0, th: 0, a: 0, x: 0, plT: 99, sig: 0, hist: [], hAcc: 0, seen: {}, hold: {}, vpk: 0 }; setScene('sensor'); updateCtl(); },
      recap: '코일 근처에서 자석(또는 자화된 물체)이 움직이면 자기장이 변해 전압이 유도돼요. 움직임이 크고 빠를수록 신호가 크고 자주 나타나요. 마이크와 스피커는 구조가 비슷하지만 에너지 전환 방향이 반대예요.',
      summary: '<ul><li><b>다이내믹 마이크</b>: 소리에 진동판과 코일이 흔들려 자석 속에서 움직이면 전압이 유도돼요 (소리 → 전기 신호).</li><li><b>바퀴 속도 센서</b>: 톱니가 지나갈 때마다 펄스가 생기고, 빠를수록 펄스가 더 자주, 더 크게 나와요.</li><li><b>기타 픽업</b>: 자화된 금속 줄이 진동하면 코일에 신호가 유도돼요.</li><li>신호의 크기 ∝ 움직임의 크기 × 빠르기 (마이크: ' + f2(K_MIC) + ' × 진폭 × 진동수 mV).</li><li>마이크와 스피커는 구조가 비슷하지만 <b>마이크는 소리 → 전기</b>, <b>스피커는 전기 → 소리</b>예요.</li></ul>',
      missions: [
        {
          title: '세 센서의 신호 관찰하기',
          goal: '세 센서를 모두 움직여 신호를 확인하고, 마이크에서 소리 크기를 <b>80 % 이상</b>, 소리 높낮이를 <b>800 Hz 이상</b>으로 올려 파형이 커지고 촘촘해지는 것을 확인하세요.',
          hint: '센서를 하나씩 고르고 슬라이더를 움직여 1초 이상 파형을 보세요. 기타 픽업은 줄 튕기기를 눌러야 신호가 나와요. 마이크는 소리 크기 80 %와 높낮이 800 Hz를 따로따로 만들어도 돼요.',
          setup() { S.sn.seen = {}; S.sn.hold = {}; updateCtl(); setScene('sensor'); },
          check: () => S.sn.seen.mic && S.sn.seen.wheel && S.sn.seen.guitar && S.sn.seen.big && S.sn.seen.high,
          hold: 0.3,
          status: () => mark(S.sn.seen.mic) + ' 마이크 &nbsp; ' + mark(S.sn.seen.wheel) + ' 바퀴 센서 &nbsp; ' + mark(S.sn.seen.guitar) + ' 기타 픽업<br>' + mark(S.sn.seen.big) + ' 소리 크기 80 % 이상 &nbsp; ' + mark(S.sn.seen.high) + ' 높낮이 800 Hz 이상',
          explain: '마이크는 소리가 클수록(진폭 ↑), 높을수록(진동수 ↑) 코일이 빨리 움직여서 전압이 커져요: 전압의 최댓값 = ' + f2(K_MIC) + ' × 진폭(mm) × 진동수(Hz). 바퀴 센서는 빠르게 돌수록 펄스가 <b>더 자주, 더 크게</b> 나오고(' + f1(K_W) + ' V × 회/초), 기타 줄은 튕긴 직후 신호가 크다가 점점 작아져요.',
        },
        {
          type: 'quiz', title: '마이크와 스피커',
          goal: '다이내믹 마이크와 스피커는 구조가 비슷한데(자석 + 코일 + 진동판) 하는 일이 반대예요. 옳은 설명은?',
          setup() { updateCtl(); setScene('sensor'); },
          choices: ['마이크: 전기 신호 → 소리, 스피커: 소리 → 전기 신호', '마이크: 소리 → 전기 신호(전자기 유도), 스피커: 전기 신호 → 소리(전류가 받는 힘)', '둘 다 소리 → 전기 신호', '둘 다 전기 신호 → 소리'],
          answer: 1,
          feedback: ['서로 바뀌었어요. 마이크는 소리를 받아들이는 쪽이에요.', '', '스피커는 전류를 소리로 바꾸는 장치예요.', '마이크는 소리를 전기 신호로 바꾸는 장치예요.'],
          explain: '마이크는 소리로 진동판과 코일이 움직일 때 <b>전자기 유도</b>로 전압이 생기고(소리 → 전기), 스피커는 코일에 전류를 흘려 <b>전류가 받는 힘</b>으로 진동판을 움직여요(전기 → 소리). 에너지 전환의 방향이 서로 반대예요.',
        },
      ],
    },
    {
      title: '금속 탐지기와 교통카드', short: '금속·카드', icon: '🔍', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자기장이 변하면 코일에 전압이 유도되는 것을 센서로 확인했어요. 이번에는 <b>유도 전류가 흐르는 물체</b>(금속)와 <b>유도로 전력을 받는 카드</b>를 살펴봐요.</div>' +
        '<p><b>금속 탐지기</b>는 송신 코일이 만든 교류 자기장에 금속이 들어오면 금속에 전류가 유도되고, 그 전류의 자기장이 수신 코일의 신호를 바꾸는 것을 이용해요. <b>교통카드</b>는 판독기 코일의 ' + F_NFC + ' MHz 교류 자기장으로 카드 코일에 전류가 유도되어 칩에 <b>전력</b>을 주고 <b>정보(ID)</b>도 주고받아요.</p>',
      features: ['detector', 'card'],
      setup() { S.dt.obj = null; S.dt.tested = {}; S.dt.sig = 0; OBJS.forEach((o) => { S.dt.objs[o.id].mode = 'home'; const h = homeOf(o.id); S.dt.objs[o.id].x = h.x; S.dt.objs[o.id].y = h.y; }); S.dt.drag = null; S.cd = { d: 2.0, ang: 0, v: 0, on: false, seen: {}, hold: {}, ph: 0 }; setScene('detector'); updateCtl(); },
      recap: '금속 안에 유도된 전류가 신호를 바꿔서 금속 탐지기가 철·구리·알루미늄을 모두 찾아내고, 플라스틱이나 나무는 찾지 못해요. 교통카드는 배터리 없이 유도로 전력을 받아 작동하며, 거리와 방향에 따라 인식이 달라져요.',
      summary: '<ul><li><b>금속 탐지기</b>: 교류 자기장 → 금속에 <b>와전류</b> 유도 → 그 자기장이 수신 코일의 신호를 바꿔요. 철 · 구리 · 알루미늄 모두 감지하고 플라스틱 · 나무 · 유리 · 종이는 변화가 없어요.</li><li><b>교통카드(NFC)</b>: 판독기 코일 ' + F_NFC + ' MHz 교류 자기장 → 카드 코일에 전류 유도 → 칩에 <b>전력</b> 공급 + <b>ID 신호</b> 전송. 카드에는 배터리가 없고, 통신 거리는 약 4 cm 이내예요.</li><li>이 모형에서 칩이 작동하는 최소 전압은 ' + f1(V_ON) + ' V이고, 카드를 평평하게 놓았을 때 4 cm까지 인식돼요. 카드를 세우면 코일을 지나는 자기장이 거의 없어 인식되지 않아요.</li></ul>',
      missions: [
        {
          title: '물체 8개 판별하기',
          goal: '탐지기 헤드 아래에 물체 <b>8개</b>를 하나씩 놓아 신호가 변하는지 확인하세요.',
          hint: '아래 상자의 물체를 끌어 점선 칸에 놓거나 눌러요. 신호 막대가 안정될 때까지 1초쯤 기다리면 확인돼요.',
          setup() { setScene('detector'); },
          check: () => nObj() === OBJS.length,
          hold: 0.4,
          status: () => '확인한 물체 ' + nObj() + ' / ' + OBJS.length + ' ' + mark(nObj() === OBJS.length) + '<br>' + OBJS.map((o) => (S.dt.tested[o.id] ? (o.metal ? '🔴' : '⚪') : '⬜')).join(' '),
          explain: '<b>동전 · 철판 · 알루미늄 판 · 구리 고리</b>(금속)에서는 신호가 변하고, <b>플라스틱 자 · 나무 막대 · 유리 조각 · 종이</b>에서는 변하지 않았어요. 금속에는 전류가 유도되지만 전류가 흐르지 않는 물체는 자기장을 바꾸지 못해요.',
        },
        {
          title: '교통카드 인식 거리 찾기',
          goal: '카드를 <b>평평하게</b> 두고 인식되는 것(3 cm 이상 거리에서)과 <b>4.5 cm 이상</b>에서 인식되지 않는 것, 카드를 <b>세우면</b> 1 cm 이내에서도 인식되지 않는 것을 확인하세요.',
          hint: '교통카드 화면에서 거리 슬라이더로 3.0 ~ 4.0 cm에 맞추면 인식돼요. 4.5 cm 이상으로 멀리 하거나 카드를 세워서 거리를 0 ~ 1 cm로 해 보세요.',
          setup() { S.cd.seen = {}; S.cd.hold = {}; updateCtl(); setScene('card'); },
          check: () => S.cd.seen.ok && S.cd.seen.far && S.cd.seen.tilt,
          hold: 0.3,
          status: () => mark(S.cd.seen.ok) + ' 평평하게 3 ~ 4 cm: 인식 &nbsp; ' + mark(S.cd.seen.far) + ' 4.5 cm 이상: 인식 안 됨<br>' + mark(S.cd.seen.tilt) + ' 세워서 1 cm 이내: 인식 안 됨 &nbsp; (지금 ' + f2(S.cd.v) + ' V)',
          explain: '칩이 작동하려면 유도된 전압이 <b>' + f1(V_ON) + ' V</b> 이상이어야 해요. 평평한 카드는 ' + f1(4.0) + ' cm에서 <b>' + f2(cardV(4.0, 0)) + ' V</b>(인식), ' + f1(4.5) + ' cm에서 <b>' + f2(cardV(4.5, 0)) + ' V</b>(인식 안 됨)예요. 카드를 세우면 자기장이 코일 면을 지나가지 않아 가까워도 전압이 거의 생기지 않아요.',
        },
        {
          type: 'quiz', title: '전지가 없는 카드는 어떻게 작동할까?',
          goal: '교통카드에는 전지가 없는데도 작동하는 까닭은?',
          setup() { updateCtl(); setScene('card'); },
          choices: ['카드 속에 아주 오래가는 전지가 숨어 있어서', '판독기의 교류 자기장으로 카드 코일에 전류가 유도되어 칩에 전력이 공급되어서', '주변의 빛으로 충전되어서', '카드가 판독기에 전선으로 연결되어서'],
          answer: 1,
          feedback: ['카드에는 전지가 없어요. 에너지를 어디선가 받아야 해요.', '', '빛이 아니라 판독기의 자기장에서 에너지를 받아요.', '전선은 없고, 자기장이 에너지를 전달해요.'],
          explain: '판독기의 <b>변하는 자기장</b>이 카드 코일에 <b>전류를 유도</b>해 칩에 <b>전력</b>을 주고, 칩은 그 전력으로 카드 ID <b>신호</b>를 보내요. 한 번의 유도로 <b>에너지 전달과 신호 전달</b>이 함께 일어나요.',
        },
      ],
    },
    {
      title: '전자기파로 정보를 보내는 무선통신', short: '무선통신', icon: '📻', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 판독기 코일의 변하는 자기장이 카드에 에너지와 신호를 전달하는 것을 봤어요. <b>라디오 방송</b>은 더 먼 곳까지 정보를 보내요. 송신 안테나의 교류 전류가 <b>전자기파</b>를 퍼뜨리고, 수신 안테나(코일)에 같은 진동수의 <b>유도 전류</b>가 생겨요.</div>' +
        '<p>소리 신호를 <b>반송파</b>에 실어 보내는 것을 <b>변조</b>라고 해요. 여러 방송이 섞여 들어와도 수신기의 <b>동조</b> 회로가 원하는 진동수에서 가장 크게 반응해서 하나만 골라 들을 수 있어요. 이 단계에서 AM 라디오를 맞춰 보고 송수신 순서를 정리해요.</p>',
      features: ['radio', 'order'],
      setup() { S.rd = { f: 800, ph: 0, seen: {}, hold: 0, G: [0, 0, 0], max: 0, idx: 0, drag: false, near: 0, clear: false }; S.od = { seq: [], bad: {}, shake: {} }; setScene('radio'); updateCtl(); },
      recap: '송신 안테나의 교류 전류가 전자기파를 만들고, 수신 안테나에 같은 진동수의 유도 전류가 생겨요. 소리 신호는 반송파에 실어(변조) 보내고, 동조 회로가 원하는 방송의 진동수에서 가장 크게 반응해 하나만 골라 줘요.',
      summary: '<ul><li><b>송신</b>: 소리 → 전기 신호 → 반송파에 실음(변조) → 송신 안테나의 교류 전류 → 변하는 전기장·자기장이 <b>전자기파</b>로 퍼짐.</li><li><b>수신</b>: 수신 안테나(코일)에 같은 진동수의 <b>유도 전류</b> → 동조 회로가 원하는 방송 선택 → 증폭·복원 → 스피커로 소리.</li><li>AM 라디오 530 ~ 1600 kHz, FM 88 ~ 108 MHz, 스마트폰은 수 GHz의 전자기파를 써요.</li><li>이웃 방송과 섞이지 않는 까닭: 동조 회로는 원하는 진동수 근처(이 모형에서 ±' + (W_TUNE / 2) + ' kHz 안)에서만 크게 반응해요 (선명 ' + Math.round(CLEAR_TH * 100) + ' % 이상).</li><li>수신 코일에 전류가 유도되려면 송신 쪽 신호가 <b>시간에 따라 변해야</b> 해요.</li></ul>',
      missions: [
        {
          title: '방송국에 동조하기',
          goal: '다이얼을 돌려 <b>방송국 하나</b>에 맞추세요. 선명도가 <b>' + Math.round(CLEAR_TH * 100) + ' % 이상</b>이 되어 잡음 없이 1초 이상 들려야 해요.',
          hint: '다이얼의 색 점이 방송국 위치예요(뉴스 ' + STN[0].f + ', 음악 ' + STN[1].f + ', 스포츠 ' + STN[2].f + ' kHz). 슬라이더나 다이얼을 돌려 점에 가깝게 맞춰요.',
          setup() { S.rd.seen = {}; S.rd.hold = 0; updateCtl(); setScene('radio'); },
          check: () => Object.keys(S.rd.seen).length >= 1,
          hold: 0.2,
          status: () => STN.map((s, i) => mark(S.rd.seen[i]) + ' ' + s.name).join(' &nbsp; ') + '<br>지금 ' + S.rd.f + ' kHz · 선명도 ' + Math.round(S.rd.max * 100) + ' %',
          explain: '동조 회로는 원하는 방송의 진동수에서 가장 크게 반응하고(선명도 100 %), 진동수가 ' + (W_TUNE / 2) + ' kHz만 벗어나도 ' + Math.round(100 / (1 + 0.25)) + ' %로 줄어요. 이웃 방송은 수백 kHz 떨어져 있어 거의 반응하지 않기 때문에(예: ' + (STN[1].f - STN[0].f) + ' kHz 떨어지면 ' + Math.round(gStn(STN[0].f + 300, 0) * 100) + ' %) 섞이지 않아요.',
        },
        {
          title: '송신에서 수신까지 순서 정렬하기', manual: true,
          goal: '소리가 라디오에서 다시 소리로 나오기까지의 <b>6단계</b>를 일어나는 순서대로 눌러 번호를 붙인 뒤 ✔ 확인하기를 누르세요.',
          hint: '마이크에서 시작해요: 소리 → 전기 신호 → 변조 → 전자기파 → 수신 안테나의 유도 전류 → 동조·복원 → 스피커.',
          setup() { S.od = { seq: [], bad: {}, shake: {} }; updateCtl(); setScene('order'); },
          check() {
            const sq = S.od.seq;
            if (sq.length < ORDER.length) return '아직 번호를 붙이지 않은 카드가 ' + (ORDER.length - sq.length) + '장 있어요.';
            let bad = 0;
            sq.forEach((idx, pos) => { if (idx !== pos) { bad++; if (!S.od.bad[idx]) { S.od.bad[idx] = true; S.od.shake[idx] = S.t; } } else delete S.od.bad[idx]; });
            return bad ? '빨간 테두리 카드의 순서가 달라요. 소리가 전기 신호가 되고, 전자기파로 퍼져, 다시 소리가 되는 흐름을 떠올려 보세요.' : true;
          },
          status: () => '번호를 붙인 카드 ' + S.od.seq.length + ' / ' + ORDER.length,
          explain: '<b>① 소리 → 전기 신호 ② 변조해서 송신 안테나의 교류 전류 ③ 전자기파로 퍼짐 ④ 수신 안테나의 유도 전류 ⑤ 동조 · 증폭 · 복원 ⑥ 스피커로 소리</b> 순서예요. ④에서 전자기 유도가 쓰여요.',
        },
        {
          type: 'quiz', title: '수신 코일에 전류가 유도되려면?',
          goal: '수신 안테나의 코일에 전류가 유도되려면 송신 쪽 신호(자기장)는 어때야 할까요?',
          setup() { updateCtl(); setScene('radio'); },
          choices: ['시간에 따라 변해야 한다', '일정한 세기로 계속 켜져 있어야 한다', '아주 세기만 하면 변하지 않아도 된다', '신호가 전혀 없어야 한다'],
          answer: 0,
          feedback: ['', '일정한 자기장은 코일에 전류를 유도하지 못해요. 무선 충전의 직류 실험을 떠올려 보세요.', '세기가 아니라 변하는지가 중요해요.', '신호가 없으면 유도될 것도 없어요.'],
          explain: '전자기 유도는 코일을 지나는 자기장이 <b>시간에 따라 변할 때</b> 일어나요. 그래서 송신 안테나에는 <b>교류 전류</b>를 흘려 변하는 전기장·자기장(전자기파)을 만들어요. 일정한 신호는 수신 코일에 전류를 유도하지 못해요.',
        },
      ],
    },
    {
      title: '에너지 전달과 신호 전달의 문명', short: '문명의 변화', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 전자기 유도가 에너지를 전달하는 데(무선 충전, 카드의 전력)도, 정보를 전달하는 데(센서, 카드 ID, 라디오)도 쓰이는 것을 봤어요. 이 기술들이 <b>현대 문명</b>을 어떻게 바꿨는지 정리해요.</div>' +
        '<p><b>에너지 전달</b>은 큰 전력을 보내는 것, <b>신호 전달</b>은 적은 전력에 <b>정보</b>를 실어 보내는 것이에요. 여섯 가지 기술을 분류하고, 각 기술이 바꾼 생활과 연결해 봐요.</p>',
      features: ['classify', 'life'],
      setup() { S.cl = { cls: {}, bad: {}, shake: {} }; S.lf = { pair: {}, sel: -1, bad: {}, shake: {} }; setScene('classify'); updateCtl(); },
      recap: '전자기 유도는 전력을 보내는 기술(발전·송전, 무선 충전)과 정보를 보내는 기술(센서, 방송, 통신, 보안 검색)에 모두 쓰여요. 교통카드처럼 에너지와 신호를 함께 전달하는 기술도 있고, 이 기술들이 전기·교통·통신·안전을 바꿔 놓았어요.',
      summary: '<ul><li><b>에너지 전달</b>: 발전기·변압기·송전, 무선 충전 → 큰 전력을 보내요.</li><li><b>신호 전달</b>: 마이크·센서, 라디오·TV, 스마트폰 통신, 금속 탐지 → 적은 전력으로 정보를 보내요.</li><li><b>둘 다</b>: 교통카드·NFC → 유도로 칩에 전력을 주고 ID 신호도 주고받아요.</li><li>이 기술들이 <b>전기를 쓰는 생활, 대중교통, 통신, 안전</b>을 바꿔 놓았어요.</li><li>휴대전화·와이파이 신호가 벽을 통과하며 약해지는 것은 전자기파의 에너지 일부가 벽에서 흡수·반사되기 때문이에요.</li></ul>',
      missions: [
        {
          title: '에너지 전달과 신호 전달 분류하기', manual: true,
          goal: '여섯 가지 기술을 <b>에너지 전달 · 신호 전달 · 둘 다</b>로 분류한 뒤 ✔ 확인하기를 누르세요.',
          hint: '큰 전력을 보내는 것은 에너지, 정보를 보내는 것은 신호예요. 교통카드는 칩에 전력도 주고 ID도 주고받아요.',
          setup() { updateCtl(); setScene('classify'); },
          check() {
            const miss = TECH.filter((t, i) => !S.cl.cls[i]);
            if (miss.length) return '아직 분류하지 않은 기술이 ' + miss.length + '개 있어요.';
            let bad = 0;
            TECH.forEach((t, i) => { const ok = S.cl.cls[i] === t.ans; if (!ok) { bad++; if (!S.cl.bad[i]) { S.cl.bad[i] = true; S.cl.shake[i] = S.t; } } else delete S.cl.bad[i]; });
            return bad ? '빨간 테두리 기술을 다시 분류해 보세요. 전력을 보내는지, 정보를 보내는지 생각해 보세요.' : true;
          },
          status: () => '분류한 기술 ' + TECH.filter((t, i) => S.cl.cls[i]).length + ' / ' + TECH.length,
          explain: '<b>전력 송전·발전기, 무선 충전</b>은 에너지 전달, <b>라디오·TV, 스마트폰 통신, 금속 탐지</b>는 신호 전달이에요. <b>교통카드(NFC)</b>는 칩에 전력을 주면서(에너지) ID를 주고받으므로(신호) <b>둘 다</b>예요.',
        },
        {
          title: '기술이 바꾼 생활 연결하기', manual: true,
          goal: '여섯 가지 기술을 그 기술이 바꾼 <b>생활</b>과 이은 뒤 ✔ 확인하기를 누르세요.',
          hint: '왼쪽 기술을 누르고 오른쪽 문장을 눌러요. 괄호 안의 단어(전력·교통·통신·안전)가 단서예요.',
          setup() { updateCtl(); setScene('life'); },
          check() {
            const n = Object.keys(S.lf.pair).length;
            if (n < TECH.length) return '아직 잇지 않은 기술이 ' + (TECH.length - n) + '개 있어요.';
            let bad = 0;
            TECH.forEach((t, i) => { const ok = S.lf.pair[i] === i; if (!ok) { bad++; if (!S.lf.bad[i]) { S.lf.bad[i] = true; S.lf.shake[i] = S.t; } } else delete S.lf.bad[i]; });
            return bad ? '빨간 선을 다시 이어 보세요. 기술이 하는 일과 생활의 변화를 비교해 보세요.' : true;
          },
          status: () => '이은 짝 ' + Object.keys(S.lf.pair).length + ' / ' + TECH.length,
          explain: '발전·송전은 <b>전력</b>, 무선 충전은 방수·몸속 기기 충전, 교통카드는 <b>교통</b>, 라디오·TV와 스마트폰은 <b>통신</b>, 금속 탐지는 <b>안전</b>을 바꿨어요. 전자기 유도 하나가 에너지와 정보의 전달에 널리 쓰여 현대 문명의 기반이 되었어요.',
        },
        {
          type: 'quiz', title: '벽을 통과하며 약해지는 신호',
          goal: '와이파이나 휴대전화의 신호가 <b>벽을 통과하면서 약해지는</b> 까닭은?',
          setup() { updateCtl(); setScene('life'); },
          choices: ['전자기파는 벽을 전혀 통과하지 못해서', '전자기파의 에너지 일부가 벽에서 흡수되거나 반사되어서', '전자기파가 벽을 지나면서 소리로 바뀌어서', '거리와 상관없이 항상 같은 세기라서'],
          answer: 1,
          feedback: ['통과하긴 해요. 다만 약해질 뿐이에요.', '', '전자기파는 소리가 아니에요. 소리로 바뀌지 않아요.', '실제로는 벽이나 거리에 따라 신호가 약해져요.'],
          explain: '전자기파는 벽을 통과할 수 있지만 <b>에너지의 일부가 벽에서 흡수되거나 반사</b>돼서 수신 안테나에 도달하는 세기가 줄어요. 그래서 벽이 많고 멀수록 신호가 약해져요. 교통카드처럼 에너지와 신호를 함께 전달하는 기술도 거리가 멀어지면 약해지는 점은 같아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-induction-signal', mount: '#game', badge: '전자기 신호 탐험가', homeHref: '../../index.html#hp',
    featureLabels: { sensor: '🎙️ 마이크 · 바퀴 센서 · 기타 픽업 · 파형', detector: '🔍 금속 탐지기 · 💳 교통카드', radio: '📻 AM 라디오 동조 · 🔢 송수신 순서', classify: '🗂️ 기술 분류 · 🔗 생활 연결' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  updateCtl();   // 화면(scene)은 단계 설정(setup)이 이미 맞춰 놓았어요 (이어하기 포함)
  let lastFree = false, lastLvl = -1, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.free !== lastFree || game.level !== lastLvl)) { lastFree = game.free; lastLvl = game.level; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    stepSensor(dt); stepDetector(dt); stepCard(dt); stepRadio(dt);
    view.apply();
    if (S.mode === 'sensor') drawSensor(dt); else if (S.mode === 'detector') drawDetector(dt); else if (S.mode === 'card') drawCard(dt); else if (S.mode === 'radio') drawRadio(dt);
    else if (S.mode === 'order') drawOrder(dt); else if (S.mode === 'classify') drawClassify(dt); else drawLife(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, OBJS, STN, TECH, ORDER, ORD_SHOW, LIFE_ORDER, SLOT, ZONE, get game() { return game; }, setScene, putObj, cardV, gStn, homeOf, updateCtl, pluck, DIAL, W_TUNE,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepSensor(0.02); stepDetector(0.02); stepCard(0.02); stepRadio(0.02); } },
  };
})();
