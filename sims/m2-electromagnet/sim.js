/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전류의 자기 작용과 전동기  [9과14-04]
   ① 관찰: 자석의 자기장(나침반·철가루) → ② 실험: 코일 = 전자석(전류의 세기·방향)
   → ③ 탐구: 자기장 속 전류가 받는 힘(도선 그네) → ④ 모형: 전동기
   (전류의 세기와 방향에 따른 자기장·힘을 정성적으로 확인해요)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const W = 800, H = 540;
  const NC = '#e2464b', SC = '#2f6df6', INK = '#1b2333', MUTED = '#5b667a', COPPER = '#e39a45';
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eaf0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const C = SciSim.color;
  const parts = new SciSim.Particles();
  const RM = SciSim.reduceMotion;
  const approach = SciSim.approach;
  const box = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mixc = (a, b, t) => C.mix(a, b, clamp(t, 0, 1));
  const hash = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const rr = (x, y, w, h, r) => D.roundRect(x, y, w, h, r);

  let F = new Set();
  let game = null;
  const has = (f) => F.has(f);
  const isNew = (f) => !!game && game.isNew(f);

  /* ---------- 상태 ---------- */
  const EARTH = 1, Q = 6e4, SOFT2 = 26 * 26;
  const S = {
    scene: 'magnet', inited: false, fade: 1, t: 0, touched: {}, drag: null,
    I: 0, Is: 0, dir: 1, dirS: 1, pole: 1, poleS: 1,
    fill: false, lines: false, fillT: 0, fillA: 0, linesA: 0,
    // 코일 실험 기록
    sawOn: false, sawRev: false, sawStrong: false, dirsSeen: {}, maxI: 0,
    // 도선 그네
    th: new SciSim.Spring(0, { stiffness: 34, damping: 3.2 }), pushR: false, pushL: false, holdR: 0, holdL: 0,
    // 전동기
    phi: 0.4, w: 0, fast: false, slow: false, motorT: 0, ripple: 0,
  };
  const MAG = { x0: 290, x1: 510, cy: 270, hh: 29 };
  const COIL = { x0: 290, x1: 510, cy: 258, R: 38, turns: 8 };
  const BAT = { x: 330, y: 430, w: 140, h: 56 };

  /* ================= 자기장 계산 (두 극 모형) ================= */
  const tmpB = { bx: 0, by: 0, mx: 0, my: 0 };
  function polesNow() {
    if (S.scene === 'magnet') return [{ x: MAG.x0 + 20, y: MAG.cy, q: Q }, { x: MAG.x1 - 20, y: MAG.cy, q: -Q }];
    const qe = (Q / 2) * S.Is * S.dirS;      // 전류 방향에 따라 N극이 오른쪽/왼쪽
    return [{ x: COIL.x1 - 10, y: COIL.cy, q: qe }, { x: COIL.x0 + 10, y: COIL.cy, q: -qe }];
  }
  function fieldAt(x, y, poles, out) {
    let mx = 0, my = 0;
    for (let i = 0; i < poles.length; i++) {
      const p = poles[i], dx = x - p.x, dy = y - p.y;
      const r2 = dx * dx + dy * dy + SOFT2, k = p.q / (r2 * Math.sqrt(r2));
      mx += dx * k; my += dy * k;
    }
    out.mx = mx; out.my = my; out.bx = mx; out.by = my - EARTH;
    return out;
  }
  const insideMagnet = (x, y) => (S.scene === 'magnet'
    ? x > MAG.x0 - 4 && x < MAG.x1 + 4 && Math.abs(y - MAG.cy) < MAG.hh + 4
    : x > COIL.x0 - 8 && x < COIL.x1 + 22 && Math.abs(y - COIL.cy) < COIL.R + 4);

  /* ---------- 철가루 ---------- */
  const GR = [];
  for (let iy = 0; iy < 25; iy++) for (let ix = 0; ix < 38; ix++) {
    GR.push({ x: 20 + ix * 20 + rnd(-6, 6), y: 26 + iy * 20 + rnd(-6, 6), a: rnd(-3.1, 3.1), d: rnd(0, 0.9), l: rnd(7, 11) });
  }
  function updateFilings(dt, poles) {
    const show = S.scene === 'magnet' ? S.fill : true;
    S.fillA = approach(S.fillA, show ? 1 : 0, dt, 4);
    if (show) S.fillT += dt; else if (S.fillA < 0.02) S.fillT = 0;
    if (S.fillA < 0.01) return;
    const k = Math.min(1, dt * 7);
    for (let i = 0; i < GR.length; i++) {
      const g = GR[i];
      fieldAt(g.x, g.y, poles, tmpB);
      const mag = Math.hypot(tmpB.mx, tmpB.my);
      g.al = Math.pow(clamp(mag / 2.4, 0, 1), 0.75);
      const tgt = Math.atan2(tmpB.by, tmpB.bx);
      g.a += wrap(tgt - g.a) * (RM ? 1 : k);
      g.v = clamp((S.fillT - g.d) * 4, 0, 1);
    }
  }
  function drawFilings() {
    if (S.fillA < 0.01) return;
    const buckets = [[], [], [], [], []];
    for (let i = 0; i < GR.length; i++) {
      const g = GR[i], a = (g.al || 0) * (g.v || 0) * S.fillA;
      if (a < 0.06) continue;
      buckets[Math.min(4, Math.floor(a * 5))].push(g);
    }
    ctx.lineCap = 'round'; ctx.lineWidth = 1.7;
    buckets.forEach((arr, bi) => {
      if (!arr.length) return;
      ctx.strokeStyle = 'rgba(40,44,56,' + (0.22 + 0.16 * bi) + ')';
      ctx.beginPath();
      arr.forEach((g) => {
        const c = Math.cos(g.a) * g.l / 2, s = Math.sin(g.a) * g.l / 2, y = g.y - (1 - g.v) * 14;
        ctx.moveTo(g.x - c, y - s); ctx.lineTo(g.x + c, y + s);
      });
      ctx.stroke();
    });
  }

  /* ---------- 자기력선 ---------- */
  const LINE_SEEDS = 28;
  function traceLines(poles) {
    const N = poles.find((p) => p.q > 0), Sp = poles.find((p) => p.q < 0);
    if (!N || !Sp) return [];
    const res = [];
    for (let k = 0; k < LINE_SEEDS; k++) {
      const a0 = (k + 0.5) / LINE_SEEDS * Math.PI * 2;
      const sr = S.scene === 'coil' ? 56 : 38;
      let x = N.x + Math.cos(a0) * sr, y = N.y + Math.sin(a0) * sr;
      if (insideMagnet(x, y)) continue;
      const pts = [[x, y]];
      let ok = false;
      for (let i = 0; i < 300; i++) {
        let mx = 0, my = 0;
        for (let j = 0; j < poles.length; j++) {
          const p = poles[j], dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + SOFT2, kk = p.q / (r2 * Math.sqrt(r2));
          mx += dx * kk; my += dy * kk;
        }
        const m = Math.hypot(mx, my) || 1;
        x += mx / m * 7; y += my / m * 7;
        if (x < 24 || x > W - 24 || y < 28 || y > H - 28) break;
        if (Math.hypot(x - Sp.x, y - Sp.y) < 44 && insideMagnet(x, y)) { ok = true; break; }
        if (insideMagnet(x, y)) { ok = Math.hypot(x - Sp.x, y - Sp.y) < 60; break; }
        pts.push([x, y]);
      }
      if (ok && pts.length > 6) res.push(pts);
    }
    return res;
  }
  let lineCache = null, lineKey = '';
  function drawLines(poles, alpha, t) {
    if (alpha < 0.02) return;
    const sg = poles[0].q > 0 ? 1 : poles[0].q < 0 ? -1 : 0;
    if (!sg) return;
    const key = S.scene + '|' + sg;
    if (key !== lineKey) { lineKey = key; lineCache = traceLines([{ x: poles[0].x, y: poles[0].y, q: sg * Q }, { x: poles[1].x, y: poles[1].y, q: -sg * Q }]); }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(124,58,237,.75)'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    lineCache.forEach((pts) => {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    });
    // 흐르는 화살표: N → S
    ctx.fillStyle = '#7c3aed';
    lineCache.forEach((pts, li) => {
      let acc = 0; const spacing = 120, off = (RM ? 0 : t * 36 + li * 31) % spacing;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const before = Math.floor((acc - off + spacing * 4) / spacing), after = Math.floor((acc + l - off + spacing * 4) / spacing);
        if (after > before) {
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-5, 5.5); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        acc += l;
      }
    });
    ctx.restore();
  }

  /* ================= 나침반 ================= */
  const comps = [0, 1, 2].map((i) => ({ i, x: 0, y: 0, tx: 0, ty: 0, lift: 0, grab: false, ang: -Math.PI / 2, vel: 0, off: i * 0.8 }));
  function placeCompasses(kind) {
    const pos = kind === 'magnet' ? [[64, 488], [134, 488], [204, 488]] : [[400, 130], [140, 330], [660, 330]];
    comps.forEach((c, i) => { c.x = c.tx = pos[i][0]; c.y = c.ty = pos[i][1]; c.grab = false; c.lift = 0; c.ang = -Math.PI / 2; c.vel = 0; });
  }
  function updateCompass(c, dt, poles) {
    fieldAt(c.x, c.y, poles, tmpB);
    const t = Math.atan2(tmpB.by, tmpB.bx), mag = Math.hypot(tmpB.bx, tmpB.by);
    c.mag = mag;
    c.lift = approach(c.lift, c.grab ? 1 : 0, dt, 14);
    c.x = approach(c.x, c.tx, dt, 26); c.y = approach(c.y, c.ty, dt, 22);
    if (RM) { c.ang = t; c.vel = 0; return; }
    const k = clamp(26 + 24 * mag, 26, 170), d = 2 * 0.4 * Math.sqrt(k);
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { c.vel += (k * wrap(t - c.ang) - d * c.vel) * h; c.ang += c.vel * h; }
    c.ang = wrap(c.ang);
  }
  function drawCompass(c, t) {
    const R = 27;
    ctx.save();
    ctx.translate(c.x, c.y);
    const sc = 1 + 0.08 * c.lift; ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20,40,80,' + (0.22 + 0.12 * c.lift) + ')'; ctx.shadowBlur = 10 + 12 * c.lift; ctx.shadowOffsetY = 4 + 8 * c.lift;
    const g = ctx.createRadialGradient(-8, -9, 4, 0, 0, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe6f2');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); ctx.lineTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2)); ctx.stroke(); }
    // 바늘
    ctx.save(); ctx.rotate(c.ang);
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(R - 4, 0); ctx.lineTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eef1f6'; ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-(R - 4), 0); ctx.lineTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    D.sphere(0, 0, 3.6, '#64748b', { gloss: false });
    ctx.restore();
  }
  // 나침반이 자석·코일(철심)·전원 장치 '안'에 들어가지 않게 가장자리 밖으로 밀어내요 (자석 안의 자기장은 이 모형으로 나타낼 수 없어요)
  function keepOut(x, y) {
    const R = 32;
    const rects = S.scene === 'magnet'
      ? [[MAG.x0, MAG.cy - MAG.hh, MAG.x1, MAG.cy + MAG.hh]]
      : [[COIL.x0 - 14, COIL.cy - COIL.R - 8, COIL.x1 + 30, COIL.cy + COIL.R + 8], [BAT.x - 12, BAT.y, BAT.x + BAT.w + 12, BAT.y + BAT.h]];
    for (let pass = 0; pass < 2; pass++) {
      rects.forEach((r) => {
        const x0 = r[0] - R, y0 = r[1] - R, x1 = r[2] + R, y1 = r[3] + R;
        if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return;
        const d = [x - x0, x1 - x, y - y0, y1 - y], m = Math.min.apply(null, d);
        if (m === d[0]) x = x0; else if (m === d[1]) x = x1; else if (m === d[2]) y = y0; else y = y1;
      });
    }
    return { x: clamp(x, 30, 770), y: clamp(y, 40, 510) };
  }
  const compassHit = (p) => { for (let i = comps.length - 1; i >= 0; i--) { const c = comps[i]; if (Math.hypot(p.x - c.x, p.y - c.y) < 36) return c; } return null; };

  /* ================= ① 막대자석 ================= */
  function drawBarMagnet(t) {
    const m = MAG, w = m.x1 - m.x0, h = m.hh * 2;
    D.shadow(() => { rr(m.x0, m.cy - m.hh, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 14, y: 6 });
    const half = w / 2;
    [[m.x0, NC, 'N'], [m.x0 + half, SC, 'S']].forEach((o, i) => {
      ctx.save();
      rr(m.x0, m.cy - m.hh, w, h, 10); ctx.clip();
      const g = ctx.createLinearGradient(0, m.cy - m.hh, 0, m.cy + m.hh);
      g.addColorStop(0, C.shade(o[1], 0.45)); g.addColorStop(0.45, o[1]); g.addColorStop(1, C.shade(o[1], -0.35));
      ctx.fillStyle = g; ctx.fillRect(o[0], m.cy - m.hh, half, h);
      ctx.restore();
      D.text(o[0] + half / 2, m.cy + 14, o[2], { size: 40, weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.18)', strokeWidth: 4 });
    });
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; rr(m.x0, m.cy - m.hh, w, h, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(m.x0 + 8, m.cy - m.hh + 5, w - 16, 7, 3.5); ctx.fill();
    D.text(m.x0 + half / 2, m.cy + m.hh + 22, 'N극', { size: 15, weight: 800, color: NC });
    D.text(m.x0 + half * 1.5, m.cy + m.hh + 22, 'S극', { size: 15, weight: 800, color: SC });
  }
  function drawMagnetScene(t) {
    const poles = polesNow();
    // 종이 (철가루 무늬를 위한 흰 판)
    D.shadow(() => { rr(14, 16, 772, 508, 18); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(14, 16, 772, 508, 18); ctx.stroke();
    drawFilings();
    drawLines(poles, S.linesA, t);
    drawBarMagnet(t);
    // 나침반 보관 칸
    const atHome = comps.some((c) => !c.grab && c.y > 470);
    if (atHome) { D.label(134, 460, '나침반 (끌어서 옮겨요)', { bg: 'rgba(255,255,255,.95)', color: MUTED, size: 13, border: 'rgba(120,135,160,.4)' }); }
    // 범례
    D.label(612, 500, '빨간 바늘 끝 = 자기장의 방향', { bg: 'rgba(255,255,255,.95)', color: '#b91c1c', size: 13, border: '#f3c6c8' });
    comps.forEach((c) => drawCompass(c, t));
    if (!S.touched.magnet && !RM) D.ring(comps[0].x, comps[0].y, 40, t, { color: '#f26b3a' });
  }

  /* ================= ② 코일(전자석) ================= */
  function helix(t) {
    const a = t * Math.PI * 2, z = Math.cos(a);
    return { x: COIL.x0 + (COIL.x1 - COIL.x0) * t / COIL.turns + 15 * z, y: COIL.cy - COIL.R * Math.sin(a), z };
  }
  const CPATH = (() => {
    const pts = [[BAT.x, 458, 1], [250, 458, 1], [250, COIL.cy, 1]];
    const per = 22;
    for (let i = 0; i <= COIL.turns * per; i++) { const q = helix(i / per); pts.push([q.x, q.y, q.z]); }
    pts.push([550, COIL.cy, 1], [550, 458, 1], [BAT.x + BAT.w, 458, 1]);
    let len = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len); }
    return { pts, len, cum };
  })();
  function pathAt(s) {
    s = ((s % CPATH.len) + CPATH.len) % CPATH.len;
    const { pts, cum } = CPATH;
    let lo = 1; while (lo < pts.length - 1 && cum[lo] < s) lo++;
    const a = pts[lo - 1], b = pts[lo], l = cum[lo] - cum[lo - 1] || 1, t = (s - cum[lo - 1]) / l;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + (b[2] - a[2]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  let flow = 0;
  function drawCoilScene(t, dt) {
    const poles = polesNow();
    // 판
    D.shadow(() => { rr(14, 16, 772, 508, 18); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(14, 16, 772, 508, 18); ctx.stroke();
    drawFilings();
    drawLines(poles, clamp(S.Is / 1.2, 0, 1) * 0.9, t);
    // 도선(리드)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 5;
    const h0 = helix(0), h1 = helix(COIL.turns);
    ctx.beginPath(); ctx.moveTo(BAT.x, 458); ctx.lineTo(250, 458); ctx.lineTo(250, COIL.cy); ctx.lineTo(h0.x, h0.y);
    ctx.moveTo(h1.x, h1.y); ctx.lineTo(550, COIL.cy); ctx.lineTo(550, 458); ctx.lineTo(BAT.x + BAT.w, 458); ctx.stroke();
    // 코일 뒷면 → 철심 → 앞면
    const N = COIL.turns * 22;
    ctx.strokeStyle = '#a0612c'; ctx.lineWidth = 6;
    ctx.beginPath(); let pen = false;
    for (let i = 0; i <= N; i++) { const q = helix(i / 22); if (q.z <= 0) { pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; } else pen = false; }
    ctx.stroke();
    const cg = ctx.createLinearGradient(0, COIL.cy - 15, 0, COIL.cy + 15);
    cg.addColorStop(0, '#e5e9f0'); cg.addColorStop(0.5, '#aab3c2'); cg.addColorStop(1, '#6b7686');
    D.shadow(() => { rr(COIL.x0 - 14, COIL.cy - 15, COIL.x1 - COIL.x0 + 44, 30, 8); ctx.fillStyle = cg; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; rr(COIL.x0 - 14, COIL.cy - 15, COIL.x1 - COIL.x0 + 44, 30, 8); ctx.stroke();
    ctx.strokeStyle = COPPER; ctx.lineWidth = 7;
    ctx.beginPath(); pen = false;
    for (let i = 0; i <= N; i++) { const q = helix(i / 22); if (q.z > 0) { pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; } else pen = false; }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); pen = false;
    for (let i = 0; i <= N; i++) { const q = helix(i / 22); if (q.z > 0.15) { pen ? ctx.lineTo(q.x - 1, q.y - 2) : ctx.moveTo(q.x - 1, q.y - 2); pen = true; } else pen = false; }
    ctx.stroke();
    // 전원
    D.shadow(() => { rr(BAT.x, BAT.y, BAT.w, BAT.h, 12); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(BAT.x + BAT.w / 2, BAT.y + 22, '전원 장치', { size: 13, weight: 800, color: '#e2e8f0' });
    D.text(BAT.x + BAT.w / 2, BAT.y + 44, S.Is < 0.05 ? '꺼짐' : S.Is.toFixed(1) + ' A', { size: 18, weight: 800, color: S.Is < 0.05 ? '#94a3b8' : '#4ade80' });
    const plusRight = S.dirS > 0;
    [[BAT.x, 458, plusRight ? -1 : 1], [BAT.x + BAT.w, 458, plusRight ? 1 : -1]].forEach((o) => {
      const plus = o[2] > 0;
      ctx.fillStyle = plus ? '#dc2626' : '#111827'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o[0], o[1], 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      D.text(o[0], o[1] + 6, plus ? '+' : '−', { size: 17, weight: 900, color: '#fff' });
    });
    // 전류 방향 화살표 (전류의 방향: (+) → (−))
    if (S.Is > 0.05) {
      flow += dt * 70 * S.Is * (S.dir > 0 ? -1 : 1) * (RM ? 0.3 : 1);
      const gap = 52;
      ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let s = ((flow % gap) + gap) % gap; s < CPATH.len; s += gap) {
        const q = pathAt(s);
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.ang + (S.dir > 0 ? Math.PI : 0));
        ctx.globalAlpha = q.z < -0.1 ? 0.28 : 1;
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6.5); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
      }
    }
    // 극 표시 (전자석)
    const k = clamp(S.Is / 1.0, 0, 1) * Math.abs(S.dirS);
    if (k > 0.05) {
      [[COIL.x1 + 46, 1], [COIL.x0 - 46, -1]].forEach((o) => {
        const isN = o[1] * S.dirS > 0, sx = Math.abs(S.dirS);
        ctx.save(); ctx.globalAlpha = k; ctx.translate(o[0], COIL.cy - COIL.R - 28 + 4); ctx.scale(sx, 1);
        D.sphere(0, 0, 19, isN ? NC : SC, { text: isN ? 'N' : 'S', textScale: 1.1 });
        ctx.restore();
      });
      D.text(COIL.x0 + (COIL.x1 - COIL.x0) / 2, COIL.cy - COIL.R - 36, '전자석', { size: 16, weight: 800, color: '#7c3aed', alpha: k });
    }
    D.text(COIL.x0 + (COIL.x1 - COIL.x0) / 2, COIL.cy + COIL.R + 36, '코일(철심에 도선을 감은 것)', { size: 13, weight: 700, color: MUTED });
    // 나침반
    comps.forEach((c) => drawCompass(c, t));
  }

  /* ================= ③ 도선 그네 ================= */
  const FP = { px: 400, py: 62, L: 216 };
  const PL = { x0: 300, x1: 500, topY: 150, topH: 54, botY: 348 };
  function drawForceScene(t) {
    // 배경 판
    D.shadow(() => { rr(14, 16, 772, 508, 18); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(14, 16, 772, 508, 18); ctx.stroke();
    const ps = S.poleS;                                  // +1: 위쪽이 N극
    // 자석 (위·아래)
    [[PL.topY, ps], [PL.botY, -ps]].forEach((o, i) => {
      const y = o[0], sg = o[1], isN = sg > 0, tt = (sg + 1) / 2;
      const col = mixc(SC, NC, tt);
      ctx.save();
      D.shadow(() => { rr(PL.x0, y, PL.x1 - PL.x0, PL.topH, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 12, y: 5 });
      rr(PL.x0, y, PL.x1 - PL.x0, PL.topH, 10); ctx.clip();
      const g = ctx.createLinearGradient(0, y, 0, y + PL.topH);
      g.addColorStop(0, C.shade(col, 0.4)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.35));
      ctx.fillStyle = g; ctx.fillRect(PL.x0, y, PL.x1 - PL.x0, PL.topH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; rr(PL.x0, y, PL.x1 - PL.x0, PL.topH, 10); ctx.stroke();
      ctx.save(); ctx.translate(400, y + PL.topH / 2 + 2); ctx.scale(1, Math.max(0.05, Math.abs(sg)));
      D.text(0, 14, isN ? 'N' : 'S', { size: 42, weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.18)', strokeWidth: 4 });
      ctx.restore();
      D.text(PL.x1 + 12, y + PL.topH / 2 + 5, (isN ? 'N' : 'S') + '극 자석', { size: 14, weight: 800, color: isN ? NC : SC, align: 'left' });
    });
    // 자기장 화살표 (N → S)
    const down = ps > 0;
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.fillStyle = 'rgba(124,58,237,.8)'; ctx.lineWidth = 2.2; ctx.setLineDash([9, 8]);
    ctx.lineDashOffset = (RM ? 0 : t * 26) * (down ? -1 : 1);
    [326, 363, 400, 437, 474].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, PL.topY + PL.topH + 4); ctx.lineTo(x, PL.botY - 4); ctx.stroke(); });
    ctx.setLineDash([]);
    [326, 363, 400, 437, 474].forEach((x) => {
      const y = down ? PL.botY - 6 : PL.topY + PL.topH + 6, d = down ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x, y + 0); ctx.lineTo(x - 6, y - 11 * d); ctx.lineTo(x + 6, y - 11 * d); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    [PL.x0, PL.x1].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, PL.topY + PL.topH); ctx.lineTo(x, PL.botY); ctx.stroke(); });
    ctx.restore();
    D.label(676, 110, '자기장 ' + (down ? '위 → 아래' : '아래 → 위'), { bg: '#f3edff', color: '#6d28d9', size: 14, border: '#d6c6fb' });
    // 고정대
    ctx.fillStyle = '#9aa5b7'; rr(250, 46, 300, 12, 5); ctx.fill();
    ctx.fillStyle = '#7b8798'; ctx.fillRect(256, 20, 10, 30); ctx.fillRect(534, 20, 10, 30);
    // 줄과 도선(앞쪽에 그려요)
    const th = S.th.value, bx = FP.px + Math.sin(th) * FP.L, by = FP.py + Math.cos(th) * FP.L;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(FP.px, FP.py); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.arc(FP.px, FP.py, 5, 0, Math.PI * 2); ctx.fill();
    // 힘 화살표
    const Ieff = S.Is;
    const fdir = S.dirS * S.poleS;
    const fl = 150 * (Ieff / 3) * fdir;
    if (Math.abs(fl) > 8) {
      D.arrow(bx, by, bx + Math.sign(fl) * (Math.abs(fl) * 0.7 + 14), by, { color: '#f26b3a', width: 6, head: 18 });
      D.label(bx + Math.sign(fl) * (Math.abs(fl) * 0.7 + 14) / 2, by - 30, '힘', { bg: '#f26b3a', color: '#fff', size: 14 });
    }
    // 도선(단면): ⊙ 앞쪽 / ⊗ 뒤쪽
    D.sphere(bx, by, 16, '#d98a3a', { shadow: true });
    ctx.save(); ctx.translate(bx, by);
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2.2;
    if (S.dirS > 0.2) { ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.stroke(); }
    else if (S.dirS < -0.2) { ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6.5, -6.5); ctx.lineTo(6.5, 6.5); ctx.moveTo(6.5, -6.5); ctx.lineTo(-6.5, 6.5); ctx.stroke(); }
    ctx.restore();
    D.label(bx, by + 40, S.Is < 0.05 ? '도선 (전류 없음)' : S.dir > 0 ? '도선 · 전류가 앞쪽으로 ⊙' : '도선 · 전류가 뒤쪽으로 ⊗', { bg: 'rgba(255,255,255,.95)', color: '#7a4a22', size: 13, border: 'rgba(120,135,160,.4)' });
    D.text(400, 500, '도선을 한쪽 끝에서 본 모습이에요 (⊙: 전류가 나오는 쪽, ⊗: 들어가는 쪽)', { size: 13, weight: 700, color: MUTED });
    if (!S.touched.force && S.Is < 0.05 && !RM) D.ring(bx, by, 28, t, { color: '#f26b3a' });
  }

  /* ================= ④ 전동기 ================= */
  const MC = { x: 400, y: 232, r: 82 };
  function sectorPath(a0, a1, r0, r1) {
    ctx.beginPath(); ctx.arc(MC.x, MC.y, r1, a0, a1); ctx.arc(MC.x, MC.y, r0, a1, a0, true); ctx.closePath();
  }
  function updateMotor(dt) {
    const m = S;
    if (m.Is <= 0.02 && Math.abs(m.w) < 0.02) { m.w = 0; return; }
    const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const torque = 10.4 * m.Is * m.dirS * Math.abs(Math.cos(m.phi));
      m.w += (torque - 3 * m.w) * h;
      m.phi += m.w * h;
    }
    m.phi = ((m.phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }
  function drawMotorScene(t, dt) {
    D.shadow(() => { rr(14, 16, 772, 508, 18); ctx.fillStyle = '#ffffff'; ctx.fill(); }, { blur: 14, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(14, 16, 772, 508, 18); ctx.stroke();
    // 자석 (N: 왼쪽, S: 오른쪽, 곡면 극)
    [[Math.PI - 0.7, Math.PI + 0.7, NC, 'N', 219], [-0.7, 0.7, SC, 'S', 581]].forEach((o) => {
      ctx.save();
      D.shadow(() => { sectorPath(o[0], o[1], 126, 236); ctx.fillStyle = o[2]; ctx.fill(); }, { blur: 12, y: 5 });
      sectorPath(o[0], o[1], 126, 236);
      const g = ctx.createLinearGradient(0, MC.y - 150, 0, MC.y + 150);
      g.addColorStop(0, C.shade(o[2], 0.35)); g.addColorStop(0.5, o[2]); g.addColorStop(1, C.shade(o[2], -0.3));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      D.text(o[4], MC.y + 15, o[3], { size: 48, weight: 900, color: '#fff', stroke: 'rgba(0,0,0,.2)', strokeWidth: 4 });
    });
    // 자기장 (N → S)
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.fillStyle = 'rgba(124,58,237,.75)'; ctx.lineWidth = 2.2; ctx.setLineDash([9, 8]); ctx.lineDashOffset = RM ? 0 : -t * 26;
    [-84, -56, -28, 0, 28, 56, 84].forEach((dy) => { ctx.beginPath(); ctx.moveTo(MC.x - 124, MC.y + dy); ctx.lineTo(MC.x + 118, MC.y + dy); ctx.stroke(); });
    ctx.setLineDash([]);
    [-84, -56, -28, 0, 28, 56, 84].forEach((dy) => { ctx.beginPath(); ctx.moveTo(MC.x + 126, MC.y + dy); ctx.lineTo(MC.x + 114, MC.y + dy - 6); ctx.lineTo(MC.x + 114, MC.y + dy + 6); ctx.closePath(); ctx.fill(); });
    ctx.restore();
    D.text(MC.x, MC.y - 118, '자기장 (N극 → S극)', { size: 13, weight: 800, color: '#7c3aed' });
    // 전원과 도선
    const k = clamp(S.Is / 1.5, 0, 1);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(MC.x - 34, MC.y); ctx.lineTo(MC.x - 34, 440); ctx.moveTo(MC.x + 34, MC.y); ctx.lineTo(MC.x + 34, 440); ctx.stroke();
    D.shadow(() => { rr(MC.x - 70, 438, 140, 52, 12); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(MC.x, 460, '전원 장치', { size: 13, weight: 800, color: '#e2e8f0' });
    D.text(MC.x, 480, S.Is < 0.05 ? '꺼짐' : S.Is.toFixed(1) + ' A', { size: 16, weight: 800, color: S.Is < 0.05 ? '#94a3b8' : '#4ade80' });
    const plusRight = S.dirS > 0;
    [[MC.x - 34, plusRight ? -1 : 1], [MC.x + 34, plusRight ? 1 : -1]].forEach((o) => {
      const plus = o[1] > 0;
      ctx.fillStyle = plus ? '#dc2626' : '#111827'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o[0], 438, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      D.text(o[0], 444, plus ? '+' : '−', { size: 16, weight: 900, color: '#fff' });
    });
    // 전류 화살표 (오른쪽 도선: 위로, 왼쪽: 아래로 / 방향 반대면 반대)
    if (S.Is > 0.05) {
      S.motorT += dt * 60 * S.Is * (RM ? 0.3 : 1);
      const gap = 40;
      ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let s = S.motorT % gap; s < 190; s += gap) {
        [[MC.x + 34, -1], [MC.x - 34, 1]].forEach((o) => {
          const d = o[1] * (S.dir > 0 ? 1 : -1), y = d < 0 ? 440 - s : MC.y + 8 + s;
          if (y < MC.y + 14 || y > 430) return;
          ctx.save(); ctx.translate(o[0], y); ctx.rotate(d < 0 ? -Math.PI / 2 : Math.PI / 2);
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6.5); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
        });
      }
    }
    // 코일 (끝에서 본 모습): 두 변이 축을 중심으로 회전
    const phi = S.phi, ax = Math.cos(phi) * MC.r, ay = -Math.sin(phi) * MC.r;
    // 회전 방향 표시
    const wa = Math.abs(S.w);
    if (wa > 0.25) {
      ctx.save(); ctx.globalAlpha = clamp(wa / 3, 0.15, 0.7);
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const dirw = S.w > 0 ? -1 : 1;                       // 화면에서 반시계(+w)는 캔버스 각도 감소
      const a0 = -Math.PI / 2 + 0.2, a1 = a0 + dirw * 1.6;
      ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.r + 38, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      const ea = a1, ex = MC.x + Math.cos(ea) * (MC.r + 38), ey = MC.y + Math.sin(ea) * (MC.r + 38), tang = ea + (dirw > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.fillStyle = '#16a34a'; ctx.save(); ctx.translate(ex, ey); ctx.rotate(tang);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.restore();
    }
    // 코일 몸체(납작한 막대)
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(MC.x - ax + 2, MC.y - ay + 5); ctx.lineTo(MC.x + ax + 2, MC.y + ay + 5); ctx.stroke();
    ctx.strokeStyle = '#a0612c'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(MC.x - ax, MC.y - ay); ctx.lineTo(MC.x + ax, MC.y + ay); ctx.stroke();
    ctx.strokeStyle = COPPER; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(MC.x - ax, MC.y - ay); ctx.lineTo(MC.x + ax, MC.y + ay); ctx.stroke();
    ctx.restore();
    // 정류자 (반원 두 개)와 솔
    const rc = 26, cang = -phi;
    [[0, '#e0a030'], [Math.PI, '#b8bcc6']].forEach((o) => {
      ctx.strokeStyle = o[1]; ctx.lineWidth = 11; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(MC.x, MC.y, rc, cang + o[0] - Math.PI / 2 + 0.16, cang + o[0] + Math.PI / 2 - 0.16); ctx.stroke();
    });
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(MC.x, MC.y, 11, 0, Math.PI * 2); ctx.fill();
    [[-1], [1]].forEach((o) => {
      ctx.fillStyle = '#1f2937'; rr(MC.x + o[0] * (rc + 13) - 9, MC.y - 9, 18, 18, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(MC.x + o[0] * (rc + 13) - 6, MC.y - 6, 12, 3);
    });
    // 두 변: 전류 ⊙/⊗ 와 힘
    const rightSide = ax >= 0 ? 1 : -1;                    // 오른쪽에 있는 변이 +
    [[ax, ay, 1], [-ax, -ay, -1]].forEach((o) => {
      const sx = MC.x + o[0], sy = MC.y + o[1];
      const onRight = o[0] >= 0;
      const out = (S.dir > 0) === onRight;                  // 오른쪽 변: dir>0이면 ⊙
      D.sphere(sx, sy, 14, '#d98a3a', { shadow: true });
      ctx.save(); ctx.translate(sx, sy); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2;
      if (S.Is > 0.05) {
        if (out) { ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5.5, -5.5); ctx.lineTo(5.5, 5.5); ctx.moveTo(5.5, -5.5); ctx.lineTo(-5.5, 5.5); ctx.stroke(); }
      }
      ctx.restore();
      if (S.Is > 0.05) {
        const up = onRight ? (S.dir > 0) : (S.dir < 0);       // 오른쪽 변이 ⊙이면 위로 힘
        const L = 18 + 30 * (S.Is / 3);
        D.arrow(sx, sy + (up ? -18 : 18), sx, sy + (up ? -18 - L : 18 + L), { color: '#f26b3a', width: 5, head: 14 });
        D.label(sx + 22, sy + (up ? -18 - L / 2 : 18 + L / 2), '힘', { bg: '#f26b3a', color: '#fff', size: 13 });
      }
    });
    D.label(MC.x + 190, 454, '정류자: 반 바퀴마다 전류 방향을 바꿔요', { bg: 'rgba(255,255,255,.95)', color: '#7a5a2b', size: 13, border: 'rgba(120,135,160,.4)', align: 'center' });
    if (!S.touched.motor && S.Is < 0.05 && !RM) D.ring(MC.x, MC.y, 70, t, { color: '#f26b3a' });
  }

  /* ================= 입력 ================= */
  const handlers = {
    hover(p) { return (S.scene === 'magnet' || S.scene === 'coil') && compassHit(p) ? 'grab' : null; },
    down(p) {
      if (S.scene !== 'magnet' && S.scene !== 'coil') return false;
      const c = compassHit(p); if (!c) return false;
      c.grab = true; c.dx = c.tx - p.x; c.dy = c.ty - p.y;
      comps.splice(comps.indexOf(c), 1); comps.push(c);
      S.drag = c; S.touched[S.scene] = true; hideHint(); Sound.tick();
      return true;
    },
    move(p) {
      const c = S.drag; if (!c) return;
      const q = keepOut(clamp(p.x + c.dx, 30, 770), clamp(p.y + c.dy, 40, 510));
      c.tx = q.x; c.ty = q.y;
    },
    up() { const c = S.drag; if (!c) return; c.grab = false; S.drag = null; Sound.click(); },
  };
  SciSim.pointer(view, handlers);
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    if ((S.scene === 'magnet' || S.scene === 'coil') && compassHit(view.toLocal(e.touches[0]))) e.preventDefault();
  }, { passive: false });

  /* ---------- UI ---------- */
  const hintEl = $('#stageHint');
  function showHint(msg, ms) { hintEl.textContent = msg; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000); }
  function hideHint() { hintEl.classList.add('hide'); }
  const tbLabel = $('#tbLabel'), sceneSeg = $('#sceneSeg');
  const sceneNames = { magnet: '🧲 막대자석의 자기장', coil: '🌀 전류가 흐르는 코일', force: '🏇 자기장 속의 도선 (그네)', motor: '⚙️ 전동기 모형' };
  const dirNotes = { coil: '전류가 코일을 감아 도는 방향이 반대로 바뀌어요.', force: '도선에 흐르는 전류가 앞쪽(⊙) ↔ 뒤쪽(⊗)으로 바뀌어요.', motor: '전류 방향이 바뀌어요.' };
  const sI = $('#sI'), oI = $('#oI'), dirBtn = $('#dirBtn'), fillBtn = $('#fillBtn'), lineBtn = $('#lineBtn');
  const rangeI = SciSim.bindRange(sI, oI, (v) => (+v === 0 ? '꺼짐 (0.0 A)' : (+v).toFixed(1) + ' A'), (v) => { S.I = +v; hideHint(); });
  function setCurrent(v) { S.I = v; rangeI.set(v); }
  function setDir(d) { S.dir = d; }
  function setPole(p) { S.pole = p; }
  function setScene(name) {
    if (S.inited && S.scene === name) return;
    S.inited = true;
    S.scene = name;
    tbLabel.textContent = sceneNames[name];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = c.dataset.scenes.split(' ').indexOf(name) < 0; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    $('#dirNote').textContent = dirNotes[name] || '';
    S.drag = null; parts.clear();
    S.fade = 0; SciSim.tween(S, { fade: 1 }, { duration: 0.45, ease: 'outCubic' });
    if (name === 'magnet') { placeCompasses('magnet'); S.fill = false; S.lines = false; S.fillT = 0; setToggle(fillBtn, false); setToggle(lineBtn, false); }
    if (name === 'coil') { placeCompasses('coil'); setCurrent(0); }
    if (name === 'force') { S.th.value = 0; S.th.velocity = 0; setCurrent(0); }
    if (name === 'motor') { setCurrent(0); S.w = 0; }
    lineKey = '';
    readoutLabels();
  }
  function setToggle(btn, on) { btn.setAttribute('aria-pressed', String(!!on)); }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  fillBtn.addEventListener('click', () => { Sound.click(); S.fill = !S.fill; setToggle(fillBtn, S.fill); if (S.fill) { S.fillT = 0; GR.forEach((g) => { g.a = rnd(-3.1, 3.1); }); } hideHint(); });
  lineBtn.addEventListener('click', () => { Sound.click(); S.lines = !S.lines; setToggle(lineBtn, S.lines); hideHint(); });
  dirBtn.addEventListener('click', () => { Sound.click(); S.dir = -S.dir; hideHint(); });
  $('#poleBtn').addEventListener('click', () => { Sound.click(); S.pole = -S.pole; hideHint(); });
  $$('.nudge').forEach((b) => b.addEventListener('click', () => { Sound.tick(); setCurrent(clamp(Math.round((S.I + +b.dataset.d) * 2) / 2, 0, 3)); hideHint(); }));

  /* ---------- 측정값 ---------- */
  const rl = [$('#l1'), $('#l2'), $('#l3')], rv = [$('#v1'), $('#v2'), $('#v3')];
  const RLAB = {
    magnet: ['자석 주변에 놓은 곳', '자기장의 방향', '켜 놓은 보기'],
    coil: ['전류', '코일의 극', '자기장의 세기'],
    force: ['도선에 흐르는 전류', '위쪽 자석의 극', '도선이 받는 힘'],
    motor: ['전류', '코일의 회전', '회전 방향'],
  };
  function readoutLabels() { RLAB[S.scene].forEach((l, i) => { if (rl[i].textContent !== l) rl[i].textContent = l; }); }
  const N_ = (s) => '<span class="nn">' + s + '</span>', S_ = (s) => '<span class="ss">' + s + '</span>';
  function zones() {
    const z = { n: false, s: false, m: false };
    comps.forEach((c) => {
      if (c.grab) return;
      const dN = Math.hypot(c.x - (MAG.x0 + 20), c.y - MAG.cy), dS = Math.hypot(c.x - (MAG.x1 - 20), c.y - MAG.cy);
      if (dN < 130 && c.x < MAG.x0 + 40 && !(c.y > 470)) z.n = true;
      if (dS < 130 && c.x > MAG.x1 - 40 && !(c.y > 470)) z.s = true;
      if (Math.abs(c.x - 400) < 80 && Math.abs(c.y - MAG.cy) > 48 && Math.abs(c.y - MAG.cy) < 170) z.m = true;
    });
    return z;
  }
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t; readoutLabels();
    let a, b, c;
    if (S.scene === 'magnet') {
      const z = zones(); const n = (z.n ? 1 : 0) + (z.s ? 1 : 0) + (z.m ? 1 : 0);
      a = n + ' / 3곳';
      b = '자석 바깥: ' + N_('N극') + ' → ' + S_('S극');
      c = S.fill && S.lines ? '철가루 + 자기력선' : S.fill ? '철가루' : S.lines ? '자기력선' : '없음';
    } else if (S.scene === 'coil') {
      const on = S.Is > 0.05;
      a = !S.I ? '꺼짐' : S.I.toFixed(1) + ' A';
      b = !on ? '극 없음' : S.dir > 0 ? '오른쪽 ' + N_('N') + ' · 왼쪽 ' + S_('S') : '왼쪽 ' + N_('N') + ' · 오른쪽 ' + S_('S');
      c = !on ? '없음' : S.I < 1 ? '약함' : S.I < 2.5 ? '보통' : '<span class="hot">강함</span>';
    } else if (S.scene === 'force') {
      a = !S.I ? '흐르지 않음' : S.dir > 0 ? '앞쪽 ⊙' : '뒤쪽 ⊗';
      b = S.pole > 0 ? N_('N극') : S_('S극');
      const f = S.Is * S.dirS * S.poleS;
      c = Math.abs(f) < 0.15 ? '거의 없음' : (f > 0 ? '오른쪽' : '왼쪽') + (Math.abs(f) > 2 ? ' (강함)' : Math.abs(f) > 1 ? ' (보통)' : ' (약함)');
    } else {
      const wa = Math.abs(S.w);
      a = !S.I ? '꺼짐' : S.I.toFixed(1) + ' A';
      b = wa < 0.3 ? '멈춤' : wa < 3 ? '느리게' : '<span class="hot">빠르게</span>';
      c = wa < 0.3 ? '—' : S.w > 0 ? '시계 반대 방향' : '시계 방향';
    }
    rv[0].innerHTML = a; rv[1].innerHTML = b; rv[2].innerHTML = c;
  }

  /* ================= 갱신 ================= */
  function update(dt, t) {
    S.Is = approach(S.Is, S.I, dt, 7);
    S.dirS = approach(S.dirS, S.dir, dt, 6);
    S.poleS = approach(S.poleS, S.pole, dt, 6);
    S.linesA = approach(S.linesA, S.lines ? 0.85 : 0, dt, 5);
    if (S.scene === 'magnet' || S.scene === 'coil') {
      const poles = polesNow();
      comps.forEach((c) => updateCompass(c, dt, poles));
      updateFilings(dt, poles);
    } else if (S.scene === 'force') {
      const f = S.Is * S.dirS * S.poleS / 3;
      S.th.target = clamp(f * 0.6, -0.62, 0.62);
      S.th.update(dt);
      const dx = Math.sin(S.th.value) * FP.L;
      if (dx > 95) S.holdR += dt; else S.holdR = 0;
      if (dx < -95) S.holdL += dt; else S.holdL = 0;
      if (S.holdR > 0.5) S.pushR = true;
      if (S.holdL > 0.5) S.pushL = true;
    } else if (S.scene === 'motor') {
      updateMotor(dt);
      if (Math.abs(S.w) > 4.6) S.fast = true;
      if (S.fast && S.I <= 1.2 && S.I > 0 && Math.abs(S.w) < 2.9 && Math.abs(S.w) > 0.3) S.slow = true;
    }
    // 코일 실험 기록
    if (S.scene === 'coil') {
      if (S.I >= 1) { S.sawOn = S.sawOn || S.Is > 0.9; S.dirsSeen[S.dir] = true; }
      if (S.sawOn && S.dirsSeen[1] && S.dirsSeen[-1]) S.sawRev = true;
      if (S.I > S.maxI) S.maxI = S.I;
      if (S.sawOn && S.I >= 2.5) S.sawStrong = true;
    }
    parts.update(dt);
  }

  /* ================= 퀴즈 그림 ================= */
  const FIG_TWO = '<svg viewBox="0 0 340 130" width="330" role="img" aria-label="전류 방향과 자석의 극을 바꾸었을 때의 네 가지 경우">' +
    '<rect x="4" y="4" width="332" height="122" rx="14" fill="#f3f6fc" stroke="#dde4ef"/>' +
    [['처음', 'N극 위 · 전류 ⊙', '→ 오른쪽'], ['전류만 반대', 'N극 위 · 전류 ⊗', '→ 왼쪽'], ['극만 반대', 'S극 위 · 전류 ⊙', '→ 왼쪽'], ['둘 다 반대', 'S극 위 · 전류 ⊗', '→ ?']].map((o, i) =>
      '<g transform="translate(' + (14 + i * 80) + ',14)"><rect width="72" height="102" rx="10" fill="#fff" stroke="#cfd8e6"/>' +
      '<text x="36" y="22" font-size="12" font-weight="800" text-anchor="middle" fill="#1b2333">' + o[0] + '</text>' +
      '<text x="36" y="48" font-size="10.5" font-weight="700" text-anchor="middle" fill="#5b667a">' + o[1].split(' · ')[0] + '</text>' +
      '<text x="36" y="64" font-size="10.5" font-weight="700" text-anchor="middle" fill="#5b667a">' + o[1].split(' · ')[1] + '</text>' +
      '<text x="36" y="92" font-size="13" font-weight="900" text-anchor="middle" fill="' + (i === 3 ? '#c2410c' : '#7c3aed') + '">' + o[2] + '</text></g>').join('') + '</svg>';

  /* ================= 단계별 학습 ================= */
  game = SciSim.game({
    simId: 'm2-electromagnet',
    mount: '#game',
    badge: '전자기 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      magnet: '🧲 막대자석', compass: '🧭 나침반 3개', coil: '🌀 전류가 흐르는 코일', force: '🏇 도선 그네와 말굽자석', motor: '⚙️ 전동기 모형',
    },
    onFeatures(set) { F = set; },
    levels: [
      /* ---------- 1단계 ---------- */
      {
        title: '자석 주변의 자기장', short: '자기장', icon: '🧭', phase: '관찰',
        features: ['magnet', 'compass'],
        intro: '<p class="si-q">❓ 탐구 질문: 전기로 움직이는 선풍기는 어떻게 날개를 돌릴까?</p>' +
          '<p>선풍기의 모터에는 <b>자석</b>과 <b>코일</b>이 들어 있어요. 먼저 자석 주변에서 일어나는 일을 살펴봐요. 자석 주위처럼 자석의 힘이 작용하는 공간을 <b>자기장</b>이라고 해요. 나침반을 여러 곳에 놓고 <b>자기장의 방향</b>을 알아봐요.</p>',
        setup() { setScene('magnet'); showHint('👆 나침반을 끌어 자석 주변에 놓아요', 7000); },
        recap: '자기장의 방향은 나침반 바늘의 <b>N극이 가리키는 방향</b>이에요. 자석 바깥에서는 <b>N극에서 나와 S극으로</b> 들어가요.',
        summary: '<ul><li><b>자기장</b>: 자석 주위처럼 자기력이 작용하는 공간</li>' +
          '<li>자기장의 방향: 그 자리에 놓은 나침반 바늘의 <b>N극이 가리키는 방향</b></li>' +
          '<li><b>자기력선</b>: 자기장의 방향을 이은 선. 자석 바깥에서 <b>N극 → S극</b> 방향이고, 자석 가까이(극 근처)일수록 촘촘하다.</li>' +
          '<li>철가루를 뿌리면 자기력선 모양의 무늬가 나타난다.</li></ul>',
        missions: [
          {
            title: '나침반으로 자기장의 방향 알아보기',
            goal: '나침반 3개를 <b>N극 가까이</b>, <b>S극 가까이</b>, 자석 <b>가운데 옆</b>에 하나씩 놓아 보세요. 바늘이 어디를 가리키나요?',
            hint: '나침반을 끌어서 막대자석의 왼쪽 끝(N극), 오른쪽 끝(S극), 위쪽 가운데에 놓아요.',
            setup() { setScene('magnet'); placeCompasses('magnet'); showHint('👆 나침반을 N극·S극·가운데 옆에 놓아요', 7000); },
            check: () => { const z = zones(); return S.scene === 'magnet' && z.n && z.s && z.m && comps.every((c) => Math.abs(c.vel) < 1.2); },
            status: () => { const z = zones(); return box(z.n) + ' N극 가까이 · ' + box(z.s) + ' S극 가까이 · ' + box(z.m) + ' 가운데 옆'; },
            hold: 0.8,
            explain: 'N극 가까이에서는 바늘의 N극이 자석에서 <b>멀어지는 쪽</b>, S극 가까이에서는 S극 <b>쪽을 향해</b> 가리켜요. 나침반 바늘의 N극이 가리키는 방향이 그 자리의 자기장 방향이에요.',
          },
          {
            type: 'quiz',
            title: '나침반 바늘이 가리키는 방향',
            goal: '나침반 바늘의 <b>N극(빨간 끝)</b>이 가리키는 방향은 무엇을 나타낼까요?',
            setup() { setScene('magnet'); },
            choices: [
              '그 자리에서 자기장의 방향',
              '자석의 S극이 있는 곳의 방향',
              '자석에서 가장 멀리 떨어진 방향',
              '항상 지구의 남쪽 방향',
            ],
            answer: 0,
            feedback: [
              '',
              'N극 가까이에서는 바늘의 N극이 S극 쪽이 아니라 자석에서 멀어지는 쪽을 가리켰어요. 바늘이 가리키는 방향을 다시 살펴보세요.',
              '나침반이 가리키는 방향은 놓은 위치마다 달라졌어요. 거리가 아니라 방향이에요.',
              '자석 가까이에서는 바늘이 자석의 영향을 받아 방향이 바뀌었죠?',
            ],
            explain: '나침반 바늘의 <b>N극이 가리키는 방향이 그 자리의 자기장 방향</b>이에요.',
          },
          {
            type: 'quiz',
            title: '자기력선의 방향',
            goal: '철가루와 자기력선을 켜 보세요. 막대자석 <b>바깥</b>에서 자기력선은 어느 방향일까요?',
            setup() { setScene('magnet'); S.fill = true; S.lines = true; S.fillT = 0; setToggle(fillBtn, true); setToggle(lineBtn, true); },
            choices: [
              'S극에서 나와 N극으로 들어간다',
              'N극에서 나와 S극으로 들어간다',
              '자석 바깥에서는 방향이 없다',
              '자석의 가운데에서 양쪽 끝으로 퍼져 나간다',
            ],
            answer: 1,
            feedback: [
              '반대로 알고 있어요. 보라색 화살표가 어느 극에서 시작하는지 보세요.',
              '',
              '철가루가 늘어선 선 위의 화살표를 보세요. 방향이 있어요.',
              '자기력선은 자석의 극에서 시작하고 끝나요. 가운데에서 나오지 않아요.',
            ],
            explain: '자석 바깥에서 자기력선은 <b>N극에서 나와 S극으로</b> 들어가요. 극 가까이에서는 철가루가 촘촘해져 자기장이 센 것을 알 수 있어요.',
          },
        ],
      },
      /* ---------- 2단계 ---------- */
      {
        title: '전류가 흐르는 코일: 전자석', short: '코일과 전류', icon: '🌀', phase: '실험',
        features: ['coil'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 나침반으로 자석 주변의 자기장 방향을 알아보았어요.</div>' +
          '<p>자석이 아닌 <b>코일</b>에 전류를 흘리면 나침반이 어떻게 될까요? 전류를 흘리고, 전류의 <b>방향</b>과 <b>세기</b>를 바꾸어 자기장이 어떻게 달라지는지 살펴봐요.</p>',
        setup() { setScene('coil'); showHint('👆 전류의 세기 슬라이더를 움직여 전류를 흘려 보세요', 7000); },
        recap: '코일에 전류가 흐르면 막대자석처럼 자기장이 생겨요(전자석). 전류의 <b>방향</b>을 바꾸면 자기장의 방향이, 전류를 <b>세게</b> 하면 자기장의 세기가 바뀌어요.',
        summary: '<ul><li>전류가 흐르는 코일 주위에는 <b>자기장</b>이 생긴다. 코일은 막대자석처럼 N극과 S극을 가진 <b>전자석</b>이 된다.</li>' +
          '<li>전류의 <b>방향</b>을 바꾸면 자기장의 <b>방향</b>이 반대가 된다. (N극과 S극이 서로 바뀐다.)</li>' +
          '<li>전류를 <b>세게</b> 흘릴수록 자기장이 <b>세진다</b>. (나침반이 더 크게 움직이고, 철가루가 더 뚜렷해진다.)</li>' +
          '<li>전류가 흐르지 않으면 자기장이 없다. 전자석은 전류로 자기장을 켜고 끌 수 있다.</li></ul>',
        missions: [
          {
            title: '코일에서 세 가지 변화 확인하기',
            goal: '① 전류를 흘려 나침반 바늘을 움직이고 ② <b>전류 방향을 바꿔</b> 보고 ③ 전류를 <b>2.5 A 이상</b> 세게 해 보세요.',
            hint: '전류의 세기 슬라이더를 오른쪽으로 밀고, [전류 방향 바꾸기] 버튼을 눌러 봐요. 철가루도 함께 살펴보세요.',
            setup() { setScene('coil'); setCurrent(0); setDir(1); S.sawOn = false; S.sawRev = false; S.sawStrong = false; S.dirsSeen = {}; S.maxI = 0; },
            check: () => S.scene === 'coil' && S.sawOn && S.sawRev && S.sawStrong && S.I >= 1,
            status: () => box(S.sawOn) + ' 전류 흘리기 · ' + box(S.sawRev) + ' 방향 바꾸기 · ' + box(S.sawStrong) + ' 2.5 A 이상 · 지금 ' + (S.I ? S.I.toFixed(1) : '0.0') + ' A',
            hold: 0.6,
            explain: '전류가 흐르면 바늘이 움직여 자기장이 생겼음을 알 수 있어요. 방향을 바꾸면 바늘이 <b>반대로</b> 돌고 N극·S극이 바뀌며, 전류를 세게 하면 자기장이 <b>더 세져요</b>(철가루가 진해져요).',
          },
          {
            type: 'quiz',
            title: '전류 방향을 바꾸면?',
            goal: '전류가 흐르는 코일에서 <b>전류의 방향을 반대로</b> 바꾸면 나침반 바늘과 코일의 극은 어떻게 될까요?',
            setup() { setScene('coil'); if (S.I < 1) setCurrent(2); },
            choices: [
              '아무 변화가 없다',
              '자기장이 없어진다',
              '자기장의 방향이 반대가 되어 나침반 바늘이 반대로 돌고, N극과 S극이 서로 바뀐다',
              '자기장의 세기만 약해진다',
            ],
            answer: 2,
            feedback: [
              '방향을 바꿨을 때 나침반 바늘이 어떻게 됐는지 다시 보세요.',
              '전류가 계속 흐르는 한 자기장은 생겨요. 극의 N, S 표시를 확인해 보세요.',
              '',
              '전류의 세기는 그대로예요. 바뀐 것은 극의 위치(방향)예요.',
            ],
            explain: '전류의 방향이 바뀌면 <b>자기장의 방향도 반대</b>가 돼요. 그래서 나침반 바늘이 반대로 돌고, 코일의 N극과 S극이 서로 바뀌어요.',
          },
          {
            type: 'quiz',
            title: '전자석을 더 세게 만들려면?',
            goal: '코일(전자석)의 자기장을 <b>더 세게</b> 하려면 어떻게 해야 할까요?',
            setup() { setScene('coil'); },
            choices: [
              '전류의 방향을 반대로 바꾼다',
              '전류를 더 세게 흘린다',
              '스위치를 열어 전류를 끊는다',
              '나침반을 코일에서 멀리 놓는다',
            ],
            answer: 1,
            feedback: [
              '방향을 바꾸면 극이 바뀔 뿐 자기장의 세기는 같아요.',
              '',
              '전류가 끊기면 자기장이 없어져요. 더 약해지는 거죠.',
              '나침반의 위치는 자기장의 세기 자체를 바꾸지 않아요.',
            ],
            explain: '전류를 <b>세게</b> 흘릴수록 코일 주위의 자기장이 세져요. 그래서 전자석은 전류의 세기로 자석의 힘을 조절할 수 있어요.',
          },
        ],
      },
      /* ---------- 3단계 ---------- */
      {
        title: '자기장 속 전류가 받는 힘', short: '자기장 속 전류', icon: '🏇', phase: '탐구',
        features: ['force'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전류가 흐르는 코일이 자석처럼 자기장을 만든다는 것을 알았어요.</div>' +
          '<p>그렇다면 <b>자석의 자기장 속에 전류가 흐르는 도선</b>을 넣으면 어떻게 될까요? 자석 사이에 매단 도선(<b>도선 그네</b>)에 전류를 흘리고, 도선이 받는 힘의 방향을 살펴봐요.</p>',
        setup() { setScene('force'); setCurrent(0); showHint('👆 전류의 세기를 올려 도선 그네를 밀어 보세요', 7000); },
        recap: '자기장 속에서 전류가 흐르는 도선은 <b>힘</b>을 받아요. 전류의 방향이나 자석의 극을 바꾸면 힘의 방향이 반대가 되고, 전류가 셀수록 힘이 세져요.',
        summary: '<ul><li>자기장 속에서 전류가 흐르는 도선은 <b>힘</b>을 받는다.</li>' +
          '<li>전류의 방향을 반대로 하면 힘의 방향도 <b>반대</b>가 된다.</li>' +
          '<li>자석의 N극과 S극을 바꾸어 자기장의 방향을 반대로 해도 힘의 방향이 <b>반대</b>가 된다.</li>' +
          '<li>전류가 <b>셀수록</b> 도선이 받는 힘이 커진다.</li>' +
          '<li>(전류의 방향과 자석의 극을 <b>둘 다</b> 바꾸면 힘의 방향은 처음과 같다.)</li></ul>',
        missions: [
          {
            title: '그네를 양쪽으로 밀어내기',
            goal: '도선 그네를 자석 사이에서 <b>오른쪽 바깥</b>으로, 또 <b>왼쪽 바깥</b>으로 밀어내 보세요. (자석 폭 밖으로 나가야 해요.)',
            hint: '전류를 2.5 A 이상으로 하면 크게 움직여요. 방향을 바꾸려면 [전류 방향 바꾸기]나 [자석의 N극·S극 바꾸기]를 눌러요.',
            setup() { setScene('force'); setCurrent(0); setDir(1); setPole(1); S.pushR = false; S.pushL = false; S.holdR = 0; S.holdL = 0; },
            check: () => S.scene === 'force' && S.pushR && S.pushL,
            status: () => box(S.pushR) + ' 오른쪽으로 밀어냄 · ' + box(S.pushL) + ' 왼쪽으로 밀어냄 · 전류 ' + (S.I ? S.I.toFixed(1) : '0.0') + ' A',
            hold: 0.3,
            explain: '전류가 흐르는 도선이 자기장 속에서 받는 힘의 방향은 <b>전류의 방향</b>이나 <b>자석의 극</b> 중 하나만 바꿔도 반대가 돼요. 전류가 셀수록 더 크게 움직여요.',
          },
          {
            type: 'quiz',
            title: '둘 다 바꾸면?',
            goal: '전류의 방향과 자석의 N극·S극을 <b>둘 다</b> 반대로 바꾸면 도선 그네는 처음과 비교해 어느 쪽으로 움직일까요? (직접 해 보아도 좋아요!)',
            figure: FIG_TWO,
            setup() { setScene('force'); setCurrent(2); setDir(1); setPole(1); },
            choices: [
              '처음과 반대 방향으로 움직인다',
              '처음과 같은 방향으로 움직인다',
              '움직이지 않는다',
              '위아래로 움직인다',
            ],
            answer: 1,
            feedback: [
              '둘 중 하나만 바꾸면 반대가 돼요. 그런데 둘 다 바꾸면? 한 번 더 뒤집히는 셈이에요.',
              '',
              '전류와 자기장은 그대로 있으니 힘은 여전히 작용해요.',
              '힘은 좌우 방향으로 작용했어요. 화면의 힘 화살표를 보세요.',
            ],
            explain: '하나를 바꾸면 방향이 한 번 뒤집히고, <b>둘 다 바꾸면 두 번 뒤집혀 처음과 같은 방향</b>이 돼요.',
          },
        ],
      },
      /* ---------- 4단계 ---------- */
      {
        title: '전동기의 원리', short: '전동기', icon: '⚙️', phase: '모형',
        features: ['motor'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자기장 속의 전류는 힘을 받는다는 것을 알았어요.</div>' +
          '<p>이 힘을 이용해 코일을 <b>계속 회전</b>시키는 장치가 <b>전동기(모터)</b>예요. 코일의 두 변이 받는 힘과 <b>정류자</b>가 하는 일을 살펴보고, 전류의 세기에 따른 회전 빠르기를 확인해 봐요.</p>',
        setup() { setScene('motor'); setCurrent(0); showHint('👆 전류의 세기 슬라이더를 올려 모터를 돌려 보세요', 7000); },
        recap: '전동기는 자기장 속에서 전류가 흐르는 코일이 받는 힘으로 회전해요. 정류자가 반 바퀴마다 전류 방향을 바꿔 계속 한 방향으로 돌고, 전류가 셀수록 빨리 돌아요.',
        summary: '<ul><li><b>전동기(모터)</b>: 자기장 속에 놓인 코일에 전류를 흘려, 코일이 받는 힘으로 회전하는 장치</li>' +
          '<li>코일의 두 변은 전류의 방향이 서로 반대이므로 <b>반대 방향의 힘</b>을 받아 코일이 회전한다.</li>' +
          '<li><b>정류자</b>와 솔: 코일이 반 바퀴 돌 때마다 코일에 흐르는 전류의 방향을 바꾸어, 코일이 <b>계속 한 방향</b>으로 돌게 한다.</li>' +
          '<li>전류가 <b>셀수록</b> 힘이 커져 더 빨리 돈다. 전류의 방향을 바꾸면 회전 방향이 반대가 된다.</li>' +
          '<li>활용: 선풍기, 세탁기, 전기 자동차, 엘리베이터, 드론 등</li></ul>',
        missions: [
          {
            title: '전류 세기와 회전 빠르기',
            goal: '전류를 <b>2.5 A 이상</b>으로 해 모터를 빠르게 돌린 뒤, <b>1 A 이하</b>로 줄여 느리게 돌려 보세요.',
            hint: '슬라이더를 오른쪽 끝으로 밀고 잠시 기다린 뒤, 왼쪽으로 줄여 보세요. 천천히 돌 때까지 지켜봐요.',
            setup() { setScene('motor'); setCurrent(0); S.fast = false; S.slow = false; },
            check: () => S.scene === 'motor' && S.fast && S.slow,
            status: () => box(S.fast) + ' 빠르게 회전 · ' + box(S.slow) + ' 느리게 회전 · 전류 ' + (S.I ? S.I.toFixed(1) : '0.0') + ' A',
            hold: 0.5,
            explain: '전류가 셀수록 코일이 받는 힘이 커져서 모터가 <b>더 빨리</b> 돌아요. 전류가 약하면 힘이 작아 천천히 돌아요.',
          },
          {
            type: 'quiz',
            title: '전동기가 도는 원리',
            goal: '전동기에서 코일이 회전하는 까닭으로 알맞은 것은?',
            setup() { setScene('motor'); if (S.I < 1) setCurrent(2); },
            choices: [
              '코일 속의 전자가 자석에 달라붙기 때문',
              '자기장 속에서 전류가 흐르는 코일이 힘을 받기 때문',
              '자석이 코일에 전류를 만들어 주기 때문',
              '코일이 뜨거워져 팽창하기 때문',
            ],
            answer: 1,
            feedback: [
              '전자가 달라붙는 것이 아니라, 전류가 흐르는 도선이 자기장에서 힘을 받는 거예요(3단계).',
              '',
              '여기서는 전원 장치가 전류를 만들어 줘요. 자석은 자기장을 만들어 줘요.',
              '열이 아니라 자기장 속의 전류가 받는 힘 때문이에요.',
            ],
            explain: '자기장 속에서 <b>전류가 흐르는 코일이 힘을 받아</b> 회전해요. 코일의 두 변은 전류의 방향이 반대라서 반대 방향의 힘을 받아 돌아요.',
          },
          {
            type: 'quiz',
            title: '전동기를 이용한 기구',
            goal: '다음 중 <b>전동기(모터)</b>를 이용해 움직이는 것이 <b>아닌</b> 것은?',
            setup() { setScene('motor'); },
            choices: [
              '선풍기의 날개',
              '세탁기의 드럼',
              '전기 자동차의 바퀴',
              '백열전구의 불빛',
            ],
            answer: 3,
            feedback: [
              '선풍기는 전동기가 날개를 돌려요.',
              '세탁기는 전동기로 드럼을 돌려요.',
              '전기 자동차도 전동기가 바퀴를 돌려요.',
              '',
            ],
            explain: '선풍기, 세탁기, 전기 자동차, 엘리베이터, 드론은 모두 <b>전동기</b>로 움직여요. 백열전구는 전류가 필라멘트를 달궈 <b>빛과 열</b>을 내요(전동기를 쓰지 않아요).',
          },
        ],
      },
    ],
  });
  window.__sim = { S, comps, setScene, setCurrent, setDir, setPole, game: () => game, zones, placeCompasses };

  /* ---------- 시작 ---------- */
  setScene('magnet');
  let lastFree = null;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; sceneSeg.hidden = !lastFree; }
    update(dt, t);
    view.clear('#eaf0fb');
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eaf0fb'); g.addColorStop(1, '#f9fbff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = S.fade; ctx.translate(0, (1 - S.fade) * 12);
    if (S.scene === 'magnet') drawMagnetScene(t);
    else if (S.scene === 'coil') drawCoilScene(t, dt);
    else if (S.scene === 'force') drawForceScene(t);
    else drawMotorScene(t, dt);
    parts.draw(ctx);
    ctx.restore();
    updateReadouts(t);
  });
})();
