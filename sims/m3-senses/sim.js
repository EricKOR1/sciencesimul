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
