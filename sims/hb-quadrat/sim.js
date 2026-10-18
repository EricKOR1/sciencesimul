/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 방형구법으로 군집 조사 (단원 9차시)
   성취기준 [12생과01-07] 개체군과 군집의 특성을 이해하고 이들의 상호작용의 예를 조사하여 발표할 수 있다. (군집 조사 부분)
   ① 실험: 방형구 설치 (무작위 좌표, 식물 세기)  ② 기록: 밀도·빈도·피도  ③ 분석: 중요치와 우점종
   ④ 적용: 군집 해석 (종 수–방형구 수 곡선, 종 다양성, 수직 분포)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef7f0' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
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
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  /* 선 위의 점 (이차 곡선) */
  function ctl(x1, y1, x2, y2, bend) { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1; return [(x1 + x2) / 2 - dy / len * bend * 2, (y1 + y2) / 2 + dx / len * bend * 2]; }
  function qPts(x1, y1, x2, y2, bend, n) {
    const c = ctl(x1, y1, x2, y2, bend), out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * x1 + 2 * u * t * c[0] + t * t * x2, u * u * y1 + 2 * u * t * c[1] + t * t * y2]); }
    return out;
  }
  function cPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  const ptAt = (pts, f) => { const n = pts.length - 1, v = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(v)), r = v - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]; };
  /* 곡선을 prog(0~1)까지 그리고 화살촉을 붙여요 */
  function strokeCurve(pts, prog, col, w, o) {
    o = o || {};
    const n = pts.length - 1, upto = clamp(prog, 0, 1) * n, fi = Math.min(n, Math.floor(upto));
    if (upto <= 0) return null;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    let hx = pts[0][0], hy = pts[0][1], px = hx, py = hy;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    for (let i = 1; i <= fi; i++) { px = hx; py = hy; hx = pts[i][0]; hy = pts[i][1]; ctx.lineTo(hx, hy); }
    if (fi < n && upto > fi) { const f = upto - fi; px = hx; py = hy; hx = pts[fi][0] + (pts[fi + 1][0] - pts[fi][0]) * f; hy = pts[fi][1] + (pts[fi + 1][1] - pts[fi][1]) * f; ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.setLineDash([]);
    if (!o.noHead && upto > 0.6) {
      const head = o.head || Math.max(10, w * 2.8), dx = hx - px, dy = hy - py, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const bx = hx - ux * head, by = hy - uy * head;
      ctx.beginPath(); ctx.moveTo(hx + ux * 2, hy + uy * 2); ctx.lineTo(bx - uy * head * 0.5, by + ux * head * 0.5); ctx.lineTo(bx + uy * head * 0.5, by - ux * head * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return [hx, hy];
  }

  const S = { mode: 'field', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const ease = SciSim.ease;

  /* =========================================================
     가상 초지 자료 (방형구 10개 = 10 m², 종 4가지)
     ========================================================= */
  const SP = [
    { k: 'A', n: '토끼풀', col: '#16a34a', tag: '#22a04a' },
    { k: 'B', n: '질경이', col: '#a16207', tag: '#d97706' },
    { k: 'C', n: '쑥', col: '#6d6bd6', tag: '#7c3aed' },
    { k: 'D', n: '강아지풀', col: '#0891b2', tag: '#0ea5e9' },
  ];
  const NQ = 10, QAREA = 1, TOTAL_AREA = NQ * QAREA;
  const CNT = [[4, 5, 5, 6, 3, 0, 0, 4, 2, 1], [0, 0, 2, 3, 0, 0, 2, 0, 1, 2], [0, 0, 0, 0, 0, 2, 0, 1, 0, 2], [7, 5, 6, 8, 0, 5, 6, 9, 4, 5]];
  const COV = [[53, 67, 67, 80, 40, 0, 0, 53, 27, 13], [0, 0, 20, 30, 0, 0, 20, 0, 10, 20], [0, 0, 0, 0, 0, 100, 0, 100, 0, 100], [25, 18, 22, 29, 0, 18, 22, 33, 15, 18]];   // 방형구마다 종이 덮은 면적(%, 1 m² 기준)
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const TOT_CNT = CNT.map(sum), TOT_COV = COV.map((r) => sum(r) / 100), OCC = CNT.map((r) => r.filter((v) => v > 0).length);
  const DENS = TOT_CNT.map((n) => n / TOTAL_AREA), FREQ = OCC.map((o) => o / NQ), COVR = TOT_COV.map((c) => c / TOTAL_AREA);
  const REL_D = DENS.map((v) => v / sum(DENS) * 100), REL_F = FREQ.map((v) => v / sum(FREQ) * 100), REL_C = COVR.map((v) => v / sum(COVR) * 100);
  const IV = SP.map((s, i) => REL_D[i] + REL_F[i] + REL_C[i]);
  const DOM = IV.indexOf(Math.max.apply(null, IV));
  const CUM_SP = []; (function () { const seen = {}; for (let q = 0; q < NQ; q++) { SP.forEach((s, i) => { if (CNT[i][q] > 0) seen[i] = true; }); CUM_SP.push(Object.keys(seen).length); } })();
  const cell = (i, q) => CNT[i][q];
  const covM2 = (i, q) => COV[i][q] / 100;
  const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1), fmt2 = (v) => (Math.round(v * 100) / 100).toFixed(2);

  /* ---------- 식물 그리기 ---------- */
  function drawPlant(kind, x, y, r, t, ph, tint) {
    const sw = RM ? 0 : Math.sin((t || 0) * 1.6 + (ph || 0)) * 0.07;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    if (tint) ctx.globalAlpha = tint;
    if (kind === 0) {            // 토끼풀: 잎 세 장
      ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(0, 0); ctx.stroke();
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * TAU / 3; ctx.fillStyle = k === 1 ? '#49b955' : '#3fae4a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 - r * 0.05, r * 0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(0.8, r * 0.07); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 - r * 0.05, r * 0.28, a + 2.4, a + 3.9); ctx.stroke(); }
    } else if (kind === 1) {     // 질경이: 로제트
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; ctx.save(); ctx.rotate(a); ctx.fillStyle = k % 2 ? '#7a9a2c' : '#6a8a24'; ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.62, r * 0.27, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(0.7, r * 0.05); ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 1.0, 0); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = '#a8c050'; ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fill();
    } else if (kind === 2) {     // 쑥: 갈라진 큰 잎
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + 0.2; ctx.save(); ctx.rotate(a); ctx.fillStyle = k % 2 ? '#8db5a4' : '#7aa593'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.45, -r * 0.2); ctx.lineTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.2); ctx.lineTo(r * 1.0, 0); ctx.lineTo(r * 0.8, r * 0.2); ctx.lineTo(r * 0.5, r * 0.5); ctx.lineTo(r * 0.45, r * 0.2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#e6f0ec'; ctx.lineWidth = Math.max(0.8, r * 0.05); ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 0.9, 0); ctx.stroke(); ctx.restore(); }
    } else {                     // 강아지풀: 줄기와 이삭
      for (let k = -1; k <= 1; k++) { const ex = k * r * 0.55, ey = -r * (0.95 - Math.abs(k) * 0.18); ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(k * r * 0.1, r * 0.8); ctx.quadraticCurveTo(ex * 0.3, 0, ex, ey); ctx.stroke(); ctx.fillStyle = '#d9e382'; ctx.beginPath(); ctx.ellipse(ex, ey - r * 0.15, r * 0.14, r * 0.34, k * 0.25, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(190,200,90,.9)'; ctx.lineWidth = Math.max(0.6, r * 0.04); for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(ex, ey - r * 0.15 + j * r * 0.1); ctx.lineTo(ex + r * 0.17, ey - r * 0.15 + j * r * 0.1 - r * 0.05); ctx.stroke(); } }
    }
    ctx.restore();
  }
  const GLYPH_R = [4.4, 5, 8.6, 5.4];       // 초지 그림에서 식물 그림 크기(px, 36px/m 기준)

  /* =========================================================
     초지(항공 시점)와 방형구 10개의 무작위 좌표
     ========================================================= */
  const FD = PHONE ? { x: 12, y: 112, w: 456, h: 274 } : { x: 40, y: 84, w: 720, h: 432 };
  const M2P = FD.w / 20;
  const QPOS = (function () {
    const rr = mulberry(310), out = [];
    while (out.length < NQ) { const u = 1 + rr() * 17.5, v = 1 + rr() * 9.5; if (out.every((p) => Math.hypot(p[0] - u, p[1] - v) > 3.0)) out.push([Math.round(u * 10) / 10, Math.round(v * 10) / 10]); }
    return out;
  })();
  const qRect = (q) => ({ x: FD.x + QPOS[q][0] * M2P, y: FD.y + QPOS[q][1] * M2P, w: M2P, h: M2P });
  // 방형구 안의 식물 위치 (종, 위치 u,v: 0~1 m, 덮은 면적 반지름 m)
  const QPLANTS = (function () {
    const out = [];
    for (let q = 0; q < NQ; q++) {
      const rr = mulberry(900 + q * 17), pl = [];
      for (let s = 0; s < 4; s++) {
        const c = CNT[s][q]; if (!c) continue;
        const area = COV[s][q] / 100 / c, rad = Math.sqrt(area / Math.PI);
        for (let i = 0; i < c; i++) pl.push({ s, u: 0.13 + rr() * 0.74, v: 0.13 + rr() * 0.74, rad, ph: rr() * TAU });
      }
      // 서로 겹치지 않도록 밀어내기 (눌러서 셀 수 있게 최소 간격 0.16 m)
      for (let it = 0; it < 160; it++) {
        let moved = false;
        for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
          let dx = pl[j].u - pl[i].u, dy = pl[j].v - pl[i].v, d = Math.hypot(dx, dy);
          if (d < 0.165) { if (d < 1e-4) { dx = rr() - 0.5; dy = rr() - 0.5; d = Math.hypot(dx, dy) || 1; } const push = (0.165 - d) / 2 + 0.002; dx /= d; dy /= d; pl[i].u -= dx * push; pl[i].v -= dy * push; pl[j].u += dx * push; pl[j].v += dy * push; moved = true; }
        }
        pl.forEach((p) => { p.u = clamp(p.u, 0.12, 0.88); p.v = clamp(p.v, 0.12, 0.88); });
        if (!moved) break;
      }
      out.push(pl);
    }
    return out;
  })();
  // 방형구 밖의 식물 (평균 밀도로 그림, 그림과 계산이 어긋나지 않게 방형구 안에는 만들지 않아요)
  const FIELD_PLANTS = (function () {
    const rr = mulberry(77), out = [], dens = DENS;
    const inQ = (u, v) => QPOS.some((p) => u >= p[0] - 0.1 && u <= p[0] + 1.1 && v >= p[1] - 0.1 && v <= p[1] + 1.1);
    for (let s = 0; s < 4; s++) {
      const n = Math.round(dens[s] * (240 - NQ));
      for (let i = 0; i < n; i++) { let u, v, g = 0; do { u = rr() * 20; v = rr() * 12; g++; } while (inQ(u, v) && g < 30); out.push({ s, u, v, ph: rr() * TAU }); }
    }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); const tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
    out.sort((a, b) => a.v - b.v);
    return out;
  })();
  let fieldCanvas = null;
  function buildField() {
    fieldCanvas = document.createElement('canvas'); fieldCanvas.width = VW; fieldCanvas.height = VH;
    const c2 = fieldCanvas.getContext('2d');
    c2.save();
    const g = c2.createLinearGradient(0, FD.y, 0, FD.y + FD.h); g.addColorStop(0, '#9ed27a'); g.addColorStop(1, '#7fbe62');
    c2.fillStyle = g; c2.beginPath(); c2.roundRect ? c2.roundRect(FD.x, FD.y, FD.w, FD.h, 16) : c2.rect(FD.x, FD.y, FD.w, FD.h); c2.fill(); c2.clip();
    const rr = mulberry(5);
    for (let i = 0; i < 700; i++) { c2.strokeStyle = i % 2 ? 'rgba(60,130,50,.18)' : 'rgba(210,240,160,.2)'; c2.lineWidth = 1.2; const x = FD.x + rr() * FD.w, y = FD.y + rr() * FD.h; c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + (rr() - 0.5) * 5, y - 4 - rr() * 4); c2.stroke(); }
    drawPlantsTo(c2);
    c2.restore();
  }
  function drawPlantsTo(c2) {
    const pl = FIELD_PLANTS;
    const sc = M2P / 36;
    pl.forEach((p) => paintPlant(c2, p.s, FD.x + p.u * M2P, FD.y + p.v * M2P, GLYPH_R[p.s] * sc, p.ph));
    QPLANTS.forEach((arr, q) => arr.forEach((p) => { const r = qRect(q); paintPlant(c2, p.s, r.x + p.u * M2P, r.y + p.v * M2P, GLYPH_R[p.s] * sc, p.ph); }));
  }
  function paintPlant(c2, kind, x, y, r) {
    c2.save(); c2.translate(x, y);
    if (kind === 0) { c2.strokeStyle = '#2f7d3a'; c2.lineWidth = Math.max(1, r * 0.12); c2.beginPath(); c2.moveTo(0, r * 0.9); c2.lineTo(0, 0); c2.stroke(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * TAU / 3; c2.fillStyle = k === 1 ? '#49b955' : '#3fae4a'; c2.beginPath(); c2.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 - r * 0.05, r * 0.5, 0, TAU); c2.fill(); } }
    else if (kind === 1) { for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; c2.save(); c2.rotate(a); c2.fillStyle = k % 2 ? '#7a9a2c' : '#6a8a24'; c2.beginPath(); c2.ellipse(r * 0.55, 0, r * 0.62, r * 0.27, 0, 0, TAU); c2.fill(); c2.restore(); } c2.fillStyle = '#a8c050'; c2.beginPath(); c2.arc(0, 0, r * 0.16, 0, TAU); c2.fill(); }
    else if (kind === 2) { for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + 0.2; c2.save(); c2.rotate(a); c2.fillStyle = k % 2 ? '#8db5a4' : '#7aa593'; c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(r * 0.45, -r * 0.2); c2.lineTo(r * 0.5, -r * 0.5); c2.lineTo(r * 0.8, -r * 0.2); c2.lineTo(r, 0); c2.lineTo(r * 0.8, r * 0.2); c2.lineTo(r * 0.5, r * 0.5); c2.lineTo(r * 0.45, r * 0.2); c2.closePath(); c2.fill(); c2.restore(); } }
    else { for (let k = -1; k <= 1; k++) { const ex = k * r * 0.55, ey = -r * (0.95 - Math.abs(k) * 0.18); c2.strokeStyle = '#7a9a3a'; c2.lineWidth = Math.max(1, r * 0.1); c2.beginPath(); c2.moveTo(k * r * 0.1, r * 0.8); c2.quadraticCurveTo(ex * 0.3, 0, ex, ey); c2.stroke(); c2.fillStyle = '#d9e382'; c2.beginPath(); c2.ellipse(ex, ey - r * 0.15, r * 0.14, r * 0.34, k * 0.25, 0, TAU); c2.fill(); } }
    c2.restore();
  }
  buildField();

  /* ---------- 방형구 설치 상태 ---------- */
  function resetField() {
    S.fld = { placed: 0, drop: Array.from({ length: NQ }, () => ({ k: 0 })), mode: 'rand', ghost: null, log: [], biasN: 0, sel: 0 };
    S.zoomQ = 0; S.zoomK = 1; S.zoomOpen = false;
    S.zoom = { q: 0, marked: {}, covSeen: {}, done: {}, pop: {} };
  }
  function throwQuad() {
    const f = S.fld; if (f.placed >= NQ) { showHint('방형구 10개를 모두 설치했어요.', 2200); return; }
    const q = f.placed++; f.log.push(q); const d = f.drop[q]; d.k = 0; SciSim.tween(d, { k: 1 }, { duration: RM ? 0.01 : 0.85, ease: 'outBounce' });
    Sound.success(); const r = qRect(q);
    setTimeout(() => { parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 7, colors: ['#fff', '#fde68a'], speed: 60, size: 2.6, life: 0.5, gravity: 40 }); }, RM ? 0 : 520);
    f.sel = q; hideHint(); updateCtl();
  }
  const plantCountNear = (u, v) => FIELD_PLANTS.filter((p) => p.u >= u - 0.5 && p.u <= u + 0.5 && p.v >= v - 0.5 && p.v <= v + 0.5).length;
  function fieldDown(p) {
    const f = S.fld;
    // 설치한 방형구를 누르면 열어서 세기
    for (let q = f.placed - 1; q >= 0; q--) { const r = qRect(q); if (p.x >= r.x - 6 && p.x <= r.x + r.w + 6 && p.y >= r.y - 6 && p.y <= r.y + r.h + 6 && f.drop[q].k > 0.9) { openZoom(q); return false; } }
    if (f.mode === 'free' && p.x >= FD.x && p.x <= FD.x + FD.w && p.y >= FD.y && p.y <= FD.y + FD.h) {
      const u = (p.x - FD.x) / M2P, v = (p.y - FD.y) / M2P, n = plantCountNear(u, v);
      f.ghost = { x: p.x, y: p.y, t0: S.clock, n }; f.biasN++; Sound.fail();
      showHint('내가 고른 칸에는 식물이 ' + n + '포기예요. 초지 평균은 1 m²에 약 10포기예요. ' + (n > 10 ? '눈에 띄는 곳만 고르면 결과가 한쪽으로 치우쳐요(편향).' : '마음대로 고르면 조사자의 선택이 결과에 섞여요(편향).') + ' 무작위 좌표를 써요.', 6200);
    }
    return false;
  }
  function openZoom(q) {
    S.zoom.q = q; S.fld.sel = q; S.zoomK = 0; SciSim.tween(S, { zoomK: 1 }, { duration: RM ? 0.01 : 0.55, ease: 'outCubic' });
    const key = 'q' + q; if (!S.zoom.marked[key]) S.zoom.marked[key] = {};
    setMode('zoom'); Sound.click();
  }
  function drawField(dt, t, dim) {
    const f = S.fld;
    bgFill('#eaf5e4', '#f1f8ea');
    T(FD.x, FD.y - (PHONE ? 54 : 44), '🌱 가상 초지 (가로 20 m × 세로 12 m = 240 m²)', PHONE ? 15 : 18, '#14532d', 'left', 800);
    T(FD.x, FD.y - (PHONE ? 30 : 20), PHONE ? '방형구(1 m × 1 m)를 무작위 좌표에 설치해요' : '방형구(1 m × 1 m)를 무작위 좌표 10곳에 설치해 식물을 세요', PHONE ? 13 : 14.5, '#475569', 'left', 700);
    D.shadow(() => { D.roundRect(FD.x, FD.y, FD.w, FD.h, 16); ctx.fillStyle = '#8bc56a'; ctx.fill(); }, { blur: 10, y: 3 });
    ctx.drawImage(fieldCanvas, 0, 0, VW, VH, 0, 0, VW, VH);
    // 가장자리
    D.roundRect(FD.x, FD.y, FD.w, FD.h, 16); ctx.lineWidth = 3; ctx.strokeStyle = '#5a8f45'; ctx.stroke();
    // 방형구
    for (let q = 0; q < f.placed; q++) {
      const r = qRect(q), d = f.drop[q], k = d.k, oy = (1 - clamp(k, 0, 1)) * -110;
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,' + (0.18 * clamp(k, 0, 1)) + ')'; ctx.fillRect(r.x + 2, r.y + 3, r.w, r.h);
      const sel = S.zoom && S.zoom.done['q' + q];
      ctx.save(); ctx.translate(0, oy);
      ctx.strokeStyle = sel ? '#16a34a' : '#fff'; ctx.lineWidth = Math.max(2.2, M2P * 0.09); ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach((c) => D.sphere(r.x + c[0] * r.w, r.y + c[1] * r.h, Math.max(2.4, M2P * 0.08), '#ef4444', { gloss: false }));
      ctx.restore();
      if (k > 0.95) { D.label(r.x + r.w / 2, r.y - (PHONE ? 9 : 11), String(q + 1), { bg: sel ? '#16a34a' : '#1f2d44', size: PHONE ? 11 : 12.5, pad: 5 }); if (!dim && f.placed >= NQ) { /* 열기 표시 */ } }
    }
    // 마음대로 고른 칸 (편향 경고)
    if (f.ghost) { const g = f.ghost, a = 1 - (t - g.t0) * 0.5; if (a > 0 && !dim) { ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.strokeRect(g.x - M2P / 2, g.y - M2P / 2, M2P, M2P); ctx.setLineDash([]); T(g.x, g.y - M2P / 2 - 8, '✖ 편향', 14, '#dc2626', 'center', 800, { stroke: '#fff', strokeWidth: 4 }); ctx.restore(); } else f.ghost = null; }
    // 범례
    const ly = FD.y + FD.h + (PHONE ? 22 : 24);
    SP.forEach((s, i) => {
      const x = FD.x + (PHONE ? (i % 2) * 226 : i * 176), y = ly + (PHONE ? Math.floor(i / 2) * 36 : 0);
      ctx.save(); ctx.translate(x + 14, y + 4); paintPlant(ctx, i, 0, 0, 11, 0); ctx.restore();
      T(x + 32, y + 10, s.k + ' ' + s.n, PHONE ? 14 : 15, '#26324a', 'left', 800);
    });
    if (PHONE) { T(FD.x, ly + 94, f.placed >= NQ ? '방형구 ' + NQ + '개 설치 완료 · 칸을 눌러 식물을 세요' : '설치한 방형구 ' + f.placed + ' / ' + NQ, 14, '#334155', 'left', 800); }
    else { D.label(FD.x + FD.w - 110, ly + 6, f.placed >= NQ ? '✅ 방형구 ' + NQ + '개 설치 · 칸을 눌러 세요' : '설치한 방형구 ' + f.placed + ' / ' + NQ, { bg: f.placed >= NQ ? '#15803d' : '#475569', size: 14 }); }
    if (!dim) { parts.update(dt); parts.draw(ctx); }
  }

  /* =========================================================
     방형구 확대: 식물 세기와 덮은 면적 읽기
     ========================================================= */
  const ZQ = PHONE ? { x: 40, y: 52, w: 400, h: 400 } : { x: 30, y: 64, w: 440, h: 440 };
  const ZT = PHONE ? { x: 6, y: 462, w: 468, h: 172 } : { x: 490, y: 64, w: 300, h: 440 };
  const zpx = ZQ.w;                  // 1 m = zpx 픽셀
  function zPlants(q) { return QPLANTS[q]; }
  const zMarked = (q) => S.zoom.marked['q' + q] || (S.zoom.marked['q' + q] = {});
  const zCounts = (q) => { const m = zMarked(q), c = [0, 0, 0, 0]; zPlants(q).forEach((p, i) => { if (m[i]) c[p.s]++; }); return c; };
  function zoomDone(q) {
    const c = zCounts(q), tot = [0, 1, 2, 3].map((s) => CNT[s][q]);
    if (c.some((v, i) => v !== tot[i])) return false;
    return [0, 1, 2, 3].every((s) => !tot[s] || S.zoom.covSeen['q' + q + '_' + s]);
  }
  function zoomDown(p) {
    const q = S.zoom.q;
    if (S.zoomK < 0.9) return false;
    if (p.x >= ZQ.x && p.x <= ZQ.x + ZQ.w && p.y >= ZQ.y && p.y <= ZQ.y + ZQ.h) {
      const pl = zPlants(q), m = zMarked(q); let best = -1, bd = 1e9;
      pl.forEach((a, i) => { const d = Math.hypot(p.x - (ZQ.x + a.u * zpx), p.y - (ZQ.y + a.v * zpx)); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd <= (PHONE ? 30 : 34)) {
        m[best] = !m[best]; const a = pl[best]; Sound.tick();
        if (m[best]) parts.burst(ZQ.x + a.u * zpx, ZQ.y + a.v * zpx, { count: 5, colors: [SP[a.s].tag, '#fff'], speed: 60, size: 2.4, life: 0.4, gravity: 0 });
        if (zoomDone(q) && !S.zoom.done['q' + q]) { S.zoom.done['q' + q] = true; Sound.success(); parts.burst(ZQ.x + ZQ.w / 2, ZQ.y + ZQ.h / 2, { count: 18, colors: ['#16a34a', '#fde047', '#fff'], speed: 140, size: 3.5, life: 0.9 }); updateCtl(); }
      }
      return false;
    }
    for (let s = 0; s < 4; s++) { const r = zRow(s); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { const k = 'q' + q + '_' + s; S.zoom.covSeen[k] = !S.zoom.covSeen[k] ? true : S.zoom.covSeen[k]; S.zoom.hl = S.zoom.hl === s ? -1 : s; Sound.click(); if (zoomDone(q) && !S.zoom.done['q' + q]) { S.zoom.done['q' + q] = true; Sound.success(); updateCtl(); } return false; } }
    return false;
  }
  const zRow = (s) => PHONE ? { x: ZT.x + 8 + (s % 2) * 232, y: ZT.y + 36 + Math.floor(s / 2) * 58, w: 226, h: 52 } : { x: ZT.x + 10, y: ZT.y + 58 + s * 84, w: ZT.w - 20, h: 76 };
  function drawZoom(dt, t) {
    drawField(dt, t, true);
    const k = clamp(S.zoomK, 0, 1), q = S.zoom.q, r0 = qRect(q);
    ctx.fillStyle = 'rgba(234,245,228,' + (0.97 * k) + ')'; ctx.fillRect(0, 0, VW, VH);
    // 확대 변환: 방형구 위치 → ZQ
    const sx = lerp(r0.w, ZQ.w, k) / ZQ.w, ox = lerp(r0.x, ZQ.x, k), oy = lerp(r0.y, ZQ.y, k);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4, 0, 1); ctx.translate(ox, oy); ctx.scale(sx, sx); ctx.translate(-ZQ.x, -ZQ.y);
    ctx.save(); ctx.beginPath(); ctx.rect(ZQ.x, ZQ.y, ZQ.w, ZQ.h); ctx.clip();
    const gg = ctx.createLinearGradient(0, ZQ.y, 0, ZQ.y + ZQ.h); gg.addColorStop(0, '#a6d981'); gg.addColorStop(1, '#8cc86a'); ctx.fillStyle = gg; ctx.fillRect(ZQ.x, ZQ.y, ZQ.w, ZQ.h);
    const rr = mulberry(33 + q); for (let i = 0; i < 160; i++) { ctx.strokeStyle = i % 2 ? 'rgba(60,130,50,.16)' : 'rgba(220,245,170,.2)'; ctx.lineWidth = 1.4; const x = ZQ.x + rr() * ZQ.w, y = ZQ.y + rr() * ZQ.h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rr() - 0.5) * 8, y - 6 - rr() * 6); ctx.stroke(); }
    const pl = zPlants(q), m = zMarked(q), hl = S.zoom.hl;
    // 덮은 면적 (반투명 원)
    const showAllCov = k >= 0.9;
    pl.forEach((a, i) => { const dim_ = hl != null && hl >= 0 && hl !== a.s; ctx.fillStyle = C.rgba(SP[a.s].tag, hl === a.s ? 0.42 : 0.16); ctx.strokeStyle = C.rgba(SP[a.s].tag, dim_ ? 0.2 : 0.7); ctx.lineWidth = hl === a.s ? 3 : 1.5; ctx.beginPath(); ctx.arc(ZQ.x + a.u * zpx, ZQ.y + a.v * zpx, a.rad * zpx, 0, TAU); ctx.fill(); ctx.stroke(); });
    const gl = [PHONE ? 15 : 17, PHONE ? 17 : 19, PHONE ? 25 : 28, PHONE ? 20 : 23];
    pl.forEach((a, i) => { const x = ZQ.x + a.u * zpx, y = ZQ.y + a.v * zpx; drawPlant(a.s, x, y, gl[a.s], t, a.ph); if (m[i]) { ctx.strokeStyle = '#1f2d44'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, gl[a.s] + 4, 0, TAU); ctx.stroke(); D.sphere(x + gl[a.s] * 0.8, y - gl[a.s] * 0.8, 9, SP[a.s].tag, { gloss: false, outline: '#fff', outlineWidth: 1.5, text: '✓', textScale: 1.3 }); } });
    ctx.restore();
    // 틀
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeRect(ZQ.x, ZQ.y, ZQ.w, ZQ.h); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(ZQ.x - 3, ZQ.y - 3, ZQ.w + 6, ZQ.h + 6);
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach((c) => D.sphere(ZQ.x + c[0] * ZQ.w, ZQ.y + c[1] * ZQ.h, 8, '#ef4444', { gloss: true }));
    ctx.restore();
    if (k < 0.5) return;
    ctx.globalAlpha = 1;
    // 눈금: 1 m
    T(ZQ.x + ZQ.w / 2, ZQ.y - 14, '방형구 ' + (q + 1) + '번 (1 m × 1 m = 1 m²)', PHONE ? 14 : 16, '#14532d', 'center', 800);
    // 표
    const c = zCounts(q);
    panel(ZT.x, ZT.y, ZT.w, ZT.h, 16);
    T(ZT.x + 14, ZT.y + 26, '📝 방형구 ' + (q + 1) + ' 기록', PHONE ? 14 : 16, '#26324a', 'left', 800);
    SP.forEach((s, i) => {
      const rw = zRow(i), tot = CNT[i][q], seen = S.zoom.covSeen['q' + q + '_' + i], on = hl === i;
      D.roundRect(rw.x, rw.y, rw.w, rw.h, 12); ctx.fillStyle = on ? C.rgba(s.tag, 0.16) : '#f8fafc'; ctx.fill(); ctx.lineWidth = on ? 3 : 1.8; ctx.strokeStyle = on ? s.tag : '#d5deea'; ctx.stroke();
      ctx.save(); ctx.translate(rw.x + 22, rw.y + rw.h / 2); paintPlant(ctx, i, 0, 0, 12, 0); ctx.restore();
      T(rw.x + 44, rw.y + (PHONE ? 22 : 26), s.k + ' ' + s.n, PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
      T(rw.x + 44, rw.y + (PHONE ? 43 : 48), '센 개체 수 ' + c[i] + '마리', PHONE ? 13 : 14.5, c[i] === tot && tot > 0 ? '#15803d' : '#475569', 'left', 800);
      if (!PHONE) T(rw.x + 44, rw.y + 68, seen ? '덮은 면적 ' + fmt2(covM2(i, q)) + ' m² (' + COV[i][q] + ' %)' : '👆 눌러서 덮은 면적 읽기', 13.5, seen ? s.tag : '#94a3b8', 'left', 800);
      else T(rw.x + rw.w - 8, rw.y + 22, seen ? fmt2(covM2(i, q)) + ' m²' : '👆 면적', 13, seen ? s.tag : '#94a3b8', 'right', 800);
    });
    if (S.zoom.done['q' + q]) D.label(PHONE ? ZT.x + ZT.w / 2 : ZT.x + ZT.w / 2, ZT.y + ZT.h - (PHONE ? 18 : 24), '✅ 이 방형구를 모두 읽었어요', { bg: '#15803d', size: PHONE ? 13 : 14.5 });
    else T(ZT.x + ZT.w / 2, ZT.y + ZT.h - (PHONE ? 14 : 22), '식물을 눌러 세고, 종 칸을 눌러 면적을 읽어요', PHONE ? 13 : 13.5, '#64748b', 'center', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 기록표: 밀도 · 빈도 · 피도
     ========================================================= */
  const TB = PHONE ? { x: 6, y: 6, w: 468, h: 396 } : { x: 10, y: 10, w: 596, h: 540 };
  const TF = PHONE ? { x: 6, y: 410, w: 468, h: 224 } : { x: 616, y: 10, w: 174, h: 540 };
  const ROWH = PHONE ? 24 : 31;
  const colW = (TB.w - 24 - (PHONE ? 38 : 54)) / 8;
  const colX = (c) => TB.x + 12 + (PHONE ? 38 : 54) + c * colW;      // c: 0..7 (종마다 수, 면적)
  function resetTbl() {
    S.tbl = { rowK: Array.from({ length: NQ }, () => 0), sumK: 0, occK: 0, sum: false, occ: false, t0: 0, inp: Array.from({ length: 12 }, () => ''), tries: 0 };
    $$('#recIn input').forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); });
  }
  const REC_ANS = (() => { const a = []; for (let k = 0; k < 3; k++) for (let s = 0; s < 4; s++) a.push([DENS, FREQ, COVR][k][s]); return a; })();   // [밀도 ×4, 빈도 ×4, 피도 ×4]
  const recOK = (i) => { const v = S.tbl.inp[i]; return v !== '' && Math.abs(Number(v) - REC_ANS[i]) < 0.005; };
  const recRight = () => S.tbl.inp.filter((v, i) => recOK(i)).length;
  const recFilled = () => S.tbl.inp.filter((v) => v !== '').length;
  function enterTbl() { const q = S.tbl; q.rowK = q.rowK.map(() => 0); q.t0 = S.clock; }
  function stepTbl(dt) {
    const q = S.tbl; if (!q) return;
    q.rowK = q.rowK.map((k, i) => (S.clock - q.t0 > i * 0.07 ? SciSim.approach(k, 1, dt, 5) : k));
    q.sumK = SciSim.approach(q.sumK, q.sum ? 1 : 0, dt, 3); q.occK = SciSim.approach(q.occK, q.occ ? 1 : 0, dt, 3);
  }
  function drawTbl(dt, t) {
    const q = S.tbl;
    bgFill('#eef7f0', '#f3fbf0');
    panel(TB.x, TB.y, TB.w, TB.h, 16);
    const y0 = TB.y + 16;
    SP.forEach((s, i) => {
      const x = colX(i * 2), w = colW * 2;
      D.roundRect(x + 3, y0, w - 6, 24, 8); ctx.fillStyle = s.tag; ctx.fill();
      T(x + w / 2, y0 + 17, s.k + ' ' + s.n, PHONE ? 13 : 14, '#fff', 'center', 800);
      T(x + colW / 2, y0 + 42, '수', PHONE ? 13 : 13.5, '#475569', 'center', 800); T(x + colW * 1.5, y0 + 42, '면적 m²', PHONE ? 12.5 : 13, '#475569', 'center', 800);
    });
    T(TB.x + 12 + (PHONE ? 19 : 27), y0 + 42, '번호', PHONE ? 12.5 : 13.5, '#475569', 'center', 800);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TB.x + 10, y0 + 50); ctx.lineTo(TB.x + TB.w - 10, y0 + 50); ctx.stroke();
    for (let r = 0; r < NQ; r++) {
      const y = y0 + 50 + (r + 1) * ROWH - 7, k = q.rowK[r];
      if (r % 2 === 0) { ctx.fillStyle = 'rgba(148,163,184,.1)'; ctx.fillRect(TB.x + 10, y - ROWH + 7, TB.w - 20, ROWH); }
      T(TB.x + 12 + (PHONE ? 19 : 27), y, String(r + 1), PHONE ? 13 : 14.5, '#475569', 'center', 800, { alpha: k });
      SP.forEach((s, i) => {
        const c = CNT[i][r], v = COV[i][r] / 100, col = c > 0 ? '#1f2d44' : '#b6c0cd';
        T(colX(i * 2) + colW / 2, y, String(Math.round(c * k)), PHONE ? 13 : 14.5, q.occ && c > 0 ? '#15803d' : col, 'center', 800, { alpha: k });
        T(colX(i * 2) + colW * 1.5, y, fmt2(v * k), PHONE ? 12.5 : 14, col, 'center', 700, { alpha: k });
      });
    }
    // 합계, 출현한 방형구 수
    const ln = y0 + 50 + NQ * ROWH + 2, ys = ln + 24, yo = ys + 30;
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TB.x + 10, ln); ctx.lineTo(TB.x + TB.w - 10, ln); ctx.stroke();
    T(TB.x + 12 + (PHONE ? 19 : 27), ys + 4, 'Σ', 16, '#7c3aed', 'center', 800);
    T(TB.x + 12 + (PHONE ? 19 : 27), yo + 4, '출현', PHONE ? 12 : 13, '#7c3aed', 'center', 800);
    SP.forEach((s, i) => {
      if (q.sumK > 0.02) { T(colX(i * 2) + colW / 2, ys + 4, String(Math.round(TOT_CNT[i] * q.sumK)), PHONE ? 14 : 16, s.tag, 'center', 800, { alpha: Math.min(1, q.sumK * 1.5) }); T(colX(i * 2) + colW * 1.5, ys + 4, fmt2(TOT_COV[i] * q.sumK), PHONE ? 13 : 15, s.tag, 'center', 800, { alpha: Math.min(1, q.sumK * 1.5) }); }
      else { T(colX(i * 2) + colW / 2, ys + 4, '?', 16, '#94a3b8', 'center', 800); T(colX(i * 2) + colW * 1.5, ys + 4, '?', 16, '#94a3b8', 'center', 800); }
      if (q.occK > 0.02) T(colX(i * 2) + colW, yo + 4, Math.round(OCC[i] * q.occK) + '곳', PHONE ? 14 : 16, s.tag, 'center', 800, { alpha: Math.min(1, q.occK * 1.5) });
      else T(colX(i * 2) + colW, yo + 4, '?', 16, '#94a3b8', 'center', 800);
    });
    T(TB.x + 14, TB.y + TB.h - 12, '1번은 내가 센 값이고, 나머지는 모둠원이 센 가상 자료예요. (예시 값)', PHONE ? 12.5 : 13, '#64748b', 'left', 700);
    // 식 카드
    panel(TF.x, TF.y, TF.w, TF.h, 16);
    if (!PHONE) {
      T(TF.x + 14, TF.y + 28, '📐 계산식', 15.5, '#26324a', 'left', 800);
      T(TF.x + 14, TF.y + 56, '전체 조사 면적', 13, '#64748b', 'left', 800); T(TF.x + 14, TF.y + 78, TOTAL_AREA + ' m² (' + NQ + '개)', 16, '#14532d', 'left', 800);
      [['밀도', '개체 수 / 전체 방형구 면적', '마리/m²', '#2563eb'], ['빈도', '출현한 방형구 수 / 전체 방형구 수', '(0~1)', '#0d9488'], ['피도', '덮은 면적 / 전체 조사 면적', '(0~1)', '#d97706']].forEach((f, i) => {
        const y = TF.y + 108 + i * 138; D.roundRect(TF.x + 10, y, TF.w - 20, 126, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = f[3]; ctx.lineWidth = 2.5; ctx.stroke();
        T(TF.x + 22, y + 26, f[0], 17, f[3], 'left', 800);
        textBlock(TF.x + 22, y + 52, TF.w - 44, f[1], 13.5, '#334155', 19, 800);
        T(TF.x + 22, y + 112, '단위: ' + f[2], 13, '#64748b', 'left', 700);
      });
    } else {
      T(TF.x + 14, TF.y + 26, '📐 계산식 (전체 조사 면적 ' + TOTAL_AREA + ' m²)', 14.5, '#26324a', 'left', 800);
      [['밀도 = 개체 수 / 전체 방형구 면적', '#2563eb'], ['빈도 = 출현한 방형구 수 / 전체 방형구 수', '#0d9488'], ['피도 = 덮은 면적 / 전체 조사 면적', '#d97706']].forEach((f, i) => { const y = TF.y + 44 + i * 56; D.roundRect(TF.x + 10, y, TF.w - 20, 48, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = f[1]; ctx.lineWidth = 2.5; ctx.stroke(); textBlock(TF.x + 22, y + 29, TF.w - 44, f[0], 14, '#1f2d44', 18, 800); });
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 중요치: 상대 밀도 + 상대 빈도 + 상대 피도
     ========================================================= */
  const IVP = PHONE ? { x: 6, y: 6, w: 468, h: 408 } : { x: 10, y: 10, w: 566, h: 540 };
  const IVI = PHONE ? { x: 6, y: 422, w: 468, h: 212 } : { x: 586, y: 10, w: 204, h: 540 };
  const IVCOL = ['#2563eb', '#0d9488', '#f59e0b'], IVNM = ['상대 밀도', '상대 빈도', '상대 피도'];
  const IVMAX = 120;
  const IVR = [REL_D, REL_F, REL_C];
  function resetIv() {
    S.iv = { inp: Array.from({ length: 16 }, () => ''), seg: SP.map(() => [0, 0, 0]), tot: SP.map(() => 0), dom: '', crown: 0, tries: 0 };
    $$('#ivIn input').forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); });
    const sel = $('#domSel'); if (sel) { sel.value = ''; sel.classList.remove('ok', 'bad'); }
  }
  const ivIdx = (col, s) => col * 4 + s;     // 열(상대 밀도, 상대 빈도, 상대 피도, 중요치), 종
  const ivVal = (col, s) => { const v = S.iv.inp[ivIdx(col, s)]; return v === '' ? null : Number(v); };
  const ivOK = (col, s) => { const v = ivVal(col, s); if (v == null) return false; const ans = col < 3 ? IVR[col][s] : IV[s]; return Math.abs(v - ans) <= 0.5; };
  const ivRelRight = () => { let n = 0; for (let c = 0; c < 3; c++) for (let s = 0; s < 4; s++) if (ivOK(c, s)) n++; return n; };
  const ivTotRight = () => { let n = 0; for (let s = 0; s < 4; s++) if (ivOK(3, s)) n++; return n; };
  function stepIv(dt) {
    const q = S.iv; if (!q) return;
    SP.forEach((s, i) => {
      for (let c = 0; c < 3; c++) q.seg[i][c] = SciSim.approach(q.seg[i][c], ivOK(c, i) ? IVR[c][i] : 0, dt, 6);
      q.tot[i] = SciSim.approach(q.tot[i], ivOK(3, i) ? 1 : 0, dt, 6);
    });
    q.crown = SciSim.approach(q.crown, q.dom !== '' && Number(q.dom) === DOM ? 1 : 0, dt, 5);
  }
  function drawIv(dt, t) {
    const q = S.iv;
    bgFill('#eef7f0', '#f3fbf0');
    panel(IVP.x, IVP.y, IVP.w, IVP.h, 16);
    T(IVP.x + 16, IVP.y + 28, '📊 종별 중요치 (최대 300)', PHONE ? 15 : 17, '#26324a', 'left', 800);
    const pb = { x: IVP.x + (PHONE ? 46 : 56), y: IVP.y + 66, w: IVP.w - (PHONE ? 66 : 84), h: IVP.h - (PHONE ? 130 : 150) };
    const py = (v) => pb.y + pb.h - clamp(v / IVMAX, 0, 1) * pb.h;
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(pb.x, pb.y, pb.w, pb.h); ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = 0; v <= IVMAX; v += 20) { const yy = py(v); ctx.beginPath(); ctx.moveTo(pb.x, yy); ctx.lineTo(pb.x + pb.w, yy); ctx.stroke(); T(pb.x - 7, yy + 4.5, String(v), 13, '#5d6879', 'right', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x, pb.y + pb.h); ctx.lineTo(pb.x + pb.w, pb.y + pb.h); ctx.stroke();
    const slot = pb.w / 4, bw = Math.min(PHONE ? 64 : 84, slot * 0.7);
    SP.forEach((s, i) => {
      const x = pb.x + slot * (i + 0.5) - bw / 2; let acc = 0;
      for (let c = 0; c < 3; c++) {
        const v = q.seg[i][c]; if (v < 0.05) continue;
        const y1 = py(acc + v), y2 = py(acc);
        const g = ctx.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, C.shade(IVCOL[c], 0.25)); g.addColorStop(1, IVCOL[c]);
        ctx.fillStyle = g; ctx.fillRect(x, y1, bw, y2 - y1); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y1, bw, y2 - y1);
        if (y2 - y1 > 16) T(x + bw / 2, (y1 + y2) / 2 + 5, fmt1(v).replace('.0', ''), PHONE ? 13 : 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 });
        acc += v;
      }
      T(x + bw / 2, pb.y + pb.h + 20, s.k + ' ' + s.n, PHONE ? 13 : 14.5, s.tag, 'center', 800);
      if (q.tot[i] > 0.05) { const ty = py(acc) - 10; D.label(x + bw / 2, ty, '중요치 ' + Math.round(IV[i] * q.tot[i]), { bg: '#1f2d44', size: PHONE ? 13 : 14 }); }
      if (i === DOM && q.crown > 0.05) E('👑', x + bw / 2, py(acc) - 42 - (1 - q.crown) * 20, (PHONE ? 26 : 32) * q.crown);
    });
    // 범례
    IVNM.forEach((n, c) => { const x = IVP.x + 16 + c * (PHONE ? 150 : 176), y = IVP.y + IVP.h - 26; ctx.fillStyle = IVCOL[c]; D.roundRect(x, y - 12, 18, 18, 5); ctx.fill(); T(x + 26, y + 3, n, PHONE ? 13 : 14.5, '#334155', 'left', 800); });
    // 정보 카드
    panel(IVI.x, IVI.y, IVI.w, IVI.h, 16);
    if (!PHONE) {
      T(IVI.x + 14, IVI.y + 28, '📋 필요한 값', 15.5, '#26324a', 'left', 800);
      T(IVI.x + 14, IVI.y + 54, '모든 종의 합', 13, '#64748b', 'left', 800);
      [['밀도', fmt1(sum(DENS)) + ' 마리/m²', IVCOL[0]], ['빈도', fmt1(sum(FREQ)), IVCOL[1]], ['피도', fmt1(sum(COVR)), IVCOL[2]]].forEach((r, i) => { const y = IVI.y + 84 + i * 36; T(IVI.x + 14, y, r[0] + ' 합', 14.5, r[2], 'left', 800); T(IVI.x + IVI.w - 14, y, r[1], 15, '#1f2d44', 'right', 800); });
      D.roundRect(IVI.x + 10, IVI.y + 200, IVI.w - 20, 140, 12); ctx.fillStyle = '#f8fafc'; ctx.fill();
      textBlock(IVI.x + 20, IVI.y + 226, IVI.w - 40, '상대값(%) = 그 종의 값 / 모든 종의 합 × 100', 13.5, '#334155', 19, 800);
      textBlock(IVI.x + 20, IVI.y + 300, IVI.w - 40, '중요치 = 상대 밀도 + 상대 빈도 + 상대 피도', 13.5, '#7c3aed', 19, 800);
      textBlock(IVI.x + 14, IVI.y + 372, IVI.w - 28, '중요치가 가장 큰 종 = 우점종 👑', 14, '#14532d', 20, 800);
      T(IVI.x + 14, IVI.y + 450, '맞은 상대값 ' + ivRelRight() + ' / 12', 14, '#475569', 'left', 800);
      T(IVI.x + 14, IVI.y + 474, '맞은 중요치 ' + ivTotRight() + ' / 4', 14, '#475569', 'left', 800);
    } else {
      T(IVI.x + 14, IVI.y + 26, '📋 모든 종의 합 → 밀도 ' + fmt1(sum(DENS)) + ' · 빈도 ' + fmt1(sum(FREQ)) + ' · 피도 ' + fmt1(sum(COVR)), 13.5, '#26324a', 'left', 800);
      textBlock(IVI.x + 14, IVI.y + 58, IVI.w - 28, '상대값(%) = 그 종의 값 / 모든 종의 합 × 100', 14, '#334155', 19, 800);
      textBlock(IVI.x + 14, IVI.y + 112, IVI.w - 28, '중요치 = 상대 밀도 + 상대 빈도 + 상대 피도 (최대 300)', 14, '#7c3aed', 19, 800);
      textBlock(IVI.x + 14, IVI.y + 166, IVI.w - 28, '중요치가 가장 큰 종 = 우점종 👑   (맞은 상대값 ' + ivRelRight() + '/12 · 중요치 ' + ivTotRight() + '/4)', 13.5, '#14532d', 19, 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ④ 군집 해석: 종 수–방형구 수 곡선, 종 다양성(초지 X, Y), 수직 분포
     ========================================================= */
  const AR = PHONE ? { x: 6, y: 6, w: 468, h: 304 } : { x: 10, y: 10, w: 780, h: 290 };
  const XYP = PHONE ? { x: 6, y: 318, w: 468, h: 316 } : { x: 10, y: 308, w: 780, h: 242 };
  const ARP = PHONE ? { x: AR.x + 52, y: AR.y + 58, w: AR.w - 76, h: 170 } : { x: AR.x + 70, y: AR.y + 54, w: 470, h: 172 };
  const XY_FR = { X: [55, 30, 10, 5], Y: [25, 25, 25, 25] };
  function resetArea() { S.ar = { n: 3, maxN: 3, suff: '', div: '', anim: 3, bad: {} }; const s = $('#sN'); if (s) s.value = 3; $('#selSuff').value = ''; $('#selDiv').value = ''; ['selSuff', 'selDiv'].forEach((id) => $('#' + id).classList.remove('ok', 'bad')); }
  const arx = (n) => ARP.x + (n - 1) / 9 * ARP.w, ary = (k) => ARP.y + ARP.h - k / 5 * ARP.h;
  function stepArea(dt) { const q = S.ar; if (!q) return; q.anim = SciSim.approach(q.anim, q.n, dt, 7); }
  function drawArea(dt, t) {
    const q = S.ar;
    bgFill('#eef7f0', '#f3fbf0');
    panel(AR.x, AR.y, AR.w, AR.h, 16);
    T(AR.x + 16, AR.y + 28, '📈 종 수 – 방형구 수 곡선', PHONE ? 14.5 : 16.5, '#26324a', 'left', 800);
    T(AR.x + AR.w - 16, AR.y + 28, '방형구 ' + q.n + '개 → ' + CUM_SP[q.n - 1] + '종', PHONE ? 14 : 16, '#7c3aed', 'right', 800);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(ARP.x, ARP.y, ARP.w, ARP.h); ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let k = 0; k <= 5; k++) { const yy = ary(k); ctx.beginPath(); ctx.moveTo(ARP.x, yy); ctx.lineTo(ARP.x + ARP.w, yy); ctx.stroke(); T(ARP.x - 8, yy + 4.5, String(k), 13, '#5d6879', 'right', 700); }
    for (let n = 1; n <= 10; n++) { const xx = arx(n); ctx.beginPath(); ctx.moveTo(xx, ARP.y); ctx.lineTo(xx, ARP.y + ARP.h); ctx.stroke(); T(xx, ARP.y + ARP.h + 18, String(n), 13, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ARP.x, ARP.y); ctx.lineTo(ARP.x, ARP.y + ARP.h); ctx.lineTo(ARP.x + ARP.w, ARP.y + ARP.h); ctx.stroke();
    T(ARP.x + ARP.w / 2, ARP.y + ARP.h + 38, '설치한 방형구 수 (개)', 13, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(AR.x + 16, ARP.y + ARP.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '나타난 종 수', 13, '#34445c', 'center', 800); ctx.restore();
    // 흐린 전체 곡선
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.18)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); for (let n = 1; n <= 10; n++) n === 1 ? ctx.moveTo(arx(n), ary(CUM_SP[0])) : ctx.lineTo(arx(n), ary(CUM_SP[n - 1])); ctx.stroke(); ctx.restore();
    // 진한 곡선 (선택한 n까지)
    const an = q.anim; ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    for (let n = 1; n <= Math.floor(an + 1e-6); n++) n === 1 ? ctx.moveTo(arx(n), ary(CUM_SP[0])) : ctx.lineTo(arx(n), ary(CUM_SP[n - 1]));
    const fl = Math.floor(an + 1e-6); if (fl < 10 && an > fl) { const f = an - fl, v = CUM_SP[fl - 1] + (CUM_SP[fl] - CUM_SP[fl - 1]) * f; ctx.lineTo(arx(an), ary(v)); }
    ctx.stroke(); ctx.restore();
    for (let n = 1; n <= 10; n++) { const on = n <= q.n; D.sphere(arx(n), ary(CUM_SP[n - 1]), on ? 7 : 4.5, on ? '#7c3aed' : '#c4b5fd', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); }
    if (q.n >= 6 && CUM_SP[q.n - 1] === CUM_SP[9]) D.label(ARP.x + ARP.w - 8, ary(4) - 22, '더 늘려도 4종이에요', { bg: '#15803d', size: PHONE ? 13 : 14, align: 'right' });
    // 초지 X, Y 종 다양성
    panel(XYP.x, XYP.y, XYP.w, XYP.h, 16);
    T(XYP.x + 16, XYP.y + 28, '🌿 같은 4종, 같은 100포기 — 종 다양성은?', PHONE ? 14.5 : 16.5, '#26324a', 'left', 800);
    ['X', 'Y'].forEach((nm_, gi) => {
      const fr = XY_FR[nm_], gx0 = PHONE ? XYP.x + 14 + gi * 232 : XYP.x + 30 + gi * 380, gy0 = XYP.y + 54, cs = PHONE ? 11 : 16, cols = 10;
      T(gx0 + cols * cs / 2, gy0 - 6, '초지 ' + nm_, PHONE ? 15 : 17, nm_ === 'X' ? '#b45309' : '#0f766e', 'center', 800);
      let idx = 0; const order = []; fr.forEach((n, s) => { for (let i = 0; i < n; i++) order.push(s); });
      for (let i = 0; i < 100; i++) { const s = order[i], cx = gx0 + (i % cols) * cs + cs / 2, cy = gy0 + 6 + Math.floor(i / cols) * cs + cs / 2; ctx.fillStyle = SP[s].tag; ctx.beginPath(); ctx.arc(cx, cy, cs * 0.4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(cx - cs * 0.12, cy - cs * 0.14, cs * 0.12, 0, TAU); ctx.fill(); }
      const lx = gx0 + cols * cs + (PHONE ? 6 : 18);
      fr.forEach((n, s) => { const y = gy0 + 24 + s * (PHONE ? 28 : 36); ctx.fillStyle = SP[s].tag; ctx.beginPath(); ctx.arc(lx + 5, y - 4, 5, 0, TAU); ctx.fill(); T(lx + 14, y, SP[s].n + ' ' + n + '%', PHONE ? 13 : 14.5, '#334155', 'left', 800); });
    });
    parts.update(dt); parts.draw(ctx);
  }

  /* 숲의 수직 분포 */
  const LAYERS = [
    { n: '교목층', e: '🌳', light: '100 %', c: '#2f8f46' }, { n: '아교목층', e: '🌲', light: '약 60 %', c: '#4aa05a' }, { n: '관목층', e: '🌿', light: '약 35 %', c: '#7bb662' }, { n: '초본층', e: '🌱', light: '약 15 %', c: '#a6cf7f' },
  ];
  const FPN = PHONE ? { x: 6, y: 6, w: 468, h: 628 } : { x: 10, y: 10, w: 780, h: 540 };
  const LB = PHONE ? [{ y0: 54, y1: 214 }, { y0: 214, y1: 340 }, { y0: 340, y1: 440 }, { y0: 440, y1: 528 }] : [{ y0: 56, y1: 190 }, { y0: 190, y1: 310 }, { y0: 310, y1: 408 }, { y0: 408, y1: 492 }];
  function resetLayer() { S.lay = { pick: [null, null, null, null], bad: {}, pop: [1, 1, 1, 1], shakeT: -9, solved: false }; }
  const layPicked = () => S.lay.pick.filter((x) => x != null).length;
  const layRight = () => S.lay.pick.filter((x, i) => x === i).length;
  const layTag = (i) => ({ x: FPN.x + 12, y: FPN.y + LB[i].y0 + (LB[i].y1 - LB[i].y0) / 2 - 22, w: PHONE ? 112 : 150, h: 44 });
  function layerDown(p) {
    const q = S.lay; if (q.solved) return false;
    for (let i = 0; i < 4; i++) { const r = layTag(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { q.pick[i] = q.pick[i] == null ? 0 : (q.pick[i] + 1 >= 4 ? null : q.pick[i] + 1); delete q.bad[i]; q.pop[i] = 0.4; SciSim.tween(q.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false; } }
    return false;
  }
  function drawLayer(dt, t) {
    const q = S.lay;
    bgFill('#e6f4ff', '#eef7e8');
    panel(FPN.x, FPN.y, FPN.w, FPN.h, 16);
    T(FPN.x + 16, FPN.y + 30, '🌲 숲의 수직 분포 (예시)', PHONE ? 15 : 17, '#26324a', 'left', 800);
    const sx = FPN.x + (PHONE ? 130 : 172), sw = FPN.w - (PHONE ? 130 : 172) - (PHONE ? 78 : 130) - 12;
    // 층 배경
    const cols = ['#d4ecd0', '#cfe6c4', '#d9e9bd', '#e5ecb4'];
    for (let i = 0; i < 4; i++) { const y0 = FPN.y + LB[i].y0, h = LB[i].y1 - LB[i].y0; ctx.fillStyle = cols[i]; ctx.fillRect(sx, y0, sw, h); ctx.strokeStyle = 'rgba(80,110,70,.4)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx + sw, y0); ctx.stroke(); ctx.setLineDash([]); }
    // 땅
    const gy = FPN.y + LB[3].y1; ctx.fillStyle = '#9a6a3d'; ctx.fillRect(sx, gy, sw, 36);
    // 식물 그림
    const sway = (i) => (RM ? 0 : Math.sin(t * 1.1 + i) * 2);
    const nT = PHONE ? 3 : 4;
    for (let i = 0; i < nT; i++) { const x = sx + (i + 0.5) * sw / nT; E('🌳', x + sway(i), FPN.y + LB[0].y0 + (LB[0].y1 - LB[0].y0) * 0.5, PHONE ? 84 : 112); }
    for (let i = 0; i < nT + 1; i++) { const x = sx + (i + 0.5) * sw / (nT + 1); E('🌲', x + sway(i + 4), FPN.y + LB[1].y0 + (LB[1].y1 - LB[1].y0) * 0.55, PHONE ? 54 : 74); }
    for (let i = 0; i < nT + 2; i++) { const x = sx + (i + 0.5) * sw / (nT + 2); E('🌿', x + sway(i + 8), FPN.y + LB[2].y0 + (LB[2].y1 - LB[2].y0) * 0.55, PHONE ? 38 : 50); }
    for (let i = 0; i < nT + 4; i++) { const x = sx + (i + 0.5) * sw / (nT + 4); E('🌱', x + sway(i + 12), FPN.y + LB[3].y0 + (LB[3].y1 - LB[3].y0) * 0.6, PHONE ? 26 : 34); }
    // 빛 (위에서 아래로 약해져요)
    const lx = sx + sw + (PHONE ? 10 : 16);
    const lg = ctx.createLinearGradient(0, FPN.y + LB[0].y0, 0, FPN.y + LB[3].y1); lg.addColorStop(0, 'rgba(250,204,21,.95)'); lg.addColorStop(1, 'rgba(250,204,21,.18)');
    ctx.fillStyle = lg; D.roundRect(lx, FPN.y + LB[0].y0, 16, LB[3].y1 - LB[0].y0, 8); ctx.fill();
    E('☀️', lx + 8, FPN.y + 40, PHONE ? 26 : 32);
    // 이름표
    for (let i = 0; i < 4; i++) {
      const r = layTag(i), p = q.pick[i], pop = clamp(q.pop[i], 0, 1.1), bad = q.bad[i], sk = bad ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      ctx.save(); ctx.translate(r.x + r.w / 2 + sk, r.y + r.h / 2); ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop);
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fillStyle = p == null ? '#fff' : bad ? '#dc2626' : LAYERS[p].c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = p == null ? '#94a3b8' : '#fff'; ctx.setLineDash(p == null ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
      T(0, 6, p == null ? '👆 이름 고르기' : LAYERS[p].n, PHONE ? 14 : 16, p == null ? '#64748b' : '#fff', 'center', 800);
      ctx.restore();
      if (q.solved) T(lx + 24, FPN.y + LB[i].y0 + (LB[i].y1 - LB[i].y0) / 2 + 5, LAYERS[i].light, PHONE ? 13 : 15, '#92400e', 'left', 800);
    }
    if (q.solved) { T(lx + 8, FPN.y + LB[0].y0 - 10, '빛의 양', 13, '#92400e', 'center', 800); D.label(FPN.x + FPN.w / 2, FPN.y + FPN.h - 24, '✅ 위쪽 층일수록 빛을 많이 받아요. 바닥에는 약 15 %만 도달해요.', { bg: '#15803d', size: PHONE ? 12.5 : 14 }); }
    else T(FPN.x + FPN.w / 2, FPN.y + FPN.h - 22, '왼쪽 이름표를 눌러 층 이름을 붙여요 (' + layPicked() + ' / 4)', PHONE ? 13.5 : 15, '#64748b', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { field: '🗺️ 가상 초지: 방형구 설치', zoom: '🔍 방형구 안의 식물 세기', table: '📋 기록표: 밀도 · 빈도 · 피도', iv: '👑 중요치와 우점종', area: '📈 조사 충분성과 종 다양성', layer: '🌲 숲의 수직 분포' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = mode === 'zoom' ? 0 : 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'table') enterTbl();
    updateCtl();
  }
  const zoomCount = (q) => zCounts(q).reduce((a, b) => a + b, 0);
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const f = S.fld;
    if (f) {
      $$('#qmode button').forEach((b) => b.classList.toggle('on', b.dataset.m === f.mode));
      $('#bThrow').disabled = f.mode !== 'rand' || f.placed >= NQ; $('#bThrow').textContent = f.placed >= NQ ? '✅ 방형구 ' + NQ + '개 설치 완료' : '🎲 방형구 던지기 (' + f.placed + ' / ' + NQ + ')';
      const last = f.log.length ? QPOS[f.log[f.log.length - 1]] : null;
      $('#fldNote').innerHTML = f.mode === 'rand' ? (last ? '<b>' + f.log.length + '번</b> 좌표: 가로 ' + last[0].toFixed(1) + ' m, 세로 ' + last[1].toFixed(1) + ' m. 방형구를 누르면 열어서 세요.' : '난수로 뽑은 좌표에 방형구가 떨어져요.') : '초지를 눌러 보세요. 마음대로 고르면 어떤 일이 생길까요?';
      $('#bZPrev').disabled = f.placed < 2; $('#bZNext').disabled = f.placed < 2;
    }
    if (S.zoom) $('#zoomNote').innerHTML = f && f.placed > 0 ? '<b>' + (S.zoom.q + 1) + '번</b> 방형구를 보고 있어요. 센 식물 <b>' + zoomCount(S.zoom.q) + '</b>포기' + (S.zoom.done['q' + S.zoom.q] ? ' · ✅ 모두 읽었어요' : '') : '먼저 초지에 방형구를 설치해요.';
    if (S.tbl) { $('#bSum').classList.toggle('done', S.tbl.sum); $('#bOcc').classList.toggle('done', S.tbl.occ); $('#recNote').innerHTML = '맞은 값 <b>' + recRight() + ' / 12</b>'; }
    if (S.iv) $('#ivNote').innerHTML = '맞은 상대값 <b>' + ivRelRight() + ' / 12</b> · 중요치 <b>' + ivTotRight() + ' / 4</b>';
    if (S.ar) { $('#sN').value = S.ar.n; $('#oN').textContent = S.ar.n + '개'; $('#sN').style.setProperty('--pct', ((S.ar.n - 1) / 9 * 100) + '%'); }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (b.dataset.mode === 'zoom' && S.fld.placed === 0) { showHint('먼저 방형구를 설치해요.', 2600); return; } if (b.dataset.mode === 'zoom') { openZoom(Math.min(S.zoom.q, S.fld.placed - 1)); return; } setMode(b.dataset.mode); }));
  $$('#qmode button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fld.mode = b.dataset.m; hideHint(); updateCtl(); }));
  $('#bThrow').addEventListener('click', throwQuad);
  $('#bQClear').addEventListener('click', () => { Sound.click(); const m = S.fld.mode; resetField(); S.fld.mode = m; updateCtl(); hideHint(); });
  $('#bZPrev').addEventListener('click', () => { Sound.click(); const n = S.fld.placed; if (n > 1) openZoom((S.zoom.q + n - 1) % n); });
  $('#bZNext').addEventListener('click', () => { Sound.click(); const n = S.fld.placed; if (n > 1) openZoom((S.zoom.q + 1) % n); });
  $('#bZBack').addEventListener('click', () => { Sound.click(); setMode('field'); });
  $('#bSum').addEventListener('click', () => { Sound.click(); S.tbl.sum = true; updateCtl(); });
  $('#bOcc').addEventListener('click', () => { Sound.click(); S.tbl.occ = true; updateCtl(); });
  $('#sN').addEventListener('input', (e) => { S.ar.n = +e.target.value; S.ar.maxN = Math.max(S.ar.maxN, S.ar.n); Sound.tick(); updateCtl(); });
  ['selSuff', 'selDiv'].forEach((id) => $('#' + id).addEventListener('change', (e) => { S.ar[id === 'selSuff' ? 'suff' : 'div'] = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); }));
  $('#domSel').addEventListener('change', (e) => { S.iv.dom = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  (function buildInputs() {
    const rec = $('#recIn'); rec.style.gridTemplateColumns = '1.25fr 1fr 1fr 1fr';
    ['종', '밀도', '빈도', '피도'].forEach((h) => { const d = document.createElement('div'); d.className = 'hd'; d.textContent = h; rec.appendChild(d); });
    const units = ['', '마리/m²', '(0~1)', '(0~1)'];
    units.forEach((u, i) => { if (i === 0) { rec.appendChild(document.createElement('div')); } else { const d = document.createElement('div'); d.className = 'in-unit'; d.style.textAlign = 'center'; d.textContent = u; rec.appendChild(d); } });
    SP.forEach((s, si) => {
      const lab = document.createElement('div'); lab.className = 'lab'; lab.style.color = s.tag; lab.textContent = s.k + ' ' + s.n; rec.appendChild(lab);
      for (let k = 0; k < 3; k++) {
        const idx = k * 4 + si, inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.01'; inp.inputMode = 'decimal'; inp.className = 'num-in sm'; inp.id = 'rc' + idx; inp.setAttribute('aria-label', s.n + ' ' + ['밀도', '빈도', '피도'][k]);
        inp.addEventListener('input', () => { S.tbl.inp[idx] = inp.value; inp.classList.remove('bad'); inp.classList.toggle('ok', recOK(idx)); if (recOK(idx)) Sound.tick(); updateCtl(); });
        rec.appendChild(inp);
      }
    });
    const iv = $('#ivIn'); iv.style.gridTemplateColumns = '1.15fr 1fr 1fr 1fr 1fr';
    ['종', '상대 밀도', '상대 빈도', '상대 피도', '중요치'].forEach((h) => { const d = document.createElement('div'); d.className = 'hd'; d.textContent = h; iv.appendChild(d); });
    SP.forEach((s, si) => {
      const lab = document.createElement('div'); lab.className = 'lab'; lab.style.color = s.tag; lab.textContent = s.k + ' ' + s.n; iv.appendChild(lab);
      for (let c = 0; c < 4; c++) {
        const idx = ivIdx(c, si), inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.1'; inp.inputMode = 'decimal'; inp.className = 'num-in sm'; inp.id = 'iv' + idx; inp.setAttribute('aria-label', s.n + ' ' + ['상대 밀도', '상대 빈도', '상대 피도', '중요치'][c]);
        inp.addEventListener('input', () => { S.iv.inp[idx] = inp.value; inp.classList.remove('bad'); inp.classList.toggle('ok', ivOK(c, si)); if (ivOK(c, si)) Sound.tick(); updateCtl(); });
        iv.appendChild(inp);
      }
    });
  })();

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'field') return fieldDown(p); if (S.mode === 'zoom') return zoomDown(p); if (S.mode === 'layer') return layerDown(p); return false; },
    hover(p) {
      if (S.mode === 'field') { for (let q = 0; q < S.fld.placed; q++) { const r = qRect(q); if (p.x >= r.x - 6 && p.x <= r.x + r.w + 6 && p.y >= r.y - 6 && p.y <= r.y + r.h + 6) return 'pointer'; } return S.fld.mode === 'free' ? 'crosshair' : 'default'; }
      if (S.mode === 'zoom') return 'pointer';
      if (S.mode === 'layer') return 'pointer';
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'field') { L1 = '설치한 방형구'; a = S.fld.placed + ' / ' + NQ; L2 = '방형구 한 변'; b = '1 m (1 m²)'; L3 = '마음대로 고른 시도'; c = S.fld.biasN + '번'; }
    else if (m === 'zoom') { const q = S.zoom.q; L1 = '방형구'; a = (q + 1) + '번'; L2 = '센 식물'; b = zoomCount(q) + '포기'; L3 = '면적을 읽은 종'; c = SP.filter((s, i) => S.zoom.covSeen['q' + q + '_' + i]).length + ' / ' + SP.filter((s, i) => CNT[i][q] > 0).length; }
    else if (m === 'table') { L1 = '입력한 값'; a = recFilled() + ' / 12'; L2 = '맞은 값'; b = recRight() + ' / 12'; L3 = '전체 조사 면적'; c = TOTAL_AREA + ' m²'; }
    else if (m === 'iv') { L1 = '맞은 상대값'; a = ivRelRight() + ' / 12'; L2 = '맞은 중요치'; b = ivTotRight() + ' / 4'; L3 = '우점종'; c = S.iv.crown > 0.8 ? SP[DOM].n : '—'; }
    else if (m === 'area') { const q = S.ar; L1 = '방형구 수'; a = q.n + '개'; L2 = '나타난 종'; b = CUM_SP[q.n - 1] + '종'; L3 = '더 늘어난 종'; c = q.n > 1 ? (CUM_SP[q.n - 1] - CUM_SP[q.n - 2]) + '종' : '—'; }
    else { L1 = '이름표'; a = layPicked() + ' / 4'; L2 = '맞은 층'; b = S.lay.solved ? '4 / 4' : '—'; L3 = '바닥에 닿는 빛'; c = S.lay.solved ? '약 15 %' : '—'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    const f = S.fld; f.placed = NQ; f.drop.forEach((d) => { d.k = 1; }); f.log = Array.from({ length: NQ }, (x, i) => i);
    for (let q = 0; q < NQ; q++) { const mk = zMarked(q); zPlants(q).forEach((p, i) => { mk[i] = true; }); SP.forEach((s, i) => { if (CNT[i][q]) S.zoom.covSeen['q' + q + '_' + i] = true; }); S.zoom.done['q' + q] = true; }
    S.tbl.sum = true; S.tbl.occ = true; S.tbl.inp = REC_ANS.map((v) => String(Math.round(v * 100) / 100)); $$('#recIn input').forEach((inp, i) => { inp.value = S.tbl.inp[i]; inp.classList.add('ok'); });
    const vals = []; for (let c = 0; c < 3; c++) IVR[c].forEach((v) => vals.push(v)); IV.forEach((v) => vals.push(v));
    S.iv.inp = vals.map((v) => String(v)); $$('#ivIn input').forEach((inp, i) => { inp.value = S.iv.inp[i]; inp.classList.add('ok'); }); S.iv.dom = String(DOM); $('#domSel').value = String(DOM);
    S.ar.n = 10; S.ar.maxN = 10; S.ar.suff = '1'; S.ar.div = 'Y'; $('#selSuff').value = '1'; $('#selDiv').value = 'Y';
    S.lay.pick = [0, 1, 2, 3]; S.lay.solved = true;
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '방형구 설치와 식물 세기', short: '방형구 설치', icon: '🧰', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 넓은 초지의 식물을 일일이 세지 않고도 어떤 식물이 우점하는지 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 군집과 종 다양성(종의 수와 고른 정도)을 배웠어요. 이번에는 <b>방형구법</b>으로 초지의 식물 군집을 직접 조사해 봐요.</div>' +
        '<p><b>1 m × 1 m 방형구</b>를 초지의 <b>무작위 좌표</b> 10곳에 설치하고, 방형구 안의 식물 개체 수와 덮은 면적을 읽어요.</p>',
      features: ['field', 'zoom'],
      setup() { resetField(); setMode('field'); },
      recap: '방형구법은 일부 면적(방형구)만 조사해 넓은 초지의 식물 군집을 알아내는 방법이에요. 방형구는 조사자의 선택이 섞이지 않도록 무작위로 설치해요.',
      summary: '<ul><li><b>방형구법</b>: 1 m × 1 m 방형구를 여러 곳에 설치해 식물의 개체 수와 덮은 면적을 조사하는 방법 (이 조사: 방형구 10개 = 10 m²)</li><li>방형구는 <b>무작위 좌표</b>에 설치해야 눈에 띄는 곳만 고르는 <b>편향</b>을 막고 지역 전체를 대표하는 자료를 얻어요.</li><li>방형구마다 <b>종별 개체 수</b>와 <b>덮은 면적</b>을 기록해요.</li></ul>',
      missions: [
        {
          id: 'place', title: '방형구 10개 설치',
          goal: '<b>🎲 방형구 던지기</b>를 눌러 방형구 <b>10개</b>를 무작위 좌표에 설치하세요.',
          hint: '오른쪽 위 방식이 🎲 무작위 좌표일 때 던지기 버튼을 눌러요. 👆 내가 고르기를 눌러 마음대로 골라 보면 어떤 문제가 생기는지 볼 수 있어요.',
          setup() { setMode('field'); },
          check: () => S.fld.placed >= NQ,
          hold: 0.8,
          status: () => '설치한 방형구 ' + S.fld.placed + ' / ' + NQ + ' &nbsp; 마음대로 고른 시도 ' + S.fld.biasN + '번(선택)',
          explain: '난수로 뽑은 좌표라서 조사자가 식물이 많은 곳만 고르는 <b>편향</b>이 없어요. 방형구 10개는 모두 합해 <b>10 m²</b>예요.',
        },
        {
          id: 'count', title: '방형구 하나 세기',
          goal: '설치한 방형구 하나를 눌러 열고, <b>식물을 눌러 모두 센 뒤</b> 식물 종마다 <b>덮은 면적</b>도 읽으세요.',
          hint: '초지에서 방형구를 누르면 크게 보여요. 식물 하나하나를 눌러 ✓ 표시를 해요. 오른쪽 종 칸을 누르면 그 종이 덮은 면적이 나와요.',
          setup() { setMode('field'); },
          check: () => Object.keys(S.zoom.done).some((k) => S.zoom.done[k]),
          hold: 0.6,
          status: () => { const q = S.zoom.q; return '방형구 ' + (q + 1) + '번 · 센 식물 ' + zoomCount(q) + '포기 &nbsp; 면적 읽은 종 ' + SP.filter((s, i) => S.zoom.covSeen['q' + q + '_' + i]).length + ' / ' + SP.filter((s, i) => CNT[i][q] > 0).length; },
          explain: '방형구마다 종별 <b>개체 수</b>와 <b>덮은 면적</b>(m²)을 기록해요. 쑥처럼 개체 수가 적어도 잎이 커서 넓게 덮는 종이 있어요.',
        },
        {
          type: 'quiz', title: '무작위로 설치하는 까닭',
          goal: '방형구를 <b>무작위 좌표</b>에 설치하는 까닭으로 가장 알맞은 것은?',
          setup() { setMode('field'); },
          choices: ['식물이 많은 곳에서 더 많은 식물을 세기 위해', '조사자의 선택(편향)을 막고 지역 전체를 대표하는 자료를 얻기 위해', '조사 시간을 줄이기 위해', '한 종의 식물만 한곳에서 모두 세기 위해'],
          answer: 1,
          feedback: ['식물이 많은 곳만 고르면 개체 수가 실제보다 많게 조사돼요(편향).', '', '시간을 줄이는 것이 목적이 아니라 대표성이 목적이에요.', '여러 곳을 골고루 조사해야 지역 전체를 알 수 있어요.'],
          explain: '마음대로 고르면 눈에 띄는 곳만 고르게 되어 결과가 한쪽으로 치우쳐요. <b>무작위 좌표</b>는 선택이 섞이지 않게 해 <b>지역 전체를 대표하는 자료</b>를 얻게 해 줘요.',
        },
      ],
    },
    {
      title: '밀도·빈도·피도 구하기', short: '밀도·빈도·피도', icon: '📋', phase: '기록',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 방형구를 설치하고 식물 개체 수와 덮은 면적을 읽었어요. 이제 방형구 10개의 기록을 모아 종마다 <b>밀도, 빈도, 피도</b>를 구해요.</div>' +
        '<p>기록표에서 <b>합계</b>와 <b>출현한 방형구 수</b>를 구하고, 전체 조사 면적 <b>10 m²</b>와 방형구 수 <b>10개</b>로 계산해요.</p>',
      features: ['table'],
      setup() { resetTbl(); setMode('table'); },
      recap: '밀도는 단위 면적당 개체 수, 빈도는 종이 나타난 방형구의 비율, 피도는 종이 덮은 면적의 비율이에요. 세 값은 종이 군집에서 차지하는 모습을 서로 다른 면에서 보여 줘요.',
      summary: '<ul><li><b>밀도</b> = 어떤 종의 개체 수 / 전체 방형구 면적 (마리/m²)</li><li><b>빈도</b> = 그 종이 출현한 방형구 수 / 전체 방형구 수</li><li><b>피도</b> = 그 종이 덮은 면적 / 전체 조사 면적</li><li>이 초지(10 m²)의 결과(예시): 밀도 A 3.0 · B 1.0 · C 0.5 · D 5.5, 빈도 A 0.8 · B 0.5 · C 0.3 · D 0.9, 피도 A 0.40 · B 0.10 · C 0.30 · D 0.20</li></ul>',
      missions: [
        {
          id: 'rec', title: '밀도·빈도·피도 계산', manual: true,
          goal: '기록표의 합계로 4종의 <b>밀도, 빈도, 피도</b> 12개를 입력한 뒤 ✔ 확인하기를 누르세요.',
          hint: 'Σ 합계 구하기와 출현한 방형구 세기를 눌러 값을 확인해요. 밀도 = 개체 수 합계 / 10, 빈도 = 출현 곳 수 / 10, 피도 = 덮은 면적 합계 / 10 이에요.',
          setup() { setMode('table'); },
          check() {
            const q = S.tbl;
            if (recFilled() < 12) return '아직 비어 있는 칸이 ' + (12 - recFilled()) + '개 있어요.';
            const bad = [];
            q.inp.forEach((v, i) => { const inp = $('#rc' + i); if (!recOK(i)) { bad.push(i); inp.classList.add('bad'); inp.classList.remove('ok'); } else { inp.classList.remove('bad'); inp.classList.add('ok'); } });
            if (bad.length) { const i = bad[0], kind = Math.floor(i / 4), s = SP[i % 4]; return '빨간 칸 ' + bad.length + '개를 다시 계산해요. ' + s.n + '의 ' + ['밀도는 개체 수 합계 / 10 m²', '빈도는 출현한 방형구 수 / 10', '피도는 덮은 면적 합계 / 10 m²'][kind] + '이에요.'; }
            return true;
          },
          status: () => '맞은 값 ' + recRight() + ' / 12',
          explain: '합계(개체 수 A 30 · B 10 · C 5 · D 55, 덮은 면적 A 4.0 · B 1.0 · C 3.0 · D 2.0 m²)와 출현 곳 수(8 · 5 · 3 · 9)를 쓰면 <b>밀도</b> 3.0 · 1.0 · 0.5 · 5.5 마리/m², <b>빈도</b> 0.8 · 0.5 · 0.3 · 0.9, <b>피도</b> 0.40 · 0.10 · 0.30 · 0.20이에요.',
        },
        {
          type: 'quiz', title: '밀도와 빈도의 차이',
          goal: '어떤 종은 개체 수가 많지만 방형구 <b>두 곳에만 몰려</b> 있고, 다른 종은 개체 수가 적어도 방형구 <b>대부분에 고르게</b> 있어요. 두 종을 비교한 설명으로 알맞은 것은?',
          setup() { setMode('table'); },
          choices: ['몰려 있는 종이 밀도도 낮고 빈도도 낮다', '몰려 있는 종은 밀도는 높을 수 있지만 빈도는 낮다', '고르게 퍼진 종은 밀도와 빈도가 모두 낮다', '밀도와 빈도는 항상 같은 값이다'],
          answer: 1,
          feedback: ['개체 수가 많으면 밀도는 높을 수 있어요.', '', '고르게 퍼져 있으면 빈도가 높아요.', '밀도는 개체 수, 빈도는 나타난 방형구의 비율이라 서로 달라요.'],
          explain: '<b>밀도</b>는 개체 수에 의해, <b>빈도</b>는 나타난 방형구 수에 의해 정해져요. 한곳에 몰려 있는 종은 밀도가 높아도 빈도가 낮을 수 있고, 골고루 퍼진 종은 빈도가 높아요.',
        },
      ],
    },
    {
      title: '중요치로 우점종 찾기', short: '중요치', icon: '👑', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 밀도, 빈도, 피도를 구했어요. 세 값은 모두 종의 중요한 모습이에요. 이제 한꺼번에 합쳐 <b>가장 큰 영향을 주는 종(우점종)</b>을 찾아요.</div>' +
        '<p>종마다 <b>상대 밀도 · 상대 빈도 · 상대 피도</b>(%)를 구해 더한 <b>중요치</b>를 비교하고, 중요치가 가장 큰 종을 우점종으로 정해요.</p>',
      features: ['iv'],
      setup() { resetIv(); setMode('iv'); },
      recap: '상대 밀도·상대 빈도·상대 피도를 더한 중요치가 가장 큰 종이 우점종이에요. 개체 수만으로는 군집에서 차지하는 영향을 알 수 없어요.',
      summary: '<ul><li><b>상대값(%)</b> = 그 종의 값 / 모든 종의 값의 합 × 100 (밀도, 빈도, 피도마다)</li><li><b>중요치</b> = 상대 밀도 + 상대 빈도 + 상대 피도 (최대 300)</li><li>이 초지: 중요치 A 102 · B 40 · C 47 · D 111 (합 300) → <b>우점종은 강아지풀(D)</b>이고 토끼풀(A)과 근소한 차이예요.</li><li>쑥(C)은 개체 수가 적지만(상대 밀도 5 %) 잎이 커서 상대 피도가 30 %로 높아요.</li></ul>',
      missions: [
        {
          id: 'rel', title: '상대 밀도·빈도·피도 계산',
          goal: '4종의 <b>상대 밀도, 상대 빈도, 상대 피도</b> 12개를 모두 맞게 입력하세요.',
          hint: '모든 종의 합(밀도 10.0, 빈도 2.5, 피도 1.0)을 이용해요. 예: 토끼풀의 상대 밀도 = 3.0 / 10.0 × 100 = 30. 맞으면 막대가 자라요.',
          setup() { setMode('iv'); },
          check: () => ivRelRight() === 12,
          hold: 0.6,
          status: () => '맞은 상대값 ' + ivRelRight() + ' / 12',
          explain: '<b>상대 밀도</b> 30 · 10 · 5 · 55, <b>상대 빈도</b> 32 · 20 · 12 · 36, <b>상대 피도</b> 40 · 10 · 30 · 20이에요. 각각 4종의 합이 100이 돼요.',
        },
        {
          id: 'dom', title: '중요치와 우점종', manual: true,
          goal: '4종의 <b>중요치</b>를 입력하고 <b>우점종</b>을 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '중요치 = 상대 밀도 + 상대 빈도 + 상대 피도예요. 막대 위에 중요치가 나타나요. 가장 큰 값을 찾아요. 4종의 합은 300이에요.',
          setup() { setMode('iv'); },
          check() {
            const q = S.iv;
            if (ivTotRight() < 4) { let bad = 0; for (let s = 0; s < 4; s++) { const v = q.inp[ivIdx(3, s)], inp = $('#iv' + ivIdx(3, s)); if (!ivOK(3, s)) { if (v !== '') { inp.classList.add('bad'); bad++; } } else inp.classList.remove('bad'); } return bad ? '빨간 칸을 다시 더해 보세요. 중요치 = 상대 밀도 + 상대 빈도 + 상대 피도예요.' : '중요치 칸 4개를 모두 채워요.'; }
            if (q.dom === '') return '우점종을 골라 주세요.';
            if (Number(q.dom) !== DOM) { $('#domSel').classList.add('bad'); return '중요치가 가장 큰 종을 고르세요. 개체 수만 많은 종이 아니라 중요치가 가장 큰 종이에요.'; }
            $('#domSel').classList.remove('bad'); $('#domSel').classList.add('ok');
            return true;
          },
          status: () => '맞은 중요치 ' + ivTotRight() + ' / 4 &nbsp; 우점종 ' + (S.iv.dom === '' ? '—' : (Number(S.iv.dom) === DOM ? '✅' : '❓')),
          explain: '중요치는 <b>A 102 · B 40 · C 47 · D 111</b>(합 300)이고, 가장 큰 <b>D 강아지풀</b>이 우점종이에요. 토끼풀(102)과 차이가 크지 않아요.',
        },
        {
          type: 'quiz', title: '개체 수만으로 정하면 안 되는 까닭',
          goal: '우점종을 정할 때 <b>개체 수(밀도)만</b> 쓰면 안 되는 까닭은?',
          setup() { setMode('iv'); },
          choices: ['개체 수는 세기가 어려워서 믿을 수 없기 때문이다', '개체 수가 적어도 넓게 덮거나(피도) 여러 곳에 퍼져 있는(빈도) 종이 군집에 큰 영향을 줄 수 있기 때문이다', '밀도는 우점종과 아무 관계가 없기 때문이다', '피도와 빈도는 항상 개체 수와 같기 때문이다'],
          answer: 1,
          feedback: ['개체 수도 중요한 정보예요. 다만 그것만으로는 부족해요.', '', '밀도도 중요치를 이루는 한 부분이에요.', '쑥처럼 개체 수는 적어도 피도가 높을 수 있어요. 세 값은 같지 않아요.'],
          explain: '쑥은 개체 수가 적어도 큰 잎으로 넓게 덮고(피도 30 %), 어떤 종은 여러 곳에 퍼져 있어요(빈도). 그래서 <b>밀도·빈도·피도를 모두 합친 중요치</b>로 우점종을 정해요.',
        },
      ],
    },
    {
      title: '군집 해석: 조사가 충분할까?', short: '군집 해석', icon: '🔭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중요치로 우점종을 찾았어요. 이 조사가 충분한지 따져 보고, 군집의 다른 특성(<b>종 다양성</b>, <b>수직 분포</b>)도 해석해요.</div>' +
        '<p>종 수–방형구 수 곡선으로 조사가 충분한지 판단하고, 두 초지의 <b>종 다양성</b>을 비교하고, 숲의 <b>수직 분포</b>에 이름표를 붙여요.</p>',
      features: ['area', 'layer'],
      setup() { resetArea(); resetLayer(); setMode('area'); },
      recap: '종 수–방형구 수 곡선이 평평해지면 조사가 충분해요. 종 수가 같아도 각 종의 개체 수가 고를수록 종 다양성이 높고, 숲은 빛의 양에 따라 층을 이루어요.',
      summary: '<ul><li><b>조사의 충분성</b>: 방형구를 늘려도 새로운 종이 나타나지 않으면(곡선이 평평하면) 충분해요. 이 초지는 6개부터 4종으로 일정해요.</li><li><b>종 다양성</b>: 종 수가 많고 각 종의 개체 수가 고를수록 높아요. (초지 X 55 : 30 : 10 : 5 &lt; 초지 Y 25 : 25 : 25 : 25)</li><li><b>수직 분포</b>: 교목층 → 아교목층 → 관목층 → 초본층. 빛의 양이 층마다 달라서 사는 식물이 달라요. (바닥에는 약 15 %의 빛)</li><li>우점종의 변화는 환경이 변했다는 단서가 될 수 있어요.</li></ul>',
      missions: [
        {
          id: 'area', title: '조사 충분성과 종 다양성', manual: true,
          goal: '방형구 수 슬라이더를 <b>10개</b>까지 늘려 곡선을 본 뒤, <b>조사가 충분한지</b>와 <b>종 다양성이 더 높은 초지</b>를 고르고 ✔ 확인하기를 누르세요.',
          hint: '방형구가 늘어도 나타난 종 수가 더 늘지 않는지 보세요. 초지 X와 Y는 둘 다 4종이지만 각 종의 비율이 달라요. 고른 정도를 비교해 보세요.',
          setup() { setMode('area'); },
          check() {
            const q = S.ar;
            if (q.maxN < 10) return '방형구 수 슬라이더를 10개까지 움직여 곡선 전체를 확인해요.';
            if (q.suff === '' || q.div === '') return '두 질문의 답을 모두 골라요.';
            const bs = q.suff !== '1', bd = q.div !== 'Y';
            $('#selSuff').classList.toggle('bad', bs); $('#selSuff').classList.toggle('ok', !bs); $('#selDiv').classList.toggle('bad', bd); $('#selDiv').classList.toggle('ok', !bd);
            if (bs) return '곡선이 평평해진 구간을 보세요. 방형구를 6개 이상 늘려도 나타난 종 수가 더 늘지 않았어요.';
            if (bd) return '두 초지 모두 4종이에요. 각 종의 비율이 더 고른 쪽이 종 다양성이 높아요.';
            return true;
          },
          status: () => '곡선 끝까지 확인 ' + mark(S.ar.maxN >= 10) + ' &nbsp; 충분성 ' + (S.ar.suff === '' ? '—' : '선택') + ' &nbsp; 다양성 ' + (S.ar.div === '' ? '—' : '선택'),
          explain: '종 수는 방형구 6개에서 4종이 되고 10개까지 <b>더 늘지 않아</b> 조사는 <b>충분</b>해요. 초지 X(55 : 30 : 10 : 5)는 한 종이 많고, 초지 Y(25 : 25 : 25 : 25)는 고르게 분포해서 <b>Y의 종 다양성이 더 높아요</b>.',
        },
        {
          id: 'layer', title: '숲의 수직 분포 이름표', manual: true,
          goal: '<b>🌲 수직 분포</b> 화면에서 왼쪽 이름표를 눌러 <b>교목층 · 아교목층 · 관목층 · 초본층</b>을 알맞은 높이에 붙인 뒤 ✔ 확인하기를 누르세요.',
          hint: '가장 높은 큰 나무의 층이 교목층이고, 바닥 가까이 낮게 자라는 풀이 초본층이에요. 위에서 아래로 차례로 붙여요.',
          setup() { setMode('layer'); },
          check() {
            const q = S.lay;
            if (layPicked() < 4) return '아직 이름표를 붙이지 않은 층이 ' + (4 - layPicked()) + '개 있어요.';
            const bad = [];
            q.pick.forEach((p, i) => { if (p !== i) { bad.push(i); if (!q.bad[i]) { q.bad[i] = true; q.shakeT = S.clock; } } else delete q.bad[i]; });
            if (bad.length) return '빨간 이름표를 다시 골라요. 위에서부터 교목층, 아교목층, 관목층, 초본층 순서예요.';
            return true;
          },
          status: () => '붙인 이름표 ' + layPicked() + ' / 4 &nbsp; 맞은 층 ' + layRight(),
          explain: '위에서부터 <b>교목층 → 아교목층 → 관목층 → 초본층</b>이에요. 위쪽 층이 빛을 먼저 받아서 바닥(초본층)에는 약 15 %만 도달해요. 그래서 층마다 사는 식물이 달라요.',
        },
        {
          type: 'quiz', title: '개체 수가 같아도 종 다양성이 달라요',
          goal: '두 초지 모두 식물이 <b>100포기, 4종</b>이에요. 초지 X(55 : 30 : 10 : 5)와 초지 Y(25 : 25 : 25 : 25) 중 <b>종 다양성이 높은 초지</b>와 그 까닭으로 알맞은 것은?',
          setup() { setMode('area'); },
          choices: ['X, 한 종의 개체 수가 가장 많기 때문이다', 'Y, 종 수는 같지만 각 종의 개체 수가 고르게 분포하기 때문이다', '둘이 같다, 종 수가 같기 때문이다', 'X, 개체 수가 많은 종이 있어서 안정적이기 때문이다'],
          answer: 1,
          feedback: ['한 종이 아주 많으면 오히려 다양성이 낮아요.', '', '종 수가 같아도 고른 정도가 다르면 종 다양성이 달라요.', '종 다양성은 종 수와 고른 정도로 판단해요.'],
          explain: '종 다양성은 <b>종의 수</b>뿐 아니라 <b>각 종의 개체 수가 고른 정도</b>로 판단해요. 종 수가 같아도 Y는 4종이 고르게 있어 다양성이 더 높아요. 우점종의 변화는 환경 변화의 단서가 될 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-quadrat', mount: '#game', badge: '군집 조사원', homeHref: '../../index.html#hb',
    featureLabels: { field: '🗺️ 가상 초지 · 방형구 설치', zoom: '🔍 방형구 확대 · 식물 세기', table: '📋 기록표 · 밀도·빈도·피도 입력', iv: '👑 중요치 막대그래프', area: '📈 종 수–방형구 수 곡선 · 종 다양성', layer: '🌲 숲의 수직 분포' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetField(); resetTbl(); resetIv(); resetArea(); resetLayer();
  setMode('field');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepTbl(dt); stepIv(dt); stepArea(dt);
    switch (S.mode) {
      case 'field': drawField(dt, t); break;
      case 'zoom': drawZoom(dt, t); break;
      case 'table': drawTbl(dt, t); break;
      case 'iv': drawIv(dt, t); break;
      case 'area': drawArea(dt, t); break;
      default: drawLayer(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm && cm.id === 'layer' && !S.lay.solved) { S.lay.solved = true; updateCtl(); }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, CNT, COV, TOT_CNT, TOT_COV, OCC, DENS, FREQ, COVR, REL_D, REL_F, REL_C, IV, DOM, CUM_SP, QPOS, QPLANTS, qRect, ZQ, zRow, zpx, FD, throwQuad, openZoom, autoFill, layTag, ivIdx, REC_ANS, FIELD_PLANTS, plantCountNear,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepTbl(0.02); stepIv(0.02); stepArea(0.02); } },
  };
})();
