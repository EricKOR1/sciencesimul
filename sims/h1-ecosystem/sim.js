/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 생태계의 구성요소 (단원 1차시)
   성취기준 [10통과2-02-01] 생태계 구성요소를 이해하고 생물과 환경 사이의 상호 관계를 설명할 수 있다.
   ① 관찰: 생태계 구성 (숲에서 구성요소 찾기, 개체 → 개체군 → 군집 → 생태계)
   ② 실험: 환경 → 생물 (빛의 세기와 광합성량, 생물의 적응)
   ③ 실험: 생물 → 환경 (맨땅·숲속 측정, 지렁이, 낙엽 분해)
   ④ 설명: 상호 관계 (연못 사례 12장을 작용·반작용·상호 작용으로 분류)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const SC = 0.6;                       // 휴대폰에서 그림 장면(800x560)을 줄이는 비율
  const SH = Math.round(560 * SC);      // 줄인 장면의 높이(336)
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf6ff' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    if (o.sx || o.sy) ctx.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function tag(x, y, text, color, scale, size) {
    ctx.save(); ctx.font = D.font(size || 13, 800);
    const w = ctx.measureText(text).width + 18;
    ctx.restore();
    const cx = clamp(x, w / 2 + 4, VW - w / 2 - 4);
    ctx.save(); ctx.translate(cx, y); ctx.scale(scale == null ? 1 : scale, scale == null ? 1 : scale);
    D.label(0, 0, text, { bg: color, size: size || 13 });
    ctx.restore();
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const sceneOn = () => { ctx.save(); if (PHONE) ctx.scale(SC, SC); };
  const sceneOff = () => ctx.restore();
  const toScene = (p) => (PHONE ? { x: p.x / SC, y: p.y / SC } : p);
  const toScreen = (x, y) => (PHONE ? { x: x * SC, y: y * SC } : { x, y });

  /* ---------- 공통 데이터 ---------- */
  const CAT = { prod: '생산자', cons: '소비자', dec: '분해자', abio: '비생물 요인' };
  const CAT_COLOR = { prod: '#16a34a', cons: '#d97706', dec: '#92400e', abio: '#2563eb' };
  const NEED_FIND = 10;               // 미션 1: 찾아야 하는 요소 수
  // 한여름 낮 맨땅과 숲속 (교육과정 예시 자료)
  const SITE = {
    bare: { name: '맨땅', temp: 35, hum: 40, light: 100 },
    forest: { name: '숲속', temp: 28, hum: 70, light: 15 },
  };
  // 빛의 세기와 광합성량(상대값)
  const LIGHT = [10, 25, 50, 75, 100];
  const SUNP = [5, 20, 45, 70, 90];
  const SHADEP = [25, 45, 50, 50, 50];
  // 지렁이 흙과 낙엽 분해 모형(단순화한 모의 값)
  const PLANT0 = 12, PLANT_NOWORM = 18, PLANT_WORM = 27;      // 식물의 키(cm): 처음 → 4주 뒤
  const LEAF_START = 100, LEAF_END = 20, NUT_START = 20, NUT_END = 80;   // 낙엽의 양(%), 토양 양분(%)

  /* ---------- 상태 ---------- */
  const S = { mode: 'forest', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { forest: '🌳 숲 생태계', stack: '🧱 개체 → 생태계', light: '☀️ 빛의 세기와 광합성', adapt: '🦊 환경에 적응한 생물', cmp: '🌡️ 맨땅 vs 숲속', worm: '🪱 지렁이와 흙', leaf: '🍂 낙엽 분해', pond: '🏞️ 연못 생태계' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHintNow(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function hideHintNow() { const h = $('#stageHint'); if (h) h.classList.add('hide'); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (S.light) {
      $('#sLight').value = S.light.i; $('#oLight').textContent = LIGHT[S.light.i] + ' %'; $('#sLight').style.setProperty('--pct', (S.light.i / 4 * 100) + '%');
      $('#bRecord').textContent = S.light.rec[S.light.i] ? '✔ 기록했어요 (다시 기록)' : '📌 이 값 기록하기';
    }
    if (S.cmp) {
      $('#bMeasBare').classList.toggle('done', !!S.cmp.bare.done); $('#bMeasForest').classList.toggle('done', !!S.cmp.forest.done);
      $('#bMeasBare').classList.toggle('on', S.cmp.at === 'bare' && !S.cmp.bare.done); $('#bMeasForest').classList.toggle('on', S.cmp.at === 'forest' && !S.cmp.forest.done);
    }
    if (S.worm) { $('#bWormRun').disabled = S.worm.st === 'run'; $('#bWormRun').textContent = S.worm.st === 'done' ? '▶ 다시 4주' : '▶ 4주 지나기'; }
    if (S.leaf) { $('#bLeafRun').disabled = S.leaf.st === 'run'; $('#bLeafRun').textContent = S.leaf.st === 'done' ? '▶ 다시 분해' : '▶ 분해 시작'; }
    if (S.pond) {
      const p = S.pond; $('#cardNo').textContent = (p.cur + 1) + ' / ' + CARDS.length;
      $$('#catRow button').forEach((b) => b.classList.toggle('on', p.ans[p.cur] === b.dataset.c));
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* =========================================================
     ① 숲 생태계: 구성요소 찾기
     ========================================================= */
  const FIT = [
    { id: 'tree', name: '나무', cat: 'prod' }, { id: 'grass', name: '풀', cat: 'prod' },
    { id: 'butterfly', name: '곤충(나비)', cat: 'cons' }, { id: 'bird', name: '새', cat: 'cons' }, { id: 'rabbit', name: '토끼', cat: 'cons' },
    { id: 'mush', name: '버섯', cat: 'dec' }, { id: 'germ', name: '세균', cat: 'dec' },
    { id: 'sun', name: '햇빛', cat: 'abio' }, { id: 'water', name: '물', cat: 'abio' }, { id: 'air', name: '공기', cat: 'abio' }, { id: 'soil', name: '토양', cat: 'abio' }, { id: 'thermo', name: '온도(온도계)', cat: 'abio' },
  ];
  const FBY = {}; FIT.forEach((f) => { FBY[f.id] = f; });
  const BIO_N = FIT.filter((f) => f.cat !== 'abio').length, ABIO_N = FIT.length - BIO_N;
  function resetForest() {
    S.forest = { found: {}, pop: {}, tag: {}, birdFly: -1, birdNext: 4, shake: 0 };
    FIT.forEach((f) => { S.forest.pop[f.id] = 0; });
  }
  const forestFound = () => FIT.filter((f) => S.forest.found[f.id]).length;
  const forestBio = () => FIT.filter((f) => S.forest.found[f.id] && f.cat !== 'abio').length;
  // 장면 좌표 (800x560)에서 요소의 현재 위치
  function fpos(id, t) {
    const F = S.forest;
    switch (id) {
      case 'sun': return { x: 690, y: 80, r: 54, ty: 150 };
      case 'air': return { x: 410, y: 108, r: 52, ty: 46 };
      case 'tree': return { x: 235, y: 190, r: 98, ty: 62 };
      case 'bird': {
        if (F.birdFly >= 0) { const u = F.birdFly; return { x: 318 + (1 - Math.cos(u * TAU)) * 70, y: 146 - Math.sin(u * Math.PI) * 70, r: 28, ty: 100 }; }
        return { x: 318, y: 146 + Math.sin(t * 3) * 1.2, r: 28, ty: 108 };
      }
      case 'butterfly': return { x: 470 + 82 * Math.sin(t * 0.55), y: 248 + 24 * Math.sin(t * 1.3 + 1), r: 28, ty: 0 };
      case 'grass': return { x: 490, y: 320, r: 74, ty: 276 };
      case 'rabbit': return { x: 648, y: 318, r: 30, ty: 274 };
      case 'mush': return { x: 346, y: 340, r: 24, ty: 304 };
      case 'water': return { x: 96, y: 354, r: 60, ty: 316 };
      case 'germ': return { x: 662, y: 470, r: 58, ty: 404 };
      case 'thermo': return { x: 758, y: 250, r: 52, ty: 206 };
      case 'soil': return { x: 330, y: 470, r: 90, ty: 410 };
    }
    return { x: 0, y: 0, r: 0, ty: 0 };
  }
  const FHIT_ORDER = ['bird', 'butterfly', 'rabbit', 'mush', 'germ', 'thermo', 'sun', 'tree', 'grass', 'water', 'air', 'soil'];
  function forestHit(p, t) {
    for (const id of FHIT_ORDER) {
      const q = fpos(id, t);
      let hit = false;
      if (id === 'tree') hit = Math.hypot(p.x - 235, p.y - 180) < 100 || (p.x > 218 && p.x < 252 && p.y > 270 && p.y < 345);
      else if (id === 'grass') hit = p.x > 395 && p.x < 590 && p.y > 292 && p.y < 350;
      else if (id === 'water') hit = Math.pow((p.x - 96) / 92, 2) + Math.pow((p.y - 354) / 30, 2) < 1;
      else if (id === 'air') hit = p.x > 300 && p.x < 520 && p.y > 56 && p.y < 160;
      else if (id === 'soil') hit = p.y > 376 && p.y < 560 && Math.hypot(p.x - 662, p.y - 470) > 60;
      else if (id === 'thermo') hit = p.x > 722 && p.x < 794 && p.y > 196 && p.y < 332;
      else hit = Math.hypot(p.x - q.x, p.y - q.y) < q.r;
      if (hit) return id;
    }
    return null;
  }
  function foundItem(id, t) {
    const F = S.forest, f = FBY[id], q = fpos(id, t);
    if (F.found[id]) { F.tag[id] = 3.2; Sound.tick(); return; }
    F.found[id] = true; F.tag[id] = 3.2; F.pop[id] = 0;
    SciSim.tween(F.pop, { [id]: 1 }, { duration: 0.5, ease: 'outBack' });
    Sound.success();
    const col = CAT_COLOR[f.cat];
    parts.burst(q.x, f.id === 'soil' || id === 'water' ? q.y - 10 : q.y, { count: 14, colors: [col, '#ffd24d', '#fff'], speed: 130, size: 3.5, life: 0.7, gravity: 160 });
    if (forestFound() === FIT.length) showHint('🎉 숲 생태계 구성요소를 모두 찾았어요!', 3600);
  }
  function drawCloud(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff';
    [[0, 0, 26], [28, -10, 30], [60, 0, 26], [30, 8, 28]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawForestScene(dt, t) {
    const F = S.forest;
    // 새 날개짓/비행
    if (!RM) {
      if (F.birdFly >= 0) { F.birdFly += dt / 3.2; if (F.birdFly >= 1) { F.birdFly = -1; F.birdNext = rnd(6, 10); } }
      else { F.birdNext -= dt; if (F.birdNext <= 0) F.birdFly = 0; }
    }
    D.sky(0, 0, 800, 340, '#aadcff', '#eaf7ff');
    // 해
    const sp = fpos('sun', t);
    D.glow(sp.x, sp.y, 120, '#ffe08a', 0.6);
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(RM ? 0 : t * 0.2);
    ctx.strokeStyle = 'rgba(255,196,40,.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r0 = 36, r1 = i % 2 ? 50 : 60; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
    D.sphere(sp.x, sp.y, 30, '#ffc83d', { gloss: false, light: '#fff3b0', dark: '#f59e0b' });
    // 구름
    const cx = ((t * 7) % 960) - 120; drawCloud(cx, 70, 0.9, 0.95);
    const cx2 = ((t * 4 + 500) % 960) - 120; drawCloud(cx2, 140, 0.65, 0.8);
    // 햇빛 줄기(나무 사이)
    ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = '#fff6c2';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sp.x - 18 + i * 20, sp.y + 30); ctx.lineTo(sp.x - 160 + i * 70, 340); ctx.lineTo(sp.x - 120 + i * 70, 340); ctx.lineTo(sp.x + 8 + i * 20, sp.y + 30); ctx.fill(); }
    ctx.restore();
    // 공기(바람)
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = ((t * 0.16 + i * 0.33) % 1), x0 = 320 + ph * 180, y0 = 80 + i * 32;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * Math.sin(ph * Math.PI)) + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x0 - 50, y0); ctx.bezierCurveTo(x0 - 20, y0 - 14, x0 + 10, y0 + 14, x0 + 40, y0 - 2); ctx.stroke();
    }
    ctx.restore();
    // 먼 언덕
    ctx.fillStyle = '#9fd9a2'; ctx.beginPath(); ctx.moveTo(0, 336); ctx.quadraticCurveTo(160, 270, 340, 322); ctx.quadraticCurveTo(540, 276, 800, 330); ctx.lineTo(800, 340); ctx.lineTo(0, 340); ctx.fill();
    // 땅
    const g = ctx.createLinearGradient(0, 330, 0, 380); g.addColorStop(0, '#79c46f'); g.addColorStop(1, '#4fa24f');
    ctx.fillStyle = g; ctx.fillRect(0, 332, 800, 44);
    const sg = ctx.createLinearGradient(0, 376, 0, 560); sg.addColorStop(0, '#9a7449'); sg.addColorStop(1, '#5e4630');
    ctx.fillStyle = sg; ctx.fillRect(0, 376, 800, 184);
    // 토양 알갱이/뿌리
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    for (let i = 0; i < 36; i++) { const px = (i * 97) % 790 + 5, py = 386 + (i * 53) % 165; ctx.beginPath(); ctx.arc(px, py, 2 + (i % 3), 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#7a5836'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[235, 376, 190, 430, 150, 470], [235, 376, 245, 440, 270, 500], [235, 376, 285, 420, 345, 445]].forEach((r) => { ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.quadraticCurveTo(r[2], r[3], r[4], r[5]); ctx.stroke(); });
    // 연못
    D.shadow(() => { ctx.fillStyle = '#4aa3df'; ctx.beginPath(); ctx.ellipse(96, 354, 90, 28, 0, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    const wg = ctx.createLinearGradient(0, 328, 0, 380); wg.addColorStop(0, '#8fd0f5'); wg.addColorStop(1, '#3f93d2');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(96, 354, 88, 26, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i * 0.5) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(70 + i * 40, 354 + i * 3, 10 + k * 26, 3 + k * 8, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // 나무
    const sway = RM ? 0 : Math.sin(t * 1.1) * 2;
    ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(214, 345); ctx.quadraticCurveTo(222, 280, 220, 220); ctx.lineTo(250, 220); ctx.quadraticCurveTo(250, 280, 258, 345); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(236, 230, 14, 112);
    ctx.save(); ctx.translate(235, 215); ctx.rotate(sway * 0.012);
    [[-50, -20, 62, '#3f9d4a'], [48, -26, 60, '#47a853'], [0, -78, 66, '#52b85c'], [-4, -18, 64, '#4aab55']].forEach((c) => D.sphere(c[0], c[1], c[2], c[3], { gloss: false }));
    ctx.restore();
    // 풀
    for (let i = 0; i < 6; i++) E('🌿', 410 + i * 32, 326 + Math.sin(t * 1.5 + i) * 1.5, 34, { rot: Math.sin(t * 1.4 + i) * 0.06 });
    E('🌼', 452, 316, 20); E('🌼', 548, 318, 20);
    // 버섯
    E('🍄', 346, 340, 36);
    // 토끼
    const rq = fpos('rabbit', t);
    E('🐇', rq.x, rq.y + Math.abs(Math.sin(t * 2.4)) * -3, 52, { flip: true });
    // 새
    const bq = fpos('bird', t);
    E('🐦', bq.x, bq.y, 38, { rot: F_birdTilt(), flip: S.forest.birdFly >= 0 && S.forest.birdFly < 0.5 });
    // 나비
    const nq = fpos('butterfly', t);
    E('🦋', nq.x, nq.y, 38, { sx: 0.75 + 0.25 * Math.abs(Math.sin(t * 9)), rot: Math.sin(t * 1.3) * 0.2 });
    // 온도계
    ctx.fillStyle = '#7a5230'; ctx.fillRect(754, 300, 8, 38);
    D.thermometer(758, 206, 90, SITE.forest.temp, 20, 40, { ticks: false });
    T(758, 190, SITE.forest.temp + ' °C', 14, '#7f1d1d', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
    // 돋보기 (흙 속 세균)
    const mg = fpos('germ', t);
    ctx.save(); ctx.beginPath(); ctx.arc(mg.x, mg.y, 56, 0, TAU); ctx.clip();
    const mgg = ctx.createRadialGradient(mg.x, mg.y, 10, mg.x, mg.y, 58); mgg.addColorStop(0, '#d9f1ff'); mgg.addColorStop(1, '#a8d8f5');
    ctx.fillStyle = mgg; ctx.fillRect(mg.x - 60, mg.y - 60, 120, 120);
    for (let i = 0; i < 7; i++) {
      const bx = mg.x + Math.sin(t * 0.7 + i * 1.9) * 34, by = mg.y + Math.cos(t * 0.6 + i * 2.3) * 32, ba = t * 0.8 + i;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ba); D.roundRect(-9, -4, 18, 8, 4); ctx.fillStyle = i % 2 ? '#b45309' : '#7c3aed'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(mg.x, mg.y, 56, 0, TAU); ctx.stroke();
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(mg.x + 40, mg.y + 40); ctx.lineTo(mg.x + 60, mg.y + 62); ctx.stroke();
    T(mg.x, mg.y + 78, '🔍 흙 속 확대', 13, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 4 });
    // 지렁이(장식)
    E('🪱', 150 + Math.sin(t * 0.5) * 20, 520, 26, { rot: Math.sin(t) * 0.1 });
    parts.update(dt); parts.draw(ctx);
  }
  const F_birdTilt = () => (S.forest.birdFly >= 0 ? Math.sin(S.clock * 14) * 0.2 : 0);
  // 이름표는 화면 좌표로 그려서 휴대폰에서도 크기가 일정하게
  function drawForestTags(t) {
    const F = S.forest;
    FIT.forEach((f) => {
      if (!F.found[f.id]) return;
      const q = fpos(f.id, t);
      let ty = q.ty; if (f.id === 'butterfly') ty = q.y - 38; if (f.id === 'bird') ty = q.y - 40;
      const s = toScreen(q.x, ty);
      tag(s.x, s.y, PHONE ? f.name : f.name + ' · ' + CAT[f.cat], CAT_COLOR[f.cat], clamp(F.pop[f.id], 0, 1.15), PHONE ? 12.5 : 13);
    });
  }
  function drawForestPanel() {
    // 휴대폰: 장면 아래 12칸 목록
    const F = S.forest, y0 = SH + 12;
    const cw = 112, ch = 44, gx = 6;
    FIT.forEach((f, i) => {
      const x = 10 + (i % 4) * (cw + gx), y = y0 + Math.floor(i / 4) * (ch + 8);
      const got = F.found[f.id];
      D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = got ? CAT_COLOR[f.cat] : '#dbe4ee'; ctx.fill();
      T(x + cw / 2, y + ch / 2 + 5, got ? f.name : '?', got ? 13 : 18, got ? '#fff' : '#8a97a8', 'center', 800);
    });
    const ly = y0 + 3 * (ch + 8) + 8;
    ['prod', 'cons', 'dec', 'abio'].forEach((c, i) => {
      const x = 14 + (i % 2) * 232, y = ly + Math.floor(i / 2) * 26;
      ctx.fillStyle = CAT_COLOR[c]; ctx.beginPath(); ctx.arc(x + 7, y, 7, 0, TAU); ctx.fill();
      T(x + 20, y + 5, CAT[c] + ' ' + FIT.filter((f) => f.cat === c && F.found[f.id]).length + '/' + FIT.filter((f) => f.cat === c).length, 14, '#26324a', 'left', 800);
    });
  }
  function drawForest(dt, t) {
    sceneOn();
    drawForestScene(dt, t);
    sceneOff();
    if (PHONE) { ctx.fillStyle = '#eaf6ff'; ctx.fillRect(0, SH, VW, VH - SH); drawForestPanel(); }
    drawForestTags(t);
    if (!PHONE) {
      // 범례
      const L = [['prod', 0], ['cons', 1], ['dec', 2], ['abio', 3]];
      D.roundRect(190, 524, 364, 28, 14); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill();
      L.forEach(([c, i]) => { const x = 210 + i * 80 + (i === 3 ? 12 : 0); ctx.fillStyle = CAT_COLOR[c]; ctx.beginPath(); ctx.arc(x, 538, 6, 0, TAU); ctx.fill(); T(x + 10, 543, CAT[c], 13, '#26324a', 'left', 800); });
    }
  }
  function forestDown(p) {
    const sp = toScene(p);
    if (PHONE && p.y > SH) return false;
    const id = forestHit(sp, S.clock);
    if (id) { foundItem(id, S.clock); return false; }
    // 빈 곳을 누르면 작은 파문
    parts.burst(sp.x, sp.y, { count: 5, colors: ['#ffffff'], speed: 50, size: 2.5, life: 0.4, gravity: 0, shape: 'circle' });
    return false;
  }

  /* =========================================================
     ① 개체 → 개체군 → 군집 → 생태계 블록 쌓기
     ========================================================= */
  const LV = [
    { id: 'ind', name: '개체', desc: '독립해서 살아가는 생물 하나하나', icons: ['🐇'] },
    { id: 'pop', name: '개체군', desc: '같은 장소에 사는 같은 종의 개체들의 모임', icons: ['🐇', '🐇', '🐇', '🐇'] },
    { id: 'com', name: '군집', desc: '같은 장소에 사는 여러 종의 개체군(생물 전체)의 모임', icons: ['🐇', '🦊', '🐦', '🌿', '🌳', '🍄'] },
    { id: 'eco', name: '생태계', desc: '군집과 그것을 둘러싼 비생물 요인(빛·온도·물·공기·토양)', icons: ['☀️', '🌡️', '💧', '💨', '🐇', '🦊', '🌳', '🍄'] },
  ];
  const TRAY_ORDER = [2, 0, 3, 1];     // 처음 블록을 놓는 순서(섞음)
  function stackLayout() {
    const L = { slots: [], tiles: [] };
    if (!PHONE) {
      for (let k = 0; k < 4; k++) L.slots.push({ x: 24, y: 30 + k * 112, w: 500, h: 104, lv: 3 - k });
      for (let k = 0; k < 4; k++) L.tiles.push({ x: 566, y: 96 + k * 82, w: 196, h: 62 });
      L.trayTitle = { x: 664, y: 66 }; L.tz = { w: 150 };
    } else {
      for (let k = 0; k < 4; k++) L.slots.push({ x: 12, y: 14 + k * 100, w: 456, h: 92, lv: 3 - k });
      for (let k = 0; k < 4; k++) L.tiles.push({ x: 14 + (k % 2) * 234, y: 462 + Math.floor(k / 2) * 66, w: 218, h: 56 });
      L.trayTitle = { x: 240, y: 440 }; L.tz = { w: 130 };
    }
    return L;
  }
  const SL = stackLayout();
  function resetStack() {
    const st = { tiles: [], drag: null, done: false, bad: {} };
    LV.forEach((lv, i) => {
      const home = SL.tiles[TRAY_ORDER.indexOf(i)];
      st.tiles.push({ lv: i, name: lv.name, x: home.x, y: home.y, w: home.w, h: home.h, home, slot: -1, lift: 0, sc: 1 });
    });
    S.stack = st;
  }
  const slotOf = (lv) => SL.slots.find((s) => s.lv === lv);
  function tileW(tl) { return tl.slot >= 0 ? SL.tz.w - 20 : tl.home.w; }
  function tileH(tl) { return tl.slot >= 0 ? (PHONE ? 52 : 62) : tl.home.h; }
  function placeTile(tl, slotIdx, animate) {
    const st = S.stack;
    tl.slot = slotIdx;
    const rp = slotIdx >= 0 ? { x: SL.slots[slotIdx].x + 10, y: SL.slots[slotIdx].y + (SL.slots[slotIdx].h - tileH(tl)) / 2 } : { x: tl.home.x, y: tl.home.y };
    const tw = tileW(tl), th = tileH(tl);
    if (animate) { SciSim.tween(tl, { x: rp.x, y: rp.y, w: tw, h: th }, { duration: 0.45, ease: 'outBack' }); } else { tl.x = rp.x; tl.y = rp.y; tl.w = tw; tl.h = th; }
    st.bad = {};
  }
  function stackDown(p) {
    const st = S.stack; if (st.done) return false;
    for (let i = st.tiles.length - 1; i >= 0; i--) {
      const tl = st.tiles[i];
      if (p.x >= tl.x && p.x <= tl.x + tl.w && p.y >= tl.y && p.y <= tl.y + tl.h) {
        st.drag = { tl, ox: p.x - tl.x, oy: p.y - tl.y, from: tl.slot };
        st.tiles.splice(i, 1); st.tiles.push(tl);
        SciSim.tween(tl, { lift: 1 }, { duration: 0.15 }); Sound.click();
        return true;
      }
    }
    return false;
  }
  function stackMove(p) { const d = S.stack.drag; if (!d) return; d.tl.x = p.x - d.ox; d.tl.y = p.y - d.oy; }
  function stackUp(p) {
    const st = S.stack, d = st.drag; if (!d) return;
    st.drag = null;
    const tl = d.tl; SciSim.tween(tl, { lift: 0 }, { duration: 0.2 });
    const si = SL.slots.findIndex((s) => p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h);
    if (si < 0) { placeTile(tl, -1, true); return; }
    const occ = st.tiles.find((o) => o !== tl && o.slot === si);
    if (occ) { if (d.from >= 0) placeTile(occ, d.from, true); else placeTile(occ, -1, true); }
    placeTile(tl, si, true);
    Sound.tick();
    parts.burst(SL.slots[si].x + 70, SL.slots[si].y + SL.slots[si].h / 2, { count: 8, colors: ['#7dd3fc', '#ffd24d', '#fff'], speed: 90, size: 3, life: 0.5, gravity: 120 });
  }
  const stackPlaced = () => S.stack.tiles.filter((t) => t.slot >= 0).length;
  const stackCorrect = () => S.stack.tiles.filter((t) => t.slot >= 0 && SL.slots[t.slot].lv === t.lv).length;
  function drawStack(dt, t) {
    const st = S.stack;
    // 배경
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#e8f5ff'); g.addColorStop(1, '#f3fbef'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    SL.slots.forEach((s, i) => {
      const lv = LV[s.lv], tl = st.tiles.find((x) => x.slot === i);
      const bad = tl && st.bad[tl.lv];
      const ok = st.done;
      panel(s.x, s.y, s.w, s.h, 16, ok ? '#f0fbf3' : '#fff');
      D.roundRect(s.x, s.y, s.w, s.h, 16); ctx.lineWidth = 2.5; ctx.strokeStyle = bad ? '#dc2626' : ok ? '#16a34a' : '#c7d6e6'; ctx.setLineDash(tl || ok ? [] : [7, 5]); ctx.stroke(); ctx.setLineDash([]);
      // 층 번호
      T(s.x + 10, s.y + 20, '층 ' + (s.lv + 1), 12.5, '#7a8aa0', 'left', 800);
      if (!tl) T(s.x + 10 + (SL.tz.w - 20) / 2, s.y + s.h / 2 + 6, '여기에 놓기', 14, '#9aa8bb', 'center', 800);
      // 그림 + 설명
      const ix = s.x + SL.tz.w + 10, iw = s.w - SL.tz.w - 22;
      const n = lv.icons.length, isz = PHONE ? 26 : 30;
      for (let k = 0; k < n; k++) {
        const ex = ix + 18 + k * Math.min(40, (iw - 30) / n), bob = RM ? 0 : Math.sin(t * 2 + k * 1.3) * 1.5;
        E(lv.icons[k], ex, s.y + (PHONE ? 26 : 28) + bob + (s.lv === 1 ? (k % 2) * 6 : 0), isz, {});
      }
      textBlock(ix, s.y + (PHONE ? 56 : 66), iw, lv.desc, PHONE ? 12.5 : 13.5, '#34445c', PHONE ? 16 : 18, 700);
    });
    // 트레이
    T(SL.trayTitle.x, SL.trayTitle.y, '🏷️ 이름표 블록', 14.5, '#26324a', 'center', 800);
    SL.tiles.forEach((h) => { D.roundRect(h.x - 3, h.y - 3, h.w + 6, h.h + 6, 14); ctx.fillStyle = 'rgba(120,140,165,.12)'; ctx.fill(); });
    const COL = ['#38bdf8', '#34d399', '#fbbf24', '#a78bfa'];
    st.tiles.forEach((tl) => {
      const lift = tl.lift, w = tl.w, h = tl.h;
      ctx.save(); ctx.translate(tl.x + w / 2, tl.y + h / 2); const sc = 1 + lift * 0.06; ctx.scale(sc, sc);
      D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 13); const gg = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gg.addColorStop(0, C_shade(COL[tl.lv], 0.25)); gg.addColorStop(1, COL[tl.lv]); ctx.fillStyle = gg; ctx.fill(); }, { blur: 6 + lift * 12, y: 3 + lift * 6 });
      D.roundRect(-w / 2, -h / 2, w, h, 13); ctx.strokeStyle = st.bad[tl.lv] ? '#dc2626' : 'rgba(0,0,0,.22)'; ctx.lineWidth = st.bad[tl.lv] ? 3.5 : 1.5; ctx.stroke();
      T(0, 7, tl.name, PHONE ? 18 : 21, '#10243d', 'center', 800);
      ctx.restore();
    });
    parts.update(dt); parts.draw(ctx);
  }
  const C_shade = (c, a) => SciSim.color.shade(c, a);

  /* =========================================================
     ② 빛의 세기와 광합성량 (양지 식물 · 음지 식물)
     ========================================================= */
  function resetLight() {
    S.light = { i: 2, rec: [false, false, false, false, false], pop: [0, 0, 0, 0, 0], sun: SUNP[2], shade: SHADEP[2], bubT: [0, 0], glow: LIGHT[2] };
  }
  function lightLayout() {
    if (!PHONE) return { scene: { x: 10, y: 14, w: 332, h: 532 }, graph: { x: 356, y: 14, w: 436, h: 372 }, table: { x: 356, y: 400, w: 436, h: 146 }, lampX: 176, lampY: 64, plants: [96, 252], pot: 396 };
    return { scene: { x: 8, y: 8, w: 464, h: 212 }, graph: { x: 8, y: 228, w: 464, h: 268 }, table: { x: 8, y: 504, w: 464, h: 130 }, lampX: 240, lampY: 36, plants: [130, 350], pot: 168 };
  }
  const LL = lightLayout();
  function plotBox(g) { return { x: g.x + (PHONE ? 46 : 52), y: g.y + 26, w: g.w - (PHONE ? 62 : 70), h: g.h - (PHONE ? 78 : 84) }; }
  function drawAxes(pb, xmin, xmax, ymin, ymax, xt, yt, xl, yl, fmtx) {
    ctx.save();
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    yt.forEach((v) => { const y = pb.y + pb.h - (v - ymin) / (ymax - ymin) * pb.h; ctx.beginPath(); ctx.moveTo(pb.x, y); ctx.lineTo(pb.x + pb.w, y); ctx.stroke(); T(pb.x - 7, y + 4.5, String(v), 12.5, '#5d6879', 'right', 700); });
    xt.forEach((v) => { const x = pb.x + (v - xmin) / (xmax - xmin) * pb.w; ctx.beginPath(); ctx.moveTo(x, pb.y); ctx.lineTo(x, pb.y + pb.h); ctx.stroke(); T(x, pb.y + pb.h + 17, fmtx ? fmtx(v) : String(v), 12.5, '#5d6879', 'center', 700); });
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x, pb.y + pb.h); ctx.lineTo(pb.x + pb.w, pb.y + pb.h); ctx.stroke();
    T(pb.x + pb.w / 2, pb.y + pb.h + 36, xl, 13, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(pb.x - 36, pb.y + pb.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, yl, 13, '#34445c', 'center', 800); ctx.restore();
    ctx.restore();
  }
  function drawLight(dt, t) {
    const L = S.light, sc = LL.scene;
    L.sun = SciSim.approach(L.sun, SUNP[L.i], dt, 6); L.shade = SciSim.approach(L.shade, SHADEP[L.i], dt, 6); L.glow = SciSim.approach(L.glow, LIGHT[L.i], dt, 6);
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    // 장면 패널
    panel(sc.x, sc.y, sc.w, sc.h, 18, '#f7fbff');
    ctx.save(); D.roundRect(sc.x, sc.y, sc.w, sc.h, 18); ctx.clip();
    const dark = 0.55 - 0.5 * (L.glow / 100);
    ctx.fillStyle = 'rgba(30,41,90,' + dark.toFixed(3) + ')'; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    // 빛 원뿔
    const lx = LL.lampX, ly = LL.lampY, a = L.glow / 100;
    const gr = ctx.createLinearGradient(0, ly, 0, LL.pot);
    gr.addColorStop(0, 'rgba(255,236,150,' + (0.12 + 0.5 * a) + ')'); gr.addColorStop(1, 'rgba(255,236,150,' + (0.04 + 0.2 * a) + ')');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(lx - 22, ly + 16); ctx.lineTo(sc.x + 8, LL.pot + 40); ctx.lineTo(sc.x + sc.w - 8, LL.pot + 40); ctx.lineTo(lx + 22, ly + 16); ctx.fill();
    ctx.restore();
    D.glow(lx, ly + 8, 40 + L.glow * 0.9, '#fff1a8', 0.25 + 0.6 * a);
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, sc.y); ctx.lineTo(lx, ly - 18); ctx.stroke();
    D.roundRect(lx - 24, ly - 20, 48, 22, 8); ctx.fillStyle = '#4b5563'; ctx.fill();
    D.sphere(lx, ly + 6, 18, '#ffe066', { gloss: true });
    T(lx, ly + 40, '빛의 세기 ' + LIGHT[L.i] + ' %', 13.5, '#fff', 'center', 800, { stroke: 'rgba(30,41,90,.7)', strokeWidth: 4 });
    // 식물
    const plants = [{ k: 'sun', name: '양지 식물', em: '🌻', col: '#f59e0b', v: L.sun }, { k: 'shade', name: '음지 식물', em: '🌿', col: '#16a34a', v: L.shade }];
    plants.forEach((p, i) => {
      const px = LL.plants[i], py = LL.pot, big = PHONE ? 58 : 76;
      // 화분
      D.roundRect(px - 34, py + 26, 68, 38, 8); ctx.fillStyle = '#b45f3b'; ctx.fill(); D.roundRect(px - 40, py + 20, 80, 14, 6); ctx.fillStyle = '#c9714a'; ctx.fill();
      E(p.em, px, py - 14 + Math.sin(t * 1.5 + i) * 1.5, big, { sx: 1, rot: Math.sin(t * 1.2 + i) * 0.03 });
      T(px, py + (PHONE ? 84 : 86), p.name, PHONE ? 13 : 14.5, '#e8eefc', 'center', 800, { stroke: 'rgba(30,41,90,.65)', strokeWidth: 4 });
      // 산소 방울: 광합성량(p.v)에 비례
      if (!RM) {
        L.bubT[i] += dt * (p.v / 12);
        while (L.bubT[i] >= 1) { L.bubT[i] -= 1; parts.emit({ x: px + rnd(-16, 16), y: py - big * 0.45, vx: rnd(-6, 6), vy: -rnd(34, 52), life: 1.6, size: rnd(3, 5.5), color: '#7dd3fc', shape: 'bubble', gravity: 0, drag: 0.2 }); }
      }
      // 광합성량 막대 (0~100 기준)
      const bw = PHONE ? 130 : 138, bx = px - bw / 2, by = py + (PHONE ? 94 : 100);
      D.roundRect(bx, by, bw, 14, 7); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
      if (p.v > 0.5) { D.roundRect(bx, by, Math.max(14, bw * p.v / 100), 14, 7); ctx.fillStyle = p.col; ctx.fill(); }
      T(px, by + 30, '광합성량 ' + Math.round(p.v), PHONE ? 12.5 : 13.5, '#e8eefc', 'center', 800, { stroke: 'rgba(30,41,90,.65)', strokeWidth: 4 });
    });
    // 그래프
    const g = LL.graph; panel(g.x, g.y, g.w, g.h, 18);
    const pb = plotBox(g);
    drawAxes(pb, 0, 100, 0, 100, [0, 25, 50, 75, 100], [0, 25, 50, 75, 100], '빛의 세기 (%)', '광합성량 (상대값)');
    const X = (v) => pb.x + v / 100 * pb.w, Y = (v) => pb.y + pb.h - v / 100 * pb.h;
    // 현재 위치 표시
    const cx = X(LIGHT[L.i]);
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, pb.y); ctx.lineTo(cx, pb.y + pb.h); ctx.stroke(); ctx.restore();
    [['sun', '#f59e0b'], ['shade', '#16a34a']].forEach(([k, col]) => {
      const data = k === 'sun' ? SUNP : SHADEP;
      // 기록한 점과 선
      const idx = [0, 1, 2, 3, 4].filter((i) => L.rec[i]);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      idx.forEach((i, n) => { if (n) ctx.lineTo(X(LIGHT[i]), Y(data[i])); else ctx.moveTo(X(LIGHT[i]), Y(data[i])); }); ctx.stroke();
      idx.forEach((i) => { const s = clamp(L.pop[i], 0, 1.3); D.sphere(X(LIGHT[i]), Y(data[i]), 7.5 * s, col, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); });
      // 지금 값(속이 빈 고리)
      const cy = Y(k === 'sun' ? L.sun : L.shade);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.fill(); ctx.stroke();
    });
    // 범례
    const lgx = pb.x + 12, lgy = pb.y + 14;
    D.roundRect(lgx - 8, lgy - 13, 188, 46, 10); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    D.sphere(lgx + 4, lgy, 6, '#f59e0b', { gloss: false }); T(lgx + 16, lgy + 5, '양지 식물', 13, '#26324a', 'left', 800);
    D.sphere(lgx + 4, lgy + 20, 6, '#16a34a', { gloss: false }); T(lgx + 16, lgy + 25, '음지 식물', 13, '#26324a', 'left', 800);
    T(lgx + 96, lgy + 5, '● 기록한 값', 12, '#5d6879', 'left', 700); T(lgx + 96, lgy + 25, '○ 지금 값', 12, '#5d6879', 'left', 700);
    // 기록표
    const tb = LL.table; panel(tb.x, tb.y, tb.w, tb.h, 14);
    const c0 = tb.x + 12, lw = PHONE ? 112 : 112, cw = (tb.w - lw - 20) / 5, rh = (tb.h - 16) / 3;
    const rows = [['빛의 세기 (%)', LIGHT, '#26324a'], ['양지 식물', SUNP, '#b45309'], ['음지 식물', SHADEP, '#15803d']];
    rows.forEach((r, ri) => {
      const ry = tb.y + 8 + ri * rh;
      if (ri === 0) { D.roundRect(tb.x + 6, ry, tb.w - 12, rh, 8); ctx.fillStyle = '#eef3fa'; ctx.fill(); }
      T(c0, ry + rh / 2 + 5, r[0], PHONE ? 12.5 : 13.5, r[2], 'left', 800);
      for (let i = 0; i < 5; i++) {
        const got = ri === 0 || L.rec[i];
        T(c0 + lw + cw * i + cw / 2, ry + rh / 2 + 5, got ? String(r[1][i]) : '—', PHONE ? 14 : 15, got ? r[2] : '#a8b3c4', 'center', 800);
      }
    });
    parts.update(dt); parts.draw(ctx);
  }
  function lightRecord() {
    const L = S.light, i = L.i;
    if (!L.rec[i]) { L.rec[i] = true; L.pop[i] = 0; SciSim.tween(L.pop, { [i]: 1 }, { duration: 0.5, ease: 'outBack' }); Sound.success(); }
    else Sound.click();
    const pb = plotBox(LL.graph);
    parts.burst(pb.x + LIGHT[i] / 100 * pb.w, pb.y + pb.h - SUNP[i] / 100 * pb.h, { count: 8, colors: ['#f59e0b', '#16a34a', '#fff'], speed: 90, size: 3, life: 0.6, gravity: 80 });
    updateCtl();
  }
  const lightAllRec = () => S.light.rec.every(Boolean);

  /* =========================================================
     ② 환경에 적응한 생물 (짝짓기)
     ========================================================= */
  const ADAPT_FACTORS = [
    { name: '사막여우', env: '낮 기온이 아주 높은 사막', q: '🏜️ 낮 기온이 아주 높은 사막의 사막여우', ans: 0, art: 'fennec' },
    { name: '북극여우', env: '몹시 추운 극지방', q: '🧊 몹시 추운 극지방의 북극여우', ans: 1, art: 'arctic' },
    { name: '선인장', env: '비가 거의 오지 않는 건조한 곳', q: '🌵 비가 거의 오지 않는 건조한 곳의 선인장', ans: 2, art: '🌵' },
    { name: '철새', env: '계절에 따라 달라지는 낮의 길이(일조 시간)', q: '☀️ 계절에 따라 달라지는 일조 시간과 철새', ans: 3, art: '🦆' },
    { name: '낙엽수', env: '겨울의 추위와 건조', q: '❄️ 겨울의 추위와 건조 속의 낙엽수', ans: 4, art: '🍂' },
  ];
  const ADAPT_OPTS = [
    '큰 귀로 몸의 열을 내보내요',
    '귀가 작고 털이 두꺼워 열을 지켜요',
    '잎이 가시로 변하고 줄기에 물을 저장해요',
    '일정한 계절에 따뜻한 곳으로 이동해요',
    '잎을 떨어뜨려 물의 손실을 줄여요',
  ];
  const adaptSel = [];
  function buildAdaptRows() {
    const box = $('#adaptRows');
    ADAPT_FACTORS.forEach((f, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + f.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', f.name + '의 특징');
      sel.innerHTML = '<option value="">— 특징 고르기 —</option>' + ADAPT_OPTS.map((o, k) => '<option value="' + k + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { S.adapt.sel[i] = sel.value === '' ? null : +sel.value; sel.classList.remove('ok', 'bad'); S.adapt.mark[i] = 0; Sound.click(); });
      row.appendChild(sel); box.appendChild(row); adaptSel.push(sel);
    });
  }
  function resetAdapt() { S.adapt = { sel: [null, null, null, null, null], mark: [0, 0, 0, 0, 0], pop: [0, 0, 0, 0, 0] }; adaptSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function drawFox(x, y, s, ear, fur, belly, thick) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // 귀
    const eh = 26 + ear * 52, ew = 15 + ear * 12;
    ctx.fillStyle = fur;
    [-1, 1].forEach((d) => {
      ctx.beginPath(); ctx.moveTo(d * 12, -20); ctx.lineTo(d * (12 + ew * 0.9), -20 - eh); ctx.lineTo(d * (12 + ew * 1.5), -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(d * 17, -22); ctx.lineTo(d * (14 + ew * 0.85), -20 - eh * 0.78); ctx.lineTo(d * (12 + ew * 1.2), -14); ctx.closePath(); ctx.fill(); ctx.fillStyle = fur;
    });
    // 얼굴(털이 두꺼우면 둥글고 풍성)
    ctx.beginPath(); ctx.ellipse(0, 0, 34 + thick * 7, 28 + thick * 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(-26 - thick * 4, 6); ctx.quadraticCurveTo(0, 46, 26 + thick * 4, 6); ctx.quadraticCurveTo(0, 18, -26 - thick * 4, 6); ctx.fill();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(-13, -4, 3.5, 0, TAU); ctx.arc(13, -4, 3.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 12, 5, 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function adaptLayout() {
    const out = [];
    if (!PHONE) for (let k = 0; k < 5; k++) out.push({ x: 10 + k * 158, y: 24, w: 148, h: 500, art: { x: 10 + k * 158, y: 24, w: 148, h: 158 } });
    else for (let k = 0; k < 5; k++) out.push({ x: 8 + (k % 2) * 238, y: 8 + Math.floor(k / 2) * 208, w: 226, h: 198, art: { x: 8 + (k % 2) * 238, y: 8 + Math.floor(k / 2) * 208, w: 226, h: 96 } });
    return out;
  }
  const AL = adaptLayout();
  function drawAdaptArt(f, a, t) {
    ctx.save(); D.roundRect(a.x, a.y, a.w, a.h, 16); ctx.clip();
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2 + (PHONE ? 6 : 10), k = PHONE ? 0.8 : 1;
    if (f.art === 'fennec') {
      D.sky(a.x, a.y, a.w, a.h, '#ffd89a', '#ffefc9'); D.glow(a.x + a.w - 24, a.y + 22, 50, '#ffb02e', 0.8); D.sphere(a.x + a.w - 24, a.y + 22, 14, '#ffb02e', { gloss: false });
      ctx.fillStyle = '#f0c987'; ctx.fillRect(a.x, a.y + a.h - 22, a.w, 22);
      drawFox(cx, cy, 0.95 * k, 1, '#e3b36b', '#fff4dc', 0);
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(239,68,68,' + (0.35 + 0.3 * Math.sin(t * 3 + i)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx - 40 * k + i * 10, cy - 60 * k, 5 + i * 3, Math.PI, TAU); ctx.stroke(); }
    } else if (f.art === 'arctic') {
      D.sky(a.x, a.y, a.w, a.h, '#cfe8ff', '#f2f9ff'); ctx.fillStyle = '#fff'; ctx.fillRect(a.x, a.y + a.h - 22, a.w, 22);
      for (let i = 0; i < 9; i++) { const sx = a.x + ((i * 53 + t * 14) % a.w), sy = a.y + ((i * 37 + t * 22) % a.h); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, TAU); ctx.fill(); }
      drawFox(cx, cy, 0.95 * k, 0.2, '#f4f7fb', '#ffffff', 1);
      ctx.strokeStyle = 'rgba(100,150,200,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 44 * k + 8, 0.2, 2.9); ctx.stroke();
    } else if (f.art === '🌵') {
      D.sky(a.x, a.y, a.w, a.h, '#ffe2a8', '#fff2d3'); ctx.fillStyle = '#efcb8d'; ctx.fillRect(a.x, a.y + a.h - 22, a.w, 22);
      E('🌵', cx, cy - 2, 80 * k, {}); E('☀️', a.x + a.w - 24, a.y + 24, 30, {});
    } else if (f.art === '🦆') {
      D.sky(a.x, a.y, a.w, a.h, '#bfe3ff', '#eef7ff');
      for (let i = 0; i < 3; i++) E('🦆', a.x + a.w * (0.25 + i * 0.25) + Math.sin(t + i) * 4, a.y + a.h * (0.3 + 0.12 * (i % 2)) + Math.sin(t * 2 + i) * 3, 34 * k, { flip: i % 2 === 0 });
      E('🌤️', a.x + 28, a.y + a.h - 30, 34, {});
    } else {
      D.sky(a.x, a.y, a.w, a.h, '#ffe2c4', '#fff4e8'); ctx.fillStyle = '#c9a776'; ctx.fillRect(a.x, a.y + a.h - 20, a.w, 20);
      E('🌳', cx, cy, 78 * k, { alpha: 0.5 }); for (let i = 0; i < 5; i++) E('🍂', a.x + 30 + i * (a.w - 60) / 4, a.y + ((t * 26 + i * 40) % (a.h - 20)), 22, { rot: t + i });
    }
    ctx.restore();
  }
  function drawAdapt(dt, t) {
    const A = S.adapt;
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    ADAPT_FACTORS.forEach((f, i) => {
      const c = AL[i], sel = A.sel[i];
      panel(c.x, c.y, c.w, c.h, 16);
      const shake = A.mark[i] === 2 ? Math.sin(t * 40) * 2 * Math.max(0, 1 - (t - (A.shakeT || 0)) * 2.5) : 0;
      ctx.save(); ctx.translate(shake, 0);
      drawAdaptArt(f, c.art, t);
      if (!PHONE) {
        T(c.x + c.w / 2, c.y + 188, (i + 1) + '. ' + f.name, 17, '#26324a', 'center', 800);
        textBlock(c.x + 10, c.y + 210, c.w - 20, f.env, 12.5, '#5d6879', 16, 700);
        D.roundRect(c.x + 8, c.y + 270, c.w - 16, 216, 12);
        ctx.fillStyle = sel == null ? '#f3f6fa' : A.mark[i] === 1 ? '#e7f7ee' : A.mark[i] === 2 ? '#fdeceb' : '#eaf4ff'; ctx.fill();
        ctx.setLineDash(sel == null ? [6, 4] : []); ctx.lineWidth = 2; ctx.strokeStyle = A.mark[i] === 1 ? '#16a34a' : A.mark[i] === 2 ? '#dc2626' : '#b8c7d9'; ctx.stroke(); ctx.setLineDash([]);
        if (sel == null) textBlock(c.x + c.w / 2, c.y + 330, c.w - 36, '오른쪽 칸에서 이 환경에 알맞은 특징을 골라요', 13, '#8695aa', 18, 700, 'center');
        else { T(c.x + c.w / 2, c.y + 296, '특징', 12.5, '#5d6879', 'center', 800); textBlock(c.x + 16, c.y + 324, c.w - 32, ADAPT_OPTS[sel], 14.5, '#26324a', 22, 800); }
        if (A.mark[i] === 1) D.check(c.x + c.w - 26, c.y + c.h - 26, 14, 1);
      } else {
        T(c.x + c.w / 2, c.y + 122, (i + 1) + '. ' + f.name, 15.5, '#26324a', 'center', 800);
        D.roundRect(c.x + 8, c.y + 132, c.w - 16, 58, 10);
        ctx.fillStyle = sel == null ? '#f3f6fa' : A.mark[i] === 1 ? '#e7f7ee' : A.mark[i] === 2 ? '#fdeceb' : '#eaf4ff'; ctx.fill();
        ctx.setLineDash(sel == null ? [6, 4] : []); ctx.lineWidth = 2; ctx.strokeStyle = A.mark[i] === 1 ? '#16a34a' : A.mark[i] === 2 ? '#dc2626' : '#b8c7d9'; ctx.stroke(); ctx.setLineDash([]);
        if (sel == null) textBlock(c.x + c.w / 2, c.y + 166, c.w - 30, '특징을 골라요', 13, '#8695aa', 16, 700, 'center');
        else textBlock(c.x + 16, c.y + 154, c.w - 40, ADAPT_OPTS[sel], 12.5, '#26324a', 17, 800);
        if (A.mark[i] === 1) D.check(c.x + c.w - 24, c.y + c.h - 24, 12, 1);
      }
      ctx.restore();
    });
    if (PHONE) { const c = { x: 246, y: 424, w: 226, h: 198 }; panel(c.x, c.y, c.w, c.h, 16, '#fff9e8'); textBlock(c.x + 14, c.y + 30, c.w - 28, '💡 생물의 몸 구조나 행동은 그 곳의 환경 요인(온도·물·빛·일조 시간)에 알맞게 나타나요. 환경이 생물에게 주는 영향을 작용이라고 해요.', 13, '#6b4e00', 19, 700); }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 맨땅 vs 숲속 측정
     ========================================================= */
  function resetCmp() {
    const mk = () => ({ go: false, done: false, T: 20, H: 0, Lt: 0, kit: 0, vapor: 0 });
    S.cmp = { at: null, bare: mk(), forest: mk() };
  }
  function cmpLayout() {
    if (!PHONE) return { bare: { x: 10, y: 12, w: 384, h: 536 }, forest: { x: 406, y: 12, w: 384, h: 536 } };
    return { bare: { x: 8, y: 8, w: 464, h: 308 }, forest: { x: 8, y: 324, w: 464, h: 308 } };
  }
  const CL = cmpLayout();
  function cmpMeasure(k) {
    const c = S.cmp, s = c[k];
    c.at = k; if (!s.go) { s.go = true; s.kit = 0; SciSim.tween(s, { kit: 1 }, { duration: 0.6, ease: 'outBack' }); Sound.click(); }
    else Sound.tick();
    updateCtl();
  }
  function drawSite(k, dt, t) {
    const r = CL[k], s = S.cmp[k], dat = SITE[k], bare = k === 'bare';
    const sh = bare ? 0 : 1;
    panel(r.x, r.y, r.w, r.h, 18);
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    const sceneH = PHONE ? 140 : 262;
    D.sky(r.x, r.y, r.w, sceneH, bare ? '#ffe9c2' : '#bfe3ff', bare ? '#fff4dc' : '#e9f7ff');
    // 땅
    const gy = r.y + sceneH - (PHONE ? 26 : 44);
    ctx.fillStyle = bare ? '#d9b985' : '#6bbf6a'; ctx.fillRect(r.x, gy, r.w, sceneH - (gy - r.y));
    if (bare) {
      ctx.strokeStyle = 'rgba(120,80,30,.4)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const bx = r.x + 30 + i * (r.w - 60) / 5; ctx.beginPath(); ctx.moveTo(bx, gy + 4); ctx.lineTo(bx + 14, gy + 14); ctx.lineTo(bx + 4, gy + 24); ctx.stroke(); }
      E('☀️', r.x + r.w - 52, r.y + 44, PHONE ? 54 : 78, { rot: RM ? 0 : t * 0.2 });
      D.glow(r.x + r.w - 52, r.y + 44, 100, '#ffd24d', 0.45);
      // 아지랑이
      ctx.strokeStyle = 'rgba(255,120,40,' + (0.25 + 0.2 * (s.T - 20) / 15) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 0; x <= r.w - 40; x += 8) { const yy = gy - 10 - i * 14 + Math.sin(x * 0.06 + t * 3 + i) * 3; if (x) ctx.lineTo(r.x + 20 + x, yy); else ctx.moveTo(r.x + 20, yy); } ctx.stroke(); }
      E('🌾', r.x + r.w * 0.3, gy - 8, 26, { alpha: 0.6 }); E('🌾', r.x + r.w * 0.62, gy - 6, 22, { alpha: 0.6 });
    } else {
      E('🌳', r.x + r.w * 0.2, gy - (PHONE ? 30 : 56), PHONE ? 78 : 122, { rot: Math.sin(t * 1.1) * 0.02 });
      E('🌳', r.x + r.w * 0.55, gy - (PHONE ? 34 : 64), PHONE ? 92 : 144, { rot: Math.sin(t * 1.0 + 1) * 0.02 });
      E('🌳', r.x + r.w * 0.86, gy - (PHONE ? 28 : 50), PHONE ? 70 : 108, { rot: Math.sin(t * 1.2 + 2) * 0.02 });
      // 그늘
      ctx.fillStyle = 'rgba(20,70,40,.18)'; ctx.fillRect(r.x, gy, r.w, sceneH - (gy - r.y));
      // 증산 수증기
      if (!RM && Math.random() < dt * 10) parts.emit({ x: r.x + rnd(0.1, 0.95) * r.w, y: r.y + sceneH * rnd(0.35, 0.6), vx: rnd(-4, 4), vy: -rnd(14, 26), life: 1.8, size: rnd(5, 9), color: 'rgba(120,190,230,.9)', shape: 'smoke', gravity: 0, drag: 0.3, alpha: 0.7 });
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.38, r.y); ctx.lineTo(r.x + r.w * 0.34, gy); ctx.lineTo(r.x + r.w * 0.40, gy); ctx.lineTo(r.x + r.w * 0.42, r.y); ctx.fill(); ctx.restore();
    }
    // 이름표
    ctx.restore();
    D.label(r.x + 14, r.y + 24, (bare ? '🏜️ ' : '🌳 ') + dat.name, { bg: bare ? '#c2410c' : '#15803d', size: PHONE ? 14 : 16, align: 'left' });
    // 측정 도구 판
    const by = r.y + sceneH + 6, bh = r.h - sceneH - 12;
    ctx.save(); D.roundRect(r.x + 8, by, r.w - 16, bh, 14); ctx.fillStyle = s.go ? '#f4f9ff' : '#f0f2f5'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = s.go ? '#9cc7ee' : '#d5dae1'; ctx.setLineDash(s.go ? [] : [6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    if (!s.go) {
      T(r.x + r.w / 2, by + bh / 2, '측정 도구를 놓으면 값이 나타나요', PHONE ? 14 : 15, '#8695aa', 'center', 800);
    } else {
      // 값 접근
      s.T = SciSim.approach(s.T, dat.temp, dt, 2.4); s.H = SciSim.approach(s.H, dat.hum, dt, 2.4); s.Lt = SciSim.approach(s.Lt, dat.light, dt, 2.4);
      if (!s.done && Math.abs(s.T - dat.temp) < 0.05 && Math.abs(s.H - dat.hum) < 0.3 && Math.abs(s.Lt - dat.light) < 0.3 && s.kit > 0.99) {
        s.done = true; s.T = dat.temp; s.H = dat.hum; s.Lt = dat.light; Sound.success(); updateCtl();
        parts.burst(r.x + r.w / 2, by + bh / 2, { count: 14, colors: ['#38bdf8', '#ffd24d', '#fff'], speed: 130, size: 3.5, life: 0.8 });
      }
      const th = PHONE ? 76 : 150, tx = r.x + r.w * 0.17, ty = by + (PHONE ? 22 : 40);
      ctx.save(); ctx.translate(tx, ty + th / 2 + 10); ctx.scale(0.4 + 0.6 * s.kit, 0.4 + 0.6 * s.kit); ctx.translate(-tx, -(ty + th / 2 + 10));
      D.thermometer(tx, ty, th, s.T, 20, 40, { unit: '°', step: 5, color: '#e2464b' });
      ctx.restore();
      T(tx + 4, by + bh - 10, s.done ? Math.round(dat.temp) + ' °C' : s.T.toFixed(1) + ' °C', PHONE ? 15 : 18, '#7f1d1d', 'center', 800);
      const dr = PHONE ? 54 : 62, dx = r.x + r.w * 0.5, dy = by + (PHONE ? 70 : 96);
      ctx.save(); ctx.translate(dx, dy); ctx.scale(0.4 + 0.6 * s.kit, 0.4 + 0.6 * s.kit); ctx.translate(-dx, -dy);
      D.dial(dx, dy, dr, s.H, 0, 100, { ticks: 5, label: '습도 %', color: '#2563eb' });
      ctx.restore();
      T(dx, by + bh - 10, '상대 습도 ' + (s.done ? dat.hum : Math.round(s.H)) + ' %', PHONE ? 13.5 : 16, '#1e3a8a', 'center', 800);
      // 광량 막대 (0~100 % 눈금)
      const bx = r.x + r.w * 0.73, bw = r.w * 0.2, byy = by + (PHONE ? 34 : 60);
      T(bx + bw / 2, byy - 8, '땅 위 광량', PHONE ? 12.5 : 14, '#26324a', 'center', 800);
      D.roundRect(bx, byy, bw, 22, 11); ctx.fillStyle = '#e1e7ef'; ctx.fill();
      if (s.Lt > 0.3) { ctx.save(); D.roundRect(bx, byy, bw, 22, 11); ctx.clip(); ctx.fillStyle = '#f5b301'; ctx.fillRect(bx, byy, bw * s.Lt / 100, 22); ctx.restore(); }
      [0, 50, 100].forEach((v) => T(bx + bw * v / 100, byy + 38, String(v), 11.5, '#5d6879', 'center', 700));
      T(bx + bw / 2, by + bh - 10, (s.done ? dat.light : Math.round(s.Lt)) + ' %', PHONE ? 14 : 16, '#92400e', 'center', 800);
      if (!s.done) T(r.x + r.w - 16, r.y + 26, '측정 중…', 13, '#5d6879', 'right', 800);
    }
  }
  function drawCmp(dt, t) {
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    drawSite('bare', dt, t); drawSite('forest', dt, t);
    parts.update(dt); parts.draw(ctx);
    const c = S.cmp;
    if (c.bare.done && c.forest.done) {
      const mx = VW / 2, my = PHONE ? 320 : 282;
      D.label(mx, my, '기온 차 ' + (SITE.bare.temp - SITE.forest.temp) + ' °C', { bg: '#0f766e', size: PHONE ? 13 : 15 });
    }
  }

  /* =========================================================
     ③ 지렁이가 있는 흙 vs 없는 흙
     ========================================================= */
  const WORM_SEC = 8, LEAF_SEC = 8;
  function resetWorm() { S.worm = { st: 'idle', p: 0, air: 0 }; }
  function wormLayout() {
    if (!PHONE) return { A: { x: 12, y: 14, w: 382, h: 530 }, B: { x: 406, y: 14, w: 382, h: 530 }, strip: 190 };
    return { A: { x: 8, y: 8, w: 464, h: 306 }, B: { x: 8, y: 322, w: 464, h: 306 }, strip: 112 };
  }
  const WL = wormLayout();
  const TUN = [[0.2, 0], [0.22, 0.16], [0.13, 0.32], [0.3, 0.44], [0.46, 0.56], [0.4, 0.74], [0.58, 0.86], [0.74, 0.7], [0.7, 0.46], [0.84, 0.3], [0.8, 0.08]];
  const TUN_LEN = []; (function () { let s = 0; TUN_LEN.push(0); for (let i = 1; i < TUN.length; i++) { s += Math.hypot(TUN[i][0] - TUN[i - 1][0], (TUN[i][1] - TUN[i - 1][1]) * 0.8); TUN_LEN.push(s); } })();
  function tunnelPoint(u, r, sy, sh) {
    const total = TUN_LEN[TUN_LEN.length - 1], d = clamp(u, 0, 1) * total;
    let i = 1; while (i < TUN.length - 1 && TUN_LEN[i] < d) i++;
    const k = (d - TUN_LEN[i - 1]) / (TUN_LEN[i] - TUN_LEN[i - 1] || 1);
    const a = TUN[i - 1], b = TUN[i];
    return { x: r.x + (a[0] + (b[0] - a[0]) * k) * r.w, y: sy + (a[1] + (b[1] - a[1]) * k) * sh };
  }
  const plantCm = (k, p) => PLANT0 + ((k === 'B' ? PLANT_WORM : PLANT_NOWORM) - PLANT0) * p;
  function drawPlant(x, gy, cm, pxcm, t) {
    const hpx = cm * pxcm;
    ctx.strokeStyle = '#3f9d4a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + Math.sin(t * 1.4) * 3, gy - hpx * 0.5, x + Math.sin(t * 1.4) * 4, gy - hpx); ctx.stroke();
    const n = Math.max(2, Math.floor(cm / 6));
    for (let i = 1; i <= n; i++) {
      const yy = gy - hpx * (i / (n + 1)), sd = i % 2 ? 1 : -1;
      ctx.fillStyle = i % 2 ? '#4cb25a' : '#3f9d4a'; ctx.beginPath(); ctx.ellipse(x + sd * 12, yy, 13, 5.5, sd * -0.5, 0, TAU); ctx.fill();
    }
    D.sphere(x + Math.sin(t * 1.4) * 4, gy - hpx - 6, 9, '#ffd24d', { gloss: true });
  }
  function drawSoilPanel(k, dt, t, p) {
    const r = WL[k], strip = WL.strip, gy = r.y + strip;
    panel(r.x, r.y, r.w, r.h, 18);
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    D.sky(r.x, r.y, r.w, strip, '#bfe3ff', '#eaf7ff');
    const sg = ctx.createLinearGradient(0, gy, 0, r.y + r.h); sg.addColorStop(0, k === 'A' ? '#6b5237' : '#8a6a44'); sg.addColorStop(1, k === 'A' ? '#3f2f20' : '#5e4630');
    ctx.fillStyle = sg; ctx.fillRect(r.x, gy, r.w, r.h - strip);
    ctx.fillStyle = '#5fb35f'; ctx.fillRect(r.x, gy - 6, r.w, 10);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(r.x + (i * 71) % (r.w - 10) + 5, gy + 14 + (i * 47) % (r.h - strip - 24), 2 + i % 3, 0, TAU); ctx.fill(); }
    const sh = r.h - strip;
    // 자 (cm)
    const pxcm = (strip - 16) / 30;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.strokeStyle = 'rgba(80,100,130,.65)'; ctx.lineWidth = 1.5;
    [0, 10, 20].forEach((cm) => { const yy = gy - 6 - cm * pxcm; ctx.beginPath(); ctx.moveTo(r.x + 8, yy); ctx.lineTo(r.x + 22, yy); ctx.stroke(); if (cm) T(r.x + 26, yy + 4, cm + ' cm', 11.5, '#4a5a70', 'left', 700); });
    drawPlant(r.x + r.w * (k === 'A' ? 0.62 : 0.5), gy - 6, plantCm(k, p), pxcm, t);
    // 뿌리
    ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const rx = r.x + r.w * (k === 'A' ? 0.62 : 0.5), rootL = k === 'B' ? 0.55 + 0.4 * p : 0.45 + 0.1 * p;
    [[-26, 0.4], [0, 0.55], [24, 0.42]].forEach((q) => { ctx.beginPath(); ctx.moveTo(rx, gy - 2); ctx.quadraticCurveTo(rx + q[0] * 0.6, gy + sh * q[1] * 0.5, rx + q[0] * 1.3, gy + sh * q[1] * rootL); ctx.stroke(); });
    if (k === 'A') {
      // 단단한 흙: 공기 통로 없음
      ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 18; i++) ctx.fillRect(r.x + (i * 37) % (r.w - 14) + 5, gy + 10 + (i * 29) % (sh - 20), 14, 3);
      if (!PHONE || true) textBlock(r.x + 14, gy + (PHONE ? 130 : 330), r.w - 28, '흙이 단단해서 공기가 잘 들어가지 못해요', PHONE ? 13 : 14.5, '#f3e7d3', PHONE ? 18 : 21, 800, 'left');
    } else {
      // 지렁이 통로: p만큼 드러남
      const total = TUN_LEN[TUN_LEN.length - 1];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = []; const steps = 60; for (let i = 0; i <= steps * p; i++) pts.push(tunnelPoint(i / steps, r, gy, sh));
      if (p > 0 && pts.length > 1) {
        ctx.strokeStyle = '#2f2418'; ctx.lineWidth = PHONE ? 13 : 17; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.strokeStyle = '#4a3a29'; ctx.lineWidth = PHONE ? 9 : 12; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        // 공기 입자
        const n = Math.floor(10 * p);
        for (let i = 0; i < n; i++) { const u = ((t * 0.12 + i / 10) % 1) * p, q = tunnelPoint(u, r, gy, sh); ctx.fillStyle = 'rgba(190,230,255,.95)'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, TAU); ctx.fill(); }
        const head = pts[pts.length - 1];
        if (S.worm.st === 'run') E('🪱', head.x, head.y, PHONE ? 22 : 28, { rot: Math.sin(t * 8) * 0.3 });
        if (p > 0.3) tag(PHONE ? r.x + r.w * 0.62 : r.x + 190, gy + (PHONE ? 30 : 40), '💨 공기 통로', '#0369a1', 1, PHONE ? 12.5 : 13);
      }
    }
    ctx.restore();
    D.label(r.x + 14, r.y + 24, k === 'A' ? '🚫 지렁이 없는 흙' : '🪱 지렁이 있는 흙', { bg: k === 'A' ? '#6b7280' : '#92400e', size: PHONE ? 13.5 : 15, align: 'left' });
    const cm = plantCm(k, p);
    D.label(r.x + r.w - 14 - 0, r.y + 24, '키 ' + Math.round(cm) + ' cm', { bg: '#15803d', size: PHONE ? 13 : 15, align: 'right' });
  }
  function stepWorm(dt) {
    const W = S.worm; if (W.st !== 'run') return;
    W.p = Math.min(1, W.p + dt / WORM_SEC);
    if (W.p >= 1) { W.st = 'done'; Sound.success(); updateCtl(); parts.burst(WL.B.x + WL.B.w / 2, WL.B.y + 200, { count: 14, colors: ['#4ade80', '#ffd24d', '#fff'], speed: 130, size: 3.5, life: 0.8 }); }
  }
  function drawWorm(dt, t) {
    const W = S.worm;
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    drawSoilPanel('A', dt, t, W.p); drawSoilPanel('B', dt, t, W.p);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 낙엽 분해 모형
     ========================================================= */
  const NLEAF = 8, NDOT = 40;
  function resetLeaf() {
    const dots = []; const hs = (n, k) => { const v = Math.sin(n * k) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < NDOT; i++) dots.push({ fx: hs(i + 1, 12.9898), fy: hs(i + 1, 78.233), a: 0 });
    S.leaf = { st: 'idle', p: 0, dots };
  }
  const leafPct = (p) => LEAF_START + (LEAF_END - LEAF_START) * p;
  const nutPct = (p) => NUT_START + (NUT_END - NUT_START) * p;
  function stepLeaf(dt) {
    const Lf = S.leaf; if (Lf.st !== 'run') return;
    Lf.p = Math.min(1, Lf.p + dt / LEAF_SEC);
    if (Lf.p >= 1) { Lf.st = 'done'; Sound.success(); updateCtl(); }
  }
  function drawLeaf(dt, t) {
    const Lf = S.leaf, p = Lf.p;
    const lp = leafPct(p), np = nutPct(p);
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    const R = PHONE ? { x: 8, y: 8, w: 464, h: 400 } : { x: 12, y: 14, w: 776, h: 400 };
    panel(R.x, R.y, R.w, R.h, 18);
    ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
    const gy = R.y + R.h * 0.5;
    D.sky(R.x, R.y, R.w, gy - R.y, '#bfe3ff', '#eaf7ff');
    drawCloud(R.x + R.w * 0.45 + ((t * 5) % 80), R.y + 60, 0.7, 0.9);
    E('🌳', R.x + R.w * (PHONE ? 0.09 : 0.08), gy - (PHONE ? 38 : 62), PHONE ? 84 : 124, { rot: Math.sin(t) * 0.02 });
    if (!RM) for (let i = 0; i < 3; i++) { const k = ((t * 0.18 + i / 3) % 1); E('🍂', R.x + R.w * (PHONE ? 0.09 : 0.08) + (i - 1) * 26 + Math.sin(k * 8 + i) * 12, R.y + 80 + k * (gy - R.y - 100), 18, { rot: k * 6, alpha: 1 - Math.max(0, k - 0.85) * 6 }); }
    const sg = ctx.createLinearGradient(0, gy, 0, R.y + R.h); sg.addColorStop(0, '#7a5a38'); sg.addColorStop(1, '#4d3a28'); ctx.fillStyle = sg; ctx.fillRect(R.x, gy, R.w, R.y + R.h - gy);
    ctx.fillStyle = '#5fb35f'; ctx.fillRect(R.x, gy - 5, R.w, 9);
    // 식물(양분을 흡수)
    const px = R.x + R.w * 0.84;
    ctx.strokeStyle = '#3f9d4a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, gy - 3); ctx.lineTo(px, gy - 64 - 30 * (np - NUT_START) / (NUT_END - NUT_START)); ctx.stroke();
    E('🌿', px, gy - 80 - 30 * (np - NUT_START) / (NUT_END - NUT_START), 44, {});
    ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 3; [-22, 0, 22].forEach((d) => { ctx.beginPath(); ctx.moveTo(px, gy); ctx.quadraticCurveTo(px + d, gy + 30, px + d * 1.4, gy + 60); ctx.stroke(); });
    // 낙엽 더미 (각 낙엽의 크기 = 남은 양)
    const lx0 = R.x + R.w * 0.2, lw = R.w * 0.5;
    for (let i = 0; i < NLEAF; i++) {
      const s = clamp(NLEAF * lp / 100 - i, 0, 1);
      if (s <= 0.01) continue;
      const x = lx0 + (i + 0.5) / NLEAF * lw, y = gy - 12 - (i % 2) * 7;
      E('🍂', x, y, 44, { sx: s, sy: s, rot: (i - 3.5) * 0.18 });
    }
    // 분해자 (버섯, 세균)
    const act = Lf.st === 'run' ? 1 : 0;
    E('🍄', lx0 + lw * 0.2, gy - 16, 30, {}); E('🍄', lx0 + lw * 0.78, gy - 16, 30, {});
    for (let i = 0; i < 10; i++) {
      const bx = lx0 + ((i * 0.137 + 0.05) % 1) * lw + Math.sin(t * 1.5 + i) * 8 * (act + 0.2), by = gy + 12 + Math.cos(t * 1.3 + i * 2) * 6 * (act + 0.2);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(t + i); D.roundRect(-8, -3.5, 16, 7, 3.5); ctx.fillStyle = i % 2 ? '#b45309' : '#7c3aed'; ctx.fill(); ctx.restore();
    }
    // 양분 알갱이 (토양)
    const vis = Math.round(np / 100 * NDOT);
    Lf.dots.forEach((d, i) => {
      const on = i < vis; d.a = SciSim.approach(d.a, on ? 1 : 0, dt, 6);
      if (d.a < 0.02) return;
      const x = R.x + 16 + d.fx * (R.w - 32), y = gy + 22 + d.fy * (R.y + R.h - gy - 36);
      ctx.globalAlpha = d.a; D.sphere(x, y, 5 * d.a + 1, '#facc15', { gloss: true }); ctx.globalAlpha = 1;
    });
    // 양분이 내려가는 입자
    if (Lf.st === 'run' && !RM && Math.random() < dt * 12) parts.emit({ x: lx0 + rnd(0, lw), y: gy + 8, vx: rnd(-10, 10), vy: rnd(30, 60), life: 1.2, size: 3.5, color: '#facc15', shape: 'circle', gravity: 0, drag: 0.5 });
    ctx.restore();
    D.label(R.x + 14, R.y + 24, '🍂 낙엽 + 분해자(버섯·세균)', { bg: '#92400e', size: PHONE ? 13 : 15, align: 'left' });
    // 막대 (눈금 0~100 %)
    const bx = R.x + 16, bw = R.w - 32, by0 = R.y + R.h + 10;
    const drawBar = (y, label, v, col) => {
      T(bx, y - 6, label + ' ' + Math.round(v) + ' %', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
      D.roundRect(bx, y, bw, 18, 9); ctx.fillStyle = '#e1e7ef'; ctx.fill();
      ctx.save(); D.roundRect(bx, y, bw, 18, 9); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(bx, y, bw * clamp(v, 0, 100) / 100, 18); ctx.restore();
      [0, 50, 100].forEach((q) => T(bx + bw * q / 100, y + 34, String(q), 11.5, '#5d6879', q === 0 ? 'left' : q === 100 ? 'right' : 'center', 700));
    };
    drawBar(by0 + 20, '낙엽의 양', lp, '#d97706');
    drawBar(by0 + 82, '토양 속 양분', np, '#facc15');
    if (Lf.st === 'done') D.label(R.x + R.w / 2, R.y + R.h - 20, '분해자가 낙엽의 양분을 토양으로 되돌려 보냈어요!', { bg: '#15803d', size: PHONE ? 13 : 15 });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ④ 연못 생태계: 작용 · 반작용 · 상호 작용 분류
     ========================================================= */
  const KIND = { act: '작용', rea: '반작용', int: '상호 작용' };
  const KCOL = { act: '#0ea5e9', rea: '#16a34a', int: '#ea8a1a' };
  const CARDS = [
    { t: '물의 온도가 낮아지면 물고기의 활동이 줄어요.', k: 'act', ic: '🐟' },
    { t: '수생 식물이 광합성을 하면서 물속에 산소를 내놓아요.', k: 'rea', ic: '🌿' },
    { t: '햇빛이 비치면 수생 식물이 광합성을 해요.', k: 'act', ic: '☀️' },
    { t: '개구리가 물가의 곤충을 잡아먹어요.', k: 'int', ic: '🐸' },
    { t: '물에 떨어진 낙엽이 분해되어 물속의 양분이 돼요.', k: 'rea', ic: '🍂' },
    { t: '물속 산소가 부족해지면 물고기가 물 위로 올라와 숨을 쉬어요.', k: 'act', ic: '🫧' },
    { t: '물고기가 호흡하면서 이산화 탄소를 물에 내보내요.', k: 'rea', ic: '🐠' },
    { t: '수생 식물이 그늘을 만들어 물의 온도가 조금 낮아져요.', k: 'rea', ic: '🌱' },
    { t: '큰 물고기가 작은 물고기를 잡아먹어요.', k: 'int', ic: '🐟' },
    { t: '겨울에 물이 얼면 개구리가 진흙 속으로 들어가 겨울잠을 자요.', k: 'act', ic: '❄️' },
    { t: '두 종류의 물고기가 같은 먹이를 두고 경쟁해요.', k: 'int', ic: '🐠' },
    { t: '올챙이가 물속의 조류를 먹고 자라요.', k: 'int', ic: '🐸' },
  ];
  function resetPond() {
    S.pond = { cur: 0, ans: CARDS.map(() => null), bad: {}, w: { act: 4, rea: 4, int: 4 }, fly: [], pulse: 0 };
  }
  const pondCount = (k) => S.pond.ans.filter((a) => a === k).length;
  const pondDone = () => S.pond.ans.filter(Boolean).length;
  function pondLayout() {
    if (!PHONE) return {
      env: { x: 28, y: 46, w: 250, h: 190 }, life: { x: 522, y: 46, w: 250, h: 190 },
      act: [282, 98, 518, 98], rea: [518, 186, 282, 186], intA: [556, 218, 738, 218], intB: [738, 230, 556, 230],
      card: { x: 100, y: 268, w: 600, h: 124 }, chipY: 436, chipD: 34, chipStep: 46, note: { x: 400, y: 500 },
      lab: { act: [400, 76], rea: [400, 160] },
    };
    return {
      env: { x: 10, y: 10, w: 460, h: 100 }, life: { x: 10, y: 236, w: 460, h: 132 },
      act: [130, 114, 130, 232], rea: [350, 232, 350, 114], intA: [40, 330, 440, 330], intB: [440, 346, 40, 346],
      card: { x: 10, y: 384, w: 460, h: 132 }, chipY: 556, chipD: 30, chipStep: 38, note: { x: 240, y: 604 },
      lab: { act: [130, 150], rea: [350, 150] },
    };
  }
  const PL = pondLayout();
  function chipPos(i) { const n = CARDS.length, x0 = VW / 2 - (n - 1) * PL.chipStep / 2; return { x: x0 + i * PL.chipStep, y: PL.chipY, r: PL.chipD / 2 }; }
  function arrowTarget(k) { const a = PL[k === 'int' ? 'intA' : k]; return { x: (a[0] + a[2]) / 2, y: (a[1] + a[3]) / 2 }; }
  function pondAssign(c) {
    const P = S.pond, i = P.cur;
    if (P.ans[i] === c) { Sound.tick(); return; }
    P.ans[i] = c; delete P.bad[i];
    const cd = PL.card, tg = arrowTarget(c);
    const f = { x: cd.x + cd.w / 2, y: cd.y + cd.h / 2, s: 1, ic: CARDS[i].ic, k: c };
    P.fly.push(f);
    SciSim.tween(f, { x: tg.x, y: tg.y, s: 0.35 }, { duration: 0.55, ease: 'outCubic', onDone: () => { parts.burst(f.x, f.y, { count: 10, colors: [KCOL[c], '#fff', '#ffd24d'], speed: 100, size: 3, life: 0.6, gravity: 40 }); P.fly.splice(P.fly.indexOf(f), 1); } });
    Sound.click();
    // 다음에 분류하지 않은 카드로
    for (let d = 1; d <= CARDS.length; d++) { const j = (i + d) % CARDS.length; if (!P.ans[j]) { setTimeout(() => { if (S.pond === P && P.cur === i) { P.cur = j; updateCtl(); } }, 320); break; } }
    updateCtl();
  }
  function pondGo(d) { const P = S.pond; P.cur = (P.cur + d + CARDS.length) % CARDS.length; Sound.tick(); updateCtl(); }
  function pondDown(p) {
    for (let i = 0; i < CARDS.length; i++) { const c = chipPos(i); if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r + 5) { S.pond.cur = i; Sound.tick(); updateCtl(); return false; } }
    return false;
  }
  function drawPond(dt, t) {
    const P = S.pond;
    D.sky(0, 0, VW, VH, '#cfeaff', '#e9f7ff');
    // 연못 물결
    ctx.fillStyle = 'rgba(78,167,225,.22)'; ctx.fillRect(0, VH * 0.62, VW, VH * 0.38);
    D.wave(0, VW, VH * 0.62, { color: 'rgba(78,167,225,.5)', amp: 5, phase: t });
    // 상자
    const eb = PL.env, lb = PL.life;
    panel(eb.x, eb.y, eb.w, eb.h, 18, '#fffbe9'); panel(lb.x, lb.y, lb.w, lb.h, 18, '#eefbf1');
    T(eb.x + eb.w / 2, eb.y + 26, '비생물 환경', PHONE ? 15 : 17, '#92400e', 'center', 800);
    T(lb.x + lb.w / 2, lb.y + 26, '생물 (연못에 사는 생물)', PHONE ? 15 : 17, '#166534', 'center', 800);
    const eI = ['☀️', '💧', '🌡️', '🫧', '🪨'], lI = ['🌿', '🐟', '🐸', '🦟', '🍄'];
    eI.forEach((e, i) => E(e, eb.x + 36 + i * (eb.w - 72) / 4, eb.y + (PHONE ? 66 : 82) + Math.sin(t * 1.6 + i) * 3, PHONE ? 30 : 38));
    lI.forEach((e, i) => E(e, lb.x + 36 + i * (lb.w - 72) / 4, lb.y + (PHONE ? 52 : 82) + Math.sin(t * 1.4 + i * 1.3) * 3, PHONE ? 30 : 38));
    T(eb.x + eb.w / 2, eb.y + eb.h - 12, '빛 · 물 · 온도 · 산소 · 양분', PHONE ? 12.5 : 13, '#6b4e00', 'center', 700);
    // 화살표 (굵기 = 분류한 카드 수)
    ['act', 'rea', 'int'].forEach((k) => { P.w[k] = SciSim.approach(P.w[k], 4 + Math.min(12, pondCount(k)), dt, 6); });
    const aw = (k) => P.w[k];
    const A1 = PL.act, A2 = PL.rea, B1 = PL.intA, B2 = PL.intB;
    D.arrow(A1[0], A1[1], A1[2], A1[3], { color: KCOL.act, width: aw('act') });
    D.arrow(A2[0], A2[1], A2[2], A2[3], { color: KCOL.rea, width: aw('rea') });
    D.arrow(B1[0], B1[1], B1[2], B1[3], { color: KCOL.int, width: aw('int') * 0.7, head: 12 });
    D.arrow(B2[0], B2[1], B2[2], B2[3], { color: KCOL.int, width: aw('int') * 0.7, head: 12 });
    const lb2 = (k, x, y, txt) => D.label(x, y, txt, { bg: KCOL[k], size: PHONE ? 13 : 14.5 });
    lb2('act', PL.lab.act[0], PL.lab.act[1], '작용 · ' + pondCount('act') + '장');
    lb2('rea', PL.lab.rea[0], PL.lab.rea[1], '반작용 · ' + pondCount('rea') + '장');
    lb2('int', PHONE ? 240 : 646, PHONE ? 314 : 200, '상호 작용 · ' + pondCount('int') + '장');
    if (!PHONE) { T(400, 122, '환경 → 생물', 13, '#0369a1', 'center', 800); T(400, 212, '생물 → 환경', 13, '#166534', 'center', 800); }
    else { T(150, 200, '환경 → 생물', 12.5, '#0369a1', 'left', 800); T(370, 200, '생물 → 환경', 12.5, '#166534', 'left', 800); }
    // 현재 카드
    const cd = PL.card, c = CARDS[P.cur], ans = P.ans[P.cur];
    panel(cd.x, cd.y, cd.w, cd.h, 18, '#fff');
    D.roundRect(cd.x, cd.y, cd.w, cd.h, 18); ctx.lineWidth = 3; ctx.strokeStyle = ans ? KCOL[ans] : '#c7d6e6'; ctx.stroke();
    D.label(cd.x + 52, cd.y + 22, '카드 ' + (P.cur + 1) + ' / ' + CARDS.length, { bg: '#475569', size: PHONE ? 12.5 : 13.5 });
    E(c.ic, cd.x + 46, cd.y + cd.h / 2 + 14, PHONE ? 46 : 58);
    textBlock(cd.x + (PHONE ? 90 : 100), cd.y + (PHONE ? 66 : 70), cd.w - (PHONE ? 106 : 120), c.t, PHONE ? 15 : 18, '#1f2d44', PHONE ? 22 : 26, 800);
    if (ans) D.label(cd.x + cd.w - 66, cd.y + 22, '내 선택: ' + KIND[ans], { bg: KCOL[ans], size: PHONE ? 12.5 : 13.5 });
    // 번호 칩
    for (let i = 0; i < CARDS.length; i++) {
      const q = chipPos(i), a = P.ans[i], cur = i === P.cur;
      ctx.save(); ctx.translate(q.x, q.y); if (cur) ctx.scale(1.18, 1.18);
      ctx.fillStyle = a ? KCOL[a] : '#dbe4ee'; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, TAU); ctx.fill();
      ctx.lineWidth = cur ? 3.5 : 2; ctx.strokeStyle = P.bad[i] ? '#dc2626' : cur ? '#1f2d44' : 'rgba(255,255,255,.9)'; ctx.stroke();
      T(0, 5, String(i + 1), PHONE ? 13 : 14.5, a ? '#fff' : '#6b7a90', 'center', 800);
      ctx.restore();
    }
    T(PL.note.x, PL.note.y, '번호를 누르면 그 카드로 이동해요. 빨간 테두리는 다시 생각할 카드예요.', PHONE ? 12.5 : 13.5, '#5d6879', 'center', 700);
    // 날아가는 카드
    P.fly.forEach((f) => { ctx.save(); ctx.globalAlpha = clamp(f.s * 1.4, 0, 1); D.sphere(f.x, f.y, 24 * f.s + 6, KCOL[f.k], { gloss: false }); E(f.ic, f.x, f.y, 28 * f.s + 4); ctx.restore(); });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     읽음 칸
     ========================================================= */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'forest') {
      const F = S.forest; L1 = '찾은 요소'; a = forestFound() + ' / ' + FIT.length; L2 = '생물 요인'; b = forestBio() + ' / ' + BIO_N; L3 = '비생물 요인'; c = (forestFound() - forestBio()) + ' / ' + ABIO_N;
    } else if (m === 'stack') {
      L1 = '놓은 블록'; a = stackPlaced() + ' / ' + LV.length; L2 = '생물 요인만'; b = '군집까지'; L3 = '비생물 요인 포함'; c = '생태계';
    } else if (m === 'light') {
      const l = S.light; L1 = '빛의 세기'; a = LIGHT[l.i] + ' %'; L2 = '양지 식물 광합성량'; b = SUNP[l.i]; L3 = '음지 식물 광합성량'; c = SHADEP[l.i];
    } else if (m === 'adapt') {
      const A = S.adapt; L1 = '짝지은 사례'; a = A.sel.filter((v) => v != null).length + ' / ' + ADAPT_FACTORS.length; L2 = '환경이 생물에게'; b = '영향을 줘요'; L3 = '이름'; c = '작용';
    } else if (m === 'cmp') {
      const B = S.cmp.bare, Fo = S.cmp.forest;
      L1 = '기온 (맨땅·숲속)'; a = (B.done ? SITE.bare.temp : '—') + ' · ' + (Fo.done ? SITE.forest.temp : '—') + ' °C';
      L2 = '습도 (맨땅·숲속)'; b = (B.done ? SITE.bare.hum : '—') + ' · ' + (Fo.done ? SITE.forest.hum : '—') + ' %';
      L3 = '광량 (맨땅·숲속)'; c = (B.done ? SITE.bare.light : '—') + ' · ' + (Fo.done ? SITE.forest.light : '—') + ' %';
    } else if (m === 'worm') {
      const W = S.worm; L1 = '경과'; a = (W.st === 'idle' ? 0 : Math.min(4, Math.ceil(W.p * 4 - 1e-9))) + ' / 4주'; L2 = '키 (지렁이 없음)'; b = Math.round(plantCm('A', W.p)) + ' cm'; L3 = '키 (지렁이 있음)'; c = Math.round(plantCm('B', W.p)) + ' cm';
    } else if (m === 'leaf') {
      const Lf = S.leaf; L1 = '낙엽의 양'; a = Math.round(leafPct(Lf.p)) + ' %'; L2 = '토양 속 양분'; b = Math.round(nutPct(Lf.p)) + ' %'; L3 = '분해자'; c = Lf.st === 'run' ? '분해하는 중' : Lf.st === 'done' ? '분해 완료' : '대기';
    } else {
      L1 = '작용'; a = pondCount('act') + '장'; L2 = '반작용'; b = pondCount('rea') + '장'; L3 = '상호 작용'; c = pondCount('int') + '장';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* =========================================================
     컨트롤 연결
     ========================================================= */
  $('#bForestReset').addEventListener('click', () => { Sound.click(); resetForest(); });
  $('#bStackReset').addEventListener('click', () => { Sound.click(); resetStack(); });
  $('#sLight').addEventListener('input', (e) => { S.light.i = +e.target.value; updateCtl(); Sound.tick(); });
  $('#bRecord').addEventListener('click', lightRecord);
  $('#bLightReset').addEventListener('click', () => { Sound.click(); const i = S.light.i; resetLight(); S.light.i = i; S.light.sun = SUNP[i]; S.light.shade = SHADEP[i]; S.light.glow = LIGHT[i]; updateCtl(); });
  $('#bMeasBare').addEventListener('click', () => cmpMeasure('bare'));
  $('#bMeasForest').addEventListener('click', () => cmpMeasure('forest'));
  $('#bWormRun').addEventListener('click', () => { Sound.click(); if (S.worm.st !== 'run') { S.worm.st = 'run'; S.worm.p = 0; updateCtl(); } });
  $('#bWormReset').addEventListener('click', () => { Sound.click(); resetWorm(); updateCtl(); });
  $('#bLeafRun').addEventListener('click', () => { Sound.click(); if (S.leaf.st !== 'run') { S.leaf.st = 'run'; S.leaf.p = 0; updateCtl(); } });
  $('#bLeafReset').addEventListener('click', () => { Sound.click(); resetLeaf(); updateCtl(); });
  $('#bPrev').addEventListener('click', () => pondGo(-1));
  $('#bNext').addEventListener('click', () => pondGo(1));
  $$('#catRow button').forEach((b) => b.addEventListener('click', () => pondAssign(b.dataset.c)));
  buildAdaptRows();

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'forest') return forestDown(p);
      if (S.mode === 'stack') return stackDown(p);
      if (S.mode === 'pond') return pondDown(p);
      return false;
    },
    move(p) { if (S.mode === 'stack') stackMove(p); },
    up(p) { if (S.mode === 'stack') stackUp(p); },
    hover(p) {
      if (S.mode === 'forest') { if (PHONE && p.y > SH) return 'default'; return forestHit(toScene(p), S.clock) ? 'pointer' : 'default'; }
      if (S.mode === 'stack') return S.stack.tiles.some((tl) => p.x >= tl.x && p.x <= tl.x + tl.w && p.y >= tl.y && p.y <= tl.y + tl.h) ? 'grab' : 'default';
      if (S.mode === 'pond') return CARDS.some((c, i) => { const q = chipPos(i); return Math.hypot(p.x - q.x, p.y - q.y) < q.r + 5; }) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '생태계를 이루는 것들', short: '생태계 구성', icon: '🌳', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 숲속은 왜 한여름에도 맨땅보다 시원할까? 환경과 생물은 서로 어떤 영향을 줄까?</p>' +
        '<div class="si-link">🔗 <b>초등학교·중학교에서</b> 생물과 환경, 먹이 사슬, 광합성과 호흡을 배웠어요. 이번 차시에서는 이것들을 <b>생태계</b>라는 하나의 시스템으로 묶어 정리해요.</div>' +
        '<p>숲 장면을 눌러 생태계의 <b>구성요소</b>를 찾고, <b>개체 → 개체군 → 군집 → 생태계</b>의 차이를 블록으로 정리해요.</p>',
      features: ['forest', 'stack'],
      setup() { resetForest(); resetStack(); setMode('forest'); },
      recap: '생태계는 생물 요인(생산자·소비자·분해자)과 비생물 요인(빛·온도·물·공기·토양 등)으로 이루어져요. 개체 → 개체군 → 군집 → 생태계 순으로 범위가 넓어져요.',
      summary: '<ul><li><b>생태계</b> = 생물 요인 + 비생물 요인</li><li><b>생물 요인</b>: <b>생산자</b>(광합성으로 양분을 만드는 식물), <b>소비자</b>(다른 생물을 먹는 동물), <b>분해자</b>(사체·배설물을 분해하는 버섯·세균)</li><li><b>비생물 요인</b>: 빛, 온도, 물, 공기, 토양 등</li><li>개체 → <b>개체군</b>(같은 종의 모임) → <b>군집</b>(여러 종의 모임, 생물 전체) → <b>생태계</b>(군집 + 비생물 요인)</li></ul>',
      missions: [
        {
          id: 'find', title: '숲 생태계의 구성요소 찾기',
          goal: '숲 장면의 요소를 눌러 <b>' + NEED_FIND + '개 이상</b> 찾아 보세요. 이름표에 어떤 구성요소인지 나타나요.',
          hint: '살아 있는 것(나무·풀·동물·버섯)뿐 아니라 하늘(햇빛·공기)과 물가, 땅속, 온도계, 오른쪽 아래 돋보기 속 작은 생물도 눌러 보세요.',
          setup() { setMode('forest'); },
          check: () => forestFound() >= NEED_FIND,
          hold: 0.6,
          status: () => '찾은 요소 ' + forestFound() + ' / ' + FIT.length + ' (' + NEED_FIND + '개 이상 ' + mark(forestFound() >= NEED_FIND) + ') · 생물 ' + forestBio() + ' · 비생물 ' + (forestFound() - forestBio()),
          explain: '생태계는 <b>생물 요인</b>과 <b>비생물 요인</b>으로 이루어져요. 생물 요인은 광합성으로 양분을 만드는 <b>생산자</b>(나무·풀), 다른 생물을 먹는 <b>소비자</b>(나비·새·토끼), 사체와 배설물을 분해하는 <b>분해자</b>(버섯·세균)로 나눠요. 비생물 요인은 <b>빛·온도·물·공기·토양</b> 등이에요.',
        },
        {
          id: 'stack', title: '개체에서 생태계까지 쌓기', manual: true,
          goal: '이름표 블록 4개를 끌어서 <b>설명에 맞는 층</b>에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아래층은 생물 하나, 위로 갈수록 범위가 넓어져요. 맨 위층은 생물뿐 아니라 빛·온도·물·공기·토양까지 포함해요.',
          setup() { resetStack(); setMode('stack'); },
          check() {
            const st = S.stack, miss = LV.length - stackPlaced();
            if (miss) return '아직 놓지 않은 블록이 ' + miss + '개 있어요. 모든 블록을 끌어서 칸에 놓아요.';
            const wrong = st.tiles.filter((tl) => SL.slots[tl.slot].lv !== tl.lv);
            wrong.forEach((tl) => { if (!st.bad[tl.lv]) { st.bad[tl.lv] = true; tl.shake = 1; } });
            if (wrong.length) return '빨간 테두리의 블록(' + wrong.map((tl) => tl.name).join(', ') + ')은 설명과 맞지 않아요. 그 층의 설명을 다시 읽어 보세요.';
            return true;
          },
          status: () => '놓은 블록 ' + stackPlaced() + ' / ' + LV.length,
          explain: '<b>개체</b>(생물 하나) → <b>개체군</b>(같은 종의 모임) → <b>군집</b>(여러 종의 개체군이 모인 생물 전체) → <b>생태계</b>(군집 + 빛·온도·물·공기·토양 같은 비생물 요인) 순서로 범위가 넓어져요.',
        },
        {
          type: 'quiz', title: '개체군과 군집',
          goal: '숲에 사는 <b>모든 토끼</b>는 ( ① )이고, 토끼·여우·새·풀·버섯처럼 <b>여러 종의 생물 전체</b>는 ( ② )예요. ①과 ②를 옳게 짝지은 것은?',
          setup() { setMode('stack'); },
          choices: ['① 개체군, ② 군집', '① 군집, ② 개체군', '① 개체군, ② 생태계', '① 개체, ② 군집'],
          answer: 0,
          feedback: ['', '반대로 말했어요. 같은 종의 모임이 개체군, 여러 종의 모임이 군집이에요.', '생태계는 군집에 빛·온도·물·공기·토양 같은 비생물 요인까지 합친 것이에요. 생물만 모인 것은 군집이에요.', '토끼 한 마리가 개체예요. 같은 종인 숲의 모든 토끼는 하나의 개체군이에요.'],
          explain: '<b>같은 종</b>의 개체가 모이면 <b>개체군</b>, <b>여러 종</b>의 개체군이 모이면 <b>군집</b>이에요. 군집에 <b>비생물 요인</b>까지 포함하면 <b>생태계</b>가 돼요.',
        },
      ],
    },
    {
      title: '환경이 생물에 주는 영향', short: '환경→생물', icon: '☀️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생태계가 생물 요인과 비생물 요인으로 이루어진다는 것을 확인했어요. 이제 <b>비생물 요인(환경)이 생물에게 주는 영향</b>, 즉 <b>작용</b>을 알아봐요.</div>' +
        '<p>① <b>빛의 세기</b>를 바꾸며 양지 식물과 음지 식물의 <b>광합성량</b>을 그래프로 그려요. ② 사막·극지방·건조한 땅 같은 환경에 <b>적응한 생물</b>의 특징을 짝지어요.</p>',
      features: ['light', 'adapt'],
      setup() { resetLight(); resetAdapt(); setMode('light'); },
      recap: '빛의 세기, 온도, 물, 일조 시간 같은 환경 요인은 생물의 광합성량, 몸의 구조, 행동에 영향을 줘요. 이것을 작용이라고 해요.',
      summary: '<ul><li><b>작용</b>: 비생물 요인(환경)이 생물에게 영향을 주는 것</li><li>빛의 세기가 같아도 식물마다 광합성량이 달라요. <b>약한 빛</b>(10 %·25 %)에서는 <b>음지 식물</b>이, <b>강한 빛</b>(75 %·100 %)에서는 <b>양지 식물</b>이 광합성량이 더 커요.</li><li>사막여우(큰 귀로 열 방출), 북극여우(작은 귀·두꺼운 털), 선인장(가시·물 저장)처럼 생물은 환경에 알맞은 특징을 가져요.</li><li>일조 시간은 철새의 이동과 식물이 꽃 피는 시기에, 겨울의 추위와 건조는 낙엽수의 낙엽에 영향을 줘요.</li></ul>',
      missions: [
        {
          id: 'light', title: '빛의 세기와 광합성량 기록',
          goal: '빛의 세기를 <b>5단계</b> 모두 바꿔 가며 <b>📌 기록하기</b>를 눌러 그래프를 완성하세요.',
          hint: '슬라이더를 10 %부터 100 %까지 옮기면서 단계마다 📌 이 값 기록하기를 눌러요. 식물 위의 산소 방울이 많을수록 광합성량이 커요.',
          setup() { setMode('light'); },
          check: () => lightAllRec(),
          hold: 0.6,
          status: () => LIGHT.map((v, i) => mark(S.light.rec[i]) + v + ' %').join(' &nbsp; '),
          explain: '빛이 약할 때(10 %·25 %)는 <b>음지 식물</b>의 광합성량이 더 크고, 빛이 강할 때(75 %·100 %)는 <b>양지 식물</b>이 더 커요. 이처럼 <b>빛의 세기</b>라는 환경 요인이 식물의 광합성량에 영향을 줘요.',
        },
        {
          id: 'adapt', title: '환경 요인과 생물의 특징 짝짓기', manual: true,
          goal: '다섯 가지 환경에서 <b>생물이 어떤 특징</b>을 가지는지 짝지어 <b>✔ 확인하기</b>를 누르세요.',
          hint: '사막은 몹시 덥고, 극지방은 몹시 추워요. 선인장이 사는 곳은 물이 부족하고, 낙엽수는 겨울의 추위와 건조를 견뎌야 해요.',
          setup() { setMode('adapt'); },
          check() {
            const A = S.adapt, miss = A.sel.filter((v) => v == null).length;
            if (miss) return '아직 고르지 않은 사례가 ' + miss + '개 있어요.';
            const bad = [];
            A.sel.forEach((v, i) => {
              const ok = v === ADAPT_FACTORS[i].ans;
              if (ok) { A.mark[i] = 1; adaptSel[i].classList.remove('bad'); adaptSel[i].classList.add('ok'); }
              else { bad.push(i); if (A.mark[i] !== 2) { A.mark[i] = 2; A.shakeT = S.clock; adaptSel[i].classList.remove('ok'); adaptSel[i].classList.add('bad'); } }
            });
            if (bad.length) return '빨간 칸(' + bad.map((i) => ADAPT_FACTORS[i].name).join(', ') + ')을 다시 생각해 보세요. 그 환경의 어려움(더위·추위·물 부족·낮의 길이·겨울)에 어떻게 대응할까요?';
            return true;
          },
          status: () => '고른 사례 ' + S.adapt.sel.filter((v) => v != null).length + ' / ' + ADAPT_FACTORS.length,
          explain: '<b>사막여우</b>는 큰 귀로 몸의 열을 내보내고, <b>북극여우</b>는 작은 귀와 두꺼운 털로 열을 지켜요. <b>선인장</b>은 잎이 가시로 변하고 줄기에 물을 저장해요. <b>철새</b>는 일조 시간의 변화에 맞춰 이동하고, <b>낙엽수</b>는 겨울에 잎을 떨어뜨려 물의 손실을 줄여요. 모두 환경이 생물에게 주는 영향(<b>작용</b>)이에요.',
        },
        {
          type: 'quiz', title: '양지 식물과 음지 식물',
          goal: '숲속 땅 위는 빛이 약해요(약 ' + SITE.forest.light + ' %). 이곳에서 더 유리한 식물과 그 까닭은?',
          setup() { setMode('light'); },
          choices: ['음지 식물 – 약한 빛에서도 광합성량이 커서', '양지 식물 – 빛이 강해야 하므로 약한 빛에서도 잘 자라서', '두 식물 모두 같다 – 빛의 세기는 광합성량과 관계없어서', '음지 식물 – 빛이 약할수록 광합성량이 늘어나서'],
          answer: 0,
          feedback: ['', '그래프를 다시 보세요. 10 %와 25 %에서는 양지 식물(' + SUNP[0] + ', ' + SUNP[1] + ')보다 음지 식물(' + SHADEP[0] + ', ' + SHADEP[1] + ')의 광합성량이 더 커요.', '빛의 세기에 따라 광합성량이 달라졌어요. 빛(비생물 요인)이 생물에 영향을 준 거예요.', '빛이 약할수록 늘어나는 것은 아니에요. 음지 식물도 ' + LIGHT[2] + ' %부터는 광합성량이 ' + SHADEP[2] + '로 일정해요.'],
          explain: '약한 빛(' + LIGHT[0] + ' %·' + LIGHT[1] + ' %)에서는 <b>음지 식물</b>의 광합성량이 더 커서 숲속 바닥처럼 어두운 곳에서 유리해요. 강한 빛에서는 <b>양지 식물</b>이 유리해요. 일조 시간이 철새의 이동이나 꽃 피는 시기에 영향을 주는 것도 같은 <b>작용</b>이에요.',
        },
      ],
    },
    {
      title: '생물이 환경에 주는 영향', short: '생물→환경', icon: '🪱', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛·온도 같은 환경이 생물에게 영향을 주는 <b>작용</b>을 확인했어요. 거꾸로 <b>생물이 환경을 바꾸기도</b> 할까요?</div>' +
        '<p>한여름 낮 <b>맨땅</b>과 <b>숲속</b>의 기온·습도를 재고, <b>지렁이</b>가 있는 흙과 없는 흙, <b>낙엽을 분해</b>하는 분해자의 역할을 관찰해요.</p>',
      features: ['soil'],
      setup() { resetCmp(); resetWorm(); resetLeaf(); setMode('cmp'); },
      recap: '숲은 기온을 낮추고 습도를 높이고, 지렁이는 흙의 통기성을 좋게 하고, 분해자는 양분을 토양으로 돌려보내요. 이처럼 생물이 환경에 영향을 주는 것을 반작용이라고 해요.',
      summary: '<ul><li><b>반작용</b>: 생물이 비생물 요인(환경)에 영향을 주는 것</li><li>한여름 낮 맨땅 ' + SITE.bare.temp + ' °C·습도 ' + SITE.bare.hum + ' %·광량 ' + SITE.bare.light + ' %, 숲속 ' + SITE.forest.temp + ' °C·습도 ' + SITE.forest.hum + ' %·광량 ' + SITE.forest.light + ' % → 숲이 그늘을 만들고 증산 작용으로 수증기를 내보내 <b>기온은 낮추고 습도는 높여요</b>.</li><li>식물의 광합성은 대기의 산소를 늘려요. 식물 뿌리는 토양이 쓸려 가는 것을 막아요.</li><li><b>지렁이</b>는 흙 속에 공기 통로를 만들어 통기성을 높이고, <b>분해자</b>는 낙엽·사체를 분해해 양분을 토양으로 되돌려요.</li></ul>',
      missions: [
        {
          id: 'measure', title: '맨땅·숲속 측정과 흙 속 관찰',
          goal: '<b>🌡️ 측정</b>에서 맨땅과 숲속의 값을 읽고, <b>🪱 흙</b>과 <b>🍂 낙엽</b>에서 시간을 지나게 해 끝까지 관찰하세요.',
          hint: '측정 화면의 두 버튼으로 맨땅과 숲속에 도구를 놓아요. 위쪽 🪱 흙, 🍂 낙엽 버튼으로 화면을 바꾼 뒤 ▶를 눌러요.',
          setup() { setMode('cmp'); },
          check: () => S.cmp.bare.done && S.cmp.forest.done && S.worm.st === 'done' && S.leaf.st === 'done',
          hold: 0.6,
          status: () => mark(S.cmp.bare.done) + ' 맨땅 &nbsp; ' + mark(S.cmp.forest.done) + ' 숲속 &nbsp; ' + mark(S.worm.st === 'done') + ' 지렁이 흙 &nbsp; ' + mark(S.leaf.st === 'done') + ' 낙엽 분해',
          explain: '숲속은 맨땅보다 기온이 ' + (SITE.bare.temp - SITE.forest.temp) + ' °C 낮고(' + SITE.bare.temp + ' → ' + SITE.forest.temp + ' °C) 습도는 높아요(' + SITE.bare.hum + ' → ' + SITE.forest.hum + ' %). 지렁이가 있는 흙은 공기 통로가 생겨 식물이 더 잘 자라고(' + PLANT_NOWORM + ' → ' + PLANT_WORM + ' cm), 분해자가 낙엽을 분해하면 양분이 토양으로 돌아와요(토양 양분 ' + NUT_START + ' → ' + NUT_END + ' %). 이처럼 <b>생물이 환경을 바꾸는 것</b>이 <b>반작용</b>이에요.',
        },
        {
          type: 'quiz', title: '숲이 한여름에도 시원한 까닭',
          goal: '한여름 낮 숲속(' + SITE.forest.temp + ' °C)이 맨땅(' + SITE.bare.temp + ' °C)보다 시원한 까닭으로 가장 알맞은 것은?',
          setup() { setMode('cmp'); },
          choices: ['나무가 그늘을 만들고, 잎에서 물이 증산 작용으로 나오며 주변의 열을 가져가서', '숲에는 햇빛이 한 줄기도 들어오지 않아서', '환경은 생물에게만 영향을 주고, 생물은 환경에 영향을 주지 못해서', '숲의 흙이 햇빛을 모두 반사해서'],
          answer: 0,
          feedback: ['', '숲속 땅 위 광량은 ' + SITE.forest.light + ' %로 약하지만 0은 아니에요. 그늘과 증산 작용이 함께 기온을 낮춰요.', '틀린 생각이에요(오개념). 이번 단계에서 숲이 기온·습도를, 지렁이가 흙을, 분해자가 토양 양분을 바꾸는 것을 봤어요.', '흙이 햇빛을 반사하는 것이 아니라, 나무의 잎이 햇빛을 가리고 증산 작용을 해서 시원해져요.'],
          explain: '나무의 잎은 햇빛을 가려 <b>그늘</b>을 만들고, <b>증산 작용</b>으로 물을 수증기로 내보내면서 주변의 열을 가져가요. 그래서 숲속은 기온이 낮고 습도가 높아요. 환경이 생물에게만 영향을 주는 것이 아니라 <b>생물도 환경에 영향</b>을 줘요.',
        },
      ],
    },
    {
      title: '생물과 환경의 상호 관계 정리', short: '상호 관계', icon: '🔄', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 환경이 생물에게 주는 <b>작용</b>과 생물이 환경에 주는 <b>반작용</b>을 모두 확인했어요. 생물과 생물 사이의 <b>상호 작용</b>까지 합쳐 정리해 봐요.</div>' +
        '<p>연못 생태계의 사례 카드 <b>' + CARDS.length + '장</b>을 읽고 <b>작용 · 반작용 · 상호 작용</b>으로 분류해요. 분류한 카드가 많은 화살표일수록 굵어져요.</p>',
      features: ['pond'],
      setup() { resetPond(); setMode('pond'); },
      recap: '생태계에서는 환경이 생물에게(작용), 생물이 환경에게(반작용), 생물이 다른 생물에게(상호 작용) 영향을 주며 서로 얽혀 있어요.',
      summary: '<ul><li><b>작용</b>: 환경 → 생물 (예: 물의 온도가 낮아지면 물고기의 활동이 줄어요)</li><li><b>반작용</b>: 생물 → 환경 (예: 수생 식물이 산소를 내놓아요, 낙엽이 분해되어 양분이 돼요)</li><li><b>상호 작용</b>: 생물 ↔ 생물 (먹이 관계, 경쟁, 공생 등. 먹이 관계는 다음 차시에서 자세히 배워요)</li><li>생태계의 구성요소는 이렇게 서로 영향을 주고받아요.</li></ul>',
      missions: [
        {
          id: 'pond', title: '연못 사례 분류하기', manual: true,
          goal: '카드 ' + CARDS.length + '장을 읽고 <b>작용 · 반작용 · 상호 작용</b> 중 하나로 분류한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '영향을 주는 쪽과 받는 쪽을 찾아요. 환경(빛·온도·물·산소) → 생물이면 작용, 생물 → 환경이면 반작용, 생물과 생물 사이면 상호 작용이에요.',
          setup() { setMode('pond'); },
          check() {
            const P = S.pond, miss = P.ans.filter((a) => !a).length;
            if (miss) return '아직 분류하지 않은 카드가 ' + miss + '장 있어요.';
            const bad = [];
            CARDS.forEach((c, i) => { if (P.ans[i] !== c.k) { bad.push(i); if (!P.bad[i]) P.bad[i] = true; } else delete P.bad[i]; });
            if (bad.length) return '빨간 테두리의 카드(' + bad.map((i) => (i + 1) + '번').join(', ') + ')를 다시 생각해 보세요. 영향을 주는 쪽이 환경인지 생물인지, 받는 쪽은 무엇인지 따져 봐요.';
            return true;
          },
          status: () => '분류한 카드 ' + pondDone() + ' / ' + CARDS.length,
          explain: '<b>작용</b>(환경 → 생물)은 물의 온도·햇빛·산소가 생물에게 주는 영향, <b>반작용</b>(생물 → 환경)은 산소 방출·이산화 탄소 방출·그늘·낙엽의 분해처럼 생물이 환경을 바꾸는 것, <b>상호 작용</b>(생물 ↔ 생물)은 먹이 관계와 경쟁처럼 생물끼리 주고받는 영향이에요.',
        },
        {
          type: 'quiz', title: '반작용의 예 찾기',
          goal: '지렁이가 흙 속에 통로를 만들어 흙의 통기성이 좋아졌어요. 이것은 어떤 관계일까요?',
          setup() { setMode('pond'); },
          choices: ['작용 (환경이 생물에게 주는 영향)', '반작용 (생물이 환경에 주는 영향)', '상호 작용 (생물과 생물 사이의 영향)', '생태계와 관계없는 현상'],
          answer: 1,
          feedback: ['환경이 생물에게 주는 영향이 아니라, 생물(지렁이)이 환경(흙)을 바꾼 거예요.', '', '지렁이와 다른 생물 사이의 영향이 아니라 지렁이와 흙(비생물 요인) 사이의 영향이에요.', '지렁이의 활동은 흙의 통기성을 바꾸는 생태계 속 현상이에요.'],
          explain: '<b>지렁이(생물)</b>가 <b>흙(비생물 요인)</b>을 바꿨으므로 <b>반작용</b>이에요. 이렇게 바뀐 흙은 다시 식물의 생장에 영향을 줘서 생물과 환경이 서로 영향을 주고받아요.',
        },
        {
          type: 'quiz', title: '내가 할 수 있는 일',
          goal: '학교 뒤 숲의 나무가 많이 베어지면 기온이 오르고 습도가 낮아질 수 있어요. 숲과 우리 지역의 환경을 지키기 위해 <b>내가 할 수 있는 일</b>로 가장 알맞은 것은?',
          setup() { setMode('pond'); },
          choices: ['나무 심기와 숲 가꾸기 활동에 참여하고, 숲의 생물을 함부로 잡지 않아요.', '숲의 낙엽과 쓰러진 나무를 모두 치워서 숲을 깨끗하게 만들어요.', '숲의 동물을 집으로 가져와 키워요.', '숲이 줄어도 우리 생활에는 영향이 없다고 생각해요.'],
          answer: 0,
          feedback: ['', '낙엽과 쓰러진 나무는 분해자에게 분해되어 양분을 토양으로 돌려줘요. 모두 치우면 숲의 양분이 부족해질 수 있어요.', '야생 동물을 데려오면 그 동물이 살던 생태계의 균형이 깨질 수 있어요.', '숲은 기온·습도를 조절하고 산소를 내놓는 등 우리 환경에 영향을 줘요(반작용).'],
          explain: '숲은 기온과 습도를 조절하고 산소를 내놓는 등 환경에 큰 <b>반작용</b>을 해요. 나무를 심고 가꾸며 생물을 보호하는 작은 실천이 우리 지역 생태계를 지켜요. 세계시민으로서 환경에 관심을 갖고 책임을 나누는 일이 중요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-ecosystem', mount: '#game', badge: '생태계 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { forest: '🌳 숲 장면 · 구성요소 찾기', stack: '🧱 개체 → 생태계 블록', light: '☀️ 빛의 세기 슬라이더 · 광합성 그래프', adapt: '🦊 환경 적응 카드 짝짓기', soil: '🌡️ 온도계·습도계 · 🪱 지렁이 흙 · 🍂 낙엽 분해', pond: '🏞️ 연못 사례 카드 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetForest(); resetStack(); resetLight(); resetAdapt(); resetCmp(); resetWorm(); resetLeaf(); resetPond();
  setMode('forest');
  let lastFree = false, lastMode = '', celeb = null;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepWorm(dt); stepLeaf(dt);
    switch (S.mode) {
      case 'forest': drawForest(dt, t); break;
      case 'stack': drawStack(dt, t); break;
      case 'light': drawLight(dt, t); break;
      case 'adapt': drawAdapt(dt, t); break;
      case 'cmp': drawCmp(dt, t); break;
      case 'worm': drawWorm(dt, t); break;
      case 'leaf': drawLeaf(dt, t); break;
      default: drawPond(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(234,246,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    // 미션 성공 효과
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm && cm.id === 'stack' && !S.stack.done) {
      S.stack.done = true; SL.slots.forEach((s, i) => parts.burst(s.x + s.w / 2, s.y + s.h / 2, { count: 10, colors: ['#38bdf8', '#34d399', '#fbbf24', '#a78bfa'], speed: 140, size: 3.5, life: 0.9, delay: i }));
    }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, SC, SH, get game() { return game; }, setMode, FIT, fpos, forestHit, foundItem, LV, SL, stackDown, stackMove, stackUp, placeTile, LIGHT, lightRecord, ADAPT_FACTORS, adaptSel, CARDS, pondAssign, pondGo, cmpMeasure, SITE, resetPond, levels,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepWorm(0.02); stepLeaf(0.02); } },
  };
})();
