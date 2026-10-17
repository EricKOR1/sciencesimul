/* =========================================================
   중3 Ⅲ. 수권과 해수의 순환 - 해수의 수온 분포  [9과18-02 ① 수온]
   해수의 수온과 염분의 분포 및 변화를 해석하여 해수의 특성을 설명할 수 있다.
   ① 관찰: 깊이에 따른 수온 → ② 실험: 연직 수온 분포 실험(적외선등·선풍기)
   → ③ 설명: 혼합층·수온 약층·심해층 → ④ 적용: 우리나라 바다의 2월·8월
   (실제 바다 자료는 국립수산과학원 정선 해양 관측 자료의 경향을 단순화한 대표값)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const EA = SciSim.ease, RM = !!SciSim.reduceMotion;
  const approach = SciSim.approach;
  const mixC = SciSim.color.mix, rgba = SciSim.color.rgba, shade = SciSim.color.shade;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 880 : 540;
  const FS = PHONE ? 1.15 : 1;
  const fz = (n) => Math.round(n * FS * 2) / 2;
  const ST = PHONE ? { s: 0.96, x: (600 - 480 * 0.96) / 2, y: 0 } : { s: 1, x: 0, y: 0 };     // 왼쪽 장면(폭 480) 변환
  const GR = PHONE ? { x: 10, y: 530, w: 580, h: 340 } : { x: 490, y: 20, w: 300, h: 500 };  // 그래프 패널
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#dcecf7' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  const isNew = (n) => !!(game && game.isNew(n));
  const gHas = (n) => !!(game && game.has(n));

  /* ---------- 작은 도우미 ---------- */
  const mulberry = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function grad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function T(x, y, str, size, color, o) { D.text(x, y, str, Object.assign({ size: fz(size), color: color || '#1b2333', weight: 800 }, o || {})); }
  function pill(x, y, text, bg, fg, size, o) { return D.label(x, y, text, Object.assign({ bg: bg || '#1b2333', color: fg || '#fff', size: fz(size || 13) }, o || {})); }
  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = 'rgba(139,92,246,' + (0.35 + a * 0.5) + ')'; ctx.lineWidth = 4;
    rr(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.fillStyle = '#8b5cf6'; rr(x + w - 40, y - 16, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEW', x + w - 15, y);
    ctx.restore();
  }
  function wavePath(x0, x1, yf, step) { ctx.beginPath(); for (let x = x0; x <= x1 + 0.1; x += step) { const y = yf(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } }
  function makeCache(w, h, k, fn) { const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const cx = c.getContext('2d'); cx.scale(k, k); fn(cx, SciSim.draw(cx)); return c; }
  const hintEl = $('#stageHint');
  function showHint(text, ms) { hintEl.textContent = text; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 3600); }
  function hideHint() { hintEl.classList.add('hide'); }
  // 장면 좌표 변환
  const toScene = (p) => ({ x: (p.x - ST.x) / ST.s, y: (p.y - ST.y) / ST.s });

  let SCENE = 'column', prevScene = null, trans = 1;
  const SCENE_BY_LEVEL = ['column', 'lab', 'layers', 'map'];
  const SCENE_NAME = { column: '🚢 2월 동해에서 수온 재기', lab: '🧪 연직 수온 분포 실험 (수조)', layers: '🧩 해수의 층상 구조 (2월 동해)', map: '🗺️ 우리나라 바다의 계절별 수온' };

  /* =========================================================
     데이터: 우리나라 주변 바다의 연직 수온 분포 (단순화한 대표값)
     [수심 m, 수온 ℃] 단조 3차 보간(Fritsch–Carlson)
     ========================================================= */
  function mono(pts) {
    const n = pts.length, x = pts.map((p) => p[0]), y = pts.map((p) => p[1]);
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (z) => {
      z = clamp(z, x[0], x[n - 1]);
      let i = 0; while (i < n - 2 && z > x[i + 1]) i++;
      const h = x[i + 1] - x[i], t = (z - x[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  const RAW = {
    east: {
      2: [[0, 11.6], [25, 11.6], [50, 11.5], [75, 11.3], [100, 10.8], [125, 9.6], [150, 7.6], [175, 5.6], [200, 4.0], [250, 2.2], [300, 1.3], [400, 0.8], [500, 0.6], [700, 0.45], [1000, 0.3]],
      8: [[0, 25.2], [10, 25.0], [15, 24.2], [20, 21.8], [30, 17.5], [40, 14.6], [50, 12.6], [75, 9.6], [100, 7.6], [150, 4.6], [200, 3.0], [250, 1.9], [300, 1.3], [400, 0.8], [500, 0.6], [700, 0.45], [1000, 0.3]],
    },
    west: {
      2: [[0, 7.2], [20, 7.2], [40, 7.1], [60, 7.1], [80, 7.0]],
      8: [[0, 25.4], [5, 25.3], [10, 24.6], [15, 21.5], [20, 16.5], [25, 12.5], [30, 10.4], [40, 9.1], [50, 8.6], [60, 8.4], [70, 8.3], [80, 8.3]],
    },
    south: {
      2: [[0, 13.8], [25, 13.8], [50, 13.7], [75, 13.6], [100, 13.5]],
      8: [[0, 27.0], [10, 26.6], [15, 25.0], [20, 22.5], [30, 19.0], [40, 17.2], [50, 16.2], [75, 15.0], [100, 14.4]],
    },
  };
  const PF = {};
  for (const sea in RAW) { PF[sea] = {}; for (const s in RAW[sea]) PF[sea][s] = mono(RAW[sea][s]); }
  const SEAS = {
    east: { name: '동해', lon: 130.5, lat: 37.3, zmax: 1000, floor: null, ticks: [0, 200, 400, 600, 800, 1000], bottom: 1000 },
    west: { name: '황해', lon: 124.0, lat: 36.0, zmax: 100, floor: 80, ticks: [0, 20, 40, 60, 80, 100], bottom: 80 },
    south: { name: '남해', lon: 127.4, lat: 33.8, zmax: 120, floor: 100, ticks: [0, 20, 40, 60, 80, 100, 120], bottom: 100 },
  };
  const TCOL = [[0, '#1e3a8a'], [8, '#0ea5e9'], [16, '#34d399'], [22, '#facc15'], [28, '#f97316']];
  function tempColor(t) {
    if (t <= TCOL[0][0]) return TCOL[0][1];
    for (let i = 1; i < TCOL.length; i++) if (t <= TCOL[i][0]) return mixC(TCOL[i - 1][1], TCOL[i][1], (t - TCOL[i - 1][0]) / (TCOL[i][0] - TCOL[i - 1][0]));
    return TCOL[TCOL.length - 1][1];
  }
  function labColor(t) {
    if (t <= 25) return mixC('#bfe9f2', '#fde68a', clamp((t - 20) / 5, 0, 1));
    return mixC('#fde68a', '#fb923c', clamp((t - 25) / 5, 0, 1.2));
  }

  /* =========================================================
     그래프 패널 (수온 축은 위쪽, 깊이 축은 아래로 깊어짐)
     ========================================================= */
  const GST = { ymax: 1000, bubble: 0, bubbleShown: false };
  const GCFG = {};     // 장면별 그래프 설정을 만들어 주는 함수들
  function gMap(c) {
    const lm = fz(46), x0 = GR.x + lm, x1 = GR.x + GR.w - 16, y0 = GR.y + fz(62), y1 = GR.y + GR.h - fz(PHONE ? 50 : 58);
    const YM = c.ymax != null ? c.ymax : GST.ymax;
    return { x0, x1, y0, y1, YM, X: (tv) => x0 + (tv - c.xmin) / (c.xmax - c.xmin) * (x1 - x0), Y: (z) => y0 + (z / YM) * (y1 - y0) };
  }
  function drawGraph(c, alpha) {
    if (!c) return;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    D.shadow(() => { rr(GR.x, GR.y, GR.w, GR.h, 16); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 12, y: 4 });
    const m = gMap(c), { x0, x1, y0, y1, X, Y, YM } = m;
    T(GR.x + 12, GR.y + fz(24), c.title, 14, '#0b3a82', { align: 'left' });
    // 깊이 방향 격자·눈금
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#475569';
    c.yticks.forEach((z) => {
      if (z > YM * 1.001) return;
      const y = Y(z); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      T(x0 - 6, y + (z === 0 ? 15 : 4), fmt(z), 13, '#475569', { align: 'right' });
    });
    c.xticks.forEach((tv) => {
      const x = X(tv); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      T(x, y0 - 6, String(tv), 13, '#475569');
    });
    T(GR.x + 12, GR.y + fz(46), '수온(℃) →', 13, '#b45309', { align: 'left' });
    T(GR.x + GR.w - 12, GR.y + fz(46), '깊이(' + c.yunit + ') ↓', 13, '#1d4ed8', { align: 'right' });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    // 띠(층) 강조
    (c.bands || []).forEach((b) => {
      const ya = Y(b.z0), yb = Math.min(y1, Y(b.z1));
      ctx.fillStyle = rgba(b.color, b.alpha != null ? b.alpha : 0.16); ctx.fillRect(x0, ya, x1 - x0, yb - ya);
      if (b.label) T(x1 - 6, (ya + yb) / 2 + 4, b.label, 13, shade(b.color, -0.35), { align: 'right' });
      if (b.glow) { ctx.strokeStyle = rgba(b.color, 0.5 + 0.4 * b.glow); ctx.lineWidth = 3; ctx.strokeRect(x0 + 2, ya + 1, x1 - x0 - 4, yb - ya - 2); }
    });
    // 해저
    if (c.floorZ != null && Y(c.floorZ) < y1) {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(x0, Y(c.floorZ), x1 - x0, y1 - Y(c.floorZ));
      T((x0 + x1) / 2, Math.min(y1 - 6, Y(c.floorZ) + 16), '해저', 13, '#fff');
    }
    // 곡선
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, y0 - 2, x1 - x0 + 8, y1 - y0 + 6); ctx.clip();
    (c.series || []).forEach((s) => {
      const pts = s.pts; if (!pts || !pts.length) return;
      const n = s.upTo != null ? Math.floor(Math.max(0, Math.min(pts.length, s.upTo))) : pts.length;
      if (n < 1) return;
      ctx.save();
      if (s.alpha != null) ctx.globalAlpha *= s.alpha;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = pts[i], px = X(p[0]), py = Y(p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      if (s.frac != null && n < pts.length) {      // 펜이 선을 이어 그리는 중간 점
        const a = pts[n - 1], b = pts[n]; ctx.lineTo(X(lerp(a[0], b[0], s.frac)), Y(lerp(a[1], b[1], s.frac)));
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (s.dots) pts.slice(0, n).forEach((p) => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), s.dotR || 3.5, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); });
      if (s.pen) {   // 펜 끝의 은은한 빛
        const last = s.penPt || pts[n - 1];
        D.glow(X(last[0]), Y(last[1]), 14, s.color, 0.8); D.sphere(X(last[0]), Y(last[1]), 4.5, s.color, { gloss: false });
      }
      if (s.flash > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + s.flash + ')'; ctx.lineWidth = (s.width || 3.5) + 3; ctx.beginPath(); pts.slice(0, n).forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke(); }
      ctx.restore();
    });
    (c.markers || []).forEach((mk) => { D.sphere(X(mk.T), Y(mk.z), mk.r || 6, mk.color, { shadow: true }); });
    ctx.restore();
    (c.tags || []).forEach((tg) => { pill(Math.min(x1 - 70, Math.max(x0 + 70, X(tg.T) + 70)), Y(tg.z) - 12, tg.text, tg.color || '#1d4ed8', '#fff', 13); });
    // 범례
    const leg = c.legend || [];
    if (leg.length) {
      let lx = GR.x + 12; const ly = y1 + fz(24);
      leg.forEach((l, i) => {
        const w = (l.text.length * 12.5 + 28) * (PHONE ? 1.1 : 1);
        if (lx + w > GR.x + GR.w - 6) { lx = GR.x + 12; l.row = 1; }
        const yy = ly + (l.row ? 24 : 0);
        ctx.save(); ctx.globalAlpha = l.on === false ? 0.35 : 1;
        ctx.fillStyle = l.color; rr(lx, yy - 8, 16, 6, 3); ctx.fill();
        T(lx + 22, yy, l.text, 13, '#1b2333', { align: 'left' });
        ctx.restore(); lx += w;
      });
    }
    if (c.note) T(GR.x + GR.w / 2, GR.y + GR.h - 8, c.note, 12, '#64748b');
    // 처음 한 번: 깊이 축 설명 말풍선
    if (c.bubble && GST.bubble > 0) {
      const a = clamp(GST.bubble / 0.4, 0, 1) * clamp((4 - (4 - GST.bubble)) / 0.4, 0, 1);
      ctx.save(); ctx.globalAlpha = Math.min(1, GST.bubble * 1.5);
      const b = pill(x0 + 96, y0 + 50, '↓ 깊이는 아래로 갈수록 깊어져요', '#1d4ed8', '#fff', 13);
      ctx.restore();
    }
    ctx.restore();
  }

  /* =========================================================
     장면 ① · 바다 단면과 연구선 (column) / ③ 층상 구조 (layers 에서 재사용)
     ========================================================= */
  const SEA_Y0 = 78, PXM = 0.44;
  const zY = (z) => SEA_Y0 + z * PXM;
  const SHIP_X = 330, CABLE_X = 284;
  const C = {
    z: new SciSim.Spring(0, { stiffness: 46, damping: 11 }), zt: 0, hold: 0, drag: false, off: 0, maxZ: 0, meas: new Array(101).fill(false), cellA: new Array(101).fill(0), count: 0,
    lastI: 0, paintDirty: true, pc: null, sweep: 1, penZ: 0, led: 0, ledT: 0, tilt: 0, lastTick: 0, reached: false, snow: [], fish: [], glow: [],
  };
  let PCfull = null;
  function initOcean() {
    const r = mulberry(21);
    C.snow = []; for (let i = 0; i < 60; i++) C.snow.push({ x: 8 + r() * 464, y: 82 + r() * 436, v: 5 + r() * 9, ph: r() * 6, s: 0.8 + r() * 1.6 });
    C.fish = []; for (let i = 0; i < 8; i++) C.fish.push({ x: 40 + r() * 400, y: 92 + r() * 22, v: 12 + r() * 10, d: r() > 0.5 ? 1 : -1, ph: r() * 6 });
    C.glow = []; for (let i = 0; i < 7; i++) C.glow.push({ x: 40 + r() * 400, y: 380 + r() * 130, ph: r() * 6 });
  }
  initOcean();
  function paintCells(g, full) {
    g.clearRect(0, 0, 480, 442);
    for (let i = 0; i <= 100; i++) {
      const a = full ? 1 : C.cellA[i];
      if (a <= 0.01) continue;
      g.globalAlpha = a;
      g.fillStyle = tempColor(PF.east[2](i * 10));
      g.fillRect(28, i * 10 * PXM - 2.4, 244, 5.4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';
    const m = g.createLinearGradient(28, 0, 272, 0);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.82, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, 480, 442);
    g.globalCompositeOperation = 'source-over';
  }
  function getPaint(full) {
    if (full) {
      if (!PCfull) { PCfull = document.createElement('canvas'); PCfull.width = 480; PCfull.height = 442; paintCells(PCfull.getContext('2d'), true); }
      return PCfull;
    }
    if (!C.pc) { C.pc = document.createElement('canvas'); C.pc.width = 480; C.pc.height = 442; }
    if (C.paintDirty) { paintCells(C.pc.getContext('2d'), false); C.paintDirty = false; }
    return C.pc;
  }
  function resetColumn() {
    C.z.value = C.z.target = 0; C.z.velocity = 0; C.zt = 0; C.maxZ = 0; C.meas.fill(false); C.cellA.fill(0); C.count = 0; C.lastI = 0; C.paintDirty = true; C.sweep = 1; C.reached = false; C.hold = 0;
  }
  function measureCell(i) {
    if (i < 0 || i > 100 || C.meas[i]) return;
    C.meas[i] = true; C.count++; C.cellA[i] = 0.001; C.paintDirty = true;
    C.led = 0.15;
    if (i % 5 === 0) Sound.tick();
  }
  function updateColumn(dt, t) {
    if (C.hold) C.zt = clamp(C.zt + C.hold * 130 * dt, 0, 1000);
    C.z.target = C.zt;
    const pz = C.z.value;
    C.z.update(dt);
    let z = C.z.value;
    if (z < 0) { z = 0; C.z.value = 0; C.z.velocity = 0; }
    if (z > 1000) { z = 1000; C.z.value = 1000; C.z.velocity = 0; }
    if (Math.abs(z - C.zt) < 0.4 && Math.abs(C.z.velocity) < 3) { C.z.value = z = C.zt; C.z.velocity = 0; }
    C.tilt = approach(C.tilt, clamp(C.z.velocity * 0.0006, -0.18, 0.18), dt, 8);
    // 지나간 10 m 칸을 측정
    const i1 = Math.round(z / 10), i0 = Math.round(pz / 10);
    for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) measureCell(i);
    if (z > C.maxZ) C.maxZ = z;
    C.penZ = z;
    let anim = false;
    for (let i = 0; i <= 100; i++) if (C.cellA[i] > 0 && C.cellA[i] < 1) { C.cellA[i] = Math.min(1, C.cellA[i] + dt * 2.5); anim = true; }
    if (anim) C.paintDirty = true;
    C.led = Math.max(0, C.led - dt);
    if (!C.reached && C.maxZ >= 995 && C.count >= 90) { C.reached = true; C.sweep = 0; Sound.success(); }
    if (C.sweep < 1) C.sweep = Math.min(1, C.sweep + dt / 0.9);
    // 부유 입자·물고기
    C.snow.forEach((s) => { s.y += s.v * dt * (RM ? 0.3 : 1); s.x += Math.sin(t * 0.6 + s.ph) * 4 * dt; if (s.y > 518) { s.y = 82; s.x = 8 + Math.random() * 464; } });
    C.fish.forEach((f) => { f.x += f.v * f.d * dt * (RM ? 0.3 : 1); if (f.x > 500) f.x = -20; if (f.x < -20) f.x = 500; });
    // 칸 안에서 측정기를 내릴 때마다 은은한 입자
    if (anim && !RM && Math.random() < 0.5) FX.emit({ x: CABLE_X + (Math.random() - 0.5) * 8, y: zY(z), vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.5, size: 1.8, color: '#fde68a', gravity: 0 });
  }
  // 잠수·부유 생물
  function drawCreatures(t) {
    ctx.save();
    C.fish.forEach((f) => {
      ctx.save(); ctx.translate(f.x, f.y + Math.sin(t * 1.4 + f.ph) * 2); ctx.scale(f.d, 1);
      ctx.fillStyle = 'rgba(14,45,92,.55)';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.4, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-13, -3.5 + Math.sin(t * 9 + f.ph) * 1.4); ctx.lineTo(-13, 3.5 + Math.sin(t * 9 + f.ph) * 1.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    C.glow.forEach((g) => { const a = 0.25 + 0.35 * Math.max(0, Math.sin(t * 1.3 + g.ph)); D.glow(g.x, g.y, 9, '#7dd3fc', a); ctx.fillStyle = 'rgba(190,240,255,' + (a + 0.2) + ')'; ctx.beginPath(); ctx.arc(g.x, g.y, 1.6, 0, 6.283); ctx.fill(); });
    ctx.fillStyle = 'rgba(220,240,255,.5)';
    C.snow.forEach((s) => { ctx.globalAlpha = clamp(0.5 - (s.y - 82) / 1000, 0.12, 0.5); ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.283); ctx.fill(); });
    ctx.restore();
  }
  function drawRays(t) {
    if (RM) return;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 98 + Math.sin(t * 0.3 + i) * 14, w = 26 + 8 * Math.sin(t * 0.5 + i * 2);
      const g = ctx.createLinearGradient(0, SEA_Y0, 0, zY(200));
      g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, SEA_Y0); ctx.lineTo(x + w, SEA_Y0); ctx.lineTo(x + w + 40, zY(200)); ctx.lineTo(x + 10, zY(200)); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawSky(t) {
    ctx.fillStyle = grad(0, 0, 0, SEA_Y0, [[0, '#9fb0c4'], [1, '#dde5ee']]); ctx.fillRect(0, 0, 480, SEA_Y0 + 2);
    D.glow(76, 56, 46, '#fff6d8', 0.55); ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(76, 56, 11, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    [[330, 20, 1], [420, 34, 0.8], [190, 14, 0.7]].forEach((c) => { const x = (c[0] + t * 3 * c[2]) % 560 - 40; [[0, 0, 14], [14, 3, 10], [-13, 4, 9]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * c[2], c[1] + q[1], q[2] * c[2], 0, 6.283); ctx.fill(); }); });
  }
  function drawShip(t) {
    const bob = RM ? 0 : Math.sin(t * Math.PI * 0.8) * 3, rot = RM ? 0 : Math.sin(t * 1.6) * 0.012;
    ctx.save(); ctx.translate(SHIP_X, SEA_Y0 - 2 + bob); ctx.rotate(rot);
    D.shadow(() => { ctx.fillStyle = '#f4f7fb'; ctx.beginPath(); ctx.moveTo(-62, -10); ctx.lineTo(62, -10); ctx.lineTo(50, 12); ctx.lineTo(-52, 12); ctx.closePath(); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-60, -3); ctx.lineTo(60, -3); ctx.lineTo(56, 4); ctx.lineTo(-57, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-52, 12); ctx.lineTo(50, 12); ctx.lineTo(46, 17); ctx.lineTo(-48, 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-18, -34, 52, 24); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-18, -34, 52, 4);
    ctx.fillStyle = '#7dc3ee'; for (let i = 0; i < 4; i++) ctx.fillRect(-13 + i * 12, -27, 8, 8);
    ctx.fillStyle = '#e2464b'; ctx.fillRect(10, -48, 10, 14); ctx.fillStyle = '#334155'; ctx.fillRect(10, -50, 10, 3);
    // A자 틀과 윈치(왼쪽 선미)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-58, -10); ctx.lineTo(-52, -34); ctx.lineTo(-44, -10); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-52, -34, 4, 0, 6.283); ctx.fill();
    ctx.restore();
    // 뱃전 물결 자국
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) { wavePath(SHIP_X - 70 - k * 8, SHIP_X - 44, (x) => SEA_Y0 + 3 + k * 4 + 1.2 * Math.sin(x * 0.3 + t * 3), 4); ctx.stroke(); }
  }
  function tempAt(sea, season, z) { return PF[sea][season](z); }
  function drawProbe(t) {
    const z = C.z.value, y = zY(z), x = CABLE_X;
    const sway = RM ? 0 : Math.sin(t * 1.2) * 0.02;
    // 케이블
    ctx.strokeStyle = 'rgba(30,41,59,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 0.5, SEA_Y0 - 36); ctx.lineTo(x, y - 20); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(C.tilt + sway);
    D.shadow(() => {
      rr(-7, -20, 14, 34, 6); ctx.fillStyle = grad(-7, 0, 7, 0, [[0, '#cbd5e1'], [0.5, '#94a3b8'], [1, '#64748b']]); ctx.fill();
    }, { blur: 5, y: 2, color: 'rgba(0,0,0,.35)' });
    ctx.fillStyle = '#f97316'; rr(-5, 12, 10, 10, 4); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.fillRect(-7, -6, 14, 3);
    const on = C.led > 0 ? 1 : 0.6;
    ctx.fillStyle = 'rgba(74,222,128,' + on + ')'; ctx.beginPath(); ctx.arc(0, -13, 2.4, 0, 6.283); ctx.fill();
    ctx.restore();
    // 말풍선(LED)
    const T0 = tempAt('east', 2, z);
    const bx = x + 16, txt = Math.round(z) + ' m · ' + T0.toFixed(1) + ' ℃';
    ctx.save(); ctx.font = 'bold ' + fz(14) + 'px ui-monospace, Menlo, Consolas, monospace';
    const w = ctx.measureText(txt).width + 16; ctx.restore();
    rr(bx, y - 12, w, 24, 8); ctx.fillStyle = 'rgba(8,15,30,.88)'; ctx.fill();
    ctx.save(); ctx.font = 'bold ' + fz(14) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.fillStyle = '#4ade80'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 8, y + 1); ctx.restore();
  }
  function drawRuler() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.3;
    [0, 100, 200, 300, 500, 700, 1000].forEach((m) => {
      const y = zY(m); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(m % 500 === 0 || m === 0 ? 12 : 8, y); ctx.stroke();
      if (m > 0) T(14, y + 4, m === 1000 ? '1,000 m' : m + ' m', 12, '#ffffff', { align: 'left', stroke: 'rgba(5,25,50,.7)', strokeWidth: 3 });
    });
    ctx.restore();
  }
  function drawLegend() {
    const x = 40, y = 38, w = 190;
    rr(x - 8, y - 22, w + 16, 52, 8); ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fill();
    T(x, y - 8, '🌡️ 수온 색', 13, '#1b2333', { align: 'left' });
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    TCOL.forEach((c) => g.addColorStop(c[0] / 28, c[1]));
    ctx.fillStyle = g; rr(x, y, w, 9, 4); ctx.fill();
    [0, 8, 16, 22, 28].forEach((tv) => T(x + tv / 28 * w, y + 24, tv + '', 12, '#334155'));
  }
  function drawOcean(t, o) {
    o = o || {};
    drawSky(t);
    // 물(깊이에 따라 어두워짐)
    ctx.fillStyle = grad(0, SEA_Y0, 0, zY(1000), [[0, '#2a86c9'], [0.2, '#0e3d74'], [1, '#061a33']]); ctx.fillRect(0, SEA_Y0, 480, 462);
    // 해저 느낌(1,000 m 아래)
    ctx.fillStyle = '#05101f'; ctx.fillRect(0, zY(1000), 480, 540 - zY(1000));
    T(240, 536, '(동해의 깊이는 약 2,000 m — 1,000 m까지만 보여요)', 12, '#9fb2c8');
    // 수온 색 칠하기
    ctx.save(); ctx.globalAlpha = 0.93; ctx.drawImage(getPaint(o.full), 0, SEA_Y0); ctx.restore();
    // 수면 파도
    ctx.fillStyle = '#4aa3df'; wavePath(0, 480, (x) => SEA_Y0 + (RM ? 0 : 1.6 * Math.sin(x * 0.05 + t * 1.8) + 1.1 * Math.sin(x * 0.12 - t * 2.4)), 4);
    ctx.lineTo(480, SEA_Y0 + 6); ctx.lineTo(0, SEA_Y0 + 6); ctx.closePath(); ctx.fill();
    drawRays(t);
    drawCreatures(t);
    drawRuler();
    if (!o.noShip) drawShip(t);
  }
  function drawColumn(t) {
    drawOcean(t, {});
    drawLegend();
    drawProbe(t);
    FX.draw(ctx);
    if (isNew('probe') && column_newT < 6) newRing(CABLE_X - 22, zY(C.z.value) - 26, 44, 56);
  }
  let column_newT = 0;
  function colDown(p) {
    const q = toScene(p);
    if (q.x < 0 || q.x > 480 || q.y < 50) return false;
    C.drag = true; C.off = zY(C.z.value) - q.y; C.off = clamp(C.off, -40, 40);
    colMove(p); hideHint();
    return true;
  }
  function colMove(p) {
    const q = toScene(p);
    C.zt = clamp((q.y + C.off - SEA_Y0) / PXM, 0, 1000);
  }
  function colUp() { C.drag = false; }
  function colSeries() {
    const pts = [];
    for (let i = 0; i <= 100; i++) if (C.meas[i]) pts.push([PF.east[2](i * 10), i * 10]);
    return pts;
  }
  GCFG.column = () => ({
    title: '📈 깊이–수온 그래프 (2월 동해)', xmin: 0, xmax: 14, xticks: [0, 4, 8, 12], yticks: [0, 200, 400, 600, 800, 1000], yunit: 'm', ymax: 1000, bubble: true,
    series: [{ pts: colSeries(), color: '#2563eb', width: 3.5, dots: true, dotR: 2.6, pen: C.count > 0, penPt: [PF.east[2](C.z.value), C.z.value], flash: C.sweep < 1 ? 1 - C.sweep : 0 }],
    legend: [{ color: '#2563eb', text: '2월 동해 측정값' }], note: '단순화한 대표값',
  });

  /* =========================================================
     장면 ② · 연직 수온 분포 실험 (lab) : 수조 + 적외선등 + 선풍기
     1차원 열 모형 (0.25 cm 칸 48개, 시간 ×30)
     ========================================================= */
  const TANK = { x: 70, y: 150, w: 320, h: 320, wy: 170 };        // 물 표면 y=170, 12 cm = 300 px
  const SENS = [0, 2, 4, 6, 8, 10, 12];
  const LAB = {
    N: 48, Tc: new Float64Array(48).fill(20), D: 0, wind: 0, lamp: false, simT: 0, heatT: 0, windUsed: new Set(), fanA: 0, fill: 1, pourT: 1,
    rec: { A: null, B: null, C: null }, freeze: false, parts: [], led: SENS.map(() => ({ v: '', f: 0, last: -9 })), windNew: 0, windShown: false, lampK: 0, flashRec: { A: 0, B: 0, C: 0 }, extC: 0, extShown: false,
  };
  (function initParts() {
    const r = mulberry(55);
    for (let i = 0; i < 40; i++) LAB.parts.push({ x: 0.4 + r() * 12, z: 0.3 + r() * 11.4, c: ['#a855f7', '#ef4444', '#22c55e', '#3b82f6'][i % 4], jit: r() * 6 });
  })();
  function labNewWater(animated) {
    LAB.freeze = false; LAB.Tc.fill(20); LAB.D = 0; LAB.simT = 0; LAB.heatT = 0; LAB.windUsed.clear(); LAB.lamp = false; LAB.wind = 0;
    LAB.fill = animated && !RM ? 0 : 1; LAB.pourT = animated && !RM ? 0 : 1;
    syncLabUI();
  }
  function labClearRecords() { LAB.rec = { A: null, B: null, C: null }; LAB.extC = 0; LAB.extShown = false; }
  function labTempAt(zcm) {
    const f = zcm / 0.25 - 0.5, i = clamp(Math.floor(f), 0, LAB.N - 2), u = clamp(f - i, 0, 1);
    return LAB.Tc[i] * (1 - u) + LAB.Tc[i + 1] * u;
  }
  function labProfile() { return SENS.map((z) => labTempAt(z)); }
  function labStep(simDt) {
    const N = LAB.N, dz = 0.25, kap = new Float64Array(N), Tn = new Float64Array(N);
    const Dt = [0, 3, 6][LAB.wind];
    let left = simDt;
    while (left > 1e-9) {
      const dt = Math.min(0.04, left); left -= dt;
      LAB.D += (Dt - LAB.D) * (1 - Math.exp(-dt / 60));
      for (let i = 0; i < N; i++) {
        const z = (i + 0.5) * dz;
        kap[i] = 0.003 + (LAB.wind ? 0.6 / (1 + Math.exp((z - LAB.D) / 0.25)) : 0);
      }
      for (let i = 0; i < N; i++) {
        const z = (i + 0.5) * dz;
        let q = LAB.lamp ? (3.4 / 60) * Math.exp(-z / 0.6) : 0;
        const up = i > 0 ? (LAB.Tc[i - 1] - LAB.Tc[i]) * 0.5 * (kap[i - 1] + kap[i]) : 0;
        const dn = i < N - 1 ? (LAB.Tc[i + 1] - LAB.Tc[i]) * 0.5 * (kap[i + 1] + kap[i]) : 0;
        q += (up + dn) / (dz * dz);
        if (i === 0) q -= (0.002 + 0.004 * LAB.wind) * (LAB.Tc[0] - 20);
        Tn[i] = LAB.Tc[i] + q * dt;
      }
      for (let i = 0; i < N; i++) LAB.Tc[i] = Tn[i];
    }
  }
  function updateLab(dt, t) {
    if (LAB.pourT < 1) { LAB.pourT = Math.min(1, LAB.pourT + dt / 0.6); LAB.fill = EA.outCubic(LAB.pourT); }
    else if (SCENE === 'lab' && !LAB.freeze) {
      const sd = dt * 30;
      if (LAB.lamp) LAB.windUsed.add(LAB.wind);
      labStep(sd);
      LAB.simT += sd; if (LAB.lamp) LAB.heatT += sd;
    }
    LAB.fanA += dt * [0, 7, 15][LAB.wind];
    LAB.lampK = approach(LAB.lampK, LAB.lamp ? 1 : 0, dt, 6);
    // 물감 알갱이: 혼합 깊이 안에서만 소용돌이
    const Dm = LAB.D;
    LAB.parts.forEach((p) => {
      if (Dm < 0.4) { p.x += Math.sin(t * 0.7 + p.jit) * 0.004; return; }
      const Lc = Math.max(Dm * 1.3, 1.6), amp = [0, 0.5, 0.9][LAB.wind];
      const k = Math.exp(-Math.max(0, p.z - Dm) * 1.2);
      if (k < 0.05) return;
      const u = amp * (Math.PI / Dm) * Math.sin(Math.PI * p.x / Lc) * Math.cos(Math.PI * p.z / Dm) * Dm * 0.6;
      const w = -amp * (Math.PI / Lc) * Math.cos(Math.PI * p.x / Lc) * Math.sin(Math.PI * p.z / Dm) * Dm * 0.6;
      p.x += u * dt * k * 2.2; p.z += w * dt * k * 2.2;
      p.x = clamp(p.x, 0.3, 12.4); p.z = clamp(p.z, 0.2, 11.8);
    });
    LAB.flashRec.A = Math.max(0, LAB.flashRec.A - dt * 1.6); LAB.flashRec.B = Math.max(0, LAB.flashRec.B - dt * 1.6); LAB.flashRec.C = Math.max(0, LAB.flashRec.C - dt * 1.6);
    if (LAB.windNew > 0) LAB.windNew -= dt;
    if (LAB.extShown) LAB.extC = Math.min(1, LAB.extC + dt / 0.8);
  }
  function drawFan(x, y, t) {
    const w = LAB.wind;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(x + 8, 458, 30, 10, 0, 0, 6.283); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x + 4, y + 22, 8, 432 - y - 22 + 6);
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x + 8, y, 26, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 8, y, 26, 0, 6.283); ctx.stroke();
    ctx.save(); ctx.translate(x + 8, y);
    for (let g = 0; g < (w ? 2 : 1); g++) {
      ctx.save(); ctx.rotate(LAB.fanA - g * 0.4); ctx.globalAlpha = g ? 0.28 : 1;
      for (let b = 0; b < 3; b++) { ctx.rotate(2.0944); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(0, -12, 6.5, 13, 0, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.283); ctx.arc(0, 0, 21, 0, 6.283); ctx.stroke();
    ctx.restore(); ctx.restore();
    if (LAB.windNew > 0 && windVisible()) newRing(x - 18, y - 30, 52, 60);
  }
  function drawLamp(t) {
    const k = LAB.lampK, cx = 230;
    ctx.save();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 52); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.fillRect(cx - 14, 0, 28, 8);
    if (k > 0.02) {
      // 빛 원뿔
      const g = ctx.createLinearGradient(0, 100, 0, TANK.wy);
      g.addColorStop(0, 'rgba(255,170,60,' + 0.4 * k + ')'); g.addColorStop(1, 'rgba(255,200,90,' + 0.12 * k + ')');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 34, 98); ctx.lineTo(cx + 34, 98); ctx.lineTo(cx + 125, TANK.wy); ctx.lineTo(cx - 125, TANK.wy); ctx.closePath(); ctx.fill();
    }
    D.shadow(() => { ctx.fillStyle = grad(0, 50, 0, 96, [[0, '#d1d5db'], [1, '#6b7280']]); ctx.beginPath(); ctx.moveTo(cx - 20, 52); ctx.lineTo(cx + 20, 52); ctx.lineTo(cx + 46, 94); ctx.lineTo(cx - 46, 94); ctx.closePath(); ctx.fill(); }, { blur: 5, y: 3 });
    ctx.fillStyle = mixC('#9ca3af', '#fb923c', k); ctx.beginPath(); ctx.ellipse(cx, 97, 34, 8, 0, 0, 6.283); ctx.fill();
    if (k > 0.02) { D.glow(cx, 100, 70, '#ff9a2e', 0.65 * k); ctx.fillStyle = 'rgba(255,230,160,' + k + ')'; ctx.beginPath(); ctx.arc(cx, 100, 8, 0, 6.283); ctx.fill(); }
    ctx.restore();
    // 아지랑이
    if (k > 0.3 && !RM) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + 0.45 * k + ')'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const x0 = cx - 70 + i * 70, ph = (t * 0.8 + i * 0.33) % 1; wavePath(x0 - 18, x0 + 18, (x) => 166 - ph * 18 + 3 * Math.sin((x - x0) * 0.25 + t * 4), 3); ctx.globalAlpha = 1 - ph; ctx.stroke(); }
      ctx.restore();
    }
    if (isNew('lamp') && labNewT < 6) newRing(cx - 50, 50, 100, 52);
  }
  let labNewT = 0;
  function windVisible() { return LAB.windShown; }
  function drawTank(t) {
    const { x, y, w, h, wy } = TANK;
    // 실험대
    ctx.fillStyle = grad(0, 468, 0, 540, [[0, '#b98551'], [1, '#8a5a2b']]); ctx.fillRect(0, 468, 480, 72);
    ctx.strokeStyle = 'rgba(70,40,15,.25)'; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 480 + i * 14); ctx.bezierCurveTo(120, 476 + i * 14, 300, 488 + i * 14, 480, 482 + i * 14); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + w / 2, 474, w * 0.55, 8, 0, 0, 6.283); ctx.fill();
    // 벽
    // (장면 배경은 drawLab 에서 먼저 칠함)
    // 물 (칸마다 수온 색)
    const level = LAB.fill;
    const wTop = y + 20 + 300 * (1 - level);
    ctx.save();
    rr(x + 4, y, w - 8, h - 4, 6); ctx.clip();
    if (level > 0.01) {
      const g = ctx.createLinearGradient(0, TANK.wy, 0, TANK.wy + 300);
      for (let i = 0; i < LAB.N; i++) g.addColorStop((i + 0.5) / LAB.N, labColor(LAB.Tc[i]));
      g.addColorStop(0, labColor(LAB.Tc[0])); g.addColorStop(1, labColor(LAB.Tc[LAB.N - 1]));
      const A = [0.6, 1.4, 2.8][LAB.wind] * (RM ? 0.3 : 1);
      ctx.beginPath();
      for (let xx = x + 4; xx <= x + w - 4; xx += 4) { const yy = wTop + A * Math.sin(xx * 0.09 - t * (2 + LAB.wind * 2)) + (LAB.wind ? 0.6 * Math.sin(xx * 0.21 - t * 5) : 0); xx === x + 4 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
      ctx.lineTo(x + w - 4, y + h); ctx.lineTo(x + 4, y + h); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let xx = x + 4; xx <= x + w - 4; xx += 4) { const yy = wTop + A * Math.sin(xx * 0.09 - t * (2 + LAB.wind * 2)) + 0.5; xx === x + 4 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
      ctx.stroke();
      // 물감 알갱이
      LAB.parts.forEach((p) => {
        const px = x + 8 + p.x * 25, py = TANK.wy + p.z * 25;
        if (py < wTop) return;
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke();
      });
      // 혼합 깊이 표시
      if (LAB.D > 0.6) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + 6, TANK.wy + LAB.D * 25); ctx.lineTo(x + w - 6, TANK.wy + LAB.D * 25); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
    // 유리
    rr(x, y, w, h, 8); ctx.strokeStyle = 'rgba(110,140,175,.95)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = grad(x + 6, 0, x + 22, 0, [[0, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x + 6, y + 16, 16, h - 36);
    // 센서 막대와 디지털 칩
    const sx = 345;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, y - 14); ctx.lineTo(sx, y + h - 6); ctx.stroke();
    ctx.fillStyle = '#334155'; rr(sx - 8, y - 20, 16, 12, 4); ctx.fill();
    SENS.forEach((z, i) => {
      const yy = TANK.wy + z * 25 - (z === 12 ? 4 : 0);
      const Tv = labTempAt(z);
      const txt = Tv.toFixed(1);
      const L = LAB.led[i];
      if (txt !== L.v) { if (t - L.last > 0.45) L.f = 0.15; L.v = txt; L.last = t; }
      if (L.f > 0) L.f = Math.max(0, L.f - 0.016);
      D.sphere(sx, yy, 4.6, '#f97316', { gloss: false });
      ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx + 5, yy); ctx.lineTo(401, yy); ctx.stroke();
      rr(401, yy - 11, 72, 22, 6); ctx.fillStyle = '#05080f'; ctx.fill();
      ctx.save(); ctx.font = 'bold ' + fz(14) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = L.f > 0 ? '#e2ffe9' : '#4ade80'; ctx.fillText(txt, 449, yy + 1);
      ctx.fillStyle = '#86efac'; ctx.font = 'bold ' + fz(11) + 'px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('℃', 452, yy + 1); ctx.restore();
      T(x + w + 2 - 14, yy - 14, '', 1);
    });
    // 깊이 눈금 (왼쪽 안쪽)
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2;
    SENS.forEach((z) => { const yy = TANK.wy + z * 25; ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + 12, yy); ctx.stroke(); });
    ctx.restore();
    T(x + 24, TANK.wy + 16, '0 cm', 12, '#0b3a82', { align: 'left', stroke: 'rgba(255,255,255,.6)', strokeWidth: 3 });
    T(x + 24, TANK.wy + 25 * 12 - 8, '12 cm', 12, '#0b3a82', { align: 'left', stroke: 'rgba(255,255,255,.6)', strokeWidth: 3 });
    // 새 물을 붓는 연출
    if (LAB.pourT < 1) {
      ctx.save(); ctx.strokeStyle = '#6cc3f0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(300, 100); ctx.lineTo(300, wTop); ctx.stroke();
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(280, 70); ctx.lineTo(330, 60); ctx.lineTo(322, 100); ctx.lineTo(294, 102); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  function drawWindStreaks(t) {
    if (!LAB.wind) return;
    ctx.save(); ctx.beginPath(); ctx.rect(TANK.x + 6, TANK.y + 2, TANK.w - 12, 22); ctx.clip();
    const sp = LAB.wind === 1 ? 150 : 280;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const len = 34 + i * 6, base = ((t * sp + i * 83) % (TANK.w + 100)) - 50, y = TANK.y + 6 + i * 3.4;
      ctx.beginPath(); ctx.moveTo(TANK.x + base, y); ctx.lineTo(TANK.x + base + len, y); ctx.stroke();
    }
    ctx.restore();
    // 수조 왼쪽 밖에서 불어오는 바람 줄
    ctx.save(); ctx.strokeStyle = 'rgba(100,130,170,.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const bx = 52 + ((t * sp * 0.3 + i * 8) % 18); ctx.beginPath(); ctx.moveTo(bx, 158 + i * 7); ctx.lineTo(bx + 14, 158 + i * 7); ctx.stroke(); }
    ctx.restore();
  }
  function drawLab(t) {
    ctx.fillStyle = grad(0, 0, 0, 470, [[0, '#f3ece0'], [1, '#e4d8c4']]); ctx.fillRect(0, 0, 480, 470);
    // 벽 타일 느낌의 은은한 줄
    ctx.strokeStyle = 'rgba(120,100,70,.07)'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, i * 80); ctx.lineTo(480, i * 80); ctx.stroke(); }
    drawLamp(t);
    drawFan(18, 168, t);
    drawTank(t);
    drawWindStreaks(t);
    // 타이머와 배속
    const sec = Math.floor(LAB.simT), mm = Math.floor(sec / 60), ss = sec % 60;
    rr(TANK.x, 112, 118, 26, 8); ctx.fillStyle = 'rgba(8,15,30,.88)'; ctx.fill();
    ctx.save(); ctx.font = 'bold ' + fz(14) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.fillStyle = '#fde68a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('⏱ ' + mm + '분 ' + String(ss).padStart(2, '0') + '초', TANK.x + 8, 126); ctx.restore();
    pill(TANK.x + 154, 125, '⏩ ×30', '#d97706', '#fff', 13);
    if (LAB.lamp) { const hm = Math.floor(LAB.heatT / 60), hs = Math.floor(LAB.heatT % 60); pill(TANK.x + 250, 125, '가열 ' + hm + '분 ' + String(hs).padStart(2, '0') + '초', '#b45309', '#fff', 13); }
    if (LAB.heatT >= 600 && LAB.lamp) { const a = 0.75 + 0.25 * Math.sin(t * 6); ctx.save(); ctx.globalAlpha = a; pill(TANK.x + 160, 100, '✔ 10분 가열! 📍 결과 기록을 눌러요', '#15803d', '#fff', 13); ctx.restore(); }
    FX.draw(ctx);
  }
  // 그래프(실험)
  GCFG.lab = () => {
    const series = [];
    const rec = LAB.rec;
    const defs = [['A', '#f97316', 'A 등만'], ['B', '#14b8a6', 'B 등+약한 바람'], ['C', '#8b5cf6', 'C 등+강한 바람']];
    defs.forEach(([k, col]) => {
      if (rec[k]) series.push({ pts: rec[k].prof.map((v, i) => [v, SENS[i]]), color: col, width: 3, dots: true, dotR: 3.2, flash: LAB.flashRec[k] });
    });
    if (LAB.extShown && !rec.C) series.push({ pts: EXT_C.map((v, i) => [v, SENS[i]]), color: '#8b5cf6', width: 3, dash: [7, 6], dots: true, dotR: 3.2, upTo: 1 + LAB.extC * 6.0, frac: (LAB.extC * 6.0) % 1 });
    if (!LAB.freeze) series.push({ pts: labProfile().map((v, i) => [v, SENS[i]]), color: '#0f172a', width: 5, dots: true, dotR: 4.2 });
    return {
      title: '📈 깊이–수온 그래프 (수조)', xmin: 18, xmax: 32, xticks: [18, 20, 24, 28, 32], yticks: [0, 2, 4, 6, 8, 10, 12], yunit: 'cm', ymax: 12,
      series, legend: (LAB.freeze ? [] : [{ color: '#0f172a', text: '지금' }]).concat([{ color: '#f97316', text: 'A 등만', on: !!rec.A }, { color: '#14b8a6', text: 'B 등+약한 바람', on: !!rec.B }, { color: '#8b5cf6', text: 'C 등+강한 바람' + (!rec.C && LAB.extShown ? '(다른 모둠)' : ''), on: !!rec.C || LAB.extShown }]),
    };
  };
  const EXT_C = [22.3, 22.3, 22.2, 22.2, 21.1, 20.1, 20.0];
  /* ----- 조작(HTML) ----- */
  function syncLabUI() {
    const lb = $('#lampBtn'); lb.textContent = LAB.lamp ? '💡 적외선등 끄기' : '💡 적외선등 켜기'; lb.classList.toggle('tgl-on', LAB.lamp);
    $$('#windSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.w === LAB.wind));
  }
  $('#lampBtn').addEventListener('click', () => { LAB.lamp = !LAB.lamp; Sound.click(); syncLabUI(); });
  $$('#windSeg button').forEach((b) => b.addEventListener('click', () => { LAB.wind = +b.dataset.w; if (LAB.heatT < 90) LAB.windUsed.clear(); Sound.click(); syncLabUI(); }));   // 켠 직후(실제 3초 이내)에 바람을 고른 건 처음부터 그 조건으로 쳐요
  const REC_NAME = { 0: 'A', 1: 'B', 2: 'C' };
  function validRecord() {
    if (!LAB.lamp) return '💡 적외선등을 켜고 가열한 뒤에 기록해요.';
    if (LAB.heatT < 20) return '⏱ 조금 더 가열한 뒤에 기록해요.';
    if (LAB.windUsed.size > 1) return '🌬️ 중간에 바람 세기를 바꾼 물이에요. ↺로 새 물을 만들어 한 가지 조건으로 실험해요.';
    return true;
  }
  function doRecord() {
    if (SCENE !== 'lab') return;
    const ok = validRecord();
    if (ok !== true) { toast(ok, null, 2800); Sound.fail(); return; }
    const k = REC_NAME[LAB.wind];
    LAB.rec[k] = { prof: labProfile(), heat: LAB.heatT, wind: LAB.wind };
    LAB.flashRec[k] = 1; Sound.success();
    toast('📍 조건 ' + k + ' 결과를 기록했어요 (' + Math.floor(LAB.heatT / 60) + '분 ' + Math.floor(LAB.heatT % 60) + '초 가열)', null, 2200);
  }
  $('#recBtn').addEventListener('click', doRecord);
  function labRecOk(k) { const r = LAB.rec[k]; return !!(r && r.heat >= 600 - 1e-6 && r.wind === { A: 0, B: 1, C: 2 }[k]); }

  /* =========================================================
     장면 ③ · 해수의 층상 구조 (layers) : 이름표 붙이기 + 물 덩어리 실험
     ========================================================= */
  const BANDS = [
    { k: 'mixed', z0: 0, z1: 100, name: '혼합층', emoji: '🌬️', color: '#10b981', fb: '혼합층은 수온이 거의 일정한 맨 위층이에요.' },
    { k: 'thermo', z0: 100, z1: 300, name: '수온 약층', emoji: '📉', color: '#f59e0b', fb: '수온 약층은 깊이에 따라 수온이 급격히 낮아지는 층이에요.' },
    { k: 'deep', z0: 300, z1: 1000, name: '심해층', emoji: '🌑', color: '#6366f1', fb: '심해층은 가장 깊고 차가우며 수온이 거의 변하지 않아요.' },
  ];
  const LY = { chips: [], placed: { mixed: false, thermo: false, deep: false }, glow: { mixed: 0, thermo: 0, deep: 0 }, dragChip: null, near: null, parcels: [], parcelOn: false, parcelK: 0, warmDone: false, coldDone: false, newT: 0, pk: null };
  const CHIP_W = 124, CHIP_H = 36;
  function chipHome(i) { return { x: 14 + i * 130, y: 20 }; }
  function layersReset() {
    LY.placed = { mixed: false, thermo: false, deep: false }; LY.dragChip = null; LY.near = null;
    LY.chips = BANDS.map((b, i) => { const h = chipHome(i); return { band: b, i, x: h.x, y: h.y, sx: new SciSim.Spring(h.x, { stiffness: 170, damping: 18 }), sy: new SciSim.Spring(h.y, { stiffness: 170, damping: 18 }), drag: false, lift: 0, tilt: 0, vx: 0, shake: 0, ring: 0, placed: false, off: { x: 0, y: 0 } }; });
    parcelsReset();
  }
  function parcelsReset() {
    LY.parcels = [
      { k: 'warm', x: 100, home: 150, z: 150, v: 0, T: 7.6, drag: false, lift: 0, rel: null, settle: 0, acc: 0, label: '7.6 ℃' },
      { k: 'cold', x: 176, home: 250, z: 250, v: 0, T: 2.2, drag: false, lift: 0, rel: null, settle: 0, acc: 0, label: '2.2 ℃' },
    ];
    LY.warmDone = false; LY.coldDone = false;
  }
  layersReset();
  function setLayersMode(m) {
    // m: 1 이름표, 2 물 덩어리, 3 퀴즈
    if (m === 1) { layersReset(); LY.parcelOn = false; }
    else {
      // 이름표는 모두 붙은 상태로
      LY.chips.forEach((c) => { const b = c.band; c.placed = true; LY.placed[b.k] = true; const q = chipPlacedPos(b); c.sx.value = c.sx.target = q.x; c.sy.value = c.sy.target = q.y; c.x = q.x; c.y = q.y; });
      if (m === 2) { parcelsReset(); LY.parcelOn = true; LY.parcelK = RM ? 1 : 0; }
      else if (m === 3) { LY.parcelOn = false; }
    }
    LY.newT = 0;
  }
  function chipPlacedPos(b) { return { x: 36, y: zY(b.z0) + 14 }; }
  function updateLayers(dt, t) {
    LY.parcelK = approach(LY.parcelK, LY.parcelOn ? 1 : 0, dt, 5);
    LY.newT += dt;
    // 가까운 띠 찾기 (이름표를 끌고 있을 때)
    let near = null;
    const c = LY.dragChip;
    if (c) {
      const cy = c.sy.value - 24;
      let best = 1e9;
      BANDS.forEach((b) => { const y0 = zY(b.z0), y1 = zY(b.z1); const d = cy < y0 ? y0 - cy : cy > y1 ? cy - y1 : 0; if (d < best) { best = d; near = b.k; } });
      if (best > 26) near = null;
    }
    LY.near = near;
    BANDS.forEach((b) => { LY.glow[b.k] = approach(LY.glow[b.k], near === b.k ? 1 : 0, dt, 12); });
    LY.chips.forEach((ch) => {
      ch.sx.update(dt); ch.sy.update(dt); ch.x = ch.sx.value; ch.y = ch.sy.value;
      ch.lift = approach(ch.lift, ch.drag ? 1 : 0, dt, 18);
      ch.tilt = approach(ch.tilt, ch.drag ? clamp(ch.vx * 0.012, -0.08, 0.08) : 0, dt, 12);
      ch.vx = approach(ch.vx, 0, dt, 10);
      if (ch.shake > 0) ch.shake = Math.max(0, ch.shake - dt);
      if (ch.ring > 0) ch.ring = Math.max(0, ch.ring - dt);
    });
    // 물 덩어리: 부력 모형 (화면 아래가 +, px 단위)
    const K = 90, cdamp = 2.0;
    LY.parcels.forEach((p) => {
      p.lift = approach(p.lift, p.drag ? 1 : 0, dt, 16);
      if (p.drag) { p.v = 0; return; }
      let y = zY(p.z), v = p.v;
      const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
      for (let i = 0; i < n; i++) {
        const zz = (y - SEA_Y0) / PXM;
        const Tenv = PF.east[2](clamp(zz, 0, 1000));
        const a = -K * (p.T - Tenv) - cdamp * v;
        p.acc = a;
        v = clamp(v + a * h, -600, 600); y += v * h;
      }
      p.v = v; p.z = clamp((y - SEA_Y0) / PXM, 0, 1000);
      // 제자리 복귀 판정 (놓을 때 40 m 이상 벗어났고, 이후 ±10 m 안에서 1초)
      if (p.rel && p.rel.ok) {
        if (Math.abs(p.z - p.home) <= 10) { p.settle += dt; if (p.settle >= 1) { if (p.k === 'warm') LY.warmDone = true; else LY.coldDone = true; } } else p.settle = 0;
      }
    });
  }
  function drawBandOverlay(b, t) {
    const y0 = zY(b.z0), y1 = zY(b.z1), g = LY.glow[b.k];
    ctx.save();
    ctx.setLineDash([7, 5]); ctx.strokeStyle = rgba(b.color, 0.55 + 0.45 * g); ctx.lineWidth = 2 + 2 * g;
    rr(30, y0 + 1, 244, y1 - y0 - 2, 8); ctx.fillStyle = rgba(b.color, LY.placed[b.k] ? 0.12 : 0.1 + 0.2 * g); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    if (g > 0.05) { const a = 0.5 + 0.5 * Math.sin(t * 7.5); ctx.strokeStyle = rgba('#ffffff', (0.35 + 0.5 * a) * g); ctx.lineWidth = 3; rr(27 - a * 2, y0 - a * 2, 250 + a * 4, y1 - y0 + a * 4, 10); ctx.stroke(); }
    ctx.restore();
    if (!LY.placed[b.k]) return;
    // 이름이 붙으면 특징 아이콘이 나타남
    if (b.k === 'mixed') {
      ctx.save(); ctx.beginPath(); ctx.rect(30, y0, 244, y1 - y0); ctx.clip();
      for (let i = 0; i < 12; i++) {
        const cx = 70 + (i % 6) * 38, cy = y0 + 18 + (i < 6 ? 0 : 20), a = (RM ? 0.4 : t * 2.2) * (i % 2 ? 1 : -1) + i;
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 11, cy + Math.sin(a) * 9, 2.6, 0, 6.283); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const cx = 90 + i * 70, cy = y0 + 30, a0 = (RM ? 0 : t * 2.4) + i; ctx.beginPath(); ctx.arc(cx, cy, 13, a0, a0 + 4.2); ctx.stroke(); const ex = cx + Math.cos(a0 + 4.2) * 13, ey = cy + Math.sin(a0 + 4.2) * 13; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 6.283); ctx.fill(); }
      ctx.restore();
      pill(210, y0 + 17, '바람에 섞여요', 'rgba(5,95,70,.85)', '#fff', 13);
    } else if (b.k === 'thermo') {
      ctx.font = D.font(26, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('⚖️', 244, y0 + 100);
      pill(172, y0 + 44, '위: 따뜻하고 가벼워요', 'rgba(180,83,9,.88)', '#fff', 13);
      pill(172, y0 + 160, '아래: 차갑고 무거워요', 'rgba(30,64,175,.88)', '#fff', 13);
    } else {
      ctx.fillStyle = 'rgba(0,0,25,.35)'; rr(30, y0 + 1, 244, y1 - y0 - 2, 8); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(210,225,255,.35)'; ctx.beginPath(); ctx.arc(60 + i * 40, y0 + 120 + (i % 3) * 60, 1.6, 0, 6.283); ctx.fill(); }
      pill(152, y0 + 80, '햇빛이 닿지 않는 어둡고 고요한 곳', 'rgba(49,46,129,.88)', '#fff', 13);
      T(152, y0 + 108, '수온이 낮고 거의 변하지 않아요', 13, '#c7d2fe');
    }
  }
  function drawChipL(c) {
    const b = c.band, w = c.placed ? 88 : CHIP_W, h = c.placed ? 26 : CHIP_H;
    const shk = c.shake > 0 ? Math.sin(c.shake * 60) * 6 * (c.shake / 0.3) : 0;
    ctx.save();
    ctx.translate(c.x + w / 2 + shk, c.y + h / 2 - 24 * c.lift); ctx.rotate(c.tilt); ctx.scale(1 + 0.06 * c.lift, 1 + 0.06 * c.lift);
    if (c.ring > 0) { const k = 1 - c.ring / 0.5; ctx.strokeStyle = 'rgba(22,163,74,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 14 + 40 * k, 0, 6.283); ctx.stroke(); }
    D.shadow(() => { rr(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 5 + 10 * c.lift, y: 2 + 5 * c.lift });
    rr(-w / 2, -h / 2, w, h, h / 2); ctx.strokeStyle = c.placed ? '#16a34a' : b.color; ctx.lineWidth = 2.5; ctx.stroke();
    D.text(0, 5, b.emoji + ' ' + b.name, { size: fz(14), color: '#1b2333', weight: 800 });
    ctx.restore();
  }
  function drawParcel(p, t) {
    const y = zY(p.z), x = p.x + (p.z < 100 && !p.drag ? Math.sin(t * 7) * 3 : 0);
    const moving = Math.abs(p.z - p.home) > 6 || Math.abs(p.v) > 10;
    ctx.save(); ctx.globalAlpha = LY.parcelK;
    const lift = p.lift;
    ctx.translate(x, y - 22 * lift);
    ctx.scale(1 + 0.08 * lift, 1 + 0.08 * lift);
    D.glow(0, 0, 30, tempColor(p.T), 0.45);
    D.sphere(0, 0, 16, tempColor(p.T), { shadow: true });
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2 + 1.2 * Math.sin(t * 5); ctx.beginPath(); ctx.arc(0, 0, 17.5, 0, 6.283); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = LY.parcelK;
    pill(x, y - 22 * lift + 30, p.label, 'rgba(8,15,30,.85)', '#fff', 13);
    if (moving && !p.drag) {
      const up = p.acc < 0;
      const txt = up ? '↑ 주변보다 따뜻해서(가벼워서) 떠올라요' : '↓ 주변보다 차가워서(무거워서) 가라앉아요';
      pill(x + 24, y - 1, txt, up ? 'rgba(194,65,12,.92)' : 'rgba(30,64,175,.92)', '#fff', 13, { align: 'left' });
    }
    ctx.restore();
  }
  function drawLayers(t) {
    drawOcean(t, { full: true, noShip: true });
    BANDS.forEach((b) => drawBandOverlay(b, t));
    // 이름표
    LY.chips.forEach((c) => { if (!c.drag) drawChipL(c); });
    LY.chips.forEach((c) => { if (c.drag) drawChipL(c); });
    if (LY.parcelK > 0.01) LY.parcels.forEach((p) => drawParcel(p, t));
    if (LY.parcelOn && !LY.warmDone && LY.newT < 8) { /* 안내 */ }
    FX.draw(ctx);
    if (isNew('layers') && LY.newT < 6) newRing(14, 18, 392, 40);
    if (isNew('parcel') && LY.newT < 6 && LY.parcelOn) newRing(70, zY(150) - 24, 130, zY(250) - zY(150) + 48);
  }
  function layersDown(p) {
    const q = toScene(p);
    // 물 덩어리
    if (LY.parcelOn) for (const pc of LY.parcels) {
      if (Math.hypot(q.x - pc.x, q.y - zY(pc.z)) < 26) { pc.drag = true; pc.rel = null; pc.settle = 0; pc.v = 0; LY.dragP = pc; pc.off = zY(pc.z) - q.y; hideHint(); Sound.tick(); return true; }
    }
    for (let i = LY.chips.length - 1; i >= 0; i--) {
      const c = LY.chips[i]; if (c.placed) continue;
      if (q.x >= c.x && q.x <= c.x + CHIP_W && q.y >= c.y - 4 && q.y <= c.y + CHIP_H + 4) { c.drag = true; LY.dragChip = c; c.off = { x: c.x - q.x, y: c.y - q.y }; hideHint(); Sound.tick(); return true; }
    }
    return false;
  }
  function layersMove(p) {
    const q = toScene(p);
    if (LY.dragP) { const pc = LY.dragP; pc.z = clamp((q.y + clamp(pc.off, -30, 30) - SEA_Y0) / PXM, 0, 1000); pc.x = clamp(pc.x + 0, 40, 260); return; }
    const c = LY.dragChip; if (!c) return;
    const nx = q.x + c.off.x, ny = q.y + c.off.y;
    c.vx = nx - c.sx.target; c.sx.value = lerp(c.sx.value, nx, 0.6); c.sy.value = lerp(c.sy.value, ny, 0.6); c.sx.target = nx; c.sy.target = ny;
  }
  function layersUp() {
    if (LY.dragP) {
      const pc = LY.dragP; LY.dragP = null; pc.drag = false;
      const dz = pc.z - pc.home;
      pc.rel = { z: pc.z, ok: pc.k === 'warm' ? dz >= 40 : dz <= -40 };
      pc.settle = 0; pc.v = 0;
      return;
    }
    const c = LY.dragChip; if (!c) return;
    LY.dragChip = null; c.drag = false;
    const b = LY.near ? BANDS.find((x) => x.k === LY.near) : null;
    const h = chipHome(c.i);
    if (b) {
      if (b === c.band) {
        c.placed = true; LY.placed[b.k] = true; c.ring = 0.5;
        const q = chipPlacedPos(b); c.sx.target = q.x; c.sy.target = q.y;
        FX.burst(q.x + 44, q.y + 13, { count: 10, colors: ['#16a34a', '#facc15', '#38bdf8'], speed: 130, size: 3 });
        Sound.tick(); Sound.click();
      } else {
        c.shake = 0.3; c.sx.target = h.x; c.sy.target = h.y; Sound.fail();
        showHint(c.band.fb, 4200);
      }
    } else { c.sx.target = h.x; c.sy.target = h.y; }
  }
  GCFG.layers = () => {
    const pts = []; for (let z = 0; z <= 1000; z += 10) pts.push([PF.east[2](z), z]);
    const bands = BANDS.map((b) => ({ z0: b.z0, z1: b.z1, color: b.color, alpha: LY.placed[b.k] ? 0.2 : 0.09, label: LY.placed[b.k] ? b.name : '', glow: LY.glow[b.k] > 0.05 ? LY.glow[b.k] : 0 }));
    const markers = [];
    if (LY.parcelOn) LY.parcels.forEach((p) => markers.push({ T: p.T, z: p.z, color: tempColor(p.T), r: 6 }));
    return { title: '📈 깊이–수온 그래프 (2월 동해)', xmin: 0, xmax: 14, xticks: [0, 4, 8, 12], yticks: [0, 200, 400, 600, 800, 1000], yunit: 'm', ymax: 1000, series: [{ pts, color: '#2563eb', width: 3.5 }], bands, markers, legend: [{ color: '#2563eb', text: '2월 동해' }].concat(LY.parcelOn ? [{ color: '#f59e0b', text: '● 물 덩어리' }] : []), note: '단순화한 대표값' };
  };

  /* =========================================================
     장면 ④ · 우리나라 바다 지도 (map)
     ========================================================= */
  const MK = { x0: 22, y0: 64, kx: 24.5, ky: 30.5 };
  const mx = (lon) => MK.x0 + (lon - 117) * MK.kx, my = (lat) => MK.y0 + (43 - lat) * MK.ky;
  const LAND_MAIN = [[117, 43], [131.6, 43], [131.0, 42.6], [130.7, 42.3], [130.1, 42.0], [129.7, 41.3], [129.2, 40.8], [128.3, 40.3], [127.6, 39.8], [127.4, 39.2], [127.8, 38.9], [128.4, 38.6], [128.6, 38.2], [129.0, 37.7], [129.3, 37.2], [129.4, 36.6], [129.5, 36.0], [129.4, 35.5], [129.2, 35.2], [129.0, 35.1], [128.6, 35.0], [128.1, 34.9], [127.7, 34.75], [127.3, 34.6], [126.9, 34.4], [126.5, 34.3], [126.3, 34.6], [126.3, 35.0], [126.5, 35.4], [126.6, 35.8], [126.4, 36.1], [126.5, 36.5], [126.15, 36.8], [126.6, 37.0], [126.8, 37.2], [126.6, 37.45], [126.4, 37.75], [125.7, 37.7], [125.3, 38.0], [125.2, 38.6], [125.3, 39.0], [124.7, 39.5], [124.35, 39.95], [123.8, 39.8], [123.0, 39.7], [122.3, 39.5], [121.8, 39.1], [121.3, 38.9], [121.2, 39.4], [121.9, 40.0], [122.2, 40.4], [121.8, 40.9], [121.0, 40.7], [120.2, 40.0], [119.3, 39.4], [118.2, 39.2], [117.7, 38.9], [117.9, 38.3], [118.8, 37.8], [119.5, 37.2], [120.5, 37.8], [121.4, 37.55], [122.5, 37.4], [121.9, 36.9], [120.8, 36.5], [120.3, 36.0], [119.6, 35.3], [119.2, 34.8], [119.4, 34.5], [120.0, 33.5], [120.9, 32.6], [121.9, 31.8], [121.9, 31.1], [121.9, 30.6], [121.8, 30.0], [117, 30]];
  const LAND_ISLES = [
    [[129.7, 32.7], [129.9, 33.5], [130.6, 33.9], [131.5, 33.6], [131.9, 33.0], [131.5, 31.4], [130.7, 31.0], [130.2, 31.3], [129.9, 32.0]],
    [[130.9, 34.0], [131.7, 34.4], [132.6, 35.4], [133.5, 35.5], [134.5, 35.6], [135.0, 35.7], [135.0, 34.2], [133.5, 34.0], [132.2, 33.9], [131.5, 34.0]],
    [[132.0, 33.4], [132.5, 34.0], [133.5, 34.2], [134.5, 34.2], [134.7, 33.8], [134.2, 33.3], [133.0, 32.8], [132.5, 32.9]],
    [[126.15, 33.4], [126.5, 33.55], [126.95, 33.45], [126.8, 33.25], [126.4, 33.2]],
  ];
  const M = {
    sea: 'east', season: 2, seasonK: 0, zoom: new SciSim.Spring(1, { stiffness: 120, damping: 17 }), fx: new SciSim.Spring(0, { stiffness: 120, damping: 17 }), fy: new SciSim.Spring(0, { stiffness: 120, damping: 17 }),
    sx: new SciSim.Spring(0, { stiffness: 90, damping: 15 }), sy: new SciSim.Spring(0, { stiffness: 90, damping: 15 }), meas: {}, lockAug: false, autoDone: false, newT: 0, bg: null, arrows: [], ripple: 0, tagShown: false,
  };
  const pinPos = (sea) => ({ x: mx(SEAS[sea].lon), y: my(SEAS[sea].lat) });
  (function initMap() {
    const p = pinPos('east');
    M.fx.value = M.fx.target = p.x; M.fy.value = M.fy.target = p.y; M.zoom.value = M.zoom.target = 1.15; M.sx.value = M.sx.target = p.x; M.sy.value = M.sy.target = p.y - 4;
    for (let i = 0; i < 8; i++) M.arrows.push({ u: i / 8, v: (i * 0.37) % 1 });
  })();
  function buildMapBg() {
    return makeCache(480, 540, 2, (g, d) => {
      const poly = (pts) => { g.beginPath(); pts.forEach((q, i) => { const x = mx(q[0]), y = my(q[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
      g.fillStyle = '#7fc7e6'; g.fillRect(0, 0, 480, 540);
      const radial = (cx, cy, r, c0, c1) => { const q = g.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q; g.fillRect(0, 0, 480, 540); };
      radial(mx(131.8), my(39.2), 190, 'rgba(10,50,120,.85)', 'rgba(10,50,120,0)');      // 동해(깊음)
      radial(mx(123.6), my(36.0), 120, 'rgba(120,220,215,.75)', 'rgba(120,220,215,0)');   // 황해(얕음)
      radial(mx(127.6), my(33.0), 120, 'rgba(40,130,200,.55)', 'rgba(40,130,200,0)');      // 남해
      // 위경도 눈금
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
      for (let lon = 120; lon <= 135; lon += 5) { g.beginPath(); g.moveTo(mx(lon), my(43)); g.lineTo(mx(lon), my(30)); g.stroke(); d.text(mx(lon), my(30) + 14, lon + '°E', { size: 12, color: 'rgba(255,255,255,.9)', weight: 700 }); }
      for (let lat = 35; lat <= 40; lat += 5) { g.beginPath(); g.moveTo(mx(117), my(lat)); g.lineTo(mx(135), my(lat)); g.stroke(); d.text(mx(117) + 4, my(lat) - 4, lat + '°N', { size: 12, color: 'rgba(255,255,255,.9)', weight: 700, align: 'left' }); }
      // 땅
      const landFill = g.createLinearGradient(0, my(43), 0, my(30)); landFill.addColorStop(0, '#d9cfa4'); landFill.addColorStop(0.5, '#cbd79c'); landFill.addColorStop(1, '#a9cf8d');
      [LAND_MAIN].concat(LAND_ISLES).forEach((pts) => {
        g.save(); g.translate(2, 3); poly(pts); g.fillStyle = 'rgba(10,30,60,.22)'; g.fill(); g.restore();
        poly(pts); g.fillStyle = landFill; g.fill(); g.strokeStyle = '#8c8a62'; g.lineWidth = 1.4; g.stroke();
      });
      // 울릉도·독도, 바다 이름
      [[130.9, 37.5], [131.87, 37.24]].forEach((q) => { g.fillStyle = '#7aa05a'; g.beginPath(); g.arc(mx(q[0]), my(q[1]), 2.6, 0, 6.283); g.fill(); });
      d.text(mx(125.2), my(35.0) + 4, '황해', { size: 15, color: '#0b3a82', weight: 800, stroke: 'rgba(255,255,255,.6)', strokeWidth: 3 });
      d.text(mx(132.2), my(39.8), '동해', { size: 15, color: '#ffffff', weight: 800, stroke: 'rgba(5,30,80,.5)', strokeWidth: 3 });
      d.text(mx(128.6), my(32.4), '남해', { size: 15, color: '#ffffff', weight: 800, stroke: 'rgba(5,40,90,.5)', strokeWidth: 3 });
      d.text(mx(132.6), my(36.7), '울릉도·독도', { size: 12, color: '#ffffff', weight: 700, stroke: 'rgba(5,30,80,.5)', strokeWidth: 3 });
      d.text(mx(126.5), my(33.1) + 13, '제주도', { size: 12, color: '#0b3a82', weight: 700, stroke: 'rgba(255,255,255,.5)', strokeWidth: 3 });
      d.text(mx(127.4), my(37.7), '한반도', { size: 13, color: '#6b6a45', weight: 800 });
    });
  }
  const measKey = (sea, season) => sea + '-' + season;
  function startMeasure(sea, season, replay) {
    const k = measKey(sea, season);
    if (!M.meas[k] || replay) { M.meas[k] = { t: 0 }; Sound.tick(); }
  }
  function syncMapUI() {
    $$('#seaSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sea === M.sea));
    $$('#seasonSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.s === M.season));
  }
  function selectSea(sea, replay) {
    const same = M.sea === sea;
    M.sea = sea; const p = pinPos(sea);
    M.fx.target = p.x; M.fy.target = p.y; M.sx.target = p.x; M.sy.target = p.y - 4; M.ripple = 1;
    syncMapUI(); startMeasure(sea, M.season, same && replay);
  }
  function selectSeason(s, force) {
    if (M.lockAug && s === 8 && !force) { toast('먼저 아래 문제의 답을 골라 보세요. 그다음 8월을 확인할 수 있어요.', null, 2600); return; }
    M.season = s; syncMapUI(); startMeasure(M.sea, s, false);
  }
  $$('#seaSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); selectSea(b.dataset.sea, true); }));
  $$('#seasonSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); selectSeason(+b.dataset.s); }));
  function mapReset() { M.meas = {}; M.lockAug = false; M.autoDone = false; M.tagShown = false; M.sea = 'east'; M.season = 2; syncMapUI(); const p = pinPos('east'); M.fx.target = p.x; M.fy.target = p.y; M.sx.target = p.x; M.sy.target = p.y - 4; }
  function updateMap(dt, t) {
    M.zoom.target = 1.15; M.zoom.update(dt); M.fx.update(dt); M.fy.update(dt); M.sx.update(dt); M.sy.update(dt);
    M.seasonK = approach(M.seasonK, M.season === 8 ? 1 : 0, dt, 5);
    for (const k in M.meas) if (M.meas[k].t < 1) M.meas[k].t = Math.min(1, M.meas[k].t + dt / 1.2);
    M.ripple = Math.max(0, M.ripple - dt * 1.4);
    M.newT += dt;
    GST.ymax = approach(GST.ymax, SEAS[M.sea].zmax, dt, 9);
    if (Math.abs(GST.ymax - SEAS[M.sea].zmax) < 0.5) GST.ymax = SEAS[M.sea].zmax;
    // 바람 화살표
    M.arrows.forEach((a) => { a.u = (a.u + dt * (M.season === 8 ? 0.06 : 0.28) * (RM ? 0.3 : 1)) % 1; });
    // 정답 후 황해 8월을 자동으로 측정(1회)
    const cur = game && game.current();
    if (cur && cur._level === 3 && cur._index === 2 && game.phase === 'success' && !M.autoDone) {
      M.autoDone = true; M.lockAug = false; selectSea('west'); selectSeason(8, true);
    }
  }
  function drawMap(t) {
    if (!M.bg) M.bg = buildMapBg();
    ctx.fillStyle = '#7fc7e6'; ctx.fillRect(0, 0, 480, 540);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 480, 540); ctx.clip();
    const z = M.zoom.value, fx = M.fx.value, fy = M.fy.value;
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    ctx.drawImage(M.bg, 0, 0, 480, 540);
    const sk = M.seasonK;
    // 계절 분위기: 2월은 회청색, 8월은 따뜻한 빛
    ctx.fillStyle = 'rgba(100,120,150,' + 0.22 * (1 - sk) + ')'; ctx.fillRect(-60, -40, 600, 640);
    ctx.fillStyle = 'rgba(255,230,160,' + 0.1 * sk + ')'; ctx.fillRect(-60, -40, 600, 640);
    // 바다 표면: 2월 흰 물결, 8월 따뜻한 반짝임
    const r = mulberry(8);
    for (let i = 0; i < 46; i++) {
      const lon = 118 + r() * 17, lat = 30.5 + r() * 12, x = mx(lon), y = my(lat), ph = r() * 6;
      if (x < mx(121.5) && y > my(34)) continue;
      if (sk < 0.5) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - sk)) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 9, y + 2, 4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (!RM) D.spark(x, y, 3.2, t * 1.6 + ph, 'rgba(255,240,190,' + sk + ')');
    }
    // 바람 화살표
    ctx.save();
    M.arrows.forEach((a, i) => {
      if (sk < 0.98) {      // 2월: 북서 계절풍(길고 빠름)
        const sp = (a.u + i / 8) % 1, x = -50 + sp * 580, y = -150 + i * 72 + 0.62 * x;
        D.arrow(x, y, x + 50, y + 31, { color: 'rgba(255,255,255,' + (0.85 * (1 - sk)) + ')', width: 3, head: 9 });
      }
      if (sk > 0.02 && i < 4) {   // 8월: 약한 남풍 계열(짧고 느림)
        const bx = 60 + i * 110 + a.u * 60, by = 400 - i * 70 - a.u * 80;
        D.arrow(bx, by, bx + 14, by - 22, { color: 'rgba(255,248,210,' + (0.9 * sk) + ')', width: 3, head: 8 });
      }
    });
    ctx.restore();
    // 관측 정점
    ['east', 'west', 'south'].forEach((sea) => {
      const p = pinPos(sea), sel = sea === M.sea;
      const k = (t * 0.8 + (sea === 'east' ? 0 : sea === 'west' ? 0.3 : 0.6)) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 7 + k * 17, 0, 6.283); ctx.stroke();
      D.sphere(p.x, p.y, sel ? 8 : 6.5, sel ? '#ef4444' : '#f59e0b', { shadow: true });
      pill(p.x, p.y - 20, SEAS[sea].name, sel ? '#b91c1c' : '#92400e', '#fff', 13);
    });
    // 배와 측정기
    const bx = M.sx.value, by = M.sy.value;
    const cur = M.meas[measKey(M.sea, M.season)];
    ctx.save(); ctx.translate(bx, by + 14);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.lineTo(6, 3); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2464b'; ctx.fillRect(-9, -4, 18, 2.5); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-2, -10, 6, 6);
    if (cur && cur.t < 1) { ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-5, 3 + 22 * EA.inOutSine(cur.t)); ctx.stroke(); D.sphere(-5, 6 + 22 * EA.inOutSine(cur.t), 3.4, '#f97316', { gloss: false }); }
    ctx.restore();
    ctx.restore();
    // 계절 표시(확대와 상관없이 고정)
    const winter = M.season === 2;
    rr(10, 8, 300, 46, 12); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill();
    T(20, 28, winter ? '❄️ 2월 (겨울)' : '☀️ 8월 (여름)', 15, winter ? '#1e40af' : '#b91c1c', { align: 'left' });
    T(20, 46, winter ? '강한 북서 계절풍 · 약한 햇빛' : '약한 남풍 · 강한 햇빛', 13, '#334155', { align: 'left' });
    T(10, 526, '※ 단순화한 대표값 (국립수산과학원 정선 해양 관측 자료의 경향)', 12, '#0b3a82', { align: 'left' });
    if (isNew('map') && M.newT < 6) newRing(10, 8, 300, 46);
  }
  function mapDown(p) {
    const q = toScene(p), z = M.zoom.value, fx = M.fx.value, fy = M.fy.value;
    const mxp = fx + (q.x - fx) / z, myp = fy + (q.y - fy) / z;
    for (const sea of ['east', 'west', 'south']) {
      const pp = pinPos(sea);
      if (Math.hypot(mxp - pp.x, myp - pp.y) < 24) { Sound.click(); selectSea(sea, true); return false; }
    }
    return false;
  }
  GCFG.map = () => {
    const sea = M.sea, S = SEAS[sea];
    const dmax = RAW[sea][2][RAW[sea][2].length - 1][0];
    const series = [], legend = [];
    [[2, '#2563eb', '2월'], [8, '#ef4444', '8월']].forEach(([season, col, nm]) => {
      const m = M.meas[measKey(sea, season)];
      legend.push({ color: col, text: nm + ' ' + S.name, on: !!m });
      if (!m) return;
      const n = 61, pts = [];
      for (let i = 0; i < n; i++) { const z = dmax * i / (n - 1); pts.push([PF[sea][season](z), z]); }
      const up = 1 + m.t * (n - 1);
      series.push({ pts, color: col, width: 3.8, upTo: Math.floor(up), frac: up % 1, pen: m.t < 1, penPt: null });
      series[series.length - 1].penPt = (() => { const i = Math.min(n - 1, Math.floor(up)); return pts[i]; })();
    });
    const tags = [];
    const w8 = M.meas[measKey('west', 8)];
    if (sea === 'west' && w8 && w8.t >= 1) tags.push({ T: 8.3, z: 72, text: '황해 저층 냉수 약 8 ℃', color: '#1d4ed8' });
    return { title: '📈 ' + S.name + ' 깊이–수온 그래프', xmin: 0, xmax: 30, xticks: [0, 10, 20, 30], yticks: S.ticks, yunit: 'm', series, legend, tags, floorZ: S.floor, note: '단순화한 대표값' };
  };

  /* =========================================================
     입력 · 읽기값 · 장면 전환 · 게임(미션)
     ========================================================= */
  function bindHold(btn, dir) {
    const on = (e) => { if (SCENE !== 'column') return; C.hold = dir; hideHint(); try { btn.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } e.preventDefault(); };
    const off = () => { if (C.hold === dir) C.hold = 0; };
    btn.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'blur'].forEach((ev) => btn.addEventListener(ev, off));
    btn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { C.hold = dir; e.preventDefault(); } });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') off(); });
  }
  bindHold($('#downBtn'), 1); bindHold($('#upBtn'), -1);

  SciSim.pointer(view, {
    hover(p) {
      if (SCENE === 'column') return 'ns-resize';
      if (SCENE === 'map') { const q = toScene(p), z = M.zoom.value, fx = M.fx.value, fy = M.fy.value; const a = fx + (q.x - fx) / z, b = fy + (q.y - fy) / z; for (const sea of ['east', 'west', 'south']) { const pp = pinPos(sea); if (Math.hypot(a - pp.x, b - pp.y) < 24) return 'pointer'; } }
      return null;
    },
    down(p) {
      if (SCENE === 'column') return colDown(p);
      if (SCENE === 'layers') return layersDown(p);
      if (SCENE === 'map') return mapDown(p);
      return false;
    },
    move(p) { if (SCENE === 'column') colMove(p); else if (SCENE === 'layers') layersMove(p); },
    up(p) { if (SCENE === 'column') colUp(p); else if (SCENE === 'layers') layersUp(p); },
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (SCENE === 'column') { resetColumn(); }
    else if (SCENE === 'lab') { labNewWater(true); }
    else if (SCENE === 'layers') { const m = LY.parcelOn ? 2 : (LY.placed.mixed && LY.placed.thermo && LY.placed.deep ? 3 : 1); if (m === 1) setLayersMode(1); else parcelsReset(); }
    else if (SCENE === 'map') { if (!M.lockAug) mapReset(); }
  });

  const rd = { r1: $('#r1'), r2: $('#r2'), r3: $('#r3'), l1: $('#l1'), l2: $('#l2'), l3: $('#l3') };
  const rdLast = {};
  function setRd(k, v) { if (rdLast[k] !== v) { rdLast[k] = v; if (k[0] === 'l') rd[k].textContent = v; else rd[k].innerHTML = v; } }
  function updateReadouts() {
    if (SCENE === 'column') {
      const z = C.z.value;
      setRd('l1', '수심'); setRd('r1', Math.round(z) + '<small>m</small>');
      setRd('l2', '수온'); setRd('r2', PF.east[2](z).toFixed(1) + '<small>℃</small>');
      setRd('l3', '측정점'); setRd('r3', C.count + '<small>개</small>');
    } else if (SCENE === 'lab') {
      setRd('l1', '가열 시간'); setRd('r1', (LAB.heatT / 60).toFixed(1) + '<small>/ 10분</small>');
      setRd('l2', '0 cm 수온'); setRd('r2', labTempAt(0).toFixed(1) + '<small>℃</small>');
      setRd('l3', '6 cm 수온'); setRd('r3', labTempAt(6).toFixed(1) + '<small>℃</small>');
    } else if (SCENE === 'layers') {
      const n = BANDS.filter((b) => LY.placed[b.k]).length;
      setRd('l1', '붙인 이름표'); setRd('r1', n + '<small>/ 3</small>');
      setRd('l2', '따뜻한 덩어리'); setRd('r2', LY.parcelOn ? (LY.warmDone ? '✔' : '—') : '-');
      setRd('l3', '차가운 덩어리'); setRd('r3', LY.parcelOn ? (LY.coldDone ? '✔' : '—') : '-');
    } else {
      const m = M.meas[measKey(M.sea, M.season)];
      setRd('l1', '바다'); setRd('r1', SEAS[M.sea].name);
      setRd('l2', '계절'); setRd('r2', M.season + '월');
      setRd('l3', '표층 수온'); setRd('r3', m ? PF[M.sea][M.season](0).toFixed(1) + '<small>℃</small>' : '-');
    }
  }
  function setSceneUI() {
    $$('.cg').forEach((el) => {
      let hide = el.getAttribute('data-scene') !== SCENE;
      if (el.id === 'windGroup' && !LAB.windShown) hide = true;
      el.hidden = hide;
      if (el.parentElement && el.parentElement.classList.contains('control')) el.parentElement.style.display = hide ? 'none' : '';
    });
    $('#sceneName').textContent = SCENE_NAME[SCENE];
    $('#recNote').textContent = '가열 시간이 10분이 되면 기록해요. 위쪽 ↺는 새 물로 바꿔요.';
    hideHint();
  }
  function showWind(on, fresh) {
    if (LAB.windShown === on) return;
    LAB.windShown = on; setSceneUI();
    if (on && fresh) {
      const par = $('#windGroup').parentElement; par.classList.remove('feature-new'); void par.offsetWidth; par.classList.add('feature-new'); setTimeout(() => par.classList.remove('feature-new'), 4600);
      LAB.windNew = 6;
    }
  }

  /* ---------- 퀴즈 그림 ---------- */
  const miniG = (d) => '<svg viewBox="0 0 64 44" width="64" height="44" aria-hidden="true"><path d="M6 6H60M6 6V40" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="M58 3L61 6L58 9" fill="none" stroke="#94a3b8" stroke-width="1.5"/><path d="M3 38L6 41L9 38" fill="none" stroke="#94a3b8" stroke-width="1.5"/><path d="' + d + '" fill="none" stroke="#8b5cf6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const GCH = (d, text) => '<span class="gchoice">' + miniG(d) + '<span>' + text + '</span></span>';
  const SUM_FIG = '<div class="note-fig"><svg viewBox="0 0 150 90" width="210" role="img" aria-label="2월 동해 연직 수온 분포 요약 그래프"><rect width="150" height="90" fill="#f8fbff" rx="8"/><path d="M14 12H140M14 12V84" stroke="#94a3b8" stroke-width="1.5" fill="none"/><path d="M118 14V30L48 54V82" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="16" y="14" width="122" height="16" fill="#10b981" opacity=".15"/><rect x="16" y="30" width="122" height="24" fill="#f59e0b" opacity=".18"/><rect x="16" y="54" width="122" height="28" fill="#6366f1" opacity=".15"/><text x="20" y="25" font-size="9" fill="#065f46" font-weight="700">혼합층</text><text x="20" y="45" font-size="9" fill="#92400e" font-weight="700">수온 약층</text><text x="20" y="72" font-size="9" fill="#3730a3" font-weight="700">심해층</text></svg></div>';

  /* ---------- 게임 ---------- */
  game = SciSim.game({
    simId: 'm3-sea-temperature',
    mount: '#game',
    badge: '바다 온도 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      probe: '🌡️ 수온 측정기', graph: '📈 깊이–수온 그래프', lamp: '💡 적외선등(태양 역할)', wind: '🌬️ 바람(선풍기)', record: '📍 결과 기록·모둠 비교',
      layers: '🏷️ 층 이름표', parcel: '💧 물 덩어리 실험', map: '🗺️ 우리나라 바다 지도', season: '📅 계절 바꾸기(2월·8월)',
    },
    levels: [
      {
        title: '바다 깊이 수온 재기', short: '깊이와 수온', icon: '🚢', phase: '관찰',
        features: ['probe', 'graph'],
        intro: '<p class="si-q">❓ 탐구 질문: 바닷물은 깊이 들어갈수록 수온이 어떻게 변할까? 바다 전체가 표면처럼 따뜻할까?</p>' +
          '<p>2월 동해(울릉도 부근)에서 연구선이 <b>수온 측정기</b>를 바닷속으로 내려요. 깊이에 따라 수온이 어떻게 변하는지 관찰해 봐요.</p>',
        setup() { resetColumn(); },
        recap: '바닷물은 <b>표층이 가장 따뜻하고</b>, 깊어지면서 <b>급격히 차가워지다가</b>, 깊은 곳에서는 낮은 수온으로 거의 일정해요.',
        summary: '<ul><li>2월 동해: 표층(약 100 m까지) 약 11.5 ℃로 거의 일정</li><li>그 아래(약 100~300 m)에서 수온이 빠르게 낮아짐</li><li>약 300 m보다 깊은 곳은 1 ℃ 안팎으로 낮고 거의 변하지 않음</li></ul>' + SUM_FIG,
        missions: [
          {
            title: '측정기 내리기',
            goal: '측정기를 <b>1,000 m까지</b> 내리며 깊이에 따른 수온을 측정하세요.',
            hint: '⬇ 내리기 버튼을 누르고 있거나, 바다 속 측정기를 아래로 끌어요.',
            hold: 0.6,
            setup() { resetColumn(); column_newT = 0; GST.ymax = 1000; if (!GST.bubbleShown) { GST.bubble = 4; GST.bubbleShown = true; } setSceneUI(); showHint('⬇ 내리기를 누르거나 측정기를 아래로 끌어 보세요', 5000); },
            check: () => C.maxZ >= 995 && C.count >= 90,
            status: () => '수심 <b>' + Math.round(C.z.value) + ' m</b> / 1,000 m · 수온 <b>' + PF.east[2](C.z.value).toFixed(1) + ' ℃</b> · 측정점 <b>' + C.count + '</b>개',
            explain: '표층(약 100 m까지)은 수온이 약 11.5 ℃로 거의 같고, 그 아래에서 수온이 빠르게 낮아지다가, 약 300 m보다 깊은 곳은 <b>1 ℃ 안팎</b>으로 매우 차갑고 거의 변하지 않아요.',
          },
          {
            type: 'quiz', title: '그래프 모양 읽기',
            goal: '📈 측정 결과, 깊이에 따른 수온 변화 그래프의 모양으로 옳은 것은?<div class="mini-note">(그림: 위쪽 가로축은 수온 →, 왼쪽 세로축은 깊이 ↓)</div>',
            choices: [
              GCH('M52 8L14 38', '깊어질수록 수온이 일정하게(직선으로) 낮아진다'),
              GCH('M50 8V16L14 28V38', '표층은 거의 일정 → 그 아래에서 급격히 낮아짐 → 깊은 곳은 낮고 거의 일정'),
              GCH('M14 8L52 38', '깊어질수록 수온이 높아진다'),
              GCH('M36 8V38', '깊이에 관계없이 수온이 같다'),
            ],
            answer: 1,
            feedback: ['100 m까지는 어땠나요? 그래프의 위쪽 부분을 다시 보세요.', '', '깊은 곳으로 갈수록 그래프가 왼쪽(낮은 수온)으로 갔어요.', '표층은 약 11.5 ℃, 1,000 m는 약 0.3 ℃였어요.'],
            setup() { setSceneUI(); },
            explain: '표층 가까이는 수온이 거의 일정하고, 중간에서 급격히 낮아지며, 깊은 곳은 낮고 일정해요. 그런데 왜 표층만 따뜻하고, 왜 수온이 같은 층이 생길까요? 다음 단계에서 <b>실험</b>으로 알아봐요.',
          },
        ],
      },
      {
        title: '연직 수온 분포 실험', short: '수온 실험', icon: '🧪', phase: '실험',
        features: ['lamp', 'wind', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 표층은 따뜻하고 깊은 곳은 차가우며, 표층에 수온이 거의 같은 층이 있다는 것을 관찰했어요.</div>' +
          '<p>수조를 작은 바다라고 생각하고, <b>적외선등(태양)</b>과 <b>선풍기(바람)</b>로 이 모습을 만들어 봐요. 디지털 온도 센서 7개가 깊이 0~12 cm의 수온을 실시간으로 그래프에 그려요.</p>' +
          '<p class="mini-note">⚠️ 실제 실험에서 적외선등은 매우 뜨거우니 만지지 않고, 물이 튀지 않게 해요.</p>',
        setup() { labNewWater(false); labClearRecords(); LAB.windShown = false; },
        recap: '태양(적외선등)은 <b>표층만 데우고</b>, 바람은 위쪽 물을 <b>섞어</b> 수온이 일정한 층을 만들어요. 바람이 강할수록 그 층이 두꺼워져요.',
        summary: '<table class="cmp"><tr><th>10분 뒤 수온(℃)</th><th>0 cm</th><th>2 cm</th><th>4 cm</th><th>6 cm</th><th>8 cm</th></tr><tr><th>A 등만</th><td class="n">30.1</td><td class="n">23.7</td><td class="n">20.5</td><td class="n">20.0</td><td class="n">20.0</td></tr><tr><th>B 등+약한 바람</th><td class="n">23.6</td><td class="n">23.5</td><td class="n">23.3</td><td class="n">20.6</td><td class="n">20.0</td></tr><tr><th>C 등+강한 바람</th><td class="n">22.3</td><td class="n">22.3</td><td class="n">22.2</td><td class="n">22.2</td><td class="n">21.1</td></tr></table>' +
          '<ul><li>적외선등(태양)은 표면 가까이의 물만 데워요.</li><li>바람은 열을 더하지 않고 위쪽 물을 <b>섞어서</b> 수온이 일정한 층을 만들어요.</li><li>바람이 강할수록 수온이 일정한 층이 두꺼워져요.</li></ul>',
        missions: [
          {
            title: '등만 켜고 10분',
            goal: '💡 적외선등만 켜고 <b>10분</b> 동안 가열한 뒤 <b>📍 결과 기록</b>을 누르세요.',
            hint: '적외선등을 켜면 시간이 30배 빠르게 흘러요. 화면의 가열 시간이 10분이 되면 📍 결과 기록!',
            hold: 0.4,
            setup() { labNewWater(false); labClearRecords(); showWind(false); setSceneUI(); labNewT = 0; showHint('💡 적외선등을 켜고 ⏩ ×30 시간이 흐르는 것을 지켜봐요', 5000); },
            check: () => labRecOk('A'),
            status: () => '등 <b>' + (LAB.lamp ? '✔' : '—') + '</b> · 가열 <b>' + Math.min(10, LAB.heatT / 60).toFixed(1) + '</b>/10분 · 기록 <b>' + (labRecOk('A') ? '✔' : '—') + '</b>',
            explain: '표면 가까운 물만 크게 데워지고(약 30 ℃), 깊어질수록 수온이 빠르게 낮아져요. 6 cm보다 깊은 물은 처음 수온 그대로예요. 적외선등(태양)의 에너지는 대부분 <b>수면 가까이에서 흡수</b>되기 때문이에요.',
          },
          {
            title: '바람을 불게 하면?',
            goal: '새 물로 바꿨어요. 이번에는 적외선등을 켜고 바람을 <b>‘약’</b>으로 함께 불게 하여 10분 뒤 기록하세요.',
            hint: '🌬️ 바람을 ‘약’으로 고른 뒤 적외선등을 켜요. 중간에 바람 세기를 바꾸면 안 돼요.',
            hold: 0.4,
            setup() { labNewWater(true); showWind(true, true); setSceneUI(); showHint('🌬️ 바람(선풍기) 조작이 새로 생겼어요', 4500); },
            check: () => labRecOk('B'),
            status: () => '등 <b>' + (LAB.lamp ? '✔' : '—') + '</b> · 바람 <b>' + ['없음', '약', '강'][LAB.wind] + '</b> · 가열 <b>' + Math.min(10, LAB.heatT / 60).toFixed(1) + '</b>/10분 · 기록 <b>' + (labRecOk('B') ? '✔' : '—') + '</b>',
            explain: '바람이 수면을 휘저어 위쪽 물이 섞이면서, 표면부터 약 4 cm 깊이까지 <b>수온이 거의 같은 층</b>이 생겼어요. 실제 바다의 ‘수온이 일정한 층’도 이렇게 생겨요.',
          },
          {
            type: 'quiz', title: '모둠 결과 비교',
            goal: '세 조건의 결과를 비교해 보세요. 바람이 강할수록 표면부터 수온이 일정한 층의 두께는 어떻게 될까요?',
            choices: ['두꺼워진다', '얇아진다', '변하지 않는다', '바람이 불면 수온이 일정한 층이 사라진다'],
            answer: 0,
            feedback: ['', '보라 선(강한 바람)에서 수직으로 곧은 부분이 어디까지 이어지나요?', '세 선에서 수직으로 곧은 부분의 길이를 비교해 보세요.', '바람이 불 때 오히려 위쪽 수온이 같아졌어요.'],
            setup() {
              setSceneUI(); LAB.freeze = true; LAB.lamp = false; syncLabUI();
              if (!LAB.rec.A) LAB.rec.A = { prof: [30.1, 23.7, 20.5, 20.0, 20.0, 20.0, 20.0], heat: 600, wind: 0 };
              if (!LAB.rec.B) LAB.rec.B = { prof: [23.6, 23.5, 23.3, 20.6, 20.0, 20.0, 20.0], heat: 600, wind: 1 };
              if (!LAB.rec.C) { LAB.extShown = true; LAB.extC = 0; }
            },
            explain: '바람이 강할수록 더 깊이까지 섞여 수온이 일정한 층이 <b>두꺼워져요</b>(약 4 cm → 약 6 cm). 같은 양의 열이 더 많은 물에 퍼지므로 그 층의 수온은 조금 낮아져요. 가장 깊은 12 cm는 세 조건 모두 처음 수온 그대로였어요.',
          },
        ],
      },
      {
        title: '해수의 층상 구조', short: '층상 구조', icon: '🧩', phase: '설명',
        features: ['layers', 'parcel'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양은 표층을 데우고, 바람은 위쪽 물을 섞는다는 것을 실험으로 확인했어요.</div>' +
          '<p>다시 2월 동해의 측정 결과로 돌아와, 수온 분포에 따라 해수의 <b>층</b>을 나누고 각 층의 특징을 설명해 봐요. (대기권을 높이에 따른 기온 변화로 나눈 것과 같은 방법이에요.)</p>',
        setup() { setLayersMode(1); },
        recap: '해수는 수온 분포에 따라 <b>혼합층·수온 약층·심해층</b>으로 나뉘어요. 수온 약층은 매우 안정해 위아래 물이 잘 섞이지 않아요.',
        summary: '<table class="cmp"><tr><th>층</th><th>수온 분포</th><th>생기는 까닭·특징</th></tr><tr><th>🌬️ 혼합층</th><td>표층에서 수온이 거의 일정</td><td>태양 에너지로 데워지고 바람에 섞임</td></tr><tr><th>📉 수온 약층</th><td>깊어질수록 수온이 급격히 낮아짐</td><td>위는 따뜻하고 가벼운 물, 아래는 차갑고 무거운 물 → 매우 안정(잘 섞이지 않음)</td></tr><tr><th>🌑 심해층</th><td>수온이 낮고 거의 일정</td><td>햇빛이 닿지 않고, 위쪽 물과의 혼합이 막힘</td></tr></table><p class="mini-note">‘약(躍)’은 ‘뛰다’라는 뜻으로, 수온이 급격히 변한다는 뜻이에요.</p>',
        missions: [
          {
            title: '층에 이름 붙이기',
            goal: '이름표를 끌어 <b>혼합층·수온 약층·심해층</b>을 알맞은 깊이에 붙이세요.',
            hint: '그래프에서 수직으로 곧은 부분이 2곳, 비스듬한 부분이 1곳이에요.',
            hold: 0.4,
            setup() { setLayersMode(1); setSceneUI(); showHint('이름표를 끌어 알맞은 깊이의 띠 위에 놓아요', 4500); },
            check: () => BANDS.every((b) => LY.placed[b.k]),
            status: () => '붙인 이름표 <b>' + BANDS.filter((b) => LY.placed[b.k]).length + ' / 3</b>',
            explain: '<b>혼합층</b>은 태양 에너지로 데워지고 바람에 섞여 수온이 거의 일정해요. <b>수온 약층</b>은 깊어질수록 수온이 급격히 낮아지는 층, <b>심해층</b>은 햇빛이 닿지 않아 수온이 낮고 거의 일정한 층이에요.',
          },
          {
            title: '섞이지 않는 층',
            goal: '수온 약층의 <b>따뜻한 물 덩어리를 아래로</b>, <b>차가운 물 덩어리를 위로</b> 40 m 이상 옮겼다가 놓아 보세요. 어떻게 움직이나요?',
            hint: '덩어리를 끌어 놓으면 주변 물과 수온을 비교해서 움직여요. 따뜻한 덩어리는 150 m보다 아래로, 차가운 덩어리는 250 m보다 위로!',
            hold: 0.3,
            setup() { setLayersMode(2); setSceneUI(); showHint('💧 물 덩어리를 끌어 옮겼다가 놓아 보세요', 4500); },
            check: () => LY.warmDone && LY.coldDone,
            status: () => '따뜻한 덩어리 <b>' + (LY.warmDone ? '✔' : '—') + '</b> · 차가운 덩어리 <b>' + (LY.coldDone ? '✔' : '—') + '</b>',
            explain: '수온 약층에서는 위에 <b>따뜻하고 가벼운 물</b>, 아래에 <b>차갑고 무거운 물</b>이 있어요. 따뜻한 물을 아래로 내려도 다시 떠오르고, 찬물을 위로 올려도 다시 가라앉아요. 그래서 위아래 물이 잘 섞이지 않는 매우 안정한 층이 되어, 혼합층과 심해층 사이에서 물질과 에너지가 오가는 것을 막아요.',
          },
          {
            type: 'quiz', title: '심해층의 비밀',
            goal: '심해층의 수온이 낮고 계절이 바뀌어도 거의 변하지 않는 까닭으로 옳은 것은?',
            choices: ['햇빛(태양 에너지)이 닿지 않고, 수온 약층이 위쪽 물과의 혼합을 막기 때문', '깊은 곳은 수압이 커서 물이 차가워지기 때문', '심해층에는 빙하가 녹은 물만 모여 있기 때문', '깊은 바다에는 바람이 더 세게 불기 때문'],
            answer: 0,
            feedback: ['', '수압이 물을 차갑게 만드는 것은 아니에요.', '심해층의 물도 염류가 녹아 있는 해수예요.', '바람은 해수면에서만 불어요. 깊은 곳까지 섞지 못해요.'],
            setup() { setLayersMode(3); setSceneUI(); },
            explain: '태양 에너지는 표층에서 대부분 흡수되고, 바람의 혼합도 수온 약층 아래까지는 미치지 못해요. 그래서 심해층은 <b>1년 내내 차갑고 수온 변화가 거의 없어요</b>.',
          },
        ],
      },
      {
        title: '우리나라 바다의 계절별 수온', short: '우리 바다', icon: '🗺️', phase: '적용',
        features: ['map', 'season'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혼합층·수온 약층·심해층이 태양 에너지와 바람 때문에 생긴다는 것을 배웠어요.</div>' +
          '<p>계절이 바뀌면 햇빛의 세기와 바람이 달라져요. 동해·황해·남해의 <b>2월과 8월</b> 연직 수온 분포를 비교해 봐요.</p>' +
          '<p class="mini-note">실제 관측 자료: 국립수산과학원 한국해양자료센터(KODC) 정선 해양 관측, 국립해양조사원 바다누리 · 화면의 값은 경향을 단순화한 대표값이에요.</p>',
        setup() { mapReset(); },
        recap: '우리나라 바다는 여름에 <b>혼합층이 얇고 수온 약층이 뚜렷</b>하며, 겨울에는 바람과 냉각으로 혼합층이 두꺼워져요. 얕은 황해·남해는 겨울에 바닥까지 섞여요.',
        summary: '<table class="cmp"><tr><th></th><th>여름(8월)</th><th>겨울(2월)</th></tr><tr><th>표층 수온</th><td>높음(동해 약 25 ℃)</td><td>낮음(동해 약 11.6 ℃)</td></tr><tr><th>혼합층</th><td>얇음(약 10~20 m)</td><td>두꺼움(동해 약 100 m)</td></tr><tr><th>수온 약층</th><td>뚜렷함</td><td>약하거나 없음</td></tr></table>' +
          '<ul><li><b>동해</b>: 300 m보다 깊은 곳은 계절과 관계없이 약 1 ℃ 이하</li><li><b>황해</b>: 겨울에는 바닥까지 섞이고, 여름에는 수온 약층 아래에 차가운 물(저층 냉수, 약 8 ℃)이 남음</li><li><b>남해</b>: 겨울에는 바닥까지 약 13~14 ℃</li></ul>',
        missions: [
          {
            title: '동해의 2월과 8월',
            goal: '동해 정점에서 <b>2월과 8월</b>의 연직 수온 분포를 모두 측정해 비교하세요.',
            hint: '동해 정점(지도의 핀)을 누르면 측정해요. 계절을 바꾸면 다른 계절도 측정할 수 있어요.',
            hold: 0.4,
            setup() { mapReset(); setSceneUI(); showHint('지도의 동해 정점을 누르거나 동해 버튼을 눌러요', 5000); },
            check: () => { const a = M.meas['east-2'], b = M.meas['east-8']; return !!(a && b && a.t >= 1 && b.t >= 1); },
            status: () => { const a = M.meas['east-2'], b = M.meas['east-8']; return '동해 2월 <b>' + (a && a.t >= 1 ? '✔' : '—') + '</b> · 동해 8월 <b>' + (b && b.t >= 1 ? '✔' : '—') + '</b>'; },
            explain: '8월에는 표층 수온이 약 25 ℃로 높고 혼합층이 얇아(약 10~20 m) 그 바로 아래에 수온 약층이 뚜렷해요. 2월에는 혼합층이 약 100 m로 두꺼워요. 깊은 곳(300 m 아래)은 두 계절 모두 약 1 ℃ 이하로 같아요.',
          },
          {
            type: 'quiz', title: '계절에 따라 다른 까닭',
            goal: '여름(8월)에 혼합층이 얇고 수온 약층이 뚜렷해지는 까닭으로 옳은 것은?',
            choices: ['여름에는 바람이 약하고, 강한 햇빛이 표층만 데우기 때문', '여름에는 바람이 강해 깊은 곳까지 섞이기 때문', '여름에는 심해층의 물이 따뜻해지기 때문', '여름에는 바닷물이 증발해 바다가 얕아지기 때문'],
            answer: 0,
            feedback: ['', '바람이 강하면 혼합층이 어떻게 됐었나요? 2단계 실험을 떠올려 보세요.', '깊은 곳 수온은 두 계절이 거의 같았어요.', '증발로 바다 깊이가 눈에 띄게 변하지는 않아요.'],
            setup() { setSceneUI(); },
            explain: '겨울에는 강한 북서 계절풍이 불고, 표층이 식어 무거워진 물이 가라앉으며(대류) 아래 물과 섞여 혼합층이 두꺼워져요. 여름에는 바람이 약하고 표층이 강하게 데워져 <b>따뜻하고 가벼운 물이 위에 얇게</b> 쌓여요.',
          },
          {
            type: 'quiz', title: '여름 황해의 바닥은?',
            goal: '2월 황해는 표층부터 바닥까지 약 7 ℃로 거의 같아요. 그렇다면 <b>8월 황해의 바닥(약 70 m) 수온</b>은 얼마일까요?',
            choices: ['약 25 ℃ — 여름이니 바닥까지 표층처럼 따뜻하다', '약 8~10 ℃ — 겨울에 차가워진 물이 수온 약층 아래에 남아 있다', '0 ℃ 이하 — 바다 바닥은 항상 얼어 있다', '약 30 ℃ — 깊을수록 더 따뜻하다'],
            answer: 1,
            feedback: ['여름에는 수온 약층이 생겨 위아래 물이 잘 섞이지 않아요.', '', '바닷물은 바닥에서 얼어 있지 않아요. 2월 바닥 수온을 다시 보세요.', '깊을수록 햇빛이 닿지 않아요.'],
            setup() { mapReset(); M.lockAug = true; M.autoDone = false; selectSea('west'); setSceneUI(); },
            explain: '겨울에 바닥까지 차가워진 물이, 봄·여름에 생긴 수온 약층 아래에 갇혀 여름에도 차갑게 남아 있어요(<b>황해 저층 냉수</b>). 수온 약층이 위아래 물의 혼합을 막기 때문이에요.',
          },
        ],
      },
    ],
  });

  /* ---------- 메인 루프 ---------- */
  const UPDATE = { column: updateColumn, lab: updateLab, layers: updateLayers, map: updateMap };
  const DRAWERS = { column: drawColumn, lab: drawLab, layers: drawLayers, map: drawMap };
  function drawSceneClipped(name, t, alpha, zoomK) {
    ctx.save();
    ctx.translate(ST.x, ST.y); ctx.scale(ST.s, ST.s);
    ctx.beginPath(); ctx.rect(0, 0, 480, 540); ctx.clip();
    if (alpha != null) ctx.globalAlpha = alpha;
    if (zoomK && zoomK !== 1) { ctx.translate(240, 270); ctx.scale(zoomK, zoomK); ctx.translate(-240, -270); }
    DRAWERS[name](t);
    ctx.restore();
  }
  function gcfg(name) { const f = GCFG[name]; return f ? f() : null; }
  setSceneUI();
  SciSim.loop((dt, t) => { try { frame(dt, t); } catch (e) { console.error(e); } });
  function frame(dt, t) {
    const want = SCENE_BY_LEVEL[clamp(game.level, 0, 3)];
    if (want !== SCENE) { prevScene = SCENE; SCENE = want; trans = RM ? 1 : 0; setSceneUI(); if (SCENE === 'column') column_newT = 0; if (SCENE === 'lab') labNewT = 0; if (SCENE === 'map') { M.newT = 0; GST.ymax = SEAS[M.sea].zmax; } if (SCENE === 'layers' || SCENE === 'column') GST.ymax = 1000; }
    if (game.free && !LAB.windShown) showWind(true, false);
    if (trans < 1) trans = Math.min(1, trans + dt / 0.6);
    column_newT += dt; labNewT += dt;
    for (const k in UPDATE) UPDATE[k](dt, t);
    if (GST.bubble > 0) GST.bubble = Math.max(0, GST.bubble - dt);
    LAB.led.forEach((l) => { if (l.f > 0) l.f -= 0; });
    FX.update(dt);
    view.clear('#dcecf7');
    ctx.fillStyle = '#dcecf7'; ctx.fillRect(0, 0, VW, VH);
    if (trans < 1 && prevScene) {
      const e = EA.inOutCubic(trans);
      drawSceneClipped(prevScene, t);
      drawSceneClipped(SCENE, t, e, lerp(1.04, 1, e));
      drawGraph(gcfg(prevScene), 1 - e);
      drawGraph(gcfg(SCENE), e);
    } else {
      drawSceneClipped(SCENE, t);
      drawGraph(gcfg(SCENE), 1);
    }
    updateReadouts();
  }

  // 테스트용 보조 도구
  window.__sim = {
    C, LAB, LY, M, GST, PF, BANDS, SEAS, labRecOk, doRecord, selectSea, selectSeason, startMeasure, measKey, labProfile, labTempAt, setLayersMode, mapReset, zY, layersReset,
    get scene() { return SCENE; },
    setLamp(on) { LAB.lamp = on; syncLabUI(); }, setWind(w) { LAB.wind = w; syncLabUI(); },
    fastForwardLab(sec) { labStep(sec); LAB.simT += sec; if (LAB.lamp) LAB.heatT += sec; },
    placeBand(k) { const c = LY.chips.find((x) => x.band.k === k); c.placed = true; LY.placed[k] = true; const q = chipPlacedPos(c.band); c.sx.value = c.sx.target = q.x; c.sy.value = c.sy.target = q.y; },
  };
})();
