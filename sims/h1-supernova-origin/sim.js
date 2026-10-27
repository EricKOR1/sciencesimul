/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 원소의 기원과 우리 몸 (단원 4차시)
   성취기준 [10통과1-02-02] 우주 초기의 원소들로부터 태양계의 재료이면서 생명체를 구성하는 원소들이 형성되는 과정을 통해
   지구와 생명의 역사가 우주 역사의 일부분임을 해석할 수 있다.
   ① 관찰: 초신성 (폭발 → 성운 → 가스 구름 → 태양계, 철보다 무거운 원소)
   ② 탐구: 성분 비교 (우주 / 지구 지각 / 사람 몸 막대그래프)
   ③ 설명: 원소 지도 (원소 카드 12장 → 빅뱅 / 별 안의 핵융합 / 초신성)
   ④ 적용: 우주 역사 (연대표 카드 순서 맞추기, 문장 완성)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 740 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#0b1226' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function fitSize(str, maxW, size, weight) {
    ctx.save(); let s = size;
    ctx.font = D.font(s, weight || 800);
    while (s > 11 && ctx.measureText(str).width > maxW) { s -= 0.5; ctx.font = D.font(s, weight || 800); }
    ctx.restore(); return s;
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

  /* ---------- 자료 ---------- */
  const EL = {
    H: { sym: 'H', name: '수소', col: '#4aa3ff', tc: '#fff', origin: 'bang', crust: false, body: true },
    He: { sym: 'He', name: '헬륨', col: '#f5c518', tc: '#5b4300', origin: 'bang', crust: false, body: false },
    C: { sym: 'C', name: '탄소', col: '#4b5563', tc: '#fff', origin: 'star', crust: false, body: true },
    N: { sym: 'N', name: '질소', col: '#7c5cff', tc: '#fff', origin: 'star', crust: false, body: true },
    O: { sym: 'O', name: '산소', col: '#ef4444', tc: '#fff', origin: 'star', crust: true, body: true },
    Si: { sym: 'Si', name: '규소', col: '#a8825a', tc: '#fff', origin: 'star', crust: true, body: false },
    Al: { sym: 'Al', name: '알루미늄', col: '#94a3b8', tc: '#fff', origin: 'star', crust: true, body: false },
    Fe: { sym: 'Fe', name: '철', col: '#c2562b', tc: '#fff', origin: 'star', crust: true, body: false },
    Ca: { sym: 'Ca', name: '칼슘', col: '#7dd3c0', tc: '#0b4a3e', origin: 'star', crust: true, body: true },
    Na: { sym: 'Na', name: '나트륨', col: '#f59e0b', tc: '#fff', origin: 'star', crust: true, body: false },
    K: { sym: 'K', name: '칼륨', col: '#c084fc', tc: '#fff', origin: 'star', crust: true, body: false },
    Mg: { sym: 'Mg', name: '마그네슘', col: '#34d399', tc: '#fff', origin: 'star', crust: true, body: false },
    P: { sym: 'P', name: '인', col: '#fb7185', tc: '#fff', origin: 'star', crust: false, body: true },
    Ag: { sym: 'Ag', name: '은', col: '#cbd5e1', tc: '#334155', origin: 'nova', crust: false, body: false },
    Au: { sym: 'Au', name: '금', col: '#f5b301', tc: '#5b3d00', origin: 'nova', crust: false, body: false },
    U: { sym: 'U', name: '우라늄', col: '#84cc16', tc: '#fff', origin: 'nova', crust: false, body: false },
    etc: { sym: '…', name: '기타', col: '#9aa5b6', tc: '#fff', origin: null, crust: false, body: false },
  };
  const PANELS = {
    uni: { title: '우주', unit: '원자 수 비 (%)', rows: [['H', 92], ['He', 7.9], ['O', 0.06], ['C', 0.03], ['N', 0.01]] },
    crust: { title: '지구 지각', unit: '질량 (%)', rows: [['O', 46.6], ['Si', 27.7], ['Al', 8.1], ['Fe', 5.0], ['Ca', 3.6], ['Na', 2.8], ['K', 2.6], ['Mg', 2.1], ['etc', 1.5]] },
    body: { title: '사람 몸', unit: '질량 (%)', rows: [['O', 65], ['C', 18], ['H', 10], ['N', 3.0], ['Ca', 1.5], ['P', 1.0], ['etc', 1.5]] },
  };
  const valOf = (panel, el) => { const r = PANELS[panel].rows.find((x) => x[0] === el); return r ? r[1] : null; };
  const fmtV = (v) => (v == null ? '—' : v < 0.1 ? '<0.1' : (v >= 10 ? String(Math.round(v * 10) / 10) : String(v)));
  const ORIGIN_NAME = { bang: '빅뱅', star: '별 안의 핵융합', nova: '초신성' };
  const MAP_IDS = ['H', 'He', 'C', 'N', 'O', 'Si', 'Ca', 'Fe', 'Na', 'Ag', 'Au', 'U'];
  const MAP_ORDER = ['Au', 'C', 'H', 'Ca', 'U', 'O', 'Fe', 'He', 'Ag', 'N', 'Na', 'Si'];   // 카드 섞인 순서

  const STAGES = [
    { n: '① 폭발 직전', s: '폭발 직전', cap: '질량이 큰 별 속에는 양파 껍질처럼 층이 쌓이고, 중심에 철 핵이 만들어져요. 철은 핵융합으로 에너지를 내지 못해요.', t0: 0, t1: 0.18, jump: 0.08 },
    { n: '② 초신성 폭발', s: '폭발', cap: '철 핵이 붕괴하며 별이 폭발해요! 이 순간 철보다 무거운 금·은·우라늄이 만들어져요.', t0: 0.18, t1: 0.40, jump: 0.28 },
    { n: '③ 성운으로 흩어짐', s: '성운', cap: '별의 물질이 우주 공간으로 퍼져 성운이 돼요. 지금까지 만든 모든 원소가 섞여 있어요.', t0: 0.40, t1: 0.62, jump: 0.52 },
    { n: '④ 다시 모이는 가스 구름', s: '가스 구름', cap: '성운의 물질이 중력으로 다시 모여 회전하는 원반이 돼요.', t0: 0.62, t1: 0.84, jump: 0.74 },
    { n: '⑤ 태양계 탄생', s: '태양계', cap: '약 46억 년 전, 중심에 태양이, 둘레에 지구를 비롯한 행성이 생겼어요.', t0: 0.84, t1: 1.01, jump: 0.97 },
  ];
  const stageOf = (t) => { for (let i = 0; i < STAGES.length; i++) if (t < STAGES[i].t1) return i; return 4; };

  const EVENTS = [
    { id: 'bang', name: '빅뱅', date: '약 138억 년 전', ya: 138, k: 'bang' },
    { id: 'star1', name: '첫 별 탄생', date: '약 135억 년 전', ya: 135, k: 'star' },
    { id: 'sun', name: '태양계 형성', date: '약 46억 년 전', ya: 46, k: 'sun' },
    { id: 'earth', name: '원시 지구', date: '약 45억 년 전', ya: 45, k: 'earth' },
    { id: 'life', name: '최초의 생명', date: '약 38억 년 전', ya: 38, k: 'life' },
    { id: 'now', name: '현재', date: '오늘날', ya: 0, k: 'now' },
  ];
  const TIME_SHUFFLE = ['life', 'bang', 'now', 'sun', 'star1', 'earth'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sn', sub: '', clock: 0, dt: 0.016, fade: 0,
    // 초신성
    t: 0, tShown: 0, playing: false, maxT: 0, stages: new Set(), heavy: new Set(), callout: null, wasBlast: false, scrub: false,
    // 막대그래프
    bm: 'uni', bmSeen: new Set(['uni']), hl: null, bv: {}, hits: [], earthT: 0,
    // 원소 지도
    map: [], mapSel: null, mapDone: false, mapBar: 0,
    // 연대표
    time: [], tslots: [], timeDone: false, timeBar: 0, tsel: null,
    drag: null,
    tableOK: {}, sentOK: {},
  };
  let game = null;

  /* ---------- 배치 ---------- */
  const SN = PHONE ? { cx: 240, cy: 318, sr: 78, rn: 205, rd: 190 } : { cx: 400, cy: 268, sr: 92, rn: 232, rd: 205 };
  const TLINE = PHONE ? { y: 700, x0: 50, x1: 430 } : { y: 524, x0: 70, x1: 730 };

  /* 초신성 입자 (t만의 함수라서 슬라이더로 앞뒤로 움직여도 자연스러워요) */
  const R1 = rng(2025);
  const NEB = [];
  for (let i = 0; i < (PHONE ? 300 : 420); i++) {
    NEB.push({ a0: R1() * Math.PI * 2, r0: Math.pow(R1(), 0.7), k: 0.22 + 0.78 * Math.pow(R1(), 0.8), rd: Math.pow(R1(), 1.15), kind: Math.floor(R1() * 4), sz: 0.9 + R1() * 2.1, blob: false, tw: R1() * 6 });
  }
  for (let i = 0; i < 9; i++) NEB.push({ a0: i / 9 * Math.PI * 2 + R1() * 0.6, r0: 0.3, k: 0.35 + R1() * 0.4, rd: 0.2 + R1() * 0.55, kind: i % 4, sz: 46 + R1() * 26, blob: true, tw: 0 });
  const NCOL = ['#ff8fa3', '#7ee0c3', '#8ab4ff', '#ffc56e'];
  const TOK = [];
  [['Au', 0.34, 1.2], ['Ag', 0.52, 2.6], ['U', 0.7, 4.0], ['Au', 0.62, 5.1], ['Ag', 0.4, 0.2], ['U', 0.46, 3.3], ['Au', 0.78, 2.1], ['Ag', 0.7, 5.8], ['U', 0.36, 0.7]].forEach((d, i) => {
    TOK.push({ el: d[0], a0: d[2], r0: 0.2, k: d[1], rd: 0.18 + (i % 4) * 0.17, id: i, sz: 14 });
  });
  function nebPos(p, t) {
    const e = 1 - Math.pow(1 - clamp((t - 0.18) / 0.34, 0, 1), 3);
    let R = p.r0 * SN.sr * 0.9 * (1 - e) + p.k * SN.rn * e;
    const s = smooth(t, 0.62, 0.84);
    R = R * (1 - s) + p.rd * SN.rd * s;
    const rn = R / SN.rn;
    const rot = 5.2 * Math.max(0, t - 0.3);
    const ang = p.a0 + rot / (0.25 + rn) + S.clock * 0.18 * s / (0.25 + rn);
    return { x: SN.cx + Math.cos(ang) * R, y: SN.cy + Math.sin(ang) * R * (1 - 0.72 * s), R };
  }
  const diskFade = (t) => 1 - 0.92 * smooth(t, 0.86, 0.99);
  const PLANETS = [{ r: 0.3, c: '#c9b7a1', sz: 5, sp: 1.3 }, { r: 0.5, c: '#e8c07a', sz: 7, sp: 0.95 }, { r: 0.72, c: '#3b82f6', sz: 9, sp: 0.7, earth: true }, { r: 0.92, c: '#e07b54', sz: 7, sp: 0.5 }];

  /* ---------- 읽음 칸 / 안내 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const bPlay = $('#bPlay'), sTime = $('#sTime'), oStage = $('#oStage');
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4500);
  }

  /* ---------- 화면 전환 ---------- */
  const MODE_LABEL = { sn: '💥 초신성', bars: '📊 성분 비교', map: '🗺️ 원소 지도', time: '🕰️ 우주 역사' };
  function setScene(mode, sub) {
    if (S.mode !== mode) { S.fade = 1; S.drag = null; }
    S.mode = mode; S.sub = sub || '';
    if (mode === 'bars') { S.bv = {}; }
    $('#tbLabel').textContent = MODE_LABEL[mode];
    view.wrap.style.setProperty('--stage-bg', mode === 'sn' ? '#0d1530' : '#eef3fb');
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      const modes = n.getAttribute('data-modes').split(' ');
      const sub = n.getAttribute('data-sub');
      const show = modes.indexOf(S.mode) >= 0 && (!sub || sub === S.sub);
      n.hidden = !show;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.bm));
    $$('#stageChips button').forEach((b, i) => { b.classList.toggle('on', i === stageOf(S.t)); b.classList.toggle('seen', S.stages.has(i)); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode, ''); }));

  /* ---------- ① 초신성 ---------- */
  function setT(t, user) {
    S.t = clamp(t, 0, 1);
    if (user) S.playing = false;
  }
  bPlay.addEventListener('click', () => {
    Sound.click();
    if (S.t >= 0.995) S.t = 0;
    S.playing = !S.playing;
  });
  $('#bRewind').addEventListener('click', () => { Sound.click(); S.playing = false; S.t = 0; S.heavy.size && 0; });
  sTime.addEventListener('input', () => { setT(+sTime.value / 1000, true); });
  $$('#stageChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.playing = false; S.t = STAGES[+b.dataset.st].jump; }));
  sTime.style.setProperty('--pct', '0%');

  function tokenAt(p) {
    if (S.mode !== 'sn' || S.tShown < 0.2 || S.tShown > 0.86) return null;
    let best = null, bd = 1e9;
    TOK.forEach((k) => { const q = nebPos(k, S.tShown); const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 26 && d < bd) { bd = d; best = { k, q }; } });
    return best;
  }
  function tapToken(p) {
    const h = tokenAt(p); if (!h) return false;
    const el = h.k.el;
    S.heavy.add(el); S.callout = { el, until: SciSim.time() + 3.6, x: h.q.x, y: h.q.y };
    Sound.tick(); parts.burst(h.q.x, h.q.y, { count: 10, speed: 90, size: 3, colors: [EL[el].col, '#fff'], gravity: 0 });
    return true;
  }

  /* ---------- ② 막대그래프 ---------- */
  function setBM(v) {
    if (S.bm !== v) { S.bv = {}; S.hl = null; }
    S.bm = v; S.bmSeen.add(v); updateCtl();
  }
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setBM(b.dataset.v); }));
  function panelGeom() {
    const g = {};
    if (S.bm === 'all') {
      if (!PHONE) {
        const w = 248, y = 62, h = 466;
        ['uni', 'crust', 'body'].forEach((k, i) => { g[k] = { x: 14 + i * 262, y, w, h, rowH: 42, chip: 14, barX: 46, barW: 146, head: 56 }; });
      } else {
        let y = 8;
        ['uni', 'crust', 'body'].forEach((k) => {
          const n = PANELS[k].rows.length; const h = 44 + n * 25 + 8;
          g[k] = { x: 8, y, w: 464, h, rowH: 25, chip: 10, barX: 34, barW: 340, head: 40 }; y += h + 10;
        });
      }
    } else {
      const k = S.bm;
      if (!PHONE) g[k] = { x: 20, y: 62, w: 500, h: 466, rowH: k === 'crust' ? 44 : 48, chip: 17, barX: 54, barW: 370, head: 58 };
      else g[k] = { x: 8, y: 8, w: 464, h: 44 + PANELS[k].rows.length * 40 + 12, rowH: 40, chip: 15, barX: 48, barW: 340, head: 44 };
    }
    return g;
  }
  function tapBar(p) {
    for (const h of S.hits) {
      if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
        if (h.el === 'etc') { S.hl = null; return false; }
        S.hl = S.hl === h.el ? null : h.el; Sound.tick(); S.hlAt = SciSim.time(); return true;
      }
    }
    return false;
  }

  /* ---------- ③ 원소 지도 ---------- */
  const BINS = [
    { id: 'bang', title: '빅뱅', sub: '우주 초기', col: '#4aa3ff' },
    { id: 'star', title: '별 안의 핵융합', sub: '철까지', col: '#f59e0b' },
    { id: 'nova', title: '초신성', sub: '철보다 무거운 원소', col: '#ef4444' },
  ];
  const CW = 58, CH = 68;
  function mapLayout() {
    if (!PHONE) {
      const bw = 246, gap = 17, x0 = 14, y0 = 56, bh = 286;
      BINS.forEach((b, i) => { b.x = x0 + i * (bw + gap); b.y = y0; b.w = bw; b.h = bh; b.cols = 4; b.ox = 12; b.oy = 58; });
      S.trayArea = { x: 14, y: 350, w: 772, h: 200 };
    } else {
      const y0 = 50, bh = 148, gap = 8;
      BINS.forEach((b, i) => { b.x = 8; b.y = y0 + i * (bh + gap); b.w = 464; b.h = bh; b.cols = 6; b.ox = 92; b.oy = 8; });
      S.trayArea = { x: 8, y: y0 + 3 * (bh + gap) + 4, w: 464, h: 214 };
    }
  }
  function binSlot(b, i) {
    const col = i % b.cols, row = Math.floor(i / b.cols);
    const sx = PHONE ? 62 : 60;
    return { x: b.x + b.ox + CW / 2 + col * sx, y: b.y + b.oy + CH / 2 + row * (CH + 6) };
  }
  function traySlot(i) {
    const a = S.trayArea;
    if (!PHONE) { const col = i % 6, row = Math.floor(i / 6); return { x: a.x + 80 + CW / 2 + col * 112, y: a.y + 40 + CH / 2 + row * 78 }; }
    const col = i % 6, row = Math.floor(i / 6); return { x: a.x + 20 + CW / 2 + col * 74, y: a.y + 40 + CH / 2 + row * 82 };
  }
  function moveCard(c, x, y, o) {
    o = o || {};
    c.tx = x; c.ty = y;
    SciSim.tween(c, { x, y }, { duration: o.dur != null ? o.dur : 0.42, ease: o.ease || 'outBack', delay: o.delay || 0 });
  }
  function stopCard(c) { SciSim.tween(c, { x: c.x, y: c.y }, { duration: 0.001 }); }
  function initMap() {
    mapLayout();
    S.map = MAP_ORDER.map((id, i) => { const q = traySlot(i); return { kind: 'map', id, el: EL[id], x: q.x, y: q.y, tx: q.x, ty: q.y, w: CW, h: CH, bin: null, home: i, lift: 0, bad: false, shake: 0, ord: 0 }; });
    S.mapDone = false; S.mapBar = 0; S.mapSel = null;
  }
  let ordSeq = 1;
  function relayoutMap(skip) {
    BINS.forEach((b) => {
      const list = S.map.filter((c) => c.bin === b.id).sort((a, z) => a.ord - z.ord);
      list.forEach((c, i) => { const q = binSlot(b, i); if (c !== skip && (Math.abs(c.tx - q.x) > 0.5 || Math.abs(c.ty - q.y) > 0.5)) moveCard(c, q.x, q.y); });
    });
    S.map.filter((c) => !c.bin).forEach((c) => { const q = traySlot(c.home); if (c !== skip && (Math.abs(c.tx - q.x) > 0.5 || Math.abs(c.ty - q.y) > 0.5)) moveCard(c, q.x, q.y); });
  }
  function binAt(x, y) { return BINS.find((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) || null; }
  function placeInBin(c, binId) {
    c.bin = binId; c.ord = ordSeq++; c.bad = false;
    relayoutMap(null);
    if (binId) Sound.tick();
  }
  function mapCount() { return S.map.filter((c) => c.bin).length; }
  function mapWrong() { return S.map.filter((c) => c.bin && c.bin !== c.el.origin); }
  function resetMap() { S.map.forEach((c) => { c.bin = null; c.bad = false; }); S.mapSel = null; relayoutMap(null); }
  $('#bResetMap').addEventListener('click', () => { Sound.click(); resetMap(); });

  /* ---------- ④ 연대표 ---------- */
  const EW = PHONE ? 224 : 114, EH = PHONE ? 58 : 100;
  function timeLayout() {
    if (!PHONE) {
      S.tslots = EVENTS.map((e, i) => ({ i, x: 28 + EW / 2 + i * (EW + 14), y: 150, card: null }));
      S.ttray = (i) => ({ x: 28 + EW / 2 + i * (EW + 14), y: 318 });
    } else {
      S.tslots = EVENTS.map((e, i) => ({ i, x: 12 + EW / 2 + (i % 2) * (EW + 8), y: 76 + EH / 2 + Math.floor(i / 2) * (EH + 8), card: null }));
      S.ttray = (i) => ({ x: 12 + EW / 2 + (i % 2) * (EW + 8), y: 330 + EH / 2 + Math.floor(i / 2) * (EH + 8) });
    }
  }
  function initTime() {
    timeLayout();
    S.time = TIME_SHUFFLE.map((id, i) => { const q = S.ttray(i); const ev = EVENTS.find((e) => e.id === id); return { kind: 'time', id, ev, x: q.x, y: q.y, tx: q.x, ty: q.y, w: EW, h: EH, slot: null, home: i, lift: 0, bad: false }; });
    S.tslots.forEach((s) => { s.card = null; });
    S.timeDone = false; S.timeBar = 0; S.tsel = null;
  }
  function timeSlotAt(x, y) {
    let best = null, bd = 1e9;
    S.tslots.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } });
    return bd < (PHONE ? EH * 0.9 : EW * 0.75) ? best : null;
  }
  function relayoutTime(skip) {
    S.time.forEach((c) => {
      if (c === skip) return;
      const q = c.slot ? S.tslots[c.slot.i] : S.ttray(c.home);
      if (Math.abs(c.tx - q.x) > 0.5 || Math.abs(c.ty - q.y) > 0.5) moveCard(c, q.x, q.y);
    });
  }
  function dropTime(c, x, y) {
    const s = timeSlotAt(x, y);
    const oldSlot = c.slot;
    if (s) {
      const occ = s.card;
      if (occ && occ !== c) { occ.slot = oldSlot ? oldSlot : null; if (oldSlot) oldSlot.card = occ; occ.bad = false; }
      else if (oldSlot && oldSlot !== s) oldSlot.card = null;
      if (oldSlot && oldSlot !== s && !(occ && occ !== c)) oldSlot.card = null;
      c.slot = s; s.card = c; c.bad = false; Sound.tick();
    } else {
      if (oldSlot) oldSlot.card = null;
      c.slot = null;
    }
    relayoutTime(null);
  }
  function timeCount() { return S.time.filter((c) => c.slot).length; }
  function timeOrderOK() { return S.time.every((c) => c.slot && c.slot.i === EVENTS.findIndex((e) => e.id === c.id)); }
  function resetTime() { S.time.forEach((c) => { c.slot = null; c.bad = false; }); S.tslots.forEach((s) => { s.card = null; }); relayoutTime(null); S.tsel = null; }
  $('#bResetTime').addEventListener('click', () => { Sound.click(); resetTime(); });

  /* ---------- 카드 끌기 ---------- */
  const activeCards = () => (S.mode === 'map' ? S.map : S.mode === 'time' ? S.time : null);
  function pickCard(p) {
    const list = activeCards(); if (!list) return null;
    for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) return c; }
    return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'sn') { tapToken(p); return false; }
      if (S.mode === 'bars') { tapBar(p); return false; }
      const c = pickCard(p);
      if (!c) {
        // 눌러서 고른 카드가 있으면 칸을 눌러 놓기
        if (S.mode === 'map' && S.mapSel) { const b = binAt(p.x, p.y); if (b) { placeInBin(S.mapSel, b.id); S.mapSel = null; return false; } }
        if (S.mode === 'time' && S.tsel) { const s = timeSlotAt(p.x, p.y); if (s) { dropTime(S.tsel, s.x, s.y); S.tsel = null; return false; } }
        return false;
      }
      const list = activeCards();
      list.splice(list.indexOf(c), 1); list.push(c);
      stopCard(c);
      S.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
      SciSim.tween(c, { lift: 1 }, { duration: 0.15 });
      return true;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; d.c.tx = d.c.x; d.c.ty = d.c.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
    },
    up(p) {
      const d = S.drag; if (!d) return;
      const c = d.c; S.drag = null;
      SciSim.tween(c, { lift: 0 }, { duration: 0.2 });
      if (!d.moved) {
        // 가볍게 눌렀을 때: 고르기 / 이미 골랐다면 해제
        if (S.mode === 'map') {
          if (c.bin) { c.bin = null; c.bad = false; relayoutMap(null); }
          else { S.mapSel = S.mapSel === c ? null : c; relayoutMap(null); }
        } else {
          if (c.slot) { c.slot.card = null; c.slot = null; relayoutTime(null); }
          else { S.tsel = S.tsel === c ? null : c; relayoutTime(null); }
        }
        return;
      }
      if (S.mode === 'map') {
        const b = binAt(c.x, c.y);
        placeInBin(c, b ? b.id : null); S.mapSel = null;
        if (!b) relayoutMap(null);
      } else { dropTime(c, c.x, c.y); S.tsel = null; }
    },
    hover(p) {
      if (S.mode === 'sn') return tokenAt(p) ? 'pointer' : 'default';
      if (S.mode === 'bars') return S.hits.some((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) ? 'pointer' : 'default';
      return pickCard(p) ? 'grab' : 'default';
    },
  });

  /* ---------- 폼 (비교표, 문장) ---------- */
  const SEL_OPTS = ['', '수소', '헬륨', '탄소', '질소', '산소', '규소', '철', '칼슘'];
  $$('table.cmp select').forEach((s) => {
    SEL_OPTS.forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o || '선택'; s.appendChild(op); });
    s.addEventListener('change', () => { s.classList.remove('ok', 'bad'); });
  });
  const SENT = { sel1: ['선택', '전', '후'], sel2: ['선택', '빅뱅과 별·초신성', '지구 안'], sel3: ['선택', '우주 역사의 일부분', '우주 역사와 관계없는 별개의 역사'] };
  Object.keys(SENT).forEach((id) => {
    const s = $('#' + id);
    SENT[id].forEach((o, i) => { const op = document.createElement('option'); op.value = i ? o : ''; op.textContent = o; s.appendChild(op); });
    s.addEventListener('change', () => s.classList.remove('ok', 'bad'));
  });

  /* ---------- 그리기: 공통 ---------- */
  function bgLight() {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
  }
  function chipBall(x, y, r, id, o) {
    const e = EL[id];
    D.sphere(x, y, r, e.col, { shadow: !!(o && o.shadow), text: e.sym, textColor: e.tc, textScale: e.sym.length > 1 ? 0.78 : 0.95 });
  }

  /* ---------- 그리기: 초신성 ---------- */
  const LAYERS = [
    { r: 1.0, c: '#5b7fd6', n: '수소·헬륨' }, { r: 0.8, c: '#e8b33e', n: '헬륨→탄소' }, { r: 0.62, c: '#49b88d', n: '탄소·산소' },
    { r: 0.46, c: '#8e6bd8', n: '네온·마그네슘' }, { r: 0.32, c: '#e8793f', n: '규소' }, { r: 0.18, c: '#d4d8de', n: '철 핵' },
  ];
  function drawStar(t) {
    const { cx, cy, sr } = SN;
    const collapse = smooth(t, 0.13, 0.178);
    const scale = (1 - 0.62 * collapse) * (1 + 0.012 * Math.sin(S.clock * 5));
    const jit = collapse * (1 - smooth(t, 0.17, 0.18)) * 3;
    const ox = (Math.random() - 0.5) * jit, oy = (Math.random() - 0.5) * jit;
    const fade = 1 - smooth(t, 0.172, 0.19);
    if (fade <= 0.01) return;
    ctx.save(); ctx.globalAlpha = fade;
    D.glow(cx + ox, cy + oy, sr * (1.7 + 0.3 * collapse), '#8fb4ff', 0.28);
    const grow = 1 + 0.16 * smooth(t, 0, 0.12);       // 철 핵이 자라요
    LAYERS.forEach((l, i) => {
      const rr = sr * l.r * scale * (i === 5 ? grow : 1);
      const g = ctx.createRadialGradient(cx + ox - rr * 0.3, cy + oy - rr * 0.35, rr * 0.1, cx + ox, cy + oy, rr);
      g.addColorStop(0, C.shade(l.c, 0.45)); g.addColorStop(1, C.shade(l.c, -0.12));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
    });
    if (t > 0.08) D.glow(cx + ox, cy + oy, sr * 0.5 * scale, '#ffffff', 0.35 * smooth(t, 0.08, 0.16) + 0.15 * collapse);
    ctx.restore();
    // 층 이름
    if (t < 0.15) {
      const a = 1 - smooth(t, 0.1, 0.15);
      const lx = PHONE ? 20 : cx + sr + 34;
      LAYERS.forEach((l, i) => {
        const ly = PHONE ? 112 + i * 0 : cy - 88 + i * 34;
        const yy = PHONE ? 0 : ly;
        if (PHONE) return;
        ctx.save(); ctx.globalAlpha = a;
        D.dashedLine(cx + sr * l.r * 0.72, cy - sr * l.r * 0.69 * 0 + (-sr * l.r * 0.5), lx - 6, yy, { color: 'rgba(255,255,255,.35)', width: 1.2, dash: [3, 4] });
        ctx.fillStyle = l.c; ctx.beginPath(); ctx.arc(lx + 6, yy, 6, 0, Math.PI * 2); ctx.fill();
        T(lx + 18, yy + 5, l.n, 14, i === 5 ? '#ffd9a8' : '#e7eeff', 'left', 800);
        ctx.restore();
      });
    }
  }
  function drawSN(t, dt) {
    const { cx, cy, sr } = SN;
    D.space(0, 0, VW, VH, S.clock, { stars: PHONE ? 60 : 110, top: '#16224a', bottom: '#0d1530' });
    const stage = stageOf(t);
    // 성운 구름
    const aN = smooth(t, 0.19, 0.26);
    if (aN > 0) {
      const dF = diskFade(t);
      NEB.forEach((p) => {
        if (!p.blob) return;
        const q = nebPos(p, t);
        const pull = 1 - smooth(t, 0.7, 0.99) * 0.75;
        D.glow(q.x, q.y, p.sz * (0.7 + 0.5 * smooth(t, 0.18, 0.45)) * (1 - 0.45 * smooth(t, 0.62, 0.84)), NCOL[p.kind], 0.17 * aN * dF * pull);
      });
      // 작은 알갱이
      ctx.save();
      NEB.forEach((p) => {
        if (p.blob) return;
        const q = nebPos(p, t);
        const tw = 0.65 + 0.35 * Math.sin(S.clock * 2 + p.tw);
        ctx.globalAlpha = 0.85 * aN * dF * tw;
        ctx.fillStyle = NCOL[p.kind];
        ctx.fillRect(q.x - p.sz / 2, q.y - p.sz / 2, p.sz, p.sz);
      });
      ctx.restore();
    }
    drawStar(t);
    // 폭발 섬광·충격파
    if (t >= 0.165 && t < 0.42) {
      const u = (t - 0.18) / 0.24;
      const fl = clamp(1 - Math.abs(t - 0.185) / 0.03, 0, 1);
      if (fl > 0) D.glow(cx, cy, sr * (2.2 + 4 * fl), '#fff4d6', 0.9 * fl);
      if (t >= 0.18) {
        const rr = sr * 0.5 + u * (PHONE ? 330 : 470), a = clamp(1 - u, 0, 1);
        ctx.save(); ctx.lineWidth = 7 * a + 1;
        ctx.strokeStyle = 'rgba(255,214,150,' + 0.85 * a + ')'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * a + ')'; ctx.beginPath(); ctx.arc(cx, cy, rr * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    // 태양 · 행성
    const sunA = smooth(t, 0.68, 0.88);
    if (sunA > 0) {
      const sunR = 5 + 13 * smooth(t, 0.72, 0.92);
      D.glow(cx, cy, 30 + 70 * sunA, '#ffd76a', 0.55 * sunA);
      D.sphere(cx, cy, sunR * Math.min(1, sunA * 1.5), '#ffcf3d', { gloss: false });
      const pa = smooth(t, 0.86, 0.96);
      if (pa > 0) {
        PLANETS.forEach((p, i) => {
          const orR = p.r * SN.rd;
          ctx.save(); ctx.globalAlpha = 0.25 * pa; ctx.strokeStyle = '#9fb4ff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(cx, cy, orR, orR * 0.28, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          const ang = S.clock * p.sp * 0.8 + i * 1.7;
          const px = cx + Math.cos(ang) * orR, py = cy + Math.sin(ang) * orR * 0.28;
          ctx.save(); ctx.globalAlpha = pa;
          D.sphere(px, py, p.sz * (0.8 + 0.25 * (Math.sin(ang) + 1) / 2), p.c, { shadow: true });
          if (p.earth) D.label(px, py + 22, '지구', { bg: 'rgba(14,165,233,.9)', size: 13 });
          ctx.restore();
        });
      }
    }
    // 무거운 원소 알갱이
    if (t >= 0.19) {
      const pop = smooth(t, 0.19, 0.24), dF = 1 - smooth(t, 0.8, 0.93);
      TOK.forEach((k) => {
        const q = nebPos(k, t);
        const seen = S.heavy.has(k.el);
        ctx.save(); ctx.globalAlpha = dF;
        D.glow(q.x, q.y, 30 * pop, EL[k.el].col, seen ? 0.55 : 0.4 + 0.2 * Math.sin(S.clock * 4 + k.id));
        D.sphere(q.x, q.y, 14 * pop, EL[k.el].col, { shadow: true, text: EL[k.el].sym, textColor: EL[k.el].tc, textScale: 0.78 });
        ctx.restore();
      });
    }
    // 눌러 본 알갱이 설명
    if (S.callout && SciSim.time() < S.callout.until) {
      const e = EL[S.callout.el];
      const txt = e.name + '(' + e.sym + ') · 철보다 무거운 원소';
      const bx = clamp(S.callout.x, 130, VW - 130), by = S.callout.y - 34;
      D.label(bx, by < 20 ? S.callout.y + 34 : by, txt, { bg: 'rgba(255,255,255,.96)', color: '#1b2333', size: 14, border: e.col });
    }
    parts.update(dt); parts.draw(ctx);
    // 장면 이름과 설명
    const st = STAGES[stage];
    const capW = PHONE ? 440 : 410;
    D.label(PHONE ? 16 : 20, 28, st.n, { bg: 'rgba(14,165,233,.92)', size: 15, align: 'left' });
    const lines = wrap(st.cap, capW, 14, 700);
    lines.forEach((ln, i) => T(PHONE ? 18 : 22, 58 + i * 20, ln, 14, '#eaf1ff', 'left', 700, { stroke: 'rgba(5,10,30,.85)', strokeWidth: 4 }));
    // 무거운 원소 체크 칩
    if (t >= 0.19) {
      const x0 = PHONE ? 16 : VW - 232, y0 = PHONE ? 58 + lines.length * 20 + 14 : 28;
      ['Au', 'Ag', 'U'].forEach((id, i) => {
        const e = EL[id], seen = S.heavy.has(id);
        const bx = x0 + i * (PHONE ? 76 : 74);
        D.label(bx + 34, y0, (seen ? '✓ ' : '') + e.name, { bg: seen ? e.col : 'rgba(255,255,255,.14)', color: seen ? e.tc : '#cfe0ff', size: 13, border: e.col });
      });
    }
    // 시간 막대
    const { y, x0, x1 } = TLINE;
    ctx.save(); ctx.strokeStyle = 'rgba(180,200,255,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * t, y); ctx.stroke(); ctx.restore();
    STAGES.forEach((s, i) => {
      const x = x0 + (x1 - x0) * ((s.t0 + Math.min(s.t1, 1)) / 2);
      const on = i === stage;
      D.sphere(x, y, on ? 9 : 6, on ? '#38bdf8' : (S.stages.has(i) ? '#7ee0a8' : '#6b7ba5'), { gloss: false });
      T(x, y + 26, s.s, 13, on ? '#fff' : '#b9c7ea', 'center', on ? 800 : 700);
    });
    D.glow(x0 + (x1 - x0) * t, y, 16, '#38bdf8', 0.6);
    if (!S.stages.has(0) || t < 0.02) {
      /* 안내 */
    }
  }

  /* ---------- 그리기: 막대그래프 ---------- */
  function drawPanel(key, g, dt) {
    const P = PANELS[key];
    const small = PHONE && S.bm === 'all';
    ctx.save();
    D.shadow(() => { D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.restore();
    const hdrCol = key === 'uni' ? '#3867f4' : key === 'crust' ? '#a8825a' : '#16a34a';
    D.roundRect(g.x, g.y, g.w, 6, 3); ctx.fillStyle = hdrCol; ctx.fill();
    T(g.x + 14, g.y + (small ? 26 : 30), P.title, small ? 17 : 18, '#1b2333', 'left', 800);
    T(g.x + g.w - 12, g.y + (small ? 26 : 30), P.unit, 13, '#5d6879', 'right', 700);
    P.rows.forEach(([id, v], i) => {
      const cy = g.y + g.head + g.rowH * i + g.rowH / 2;
      const hl = S.hl === id;
      if (hl) { D.roundRect(g.x + 6, cy - g.rowH / 2 + 1, g.w - 12, g.rowH - 2, 10); ctx.fillStyle = C.rgba(EL[id].col, 0.2); ctx.fill(); ctx.strokeStyle = EL[id].col; ctx.lineWidth = 2; ctx.stroke(); }
      const k = key + ':' + id;
      S.bv[k] = SciSim.approach(S.bv[k] == null ? 0 : S.bv[k], v, dt, RM ? 60 : 6);
      const cur = S.bv[k];
      const len = v > 0 ? Math.max(3, cur / 100 * g.barW) : 0;
      chipBall(g.x + g.chip + 8, cy, g.chip, id);
      const bx = g.x + g.barX, bh = small ? 12 : 16, by = small ? cy : cy + 5;
      if (!small) T(bx, cy - 9, EL[id].name, 13, '#5d6879', 'left', 800);
      D.roundRect(bx, by - bh / 2, g.barW, bh, bh / 2); ctx.fillStyle = '#eef2f8'; ctx.fill();
      if (len > 0) {
        const gr = ctx.createLinearGradient(bx, 0, bx + len, 0); gr.addColorStop(0, C.shade(EL[id].col, 0.25)); gr.addColorStop(1, EL[id].col);
        D.roundRect(bx, by - bh / 2, Math.min(len, g.barW), bh, bh / 2); ctx.fillStyle = gr; ctx.fill();
      }
      const lab = (small ? EL[id].name + ' ' : '') + fmtV(v) + ' %';
      T(bx + Math.max(len, 0) + 8 > bx + g.barW - 70 ? bx + len - 8 : bx + Math.max(len, 0) + 8, by + 4.5, lab, 13, bx + len + 8 > bx + g.barW - 70 ? (EL[id].tc === '#fff' ? '#fff' : EL[id].tc) : '#334155', bx + len + 8 > bx + g.barW - 70 ? 'right' : 'left', 800);
      S.hits.push({ x: g.x + 4, y: cy - g.rowH / 2, w: g.w - 8, h: g.rowH, el: id });
    });
  }
  function drawBars(dt) {
    bgLight();
    S.hits = [];
    const geo = panelGeom();
    Object.keys(geo).forEach((k) => drawPanel(k, geo[k], dt));
    if (S.bm !== 'all') {
      const g = geo[S.bm];
      const ix = PHONE ? 8 : 536, iy = PHONE ? g.y + g.h + 12 : 62, iw = PHONE ? 464 : 252, ih = PHONE ? 236 : 480;
      D.shadow(() => { D.roundRect(ix, iy, iw, ih, 16); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
      const info = {
        uni: ['빅뱅이 남긴 재료', '수소 + 헬륨 ≈ 99.9 %', '우주 원자의 거의 전부는 빅뱅 직후에 만들어진 수소와 헬륨이에요. 산소·탄소·질소는 합쳐도 0.1 % 정도예요.'],
        crust: ['암석 원소가 으뜸', '산소 + 규소 ≈ 74 %', '지각은 산소와 규소가 이룬 암석(규산염 광물)이 대부분이에요. 가벼운 수소와 헬륨은 지구 중력이 붙잡지 못하고 우주로 날아갔어요.'],
        body: ['생명의 원소', '산소 + 탄소 + 수소 ≈ 93 %', '생명체는 탄소 화합물과 물로 이루어져서 산소·탄소·수소·질소가 많아요. 탄소는 지각에는 거의 없어요.'],
      }[S.bm];
      T(ix + 16, iy + 30, info[0], 17, '#1b2333', 'left', 800);
      D.roundRect(ix + 14, iy + 42, iw - 28, 40, 12); ctx.fillStyle = '#e8f3ff'; ctx.fill();
      T(ix + iw / 2, iy + 68, info[1], fitSize(info[1], iw - 40, 17), '#0b4f8a', 'center', 800);
      wrap(info[2], iw - 32, 14, 700).forEach((ln, i) => T(ix + 16, iy + 106 + i * 21, ln, 14, '#3a4456', 'left', 700));
      if (S.bm === 'crust') drawEarthEscape(ix + iw / 2, iy + ih - (PHONE ? 70 : 100), dt);
    } else {
      T(VW / 2, VH - 8, '※ 우주는 원자 수 비, 지각·몸은 질량 비라서 단위가 달라요. (예시 값)', 13, '#5d6879', 'center', 700);
    }
  }
  function drawEarthEscape(x, y, dt) {
    const r = PHONE ? 34 : 44;
    S.earthT += dt;
    if (S.earthT > 0.16 && !RM) {
      S.earthT = 0;
      const a = -Math.PI * (0.1 + Math.random() * 0.8);
      const he = Math.random() < 0.4;
      parts.emit({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * (60 + Math.random() * 50), vy: Math.sin(a) * (60 + Math.random() * 50), life: 1.6, size: 3.4, color: he ? '#f5c518' : '#4aa3ff', fade: true });
    }
    D.sphere(x, y, r, '#3b82f6', { shadow: true });
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#34a853'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.4, r * 0.28, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.4, y + r * 0.35, r * 0.3, r * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    T(x, y + r + 20, '수소·헬륨은 날아가고', 13, '#3867f4', 'center', 800);
    T(x, y + r + 38, '무거운 암석 원소는 남았어요', 13, '#7a5a36', 'center', 800);
  }

  /* ---------- 그리기: 카드 ---------- */
  function drawElementCard(c) {
    const lift = c.lift || 0, sel = S.mapSel === c;
    const w = c.w, h = c.h, e = c.el;
    ctx.save();
    ctx.translate(c.x, c.y - (sel ? 6 : 0)); const sc = 1 + 0.1 * lift + (sel ? 0.06 : 0); ctx.scale(sc, sc);
    if (c.shake > 0) ctx.translate(Math.sin(c.shake * 40) * 4 * c.shake, 0);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + lift * 12, y: 2 + lift * 6 });
    const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, C.shade(e.col, 0.3)); gr.addColorStop(1, e.col);
    D.roundRect(-w / 2, -h / 2, w, h * 0.62, 10); ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2 + h * 0.5, w, h * 0.12);
    T(0, -h / 2 + 30, e.sym, e.sym.length > 1 ? 24 : 28, e.tc, 'center', 800);
    const nm = e.name; T(0, -h / 2 + h * 0.62 + 15, nm, fitSize(nm, w - 6, 14), '#1b2333', 'center', 800);
    if (e.crust) { ctx.fillStyle = '#a8825a'; ctx.beginPath(); ctx.arc(-w / 2 + 11, h / 2 - 8, 6.5, 0, Math.PI * 2); ctx.fill(); T(-w / 2 + 11, h / 2 - 4, '지', 10, '#fff', 'center', 800); }
    if (e.body) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(w / 2 - 11, h / 2 - 8, 6.5, 0, Math.PI * 2); ctx.fill(); T(w / 2 - 11, h / 2 - 4, '몸', 10, '#fff', 'center', 800); }
    if (c.bad) { D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.5; ctx.stroke(); }
    else if (sel) { D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.restore();
  }

  function drawMap(dt) {
    bgLight();
    const placed = mapCount();
    // 칸
    BINS.forEach((b) => {
      const over = S.drag && S.drag.c.kind === 'map' && S.drag.moved && binAt(S.drag.c.x, S.drag.c.y) === b;
      const glowing = S.mapSel && !S.drag;
      ctx.save();
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = over ? C.rgba(b.col, 0.16) : '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = over || glowing ? b.col : C.rgba(b.col, 0.45); ctx.lineWidth = over ? 3.5 : 2.5; ctx.setLineDash(over || glowing ? [] : [7, 6]); D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      // 머리글
      const hx = PHONE ? b.x + 10 : b.x + 14, hy = PHONE ? b.y + 30 : b.y + 26;
      if (!PHONE) {
        mapIcon(b.id, hx + 14, hy, 16);
        T(hx + 38, hy + 6, b.title, 18, '#1b2333', 'left', 800);
        T(hx + 38, hy + 24, b.sub, 13, '#5d6879', 'left', 700);
      } else {
        mapIcon(b.id, hx + 16, hy, 16);
        T(hx + 40, hy + 6, b.title.length > 6 ? '별 속 핵융합' : b.title, 15, '#1b2333', 'left', 800);
        T(hx + 40, hy + 24, b.sub.length > 8 ? '철보다 무거움' : b.sub, 13, '#5d6879', 'left', 700);
      }
    });
    // 카드 틀 (놓을 자리)
    const okNow = placed === 12 && mapWrong().length === 0;
    if (!okNow) T(S.trayArea.x + 8, S.trayArea.y + 18, '원소 카드  (지: 지각에 많은 원소, 몸: 사람 몸에 많은 원소)', 13, '#5d6879', 'left', 700);
    const list = S.map;
    list.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.5); });
    list.forEach((c) => { if (c !== (S.drag && S.drag.c)) drawElementCard(c); });
    if (S.drag && S.drag.c.kind === 'map') drawElementCard(S.drag.c);
    // 완성: 몸의 원소 출신지 막대
    const ok = placed === 12 && mapWrong().length === 0;
    if (ok && !S.mapDone) { S.mapDone = true; S.mapBar = 0; Sound.success(); BINS.forEach((b) => parts.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 12, colors: [b.col, '#fff'], speed: 130 })); }
    if (!ok) S.mapDone = false;
    if (ok) {
      S.mapBar = SciSim.approach(S.mapBar, 1, dt, RM ? 60 : 2.2);
      const a = S.trayArea, bx = a.x + 20, bw = a.w - 40, by = a.y + 78, bh = 34;
      D.roundRect(a.x, a.y, a.w, a.h, 16); ctx.fillStyle = '#fff'; ctx.fill();
      T(a.x + a.w / 2, a.y + 30, '🧍 사람 몸 질량의 기원', 17, '#1b2333', 'center', 800);
      T(a.x + a.w / 2, a.y + 52, '(몸 속 원소를 만들어진 곳별로 나눈 예시 값)', 13, '#5d6879', 'center', 700);
      const segs = [['빅뱅', 10, '#4aa3ff', '수소'], ['별 안의 핵융합', 88.5, '#f59e0b', '산소·탄소·질소·칼슘·인'], ['기타', 1.5, '#9aa5b6', '미량 원소']];
      let x = bx;
      D.roundRect(bx, by, bw, bh, bh / 2); ctx.fillStyle = '#eef2f8'; ctx.fill();
      ctx.save(); D.roundRect(bx, by, bw * S.mapBar, bh, bh / 2); ctx.clip();
      segs.forEach((s) => { const sw = bw * s[1] / 100; ctx.fillStyle = s[2]; ctx.fillRect(x, by, sw, bh); x += sw; });
      ctx.restore();
      T(bx + bw * 0.05, by + bh + 22, '빅뱅 약 10 %', 14, '#1d6fd1', 'center', 800);
      T(bx + bw * (0.1 + 0.885 / 2), by + bh + 22, '별 안의 핵융합 약 88.5 %', 14, '#b86f00', 'center', 800);
      wrap('수소(10 %)는 빅뱅에서, 산소·탄소·질소 등은 별 안의 핵융합에서 왔어요. 이 원소들이 초신성 폭발로 흩어졌다가 모여 지구와 우리 몸이 되었어요.', a.w - 40, 14, 700).forEach((ln, i) => T(a.x + 20, by + bh + 46 + i * 20, ln, 14, '#3a4456', 'left', 700));
    }
    parts.update(dt); parts.draw(ctx);
  }
  function mapIcon(id, x, y, r) {
    if (id === 'bang') { D.glow(x, y, r * 1.6, '#4aa3ff', 0.5); D.sphere(x, y, r * 0.6, '#cfe6ff', { gloss: false }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + S.clock * 0.4; ctx.fillStyle = '#4aa3ff'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 0, Math.PI * 2); ctx.fill(); } }
    else if (id === 'star') { D.glow(x, y, r * 1.5, '#f59e0b', 0.5); D.spark(x, y, r, S.clock * 0.6, '#f59e0b'); D.sphere(x, y, r * 0.55, '#ffd76a', { gloss: false }); }
    else { D.glow(x, y, r * 1.8, '#ef4444', 0.45); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45); ctx.lineTo(x + Math.cos(a) * r * (i % 2 ? 0.95 : 1.25), y + Math.sin(a) * r * (i % 2 ? 0.95 : 1.25)); ctx.stroke(); } D.sphere(x, y, r * 0.45, '#ffe08a', { gloss: false }); }
  }

  /* ---------- 그리기: 연대표 ---------- */
  function evIcon(k, x, y, r) {
    if (k === 'bang') { D.glow(x, y, r * 1.7, '#ffd76a', 0.7); D.sphere(x, y, r * 0.6, '#fff6c2', { gloss: false }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2); ctx.stroke(); } }
    else if (k === 'star') { D.glow(x, y, r * 1.5, '#ffd76a', 0.6); D.spark(x, y, r * 1.25, 1.2, '#f5b301'); }
    else if (k === 'sun') { D.glow(x, y, r * 1.5, '#ffd76a', 0.6); D.sphere(x, y, r * 0.55, '#ffcf3d', { gloss: false }); ctx.strokeStyle = '#9fb4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); D.sphere(x + r * 0.9, y + r * 0.1, r * 0.2, '#3b82f6', { gloss: false }); }
    else if (k === 'earth') { D.sphere(x, y, r * 0.85, '#e0653a', { shadow: true }); ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill(); }
    else if (k === 'life') { D.sphere(x, y, r * 0.85, '#3b82f6', { shadow: true }); ctx.fillStyle = '#34a853'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y, r * 0.35, r * 0.25, 0.4, 0, Math.PI * 2); ctx.fill(); D.sphere(x + r * 0.55, y - r * 0.55, r * 0.22, '#22c55e', { gloss: false }); }
    else { ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y - r * 0.45, r * 0.3, 0, Math.PI * 2); ctx.fill(); D.roundRect(x - r * 0.38, y - r * 0.1, r * 0.76, r * 0.9, r * 0.25); ctx.fill(); }
  }
  function drawTimeCard(c) {
    const lift = c.lift || 0, sel = S.tsel === c;
    const w = c.w, h = c.h, ev = c.ev;
    ctx.save();
    ctx.translate(c.x, c.y - (sel ? 6 : 0)); const sc = 1 + 0.08 * lift + (sel ? 0.04 : 0); ctx.scale(sc, sc);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + lift * 12, y: 2 + lift * 6 });
    ctx.strokeStyle = c.bad ? '#e2464b' : sel ? '#0ea5e9' : '#cdd7e6'; ctx.lineWidth = c.bad || sel ? 3.5 : 1.5; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (!PHONE) {
      evIcon(ev.k, 0, -h / 2 + 30, 20);
      T(0, 14, ev.name, fitSize(ev.name, w - 8, 15), '#1b2333', 'center', 800);
      T(0, 34, ev.date, fitSize(ev.date, w - 8, 13), '#5d6879', 'center', 700);
    } else {
      evIcon(ev.k, -w / 2 + 28, 0, 17);
      T(-w / 2 + 56, -3, ev.name, fitSize(ev.name, w - 66, 16), '#1b2333', 'left', 800);
      T(-w / 2 + 56, 17, ev.date, 13, '#5d6879', 'left', 700);
    }
    ctx.restore();
  }
  function drawTime(dt) {
    bgLight();
    // 연대표 칸
    T(PHONE ? 12 : 28, PHONE ? 30 : 36, '오래된 사건  →  최근 사건', 15, '#1b2333', 'left', 800);
    if (!PHONE) {
      ctx.save(); ctx.strokeStyle = '#9fb4d9'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(28, 82); ctx.lineTo(VW - 40, 82); ctx.stroke();
      ctx.fillStyle = '#9fb4d9'; ctx.beginPath(); ctx.moveTo(VW - 22, 82); ctx.lineTo(VW - 40, 73); ctx.lineTo(VW - 40, 91); ctx.closePath(); ctx.fill(); ctx.restore();
    } else {
      T(VW - 12, 30, '1번 → 6번', 14, '#5d6879', 'right', 700);
    }
    S.tslots.forEach((s) => {
      const over = S.drag && S.drag.c.kind === 'time' && S.drag.moved && timeSlotAt(S.drag.c.x, S.drag.c.y) === s;
      const hint = (S.tsel && !S.drag) && !s.card;
      D.roundRect(s.x - EW / 2, s.y - EH / 2, EW, EH, 12);
      ctx.fillStyle = over ? 'rgba(14,165,233,.14)' : 'rgba(255,255,255,.6)'; ctx.fill();
      ctx.save(); ctx.strokeStyle = over || hint ? '#0ea5e9' : '#b4c3dc'; ctx.lineWidth = over ? 3.5 : 2.5; ctx.setLineDash(over ? [] : [7, 6]); D.roundRect(s.x - EW / 2, s.y - EH / 2, EW, EH, 12); ctx.stroke(); ctx.restore();
      if (!s.card) D.sphere(s.x, s.y, 16, '#9fb4d9', { gloss: false, text: String(s.i + 1), textScale: 1.0 });
    });
    if (!PHONE) {
      T(VW / 2, 252, '사건 카드  (끌어서 위 칸에 놓아요)', 14, '#5d6879', 'center', 700);
    } else {
      T(12, 318, '사건 카드  (끌어서 위 칸에 놓아요)', 14, '#5d6879', 'left', 700);
    }
    const drag = S.drag && S.drag.c;
    S.time.forEach((c) => { if (c !== drag) drawTimeCard(c); });
    if (drag && drag.kind === 'time') drawTimeCard(drag);
    S.tslots.forEach((s) => { if (s.card && s.card !== drag) D.sphere(s.x - EW / 2 + 4, s.y - EH / 2 + 4, 11, '#0ea5e9', { gloss: false, text: String(s.i + 1), textScale: 0.95 }); });
    // 순서가 맞으면 시간 척도 막대
    const ok = timeCount() === 6 && timeOrderOK();
    if (ok && !S.timeDone) { S.timeDone = true; S.timeBar = 0; Sound.success(); S.tslots.forEach((s) => parts.burst(s.x, s.y, { count: 8, speed: 110, colors: ['#0ea5e9', '#ffb400', '#fff'] })); }
    if (!ok) S.timeDone = false;
    if (ok) {
      S.timeBar = SciSim.approach(S.timeBar, 1, dt, RM ? 60 : 1.8);
      const y0 = PHONE ? 560 : 410, x0 = PHONE ? 30 : 56, x1 = PHONE ? 450 : 744, h = 18;
      ctx.save(); ctx.globalAlpha = 0.98; D.roundRect(PHONE ? 8 : 16, y0 - 34, VW - (PHONE ? 16 : 32), PHONE ? 190 : 152, 16); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
      T(VW / 2, y0 - 10, '우주의 나이 138억 년을 한 줄로 놓으면', 15, '#1b2333', 'center', 800);
      const gr = ctx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#1d2b55'); gr.addColorStop(0.67, '#6d5bd0'); gr.addColorStop(1, '#0ea5e9');
      D.roundRect(x0, y0 + 6, x1 - x0, h, h / 2); ctx.fillStyle = '#e9eef7'; ctx.fill();
      ctx.save(); D.roundRect(x0, y0 + 6, (x1 - x0), h, h / 2); ctx.clip(); ctx.fillStyle = gr; ctx.fillRect(x0, y0 + 6, (x1 - x0) * S.timeBar, h); ctx.restore();
      const ROWS = { bang: 0, star1: 1, sun: 0, earth: 2, life: 1, now: 0 };
      EVENTS.forEach((e) => {
        const px = x0 + (x1 - x0) * (1 - e.ya / 138) * S.timeBar;
        const row = ROWS[e.id];
        ctx.save(); ctx.globalAlpha = S.timeBar;
        ctx.strokeStyle = '#9aa5b6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, y0 + 22); ctx.lineTo(px, y0 + 38 + row * 19); ctx.stroke();
        D.sphere(px, y0 + 15, 7, '#ffb400', { gloss: false });
        T(clamp(px, 46, VW - 46), y0 + 52 + row * 19, e.name, 13, '#334155', 'center', 800);
        ctx.restore();
      });
      wrap('지구와 생명의 역사는 우주 역사의 뒷부분에 들어 있어요.', VW - 60, 14, 700).forEach((ln, i) => T(VW / 2, y0 + 116 + i * 20, ln, 14, '#0b4f8a', 'center', 800));
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'sn') {
      const st = stageOf(S.tShown);
      L1 = '장면'; a = STAGES[st].n; L2 = '확인한 무거운 원소'; b = S.heavy.size ? [...S.heavy].map((x) => EL[x].name).join('·') : '없음'; L3 = '본 장면'; c = S.stages.size + ' / 5';
    } else if (S.mode === 'bars') {
      L1 = '선택한 원소'; a = S.hl ? EL[S.hl].name + ' (' + EL[S.hl].sym + ')' : '막대를 눌러 보세요';
      L2 = '우주 · 지구 지각'; b = S.hl ? fmtV(valOf('uni', S.hl)) + ' % · ' + fmtV(valOf('crust', S.hl)) + ' %' : '—';
      L3 = '사람 몸'; c = S.hl ? fmtV(valOf('body', S.hl)) + ' %' : '—';
    } else if (S.mode === 'map') {
      const last = S.map.slice().sort((x, y) => y.ord - x.ord).find((x) => x.bin);
      L1 = '분류한 카드'; a = mapCount() + ' / 12'; L2 = '마지막으로 놓은 것'; b = last ? last.el.name + ' → ' + ORIGIN_NAME[last.bin] : '—'; L3 = '맞게 놓은 카드'; c = S.map.filter((x) => x.bin && x.bin === x.el.origin).length + ' / 12';
    } else {
      L1 = '놓은 카드'; a = timeCount() + ' / 6'; L2 = '순서'; b = timeCount() < 6 ? '카드를 모두 놓아 보세요' : (timeOrderOK() ? '모두 맞아요!' : '순서를 확인해 보세요'); L3 = '가장 오래된 사건'; c = '빅뱅 · 138억 년 전';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 미션 ---------- */
  const levels = [
    {
      title: '초신성: 별의 폭발과 새로운 시작', short: '초신성', icon: '💥', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 금반지의 금과 내 몸의 탄소는 어디에서 왔을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 별의 밝기와 색, 팽창하는 우주를 배웠고, <b>앞 차시에서</b> 별 속 핵융합으로 철까지의 원소가 만들어진다는 것을 배웠어요.</div>' +
        '<p>철은 핵융합으로 에너지를 낼 수 없어요. 그럼 질량이 큰 별은 마지막에 어떻게 될까요? 폭발하는 별을 지켜봐요.</p>',
      features: ['sn'],
      setup() { setScene('sn', ''); },
      recap: '질량이 큰 별은 철 핵이 붕괴하며 초신성으로 폭발하고, 이때 철보다 무거운 원소가 만들어져 우주로 흩어져요. 흩어진 물질이 다시 모여 새 별과 행성(태양계)이 돼요.',
      summary: '<ul><li>질량이 큰 별의 중심에는 <b>철 핵</b>이 쌓여요. 철은 핵융합으로 에너지를 내지 못해요.</li><li>철 핵이 붕괴하며 <b>초신성 폭발</b>이 일어나요. 이때 <b>철보다 무거운 원소(금·은·우라늄 등)</b>가 만들어져요.</li><li>별의 물질은 <b>성운</b>으로 흩어졌다가 중력으로 다시 모여 <b>새 별과 행성(태양계, 약 46억 년 전)</b>이 돼요.</li></ul>',
      missions: [
        {
          title: '초신성 폭발 지켜보기',
          goal: '<b>▶ 폭발시키기</b>를 눌러 별이 폭발하는 장면을 보고, 흩어지는 <b>금·은·우라늄 알갱이</b>를 한 종류씩 눌러 보세요.',
          hint: '폭발 뒤에 퍼져 나가는 반짝이는 공(Au, Ag, U)을 눌러 보세요. 시간 슬라이더로 폭발 순간을 천천히 돌려 볼 수도 있어요.',
          setup() { setScene('sn', ''); },
          check: () => S.maxT >= 0.3 && S.heavy.size >= 3,
          hold: 0.4,
          status: () => mark(S.maxT >= 0.3) + ' 폭발 장면 보기 &nbsp; ' + mark(S.heavy.size >= 3) + ' 무거운 원소 확인 ' + S.heavy.size + '/3',
          explain: '질량이 큰 별은 중심에서 규소까지 핵융합을 하다가 <b>철 핵</b>이 만들어져요. 철은 핵융합으로 에너지를 낼 수 없어서 핵이 갑자기 무너지고, 별이 <b>초신성</b>으로 폭발해요. 이 순간 <b>철보다 무거운 원소</b>(금·은·우라늄 등)가 만들어져 우주 공간으로 흩어져요.',
        },
        {
          title: '성운에서 태양계까지',
          goal: '시간 슬라이더나 <b>①~⑤</b> 버튼으로 <b>다섯 장면</b>을 모두 살펴보세요.',
          hint: '버튼 ①~⑤를 차례로 눌러 보세요. 별의 물질이 어떻게 이동하는지 따라가요.',
          setup() { setScene('sn', ''); S.playing = false; S.t = S.tShown = 0; S.stages = new Set(); },   // 앞 미션에서 이미 본 장면은 세지 않아요
          check: () => S.stages.size >= 5,
          hold: 0.5,
          status: () => '본 장면 ' + S.stages.size + ' / 5 ' + [0, 1, 2, 3, 4].map((i) => mark(S.stages.has(i))).join(''),
          explain: '폭발로 흩어진 물질은 <b>성운</b>이 되었다가, 중력 때문에 다시 모여 회전하는 <b>원반</b>이 돼요. 그 중심에 <b>태양</b>이, 둘레에 <b>지구</b> 같은 행성이 생겼어요. 그러니 태양계의 재료는 이미 앞선 별들의 속과 폭발에서 만들어진 거예요.',
        },
        {
          type: 'quiz', title: '무거운 원소의 고향',
          goal: '금·은·우라늄처럼 <b>철보다 무거운 원소</b>는 주로 어디에서 만들어졌을까요?',
          setup() { setScene('sn', ''); },
          choices: ['태양 중심부의 수소 핵융합', '질량이 큰 별이 폭발하는 초신성', '지구 속 마그마가 식을 때', '빅뱅 직후 3분 동안'],
          answer: 1,
          feedback: ['태양 중심부에서는 수소가 헬륨으로 바뀌어요. 금이나 우라늄을 만들 만큼 뜨겁고 센 반응은 일어나지 않아요.', '', '마그마는 이미 있던 원소를 섞고 굳힐 뿐, 새로운 원소를 만들지는 못해요.', '빅뱅 직후에는 수소와 헬륨이 만들어졌어요. 더 무거운 원소는 아직 없었어요.'],
          explain: '철보다 무거운 원소는 <b>초신성 폭발</b>의 극한 환경에서 만들어져요. 그래서 금반지의 금도 오래전 별이 폭발하며 뿌린 물질이에요.',
        },
      ],
    },
    {
      title: '성분 비교: 우주, 지구, 우리 몸', short: '성분 비교', icon: '📊', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별의 물질이 모여 태양계가 되었다는 것을 봤어요. 그렇다면 지구와 우리 몸의 성분은 우주의 성분과 같을까요?</div>' +
        '<p>우주, 지구 지각, 사람 몸의 <b>원소 성분을 막대그래프로 비교</b>하며 공통점과 차이를 찾아봐요.</p>',
      features: ['bars'],
      setup() { setScene('bars', ''); },
      recap: '우주는 수소·헬륨이 거의 전부이고, 지구 지각은 산소·규소 같은 암석 원소, 사람 몸은 산소·탄소·수소·질소가 많아요. 성분이 서로 달라요.',
      summary: '<table class="mini"><tr><th></th><th>많은 원소</th></tr><tr><th>우주</th><td>수소 약 92 %, 헬륨 약 8 % (원자 수 비)</td></tr><tr><th>지각</th><td>산소 46.6 %, 규소 27.7 % (질량 비)</td></tr><tr><th>사람 몸</th><td>산소 65 %, 탄소 18 %, 수소 10 %, 질소 3 %</td></tr></table><ul><li>지구에 <b>수소·헬륨이 적은</b> 까닭: 가벼운 기체라서 지구 중력이 붙잡지 못했어요.</li><li>지각과 몸 모두 <b>산소</b>가 가장 많아요. 몸에 많은 <b>탄소</b>는 지각에는 적어요.</li></ul>',
      missions: [
        {
          title: '세 곳의 성분 살펴보기',
          goal: '<b>우주 · 지각 · 몸 · 함께</b> 네 화면을 모두 열어 보세요. 막대를 눌러 같은 원소를 비교해도 좋아요.',
          hint: '아래 조작 칸의 버튼 우주·지각·몸·함께를 한 번씩 눌러 보세요.',
          setup() { setScene('bars', ''); setBM(S.bm); },
          check: () => S.bmSeen.size >= 4,
          hold: 0.6,
          status: () => ['uni', 'crust', 'body', 'all'].map((k, i) => mark(S.bmSeen.has(k)) + ['우주', '지각', '몸', '함께'][i]).join(' &nbsp; '),
          explain: '우주는 <b>수소와 헬륨</b>이 거의 전부예요. 지구 지각은 산소·규소 같은 <b>암석을 이루는 원소</b>가 많고, 사람 몸은 <b>산소·탄소·수소·질소</b>가 많아요. 사는 곳에 따라 성분이 크게 달라요.',
        },
        {
          title: '비교표 완성하기', manual: true,
          goal: '우주, 지각, 사람 몸에서 <b>가장 많은 원소 1위와 2위</b>를 골라 표를 채우세요.',
          hint: '막대그래프의 길이가 긴 순서대로 읽어요. 우주는 ‘우주’ 화면, 지각은 ‘지각’ 화면에서 확인해요.',
          setup() { setScene('bars', 'table'); },
          check() {
            const ans = { uni: ['수소', '헬륨'], crust: ['산소', '규소'], body: ['산소', '탄소'] };
            const names = { uni: '우주', crust: '지각', body: '사람 몸' };
            let bad = [], empty = false;
            $$('table.cmp select').forEach((s) => {
              const k = s.dataset.row, p = +s.dataset.pos;
              if (!s.value) { empty = true; return; }
              const ok = s.value === ans[k][p];
              if (!ok) { bad.push(names[k]); if (!s.classList.contains('bad')) { s.classList.remove('ok'); s.classList.add('bad'); } } else { s.classList.remove('bad'); s.classList.add('ok'); }
            });
            if (empty) return '아직 비어 있는 칸이 있어요. 6칸을 모두 골라 보세요.';
            if (bad.length) return [...new Set(bad)].join('·') + ' 줄을 다시 확인해 보세요. 해당 화면의 막대 길이를 비교해 보세요.';
            return true;
          },
          explain: '우주: <b>수소 > 헬륨</b>, 지각: <b>산소 > 규소</b>, 사람 몸: <b>산소 > 탄소</b>예요. 지구에 수소와 헬륨이 적은 까닭은 가벼운 기체라 지구 중력이 붙잡지 못하고 우주로 날아갔기 때문이에요. (우주는 원자 수 비, 지각·몸은 질량 비)',
        },
        {
          type: 'quiz', title: '산소와 탄소',
          goal: '그래프를 비교해 보면, <b>지각과 사람 몸 모두에서 가장 많은 원소</b>는 무엇일까요?',
          setup() { setScene('bars', ''); setBM('all'); },
          choices: ['수소', '산소', '탄소', '규소'],
          answer: 1,
          feedback: ['수소는 우주에서 가장 많지만, 지각에서는 1위가 아니에요.', '', '탄소는 사람 몸에서 2위지만 지각에는 아주 적어요.', '규소는 지각에서 2위지만 사람 몸에는 거의 없어요.'],
          explain: '<b>산소</b>는 지각(46.6 %)과 사람 몸(65 %)에서 모두 1위예요. 몸에 많은 <b>탄소</b>(18 %)는 지각에는 거의 없고, 지각의 <b>규소</b>는 몸에 거의 없어요. 생명체와 암석이 서로 다른 원소를 골라 쓴다는 뜻이에요.',
        },
      ],
    },
    {
      title: '원소 지도: 원소는 어디서 왔을까', short: '원소 지도', icon: '🗺️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지각과 몸에는 우주와 다른 원소가 많다는 것을 봤어요. 이 원소들은 언제, 어디서 만들어졌을까요?</div>' +
        '<p>원소 카드 12장을 <b>빅뱅 · 별 안의 핵융합 · 초신성</b> 세 칸 중 처음 만들어진 곳에 놓아요. 카드의 <b>지</b>·<b>몸</b> 표시는 지각과 사람 몸에 많은 원소를 뜻해요.</p>',
      features: ['map'],
      setup() { setScene('map', ''); },
      recap: '수소·헬륨은 빅뱅에서, 철까지의 원소는 별 안의 핵융합에서, 철보다 무거운 원소는 초신성에서 만들어졌어요. 사람 몸의 수소는 빅뱅, 탄소·산소는 별에서 왔어요.',
      summary: '<table class="mini"><tr><th>만들어진 곳</th><th>원소</th></tr><tr><th>빅뱅</th><td>수소, 헬륨</td></tr><tr><th>별 안의 핵융합</th><td>탄소, 질소, 산소, 규소, 칼슘, 나트륨, 철 …</td></tr><tr><th>초신성</th><td>철보다 무거운 금, 은, 우라늄 …</td></tr></table><p>사람 몸의 <b>수소</b>는 빅뱅, <b>탄소·산소·질소</b>는 별 안의 핵융합에서 왔어요.</p>',
      missions: [
        {
          title: '12장 원소 분류하기', manual: true,
          goal: '원소 카드 12장을 끌어 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '수소·헬륨은 빅뱅 직후, 철까지의 원소는 별 안의 핵융합, 철보다 무거운 원소만 초신성이에요.',
          setup() { setScene('map', ''); },
          check() {
            const n = mapCount();
            if (n < 12) return '아직 ' + (12 - n) + '장이 남았어요. 카드를 모두 칸에 놓아 보세요.';
            const w = mapWrong();
            S.map.forEach((c) => { const isBad = !!(c.bin && c.bin !== c.el.origin); if (isBad && !c.bad) c.shake = 1; c.bad = isBad; });
            if (w.length) return '빨간 테두리 카드 ' + w.length + '장이 잘못 놓였어요. 철보다 무거운 원소인지, 철까지의 원소인지 생각해 보세요.';
            return true;
          },
          status: () => '분류한 카드 ' + mapCount() + ' / 12',
          explain: '<b>빅뱅</b>(수소·헬륨), <b>별 안의 핵융합</b>(탄소·질소·산소·나트륨·규소·칼슘·철), <b>초신성</b>(은·금·우라늄)이에요. 철은 별 핵융합의 마지막 원소라서 ‘철보다 무거운’ 원소만 초신성 몫이에요.',
        },
        {
          type: 'quiz', title: '내 몸을 이루는 원소의 기원',
          goal: '사람 몸을 이루는 원소의 기원으로 옳은 것은?',
          setup() { setScene('map', ''); },
          choices: ['수소는 빅뱅, 탄소·산소는 별 안의 핵융합에서 왔다', '수소·탄소·산소가 모두 초신성에서 처음 만들어졌다', '수소는 별 안의 핵융합, 탄소·산소는 빅뱅에서 왔다', '모두 지구가 생길 때 지구 안에서 만들어졌다'],
          answer: 0,
          feedback: ['', '초신성은 별 안에서 만든 원소를 우주로 퍼뜨리는 역할도 해요. 하지만 탄소·산소를 처음 만든 곳은 별 안의 핵융합이에요.', '반대로 말했어요. 가장 가벼운 수소는 빅뱅 직후에, 탄소·산소는 별 속에서 만들어졌어요.', '지구 안에서는 새로운 원소가 만들어지지 않아요. 원소는 우주에서 이미 만들어진 것을 물려받았어요.'],
          explain: '몸 질량의 약 10 %인 <b>수소</b>는 빅뱅에서, 대부분인 <b>산소·탄소·질소</b>는 별 안의 핵융합에서 왔어요. 이 원소들은 별이 죽을 때 우주로 흩어져 태양계와 우리 몸의 재료가 되었어요. (‘우리는 별의 먼지’라는 말은 비유예요.)',
        },
      ],
    },
    {
      title: '우주 역사 속의 지구와 생명', short: '우주 역사', icon: '🕰️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몸속 원소의 고향이 빅뱅과 별이라는 것을 알았어요. 이제 이 이야기를 시간 순서로 정리해 봐요.</div>' +
        '<p>우주의 큰 사건 6개를 <b>연대표</b>에 놓고, 지구와 생명의 역사가 우주 역사의 어디쯤인지 찾아봐요.</p>',
      features: ['time'],
      setup() { setScene('time', ''); },
      recap: '지구와 생명을 이루는 원소는 태양계가 생기기 전에 빅뱅·별·초신성에서 이미 만들어져 있었어요. 지구와 생명의 역사는 우주 역사의 일부분이에요.',
      summary: '<ul><li>우주 역사: 빅뱅(138억 년 전) → 첫 별(약 135억 년 전) → 태양계 형성(약 46억 년 전) → 원시 지구 → 최초의 생명(약 38억 년 전) → 현재</li><li>지구와 생명을 이루는 원소는 <b>태양계가 생기기 전</b>에 빅뱅·별·초신성에서 이미 만들어져 있었어요.</li><li>그래서 <b>지구와 생명의 역사는 우주 역사의 일부분</b>이에요.</li></ul>',
      missions: [
        {
          title: '연대표 순서 맞추기', manual: true,
          goal: '사건 카드 6장을 끌어 <b>오래된 순서대로</b> 1번~6번 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드에 적힌 “약 ○○억 년 전”에서 숫자가 클수록 더 오래된 일이에요.',
          setup() { setScene('time', ''); },
          check() {
            const n = timeCount();
            if (n < 6) return '아직 ' + (6 - n) + '장이 남았어요. 카드를 모두 칸에 놓아 보세요.';
            let bad = 0;
            S.time.forEach((c) => { const isBad = c.slot.i !== EVENTS.findIndex((e) => e.id === c.id); if (isBad && !c.bad) c.shake = 1; c.bad = isBad; if (isBad) bad++; });
            if (bad) return '빨간 테두리 카드 ' + bad + '장의 순서가 달라요. “몇 억 년 전”인지 다시 비교해 보세요.';
            return true;
          },
          status: () => '놓은 카드 ' + timeCount() + ' / 6',
          explain: '<b>빅뱅(138억 년 전) → 첫 별 → 태양계(약 46억 년 전) → 원시 지구 → 최초의 생명(약 38억 년 전) → 현재</b>예요. 첫 별과 태양계 사이에는 아주 오랫동안 별이 태어나고 폭발하며 원소를 늘려 갔어요.',
        },
        {
          title: '문장 완성하기', manual: true,
          goal: '빈칸을 골라 “지구와 생명의 역사”와 우주 역사의 관계를 설명하는 문장을 완성하세요.',
          hint: '지구를 이루는 원소는 지구 안에서 새로 생기지 않았어요. 앞에서 배운 원소의 고향을 떠올려 보세요.',
          setup() { setScene('time', 'sentence'); },
          check() {
            const ans = { sel1: '전', sel2: '빅뱅과 별·초신성', sel3: '우주 역사의 일부분' };
            let empty = false, bad = false;
            Object.keys(ans).forEach((id) => {
              const s = $('#' + id);
              if (!s.value) { empty = true; return; }
              if (s.value !== ans[id]) { bad = true; if (!s.classList.contains('bad')) { s.classList.remove('ok'); s.classList.add('bad'); } } else { s.classList.remove('bad'); s.classList.add('ok'); }
            });
            if (empty) return '세 빈칸을 모두 골라 보세요.';
            if (bad) return '빨간 칸을 다시 생각해 보세요. 원소는 언제, 어디서 만들어졌는지 떠올려 보세요.';
            return true;
          },
          explain: '지구와 생명을 이루는 원소는 태양계가 생기기 <b>전</b>에 <b>빅뱅과 별·초신성</b>에서 이미 만들어져 있었어요. 그래서 지구와 생명의 역사는 <b>우주 역사의 일부분</b>이에요.',
        },
        {
          type: 'quiz', title: '태양계가 생기기 전에',
          goal: '태양계가 만들어지기 <b>전</b>에 이미 만들어져 있던 원소로 옳은 것은?',
          setup() { setScene('time', ''); },
          choices: ['수소와 헬륨뿐이었다', '수소·헬륨은 빅뱅에서, 탄소·산소·철은 별에서, 금·우라늄은 초신성에서 이미 만들어져 있었다', '탄소·산소·금은 지구가 생길 때 지구 안에서 새로 만들어졌다', '생명이 생긴 뒤에야 대부분의 원소가 만들어졌다'],
          answer: 1,
          feedback: ['수소와 헬륨은 빅뱅에서 나왔지만, 앞선 별들이 이미 탄소·산소·철 같은 더 무거운 원소도 만들어 두었어요.', '', '지구 안에서는 새로운 원소가 만들어지지 않아요. 지구의 재료는 앞선 별에서 물려받은 거예요.', '생명은 태양계가 생기고 한참 뒤(약 38억 년 전)에 나타났어요. 원소는 그보다 훨씬 전에 만들어졌어요.'],
          explain: '태양계의 재료에는 <b>빅뱅의 수소·헬륨</b>, <b>앞선 별 속에서 만든 탄소·산소·철</b>, <b>초신성이 만든 금·우라늄</b>이 모두 섞여 있었어요. 지구와 우리는 우주 역사 속에서 만들어진 원소들로 이루어져 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-supernova-origin', mount: '#game', badge: '원소 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { sn: '💥 초신성 시간 슬라이더', bars: '📊 성분 막대그래프 3종', map: '🗺️ 원소 지도 · 원소 카드', time: '🕰️ 우주 연대표 · 사건 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  initMap(); initTime();
  setScene('sn', '');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) { S.sub = ''; } updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    // 초신성 진행
    if (S.playing) {
      S.t = Math.min(1, S.t + dt * 0.052);
      if (S.t >= 1) S.playing = false;
    }
    S.tShown = RM ? S.t : SciSim.approach(S.tShown, S.t, dt, S.playing ? 40 : 9);
    if (Math.abs(S.tShown - S.t) < 0.0005) S.tShown = S.t;
    const tt = S.tShown;
    S.maxT = Math.max(S.maxT, tt);
    const st = stageOf(tt);
    if (S.mode === 'sn') {
      if (!S.stages.has(st)) { S.stages.add(st); updateCtl(); }
      if (tt >= 0.182 && !S.wasBlast && S.t > 0.17) { S.wasBlast = true; parts.burst(SN.cx, SN.cy, { count: 36, speed: 260, size: 4, colors: ['#ffd76a', '#ff9d5c', '#fff', '#ff6b6b'], gravity: 0, life: 1.1 }); Sound.fail && 0; }
      if (tt < 0.15) S.wasBlast = false;
      if (document.activeElement !== sTime) sTime.value = Math.round(S.t * 1000);
      sTime.style.setProperty('--pct', (S.t * 100) + '%');
      oStage.textContent = STAGES[st].n;
      bPlay.textContent = S.playing ? '⏸ 멈춤' : (S.t >= 0.995 ? '▶ 다시 보기' : S.t > 0.01 ? '▶ 이어서 보기' : '▶ 폭발시키기');
      $$('#stageChips button').forEach((b, i) => { b.classList.toggle('on', i === st); b.classList.toggle('seen', S.stages.has(i)); });
    }
    // 그리기
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'sn') drawSN(tt, dt);
    else if (S.mode === 'bars') { drawBars(dt); parts.update(dt); parts.draw(ctx); }
    else if (S.mode === 'map') drawMap(dt);
    else drawTime(dt);
    if (S.fade > 0.005) { ctx.fillStyle = (S.mode === 'sn' ? 'rgba(11,18,38,' : 'rgba(255,255,255,') + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, EL, EVENTS, MAP_IDS, STAGES, TOK, nebPos, setScene, setBM, tapToken,
    playTo(t) { S.playing = false; S.t = t; S.tShown = t; },
    tapAllTokens() { S.tShown = S.t = 0.3; ['Au', 'Ag', 'U'].forEach((el) => { S.heavy.add(el); }); },
    seeStages() { [0, 1, 2, 3, 4].forEach((i) => S.stages.add(i)); },
    fillMap(right) { S.map.forEach((c) => { const bid = right === false ? (c.el.origin === 'star' ? 'nova' : 'star') : c.el.origin; c.bin = bid; c.ord = ordSeq++; c.bad = false; }); relayoutMap(null); },
    fillTime(right) {
      const order = right === false ? ['star1', 'bang', 'sun', 'earth', 'life', 'now'] : EVENTS.map((e) => e.id);
      S.tslots.forEach((s) => { s.card = null; });
      order.forEach((id, i) => { const c = S.time.find((x) => x.id === id); c.slot = S.tslots[i]; S.tslots[i].card = c; c.bad = false; });
      relayoutTime(null);
    },
    mapCards: () => S.map.map((c) => ({ id: c.id, x: c.x, y: c.y, bin: c.bin })),
    timeCards: () => S.time.map((c) => ({ id: c.id, x: c.x, y: c.y })),
    BINS, get tslots() { return S.tslots; },
  };
})();
