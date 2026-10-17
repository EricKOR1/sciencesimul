/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 지구시스템 (단원 1차시)
   성취기준 [10통과1-03-01] 지구시스템은 태양계라는 시스템의 구성요소임을 알고, 지구시스템을 구성하는 권역들
   간의 물질 순환과 에너지 흐름의 결과로 나타나는 현상을 논증할 수 있다.
   ① 관찰: 시스템이란 (자전거 → 태양계 → 지구의 다섯 권역)
   ② 탐구: 권역의 층 (지권·기권·수권 단면 이름표, 권역 분류)
   ③ 탐구: 에너지원 (태양·지구 내부·달, 현상 짝짓기)
   ④ 확인: 지구시스템 한눈에 (관계도 빈칸 채우기)
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
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#0b1226' });
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
     그림: 둥근 지구 (정사영) · 대륙 · 구름 · 생물
     ====================================================== */
  const LAND = (window.WORLD && window.WORLD.land) || [];
  function pip(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  const GR = rng(21);
  const FOREST = []; const PLANK = [];
  (function () {
    const big = [0, 2, 3, 4, 5].map((i) => LAND[i]).filter(Boolean);
    let guard = 0;
    while (FOREST.length < 170 && guard++ < 5000) {
      const P = big[Math.floor(GR() * big.length)], lo = -170 + GR() * 340, la = -55 + GR() * 125;
      if (P === LAND[5]) continue;
      if (pip(P, lo, la)) FOREST.push({ lo, la, s: 0.6 + GR() * 0.9, ph: GR() * 6 });
    }
    guard = 0;
    while (PLANK.length < 140 && guard++ < 5000) {
      const lo = -180 + GR() * 360, la = -60 + GR() * 130;
      if (!LAND.some((P) => pip(P, lo, la))) PLANK.push({ lo, la, ph: GR() * 6 });
    }
  })();
  const CLOUD = Array.from({ length: 34 }, () => ({ lo: GR() * 360 - 180, la: -65 + GR() * 130, w: 0.07 + GR() * 0.12, sp: 2 + GR() * 3 }));
  function drawGlobe(cx, cy, R, lon0, a, t) {
    a = Object.assign({ geo: 1, hyd: 1, atm: 1, bio: 1 }, a);
    const tilt = 0.38, cs = Math.cos(tilt), sn = Math.sin(tilt), D2R = Math.PI / 180;
    const proj = (lon, lat) => {
      const la = lat * D2R, lo = (lon - lon0) * D2R;
      const x = Math.cos(la) * Math.sin(lo), y0 = Math.sin(la), z0 = Math.cos(la) * Math.cos(lo);
      return [x, y0 * cs - z0 * sn, y0 * sn + z0 * cs];
    };
    const gray = '#475569';
    // 기권 후광
    if (a.atm > 0.02) { const g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16); g.addColorStop(0, SciSim.color.rgba('#7dd3fc', 0.7 * a.atm)); g.addColorStop(1, SciSim.color.rgba('#7dd3fc', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, 6.3); ctx.fill(); }
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.3); ctx.clip();
    // 바다
    const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    og.addColorStop(0, SciSim.color.mix('#60a5fa', gray, 1 - a.hyd)); og.addColorStop(0.6, SciSim.color.mix('#2563eb', gray, 1 - a.hyd)); og.addColorStop(1, SciSim.color.mix('#1e3a8a', '#1e293b', 1 - a.hyd));
    ctx.fillStyle = og; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 대륙
    LAND.forEach((P, pi) => {
      const pts = P.map((q) => proj(q[0], q[1]));
      if (!pts.some((q) => q[2] > -0.05)) return;
      ctx.beginPath();
      pts.forEach((q, i) => {
        let x = q[0], y = q[1];
        if (q[2] < 0) { const m = Math.hypot(x, y) || 1; x = x / m * 1.02; y = y / m * 1.02; }
        const px = cx + x * R, py = cy - y * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = pi === 1 || pi === 5 ? SciSim.color.mix('#f1f5f9', gray, 1 - a.geo) : SciSim.color.mix('#a8855a', gray, 1 - a.geo);
      ctx.fill();
    });
    // 숲·플랑크톤 (생물권)
    if (a.bio > 0.02) {
      FOREST.forEach((f) => { const q = proj(f.lo, f.la); if (q[2] < 0.08) return; const pul = 1 + 0.25 * Math.sin(t * 3 + f.ph) * (a.bio > 0.9 ? 1 : 0); ctx.fillStyle = 'rgba(22,163,74,' + (0.85 * a.bio) + ')'; ctx.beginPath(); ctx.arc(cx + q[0] * R, cy - q[1] * R, f.s * (R / 60) * pul, 0, 6.3); ctx.fill(); });
      PLANK.forEach((f) => { const q = proj(f.lo, f.la); if (q[2] < 0.1) return; ctx.fillStyle = 'rgba(52,211,153,' + (0.7 * a.bio) + ')'; ctx.beginPath(); ctx.arc(cx + q[0] * R, cy - q[1] * R, 0.9 * (R / 60), 0, 6.3); ctx.fill(); });
    }
    // 구름 (기권)
    if (a.atm > 0.02) {
      CLOUD.forEach((c) => {
        const q = proj(c.lo + t * c.sp, c.la); if (q[2] < 0.05) return;
        const ex = R * c.w * (0.5 + q[2] * 0.5);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.62 * a.atm * Math.min(1, q[2] * 2)) + ')';
        ctx.beginPath(); ctx.ellipse(cx + q[0] * R, cy - q[1] * R, ex, ex * 0.38, 0, 0, 6.3); ctx.fill();
      });
    }
    // 입체감
    const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.35, cx + R * 0.1, cy + R * 0.1, R * 1.1);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,12,40,.62)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'zoom', sub: 'geo', clock: 0, fade: 0,
    z: 0, zt: 0, visited: new Set([0]), chainOff: false, chainFall: 0, chainTest: 0, pedalOn: true,
    thC: 0, thW: 0, wSpeed: 0,
    sel: -1, selIdle: 0, selAuto: 0, earthSeen: new Set(),
    open: 0, geoVer: 0,
    src: { sun: false, core: false, moon: false }, srcA: { sun: 0, core: 0, moon: 0 }, srcSeen: new Set(), lastSrc: null,
    tideA: 0, mapOK: 0, sortOK: 0, pairOK: 0, layerOK: { geo: false, atm: false, hyd: false },
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const SEL_ORDER = ['geo', 'hyd', 'atm', 'bio', 'spc'];

  /* ======================================================
     화면 1: 시스템이란 (자전거 → 태양계 → 지구)
     ====================================================== */
  const BK = PHONE ? { cx: 300, cy: 330, u: 1.05 } : { cx: 400, cy: 262, u: 1.2 };
  const SOL = PHONE ? { cx: 300, cy: 410, rx: 258, flat: 0.95 } : { cx: 400, cy: 292, rx: 340, flat: 0.56 };
  const PLANETS = [
    { n: '수성', f: 0.13, r: 4.5, c: '#b8b8b8', T: 4 }, { n: '금성', f: 0.21, r: 6.5, c: '#e8c27a', T: 7 },
    { n: '지구', f: 0.31, r: 7.5, c: '#3b82f6', T: 12, earth: true }, { n: '화성', f: 0.41, r: 5.5, c: '#e2603a', T: 19 },
    { n: '목성', f: 0.58, r: 15, c: '#d9a066', T: 34 }, { n: '토성', f: 0.72, r: 12, c: '#e9d28c', T: 56, ring: true },
    { n: '천왕성', f: 0.86, r: 9, c: '#7fd6e6', T: 80 }, { n: '해왕성', f: 1.0, r: 9, c: '#4a6fe0', T: 110 },
  ];
  PLANETS.forEach((p, i) => { p.a0 = i * 1.1 + 0.5; });
  const ES = PHONE ? { cx: 300, cy: 330, R: 112 } : { cx: 330, cy: 292, R: 128 };
  const STAGE_NAME = ['자전거', '태양계', '지구시스템'];
  const STARS = (() => { const r = rng(5); return Array.from({ length: 150 }, () => ({ x: r() * 800, y: r() * 840, s: 0.5 + r() * 1.3, p: r() * 6 })); })();
  const DUSTS = (() => { const r = rng(9); return Array.from({ length: 12 }, () => ({ a: r() * 6.28, p: r(), sp: 0.12 + r() * 0.18 })); })();
  function stars(alpha, t) {
    ctx.fillStyle = '#fff';
    STARS.forEach((s) => { if (s.x > VW || s.y > VH) return; ctx.globalAlpha = alpha * (0.4 + 0.5 * Math.sin(t * 1.5 + s.p) * 0.5 + 0.25); ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.3); ctx.fill(); });
    ctx.globalAlpha = 1;
  }

  /* --- 자전거 --- */
  function tangents(c1, r1, c2, r2, sgn) {
    const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy), ph = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d), an = ph + sgn * al;
    return { a: { x: c1.x + r1 * Math.cos(an), y: c1.y + r1 * Math.sin(an) }, b: { x: c2.x + r2 * Math.cos(an), y: c2.y + r2 * Math.sin(an) }, an, ph, al };
  }
  function wheel(x, y, r, th) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = r * 0.13; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 6.3); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#64748b';
    for (let i = 0; i < 14; i++) { const a = th + i * 6.283 / 14; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.08, Math.sin(a) * r * 0.08); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke(); }
    // 바퀴가 도는 것이 보이도록 표시
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(Math.cos(th) * r * 0.9, Math.sin(th) * r * 0.9, r * 0.07, 0, 6.3); ctx.fill();
    D.sphere(0, 0, r * 0.1, '#64748b', { gloss: false });
    ctx.restore();
  }
  function bikeGeom() {
    const u = BK.u, o = { x: BK.cx, y: BK.cy };
    const P = (x, y) => ({ x: o.x + x * u, y: o.y + y * u });
    return { u, P, R: P(-120, 55), F: P(120, 55), C: P(-10, 55), S: P(-40, -28), H: P(66, -26), H2: P(74, -4), G: P(62, -52), rw: 58 * u, ring: 17 * u, spr: 8 * u };
  }
  function drawBike(t, dt) {
    const g = bikeGeom(), u = g.u;
    // 땅
    const gy = g.R.y + g.rw + 3;
    ctx.fillStyle = '#d6e7c9'; ctx.fillRect(0, gy, VW, 6);
    ctx.fillStyle = '#c4dab5'; ctx.fillRect(0, gy + 6, VW, 16);
    ctx.fillStyle = '#9ab38a';
    const off = (t * S.wSpeed * g.rw * 0.6) % 70;
    for (let x = -70 + off; x < VW + 70; x += 70) ctx.fillRect(x, gy + 12, 34, 4);
    // 프레임
    const fr = (a, b, w, col) => { ctx.strokeStyle = col || '#2563eb'; ctx.lineWidth = w * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    // 체인
    const T1 = tangents(g.C, g.ring, g.R, g.spr, 1), T2 = tangents(g.C, g.ring, g.R, g.spr, -1);
    const fall = S.chainFall;
    const fl = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
    const gyc = gy - 4 * u;
    ctx.save(); ctx.lineCap = 'round';
    // 체인 도는 위상
    S.chainPh = (S.chainPh || 0) + (fall < 0.5 ? S.thC * 0 : 0);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.2 * u; ctx.setLineDash([5 * u, 3.6 * u]); ctx.lineDashOffset = -(S.thC * g.ring);
    // 위쪽 줄 / 아래쪽 줄
    const lines = [[T1, 0], [T2, 1]];
    lines.forEach(([T, k]) => {
      const a = fl(T.a, { x: g.C.x - 30 * u, y: gyc }, fall), b = fl(T.b, { x: g.R.x + 20 * u, y: gyc - 2 * u }, fall);
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      if (fall > 0.01) { const mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 10 * u * fall * (k ? 1 : -0.4) }; ctx.quadraticCurveTo(mid.x, mid.y, b.x, b.y); }
      else ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // 감기는 부분
    if (fall < 0.5) {
      ctx.globalAlpha = 1 - fall * 2; ctx.strokeStyle = '#334155'; ctx.lineWidth = 4.2 * u; ctx.setLineDash([5 * u, 3.6 * u]); ctx.lineDashOffset = -(S.thC * g.ring);
      ctx.beginPath(); ctx.arc(g.C.x, g.C.y, g.ring, T1.ph + T1.al, T1.ph + 2 * Math.PI - T1.al); ctx.stroke();
      ctx.beginPath(); ctx.arc(g.R.x, g.R.y, g.spr, T1.ph - T1.al, T1.ph + T1.al); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 바퀴
    wheel(g.R.x, g.R.y, g.rw, S.thW); wheel(g.F.x, g.F.y, g.rw, S.thW);
    // 프레임 선
    fr(g.C, g.S, 6); fr(g.S, g.H, 5.5); fr(g.C, g.H2, 6.5); fr(g.S, g.R, 3.4, '#1d4ed8'); fr(g.C, g.R, 3.4, '#1d4ed8'); fr(g.H2, g.F, 4.5, '#1d4ed8'); fr(g.H, g.H2, 7);
    // 안장·핸들
    ctx.fillStyle = '#111827'; rr(g.S.x - 20 * u, g.S.y - 14 * u, 36 * u, 9 * u, 4 * u).fill(); fr({ x: g.S.x - 2 * u, y: g.S.y - 8 * u }, g.S, 4, '#64748b');
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.moveTo(g.H.x, g.H.y); ctx.lineTo(g.G.x, g.G.y); ctx.lineTo(g.G.x + 22 * u, g.G.y - 3 * u); ctx.stroke();
    // 체인링·스프로킷
    D.sphere(g.C.x, g.C.y, g.ring, '#94a3b8', { gloss: false }); D.sphere(g.R.x, g.R.y, g.spr + 1, '#94a3b8', { gloss: false });
    // 페달(크랭크)
    const px = g.C.x + Math.cos(S.thC) * 24 * u, py = g.C.y + Math.sin(S.thC) * 24 * u, qx = g.C.x - Math.cos(S.thC) * 24 * u, qy = g.C.y - Math.sin(S.thC) * 24 * u;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = '#0f172a'; rr(px - 9 * u, py - 3 * u, 18 * u, 6 * u, 3 * u).fill(); rr(qx - 9 * u, qy - 3 * u, 18 * u, 6 * u, 3 * u).fill();
    D.sphere(g.C.x, g.C.y, 5 * u, '#334155', { gloss: false });
    // 힘 전달 표시
    if (S.pedalOn) {
      const fa = Math.sin(S.thC);
      D.arrow(px, py - 4, px, py + 20 + fa * 4, { color: '#f59e0b', width: 3.5, head: 9, alpha: 0.9 });
      if (fall < 0.3) {
        // 체인을 따라 흐르는 점
        ctx.fillStyle = '#f59e0b';
        for (let i = 0; i < 6; i++) { const k = ((t * 0.7 + i / 6) % 1); const a = T1.a, b = T1.b; ctx.beginPath(); ctx.arc(lerp(a.x, b.x, k), lerp(a.y, b.y, k), 3.4 * u, 0, 6.3); ctx.fill(); }
      }
    }
    if (S.chainOff && fall > 0.7) {
      D.label((g.C.x + g.R.x) / 2, g.C.y - 34 * u, '✖ 힘이 전달되지 않아요', { bg: '#e2464b', size: 13 });
    }
    // 이름표
    const lab = (txt, ax, ay, lx, ly, col) => {
      ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(ax, ay, 3.2, 0, 6.3); ctx.fill();
      D.label(lx, ly, txt, { bg: col || '#1e293b', size: 13.5 });
    };
    lab('안장', g.S.x - 8 * u, g.S.y - 14 * u, g.S.x - 60 * u, g.S.y - 66 * u);
    lab('핸들', g.G.x + 14 * u, g.G.y - 5 * u, g.G.x + 70 * u, g.G.y - 40 * u);
    lab('앞바퀴', g.F.x + Math.cos(0.7) * g.rw, g.F.y - Math.sin(0.7) * g.rw, g.F.x + g.rw + 62 * u, g.F.y - 70 * u);
    lab('뒷바퀴', g.R.x - Math.cos(0.7) * g.rw, g.R.y - Math.sin(0.7) * g.rw, g.R.x - g.rw - 52 * u, g.R.y - 70 * u);
    lab('체인', (g.C.x + g.R.x) / 2 - 4 * u, g.R.y + (S.chainOff ? 66 : 19) * u, (g.C.x + g.R.x) / 2 - 62 * u, gy + 50, '#334155');
    lab('페달', px, py + 4 * u, g.C.x + 60 * u, gy + 50, '#334155');
  }

  /* --- 태양계 --- */
  function planetPos(p, t) {
    const a = p.a0 + t * 6.283 / p.T;
    return { x: SOL.cx + SOL.rx * p.f * Math.cos(a), y: SOL.cy + SOL.rx * SOL.flat * p.f * Math.sin(a), a };
  }
  function drawSolar(t, labels) {
    // 궤도
    ctx.lineWidth = 1.2;
    PLANETS.forEach((p) => { ctx.strokeStyle = p.earth ? 'rgba(96,165,250,.7)' : 'rgba(148,163,184,.28)'; ctx.beginPath(); ctx.ellipse(SOL.cx, SOL.cy, SOL.rx * p.f, SOL.rx * SOL.flat * p.f, 0, 0, 6.3); ctx.stroke(); });
    // 태양
    D.glow(SOL.cx, SOL.cy, 70, '#ffb300', 0.55);
    D.sphere(SOL.cx, SOL.cy, 26, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    if (labels) TX(SOL.cx, SOL.cy + 47, '태양', { size: 14, color: '#fde68a', weight: 800 });
    // 중력(상호작용) 점선
    PLANETS.forEach((p) => { const q = planetPos(p, t); ctx.strokeStyle = 'rgba(253,230,138,' + (p.earth ? 0.5 : 0.14) + ')'; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.moveTo(SOL.cx, SOL.cy); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    ctx.setLineDash([]);
    PLANETS.forEach((p) => {
      const q = planetPos(p, t);
      if (p.ring) { ctx.strokeStyle = 'rgba(233,210,140,.85)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(q.x, q.y, p.r * 1.9, p.r * 0.6, -0.3, 0, 6.3); ctx.stroke(); }
      D.sphere(q.x, q.y, p.r, p.c, { shadow: true });
      if (p.earth) {
        const ma = t * 3.2; D.sphere(q.x + Math.cos(ma) * 14, q.y + Math.sin(ma) * 14, 2.2, '#e2e8f0', { gloss: false });
        const pul = 1 + 0.18 * Math.sin(t * 4);
        ctx.strokeStyle = 'rgba(125,211,252,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(q.x, q.y, 20 * pul, 0, 6.3); ctx.stroke();
      }
      if (labels && !p.earth) TX(q.x, q.y + p.r + 15, p.n, { size: 13, color: 'rgba(226,232,240,.9)', weight: 700 });
    });
    return planetPos(PLANETS[2], t);
  }

  /* --- 지구와 다섯 권역 --- */
  const EA = { geo: 1, hyd: 1, atm: 1, bio: 1, spc: 1 };
  const E_TXT = {
    all: '지구시스템 = 지권 + 수권 + 기권 + 생물권 + 외권. 이 권역들은 따로 있지 않고 서로 영향을 주고받아요.',
    geo: '지권: 지각·맨틀·핵으로 이루어진 땅과 땅속이에요. 화산, 지진, 산맥이 만들어지는 곳이에요.',
    hyd: '수권: 바다, 강, 호수, 빙하, 지하수 등 지구의 물이에요. 해류와 물의 순환이 일어나요.',
    atm: '기권: 지구를 둘러싼 공기예요. 구름, 바람, 비 같은 날씨가 나타나요.',
    bio: '생물권: 땅 위와 땅속, 물속, 공기 중에 걸쳐 살아가는 모든 생물이에요.',
    spc: '외권: 지구 대기권 밖의 우주 공간이에요. 태양과 달이 있고 우주 먼지도 들어와요.',
  };
  const EBOX = PHONE ? { x: 20, w: 560, y0: 560 } : { x: 20, w: 560, y0: 474 };
  const CHIP = PHONE ? SEL_ORDER.map((k, i) => ({ k, x: 80 + (i % 3) * 150 + (i >= 3 ? 75 : 0), y: 650 + Math.floor(i / 3) * 56, w: 138, h: 44 })) : SEL_ORDER.map((k, i) => ({ k, x: 700, y: 170 + i * 58, w: 150, h: 46 }));
  function drawEarthStage(t, dt) {
    const cx = ES.cx, cy = ES.cy, R = ES.R;
    const act = S.sel >= 0 ? SEL_ORDER[S.sel] : null;
    SEL_ORDER.forEach((k) => { const tg = !act || act === k ? 1 : 0.22; EA[k] = RM ? tg : SciSim.approach(EA[k], tg, dt, 8); });
    // 우주
    stars(0.4 + 0.6 * EA.spc, t);
    D.glow(70, 56, 110, '#ffb300', 0.5 * EA.spc); D.sphere(70, 56, 30, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    ctx.globalAlpha = 0.35 + 0.65 * EA.spc;
    D.sphere(PHONE ? 520 : 560, 70, 15, '#cbd5e1', { light: '#f1f5f9', dark: '#64748b' });
    TX(PHONE ? 520 : 560, 104, '달', { size: 13, color: '#e2e8f0', weight: 700 }); TX(70, 108, '태양', { size: 13, color: '#fde68a', weight: 700 });
    // 우주 먼지
    ctx.strokeStyle = 'rgba(203,213,225,' + (0.5 * EA.spc + 0.1) + ')'; ctx.lineWidth = 1.6;
    DUSTS.forEach((d) => {
      d.p = (d.p + dt * d.sp) % 1; const r0 = R * 2.4, r1 = R * 1.12, rr0 = lerp(r0, r1, d.p), x = cx + Math.cos(d.a) * rr0, y = cy + Math.sin(d.a) * rr0;
      if (rr0 < r1 + 2) return; const tail = 16; ctx.globalAlpha = (0.6 + 0.4 * EA.spc) * (1 - d.p * 0.4); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(d.a) * tail, y + Math.sin(d.a) * tail); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (act) D.glow(cx, cy, R * 1.55, SPH[act].col, 0.35);
    drawGlobe(cx, cy, R, -40 + t * 7, EA, t);
    // 선택한 권역 이름
    if (act) {
      const lx = cx - R * 1.0, ly = cy - R * 1.25;
      D.label(cx, cy - R * 1.28, SPH[act].name, { bg: SPH[act].col, size: 16 });
    }
    if (act === 'atm') { ctx.strokeStyle = 'rgba(125,211,252,.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
    if (act === 'bio') { ctx.strokeStyle = 'rgba(74,222,128,.85)'; ctx.lineWidth = 3; const pul = 0.5 + 0.5 * Math.sin(t * 4); ctx.globalAlpha = 0.4 + 0.5 * pul; ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
    // 칩
    CHIP.forEach((c) => {
      const on = act === c.k, col = SPH[c.k].col;
      ctx.save(); D.shadow(() => { ctx.fillStyle = on ? col : 'rgba(255,255,255,.94)'; rr(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(0,0,0,.35)' });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 14).stroke();
      TX(c.x, c.y + 5.5, SPH[c.k].name, { size: 16, color: on ? '#fff' : '#1b2333', weight: 800 });
      ctx.restore();
    });
    // 설명
    D.shadow(() => { ctx.fillStyle = 'rgba(15,23,42,.82)'; rr(EBOX.x, EBOX.y0, EBOX.w, PHONE ? 74 : 66, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.4)' });
    para(EBOX.x + 14, EBOX.y0 + 26, E_TXT[act || 'all'], EBOX.w - 28, 15, { color: '#f1f5f9', align: 'left', weight: 700 });
    if (!act) TX(CHIP[0].x, PHONE ? CHIP[0].y - 36 : CHIP[0].y - 42, PHONE ? '' : '권역을 눌러 보세요', { size: 14, color: '#bae6fd', weight: 800 });
  }

  /* --- 줌 장면 전체 --- */
  const CRUMB = ['🚲 자전거 시스템', '☀️ 태양계 시스템', '🌍 지구시스템'];
  const CAP = [
    '자전거는 페달·체인·바퀴·핸들·안장 같은 <b>구성요소</b>가 서로 힘을 주고받으며 하나로 움직여요.',
    '태양계는 태양과 행성, 위성 등이 <b>중력</b>으로 서로 영향을 주고받으며 하나로 움직이는 시스템이에요. 지구시스템은 이 태양계 시스템의 <b>구성요소</b>예요.',
    '지구시스템은 다섯 권역이 <b>물질과 에너지를 주고받으며</b> 하나로 움직이는 시스템이에요.',
  ];
  function drawZoom(t, dt) {
    const z = S.z;
    // 배경: 낮 하늘 → 우주
    const sp = sm(z, 0.3, 0.9);
    const sk = ctx.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, '#bfe3ff'); sk.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);
    if (sp > 0.01) { ctx.globalAlpha = sp; const bg = ctx.createRadialGradient(VW / 2, VH / 2, 40, VW / 2, VH / 2, VW * 0.8); bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#050816'); ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH); stars(1, t); ctx.globalAlpha = 1; }
    // 자전거
    const ab = 1 - sm(z, 0.05, 0.8);
    if (ab > 0.01) {
      ctx.save(); ctx.globalAlpha = ab; const k = 1 - 0.55 * sm(z, 0, 1);
      ctx.translate(BK.cx, BK.cy + 40); ctx.scale(k, k); ctx.translate(-BK.cx, -BK.cy - 40);
      drawBike(t, dt); ctx.restore();
    }
    // 태양계
    const as = sm(z, 0.3, 1) * (1 - sm(z, 1.3, 1.85));
    if (as > 0.01) {
      const f = sm(z, 1, 2), ef = planetPos(PLANETS[2], t), ox = lerp(ef.x, ES.cx, f), oy = lerp(ef.y, ES.cy, f), kk = 1 + 15 * Math.pow(f, 1.4) + (1 - sm(z, 0.3, 1)) * 0.0;
      const k0 = lerp(1.3, 1, sm(z, 0.3, 1));
      ctx.save(); ctx.globalAlpha = as; ctx.translate(ox, oy); ctx.scale(kk * k0, kk * k0); ctx.translate(-ef.x, -ef.y);
      drawSolar(t, f < 0.05);
      ctx.restore();
      if (f < 0.1 && as > 0.6) {
        const lbl = '지구시스템 (태양계의 구성요소)';
        const ly = ef.y > SOL.cy ? ef.y + 40 : ef.y - 40;
        ctx.globalAlpha = as; D.label(clamp(ef.x, 130, VW - 130), ly, lbl, { bg: '#0369a1', size: 13.5 }); ctx.globalAlpha = 1;
      }
    }
    // 지구
    const ae = sm(z, 1.55, 1.95);
    if (ae > 0.01) { ctx.save(); ctx.globalAlpha = ae; drawEarthStage(t, dt); ctx.restore(); }
    // 위쪽 단계 표시줄
    const crumbY = PHONE ? 30 : 30, cw = PHONE ? 176 : 196, gap = PHONE ? 8 : 12, x0 = VW / 2 - (3 * cw + 2 * gap) / 2;
    for (let i = 0; i < 3; i++) {
      const on = Math.abs(z - i) < 0.5, x = x0 + i * (cw + gap) + cw / 2;
      ctx.save(); D.shadow(() => { ctx.fillStyle = on ? '#0ea5e9' : 'rgba(255,255,255,' + (0.5 + 0.4 * (1 - sp)) + ')'; rr(x - cw / 2, crumbY - 17, cw, 34, 17).fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.25)' });
      TX(x, crumbY + 5.5, CRUMB[i], { size: 14, color: on ? '#fff' : '#334155', weight: 800 });
      ctx.restore();
      if (i < 2) TX(x + cw / 2 + gap / 2, crumbY + 5, '›', { size: 20, color: sp > 0.5 ? '#94a3b8' : '#475569', weight: 800 });
    }
    // 아래 설명(가장 가까운 단계)
    const near = Math.round(clamp(z, 0, 2));
    const bx = 20, bw = VW - 40, by = near === 2 ? -999 : (PHONE ? 690 : 480), bh = PHONE ? 130 : 66;
    if (near < 2) {
      D.shadow(() => { ctx.fillStyle = sp > 0.5 ? 'rgba(15,23,42,.84)' : 'rgba(255,255,255,.92)'; rr(bx, by, bw, bh, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.3)' });
      const plain = CAP[near].replace(/<\/?b>/g, '');
      para(bx + 16, by + 26, plain, bw - 32, 15.5, { color: sp > 0.5 ? '#f1f5f9' : '#1e293b', align: 'left', weight: 700 });
    }
  }
