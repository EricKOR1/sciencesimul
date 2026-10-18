/* =========================================================
   물리학 Ⅱ. 전기와 자기 - 자성체의 종류와 활용 (단원 5차시)
   성취기준 [12물리02-04] 자성체의 종류를 알고 일상생활과 산업 기술에서 자성체가 활용되는 예를 찾을 수 있다.
   ① 관찰: 자석 반응 (전자석 앞에 시료 10개를 매달아 보기)
   ② 모형: 원자 자석과 자기 도메인 (강 · 상 · 반자성체)
   ③ 분석: 정밀 저울 분류 · 자화 유지(연질/경질) · 퀴리 온도
   ④ 적용: 활용 짝짓기 · 하드디스크 기록
   히스테리시스 곡선의 정량 분석, 자기 모멘트 계산, 퀴리-바이스 법칙, 교환 상호작용은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 560 : 560;
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
  const sgn = (v) => (v >= 0 ? '+' : '−');
  const pct = (M) => { const r = Math.round(M * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + ' %'; };
  const fmtMg = (v) => sgn(v) + (Math.abs(v) >= 10 ? String(Math.abs(v)) : Math.abs(v).toFixed(1)) + ' mg';

  /* ---------- 자료 (화면의 숫자와 모두 같은 값) ---------- */
  const KIND = { fer: '강자성체', par: '상자성체', dia: '반자성체' };
  const KCOL = { fer: '#e2464b', par: '#f2873a', dia: '#2f6df6' };
  // mg: 정밀 저울 측정값 (mg, + 끌림, − 밀림). 종이 클립·유리·나무는 ①에서만 쓰는 예시 값
  const SAMPLES = {
    nail:   { id: 'nail',   name: '철 못',        kind: 'fer', mg: 2500 },
    nickel: { id: 'nickel', name: '니켈 동전',     kind: 'fer', mg: 900 },
    clip:   { id: 'clip',   name: '종이 클립',     kind: 'fer', mg: 1800 },
    foil:   { id: 'foil',   name: '알루미늄 호일', kind: 'par', mg: 0.8 },
    mg:     { id: 'mg',     name: '마그네슘 리본', kind: 'par', mg: 0.5 },
    cu:     { id: 'cu',     name: '구리선',        kind: 'dia', mg: -0.3 },
    lead:   { id: 'lead',   name: '연필심(흑연)',  kind: 'dia', mg: -1.1 },
    water:  { id: 'water',  name: '물방울',        kind: 'dia', mg: -0.2 },
    glass:  { id: 'glass',  name: '유리',          kind: 'dia', mg: -0.1 },
    wood:   { id: 'wood',   name: '나무',          kind: 'dia', mg: -0.1 },
    bi:     { id: 'bi',     name: '비스무트',      kind: 'dia', mg: -1.5 },
  };
  const OBS10 = ['nail', 'foil', 'cu', 'nickel', 'glass', 'lead', 'water', 'clip', 'wood', 'mg'];
  const SCALE8 = ['cu', 'nail', 'water', 'foil', 'bi', 'nickel', 'lead', 'mg'];
  const TC = { iron: 770, nickel: 360, ferrite: 100 };            // 퀴리 온도 (°C)
  const METAL = { iron: '철', nickel: '니켈', ferrite: '페라이트(밥솥 감온 자석)' };
  const A_FER_ON = 0.95, A_PAR_ON = 0.3, DIA_LEN = 0.3, REM_HARD = 0.6, REM_SOFT = 0.02;   // 모형 상수
  const T_MAX = 800, T_ROOM = 20, CLIPS = 8;
  const BIT_GOAL = [1, 0, 1, 1, 0, 0, 1, 0];

  /* ---------- 배치 ---------- */
  const XF = PHONE ? 150 : 250, YM = PHONE ? 176 : 190;           // 전자석 극면 x, 중심 y
  const AX = PHONE ? 238 : 345, AY = PHONE ? 46 : 52, PL = YM - AY;  // 매다는 고리, 실 길이
  const RC = PHONE ? 17 : 20;                                       // 시료 반폭
  const SINC = (XF + RC - AX) / PL, THC = Math.asin(SINC);          // 극면에 닿는 실의 각도
  const SCENE_END = PHONE ? 290 : 292;
  const TRAY_Y = PHONE ? 316 : 316, CELL_H = PHONE ? 112 : 112, CELL_W = (VW - 24) / 5;
  const ZONE = { x: XF + 10, y: AY + 6, w: AX + (PHONE ? 62 : 86) - (XF + 10), h: YM + 80 - (AY + 6) };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', fade: 0, t: 0,
    // ①
    mag: true, magA: 1, samples: {}, slot: null, pend: new SciSim.Spring(0, { stiffness: 46, damping: 6.5 }), dwell: 0, contact: false,
    tested: {}, drag: null, press: null,
    // ②
    m: { mat: 'fer', on: false, a: 0, len: 0 }, mc: { fer: {}, par: {}, dia: {} }, mSettle: 0, M: 0, cardSel: {}, cardOK: {}, showCards: false,
    // ③
    cls: {}, clsBad: {}, clsShake: {},
    k: { rod: 'soft', on: false, a: 0, clips: [], seen: {} },
    c: { metal: 'iron', Tset: T_ROOM, T: T_ROOM, a: A_FER_ON, dis: 0, y: 0, vy: 0, fell: false, done: {} },
    // ④
    pair: {}, pairSel: -1, pairBad: {}, pairShake: {}, bits: [0, 0, 0, 0, 0, 0, 0, 0], headX: 0, head: 0,
    hits: [],
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ---------- 화면(뷰) ---------- */
  const VIEWS = [
    { id: 'obs', label: '👀 자석 반응', grp: 0 },
    { id: 'model', label: '🧩 원자 자석', grp: 1 },
    { id: 'scale', label: '⚖️ 저울 분류', grp: 2 },
    { id: 'keep', label: '🧲 자화 유지', grp: 2 },
    { id: 'curie', label: '🔥 퀴리 온도', grp: 2 },
    { id: 'match', label: '🔗 짝짓기', grp: 3 },
    { id: 'disk', label: '💾 하드디스크', grp: 3 },
  ];
  const viewSeg = $('#viewSeg');
  VIEWS.forEach((v) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v.id; b.textContent = v.label;
    b.addEventListener('click', () => { Sound.click(); setScene(v.id); });
    viewSeg.appendChild(b);
  });
  const viewLabel = (id) => VIEWS.find((v) => v.id === id).label;
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.press = null; S.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = viewLabel(mode);
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-match')) on = S.showCards;
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
    $('#bMag').textContent = S.mag ? '전자석 끄기' : '전자석 켜기';
    $$('#matSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.m.mat));
    $$('#fldSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === S.m.on));
    $$('#rodSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.k.rod));
    $$('#curSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === S.k.on));
    $$('#metSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.c.metal));
    const st = $('#sTemp'); if (+st.value !== S.c.Tset) st.value = S.c.Tset;
    st.style.setProperty('--pct', ((S.c.Tset - T_ROOM) / (T_MAX - T_ROOM) * 100) + '%'); $('#oTemp').textContent = S.c.Tset + ' °C';
  }

  /* ================= 시료 그림 ================= */
  function drawSample(id, x, y, r, rot, alpha) {
    const u = r / 20;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(u, u);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const metal = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#f2f5fa'); g.addColorStop(0.5, '#b9c2d0'); g.addColorStop(1, '#7f8a9c'); return g; };
    if (id === 'nail') {
      D.roundRect(-9, -19, 18, 6, 2); ctx.fillStyle = metal(-9, -19, 9, -13); ctx.fill(); ctx.strokeStyle = '#6f7a8c'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.4, -13); ctx.lineTo(2.4, -13); ctx.lineTo(2.4, 16); ctx.lineTo(0, 22); ctx.lineTo(-2.4, 16); ctx.closePath();
      ctx.fillStyle = metal(-2.4, 0, 2.4, 0); ctx.fill(); ctx.strokeStyle = '#6f7a8c'; ctx.stroke();
    } else if (id === 'nickel') {
      D.sphere(0, 0, 17, '#cfd6e2', { gloss: true });
      ctx.beginPath(); ctx.arc(0, 0, 12.5, 0, TAU); ctx.strokeStyle = 'rgba(80,92,112,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore(); T(x, y + 4 * u, 'Ni', Math.max(10, 11 * u), '#4a5568', 'center', 800); return;
    } else if (id === 'clip') {
      ctx.strokeStyle = '#8d97a8'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(-8, -12); ctx.arc(0, -12, 8, Math.PI, 0); ctx.lineTo(8, 14); ctx.arc(0, 14, 8, 0, Math.PI); ctx.lineTo(-8, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.5, 4); ctx.lineTo(-3.5, -9); ctx.arc(0, -9, 3.5, Math.PI, 0); ctx.lineTo(3.5, 8); ctx.stroke();
    } else if (id === 'foil') {
      const P = [[-15, -10], [-6, -16], [4, -12], [15, -15], [13, -2], [17, 8], [6, 15], [-4, 11], [-14, 16], [-12, 3]];
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = metal(-15, -16, 15, 16); ctx.fill(); ctx.strokeStyle = '#8791a3'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-2, 2); ctx.lineTo(6, 15); ctx.moveTo(4, -12); ctx.lineTo(0, 0); ctx.stroke();
    } else if (id === 'mg') {
      ctx.strokeStyle = '#7f8a9c'; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.moveTo(-14, -12); ctx.bezierCurveTo(14, -16, 14, -2, 0, 0); ctx.bezierCurveTo(-14, 2, -14, 14, 14, 14); ctx.stroke();
      ctx.strokeStyle = '#dfe5ee'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-14, -12); ctx.bezierCurveTo(14, -16, 14, -2, 0, 0); ctx.bezierCurveTo(-14, 2, -14, 14, 14, 14); ctx.stroke();
    } else if (id === 'cu') {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#a65d22'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(0, -12 + i * 8, 13, 4.5, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#e39a45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -12 + i * 8, 13, 4.5, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      }
    } else if (id === 'glass') {
      D.roundRect(-14, -14, 28, 28, 4); ctx.fillStyle = 'rgba(160,210,240,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,140,190,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-9, 3); ctx.moveTo(-9, 8); ctx.lineTo(-7, 9); ctx.stroke();
    } else if (id === 'lead') {
      const g = ctx.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#6b717d'); g.addColorStop(0.35, '#4a4f5a'); g.addColorStop(1, '#2a2d34');
      D.roundRect(-5, -18, 10, 36, 3); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#1f2229'; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2.6, -14); ctx.lineTo(-2.6, 14); ctx.stroke();
    } else if (id === 'water') {
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.bezierCurveTo(6, -9, 13, -3, 13, 5); ctx.arc(0, 5, 13, 0, Math.PI, false); ctx.bezierCurveTo(-13, -3, -6, -9, 0, -18); ctx.closePath();
      const g = ctx.createLinearGradient(-10, -10, 10, 14); g.addColorStop(0, '#bfe4ff'); g.addColorStop(1, '#4aa3e8'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2f7fc0'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-5, 3, 2.4, 5, 0.3, 0, TAU); ctx.fill();
    } else if (id === 'wood') {
      D.roundRect(-14, -14, 28, 28, 3); ctx.fillStyle = '#c4935f'; ctx.fill(); ctx.strokeStyle = '#8a5f35'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = '#9a6c3d'; ctx.lineWidth = 1.2; [10, 6, 2.4].forEach((rr) => { ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.8, 0, 0, TAU); ctx.stroke(); });
    } else if (id === 'bi') {
      [['#e7a8d4', 28], ['#8fc9f0', 20], ['#f1d27c', 12]].forEach((c, i) => { const s = c[1] / 2; D.roundRect(-s, -s + (i - 1) * 3, c[1], c[1], 2); ctx.fillStyle = c[0]; ctx.fill(); ctx.strokeStyle = 'rgba(80,60,100,.5)'; ctx.lineWidth = 1; ctx.stroke(); });
    }
    ctx.restore();
  }

  /* ================= ① 시료 · 전자석 ================= */
  OBS10.forEach((id, i) => {
    const sp = S.samples[id] = { id, x: 0, y: 0, sc: 1, mode: 'home', i };
  });
  function homeOf(id) {
    const i = OBS10.indexOf(id), c = i % 5, r = Math.floor(i / 5);
    return { x: 12 + CELL_W * (c + 0.5), y: TRAY_Y + 14 + CELL_H * r + CELL_H * 0.42 };
  }
  OBS10.forEach((id) => { const h = homeOf(id); S.samples[id].x = h.x; S.samples[id].y = h.y; });
  function pendPos() { const th = S.pend.value; return { x: AX + PL * Math.sin(th), y: AY + PL * Math.cos(th) }; }
  function putInSlot(id) {
    if (S.slot === id) return;
    if (S.slot) S.samples[S.slot].mode = 'home';
    S.slot = id; S.samples[id].mode = 'slot'; S.pend.value = 0; S.pend.velocity = 0; S.pend.target = 0; S.dwell = 0; S.contact = false;
    Sound.click();
  }
  function releaseSlot() { if (S.slot) { S.samples[S.slot].mode = 'home'; S.slot = null; S.dwell = 0; S.pend.target = 0; } }
  function resetObs() {
    OBS10.forEach((id) => { const h = homeOf(id), sp = S.samples[id]; sp.mode = 'home'; sp.x = h.x; sp.y = h.y; sp.sc = 1; });
    S.slot = null; S.drag = null; S.press = null; S.tested = {}; S.mag = true; S.magA = 1; S.pend.value = 0; S.pend.velocity = 0; S.pend.target = 0; S.dwell = 0;
  }
  function stepObs(dt) {
    S.magA = SciSim.approach(S.magA, S.mag ? 1 : 0, dt, 8);
    const sp = S.slot ? S.samples[S.slot] : null;
    const fer = !!(sp && SAMPLES[sp.id].kind === 'fer');
    S.pend.target = fer && S.mag ? THC : 0;
    S.pend.update(dt);
    if (S.pend.value < THC) { S.pend.value = THC; S.pend.velocity = Math.max(0, -S.pend.velocity * 0.25); }   // 극면(벽)에 부딪힘
    if (S.pend.value > 0.6) { S.pend.value = 0.6; S.pend.velocity = Math.min(0, S.pend.velocity); }
    const stuck = fer && S.mag && Math.abs(S.pend.value - THC) < 0.02;
    if (stuck && !S.contact) { S.contact = true; const pp = pendPos(); parts.burst(pp.x - RC, pp.y - 4, { count: 10, speed: 120, size: 3, colors: ['#ffd447', '#f2873a', '#fff'], gravity: 220 }); Sound.tick(); }
    if (!stuck) S.contact = false;
    // 반응 확인 (자석이 켜진 채로 1초 가까이)
    if (sp && S.mag && S.mode === 'obs' && !S.drag) {
      const settled = sp.mode === 'slot' && Math.hypot(sp.x - pendPos().x, sp.y - pendPos().y) < 6 && (fer ? stuck : Math.abs(S.pend.value) < 0.02);
      if (settled) S.dwell += dt; else S.dwell = 0;
      if (S.dwell >= 0.9 && !S.tested[sp.id]) { S.tested[sp.id] = fer ? 'stick' : 'none'; Sound.success(); }
    } else S.dwell = 0;
    // 시료 위치
    OBS10.forEach((id) => {
      const s = S.samples[id];
      let tx, ty, ts = 1, rate = 14;
      if (S.drag && S.drag.id === id) { tx = S.drag.x; ty = S.drag.y; ts = 1.18; rate = 30; }
      else if (s.mode === 'slot') { const pp = pendPos(); tx = pp.x; ty = pp.y; rate = 16; }
      else { const h = homeOf(id); tx = h.x; ty = h.y; }
      s.x = SciSim.approach(s.x, tx, dt, rate); s.y = SciSim.approach(s.y, ty, dt, rate); s.sc = SciSim.approach(s.sc, ts, dt, 16);
    });
  }
  const reactOf = (id) => {
    const k = SAMPLES[id].kind;
    if (!S.mag) return '전자석이 꺼져 있어요';
    if (k === 'fer') return Math.abs(S.pend.value - THC) < 0.02 ? '강하게 끌려와 붙었어요' : '끌려오는 중…';
    return S.dwell > 0 || S.tested[id] ? '눈에 띄는 반응이 없어요' : '관찰하는 중…';
  };
  function drawMagnet() {
    const W = PHONE ? 118 : 214, R = PHONE ? 25 : 33, hh = PHONE ? 34 : 44, x0 = XF - W;
    // 받침대
    ctx.fillStyle = '#c9b08a'; ctx.fillRect(0, YM + hh + (PHONE ? 30 : 38), VW, 0);
    D.shadow(() => { D.roundRect(x0 + 8, YM + hh + 4, W - 6, PHONE ? 16 : 20, 6); ctx.fillStyle = '#6b7488'; ctx.fill(); }, { blur: 6, y: 3 });
    // 철심
    const g = ctx.createLinearGradient(0, YM - R * 0.5, 0, YM + R * 0.5); g.addColorStop(0, '#eef1f6'); g.addColorStop(0.5, '#aab3c2'); g.addColorStop(1, '#7a8497');
    D.roundRect(x0 + 6, YM - R * 0.5, W - 12, R, 4); ctx.fillStyle = g; ctx.fill();
    // 코일
    const n = PHONE ? 7 : 10, cx0 = x0 + (PHONE ? 16 : 24), cx1 = XF - (PHONE ? 26 : 34);
    if (S.magA > 0.02) D.glow((cx0 + cx1) / 2, YM, W * 0.7, '#ffb400', 0.28 * S.magA);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = cx0 + (i + 0.5) * (cx1 - cx0) / n; ctx.lineWidth = 4.4; ctx.strokeStyle = '#a65d22'; ctx.beginPath(); ctx.ellipse(x, YM, 5, R, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }
    // 극면
    D.shadow(() => { D.roundRect(XF - 20, YM - hh, 20, hh * 2, 5); ctx.fillStyle = '#d4dae5'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(XF - 20, YM - hh, 20, hh * 2, 5); ctx.fillStyle = C.mix('#cfd6e2', '#e2464b', 0.55 * S.magA); ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(XF - 17, YM - hh + 5, 4, hh * 2 - 10);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = cx0 + (i + 0.5) * (cx1 - cx0) / n; ctx.lineWidth = 4.6; ctx.strokeStyle = '#e39a45'; ctx.beginPath(); ctx.ellipse(x, YM, 5, R, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    T(x0 + W * 0.42, YM - R - 10, '강한 전자석 ' + (S.mag ? '켜짐' : '꺼짐'), PHONE ? 13 : 14, S.mag ? '#b8420f' : '#5a6679', 'center', 800);
    // 자기장 점선
    if (S.magA > 0.05) {
      ctx.save(); ctx.globalAlpha = 0.5 * S.magA; ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -S.t * 24;
      for (let k = 1; k <= 3; k++) { const hgt = k * (PHONE ? 22 : 30); ctx.beginPath(); ctx.moveTo(XF, YM - hh * 0.4); ctx.bezierCurveTo(XF + hgt * 2.0, YM - hh - hgt, XF + hgt * 2.0, YM + hh + hgt, XF, YM + hh * 0.4); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawObs(dt) {
    const g = ctx.createLinearGradient(0, 0, 0, TRAY_Y); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f6f8fc'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SCENE_END);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, SCENE_END); ctx.clip();
    // 탁자
    const ty = YM + (PHONE ? 66 : 82);
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(0, ty, VW, SCENE_END - ty); ctx.fillStyle = '#b89870'; ctx.fillRect(0, ty, VW, 4);
    // 스탠드 + 팔
    const sx = AX + (PHONE ? 80 : 104);
    ctx.fillStyle = '#7a8599'; ctx.fillRect(sx - 4, AY - 10, 8, ty - AY + 10); ctx.fillRect(AX - 4, AY - 10, sx - AX + 8, 8);
    D.sphere(AX, AY - 6, 5, '#394258', { gloss: false });
    drawMagnet();
    ctx.restore();
    // 놓는 자리
    const rest = { x: AX, y: YM };
    const occupied = !!S.slot;
    if (!occupied || S.drag) {
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; D.roundRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h, 14); ctx.stroke(); ctx.restore();
      if (S.drag) D.ring(rest.x, rest.y, 30, S.t, { color: '#14a058' });
      T(ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h - 8, S.drag ? '여기에 놓기' : '시료를 여기에', 13, '#5a6679', 'center', 800);
    }
    // 실 + 시료
    if (S.slot) {
      const sp = S.samples[S.slot];
      ctx.strokeStyle = '#6b7488'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(AX, AY - 2); ctx.lineTo(sp.x, sp.y - RC * 0.9); ctx.stroke();
    }
    // 우측/아래 결과
    drawResult();
    drawTray();
    // 시료들 (끌고 있는 것이 맨 위)
    const order = OBS10.slice().sort((a, b) => (S.drag && S.drag.id === a ? 1 : 0) - (S.drag && S.drag.id === b ? 1 : 0));
    order.forEach((id) => {
      const s = S.samples[id], lift = S.drag && S.drag.id === id;
      const r = RC * s.sc;
      if (lift) { D.shadow(() => { ctx.beginPath(); ctx.arc(s.x, s.y + 8, r * 0.8, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill(); }, { blur: 10 }); }
      drawSample(id, s.x, s.y, r, s.mode === 'slot' ? -Math.asin(clamp((s.x - AX) / PL, -1, 1)) : 0, 1);
    });
    parts.update(dt); parts.draw(ctx);
  }
  function drawResult() {
    const sp = S.slot ? S.samples[S.slot] : null, info = sp ? SAMPLES[sp.id] : null;
    const n = OBS10.filter((id) => S.tested[id]).length;
    if (!PHONE) {
      const px = 478, py = 14, pw = 310, ph = 270;
      panel(px, py, pw, ph, 14);
      T(px + 16, py + 28, '관찰 결과', 15, '#26324a', 'left', 800);
      T(px + pw - 16, py + 28, '확인한 시료 ' + n + ' / ' + OBS10.length, 13.5, '#c2410c', 'right', 800);
      if (info) {
        D.roundRect(px + 14, py + 44, pw - 28, 78, 12); ctx.fillStyle = '#f5f7fb'; ctx.fill();
        drawSample(info.id, px + 52, py + 83, 24, 0, 1);
        T(px + 92, py + 74, info.name, 17, '#26324a', 'left', 800);
        T(px + 92, py + 100, reactOf(info.id), 14, S.tested[info.id] === 'stick' || (info.kind === 'fer' && S.mag) ? '#b8420f' : '#3a465c', 'left', 800);
      } else {
        D.roundRect(px + 14, py + 44, pw - 28, 78, 12); ctx.fillStyle = '#f5f7fb'; ctx.fill();
        textBlock(px + 28, py + 78, pw - 56, '아래 상자의 시료를 끌어 점선 칸에 놓아 보세요.', 14, '#5a6679', 19, 800);
      }
      // 기록 칩
      OBS10.forEach((id, i) => {
        const c = i % 2, r = Math.floor(i / 2), cx = px + 14 + c * ((pw - 28) / 2 + 0), cy = py + 134 + r * 26;
        const t = S.tested[id];
        T(cx, cy + 14, (t ? (t === 'stick' ? '🧲 ' : '➖ ') : '⬜ ') + SAMPLES[id].name, 13.5, t ? '#26324a' : '#98a2b3', 'left', 800);
      });
    } else {
      const y = YM + 82;
      T(12, 24, '확인한 시료 ' + n + ' / ' + OBS10.length, 13.5, '#c2410c', 'left', 800);
      if (info) T(12, y + 12, info.name + ': ' + reactOf(info.id), 13.5, '#26324a', 'left', 800);
      else T(12, y + 12, '아래 시료를 끌어 점선 칸에 놓아 보세요.', 13, '#5a6679', 'left', 800);
    }
  }
  function drawTray() {
    T(14, TRAY_Y - 0, '시료 상자 (끌거나 눌러 보세요)', 13.5, '#26324a', 'left', 800);
    OBS10.forEach((id, i) => {
      const c = i % 5, r = Math.floor(i / 5), x = 12 + CELL_W * c + 3, y = TRAY_Y + 10 + CELL_H * r, w = CELL_W - 6, h = CELL_H - 8;
      D.roundRect(x, y, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = S.tested[id] ? (S.tested[id] === 'stick' ? '#e2464b' : '#98a2b3') : '#dfe5ef'; ctx.lineWidth = 2; ctx.stroke();
      T(x + w / 2, y + h - 10, SAMPLES[id].name, PHONE ? 12 : 13.5, '#26324a', 'center', 800);
      const t = S.tested[id];
      if (t) {
        ctx.fillStyle = t === 'stick' ? '#fde4e4' : '#eef1f7'; D.roundRect(x + w - (PHONE ? 38 : 46), y + 5, PHONE ? 33 : 41, 17, 8); ctx.fill();
        T(x + w - (PHONE ? 21.5 : 25.5), y + 17.5, t === 'stick' ? '붙음' : '무반응', 11, t === 'stick' ? '#b42318' : '#5a6679', 'center', 800);
      }
      const s = S.samples[id];
      if (s.mode !== 'home' || (S.drag && S.drag.id === id)) { ctx.strokeStyle = '#cfd6e2'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(homeOf(id).x, homeOf(id).y, RC * 1.05, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    });
  }
  function inZone(p) { return p.x >= ZONE.x && p.x <= ZONE.x + ZONE.w && p.y >= ZONE.y && p.y <= ZONE.y + ZONE.h; }
  function pickSample(p) {
    // 위에 그려진 것부터 (시료 반경보다 조금 넉넉히)
    for (let i = OBS10.length - 1; i >= 0; i--) { const s = S.samples[OBS10[i]]; if (Math.hypot(p.x - s.x, p.y - s.y) <= RC * 1.35) return s; }
    return null;
  }

  /* ================= ② 원자 자석 모형 ================= */
  const COLS = 10, ROWS = 6;
  const DOM_BASE = [Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, -Math.PI / 4];      // 도메인 방향 (합 0)
  const DOM_COL = ['#7c5cff', '#14a058', '#f2873a', '#2f9bd6'];
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const ATOMS = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = r * COLS + c, dom = (r < ROWS / 2 ? 0 : 2) + (c < COLS / 2 ? 0 : 1);
    const noise = Math.sin(k * 12.9898 + 4.1) * 0.5 * 0.22;
    const phiF = wrapA(DOM_BASE[dom] + noise);
    const phiR = (((k * 37) % 60 + 0.5) / 60) * TAU - Math.PI;     // 60개를 고르게 흩어 놓은 방향 (합 = 0)
    ATOMS.push({ k, r, c, dom, phiF, phiR, ph: k * 1.7 });
  }
  // 한 원자 자석의 방향 · 길이 비율 (모형 상수에서 계산)
  function atomState(at, kind, a, len, dis) {
    if (kind === 'dia') return { th: Math.PI, f: len };
    const base = at.phiF + (at.phiR - at.phiF) * dis;
    return { th: base * (1 - a), f: 1 };
  }
  function magnetization(kind, a, len, dis) {
    let s = 0; ATOMS.forEach((at) => { const st = atomState(at, kind, a, len, dis); s += st.f * Math.cos(st.th); });
    return s / ATOMS.length;
  }
  // 모형 변화 목표
  function alignStep(st, kind, on, dt, opts) {
    opts = opts || {};
    const rem = opts.rem != null ? opts.rem : REM_HARD, para = !!opts.above;
    if (kind === 'fer' && !para) {
      if (on) st.a = SciSim.approach(st.a, A_FER_ON, dt, 4);
      else if (st.a > rem) st.a = SciSim.approach(st.a, rem, dt, 3); else st.a = Math.min(st.a, rem);
    } else if (kind === 'fer' || kind === 'par') {
      st.a = SciSim.approach(st.a, on ? A_PAR_ON : 0, dt, 6);
    }
    if (kind === 'dia') st.len = SciSim.approach(st.len || 0, on ? DIA_LEN : 0, dt, 6);
    if (st.a < 1e-4) st.a = Math.max(0, st.a);
  }
  function drawBarMagnet(x, y, th, len, Lb, thick, alpha) {
    const h = Lb * len / 2; if (h < 0.5) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(th); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = '#2f6df6'; ctx.fillRect(-h, -thick / 2, h, thick); ctx.fillStyle = '#e2464b'; ctx.fillRect(0, -thick / 2, h, thick);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-h, -thick / 2, h * 2, thick * 0.3);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,50,70,.6)'; ctx.strokeRect(-h, -thick / 2, h * 2, thick);
    ctx.restore();
  }
  // 원자 격자 그리기. 반환: 자화 정도 M (그린 각도와 길이로 계산)
  function drawAtomGrid(x, y, w, h, o) {
    const cw = w / COLS, ch = h / ROWS, Lb = Math.min(cw, ch) * 0.86, thick = Math.max(4, Lb * 0.24);
    const kind = o.kind, a = o.a || 0, len = o.len || 0, dis = o.dis || 0, domA = (kind === 'fer' ? (1 - clamp(a / A_FER_ON, 0, 1)) * (1 - dis) : 0);
    ctx.save(); D.roundRect(x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(x, y, w, h);
    if (kind === 'fer' && domA > 0.02) {
      for (let d = 0; d < 4; d++) {
        const dc = d % 2, dr = Math.floor(d / 2);
        ctx.fillStyle = C.rgba(DOM_COL[d], 0.16 * domA); ctx.fillRect(x + dc * w / 2, y + dr * h / 2, w / 2, h / 2);
      }
      ctx.strokeStyle = 'rgba(60,70,90,' + (0.55 * domA) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke(); ctx.setLineDash([]);
    }
    let sum = 0;
    ATOMS.forEach((at) => {
      const st = atomState(at, kind, a, len, dis);
      sum += st.f * Math.cos(st.th);
      const cx = x + (at.c + 0.5) * cw, cy = y + (at.r + 0.5) * ch;
      const jit = RM ? 0 : (o.jit || 0) * Math.sin(S.t * 3 + at.ph);
      D.sphere(cx, cy, Math.max(2.5, thick * 0.4), '#8aa0c4', { gloss: false });
      drawBarMagnet(cx, cy, st.th + jit, st.f, Lb, thick, 1);
    });
    ctx.restore();
    ctx.strokeStyle = '#cfd6e2'; ctx.lineWidth = 2; D.roundRect(x, y, w, h, 12); ctx.stroke();
    return sum / ATOMS.length;
  }
  const modelMsg = () => {
    const m = S.m;
    if (m.mat === 'fer') {
      if (m.on) return '도메인 속 원자 자석이 외부 자기장 방향으로 크게 정렬해요. 도메인의 경계가 사라져요.';
      if (m.a > 0.3) return '자기장을 없애도 정렬이 많이 남아 있어요 → 스스로 자석이 돼요.';
      return '자기장이 없으면 도메인마다 방향이 달라서 서로 상쇄돼요 (합 ≈ 0).';
    }
    if (m.mat === 'par') return m.on ? '원자 자석이 자기장 방향으로 조금 기울어요. 약한 정렬이에요.' : '열운동 때문에 방향이 제각각이에요. 자기장을 없애면 정렬이 사라져요.';
    return m.on ? '자기장과 반대 방향의 작은 자석이 생겨요. 그래서 자석에서 밀려나요.' : '자기장이 없으면 원자 자석이 생기지 않아요.';
  };
  const MODEL_DEF = {
    fer: '강자성체: 철, 니켈, 코발트 — 외부 자기장 방향으로 강하게 자화돼요.',
    par: '상자성체: 알루미늄, 마그네슘, 산소 — 같은 방향으로 약하게 자화돼요.',
    dia: '반자성체: 구리, 금, 물, 흑연, 비스무트 — 반대 방향으로 약하게 자화돼요.',
  };
  function stepModel(dt) {
    const m = S.m;
    alignStep(m, m.mat, m.on, dt, {});
    // 미션 기록
    S.M = magnetization(m.mat, m.a, m.len, 0);
    const rec = S.mc[m.mat];
    if (m.on) {
      if ((m.mat === 'fer' && S.M >= 0.9) || (m.mat === 'par' && S.M >= 0.3) || (m.mat === 'dia' && S.M <= -0.25)) rec.on = true;
      S.mSettle = 0;
    } else if (rec.on) {
      const settled = m.mat === 'fer' ? m.a <= REM_HARD + 0.02 : Math.abs(S.M) < 0.02;
      if (settled) { S.mSettle += dt; if (S.mSettle > 0.8) rec.off = true; } else S.mSettle = 0;
    }
  }
  function drawGauge(x, y, w, h, M, title) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 24, title, 13.5, '#26324a', 'left', 800);
    const bx = x + 16, bw = w - 32, by = y + 38, bh = 20, cx = bx + bw / 2;
    D.roundRect(bx, by, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = bw / 2 * clamp(Math.abs(M), 0, 1);
    if (fw > 0.4) { ctx.fillStyle = M >= 0 ? '#e2464b' : '#2f6df6'; ctx.fillRect(M >= 0 ? cx : cx - fw, by + 1, fw, bh - 2); }
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, by - 3); ctx.lineTo(cx, by + bh + 3); ctx.stroke();
    [[-100, bx], [0, cx], [100, bx + bw]].forEach((tk) => T(tk[1], by + bh + 17, (tk[0] > 0 ? '+' : tk[0] < 0 ? '−' : '') + Math.abs(tk[0]) + '%', 12, '#3a465c', tk[0] < 0 ? 'left' : tk[0] > 0 ? 'right' : 'center', 800));
    T(cx, y + h - 10, '자화 정도 ' + pct(M), 15, M >= 0 ? '#b42318' : '#1d4ed8', 'center', 800);
  }
  function drawModel(dt) {
    const m = S.m;
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    const bx = PHONE ? 12 : 20, by = PHONE ? 44 : 50, bw = PHONE ? 456 : 450, bh = PHONE ? 256 : 340;
    T(bx, by - 14, '🔍 물질 속 원자 자석 (확대) — ' + KIND[m.mat], PHONE ? 14 : 15, '#26324a', 'left', 800);
    const jit = m.mat === 'par' ? 0.28 * (1 - m.a / A_PAR_ON * 0.5) : (m.mat === 'fer' ? 0.05 : 0);
    const M = drawAtomGrid(bx, by, bw, bh, { kind: m.mat, a: m.a, len: m.len, dis: 0, jit });
    S.Mdraw = M;
    // 외부 자기장 카드
    const cx = PHONE ? 12 : 488, cy = PHONE ? by + bh + 12 : by, cw = PHONE ? 222 : 292, chh = PHONE ? 104 : 120;
    panel(cx, cy, cw, chh, 14);
    T(cx + 14, cy + 24, '외부 자기장', 13.5, '#26324a', 'left', 800);
    const ax0 = cx + 24, ax1 = cx + cw - 24, ay = cy + 70;
    if (m.on) D.arrow(ax0, ay, ax1, ay, { color: '#7c5cff', width: 8, head: 22 });
    else { D.dashedLine(ax0, ay, ax1, ay, { color: '#b9c1d0', width: 4, offset: S.t * 10 }); T((ax0 + ax1) / 2, ay + 30, '없음', 13, '#7b8aa3', 'center', 800); }
    if (m.on) T((ax0 + ax1) / 2, ay + 32, '→ 오른쪽 방향', 13, '#5b3fd0', 'center', 800);
    // 자화 게이지
    drawGauge(PHONE ? 246 : 488, PHONE ? cy : by + 134, PHONE ? 222 : 292, PHONE ? 104 : 106, M, '자화 정도 (자기장 방향 기준)');
    // 설명
    const ty = PHONE ? cy + chh + 12 : by + bh + 12, th = VH - ty - 12;
    panel(PHONE ? 12 : 20, ty, VW - (PHONE ? 24 : 40), th, 14);
    const hh = textBlock((PHONE ? 12 : 20) + 16, ty + 28, VW - (PHONE ? 24 : 40) - 32, modelMsg(), PHONE ? 14 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock((PHONE ? 12 : 20) + 16, ty + 28 + hh + 6, VW - (PHONE ? 24 : 40) - 32, MODEL_DEF[m.mat], PHONE ? 12.5 : 13.5, '#5a6679', PHONE ? 18 : 19, 700);
    const ly = ty + th - 14;
    drawBarMagnet(PHONE ? 38 : 46, ly - 4, 0, 1, 22, 8, 1);
    T(PHONE ? 54 : 62, ly, '원자 자석 (빨강 = N극 쪽)', 12.5, '#5a6679', 'left', 700);
    if (m.mat !== 'fer') T(VW - (PHONE ? 24 : 40), ly, '실제 반응은 훨씬 약해서 눈에 잘 띄게 과장했어요', PHONE ? 10.5 : 12, '#7b8aa3', 'right', 700);
    else T(VW - (PHONE ? 24 : 40), ly, '점선 = 도메인 경계', PHONE ? 11 : 12, '#7b8aa3', 'right', 700);
    parts.update(dt); parts.draw(ctx);
  }
  // 모형 카드 (manual)
  const CARDS = [
    ['fer', '강자성체'], ['par', '상자성체'], ['dia', '반자성체'],
  ];
  const CARD_OPT = [
    ['b', '같은 방향으로 약하게 정렬하고, 자기장을 없애면 흐트러져요'],
    ['c', '자기장과 반대 방향으로 약하게 자화돼요'],
    ['a', '같은 방향으로 크게 정렬하고, 자기장을 없애도 정렬이 남아요'],
  ];
  const CARD_ANS = { fer: 'a', par: 'b', dia: 'c' };
  const cardSels = [];
  CARDS.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + c[1] + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', c[1] + '의 특징');
    sel.innerHTML = '<option value="">— 고르기 —</option>' + CARD_OPT.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
    sel.addEventListener('change', () => { S.cardSel[c[0]] = sel.value; sel.classList.remove('ok', 'bad'); delete S.cardOK[c[0]]; Sound.click(); });
    row.appendChild(sel); $('#cardRows').appendChild(row); cardSels.push(sel);
  });
  function resetCards() { S.cardSel = {}; S.cardOK = {}; cardSels.forEach((s) => s.classList.remove('ok', 'bad')); cardSels.forEach((s) => (s.value = '')); }

  /* ================= ③ 저울 · 자화 유지 · 퀴리 ================= */
  const LOG_MAX = 3000, LOG_MIN = 0.1;
  const logPos = (v) => Math.sign(v) * clamp(Math.log10(Math.abs(v) / LOG_MIN) / Math.log10(LOG_MAX / LOG_MIN), 0, 1);
  const ROW0 = PHONE ? 84 : 78;
  const ROW_H = PHONE ? 46 : 52;
  const COL = PHONE
    ? { name: 12, read: 134, bc: 292, bh: 78, pill: 380, pw: 88 }
    : { name: 22, read: 222, bc: 492, bh: 142, pill: 664, pw: 116 };
  function drawScale(dt) {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    T(14, 30, '⚖️ 강한 전자석 위에서 잰 시료의 겉보기 무게 변화', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
    T(14, 52, '+ 끌림 / − 밀림 (단위 mg)', 12.5, '#5a6679', 'left', 700);
    const hy = ROW0 - 8;
    T(COL.name, hy, '시료', 12.5, '#5a6679', 'left', 800); T(COL.read, hy, '저울 읽음', 12.5, '#5a6679', 'left', 800);
    T(COL.bc, hy, '← 밀림   끌림 →', 12.5, '#5a6679', 'center', 800); T(COL.pill + COL.pw / 2, hy, '분류', 12.5, '#5a6679', 'center', 800);
    S.hits = [];
    SCALE8.forEach((id, i) => {
      const sp = SAMPLES[id], y = ROW0 + i * ROW_H, cy = y + ROW_H / 2;
      D.roundRect(8, y + 2, VW - 16, ROW_H - 4, 10); ctx.fillStyle = i % 2 ? '#f6f8fc' : '#fff'; ctx.fill();
      drawSample(id, COL.name + 14, cy, PHONE ? 11 : 13, 0, 1);
      T(COL.name + (PHONE ? 30 : 36), cy + 5, sp.name, PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
      T(COL.read, cy + 5, fmtMg(sp.mg), PHONE ? 13.5 : 15.5, sp.mg > 0 ? '#b42318' : '#1d4ed8', 'left', 800);
      // 로그 막대
      const bw = COL.bh, cx = COL.bc, lp = logPos(sp.mg);
      ctx.fillStyle = '#eef1f7'; ctx.fillRect(cx - bw, cy - 7, bw * 2, 14);
      if (Math.abs(lp) > 0) { ctx.fillStyle = sp.mg > 0 ? '#e2464b' : '#2f6df6'; ctx.fillRect(lp >= 0 ? cx : cx + lp * bw, cy - 7, Math.abs(lp) * bw, 14); }
      ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 11); ctx.stroke();
      // 분류 칸
      const k = S.cls[id], bad = S.clsBad[id];
      const shake = S.clsShake[id] ? Math.sin((S.t - S.clsShake[id]) * 50) * 4 * Math.max(0, 1 - (S.t - S.clsShake[id]) / 0.4) : 0;
      const px = COL.pill + shake, ph = 36;
      D.roundRect(px, cy - ph / 2, COL.pw, ph, 18);
      ctx.fillStyle = k ? C.rgba(KCOL[k], 0.14) : '#fff'; ctx.fill();
      ctx.lineWidth = 2.4; ctx.strokeStyle = bad ? '#e2464b' : k ? KCOL[k] : '#b9c1d0'; if (!k) ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(px + COL.pw / 2, cy + 5, k ? KIND[k] : '눌러서 분류', PHONE ? 12.5 : 13.5, k ? KCOL[k] : '#7b8aa3', 'center', 800);
      S.hits.push({ x: COL.pill - 4, y: cy - ROW_H / 2, w: COL.pw + 8, h: ROW_H, fn: () => { const o = ['', 'fer', 'par', 'dia']; S.cls[id] = o[(o.indexOf(S.cls[id] || '') + 1) % 4] || ''; delete S.clsBad[id]; Sound.click(); } });
    });
    // 로그 눈금 설명
    const ay = ROW0 + SCALE8.length * ROW_H + 10;
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(COL.bc - COL.bh, ay); ctx.lineTo(COL.bc + COL.bh, ay); ctx.stroke();
    [1, 10, 100, 1000].forEach((v, vi) => [-1, 1].forEach((s) => {
      const xx = COL.bc + s * logPos(v) * COL.bh;
      ctx.beginPath(); ctx.moveTo(xx, ay - 4); ctx.lineTo(xx, ay + 4); ctx.stroke();
      T(xx, ay + 18 + (PHONE && vi % 2 ? 13 : 0), String(v), PHONE ? 10.5 : 11.5, '#3a465c', 'center', 800);
    }));
    T(COL.bc, ay + 18, '0.1', PHONE ? 10.5 : 11.5, '#3a465c', 'center', 800);
    T(COL.name, ay + 18, '막대 눈금(mg): 값이 크게 달라서 로그 눈금으로 그렸어요', PHONE ? 10.5 : 12, '#7b8aa3', 'left', 700, { alpha: PHONE ? 0 : 1 });
    if (PHONE) T(12, ay + 54, '막대 눈금(mg)은 값 차이가 커서 로그 눈금이에요', 11, '#7b8aa3', 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }
  const clsDone = () => SCALE8.every((id) => S.cls[id]);

  // 자화 유지 실험
  function MofA(a) { return magnetization('fer', a, 0, 0); }
  function initClips() {
    S.k.clips = [];
    for (let i = 0; i < CLIPS; i++) S.k.clips.push({ x: 0, y: 0, vy: 0, held: false, rest: false, lx: 0 });
  }
  initClips();
  const KEEP = PHONE
    ? { rx: 36, ry: 128, rw: 408, rh: 34, cx0: 160, cx1: 320, floor: 262 }
    : { rx: 36, ry: 140, rw: 440, rh: 42, cx0: 150, cx1: 350, floor: 336 };
  function clipSlot(i) {
    const end = i % 2, lvl = Math.floor(i / 2);                    // 양 끝 극에 2줄씩 매달림
    const x = end ? KEEP.rx + KEEP.rw - 14 + (lvl % 2 ? 6 : -6) : KEEP.rx + 14 + (lvl % 2 ? -6 : 6);
    return { x, y: KEEP.ry + KEEP.rh + 12 + Math.floor(lvl / 2) * 20 + (lvl % 2) * 4 };
  }
  function stepKeep(dt) {
    const k = S.k;
    alignStep(k, 'fer', k.on, dt, { rem: k.rod === 'soft' ? REM_SOFT : REM_HARD });
    k.M = MofA(k.a);
    k.n = Math.round(clamp(k.M, 0, 1) * CLIPS);
    k.clips.forEach((c, i) => {
      const held = i < k.n, sl = clipSlot(i);
      if (held) {
        if (!c.held) { c.held = true; c.rest = false; }
        c.x = SciSim.approach(c.x, sl.x, dt, 14); c.y = SciSim.approach(c.y, sl.y, dt, 14); c.vy = 0;
      } else {
        if (c.held) { c.held = false; c.rest = false; c.vy = 0; }
        if (!c.rest) {
          c.vy += 900 * dt; c.y += c.vy * dt;
          if (c.y >= KEEP.floor - 8) { c.y = KEEP.floor - 8; c.rest = true; c.lx = sl.x + (i % 3 - 1) * 10; }
        } else c.x = SciSim.approach(c.x, c.lx, dt, 10);
      }
    });
    // 미션 기록
    const ks = k.seen;
    if (k.on && k.a >= 0.9) ks[k.rod + 'On'] = true;
    if (!k.on && ks[k.rod + 'On']) {
      const settled = k.rod === 'soft' ? k.a <= REM_SOFT + 0.015 : k.a <= REM_HARD + 0.02;
      if (settled) { ks[k.rod + 'T'] = (ks[k.rod + 'T'] || 0) + dt; if (ks[k.rod + 'T'] > 0.8) ks[k.rod + 'Off'] = true; } else ks[k.rod + 'T'] = 0;
    } else if (k.on) ks[k.rod + 'T'] = 0;
  }
  function drawClip(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.strokeStyle = '#8d97a8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-4, -6); ctx.arc(0, -6, 4, Math.PI, 0); ctx.lineTo(4, 8); ctx.arc(0, 8, 4, 0, Math.PI); ctx.lineTo(-4, 6); ctx.stroke(); ctx.restore();
  }
  function drawKeep(dt) {
    const k = S.k, g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    T(14, 30, '막대를 코일 속에 넣고 전류를 켰다가 꺼요', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
    // 탁자
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(0, KEEP.floor, VW, 8); ctx.fillStyle = '#b89870'; ctx.fillRect(0, KEEP.floor, VW, 4);
    // 막대 (자화에 따라 N/S 색)
    const mm = clamp(k.M, 0, 1);
    const rg = ctx.createLinearGradient(0, KEEP.ry, 0, KEEP.ry + KEEP.rh); rg.addColorStop(0, '#eef1f6'); rg.addColorStop(1, '#8e98aa');
    D.shadow(() => { D.roundRect(KEEP.rx, KEEP.ry, KEEP.rw, KEEP.rh, 6); ctx.fillStyle = rg; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.save(); D.roundRect(KEEP.rx, KEEP.ry, KEEP.rw, KEEP.rh, 6); ctx.clip();
    ctx.globalAlpha = mm; ctx.fillStyle = '#2f6df6'; ctx.fillRect(KEEP.rx, KEEP.ry, KEEP.rw / 2, KEEP.rh); ctx.fillStyle = '#e2464b'; ctx.fillRect(KEEP.rx + KEEP.rw / 2, KEEP.ry, KEEP.rw / 2, KEEP.rh);
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(KEEP.rx, KEEP.ry + 3, KEEP.rw, KEEP.rh * 0.25); ctx.restore();
    ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.5; D.roundRect(KEEP.rx, KEEP.ry, KEEP.rw, KEEP.rh, 6); ctx.stroke();
    if (mm > 0.3) { T(KEEP.rx + 22, KEEP.ry + KEEP.rh / 2 + 5, 'S', 15, '#fff', 'center', 800); T(KEEP.rx + KEEP.rw - 22, KEEP.ry + KEEP.rh / 2 + 5, 'N', 15, '#fff', 'center', 800); }
    T(KEEP.rx, KEEP.ry - 48, (k.rod === 'soft' ? '순철 막대 (연질 자성체)' : '강철 막대 (경질 자성체)'), PHONE ? 13 : 14, '#26324a', 'left', 800);
    // 코일 (막대를 감음)
    const n = 12, cy0 = KEEP.ry + KEEP.rh / 2, R = KEEP.rh * 0.95;
    if (k.on) D.glow((KEEP.cx0 + KEEP.cx1) / 2, cy0, (KEEP.cx1 - KEEP.cx0) * 0.8, '#ffb400', 0.3);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = KEEP.cx0 + (i + 0.5) * (KEEP.cx1 - KEEP.cx0) / n; ctx.lineWidth = 4.6; ctx.strokeStyle = '#a65d22'; ctx.beginPath(); ctx.ellipse(x, cy0, 5, R, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }
    for (let i = 0; i < n; i++) { const x = KEEP.cx0 + (i + 0.5) * (KEEP.cx1 - KEEP.cx0) / n; ctx.lineWidth = 4.8; ctx.strokeStyle = '#e39a45'; ctx.beginPath(); ctx.ellipse(x, cy0, 5, R, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
    T((KEEP.cx0 + KEEP.cx1) / 2, cy0 - R - 10, '코일 전류 ' + (k.on ? '켜짐' : '꺼짐'), PHONE ? 13 : 14, k.on ? '#b8420f' : '#5a6679', 'center', 800);
    // 클립
    k.clips.forEach((c, i) => drawClip(c.x, c.y, c.held ? 0 : (i % 3 - 1) * 0.5));
    if (!PHONE) {
      panel(20, KEEP.floor + 30, 470, 130, 14);
      T(40, KEEP.floor + 68, '붙어 있는 클립 ' + k.n + ' / ' + CLIPS + '개', 20, '#c2410c', 'left', 800);
      textBlock(40, KEEP.floor + 100, 430, k.on ? '전류가 흐르는 동안 원자 자석이 정렬해서 막대가 자석이 돼요.' : (k.rod === 'soft' ? '전류를 끄면 정렬이 거의 사라져서 클립이 떨어져요. (연질)' : '전류를 꺼도 정렬이 남아서 클립이 붙어 있어요. (경질)'), 15, '#3a465c', 22, 800);
    } else T(VW / 2, KEEP.floor + 30, '붙어 있는 클립 ' + k.n + ' / ' + CLIPS + '개', 14, '#c2410c', 'center', 800);
    // 미니 모형 + 게이지
    const mx = PHONE ? 12 : 520, my = PHONE ? KEEP.floor + 48 : 70, mw = PHONE ? 220 : 262, mh = PHONE ? 132 : 170;
    T(mx, my - 8, '🔍 막대 속 원자 자석', 13.5, '#26324a', 'left', 800);
    drawAtomGrid(mx, my, mw, mh, { kind: 'fer', a: k.a, dis: 0, jit: 0.04 });
    drawGauge(PHONE ? 244 : 520, PHONE ? KEEP.floor + 48 : my + mh + 14, PHONE ? 224 : 262, PHONE ? 132 : 110, k.M, '남은 자화 정도');
    if (PHONE) textBlock(14, KEEP.floor + 48 + 132 + 30, VW - 28, k.on ? '전류가 흐르는 동안 원자 자석이 정렬해요.' : (k.rod === 'soft' ? '전류를 끄면 정렬이 거의 사라져서 클립이 떨어져요.' : '전류를 꺼도 정렬이 남아서 클립이 붙어 있어요.'), 13, '#3a465c', 18, 800);
    parts.update(dt); parts.draw(ctx);
  }

  // 퀴리 온도 실험
  const CUR = PHONE
    ? { mx: 90, my: 70, mw: 190, mh: 38, sx: 185, sz: 36, floor: 290, hx0: 120, hx1: 250 }
    : { mx: 60, my: 80, mw: 230, mh: 42, sx: 175, sz: 42, floor: 350, hx0: 100, hx1: 250 };
  function curY0() { return CUR.my + CUR.mh + CUR.sz / 2 + 1; }
  function stepCurie(dt) {
    const c = S.c, tc = TC[c.metal];
    c.T = Math.abs(c.T - c.Tset) < 0.5 ? c.Tset : SciSim.approach(c.T, c.Tset, dt, RM ? 60 : 1.6);
    const above = c.T >= tc;
    c.dis = SciSim.approach(c.dis, above ? 1 : 0, dt, 5);
    alignStep(c, 'fer', true, dt, { above });
    c.M = magnetization('fer', c.a, 0, c.dis);
    const y0 = curY0(), yf = CUR.floor - CUR.sz / 2;
    if (!above) {
      c.fell = false; c.vy = 0; c.y = SciSim.approach(c.y || y0, y0, dt, 12);
    } else {
      if (!c.fell) { c.fell = true; c.vy = 0; }
      c.vy += 1100 * dt; c.y += c.vy * dt;
      if (c.y >= yf) { c.y = yf; c.vy = c.vy > 140 ? -c.vy * 0.25 : 0; if (c.vy === 0) c.y = yf; }
    }
    if (c.metal === 'iron' && c.fell && c.T >= tc && c.y >= yf - 0.5) c.done.iron = true;
  }
  function drawCurie(dt) {
    const c = S.c, tc = TC[c.metal], g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    T(14, 30, '자석에 붙은 금속을 가열해요', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
    // 바닥
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(0, CUR.floor, VW, 8); ctx.fillStyle = '#b89870'; ctx.fillRect(0, CUR.floor, VW, 4);
    // 영구 자석
    D.shadow(() => { D.roundRect(CUR.mx, CUR.my, CUR.mw, CUR.mh, 6); ctx.fillStyle = '#ccd3df'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.save(); D.roundRect(CUR.mx, CUR.my, CUR.mw, CUR.mh, 6); ctx.clip(); ctx.fillStyle = '#2f6df6'; ctx.fillRect(CUR.mx, CUR.my, CUR.mw / 2, CUR.mh); ctx.fillStyle = '#e2464b'; ctx.fillRect(CUR.mx + CUR.mw / 2, CUR.my, CUR.mw / 2, CUR.mh);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(CUR.mx, CUR.my + 3, CUR.mw, CUR.mh * 0.25); ctx.restore();
    ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.5; D.roundRect(CUR.mx, CUR.my, CUR.mw, CUR.mh, 6); ctx.stroke();
    T(CUR.mx + CUR.mw * 0.25, CUR.my + CUR.mh / 2 + 5, 'S', 15, '#fff', 'center', 800); T(CUR.mx + CUR.mw * 0.75, CUR.my + CUR.mh / 2 + 5, 'N', 15, '#fff', 'center', 800);
    T(CUR.mx + CUR.mw / 2, CUR.my - 10, '영구 자석', 13, '#5a6679', 'center', 800);
    // 가열판 (시료 양옆)
    const heat = clamp((c.T - T_ROOM) / (T_MAX - T_ROOM), 0, 1);
    [CUR.sx - CUR.sz / 2 - 24, CUR.sx + CUR.sz / 2 + 14].forEach((hx) => {
      D.roundRect(hx, CUR.my + CUR.mh + 6, 10, CUR.floor - (CUR.my + CUR.mh + 6) - 4, 4);
      ctx.fillStyle = C.mix('#8791a5', '#ff6a2b', heat); ctx.fill();
      if (heat > 0.08) D.glow(hx + 5, CUR.my + CUR.mh + 80, 56, '#ff7a2b', 0.45 * heat);
    });
    if (!PHONE) T(CUR.sx, CUR.floor + 50, '양옆의 가열판이 시료를 데워요', 12, '#5a6679', 'center', 700);
    // 시료
    const sx = CUR.sx, sy = c.y || curY0(), sz = CUR.sz;
    const heatCol = C.mix('#aab3c2', '#ff5a1f', clamp((c.T - T_ROOM) / 760, 0, 1));
    D.shadow(() => { D.roundRect(sx - sz / 2, sy - sz / 2, sz, sz, 5); ctx.fillStyle = heatCol; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx - sz / 2 + 4, sy - sz / 2 + 4, sz - 8, 6);
    ctx.strokeStyle = 'rgba(40,50,70,.5)'; ctx.lineWidth = 1.4; D.roundRect(sx - sz / 2, sy - sz / 2, sz, sz, 5); ctx.stroke();
    T(sx, sy + 5, c.metal === 'iron' ? 'Fe' : c.metal === 'nickel' ? 'Ni' : '페라', 13, '#26324a', 'center', 800);
    // 온도계
    D.thermometer(CUR.hx1 + 78, 88, CUR.floor - 122, c.T, 0, T_MAX, {});
    T(CUR.hx1 + 78, 70, Math.round(c.T) + ' °C', 14, '#26324a', 'center', 800);
    // 퀴리 온도 표시선 (눈금과 같은 선형 눈금)
    // 상태 표지
    const attached = !c.fell;
    D.label(CUR.sx, CUR.floor + 22, attached ? '자석에 붙어 있어요' : '떨어졌어요!', { bg: attached ? '#14a058' : '#e2464b', size: 13 });
    // 우측: 모형 + 게이지
    const mx = PHONE ? 12 : 476, my = PHONE ? CUR.floor + 44 : 70, mw = PHONE ? 220 : 300, mh = PHONE ? 132 : 180;
    T(mx, my - 8, '🔍 ' + METAL[c.metal] + ' 속 원자 자석', 13.5, '#26324a', 'left', 800);
    drawAtomGrid(mx, my, mw, mh, { kind: 'fer', a: c.a, dis: c.dis, jit: c.dis > 0.5 ? 0.3 : 0.05 + 0.2 * clamp(c.T / tc, 0, 1) });
    const gx = PHONE ? 244 : 476, gy = PHONE ? CUR.floor + 44 : my + mh + 14, gw = PHONE ? 224 : 300, gh = PHONE ? 132 : 112;
    panel(gx, gy, gw, gh, 14);
    T(gx + 14, gy + 24, '퀴리 온도 (' + METAL[c.metal].replace('(밥솥 감온 자석)', '') + ')', 13.5, '#26324a', 'left', 800);
    const bx = gx + 16, bw = gw - 32, by = gy + 42;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(bx, by, bw, 16);
    ctx.fillStyle = '#e2464b'; ctx.fillRect(bx + bw * tc / T_MAX, by, bw * (1 - tc / T_MAX), 16);
    ctx.fillStyle = '#14a058'; ctx.fillRect(bx, by, bw * tc / T_MAX, 16);
    const nx = bx + bw * clamp(c.T / T_MAX, 0, 1);
    D.sphere(nx, by + 8, 9, '#26324a', { gloss: false });
    T(bx, by + 34, '0', 12, '#3a465c', 'left', 800); T(bx + bw, by + 34, String(T_MAX) + ' °C', 12, '#3a465c', 'right', 800);
    ctx.fillStyle = '#b8420f'; ctx.fillRect(bx + bw * tc / T_MAX - 1.5, by - 5, 3, 26); T(bx + bw * tc / T_MAX, by - 9, String(tc), 12, '#b8420f', 'center', 800);
    if (!PHONE) {
      panel(20, CUR.floor + 62, 430, 90, 14);
      textBlock(36, CUR.floor + 90, 398, c.T >= tc ? METAL[c.metal].replace('(밥솥 감온 자석)', '') + '은(는) 퀴리 온도 ' + tc + ' °C 이상이라 원자 자석이 흐트러져 강자성을 잃었어요.' : '퀴리 온도 ' + tc + ' °C보다 낮아서 도메인이 정렬을 유지해요. 온도를 올려 보세요.', 14.5, '#3a465c', 21, 800);
    }
    T(gx + gw / 2, gy + gh - 8, c.T >= tc ? '퀴리 온도 이상: 강자성이 사라져요' : '퀴리 온도 미만: 강자성 유지', PHONE ? 12.5 : 13.5, c.T >= tc ? '#b42318' : '#0f7a43', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ④ 짝짓기 · 하드디스크 ================= */
  const PURPOSE = [
    ['hard', '큰 자기장을 오래 유지', '스피커·전동기의 영구자석'],
    ['soft', '켜고 끌 수 있는 전자석 철심', '변압기 철심, 크레인'],
    ['rec', '정보를 기록하는 장치', '하드디스크, 카드 띠'],
    ['shield', '민감한 기기를 외부 자기장에서 보호', '자기 차폐'],
    ['sort', '고철 더미에서 철 캔만 골라내기', '재활용 선별'],
    ['dia', '자석 위에 물체 띄우기', '자기 부양'],
  ];
  const TYPE_ORDER = ['sort', 'rec', 'hard', 'dia', 'soft', 'shield'];
  const TYPES = {
    hard: ['경질 자성체', '자화가 오래 유지돼요'],
    soft: ['연질 자성체', '자화가 쉽게 생기고 쉽게 사라져요'],
    rec: ['자성 박막', '작은 영역마다 자화 방향이 달라요'],
    shield: ['연질 자성체 껍질', '자기장이 껍질을 따라 돌아 나가요'],
    sort: ['강자성체', '자석에 강하게 끌려요'],
    dia: ['반자성체', '자기장에서 밀려나요'],
  };
  const MC = PHONE ? { lx: 10, lw: 214, rx: 256, rw: 214, y0: 52, h: 60, gap: 70 } : { lx: 20, lw: 340, rx: 440, rw: 340, y0: 56, h: 60, gap: 76 };
  const pairColor = ['#7c5cff', '#14a058', '#f2873a', '#2f9bd6', '#e2464b', '#c2410c'];
  function drawMatch(dt) {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    T(MC.lx, 30, '사용 목적', 14, '#26324a', 'left', 800); T(MC.rx + MC.rw, 30, '자성체의 성질', 14, '#26324a', 'right', 800);
    S.hits = [];
    const used = {}; Object.keys(S.pair).forEach((k) => (used[S.pair[k]] = +k));
    // 연결선
    Object.keys(S.pair).forEach((k) => {
      const i = +k, j = TYPE_ORDER.indexOf(S.pair[k]), y1 = MC.y0 + i * MC.gap + MC.h / 2, y2 = MC.y0 + j * MC.gap + MC.h / 2;
      ctx.strokeStyle = S.pairBad[i] ? '#e2464b' : pairColor[i]; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const xa = MC.lx + MC.lw, xb = MC.rx;
      ctx.beginPath(); ctx.moveTo(xa, y1); ctx.bezierCurveTo(xa + (xb - xa) * 0.5, y1, xa + (xb - xa) * 0.5, y2, xb, y2); ctx.stroke();
    });
    PURPOSE.forEach((p, i) => {
      const y = MC.y0 + i * MC.gap, sel = S.pairSel === i, paired = S.pair[i] != null, bad = S.pairBad[i];
      const shake = S.pairShake[i] ? Math.sin((S.t - S.pairShake[i]) * 50) * 4 * Math.max(0, 1 - (S.t - S.pairShake[i]) / 0.4) : 0;
      D.shadow(() => { D.roundRect(MC.lx + shake, y, MC.lw, MC.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(MC.lx + shake, y, MC.lw, MC.h, 12); ctx.lineWidth = sel ? 4 : 2.4; ctx.strokeStyle = bad ? '#e2464b' : sel ? '#f26b3a' : paired ? pairColor[i] : '#dfe5ef'; ctx.stroke();
      const lines = wrap(p[1], MC.lw - 24, PHONE ? 13 : 14.5, 800);
      lines.forEach((l, li) => T(MC.lx + 12 + shake, y + (lines.length > 1 ? 22 : 28) + li * 17, l, PHONE ? 13 : 14.5, '#26324a', 'left', 800));
      T(MC.lx + 12 + shake, y + MC.h - 8, p[2], 11.5, '#7b8aa3', 'left', 700);
      if (sel) D.ring(MC.lx + MC.lw, y + MC.h / 2, 7, S.t, { color: '#f26b3a', width: 3 });
      D.sphere(MC.lx + MC.lw, y + MC.h / 2, 6, paired ? pairColor[i] : '#c9d1de', { gloss: false });
      S.hits.push({ x: MC.lx, y, w: MC.lw, h: MC.h, fn: () => { if (S.pair[i] != null) { delete S.pair[i]; delete S.pairBad[i]; S.pairSel = -1; } else S.pairSel = S.pairSel === i ? -1 : i; Sound.click(); } });
    });
    TYPE_ORDER.forEach((tk, j) => {
      const y = MC.y0 + j * MC.gap, owner = used[tk], taken = owner != null;
      D.shadow(() => { D.roundRect(MC.rx, y, MC.rw, MC.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(MC.rx, y, MC.rw, MC.h, 12); ctx.lineWidth = 2.4; ctx.strokeStyle = taken ? (S.pairBad[owner] ? '#e2464b' : pairColor[owner]) : (S.pairSel >= 0 ? '#f2873a' : '#dfe5ef'); if (!taken && S.pairSel >= 0) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(MC.rx + 14, y + 25, TYPES[tk][0], PHONE ? 14 : 15.5, '#26324a', 'left', 800);
      const sub = wrap(TYPES[tk][1], MC.rw - 28, PHONE ? 12 : 13, 700);
      sub.slice(0, 2).forEach((l, li) => T(MC.rx + 14, y + 44 + li * 15, l, PHONE ? 12 : 13, '#5a6679', 'left', 700));
      D.sphere(MC.rx, y + MC.h / 2, 6, taken ? pairColor[owner] : '#c9d1de', { gloss: false });
      S.hits.push({ x: MC.rx, y, w: MC.rw, h: MC.h, fn: () => {
        if (taken) { delete S.pair[owner]; delete S.pairBad[owner]; Sound.click(); return; }
        if (S.pairSel < 0) { showHint('먼저 왼쪽에서 사용 목적을 눌러요.', 2600); return; }
        S.pair[S.pairSel] = tk; delete S.pairBad[S.pairSel]; S.pairSel = -1; Sound.click();
      } });
    });
    const n = Object.keys(S.pair).length;
    T(VW / 2, VH - 14, '이은 짝 ' + n + ' / ' + PURPOSE.length, 14, '#c2410c', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  const DK = PHONE ? { x: 16, y: 262, cw: 56, ch: 74 } : { x: 336, y: 180, cw: 54, ch: 96 };
  function drawDisk(dt) {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    T(14, 30, '💾 하드디스크: 작은 영역의 자화 방향이 비트가 돼요', PHONE ? 13 : 16, '#26324a', 'left', 800);
    S.hits = [];
    // 원반
    const px = PHONE ? 112 : 150, py = PHONE ? 148 : 240, pr = PHONE ? 70 : 105;
    const dg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr); dg.addColorStop(0, '#e4e9f2'); dg.addColorStop(1, '#8e99ad');
    D.shadow(() => { ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fillStyle = dg; ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = 'rgba(70,82,105,.35)'; ctx.lineWidth = 1;
    for (let rr = pr * 0.3; rr < pr; rr += pr * 0.1) { ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.stroke(); }
    ctx.save(); ctx.translate(px, py); ctx.rotate(S.t * 2.2 * (RM ? 0 : 1)); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, pr * 0.7, -0.4, 0.4); ctx.stroke(); ctx.restore();
    D.sphere(px, py, pr * 0.12, '#394258', { gloss: false });
    // 헤드 팔
    const tx = px + pr * 0.52, ty = py - pr * 0.1;
    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + pr * 1.0, py - pr * 0.95); ctx.lineTo(tx, ty); ctx.stroke();
    D.sphere(tx, ty, 6, '#f2873a', { shadow: true });
    // 확대 연결선
    const sx0 = DK.x - 6, sy0 = DK.y, sw = DK.cw * 8 + 12, sh = DK.ch;
    ctx.save(); ctx.strokeStyle = 'rgba(38,50,74,.4)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx0, sy0 - 12); ctx.moveTo(tx, ty); ctx.lineTo(sx0, sy0 + sh + 12); ctx.stroke(); ctx.restore();
    // 확대된 트랙
    panel(sx0, sy0 - 12, sw, sh + 24, 12);
    // 읽기 헤드 이동
    S.head += dt * 1.6; const hi = Math.floor(S.head) % 8, hf = S.head % 1;
    S.bits.forEach((b, i) => {
      const x = DK.x + i * DK.cw, y = DK.y;
      D.roundRect(x + 2, y, DK.cw - 4, DK.ch, 8); ctx.fillStyle = b ? '#fff1dd' : '#e4eefc'; ctx.fill(); ctx.lineWidth = i === hi ? 3 : 1.6; ctx.strokeStyle = i === hi ? '#f26b3a' : '#b9c1d0'; ctx.stroke();
      const cx = x + DK.cw / 2;
      if (b) D.arrow(cx, y + DK.ch - 16, cx, y + 16, { color: '#f2873a', width: 6, head: 16 }); else D.arrow(cx, y + 16, cx, y + DK.ch - 16, { color: '#2f6df6', width: 6, head: 16 });
      T(cx, y + DK.ch + 36, String(b), 17, b ? '#b8420f' : '#1d4ed8', 'center', 800);
      S.hits.push({ x: x + 2, y, w: DK.cw - 4, h: DK.ch, fn: () => { S.bits[i] = S.bits[i] ? 0 : 1; Sound.click(); parts.burst(cx, y + DK.ch / 2, { count: 6, speed: 90, size: 3, colors: ['#ffd447', '#f26b3a'], gravity: 150 }); } });
    });
    // 읽기 헤드
    const hx = DK.x + (hi + 0.5) * DK.cw;
    ctx.fillStyle = '#4a5568'; ctx.beginPath(); ctx.moveTo(hx, DK.y - 10); ctx.lineTo(hx - 12, DK.y - 36); ctx.lineTo(hx + 12, DK.y - 36); ctx.closePath(); ctx.fill();
    T(hx, DK.y - 42, '읽기 헤드', 12, '#4a5568', 'center', 800);
    // 비트열
    const val = S.bits.reduce((s, b) => s * 2 + b, 0);
    const iy = DK.y + DK.ch + 56;
    panel(DK.x - 6, iy, DK.cw * 8 + 12, PHONE ? 108 : 110, 14);
    T(DK.x + 8, iy + 26, '기록된 비트 (↑ = 1, ↓ = 0)', 13.5, '#26324a', 'left', 800);
    T(DK.x + 8, iy + 58, S.bits.join(' '), PHONE ? 22 : 26, '#26324a', 'left', 800);
    T(DK.x + DK.cw * 8 - 4, iy + 58, '십진수 ' + val, PHONE ? 15 : 17, '#c2410c', 'right', 800);
    T(DK.x + 8, iy + 90, '목표 비트: ' + BIT_GOAL.join(' '), 13.5, diskOK() ? '#0f7a43' : '#5a6679', 'left', 800);
    if (diskOK()) D.check(DK.x + DK.cw * 8 - 14, iy + 88, 12, 1);
    // 헤드가 읽는 값
    T(VW - 14, PHONE ? 98 : 122, '지금 읽는 칸: ' + (hi + 1) + '번 → ' + S.bits[hi], 13.5, '#3a465c', 'right', 800);
    parts.update(dt); parts.draw(ctx);
  }
  const diskOK = () => S.bits.every((b, i) => b === BIT_GOAL[i]);

  /* ---------- 포인터 ---------- */
  function hitAt(p) { for (let i = S.hits.length - 1; i >= 0; i--) { const h = S.hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'obs') {
        const s = pickSample(p);
        if (s) { S.press = { id: s.id, x: p.x, y: p.y, moved: false, wasSlot: s.mode === 'slot' }; S.drag = { id: s.id, x: p.x, y: p.y }; if (s.mode === 'slot') { S.slot = null; s.mode = 'home'; S.pend.target = 0; S.dwell = 0; } return true; }
        return false;
      }
      const h = hitAt(p); if (h) { S.press = { hit: h, x: p.x, y: p.y }; return true; }
      return false;
    },
    move(p) {
      if (S.drag) { S.drag.x = p.x; S.drag.y = p.y; if (S.press && Math.hypot(p.x - S.press.x, p.y - S.press.y) > 8) S.press.moved = true; }
    },
    up(p) {
      if (S.mode === 'obs' && S.drag) {
        const id = S.drag.id, moved = S.press && S.press.moved;
        S.drag = null;
        if (!moved) { if (!(S.press && S.press.wasSlot)) putInSlot(id); }          // 눌러서 옮기기
        else if (inZone(p)) putInSlot(id);                                              // 놓은 자리(포인터 위치)가 점선 칸 안
        else { if (S.slot === id) releaseSlot(); S.samples[id].mode = 'home'; }
        S.press = null; return;
      }
      if (S.press && S.press.hit && Math.hypot(p.x - S.press.x, p.y - S.press.y) < 12) S.press.hit.fn();
      S.press = null;
    },
    hover(p) {
      if (S.mode === 'obs') return pickSample(p) ? 'grab' : 'default';
      return hitAt(p) ? 'pointer' : 'default';
    },
  });

  /* ---------- 컨트롤 연결 ---------- */
  $('#bMag').addEventListener('click', () => { S.mag = !S.mag; Sound.click(); updateCtl(); });
  $$('#matSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.m.mat = b.dataset.v; S.m.a = 0; S.m.len = 0; S.mSettle = 0; updateCtl(); }));
  $$('#fldSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.m.on = b.dataset.v === '1'; updateCtl(); }));
  $$('#rodSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.k.rod = b.dataset.v; S.k.on = false; S.k.a = 0; updateCtl(); }));
  $$('#curSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.k.on = b.dataset.v === '1'; updateCtl(); }));
  $$('#metSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.metal = b.dataset.v; updateCtl(); }));
  $('#sTemp').addEventListener('input', (e) => { S.c.Tset = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bClearCls').addEventListener('click', () => { Sound.click(); S.cls = {}; S.clsBad = {}; });
  $('#bClearPair').addEventListener('click', () => { Sound.click(); S.pair = {}; S.pairBad = {}; S.pairSel = -1; });
  $('#bClearDisk').addEventListener('click', () => { Sound.click(); S.bits = S.bits.map(() => 0); });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const sp = S.slot ? SAMPLES[S.slot] : null;
    if (S.mode === 'obs') {
      L1 = '전자석'; a = S.mag ? '켜짐' : '꺼짐';
      L2 = '확인한 시료'; b = OBS10.filter((id) => S.tested[id]).length + ' / ' + OBS10.length;
      L3 = '지금 시료'; c = sp ? sp.name + ' · ' + reactOf(sp.id) : '—';
    } else if (S.mode === 'model') {
      L1 = '물질'; a = KIND[S.m.mat];
      L2 = '외부 자기장'; b = S.m.on ? '켜짐 (→)' : '꺼짐';
      L3 = '자화 정도'; c = pct(S.Mdraw || 0);
    } else if (S.mode === 'scale') {
      L1 = '분류한 시료'; a = SCALE8.filter((id) => S.cls[id]).length + ' / ' + SCALE8.length;
      L2 = '가장 큰 끌림'; b = fmtMg(Math.max.apply(null, SCALE8.map((id) => SAMPLES[id].mg)));
      L3 = '가장 큰 밀림'; c = fmtMg(Math.min.apply(null, SCALE8.map((id) => SAMPLES[id].mg)));
    } else if (S.mode === 'keep') {
      L1 = '막대'; a = S.k.rod === 'soft' ? '순철 (연질)' : '강철 (경질)';
      L2 = '자화 정도'; b = pct(S.k.M || 0);
      L3 = '붙은 클립'; c = (S.k.n || 0) + ' / ' + CLIPS + '개';
    } else if (S.mode === 'curie') {
      L1 = '온도'; a = Math.round(S.c.T) + ' °C';
      L2 = '퀴리 온도'; b = METAL[S.c.metal].replace('(밥솥 감온 자석)', '') + ' ' + TC[S.c.metal] + ' °C';
      L3 = '자석에 붙는가'; c = S.c.fell ? '떨어짐' : '붙음';
    } else if (S.mode === 'match') {
      L1 = '이은 짝'; a = Object.keys(S.pair).length + ' / ' + PURPOSE.length;
      L2 = '고른 목적'; b = S.pairSel >= 0 ? PURPOSE[S.pairSel][1] : '—';
      L3 = '남은 목적'; c = (PURPOSE.length - Object.keys(S.pair).length) + '개';
    } else {
      L1 = '기록된 비트'; a = S.bits.join('');
      L2 = '십진수'; b = String(S.bits.reduce((s, x) => s * 2 + x, 0));
      L3 = '목표'; c = BIT_GOAL.join('') + (diskOK() ? ' ✅' : '');
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const nTested = () => OBS10.filter((id) => S.tested[id]).length;
  const CLS_ANS = { fer: 'fer', par: 'par', dia: 'dia' };
  const levels = [
    {
      title: '자석에 붙는 금속, 안 붙는 금속', short: '자석 반응', icon: '🧲', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 자석에 붙는 금속과 안 붙는 금속은 무엇이 다를까? 안 붙는 물질은 자기장에 아무 반응이 없을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 전자의 움직임이 전류를 이루고, 전류가 흐르는 코일이 <b>전자석</b>이 되어 자기장을 만든다고 배웠어요. 이번에는 그 자기장 속에 여러 물질을 놓았을 때 어떻게 되는지 알아봐요.</div>' +
        '<p>강한 전자석 앞에 <b>실로 매단 시료 10개</b>를 하나씩 가져가 어떻게 되는지 관찰해요.</p>',
      features: ['obs'],
      setup() { resetObs(); S.tested = {}; setScene('obs'); },
      recap: '철·니켈 같은 일부 물질만 자석에 강하게 끌려요. 나머지는 자석에 붙지 않아 반응이 없어 보이지만, 정말 아무 반응이 없는지는 더 정밀하게 살펴봐야 해요.',
      summary: '<ul><li>강한 전자석 앞에서 <b>철 못 · 니켈 동전 · 종이 클립(강철)</b>은 강하게 끌려와 붙었어요.</li><li>알루미늄 호일 · 구리선 · 마그네슘 · 연필심 · 물방울 · 유리 · 나무는 <b>눈에 띄는 반응이 없었어요</b>.</li><li>“금속이면 자석에 붙는다”는 생각은 맞지 않아요. 구리선과 알루미늄 호일도 금속이지만 붙지 않아요.</li></ul>',
      missions: [
        {
          title: '시료 10개 반응 확인하기',
          goal: '전자석을 <b>켠 채로</b> 시료 10개를 하나씩 점선 칸에 매달아 <b>반응을 확인</b>하세요.',
          hint: '시료를 끌어 점선 칸에 놓거나 시료를 눌러 보세요. 시료가 가만히 있을 때까지 1초쯤 기다리면 확인돼요. 전자석이 꺼져 있다면 켜 주세요.',
          setup() { setScene('obs'); },
          check: () => nTested() === OBS10.length,
          hold: 0.5,
          status: () => '확인한 시료 ' + nTested() + ' / ' + OBS10.length + ' ' + mark(nTested() === OBS10.length) + '<br>' + OBS10.map((id) => (S.tested[id] ? (S.tested[id] === 'stick' ? '🧲' : '➖') : '⬜')).join(' '),
          explain: '<b>철 못 · 니켈 동전 · 종이 클립</b> 세 개만 전자석 쪽으로 끌려와 붙고, 나머지 일곱 개는 눈에 띄는 반응이 없어요. 구리선과 알루미늄 호일도 금속이지만 붙지 않으니 “금속이면 자석에 붙는다”는 생각은 맞지 않아요.',
        },
        {
          type: 'quiz', title: '구리선과 알루미늄 호일은 왜 안 붙을까?',
          goal: '구리선과 알루미늄 호일이 전자석에 붙지 않은 까닭을 가장 알맞게 추측한 것은?',
          setup() { setScene('obs'); },
          choices: ['금속이 아니라서', '전기가 잘 통하는 물질은 자석에 붙지 않아서', '자석에 강하게 끌리는 물질은 철·니켈 같은 일부뿐이고, 나머지는 반응이 있다 해도 눈에 보이지 않을 만큼 약해서', '전자석의 세기가 약해서 모든 금속이 붙지 않아서'],
          answer: 2,
          feedback: ['구리와 알루미늄은 금속이에요. 금속인지 아닌지가 붙는 조건은 아니에요.', '철도 전기가 잘 통하지만 자석에 붙었어요. 전기가 통하는 정도와는 관계가 없어요.', '', '같은 전자석에 철 못과 니켈 동전은 붙었어요. 세기가 아니라 물질의 성질이 달라요.'],
          explain: '자석에 강하게 끌리는 물질은 <b>철 · 니켈 · 코발트</b> 등 일부예요. 다른 물질도 자기장에 반응할 수는 있지만 너무 약해서 눈으로는 보이지 않아요. 이 차이를 다음 단계에서 <b>원자 자석 모형</b>으로 알아봐요.',
        },
      ],
    },
    {
      title: '원자 자석과 자기 도메인', short: '원자 자석', icon: '🧩', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 철·니켈만 강하게 끌렸고 나머지는 반응이 보이지 않았어요. 정말 아무 반응이 없는 걸까요? 물질 속 <b>원자 자석</b>(전자의 운동이 만드는 아주 작은 자석)을 확대해서 봐요.</div>' +
        '<p>물질을 반응에 따라 세 가지로 나눠요.</p><ul><li><b>강자성체</b>: 자기장 방향으로 <b>강하게</b> 자화돼요 (철, 니켈, 코발트).</li><li><b>상자성체</b>: 같은 방향으로 <b>약하게</b> 자화돼요 (알루미늄, 마그네슘, 산소).</li><li><b>반자성체</b>: <b>반대 방향</b>으로 약하게 자화돼요 (구리, 금, 물, 흑연).</li></ul>',
      features: ['model'],
      setup() { S.m = { mat: 'fer', on: false, a: 0, len: 0 }; S.mc = { fer: {}, par: {}, dia: {} }; S.mSettle = 0; S.showCards = false; resetCards(); setScene('model'); },
      recap: '원자 자석이 외부 자기장에 반응하는 방식이 달라서 강자성체·상자성체·반자성체로 나뉘어요. 강자성체는 도메인이 크게 정렬하고 자기장을 없애도 정렬이 남을 수 있어요.',
      summary: '<ul><li>물질 속에는 전자가 만드는 <b>원자 자석</b>이 있어요. 자기장이 없으면 방향이 제각각이라 서로 상쇄돼요.</li><li><b>강자성체</b>: 원자 자석이 같은 방향인 작은 영역(<b>자기 도메인</b>)이 외부 자기장 방향으로 크게 정렬해요. 자기장을 없애도 정렬이 남을 수 있어요.</li><li><b>상자성체</b>: 같은 방향으로 약하게 정렬하고, 자기장을 없애면 흐트러져 사라져요.</li><li><b>반자성체</b>: 반대 방향으로 약하게 자화되어 자석에서 밀려나요.</li></ul>',
      missions: [
        {
          title: '세 물질에 자기장 걸어 보기',
          goal: '강자성체 · 상자성체 · 반자성체를 하나씩 고르고, 외부 자기장을 <b>켰다가 끄세요</b>.',
          hint: '물질을 고르고 자기장 켜기를 누른 뒤 1초쯤 기다리고, 끄기를 눌러 모형이 안정될 때까지 보세요. 세 물질 모두 해 보세요.',
          setup() { S.mc = { fer: {}, par: {}, dia: {} }; S.mSettle = 0; setScene('model'); },
          check: () => S.mc.fer.off && S.mc.par.off && S.mc.dia.off,
          hold: 0.4,
          status: () => mark(S.mc.fer.off) + ' 강자성체 &nbsp; ' + mark(S.mc.par.off) + ' 상자성체 &nbsp; ' + mark(S.mc.dia.off) + ' 반자성체',
          explain: '강자성체는 자기장을 켜면 자화 정도가 거의 <b>+100 %</b>까지 올라가고, 끈 뒤에도 정렬이 많이 <b>남아요</b>. 상자성체는 약하게 <b>같은 방향(+)</b>으로 정렬했다가 끄면 <b>0</b>으로 돌아가요. 반자성체는 <b>반대 방향(−)</b>으로 약하게 자화됐다가 끄면 <b>0</b>이 돼요.',
        },
        {
          title: '모형 카드 연결하기', manual: true,
          goal: '세 물질에 알맞은 설명을 골라 연결한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '모형에서 원자 자석 막대의 방향과 자기장을 껐을 때를 떠올려 보세요. 빨강이 N극 쪽이에요.',
          setup() { S.showCards = true; resetCards(); setScene('model'); updateCtl(); },
          check() {
            const miss = CARDS.filter((c) => !S.cardSel[c[0]]);
            if (miss.length) return '아직 고르지 않은 물질이 ' + miss.length + '개 있어요.';
            let bad = 0;
            CARDS.forEach((c, i) => {
              const ok = S.cardSel[c[0]] === CARD_ANS[c[0]];
              if (!ok) bad++;
              if (!ok && S.cardOK[c[0]] !== false) { cardSels[i].classList.remove('ok', 'bad'); void cardSels[i].offsetWidth; cardSels[i].classList.add('bad'); }
              if (ok) { cardSels[i].classList.remove('bad'); cardSels[i].classList.add('ok'); }
              S.cardOK[c[0]] = ok;
            });
            return bad ? '빨간 칸을 다시 골라 보세요. 모형에서 자기장을 켰다 끌 때의 모습을 비교해 보세요.' : true;
          },
          status: () => '고른 물질 ' + CARDS.filter((c) => S.cardSel[c[0]]).length + ' / ' + CARDS.length,
          explain: '<b>강자성체</b>는 도메인이 같은 방향으로 크게 정렬해서 자기장을 없애도 정렬이 남아요. <b>상자성체</b>는 같은 방향으로 약하게 정렬하다가 자기장을 없애면 열운동으로 흐트러져요. <b>반자성체</b>는 반대 방향으로 약하게 자화돼요.',
        },
        {
          type: 'quiz', title: '자석에 붙었다 떼어 낸 못',
          goal: '강철 못을 강한 자석에 붙였다 떼어 내도 다른 못을 붙일 수 있었어요. 그 까닭은?',
          setup() { S.showCards = false; setScene('model'); updateCtl(); },
          choices: ['못이 자석의 철가루를 흡수해서', '자기장을 없애도 도메인의 정렬이 많이 남아 있어서', '못의 원자가 새로 만들어져서', '못이 전기를 띠어서'],
          answer: 1,
          feedback: ['철가루가 스며드는 것이 아니에요. 못 속의 원자 자석 배열이 바뀐 거예요.', '', '원자가 새로 만들어지지 않아요. 원자 자석의 방향이 달라진 거예요.', '전기를 띠는 것과는 관계가 없어요. 자기적 성질의 변화예요.'],
          explain: '강자성체(경질)는 외부 자기장에서 도메인이 정렬한 뒤, 자기장을 없애도 정렬이 <b>오래 남아요</b>. 그래서 못이 스스로 약한 자석이 되어 다른 못을 붙일 수 있어요.',
        },
      ],
    },
    {
      title: '정밀 측정으로 자성체 분류하기', short: '분류', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 종류의 자성체가 자기장에 서로 다르게 반응하는 모습을 모형으로 봤어요. 실제 시료에서도 그 차이가 나타날까요?</div>' +
        '<p>정밀 저울로 강한 전자석 앞 시료의 <b>겉보기 무게 변화</b>를 재요(mg, <b>+ 끌림, − 밀림</b>). 값으로 시료 8개를 분류하고, 자화가 남는지(연질/경질), 가열하면 어떻게 되는지(퀴리 온도)도 실험해요.</p>',
      features: ['lab'],
      setup() { S.cls = {}; S.clsBad = {}; S.k.rod = 'soft'; S.k.on = false; S.k.a = 0; S.k.seen = {}; initClips(); S.c = { metal: 'iron', Tset: T_ROOM, T: T_ROOM, a: A_FER_ON, dis: 0, y: curY0(), vy: 0, fell: false, done: {} }; setScene('scale'); },
      recap: '저울 값이 큰 +이면 강자성체, 작은 +이면 상자성체, −이면 반자성체예요. 연질 자성체는 자화가 금세 사라지고 경질은 오래 유지돼요. 강자성체는 퀴리 온도 이상에서 강자성을 잃어요.',
      summary: '<ul><li>저울 값: 큰 <b>+</b>(수백~수천 mg) → <b>강자성체</b> · 작은 <b>+</b>(1 mg 안팎) → <b>상자성체</b> · <b>−</b> → <b>반자성체</b>(물방울도 아주 약하게 밀려요).</li><li><b>연질 자성체</b>(순철, 변압기 철심): 자기장을 없애면 자화가 금세 사라져요. <b>경질 자성체</b>(강철, 네오디뮴, 영구자석): 자화가 오래 유지돼요.</li><li><b>퀴리 온도</b>: 강자성이 사라지는 온도. 철 ' + TC.iron + ' °C, 니켈 ' + TC.nickel + ' °C, 밥솥 감온 자석(페라이트) ' + TC.ferrite + ' °C.</li></ul>',
      missions: [
        {
          title: '시료 8개 분류하기', manual: true,
          goal: '저울 값을 보고 시료 8개를 <b>강 · 상 · 반자성체</b>로 분류한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '큰 + 값은 강자성체, 1 mg 안팎의 작은 + 값은 상자성체, − 값은 반자성체예요. 오른쪽 칸을 누를 때마다 분류가 바뀌어요.',
          setup() { setScene('scale'); },
          check() {
            const miss = SCALE8.filter((id) => !S.cls[id]);
            if (miss.length) return '아직 분류하지 않은 시료가 ' + miss.length + '개 있어요.';
            let bad = 0;
            SCALE8.forEach((id) => {
              const ok = S.cls[id] === SAMPLES[id].kind;
              if (!ok) { bad++; if (!S.clsBad[id]) { S.clsBad[id] = true; S.clsShake[id] = S.t; } } else delete S.clsBad[id];
            });
            return bad ? '빨간 테두리 시료를 다시 분류해 보세요. 부호(+/−)와 크기를 함께 보세요.' : true;
          },
          status: () => '분류한 시료 ' + SCALE8.filter((id) => S.cls[id]).length + ' / ' + SCALE8.length,
          explain: '<b>철 못(+2500)·니켈 동전(+900)</b>은 큰 + 값 → 강자성체, <b>알루미늄 호일(+0.8)·마그네슘 리본(+0.5)</b>은 작은 + 값 → 상자성체예요. <b>구리선·연필심·물방울·비스무트</b>는 − 값이라 자석에서 밀려나는 반자성체예요. 물방울도 아주 약하게(−0.2 mg) 밀려나요.',
        },
        {
          title: '자화 유지와 퀴리 온도 실험',
          goal: '① 순철과 강철을 각각 <b>전류 켜기 → 끄기</b> ② 철을 <b>' + TC.iron + ' °C 이상</b>으로 가열해서 떨어뜨리기',
          hint: '자화 유지 화면에서 막대를 고르고 전류를 켰다가 끄세요. 퀴리 온도 화면에서는 철을 고르고 온도를 ' + TC.iron + ' °C 이상으로 올리세요.',
          setup() { S.k.seen = {}; S.c.done = {}; setScene('keep'); },
          check: () => S.k.seen.softOff && S.k.seen.hardOff && S.c.done.iron,
          hold: 0.4,
          status: () => mark(S.k.seen.softOff) + ' 순철(연질) &nbsp; ' + mark(S.k.seen.hardOff) + ' 강철(경질) &nbsp; ' + mark(S.c.done.iron) + ' 철 ' + TC.iron + ' °C 이상',
          explain: '<b>순철</b>은 전류를 끄면 정렬이 거의 사라져 클립이 모두 떨어지는 <b>연질 자성체</b>예요. <b>강철</b>은 전류를 꺼도 자화가 남아 클립이 일부 붙어 있는 <b>경질 자성체</b>예요. 철은 <b>' + TC.iron + ' °C</b> 이상에서 원자 자석의 정렬이 무너져 자석에서 떨어져요.',
        },
        {
          type: 'quiz', title: '밥이 다 되면 떨어지는 자석',
          goal: '전기밥솥은 밥이 다 되어 온도가 올라가면 감온 자석이 떨어져 가열이 멈춰요. 이때 일어나는 일은?',
          setup() { setScene('curie'); },
          choices: ['자석의 N극과 S극이 서로 바뀌어서', '자석이 퀴리 온도(' + TC.ferrite + ' °C) 이상이 되어 강자성을 잃고 끌리지 않게 되어서', '자석이 녹아 버려서', '밥에서 나온 수증기가 자석을 밀어내서'],
          answer: 1,
          feedback: ['극이 바뀌는 것이 아니에요. 자석에 끌리는 성질 자체가 사라져요.', '', ' 자석이 녹는 온도는 훨씬 높아요. 자화가 사라지는 온도가 문제예요.', '수증기가 밀어내는 것이 아니에요. 온도 때문에 자성이 사라져요.'],
          explain: '감온 자석(페라이트)의 <b>퀴리 온도는 ' + TC.ferrite + ' °C</b>예요. 밥이 다 되어 온도가 이를 넘으면 <b>강자성을 잃어</b> 스위치를 붙잡고 있던 자기력이 사라지고, 전기가 끊겨요.',
        },
      ],
    },
    {
      title: '자성체의 활용 찾기', short: '활용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자성체를 종류와 성질(연질·경질, 퀴리 온도)로 나눴어요. 이 성질들이 일상과 산업에서 어떻게 쓰이는지 찾아봐요.</div>' +
        '<p>사용 목적과 알맞은 자성체의 성질을 짝지어 보고, 하드디스크에서는 <b>작은 영역의 자화 방향</b>이 어떻게 정보가 되는지 확대해서 살펴봐요.</p>',
      features: ['app'],
      setup() { S.pair = {}; S.pairBad = {}; S.pairSel = -1; S.bits = S.bits.map(() => 0); setScene('match'); },
      recap: '경질 자성체는 영구자석과 기록 매체에, 연질 자성체는 전자석·변압기 철심과 자기 차폐에 쓰여요. 하드디스크는 작은 영역의 자화 방향(↑ ↓)을 1과 0으로 저장해요.',
      summary: '<ul><li><b>경질 자성체</b>: 스피커·전동기의 영구자석. <b>연질 자성체</b>: 전자석 철심, 변압기 철심, 자기 차폐.</li><li><b>자기 기록</b>: 하드디스크·카드 띠는 작은 영역의 자화 방향 ↑ ↓ = 1 0으로 정보를 저장하고, 읽기 헤드가 감지해요.</li><li><b>강자성체 선별</b>: 철 캔은 자석에 붙고 알루미늄 캔은 붙지 않아요. <b>반자성 부양</b>: 반자성체가 강한 자석 위에 뜰 수 있어요.</li></ul>',
      missions: [
        {
          title: '목적에 맞는 자성체 짝짓기', manual: true,
          goal: '여섯 가지 사용 목적에 알맞은 자성체의 성질을 이은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“켜고 끄기”와 “보호”는 둘 다 연질이지만, 철심은 자화가 쉽게 변하고 차폐는 자기장을 껍질이 끌어가요. 영구자석은 경질이에요.',
          setup() { setScene('match'); },
          check() {
            const n = Object.keys(S.pair).length;
            if (n < PURPOSE.length) return '아직 잇지 않은 목적이 ' + (PURPOSE.length - n) + '개 있어요.';
            let bad = 0;
            PURPOSE.forEach((p, i) => { const ok = S.pair[i] === p[0]; if (!ok) { bad++; if (!S.pairBad[i]) { S.pairBad[i] = true; S.pairShake[i] = S.t; } } else delete S.pairBad[i]; });
            return bad ? '빨간 선을 다시 이어 보세요. 목적에 필요한 성질을 먼저 생각해 보세요.' : true;
          },
          status: () => '이은 짝 ' + Object.keys(S.pair).length + ' / ' + PURPOSE.length,
          explain: '<b>영구자석</b>은 자화가 오래 유지되는 경질, <b>전자석·변압기 철심</b>은 자화가 쉽게 생기고 쉽게 사라지는 연질이어야 전류에 따라 자기장이 잘 변해요. <b>자기 차폐</b>는 연질 자성체 껍질이 자기장을 끌어가 안쪽을 보호해요. <b>철 캔 선별</b>은 강자성체의 성질, <b>자기 부양</b>은 반자성체의 성질이에요.',
        },
        {
          title: '하드디스크에 비트 기록하기',
          goal: '칸을 눌러 자화 방향을 바꿔서 목표 비트 <b>' + BIT_GOAL.join(' ') + '</b>을(를) 기록하세요. (↑ = 1, ↓ = 0)',
          hint: '목표가 ' + BIT_GOAL.join(' ') + '이니 1인 칸은 ↑로, 0인 칸은 ↓로 바꿔요. 칸을 누를 때마다 방향이 바뀌어요.',
          setup() { setScene('disk'); },
          check: () => diskOK(),
          hold: 0.5,
          status: () => '기록 ' + S.bits.join('') + ' / 목표 ' + BIT_GOAL.join('') + ' ' + mark(diskOK()),
          explain: '하드디스크 표면의 아주 작은 영역은 <b>위(↑) 또는 아래(↓)</b>로 자화돼요. ↑를 1, ↓를 0으로 정하면 8칸이 한 바이트의 정보가 돼요. 이 예에서 ' + BIT_GOAL.join('') + '은 십진수 ' + BIT_GOAL.reduce((s, b) => s * 2 + b, 0) + '이에요. 읽기 헤드가 칸마다 자화 방향을 감지해 정보를 읽어요.',
        },
        {
          type: 'quiz', title: '신용카드를 강한 자석에 가까이 하면?',
          goal: '신용카드의 자기 띠를 강한 자석에 가까이 하면 안 되는 까닭은?',
          setup() { setScene('disk'); },
          choices: ['카드가 자석에 달라붙어서', '자기 띠의 작은 영역들의 자화 방향이 외부 자기장 때문에 바뀌어 기록된 정보가 지워지거나 달라질 수 있어서', '카드가 전기를 띠어서', '카드의 플라스틱이 녹아서'],
          answer: 1,
          feedback: ['카드가 붙는 것이 아니에요. 문제는 기록된 정보예요.', '', '전기를 띠는 문제가 아니에요. 자기 기록이 바뀌는 문제예요.', '자석은 플라스틱을 녹이지 않아요.'],
          explain: '자기 띠에는 작은 영역의 자화 방향(↑ ↓)으로 정보가 기록돼 있어요. <b>강한 외부 자기장</b>이 닿으면 그 방향이 바뀌어 정보가 지워지거나 달라질 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-magnetic-materials', mount: '#game', badge: '자성체 탐험가', homeHref: '../../index.html#hp',
    featureLabels: { obs: '🧲 전자석 · 매다는 시료 10개', model: '🧩 원자 자석 모형 (확대)', lab: '⚖️ 저울 분류 · 자화 유지 · 퀴리 온도', app: '🔗 활용 짝짓기 · 하드디스크' },
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
    // 상태 갱신은 보이지 않는 화면에서도 이어져요
    stepObs(dt); stepModel(dt); stepKeep(dt); stepCurie(dt);
    view.apply();
    if (S.mode === 'obs') drawObs(dt);
    else if (S.mode === 'model') drawModel(dt);
    else if (S.mode === 'scale') drawScale(dt);
    else if (S.mode === 'keep') drawKeep(dt);
    else if (S.mode === 'curie') drawCurie(dt);
    else if (S.mode === 'match') drawMatch(dt);
    else drawDisk(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SAMPLES, OBS10, SCALE8, TC, PURPOSE, TYPE_ORDER, BIT_GOAL, CARD_ANS, THC, ZONE, AX, YM, get game() { return game; }, setScene, putInSlot, homeOf, updateCtl, magnetization, MofA,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepObs(0.02); stepModel(0.02); stepKeep(0.02); stepCurie(0.02); } },
  };
})();
