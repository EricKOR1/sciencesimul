/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 에너지 전환과 효율 (단원 9차시)
   성취기준 [10통과2-02-06] 에너지 효율의 의미와 중요성을 이해하고, 지속가능한 발전과 지구 환경 문제 해결에 신재생 에너지 기술을
   활용하는 방안을 탐색할 수 있다. (에너지 전환·보존, 효율의 의미와 중요성 부분)
   ① 관찰: 에너지 전환 (장치 6개: 들어가는 에너지 → 나오는 에너지, 열이 같이 나와요)
   ② 실험: 에너지 보존 (백열전구 100 J, 롤러코스터 공: 입력 = 출력의 합)
   ③ 분석: 에너지 효율 (유용한 에너지 ÷ 공급한 에너지 × 100)
   ④ 적용: 낭비 줄이기 (발전소 → 송전 → 전구의 사슬 효율, 해결 방안)
   열역학 법칙의 이름 · 엔트로피는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const SH = PHONE ? 330 : 300;
  const ROW_Y = SH + 10;
  const TY = SH - 38;
  const U = PHONE ? 0.72 : 1;               // 장치 그림 배율
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const r1 = (v) => Math.round(v * 10) / 10;

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
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4600);
  }
  function stepSub(total, hmax, fn) { const n = Math.max(1, Math.ceil(total / hmax)); const h = total / n; for (let i = 0; i < n; i++) fn(h); }
  function bg() {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf0fa'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  /* ---------- 색 · 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const COL_IN = '#3b82f6', COL_USE = '#f5b800', COL_HEAT = '#f2873a';
  const FORMS = [
    { id: 'elec', name: '전기', icon: '⚡', col: '#d4a017' },
    { id: 'chem', name: '화학', icon: '🧪', col: '#7c3aed' },
    { id: 'light', name: '빛', icon: '💡', col: '#e0a800' },
    { id: 'kin', name: '운동', icon: '🌀', col: '#0f9d6a' },
    { id: 'sound', name: '소리', icon: '🔊', col: '#2f6df6' },
    { id: 'heat', name: '열', icon: '🔥', col: '#f2873a' },
  ];
  const FM = {}; FORMS.forEach((f) => { FM[f.id] = f; });
  const DEV6 = [
    { id: 'bulb', name: '백열전구', icon: '💡', inn: 'elec', out: ['light', 'heat'] },
    { id: 'fan', name: '선풍기', icon: '🌀', inn: 'elec', out: ['kin', 'heat'] },
    { id: 'speaker', name: '스피커', icon: '🔊', inn: 'elec', out: ['sound', 'heat'] },
    { id: 'solar', name: '태양 전지', icon: '☀️', inn: 'light', out: ['elec', 'heat'] },
    { id: 'battery', name: '건전지', icon: '🔋', inn: 'chem', out: ['elec', 'heat'] },
    { id: 'engine', name: '자동차 엔진', icon: '🚗', inn: 'chem', out: ['kin', 'heat'] },
  ];
  // 보존 실험
  const E0 = 100, M = 2, G = 10, H0 = 5, XS = 8, MU = 0.1;      // 처음 에너지 100 J, 공 2 kg, g = 10 m/s², 높이 5 m, 마찰 계수 0.1
  const A_TRK = H0 / (XS * XS);                                  // 트랙 높이 h = A x² (x = ±8 m에서 5 m)
  const BULB_LIGHT = 5, BULB_HEAT = 95;                          // 전기 100 J → 빛 5 J + 열 95 J
  const isLightTile = (k) => k % 20 === 10;                      // 빛이 되는 칸 (5개)
  // 효율
  const EFFD = [
    { id: 'engine', name: '자동차 엔진', icon: '🚗', eta: 25, inn: '연료(화학) 에너지', use: '운동 에너지' },
    { id: 'coal', name: '석탄 화력 발전', icon: '🏭', eta: 40, inn: '연료(화학) 에너지', use: '전기 에너지' },
    { id: 'motor', name: '전기 모터', icon: '⚙️', eta: 90, inn: '전기 에너지', use: '운동 에너지' },
    { id: 'bulb', name: '백열전구', icon: '💡', eta: 5, inn: '전기 에너지', use: '빛에너지' },
    { id: 'led', name: 'LED 전구', icon: '🔆', eta: 30, inn: '전기 에너지', use: '빛에너지' },
  ];
  const EFF_ORDER = EFFD.slice().sort((a, b) => b.eta - a.eta).map((d) => d.id);     // 효율이 큰 순서
  // 사슬
  const ETA_PLANT = 40, ETA_TRANS = 95;
  const chainVals = (lamp) => { const a = 100, b = a * ETA_PLANT / 100, c = b * ETA_TRANS / 100, d = c * lamp / 100; return [a, b, c, d]; };
  const LED_SAVE = Math.round((1 - 5 / 30) * 100);               // 같은 빛을 내는 데 필요한 연료 에너지 절약률 = 1 − 5/30
  const CHP_SAVE = Math.round((1 - 40 / 80) * 100);              // 열병합: 종합 효율 40 % → 80 %
  const SOLS = [
    { id: 'led', name: 'LED 전구로 바꾸기', icon: '💡', save: LED_SAVE },
    { id: 'chp', name: '열병합 발전 이용', icon: '🏭', save: CHP_SAVE },
    { id: 'grade', name: '효율 등급 높은 제품 고르기', icon: '🏷️', save: 30 },
    { id: 'insul', name: '단열 개선', icon: '🏠', save: 25 },
    { id: 'standby', name: '대기전력 차단', icon: '🔌', save: 10 },
  ];
  const SOL_ANS = SOLS.slice().sort((a, b) => b.save - a.save).slice(0, 3).map((s) => s.id);
  const ACTS = [
    { id: 'plug', name: '안 쓰는 전등과 플러그 끄기', icon: '🔌' },
    { id: 'grade', name: '효율 등급이 높은 제품 고르기', icon: '🏷️' },
    { id: 'led', name: '집의 전구를 LED로 바꾸기', icon: '💡' },
    { id: 'walk', name: '가까운 거리는 걷거나 대중교통 타기', icon: '🚌' },
    { id: 'heat', name: '겨울에 단열하고 적정 온도 지키기', icon: '🧣' },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'conv', t: 0, fade: 0, part: '',
    cv: { sel: 0, inn: null, outs: [], done: [false, false, false, false, false, false], shake: 0 },
    cs: {
      sub: 'bulb', bulbSeen: false, fricDone: false,
      bulb: { st: 'idle', tiles: [], launched: 0, acc: 0, done: false },
      co: { st: 'idle', x: -XS, dir: 1, E: E0, fric: false, trail: 0, ranFric: false, restDone: false, t0: 0 },
    },
    ef: { sel: 0, inp: 200, guess: 50, done: {}, wrong: 0, order: ['led', 'bulb', 'engine', 'motor', 'coal'], ring: 0 },
    sv: { lamp: 5, sol: [], act: {}, parts: [], acc: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { conv: '⚡ 에너지 전환', cons: '⚖️ 에너지 보존', eff: '📊 에너지 효율', save: '♻️ 낭비 줄이기' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  const isFree = () => !!(game && game.free);
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub') === S.cs.sub;
      if (on && n.hasAttribute('data-calc')) on = S.part === 'calc' || isFree();
      if (on && n.hasAttribute('data-sort')) on = S.part === 'sort';
      if (on && n.hasAttribute('data-sol')) on = S.part === 'sol' || isFree();
      if (on && n.hasAttribute('data-act')) on = S.part === 'act' || isFree();
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#csSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cs.sub));
    $$('#frSeg button').forEach((b) => { b.classList.toggle('on', (b.dataset.v === '1') === S.cs.co.fric); b.disabled = S.cs.co.st === 'run'; });
    $('#bGo').disabled = S.cs.co.st === 'run';
    $('#bBulb').disabled = S.cs.bulb.st === 'run';
    $$('#lpSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.sv.lamp));
    $$('#inChips button').forEach((b) => { b.classList.toggle('on', S.cv.inn === b.dataset.v); b.disabled = S.cv.done[S.cv.sel]; });
    $$('#outChips button').forEach((b) => { b.classList.toggle('on', S.cv.outs.indexOf(b.dataset.v) >= 0); b.disabled = S.cv.done[S.cv.sel]; });
    $('#bDevOK').disabled = S.cv.done[S.cv.sel];
    $('#cvTitle').textContent = '⚡ 들어가는 에너지 (' + DEV6[S.cv.sel].name + ')';
    $$('#dvChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.i === S.ef.sel); b.classList.toggle('done', !!S.ef.done[EFFD[+b.dataset.i].id]); });
    $$('#solChips button').forEach((b) => { const k = S.sv.sol.indexOf(b.dataset.id); b.classList.toggle('on', k >= 0); b.firstChild.textContent = k >= 0 ? ['①', '②', '③'][k] + ' ' : ''; });
    $$('#actChips button').forEach((b) => b.classList.toggle('on', !!S.sv.act[b.dataset.id]));
    const si = $('#sIn'); if (+si.value !== S.ef.inp) si.value = S.ef.inp; si.style.setProperty('--pct', ((S.ef.inp - 100) / 300 * 100) + '%'); $('#oIn').textContent = S.ef.inp + ' J';
    const sg = $('#sGuess'); if (+sg.value !== S.ef.guess) sg.value = S.ef.guess; sg.style.setProperty('--pct', S.ef.guess + '%'); $('#oGuess').textContent = S.ef.guess + ' %';
    renderSort();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= ① 에너지 전환 ================= */
  const inChips = $('#inChips'), outChips = $('#outChips');
  FORMS.forEach((f) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = f.id; b.textContent = f.icon + ' ' + f.name;
    b.addEventListener('click', () => { if (S.cv.done[S.cv.sel]) return; Sound.click(); S.cv.inn = f.id; updateCtl(); });
    inChips.appendChild(b);
    const c = document.createElement('button'); c.type = 'button'; c.dataset.v = f.id; c.textContent = f.icon + ' ' + f.name;
    c.addEventListener('click', () => {
      if (S.cv.done[S.cv.sel]) return;
      const i = S.cv.outs.indexOf(f.id);
      if (i >= 0) S.cv.outs.splice(i, 1);
      else if (S.cv.outs.length >= 2) { showHint('나오는 에너지는 2가지만 골라요. 하나를 빼고 골라 보세요.', 3200); Sound.fail(); return; }
      else S.cv.outs.push(f.id);
      Sound.click(); updateCtl();
    });
    outChips.appendChild(c);
  });
  function selectDevice(i) {
    S.cv.sel = i; S.cv.shake = 0;
    if (S.cv.done[i]) { S.cv.inn = DEV6[i].inn; S.cv.outs = DEV6[i].out.slice(); } else { S.cv.inn = null; S.cv.outs = []; }
    parts.clear(); updateCtl();
  }
  function confirmDevice() {
    const cv = S.cv, d = DEV6[cv.sel];
    if (cv.done[cv.sel]) return;
    if (!cv.inn || cv.outs.length < 2) { showHint('들어가는 에너지 1가지와 나오는 에너지 2가지를 골라 주세요.', 3600); Sound.fail(); return; }
    const okIn = cv.inn === d.inn, okOut = cv.outs.slice().sort().join() === d.out.slice().sort().join();
    if (okIn && okOut) {
      cv.done[cv.sel] = true; cv.shake = 0; Sound.success();
      const c = devCenter(); parts.burst(c.x, c.y, { count: 18, speed: 160, size: 3.4, colors: ['#f5b800', '#f2873a', '#3b82f6', '#14a058'], gravity: 160 });
      updateCtl();
    } else {
      cv.shake = 1; Sound.fail();
      if (!okIn) showHint('들어가는 에너지가 달라요. 이 장치를 작동시키려면 무엇이 필요한지 생각해 보세요.', 4600);
      else if (cv.outs.indexOf('heat') < 0) showHint('나오는 에너지가 달라요. 장치가 작동할 때 온도계가 어떻게 되는지 보세요. 쓰려는 에너지와 함께 나오는 다른 에너지가 있어요.', 5200);
      else showHint('나오는 에너지가 달라요. 장치가 하는 일(빛, 움직임, 소리, 전기)이 무엇인지 다시 보세요.', 4600);
    }
  }
  $('#bDevOK').addEventListener('click', () => { Sound.click(); confirmDevice(); });
  const devCenter = () => ({ x: VW / 2, y: PHONE ? 120 : 128 });
  const devCard = (i) => (PHONE ? { x: 12 + (i % 3) * 152, y: SH - 112 + Math.floor(i / 3) * 56, w: 148, h: 50 } : { x: 14 + i * 129, y: SH - 66, w: 123, h: 56 });
  // ---- 장치 그림 ----
  function drawDevice(id, cx, cy, u, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(u, u);
    if (id === 'bulb') {
      const g = 0.7 + 0.3 * Math.sin(a * 5);
      D.glow(0, -12, 90, '#ffd447', 0.35 * g);
      D.sphere(0, -14, 36, '#fff3a8', { gloss: true });
      ctx.strokeStyle = '#ff9d00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 18); ctx.lineTo(-8, -4); ctx.lineTo(-3, 6); ctx.lineTo(3, -4); ctx.lineTo(8, 6); ctx.lineTo(10, 18); ctx.stroke();
      ctx.fillStyle = '#7a8599'; D.roundRect(-16, 20, 32, 20, 4); ctx.fill(); ctx.fillStyle = '#5a6479'; ctx.fillRect(-16, 28, 32, 3);
    } else if (id === 'fan') {
      ctx.fillStyle = '#b5bfd0'; ctx.beginPath(); ctx.ellipse(0, 52, 34, 8, 0, 0, TAU); ctx.fill(); ctx.fillRect(-4, 8, 8, 44);
      D.shadow(() => { ctx.beginPath(); ctx.arc(0, -12, 40, 0, TAU); ctx.fillStyle = '#eef3fb'; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.save(); ctx.translate(0, -12); ctx.rotate(a * 9);
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.fillStyle = '#5a8fe0'; ctx.beginPath(); ctx.ellipse(0, -18, 9, 20, 0, 0, TAU); ctx.fill(); }
      ctx.restore(); D.sphere(0, -12, 6, '#394258', { gloss: false });
      ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -12, 40, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -12, 24, 0, TAU); ctx.stroke();
    } else if (id === 'speaker') {
      D.shadow(() => { D.roundRect(-36, -50, 72, 96, 10); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 3 });
      const k = 1 + 0.07 * Math.sin(a * 14);
      D.sphere(0, 14, 26 * k, '#59647e', { gloss: false, outline: '#1f2937', outlineWidth: 3 }); D.sphere(0, 14, 9, '#1f2937', { gloss: false });
      D.sphere(0, -26, 11 * (1 + 0.05 * Math.sin(a * 22)), '#59647e', { gloss: false, outline: '#1f2937', outlineWidth: 2 });
      ctx.strokeStyle = 'rgba(47,109,246,.7)'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const q = ((a * 1.2 + i / 3) % 1); ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(40, -2, 10 + q * 36, -0.9, 0.9); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (id === 'solar') {
      D.glow(-46, -50, 60, '#ffd447', 0.5); D.sphere(-46, -50, 17, '#ffcf3a', { gloss: false });
      ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + a; ctx.beginPath(); ctx.moveTo(-46 + Math.cos(an) * 22, -50 + Math.sin(an) * 22); ctx.lineTo(-46 + Math.cos(an) * 30, -50 + Math.sin(an) * 30); ctx.stroke(); }
      ctx.save(); ctx.translate(6, 14); ctx.transform(1, 0, -0.4, 1, 0, 0);
      D.shadow(() => { ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-42, -34, 84, 68); }, { blur: 6, y: 3 });
      ctx.strokeStyle = '#7ea5ff'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-42 + i * 21, -34); ctx.lineTo(-42 + i * 21, 34); ctx.stroke(); } for (let j = 1; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-42, -34 + j * 22.7); ctx.lineTo(42, -34 + j * 22.7); ctx.stroke(); }
      ctx.restore();
    } else if (id === 'battery') {
      D.shadow(() => { D.roundRect(-26, -38, 52, 86, 8); ctx.fillStyle = '#2f9e6a'; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.fillStyle = '#c9d2df'; D.roundRect(-9, -48, 18, 12, 3); ctx.fill();
      ctx.fillStyle = '#1b2333'; ctx.fillRect(-26, -6, 52, 20);
      T(0, 10, '+  −', 17, '#fff', 'center', 800);
      ctx.fillStyle = '#d7f5e4'; for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a * 4 - i); ctx.fillRect(-17 + i * 9.5, 24, 6, 16); } ctx.globalAlpha = 1;
    } else if (id === 'engine') {
      D.shadow(() => { D.roundRect(-52, -10, 104, 54, 8); ctx.fillStyle = '#6a7488'; ctx.fill(); }, { blur: 6, y: 3 });
      for (let i = 0; i < 3; i++) { const y = -36 + 10 * Math.sin(a * 11 + i * 2.1); ctx.fillStyle = '#c9d2df'; ctx.fillRect(-40 + i * 32, y, 18, 26); ctx.fillStyle = '#39445a'; ctx.fillRect(-35 + i * 32, y + 26, 8, 14); }
      ctx.fillStyle = '#394258'; ctx.fillRect(-52, 44, 104, 8);
      ctx.fillStyle = '#7a8599'; ctx.fillRect(52, 20, 28, 8);
    }
    ctx.restore();
  }
  function drawThermo(x, y, lvl) {
    ctx.save(); ctx.translate(x, y);
    D.roundRect(-5, -34, 10, 56, 5); ctx.fillStyle = '#e8ecf4'; ctx.fill(); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.5; ctx.stroke();
    D.sphere(0, 26, 9, '#e2464b', { gloss: false });
    ctx.fillStyle = '#e2464b'; ctx.fillRect(-2.2, 22 - 52 * lvl, 4.4, 4 + 52 * lvl);
    ctx.restore();
  }
  function streamDots(x1, y1, x2, y2, n, col, ph, r) {
    for (let j = 0; j < n; j++) { const q = ((ph + j / n) % 1); const x = x1 + (x2 - x1) * q, y = y1 + (y2 - y1) * q; ctx.globalAlpha = Math.sin(q * Math.PI); D.sphere(x, y, r || 4, col, { gloss: false }); } ctx.globalAlpha = 1;
  }
  function drawConvScene(dt) {
    const cv = S.cv, d = DEV6[cv.sel], c = devCenter(), done = cv.done[cv.sel];
    T(14, PHONE ? 24 : 30, '⚡ 장치가 일할 때 에너지는 어떻게 바뀔까?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 입력 화살표 · 출력 화살표
    const L = 150 * U, R = 150 * U;
    const inCol = done ? FM[d.inn].col : '#9aa7bd';
    D.arrow(c.x - L - 20 * U, c.y + 8, c.x - 62 * U, c.y + 8, { color: done ? COL_IN : '#aab4c6', width: 6, head: 16, dash: done ? null : [8, 6] });
    if (done) streamDots(c.x - L - 20 * U, c.y + 8, c.x - 62 * U, c.y + 8, 5, COL_IN, S.t * 0.5, 4.5);
    D.arrow(c.x + 64 * U, c.y - 10, c.x + R + 30 * U, c.y - 44 * U, { color: done ? COL_USE : '#aab4c6', width: 6, head: 16, dash: done ? null : [8, 6] });
    D.arrow(c.x + 64 * U, c.y + 26, c.x + R + 30 * U, c.y + 52 * U, { color: done ? COL_HEAT : '#aab4c6', width: 6, head: 16, dash: done ? null : [8, 6] });
    if (done) { streamDots(c.x + 64 * U, c.y - 10, c.x + R + 30 * U, c.y - 44 * U, 4, COL_USE, S.t * 0.5 + 0.2, 4.5); streamDots(c.x + 64 * U, c.y + 26, c.x + R + 30 * U, c.y + 52 * U, 4, COL_HEAT, S.t * 0.5 + 0.5, 4.5); }
    // 장치
    drawDevice(d.id, c.x, c.y, U * (PHONE ? 1.05 : 1.25), S.t);
    // 온도계 (열이 나오는 단서)
    const lvl = 0.25 + 0.7 * clamp((S.t % 7) / 5, 0, 1);
    drawThermo(c.x + 112 * U * 0.5, c.y - 74 * U, lvl); T(c.x + 56 * U + 20, c.y - 74 * U + 52, '온도', 12, '#5a6679', 'left', 700);
    if (!RM) { for (let i = 0; i < 3; i++) { const q = ((S.t * 0.5 + i / 3) % 1); ctx.globalAlpha = Math.sin(q * Math.PI) * 0.7; D.wave(c.x - 22 * U, c.x + 22 * U, c.y - 70 * U - q * 24, { amp: 3, wavelength: 18, color: '#f2873a', width: 2.6, phase: S.t * 4 + i * 2 }); } ctx.globalAlpha = 1; }
    // 라벨
    const lab = (x, y, text, col, q) => D.label(x, y, text, { bg: col, size: PHONE ? 12 : 13.5, color: '#fff' });
    lab(c.x - L * 0.55 - 10, c.y - 28 * U, done ? '들어가는 ' + FM[d.inn].icon + FM[d.inn].name : cv.inn ? '들어가는 ' + FM[cv.inn].icon + FM[cv.inn].name : '들어가는 에너지 ?', done || cv.inn ? '#3b82f6' : '#8b95a8');
    const o1 = done ? d.out[0] : cv.outs[0], o2 = done ? d.out[1] : cv.outs[1];
    const outShow = (id) => (id ? FM[id].icon + FM[id].name : '?');
    if (done) { const ou = d.out.slice().sort((a, b) => (a === 'heat') - (b === 'heat')); lab(c.x + R * 0.78, c.y - 44 * U - 24, '나오는 ' + outShow(ou[0]), '#d99a00'); lab(c.x + R * 0.78, c.y + 52 * U + 24, '나오는 ' + outShow(ou[1]), COL_HEAT); }
    else { lab(c.x + R * 0.78, c.y - 44 * U - 24, '나오는 ' + outShow(o1), o1 ? FM[o1].col : '#8b95a8'); lab(c.x + R * 0.78, c.y + 52 * U + 24, '나오는 ' + outShow(o2), o2 ? FM[o2].col : '#8b95a8'); }
    T(c.x, c.y + (PHONE ? 62 : 82), d.name, PHONE ? 14 : 16, '#26324a', 'center', 800);
    if (cv.shake > 0.01) { ctx.fillStyle = 'rgba(226,70,75,' + 0.12 * cv.shake + ')'; ctx.fillRect(0, 0, VW, SH); cv.shake = RM ? 0 : SciSim.approach(cv.shake, 0, dt, 5); }
    // 장치 카드
    DEV6.forEach((dv, i) => {
      const r = devCard(i), sel = i === cv.sel, dn = cv.done[i];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = sel ? '#fff4e8' : '#fff'; ctx.fill(); }, { blur: sel ? 8 : 4, y: 2 });
      ctx.strokeStyle = dn ? '#14a058' : sel ? '#f26b3a' : '#d3dae6'; ctx.lineWidth = sel ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      T(r.x + 24, r.y + r.h / 2 + 8, dv.icon, 24, '#000', 'center', 700);
      T(r.x + 46, r.y + r.h / 2 + 5, dv.name, PHONE ? 13 : 13.5, '#26324a', 'left', 800);
      if (dn) D.check(r.x + r.w - 15, r.y + 15, 9, 1);
    });
    drawConvTable();
    parts.update(dt); parts.draw(ctx);
  }
  function drawConvTable() {
    const y = ROW_Y, h = VH - y - 10;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 22, '에너지 전환 정리표', 13.5, '#26324a', 'left', 800);
    const hh = 40, rh = Math.min(PHONE ? 38 : 32, (h - hh - 10) / 6);
    const cx = [26, PHONE ? 130 : 190, PHONE ? 260 : 400];
    ['장치', '들어가는 에너지', '나오는 에너지'].forEach((t, i) => T(cx[i], y + 40, t, 12.5, '#5a6679', 'left', 800));
    DEV6.forEach((d, i) => {
      const yy = y + hh + 6 + i * rh, dn = S.cv.done[i];
      if (i === S.cv.sel) { D.roundRect(18, yy, VW - 36, rh - 2, 8); ctx.fillStyle = 'rgba(242,107,58,.10)'; ctx.fill(); }
      T(cx[0], yy + rh / 2 + 5, d.icon + ' ' + d.name, PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      T(cx[1], yy + rh / 2 + 5, dn ? FM[d.inn].icon + ' ' + FM[d.inn].name + ' 에너지' : '?', PHONE ? 12.5 : 14, dn ? '#26324a' : '#98a2b3', 'left', 800);
      T(cx[2], yy + rh / 2 + 5, dn ? d.out.map((o) => FM[o].icon + FM[o].name).join(' + ') : '?', PHONE ? 12.5 : 14, dn ? '#26324a' : '#98a2b3', 'left', 800);
    });
  }
  view.canvas.addEventListener('click', (e) => {
    if (S.mode !== 'conv') return;
    const p = view.toLocal(e);
    for (let i = 0; i < 6; i++) { const r = devCard(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { Sound.click(); selectDevice(i); return; } }
  });

  /* ================= ② 에너지 보존 ================= */
  // ---- 백열전구: 1 J 칸 100개 ----
  const BT = PHONE ? 8 : 13, BG = PHONE ? 1.5 : 2;                     // 칸 크기, 틈
  const bulbLayout = () => PHONE
    ? { ix: 18, iy: 78, cx: 240, cy: 126, hx: 328, hy: 78, lx: 440, ly: 78 }
    : { ix: 40, iy: 72, cx: 385, cy: 130, hx: 530, hy: 72, lx: 712, ly: 72 };
  const slotXY = (ox, oy, k) => ({ x: ox + (k % 10) * (BT + BG) + BT / 2, y: oy + Math.floor(k / 10) * (BT + BG) + BT / 2 });
  function resetBulb() {
    const b = S.cs.bulb; b.st = 'idle'; b.launched = 0; b.acc = 0; b.done = false;
    let hi = 0, li = 0;
    b.tiles = [];
    for (let k = 0; k < 100; k++) { const light = isLightTile(k); b.tiles.push({ k, light, idx: light ? li++ : hi++, t: -1, state: 'wait' }); }
    updateCtl();
  }
  function startBulb() { const b = S.cs.bulb; if (b.st === 'run') return; if (b.st === 'done') resetBulb(); b.st = 'run'; b.acc = 0; Sound.click(); updateCtl(); }
  const bulbCounts = () => {
    const b = S.cs.bulb; let wait = 0, fly = 0, light = 0, heat = 0;
    b.tiles.forEach((t) => { if (t.state === 'wait') wait++; else if (t.state === 'done') { if (t.light) light++; else heat++; } else fly++; });
    return { wait, fly, light, heat };
  };
  function stepBulb(dt) {
    const b = S.cs.bulb; if (b.st !== 'run') return;
    b.acc += dt * (RM ? 100 : 26);
    while (b.acc >= 1 && b.launched < 100) { b.acc -= 1; const t = b.tiles[b.launched++]; t.state = 'fly'; t.t = 0; }
    b.tiles.forEach((t) => {
      if (t.state !== 'fly') return;
      t.t += dt / (RM ? 0.1 : 1.1);
      if (t.t >= 1) { t.state = 'done'; t.t = 1; if (!t.light && Math.random() < 0.0) Sound.tick(); }
    });
    if (b.launched >= 100 && b.tiles.every((t) => t.state === 'done')) { b.st = 'done'; b.done = true; S.cs.bulbSeen = true; Sound.success(); const L = bulbLayout(); parts.burst(L.cx, L.cy, { count: 16, speed: 140, size: 3.2, colors: ['#f5b800', '#f2873a'], gravity: 80 }); updateCtl(); }
  }
  function drawTile(x, y, col, a) { ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - BT / 2, y - BT / 2, BT, BT, 2); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
  function drawBulbScene(dt) {
    const b = S.cs.bulb, L = bulbLayout(), cnt = bulbCounts();
    T(14, PHONE ? 24 : 30, '💡 전기 에너지 100 J가 전구를 지나가요 (한 칸 = 1 J)', PHONE ? 13 : 17, '#26324a', 'left', 800);
    // 트레이 (빈 칸 표시)
    const tray = (ox, oy, n, label, col) => { for (let k = 0; k < n; k++) { const p = slotXY(ox, oy, k); D.roundRect(p.x - BT / 2, p.y - BT / 2, BT, BT, 2); ctx.fillStyle = 'rgba(120,135,160,.12)'; ctx.fill(); } T(ox + 5 * (BT + BG), oy + 10 * (BT + BG) + 18, label, PHONE ? 12 : 13.5, col, 'center', 800); };
    tray(L.ix, L.iy, 100, '입력 전기 에너지', '#1d4ed8');
    tray(L.hx, L.hy, 100, '열에너지', '#c2410c');
    // 빛 트레이 (5칸, 세로)
    for (let k = 0; k < 5; k++) { const x = L.lx + BT / 2, y = L.ly + k * (BT + BG) + BT / 2; D.roundRect(x - BT / 2, y - BT / 2, BT, BT, 2); ctx.fillStyle = 'rgba(120,135,160,.12)'; ctx.fill(); }
    T(L.lx + BT / 2, L.ly + 5 * (BT + BG) + 16, '빛', PHONE ? 12 : 13.5, '#8a6a00', 'center', 800);
    // 전구
    const glow = clamp(cnt.fly / 22, 0, 1);
    if (glow > 0.02) D.glow(L.cx, L.cy - 8, 70, '#ffd447', 0.55 * glow);
    D.sphere(L.cx, L.cy - 8, PHONE ? 28 : 40, C.mix('#ece9df', '#fff3a8', glow), { gloss: true });
    ctx.strokeStyle = C.mix('#8a8474', '#ff9d00', glow); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.cx - 9, L.cy + 18); ctx.lineTo(L.cx - 7, L.cy - 4); ctx.lineTo(L.cx - 3, L.cy + 6); ctx.lineTo(L.cx + 3, L.cy - 4); ctx.lineTo(L.cx + 7, L.cy + 6); ctx.lineTo(L.cx + 9, L.cy + 18); ctx.stroke();
    ctx.fillStyle = '#7a8599'; D.roundRect(L.cx - 14, L.cy + (PHONE ? 22 : 30), 28, 18, 4); ctx.fill();
    // 입력 칸 (남은 것)
    b.tiles.forEach((t) => { if (t.state === 'wait') { const p = slotXY(L.ix, L.iy, t.k); drawTile(p.x, p.y, COL_IN); } });
    // 이동 중 · 도착
    b.tiles.forEach((t) => {
      if (t.state === 'wait') return;
      const from = slotXY(L.ix, L.iy, t.k), to = t.light ? { x: L.lx + BT / 2, y: L.ly + t.idx * (BT + BG) + BT / 2 } : slotXY(L.hx, L.hy, t.idx);
      let x, y, col = COL_IN;
      if (t.state === 'done') { x = to.x; y = to.y; col = t.light ? COL_USE : COL_HEAT; }
      else if (t.t < 0.45) { const q = SciSim.ease.inOutQuad(t.t / 0.45); x = from.x + (L.cx - from.x) * q; y = from.y + (L.cy - 8 - from.y) * q; }
      else { const q = SciSim.ease.inOutQuad((t.t - 0.45) / 0.55); x = L.cx + (to.x - L.cx) * q; y = L.cy - 8 + (to.y - L.cy + 8) * q - Math.sin(q * Math.PI) * (t.light ? 14 : 4); col = t.light ? COL_USE : COL_HEAT; }
      drawTile(x, y, col);
    });
    if (cnt.heat > 0 && !RM) for (let i = 0; i < 2; i++) { const q = ((S.t * 0.5 + i / 2) % 1); ctx.globalAlpha = Math.sin(q * Math.PI) * clamp(cnt.heat / 40, 0.15, 0.8); D.wave(L.cx - 26, L.cx + 26, L.cy - (PHONE ? 52 : 68) - q * 22, { amp: 3, wavelength: 18, color: '#f2873a', width: 2.6, phase: S.t * 4 + i * 2 }); } ctx.globalAlpha = 1;
    drawConsData(cnt);
    parts.update(dt); parts.draw(ctx);
  }
  // ---- 롤러코스터 공 ----
  const PXM = PHONE ? 26 : 36;
  const trkX = (x) => VW / 2 + x * PXM, trkY = (x) => TY - 12 - A_TRK * x * x * PXM;
  function resetCoaster() {
    const co = S.cs.co; co.st = 'idle'; co.x = -XS; co.dir = 1; co.E = E0; co.trail = 0; co.t0 = 0; co.restDone = false; updateCtl();
  }
  function startCoaster() {
    const co = S.cs.co; if (co.st === 'run') return;
    resetCoaster(); co.ranFric = co.fric; co.st = 'run'; co.x = -XS + 0.01; Sound.click(); updateCtl();
  }
  function stepCoaster(dt) {
    const co = S.cs.co; if (co.st !== 'run') return;
    co.t0 += dt;
    stepSub(dt * 1.5, 0.004, (h) => {
      if (co.st !== 'run') return;
      const Ep = M * G * A_TRK * co.x * co.x, Ek = Math.max(0, co.E - Ep);
      const u = Math.max(Math.sqrt(2 * Ek / M), 0.3), s = 2 * A_TRK * co.x, cosT = 1 / Math.sqrt(1 + s * s);
      let xn = co.x + co.dir * u * cosT * h;
      if (co.fric) co.E = Math.max(0, co.E - MU * M * G * cosT * u * h);
      if (M * G * A_TRK * xn * xn >= co.E) {
        const xt = Math.sign(xn || co.dir) * Math.sqrt(co.E / (M * G * A_TRK));
        co.x = xt; co.dir = -co.dir;
        if (co.fric && 2 * A_TRK * Math.abs(xt) <= MU) { co.E = M * G * A_TRK * xt * xt; co.st = 'rest'; co.restDone = true; if (co.fric) S.cs.fricDone = true; Sound.success(); updateCtl(); }
      } else co.x = xn;
    });
    const Q = E0 - co.E; co.trail = Q;
    if (!RM && co.fric && co.st === 'run' && Math.random() < dt * 40) parts.emit({ x: trkX(co.x) + rnd(-6, 6), y: trkY(co.x) - 4, vx: rnd(-16, 16), vy: rnd(-46, -18), life: 0.7, size: 3, color: 'rgba(242,135,58,.9)', shape: 'smoke', grow: 5 });
  }
  const coEn = () => {
    const co = S.cs.co, Ep = M * G * A_TRK * co.x * co.x, Q = Math.max(0, E0 - co.E);
    const ep = r1(Ep), q = r1(Q), ek = Math.max(0, r1(E0 - ep - q));
    return { ep, ek, q, sum: r1(ep + ek + q) };
  };
  function drawCoasterScene(dt) {
    const co = S.cs.co, en = coEn();
    T(14, PHONE ? 24 : 30, '🎢 공이 구르면서 에너지는 어떻게 바뀔까?', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 44 : 52, co.fric ? '마찰이 있어요: 구르는 동안 열이 생겨요' : '마찰이 없어요', PHONE ? 12 : 13.5, co.fric ? '#c2410c' : '#5a6679', 'left', 700);
    // 트랙
    const heat = clamp(co.trail / E0, 0, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let x = -XS; x <= XS + 1e-6; x += 0.25) (x === -XS ? ctx.moveTo : ctx.lineTo).call(ctx, trkX(x), trkY(x));
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 12; ctx.save(); ctx.translate(0, 3); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = C.mix('#8b95a8', '#f2873a', heat); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    // 높이 눈금
    ctx.strokeStyle = '#7b8aa3'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(trkX(-XS) - 8, trkY(-XS)); ctx.lineTo(trkX(XS) + 8, trkY(-XS)); ctx.stroke(); ctx.setLineDash([]);
    T(trkX(XS) + 6, trkY(-XS) - 6, '처음 높이 5 m', 12, '#5a6679', 'right', 700);
    // 공
    const s = 2 * A_TRK * co.x, n = Math.sqrt(1 + s * s), rb = PHONE ? 11 : 15;
    const bx = trkX(co.x) + (-s / n) * (rb + 4), by = trkY(co.x) + (-1 / n) * (rb + 4);
    D.sphere(bx, by, rb, '#e2464b', { shadow: true, text: '2kg', textScale: 0.7 });
    // 시작 표시
    if (co.st === 'idle') { const p = trkX(-XS); D.ring(p, trkY(-XS) - rb - 4, rb + 8, S.t, { color: '#14a058' }); }
    T(VW / 2, TY + 18, '바닥(높이 0) 기준 · 공 2 kg · g = 10 m/s²', 12, '#5a6679', 'center', 700);
    drawConsData(null);
    parts.update(dt); parts.draw(ctx);
  }
  function drawConsData(cnt) {
    const y = ROW_Y, h = VH - y - 10;
    panel(12, y, VW - 24, h, 14);
    const bx = 26, bw = VW - 52, bh = PHONE ? 30 : 36;
    if (S.cs.sub === 'bulb') {
      T(26, y + 24, '에너지 100 J의 행방', 14, '#26324a', 'left', 800);
      const segs = [['입력 칸', cnt.wait, '#b8c9ea'], ['지나는 중', cnt.fly, '#7aa6f0'], ['빛', cnt.light, COL_USE], ['열', cnt.heat, COL_HEAT]];
      drawStack(bx, y + 40, bw, bh, segs, 100, 'J');
      const done = S.cs.bulb.done;
      const yy = y + 40 + bh + 60;
      D.roundRect(26, yy, bw, PHONE ? 74 : 62, 12); ctx.fillStyle = done ? '#e7f7ee' : '#eef1f7'; ctx.fill();
      T(VW / 2, yy + (PHONE ? 30 : 28), done ? '입력 100 J = 빛 ' + cnt.light + ' J + 열 ' + cnt.heat + ' J' : '입력 ' + (cnt.wait + cnt.fly + cnt.light + cnt.heat) + ' J  →  빛 ' + cnt.light + ' J + 열 ' + cnt.heat + ' J (+ 지나는 중 ' + cnt.fly + ' J, 입력 칸 ' + cnt.wait + ' J)', PHONE ? 13 : 16, '#26324a', 'center', 800);
      if (done) T(VW / 2, yy + (PHONE ? 54 : 50), '합이 100 J로 그대로예요. 에너지는 사라지지 않고 열이 되어 흩어졌어요.', PHONE ? 12 : 13.5, '#0b6b39', 'center', 800);
      else T(VW / 2, yy + (PHONE ? 54 : 50), '⚡ 전기 100 J 공급하기를 눌러 보세요', PHONE ? 12 : 13.5, '#5a6679', 'center', 700);
    } else {
      const en = coEn();
      T(26, y + 24, '처음 에너지 100 J의 행방', 14, '#26324a', 'left', 800);
      const segs = [['위치', en.ep, '#7c5cff'], ['운동', en.ek, '#14a058'], ['열', en.q, COL_HEAT]];
      drawStack(bx, y + 40, bw, bh, segs, 100, 'J');
      const yy = y + 40 + bh + 60;
      D.roundRect(26, yy, bw, PHONE ? 74 : 62, 12); ctx.fillStyle = '#eef1f7'; ctx.fill();
      T(VW / 2, yy + (PHONE ? 30 : 28), '위치 ' + en.ep.toFixed(1) + ' J + 운동 ' + en.ek.toFixed(1) + ' J + 열 ' + en.q.toFixed(1) + ' J = ' + en.sum.toFixed(1) + ' J', PHONE ? 13 : 16, '#26324a', 'center', 800);
      const co = S.cs.co;
      T(VW / 2, yy + (PHONE ? 54 : 50), co.st === 'idle' ? '▶ 공 출발을 눌러 보세요' : co.st === 'rest' ? '공이 멈췄어요: 처음 에너지가 거의 모두 열이 되었어요' : co.fric ? '위치와 운동 에너지가 줄고 열이 늘어요 (합은 그대로)' : '위치 ↔ 운동 에너지만 서로 바뀌고 합은 그대로예요', PHONE ? 12 : 13.5, co.st === 'rest' ? '#9a3412' : '#5a6679', 'center', 800);
    }
  }
  function drawStack(x, y, w, h, segs, total, unit) {
    D.roundRect(x, y, w, h, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, 9); ctx.clip();
    let acc = 0;
    segs.forEach((s) => { const sw = w * s[1] / total; if (sw > 0.01) { ctx.fillStyle = s[2]; ctx.fillRect(x + w * acc / total, y, sw, h); } acc += s[1]; });
    ctx.restore();
    const lw = w / segs.length;
    segs.forEach((s, i) => { const lx = x + i * lw; ctx.fillStyle = s[2]; ctx.fillRect(lx, y + h + 12, 12, 12); T(lx + 18, y + h + 23, s[0] + ' ' + (unit === 'J' ? (Number.isInteger(s[1]) && S.cs.sub === 'bulb' ? s[1] : s[1].toFixed(1)) : s[1]) + ' ' + unit, PHONE ? 12 : 13.5, '#26324a', 'left', 800); });
  }
  $$('#csSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cs.sub = b.dataset.v; parts.clear(); S.fade = 0.7; updateCtl(); }));
  $('#bBulb').addEventListener('click', startBulb);
  $('#bBulbReset').addEventListener('click', () => { Sound.click(); parts.clear(); resetBulb(); });
  $$('#frSeg button').forEach((b) => b.addEventListener('click', () => { if (S.cs.co.st === 'run') return; Sound.click(); S.cs.co.fric = b.dataset.v === '1'; resetCoaster(); }));
  $('#bGo').addEventListener('click', startCoaster);
  $('#bBack').addEventListener('click', () => { Sound.click(); parts.clear(); resetCoaster(); });

  /* ================= ③ 에너지 효율 ================= */
  const dvChips = $('#dvChips');
  EFFD.forEach((d, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = d.icon + ' ' + d.name;
    b.addEventListener('click', () => { Sound.click(); S.ef.sel = i; parts.clear(); updateCtl(); });
    dvChips.appendChild(b);
  });
  const efUse = () => EFFD[S.ef.sel].eta * S.ef.inp / 100;       // 유용한 에너지 (J)
  function checkCalc() {
    const e = S.ef, d = EFFD[e.sel];
    if (e.done[d.id]) { showHint('이 장치는 이미 계산했어요. 다른 장치를 골라 보세요.', 3200); return; }
    if (e.guess === d.eta) {
      e.done[d.id] = true; e.ring = 1; Sound.success(); parts.burst(VW * 0.7, 120, { count: 20, speed: 170, size: 3.4, colors: ['#f5b800', '#f2873a', '#14a058', '#3867f4'], gravity: 160 }); updateCtl();
    } else {
      e.wrong++; Sound.fail();
      showHint('효율 = 유용한 에너지 ÷ 공급한 에너지 × 100이에요. ' + efUse() + ' ÷ ' + e.inp + ' × 100을 계산해 보세요.', 5200);
    }
  }
  $('#bCalc').addEventListener('click', () => { Sound.click(); checkCalc(); });
  $('#sIn').addEventListener('input', (e) => { S.ef.inp = +e.target.value; Sound.tick(); updateCtl(); });
  $('#sGuess').addEventListener('input', (e) => { S.ef.guess = +e.target.value; Sound.tick(); updateCtl(); });
  // 정렬 목록
  const sortList = $('#sortList'); let sortKey = '';
  function renderSort() {
    const key = S.ef.order.join(',');
    if (key === sortKey) return; sortKey = key;
    sortList.innerHTML = '';
    S.ef.order.forEach((id, i) => {
      const d = EFFD.find((x) => x.id === id);
      const row = document.createElement('div'); row.className = 'btn-row'; row.style.alignItems = 'center';
      row.innerHTML = '<div style="flex:1;font-weight:800;font-size:14.5px;line-height:1.2">' + (i + 1) + '. ' + d.icon + ' ' + d.name + '</div>';
      const up = document.createElement('button'); up.type = 'button'; up.className = 'nudge'; up.textContent = '▲'; up.setAttribute('aria-label', d.name + ' 위로'); up.disabled = i === 0;
      const dn = document.createElement('button'); dn.type = 'button'; dn.className = 'nudge'; dn.textContent = '▼'; dn.setAttribute('aria-label', d.name + ' 아래로'); dn.disabled = i === S.ef.order.length - 1;
      up.addEventListener('click', () => { Sound.click(); swap(i, i - 1); }); dn.addEventListener('click', () => { Sound.click(); swap(i, i + 1); });
      up.style.flex = dn.style.flex = 'none';
      row.appendChild(up); row.appendChild(dn); sortList.appendChild(row);
    });
  }
  function swap(a, b) { const o = S.ef.order; const t = o[a]; o[a] = o[b]; o[b] = t; renderSort(); }
  function drawEffScene(dt) {
    const e = S.ef, d = EFFD[e.sel], I = e.inp, Uu = efUse(), W = I - Uu, done = !!e.done[d.id];
    T(14, PHONE ? 24 : 30, '📊 ' + d.icon + ' ' + d.name + '의 에너지 효율', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 44 : 52, '들어가는 ' + d.inn + ' → 쓰려는 ' + d.use, PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    const bx = 24, bw = PHONE ? VW - 48 : 520, y1 = PHONE ? 84 : 92, bh = PHONE ? 34 : 40, y2 = y1 + bh + (PHONE ? 62 : 70);
    T(bx, y1 - 10, '공급한 에너지 ' + I + ' J', PHONE ? 13 : 15, '#1d4ed8', 'left', 800);
    D.roundRect(bx, y1, bw, bh, 9); ctx.fillStyle = COL_IN; ctx.fill();
    T(bx + bw / 2, y1 + bh / 2 + 5, I + ' J', 15, '#fff', 'center', 800);
    // 장치 → 화살표
    const am = (y1 + bh + y2) / 2;
    D.arrow(bx + bw / 2, y1 + bh + 6, bx + bw / 2, y2 - 6, { color: '#8b95a8', width: 4, head: 12 });
    D.label(bx + bw / 2 + (PHONE ? 70 : 90), am, d.icon + ' ' + d.name, { bg: '#394258', size: PHONE ? 12 : 13.5 });
    const uw = bw * Uu / I, ww = bw * W / I;
    T(bx, y2 - 10, '나온 에너지 (막대 전체 = 공급한 에너지)', PHONE ? 12 : 13.5, '#5a6679', 'left', 800);
    D.roundRect(bx, y2, bw, bh, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, y2, bw, bh, 9); ctx.clip();
    ctx.fillStyle = COL_USE; ctx.fillRect(bx, y2, uw, bh); ctx.fillStyle = COL_HEAT; ctx.fillRect(bx + uw, y2, ww, bh); ctx.restore();
    if (uw > 38) T(bx + uw / 2, y2 + bh / 2 + 5, Uu + ' J', 14, '#3b2a00', 'center', 800);
    if (ww > 38) T(bx + uw + ww / 2, y2 + bh / 2 + 5, W + ' J', 14, '#fff', 'center', 800);
    ctx.fillStyle = COL_USE; ctx.fillRect(bx, y2 + bh + 12, 12, 12); T(bx + 18, y2 + bh + 23, '유용한 에너지 ' + Uu + ' J', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    ctx.fillStyle = COL_HEAT; ctx.fillRect(bx + (PHONE ? 190 : 230), y2 + bh + 12, 12, 12); T(bx + (PHONE ? 208 : 248), y2 + bh + 23, '버려지는 열 ' + W + ' J', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    // 오른쪽: 장치 + 낭비 연출
    if (!PHONE) {
      const cx = 690, cy = 150;
      D.shadow(() => { D.roundRect(cx - 70, cy - 70, 140, 140, 18); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
      T(cx, cy + 20, d.icon, 62, '#000', 'center', 700);
      if (d.id === 'coal') {      // 냉각탑과 온배수
        ctx.fillStyle = '#c9d0de'; ctx.beginPath(); ctx.moveTo(cx + 40, cy + 70); ctx.quadraticCurveTo(cx + 22, cy + 30, cx + 34, cy - 20); ctx.lineTo(cx + 62, cy - 20); ctx.quadraticCurveTo(cx + 74, cy + 30, cx + 78, cy + 70); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 3; i++) { const q = ((S.t * 0.35 + i / 3) % 1); ctx.globalAlpha = 0.6 * (1 - q); D.sphere(cx + 48 + Math.sin(S.t + i) * 5, cy - 24 - q * 50, 10 + q * 10, '#f4f7fb', { gloss: false }); } ctx.globalAlpha = 1;
        T(cx + 60, cy + 90, '냉각탑 · 온배수', 12, '#c2410c', 'center', 800);
      }
      const waste = clamp(W / I, 0, 1);
      if (!RM) for (let i = 0; i < 3; i++) { const q = ((S.t * 0.5 + i / 3) % 1); ctx.globalAlpha = Math.sin(q * Math.PI) * waste; D.wave(cx - 30, cx + 10, cy - 78 - q * 30, { amp: 3, wavelength: 18, color: '#f2873a', width: 3, phase: S.t * 4 + i * 2 }); } ctx.globalAlpha = 1;
    }
    if (e.ring > 0.01) { const r = PHONE ? 60 : 80; D.ring(PHONE ? VW - 70 : 520, y2 + bh / 2, 24, S.t, { color: '#14a058' }); e.ring = RM ? 0 : SciSim.approach(e.ring, 0, dt, 0.8); }
    if (done) D.label(PHONE ? VW - 66 : bx + bw + 76, y2 + bh / 2, '효율 ' + d.eta + ' % ✅', { bg: '#14a058', size: 13.5 });
    drawEffTable();
    parts.update(dt); parts.draw(ctx);
  }
  function drawEffTable() {
    const y = ROW_Y, h = VH - y - 10, e = S.ef;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 22, '장치별 에너지 효율 (유용한 에너지 ÷ 공급한 에너지)', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    const rh = Math.min(44, (h - 40) / 5), x0 = 26, nameW = PHONE ? 118 : 160, bx = x0 + nameW, bw = VW - 52 - nameW - (PHONE ? 54 : 70);
    EFFD.forEach((d, i) => {
      const yy = y + 36 + i * rh, dn = !!e.done[d.id];
      if (i === e.sel) { D.roundRect(18, yy, VW - 36, rh - 3, 8); ctx.fillStyle = 'rgba(242,107,58,.10)'; ctx.fill(); }
      T(x0, yy + rh / 2 + 4, d.icon + ' ' + d.name, PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      D.roundRect(bx, yy + rh / 2 - 8, bw, 16, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (dn) { D.roundRect(bx, yy + rh / 2 - 8, Math.max(0.01, bw * d.eta / 100), 16, 6); ctx.fillStyle = COL_USE; ctx.fill(); T(bx + bw + 8, yy + rh / 2 + 5, d.eta + ' %', 14, '#26324a', 'left', 800); }
      else T(bx + bw + 8, yy + rh / 2 + 5, '?', 14, '#98a2b3', 'left', 800);
    });
  }

  /* ================= ④ 낭비 줄이기 ================= */
  function stepSave(dt) {
    const sv = S.sv, probs = [ETA_PLANT / 100, ETA_TRANS / 100, sv.lamp / 100];
    sv.acc += dt * 12;
    while (sv.acc >= 1) { sv.acc -= 1; let fate = 3; for (let i = 0; i < 3; i++) if (Math.random() > probs[i]) { fate = i; break; } sv.parts.push({ q: 0, fate, lost: false, drift: 0 }); }
    for (let i = sv.parts.length - 1; i >= 0; i--) {
      const p = sv.parts[i];
      if (p.lost) { p.drift += dt; if (p.drift > 1.2) sv.parts.splice(i, 1); continue; }
      p.q += dt / 5.2;
      if (p.fate < 3 && p.q >= (p.fate + 1) / 3) { p.q = (p.fate + 1) / 3; p.lost = true; }
      else if (p.q >= 1) sv.parts.splice(i, 1);
    }
  }
  const chainGeom = () => (PHONE
    ? { xs: [66, 188, 310, 420], w: 84, iconY: 78, lane: 134, base: TY - 8, maxH: 104 }
    : { xs: [110, 300, 490, 680], w: 130, iconY: 84, lane: 136, base: TY - 8, maxH: 90 });
  function drawSaveScene(dt) {
    const sv = S.sv, g = chainGeom(), vals = chainVals(sv.lamp);
    T(14, PHONE ? 24 : 30, '♻️ 연료 에너지 100 J가 전구의 빛이 되기까지', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const names = [['🛢️', '연료 에너지'], ['🏭', '발전소'], ['🔌', '송전'], [sv.lamp === 5 ? '💡' : '🔆', sv.lamp === 5 ? '백열전구' : 'LED 전구']];
    const etas = ['', ETA_PLANT, ETA_TRANS, sv.lamp];
    // 바닥
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(0, g.base + 6, VW, SH - g.base - 6);
    names.forEach((n, i) => {
      const x = g.xs[i];
      D.shadow(() => { D.roundRect(x - g.w / 2, g.iconY - 42, g.w, 82, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      T(x, g.iconY - 12, n[0], PHONE ? 24 : 28, '#000', 'center', 700);
      T(x, g.iconY + 12, n[1], PHONE ? 12 : 13.5, '#26324a', 'center', 800);
      if (i > 0) T(x, g.iconY + 30, '효율 ' + etas[i] + ' %', PHONE ? 12 : 13.5, '#c2410c', 'center', 800);
      // 막대 (에너지 크기에 비례)
      const hh = g.maxH * vals[i] / 100, bw = PHONE ? 38 : 56;
      D.roundRect(x - bw / 2, g.base - g.maxH, bw, g.maxH, 6); ctx.fillStyle = 'rgba(120,135,160,.10)'; ctx.fill();
      ctx.fillStyle = i === 3 ? COL_USE : COL_IN; ctx.fillRect(x - bw / 2, g.base - hh, bw, hh);
      T(x, g.base - g.maxH - 6, r1(vals[i]).toFixed(1) + ' J', PHONE ? 13 : 15, '#26324a', 'center', 800);
      if (i < 3) D.arrow(x + g.w / 2 + 2, g.iconY, g.xs[i + 1] - g.w / 2 - 2, g.iconY, { color: '#aab4c6', width: 3.5, head: 10 });
    });
    // 입자: 사슬을 따라 줄어듦
    sv.parts.forEach((p) => {
      const xa = g.xs[0], xb = g.xs[3], x = xa + (xb - xa) * p.q, y = g.lane;
      ctx.globalAlpha = p.lost ? Math.max(0, 1 - p.drift / 1.2) : 1;
      D.sphere(x, y - (p.lost ? p.drift * 26 : 0), 3.6, p.lost ? COL_HEAT : (p.q > 0.97 ? COL_USE : COL_IN), { gloss: false });
      ctx.globalAlpha = 1;
    });
    drawSaveData(vals);
    parts.update(dt); parts.draw(ctx);
  }
  function drawSaveData(vals) {
    const sv = S.sv, y = ROW_Y, h = VH - y - 10;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 22, '발전소 → 송전 → 전구: 연료 100 J 중 빛이 되는 에너지', 13.5, '#26324a', 'left', 800);
    [5, 30].forEach((lp, i) => {
      const v = chainVals(lp), yy = y + 36 + i * (PHONE ? 76 : 62), cur = sv.lamp === lp, tot = v[3];
      if (cur) { D.roundRect(18, yy - 4, VW - 36, PHONE ? 70 : 56, 10); ctx.fillStyle = 'rgba(242,107,58,.10)'; ctx.fill(); }
      T(26, yy + 16, (lp === 5 ? '💡 백열전구' : '🔆 LED 전구'), 14, '#26324a', 'left', 800);
      T(PHONE ? 26 : 150, PHONE ? yy + 36 : yy + 16, ETA_PLANT + ' % × ' + ETA_TRANS + ' % × ' + lp + ' % = ' + r1(tot).toFixed(1) + ' %', PHONE ? 13 : 14.5, '#c2410c', 'left', 800);
      const bx = PHONE ? 26 : 26, by = PHONE ? yy + 44 : yy + 28, bw = VW - 52;
      D.roundRect(bx, by, bw, 14, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      D.roundRect(bx, by, Math.max(0.01, bw * tot / 100), 14, 6); ctx.fillStyle = COL_USE; ctx.fill();
    });
    const yy = y + 36 + 2 * (PHONE ? 76 : 62) + 2;
    const ratio = chainVals(5)[3] / chainVals(30)[3];
    const hh = textBlock(26, yy + 14, VW - 52, 'LED는 같은 빛을 내는 데 연료 에너지가 백열전구의 약 1/' + Math.round(1 / ratio) + '만 있으면 돼요. (막대 길이는 100 J에 대한 비율이에요)', PHONE ? 12 : 13.5, '#26324a', 17, 800);
    textBlock(26, yy + 14 + hh + 4, VW - 52, '위 그림의 점 하나는 에너지 한 덩어리예요. 단계를 거치며 남지 못한 덩어리는 열이 돼요.', PHONE ? 12 : 13, '#5a6679', 17, 700);
  }
  $$('#lpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sv.lamp = +b.dataset.v; S.sv.parts.length = 0; updateCtl(); }));
  const solChips = $('#solChips');
  SOLS.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = s.id;
    b.innerHTML = '<span></span>' + s.icon + ' ' + s.name + ' · 절약 ' + s.save + ' %';
    b.addEventListener('click', () => {
      const i = S.sv.sol.indexOf(s.id); Sound.click();
      if (i >= 0) S.sv.sol.splice(i, 1); else if (S.sv.sol.length >= 3) { showHint('3개만 고를 수 있어요. 고른 카드를 눌러 빼고 다시 골라 보세요.', 3600); Sound.fail(); return; } else S.sv.sol.push(s.id);
      updateCtl();
    });
    solChips.appendChild(b);
  });
  $('#bSolClear').addEventListener('click', () => { Sound.click(); S.sv.sol = []; updateCtl(); });
  const actChips = $('#actChips');
  ACTS.forEach((a) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = a.id; b.textContent = a.icon + ' ' + a.name;
    b.addEventListener('click', () => { Sound.click(); S.sv.act[a.id] = !S.sv.act[a.id]; updateCtl(); });
    actChips.appendChild(b);
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'conv') {
      const cv = S.cv, d = DEV6[cv.sel];
      L1 = '장치'; a = d.name; L2 = '들어가는 에너지'; b = cv.inn ? FM[cv.inn].name : '—'; L3 = '나오는 에너지'; c = cv.outs.length ? cv.outs.map((o) => FM[o].name).join(' + ') : '—';
    } else if (S.mode === 'cons') {
      if (S.cs.sub === 'bulb') { const k = bulbCounts(); L1 = '공급'; a = '100 J'; L2 = '빛'; b = k.light + ' J'; L3 = '열'; c = k.heat + ' J'; }
      else { const en = coEn(); L1 = '위치 에너지'; a = en.ep.toFixed(1) + ' J'; L2 = '운동 에너지'; b = en.ek.toFixed(1) + ' J'; L3 = '열'; c = en.q.toFixed(1) + ' J'; }
    } else if (S.mode === 'eff') {
      const e = S.ef, d = EFFD[e.sel];
      L1 = '공급한 에너지'; a = e.inp + ' J'; L2 = '유용한 에너지'; b = efUse() + ' J'; L3 = '버려지는 열'; c = (e.inp - efUse()) + ' J';
    } else {
      const v = chainVals(S.sv.lamp);
      L1 = '연료 에너지'; a = '100.0 J'; L2 = '집에 도착'; b = r1(v[2]).toFixed(1) + ' J'; L3 = '빛이 된 에너지'; c = r1(v[3]).toFixed(1) + ' J';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const nDone6 = () => S.cv.done.filter(Boolean).length;
  const effDoneN = () => EFFD.filter((d) => S.ef.done[d.id]).length;
  const levels = [
    {
      title: '에너지 전환: 장치 속에서 일어나는 일', short: '에너지 전환', icon: '⚡', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전구는 빛을 내려고 켜는데, 왜 만지면 뜨거울까? 에너지는 어디로 갔을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 에너지는 운동 · 위치 · 열 · 전기 · 빛 등 여러 형태로 존재하고, 서로 다른 형태로 <b>전환</b>될 수 있다고 배웠어요. 마찰이 있으면 역학적 에너지의 일부가 <b>열</b>로 바뀐다는 것도 알았죠.</div>' +
        '<p>여섯 가지 장치가 일할 때 <b>들어가는 에너지</b>와 <b>나오는 에너지</b>가 무엇인지 찾아 연결해요. 온도계도 함께 관찰해요.</p>',
      features: ['conv'],
      setup() { S.cv = { sel: 0, inn: null, outs: [], done: [false, false, false, false, false, false], shake: 0 }; S.part = ''; setScene('conv'); },
      recap: '모든 장치에서 우리가 쓰려는 에너지와 함께 열에너지가 나와요. 에너지는 한 형태에서 다른 형태로 전환되고, 그 과정에서 열이 생겨요.',
      summary: '<ul><li>백열전구: 전기 → <b>빛 + 열</b> · 선풍기: 전기 → <b>운동 + 열</b> · 스피커: 전기 → <b>소리 + 열</b></li><li>태양 전지: 빛 → <b>전기 + 열</b> · 건전지: 화학 → <b>전기 + 열</b> · 자동차 엔진: 화학 → <b>운동 + 열</b></li><li>모든 장치에서 쓰려는 에너지와 함께 <b>열에너지</b>가 나와요.</li><li>에너지는 여러 형태로 존재하고 서로 <b>전환</b>돼요.</li></ul>',
      missions: [
        {
          title: '장치 여섯 개 연결하기',
          goal: '장치 카드를 눌러 고른 뒤, <b>들어가는 에너지 1가지</b>와 <b>나오는 에너지 2가지</b>를 골라 <b>✔ 이 장치 확인</b>을 눌러요. 여섯 장치를 모두 연결해요.',
          hint: '장치가 일하는 모습과 온도계를 관찰해요. 건전지와 엔진은 에너지의 종류가 화학 에너지로 들어가고, 선풍기·스피커·전구는 전기가 들어가요. 쓰려는 에너지 외에 하나가 더 나와요.',
          setup() { S.part = ''; setScene('conv'); selectDevice(S.cv.sel); },
          check: () => nDone6() === 6,
          hold: 0.5,
          status: () => DEV6.map((d, i) => mark(S.cv.done[i]) + d.icon).join(' &nbsp; ') + ' (' + nDone6() + ' / 6)',
          explain: '여섯 장치 모두 <b>쓰려는 에너지(빛·운동·소리·전기)</b>와 함께 <b>열에너지</b>가 나와요. 전구를 만지면 뜨겁고, 스피커와 모터도 따뜻해지고, 엔진은 매우 뜨거워지는 것이 그 증거예요.',
        },
        {
          type: 'quiz', title: '모든 장치의 공통점',
          goal: '여섯 장치에서 <b>모두 공통으로 나온</b> 에너지는?',
          setup() { S.part = ''; setScene('conv'); },
          choices: ['빛에너지', '소리 에너지', '열에너지', '화학 에너지'],
          answer: 2,
          feedback: ['빛은 전구와 태양 전지 쪽에서만 나왔어요.', '소리는 스피커에서만 나왔어요.', '', '화학 에너지는 건전지와 엔진의 입력이었어요.'],
          explain: '모든 장치에서 <b>열에너지</b>가 함께 나와요. 그래서 전구를 켜 두면 뜨거워지는 거예요. 에너지가 사라진 것이 아니라 <b>열로도 바뀐 것</b>이에요.',
        },
      ],
    },
    {
      title: '에너지 보존: 입력과 출력의 합', short: '에너지 보존', icon: '⚖️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모든 장치에서 열이 함께 나온다는 것을 알았어요. 그렇다면 들어간 에너지와 나온 에너지의 <b>양</b>은 서로 어떤 관계일까요?</div>' +
        '<p>전구에 전기 에너지 <b>100 J</b>을 공급하고, 롤러코스터 공이 굴러가는 동안 에너지가 어떻게 나뉘는지 <b>합</b>을 확인해요.</p>',
      features: ['cons'],
      setup() { resetBulb(); resetCoaster(); S.cs.sub = 'bulb'; S.cs.co.fric = false; S.cs.co.ranFric = false; S.cs.co.restDone = false; S.cs.bulbSeen = false; S.cs.fricDone = false; S.part = ''; setScene('cons'); },
      recap: '에너지는 전환되어도 총량이 보존돼요. 열로 바뀐 에너지도 사라지지 않지만 흩어져서 다시 쓰기 어려워요.',
      summary: '<ul><li>백열전구: 전기 <b>100 J</b> = 빛 <b>5 J</b> + 열 <b>95 J</b> → 입력 = 출력의 합</li><li>롤러코스터 공: 위치 에너지 + 운동 에너지 + 열 = 처음 에너지 <b>100 J</b>(항상 일정)</li><li>마찰이 없으면 역학적 에너지(위치 + 운동)가 보존되고, 마찰이 있으면 일부가 열로 바뀌어요.</li><li>에너지 총량은 보존되지만, 열로 흩어진 에너지는 <b>다시 쓰기 어려워요</b>.</li></ul>',
      missions: [
        {
          title: '두 장면에서 합 확인하기',
          goal: '<b>백열전구</b>에 전기 100 J을 공급해 끝까지 지켜보고, <b>롤러코스터</b>에서는 <b>마찰이 있는</b> 공이 멈출 때까지 지켜보며 에너지의 합을 확인하세요.',
          hint: '실험 고르기에서 백열전구와 롤러코스터를 바꿔요. 롤러코스터는 마찰 있음으로 바꾸고 ▶ 공 출발을 눌러요. 잠시 기다리면 공이 멈춰요.',
          setup() { S.part = ''; setScene('cons'); updateCtl(); },
          check: () => S.cs.bulbSeen && S.cs.fricDone,
          hold: 0.6,
          status: () => mark(S.cs.bulbSeen) + ' 백열전구 100 J &nbsp; ' + mark(S.cs.fricDone) + ' 마찰 있는 공이 멈춤',
          explain: '백열전구에서는 전기 <b>100 J = 빛 5 J + 열 95 J</b>이에요. 공은 위치 · 운동 에너지가 줄어드는 만큼 열이 늘어서, 세 에너지의 합이 <b>언제나 100 J</b>이고, 공이 멈추면 처음 에너지가 거의 모두 열이 돼요.',
        },
        {
          type: 'quiz', title: '열로 바뀐 에너지는 사라졌을까?',
          goal: '롤러코스터 공이 멈췄어요. 공의 위치 · 운동 에너지가 줄어든 만큼 <b>열</b>이 생겼어요. 이 열에너지에 대한 설명으로 옳은 것은?',
          setup() { S.part = ''; setScene('cons'); updateCtl(); },
          choices: ['에너지가 사라졌어요', '에너지는 보존되지만 주변으로 흩어져 다시 쓰기 어려워요', '열은 에너지가 아니에요', '열이 된 에너지는 곧바로 모두 다시 운동 에너지가 돼요'],
          answer: 1,
          feedback: ['합이 계속 100 J이었어요. 에너지는 사라지지 않아요.', '', '열도 에너지의 한 형태예요.', '흩어진 열이 저절로 모두 운동 에너지로 돌아오지는 않아요.'],
          explain: '열로 바뀐 에너지도 <b>없어지지 않고 총량이 보존</b>돼요. 하지만 주변으로 흩어져서 <b>다시 쓰기 어려워요</b>. 그래서 에너지를 쓸 때는 낭비되는 열을 줄이는 것이 중요해요.',
        },
      ],
    },
    {
      title: '에너지 효율: 얼마나 알뜰하게 쓸까?', short: '에너지 효율', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에너지가 전환될 때 일부는 열로 흩어진다는 것을 확인했어요. 그중 <b>쓸모 있는 에너지의 비율</b>을 <b>에너지 효율</b>이라고 해요.</div>' +
        '<p><b>효율(%) = 유용하게 쓰인 에너지 ÷ 공급한 에너지 × 100</b>. 장치 다섯 개에 에너지를 공급해 보고, 유용한 에너지와 버려지는 열을 읽어 효율을 직접 계산해요.</p>',
      features: ['eff'],
      setup() { S.ef = { sel: 0, inp: 200, guess: 50, done: {}, wrong: 0, order: ['led', 'bulb', 'engine', 'motor', 'coal'], ring: 0 }; sortKey = ''; S.part = 'calc'; setScene('eff'); },
      recap: '효율은 공급한 에너지 중 유용한 에너지의 비율이에요. 효율이 낮을수록 더 많은 에너지가 열로 버려져요.',
      summary: '<ul><li><b>에너지 효율(%) = 유용하게 쓰인 에너지 ÷ 공급한 에너지 × 100</b></li><li>예) 입력 200 J, 유용한 에너지 50 J → 효율 <b>25 %</b>, 버려지는 열 150 J</li><li>전기 모터 약 <b>90 %</b> &gt; 석탄 화력 발전 약 <b>40 %</b> &gt; LED 약 <b>30 %</b> &gt; 자동차 엔진 약 <b>25 %</b> &gt; 백열전구 약 <b>5 %</b></li><li>화력 발전소에서는 냉각탑과 온배수로 많은 열이 버려져요.</li></ul>',
      missions: [
        {
          title: '장치 다섯 개의 효율 계산하기',
          goal: '장치를 골라 공급한 에너지와 <b>유용한 에너지</b>를 읽고, <b>내가 계산한 효율</b>을 맞춘 뒤 <b>✔ 맞는지 확인</b>을 눌러요. 다섯 장치 모두 계산해요.',
          hint: '효율(%) = 유용한 에너지 ÷ 공급한 에너지 × 100이에요. 그림의 노란 막대가 유용한 에너지예요. 효율 슬라이더는 5 %씩 움직여요.',
          setup() { S.part = 'calc'; setScene('eff'); updateCtl(); },
          check: () => effDoneN() === 5,
          hold: 0.5,
          status: () => EFFD.map((d) => mark(S.ef.done[d.id]) + d.icon).join(' &nbsp; ') + ' (' + effDoneN() + ' / 5)',
          explain: '효율은 <b>유용한 에너지 ÷ 공급한 에너지 × 100</b>이에요. 공급한 에너지가 달라져도 비율(효율)은 같아요. 예) 자동차 엔진은 200 J을 공급하면 유용한 에너지 50 J, 즉 <b>25 %</b>이고 나머지는 열로 버려져요.',
        },
        {
          title: '효율이 큰 순서로 정렬하기', manual: true,
          goal: '다섯 장치를 <b>효율이 큰 순서</b>(위가 가장 커요)로 ▲▼ 버튼으로 정렬하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아래 표에서 계산한 효율을 비교해 보세요. 백열전구가 가장 낮고 전기 모터가 가장 높아요.',
          setup() { S.part = 'sort'; sortKey = ''; setScene('eff'); updateCtl(); },
          check() {
            const o = S.ef.order;
            if (o.join() === EFF_ORDER.join()) return true;
            const wrong = o.filter((id, i) => id !== EFF_ORDER[i]).length;
            return '순서가 맞지 않아요 (맞지 않는 자리 ' + wrong + '곳). 표의 효율 값을 큰 것부터 차례로 놓아 보세요.';
          },
          status: () => '정렬 중...',
          explain: '효율이 큰 순서는 <b>전기 모터 90 % → 석탄 화력 40 % → LED 30 % → 자동차 엔진 25 % → 백열전구 5 %</b>예요. 열이 목적이 아닌 장치에서는 효율이 낮을수록 낭비되는 열이 많아요.',
        },
        {
          type: 'quiz', title: '효율 계산',
          goal: '어떤 장치에 에너지 <b>200 J</b>을 공급했더니 유용한 에너지가 <b>50 J</b>이었어요. 이 장치의 효율과 나머지 에너지는?',
          setup() { S.part = 'calc'; setScene('eff'); updateCtl(); },
          choices: ['효율 25 %, 나머지 150 J은 열 등으로 버려져요', '효율 50 %, 나머지 150 J은 사라져요', '효율 75 %, 나머지 50 J은 열이 돼요', '효율 150 %, 에너지가 늘어났어요'],
          answer: 0,
          feedback: ['', '효율은 50 ÷ 200 × 100 = 25 %예요. 나머지 에너지는 사라지지 않아요.', '75 %는 150 ÷ 200이에요. 유용한 에너지(50 J)를 기준으로 계산해요.', '에너지가 늘어날 수는 없어요. 효율은 100 %를 넘지 않아요.'],
          explain: '효율 = 50 J ÷ 200 J × 100 = <b>25 %</b>예요. 나머지 <b>150 J</b>은 열 등으로 버려져요. 화력 발전소에서는 이렇게 버려지는 열이 냉각탑과 온배수로 나가요.',
        },
      ],
    },
    {
      title: '낭비 줄이기: 사슬 효율 높이기', short: '낭비 줄이기', icon: '♻️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 장치마다 효율이 다르고 버려지는 열이 많다는 것을 알았어요. 우리가 쓰는 전기는 <b>발전소 → 송전 → 전구</b>를 거치므로 효율을 <b>곱해야</b> 해요.</div>' +
        '<p>연료 에너지 100 J가 전구의 빛이 되기까지 얼마나 줄어드는지 보고, 낭비를 줄이는 방법을 골라요. 열병합 발전은 버려지던 열을 난방에 써서 종합 효율을 약 80 %까지 높여요.</p>',
      features: ['save'],
      setup() { S.sv.lamp = 5; S.sv.sol = []; S.sv.act = {}; S.sv.parts.length = 0; S.part = 'sol'; setScene('save'); },
      recap: '여러 단계를 거칠 때 전체 효율은 각 단계 효율의 곱이에요. 효율이 낮은 단계를 개선하면 낭비를 가장 크게 줄일 수 있어요.',
      summary: '<ul><li>전체 효율 = 각 단계 효율의 <b>곱</b></li><li>백열전구: 40 % × 95 % × 5 % = <b>1.9 %</b> · LED: 40 % × 95 % × 30 % = <b>11.4 %</b></li><li>LED는 같은 빛을 내는 데 연료 에너지가 백열전구의 약 <b>1/6</b>이면 돼요.</li><li>낭비를 줄이는 방법: LED 교체, 단열 개선, 대기전력 차단, 열병합 발전, 효율 등급이 높은 제품 고르기</li></ul>',
      missions: [
        {
          title: '낭비를 가장 크게 줄이는 방법 고르기', manual: true,
          goal: '아래 카드 중 <b>절약 효과가 큰 순서</b>대로 <b>3개</b>를 차례로 눌러 고르고 <b>✔ 확인하기</b>를 누르세요. 먼저 눌러 보며 백열전구 ↔ LED 막대를 비교해 보세요.',
          hint: '카드의 절약 효과(%)를 비교해요. LED 교체는 1 − 5/30, 열병합 발전은 1 − 40/80을 계산한 값이에요. 가장 효과가 큰 것부터 눌러요.',
          setup() { S.part = 'sol'; S.sv.sol = []; setScene('save'); updateCtl(); },
          check() {
            const s = S.sv.sol;
            if (s.length < 3) return '3개를 차례로 골라 주세요. (지금 ' + s.length + '개)';
            if (s.join() === SOL_ANS.join()) return true;
            return '순서가 맞지 않아요. 절약 효과가 큰 것부터 차례로 눌러 보세요.';
          },
          status: () => '고른 카드 ' + S.sv.sol.length + ' / 3',
          explain: '절약 효과는 <b>LED 교체 ' + LED_SAVE + ' %</b>(1 − 5/30), <b>열병합 발전 ' + CHP_SAVE + ' %</b>(1 − 40/80), <b>효율 등급 제품 30 %</b>, 단열 개선 25 %, 대기전력 차단 10 % 순이에요(마지막 세 값은 예시). 효율이 가장 낮은 단계를 고치면 효과가 가장 커요.',
        },
        {
          title: '내가 할 수 있는 일 정하기', manual: true,
          goal: '에너지 낭비를 줄이기 위해 <b>내가 실천할 수 있는 일</b>을 <b>2가지 이상</b> 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '집이나 학교에서 바로 할 수 있는 일을 골라 보세요.',
          setup() { S.part = 'act'; setScene('save'); updateCtl(); },
          check() {
            const n = ACTS.filter((a) => S.sv.act[a.id]).length;
            return n >= 2 ? true : '2가지 이상 골라 주세요. (지금 ' + n + '개)';
          },
          status: () => '고른 일 ' + ACTS.filter((a) => S.sv.act[a.id]).length + '개',
          explain: '에너지를 아껴 쓰면 연료를 덜 태워서 <b>이산화 탄소 배출도 줄어요</b>. 작은 실천이 환경 문제를 푸는 첫걸음이에요. 다음 차시에서는 신재생 에너지로 에너지 문제를 풀어 봐요.',
        },
        {
          type: 'quiz', title: '전체 효율 구하기',
          goal: '발전소 효율 <b>40 %</b>, 송전 효율 <b>95 %</b>, <b>LED 전구 효율 30 %</b>일 때, 연료 에너지 중 빛이 되는 비율은?',
          setup() { S.part = 'sol'; setScene('save'); updateCtl(); },
          choices: ['40 % + 95 % + 30 % = 165 %', '40 % × 95 % × 30 % = 11.4 %', '30 %', '95 %'],
          answer: 1,
          feedback: ['효율을 더하면 100 %를 넘어요. 단계마다 줄어든 양에 다시 효율을 곱해야 해요.', '', '전구 효율만 본 거예요. 앞 단계(발전소, 송전)에서도 줄어들어요.', '송전 효율만 본 거예요. 모든 단계를 곱해야 해요.'],
          explain: '단계마다 에너지가 줄어서 전체 효율은 <b>곱</b>이에요. 0.40 × 0.95 × 0.30 = <b>0.114</b> → <b>11.4 %</b>. 같은 방식으로 백열전구는 0.40 × 0.95 × 0.05 = <b>1.9 %</b>예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-energy-efficiency', mount: '#game', badge: '에너지 절약왕', homeHref: '../../index.html#h1b',
    featureLabels: { conv: '⚡ 장치 6개의 에너지 전환 연결', cons: '⚖️ 백열전구 100 J · 롤러코스터 공 에너지 합', eff: '📊 장치별 효율 계산 · 순서 정렬', save: '♻️ 발전소 → 송전 → 전구 사슬 효율' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetBulb(); resetCoaster(); selectDevice(0); S.part = '';
  setScene('conv'); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    bg();
    if (S.mode === 'conv') drawConvScene(dt);
    else if (S.mode === 'cons') { if (S.cs.sub === 'bulb') { stepBulb(dt); drawBulbScene(dt); } else { stepCoaster(dt); drawCoasterScene(dt); } }
    else if (S.mode === 'eff') drawEffScene(dt);
    else { stepSave(dt); drawSaveScene(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, selectDevice, confirmDevice, devCard, DEV6, EFFD, SOLS, SOL_ANS, EFF_ORDER, bulbCounts, startBulb, startCoaster, coEn, checkCalc, efUse, chainVals, swap, resetCoaster, resetBulb, ACTS,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepBulb(0.02); stepCoaster(0.02); stepSave(0.02); } },
  };
})();
