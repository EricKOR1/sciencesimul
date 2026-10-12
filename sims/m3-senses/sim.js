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
