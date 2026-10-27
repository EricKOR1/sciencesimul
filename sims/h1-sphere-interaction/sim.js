/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 권역 간 상호작용 (단원 2차시)
   성취기준 [10통과1-03-01] 지구시스템은 태양계라는 시스템의 구성요소임을 알고, 지구시스템을 구성하는 권역들
   간의 물질 순환과 에너지 흐름의 결과로 나타나는 현상을 논증할 수 있다.
   ① 관찰: 물의 순환 (증발·응결·강수·유출·증산, 태양 에너지 슬라이더)
   ② 모형: 탄소의 순환 (저장고 4개와 이동 경로, 화석 연료 슬라이더)
   ③ 탐구: 연쇄 현상 (피나투보·엘니뇨·빙하 감소·산호 백화)
   ④ 적용: 균형과 책임 (온실가스 배출 시나리오 비교)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 840 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.2 : 1;
  const mark = (b) => (b ? '✅' : '⬜');
  const sm = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#e6eef9' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const TX = (x, y, s, o) => D.text(x, y, s, o);
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    str.split(' ').forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line); ctx.restore(); return out;
  }
  function para(x, y, str, maxW, size, o) {
    o = o || {}; const lh = (o.lh || 1.35) * size * FS; const lines = wrap(str, maxW, size, o.weight);
    lines.forEach((l, i) => TX(x, y + i * lh, l, Object.assign({ size }, o)));
    return y + lines.length * lh;
  }

  /* ---------- 자료 ---------- */
  const SPH = {
    geo: { name: '지권', col: '#b45309', desc: '땅과 땅속 (암석·화산)' },
    hyd: { name: '수권', col: '#2563eb', desc: '바다·강·빙하·지하수' },
    atm: { name: '기권', col: '#0ea5e9', desc: '지구를 둘러싼 공기' },
    bio: { name: '생물권', col: '#16a34a', desc: '살아 있는 모든 것' },
    spc: { name: '외권', col: '#7c3aed', desc: '대기 밖 우주 공간' },
  };
  const SPH_ORDER = ['geo', 'hyd', 'atm', 'bio', 'spc'];

  /* ======================================================
     끌어 놓기 판 (이름표·카드와 칸)
     ====================================================== */
  class Board {
    constructor() { this.items = []; this.slots = []; this.drag = null; this.ver = 0; }
    reset() { this.items.length = 0; this.slots.length = 0; this.drag = null; this.ver++; }
    addSlot(o) { const s = Object.assign({ items: [], cap: 1, isc: 1, cols: 1 }, o); this.slots.push(s); return s; }
    addItem(o) {
      const c = Object.assign({ lift: 0, shake: 0, slot: null, free: false, sc: 1, tsc: 1, bad: false }, o);
      c.x = c.tx = c.hx; c.y = c.ty = c.hy; this.items.push(c); return c;
    }
    pick(p) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const c = this.items[i], w = c.w * c.sc, h = c.h * c.sc;
        if (Math.abs(p.x - c.x) <= w / 2 + 3 && Math.abs(p.y - c.y) <= h / 2 + 3) return c;
      }
      return null;
    }
    start(c, p) {
      this.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
      if (c.slot) { const s = c.slot; s.items.splice(s.items.indexOf(c), 1); c.slot = null; this.layout(s); }
      const i = this.items.indexOf(c); if (i >= 0) { this.items.splice(i, 1); this.items.push(c); }
      c.free = true; c.tsc = 1; SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); this.ver++;
    }
    move(p) { const d = this.drag; if (d) { d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; } }
    slotAt(c) {
      let best = null, bd = 1e9;
      this.slots.forEach((s) => {
        const dx = Math.abs(c.x - s.x), dy = Math.abs(c.y - s.y);
        if (dx <= s.w / 2 + 14 && dy <= s.h / 2 + 14) { const d = dx / s.w + dy / s.h; if (d < bd) { bd = d; best = s; } }
      });
      return best;
    }
    layout(s) {
      const n = s.items.length;
      s.items.forEach((c, i) => {
        c.free = false; c.tsc = s.isc;
        if (s.cap === 1) { c.tx = s.x + (s.ix || 0); c.ty = s.y + (s.iy || 0); }
        else {
          const cols = s.cols, col = i % cols, row = Math.floor(i / cols), gw = s.gw || (s.w - 16) / cols, gh = s.gh || 40;
          c.tx = s.x - s.w / 2 + 8 + gw * (col + 0.5); c.ty = s.y - s.h / 2 + (s.top || 56) + gh * (row + 0.5);
        }
      });
    }
    drop() {
      const d = this.drag; if (!d) return null; this.drag = null;
      const c = d.c; SciSim.tween(c, { lift: 0 }, { duration: 0.2 });
      const s = this.slotAt(c);
      if (s && (s.cap > 1 ? s.items.length < s.cap : true)) {
        if (s.cap === 1 && s.items.length) {
          const o = s.items[0]; s.items.length = 0; o.slot = null; o.free = false; o.tsc = 1; o.tx = o.hx; o.ty = o.hy; o.bad = false;
        }
        s.items.push(c); c.slot = s; c.bad = false; this.layout(s); Sound.tick();
      } else { c.free = false; c.tsc = 1; c.tx = c.hx; c.ty = c.hy; c.bad = false; if (s) c.shake = 0.4; }
      this.ver++; return s;
    }
    step(dt) {
      this.items.forEach((c) => {
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
        if (RM) c.sc = c.tsc; else c.sc = SciSim.approach(c.sc, c.tsc, dt, 14);
        if (c.free) return;
        if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      });
    }
    placed() { return this.items.filter((c) => c.slot).length; }
    home() { this.items.forEach((c) => { if (c.slot) { c.slot.items.splice(c.slot.items.indexOf(c), 1); c.slot = null; } c.free = false; c.tsc = 1; c.tx = c.hx; c.ty = c.hy; c.bad = false; }); this.drag = null; this.ver++; }
  }
  /* 카드 하나 그리기 */
  function drawCard(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = c.sc * (1 + lift * 0.07), sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(15,23,42,' + (0.28 + lift * 0.12) + ')' });
    ctx.strokeStyle = c.bad ? '#e2464b' : (c.stroke || '#94a3b8'); ctx.lineWidth = c.bad ? 3 : 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
    if (c.paint) c.paint(c);
    else TX(0, 5, c.label, { size: c.size || 15, color: c.color || '#1b2333', weight: 800 });
    ctx.restore();
  }

  SPH.all = { name: '지표 전체', col: '#64748b' };
  const numDot = (x, y, n, sc) => {
    sc = sc || 1;
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 13 * sc, 0, 6.3); ctx.fill(); }, { blur: 4, y: 1, color: 'rgba(0,0,0,.4)' });
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.arc(x, y, 13 * sc, 0, 6.3); ctx.stroke();
    TX(x, y + 5.5 * sc, String(n), { size: 15 / sc, color: '#0f172a', weight: 800 }); ctx.restore();
  };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'water', wsub: 'flow', csub: 'model', clock: 0, fade: 0,
    wOK: 0, cOK: 0,
    // 물
    E: 0.5, Ea: 0.5, tr: null, trLoops: 0, trStage: -1, trSeen: new Set(), trHistory: [],
    // 탄소
    yr: 2025, run: true, fossil: 9.5, A: 880, V: 550, Sg: 1500, O: 38000, dA: 5.0, cHist: [], maxFossil: 9.5, A0: 880, flux: {},
    // 연쇄
    cs: 0, csT: 0, csAns: [[0, 0], [0, 0], [0, 0], [0, 0]], csViewed: new Set([0]), csOK: 0,
    // 시뮬레이션
    emit: 10, simRun: null, runs: [], ev: new Set(), simOK: 0,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const boards = { water: new Board(), carbon: new Board() };

  /* ======================================================
     화면 1: 물의 순환
     ====================================================== */
  const K = PHONE ? VW / 800 : 1;
  const FIGH = 400 * K;
  const TERR = [[300, 270], [340, 262], [400, 250], [470, 232], [540, 196], [600, 152], [650, 125], [700, 150], [760, 186], [800, 200]];
  function terrY(x) {
    for (let i = 0; i < TERR.length - 1; i++) { const a = TERR[i], b = TERR[i + 1]; if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return TERR[TERR.length - 1][1];
  }
  const TREES = [372, 402, 432];
  const R_ = (a, b) => a + Math.random() * (b - a);
  const cloudPt = () => ({ x: R_(405, 545), y: R_(78, 112) });
  const WATER = { ps: [], cnt: { sea: 0, air: 0, land: 0, cloud: 0 }, ev: [], pr: [], ro: [] };
  const STAGE_TXT = ['바다에 있어요 (수권)', '증발: 수증기가 되어 올라가요 (수권 → 기권)', '응결: 구름 속 작은 물방울이 돼요 (기권)', '강수: 비가 되어 내려와요 (기권 → 지권)', '유출: 땅 위를 흘러 바다로 가요 (지권 → 수권)'];
  function toSea(p, x, y) { p.st = 'sea'; p.x = x; p.y = y; p.tx = R_(14, 286); p.ty = R_(290, 385); p.hold = 0; }
  function evap(p, tgt) {
    const t = tgt || cloudPt(); p.st = 'rise'; p.sx = p.x; p.sy = p.y > 270 ? 270 : p.y; p.tx = t.x; p.ty = t.y; p.u = 0;
    const d = Math.hypot(p.tx - p.sx, p.ty - p.sy); p.dur = d / (70 * (0.4 + S.Ea)); p.ph = R_(0, 6);
    if (!tgt) { WATER.ev.push(S.clock); parts.emit({ x: p.sx * K, y: p.sy * K, vx: 0, vy: -16, life: 0.9, size: 4, grow: 6, color: 'rgba(255,255,255,.7)', shape: 'bubble', gravity: 0 }); }
  }
  function startRain(p) {
    p.st = 'rain'; p.sx = p.x; p.sy = p.y; p.u = 0;
    if (p.tr) { p.tx = R_(500, 600); p.ty = terrY(p.tx); p.land = true; }
    else if (Math.random() < 0.15) { p.tx = R_(215, 288); p.ty = 270; p.land = false; }
    else { p.tx = R_(445, 640); p.ty = terrY(p.tx); p.land = true; }
    p.dur = Math.hypot(p.tx - p.sx, p.ty - p.sy) / 150; WATER.pr.push(S.clock);
  }
  function mkWater() {
    WATER.ps = []; WATER.ev = []; WATER.pr = []; WATER.ro = [];
    for (let i = 0; i < 150; i++) {
      const p = { st: 'sea', x: 0, y: 0, tx: 0, ty: 0, u: 0, dur: 1, hold: 0, tr: false, noinf: false, ph: R_(0, 6), trail: [] };
      const r = Math.random();
      if (r < 0.7) toSea(p, R_(14, 286), R_(290, 385));
      else if (r < 0.77) { p.x = R_(100, 250); p.y = R_(150, 260); evap(p, cloudPt()); p.u = Math.random(); }
      else if (r < 0.83) { const c = cloudPt(); p.st = 'cloud'; p.x = c.x; p.y = c.y; p.hold = R_(1, 5); }
      else if (r < 0.87) { p.x = R_(450, 600); p.y = R_(120, 200); startRain(p); p.u = Math.random() * 0.8; }
      else if (r < 0.93) { p.st = 'run'; p.x = R_(320, 600); p.y = terrY(p.x); }
      else { p.st = 'ground'; p.x = R_(320, 780); p.y = R_(322, 346); }
      p.tx = p.tx || 0; WATER.ps.push(p);
    }
    S.Ea = S.E; for (let i = 0; i < 260; i++) stepWater(0.1, true);
    WATER.ev = []; WATER.pr = []; WATER.ro = [];
  }
  function stepWater(dt, quiet) {
    const E = S.Ea, n0 = WATER.ps.length;
    let nSea = 0, nAir = 0, nLand = 0, nCloud = 0;
    for (let i = 0; i < n0; i++) {
      const p = WATER.ps[i];
      switch (p.st) {
        case 'sea': {
          nSea++; p.x += (p.tx - p.x) * Math.min(1, dt * 0.9); p.y += (p.ty - p.y) * Math.min(1, dt * 0.9);
          if (p.tr) { p.hold -= dt; if (p.hold <= 0) evap(p); } else if (Math.random() < 0.05 * E * dt * 1.0) evap(p);
          break;
        }
        case 'rise': {
          nAir++; p.u += dt / p.dur; const u = Math.min(1, p.u);
          p.x = p.sx + (p.tx - p.sx) * u + Math.sin(u * 9 + p.ph) * 5; p.y = p.sy + (p.ty - p.sy) * u;
          if (p.u >= 1) { p.st = 'cloud'; p.x = p.tx; p.y = p.ty; p.hold = R_(2.5, 5.5) / (0.4 + E); }
          break;
        }
        case 'cloud': {
          nAir++; nCloud++; p.hold -= dt; p.x += Math.sin(S.clock * 1.3 + p.ph) * 0.15; p.y += Math.cos(S.clock * 1.1 + p.ph) * 0.1;
          if (p.hold <= 0) startRain(p);
          break;
        }
        case 'rain': {
          nAir++; p.u += dt / p.dur; const u = Math.min(1, p.u);
          p.x = p.sx + (p.tx - p.sx) * u; p.y = p.sy + (p.ty - p.sy) * u * u * 0.4 + (p.ty - p.sy) * u * 0.6;
          if (p.u >= 1) { if (p.land) { p.st = 'run'; p.x = p.tx; p.y = terrY(p.x) - 2; } else { toSea(p, p.tx, 272); } }
          break;
        }
        case 'run': {
          nLand++; p.x -= 62 * dt; p.y = terrY(p.x) - 2;
          if (!p.noinf && Math.random() < 0.22 * dt) { p.st = 'inf'; p.sx = p.x; p.sy = p.y; p.ty = R_(326, 346); p.u = 0; }
          else if (p.x <= 300) { toSea(p, 300, 272); WATER.ro.push(S.clock); if (p.tr) tracerDone(p); }
          break;
        }
        case 'inf': { nLand++; p.u += dt / 0.9; p.y = p.sy + (p.ty - p.sy) * Math.min(1, p.u); if (p.u >= 1) { p.st = 'ground'; p.y = p.ty; } break; }
        case 'ground': {
          nLand++; p.x -= 18 * dt; p.y += Math.sin(S.clock * 2 + p.ph) * 0.1;
          if (p.x <= 300) { toSea(p, 300, 340); WATER.ro.push(S.clock); }
          else if (p.x > 345 && p.x < 455 && Math.random() < 0.3 * (0.3 + E) * dt) { p.st = 'up'; p.sx = p.x; p.sy = p.y; p.tx = TREES.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a)); p.ty = 226; p.u = 0; }
          break;
        }
        case 'up': { nLand++; p.u += dt / 2.2; const u = Math.min(1, p.u); p.x = p.sx + (p.tx - p.sx) * u; p.y = p.sy + (p.ty - p.sy) * u; if (p.u >= 1) { evap(p, cloudPt()); p.sy = 226; p.sx = p.x; } break; }
      }
      if (p.tr) { p.trail.push([p.x, p.y]); if (p.trail.length > 26) p.trail.shift(); }
    }
    WATER.cnt = { sea: nSea, air: nAir, land: nLand, cloud: nCloud };
    const now = S.clock; ['ev', 'pr', 'ro'].forEach((k) => { const a = WATER[k]; while (a.length && now - a[0] > 5) a.shift(); });
    // 추적 물방울 단계
    const tp = S.tr;
    if (tp && !quiet) {
      const st = { sea: 0, rise: 1, cloud: 2, rain: 3, run: 4, inf: 4, ground: 4, up: 1 }[tp.st];
      if (st != null) { if (st > S.trStage || tp.st === 'sea') { /* 단계 기록 */ } S.trSeen.add(st); }
    }
  }
  function tracerDone(p) { S.trLoops++; S.trDone = true; S.tr = p; p.tr = false; p.trDoneAt = S.clock; Sound.success(); parts.burst(300 * K, 272 * K, { count: 14, speed: 120, size: 3.5, life: 0.8, colors: ['#fde047', '#38bdf8', '#fff'] }); }
  function launchTracer() {
    const old = S.tr; if (old) { old.tr = false; old.trail = []; }
    const cand = WATER.ps.filter((p) => p.st === 'sea' && !p.tr); const p = cand[Math.floor(Math.random() * cand.length)];
    if (!p) return;
    p.tr = true; p.noinf = true; p.hold = 0.8; p.trail = []; p.tx = Math.min(p.x, 250); p.ty = Math.max(p.y, 300);
    S.tr = p; S.trSeen = new Set([0]); S.trDone = false; Sound.click();
  }
  const evRate = () => WATER.ev.length / 5;
  const prRate = () => WATER.pr.length / 5;
  const roRate = () => WATER.ro.length / 5;
  const W_TAGS = ['증발', '응결', '강수', '유출', '증산'];
  const W_INFO = ['수권 → 기권', '기권 (수증기 → 물방울)', '기권 → 지권·수권', '지권(땅 위) → 수권', '생물권 → 기권'];
  const W_MARK = [[168, 252], [492, 70], [470, 160], [336, 258], [410, 196]];
  function waterPanelY() { return FIGH; }
  function initWaterBoard() {
    const B = boards.water; B.reset(); S.wOK = 0;
    const order = [2, 4, 0, 3, 1];
    for (let i = 0; i < 5; i++) {
      const sp = PHONE ? { x: 155 + (i % 2) * 290, y: 392 + Math.floor(i / 2) * 88 } : { x: 80 + i * 160, y: 474 };
      B.addSlot({ x: sp.x, y: sp.y, w: PHONE ? 276 : 150, h: PHONE ? 74 : 76, idx: i, ix: PHONE ? -50 : 8, iy: PHONE ? -16 : -14 });
    }
    order.forEach((ti, j) => {
      const tp = PHONE ? { x: 100 + (j % 3) * 200, y: 690 + Math.floor(j / 3) * 52 } : { x: 80 + j * 160, y: 540 };
      B.addItem({ label: W_TAGS[ti], ans: ti, hx: tp.x, hy: tp.y, w: PHONE ? 130 : 120, h: 36, size: 16, fill: '#fff', stroke: '#64748b' });
    });
  }
  function drawWater(t, dt) {
    const E = S.Ea, label = S.wsub === 'label';
    // 하늘
    const sk = ctx.createLinearGradient(0, 0, 0, FIGH); sk.addColorStop(0, SciSim.color.mix('#64748b', '#69b7ff', 0.25 + 0.75 * E)); sk.addColorStop(1, SciSim.color.mix('#cbd5e1', '#dff1ff', 0.3 + 0.7 * E));
    ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, FIGH);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, FIGH); ctx.clip(); ctx.scale(K, K);
    const T2 = (x, y, s, o) => TX(x, y, s, Object.assign({}, o, { size: (o.size || 14) / K }));
    // 태양
    D.glow(70, 62, 50 + 90 * E, '#ffb300', 0.25 + 0.5 * E);
    ctx.save(); ctx.strokeStyle = 'rgba(255,200,40,' + (0.3 + 0.6 * E) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + t * 0.2, r0 = 40, r1 = 40 + 8 + 22 * E; ctx.beginPath(); ctx.moveTo(70 + Math.cos(a) * r0, 62 + Math.sin(a) * r0); ctx.lineTo(70 + Math.cos(a) * r1, 62 + Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
    D.sphere(70, 62, 30, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    // 산·땅
    const lg = ctx.createLinearGradient(0, 120, 0, 400); lg.addColorStop(0, '#8fbf6a'); lg.addColorStop(0.18, '#6e9a4b'); lg.addColorStop(0.2, '#9a7348'); lg.addColorStop(1, '#6b4b2a');
    ctx.beginPath(); ctx.moveTo(300, 400); TERR.forEach((q) => ctx.lineTo(q[0], q[1])); ctx.lineTo(800, 400); ctx.closePath(); ctx.fillStyle = lg; ctx.fill();
    ctx.strokeStyle = '#4f7a35'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); TERR.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] + 2) : ctx.moveTo(q[0], q[1] + 2))); ctx.stroke();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(619, 142); ctx.lineTo(650, 124); ctx.lineTo(681, 142); ctx.lineTo(666, 150); ctx.lineTo(652, 141); ctx.lineTo(638, 151); ctx.closePath(); ctx.fill();
    // 지하수 띠
    ctx.save(); ctx.beginPath(); ctx.moveTo(300, 400); TERR.forEach((q) => ctx.lineTo(q[0], q[1])); ctx.lineTo(800, 400); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(56,130,246,.42)'; ctx.fillRect(300, 318, 500, 34);
    ctx.fillStyle = 'rgba(147,197,253,.9)'; for (let x = 800 - ((t * 18) % 40); x > 300; x -= 40) { ctx.beginPath(); ctx.moveTo(x, 335); ctx.lineTo(x + 9, 335); ctx.lineTo(x + 5, 331); ctx.moveTo(x + 9, 335); ctx.lineTo(x + 5, 339); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    T2(740, 345, '지하수', { size: 13, color: '#dbeafe', weight: 800 });
    // 강
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); let first = true; TERR.filter((q) => q[0] <= 600).forEach((q) => { first ? ctx.moveTo(q[0], q[1] - 1) : ctx.lineTo(q[0], q[1] - 1); first = false; }); ctx.stroke();
    // 나무와 뿌리
    TREES.forEach((x) => {
      const y = terrY(x);
      ctx.strokeStyle = 'rgba(120,80,40,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, 320); ctx.moveTo(x, y + 10); ctx.lineTo(x + 8, 316); ctx.stroke();
      ctx.fillStyle = '#7c4a21'; ctx.fillRect(x - 3, y - 20, 6, 22);
      D.sphere(x, y - 32, 17, '#22a45a', { gloss: false }); D.sphere(x - 9, y - 24, 11, '#2fbf6a', { gloss: false }); D.sphere(x + 9, y - 25, 11, '#1e9650', { gloss: false });
    });
    // 바다
    const og = ctx.createLinearGradient(0, 270, 0, 400); og.addColorStop(0, '#47b0ff'); og.addColorStop(1, '#0b3d91');
    ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(0, 270);
    for (let x = 0; x <= 302; x += 6) ctx.lineTo(x, 270 + Math.sin(x * 0.07 + t * 2) * 2.5);
    ctx.lineTo(302, 400); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = 0; x <= 302; x += 6) { const y = 270 + Math.sin(x * 0.07 + t * 2) * 2.5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    // 구름
    const nc = WATER.cnt.cloud, cs = Math.min(1.6, 0.7 + nc * 0.04), gray = Math.min(1, nc / 26);
    S.cloudS = SciSim.approach(S.cloudS || cs, cs, dt || 0.016, 3);
    const cc = SciSim.color.mix('#ffffff', '#9aa6b8', gray * 0.8);
    ctx.fillStyle = cc; [[-70, 4, 24], [-42, -10, 30], [-6, -18, 34], [34, -8, 30], [66, 4, 24], [0, 8, 30], [-34, 10, 24], [34, 12, 24]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(475 + dx * S.cloudS, 96 + dy * S.cloudS, r * S.cloudS, 0, 6.3); ctx.fill(); });
    // 입자
    WATER.ps.forEach((p) => {
      if (p.st === 'rise') { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = 'rgba(70,140,230,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, 6.3); ctx.fill(); ctx.stroke(); }
      else if (p.st === 'cloud') { ctx.fillStyle = 'rgba(80,140,230,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.3); ctx.fill(); }
      else if (p.st === 'rain') { ctx.strokeStyle = '#2f7be8'; ctx.lineWidth = 2; ctx.beginPath(); const dx = (p.tx - p.sx), dy = (p.ty - p.sy), L = Math.hypot(dx, dy) || 1; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dx / L * 8, p.y - dy / L * 8); ctx.stroke(); }
      else if (p.st === 'run') { ctx.fillStyle = '#0e63c9'; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 2.8, 0, 6.3); ctx.fill(); }
      else if (p.st === 'inf' || p.st === 'ground') { ctx.fillStyle = '#bfdbfe'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 6.3); ctx.fill(); }
      else if (p.st === 'up') { ctx.fillStyle = '#5eead4'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 6.3); ctx.fill(); }
    });
    // 태양 에너지 화살표
    if (E > 0.03) { D.arrow(112, 100, 205, 248, { color: 'rgba(255,190,30,' + (0.4 + 0.5 * E) + ')', width: 3 + 9 * E, head: 12 + 10 * E }); }
    // 추적 물방울
    const tp = S.tr;
    if (!label && tp && (tp.tr || (S.clock - (tp.trDoneAt || -9)) < 2.5)) {
      ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); tp.trail.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      if (tp.st !== 'sea' || tp.tr || true) {
        D.glow(tp.x, tp.y, 20, '#fde047', 0.9); ctx.fillStyle = '#2563eb'; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tp.x, tp.y, 6.5, 0, 6.3); ctx.fill(); ctx.stroke();
        const txt = tp.tr ? STAGE_TXT[{ sea: 0, rise: 1, up: 1, cloud: 2, rain: 3, run: 4, inf: 4, ground: 4 }[tp.st]] : '바다에 돌아왔어요! 한 바퀴 완료';
        const bx = clamp(tp.x, 150, 650), by = tp.y < 70 ? tp.y + 34 : tp.y - 26;
        D.label(bx, by, txt, { bg: '#1e293b', size: 13 / K });
      }
    }
    // 이름 붙이기: 번호표 + 설명
    if (label) {
      W_MARK.forEach((m, i) => numDot(m[0], m[1], i + 1, 1 / K));
    } else {
      T2(70, 118, '태양 에너지', { size: 13.5, color: '#92400e', weight: 800 });
      T2(150, 392, '수권(바다)', { size: 14, color: '#e0f2fe', weight: 800 });
      T2(560, 392, '지권(땅)', { size: 14, color: '#fde68a', weight: 800 });
      T2(640, 96, '기권', { size: 15, color: '#1e3a8a', weight: 800 });
      T2(405, 190, '생물권', { size: 13, color: '#14532d', weight: 800, stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    }
    ctx.restore();
    // 아래 패널
    const py = FIGH; ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, py, VW, VH - py);
    if (label) drawWaterLabels(t); else drawWaterPanel(t, py);
  }
  function drawWaterPanel(t, py) {
    const tp = S.tr, stg = ['증발', '응결', '강수', '유출', '바다로'];
    const done = S.trDone, rowY = py + (PHONE ? 38 : 34);
    TX(PHONE ? 300 : 24, rowY - 8, tp ? '💧 물방울의 여행 경로' : '💧 \'물방울 하나 따라가기\'를 눌러 보세요', { size: 15, color: '#1e293b', weight: 800, align: PHONE ? 'center' : 'left' });
    const w = PHONE ? 100 : 118, gap = PHONE ? 8 : 10, x0 = PHONE ? 300 - (5 * w + 4 * gap) / 2 : 24;
    stg.forEach((s, i) => {
      const idx = i + 1, seen = tp && (i === 4 ? done : S.trSeen.has(idx)), now = tp && tp.tr && ({ sea: 0, rise: 1, up: 1, cloud: 2, rain: 3, run: 4, inf: 4, ground: 4 }[tp.st] === idx);
      const x = x0 + i * (w + gap);
      ctx.fillStyle = now ? '#2563eb' : seen ? '#14a058' : '#fff'; ctx.strokeStyle = seen || now ? 'transparent' : '#94a3b8'; ctx.lineWidth = 2;
      rr(x, rowY + 6, w, 40, 12).fill(); if (!seen && !now) rr(x, rowY + 6, w, 40, 12).stroke();
      TX(x + w / 2, rowY + 32, s, { size: 15, color: seen || now ? '#fff' : '#64748b', weight: 800 });
      if (i < 4) TX(x + w + gap / 2, rowY + 31, '›', { size: 20, color: '#94a3b8', weight: 800 });
    });
    // 증발·강수·유출 비율 막대
    const by = rowY + (PHONE ? 90 : 70);
    TX(PHONE ? 300 : 24, by - 6, '1초 동안 이동한 물방울 수 (최근 5초 평균)', { size: 13.5, color: '#475569', weight: 800, align: PHONE ? 'center' : 'left' });
    const bars = [['증발', evRate(), '#38bdf8'], ['강수', prRate(), '#2563eb'], ['유출', roRate(), '#0e7490']];
    const bw = PHONE ? 250 : 110, bx0 = PHONE ? 100 : 24;
    bars.forEach(([n, v, c], i) => {
      const x = PHONE ? bx0 : bx0 + i * 250, y = PHONE ? by + 14 + i * 40 : by + 10;
      TX(x, y + 15, n, { size: 14, color: '#1e293b', weight: 800, align: 'left' });
      ctx.fillStyle = '#dbe3ee'; rr(x + 44, y, bw, 20, 10).fill();
      ctx.fillStyle = c; rr(x + 44, y, Math.max(6, Math.min(bw, bw * v / 8)), 20, 10).fill();
      TX(x + 44 + bw + 8, y + 15, v.toFixed(1) + ' 개/초', { size: 13.5, color: '#334155', weight: 800, align: 'left' });
    });
    if (PHONE) {
      const y = by + 150; TX(300, y, '에너지 ↑ → 증발 ↑ → 구름 ↑ → 강수 ↑ → 유출 ↑', { size: 14, color: '#0f766e', weight: 800 });
      TX(300, y + 30, '물은 사라지지 않고 권역 사이를 돌고 돌아요', { size: 14, color: '#475569', weight: 700 });
      TX(300, y + 70, '바다 ' + WATER.cnt.sea + ' · 공기 ' + WATER.cnt.air + ' · 땅 ' + WATER.cnt.land + ' (물방울 150개 중)', { size: 14, color: '#475569', weight: 700 });
    } else {
      TX(24, py + 152, '에너지 ↑ → 증발 ↑ → 구름 ↑ → 강수 ↑ → 유출 ↑  (물은 사라지지 않고 돌고 돌아요)', { size: 13.5, color: '#0f766e', weight: 800, align: 'left' });
    }
  }
  function drawWaterLabels(t) {
    const B = boards.water, py = FIGH;
    TX(PHONE ? 300 : VW / 2, py + (PHONE ? 30 : 24), '그림의 번호에 이름표를 놓아요', { size: 15, color: '#1e293b', weight: 800 });
    B.slots.forEach((s) => {
      const filled = s.items.length > 0, c = s.items[0], right = filled && c.ans === s.idx, hit = B.drag && B.slotAt(B.drag.c) === s;
      ctx.fillStyle = hit ? '#e0eaff' : '#fff'; ctx.strokeStyle = hit ? '#3867f4' : S.wOK > 0.5 ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2; ctx.setLineDash(filled || hit ? [] : [6, 5]);
      rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(s.x - s.w / 2 + 18, s.y - s.h / 2 + 22, 13, 0, 6.3); ctx.fill();
      TX(s.x - s.w / 2 + 18, s.y - s.h / 2 + 28, String(s.idx + 1), { size: 15, color: '#fff', weight: 800 });
      if (!filled) TX(s.x + (PHONE ? -50 : 8), s.y - s.h / 2 + 29, '이름표', { size: 14, color: '#94a3b8', weight: 700 });
      if (S.wOK > 0.3 && right) { ctx.globalAlpha = S.wOK; para(s.x, s.y + s.h / 2 - (PHONE ? 22 : 24), W_INFO[s.idx], s.w - 10, 12.5, { color: '#0f766e', weight: 800 }); ctx.globalAlpha = 1; }
    });
    B.items.forEach((c) => { if (!c.free) drawCard(c); }); B.items.forEach((c) => { if (c.free) drawCard(c); });
  }

  /* ======================================================
     화면 2: 탄소의 순환 (저장고 · 이동 경로 · 화석 연료)
     ====================================================== */
  const KC = PHONE ? VW / 560 : 1;
  const CFIGH = 540 * KC;
  const C0 = { A: 880, V: 550, S: 1500, O: 38000 };
  const CK = { kL: 0.0071, kO: 0.0089 };
  function carbonStep(st, Ff, dt) {
    const dl = (st.A - 600) - 6 * ((st.V - C0.V) + (st.S - C0.S)), dO = (st.A - 600) - 6 * (st.O - C0.O);
    const f = { photo: Math.max(0, 120 + CK.kL * dl), resp: 60, litter: 60, decomp: 60, fossil: Ff, a2o: Math.max(0, 90 + CK.kO * dO), o2a: 90 };
    const dA = -f.photo + f.resp + f.decomp - f.a2o + f.o2a + f.fossil;
    st.A += dA * dt; st.V += (f.photo - f.resp - f.litter) * dt; st.S += (f.litter - f.decomp) * dt; st.O += (f.a2o - f.o2a) * dt;
    return { f, dA };
  }
  const CBOX = {
    A: { x: 280, y: 74, w: 240, h: 84, name: '대기', sph: 'atm' }, V: { x: 105, y: 252, w: 170, h: 104, name: '식물', sph: 'bio' },
    S: { x: 105, y: 432, w: 170, h: 92, name: '토양', sph: 'geo' }, O: { x: 458, y: 300, w: 190, h: 206, name: '해양', sph: 'hyd' },
    F: { x: 330, y: 492, w: 210, h: 58, name: '화석 연료', sph: 'geo' },
  };
  const CPATH = {
    photo: { a: [205, 118], c: [190, 160], b: [150, 200], col: '#16a34a', lab: [186, 160] },
    resp: { a: [60, 200], c: [66, 140], b: [168, 114], col: '#65a30d', lab: [91, 148] },
    litter: { a: [105, 304], c: [105, 344], b: [105, 384], col: '#92400e', lab: [105, 346] },
    decomp: { a: [190, 410], c: [268, 310], b: [238, 118], col: '#92400e', lab: [250, 270] },
    fossil: { a: [330, 462], c: [330, 290], b: [330, 118], col: '#111827', lab: [330, 310] },
    a2o: { a: [372, 116], c: [404, 152], b: [432, 198], col: '#2563eb', lab: [384, 162] },
    o2a: { a: [500, 198], c: [500, 130], b: [398, 98], col: '#38bdf8', lab: [474, 140] },
  };
  Object.values(CPATH).forEach((p) => { let L = 0, px = p.a[0], py = p.a[1]; for (let i = 1; i <= 20; i++) { const u = i / 20, x = (1 - u) * (1 - u) * p.a[0] + 2 * (1 - u) * u * p.c[0] + u * u * p.b[0], y = (1 - u) * (1 - u) * p.a[1] + 2 * (1 - u) * u * p.c[1] + u * u * p.b[1]; L += Math.hypot(x - px, y - py); px = x; py = y; } p.len = L; p.acc = Math.random(); p.ps = []; });
  const bez = (p, u) => ({ x: (1 - u) * (1 - u) * p.a[0] + 2 * (1 - u) * u * p.c[0] + u * u * p.b[0], y: (1 - u) * (1 - u) * p.a[1] + 2 * (1 - u) * u * p.c[1] + u * u * p.b[1] });
  const C_TAGS = ['광합성', '호흡', '해수 용해', '연소'];
  const C_INFO = ['기권 → 생물권(식물)', '생물권 → 기권', '기권 ↔ 수권(해양)', '지권(화석 연료) → 기권'];
  const C_KEY = ['photo', 'resp', 'a2o', 'fossil'];
  function initCarbonBoard() {
    const B = boards.carbon; B.reset(); S.cOK = 0;
    for (let i = 0; i < 4; i++) {
      const sp = PHONE ? { x: 150 + (i % 2) * 300, y: 664 + Math.floor(i / 2) * 78 } : { x: 680, y: 84 + i * 72 };
      B.addSlot({ x: sp.x, y: sp.y, w: PHONE ? 286 : 208, h: PHONE ? 70 : 66, idx: i, ix: PHONE ? -50 : 28, iy: -10 });
    }
    [3, 1, 0, 2].forEach((ti, j) => {
      const tp = PHONE ? { x: 78 + j * 148, y: 812 } : { x: 618 + (j % 2) * 128, y: 400 + Math.floor(j / 2) * 52 };
      B.addItem({ label: C_TAGS[ti], ans: ti, hx: tp.x, hy: tp.y, w: PHONE ? 130 : 112, h: 36, size: 15.5, fill: '#fff', stroke: '#64748b' });
    });
  }
  function resetCarbon() {
    Object.assign(S, { yr: 2025, A: C0.A, V: C0.V, Sg: C0.S, O: C0.O, cHist: [], A0: C0.A, maxFossil: S.fossil });
    S.cst = { A: C0.A, V: C0.V, S: C0.S, O: C0.O };
    Object.values(CPATH).forEach((p) => { p.ps = []; });
    const r = carbonStep({ ...S.cst }, S.fossil, 0); S.flux = r.f; S.dA = r.dA;
    S.cHist.push([2025, S.cst.A]);
  }
  function stepCarbon(dt) {
    if (S.run && S.yr < 2100) {
      const years = dt * 2, n = Math.max(1, Math.ceil(years / 0.1)), h = years / n;
      for (let i = 0; i < n; i++) { const r = carbonStep(S.cst, S.fossil, h); S.flux = r.f; S.dA = r.dA; }
      const prev = S.yr; S.yr = Math.min(2100, S.yr + years);
      if (Math.floor(S.yr * 2) !== Math.floor(prev * 2)) S.cHist.push([S.yr, S.cst.A]);
      if (S.yr >= 2100) S.run = false;
      S.maxFossil = Math.max(S.maxFossil, S.fossil);
    } else { const r = carbonStep({ ...S.cst }, S.fossil, 0); S.flux = r.f; S.dA = r.dA; }
    S.A = S.cst.A; S.V = S.cst.V; S.Sg = S.cst.S; S.O = S.cst.O;
    // 입자 흐름
    Object.keys(CPATH).forEach((k) => {
      const p = CPATH[k], rate = (S.flux[k] || 0) * 0.06 * (S.run ? 1 : 0.0);
      p.acc += rate * dt; while (p.acc >= 1) { p.acc -= 1; p.ps.push({ u: 0 }); }
      p.ps.forEach((q) => { q.u += dt * 80 / p.len; }); p.ps = p.ps.filter((q) => q.u < 1);
    });
  }
  function cText(x, y, s, o) { return TX(x, y, s, Object.assign({}, o, { size: (o.size || 14) / KC })); }
  function drawCarbonBox(k) {
    const b = CBOX[k], col = SPH[b.sph].col; const x = b.x - b.w / 2, y = b.y - b.h / 2;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, b.w, b.h, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(30,45,80,.28)' });
    ctx.strokeStyle = col; ctx.lineWidth = 3; rr(x, y, b.w, b.h, 14).stroke();
    ctx.restore();
    ctx.save(); rr(x + 3, y + 3, b.w - 6, b.h - 6, 12).clip();
    const t = S.clock;
    if (k === 'A') { ctx.fillStyle = '#e0f2fe'; ctx.fillRect(x, y, b.w, b.h); const n = Math.round(10 + (S.A - 880) / 6); for (let i = 0; i < Math.max(4, Math.min(60, n)); i++) { const px = x + 14 + ((i * 37) % (b.w - 28)), py = y + 36 + ((i * 53) % (b.h - 46)) + Math.sin(t * 1.4 + i) * 2; ctx.fillStyle = 'rgba(55,65,81,.55)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 6.3); ctx.fill(); } }
    else if (k === 'V') { ctx.fillStyle = '#dcfce7'; ctx.fillRect(x, y, b.w, b.h); [[-40, 12, 22], [0, 4, 26], [40, 14, 20]].forEach(([dx, dy, r]) => { ctx.fillStyle = '#7c4a21'; ctx.fillRect(b.x + dx - 3, b.y + dy + 6, 6, 24); D.sphere(b.x + dx, b.y + dy, r, '#22a45a', { gloss: false }); }); }
    else if (k === 'S') { const g = ctx.createLinearGradient(0, y, 0, y + b.h); g.addColorStop(0, '#a16207'); g.addColorStop(1, '#5b3a1a'); ctx.fillStyle = g; ctx.fillRect(x, y, b.w, b.h); ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x + 12 + (i * 29) % (b.w - 20), y + 30 + (i * 17) % (b.h - 36), 3, 0, 6.3); ctx.fill(); } }
    else if (k === 'O') { const g = ctx.createLinearGradient(0, y, 0, y + b.h); g.addColorStop(0, '#60b8ff'); g.addColorStop(1, '#0b3d91'); ctx.fillStyle = g; ctx.fillRect(x, y, b.w, b.h); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= b.w; i += 6) { const yy = y + 52 + Math.sin(i * 0.08 + t * 2) * 3; i ? ctx.lineTo(x + i, yy) : ctx.moveTo(x + i, yy); } ctx.stroke(); }
    else { ctx.fillStyle = '#374151'; ctx.fillRect(x, y, b.w, b.h); ctx.fillStyle = '#111827'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + 20 + i * 34, y + b.h - 10, 14, Math.PI, 0); ctx.fill(); } }
    ctx.restore();
    const dark = k === 'F' || k === 'O' || k === 'S';
    cText(b.x, y + 24, b.name, { size: 17, color: dark ? '#fff' : '#1b2333', weight: 800, stroke: dark ? 'rgba(0,0,0,.35)' : null, strokeWidth: 3 });
    const val = k === 'A' ? S.A : k === 'V' ? S.V : k === 'S' ? S.Sg : k === 'O' ? S.O : null;
    if (val != null) {
      const d = val - C0[k], num = Math.round(val).toLocaleString('ko-KR');
      cText(b.x, b.y + (k === 'A' ? 14 : k === 'O' ? 20 : k === 'V' ? 26 : 32), num + ' GtC', { size: 16, color: dark ? '#fff' : '#0f172a', weight: 800, stroke: dark ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.8)', strokeWidth: 3 });
      if (Math.abs(d) >= 0.5) cText(b.x, b.y + (k === 'A' ? 14 : k === 'O' ? 20 : k === 'V' ? 26 : 32) + 19, (d > 0 ? '+' : '−') + Math.abs(Math.round(d)), { size: 14, color: d > 0 ? '#fca5a5' : '#86efac', weight: 800, stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    } else cText(b.x, b.y + 10, S.fossil.toFixed(1) + ' GtC/년 사용', { size: 15, color: '#fde68a', weight: 800 });
  }
  function drawCarbonArrow(k, label, o) {
    const p = CPATH[k], fl = S.flux[k] || 0, w = Math.max(1.6, 1.4 + 0.5 * Math.sqrt(fl));
    ctx.save(); ctx.strokeStyle = p.col; ctx.fillStyle = p.col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(p.a[0], p.a[1]); ctx.quadraticCurveTo(p.c[0], p.c[1], p.b[0], p.b[1]); ctx.stroke();
    const e = bez(p, 0.96), dx = p.b[0] - e.x, dy = p.b[1] - e.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = 9 + w;
    ctx.beginPath(); ctx.moveTo(p.b[0] + ux * 3, p.b[1] + uy * 3); ctx.lineTo(p.b[0] - ux * hs - uy * hs * 0.55, p.b[1] - uy * hs + ux * hs * 0.55); ctx.lineTo(p.b[0] - ux * hs + uy * hs * 0.55, p.b[1] - uy * hs - ux * hs * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
    p.ps.forEach((q) => { const c = bez(p, q.u); D.sphere(c.x, c.y, 4.2 + (k === 'fossil' ? 1 : 0), k === 'fossil' ? '#111827' : '#4b5563', { gloss: false, outline: '#fff', outlineWidth: 1 }); });
  }
  function drawCarbonTag(k, label) {
    const p = CPATH[k];
    if (label) D.label(p.lab[0] + (k === 'fossil' ? -20 : 0), p.lab[1], label, { bg: '#fff', color: '#334155', size: 13 / KC, border: p.col });
  }
  function drawCarbon(t, dt) {
    const label = S.csub === 'label';
    ctx.fillStyle = '#eaf3fb'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.scale(KC, KC);
    const FW = 560, FHh = 540;
    ctx.fillStyle = '#f3f8fd'; ctx.fillRect(0, 0, FW, FHh);
    const tags = [];
    Object.keys(CPATH).forEach((k) => {
      let lab = null, o = null;
      if (!label) lab = { photo: '광합성 ' + Math.round(S.flux.photo || 0), resp: '호흡 ' + Math.round(S.flux.resp || 0), litter: '낙엽 60', decomp: '분해 60', fossil: '연소 ' + S.fossil.toFixed(1), a2o: '해수 용해 ' + Math.round(S.flux.a2o || 0), o2a: '방출 90' }[k];
      else lab = { litter: '낙엽', decomp: '분해', o2a: '방출' }[k];
      if (label && k === 'fossil') lab = '화석 연료 사용';
      drawCarbonArrow(k, lab, o); tags.push([k, lab]);
    });
    Object.keys(CBOX).forEach(drawCarbonBox);
    tags.forEach(([k, lab]) => drawCarbonTag(k, lab));
    // 대기 쌓임
    D.label(CBOX.A.x, 12, '대기에 쌓이는 양 ' + (S.dA >= 0 ? '+' : '−') + Math.abs(S.dA).toFixed(1) + ' GtC/년', { bg: S.dA > 0.2 ? '#dc2626' : S.dA < -0.2 ? '#16a34a' : '#64748b', size: 13.5 / KC });
    cText(280, 530, '※ 숫자는 저장량(GtC)과 이동량(GtC/년)이에요. 그림의 크기는 실제 비율이 아니에요', { size: 12.5, color: '#64748b', weight: 700 });
    if (label) C_KEY.forEach((k, i) => { const p = CPATH[k]; numDot(p.lab[0], p.lab[1] + (k === 'fossil' ? 64 : 0), i + 1, 1 / KC); });
    ctx.restore();
    if (label) drawCarbonLabels(t); else drawCarbonChart(t);
  }
  function drawCarbonLabels(t) {
    const B = boards.carbon, ox = PHONE ? 0 : 572;
    if (!PHONE) { ctx.fillStyle = '#eef3fb'; ctx.fillRect(560, 0, 240, VH); }
    else { ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, CFIGH, VW, VH - CFIGH); }
    TX(PHONE ? 300 : 680, PHONE ? CFIGH + 32 : 28, '번호에 이름표를 놓아요', { size: 15, color: '#1e293b', weight: 800 });
    B.slots.forEach((s) => {
      const filled = s.items.length > 0, c = s.items[0], right = filled && c.ans === s.idx, hit = B.drag && B.slotAt(B.drag.c) === s;
      ctx.fillStyle = hit ? '#e0eaff' : '#fff'; ctx.strokeStyle = hit ? '#3867f4' : S.cOK > 0.5 ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2; ctx.setLineDash(filled || hit ? [] : [6, 5]);
      rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(s.x - s.w / 2 + 18, s.y - s.h / 2 + 22, 13, 0, 6.3); ctx.fill();
      TX(s.x - s.w / 2 + 18, s.y - s.h / 2 + 28, String(s.idx + 1), { size: 15, color: '#fff', weight: 800 });
      if (!filled) TX(s.x + (PHONE ? -50 : 28), s.y - s.h / 2 + 29, '이름표', { size: 14, color: '#94a3b8', weight: 700 });
      if (S.cOK > 0.3 && right) { ctx.globalAlpha = S.cOK; para(s.x, s.y + s.h / 2 - 14, C_INFO[s.idx], s.w - 10, 12.5, { color: '#0f766e', weight: 800 }); ctx.globalAlpha = 1; }
    });
    B.items.forEach((c) => { if (!c.free) drawCard(c); }); B.items.forEach((c) => { if (c.free) drawCard(c); });
  }
  function drawCarbonChart(t) {
    const R = PHONE ? { x: 24, y: CFIGH + 36, w: 552, h: 112 } : { x: 584, y: 36, w: 196, h: 216 };
    if (!PHONE) { ctx.fillStyle = '#eef3fb'; ctx.fillRect(560, 0, 240, VH); } else { ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, CFIGH, VW, VH - CFIGH); }
    TX(R.x + R.w / 2, R.y - 12, '대기 중 탄소 (GtC)', { size: 14.5, color: '#1e293b', weight: 800 });
    const ymin = 800, ymax = 1400, px = (y) => R.x + 36 + (y - 2025) / 75 * (R.w - 44), py = (v) => R.y + R.h - 22 - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin) * (R.h - 30);
    ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 10).fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b';
    [800, 1000, 1200, 1400].forEach((v) => { ctx.beginPath(); ctx.moveTo(px(2025), py(v)); ctx.lineTo(px(2100), py(v)); ctx.stroke(); TX(R.x + 32, py(v) + 4, String(v), { size: 12, color: '#64748b', weight: 700, align: 'right' }); });
    [2025, 2050, 2075, 2100].forEach((y) => TX(px(y), R.y + R.h - 6, String(y), { size: 12, color: '#64748b', weight: 700 }));
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); S.cHist.forEach((q, i) => (i ? ctx.lineTo(px(q[0]), py(q[1])) : ctx.moveTo(px(q[0]), py(q[1])))); ctx.lineTo(px(S.yr), py(S.A)); ctx.stroke();
    D.sphere(px(S.yr), py(S.A), 5, '#dc2626', { gloss: false, outline: '#fff' });
    const sy = PHONE ? R.y + R.h + 28 : R.y + R.h + 34;
    const rows = [['연도', Math.floor(S.yr) + '년'], ['대기 탄소', Math.round(S.A) + ' GtC'], ['CO₂ 농도', Math.round(S.A / 2.13) + ' ppm'], ['대기에 쌓임', (S.dA >= 0 ? '+' : '−') + Math.abs(S.dA).toFixed(1) + ' GtC/년'], ['해양이 흡수', ((S.flux.a2o || 90) - 90).toFixed(1) + ' GtC/년'], ['식물이 흡수', ((S.flux.photo || 120) - 120).toFixed(1) + ' GtC/년']];
    if (PHONE) rows.forEach((r, i) => { const x = 40 + (i % 2) * 280, y = sy + Math.floor(i / 2) * 33; TX(x, y, r[0], { size: 14, color: '#475569', weight: 700, align: 'left' }); TX(x + 250, y, r[1], { size: 15, color: '#0f172a', weight: 800, align: 'right' }); });
    else rows.forEach((r, i) => { const y = sy + i * 36; TX(R.x, y, r[0], { size: 13.5, color: '#475569', weight: 700, align: 'left' }); TX(R.x + R.w, y + 15, r[1], { size: 15, color: '#0f172a', weight: 800, align: 'right' }); });
    if (!PHONE) { TX(R.x + R.w / 2, 560 - 14, S.run ? '▶ 흐르는 중' : S.yr >= 2100 ? '2100년에 멈췄어요' : '⏸ 멈춤', { size: 13.5, color: '#64748b', weight: 800 }); }
  }

  /* ======================================================
     화면 3: 연쇄 현상 (사례 4개와 분석표)
     ====================================================== */
  const CASES = [
    { name: '피나투보 화산', tab: '🌋 피나투보 화산', year: '1991년', ans: [1, 2],
      nodes: [{ s: 'geo', t: '화산 분출: 화산 가스·화산재가 나와요' }, { s: 'atm', t: '이산화 황이 성층권에서 에어로졸이 돼요' }, { s: 'all', t: '햇빛이 줄어 지구 평균 기온이 약 0.5 °C 내려가요 (1~2년)' }],
      note: '화산 가스(물질)가 기권으로 올라가 햇빛(에너지)을 가려요.' },
    { name: '엘니뇨', tab: '🌊 엘니뇨', year: '', ans: [2, 1],
      nodes: [{ s: 'hyd', t: '동태평양의 바닷물 온도가 올라가요' }, { s: 'atm', t: '무역풍이 약해지고 이상 기후가 나타나요' }, { s: 'bio', t: '찬 심층수의 용승이 약해져 어획량이 줄어요' }],
      note: '바다의 열(에너지)이 대기를 바꾸고, 영양염(물질) 공급이 줄어 생물에 영향을 줘요.' },
    { name: '빙하 감소', tab: '🧊 빙하 감소', year: '', ans: [1, 2],
      nodes: [{ s: 'geo', t: '화석 연료를 태워 탄소가 나와요' }, { s: 'atm', t: '온실가스(CO₂)가 늘어 기온이 올라가요' }, { s: 'hyd', t: '빙하가 녹아 해수면이 올라가요' }],
      note: '탄소(물질)가 기권으로 가고, 더 많은 열(에너지)이 빙하를 녹여요.' },
    { name: '산호 백화', tab: '🪸 산호 백화', year: '', ans: [2, 2],
      nodes: [{ s: 'atm', t: '온실가스가 늘어 기온이 올라가요' }, { s: 'hyd', t: '바닷물의 온도가 올라가요' }, { s: 'bio', t: '산호가 하얗게 변하는 백화가 일어나요' }],
      note: '열(에너지)이 대기에서 바다로, 다시 산호에게 전해져요.' },
  ];
  const FLOWN = ['?', '물질', '에너지'];
  function CG() {
    return PHONE ? {
      tabs: [0, 1, 2, 3].map((i) => ({ x: 150 + (i % 2) * 300, y: 36 + Math.floor(i / 2) * 54, w: 284, h: 46 })),
      vg: { x: 12, y: 130, w: 576, h: 250 }, nodes: [0, 1, 2].map((i) => ({ x: 12, y: 388 + i * 64, w: 576, h: 52 })),
      tab: { x: 12, y: 580, hdr: 30, rh: 46, cw: [122, 226, 226] },
    } : {
      tabs: [0, 1, 2, 3].map((i) => ({ x: 108 + i * 194, y: 32, w: 184, h: 44 })),
      vg: { x: 14, y: 62, w: 440, h: 318 }, nodes: [0, 1, 2].map((i) => ({ x: 470, y: 62 + i * 108, w: 316, h: 90 })),
      tab: { x: 14, y: 386, hdr: 24, rh: 31, cw: [140, 316, 316] },
    };
  }
  let cgeo = CG();
  const smooth = (x, a, b) => sm(x, a, b);
  function vgFrame(r, top, bot) {
    ctx.save(); rr(r.x, r.y, r.w, r.h, 14).clip();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  function vgPin(r, u, t) {
    const s = Math.min(r.w / 440, r.h / 318), X = (l) => r.x + l * r.w, Y = (l) => r.y + l * r.h;
    vgFrame(r, '#7fc2ff', '#d4ecff');
    const sp = smooth(u, 0.35, 0.78), a = smooth(u, 0.3, 0.7) * 0.62;
    // 성층권 에어로졸 띠
    const bx0 = X(0.2), bx1 = X(0.2 + 0.78 * sp), by0 = Y(0.13), by1 = Y(0.25);
    ctx.fillStyle = 'rgba(110,84,56,' + a + ')'; ctx.fillRect(bx0, by0, Math.max(0, bx1 - bx0), by1 - by0);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r.x, by0); ctx.lineTo(r.x + r.w, by0); ctx.moveTo(r.x, by1); ctx.lineTo(r.x + r.w, by1); ctx.stroke(); ctx.setLineDash([]);
    TX(X(0.02), by0 - 6, '성층권', { size: 13, color: '#1e3a8a', weight: 800, align: 'left' }); TX(X(0.02), by1 + 16, '대류권', { size: 13, color: '#1e3a8a', weight: 800, align: 'left' });
    // 땅·화산
    ctx.fillStyle = '#7a5c3a'; ctx.fillRect(r.x, Y(0.86), r.w, r.h);
    ctx.fillStyle = '#5e4326'; ctx.beginPath(); ctx.moveTo(X(0.05), Y(0.86)); ctx.lineTo(X(0.17), Y(0.6)); ctx.lineTo(X(0.21), Y(0.6)); ctx.lineTo(X(0.33), Y(0.86)); ctx.closePath(); ctx.fill();
    const er = smooth(u, 0.04, 0.12) * (1 - smooth(u, 0.4, 0.6) * 0.7), top = lerpv(Y(0.6), Y(0.2), smooth(u, 0.05, 0.4));
    for (let i = 0; i < 38; i++) {
      const f = i / 38, y = lerpv(Y(0.6), top, f), x = X(0.19) + Math.sin(i * 1.7 + t * 2) * (6 + 16 * f) * s + (sp > 0.05 && f > 0.8 ? 0 : 0);
      ctx.fillStyle = 'rgba(70,60,55,' + (0.6 * er * (1 - f * 0.3)) + ')'; ctx.beginPath(); ctx.arc(x, y, (4 + 11 * f) * s, 0, 6.3); ctx.fill();
    }
    if (er > 0.1) { D.glow(X(0.19), Y(0.6), 26 * s, '#fb923c', 0.8 * er); }
    // 햇빛
    D.sphere(X(0.9), Y(0.1), 18 * s, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    for (let i = 0; i < 4; i++) {
      const x0 = X(0.68 + i * 0.07), y0 = Y(0.05), x1 = x0 - r.w * 0.2, y1 = Y(0.86);
      const midX = x0 + (x1 - x0) * ((by1 - y0) / (y1 - y0));
      const covered = midX > bx0 && midX < bx1 ? a / 0.62 : 0;
      ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      const yt = by0 - 2, xt = x0 + (x1 - x0) * ((yt - y0) / (y1 - y0));
      ctx.strokeStyle = 'rgba(255,200,40,.95)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xt, yt); ctx.stroke();
      const yb = by1 + 2, xb = x0 + (x1 - x0) * ((yb - y0) / (y1 - y0));
      ctx.lineWidth = Math.max(1.2, (5 - 3.6 * covered) * s); ctx.strokeStyle = 'rgba(255,200,40,' + (0.95 - 0.7 * covered) + ')'; ctx.beginPath(); ctx.moveTo(xb, yb); ctx.lineTo(x1, y1 - 4); ctx.stroke();
    }
    D.label(X(0.34), Y(0.48), '화산 가스·화산재 (물질)', { bg: '#78350f', size: 13, align: 'left' });
    if (a > 0.1) D.label(X(0.56), by1 + 16 + 20, '에어로졸이 햇빛(에너지)을 가려요', { bg: '#1e293b', size: 13 });
    // 기온 변화 그래프
    const gx = X(0.58), gy = Y(0.5), gw = r.w * 0.38, gh = r.h * 0.34;
    ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(gx, gy + 20, gw, gh, 10).fill();
    TX(gx + gw / 2, gy + 17, '지구 평균 기온 변화', { size: 13, color: '#1e293b', weight: 800 });
    const yr = 3 * u, py = (v) => gy + 20 + gh * 0.28 - v / 0.6 * gh * 0.5, pxx = (y) => gx + 12 + y / 3 * (gw - 22);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx + 8, py(0)); ctx.lineTo(gx + gw - 6, py(0)); ctx.stroke();
    TX(gx + 10, py(0) - 4, '0', { size: 12, color: '#64748b', weight: 700, align: 'left' }); TX(gx + gw - 6, py(0) - 4, '년 (0~3)', { size: 12, color: '#64748b', weight: 700, align: 'right' });
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 60; k++) { const y = 3 * k / 60; if (y > yr) break; const v = -0.5 * (y / 0.9) * Math.exp(1 - y / 0.9); k ? ctx.lineTo(pxx(y), py(v)) : ctx.moveTo(pxx(y), py(v)); } ctx.stroke();
    if (u > 0.3) TX(pxx(0.9) + 8, py(-0.5) + 16, '약 −0.5 °C', { size: 13, color: '#1d4ed8', weight: 800, align: 'left' });
    ctx.restore();
  }
  function lerpv(a, b, t) { return a + (b - a) * t; }
  function vgNino(r, u, t) {
    const s = Math.min(r.w / 440, r.h / 318), X = (l) => r.x + l * r.w, Y = (l) => r.y + l * r.h, b = smooth(u, 0.2, 0.65);
    vgFrame(r, '#cfe9ff', '#f1f8ff');
    // 바다
    const wTop = Y(0.34); ctx.fillStyle = '#103f8f'; ctx.fillRect(r.x, wTop, r.w, r.h);
    // 따뜻한 층 (서쪽은 두껍고, 동쪽은 평소엔 얇음)
    const thick = (l) => lerpv(0.3, 0.07 + 0.2 * b + 0.04 * (1 - b), l) * 0.9 + (l < 0.5 ? 0 : 0);
    const wg = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); wg.addColorStop(0, '#ff7a3d'); wg.addColorStop(0.5, '#ffb13d'); wg.addColorStop(1, SciSim.color.mix('#2a9fd8', '#ffb13d', b));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(r.x, wTop); ctx.lineTo(r.x + r.w, wTop);
    for (let k = 20; k >= 0; k--) { const l = k / 20; ctx.lineTo(X(l), wTop + r.h * (0.1 + thick(l) * 0.85)); } ctx.closePath(); ctx.fill();
    TX(X(0.2), wTop + 26, '따뜻한 물', { size: 13.5, color: '#fff', weight: 800 });
    TX(X(0.55), Y(0.82), '찬 심층수', { size: 13.5, color: '#bfdbfe', weight: 800 });
    // 땅
    ctx.fillStyle = '#7a5c3a'; ctx.beginPath(); ctx.moveTo(r.x, Y(0.94)); ctx.lineTo(X(0.06), Y(0.7)); ctx.lineTo(X(0.06), wTop); ctx.lineTo(r.x, wTop); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r.x + r.w, Y(1)); ctx.lineTo(X(0.93), Y(0.62)); ctx.lineTo(X(0.93), wTop - 12); ctx.lineTo(r.x + r.w, wTop - 30); ctx.fill();
        TX(X(0.5), wTop - 8, '서 ← 적도 태평양 → 동', { size: 13, color: '#1e3a8a', weight: 800 });
    // 무역풍
    const L = (1 - b * 0.82) * 130 * s + 22, wy = Y(0.2);
    for (let i = 0; i < 3; i++) { const xx = X(0.72 - i * 0.2); D.arrow(xx, wy + i * 12 - 10, xx - L * 0.8, wy + i * 12 - 10, { color: '#1d4ed8', width: 4 * s + 1, head: 11, alpha: 0.95 }); }
    D.label(X(0.5), Y(0.08), b > 0.5 ? '무역풍이 약해져요' : '무역풍이 불어요', { bg: '#1e3a8a', size: 13 });
    // 용승 (찬 물이 올라옴)
    const up = 1 - b;
    for (let i = 0; i < 3; i++) { const xx = X(0.74 + i * 0.07), yy = Y(0.86) - ((t * 30 + i * 20) % 50) * up; ctx.globalAlpha = 0.9 * up; D.arrow(xx, Y(0.88), xx, Y(0.6), { color: '#93c5fd', width: 4, head: 9, alpha: 0.9 * up }); ctx.globalAlpha = 1; }
    if (up > 0.4) D.label(X(0.78), Y(0.52), '용승(찬 물이 올라와요)', { bg: '#2563eb', size: 12.5, align: 'center' });
    // 물고기
    const nf = Math.round(1 + 5 * up);
    for (let i = 0; i < nf; i++) { const fx = X(0.7 + (i % 3) * 0.08) + Math.sin(t * 1.5 + i) * 6, fy = Y(0.46 + (i % 2) * 0.12); ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(fx, fy, 9 * s + 2, 4.5 * s + 1, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx + 8 * s, fy); ctx.lineTo(fx + 14 * s, fy - 4); ctx.lineTo(fx + 14 * s, fy + 4); ctx.fill(); }
    TX(X(0.8), Y(0.43), '물고기 ' + nf + '마리', { size: 12.5, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    ctx.restore();
  }
  function vgIce(r, u, t) {
    const s = Math.min(r.w / 440, r.h / 318), X = (l) => r.x + l * r.w, Y = (l) => r.y + l * r.h;
    vgFrame(r, SciSim.color.mix('#9fd4ff', '#e8b88a', u * 0.5), '#e8f4ff');
    // 이산화 탄소 층
    const nco = 6 + Math.round(34 * u);
    ctx.fillStyle = 'rgba(100,116,139,' + (0.12 + 0.2 * u) + ')'; ctx.fillRect(r.x, Y(0.08), r.w, Y(0.22) - Y(0.08));
    for (let i = 0; i < nco; i++) { const x = X(0.04 + ((i * 0.137) % 0.92)), y = Y(0.1) + ((i * 53) % 100) / 100 * (Y(0.2) - Y(0.1)) + Math.sin(t * 1.4 + i) * 2; D.sphere(x, y, 4.4 * s + 1, '#475569', { gloss: false }); }
    TX(X(0.02), Y(0.07), '기권: CO₂ 증가', { size: 13, color: '#1e293b', weight: 800, align: 'left' });
    // 바다와 땅
    const sea = Y(0.84 - 0.06 * u); ctx.fillStyle = '#2f7dd6'; ctx.fillRect(r.x, sea, r.w, r.h); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(r.x, sea, r.w, 2.5);
    ctx.fillStyle = '#7a8a5a'; ctx.beginPath(); ctx.moveTo(r.x, Y(0.86)); ctx.lineTo(X(0.34), Y(0.86)); ctx.lineTo(X(0.34), Y(0.7)); ctx.lineTo(r.x, Y(0.7)); ctx.fill();
    // 공장 굴뚝
    ctx.fillStyle = '#6b7280'; ctx.fillRect(X(0.07), Y(0.5), 60 * s, Y(0.7) - Y(0.5)); ctx.fillRect(X(0.07) + 38 * s, Y(0.36), 14 * s, Y(0.5) - Y(0.36));
    for (let i = 0; i < 6; i++) { const f = ((t * 0.4 + i / 6) % 1); ctx.fillStyle = 'rgba(55,65,81,' + (0.55 * (1 - f)) + ')'; ctx.beginPath(); ctx.arc(X(0.07) + 45 * s + f * 30, Y(0.36) - f * (Y(0.36) - Y(0.2)), (5 + f * 8) * s, 0, 6.3); ctx.fill(); }
    TX(X(0.1), Y(0.78), '화석 연료 연소', { size: 13, color: '#fff', weight: 800, align: 'left' });
    // 열 반사
    ctx.strokeStyle = 'rgba(239,68,68,' + (0.25 + 0.6 * u) + ')'; ctx.lineWidth = 3.2; for (let i = 0; i < 3; i++) { const x0 = X(0.4 + i * 0.07); D.arrow(x0, Y(0.62), x0 + 8, Y(0.27), { color: 'rgba(239,68,68,' + (0.3 + 0.6 * u) + ')', width: 3, head: 9 }); D.arrow(x0 + 20, Y(0.25), x0 + 26, Y(0.5), { color: 'rgba(249,115,22,' + (0.15 + 0.6 * u) + ')', width: 3, head: 9 }); }
    // 온도계
    const tx = X(0.56), ty = Y(0.3), th = Y(0.7) - Y(0.3);
    ctx.fillStyle = '#fff'; rr(tx - 8 * s - 2, ty, 16 * s + 4, th, 9).fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(tx - 8 * s - 2, ty, 16 * s + 4, th, 9).stroke();
    ctx.fillStyle = '#ef4444'; const lv = 0.3 + 0.62 * u; rr(tx - 5 * s, ty + th * (1 - lv), 10 * s, th * lv - 3, 5).fill();
    // 산과 빙하
    ctx.fillStyle = '#7b8794'; ctx.beginPath(); ctx.moveTo(X(0.6), sea); ctx.lineTo(X(0.78), Y(0.34)); ctx.lineTo(X(0.97), sea); ctx.closePath(); ctx.fill();
    const g = 1 - 0.7 * u; ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(X(0.78), Y(0.34)); ctx.lineTo(X(0.78 - 0.1 * g), Y(0.34 + 0.2 * g)); ctx.lineTo(X(0.78 - 0.04 * g), Y(0.34 + 0.18 * g + 0.04)); ctx.lineTo(X(0.78 + 0.02 * g), Y(0.34 + 0.24 * g)); ctx.lineTo(X(0.78 + 0.09 * g), Y(0.34 + 0.2 * g)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 3 * s + 1; ctx.globalAlpha = Math.min(1, u * 2); ctx.beginPath(); ctx.moveTo(X(0.72), Y(0.34 + 0.18 * g)); ctx.quadraticCurveTo(X(0.66), Y(0.6), X(0.64), sea); ctx.stroke(); ctx.globalAlpha = 1;
    D.label(X(0.78), Y(0.3), '빙하 ' + Math.round(100 * g) + ' %', { bg: '#0369a1', size: 13 });
    D.label(X(0.86), sea + 22, '해수면 +' + (0.9 * u).toFixed(1) + ' m', { bg: '#1e3a8a', size: 12.5 });
    ctx.restore();
  }
  function vgCoral(r, u, t) {
    const s = Math.min(r.w / 440, r.h / 318), X = (l) => r.x + l * r.w, Y = (l) => r.y + l * r.h, w = smooth(u, 0.3, 0.85);
    vgFrame(r, SciSim.color.mix('#3ec1e8', '#d8a05a', u * 0.45), SciSim.color.mix('#0b4f99', '#4a3a20', u * 0.3));
    D.glow(X(0.1), Y(0.08), 70 * s, '#ffb300', 0.5); D.sphere(X(0.1), Y(0.08), 20 * s, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    // 모래
    ctx.fillStyle = '#d9c28a'; ctx.beginPath(); ctx.moveTo(r.x, Y(0.9)); for (let i = 0; i <= 20; i++) ctx.lineTo(X(i / 20), Y(0.88 + Math.sin(i * 1.3) * 0.02)); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h); ctx.fill();
    // 산호
    const cols = ['#f472b6', '#fb923c', '#a78bfa', '#f43f5e', '#facc15', '#34d399'];
    for (let i = 0; i < 6; i++) {
      const x = X(0.2 + i * 0.13), y = Y(0.88), h = (46 + (i % 3) * 22) * s, c = SciSim.color.mix(cols[i], '#f1f5f9', w);
      ctx.strokeStyle = c; ctx.lineWidth = 9 * s + 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(x - 15 * s, y - h * 0.85); ctx.moveTo(x, y - h * 0.6); ctx.lineTo(x + 15 * s, y - h * 0.9); ctx.stroke();
      ctx.fillStyle = 'rgba(34,197,94,' + (0.75 * (1 - w)) + ')'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (k - 1.5) * 3.5, y - h * (0.3 + 0.18 * k), 2, 0, 6.3); ctx.fill(); }
    }
    // 열 화살표
    D.arrow(X(0.16), Y(0.18), X(0.34), Y(0.38), { color: 'rgba(255,190,30,.9)', width: 4 + 5 * u, head: 14 });
    // 수온계
    const tx = X(0.9), ty = Y(0.12), th = Y(0.62) - Y(0.12);
    ctx.fillStyle = '#fff'; rr(tx - 11 * s, ty, 22 * s, th, 10).fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(tx - 11 * s, ty, 22 * s, th, 10).stroke();
    ctx.fillStyle = '#ef4444'; const lv = 0.25 + 0.65 * u; rr(tx - 7 * s, ty + th * (1 - lv), 14 * s, th * lv - 3, 6).fill();
    TX(tx, ty - 6, '해수 온도', { size: 13, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 }); TX(tx, ty + th + 18, (26 + 4 * u).toFixed(1) + ' °C', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
    // 물고기
    const nf = Math.round(2 + 4 * (1 - w));
    for (let i = 0; i < nf; i++) { const fx = X(0.25 + (i * 0.11)) + Math.sin(t * 1.2 + i) * 14, fy = Y(0.5 + (i % 3) * 0.08); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(fx, fy, 8 * s + 2, 4 * s + 1, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 7 * s, fy); ctx.lineTo(fx - 13 * s, fy - 4); ctx.lineTo(fx - 13 * s, fy + 4); ctx.fill(); }
    D.label(X(0.45), Y(0.97), w > 0.5 ? '산호가 하얗게 변했어요 (백화)' : '알록달록한 건강한 산호', { bg: w > 0.5 ? '#be123c' : '#15803d', size: 13 });
    ctx.restore();
  }
  const VIGS = [vgPin, vgNino, vgIce, vgCoral];
  function csU() { return clamp((S.csT % 11) / 8, 0, 1); }
  function drawChain(t, dt) {
    const G = cgeo;
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    // 사례 카드
    G.tabs.forEach((c, i) => {
      const on = S.cs === i; ctx.save();
      D.shadow(() => { ctx.fillStyle = on ? '#0ea5e9' : '#fff'; rr(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14).fill(); }, { blur: on ? 8 : 4, y: 2, color: 'rgba(30,45,80,.25)' });
      ctx.strokeStyle = on ? '#0369a1' : '#cbd5e1'; ctx.lineWidth = 2.2; rr(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14).stroke();
      TX(c.x, c.y + 6, CASES[i].tab, { size: 16, color: on ? '#fff' : '#1b2333', weight: 800 });
      if (!S.csViewed.has(i)) { ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(c.x + c.w / 2 - 8, c.y - c.h / 2 + 8, 5, 0, 6.3); ctx.fill(); }
      ctx.restore();
    });
    const u = csU(); VIGS[S.cs](G.vg, u, t);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(G.vg.x, G.vg.y, G.vg.w, G.vg.h, 14).stroke();
    TX(G.vg.x + 12, G.vg.y + G.vg.h - 10, '▶ ' + CASES[S.cs].name + (CASES[S.cs].year ? ' (' + CASES[S.cs].year + ')' : ''), { size: 13, color: '#334155', weight: 800, align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    // 연쇄 노드
    const cs = CASES[S.cs];
    const flowTags = [];
    G.nodes.forEach((n, i) => {
      const lit = u >= (i === 0 ? 0.02 : i === 1 ? 0.34 : 0.62), col = SPH[cs.nodes[i].s].col;
      ctx.save(); ctx.globalAlpha = lit ? 1 : 0.4;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(n.x, n.y, n.w, n.h, 14).fill(); }, { blur: lit ? 8 : 3, y: 2, color: 'rgba(30,45,80,.25)' });
      ctx.fillStyle = col; rr(n.x, n.y, 10, n.h, 5).fill(); ctx.strokeStyle = col; ctx.lineWidth = lit ? 3 : 1.5; rr(n.x, n.y, n.w, n.h, 14).stroke();
      if (PHONE) { D.label(n.x + 18, n.y + n.h / 2, SPH[cs.nodes[i].s].name, { bg: col, size: 13, align: 'left' }); para(n.x + 110, n.y + 22, cs.nodes[i].t, n.w - 124, 13.5, { color: '#1e293b', weight: 700, align: 'left', lh: 1.25 }); }
      else { D.label(n.x + 24 + 8, n.y + 20, SPH[cs.nodes[i].s].name, { bg: col, size: 13, align: 'left' });
      para(n.x + 22, n.y + 48, cs.nodes[i].t, n.w - 34, 13.5, { color: '#1e293b', weight: 700, align: 'left' }); }
      ctx.restore();
      if (i < 2) {
        const a = PHONE ? [n.x + 40, n.y + n.h + 1] : [n.x + n.w / 2, n.y + n.h + 2], b = PHONE ? [n.x + 40, n.y + n.h + 11] : [n.x + n.w / 2, n.y + n.h + 16];
        const lit2 = u >= (i === 0 ? 0.2 : 0.5);
        D.arrow(a[0], a[1], b[0], b[1], { color: lit2 ? '#ea580c' : '#cbd5e1', width: 4, head: 9 });
        const ans = S.csAns[S.cs][i];
        if (ans) flowTags.push([PHONE ? b[0] + 56 : n.x + n.w / 2 + 54, PHONE ? n.y + n.h + 6 : n.y + n.h + 9, FLOWN[ans], ans]);
      }
    });
    flowTags.forEach(([fx, fy, ft, fa]) => D.label(fx, fy, ft, { bg: fa === 1 ? '#6d28d9' : '#ea580c', size: 12.5 }));
    // 분석표
    const T = G.tab; let x = T.x;
    const heads = ['사례', '연결 ① (첫째 화살표)', '연결 ② (둘째 화살표)'];
    ctx.fillStyle = '#e2e8f0'; rr(T.x, T.y, T.cw[0] + T.cw[1] + T.cw[2], T.hdr, 8).fill();
    heads.forEach((h, i) => { TX(x + T.cw[i] / 2, T.y + T.hdr - 8, h, { size: 13.5, color: '#334155', weight: 800 }); x += T.cw[i]; });
    S.chipRects = [];
    CASES.forEach((c, i) => {
      const y = T.y + T.hdr + i * T.rh, on = S.cs === i;
      ctx.fillStyle = on ? '#e0f2fe' : '#fff'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; rr(T.x, y + 2, T.cw[0] + T.cw[1] + T.cw[2], T.rh - 4, 8).fill(); rr(T.x, y + 2, T.cw[0] + T.cw[1] + T.cw[2], T.rh - 4, 8).stroke();
      TX(T.x + 10, y + T.rh / 2 + 6, c.name, { size: 14.5, color: '#0f172a', weight: 800, align: 'left' });
      for (let j = 0; j < 2; j++) {
        const cx0 = T.x + T.cw[0] + (j ? T.cw[1] : 0), a = SPH[c.nodes[j].s].name, b = SPH[c.nodes[j + 1].s].name;
        TX(cx0 + 10, y + T.rh / 2 + 6, a + ' → ' + b, { size: PHONE ? 13 : 14, color: '#334155', weight: 700, align: 'left' });
        const ans = S.csAns[i][j], bw = PHONE ? 84 : 92, bh = PHONE ? 38 : 26, bx = cx0 + T.cw[1 + j] - bw - 8, by = y + T.rh / 2 - bh / 2;
        const fill = ans === 0 ? '#fff' : ans === 1 ? '#ede9fe' : '#ffedd5', stroke = ans === 0 ? '#94a3b8' : ans === 1 ? '#7c3aed' : '#ea580c';
        const bad = S.csBad && S.csBad[i] && S.csBad[i][j] > t;
        ctx.fillStyle = fill; ctx.strokeStyle = bad ? '#e2464b' : stroke; ctx.lineWidth = bad ? 3 : 2; ctx.setLineDash(ans === 0 ? [5, 4] : []); rr(bx, by, bw, bh, 9).fill(); rr(bx, by, bw, bh, 9).stroke(); ctx.setLineDash([]);
        TX(bx + bw / 2, by + bh / 2 + 5.5, ans === 0 ? '눌러서 고르기' : FLOWN[ans], { size: ans === 0 ? (PHONE ? 11 : 12) : 14, color: ans === 0 ? '#94a3b8' : ans === 1 ? '#5b21b6' : '#c2410c', weight: 800 });
        S.chipRects.push({ i, j, x: bx, y: by, w: bw, h: bh });
      }
    });
    if (S.csOK > 0.3) { ctx.globalAlpha = S.csOK; D.label(VW / 2, T.y + T.hdr + 4 * T.rh + (PHONE ? 22 : 12), '한 권역의 변화가 물질과 에너지로 다른 권역에 영향을 줘요', { bg: '#14a058', size: 13.5 }); ctx.globalAlpha = 1; }
    // 한 줄 설명
    if (!PHONE) { /* 노트는 노드 아래 */ }
    TX(PHONE ? VW / 2 : G.nodes[0].x + 158, PHONE ? G.nodes[0].y + G.nodes[0].h + 0 : G.nodes[2].y + G.nodes[2].h + 20, '', { size: 12 });
  }

  /* ======================================================
     화면 4: 지구시스템 시뮬레이션 (온실가스 배출 시나리오)
     ====================================================== */
  const RUNCOL = ['#2563eb', '#ea580c'];
  function simulateRun(E) {
    const st = { A: C0.A, V: C0.V, S: C0.S, O: C0.O }, out = []; let cum = 0;
    for (let k = 0; k <= 300; k++) {
      const yr = 2025 + k * 0.25, T = 1.2 + 0.0028 * cum;
      out.push({ yr, A: st.A, ppm: st.A / 2.13, T, slr: 0.006 * (yr - 2025) * (1 + 0.45 * (T - 1.2)), coral: 100 * Math.exp(-1.6 * (T - 1.2)) });
      carbonStep(st, E, 0.25); cum += E * 0.25;
    }
    return out;
  }
  const BASE = { yr: 2025, ppm: 413, T: 1.2, slr: 0, coral: 100 };
  const EVS = [
    { t: '배출량을 줄이면 2100년까지 기온과 해수면이 전혀 오르지 않았다.', ok: false, fb: '배출을 줄여도 이미 쌓인 온실가스 때문에 기온과 해수면은 어느 정도 올라요.' },
    { t: '배출량이 많을수록 2100년의 기온과 해수면이 더 많이 올랐다.', ok: true },
    { t: '배출량이 달라도 대기 중 CO₂ 농도는 똑같이 늘어났다.', ok: false, fb: '배출량이 많은 쪽의 CO₂ 농도가 훨씬 더 높아졌어요. 표의 ppm을 비교해 보세요.' },
    { t: '배출량이 많은 시나리오에서 산호초 건강 지수가 더 크게 떨어졌다.', ok: true },
  ];
  function simCur() {
    if (S.simRun) return S.simRun.data[Math.min(300, Math.floor(S.simRun.k))];
    if (S.runs.length) return S.runs[S.runs.length - 1].data[300];
    return BASE;
  }
  function simGhost() {
    if (S.simRun) return S.runs.length ? S.runs[S.runs.length - 1].data[300] : null;
    if (S.runs.length >= 2) return S.runs[S.runs.length - 2].data[300];
    return null;
  }
  function startSimRun() {
    if (S.simRun) return;
    S.simRun = { E: S.emit, data: simulateRun(S.emit), k: 0, col: S.runN % 2 }; Sound.click();
  }
  function finishSimRun() {
    const r = S.simRun, d = r.data[300];
    S.runs.push({ E: r.E, data: r.data, col: r.col, n: S.runN + 1 }); if (S.runs.length > 2) S.runs.shift();
    S.runN++; S.simRun = null; Sound.success(); parts.burst(VW / 2, VH / 2, { count: 16, speed: 140, size: 4, life: 0.9 });
    updateEv();
  }
  function gaugeCard(r, title, ico) {
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
    TX(r.x + 12, r.y + 22, ico + ' ' + title, { size: 14.5, color: '#1e293b', weight: 800, align: 'left' });
  }
  function drawSim(t, dt) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    const cur = simCur(), gh = simGhost();
    const G = PHONE ? { g: [0, 1, 2, 3].map((i) => ({ x: 12 + (i % 2) * 292, y: 8 + Math.floor(i / 2) * 156, w: 284, h: 148 })), c1: { x: 12, y: 330, w: 576, h: 162 }, c2: { x: 12, y: 502, w: 576, h: 162 }, tb: { x: 12, y: 676 } }
      : { g: [0, 1, 2, 3].map((i) => ({ x: 12 + i * 196, y: 10, w: 188, h: 184 })), c1: { x: 12, y: 206, w: 384, h: 190 }, c2: { x: 404, y: 206, w: 384, h: 190 }, tb: { x: 12, y: 408 } };
    // ---- 게이지 4개 ----
    const [g0, g1, g2, g3] = G.g;
    const gx = (g) => g.x + g.w / 2, ghost = (v, f, sc) => (gh ? f(gh) : null);
    // CO2
    gaugeCard(g0, '대기 CO₂', '☁️');
    { const x = g0.x + 40, y0 = g0.y + 40, h = g0.h - 86, f = (v) => clamp((v - 400) / 400, 0, 1);
      ctx.fillStyle = '#e2e8f0'; rr(x - 9, y0, 18, h, 9).fill();
      const lv = f(cur.ppm), gg = ctx.createLinearGradient(0, y0 + h, 0, y0); gg.addColorStop(0, '#facc15'); gg.addColorStop(1, '#dc2626'); ctx.fillStyle = gg; rr(x - 9, y0 + h * (1 - lv), 18, Math.max(6, h * lv), 9).fill();
      [400, 500, 600, 700, 800].forEach((v) => { const y = y0 + h * (1 - f(v)); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 20, y); ctx.stroke(); TX(x + 24, y + 4, String(v), { size: 12, color: '#64748b', weight: 700, align: 'left' }); });
      if (gh) { const y = y0 + h * (1 - f(gh.ppm)); ctx.strokeStyle = RUNCOL[S.simRun ? (S.runs.length ? S.runs[S.runs.length - 1].col : 0) : S.runs[S.runs.length - 2].col]; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.setLineDash([]); }
      // 구름 속 CO2 점
      for (let i = 0; i < 18; i++) { const px = g0.x + 118 + ((i * 41) % 60), py = g0.y + 54 + ((i * 29) % 56) + Math.sin(t + i) * 2; ctx.fillStyle = 'rgba(71,85,105,' + (i < 4 + lv * 14 ? 0.8 : 0.1) + ')'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.3); ctx.fill(); }
      TX(gx(g0) + 28, g0.y + g0.h - 14, Math.round(cur.ppm) + ' ppm', { size: 19, color: '#0f172a', weight: 800 });
    }
    // 기온
    gaugeCard(g1, '평균 기온', '🌡️');
    { const x = g1.x + 44, y0 = g1.y + 40, h = g1.h - 90, f = (v) => clamp((v - 1) / 3.2, 0, 1);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(x - 9, y0, 18, h, 9).fill(); rr(x - 9, y0, 18, h, 9).stroke();
      D.sphere(x, y0 + h + 8, 14, '#ef4444', { gloss: false });
      const lv = f(cur.T); ctx.fillStyle = '#ef4444'; rr(x - 5, y0 + h * (1 - lv), 10, h * lv + 6, 5).fill();
      [1, 2, 3, 4].forEach((v) => { const y = y0 + h * (1 - f(v)); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 20, y); ctx.stroke(); TX(x + 24, y + 4, '+' + v, { size: 12, color: '#64748b', weight: 700, align: 'left' }); });
      if (gh) { const y = y0 + h * (1 - f(gh.T)); ctx.strokeStyle = RUNCOL[S.simRun ? (S.runs.length ? S.runs[S.runs.length - 1].col : 0) : S.runs[S.runs.length - 2].col]; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.setLineDash([]); }
      TX(gx(g1) + 28, g1.y + g1.h - 14, '+' + cur.T.toFixed(1) + ' °C', { size: 19, color: '#0f172a', weight: 800 });
      TX(gx(g1) + 42, g1.y + 70, '산업화 이전보다', { size: 12.5, color: '#64748b', weight: 700 });
    }
    // 해수면
    gaugeCard(g2, '해수면 (2025년 대비)', '🌊');
    { const x0 = g2.x + 14, w = g2.w - 28, y0 = g2.y + 40, h = g2.h - 82, lvl = (m) => y0 + h * 0.78 - m / 1.0 * h * 0.62;
      ctx.save(); rr(x0, y0, w, h, 10).clip(); ctx.fillStyle = '#dff1ff'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = '#c9a56b'; ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0, y0 + h * 0.5); ctx.lineTo(x0 + w * 0.42, y0 + h * 0.5 - 0); ctx.lineTo(x0 + w * 0.7, y0 + h * 0.22); ctx.lineTo(x0 + w, y0 + h * 0.2); ctx.lineTo(x0 + w, y0 + h); ctx.fill();
      // 집
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(x0 + w * 0.08, y0 + h * 0.5 - 14); ctx.lineTo(x0 + w * 0.15, y0 + h * 0.5 - 28); ctx.lineTo(x0 + w * 0.22, y0 + h * 0.5 - 14); ctx.fill(); ctx.fillStyle = '#fef3c7'; ctx.fillRect(x0 + w * 0.09, y0 + h * 0.5 - 14, w * 0.12, 14);
      const sy = lvl(cur.slr); ctx.fillStyle = 'rgba(37,99,235,.78)'; ctx.fillRect(x0, sy, w, y0 + h - sy); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= w; i += 6) { const yy = sy + Math.sin(i * 0.1 + t * 2) * 1.6; i ? ctx.lineTo(x0 + i, yy) : ctx.moveTo(x0 + i, yy); } ctx.stroke();
      ctx.restore();
      [0, 0.5, 1].forEach((m) => { const y = lvl(m); ctx.strokeStyle = 'rgba(30,41,59,.45)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x0 + w * 0.7, y); ctx.lineTo(x0 + w - 28, y); ctx.stroke(); ctx.setLineDash([]); TX(x0 + w - 4, y + 4, m.toFixed(1), { size: 12, color: '#334155', weight: 700, align: 'right' }); });
      if (gh) { const y = lvl(gh.slr); ctx.strokeStyle = RUNCOL[S.simRun ? (S.runs.length ? S.runs[S.runs.length - 1].col : 0) : S.runs[S.runs.length - 2].col]; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x0 + w * 0.5, y); ctx.stroke(); ctx.setLineDash([]); }
      TX(gx(g2), g2.y + g2.h - 12, '+' + cur.slr.toFixed(2) + ' m', { size: 19, color: '#0f172a', weight: 800 });
    }
    // 산호초
    gaugeCard(g3, '산호초 건강 지수', '🪸');
    { const x0 = g3.x + 14, w = g3.w - 28, y0 = g3.y + 40, h = g3.h - 82, hl = clamp(cur.coral / 100, 0, 1), wh = 1 - hl;
      ctx.save(); rr(x0, y0, w, h, 10).clip(); const sg = ctx.createLinearGradient(0, y0, 0, y0 + h); sg.addColorStop(0, '#5ec8ee'); sg.addColorStop(1, '#0c5aa6'); ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = '#d9c28a'; ctx.fillRect(x0, y0 + h - 12, w, 12);
      const cols = ['#f472b6', '#fb923c', '#a78bfa', '#f43f5e', '#facc15'];
      for (let i = 0; i < 5; i++) { const x = x0 + 22 + i * (w - 44) / 4, hh = 22 + (i % 3) * 12; ctx.strokeStyle = SciSim.color.mix(cols[i], '#f1f5f9', wh); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0 + h - 10); ctx.lineTo(x, y0 + h - 10 - hh); ctx.moveTo(x, y0 + h - 10 - hh * 0.5); ctx.lineTo(x - 9, y0 + h - 10 - hh * 0.9); ctx.moveTo(x, y0 + h - 10 - hh * 0.6); ctx.lineTo(x + 9, y0 + h - 10 - hh); ctx.stroke(); }
      ctx.restore();
      if (gh) { ctx.fillStyle = RUNCOL[S.simRun ? (S.runs.length ? S.runs[S.runs.length - 1].col : 0) : S.runs[S.runs.length - 2].col]; TX(x0 + w - 4, y0 + 16, '이전 ' + Math.round(gh.coral), { size: 12.5, color: '#fff', weight: 800, align: 'right', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 }); }
      TX(gx(g3), g3.y + g3.h - 12, Math.round(cur.coral) + ' 점', { size: 19, color: '#0f172a', weight: 800 });
    }
    // ---- 꺾은선 그래프 2개 ----
    const chart = (R, title, key, ymin, ymax, fmt, unit) => {
      ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 14).fill();
      TX(R.x + 14, R.y + 24, title, { size: 14.5, color: '#1e293b', weight: 800, align: 'left' });
      const px = (y) => R.x + 52 + (y - 2025) / 75 * (R.w - 70), py = (v) => R.y + R.h - 26 - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin) * (R.h - 64);
      ctx.lineWidth = 1; ctx.strokeStyle = '#e2e8f0';
      for (let k = 0; k <= 3; k++) { const v = ymin + (ymax - ymin) * k / 3; ctx.beginPath(); ctx.moveTo(px(2025), py(v)); ctx.lineTo(px(2100), py(v)); ctx.stroke(); TX(R.x + 46, py(v) + 4, fmt(v), { size: 12, color: '#64748b', weight: 700, align: 'right' }); }
      [2025, 2050, 2075, 2100].forEach((y) => TX(px(y), R.y + R.h - 8, String(y), { size: 12, color: '#64748b', weight: 700 }));
      S.runs.forEach((r) => { ctx.strokeStyle = RUNCOL[r.col]; ctx.lineWidth = 2.6; ctx.setLineDash([6, 4]); ctx.beginPath(); r.data.forEach((d, i) => (i ? ctx.lineTo(px(d.yr), py(d[key])) : ctx.moveTo(px(d.yr), py(d[key])))); ctx.stroke(); ctx.setLineDash([]); });
      if (S.simRun) { const r = S.simRun; ctx.strokeStyle = RUNCOL[r.col]; ctx.lineWidth = 4; ctx.beginPath(); for (let i = 0; i <= Math.floor(r.k); i++) { const d = r.data[i]; i ? ctx.lineTo(px(d.yr), py(d[key])) : ctx.moveTo(px(d.yr), py(d[key])); } ctx.stroke(); const d = cur; D.sphere(px(d.yr), py(d[key]), 5.5, RUNCOL[r.col], { gloss: false, outline: '#fff' }); }
      if (!S.simRun && !S.runs.length) TX(R.x + R.w / 2, R.y + R.h / 2 + 4, '실행하면 그래프가 그려져요', { size: 14, color: '#94a3b8', weight: 700 });
    };
    chart(G.c1, '기온 상승 (°C, 산업화 이전 대비)', 'T', 1, 4, (v) => '+' + v.toFixed(1));
    chart(G.c2, '해수면 상승 (m, 2025년 대비)', 'slr', 0, 1, (v) => v.toFixed(1));
    // ---- 비교 표 ----
    const T = G.tb, cw = PHONE ? [98, 100, 102, 100, 88, 88] : [118, 130, 150, 150, 120, 108], heads = ['시나리오', '연간 배출', '2100년 CO₂', '2100년 기온', '해수면', '산호'];
    const rh = PHONE ? 44 : 32, hh = PHONE ? 30 : 26, totalW = cw.reduce((a, b) => a + b, 0), tx0 = PHONE ? 8 : T.x;
    ctx.fillStyle = '#e2e8f0'; rr(tx0, T.y, totalW, hh, 8).fill(); let xx = tx0;
    heads.forEach((h, i) => { TX(xx + cw[i] / 2, T.y + hh - 8, h, { size: PHONE ? 12 : 13, color: '#334155', weight: 800 }); xx += cw[i]; });
    for (let i = 0; i < 2; i++) {
      const r = S.runs[i], y = T.y + hh + i * rh; ctx.fillStyle = '#fff'; rr(tx0, y + 2, totalW, rh - 4, 8).fill();
      if (!r) { TX(tx0 + totalW / 2, y + rh / 2 + 5, '시나리오 ' + (i + 1) + ': 아직 실행하지 않았어요', { size: 13.5, color: '#94a3b8', weight: 700 }); continue; }
      const d = r.data[300], vals = ['시나리오 ' + r.n, r.E + ' GtC/년', Math.round(d.ppm) + ' ppm', '+' + d.T.toFixed(1) + ' °C', '+' + d.slr.toFixed(2) + ' m', Math.round(d.coral) + '점'];
      ctx.fillStyle = RUNCOL[r.col]; rr(tx0, y + 2, 6, rh - 4, 3).fill(); xx = tx0;
      vals.forEach((v, j) => { TX(xx + cw[j] / 2 + (j === 0 ? 4 : 0), y + rh / 2 + 5, v, { size: PHONE ? 12.5 : 14, color: '#0f172a', weight: 800 }); xx += cw[j]; });
    }
    if (S.simRun) { const r = S.simRun; D.label(PHONE ? 300 : 400, PHONE ? 322 : 202, Math.floor(r.data[Math.min(300, Math.floor(r.k))].yr) + '년', { bg: RUNCOL[r.col], size: 15 }); }
  }
  const evBox = $('#evBox'), evList = $('#evList');
  const EV_ORDER = [0, 1, 2, 3];
  function updateEv() {
    const show = S.runs.length >= 2 && game && (game.has('sim') || game.free);
    evBox.hidden = !(show && S.mode === 'sim');
    evList.innerHTML = '';
    EV_ORDER.forEach((i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (S.ev.has(i) ? ' on' : ''); b.textContent = EVS[i].t;
      b.addEventListener('click', () => { if (S.ev.has(i)) S.ev.delete(i); else S.ev.add(i); Sound.tick(); updateEv(); });
      evList.appendChild(b);
    });
  }

  /* ======================================================
     장면 전환 · 입력 · 읽음 칸
     ====================================================== */
  const MODE_LABEL = { water: '💧 물의 순환', carbon: '🌿 탄소의 순환', chain: '🔗 연쇄 현상', sim: '🌡️ 지구 시뮬레이션' };
  const modeSeg = $('#modeSeg');
  function stageBg() { return S.mode === 'chain' || S.mode === 'sim' ? '#eef3fb' : S.mode === 'carbon' ? '#eaf3fb' : '#d8ecff'; }
  function updateCtl() {
    const lab = $('#tbLabel'); if (lab) lab.textContent = MODE_LABEL[S.mode] + (S.mode === 'water' ? (S.wsub === 'label' ? ' · 이름 붙이기' : '') : S.mode === 'carbon' ? (S.csub === 'label' ? ' · 이름 붙이기' : '') : '');
    $$('#ctrlCard .control').forEach((c) => {
      let ok = c.dataset.modes.split(' ').includes(S.mode);
      if (ok && c.dataset.wsub && c.dataset.wsub !== S.wsub) ok = false;
      if (ok && c.dataset.csub && c.dataset.csub !== S.csub) ok = false;
      c.hidden = !ok;
    });
    $$('#wBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.w === S.wsub));
    $$('#cBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.c === S.csub));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    $('#bRunC').textContent = S.run ? '⏸ 멈춤' : '▶ 흐르게';
    $('#bRunS').disabled = !!S.simRun;
    updateEv();
    view.wrap.style.setProperty('--stage-bg', stageBg());
  }
  function setMode(m, sub) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m;
    if (sub) { if (m === 'water') S.wsub = sub; if (m === 'carbon') S.csub = sub; }
    updateCtl();
  }
  const sEnergy = $('#sEnergy'), oEnergy = $('#oEnergy'), sFossil = $('#sFossil'), oFossil = $('#oFossil'), sEmit = $('#sEmit'), oEmit = $('#oEmit');
  SciSim.bindRange(sEnergy, oEnergy, (v) => v + ' %', (v) => { S.E = v / 100; });
  SciSim.bindRange(sFossil, oFossil, (v) => (+v).toFixed(1) + ' GtC/년', (v) => { S.fossil = v; });
  SciSim.bindRange(sEmit, oEmit, (v) => (+v).toFixed(1) + ' GtC/년', (v) => { S.emit = v; });
  $$('#wBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode('water', b.dataset.w); }));
  $$('#cBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode('carbon', b.dataset.c); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { if (!(game && game.free)) return; Sound.click(); setMode(b.dataset.mode); }));
  $('#bTracer').addEventListener('click', launchTracer);
  $('#bResetW').addEventListener('click', () => { Sound.click(); initWaterBoard(); });
  $('#bResetCT').addEventListener('click', () => { Sound.click(); initCarbonBoard(); });
  $('#bRunC').addEventListener('click', () => { if (S.yr >= 2100) resetCarbon(); S.run = !S.run; Sound.click(); updateCtl(); });
  $('#bResetC').addEventListener('click', () => { Sound.click(); resetCarbon(); S.run = true; updateCtl(); });
  $('#bResetChain').addEventListener('click', () => { Sound.click(); S.csAns = [[0, 0], [0, 0], [0, 0], [0, 0]]; S.csOK = 0; S.csBad = null; });
  $('#bRunS').addEventListener('click', () => { startSimRun(); updateCtl(); });
  $('#bClearS').addEventListener('click', () => { Sound.click(); S.runs = []; S.simRun = null; S.runN = 0; S.ev = new Set(); S.simOK = 0; updateCtl(); });

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }
  const activeBoard = () => (S.mode === 'water' && S.wsub === 'label' ? boards.water : S.mode === 'carbon' && S.csub === 'label' ? boards.carbon : null);
  function chainHit(p) {
    const G = cgeo;
    const ti = G.tabs.findIndex((c) => Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2);
    if (ti >= 0) return { tab: ti };
    const ch = (S.chipRects || []).find((c) => p.x >= c.x - 4 && p.x <= c.x + c.w + 4 && p.y >= c.y - 4 && p.y <= c.y + c.h + 4);
    return ch ? { chip: ch } : null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'chain') {
        const h = chainHit(p); if (!h) return false;
        if (h.tab != null) { S.cs = h.tab; S.csT = 0; S.csViewed.add(h.tab); Sound.tick(); }
        else { const a = S.csAns[h.chip.i]; a[h.chip.j] = (a[h.chip.j] + 1) % 3; S.cs = h.chip.i; Sound.click(); S.csOK = 0; if (S.csBad && S.csBad[h.chip.i]) S.csBad[h.chip.i][h.chip.j] = 0; }
        return false;
      }
      const B = activeBoard(); if (!B) return false;
      const c = B.pick(p); if (!c) return false;
      B.start(c, p); return true;
    },
    move(p) { const B = activeBoard(); if (B) B.move(p); },
    up(p) { const B = activeBoard(); if (B) B.drop(); },
    hover(p) { const B = activeBoard(); if (B) return B.pick(p) ? 'grab' : 'default'; if (S.mode === 'chain') return chainHit(p) ? 'pointer' : 'default'; return 'default'; },
  });

  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'water') {
      if (S.wsub === 'label') { L1 = '놓은 이름표'; a = boards.water.placed() + ' / 5'; L2 = '이동 이름'; b = '증발 · 응결 · 강수 · 유출 · 증산'; L3 = '결과'; c = S.wOK > 0.5 ? '모두 알맞게 붙임 ✅' : '확인하기를 눌러 보세요'; }
      else {
        L1 = '태양 에너지'; a = Math.round(S.E * 100) + ' %'; L2 = '물방울의 위치'; b = '바다 ' + WATER.cnt.sea + ' · 공기 ' + WATER.cnt.air + ' · 땅 ' + WATER.cnt.land;
        const tp = S.tr; L3 = '추적 물방울'; c = tp ? (tp.tr ? STAGE_TXT[{ sea: 0, rise: 1, up: 1, cloud: 2, rain: 3, run: 4, inf: 4, ground: 4 }[tp.st]].split(':')[0].split(' (')[0] : '한 바퀴 완료 ✅') : '아직 없음';
      }
    } else if (S.mode === 'carbon') {
      if (S.csub === 'label') { L1 = '놓은 이름표'; a = boards.carbon.placed() + ' / 4'; L2 = '이동 경로'; b = '광합성 · 호흡 · 해수 용해 · 연소'; L3 = '결과'; c = S.cOK > 0.5 ? '모두 알맞게 붙임 ✅' : '확인하기를 눌러 보세요'; }
      else { L1 = '연도'; a = Math.floor(S.yr) + '년'; L2 = '대기 중 탄소'; b = Math.round(S.A) + ' GtC (' + Math.round(S.A / 2.13) + ' ppm)'; L3 = '대기에 쌓이는 양'; c = (S.dA >= 0 ? '+' : '−') + Math.abs(S.dA).toFixed(1) + ' GtC/년'; }
    } else if (S.mode === 'chain') {
      const n = CASES.filter((_, i) => S.csAns[i][0] && S.csAns[i][1]).length;
      L1 = '보고 있는 사례'; a = CASES[S.cs].name; L2 = '분석한 사례'; b = n + ' / 4'; L3 = '연쇄'; c = CASES[S.cs].nodes.map((x) => SPH[x.s].name).join(' → ');
    } else {
      const cur = simCur(); L1 = '실행한 시나리오'; a = S.runs.length + ' / 2'; L2 = '지금 배출량'; b = (S.simRun ? S.simRun.E : S.emit) + ' GtC/년'; L3 = '기온 상승'; c = '+' + cur.T.toFixed(1) + ' °C';
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.tr = null; S.trLoops = 0; S.trSeen = new Set(); S.trDone = false; S.E = 0.5; sEnergy.value = 50; oEnergy.textContent = '50 %'; sEnergy.style.setProperty('--pct', '50%'); initWaterBoard(); setMode('water', 'flow'); showHint('💧 물방울 하나를 따라가 봐요', 5000); }
    else if (li === 1) { initCarbonBoard(); resetCarbon(); S.run = true; setMode('carbon', 'model'); showHint('경로 이름표를 놓아 탄소의 이동을 알아봐요', 5000); }
    else if (li === 2) { S.cs = 0; S.csT = 0; S.csAns = [[0, 0], [0, 0], [0, 0], [0, 0]]; S.csViewed = new Set([0]); S.csOK = 0; S.csBad = null; setMode('chain'); showHint('사례 카드를 눌러 연쇄 현상을 봐요', 5000); }
    else { S.runs = []; S.simRun = null; S.runN = 0; S.ev = new Set(); S.simOK = 0; setMode('sim'); showHint('배출량을 정하고 실행해 봐요', 5000); }
  }
  function ensure(m, sub) { if (S.mode !== m || (sub && ((m === 'water' && S.wsub !== sub) || (m === 'carbon' && S.csub !== sub)))) setMode(m, sub); }
  const stageChips = () => ['증발', '응결', '강수', '유출', '바다로'].map((n, i) => mark(i === 4 ? S.trDone : S.trSeen.has(i + 1)) + ' ' + n).join(' ');

  const levels = [
    {
      title: '물의 순환: 권역 사이를 도는 물', short: '물의 순환', icon: '💧', phase: '관찰', features: ['water'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구의 한 부분이 변하면 다른 부분에는 어떤 일이 생길까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(지구시스템)에서</b> 태양 에너지가 기권과 수권을 움직이고, 권역들이 서로 이어져 있다는 것을 배웠어요. 중학교에서 배운 대기 대순환과 해류도 그런 예였어요.</div>' +
        '<p>이번 시간에는 권역들 사이를 <b>물질</b>이 어떻게 돌고(순환), <b>에너지</b>가 어떻게 흐르는지 따라가 봐요. 먼저 <b>물</b>이에요. 바다(수권)의 물은 태양 에너지로 <b>증발</b>해 기권으로 올라가고, <b>응결</b>해 구름이 되었다가 <b>강수</b>로 지권(땅)에 내려와 <b>유출</b>·<b>침투</b>되어 다시 바다로 가요. 식물(생물권)은 <b>증산</b>으로 물을 내보내요.</p>',
      setup() { enterLevel(0); },
      recap: '물은 태양 에너지로 증발해 기권으로 올라가고, 응결·강수·유출을 거쳐 수권으로 돌아와요. 물은 권역 사이를 순환해요.',
      summary: '<ul><li><b>물의 순환</b>: 증발(수권→기권) → 응결(기권) → 강수(기권→지권·수권) → 유출·침투(지권→수권). 식물의 <b>증산</b>(생물권→기권)도 있어요.</li><li>순환을 일으키는 에너지원은 <b>태양 에너지</b>예요. 에너지가 클수록 증발이 늘어 순환이 빨라져요.</li><li>물은 사라지지 않고 권역 사이를 <b>돌고 돌아요</b>(물질 순환).</li></ul>',
      missions: [
        {
          title: '물방울 한 바퀴 따라가기',
          goal: '<b>💧 물방울 하나 따라가기</b>를 눌러, 노란 테두리 물방울이 <b>증발 → 응결 → 강수 → 유출</b>을 거쳐 바다로 돌아오게 해요.',
          hint: '태양 에너지 슬라이더를 오른쪽으로 올리면 증발이 빨라져 한 바퀴를 더 빨리 돌아요. 물방울 위의 설명을 읽어 보세요.',
          setup() { ensure('water', 'flow'); S.trLoops = 0; },
          check: () => S.trLoops >= 1, hold: 0.3,
          status: () => stageChips(),
          explain: '바다의 물은 태양 에너지로 <b>증발</b>해 수증기가 되고, 높은 곳에서 <b>응결</b>해 구름이 되었다가 <b>강수</b>로 내려와요. 땅 위로 흐르거나(<b>유출</b>) 땅속으로 스며들어(<b>침투</b>) 결국 바다로 돌아와요.',
        },
        {
          title: '물의 이동 이름 붙이기',
          goal: '그림의 번호 ①~⑤에 알맞은 이름표(<b>증발·응결·강수·유출·증산</b>)를 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '① 바다에서 수증기가 올라가는 곳, ② 구름 속, ③ 구름에서 내려오는 곳, ④ 땅 위 강으로 바다에 가는 길, ⑤ 나무에서 물이 나오는 곳이에요.',
          manual: true,
          setup() { ensure('water', 'label'); },
          check() {
            const B = boards.water, un = B.slots.filter((s) => !s.items.length).length;
            if (un) return '아직 비어 있는 번호가 <b>' + un + '곳</b> 있어요.';
            const bad = B.slots.filter((s) => s.items[0].ans !== s.idx);
            bad.forEach((s) => { const c = s.items[0]; if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return bad.map((s) => s.idx + 1 + '번').join(', ') + ' 칸을 다시 생각해 보세요.';
            if (!S.wOK) { SciSim.tween(S, { wOK: 1 }, { duration: 0.7 }); B.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '① <b>증발</b>(수권→기권) ② <b>응결</b>(기권) ③ <b>강수</b>(기권→지권·수권) ④ <b>유출</b>(지권→수권) ⑤ <b>증산</b>(생물권→기권). 물은 수권·기권·지권·생물권을 모두 지나며 순환해요.',
        },
        {
          type: 'quiz', title: '물의 순환을 일으키는 에너지',
          goal: '물의 순환(증발과 강수)을 일으키는 <b>에너지원</b>은 무엇일까요?',
          setup() { ensure('water', 'flow'); },
          choices: ['지구 내부 에너지', '태양 에너지', '달의 인력', '바람의 에너지'],
          answer: 1,
          feedback: ['지구 내부 에너지는 화산과 판 이동을 일으켜요.', '', '달의 인력은 밀물과 썰물을 일으켜요.', '바람도 태양 에너지가 만든 현상이에요. 바람보다 앞선 근본 에너지원을 찾아보세요.'],
          explain: '물이 증발하려면 열에너지가 필요하고, 그 에너지는 <b>태양 에너지</b>예요. 에너지가 커지면 증발량이 늘어 순환이 빨라져요.',
        },
      ],
    },
    {
      title: '탄소의 순환: 저장고와 이동 경로', short: '탄소의 순환', icon: '🌿', phase: '모형', features: ['carbon'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물이 수권·기권·지권·생물권을 돌며 순환하는 것을 봤어요. 물질 순환은 물만의 이야기가 아니에요.</div>' +
        '<p>이번에는 <b>탄소</b>의 순환 모형이에요. 탄소는 대기(CO₂), 식물, 토양, 해양, 화석 연료에 저장되어 있고, <b>광합성 · 호흡과 분해 · 해수 용해 · 연소</b> 경로로 이동해요. 단위는 저장량 <b>GtC</b>(10억 톤 탄소), 이동량 <b>GtC/년</b>이에요. 사람이 쓰는 화석 연료가 순환에 더해지면 어떻게 될까요?</p>',
      setup() { enterLevel(1); },
      recap: '탄소는 광합성·호흡·해수 용해로 권역 사이를 순환해요. 화석 연료 연소로 더해지는 탄소의 일부만 해양과 식물이 흡수해서, 나머지는 대기에 쌓여요.',
      summary: '<table class="mini"><tr><th>경로</th><th>이동</th></tr><tr><td>광합성</td><td>기권 → 생물권</td></tr><tr><td>호흡·분해</td><td>생물권(토양) → 기권</td></tr><tr><td>해수 용해</td><td>기권 ↔ 수권</td></tr><tr><td>화석 연료 연소</td><td>지권 → 기권</td></tr></table><ul><li>대기 약 880, 식물 약 550, 토양 약 1500, 해양 약 38000 GtC (약값)</li><li>연간 약 9~10 GtC가 연소로 더해지면 약 5 GtC/년이 대기에 쌓이고, 나머지는 해양과 식물이 흡수해요.</li></ul>',
      missions: [
        {
          title: '이동 경로 이름 붙이기',
          goal: '탄소 순환 그림의 번호 ①~④에 <b>광합성 · 호흡 · 해수 용해 · 연소</b> 이름표를 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '식물이 CO₂를 흡수하면 광합성, 생물이 CO₂를 내보내면 호흡이에요. 화석 연료 상자에서 대기로 가는 길은 연소예요.',
          manual: true,
          setup() { ensure('carbon', 'label'); },
          check() {
            const B = boards.carbon, un = B.slots.filter((s) => !s.items.length).length;
            if (un) return '아직 비어 있는 번호가 <b>' + un + '곳</b> 있어요.';
            const bad = B.slots.filter((s) => s.items[0].ans !== s.idx);
            bad.forEach((s) => { const c = s.items[0]; if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return bad.map((s) => s.idx + 1 + '번').join(', ') + ' 칸을 다시 생각해 보세요.';
            if (!S.cOK) { SciSim.tween(S, { cOK: 1 }, { duration: 0.7 }); B.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '<b>광합성</b>은 대기의 CO₂를 식물(생물권)로, <b>호흡</b>은 생물이 CO₂를 대기로, <b>해수 용해</b>는 대기와 바다(수권) 사이로, <b>연소</b>는 땅속(지권)의 화석 연료 탄소를 대기로 옮겨요.',
        },
        {
          title: '화석 연료를 늘리면?',
          goal: '화석 연료 사용량을 <b>11 GtC/년 이상</b>으로 올리고, 대기 탄소가 <b>30 GtC 이상</b> 쌓이는 것을 확인하세요.',
          hint: '슬라이더를 오른쪽 끝(12)까지 올리고 2~3초 기다려 보세요. 오른쪽 위 그래프의 빨간 선이 올라가요.',
          setup() { ensure('carbon', 'model'); resetCarbon(); S.run = true; sFossil.value = 9.5; S.fossil = 9.5; oFossil.textContent = '9.5 GtC/년'; sFossil.style.setProperty('--pct', (9.5 / 12 * 100) + '%'); updateCtl(); },
          check: () => S.fossil >= 11 && S.A - C0.A >= 30, hold: 0.6,
          status: () => mark(S.fossil >= 11) + ' 사용량 11 이상 (지금 ' + S.fossil.toFixed(1) + ') · ' + mark(S.A - C0.A >= 30) + ' 쌓인 탄소 +' + Math.max(0, Math.round(S.A - C0.A)) + ' / 30 GtC',
          explain: '화석 연료로 더해지는 탄소가 많아지면 해양과 식물의 흡수도 조금 늘지만(해수 용해·광합성 화살표가 굵어져요), 모두 흡수하지는 못해서 <b>나머지가 대기에 쌓여요</b>. 대기에 쌓인 CO₂는 기온 상승의 원인이 돼요.',
        },
        {
          type: 'quiz', title: '탄소가 대기로 돌아오는 길',
          goal: '식물이 흡수한 탄소가 <b>생물권에서 대기로 돌아오는</b> 경로는 무엇일까요?',
          setup() { ensure('carbon', 'model'); },
          choices: ['광합성', '호흡과 분해', '해수 용해', '화석 연료 연소'],
          answer: 1,
          feedback: ['광합성은 반대로 대기의 탄소를 생물권으로 가져와요.', '', '해수 용해는 대기와 해양 사이의 이동이에요.', '연소는 지권의 화석 연료에서 대기로 가는 길이에요. 생물권에서 오는 탄소가 아니에요.'],
          explain: '생물은 <b>호흡</b>으로, 죽은 생물은 미생물의 <b>분해</b>로 탄소를 CO₂로 만들어 대기로 돌려보내요. 그래서 광합성과 호흡·분해가 균형을 이루면 대기의 CO₂는 일정하게 유지돼요.',
        },
      ],
    },
    {
      title: '연쇄 현상: 한 권역의 변화가 퍼져 가요', short: '연쇄 현상', icon: '🔗', phase: '탐구', features: ['chain'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물과 탄소가 권역 사이를 순환하는 것을 알았어요. 순환과 흐름이 균형을 잃으면 어떻게 될까요?</div>' +
        '<p>사례 <b>네 가지</b>(피나투보 화산, 엘니뇨, 빙하 감소, 산호 백화)를 눌러 한 권역의 변화가 다른 권역으로 번져 가는 <b>연쇄 현상</b>을 따라가 봐요. 각 연결 고리는 <b>물질</b>이 이동한 것일까요, <b>에너지</b>가 이동한 것일까요? 표를 완성해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '한 권역의 변화는 물질 순환(화산 가스, CO₂, 영양염)과 에너지 흐름(햇빛, 열)을 통해 다른 권역에 영향을 줘요.',
      summary: '<table class="mini"><tr><th>사례</th><th>연쇄</th></tr><tr><td>피나투보(1991)</td><td>지권(화산) →<b>물질</b>→ 기권(에어로졸) →<b>에너지</b>→ 기온 −0.5 °C</td></tr><tr><td>엘니뇨</td><td>수권(수온↑) →<b>에너지</b>→ 기권(무역풍↓) →<b>물질</b>→ 생물권(어획량↓)</td></tr><tr><td>빙하 감소</td><td>지권(연소) →<b>물질</b>→ 기권(CO₂↑) →<b>에너지</b>→ 수권(빙하↓)</td></tr><tr><td>산호 백화</td><td>기권 →<b>에너지</b>→ 수권(수온↑) →<b>에너지</b>→ 생물권(백화)</td></tr></table>',
      missions: [
        {
          title: '사례 2개 이상 분석하기',
          goal: '사례 카드를 눌러 연쇄 현상을 보고, 아래 표에서 <b>사례 2개 이상</b>의 두 연결 고리를 <b>물질</b>/<b>에너지</b>로 골라 완성한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '화산 가스·CO₂·영양염은 물질이 옮겨 간 것이고, 햇빛·바닷물의 열·기온 상승은 에너지가 옮겨 간 거예요.',
          manual: true,
          setup() { ensure('chain'); },
          check() {
            const now = S.clock, bad = [], good = [];
            CASES.forEach((c, i) => {
              const a = S.csAns[i]; if (!a[0] && !a[1]) return;
              const wrong = [0, 1].filter((j) => a[j] && a[j] !== c.ans[j]);
              if (wrong.length) { bad.push(i); if (!S.csBad) S.csBad = [[0, 0], [0, 0], [0, 0], [0, 0]]; wrong.forEach((j) => { if (!(S.csBad[i][j] > now)) S.csBad[i][j] = now + 1.5; }); }
              else if (a[0] && a[1]) good.push(i);
            });
            if (bad.length) return '<b>' + bad.map((i) => CASES[i].name).join(', ') + '</b>의 빨간 칸을 다시 생각해 보세요. (물질은 이동하는 물체, 에너지는 열이나 햇빛이에요.)';
            if (good.length < 2) return '두 연결 고리를 모두 고른 사례가 <b>' + good.length + '개</b>예요. 2개 이상 완성해 보세요.';
            if (!S.csOK) { SciSim.tween(S, { csOK: 1 }, { duration: 0.7 }); }
            return true;
          },
          explain: '피나투보: 화산 가스·재(<b>물질</b>)가 기권으로 → 햇빛 차단(<b>에너지</b>). 엘니뇨: 바다의 열(<b>에너지</b>)이 대기로 → 영양염 공급 변화(<b>물질</b>). 빙하 감소: 탄소(<b>물질</b>)가 기권으로 → 열(<b>에너지</b>)이 빙하를 녹임. 산호 백화: 열(<b>에너지</b>)이 대기에서 바다로, 바다에서 산호로.',
        },
        {
          type: 'quiz', title: '왜 다른 권역까지 영향을 줄까?',
          goal: '한 권역의 변화가 <b>다른 권역에까지 영향</b>을 주는 까닭은 무엇일까요?',
          setup() { ensure('chain'); },
          choices: ['권역들이 서로 아무 관계가 없어서', '권역들이 물질 순환과 에너지 흐름으로 이어져 있어서', '모든 권역이 같은 물질로만 이루어져 있어서', '변화는 항상 같은 권역 안에서만 일어나서'],
          answer: 1,
          feedback: ['관계가 없다면 연쇄 현상이 일어나지 않아요. 사례에서는 모두 다른 권역에 영향이 갔어요.', '', '권역마다 구성 물질은 달라요. 서로 이어져 있다는 점이 중요해요.', '사례에서는 지권의 변화가 기권으로, 수권의 변화가 생물권으로 번졌어요.'],
          explain: '지구시스템의 권역들은 <b>물질 순환과 에너지 흐름</b>으로 서로 이어진 하나의 시스템이에요. 그래서 한 곳의 변화가 연쇄적으로 다른 곳에 영향을 줘요.',
        },
      ],
    },
    {
      title: '균형과 책임: 시나리오 비교', short: '균형과 책임', icon: '🌡️', phase: '적용', features: ['sim'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 권역의 변화가 물질 순환과 에너지 흐름을 따라 다른 권역으로 번지는 것을 봤어요. 지금 지구는 CO₂ 증가로 균형이 깨지고 있어요.</div>' +
        '<p><b>지구시스템 시뮬레이션</b>으로 온실가스(탄소) 배출량을 다르게 했을 때 2100년의 CO₂ 농도, 기온, 해수면, 산호초가 어떻게 달라지는지 비교해 봐요. (교육용으로 단순화한 모형이에요.) 데이터를 읽고 <b>근거</b>를 들어 말하는 연습도 해요.</p>',
      setup() { enterLevel(3); },
      recap: '배출량이 많을수록 CO₂ 농도, 기온, 해수면이 더 많이 오르고 산호초가 크게 줄어요. 지구시스템의 균형을 지키려면 개인과 사회가 함께 노력해야 해요.',
      summary: '<ul><li>시나리오 비교: 배출량 <b>많음</b> → 2100년 기온·해수면 상승 큼, 산호초 지수 낮음 / 배출량 <b>적음</b> → 상승 작음.</li><li>균형이 깨졌다는 증거는 <b>장기간·전 지구 자료</b>(CO₂ 농도, 평균 기온, 해수면)로 판단해요.</li><li>보전을 위한 실천: 에너지 절약·대중교통(개인), 재생 에너지 확대·국제 협력(사회). 미래 세대를 위한 <b>생태적 책임</b>이에요.</li></ul>',
      missions: [
        {
          title: '두 시나리오 비교하고 근거 고르기',
          goal: '배출량을 <b>많게(8 이상)</b> 한 번, <b>적게(3 이하)</b> 한 번 <b>▶ 2100년까지 실행</b>한 뒤, 결과에서 알 수 있는 <b>근거 문장 2개</b>를 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '슬라이더를 바꿔 두 번 실행하면 표에 두 줄이 생기고, 근거 문장 목록이 나타나요. 표와 그래프의 숫자를 비교해 보세요.',
          manual: true,
          setup() { ensure('sim'); },
          check() {
            if (S.simRun) return '시뮬레이션이 끝날 때까지 기다려 주세요.';
            if (!S.runs.length) return '먼저 <b>▶ 2100년까지 실행</b>을 눌러 보세요.';
            const hi = S.runs.some((r) => r.E >= 8), lo = S.runs.some((r) => r.E <= 3);
            if (S.runs.length < 2 || !hi || !lo) return '배출량을 <b>8 이상</b>과 <b>3 이하</b>로 한 번씩 실행해 비교해야 해요.';
            if (S.ev.size !== 2) return '근거 문장을 <b>2개</b> 골라 주세요. (지금 ' + S.ev.size + '개)';
            const wrong = [...S.ev].filter((i) => !EVS[i].ok);
            if (wrong.length) return EVS[wrong[0]].fb;
            if (!S.simOK) SciSim.tween(S, { simOK: 1 }, { duration: 0.5 });
            return true;
          },
          explain: '시나리오 1과 2를 비교하면 <b>배출량이 많을수록</b> 기온·해수면 상승이 크고 산호초가 더 줄어요. 배출을 줄여도 이미 쌓인 CO₂ 때문에 어느 정도는 오르지만, 훨씬 작아요. 근거(자료)로 주장하는 것이 논증이에요.',
        },
        {
          type: 'quiz', title: '균형이 깨졌다는 증거',
          goal: '지구시스템의 <b>균형이 깨지고 있다</b>는 증거로 가장 알맞은 자료는?',
          setup() { ensure('sim'); },
          choices: ['어제 하루 동안 비가 많이 왔다는 날씨 뉴스', '수십 년 동안 대기 중 CO₂ 농도, 지구 평균 기온, 해수면이 꾸준히 늘어난 전 지구 관측 자료', '올여름이 작년보다 하루 더 더웠다는 이야기', '어느 지역에 갑자기 태풍이 왔다는 보도'],
          answer: 1,
          feedback: ['하루의 날씨로는 지구 전체의 변화를 알 수 없어요.', '', '짧은 기간의 한 번의 차이는 자연스러운 변동일 수 있어요.', '한 번의 사건만으로는 지구 전체의 균형 변화를 말하기 어려워요.'],
          explain: '균형이 깨졌는지는 <b>오랜 기간</b>에 걸친 <b>전 지구 규모의 자료</b>(빅데이터, 시뮬레이션)로 판단해요. 한 번의 날씨나 사건이 아니라 꾸준한 변화 경향을 봐야 해요.',
        },
        {
          type: 'quiz', title: '미래 세대를 위한 행동',
          goal: '지구시스템을 <b>미래 세대를 위해 보전</b>하려면 어떻게 하는 것이 가장 알맞을까요?',
          setup() { ensure('sim'); },
          choices: ['기술이 해결해 줄 때까지 아무것도 하지 않고 기다린다', '개인의 실천(에너지 절약, 대중교통)과 재생 에너지 확대·국제 협력 같은 사회적 노력을 함께 한다', '이미 늦었으니 포기한다', '다른 나라가 줄이면 우리는 신경 쓰지 않아도 된다'],
          answer: 1,
          feedback: ['기다리는 동안에도 CO₂는 계속 쌓여요.', '', '시나리오 비교에서 배출을 줄일수록 피해가 작았어요. 포기할 필요가 없어요.', '지구시스템은 하나로 연결되어 있어서 모든 나라가 함께 책임져야 해요.'],
          explain: '지구시스템은 하나로 이어져 있어서 <b>개인의 실천</b>과 <b>사회적 노력(정책, 기술, 국제 협력)</b>이 함께 필요해요. 미래 세대를 위해 지구시스템을 최적의 상태로 보전하는 것은 우리의 <b>생태적 책임</b>이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-sphere-interaction', mount: '#game', badge: '순환 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { water: '💧 물의 순환 · 에너지 슬라이더 · 물방울 추적', carbon: '🌿 탄소 순환 모형 · 화석 연료 슬라이더', chain: '🔗 사례 카드 · 연결 고리 분석표', sim: '🌡️ 지구 시뮬레이션 · 시나리오 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  cgeo = CG();
  initWaterBoard(); initCarbonBoard(); resetCarbon(); mkWater(); S.runN = 0; S.csBad = null;
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.Ea = RM ? S.E : SciSim.approach(S.Ea, S.E, dt, 4);
    if (S.mode === 'water') stepWater(dt);
    if (S.mode === 'carbon' || S.mode === 'sim') { /* 탄소 모형은 탄소 화면에서만 흘러요 */ }
    if (S.mode === 'carbon') stepCarbon(dt);
    S.csT += dt;
    if (S.simRun) { S.simRun.k += dt * 50; if (S.simRun.k >= 300) { S.simRun.k = 300; finishSimRun(); updateCtl(); } }
    boards.water.step(dt); boards.carbon.step(dt); parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'water') drawWater(t, dt); else if (S.mode === 'carbon') drawCarbon(t, dt); else if (S.mode === 'chain') drawChain(t, dt); else drawSim(t, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  function put(B, c, s) { if (c.slot) c.slot.items.splice(c.slot.items.indexOf(c), 1); s.items.push(c); c.slot = s; c.free = false; B.layout(s); c.x = c.tx; c.y = c.ty; c.sc = c.tsc; c.bad = false; }
  window.__sim = {
    S, VW, VH, boards, WATER, get game() { return game; }, enterLevel, setMode, CASES, EVS, stepWater, simulateRun, carbonStep, C0,
    solve(kind, right) {
      const B = boards[kind]; B.items.forEach((c) => { const idx = right === false ? (c.ans + 1) % B.slots.length : c.ans; put(B, c, B.slots[idx]); });
    },
    chain(right) { CASES.forEach((c, i) => { S.csAns[i] = c.ans.map((a) => (right === false ? (a % 2) + 1 : a)); }); },
    runSim(E) { S.emit = E; startSimRun(); S.simRun.k = 299.9; },
  };
})();
