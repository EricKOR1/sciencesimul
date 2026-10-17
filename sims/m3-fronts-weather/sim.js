/* =========================================================
   중3 Ⅱ. 날씨와 기후변화 — 기단과 전선, 일기도 [9과17-04]
   ① [관찰] 기단: 우리나라 주변 4개 기단 카드를 발원지에 놓기, 계절별 영향 기단
   ② [모형] 전선: 칸막이 수조(밀도류) → 한랭 전선·온난 전선 단면(구름·강수 구역·통과 후 기온)
   ③ [설명] 고기압·저기압: 공기 기둥 단면의 상승·하강 기류, 지상 바람, 날씨
   ④ [분석] 예시 일기도 읽기(겨울·봄) + 위성·레이더 영상 예시, 지점 A·B·C 날씨 카드
   ※ 등압선 그리기·일기 예보 과정·일기도 작성·전향력은 다루지 않아요. 일기도는 모두 '예시 자료'예요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp, fmt } = SciSim;
  const TAU = Math.PI * 2;
  const view = SciSim.stage($('#cv'), { width: 800, height: 540, background: '#eaf4fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const shade = SciSim.color.shade, mixc = SciSim.color.mix, rgba = SciSim.color.rgba;
  const approach = SciSim.approach, RM = !!SciSim.reduceMotion;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fx = new SciSim.Particles();

  const SCENES = [
    { id: 'mass', step: 0, label: '🗺️ 기단 지도' },
    { id: 'tank', step: 1, label: '🧊 수조 모형' },
    { id: 'front', step: 1, label: '⛅ 전선 단면' },
    { id: 'column', step: 2, label: '🌀 고기압·저기압' },
    { id: 'wmap', step: 3, label: '📋 예시 일기도' },
  ];

  /* ---------- 공통 도우미 ---------- */
  function pill(x, y, text, o) { return D.label(x, y, text, Object.assign({ bg: 'rgba(255,255,255,.94)', color: '#1b2333', border: '#cbd5e1', size: 13 }, o || {})); }
  function caption(text, o) { pill(16, 30, text, Object.assign({ bg: 'rgba(30,41,59,.82)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' }, o || {})); }
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = text; h.classList.toggle('hide', !text);
    clearTimeout(hintTimer);
    if (ms && text) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }
  const mkPath = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  function cloudPuffs(x, y, w, h, col, a, seed) {            // 몽글몽글한 구름 덩어리 (납작한 둥근 점들)
    const r = rnd(seed || 7), n = Math.max(6, Math.round(w / 14));
    ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const px = x + (i + 0.5) / n * w, k = Math.sin(Math.PI * (i + 0.5) / n);
      const rr = (h * 0.55) * (0.55 + 0.45 * k) * (0.85 + 0.3 * r());
      ctx.beginPath(); ctx.arc(px, y + h * 0.5 - k * h * 0.12 + (r() - 0.5) * h * 0.18, rr, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 지도 모양 (단순화한 동아시아) ---------- */
  const CONT = [[0, 0], [560, 0], [586, 44], [566, 96], [590, 138], [556, 184], [540, 214], [552, 250], [566, 290], [556, 322], [538, 338], [524, 318], [516, 296], [506, 262], [500, 252], [478, 236], [452, 246], [446, 272], [468, 296], [486, 306], [462, 316], [440, 336], [426, 380], [400, 430], [352, 490], [310, 540], [0, 540]];
  const KOREA = [[540, 214], [552, 250], [566, 290], [556, 322], [538, 338], [524, 318], [516, 296], [506, 262], [518, 232]];
  const ISLES = [
    [[612, 236], [640, 230], [666, 258], [694, 298], [716, 330], [694, 344], [664, 320], [634, 292], [614, 262]],
    [[648, 166], [676, 174], [686, 200], [662, 206], [648, 190]],
    [[640, 352], [660, 348], [666, 366], [646, 372]],
    [[596, 100], [606, 106], [612, 168], [598, 172], [592, 130]],
    [[740, 0], [800, 0], [800, 150], [772, 130], [752, 70]],
  ];
  const P_CONT = mkPath(CONT), P_KOREA = mkPath(KOREA), P_ISLES = ISLES.map(mkPath);
  const KP = [536, 285];
  function drawMapBase(mode, o) {
    o = o || {};
    const og = ctx.createLinearGradient(0, 0, 800, 540);
    if (mode === 'sat') { og.addColorStop(0, '#16304f'); og.addColorStop(1, '#1e4570'); }
    else if (mode === 'radar') { og.addColorStop(0, '#16222f'); og.addColorStop(1, '#1b2c3d'); }
    else { og.addColorStop(0, o.o0 || '#5ba7e4'); og.addColorStop(1, o.o1 || '#3a82c6'); }
    ctx.fillStyle = og; ctx.fillRect(0, 0, 800, 540);
    const land = mode === 'sat' ? '#6c7a5a' : mode === 'radar' ? '#2a3a31' : (o.land || '#e4ecd9');
    ctx.save(); ctx.translate(0, 5); ctx.fillStyle = 'rgba(5,20,50,.25)'; ctx.fill(P_CONT); ctx.restore();
    ctx.fillStyle = land; ctx.fill(P_CONT);
    P_ISLES.forEach((p) => { ctx.fillStyle = land; ctx.fill(p); ctx.strokeStyle = mode === 'chart' || !mode ? 'rgba(40,70,40,.35)' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; ctx.stroke(p); });
    ctx.strokeStyle = mode === 'chart' || !mode ? 'rgba(30,60,40,.5)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke(P_CONT);
    if (mode === 'radar') {
      ctx.strokeStyle = 'rgba(160,220,255,.12)'; ctx.lineWidth = 1;
      for (let x = 100; x < 800; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke(); }
      for (let y = 90; y < 540; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
    }
    ctx.fillStyle = mode === 'sat' || mode === 'radar' ? '#fbbf24' : '#1b2333';
    if (o.korea !== false) { ctx.fillStyle = o.kfill || (mode === 'chart' || !mode ? '#f4f7ee' : 'rgba(255,255,255,.18)'); ctx.fill(P_KOREA); ctx.strokeStyle = mode === 'chart' || !mode ? '#1b2333' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke(P_KOREA); }
  }
  const labelText = (x, y, t, size) => D.text(x, y, t, { size: size || 13, weight: 800, color: 'rgba(255,255,255,.95)', stroke: 'rgba(20,50,90,.55)', strokeWidth: 3.5 });

  /* =========================================================
     카드 끌어 놓기 (기단 카드 · 날씨 카드 공통)
     ========================================================= */
  const SETS = {};
  function makeSet(id, defs, targets, cw, ch, trayY) {
    const set = { id, targets, cw, ch, trayY, cards: [] };
    const n = defs.length, gap = 12;
    defs.forEach((d, i) => {
      const hx = 400 + (i - (n - 1) / 2) * (cw + gap);
      set.cards.push(Object.assign({ x: hx, y: trayY, hx, hy: trayY, slot: -1, drag: false, sc: 1, w: cw, h: ch, shake: 0 }, d));
    });
    SETS[id] = set;
    return set;
  }
  // 기단 카드: ans = 발원지 번호 (0 시베리아 · 1 오호츠크해 · 2 북태평양 · 3 양쯔강)
  const AIR = [
    { key: 'sib', name: '시베리아 기단', short: '시베리아', prop: '한랭 건조', col: '#5b9bff', home: [190, 112], R: 108, where: '북쪽 대륙', tip: '대륙(건조)·북쪽(한랭)', season: '겨울', eff: '춥고 건조해요' },
    { key: 'okh', name: '오호츠크해 기단', short: '오호츠크해', prop: '한랭 다습', col: '#1fb5ad', home: [690, 104], R: 92, where: '북쪽 바다', tip: '바다(다습)·북쪽(한랭)', season: '늦봄~초여름', eff: '선선하고 습해요' },
    { key: 'pac', name: '북태평양 기단', short: '북태평양', prop: '고온 다습', col: '#ff6b3d', home: [665, 372], R: 118, where: '남쪽 바다', tip: '바다(다습)·남쪽(온난)', season: '여름', eff: '무덥고 습해요' },
    { key: 'yan', name: '양쯔강 기단', short: '양쯔강', prop: '온난 건조', col: '#f2b134', home: [310, 350], R: 92, where: '남쪽 대륙', tip: '대륙(건조)·남쪽(온난)', season: '봄·가을', eff: '따뜻하고 건조해요' },
  ];
  makeSet('mass',
    [{ id: 'pac', ans: 2, title: '북태평양 기단', sub: '고온 · 다습', subCol: '#c2410c' }, { id: 'sib', ans: 0, title: '시베리아 기단', sub: '한랭 · 건조', subCol: '#1d4ed8' },
     { id: 'yan', ans: 3, title: '양쯔강 기단', sub: '온난 · 건조', subCol: '#b45309' }, { id: 'okh', ans: 1, title: '오호츠크해 기단', sub: '한랭 · 다습', subCol: '#0f766e' }],
    AIR.map((a) => ({ x: a.home[0], y: a.home[1], label: a.where, r: 100, cdx: 0, cdy: 0, cs: 0.84 })), 176, 52, 478);
  const WX = {
    win: { cards: [{ id: 'sunny', ans: 0, title: '☀️ 맑고 건조해요', sub: '하강 기류 · 구름 없음', subCol: '#b45309' }, { id: 'cloud', ans: 2, title: '☁️ 구름 많고 눈·비', sub: '상승 기류 · 구름 생성', subCol: '#475569' }, { id: 'wind', ans: 1, title: '🌬️ 북서풍이 강해요', sub: '등압선 간격이 좁아요', subCol: '#1d4ed8' }],
      targets: [{ x: 150, y: 186, label: 'A', r: 80, cdx: 0, cdy: 62, cs: 0.74 }, { x: 536, y: 272, label: 'B', r: 70, cdx: -56, cdy: 66, cs: 0.74 }, { x: 716, y: 236, label: 'C', r: 80, cdx: 0, cdy: 66, cs: 0.74 }] },
    spr: { cards: [{ id: 'rain', ans: 0, title: '🌧️ 흐리고 오랫동안 비', sub: '넓은 지역 · 지속적인 비', subCol: '#475569' }, { id: 'shower', ans: 1, title: '⛈️ 소나기·천둥 번개', sub: '좁은 지역 · 세찬 비', subCol: '#6d28d9' }, { id: 'clear', ans: 2, title: '🌤️ 맑아지고 쌀쌀해져요', sub: '기온 하강', subCol: '#1d4ed8' }],
      targets: [{ x: 612, y: 296, label: 'A', r: 70, cdx: 0, cdy: -52, cs: 0.74 }, { x: 352, y: 330, label: 'B', r: 70, cdx: 74, cdy: 36, cs: 0.74 }, { x: 236, y: 388, label: 'C', r: 70, cdx: 0, cdy: -52, cs: 0.74 }] },
  };
  makeSet('win', WX.win.cards, WX.win.targets, 236, 52, 478);
  makeSet('spr', WX.spr.cards, WX.spr.targets, 236, 52, 478);

  function setFor(scene) { return scene === 'mass' ? SETS.mass : scene === 'wmap' ? SETS[S.wm.map] : null; }
  function setStatus(set) {
    const placed = set.cards.filter((c) => c.slot >= 0);
    return { placed: placed.length, correct: placed.filter((c) => c.slot === c.ans).length, wrong: placed.filter((c) => c.slot !== c.ans), total: set.cards.length };
  }
  function cardTo(c, x, y, sc, ease) {
    SciSim.tween(c, { x, y, sc }, { duration: 0.5, ease: ease || 'outBack' });
  }
  function sendHome(c) { c.slot = -1; cardTo(c, c.hx, c.hy, 1, 'outCubic'); }
  function cardHit(set, p) {
    for (let i = set.cards.length - 1; i >= 0; i--) {
      const c = set.cards[i];
      if (Math.abs(p.x - c.x) < c.w * c.sc / 2 && Math.abs(p.y - c.y) < c.h * c.sc / 2) return c;
    }
    return null;
  }
  let dragCard = null, dragOff = { x: 0, y: 0 };
  function cardDown(set, p) {
    const c = cardHit(set, p); if (!c) return false;
    dragCard = c; dragOff = { x: c.x - p.x, y: c.y - p.y };
    set.cards.splice(set.cards.indexOf(c), 1); set.cards.push(c);
    c.slot = -1; c.drag = true;
    SciSim.tween(c, { sc: 1.08 }, { duration: 0.18, ease: 'outCubic' });
    Sound.tick();
    return true;
  }
  function cardMove(set, p) {
    if (!dragCard) return;
    dragCard.x = p.x + dragOff.x; dragCard.y = p.y + dragOff.y;
  }
  function cardUp(set) {
    const c = dragCard; if (!c) return;
    dragCard = null; c.drag = false;
    let best = -1, bd = 1e9;
    set.targets.forEach((t, i) => { const d = Math.hypot(c.x - t.x, c.y - t.y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 110) {
      const prev = set.cards.find((o) => o !== c && o.slot === best);
      if (prev) sendHome(prev);
      c.slot = best;
      const t = set.targets[best];
      cardTo(c, t.x + t.cdx, t.y + t.cdy, t.cs);
      Sound.tick();
    } else sendHome(c);
  }
  function resetSet(set) { set.cards.forEach((c) => { c.slot = -1; c.drag = false; cardTo(c, c.hx, c.hy, 1, 'outCubic'); }); }
  let wrongShown = false;
  function drawCards(set) {
    // 보관함
    ctx.save();
    D.roundRect(22, set.trayY - set.ch / 2 - 10, 756, set.ch + 20, 16); ctx.fillStyle = 'rgba(15,23,42,.38)'; ctx.fill();
    ctx.restore();
    set.cards.forEach((c) => {
      const lift = clamp((c.sc - 1) / 0.08, 0, 1);
      const w = c.w * c.sc, h = c.h * c.sc;
      const bad = wrongShown && c.slot >= 0 && c.slot !== c.ans;
      ctx.save();
      if (c.shake > 0) ctx.translate(Math.sin(S.t * 60) * 4 * c.shake, 0);
      D.shadow(() => { D.roundRect(c.x - w / 2, c.y - h / 2, w, h, 12 * c.sc); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + 12 * lift, y: 2 + 6 * lift, color: 'rgba(15,30,60,.32)' });
      ctx.lineWidth = bad ? 3.5 : 2; ctx.strokeStyle = bad ? '#ef4444' : c.slot >= 0 && c.slot === c.ans && c.reveal ? '#16a34a' : '#c3d0e0';
      D.roundRect(c.x - w / 2, c.y - h / 2, w, h, 12 * c.sc); ctx.stroke();
      const fs = c.sc < 0.9 ? 13 : 14.5;
      D.text(c.x, c.y - h * 0.08, c.title, { size: fs * (c.sc > 0.9 ? 1 : 1.0), weight: 800, color: '#1b2333' });
      D.text(c.x, c.y + h * 0.28, c.sub, { size: c.sc < 0.9 ? 12.5 : 13, weight: 800, color: c.subCol });
      ctx.restore();
    });
  }

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'mass', prev: null, tr: 1, t: 0, hasSnap: false,
    mass: { season: null, sS: {}, seen: { win: 0, spr: 0, ear: 0, sum: 0 }, revealAll: false, blobs: [] },
    tk: { open: 0, released: false, t: 0, dots: [], time: 0 },
    fr: { type: 'cold', x: 0, xS: 0, play: false, temp: 24, tempS: 24, passedCold: false, passedWarm: false, rainP: [], rainA: 0, flash: 0 },
    cl: { slots: [], wxH: 0, wxL: 0, t0: 0 },
    wm: { map: 'win', layer: 'chart', seenSat: false, seenRadar: false, layerA: { chart: 1, sat: 0, radar: 0 }, phase: 0 },
  };
  AIR.forEach((a) => S.mass.blobs.push({ rev: 0, inf: 0, ph: Math.random() * 6, x: a.home[0], y: a.home[1] }));

  /* =========================================================
     장면 1: 우리나라 주변 기단 지도
     ========================================================= */
  const SEASONS = {
    win: { name: '겨울', icon: '❄️', inf: [1, 0, 0, 0], text: '시베리아 기단 · 춥고 건조해요', note: '겨울: 시베리아 기단(한랭 건조)이 확장해 춥고 건조해요.' },
    spr: { name: '봄·가을', icon: '🌸', inf: [0, 0, 0, 1], text: '양쯔강 기단 · 따뜻하고 건조해요', note: '봄·가을: 양쯔강 기단(온난 건조)의 영향으로 날씨가 맑고 건조해요.' },
    ear: { name: '초여름', icon: '🌧️', inf: [0, 1, 0.7, 0], text: '오호츠크해 기단 + 북태평양 기단 · 장마', note: '늦봄~초여름: 오호츠크해 기단(한랭 다습)과 북태평양 기단(고온 다습)이 만나요.' },
    sum: { name: '여름', icon: '☀️', inf: [0, 0, 1, 0], text: '북태평양 기단 · 무덥고 습해요', note: '여름: 북태평양 기단(고온 다습)의 영향으로 무덥고 습해요.' },
  };
  const massRevealed = (i) => S.mass.revealAll || (game && game.free) || SETS.mass.cards.some((c) => c.slot === i && c.ans === i);
  function massStep(dt) {
    const m = S.mass, sea = m.season && SEASONS[m.season];
    AIR.forEach((a, i) => {
      const b = m.blobs[i];
      b.rev = approach(b.rev, massRevealed(i) ? 1 : 0, dt, 4);
      b.inf = approach(b.inf, sea ? sea.inf[i] : 0, dt, 2.2);
      const k = b.inf;
      b.x = lerp(a.home[0], KP[0], 0.5 * k); b.y = lerp(a.home[1], KP[1], 0.5 * k);
    });
    if (m.season && m.blobs.every((b, i) => Math.abs(b.inf - SEASONS[m.season].inf[i]) < 0.12)) m.seen[m.season] += dt;
  }
  function blobPath(cx, cy, r, t, seed) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const a = (i / 36) * TAU;
      const rr = r * (1 + 0.07 * Math.sin(3 * a + t * 0.9 + seed) + 0.05 * Math.sin(5 * a - t * 1.3 + seed * 2) + 0.03 * Math.sin(8 * a + t));
      const x = cx + Math.cos(a) * rr * 1.08, y = cy + Math.sin(a) * rr * 0.9;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function drawMass() {
    drawMapBase('chart', { o0: '#58a4e2', o1: '#3a82c6', land: '#e6eedb' });
    labelText(70, 300, '대륙', 17); labelText(742, 334, '태평양', 17); labelText(742, 218, '오호츠크해', 14);
    labelText(588, 276, '동해', 13); labelText(472, 396, '황해', 13);
    const set = SETS.mass, m = S.mass;
    // 발원지 목표 표시
    set.targets.forEach((t, i) => {
      const occ = set.cards.find((c) => c.slot === i);
      const showTarget = !massRevealed(i);
      if (showTarget) {
        ctx.save(); ctx.setLineDash([9, 8]); ctx.lineDashOffset = -S.t * 12; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(t.x, t.y, 86, 0, TAU); ctx.stroke(); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(t.x, t.y, 86, 0, TAU); ctx.fill();
        if (!occ) { D.ring(t.x, t.y, 86, S.t, { color: '#ffffff', width: 2 }); pill(t.x, t.y - 4, t.label, { bg: 'rgba(15,23,42,.8)', color: '#fff', border: null, size: 15, pad: 12 }); }
      }
    });
    // 기단 덩어리 (이름표는 모든 덩어리를 그린 뒤에 그려서 서로 가리지 않게 해요)
    const massLabels = [];
    AIR.forEach((a, i) => {
      const b = m.blobs[i];
      if (b.rev < 0.02) return;
      const k = b.inf, R = a.R * (1 + 0.3 * k), al = b.rev * (0.46 + 0.3 * k);
      ctx.save();
      blobPath(b.x, b.y, R, S.t, b.ph);
      const g = ctx.createRadialGradient(b.x, b.y, R * 0.1, b.x, b.y, R * 1.1);
      g.addColorStop(0, rgba(a.col, al)); g.addColorStop(0.7, rgba(a.col, al * 0.8)); g.addColorStop(1, rgba(a.col, al * 0.25));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = rgba(shade(a.col, -0.2), 0.9 * b.rev); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      // 다습한 기단: 물방울 / 건조한 기단: 점
      const humid = a.prop.indexOf('다습') >= 0;
      ctx.save(); ctx.globalAlpha = 0.5 * b.rev;
      const rr = rnd(100 + i);
      for (let j = 0; j < 9; j++) {
        const ang = rr() * TAU, dd = rr() * R * 0.75, px = b.x + Math.cos(ang) * dd, py = b.y + Math.sin(ang) * dd * 0.8 + Math.sin(S.t * 1.4 + j) * 3;
        if (humid) { ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.quadraticCurveTo(px + 5, py + 1, px, py + 5); ctx.quadraticCurveTo(px - 5, py + 1, px, py - 6); ctx.fill(); }
        else { ctx.fillStyle = '#fff7d6'; ctx.fillRect(px - 1.5, py - 1.5, 3, 3); }
      }
      ctx.restore();
      if (b.rev > 0.5 && (massLocked() || !(set.cards.some((c) => c.slot === i)))) {
        massLabels.push(() => { ctx.save(); ctx.globalAlpha = b.rev; pill(b.x, b.y - 6, a.name, { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: rgba(a.col, 0.9), size: 14 }); pill(b.x, b.y + 20, a.prop, { bg: shade(a.col, -0.28), color: '#fff', border: null, size: 13 }); ctx.restore(); });
      } else if (b.rev > 0.5) {
        massLabels.push(() => { ctx.save(); ctx.globalAlpha = b.rev; pill(b.x, b.y + 46, a.prop, { bg: shade(a.col, -0.28), color: '#fff', border: null, size: 13 }); ctx.restore(); });
      }
      if (k > 0.15) {
        const dx = KP[0] - b.x, dy = KP[1] - b.y, L = Math.hypot(dx, dy) || 1;
        D.arrow(b.x + dx / L * R * 0.55, b.y + dy / L * R * 0.55, KP[0] - dx / L * 34, KP[1] - dy / L * 34, { color: shade(a.col, -0.12), width: 5 + 5 * k, head: 18, alpha: Math.min(0.95, k * 1.3) });
      }
    });
    massLabels.forEach((f) => f());
    // 초여름: 두 기단이 만나는 곳 (이름만)
    const ear = m.blobs[1].inf * m.blobs[2].inf;
    if (ear > 0.2) {
      ctx.save(); ctx.globalAlpha = Math.min(1, ear * 2.2);
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -S.t * 10;
      ctx.beginPath(); ctx.moveTo(470, 304); ctx.quadraticCurveTo(580, 250, 720, 268); ctx.stroke(); ctx.setLineDash([]);
      pill(660, 308, '두 기단이 만나는 곳: 장마 전선', { bg: '#7c3aed', color: '#fff', border: null, size: 13 });
      ctx.restore();
    }
    // 우리나라
    D.sphere(KP[0], KP[1], 7, '#fbbf24', { shadow: true });
    D.dashedLine(KP[0] - 8, KP[1] + 8, 462, 398, { color: '#fff', width: 2, dash: [4, 4] });
    pill(470, 408, '우리나라', { bg: '#1b2333', color: '#fff', border: null, size: 14 });
    // 계절 표시
    if (m.season && S.mass.blobs.some((b) => b.rev > 0.5)) {
      const sea = SEASONS[m.season];
      pill(400, 34, sea.icon + ' ' + sea.name + ' — ' + sea.text, { bg: 'rgba(15,23,42,.84)', color: '#fff', border: null, size: 15, pad: 14 });
    }
    if (!(S.mass.revealAll || (game && game.free))) drawCards(set);
    pill(80, 520, '단순화한 지도', { bg: 'rgba(15,23,42,.55)', color: '#fff', border: null, size: 12.5 });
  }

  /* =========================================================
     장면 2-A: 칸막이 수조 (찬물 · 따뜻한 물, 밀도류)
     ========================================================= */
  const TB = { x0: 124, x1: 676, y0: 156, y1: 396, mid: 400, U: 76 };
  const TBW = TB.x1 - TB.x0, TBH = TB.y1 - TB.y0;
  function tkInit() {
    const r = rnd(2024), k = S.tk;
    k.dots.length = 0;
    for (let i = 0; i < 90; i++) k.dots.push({ x: TB.x0 + 10 + r() * (TBW - 20), y: TB.y0 + 14 + r() * (TBH - 28), s: 2 + r() * 1.6, v: 0.7 + r() * 0.6 });
  }
  tkInit();
  function tkReset() {
    const k = S.tk; k.released = false; k.time = 0; k.open = 0;
    SciSim.tween(k, { open: 0 }, { duration: 0.01 });
    tkInit();
  }
  const tkL = (t) => Math.max(1, t <= 3.6 ? 2 * TB.U * t : 2 * TB.U * 3.6 + 85 * (t - 3.6));
  function tkH(x, t) {                                // 경계면의 높이(0=바닥, 1=맨 위)
    return clamp(0.5 + (x - TB.mid) / tkL(t), 0, 1);
  }
  function tkStep(dt) {
    const k = S.tk;
    if (k.released && k.open > 0.55) k.time += dt;
    const t = k.time;
    k.dots.forEach((d) => {
      if (!k.released || k.open < 0.55) { d.x += Math.sin(S.t * 1.3 + d.y) * dt * 3; return; }
      const h = tkH(d.x, t), yi = TB.y1 - h * TBH;
      const cold = d.y > yi;
      const xc = TB.mid - TB.U * t, xw = TB.mid + TB.U * t;
      if (t < 3.6) { if (cold && d.x < xw) d.x -= TB.U * 0.82 * d.v * dt; else if (!cold && d.x > xc) d.x += TB.U * 0.82 * d.v * dt; }
      else { d.x += (cold ? -1 : 1) * Math.max(0, 22 - 6 * (t - 3.6)) * d.v * dt; }
      d.x = clamp(d.x, TB.x0 + 8, TB.x1 - 8);
    });
  }
  function drawTank() {
    // 실험대
    const g = ctx.createLinearGradient(0, 0, 0, 440); g.addColorStop(0, '#eef6fc'); g.addColorStop(1, '#dcebf6'); ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 440);
    const tg = ctx.createLinearGradient(0, 440, 0, 540); tg.addColorStop(0, '#ecdcc0'); tg.addColorStop(1, '#d6bf96'); ctx.fillStyle = tg; ctx.fillRect(0, 440, 800, 100);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 440, 800, 3);
    const k = S.tk, t = k.time;
    ctx.fillStyle = 'rgba(70,90,120,.16)'; ctx.beginPath(); ctx.ellipse(400, 428, 300, 14, 0, 0, TAU); ctx.fill();
    D.roundRect(TB.x0 - 14, TB.y0 - 30, TBW + 28, TBH + 54, 16); ctx.fillStyle = 'rgba(214,234,250,.5)'; ctx.fill();
    // 물 (따뜻한 물 전체 → 찬물 영역을 덮어 그림)
    ctx.save(); D.roundRect(TB.x0, TB.y0, TBW, TBH, 6); ctx.clip();
    const wg = ctx.createLinearGradient(0, TB.y0, 0, TB.y1); wg.addColorStop(0, '#ffb9a0'); wg.addColorStop(1, '#ff8a68');
    ctx.fillStyle = wg; ctx.fillRect(TB.x0, TB.y0, TBW, TBH);
    // 찬물
    const cg = ctx.createLinearGradient(0, TB.y0, 0, TB.y1); cg.addColorStop(0, '#6fb1f4'); cg.addColorStop(1, '#2f77d6');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(TB.x0, TB.y1 + 2);
    const sheared = Math.min(1, t / 1.2);
    for (let x = TB.x0; x <= TB.x1; x += 6) {
      const h = tkH(x, t);
      let yi = TB.y1 - h * TBH;
      const bump = Math.exp(-Math.pow((x - (TB.mid - TB.U * t + 26)) / 24, 2)) * 0.05 * TBH * (t > 0.1 && t < 3.8 ? 1 : 0);
      const mid = h > 0.04 && h < 0.96 ? 1 : 0;
      yi -= bump + mid * Math.sin(x * 0.085 - S.t * 5) * 3.4 * sheared * Math.min(1, 3.6 / Math.max(t, 1));
      ctx.lineTo(x, Math.min(TB.y1, Math.max(TB.y0, yi)));
    }
    ctx.lineTo(TB.x1, TB.y1 + 2); ctx.closePath(); ctx.fill();
    // 경계면 선
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.beginPath();
    let first = true;
    for (let x = TB.x0; x <= TB.x1; x += 6) {
      const h = tkH(x, t); if (h <= 0.001 || h >= 0.999) { first = true; continue; }
      let yi = TB.y1 - h * TBH - Math.sin(x * 0.085 - S.t * 5) * 3.4 * sheared;
      first ? ctx.moveTo(x, yi) : ctx.lineTo(x, yi); first = false;
    }
    ctx.stroke();
    // 물결 윗면과 입자
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(TB.x0, TB.y0, TBW, 4);
    k.dots.forEach((d) => { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, TAU); ctx.fill(); });
    ctx.restore();
    // 칸막이
    const ox = k.open * 250;
    ctx.save(); D.roundRect(TB.x0 - 14, TB.y0 - 30, TBW + 28, TBH + 54, 16); ctx.clip();
    ctx.restore();
    D.shadow(() => { D.roundRect(TB.mid - 4, TB.y0 - 26 - ox, 8, TBH + 30, 3); ctx.fillStyle = 'rgba(190,215,240,.9)'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(TB.mid - 14, TB.y0 - 42 - ox, 28, 16, 6); ctx.fillStyle = '#64748b'; ctx.fill();
    // 수조 유리
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; D.roundRect(TB.x0 - 14, TB.y0 - 30, TBW + 28, TBH + 54, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(TB.x0 - 4, TB.y0 + 10); ctx.lineTo(TB.x0 - 4, TB.y1 - 20); ctx.stroke();
    // 이름표
    const rel = k.released && k.open > 0.55;
    pill(262, 112, '따뜻한 물 30 °C', { bg: 'rgba(255,255,255,.95)', color: '#c2410c', border: '#fdba74', size: 14.5 });
    pill(538, 112, '찬물 5 °C', { bg: 'rgba(255,255,255,.95)', color: '#1d4ed8', border: '#93c5fd', size: 14.5 });
    if (rel && t > 0.8) {
      const a = sstep(0.8, 1.6, t);
      D.arrow(TB.mid + 90, TB.y1 - 22, TB.mid - 190, TB.y1 - 22, { color: '#ffffff', width: 6, head: 18, alpha: a * 0.95 });
      D.arrow(TB.mid - 90, TB.y0 + 24, TB.mid + 190, TB.y0 + 24, { color: '#ffffff', width: 6, head: 18, alpha: a * 0.95 });
      pill(TB.mid - 70, TB.y1 - 48, '무거운 찬물은 아래로 파고들어요', { bg: 'rgba(29,78,216,.9)', color: '#fff', border: null, size: 13.5 });
      ctx.save(); ctx.globalAlpha = a; pill(TB.mid + 70, TB.y0 + 50, '가벼운 따뜻한 물은 위로 올라타요', { bg: 'rgba(194,65,12,.9)', color: '#fff', border: null, size: 13.5 }); ctx.restore();
    }
    if (rel && t > 4.5) {
      const a = sstep(4.5, 5.5, t); ctx.save(); ctx.globalAlpha = a;
      pill(400, 478, '찬 공기 = 찬물처럼 무거워 아래로 · 따뜻한 공기 = 따뜻한 물처럼 가벼워 위로', { bg: 'rgba(15,23,42,.84)', color: '#fff', border: null, size: 14.5, pad: 14 });
      ctx.restore();
    }
    if (!k.released) pill(400, 478, '칸막이를 빼면 어떻게 될까요? 먼저 예상해 보세요.', { bg: 'rgba(15,23,42,.8)', color: '#fff', border: null, size: 14.5, pad: 14 });
    caption('찬물과 따뜻한 물 (염색)');
  }

  /* =========================================================
     장면 2-B: 한랭 전선 · 온난 전선 단면
     ========================================================= */
  const GY = 430, TOWN = 560, CT = 170;
  const FR = { cold: { s: 2.0, label: '한랭 전선', col: '#2563eb' }, warm: { s: 0.34, label: '온난 전선', col: '#dc2626' } };
  const frX = (pos) => lerp(40, 780, pos / 100);
  function frTown(type, fx) {                           // 우리 동네의 상태
    // 그림의 비 구역(한랭: 전선 −92 ~ +42 px, 온난: 전선 +6 ~ +250 px)과 같은 범위에서 날씨를 정해요
    if (type === 'cold') {
      const tmp = fx > TOWN ? 12 : 24;                                   // 지표 전선이 동네를 지나면 찬 공기
      if (fx > TOWN + 92) return { temp: 12, wx: '맑고 쌀쌀해요', icon: 'clear' };
      if (fx >= TOWN - 42) return { temp: tmp, wx: '소나기가 와요', icon: 'shower' };
      return { temp: 24, wx: fx > TOWN - 330 ? '구름이 늘어나요' : '맑고 따뜻해요', icon: fx > TOWN - 330 ? 'cloud' : 'clear' };
    }
    if (fx > TOWN) return { temp: 24, wx: '맑아지고 따뜻해요', icon: 'clear' };
    if (fx >= TOWN - 250) return { temp: 12, wx: '지속적인 비가 와요', icon: 'rain' };
    return { temp: 12, wx: fx > TOWN - 560 ? '구름이 늘어나요' : '맑고 쌀쌀해요', icon: fx > TOWN - 560 ? 'cloud' : 'clear' };
  }
  function frStep(dt) {
    const f = S.fr;
    if (f.play) { f.x = Math.min(100, f.x + dt * 9); f.xS = f.x; if (f.x >= 100) { f.play = false; $('#frontPlay').textContent = '▶ 자동으로 이동'; } const s = $('#sFront'); s.value = Math.round(f.x); frUI.refresh(); }
    else f.xS = approach(f.xS, f.x, dt, 7);
    const fx = frX(f.xS);
    const w = frTown(f.type, fx);
    f.tempS = approach(f.tempS, w.temp, dt, 1.4);
    if (f.x <= 45) f['armed_' + f.type] = true;
    if (f.type === 'cold' && f.armed_cold && f.x >= 81 && f.tempS <= 15) f.passedCold = true;
    if (f.type === 'warm' && f.armed_warm && f.x >= 81 && f.tempS >= 21) f.passedWarm = true;
    f.flash = Math.max(0, f.flash - dt * 3);
    if (f.type === 'cold' && fx > 120 && fx < 740 && Math.random() < dt * 0.6) f.flash = 1;
  }
  function lineXcold(y, fx) { return fx - (GY - y) / FR.cold.s; }
  function lineYwarm(x, fx) { return GY - (x - fx) * FR.warm.s; }
  function drawFront() {
    const f = S.fr, fx = frX(f.xS), type = f.type, cold = type === 'cold';
    // 하늘
    D.sky(0, 0, 800, GY, '#9ecbf2', '#e6f3fc');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 800, GY); ctx.clip();
    // 공기 덩어리 색
    const warmTint = ctx.createLinearGradient(0, 40, 0, GY); warmTint.addColorStop(0, 'rgba(255,170,90,0)'); warmTint.addColorStop(1, 'rgba(255,150,80,.30)');
    ctx.fillStyle = warmTint; ctx.fillRect(0, 0, 800, GY);
    ctx.beginPath();
    if (cold) { ctx.moveTo(-300, GY); ctx.lineTo(fx, GY); ctx.lineTo(lineXcold(CT, fx), CT); ctx.lineTo(-300, CT); }
    else { ctx.moveTo(fx, GY); ctx.lineTo(fx + (GY - CT) / FR.warm.s, CT); ctx.lineTo(1400, CT); ctx.lineTo(1400, GY); }
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, CT, 0, GY); cg.addColorStop(0, 'rgba(60,120,230,.30)'); cg.addColorStop(1, 'rgba(40,100,225,.5)');
    ctx.fillStyle = cg; ctx.fill();
    // 전선면
    ctx.strokeStyle = FR[type].col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx, GY);
    if (cold) ctx.lineTo(lineXcold(CT, fx), CT); else ctx.lineTo(fx + (GY - CT) / FR.warm.s, CT);
    ctx.stroke();
    // 구름과 비
    if (cold) drawColdClouds(fx); else drawWarmClouds(fx);
    // 공기의 움직임
    const pulse = RM ? 0 : (S.t * 40) % 40;
    if (cold) {
      D.arrow(fx - 210, 406, fx - 90, 406, { color: '#1d4ed8', width: 9, head: 24, alpha: 0.9 });
      pill(avoidTown(fx - 150), 380, '찬 공기가 파고들어요', { bg: 'rgba(29,78,216,.92)', color: '#fff', border: null, size: 13 });
      for (let i = 0; i < 3; i++) { const yy = 330 - i * 60; const x0 = lineXcold(yy, fx) + 10, off = ((S.t * 0.8 + i * 0.33) % 1) * 36; D.arrow(x0 + 8 + off * 0.4, yy + 10 - off * 0.9, x0 + 34 + off * 0.4, yy - 26 - off * 0.9, { color: '#ea580c', width: 5, head: 14, alpha: 0.8 }); }
    } else {
      D.arrow(fx - 230, 300, fx - 90, 252, { color: '#dc2626', width: 9, head: 24, alpha: 0.9 });
      pill(fx - 160, 232, '따뜻한 공기가 타고 올라가요', { bg: 'rgba(185,28,28,.92)', color: '#fff', border: null, size: 13 });
      for (let i = 0; i < 3; i++) { const xx = fx + 90 + i * 100, off = ((S.t * 0.7 + i * 0.33) % 1) * 40; const yy = lineYwarm(xx, fx); D.arrow(xx - 10 + off, yy - 14 - off * 0.35, xx + 26 + off, yy - 22 - off * 0.35, { color: '#ea580c', width: 4, head: 12, alpha: 0.7 }); }
    }
    ctx.restore();
    // 번개 번쩍임
    if (f.flash > 0.02 && cold) { ctx.fillStyle = 'rgba(255,255,255,' + 0.28 * f.flash + ')'; ctx.fillRect(0, 0, 800, GY); }
    // 땅
    D.ground(0, GY, 800, 110, { top: '#8fd18a', mid: '#6cbf6a', soil: '#c9a776', bottom: '#a8865a' });
    // 지표 전선 기호
    ctx.save(); ctx.translate(fx, GY + 1);
    ctx.fillStyle = FR[type].col;
    if (cold) { ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // 이동 방향
    const mx = clamp(fx, 90, 720);
    D.arrow(mx - 44, GY + 86, mx + 44, GY + 86, { color: FR[type].col, width: 5, head: 16 });
    D.text(mx, GY + 106, FR[type].label + ' 이동', { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(30,40,60,.6)', strokeWidth: 4 });
    drawTown(fx);
    // 이름표
    pill(400, 24, cold ? '한랭 전선: 찬 공기가 따뜻한 공기 아래로 파고들어요' : '온난 전선: 따뜻한 공기가 찬 공기 위로 타고 올라가요', { bg: 'rgba(15,23,42,.84)', color: '#fff', border: null, size: 14.5, pad: 14 });
  }
  function rainStreaks(x1, x2, yTop, n, len, speed, alpha, slant) {
    ctx.save(); ctx.strokeStyle = 'rgba(40,80,150,' + alpha + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const H = GY - yTop;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = x1 + ((i * 97.31) % Math.max(10, x2 - x1)), y = yTop + ((i * 53.17 + S.t * speed) % H);
      ctx.moveTo(x, y); ctx.lineTo(x - slant, y + len);
    }
    ctx.stroke(); ctx.restore();
  }
  function drawColdClouds(fx) {
    // 적운(작은 구름)은 앞쪽 따뜻한 공기 위에
    cloudPuffs(fx + 90, 296, 130, 34, '#ffffff', 0.9, 11); cloudPuffs(fx + 230, 262, 120, 30, '#ffffff', 0.85, 12); cloudPuffs(fx + 360, 300, 110, 28, '#ffffff', 0.8, 13);
    // 적란운: 전선을 따라 높이 솟아요
    const base = 330, top = 92;
    for (let y = base; y > top + 20; y -= 30) {
      const k = (base - y) / (base - top);
      const cx = lineXcold(y, fx) + 54 + k * 24, w = 150 + 40 * Math.sin(k * 3.1) - k * 20;
      const dark = mixc('#7b8696', '#ffffff', clamp(k * 1.2, 0, 1));
      cloudPuffs(cx - w / 2, y - 22, w, 52, dark, 1, 21 + y);
    }
    cloudPuffs(fx - 20, top - 10, 250, 54, '#f4f8ff', 1, 99);    // 모루 모양 꼭대기
    cloudPuffs(fx + 20, top + 26, 190, 40, '#e6ecf5', 0.95, 98);
    // 소나기
    rainStreaks(fx - 92, fx + 42, 332, 70, 15, 520, 0.7, 5);
    // 이름표
    pill(clamp(fx + 130, 120, 690), 70, '적란운 (적운형 구름)', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#94a3b8', size: 13.5 });
    // 강수 구역
    const x1 = fx - 92, x2 = fx + 42;
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, GY + 12); ctx.lineTo(x2, GY + 12); ctx.moveTo(x1, GY + 5); ctx.lineTo(x1, GY + 19); ctx.moveTo(x2, GY + 5); ctx.lineTo(x2, GY + 19); ctx.stroke();
    pill(avoidTown((x1 + x2) / 2), 344, '소나기 (좁은 지역)', { bg: '#1d4ed8', color: '#fff', border: null, size: 13 });
    // 번개
    if (S.fr.flash > 0.3) {
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(fx - 40, 330); ctx.lineTo(fx - 54, 366); ctx.lineTo(fx - 38, 368); ctx.lineTo(fx - 56, 424); ctx.stroke();
    }
    pill(clamp(lineXcold(250, fx) - 56, 100, 700), 250, '경사 급함', { bg: 'rgba(37,99,235,.92)', color: '#fff', border: null, size: 13 });
  }
  function drawWarmClouds(fx) {
    const sl = FR.warm.s;
    const strip = (xa, xb, off, th, col, a, seed) => {              // 전선면을 따라 놓이는 층운
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
      for (let x = xa; x <= xb; x += 10) { const y = lineYwarm(x, fx) - off; x === xa ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      for (let x = xb; x >= xa; x -= 10) { const y = lineYwarm(x, fx) - off - th + Math.sin(x * 0.07 + seed) * 4; ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    };
    // 권운 · 권층운 (높고 멀리)
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x0 = fx + 330 + i * 52, y0 = 92 + (i % 3) * 22; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 20, y0 - 12, x0 + 44, y0 + 4); ctx.stroke(); }
    ctx.restore();
    strip(fx + 300, 1000, 130 + 0, 40, '#ffffff', 0.5, 3);
    strip(fx + 120, fx + 330, 40, 38, '#c9d2de', 0.95, 2);     // 고층운
    strip(fx - 6, fx + 190, 10, 56, '#7b8696', 0.97, 1);       // 난층운
    // 비
    rainStreaks(fx + 6, fx + 250, 300, 60, 11, 300, 0.55, 3);
    // 이름표
    pill(clamp(fx + 100, 80, 700), clamp(lineYwarm(fx + 100, fx) - 92, 60, 360), '난층운 (층운형 구름)', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#94a3b8', size: 13.5 });
    pill(clamp(fx + 330, 120, 720), clamp(lineYwarm(fx + 330, fx) - 112, 60, 380), '고층운', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#94a3b8', size: 13.5 });
    pill(clamp(fx + 560, 140, 730), 70, '권운 · 권층운', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#94a3b8', size: 13.5 });
    const x1 = fx + 6, x2 = fx + 250;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, GY + 12); ctx.lineTo(x2, GY + 12); ctx.moveTo(x1, GY + 5); ctx.lineTo(x1, GY + 19); ctx.moveTo(x2, GY + 5); ctx.lineTo(x2, GY + 19); ctx.stroke();
    pill(avoidTown((x1 + x2) / 2), 344, '지속적인 비 (넓은 지역)', { bg: '#475569', color: '#fff', border: null, size: 13 });
    pill(avoidTown(fx - 80), 396, '경사 완만', { bg: 'rgba(220,38,38,.92)', color: '#fff', border: null, size: 13 });
  }
  const avoidTown = (cx) => { cx = clamp(cx, 110, 700); return Math.abs(cx - TOWN) < 120 ? (cx < TOWN ? TOWN - 130 : TOWN + 130) : cx; };
  function drawTown(fx) {
    const w = frTown(S.fr.type, fx), x = TOWN, y = GY;
    [[x - 44, '#f2b27a', 34], [x, '#9cc3ee', 40], [x + 44, '#f0d56a', 32]].forEach(([hx, col, ht]) => {
      D.shadow(() => { ctx.fillStyle = col; ctx.fillRect(hx - 17, y - ht, 34, ht); }, { blur: 4, y: 2 });
      ctx.fillStyle = '#b5483c'; ctx.beginPath(); ctx.moveTo(hx - 22, y - ht); ctx.lineTo(hx, y - ht - 18); ctx.lineTo(hx + 22, y - ht); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(hx - 5, y - ht + 9, 10, 10);
    });
    const tC = S.fr.tempS;
    D.arrow(x, y + 2, x, y + 26, { color: '#fff', width: 3, head: 9, alpha: 0.9 });
    pill(x, y + 38, '우리 동네 ' + tC.toFixed(0) + ' °C', { bg: '#1b2333', color: '#fff', border: null, size: 14, pad: 11 });
    pill(x, y + 62, w.wx, { bg: 'rgba(255,255,255,.96)', color: mixc('#1d4ed8', '#c2410c', clamp((tC - 12) / 12, 0, 1)), border: '#cbd5e1', size: 14, pad: 11 });
  }

  /* =========================================================
     장면 3: 고기압과 저기압 (공기 기둥 단면)
     ========================================================= */
  const COLX = { H: 200, L: 600 };
  function clInit() {
    S.cl.slots = [
      { id: 'Hv', x: 200, y: 150, r: 34, kind: 'v', opts: ['up', 'down'], ans: 'down', val: null, bad: 'wrong' },
      { id: 'Lv', x: 600, y: 150, r: 34, kind: 'v', opts: ['up', 'down'], ans: 'up', val: null },
      { id: 'Hh', x: 200, y: 440, r: 70, kind: 'h', opts: ['out', 'in'], ans: 'out', val: null },
      { id: 'Lh', x: 600, y: 440, r: 70, kind: 'h', opts: ['out', 'in'], ans: 'in', val: null },
    ];
  }
  clInit();
  const clSlot = (id) => S.cl.slots.find((s) => s.id === id);
  function clTap(p) {
    for (const sl of S.cl.slots) {
      if (Math.hypot(p.x - sl.x, p.y - sl.y) < sl.r + (sl.kind === 'v' ? 8 : 0)) {
        sl.val = sl.val == null ? sl.opts[0] : sl.val === sl.opts[0] ? sl.opts[1] : sl.opts[0];
        sl.pop = 1; Sound.tick();
        return true;
      }
    }
    return false;
  }
  function clStep(dt) {
    const c = S.cl;
    c.wxH = approach(c.wxH, clSlot0('Hv') === 'down' ? 1 : 0, dt, 1.6);
    c.wxL = approach(c.wxL, clSlot0('Lv') === 'up' ? 1 : 0, dt, 0.9);
    c.slots.forEach((s) => { s.pop = approach(s.pop || 0, 0, dt, 6); });
  }
  const clSlot0 = (id) => clSlot(id).val;
  function drawColumn() {
    // 하늘 · 땅 · 위에서 본 그림 칸
    D.sky(0, 0, 800, 336, '#a7d0f4', '#e7f3fc');
    const c = S.cl;
    // 맑은 하늘 (고기압) / 구름 (저기압)
    if (c.wxH > 0.02) { ctx.save(); ctx.globalAlpha = c.wxH; D.glow(54, 84, 70, '#ffd45e', 0.6); D.sphere(54, 84, 24, '#ffc933', { gloss: false }); ctx.restore(); }
    // 하늘이 점점 파랗게
    if (c.wxL > 0.02) {
      ctx.save(); ctx.globalAlpha = Math.min(1, c.wxL * 1.2);
      const base = lerp(280, 250, c.wxL), topY = lerp(250, 70, c.wxL);
      for (let y = base; y > topY; y -= 26) { const k = (base - y) / Math.max(10, base - topY); cloudPuffs(520, y - 20, 160, 48, mixc('#7b8696', '#f5f8fc', clamp(k * 1.3, 0, 1)), 1, 40 + y); }
      cloudPuffs(500, topY - 14, 200, 52, '#eef3fa', 1, 77);
      ctx.restore();
      if (c.wxL > 0.6) rainStreaks(530, 670, 285, 40, 12, 380, 0.55 * (c.wxL - 0.6) / 0.4, 3);
    }
    // 땅
    D.ground(0, 336, 800, 22, { top: '#8fd18a', mid: '#6cbf6a', soil: '#8a6a45', bottom: '#8a6a45' });
    ctx.fillStyle = '#e6eef7'; ctx.fillRect(0, 358, 800, 182);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, 358, 800, 3);
    // 기둥 윤곽
    [['H', COLX.H, '#2563eb', '고기압 (H)', '주변보다 기압이 높아요'], ['L', COLX.L, '#dc2626', '저기압 (L)', '주변보다 기압이 낮아요']].forEach(([k, x, col, name, sub]) => {
      ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.t * 10; ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = 3;
      D.roundRect(x - 92, 40, 184, 292, 20); ctx.stroke(); ctx.restore();
      ctx.fillStyle = rgba(col, 0.07); D.roundRect(x - 92, 40, 184, 292, 20); ctx.fill();
      D.sphere(x - 62, 62, 20, col, { text: k, shadow: true });
      D.text(x - 36, 60, name, { size: 15, weight: 800, color: col, align: 'left' });
      D.text(x - 36, 78, sub, { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    });
    // 지상 바람 (고기압 → 저기압)
    D.arrow(312, 322, 488, 322, { color: '#334155', width: 6, head: 18 });
    pill(400, 296, '지상 바람: 고기압 → 저기압', { bg: 'rgba(30,41,59,.88)', color: '#fff', border: null, size: 13.5 });
    // 공기 흐름 칸
    c.slots.filter((s) => s.kind === 'v').forEach((sl) => {
      const col = sl.id === 'Hv' ? '#2563eb' : '#dc2626';
      // 움직이는 화살표
      if (sl.val) {
        const dir = sl.val === 'up' ? -1 : 1;
        for (let i = 0; i < 3; i++) {
          const ph = RM ? i / 3 : (S.t * 0.55 + i / 3) % 1;
          const yy = 110 + ph * 150;
          const al = Math.sin(Math.PI * ph);
          const xx = sl.x + (i - 1) * 54;
          D.arrow(xx, yy + (dir > 0 ? -16 : 16), xx, yy + (dir > 0 ? 16 : -16), { color: '#475569', width: 6, head: 16, alpha: al * 0.9 });
        }
      }
      const sc = 1 + 0.2 * (sl.pop || 0);
      ctx.save(); ctx.translate(sl.x, sl.y); ctx.scale(sc, sc);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, sl.r, 0, TAU); ctx.fill(); }, { blur: 10, y: 3 });
      ctx.lineWidth = 4; ctx.strokeStyle = wrongShown && sl.val && sl.val !== sl.ans ? '#ef4444' : sl.val ? col : '#94a3b8';
      ctx.beginPath(); ctx.arc(0, 0, sl.r, 0, TAU); ctx.stroke();
      if (!sl.val) { D.text(0, 11, '?', { size: 32, weight: 800, color: '#64748b' }); ctx.restore(); D.ring(sl.x, sl.y, sl.r, S.t, { color: '#0ea5e9', width: 2 }); }
      else { D.text(0, 13, sl.val === 'up' ? '↑' : '↓', { size: 38, weight: 800, color: col }); ctx.restore(); }
      pill(sl.x, sl.y + sl.r + 22, sl.val ? (sl.val === 'up' ? '공기가 올라가요' : '공기가 내려와요') : '공기의 움직임은?', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#cbd5e1', size: 13 });
    });
    // 위에서 본 지상 바람
    D.text(400, 378, '위에서 본 지상 바람', { size: 15, weight: 800, color: '#334155' });
    c.slots.filter((s) => s.kind === 'h').forEach((sl) => {
      const isH = sl.id === 'Hh', col = isH ? '#2563eb' : '#dc2626';
      ctx.save(); ctx.translate(sl.x, sl.y);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, sl.r, 0, TAU); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, sl.r, 0, TAU); ctx.clip();
      [60, 42, 26].forEach((r2) => { ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke(); });
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = wrongShown && sl.val && sl.val !== sl.ans ? '#ef4444' : sl.val ? col : '#94a3b8'; ctx.beginPath(); ctx.arc(0, 0, sl.r, 0, TAU); ctx.stroke();
      D.sphere(0, 0, 15, col, { text: isH ? 'H' : 'L', shadow: false });
      if (sl.val) {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + 0.2, ph = RM ? 0.5 : (S.t * 0.7 + (i % 2) * 0.5) % 1;
          const out = sl.val === 'out';
          const r0 = out ? 24 + ph * 26 : 60 - ph * 26, r1 = out ? r0 + 14 : r0 - 14;
          D.arrow(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, { color: '#334155', width: 4, head: 11, alpha: Math.sin(Math.PI * ph) * 0.95 });
        }
      } else { D.text(0, 50, '?', { size: 26, weight: 800, color: '#64748b' }); }
      ctx.restore();
      if (!sl.val) D.ring(sl.x, sl.y, sl.r, S.t, { color: '#0ea5e9', width: 2 });
      pill(sl.x, sl.y + sl.r + 16, sl.val ? (sl.val === 'out' ? '바람이 불어 나가요' : '바람이 불어 들어와요') : '바람의 방향은?', { bg: 'rgba(255,255,255,.95)', color: '#1b2333', border: '#cbd5e1', size: 13 });
    });
    if (c.wxH > 0.7) pill(200, 268, '맑아요 (구름이 사라져요)', { bg: 'rgba(255,255,255,.95)', color: '#b45309', border: '#fcd34d', size: 13 });
    if (c.wxL > 0.7) pill(600, 258, '구름이 생기고 비가 와요', { bg: 'rgba(255,255,255,.95)', color: '#475569', border: '#94a3b8', size: 13 });
  }

  /* =========================================================
     장면 4: 예시 일기도 · 위성 · 레이더 (모두 예시 자료)
     ========================================================= */
  const gauss = (x, y, cx, cy, sg) => Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * sg * sg));
  const FIELD = {
    win: (x, y) => 1010 + 28 * gauss(x, y, 150, 175, 200) - 32 * gauss(x, y, 735, 235, 125),
    spr: (x, y) => 1012 - 24 * gauss(x, y, 430, 250, 120) + 12 * gauss(x, y, 90, 190, 170) + 14 * gauss(x, y, 740, 310, 150),
  };
  const CENT = { win: { H: [150, 175], L: [735, 235] }, spr: { L: [430, 250], H: [90, 190], H2: [740, 310] } };
  function isoPath(f) {
    const p = new Path2D(), st = 10, nx = 81, ny = 55;
    const grid = [];
    for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) row.push(f(i * st, j * st)); grid.push(row); }
    for (let L = 968; L <= 1048; L += 4) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const v00 = grid[j][i], v10 = grid[j][i + 1], v11 = grid[j + 1][i + 1], v01 = grid[j + 1][i];
        const idx = (v00 >= L ? 1 : 0) | (v10 >= L ? 2 : 0) | (v11 >= L ? 4 : 0) | (v01 >= L ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * st, y = j * st;
        const T = [x + st * (L - v00) / (v10 - v00), y], R = [x + st, y + st * (L - v10) / (v11 - v10)], B = [x + st * (L - v01) / (v11 - v01), y + st], Lf = [x, y + st * (L - v00) / (v01 - v00)];
        const seg = (a, b) => { p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); };
        switch (idx) {
          case 1: case 14: seg(Lf, T); break;
          case 2: case 13: seg(T, R); break;
          case 3: case 12: seg(Lf, R); break;
          case 4: case 11: seg(R, B); break;
          case 5: seg(Lf, T); seg(R, B); break;
          case 6: case 9: seg(T, B); break;
          case 7: case 8: seg(Lf, B); break;
          case 10: seg(T, R); seg(Lf, B); break;
        }
      }
    }
    return p;
  }
  const ISO = { win: isoPath(FIELD.win), spr: isoPath(FIELD.spr) };
  // 전선 (봄 예시)
  const bez = (pts, n) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, k = t * (pts.length - 1), i0 = Math.min(pts.length - 2, Math.floor(k)), u = k - i0;
      const a = pts[Math.max(0, i0 - 1)], b = pts[i0], c = pts[i0 + 1], d = pts[Math.min(pts.length - 1, i0 + 2)];
      const cr = (p0, p1, p2, p3) => 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
      out.push([cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1])]);
    }
    return out;
  };
  const COLD_FRONT = bez([[430, 250], [408, 298], [372, 346], [334, 396], [296, 450], [262, 506]], 40);
  const WARM_FRONT = bez([[430, 250], [492, 272], [552, 306], [612, 348], [676, 378], [748, 394]], 40);
  function polyLen(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
  const CF_L = polyLen(COLD_FRONT), WF_L = polyLen(WARM_FRONT);
  function ptAt(pts, L, d) {
    d = clamp(d, 0, L[L.length - 1] - 0.01);
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const u = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
    const a = pts[i - 1], b = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], ln = Math.hypot(dx, dy) || 1;
    return { x: a[0] + dx * u, y: a[1] + dy * u, tx: dx / ln, ty: dy / ln };
  }
  function strokePoly(pts) { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
  function drawFrontLine(pts, L, type, nsign, phase) {
    const col = type === 'cold' ? '#1d4ed8' : '#dc2626';
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 7; strokePoly(pts);
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; strokePoly(pts);
    const gap = 36, total = L[L.length - 1];
    for (let d = 14 + (phase % 1) * gap; d < total - 10; d += gap) {
      const q = ptAt(pts, L, d), nx = -q.ty * nsign, ny = q.tx * nsign;
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (type === 'cold') { ctx.moveTo(q.x - q.tx * 9, q.y - q.ty * 9); ctx.lineTo(q.x + q.tx * 9, q.y + q.ty * 9); ctx.lineTo(q.x + nx * 15, q.y + ny * 15); }
      else { ctx.arc(q.x, q.y, 9, Math.atan2(ny, nx) - Math.PI / 2, Math.atan2(ny, nx) + Math.PI / 2, false); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // 구름(위성)·강수(레이더) 영상: 한 번만 그려 두고 복사해요
  function mkLayer(draw) { const c = document.createElement('canvas'); c.width = 800; c.height = 540; const x = c.getContext('2d'); draw(x); return c; }
  function blob(x, px, py, r, col, a) { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.6, rgba(col, a * 0.55)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
  function buildLayers() {
    const sat = {}, rad = {};
    sat.win = mkLayer((x) => {
      const r = rnd(31);
      for (let i = 0; i < 300; i++) { const a = i * 0.13, rr = 14 + i * 0.5; blob(x, 735 + Math.cos(a) * rr, 235 + Math.sin(a) * rr * 0.85, 16 + r() * 16, '#ffffff', 0.3); }
      for (let i = 0; i < 70; i++) blob(x, 640 + r() * 160, 90 + r() * 280, 22 + r() * 24, '#ffffff', 0.18);
      for (let s = 0; s < 11; s++) { const x0 = 330 + s * 14 + r() * 20, y0 = 190 + s * 18 + r() * 14; for (let i = 0; i < 12; i++) blob(x, x0 + i * 14, y0 + i * 9, 10 + r() * 8, '#ffffff', 0.34); }
      for (let i = 0; i < 20; i++) blob(x, 560 + r() * 120, 330 + r() * 120, 12 + r() * 12, '#ffffff', 0.12);
    });
    sat.spr = mkLayer((x) => {
      const r = rnd(47);
      for (let i = 0; i < 260; i++) { const a = i * 0.14 + 1, rr = 10 + i * 0.42; blob(x, 430 + Math.cos(a) * rr, 250 + Math.sin(a) * rr * 0.85, 15 + r() * 14, '#ffffff', 0.3); }
      for (let i = 0; i < 90; i++) { const q = ptAt(COLD_FRONT, CF_L, r() * CF_L[CF_L.length - 1]); blob(x, q.x - 12 + (r() - 0.5) * 36, q.y + (r() - 0.5) * 36, 12 + r() * 14, '#ffffff', 0.4); }
      for (let i = 0; i < 160; i++) { const q = ptAt(WARM_FRONT, WF_L, r() * WF_L[WF_L.length - 1]); blob(x, q.x + (r() - 0.5) * 70, q.y - 20 - r() * 90, 22 + r() * 20, '#ffffff', 0.22); }
      for (let i = 0; i < 30; i++) blob(x, 40 + r() * 330, 330 + r() * 180, 10 + r() * 10, '#ffffff', 0.1);
    });
    rad.win = mkLayer((x) => {
      const r = rnd(61);
      for (let s = 0; s < 11; s++) { const x0 = 330 + s * 14 + r() * 20, y0 = 190 + s * 18 + r() * 14; for (let i = 0; i < 12; i++) blob(x, x0 + i * 14, y0 + i * 9, 9 + r() * 8, r() < 0.3 ? '#34d399' : '#9bd8ff', 0.55); }
      for (let i = 0; i < 110; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 120; blob(x, 735 + Math.cos(a) * rr, 235 + Math.sin(a) * rr * 0.8, 12 + r() * 14, r() < 0.2 ? '#22c55e' : '#9bd8ff', 0.4); }
    });
    rad.spr = mkLayer((x) => {
      const r = rnd(73);
      for (let i = 0; i < 150; i++) { const q = ptAt(WARM_FRONT, WF_L, r() * WF_L[WF_L.length - 1]); blob(x, q.x + (r() - 0.5) * 50, q.y - 15 - r() * 70, 18 + r() * 16, r() < 0.3 ? '#22c55e' : '#86efac', 0.42); }
      for (let i = 0; i < 90; i++) { const q = ptAt(COLD_FRONT, CF_L, r() * CF_L[CF_L.length - 1]); const px = q.x - 6 + (r() - 0.5) * 26, py = q.y + (r() - 0.5) * 26; blob(x, px, py, 14 + r() * 8, '#22c55e', 0.55); blob(x, px, py, 9 + r() * 6, r() < 0.5 ? '#facc15' : '#fb923c', 0.7); if (r() < 0.3) blob(x, px, py, 5, '#ef4444', 0.9); }
      for (let i = 0; i < 40; i++) blob(x, 395 + r() * 60, 230 + r() * 50, 12 + r() * 10, '#22c55e', 0.4);
    });
    return { sat, rad };
  }
  const LAYERS = buildLayers();
  function wmStep(dt) {
    const w = S.wm;
    ['chart', 'sat', 'radar'].forEach((k) => { w.layerA[k] = approach(w.layerA[k], w.layer === k ? 1 : 0, dt, 7); });
    w.phase += dt * 0.35;
    if (w.layer === 'sat') w.seenSat = true;
    if (w.layer === 'radar') w.seenRadar = true;
  }
  const WPTS = { win: ['A', 'B', 'C'], spr: ['A', 'B', 'C'] };
  function drawWmap() {
    const w = S.wm, mp = w.map, la = w.layerA;
    const mode = la.sat > 0.5 ? 'sat' : la.radar > 0.5 ? 'radar' : 'chart';
    drawMapBase(mode, { o0: '#5ba7e4', o1: '#3a82c6', land: '#e4ecd9' });
    // 위성·레이더 영상
    if (la.sat > 0.02) { ctx.save(); ctx.globalAlpha = la.sat; ctx.drawImage(LAYERS.sat[mp], Math.sin(S.t * 0.25) * 3, 0); ctx.restore(); }
    if (la.radar > 0.02) { ctx.save(); ctx.globalAlpha = la.radar; ctx.drawImage(LAYERS.rad[mp], 0, 0); ctx.restore(); }
    // 일기도: 등압선 · 바람 · 전선
    if (la.chart > 0.02) {
      ctx.save(); ctx.globalAlpha = la.chart;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8; ctx.stroke(ISO[mp]);
      // 바람 화살표: 기압이 높은 곳 → 낮은 곳 (등압선 간격이 좁을수록 길고 굵게)
      const f = FIELD[mp];
      for (let gy = 70; gy < 440; gy += 90) for (let gx = 55; gx < 780; gx += 100) {
        const dx = (f(gx + 4, gy) - f(gx - 4, gy)) / 8, dy = (f(gx, gy + 4) - f(gx, gy - 4)) / 8, g = Math.hypot(dx, dy);
        if (g < 0.06) continue;
        const L = clamp(g * 360, 12, 54), ux = -dx / g, uy = -dy / g;
        D.arrow(gx - ux * L / 2, gy - uy * L / 2, gx + ux * L / 2, gy + uy * L / 2, { color: 'rgba(15,23,42,.8)', width: 2 + clamp(g * 8, 0, 3), head: 9 + clamp(g * 18, 0, 6), alpha: 0.9 });
      }
      // H / L
      const cs = CENT[mp];
      const mark = (pos, txt, col, dy) => {                     // dy: 지점 표시(A·B·C)에 가리지 않게 위로 올려요
        const v = Math.round(FIELD[mp](pos[0], pos[1])), o = dy || 0;
        D.text(pos[0], pos[1] + 12 + o, txt, { size: 40, weight: 800, color: col, stroke: '#fff', strokeWidth: 6 });
        D.text(pos[0], pos[1] + 32 + o, String(v), { size: 13.5, weight: 800, color: col, stroke: '#fff', strokeWidth: 4 });
      };
      if (mp === 'win') { mark(cs.H, '고', '#1d4ed8', -64); mark(cs.L, '저', '#dc2626', -64); }
      else { mark(cs.L, '저', '#dc2626'); mark(cs.H, '고', '#1d4ed8'); mark(cs.H2, '고', '#1d4ed8'); drawFrontLine(COLD_FRONT, CF_L, 'cold', -1, w.phase); drawFrontLine(WARM_FRONT, WF_L, 'warm', -1, w.phase); }
      ctx.restore();
    }
    labelText(40, 520, 'N', 14);
    // 지점 A · B · C
    const set = SETS[mp];
    set.targets.forEach((t, i) => {
      const occ = set.cards.find((c) => c.slot === i);
      D.sphere(t.x, t.y, 17, '#1b2333', { text: t.label, shadow: true, outline: '#fff', outlineWidth: 3 });
      if (!occ) D.ring(t.x, t.y, 24, S.t + i * 0.3, { color: '#fbbf24', width: 3 });
    });
    // 이름표
    const title = (mp === 'win' ? '겨울' : '봄') + ' 예시 ' + (w.layer === 'chart' ? '일기도' : w.layer === 'sat' ? '위성 영상' : '레이더 영상');
    pill(16, 30, title, { bg: 'rgba(30,41,59,.86)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' });
    pill(784, 30, '예시 자료', { bg: '#f59e0b', color: '#fff', border: null, size: 14, pad: 12, align: 'right' });
    if (w.layer === 'sat') pill(400, 78, '하얀 곳 = 구름이 많은 곳', { bg: 'rgba(15,23,42,.8)', color: '#fff', border: null, size: 13.5 });
    if (w.layer === 'radar') pill(400, 78, '초록 → 노랑 → 빨강 = 비가 강한 곳', { bg: 'rgba(15,23,42,.8)', color: '#fff', border: null, size: 13.5 });
    if (w.layer === 'chart' && mp === 'spr') { pill(262, 424, '한랭 전선', { bg: '#1d4ed8', color: '#fff', border: null, size: 13 }); pill(640, 408, '온난 전선', { bg: '#dc2626', color: '#fff', border: null, size: 13 }); }
    drawCards(set);
  }

  /* =========================================================
     장면 전환 · 갱신 · 그리기
     ========================================================= */
  const DRAW = { mass: drawMass, tank: drawTank, front: drawFront, column: drawColumn, wmap: drawWmap };
  const snap = document.createElement('canvas');
  function setScene(id) {
    if (id === S.scene) return;
    try { snap.width = view.canvas.width; snap.height = view.canvas.height; snap.getContext('2d').drawImage(view.canvas, 0, 0); S.hasSnap = true; } catch (e) { S.hasSnap = false; }
    S.prev = S.scene; S.scene = id; S.tr = 0;
    SciSim.tween(S, { tr: 1 }, { duration: 0.45, ease: 'outCubic' });
    afterScene();
  }
  const PANELS = { mass: ['cMassCards', 'cMassSeason'], tank: ['cTank'], front: ['cFront'], column: ['cColumn'], wmap: ['cMap'] };
  const HINT = {
    mass: '🃏 카드를 끌어서 점선 동그라미에 놓아 보세요',
    tank: '🧹 칸막이를 빼고 찬물의 움직임을 지켜보세요',
    front: '➡️ 전선을 오른쪽으로 이동시켜 우리 동네를 지나가게 해 보세요',
    column: '👆 ? 칸을 눌러 공기의 방향을 골라 보세요',
    wmap: '🔎 기상청 날씨누리에서 오늘의 일기도를 확인해 보세요',
  };
  function afterScene() {
    const all = Object.keys(PANELS).reduce((a, k) => a.concat(PANELS[k]), []);
    const free = game && game.free, rev = S.mass.revealAll || free;
    all.forEach((id) => {
      let off = PANELS[S.scene].indexOf(id) < 0;
      if (!off && S.scene === 'mass') off = id === 'cMassCards' ? rev : !rev;
      $('#' + id).classList.toggle('is-off', off);
    });
    showHint(HINT[S.scene], S.scene === 'wmap' ? 0 : 6000);
    renderSeg();
  }
  let segKey = '';
  function renderSeg() {
    const lvl = game ? (game.free ? -1 : game.level) : 0;
    const list = SCENES.filter((s) => lvl < 0 || s.step === lvl);
    const key = lvl + '|' + S.scene;
    if (key === segKey) return;
    segKey = key;
    const box = $('#sceneSeg'); box.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.label;
      if (s.id === S.scene) b.className = 'on';
      b.addEventListener('click', () => { Sound.click(); setScene(s.id); });
      box.appendChild(b);
    });
  }
  let revKey = '';
  function syncMassPanel() {
    const free = game && game.free, rev = !!(S.mass.revealAll || free);
    const key = rev + '|' + S.scene;
    if (key === revKey) return; revKey = key;
    if (S.scene === 'mass') { $('#cMassCards').classList.toggle('is-off', rev); $('#cMassSeason').classList.toggle('is-off', !rev); }
  }
  const marks = [];
  function addMark(x, y) { marks.push({ x, y, t: 0 }); fx.burst(x, y, { count: 22, speed: 190 }); Sound.tick(); }
  let bgT = 0;
  function wrapBG() {
    let top = '#58a4e2', bot = '#3a82c6';
    if (S.scene === 'tank') { top = '#eef6fc'; bot = '#d6bf96'; }
    else if (S.scene === 'front') { top = '#9ecbf2'; bot = '#a8865a'; }
    else if (S.scene === 'column') { top = '#a7d0f4'; bot = '#e6eef7'; }
    else if (S.scene === 'wmap') { const m = S.wm.layer; if (m === 'sat') { top = '#16304f'; bot = '#1e4570'; } else if (m === 'radar') { top = '#16222f'; bot = '#1b2c3d'; } }
    view.wrap.style.setProperty('--stage-bg', 'linear-gradient(to bottom,' + top + ' 0%,' + top + ' 50%,' + bot + ' 50%,' + bot + ' 100%)');
  }
  function draw() {
    if (S.t - bgT > 0.15) { bgT = S.t; wrapBG(); }
    view.clear('#eaf4fb');
    DRAW[S.scene]();
    if (S.tr < 1 && S.hasSnap) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - S.tr; ctx.drawImage(snap, 0, 0, view.canvas.width, view.canvas.height); ctx.restore(); }
    fx.draw(ctx);
    marks.forEach((mk) => { const p = Math.min(1, mk.t / 0.4); const sc = SciSim.ease.outBack(Math.min(1, mk.t / 0.35)); ctx.save(); ctx.globalAlpha = 1 - sstep(1.2, 1.8, mk.t); D.check(mk.x, mk.y - 6, 22 * sc, p); ctx.restore(); });
  }
  let wrongPoll = 0, celebrated = null;
  function step(dt) {
    S.t += dt;
    fx.update(dt);
    marks.forEach((m) => { m.t += dt; }); while (marks.length && marks[0].t > 1.8) marks.shift();
    S.t - wrongPoll > 0.25 && (wrongPoll = S.t, wrongShown = !!document.querySelector('.mission-feedback.bad'));
    S.mass.revealAll && syncMassPanel();
    if (S.scene === 'mass') massStep(dt);
    else if (S.scene === 'tank') tkStep(dt);
    else if (S.scene === 'front') frStep(dt);
    else if (S.scene === 'column') clStep(dt);
    else if (S.scene === 'wmap') wmStep(dt);
    // 카드·칸 맞히기 미션을 성공했을 때 보여 주는 효과
    const m = game && game.current();
    if (m && m.manual && game.phase === 'success' && celebrated !== m) {
      celebrated = m;
      if (m.id === 'cards') { S.mass.revealAll = true; SETS.mass.cards.forEach((c) => { const t = SETS.mass.targets[c.slot]; if (t) addMark(t.x, t.y - 4); }); syncMassPanel(); }
      else if (m.id === 'winmap' || m.id === 'sprmap') { const set = SETS[m.id === 'winmap' ? 'win' : 'spr']; set.cards.forEach((c) => { const t = set.targets[c.slot]; if (t) addMark(t.x + t.cdx, t.y + t.cdy - 28); }); }
      else if (m.id === 'column') { addMark(200, 150); addMark(600, 150); }
    }
  }

  /* ---------- 측정창 ---------- */
  const roC = {};
  function setRO(i, label, html) {
    if (roC['l' + i] !== label) { roC['l' + i] = label; $('#rl' + i).textContent = label; }
    if (roC['v' + i] !== html) { roC['v' + i] = html; $('#rv' + i).innerHTML = html; }
  }
  let lastUI = 0;
  function readouts(t) {
    if (t - lastUI < 0.1) return; lastUI = t;
    switch (S.scene) {
      case 'mass': {
        const st = setStatus(SETS.mass), m = S.mass, sea = m.season && SEASONS[m.season];
        if (m.revealAll || (game && game.free)) {
          setRO(1, '계절', sea ? sea.name : '골라 보세요');
          const k = sea ? sea.inf.indexOf(Math.max.apply(null, sea.inf)) : -1;
          setRO(2, '우리나라에 영향을 주는 기단', sea ? (m.season === 'ear' ? '오호츠크+북태평양' : AIR[k].short) : '-');
          setRO(3, '기단의 성질', sea ? (m.season === 'ear' ? '한랭·고온 다습' : AIR[k].prop) : '-');
        } else {
          setRO(1, '놓은 카드', st.placed + '<small> / 4장</small>');
          setRO(2, '기단이란?', '발원지를 닮아요');
          setRO(3, '단서', '대륙·바다·남북');
        }
        break;
      }
      case 'tank': {
        const k = S.tk, rel = k.released && k.open > 0.55;
        setRO(1, '칸막이', k.open < 0.1 ? '닫혀 있어요' : rel ? '열었어요' : '여는 중');
        setRO(2, '찬물이 움직이는 곳', rel ? '아래 (바닥)' : '-');
        setRO(3, '따뜻한 물이 움직이는 곳', rel ? '위 (물 표면)' : '-');
        break;
      }
      case 'front': {
        const f = S.fr, w = frTown(f.type, frX(f.xS));
        setRO(1, '전선', FR[f.type].label);
        setRO(2, '우리 동네 기온', f.tempS.toFixed(0) + '<small>°C</small>');
        setRO(3, '우리 동네 날씨', w.wx);
        break;
      }
      case 'column': {
        const n = S.cl.slots.filter((s) => s.val).length, ok = S.cl.slots.filter((s) => s.val === s.ans).length;
        setRO(1, '고기압 쪽 공기', clSlot('Hv').val ? (clSlot('Hv').val === 'up' ? '올라가요' : '내려와요') : '?');
        setRO(2, '저기압 쪽 공기', clSlot('Lv').val ? (clSlot('Lv').val === 'up' ? '올라가요' : '내려와요') : '?');
        setRO(3, '고른 칸 / 맞은 칸', n + ' / ' + ok);
        break;
      }
      case 'wmap': {
        const set = SETS[S.wm.map], st = setStatus(set);
        setRO(1, '일기도', S.wm.map === 'win' ? '겨울 예시' : '봄 예시');
        setRO(2, '보는 자료', S.wm.layer === 'chart' ? '일기도' : S.wm.layer === 'sat' ? '위성 영상' : '레이더 영상');
        setRO(3, '놓은 카드', st.placed + '<small> / 3장</small>');
        break;
      }
    }
  }

  /* ---------- 조작 ---------- */
  const frUI = SciSim.bindRange($('#sFront'), $('#oFront'), (v) => v + ' %', (v) => { S.fr.x = v; S.fr.play = false; $('#frontPlay').textContent = '▶ 자동으로 이동'; });
  function setSeason(key) {
    S.mass.season = key;
    $$('#seasonSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === key));
    $('#seasonNote').textContent = key ? SEASONS[key].note : '계절을 눌러 우리나라에 영향을 주는 기단을 확인해요.';
    Sound.tick();
  }
  $$('#seasonSeg button').forEach((b) => b.addEventListener('click', () => setSeason(b.dataset.s)));
  $('#seasonNote').textContent = '계절을 눌러 우리나라에 영향을 주는 기단을 확인해요.';
  function tankAction() {
    const k = S.tk; Sound.click();
    if (!k.released) { k.released = true; SciSim.tween(k, { open: 1 }, { duration: 0.9, ease: 'outCubic' }); }
    else { tkReset(); SciSim.tween(k, { open: 0 }, { duration: 0.01 }); }
    tankUI();
  }
  function tankUI() {
    const k = S.tk;
    $('#tankBtn').textContent = k.released ? '↺ 처음 상태로' : '🧹 칸막이 빼기';
    $('#tankBtn').classList.toggle('btn-primary', !k.released);
    $('#tankNote').textContent = k.released ? '찬물(파랑)은 아래로, 따뜻한 물(주황)은 위로 움직여요.' : '왼쪽은 따뜻한 물, 오른쪽은 찬물이에요.';
  }
  $('#tankBtn').addEventListener('click', tankAction);
  function setFrontType(type, keep) {
    S.fr.type = type;
    $$('#frontSeg button').forEach((b) => b.classList.toggle('on', b.dataset.f === type));
    if (!keep) { S.fr.x = 0; S.fr.xS = 0; S.fr.play = false; $('#sFront').value = 0; frUI.refresh(); $('#frontPlay').textContent = '▶ 자동으로 이동'; }
    S.fr.tempS = type === 'cold' ? 24 : 12;
  }
  $$('#frontSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setFrontType(b.dataset.f); }));
  $('#frontPlay').addEventListener('click', () => {
    Sound.click();
    if (S.fr.play) { S.fr.play = false; $('#frontPlay').textContent = '▶ 자동으로 이동'; return; }
    if (S.fr.x >= 100) { S.fr.x = 0; S.fr.xS = 0; }
    S.fr.play = true; $('#frontPlay').textContent = '⏸ 멈추기';
  });
  function setMap(id) {
    S.wm.map = id;
    $$('#mapSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === id));
  }
  function setLayer(l) {
    S.wm.layer = l;
    $$('#layerSeg button').forEach((b) => b.classList.toggle('on', b.dataset.l === l));
  }
  $$('#mapSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMap(b.dataset.m); }));
  $$('#layerSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setLayer(b.dataset.l); }));
  setMap('win'); setLayer('chart'); setFrontType('cold'); tankUI();
  function resetScene() {
    Sound.click();
    switch (S.scene) {
      case 'mass': resetSet(SETS.mass); if (!(game && game.free)) S.mass.revealAll = false; setSeason(null); syncMassPanel(); revKey = ''; syncMassPanel(); break;
      case 'tank': tkReset(); tankUI(); break;
      case 'front': setFrontType(S.fr.type); break;
      case 'column': clInit(); break;
      case 'wmap': resetSet(SETS[S.wm.map]); break;
    }
  }
  $('#resetBtn').addEventListener('click', resetScene);

  const massLocked = () => !!(S.mass.revealAll || (game && game.free));
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'mass') return massLocked() ? false : cardDown(SETS.mass, p);
      if (S.scene === 'wmap') return cardDown(SETS[S.wm.map], p);
      if (S.scene === 'column') { clTap(p); return false; }
      return false;
    },
    move(p) { const set = setFor(S.scene); if (set) cardMove(set, p); },
    up() { const set = setFor(S.scene); if (set) cardUp(set); },
    hover(p) {
      const set = setFor(S.scene);
      if (set && !(S.scene === 'mass' && massLocked()) && cardHit(set, p)) return 'grab';
      if (S.scene === 'column' && S.cl.slots.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < s.r)) return 'pointer';
      return 'default';
    },
  });

  /* =========================================================
     퀴즈·정리 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {
    fronts: '<svg viewBox="0 0 330 150" width="330" height="150" role="img" aria-label="한랭 전선과 온난 전선의 단면"><rect width="330" height="150" fill="#eaf4fc" rx="10"/>' +
      '<path d="M8 120 H92 L60 52 H8Z" fill="#bcd4f8"/><path d="M92 120 L60 52" stroke="#2563eb" stroke-width="4"/>' +
      '<g fill="#fff" stroke="#9aa7b8" stroke-width="2"><circle cx="82" cy="46" r="15"/><circle cx="98" cy="64" r="16"/><circle cx="84" cy="84" r="14"/><circle cx="104" cy="40" r="13"/></g>' +
      '<g stroke="#2563eb" stroke-width="2.2" stroke-linecap="round"><path d="M66 100l-3 12M74 100l-3 12M82 100l-3 12M90 100l-3 12M98 100l-3 12"/></g>' +
      '<rect x="4" y="120" width="158" height="26" fill="#9bd08a"/><path d="M92 120 L104 120 L98 106Z" fill="#2563eb"/>' +
      '<text x="84" y="16" text-anchor="middle" font-size="13" font-weight="800" fill="#1d4ed8">한랭 전선</text><text x="118" y="140" text-anchor="middle" font-size="11" font-weight="800" fill="#1e3a8a">좁은 지역 소나기</text>' +
      '<path d="M178 120 H324 V70 Z" fill="#bcd4f8"/><path d="M178 120 L324 70" stroke="#dc2626" stroke-width="4"/>' +
      '<path d="M182 112 L322 62 L322 44 L186 94Z" fill="#8a94a4" opacity=".9"/><path d="M250 80 L322 54 L322 36 L255 62Z" fill="#c7d0dc"/>' +
      '<g stroke="#475569" stroke-width="2" stroke-linecap="round"><path d="M190 112l-3 10M202 108l-3 14M214 104l-3 18M226 100l-3 22M238 96l-3 26M250 92l-3 30"/></g>' +
      '<rect x="168" y="120" width="158" height="26" fill="#9bd08a"/><path d="M178 120 a8 8 0 0 1 16 0z" fill="#dc2626"/>' +
      '<text x="246" y="16" text-anchor="middle" font-size="13" font-weight="800" fill="#b91c1c">온난 전선</text><text x="246" y="140" text-anchor="middle" font-size="11" font-weight="800" fill="#334155">넓은 지역 지속적인 비</text></svg>',
    hl: '<svg viewBox="0 0 320 130" width="320" height="130" role="img" aria-label="고기압과 저기압"><rect width="320" height="130" fill="#eaf4fc" rx="10"/>' +
      '<rect x="14" y="16" width="136" height="100" rx="12" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="7 6"/><rect x="170" y="16" width="136" height="100" rx="12" fill="none" stroke="#dc2626" stroke-width="3" stroke-dasharray="7 6"/>' +
      '<text x="82" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="#1d4ed8">고기압 H</text><text x="238" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="#b91c1c">저기압 L</text>' +
      '<text x="82" y="94" text-anchor="middle" font-size="42" fill="#475569">?</text><text x="238" y="94" text-anchor="middle" font-size="42" fill="#475569">?</text>' +
      '<text x="160" y="124" text-anchor="middle" font-size="12" font-weight="800" fill="#334155">공기는 어느 방향으로 움직일까?</text></svg>',
    cold: '<svg viewBox="0 0 300 120" width="300" height="120" role="img" aria-label="한랭 전선이 우리 동네를 통과"><rect width="300" height="120" fill="#eaf4fc" rx="10"/>' +
      '<path d="M0 96 H150 L120 36 H0Z" fill="#bcd4f8"/><path d="M150 96 L120 36" stroke="#2563eb" stroke-width="4"/><rect y="96" width="300" height="24" fill="#9bd08a"/>' +
      '<text x="60" y="70" text-anchor="middle" font-size="14" font-weight="800" fill="#1d4ed8">찬 공기</text><text x="226" y="70" text-anchor="middle" font-size="14" font-weight="800" fill="#c2410c">따뜻한 공기</text>' +
      '<path d="M150 96 l12 0 l-6 -14z" fill="#2563eb"/><path d="M180 108 H250" stroke="#334155" stroke-width="3"/><text x="215" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">전선이 지나간 뒤 우리 동네는?</text></svg>',
  };
  const summaryFig = (svg) => '<div class="note-fig">' + svg + '</div>';

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  const TIPS = {
    sib: '대륙은 <b>건조</b>하고 북쪽은 <b>한랭</b>해요. 대륙의 북쪽은 어디일까요?',
    okh: '바다는 <b>다습</b>하고 북쪽은 <b>한랭</b>해요. 바다의 북쪽은 어디일까요?',
    pac: '바다는 <b>다습</b>하고 남쪽은 <b>온난</b>해요. 바다의 남쪽은 어디일까요?',
    yan: '대륙은 <b>건조</b>하고 남쪽은 <b>온난</b>해요. 대륙의 남쪽은 어디일까요?',
    sunny: '맑고 건조한 날씨는 공기가 내려오는 곳, 즉 <b>고기압</b> 중심에서 나타나요.',
    wind: '<b>등압선 간격이 좁은 곳</b>(기압 차가 큰 곳)에서 바람이 세게 불어요.',
    cloud: '구름과 눈·비는 공기가 올라가는 곳, 즉 <b>저기압</b> 중심에서 생겨요.',
    rain: '넓은 지역에 오래 내리는 지속적인 비는 <b>온난 전선 앞쪽</b>에서 내려요.',
    shower: '좁은 지역에 갑자기 쏟아지는 소나기와 천둥·번개는 <b>한랭 전선</b> 근처에서 나타나요.',
    clear: '<b>한랭 전선이 지나간 뒤</b>에는 찬 공기가 들어와 맑아지고 기온이 내려가요.',
  };
  function cardCheck(set, noun) {
    const st = setStatus(set);
    if (st.placed < st.total) return (st.total - st.placed) + '장이 남았어요. ' + noun + ' 카드를 모두 놓아 주세요.';
    if (st.wrong.length) return '「' + st.wrong[0].title.replace(/^[^가-힣\s]+\s/, '') + '」 카드를 놓은 곳을 다시 생각해 보세요. ' + (TIPS[st.wrong[0].id] || '');
    return true;
  }
  game = SciSim.game({
    simId: 'm3-fronts-weather',
    mount: '#game',
    badge: '날씨 해석가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      masscards: '🃏 기단 카드 · 📅 계절 버튼',
      tank: '🧊 칸막이 수조 모형',
      front: '⛅ 한랭·온난 전선 단면',
      column: '🌀 고기압·저기압 공기 기둥',
      wmap: '📋 예시 일기도 · 🛰️ 위성 · 📡 레이더',
    },
    onFeatures(set) { F = set; renderSeg(); },
    onMissionStart(m) { if (m.scene) setScene(m.scene); syncMassPanel(); },
    levels: [
      {
        title: '우리나라에 영향을 주는 기단', short: '기단', icon: '🗺️', phase: '관찰',
        features: ['masscards'],
        intro: '<p class="si-q">❓ 탐구 질문: 날씨는 왜 며칠 사이에 맑았다가 흐려지며 바뀔까?</p>' +
          '<p>우리나라 주변에는 성질이 서로 다른 <b>공기 덩어리</b>가 있어요. 넓은 지역에 오래 머물러 그 지역의 <b>기온과 습도를 닮은 공기 덩어리</b>를 <b>기단</b>이라고 해요. 기단 카드를 발원지에 놓고, 계절마다 어떤 기단이 영향을 주는지 살펴봐요.</p>',
        setup() { setScene('mass'); S.mass.revealAll = false; revKey = ''; resetSet(SETS.mass); setSeason(null); celebrated = null; afterScene(); syncMassPanel(); },
        recap: '기단은 <b>발원지의 성질</b>을 닮아요. 계절에 따라 우리나라에 영향을 주는 기단이 달라져요.',
        summary: '<p><b>기단</b>: 넓은 지역에 오래 머물러 그 지역의 기온·습도와 비슷한 성질을 갖게 된 큰 공기 덩어리. 대륙은 <b>건조</b>, 해양은 <b>다습</b>, 고위도는 <b>한랭</b>, 저위도는 <b>온난</b>하다.</p><ul>' +
          '<li><b>시베리아 기단</b> — 한랭 건조, 겨울</li><li><b>오호츠크해 기단</b> — 한랭 다습, 늦봄~초여름</li><li><b>북태평양 기단</b> — 고온 다습, 여름</li><li><b>양쯔강 기단</b> — 온난 건조, 봄·가을</li></ul>',
        missions: [
          {
            id: 'cards', title: '기단 카드를 발원지에 놓기', scene: 'mass', manual: true,
            goal: '카드 4장을 지도 위 <b>점선 동그라미</b> 네 곳에 알맞게 끌어다 놓고 <b>확인하기</b>를 누르세요.',
            hint: '대륙은 건조하고 바다는 습해요. 북쪽은 춥고, 남쪽은 따뜻해요.',
            setup() { S.mass.revealAll = false; revKey = ''; resetSet(SETS.mass); celebrated = null; syncMassPanel(); },
            check: () => cardCheck(SETS.mass, '기단'),
            explain: '기단은 <b>발원지의 성질</b>을 닮아요. 대륙에서 생기면 <b>건조</b>, 바다에서 생기면 <b>다습</b>하고, 북쪽(고위도)에서 생기면 <b>한랭</b>, 남쪽(저위도)에서 생기면 <b>온난</b>해요.',
          },
          {
            id: 'seasons', title: '계절마다 달라지는 기단', scene: 'mass',
            goal: '📅 <b>네 계절</b> 버튼을 모두 눌러 보고, 우리나라에 영향을 주는 기단이 어떻게 바뀌는지 살펴보세요.',
            hint: '계절 버튼을 하나씩 눌러 3초쯤 지켜보세요. 기단이 우리나라 쪽으로 다가와요.',
            setup() { S.mass.revealAll = true; revKey = ''; S.mass.seen = { win: 0, spr: 0, ear: 0, sum: 0 }; setSeason(null); syncMassPanel(); },
            check: () => ['win', 'spr', 'ear', 'sum'].every((k) => S.mass.seen[k] >= 1.5),
            status: () => ['win', 'spr', 'ear', 'sum'].map((k) => chk(S.mass.seen[k] >= 1.5, SEASONS[k].name)).join(' · '),
            hold: 0.3,
            explain: '<b>겨울</b>은 시베리아 기단(한랭 건조), <b>봄·가을</b>은 양쯔강 기단(온난 건조), <b>늦봄~초여름</b>은 오호츠크해 기단(한랭 다습)과 북태평양 기단이 만나고, <b>여름</b>은 북태평양 기단(고온 다습)의 영향을 받아요.',
          },
          {
            type: 'quiz', title: '여름철 우리나라의 기단', scene: 'mass',
            setup() { S.mass.revealAll = true; revKey = ''; S.mass.season = 'sum'; setSeason('sum'); syncMassPanel(); },
            goal: '여름철 우리나라를 무덥고 습하게 만드는 기단은?',
            choices: ['시베리아 기단', '북태평양 기단', '오호츠크해 기단', '양쯔강 기단'],
            answer: 1,
            feedback: ['시베리아 기단은 한랭 건조해서 겨울에 영향을 줘요.', '', '오호츠크해 기단은 선선하고 습해서 늦봄~초여름에 영향을 줘요.', '양쯔강 기단은 온난 건조해서 봄·가을에 영향을 줘요.'],
            explain: '여름에는 <b>북태평양 기단</b>(고온 다습)이 확장해 우리나라가 무덥고 습해요.',
          },
        ],
      },
      {
        title: '찬 공기와 따뜻한 공기가 만나면', short: '전선', icon: '🧊', phase: '모형',
        features: ['tank', 'front'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 성질이 서로 다른 기단이 우리나라 주변에 있다는 것을 알았어요.</div>' +
          '<p>찬 공기와 따뜻한 공기가 만나면 어떻게 될까요? 먼저 <b>찬물과 따뜻한 물</b>을 담은 수조 모형으로 알아보고, <b>전선</b>의 단면을 살펴봐요.</p>',
        setup() { setScene('tank'); tkReset(); tankUI(); setFrontType('cold'); afterScene(); },
        recap: '찬 공기는 따뜻한 공기 <b>아래로</b>, 따뜻한 공기는 찬 공기 <b>위로</b> 가요. 두 기단의 경계가 지표면과 만나는 선이 <b>전선</b>이에요.',
        summary: '<p><b>전선</b>: 성질이 다른 두 기단이 만나 생긴 경계면(전선면)이 지표면과 만나는 선. 찬 공기는 무거워 아래로, 따뜻한 공기는 가벼워 위로 간다.</p><ul>' +
          '<li><b>한랭 전선</b>: 찬 공기가 따뜻한 공기 <b>아래로 파고듦</b> · 전선면 기울기 <b>급함</b> · <b>적운형</b> 구름(적란운) · <b>좁은 지역</b>에 소나기·뇌우 · 통과 후 기온 <b>하강</b></li>' +
          '<li><b>온난 전선</b>: 따뜻한 공기가 찬 공기 <b>위로 타고 오름</b> · 기울기 <b>완만</b> · <b>층운형</b> 구름(난층운 등) · <b>넓은 지역</b>에 지속적인 비 · 통과 후 기온 <b>상승</b></li></ul>' + summaryFig(FIG.fronts),
        missions: [
          {
            id: 'tank', title: '칸막이를 빼 보자', scene: 'tank',
            goal: '🧹 칸막이를 빼고, 찬물과 따뜻한 물이 어떻게 움직이는지 <b>5초</b> 동안 지켜보세요.',
            hint: '[칸막이 빼기] 버튼을 누르고, 파란 찬물이 어디로 파고드는지 보세요.',
            setup() { tkReset(); tankUI(); },
            check: () => S.tk.released && S.tk.time >= 5,
            status: () => chk(S.tk.released, '칸막이 빼기') + ' · ' + chk(S.tk.time >= 5, '관찰 <b>' + Math.min(5, S.tk.time).toFixed(1) + '</b> / 5초'),
            hold: 0.4,
            explain: '찬물은 밀도가 커서 <b>아래로 가라앉으며 따뜻한 물 아래로 파고들고</b>, 따뜻한 물은 그 <b>위로 올라타요</b>. 공기도 같아요. 성질이 다른 두 기단이 만나면 섞이지 않고 경계면(전선면)이 생겨요.',
          },
          {
            id: 'fronts', title: '두 가지 전선 만들기', scene: 'front',
            goal: '⛅ <b>한랭 전선</b>과 <b>온난 전선</b>을 각각 왼쪽 끝에서 오른쪽 끝까지 이동시켜 우리 동네를 지나가게 하세요. 구름, 비, 기온을 비교해 봐요.',
            hint: '전선 종류를 고르고 [자동으로 이동]을 누르거나 슬라이더를 오른쪽으로 밀어요. 다른 전선은 종류를 바꿔서 다시 해요.',
            setup() { setFrontType('cold'); S.fr.passedCold = false; S.fr.passedWarm = false; S.fr.armed_cold = false; S.fr.armed_warm = false; },
            check: () => S.fr.passedCold && S.fr.passedWarm,
            status: () => chk(S.fr.passedCold, '한랭 전선 통과 (기온 ↓)') + ' · ' + chk(S.fr.passedWarm, '온난 전선 통과 (기온 ↑)'),
            hold: 0.4,
            explain: '<b>한랭 전선</b>은 기울기가 급해 적운형 구름이 높이 솟고 <b>좁은 지역</b>에 소나기가 내려요. 통과하면 기온이 <b>내려가요</b>. <b>온난 전선</b>은 기울기가 완만해 층운형 구름이 넓게 퍼지고 <b>넓은 지역</b>에 지속적인 비가 내려요. 통과하면 기온이 <b>올라가요</b>.',
          },
          {
            type: 'quiz', title: '소나기 vs 지속적인 비', scene: 'front', figure: FIG.fronts,
            goal: '<b>한랭 전선</b>이 통과할 때의 날씨로 옳은 것은?',
            choices: ['층운형 구름에서 넓은 지역에 오랫동안 비가 내린다', '적운형 구름에서 좁은 지역에 소나기가 내린다', '구름이 거의 없이 맑은 날씨가 계속된다', '전선이 지나간 뒤 기온이 올라간다'],
            answer: 1,
            feedback: ['그건 온난 전선의 특징이에요. 한랭 전선은 기울기가 급해요.', '', '전선이 지나갈 때는 구름이 많이 생겨요.', '한랭 전선이 지나가면 찬 공기가 들어와 기온이 내려가요.'],
            explain: '한랭 전선은 찬 공기가 따뜻한 공기를 급하게 밀어 올려 <b>적란운(적운형 구름)</b>이 생기고, <b>좁은 지역에 소나기</b>가 내려요. 통과 후에는 기온이 내려가요.',
          },
        ],
      },
      {
        title: '고기압과 저기압의 날씨', short: '고·저기압', icon: '🌀', phase: '설명',
        features: ['column'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전선 주변에서 구름이 생기고 비가 내리는 모습을 봤어요.</div>' +
          '<p>일기도에는 <b>고기압(H)</b>과 <b>저기압(L)</b>이 나타나요. 주변보다 기압이 높거나 낮은 곳에서는 공기가 어떻게 움직이고, 날씨는 어떻게 다를까요? 공기 기둥 단면으로 알아봐요.</p>',
        setup() { setScene('column'); clInit(); celebrated = null; afterScene(); },
        recap: '<b>고기압</b>은 공기가 내려오고 바람이 불어 나가 맑아요. <b>저기압</b>은 공기가 올라가고 바람이 불어 들어와 구름이 생겨요.',
        summary: '<ul><li><b>고기압</b>: 주변보다 기압이 높다. <b>하강 기류</b> → 구름이 사라져 <b>맑은 날씨</b>. 지상에서는 바람이 <b>불어 나간다</b>.</li>' +
          '<li><b>저기압</b>: 주변보다 기압이 낮다. <b>상승 기류</b> → 공기가 단열 팽창해 냉각 → 수증기가 응결해 <b>구름·비</b>. 지상에서는 바람이 <b>불어 들어온다</b>.</li></ul>' + summaryFig(FIG.hl),
        missions: [
          {
            id: 'column', title: '공기 흐름 화살표 맞히기', scene: 'column', manual: true,
            goal: '고기압(H)과 저기압(L)에서 <b>공기가 움직이는 방향</b>을 화면의 <b>? 칸 네 곳</b>을 눌러 정하고 <b>확인하기</b>를 누르세요.',
            hint: '맑은 하늘은 공기가 내려올 때, 구름은 공기가 올라갈 때 생겨요. 바람은 기압이 높은 곳에서 낮은 곳으로 불어요.',
            setup() { clInit(); celebrated = null; },
            check: () => {
              const sl = S.cl.slots, empty = sl.filter((s) => !s.val).length;
              if (empty) return empty + '칸이 비어 있어요. ? 칸을 눌러 방향을 골라 주세요.';
              if (clSlot('Hv').val !== 'down') return '고기압 중심에서는 맑은 하늘을 떠올려 보세요. 구름이 사라지려면 공기가 올라갈까요, 내려올까요?';
              if (clSlot('Lv').val !== 'up') return '저기압 중심에서는 구름이 생기고 비가 와요. 구름이 생기려면 공기가 올라갈까요, 내려올까요?';
              if (clSlot('Hh').val !== 'out') return '지상 바람은 기압이 높은 곳에서 낮은 곳으로 불어요. 고기압 중심에서는 바람이 어느 쪽일까요?';
              if (clSlot('Lh').val !== 'in') return '저기압 중심은 주변보다 기압이 낮아요. 바람은 주변에서 중심으로 불어요.';
              return true;
            },
            explain: '<b>고기압</b>에서는 공기가 <b>내려오고</b>(하강 기류) 지상에서 바람이 <b>불어 나가서</b> 구름이 사라지고 맑아요. <b>저기압</b>에서는 바람이 <b>불어 들어와</b> 공기가 <b>올라가고</b>(상승 기류), 올라간 공기가 단열 팽창해 냉각되면서 구름이 생겨요.',
          },
          {
            type: 'quiz', title: '저기압에서 비가 오기 쉬운 까닭', scene: 'column', figure: FIG.hl,
            goal: '저기압 중심 부근에서 구름이 생기고 비가 오기 쉬운 까닭은?',
            choices: ['하강 기류로 공기가 압축되어 수증기가 늘어나기 때문', '상승 기류로 공기가 단열 팽창해 냉각되고, 수증기가 응결하기 때문', '지상 바람이 중심에서 바깥으로 불어 나가기 때문', '기압이 높아 공기가 구름을 눌러 주기 때문'],
            answer: 1,
            feedback: ['하강 기류는 공기를 압축해 온도를 높여 구름을 없애요.', '', '저기압에서는 바람이 바깥에서 중심으로 불어 들어와요.', '저기압은 주변보다 기압이 낮은 곳이에요.'],
            explain: '저기압에서는 바람이 불어 들어와 공기가 <b>상승</b>해요. 상승한 공기는 <b>단열 팽창</b>으로 냉각되어 <b>수증기가 응결</b>하고 구름·비가 생겨요.',
          },
        ],
      },
      {
        title: '일기도로 날씨 해석하기', short: '일기도 해석', icon: '📋', phase: '분석',
        features: ['wmap'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고기압·저기압과 전선 주변의 날씨를 알아봤어요.</div>' +
          '<p>이제 <b>완성된 예시 일기도</b>를 읽고 날씨를 해석해 봐요. (일기도를 직접 그리지는 않아요.) 위성·레이더 영상 예시도 함께 보고, 실제 자료는 <b>기상청 날씨누리</b>에서 확인해 보세요.</p>',
        setup() { setScene('wmap'); setMap('win'); setLayer('chart'); resetSet(SETS.win); celebrated = null; afterScene(); },
        recap: '일기도에서 <b>고기압은 맑고, 저기압은 흐리고 비</b>가 와요. <b>한랭 전선</b> 통과 후엔 기온이 내려가고, <b>온난 전선</b> 통과 후엔 올라가요.',
        summary: '<ul><li><b>겨울</b>(서고동저형): 서쪽 대륙에 고기압, 동쪽 바다에 저기압 → 등압선 간격이 좁은 우리나라에 <b>북서풍</b>, 춥고 건조.</li>' +
          '<li><b>저기압 중심</b>: 구름·비 · <b>고기압 중심</b>: 맑음.</li><li><b>온난 전선 앞</b>: 넓은 지역 지속적인 비 · <b>한랭 전선 근처</b>: 좁은 지역 소나기·뇌우 · 한랭 전선 <b>통과 후</b>: 기온 하강.</li>' +
          '<li>위성 영상은 <b>구름</b>(흰색), 레이더 영상은 <b>비가 오는 곳</b>(초록~빨강)을 보여 준다.</li></ul>',
        missions: [
          {
            id: 'winmap', title: '겨울 일기도 해석하기', scene: 'wmap', manual: true,
            goal: '❄️ 겨울 예시 일기도의 지점 <b>A·B·C</b>에 날씨 카드를 알맞게 놓고 <b>확인하기</b>를 누르세요.',
            hint: '고기압 중심은 맑고, 저기압 중심은 구름이 많아요. 등압선 간격이 좁은 곳은 바람이 세요.',
            setup() { setMap('win'); setLayer('chart'); resetSet(SETS.win); celebrated = null; },
            check: () => (S.wm.map !== 'win' ? '❄️ 겨울 예시 일기도로 바꾸어 카드를 놓아 주세요.' : cardCheck(SETS.win, '날씨')),
            explain: '<b>고기압(A)</b> 중심은 하강 기류라 맑고 건조해요. 등압선 간격이 좁은 <b>우리나라(B)</b>에는 북서풍이 강하게 불어요. <b>저기압(C)</b> 중심은 상승 기류라 구름이 많고 눈·비가 와요.',
          },
          {
            id: 'sprmap', title: '봄 일기도: 전선과 날씨', scene: 'wmap', manual: true,
            goal: '🌸 봄 예시 일기도의 <b>한랭 전선</b>(파란 ▲)과 <b>온난 전선</b>(빨간 ●)을 보세요. 🛰️ 위성 영상도 살펴본 뒤 지점 <b>A·B·C</b>에 날씨 카드를 놓아요.',
            hint: '보기에서 🛰️ 위성을 눌러 구름이 어디에 많은지 보세요. 온난 전선 앞은 넓게, 한랭 전선은 좁게 구름이 있어요.',
            setup() { setMap('spr'); setLayer('chart'); resetSet(SETS.spr); S.wm.seenSat = false; celebrated = null; },
            check: () => {
              if (S.wm.map !== 'spr') return '🌸 봄 예시 일기도로 바꾸어 카드를 놓아 주세요.';
              if (!S.wm.seenSat) return '🛰️ 위성 영상 버튼을 눌러 구름이 어디에 많은지 먼저 살펴보세요.';
              return cardCheck(SETS.spr, '날씨');
            },
            explain: '<b>온난 전선 앞(A)</b>은 층운형 구름이 넓게 퍼져 지속적인 비가 내려요. <b>한랭 전선(B)</b> 근처는 적운형 구름이 솟아 좁은 지역에 소나기·뇌우가 와요. <b>한랭 전선이 지난 뒤(C)</b>는 찬 공기가 들어와 맑아지고 기온이 내려가요.',
          },
          {
            type: 'quiz', title: '전선 통과 후 기온 변화', scene: 'wmap', figure: FIG.cold,
            goal: '한랭 전선이 우리 동네를 통과한 뒤 기온과 날씨는 어떻게 될까요?',
            choices: ['기온이 올라가고 넓은 지역에 비가 계속 내린다', '기온이 내려가고 대체로 맑아진다', '기온이 올라가고 구름이 점점 늘어난다', '기온은 변하지 않고 안개가 낀다'],
            answer: 1,
            feedback: ['기온이 올라가는 것은 온난 전선이 지난 뒤예요.', '', '한랭 전선 뒤에는 찬 공기가 들어와요.', '찬 공기가 들어오면 기온이 변해요.'],
            explain: '한랭 전선이 지나가면 <b>찬 공기</b>가 들어와 <b>기온이 내려가고</b> 하늘이 맑아져요. 온난 전선이 지나가면 기온이 올라가요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  afterScene();
  window.__sim = {
    draw: () => draw(), S, SETS, setScene, setSeason, setFrontType, setMap, setLayer, game: () => game, clSlot, tankAction, frUI,
    unlockAll() { ['masscards', 'tank', 'front', 'column', 'wmap'].forEach((f) => F.add(f)); },
    place(setId, cardId, slot) { const set = SETS[setId], c = set.cards.find((x) => x.id === cardId), t = set.targets[slot]; c.slot = slot; cardTo(c, t.x + t.cdx, t.y + t.cdy, t.cs); },
  };
  SciSim.loop((dt, t) => {
    step(dt);
    draw();
    readouts(t);
    if (game) { renderSeg(); syncMassPanel(); }
  });
})();
