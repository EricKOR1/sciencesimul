/* =========================================================
   통합과학2 Ⅲ. 과학과 미래 사회 - 사물인터넷과 센서 (단원 4차시)
   성취기준 [10통과2-03-03] 인공지능 로봇, 사물인터넷 등과 같이 과학기술의 발전을 인간 삶과 환경 개선에 활용하는 사례를 찾고,
   이러한 과학기술의 발전이 미래 사회에 미치는 유용성과 한계를 예측할 수 있다. (사물인터넷 부분)
   ① 실험: 센서 측정 (스마트 화분의 토양 수분·온도·조도, 센서 값 → 숫자)
   ② 모형: 연결과 전송 (센서 → 통신 → 서버 → 작동기, 통신 끊김·지연)
   ③ 탐구: 자동 제어 (임계값 규칙으로 하루 24시간 시뮬레이션)
   ④ 예측: 유용성·한계 (스마트 시티 사례 짝짓기, 센서 고장·해킹·통신 장애 예측)
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
     모형: 스마트 화분 (교육용 예시 값)
     ====================================================== */
  const PUMP_ADD = 15, WATER_TICK = 0.2;              // 펌프가 켜지면 10분마다 수분 +15 %p, 물 0.2 L
  const DAY_DROP = 5, NIGHT_DROP = 1;                 // 낮(06~18시) 1시간에 5 %p, 밤 1 %p 감소
  const EVAP_DAY = DAY_DROP / 6, EVAP_NIGHT = NIGHT_DROP / 6;
  const DRY = 40, DRY2 = 30, WET = 85, DRAIN = 0.5;   // 부족·심한 부족·과습 기준, 넘친 물이 빠지는 비율
  const PEN_DRY = 0.25, PEN_DRY2 = 0.5, PEN_WET = 0.4; // 10분마다 건강도 감소
  const GOAL_H = 90, GOAL_L = 1.0, GOAL_PUMPS = Math.round(GOAL_L / WATER_TICK), SICK = 70;
  const TICKS = 144, START_M = 60;
  const MOIST_RANGE = 20, TEMP_RANGE = 5, LUX_RANGE = 300;
  const clk = (h) => { const hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60); return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2); };

  function newRun(T, ev) { return { T, ev, k: 0, m: START_M, h: 100, pumps: 0, pump: false, frozen: null, series: [START_M], pumpOn: [], done: false, acc: 0 }; }
  function tickRun(r) {
    const hr = r.k / 6, evap = (hr >= 6 && hr < 18) ? EVAP_DAY : EVAP_NIGHT;
    let read = r.m;
    if (r.ev === 'stuck') read = 0;
    if (r.ev === 'comm' && hr >= 6) { if (r.frozen == null) r.frozen = r.m; read = r.frozen; }
    let pump = read < r.T;
    if (r.ev === 'hack' && hr >= 3 && hr < 6) pump = true;
    r.m -= evap;
    if (pump) { r.m += PUMP_ADD; r.pumps++; }
    if (r.m > WET) r.m -= DRAIN * (r.m - WET);
    r.m = clamp(r.m, 0, 100);
    if (r.m < DRY) r.h -= PEN_DRY;
    if (r.m < DRY2) r.h -= PEN_DRY2;
    if (r.m > WET) r.h -= PEN_WET;
    r.h = Math.max(0, r.h);
    r.pump = pump; r.series.push(r.m); r.pumpOn.push(pump);
    r.k++; if (r.k >= TICKS) r.done = true;
  }
  function runFull(T, ev) { const r = newRun(T, ev); while (!r.done) tickRun(r); return r; }
  const HR = (r) => Math.round(r.h);                  // 화면·판정에 쓰는 건강도(정수)
  const WR = (r) => r.pumps * WATER_TICK;             // 물 사용량(L)
  const fL = (l) => l.toFixed(1);
  const goodRun = (r) => HR(r) >= GOAL_H && r.pumps <= GOAL_PUMPS;
  const classify = (r) => (HR(r) < SICK ? (r.pumps > GOAL_PUMPS ? 'flood' : 'wilt') : r.pumps > GOAL_PUMPS ? 'waste' : 'none');
  const FEAS = (() => { const a = []; for (let T = 10; T <= 90; T += 5) if (goodRun(runFull(T, null))) a.push(T); return { lo: a[0], hi: a[a.length - 1], list: a }; })();
  const EVRUN = { stuck: runFull(50, 'stuck'), hack: runFull(50, 'hack'), comm: runFull(50, 'comm') };
  const EV_INFO = {
    stuck: { name: '센서 고장', ico: '🔧' }, hack: { name: '해킹', ico: '🕸️' }, comm: { name: '통신 장애', ico: '📵' },
  };
  const PRED_TXT = { waste: '물이 많이 낭비돼요', flood: '물이 넘쳐 식물이 상해요', wilt: '물을 못 받아 시들어요', none: '별다른 변화가 없어요' };

  // 센서: 물리량 → 0~1023 눈금 → 환산한 값
  const ADC = 1023;
  const SEN = [
    { k: 'M', name: '토양 수분', ico: '💧', unit: '%', col: '#0ea5e9', pin: 'A0', range: 100, lo: 0, hi: 100, conv: (raw) => Math.round(raw / ADC * 100), fmt: (v) => String(v) },
    { k: 'T', name: '온도', ico: '🌡️', unit: '°C', col: '#f26b3a', pin: 'A1', range: 50, lo: 10, hi: 40, conv: (raw) => Math.round(raw / ADC * 50 * 10) / 10, fmt: (v) => v.toFixed(1) },
    { k: 'L', name: '조도', ico: '💡', unit: 'lux', col: '#f59e0b', pin: 'A2', range: 1000, lo: 0, hi: 1000, conv: (raw) => Math.round(raw / ADC * 1000), fmt: (v) => String(v) },
  ];
  const toRaw = (i, phys) => clamp(Math.round(phys / SEN[i].range * ADC), 0, ADC);
  const luxOf = (s) => 50 + 9.5 * s;  // 빛 세기 0~100 % → 조도 50~1000 lux

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sense', fade: 0, clock: 0,
    ph: { M: START_M, Mt: START_M, T: 25, s: 40, drop: 0, flow: 0 },
    sn: { hist: [[], [], []], samp: 0, rmin: [0, 0, 0], rmax: [0, 0, 0], init: false },
    net: { comm: 'ok', packets: [], sendT: 0, srv: { v: START_M, got: 0, n: 0 }, froze: false, resumed: false, froze0: 0, board: null },
    sim: { T: 50, run: null, results: {}, tried: {}, last: null, drops: [] },
    ev: { sel: null, pred: {}, done: {}, ok: {}, run: null },
    city: null,
  };
  const Ph = S.ph;
  const readM = () => SEN[0].conv(toRaw(0, Ph.M)), readT = () => SEN[1].conv(toRaw(1, Ph.T)), readL = () => SEN[2].conv(toRaw(2, luxOf(Ph.s)));
  const readAll = () => [readM(), readT(), readL()];

  /* ======================================================
     화분 그림 (센서·시뮬레이션에서 함께 써요)
     ====================================================== */
  const mixC = SciSim.color.mix, rgba = SciSim.color.rgba;
  function drawPlant(cx, baseY, vit, t, sc) {
    const droop = Math.pow(1 - clamp(vit, 0, 100) / 100, 0.8) * 1.15;
    const col = mixC('#8a6d3b', '#2f9e44', clamp(vit / 100, 0, 1)), dark = SciSim.color.shade(col, -0.25);
    const stemH = 118 * sc * (0.78 + 0.22 * vit / 100), sway = RM ? 0 : Math.sin(t * 1.3) * 5 * sc;
    const topX = cx + sway + droop * 14 * sc, topY = baseY - stemH;
    ctx.strokeStyle = dark; ctx.lineWidth = 6 * sc; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.quadraticCurveTo(cx + sway * 0.3, baseY - stemH * 0.55, topX, topY); ctx.stroke();
    const at = (u) => ({ x: (1 - u) * (1 - u) * cx + 2 * (1 - u) * u * (cx + sway * 0.3) + u * u * topX, y: (1 - u) * (1 - u) * baseY + 2 * (1 - u) * u * (baseY - stemH * 0.55) + u * u * topY });
    const leaf = (p, phi, rx, ry) => {
      ctx.save(); ctx.translate(p.x + Math.cos(phi) * rx * 0.95, p.y + Math.sin(phi) * rx * 0.95); ctx.rotate(phi);
      const g = ctx.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, SciSim.color.shade(col, 0.25)); g.addColorStop(1, col);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5 * sc; ctx.beginPath(); ctx.moveTo(-rx * 0.8, 0); ctx.lineTo(rx * 0.8, 0); ctx.stroke(); ctx.restore();
    };
    [0.36, 0.58, 0.8].forEach((u, i) => {
      const p = at(u), lift = -0.75 + droop * 1.9, rx = (34 - i * 5) * sc, ry = (12.5 - i * 1.5) * sc;
      leaf(p, lift, rx, ry); leaf(p, Math.PI - lift, rx, ry);
    });
    leaf(at(1), -Math.PI / 2 + droop * 1.2 * (RM ? 1 : 1), 26 * sc, 10 * sc);
  }
  function drawPotScene(R, o) {
    const night = o.night || 0;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 16).clip();
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    g.addColorStop(0, mixC('#dbeafe', '#1e2a4a', night)); g.addColorStop(1, mixC('#fdf2e3', '#2c3a62', night));
    ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 창문 + 해/달
    const wx = R.x + R.w - 92, wy = R.y + 22;
    ctx.fillStyle = mixC('#bae6fd', '#0f172a', night); rr(wx, wy, 70, 84, 8).fill();
    ctx.strokeStyle = mixC('#94a3b8', '#475569', night); ctx.lineWidth = 4; rr(wx, wy, 70, 84, 8).stroke();
    ctx.beginPath(); ctx.moveTo(wx + 35, wy); ctx.lineTo(wx + 35, wy + 84); ctx.moveTo(wx, wy + 42); ctx.lineTo(wx + 70, wy + 42); ctx.stroke();
    if (night < 0.5) D.glow(wx + 22, wy + 20, 22, '#fde047', 0.9 * (1 - night * 2)); else { ctx.fillStyle = 'rgba(254,249,195,' + (night * 2 - 1) + ')'; ctx.beginPath(); ctx.arc(wx + 48, wy + 24, 9, 0, TAU); ctx.fill(); }
    // 선반
    const shelfY = R.y + R.h - 40;
    ctx.fillStyle = '#b08968'; ctx.fillRect(R.x, shelfY, R.w, 40); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(R.x, shelfY, R.w, 5);
    const cx = R.x + R.w * (o.cxf || 0.5), potW = Math.min(R.w * 0.34, 128), potH = potW * 0.8, baseY = shelfY, potTop = baseY - potH;
    // 펌프 + 물탱크
    if (o.pipe) {
      const tx = R.x + 22, ty = R.y + 70;
      ctx.fillStyle = '#e0f2fe'; rr(tx, ty, 54, 80, 8).fill(); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 3; rr(tx, ty, 54, 80, 8).stroke();
      ctx.fillStyle = 'rgba(56,189,248,.55)'; rr(tx + 4, ty + 22, 46, 54, 5).fill();
      D.text(tx + 27, ty + 96, '물탱크', { size: 12, weight: 800, color: night > 0.5 ? '#bae6fd' : '#0369a1' });
      D.sphere(tx + 27, ty + 112, 13, o.pump ? '#22c55e' : '#94a3b8', { outline: '#fff', outlineWidth: 2 });
      D.text(tx + 27, ty + 116.5, '⚙', { size: 13, color: '#fff' });
      D.text(tx + 27, ty + 139, o.pump ? '펌프 켜짐' : '펌프 꺼짐', { size: 12, weight: 800, color: o.pump ? (night > 0.5 ? '#86efac' : '#15803d') : (night > 0.5 ? '#cbd5e1' : '#64748b') });
      const px0 = tx + 54, py0 = ty + 40, px1 = cx - potW * 0.12, py1 = potTop - 70;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py0); ctx.lineTo(px1, py1); ctx.stroke();
      ctx.strokeStyle = o.pump ? '#38bdf8' : '#e2e8f0'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py0); ctx.lineTo(px1, py1); ctx.stroke();
      if (o.pump) {
        ctx.save(); ctx.setLineDash([6, 9]); ctx.lineDashOffset = RM ? 0 : -(o.t * 60 % 15); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py0); ctx.lineTo(px1, py1); ctx.stroke(); ctx.restore();
        for (let i = 0; i < 4; i++) { const f = ((o.t * 1.6 + i / 4) % 1), y = py1 + f * (potTop - py1 - 4); D.sphere(px1, y, 4.5, '#38bdf8', { gloss: false }); }
      }
    }
    // 화분
    const potG = ctx.createLinearGradient(cx - potW / 2, 0, cx + potW / 2, 0); potG.addColorStop(0, '#b45330'); potG.addColorStop(0.45, '#e07a4f'); potG.addColorStop(1, '#a8482a');
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, baseY + 3, potW * 0.46, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = potG; ctx.beginPath(); ctx.moveTo(cx - potW * 0.5, potTop + 12); ctx.lineTo(cx + potW * 0.5, potTop + 12); ctx.lineTo(cx + potW * 0.37, baseY); ctx.lineTo(cx - potW * 0.37, baseY); ctx.closePath(); ctx.fill();
    // 흙 (수분에 따라 색이 변해요)
    const soil = mixC('#d2b48c', '#4a3426', clamp(o.m / 100, 0, 1));
    ctx.fillStyle = SciSim.color.shade(soil, -0.2); ctx.beginPath(); ctx.ellipse(cx, potTop + 6, potW * 0.5, potW * 0.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = soil; ctx.beginPath(); ctx.ellipse(cx, potTop + 3, potW * 0.47, potW * 0.1, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 9; i++) { const a = hash(i * 3.1), b = hash(i * 7.7); if ((i + 1) / 9 <= o.m / 100 + 0.05) { ctx.fillStyle = 'rgba(147,197,253,.55)'; ctx.beginPath(); ctx.arc(cx + a * potW * 0.36, potTop + 3 + b * potW * 0.05, 2, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = '#c2603a'; rr(cx - potW * 0.54, potTop - 4, potW * 1.08, 16, 7).fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(cx - potW * 0.5, potTop - 2, potW * 0.5, 4, 2).fill();
    drawPlant(cx, potTop + 2, o.vit, o.t, potW / 128);
    ctx.restore();
    return { cx, potW, potH, potTop, baseY };
  }

  /* ======================================================
     화면 1: 센서 측정
     ====================================================== */
  function senseGeom() {
    if (!PHONE) return { R: { x: 14, y: 14, w: 430, h: 330 }, B: { x: 456, y: 14, w: 330, h: 330 }, pins: [0, 1, 2].map((i) => ({ x: 470, y: 94 + i * 38 })), g: (i) => ({ x: 14 + i * 262, y: 356, w: 248, h: 190 }) };
    return { R: { x: 12, y: 12, w: 576, h: 300 }, B: { x: 12, y: 322, w: 576, h: 232 }, pins: [0, 1, 2].map((i) => ({ x: 260 + i * 110, y: 334 })), g: (i) => ({ x: 12, y: 562 + i * 92, w: 576, h: 86 }) };
  }
  function stepSense(dt) {
    Ph.M = approach(Ph.M, Ph.Mt, dt, 1.6); if (Math.abs(Ph.M - Ph.Mt) < 0.05) Ph.M = Ph.Mt;
    if (S.mode === 'pipe') { Ph.Mt = Math.max(15, Ph.Mt - dt * 0.5); }
    Ph.flow += dt;
    const S1 = S.sn, vals = readAll();
    S1.samp += dt;
    while (S1.samp >= 0.1) { S1.samp -= 0.1; vals.forEach((v, i) => { S1.hist[i].push(v); if (S1.hist[i].length > 200) S1.hist[i].shift(); }); }
    if (S.mode === 'sense') vals.forEach((v, i) => { if (!S1.init) { S1.rmin[i] = v; S1.rmax[i] = v; } else { S1.rmin[i] = Math.min(S1.rmin[i], v); S1.rmax[i] = Math.max(S1.rmax[i], v); } });
    if (S.mode === 'sense') S1.init = true;
  }
  const rangeOf = (i) => S.sn.rmax[i] - S.sn.rmin[i];
  function wireTo(sx, sy, ex, ey, col, t, vertical) {
    const pts = vertical ? [[sx, sy], [sx, sy + (ey - sy) * 0.6], [ex, ey - (ey - sy) * 0.4], [ex, ey]] : [[sx, sy], [sx + (ex - sx) * 0.6, sy], [ex - (ex - sx) * 0.4, ey], [ex, ey]];
    ctx.strokeStyle = SciSim.color.shade(col, -0.2); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 0; i < 3; i++) { // 전기 신호 알갱이
      const u = (t * 0.55 + i / 3) % 1, v = 1 - u;
      const x = v * v * v * pts[0][0] + 3 * v * v * u * pts[1][0] + 3 * v * u * u * pts[2][0] + u * u * u * pts[3][0], y = v * v * v * pts[0][1] + 3 * v * v * u * pts[1][1] + 3 * v * u * u * pts[2][1] + u * u * u * pts[3][1];
      D.sphere(x, y, 3.6, '#fff', { gloss: false, outline: col, outlineWidth: 1.5 });
    }
  }
  function drawSense(t) {
    const G = senseGeom(), R = G.R, B = G.B, vals = readAll();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    const vit = clamp(Ph.M / 40, 0, 1) * 100;
    const P = drawPotScene(R, { m: Ph.M, vit, t, cxf: PHONE ? 0.4 : 0.42 });
    // 빛(램프) + 센서 소자
    const lamp = { x: R.x + 70, y: R.y + 54 }, lv = Ph.s / 100;
    D.glow(lamp.x, lamp.y + 8, 30 + 80 * lv, '#fde047', 0.18 + 0.55 * lv);
    ctx.fillStyle = '#64748b'; rr(lamp.x - 22, lamp.y - 24, 44, 10, 4).fill(); ctx.beginPath(); ctx.moveTo(lamp.x - 20, lamp.y - 14); ctx.lineTo(lamp.x + 20, lamp.y - 14); ctx.lineTo(lamp.x + 12, lamp.y + 4); ctx.lineTo(lamp.x - 12, lamp.y + 4); ctx.closePath(); ctx.fill();
    D.sphere(lamp.x, lamp.y + 8, 8, mixC('#e5e7eb', '#fde047', lv), { gloss: false });
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(250,204,21,' + (0.1 + 0.5 * lv) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lamp.x + (i - 2) * 10, lamp.y + 16); ctx.lineTo(P.cx - 20 + (i - 2) * 22, P.potTop - 70 + (i % 2) * 10); ctx.stroke(); }
    D.label(lamp.x, lamp.y + 38, '빛 ' + Math.round(luxOf(Ph.s)) + ' lux', { bg: '#a16207', size: 12 });
    const el = [
      { x: P.cx + P.potW * 0.24, y: P.potTop + 4 },                 // 수분 탐침(흙 속)
      { x: P.cx + P.potW * 0.5 + 6, y: P.potTop + P.potH * 0.45 },  // 온도 센서(화분 옆)
      { x: P.cx + P.potW * 0.9, y: P.potTop - 46 },                 // 조도 센서(식물 옆)
    ];
    // 소자 그림
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(el[0].x - 7, el[0].y - 2, 4, 26); ctx.fillRect(el[0].x + 3, el[0].y - 2, 4, 26);
    ctx.fillStyle = '#0ea5e9'; rr(el[0].x - 11, el[0].y - 22, 22, 22, 4).fill(); D.text(el[0].x, el[0].y - 6, '💧', { size: 13 });
    ctx.fillStyle = '#f26b3a'; rr(el[1].x - 4, el[1].y - 13, 26, 26, 6).fill(); D.text(el[1].x + 9, el[1].y + 5, '🌡️', { size: 14 });
    ctx.fillStyle = '#78716c'; ctx.fillRect(el[2].x - 2, el[2].y, 4, 48); ctx.fillStyle = '#f59e0b'; rr(el[2].x - 13, el[2].y - 22, 26, 22, 5).fill(); D.text(el[2].x, el[2].y - 5, '💡', { size: 13 });
    // 보드
    panel(B.x, B.y, B.w, B.h, '#0f766e');
    ctx.fillStyle = '#115e59'; rr(B.x + 6, B.y + 6, B.w - 12, B.h - 12, 12).fill();
    D.text(B.x + 16, B.y + 26, PHONE ? '🧠 마이크로 보드' : '🧠 마이크로 보드 (센서 값을 읽어요)', { size: 13.5, weight: 800, color: '#ccfbf1', align: 'left' });
    if (!PHONE) {
      ctx.fillStyle = '#1e293b'; rr(B.x + 150, B.y + 56, 150, 100, 8).fill(); D.text(B.x + 225, B.y + 100, '처리 장치', { size: 14, weight: 800, color: '#e2e8f0' }); D.text(B.x + 225, B.y + 122, '0~' + ADC + '의 숫자로 읽어요', { size: 11.5, weight: 700, color: '#94a3b8' });
    } else { ctx.fillStyle = '#1e293b'; rr(B.x + 150, B.y + 50, 300, 50, 8).fill(); D.text(B.x + 300, B.y + 80, '처리 장치 · 0~' + ADC + '의 숫자로 읽어요', { size: 13.5, weight: 800, color: '#e2e8f0' }); }
    G.pins.forEach((pn, i) => {
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(pn.x, pn.y, 7, 0, TAU); ctx.fill();
      D.text(pn.x + (PHONE ? 0 : 14), pn.y + (PHONE ? 24 : 4), SEN[i].pin, { size: 12, weight: 800, color: '#fde68a', align: PHONE ? 'center' : 'left' });
      wireTo(el[i].x, el[i].y + (i === 0 ? -22 : i === 1 ? 0 : -22), pn.x, pn.y, SEN[i].col, t, PHONE);
    });
    // 액정 화면: 눈금 → 환산
    const L = PHONE ? { x: B.x + 12, y: B.y + 118, w: B.w - 24, h: 104 } : { x: B.x + 12, y: B.y + 172, w: B.w - 24, h: 146 };
    ctx.fillStyle = '#0b1f1c'; rr(L.x, L.y, L.w, L.h, 10).fill();
    const rh = (L.h - 8) / 3;
    SEN.forEach((s, i) => {
      const y = L.y + 4 + i * rh, raw = toRaw(i, i === 0 ? Ph.M : i === 1 ? Ph.T : luxOf(Ph.s));
      D.text(L.x + 10, y + rh / 2 + 5, s.ico, { size: 16, align: 'left' });
      D.text(L.x + 34, y + rh / 2 + 5, s.name, { size: 12.5, weight: 800, color: '#99f6e4', align: 'left' });
      D.text(L.x + L.w * 0.50, y + rh / 2 + 5, String(raw), { size: 15, weight: 800, color: '#e2e8f0', align: 'right' });
      D.text(L.x + L.w * 0.50 + 12, y + rh / 2 + 5, '→', { size: 14, weight: 800, color: '#5eead4', align: 'left' });
      D.text(L.x + L.w - 10, y + rh / 2 + 5, s.fmt(vals[i]) + ' ' + s.unit, { size: 15.5, weight: 800, color: '#fde047', align: 'right' });
    });
    D.text(L.x + L.w * 0.5, L.y - 5, '눈금(0~' + ADC + ')  →  환산한 값', { size: 11.5, weight: 700, color: '#99f6e4', align: 'center' });
    // 그래프 3개 (최근 20초)
    SEN.forEach((s, i) => {
      const g = G.g(i); panel(g.x, g.y, g.w, g.h);
      const hist = S.sn.hist[i];
      const px = g.x + (PHONE ? 150 : 44), py = g.y + (PHONE ? 10 : 34), pw = g.w - (PHONE ? 150 : 44) - 12, ph = g.h - (PHONE ? 22 : 34 + 24);
      if (PHONE) { D.text(g.x + 14, g.y + 30, s.ico + ' ' + s.name, { size: 14, weight: 800, color: s.col, align: 'left' }); D.text(g.x + 14, g.y + 62, s.fmt(vals[i]) + ' ' + s.unit, { size: 20, weight: 800, color: '#1b2333', align: 'left' }); }
      else D.text(g.x + 12, g.y + 22, s.ico + ' ' + s.name + ' (' + s.unit + ')', { size: 13.5, weight: 800, color: s.col, align: 'left' });
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
      [s.lo, (s.lo + s.hi) / 2, s.hi].forEach((v) => { const y = py + ph - (v - s.lo) / (s.hi - s.lo) * ph; ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); if (!PHONE || v !== (s.lo + s.hi) / 2) D.text(px - 5, y + 4, String(Math.round(v)), { size: 11, weight: 700, color: '#64748b', align: 'right' }); });
      ctx.save(); ctx.beginPath(); ctx.rect(px, py - 2, pw, ph + 4); ctx.clip();
      ctx.strokeStyle = s.col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = hist.length; let lx = px, ly = py + ph;
      hist.forEach((v, k) => { const x = px + (200 - n + k) / 199 * pw, y = py + ph - clamp((v - s.lo) / (s.hi - s.lo), 0, 1) * ph; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); lx = x; ly = y; });
      ctx.stroke(); ctx.restore();
      if (n) D.sphere(lx, ly, 5, s.col, { outline: '#fff', outlineWidth: 1.5 });
      if (!PHONE) D.text(px + pw, py + ph + 18, '← 20초 전 · 지금', { size: 11.5, weight: 700, color: '#64748b', align: 'right' });
    });
  }

  /* ======================================================
     화면 2: 연결과 전송 (센서 → 통신 → 서버 → 작동기)
     ====================================================== */
  const PIPE = [
    { id: 'z0', ico: '🌡️', name: '센서', step: '① 측정', d: '흙의 수분을 재서 숫자로 바꿔요', col: '#0ea5e9' },
    { id: 'z1', ico: '📶', name: '통신', step: '② 전송', d: '값을 무선으로 인터넷에 보내요', col: '#8b5cf6' },
    { id: 'z2', ico: '☁️', name: '서버·앱', step: '③ 처리·판단', d: '값을 저장하고 규칙으로 판단해요 (처리·판단)', col: '#f59e0b' },
    { id: 'z3', ico: '💦', name: '작동기 (펌프)', step: '④ 작동', d: '판단에 따라 물을 줘요', col: '#16a34a' },
  ];
  const PIPE_ORDER = [2, 0, 3, 1];
  function pipeBoard() {
    const zones = [], homes = [];
    PIPE.forEach((z, i) => {
      const r = PHONE ? { x: 12, y: 12 + i * 108, w: 576, h: 100 } : { x: 26 + i * 194, y: 58, w: 172, h: 178 };
      zones.push({ id: z.id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 1, fixed: true, z, slots: [PHONE ? { x: r.x + 150 + (r.w - 158) / 2, y: r.y + 50, w: r.w - 166, h: 88 } : { x: r.x + r.w / 2, y: r.y + 100, w: r.w - 14, h: 132 }] });
    });
    const pos = (t) => (PHONE ? { x: 153 + (t % 2) * 294, y: 508 + Math.floor(t / 2) * 108, w: 282, h: 100 } : { x: 112 + t * 194, y: 330, w: 172, h: 132 });
    PIPE.forEach((z, ci) => homes.push(pos(PIPE_ORDER.indexOf(ci))));
    return makeBoard(PIPE.map((z) => ({ id: z.id, ans: z.id, z })), zones, homes);
  }
  S.board = { pipe: pipeBoard() };
  const pipeAssembled = () => S.board.pipe.cards.every((c) => c.zone === c.ans);
  function pipeSlotX() { const B = S.board.pipe; return B.zones.map((z) => z.slots[0]); }
  function netReset() { const N = S.net; N.comm = 'ok'; N.packets = []; N.sendT = 0; N.srv = { v: readM(), got: S.clock, n: 0 }; N.froze = false; N.resumed = false; segSet('#commSeg', 'ok'); $('#oComm').textContent = '정상'; }
  function stepPipe(dt) {
    const N = S.net;
    if (S.mode !== 'pipe') return;
    const asm = pipeAssembled();
    if (asm) {
      N.sendT += dt;
      if (N.sendT >= 1) { N.sendT -= 1; N.packets.push({ u: 0, v: readM(), pass: false, drop: false, fade: 0 }); }
    } else { N.sendT = 0; N.packets.length = 0; }
    const dur = N.comm === 'slow' ? 3.5 : 1.0;
    for (let i = N.packets.length - 1; i >= 0; i--) {
      const p = N.packets[i];
      if (p.drop) { p.fade += dt * 1.6; if (p.fade >= 1) N.packets.splice(i, 1); continue; }
      p.u += dt / dur;
      if (!p.pass && p.u >= 0.5) { if (N.comm === 'off') { p.u = 0.5; p.drop = true; continue; } p.pass = true; }
      if (p.u >= 1) { N.srv.v = p.v; N.srv.got = S.clock; N.srv.n++; if (N.froze) N.resumed = true; N.packets.splice(i, 1); }
    }
    if (asm && N.comm === 'off' && S.clock - N.srv.got >= 3) N.froze = true;
  }
  function drawPipe(t) {
    const B = S.board.pipe, N = S.net, asm = pipeAssembled();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    B.zones.forEach((z, i) => {
      const hit = B.drag && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h;
      const used = B.cards.some((c) => c.zone === z.id);
      panel(z.x, z.y, z.w, z.h, hit ? '#eef4ff' : '#fff', B.ok ? '#14a058' : hit ? z.z.col : null);
      if (PHONE) { D.text(z.x + 16, z.y + 40, z.z.step, { size: 15, weight: 800, color: z.z.col, align: 'left' }); D.text(z.x + 16, z.y + 64, '빈칸', { size: 12, weight: 700, color: '#94a3b8', align: 'left' }); }
      else D.text(z.x + z.w / 2, z.y + 28, z.z.step, { size: 15.5, weight: 800, color: z.z.col });
      if (!used) {
        const s = z.slots[0];
        ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.restore();
        D.text(s.x, s.y + 5, '블록을 여기에', { size: 13, weight: 700, color: '#cbd5e1' });
      }
      if (i < 3) { // 칸 사이 화살표
        const nz = B.zones[i + 1];
        if (PHONE) D.arrow(z.x + z.w / 2, z.y + z.h + 1, z.x + z.w / 2, nz.y - 1, { color: '#cbd5e1', width: 3, head: 7 });
        else D.arrow(z.x + z.w + 1, z.y + 100, nz.x - 1, z.y + 100, { color: '#cbd5e1', width: 3, head: 8 });
      }
    });
    // 날아가는 값 알갱이
    if (asm) {
      const s = pipeSlotX(), a = s[0], c = s[2];
      N.packets.forEach((p) => {
        const x = lerp(a.x, c.x, p.u), y = lerp(a.y, c.y, p.u) - Math.sin(p.u * Math.PI) * (PHONE ? 0 : 0);
        ctx.globalAlpha = p.drop ? 1 - p.fade : 1;
        D.sphere(x, y, 11, p.drop ? '#e2464b' : '#0ea5e9', { outline: '#fff', outlineWidth: 2 });
        D.text(x, y + 4, p.drop ? '✕' : String(p.v), { size: 10.5, weight: 800, color: '#fff' });
        ctx.globalAlpha = 1;
      });
    }
    if (!PHONE) D.text(VW / 2, 256, '▼ 블록을 끌어 위의 칸에 순서대로 놓아요', { size: 13.5, weight: 800, color: '#64748b' });
    else D.text(VW / 2, 494, '▼ 블록을 끌어 위의 칸에 순서대로 놓아요', { size: 13, weight: 800, color: '#64748b' });
    bdDraw(B, (c) => {
      const z = c.z, live = asm && c.zone;
      ctx.fillStyle = z.col; ctx.globalAlpha = 0.16; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, PHONE ? 30 : 34); ctx.globalAlpha = 1;
      D.text(-c.w / 2 + 14, -c.h / 2 + (PHONE ? 22 : 24), z.ico, { size: 18, align: 'left' });
      D.text(-c.w / 2 + 40, -c.h / 2 + (PHONE ? 21 : 23), fitText(z.name, c.w - 48, 13.5, 800), { size: 13.5, weight: 800, color: z.col, align: 'left' });
      if (!live) paraText(-c.w / 2 + 12, -c.h / 2 + (PHONE ? 50 : 56), z.d, c.w - 24, 12.5, { color: '#475569' });
      else {
        const age = S.clock - N.srv.got;
        if (z.id === 'z0') { D.text(0, 12, readM() + ' %', { size: PHONE ? 26 : 32, weight: 800, color: '#0ea5e9' }); D.text(0, c.h / 2 - 12, '지금 흙의 수분', { size: 12, weight: 700, color: '#64748b' }); }
        else if (z.id === 'z1') {
          const st = N.comm; D.text(0, 6, st === 'ok' ? '📶 정상' : st === 'slow' ? '🐢 느림' : '❌ 끊김', { size: PHONE ? 20 : 22, weight: 800, color: st === 'off' ? '#e2464b' : st === 'slow' ? '#f59e0b' : '#14a058' });
          D.text(0, c.h / 2 - 12, st === 'ok' ? '약 1초 만에 도착' : st === 'slow' ? '약 3.5초 걸려요' : '값이 전달되지 않아요', { size: 12, weight: 700, color: '#64748b' });
        } else if (z.id === 'z2') {
          D.text(0, 12, N.srv.v + ' %', { size: PHONE ? 26 : 32, weight: 800, color: age > 3 ? '#e2464b' : '#f59e0b' });
          D.text(0, c.h / 2 - 12, '받은 값 · ' + age.toFixed(1) + '초 전', { size: 12, weight: 700, color: age > 3 ? '#e2464b' : '#64748b' });
        } else { D.text(0, 8, '💦', { size: 28 }); D.text(0, c.h / 2 - 12, '다음 단계에서 규칙을 정해요', { size: 11.5, weight: 700, color: '#64748b' }); }
      }
    }, (c) => (c.bad ? '#e2464b' : B.ok && c.zone ? '#14a058' : c.zone ? c.z.col : '#cbd5e1'));
    // 서버 화면 요약
    const V = PHONE ? { x: 12, y: 730, w: 576, h: 100 } : { x: 14, y: 410, w: 772, h: 136 };
    panel(V.x, V.y, V.w, V.h, asm ? '#fff' : '#f1f5f9');
    if (!asm) { paraText(V.x + 16, V.y + 32, '블록을 순서대로 놓으면 센서의 값이 서버까지 날아가는 모습을 볼 수 있어요.', V.w - 32, 14, { color: '#64748b' }); return; }
    const age = S.clock - N.srv.got, real = readM();
    D.text(V.x + 16, V.y + 26, '🖥️ 서버(앱)의 화면', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const cols = PHONE ? [V.x + 16, V.x + 200, V.x + 390] : [V.x + 24, V.x + 280, V.x + 530];
    D.text(cols[0], V.y + (PHONE ? 54 : 66), '실제 흙의 수분', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    D.text(cols[0], V.y + (PHONE ? 84 : 104), real + ' %', { size: PHONE ? 24 : 30, weight: 800, color: '#0ea5e9', align: 'left' });
    D.text(cols[1], V.y + (PHONE ? 54 : 66), '서버가 받은 값', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    D.text(cols[1], V.y + (PHONE ? 84 : 104), N.srv.v + ' %', { size: PHONE ? 24 : 30, weight: 800, color: '#f59e0b', align: 'left' });
    D.text(cols[2], V.y + (PHONE ? 54 : 66), '마지막으로 받은 때', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    D.text(cols[2], V.y + (PHONE ? 84 : 104), age.toFixed(1) + '초 전', { size: PHONE ? 24 : 30, weight: 800, color: age >= 3 ? '#e2464b' : '#14a058', align: 'left' });
    if (N.comm === 'off') D.label(V.x + V.w - 14, V.y + 22, age >= 3 ? '⚠️ 값이 멈췄어요' : '통신이 끊겼어요', { bg: '#e2464b', size: 12.5, align: 'right' });
  }

  /* ======================================================
     화면 3·5: 자동 제어 하루 시뮬레이션 (임계값)
     ====================================================== */
  function simGeom() {
    return PHONE
      ? { sc: { x: 12, y: 12, w: 576, h: 240 }, ch: { x: 12, y: 260, w: 576, h: 250 }, st: { x: 12, y: 518, w: 576, h: 126 }, tb: { x: 12, y: 652, w: 576, h: 176 } }
      : { sc: { x: 14, y: 14, w: 290, h: 330 }, ch: { x: 316, y: 14, w: 470, h: 330 }, st: { x: 14, y: 356, w: 300, h: 190 }, tb: { x: 326, y: 356, w: 460, h: 190 } };
  }
  const nightAt = (h) => clamp(1 - smooth(h, 5, 7) + smooth(h, 17, 19), 0, 1);
  function startRun(kind, T, ev) {
    const r = newRun(T, ev);
    if (kind === 'sim') { S.sim.run = r; S.sim.last = null; } else { S.ev.run = r; }
    Sound.click();
  }
  function stepRun(r, dt, onDone) {
    if (!r || r.done) return;
    r.acc += dt * 24;
    while (r.acc >= 1 && !r.done) { r.acc -= 1; tickRun(r); if (r.done) onDone(r); }
  }
  function drawSim(t, events) {
    const G = simGeom(), Z = events ? S.ev : S.sim, r = Z.run;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    const T = events ? 50 : S.sim.T;
    const hr = r ? r.k / 6 : 0, m = r ? r.m : START_M, vit = r ? r.h : 100;
    // 장면
    drawPotScene(G.sc, { m, vit, t, pump: !!(r && !r.done && r.pump), pipe: true, night: nightAt(hr), cxf: PHONE ? 0.6 : 0.64 });
    const sc = G.sc;
    D.label(sc.x + sc.w - 12, sc.y + sc.h - 18, clk(hr) + (hr >= 6 && hr < 18 ? ' ☀️ 낮' : ' 🌙 밤'), { bg: 'rgba(15,23,42,.75)', size: 12.5, align: 'right' });
    // 그래프
    const ch = G.ch; panel(ch.x, ch.y, ch.w, ch.h);
    D.text(ch.x + 14, ch.y + 24, '흙 수분 (%) · 하루 24시간', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const px = ch.x + 46, py = ch.y + 44, pw = ch.w - 46 - 16, ph = ch.h - 44 - 40;
    const X = (k) => px + k / TICKS * pw, Y = (v) => py + ph - clamp(v, 0, 100) / 100 * ph;
    [[0, DRY2, 'rgba(226,70,75,.14)'], [DRY2, DRY, 'rgba(245,158,11,.16)'], [DRY, 70, 'rgba(20,160,88,.14)'], [70, WET, 'rgba(245,158,11,.16)'], [WET, 100, 'rgba(226,70,75,.14)']].forEach((b) => { ctx.fillStyle = b[2]; ctx.fillRect(px, Y(b[1]), pw, Y(b[0]) - Y(b[1])); });
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = 'rgba(100,116,139,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(v)); ctx.lineTo(px + pw, Y(v)); ctx.stroke(); D.text(px - 5, Y(v) + 4, String(v), { size: 11.5, weight: 700, color: '#64748b', align: 'right' }); });
    [0, 6, 12, 18, 24].forEach((h) => D.text(X(h * 6), py + ph + 17, h + '시', { size: 11.5, weight: 700, color: '#64748b' }));
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    // 낮/밤 띠
    ctx.fillStyle = '#fde68a'; ctx.fillRect(X(36), py - 9, X(108) - X(36), 6); ctx.fillStyle = '#c7d2fe'; ctx.fillRect(px, py - 9, X(36) - px, 6); ctx.fillRect(X(108), py - 9, X(144) - X(108), 6);
    D.text(X(72), py - 13, '낮 (06~18시)', { size: 11, weight: 700, color: '#a16207' });
    D.text(px + 4, py + 12, '적정 ' + DRY + '~70 %', { size: 11, weight: 800, color: '#0b6b39', align: 'left' });
    // 임계값 선
    ctx.save(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, Y(T)); ctx.lineTo(px + pw, Y(T)); ctx.stroke(); ctx.restore();
    D.label(px + pw - 4, clamp(Y(T) - 13, py + 20, py + ph - 8), '임계값 ' + T + ' %', { bg: '#1b2333', size: 12, align: 'right' });
    if (r) {
      const n = r.series.length;
      ctx.fillStyle = 'rgba(56,189,248,.8)'; r.pumpOn.forEach((on, k) => { if (on) ctx.fillRect(X(k), py + ph - 7, Math.max(1.5, pw / TICKS), 7); });
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      r.series.forEach((v, k) => (k ? ctx.lineTo(X(k), Y(v)) : ctx.moveTo(X(k), Y(v)))); ctx.stroke();
      D.sphere(X(n - 1), Y(r.series[n - 1]), 6, '#0284c7', { outline: '#fff', outlineWidth: 2 });
    } else D.text(px + pw / 2, py + ph * 0.84, '▶ 하루 시작을 눌러요', { size: 15, weight: 700, color: '#94a3b8' });
    // 상태 칸
    const st = G.st; panel(st.x, st.y, st.w, st.h);
    const H = r ? HR(r) : 100, W = r ? WR(r) : 0, bx = st.x + (PHONE ? 130 : 96), bw = st.w - (PHONE ? 130 : 96) - 66;
    D.text(st.x + 14, st.y + 26, '식물 건강도', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e8edf4'; rr(bx, st.y + 12, bw, 20, 10).fill();
    const hw = bw * H / 100; if (hw > 0.5) { ctx.fillStyle = H >= GOAL_H ? '#14a058' : H >= SICK ? '#f59e0b' : '#e2464b'; rr(bx, st.y + 12, hw, 20, 10).fill(); }
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + bw * GOAL_H / 100, st.y + 8); ctx.lineTo(bx + bw * GOAL_H / 100, st.y + 36); ctx.stroke(); ctx.setLineDash([]);
    D.text(st.x + st.w - 12, st.y + 28, String(H), { size: 17, weight: 800, color: H >= GOAL_H ? '#14a058' : '#1b2333', align: 'right' });
    D.text(st.x + 14, st.y + 62, '물 사용량', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const WMAX = 3; ctx.fillStyle = '#e8edf4'; rr(bx, st.y + 48, bw, 20, 10).fill();
    const ww = bw * clamp(W / WMAX, 0, 1); if (ww > 0.5) { ctx.fillStyle = W <= GOAL_L ? '#0ea5e9' : '#e2464b'; rr(bx, st.y + 48, ww, 20, 10).fill(); }
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + bw * GOAL_L / WMAX, st.y + 44); ctx.lineTo(bx + bw * GOAL_L / WMAX, st.y + 72); ctx.stroke(); ctx.setLineDash([]);
    D.text(st.x + st.w - 12, st.y + 64, fL(W) + ' L', { size: 16, weight: 800, color: W <= GOAL_L ? '#0369a1' : '#e2464b', align: 'right' });
    if (W > WMAX) D.text(bx + bw, st.y + 86, '(막대는 ' + WMAX + ' L까지만 그려요)', { size: 11, weight: 700, color: '#64748b', align: 'right' });
    D.text(st.x + 14, st.y + (PHONE ? 100 : 106), '목표: 건강도 ' + GOAL_H + ' 이상 · 물 ' + fL(GOAL_L) + ' L 이하', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    if (r && r.done) { const ok = goodRun(r); D.label(st.x + st.w / 2, st.y + st.h - (PHONE ? 16 : 28), ok ? '✅ 목표 달성!' : classify(r) === 'wilt' ? '🥀 물이 부족했어요' : '⚠️ 목표에 못 미쳤어요', { bg: ok ? '#14a058' : '#e2464b', size: 13 }); }
    // 표 / 사건 결과
    const tb = G.tb; panel(tb.x, tb.y, tb.w, tb.h);
    if (!events) {
      D.text(tb.x + 14, tb.y + 24, '📋 비교표 (끝난 하루 기록)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
      const cx = [tb.x + 18, tb.x + tb.w * 0.28, tb.x + tb.w * 0.5, tb.x + tb.w * 0.74];
      ['임계값', '건강도', '물(L)', '결과'].forEach((h, k) => D.text(cx[k], tb.y + 48, h, { size: 12, weight: 800, color: '#64748b', align: 'left' }));
      const keys = S.sim.order.slice(-5).sort((a, b) => a - b), rh = PHONE ? 24 : 25;
      keys.forEach((k, i) => {
        const q = S.sim.results[k], y = tb.y + 54 + i * rh;
        if (i % 2) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(tb.x + 8, y, tb.w - 16, rh); }
        const ok = q.H >= GOAL_H && q.pumps <= GOAL_PUMPS;
        D.text(cx[0], y + rh - 7, k + ' %', { size: 13, weight: 800, color: '#1b2333', align: 'left' });
        D.text(cx[1], y + rh - 7, String(q.H), { size: 13, weight: 800, color: q.H >= GOAL_H ? '#14a058' : '#e2464b', align: 'left' });
        D.text(cx[2], y + rh - 7, fL(q.pumps * WATER_TICK), { size: 13, weight: 800, color: q.pumps <= GOAL_PUMPS ? '#0369a1' : '#e2464b', align: 'left' });
        D.text(cx[3], y + rh - 7, ok ? '✅ 알맞아요' : q.H < GOAL_H && q.pumps > GOAL_PUMPS ? '⚠️ 과습·낭비' : q.H < GOAL_H ? '🥀 시들어요' : '💸 물 낭비', { size: 12.5, weight: 800, color: ok ? '#14a058' : '#b45309', align: 'left' });
      });
      if (!keys.length) D.text(tb.x + tb.w / 2, tb.y + tb.h / 2 + 8, '하루를 끝까지 돌리면 결과가 기록돼요', { size: 13.5, weight: 700, color: '#cbd5e1' });
    } else {
      const ev = S.ev.sel, pr = ev ? S.ev.pred[ev] : null;
      D.text(tb.x + 14, tb.y + 24, ev ? EV_INFO[ev].ico + ' ' + EV_INFO[ev].name + ' 사건' : '⚠️ 사건을 골라요', { size: 14, weight: 800, color: '#334155', align: 'left' });
      let msg = '왼쪽 위의 정상 규칙(임계값 ' + T + ' %)에 사건이 생기면 어떻게 될까요? 사건과 예측을 고르고 ▶ 하루 시작을 눌러요.';
      if (ev && !pr) msg = '이 사건이 생기면 어떻게 될지 먼저 예측해요.';
      if (ev && pr && !(r && r.done)) msg = '내 예측: ' + PRED_TXT[pr] + '. ▶ 하루 시작을 눌러 확인해요.';
      if (r && r.done && r.ev === ev) {
        const real = classify(r), hit = real === pr;
        msg = '내 예측: ' + PRED_TXT[pr] + ' → 결과: ' + PRED_TXT[real] + ' (물 ' + fL(WR(r)) + ' L, 건강도 ' + HR(r) + '). ' + (hit ? '예측이 맞았어요!' : '예측과 달랐어요. 왜 그럴까요?');
      }
      paraText(tb.x + 14, tb.y + 52, msg, tb.w - 28, 13.5, { color: '#475569' });
      let yy = tb.y + (PHONE ? 118 : 130);
      ['stuck', 'hack', 'comm'].forEach((k, i) => { D.text(tb.x + 14 + i * (PHONE ? 186 : 148), yy, (S.ev.done[k] ? '✅ ' : '⬜ ') + EV_INFO[k].name, { size: 12.5, weight: 800, color: S.ev.done[k] ? '#14a058' : '#94a3b8', align: 'left' }); });
    }
  }
  S.sim.order = [];
  function recordSim(r) { S.sim.results[r.T] = { H: HR(r), pumps: r.pumps }; S.sim.tried[r.T] = true; S.sim.order = S.sim.order.filter((x) => x !== r.T).concat([r.T]); S.sim.last = { T: r.T, H: HR(r), pumps: r.pumps }; }
  function recordEv(r) { const e = r.ev; S.ev.done[e] = true; S.ev.ok[e] = classify(r) === S.ev.pred[e]; syncEvCtl(); }

  /* ======================================================
     화면 4: 스마트 시티 (쓸모와 한계 짝짓기)
     ====================================================== */
  const DEV = [
    { id: 'bin', ico: '🗑️', name: '스마트 쓰레기통', col: '#16a34a' }, { id: 'lamp', ico: '💡', name: '스마트 가로등', col: '#f59e0b' },
    { id: 'air', ico: '🌫️', name: '대기질 센서망', col: '#0ea5e9' }, { id: 'home', ico: '🏠', name: '스마트 홈', col: '#8b5cf6' }, { id: 'wear', ico: '⌚', name: '웨어러블 기기', col: '#e2464b' },
  ];
  const CITY_CARDS = [
    { id: 'bin1', ans: 'bin', kind: 'use', t: '가득 찬 통만 골라 수거해서 이동 횟수가 줄어요' }, { id: 'bin2', ans: 'bin', kind: 'limit', t: '센서가 더러워지면 비어 있어도 가득 찼다고 알려요' },
    { id: 'lamp1', ans: 'lamp', kind: 'use', t: '어두워질 때만 켜서 전기를 아껴요' }, { id: 'lamp2', ans: 'lamp', kind: 'limit', t: '통신이 끊기면 제어가 멈춰 꺼진 채로 있을 수 있어요' },
    { id: 'air1', ans: 'air', kind: 'use', t: '오염이 심한 곳을 실시간으로 찾아 알려 줘요' }, { id: 'air2', ans: 'air', kind: 'limit', t: '센서를 많이 설치하면 비용과 전력이 많이 들어요' },
    { id: 'home1', ans: 'home', kind: 'use', t: '사람이 없으면 조명·난방을 자동으로 꺼서 에너지를 아껴요' }, { id: 'home2', ans: 'home', kind: 'limit', t: '해킹당하면 집 안 생활 정보가 새어 나갈 수 있어요' },
    { id: 'wear1', ans: 'wear', kind: 'use', t: '심박과 수면을 기록해 건강 습관을 돌아보게 해요' }, { id: 'wear2', ans: 'wear', kind: 'limit', t: '건강 정보가 유출될 수 있고 기기가 없으면 혜택을 못 받아요' },
  ];
  const CITY_ORDER = [3, 8, 1, 6, 9, 4, 0, 7, 2, 5];
  function cityBoard() {
    const zones = [], homes = [];
    DEV.forEach((d, i) => {
      const r = PHONE ? { x: 12, y: 10 + i * 94, w: 576, h: 88 } : { x: 14 + i * 156, y: 14, w: 148, h: 236 };
      const slots = PHONE ? [0, 1].map((k) => ({ x: r.x + 136 + 215 / 2 + k * 222, y: r.y + 44, w: 212, h: 78 })) : [0, 1].map((k) => ({ x: r.x + r.w / 2, y: r.y + 62 + 5 + 38 + k * 84, w: 136, h: 78 }));
      zones.push({ id: d.id, x: r.x, y: r.y, w: r.w, h: r.h, cap: 2, fixed: false, slots, d });
    });
    const pos = (t) => (PHONE ? { x: 153 + (t % 2) * 294, y: 488 + 30 + Math.floor(t / 2) * 60, w: 282, h: 56 } : { x: 14 + 74 + (t % 5) * 156, y: 262 + 40 + Math.floor(t / 5) * 80, w: 148, h: 76 });
    CITY_CARDS.forEach((c, ci) => homes.push(pos(CITY_ORDER.indexOf(ci))));
    return makeBoard(CITY_CARDS.map((c) => Object.assign({}, c)), zones, homes);
  }
  S.board.city = cityBoard();
  function drawCity(t) {
    const B = S.board.city;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    B.zones.forEach((z) => {
      const hit = B.drag && B.dragP && B.dragP.x >= z.x && B.dragP.x <= z.x + z.w && B.dragP.y >= z.y && B.dragP.y <= z.y + z.h;
      const n = B.cards.filter((c) => c.zone === z.id).length;
      panel(z.x, z.y, z.w, z.h, hit ? '#eef4ff' : '#fff', B.ok ? '#14a058' : hit ? z.d.col : null);
      ctx.fillStyle = z.d.col; ctx.globalAlpha = 0.14; rr(z.x, z.y, z.w, PHONE ? z.h : 62, 16).fill(); ctx.globalAlpha = 1;
      if (PHONE) { D.text(z.x + 14, z.y + 34, z.d.ico, { size: 26, align: 'left' }); D.text(z.x + 50, z.y + 32, z.d.name, { size: 13.5, weight: 800, color: z.d.col, align: 'left' }); D.text(z.x + 50, z.y + 52, n + ' / 2', { size: 12, weight: 700, color: '#64748b', align: 'left' }); }
      else { D.text(z.x + z.w / 2, z.y + 30, z.d.ico, { size: 28 }); D.text(z.x + z.w / 2, z.y + 53, z.d.name, { size: 13, weight: 800, color: z.d.col }); }
      z.slots.forEach((s, k) => { if (k < n) return; ctx.save(); ctx.strokeStyle = '#d6dde8'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 10).stroke(); ctx.restore(); D.text(s.x, s.y + 4, '카드', { size: 12.5, weight: 700, color: '#d6dde8' }); });
    });
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(PHONE ? 6 : 8, PHONE ? 484 : 254, VW - (PHONE ? 12 : 16), PHONE ? 312 : 172, 14).fill();
    // 도시 장면 (장치 카드가 모두 놓이면 켜져요)
    const sy = PHONE ? 2000 : 434, sh = PHONE ? 76 : 112, sw = VW - (PHONE ? 24 : 28), sx = PHONE ? 12 : 14;
    if (!PHONE) {
    ctx.save(); rr(sx, sy, sw, sh, 14).clip();
    const g = ctx.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, '#c7e2ff'); g.addColorStop(1, '#eaf4ff'); ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(sx, sy + sh - 22, sw, 22);
    [0.06, 0.22, 0.48, 0.62, 0.86].forEach((f, i) => { const bh = (PHONE ? 30 : 48) + hash(i * 5) * 10; ctx.fillStyle = ['#cbd5e1', '#b6c2d4', '#c5cfdd', '#aab8cc', '#c0cadb'][i]; ctx.fillRect(sx + sw * f, sy + sh - 22 - bh, sw * 0.1, bh); });
    const cloud = { x: sx + sw / 2, y: sy + (PHONE ? 16 : 24) };
    ctx.fillStyle = '#fff'; [[-16, 2, 11], [0, -3, 14], [17, 2, 11]].forEach((c) => { ctx.beginPath(); ctx.arc(cloud.x + c[0], cloud.y + c[1], c[2], 0, TAU); ctx.fill(); });
    DEV.forEach((d, i) => {
      const lit = B.cards.filter((c) => c.zone === d.id).length >= 2 || B.ok;
      const x = sx + sw * (0.1 + i * 0.2), y = sy + sh - 30;
      D.text(x, y + 2, d.ico, { size: PHONE ? 20 : 26 });
      if (lit) {
        D.glow(x, y - 8, 22, d.col, 0.35);
        for (let k = 0; k < 2; k++) { const f = ((t * 0.7) + k / 2 + i * 0.17) % 1; ctx.strokeStyle = rgba(d.col, 0.7 * (1 - f)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 12, 8 + f * 22, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke(); }
        const f = (t * 0.6 + i * 0.2) % 1; D.sphere(lerp(x, cloud.x, f), lerp(y - 22, cloud.y, f), 3.6, d.col, { gloss: false });
      }
    });
    ctx.restore();
    }
    bdDraw(B, (c) => {
      const use = c.kind === 'use', col = use ? '#14a058' : '#e2464b';
      ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fillRect(-c.w / 2, -c.h / 2, 5, c.h); ctx.globalAlpha = 1;
      D.text(-c.w / 2 + 12, -c.h / 2 + 13, use ? '쓸모' : '한계', { size: 11, weight: 800, color: col, align: 'left' });
      paraText(-c.w / 2 + 12, -c.h / 2 + (PHONE ? 27 : 29), c.t, c.w - 18, PHONE ? 12 : 12, { color: '#334155', lh: 1.2 });
    }, (c) => (c.bad ? '#e2464b' : B.ok && c.zone ? '#14a058' : c.zone ? (c.kind === 'use' ? '#14a058' : '#e2464b') : '#cbd5e1'));
  }

  /* ======================================================
     입력
     ====================================================== */
  const boardKey = () => (S.mode === 'pipe' ? 'pipe' : S.mode === 'city' ? 'city' : null);
  SciSim.pointer(view, {
    down(p) { const key = boardKey(); if (!key) return false; const B = S.board[key], c = bdPick(B, p); if (!c) return false; bdStart(B, c, p); B.dragP = p; return true; },
    move(p) { const key = boardKey(); if (key) { const B = S.board[key]; if (B.drag) { bdMove(B, p); B.dragP = p; } } },
    up(p) { const key = boardKey(); if (key) { const B = S.board[key]; if (B.drag) { const c = B.drag.c; bdMove(B, p); bdDrop(B, c, p); B.dragP = null; } } },
    hover(p) { const key = boardKey(); return key && bdPick(S.board[key], p) ? 'grab' : 'default'; },
  });

  /* ======================================================
     컨트롤
     ====================================================== */
  const MODE_LABEL = { sense: '🌡️ 스마트 화분 · 센서가 읽는 값', pipe: '📶 센서에서 서버까지 · 연결과 전송', sim: '⏱️ 임계값 규칙으로 하루 자동 제어', city: '🏙️ 스마트 시티 · 쓸모와 한계', events: '⚠️ 사건이 생기면? · 예측하고 확인하기' };
  const modeSeg = $('#modeSeg');
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    Object.keys(S.board).forEach((k) => { S.board[k].drag = null; });
    if (m === 'sense') S.sn.init = false;
    updateCtl();
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bWater').addEventListener('click', () => { Sound.click(); Ph.Mt = Math.min(95, Ph.Mt + 15); });
  $('#bDry').addEventListener('click', () => { Sound.click(); Ph.Mt = Math.max(5, Ph.Mt - 15); });
  SciSim.bindRange($('#sTemp'), $('#oTemp'), (v) => v + ' °C', (v) => { Ph.T = v; });
  SciSim.bindRange($('#sLight'), $('#oLight'), (v) => v + ' %', (v) => { Ph.s = v; });
  segBind('#commSeg', (v) => { S.net.comm = v; segSet('#commSeg', v); $('#oComm').textContent = { ok: '정상', slow: '느림', off: '끊김' }[v]; });
  $('#bPipeReset').addEventListener('click', () => { Sound.click(); bdReset(S.board.pipe); netReset(); });
  const sThr = $('#sThr');
  SciSim.bindRange(sThr, $('#oThr'), (v) => v + ' %', (v) => { S.sim.T = v; });
  $$('#thrPre button[data-t]').forEach((b) => b.addEventListener('click', () => { Sound.click(); sThr.value = b.dataset.t; sThr.dispatchEvent(new Event('input')); }));
  $('#bRun').addEventListener('click', () => { startRun('sim', S.sim.T, null); });
  $('#bCityReset').addEventListener('click', () => { Sound.click(); bdReset(S.board.city); });
  function syncEvCtl() {
    const E = S.ev;
    $$('#evSeg button').forEach((b) => { b.classList.toggle('on', E.sel === b.dataset.v); b.classList.toggle('done', !!E.done[b.dataset.v]); });
    $$('#predSeg button').forEach((b) => { b.disabled = !E.sel; b.classList.toggle('on', !!E.sel && E.pred[E.sel] === b.dataset.v); });
    $('#bEvRun').disabled = !(E.sel && E.pred[E.sel]);
  }
  segBind('#evSeg', (v) => { S.ev.sel = v; S.ev.run = null; syncEvCtl(); });
  segBind('#predSeg', (v) => { if (!S.ev.sel) return; S.ev.pred[S.ev.sel] = v; S.ev.run = null; syncEvCtl(); });
  $('#bEvRun').addEventListener('click', () => { if (!(S.ev.sel && S.ev.pred[S.ev.sel])) return; startRun('ev', 50, S.ev.sel); });
  function setSlider(sel, v) { const s = $(sel); s.value = v; s.dispatchEvent(new Event('input')); }

  /* ======================================================
     읽음 칸
     ====================================================== */
  function readouts() {
    const m = S.mode;
    $('#oMoist').textContent = readM() + ' %';
    if (m === 'sense') setRead(['토양 수분', readM() + ' %'], ['온도', readT().toFixed(1) + ' °C'], ['조도', readL() + ' lux']);
    else if (m === 'pipe') setRead(['통신', { ok: '정상', slow: '느림(약 3.5초)', off: '끊김' }[S.net.comm]], ['서버가 받은 값', S.net.srv.v + ' %'], ['받은 횟수', S.net.srv.n + ' 번']);
    else if (m === 'sim') { const r = S.sim.run; setRead(['임계값', S.sim.T + ' %'], ['건강도', String(r ? HR(r) : 100)], ['물 사용량', fL(r ? WR(r) : 0) + ' L']); }
    else if (m === 'city') { const B = S.board.city; setRead(['놓은 카드', bdPlaced(B) + ' / ' + B.cards.length], ['쓸모 카드', B.cards.filter((c) => c.zone && c.kind === 'use').length + ' 장'], ['한계 카드', B.cards.filter((c) => c.zone && c.kind === 'limit').length + ' 장']);
    } else { const E = S.ev, r = E.run; setRead(['사건', E.sel ? EV_INFO[E.sel].name : '고르기'], ['내 예측', E.sel && E.pred[E.sel] ? PRED_TXT[E.pred[E.sel]] : '–'], ['물 사용량', fL(r ? WR(r) : 0) + ' L']); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li < 3) S.ev.run = null; if (li !== 2) S.sim.run = null;
    if (li === 0) {
      Ph.M = Ph.Mt = START_M; Ph.T = 25; Ph.s = 40; setSlider('#sTemp', 25); setSlider('#sLight', 40);
      S.sn.hist = [[], [], []]; S.sn.init = false; setMode('sense');
    } else if (li === 1) {
      Ph.M = Ph.Mt = START_M; bdReset(S.board.pipe); netReset(); setMode('pipe');
    } else if (li === 2) {
      S.sim.run = null; S.sim.results = {}; S.sim.tried = {}; S.sim.order = []; S.sim.last = null; setSlider('#sThr', 50); setMode('sim');
    } else {
      bdReset(S.board.city); S.ev = { sel: null, pred: {}, done: {}, ok: {}, run: null }; syncEvCtl(); setMode('city');
    }
  }
  const ensure = (m) => { if (S.mode !== m) setMode(m); };
  const R30 = runFull(30, null), R50 = runFull(50, null), R80 = runFull(80, null);
  const fmtPct = (v) => v + ' %';

  const levels = [
    {
      title: '센서 측정: 화분의 상태를 숫자로 읽어요', short: '센서 측정', icon: '🌡️', phase: '실험',
      features: ['sense'],
      intro: '<p class="si-q">❓ 탐구 질문: 화분이 스스로 물이 필요하다고 알려 주고 물까지 준다면 어떤 장치가 필요할까?</p>' +
        '<div class="si-link">🔗 중학교에서 <b>첨단 과학기술과 미래</b>를 배우며 사물인터넷을 만났고, 통합과학1 <b>신호와 정보</b>에서 센서가 자연의 변화를 신호로 바꾼다는 것을, <b>디지털 변환과 통신</b>에서 그 신호가 0과 1로 전달된다는 것을 배웠어요. 앞 차시 <b>빅데이터의 활용</b>에서 센서 값이 쌓이면 큰 자료가 된다는 것도 보았어요.</div>' +
        '<p>이번에는 <b>스마트 화분</b>을 만들어 봐요. 먼저 마이크로 보드에 <b>토양 수분·온도·조도 센서</b>를 연결해 값을 읽어요. 흙을 말리거나 적시고, 온도와 빛을 바꿔 숫자가 어떻게 변하는지 살펴봐요.</p>',
      setup() { enterLevel(0); showHint('💧 물 주기·🌬️ 말리기와 슬라이더로 값을 바꿔 봐요', 6000); },
      recap: '센서는 물리량을 전기 신호로 바꾸고, 보드는 이를 숫자로 읽어요. 환산하면 %, °C, lux 같은 값이 돼요.',
      summary: '<ul><li><b>센서</b>는 흙의 수분·온도·빛 같은 <b>물리량</b>을 전기 신호로 바꿔 주는 장치예요.</li><li>마이크로 보드(피지컬 컴퓨팅 기기)는 신호를 0~' + ADC + '의 숫자로 읽고, 이를 환산해 %, °C, lux로 보여 줘요. (예: 수분 센서의 값 ' + toRaw(0, 60) + ' → ' + SEN[0].conv(toRaw(0, 60)) + ' %)</li><li>흙을 적시면 수분 값이 올라가고, 온도·빛을 바꾸면 해당 센서의 값이 실시간으로 변해요.</li></ul>',
      missions: [
        {
          title: '세 센서의 값 바꿔 보기',
          goal: '흙의 수분은 <b>' + MOIST_RANGE + ' %p 이상</b>, 온도는 <b>' + TEMP_RANGE + ' °C 이상</b>, 조도는 <b>' + LUX_RANGE + ' lux 이상</b> 변하도록 조작해 보세요.',
          hint: '💧 물 주기와 🌬️ 말리기를 눌러 수분을 바꾸고, 온도·빛 슬라이더를 크게 움직여요. 보인 값의 가장 큰 값과 가장 작은 값의 차이를 재요.',
          setup() { ensure('sense'); S.sn.init = false; },
          check: () => rangeOf(0) >= MOIST_RANGE && rangeOf(1) >= TEMP_RANGE && rangeOf(2) >= LUX_RANGE, hold: 0.5,
          status: () => '수분 변화 <b>' + Math.round(rangeOf(0)) + ' / ' + MOIST_RANGE + ' %p</b> ' + mark(rangeOf(0) >= MOIST_RANGE) + ' · 온도 변화 <b>' + rangeOf(1).toFixed(1) + ' / ' + TEMP_RANGE + ' °C</b> ' + mark(rangeOf(1) >= TEMP_RANGE) + ' · 조도 변화 <b>' + Math.round(rangeOf(2)) + ' / ' + LUX_RANGE + ' lux</b> ' + mark(rangeOf(2) >= LUX_RANGE),
          explain: '센서는 흙이 젖을수록, 따뜻할수록, 밝을수록 더 큰 신호를 내고, 보드는 이 신호를 <b>0~' + ADC + '의 숫자</b>로 읽어요. 이 숫자를 환산한 것이 화면의 %, °C, lux 값이에요. 사물이 스스로 상태를 알려면 먼저 이렇게 <b>측정</b>해야 해요.',
        },
        {
          type: 'quiz', title: '센서는 무엇을 할까요?',
          goal: '스마트 화분의 <b>토양 수분 센서</b>가 하는 일로 알맞은 것은?',
          setup() { ensure('sense'); },
          choices: ['흙에 물을 직접 뿌려 준다', '인터넷으로 물이 부족하다는 문자를 보낸다', '흙의 수분이라는 물리량을 전기 신호로 바꿔 숫자로 읽을 수 있게 해 준다', '식물이 시들었는지 스스로 판단해 펌프를 켠다'],
          answer: 2,
          feedback: ['물을 주는 것은 작동기(펌프)가 하는 일이에요.', '값을 인터넷으로 보내는 것은 통신이 하는 일이에요.', '', '판단하는 것은 보드나 서버의 처리·판단 부분이 하는 일이에요.'],
          explain: '<b>센서</b>는 물리량을 전기 신호로 바꿔 주는 <b>감지</b> 장치예요. 값을 보내는 일은 통신이, 판단은 서버(처리)가, 물을 주는 일은 작동기가 맡아요.',
        },
      ],
    },
    {
      title: '연결과 전송: 값이 서버까지 가는 길', short: '연결과 전송', icon: '📶', phase: '모형',
      features: ['pipe'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서가 흙의 수분을 숫자로 바꿔 주는 것을 확인했어요. 그런데 이 숫자는 화분 옆의 보드에서만 보여요. 멀리 있는 앱이나 펌프가 알려면 어떻게 해야 할까요?</div>' +
        '<p><b>사물인터넷</b>은 사물에 센서와 통신 기능을 달아 인터넷으로 정보를 주고받는 기술이에요. <b>센서 → 통신 → 서버(처리·판단) → 작동기</b> 네 가지 블록을 순서대로 연결하고, 통신 상태를 바꿔 값이 어떻게 전달되는지 살펴봐요.</p>',
      setup() { enterLevel(1); showHint('블록을 끌어 위의 칸에 순서대로 놓아요', 6000); },
      recap: '사물인터넷은 센서(감지) → 통신(전송) → 서버(처리·판단) → 작동기(행동)로 이어져요. 통신이 끊기면 서버의 값이 멈춰요.',
      summary: '<ul><li><b>사물인터넷(IoT)</b>: 사물에 센서와 통신 기능을 달아 인터넷으로 정보를 주고받는 기술</li><li>구성: <b>센서</b>(측정) → <b>통신</b>(전송) → <b>서버·앱</b>(저장·처리·판단) → <b>작동기</b>(모터·펌프·LED로 행동)</li><li>통신이 <b>끊기거나 느려지면</b> 서버가 받은 값이 멈추거나 늦게 도착해서, 서버의 판단이 현실과 달라질 수 있어요.</li></ul>',
      missions: [
        {
          title: '사물인터넷의 네 블록 연결하기',
          goal: '블록 <b>4개</b>를 <b>측정 → 전송 → 처리·판단 → 작동</b> 순서로 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '센서가 먼저 재고, 통신이 보내고, 서버가 판단하고, 마지막에 작동기(펌프)가 움직여요.',
          manual: true,
          setup() { ensure('pipe'); },
          status: () => '놓은 블록 <b>' + bdPlaced(S.board.pipe) + ' / 4</b>',
          check: () => bdJudge(S.board.pipe, (c) => c.zone === c.ans),
          explain: '화분의 <b>센서</b>가 값을 재면, <b>통신</b>이 그 값을 인터넷으로 보내고, <b>서버·앱</b>이 값을 저장하고 규칙으로 판단한 뒤, <b>작동기(펌프)</b>가 실제로 물을 줘요. 이 흐름이 사물인터넷의 기본 구조예요.',
        },
        {
          title: '통신이 끊기면 어떻게 될까?',
          goal: '통신을 <b>❌ 끊김</b>으로 바꿔 서버의 값이 <b>3초 이상</b> 멈추는 것을 보고, 다시 <b>📶 정상</b>으로 이어 값이 갱신되는 것을 확인하세요.',
          hint: '통신 상태 버튼에서 ❌ 끊김을 누르고 기다려요. 💧·🌬️ 버튼으로 흙의 수분을 바꾸면 서버의 값과 실제 값이 달라지는 것이 잘 보여요.',
          setup() { ensure('pipe'); S.net.froze = false; S.net.resumed = false; },
          check: () => S.net.froze && S.net.resumed, hold: 0.3,
          status: () => '값이 3초 이상 멈춤 ' + mark(S.net.froze) + ' · 다시 이어서 갱신됨 ' + mark(S.net.resumed) + (S.net.comm === 'off' ? ' · 멈춘 지 <b>' + Math.min(3, S.clock - S.net.srv.got).toFixed(1) + ' / 3초</b>' : ''),
          explain: '통신이 끊기면 서버는 <b>마지막으로 받은 값</b>만 알고 있어요. 그 사이 흙의 수분이 달라져도 서버는 몰라서 잘못 판단할 수 있어요. 통신이 느려질 때도 서버의 값은 <b>조금 지난 값</b>이에요.',
        },
        {
          type: 'quiz', title: '서버는 무슨 일을 할까요?',
          goal: '스마트 화분에서 <b>서버·앱(처리·판단)</b>이 하는 일로 알맞은 것은?',
          setup() { ensure('pipe'); },
          choices: ['흙의 수분을 측정해 숫자로 바꾼다', '받은 값을 저장하고 규칙에 따라 펌프를 켤지 판단한다', '펌프를 돌려 물을 흙에 준다', '값을 무선 신호로 바꿔 인터넷으로 보낸다'],
          answer: 1,
          feedback: ['측정은 센서가 하는 일이에요.', '', '물을 주는 것은 작동기(펌프)의 일이에요.', '값을 보내는 것은 통신의 일이에요.'],
          explain: '서버·앱은 <b>처리·판단</b>을 맡아요. 받은 값을 저장하고 "수분이 임계값보다 낮으면 펌프 켜기" 같은 규칙으로 판단해서 작동기에 명령을 보내요.',
        },
      ],
    },
    {
      title: '자동 제어: 임계값 규칙 만들기', short: '자동 제어', icon: '⏱️', phase: '탐구',
      features: ['sim'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서 → 통신 → 서버 → 작동기의 흐름을 만들었어요. 이제 서버가 쓸 규칙, 곧 <b>임계값</b>을 정해 화분을 자동으로 돌봐요.</div>' +
        '<p>규칙은 <b>"수분이 □ % 미만이면 펌프 켜기"</b>예요. 낮(06~18시)에는 흙이 1시간에 ' + DAY_DROP + ' %p, 밤에는 ' + NIGHT_DROP + ' %p씩 말라요. 펌프가 켜지면 10분마다 수분이 ' + PUMP_ADD + ' %p 오르고 물 ' + WATER_TICK + ' L를 써요. 수분이 ' + DRY + ' % 미만이면 식물이 힘들어하고(' + DRY2 + ' % 미만이면 더 힘들어요), ' + WET + ' %를 넘게 젖어도 상해요. (교육용 예시 값이에요.)</p>',
      setup() { enterLevel(2); showHint('임계값을 정하고 ▶ 하루 시작을 눌러요', 6000); },
      recap: '임계값이 너무 낮으면 식물이 시들고, 너무 높으면 물이 낭비되고 과습이 돼요. 알맞은 임계값은 건강과 자원을 함께 지켜요.',
      summary: '<ul><li><b>자동 제어</b>: 센서 값을 임계값과 비교해 작동기를 켜고 끄는 규칙. (수분 &lt; 임계값 → 펌프 켜기)</li><li>임계값 30 %: 흙이 오래 말라 건강도 ' + HR(R30) + '. 임계값 50 %: 건강도 ' + HR(R50) + ', 물 ' + fL(WR(R50)) + ' L. 임계값 80 %: 건강도 ' + HR(R80) + ', 물 ' + fL(WR(R80)) + ' L로 과습·물 낭비.</li><li>건강도 ' + GOAL_H + ' 이상이면서 물 ' + fL(GOAL_L) + ' L 이하인 임계값은 <b>' + FEAS.lo + '~' + FEAS.hi + ' %</b>예요.</li></ul>',
      missions: [
        {
          title: '알맞은 임계값 찾기',
          goal: '임계값 <b>30 %, 50 %, 80 %</b>로 하루씩 돌려 비교한 뒤, <b>건강도 ' + GOAL_H + ' 이상</b>이면서 <b>물 ' + fL(GOAL_L) + ' L 이하</b>인 결과를 만들어 보세요.',
          hint: '임계값을 ' + FEAS.lo + ' ~ ' + FEAS.hi + ' % 사이로 정하면 돼요. 30·50·80 % 버튼으로 먼저 비교해요. 마지막에 돌린 하루가 목표를 만족해야 해요.',
          setup() { ensure('sim'); },
          check: () => S.sim.tried[30] && S.sim.tried[50] && S.sim.tried[80] && !!S.sim.last && S.sim.last.H >= GOAL_H && S.sim.last.pumps <= GOAL_PUMPS, hold: 0.3,
          status: () => '비교한 임계값 30 % ' + mark(S.sim.tried[30]) + ' 50 % ' + mark(S.sim.tried[50]) + ' 80 % ' + mark(S.sim.tried[80]) + ' · 마지막 결과 ' + (S.sim.last ? '건강도 <b>' + S.sim.last.H + '</b>, 물 <b>' + fL(S.sim.last.pumps * WATER_TICK) + ' L</b> ' + mark(S.sim.last.H >= GOAL_H && S.sim.last.pumps <= GOAL_PUMPS) : '<b>없음</b> ⬜'),
          explain: '<b>임계값이 낮으면</b>(30 %) 흙이 오래 말라 있어서 건강도가 <b>' + HR(R30) + '</b>으로 떨어져요. <b>임계값이 높으면</b>(80 %) 흙이 늘 젖어 건강도가 <b>' + HR(R80) + '</b>, 물은 <b>' + fL(WR(R80)) + ' L</b>나 써요. <b>' + FEAS.lo + '~' + FEAS.hi + ' %</b>에서는 건강도 ' + GOAL_H + ' 이상, 물 ' + fL(GOAL_L) + ' L 이하가 돼요.',
        },
        {
          type: 'quiz', title: '임계값이 너무 높거나 낮으면?',
          goal: '임계값을 <b>너무 높게</b>(예: 80 %) 또는 <b>너무 낮게</b>(예: 30 %) 정했을 때의 문제로 알맞은 것은?',
          setup() { ensure('sim'); },
          choices: ['임계값이 낮을수록 물을 아끼므로 항상 더 좋다', '임계값이 높을수록 식물이 더 건강해진다', '임계값은 하루의 결과에 영향을 주지 않는다', '너무 높으면 흙이 늘 젖어 과습과 물 낭비가 생기고, 너무 낮으면 흙이 말라 식물이 시든다'],
          answer: 3,
          feedback: ['너무 낮으면 흙이 말라 식물이 시들어요.', '너무 높으면 흙이 늘 젖어 오히려 뿌리가 상하고 물이 낭비돼요.', '임계값에 따라 건강도와 물 사용량이 크게 달라져요.', ''],
          explain: '자동 제어에서는 <b>임계값을 어디로 정하느냐</b>가 중요해요. 너무 높으면 과습·물 낭비, 너무 낮으면 시듦이 생겨요. 센서 값만 있으면 되는 것이 아니라 <b>알맞은 규칙</b>이 있어야 해요.',
        },
      ],
    },
    {
      title: '유용성과 한계: 스마트 시티를 예측해요', short: '유용성·한계', icon: '🏙️', phase: '예측',
      features: ['city', 'events'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 임계값 규칙으로 화분을 자동으로 돌보는 사물인터넷을 만들었어요. 이제 도시에서 쓰이는 사물인터넷이 가져올 <b>쓸모와 한계</b>를 예측해 봐요.</div>' +
        '<p>스마트 시티의 장치마다 <b>쓸모 카드 1장</b>과 <b>한계 카드 1장</b>을 짝지어요. 그다음 센서 고장·해킹·통신 장애가 생기면 어떤 일이 벌어질지 <b>먼저 예측하고</b>, 시뮬레이션으로 확인해요.</p>',
      setup() { enterLevel(3); showHint('카드를 끌어 알맞은 장치에 놓아요', 6000); },
      recap: '사물인터넷은 에너지·시간·건강 관리에 도움을 주지만, 센서 오류·통신 장애·해킹·비용·정보 격차 같은 한계도 있어요.',
      summary: '<ul><li><b>유용성</b>: 필요할 때만 작동해 에너지와 자원을 아끼고(스마트 가로등·스마트 팜), 실시간으로 상태를 알려 주며(대기질·쓰레기통), 건강을 돌보게 해요(웨어러블).</li><li><b>한계·위험</b>: 센서 오류·고장, 통신 끊김, 해킹과 개인정보 유출, 설치 비용·전력, 기기가 없는 사람과의 정보 격차, 사람의 판단 역할 감소</li><li>센서 고장(값이 0 %로 고정)은 물 ' + fL(WR(EVRUN.stuck)) + ' L 낭비와 건강도 ' + HR(EVRUN.stuck) + ', 통신 장애는 건강도 ' + HR(EVRUN.comm) + '으로 이어졌어요. (임계값 50 %)</li><li>사물인터넷이 모은 센서 값이 쌓이면 <b>빅데이터</b>가 돼요. 이때 개인정보 보호가 중요해요.</li></ul>',
      missions: [
        {
          title: '장치의 쓸모와 한계 짝짓기',
          goal: '카드 <b>10장</b>을 알맞은 장치에 <b>2장씩</b>(쓸모 1장, 한계 1장) 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드 왼쪽의 초록색은 쓸모, 빨간색은 한계예요. 내용에 나온 낱말(쓰레기통, 가로등, 대기질, 집, 심박)을 단서로 해요.',
          manual: true,
          setup() { ensure('city'); },
          status: () => '놓은 카드 <b>' + bdPlaced(S.board.city) + ' / 10</b>',
          check() {
            const B = S.board.city;
            const r = bdJudge(B, (c) => c.zone === c.ans);
            return r;
          },
          explain: '<b>쓰레기통·가로등·스마트 홈</b>은 필요할 때만 작동해 시간과 에너지를 아끼고, <b>대기질 센서망</b>은 오염을 실시간으로 알려 줘요. <b>웨어러블</b>은 건강 습관을 돌아보게 해요. 하지만 센서 오류, 통신 끊김, 비용, 해킹·정보 유출, 기기가 없는 사람의 소외 같은 <b>한계</b>도 있어요.',
        },
        {
          title: '사건이 생기면? 예측하고 확인하기',
          goal: '🔧 센서 고장, 🕸️ 해킹, 📵 통신 장애를 각각 <b>먼저 예측</b>한 뒤 ▶ 하루 시작으로 확인하세요. (세 가지 모두)',
          hint: '사건을 고르고 예측을 누른 다음 ▶ 하루 시작을 눌러요. 센서가 0 %로 고정되면 제어기는 흙이 늘 말랐다고 믿어요.',
          setup() { ensure('events'); syncEvCtl(); },
          check: () => !!(S.ev.done.stuck && S.ev.done.hack && S.ev.done.comm), hold: 0.3,
          status: () => ['stuck', 'hack', 'comm'].map((k) => EV_INFO[k].ico + ' ' + EV_INFO[k].name + ' ' + (S.ev.done[k] ? (S.ev.ok[k] ? '✅(예측 맞음)' : '✅(예측과 달랐어요)') : '⬜')).join(' · '),
          explain: '<b>🔧 센서 고장</b>(값이 0 %로 고정): 제어기가 늘 "말랐다"고 믿어 펌프를 계속 켜서 물 <b>' + fL(WR(EVRUN.stuck)) + ' L</b>를 쓰고 건강도는 <b>' + HR(EVRUN.stuck) + '</b>이에요. <b>📵 통신 장애</b>: 마지막 값만 믿어 펌프가 켜지지 않아 물 ' + fL(WR(EVRUN.comm)) + ' L, 건강도 <b>' + HR(EVRUN.comm) + '</b>(시듦)이에요. <b>🕸️ 해킹</b>: 새벽 3~6시(3시간) 동안 펌프가 마음대로 켜져 물 <b>' + fL(WR(EVRUN.hack)) + ' L</b>가 낭비돼요. (정상 규칙은 물 ' + fL(WR(R50)) + ' L)',
        },
        {
          type: 'quiz', title: '사물인터넷과 빅데이터',
          goal: '스마트 화분의 센서가 1분마다 기록한 값이 몇 달 동안 쌓였어요. 이것이 앞 차시의 <b>빅데이터</b>와 이어지는 점으로 알맞은 것은?',
          setup() { ensure('city'); },
          choices: ['쌓인 센서 값을 분석하면 물이 부족해지는 시간대나 계절별 규칙을 찾아 미리 예측할 수 있다', '사물인터넷은 자료를 모으지 않으므로 빅데이터와 관계가 없다', '자료가 많이 쌓일수록 센서의 오차가 완전히 사라진다', '쌓인 자료는 사람이 읽을 수 없으므로 모두 지워야 한다'],
          answer: 0,
          feedback: ['', '사물인터넷의 센서는 많은 자료를 계속 만들어 내요.', '자료가 많아도 센서가 가진 측정 오차가 사라지지는 않아요.', '컴퓨터로 분석하면 규칙을 찾을 수 있어요. 지울 필요는 없어요.'],
          explain: '사물인터넷의 센서가 만든 값이 쌓이면 <b>빅데이터</b>가 돼요. 이를 분석하면 규칙을 찾고 미래를 예측하는 데 쓸 수 있어요. 대신 이 자료에는 생활 정보가 담길 수 있어서 <b>개인정보 보호</b>도 함께 생각해야 해요.',
        },
        {
          type: 'quiz', title: '개인정보 위험',
          goal: '스마트 홈 기기가 집 안의 사용 시간과 움직임 기록을 서버로 보내요. 가장 조심해야 할 점은?',
          setup() { ensure('city'); },
          choices: ['기기가 전기를 조금 쓴다는 점뿐이다', '센서의 눈금이 0~' + ADC + '라는 점이다', '기록이 해킹이나 유출로 새면 생활 습관과 집이 비는 시간 같은 개인정보가 알려질 수 있다는 점이다', '자료가 서버에 있으면 항상 안전하다는 점이다'],
          answer: 2,
          feedback: ['전기 사용도 한계지만 가장 조심할 점은 아니에요.', '눈금의 범위는 위험과 관계가 없어요.', '', '서버도 해킹될 수 있어서 항상 안전하지는 않아요.'],
          explain: '사물인터넷 기기는 우리 생활의 정보를 <b>계속 모아서 보내요</b>. 그래서 해킹과 유출이 일어나면 개인정보가 드러날 수 있어요. 필요한 정보만 모으고 안전하게 지키는 것이 중요해요. (이 문제는 다음 차시 과학 윤리에서 다시 만나요.)',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-iot', mount: '#game', badge: '사물인터넷 설계자', homeHref: '../../index.html#h1b',
    featureLabels: { sense: '🌡️ 센서 보드 · 흙·온도·빛 조작', pipe: '📶 연결 블록 · 통신 상태', sim: '⏱️ 임계값 규칙 · 하루 시뮬레이션', city: '🏙️ 스마트 시티 카드', events: '⚠️ 사건 예측 실험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  updateCtl(); syncEvCtl();
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    Object.keys(S.board).forEach((k) => bdStep(S.board[k], dt));
    stepSense(dt); stepPipe(dt);
    stepRun(S.sim.run, dt, recordSim); stepRun(S.ev.run, dt, recordEv);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    const m = S.mode;
    if (m === 'sense') drawSense(t); else if (m === 'pipe') drawPipe(t); else if (m === 'sim') drawSim(t, false); else if (m === 'city') drawCity(t); else drawSim(t, true);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, FEAS, EVRUN, R30, R50, R80, get game() { return game; }, setMode, enterLevel, setSlider, runFull, goodRun, classify, readM, readT, readL, rangeOf, pipeAssembled,
    fillBoard(key, right) { const B = S.board[key]; bdFill(B, (c, i) => { if (right !== false) return c.ans; if (key === 'pipe') return PIPE[(PIPE.findIndex((z) => z.id === c.ans) + 1) % 4].id; return DEV[(DEV.findIndex((d) => d.id === c.ans) + 1) % 5].id; }); },
    judge(key) { return bdJudge(S.board[key], (c) => c.zone === c.ans); },
    finish(kind) { const r = kind === 'sim' ? S.sim.run : S.ev.run; while (r && !r.done) { tickRun(r); } if (r) { if (kind === 'sim') recordSim(r); else recordEv(r); } },
  };

})();
