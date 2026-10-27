/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 주기율표와 동족 원소 (단원 5차시)
   성취기준 [10통과1-02-03] 세상을 구성하는 원소들의 성질이 주기성을 나타내는 현상을 통해 자연의 규칙성을 도출하고,
   지구와 생명체를 구성하는 주요 원소들이 결합을 형성하는 이유를 해석할 수 있다. (주기성과 동족 원소 부분)
   ① 관찰: 규칙 찾기 (원자번호 1~20 카드 줄 세우기, 최외각 전자 수 막대의 반복, 족별 표)
   ② 실험: 1족 (Li·Na·K와 물의 반응, 가상 실험)
   ③ 실험: 17족 (염소·브로민·아이오딘 관찰, 철 솜, 할로젠 치환 반응)
   ④ 적용: 실험 설계 (같은 족 원소의 유사성을 검증하는 실험 설계서 완성)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 740 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f1eefb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function fitSize(str, maxW, size, weight) {
    ctx.save(); let s = size; ctx.font = D.font(s, weight || 800);
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
  function glass(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }

  /* ---------- 자료 ---------- */
  const ELS = [[1, 'H', '수소', 1, 1, 1], [2, 'He', '헬륨', 2, 18, 1], [3, 'Li', '리튬', 1, 1, 2], [4, 'Be', '베릴륨', 2, 2, 2], [5, 'B', '붕소', 3, 13, 2], [6, 'C', '탄소', 4, 14, 2], [7, 'N', '질소', 5, 15, 2], [8, 'O', '산소', 6, 16, 2], [9, 'F', '플루오린', 7, 17, 2], [10, 'Ne', '네온', 8, 18, 2],
    [11, 'Na', '나트륨', 1, 1, 3], [12, 'Mg', '마그네슘', 2, 2, 3], [13, 'Al', '알루미늄', 3, 13, 3], [14, 'Si', '규소', 4, 14, 3], [15, 'P', '인', 5, 15, 3], [16, 'S', '황', 6, 16, 3], [17, 'Cl', '염소', 7, 17, 3], [18, 'Ar', '아르곤', 8, 18, 3], [19, 'K', '칼륨', 1, 1, 4], [20, 'Ca', '칼슘', 2, 2, 4]]
    .map((a) => ({ z: a[0], sym: a[1], name: a[2], v: a[3], g: a[4], p: a[5] }));
  const GCOL = { 1: '#ef4444', 2: '#f59e0b', 13: '#84cc16', 14: '#10b981', 15: '#06b6d4', 16: '#3b82f6', 17: '#8b5cf6', 18: '#ec4899' };
  const GCOLS = [1, 2, 13, 14, 15, 16, 17, 18];
  const SHUF = [14, 3, 9, 20, 6, 17, 1, 12, 18, 8, 5, 19, 11, 2, 16, 7, 13, 4, 10, 15];

  const METALS = {
    Li: { name: '리튬', sym: 'Li', life: 16, speed: 14, bub: 7, star: 1, pinkRate: 0.07, r0: 15, bubTxt: '조금', col: '#d5dae3' },
    Na: { name: '나트륨', sym: 'Na', life: 7, speed: 90, bub: 20, star: 2, pinkRate: 0.2, r0: 15, bubTxt: '많이', col: '#e3e7ee' },
    K: { name: '칼륨', sym: 'K', life: 4.2, speed: 175, bub: 34, star: 3, pinkRate: 0.36, r0: 15, bubTxt: '아주 많이', col: '#e8e1f2' },
  };
  const HAL = [
    { id: 'Cl', sym: 'Cl₂', salt: 'KCl', name: '염소', state: '기체', color: '황록색', col: '#b5d93c', water: '#d7ea8a', atom: '#7ac143', r: 16, power: 3, ironGlow: 1 },
    { id: 'Br', sym: 'Br₂', salt: 'KBr', name: '브로민', state: '액체', color: '적갈색', col: '#b8421f', water: '#f0a24a', atom: '#c0502a', r: 19, power: 2, ironGlow: 0.62 },
    { id: 'I', sym: 'I₂', salt: 'KI', name: '아이오딘', state: '고체', color: '보라색', col: '#6b3fa0', water: '#b98245', atom: '#7e3fbf', r: 22, power: 1, ironGlow: 0.34 },
  ];
  const BROWN = '#8a5a2b';
  function mixColor(a, b) {   // 섞은 뒤의 용액 색
    if (HAL[a].power > HAL[b].power) {      // 치환 일어남: 약한 쪽 할로젠이 유리됨
      return b === 1 ? '#e8963a' : b === 2 ? '#8f5a2a' : '#e8963a';
    }
    return a === 0 ? '#e7f1b8' : a === 1 ? '#f7c680' : '#d9b27d';  // 반응 없음: 원래 할로젠 색 (묽게)
  }
  const reactsAB = (a, b) => HAL[a].power > HAL[b].power;
  const hasJong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const josaI = (w) => w + (hasJong(w) ? '이' : '가'), josaN = (w) => w + (hasJong(w) ? '은' : '는');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'line', sub: '', hview: 'jars', clock: 0, fade: 0, drag: null,
    // 규칙 찾기
    cards: [], slots: [], layout: 'line', lineOK: false, marks: new Set(), tableSeen: false, sel: null, barH: new Array(20).fill(0), lineFlash: 0, selZ: 0,
    // 1족
    w: null, reacted: new Set(), recs: {}, common: new Set(), bubbles: [], recPop: {},
    // 17족
    jarSel: -1, iron: [null, null, null], ironDone: new Set(), jarClock: 0,
    A: 0, B: 1, mixAnim: null, results: {}, reactDone: new Set(), swap: 0, lastMix: null,
    // 설계
    dstep: 0, dsel: { sample: new Set(), manip: null, ctrl: new Set(), meas: new Set(), safe: new Set() }, dstate: {}, run: null,
  };
  let game = null;

  /* ---------- 읽음 칸 / 안내 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4500);
  }

  /* ---------- 화면 전환 ---------- */
  const MODE_LABEL = { line: '🧮 규칙 찾기', water: '🧪 1족 원소와 물', halo: '🟢 17족 원소', design: '📝 실험 설계' };
  function setScene(mode, sub) {
    if (S.mode !== mode) { S.fade = 1; S.drag = null; }
    S.mode = mode; S.sub = sub || '';
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      const modes = n.getAttribute('data-modes').split(' ');
      const sub = n.getAttribute('data-sub'), hsub = n.getAttribute('data-hsub');
      n.hidden = !(modes.indexOf(S.mode) >= 0 && (!sub || sub === S.sub) && (!hsub || hsub === S.hview));
    });
    $$('#ctrlCard [data-freeonly]').forEach((n) => { n.hidden = !(game && game.free); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.l === S.layout));
    $$('#haloSeg button').forEach((b) => b.classList.toggle('on', b.dataset.h === S.hview));
    $$('#segA button').forEach((b) => b.classList.toggle('on', +b.dataset.a === S.A));
    $$('#segB button').forEach((b) => b.classList.toggle('on', +b.dataset.b === S.B));
    $$('#metalBtns .btn').forEach((b) => b.classList.toggle('done', S.reacted.has(b.dataset.m)));
    $('#bIron').disabled = S.jarSel < 0 || !!(S.iron[S.jarSel] && S.iron[S.jarSel].state === 'run');
    $('#layoutSeg button[data-l=table]').disabled = !tableAllowed();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode, ''); }));

  /* ================= ① 규칙 찾기 ================= */
  const LS = PHONE ? { w: 41, h: 52 } : { w: 37, h: 52 };
  const TS = PHONE ? { w: 50, h: 50 } : { w: 66, h: 62 };
  function slotPos(i) {
    if (!PHONE) return { x: 400 + (i - 9.5) * 39, y: 128 };
    const r = Math.floor(i / 10), c = i % 10;
    return { x: 240 + (c - 4.5) * 46, y: r ? 238 : 76 };
  }
  function barBase(i) { return !PHONE ? 336 : (i < 10 ? 192 : 352); }
  const BSCALE = PHONE ? 9 : 17;
  function trayPos(k) {
    const r = Math.floor(k / 10), c = k % 10;
    return !PHONE ? { x: 400 + (c - 4.5) * 74, y: 454 + r * 66 } : { x: 240 + (c - 4.5) * 46, y: 450 + r * 66 };
  }
  function tablePos(z) {
    const e = ELS[z - 1], col = GCOLS.indexOf(e.g);
    return !PHONE ? { x: 92 + col * 88 + 0, y: 148 + (e.p - 1) * 66 } : { x: 51 + 24 + col * 54, y: 148 + (e.p - 1) * 60 };
  }
  function initLine() {
    S.cards = SHUF.map((z, k) => { const q = trayPos(k); const e = ELS[z - 1]; return { kind: 'el', z, e, x: q.x, y: q.y, tx: q.x, ty: q.y, w: LS.w, h: LS.h, slot: null, home: k, lift: 0, bad: false, shake: 0 }; });
    S.slots = Array.from({ length: 20 }, (_, i) => ({ i, card: null }));
    S.layout = 'line'; S.lineOK = false; S.marks = new Set(); S.tableSeen = false; S.sel = null; S.barH = new Array(20).fill(0);
  }
  function moveCard(c, x, y, o) {
    o = o || {};
    c.tx = x; c.ty = y;
    SciSim.tween(c, { x, y }, { duration: o.dur != null ? o.dur : 0.42, ease: o.ease || 'outBack', delay: o.delay || 0 });
  }
  function stopCard(c) { SciSim.tween(c, { x: c.x, y: c.y }, { duration: 0.001 }); }
  function cardPos(c) { return S.layout === 'table' ? tablePos(c.z) : (c.slot != null ? slotPos(c.slot) : trayPos(c.home)); }
  function relayoutLine(skip, stagger) {
    const sz = S.layout === 'table' ? TS : LS;
    S.cards.forEach((c, k) => {
      if (c === skip) return;
      const q = cardPos(c);
      const d = stagger ? (c.z - 1) * 0.025 : 0;
      if (Math.abs(c.tx - q.x) > 0.5 || Math.abs(c.ty - q.y) > 0.5) moveCard(c, q.x, q.y, { delay: d });
      if (Math.abs(c.w - sz.w) > 0.5) SciSim.tween(c, { w: sz.w, h: sz.h }, { duration: 0.45, delay: d });
    });
  }
  function slotAt(x, y) {
    let best = null, bd = 1e9;
    S.slots.forEach((s) => { const q = slotPos(s.i); const d = Math.hypot(q.x - x, (q.y - y) * 0.9); if (d < bd) { bd = d; best = s; } });
    return bd < (PHONE ? 30 : 36) ? best : null;
  }
  function putCard(c, s) {
    const old = c.slot != null ? S.slots[c.slot] : null;
    if (s) {
      const occ = s.card;
      if (occ && occ !== c) { occ.slot = old ? old.i : null; if (old) old.card = occ; occ.bad = false; }
      else if (old && old !== s) old.card = null;
      c.slot = s.i; s.card = c; c.bad = false; Sound.tick();
    } else {
      if (old) old.card = null;
      c.slot = null;
    }
    relayoutLine(null);
  }
  const lineCount = () => S.cards.filter((c) => c.slot != null).length;
  const lineCorrect = () => S.cards.every((c) => c.slot === c.z - 1);
  function autoPlaceLine() {
    S.slots.forEach((s) => { s.card = null; });
    S.cards.forEach((c) => { c.slot = c.z - 1; S.slots[c.slot].card = c; c.bad = false; });
    relayoutLine(null, true);
  }
  function resetLine() {
    S.layout = 'line'; S.marks.clear(); S.sel = null;
    S.slots.forEach((s) => { s.card = null; }); S.cards.forEach((c) => { c.slot = null; c.bad = false; });
    relayoutLine(null); updateCtl();
  }
  const tableAllowed = () => game ? (game.free || S.lineOK || S.sub !== 'place' && lineCorrect()) : false;
  function setLayout(l) {
    if (l === 'table') { if (!lineCorrect()) autoPlaceLine(); S.tableSeen = true; }
    S.layout = l; relayoutLine(null, true); updateCtl(); S.fade = 0.25;
  }
  $$('#layoutSeg button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); setLayout(b.dataset.l); }));
  $('#bResetLine').addEventListener('click', () => { Sound.click(); resetLine(); });
  const lineLocked = () => S.sub !== 'place' && (S.lineOK || (game && game.free));

  /* ================= ② 1족 실험 ================= */
  const WG = PHONE ? { x: 10, y: 56, w: 460, h: 236, sy: 112 } : { x: 28, y: 100, w: 450, h: 270, sy: 160 };
  function startReaction(m) {
    const p = METALS[m];
    S.w = { m, p, t: 0, x: WG.x + WG.w / 2 + rnd(-20, 20), vx: (Math.random() < 0.5 ? -1 : 1) * p.speed, r: p.r0, pink: 0, done: false, pop: false, morph: 0, bubAcc: 0, sparkAcc: 0, doneT: 0 };
    S.bubbles.length = 0;
    S.reacted.add(m);
    S.recs[m] = true; S.recPop[m] = SciSim.time();
    Sound.tick(); updateCtl();
  }
  $$('#metalBtns .btn').forEach((b) => b.addEventListener('click', () => { startReaction(b.dataset.m); }));
  function stepWater(dt) {
    const w = S.w; if (!w) return;
    const p = w.p;
    w.t += dt;
    const x0 = WG.x + 36, x1 = WG.x + WG.w - 36;
    if (!w.done) {
      w.morph = Math.min(1, w.morph + dt * (p.star > 1 ? 1.4 : 0.15));
      const k = Math.max(0, 1 - w.t / p.life);
      w.r = p.r0 * (0.2 + 0.8 * Math.pow(k, 0.7));
      if (p.star === 1) { w.x += Math.sin(w.t * 1.3) * 10 * dt + w.vx * 0.3 * dt; }
      else { w.x += w.vx * dt; if (Math.random() < dt * (p.star === 3 ? 4 : 2)) w.vx = (Math.random() < 0.5 ? -1 : 1) * p.speed * rnd(0.5, 1.2); }
      if (w.x < x0) { w.x = x0; w.vx = Math.abs(w.vx); } if (w.x > x1) { w.x = x1; w.vx = -Math.abs(w.vx); }
      // 기포
      w.bubAcc += dt * p.bub * (0.3 + 0.7 * k);
      while (w.bubAcc > 1) { w.bubAcc -= 1; S.bubbles.push({ x: w.x + rnd(-8, 8), y: WG.sy + 10 + rnd(0, 8), r: rnd(2, 4.5), v: rnd(40, 80), ph: rnd(0, 6) }); }
      // 불꽃·불티
      if (p.star >= 2 && !RM) {
        w.sparkAcc += dt * p.star * 14;
        while (w.sparkAcc > 1) {
          w.sparkAcc -= 1;
          parts.emit({ x: w.x, y: WG.sy - 6, vx: rnd(-90, 90), vy: rnd(-140, -30), life: 0.45, size: rnd(1.5, 3), color: p.star === 3 ? '#d8b4fe' : '#ffe08a', gravity: 380, fade: true });
        }
      }
      if (w.t >= p.life) {
        w.done = true; w.doneT = 0;
        if (p.star === 3) { parts.burst(w.x, WG.sy - 8, { count: 16, speed: 200, size: 3.5, colors: ['#d8b4fe', '#fff', '#c084fc'], gravity: 200, life: 0.7 }); }
        if (p.star === 2) parts.burst(w.x, WG.sy - 8, { count: 8, speed: 120, size: 3, colors: ['#ffe08a', '#fff'], gravity: 200, life: 0.5 });
      }
    } else w.doneT += dt;
    w.pink = Math.min(1, w.pink + dt * p.pinkRate * (w.done ? 1.6 : 1));
    // 기포 이동
    for (let i = S.bubbles.length - 1; i >= 0; i--) {
      const b = S.bubbles[i];
      b.y -= b.v * dt; b.x += Math.sin(S.clock * 4 + b.ph) * 12 * dt;
      if (b.y < WG.sy + 2) { S.bubbles.splice(i, 1); if (!RM && Math.random() < 0.6) parts.emit({ x: b.x, y: WG.sy, vx: rnd(-20, 20), vy: -rnd(20, 50), life: 0.25, size: 1.6, color: '#fff', gravity: 200 }); }
    }
  }
  const COMMON_OPTS = [['기포(수소 기체)가 생긴다', true], ['수용액이 붉게 변한다(염기성)', true], ['물 위를 떠다니며 조각이 점점 작아진다', true], ['반응의 격렬한 정도가 모두 같다', false], ['물에 가라앉아 바닥에서 반응한다', false], ['불꽃이 일어나는 것이 공통이다', false]];
  const chipsC = $('#commonChips');
  COMMON_OPTS.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = o[0]; b.dataset.i = i;
    b.addEventListener('click', () => { Sound.click(); b.classList.remove('bad', 'ok'); if (S.common.has(i)) S.common.delete(i); else S.common.add(i); b.classList.toggle('on', S.common.has(i)); });
    chipsC.appendChild(b);
  });

  /* ================= ③ 17족 ================= */
  const JARX = PHONE ? [90, 240, 390] : [140, 400, 660];
  const JAR = PHONE ? { y: 70, w: 116, h: 190 } : { y: 90, w: 150, h: 210 };
  function jarRect(i) { return { x: JARX[i] - JAR.w / 2, y: JAR.y, w: JAR.w, h: JAR.h }; }
  function selectJar(i) { S.jarSel = i; Sound.tick(); updateCtl(); }
  function runIron() {
    const i = S.jarSel; if (i < 0) return;
    S.iron[i] = { state: 'run', t: 0, y: JAR.y - 60 };
    Sound.tick(); updateCtl();
  }
  $('#bIron').addEventListener('click', runIron);
  function stepIron(dt) {
    S.iron.forEach((f, i) => {
      if (!f || f.state !== 'run') return;
      f.t += dt;
      const g = HAL[i].ironGlow;
      if (!RM && Math.random() < dt * 30 * g * smooth(f.t, 0.6, 1.2)) parts.emit({ x: JARX[i] + rnd(-20, 20), y: JAR.y + JAR.h * 0.62, vx: rnd(-70, 70), vy: rnd(-120, -30), life: 0.5, size: rnd(1.5, 3), color: i === 0 ? '#ffd9a0' : '#ffb067', gravity: 320 });
      if (f.t > 4.2) { f.state = 'done'; S.ironDone.add(i); updateCtl(); }
    });
  }
  $$('#haloSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.hview = b.dataset.h; S.fade = 0.3; updateCtl(); }));
  $$('#segA button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.A = +b.dataset.a; updateCtl(); }));
  $$('#segB button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.B = +b.dataset.b; updateCtl(); }));
  $('#bMix').addEventListener('click', mix);
  function mix() {
    if (S.mixAnim && S.mixAnim.t < 1.4) return;
    const a = S.A, b = S.B, r = reactsAB(a, b);
    S.mixAnim = { a, b, r, t: 0, burst: false };
    S.swap = 0; S.lastMix = { a, b, r };
    S.results[a + ',' + b] = r ? 'rx' : 'no';
    if (r) S.reactDone.add(a + ',' + b);
    Sound.tick();
  }
  const ORD_OPTS = ['', '염소 Cl', '브로민 Br', '아이오딘 I'];
  ['ord1', 'ord2', 'ord3'].forEach((id) => {
    const s = $('#' + id);
    ORD_OPTS.forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o || '선택'; s.appendChild(op); });
    s.addEventListener('change', () => s.classList.remove('ok', 'bad'));
  });

  /* ================= ④ 실험 설계 ================= */
  const DSTEPS = [
    { key: 'sample', title: '① 시료 고르기', note: '비교할 원소를 모두 골라요. (여러 개)', multi: true, opts: ['나트륨 Na', '칼륨 K', '마그네슘 Mg', '칼슘 Ca'] },
    { key: 'manip', title: '② 바꿀 것 (조작 변인)', note: '일부러 다르게 하는 것 한 가지를 골라요.', multi: false, opts: ['원소의 종류', '물의 양', '물의 온도', '시료의 크기'] },
    { key: 'ctrl', title: '③ 같게 할 것 (통제 변인)', note: '공정하게 비교하려면 같게 맞춰야 할 것을 모두 골라요.', multi: true, opts: ['물의 양', '물의 온도', '시료의 크기', '지시약의 양', '원소의 종류'] },
    { key: 'meas', title: '④ 관찰할 것 (측정)', note: '결과를 알려 주는 것을 모두 골라요.', multi: true, opts: ['기포 발생 정도', '지시약의 색 변화', '시료의 가격', '비커의 색깔'] },
    { key: 'safe', title: '⑤ 안전 수칙', note: '지켜야 할 것을 모두 골라요.', multi: true, opts: ['보안경 착용', '작은 조각만 사용', '보호 유리 설치', '맨손으로 시료 집기', '많은 양을 한꺼번에 넣기'] },
  ];
  const SMP = { '나트륨 Na': 'Na', '칼륨 K': 'K', '마그네슘 Mg': 'Mg', '칼슘 Ca': 'Ca' };
  const DSPEC = { Na: { name: '나트륨', g: 1, bub: 22, star: 2, pink: 0.2, speed: 80 }, K: { name: '칼륨', g: 1, bub: 34, star: 3, pink: 0.36, speed: 150 }, Mg: { name: '마그네슘', g: 2, bub: 1.2, star: 0, pink: 0.02, speed: 0 }, Ca: { name: '칼슘', g: 2, bub: 8, star: 1, pink: 0.08, speed: 18 } };
  function dval(key) { const v = S.dsel[key]; return v instanceof Set ? v : v; }
  function wizRender() {
    const st = DSTEPS[S.dstep];
    $('#wizTitle').textContent = st.title;
    $('#wizNote').textContent = st.note;
    const dots = $('#wizDots'); dots.innerHTML = '';
    DSTEPS.forEach((d, i) => { const e = document.createElement('i'); e.className = i === S.dstep ? 'now' : (filled(d.key) ? 'done' : ''); dots.appendChild(e); });
    const box = $('#wizChips'); box.innerHTML = '';
    st.opts.forEach((o) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o;
      const on = st.multi ? S.dsel[st.key].has(o) : S.dsel[st.key] === o;
      b.classList.toggle('on', on);
      b.addEventListener('click', () => {
        Sound.click();
        if (S.run) return;
        if (st.multi) { if (S.dsel[st.key].has(o)) S.dsel[st.key].delete(o); else S.dsel[st.key].add(o); }
        else S.dsel[st.key] = S.dsel[st.key] === o ? null : o;
        wizRender();
      });
      box.appendChild(b);
    });
    $('#bWizPrev').disabled = S.dstep === 0;
    $('#bWizNext').disabled = S.dstep === DSTEPS.length - 1;
  }
  function filled(key) { const v = S.dsel[key]; return v instanceof Set ? v.size > 0 : !!v; }
  $('#bWizPrev').addEventListener('click', () => { Sound.click(); S.dstep = Math.max(0, S.dstep - 1); wizRender(); });
  $('#bWizNext').addEventListener('click', () => { Sound.click(); S.dstep = Math.min(DSTEPS.length - 1, S.dstep + 1); wizRender(); });
  $('#bDesignRun').addEventListener('click', () => { Sound.click(); const r = checkDesign(); if (r === true) startRun(); else showHint(r, 6000); });
  $('#bDesignReset').addEventListener('click', () => { Sound.click(); resetDesign(); });
  function resetDesign() {
    S.dstep = 0; S.dsel = { sample: new Set(), manip: null, ctrl: new Set(), meas: new Set(), safe: new Set() }; S.run = null; wizRender();
  }
  function checkDesign() {
    const d = S.dsel;
    const miss = DSTEPS.filter((s) => !filled(s.key)).map((s) => s.title);
    if (miss.length) return '아직 비어 있는 항목이 있어요: ' + miss[0] + ' 등을 채워 보세요. (◀ ▶ 로 이동)';
    const sm = [...d.sample].map((x) => SMP[x]);
    if (!sm.includes('Na') || !sm.includes('K')) return '① 시료: 같은 족끼리 비교하려면 1족 원소인 나트륨(Na)과 칼륨(K)을 모두 골라야 해요.';
    if (!sm.includes('Mg') && !sm.includes('Ca')) return '① 시료: 다른 족 원소(Mg 또는 Ca)도 하나 넣어야 “같은 족이라서 비슷한지” 비교할 수 있어요.';
    if (d.manip !== '원소의 종류') return '② 조작 변인: 이 실험에서 일부러 바꾸는 것은 “원소의 종류”예요. 나머지는 같게 맞추는 것들이에요.';
    const need = ['물의 양', '물의 온도', '시료의 크기'];
    for (const n of need) if (!d.ctrl.has(n)) return '③ 통제 변인: “' + n + '”도 같게 맞춰야 결과 차이가 원소 때문이라고 말할 수 있어요.';
    if (d.ctrl.has('원소의 종류')) return '③ 통제 변인: “원소의 종류”는 일부러 바꾸는 조작 변인이라 같게 맞추면 안 돼요.';
    if (!d.meas.has('기포 발생 정도') || !d.meas.has('지시약의 색 변화')) return '④ 측정: 반응 정도는 “기포 발생 정도”와 “지시약의 색 변화”로 알 수 있어요.';
    if (d.meas.has('시료의 가격') || d.meas.has('비커의 색깔')) return '④ 측정: 시료의 가격이나 비커의 색은 반응 결과와 관계가 없어요.';
    if (!d.safe.has('보안경 착용') || !d.safe.has('작은 조각만 사용') || !d.safe.has('보호 유리 설치')) return '⑤ 안전 수칙: 알칼리 금속은 위험해요. 보안경 · 작은 조각 · 보호 유리를 모두 지켜야 해요.';
    if (d.safe.has('맨손으로 시료 집기') || d.safe.has('많은 양을 한꺼번에 넣기')) return '⑤ 안전 수칙: 맨손으로 집거나 많은 양을 한꺼번에 넣는 것은 위험해서 하면 안 돼요.';
    return true;
  }
  function startRun() {
    const list = [...S.dsel.sample].map((x) => SMP[x]);
    S.run = { t: 0, tanks: list.map((m, i) => ({ m, spec: DSPEC[m], x: 0, vx: 0, pink: 0, bubs: [], acc: 0, r: 11 })) };
  }

  /* ================= 입력 ================= */
  function pickCard(p) {
    if (S.mode !== 'line') return null;
    for (let i = S.cards.length - 1; i >= 0; i--) { const c = S.cards[i]; if (Math.abs(p.x - c.x) < c.w / 2 + 2 && Math.abs(p.y - c.y) < c.h / 2 + 2) return c; }
    return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'water') {
        for (let i = 0; i < 3; i++) { const q = waterJar(i); if (Math.abs(p.x - q.x) < q.w / 2 + 6 && p.y > q.y - 10 && p.y < q.y + q.h + 10) { startReaction(['Li', 'Na', 'K'][i]); return false; } }
        return false;
      }
      if (S.mode === 'halo') {
        if (S.hview === 'jars') { for (let i = 0; i < 3; i++) { const r = jarRect(i); if (p.x > r.x - 8 && p.x < r.x + r.w + 8 && p.y > r.y - 8 && p.y < r.y + r.h + 50) { selectJar(i); return false; } } }
        return false;
      }
      if (S.mode !== 'line') return false;
      const c = pickCard(p);
      if (!c) {
        if (S.sel && !lineLocked()) { const s = slotAt(p.x, p.y); if (s) { putCard(S.sel, s); S.sel = null; } }
        return false;
      }
      if (lineLocked()) {
        // 막대 표시 (잠긴 줄에서는 카드를 눌러 ‘1로 돌아오는 원소’ 표시)
        if (S.layout === 'line') { if (S.marks.has(c.z)) S.marks.delete(c.z); else S.marks.add(c.z); Sound.tick(); S.selZ = c.z; }
        else S.selZ = c.z;
        return false;
      }
      if (S.layout === 'table') { S.selZ = c.z; return false; }
      S.selZ = c.z;
      S.cards.splice(S.cards.indexOf(c), 1); S.cards.push(c);
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
        if (c.slot != null) putCard(c, null);
        else S.sel = S.sel === c ? null : c;
        relayoutLine(null);
        return;
      }
      putCard(c, slotAt(c.x, c.y)); S.sel = null;
    },
    hover(p) { return S.mode === 'line' && pickCard(p) ? 'grab' : 'default'; },
  });

  /* ================= 그리기 ================= */
  function bg() { ctx.fillStyle = '#f1eefb'; ctx.fillRect(0, 0, VW, VH); }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }

  /* ---- ① 규칙 찾기 ---- */
  function drawCardEl(c) {
    const e = c.e, lift = c.lift || 0, sel = S.sel === c;
    const w = c.w, h = c.h, big = w > 55;
    ctx.save();
    ctx.translate(c.x, c.y - (sel ? 6 : 0)); const sc = 1 + 0.1 * lift + (sel ? 0.06 : 0); ctx.scale(sc, sc);
    if (c.shake > 0) ctx.translate(Math.sin(c.shake * 40) * 4 * c.shake, 0);
    const col = GCOL[e.g];
    D.roundRect(-w / 2 + 1, -h / 2 + 3 + lift * 4, w, h, 8); ctx.fillStyle = 'rgba(40,30,90,' + (0.16 + lift * 0.1) + ')'; ctx.fill();
    const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, C.shade(col, 0.35)); gr.addColorStop(1, col);
    D.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; D.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.38, 6); ctx.fill();
    T(0, big ? 8 : 4, e.sym, e.sym.length > 1 ? (big ? 22 : 17) : (big ? 25 : 21), '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.18)', strokeWidth: 3 });
    T(0, h / 2 - (big ? 6 : 7), String(e.z), 13, 'rgba(255,255,255,.95)', 'center', 800);
    if (big) T(0, -h / 2 + 15, e.name, fitSize(e.name, w - 4, 13), 'rgba(255,255,255,.95)', 'center', 800);
    if (c.bad) { D.roundRect(-w / 2, -h / 2, w, h, 8); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.5; ctx.stroke(); }
    else if (sel) { D.roundRect(-w / 2, -h / 2, w, h, 8); ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }
  function drawLine(dt) {
    bg();
    const tbl = S.layout === 'table';
    const barA = tbl ? 0 : 1;
    S.lineFlash = SciSim.approach(S.lineFlash, tbl ? 0 : 1, dt, 5);
    if (!tbl || S.lineFlash > 0.02) {
      ctx.save(); ctx.globalAlpha = S.lineFlash;
      // 기준선과 눈금
      const rows = PHONE ? [0, 1] : [0];
      rows.forEach((r) => {
        const base = barBase(r * 10), x0 = slotPos(r * 10).x - 24, x1 = slotPos(r * 10 + (PHONE ? 9 : 19)).x + 24;
        ctx.strokeStyle = '#a9a2c9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x1, base); ctx.stroke();
        for (let k = 2; k <= 8; k += 2) { ctx.strokeStyle = 'rgba(120,110,170,.2)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x0, base - k * BSCALE); ctx.lineTo(x1, base - k * BSCALE); ctx.stroke(); ctx.setLineDash([]); }
      });
      if (!PHONE) { T(20, 56, '막대 높이 = 최외각 전자 수 (개)', 14, '#4c1d95', 'left', 800); }
      else { T(12, 22, '막대 높이 = 최외각 전자 수 (개)', 14, '#4c1d95', 'left', 800); }
      // 막대
      for (let i = 0; i < 20; i++) {
        const s = S.slots[i], c = s.card;
        const target = c ? c.e.v : 0;
        S.barH[i] = SciSim.approach(S.barH[i], target, dt, RM ? 60 : 7);
        const q = slotPos(i), base = barBase(i), bw = PHONE ? 30 : 28, h = S.barH[i] * BSCALE;
        if (h > 0.5) {
          const col = GCOL[c ? c.e.g : 1];
          const boost = S.lineOK ? 0.2 * (0.5 + 0.5 * Math.sin(S.clock * 3 - i * 0.5)) : 0;
          const gr = ctx.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, C.shade(col, 0.35 + boost)); gr.addColorStop(1, col);
          D.roundRect(q.x - bw / 2, base - h, bw, h, 5); ctx.fillStyle = gr; ctx.fill();
          if (c) T(q.x, base - h - 5, String(c.e.v), 14, '#4c1d95', 'center', 800);
        }
        T(q.x, base + 17, String(i + 1), 13, '#6b6490', 'center', 700);
        // 표시(1로 돌아오는 원소)
        if (c && S.marks.has(c.z) && h > 1) {
          const ok = c.z === 3 || c.z === 11 || c.z === 19;
          ctx.strokeStyle = ok ? '#14a058' : '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, base - h - 8 - 8, 15, 0, Math.PI * 2); ctx.stroke();
          T(q.x, base - h - 4 - 8 + 0, ok ? '↺' : '✗', 16, ok ? '#14a058' : '#e2464b', 'center', 800);
        }
        // 빈 칸 표시
        if (!c) { ctx.save(); ctx.strokeStyle = '#b7afd8'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); D.roundRect(q.x - LS.w / 2, q.y - LS.h / 2, LS.w, LS.h, 8); ctx.stroke(); ctx.restore(); T(q.x, q.y + 5, String(i + 1), 14, '#a9a2c9', 'center', 800); }
      }
      // 주기 구분
      if (!PHONE) {
        const per = [[0, 1, '1주기'], [2, 9, '2주기'], [10, 17, '3주기'], [18, 19, '4주기']];
        per.forEach((p) => {
          const xa = slotPos(p[0]).x - 17, xb = slotPos(p[1]).x + 17, y = 372;
          ctx.strokeStyle = '#b7afd8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, y - 5); ctx.lineTo(xa, y); ctx.lineTo(xb, y); ctx.lineTo(xb, y - 5); ctx.stroke();
          T((xa + xb) / 2, y + 17, p[2], 13, '#6b6490', 'center', 800);
        });
      } else {
        T(240, 392, '가로줄 하나 = 한 주기 (1주기: H·He, 2주기: Li~Ne, …)', 13, '#6b6490', 'center', 700);
      }
      ctx.restore();
    }
    // 빈 트레이 안내
    if (!tbl && lineCount() < 20) T(PHONE ? 12 : 20, PHONE ? 412 : 418, '원소 카드 (원자번호가 적혀 있어요)', 14, '#6b6490', 'left', 700);
    // 표 머리글
    if (tbl) {
      ctx.save(); ctx.globalAlpha = smooth(1 - S.lineFlash, 0.1, 0.6);
      GCOLS.forEach((g, col) => {
        const x = tablePos(g === 18 ? 2 : g === 1 ? 1 : 3).x * 0 + (PHONE ? 75 + col * 54 : 92 + col * 88);
        const v = g === 18 ? 8 : g >= 13 ? g - 10 : g;
        D.roundRect(x - (PHONE ? 25 : 40), PHONE ? 46 : 52, PHONE ? 50 : 80, PHONE ? 52 : 56, 10); ctx.fillStyle = C.rgba(GCOL[g], 0.16); ctx.fill();
        T(x, PHONE ? 66 : 74, g + '족', PHONE ? 14 : 16, '#2b2150', 'center', 800);
        T(x, PHONE ? 88 : 96, g === 18 ? (PHONE ? '8(He 2)' : '전자 8(He 2)') : (PHONE ? 'e⁻ ' : '전자 ') + v, g === 18 ? 11.5 : 13, '#4c1d95', 'center', 800);
        // 열 강조: 1족
        if (g === 1 && S.marks.size >= 3) { ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; D.roundRect(x - (PHONE ? 26 : 42), PHONE ? 44 : 50, PHONE ? 52 : 84, PHONE ? 270 : 334, 12); ctx.stroke(); }
      });
      for (let p = 1; p <= 4; p++) { const y = tablePos(p === 1 ? 1 : p === 2 ? 3 : p === 3 ? 11 : 19).y; T(PHONE ? 12 : 20, y + 5, p + '주기', 13, '#6b6490', 'left', 800); }
      ctx.restore();
      const ny = PHONE ? 380 : 410;
      panel(PHONE ? 10 : 20, ny, VW - (PHONE ? 20 : 40), PHONE ? 130 : 120, 14);
      T(VW / 2, ny + 30, '같은 족(세로줄) = 최외각 전자 수가 같아요', 17, '#4c1d95', 'center', 800);
      wrap('1족: H · Li · Na · K → 모두 최외각 전자 1개. 같은 족 원소는 화학적 성질이 비슷해요. 최외각 전자 수는 원자번호가 커지면서 1 → 8로 올랐다가 다시 1로 돌아와요(주기성).', VW - (PHONE ? 50 : 80), 14, 700).forEach((ln, i) => T(VW / 2, ny + 58 + i * 20, ln, 14, '#3a4456', 'center', 700));
    }
    if (S.selZ && !tbl) {
      const e = ELS[S.selZ - 1]; /* 선택 원소 표시는 읽음 칸에 */ void e;
    }
    // 카드
    const drag = S.drag && S.drag.c;
    S.cards.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.5); });
    S.cards.forEach((c) => { if (c !== drag) drawCardEl(c); });
    if (drag) drawCardEl(drag);
    // 완성 상태
    const ok = lineCount() === 20 && lineCorrect();
    if (ok && !S.lineOK) { S.lineOK = true; Sound.success(); updateCtl(); S.cards.forEach((c, i) => { const q = slotPos(c.slot); parts.burst(q.x, q.y, { count: 5, speed: 90, size: 2.5, colors: [GCOL[c.e.g], '#fff'], gravity: 100 }); }); }
    if (!ok && S.lineOK && S.sub === 'place') { S.lineOK = false; updateCtl(); }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- ② 1족 ---- */
  function waterJar(i) { return PHONE ? { x: 80 + i * 160, y: 540, w: 90, h: 130 } : { x: 100 + i * 140, y: 400, w: 84, h: 130 }; }
  function drawTank(dt) {
    const g = WG, w = S.w;
    // 수조 뒤쪽
    panel(g.x - 8, g.y - 12, g.w + 16, g.h + 24, 18, '#fafaff');
    const wy = g.sy, wb = g.y + g.h - 8;
    ctx.save();
    glass(g.x, g.y, g.w, g.h, 14); ctx.clip();
    // 물
    const gr = ctx.createLinearGradient(0, wy, 0, wb); gr.addColorStop(0, 'rgba(147,205,245,.85)'); gr.addColorStop(1, 'rgba(96,165,230,.92)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(g.x, wb);
    for (let i = 0; i <= 30; i++) { const px = g.x + g.w * i / 30; ctx.lineTo(px, wy + Math.sin(S.clock * 2.2 + i * 0.6) * 1.8); }
    ctx.lineTo(g.x + g.w, wb); ctx.closePath(); ctx.fill();
    // 분홍(페놀프탈레인)
    if (w && w.pink > 0.01) {
      const a = Math.min(0.78, w.pink * 0.85);
      const pg = ctx.createLinearGradient(g.x, 0, g.x + g.w, 0);
      pg.addColorStop(0, 'rgba(236,72,153,' + a + ')'); pg.addColorStop(1, 'rgba(236,72,153,' + a + ')');
      ctx.fillStyle = pg; ctx.fillRect(g.x, wy, g.w, wb - wy);
      if (!w.done) { const rg = ctx.createRadialGradient(w.x, wy + 8, 4, w.x, wy + 8, 110); rg.addColorStop(0, 'rgba(244,63,142,' + Math.min(0.55, w.pink + 0.2) + ')'); rg.addColorStop(1, 'rgba(244,63,142,0)'); ctx.fillStyle = rg; ctx.fillRect(g.x, wy, g.w, wb - wy); }
    }
    // 기포
    S.bubbles.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); });
    ctx.restore();
    // 금속 조각
    if (w && !w.done) {
      const r = w.r, k = w.p.star, x = w.x, y = wy - r * 0.35 + Math.sin(S.clock * 5) * 1.2;
      if (k >= 2) {
        D.glow(x, y - 4, 40 + k * 14, k === 3 ? '#c084fc' : '#ffd76a', 0.28 + 0.1 * Math.sin(S.clock * 30));
        if (k === 3) D.flame(x, y - r * 0.4, 30 + 4 * Math.sin(S.clock * 20), S.clock, { base: 'rgba(196,132,252,.95)', glow: '#c084fc', core: 'rgba(255,255,255,.9)' });
        if (k === 2) D.flame(x, y - r * 0.4, 16, S.clock, { base: 'rgba(255,214,90,.95)', glow: '#ffd76a' });
      }
      const corner = r * (1 - 0.9 * w.morph);
      ctx.save(); ctx.translate(x, y);
      D.shadow(() => { D.roundRect(-r, -r, r * 2, r * 2, Math.max(2, r - corner * 0.0 - (r - corner))); const mg = ctx.createLinearGradient(-r, -r, r, r); mg.addColorStop(0, '#f8fafc'); mg.addColorStop(1, w.p.col === '#e8e1f2' ? '#c9c0dc' : '#aab3c2'); ctx.fillStyle = mg; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.restore();
      T(x, y - r - 8, w.p.sym, 14, '#1b2333', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    }
    // 유리 틀·반사
    ctx.save();
    glass(g.x, g.y, g.w, g.h, 14); ctx.strokeStyle = '#9db4d0'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(g.x + 14, g.y + 20); ctx.lineTo(g.x + 14, g.y + g.h - 30); ctx.stroke();
    ctx.restore();
    // 보호 유리(안전 가림막)
    ctx.save(); ctx.strokeStyle = 'rgba(120,150,190,.55)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; glass(g.x - 4, g.y - 8, g.w + 8, g.h + 16, 16); ctx.stroke(); ctx.restore();
    D.label(g.x + g.w - 40, g.y - 30, '보호 유리', { bg: 'rgba(100,130,170,.9)', size: 13 });
    if (w && S.bubbles.length > 2) T(w.x, wy + 52, '수소(H₂) 기포', 13, '#fff', 'center', 800, { stroke: 'rgba(30,60,110,.7)', strokeWidth: 4 });
    D.label(g.x, g.y - 30, '⚠ 가상 실험 · 실제로는 교사 시범', { bg: '#fff4dc', color: '#7c4a00', size: 13, border: '#f5c26b', align: 'left' });
  }
  function drawRecTable() {
    const x = PHONE ? 10 : 492, y = PHONE ? 302 : 100, w = PHONE ? 460 : 294, rh = PHONE ? 46 : 56, hh = 34;
    panel(x, y, w, hh + rh * 3 + 10, 14);
    const cols = PHONE ? [0.2, 0.2, 0.34, 0.26] : [0.18, 0.24, 0.3, 0.28];
    const hdr = ['금속', '기포', '수용액 색', '격렬함'];
    let cx = x + 8;
    hdr.forEach((h, i) => { T(cx + (w - 16) * cols[i] / 2, y + 23, h, 14, '#4c1d95', 'center', 800); cx += (w - 16) * cols[i]; });
    ['Li', 'Na', 'K'].forEach((m, r) => {
      const ry = y + hh + r * rh, p = METALS[m], done = !!S.recs[m];
      D.roundRect(x + 8, ry + 2, w - 16, rh - 4, 10); ctx.fillStyle = done ? '#f6f3ff' : '#f7f7fb'; ctx.fill();
      const pop = done ? Math.min(1, (SciSim.time() - S.recPop[m]) * 3) : 0;
      let xx = x + 8;
      const cw = (i) => (w - 16) * cols[i];
      T(xx + cw(0) / 2, ry + rh / 2 + 5, m, 18, '#2b2150', 'center', 800); xx += cw(0);
      if (done) {
        ctx.save(); ctx.globalAlpha = pop;
        T(xx + cw(1) / 2, ry + rh / 2 + 5, p.bubTxt, 14, '#1d4ed8', 'center', 800); xx += cw(1);
        const fin = S.w && S.w.m === m ? S.w.pink : 1;
        D.sphere(xx + 22, ry + rh / 2, 11, '#ec4899', { gloss: false });
        T(xx + 42, ry + rh / 2 + 5, '붉게', 14, '#be185d', 'left', 800); xx += cw(2);
        T(xx + cw(3) / 2, ry + rh / 2 + 6, '★'.repeat(p.star) + '☆'.repeat(3 - p.star), 19, '#f59e0b', 'center', 800);
        ctx.restore();
        void fin;
      } else { T(x + 8 + cw(0) + (cw(1) + cw(2) + cw(3)) / 2, ry + rh / 2 + 5, '아직 실험 전', 14, '#a3a0bd', 'center', 700); }
    });
  }
  function drawJarSmall(i) {
    const q = waterJar(i), m = ['Li', 'Na', 'K'][i], p = METALS[m];
    const on = S.w && S.w.m === m;
    ctx.save();
    D.shadow(() => { D.roundRect(q.x - q.w / 2, q.y + 14, q.w, q.h - 14, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.restore();
    ctx.save(); D.roundRect(q.x - q.w / 2 + 3, q.y + 52, q.w - 6, q.h - 56, 12); ctx.clip();
    ctx.fillStyle = 'rgba(250,220,120,.5)'; ctx.fillRect(q.x - q.w / 2, q.y + 52, q.w, q.h);
    ctx.restore();
    D.roundRect(q.x - q.w / 2, q.y + 14, q.w, q.h - 14, 14); ctx.strokeStyle = on ? '#8b5cf6' : '#b7c3d6'; ctx.lineWidth = on ? 4 : 2.5; ctx.stroke();
    D.roundRect(q.x - q.w / 2 + 8, q.y + 6, q.w - 16, 12, 5); ctx.fillStyle = '#c7cfdd'; ctx.fill();
    D.sphere(q.x, q.y + q.h - 30, 14, p.col, { shadow: true });
    T(q.x, q.y + q.h - 25, m, 14, '#1b2333', 'center', 800);
    T(q.x, q.y + 36, '석유 속 보관', 13, '#7c5a00', 'center', 800);
    T(q.x, q.y + q.h + 20, p.name, 14, '#2b2150', 'center', 800);
    if (S.reacted.has(m)) D.check(q.x + q.w / 2 - 6, q.y + 24, 11, 1);
  }
  function drawWater(dt) {
    bg();
    stepWater(dt);
    drawTank(dt);
    drawRecTable();
    for (let i = 0; i < 3; i++) drawJarSmall(i);
    if (!PHONE) {
      const ix = 492, iy = 322, iw = 294, ih = 224;
      panel(ix, iy, iw, ih, 14);
      const m = S.w ? S.w.m : null;
      const eq = { Li: '2Li + 2H₂O → 2LiOH + H₂↑', Na: '2Na + 2H₂O → 2NaOH + H₂↑', K: '2K + 2H₂O → 2KOH + H₂↑' };
      const dsc = { Li: '조용히 기포가 생기며 천천히 반응해요.', Na: '녹아서 작은 공이 되어 물 위를 돌아다니며 반응해요.', K: '불꽃을 내며 아주 격렬하게 반응해요.' };
      T(ix + 14, iy + 28, m ? METALS[m].name + '(' + m + ')의 반응' : '1족 금속 + 물', 16, '#2b2150', 'left', 800);
      D.roundRect(ix + 12, iy + 40, iw - 24, 36, 10); ctx.fillStyle = '#ede9fe'; ctx.fill();
      T(ix + iw / 2, iy + 64, m ? eq[m] : '금속 + 물 → 수산화물 + 수소', fitSize(m ? eq[m] : '금속 + 물 → 수산화물 + 수소', iw - 40, 16), '#4c1d95', 'center', 800);
      wrap(m ? dsc[m] + ' 수용액은 염기성이라 페놀프탈레인이 붉게 변해요.' : '같은 1족 금속이 물과 어떻게 반응하는지 하나씩 비교해 보세요. 가벼운 수소 기체 기포가 생기고 수용액이 염기성이 돼요.', iw - 28, 14, 700).forEach((ln, i) => T(ix + 14, iy + 104 + i * 20, ln, 14, '#3a4456', 'left', 700));
    }
    if (!S.w) { T(WG.x + WG.w / 2, WG.sy + 66, '▼ 아래 금속 병을 눌러 조각을 넣어 보세요', 15, '#4c1d95', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 }); }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- ③ 17족 ---- */
  function drawBottle(i, glowSel) {
    const r = jarRect(i), h = HAL[i], cx = r.x + r.w / 2;
    const neckW = r.w * 0.46, bodyY = r.y + 34;
    const f = S.iron[i];
    // 병 안쪽
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - neckW / 2, r.y); ctx.lineTo(cx - neckW / 2, bodyY); ctx.lineTo(r.x, bodyY + 18); ctx.lineTo(r.x, r.y + r.h - 14);
    ctx.quadraticCurveTo(r.x, r.y + r.h, r.x + 14, r.y + r.h); ctx.lineTo(r.x + r.w - 14, r.y + r.h); ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w, r.y + r.h - 14);
    ctx.lineTo(r.x + r.w, bodyY + 18); ctx.lineTo(cx + neckW / 2, bodyY); ctx.lineTo(cx + neckW / 2, r.y);
    ctx.save(); ctx.clip();
    if (i === 0) { // 염소 기체
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, 'rgba(200,225,90,.35)'); g.addColorStop(1, 'rgba(170,205,60,.6)');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let k = 0; k < 8; k++) { const a = S.clock * 0.5 + k * 1.7; D.glow(cx + Math.sin(a) * r.w * 0.28, r.y + r.h * (0.35 + 0.5 * ((k * 0.37 + S.clock * 0.05) % 1)), 26, '#c8e65a', 0.28); }
    } else if (i === 1) { // 브로민: 액체 + 증기
      ctx.fillStyle = 'rgba(190,60,30,.18)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let k = 0; k < 6; k++) { const a = S.clock * 0.4 + k * 2.1; D.glow(cx + Math.sin(a) * r.w * 0.25, r.y + r.h * (0.3 + 0.35 * ((k * 0.31 + S.clock * 0.04) % 1)), 24, '#d4552a', 0.22); }
      const ly = r.y + r.h * 0.74;
      const g = ctx.createLinearGradient(0, ly, 0, r.y + r.h); g.addColorStop(0, '#c2451f'); g.addColorStop(1, '#7a1f0a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h); for (let k = 0; k <= 20; k++) ctx.lineTo(r.x + r.w * k / 20, ly + Math.sin(S.clock * 2 + k) * 1.5); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.fill();
    } else { // 아이오딘: 고체 결정 + 보라 증기
      ctx.fillStyle = 'rgba(120,70,190,.12)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let k = 0; k < 5; k++) { const a = S.clock * 0.3 + k * 1.9; D.glow(cx + Math.sin(a) * r.w * 0.22, r.y + r.h * (0.45 + 0.3 * ((k * 0.29 + S.clock * 0.04) % 1)), 22, '#9b5de5', 0.2); }
      const rr = (function () { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      for (let k = 0; k < 16; k++) { const px = r.x + 14 + rr() * (r.w - 28), py = r.y + r.h - 12 - rr() * 22, sz = 6 + rr() * 8; ctx.save(); ctx.translate(px, py); ctx.rotate(rr() * 3); ctx.fillStyle = k % 2 ? '#4b2a7a' : '#6b3fa0'; ctx.fillRect(-sz / 2, -sz / 3, sz, sz * 0.66); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-sz / 2, -sz / 3, sz * 0.4, 2); ctx.restore(); }
    }
    // 철 솜 + 반응 결과
    if (f) {
      const prog = f.state === 'run' ? smooth(f.t, 0, 1.2) : 1;
      const wy = (JAR.y - 40) + (JAR.h * 0.5 + 20) * prog;
      const glowI = h.ironGlow * (f.state === 'run' ? smooth(f.t, 0.8, 1.6) * (1 - smooth(f.t, 3.4, 4.2) * 0.4) : 0.18);
      if (glowI > 0.02) D.glow(cx, wy, 70 * (0.5 + glowI), i === 0 ? '#ffb347' : '#ff8a3d', 0.75 * glowI);
      if (f.state === 'done') {   // 할로젠화 철 가루
        ctx.fillStyle = i === 0 ? '#8a5a3a' : i === 1 ? '#6a4630' : '#4a3a4a';
        for (let k = 0; k < 18; k++) { const px = cx + (k % 6 - 2.5) * 12 + (k * 7 % 5), py = r.y + r.h - 8 - Math.floor(k / 6) * 6; ctx.beginPath(); ctx.arc(px, py, 5 + (k % 3), 0, Math.PI * 2); ctx.fill(); }
      }
      if (f.state === 'run') drawWool(cx, wy, glowI);
    }
    ctx.restore();
    ctx.restore();
    // 유리 테두리
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - neckW / 2, r.y); ctx.lineTo(cx - neckW / 2, bodyY); ctx.lineTo(r.x, bodyY + 18); ctx.lineTo(r.x, r.y + r.h - 14);
    ctx.quadraticCurveTo(r.x, r.y + r.h, r.x + 14, r.y + r.h); ctx.lineTo(r.x + r.w - 14, r.y + r.h); ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w, r.y + r.h - 14);
    ctx.lineTo(r.x + r.w, bodyY + 18); ctx.lineTo(cx + neckW / 2, bodyY); ctx.lineTo(cx + neckW / 2, r.y);
    ctx.strokeStyle = glowSel ? '#8b5cf6' : '#8fa3bd'; ctx.lineWidth = glowSel ? 5 : 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x + 9, bodyY + 30); ctx.lineTo(r.x + 9, r.y + r.h - 24); ctx.stroke();
    ctx.restore();
    // 마개
    D.roundRect(cx - neckW / 2 - 4, r.y - 10, neckW + 8, 12, 5); ctx.fillStyle = '#c7cfdd'; ctx.fill();
    // 이름
    T(cx, r.y + r.h + 22, h.name + ' ' + h.sym, 17, '#2b2150', 'center', 800);
    T(cx, r.y + r.h + 42, h.state + ' · ' + h.color, 14, '#5d6879', 'center', 700);
    if (S.ironDone.has(i)) D.label(cx, r.y + r.h + 64, '철 + 할로젠 → 할로젠화 철', { bg: '#ede9fe', color: '#4c1d95', size: 13, border: '#c4b5fd' });
    if (glowSel) { D.ring(cx, r.y - 22, 8, S.clock, { color: '#8b5cf6' }); }
  }
  function drawWool(x, y, glow) {
    ctx.save(); ctx.translate(x, y);
    const rr = (function () { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    ctx.strokeStyle = glow > 0.1 ? 'rgba(255,170,90,.95)' : '#8a94a6'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 34; k++) { const a = rr() * 6.28, b = rr() * 6.28, l = 10 + rr() * 16; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 6); ctx.quadraticCurveTo(Math.cos(b) * l, Math.sin(b) * l * 0.7, Math.cos(a + 1) * l * 0.8, Math.sin(a + 1) * l * 0.6); ctx.stroke(); }
    ctx.restore();
  }
  function drawJars(dt) {
    bg();
    for (let i = 0; i < 3; i++) drawBottle(i, S.jarSel === i);
    // 철 솜 막대(집게)
    S.iron.forEach((f, i) => { if (f && f.state === 'run') { const prog = smooth(f.t, 0, 1.2); const wy = (JAR.y - 40) + (JAR.h * 0.5 + 20) * prog; ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(JARX[i], JAR.y - 70); ctx.lineTo(JARX[i], wy - 8); ctx.stroke(); } });
    const y0 = PHONE ? 70 + 190 + 90 : 90 + 210 + 82;
    panel(PHONE ? 10 : 20, y0, VW - (PHONE ? 20 : 40), PHONE ? 110 : 120, 14);
    const lines = S.jarSel < 0 ? ['병을 눌러 고르세요. 17족 할로젠은 모두 2원자 분자(Cl₂, Br₂, I₂)예요.', '색과 상태는 다르지만, 철과 반응해 금속 할로젠화물이 되는 점은 같아요.'] :
      ['선택: ' + HAL[S.jarSel].name + '(' + HAL[S.jarSel].sym + ') — ' + HAL[S.jarSel].state + ', ' + HAL[S.jarSel].color + ', 2원자 분자',
        S.ironDone.has(S.jarSel) ? '철 솜이 할로젠과 반응해 할로젠화 철 가루가 생겼어요. 빛과 열을 낸 정도는 염소 > 브로민 > 아이오딘이에요.' : '철 솜 넣기를 눌러 반응을 지켜보세요.'];
    lines.forEach((ln, i) => wrap(ln, VW - (PHONE ? 50 : 70), 14, 700).forEach((w2, j) => T(PHONE ? 22 : 34, y0 + 28 + i * (PHONE ? 44 : 40) + j * 19, w2, 14, i ? '#3a4456' : '#2b2150', 'left', i ? 700 : 800)));
    $('#jarNote').textContent = S.jarSel < 0 ? '병을 눌러 고른 뒤, 철 솜을 넣어 봐요. 위험하니 가상 실험으로만 해요.' : '선택한 병에 철 솜을 넣어 반응을 보세요. (가상 실험)';
  }
  function tubeGeom() {
    return PHONE ? { y: 54, h: 170, w: 50, xs: [70, 170, 330] } : { y: 78, h: 220, w: 58, xs: [90, 220, 390] };
  }
  function drawTubeLiquid(x, y, w, h, level, color, alpha) {
    D.testTube(x, y, w, h, { level, liquid: color });
  }
  function drawAtomBall(x, y, r, col, text) { D.sphere(x, y, r, col, { shadow: true, text: text, textScale: 0.8 }); }
  function drawSwapModel(x, y, w, h, a, b, r, p) {
    panel(x, y, w, h, 14);
    T(x + 14, y + 26, '🔍 입자 모형으로 보기', 15, '#4c1d95', 'left', 800);
    const A = HAL[a], B = HAL[b];
    const cx = x + w / 2, cy = y + 40 + (h - 66) / 2;
    const sc = Math.min(1, w / 290);
    const rA = A.r * sc, rB = B.r * sc, kR = 11 * sc;
    const gap = Math.min(44 * sc, Math.max(24, (h - 66) / 2 - Math.max(rA, rB) - 2));
    const K = [{ x: cx + 22 * sc, y: cy - gap }, { x: cx + 22 * sc, y: cy + gap }];
    const anB = K.map((k) => ({ x: k.x + kR + rB, y: k.y }));     // 처음: K⁺ 옆 B⁻
    const anA = K.map((k) => ({ x: k.x + kR + rA, y: k.y }));     // 나중: K⁺ 옆 A⁻
    const molA = [{ x: cx - 92 * sc, y: cy - rA * 0.95 }, { x: cx - 92 * sc, y: cy + rA * 0.95 }];
    const molB = [{ x: cx - 92 * sc, y: cy - rB * 0.95 }, { x: cx - 92 * sc, y: cy + rB * 0.95 }];
    const e = r ? SciSim.ease.inOutCubic(p) : 0;
    const wig = !r && S.mixAnim ? Math.sin(S.clock * 9) * 1.5 : 0;
    const lerp2 = (u, v) => ({ x: u.x + (v.x - u.x) * e, y: u.y + (v.y - u.y) * e });
    const aPos = molA.map((m, i) => lerp2(m, anA[i]));
    const bPos = anB.map((m, i) => lerp2(m, molB[i]));
    K.forEach((k) => D.sphere(k.x, k.y, kR, '#9aa5b6', { text: 'K⁺', textScale: 0.9, gloss: false }));
    ctx.save(); ctx.lineCap = 'round';
    if (1 - e > 0.05) { ctx.strokeStyle = C.rgba(A.atom, 1 - e); ctx.lineWidth = 10 * sc; ctx.beginPath(); ctx.moveTo(aPos[0].x, aPos[0].y); ctx.lineTo(aPos[1].x, aPos[1].y); ctx.stroke(); }
    if (e > 0.05) { ctx.strokeStyle = C.rgba(B.atom, e); ctx.lineWidth = 10 * sc; ctx.beginPath(); ctx.moveTo(bPos[0].x, bPos[0].y); ctx.lineTo(bPos[1].x, bPos[1].y); ctx.stroke(); }
    ctx.restore();
    aPos.forEach((q) => drawAtomBall(q.x + wig, q.y, rA, A.atom, A.id));
    bPos.forEach((q) => drawAtomBall(q.x, q.y, rB, B.atom, B.id));
    const cap = r ? (p < 0.1 ? A.sym + ' + 2K' + B.id : p > 0.95 ? '2K' + A.id + ' + ' + B.sym : '바꿔치기 중…') : (S.mixAnim ? '반응 없음 (그대로)' : A.sym + ' + 2K' + B.id);
    T(cx, y + h - 12, cap, 14, r && p > 0.95 ? '#0b6b39' : '#5d6879', 'center', 800);
  }
  function drawDisp(dt) {
    bg();
    const tg = tubeGeom();
    const m = S.mixAnim;
    const pa = HAL[S.A], pb = HAL[S.B];
    if (m) m.t += dt;
    const prog = m ? clamp(m.t / 1.2, 0, 1) : 0;
    // 시험관 3개
    const xs = tg.xs;
    const lvA = m ? 0.62 - 0.42 * prog : 0.62, lvB = m ? 0.62 - 0.42 * prog : 0.62;
    T(xs[0], tg.y - 18 + 4, '① ' + pa.sym + ' 수용액', 14, '#2b2150', 'center', 800);
    T(xs[1], tg.y - 18 + 4, '② ' + pb.salt, 14, '#2b2150', 'center', 800);
    drawTubeLiquid(xs[0], tg.y, tg.w, tg.h, S.mixAnim ? lvA : 0.62, pa.water);
    drawTubeLiquid(xs[1], tg.y, tg.w, tg.h, S.mixAnim ? lvB : 0.62, '#d8eaf6');
    // 결과 시험관
    let resCol = '#eef4fa', resLv = 0.0;
    if (m) {
      const end = mixColor(m.a, m.b);
      const mid = C.mix(pa.water, '#d8eaf6', 0.5);
      resLv = 0.1 + 0.36 * prog;
      const q = clamp((m.t - 1.0) / 0.8, 0, 1);
      resCol = C.mix(mid, end, m.r ? q : 1);
      if (!m.r) resCol = C.mix(mid, end, q);
    }
    T(xs[2], tg.y - 14, '③ 섞은 뒤', 14, '#2b2150', 'center', 800);
    drawTubeLiquid(xs[2], tg.y, tg.w * 1.1, tg.h, resLv, resCol);
    // 흐름
    if (m && prog < 1) {
      ctx.save(); ctx.strokeStyle = C.rgba(pa.water, 0.9); ctx.lineWidth = 5; ctx.lineCap = 'round';
      [[xs[0], pa.water], [xs[1], '#cfe3f2']].forEach((s) => { ctx.strokeStyle = C.rgba(s[1], 0.9); ctx.beginPath(); ctx.moveTo(s[0] + 12, tg.y + 6); ctx.quadraticCurveTo(s[0] + 60, tg.y - 24, xs[2] - 6 + (s[0] === xs[0] ? -6 : 6), tg.y + 40); ctx.stroke(); });
      ctx.restore();
    }
    if (m && m.t > 1.0 && m.r && !m.burst) {
      m.burst = true; parts.burst(xs[2], tg.y + tg.h * 0.6, { count: 14, speed: 100, size: 3, colors: [mixColor(m.a, m.b), '#fff', '#ffb400'], gravity: 40 });
      Sound.success();
    }
    if (m && m.t > 1.0 && m.r) D.glow(xs[2], tg.y + tg.h * 0.6, 70, mixColor(m.a, m.b), 0.3 * (1 - clamp((m.t - 1.0) / 1.2, 0, 1)));
    // 식 설명
    const ey = tg.y + tg.h + 36;
    panel(PHONE ? 10 : 20, ey, PHONE ? 460 : 450, PHONE ? 70 : 112, 14);
    if (!m) { T((PHONE ? 10 : 20) + (PHONE ? 230 : 225), ey + (PHONE ? 40 : 52), '①과 ②를 고르고 ⚗️ 섞기를 눌러요', 16, '#4c1d95', 'center', 800); }
    else {
      const done = m.t > 1.2;
      const lab = m.r ? HAL[m.a].sym + ' + 2' + HAL[m.b].salt + ' → 2' + HAL[m.a].salt + ' + ' + HAL[m.b].sym : HAL[m.a].sym + ' + ' + HAL[m.b].salt + ' → 반응 없음';
      const ex = (PHONE ? 10 : 20) + (PHONE ? 230 : 225);
      T(ex, ey + (PHONE ? 28 : 34), done ? lab : '섞는 중…', fitSize(lab, PHONE ? 430 : 420, 19), done && m.r ? '#0b6b39' : '#4c1d95', 'center', 800);
      if (done) wrap(m.r ? josaI(HAL[m.b].name) + ' 유리되어 용액 색이 변했어요. ' + josaI(HAL[m.a].name) + ' 더 반응성이 커서 ' + HAL[m.b].name + ' 자리를 차지했어요.' : josaN(HAL[m.a].name) + ' ' + HAL[m.b].name + '보다 반응성이 크지 않아서(또는 같은 원소라서) 반응하지 않아요.', PHONE ? 430 : 420, 14, 700).forEach((ln, i) => T(ex, ey + (PHONE ? 52 : 60) + i * 19, ln, 14, '#3a4456', 'center', 700));
    }
    // 입자 모형 + 결과표
    const mx = PHONE ? 10 : 490, my = PHONE ? ey + 82 : 56, mw = PHONE ? 460 : 296, mh = PHONE ? 160 : 230;
    const mm = S.lastMix || { a: S.A, b: S.B, r: reactsAB(S.A, S.B) };
    if (m && m.r) S.swap = Math.min(1, Math.max(0, (m.t - 0.9) / 1.4));
    drawSwapModel(mx, my, mw, mh, mm.a, mm.b, mm.r, mm.r ? S.swap : 0);
    // 3 x 3 결과표
    const ty = my + mh + 12, th = PHONE ? 200 : 232 - 0;
    const tx = mx, tw = mw;
    panel(tx, ty, tw, PHONE ? 196 : 222, 14);
    T(tx + 14, ty + 24, '실험 결과표 (○ 반응, × 반응 없음)', 14, '#4c1d95', 'left', 800);
    const cw = (tw - 90) / 3, ch = PHONE ? 38 : 44;
    HAL.forEach((h, j) => T(tx + 80 + cw * (j + 0.5), ty + 52, h.salt, 14, '#2b2150', 'center', 800));
    HAL.forEach((h, i) => {
      T(tx + 40, ty + 52 + ch * (i + 1) - ch / 2 + 6, h.sym, 15, '#2b2150', 'center', 800);
      HAL.forEach((k, j) => {
        const st = S.results[i + ',' + j];
        const cx2 = tx + 80 + cw * j + 4, cy2 = ty + 62 + ch * i;
        D.roundRect(cx2, cy2, cw - 8, ch - 6, 8); ctx.fillStyle = st === 'rx' ? '#e2f6eb' : st === 'no' ? '#f1f3f8' : '#f7f7fb'; ctx.fill();
        if (S.A === i && S.B === j) { ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2.5; ctx.stroke(); }
        if (st === 'rx') { D.sphere(cx2 + 16, cy2 + (ch - 6) / 2, 9, HAL[j].atom, { gloss: false }); T(cx2 + 40, cy2 + (ch - 6) / 2 + 6, '○', 18, '#0b6b39', 'left', 800); }
        else T(cx2 + (cw - 8) / 2, cy2 + (ch - 6) / 2 + 6, st === 'no' ? '×' : '?', 18, st === 'no' ? '#8a95a6' : '#c3bfd8', 'center', 800);
      });
    });
    T(tx + tw / 2, ty + (PHONE ? 186 : 212), '○ 옆 색 공: 유리된 할로젠', 13, '#6b6490', 'center', 700);
    void th;
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- ④ 설계 ---- */
  function drawMiniTank(x, y, w, h, tk, t, dt) {
    const sp = tk.spec;
    ctx.save();
    D.shadow(() => { glass(x, y, w, h, 12); ctx.fillStyle = '#fbfbff'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.restore();
    const wy = y + 38, wb = y + h - 6;
    ctx.save(); glass(x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = 'rgba(120,185,238,.88)'; ctx.fillRect(x, wy, w, wb - wy);
    if (tk.pink > 0.01) { ctx.fillStyle = 'rgba(236,72,153,' + Math.min(0.75, tk.pink * 0.85) + ')'; ctx.fillRect(x, wy, w, wb - wy); }
    tk.bubs.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.restore();
    glass(x, y, w, h, 12); ctx.strokeStyle = '#9db4d0'; ctx.lineWidth = 3; ctx.stroke();
    const col = tk.m === 'Na' ? '#e3e7ee' : tk.m === 'K' ? '#e8e1f2' : tk.m === 'Mg' ? '#c9ced6' : '#d6d9de';
    const px = tk.x, py = wy - 3;
    if (sp.star >= 2) D.glow(px, py - 4, 34, sp.star === 3 ? '#c084fc' : '#ffd76a', 0.35);
    if (sp.star === 3) D.flame(px, py - 4, 24, S.clock, { base: 'rgba(196,132,252,.95)', glow: '#c084fc', core: 'rgba(255,255,255,.9)' });
    else if (sp.star === 2) D.flame(px, py - 4, 13, S.clock, { base: 'rgba(255,214,90,.95)', glow: '#ffd76a' });
    D.sphere(px, py, tk.r, col, { shadow: true });
    T(x + w / 2, y + h + 20, sp.name + ' (' + sp.g + '족)', 14, sp.g === 1 ? '#be123c' : '#1d4ed8', 'center', 800);
  }
  function drawDesign(dt) {
    bg();
    const sx = PHONE ? 10 : 20, sy = PHONE ? 10 : 56, sw = PHONE ? 460 : 400, sh = PHONE ? 384 : 486;
    T(PHONE ? 14 : 20, PHONE ? 0 : 36, PHONE ? '' : '📝 실험 설계서', 17, '#2b2150', 'left', 800);
    panel(sx, sy, sw, sh, 16, '#fffdf6');
    ctx.save(); ctx.strokeStyle = 'rgba(160,140,90,.25)'; ctx.lineWidth = 1;
    for (let k = 1; k < 20; k++) { const ly = sy + 60 + k * 22; if (ly < sy + sh - 8) { ctx.beginPath(); ctx.moveTo(sx + 12, ly); ctx.lineTo(sx + sw - 12, ly); ctx.stroke(); } }
    ctx.restore();
    // 가설
    const hy = sy + 28;
    T(sx + 16, hy, '가설', 14, '#7c4a00', 'left', 800);
    wrap('같은 족 원소는 비슷하게 반응한다.', sw - 70, 15, 800).forEach((ln, i) => T(sx + 56, hy + i * 19, ln, 15, '#2b2150', 'left', 800));
    const rowH = PHONE ? 64 : 80;
    let yy = hy + 30;
    DSTEPS.forEach((st, i) => {
      const act = i === S.dstep && !S.run;
      const y0 = yy + i * rowH;
      if (act) { D.roundRect(sx + 8, y0 - 4, sw - 16, rowH - 4, 10); ctx.fillStyle = 'rgba(139,92,246,.1)'; ctx.fill(); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2; ctx.stroke(); }
      T(sx + 16, y0 + 17, st.title, 14, '#4c1d95', 'left', 800);
      const vals = st.multi ? [...S.dsel[st.key]] : (S.dsel[st.key] ? [S.dsel[st.key]] : []);
      if (!vals.length) T(sx + 16, y0 + 40, act ? '← 오른쪽(아래) 조작 칸에서 골라요' : '(아직 비어 있어요)', 13, '#a3a0bd', 'left', 700);
      let cx = sx + 16, cy = y0 + 28;
      vals.forEach((v) => {
        ctx.save(); ctx.font = D.font(13, 800); const tw = ctx.measureText(v).width + 18; ctx.restore();
        if (cx + tw > sx + sw - 14) { cx = sx + 16; cy += 26; }
        const bad = st.key === 'safe' ? (v === '맨손으로 시료 집기' || v === '많은 양을 한꺼번에 넣기') : false;
        D.label(cx + tw / 2, cy + 8, v, { bg: bad ? '#fde9e9' : '#ede9fe', color: bad ? '#a3262b' : '#4c1d95', size: 13, border: bad ? '#f2a0a3' : '#c4b5fd' });
        cx += tw + 6;
      });
    });
    // 실험 장면
    const lx = PHONE ? 10 : 440, ly = PHONE ? 404 : 56, lw = PHONE ? 460 : 346, lh = PHONE ? 326 : 486;
    panel(lx, ly, lw, lh, 16);
    T(lx + 14, ly + 28, '🧪 설계대로 실험하기', 16, '#2b2150', 'left', 800);
    if (!S.run) {
      const list = [...S.dsel.sample].map((x) => SMP[x]);
      if (!list.length) T(lx + lw / 2, ly + lh / 2, '시료를 고르면 여기에 수조가 나타나요', 15, '#a3a0bd', 'center', 800);
      list.forEach((m, i) => {
        const n = list.length, cols = PHONE ? Math.min(n, 4) : 2, tw = PHONE ? 100 : 140, th = PHONE ? 110 : 120;
        const c = i % cols, r = Math.floor(i / cols);
        const gx = lx + (lw - cols * (tw + 10) + 10) / 2 + c * (tw + 10), gy = ly + 56 + r * (th + 50);
        const key = m; if (!S.dstate[key]) S.dstate[key] = { m, spec: DSPEC[m], x: 0, vx: 0, pink: 0, bubs: [], acc: 0, r: 10, wy: 0, init: true };
        const tk = S.dstate[key]; tk.x = gx + tw / 2; tk.wy = gy + 38; tk.pink = 0; tk.bubs.length = 0; tk.r = 10;
        drawMiniTank(gx, gy, tw, th, tk, 0, dt);
      });
      T(lx + lw / 2, ly + lh - 18, '✔ 확인하기를 누르면 설계대로 실험이 진행돼요', 14, '#6b6490', 'center', 700);
    } else {
      const r = S.run, list = r.tanks, n = list.length, cols = PHONE ? Math.min(n, 4) : 2, tw = PHONE ? 100 : 140, th = PHONE ? 110 : 120;
      list.forEach((tk, i) => {
        const c = i % cols, rr = Math.floor(i / cols);
        const gx = lx + (lw - cols * (tw + 10) + 10) / 2 + c * (tw + 10), gy = ly + 56 + rr * (th + 50);
        tk.wy = gy + 38;
        if (!tk.init2) { tk.init2 = true; tk.x = gx + tw / 2; tk.vx = tk.spec.speed * (Math.random() < 0.5 ? -1 : 1); tk.gx = gx; tk.tw = tw; }
        const sp = tk.spec;
        const tt = r.t;
        tk.r = sp.g === 1 ? 11 * (0.1 + 0.9 * Math.max(0, 1 - tt / (sp.star === 3 ? 4.5 : 6))) : (sp.star === 0 ? 10 : 8 * (1 - 0.4 * Math.min(1, tt / 20)));
        if (sp.speed > 0 && tk.r > 1.5) { tk.x += tk.vx * dt; if (Math.random() < dt * 2) tk.vx = (Math.random() < 0.5 ? -1 : 1) * sp.speed * rnd(0.5, 1.1); }
        if (tk.x < gx + 14) { tk.x = gx + 14; tk.vx = Math.abs(tk.vx); } if (tk.x > gx + tw - 14) { tk.x = gx + tw - 14; tk.vx = -Math.abs(tk.vx); }
        tk.pink = Math.min(1, tk.pink + dt * sp.pink);
        tk.acc += dt * sp.bub * (sp.g === 1 ? (tk.r > 1.5 ? 1 : 0.15) : 1);
        while (tk.acc > 1) { tk.acc -= 1; tk.bubs.push({ x: tk.x + rnd(-5, 5), y: gy + th - 10, r: rnd(1.5, 3.2), v: rnd(30, 60) }); }
        for (let k = tk.bubs.length - 1; k >= 0; k--) { const b = tk.bubs[k]; b.y -= b.v * dt; if (b.y < tk.wy) tk.bubs.splice(k, 1); }
        if (sp.star >= 2 && tk.r > 1.5 && !RM && Math.random() < dt * 10) parts.emit({ x: tk.x, y: tk.wy - 6, vx: rnd(-60, 60), vy: rnd(-90, -20), life: 0.4, size: 2, color: sp.star === 3 ? '#d8b4fe' : '#ffe08a', gravity: 300 });
        drawMiniTank(gx, gy, tw, th, tk, tt, dt);
        const stars = '★'.repeat(sp.star) + '☆'.repeat(3 - sp.star);
        T(gx + tw / 2, gy + th + 40, stars, 17, '#f59e0b', 'center', 800);
      });
      r.t += dt;
      if (r.t > 6) wrap('같은 1족(Na, K)은 모두 격렬하게 반응해요. 다른 족(Mg, Ca)은 달라요!', lw - 30, 14, 800).forEach((ln, i, arr) => T(lx + lw / 2, ly + lh - 14 - (arr.length - 1 - i) * 19, ln, 14, '#0b6b39', 'center', 800));
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'line') {
      L1 = '놓은 카드'; a = S.layout === 'table' ? '20 / 20' : lineCount() + ' / 20';
      const e = S.selZ ? ELS[S.selZ - 1] : null;
      L2 = '선택한 원소'; b = e ? e.name + ' (' + e.sym + ', 원자번호 ' + e.z + ')' : '카드를 눌러 보세요';
      L3 = '최외각 전자 · 족'; c = e ? e.v + '개 · ' + e.g + '족 ' + e.p + '주기' : '—';
    } else if (S.mode === 'water') {
      L1 = '반응시킨 금속'; a = S.reacted.size + ' / 3'; L2 = '지금 반응 중'; b = S.w ? METALS[S.w.m].name + (S.w.done ? ' (끝)' : '') : '—'; L3 = '격렬함'; c = S.w ? '★'.repeat(S.w.p.star) + '☆'.repeat(3 - S.w.p.star) : '—';
    } else if (S.mode === 'halo') {
      if (S.hview === 'jars') { L1 = '선택한 병'; a = S.jarSel < 0 ? '—' : HAL[S.jarSel].name; L2 = '철 솜 반응'; b = S.ironDone.size + ' / 3'; L3 = '상태 · 색'; c = S.jarSel < 0 ? '—' : HAL[S.jarSel].state + ' · ' + HAL[S.jarSel].color; }
      else { L1 = '반응한 조합'; a = S.reactDone.size + ' / 3'; L2 = '지금 조합'; b = HAL[S.A].sym + ' + ' + HAL[S.B].salt; L3 = '결과'; c = S.lastMix ? (S.lastMix.r ? '치환 반응 ○' : '반응 없음 ×') : '—'; }
    } else {
      L1 = '채운 항목'; a = DSTEPS.filter((d) => filled(d.key)).length + ' / 5'; L2 = '지금 항목'; b = DSTEPS[S.dstep].title; L3 = '고른 시료'; c = S.dsel.sample.size ? [...S.dsel.sample].map((x) => SMP[x]).join(', ') : '—';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '규칙 찾기: 원소의 성질은 반복돼요', short: '규칙 찾기', icon: '🧮', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 원소들은 정말 규칙에 따라 늘어서 있을까? 같은 세로줄 원소는 서로 닮았을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 원소·원자의 구조·주기율표(족과 주기)를 배웠어요. 이번에는 <b>왜 같은 족이 닮았는지</b> 최외각 전자 수로 확인해 봐요.</div>' +
        '<p>원자번호 1~20번 원소 카드를 줄 세우고, <b>최외각 전자 수</b>가 어떻게 변하는지 살펴봐요.</p>',
      features: ['line'],
      setup() { setScene('line', ''); },
      recap: '원자번호 순서대로 줄 세우면 최외각 전자 수가 1→8로 늘었다가 다시 1로 돌아오기를 반복해요(주기성). 같은 족 원소는 최외각 전자 수가 같아요.',
      summary: '<ul><li>원소를 원자번호 순서로 늘어놓으면 <b>최외각 전자 수가 1 → 8로 늘었다가 다시 1로 돌아오기</b>를 반복해요. 이것을 <b>주기성</b>이라고 해요.</li><li>가로줄은 <b>주기</b>, 세로줄은 <b>족</b>이에요. 같은 족 원소는 <b>최외각 전자 수가 같아요</b> (예: 3번 Li, 11번 Na, 19번 K는 모두 1개).</li><li>최외각 전자 수가 같으면 화학적 성질이 비슷해요.</li></ul>',
      missions: [
        {
          title: '원소 카드 20장 줄 세우기', manual: true,
          goal: '원자번호 <b>1번부터 20번까지</b> 순서대로 카드를 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드 아래쪽 숫자가 원자번호예요. 카드를 끌어 놓거나, 카드를 눌러 고른 뒤 빈 칸을 눌러도 돼요. 막대 높이가 어떻게 변하는지도 보세요.',
          setup() { S.sub = 'place'; setScene('line', 'place'); if (S.layout === 'table') { S.layout = 'line'; } updateCtl(); },
          check() {
            const n = lineCount();
            if (n < 20) return '아직 ' + (20 - n) + '장이 남았어요. 카드를 모두 칸에 놓아 보세요.';
            let bad = 0;
            S.cards.forEach((c) => { const isBad = c.slot !== c.z - 1; if (isBad && !c.bad) c.shake = 1; c.bad = isBad; if (isBad) bad++; });
            if (bad) return '빨간 테두리 카드 ' + bad + '장의 자리가 달라요. 카드 아래 숫자(원자번호)와 칸 번호를 맞춰 보세요.';
            return true;
          },
          status: () => '놓은 카드 ' + lineCount() + ' / 20 &nbsp; ' + mark(lineCount() === 20 && lineCorrect()) + ' 순서 맞음',
          explain: '원자번호 순서대로 놓으면 막대(최외각 전자 수)가 <b>1, 2 → 1, 2, 3, …, 8 → 1, 2, …</b> 처럼 올랐다가 다시 1로 돌아와요. 첫 줄(H, He)만 짧고, 이후에는 8개씩 반복돼요.',
        },
        {
          title: '반복되는 위치 찾기',
          goal: '2번 이후에서 막대가 <b>다시 1로 돌아오는 원소 3개</b>를 눌러 표시하고, <b>족별 표</b>로 모아 보세요.',
          hint: 'Li(3), Na(11), K(19)가 막대가 다시 1이 되는 원소예요. 표시한 뒤 아래 조작 칸에서 “족별 표”를 눌러요.',
          setup() { if (!S.lineOK) autoPlaceLine(); S.lineOK = true; setScene('line', 'mark'); S.marks.clear(); updateCtl(); },
          check: () => S.marks.size === 3 && [3, 11, 19].every((z) => S.marks.has(z)) && S.tableSeen,
          hold: 0.8,
          status: () => {
            const good = [3, 11, 19].filter((z) => S.marks.has(z)).length, badN = [...S.marks].filter((z) => ![3, 11, 19].includes(z)).length;
            return mark(good === 3 && !badN) + ' 1로 돌아오는 원소 표시 ' + good + '/3' + (badN ? ' (잘못 표시 ' + badN + ')' : '') + ' &nbsp; ' + mark(S.tableSeen) + ' 족별 표 보기';
          },
          explain: '막대가 다시 1이 되는 곳은 <b>Li(3) → Na(11) → K(19)</b>예요. 이 원소들을 세로로 모으면 모두 <b>1족</b>이고 최외각 전자 수가 같아요. 세로줄(족)마다 최외각 전자 수가 같아서 성질이 비슷해요.',
        },
        {
          type: 'quiz', title: '같은 족인 까닭',
          goal: '원자번호 3(Li), 11(Na), 19(K)가 <b>같은 족</b>에 있는 까닭은 무엇일까요?',
          setup() { if (!S.lineOK) autoPlaceLine(); S.lineOK = true; setScene('line', 'quiz'); updateCtl(); },
          choices: ['원자번호가 모두 홀수라서', '최외각 전자 수가 모두 1개로 같아서', '전자껍질의 수가 모두 같아서', '원자의 질량이 모두 비슷해서'],
          answer: 1,
          feedback: ['3, 11, 19는 홀수지만, 족을 나누는 기준은 번호의 홀짝이 아니에요.', '', '전자껍질 수(주기)는 2, 3, 4개로 달라요. 같은 족은 껍질 수가 아니라 최외각 전자 수가 같아요.', '질량이 아니라 전자 배치가 화학적 성질을 정해요.'],
          explain: '같은 족 원소는 <b>최외각 전자 수가 같아요</b>. 화학 반응은 최외각 전자가 주고받으며 일어나서, 최외각 전자 수가 같으면 성질이 비슷해요.',
        },
      ],
    },
    {
      title: '1족 원소: 알칼리 금속과 물', short: '1족 원소', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 족은 최외각 전자 수가 같다는 것을 알았어요. 그럼 1족 원소(Li, Na, K)는 정말 비슷하게 반응할까요?</div>' +
        '<p>1족 금속(알칼리 금속) 조각을 <b>물에 넣어</b> 어떤 점이 같고 어떻게 다른지 관찰해요. (가상 실험이에요.)</p>',
      features: ['water'],
      setup() { setScene('water', ''); },
      recap: '1족 알칼리 금속은 물과 반응해 수소 기체를 내고 수용액이 염기성이 돼요. 같은 족은 성질이 비슷하지만, 아래로 갈수록 반응이 격렬해져요.',
      summary: '<ul><li>1족(알칼리 금속)은 은백색의 무른 금속이고, 반응성이 커서 <b>석유 속에 보관</b>해요.</li><li>물과 반응하면 <b>수소 기체</b>가 발생하고, 수용액은 <b>염기성</b>(페놀프탈레인 → 붉은색)이 돼요.</li><li>반응의 격렬함: <b>Li &lt; Na &lt; K</b> (같은 족에서 아래로 갈수록 격렬)</li></ul>',
      missions: [
        {
          title: '세 금속을 물에 넣어 보기',
          goal: '<b>리튬 · 나트륨 · 칼륨</b>을 한 번씩 물에 넣고 어떤 일이 일어나는지 관찰하세요.',
          hint: '아래 병을 누르거나 조작 칸의 버튼을 눌러요. 표에 결과가 쌓여요.',
          setup() { setScene('water', ''); },
          check: () => S.reacted.size >= 3 && S.w && (S.w.done || S.w.t > 3),
          hold: 0.6,
          status: () => ['Li', 'Na', 'K'].map((m) => mark(S.reacted.has(m)) + m).join(' &nbsp; '),
          explain: '세 금속 모두 <b>기포(수소 기체)가 발생</b>하고 <b>수용액이 붉게</b> 변해요(염기성). 하지만 <b>격렬함은 Li &lt; Na &lt; K</b>예요. 칼륨은 불꽃을 내며 폭발적으로 반응해요. (실제로는 교사 시범으로만!)',
        },
        {
          title: '세 금속의 공통점 찾기', manual: true,
          goal: '관찰한 내용에서 <b>세 금속의 공통점 3가지</b>를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“모두 같다”는 말이 맞는지 차이가 있는 항목은 아닌지 생각해 보세요. 표의 결과도 참고해요.',
          setup() { setScene('water', 'common'); },
          check() {
            const chips = $$('#commonChips button');
            const want = COMMON_OPTS.map((o) => o[1]);
            let bad = false;
            chips.forEach((b, i) => {
              const on = S.common.has(i);
              if (on && !want[i]) { bad = true; if (!b.classList.contains('bad')) { b.classList.remove('ok'); b.classList.add('bad'); } }
              else if (on && want[i]) { b.classList.remove('bad'); b.classList.add('ok'); }
            });
            const goodN = [...S.common].filter((i) => want[i]).length;
            if (bad) return '빨간 칸은 세 금속이 모두 같지는 않거나 관찰되지 않은 내용이에요. 다시 골라 보세요.';
            if (goodN < 3) return '공통점이 더 있어요. 지금 ' + goodN + '개를 골랐어요. 3개를 모두 골라 보세요.';
            return true;
          },
          status: () => '고른 공통점 ' + S.common.size + ' / 3',
          explain: '<b>공통점</b>: 기포(수소 기체) 발생, 수용액이 염기성(붉게), 물 위에서 반응하며 조각이 작아짐. <b>차이점</b>: 반응이 격렬한 정도(Li &lt; Na &lt; K), 불꽃 유무. 같은 족이라서 <b>성질은 비슷하되</b>, 아래로 갈수록 반응이 더 격렬해요.',
        },
        {
          type: 'quiz', title: '1족이 비슷하게 반응하는 까닭',
          goal: '리튬, 나트륨, 칼륨이 물과 <b>비슷하게 반응하는 까닭</b>은 무엇일까요?',
          setup() { setScene('water', 'quiz'); },
          choices: ['모두 같은 크기의 조각을 썼기 때문이다', '최외각 전자가 모두 1개로 같기 때문이다', '원자번호가 모두 비슷하기 때문이다', '모두 같은 색의 금속이기 때문이다'],
          answer: 1,
          feedback: ['조각 크기는 실험 조건이에요. 반응이 비슷한 까닭은 원소의 전자 배치에 있어요.', '', 'Li는 3번, Na는 11번, K는 19번으로 번호는 많이 달라요.', '색이 비슷한 것은 결과일 뿐이고, 반응이 비슷한 원인은 아니에요.'],
          explain: '1족 원소는 <b>최외각 전자가 1개</b>로 같아서, 반응할 때 같은 방식으로 전자를 내놓아요. 그래서 <b>화학적 성질이 비슷해요</b>.',
        },
      ],
    },
    {
      title: '17족 원소: 할로젠', short: '17족 원소', icon: '🟢', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 1족 원소들이 비슷한 성질을 보였어요. 이번에는 17족(할로젠)이 어떻게 닮았고 어떻게 다른지 알아봐요.</div>' +
        '<p>염소·브로민·아이오딘을 관찰하고, <b>치환 반응</b>으로 반응성의 순서를 찾아봐요. (가상 실험이에요.)</p>',
      features: ['halo'],
      setup() { setScene('halo', ''); S.hview = 'jars'; updateCtl(); },
      recap: '17족 할로젠은 2원자 분자로 색과 상태는 달라도 금속과 반응해 금속 할로젠화물이 돼요. 반응성은 Cl > Br > I 예요.',
      summary: '<ul><li>17족(할로젠): 염소 Cl₂(황록색 기체), 브로민 Br₂(적갈색 액체), 아이오딘 I₂(보라색 고체) — 모두 <b>2원자 분자</b>예요.</li><li>금속과 반응해 <b>금속 할로젠화물</b>(염)이 돼요. 같은 족이라 반응 방식이 같아요.</li><li><b>치환 반응</b>: 반응성이 큰 할로젠이 작은 할로젠을 밀어내요. 반응성: <b>Cl &gt; Br &gt; I</b></li></ul>',
      missions: [
        {
          title: '할로젠 병 관찰하고 철 솜 넣기',
          goal: '염소·브로민·아이오딘 <b>세 병을 눌러 관찰</b>하고, 병마다 <b>철 솜</b>을 넣어 반응을 지켜보세요.',
          hint: '병을 눌러 고른 뒤 “철 솜 넣기”를 눌러요. 세 병 모두 해야 해요.',
          setup() { setScene('halo', 'jars'); S.hview = 'jars'; updateCtl(); },
          check: () => S.ironDone.size >= 3,
          hold: 0.5,
          status: () => HAL.map((h, i) => mark(S.ironDone.has(i)) + h.name).join(' &nbsp; '),
          explain: '세 할로젠은 <b>색과 상태</b>가 달라도(황록색 기체 · 적갈색 액체 · 보라색 고체) 모두 <b>2원자 분자</b>이고, 철과 반응해 <b>금속 할로젠화물</b>을 만들어요. 반응이 활발한 정도는 염소 &gt; 브로민 &gt; 아이오딘이에요.',
        },
        {
          title: '치환 반응으로 반응성 순서 찾기', manual: true,
          goal: '<b>치환 반응 3가지</b>(Cl₂+KBr, Cl₂+KI, Br₂+KI)를 실행하고, <b>반응성이 큰 순서</b>를 골라 ✔ 확인하기를 누르세요.',
          hint: '결과표에서 ○가 나오는 조합을 모두 찾아요. 반응한 쪽이 더 반응성이 큰 할로젠이에요.',
          setup() { setScene('halo', 'order'); S.hview = 'disp'; updateCtl(); },
          check() {
            const need = ['0,1', '0,2', '1,2'].filter((k) => S.reactDone.has(k)).length;
            if (need < 3) return '치환 반응 3가지를 먼저 모두 해 보세요. (지금 ' + need + '/3)';
            const sel = ['ord1', 'ord2', 'ord3'].map((id) => $('#' + id));
            const want = ['염소 Cl', '브로민 Br', '아이오딘 I'];
            if (sel.some((s) => !s.value)) return '반응성이 큰 순서를 세 칸 모두 골라 보세요.';
            let bad = false;
            sel.forEach((s, i) => { if (s.value !== want[i]) { bad = true; if (!s.classList.contains('bad')) { s.classList.remove('ok'); s.classList.add('bad'); } } else { s.classList.remove('bad'); s.classList.add('ok'); } });
            if (bad) return '순서가 달라요. ○가 나온 결과를 보면 어느 쪽이 다른 쪽을 밀어냈는지 알 수 있어요.';
            return true;
          },
          status: () => '치환 반응 ' + ['0,1', '0,2', '1,2'].filter((k) => S.reactDone.has(k)).length + ' / 3',
          explain: '염소는 브로민·아이오딘을, 브로민은 아이오딘을 <b>밀어내요</b>(치환). 반대로는 일어나지 않아요. 그래서 반응성은 <b>Cl &gt; Br &gt; I</b> 예요. 같은 족이라도 아래로 갈수록(원자번호가 클수록) 17족은 반응성이 작아져요.',
        },
        {
          type: 'quiz', title: '염소 + 브로민화 칼륨',
          goal: '염소수에 <b>KBr 수용액</b>을 섞었더니 <b>적갈색</b>으로 변했어요. 그 까닭은?',
          setup() { setScene('halo', 'quiz'); S.hview = 'disp'; updateCtl(); },
          choices: ['염소가 브로민보다 반응성이 커서 브로민을 밀어내어 브로민(Br₂)이 생겼다', '브로민이 염소를 밀어내어 염소 기체가 생겼다', '두 물질이 섞이며 물이 붉게 변했을 뿐 화학 변화는 없다', '칼륨이 브로민으로 바뀌었다'],
          answer: 0,
          feedback: ['', '브로민은 염소보다 반응성이 작아서 염소를 밀어낼 수 없어요. 결과표의 ○ 방향을 다시 보세요.', 'Cl₂ + 2KBr → 2KCl + Br₂ 로 새 물질(Br₂)이 생기는 화학 변화예요.', '칼륨은 그대로이고 Br⁻ 자리를 Cl이 차지한 거예요.'],
          explain: '<b>Cl₂ + 2KBr → 2KCl + Br₂</b>. 반응성이 큰 염소가 브로민화 이온 자리를 차지하면서 <b>브로민(Br₂)이 유리</b>되어 용액이 적갈색이 돼요.',
        },
      ],
    },
    {
      title: '실험 설계: 같은 족은 비슷하게 반응할까', short: '실험 설계', icon: '📝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 1족과 17족 실험으로 같은 족의 유사성을 확인했어요. 이제 이 가설을 직접 검증하는 실험을 <b>설계</b>해 봐요.</div>' +
        '<p><b>가설: 같은 족 원소는 비슷하게 반응한다.</b> 시료, 조작 변인, 통제 변인, 측정, 안전 수칙을 차례로 골라 설계서를 완성하세요.</p>',
      features: ['design'],
      setup() { setScene('design', ''); wizRender(); },
      recap: '실험은 조작 변인(원소의 종류) 하나만 바꾸고 나머지(통제 변인)는 같게 하며, 안전 수칙을 지켜 설계해요. 같은 족(Na, K)은 비슷하게, 다른 족(Mg, Ca)은 다르게 반응해요.',
      summary: '<ul><li>가설: 같은 족 원소는 비슷하게 반응한다.</li><li><b>조작 변인</b>: 원소의 종류 / <b>통제 변인</b>: 물의 양, 물의 온도, 시료의 크기 / <b>측정</b>: 기포 발생 정도, 지시약의 색 변화</li><li>시료: 같은 족(Na, K) + 다른 족(Mg 또는 Ca)을 함께 비교해야 해요.</li><li>알칼리 금속은 위험하니 <b>보안경, 소량, 보호 유리</b>를 지켜요.</li></ul>',
      missions: [
        {
          title: '실험 설계서 완성하기', manual: true,
          goal: '가설 “같은 족 원소는 비슷하게 반응한다”를 검증하는 <b>실험 설계서</b>를 조작 칸에서 단계별로 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시료는 1족 둘(Na, K)과 다른 족 하나 이상이 필요해요. 바꾸는 것은 원소의 종류 하나뿐이에요.',
          setup() { setScene('design', ''); wizRender(); },
          check: () => checkDesign(),
          status: () => '채운 항목 ' + DSTEPS.filter((d) => filled(d.key)).length + ' / 5',
          explain: '설계서가 조건에 맞아요! 같은 족(Na, K)은 모두 <b>격렬하게</b>, 다른 족(Mg, Ca)은 <b>다르게</b> 반응해요. 같은 족끼리 비슷하다는 가설이 지지돼요. 조작 변인 하나만 바꾸고 나머지를 같게 해야 원소 때문에 생긴 차이라고 말할 수 있어요.',
        },
        {
          type: 'quiz', title: '루비듐(Rb)의 물 반응 예측',
          goal: '루비듐(Rb)은 칼륨(K) 바로 <b>아래</b> 1족 원소예요. 물과 반응하면 어떨까요?',
          setup() { setScene('design', 'quiz'); },
          choices: ['반응하지 않는다', '칼륨보다 더 격렬하게 반응하고 수용액이 염기성이 된다', '리튬처럼 천천히 반응한다', '물에 넣으면 붉은색 대신 파란색이 된다'],
          answer: 1,
          feedback: ['같은 1족이라 반응해요. 최외각 전자가 1개인 알칼리 금속이에요.', '', '아래로 갈수록 반응이 더 격렬해지는 경향이라 Li보다 훨씬 격렬해요.', '염기성이라 페놀프탈레인은 붉게 변해요. 다른 1족 원소와 똑같아요.'],
          explain: '1족은 <b>성질이 비슷하되 아래로 갈수록 반응이 격렬</b>해요(Li &lt; Na &lt; K &lt; Rb). 그래서 루비듐은 <b>칼륨보다 더 격렬</b>하게 반응하고 수용액은 염기성이에요. 이렇게 주기율표로 아직 안 해 본 원소의 성질도 예측할 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-periodic-table', mount: '#game', badge: '주기율표 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { line: '🧮 원소 카드 · 최외각 전자 수 막대', water: '🧪 1족 물 반응 수조', halo: '🟢 할로젠 병 · 치환 반응', design: '📝 실험 설계서' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  initLine(); wizRender();
  setScene('line', '');
  let lastFree = false, lastMode = '', lastPhase = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) { S.sub = ''; } updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    stepIron(dt);
    // 설계 미션 성공 → 실험 실행
    if (game && S.mode === 'design' && game.phase === 'success' && !S.run && lastPhase !== 'success') startRun();
    lastPhase = game ? game.phase : '';
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'line') drawLine(dt);
    else if (S.mode === 'water') drawWater(dt);
    else if (S.mode === 'halo') { if (S.hview === 'jars') { drawJars(dt); parts.update(dt); parts.draw(ctx); } else drawDisp(dt); }
    else drawDesign(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,238,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, ELS, setScene, startReaction, runIron, selectJar, mix, HAL, DSTEPS, SMP, wizRender, startRun, checkDesign,
    cards: () => S.cards.map((c) => ({ z: c.z, x: c.x, y: c.y, slot: c.slot })),
    slotXY: (i) => slotPos(i), tableXY: (z) => tablePos(z), trayXY: (k) => trayPos(k),
    autoPlace: autoPlaceLine, setLayout,
    markZ(zs) { zs.forEach((z) => S.marks.add(z)); },
    cardXY: (z) => { const c = S.cards.find((x) => x.z === z); return { x: c.x, y: c.y }; },
    jarXY: (i) => { const r = jarRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    waterJarXY: (i) => { const q = waterJar(i); return { x: q.x, y: q.y + q.h / 2 }; },
    pickDesign(key, val) { const d = S.dsel[key]; if (d instanceof Set) d.add(val); else S.dsel[key] = val; wizRender(); },
    fillDesign(right) {
      S.dsel.sample = new Set(['나트륨 Na', '칼륨 K', '마그네슘 Mg']); S.dsel.manip = '원소의 종류';
      S.dsel.ctrl = new Set(['물의 양', '물의 온도', '시료의 크기']); S.dsel.meas = new Set(['기포 발생 정도', '지시약의 색 변화']);
      S.dsel.safe = new Set(right === false ? ['보안경 착용', '맨손으로 시료 집기'] : ['보안경 착용', '작은 조각만 사용', '보호 유리 설치']); wizRender();
    },
  };
})();
