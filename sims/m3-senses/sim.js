/* =========================================================
   중3 Ⅴ. 자극과 반응 — 감각 기관과 자극의 전달 [9과20-01]
   ① [실험] 맹점 실험: ●의 상이 시각 신경이 나가는 곳에 맺히면 사라진다 → 그곳에는 시각 세포가 없다
   ② [탐구] 눈의 조절: 홍채(동공 크기) · 섬모체와 수정체(두께) → 망막에 선명한 상
   ③ [관찰] 여러 감각: 귀 · 코와 혀 · 피부 — 자극을 받아들이는 곳
   ④ [설명] 뇌로 전달: 자극 → 감각 기관 → 감각 세포 → 감각 신경 → 대뇌
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mix = SciSim.color.mix;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const W = 800, H = 560, BG = '#eef4ef';
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const PFX = new SciSim.Particles();
  let clock = 0;
  let game = null;
  let F = new Set();

  /* ---------- 그리기 도우미 ---------- */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) { while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); } }
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333'; ctx.fillText(s, x, y); ctx.textBaseline = 'alphabetic';
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2; if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2); ctx.fillStyle = o.bg || '#1b2333'; ctx.fill(); ctx.restore();
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    ctx.restore();
    return { x: lx, y: y - h / 2, w, h };
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r != null ? o.r : 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill(); ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r != null ? o.r : 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  function lgrad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function smooth(c, pts, closed) {
    const n = pts.length; c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1, p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  function bead(x, y, r, color, o) {
    o = o || {}; ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.shadowColor = 'rgba(20,30,40,.25)'; ctx.shadowBlur = o.noShadow ? 0 : r * 0.6; ctx.shadowOffsetY = o.noShadow ? 0 : r * 0.2;
    ctx.fillStyle = rgrad(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r, [[0, shade(color, 0.6)], [0.55, color], [1, shade(color, -0.28)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  function ringPulse(x, y, r, color) {
    const a = 0.5 + 0.5 * Math.sin(clock * 6);
    ctx.save(); ctx.strokeStyle = rgba(color || '#16a34a', 0.35 + a * 0.5); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + a * 3, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function checkMark(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x - s * 0.1, y + s * 0.38); ctx.lineTo(x + s * 0.5, y - s * 0.35); ctx.stroke(); ctx.restore();
  }
  function burst(x, y, colors, n) { PFX.burst(x, y, { count: n || 16, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }); }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const inC = (p, c, pad) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + (pad || 0);
  const shk = (v) => (v > 0.01 && !RM ? Math.sin(clock * 60) * 6 * v : 0);

  /* 화면 안내 말풍선 */
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = clock; HINT.tEnd = clock + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg) HINT.tEnd = Math.min(HINT.tEnd, clock); }
  function drawHint() {
    if (!HINT.msg) return;
    const a = Math.min(clamp((clock - HINT.t0) / 0.35, 0, 1), clamp(1 - (clock - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (clock > HINT.tEnd) HINT.msg = ''; return; }
    pill(HINT.msg, W / 2, H - 22, { size: 14, bg: 'rgba(27,35,51,.88)', alpha: a, pad: 14 });
  }

  /* 정보 말풍선 (그림의 이름표를 눌렀을 때) */
  const TIP = { msg: '', title: '', x: 0, y: 0, until: 0 };
  function showTip(title, msg, x, y) { TIP.title = title; TIP.msg = msg; TIP.x = x; TIP.y = y; TIP.until = clock + 4.5; }
  function drawTip() {
    if (clock > TIP.until || !TIP.msg) return;
    const a = clamp((TIP.until - clock) / 0.4, 0, 1) * clamp((clock - (TIP.until - 4.5)) / 0.12, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = font(13.5, 600);
    const lines = wrap(TIP.msg, 210), w = 232, h = 40 + lines.length * 19;
    let x = clamp(TIP.x - w / 2, 8, W - w - 8), y = TIP.y - h - 14; if (y < 8) y = TIP.y + 22;
    ctx.shadowColor = 'rgba(20,40,30,.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(x, y, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
    rr(x, y, w, h, 14); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke();
    txt(TIP.title, x + 14, y + 24, { size: 15, weight: 800, color: '#15803d' });
    lines.forEach((l, i) => txt(l, x + 14, y + 46 + i * 19, { size: 13.5, weight: 600, color: '#334155' }));
    ctx.restore();
  }
  function wrap(s, maxW) {
    ctx.font = font(13.5, 600);
    const out = []; let cur = '';
    for (const ch of s) { const test = cur + ch; if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = ch === ' ' ? '' : ch; } else cur = test; }
    if (cur) out.push(cur); return out;
  }

  /* 신경 신호(빛 펄스): path = [[x,y],...] */
  function pathLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }
  function pathAt(path, d) {
    for (let i = 1; i < path.length; i++) {
      const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (d <= seg || i === path.length - 1) { const k = seg ? clamp(d / seg, 0, 1) : 0; return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k]; }
      d -= seg;
    }
    return path[path.length - 1];
  }
  function strokePath(path, color, w, a) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (a != null) ctx.globalAlpha = a;
    ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  /* 펄스 한 줄: head = 앞쪽 위치(0~1 이상), 길이 비율로 꼬리 */
  function pulses(path, head, color, o) {
    o = o || {};
    const L = pathLen(path), n = o.n || 3, gap = o.gap || 0.12;
    for (let i = 0; i < n; i++) {
      const k = head - i * gap; if (k < 0 || k > 1) continue;
      const p = pathAt(path, k * L), a = (o.alpha != null ? o.alpha : 1) * (1 - i * 0.28);
      ctx.save(); ctx.globalAlpha = a; D.glow(p[0], p[1], 16, color, 0.8);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 4.2, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], 2.8, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  function drawBrain(cx, cy, s, glow, label) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    if (glow > 0.01) D.glow(0, 0, 70, '#fde047', 0.55 * glow);
    D.shadow(() => {
      ctx.fillStyle = lgrad(0, -40, 0, 40, [[0, '#f9b4c8'], [1, '#e98aa8']]);
      ctx.beginPath(); smooth(ctx, [[-52, 6], [-46, -22], [-26, -38], [2, -42], [30, -36], [50, -16], [52, 10], [38, 30], [14, 36], [-10, 32], [-34, 34]], true); ctx.fill();
    }, { blur: 8, y: 3, color: 'rgba(120,30,60,.25)' });
    ctx.strokeStyle = 'rgba(160,50,90,.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    [[[-34, -4], [-20, -22], [-4, -8], [10, -26]], [[-30, 18], [-14, 6], [4, 20], [22, 6]], [[16, -6], [30, -18], [42, -4]], [[-8, 28], [8, 16], [26, 26]]].forEach((c) => { ctx.beginPath(); smooth(ctx, c, false); ctx.stroke(); });
    ctx.restore();
    if (label) txt(label, cx, cy + 56 * s, { size: 14, weight: 800, color: '#9d174d', align: 'center' });
  }

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'blind',
    blind: { off: 3, dist: 30, vis: 1, hitDists: [], drag: false, hitAt: -9 },
    adj: { bright: 0.5, obj: 0.5, pupil: 13, lens: new SciSim.Spring(0.5, { stiffness: 34, damping: 9 }), seen: { bright: false, dark: false, near: false, far: false }, sharp: 1, spotR: 3 },
    ear: { t: -1, tapped: false, ring: 0 },
    nose: { food: 'apple', pinch: 0, pinched: false, t: -1, tastedOpen: false, tastedPinched: false, tappedNose: false, tappedTongue: false, result: '', resultAt: -9 },
    skin: { region: 'finger', gap: 3, obs: { finger: { one: {}, two: {} }, back: { one: {}, two: {} } }, tapped: false },
    path: { rows: [], sendT: -1, pulseOk: false },
    tapped: { ear: false, nose: false, tongue: false, skin: false },
  };
  const on = (f) => F.has(f);
  const HOT = [];
  const mark = (b) => (b ? '✅' : '⬜');

  /* ---------- 눈 모형 (오른눈을 위에서 본 단면, 빛은 왼쪽에서 들어온다) ---------- */
  const EYE = { cx: 548, cy: 288, R: 128 };
  EYE.LX = EYE.cx - 0.6 * EYE.R; EYE.IX = EYE.LX - 11; EYE.rin = EYE.R - 5;
  const DISC_DEG = 15;
  function retPt(deg) {   // 수정체 중심(N)에서 deg(아래쪽이 +)로 나간 광선이 망막에 닿는 점
    const d = deg * Math.PI / 180, dx = Math.cos(d), dy = Math.sin(d);
    const b = -0.6 * EYE.R * dx, c = 0.36 * EYE.R * EYE.R - EYE.rin * EYE.rin;
    const t = -b + Math.sqrt(Math.max(0, b * b - c));
    return { x: EYE.LX + t * dx, y: EYE.cy + t * dy };
  }
  function globePath() {
    const { cx, cy, R } = EYE, a = Math.asin(52 / R);
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI + a, Math.PI * 3 - a, false);
    ctx.quadraticCurveTo(cx - R - 44, cy, cx - R * Math.cos(a), cy - 52); ctx.closePath();
  }
  function tag(text, px, py, tx, ty, info, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = 'rgba(30,41,59,.7)'; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.fill(); ctx.restore();
    const r = pill(text, px, py, { size: 13, bg: o.bg || '#fff', color: o.color || '#1b2333', border: o.border || '#94a3b8', borderW: 1.5, shadow: true, pad: 9, h: 26 });
    if (info) HOT.push({ x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8, title: info.title || text, msg: info.msg, tag: info.tag, tx: px, ty: py });
    return r;
  }
  function drawEye(o) {
    const { cx, cy, R, LX, IX } = EYE, pr = o.pupil, u = o.u;
    const D0 = retPt(DISC_DEG), nx = (D0.x - cx) / EYE.rin, ny = (D0.y - cy) / EYE.rin;
    ctx.save();
    // 시각 신경 (눈 뒤쪽으로 나가는 다발)
    const ne = { x: D0.x + nx * 100, y: D0.y + ny * 100 };
    strokePath([[D0.x, D0.y], [ne.x, ne.y]], '#d9b96a', 26, 1);
    strokePath([[D0.x, D0.y], [ne.x, ne.y]], '#f6e7b4', 19, 1);
    ctx.strokeStyle = 'rgba(180,140,60,.55)'; ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(D0.x - ny * i * 3.6, D0.y + nx * i * 3.6); ctx.lineTo(ne.x - ny * i * 3.6, ne.y + nx * i * 3.6); ctx.stroke(); }
    // 눈알
    globePath();
    ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    globePath(); ctx.fillStyle = rgrad(cx + 20, cy - 20, 10, cx, cy, R + 10, [[0, '#f1f9ff'], [1, '#d6ebf8']]); ctx.fill();
    // 방수(각막과 홍채 사이)
    ctx.save(); globePath(); ctx.clip();
    ctx.fillStyle = 'rgba(186,226,250,.7)'; ctx.fillRect(cx - R - 50, cy - 70, IX - (cx - R - 50), 140);
    ctx.restore();
    globePath(); ctx.strokeStyle = '#e7d8c4'; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.stroke();
    // 각막
    { const a = Math.asin(52 / R); ctx.beginPath(); ctx.moveTo(cx - R * Math.cos(a), cy - 52); ctx.quadraticCurveTo(cx - R - 44, cy, cx - R * Math.cos(a), cy + 52); ctx.strokeStyle = 'rgba(96,176,230,.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke(); }
    // 망막
    ctx.strokeStyle = '#9c5a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R - 1, -1.5, 1.5); ctx.stroke();
    ctx.strokeStyle = '#f4a3a3'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R - 6, -1.5, 1.5); ctx.stroke();
    // 중심와 · 맹점(시각 신경이 나가는 곳)
    const Fv = retPt(0);
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(Fv.x + 1, Fv.y, 5, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(D0.x, D0.y); ctx.rotate(Math.atan2(ny, nx));
    ctx.fillStyle = '#fff6cf'; ctx.strokeStyle = '#d6b45a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 15, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    // 홍채
    [[cy - 54, pr, -1], [cy + pr, cy + 54, 1]].forEach((q, i) => {
      const y0 = i === 0 ? cy - 54 : cy + pr, h = i === 0 ? (cy - pr) - (cy - 54) : (cy + 54) - (cy + pr);
      ctx.fillStyle = lgrad(IX - 5, 0, IX + 5, 0, [[0, '#7aa3c9'], [1, '#3f6590']]); rr(IX - 5, y0, 10, Math.max(2, h), 4); ctx.fill();
    });
    // 수정체 · 섬모체
    const tl = lerp(7, 18, clamp(u, 0, 1.1)), lh = 29;
    const ciliaY = lerp(18, 8, clamp(u, 0, 1)), ciliaRy = lerp(7, 11, clamp(u, 0, 1)), slack = lerp(0, 7, clamp(u, 0, 1));
    [-1, 1].forEach((s) => {
      const by = cy + s * (lh + ciliaY);
      ctx.strokeStyle = 'rgba(100,116,139,.8)'; ctx.lineWidth = 1.5;
      [-5, 5].forEach((dx) => { ctx.beginPath(); ctx.moveTo(LX + dx * 1.5, by - s * ciliaRy * 0.6); ctx.quadraticCurveTo(LX + dx * 1.2 + slack * dx / 5, cy + s * (lh + ciliaY * 0.5), LX + dx * 0.5, cy + s * (lh - 3)); ctx.stroke(); });
      ctx.fillStyle = lgrad(0, by - 12, 0, by + 12, [[0, '#f1a898'], [1, '#d97a6a']]); ctx.beginPath(); ctx.ellipse(LX, by, 17, ciliaRy, 0, 0, TAU); ctx.fill();
    });
    ctx.save(); ctx.shadowColor = 'rgba(120,90,10,.3)'; ctx.shadowBlur = 8;
    ctx.fillStyle = rgrad(LX - tl * 0.4, cy - 10, 3, LX, cy, lh, [[0, '#fffbe0'], [1, '#f6dc7b']]); ctx.beginPath(); ctx.ellipse(LX, cy, tl, lh, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#d9b43d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(LX, cy, tl, lh, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    return { D0, Fv, ne, nx, ny };
  }
  /* 광선 묶음: O → 동공 가장자리 → F → 망막까지 */
  function rayBundle(O, Fp, pr, alpha, color, n) {
    const { cy, IX } = EYE;
    for (let j = -n; j <= n; j++) {
      const A = { x: IX - 2, y: cy + pr * (j / n) * 0.96 };
      const dx = Fp.x - A.x, dy = Fp.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      // 망막(안쪽 원)까지 연장
      const px = A.x - EYE.cx, py = A.y - cy, b = px * ux + py * uy, c = px * px + py * py - EYE.rin * EYE.rin;
      const t = -b + Math.sqrt(Math.max(0, b * b - c));
      const E = { x: A.x + ux * t, y: A.y + uy * t };
      ctx.save(); ctx.strokeStyle = rgba(color, alpha * (Math.abs(j) === n ? 1 : 0.7)); ctx.lineWidth = Math.abs(j) === n ? 2.2 : 1.6; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(A.x, A.y); ctx.lineTo(E.x, E.y); ctx.stroke(); ctx.restore();
    }
  }

  /* ===== 장면 1: 맹점 실험 ===== */
  const CARD = { x: 20, y: 62, w: 280, h: 150, px: 54, K: 8.3 };
  function blindGeom() {
    const B = S.blind, th = Math.atan2(B.off, B.dist), deg = th * 180 / Math.PI;
    const x0 = 322, dN = EYE.LX - x0, yo = EYE.cy - dN * Math.tan(th);
    return { th, deg, x0, dN, yo, F: retPt(deg), plus: { x: x0, y: EYE.cy } };
  }
  function updateBlind(dt) {
    const B = S.blind, g = blindGeom(), D0 = retPt(DISC_DEG);
    B.deg = g.deg;
    const dd = Math.hypot(g.F.x - D0.x, g.F.y - D0.y);
    B.dd = dd; B.visT = smoothstep(11, 22, dd);
    B.vis = SciSim.approach(B.vis, B.visT, dt, 14);
    if (B.visT < 0.04) {
      if (B.hitAt < 0 || clock - B.hitAt > 1.2) B.hitAt = clock;
    } else B.hitAt = -9;
    B.hidden = B.vis < 0.08;
    if (B.hidden) { const d = Math.round(B.dist); if (B.hitDists.indexOf(d) < 0 && B.hold > 0.5) B.hitDists.push(d); B.hold = (B.hold || 0) + dt; } else B.hold = 0;
  }
  function drawBlind() {
    const B = S.blind, g = blindGeom(), eye = drawEyeFor();
    const D0 = eye.D0;
    // ---- 카드(앞에서 본 모습)
    panel(CARD.x, CARD.y, CARD.w, CARD.h, { bg: '#fff' });
    txt('📄 카드 (앞에서 본 모습)', CARD.x + 14, CARD.y + 24, { size: 14, weight: 800 });
    const cy0 = CARD.y + 88, bx = CARD.px + B.off * CARD.K;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CARD.px - 13, cy0); ctx.lineTo(CARD.px + 13, cy0); ctx.moveTo(CARD.px, cy0 - 13); ctx.lineTo(CARD.px, cy0 + 13); ctx.stroke();
    const dragHint = !B.drag && !B.touched;
    ctx.save(); ctx.globalAlpha = B.vis;
    ctx.save(); if (B.vis > 0.3) { ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(bx, cy0, 12 * (B.drag ? 1.12 : 1), 0, TAU); ctx.fill(); ctx.restore(); ctx.restore();
    if (B.vis < 0.5) { ctx.save(); ctx.globalAlpha = 1 - B.vis; ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, cy0, 12, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (dragHint) { ringPulse(bx, cy0, 17, '#dc2626'); }
    pill(B.hidden ? '● 안 보여요!' : '● 보여요', CARD.x + CARD.w / 2, CARD.y + CARD.h - 20, { size: 14, bg: B.hidden ? '#dc2626' : '#16a34a', pad: 12 });
    txt('오른눈으로 + 만 보세요', CARD.x + CARD.w / 2, CARD.y + CARD.h + 22, { size: 13.5, weight: 700, color: '#475569', align: 'center' });
    // ---- 위에서 본 눈
    txt('👁️ 위에서 본 오른눈', EYE.cx + 20, 52, { size: 15, weight: 800, color: '#14532d', align: 'center' });
    // 카드(옆모습) 막대와 물체
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x0, g.yo - 24); ctx.lineTo(g.x0, EYE.cy + 24); ctx.stroke();
    txt('카드', g.x0 - 10, EYE.cy + 44, { size: 13, weight: 800, color: '#64748b', align: 'center' });
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(g.x0 - 8, EYE.cy); ctx.lineTo(g.x0 + 8, EYE.cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(g.x0, EYE.cy - 8); ctx.lineTo(g.x0, EYE.cy + 8); ctx.stroke();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(g.x0, g.yo, 8, 0, TAU); ctx.fill();
    // 광선: + (파랑) 과 ● (빨강)
    const Fp = g.plus, F0 = retPt(0);
    rayBundle({ x: g.x0, y: EYE.cy }, F0, 12, 0.55, '#2563eb', 2);
    rayBundle({ x: g.x0, y: g.yo }, g.F, 12, 0.85, '#dc2626', 2);
    // 상(망막 위의 점)
    ctx.save(); D.glow(F0.x, F0.y, 14, '#2563eb', 0.6); ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(F0.x, F0.y, 3.6, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); D.glow(g.F.x, g.F.y, 18, '#dc2626', 0.75); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(g.F.x, g.F.y, 4.6, 0, TAU); ctx.fill(); ctx.restore();
    // 이름표
    tag('각막', 396, 150, 424, 270, { title: '각막', msg: '눈 앞쪽의 투명한 막이에요. 빛이 처음 들어오는 곳이에요.' });
    tag('수정체', 468, 128, 468, 266, { title: '수정체', msg: '볼록 렌즈처럼 빛을 모아 망막에 상이 맺히게 해요.' });
    tag('망막', 648, 186, EYE.cx + EYE.R - 8, 214, { title: '망막', msg: '시각 세포가 있어서 빛 자극을 받아들이는 곳이에요. 상이 거꾸로 맺혀요.' });
    tag('시각 신경', eye.ne.x + 6, eye.ne.y + 22, eye.ne.x - eye.nx * 18, eye.ne.y - eye.ny * 18, { title: '시각 신경', msg: '시각 세포가 받아들인 자극을 뇌로 전달하는 신경이에요.' });
    const t1 = tag('맹점', D0.x + 50, D0.y - 16, D0.x + 3, D0.y, { title: '맹점', msg: '시각 신경이 모여 눈 밖으로 나가는 곳이에요. 시각 세포가 없어서 상이 맺혀도 보이지 않아요.', tag: 'blindspot' }, { bg: '#fef9c3', border: '#d6b45a' });
    // ---- 확대: 맹점 근처의 망막
    const M = { x: 156, y: 392, r: 96 }, k = 3.1;
    panel(20, 270, 280, 270, { bg: '#fff' });
    txt('🔍 망막 확대 (맹점 근처)', 34, 294, { size: 14, weight: 800 });
    ctx.save(); ctx.beginPath(); ctx.arc(M.x, M.y + 10, M.r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fdf2f2'; ctx.fillRect(M.x - M.r, M.y - M.r, M.r * 2, M.r * 2 + 20);
    ctx.translate(M.x, M.y + 10); ctx.scale(k, k); ctx.translate(-D0.x, -D0.y);
    // 망막 층과 시각 세포
    const nrm = Math.atan2(eye.ny, eye.nx);
    ctx.strokeStyle = '#f4a3a3'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(EYE.cx, EYE.cy, EYE.R - 6, nrm - 0.4, nrm + 0.4); ctx.stroke();
    ctx.strokeStyle = '#9c5a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(EYE.cx, EYE.cy, EYE.R - 1, nrm - 0.4, nrm + 0.4); ctx.stroke();
    const dr = 15;
    for (let a = -0.4; a <= 0.4; a += 0.0268) {
      const ang = nrm + a, px = EYE.cx + Math.cos(ang) * (EYE.R - 12), py = EYE.cy + Math.sin(ang) * (EYE.R - 12);
      if (Math.hypot(px - D0.x, py - D0.y) < dr + 1) continue;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ca * 7, py - sa * 7); ctx.stroke();
      ctx.fillStyle = '#fed7aa'; ctx.beginPath(); ctx.arc(px - ca * 7, py - sa * 7, 1.6, 0, TAU); ctx.fill();
    }
    // 맹점(세포 없음) · 시각 신경 다발
    ctx.save(); ctx.translate(D0.x, D0.y); ctx.rotate(nrm);
    ctx.fillStyle = '#fff6cf'; ctx.strokeStyle = '#d6b45a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(-2, 0, 6, dr, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6e7b4'; ctx.fillRect(2, -9, 26, 18);
    ctx.restore();
    // 상(점)
    const iv = { x: g.F.x, y: g.F.y };
    ctx.save(); ctx.globalAlpha = 1; D.glow(iv.x, iv.y, 11, '#dc2626', 0.8); ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(iv.x, iv.y, 4.6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = B.hidden ? '#dc2626' : '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(M.x, M.y + 10, M.r, 0, TAU); ctx.stroke(); ctx.restore();
    // 확대 안의 이름표(고정 위치)
    pill('맹점: 시각 세포 없음', M.x, M.y + 10 + 30, { size: 12.5, bg: 'rgba(254,249,195,.97)', color: '#713f12', border: '#d6b45a', borderW: 1.5, pad: 8, h: 24 });
    pill('시각 세포', M.x - 46, M.y + 10 - 62, { size: 12.5, bg: 'rgba(255,237,213,.97)', color: '#9a3412', border: '#fb923c', borderW: 1.5, pad: 8, h: 24 });
    // 확대 선
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(D0.x - 14, D0.y - 4); ctx.lineTo(M.x + M.r * 0.96, M.y + 10 - M.r * 0.2); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(D0.x, D0.y, 20, 0, TAU); ctx.stroke();
    if (B.hidden) { ctx.save(); D.glow(D0.x, D0.y, 40 + 6 * Math.sin(clock * 6), '#dc2626', 0.25); ctx.restore(); }
    // 느낌표 안내
    if (B.hidden && B.hitAt > 0 && clock - B.hitAt < 2.2) pill('빛은 눈에 들어오지만 시각 세포가 없어서 안 보여요!', EYE.cx - 40, 500, { size: 14, bg: '#92400e', pad: 14, shadow: true });
  }
  const drawEyeFor = () => drawEye({ pupil: 12, u: 0.18 });

  /* ===== 장면 2: 눈의 조절 (홍채 · 수정체) ===== */
  const DIST = (v) => 0.2 * Math.pow(30, v);                   // 슬라이더 0~1 → 0.2 m ~ 6 m
  const distText = (m) => (m < 1 ? Math.round(m * 100) + ' cm' : (Math.round(m * 10) / 10) + ' m');
  const Dn = (v) => 2.33 * Math.pow(12.875, v);                // 눈 길이(수정체~망막)를 1로 했을 때의 거리(모형)
  function needU(v) {                                           // 그 거리에서 선명하려면 필요한 수정체 두께(0~1)
    const f = 1 / (1 / Dn(v) + 1);
    return clamp((1 - f) / 0.3, 0, 1);
  }
  function lensF(u) { return 1 - 0.3 * clamp(u, 0, 1.2); }
  function updateAdjust(dt) {
    const A = S.adj, m = DIST(A.obj);
    const pt = lerp(21, 5, smoothstep(0.08, 0.92, A.bright));
    A.pupil = RM ? pt : SciSim.approach(A.pupil, pt, dt, 5);
    A.lens.target = needU(A.obj); A.lens.update(dt);
    const u = A.lens.value, dn = Dn(A.obj), f = lensF(u);
    const inv = 1 / f - 1 / dn, i = inv > 0.02 ? 1 / inv : 3;
    A.iNorm = clamp(i, 0.4, 3);
    A.err = Math.abs(A.iNorm - 1);
    A.spotR = 2.6 + A.err * 60 * (A.pupil / 21 + 0.25);
    A.sharp = A.err < 0.03 ? 1 : 0;
    if (A.bright >= 0.88 && Math.abs(A.pupil - 5) < 1.2) A.seen.bright = true;
    if (A.bright <= 0.12 && Math.abs(A.pupil - 21) < 1.2) A.seen.dark = true;
    if (A.sharp && Math.abs(u - needU(A.obj)) < 0.05) { if (m <= 0.35 && u > 0.7) A.seen.near = true; if (m >= 4 && u < 0.2) A.seen.far = true; }
  }
  function drawFlower(x, y, sc, blur) {
    const n = blur > 0.5 ? 5 : 1;
    for (let k = 0; k < n; k++) {
      const ox = n > 1 ? Math.cos(k * 2.4) * blur : 0, oy = n > 1 ? Math.sin(k * 2.4) * blur : 0;
      ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(sc, sc); ctx.globalAlpha = n > 1 ? 0.42 : 1;
      ctx.strokeStyle = '#4d8f3a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 14); ctx.quadraticCurveTo(-6, 44, 0, 70); ctx.stroke();
      ctx.fillStyle = '#6bbf4e'; ctx.beginPath(); ctx.ellipse(12, 48, 14, 6, -0.5, 0, TAU); ctx.fill();
      for (let p = 0; p < 6; p++) { ctx.save(); ctx.rotate(p * Math.PI / 3); ctx.fillStyle = lgrad(0, -6, 0, -34, [[0, '#f9a8d4'], [1, '#ec4899']]); ctx.beginPath(); ctx.ellipse(0, -18, 11, 17, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function drawAdjust() {
    const A = S.adj, m = DIST(A.obj), u = A.lens.value, b = A.bright;
    // ---- 왼쪽: 주변 환경
    const bgc = mix('#2a3350', '#fff3c4', b), bgc2 = mix('#3a4570', '#cdeaff', b);
    ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(20, 62, 282, 436, 16); ctx.fillStyle = lgrad(0, 62, 0, 498, [[0, bgc2], [1, bgc]]); ctx.fill(); ctx.restore();
    ctx.save(); rr(20, 62, 282, 436, 16); ctx.clip();
    if (b > 0.5) {  // 해
      const sx = 70, sy = 118, k = (b - 0.5) / 0.5;
      D.glow(sx, sy, 80 + 20 * k, '#fde047', 0.5 * k + 0.2);
      ctx.strokeStyle = rgba('#f59e0b', 0.4 + 0.5 * k); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + clock * 0.3; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * (28 + k * 4), sy + Math.sin(a) * (28 + k * 4)); ctx.lineTo(sx + Math.cos(a) * (38 + k * 12), sy + Math.sin(a) * (38 + k * 12)); ctx.stroke(); }
      bead(sx, sy, 22, '#fcd34d', { noShadow: true });
    } else {  // 달과 별
      const k = (0.5 - b) / 0.5;
      ctx.fillStyle = rgba('#e2e8f0', 0.5 + 0.5 * k); ctx.beginPath(); ctx.arc(70, 118, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = mix('#2a3350', '#3a4570', 0.5); ctx.beginPath(); ctx.arc(80, 112, 20, 0, TAU); ctx.fill();
      for (let i = 0; i < 7; i++) { const sx = 130 + (i * 53) % 150, sy = 90 + (i * 37) % 70; D.spark(sx, sy, 5 + (i % 3), clock + i, rgba('#fff', 0.4 + 0.6 * k)); }
    }
    ctx.restore();
    txt(b > 0.66 ? '☀️ 아주 밝아요' : b < 0.34 ? '🌙 어두워요' : '🙂 보통 밝기', 36, 92, { size: 14, weight: 800, color: b > 0.5 ? '#92400e' : '#e2e8f0', halo: b > 0.5 ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.25)' });
    // 물체(꽃): 가까울수록 크게
    const sc = lerp(1.7, 0.55, smoothstep(0, 1, A.obj)), ox = 214, oy = EYE.cy - 5 * sc;
    const blurPx = Math.min(10, A.err * 28);
    ctx.save(); rr(20, 62, 282, 436, 16); ctx.clip(); drawFlower(ox, oy, sc, blurPx > 1.2 ? blurPx * 0.5 : 0); ctx.restore();
    pill('🌸 ' + distText(m), 160, 462, { size: 14, bg: 'rgba(27,35,51,.82)', pad: 12 });
    // ---- 오른쪽: 눈
    txt('👁️ 눈의 단면 (위에서 본 모습)', EYE.cx + 20, 52, { size: 15, weight: 800, color: '#14532d', align: 'center' });
    const O = { x: ox + 24 * sc, y: EYE.cy };
    const Fx = EYE.LX + A.iNorm * (EYE.cx + EYE.rin - EYE.LX);
    rayBundle(O, { x: Fx, y: EYE.cy }, A.pupil, 0.25 + 0.6 * b, '#f59e0b', Math.max(2, Math.round(A.pupil / 5)));
    const eye = drawEye({ pupil: A.pupil, u });
    // 망막 위의 점(상)
    const rp = retPt(0);
    ctx.save(); D.glow(rp.x, rp.y, 12 + A.spotR * 2.2, '#f59e0b', A.sharp ? 0.8 : 0.45); ctx.fillStyle = A.sharp ? '#f59e0b' : 'rgba(245,158,11,.55)'; ctx.beginPath(); ctx.arc(rp.x, rp.y, Math.max(3, A.spotR * 0.9), 0, TAU); ctx.fill(); ctx.restore();
    // 이름표
    tag('각막', 396, 150, 424, 276, { title: '각막', msg: '눈 앞쪽의 투명한 막이에요. 빛이 처음 들어오는 곳이에요.' });
    tag('홍채', 436, 466, EYE.IX, EYE.cy + 52, { title: '홍채', msg: '동공(눈동자)의 크기를 조절해서 들어오는 빛의 양을 조절해요. 밝으면 동공이 작아져요.', tag: 'iris' });
    tag('수정체', 480, 120, EYE.LX, EYE.cy - 24, { title: '수정체', msg: '볼록 렌즈처럼 빛을 모아 망막에 상이 맺히게 해요. 섬모체가 두께를 바꿔요.', tag: 'lens' });
    tag('섬모체', 556, 172, EYE.LX + 8, EYE.cy - 29 - lerp(18, 8, clamp(u, 0, 1)), { title: '섬모체', msg: '근육이 있어서 수정체의 두께를 조절해요. 가까운 곳을 볼 때 수축해요.', tag: 'ciliary' });
    tag('망막', 660, 186, EYE.cx + EYE.R - 8, 214, { title: '망막', msg: '시각 세포가 있어서 빛 자극을 받아들이는 곳이에요.' });
    // 상태 알약
    const pu = A.pupil < 9 ? '작아요 (밝은 곳)' : A.pupil > 17 ? '커요 (어두운 곳)' : '보통';
    pill('동공: ' + pu, 150, 500 + 0, { size: 13.5, bg: '#7aa3c9', pad: 10, h: 28 });
    const lens = u > 0.7 ? '두꺼워요 (가까운 곳)' : u < 0.3 ? '얇아요 (먼 곳)' : '중간';
    pill('수정체: ' + lens, 540, 500, { size: 13.5, bg: '#d9a21b', pad: 10, h: 28 });
    // 망막의 상(확대)
    const IC = { x: 726, y: 110, r: 42 };
    ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.2)'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(IC.x, IC.y, IC.r + 4, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(IC.x, IC.y, IC.r, 0, TAU); ctx.clip(); ctx.fillStyle = '#fdf2f2'; ctx.fillRect(IC.x - IC.r, IC.y - IC.r, IC.r * 2, IC.r * 2);
    const sr = Math.min(IC.r - 4, 5 + A.spotR * 3.2);
    ctx.fillStyle = rgrad(IC.x, IC.y, 0, IC.x, IC.y, sr, [[0, rgba('#f59e0b', A.sharp ? 1 : 0.7)], [1, rgba('#f59e0b', A.sharp ? 0.9 : 0.05)]]); ctx.beginPath(); ctx.arc(IC.x, IC.y, sr, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = A.sharp ? '#16a34a' : '#f59e0b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(IC.x, IC.y, IC.r, 0, TAU); ctx.stroke();
    txt('망막의 상', IC.x, IC.y + IC.r + 20, { size: 13, weight: 800, color: '#475569', align: 'center' });
    pill(A.sharp ? '선명해요!' : '흐릿해요', IC.x, IC.y - IC.r - 18, { size: 13, bg: A.sharp ? '#16a34a' : '#f59e0b', pad: 9, h: 24 });
  }

  /* ===== 장면 3-1: 귀 ===== */
  const EAR = { cx: 548, cy: 340 };
  function spiral(s) { const th = Math.PI + s * 5 * Math.PI, r = 48 - 37 * s; return [EAR.cx + r * Math.cos(th), EAR.cy + r * Math.sin(th)]; }
  const NERVE_EAR = [[580, 326], [622, 270], [666, 214], [704, 168]];
  function startSound() {
    if (S.ear.t >= 0 && S.ear.t < 4.5) return;
    S.ear.t = 0; Sound.tone(523, 0.5, 'triangle', 0.1); Sound.tone(659, 0.5, 'triangle', 0.08, 0.05);
    $('#btnSound').disabled = true;
  }
  function updateEar(dt) {
    const E = S.ear;
    if (E.t >= 0) { E.t += dt; if (E.t > 5.6) { E.t = -1; const b = $('#btnSound'); if (b) b.disabled = false; } }
  }
  function drawEar() {
    const E = S.ear, t = E.t, tt = Math.max(t, 0);
    const vib = t >= 1.2 && t < 3.6 ? Math.sin(tt * 55) * 3.2 * Math.max(0, 1 - (tt - 1.2) / 2.4) : 0;
    const rock = t >= 1.35 && t < 3.6 ? Math.sin(tt * 55 - 0.8) * 0.06 * Math.max(0, 1 - (tt - 1.35) / 2.2) : 0;
    // 머리뼈 단면 배경
    ctx.save(); ctx.shadowColor = 'rgba(60,40,20,.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f6ead9'; ctx.beginPath(); smooth(ctx, [[262, 120], [420, 84], [600, 90], [740, 120], [770, 260], [748, 430], [640, 492], [440, 484], [300, 440], [252, 330], [246, 200]], true); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#e4cfb4'; ctx.lineWidth = 3; ctx.beginPath(); smooth(ctx, [[262, 120], [420, 84], [600, 90], [740, 120], [770, 260], [748, 430], [640, 492], [440, 484], [300, 440], [252, 330], [246, 200]], true); ctx.stroke();
    // 스피커
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#334155'; rr(34, 270, 62, 78, 12); ctx.fill(); }, { blur: 8, y: 3 });
    bead(65, 296, 14, '#64748b', { noShadow: true }); bead(65, 326, 8, '#64748b', { noShadow: true }); ctx.restore();
    txt('소리의 근원', 65, 372, { size: 13, weight: 800, color: '#475569', align: 'center' });
    // 소리 파동
    if (t >= 0) {
      const front = 110 + clamp(tt / 1.2, 0, 1) * 300;
      for (let k = 0; k < 4; k++) {
        const x = front - k * 44; if (x < 108 || x > 412 || tt > 1.7) continue;
        const a = (1 - (k * 0.2)) * (tt > 1.3 ? clamp(1 - (tt - 1.3) / 0.4, 0, 1) : 1);
        ctx.save(); ctx.strokeStyle = rgba('#2563eb', 0.8 * a); ctx.lineWidth = 4; ctx.lineCap = 'round';
        const rad = 26 + (x - 108) * 0.1; ctx.beginPath(); ctx.arc(x - rad * 0.6, 308, rad, -0.9, 0.9); ctx.stroke(); ctx.restore();
      }
      pill('소리 = 공기의 떨림', 230, 244, { size: 13.5, bg: 'rgba(37,99,235,.92)', alpha: clamp(1 - Math.max(0, tt - 1.5) / 0.5, 0, 1) * clamp(tt / 0.2, 0, 1), pad: 10 });
    }
    // 귓바퀴
    ctx.save(); ctx.shadowColor = 'rgba(120,70,30,.25)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#f2c29c'; ctx.beginPath(); smooth(ctx, [[300, 262], [270, 240], [238, 250], [224, 292], [232, 340], [262, 372], [298, 352], [304, 318]], true); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#d99b72'; ctx.lineWidth = 3; ctx.beginPath(); smooth(ctx, [[286, 276], [262, 266], [246, 290], [250, 322], [270, 340]], false); ctx.stroke();
    // 외이도
    ctx.fillStyle = '#f2c29c'; rr(298, 290, 118, 36, 14); ctx.fill(); ctx.fillStyle = '#7c4a2d'; rr(302, 296, 112, 24, 11); ctx.fill();
    // 고막
    ctx.save(); ctx.translate(412 + vib * 0.6, 308); ctx.strokeStyle = '#f9c5c0'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(6 + vib * 2, 0, 0, 26); ctx.stroke(); ctx.restore();
    // 공기 입자(외이도) — 소리가 지나갈 때 떨림
    if (t >= 0 && tt < 1.4) for (let i = 0; i < 9; i++) { const x = 312 + i * 11, ph = clamp((tt * 300 + 110 - x) / 120, 0, 1); ctx.fillStyle = rgba('#93c5fd', 0.95 * (ph > 0 && ph < 1 ? 1 : 0.3)); ctx.beginPath(); ctx.arc(x, 308 + Math.sin(tt * 40 + i) * 5 * (ph > 0 && ph < 1 ? 1 : 0), 2.4, 0, TAU); ctx.fill(); }
    // 중이(공기) 공간
    ctx.fillStyle = '#fef9ef'; ctx.beginPath(); smooth(ctx, [[418, 262], [470, 252], [500, 280], [498, 338], [450, 346], [420, 336]], true); ctx.fill();
    // 귓속뼈: 망치뼈 · 모루뼈 · 등자뼈
    ctx.save(); ctx.translate(432, 300); ctx.rotate(rock);
    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(18, -14); ctx.stroke(); bead(18, -14, 6, '#d6d3d1', { noShadow: true }); ctx.restore();
    ctx.save(); ctx.translate(452, 284); ctx.rotate(rock * 1.3);
    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 26); ctx.stroke(); bead(0, 0, 6, '#d6d3d1', { noShadow: true }); ctx.restore();
    ctx.save(); ctx.translate(466, 312); ctx.rotate(rock * 1.6);
    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, 12); ctx.stroke(); bead(30, 12, 6, '#d6d3d1', { noShadow: true }); ctx.restore();
    // 반고리관 · 전정 기관
    ctx.save(); ctx.translate(560, 196);
    [0, 1.05, 2.1].forEach((rot) => { ctx.save(); ctx.rotate(rot); ctx.strokeStyle = '#a5d8ea'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, 0, 38, 17, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#d9f1fa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 38, 17, 0, 0, TAU); ctx.stroke(); ctx.restore(); });
    ctx.restore();
    ctx.fillStyle = '#a5d8ea'; ctx.beginPath(); ctx.ellipse(536, 268, 22, 15, 0.3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7cc3dc'; ctx.lineWidth = 2; ctx.stroke();
    // 달팽이관
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#f5cfa0'; ctx.lineWidth = 19; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const q = spiral(i / 120); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke();
    ctx.strokeStyle = '#b6e8f7'; ctx.lineWidth = 12; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const q = spiral(i / 120); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke();
    // 액체 속 물결 + 청각 세포(털세포)
    const wv = clamp((tt - 1.6) / 1.3, 0, 1.2);
    for (let i = 0; i < 40; i++) {
      const s0 = i / 40, q = spiral(s0), q2 = spiral(Math.min(1, s0 + 0.01)); const nxv = -(q2[1] - q[1]), nyv = (q2[0] - q[0]), nl = Math.hypot(nxv, nyv) || 1;
      const act = t >= 1.6 && t < 4.4 ? clamp(1 - Math.abs(wv - s0) * 6, 0, 1) + (wv > s0 ? 0.25 * Math.max(0, 1 - (tt - 3) / 1.4) : 0) : 0;
      ctx.strokeStyle = act > 0.1 ? '#f97316' : '#fb923c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0] + nxv / nl * 4, q[1] + nyv / nl * 4); ctx.lineTo(q[0] + nxv / nl * (7 + act * 5), q[1] + nyv / nl * (7 + act * 5)); ctx.stroke();
      if (act > 0.35) D.glow(q[0] + nxv / nl * 6, q[1] + nyv / nl * 6, 10, '#fb923c', 0.55 * Math.min(1, act));
    }
    if (t >= 1.6 && t < 3.2) { const q = spiral(clamp(wv, 0, 1)); ctx.strokeStyle = 'rgba(37,99,235,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q[0], q[1], 7 + 3 * Math.sin(tt * 30), 0, TAU); ctx.stroke(); }
    ctx.restore();
    // 청각 신경 + 신호
    strokePath(NERVE_EAR, '#e9c46a', 8, 1);
    strokePath(NERVE_EAR, '#fff3bf', 4, 1);
    if (t >= 2.0 && t < 4.6) pulses(NERVE_EAR, clamp((tt - 2.0) / 1.2, 0, 1.4), '#f59e0b', { n: 3, gap: 0.14 });
    const bg = t >= 3.2 ? clamp(1 - Math.abs(tt - 3.6) / 1.6, 0, 1) : 0;
    drawBrain(722, 142, 1.0, bg, '대뇌');
    if (t >= 3.3 && t < 5.4) pill('🎵 소리가 들려요!', 650, 82, { size: 14, bg: '#16a34a', pad: 12, alpha: clamp((5.4 - tt) / 0.4, 0, 1) });
    // 이름표
    tag('귓바퀴', 262, 224, 252, 262, { title: '귓바퀴', msg: '소리를 모아서 귓속으로 보내요.' });
    tag('외이도', 350, 262, 350, 296, { title: '외이도', msg: '소리(공기의 떨림)가 고막으로 가는 길이에요.' });
    tag('고막', 392, 380, 412, 332, { title: '고막', msg: '소리에 따라 떨리는 얇은 막이에요.', tag: '' });
    tag('귓속뼈', 462, 388, 458, 330, { title: '귓속뼈', msg: '고막의 떨림을 크게 해서 달팽이관으로 전달해요.' });
    tag('달팽이관', 548, 424, 548, 392, { title: '달팽이관', msg: '속에 청각 세포가 있어서 소리 자극을 받아들이고, 청각 신경으로 전달해요.', tag: 'cochlea' }, { bg: '#ffedd5', border: '#fb923c' });
    tag('반고리관', 612, 244, 590, 206, { title: '반고리관', msg: '몸이 회전하는 것을 느끼는 곳이에요.' });
    tag('전정 기관', 476, 234, 524, 262, { title: '전정 기관', msg: '몸이 기울어지는 것을 느끼는 곳이에요.' });
    tag('청각 신경', 676, 296, 640, 244, { title: '청각 신경', msg: '청각 세포의 신호를 대뇌로 전달해요.' });
    if (t < 0 && !E.tapped && !S.ear.hintDone) { /* 안내는 말풍선 */ }
  }

  /* ===== 장면 3-2: 코와 혀 ===== */
  const HEAD = [[470, 66], [420, 94], [408, 140], [404, 176], [372, 214], [350, 240], [366, 258], [392, 260], [398, 284], [388, 300], [394, 314], [392, 338], [408, 368], [440, 396], [500, 420], [600, 430], [672, 380], [690, 260], [668, 140], [610, 84], [540, 60]];
  const BRAIN_N = { x: 548, y: 148, s: 1.3 };
  const P_FOOD_MOUTH = [[150, 424], [236, 372], [330, 330], [402, 312]];
  const P_SMELL_OUT = [[190, 396], [250, 336], [316, 288], [366, 258], [420, 250], [458, 238]];
  const P_SMELL_BACK = [[470, 322], [518, 316], [546, 288], [536, 258], [494, 240]];
  const NERVE_SMELL = [[470, 228], [472, 196], [488, 170], [514, 156]];
  const NERVE_TASTE = [[506, 330], [560, 326], [598, 296], [610, 238], [594, 186]];
  const BUD = { x: 676, y: 424, r: 78 };
  function startTaste() {
    const N = S.nose; if (N.t >= 0) return;
    N.t = 0; N.result = ''; N.counted = false;
    Sound.tone(392, 0.12, 'triangle', 0.08); $('#btnTaste').disabled = true;
  }
  function updateNose(dt) {
    const N = S.nose;
    N.pinch = SciSim.approach(N.pinch, N.pinched ? 1 : 0, dt, 12);
    if (N.t >= 0) {
      N.t += dt;
      if (!N.counted && N.t >= 3.4) {
        N.counted = true;
        if (N.pinched) N.tastedPinched = true; else N.tastedOpen = true;
        N.result = N.pinched ? 'blur' : N.food; N.resultAt = clock;
        burst(BRAIN_N.x, BRAIN_N.y, ['#fde047', '#f9a8d4'], 12);
      }
      if (N.t > 7) { N.t = -1; const b = $('#btnTaste'); if (b) b.disabled = false; }
    }
    // 냄새 입자(음식에서 코로 떠오름)
    N.sp = N.sp || [];
    if (Math.random() < dt * 5 && N.sp.length < 14) N.sp.push({ k: 0, sp: 0.22 + Math.random() * 0.1, jit: (Math.random() - 0.5) * 18, ph: Math.random() * 6 });
    for (let i = N.sp.length - 1; i >= 0; i--) {
      const p = N.sp[i]; p.k += dt * p.sp;
      const stop = N.pinch > 0.5 ? 0.62 : 1;
      if (p.k > stop) { if (N.pinch > 0.5 && !p.bounced) { p.bounced = true; p.k = 0.62; p.sp = -0.18; } else if (p.k > 1 || p.k < 0.45) N.sp.splice(i, 1); }
    }
  }
  function drawFood(x, y, kind, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    if (kind === 'apple') {
      ctx.fillStyle = rgrad(-8, -10, 4, 0, 0, 30, [[0, '#fca5a5'], [0.5, '#ef4444'], [1, '#b91c1c']]);
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.bezierCurveTo(28, -34, 40, 6, 20, 26); ctx.bezierCurveTo(10, 36, 4, 28, 0, 28); ctx.bezierCurveTo(-4, 28, -10, 36, -20, 26); ctx.bezierCurveTo(-40, 6, -28, -34, 0, -20); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#7c4a2d'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(2, -30, 8, -34); ctx.stroke();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(13, -30, 11, 5, -0.4, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = rgrad(-8, -8, 3, 0, 0, 32, [[0, '#fde9d4'], [0.55, '#e8b98c'], [1, '#b9774a']]);
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(10, -22, 34, -14, 30, 8); ctx.bezierCurveTo(26, 28, 8, 30, 0, 30); ctx.bezierCurveTo(-8, 30, -26, 28, -30, 8); ctx.bezierCurveTo(-34, -14, -10, -22, 0, -34); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(160,90,140,.55)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3, -24); ctx.quadraticCurveTo(i * 12, 0, i * 6, 28); ctx.stroke(); }
      ctx.strokeStyle = '#86a352'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-3, -44); ctx.stroke();
    }
    ctx.restore();
  }
  function drawNose() {
    const N = S.nose, t = N.t, tt = Math.max(0, t);
    // 머리 단면
    ctx.save(); ctx.shadowColor = 'rgba(60,40,20,.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f6dcc3'; ctx.beginPath(); smooth(ctx, HEAD, true); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#e0bb98'; ctx.lineWidth = 3; ctx.beginPath(); smooth(ctx, HEAD, true); ctx.stroke();
    // 뇌
    const bgl = clamp(N.t >= 3 ? 1 - Math.abs(tt - 3.8) / 1.8 : 0, 0, 1);
    drawBrain(BRAIN_N.x, BRAIN_N.y, BRAIN_N.s, bgl, '');
    txt('대뇌', BRAIN_N.x, BRAIN_N.y + 62, { size: 14, weight: 800, color: '#9d174d', align: 'center' });
    // 코 안(비강)과 후각 세포
    ctx.fillStyle = '#f8b9b9'; ctx.beginPath(); smooth(ctx, [[372, 248], [392, 236], [440, 226], [500, 230], [526, 250], [522, 278], [470, 284], [420, 280], [384, 268]], true); ctx.fill();
    ctx.strokeStyle = '#e48f8f'; ctx.lineWidth = 2; ctx.stroke();
    // 후각 세포 (코 안 천장)
    strokePath([[432, 230], [462, 226], [492, 230], [510, 240]], '#facc15', 9, 1);
    for (let i = 0; i < 11; i++) { const q = pathAt([[432, 230], [462, 226], [492, 230], [510, 240]], i / 10 * 82); ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.arc(q[0], q[1] + 5, 2.2, 0, TAU); ctx.fill(); }
    // 후각 신경 · 후각 망울
    strokePath(NERVE_SMELL, '#e9c46a', 7, 1); strokePath(NERVE_SMELL, '#fff3bf', 3, 1);
    // 입안 · 혀
    ctx.fillStyle = '#c85a74'; ctx.beginPath(); smooth(ctx, [[394, 300], [430, 292], [500, 294], [534, 306], [522, 338], [470, 348], [420, 342], [396, 326]], true); ctx.fill();
    ctx.fillStyle = lgrad(0, 296, 0, 346, [[0, '#fb9cb8'], [1, '#e8708f']]); ctx.beginPath(); smooth(ctx, [[400, 324], [432, 308], [472, 302], [510, 308], [524, 332], [490, 344], [440, 344], [408, 338]], true); ctx.fill();
    const buds = [[418, 316], [438, 308], [458, 304], [478, 304], [498, 309]];
    buds.forEach((b) => { ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.ellipse(b[0], b[1] - 1, 4, 5.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.stroke(); });
    // 입술
    ctx.strokeStyle = '#c2415e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(394, 286); ctx.quadraticCurveTo(384, 300, 394, 316); ctx.stroke();
    // 목구멍 통로(입 → 코 안)
    ctx.strokeStyle = 'rgba(244,163,176,.85)'; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.beginPath(); smooth(ctx, P_SMELL_BACK.slice().reverse(), false); ctx.stroke();
    // 눈 (장식)
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(430, 150, 12, 8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(425, 150, 4.5, 0, TAU); ctx.fill();
    // 접시와 음식
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(150, 462, 70, 16, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.stroke();
    const mv = t >= 0 ? clamp(tt / 0.9, 0, 1) : 0, eaten = t >= 0 && tt > 1.0;
    if (!eaten) {
      const p = mv > 0 ? pathAt(P_FOOD_MOUTH, mv * pathLen(P_FOOD_MOUTH)) : [150, 426 - 2 * Math.sin(clock * 2)];
      drawFood(p[0], p[1], N.food, 1 - 0.3 * mv);
    }
    // 냄새 입자(음식 → 코)
    if (!eaten) {
      N.sp.forEach((p) => {
        const k = clamp(p.k, 0, 1), q = pathAt(P_SMELL_OUT, k * pathLen(P_SMELL_OUT));
        const col = N.food === 'apple' ? '#4ade80' : '#c084fc';
        ctx.fillStyle = rgba(col, 0.9); ctx.beginPath(); ctx.arc(q[0], q[1] + Math.sin(clock * 3 + p.ph) * 5 * (1 - k), 3.2, 0, TAU); ctx.fill();
      });
    }
    // 코 막기 집게
    if (N.pinch > 0.02) {
      ctx.save(); ctx.globalAlpha = N.pinch; ctx.translate(364 - (1 - N.pinch) * 24, 248); ctx.rotate(-0.35);
      ctx.fillStyle = '#ef4444'; rr(-18, -6, 34, 12, 5); ctx.fill(); ctx.fillStyle = '#b91c1c'; rr(-18, 0, 34, 6, 3); ctx.fill(); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(-14, -3, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 맛보기 연출: 입안 맛 분자, 목구멍을 타고 올라가는 냄새 입자
    if (t >= 1.0 && t < 3.6) {
      const k = clamp((tt - 1.0) / 1.5, 0, 1);
      for (let i = 0; i < 6; i++) { const bx = 420 + i * 16, by = 316 - 4 - ((tt * 20 + i * 7) % 20); ctx.fillStyle = rgba('#fb923c', 0.85 * (1 - ((tt * 20 + i * 7) % 20) / 20)); ctx.beginPath(); ctx.arc(bx, by + 8, 2.6, 0, TAU); ctx.fill(); }
      if (!N.pinched) {
        const col = N.food === 'apple' ? '#4ade80' : '#c084fc';
        for (let i = 0; i < 6; i++) { const kk = clamp((tt - 1.1) / 1.4 - i * 0.1, 0, 1); if (kk <= 0 || kk >= 1) continue; const q = pathAt(P_SMELL_BACK.slice(), kk * pathLen(P_SMELL_BACK)); ctx.fillStyle = rgba(col, 0.95); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, TAU); ctx.fill(); }
      }
    }
    // 신호
    strokePath(NERVE_TASTE, '#e9c46a', 6, 0.95); strokePath(NERVE_TASTE, '#fff3bf', 2.6, 0.95);
    if (t >= 1.9 && t < 4.6) pulses(NERVE_TASTE, clamp((tt - 1.9) / 1.4, 0, 1.4), '#f97316', { n: 3, gap: 0.14 });
    if (t >= 2.0 && t < 4.6 && !N.pinched) pulses(NERVE_SMELL, clamp((tt - 2.0) / 1.0, 0, 1.4), '#22c55e', { n: 3, gap: 0.16 });
    // 맛봉오리 확대
    ctx.save(); ctx.shadowColor = 'rgba(30,60,40,.2)'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(BUD.x, BUD.y, BUD.r + 5, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(BUD.x, BUD.y, BUD.r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fde7ee'; ctx.fillRect(BUD.x - BUD.r, BUD.y - BUD.r, BUD.r * 2, BUD.r * 2);
    ctx.fillStyle = '#fb9cb8'; ctx.fillRect(BUD.x - BUD.r, BUD.y - 36, BUD.r * 2, 20);
    ctx.fillStyle = '#e8708f'; ctx.fillRect(BUD.x - BUD.r, BUD.y - 16, BUD.r * 2, BUD.r + 20);
    ctx.fillStyle = lgrad(0, BUD.y - 40, 0, BUD.y + 40, [[0, '#fde68a'], [1, '#f59e0b']]); ctx.beginPath(); ctx.ellipse(BUD.x, BUD.y, 22, 38, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(BUD.x + i * 7, BUD.y - 24 + Math.abs(i) * 4); ctx.lineTo(BUD.x + i * 7, BUD.y + 22 - Math.abs(i) * 5); ctx.stroke(); }
    const act = t >= 1.6 && t < 3.6 ? 1 : 0;
    if (act) D.glow(BUD.x, BUD.y, 40, '#fb923c', 0.35 + 0.15 * Math.sin(tt * 10));
    ctx.strokeStyle = '#e9c46a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(BUD.x, BUD.y + 38); ctx.lineTo(BUD.x, BUD.y + BUD.r); ctx.stroke();
    if (t >= 1.0 && t < 3.0) for (let i = 0; i < 7; i++) { const k = ((tt * 0.8 + i / 7) % 1), x = BUD.x + Math.sin(i * 2.1) * 26 * (1 - k * 0.7), y = BUD.y - 62 + k * 44; ctx.fillStyle = rgba('#fb923c', 0.95); ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = act ? '#f97316' : '#94a3b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(BUD.x, BUD.y, BUD.r, 0, TAU); ctx.stroke();
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(500, 312); ctx.lineTo(BUD.x - BUD.r * 0.9, BUD.y - BUD.r * 0.4); ctx.stroke(); ctx.restore();
    // 이름표
    tag('후각 세포', 300, 196, 462, 227, { title: '후각 세포', msg: '코 안 천장에 있어요. 공기 중의 기체 상태 물질(냄새)을 받아들여요. 쉽게 피로해져요.', tag: 'nose' }, { bg: '#fef9c3', border: '#ca8a04' });
    tag('맛봉오리 (미각 세포)', BUD.x, BUD.y + BUD.r + 22, BUD.x + 14, BUD.y + 28, { title: '맛봉오리', msg: '혀에 있는 맛봉오리 안의 미각 세포가 액체 상태 물질(맛)을 받아들여요.', tag: 'tongue' }, { bg: '#ffedd5', border: '#fb923c' });
    tag('혀', 440, 384, 450, 336, { title: '혀', msg: '표면에 맛봉오리가 많아요. 단맛·짠맛·신맛·쓴맛·감칠맛을 느껴요.' });
    tag('후각 신경', 424, 188, 472, 196, { title: '후각 신경', msg: '후각 세포의 신호를 대뇌로 전달해요.' });
    tag('미각 신경', 628, 318, 600, 286, { title: '미각 신경', msg: '미각 세포의 신호를 대뇌로 전달해요.' });
    // 결과 말풍선
    const rs = N.result && clock - N.resultAt < 5 ? clamp((5 - (clock - N.resultAt)) / 0.4, 0, 1) * clamp((clock - N.resultAt) / 0.2, 0, 1) : 0;
    if (rs > 0.01) {
      const txtR = N.result === 'blur' ? '❓ 음… 무슨 맛이지? 맛이 흐릿해요' : N.result === 'apple' ? '🍎 사과 맛이야! (맛 + 향)' : '🧅 양파 맛이야! (맛 + 향)';
      pill(txtR, 640, 70, { size: 15, bg: N.result === 'blur' ? '#b45309' : '#16a34a', pad: 14, h: 36, alpha: rs, shadow: true });
    }
    if (N.pinched && N.t < 0) pill('코가 막혀서 냄새 입자가 후각 세포에 닿지 못해요', 270, 112, { size: 13, bg: 'rgba(180,83,9,.92)', pad: 12 });
    else if (N.t < 0 && !N.pinched) pill('냄새 입자(●)가 코로 들어가 후각 세포에 닿아요', 270, 112, { size: 13, bg: 'rgba(22,101,52,.92)', pad: 12 });
  }

  /* ===== 장면 3-3: 피부 (감각점 · 두 점 구별) ===== */
  const REG = {
    finger: { name: '손끝', ppmm: 40, rho: 2.5, gaps: [1, 2, 3, 5, 8], dens: 3, tint: '#f6cfae' },
    back: { name: '등', ppmm: 6, rho: 35, gaps: [10, 20, 30, 40, 50], dens: 1, tint: '#f0c4a0' },
  };
  const isTwo = (reg, gap) => gap > REG[reg].rho;
  const SK_PATCH = { x: 384, y: 142, w: 380, h: 176 };
  function updateSkin(dt) {
    const K = S.skin; K.press = SciSim.approach(K.press == null ? 0 : K.press, 1, dt, 7);
    const two = isTwo(K.region, K.gap), o = K.obs[K.region];
    if (K.press > 0.9) { (two ? o.two : o.one)[K.gap] = true; }
  }
  function skinChanged() { S.skin.press = 0; Sound.tick(); }
  function drawSkin() {
    const K = S.skin, R = REG[K.region], two = isTwo(K.region, K.gap);
    // ---- 왼쪽: 피부 단면
    panel(20, 62, 332, 436, { bg: '#fff' });
    txt('🔬 피부 속 감각점 (' + R.name + ')', 36, 90, { size: 15, weight: 800 });
    const L0 = 38, L1 = 334, yS = 128;
    ctx.save(); rr(L0, yS, L1 - L0, 300, 10); ctx.clip();
    ctx.fillStyle = '#f2c6a4'; ctx.fillRect(L0, yS, L1 - L0, 34);
    ctx.fillStyle = '#e4a98a'; ctx.fillRect(L0, yS + 30, L1 - L0, 4);
    ctx.fillStyle = lgrad(0, yS + 34, 0, yS + 200, [[0, '#f9c0b3'], [1, '#f5a99a']]); ctx.fillRect(L0, yS + 34, L1 - L0, 176);
    ctx.fillStyle = '#fde8a6'; ctx.fillRect(L0, yS + 210, L1 - L0, 90);
    for (let i = 0; i < 14; i++) { ctx.strokeStyle = 'rgba(217,170,70,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L0 + 20 + (i % 7) * 42, yS + 236 + Math.floor(i / 7) * 36, 16, 0, TAU); ctx.stroke(); }
    // 감각점
    const n = R.dens, ex = (i, cnt) => L0 + 26 + (i + 0.5) * (170 / cnt);
    const types = {
      pain: { c: '#dc2626', y: yS + 52 }, touch: { c: '#16a34a', y: yS + 62 }, cold: { c: '#06b6d4', y: yS + 100 }, warm: { c: '#f97316', y: yS + 124 }, press: { c: '#3b82f6', y: yS + 170 },
    };
    const trunk = 262;
    function nerve(x, y) { ctx.strokeStyle = 'rgba(233,196,106,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y + 40, trunk, y + 90 + (x % 30)); ctx.lineTo(trunk, yS + 296); ctx.stroke(); }
    const cnt = 1 + n;   // 손끝 4개, 등 2개
    for (let i = 0; i < cnt; i++) {
      const x = ex(i, cnt) + (i % 2) * 4;
      nerve(x, types.pain.y + 6); ctx.strokeStyle = types.pain.c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, yS + 40); ctx.lineTo(x - 3, yS + 28); ctx.moveTo(x, yS + 40); ctx.lineTo(x + 3, yS + 28); ctx.moveTo(x, yS + 40); ctx.lineTo(x, types.pain.y + 6); ctx.stroke();
      ctx.fillStyle = types.touch.c; ctx.beginPath(); ctx.ellipse(x + 14, types.touch.y, 6, 9, 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < Math.max(1, n - 1); i++) { const x = ex(i, Math.max(1, n - 1)) + 20; bead(x, types.cold.y, 7, types.cold.c, { noShadow: true }); nerve(x, types.cold.y + 6); bead(x + 18, types.warm.y, 7, types.warm.c, { noShadow: true }); nerve(x + 18, types.warm.y + 6); }
    for (let i = 0; i < Math.max(1, n - 1); i++) { const x = ex(i, Math.max(1, n - 1)) + 40; ctx.fillStyle = types.press.c; ctx.beginPath(); ctx.ellipse(x, types.press.y, 14, 20, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; for (let r = 5; r < 14; r += 4) { ctx.beginPath(); ctx.ellipse(x, types.press.y, r, r * 1.4, 0, 0, TAU); ctx.stroke(); } nerve(x, types.press.y + 20); }
    // 굵은 감각 신경 다발과 뇌로 가는 화살표
    ctx.strokeStyle = '#e9c46a'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(trunk, yS + 140); ctx.lineTo(trunk, yS + 296); ctx.stroke();
    ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(trunk, yS + 140); ctx.lineTo(trunk, yS + 296); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(trunk + 38, yS + 292); ctx.lineTo(trunk + 38, yS + 312); ctx.lineTo(trunk + 28, yS + 302); ctx.closePath(); // 장식
    pill('감각 신경 → 뇌', 200, 456, { size: 13.5, bg: '#92400e', pad: 11 });
    txt('표피', 44, yS + 21, { size: 12.5, weight: 800, color: '#7c4a2d' }); txt('진피', 44, yS + 190, { size: 12.5, weight: 800, color: '#7c4a2d' });
    // 이름표(감각점 5종)
    const lbl = [['통점', types.pain, 0], ['촉점', types.touch, 1], ['냉점', types.cold, 2], ['온점', types.warm, 3], ['압점', types.press, 4]];
    lbl.forEach((q, i) => {
      const bx = ex(0, cnt) + (q[0] === '촉점' ? 14 : q[0] === '통점' ? 0 : q[0] === '압점' ? 40 : 20) + (q[0] === '온점' ? 18 : 0);
      tag(q[0], 306, yS + 28 + i * 34 + (i === 4 ? 10 : 0), bx, q[1].y + (q[0] === '통점' ? 6 : 0), { title: q[0] + ' (감각점)', msg: q[0] === '통점' ? '아픔을 느껴요. 감각점 중에 가장 많이 분포해요.' : q[0] === '촉점' ? '살짝 닿는 느낌(촉각)을 받아들여요.' : q[0] === '압점' ? '누르는 힘(압력)을 받아들여요.' : q[0] === '냉점' ? '차가운 온도를 받아들여요.' : '따뜻한 온도를 받아들여요.', tag: 'skin' }, { bg: '#fff', border: q[1].c });
    });
    // ---- 오른쪽: 두 점 구별 실험
    panel(366, 62, 414, 436, { bg: '#fff' });
    txt('👆 두 점 구별 실험 · ' + R.name, 382, 90, { size: 15, weight: 800 });
    const P = SK_PATCH, cyP = P.y + P.h / 2, rho = R.rho * R.ppmm, x1 = P.x + 40;
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip();
    ctx.fillStyle = lgrad(0, P.y, 0, P.y + P.h, [[0, R.tint], [1, shade(R.tint, -0.08)]]); ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.strokeStyle = 'rgba(140,90,60,.12)'; ctx.lineWidth = 1.5; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(P.x + i * 30, P.y); ctx.lineTo(P.x + i * 30 - 20, P.y + P.h); ctx.stroke(); }
    const x2 = x1 + K.gap * R.ppmm, i2 = Math.round((x2 - x1) / (2 * rho));
    for (let k = -1; k <= 3; k++) {
      const fx = x1 + k * 2 * rho, lit = k === 0 || k === i2;
      ctx.fillStyle = lit ? 'rgba(250,204,21,.34)' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(fx, cyP, rho, 0, TAU); ctx.fill();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = lit ? '#ca8a04' : 'rgba(120,80,50,.35)'; ctx.lineWidth = lit ? 2.6 : 1.6; ctx.stroke(); ctx.setLineDash([]);
      if (lit) D.glow(fx, cyP, 26, '#facc15', 0.55);
      ctx.fillStyle = lit ? '#16a34a' : '#9ca3af'; ctx.beginPath(); ctx.arc(fx, cyP, 5, 0, TAU); ctx.fill();
    }
    // 컴퍼스 끝(누르기)
    const dy = (1 - clamp(K.press, 0, 1)) * -34;
    [x1, x2].forEach((tx, i) => {
      ctx.save(); ctx.translate(tx, cyP + dy);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 6 - dy * 0.1, 8, 3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lgrad(-5, 0, 5, 0, [[0, '#e5e7eb'], [1, '#6b7280']]); ctx.beginPath(); ctx.moveTo(-6, -64); ctx.lineTo(6, -64); ctx.lineTo(1.5, 0); ctx.lineTo(-1.5, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 1, 3.4, 0, TAU); ctx.fill(); ctx.restore();
    });
    ctx.restore();
    ctx.strokeStyle = '#d6a47c'; ctx.lineWidth = 2; rr(P.x, P.y, P.w, P.h, 14); ctx.stroke();
    txt('(원 하나 = 감각점 하나가 담당하는 범위)', P.x + P.w / 2, P.y + P.h + 20, { size: 13, weight: 700, color: '#64748b', align: 'center' });
    // 간격 눈금
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x1, P.y + P.h - 14); ctx.lineTo(x2, P.y + P.h - 14); ctx.moveTo(x1, P.y + P.h - 20); ctx.lineTo(x1, P.y + P.h - 8); ctx.moveTo(x2, P.y + P.h - 20); ctx.lineTo(x2, P.y + P.h - 8); ctx.stroke();
    pill(K.gap + ' mm', (x1 + x2) / 2, P.y + P.h - 32, { size: 13.5, bg: '#334155', pad: 9, h: 24 });
    // 결과
    const done = K.press > 0.9;
    pill(done ? (two ? '👆 점 2개로 느껴요 — 서로 다른 감각점' : '👆 점 1개로 느껴요 — 같은 감각점') : '…', 573, 372, { size: 15, bg: two ? '#16a34a' : '#b45309', pad: 14, h: 36, alpha: done ? 1 : 0.4, shadow: true });
    // 측정 기록
    const mn = (reg) => { const ks = Object.keys(K.obs[reg].two).map(Number); return ks.length ? Math.min.apply(null, ks) : null; };
    txt('📋 2점으로 느낀 가장 짧은 간격', 382, 420, { size: 13.5, weight: 800, color: '#475569' });
    ['finger', 'back'].forEach((rg, i) => {
      const v = mn(rg), y = 446 + i * 28;
      txt(REG[rg].name, 396, y, { size: 14.5, weight: 800 });
      pill(v == null ? '—' : v + ' mm', 500, y - 5, { size: 14, bg: v == null ? '#cbd5e1' : '#16a34a', pad: 12, h: 24 });
    });
  }

  /* ===== 장면 4: 자극의 전달 경로 ===== */
  const STIM = [
    { t: '빛', icon: '💡', organ: '눈', cell: '시각 세포', nerve: '시각 신경', col: '#f59e0b' },
    { t: '소리', icon: '🔊', organ: '귀', cell: '청각 세포', nerve: '청각 신경', col: '#3b82f6' },
    { t: '냄새(기체)', icon: '🌸', organ: '코', cell: '후각 세포', nerve: '후각 신경', col: '#22c55e' },
    { t: '맛(액체)', icon: '🍬', organ: '혀', cell: '미각 세포', nerve: '미각 신경', col: '#f97316' },
    { t: '온도(열)', icon: '🌡️', organ: '피부', cell: '온점·냉점', nerve: '감각 신경', col: '#ef4444' },
  ];
  const ORGANS = STIM.map((s) => s.organ), CELLS = STIM.map((s) => s.cell);
  const PR = { y0: 126, dy: 82, h: 58, card: { x: 24, w: 128 }, organ: { x: 196, w: 132 }, cell: { x: 358, w: 146 }, brain: { x: 728, y: 292 } };
  function pathRows() { if (!S.path.rows.length) S.path.rows = STIM.map((s, i) => ({ organ: -1, cell: -1, shake: -9 })); return S.path.rows; }
  const rowY = (i) => PR.y0 + i * PR.dy;
  const rowOk = (i) => { const r = S.path.rows[i]; return r && r.organ === i && r.cell === i; };
  const allOk = () => S.path.rows.length === 5 && [0, 1, 2, 3, 4].every(rowOk);
  function nervePath(i) { const y = rowY(i) + PR.h / 2; return [[24 + 128, y], [PR.organ.x, y], [PR.organ.x + PR.organ.w, y], [PR.cell.x, y], [PR.cell.x + PR.cell.w, y], [640, y], [676, PR.brain.y + (y - PR.brain.y) * 0.3]]; }
  function sendSignals() {
    const P = S.path; if (P.sendT >= 0 && P.sendT < 3.6) return;
    P.sendT = 0; Sound.tone(660, 0.1, 'triangle', 0.08); const b = $('#btnSend'); if (b) b.disabled = true;
  }
  function updatePath(dt) {
    const P = S.path; pathRows();
    if (P.sendT >= 0) { P.sendT += dt; if (P.sendT > 4.4) { P.sendT = -1; const b = $('#btnSend'); if (b) b.disabled = false; } }
  }
  function drawPath() {
    const P = S.path; pathRows();
    // 머리글: 자극 → 감각 기관 → 감각 세포 → 감각 신경 → 대뇌
    const heads = [[PR.card.x + PR.card.w / 2, '자극'], [PR.organ.x + PR.organ.w / 2, '감각 기관'], [PR.cell.x + PR.cell.w / 2, '감각 세포'], [570, '감각 신경'], [PR.brain.x, '대뇌']];
    heads.forEach((h, i) => { pill(h[1], h[0], 74, { size: 14, bg: i === 4 ? '#be185d' : '#15803d', pad: 12, h: 28 }); if (i < 3) { /* 화살표 */ } });
    [[PR.card.x + PR.card.w / 2 + 52, PR.organ.x + PR.organ.w / 2 - 66], [PR.organ.x + PR.organ.w / 2 + 52, PR.cell.x + PR.cell.w / 2 - 56], [PR.cell.x + PR.cell.w / 2 + 62, 540], [606, PR.brain.x - 56]].forEach((a) => D.arrow(a[0] + 6, 74, a[1] + 2, 74, { color: '#15803d', width: 3, head: 9 }));
    // 대뇌
    const arrive = P.sendT >= 0 ? clamp((P.sendT - 1.6) / 0.6, 0, 1) * clamp((4.2 - P.sendT) / 0.8, 0, 1) : 0;
    drawBrain(PR.brain.x, PR.brain.y, 1.35, arrive, '대뇌');
    for (let i = 0; i < 5; i++) {
      const y = rowY(i), st = STIM[i], r = P.rows[i], ok = rowOk(i);
      // 신경선
      const np = nervePath(i);
      strokePath(np.slice(4), '#e9c46a', 8, ok ? 1 : 0.35); strokePath(np.slice(4), '#fff3bf', 3.5, ok ? 1 : 0.35);
      if (ok) txt(st.nerve, 570, y + PR.h / 2 - 8, { size: 13, weight: 800, color: '#92400e', align: 'center', halo: 'rgba(238,244,239,.9)', haloW: 4 });
      // 자극 카드
      ctx.save(); D.shadow(() => { ctx.fillStyle = lgrad(0, y, 0, y + PR.h, [[0, '#fff'], [1, mix('#ffffff', st.col, 0.12)]]); rr(PR.card.x, y, PR.card.w, PR.h, 14); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = st.col; ctx.lineWidth = 2.5; rr(PR.card.x, y, PR.card.w, PR.h, 14); ctx.stroke(); ctx.restore();
      ctx.font = '24px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#1b2333'; ctx.fillText(st.icon, PR.card.x + 10, y + PR.h / 2 + 9);
      txt(st.t, PR.card.x + 44, y + PR.h / 2 + 5, { size: 14.5, weight: 800, max: PR.card.w - 50, min: 11 });
      // 칸 두 개
      [['organ', ORGANS, PR.organ], ['cell', CELLS, PR.cell]].forEach((q) => {
        const key = q[0], list = q[1], b = q[2], v = r[key], sx = shk(clock - r.shake < 0.4 ? 1 - (clock - r.shake) / 0.4 : 0);
        const wrong = P.showErr && v >= 0 && v !== i, empty = P.showErr && v < 0;
        ctx.save(); ctx.translate(sx, 0);
        ctx.fillStyle = v >= 0 ? '#fff' : 'rgba(255,255,255,.7)'; rr(b.x, y, b.w, PR.h, 14); ctx.fill();
        ctx.setLineDash(v >= 0 ? [] : [7, 5]); ctx.lineWidth = v >= 0 ? 3 : 2.2; ctx.strokeStyle = wrong || empty ? '#dc2626' : ok ? '#16a34a' : v >= 0 ? '#0ea5e9' : '#94a3b8'; rr(b.x, y, b.w, PR.h, 14); ctx.stroke(); ctx.setLineDash([]);
        txt(v >= 0 ? list[v] : (key === 'organ' ? '? 감각 기관' : '? 감각 세포'), b.x + b.w / 2, y + PR.h / 2 + 5, { size: v >= 0 ? 16 : 14, weight: 800, color: v >= 0 ? '#1b2333' : '#64748b', align: 'center', max: b.w - 16 });
        if (v >= 0) { ctx.save(); ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(b.x + b.w - 14, y + 14, 9, 0, TAU); ctx.fill(); txt('↻', b.x + b.w - 14, y + 18.5, { size: 13, weight: 800, color: '#0369a1', align: 'center' }); ctx.restore(); }
        ctx.restore();
      });
      if (ok) checkMark(PR.cell.x + PR.cell.w + 14, y + PR.h / 2, 11, 1);
      // 이어진 선(칸 사이)
      [[PR.card.x + PR.card.w, PR.organ.x], [PR.organ.x + PR.organ.w, PR.cell.x], [PR.cell.x + PR.cell.w, 640]].forEach((q, k) => { if (k < 2) { ctx.strokeStyle = ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0] + 2, y + PR.h / 2); ctx.lineTo(q[1] - 2, y + PR.h / 2); ctx.stroke(); } });
      // 신호
      if (P.sendT >= 0 && ok) {
        const head = clamp((P.sendT - i * 0.12) / 2.2, 0, 1.3);
        pulses(np, head, st.col, { n: 4, gap: 0.07, alpha: clamp((4.2 - P.sendT) / 0.6, 0, 1) });
      } else if (P.sendT >= 0 && !ok) {
        const x = PR.organ.x + 70; const a = clamp(1 - Math.abs(P.sendT - 0.6) / 1.4, 0, 1);
        if (a > 0.05) { txt('✕', PR.card.x + PR.card.w + 22, y + PR.h / 2 + 7, { size: 20, weight: 900, color: rgba('#dc2626', a), align: 'center' }); }
      }
    }
    if (P.sendT >= 3.0 && P.sendT < 4.3 && allOk()) pill('자극이 대뇌까지 전달되었어요!', 560, 530, { size: 15, bg: '#16a34a', pad: 14, h: 34, shadow: true });
  }

  /* ---------- 장면 전환 · 조작 ---------- */
  const LABEL = {
    blind: '🔬 맹점 실험 · 눈 속에서 상이 맺히는 곳', adjust: '👁️ 눈의 조절 · 홍채와 수정체', ear: '👂 귀 · 소리가 지나가는 길',
    nose: '👃 코와 👅 혀 · 냄새와 맛', skin: '✋ 피부 · 감각점과 두 점 구별', path: '🧠 자극이 뇌로 전달되는 경로',
  };
  function setScene(name) {
    S.scene = name; HOT.length = 0;
    $$('#ctrlCard .cgrp').forEach((g) => { g.hidden = g.dataset.scene !== name; });
    $$('#sceneSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.scene === name); b.setAttribute('aria-selected', b.dataset.scene === name ? 'true' : 'false'); });
    $('#sceneLabel').textContent = LABEL[name];
    if (name === 'path') pathRows();
    if (name === 'skin') buildGapSeg();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  function hideF(el, h) { if (el) el.hidden = h; }
  // 슬라이더
  const sOff = $('#sOff'), sDist = $('#sDist'), sBright = $('#sBright'), sObj = $('#sObj');
  const bOff = SciSim.bindRange(sOff, $('#oOff'), (v) => '+에서 ' + (+v).toFixed(1) + ' cm', (v) => { S.blind.off = v; S.blind.touched = true; });
  const bDist = SciSim.bindRange(sDist, $('#oDist'), (v) => v + ' cm', (v) => { S.blind.dist = v; });
  const bBright = SciSim.bindRange(sBright, $('#oBright'), (v) => (v > 0.8 ? '아주 밝음' : v > 0.6 ? '밝음' : v > 0.4 ? '보통' : v > 0.2 ? '어두움' : '아주 어두움'), (v) => { S.adj.bright = v; });
  const bObj = SciSim.bindRange(sObj, $('#oObj'), (v) => distText(DIST(v)), (v) => { S.adj.obj = v; });
  function setBlindOff(v) { S.blind.off = clamp(v, 0, 24); bOff.set(S.blind.off.toFixed(1)); }
  // 귀 · 코 · 피부 · 경로
  $('#btnSound').addEventListener('click', () => { Sound.click(); startSound(); });
  $('#btnTaste').addEventListener('click', () => { Sound.click(); startTaste(); });
  $('#btnPinch').addEventListener('click', () => { Sound.click(); S.nose.pinched = !S.nose.pinched; $('#btnPinch').setAttribute('aria-pressed', S.nose.pinched ? 'true' : 'false'); S.nose.sp = []; });
  $$('#foodSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.nose.food = b.dataset.food; $$('#foodSeg button').forEach((x) => x.classList.toggle('on', x === b)); }));
  function buildGapSeg() {
    const K = S.skin, R = REG[K.region], box = $('#gapSeg'); box.innerHTML = '';
    R.gaps.forEach((g) => {
      const b = SciSim.el('button', { type: 'button', text: g + '', 'data-gap': g, class: g === K.gap ? 'on' : '' });
      b.addEventListener('click', () => { Sound.click(); K.gap = g; $$('#gapSeg button').forEach((x) => x.classList.toggle('on', x === b)); $('#oGap').textContent = g + ' mm'; skinChanged(); });
      box.appendChild(b);
    });
    $('#oGap').textContent = K.gap + ' mm';
    $$('#regionSeg button').forEach((x) => x.classList.toggle('on', x.dataset.region === K.region));
  }
  $$('#regionSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); const K = S.skin; K.region = b.dataset.region; K.gap = K.region === 'finger' ? 2 : 20; buildGapSeg(); skinChanged();
  }));
  $('#btnSend').addEventListener('click', () => { Sound.click(); if (!allOk()) { S.path.showErr = true; toast('아직 연결이 맞지 않는 줄이 있어요', 'bad', 1800); } sendSignals(); });

  /* ---------- 포인터 ---------- */
  function tapTag(h, p) {
    showTip(h.title, h.msg, h.tx || p.x, h.ty || p.y);
    Sound.tick();
    if (h.tag === 'cochlea') { if (!S.tapped.ear) burst(h.x + h.w / 2, h.y, ['#fb923c', '#fde047']); S.tapped.ear = true; }
    if (h.tag === 'nose') { if (!S.tapped.nose) burst(h.x + h.w / 2, h.y, ['#fde047', '#4ade80']); S.tapped.nose = true; }
    if (h.tag === 'tongue') { if (!S.tapped.tongue) burst(h.x + h.w / 2, h.y, ['#fb923c', '#f9a8d4']); S.tapped.tongue = true; }
    if (h.tag === 'skin') { if (!S.tapped.skin) burst(h.x + h.w / 2, h.y, ['#f87171', '#60a5fa', '#4ade80']); S.tapped.skin = true; }
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'blind' && inR(p, { x: CARD.x, y: CARD.y + 30, w: CARD.w, h: CARD.h - 60 }, 6)) {
        S.blind.drag = true; setBlindOff((p.x - CARD.px) / CARD.K); return true;
      }
      // 특별한 조작이 없으면 이름표
      for (let i = HOT.length - 1; i >= 0; i--) { if (inR(p, HOT[i])) { tapTag(HOT[i], p); return false; } }
      if (S.scene === 'nose' && inC(p, { x: BUD.x, y: BUD.y, r: BUD.r })) { tapTag({ title: '맛봉오리', msg: '혀에 있는 맛봉오리 안의 미각 세포가 액체 상태 물질(맛)을 받아들여요.', tag: 'tongue', x: BUD.x - 20, y: BUD.y - 20, w: 40, h: 40, tx: BUD.x, ty: BUD.y - 40 }, p); return false; }
      if (S.scene === 'nose' && inC(p, { x: 466, y: 228, r: 30 })) { tapTag({ title: '후각 세포', msg: '코 안 천장에 있어요. 공기 중의 기체 상태 물질(냄새)을 받아들여요.', tag: 'nose', x: 446, y: 208, w: 40, h: 40, tx: 466, ty: 210 }, p); return false; }
      if (S.scene === 'path') {
        pathRows();
        for (let i = 0; i < 5; i++) {
          const y = rowY(i), r = S.path.rows[i];
          if (p.y >= y && p.y <= y + PR.h) {
            if (p.x >= PR.organ.x && p.x <= PR.organ.x + PR.organ.w) { r.organ = (r.organ + 1) % 5; Sound.click(); return false; }
            if (p.x >= PR.cell.x && p.x <= PR.cell.x + PR.cell.w) { r.cell = (r.cell + 1) % 5; Sound.click(); return false; }
          }
        }
      }
      return false;
    },
    move(p) { if (S.blind.drag) setBlindOff((p.x - CARD.px) / CARD.K); },
    up() { S.blind.drag = false; },
    hover(p) {
      if (S.scene === 'blind' && inR(p, { x: CARD.x, y: CARD.y + 30, w: CARD.w, h: CARD.h - 60 })) return 'ew-resize';
      for (let i = HOT.length - 1; i >= 0; i--) if (inR(p, HOT[i])) return 'pointer';
      if (S.scene === 'path') for (let i = 0; i < 5; i++) { const y = rowY(i); if (p.y >= y && p.y <= y + PR.h && ((p.x >= PR.organ.x && p.x <= PR.organ.x + PR.organ.w) || (p.x >= PR.cell.x && p.x <= PR.cell.x + PR.cell.w))) return 'pointer'; }
      return 'default';
    },
  });

  /* ---------- 미션 ---------- */
  const FIG_BLIND = '<svg viewBox="0 0 300 130" role="img" aria-label="맹점 실험 결과" style="max-width:340px;width:100%;background:#fff;border:1px solid #dde4ef;border-radius:10px">' +
    '<text x="150" y="18" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">실험 결과: ●는 어느 곳에서만 사라졌어요</text>' +
    '<g stroke="#334155" stroke-width="3"><line x1="30" y1="76" x2="50" y2="76"/><line x1="40" y1="66" x2="40" y2="86"/></g>' +
    '<circle cx="86" cy="76" r="9" fill="#dc2626"/><circle cx="146" cy="76" r="9" fill="none" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="2"/><circle cx="226" cy="76" r="9" fill="#dc2626"/>' +
    '<text x="86" y="108" text-anchor="middle" font-size="12" fill="#16a34a">보임</text><text x="146" y="108" text-anchor="middle" font-size="12" fill="#dc2626" font-weight="800">안 보임</text><text x="226" y="108" text-anchor="middle" font-size="12" fill="#16a34a">보임</text>' +
    '<text x="40" y="52" text-anchor="middle" font-size="12" fill="#475569">+ (바라보는 곳)</text></svg>';
  const levels = [
    {
      title: '맹점 실험', short: '맹점 실험', icon: '🔬', phase: '실험',
      features: ['blind'],
      intro: '<p class="si-q">❓ 탐구 질문: 눈으로 들어온 빛은 어떻게 ‘보는 것’이 될까?</p>' +
        '<p>카드에 <b>+</b>와 <b>●</b>가 있어요. <b>왼눈을 가리고 오른눈으로 +만 바라보면서</b> 카드를 앞뒤로 움직이면, 어느 순간 ●가 갑자기 <b>사라져요</b>! 이 <b>맹점 실험</b>을 눈 모형에서 해 보고, 보이지 않는 까닭으로 눈의 구조를 추론해 봐요.</p>' +
        '<p class="gnote">직접 해 보기: 이 화면을 눈에서 약 30 cm 떨어뜨리고, 왼눈을 감고 오른눈으로 +만 보세요. ●가 +의 오른쪽 약 8 cm쯤에 오면 사라져요.</p>',
      setup() { setScene('blind'); setBlindOff(3); bDist.set(30); S.blind.dist = 30; S.blind.touched = false; S.blind.hitDists = []; showHint('● 를 끌어서 사라지는 곳을 찾아봐요', 6500); },
      recap: '오른눈으로 + 를 보며 ● 를 옮기면, 상이 시각 신경이 나가는 곳(맹점)에 맺힐 때 ● 가 보이지 않아요. 맹점에는 <b>시각 세포가 없기</b> 때문이에요.',
      summary: '<ul><li><b>맹점 실험</b>: 한쪽 눈으로 + 를 보며 ● 를 옮기면, 어떤 위치에서 ● 가 보이지 않는다.</li>' +
        '<li>눈의 <b>망막</b>에는 빛을 받아들이는 <b>시각 세포</b>가 있고, 시각 세포가 받아들인 자극은 <b>시각 신경</b>을 통해 뇌로 전달된다.</li>' +
        '<li><b>맹점</b> = 시각 신경이 모여 눈 밖으로 나가는 곳. 시각 세포가 <b>없어서</b> 상이 맺혀도 보이지 않는다.</li></ul>',
      missions: [
        {
          title: '사라지는 곳 찾기',
          goal: '오른눈으로 <b>+</b>만 본다고 생각하고, <b>●</b>를 끌어(또는 슬라이더로) <b>●가 사라지는 곳</b>을 찾으세요.',
          hint: '+에서 오른쪽으로 8 cm쯤 떨어진 곳이에요. 눈 단면에서 빨간 점(●의 상)이 노란 <b>맹점</b> 위에 오는지 봐요.',
          setup() { setScene('blind'); S.blind.hold = 0; showHint('● 를 끌어서 사라지는 곳을 찾아봐요', 6500); },
          check: () => S.blind.hidden, hold: 0.8,
          status: () => mark(S.blind.hidden) + ' ● 사라짐 · 지금 + 에서 <b>' + S.blind.off.toFixed(1) + ' cm</b>',
          explain: '●가 사라질 때 눈 속에서는 ●의 상이 망막의 <b>한 지점</b>에 맺혀요. 그곳이 <b>시각 신경이 모여 눈 밖으로 나가는 곳</b>(맹점)이에요. 빛은 눈에 들어왔는데도 보이지 않았죠?',
        },
        {
          title: '거리를 바꿔 다시 찾기',
          goal: '이번에는 <b>👁️ 눈 ↔ 카드</b> 거리를 바꾸고, ●가 사라지는 곳을 다시 찾아 보세요. <b>10 cm 이상 다른 거리</b> 두 곳에서 찾으면 성공!',
          hint: '거리 슬라이더를 먼저 바꾼 다음 ●를 끌어요. 눈에서 카드가 멀어지면 사라지는 곳도 +에서 더 멀어져요.',
          setup() { setScene('blind'); S.blind.hitDists = []; S.blind.hold = 0; showHint('거리를 바꿔서 한 번 더 찾아봐요', 6500); },
          check: () => { const h = S.blind.hitDists; return h.length >= 2 && Math.max.apply(null, h) - Math.min.apply(null, h) >= 10; }, hold: 0.4,
          status: () => { const h = S.blind.hitDists.slice().sort((a, b) => a - b); return (h.length ? h.map((d) => '✅ ' + d + ' cm').join(' · ') + ' · ' : '') + '⬜ 10 cm 이상 다른 거리에서 찾기'; },
          explain: '눈과 카드 사이의 거리가 달라지면 ●가 사라지는 위치(+에서 떨어진 거리)도 달라져요. 하지만 상이 맺히는 곳은 늘 눈 속의 <b>같은 곳(맹점)</b>이에요.',
        },
        {
          type: 'quiz', title: '● 가 사라진 까닭',
          goal: '실험에서 ●가 사라진 까닭은 무엇일까요? 눈의 구조와 관련지어 추론해 보세요.',
          figure: FIG_BLIND,
          setup() { setScene('blind'); },
          choices: ['●에서 오는 빛이 눈 안으로 들어오지 못했기 때문이에요', '●의 상이 맺히는 곳에 시각 세포가 없기 때문이에요', '수정체가 ●를 볼 수 없게 두꺼워졌기 때문이에요', '홍채가 ●의 빛을 막았기 때문이에요'],
          answer: 1,
          feedback: ['눈 모형에서 ●에서 온 빨간 광선이 눈 속으로 들어와 망막까지 갔어요. 빛은 들어왔는데 보이지 않은 거예요.', '', '수정체는 빛을 모아 상을 맺히게 해요. ●가 사라지는 위치는 수정체의 두께와 관계없이 눈 속 같은 곳이에요.', '홍채는 동공의 크기를 조절해요. 빛이 들어왔는데도 사라졌으니 홍채 때문은 아니에요.'],
          explain: '빛은 눈에 들어왔지만, 상이 <b>시각 신경이 모여 나가는 곳(맹점)</b>에 맺혀서 보이지 않았어요. 그곳에는 빛을 받아들이는 <b>시각 세포가 없기</b> 때문이에요.',
        },
      ],
    },
    {
      title: '눈의 조절: 홍채와 수정체', short: '눈의 조절', icon: '👁️', phase: '탐구',
      features: ['adjust'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 눈 속의 <b>망막</b>에 시각 세포가 있어서 빛 자극을 받아들인다는 것을 알았어요.</div>' +
        '<p>그런데 밝은 곳에서도, 어두운 곳에서도, 가까운 곳에서도, 먼 곳에서도 우리는 잘 봐요. 눈은 어떻게 이런 변화에 <b>적응</b>할까요? <b>홍채</b>와 <b>수정체</b>의 움직임을 살펴봐요.</p>',
      setup() { setScene('adjust'); S.adj.seen = { bright: false, dark: false, near: false, far: false }; showHint('밝기와 거리를 바꿔 눈의 변화를 관찰해요', 6500); },
      recap: '<b>홍채</b>는 동공의 크기를 바꿔 빛의 양을 조절하고, <b>섬모체</b>는 <b>수정체</b>의 두께를 바꿔 망막에 선명한 상이 맺히게 해요.',
      summary: '<ul><li><b>홍채</b>: 동공(눈동자)의 크기를 조절한다. 밝은 곳 → 동공 작아짐 / 어두운 곳 → 동공 커짐</li>' +
        '<li><b>수정체</b>: 두께가 바뀌며 빛을 굴절시켜 망막에 상을 맺게 한다. <b>섬모체</b>(근육)가 두께를 조절한다.</li>' +
        '<li>가까운 곳을 볼 때 → 섬모체 수축 → 수정체 <b>두꺼워짐</b> / 먼 곳을 볼 때 → 섬모체 이완 → 수정체 <b>얇아짐</b></li></ul>',
      missions: [
        {
          title: '밝기에 따른 동공의 변화',
          goal: '<b>💡 주변 밝기</b>를 <b>아주 밝게</b>, 그리고 <b>아주 어둡게</b> 바꾸며 <b>동공(눈동자)</b>의 크기가 어떻게 변하는지 보세요.',
          hint: '밝기 슬라이더를 오른쪽 끝(밝게)과 왼쪽 끝(어둡게)으로 옮겨요. 홍채가 움직이는 것을 눈 단면에서 봐요.',
          setup() { setScene('adjust'); S.adj.seen.bright = S.adj.seen.dark = false; },
          check: () => S.adj.seen.bright && S.adj.seen.dark,
          status: () => mark(S.adj.seen.bright) + ' 아주 밝게 → 동공 작아짐 · ' + mark(S.adj.seen.dark) + ' 아주 어둡게 → 동공 커짐', hold: 0.3,
          explain: '밝은 곳에서는 <b>홍채</b>가 동공을 <b>작게</b> 만들어 눈으로 들어오는 빛의 양을 줄이고, 어두운 곳에서는 동공을 <b>크게</b> 만들어 빛을 더 많이 받아들여요.',
        },
        {
          title: '거리에 따른 수정체의 변화',
          goal: '<b>🌸 물체까지 거리</b>를 <b>아주 가깝게</b>, 그리고 <b>아주 멀게</b> 바꾸며, 망막에 <b>선명한 상</b>이 맺힐 때 수정체의 두께를 비교하세요.',
          hint: '거리 슬라이더를 왼쪽 끝(가까움)과 오른쪽 끝(멂)으로 옮기고, 수정체가 두께를 바꾸어 상이 “선명해요!”가 될 때까지 기다려요.',
          setup() { setScene('adjust'); S.adj.seen.near = S.adj.seen.far = false; },
          check: () => S.adj.seen.near && S.adj.seen.far,
          status: () => mark(S.adj.seen.near) + ' 가까이: 수정체 두꺼워짐 · ' + mark(S.adj.seen.far) + ' 멀리: 수정체 얇아짐', hold: 0.3,
          explain: '가까운 물체를 볼 때는 <b>섬모체가 수축</b>해서 수정체가 <b>두꺼워지고</b>, 먼 물체를 볼 때는 섬모체가 이완해서 수정체가 <b>얇아져요</b>. 이렇게 수정체의 두께가 바뀌어 망막에 선명한 상이 맺혀요.',
        },
        {
          type: 'quiz', title: '먼 산을 보다가 책을 볼 때',
          goal: '창밖의 먼 산을 보다가 가까이 있는 책으로 눈을 돌렸어요. 이때 눈에서 일어나는 변화로 옳은 것은?',
          setup() { setScene('adjust'); },
          choices: ['섬모체가 이완해서 수정체가 얇아진다', '섬모체가 수축해서 수정체가 두꺼워진다', '홍채가 동공을 크게 만들어 상이 선명해진다', '망막이 앞으로 움직여 상이 맺힌다'],
          answer: 1,
          feedback: ['얇은 수정체는 먼 곳을 볼 때예요. 가까운 책을 볼 때는 수정체가 더 두꺼워져야 상이 망막에 맺혀요.', '', '동공 크기는 빛의 양을 조절해요. 가까운 곳과 먼 곳을 보는 것은 수정체의 두께가 맡아요.', '망막의 위치는 변하지 않아요. 수정체의 두께가 바뀌어 상이 맺히는 위치를 맞춰요.'],
          explain: '가까운 곳을 볼 때는 <b>섬모체가 수축</b>하여 수정체가 <b>두꺼워져요</b>. 그러면 빛이 더 많이 꺾여서 가까운 물체의 상이 망막에 선명하게 맺혀요.',
        },
      ],
    },
    {
      title: '귀·코·혀·피부의 자극 받아들이기', short: '여러 감각', icon: '👂', phase: '관찰',
      features: ['ear', 'nose', 'skin'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 눈이 빛 자극을 받아들이고, 그 신호가 시각 신경을 통해 뇌로 전달된다는 것을 알았어요.</div>' +
        '<p>우리 몸에는 눈 말고도 <b>귀 · 코 · 혀 · 피부</b> 같은 감각 기관이 있어요. 각각 <b>어떤 자극</b>을 <b>어디에서</b> 받아들이는지 살펴봐요.</p>',
      setup() { setScene('ear'); S.tapped = { ear: false, nose: false, tongue: false, skin: false }; showHint('위쪽 버튼으로 귀·코·혀·피부를 살펴봐요', 6500); },
      recap: '귀는 <b>소리</b>, 코는 <b>냄새(기체)</b>, 혀는 <b>맛(액체)</b>, 피부는 <b>온도·압력·접촉·통증</b> 자극을 각각의 <b>감각 세포</b>로 받아들여요.',
      summary: '<table class="mini"><tr><th>감각 기관</th><th>받아들이는 자극</th><th>감각 세포가 있는 곳</th></tr>' +
        '<tr><td>눈</td><td>빛</td><td>망막(시각 세포)</td></tr><tr><td>귀</td><td>소리</td><td>달팽이관(청각 세포)</td></tr><tr><td>코</td><td>기체 상태 물질(냄새)</td><td>후각 세포 (쉽게 피로해짐)</td></tr>' +
        '<tr><td>혀</td><td>액체 상태 물질(맛)</td><td>맛봉오리(미각 세포)</td></tr><tr><td>피부</td><td>통증·압력·접촉·온도</td><td>통점·압점·촉점·냉점·온점</td></tr></table>' +
        '<ul><li>귀의 <b>반고리관</b>은 몸의 회전, <b>전정 기관</b>은 몸의 기울어짐을 느낀다.</li><li>음식의 맛은 <b>미각 + 후각</b>이 함께 작용해 느낀다.</li><li>피부 감각점의 분포는 부위마다 다르다. (손끝·입술에 많다)</li></ul>',
      missions: [
        {
          title: '자극을 받아들이는 곳 찾기',
          goal: '<b>귀 · 코 · 혀 · 피부</b> 그림에서, 자극을 직접 받아들이는 <b>감각 세포(감각점)</b>의 이름표를 눌러 보세요. (위쪽 버튼으로 장면을 바꿔요)',
          hint: '귀는 달팽이관, 코는 코 안 천장의 후각 세포, 혀는 맛봉오리, 피부는 통점·촉점 같은 감각점을 눌러요. 귀에서는 🔔 소리 내기도 해 보세요.',
          setup() { setScene('ear'); S.tapped = { ear: false, nose: false, tongue: false, skin: false }; },
          check: () => S.tapped.ear && S.tapped.nose && S.tapped.tongue && S.tapped.skin,
          status: () => mark(S.tapped.ear) + ' 귀 · ' + mark(S.tapped.nose) + ' 코 · ' + mark(S.tapped.tongue) + ' 혀 · ' + mark(S.tapped.skin) + ' 피부', hold: 0.3,
          explain: '자극을 받아들이는 곳은 각 기관 속의 <b>감각 세포</b>예요. 귀는 <b>달팽이관의 청각 세포</b>, 코는 <b>후각 세포</b>(기체), 혀는 <b>맛봉오리의 미각 세포</b>(액체), 피부는 <b>감각점</b>(통점·압점·촉점·냉점·온점)이에요.',
        },
        {
          title: '코를 막고 맛보기',
          goal: '<b>😋 맛보기</b>를 <b>코를 막지 않고</b> 한 번, <b>👃 코 막기</b>를 켜고 한 번 해 보세요. 맛이 어떻게 달라지나요?',
          hint: '음식을 고르고 맛보기 → 끝나면 코 막기를 켜고 다시 맛보기. 뇌의 말풍선을 비교해요.',
          setup() { setScene('nose'); S.nose.tastedOpen = S.nose.tastedPinched = false; S.nose.result = ''; },
          check: () => S.nose.tastedOpen && S.nose.tastedPinched,
          status: () => mark(S.nose.tastedOpen) + ' 코 열고 맛보기 · ' + mark(S.nose.tastedPinched) + ' 코 막고 맛보기', hold: 0.5,
          explain: '코를 막으면 냄새 입자가 <b>후각 세포</b>에 닿지 못해서 맛이 흐릿해져요. 음식의 맛은 <b>미각</b>(혀)과 <b>후각</b>(코)이 함께 작용해서 느껴요.',
        },
        {
          title: '두 점 구별하기',
          goal: '<b>부위</b>를 손끝과 등으로 바꾸며 두 점 사이 <b>간격</b>을 바꿔 보세요. 점이 <b>2개로 느껴지는 가장 짧은 간격</b>은 얼마인가요?',
          hint: '손끝은 1 → 2 → 3 mm, 등은 10 → 20 → 30 → 40 mm 순서로 눌러 보면 1점에서 2점으로 바뀌는 곳을 찾을 수 있어요.',
          setup() { setScene('skin'); S.skin.obs = { finger: { one: {}, two: {} }, back: { one: {}, two: {} } }; S.skin.region = 'finger'; S.skin.gap = 2; buildGapSeg(); skinChanged(); },
          check: () => { const o = S.skin.obs; return !!(o.finger.one[2] && o.finger.two[3] && o.back.one[30] && o.back.two[40]); },
          status: () => { const o = S.skin.obs; return mark(!!(o.finger.one[2] && o.finger.two[3])) + ' 손끝 (1점→2점) · ' + mark(!!(o.back.one[30] && o.back.two[40])) + ' 등 (1점→2점)'; }, hold: 0.3,
          explain: '손끝은 약 <b>3 mm</b>만 떨어져도 두 점으로 느끼지만, 등은 약 <b>40 mm</b>는 떨어져야 두 점으로 느껴요. <b>감각점이 많이 분포한 부위</b>(손끝, 입술)일수록 작은 차이도 구별하는 예민한 부위예요.',
        },
      ],
    },
    {
      title: '자극이 뇌로 전달되는 과정', short: '뇌로 전달', icon: '🧠', phase: '설명',
      features: ['path'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 눈·귀·코·혀·피부가 각각 다른 자극을 감각 세포로 받아들인다는 것을 알았어요.</div>' +
        '<p>감각 세포가 받아들인 자극은 <b>감각 신경</b>을 통해 <b>대뇌</b>로 전달돼요. 자극마다 <b>감각 기관</b>과 <b>감각 세포</b>를 알맞게 이어서 <b>자극 → 감각 기관 → 감각 세포 → 감각 신경 → 대뇌</b> 경로를 완성해 봐요.</p>',
      setup() { setScene('path'); S.path.rows = []; pathRows(); S.path.showErr = false; S.path.sendT = -1; },
      recap: '자극은 <b>감각 기관 → 감각 세포 → 감각 신경 → 대뇌</b> 순서로 전달돼요. 대뇌가 자극을 느끼고 판단해요.',
      summary: '<span class="formula">자극 → 감각 기관 → 감각 세포 → 감각 신경 → 대뇌</span>' +
        '<ul><li>빛 → 눈 → 시각 세포 → 시각 신경 → 대뇌</li><li>소리 → 귀 → 청각 세포 → 청각 신경 → 대뇌</li><li>냄새 → 코 → 후각 세포 → 후각 신경 → 대뇌</li><li>맛 → 혀 → 미각 세포 → 미각 신경 → 대뇌</li><li>온도 → 피부 → 온점·냉점 → 감각 신경 → 대뇌</li></ul>' +
        '<p>음식의 맛은 미각과 후각이 함께 작용한 결과라서, 코가 막히면 맛을 덜 느낀다.</p>',
      missions: [
        {
          title: '자극의 경로 이어 보기', manual: true,
          goal: '<b>빛 · 소리 · 냄새 · 맛 · 온도</b> 자극을 받아들이는 <b>감각 기관</b>과 <b>감각 세포</b>를 칸을 눌러 골라요. 다 고르면 <b>✔ 확인하기</b>!',
          hint: '냄새는 코, 맛은 혀예요. 온도는 피부의 온점·냉점이 받아들여요. 칸을 누를 때마다 보기가 바뀌어요.',
          setup() { setScene('path'); S.path.rows = []; pathRows(); S.path.showErr = false; S.path.sendT = -1; showHint('칸을 눌러 감각 기관과 감각 세포를 골라요', 6500); },
          check: () => {
            const rows = pathRows(); S.path.showErr = true;
            for (let i = 0; i < 5; i++) {
              const r = rows[i], st = STIM[i];
              if (r.organ < 0 || r.cell < 0) return '아직 비어 있는 칸이 있어요. 모든 자극의 칸을 채워 주세요.';
              if (r.organ !== i) return st.t.replace('(기체)', '').replace('(액체)', '').replace('(열)', '') + ' 자극은 <b>' + st.organ + '</b>에서 받아들여요. 빨간 칸을 다시 골라 보세요.';
              if (r.cell !== i) return st.organ + '에서 ' + st.t.replace('(기체)', '').replace('(액체)', '').replace('(열)', '') + ' 자극을 직접 받아들이는 세포는 <b>' + st.cell + '</b>예요.';
            }
            return true;
          },
          explain: '모든 경로가 이어졌어요! 각 감각 세포는 <b>한 가지 종류의 자극</b>만 받아들여 신호로 바꾸고, 이 신호는 <b>감각 신경</b>을 따라 <b>대뇌</b>로 전달돼요. ⚡ 자극 보내기를 눌러 신호가 가는 모습을 봐요.',
        },
        {
          type: 'quiz', title: '코가 막히면 맛을 덜 느끼는 까닭',
          goal: '감기에 걸려 코가 막히면 음식의 맛을 잘 못 느껴요. 그 까닭으로 가장 알맞은 것은?',
          setup() { setScene('nose'); },
          choices: ['혀의 맛봉오리가 막혀서 미각 세포가 맛을 못 느끼기 때문이에요', '맛은 미각과 후각이 함께 작용하는데, 코가 막혀 냄새를 받아들이기 어렵기 때문이에요', '미각 신경이 끊어져서 신호가 대뇌로 가지 못하기 때문이에요', '코가 막히면 대뇌가 맛을 느끼는 일을 멈추기 때문이에요'],
          answer: 1,
          feedback: ['코가 막혀도 혀의 맛봉오리는 그대로예요. 단맛·짠맛 같은 기본 맛은 느껴요.', '', '신경은 끊어지지 않았어요. 코로 들어오는 냄새 자극이 줄어든 거예요.', '대뇌는 그대로 작동해요. 후각 세포에서 오는 신호가 줄어들어서 맛이 흐릿해진 거예요.'],
          explain: '음식의 맛은 혀의 <b>미각</b>과 코의 <b>후각</b>이 함께 작용해서 느껴요. 코가 막히면 냄새 자극이 <b>후각 세포</b>에 닿지 못해 <b>대뇌로 가는 신호가 줄어서</b> 맛을 덜 느껴요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'm3-senses', mount: '#game', badge: '감각 탐험가', homeHref: '../../index.html#g3',
    featureLabels: {
      blind: '🔬 맹점 실험(눈 모형)', adjust: '👁️ 홍채·수정체 조절', ear: '👂 귀: 소리가 지나가는 길', nose: '👃 코와 👅 혀: 냄새와 맛', skin: '✋ 피부: 감각점과 두 점 구별', path: '🧠 자극의 전달 경로 잇기',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); },
    levels,
  });

  /* ---------- 갱신 · 그리기 ---------- */
  SciSim.loop((dt, t) => {
    clock += dt;
    if (S.scene === 'blind') updateBlind(dt);
    else if (S.scene === 'adjust') updateAdjust(dt);
    else if (S.scene === 'ear') updateEar(dt);
    else if (S.scene === 'nose') updateNose(dt);
    else if (S.scene === 'skin') updateSkin(dt);
    else updatePath(dt);
    // 경로 장면: 모두 맞게 이으면 자동으로 신호를 보내 줌
    if (S.scene === 'path' && S.path.rows.length === 5 && allOk() && !S.path.autoSent) { S.path.autoSent = true; setTimeout(sendSignals, 300); }
    if (S.scene === 'path' && !allOk()) S.path.autoSent = false;
    PFX.update(dt);
    HOT.length = 0;
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    if (S.scene === 'blind') drawBlind();
    else if (S.scene === 'adjust') drawAdjust();
    else if (S.scene === 'ear') drawEar();
    else if (S.scene === 'nose') drawNose();
    else if (S.scene === 'skin') drawSkin();
    else drawPath();
    PFX.draw(ctx);
    drawTip(); drawHint();
  });

  setScene('blind');
  window.__sim = {
    S, game, setScene, HOT, PR, CARD, BUD, EYE, setBlindOff, startSound, startTaste, sendSignals, allOk, REG, rowY, bDist, bBright, bObj, bOff, skinChanged, buildGapSeg,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    hot(tagName) { const h = HOT.find((q) => q.tag === tagName); return h ? this.toClient(h.x + h.w / 2, h.y + h.h / 2) : null; },
  };
})();
