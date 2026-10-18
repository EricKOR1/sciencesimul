/* =========================================================
   통합과학2 Ⅲ. 과학과 미래 사회 - 빅데이터의 활용 (단원 3차시)
   성취기준 [10통과2-03-02] 빅데이터를 과학기술사회에서 사용하고 있는 사례를 조사하고, 빅데이터 활용의 장점과 문제점을 추론할 수 있다.
   ① 실험: 실시간 측정 (가상 센서 보드 4종, 1분 간격 기록)
   ② 관찰: 데이터 축적 (1시간 → 하루 → 한 학기, 분야별 규모 카드 짝짓기)
   ③ 분석: 패턴 찾기 (요일·시간대 필터, 산점도, 상관 ≠ 인과)
   ④ 적용: 장점·문제점 (사례 분류, 개인정보 수집 범위 슬라이더, 자료 점검)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  /* ---------- 공통 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? (typeof PHONE_VH === 'number' ? PHONE_VH : 840) : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f6fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    const push = () => { if (line) out.push(line); line = ''; };
    str.split(' ').forEach((tok) => {
      const cand = line ? line + ' ' + tok : tok;
      if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
      if (line) push();
      if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
      tok.split('').forEach((ch) => { if (ctx.measureText(line + ch).width > maxW) push(); line += ch; });
    });
    push(); ctx.restore(); return out;
  }
  function paraText(x, y, str, maxW, size, o) {
    o = o || {};
    const lines = wrapText(str, maxW, size, o.weight || 700), lh = Math.round(size * (o.lh || 1.35) * FS);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, color: o.color || '#1b2333', weight: o.weight || 700, align: o.align || 'left', alpha: o.alpha }));
    return lines.length * lh;
  }
  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = 'rgba(30,45,80,.10)'; rr(x, y + 3, w, h, 16).fill();
    ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, 16).fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; rr(x, y, w, h, 16).stroke(); }
  }
  function fitText(str, maxW, size, weight) { // 한 줄에 맞게 말줄임
    ctx.save(); ctx.font = D.font(size, weight || 700);
    let s = str;
    if (ctx.measureText(s).width > maxW) { while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); s += '…'; }
    ctx.restore(); return s;
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const L1 = $('#l1'), V1 = $('#v1'), L2 = $('#l2'), V2 = $('#v2'), L3 = $('#l3'), V3 = $('#v3');
  let rlast = '';
  function setRead(a, b, c) { // [라벨, 값] 3개
    const k = a.join('|') + b.join('|') + c.join('|'); if (k === rlast) return; rlast = k;
    L1.textContent = a[0]; V1.textContent = a[1]; L2.textContent = b[0]; V2.textContent = b[1]; L3.textContent = c[0]; V3.textContent = c[1];
  }
  function segBind(sel, fn) { $$(sel + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); fn(b.dataset.v, b); })); }
  function segSet(sel, v) { $$(sel + ' button').forEach((x) => x.classList.toggle('on', String(x.dataset.v) === String(v))); }

  /* ---------- 카드 끌어 놓기 보드 ----------
     cards: [{id, ans, ...}] / zones: [{id, x, y, w, h, cap, fixed, slots:[{x,y,w,h}(중심 좌표)]}] / homes: 카드별 처음 자리 {x,y,w,h}(중심) */
  function makeBoard(cards, zones, homes) {
    const B = { cards, zones, homes, drag: null, seq: 0, ok: false, okA: 0 };
    cards.forEach((c, i) => {
      const h = homes[i];
      Object.assign(c, { hid: i, x: h.x, y: h.y, w: h.w, h: h.h, tx: h.x, ty: h.y, tw: h.w, th: h.h, lift: 0, shake: 0, free: false, zone: null, slot: -1, bad: false, seq: 0 });
    });
    return B;
  }
  function bdLayout(B) {
    B.zones.forEach((z) => {
      if (z.fixed) return;
      B.cards.filter((c) => c.zone === z.id).sort((a, b) => a.seq - b.seq).forEach((c, k) => { c.slot = k; });
    });
    B.cards.forEach((c) => {
      if (c.zone) { const z = B.zones.find((q) => q.id === c.zone), s = z.slots[c.slot]; c.tx = s.x; c.ty = s.y; c.tw = s.w; c.th = s.h; }
      else { const h = B.homes[c.hid]; c.tx = h.x; c.ty = h.y; c.tw = h.w; c.th = h.h; }
      if (!B.drag || B.drag.c !== c) c.free = false;
    });
  }
  function bdPick(B, p) { for (let i = B.cards.length - 1; i >= 0; i--) { const c = B.cards[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; }
  function bdStart(B, c, p) {
    B.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = B.cards.indexOf(c); if (i >= 0) { B.cards.splice(i, 1); B.cards.push(c); }
    c.zone = null; c.slot = -1; c.free = true; c.bad = false; B.ok = false;
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click();
    bdLayout(B);
  }
  function bdMove(B, p) { if (!B.drag) return; B.drag.c.x = p.x - B.drag.ox; B.drag.c.y = p.y - B.drag.oy; }
  function bdDrop(B, c, p) {
    B.drag = null; c.free = false;
    const z = B.zones.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
    let ok = false;
    if (z && z.accept && !z.accept(c)) { c.zone = null; c.slot = -1; c.shake = 0.45; Sound.fail(); bdLayout(B); SciSim.tween(c, { lift: 0 }, { duration: 0.25 }); return; }
    if (z) {
      const used = new Set(B.cards.filter((o) => o !== c && o.zone === z.id).map((o) => o.slot));
      if (z.fixed) {
        let best = -1, bd = 1e9;
        z.slots.forEach((s, i) => { if (used.has(i)) return; const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { c.zone = z.id; c.slot = best; ok = true; }
      } else if (used.size < z.cap) { c.zone = z.id; c.slot = used.size; c.seq = ++B.seq; ok = true; }
    }
    if (ok) { Sound.tick(); parts.burst(c.x, c.y, { count: 5, speed: 60, size: 2.5, life: 0.4, gravity: 0, colors: ['#93c5fd', '#fff'] }); }
    else { c.zone = null; c.slot = -1; if (z) { c.shake = 0.45; Sound.fail(); } }
    bdLayout(B); SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
  }
  function bdReset(B) { B.cards.forEach((c) => { c.zone = null; c.slot = -1; c.bad = false; c.free = false; c.shake = 0; }); B.drag = null; B.ok = false; B.okA = 0; B.cards.sort((a, b) => a.hid - b.hid); bdLayout(B); }
  function bdStep(B, dt) {
    B.cards.forEach((c) => {
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      c.w = approach(c.w, c.tw, dt, 14); c.h = approach(c.h, c.th, dt, 14);
      if (c.free) return;
      c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14);
    });
  }
  function bdSnap(B) { B.cards.forEach((c) => { c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th; }); }
  function bdPlaced(B) { return B.cards.filter((c) => c.zone).length; }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    if (lift > 0.05) D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    else { ctx.fillStyle = 'rgba(30,45,80,.13)'; rr(-c.w / 2, -c.h / 2 + 3, c.w, c.h, 11).fill(); ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
    return () => ctx.restore();
  }
  function bdDraw(B, bodyFn, strokeFn) {
    B.cards.forEach((c) => {
      const end = cardBox(c, { stroke: strokeFn ? strokeFn(c) : (c.bad ? '#e2464b' : c.zone ? '#3867f4' : '#cbd5e1'), sw: c.zone ? 2.5 : 2 });
      ctx.beginPath(); rr(-c.w / 2 + 1, -c.h / 2 + 1, c.w - 2, c.h - 2, 10); ctx.save(); ctx.clip();
      bodyFn(c);
      ctx.restore();
      end();
    });
  }
  // 모든 카드가 놓였는지 / 틀린 카드 표시: judge(c) → true면 맞음
  function bdJudge(B, judge, names) {
    const un = B.cards.filter((c) => !c.zone);
    if (un.length) return '아직 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
    const bad = B.cards.filter((c) => !judge(c));
    bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
    if (bad.length) return '<b>' + bad.length + '장</b>의 위치를 다시 생각해 보세요. (빨간 테두리)';
    B.cards.forEach((c) => { c.bad = false; });
    if (!B.ok) { B.ok = true; SciSim.tween(B, { okA: 1 }, { duration: 0.8 }); B.cards.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
    return true;
  }
  // 위치를 일부러 채우는 디버그용
  function bdFill(B, zoneOf) { // zoneOf(c, i) → zone id
    bdReset(B);
    B.cards.forEach((c, i) => { const zid = zoneOf(c, i); if (!zid) return; const z = B.zones.find((q) => q.id === zid); c.zone = zid; c.seq = ++B.seq; if (z.fixed) { const used = new Set(B.cards.filter((o) => o !== c && o.zone === zid).map((o) => o.slot)); c.slot = z.slots.findIndex((s, k) => !used.has(k)); } });
    bdLayout(B); bdSnap(B); B.ok = false;
  }

  /* ======================================================
     자료 만들기 (가상 교실 · 교육용 예시)
     ====================================================== */
  const OUT = 420, VENT_TAU = 4, RATE = 800 / (45 * 28), CLASS_MIN = 45, DAY_LEN = 155, STARTS = [0, 55, 110];
  const isClass = (m) => STARTS.some((s) => m >= s && m < s + CLASS_MIN);
  const periodOf = (m) => (m < 55 ? 0 : m < 110 ? 1 : 2);
  const p2 = (n) => ('0' + n).slice(-2);
  const clockStr = (m) => { const t = 540 + m; return p2(Math.floor(t / 60)) + ':' + p2(t % 60); };
  const fmtN = (n) => SciSim.fmt(Math.round(n), 0);

  function simDay(ns, start, seed, weekend) {
    const C = []; let v = start;
    for (let m = 0; m < DAY_LEN; m++) {
      C.push(Math.round(v + hash(seed + m * 1.7) * 6));
      if (weekend) v = 430 + (v - 430) * Math.exp(-1 / 60);
      else if (isClass(m)) v += ns[periodOf(m)] * RATE;
      else v = OUT + (v - OUT) * Math.exp(-1 / VENT_TAU);
    }
    return C;
  }
  // 오늘(실시간 측정용): 학생 28명, 3교시 모두 같은 조건
  const TODAY = { T: [], C: simDay([28, 28, 28], 600, 11, false), L: [], N: [] };
  for (let m = 0; m < DAY_LEN; m++) {
    TODAY.T.push(Math.round((22.5 + 0.0035 * (TODAY.C[m] - 420) + hash(m * 3.3 + 5) * 0.12) * 10) / 10);
    TODAY.L.push(Math.round(480 + 0.9 * m + 25 * Math.sin(m / 9) + hash(m * 2.1 + 9) * 10));
    TODAY.N.push(isClass(m) ? Math.round(46 + 2.5 * Math.sin(m / 5) + hash(m * 1.3 + 2) * 1.5) : Math.round(68 + hash(m * 2.9 + 1) * 3.5));
  }
  const SENS = [
    { k: 'T', name: '온도', icon: '🌡️', unit: '°C', col: '#f26b3a', lo: 22, hi: 27, fmt: (v) => v.toFixed(1) },
    { k: 'C', name: '이산화 탄소', icon: '💨', unit: 'ppm', col: '#8b5cf6', lo: 400, hi: 1500, fmt: (v) => String(Math.round(v)) },
    { k: 'L', name: '조도', icon: '💡', unit: 'lux', col: '#f59e0b', lo: 400, hi: 700, fmt: (v) => String(Math.round(v)) },
    { k: 'N', name: '소음', icon: '🔊', unit: 'dB', col: '#0ea5e9', lo: 40, hi: 75, fmt: (v) => String(Math.round(v)) },
  ];
  // 5일치 이산화 탄소 자료: 목·금·월은 수업이 있는 평일, 토·일은 빈 교실
  const DAYS = [
    { name: '목', col: '#3867f4', ns: [26, 30, 22] }, { name: '금', col: '#14a058', ns: [24, 28, 18] },
    { name: '토', col: '#d97706', ns: null }, { name: '일', col: '#e2464b', ns: null }, { name: '월', col: '#8b5cf6', ns: [30, 27, 24] },
  ];
  DAYS.forEach((d, i) => { d.C = simDay(d.ns || [0, 0, 0], d.ns ? 600 : 430, 100 + i * 37, !d.ns); });
  const PTS = [];
  DAYS.forEach((d, di) => [0, 1, 2].forEach((p) => {
    let s = 0; for (let m = STARTS[p]; m < STARTS[p] + CLASS_MIN; m++) s += d.C[m];
    PTS.push({ d: di, p, n: d.ns ? d.ns[p] : 0, y: s / CLASS_MIN, wk: !!d.ns, born: 0 });
  }));
  const TREND = (() => {
    const N = PTS.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    PTS.forEach((q) => { sx += q.n; sy += q.y; sxx += q.n * q.n; sxy += q.n * q.y; });
    const b = (N * sxy - sx * sy) / (N * sxx - sx * sx), a = (sy - b * sx) / N;
    return { a, b };
  })();
  const trendAt = (n) => TREND.a + TREND.b * n;

  // 패턴 찾기: 선택한 요일·시간대의 평균 농도와 1분당 변화 (화면·미션 설명이 같은 함수를 써요)
  const slotOK = (slot, m) => (slot === 'all' ? true : slot === 'class' ? isClass(m) : !isClass(m));
  function serStats(days, slot) {
    let sum = 0, n = 0, ds = 0, dn = 0;
    DAYS.forEach((d, di) => {
      if (!days[di]) return;
      for (let m = 0; m < DAY_LEN; m++) {
        if (!slotOK(slot, m)) continue;
        sum += d.C[m]; n++;
        if (m + 1 < DAY_LEN && slotOK(slot, m + 1)) { ds += d.C[m + 1] - d.C[m]; dn++; }
      }
    });
    return { avg: n ? sum / n : null, slope: dn ? ds / dn : null, n };
  }
  const WKD = [true, true, false, false, true], WKE = [false, false, true, true, false];
  const ST = {
    cls: serStats(WKD, 'class'), brk: serStats(WKD, 'break'), wkd: serStats(WKD, 'all'), wke: serStats(WKE, 'all'),
  };
  const fAvg = (v) => (v == null ? '–' : String(Math.round(v)));
  const fSlope = (v) => (v == null ? '–' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1));

  // 아이스크림 판매량과 물놀이 사고 (가상 해안 도시, 월별)
  const ICE = { months: ['3월', '4월', '5월', '6월', '7월', '8월', '9월'], temp: [8, 12, 17, 22, 26, 29, 25], sales: [10, 23, 39, 55, 68, 78, 64], acc: [1, 3, 5, 7, 9, 10, 9] };

  // 개인정보 수집 범위: 편익은 점점 느리게, 위험은 점점 빠르게 늘어요
  const benefit = (x) => 100 * (1 - Math.exp(-x / 30)) / (1 - Math.exp(-100 / 30));
  const risk = (x) => 100 * (x / 100) * (x / 100);
  const bR = (x) => Math.round(benefit(x)), rR = (x) => Math.round(risk(x));
  const GOAL_B = 70, GOAL_R = 40;
  const goalOK = (x) => bR(x) >= GOAL_B && rR(x) <= GOAL_R;
  const OKX = (() => { const a = []; for (let x = 0; x <= 100; x++) if (goalOK(x)) a.push(x); return { lo: a[0], hi: a[a.length - 1] }; })();
  const TIERS = [
    { ico: '⏱️', t: '이용 시간·횟수' }, { ico: '📍', t: '위치 기록' }, { ico: '🛒', t: '구매·검색 기록' }, { ico: '🙂', t: '얼굴·목소리' }, { ico: '🧬', t: '건강·유전 정보' },
  ];

  // 규모 비교 (1분마다 기록, 한 학기 = 100일)
  const PER = { hour: { label: '1시간', min: 60 }, day: { label: '하루', min: 1440 }, term: { label: '한 학기(100일)', min: 144000 } };
  const readTime = (s) => (s < 120 ? s + '초' : s < 7200 ? Math.round(s / 60) + '분' : s < 172800 ? (Math.round(s / 360) / 10) + '시간' : Math.round(s / 3600) + '시간 (약 ' + (Math.round(s / 8640) / 10) + '일)');

  /* ======================================================
     상태
     ====================================================== */
  const SPD = [0, 3, 15]; // 시뮬레이션 분 / 실제 초
  const S = {
    mode: 'live', fade: 0, clock: 0,
    live: { t: 0, last: -1, rows: [], on: [false, false, false, false], speed: 1, done: false, packets: [], gauge: [0, 0, 0, 0] },
    pile: { period: 'hour', ns: 1, cnt: 60, off: 0, fill: 0, drops: [], emit: 0 },
    ser: { days: [true, true, true, true, true], slot: 'all', al: DAYS.map(() => new Array(DAY_LEN).fill(1)), bandC: 0.07, bandB: 0.12, r: { r1: null, r2: null, r3: null }, seen: { cls: false, brk: false, wke: false } },
    sc: { n: 20, mk: 0, born: PTS.map(() => 0), t0: 0 },
    ice: { temp: false, a: 0 },
    pr: { x: 0, tier: [0, 0, 0, 0, 0], b: 0, r: 0, found: false },
    board: {},
  };
  const Lv = S.live;
  const liveComplete = () => Lv.rows.filter((r) => r && r.v.every((x) => x != null)).length;
  const liveValues = () => Lv.rows.reduce((s, r) => s + (r ? r.v.filter((x) => x != null).length : 0), 0);
  const pileN = () => PER[S.pile.period].min * S.pile.ns;

  /* ======================================================
     카드 보드: 분야 짝짓기 / 장점·문제점 분류
     ====================================================== */
  const FIELDS = [
    { id: 'met', ico: '⛅', name: '기상 관측', col: '#0ea5e9' },
    { id: 'gen', ico: '🧬', name: '유전체 분석', col: '#16a34a' },
    { id: 'drug', ico: '💊', name: '신약 개발', col: '#8b5cf6' },
    { id: 'trf', ico: '🚗', name: '교통', col: '#f26b3a' },
  ];
  const MATCH_CARDS = [
    { id: 'met', ans: 'met', t: '관측소·위성·레이더에서 하루에도 엄청난 양의 자료가 쏟아져요. 컴퓨터로 계산해 날씨를 예보해요.' },
    { id: 'gen', ans: 'gen', t: '사람 유전체는 약 30억 염기쌍이에요. 해독에 약 13년(1990~2003년)이 걸렸지만 지금은 며칠 이내에 해독해요.' },
    { id: 'drug', ans: 'drug', t: '약이 될 후보 물질 수백만 개를 컴퓨터로 먼저 걸러 내서 시간과 비용을 줄여요.' },
    { id: 'trf', ans: 'trf', t: '도로 위 차량의 이동 자료를 실시간으로 모아 막히는 길을 피하는 길 안내에 써요.' },
  ];
  const SORT_CARDS = [
    { id: 'wx', ico: '⛅', ans: 'good', t: '기상 자료로 날씨 예보가 더 정확해졌어요' },
    { id: 'med', ico: '💊', ans: 'good', t: '내 유전 정보에 맞는 약을 골라 줘요' },
    { id: 'trf', ico: '🚦', ans: 'good', t: '도로 자료로 막히는 시간을 미리 알려 줘요' },
    { id: 'epi', ico: '🦠', ans: 'good', t: '환자 이동 기록으로 접촉자를 빨리 찾아요' },
    { id: 'face', ico: '📷', ans: 'bad', t: '허락 없이 얼굴 사진을 대량으로 모았어요' },
    { id: 'bias', ico: '🎯', ans: 'bad', t: '한쪽 집단 자료로만 배운 추천이 다른 사람에게 틀려요' },
    { id: 'ad', ico: '🛍️', ans: 'bad', t: '동의 없이 구매·위치 기록을 모아 광고에 써요' },
    { id: 'leak', ico: '🔓', ans: 'bad', t: '모아 둔 개인 정보가 밖으로 새어 나갔어요' },
  ];
  const SORT_ORDER = [5, 0, 7, 2, 4, 6, 1, 3];
  const BINS = [{ id: 'good', label: '👍 장점', sub: '쓸모 있는 점', col: '#14a058' }, { id: 'bad', label: '⚠️ 문제점', sub: '조심할 점', col: '#e2464b' }];

  function matchBoard() {
    const zones = [], homes = [];
    FIELDS.forEach((f, i) => {
      const r = PHONE ? { x: 12 + (i % 2) * 300, y: 12 + Math.floor(i / 2) * 212, w: 288, h: 204 } : { x: 14 + i * 194, y: 20, w: 186, h: 256 };
      const hd = PHONE ? 48 : 58;
      zones.push({ id: f.id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 1, fixed: true, hd, f, slots: [{ x: r.x + r.w / 2, y: r.y + hd + (r.h - hd - 6) / 2, w: r.w - 14, h: r.h - hd - 12 }] });
    });
    const order = [2, 0, 3, 1];
    const pos = (t) => (PHONE ? { x: 156 + (t % 2) * 300, y: 450 + 89 + Math.floor(t / 2) * 188, w: 288, h: 176 } : { x: 107 + t * 194, y: 388, w: 186, h: 176 });
    MATCH_CARDS.forEach((c, ci) => homes.push(pos(order.indexOf(ci))));
    return makeBoard(MATCH_CARDS.map((c) => Object.assign({}, c)), zones, homes);
  }
  function sortBoard() {
    const zones = [], homes = [];
    BINS.forEach((b, i) => {
      const r = PHONE ? { x: 12, y: 10 + i * 262, w: 576, h: 256 } : { x: 14 + i * 394, y: 14, w: 378, h: 296 };
      const cw = PHONE ? 270 : 178, ch = PHONE ? 50 : 56, gx = 8, gy = 6, top = PHONE ? 34 : 42, slots = [];
      for (let k = 0; k < 8; k++) slots.push({ x: r.x + 10 + cw / 2 + (k % 2) * (cw + gx), y: r.y + top + ch / 2 + Math.floor(k / 2) * (ch + gy), w: cw, h: ch });
      zones.push({ id: b.id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 8, fixed: false, slots, b });
    });
    const pos = (t) => (PHONE ? { x: 153 + (t % 2) * 294, y: 565 + Math.floor(t / 2) * 56, w: 282, h: 50 } : { x: 109 + (t % 4) * 194, y: 359 + Math.floor(t / 4) * 66, w: 186, h: 58 });
    SORT_CARDS.forEach((c, ci) => homes.push(pos(SORT_ORDER.indexOf(ci))));
    return makeBoard(SORT_CARDS.map((c) => Object.assign({}, c)), zones, homes);
  }
  S.board.match = matchBoard(); S.board.sort = sortBoard();
  bdLayout(S.board.match); bdLayout(S.board.sort); bdSnap(S.board.match); bdSnap(S.board.sort);

  function drawMatch(t) {
    const B = S.board.match;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    B.zones.forEach((z) => {
      const hit = B.drag && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h;
      const used = B.cards.some((c) => c.zone === z.id);
      panel(z.x, z.y, z.w, z.h, hit ? '#eef4ff' : '#fff', B.ok ? '#14a058' : hit ? z.f.col : null);
      ctx.fillStyle = z.f.col; ctx.globalAlpha = 0.14; rr(z.x, z.y, z.w, z.hd, 16).fill(); ctx.globalAlpha = 1;
      D.text(z.x + 14, z.y + z.hd / 2 + 8, z.f.ico, { size: 26, align: 'left' });
      D.text(z.x + 50, z.y + z.hd / 2 + 6, z.f.name, { size: PHONE ? 16 : 16.5, weight: 800, color: z.f.col, align: 'left' });
      if (!used) {
        const s = z.slots[0];
        ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.restore();
        D.text(s.x, s.y + 5, '카드를 여기에', { size: 13.5, weight: 700, color: '#cbd5e1' });
      }
    });
    if (!PHONE) D.text(VW / 2, 296, '▼ 설명 카드를 끌어 알맞은 분야에 놓아요', { size: 13.5, weight: 800, color: '#64748b' });
    else D.text(VW / 2, 440, '▼ 설명 카드를 끌어 알맞은 분야에 놓아요', { size: 13, weight: 800, color: '#64748b' });
    bdDraw(B, (c) => {
      const w = c.w - 22;
      const tag = FIELDS.find((f) => f.id === c.zone);
      ctx.fillStyle = tag ? tag.col : '#94a3b8'; ctx.globalAlpha = 0.9; ctx.fillRect(-c.w / 2, -c.h / 2, 6, c.h); ctx.globalAlpha = 1;
      paraText(-c.w / 2 + 14, -c.h / 2 + 26, c.t, w, 13.5, { color: '#334155', lh: 1.4 });
    }, (c) => (c.bad ? '#e2464b' : B.ok && c.zone ? '#14a058' : c.zone ? '#3867f4' : '#cbd5e1'));
  }

  function drawSort(t) {
    const B = S.board.sort;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    B.zones.forEach((z) => {
      const hit = B.drag && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h;
      panel(z.x, z.y, z.w, z.h, hit ? '#f4f9ff' : '#fff', B.ok ? '#14a058' : hit ? z.b.col : null);
      ctx.fillStyle = z.b.col; ctx.globalAlpha = 0.14; rr(z.x, z.y, z.w, 34, 16).fill(); ctx.globalAlpha = 1;
      D.text(z.x + 14, z.y + 23, z.b.label, { size: 16.5, weight: 800, color: z.b.col, align: 'left' });
      D.text(z.x + z.w - 14, z.y + 23, z.b.sub, { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
      if (!B.cards.some((c) => c.zone === z.id)) D.text(z.x + z.w / 2, z.y + z.h / 2 + 12, '여기에 카드를 놓아요', { size: 14, weight: 700, color: '#cbd5e1' });
    });
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(PHONE ? 6 : 8, PHONE ? 534 : 322, VW - (PHONE ? 12 : 16), PHONE ? 296 : 140, 14).fill();
    bdDraw(B, (c) => {
      D.text(-c.w / 2 + 20, 7, c.ico, { size: 20, align: 'center' });
      paraText(-c.w / 2 + 38, -c.h / 2 + (PHONE ? 20 : 19), c.t, c.w - 46, PHONE ? 11 : 12.5, { color: '#334155', lh: 1.26 });
    }, (c) => (c.bad ? '#e2464b' : B.ok && c.zone ? '#14a058' : c.zone ? (c.zone === 'good' ? '#14a058' : '#e2464b') : '#cbd5e1'));
  }

  /* ======================================================
     화면 1: 실시간 측정
     ====================================================== */
  function liveGeom() {
    if (!PHONE) return { card: (i) => ({ x: 12 + i * 194, y: 12, w: 186, h: 92 }), graph: (i) => ({ x: 12 + (i % 2) * 234, y: 114 + Math.floor(i / 2) * 208, w: 226, h: 200 }), table: { x: 484, y: 114, w: 304, h: 408 }, rh: 22 };
    return { card: (i) => ({ x: 12 + (i % 2) * 296, y: 12 + Math.floor(i / 2) * 92, w: 288, h: 84 }), graph: (i) => ({ x: 12 + (i % 2) * 296, y: 200 + Math.floor(i / 2) * 168, w: 288, h: 160 }), table: { x: 12, y: 540, w: 576, h: 288 }, rh: 20 };
  }
  function liveRecord(m) {
    const v = SENS.map((s, i) => (Lv.on[i] ? TODAY[s.k][m] : null));
    Lv.rows[m] = { m, v, born: S.clock };
    const G = liveGeom();
    SENS.forEach((s, i) => {
      if (!Lv.on[i]) return;
      const c = G.card(i);
      Lv.packets.push({ i, age: 0, x0: c.x + c.w / 2, y0: c.y + c.h - 8, x1: G.table.x + G.table.w / 2 + (i - 1.5) * 34, y1: G.table.y + 66 });
    });
  }
  function liveToggle(i, force) {
    const on = force != null ? force : !Lv.on[i];
    Lv.on[i] = on; Sound.tick();
    const r = Lv.rows[Lv.last];
    if (r) r.v[i] = on ? TODAY[SENS[i].k][Lv.last] : r.v[i];
    syncLiveCtl();
  }
  function syncLiveCtl() { $$('#senTgl .tgl').forEach((b) => b.setAttribute('aria-pressed', Lv.on[+b.dataset.i] ? 'true' : 'false')); }
  function liveReset() { Lv.t = 0; Lv.last = -1; Lv.rows = []; Lv.done = false; Lv.packets = []; }
  function stepLive(dt) {
    const anyOn = Lv.on.some(Boolean);
    if (Lv.speed > 0 && anyOn && !Lv.done) {
      Lv.t = Math.min(DAY_LEN, Lv.t + dt * SPD[Lv.speed]);
      while (Lv.last < Math.floor(Lv.t) && Lv.last < DAY_LEN - 1) { Lv.last++; liveRecord(Lv.last); }
      if (Lv.t >= DAY_LEN) { Lv.done = true; showHint('오늘 3교시까지 측정이 끝났어요. ↺ 새로 측정으로 다시 해 봐요', 6000); }
    }
    SENS.forEach((s, i) => {
      const cur = Lv.on[i] ? TODAY[s.k][Math.max(0, Lv.last)] : s.lo;
      Lv.gauge[i] = approach(Lv.gauge[i], Lv.on[i] ? clamp((cur - s.lo) / (s.hi - s.lo), 0, 1) : 0, dt, 8);
    });
    for (let i = Lv.packets.length - 1; i >= 0; i--) { Lv.packets[i].age += dt; if (Lv.packets[i].age > 0.6) Lv.packets.splice(i, 1); }
  }
  function drawLive(t) {
    const G = liveGeom();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    const lastM = Math.max(0, Lv.last);
    SENS.forEach((s, i) => {
      const c = G.card(i), on = Lv.on[i];
      panel(c.x, c.y, c.w, c.h, on ? '#fff' : '#eceff5', on ? s.col : null);
      ctx.fillStyle = on ? '#22c55e' : '#cbd5e1'; ctx.beginPath(); ctx.arc(c.x + c.w - 16, c.y + 16, 6, 0, TAU); ctx.fill();
      if (on) D.glow(c.x + c.w - 16, c.y + 16, 14, '#22c55e', 0.35);
      D.text(c.x + 14, c.y + 32, s.icon, { size: 22, align: 'left' });
      D.text(c.x + 44, c.y + 31, s.name, { size: 13.5, weight: 800, color: on ? '#334155' : '#94a3b8', align: 'left' });
      if (on) {
        const cur = TODAY[s.k][lastM];
        D.text(c.x + 14, c.y + (PHONE ? 62 : 66), s.fmt(cur), { size: PHONE ? 22 : 26, weight: 800, color: s.col, align: 'left' });
        const wv = (() => { ctx.save(); ctx.font = D.font(PHONE ? 22 : 26, 800); const w = ctx.measureText(s.fmt(cur)).width; ctx.restore(); return w; })();
        D.text(c.x + 18 + wv, c.y + (PHONE ? 62 : 66), s.unit, { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
        ctx.fillStyle = '#e8edf4'; rr(c.x + 14, c.y + c.h - 14, c.w - 28, 6, 3).fill();
        if (Lv.gauge[i] > 0.004) { ctx.fillStyle = s.col; rr(c.x + 14, c.y + c.h - 14, (c.w - 28) * Lv.gauge[i], 6, 3).fill(); }
      } else D.text(c.x + 14, c.y + (PHONE ? 62 : 66), '꺼짐 · 눌러서 켜요', { size: 13, weight: 700, color: '#94a3b8', align: 'left' });
    });
    // 그래프 4개 (최근 60분)
    const w0 = Math.max(0, lastM - 59);
    SENS.forEach((s, i) => {
      const g = G.graph(i);
      panel(g.x, g.y, g.w, g.h);
      D.text(g.x + 12, g.y + 22, s.icon + ' ' + s.name + ' (' + s.unit + ')', { size: 13.5, weight: 800, color: s.col, align: 'left' });
      const px = g.x + 46, py = g.y + 34, pw = g.w - 46 - 12, ph = g.h - 34 - 26;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
      [s.lo, (s.lo + s.hi) / 2, s.hi].forEach((v) => {
        const y = py + ph - (v - s.lo) / (s.hi - s.lo) * ph;
        ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
        D.text(px - 5, y + 4, s.k === 'T' ? v.toFixed(1) : String(Math.round(v)), { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
      });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
      [0, 30, 59].forEach((k) => D.text(px + pw * k / 59, py + ph + 16, clockStr(w0 + k), { size: 11.5, weight: 700, color: '#64748b', align: k === 0 ? 'left' : k === 59 ? 'right' : 'center' }));
      ctx.save(); ctx.beginPath(); ctx.rect(px, py - 2, pw, ph + 4); ctx.clip();
      ctx.strokeStyle = s.col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      let pen = false; ctx.beginPath();
      let lx = 0, ly = 0, any = false;
      for (let m = w0; m <= lastM; m++) {
        const r = Lv.rows[m], v = r ? r.v[i] : null;
        if (v == null) { pen = false; continue; }
        const x = px + (m - w0) / 59 * pw, y = py + ph - clamp((v - s.lo) / (s.hi - s.lo), 0, 1) * ph;
        if (!pen) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        pen = true; lx = x; ly = y; any = true;
      }
      ctx.stroke(); ctx.restore();
      if (any && Lv.rows[lastM] && Lv.rows[lastM].v[i] != null) { D.sphere(lx, ly, 5, s.col, { outline: '#fff', outlineWidth: 1.5 }); }
      if (!any) D.text(px + pw / 2, py + ph / 2 + 4, Lv.on[i] ? '시간을 흘려 보내요 ▶' : '센서가 꺼져 있어요', { size: 12.5, weight: 700, color: '#cbd5e1' });
    });
    // 표
    const tb = G.table;
    panel(tb.x, tb.y, tb.w, tb.h);
    D.text(tb.x + 12, tb.y + 22, '📋 기록표 (1분마다 한 줄)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const cols = [tb.x + 10, tb.x + 70, tb.x + 134, tb.x + 204, tb.x + 262];
    const heads = ['시각', '온도', 'CO₂', '조도', '소음'];
    if (PHONE) { cols[1] = tb.x + 130; cols[2] = tb.x + 240; cols[3] = tb.x + 360; cols[4] = tb.x + 470; }
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(tb.x + 6, tb.y + 32, tb.w - 12, 22);
    heads.forEach((h, k) => D.text(cols[k], tb.y + 48, h, { size: 12.5, weight: 800, color: k ? SENS[k - 1].col : '#475569', align: 'left' }));
    const maxRows = Math.floor((tb.h - 62) / G.rh);
    for (let k = 0; k < maxRows; k++) {
      const m = Lv.last - k; if (m < 0) break;
      const r = Lv.rows[m]; if (!r) continue;
      const y = tb.y + 58 + k * G.rh;
      const hl = Math.max(0, 1 - (S.clock - r.born) / 0.9);
      if (k % 2) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(tb.x + 6, y, tb.w - 12, G.rh); }
      if (hl > 0.01) { ctx.fillStyle = 'rgba(56,103,244,' + hl * 0.22 + ')'; ctx.fillRect(tb.x + 6, y, tb.w - 12, G.rh); }
      D.text(cols[0], y + G.rh - 6, clockStr(m), { size: 12.5, weight: 700, color: '#475569', align: 'left' });
      r.v.forEach((v, q) => D.text(cols[q + 1], y + G.rh - 6, v == null ? '–' : SENS[q].fmt(v), { size: 12.5, weight: 700, color: v == null ? '#cbd5e1' : '#1b2333', align: 'left' }));
    }
    if (Lv.last < 0) D.text(tb.x + tb.w / 2, tb.y + tb.h / 2, '센서를 켜면 여기에 쌓여요', { size: 13.5, weight: 700, color: '#cbd5e1' });
    // 신호 알갱이
    Lv.packets.forEach((p) => {
      const f = SciSim.ease.inOutCubic(clamp(p.age / 0.6, 0, 1));
      const x = lerp(p.x0, p.x1, f), y = lerp(p.y0, p.y1, f) - Math.sin(f * Math.PI) * 18;
      D.sphere(x, y, 5.5, SENS[p.i].col, { outline: '#fff', outlineWidth: 1.5 });
    });
  }

  /* ======================================================
     화면 2: 쌓이는 데이터의 규모
     ====================================================== */
  function pileGeom() {
    return PHONE
      ? { p1: { x: 12, y: 12, w: 576, h: 214 }, p2: { x: 12, y: 234, w: 576, h: 252 }, p3: { x: 12, y: 494, w: 576, h: 120 }, p4: { x: 12, y: 622, w: 576, h: 150 } }
      : { p1: { x: 14, y: 14, w: 384, h: 322 }, p2: { x: 410, y: 14, w: 376, h: 322 }, p3: { x: 14, y: 348, w: 384, h: 198 }, p4: { x: 410, y: 348, w: 376, h: 198 } };
  }
  function stepPile(dt) {
    const P = S.pile, N = pileN();
    P.cnt = approach(P.cnt, N, dt, 5); if (Math.abs(P.cnt - N) < 0.5) P.cnt = N;
    const fillT = clamp((Math.log10(N) - 1) / 5, 0, 1);
    P.fill = approach(P.fill, fillT, dt, 4);
    const rate = PER[P.period].min <= 60 ? 4 : PER[P.period].min <= 1440 ? 50 : 800;
    P.off += rate * 18 * dt * (P.ns === 4 ? 1.6 : 1);
    // 떨어지는 점
    P.emit += dt * (4 + 40 * fillT * (P.ns === 4 ? 1.5 : 1));
    const G = pileGeom(), tk = { x: G.p1.x + G.p1.w - 116, y: G.p1.y + 52, w: 100, h: G.p1.h - 68 };
    while (P.emit >= 1) { P.emit -= 1; if (P.drops.length < 90) P.drops.push({ x: tk.x + 14 + Math.random() * (tk.w - 28), y: G.p1.y + 36, vy: 40 + Math.random() * 40, col: SENS[Math.floor(Math.random() * 4)].col }); }
    const surf = tk.y + tk.h - tk.h * 0.9 * P.fill;
    for (let i = P.drops.length - 1; i >= 0; i--) { const d = P.drops[i]; d.vy += 420 * dt; d.y += d.vy * dt; if (d.y >= surf - 4) P.drops.splice(i, 1); }
  }
  function drawPile(t) {
    const P = S.pile, G = pileGeom(), N = pileN();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // P1: 쏟아지는 기록
    const p1 = G.p1;
    panel(p1.x, p1.y, p1.w, p1.h);
    D.text(p1.x + 14, p1.y + 24, '📥 쌓이는 기록', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    D.text(p1.x + p1.w - 124, p1.y + 24, fmtN(P.cnt) + '개', { size: 17, weight: 800, color: '#8b5cf6', align: 'right' });
    const sx = p1.x + 12, sy = p1.y + 36, sw = p1.w - 140, sh = p1.h - 48, rh = 18;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(sx, sy, sw, sh);
    const rate = PER[P.period].min <= 60 ? 4 : PER[P.period].min <= 1440 ? 50 : 800;
    const blur = rate > 14;
    const base = Math.floor(P.off / rh), frac = (P.off / rh) - base;
    for (let i = -1; i < Math.ceil(sh / rh) + 1; i++) {
      const k = base + (Math.ceil(sh / rh) - i), y = sy + i * rh + frac * rh;
      if (blur) {
        ctx.fillStyle = 'rgba(100,116,139,' + (0.12 + 0.12 * (hash(k) + 1)) + ')';
        ctx.fillRect(sx + 8, y + 3, sw * (0.55 + 0.4 * (hash(k * 3.1) + 1) / 2), rh - 8);
      } else {
        const hh = p2(Math.floor((k % 1440) / 60)) + ':' + p2(k % 60);
        const cs = [hh, (22 + (hash(k * 1.3) + 1) * 2.5).toFixed(1), String(Math.round(450 + (hash(k * 2.1) + 1) * 500)), String(Math.round(420 + (hash(k * 3.7) + 1) * 140)), String(Math.round(42 + (hash(k * 5.3) + 1) * 14))];
        cs.forEach((c, q) => D.text(sx + 8 + q * (sw - 16) / 5, y + rh - 5, c, { size: 12, weight: 700, color: '#64748b', align: 'left' }));
      }
    }
    const gr = ctx.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, 'rgba(248,250,252,.95)'); gr.addColorStop(0.18, 'rgba(248,250,252,0)'); gr.addColorStop(0.82, 'rgba(248,250,252,0)'); gr.addColorStop(1, 'rgba(248,250,252,.95)');
    ctx.fillStyle = gr; ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
    if (blur) D.label(sx + sw / 2, sy + sh / 2, '너무 빨라서 읽을 수 없어요!', { bg: '#e2464b', size: 13 });
    // 저장 통
    const tk = { x: p1.x + p1.w - 116, y: p1.y + 52, w: 100, h: p1.h - 68 };
    D.beaker(tk.x, tk.y, tk.w, tk.h, { level: 0.9 * P.fill, liquid: '#8b5cf6', t, ticks: 6, wave: 1.2 });
    D.text(tk.x + tk.w / 2, tk.y - 6, '💾 저장소', { size: 12.5, weight: 800, color: '#64748b' });
    P.drops.forEach((d) => { ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, TAU); ctx.fill(); });
    // P2: 로그 눈금 막대
    const p2r = G.p2;
    panel(p2r.x, p2r.y, p2r.w, p2r.h);
    D.text(p2r.x + 14, p2r.y + 24, '📊 값의 개수 (눈금 한 칸 = 10배)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const bx = p2r.x + 62, by = p2r.y + 40, bw = p2r.w - 62 - 16, bh = p2r.h - 40 - 52;
    ['10', '100', '1,000', '1만', '10만', '100만'].forEach((lb, k) => {
      const y = by + bh - k / 5 * bh;
      ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); ctx.stroke();
      D.text(bx - 6, y + 4, lb, { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
    ['hour', 'day', 'term'].forEach((k, q) => {
      const v = PER[k].min * P.ns, frac2 = clamp((Math.log10(v) - 1) / 5, 0, 1), sel = P.period === k;
      const w = Math.min(70, bw / 3 - 24), cx = bx + bw * (q + 0.5) / 3, h = bh * frac2;
      ctx.globalAlpha = sel ? 1 : 0.35;
      const g = ctx.createLinearGradient(0, by + bh - h, 0, by + bh); g.addColorStop(0, '#a78bfa'); g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g; rr(cx - w / 2, by + bh - h, w, h, 6).fill();
      ctx.globalAlpha = 1;
      D.text(cx, by + bh - h - 6, fmtN(v), { size: 12.5, weight: 800, color: sel ? '#6d28d9' : '#94a3b8' });
      D.text(cx, by + bh + 18, k === 'term' ? '한 학기' : PER[k].label, { size: 13, weight: 800, color: sel ? '#334155' : '#94a3b8' });
    });
    // P3: 읽는 시간
    const p3 = G.p3;
    panel(p3.x, p3.y, p3.w, p3.h);
    D.text(p3.x + 14, p3.y + 24, '👀 값 1개를 1초에 읽는다면?', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.text(p3.x + p3.w / 2, p3.y + (PHONE ? 66 : 84), readTime(N), { size: PHONE ? 28 : 32, weight: 800, color: N >= 100000 ? '#e2464b' : '#8b5cf6' });
    D.text(p3.x + p3.w / 2, p3.y + (PHONE ? 92 : 112), fmtN(N) + '개 × 1초', { size: 13.5, weight: 700, color: '#64748b' });
    if (!PHONE) paraText(p3.x + 16, p3.y + 142, N >= 100000 ? '쉬지 않고 읽어도 이렇게 오래 걸려요. 컴퓨터가 필요해요!' : '아직은 사람이 읽을 수 있는 양이에요.', p3.w - 32, 13, { color: '#475569' });
    // P4: 빅데이터의 세 가지 특징
    const p4 = G.p4;
    panel(p4.x, p4.y, p4.w, p4.h);
    D.text(p4.x + 14, p4.y + 24, '🔑 빅데이터의 세 가지 특징', { size: 14, weight: 800, color: '#334155', align: 'left' });
    [['규모', 'Volume', '아주 많은 양', '📦', '#8b5cf6'], ['속도', 'Velocity', '빠르게 생성', '⚡', '#f59e0b'], ['다양성', 'Variety', '숫자·글·사진·소리', '🧩', '#0ea5e9']].forEach((c, q) => {
      const w = (p4.w - 28 - 16) / 3, x = p4.x + 14 + q * (w + 8), y = p4.y + 38, h = p4.h - 50;
      ctx.fillStyle = c[4]; ctx.globalAlpha = 0.1; rr(x, y, w, h, 12).fill(); ctx.globalAlpha = 1;
      D.text(x + w / 2, y + (PHONE ? 30 : 36), c[3], { size: 24 });
      D.text(x + w / 2, y + (PHONE ? 54 : 66), c[0], { size: 15, weight: 800, color: c[4] });
      D.text(x + w / 2, y + (PHONE ? 72 : 86), c[1], { size: 11.5, weight: 700, color: '#64748b' });
      if (!PHONE) paraText(x + w / 2, y + 108, c[2], w - 12, 12, { color: '#475569', align: 'center' });
    });
  }

  /* ======================================================
     화면 3: 패턴 찾기 (시계열 + 필터)
     ====================================================== */
  const YMIN = 350, YMAX = 1500;
  function serGeom() {
    const c = PHONE ? { x: 12, y: 12, w: 576, h: 430 } : { x: 14, y: 14, w: 772, h: 340 };
    return {
      c, px: c.x + 54, py: c.y + 40, pw: c.w - 54 - 14, ph: c.h - 40 - 44,
      st: PHONE ? [0, 1, 2].map((i) => ({ x: 12, y: 450 + i * 88, w: 576, h: 80 })) : [0, 1, 2].map((i) => ({ x: 14 + i * 261, y: 366, w: 250, h: 128 })),
      note: PHONE ? { x: 18, y: 722 } : { x: 18, y: 520 },
    };
  }
  function stepSer(dt) {
    const Z = S.ser;
    DAYS.forEach((d, di) => { for (let m = 0; m < DAY_LEN; m++) { const tg = Z.days[di] ? (slotOK(Z.slot, m) ? 1 : 0.16) : 0; Z.al[di][m] = approach(Z.al[di][m], tg, dt, 10); } });
    Z.bandC = approach(Z.bandC, Z.slot === 'class' ? 0.17 : Z.slot === 'break' ? 0.03 : 0.07, dt, 8);
    Z.bandB = approach(Z.bandB, Z.slot === 'break' ? 0.32 : Z.slot === 'class' ? 0.05 : 0.14, dt, 8);
    const wkdOn = Z.days[0] || Z.days[1] || Z.days[4], wkeOnly = Z.days[2] && Z.days[3] && !wkdOn;
    if (S.mode === 'series') {
      if (Z.slot === 'class' && wkdOn) Z.seen.cls = true;
      if (Z.slot === 'break' && wkdOn) Z.seen.brk = true;
      if (wkeOnly) Z.seen.wke = true;
    }
  }
  function drawSeries(t) {
    const Z = S.ser, G = serGeom(), c = G.c, { px, py, pw, ph } = G;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(c.x, c.y, c.w, c.h);
    D.text(c.x + 14, c.y + 26, PHONE ? '이산화 탄소 농도(ppm)' : '실내 이산화 탄소 농도 (ppm) · 1분 간격 · 09:00~11:35', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const X = (m) => px + m / (DAY_LEN - 1) * pw, Y = (v) => py + ph - clamp((v - YMIN) / (YMAX - YMIN), 0, 1) * ph;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
    // 수업·쉬는 시간 띠
    STARTS.forEach((s, p) => {
      ctx.fillStyle = 'rgba(56,103,244,' + Z.bandC + ')'; ctx.fillRect(X(s), py, X(s + CLASS_MIN - 1) - X(s), ph);
      D.text((X(s) + X(s + CLASS_MIN - 1)) / 2, py + 15, (p + 1) + '교시', { size: 12.5, weight: 800, color: '#3867f4' });
      if (p < 2) {
        ctx.fillStyle = 'rgba(245,158,11,' + Z.bandB + ')'; ctx.fillRect(X(s + CLASS_MIN - 1), py, X(s + 54) - X(s + CLASS_MIN - 1), ph);
        D.text((X(s + CLASS_MIN - 1) + X(s + 54)) / 2, py + 15, PHONE ? '쉼' : '쉬는 시간', { size: PHONE ? 11 : 10.5, weight: 800, color: '#b45309' });
      }
    });
    [400, 800, 1200].forEach((v) => {
      ctx.strokeStyle = '#dfe6f1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(v)); ctx.lineTo(px + pw, Y(v)); ctx.stroke();
      D.text(px - 6, Y(v) + 4, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' });
    });
    [0, 30, 60, 90, 120, 150].forEach((m) => D.text(X(m), py + ph + 18, clockStr(m), { size: 12, weight: 700, color: '#64748b' }));
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    // 바깥 공기 기준선
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, Y(OUT)); ctx.lineTo(px + pw, Y(OUT)); ctx.stroke(); ctx.restore();
    D.text(px + pw - 4, Y(OUT) + 14, '야외 약 ' + OUT + ' ppm', { size: 11.5, weight: 700, color: '#16a34a', align: 'right' });
    // 요일별 선
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    DAYS.forEach((d, di) => {
      const al = Z.al[di]; if (Math.max.apply(null, al) < 0.02) return;
      for (let m = 0; m < DAY_LEN - 1; m++) {
        const a = Math.min(al[m], al[m + 1]); if (a < 0.02) continue;
        ctx.strokeStyle = SciSim.color.rgba(d.col, a); ctx.lineWidth = a > 0.6 ? 2.6 : 1.4;
        ctx.beginPath(); ctx.moveTo(X(m), Y(d.C[m])); ctx.lineTo(X(m + 1), Y(d.C[m + 1])); ctx.stroke();
      }
    });
    ctx.restore();
    // 평균선
    const st = serStats(Z.days, Z.slot);
    if (st.avg != null) {
      ctx.save(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, Y(st.avg)); ctx.lineTo(px + pw, Y(st.avg)); ctx.stroke(); ctx.restore();
      D.label(px + pw - 6, clamp(Y(st.avg) - 14, py + 24, py + ph - 10), '평균 ' + fAvg(st.avg) + ' ppm', { bg: '#1b2333', size: 12.5, align: 'right' });
    } else D.text(px + pw / 2, py + ph / 2, '요일을 하나 이상 켜 보세요', { size: 15, weight: 700, color: '#94a3b8' });
    // 요일 범례
    DAYS.forEach((d, di) => {
      const lx = c.x + c.w - 36 - (4 - di) * (PHONE ? 46 : 54) - (PHONE ? 8 : 14);
      ctx.globalAlpha = Z.days[di] ? 1 : 0.35; ctx.fillStyle = d.col; ctx.fillRect(lx, c.y + 16, 16, 4);
      D.text(lx + 20, c.y + 24, d.name, { size: 12.5, weight: 800, color: '#334155', align: 'left' }); ctx.globalAlpha = 1;
    });
    // 통계 카드
    const sl = st.slope, slCol = sl == null ? '#94a3b8' : sl > 1 ? '#e2464b' : sl < -1 ? '#3867f4' : '#64748b';
    const cards = [
      ['평균 농도', fAvg(st.avg) + (st.avg == null ? '' : ' ppm'), '#1b2333', '고른 요일·시간대 전체의 평균'],
      ['1분당 변화', fSlope(sl) + (sl == null ? '' : ' ppm/분'), slCol, sl == null ? '' : sl > 1 ? '1분마다 평균적으로 올라가요' : sl < -1 ? '1분마다 평균적으로 내려가요' : '거의 변하지 않아요'],
      ['사용한 자료', fmtN(st.n) + '개', '#8b5cf6', '고른 조건에 맞는 1분 기록의 수'],
    ];
    G.st.forEach((r, i) => {
      panel(r.x, r.y, r.w, r.h);
      D.text(r.x + 14, r.y + 24, cards[i][0], { size: 13.5, weight: 800, color: '#64748b', align: 'left' });
      D.text(r.x + 14, r.y + (PHONE ? 58 : 66), cards[i][1], { size: PHONE ? 24 : 28, weight: 800, color: cards[i][2], align: 'left' });
      if (!PHONE) paraText(r.x + 14, r.y + 96, cards[i][3], r.w - 28, 12.5, { color: '#64748b' });
      else D.text(r.x + r.w - 14, r.y + 58, cards[i][3], { size: 12, weight: 700, color: '#64748b', align: 'right' });
    });
    D.text(G.note.x, G.note.y, '※ 가상 교실에서 5일 동안 1분마다 측정한 교육용 예시 자료예요. (토·일은 수업이 없어요)', { size: 12, weight: 700, color: '#64748b', align: 'left' });
  }

  /* ======================================================
     화면 4: 산점도 (학생 수 – 교시 평균 농도)
     ====================================================== */
  const SX = 32, SYMIN = 300, SYMAX = 1200;
  function scGeom() {
    const c = PHONE ? { x: 12, y: 12, w: 576, h: 450 } : { x: 14, y: 14, w: 520, h: 430 };
    return { c, px: c.x + 58, py: c.y + 38, pw: c.w - 58 - 22, ph: c.h - 38 - 50, side: PHONE ? { x: 12, y: 470, w: 576, h: 170 } : { x: 546, y: 14, w: 240, h: 430 }, strip: PHONE ? { x: 12, y: 648, w: 576, h: 120 } : { x: 14, y: 456, w: 772, h: 90 } };
  }
  function drawScatter(t) {
    const G = scGeom(), c = G.c, { px, py, pw, ph } = G, sc = S.sc;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(c.x, c.y, c.w, c.h);
    D.text(c.x + 14, c.y + 25, '교시별 학생 수와 평균 이산화 탄소 농도', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const X = (n) => px + n / SX * pw, Y = (v) => py + ph - clamp((v - SYMIN) / (SYMAX - SYMIN), 0, 1) * ph;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
    [300, 600, 900, 1200].forEach((v) => { ctx.strokeStyle = '#dfe6f1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(v)); ctx.lineTo(px + pw, Y(v)); ctx.stroke(); D.text(px - 6, Y(v) + 4, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    [0, 10, 20, 30].forEach((n) => { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(X(n), py); ctx.lineTo(X(n), py + ph); ctx.stroke(); D.text(X(n), py + ph + 18, String(n), { size: 12, weight: 700, color: '#64748b' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    D.text(px + pw / 2, py + ph + 40, '학생 수 (명)', { size: 12.5, weight: 800, color: '#475569' });
    D.text(px - 6, py - 6, 'ppm', { size: 12, weight: 800, color: '#475569', align: 'right' });
    // 추세선
    ctx.strokeStyle = 'rgba(27,35,51,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), Y(trendAt(0))); ctx.lineTo(X(30), Y(trendAt(30))); ctx.stroke();
    D.text(X(30) - 4, Y(trendAt(30)) - 12, '추세선', { size: 12.5, weight: 800, color: '#1b2333', align: 'right' });
    // 점
    PTS.forEach((q, i) => {
      const b = RM ? 1 : clamp((S.clock - sc.t0 - i * 0.07) / 0.4, 0, 1), r = 7.5 * SciSim.ease.outBack(b);
      if (r <= 0.2) return;
      D.sphere(X(q.n), Y(q.y) - (1 - b) * 40, r, q.wk ? '#3867f4' : '#d97706', { outline: '#fff', outlineWidth: 1.5 });
    });
    D.label(X(0) + 14, Y(PTS.find((q) => !q.wk).y) + 22, '빈 교실 ' + PTS.filter((q) => !q.wk).length + '곳', { bg: '#d97706', size: 12, align: 'left' });
    // 읽기 표시선
    const n = sc.n, mk = sc.mk, yv = Math.round(trendAt(n));
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(mk), py + ph); ctx.lineTo(X(mk), Y(trendAt(mk))); ctx.lineTo(px, Y(trendAt(mk))); ctx.stroke(); ctx.restore();
    D.sphere(X(mk), Y(trendAt(mk)), 6, '#14a058', { outline: '#fff', outlineWidth: 2 });
    D.label(clamp(X(mk), px + 60, px + pw - 60), Y(trendAt(mk)) - 24, n + '명 → 약 ' + yv + ' ppm', { bg: '#14a058', size: 13 });
    // 옆 칸
    const sd = G.side;
    panel(sd.x, sd.y, sd.w, sd.h);
    D.text(sd.x + 14, sd.y + 26, '읽는 법', { size: 14, weight: 800, color: '#334155', align: 'left' });
    D.sphere(sd.x + 24, sd.y + 48, 6, '#3867f4'); D.text(sd.x + 38, sd.y + 53, '수업이 있는 평일의 교시', { size: 12.5, weight: 700, color: '#334155', align: 'left' });
    D.sphere(sd.x + 24, sd.y + 72, 6, '#d97706'); D.text(sd.x + 38, sd.y + 77, '빈 교실(주말), 학생 0명', { size: 12.5, weight: 700, color: '#334155', align: 'left' });
    paraText(sd.x + 14, sd.y + 106, '점 하나 = 한 교시(45분)의 평균 농도예요. 총 ' + PTS.length + '개의 점이 있어요.', sd.w - 28, 12.5, { color: '#475569' });
    if (!PHONE) paraText(sd.x + 14, sd.y + 170, '추세선을 보면 학생 1명이 늘 때마다 평균 농도가 약 +' + TREND.b.toFixed(1) + ' ppm씩 높아지는 경향이 보여요.', sd.w - 28, 12.5, { color: '#475569' });
    else paraText(sd.x + 14, sd.y + 138, '추세선: 학생 1명이 늘 때 평균 약 +' + TREND.b.toFixed(1) + ' ppm', sd.w - 28, 12.5, { color: '#475569' });
    const sp = G.strip;
    panel(sp.x, sp.y, sp.w, sp.h, '#fffbeb', '#fde68a');
    paraText(sp.x + 16, sp.y + 28, '💡 점들이 오른쪽 위로 올라가는 모양이면 두 값이 함께 커지는 상관이 있다고 해요. 그런데 상관이 있다고 해서 한쪽이 다른 쪽의 원인이라고 단정할 수는 없어요. (다음 화면에서 알아봐요)', sp.w - 32, 13.5, { color: '#92400e' });
  }

  /* ======================================================
     화면 5: 상관관계 ≠ 인과관계 (아이스크림과 물놀이 사고)
     ====================================================== */
  function iceGeom() {
    const c = PHONE ? { x: 12, y: 12, w: 576, h: 470 } : { x: 14, y: 14, w: 772, h: 384 };
    return { c, px: c.x + 56, py: c.y + 118, pw: c.w - 56 - 60, ph: c.h - 118 - 46, tx: PHONE ? { x: 12, y: 492, w: 576, h: 200 } : { x: 14, y: 410, w: 772, h: 136 } };
  }
  function drawIce(t) {
    const G = iceGeom(), c = G.c, { px, py, pw, ph } = G, a = S.ice.a;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(c.x, c.y, c.w, c.h);
    D.text(c.x + 14, c.y + 26, '가상 해안 도시의 월별 자료 (교육용 예시)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#3867f4'; ctx.fillRect(c.x + 14, c.y + 40, 14, 10); D.text(c.x + 34, c.y + 50, '아이스크림 판매량(천 개)', { size: 12.5, weight: 800, color: '#3867f4', align: 'left' });
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.arc(c.x + (PHONE ? 228 : 232), c.y + 45, 5, 0, TAU); ctx.fill(); D.text(c.x + (PHONE ? 240 : 244), c.y + 50, '물놀이 사고(건)', { size: 12.5, weight: 800, color: '#e2464b', align: 'left' });
    ctx.fillStyle = '#f26b3a'; ctx.globalAlpha = a; ctx.fillRect(c.x + (PHONE ? 352 : 378), c.y + 40, 14, 10); D.text(c.x + (PHONE ? 372 : 398), c.y + 50, '기온(°C)', { size: 12.5, weight: 800, color: '#f26b3a', align: 'left' }); ctx.globalAlpha = 1;
    const n = ICE.months.length, bw = Math.min(54, pw / n * 0.5), cx = (i) => px + pw * (i + 0.5) / n;
    const YS = (v) => py + ph - v / 80 * ph, YA = (v) => py + ph - v / 12 * ph;
    [0, 20, 40, 60, 80].forEach((v) => { ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, YS(v)); ctx.lineTo(px + pw, YS(v)); ctx.stroke(); D.text(px - 6, YS(v) + 4, String(v), { size: 12, weight: 700, color: '#3867f4', align: 'right' }); });
    [0, 3, 6, 9, 12].forEach((v) => D.text(px + pw + 8, YA(v) + 4, String(v), { size: 12, weight: 700, color: '#e2464b', align: 'left' }));
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    ICE.months.forEach((mo, i) => {
      const h = ICE.sales[i] / 80 * ph;
      const g = ctx.createLinearGradient(0, py + ph - h, 0, py + ph); g.addColorStop(0, '#7ba2ff'); g.addColorStop(1, '#3867f4');
      ctx.fillStyle = g; rr(cx(i) - bw / 2, py + ph - h, bw, h, 5).fill();
      D.text(cx(i), py + ph + 18, mo, { size: 13, weight: 800, color: '#475569' });
    });
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    ICE.acc.forEach((v, i) => (i ? ctx.lineTo(cx(i), YA(v)) : ctx.moveTo(cx(i), YA(v)))); ctx.stroke();
    ICE.acc.forEach((v, i) => { D.sphere(cx(i), YA(v), 6, '#e2464b', { outline: '#fff', outlineWidth: 1.5 }); });
    // 기온 줄 + 화살표
    if (a > 0.02) {
      ICE.temp.forEach((tp, i) => {
        const y = py - 26, col = SciSim.color.mix('#fbbf24', '#ef4444', clamp((tp - 8) / 21, 0, 1));
        ctx.globalAlpha = a;
        D.sphere(cx(i), y, 13, col, { outline: '#fff', outlineWidth: 1.5 });
        D.text(cx(i), y + 4.5, String(tp), { size: 12, weight: 800, color: '#fff' });
        D.arrow(cx(i), y + 15, cx(i), py + 6 + (1 - a) * 10, { color: 'rgba(242,107,58,.8)', width: 2.5, head: 8 });
        ctx.globalAlpha = 1;
      });
      D.label(px, c.y + 66, '기온이 높은 달에 둘 다 늘어요', { bg: '#f26b3a', size: 12.5, align: 'left' });
    }
    const tx = G.tx;
    panel(tx.x, tx.y, tx.w, tx.h, a > 0.5 ? '#fff7ed' : '#fff', a > 0.5 ? '#fdba74' : null);
    const tl = a > 0.5
      ? ['🌡️ 숨은 변수: 기온', '날씨가 더우면 아이스크림이 많이 팔리고, 물놀이하는 사람도 많아져 사고가 늘어요. 아이스크림이 사고를 일으킨 것이 아니라, 기온이 두 값에 모두 영향을 준 거예요.']
      : ['🍦 두 값이 함께 늘어요', '3월부터 8월까지 아이스크림 판매량이 ' + ICE.sales[0] + '천 개에서 ' + ICE.sales[5] + '천 개로 늘 때, 물놀이 사고도 ' + ICE.acc[0] + '건에서 ' + ICE.acc[5] + '건으로 늘었어요. 그렇다면 아이스크림이 사고의 원인일까요? \'🌡️ 기온도 함께 보기\'를 눌러 봐요.'];
    D.text(tx.x + 16, tx.y + 28, tl[0], { size: 15, weight: 800, color: a > 0.5 ? '#c2410c' : '#334155', align: 'left' });
    paraText(tx.x + 16, tx.y + 54, tl[1], tx.w - 32, 13.5, { color: '#475569' });
  }

  /* ======================================================
     화면 6: 개인정보 수집 범위
     ====================================================== */
  function prGeom() {
    return PHONE
      ? { ch: { x: 12, y: 12, w: 576, h: 300 }, br: { x: 12, y: 320, w: 576, h: 112 }, ld: { x: 12, y: 440, w: 576, h: 300 }, ms: { x: 12, y: 748, w: 576, h: 84 } }
      : { ld: { x: 14, y: 14, w: 290, h: 440 }, ch: { x: 316, y: 14, w: 470, h: 300 }, br: { x: 316, y: 326, w: 470, h: 128 }, ms: { x: 14, y: 466, w: 772, h: 80 } };
  }
  function stepPr(dt) {
    const P = S.pr;
    P.mx = approach(P.mx == null ? P.x : P.mx, P.x, dt, 12);
    P.b = approach(P.b, benefit(P.x), dt, 8); P.r = approach(P.r, risk(P.x), dt, 8);
    TIERS.forEach((q, i) => { P.tier[i] = approach(P.tier[i], P.x > i * 20 ? 1 : 0, dt, 9); });
    if (goalOK(P.x)) P.found = true;
  }
  function drawPrivacy(t) {
    const G = prGeom(), P = S.pr, x = P.x, b = bR(x), r = rR(x), ok = goalOK(x);
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // 수집하는 정보 사다리
    const ld = G.ld; panel(ld.x, ld.y, ld.w, ld.h);
    D.text(ld.x + 14, ld.y + 26, '📥 이렇게 모아요', { size: 14, weight: 800, color: '#334155', align: 'left' });
    TIERS.forEach((q, i) => {
      const th = PHONE ? 46 : 72, y = ld.y + 40 + i * (th + (PHONE ? 8 : 8)), a = P.tier[i];
      const col = SciSim.color.mix('#cbd5e1', i < 2 ? '#14a058' : i < 4 ? '#f59e0b' : '#e2464b', a);
      ctx.fillStyle = 'rgba(30,45,80,.07)'; rr(ld.x + 10, y + 2, ld.w - 20, th, 12).fill();
      ctx.fillStyle = a > 0.5 ? '#fff' : '#f1f5f9'; rr(ld.x + 10, y, ld.w - 20, th, 12).fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(ld.x + 10, y, ld.w - 20, th, 12).stroke();
      ctx.globalAlpha = 0.35 + 0.65 * a;
      D.text(ld.x + 36, y + th / 2 + 9, q.ico, { size: PHONE ? 22 : 28 });
      D.text(ld.x + 62, y + th / 2 + 5, q.t, { size: 14, weight: 800, color: '#334155', align: 'left' });
      ctx.globalAlpha = 1;
      if (a > 0.5) D.text(ld.x + ld.w - 24, y + th / 2 + 6, '✔', { size: 16, weight: 800, color: col, align: 'center' });
    });
    // 곡선
    const ch = G.ch; panel(ch.x, ch.y, ch.w, ch.h);
    D.text(ch.x + 14, ch.y + 26, '수집 범위에 따른 편익과 위험', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const px = ch.x + 52, py = ch.y + 40, pw = ch.w - 52 - 18, ph = ch.h - 40 - 46;
    const X = (v) => px + v / 100 * pw, Y = (v) => py + ph - clamp(v, 0, 100) / 100 * ph;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(v)); ctx.lineTo(px + pw, Y(v)); ctx.stroke(); D.text(px - 6, Y(v) + 4, String(v), { size: 12, weight: 700, color: '#64748b', align: 'right' }); });
    [0, 20, 40, 60, 80, 100].forEach((v) => D.text(X(v), py + ph + 18, String(v), { size: 12, weight: 700, color: '#64748b' }));
    D.text(px + pw / 2, py + ph + 38, '개인정보 수집 범위 (%)', { size: 12.5, weight: 800, color: '#475569' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    if (P.found) { ctx.fillStyle = 'rgba(20,160,88,.13)'; ctx.fillRect(X(OKX.lo), py, X(OKX.hi) - X(OKX.lo), ph); D.text((X(OKX.lo) + X(OKX.hi)) / 2, py + 16, '목표 범위', { size: 12, weight: 800, color: '#0b6b39' }); }
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#14a058'; ctx.beginPath(); ctx.moveTo(px, Y(GOAL_B)); ctx.lineTo(px + pw, Y(GOAL_B)); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(px, Y(GOAL_R)); ctx.lineTo(px + pw, Y(GOAL_R)); ctx.stroke(); ctx.restore();
    D.text(px + 6, Y(GOAL_B) - 5, '편익 목표 ' + GOAL_B, { size: 11.5, weight: 800, color: '#0b6b39', align: 'left' });
    D.text(px + pw - 4, Y(GOAL_R) + 14, '위험 한도 ' + GOAL_R, { size: 11.5, weight: 800, color: '#b91c1c', align: 'right' });
    [[benefit, '#14a058'], [risk, '#e2464b']].forEach(([fn, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 3.2; ctx.beginPath(); for (let v = 0; v <= 100; v += 2) (v ? ctx.lineTo(X(v), Y(fn(v))) : ctx.moveTo(X(v), Y(fn(v)))); ctx.stroke(); });
    D.text(X(100) - 4, Y(100) + 16, '편익', { size: 13, weight: 800, color: '#14a058', align: 'right' });
    D.text(X(80) + 4, Y(risk(80)) + 22, '위험', { size: 13, weight: 800, color: '#e2464b', align: 'left' });
    const mx = P.mx == null ? x : P.mx;
    ctx.strokeStyle = 'rgba(27,35,51,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(mx), py); ctx.lineTo(X(mx), py + ph); ctx.stroke();
    D.sphere(X(mx), Y(benefit(mx)), 6.5, '#14a058', { outline: '#fff', outlineWidth: 2 }); D.sphere(X(mx), Y(risk(mx)), 6.5, '#e2464b', { outline: '#fff', outlineWidth: 2 });
    // 막대
    const br = G.br; panel(br.x, br.y, br.w, br.h);
    const bx = br.x + 76, bwid = br.w - 76 - 70;
    [['편익', P.b, b, '#14a058', GOAL_B], ['위험', P.r, r, '#e2464b', GOAL_R]].forEach((q, i) => {
      const y = br.y + 20 + i * (PHONE ? 42 : 48);
      D.text(br.x + 14, y + 17, q[0], { size: 15, weight: 800, color: q[3], align: 'left' });
      ctx.fillStyle = '#e8edf4'; rr(bx, y, bwid, 24, 12).fill();
      const wv = bwid * clamp(q[1] / 100, 0, 1);
      if (wv > 0.5) { ctx.fillStyle = q[3]; rr(bx, y, wv, 24, 12).fill(); }
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + bwid * q[4] / 100, y - 3); ctx.lineTo(bx + bwid * q[4] / 100, y + 27); ctx.stroke(); ctx.setLineDash([]);
      D.text(br.x + br.w - 14, y + 18, String(q[2]), { size: 18, weight: 800, color: q[3], align: 'right' });
    });
    if (r > GOAL_R) { const al = RM ? 1 : 0.55 + 0.45 * Math.sin(t * 9); ctx.globalAlpha = al; D.text(br.x + br.w - 44, br.y + (PHONE ? 104 : 110), '⚠️', { size: 22 }); ctx.globalAlpha = 1; }
    // 메시지
    const ms = G.ms;
    panel(ms.x, ms.y, ms.w, ms.h, ok ? '#ecfdf3' : '#fff', ok ? '#14a058' : null);
    const msg = ok ? '✅ 편익은 ' + GOAL_B + ' 이상, 위험은 ' + GOAL_R + ' 이하예요. 꼭 필요한 정보만 모으면 이익은 크고 위험은 작아요!'
      : b < GOAL_B ? '편익이 아직 ' + GOAL_B + '보다 작아요. 정보를 조금 더 모으면 편익이 늘어요.' : '위험이 한도 ' + GOAL_R + '를 넘었어요. 너무 많이 모으면 위험이 빠르게 커져요.';
    paraText(ms.x + 16, ms.y + 30, msg, ms.w - 32, 14, { color: ok ? '#0b6b39' : '#334155' });
  }

  /* ======================================================
     입력
     ====================================================== */
  const boardKey = () => (S.mode === 'match' ? 'match' : S.mode === 'sort' ? 'sort' : null);
  function setSlider(sel, v) { const s = $(sel); s.value = v; s.dispatchEvent(new Event('input')); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'live') {
        const G = liveGeom();
        for (let i = 0; i < 4; i++) { const c = G.card(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { liveToggle(i); break; } }
        return false;
      }
      const key = boardKey();
      if (key) { const B = S.board[key], c = bdPick(B, p); if (!c) return false; bdStart(B, c, p); B.dragP = p; return true; }
      if (S.mode === 'scatter') { const G = scGeom(); if (p.x >= G.px - 10 && p.x <= G.px + G.pw + 10 && p.y >= G.py && p.y <= G.py + G.ph) { setSlider('#sN', clamp(Math.round((p.x - G.px) / G.pw * SX), 0, 30)); return true; } return false; }
      if (S.mode === 'privacy') { const G = prGeom().ch; if (p.x >= G.x + 40 && p.x <= G.x + G.w && p.y >= G.y + 30 && p.y <= G.y + G.h - 30) { setSlider('#sPriv', clamp(Math.round((p.x - (G.x + 52)) / (G.w - 52 - 18) * 100), 0, 100)); return true; } return false; }
      return false;
    },
    move(p) {
      const key = boardKey();
      if (key) { const B = S.board[key]; if (B.drag) { bdMove(B, p); B.dragP = p; } return; }
      if (S.mode === 'scatter') { const G = scGeom(); setSlider('#sN', clamp(Math.round((p.x - G.px) / G.pw * SX), 0, 30)); }
      if (S.mode === 'privacy') { const G = prGeom().ch; setSlider('#sPriv', clamp(Math.round((p.x - (G.x + 52)) / (G.w - 52 - 18) * 100), 0, 100)); }
    },
    up(p) {
      const key = boardKey();
      if (key) { const B = S.board[key]; if (B.drag) { const c = B.drag.c; bdMove(B, p); bdDrop(B, c, p); B.dragP = null; } }
    },
    hover(p) {
      const key = boardKey();
      if (key) return bdPick(S.board[key], p) ? 'grab' : 'default';
      if (S.mode === 'live') { const G = liveGeom(); for (let i = 0; i < 4; i++) { const c = G.card(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return 'pointer'; } }
      return 'default';
    },
  });

  /* ======================================================
     컨트롤
     ====================================================== */
  const MODE_LABEL = {
    live: '🌡️ 실시간 측정 · 가상 교실 센서 보드', pile: '📚 쌓이는 데이터의 규모', match: '🃏 분야별 빅데이터 짝짓기', series: '📈 5일치 이산화 탄소 · 패턴 찾기',
    scatter: '🔵 산점도 · 학생 수와 농도', ice: '🍦 상관관계와 인과관계', sort: '⚖️ 빅데이터의 장점과 문제점', privacy: '🔐 개인정보 수집 범위',
  };
  const modeSeg = $('#modeSeg');
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    if (m === 'scatter') S.sc.t0 = S.clock;
    S.board.match.drag = null; S.board.sort.drag = null;
    updateCtl();
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#senTgl .tgl').forEach((b) => b.addEventListener('click', () => liveToggle(+b.dataset.i)));
  segBind('#spdSeg', (v) => { Lv.speed = +v; segSet('#spdSeg', v); $('#oSpd').textContent = ['멈춤', '보통', '빠르게'][+v]; });
  $('#bLiveReset').addEventListener('click', () => { Sound.click(); liveReset(); });
  segBind('#perSeg', (v) => { S.pile.period = v; segSet('#perSeg', v); $('#oPer').textContent = PER[v].label; });
  segBind('#nsSeg', (v) => { S.pile.ns = +v; segSet('#nsSeg', v); $('#oNs').textContent = v + '종'; });
  $('#bBoardReset').addEventListener('click', () => { Sound.click(); const k = boardKey(); if (k) bdReset(S.board[k]); });
  $$('#dayRow .tgl').forEach((b) => b.addEventListener('click', () => { Sound.click(); const d = +b.dataset.d; S.ser.days[d] = !S.ser.days[d]; b.setAttribute('aria-pressed', S.ser.days[d] ? 'true' : 'false'); }));
  segBind('#slotSeg', (v) => { S.ser.slot = v; segSet('#slotSeg', v); });
  $$('#ruleCtl .rule').forEach((r) => $$('button', r).forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ser.r[r.dataset.r] = b.dataset.v; $$('button', r).forEach((x) => x.classList.toggle('on', x === b)); })));
  SciSim.bindRange($('#sN'), $('#oN'), (v) => v + '명', (v) => { S.sc.n = v; });
  $('#bTemp').addEventListener('click', () => { Sound.click(); S.ice.temp = !S.ice.temp; $('#bTemp').textContent = S.ice.temp ? '🌡️ 기온 숨기기' : '🌡️ 기온도 함께 보기'; });
  SciSim.bindRange($('#sPriv'), $('#oPriv'), (v) => v + ' %', (v) => { S.pr.x = v; });

  /* ======================================================
     읽음 칸
     ====================================================== */
  function readouts() {
    const m = S.mode;
    if (m === 'live') setRead(['시각', clockStr(Math.max(0, Math.min(Lv.last, DAY_LEN - 1)))], ['기록한 줄(분)', liveComplete() + ' 줄'], ['저장된 값', liveValues() + ' 개']);
    else if (m === 'pile') setRead(['기간', PER[S.pile.period].label], ['센서', S.pile.ns + '종'], ['쌓인 값', fmtN(pileN()) + ' 개']);
    else if (m === 'match') { const B = S.board.match; setRead(['놓은 카드', bdPlaced(B) + ' / ' + B.cards.length], ['분야', '4가지'], ['쓰임', '예보·진단·신약·길 안내']); }
    else if (m === 'series') { const st = serStats(S.ser.days, S.ser.slot); setRead(['평균 농도', fAvg(st.avg) + (st.avg == null ? '' : ' ppm')], ['1분당 변화', fSlope(st.slope) + (st.slope == null ? '' : ' ppm')], ['사용한 자료', fmtN(st.n) + ' 개']); }
    else if (m === 'scatter') setRead(['학생 수', S.sc.n + ' 명'], ['추세선 값', Math.round(trendAt(S.sc.n)) + ' ppm'], ['점의 수', PTS.length + ' 개']);
    else if (m === 'ice') setRead(['기온 표시', S.ice.temp ? '켜짐' : '꺼짐'], ['판매량(3→8월)', ICE.sales[0] + ' → ' + ICE.sales[5] + ' 천 개'], ['사고(3→8월)', ICE.acc[0] + ' → ' + ICE.acc[5] + ' 건']);
    else if (m === 'sort') { const B = S.board.sort; setRead(['놓은 카드', bdPlaced(B) + ' / ' + B.cards.length], ['장점 상자', B.cards.filter((c) => c.zone === 'good').length + ' 장'], ['문제점 상자', B.cards.filter((c) => c.zone === 'bad').length + ' 장']);
    } else setRead(['수집 범위', S.pr.x + ' %'], ['편익', String(bR(S.pr.x))], ['위험', String(rR(S.pr.x))]);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) {
      liveReset(); Lv.on = [false, false, false, false]; Lv.speed = 1; Lv.gauge = [0, 0, 0, 0]; syncLiveCtl(); segSet('#spdSeg', 1); $('#oSpd').textContent = '보통'; setMode('live');
    } else if (li === 1) {
      S.pile.period = 'hour'; S.pile.ns = 1; segSet('#perSeg', 'hour'); segSet('#nsSeg', 1); $('#oPer').textContent = PER.hour.label; $('#oNs').textContent = '1종';
      bdReset(S.board.match); setMode('pile');
    } else if (li === 2) {
      S.ser.days = [true, true, true, true, true]; S.ser.slot = 'all'; S.ser.r = { r1: null, r2: null, r3: null }; S.ser.seen = { cls: false, brk: false, wke: false };
      $$('#dayRow .tgl').forEach((b) => b.setAttribute('aria-pressed', 'true')); segSet('#slotSeg', 'all'); $$('#ruleCtl .segmented button').forEach((b) => b.classList.remove('on'));
      setSlider('#sN', 20); S.ice.temp = false; $('#bTemp').textContent = '🌡️ 기온도 함께 보기'; setMode('series');
    } else {
      bdReset(S.board.sort); S.pr.found = false; setSlider('#sPriv', 0); setMode('sort');
    }
  }
  const ensure = (m) => { if (S.mode !== m) setMode(m); };
  const tooLong = (n) => fmtN(n);

  const EX_TERM = PER.term.min * 4;
  const levels = [
    {
      title: '실시간 측정: 교실 센서로 자료 모으기', short: '실시간 측정', icon: '🌡️', phase: '실험',
      features: ['live'],
      intro: '<p class="si-q">❓ 탐구 질문: 엄청나게 많은 자료가 쌓이면 무엇을 알 수 있을까? 그 자료는 모두 안전하게 쓰일까?</p>' +
        '<div class="si-link">🔗 중학교에서 <b>첨단 과학기술과 미래</b>를 배우며 빅데이터가 생활 곳곳에 쓰인다는 것을 보았고, 통합과학1 <b>디지털 변환과 통신</b>에서 센서 신호가 0과 1로 바뀐다는 것을 배웠어요. 이번에는 그렇게 만든 <b>디지털 데이터</b>가 많이 쌓이면 어떤 일이 생기는지 알아봐요.</div>' +
        '<p>가상 교실에 <b>센서 보드</b>가 있어요. 온도·이산화 탄소·조도·소음 센서를 켜면 <b>1분마다</b> 값이 기록되고 그래프와 표에 실시간으로 쌓여요. ⏩ 시간을 빨리 감아 한 시간 동안의 자료를 모아 봐요.</p>',
      setup() { enterLevel(0); showHint('센서 카드를 눌러 켜고, ⏩ 빠르게를 눌러요', 6000); },
      recap: '센서가 측정한 값을 디지털 데이터로 저장하면 컴퓨터로 쉽게 모으고 처리할 수 있어요.',
      summary: '<ul><li>센서로 측정한 값을 <b>디지털 데이터</b>로 저장하면 기록·전송·계산이 쉬워요. (실시간 기록)</li><li>가상 교실에서 온도·이산화 탄소·조도·소음을 <b>1분 간격</b>으로 기록했어요.</li><li>센서 4종을 1시간 측정하면 센서마다 60개, 모두 <b>240개</b>의 값이 쌓여요.</li></ul>',
      missions: [
        {
          title: '센서 4종으로 1시간 측정하기',
          goal: '센서 <b>4종을 모두 켜고</b> 1분 간격 기록을 <b>60줄 이상</b> 모으세요. (⏩ 빠르게로 시간을 감아요)',
          hint: '센서 카드나 오른쪽 버튼으로 4종을 모두 켠 뒤 ⏩ 빠르게를 눌러요. 센서가 모두 켜진 상태로 60분이 지나야 해요.',
          setup() { ensure('live'); },
          check: () => liveComplete() >= 60, hold: 0.5,
          status: () => '켜진 센서 <b>' + Lv.on.filter(Boolean).length + ' / 4</b> ' + mark(Lv.on.every(Boolean)) + ' · 4종이 모두 기록된 줄 <b>' + Math.min(liveComplete(), 60) + ' / 60</b> ' + mark(liveComplete() >= 60),
          explain: '1분마다 한 번씩 센서 4종의 값을 기록하면 1시간에 <b>60줄 × 4종 = 240개</b>의 값이 쌓여요. 센서가 측정한 값을 디지털 형태로 바꿔 저장하기 때문에 이렇게 빠르게 모으고 표와 그래프로 바꿀 수 있어요.',
        },
        {
          type: 'quiz', title: '디지털 데이터의 장점',
          goal: '센서 값을 <b>디지털 데이터</b>로 저장하는 것의 장점으로 알맞은 것은?',
          setup() { ensure('live'); },
          choices: ['디지털로 바꾸면 값이 저절로 더 정확해진다', '숫자로 저장하면 컴퓨터로 쉽게 저장·전송·처리할 수 있다', '디지털 데이터는 사람이 직접 읽어야만 분석할 수 있다', '디지털 데이터는 한 번 저장하면 다른 곳으로 보낼 수 없다'],
          answer: 1,
          feedback: ['디지털로 바꾼다고 센서의 측정 오차가 사라지지는 않아요.', '', '컴퓨터가 계산해서 대신 분석해 줄 수 있어요.', '디지털 데이터는 인터넷으로 쉽게 전송할 수 있어요.'],
          explain: '디지털 데이터는 숫자(0과 1)로 되어 있어서 <b>저장·전송·처리가 쉬워요</b>. 그래서 실시간으로 많은 자료를 모으고 컴퓨터로 계산할 수 있어요.',
        },
      ],
    },
    {
      title: '데이터 축적: 얼마나 쌓일까?', short: '데이터 축적', icon: '📚', phase: '관찰',
      features: ['pile', 'match'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서 4종이 1시간 동안 값 240개를 만들었어요. 이 측정을 하루, 한 학기 동안 계속하면 얼마나 쌓일까요?</div>' +
        '<p>기록한 <b>기간</b>과 <b>센서 수</b>를 바꿔 쌓이는 값의 개수를 비교해요. 그다음 기상·유전체·신약·교통 분야에서 빅데이터가 어떻게 쓰이는지 카드를 짝지어 봐요.</p>',
      setup() { enterLevel(1); showHint('기간과 센서 수를 바꿔 봐요', 5000); },
      recap: '빅데이터는 규모(Volume)가 크고 빠르게(Velocity) 만들어지며 형태가 다양해서(Variety) 컴퓨터로 처리해야 해요.',
      summary: '<ul><li>1분마다 기록하면 센서 1종은 1시간에 <b>60개</b>, 하루에 <b>' + fmtN(PER.day.min) + '개</b>, 한 학기(100일)에 <b>' + fmtN(PER.term.min) + '개</b>가 쌓여요. 센서 4종이면 한 학기에 <b>' + fmtN(EX_TERM) + '개</b>예요.</li><li><b>빅데이터</b>의 특징: 규모가 크고(Volume), 빠르게 생성되고(Velocity), 형태가 다양해요(Variety). 사람이 직접 읽을 수 없어 컴퓨터로 처리해요.</li><li>쓰이는 분야: 기상 관측(날씨 예보), 유전체 분석(약 30억 염기쌍), 신약 개발(후보 물질 걸러 내기), 교통(실시간 길 안내) 등</li></ul>',
      missions: [
        {
          title: '한 학기 동안 쌓이는 양 보기',
          goal: '기간을 <b>한 학기</b>, 센서를 <b>4종</b>으로 바꿔 쌓이는 값의 개수를 확인하세요.',
          hint: '오른쪽에서 기간은 한 학기, 센서 수는 4종을 골라요. 막대 눈금은 10배씩 커져요.',
          setup() { ensure('pile'); },
          check: () => S.pile.period === 'term' && S.pile.ns === 4, hold: 1.2,
          status: () => '기간 <b>' + PER[S.pile.period].label + '</b> ' + mark(S.pile.period === 'term') + ' · 센서 <b>' + S.pile.ns + '종</b> ' + mark(S.pile.ns === 4),
          explain: '한 학기(100일) 동안 1분마다 센서 4종이 기록하면 100 × ' + fmtN(PER.day.min) + ' × 4 = <b>' + fmtN(EX_TERM) + '개</b>(약 ' + Math.round(EX_TERM / 10000) + '만 개)가 쌓여요. 값 1개를 1초에 읽어도 <b>' + readTime(EX_TERM) + '</b>이 걸려서 사람이 직접 읽을 수 없어요.',
        },
        {
          title: '분야별 빅데이터 짝짓기',
          goal: '설명 카드 <b>4장</b>을 알맞은 분야에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '위성·레이더는 어느 분야일까요? 염기쌍은 유전체, 후보 물질은 약, 차량 이동 자료는 교통과 이어져요.',
          manual: true,
          setup() { ensure('match'); },
          status: () => '놓은 카드 <b>' + bdPlaced(S.board.match) + ' / 4</b>',
          check: () => bdJudge(S.board.match, (c) => c.zone === c.ans),
          explain: '<b>기상 관측</b>은 관측소·위성·레이더에서 쏟아지는 자료로 날씨를 계산하고, <b>유전체 분석</b>은 약 30억 염기쌍의 서열을 읽어요. 해독에 약 13년(1990~2003년)이 걸린 일이 지금은 며칠 이내에 가능해졌어요. <b>신약 개발</b>은 후보 물질 수백만 개를 컴퓨터로 걸러 내고, <b>교통</b>은 실시간 자료로 길을 안내해요.',
        },
        {
          type: 'quiz', title: '컴퓨터가 필요한 까닭',
          goal: '빅데이터를 사람이 직접 읽지 않고 <b>컴퓨터로 처리</b>해야 하는 까닭으로 가장 알맞은 것은?',
          setup() { ensure('pile'); },
          choices: ['컴퓨터로 처리하면 센서의 오차가 완전히 없어지기 때문이다', '자료가 많을수록 사람이 읽으면 항상 틀리기 때문이다', '빅데이터는 숫자 자료만 있어서 컴퓨터만 읽을 수 있기 때문이다', '규모가 크고 빠르게 만들어지며 형태도 다양해서 사람이 다 읽을 수 없기 때문이다'],
          answer: 3,
          feedback: ['컴퓨터가 계산해도 센서가 가진 측정 오차는 남아 있어요.', '사람이 읽어도 틀리는 것은 아니에요. 다만 양이 너무 많아서 다 읽을 수 없어요.', '빅데이터에는 숫자뿐 아니라 글·사진·소리 같은 다양한 형태가 있어요.', ''],
          explain: '빅데이터는 <b>규모(Volume)</b>가 크고, <b>속도(Velocity)</b>가 빠르게 만들어지며, <b>다양성(Variety)</b>도 커서 사람이 직접 읽을 수 없어요. 그래서 컴퓨터로 저장하고 처리해야 해요.',
        },
      ],
    },
    {
      title: '패턴 찾기: 자료에서 규칙을 읽어요', short: '패턴 찾기', icon: '🔍', phase: '분석',
      features: ['series', 'scatter', 'ice'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빅데이터는 사람이 다 읽을 수 없어 컴퓨터가 처리한다고 했어요. 이번에는 컴퓨터가 하는 일처럼, 5일치 이산화 탄소 자료를 <b>필터</b>로 걸러 규칙을 찾아봐요.</div>' +
        '<p>요일과 시간대를 골라 <b>평균</b>과 <b>1분당 변화</b>를 비교하고, 학생 수와 농도의 <b>산점도</b>를 살펴봐요. 그리고 두 값이 함께 변해도 <b>원인과 결과가 아닐 수 있다</b>는 것도 확인해요.</p>' +
        '<p>🔎 <b>자료 점검</b>: 이 자료는 가상 교실에서 5일 동안 1분마다 측정한 교육용 예시예요. 어디서, 언제, 어떻게 측정했는지 확인하는 습관이 중요해요.</p>',
      setup() { enterLevel(2); showHint('요일과 시간대를 바꿔 평균과 변화를 비교해요', 6000); },
      recap: '필터로 자료를 걸러 비교하면 규칙을 찾을 수 있어요. 두 값이 함께 변해도(상관) 반드시 원인과 결과(인과)는 아니에요.',
      summary: '<ul><li>쌓인 자료를 요일·시간대로 <b>필터링</b>해 평균과 변화를 비교하면 규칙이 보여요.</li><li>평일 수업 중에는 이산화 탄소가 1분당 평균 <b>' + fSlope(ST.cls.slope) + ' ppm</b> 올라가고, 쉬는 시간 환기 때는 <b>' + fSlope(ST.brk.slope) + ' ppm</b> 내려가요. 빈 교실인 주말의 평균(' + fAvg(ST.wke.avg) + ' ppm)은 평일 평균(' + fAvg(ST.wkd.avg) + ' ppm)보다 낮아요.</li><li><b>산점도</b>에서 학생 수가 많을수록 평균 농도가 높아지는 경향이 보여요. (상관)</li><li>상관관계가 있어도 <b>인과관계</b>라고 단정하면 안 돼요. 아이스크림 판매량과 물놀이 사고는 <b>기온</b>이라는 숨은 변수 때문에 함께 늘어요.</li></ul>',
      missions: [
        {
          title: '필터로 규칙 찾기',
          goal: '요일과 시간대 필터로 비교하고, 규칙 문장 <b>3개</b>를 완성한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '평일(목·금·월)만 켜고 시간대를 수업 중 / 쉬는 시간으로 바꿔 보세요. 그다음 토·일만 켜서 평균을 비교해요.',
          manual: true,
          setup() { ensure('series'); },
          status: () => '수업 중 보기 ' + mark(S.ser.seen.cls) + ' · 쉬는 시간 보기 ' + mark(S.ser.seen.brk) + ' · 주말만 보기 ' + mark(S.ser.seen.wke),
          check() {
            const r = S.ser.r;
            if (!r.r1 || !r.r2 || !r.r3) return '문장 <b>3개</b>를 모두 완성해 주세요.';
            const bad = [];
            if (r.r1 !== 'up') bad.push('①');
            if (r.r2 !== 'down') bad.push('②');
            if (r.r3 !== 'low') bad.push('③');
            return bad.length ? bad.join(', ') + ' 문장을 다시 확인해 보세요. 요일·시간대를 바꾸며 <b>1분당 변화</b>와 <b>평균 농도</b>를 비교해요.' : true;
          },
          explain: '평일 수업 중에는 1분당 평균 <b>' + fSlope(ST.cls.slope) + ' ppm</b>씩 올라요. 학생들이 내쉰 숨 때문이에요. 쉬는 시간에 환기하면 1분당 <b>' + fSlope(ST.brk.slope) + ' ppm</b>씩 내려가요. 사람이 없는 주말의 평균은 <b>' + fAvg(ST.wke.avg) + ' ppm</b>으로 평일 평균 ' + fAvg(ST.wkd.avg) + ' ppm보다 낮아요. 이렇게 필터로 걸러 비교하면 큰 자료에서 규칙을 찾을 수 있어요.',
        },
        {
          type: 'quiz', title: '산점도 읽기',
          goal: '산점도의 점 하나는 <b>한 교시</b>예요. 학생 수가 많아질수록 점들은 어떻게 놓여 있나요?',
          setup() { ensure('scatter'); showHint('점선을 끌어 학생 수를 바꿔 보세요', 5000); },
          choices: ['오른쪽 위로 올라가요. 학생 수가 많을수록 평균 이산화 탄소 농도가 높은 경향이 있어요.', '오른쪽 아래로 내려가요. 학생 수가 많을수록 농도가 낮아져요.', '위아래로 제멋대로 흩어져 있어서 아무 관계가 없어요.', '학생 수가 0명일 때 농도가 가장 높아요.'],
          answer: 0,
          feedback: ['', '점들은 오른쪽 위로 올라가는 모양이에요. 학생이 많을수록 농도가 높아요.', '점들이 추세선 가까이에 모여 있어요. 분명한 관계가 있어 보여요.', '학생 수가 0명인 빈 교실은 농도가 가장 낮은 점들이에요.'],
          explain: '점들이 <b>오른쪽 위로 올라가는 모양</b>이에요. 학생 수가 많을수록 평균 농도가 높은 경향이 있고(상관), 추세선으로 학생 수에 따른 농도를 예측할 수도 있어요. 이것이 큰 자료를 분석해서 얻는 <b>장점</b>이에요.',
        },
        {
          type: 'quiz', title: '상관관계와 인과관계',
          goal: '아이스크림 판매량과 물놀이 사고 건수가 함께 늘어요. 이 자료로 알맞게 말한 것은?',
          setup() { ensure('ice'); },
          choices: ['아이스크림을 많이 먹어서 물놀이 사고가 늘었다', '물놀이 사고가 늘어서 아이스크림이 더 많이 팔렸다', '두 값이 함께 변하지만, 기온 같은 숨은 변수가 둘 다에 영향을 주었을 수 있다', '두 값은 아무 관계가 없다'],
          answer: 2,
          feedback: ['함께 변한다고 해서 한쪽이 다른 쪽의 원인은 아니에요.', '반대 방향의 인과도 이 자료만으로는 알 수 없어요.', '', '두 값이 함께 변하는 상관은 분명히 있어요. 다만 원인은 아닐 수 있어요.'],
          explain: '두 값이 함께 변하는 것을 <b>상관관계</b>라고 해요. 그런데 날씨가 더운 달에 아이스크림도 많이 팔리고 물놀이하는 사람도 많아서 사고가 늘어요. <b>숨은 변수(기온)</b>가 둘 다에 영향을 준 거예요. 상관관계를 인과관계로 오해하면 잘못된 결론에 이를 수 있어요.',
        },
      ],
    },
    {
      title: '장점과 문제점: 빅데이터를 어떻게 쓸까?', short: '장점·문제점', icon: '⚖️', phase: '적용',
      features: ['sort', 'privacy'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쌓인 자료에서 규칙을 찾고, 상관관계를 인과관계로 오해하면 안 된다는 것을 배웠어요. 이제 빅데이터가 우리 사회에서 쓰이는 사례를 장점과 문제점으로 나누어 따져 봐요.</div>' +
        '<p>사례 카드 8장을 분류하고, 개인정보를 <b>얼마나 모을지</b> 정하면 <b>편익</b>과 <b>위험</b>이 어떻게 변하는지 알아봐요. 좋은 점만 보지 말고 문제점도 함께 생각해야 해요.</p>',
      setup() { enterLevel(3); showHint('카드를 끌어 장점·문제점 상자에 놓아요', 6000); },
      recap: '빅데이터는 정확한 예측과 맞춤형 서비스를 가능하게 하지만, 개인정보 침해·편향·유출 같은 문제점도 있어서 함께 따져 보아야 해요.',
      summary: '<ul><li><b>장점</b>: 더 정확한 예측(기상·교통), 맞춤형 서비스(맞춤 의약), 새로운 규칙 발견, 시간과 비용 절감</li><li><b>문제점</b>: 개인정보 침해와 유출, 편향된 자료로 인한 잘못된 판단(차별), 자료 오류·품질, 상관을 인과로 오해</li><li>개인정보를 많이 모을수록 편익은 점점 느리게 늘고 위험은 점점 빠르게 늘어요. 수집 범위가 ' + OKX.lo + '~' + OKX.hi + ' %일 때 편익 ' + GOAL_B + ' 이상, 위험 ' + GOAL_R + ' 이하가 돼요. (교육용 예시 모형)</li><li><b>자료 점검</b>: 자료의 출처, 표본의 수, 측정 방법을 확인하고 비판적으로 평가해요.</li></ul>',
      missions: [
        {
          title: '장점과 문제점 분류하기',
          goal: '사례 카드 <b>8장</b>을 <b>장점</b>과 <b>문제점</b> 상자에 나누고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '예보나 길 안내처럼 쓸모 있는 사례는 장점이에요. 허락 없이 모으거나, 한쪽 자료만 쓰거나, 새어 나간 사례는 문제점이에요.',
          manual: true,
          setup() { ensure('sort'); },
          status: () => '놓은 카드 <b>' + bdPlaced(S.board.sort) + ' / 8</b>',
          check: () => bdJudge(S.board.sort, (c) => c.zone === c.ans),
          explain: '기상 예보·맞춤 의약·교통 예측·접촉자 추적은 큰 자료 덕분에 얻는 <b>장점</b>이에요. 반면 허락 없는 얼굴 사진 수집과 동의 없는 기록 수집은 <b>개인정보 침해</b>, 한쪽 집단 자료로 배운 추천은 <b>편향</b>, 정보가 새어 나간 일은 <b>유출·보안</b> 문제예요. (감염병 환자의 동선을 어디까지 공개할지는 사회적 쟁점이라서 다음 차시에서 더 따져 봐요.)',
        },
        {
          title: '편익은 크게, 위험은 작게',
          goal: '개인정보 수집 범위를 조절해 <b>편익 ' + GOAL_B + ' 이상</b>이면서 <b>위험 ' + GOAL_R + ' 이하</b>로 만들어 보세요.',
          hint: '수집 범위를 ' + OKX.lo + ' ~ ' + OKX.hi + ' % 사이로 맞추면 돼요. 너무 적으면 편익이 부족하고, 너무 많으면 위험이 커져요.',
          setup() { ensure('privacy'); },
          check: () => goalOK(S.pr.x), hold: 1.0,
          status: () => '수집 범위 <b>' + S.pr.x + ' %</b> · 편익 <b>' + bR(S.pr.x) + '</b> ' + mark(bR(S.pr.x) >= GOAL_B) + ' · 위험 <b>' + rR(S.pr.x) + '</b> ' + mark(rR(S.pr.x) <= GOAL_R),
          explain: '정보를 많이 모을수록 편익은 점점 <b>느리게</b> 늘고, 위험은 점점 <b>빠르게</b> 늘어요. 그래서 목적에 꼭 필요한 만큼만 모으는 것이 중요해요. (이 그래프는 개념을 설명하는 교육용 모형이에요.)',
        },
        {
          type: 'quiz', title: '자료 점검: 믿어도 될까?',
          goal: '어떤 글에 <b>"우리 반 친구 5명에게 물어보니 90 %가 새 학습 앱이 성적을 올려 준다고 했다."</b>라고 쓰여 있어요(출처 표시 없음). 믿기 전에 할 일로 알맞은 것은?',
          setup() { ensure('sort'); },
          choices: ['친구 5명이면 충분하니 바로 믿는다', '90 %로 수치가 높으니 믿어도 된다', '누가 조사했는지(출처), 몇 명에게 물었는지(표본 수), 어떻게 측정했는지(방법)를 확인한다', '글이 많이 공유되었으면 믿어도 된다'],
          answer: 2,
          feedback: ['5명은 너무 적어서 전체를 대표하기 어려워요.', '비율이 높아도 표본이 5명뿐이면 믿기 어려워요.', '', '많이 퍼졌다고 해서 사실인 것은 아니에요.'],
          explain: '빅데이터 시대에는 자료가 넘쳐나기 때문에 <b>출처, 표본의 수, 측정 방법</b>을 확인하고 비판적으로 평가하는 <b>디지털 소양</b>이 중요해요. 표본이 적거나 한쪽으로 치우친 자료는 잘못된 결론을 낳을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-bigdata', mount: '#game', badge: '빅데이터 탐정', homeHref: '../../index.html#h1b',
    featureLabels: { live: '🌡️ 센서 보드 · 시간 빨리 감기', pile: '📚 쌓이는 규모 보기', match: '🃏 분야 짝짓기 카드', series: '📈 요일·시간대 필터', scatter: '🔵 산점도 · 추세선', ice: '🍦 숨은 변수 보기', sort: '⚖️ 장점·문제점 상자', privacy: '🔐 개인정보 수집 범위' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  setSlider('#sN', 20);
  updateCtl();
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    bdStep(S.board.match, dt); bdStep(S.board.sort, dt);
    stepLive(dt); stepPile(dt); stepSer(dt); stepPr(dt);
    S.sc.mk = approach(S.sc.mk, S.sc.n, dt, 12);
    S.ice.a = approach(S.ice.a, S.ice.temp ? 1 : 0, dt, 6);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    const m = S.mode;
    if (m === 'live') drawLive(t); else if (m === 'pile') drawPile(t); else if (m === 'match') drawMatch(t); else if (m === 'series') drawSeries(t);
    else if (m === 'scatter') drawScatter(t); else if (m === 'ice') drawIce(t); else if (m === 'sort') drawSort(t); else drawPrivacy(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, ST, TREND, OKX, PTS, PER, SPD, get game() { return game; }, setMode, enterLevel, liveToggle, liveComplete, serStats, trendAt, bR, rR, goalOK, readTime, setSlider,
    fillBoard(key, right) { const B = S.board[key]; bdFill(B, (c, i) => (right === false ? (key === 'sort' ? (c.ans === 'good' ? 'bad' : 'good') : FIELDS[(FIELDS.findIndex((f) => f.id === c.ans) + 1) % 4].id) : c.ans)); },
    judge(key) { const B = S.board[key]; return bdJudge(B, (c) => c.zone === c.ans); },
    allOn() { for (let i = 0; i < 4; i++) liveToggle(i, true); },
  };

})();
