/* =========================================================
   통합과학2 Ⅲ. 과학과 미래 사회 - 인공지능 로봇 (단원 5차시)
   성취기준 [10통과2-03-03] 인공지능 로봇, 사물인터넷 등과 같이 과학기술의 발전을 인간 삶과 환경 개선에 활용하는 사례를 찾고,
   이러한 과학기술의 발전이 미래 사회에 미치는 유용성과 한계를 예측할 수 있다. (인공지능 로봇 부분)
   ① 모형: 로봇 구조 (청소 로봇: 센서 → 판단 → 구동, 충돌·낭떠러지·거리 센서)
   ② 탐구: 학습하는 AI (쓰레기 분류 학습, 데이터의 양과 편향이 정확도에 미치는 영향)
   ③ 분석: 로봇 분석 (일상 로봇 4종의 센서·판단·구동 표 채우기)
   ④ 적용: 개선 설계 (서빙 로봇 개선 카드 조합과 성공률·비용·안전·개인정보 위험)
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
     시드 난수 (같은 조건이면 같은 결과가 나오게 해요)
     ====================================================== */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  /* ======================================================
     화면 1 자료: 방 지도와 청소 로봇 (교육용 모형)
     ====================================================== */
  const GW = 22, GH = 15, RAD = 0.45, VROB = 3.4, START = { x: 1.5, y: 13.6, th: -0.3 };
  const FURN = [
    { r: [2, 2, 6, 3], name: '소파', col: '#a78bfa' }, { r: [9, 6, 4, 3], name: '식탁', col: '#b08968' }, { r: [15, 1, 5, 4], name: '침대', col: '#7dd3fc' },
    { r: [0, 8, 2, 4], name: '책장', col: '#78716c' }, { r: [11, 11, 2, 2], name: '화분', col: '#86efac' },
  ];
  const CLIFF = [17, 11, 5, 4];
  const inRect = (x, y, r, m) => x > r[0] - m && x < r[0] + r[2] + m && y > r[1] - m && y < r[1] + r[3] + m;
  function blockedAt(x, y) {
    if (x < RAD || y < RAD || x > GW - RAD || y > GH - RAD) return true;
    for (const f of FURN) { const r = f.r, cx = Math.max(r[0], Math.min(x, r[0] + r[2])), cy = Math.max(r[1], Math.min(y, r[1] + r[3])); if (Math.hypot(x - cx, y - cy) < RAD) return true; }
    return false;
  }
  const CLEANABLE = [];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const cx = i + 0.5, cy = j + 0.5; if (FURN.some((f) => cx > f.r[0] && cx < f.r[0] + f.r[2] && cy > f.r[1] && cy < f.r[1] + f.r[3])) continue; if (inRect(cx, cy, CLIFF, 0)) continue; CLEANABLE.push([i, j]); }
  const freeCell = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !blockedAt(i + 0.5, j + 0.5);
  const GOAL_COV = 90;

  const S = {
    mode: 'robot', fade: 0, clock: 0,
    rb: { x: START.x, y: START.y, th: START.th, st: 'go', tmr: 0, tgt: 0, path: [], clean: new Uint8Array(GW * GH), anim: new Float32Array(GW * GH), n: 0, falls: 0, bumps: 0, ft: 0, sen: [false, false, false], speed: 1, rnd: rng(7), flash: [0, 0, 0], hit: [false, false, false], note: '', stuckT: 0, wheel: 0 },
    ln: null, tb: null, ds: null,
  };
  const R = S.rb;
  const covPct = () => Math.floor(100 * R.n / CLEANABLE.length);
  function robotReset() {
    R.x = START.x; R.y = START.y; R.th = START.th; R.st = 'go'; R.tmr = 0; R.path = []; R.clean.fill(0); R.anim.fill(0); R.n = 0; R.falls = 0; R.bumps = 0; R.ft = 0; R.rnd = rng(7); R.flash = [0, 0, 0]; R.hit = [false, false, false]; R.note = ''; R.stuckT = 0;
  }
  function planPath() {
    const si = Math.floor(R.x), sj = Math.floor(R.y), prev = new Map(), q = [[si, sj]], knowCliff = R.sen[1];
    prev.set(si + ',' + sj, null);
    while (q.length) {
      const [i, j] = q.shift();
      const isCliffCell = inRect(i + 0.5, j + 0.5, CLIFF, 0);
      if (!(i === si && j === sj) && !R.clean[j * GW + i] && (knowCliff ? !isCliffCell : true) && !FURN.some((f) => i + 0.5 > f.r[0] && i + 0.5 < f.r[0] + f.r[2] && j + 0.5 > f.r[1] && j + 0.5 < f.r[1] + f.r[3])) {
        const p = []; let k = i + ',' + j;
        while (k) { const [a, b] = k.split(',').map(Number); p.unshift([a + 0.5, b + 0.5]); k = prev.get(k); }
        p.shift(); return p;
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, b = j + dj, key = a + ',' + b;
        if (prev.has(key) || !freeCell(a, b)) continue;
        if (di && dj && !(freeCell(i + di, j) && freeCell(i, j + dj))) continue;
        if (knowCliff && inRect(a + 0.5, b + 0.5, CLIFF, 0)) continue;
        prev.set(key, i + ',' + j); q.push([a, b]);
      }
    }
    return [];
  }
  function rayHit(len) { for (let d = 0.2; d <= len; d += 0.15) if (blockedAt(R.x + Math.cos(R.th) * d, R.y + Math.sin(R.th) * d)) return true; return false; }
  const angDiff = (a, b) => ((a - b + Math.PI * 3) % TAU) - Math.PI;
  function stepRobotOnce(h) {
    const sen = R.sen;
    if (R.st === 'fall') { R.ft += h; if (R.ft >= 1.6) { R.x = START.x; R.y = START.y; R.th = START.th; R.st = 'go'; R.path = []; R.ft = 0; R.note = ''; } return; }
    const cliffAhead = sen[1] && inRect(R.x + Math.cos(R.th) * 1.0, R.y + Math.sin(R.th) * 1.0, CLIFF, 0);
    R.hit[1] = cliffAhead; R.hit[2] = sen[2] && rayHit(1.6);
    let move = false;
    if (sen[2]) { // 거리 센서로 만든 지도 위에서 가까운 안 닦은 곳을 찾아 가요
      if (R.st === 'stuck' || R.st === 'back' || R.st === 'turn') R.st = 'go';
      if (!R.path.length) R.path = planPath();
      if (R.path.length) {
        const [wx, wy] = R.path[0], ang = Math.atan2(wy - R.y, wx - R.x), d = angDiff(ang, R.th), stp = 6 * h;
        R.th += Math.abs(d) <= stp ? d : Math.sign(d) * stp;
        if (Math.abs(d) < 0.5) move = true;
        if (Math.hypot(wx - R.x, wy - R.y) < 0.12) R.path.shift();
        R.note = '지도를 보고 아직 안 닦은 곳으로 가요';
      } else R.note = '모두 닦았어요';
    } else if (R.st === 'back') {
      R.x -= Math.cos(R.th) * VROB * 0.5 * h; R.y -= Math.sin(R.th) * VROB * 0.5 * h; R.tmr -= h; R.note = '부딪혀서 뒤로 물러나요';
      if (R.tmr <= 0) { R.tgt = R.th + (R.rnd() < 0.5 ? -1 : 1) * (1.8 + R.rnd() * 1.4); R.st = 'turn'; }
    } else if (R.st === 'turn') {
      const d = angDiff(R.tgt, R.th), stp = 3.6 * h; R.th += Math.abs(d) <= stp ? d : Math.sign(d) * stp; R.note = '방향을 바꿔요';
      if (Math.abs(angDiff(R.tgt, R.th)) < 1e-6) R.st = 'go';
    } else if (R.st === 'go') {
      if (cliffAhead) { R.tgt = R.th + (R.rnd() < 0.5 ? -1 : 1) * (2.0 + R.rnd() * 1.2); R.st = 'turn'; R.flash[1] = 1; R.note = '낭떠러지를 발견! 방향을 바꿔요'; }
      else { move = true; R.note = '앞으로 가요'; }
    }
    if (move) {
      const nx = R.x + Math.cos(R.th) * VROB * h, ny = R.y + Math.sin(R.th) * VROB * h;
      if (blockedAt(nx, ny)) {
        if (sen[0]) { R.bumps++; R.flash[0] = 1; R.st = 'back'; R.tmr = 0.3; R.path = []; R.note = '쿵! 충돌을 느꼈어요'; }
        else if (R.st !== 'stuck') { R.st = 'stuck'; R.stuckT = 0; }
        if (R.st === 'stuck') { R.stuckT += h; R.note = '벽에 부딪혔는데 모르고 계속 밀어요'; }
      } else { R.x = nx; R.y = ny; R.wheel += VROB * h; if (R.st === 'stuck') R.st = 'go'; }
    }
    if (inRect(R.x, R.y, CLIFF, 0)) { R.st = 'fall'; R.ft = 0; R.falls++; R.note = '앗! 계단에서 떨어졌어요'; return; }
    for (let k = 0; k < CLEANABLE.length; k++) {
      const c = CLEANABLE[k], idx = c[1] * GW + c[0];
      if (!R.clean[idx] && Math.hypot(R.x - (c[0] + 0.5), R.y - (c[1] + 0.5)) < 0.75) { R.clean[idx] = 1; R.n++; }
    }
  }
  function stepRobot(dt) {
    R.acc = (R.acc || 0) + dt * R.speed;
    let guard = 0;
    while (R.acc >= 1 / 60 && guard++ < 24) { R.acc -= 1 / 60; stepRobotOnce(1 / 60); }
    R.flash = R.flash.map((v) => Math.max(0, v - dt * 3));
    for (let k = 0; k < R.anim.length; k++) { if (R.clean[k]) R.anim[k] = approach(R.anim[k], 1, dt, 6); else R.anim[k] = 0; }
  }

  /* ======================================================
     화면 2 자료: 쓰레기 분류 학습 (교육용 모형)
     크기(가로)·밝기(세로)로 병·캔·종이를 구분해요. 1-최근접 이웃 방식으로 구역을 나눠요.
     ====================================================== */
  const KINDS = [
    { id: 'bottle', name: '플라스틱 병', ico: '🧴', col: '#0ea5e9' },
    { id: 'can', name: '캔', ico: '🥫', col: '#f59e0b' },
    { id: 'paper', name: '종이', ico: '📄', col: '#16a34a' },
  ];
  const CLUS = [[[50, 25], [18, 72]], [[82, 25], [50, 72]], [[18, 25], [82, 72]]], SDV = 8;
  const clip = (v) => Math.max(5, Math.min(95, v));
  function genItems(seed, n) { const r = rng(seed), out = []; for (let i = 0; i < n; i++) CLUS.forEach((cs, k) => { const c = cs[i % 2]; out.push({ k, x: clip(c[0] + gauss(r) * SDV), y: clip(c[1] + gauss(r) * SDV) }); }); return out; }
  const POOL = genItems(20 * 31 + 3, 30);                    // 쓰레기 더미: 90개 (종류마다 30개)
  const TEST = genItems(29 * 17 + 101, 14).slice(0, 40);     // 새 쓰레기 40개
  POOL.forEach((p, i) => { p.i = i; });
  const DARK_Y = 50;                                          // '어두운 쪽' = 밝기가 50 미만
  const nearest = (S, x, y) => { let b = null, bd = 1e9; S.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; b = s; } }); return b ? b.k : -1; };
  const accOf = (S) => (S.length ? TEST.filter((t) => nearest(S, t.x, t.y) === t.k).length / TEST.length * 100 : 0);
  // 같은 방법으로 모으면 늘 같은 순서로 모여요
  function evenOrder(n) { const r = rng(5), S = [], used = new Set(); while (S.length < n) { const k = S.length % 3, cand = POOL.filter((p) => p.k === k && !used.has(p.i)); const b = cand[Math.floor(r() * cand.length)]; used.add(b.i); S.push(b); } return S; }
  const ONE_ORDER = (() => { const r = rng(9), c = POOL.filter((p) => p.y < DARK_Y); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; })();
  const BENCH = { e3: accOf(evenOrder(3)), e12: accOf(evenOrder(12)), e15: accOf(evenOrder(15)), e30: accOf(evenOrder(30)), o30: accOf(ONE_ORDER.slice(0, 30)), all: accOf(POOL) };
  const f1 = (v) => v.toFixed(1);
  const GOAL_ACC = 90, GCELL = 40;

  S.ln = { sel: new Set(), src: new Set(), rE: rng(5), done: false, dirty: true, acc: null, phase: 'idle', t: 0, grid: new Int8Array(GCELL * GCELL).fill(-1), alpha: new Float32Array(GCELL * GCELL), shown: 0, tiles: [], items: [], cmp: { even: null, one: null }, lastN: 0, flashT: 0 };
  const L = S.ln;
  const selList = () => POOL.filter((p) => L.sel.has(p.i));
  function addEven(n) {
    for (let a = 0; a < n; a++) {
      const cnt = [0, 0, 0]; selList().forEach((p) => cnt[p.k]++);
      const k = cnt.indexOf(Math.min.apply(null, cnt)); // 가장 적게 모은 종류부터
      const cand = POOL.filter((p) => p.k === k && !L.sel.has(p.i)); if (!cand.length) continue;
      L.sel.add(cand[Math.floor(L.rE() * cand.length)].i);
    }
    L.src.add('even'); L.dirty = true;
  }
  function addOne(n) { let a = 0; for (const p of ONE_ORDER) { if (a >= n) break; if (!L.sel.has(p.i)) { L.sel.add(p.i); a++; } } L.src.add('one'); L.dirty = true; }
  function clearSel() { L.sel.clear(); L.src.clear(); L.rE = rng(5); L.dirty = true; }
  function togglePick(i) { if (L.sel.has(i)) L.sel.delete(i); else L.sel.add(i); L.src.add('pick'); L.dirty = true; }
  function learn() {
    const S0 = selList(); if (!S0.length) { toast('먼저 샘플을 모아 주세요', 'bad'); return false; }
    // 구역 경계 계산 (격자 40×40)
    for (let j = 0; j < GCELL; j++) for (let i = 0; i < GCELL; i++) L.grid[j * GCELL + i] = nearest(S0, (i + 0.5) * 100 / GCELL, (j + 0.5) * 100 / GCELL);
    L.alpha.fill(0);
    L.tiles = TEST.map((t) => ({ ok: nearest(S0, t.x, t.y) === t.k, pred: nearest(S0, t.x, t.y), k: t.k }));
    L.n = S0.length; L.srcAtLearn = Array.from(L.src).sort().join('+');
    L.acc = L.tiles.filter((t) => t.ok).length / TEST.length * 100;
    L.shown = 0; L.phase = 'test'; L.t = 0; L.done = false; L.dirty = false; L.items = [];
    Sound.click(); return true;
  }
  function stepLearn(dt) {
    if (L.phase === 'idle') return;
    L.t += dt;
    for (let k = 0; k < L.alpha.length; k++) L.alpha[k] = approach(L.alpha[k], L.grid[k] >= 0 ? 1 : 0, dt, 7);
    if (L.phase === 'test') {
      const want = RM ? TEST.length : Math.min(TEST.length, Math.floor(L.t / 0.07));
      while (L.shown < want) { const t = L.tiles[L.shown]; L.items.push({ k: t.k, pred: t.pred, ok: t.ok, age: 0 }); L.shown++; }
      if (L.shown >= TEST.length && L.items.every((q) => q.age > 0.6)) {
        L.phase = 'done'; L.done = true; Sound.success();
        const key = L.srcAtLearn;
        if (L.n >= 30 && key === 'even') L.cmp.even = L.acc; if (L.n >= 30 && key === 'one') L.cmp.one = L.acc;
        if (L.acc >= GOAL_ACC) parts.burst(PHONE ? 300 : 650, PHONE ? 500 : 120, { count: 14, speed: 150, size: 3.5, life: 0.8 });
      }
    }
    L.items.forEach((q) => { q.age += dt; });
    if (L.items.length > 60) L.items.splice(0, L.items.length - 60);
  }
  const shownAcc = () => (L.acc == null ? null : L.tiles.slice(0, L.shown).filter((t) => t.ok).length / TEST.length * 100);
  const accFinal = () => (L.done && !L.dirty ? L.acc : null);

  /* ======================================================
     화면 3 자료: 일상 로봇 4종 분석
     ====================================================== */
  const ROBOTS = [
    { id: 'clean', ico: '🧹', name: '청소 로봇', d: '가구 배치 지도를 만들고 정해 둔 경로로 구석구석 청소해요.', pro: '사람 대신 반복해서 청소해요', con: '낯선 물건이 놓이면 지도와 달라 길을 헤맬 수 있어요' },
    { id: 'serve', ico: '🍽️', name: '서빙 로봇', d: '식당에서 음식을 나르며 장애물을 만나면 멈추거나 돌아가요.', pro: '무거운 음식을 대신 날라 줘요', con: '좁은 통로에서는 사람과 부딪힐 수 있어요' },
    { id: 'care', ico: '🧸', name: '돌봄·대화 로봇', d: '말소리를 알아듣고 표정으로 기분을 짐작해 대답해요.', pro: '말동무가 되어 외로움을 덜어 줘요', con: '대화와 표정 같은 개인정보가 모여요' },
    { id: 'drone', ico: '🚁', name: '농업용 드론', d: '밭 위를 날며 찍은 영상으로 병해충을 찾아 약을 뿌려요.', pro: '넓은 밭을 빠르게 살펴요', con: '날씨가 나쁘면 못 날고 영상 판별이 틀릴 수도 있어요' },
  ];
  const COLS = [
    { key: 'sen', name: '센서 (감지)', opts: ['충돌·낭떠러지·거리 센서', '거리 센서·카메라', '마이크·카메라', '카메라·GPS'] },
    { key: 'brain', name: '판단', opts: ['규칙으로 판단 (지도·경로 계획)', '규칙으로 판단 (멈춤·우회)', '인공지능으로 판단 (음성·감정 인식)', '인공지능으로 판단 (영상으로 병해충 판별)'] },
    { key: 'act', name: '구동 (행동)', opts: ['바퀴 모터·브러시', '바퀴 모터·쟁반', '스피커·화면·팔 모터', '프로펠러 모터·분무기'] },
  ];
  S.tb = { v: [], bad: [], flip: [0, 0, 0, 0], pop: [], rev: [false, false, false, false] };
  function tbReset() { S.tb.v = ROBOTS.map((r, ri) => COLS.map((c, ci) => (ri + 1 + ci) % 4)); S.tb.bad = ROBOTS.map(() => [false, false, false]); S.tb.flip = [0, 0, 0, 0]; S.tb.pop = ROBOTS.map(() => [0, 0, 0]); S.tb.rev = [false, false, false, false]; }
  tbReset();
  const rowOK = (ri) => S.tb.v[ri].every((v) => v === ri);
  const tbCorrect = () => S.tb.v.reduce((n, row, ri) => n + row.filter((v) => v === ri).length, 0);

  /* ======================================================
     화면 4 자료: 서빙 로봇 개선 설계
     ====================================================== */
  const BASE = { s: 60, c: 20, f: 50, p: 15 };
  const IMP = {
    sensor: { name: '센서 추가(카메라)', ico: '📷', s: 16, c: 20, f: 15, p: 25, side: '카메라에 사람 얼굴이 찍혀 개인정보 위험이 늘어요' },
    data: { name: '학습 데이터 확대', ico: '📚', s: 12, c: 10, f: 5, p: 10, side: '영상을 더 모아야 해서 비용과 개인정보 위험이 늘어요' },
    speed: { name: '속도 제한', ico: '🐢', s: 8, c: 0, f: 20, p: 0, side: '움직임이 느려져 배달 시간이 길어져요' },
    human: { name: '사람 호출 기능', ico: '📞', s: 10, c: 5, f: 10, p: 0, side: '호출에 응답할 직원이 필요해 사람의 일이 달라져요' },
  };
  const IMP_KEYS = Object.keys(IMP);
  const GOAL_S = 90, GOAL_P = 40;
  function metrics(sel) {
    const m = { s: BASE.s, c: BASE.c, f: BASE.f, p: BASE.p };
    IMP_KEYS.forEach((k) => { if (sel[k]) { m.s += IMP[k].s; m.c += IMP[k].c; m.f += IMP[k].f; m.p += IMP[k].p; } });
    Object.keys(m).forEach((k) => { m[k] = clamp(m[k], 0, 100); });
    return m;
  }
  const goalMet = (m) => m.s >= GOAL_S && m.p <= GOAL_P;
  const COMBOS = (() => { const out = []; for (let b = 0; b < 16; b++) { const sel = {}; IMP_KEYS.forEach((k, i) => { sel[k] = !!(b & (1 << i)); }); if (goalMet(metrics(sel))) out.push(IMP_KEYS.filter((k) => sel[k])); } return out; })();
  S.ds = { sel: { sensor: false, data: false, speed: false, human: false }, side: null, sp: { s: new SciSim.Spring(BASE.s, { stiffness: 120, damping: 16 }), c: new SciSim.Spring(BASE.c, { stiffness: 120, damping: 16 }), f: new SciSim.Spring(BASE.f, { stiffness: 120, damping: 16 }), p: new SciSim.Spring(BASE.p, { stiffness: 120, damping: 16 }) }, trial: 0, tt: 0, rx: 0, ph: 'walk', ev: null };
  const D2 = S.ds;
  const dsM = () => metrics(D2.sel);

  const mixC = SciSim.color.mix, rgba = SciSim.color.rgba;
  /* ======================================================
     화면 1: 청소 로봇
     ====================================================== */
  function robGeom() {
    if (!PHONE) return { cs: 22, room: { x: 22, y: 22 }, P: { x: 14, y: 14, w: 500, h: 346 }, F: { x: 526, y: 14, w: 260, h: 346 }, cov: { x: 14, y: 372, w: 380, h: 174 }, sn: { x: 406, y: 372, w: 380, h: 174 } };
    return { cs: 26, room: { x: 14, y: 22 }, P: { x: 12, y: 12, w: 576, h: 412 }, F: { x: 12, y: 432, w: 576, h: 160 }, cov: { x: 12, y: 600, w: 576, h: 100 }, sn: { x: 12, y: 708, w: 576, h: 120 } };
  }
  const SENS_INFO = [
    { ico: '💥', name: '충돌 센서', d: '부딪힌 순간을 느껴요', col: '#e2464b' },
    { ico: '🕳️', name: '낭떠러지 센서', d: '바닥이 없는 곳을 알아채요', col: '#f59e0b' },
    { ico: '📡', name: '거리 센서', d: '거리를 재서 지도를 만들어요', col: '#0ea5e9' },
  ];
  function drawRobot(t) {
    const G = robGeom(), cs = G.cs, X = (v) => G.room.x + v * cs, Y = (v) => G.room.y + v * cs;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(G.P.x, G.P.y, G.P.w, G.P.h);
    // 바닥
    ctx.save(); rr(X(0), Y(0), GW * cs, GH * cs, 6).clip();
    ctx.fillStyle = '#f1e4cf'; ctx.fillRect(X(0), Y(0), GW * cs, GH * cs);
    for (let j = 0; j < GH; j++) { ctx.fillStyle = j % 2 ? 'rgba(180,140,90,.07)' : 'rgba(180,140,90,.02)'; ctx.fillRect(X(0), Y(j), GW * cs, cs); }
    // 먼지와 닦은 곳
    CLEANABLE.forEach(([i, j]) => {
      const a = R.anim[j * GW + i];
      if (a > 0.02) { ctx.fillStyle = 'rgba(186,230,253,' + (0.55 * a) + ')'; ctx.fillRect(X(i), Y(j), cs, cs); }
      if (a < 0.98) { ctx.fillStyle = 'rgba(120,90,60,' + (0.28 * (1 - a)) + ')'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(X(i) + cs * (0.2 + 0.6 * ((hash(i * 7 + j * 13 + k) + 1) / 2)), Y(j) + cs * (0.2 + 0.6 * ((hash(i * 3 + j * 5 + k * 9) + 1) / 2)), 1.6, 0, TAU); ctx.fill(); } }
    });
    // 계단(낭떠러지)
    const C = CLIFF, cx0 = X(C[0]), cy0 = Y(C[1]), cw = C[2] * cs, ch = C[3] * cs;
    for (let k = 0; k < 6; k++) { ctx.fillStyle = mixC('#94a3b8', '#334155', k / 6); ctx.fillRect(cx0 + k * cw / 6, cy0, cw / 6, ch); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(cx0 + k * cw / 6, cy0, 2, ch); }
    ctx.save(); ctx.beginPath(); ctx.rect(cx0 - 5, cy0 - 5, cw + 5, 7); ctx.clip(); ctx.fillStyle = '#facc15'; ctx.fillRect(cx0 - 5, cy0 - 5, cw + 5, 7); ctx.fillStyle = '#1b2333'; for (let k = 0; k < cw + 12; k += 14) { ctx.beginPath(); ctx.moveTo(cx0 - 5 + k, cy0 + 2); ctx.lineTo(cx0 + 4 + k, cy0 - 5); ctx.lineTo(cx0 + 10 + k, cy0 - 5); ctx.lineTo(cx0 + 1 + k, cy0 + 2); ctx.fill(); } ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(cx0 - 5, cy0 - 5, 7, ch + 5); ctx.clip(); ctx.fillStyle = '#facc15'; ctx.fillRect(cx0 - 5, cy0 - 5, 7, ch + 5); ctx.restore();
    D.text(cx0 + cw / 2, cy0 + ch / 2 + 5, '계단 (낭떠러지)', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    // 충전대
    ctx.fillStyle = '#cbd5e1'; rr(X(0.25), Y(13.1), cs * 1.6, cs * 1.7, 8).fill(); D.text(X(1.05), Y(14.55), '충전대', { size: 11, weight: 800, color: '#475569' });
    // 가구
    FURN.forEach((f) => {
      const r = f.r;
      D.shadow(() => { ctx.fillStyle = f.col; rr(X(r[0]) + 1, Y(r[1]) + 1, r[2] * cs - 2, r[3] * cs - 2, 10).fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(X(r[0]) + 5, Y(r[1]) + 5, r[2] * cs - 10, Math.max(8, r[3] * cs * 0.28), 7).fill();
      D.text(X(r[0] + r[2] / 2), Y(r[1] + r[3] / 2) + 5, f.name, { size: 13, weight: 800, color: '#1b2333' });
    });
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; rr(X(0), Y(0), GW * cs, GH * cs, 6).stroke();
    // 로봇
    const rx = X(R.x), ry = Y(R.y), rad = RAD * cs * 1.08, fs = R.st === 'fall' ? clamp(1 - R.ft / 1.6, 0, 1) : 1;
    // 감지 표시
    if (R.sen[2] && R.st !== 'fall') {
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(R.th);
      const hit = R.hit[2], al = RM ? 0.25 : 0.16 + 0.1 * Math.sin(t * 6);
      ctx.fillStyle = hit ? 'rgba(226,70,75,' + (al + 0.1) + ')' : 'rgba(14,165,233,' + al + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, cs * 1.6, -0.45, 0.45); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hit ? '#e2464b' : '#0ea5e9'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, cs * 1.6, -0.45, 0.45); ctx.stroke(); ctx.restore();
    }
    if (R.sen[1] && R.st !== 'fall') { const px = rx + Math.cos(R.th) * cs * 1.0, py = ry + Math.sin(R.th) * cs * 1.0; D.sphere(px, py, 4, R.hit[1] ? '#e2464b' : '#f59e0b', { gloss: false }); }
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(R.st === 'fall' ? R.ft * 5 : R.th); ctx.scale(fs, fs);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 4, rad, rad * 0.92, 0, 0, TAU); ctx.fill();
    D.sphere(0, 0, rad, '#f8fafc', { outline: '#94a3b8', outlineWidth: 2, gloss: false });
    const bump = R.flash[0];
    ctx.strokeStyle = bump > 0.05 ? '#e2464b' : R.sen[0] ? '#22c55e' : '#cbd5e1'; ctx.lineWidth = 4 + bump * 3; ctx.beginPath(); ctx.arc(0, 0, rad - 2, -0.9, 0.9); ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, 0, rad * 0.55, 0, TAU); ctx.fill();
    D.sphere(rad * 0.12, 0, rad * 0.28, '#475569', { gloss: false });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = R.wheel * 3 + k * TAU / 3; ctx.beginPath(); ctx.moveTo(-rad * 0.1, 0); ctx.lineTo(-rad * 0.1 + Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5); ctx.stroke(); }
    ctx.fillStyle = R.st === 'stuck' ? '#e2464b' : '#22c55e'; ctx.beginPath(); ctx.arc(-rad * 0.55, 0, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    if (R.st === 'fall') D.label(rx, ry - 28, '앗, 추락!', { bg: '#e2464b', size: 13 });
    if (R.st === 'stuck') D.label(rx, ry - 26, '벽에 부딪혀 멈췄어요', { bg: '#e2464b', size: 12.5 });
    if (bump > 0.2) D.ring(rx, ry, rad + 6 + (1 - bump) * 12, t, { color: '#e2464b', width: 2 });
    // 흐름 그림 (센서 → 판단 → 구동)
    const F = G.F; panel(F.x, F.y, F.w, F.h);
    const boxes = PHONE ? [0, 1, 2].map((i) => ({ x: F.x + 10 + i * 190, y: F.y + 34, w: 176, h: F.h - 44 })) : [0, 1, 2].map((i) => ({ x: F.x + 12, y: F.y + 38 + i * 100, w: F.w - 24, h: 82 }));
    D.text(F.x + 14, F.y + 24, '로봇은 이렇게 움직여요', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const heads = [['👀 센서', '감지', '#0ea5e9'], ['🧠 제어 장치', '판단', '#8b5cf6'], ['⚙️ 구동 장치', '행동', '#16a34a']];
    boxes.forEach((b, i) => {
      ctx.fillStyle = heads[i][2]; ctx.globalAlpha = 0.12; rr(b.x, b.y, b.w, b.h, 12).fill(); ctx.globalAlpha = 1;
      D.text(b.x + 10, b.y + 20, heads[i][0], { size: 13.5, weight: 800, color: heads[i][2], align: 'left' }); D.text(b.x + b.w - 10, b.y + 20, '→ ' + heads[i][1], { size: 12, weight: 800, color: heads[i][2], align: 'right' });
      if (i < 2) { if (PHONE) D.arrow(b.x + b.w + 1, b.y + b.h / 2, b.x + b.w + 12, b.y + b.h / 2, { color: '#94a3b8', width: 3, head: 7 }); else D.arrow(b.x + b.w / 2, b.y + b.h + 1, b.x + b.w / 2, b.y + b.h + 17, { color: '#94a3b8', width: 3, head: 7 }); }
    });
    // 센서 램프
    const b0 = boxes[0];
    SENS_INFO.forEach((s, i) => {
      const on = R.sen[i], lit = i === 0 ? R.flash[0] > 0.1 : R.hit[i], x = b0.x + 22 + i * (PHONE ? 54 : (b0.w - 44) / 2), y = b0.y + (PHONE ? 52 : 50), yy = PHONE ? y : y;
      D.sphere(x, yy, 11, !on ? '#cbd5e1' : lit ? '#e2464b' : '#22c55e', { outline: '#fff', outlineWidth: 2 });
      D.text(x, yy + 5, s.ico, { size: 12 });
      if (lit && on) D.ring(x, yy, 15, t, { color: '#e2464b', width: 2 });
    });
    D.text(b0.x + 10, b0.y + b0.h - 8, R.sen.some(Boolean) ? '켜진 센서가 주변을 살펴요' : '센서가 모두 꺼져 있어요', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    const b1 = boxes[1];
    paraText(b1.x + 10, b1.y + 40, R.st === 'fall' ? '앗, 계단에서 떨어졌어요' : R.note || '준비 중…', b1.w - 20, 12.5, { color: '#334155' });
    const b2 = boxes[2];
    [0, 1].forEach((k) => { const wx = b2.x + 30 + k * 48, wy = b2.y + (PHONE ? 46 : 52); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(wx, wy, 14, 0, TAU); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; for (let q = 0; q < 4; q++) { const a = (R.st === 'stuck' ? 0 : R.wheel * 2.2) + q * Math.PI / 2; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 12, wy + Math.sin(a) * 12); ctx.stroke(); } });
    D.text(PHONE ? b2.x + 10 : b2.x + 140, PHONE ? b2.y + b2.h - 10 : b2.y + 52, R.st === 'stuck' ? '바퀴만 헛돌아요' : R.st === 'fall' ? '멈췄어요' : '바퀴 · 브러시', { size: 12.5, weight: 800, color: R.st === 'stuck' ? '#e2464b' : '#334155', align: 'left' });
    // 아래 칸: 청소한 정도
    const cv = G.cov; panel(cv.x, cv.y, cv.w, cv.h);
    const pc = covPct(), bw = cv.w - 32;
    D.text(cv.x + 16, cv.y + 28, '🧹 청소한 곳', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    D.text(cv.x + cv.w - 16, cv.y + 36, pc + ' %', { size: PHONE ? 26 : 34, weight: 800, color: pc >= GOAL_COV ? '#14a058' : '#1b2333', align: 'right' });
    ctx.fillStyle = '#e8edf4'; rr(cv.x + 16, cv.y + (PHONE ? 52 : 62), bw, 20, 10).fill();
    const cw2 = bw * pc / 100; if (cw2 > 0.5) { ctx.fillStyle = pc >= GOAL_COV ? '#14a058' : '#0ea5e9'; rr(cv.x + 16, cv.y + (PHONE ? 52 : 62), cw2, 20, 10).fill(); }
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cv.x + 16 + bw * GOAL_COV / 100, cv.y + (PHONE ? 48 : 58)); ctx.lineTo(cv.x + 16 + bw * GOAL_COV / 100, cv.y + (PHONE ? 76 : 86)); ctx.stroke(); ctx.setLineDash([]);
    D.text(cv.x + 16 + bw * GOAL_COV / 100, cv.y + (PHONE ? 92 : 102), '목표 ' + GOAL_COV + ' %', { size: 12, weight: 800, color: '#1b2333' });
    if (!PHONE) { D.text(cv.x + 16, cv.y + 138, '닦은 칸 ' + R.n + ' / ' + CLEANABLE.length + '칸', { size: 13, weight: 700, color: '#475569', align: 'left' }); D.text(cv.x + 16, cv.y + 160, '충돌 ' + R.bumps + '번 · 추락 ' + R.falls + '번', { size: 13, weight: 700, color: '#475569', align: 'left' }); }
    const sn = G.sn; panel(sn.x, sn.y, sn.w, sn.h);
    D.text(sn.x + 14, sn.y + 24, '센서 3종 (눌러서 켜고 꺼요)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    SENS_INFO.forEach((s, i) => {
      const y = sn.y + 34 + i * (PHONE ? 28 : 45), on = R.sen[i];
      ctx.fillStyle = on ? rgba(s.col, 0.12) : '#f1f5f9'; rr(sn.x + 10, y, sn.w - 20, PHONE ? 24 : 40, 10).fill();
      ctx.strokeStyle = on ? s.col : '#e2e8f0'; ctx.lineWidth = 2; rr(sn.x + 10, y, sn.w - 20, PHONE ? 24 : 40, 10).stroke();
      D.text(sn.x + 22, y + (PHONE ? 18 : 26), s.ico + ' ' + s.name, { size: 13, weight: 800, color: on ? s.col : '#64748b', align: 'left' });
      if (!PHONE) D.text(sn.x + 150, y + 26, s.d, { size: 12, weight: 700, color: '#64748b', align: 'left' });
      D.text(sn.x + sn.w - 20, y + (PHONE ? 18 : 26), on ? '켜짐' : '꺼짐', { size: 13, weight: 800, color: on ? '#14a058' : '#94a3b8', align: 'right' });
    });
  }

  /* ======================================================
     화면 2: 학습하는 AI
     ====================================================== */
  function lnGeom() {
    const P = PHONE ? { x: 12, y: 12, w: 576, h: 466 } : { x: 14, y: 14, w: 500, h: 424 };
    return { P, px: P.x + 46, py: P.y + 46, pw: P.w - 46 - 16, ph: P.h - 46 - 46, Rp: PHONE ? { x: 12, y: 486, w: 576, h: 186 } : { x: 526, y: 14, w: 260, h: 424 }, cv: PHONE ? { x: 12, y: 680, w: 576, h: 150 } : { x: 14, y: 450, w: 772, h: 96 } };
  }
  function drawLearn(t) {
    const G = lnGeom(), P = G.P, { px, py, pw, ph } = G;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(P.x, P.y, P.w, P.h);
    D.text(P.x + 14, P.y + 24, '🗑️ 쓰레기 더미 (그림을 누르면 샘플이 돼요)', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    const X = (v) => px + v / 100 * pw, Y = (v) => py + ph - v / 100 * ph;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(px, py, pw, ph);
    // 학습한 구역
    const cwid = pw / GCELL, chei = ph / GCELL;
    for (let j = 0; j < GCELL; j++) for (let i = 0; i < GCELL; i++) { const k = j * GCELL + i, a = L.alpha[k]; if (a > 0.02 && L.grid[k] >= 0) { ctx.fillStyle = rgba(KINDS[L.grid[k]].col, 0.2 * a); ctx.fillRect(px + i * cwid, py + ph - (j + 1) * chei, cwid + 0.6, chei + 0.6); } }
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = 'rgba(100,116,139,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(v)); ctx.lineTo(px + pw, Y(v)); ctx.moveTo(X(v), py); ctx.lineTo(X(v), py + ph); ctx.stroke(); D.text(px - 6, Y(v) + 4, String(v), { size: 11.5, weight: 700, color: '#64748b', align: 'right' }); D.text(X(v), py + ph + 16, String(v), { size: 11.5, weight: 700, color: '#64748b' }); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    D.text(px + pw / 2, py + ph + 36, '크기 →', { size: 12.5, weight: 800, color: '#475569' }); D.text(px - 6, py - 8, '밝기 ↑', { size: 12.5, weight: 800, color: '#475569', align: 'right' });
    if (L.src.has('one')) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, Y(DARK_Y)); ctx.lineTo(px + pw, Y(DARK_Y)); ctx.stroke(); ctx.restore(); D.text(px + pw - 6, Y(DARK_Y) + 15, '밝기 ' + DARK_Y + ' 아래만 모았어요', { size: 11.5, weight: 800, color: '#b91c1c', align: 'right' }); }
    // 새 쓰레기(시험) 표시
    for (let k = 0; k < L.shown; k++) { const q = TEST[k], ok = L.tiles[k].ok; D.sphere(X(q.x), Y(q.y), 4.2, ok ? '#22c55e' : '#e2464b', { gloss: false, outline: '#fff', outlineWidth: 1.2 }); if (!ok) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 9, 0, TAU); ctx.stroke(); } }
    // 쓰레기 더미
    POOL.forEach((p) => {
      const sel = L.sel.has(p.i), x = X(p.x), y = Y(p.y);
      if (sel) { ctx.fillStyle = rgba(KINDS[p.k].col, 0.28); ctx.beginPath(); ctx.arc(x, y, 12.5, 0, TAU); ctx.fill(); ctx.strokeStyle = KINDS[p.k].col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 12.5, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = sel ? 1 : 0.55; D.text(x, y + 5, KINDS[p.k].ico, { size: 14 }); ctx.globalAlpha = 1;
    });
    // 오른쪽: 결과
    const Rp = G.Rp; panel(Rp.x, Rp.y, Rp.w, Rp.h);
    D.text(Rp.x + 14, Rp.y + 26, '🧠 인공지능의 정확도', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const sa = shownAcc(), fin = L.done;
    D.text(Rp.x + (PHONE ? 96 : Rp.w / 2), Rp.y + (PHONE ? 78 : 84), sa == null ? '–' : f1(fin ? L.acc : sa) + ' %', { size: PHONE ? 34 : 38, weight: 800, color: sa == null ? '#cbd5e1' : fin && !L.dirty ? (L.acc >= GOAL_ACC ? '#14a058' : '#1b2333') : '#94a3b8' });
    D.text(Rp.x + (PHONE ? 96 : Rp.w / 2), Rp.y + (PHONE ? 100 : 106), sa == null ? '학습하기를 눌러요' : !fin ? '새 쓰레기 ' + L.shown + ' / ' + TEST.length + '개 분류 중…' : L.dirty ? '샘플이 바뀌었어요. 다시 학습해요' : '새 쓰레기 ' + TEST.length + '개로 확인', { size: 12, weight: 700, color: '#64748b' });
    const tx0 = Rp.x + (PHONE ? 214 : 14), ty0 = Rp.y + (PHONE ? 44 : 124), tw = PHONE ? 30 : 26, gap = PHONE ? 8 : 4;
    for (let k = 0; k < TEST.length; k++) {
      const c = k % 8, r = Math.floor(k / 8), x = tx0 + c * (tw + gap), y = ty0 + r * (tw + gap - (PHONE ? 2 : 0));
      const st = k < L.shown ? L.tiles[k] : null;
      ctx.fillStyle = !st ? '#eef2f7' : st.ok ? '#bbf7d0' : '#fecaca'; rr(x, y, tw, tw - 2, 6).fill();
      if (st) D.text(x + tw / 2, y + tw / 2 + 4, st.ok ? '✓' : '✗', { size: 13, weight: 800, color: st.ok ? '#15803d' : '#b91c1c' });
    }
    const cnt = [0, 0, 0]; selList().forEach((p) => cnt[p.k]++);
    const cy0 = PHONE ? Rp.y + 130 : Rp.y + 290;
    D.text(Rp.x + 14, cy0, '모은 샘플 ' + L.sel.size + '개', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    KINDS.forEach((k, i) => { const y = cy0 + 14 + i * (PHONE ? 15 : 28); ctx.fillStyle = '#e8edf4'; rr(Rp.x + 60, y, PHONE ? 130 : Rp.w - 110, 10, 5).fill(); const w = (PHONE ? 130 : Rp.w - 110) * cnt[i] / 30; if (w > 0.5) { ctx.fillStyle = k.col; rr(Rp.x + 60, y, w, 10, 5).fill(); } D.text(Rp.x + 14, y + 10, k.ico, { size: 12.5, align: 'left' }); D.text(Rp.x + (PHONE ? 198 : Rp.w - 14), y + 10, String(cnt[i]), { size: 12.5, weight: 800, color: k.col, align: 'right' }); });
    // 컨베이어
    const cv = G.cv; panel(cv.x, cv.y, cv.w, cv.h);
    D.text(cv.x + 14, cv.y + 22, '🏭 새 쓰레기를 인공지능이 분류해요', { size: 13, weight: 800, color: '#334155', align: 'left' });
    const by = cv.y + (PHONE ? 70 : 62), bx0 = cv.x + 16, bx1 = cv.x + cv.w - 330;
    ctx.fillStyle = '#475569'; rr(bx0, by + 14, bx1 - bx0 + 40, 12, 6).fill();
    for (let k = 0; k < 14; k++) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx0 + 6 + ((k * 28 + (RM ? 0 : t * 40)) % (bx1 - bx0 + 30)), by + 17, 10, 4); }
    const binX = (k) => cv.x + cv.w - 300 + k * 100;
    KINDS.forEach((k, i) => { const x = binX(i); ctx.fillStyle = rgba(k.col, 0.18); rr(x, by - 14, 86, 56 + (PHONE ? 20 : 0), 10).fill(); ctx.strokeStyle = k.col; ctx.lineWidth = 2; rr(x, by - 14, 86, 56 + (PHONE ? 20 : 0), 10).stroke(); D.text(x + 43, by + 40 + (PHONE ? 18 : 0), k.ico + ' ' + k.name.replace('플라스틱 ', ''), { size: 12, weight: 800, color: k.col }); });
    L.items.forEach((q) => {
      const f = clamp(q.age / 0.9, 0, 1), e = SciSim.ease.inOutCubic(f), x = lerp(bx0, binX(q.pred) + 43, e), y = by + 4 + (f > 0.7 ? (f - 0.7) / 0.3 * 24 : 0) - (f < 0.7 ? Math.sin(f / 0.7 * Math.PI) * 4 : 0);
      if (f >= 1) { return; }
      D.text(x, y + 5, KINDS[q.k].ico, { size: 15 });
      if (f > 0.75 && !q.ok) D.text(x, y - 14, '✗', { size: 14, weight: 800, color: '#e2464b' });
    });
    const got = [0, 0, 0], wr = [0, 0, 0]; for (let k = 0; k < L.shown; k++) { const t2 = L.tiles[k], q = L.items[k]; if (!q || q.age >= 0.9) { got[t2.pred]++; if (!t2.ok) wr[t2.pred]++; } }
    KINDS.forEach((k, i) => D.text(binX(i) + 43, by + 8 + (PHONE ? 0 : 0), got[i] ? got[i] + '개' + (wr[i] ? ' (✗' + wr[i] + ')' : '') : '', { size: 12, weight: 800, color: '#334155' }));
  }

  /* ======================================================
     화면 3: 로봇 분석 표
     ====================================================== */
  function tbGeom() {
    if (!PHONE) return { P: { x: 14, y: 14, w: 772, h: 408 }, card: (ri) => ({ x: 24, y: 62 + ri * 88, w: 178, h: 82 }), cell: (ri, ci) => ({ x: 212 + ci * 191, y: 62 + ri * 88, w: 184, h: 82 }), head: (ci) => ({ x: 212 + ci * 191 + 92, y: 48 }), I: { x: 14, y: 434, w: 772, h: 112 } };
    return { P: { x: 12, y: 12, w: 576, h: 520 }, card: (ri) => ({ x: 20, y: 20 + ri * 128, w: 560, h: 46 }), cell: (ri, ci) => ({ x: 20 + ci * 187, y: 70 + ri * 128, w: 182, h: 70 }), head: (ci) => ({ x: 20 + ci * 187 + 91, y: 0 }), I: { x: 12, y: 540, w: 576, h: 280 } };
  }
  function drawTable(t) {
    const G = tbGeom(), P = G.P, T = S.tb;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(P.x, P.y, P.w, P.h);
    if (!PHONE) { D.text(P.x + 14, P.y + 26, '📋 로봇 비교표 (칸을 눌러 바꿔요)', { size: 14, weight: 800, color: '#334155', align: 'left' }); COLS.forEach((c, ci) => { const h = G.head(ci); D.text(h.x, h.y + 6, c.name, { size: 13.5, weight: 800, color: ['#0ea5e9', '#8b5cf6', '#16a34a'][ci] }); }); }
    ROBOTS.forEach((rb, ri) => {
      const cd = G.card(ri), done = T.flip[ri] > 0.5;
      ctx.fillStyle = done ? '#ecfdf3' : '#f8fafc'; rr(cd.x, cd.y, cd.w, cd.h, 12).fill(); ctx.strokeStyle = done ? '#14a058' : '#e2e8f0'; ctx.lineWidth = 2; rr(cd.x, cd.y, cd.w, cd.h, 12).stroke();
      D.text(cd.x + 14, cd.y + (PHONE ? 30 : 36), rb.ico, { size: PHONE ? 26 : 32, align: 'left' });
      D.text(cd.x + (PHONE ? 52 : 56), cd.y + (PHONE ? 20 : 26), rb.name, { size: 14, weight: 800, color: '#1b2333', align: 'left' });
      if (PHONE) D.text(cd.x + 52, cd.y + 38, fitText(rb.d, cd.w - 60, 11.5, 700), { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
      else paraText(cd.x + 12, cd.y + 54, rb.d, cd.w - 20, 11.5, { color: '#64748b', lh: 1.25 });
      COLS.forEach((c, ci) => {
        const cl = G.cell(ri, ci), v = T.v[ri][ci], bad = T.bad[ri][ci], pop = T.pop[ri][ci];
        const sc = 1 + 0.04 * Math.sin(pop * Math.PI);
        ctx.save(); ctx.translate(cl.x + cl.w / 2, cl.y + cl.h / 2); ctx.scale(sc, sc); ctx.translate(-cl.w / 2, -cl.h / 2);
        const hue = ['#0ea5e9', '#8b5cf6', '#16a34a'][ci];
        ctx.fillStyle = 'rgba(30,45,80,.1)'; rr(0, 3, cl.w, cl.h, 12).fill();
        ctx.fillStyle = done ? '#f0fdf4' : '#fff'; rr(0, 0, cl.w, cl.h, 12).fill();
        ctx.strokeStyle = bad ? '#e2464b' : done ? '#14a058' : rgba(hue, 0.5); ctx.lineWidth = bad ? 3 : 2; rr(0, 0, cl.w, cl.h, 12).stroke();
        if (PHONE) D.text(8, 14, c.name, { size: 10.5, weight: 800, color: hue, align: 'left' });
        paraText(10, PHONE ? 31 : 24, c.opts[v], cl.w - 36, PHONE ? 11.5 : 12.5, { color: '#1b2333', lh: 1.25 });
        D.text(cl.w - 12, cl.h - 10, '▾', { size: 16, weight: 800, color: '#94a3b8', align: 'right' });
        ctx.restore();
      });
    });
    const I = G.I; panel(I.x, I.y, I.w, I.h);
    D.text(I.x + 14, I.y + 24, '🔓 확인한 로봇의 장점과 한계', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ROBOTS.forEach((rb, ri) => {
      const y = I.y + (PHONE ? 52 : 42) + ri * (PHONE ? 56 : 20), open = T.flip[ri] > 0.5;
      if (!open) { D.text(I.x + 16, y + (PHONE ? 0 : 5), '🔒 ' + rb.name + ' — 한 줄을 모두 맞히고 ✔ 확인하기를 누르면 열려요', { size: 12, weight: 700, color: '#cbd5e1', align: 'left' }); return; }
      const a = T.flip[ri];
      ctx.globalAlpha = a;
      if (PHONE) { D.text(I.x + 16, y, rb.ico + ' ' + rb.name, { size: 12.5, weight: 800, color: '#1b2333', align: 'left' }); D.text(I.x + 16, y + 17, '👍 ' + fitText(rb.pro, I.w - 40, 11.5, 700), { size: 11.5, weight: 700, color: '#15803d', align: 'left' }); D.text(I.x + 16, y + 33, '⚠️ ' + fitText(rb.con, I.w - 40, 11.5, 700), { size: 11.5, weight: 700, color: '#b91c1c', align: 'left' }); }
      else { D.text(I.x + 16, y + 5, rb.ico + ' ' + rb.name, { size: 12.5, weight: 800, color: '#1b2333', align: 'left' }); D.text(I.x + 150, y + 5, '👍 ' + rb.pro, { size: 12, weight: 700, color: '#15803d', align: 'left' }); D.text(I.x + 440, y + 5, '⚠️ ' + fitText(rb.con, 320, 12, 700), { size: 12, weight: 700, color: '#b91c1c', align: 'left' }); }
      ctx.globalAlpha = 1;
    });
  }
  function stepTable(dt) { const T = S.tb; ROBOTS.forEach((r, ri) => { T.flip[ri] = approach(T.flip[ri], T.rev && T.rev[ri] ? 1 : 0, dt, 5); [0, 1, 2].forEach((ci) => { if (T.pop[ri][ci] > 0) T.pop[ri][ci] = Math.max(0, T.pop[ri][ci] - dt * 4); }); }); }

  /* ======================================================
     화면 4: 서빙 로봇 개선 설계
     ====================================================== */
  const ORD = (() => { const a = Array.from({ length: 100 }, (_, i) => i), r = rng(3); for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  function dsGeom() {
    return PHONE ? { sc: { x: 12, y: 12, w: 576, h: 230 }, mt: { x: 12, y: 250, w: 576, h: 262 }, dt: { x: 12, y: 520, w: 576, h: 300 } }
      : { sc: { x: 14, y: 14, w: 500, h: 250 }, dt: { x: 14, y: 276, w: 500, h: 270 }, mt: { x: 526, y: 14, w: 260, h: 532 } };
  }
  function stepDesign(dt) {
    const m = dsM(), sp = D2.sp;
    sp.s.target = m.s; sp.c.target = m.c; sp.f.target = m.f; sp.p.target = m.p;
    ['s', 'c', 'f', 'p'].forEach((k) => sp[k].update(dt));
    if (S.mode !== 'design') return;
    const dur = D2.sel.speed ? 4.6 : 3.0;
    D2.tt += dt;
    if (D2.tt >= dur + 0.9) { D2.tt = 0; D2.trial = (D2.trial + 1) % 100; }
  }
  const trialOK = (i) => ORD[i] < dsM().s;
  function drawDesign(t) {
    const G = dsGeom(), m = dsM(), sp = D2.sp;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // 장면: 좁은 통로
    const sc = G.sc; panel(sc.x, sc.y, sc.w, sc.h);
    D.text(sc.x + 14, sc.y + 24, '🍽️ 좁은 통로에서 사람을 만났어요', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const cy = sc.y + sc.h / 2 + 14, cx0 = sc.x + 30, cx1 = sc.x + sc.w - 30, hh = 56;
    ctx.fillStyle = '#e8edf4'; ctx.fillRect(cx0 - 10, cy - hh, cx1 - cx0 + 20, hh * 2); ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx0 - 10, cy - hh - 8, cx1 - cx0 + 20, 8); ctx.fillRect(cx0 - 10, cy + hh, cx1 - cx0 + 20, 8);
    ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx0, cy); ctx.lineTo(cx1, cy); ctx.stroke(); ctx.restore();
    const dur = D2.sel.speed ? 4.6 : 3.0, f = clamp(D2.tt / dur, 0, 1), ok = trialOK(D2.trial);
    const meet = 0.5, near = f > meet - 0.12 && f < meet + 0.12;
    let rbx = lerp(cx0, cx1, f), pex = lerp(cx1, cx0, f), rby = cy + 12, pey = cy - 12;
    if (ok) { const k = Math.sin(clamp((f - (meet - 0.2)) / 0.4, 0, 1) * Math.PI); rby = cy + 12 + k * 18; pey = cy - 12 - k * 14; }
    else if (f > meet - 0.06) { rbx = lerp(cx0, cx1, meet - 0.06); pex = lerp(cx1, cx0, meet - 0.06); }
    if (D2.sel.sensor) { ctx.fillStyle = 'rgba(14,165,233,.16)'; ctx.beginPath(); ctx.moveTo(rbx + 14, rby); ctx.arc(rbx + 14, rby, 70, -0.5, 0.5); ctx.closePath(); ctx.fill(); }
    // 사람
    D.sphere(pex, pey, 11, '#f59e0b', { outline: '#fff', outlineWidth: 2 }); D.text(pex, pey + 5, '🚶', { size: 13 });
    // 로봇
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(rbx - 20, rby - 13, 40, 26, 9).fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(rbx - 20, rby - 13, 40, 26, 9).stroke();
    ctx.fillStyle = '#e2e8f0'; rr(rbx - 8, rby - 8, 16, 16, 5).fill(); D.text(rbx, rby + 5, '🍲', { size: 12 });
    if (D2.sel.human) D.text(rbx, rby - 20, '📞', { size: 13 });
    if (!ok && f >= meet - 0.06) { D.label(sc.x + sc.w / 2, cy - hh + 20, '쿵! 부딪혔어요', { bg: '#e2464b', size: 13 }); if (!RM && f < meet - 0.04) parts.burst((rbx + pex) / 2, (rby + pey) / 2, { count: 8, speed: 110, size: 3, life: 0.5, gravity: 0, colors: ['#fecaca', '#e2464b'] }); }
    else if (ok && f > meet + 0.1) D.label(sc.x + sc.w / 2, cy - hh + 20, '안전하게 지나갔어요', { bg: '#14a058', size: 13 });
    D.text(sc.x + sc.w - 14, sc.y + 24, '배달 ' + (D2.trial + 1) + '번째', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    // 100번 점
    const dt0 = G.dt; panel(dt0.x, dt0.y, dt0.w, dt0.h);
    D.text(dt0.x + 14, dt0.y + 24, '📦 배달 100번 중 성공한 횟수', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const dx0 = dt0.x + (PHONE ? 30 : 40), dy0 = dt0.y + 44, ds = Math.min((dt0.w - (PHONE ? 200 : 80)) / 10, (dt0.h - 100) / 10);
    for (let i = 0; i < 100; i++) { const c = i % 10, r = Math.floor(i / 10), x = dx0 + c * ds + ds / 2, y = dy0 + r * ds + ds / 2, good = trialOK(i); D.sphere(x, y, ds * 0.36, good ? '#22c55e' : '#fca5a5', { gloss: false, outline: i === D2.trial ? '#1b2333' : undefined, outlineWidth: 2.5 }); }
    D.text(dx0 + 5 * ds, dy0 + 10 * ds + 22, '성공 ' + m.s + '번 · 실패 ' + (100 - m.s) + '번 → 성공률 ' + m.s + ' %', { size: 14, weight: 800, color: '#1b2333' });
    const lx = dx0 + 10 * ds + (PHONE ? 24 : 34);
    D.sphere(lx + 8, dy0 + 12, 7, '#22c55e', { gloss: false }); D.text(lx + 22, dy0 + 17, '성공한 배달', { size: 12.5, weight: 800, color: '#15803d', align: 'left' });
    D.sphere(lx + 8, dy0 + 38, 7, '#fca5a5', { gloss: false }); D.text(lx + 22, dy0 + 43, '사람과 부딪힌 배달', { size: 12.5, weight: 800, color: '#b91c1c', align: 'left' });
    paraText(lx, dy0 + 76, '점 하나가 배달 1번이에요. 위 장면은 점이 가리키는 배달을 하나씩 보여 줘요.', dt0.w - (lx - dt0.x) - 16, 12.5, { color: '#64748b' });
    // 지표 막대
    const mt = G.mt; panel(mt.x, mt.y, mt.w, mt.h);
    D.text(mt.x + 14, mt.y + 26, '📊 개선안의 효과와 부작용', { size: 14, weight: 800, color: '#334155', align: 'left' });
    const rows = [['성공률', 's', '#14a058', '높을수록 좋아요', GOAL_S], ['비용', 'c', '#f59e0b', '낮을수록 좋아요', null], ['안전', 'f', '#0ea5e9', '높을수록 좋아요', null], ['개인정보 위험', 'p', '#e2464b', '낮을수록 좋아요', GOAL_P]];
    const rh = PHONE ? 50 : 112;
    rows.forEach((q, i) => {
      const y = mt.y + 44 + i * rh, bw = mt.w - 28, val = clamp(sp[q[1]].value, 0, 100);
      D.text(mt.x + 14, y + 14, q[0], { size: 14, weight: 800, color: q[2], align: 'left' }); D.text(mt.x + mt.w - 14, y + 16, String(m[q[1]]), { size: 20, weight: 800, color: q[2], align: 'right' });
      ctx.fillStyle = '#e8edf4'; rr(mt.x + 14, y + 26, bw, 18, 9).fill();
      const w = bw * val / 100; if (w > 0.5) { ctx.fillStyle = q[2]; rr(mt.x + 14, y + 26, w, 18, 9).fill(); }
      if (q[4] != null) { const gx = mt.x + 14 + bw * q[4] / 100; ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx, y + 22); ctx.lineTo(gx, y + 48); ctx.stroke(); ctx.setLineDash([]); D.text(gx, y + 60, '목표 ' + q[4], { size: 11.5, weight: 800, color: '#1b2333' }); }
      if (!PHONE) D.text(mt.x + 14, y + 86, q[3], { size: 11.5, weight: 700, color: '#94a3b8', align: 'left' });
      if (q[1] === 'p' && m.p > GOAL_P) { const al = RM ? 1 : 0.55 + 0.45 * Math.sin(t * 9); ctx.globalAlpha = al; D.text(mt.x + mt.w - 14, y + 64, '⚠️', { size: 18, align: 'right' }); ctx.globalAlpha = 1; }
    });
    const okk = goalMet(m);
    D.label(mt.x + mt.w / 2, mt.y + mt.h - 24, okk ? '✅ 성공률 ' + GOAL_S + ' 이상 · 위험 ' + GOAL_P + ' 이하' : '목표: 성공률 ' + GOAL_S + ' 이상 · 위험 ' + GOAL_P + ' 이하', { bg: okk ? '#14a058' : '#64748b', size: 12.5 });
  }

  /* ======================================================
     입력
     ====================================================== */
  function nearestPool(p) {
    const G = lnGeom(), X = (v) => G.px + v / 100 * G.pw, Y = (v) => G.py + G.ph - v / 100 * G.ph;
    let best = null, bd = PHONE ? 24 : 16; POOL.forEach((q) => { const d = Math.hypot(X(q.x) - p.x, Y(q.y) - p.y); if (d < bd) { bd = d; best = q; } }); return best;
  }
  function tbHit(p) { const G = tbGeom(); for (let ri = 0; ri < 4; ri++) for (let ci = 0; ci < 3; ci++) { const c = G.cell(ri, ci); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return [ri, ci]; } return null; }
  function senHit(p) { const G = robGeom().sn; for (let i = 0; i < 3; i++) { const y = G.y + 34 + i * (PHONE ? 28 : 45); if (p.x >= G.x + 10 && p.x <= G.x + G.w - 10 && p.y >= y && p.y <= y + (PHONE ? 24 : 40)) return i; } return -1; }
  function toggleSen(i) { R.sen[i] = !R.sen[i]; R.path = []; if (R.st === 'stuck' || R.st === 'turn' || R.st === 'back') R.st = 'go'; Sound.tick(); syncSen(); }
  function syncSen() { $$('#senTgl .tgl').forEach((b) => b.setAttribute('aria-pressed', R.sen[+b.dataset.i] ? 'true' : 'false')); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'robot') { const i = senHit(p); if (i >= 0) toggleSen(i); return false; }
      if (S.mode === 'learn') { const q = nearestPool(p); if (q) { togglePick(q.i); Sound.tick(); } return false; }
      if (S.mode === 'table') { const h = tbHit(p); if (h) { const [ri, ci] = h; S.tb.v[ri][ci] = (S.tb.v[ri][ci] + 1) % 4; S.tb.bad[ri][ci] = false; S.tb.pop[ri][ci] = 1; Sound.tick(); } return false; }
      return false;
    },
    hover(p) { if (S.mode === 'robot') return senHit(p) >= 0 ? 'pointer' : 'default'; if (S.mode === 'learn') return nearestPool(p) ? 'pointer' : 'default'; if (S.mode === 'table') return tbHit(p) ? 'pointer' : 'default'; return 'default'; },
  });

  /* ======================================================
     컨트롤
     ====================================================== */
  const MODE_LABEL = { robot: '🧹 청소 로봇 · 센서 → 판단 → 구동', learn: '🧠 쓰레기 분류를 학습하는 인공지능', table: '📋 일상 로봇 4종 분석', design: '🛠️ 서빙 로봇 개선 설계' };
  const modeSeg = $('#modeSeg');
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; hideHint(); updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    const sc = $('#sideCtl'); if (sc && S.mode === 'design') sc.hidden = !(game && (game.free || sideOpen));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
  }
  let sideOpen = false;
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#senTgl .tgl').forEach((b) => b.addEventListener('click', () => toggleSen(+b.dataset.i)));
  segBind('#spdSeg', (v) => { R.speed = +v; segSet('#spdSeg', v); $('#oSpd').textContent = +v === 1 ? '보통' : '4배'; });
  $('#bRbReset').addEventListener('click', () => { Sound.click(); robotReset(); });
  $('#bEven').addEventListener('click', () => { Sound.click(); addEven(5); });
  $('#bOne').addEventListener('click', () => { Sound.click(); addOne(5); });
  $('#bClear').addEventListener('click', () => { Sound.click(); clearSel(); });
  $('#bLearn').addEventListener('click', () => learn());
  $('#bTbReset').addEventListener('click', () => { Sound.click(); tbReset(); });
  $$('#impTgl .tgl').forEach((b) => b.addEventListener('click', () => { Sound.click(); const k = b.dataset.k; D2.sel[k] = !D2.sel[k]; b.setAttribute('aria-pressed', D2.sel[k] ? 'true' : 'false'); }));
  segBind('#sideSeg', (v) => { D2.side = v; $$('#sideSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === v)); });
  function syncDesignCtl() { $$('#impTgl .tgl').forEach((b) => b.setAttribute('aria-pressed', D2.sel[b.dataset.k] ? 'true' : 'false')); $$('#sideSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === D2.side)); }

  /* ======================================================
     읽음 칸
     ====================================================== */
  function readouts() {
    const m = S.mode;
    $('#oCnt').textContent = L.sel.size + '개';
    if (m === 'robot') setRead(['청소한 곳', covPct() + ' %'], ['켜진 센서', R.sen.filter(Boolean).length + ' / 3'], ['충돌 · 추락', R.bumps + ' · ' + R.falls]);
    else if (m === 'learn') { const a = accFinal(); setRead(['모은 샘플', L.sel.size + ' 개'], ['정확도', L.acc == null ? '–' : (L.done ? f1(L.acc) : f1(shownAcc())) + ' %'], ['상태', a == null ? (L.phase === 'test' ? '분류 중' : '학습 전') : '학습 완료']); }
    else if (m === 'table') setRead(['확인한 줄', S.tb.rev.filter(Boolean).length + ' / 4'], ['로봇 종류', '4종'], ['비교 항목', '센서·판단·구동']);
    else { const mm = dsM(); setRead(['성공률', mm.s + ' %'], ['비용 · 안전', mm.c + ' · ' + mm.f], ['개인정보 위험', String(mm.p)]); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { robotReset(); R.sen = [false, false, false]; R.speed = 1; segSet('#spdSeg', 1); $('#oSpd').textContent = '보통'; syncSen(); setMode('robot'); }
    else if (li === 1) { clearSel(); L.phase = 'idle'; L.done = false; L.acc = null; L.tiles = []; L.shown = 0; L.items = []; L.grid.fill(-1); L.cmp = { even: null, one: null }; setMode('learn'); }
    else if (li === 2) { tbReset(); setMode('table'); }
    else { D2.sel = { sensor: false, data: false, speed: false, human: false }; D2.side = null; D2.trial = 0; D2.tt = 0; sideOpen = false; syncDesignCtl(); setMode('design'); }
  }
  const ensure = (m) => { if (S.mode !== m) setMode(m); };
  const comboText = COMBOS.map((c) => c.map((k) => IMP[k].ico + ' ' + IMP[k].name).join(' + ')).join(' 또는 ');

  const levels = [
    {
      title: '로봇 구조: 센서 → 판단 → 구동', short: '로봇 구조', icon: '🧹', phase: '모형',
      features: ['robot'],
      intro: '<p class="si-q">❓ 탐구 질문: 로봇은 어떻게 주변을 알아차리고 스스로 판단할까? 더 똑똑하게 만들려면 무엇이 필요할까?</p>' +
        '<div class="si-link">🔗 중학교에서 <b>과학 관련 직업과 미래</b>를 배우며 로봇이 사람의 일을 돕는 모습을 보았고, 통합과학1 <b>신호와 정보</b>에서 센서가 변화를 신호로 바꾼다는 것을 배웠어요. 앞 차시 <b>사물인터넷과 센서</b>에서는 센서 → 통신 → 서버 → 작동기의 흐름을 만들었어요. 이번에는 스스로 판단해 움직이는 <b>로봇</b>을 살펴봐요.</div>' +
        '<p>로봇은 <b>센서(감지) → 제어 장치(판단) → 구동 장치(행동)</b>으로 움직여요. 방을 청소하는 로봇에서 센서를 켜고 끄며, 센서가 없으면 어떤 일이 생기는지 확인해 봐요.</p>',
      setup() { enterLevel(0); showHint('센서가 모두 꺼진 로봇이 어떻게 되는지 먼저 지켜봐요', 6000); },
      recap: '로봇은 센서가 감지하고, 제어 장치가 판단하고, 구동 장치가 행동해요. 센서가 없으면 부딪히거나 떨어져요.',
      summary: '<ul><li>로봇의 기본 구조: <b>센서</b>(감지) → <b>제어 장치</b>(판단) → <b>구동 장치</b>(행동: 모터·바퀴·브러시)</li><li><b>충돌 센서</b>는 부딪힘을, <b>낭떠러지 센서</b>는 바닥이 없는 곳을, <b>거리 센서</b>는 벽·가구까지의 거리를 알려 줘서 지도를 만들 수 있어요.</li><li>센서가 없으면 벽에 부딪혀 멈추거나(충돌) 계단에서 떨어져요(추락). 센서를 모두 켜면 방의 ' + GOAL_COV + ' % 이상을 청소할 수 있어요.</li></ul>',
      missions: [
        {
          title: '센서를 모두 켜고 방 청소하기',
          goal: '센서 <b>3종을 모두 켜서</b> 방의 <b>' + GOAL_COV + ' % 이상</b>을 청소하세요. (⏩ 4배 빠르게를 써도 돼요)',
          hint: '💥 충돌, 🕳️ 낭떠러지, 📡 거리 센서를 모두 켜요. 거리 센서가 켜져 있어야 지도를 만들어 안 닦은 곳을 찾아가요. 계단에서 떨어졌다면 다시 시작하니 걱정하지 마요.',
          setup() { ensure('robot'); },
          check: () => R.sen.every(Boolean) && covPct() >= GOAL_COV, hold: 0.5,
          status: () => '켜진 센서 <b>' + R.sen.filter(Boolean).length + ' / 3</b> ' + mark(R.sen.every(Boolean)) + ' · 청소한 곳 <b>' + covPct() + ' %</b> / ' + GOAL_COV + ' % ' + mark(covPct() >= GOAL_COV),
          explain: '센서를 모두 켜면 <b>거리 센서</b>로 방의 지도를 만들어 안 닦은 곳을 찾아가고, <b>충돌 센서</b>는 부딪힘을, <b>낭떠러지 센서</b>는 계단을 알려 줘서 안전하게 청소해요. 센서가 없으면 벽에 부딪혀 멈추거나 계단에서 떨어져요.',
        },
        {
          type: 'quiz', title: '센서 · 제어 · 구동의 역할',
          goal: '청소 로봇이 계단 앞에서 방향을 바꾸는 과정을 순서대로 바르게 나타낸 것은?',
          setup() { ensure('robot'); },
          choices: ['구동 장치가 계단을 알아챔 → 센서가 판단함 → 제어 장치가 바퀴를 돌림', '제어 장치가 계단을 감지함 → 센서가 판단함 → 구동 장치가 감지함', '낭떠러지 센서가 계단을 감지 → 제어 장치가 방향을 바꾸라고 판단 → 구동 장치(바퀴)가 방향을 바꿈', '바퀴가 계단을 감지함 → 센서가 방향을 판단함 → 제어 장치가 돎'],
          answer: 2,
          feedback: ['감지는 센서가, 행동은 구동 장치가 해요.', '감지는 센서의 일이고 판단은 제어 장치의 일이에요.', '', '바퀴는 구동 장치라서 움직이는 일을 해요. 감지는 센서가 해요.'],
          explain: '<b>센서</b>가 알아채고(감지), <b>제어 장치</b>가 어떻게 할지 정하고(판단), <b>구동 장치</b>가 움직여요(행동). 이 세 가지가 이어져야 로봇이 스스로 움직일 수 있어요.',
        },
      ],
    },
    {
      title: '학습하는 AI: 데이터로 분류 규칙을 배워요', short: '학습하는 AI', icon: '🧠', phase: '탐구',
      features: ['learn'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 로봇이 센서로 주변을 알아차리고 제어 장치가 판단해 움직이는 것을 보았어요. 그 <b>판단</b>을 더 똑똑하게 만드는 방법이 <b>인공지능(기계 학습)</b>이에요.</div>' +
        '<p><b>인공지능</b>은 사람이 알려 준 많은 예시 <b>데이터</b>에서 규칙을 스스로 찾아 새로운 자료를 판단해요. 쓰레기 분류 로봇을 훈련해 봐요. 그래프의 가로는 <b>크기</b>, 세로는 <b>밝기</b>예요. 샘플을 모아 🎓 학습하기를 누르면 인공지능이 구역을 나누고, 새 쓰레기 ' + TEST.length + '개로 정확도를 재요.</p>',
      setup() { enterLevel(1); showHint('샘플을 모으고 🎓 학습하기를 눌러요', 6000); },
      recap: '인공지능은 데이터에서 규칙을 배워요. 데이터가 많고 다양할수록 정확해지고, 한쪽으로 치우친 데이터는 치우친 판단을 낳아요.',
      summary: '<ul><li><b>인공지능(기계 학습)</b>: 많은 예시 데이터에서 규칙을 스스로 찾아 새 자료를 판단하는 방법. 사람이 준 데이터에서 배워요.</li><li>샘플이 적거나 <b>한 구역에만 몰려</b> 있으면 배우지 못한 곳에서 자주 틀려요. 교실 예시 자료에서 골고루 모은 샘플 3개로는 ' + f1(BENCH.e3) + ' %, 12개는 ' + f1(BENCH.e12) + ' %, 30개는 ' + f1(BENCH.e30) + ' %였고, 어두운 쪽에서만 모은 30개는 ' + f1(BENCH.o30) + ' %였어요.</li><li>데이터가 많고 <b>다양할수록</b> 정확해져요. 편향된 데이터는 편향된 판단을 낳아요.</li></ul>',
      missions: [
        {
          title: '한쪽에만 모으면 어떻게 될까?',
          goal: '샘플을 <b>한 구역(어두운 쪽)에서만 30개 이상</b> 모아 학습하고, 다시 비운 뒤 <b>골고루 30개 이상</b> 모아서도 학습해 정확도를 비교하세요.',
          hint: '① 🧹 샘플 모두 비우기 → 📍 한 구역에서만 +5개를 6번 → 🎓 학습하기 ② 다시 비우기 → 🎯 골고루 +5개를 6번 → 🎓 학습하기',
          setup() { ensure('learn'); },
          check: () => L.cmp.even != null && L.cmp.one != null && L.cmp.even - L.cmp.one >= 20, hold: 0.4,
          status: () => '한 구역에서만(30개 이상) ' + (L.cmp.one == null ? '⬜' : '<b>' + f1(L.cmp.one) + ' %</b> ✅') + ' · 골고루(30개 이상) ' + (L.cmp.even == null ? '⬜' : '<b>' + f1(L.cmp.even) + ' %</b> ✅'),
          explain: '한 구역(어두운 쪽)에서만 모은 샘플 30개로 학습하면 <b>' + f1(BENCH.o30) + ' %</b>, 골고루 모은 30개로 학습하면 <b>' + f1(BENCH.e30) + ' %</b>예요. 샘플의 <b>수</b>가 같아도 <b>다양하게</b> 모았느냐에 따라 정확도가 크게 달라져요.',
        },
        {
          title: '정확도 90 % 만들기',
          goal: '샘플을 모아 학습해서 새 쓰레기 ' + TEST.length + '개의 정확도를 <b>' + GOAL_ACC + ' % 이상</b>으로 만드세요.',
          hint: '🎯 골고루 +5개를 세 번 눌러 샘플 15개를 모은 뒤 🎓 학습하기를 눌러요. (교실 예시에서는 샘플 15개의 정확도가 ' + f1(BENCH.e15) + ' %예요.)',
          setup() { ensure('learn'); L.dirty = true; },
          check: () => accFinal() != null && accFinal() >= GOAL_ACC, hold: 0.4,
          status: () => '샘플 <b>' + L.sel.size + '개</b> · 마지막 정확도 ' + (accFinal() == null ? '⬜ (학습하기를 눌러요)' : '<b>' + f1(accFinal()) + ' %</b> ' + mark(accFinal() >= GOAL_ACC)),
          explain: '여러 종류의 쓰레기를 <b>골고루</b> 모으면 인공지능이 구역을 알맞게 나눠서 정확도가 높아져요. 교실 예시에서는 골고루 3개는 ' + f1(BENCH.e3) + ' %, 12개는 ' + f1(BENCH.e12) + ' %, 30개는 ' + f1(BENCH.e30) + ' %였어요.',
        },
        {
          type: 'quiz', title: '인공지능이 틀리는 까닭',
          goal: '샘플이 적거나 한쪽에만 모여 있을 때 인공지능이 자주 틀리는 까닭은?',
          setup() { ensure('learn'); },
          choices: ['컴퓨터가 계산을 잘못하기 때문이다', '학습하지 않은 종류·위치의 쓰레기는 판단할 기준이 없어서 엉뚱한 쪽으로 분류하기 때문이다', '인공지능은 데이터 없이도 스스로 규칙을 알기 때문이다', '샘플이 적을수록 인공지능이 더 똑똑해지기 때문이다'],
          answer: 1,
          feedback: ['계산이 틀린 것이 아니라 배운 데이터가 부족한 거예요.', '', '인공지능은 사람이 준 데이터에서 규칙을 배워요. 데이터가 없으면 알 수 없어요.', '샘플이 많고 다양할수록 더 정확해져요.'],
          explain: '인공지능은 <b>사람이 준 데이터</b>에서 배워요. 데이터가 적거나 한쪽으로 치우치면 배우지 못한 경우에 틀린 판단을 해요. 그래서 데이터를 <b>많이, 다양하게</b> 모으는 것이 중요해요.',
        },
      ],
    },
    {
      title: '로봇 분석: 일상 속 로봇의 특징', short: '로봇 분석', icon: '📋', phase: '분석',
      features: ['table'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 인공지능이 데이터로 판단 규칙을 배운다는 것을 알았어요. 우리 주변의 로봇은 어떤 센서로 감지하고, 어떻게 판단하며, 무엇으로 움직일까요?</div>' +
        '<p>일상에서 쓰이는 로봇 4종의 설명을 읽고 <b>센서 · 판단 · 구동</b> 표를 채워 봐요. <b>규칙</b>대로 판단하는 로봇도 있고 <b>인공지능</b>으로 판단하는 로봇도 있어요. (이 화면의 로봇은 설명을 위한 가상의 예시예요.)</p>',
      setup() { enterLevel(2); showHint('칸을 눌러 알맞은 내용으로 바꿔요', 6000); },
      recap: '로봇마다 쓰는 센서와 판단 방법(규칙 또는 인공지능), 구동 장치가 다르고 장점과 한계도 달라요.',
      summary: '<ul><li><b>청소 로봇</b>: 충돌·낭떠러지·거리 센서 → 규칙(지도·경로 계획)으로 판단 → 바퀴·브러시</li><li><b>서빙 로봇</b>: 거리 센서·카메라 → 규칙(멈춤·우회)으로 판단 → 바퀴·쟁반. 한계: 좁은 통로에서 사람과 부딪힐 수 있어요.</li><li><b>돌봄·대화 로봇</b>: 마이크·카메라 → 인공지능(음성·감정 인식) → 스피커·화면·팔. 한계: 대화와 표정 같은 개인정보가 모여요.</li><li><b>농업용 드론</b>: 카메라·GPS → 인공지능(영상으로 병해충 판별) → 프로펠러·분무기. 한계: 날씨가 나쁘면 못 날고 판별이 틀릴 수 있어요.</li></ul>',
      missions: [
        {
          title: '로봇 비교표 채우기',
          goal: '표의 <b>12칸</b>을 알맞게 바꾸고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '설명에 나온 낱말이 단서예요. (청소: 가구 배치 지도, 서빙: 장애물, 돌봄: 말소리·표정, 드론: 밭 위에서 찍은 영상)',
          manual: true,
          setup() { ensure('table'); },
          status: () => '확인한 줄 <b>' + S.tb.rev.filter(Boolean).length + ' / 4</b>',
          check() {
            const T = S.tb; let wrong = 0;
            T.v.forEach((row, ri) => row.forEach((v, ci) => { if (v !== ri) { wrong++; if (!T.bad[ri][ci]) { T.bad[ri][ci] = true; } } }));
            T.v.forEach((row, ri) => { if (rowOK(ri)) T.rev[ri] = true; });
            return wrong ? '<b>' + wrong + '칸</b>이 달라요. (빨간 테두리) 로봇 설명에서 단서를 찾아 다시 골라 보세요.' : true;
          },
          explain: '로봇은 모두 <b>센서(감지) → 판단 → 구동(행동)</b> 구조지만 쓰는 부품이 달라요. 청소·서빙 로봇은 정해 둔 <b>규칙</b>으로 판단하고, 돌봄·드론은 데이터로 배운 <b>인공지능</b>으로 판단해요. 아래에서 각 로봇의 장점과 한계도 확인해 봐요.',
        },
        {
          type: 'quiz', title: '로봇별 센서 찾기',
          goal: '농업용 드론이 밭에서 병해충을 찾는 데 가장 필요한 센서는?',
          setup() { ensure('table'); },
          choices: ['낭떠러지 센서', '충돌 센서', '마이크', '카메라'],
          answer: 3,
          feedback: ['낭떠러지 센서는 청소 로봇이 계단을 알아챌 때 써요.', '충돌 센서는 부딪힘을 느끼는 센서예요. 드론이 병해충을 찾는 일과는 관계가 적어요.', '마이크는 소리를 듣는 센서예요. 병해충은 영상으로 찾아요.', ''],
          explain: '농업용 드론은 <b>카메라</b>로 찍은 영상을 인공지능이 분석해 병해충을 찾아요. 해야 할 일에 알맞은 센서가 있어야 로봇이 제대로 일할 수 있어요.',
        },
        {
          type: 'quiz', title: '로봇의 한계 구분하기',
          goal: '로봇과 한계가 <b>알맞게 짝지어진</b> 것은?',
          setup() { ensure('table'); },
          choices: ['청소 로봇 - 대화와 표정 같은 개인정보가 모여요', '서빙 로봇 - 좁은 통로에서 사람과 부딪힐 수 있어요', '농업용 드론 - 말소리를 알아듣지 못해요', '돌봄 로봇 - 계단에서 떨어질 수 있어요'],
          answer: 1,
          feedback: ['대화와 표정의 개인정보 문제는 돌봄·대화 로봇의 한계예요.', '', '드론의 한계는 날씨에 약하고 영상 판별이 틀릴 수 있다는 점이에요.', '계단에서 떨어지는 문제는 청소 로봇의 낭떠러지 센서와 관련 있어요.'],
          explain: '로봇은 하는 일에 따라 <b>한계</b>도 달라요. 서빙 로봇은 좁은 통로에서 사람과 부딪힐 수 있고, 돌봄 로봇은 개인정보가 모이며, 드론은 날씨와 판별 오류에 약해요.',
        },
      ],
    },
    {
      title: '개선 설계: 서빙 로봇의 문제 고치기', short: '개선 설계', icon: '🛠️', phase: '적용',
      features: ['design'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 로봇마다 장점과 한계가 다르다는 것을 확인했어요. 이제 서빙 로봇이 좁은 통로에서 사람과 부딪히는 문제를 <b>개선</b>해 봐요.</div>' +
        '<p>개선 카드 4장(📷 센서 추가, 📚 학습 데이터 확대, 🐢 속도 제한, 📞 사람 호출 기능)을 조합하면 <b>성공률 · 비용 · 안전 · 개인정보 위험</b>이 함께 변해요. 좋아지는 점과 부작용을 함께 따져 보는 것이 중요해요. (수치는 개념을 설명하는 교육용 예시예요.)</p>',
      setup() { enterLevel(3); showHint('개선 카드를 눌러 지표가 어떻게 변하는지 봐요', 6000); },
      recap: '개선안에는 좋아지는 효과와 함께 비용 증가·개인정보 위험 같은 부작용이 따라와요. 효과와 부작용을 함께 따져 골라야 해요.',
      summary: '<ul><li>개선 방안: <b>센서 추가</b>, <b>학습 데이터 확대</b>, <b>속도 제한</b>, <b>사람 호출 기능</b> 등을 조합할 수 있어요.</li><li>성공률 ' + GOAL_S + ' 이상, 개인정보 위험 ' + GOAL_P + ' 이하를 만족하는 조합: ' + comboText + '</li><li>카메라(센서)를 늘리면 성공률이 오르지만 <b>개인정보 위험</b>과 비용도 늘어요. 개선의 <b>효과와 부작용</b>을 함께 따져 보아야 해요.</li></ul>',
      missions: [
        {
          title: '효과는 크게, 위험은 작게',
          goal: '개선 카드를 골라 <b>성공률 ' + GOAL_S + ' 이상</b>이면서 <b>개인정보 위험 ' + GOAL_P + ' 이하</b>로 만들어 보세요.',
          hint: '카드를 켜고 끄며 막대를 살펴봐요. 예: ' + COMBOS[0].map((k) => IMP[k].ico + ' ' + IMP[k].name).join(' + ') + '. 카메라 센서는 성공률은 올리지만 개인정보 위험도 크게 올려요.',
          setup() { ensure('design'); },
          check: () => goalMet(dsM()), hold: 0.8,
          status: () => '성공률 <b>' + dsM().s + '</b> / ' + GOAL_S + ' ' + mark(dsM().s >= GOAL_S) + ' · 개인정보 위험 <b>' + dsM().p + '</b> / ' + GOAL_P + ' 이하 ' + mark(dsM().p <= GOAL_P),
          explain: '카드를 조합하면 성공률은 올리면서 위험은 낮출 수 있어요. 목표를 만족하는 조합은 <b>' + comboText + '</b>예요. <b>📷 센서 추가</b>는 성공률을 크게 올리지만 개인정보 위험이 크게 늘고, <b>🐢 속도 제한</b>은 안전을 크게 높이지만 배달이 느려져요.',
        },
        {
          title: '개선안 발표 카드 만들기',
          goal: '내가 고른 개선안에서 <b>실제로 생기는 부작용 한 가지</b>를 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '켜 둔 개선 카드들의 부작용 중에서 골라요. 켜지 않은 카드의 부작용은 내 개선안과 관계가 없어요.',
          manual: true,
          setup() { ensure('design'); sideOpen = true; updateCtl(); },
          status: () => '고른 개선 카드 <b>' + IMP_KEYS.filter((k) => D2.sel[k]).length + '장</b> · 고른 부작용 ' + (D2.side ? '<b>' + IMP[D2.side].ico + '</b>' : '⬜'),
          check() {
            const on = IMP_KEYS.filter((k) => D2.sel[k]);
            if (!on.length) return '개선 카드를 <b>한 장 이상</b> 켜 주세요.';
            if (!D2.side) return '내 개선안의 부작용을 <b>한 가지</b> 골라 주세요.';
            if (!D2.sel[D2.side]) return '그 부작용은 <b>켜지 않은 카드</b>의 것이에요. 내가 고른 개선 카드의 부작용을 골라 보세요.';
            return true;
          },
          explain: '좋은 개선안은 <b>효과</b>와 <b>부작용</b>을 함께 말해요. 예를 들어 센서를 늘리면 성공률은 오르지만 <b>개인정보 위험</b>이 늘고, 속도를 제한하면 안전해지지만 <b>배달이 느려져요</b>. 부작용까지 따져야 사회에 도움이 되는 기술이 돼요.',
        },
        {
          type: 'quiz', title: '개선의 부작용도 따져 보기',
          goal: '로봇의 문제를 개선하는 방안을 평가할 때 가장 알맞은 태도는?',
          setup() { ensure('design'); },
          choices: ['성공률만 높으면 비용이나 개인정보 문제는 신경 쓰지 않아도 된다', '성공률뿐 아니라 비용·안전·개인정보 위험 같은 부작용도 함께 비교해서 고른다', '가장 비싼 기술이 항상 가장 좋은 개선이다', '부작용이 있는 개선안은 무조건 쓰지 않는다'],
          answer: 1,
          feedback: ['개인정보 위험이나 비용이 커지면 오히려 문제가 될 수 있어요.', '', '비용이 크다고 해서 가장 좋은 것은 아니에요.', '부작용이 있어도 효과가 더 크거나 줄일 방법이 있다면 선택할 수 있어요. 함께 비교하는 것이 중요해요.'],
          explain: '기술을 개선할 때는 <b>효과</b>뿐 아니라 <b>비용·안전·개인정보 위험</b> 같은 부작용도 함께 비교해야 해요. 이 책임 있는 판단은 다음 차시 <b>과학 쟁점과 윤리</b>와 이어져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-ai-robot', mount: '#game', badge: 'AI 로봇 설계자', homeHref: '../../index.html#h1b',
    featureLabels: { robot: '🧹 청소 로봇 · 센서 켜고 끄기', learn: '🧠 쓰레기 분류 학습 · 샘플 모으기', table: '📋 로봇 4종 비교표', design: '🛠️ 개선 카드 · 지표 막대' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  updateCtl(); syncSen(); syncDesignCtl();
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'robot' || R.st === 'fall') stepRobot(dt);
    stepLearn(dt); stepTable(dt); stepDesign(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    const m = S.mode;
    if (m === 'robot') drawRobot(t); else if (m === 'learn') drawLearn(t); else if (m === 'table') drawTable(t); else drawDesign(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, BENCH, COMBOS, CLEANABLE, POOL, TEST, get game() { return game; }, setMode, enterLevel, covPct, toggleSen, addEven, addOne, clearSel, learn, accFinal, metrics, goalMet, tbCorrect, robGeom, tbGeom, lnGeom, dsGeom,
    solveTable() { S.tb.v = ROBOTS.map((r, ri) => COLS.map(() => ri)); },
    finishLearn() { while (L.phase === 'test' && !L.done) stepLearn(0.2); },
    setSel(o) { Object.assign(D2.sel, o); syncDesignCtl(); },
    robotTick(n) { for (let i = 0; i < n; i++) stepRobotOnce(1 / 60); R.flash = [0, 0, 0]; for (let k = 0; k < R.anim.length; k++) R.anim[k] = R.clean[k] ? 1 : 0; },
  };

})();
