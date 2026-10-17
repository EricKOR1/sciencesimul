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

  /* ======================================================
     화면 2: 권역의 층 (지권 · 기권 · 수권 단면과 이름표)
     ====================================================== */
  const LYR = {
    geo: {
      title: '지권의 층', tags: ['지각', '맨틀', '외핵', '내핵'], order: [2, 0, 3, 1],
      info: ['고체 · 깊이 약 5~35 km', '고체(천천히 흐름) · 약 2900 km까지', '액체 · 약 5100 km까지', '고체 · 중심(약 6371 km)'],
    },
    atm: {
      title: '기권의 층', tags: ['열권', '중간권', '성층권', '대류권'], order: [3, 1, 0, 2],
      info: ['80 km 이상 · 오로라', '50~80 km · 유성', '12~50 km · 오존층', '0~12 km · 날씨 현상'],
    },
    hyd: {
      title: '수권(바다)의 층', tags: ['혼합층', '수온 약층', '심해층'], order: [1, 2, 0],
      info: ['약 0~200 m · 수온이 거의 일정', '200~1000 m · 수온이 급히 낮아짐', '1000 m 아래 · 수온이 낮고 일정'],
    },
  };
  const LV = {
    geo: PHONE ? { cx: 300, cy: 214, R: 164 } : { cx: 236, cy: 282, R: 180 },
    atm: PHONE ? { cx: 50, w: 224, gy: 396, k: 0.86, tx: 330, tw: 236 } : { cx: 40, w: 190, gy: 506, k: 1, tx: 290, tw: 160 },
    hyd: PHONE ? { bx: 30, bw: 540, by: 46, ox: 50, ow: 220, oy: 156, k: 0.74, tx: 330, tw: 236 } : { bx: 30, bw: 410, by: 56, ox: 50, ow: 190, oy: 176, k: 1, tx: 290, tw: 150 },
  };
  const SLOT_BOX = PHONE ? { w: 280, h: 74 } : { w: 290, h: 78 };
  const boards = { geo: new Board(), atm: new Board(), hyd: new Board() };
  const layerReveal = { geo: 0, atm: 0, hyd: 0 };
  const layerShown = { geo: false, atm: false, hyd: false };
  function slotPos(i) {
    if (PHONE) return { x: 160 + (i % 2) * 290, y: 480 + Math.floor(i / 2) * 84 };
    return { x: 640, y: 62 + i * 88 };
  }
  function tagPos(i) {
    if (PHONE) return { x: 80 + i * 147, y: 700 };
    return { x: 572 + (i % 2) * 146, y: 424 + Math.floor(i / 2) * 52 };
  }
  function initLayers() {
    Object.keys(boards).forEach((k) => {
      const b = boards[k], cfg = LYR[k]; b.reset(); layerShown[k] = false; layerReveal[k] = 0;
      cfg.tags.forEach((name, i) => {
        const sp = slotPos(i);
        b.addSlot({ x: sp.x, y: sp.y, w: SLOT_BOX.w, h: SLOT_BOX.h, ix: -SLOT_BOX.w / 2 + 44 + 60, iy: -SLOT_BOX.h / 2 + 25, idx: i });
      });
      cfg.order.forEach((ti, j) => {
        const tp = tagPos(j);
        b.addItem({ label: cfg.tags[ti], ans: ti, hx: tp.x, hy: tp.y, w: 120, h: 36, size: 16, fill: '#fff', stroke: '#64748b' });
      });
    });
  }
  function layerCheck(k) {
    const b = boards[k], un = b.slots.filter((s) => !s.items.length).length;
    const bad = b.slots.filter((s) => s.items.length && s.items[0].ans !== s.idx);
    return { un, bad, ok: un === 0 && bad.length === 0 };
  }
  const SC_COL = { crust: '#7c4a21', mantle: '#c2410c', outer: '#f59e0b', inner: '#fde68a' };
  function drawGeo(t, dt) {
    const { cx, cy, R } = LV.geo, a = Math.PI / 4 * S.open;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, PHONE ? VW : 480, PHONE ? 430 : VH);
    D.glow(cx, cy, R * 1.5, '#38bdf8', 0.18);
    // 겉면(쐐기 제외)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, VW, VH);
    if (a > 0.001) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 3 * R * Math.cos(a), cy - 3 * R * Math.sin(a)); ctx.lineTo(cx + 3 * R * Math.cos(a), cy + 3 * R * Math.sin(a)); ctx.closePath(); }
    ctx.clip('evenodd');
    drawGlobe(cx, cy, R, 20 + t * 4, { atm: 0, bio: 0 }, t);
    ctx.restore();
    // 단면(쐐기 안)
    if (a > 0.001) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 3 * R * Math.cos(a), cy - 3 * R * Math.sin(a)); ctx.lineTo(cx + 3 * R * Math.cos(a), cy + 3 * R * Math.sin(a)); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#0b1226'; ctx.fillRect(cx, cy - R * 1.2, R * 1.3, R * 2.4);
      const disc = (r, c1, c2) => { const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); };
      disc(R, '#8b5a2b', SC_COL.crust);
      disc(R * 0.965, '#e0662c', '#9a3412');
      disc(R * 0.545, '#fbbf24', '#d97706');
      disc(R * 0.2, '#fffbeb', '#fde68a');
      // 외핵의 흐름(액체)
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.545, 0, 6.3); ctx.arc(cx, cy, R * 0.2, 0, 6.3, true); ctx.clip();
      ctx.strokeStyle = 'rgba(255,247,200,.55)'; ctx.lineWidth = 2.2;
      for (let i = 0; i < 9; i++) { const rr0 = R * (0.25 + 0.3 * ((i * 0.37) % 1)), ph = t * (0.9 + (i % 3) * 0.3) + i; ctx.beginPath(); ctx.arc(cx, cy, rr0, ph, ph + 0.7); ctx.stroke(); }
      ctx.restore();
      // 맨틀의 느린 흐름 무늬
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.965, 0, 6.3); ctx.arc(cx, cy, R * 0.545, 0, 6.3, true); ctx.clip();
      ctx.strokeStyle = 'rgba(254,215,170,.22)'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const rr0 = R * (0.6 + 0.33 * ((i * 0.41) % 1)), ph = t * 0.12 + i * 1.3; ctx.beginPath(); ctx.arc(cx, cy, rr0, ph, ph + 0.5); ctx.stroke(); }
      ctx.restore();
      // 내핵 결정 무늬(고체)
      ctx.strokeStyle = 'rgba(180,120,20,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(i * 1.3) * R * 0.04, cy + Math.sin(i * 1.3) * R * 0.04); ctx.lineTo(cx + Math.cos(i * 1.3) * R * 0.19, cy + Math.sin(i * 1.3) * R * 0.19); ctx.stroke(); }
      // 절단면 가장자리 그림자
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + R * 1.2 * Math.cos(a), cy - R * 1.2 * Math.sin(a)); ctx.lineTo(cx, cy); ctx.lineTo(cx + R * 1.2 * Math.cos(a), cy + R * 1.2 * Math.sin(a)); ctx.stroke();
      ctx.restore();
    }
    // 번호표
    const mk = (n, r, ang, lead) => {
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      if (lead) { const x2 = cx + Math.cos(ang) * (r + 24), y2 = cy + Math.sin(ang) * (r + 24); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); numDot(x2, y2, n); }
      else numDot(x, y, n);
    };
    ctx.globalAlpha = S.open;
    mk(1, R * 0.985, -a * 0.55, true); mk(2, R * 0.76, -a * 0.3, false); mk(3, R * 0.38, a * 0.35, false); mk(4, R * 0.065, 0, false);
    ctx.globalAlpha = 1;
    TX(PHONE ? 300 : 236, PHONE ? 420 : 548, '※ 지각은 실제보다 두껍게 그렸어요', { size: 13, color: '#94a3b8', weight: 700 });
    if (layerShown.geo) {
      const rv = layerReveal.geo;
      ctx.globalAlpha = rv; D.label(cx - R * 0.9, cy + R * 1.18 + (PHONE ? -4 : 0), '외핵은 액체, 내핵은 고체', { bg: '#f59e0b', size: 14 }); ctx.globalAlpha = 1;
    }
  }
  function numDot(x, y, n) {
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.3); ctx.fill(); }, { blur: 4, y: 1, color: 'rgba(0,0,0,.4)' });
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.3); ctx.stroke();
    TX(x, y + 5.5, String(n), { size: 15, color: '#0f172a', weight: 800 }); ctx.restore();
  }
  const ATM_BANDS = [{ n: '대류권', h0: 0, h1: 12, c0: '#9bd4ff', c1: '#6fb7f5' }, { n: '성층권', h0: 12, h1: 50, c0: '#5b9cf0', c1: '#4a62d6' }, { n: '중간권', h0: 50, h1: 80, c0: '#3f49b8', c1: '#2a2f86' }, { n: '열권', h0: 80, h1: 140, c0: '#241f6b', c1: '#0a0a2e' }];
  function atmY(h) {
    const o = LV.atm, k = o.k, b = [90 * k, 110 * k, 90 * k, 80 * k];
    let y = 0; const edges = [0, 12, 50, 80, 140];
    for (let i = 0; i < 4; i++) { if (h <= edges[i + 1]) return o.gy - (y + (h - edges[i]) / (edges[i + 1] - edges[i]) * b[i]); y += b[i]; }
    return o.gy - y;
  }
  const ATM_T = [[0, 15], [12, -56], [20, -56], [32, -44], [47, -3], [51, -3], [70, -60], [85, -92], [90, -92], [101, -60], [112, 20], [125, 100]];
  function drawAtm(t) {
    const o = LV.atm;
    const bg = ctx.createLinearGradient(0, 0, 0, o.gy); bg.addColorStop(0, '#0a0a2e'); bg.addColorStop(1, '#16224a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, PHONE ? VW : 480, PHONE ? 430 : VH);
    // 층
    ATM_BANDS.forEach((b) => {
      const y0 = atmY(b.h0), y1 = atmY(b.h1), g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, b.c0); g.addColorStop(1, b.c1);
      ctx.fillStyle = g; ctx.fillRect(o.cx, y1, o.w, y0 - y1);
    });
    // 별(열권)
    ctx.fillStyle = '#fff'; for (let i = 0; i < 22; i++) { const sx = o.cx + 8 + ((i * 53) % (o.w - 16)), sy = atmY(82) - 4 - ((i * 37) % Math.max(10, atmY(82) - atmY(140) - 8)); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 2 + i); ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
    // 오로라 (열권)
    for (let i = 0; i < 4; i++) {
      const ax = o.cx + o.w * (0.2 + i * 0.2), ay = atmY(100), g = ctx.createLinearGradient(0, ay - 30, 0, ay + 20);
      g.addColorStop(0, 'rgba(74,222,128,0)'); g.addColorStop(0.5, 'rgba(74,222,128,' + (0.5 + 0.2 * Math.sin(t * 2 + i)) + ')'); g.addColorStop(1, 'rgba(74,222,128,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ax - 12, ay + 20); ctx.quadraticCurveTo(ax + Math.sin(t + i) * 8, ay - 5, ax - 6, ay - 30); ctx.lineTo(ax + 8, ay - 30); ctx.quadraticCurveTo(ax + 6 + Math.sin(t + i) * 8, ay - 5, ax + 14, ay + 20); ctx.closePath(); ctx.fill();
    }
    // 유성 (중간권)
    const mp = (t * 0.45) % 1, my = atmY(76), mx0 = o.cx + o.w * 0.75;
    ctx.strokeStyle = 'rgba(255,237,160,' + (1 - mp) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx0 - mp * 70, my - mp * 24); ctx.lineTo(mx0 - mp * 70 + 22, my - mp * 24 + 8); ctx.stroke();
    // 오존층 (성층권)
    const oy = (atmY(22) + atmY(30)) / 2; ctx.fillStyle = 'rgba(196,181,253,' + (0.35 + 0.15 * Math.sin(t * 1.5)) + ')'; ctx.fillRect(o.cx, atmY(30), o.w, atmY(22) - atmY(30));
    TX(o.cx + o.w - 8, oy + 4.5, '오존층', { size: 13, color: '#ede9fe', weight: 800, align: 'right' });
    // 구름·비행기 (대류권)
    const cloud = (x, y, s) => { ctx.fillStyle = 'rgba(255,255,255,.92)'; [[0, 0, 14], [14, -6, 12], [28, 0, 13], [14, 5, 12]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 6.3); ctx.fill(); }); };
    const drift = (t * 6) % (o.w + 60) - 30;
    cloud(o.cx + ((drift + 20) % (o.w - 40)) + 6, atmY(4), 0.8 * o.k); cloud(o.cx + ((drift * 0.6 + 110) % (o.w - 50)) + 6, atmY(7.5), 0.6 * o.k);
    if (S.rain) { ctx.strokeStyle = 'rgba(180,215,255,.7)'; ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const rx = o.cx + 30 + i * 8 + 40; const ry = atmY(3.5) + ((t * 60 + i * 13) % 26); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 7); ctx.stroke(); } }
    const px = o.cx + 20 + ((t * 18) % (o.w - 30)), py = atmY(10.2);
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(px, py, 9, 2.4, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px - 5, py + 6); ctx.lineTo(px + 1, py); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.lineTo(px - 10, py - 4); ctx.lineTo(px - 6, py); ctx.fill();
    // 지표
    ctx.fillStyle = '#4d8f3a'; ctx.fillRect(0, o.gy, PHONE ? VW : 480, 80);
    ctx.fillStyle = '#6aae4d'; ctx.beginPath(); ctx.moveTo(o.cx, o.gy); ctx.quadraticCurveTo(o.cx + 50, o.gy - 18 * o.k, o.cx + 100, o.gy); ctx.fill();
    ctx.fillStyle = '#a16207'; ctx.fillRect(o.cx + o.w - 54, o.gy - 14 * o.k, 22, 14 * o.k); ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(o.cx + o.w - 58, o.gy - 14 * o.k); ctx.lineTo(o.cx + o.w - 43, o.gy - 26 * o.k); ctx.lineTo(o.cx + o.w - 28, o.gy - 14 * o.k); ctx.fill();
    // 경계선과 높이
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    [12, 50, 80].forEach((h) => { const y = atmY(h); ctx.beginPath(); ctx.moveTo(o.cx, y); ctx.lineTo(o.tx + o.tw + 8, y); ctx.stroke(); TX(o.cx + o.w + 6, y - 4, h + ' km', { size: 13, color: '#e2e8f0', weight: 800, align: 'left' }); });
    ctx.setLineDash([]);
    TX(o.cx + o.w + 6, atmY(0) - 4, '0 km', { size: 13, color: '#e2e8f0', weight: 800, align: 'left' });
    // 번호표 (위에서부터)
    [[1, 110], [2, 65], [3, 31], [4, 6]].forEach(([n, h]) => numDot(o.cx + 20, atmY(h) + (n === 4 ? 2 : 0), n));
    // 기온 그래프
    const x0 = o.tx, w = o.tw, tx = (T) => x0 + (clamp(T, -100, 100) + 100) / 200 * w;
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x0, atmY(140), w, o.gy - atmY(140));
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; [-100, 0, 100].forEach((T) => { ctx.beginPath(); ctx.moveTo(tx(T), atmY(140)); ctx.lineTo(tx(T), o.gy); ctx.stroke(); TX(tx(T), o.gy + 18, (T > 0 ? '+' : T < 0 ? '−' : '') + Math.abs(T), { size: 13, color: '#cbd5e1', weight: 700 }); });
    TX(x0 + w / 2, atmY(140) - 6, '기온 (°C)', { size: 13.5, color: '#e2e8f0', weight: 800 });
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
    ATM_T.forEach(([h, T], i) => { const px2 = tx(T), py2 = atmY(h); i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2); });
    ctx.stroke();
    D.arrow(tx(100) - 24, atmY(118), tx(100) + 2, atmY(128), { color: '#fbbf24', width: 3, head: 9 });
    TX(tx(0), atmY(140) + 18, '', { size: 12 });
    // 공기 층 높이(꼭대기)
    TX(o.cx + o.w / 2, atmY(140) + 16, '▲ 더 위는 우주', { size: 13, color: '#94a3b8', weight: 700 });
    if (layerShown.atm) { ctx.globalAlpha = layerReveal.atm; D.label(o.tx + o.tw / 2, atmY(33) + 0, '성층권은 위로 갈수록 기온↑', { bg: '#6366f1', size: 13 }); ctx.globalAlpha = 1; }
  }
  const OC_PTS = [[0, 22], [200, 21.5], [300, 17], [450, 11], [700, 7], [1000, 4.5], [2000, 3], [4000, 2]];
  function ocY(d) {
    const o = LV.hyd, k = o.k, seg = [[0, 200, 80 * k], [200, 1000, 120 * k], [1000, 4000, 130 * k]]; let y = o.oy;
    for (const [a, b, h] of seg) { if (d <= b) return y + (d - a) / (b - a) * h; y += h; }
    return y;
  }
  function drawHyd(t) {
    const o = LV.hyd;
    ctx.fillStyle = '#0b1b3a'; ctx.fillRect(0, 0, PHONE ? VW : 480, PHONE ? 430 : VH);
    // 수권의 구성
    TX(o.bx, o.by - 20, '수권의 구성 (물의 양)', { size: 14.5, color: '#e2e8f0', weight: 800, align: 'left' });
    const parts2 = [{ n: '해수 약 97 %', v: 97, c: '#2563eb' }, { n: '빙하 약 2 %', v: 2, c: '#e0f2fe' }, { n: '지하수·담수 약 1 %', v: 1, c: '#14b8a6' }];
    let bx = o.bx;
    parts2.forEach((p, i) => {
      const w = o.bw * p.v / 100; ctx.fillStyle = p.c; rr(bx, o.by, Math.max(w, 3), 28, i === 0 ? 6 : 2).fill();
      if (i === 0) TX(bx + w / 2, o.by + 19, p.n, { size: 14.5, color: '#fff', weight: 800 });
      else { const lx = o.bx + o.bw - (i === 1 ? 140 : 20) - (PHONE ? 0 : 0), ly = o.by + 54 + (i - 1) * 28; ctx.strokeStyle = 'rgba(226,232,240,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx + w / 2, o.by + 28); ctx.lineTo(bx + w / 2, ly - 8); ctx.lineTo(bx + w / 2 - 8, ly - 8); ctx.stroke(); TX(bx + w / 2 - 14, ly - 3, p.n, { size: 13.5, color: p.c === '#e0f2fe' ? '#e0f2fe' : '#5eead4', weight: 800, align: 'right' }); }
      bx += w;
    });
    // 바다 단면
    const ytop = ocY(0), ybot = ocY(4000);
    const g = ctx.createLinearGradient(0, ytop, 0, ybot); g.addColorStop(0, '#38bdf8'); g.addColorStop(0.24, '#1d6fd6'); g.addColorStop(0.62, '#0f3a8a'); g.addColorStop(1, '#050d24');
    ctx.fillStyle = g; ctx.fillRect(o.ox, ytop, o.ow, ybot - ytop);
    // 물결
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= o.ow; x += 4) { const y = ytop + Math.sin(x * 0.09 + t * 2.2) * 2.4; x ? ctx.lineTo(o.ox + x, y) : ctx.moveTo(o.ox + x, y); } ctx.stroke();
    // 배·물고기·심해어
    const bx2 = o.ox + 34 + Math.sin(t * 0.7) * 6; ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(bx2 - 16, ytop - 8); ctx.lineTo(bx2 + 16, ytop - 8); ctx.lineTo(bx2 + 10, ytop + 2); ctx.lineTo(bx2 - 11, ytop + 2); ctx.fill(); ctx.fillRect(bx2 - 1, ytop - 22, 2, 14); ctx.fillStyle = '#ef4444'; ctx.fillRect(bx2 + 1, ytop - 22, 9, 6);
    const fish = (x, y, s, c, dir) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 8 * s, 4 * s, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - dir * 7 * s, y); ctx.lineTo(x - dir * 13 * s, y - 4 * s); ctx.lineTo(x - dir * 13 * s, y + 4 * s); ctx.fill(); };
    fish(o.ox + 100 + Math.sin(t * 0.9) * 30, ocY(80), 1, '#fde68a', 1); fish(o.ox + 140 + Math.cos(t * 0.7) * 24, ocY(140), 0.9, '#fdba74', -1);
    fish(o.ox + o.ow * 0.55 + Math.sin(t * 0.5) * 20, ocY(2500), 1.1, '#475569', 1); D.glow(o.ox + o.ow * 0.55 + 9 + Math.sin(t * 0.5) * 20, ocY(2500) - 7, 12, '#a7f3d0', 0.8);
    // 경계선 + 깊이
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    [200, 1000].forEach((d) => { const y = ocY(d); ctx.beginPath(); ctx.moveTo(o.ox, y); ctx.lineTo(o.tx + o.tw + 6, y); ctx.stroke(); });
    ctx.setLineDash([]);
    [[0, '0 m'], [200, '200 m'], [1000, '1000 m'], [4000, '4000 m']].forEach(([d, s]) => TX(o.ox + o.ow + 6, ocY(d) + (d === 0 ? 14 : d === 4000 ? -4 : -4), s, { size: 13, color: '#e2e8f0', weight: 800, align: 'left' }));
    [[1, 100], [2, 600], [3, 2400]].forEach(([n, d]) => numDot(o.ox + 24, ocY(d), n));
    // 수온 그래프
    const x0 = o.tx, w = o.tw, tx = (T) => x0 + T / 25 * w;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x0, ytop, w, ybot - ytop);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; [0, 10, 20].forEach((T) => { ctx.beginPath(); ctx.moveTo(tx(T), ytop); ctx.lineTo(tx(T), ybot); ctx.stroke(); TX(tx(T), ybot + 18, String(T), { size: 13, color: '#cbd5e1', weight: 700 }); });
    TX(x0 + w / 2, ytop - 8, '수온 (°C)', { size: 13.5, color: '#e2e8f0', weight: 800 });
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let d = 0; d <= 4000; d += 25) { let T = 2; for (let i = 0; i < OC_PTS.length - 1; i++) { if (d >= OC_PTS[i][0] && d <= OC_PTS[i + 1][0]) { const f = (d - OC_PTS[i][0]) / (OC_PTS[i + 1][0] - OC_PTS[i][0]); T = lerp(OC_PTS[i][1], OC_PTS[i + 1][1], f * f * (3 - 2 * f) * 0.0 + f); } } d ? ctx.lineTo(tx(T), ocY(d)) : ctx.moveTo(tx(T), ocY(d)); }
    ctx.stroke();
    if (layerShown.hyd) { ctx.globalAlpha = layerReveal.hyd; D.label(x0 + w / 2 + 6, ocY(600), '← 수온 약층: 급히 낮아져요', { bg: '#ea580c', size: 13, align: 'center' }); ctx.globalAlpha = 1; }
  }
  function drawLayerSlots(sub, t) {
    const b = boards[sub], cfg = LYR[sub];
    // 오른쪽(또는 아래) 패널
    if (!PHONE) { ctx.fillStyle = '#eef3fb'; ctx.fillRect(480, 0, VW - 480, VH); } else { ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 430, VW, VH - 430); }
    TX(PHONE ? 300 : 640, PHONE ? 458 : 30, cfg.title + ' — 번호에 이름표를 놓아요', { size: 15, color: '#1e293b', weight: 800 });
    b.slots.forEach((s) => {
      const filled = s.items.length > 0, c = s.items[0], right = filled && c.ans === s.idx, show = layerShown[sub] && right;
      const hit = b.drag && b.slotAt(b.drag.c) === s;
      ctx.fillStyle = hit ? '#e0eaff' : '#fff'; ctx.strokeStyle = hit ? '#3867f4' : show ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2; ctx.setLineDash(filled || hit ? [] : [6, 5]);
      rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(s.x - s.w / 2 + 22, s.y - s.h / 2 + 25, 14, 0, 6.3); ctx.fill();
      TX(s.x - s.w / 2 + 22, s.y - s.h / 2 + 31, String(s.idx + 1), { size: 16, color: '#fff', weight: 800 });
      if (!filled) TX(s.x - s.w / 2 + 104, s.y - s.h / 2 + 31, '이름표', { size: 14, color: '#94a3b8', weight: 700 });
      if (show) { ctx.globalAlpha = layerReveal[sub]; TX(s.x - s.w / 2 + 14, s.y + s.h / 2 - 12, cfg.info[s.idx], { size: 13, color: '#0f766e', weight: 800, align: 'left' }); ctx.globalAlpha = 1; }
    });
    b.items.forEach((c) => { const right = c.slot && c.slot.idx === c.ans; c.stroke = layerShown[sub] && right ? '#14a058' : '#64748b'; });
  }
  function drawLayers(t, dt) {
    const sub = S.sub;
    if (sub === 'geo') drawGeo(t, dt); else if (sub === 'atm') drawAtm(t); else drawHyd(t);
    drawLayerSlots(sub, t);
    const b = boards[sub];
    b.items.forEach((c) => { if (!c.free) drawCard(c); });
    b.items.forEach((c) => { if (c.free) drawCard(c); });
  }

  /* ======================================================
     화면 3: 권역 분류 · 에너지원 짝짓기 (끌어 놓기)
     ====================================================== */
  const SORT = new Board();
  const PAIR = new Board();
  const MAPB = new Board();
  const SORT_CARDS = [
    { label: '화산', ico: '🌋', ans: 'geo' }, { label: '구름', ico: '☁️', ans: 'atm' }, { label: '바다', ico: '🌊', ans: 'hyd' },
    { label: '숲', ico: '🌲', ans: 'bio' }, { label: '우주 먼지', ico: '☄️', ans: 'spc' },
  ];
  const SORT_NOTE = { geo: '화산은 땅(지권)의 활동이에요', atm: '구름은 공기 중(기권)에 떠 있어요', hyd: '바다는 수권의 대부분이에요', bio: '숲은 살아 있는 생물(생물권)이에요', spc: '우주 먼지는 대기권 밖(외권)에서 와요' };
  const PAIR_CARDS = [
    { label: '바람', ico: '🌬️', ans: 'sun' }, { label: '화산 활동', ico: '🌋', ans: 'core' }, { label: '밀물과 썰물', ico: '🌊', ans: 'moon' },
    { label: '구름·날씨', ico: '⛅', ans: 'sun' }, { label: '판의 이동', ico: '🧭', ans: 'core' }, { label: '광합성', ico: '🌿', ans: 'sun' },
  ];
  const SRC = {
    sun: { name: '태양', desc: '태양에서 오는 복사 에너지', ico: '☀️', col: '#f59e0b', power: '약 1.7×10¹⁷ W', share: '99.97 %', ph: '바람 · 구름 · 광합성', P: 1.7e17 },
    core: { name: '지구 내부', desc: '땅속(맨틀·핵)에서 나오는 열', ico: '🌋', col: '#ef4444', power: '약 4.7×10¹³ W', share: '0.03 %', ph: '화산 · 판 이동 · 지진', P: 4.7e13 },
    moon: { name: '달', desc: '달(과 태양)의 인력', ico: '🌙', col: '#94a3b8', power: '약 3.7×10¹² W', share: '0.002 %', ph: '밀물과 썰물', P: 3.7e12 },
  };
  function initSort() {
    SORT.reset(); S.sortOK = 0;
    SEL_ORDER.forEach((k, i) => {
      if (PHONE) SORT.addSlot({ x: 100 + (i % 3) * 200, y: 150 + Math.floor(i / 3) * 266, w: 188, h: 252, cap: 3, isc: 0.84, key: k, top: 92, gh: 58, gw: 176 });
      else SORT.addSlot({ x: 90 + i * 155, y: 190, w: 146, h: 290, cap: 3, isc: 0.84, key: k, top: 94, gh: 62, gw: 134 });
    });
    const order = [3, 0, 4, 1, 2];
    order.forEach((ci, j) => {
      const c = SORT_CARDS[ci];
      const hx = PHONE ? 100 + (j % 3) * 200 : 90 + j * 155, hy = PHONE ? 700 + Math.floor(j / 3) * 76 : 440;
      SORT.addItem({ label: c.label, ico: c.ico, ans: c.ans, hx, hy, w: 138, h: 56, fill: '#fff', stroke: '#64748b', paint: paintIcoCard });
    });
  }
  function paintIcoCard(c) {
    ctx.font = D.font(26, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.ico, -c.w / 2 + 28, 2); ctx.textBaseline = 'alphabetic';
    TX(c.w / 2 - 16 - (c.label.length > 4 ? 14 : 0) + 4, 6, c.label, { size: 15, color: '#1b2333', weight: 800, align: 'right' });
  }
  function initPair() {
    PAIR.reset(); S.pairOK = 0;
    ['sun', 'core', 'moon'].forEach((k, i) => {
      if (PHONE) PAIR.addSlot({ x: 100 + i * 200, y: 230, w: 188, h: 340, cap: 3, isc: 0.9, key: k, top: 92, gh: 62, gw: 176 });
      else PAIR.addSlot({ x: 140 + i * 260, y: 190, w: 240, h: 300, cap: 3, isc: 0.95, key: k, top: 84, gh: 66, gw: 224 });
    });
    [3, 0, 4, 1, 5, 2].forEach((ci, j) => {
      const c = PAIR_CARDS[ci];
      const hx = PHONE ? 100 + (j % 3) * 200 : 140 + (j % 3) * 260, hy = PHONE ? 470 + Math.floor(j / 3) * 78 : 400 + Math.floor(j / 3) * 70;
      PAIR.addItem({ label: c.label, ico: c.ico, ans: c.ans, hx, hy, w: 158, h: 56, fill: '#fff', stroke: '#64748b', paint: paintIcoCard });
    });
  }
  function drawBins(B, defs, t, okFlag, ttl) {
    ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, VW, VH);
    TX(VW / 2, PHONE ? 22 : 26, ttl, { size: 16, color: '#1e293b', weight: 800 });
    B.slots.forEach((s) => {
      const d = defs[s.key], hit = B.drag && B.slotAt(B.drag.c) === s;
      ctx.save();
      D.shadow(() => { ctx.fillStyle = hit ? '#e8efff' : '#fff'; rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 14).fill(); }, { blur: 8, y: 2, color: 'rgba(30,45,80,.2)' });
      ctx.strokeStyle = hit ? '#3867f4' : okFlag ? '#14a058' : d.col; ctx.lineWidth = hit ? 3.5 : 2.4; rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 14).stroke();
      ctx.fillStyle = d.col; ctx.save(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, 44, 14).clip(); ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, 44); ctx.restore();
      ctx.font = D.font(20, 800); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(d.name, s.x, s.y - s.h / 2 + 30);
      para(s.x, s.y - s.h / 2 + 62, d.desc, s.w - 18, 13.5, { color: '#475569', weight: 700 });
      ctx.restore();
    });
    B.items.forEach((c) => { if (!c.free) drawCard(c); });
    B.items.forEach((c) => { if (c.free) drawCard(c); });
  }
  function drawSort(t) {
    drawBins(SORT, SPH, t, S.sortOK > 0.5, '사례 카드를 알맞은 권역에 놓아요');
    if (S.sortOK > 0.3) {
      SORT.slots.forEach((s) => { if (s.items.length) { ctx.globalAlpha = S.sortOK; TX(s.x, s.y + s.h / 2 - 12, SORT_NOTE[s.key], { size: 12.5, color: '#0f766e', weight: 800 }); ctx.globalAlpha = 1; } });
    }
    if (!SORT.placed() && !SORT.drag) { const y = PHONE ? 650 : 395; TX(VW / 2, y, '▼ 카드를 끌어서 위의 권역 상자에 놓아요', { size: 13.5, color: '#64748b', weight: 800 }); }
  }
  function drawPair(t) {
    drawBins(PAIR, SRC, t, S.pairOK > 0.5, '현상 카드를 알맞은 에너지원에 놓아요');
    PAIR.slots.forEach((s) => {
      const d = SRC[s.key]; ctx.font = D.font(24, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(d.ico, s.x - s.w / 2 + 20, s.y - s.h / 2 + 30);
      if (S.pairOK > 0.3) { ctx.globalAlpha = S.pairOK; TX(s.x, s.y + s.h / 2 - 14, d.ph, { size: 13, color: '#0f766e', weight: 800 }); ctx.globalAlpha = 1; }
    });
  }

  /* ======================================================
     화면 4: 에너지원 (태양 · 지구 내부 · 달)
     ====================================================== */
  const EG = PHONE ? { cx: 300, cy: 262, sun: { x: 78, y: 86, r: 46 }, moon: { x: 500, y: 262, r: 24 } } : { cx: 322, cy: 300, sun: { x: 74, y: 118, r: 54 }, moon: { x: 528, y: 300, r: 26 } };
  const E_RS = 88, E_RO = 104;
  function seaR(th, tide) { return E_RO + 14 * tide * Math.cos(2 * th); }
  function logW(P) { return 2.5 + 2.6 * (Math.log10(P) - 12); }
  function drawEnergy(t, dt) {
    const { cx, cy } = EG, A = S.srcA;
    const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, 520); bg.addColorStop(0, '#16224a'); bg.addColorStop(1, '#050816'); ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
    stars(0.8, t);
    // 태양
    const sn = EG.sun;
    D.glow(sn.x, sn.y, sn.r * 2.3, '#ffb300', 0.35 + 0.35 * A.sun); D.sphere(sn.x, sn.y, sn.r, '#ffb300', { light: '#fff3b0', dark: '#e65100' });
    TX(sn.x, sn.y + sn.r + 20, '태양', { size: 14, color: '#fde68a', weight: 800 });
    // 달
    const mn = EG.moon; ctx.globalAlpha = 0.55 + 0.45 * A.moon;
    D.sphere(mn.x, mn.y, mn.r, '#cbd5e1', { light: '#f1f5f9', dark: '#64748b' });
    ctx.fillStyle = 'rgba(100,116,139,.4)'; ctx.beginPath(); ctx.arc(mn.x - 7, mn.y - 6, 5, 0, 6.3); ctx.arc(mn.x + 8, mn.y + 7, 6.5, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    TX(mn.x, mn.y + mn.r + 20, '달', { size: 14, color: '#e2e8f0', weight: 800 });
    // 조석(바다 모양)
    const tide = S.tideA;
    // 기권 후광
    const g0 = ctx.createRadialGradient(cx, cy, 120, cx, cy, 142); g0.addColorStop(0, 'rgba(125,211,252,' + (0.3 + 0.3 * A.sun) + ')'); g0.addColorStop(1, 'rgba(125,211,252,0)'); ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(cx, cy, 142, 0, 6.3); ctx.fill();
    // 바다
    ctx.beginPath(); for (let i = 0; i <= 72; i++) { const th = i / 72 * 6.2832, r = seaR(th, tide); const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    const og = ctx.createRadialGradient(cx - 20, cy - 20, 40, cx, cy, 125); og.addColorStop(0, '#3b82f6'); og.addColorStop(1, '#1e40af'); ctx.fillStyle = og; ctx.fill();
    ctx.strokeStyle = 'rgba(186,230,253,.8)'; ctx.lineWidth = 2; ctx.stroke();
    // 고체 지구 단면
    const disc = (r, c1, c2) => { const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill(); };
    const heat = 0.35 + 0.65 * A.core;
    disc(E_RS, '#8b5a2b', '#5a3414'); disc(E_RS - 5, SciSim.color.mix('#b45309', '#ea580c', A.core), '#7c2d12');
    disc(E_RS * 0.55, SciSim.color.mix('#f59e0b', '#fbbf24', A.core), '#d97706'); disc(E_RS * 0.22, '#fffbeb', '#fde68a');
    D.glow(cx, cy, E_RS * 0.9, '#fb923c', 0.18 + 0.4 * A.core);
    // 태양: 복사 에너지
    const sdx = cx - sn.x, sdy = cy - sn.y, sd = Math.hypot(sdx, sdy), ux = sdx / sd, uy = sdy / sd;
    if (A.sun > 0.02) {
      const w = logW(SRC.sun.P) * A.sun, x1 = sn.x + ux * (sn.r + 10), y1 = sn.y + uy * (sn.r + 10), x2 = cx - ux * 150, y2 = cy - uy * 150;
      D.arrow(x1, y1, x2, y2, { color: '#fbbf24', width: w, head: w * 1.5 + 6, alpha: 0.95 });
      // 빛 알갱이
      ctx.fillStyle = '#fff7c2'; for (let i = 0; i < 8; i++) { const k = ((t * 0.5 + i / 8) % 1); ctx.globalAlpha = A.sun; ctx.beginPath(); ctx.arc(lerp(x1, x2, k), lerp(y1, y2, k), 2.6, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
      D.label((x1 + x2) / 2, (y1 + y2) / 2 - (PHONE ? 26 : 30), '태양 복사 에너지', { bg: '#b45309', size: 13.5 });
      // 바람 줄기와 구름 (기권에서 일어나는 현상)
      ctx.strokeStyle = 'rgba(224,242,254,' + (0.8 * A.sun) + ')'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const a0 = i * 0.7 + t * 0.55, rr0 = 124 + (i % 3) * 5; ctx.beginPath(); ctx.arc(cx, cy, rr0, a0, a0 + 0.32); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * A.sun) + ')';
      for (let i = 0; i < 4; i++) { const a0 = i * 1.6 + t * 0.12, x = cx + Math.cos(a0) * 136, y = cy + Math.sin(a0) * 136; ctx.beginPath(); ctx.ellipse(x, y, 13, 6, a0 + 1.57, 0, 6.3); ctx.fill(); }
    }
    // 지구 내부: 열 에너지 + 화산
    const va = -1.75;
    if (A.core > 0.02) {
      const w = logW(SRC.core.P) * A.core;
      const vx0 = cx + Math.cos(va) * 24, vy0 = cy + Math.sin(va) * 24, vx1 = cx + Math.cos(va) * 76, vy1 = cy + Math.sin(va) * 76;
      D.arrow(vx0, vy0, vx1, vy1, { color: '#fecaca', width: w, head: w * 1.5 + 5, alpha: 0.95 });
      [-0.55, 0.55].forEach((d) => { D.arrow(cx + Math.cos(va + d + 0.6) * 24, cy + Math.sin(va + d + 0.6) * 24, cx + Math.cos(va + d * 1.3 + 0.6) * 66, cy + Math.sin(va + d * 1.3 + 0.6) * 66, { color: '#fed7aa', width: 2.5, head: 8, alpha: 0.7 * A.core }); });
      D.label(cx + 74, cy + 8, '지구 내부 에너지', { bg: '#b91c1c', size: 13.5, align: 'left' });
    }
    // 화산 (지표)
    const vr = 96, vx = cx + Math.cos(va) * vr, vy = cy + Math.sin(va) * vr;
    ctx.save(); ctx.translate(vx, vy); ctx.rotate(va + Math.PI / 2);
    ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.moveTo(-17, 8); ctx.lineTo(-4, -22); ctx.lineTo(4, -22); ctx.lineTo(17, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SciSim.color.mix('#7c2d12', '#ef4444', A.core); ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(4, -22); ctx.lineTo(2, -17); ctx.lineTo(-2, -17); ctx.fill();
    ctx.restore();
    if (A.core > 0.1 && !RM) {
      if (Math.random() < dt * 22 * A.core) {
        const ox = Math.cos(va), oy = Math.sin(va), sp = 70 + Math.random() * 60, jx = (Math.random() - 0.5) * 36;
        parts.emit({ x: vx + ox * 20, y: vy + oy * 20, vx: ox * sp - oy * jx, vy: oy * sp + ox * jx, life: 0.9, size: 3 + Math.random() * 2.5, color: Math.random() < 0.6 ? '#fb923c' : '#fef08a', gravity: 0, drag: 0.8, shape: 'circle' });
      }
      if (Math.random() < dt * 8 * A.core) parts.emit({ x: vx + Math.cos(va) * 22, y: vy + Math.sin(va) * 22, vx: Math.cos(va) * 22, vy: Math.sin(va) * 22, life: 1.8, size: 7, grow: 6, color: 'rgba(120,120,120,.55)', shape: 'smoke', drag: 0.5 });
    }
    // 판 이동 화살표 (지구 내부 에너지의 결과)
    if (A.core > 0.02) { [-1, 1].forEach((sg) => { const a1 = va + sg * 0.34, a2 = va + sg * 0.62; D.arrow(cx + Math.cos(a1) * 82, cy + Math.sin(a1) * 82, cx + Math.cos(a2) * 82, cy + Math.sin(a2) * 82, { color: '#fde68a', width: 3, head: 8, alpha: 0.9 * A.core }); }); }
    // 달: 인력
    if (A.moon > 0.02) {
      const w = logW(SRC.moon.P) * A.moon, x1 = cx + 150, x2 = mn.x - mn.r - 8;
      D.arrow(x1, cy, x2, cy, { color: '#cbd5e1', width: w, head: w * 1.5 + 5, alpha: 0.95 });
      D.label((x1 + x2) / 2, cy - 24, '인력', { bg: '#475569', size: 13.5 });
    }
    // 관측자와 밀물·썰물 표시
    if (A.moon > 0.5 || tide > 0.5) {
      const th = t * 0.5 % 6.2832, rO = seaR(th, tide);
      const ox = cx + Math.cos(th) * rO, oy = cy + Math.sin(th) * rO;
      D.sphere(ox, oy, 5.5, '#f8fafc', { gloss: false, outline: '#0f172a' });
      const hi = Math.cos(2 * th) > 0.35;
      ctx.globalAlpha = tide; D.label(ox + Math.cos(th) * 34, oy + Math.sin(th) * 34, hi ? '밀물 (바다가 높음)' : Math.cos(2 * th) < -0.35 ? '썰물 (바다가 낮음)' : '관측자', { bg: hi ? '#2563eb' : '#64748b', size: 13 }); ctx.globalAlpha = 1;
    }
    TX(cx, cy + 172 + (PHONE ? 6 : 0), '※ 크기와 거리, 조석의 부풀음은 실제 비율이 아니에요', { size: 12.5, color: '#94a3b8', weight: 700 });
    // 오른쪽(또는 아래) 요약 패널
    const px = PHONE ? 20 : 580, py = PHONE ? 470 : 14, pw = PHONE ? 560 : 206;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(px, py, pw, PHONE ? 360 : 534, 16).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.4)' });
    TX(px + pw / 2, py + 28, '지구에 공급되는 에너지', { size: 15, color: '#1b2333', weight: 800 });
    const dx = PHONE ? px + 96 : px + pw / 2, dy = py + (PHONE ? 130 : 110), ro = PHONE ? 56 : 50, ri = ro * 0.62;
    ctx.lineWidth = ro - ri; ctx.strokeStyle = A.sun > 0.5 || S.srcSeen.size === 0 ? '#fbbf24' : '#fde68a'; ctx.beginPath(); ctx.arc(dx, dy, (ro + ri) / 2, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, dy - ri + 1); ctx.lineTo(dx, dy - ro - 1); ctx.stroke();
    TX(dx, dy + 5, '100 %', { size: 15, color: '#92400e', weight: 800 });
    // 오른쪽 목록
    const rows = ['sun', 'core', 'moon'];
    rows.forEach((k, i) => {
      const d = SRC[k], on = S.src[k], x = PHONE ? px + 190 : px + 14, y = PHONE ? py + 80 + i * 66 : py + 190 + i * 72;
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.fillStyle = d.col; rr(x - 2, y - 14, 6, 50, 3).fill();
      TX(x + 14, y + 2, d.ico + ' ' + d.name, { size: 15, color: '#1b2333', weight: 800, align: 'left' });
      TX(x + 14, y + 22, d.power + ' (' + d.share + ')', { size: 13, color: '#334155', weight: 800, align: 'left' });
      TX(x + 14, y + 40, d.ph, { size: 12.5, color: '#0f766e', weight: 700, align: 'left' });
      ctx.globalAlpha = 1;
    });
    // 확대 막대
    const by = PHONE ? py + 285 : py + 420;
    TX(px + 14, by - 10, '🔍 태양을 뺀 나머지(0.03 %) 확대', { size: 13, color: '#be123c', weight: 800, align: 'left' });
    const bw = PHONE ? 300 : 150;
    ctx.fillStyle = SRC.core.col; rr(px + 14, by + 4, bw, 14, 4).fill(); TX(px + 14, by + 36, '지구 내부 4.7×10¹³ W', { size: 12.5, color: '#334155', weight: 800, align: 'left' });
    ctx.fillStyle = SRC.moon.col; rr(px + 14, by + 46, Math.max(3, bw * 3.7 / 47), 14, 4).fill(); TX(px + 14, by + 78, '조석(달) 3.7×10¹² W', { size: 12.5, color: '#334155', weight: 800, align: 'left' });
    // 점선으로 연결
    ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(dx, dy - ro - 1); ctx.lineTo(dx + (PHONE ? 70 : 40), py + (PHONE ? 20 : 54)); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ======================================================
     화면 5: 지구시스템 한눈에 (관계도 빈칸 채우기)
     ====================================================== */
  const MG = PHONE ? {
    band: { x: 12, y: 8, w: 576, h: 118 }, zone: { x: 12, y: 142, w: 576, h: 508 },
    sun: [110, 74], moon: [490, 74], spc: [300, 38],
    atm: [300, 206], geo: [112, 352], hyd: [488, 352], bio: [300, 402], core: [112, 570], nw: 150, nh: 50, trayY: 704, trayStep: 190,
  } : {
    band: { x: 24, y: 10, w: 752, h: 118 }, zone: { x: 24, y: 142, w: 752, h: 356 },
    sun: [150, 78], moon: [650, 78], spc: [400, 40],
    atm: [400, 200], geo: [190, 322], hyd: [610, 322], bio: [400, 346], core: [190, 446], nw: 160, nh: 48, trayY: 532, trayStep: 124,
  };
  const MAP_ANS = { spc: '외권', sun: '태양 에너지', moon: '달의 인력', hyd: '수권', bio: '생물권', core: '지구 내부 에너지' };
  function initMap() {
    MAPB.reset(); S.mapOK = 0;
    const keys = ['spc', 'sun', 'moon', 'hyd', 'bio', 'core'];
    keys.forEach((k) => {
      const p = MG[k]; const wide = k === 'spc' ? 190 : MG.nw + 12;
      MAPB.addSlot({ x: p[0], y: p[1], w: wide, h: MG.nh + 4, key: k, isc: 1 });
    });
    const order = ['core', 'hyd', 'moon', 'spc', 'bio', 'sun'];
    order.forEach((k, j) => {
      const label = MAP_ANS[k];
      ctx.save(); ctx.font = D.font(15, 800); const tw = ctx.measureText(label).width; ctx.restore();
      const w = Math.max(92, tw + 26);
      const cols = PHONE ? 3 : 6, hx = PHONE ? 100 + (j % cols) * 200 : 76 + j * MG.trayStep, hy = PHONE ? MG.trayY + Math.floor(j / cols) * 56 : MG.trayY;
      MAPB.addItem({ label, ans: k, hx, hy, w, h: 38, size: 15, fill: '#fff', stroke: '#64748b' });
    });
  }
  function flow(a, b, o) {
    o = o || {}; const t = S.clock, col = o.col || '#64748b', w = o.w || 2.4;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); if (o.cp) ctx.quadraticCurveTo(o.cp[0], o.cp[1], b[0], b[1]); else ctx.lineTo(b[0], b[1]); ctx.stroke();
    const head = (p, ex, ey) => { const hs = 9 + w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - ex * hs - ey * hs * 0.5, p[1] - ey * hs + ex * hs * 0.5); ctx.lineTo(p[0] - ex * hs + ey * hs * 0.5, p[1] - ey * hs - ex * hs * 0.5); ctx.closePath(); ctx.fill(); };
    const eB = o.cp ? (() => { const vx = b[0] - o.cp[0], vy = b[1] - o.cp[1], l = Math.hypot(vx, vy); return [vx / l, vy / l]; })() : [ux, uy];
    const eA = o.cp ? (() => { const vx = a[0] - o.cp[0], vy = a[1] - o.cp[1], l = Math.hypot(vx, vy); return [vx / l, vy / l]; })() : [-ux, -uy];
    head(b, eB[0], eB[1]); if (o.both) head(a, eA[0], eA[1]);
    // 흐르는 점
    ctx.fillStyle = o.dot || '#fff';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.35 + i / 3) % 1, kk = o.both && i % 2 ? 1 - k : k;
      let x, y; if (o.cp) { x = (1 - kk) * (1 - kk) * a[0] + 2 * (1 - kk) * kk * o.cp[0] + kk * kk * b[0]; y = (1 - kk) * (1 - kk) * a[1] + 2 * (1 - kk) * kk * o.cp[1] + kk * kk * b[1]; } else { x = lerp(a[0], b[0], kk); y = lerp(a[1], b[1], kk); }
      ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(x, y, w * 0.55 + 1, 0, 6.3); ctx.fill();
    }
    ctx.restore();
    if (o.label) {
      const m = o.lp || (o.cp ? [(a[0] + 2 * o.cp[0] + b[0]) / 4, (a[1] + 2 * o.cp[1] + b[1]) / 4] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      D.label(m[0], m[1], o.label, { bg: o.lbg || '#fff', color: o.lcol || '#334155', size: 13, border: o.col });
    }
  }
  function nodeBox(key, name, col) {
    const p = MG[key], w = key === 'spc' ? 190 : MG.nw, h = MG.nh;
    const s = MAPB.slots.find((q) => q.key === key);
    if (s) {
      const filled = s.items.length > 0, hit = MAPB.drag && MAPB.slotAt(MAPB.drag.c) === s;
      ctx.save();
      ctx.fillStyle = hit ? '#e0eaff' : filled ? '#fff' : 'rgba(255,255,255,.65)';
      ctx.strokeStyle = hit ? '#3867f4' : S.mapOK > 0.5 ? '#14a058' : '#64748b'; ctx.lineWidth = hit ? 3.5 : 2.4; ctx.setLineDash(filled || hit ? [] : [6, 5]);
      rr(p[0] - w / 2, p[1] - h / 2, w, h, 14).fill(); rr(p[0] - w / 2, p[1] - h / 2, w, h, 14).stroke(); ctx.setLineDash([]);
      if (!filled) TX(p[0], p[1] + 8, '?', { size: 26, color: '#64748b', weight: 800 });
      ctx.restore();
    } else {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(p[0] - w / 2, p[1] - h / 2, w, h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(30,45,80,.25)' });
      ctx.strokeStyle = col; ctx.lineWidth = 3; rr(p[0] - w / 2, p[1] - h / 2, w, h, 14).stroke();
      TX(p[0], p[1] + 6, name, { size: 17, color: '#1b2333', weight: 800 });
    }
  }
  function drawMap(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#dbe7f7'); g.addColorStop(1, '#eef3fb'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // 외권 띠
    const b = MG.band; ctx.fillStyle = '#1e1b4b'; rr(b.x, b.y, b.w, b.h, 18).fill();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const sx = b.x + 10 + (i * 97) % (b.w - 20), sy = b.y + 8 + (i * 41) % (b.h - 16); ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t + i); ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
    TX(MG.spc[0], MG.spc[1] + (PHONE ? 66 : 62), '태양·달·우주 먼지가 있는 우주 공간', { size: 13.5, color: '#c7d2fe', weight: 700 });
    // 지구시스템 영역
    const z = MG.zone; ctx.fillStyle = 'rgba(14,165,233,.1)'; rr(z.x, z.y, z.w, z.h, 22).fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); rr(z.x, z.y, z.w, z.h, 22).stroke(); ctx.setLineDash([]);
    TX(z.x + 18, z.y + 28, '🌍 지구시스템', { size: 16, color: '#0369a1', weight: 800, align: 'left' });
    const P = (k) => MG[k];
    const nh = MG.nh / 2, nw = MG.nw / 2;
    // 권역 사이 흐름 (물질 순환·상호작용)
    const IC = '#475569';
    const m = (a, b, dx1, dy1, dx2, dy2) => [[a[0] + dx1, a[1] + dy1], [b[0] + dx2, b[1] + dy2]];
    let q;
    q = m(P('atm'), P('geo'), -60, nh, 30, -nh); flow(q[0], q[1], { both: true, col: IC, label: '화산 가스·풍화', lp: PHONE ? [166, 286] : [262, 262] });
    q = m(P('atm'), P('hyd'), 60, nh, -30, -nh); flow(q[0], q[1], { both: true, col: IC, label: '증발·강수', lp: PHONE ? [436, 286] : [538, 262] });
    q = m(P('atm'), P('bio'), 0, nh, 0, -nh); flow(q[0], q[1], { both: true, col: IC, label: '광합성·호흡', lp: [P('atm')[0], (P('atm')[1] + P('bio')[1]) / 2] });
    q = m(P('geo'), P('bio'), nw, 0, -nw, 0); flow(q[0], q[1], { both: true, col: IC, label: '양분', lp: [(P('geo')[0] + P('bio')[0]) / 2, P('geo')[1] - (PHONE ? -2 : 8) + (PHONE ? 0 : 0)] });
    q = m(P('hyd'), P('bio'), -nw, 0, nw, 0); flow(q[0], q[1], { both: true, col: IC, label: '물·먹이', lp: [(P('hyd')[0] + P('bio')[0]) / 2, P('hyd')[1] - (PHONE ? -2 : 8)] });
    const lowY = Math.max(P('bio')[1] + nh + (PHONE ? 70 : 52), P('geo')[1] + 76);
    flow([P('geo')[0] + 30, P('geo')[1] + nh], [P('hyd')[0] - 30, P('hyd')[1] + nh], { both: true, col: IC, cp: [(P('geo')[0] + P('hyd')[0]) / 2, lowY + 30], label: '침식·퇴적·용해', lp: [(P('geo')[0] + P('hyd')[0]) / 2, lowY - 2 + (PHONE ? 0 : 4)] });
    // 에너지원 → 권역
    const EC = '#ea580c';
    flow([P('sun')[0] + (PHONE ? 20 : 40), P('sun')[1] + nh + 4], [P('atm')[0] - nw + 8, P('atm')[1] - 6], { col: EC, w: 5, dot: '#fff7ed', label: '바람·구름·날씨', lbg: '#fff7ed', lcol: '#9a3412', lp: PHONE ? [140, 150] : [250, 150] });
    flow([P('moon')[0] - (PHONE ? 10 : 10), P('moon')[1] + nh + 4], [P('hyd')[0] + (PHONE ? 16 : 20), P('hyd')[1] - nh - 2], { col: EC, w: 3.5, dot: '#fff7ed', label: '밀물·썰물', lbg: '#fff7ed', lcol: '#9a3412', lp: PHONE ? [510, 200] : [655, 200] });
    flow([P('core')[0], P('core')[1] - nh - 2], [P('geo')[0], P('geo')[1] + nh + 2], { col: EC, w: 5, dot: '#fff7ed', label: '화산·지진·판 이동', lbg: '#fff7ed', lcol: '#9a3412', lp: PHONE ? [112, 460] : [190, 385] });
    // 노드
    nodeBox('atm', '기권', SPH.atm.col); nodeBox('geo', '지권', SPH.geo.col);
    ['spc', 'sun', 'moon', 'hyd', 'bio', 'core'].forEach((k) => nodeBox(k));
    // 이름표
    MAPB.items.forEach((c) => { if (!c.free) drawCard(c); }); MAPB.items.forEach((c) => { if (c.free) drawCard(c); });
    if (S.mapOK > 0.2 && !MAPB.drag) { ctx.globalAlpha = S.mapOK; D.label(VW / 2, PHONE ? 668 : 514, '권역들은 물질 순환과 에너지 흐름으로 이어져 있어요', { bg: '#14a058', size: 14 }); ctx.globalAlpha = 1; }
  }

  /* ======================================================
     장면 전환 · 입력 · 읽음 칸
     ====================================================== */
  const MODE_LABEL = { zoom: '🚲 시스템이란', layers: '🧅 권역의 층', sort: '🗂️ 권역 분류', energy: '⚡ 에너지원', pair: '🔗 에너지원 짝짓기', map: '🗺️ 지구시스템 한눈에' };
  const modeSeg = $('#modeSeg');
  function setMode(m, sub) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; if (sub) setSub(sub, true);
    updateCtl();
  }
  function setSub(s, quiet) {
    if (S.sub !== s || !quiet) {
      S.sub = s; S.open = s === 'geo' ? 0 : 1;
      if (s === 'geo') SciSim.tween(S, { open: 1 }, { duration: 1.1, ease: 'outCubic' });
    }
    boards[s].drag = null; updateCtl();
  }
  function updateCtl() {
    const lab = $('#tbLabel'); if (lab) lab.textContent = MODE_LABEL[S.mode] + (S.mode === 'layers' ? ' · ' + LYR[S.sub].title : '');
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#subBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.sub === S.sub); const k = b.dataset.sub; const ok = layerShown[k]; const m = b.querySelector('.ok'); if (ok && !m) b.insertAdjacentHTML('beforeend', '<span class="ok">✓</span>'); if (!ok && m) m.remove(); });
    $$('#zoomBtns .opt').forEach((b) => b.classList.toggle('on', +b.dataset.zoom === S.zt));
    $$('#srcBtns .opt').forEach((b) => b.classList.toggle('on', !!S.src[b.dataset.src]));
    $('#bikeCtl').hidden = S.zt !== 0;
    $('#bChain').textContent = S.chainOff ? '🔗 체인 다시 걸기' : '⛓ 체인 떼기';
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
  }
  function setZoom(k) { S.zt = k; Sound.tick(); updateCtl(); }
  $$('#zoomBtns .opt').forEach((b) => b.addEventListener('click', () => setZoom(+b.dataset.zoom)));
  $('#bChain').addEventListener('click', () => { S.chainOff = !S.chainOff; Sound.click(); updateCtl(); });
  $$('#subBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.sub); }));
  $('#bResetTags').addEventListener('click', () => { Sound.click(); boards[S.sub].home(); layerShown[S.sub] = false; layerReveal[S.sub] = 0; updateCtl(); });
  $('#bResetSort').addEventListener('click', () => { Sound.click(); initSort(); });
  $('#bResetPair').addEventListener('click', () => { Sound.click(); initPair(); });
  $('#bResetMap').addEventListener('click', () => { Sound.click(); initMap(); });
  function toggleSrc(k) {
    S.src[k] = !S.src[k]; Sound.click(); if (S.src[k]) { S.srcSeen.add(k); S.lastSrc = k; }
    if (k === 'moon' && !RM) { /* 조석 부풀음은 루프에서 따라감 */ }
    updateCtl();
  }
  $$('#srcBtns .opt').forEach((b) => b.addEventListener('click', () => toggleSrc(b.dataset.src)));

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }
  const activeBoard = () => (S.mode === 'layers' ? boards[S.sub] : S.mode === 'sort' ? SORT : S.mode === 'pair' ? PAIR : S.mode === 'map' ? MAPB : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'zoom') {
        if (S.zt === 2 && S.z > 1.7) { const c = CHIP.find((q) => Math.abs(p.x - q.x) <= q.w / 2 && Math.abs(p.y - q.y) <= q.h / 2); if (c) { const i = SEL_ORDER.indexOf(c.k); S.sel = S.sel === i ? -1 : i; S.selIdle = 0; S.earthSeen.add(c.k); Sound.tick(); } }
        return false;
      }
      if (S.mode === 'energy') {
        const sn = EG.sun, mn = EG.moon;
        if (Math.hypot(p.x - sn.x, p.y - sn.y) < sn.r + 14) toggleSrc('sun');
        else if (Math.hypot(p.x - mn.x, p.y - mn.y) < mn.r + 16) toggleSrc('moon');
        else if (Math.hypot(p.x - EG.cx, p.y - EG.cy) < E_RO + 10) toggleSrc('core');
        return false;
      }
      const B = activeBoard(); if (!B) return false;
      const c = B.pick(p); if (!c) return false;
      B.start(c, p); return true;
    },
    move(p) { const B = activeBoard(); if (B) B.move(p); },
    up(p) { const B = activeBoard(); if (B) { const s = B.drop(); if (s) onDrop(B, s); } },
    hover(p) { const B = activeBoard(); if (B) return B.pick(p) ? 'grab' : 'default'; if (S.mode === 'energy') return 'pointer'; if (S.mode === 'zoom' && S.zt === 2) return CHIP.some((q) => Math.abs(p.x - q.x) <= q.w / 2 && Math.abs(p.y - q.y) <= q.h / 2) ? 'pointer' : 'default'; return 'default'; },
  });
  function onDrop() { /* 정답 확인은 '확인하기' 단계에서 */ }

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'zoom') {
      const n = Math.round(clamp(S.z, 0, 2));
      L1 = '지금 보는 시스템'; a = STAGE_NAME[n]; L2 = '구성요소'; b = ['페달·체인·바퀴·핸들·안장…', '태양 + 행성 8개 + 위성…', '지권·수권·기권·생물권·외권'][n];
      L3 = '상호작용'; c = n === 0 ? (S.chainOff ? '체인이 없어서 힘이 전달 안 됨' : '체인이 페달의 힘을 바퀴에 전달') : n === 1 ? '중력으로 서로 끌어당겨요' : '물질 순환 · 에너지 흐름';
    } else if (S.mode === 'layers') {
      const B = boards[S.sub];
      L1 = '보고 있는 곳'; a = LYR[S.sub].title; L2 = '놓은 이름표'; b = B.placed() + ' / ' + B.items.length; L3 = '확인 결과'; c = layerShown[S.sub] ? '이 단면은 정답 ✅' : '확인하기를 눌러 보세요';
    } else if (S.mode === 'sort') {
      L1 = '분류한 카드'; a = SORT.placed() + ' / 5'; L2 = '5가지 권역'; b = '지권·수권·기권·생물권·외권'; L3 = '결과'; c = S.sortOK > 0.5 ? '모두 알맞게 분류 ✅' : '확인하기를 눌러 보세요';
    } else if (S.mode === 'energy') {
      const n = Object.values(S.src).filter(Boolean).length, k = S.lastSrc;
      L1 = '켠 에너지원'; a = n + ' / 3'; L2 = k ? SRC[k].name + '의 에너지' : '에너지 양'; b = k ? SRC[k].power : '—'; L3 = '일으키는 현상'; c = k ? SRC[k].ph : '—';
    } else if (S.mode === 'pair') {
      L1 = '놓은 카드'; a = PAIR.placed() + ' / 6'; L2 = '에너지원'; b = '태양 · 지구 내부 · 달'; L3 = '결과'; c = S.pairOK > 0.5 ? '모두 알맞게 짝지음 ✅' : '확인하기를 눌러 보세요';
    } else {
      L1 = '채운 빈칸'; a = MAPB.placed() + ' / 6'; L2 = '에너지원'; b = '태양 · 지구 내부 · 달'; L3 = '권역'; c = '지권 수권 기권 생물권 외권';
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.visited = new Set([0]); S.chainTest = 0; S.chainOff = false; S.zt = 0; S.z = 0; S.chainFall = 0; setMode('zoom'); showHint('🔭 단계 버튼으로 줌 여행을 떠나요', 5000); }
    else if (li === 1) { initLayers(); initSort(); S.sel = -1; setMode('layers', 'geo'); showHint('이름표를 끌어서 번호 칸에 놓아요', 5000); }
    else if (li === 2) { S.src = { sun: false, core: false, moon: false }; S.srcSeen = new Set(); S.lastSrc = null; initPair(); setMode('energy'); showHint('에너지원 버튼(또는 그림)을 눌러 켜 보세요', 5000); }
    else { initMap(); setMode('map'); showHint('빈칸 6곳에 이름표를 끌어 놓아요', 5000); }
  }
  function ensure(m, sub) { if (S.mode !== m || (sub && S.sub !== sub)) setMode(m, sub); }
  const nowOn = () => Object.values(S.src).filter(Boolean).length;

  const levels = [
    {
      title: '시스템이란? 자전거에서 지구까지', short: '시스템이란', icon: '🔭', phase: '관찰', features: ['zoom'],
      intro: '<p class="si-q">❓ 탐구 질문: 지구는 서로 다른 부분들이 어떻게 하나의 \'시스템\'으로 움직일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 지구계를 이루는 지권·수권·기권·생물권·외권을 배웠어요(중2 \'지구계와 지권의 구조\'). 이제 \'시스템\'이라는 눈으로 다시 살펴봐요.</div>' +
        '<p><b>시스템</b>은 여러 <b>구성요소</b>가 서로 영향을 주고받으며(<b>상호작용</b>) 하나로 작동하는 집합이에요. 자전거에서 출발해 태양계, 그리고 지구로 줌인해 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '시스템은 구성요소들이 상호작용하며 하나로 작동하는 집합이에요. 지구시스템은 태양계 시스템의 구성요소이면서, 그 안에 다섯 권역을 가진 시스템이에요.',
      summary: '<ul><li><b>시스템</b> = 구성요소 + 구성요소들 사이의 <b>상호작용</b>. (체인이 없는 자전거는 힘이 전달되지 않아요.)</li><li><b>태양계</b>는 태양과 행성, 위성 등이 중력으로 상호작용하는 시스템이고, <b>지구시스템</b>은 그 구성요소예요.</li><li>지구시스템의 구성요소(권역): <b>지권 · 수권 · 기권 · 생물권 · 외권</b></li></ul>',
      missions: [
        {
          title: '세 시스템 만나기',
          goal: '<b>자전거 → 태양계 → 지구</b> 세 장면을 모두 보세요. 자전거 장면에서는 <b>⛓ 체인 떼기</b>로 바퀴가 멈추는 것도 확인해요.',
          hint: '줌 단계 버튼 세 개를 차례로 눌러요. 자전거에서는 체인을 뗀 채로 1~2초 기다려 보세요.',
          setup() { ensure('zoom'); },
          check: () => S.visited.has(0) && S.visited.has(1) && S.visited.has(2) && S.chainTest >= 1.0, hold: 0.4,
          status: () => mark(S.visited.has(0)) + ' 자전거 · ' + mark(S.visited.has(1)) + ' 태양계 · ' + mark(S.visited.has(2)) + ' 지구 · ' + mark(S.chainTest >= 1) + ' 체인 실험',
          explain: '체인을 떼면 페달은 돌아도 힘이 바퀴에 전달되지 않아 바퀴가 멈춰요. 부품(구성요소)들이 <b>서로 연결되어 영향을 주고받아야</b> 하나의 시스템으로 작동해요. 태양계도, 지구도 마찬가지예요.',
        },
        {
          type: 'quiz', title: '시스템의 조건',
          goal: '구성요소들의 모임이 <b>시스템</b>이 되려면 무엇이 꼭 필요할까요?',
          setup() { ensure('zoom'); },
          choices: ['구성요소의 개수가 아주 많아야 한다', '구성요소들이 서로 영향을 주고받아야 한다', '구성요소가 모두 같은 크기여야 한다', '구성요소가 모두 같은 종류여야 한다'],
          answer: 1,
          feedback: ['부품이 몇 개인지는 중요하지 않아요. 부품 두 개짜리 시스템도 있어요.', '', '크기가 달라도 시스템이 될 수 있어요. 지구시스템의 권역은 크기가 모두 달라요.', '자전거도 안장, 체인, 바퀴처럼 종류가 모두 달라요.'],
          explain: '시스템의 핵심은 구성요소들 사이의 <b>상호작용</b>이에요. 체인을 뗀 자전거처럼 상호작용이 끊기면 하나로 작동하지 못해요.',
        },
      ],
    },
    {
      title: '권역의 층 구조', short: '권역의 층', icon: '🧅', phase: '탐구', features: ['layers', 'sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구시스템이 지권·수권·기권·생물권·외권으로 이루어진 시스템임을 알았어요.</div>' +
        '<p>이번에는 권역의 <b>성층 구조</b>를 살펴봐요. 지권은 속에서 <b>지각 · 맨틀 · 외핵 · 내핵</b>으로, 기권은 높이에 따라 <b>4개의 층</b>으로, 수권(바다)은 깊이에 따라 <b>3개의 층</b>으로 나뉘어요.</p><p>단면에서 층의 위치를 읽고 <b>이름표</b>를 놓은 뒤, 여러 사례를 알맞은 권역에 <b>분류</b>해 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '지권은 지각·맨틀·외핵·내핵, 기권은 대류권~열권, 수권은 혼합층·수온 약층·심해층으로 층을 이뤄요. 외핵은 액체, 내핵은 고체예요.',
      summary: '<table class="mini"><tr><th>권역</th><th>층 구조 (위/바깥 → 아래/안)</th></tr><tr><td>지권</td><td>지각(고체) → 맨틀(고체) → <b>외핵(액체)</b> → 내핵(고체)</td></tr><tr><td>기권</td><td>대류권(0~12 km) → 성층권(~50 km) → 중간권(~80 km) → 열권</td></tr><tr><td>수권</td><td>혼합층(~200 m) → 수온 약층(~1000 m) → 심해층</td></tr></table><ul><li>화산=지권, 구름=기권, 바다=수권, 숲=생물권, 우주 먼지=외권</li><li>생물권은 지권·수권·기권에 걸쳐 있어요.</li></ul>',
      missions: [
        {
          title: '층 이름 맞추기',
          goal: '<b>지권 · 기권 · 수권</b> 세 단면에서 이름표를 번호 칸에 모두 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '지권은 바깥에서 안쪽으로 ①②③④, 기권은 위에서 아래로 ①②③④, 수권은 위에서 아래로 ①②③ 순서예요. 기권은 날씨가 나타나는 층이 가장 아래에 있어요.',
          manual: true,
          setup() { ensure('layers'); },
          check() {
            const names = { geo: '지권', atm: '기권', hyd: '수권' }, msg = [];
            ['geo', 'atm', 'hyd'].forEach((k) => {
              const r = layerCheck(k);
              if (r.un) { msg.push('<b>' + names[k] + '</b> 단면에 놓지 않은 이름표가 ' + r.un + '개 있어요.'); return; }
              if (r.bad.length) {
                r.bad.forEach((s) => { const c = s.items[0]; if (!c.bad) { c.bad = true; c.shake = 0.5; } });
                msg.push('<b>' + names[k] + '</b>에서 ' + r.bad.map((s) => s.idx + 1 + '번').join(', ') + ' 칸을 다시 생각해 보세요.'); return;
              }
              if (!layerShown[k]) { layerShown[k] = true; SciSim.tween(layerReveal, { [k]: 1 }, { duration: 0.8 }); boards[k].slots.forEach((s) => parts.burst(s.x - s.w / 2 + 104, s.y - s.h / 2 + 25, { count: 6, speed: 90, size: 3, life: 0.6 })); updateCtl(); }
            });
            return msg.length ? msg.join('<br>') : true;
          },
          explain: '지권은 속으로 갈수록 <b>지각 → 맨틀 → 외핵 → 내핵</b>이에요. 기권은 <b>대류권 → 성층권 → 중간권 → 열권</b>, 수권(바다)은 <b>혼합층 → 수온 약층 → 심해층</b>의 순서로 층을 이뤄요.',
        },
        {
          title: '사례 5개 분류하기',
          goal: '<b>화산, 구름, 바다, 숲, 우주 먼지</b> 카드를 알맞은 권역 상자에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '각 상자 아래의 설명을 읽어 보세요. 구름은 공기 중에 떠 있어요.',
          manual: true,
          setup() { ensure('sort'); },
          check() {
            const un = SORT.items.filter((c) => !c.slot).length;
            if (un) return '아직 상자에 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
            const bad = SORT.items.filter((c) => c.slot.key !== c.ans);
            bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return bad.map((c) => '<b>' + c.label + '</b>').join(', ') + ' 카드는 다른 권역에 더 알맞아요.';
            if (!S.sortOK) { SciSim.tween(S, { sortOK: 1 }, { duration: 0.7 }); SORT.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '화산은 <b>지권</b>, 구름은 <b>기권</b>, 바다는 <b>수권</b>, 숲은 <b>생물권</b>, 우주 먼지는 <b>외권</b>의 사례예요. 한 사례가 여러 권역과 관련되기도 하지만(숲은 땅·공기·물과 이어져 있어요), 가장 알맞은 권역으로 나누어 보는 거예요.',
        },
        {
          type: 'quiz', title: '외핵의 상태',
          goal: '지구 내부는 모두 단단한 고체일까요? <b>외핵</b>의 상태로 알맞은 것은?',
          setup() { ensure('layers', 'geo'); },
          choices: ['지구 내부는 모두 고체이므로 외핵도 고체이다', '액체 상태이다 (철·니켈 등이 녹아 있다)', '기체 상태이다', '맨틀과 똑같이 단단한 암석이다'],
          answer: 1,
          feedback: ['지구 내부가 모두 고체는 아니에요. 단면의 흐르는 무늬를 다시 보세요.', '', '아주 깊은 곳은 압력이 매우 커서 기체로 있을 수 없어요.', '외핵은 암석이 아니라 철과 니켈이 주성분인 금속 물질이에요.'],
          explain: '외핵은 <b>액체</b>, 내핵은 압력이 매우 커서 <b>고체</b>예요. 지구 내부는 전부 고체가 아니에요.',
        },
      ],
    },
    {
      title: '에너지원: 지구시스템을 움직이는 힘', short: '에너지원', icon: '⚡', phase: '탐구', features: ['energy', 'pair'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 권역마다 층 구조가 있고 서로 이어져 있음을 봤어요. 그런데 구름이 흐르고, 화산이 터지고, 바다가 차오르려면 <b>에너지</b>가 필요해요.</div>' +
        '<p>지구시스템에 에너지를 공급하는 <b>에너지원</b>은 세 가지예요. <b>태양 복사 에너지</b>, <b>지구 내부 에너지</b>, 그리고 달(과 태양)의 인력에 의한 <b>조석 에너지</b>를 하나씩 켜 보며 어떤 현상을 일으키는지 알아봐요.</p>',
      setup() { enterLevel(2); },
      recap: '지구시스템의 에너지원은 태양 복사 에너지(약 99.97 %), 지구 내부 에너지, 조석 에너지예요. 양이 작아도 지구 내부 에너지는 지권을 움직여요.',
      summary: '<table class="mini"><tr><th>에너지원</th><th>양 (W)</th><th>일으키는 현상</th></tr><tr><td>태양 복사</td><td>약 1.7×10¹⁷ (99.97 %)</td><td>바람·구름·광합성, 물 순환</td></tr><tr><td>지구 내부</td><td>약 4.7×10¹³</td><td>맨틀 대류, 화산, 지진, 판 이동</td></tr><tr><td>조석(달·태양)</td><td>약 3.7×10¹²</td><td>밀물과 썰물</td></tr></table><ul><li>에너지원마다 양은 크게 다르지만, <b>서로 다른 권역</b>을 움직여요.</li></ul>',
      missions: [
        {
          title: '에너지원 3개 켜기',
          goal: '<b>☀️ 태양</b>, <b>🌋 지구 내부</b>, <b>🌙 달</b>을 모두 켜서 에너지가 지구에 들어오는 모습을 보세요.',
          hint: '오른쪽 버튼을 누르거나 그림 속 태양·달·지구를 눌러도 켜져요. 달을 켜면 바닷물의 모양이 어떻게 변하는지 보세요.',
          setup() { ensure('energy'); },
          check: () => S.src.sun && S.src.core && S.src.moon, hold: 0.8,
          status: () => mark(S.src.sun) + ' 태양 · ' + mark(S.src.core) + ' 지구 내부 · ' + mark(S.src.moon) + ' 달',
          explain: '태양은 <b>바람·구름·광합성</b>을, 지구 내부는 <b>화산과 판 이동</b>을, 달은 <b>밀물과 썰물</b>을 일으켜요. 화살표 굵기는 로그 눈금이라, 실제 에너지 양의 차이는 원 그래프(태양 99.97 %)에서 확인할 수 있어요.',
        },
        {
          title: '에너지원과 현상 짝짓기',
          goal: '현상 카드 <b>6장</b>을 그 현상을 일으키는 에너지원에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '날씨와 생명 활동은 태양, 땅속의 활동은 지구 내부, 바다의 높낮이는 달과 관련이 있어요.',
          manual: true,
          setup() { ensure('pair'); },
          check() {
            const un = PAIR.items.filter((c) => !c.slot).length;
            if (un) return '아직 상자에 놓지 않은 카드가 <b>' + un + '장</b> 있어요.';
            const bad = PAIR.items.filter((c) => c.slot.key !== c.ans);
            bad.forEach((c) => { if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return bad.map((c) => '<b>' + c.label + '</b>').join(', ') + ' 카드를 다시 생각해 보세요.';
            if (!S.pairOK) { SciSim.tween(S, { pairOK: 1 }, { duration: 0.7 }); PAIR.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '<b>태양</b> → 바람, 구름·날씨, 광합성 / <b>지구 내부</b> → 화산 활동, 판의 이동 / <b>달</b> → 밀물과 썰물. 에너지원은 서로 다른 권역의 현상을 일으켜요.',
        },
        {
          type: 'quiz', title: '작지만 중요한 에너지',
          goal: '지구 내부 에너지는 태양 에너지의 <b>0.03 %</b>에 불과해요. 그렇다면 지표에 미치는 영향은 어떨까요?',
          setup() { ensure('energy'); },
          choices: ['양이 너무 적어서 지표에는 거의 영향이 없다', '양은 작지만 맨틀을 움직여 화산·지진·판 이동 같은 큰 변화를 일으킨다', '양이 많아서 지구의 날씨를 결정한다', '이제는 모두 식어서 아무 영향이 없다'],
          answer: 1,
          feedback: ['양이 적어도 오랜 시간 땅속에서 쌓여 지권을 움직여요.', '', '날씨는 주로 태양 에너지가 만들어요. 지구 내부 에너지는 땅속 현상과 관련 있어요.', '지구 내부는 지금도 뜨거워요. 그래서 화산이 폭발하고 판이 움직여요.'],
          explain: '지구 내부 에너지는 양이 작지만 <b>맨틀 대류</b>를 일으켜 판을 움직이고 화산과 지진을 만들어요. 양의 많고 적음과 영향의 종류는 달라요.',
        },
      ],
    },
    {
      title: '지구시스템 한눈에 정리', short: '확인', icon: '🗺️', phase: '확인', features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 에너지원이 서로 다른 권역을 움직인다는 것을 알았어요. 이제 <b>권역 · 에너지원 · 흐름</b>을 한 장의 그림으로 정리해요.</div>' +
        '<p>관계도의 <b>빈칸 6곳</b>을 채워 보세요. 화살표 옆의 글자(바람·구름, 밀물·썰물, 화산·지진…)가 단서예요.</p>',
      setup() { enterLevel(3); },
      recap: '지구시스템은 태양계 시스템의 구성요소이고, 5개 권역이 에너지원(태양·지구 내부·달)의 에너지와 물질 순환으로 서로 이어진 시스템이에요.',
      summary: '<ul><li>지구시스템은 <b>태양계의 구성요소</b>이면서 <b>지권 · 수권 · 기권 · 생물권 · 외권</b>으로 이루어진 시스템이에요.</li><li>에너지원: <b>태양 · 지구 내부 · 달(조석)</b></li><li>권역들은 <b>물질 순환</b>(물, 탄소 등)과 <b>에너지 흐름</b>으로 서로 영향을 주고받아요. (다음 차시: 권역 간 상호작용)</li></ul>',
      missions: [
        {
          title: '관계도 빈칸 채우기',
          goal: '관계도의 빈칸 <b>6곳</b>에 이름표를 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '위쪽 우주 공간 안에는 태양과 달이 있어요. 지구 아래쪽 에너지는 땅속에서 올라오고, 광합성·호흡은 생물권에서 일어나요.',
          manual: true,
          setup() { ensure('map'); },
          check() {
            const un = MAPB.slots.filter((s) => !s.items.length).length;
            if (un) return '아직 비어 있는 칸이 <b>' + un + '곳</b> 있어요.';
            const bad = MAPB.slots.filter((s) => s.items[0].ans !== s.key);
            bad.forEach((s) => { const c = s.items[0]; if (!c.bad) { c.bad = true; c.shake = 0.5; } });
            if (bad.length) return '<b>' + bad.length + '곳</b>이 알맞지 않아요. 화살표 옆의 단서 글자를 다시 읽어 보세요.';
            if (!S.mapOK) { SciSim.tween(S, { mapOK: 1 }, { duration: 0.8 }); MAPB.items.forEach((c) => parts.burst(c.x, c.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '태양은 기권(바람·구름·날씨)에, 지구 내부 에너지는 지권(화산·지진·판 이동)에, 달의 인력은 수권(밀물·썰물)에 영향을 줘요. 권역들은 서로 물질과 에너지를 주고받으며 하나의 시스템을 이뤄요.',
        },
        {
          type: 'quiz', title: '태양계와 지구시스템',
          goal: '<b>지구시스템이 태양계 시스템의 구성요소</b>라고 말하는 까닭으로 알맞은 것은?',
          setup() { ensure('map'); },
          choices: ['지구가 태양계의 행성 중 가장 크기 때문에', '지구가 태양의 에너지를 받는 등 태양계 안의 다른 천체와 상호작용하며 그 일부를 이루기 때문에', '지구시스템이 태양계와 아무 관계 없이 따로 작동하기 때문에', '태양계의 모든 행성에 생명이 살기 때문에'],
          answer: 1,
          feedback: ['지구는 목성이나 토성보다 작아요. 크기는 기준이 아니에요.', '', '지구는 태양 에너지와 중력, 달의 인력 등으로 태양계와 이어져 있어요.', '지구 말고는 아직 생명이 발견되지 않았어요.'],
          explain: '지구시스템은 태양 에너지를 받고 달·태양의 인력을 받으며 태양계의 다른 천체와 <b>상호작용</b>해요. 그래서 태양계라는 큰 시스템의 <b>구성요소</b>로 볼 수 있어요.',
        },
        {
          type: 'quiz', title: '생물권은 어디에?',
          goal: '<b>생물권</b>은 다른 권역들과 어떤 관계일까요?',
          setup() { ensure('map'); },
          choices: ['지권의 핵에만 있다', '기권의 열권에만 있다', '지권·수권·기권에 걸쳐 있다 (땅 위와 땅속, 물속, 공기 중)', '외권 우주 공간에 걸쳐 있다'],
          answer: 2,
          feedback: ['핵은 온도와 압력이 너무 커서 생물이 살 수 없어요.', '열권은 공기가 거의 없어서 생물이 살 수 없어요.', '', '지구 대기권 밖에서는 자연 상태로 생물이 살지 못해요.'],
          explain: '생물권은 따로 떨어진 층이 아니라 <b>지권·수권·기권에 걸쳐</b> 있어요. 그래서 생물은 권역들 사이의 물질 순환(광합성·호흡, 물 이용 등)에 직접 참여해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-earth-system', mount: '#game', badge: '지구시스템 탐험가', homeHref: '../../index.html#h1a',
    featureLabels: { zoom: '🔭 줌 단계 버튼 · ⛓ 체인 떼기', layers: '🧅 지권·기권·수권 단면 · 이름표', sort: '🗂️ 권역 분류판 · 사례 카드', energy: '⚡ 에너지원 버튼 · 에너지 화살표', pair: '🔗 에너지원 짝짓기판', map: '🗺️ 지구시스템 관계도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initLayers(); initSort(); initPair(); initMap();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 줌
    S.z = RM ? S.zt : SciSim.approach(S.z, S.zt, dt, 2.6);
    if (Math.abs(S.z - S.zt) < 0.004) S.z = S.zt;
    for (let k = 0; k < 3; k++) if (Math.abs(S.z - k) < 0.06) S.visited.add(k);
    if (S.zt === 2 && S.z > 1.7 && S.sel < 0 && S.earthSeen.size === 0) { /* 처음엔 전체를 보여 줌 */ }
    if (S.z > 1.7) { S.selIdle += dt; if (S.selIdle > 3.6 && S.sel < 0) { S.selAuto = (S.selAuto + 1) % 5; S.selIdle = 3.6 - 2.2; S.autoSel = true; S.sel = S.selAuto; } else if (S.selIdle > 3.6 && S.autoSel) { S.selAuto = (S.selAuto + 1) % 5; S.selIdle = 3.6 - 2.2; S.sel = S.selAuto; } }
    // 자전거
    const wTarget = S.chainOff ? 0 : 2.1 * 1.7;
    S.thC += 1.7 * dt * (S.pedalOn ? 1 : 0);
    S.wSpeed = SciSim.approach(S.wSpeed, wTarget, dt, S.chainOff ? 1.1 : 3.5);
    S.thW += S.wSpeed * dt;
    S.chainFall = RM ? (S.chainOff ? 1 : 0) : SciSim.approach(S.chainFall, S.chainOff ? 1 : 0, dt, 4);
    if (S.chainOff && S.wSpeed < 0.35 && S.z < 0.2) S.chainTest += dt;
    // 에너지
    ['sun', 'core', 'moon'].forEach((k) => { S.srcA[k] = RM ? (S.src[k] ? 1 : 0) : SciSim.approach(S.srcA[k], S.src[k] ? 1 : 0, dt, 5); });
    S.tideA = RM ? (S.src.moon ? 1 : 0) : SciSim.approach(S.tideA, S.src.moon ? 1 : 0, dt, 2.4);
    S.rain = false;
    [SORT, PAIR, MAPB].concat(Object.values(boards)).forEach((b) => b.step(dt));
    parts.update(dt);
    // 그리기
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'zoom') drawZoom(t, dt);
    else if (S.mode === 'layers') drawLayers(t, dt);
    else if (S.mode === 'sort') drawSort(t);
    else if (S.mode === 'energy') drawEnergy(t, dt);
    else if (S.mode === 'pair') drawPair(t);
    else drawMap(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  function put(B, c, s) { if (c.slot) { c.slot.items.splice(c.slot.items.indexOf(c), 1); } s.items.push(c); c.slot = s; c.free = false; B.layout(s); c.x = c.tx; c.y = c.ty; c.sc = c.tsc; c.bad = false; }
  window.__sim = {
    S, VW, VH, boards, SORT, PAIR, MAPB, get game() { return game; }, enterLevel, setMode, setSub, toggleSrc, setZoom, layerCheck,
    solve(kind, right) {
      if (kind === 'layers') ['geo', 'atm', 'hyd'].forEach((k) => { const B = boards[k]; B.items.forEach((c) => { const idx = right === false ? (c.ans + 1) % B.slots.length : c.ans; put(B, c, B.slots[idx]); }); });
      else if (kind === 'sort') SORT.items.forEach((c, i) => { const key = right === false ? SEL_ORDER[(SEL_ORDER.indexOf(c.ans) + 1) % 5] : c.ans; put(SORT, c, SORT.slots.find((s) => s.key === key)); });
      else if (kind === 'pair') PAIR.items.forEach((c) => { const key = right === false ? { sun: 'core', core: 'moon', moon: 'sun' }[c.ans] : c.ans; put(PAIR, c, PAIR.slots.find((s) => s.key === key)); });
      else if (kind === 'map') MAPB.items.forEach((c) => { const keys = ['spc', 'sun', 'moon', 'hyd', 'bio', 'core']; const key = right === false ? keys[(keys.indexOf(c.ans) + 1) % 6] : c.ans; put(MAPB, c, MAPB.slots.find((s) => s.key === key)); });
    },
  };
})();
