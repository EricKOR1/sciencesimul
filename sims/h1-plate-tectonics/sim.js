/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 판구조론 (단원 3차시)
   성취기준 [10통과1-03-02] 지권의 변화를 판구조론 관점에서 해석하고, 에너지 흐름의 결과로 발생하는 지권의 변화가
   지구시스템에 미치는 영향을 추론할 수 있다. (이번 차시: 판구조론으로 해석, 영향은 다음 차시)
   ① 관찰: 지진·화산 분포 (세계 지도, 판 경계와 겹쳐 보기)
   ② 모형: 맨틀 대류 (지구 내부 열 → 맨틀 대류 → 판 이동)
   ③ 탐구: 판의 경계 (발산·섭입·충돌·보존, 장소 짝짓기)
   ④ 분석: 이동 속도 (해저 암석 나이–거리, 하와이 열점)
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

  /* ======================================================
     자료: 판 경계 · 지진 · 화산 (교육용으로 단순화한 분포)
     ====================================================== */
  const BT = { div: { name: '발산형', col: '#f43f5e' }, sub: { name: '수렴형(섭입)', col: '#2563eb' }, coll: { name: '수렴형(충돌)', col: '#7c3aed' }, trans: { name: '보존형', col: '#16a34a' } };
  const SEGS = [
    { t: 'div', p: [[8, 80], [-5, 78], [-15, 72], [-20, 67], [-22, 64], [-30, 58], [-33, 52], [-30, 45], [-28, 38], [-35, 34], [-45, 26], [-46, 15], [-40, 8], [-31, 1], [-15, -6], [-13, -20], [-14, -35], [-10, -46], [-2, -53], [3, -54.5]] },
    { t: 'div', p: [[3, -54.5], [25, -52], [40, -47], [55, -38], [65, -30], [70, -20], [66, -8], [62, 1], [57, 12]] },
    { t: 'div', p: [[57, 12], [52, 12.5], [45, 12.5], [43, 12.5]] },
    { t: 'div', p: [[43, 12.5], [40, 15.5], [37, 20], [34.5, 26], [33.5, 28]] },
    { t: 'div', p: [[43, 12], [40, 8], [36, 2], [34, -5], [34, -12], [35, -17]] },
    { t: 'div', p: [[70, -25], [80, -36], [90, -40], [105, -47], [125, -50], [140, -52], [150, -60]] },
    { t: 'div', p: [[150, -60], [170, -65], [180, -64.5]] },
    { t: 'div', p: [[-180, -64.5], [-175, -64], [-155, -60], [-140, -56], [-125, -52]] },
    { t: 'div', p: [[-125, -52], [-118, -45], [-113, -33], [-112, -20], [-108, -8], [-104, 2], [-103, 10], [-106, 18], [-109, 23], [-112, 26.5], [-114.5, 31]] },
    { t: 'div', p: [[-105, -1], [-95, 2], [-85, 2.5]] },
    { t: 'div', p: [[-127, 40.5], [-127.5, 45], [-130, 50]] },
    { t: 'div', p: [[8, 80], [40, 85], [100, 86], [130, 80], [140, 76]] },
    { t: 'sub', side: 1, p: [[-148, 59.8], [-152, 58.5], [-158, 56], [-165, 54.3], [-172, 52.5], [-180, 51.8]] },
    { t: 'sub', side: 1, p: [[180, 51.8], [173, 52.3], [165, 53.5], [160, 52], [156, 48], [150, 44.5], [146, 41], [143, 38], [142.5, 34], [141.5, 30], [143, 24], [145, 19], [146, 14], [145, 12]] },
    { t: 'sub', side: 1, p: [[132, 31], [129, 28.5], [127, 26], [124, 24], [122, 23]] },
    { t: 'sub', side: 1, p: [[127, 12], [126.5, 7], [126, 3]] },
    { t: 'sub', side: -1, p: [[95, 5], [97, 0.5], [101, -3.5], [105, -6.5], [110, -9.2], [116, -10], [121, -10], [125, -9.5]] },
    { t: 'sub', side: 1, p: [[-173, -15], [-174.5, -21], [-176, -27], [-178, -32], [-179.5, -37]] },
    { t: 'sub', side: 1, p: [[179.5, -37.5], [178, -39], [175, -41.5], [172, -43]] },
    { t: 'sub', side: -1, p: [[155, -6], [160, -9], [166, -15], [168, -19]] },
    { t: 'sub', side: -1, p: [[-105, 18.5], [-100, 16.5], [-95, 14.5], [-91, 12.5], [-86, 11], [-83.5, 7.5]] },
    { t: 'sub', side: -1, p: [[-81.5, -1], [-80, -9], [-77.5, -13], [-72, -17.5], [-71, -24], [-71.8, -33], [-74, -40], [-75.5, -47], [-75.5, -52]] },
    { t: 'sub', side: -1, p: [[-80.5, 2], [-81.5, -1]] },
    { t: 'sub', side: 1, p: [[-125, 41], [-125, 45], [-125.5, 50.5]] },
    { t: 'sub', side: 1, p: [[-62, 18], [-61, 15], [-60.5, 12]] },
    { t: 'coll', p: [[-9, 36.5], [-2, 36.3], [6, 37], [12, 37.5], [15, 38], [19, 39.5], [22, 37], [27, 35.5], [32, 35.5], [36, 36.5], [40, 38], [44, 38], [47, 36], [50, 33], [54, 28], [57, 26], [60, 25.5], [63, 25.5]] },
    { t: 'coll', p: [[63, 25.5], [66, 28], [70, 34], [74, 36], [77, 35], [80, 31], [85, 28], [90, 27.5], [95, 28.5], [97, 27]] },
    { t: 'coll', p: [[97, 27], [96, 22], [94.5, 17], [94, 12], [95, 6]] },
    { t: 'coll', p: [[6, 44.5], [10, 46.5], [14, 46.8], [19, 47.8], [24, 47]] },
    { t: 'trans', p: [[-114.7, 32], [-118, 34.5], [-121, 36.5], [-123.5, 38.5], [-124.5, 40.3]] },
    { t: 'trans', p: [[168, -46], [171, -44], [174, -41.5]] },
    { t: 'trans', p: [[27, 40], [32, 40.7], [37, 40], [41, 39.5]] },
    { t: 'trans', p: [[35.5, 34], [35.3, 31], [35, 29.5]] },
    { t: 'trans', p: [[-90, 17], [-84, 18], [-77, 19.5], [-70, 19.7], [-64, 18.5]] },
    { t: 'trans', p: [[-135, 55], [-132, 52], [-131, 51]] },
  ];
  const HOTSPOTS = [[-155.5, 19.4], [-110.6, 44.4], [55.7, -21.2], [-91, -0.5], [-17, 28.3], [-149.5, -17.6], [-109, -27], [-170, -14], [-19, 64.5], [-25.5, 37.8], [3.5, -54.4], [-12.3, -37.1]];
  const OTHERV = [[128, 42], [126.5, 33.4], [44.3, 39.7], [42.4, 43.4], [52, 35.9], [15, 37.7], [14.4, 40.8], [25.4, 36.4], [8.8, 3.6], [29.2, -1.5], [36.5, -3.1], [14, 11]];
  const KOREA = [127.5, 36.5];
  const RM_ = rng(2026);
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += RM_(); return (s - 3) / 1.2247; };
  const segLenDeg = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
  function along(p, d) {
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= l || i === p.length - 1) { const f = Math.min(1, d / (l || 1)), tx = (p[i][0] - p[i - 1][0]) / (l || 1), ty = (p[i][1] - p[i - 1][1]) / (l || 1); return { x: p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, y: p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f, tx, ty }; }
      d -= l;
    }
  }
  const QUAKES = [], VOLC = [];
  (function () {
    const dens = { div: 1.4, sub: 2.4, coll: 1.8, trans: 1.9 }, sig = { div: 0.7, sub: 1.5, coll: 2.0, trans: 0.7 };
    SEGS.forEach((sg) => {
      const L = segLenDeg(sg.p), n = Math.round(L * dens[sg.t]);
      for (let i = 0; i < n; i++) {
        const q = along(sg.p, RM_() * L);
        if (sg.t === 'sub') { const dist = Math.abs(gauss()) * 1.7; QUAKES.push({ lon: q.x + q.ty * sg.side * dist, lat: q.y - q.tx * sg.side * dist, r: RM_(), m: 3.5 + RM_() * RM_() * 3.6, t: 'sub' }); }
        else { const off = gauss() * sig[sg.t]; QUAKES.push({ lon: q.x - q.ty * off, lat: q.y + q.tx * off, r: RM_(), m: 3.5 + RM_() * RM_() * 3.6, t: sg.t }); }
      }
      if (sg.t === 'sub') {
        const step = 0.9; for (let d = 0.5; d < L; d += step) { const q = along(sg.p, d + gauss() * 0.3), o = 2.4 + gauss() * 0.75; VOLC.push({ lon: q.x + q.ty * sg.side * o, lat: q.y - q.tx * sg.side * o + gauss() * 0.3, t: 'sub' }); }
      }
    });
    // 해령 화산(아이슬란드·아조레스·동아프리카 열곡)
    [[-19, 64.5], [-17, 65], [-22, 63.8], [-25.5, 37.8], [-28, 38.5], [-16.5, 28.3]].forEach((q) => VOLC.push({ lon: q[0], lat: q[1], t: 'div' }));
    SEGS.filter((s) => s.t === 'div').slice(3, 5).forEach((sg) => { const L = segLenDeg(sg.p); for (let i = 0; i < 9; i++) { const q = along(sg.p, RM_() * L); VOLC.push({ lon: q.x + gauss() * 0.5, lat: q.y + gauss() * 0.5, t: 'div' }); } });
    HOTSPOTS.forEach((q) => VOLC.push({ lon: q[0], lat: q[1], t: 'hot' })); OTHERV.forEach((q) => VOLC.push({ lon: q[0], lat: q[1], t: 'oth' }));
    // 판 내부의 약한 지진
    const LAND = (window.WORLD && window.WORLD.land) || []; let g = 0;
    let nIn = 0; while (nIn < 40 && g++ < 6000) { const lo = -160 + RM_() * 320, la = -50 + RM_() * 110; if (LAND.slice(0, 5).some((P, i) => i !== 4 && pip(P, lo, la))) { QUAKES.push({ lon: lo, lat: la, r: RM_(), m: 3.2 + RM_() * RM_() * 2, t: 'intra' }); nIn++; } }
  })();
  function pip(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  // 판 경계에서 가까운 지진의 비율
  function distToBoundary(lon, lat) {
    let best = 1e9;
    SEGS.forEach((sg) => { for (let i = 1; i < sg.p.length; i++) { const a = sg.p[i - 1], b = sg.p[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = clamp(((lon - a[0]) * dx + (lat - a[1]) * dy) / L2, 0, 1), d = Math.hypot(lon - (a[0] + dx * t), lat - (a[1] + dy * t)); if (d < best) best = d; } });
    return best;
  }
  const NEARQ = Math.round(QUAKES.filter((q) => distToBoundary(q.lon, q.lat) <= 3.5).length / QUAKES.length * 100);
  function countNear(lon, lat, R) { let q = 0, v = 0; QUAKES.forEach((a) => { if (Math.hypot(a.lon - lon, a.lat - lat) <= R) q++; }); VOLC.forEach((a) => { if (Math.hypot(a.lon - lon, a.lat - lat) <= R) v++; }); return { q, v }; }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'map', clock: 0, fade: 0, bsub: 'explore',
    lay: { eq: false, vol: false, bnd: false }, layA: { eq: 0, vol: 0, bnd: 0 }, pick: null, pickA: 0,
    heat: 0, heatT: 0, pred: { L: 0, R: 0 }, predOK: 0, platePh: 0, convSeen: 0,
    mot: null, conv: 'sub', seen: new Set(), seenT: {}, bt: 0, matchOK: 0,
    sp: 'ridge', drilled: new Set(), dAnim: {}, lastSite: -1, hawT: 0, hawPlay: false, hawMeasured: new Set(), hawDir: null, speedOK: 0, hawOK: 0,
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const boardsB = new Board();

  /* ======================================================
     화면 1: 지진·화산 분포 지도
     ====================================================== */
  const MAPR = PHONE ? { x: 10, y: 12, w: 580, h: 250 } : { x: 10, y: 8, w: 780, h: 336 };
  const mx = (lon) => MAPR.x + (lon + 180) / 360 * MAPR.w, my = (lat) => MAPR.y + (85 - lat) / 155 * MAPR.h;
  const LANDP = (window.WORLD && window.WORLD.land) || [];
  const PICK_R = 5;
  function drawMapScene(t, dt) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    const R = MAPR;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    ctx.fillStyle = '#cfe7fb'; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.strokeStyle = 'rgba(100,130,170,.25)'; ctx.lineWidth = 1;
    for (let lo = -150; lo <= 150; lo += 30) { ctx.beginPath(); ctx.moveTo(mx(lo), R.y); ctx.lineTo(mx(lo), R.y + R.h); ctx.stroke(); }
    for (let la = -60; la <= 60; la += 30) { ctx.beginPath(); ctx.moveTo(R.x, my(la)); ctx.lineTo(R.x + R.w, my(la)); ctx.stroke(); }
    LANDP.forEach((P) => { ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(mx(q[0]), my(q[1])) : ctx.moveTo(mx(q[0]), my(q[1])))); ctx.closePath(); ctx.fillStyle = '#e9dfc4'; ctx.fill(); ctx.strokeStyle = '#b9a97d'; ctx.lineWidth = 1; ctx.stroke(); });
    ((window.WORLD && window.WORLD.seas) || []).forEach((P) => { ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(mx(q[0]), my(q[1])) : ctx.moveTo(mx(q[0]), my(q[1])))); ctx.closePath(); ctx.fillStyle = '#cfe7fb'; ctx.fill(); });
    const sc = R.w / 780;
    // 판 경계
    if (S.layA.bnd > 0.02) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      SEGS.forEach((sg) => {
        const nlen = segLenDeg(sg.p) * S.layA.bnd; let acc = 0;
        ctx.beginPath(); ctx.moveTo(mx(sg.p[0][0]), my(sg.p[0][1]));
        for (let i = 1; i < sg.p.length; i++) { const l = Math.hypot(sg.p[i][0] - sg.p[i - 1][0], sg.p[i][1] - sg.p[i - 1][1]); if (acc + l > nlen) { const f = (nlen - acc) / l; ctx.lineTo(mx(sg.p[i - 1][0] + (sg.p[i][0] - sg.p[i - 1][0]) * f), my(sg.p[i - 1][1] + (sg.p[i][1] - sg.p[i - 1][1]) * f)); break; } ctx.lineTo(mx(sg.p[i][0]), my(sg.p[i][1])); acc += l; }
        ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineWidth = 4.6 * sc + 1; ctx.stroke(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.4 * sc + 0.6; ctx.stroke();
      });
    }
    // 지진
    if (S.layA.eq > 0.02) {
      const f = S.layA.eq, rs = (0.6 + 0.4 * sc);
      if (f >= 1.0) {
        [['rgba(249,115,22,.55)', false], ['rgba(220,38,38,.75)', true]].forEach(([col, big]) => {
          ctx.fillStyle = col; ctx.beginPath();
          QUAKES.forEach((q) => { if ((q.m > 5.4) !== big) return; const x = mx(q.lon), y = my(q.lat), rad = (1.1 + (q.m - 3.2) * 0.55) * rs; ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.3); });
          ctx.fill();
        });
      } else QUAKES.forEach((q) => {
        if (q.r > f) return; const a = clamp((f - q.r) * 8, 0, 1), rad = (1.1 + (q.m - 3.2) * 0.55) * rs * (a < 1 ? 1 + (1 - a) * 2.5 : 1);
        ctx.fillStyle = q.m > 5.4 ? 'rgba(220,38,38,' + 0.75 * a + ')' : 'rgba(249,115,22,' + 0.55 * a + ')'; ctx.beginPath(); ctx.arc(mx(q.lon), my(q.lat), rad, 0, 6.3); ctx.fill();
      });
    }
    // 화산
    if (S.layA.vol > 0.02) {
      const f = S.layA.vol; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)';
      VOLC.forEach((v, i) => { const r = ((i * 0.6180339) % 1); if (r > f) return; const x = mx(v.lon), y = my(v.lat), s = (3.6 + (v.t === 'hot' ? 1 : 0)) * (0.7 + 0.3 * sc) * (1 + Math.max(0, 0.15 - (f - r)) * 6); ctx.fillStyle = v.t === 'hot' ? '#7c2d12' : '#b91c1c'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x - s, y + s * 0.8); ctx.lineTo(x + s, y + s * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    }
    // 한반도 표시
    const kx = mx(KOREA[0]), ky = my(KOREA[1]);
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(kx, ky, 5.5, 0, 6.3); ctx.stroke(); D.sphere(kx, ky, 2.8, '#1d4ed8', { gloss: false });
    D.label(clamp(kx - 36, R.x + 40, R.x + R.w - 40), ky - 17, '대한민국', { bg: '#1d4ed8', size: 12.5 });
    // 누른 곳
    if (S.pick) {
      const px = mx(S.pick.lon), py = my(S.pick.lat), rad = PICK_R * R.w / 360, pul = 1 + 0.06 * Math.sin(t * 5);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(px, py, rad * pul, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 18; ctx.beginPath(); ctx.arc(px, py, rad * pul, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
    // 아래 패널
    const py0 = R.y + R.h + 12, ph = VH - py0 - 8, nq = Math.round(QUAKES.length * Math.min(1, S.layA.eq)), nv = Math.round(VOLC.length * Math.min(1, S.layA.vol));
    const card = (x, y, w, h, title, big, sub, col) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
      ctx.fillStyle = col; rr(x, y, 8, h, 4).fill();
      TX(x + 22, y + 22, title, { size: 14, color: '#475569', weight: 800, align: 'left' });
      TX(x + 22, y + 52, big, { size: 25, color: '#0f172a', weight: 800, align: 'left' });
      if (sub) para(x + 22, y + 52 + (PHONE ? 22 : 17), sub, w - 34, 12.5, { color: '#64748b', weight: 700, align: 'left' });
    };
    const cw = PHONE ? 186 : 250, gap = PHONE ? 10 : 14, ch = PHONE ? 118 : 82;
    card(R.x, py0, cw, ch, '● 지진 (진앙)', nq.toLocaleString('ko-KR') + '개', '교육용으로 단순화한 자료', '#f97316');
    card(R.x + cw + gap, py0, cw, ch, '▲ 화산', nv + '개', '활화산·휴화산 포함', '#b91c1c');
    card(R.x + 2 * (cw + gap), py0, cw, ch, '━ 판 경계 근처', S.layA.eq > 0.5 ? '약 ' + NEARQ + ' %' : '—', PHONE ? '지진이 경계 약 400 km 이내' : '경계 400 km 안의 지진 비율', '#eab308');
    const by = py0 + ch + 10;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(R.x, by, R.w, PHONE ? 140 : VH - by - 8, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
    if (S.pick) {
      const c = countNear(S.pick.lon, S.pick.lat, PICK_R);
      TX(R.x + 18, by + 26, '🎯 누른 곳 둘레 (반경 약 550 km)', { size: 14.5, color: '#334155', weight: 800, align: 'left' });
      TX(R.x + 18, by + 58, '지진 ' + (S.lay.eq ? c.q + '개' : '(지진 자료를 켜세요)') + '   ·   화산 ' + (S.lay.vol ? c.v + '개' : '(화산 자료를 켜세요)'), { size: 19, color: '#0f172a', weight: 800, align: 'left' });
      const korea = Math.hypot(S.pick.lon - KOREA[0], S.pick.lat - KOREA[1]) < 2.5;
      para(R.x + 18, by + 84, korea ? '한반도는 유라시아판 안쪽이라 판 경계에서 멀어서 지진이 드물고 화산도 대부분 활동이 거의 없어요.' : (c.q + c.v >= 8 ? '지진과 화산이 많이 모여 있어요. 가까이에 판 경계가 있어요.' : c.q + c.v === 0 ? '지진과 화산이 거의 없어요. 판의 안쪽일 거예요.' : '조금 있어요. 판 경계에서 얼마나 떨어져 있는지 살펴봐요.'), R.w - 36, 13.5, { color: '#0f766e', weight: 800, align: 'left' });
    } else {
      TX(R.x + R.w / 2, by + (PHONE ? 50 : 38), '👆 지도를 눌러 그 둘레의 지진·화산 수를 알아봐요', { size: 15, color: '#475569', weight: 800 });
      D.label(R.x + R.w / 2, by + (PHONE ? 92 : 74), '🇰🇷 대한민국 주변 보기', { bg: '#1d4ed8', size: 14 });
      S.korBtn = { x: R.x + R.w / 2 - 90, y: by + (PHONE ? 78 : 60), w: 180, h: 28 };
    }
    if (S.pick) S.korBtn = null;
  }

  /* ======================================================
     화면 2: 맨틀 대류와 판의 이동
     ====================================================== */
  const FK = PHONE ? VW / 800 : 1, FY0 = PHONE ? 56 : 0;
  const figBegin = () => { ctx.save(); ctx.translate(0, FY0); ctx.scale(FK, FK); };
  const figEnd = () => ctx.restore();
  const F = (x, y, s, o) => TX(x, y, s, Object.assign({}, o, { size: (o.size || 14) / FK }));
  const FL = (x, y, s, o) => D.label(x, y, s, Object.assign({}, o, { size: (o.size || 13) / FK }));
  const CV = { x0: 80, x1: 720, y0: 166, y1: 440 }; CV.W = CV.x1 - CV.x0; CV.H = CV.y1 - CV.y0;
  const SLABL = [[400, 148], [136, 148], [112, 158], [88, 200], [62, 266]];
  const slabR = SLABL.map((q) => [800 - q[0], q[1]]);
  const CP = [];
  function seedConv() { CP.length = 0; for (let i = 0; i < 260; i++) CP.push({ x: CV.x0 + Math.random() * CV.W, y: CV.y0 + Math.random() * CV.H, T: 0.5 }); }
  seedConv();
  function flowAt(x, y, vs) {
    const xp = x - CV.x0, yp = CV.y1 - y, a = 2 * Math.PI * xp / CV.W, b = Math.PI * yp / CV.H;
    return { u: vs * Math.sin(a) * Math.cos(b), v: -(vs * 2 * CV.H / CV.W) * Math.cos(a) * Math.sin(b) * -1 * -1 };
  }
  function stepConv(dt) {
    const h = S.heat, vs = 60 * h;
    CP.forEach((p) => {
      if (vs > 0.01) {
        const f1 = flowAt(p.x, p.y, vs), mx_ = p.x + f1.u * dt * 0.5, my_ = p.y - f1.v * dt * 0.5, f2 = flowAt(mx_, my_, vs);
        p.x += f2.u * dt; p.y -= f2.v * dt;
      }
      const yp = CV.y1 - p.y;
      if (yp < CV.H * 0.16) p.T += (1 - p.T) * Math.min(1, 1.4 * dt * (0.2 + h)); else if (yp > CV.H * 0.84) p.T += (0 - p.T) * Math.min(1, 1.6 * dt * (0.2 + h)); else p.T += (0.5 - p.T) * Math.min(1, 0.05 * dt);
      if (p.x < CV.x0 || p.x > CV.x1 || p.y < CV.y0 || p.y > CV.y1) { p.x = CV.x0 + Math.random() * CV.W; p.y = CV.y0 + Math.random() * CV.H; p.T = 0.5; }
    });
    S.platePh += (S.heat * 8 * 4.8) * dt;
  }
  const plateCm = () => S.heat * 8;
  function strokePath(pts, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
  function plateBand(pts, ph, dir, base, light) {
    strokePath(pts, 36, base);
    ctx.save(); ctx.setLineDash([24, 24]); ctx.lineDashOffset = -ph; strokePath(pts, 36, light); ctx.restore(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] - 18) : ctx.moveTo(q[0], q[1] - 18))); ctx.stroke();
  }
  function drawConvect(t, dt) {
    ctx.fillStyle = '#dff0ff'; ctx.fillRect(0, 0, VW, VH);
    figBegin();
    const h = S.heat, sk = ctx.createLinearGradient(0, 0, 0, 110); sk.addColorStop(0, '#b6dcff'); sk.addColorStop(1, '#e6f4ff'); ctx.fillStyle = sk; ctx.fillRect(0, 0, 800, 110);
    // 바다
    ctx.fillStyle = '#4aa8f0'; ctx.fillRect(130, 104, 540, 28); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(130, 104, 540, 2.5);
    // 맨틀
    const mg = ctx.createLinearGradient(0, CV.y0, 0, 450); mg.addColorStop(0, '#c4562a'); mg.addColorStop(0.5, SciSim.color.mix('#8a3a20', '#c2410c', h)); mg.addColorStop(1, SciSim.color.mix('#b45309', '#f59e0b', h));
    ctx.fillStyle = mg; ctx.fillRect(16, CV.y0, 768, 450 - CV.y0);
    // 외핵 (열원)
    const cg = ctx.createLinearGradient(0, 440, 0, 540); cg.addColorStop(0, SciSim.color.mix('#f59e0b', '#fde047', h)); cg.addColorStop(1, SciSim.color.mix('#b45309', '#ea580c', h));
    ctx.fillStyle = cg; ctx.fillRect(16, 440, 768, 100);
    D.glow(400, 470, 340, '#fde047', 0.1 + 0.5 * h);
    F(400, 500, '외핵 (뜨거운 열원)', { size: 15, color: '#78350f', weight: 800 });
    // 대류 화살표와 입자
    CP.forEach((p) => { const c2 = p.T < 0.5 ? SciSim.color.mix('#3b6fff', '#ffe2a0', clamp(p.T / 0.5, 0, 1)) : SciSim.color.mix('#ffe2a0', '#ff3b1f', clamp((p.T - 0.5) / 0.5, 0, 1)); ctx.fillStyle = h > 0.01 ? c2 : 'rgba(255,220,170,.55)'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 6.3); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (h > 0.05) {
      const arrows = [[0.5, 0.5, 0, -1], [0.0, 0.5, 0, 1], [1.0, 0.5, 0, 1], [0.25, 0.88, -1, 0], [0.75, 0.88, 1, 0], [0.25, 0.12, 1, 0], [0.75, 0.12, -1, 0]];
      arrows.forEach(([fx, fy, dx, dy]) => { const x = CV.x0 + fx * CV.W + (fx === 0 ? 34 : fx === 1 ? -34 : 0), y = CV.y1 - fy * CV.H, L = 28 + 34 * h; D.arrow(x - dx * L / 2, y - dy * L / 2, x + dx * L / 2, y + dy * L / 2, { color: 'rgba(255,255,255,.95)', width: 5, head: 14 }); });
      if (!PHONE) F(420, CV.y0 + 128, '뜨거운 맨틀은 올라가요', { size: 14, color: '#fff', weight: 800, align: 'left', stroke: 'rgba(120,40,0,.6)', strokeWidth: 4 });
      if (!PHONE) { F(158, CV.y0 + 102, '식은 맨틀은', { size: 13.5, color: '#fff', weight: 800, stroke: 'rgba(0,40,100,.6)', strokeWidth: 4 }); F(158, CV.y0 + 120, '가라앉아요', { size: 13.5, color: '#fff', weight: 800, stroke: 'rgba(0,40,100,.6)', strokeWidth: 4 }); }
      // 열 화살표 (핵 → 맨틀)
      ctx.strokeStyle = 'rgba(255,240,170,' + (0.4 + 0.5 * h) + ')'; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const x = 120 + i * 70, ph = (t * 40 * (0.3 + h) + i * 17) % 40; D.arrow(x, 438 - ph * 0.2, x, 410 - ph * 0.2, { color: 'rgba(255,240,170,' + (0.2 + 0.7 * h * (1 - ph / 40)) + ')', width: 3, head: 9 }); }
    }
    // 대륙 블록과 해양판
    const cont = (x0, x1) => { ctx.fillStyle = '#9c7a4a'; ctx.fillRect(x0, 108, x1 - x0, 58); ctx.fillStyle = '#6aa04a'; ctx.fillRect(x0, 104, x1 - x0, 8); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x0, 148, x1 - x0, 18); };
    cont(16, 134); cont(666, 784);
    F(70, 142, '대륙', { size: 14, color: '#fff', weight: 800 }); F(730, 142, '대륙', { size: 14, color: '#fff', weight: 800 });
    plateBand(SLABL.map((q, i) => (i === 0 ? [396, q[1]] : q)), S.platePh, -1, '#4b5d72', '#6b82a0');
    plateBand(slabR.map((q, i) => (i === 0 ? [404, q[1]] : q)), S.platePh, 1, '#4b5d72', '#6b82a0');
    // 해령: 마그마가 올라와 새 판이 생겨요
    ctx.fillStyle = SciSim.color.mix('#7c2d12', '#ff6a1a', h); ctx.beginPath(); ctx.moveTo(396, 166); ctx.lineTo(396, 130); ctx.lineTo(404, 130); ctx.lineTo(404, 166); ctx.closePath(); ctx.fill();
    D.glow(400, 138, 34, '#ff7a1a', 0.2 + 0.7 * h);
    ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(372, 132); ctx.lineTo(400, 112); ctx.lineTo(428, 132); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SciSim.color.mix('#7c2d12', '#ff6a1a', h); ctx.beginPath(); ctx.moveTo(396, 118); ctx.lineTo(400, 112); ctx.lineTo(404, 118); ctx.lineTo(404, 132); ctx.lineTo(396, 132); ctx.closePath(); ctx.fill();
    // 화산 (대륙 위, 섭입대 위)
    [[74, 1], [726, 1]].forEach(([x]) => { ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.moveTo(x - 16, 106); ctx.lineTo(x - 4, 80); ctx.lineTo(x + 4, 80); ctx.lineTo(x + 16, 106); ctx.closePath(); ctx.fill(); if (h > 0.15) { ctx.fillStyle = 'rgba(255,110,30,' + h + ')'; ctx.fillRect(x - 3, 80, 6, 6); } });
    if (h > 0.2 && !RM && Math.random() < dt * 14 * h) { [74, 726].forEach((x) => parts.emit({ x: x * FK, y: 78 * FK + FY0, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 40, life: 0.9, size: 3, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', gravity: 120 })); }
    // 판 이동 방향 화살표
    if (h > 0.05) { const L = 34 + 50 * h; D.arrow(300, 190, 300 - L, 190, { color: '#fde047', width: 7, head: 16 }); D.arrow(500, 190, 500 + L, 190, { color: '#fde047', width: 7, head: 16 }); if (!PHONE) { F(260, 214, '판(암석권) 이동', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 }); F(540, 214, '판(암석권) 이동', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 }); } }
    // 이름표
    FL(400, 96, '해령', { bg: '#1e293b' }); FL(150, 96, '해구', { bg: '#1e3a8a' }); FL(650, 96, '해구', { bg: '#1e3a8a' });
    if (!PHONE) { F(250, 122, '해양판(판 = 암석권)', { size: 13.5, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 }); F(552, 122, '해양판(판 = 암석권)', { size: 13.5, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 }); }
    F(400, 292, '맨틀', { size: 18, color: 'rgba(255,255,255,.55)', weight: 800 });
    // 내 예상 화살표
    [['L', 250], ['R', 550]].forEach(([k, x]) => { const d = S.pred[k]; if (!d) return; const ok = S.predOK > 0.5 && d === (k === 'L' ? -1 : 1); D.arrow(x - d * 40, 70, x + d * 40, 70, { color: ok ? '#16a34a' : '#7c3aed', width: 6, head: 14, dash: ok ? null : [8, 6] }); F(x, 52, (k === 'L' ? '왼쪽' : '오른쪽') + ' 판 예상', { size: 13.5, color: ok ? '#166534' : '#5b21b6', weight: 800 }); });
    figEnd();
    // 위쪽 에너지 흐름 칩
    const chips = ['지구 내부 열', '맨틀 대류', '판 이동', '지진·화산·산맥'], lv = [h > 0.03, h > 0.1, h > 0.1, h > 0.25];
    const cw = PHONE ? 134 : 172, gap = PHONE ? 12 : 22, x0 = VW / 2 - (4 * cw + 3 * gap) / 2;
    chips.forEach((c, i) => {
      const x = x0 + i * (cw + gap) + cw / 2, on = lv[i];
      D.shadow(() => { ctx.fillStyle = on ? '#ea580c' : 'rgba(255,255,255,.9)'; rr(x - cw / 2, 8, cw, 34, 17).fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.25)' });
      TX(x, 31, c, { size: PHONE ? 13 : 14, color: on ? '#fff' : '#64748b', weight: 800 });
      if (i < 3) TX(x + cw / 2 + gap / 2, 33, '›', { size: 22, color: '#94a3b8', weight: 800 });
    });
    // 속도 표시
    const sy = FY0 + (PHONE ? 560 * FK + 12 : 0);
    if (!PHONE) { D.label(400, 68, '판 이동 속도  약 ' + plateCm().toFixed(1) + ' cm/년', { bg: h > 0.02 ? '#b45309' : '#64748b', size: 15 }); }
    else {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(12, sy, 576, 120, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
      TX(24, sy + 30, '판 이동 속도', { size: 14, color: '#475569', weight: 800, align: 'left' }); TX(576, sy + 32, '약 ' + plateCm().toFixed(1) + ' cm/년', { size: 22, color: '#b45309', weight: 800, align: 'right' });
      para(24, sy + 62, '열이 많을수록 맨틀이 빨리 돌고, 그 위의 판도 빨리 움직여요. 손톱이 자라는 속도와 비슷해요.', 552, 13.5, { color: '#334155', weight: 700, align: 'left' });
    }
  }

  /* ======================================================
     화면 3: 판의 경계 (발산 · 섭입 · 충돌 · 보존)
     ====================================================== */
  const BG_Y = 130, SEA = 104;
  function offsetPath(pts, d) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] + d * dy / L, p[1] - d * dx / L];
    });
  }
  const P_SUB = [[-30, 148], [318, 148], [350, 158], [400, 194], [560, 300], [650, 360]];
  const O_SUB = offsetPath(P_SUB, 18);
  const SLAB_Y = (x) => { for (let i = 1; i < P_SUB.length; i++) if (x <= P_SUB[i][0]) return P_SUB[i - 1][1] + (P_SUB[i][1] - P_SUB[i - 1][1]) * (x - P_SUB[i - 1][0]) / (P_SUB[i][0] - P_SUB[i - 1][0]); return 360; };
  const SUBQ = Array.from({ length: 46 }, (_, i) => ({ x: 340 + Math.random() * 300, ph: Math.random() * 8, d: Math.random() }));
  const BNAME = { div: ['발산형 경계', '두 판이 멀어져요 → 해령·열곡대'], sub: ['수렴형 경계 (섭입형)', '해양판이 대륙판 아래로 가라앉아요 → 해구·화산대'], coll: ['수렴형 경계 (충돌형)', '대륙판끼리 부딪혀요 → 습곡산맥'], trans: ['보존형 경계', '두 판이 어긋나게 스쳐요 → 변환 단층'] };
  const BINFO = {
    div: [['지형', '해령, 열곡대 (새 해양 지각이 만들어져요)'], ['지진', '얕은 지진'], ['화산', '화산 활동이 있어요 (해저 화산 등)']],
    sub: [['지형', '해구, 호상 열도, 화산대'], ['지진', '얕은 곳부터 깊은 곳까지'], ['화산', '화산 활동이 활발해요']],
    coll: [['지형', '높은 습곡산맥 (히말라야, 알프스)'], ['지진', '얕은~중간 깊이 지진'], ['화산', '화산이 거의 없어요']],
    trans: [['지형', '변환 단층 (산안드레아스 단층)'], ['지진', '얕은 지진'], ['화산', '화산이 없어요']],
  };
  const bKey = () => (S.mot === 'conv' ? S.conv : S.mot);
  function drawBoundaryScene(t, dt) {
    const k = bKey(); ctx.fillStyle = '#e8f1fb'; ctx.fillRect(0, 0, VW, VH);
    figBegin();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 800, 380); ctx.clip();
    const sk = ctx.createLinearGradient(0, 0, 0, 120); sk.addColorStop(0, '#b6dcff'); sk.addColorStop(1, '#e6f4ff');
    if (k === 'trans') drawTrans(t);
    else {
      ctx.fillStyle = sk; ctx.fillRect(0, 0, 800, 380);
      const mg = ctx.createLinearGradient(0, 166, 0, 380); mg.addColorStop(0, '#c4562a'); mg.addColorStop(1, '#f59e0b'); ctx.fillStyle = mg; ctx.fillRect(0, 166, 800, 214);
      if (k === 'div') drawDiv(t, dt); else if (k === 'sub') drawSub(t, dt); else if (k === 'coll') drawColl(t, dt); else drawNone(t);
    }
    ctx.restore();
    if (k) { FL(14 + 0, 22, BNAME[k][0], { bg: BT[k].col, align: 'left', size: 15 }); if (!PHONE) F(16, 52, BNAME[k][1], { size: 14, color: '#1e293b', weight: 800, align: 'left', stroke: 'rgba(255,255,255,.8)', strokeWidth: 4 }); }
    figEnd();
    // 아래 패널
    const py = FY0 + 380 * FK + (PHONE ? 8 : 12);
    if (S.bsub === 'match') drawMatchPanel(py, t); else drawInfoPanel(py, k);
  }
  function drawNone(t) {
    ctx.fillStyle = '#4b5d72'; ctx.fillRect(40, 130, 350, 36); ctx.fillRect(410, 130, 350, 36);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; F(400, 100, '두 판의 상대 운동 방향을 골라 보세요', { size: 18, color: '#1e293b', weight: 800 });
    F(215, 154, '판 A', { size: 16, color: '#fff', weight: 800 }); F(585, 154, '판 B', { size: 16, color: '#fff', weight: 800 });
    F(400, 290, '↔  →←  ↕', { size: 40, color: 'rgba(255,255,255,.7)', weight: 800 });
  }
  function drawDiv(t, dt) {
    const v = 30, ph = S.bt * v;
    ctx.fillStyle = '#4aa8f0'; ctx.fillRect(0, SEA, 800, 30);
    D.glow(400, 190, 150, '#ff7a1a', 0.5);
    ctx.fillStyle = 'rgba(255,120,30,.85)'; ctx.beginPath(); ctx.moveTo(396, 166); ctx.quadraticCurveTo(380, 210, 340, 260); ctx.lineTo(460, 260); ctx.quadraticCurveTo(420, 210, 404, 166); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) { const y = 250 - ((t * 60 + i * 40) % 160); D.arrow(400 + (i - 2) * 16, y + 40, 400 + (i - 2) * 14, y, { color: 'rgba(255,255,255,.8)', width: 4, head: 10 }); }
    strokePath([[396, 148], [-30, 148]], 36, '#4b5d72'); strokePath([[404, 148], [830, 148]], 36, '#4b5d72');
    ctx.save(); ctx.setLineDash([24, 24]); ctx.lineDashOffset = -ph; strokePath([[396, 148], [-30, 148]], 36, '#6b82a0'); strokePath([[404, 148], [830, 148]], 36, '#6b82a0'); ctx.restore(); ctx.setLineDash([]);
    // 열곡대와 해령
    ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(330, 130); ctx.lineTo(372, 112); ctx.lineTo(396, 124); ctx.lineTo(396, 132); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(470, 130); ctx.lineTo(428, 112); ctx.lineTo(404, 124); ctx.lineTo(404, 132); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6a1a'; ctx.fillRect(396, 122, 8, 44); D.glow(400, 124, 26, '#ff7a1a', 0.9);
    if (!RM && Math.random() < dt * 12) parts.emit({ x: 400 * FK, y: 120 * FK + FY0, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 30, life: 0.8, size: 3, color: '#fb923c', gravity: 100 });
    // 얕은 지진
    for (let i = 0; i < 6; i++) { const ph2 = (t * 1.4 + i * 0.37) % 1; ctx.strokeStyle = 'rgba(250,204,21,' + (1 - ph2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(400 + Math.sin(i * 3.1) * 36, 142 + (i % 3) * 8, 4 + ph2 * 14, 0, 6.3); ctx.stroke(); }
    D.arrow(300, 90, 220, 90, { color: '#fde047', width: 6, head: 14 }); D.arrow(500, 90, 580, 90, { color: '#fde047', width: 6, head: 14 });
    FL(400, 84, '해령 · 열곡', { bg: '#7f1d1d' }); F(200, 192, '새 해양 지각이 만들어져 양쪽으로 퍼져요', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 });
    F(560, 192, '', { size: 12 }); if (!PHONE) FL(520, 128, '얕은 지진', { bg: '#a16207' }); F(400, 300, '맨틀 물질이 올라와요', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 });
  }
  function drawSub(t, dt) {
    const ph = S.bt * 30;
    // 맨틀 쐐기 위의 대륙과 해수
    ctx.fillStyle = '#4aa8f0'; ctx.fillRect(0, SEA, 430, 70);
    // 판
    strokePath(P_SUB, 36, '#4b5d72'); ctx.save(); ctx.setLineDash([24, 24]); ctx.lineDashOffset = -ph; strokePath(P_SUB, 36, '#6b82a0'); ctx.restore(); ctx.setLineDash([]);
    // 대륙
    let iI = 0; for (let i = 3; i < O_SUB.length - 1; i++) if (O_SUB[i][1] <= 200 && O_SUB[i + 1][1] > 200) { iI = i; break; }
    const a = O_SUB[iI], b = O_SUB[iI + 1], fI = (200 - a[1]) / (b[1] - a[1]), I = [a[0] + (b[0] - a[0]) * fI, 200];
    ctx.beginPath(); ctx.moveTo(O_SUB[2][0], O_SUB[2][1]); [[368, 124], [400, 108], [450, 98], [780, 96], [780, 200]].forEach((q) => ctx.lineTo(q[0], q[1])); ctx.lineTo(I[0], I[1]); for (let i = iI; i >= 2; i--) ctx.lineTo(O_SUB[i][0], O_SUB[i][1]); ctx.closePath();
    const cg = ctx.createLinearGradient(0, 96, 0, 200); cg.addColorStop(0, '#a98557'); cg.addColorStop(1, '#7f6240'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#5f9a44'; ctx.lineWidth = 5; ctx.beginPath(); [[368, 124], [400, 108], [450, 98], [780, 96]].forEach((q, i) => (i ? ctx.lineTo(q[0], q[1] - 2) : ctx.moveTo(q[0], q[1] - 2))); ctx.stroke();
    // 마그마와 화산
    const vx = 530, sy0 = SLAB_Y(vx) - 20;
    D.glow(vx, 205, 46, '#ff7a1a', 0.55); ctx.fillStyle = 'rgba(255,100,20,.9)'; ctx.beginPath(); ctx.moveTo(vx - 5, sy0); ctx.lineTo(vx - 4, 112); ctx.lineTo(vx + 4, 112); ctx.lineTo(vx + 5, sy0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(vx, 198, 18, 10, 0, 0, 6.3); ctx.fillStyle = 'rgba(255,120,30,.95)'; ctx.fill();
    [[vx, 2], [vx - 70, 1], [vx + 70, 1]].forEach(([x, big]) => { const y0 = (x === vx ? 98 : 97); ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.moveTo(x - 20 * big, y0); ctx.lineTo(x - 5 * big, y0 - 30 * big); ctx.lineTo(x + 5 * big, y0 - 30 * big); ctx.lineTo(x + 20 * big, y0); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = '#ff6a1a'; ctx.fillRect(vx - 4, 62, 8, 6);
    if (!RM && Math.random() < dt * 16) parts.emit({ x: vx * FK, y: 64 * FK + FY0, vx: (Math.random() - 0.5) * 50, vy: -50 - Math.random() * 40, life: 0.9, size: 3.4, color: Math.random() < 0.5 ? '#fb923c' : '#fde047', gravity: 120 });
    // 지진 (섭입대를 따라 점점 깊어져요)
    SUBQ.forEach((q) => { const f = (Math.sin(t * 2 + q.ph) + 1) / 2; if (f < 0.35) return; const y = SLAB_Y(q.x), dep = clamp((y - 148) / 210, 0, 1); ctx.fillStyle = SciSim.color.mix('#fde047', '#7c3aed', dep); ctx.globalAlpha = f; ctx.beginPath(); ctx.arc(q.x, y + (q.d - 0.5) * 22, 4 + f * 3, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }); ctx.globalAlpha = 1;
    D.arrow(120, 88, 220, 88, { color: '#fde047', width: 6, head: 14 }); D.arrow(740, 150, 690, 150, { color: '#fde047', width: 5, head: 12 });
    FL(335, 96, '해구', { bg: '#1e3a8a' }); if (!PHONE) { FL(120, 70, '해양판', { bg: '#1e293b' }); FL(690, 70, '대륙판', { bg: '#78350f' }); }
    FL(vx + (PHONE ? 60 : 80), 56, '화산대', { bg: '#7f1d1d' }); FL(420, 262, '섭입한 해양판', { bg: '#1e293b' }); FL(600, 345, '깊은 지진', { bg: '#5b21b6' }); if (!PHONE) FL(380, 120 - 0, '얕은 지진', { bg: '#a16207', size: 12.5 });
    F(560, 232, '마그마가 만들어져요', { size: 13.5, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 });
  }
  function drawColl(t, dt) {
    const T = S.bt % 17, q1 = clamp(T / 4.5, 0, 1), q2 = clamp((T - 4.5) / 9, 0, 1), g = 150 * (1 - sm(q1, 0, 1)), zW = 50 + 100 * q2, Hm = 66 * sm(q2, 0, 1), Rd = 40 * sm(q2, 0, 1);
    const bump = (x) => Math.exp(-Math.pow((x - 400) / zW, 2) * 1.6);
    ctx.fillStyle = '#4aa8f0'; ctx.fillRect(0, SEA, 800, 40);
    const xL = 400 - g, xR = 400 + g;
    // 해양 지각 조각(닫히는 바다)
    if (g > 1) { ctx.fillStyle = '#4b5d72'; ctx.fillRect(xL, 132, xR - xL, 18); ctx.fillStyle = '#5d7088'; ctx.fillRect(xL, 150, xR - xL, 46); }
    const cl = (x0, x1, y0, col) => {
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 4) { const b = bump(x), top = 118 - Hm * b, bot = 158 + Rd * b, y1 = top + (bot - top) * k / 4 + Math.sin((x - 400) / 9 + k * 0.9) * 5 * q2 * b; x === x0 ? ctx.moveTo(x, y1) : ctx.lineTo(x, y1); }
        for (let x = x1; x >= x0; x -= 4) { const b = bump(x), top = 118 - Hm * b, bot = 158 + Rd * b, y1 = top + (bot - top) * (k + 1) / 4 + Math.sin((x - 400) / 9 + (k + 1) * 0.9) * 5 * q2 * b; ctx.lineTo(x, y1); }
        ctx.closePath(); ctx.fillStyle = ['#d8b88a', '#c49a64', '#b0824f', '#9a6b3d'][k]; ctx.fill();
      }
      ctx.beginPath(); for (let x = x0; x <= x1; x += 4) { const b = bump(x), bot = 158 + Rd * b; x === x0 ? ctx.moveTo(x, bot) : ctx.lineTo(x, bot + 0); } for (let x = x1; x >= x0; x -= 4) { const b = bump(x), bot = 158 + Rd * b; ctx.lineTo(x, 196 + Rd * 1.25 * b); } ctx.closePath(); ctx.fillStyle = '#6f5a46'; ctx.fill();
    };
    cl(-10, xL + 1, 0); cl(xR - 1, 810, 0);
    if (g <= 1) cl(xL, xR + 0.1, 0);
    // 산맥 눈 덮인 봉우리
    if (q2 > 0.15) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(q2 * 1.4, 0, 1) + ')'; ctx.beginPath(); ctx.moveTo(400 - 26 * q2, 118 - Hm + 16); ctx.lineTo(400, 118 - Hm - 1); ctx.lineTo(400 + 26 * q2, 118 - Hm + 16); ctx.lineTo(400 + 10 * q2, 118 - Hm + 10); ctx.lineTo(400, 118 - Hm + 17); ctx.lineTo(400 - 10 * q2, 118 - Hm + 10); ctx.closePath(); ctx.fill(); }
    // 지진
    if (q1 >= 1) for (let i = 0; i < 7; i++) { const f = (t * 1.2 + i * 0.31) % 1, x = 400 + Math.sin(i * 2.3) * zW * 0.8, y = 150 + (i % 4) * 14; ctx.strokeStyle = 'rgba(250,204,21,' + (1 - f) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 3 + f * 13, 0, 6.3); ctx.stroke(); }
    D.arrow(170, 84, 250, 84, { color: '#fde047', width: 6, head: 14 }); D.arrow(630, 84, 550, 84, { color: '#fde047', width: 6, head: 14 });
    if (!PHONE) { FL(160, 112, '대륙판', { bg: '#78350f' }); FL(640, 112, '대륙판', { bg: '#78350f' }); }
    if (g > 1) FL(400, 100, '사라져 가는 바다', { bg: '#1e3a8a' }); else FL(560, 70, '습곡산맥 (히말라야)', { bg: '#4c1d95' });
    FL(640, 250, '화산 없음 ✖', { bg: '#475569' });
    if (q1 >= 1) F(400, 252, '지각이 짧아지고 두꺼워져요', { size: 14, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 });
  }
  function drawTrans(t) {
    ctx.fillStyle = '#9db987'; ctx.fillRect(0, 0, 800, 380);
    ctx.fillStyle = '#b5cda0'; for (let i = 0; i < 8; i++) ctx.fillRect(0, 40 * i + 6, 800, 2);
    const s = Math.min(70, (S.bt % 14) * 6), cy = 215;
    // 윗 판(오른쪽으로), 아랫 판(왼쪽으로)
    ctx.fillStyle = 'rgba(120,98,70,.28)'; ctx.fillRect(0, 70, 800, cy - 70); ctx.fillStyle = 'rgba(90,70,50,.28)'; ctx.fillRect(0, cy, 800, 360 - cy);
    // 도로와 울타리 (판과 함께 움직여요)
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 14; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(400 + s, 70); ctx.lineTo(400 + s, cy - 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(400 - s, cy + 3); ctx.lineTo(400 - s, 360); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(400 + s, 70); ctx.lineTo(400 + s, cy - 3); ctx.moveTo(400 - s, cy + 3); ctx.lineTo(400 - s, 360); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#78350f'; [[200, 'u'], [600, 'u'], [200, 'd'], [600, 'd']].forEach(([x, w]) => { const dx = w === 'u' ? s : -s; for (let i = 0; i < 3; i++) ctx.fillRect(x + dx + i * 16 - 3, w === 'u' ? 120 : 280, 6, 22); });
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(200 + s - 3, 130); ctx.lineTo(200 + s + 29, 130); ctx.moveTo(600 + s - 3, 130); ctx.lineTo(600 + s + 29, 130); ctx.moveTo(200 - s - 3, 290); ctx.lineTo(200 - s + 29, 290); ctx.moveTo(600 - s - 3, 290); ctx.lineTo(600 - s + 29, 290); ctx.stroke();
    // 단층
    ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 6; ctx.setLineDash([14, 8]); ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(800, cy); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 5; i++) { const f = (t * 1.1 + i * 0.37) % 1, x = 120 + ((i * 163 + Math.floor(t * 1.1 + i * 0.37) * 211) % 560); ctx.strokeStyle = 'rgba(239,68,68,' + (1 - f) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, cy, 4 + f * 22, 0, 6.3); ctx.stroke(); }
    D.arrow(300, 100, 460, 100, { color: '#fde047', width: 8, head: 18 }); D.arrow(500, 330, 340, 330, { color: '#fde047', width: 8, head: 18 });
    FL(620, 160, '판 A →', { bg: '#78350f' }); FL(180, 270, '← 판 B', { bg: '#78350f' }); FL(620, 215, '변환 단층 · 얕은 지진', { bg: '#7f1d1d' });
    FL(130, 90, '위에서 본 모습', { bg: '#1e293b' }); FL(400, 56, s > 5 ? '도로가 어긋나기 시작했어요' : '도로가 이어져 있어요', { bg: '#14532d', size: 14 });
    F(660, 354, '화산 없음 ✖', { size: 15, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,.5)', strokeWidth: 4 });
  }
  function drawInfoPanel(py, k) {
    const W2 = PHONE ? 576 : 772, x0 = PHONE ? 12 : 14;
    const rows = k ? BINFO[k] : null;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x0, py, W2, VH - py - 8, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
    if (!rows) { TX(x0 + W2 / 2, py + 48, '👆 오른쪽에서 두 판의 상대 운동을 골라 보세요', { size: 16, color: '#475569', weight: 800 }); }
    else {
      rows.forEach((r, i) => { const y = py + 32 + i * (PHONE ? 46 : 31); ctx.fillStyle = BT[k].col; rr(x0 + 14, y - 20, 62, 28, 14).fill(); TX(x0 + 45, y - 1, r[0], { size: 14, color: '#fff', weight: 800 }); TX(x0 + 90, y - 1, r[1], { size: 15, color: '#0f172a', weight: 800, align: 'left' }); });
    }
    // 본 경계 체크
    const ys = py + (PHONE ? 34 + 3 * 46 : 32 + 3 * 31) + 2;
    const names = [['div', '발산'], ['sub', '섭입'], ['coll', '충돌'], ['trans', '보존']];
    names.forEach(([kk, n], i) => { const w = PHONE ? 134 : 176, x = x0 + 14 + i * (w + (PHONE ? 8 : 12)), on = S.seen.has(kk); ctx.fillStyle = on ? BT[kk].col : '#e2e8f0'; rr(x, ys, w, 30, 15).fill(); TX(x + w / 2, ys + 21, (on ? '✔ ' : '') + n + (on ? ' 확인' : ''), { size: 14, color: on ? '#fff' : '#64748b', weight: 800 }); });
  }
  const MCARDS = [{ label: '히말라야 산맥', ico: '🏔️', ans: 'coll' }, { label: '일본 해구', ico: '🌊', ans: 'sub' }, { label: '대서양 중앙 해령', ico: '🌋', ans: 'div' }, { label: '산안드레아스 단층', ico: '🏜️', ans: 'trans' }];
  function paintPlace(c) { ctx.font = D.font(24, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.ico, -c.w / 2 + 26, 2); ctx.textBaseline = 'alphabetic'; TX(c.w * 0.14 + 4, 5, c.label, { size: 14.5, color: '#1b2333', weight: 800 }); }
  function initMatch() {
    boardsB.reset(); S.matchOK = 0;
    ['div', 'sub', 'coll', 'trans'].forEach((kk, i) => {
      const s = PHONE ? { x: 150 + (i % 2) * 300, y: 396 + Math.floor(i / 2) * 120, w: 286, h: 110 } : { x: 108 + i * 195, y: 450, w: 186, h: 104 };
      boardsB.addSlot({ x: s.x, y: s.y, w: s.w, h: s.h, cap: 2, isc: 0.86, key: kk, top: 54, gh: 42, cols: 1, gw: s.w - 16 });
    });
    [2, 0, 3, 1].forEach((ci, j) => { const c = MCARDS[ci], hx = PHONE ? 150 + (j % 2) * 300 : 108 + j * 195, hy = PHONE ? 656 + Math.floor(j / 2) * 56 : 534; boardsB.addItem({ label: c.label, ico: c.ico, ans: c.ans, hx, hy, w: PHONE ? 270 : 184, h: 44, fill: '#fff', stroke: '#64748b', paint: paintPlace }); });
  }
  function drawMatchPanel(py, t) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, py - 6, VW, VH);
    TX(VW / 2, py + 14, '장소 카드를 알맞은 경계 상자에 놓아요', { size: 15, color: '#1e293b', weight: 800 });
    boardsB.slots.forEach((s) => {
      const hit = boardsB.drag && boardsB.slotAt(boardsB.drag.c) === s, col = BT[s.key].col;
      ctx.save(); D.shadow(() => { ctx.fillStyle = hit ? '#e8efff' : '#fff'; rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
      ctx.strokeStyle = hit ? '#3867f4' : S.matchOK > 0.5 ? '#14a058' : col; ctx.lineWidth = hit ? 3.4 : 2.4; rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke();
      ctx.fillStyle = col; ctx.save(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, 34, 12).clip(); ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, 34); ctx.restore();
      TX(s.x, s.y - s.h / 2 + 23, BT[s.key].name, { size: 15, color: '#fff', weight: 800 }); ctx.restore();
    });
    boardsB.items.forEach((c) => { if (!c.free) drawCard(c); }); boardsB.items.forEach((c) => { if (c.free) drawCard(c); });
  }

  /* ======================================================
     화면 4: 이동 속도 (해저 암석의 나이 · 하와이 열점)
     ====================================================== */
  const SITES = [{ d: 250, a: 5.2 }, { d: 500, a: 10.1 }, { d: 750, a: 14.8 }, { d: 1000, a: 20.3 }, { d: 1500, a: 29.7 }, { d: 2000, a: 40.2 }];
  const SPG = PHONE ? { sx0: 300, pxkm: 0.135, strip: { x: 10, y: 10, w: 580, h: 196 }, graph: { x: 12, y: 218, w: 576, h: 272 }, table: { x: 12, y: 502, w: 576 } }
    : { sx0: 400, pxkm: 0.17, strip: { x: 10, y: 8, w: 780, h: 226 }, graph: { x: 14, y: 246, w: 462, h: 302 }, table: { x: 490, y: 246, w: 300 } };
  const HI = [{ n: '하와이섬', age: 0, dist: 0, rx: 34, ry: 26 }, { n: '마우이섬', age: 1.3, dist: 130, rx: 24, ry: 17 }, { n: '오아후섬', age: 3.4, dist: 340, rx: 26, ry: 17 }, { n: '카우아이섬', age: 5.1, dist: 510, rx: 21, ry: 16 }];
  const HV = 100; // km/백만 년 (= 10 cm/년)
  const DIRV = { NE: [0.866, -0.5], NW: [-0.866, -0.5], SE: [0.866, 0.5], SW: [-0.866, 0.5] };
  const HG = PHONE ? { H0: [430, 318], sc: 0.5, rect: { x: 10, y: 10, w: 580, h: 360 }, tb: { x: 12, y: 384, w: 576 } } : { H0: [570, 346], sc: 0.6, rect: { x: 10, y: 8, w: 780, h: 390 }, tb: { x: 14, y: 410, w: 772 } };
  function siteX(d) { return SPG.sx0 + d * SPG.pxkm; }
  function drawSpeed(t, dt) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    if (S.sp === 'ridge') drawRidgeSpeed(t, dt); else drawHawaii(t, dt);
  }
  function drawRidgeSpeed(t, dt) {
    const R = SPG.strip, cx = SPG.sx0, k = SPG.pxkm;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    const sk = ctx.createLinearGradient(0, R.y, 0, R.y + 70); sk.addColorStop(0, '#bfe3ff'); sk.addColorStop(1, '#e8f6ff'); ctx.fillStyle = sk; ctx.fillRect(R.x, R.y, R.w, R.h);
    const seaY = R.y + 62; ctx.fillStyle = '#4aa8f0'; ctx.fillRect(R.x, seaY, R.w, 50); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(R.x, seaY, R.w, 2.5);
    const mg = ctx.createLinearGradient(0, seaY + 60, 0, R.y + R.h); mg.addColorStop(0, '#a8461f'); mg.addColorStop(1, '#f59e0b'); ctx.fillStyle = mg; ctx.fillRect(R.x, seaY + 54, R.w, R.h);
    // 해양 지각: 해령에서 멀수록 나이가 많아요 (색으로 표시)
    const topY = (dx) => seaY + 46 + Math.min(14, Math.abs(dx) * 0.012 * k * 5.9);
    for (let x = R.x; x < R.x + R.w; x += 3) { const dx = x - cx, age = Math.abs(dx) / k / 50, col = SciSim.color.mix('#ef4444', '#3b5b8c', clamp(age / 40, 0, 1)); ctx.fillStyle = col; ctx.fillRect(x, topY(dx), 3.4, 28); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; for (let d = 250; d <= 2000; d += 250) for (const sg of [-1, 1]) { const x = cx + sg * d * k; ctx.beginPath(); ctx.moveTo(x, topY(x - cx)); ctx.lineTo(x, topY(x - cx) + 28); ctx.stroke(); }
    // 해령 (마그마)
    ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(cx - 34, seaY + 46); ctx.lineTo(cx, seaY + 26); ctx.lineTo(cx + 34, seaY + 46); ctx.closePath(); ctx.fill(); D.glow(cx, seaY + 34, 30, '#ff7a1a', 0.9);
    ctx.fillStyle = '#ff6a1a'; ctx.fillRect(cx - 3, seaY + 30, 6, 80);
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
    FLs(cx, R.y + 20, '해령 (거리 0)', '#7f1d1d');
    TX(R.x + 14, R.y + 22, '← 서쪽(대서양)', { size: 12.5, color: '#fff', weight: 800, align: 'left', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 }); TX(R.x + R.w - 14, R.y + 22, '동쪽 →', { size: 12.5, color: '#fff', weight: 800, align: 'right', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 });
    // 시추 지점
    SITES.forEach((s, i) => {
      const x = siteX(s.d), dr = S.drilled.has(i), an = S.dAnim[i] != null ? S.dAnim[i] : 0, y0 = seaY - 8, yb = topY(x - cx) + 8;
      // 배
      const bob = Math.sin(t * 1.5 + i) * 1.5; ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(x - 13, y0 - 6 + bob); ctx.lineTo(x + 13, y0 - 6 + bob); ctx.lineTo(x + 8, y0 + 3 + bob); ctx.lineTo(x - 8, y0 + 3 + bob); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 1, y0 - 18 + bob, 2.4, 12); ctx.fillRect(x + 1, y0 - 18 + bob, 8, 5);
      if (dr || an > 0) { ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y0 + 3 + bob); ctx.lineTo(x, y0 + 3 + (yb - y0 - 3) * Math.min(1, an * 2)); ctx.stroke(); }
      // 번호와 상태
      ctx.save(); D.shadow(() => { ctx.fillStyle = dr ? '#16a34a' : '#fff'; ctx.beginPath(); ctx.arc(x, R.y + R.h - 30, 12, 0, 6.3); ctx.fill(); }, { blur: 3, y: 1, color: 'rgba(0,0,0,.4)' }); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, R.y + R.h - 30, 12, 0, 6.3); ctx.stroke(); TX(x, R.y + R.h - 24.5, String(i + 1), { size: 14, color: dr ? '#fff' : '#0f172a', weight: 800 }); ctx.restore();
      if (dr && an >= 0.6 && S.lastSite === i) D.label(clamp(x, R.x + 100, R.x + R.w - 100), y0 - 28 + 4, '거리 ' + s.d + ' km · 나이 ' + s.a + ' 백만 년', { bg: '#0f766e', size: 11.5, pad: 6 });
      else if (!dr) TX(x, R.y + 46, '시추', { size: 12, color: '#1e3a8a', weight: 800 });
      S.siteHit = S.siteHit || []; S.siteHit[i] = { x, y: R.y + 24, w: 44, h: R.h - 24 };
    });
    // 그래프
    drawAgeGraph();
    drawRidgeTable();
  }
  function FLs(x, y, txt, bg) { D.label(x, y, txt, { bg, size: 13 }); }
  function drawAgeGraph() {
    const G = SPG.graph, px0 = G.x + 62, px1 = G.x + G.w - 22, py0 = G.y + G.h - 50, py1 = G.y + 46;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(G.x, G.y, G.w, G.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
    TX(G.x + 16, G.y + 26, '해령에서의 거리와 암석의 나이', { size: 14.5, color: '#1e293b', weight: 800, align: 'left' });
    const X = (d) => px0 + d / 2000 * (px1 - px0), Y = (a) => py0 - a / 45 * (py0 - py1);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b';
    for (let a = 0; a <= 40; a += 10) { ctx.beginPath(); ctx.moveTo(px0, Y(a)); ctx.lineTo(px1, Y(a)); ctx.stroke(); TX(px0 - 8, Y(a) + 4, String(a), { size: 12.5, color: '#64748b', weight: 700, align: 'right' }); }
    for (let d = 0; d <= 2000; d += 500) { ctx.beginPath(); ctx.moveTo(X(d), py0); ctx.lineTo(X(d), py1); ctx.stroke(); TX(X(d), py0 + 18, String(d), { size: 12.5, color: '#64748b', weight: 700 }); }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px0, py1 - 6); ctx.lineTo(px0, py0); ctx.lineTo(px1 + 6, py0); ctx.stroke();
    TX((px0 + px1) / 2, py0 + 40, '해령으로부터의 거리 (km)', { size: 13, color: '#334155', weight: 800 });
    ctx.save(); ctx.translate(G.x + 16, (py0 + py1) / 2 + 10); ctx.rotate(-Math.PI / 2); TX(0, 0, '암석의 나이 (백만 년)', { size: 13, color: '#334155', weight: 800 }); ctx.restore();
    const pts = [...S.drilled].map((i) => SITES[i]);
    if (pts.length >= 3) {
      let sxy = 0, sxx = 0; pts.forEach((p) => { sxy += p.d * p.a; sxx += p.d * p.d; }); const sl = sxy / sxx;
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(2000 * Math.min(1, 44 / (2000 * sl))), Y(Math.min(44, 2000 * sl))); ctx.stroke(); ctx.setLineDash([]);
      D.label(X(780), Y(1650 * sl) - 6, '점들이 한 직선 위에 있어요', { bg: '#c2410c', size: 12.5 });
    }
    [...S.drilled].forEach((i) => { const p = SITES[i], an = clamp(S.dAnim[i] != null ? S.dAnim[i] : 1, 0, 1), tx = X(p.d), ty = Y(p.a), sx = siteX(p.d), sy = SPG.strip.y + 90, f = sm(an, 0.5, 1); const x = lerp(sx, tx, f), y = lerp(sy, ty, f); if (an < 0.5) return; D.sphere(x, y, 7, '#2563eb', { outline: '#fff' }); TX(x, y - 11, String(i + 1), { size: 12.5, color: '#1e3a8a', weight: 800 }); });
    if (!S.drilled.size) TX((px0 + px1) / 2, (py0 + py1) / 2, '위의 배를 눌러 시추하면 점이 찍혀요', { size: 15, color: '#94a3b8', weight: 800 });
    if (S.speedOK > 0.5) { ctx.globalAlpha = S.speedOK; D.label((px0 + px1) / 2, py1 + 12, '판은 한쪽으로 약 5 cm/년씩 멀어져요', { bg: '#14a058', size: 14 }); ctx.globalAlpha = 1; }
  }
  function drawRidgeTable() {
    const T = SPG.table, y = T.y, rows = [...S.drilled].sort((a, b) => a - b);
    const hh = PHONE ? 330 : 302;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(T.x, y, T.w, hh, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
    TX(T.x + 16, y + 26, '📋 시추 기록표', { size: 14.5, color: '#1e293b', weight: 800, align: 'left' });
    const cw = [60, T.w / 2 - 50, T.w / 2 - 10]; ctx.fillStyle = '#e2e8f0'; rr(T.x + 10, y + 38, T.w - 20, 24, 8).fill();
    const hx = [T.x + 10 + cw[0] / 2, T.x + 10 + cw[0] + cw[1] / 2, T.x + 10 + cw[0] + cw[1] + cw[2] / 2 - 20];
    ['지점', '거리 (km)', '나이 (백만 년)'].forEach((h, i) => TX(hx[i], y + 55, h, { size: 12.5, color: '#334155', weight: 800 }));
    rows.forEach((i, r) => { const yy = y + 66 + r * 26; TX(hx[0], yy + 17, String(i + 1), { size: 14, color: '#0f172a', weight: 800 }); TX(hx[1], yy + 17, String(SITES[i].d), { size: 14, color: '#0f172a', weight: 800 }); TX(hx[2], yy + 17, String(SITES[i].a), { size: 14, color: '#0f172a', weight: 800 }); });
    if (!rows.length) TX(T.x + T.w / 2, y + 100, '아직 시추하지 않았어요', { size: 13.5, color: '#94a3b8', weight: 700 });
    const fy = y + 66 + 6 * 26 + 6;
    para(T.x + 16, fy + 14, '속도 = 거리 / 나이  (예: 600 km / 20 백만 년 = 30 km/백만 년 = 30 mm/년 = 3 cm/년)', T.w - 32, 12.5, { color: '#0f766e', weight: 800, align: 'left' });
  }
  const NWD = 'NW';
  function hawPos(i, tm) { const isl = HI[i]; if (tm < -isl.age) return null; const dd = HV * (tm + isl.age); const u = DIRV[NWD]; return { x: HG.H0[0] + u[0] * dd * HG.sc, y: HG.H0[1] + u[1] * dd * HG.sc, d: dd }; }
  function drawHawaii(t, dt) {
    const R = HG.rect, [hx, hy] = HG.H0, sc = HG.sc, tm = S.hawT;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    const og = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); og.addColorStop(0, '#2c7fd1'); og.addColorStop(1, '#0e4a99'); ctx.fillStyle = og; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 움직이는 해양판 무늬
    const u = DIRV[NWD], off = (tm + 6) * HV * sc; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
    for (let i = -20; i < 24; i++) { for (let j = -8; j < 14; j++) { const bx = R.x + i * 60 + (off * u[0]) % 60 + (j % 2) * 30, by = R.y + j * 52 + (off * u[1]) % 52; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 14, by + 4); ctx.stroke(); } }
    // 거리 눈금 원 (100 km마다)
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.4;
    for (let r = 100; r <= 600; r += 100) { ctx.beginPath(); ctx.arc(hx, hy, r * sc, 0, 6.3); ctx.stroke(); if (!PHONE || r % 200 === 0) TX(hx - r * sc, hy + 16, r + ' km', { size: 12, color: 'rgba(255,255,255,.9)', weight: 800 }); }
    ctx.setLineDash([]);
    // 열점
    const pg = ctx.createRadialGradient(hx, hy, 2, hx, hy, 60); pg.addColorStop(0, 'rgba(255,100,30,.95)'); pg.addColorStop(1, 'rgba(255,100,30,0)'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(hx, hy, 60 + 5 * Math.sin(t * 3), 0, 6.3); ctx.fill();
    // 섬
    HI.forEach((isl, i) => {
      const p = hawPos(i, tm); if (!p) { if (S.islHit) S.islHit[i] = null; return; } const born = clamp((tm + isl.age) / 0.6, 0, 1), s = born * (HG.sc / 0.6);
      const meas = S.hawMeasured.has(i);
      ctx.fillStyle = '#6b8e4e'; ctx.strokeStyle = '#d9c28a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, isl.rx * s, isl.ry * s, -0.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4d6f35'; ctx.beginPath(); ctx.ellipse(p.x, p.y, isl.rx * s * 0.5, isl.ry * s * 0.5, -0.5, 0, 6.3); ctx.fill();
      if (i === 0 && tm > -0.5) { const e = 0.5 + 0.5 * Math.sin(t * 8); ctx.fillStyle = 'rgba(255,90,20,' + (0.6 + 0.4 * e) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 5 * s, 0, 6.3); ctx.fill(); }
      if (meas && i > 0 && tm >= -0.01) { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); D.label(p.x - 52, p.y + 24, Math.round(isl.dist) + ' km', { bg: '#a16207', size: 13 }); }
      S.islHit = S.islHit || []; S.islHit[i] = { x: p.x, y: p.y, r: Math.max(26, isl.rx * s + 8) };
      D.label(p.x, i === 0 ? p.y + isl.ry * s + 18 : p.y - isl.ry * s - 16, isl.n + (meas && !PHONE ? ' · ' + (i ? isl.age + ' 백만 년' : '현재 활동') : ''), { bg: meas ? '#0f766e' : '#1e293b', size: 12.5 });
    });
    D.label(Math.min(hx + 170, R.x + R.w - 8), hy - 44, '열점 (고정된 마그마 공급처)', { bg: '#7f1d1d', size: 13, align: 'right' });
    // 나침반·시간
    TX(R.x + 36, R.y + 38, '북', { size: 14, color: '#fff', weight: 800 }); D.arrow(R.x + 36, R.y + 90, R.x + 36, R.y + 46, { color: '#fff', width: 4, head: 12 });
    D.label(R.x + R.w - 90, R.y + R.h - 20, tm >= -0.01 ? '현재' : (-tm).toFixed(1) + ' 백만 년 전', { bg: '#0f172a', size: 15 });
    TX(R.x + 14, R.y + R.h - 12, '※ 섬 크기는 과장했어요. 눈금 원: 열점에서의 거리', { size: 12, color: 'rgba(255,255,255,.85)', weight: 700, align: 'left' });
    if (S.hawOK > 0.5) { const d = DIRV.NW; ctx.globalAlpha = S.hawOK; D.arrow(hx - 120 * 0 + 40, hy - 60, hx + 40 + d[0] * 150, hy - 60 + d[1] * 150, { color: '#fde047', width: 8, head: 18 }); D.label(hx - 70, hy - 150, '태평양판: 북서쪽으로 약 10 cm/년', { bg: '#14a058', size: 14 }); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 12).stroke();
    // 섬 카드
    const T = HG.tb;
    HI.slice(1).forEach((isl, k) => {
      const i = k + 1, m = S.hawMeasured.has(i), w = PHONE ? T.w : 250, h = PHONE ? 52 : 132, x = PHONE ? T.x : T.x + k * 261, y = PHONE ? T.y + k * 60 : T.y;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.2)' });
      ctx.fillStyle = m ? '#14a058' : '#cbd5e1'; rr(x, y, 8, h, 4).fill();
      TX(x + 22, y + (PHONE ? 32 : 30), isl.n, { size: 16, color: '#0f172a', weight: 800, align: 'left' });
      if (m) {
        if (PHONE) TX(x + w - 14, y + 32, '나이 ' + isl.age + ' 백만 년 · 거리 ' + isl.dist + ' km', { size: 13.5, color: '#0f766e', weight: 800, align: 'right' });
        else { TX(x + 22, y + 66, '나이 ' + isl.age + ' 백만 년', { size: 17, color: '#0f766e', weight: 800, align: 'left' }); TX(x + 22, y + 96, '열점에서 ' + isl.dist + ' km', { size: 17, color: '#0f766e', weight: 800, align: 'left' }); }
      } else TX(PHONE ? x + w - 14 : x + 22, PHONE ? y + 32 : y + 70, '지도에서 섬을 눌러 보세요', { size: 13.5, color: '#94a3b8', weight: 800, align: PHONE ? 'right' : 'left' });
    });
  }

  /* ======================================================
     장면 전환 · 입력 · 읽음 칸
     ====================================================== */
  const MODE_LABEL = { map: '🗺️ 지진·화산 분포', convect: '🔥 맨틀 대류', boundary: '↔ 판의 경계', speed: '📏 이동 속도' };
  const modeSeg = $('#modeSeg');
  const sHeat = $('#sHeat'), oHeat = $('#oHeat'), sTime = $('#sTime'), oTime = $('#oTime'), inRidge = $('#inRidge'), inHawaii = $('#inHawaii');
  function stageBg() { return S.mode === 'convect' ? '#dff0ff' : S.mode === 'boundary' ? '#e8f1fb' : '#eef3fb'; }
  function updateCtl() {
    const lab = $('#tbLabel'); if (lab) lab.textContent = MODE_LABEL[S.mode] + (S.mode === 'boundary' && S.bsub === 'match' ? ' · 장소 짝짓기' : S.mode === 'speed' ? (S.sp === 'ridge' ? ' · 해저 암석의 나이' : ' · 하와이 열도') : '');
    $$('#ctrlCard .control').forEach((c) => {
      let ok = c.dataset.modes.split(' ').includes(S.mode);
      if (ok && c.dataset.bsub && c.dataset.bsub !== S.bsub) ok = false;
      if (ok && c.dataset.spsub && c.dataset.spsub !== S.sp) ok = false;
      c.hidden = !ok;
    });
    $$('#layerBtns .opt').forEach((b) => b.classList.toggle('on', !!S.lay[b.dataset.lay]));
    $$('#motBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.mot === S.mot));
    $$('#convBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.cv === S.conv));
    $('#convSub').hidden = S.mot !== 'conv';
    $$('#spBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.sp === S.sp));
    $$('#dirBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.dir === S.hawDir));
    $$('#siteBtns .opt').forEach((b, i) => { b.classList.toggle('on', S.drilled.has(i)); });
    $$('#predL .opt, #predR .opt').forEach((b) => b.classList.toggle('on', S.pred[b.dataset.p] === +b.dataset.d));
    $('#predBox').hidden = !(S.showPred || (game && game.free));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    view.wrap.style.setProperty('--stage-bg', stageBg());
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#layerBtns .opt').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.lay; S.lay[k] = !S.lay[k]; Sound.click(); updateCtl(); }));
  SciSim.bindRange(sHeat, oHeat, (v) => v + ' %', (v) => { S.heatT = v / 100; });
  $$('#predL .opt, #predR .opt').forEach((b) => b.addEventListener('click', () => { S.pred[b.dataset.p] = +b.dataset.d; Sound.click(); updateCtl(); }));
  $$('#motBtns .opt').forEach((b) => b.addEventListener('click', () => { S.mot = b.dataset.mot; S.bt = 0; Sound.click(); updateCtl(); }));
  $$('#convBtns .opt').forEach((b) => b.addEventListener('click', () => { S.conv = b.dataset.cv; S.bt = 0; Sound.click(); updateCtl(); }));
  $('#bResetB').addEventListener('click', () => { Sound.click(); initMatch(); });
  $$('#spBtns .opt').forEach((b) => b.addEventListener('click', () => { S.sp = b.dataset.sp; Sound.click(); updateCtl(); }));
  const siteBtns = $('#siteBtns');
  SITES.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = (i + 1) + '번<br><small>' + s.d + ' km</small>'; b.addEventListener('click', () => drill(i)); siteBtns.appendChild(b); });
  function drill(i) {
    if (S.drilled.has(i)) return; S.drilled.add(i); S.dAnim[i] = 0; S.lastSite = i; Sound.click();
    SciSim.tween(S.dAnim, { [i]: 1 }, { duration: 1.5, ease: 'inOutQuad' }); updateCtl();
  }
  $$('#dirBtns .opt').forEach((b) => b.addEventListener('click', () => { S.hawDir = b.dataset.dir; Sound.click(); updateCtl(); }));
  const hawSet = (v) => { S.hawT = -6 + v / 10; sTime.value = v; oTime.textContent = v >= 60 ? '현재' : (6 - v / 10).toFixed(1) + ' 백만 년 전'; sTime.style.setProperty('--pct', (v / 60 * 100) + '%'); };
  sTime.addEventListener('input', () => { S.hawPlay = false; hawSet(+sTime.value); });
  $('#bPlayH').addEventListener('click', () => { hawSet(0); S.hawPlay = true; Sound.click(); });
  hawSet(60);

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }
  const activeBoard = () => (S.mode === 'boundary' && S.bsub === 'match' ? boardsB : null);
  function mapPick(p) {
    if (p.x < MAPR.x || p.x > MAPR.x + MAPR.w || p.y < MAPR.y || p.y > MAPR.y + MAPR.h) {
      const kb = S.korBtn; if (kb && p.x >= kb.x && p.x <= kb.x + kb.w && p.y >= kb.y && p.y <= kb.y + kb.h) { S.pick = { lon: KOREA[0], lat: KOREA[1] }; Sound.tick(); }
      return;
    }
    S.pick = { lon: (p.x - MAPR.x) / MAPR.w * 360 - 180, lat: 85 - (p.y - MAPR.y) / MAPR.h * 155 }; Sound.tick();
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'map') { mapPick(p); return false; }
      if (S.mode === 'speed') {
        if (S.sp === 'ridge') { const h = (S.siteHit || []).findIndex((q) => q && Math.abs(p.x - q.x) < q.w / 2 && p.y > q.y && p.y < q.y + q.h); if (h >= 0) drill(h); }
        else { const h = (S.islHit || []).findIndex((q) => q && Math.hypot(p.x - q.x, p.y - q.y) < q.r); if (h >= 0) { S.hawMeasured.add(h); Sound.click(); } }
        return false;
      }
      const B = activeBoard(); if (!B) return false;
      const c = B.pick(p); if (!c) return false; B.start(c, p); return true;
    },
    move(p) { const B = activeBoard(); if (B) B.move(p); },
    up(p) { const B = activeBoard(); if (B) B.drop(); },
    hover(p) { const B = activeBoard(); if (B) return B.pick(p) ? 'grab' : 'default'; if (S.mode === 'map' || S.mode === 'speed') return 'pointer'; return 'default'; },
  });

  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  const num = (el) => { const v = parseFloat(String(el.value).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'map') {
      const on = ['eq', 'vol', 'bnd'].filter((k) => S.lay[k]).map((k) => ({ eq: '지진', vol: '화산', bnd: '판 경계' }[k]));
      L1 = '켜진 자료'; a = on.length ? on.join(' · ') : '없음'; L2 = '지진 · 화산'; b = (S.lay.eq ? QUAKES.length.toLocaleString('ko-KR') : '—') + '개 · ' + (S.lay.vol ? VOLC.length : '—') + '개';
      L3 = '눌러 본 곳'; if (S.pick && (S.lay.eq || S.lay.vol)) { const k = countNear(S.pick.lon, S.pick.lat, PICK_R); c = '지진 ' + (S.lay.eq ? k.q : '—') + ' · 화산 ' + (S.lay.vol ? k.v : '—'); } else c = '지도를 눌러 보세요';
    } else if (S.mode === 'convect') {
      L1 = '지구 내부 열'; a = Math.round(S.heat * 100) + ' %'; L2 = '판 이동 속도'; b = '약 ' + plateCm().toFixed(1) + ' cm/년'; L3 = '맨틀 대류'; c = S.heat < 0.03 ? '멈춰 있어요' : S.heat < 0.4 ? '천천히 돌아요' : '활발하게 돌아요';
    } else if (S.mode === 'boundary') {
      if (S.bsub === 'match') { L1 = '놓은 카드'; a = boardsB.placed() + ' / 4'; L2 = '경계 상자'; b = '발산 · 섭입 · 충돌 · 보존'; L3 = '결과'; c = S.matchOK > 0.5 ? '모두 알맞게 짝지음 ✅' : '확인하기를 눌러 보세요'; }
      else { const k = bKey(); L1 = '상대 운동'; a = S.mot === 'div' ? '멀어짐 ↔' : S.mot === 'conv' ? '가까워짐 →←' : S.mot === 'trans' ? '스침 ↕' : '고르지 않았어요'; L2 = '경계 종류'; b = k ? BNAME[k][0] : '—'; L3 = '확인한 경계'; c = S.seen.size + ' / 4'; }
    } else if (S.sp === 'ridge') {
      const s = S.lastSite >= 0 ? SITES[S.lastSite] : null, v = num(inRidge);
      L1 = '시추한 지점'; a = S.drilled.size + ' / 6'; L2 = '마지막 지점'; b = s ? s.d + ' km · ' + s.a + ' 백만 년' : '—'; L3 = '입력한 속도'; c = v != null ? v + ' cm/년' : '—';
    } else {
      const v = num(inHawaii);
      L1 = '측정한 섬'; a = [...S.hawMeasured].filter((i) => i > 0).length + ' / 3'; L2 = '시간'; b = S.hawT >= -0.01 ? '현재' : (-S.hawT).toFixed(1) + ' 백만 년 전'; L3 = '입력한 속도·방향'; c = (v != null ? v + ' cm/년' : '—') + ' · ' + ({ NE: '북동', NW: '북서', SE: '남동', SW: '남서' }[S.hawDir] || '—');
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.lay = { eq: false, vol: false, bnd: false }; S.layA = { eq: 0, vol: 0, bnd: 0 }; S.pick = null; setMode('map'); showHint('위의 버튼으로 자료를 하나씩 켜 봐요', 5000); }
    else if (li === 1) { S.heatT = 0; S.heat = 0; sHeat.value = 0; oHeat.textContent = '0 %'; sHeat.style.setProperty('--pct', '0%'); S.pred = { L: 0, R: 0 }; S.predOK = 0; S.showPred = false; seedConv(); setMode('convect'); showHint('지구 내부의 열을 올려 보세요', 5000); }
    else if (li === 2) { S.bsub = 'explore'; S.mot = null; S.conv = 'sub'; S.seen = new Set(); S.seenT = {}; S.bt = 0; initMatch(); setMode('boundary'); showHint('두 판의 상대 운동을 골라 보세요', 5000); }
    else { S.sp = 'ridge'; S.drilled = new Set(); S.dAnim = {}; S.lastSite = -1; S.hawMeasured = new Set(); S.hawDir = null; inRidge.value = ''; inHawaii.value = ''; S.speedOK = 0; S.hawOK = 0; hawSet(60); S.hawPlay = false; setMode('speed'); showHint('배를 눌러 해저를 시추해 봐요', 5000); }
  }
  function ensure(m, extra) { if (extra) extra(); if (S.mode !== m) setMode(m); else updateCtl(); }
  const ridgeV = () => num(inRidge), hawV = () => num(inHawaii);

  const levels = [
    {
      title: '지진·화산 분포 살펴보기', short: '지진·화산 분포', icon: '🗺️', phase: '관찰', features: ['map'],
      intro: '<p class="si-q">❓ 탐구 질문: 화산과 지진은 아무 곳에서나 일어날까? 땅을 움직이는 힘은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 대륙 이동과 판의 경계(중2)를 배웠고, 지진과 화산이 재해를 일으킨다는 것도 알아봤어요(중3). 이제 <b>판구조론</b>으로 지권의 변화를 해석해 봐요.</div>' +
        '<p>세계 지도 위에 <b>지진의 진앙</b>과 <b>화산</b>의 분포, 그리고 <b>판의 경계</b>를 차례로 겹쳐 보면서 어떤 규칙이 있는지 찾아봐요. 지도를 눌러 둘레의 지진·화산 수도 세어 볼 수 있어요.</p>',
      setup() { enterLevel(0); },
      recap: '지진과 화산은 아무 곳에서나 일어나지 않고, 판의 경계를 따라 띠 모양으로 모여 있어요. 판의 경계에서 먼 곳(우리나라 등)은 지진과 화산이 드물어요.',
      summary: '<ul><li>지진(진앙)과 화산은 <b>띠 모양</b>으로 분포해요. 이 띠는 <b>판의 경계</b>와 거의 일치해요. (환태평양 조산대 등)</li><li>판 경계에서 먼 판의 안쪽(우리나라 등)은 지진·화산이 드물어요.</li><li>이 분포를 설명하는 이론이 <b>판구조론</b>이에요: 지구의 겉부분(암석권)이 여러 개의 <b>판</b>으로 나뉘어 움직여요.</li></ul>',
      missions: [
        {
          title: '자료 3가지 겹쳐 보기',
          goal: '<b>● 지진</b>, <b>▲ 화산</b>, <b>━ 판 경계</b> 자료를 모두 켜서 서로 겹쳐 보세요.',
          hint: '오른쪽 세 버튼을 모두 눌러 켜요. 지도의 점과 삼각형이 노란 선(판 경계) 가까이에 모여 있는지 살펴보세요.',
          setup() { ensure('map'); },
          check: () => S.lay.eq && S.lay.vol && S.lay.bnd, hold: 0.9,
          status: () => mark(S.lay.eq) + ' 지진 · ' + mark(S.lay.vol) + ' 화산 · ' + mark(S.lay.bnd) + ' 판 경계',
          explain: '지진과 화산은 <b>띠 모양</b>으로 모여 있고, 그 띠는 노란색 <b>판 경계</b>를 따라가요. 지진의 약 ' + NEARQ + ' %가 판 경계 가까이에서 일어났어요. 한반도는 띠에서 벗어나 있어요.',
        },
        {
          type: 'quiz', title: '지진·화산이 모인 곳',
          goal: '지도에서 지진과 화산이 많이 모여 있는 곳은 어디일까요?',
          setup() { ensure('map'); },
          choices: ['지구 어디에서나 고르게 일어난다', '판의 경계를 따라 띠 모양으로 모여 있다', '대륙의 한가운데에 주로 모여 있다', '적도 근처에만 모여 있다'],
          answer: 1,
          feedback: ['점들이 고르게 퍼져 있지 않고 띠를 이뤄요.', '', '대륙 한가운데(판의 안쪽)는 오히려 드물어요.', '적도 근처에도 있지만 태평양 가장자리처럼 위도와 상관없이 띠를 이뤄요.'],
          explain: '지진과 화산은 <b>판의 경계</b>를 따라 모여 있어요. 가장 뚜렷한 곳이 태평양을 둘러싼 <b>환태평양 조산대</b>(불의 고리)예요.',
        },
      ],
    },
    {
      title: '맨틀 대류와 판의 이동', short: '맨틀 대류', icon: '🔥', phase: '모형', features: ['convect'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지진과 화산이 판의 경계에 모여 있다는 것을 알았어요. 그럼 판은 왜 움직일까요?</div>' +
        '<p>지구 내부에는 <b>열</b>(방사성 원소의 붕괴열 등)이 있어요. 이 열이 <b>맨틀</b>을 천천히 순환시키는 <b>맨틀 대류</b>를 일으키고, 그 위에 놓인 <b>판</b>(암석권)이 함께 움직여요. 에너지의 흐름이 지권을 움직이는 거예요.</p>',
      setup() { enterLevel(1); },
      recap: '지구 내부 에너지(열)가 맨틀 대류를 일으키고, 맨틀 대류가 판을 움직여요. 대류가 올라오는 곳은 해령, 내려가는 곳은 해구예요.',
      summary: '<ul><li><b>에너지 흐름</b>: 지구 내부의 열 → 맨틀 대류 → 판의 이동 → 지진·화산·산맥</li><li>뜨거운 맨틀은 <b>상승</b>(해령 아래), 식은 맨틀은 <b>하강</b>(해구 아래)해요.</li><li>판은 연약권 위를 <b>1년에 수 cm</b>(손톱이 자라는 속도) 움직여요.</li></ul>',
      missions: [
        {
          title: '열원 켜기',
          goal: '<b>지구 내부 열</b>을 <b>60 % 이상</b>으로 올려 맨틀이 돌아가는 모습을 보세요.',
          hint: '오른쪽 슬라이더를 끌어 올려요. 주황색(뜨거운) 입자와 파란색(식은) 입자의 움직임을 보세요.',
          setup() { ensure('convect', () => { S.showPred = false; }); },
          check: () => S.heat >= 0.6, hold: 1.0,
          status: () => mark(S.heat >= 0.6) + ' 내부 열 ' + Math.round(S.heat * 100) + ' % (60 % 이상)',
          explain: '열이 많을수록 맨틀이 빨리 돌고 판도 빨리 움직여요. 뜨거운 맨틀은 가벼워져 <b>올라가고</b>, 위에서 식으면 무거워져 <b>가라앉아요</b>. 이것이 <b>맨틀 대류</b>예요.',
        },
        {
          title: '판이 움직이는 방향 맞히기',
          goal: '열을 <b>40 % 이상</b>으로 켠 채, <b>왼쪽 판</b>과 <b>오른쪽 판</b>이 어느 쪽으로 움직일지 골라 보세요. (대류가 판을 끌고 가요)',
          hint: '맨틀이 해령 아래에서 올라와 위쪽에서는 양옆으로 퍼져 가요. 판은 그 흐름을 따라 움직여요.',
          setup() { ensure('convect', () => { S.showPred = true; }); },
          check: () => { const ok = S.pred.L === -1 && S.pred.R === 1 && S.heat >= 0.4; if (ok && !S.predOK) S.predOK = 1; return ok; }, hold: 1.0,
          status: () => mark(S.heat >= 0.4) + ' 열 40 % 이상 · ' + mark(S.pred.L === -1) + ' 왼쪽 판 · ' + mark(S.pred.R === 1) + ' 오른쪽 판' + ((S.pred.L && S.pred.L !== -1) || (S.pred.R && S.pred.R !== 1) ? ' (그림의 흐름을 다시 보세요)' : ''),
          explain: '맨틀이 해령(가운데)에서 올라와 위쪽에서 <b>양옆으로 갈라져 흐르므로</b> 왼쪽 판은 왼쪽으로, 오른쪽 판은 오른쪽으로 움직여요. 해구에서는 식은 맨틀과 함께 판이 <b>가라앉아요</b>.',
        },
        {
          type: 'quiz', title: '판을 움직이는 에너지',
          goal: '판을 움직이는 맨틀 대류를 일으키는 <b>에너지</b>는 무엇일까요?',
          setup() { ensure('convect'); },
          choices: ['태양 에너지', '지구 내부 에너지(방사성 원소의 붕괴열 등)', '달의 인력', '바람의 에너지'],
          answer: 1,
          feedback: ['태양 에너지는 맨틀까지 닿지 않아요. 날씨와 물 순환을 일으켜요.', '', '달의 인력은 밀물과 썰물을 일으켜요.', '바람은 대기에서 불어요. 땅속의 맨틀과는 관계가 없어요.'],
          explain: '맨틀 대류와 판의 이동은 <b>지구 내부 에너지</b>(방사성 원소의 붕괴열과 지구가 생길 때의 열)에서 비롯돼요. 앞서 배운 대로 태양 에너지는 기권·수권을, 지구 내부 에너지는 지권을 움직여요.',
        },
      ],
    },
    {
      title: '판의 경계와 지형', short: '판의 경계', icon: '↔', phase: '탐구', features: ['boundary'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 판이 맨틀 대류를 따라 움직이는 것을 봤어요. 움직이는 판들이 만나는 곳에서는 어떤 일이 생길까요?</div>' +
        '<p>두 판이 <b>서로 멀어지기</b> · <b>서로 가까워지기</b> · <b>어긋나게 스치기</b>의 세 가지로 움직일 때 나타나는 지형과 지진·화산을 관찰해요. 가까워질 때는 <b>해양판–대륙판</b>(섭입)과 <b>대륙판–대륙판</b>(충돌)을 모두 살펴봐요.</p>',
      setup() { enterLevel(2); },
      recap: '발산형은 해령·열곡대, 수렴형은 섭입(해구·화산대)과 충돌(습곡산맥), 보존형은 변환 단층이에요. 지진은 모든 경계에서, 화산은 충돌형·보존형을 뺀 경계에서 일어나요.',
      summary: '<table class="mini"><tr><th>경계</th><th>예</th><th>지형·현상</th></tr><tr><td>발산형</td><td>대서양 중앙 해령</td><td>해령·열곡대, 얕은 지진, 화산</td></tr><tr><td>수렴형(섭입)</td><td>일본 해구</td><td>해구, 호상 열도·화산대, 깊은 지진</td></tr><tr><td>수렴형(충돌)</td><td>히말라야 산맥</td><td>습곡산맥, 화산 거의 없음</td></tr><tr><td>보존형</td><td>산안드레아스 단층</td><td>변환 단층, 얕은 지진</td></tr></table>',
      missions: [
        {
          title: '경계 네 가지 만들어 보기',
          goal: '두 판의 상대 운동을 바꿔서 <b>발산 · 섭입 · 충돌 · 보존</b> 경계를 모두 만들어 보세요. 한 장면을 <b>2초 이상</b> 지켜봐요.',
          hint: '“가까워짐”을 고른 뒤 아래에서 해양판–대륙판(섭입)과 대륙판–대륙판(충돌)을 각각 골라요.',
          setup() { ensure('boundary', () => { S.bsub = 'explore'; }); },
          check: () => ['div', 'sub', 'coll', 'trans'].every((k) => S.seen.has(k)), hold: 0.3,
          status: () => ['div', 'sub', 'coll', 'trans'].map((k) => mark(S.seen.has(k)) + ' ' + { div: '발산', sub: '섭입', coll: '충돌', trans: '보존' }[k]).join(' · '),
          explain: '<b>발산</b>(멀어짐): 마그마가 올라와 새 해양 지각이 생기고 해령이 만들어져요. <b>섭입</b>: 무거운 해양판이 가라앉아 해구와 화산대가 생겨요. <b>충돌</b>: 대륙판끼리 부딪쳐 습곡산맥이 솟아요. <b>보존</b>: 판이 어긋나게 스쳐 변환 단층이 생겨요.',
        },
        {
          title: '장소와 경계 짝짓기',
          goal: '장소 카드 <b>4장</b>을 알맞은 경계 상자에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '히말라야는 높은 산맥, 일본 해구는 바다 밑 깊은 골, 대서양 중앙 해령은 바다 한가운데 산맥, 산안드레아스는 땅이 어긋난 단층이에요.',
          manual: true,
          setup() { ensure('boundary', () => { S.bsub = 'match'; }); },
          check() {
            const un = boardsB.items.filter((c) => !c.slot).length;
            if (un) return '아직 상자에 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
            const bad = boardsB.items.filter((c) => c.slot.key !== c.ans);
            bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return bad.map((c) => '<b>' + c.label + '</b>').join(', ') + ' 카드를 다시 생각해 보세요.';
            if (!S.matchOK) { SciSim.tween(S, { matchOK: 1 }, { duration: 0.7 }); boardsB.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '<b>히말라야</b> = 수렴형(충돌), <b>일본 해구</b> = 수렴형(섭입), <b>대서양 중앙 해령</b> = 발산형, <b>산안드레아스 단층</b> = 보존형이에요. 이 장소들은 앞 단계 지도에서 지진·화산이 모인 띠와 같아요.',
        },
        {
          type: 'quiz', title: '히말라야에 화산이 거의 없는 까닭',
          goal: '히말라야 산맥은 매우 높은데 <b>화산은 거의 없어요</b>. 그 까닭은 무엇일까요?',
          setup() { ensure('boundary', () => { S.bsub = 'explore'; S.mot = 'conv'; S.conv = 'coll'; S.bt = 0; }); },
          choices: ['판이 멀어지는 발산형 경계라서', '대륙판끼리 충돌하는 경계라서 한쪽이 가라앉아 마그마를 만들지 않기 때문', '판의 안쪽이라서 아무 일도 일어나지 않기 때문', '판이 어긋나게 스치는 보존형 경계라서'],
          answer: 1,
          feedback: ['발산형 경계에서는 해령이 생겨요. 히말라야는 판이 가까워지는 곳이에요.', '', '히말라야는 판의 경계에 있고 지진도 자주 일어나요.', '보존형은 변환 단층이에요. 히말라야는 수렴형 경계예요.'],
          explain: '인도판과 유라시아판은 둘 다 <b>대륙판</b>이라 서로 부딪혀 지각이 짧아지고 두꺼워지며 <b>습곡산맥</b>이 돼요. 섭입이 일어나지 않아 마그마가 거의 만들어지지 않아서 화산은 드물어요. 지진은 자주 일어나요.',
        },
      ],
    },
    {
      title: '판의 이동 속도 구하기', short: '이동 속도', icon: '📏', phase: '분석', features: ['speed'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 판의 경계마다 다른 현상이 나타난다는 것을 알았어요. 그럼 판은 얼마나 빠르게, 어느 쪽으로 움직일까요?</div>' +
        '<p>두 가지 자료로 판의 이동을 <b>정량적으로</b> 구해요. ① <b>해저 암석의 나이</b>: 해령에서 멀수록 암석이 오래돼요. ② <b>하와이 열도</b>: 고정된 <b>열점</b> 위를 판이 지나가며 화산섬이 줄지어 생겨요. <b>속도 = 거리 ÷ 시간</b>이에요.</p>',
      setup() { enterLevel(3); },
      recap: '해령에서 멀수록 해저 암석의 나이가 많아지고, 그 기울기로 판의 이동 속도(약 5 cm/년)를 구할 수 있어요. 열점은 고정되어 있어서 섬의 나이·거리로 판의 이동 방향과 속도(약 10 cm/년)를 알 수 있어요.',
      summary: '<ul><li><b>속도 = 거리 ÷ 나이</b>. 1 km/백만 년 = 1 mm/년.</li><li>대서양 중앙 해령: 1000 km ÷ 2000만 년 = 50 km/백만 년 = <b>약 5 cm/년</b>.</li><li>하와이 열도: 카우아이섬 약 510 km ÷ 510만 년 ≈ 100 km/백만 년 = <b>약 10 cm/년</b>, 방향은 <b>북서쪽</b>.</li><li>열점은 고정, <b>판이 움직여서</b> 섬이 줄지어 생겨요 (섬 줄 = 판의 이동 기록).</li></ul>',
      missions: [
        {
          title: '해저 암석의 나이로 속도 구하기',
          goal: '배를 눌러 <b>4곳 이상</b> 시추해 나이를 알아내고, 거리와 나이의 관계로 <b>판의 확장 속도(cm/년)</b>를 구해 입력하세요.',
          hint: '예: 1000 km ÷ 20 백만 년 = 50 km/백만 년 이고, 1 km/백만 년 = 1 mm/년이에요. mm를 cm로 바꾸는 것도 잊지 마세요.',
          setup() { ensure('speed', () => { S.sp = 'ridge'; }); },
          check: () => { const v = ridgeV(); const ok = S.drilled.size >= 4 && v != null && v >= 4.5 && v <= 5.5; if (ok && !S.speedOK) SciSim.tween(S, { speedOK: 1 }, { duration: 0.7 }); return ok; }, hold: 0.5,
          status: () => { const v = ridgeV(); return mark(S.drilled.size >= 4) + ' 시추 ' + S.drilled.size + ' / 4곳 · ' + mark(v != null && v >= 4.5 && v <= 5.5) + ' 속도 ' + (v == null ? '입력 전' : v + ' cm/년' + (v >= 4.5 && v <= 5.5 ? '' : ' (다시 계산해 봐요)')); },
          explain: '해령에서 1000 km 떨어진 암석의 나이가 약 2000만 년이므로 속도 = 1000 km ÷ 2000만 년 = <b>50 km/백만 년 = 50 mm/년 = 약 5 cm/년</b>이에요. 점들이 원점을 지나는 직선 위에 있다는 것은 판이 <b>일정한 속도로</b> 멀어졌다는 뜻이에요.',
        },
        {
          title: '하와이 열도로 방향과 속도 구하기',
          goal: '섬 <b>2개 이상</b>을 눌러 나이와 거리를 알아낸 뒤, 판의 <b>이동 속도(cm/년)</b>와 <b>방향</b>을 입력하세요.',
          hint: '카우아이섬은 열점에서 약 510 km 떨어져 있고 나이는 약 5.1 백만 년이에요. 섬 줄이 어느 쪽으로 뻗어 있는지도 보세요. (지도는 위가 북쪽)',
          setup() { ensure('speed', () => { S.sp = 'hawaii'; }); },
          check: () => { const v = hawV(), m = [...S.hawMeasured].filter((i) => i > 0).length, ok = m >= 2 && v != null && v >= 9 && v <= 11 && S.hawDir === 'NW'; if (ok && !S.hawOK) SciSim.tween(S, { hawOK: 1 }, { duration: 0.7 }); return ok; }, hold: 0.5,
          status: () => { const v = hawV(), m = [...S.hawMeasured].filter((i) => i > 0).length; return mark(m >= 2) + ' 측정 ' + m + ' / 2섬 · ' + mark(v != null && v >= 9 && v <= 11) + ' 속도 ' + (v == null ? '입력 전' : v + ' cm/년') + ' · ' + mark(S.hawDir === 'NW') + ' 방향 ' + ({ NE: '북동', NW: '북서', SE: '남동', SW: '남서' }[S.hawDir] || '선택 전'); },
          explain: '섬들은 열점에서 <b>북서쪽</b>으로 줄지어 있고, 오래된 섬일수록 멀어요. 카우아이섬: 510 km ÷ 510만 년 = 약 100 km/백만 년 = 100 mm/년 = <b>약 10 cm/년</b>이에요. 열점은 고정이므로 <b>태평양판이 북서쪽으로 약 10 cm/년</b>씩 움직인 거예요.',
        },
        {
          type: 'quiz', title: '열점이 고정이라면',
          goal: '열점이 한곳에 <b>고정</b>되어 있을 때, 줄지어 늘어선 화산섬은 무엇을 알려 줄까요?',
          setup() { ensure('speed', () => { S.sp = 'hawaii'; }); },
          choices: ['섬마다 열점이 따로 있었다는 것', '판이 열점 위를 지나며 움직인 방향과 속도', '열점이 움직인 경로', '바닷물이 흐르는 방향'],
          answer: 1,
          feedback: ['열점 하나가 고정되어 있고, 판이 움직였어요.', '', '열점은 고정이라고 했어요. 움직인 것은 판이에요.', '섬의 나이와 거리는 바닷물이 아니라 판의 이동을 알려 줘요.'],
          explain: '열점은 한곳에 머물러 있고 <b>판이 그 위를 지나가며</b> 화산섬이 차례로 생겨요. 그래서 섬이 줄지어 있는 방향이 판의 <b>이동 방향</b>, 섬의 나이와 거리가 판의 <b>이동 속도</b>를 알려 줘요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-plate-tectonics', mount: '#game', badge: '판구조 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { map: '🗺️ 세계 지진·화산 분포 지도', convect: '🔥 맨틀 대류 단면 · 내부 열 슬라이더', boundary: '↔ 판의 경계 단면 · 장소 짝짓기', speed: '📏 해저 암석 나이 · 하와이 열도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initMatch();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    ['eq', 'vol'].forEach((k) => { S.layA[k] = RM ? (S.lay[k] ? 1 : 0) : SciSim.approach(S.layA[k], S.lay[k] ? 1.05 : 0, dt, 1.6); });
    S.layA.bnd = RM ? (S.lay.bnd ? 1 : 0) : SciSim.approach(S.layA.bnd, S.lay.bnd ? 1.02 : 0, dt, 2.2);
    S.heat = RM ? S.heatT : SciSim.approach(S.heat, S.heatT, dt, 3); if (Math.abs(S.heat - S.heatT) < 0.003) S.heat = S.heatT;
    if (S.mode === 'convect') stepConv(dt);
    if (S.mode === 'boundary') { S.bt += dt; const k = bKey(); if (k) { S.seenT[k] = (S.seenT[k] || 0) + dt; if (S.seenT[k] > 2) S.seen.add(k); } }
    if (S.hawPlay) { const v = Math.min(60, (S.hawT + 6) * 10 + dt * 8); hawSet(v); if (v >= 60) S.hawPlay = false; }
    boardsB.step(dt); parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'map') drawMapScene(t, dt); else if (S.mode === 'convect') drawConvect(t, dt); else if (S.mode === 'boundary') drawBoundaryScene(t, dt); else drawSpeed(t, dt);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  function put(B, c, s) { const old = c.slot; if (old) { old.items.splice(old.items.indexOf(c), 1); B.layout(old); } s.items.push(c); c.slot = s; c.free = false; B.layout(s); c.x = c.tx; c.y = c.ty; c.sc = c.tsc; c.bad = false; }
  window.__sim = {
    S, VW, VH, boardsB, MAPR, SITES, HI, HG, SPG, QUAKES, VOLC, countNear, get game() { return game; }, enterLevel, setMode, updateCtl, hawSet,
    solve(right) { boardsB.items.forEach((c) => { const keys = ['div', 'sub', 'coll', 'trans']; const key = right === false ? keys[(keys.indexOf(c.ans) + 1) % 4] : c.ans; put(boardsB, c, boardsB.slots.find((s) => s.key === key)); }); },
    drillAll() { SITES.forEach((_, i) => drill(i)); },
  };
})();
