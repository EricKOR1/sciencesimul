/* =========================================================
   중1 Ⅴ. 힘의 작용 — 힘의 표현과 평형 [9과05-01]
   ① [관찰] 힘이 작용하면?  옆에서 본 힘 실험대(찰흙·수레) → 힘의 뜻, 화살표 3요소
   ② [실험] 나란한 두 힘의 합력  위에서 본 얼음판 위 상자, 핀 빼기
   ③ [설명] 힘의 평형  크기 같음 · 방향 반대 · 같은 작용선
   ④ [적용] 생활 속 힘의 평형  줄다리기(1칸 = 100 N), 팔씨름
   범위: 나란한 힘의 합력만 다룸 (비스듬한 힘의 합성, 돌림힘 용어, 관성·가속도 제외)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const EASE = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const { rgba, shade } = SciSim.color;

  /* ---------- 캔버스 (태블릿 800×520 · 휴대폰 600×520) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const W = PHONE ? 600 : 800, H = 520, FS = PHONE ? 1.2 : 1;
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eef5ff' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  let feat = new Set();
  const on = (f) => feat.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const NOW = () => performance.now() / 1000;

  const COL = { push: '#f97316', net: '#7c3aed', ink: '#1b2333', muted: '#5d6879', good: '#16a34a', warn: '#dc2626' };
  const NPX = 24;          // 1 N = 24 px (장면 A·B)
  const TPX = 30;          // 줄다리기: 1칸(100 N) = 30 px

  /* =========================================================
     그리기 도구 (Ⅴ단원 공통 시각 규칙)
     ========================================================= */
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const font = (s, w) => (w || 800) + ' ' + Math.round(s * FS * 2) / 2 + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = font(o.size || 14, o.weight || 800);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.halo !== false) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo || 'rgba(255,255,255,.92)'; ctx.lineWidth = 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || COL.ink; ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(str, size, weight) { ctx.save(); ctx.font = font(size || 14, weight || 800); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  /* 값 pill: {color, solid, size, align, alpha, fit} */
  function pill(str, x, y, o) {
    o = o || {};
    const size = o.size || 14;
    ctx.save();
    ctx.font = font(size, 800);
    const tw = ctx.measureText(str).width, padX = 9 * FS, h = (size + 10) * FS, w = tw + padX * 2;
    let x0 = x - w / 2;
    if (o.align === 'left') x0 = x; else if (o.align === 'right') x0 = x - w;
    if (o.fit) x0 = clamp(x0, 6, W - w - 6);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rr(x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.solid ? o.color : 'rgba(255,255,255,.96)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (!o.solid) { ctx.lineWidth = 2; ctx.strokeStyle = o.color || '#cbd5e1'; ctx.stroke(); }
    ctx.fillStyle = o.solid ? '#fff' : (o.textColor || shade(o.color || '#475569', -0.25));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x0 + w / 2, y + 0.5);
    ctx.restore();
    return { x: x0, y: y - h / 2, w, h };
  }
  function softShadow(cx, cy, rx, ry, a) {
    a = a == null ? 0.28 : a;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(15,23,42,' + a + ')');
    g.addColorStop(0.55, 'rgba(15,23,42,' + (a * 0.45).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  /* 힘 화살표: 끝이 둥근 몸통 7px, 삼각 머리 18px, 흰 2px 테두리, 그림자, 작용점에 흰 테두리 점 */
  function arrowPath(x, y, dx, dy, w, head) {
    const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const Hd = Math.min(head, L * 0.6), hw = Math.max(w / 2 + 2.5, Hd * 0.6), r = w / 2;
    const bx = x + ux * (L - Hd), by = y + uy * (L - Hd);
    const a0 = Math.atan2(ny, nx);
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a0 + Math.PI);
    ctx.lineTo(bx - nx * r, by - ny * r);
    ctx.lineTo(bx - nx * hw, by - ny * hw);
    ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(bx + nx * hw, by + ny * hw);
    ctx.lineTo(bx + nx * r, by + ny * r);
    ctx.closePath();
    return Hd;
  }
  function forceArrow(x, y, dx, dy, color, o) {
    o = o || {};
    const L = Math.hypot(dx, dy);
    if (L < 1.5) { if (o.dot) appDot(x, y, color); return; }
    const w = o.width || 7;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const Hd = arrowPath(x, y, dx, dy, w, o.head || 18);
    if (o.glow) { ctx.save(); ctx.shadowColor = rgba(color, 0.65); ctx.shadowBlur = 16; ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    ctx.fillStyle = color; ctx.fill();
    const ux = dx / L, uy = dy / L;
    let nx = -uy, ny = ux;
    if (nx + ny > 0) { nx = -nx; ny = -ny; }            // 빛(왼쪽 위)을 받는 쪽
    if (L - Hd > 8) {
      const off = w / 2 - 1.7;
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + ux * 4 + nx * off, y + uy * 4 + ny * off);
      ctx.lineTo(x + ux * (L - Hd - 2) + nx * off, y + uy * (L - Hd - 2) + ny * off); ctx.stroke();
    }
    ctx.restore();
    if (o.dot !== false) appDot(x, y, color, o.alpha);
  }
  function appDot(x, y, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = shade(color, -0.35); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }
  /* 화살표 애니메이션: 처음엔 0→L (easeOutBack 320ms), 값이 바뀌면 임계 감쇠 스프링(ω=14) */
  class AArrow {
    constructor() { this.dx = 0; this.dy = 0; this.vx = 0; this.vy = 0; this.tx = 0; this.ty = 0; this.on = false; this.t = 0; }
    set(tx, ty) {
      const want = Math.hypot(tx, ty) > 0.5;
      if (want) {
        if (!this.on && this.t < 0.02) { this.dx = tx; this.dy = ty; this.vx = 0; this.vy = 0; this.t = 0; }
        this.tx = tx; this.ty = ty;
      }
      this.on = want;
    }
    jump(tx, ty) { this.tx = this.dx = tx; this.ty = this.dy = ty; this.vx = this.vy = 0; this.on = Math.hypot(tx, ty) > 0.5; this.t = this.on ? 1 : 0; }
    update(dt) {
      if (RM) { this.dx = this.tx; this.dy = this.ty; this.vx = this.vy = 0; this.t = this.on ? 1 : 0; return; }
      const w = 14, e = Math.exp(-w * dt);
      const ex = this.dx - this.tx, ey = this.dy - this.ty;
      const bx = this.vx + w * ex, by = this.vy + w * ey;
      this.dx = this.tx + (ex + bx * dt) * e; this.dy = this.ty + (ey + by * dt) * e;
      this.vx = (this.vx - w * bx * dt) * e; this.vy = (this.vy - w * by * dt) * e;
      this.t = this.on ? Math.min(1, this.t + dt / 0.32) : Math.max(0, this.t - dt / 0.16);
    }
    get k() { return this.on ? EASE.outBack(this.t) : this.t * this.t; }
    get shown() { return this.t > 0.002; }
  }
  /* 장갑 손: +x = 힘의 방향. push = 손바닥 앞면이 원점(작용점), pull = 주먹이 원점부터 앞쪽 */
  function glove(x, y, ux, uy, pose, o) {
    o = o || {};
    const s = (o.scale || 1) * (PHONE ? 1.08 : 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(uy, ux));
    if (ux < -0.01) ctx.scale(1, -1);
    ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const skin = o.locked ? '#e5e7eb' : '#fff7ed', line = o.locked ? '#6b7280' : '#9a3412';
    const cuff = o.locked ? '#9ca3af' : '#fb923c', sleeve = o.locked ? '#cbd5e1' : '#60a5fa', sleeveLine = o.locked ? '#94a3b8' : '#2563eb';
    const palm = () => {
      ctx.beginPath();
      ctx.moveTo(-29, -12);
      ctx.bezierCurveTo(-20, -15.5, -8, -15.5, -3, -13);
      ctx.quadraticCurveTo(1.5, -12, 1.5, -6);
      ctx.lineTo(1.5, 7);
      ctx.quadraticCurveTo(1.5, 14, -5, 14);
      ctx.bezierCurveTo(-14, 15.5, -22, 14.5, -29, 12);
      ctx.closePath();
    };
    // 그림자 한 번
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
    ctx.fillStyle = sleeve;
    if (pose === 'push') { rr(-66, -10, 38, 20, 7); ctx.fill(); palm(); ctx.fillStyle = skin; ctx.fill(); }
    else { rr(29, -10, 38, 20, 7); ctx.fill(); rr(0, -14, 27, 28, 10); ctx.fillStyle = skin; ctx.fill(); }
    ctx.restore();
    if (pose === 'push') {
      ctx.strokeStyle = sleeveLine; ctx.lineWidth = 1.5; rr(-66, -10, 38, 20, 7); ctx.stroke();
      ctx.fillStyle = cuff; rr(-36, -12.5, 9, 25, 3); ctx.fill();
      palm(); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(line, 0.5);
      [-6.5, -1.5, 3.5, 8.5].forEach((yy) => { ctx.beginPath(); ctx.moveTo(-1, yy); ctx.lineTo(-9, yy); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(-23, -13); ctx.quadraticCurveTo(-17, -22, -9, -19.5); ctx.quadraticCurveTo(-6, -15.5, -11, -13.5);
      ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.strokeStyle = sleeveLine; ctx.lineWidth = 1.5; rr(29, -10, 38, 20, 7); ctx.stroke();
      ctx.fillStyle = cuff; rr(24, -12.5, 9, 25, 3); ctx.fill();
      rr(0, -14, 27, 28, 10); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(line, 0.5);
      [-7, 0, 7].forEach((yy) => { ctx.beginPath(); ctx.moveTo(1, yy); ctx.lineTo(9, yy); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(4, -14); ctx.quadraticCurveTo(12, -20.5, 20, -14.5);
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
    }
    if (o.locked) {           // 자물쇠
      ctx.save(); ctx.scale(1, ux < -0.01 ? -1 : 1);
      const lx = pose === 'push' ? -14 : 13, ly = 0;
      ctx.fillStyle = '#475569'; rr(lx - 7, ly - 3, 14, 11, 2.5); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(lx, ly - 3, 4.6, Math.PI, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function ropeLine(x1, y1, x2, y2, alpha) {
    ctx.save(); ctx.lineCap = 'round';
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  /* 힘 하나 = (밧줄) + 손 + 화살표 */
  function drawHandForce(x, y, dx, dy, o) {
    o = o || {};
    const L = Math.hypot(dx, dy);
    if (L < 2) return;
    const ux = dx / L, uy = dy / L, a = o.alpha == null ? 1 : o.alpha;
    if (o.pose === 'pull') {
      ropeLine(x, y, x + dx + ux * 6, y + dy + uy * 6, a);
      forceArrow(x, y, dx, dy, o.color || COL.push, { alpha: a });
      if (o.hand !== false) glove(x + dx + ux * 7, y + dy + uy * 7, ux, uy, 'pull', { alpha: a * (o.handAlpha == null ? 1 : o.handAlpha), locked: o.locked });
    } else {
      if (o.hand !== false) glove(x - ux * (o.handGap || 0), y - uy * (o.handGap || 0), ux, uy, 'push', { alpha: a * (o.handAlpha == null ? 1 : o.handAlpha), locked: o.locked });
      forceArrow(x, y, dx, dy, o.color || COL.push, { alpha: a });
    }
  }

  /* ---------- 효과: 성공(링 파동 + 반짝이 10개 + 체크), 결과 배지, NEW 표시 ---------- */
  const rings = [];
  let checkFx = null;
  function celebrate(x, y, r) {
    r = r || 46;
    rings.push({ x, y, r, t: 0 }, { x, y, r, t: -0.14 });
    FX.burst(x, y, { count: 10, life: 0.6, speed: 170, gravity: 120, size: 4.5, shape: 'star', colors: ['#facc15', '#fb923c', '#a78bfa', '#34d399', '#60a5fa'] });
    checkFx = { x, y: Math.max(30, y - r - 16), t: 0 };
  }
  function drawFx(dt) {
    FX.update(dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i]; g.t += dt;
      if (g.t >= 0.6) { rings.splice(i, 1); continue; }
      if (g.t < 0) continue;
      const p = g.t / 0.6;
      ctx.save(); ctx.strokeStyle = rgba('#22c55e', 0.8 * (1 - p)); ctx.lineWidth = 5 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r + p * 48, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    FX.draw(ctx);
    if (checkFx) {
      checkFx.t += dt;
      const t = checkFx.t;
      if (t > 1.5) checkFx = null;
      else {
        const s = t < 0.3 ? EASE.outBack(t / 0.3) : 1, a = t > 1.2 ? (1.5 - t) / 0.3 : 1;
        ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(checkFx.x, checkFx.y); ctx.scale(s, s);
        D.check(0, 0, 17, Math.min(1, t / 0.35)); ctx.restore();
      }
    }
  }
  const badges = [];
  function badge(str, x, y, color, dur) {
    const w = measure(str, 15) + 20 * FS;
    x = clamp(x, w / 2 + 8, W - w / 2 - 8);
    for (let i = badges.length - 1; i >= 0; i--) if (Math.abs(badges[i].y - y) < 34) badges.splice(i, 1);
    badges.push({ str, x, y, color: color || COL.good, t: 0, dur: dur || 2.6 });
  }
  function drawBadges(dt) {
    for (let i = badges.length - 1; i >= 0; i--) {
      const b = badges[i]; b.t += dt;
      if (b.t >= b.dur) { badges.splice(i, 1); continue; }
      const s = b.t < 0.3 ? EASE.outBack(b.t / 0.3) : 1, a = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.translate(b.x, b.y - (1 - Math.min(1, b.t / 0.3)) * 10); ctx.scale(s, s);
      pill(b.str, 0, 0, { solid: true, color: b.color, size: 15 });
      ctx.restore();
    }
  }
  function newTag(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = rgba('#f97316', 0.35 + a * 0.5); ctx.lineWidth = 4;
    rr(x - 6, y - 6, w + 12, h + 12, 14); ctx.stroke(); ctx.restore();
    pill('NEW', x + w + 2, y - 6, { solid: true, color: '#f97316', size: 12, align: 'right' });
  }
  const dirWord = (ux, uy) => {
    const a = Math.atan2(-uy, ux) * 180 / Math.PI, k = ((Math.round(a / 45) % 8) + 8) % 8;
    return ['→ 오른쪽', '↗ 오른쪽 위', '↑ 위쪽', '↖ 왼쪽 위', '← 왼쪽', '↙ 왼쪽 아래', '↓ 아래쪽', '↘ 오른쪽 아래'][k];
  };

  /* =========================================================
     장면 A · 옆에서 본 「힘 실험대」 (1단계)
     ========================================================= */
  const TY = 382;                                         // 책상 윗면
  const AX = { clay: Math.round(W * 0.165), stop: Math.round(W * 0.32), cush: W - 42 };
  AX.home = Math.round((AX.stop + AX.cush) / 2 + 10);
  const CW = PHONE ? 100 : 118, CH = 40, CR = 15;          // 수레
  const CART_V = 45;                                       // 1 N당 굴러가는 속력(px/s, 시각용)
  const A = {
    arrow: new AArrow(), drag: null, drawn: null, info: null, rel: null,
    clay: { pts: null, from: null, to: null, t: 9 },
    cart: { x: AX.home, vT: 0, st: 'idle', t: 0, wheel: 0, hist: [], from: 0, lastHistT: 0 },
    cush: { L: 0, R: 0 },
    changed: { shape: false, motion: false },
    drawMode: false, lastObj: 'cart', shake: 0,
  };
  function cartGeo(x) {
    x = x == null ? A.cart.x : x;
    const wy = TY - CR, bot = wy - 1, top = bot - CH;
    return { x, wy, top, bot, l: x - CW / 2, r: x + CW / 2, hook: { x: x + CW / 2 + 12, y: top + CH / 2 + 3 } };
  }
  function clayRest() {
    const pts = [], n = 44, rx = PHONE ? 52 : 58, ry = 62;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * i / n, c = Math.cos(a), s = Math.sin(a);
      pts.push({ x: AX.clay + rx * (c >= 0 ? 1 : -1) * Math.pow(Math.abs(c), 0.8), y: TY - ry * Math.pow(s, 0.85) });
    }
    pts[0].y = TY; pts[n].y = TY;
    return pts;
  }
  A.clay.pts = clayRest();
  function polyArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
    return Math.abs(a) / 2;
  }
  function clayCenter(pts) {
    let sx = 0, sy = 0;
    pts.forEach((p) => { sx += p.x; sy += p.y; });
    return { x: sx / pts.length, y: (sy / pts.length + TY) / 2 };
  }
  function clayNormal(pts, i, c) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = b.y - a.y, ny = -(b.x - a.x);
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    c = c || clayCenter(pts);
    if (nx * (pts[i].x - c.x) + ny * (pts[i].y - c.y) < 0) { nx = -nx; ny = -ny; }
    return { x: nx, y: ny };
  }
  function nearestOnPoly(pts, p) {
    let best = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
      const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / L2, 0, 1);
      const x = a.x + vx * t, y = a.y + vy * t, d = Math.hypot(p.x - x, p.y - y);
      if (!best || d < best.d) best = { x, y, d, i: t < 0.5 ? i : i + 1 };
    }
    return best;
  }
  function inPoly(pts, p) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function keepOnTable(pts) {
    pts.forEach((p) => { if (p.y > TY) p.y = TY; });
    pts[0].y = TY; pts[pts.length - 1].y = TY;
  }
  // 누른 곳은 힘의 방향으로 4 px × F만큼 들어가고, 나머지는 살짝 부풀어 넓이(부피)를 유지
  function deformClay(cp, ux, uy, F) {
    const src = A.clay.pts, d = Math.min(28, 4 * F), sig = 26;
    const out = src.map((p) => ({ x: p.x, y: p.y }));
    const w = out.map((p) => Math.exp(-((p.x - cp.x) * (p.x - cp.x) + (p.y - cp.y) * (p.y - cp.y)) / (2 * sig * sig)));
    const A0 = polyArea(src);
    out.forEach((p, i) => { p.x += ux * d * w[i]; p.y += uy * d * w[i]; });
    keepOnTable(out);
    const dA = A0 - polyArea(out);
    let Lf = 0;
    for (let i = 0; i < out.length - 1; i++) Lf += Math.hypot(out[i + 1].x - out[i].x, out[i + 1].y - out[i].y) * (1 - (w[i] + w[i + 1]) / 2);
    const delta = Lf > 1 ? dA / Lf : 0;
    const c = clayCenter(out);
    const ns = out.map((_, i) => clayNormal(out, i, c));
    out.forEach((p, i) => { const k = 1 - w[i]; p.x += ns[i].x * delta * k; p.y += ns[i].y * delta * k; });
    keepOnTable(out);
    return out;
  }
  function clayTooFlat(pts) {
    let minY = 1e9, minX = 1e9, maxX = -1e9;
    pts.forEach((p) => { minY = Math.min(minY, p.y); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); });
    return TY - minY < 26 || maxX - minX > (PHONE ? 210 : 250) || minX < 12;
  }
  function animClay(next) {
    A.clay.from = A.clay.pts.map((p) => ({ x: p.x, y: p.y }));
    A.clay.to = next; A.clay.t = 0;
  }
  function stepClay(dt) {
    const c = A.clay;
    if (!c.to) return;
    c.t += dt;
    const t = c.t;
    let e;
    if (RM || t >= 0.85) e = 1;
    else if (t < 0.25) e = EASE.outQuad(t / 0.25);
    else e = 1 + 0.12 * Math.sin((t - 0.25) / 0.2 * Math.PI * 2) * Math.exp(-(t - 0.25) / 0.14);
    if (e === 1) { c.pts = c.to; c.to = null; return; }
    c.pts = c.from.map((p, i) => ({ x: p.x + (c.to[i].x - p.x) * e, y: Math.min(TY, p.y + (c.to[i].y - p.y) * e) }));
  }
  function clayPath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.closePath();
  }
  function clayBox() {
    let minX = 1e9, maxX = -1e9, minY = 1e9;
    A.clay.pts.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); });
    return { minX, maxX, minY, cx: (minX + maxX) / 2, w: maxX - minX, h: TY - minY };
  }

  function drawRoomA() {
    const g = ctx.createLinearGradient(0, 0, 0, TY);
    g.addColorStop(0, '#f5f9ff'); g.addColorStop(1, '#e2ebf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, TY + 20);
    // 1칸 = 1 N 격자 (수레 고리에 맞춤)
    const hk = cartGeo(AX.home).hook;
    ctx.strokeStyle = 'rgba(59,130,246,.11)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = hk.x % NPX; x < W; x += NPX) { ctx.moveTo(Math.round(x) + 0.5, 46); ctx.lineTo(Math.round(x) + 0.5, TY); }
    for (let y = hk.y - Math.floor((hk.y - 46) / NPX) * NPX; y < TY; y += NPX) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke();
    pill('1칸 = 1 N', 14, 24, { align: 'left', color: '#3b82f6', size: 13 });
    // 바닥
    const f = ctx.createLinearGradient(0, TY + 30, 0, H);
    f.addColorStop(0, '#e9dfcf'); f.addColorStop(1, '#d9ccb6');
    ctx.fillStyle = f; ctx.fillRect(0, TY + 30, W, H - TY - 30);
  }
  function drawTable() {
    // 다리
    [46, W - 46].forEach((lx) => {
      const lg = ctx.createLinearGradient(lx - 9, 0, lx + 9, 0);
      lg.addColorStop(0, '#9a6232'); lg.addColorStop(0.5, '#b97a43'); lg.addColorStop(1, '#8a5428');
      ctx.fillStyle = lg; ctx.fillRect(lx - 9, TY + 28, 18, H - TY - 28);
    });
    softShadow(W / 2, H - 6, W * 0.46, 8, 0.12);
    // 상판
    const top = ctx.createLinearGradient(0, TY, 0, TY + 18);
    top.addColorStop(0, '#ecc08a'); top.addColorStop(1, '#cf9257');
    ctx.fillStyle = top; rr(12, TY, W - 24, 18, 4); ctx.fill();
    ctx.fillStyle = '#a86a35'; ctx.fillRect(14, TY + 16, W - 28, 14);
    ctx.strokeStyle = 'rgba(120,70,30,.25)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const y = TY + 5 + k * 4.5;
      ctx.moveTo(14, y);
      for (let x = 14; x <= W - 14; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.05 + k * 1.7) * 1.2);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(16, TY + 1); ctx.lineTo(W - 16, TY + 1); ctx.stroke();
  }
  function drawStop(x, sq, side) {
    const w = 22 - sq * 7, h = 50, x0 = side === 'R' ? x + 11 - w : x - 11;
    softShadow(x, TY + 2, 16, 4, 0.25);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, '#f87171'); g.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g; rr(x0, TY - h, w, h, 6); ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x0 + 3, TY - h + 4, 4, h - 10, 2); ctx.fill();
  }
  function wheel(x, y, r, ang) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, '#475569'); g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const a = ang + k * Math.PI * 2 / 3; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52); }
    ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  function drawCart(x, alpha, ghost) {
    const g = cartGeo(x);
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    if (!ghost) softShadow(x, TY + 2, CW * 0.56, 6, 0.32);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.r - 2, g.hook.y); ctx.lineTo(g.hook.x - 6.5, g.hook.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.hook.x, g.hook.y, 6.5, 0, Math.PI * 2); ctx.stroke();
    const bg = ctx.createLinearGradient(0, g.top, 0, g.bot);
    bg.addColorStop(0, '#60a5fa'); bg.addColorStop(0.55, '#2563eb'); bg.addColorStop(1, '#1e40af');
    rr(g.l, g.top, CW, CH, 9); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#facc15'; rr(g.l + 5, g.top + 5, CW - 10, 7, 3.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.32)'; rr(g.l + 9, g.top + 16, CW * 0.42, 5, 2.5); ctx.fill();
    wheel(g.l + 24, g.wy, CR, A.cart.wheel);
    wheel(g.r - 24, g.wy, CR, A.cart.wheel);
    ctx.restore();
  }
  function drawClay() {
    const b = clayBox(), pts = A.clay.pts;
    softShadow(b.cx, TY + 2, b.w * 0.58, 6, 0.32);
    ctx.save();
    clayPath(pts);
    const g = ctx.createRadialGradient(b.cx - b.w * 0.24, b.minY + b.h * 0.25, 3, b.cx, TY - b.h * 0.3, Math.max(b.w, b.h) * 0.78);
    g.addColorStop(0, '#ffe2cc'); g.addColorStop(0.42, '#fdb88a'); g.addColorStop(1, '#d9773f');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(154,52,18,.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(b.cx - b.w * 0.2, b.minY + b.h * 0.24, Math.max(4, b.w * 0.15), Math.max(3, b.h * 0.1), -0.5, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createLinearGradient(0, TY - 16, 0, TY);
    g2.addColorStop(0, 'rgba(120,40,10,0)'); g2.addColorStop(1, 'rgba(120,40,10,.22)');
    ctx.fillStyle = g2; ctx.fillRect(b.minX - 2, TY - 16, b.w + 4, 16);
    ctx.restore();
  }
  function cartHistX(lag) {
    const h = A.cart.hist, t = NOW() - lag;
    if (!h.length) return A.cart.x;
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= t) { const a = h[i - 1], b = h[i], k = (t - a.t) / Math.max(1e-6, b.t - a.t); return a.x + (b.x - a.x) * clamp(k, 0, 1); }
    }
    return h[0].x;
  }
  function stepCart(dt) {
    const c = A.cart, t = NOW();
    if (t - c.lastHistT > 0.02) { c.hist.push({ t, x: c.x }); c.lastHistT = t; }
    while (c.hist.length > 2 && t - c.hist[0].t > 0.5) c.hist.shift();
    if (c.st === 'roll') {
      c.t += dt;
      const v = c.vT * Math.min(1, c.t / 0.12);
      c.x += v * dt; c.wheel += v * dt / CR;
      const g = cartGeo();
      if (v > 0 && g.hook.x + 7 >= AX.cush - 11) { c.x -= g.hook.x + 7 - (AX.cush - 11); bumpCart('R'); }
      else if (v < 0 && g.l <= AX.stop + 11) { c.x += AX.stop + 11 - g.l; bumpCart('L'); }
      else if (Math.random() < 0.4 && !RM) FX.emit({ x: (v > 0 ? g.l + 10 : g.r - 10), y: TY - 2, vx: -v * 0.15 + (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, life: 0.5, size: 2 + Math.random() * 2, color: 'rgba(160,120,80,.45)', gravity: 40, shape: 'circle' });
    } else if (c.st === 'bump') {
      c.t += dt;
      if (c.t > 0.4) { c.st = 'ret'; c.t = 0; c.from = c.x; }
    } else if (c.st === 'ret') {
      c.t += dt;
      const p = Math.min(1, c.t / 0.6), nx = c.from + (AX.home - c.from) * EASE.inOutCubic(p);
      c.wheel += (nx - c.x) / CR; c.x = nx;
      if (p >= 1) { c.st = 'idle'; c.x = AX.home; }
    }
    A.cush.L = Math.max(0, A.cush.L - dt * 4);
    A.cush.R = Math.max(0, A.cush.R - dt * 4);
  }
  function bumpCart(side) {
    const c = A.cart;
    c.st = 'bump'; c.t = 0; A.cush[side] = 1;
    Sound.tone(150, 0.14, 'sine', 0.16);
    const g = cartGeo();
    const x = side === 'R' ? AX.cush - 11 : AX.stop + 11;
    if (!RM) for (let i = 0; i < 8; i++) FX.emit({ x, y: g.top + Math.random() * CH, vx: (side === 'R' ? -1 : 1) * (40 + Math.random() * 60), vy: (Math.random() - 0.5) * 60, life: 0.45, size: 2.5, color: '#fca5a5', gravity: 60 });
  }

  function hitA(p) {
    if (A.cart.st === 'idle') {
      const g = cartGeo();
      if (Math.hypot(p.x - g.hook.x, p.y - g.hook.y) <= 26) return { obj: 'cart', x: g.hook.x, y: g.hook.y, nx: 1, ny: 0, part: '수레 고리' };
      if (p.x >= g.l - 14 && p.x <= g.r + 14 && p.y >= g.top - 16 && p.y <= TY) {
        const dl = Math.abs(p.x - g.l), dr = Math.abs(p.x - g.r), dtp = Math.abs(p.y - g.top), m = Math.min(dl, dr, dtp);
        if (m === dtp) return { obj: 'cart', x: clamp(p.x, g.l + 8, g.r - 8), y: g.top, nx: 0, ny: -1, part: '수레 윗면' };
        if (m === dl) return { obj: 'cart', x: g.l, y: clamp(p.y, g.top + 8, g.bot - 6), nx: -1, ny: 0, part: '수레 왼쪽 면' };
        return { obj: 'cart', x: g.r, y: clamp(p.y, g.top + 8, g.bot - 6), nx: 1, ny: 0, part: '수레 오른쪽 면' };
      }
    }
    const pts = A.clay.pts, nr = nearestOnPoly(pts, p);
    if (nr && (nr.d <= 24 || inPoly(pts, p))) {
      const n = clayNormal(pts, nr.i);
      return { obj: 'clay', x: nr.x, y: nr.y, nx: n.x, ny: n.y, part: n.y < -0.6 ? '찰흙 윗면' : n.x < 0 ? '찰흙 왼쪽 면' : '찰흙 오른쪽 면' };
    }
    return null;
  }
  function dragMoveA(p) {
    const d = A.drag;
    const vx = p.x - d.x, vy = p.y - d.y, len = Math.hypot(vx, vy);
    const F = clamp(Math.round(len / NPX), 0, 6);
    let ang = Math.atan2(vy, vx);
    const q = Math.PI / 4, k = Math.round(ang / q);
    if (Math.abs(ang - k * q) < 6 * Math.PI / 180) ang = k * q;      // 수평·수직·45°에 살짝 맞춤
    if (F !== d.F) { if (F > 0) Sound.tick(); d.F = F; }
    d.ux = Math.cos(ang); d.uy = Math.sin(ang);
    d.pose = d.ux * d.nx + d.uy * d.ny < -0.15 ? 'push' : 'pull';
    A.arrow.set(d.ux * F * NPX, d.uy * F * NPX);
    A.info = d;
  }
  function dragEndA() {
    const d = A.drag; A.drag = null;
    if (!d || !d.F) { A.arrow.set(0, 0); A.info = A.drawn; return; }
    A.lastObj = d.obj;
    if (A.drawMode) {
      A.drawn = { obj: d.obj, x: d.x, y: d.y, ux: d.ux, uy: d.uy, F: d.F, pose: d.pose, part: d.part };
      A.info = A.drawn;
      const ev = evalDrawn();
      if (ev && ev.all) Sound.tick(); else { A.shake = 1; Sound.fail(); }
      return;
    }
    const rel = { t: 0, obj: d.obj, x: d.x, y: d.y, ux: d.ux, uy: d.uy, F: d.F, pose: d.pose, offX: d.x - A.cart.x, push: 0 };
    A.rel = rel;
    if (d.obj === 'clay') {
      const next = deformClay({ x: d.x, y: d.y }, d.ux, d.uy, d.F);
      if (clayTooFlat(next)) {
        badge('찰흙이 너무 많이 변했어요 · ↺ 로 되돌려요', AX.clay + 90, TY - 150, '#64748b');
        A.rel = null; A.arrow.set(0, 0);
        return;
      }
      animClay(next);
      rel.push = Math.min(28, 4 * d.F);
      A.changed.shape = true;
      Sound.tone(260, 0.12, 'sine', 0.12);
      const b = clayBox();
      badge('🟠 모양이 변했어요', b.cx + 30, TY - 140, '#ea580c');
    } else {
      const Fx = d.F * d.ux;
      if (Math.abs(Fx) < 0.5) {
        badge('수레는 책상을 따라 굴러가요 · 옆으로 밀거나 당겨 봐요', AX.home, TY - 150, '#64748b', 2.8);
      } else {
        const c = A.cart;
        c.st = 'roll'; c.t = 0; c.vT = CART_V * Fx;
        A.changed.motion = true;
        Sound.tone(420, 0.08, 'triangle', 0.08);
        badge('🛒 운동 상태가 변했어요 (멈춰 있다 → 움직임)', AX.home, TY - 150, '#2563eb', 2.8);
      }
    }
  }
  function evalDrawn() {
    const d = A.drawn;
    if (!d) return null;
    const g = cartGeo(AX.home);
    const okP = d.obj === 'cart' && Math.hypot(d.x - g.hook.x, d.y - g.hook.y) <= 14;
    const angDeg = Math.atan2(-d.uy, d.ux) * 180 / Math.PI;
    const okD = Math.abs(angDeg) <= 8;
    const okF = d.F === 4;
    return { okP, okD, okF, all: okP && okD && okF };
  }
  function stepA(dt) {
    A.arrow.update(dt);
    stepClay(dt);
    stepCart(dt);
    A.shake = Math.max(0, A.shake - dt * 2.2);
    const r = A.rel;
    if (r) {
      r.t += dt;
      if (r.t > 0.42 && A.arrow.on) A.arrow.set(0, 0);
      if (r.t > 0.9) A.rel = null;
    }
  }
  function drawSceneA() {
    drawRoomA();
    drawTable();
    drawStop(AX.stop, A.cush.L, 'L');
    drawStop(AX.cush, A.cush.R, 'R');
    drawClay();
    // 잔상 3개
    if (A.cart.st === 'roll' || A.cart.st === 'bump') {
      [0.24, 0.16, 0.08].forEach((lag, i) => { const gx = cartHistX(lag); if (Math.abs(gx - A.cart.x) > 3) drawCart(gx, [0.1, 0.16, 0.24][i], true); });
    }
    drawCart();
    // 목표 표시 (미션)
    const tt = NOW();
    const m = game && game.current();
    if (m && game.isActive(m) && m.key === 'A1') {
      if (!A.changed.shape) D.ring(clayBox().cx, TY - 34, 46, tt, { color: '#f97316', width: 2 });
      if (!A.changed.motion && A.cart.st === 'idle') D.ring(cartGeo().hook.x, cartGeo().hook.y, 18, tt, { color: '#2563eb', width: 2 });
    }
    if (m && game.isActive(m) && m.key === 'A3' && !(evalDrawn() || {}).all) {
      const hk = cartGeo().hook;
      D.ring(hk.x, hk.y, 15, tt, { color: '#16a34a', width: 2.5 });
    }
    // 힘 화살표
    let src = A.drag || (A.drawMode ? A.drawn : null) || A.rel;
    if (src && A.arrow.shown) {
      const k = A.arrow.k;
      let ox = src.x, oy = src.y, ha = 1, handPush = 0;
      if (src === A.rel) {
        if (src.obj === 'cart') ox = A.cart.x + src.offX;
        handPush = src.push * EASE.outQuad(Math.min(1, src.t / 0.25));
        ha = src.t > 0.3 ? Math.max(0, 1 - (src.t - 0.3) / 0.3) : 1;
      }
      const sh = A.shake > 0 ? Math.sin(A.shake * 40) * 5 * A.shake : 0;
      ox += sh;
      const dx = A.arrow.dx * k, dy = A.arrow.dy * k;
      const L = Math.hypot(dx, dy);
      if (L > 2) {
        const ux = dx / L, uy = dy / L;
        if (src.pose === 'push') {
          glove(ox + ux * handPush, oy + uy * handPush, ux, uy, 'push', { alpha: ha });
          forceArrow(ox, oy, dx, dy, COL.push, { alpha: src === A.rel ? Math.max(0, 1 - Math.max(0, src.t - 0.35) / 0.2) : 1 });
        } else {
          drawHandForce(ox, oy, dx, dy, { pose: 'pull', handAlpha: ha });
        }
        // 값 pill: 손이 없는 쪽 옆
        const F = src.F || A.drawn && A.drawn.F || 0;
        let nx = -uy, ny = ux;
        if (ny > 0.2 || (Math.abs(ny) <= 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
        const mid = src.pose === 'push' ? 0.5 : 0.45;
        const lx = ox + dx * mid + nx * 26, ly = oy + dy * mid + ny * 26;
        if (F) pill((src.pose === 'push' ? '미는 힘 ' : '당기는 힘 ') + F + ' N', lx, ly, { color: COL.push, size: 14, fit: true });
      }
    }
    // 그리기 미션: 평가 표시
    if (A.drawMode && A.drawn && !A.drag) {
      const ev = evalDrawn();
      if (ev && ev.all) {
        const hk = cartGeo().hook;
        txt('✔ 정확해요!', hk.x + 48, hk.y - 46, { color: COL.good, size: 15 });
      }
    }
  }

  /* =========================================================
     장면 B · 위에서 본 「매끄러운 얼음판 위 상자」 (2~3단계)
     ========================================================= */
  const BC = { cx: W / 2, cy: 300, half: 40, hook: 48, slots: [-26, 0, 26] };
  const KA = 70;          // 합력 1 N당 가속 (px/s², 시각용)
  const KR = 0.026;       // 작용선이 어긋날 때 회전 (시각용)
  const B = {
    F: [0, 0], lock: [false, false], slot: 1, hy2: 0,
    a: [new AArrow(), new AArrow()], an: new AArrow(),
    st: 'pinned', t: 0, pin: 1, endAt: 0,
    x: BC.cx, y: BC.cy, th: 0, vx: 0, vy: 0, w: 0,
    still: 0, run: null, ghosts: [], gT: 0, scr: [[], []], scrA: 1, ret: null,
    drag: null, rows: [], fresh: -1, appear: 1, sq: new SciSim.Spring(0, { stiffness: 320, damping: 11 }),
    bump: { L: 0, R: 0 }, ticks: 0,
  };
  const net = () => B.F[0] + B.F[1];
  const fmtF = (f) => (f === 0 ? '0 N' : (f > 0 ? '→ ' : '← ') + Math.abs(f) + ' N');
  function netFormula(f1, f2) {
    const a = Math.abs(f1), b = Math.abs(f2), n = Math.abs(f1 + f2);
    if (!a && !b) return '합력 = 0';
    if (!a || !b) return '합력 = ' + (a || b) + ' N';
    if (Math.sign(f1) === Math.sign(f2)) return '합력 = ' + a + ' N + ' + b + ' N = ' + n + ' N';
    return '합력 = ' + Math.max(a, b) + ' N − ' + Math.min(a, b) + ' N = ' + (n ? n + ' N' : '0');
  }
  const toW = (lx, ly) => { const c = Math.cos(B.th), s = Math.sin(B.th); return { x: B.x + lx * c - ly * s, y: B.y + lx * s + ly * c }; };
  function hookLocal(i) { return i === 0 ? { x: -BC.hook, y: 0 } : { x: BC.hook, y: B.hy2 }; }

  function drawRink() {
    ctx.fillStyle = '#cfe3f7'; ctx.fillRect(0, 0, W, H);
    rr(8, 8, W - 16, H - 16, 26);
    const g = ctx.createLinearGradient(0, 8, 0, H - 8);
    g.addColorStop(0, '#f3fbff'); g.addColorStop(1, '#d7eefb');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    [[0.08, 40], [0.3, 18], [0.58, 56], [0.84, 24]].forEach(([fx, w]) => {
      const x = W * fx; ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x + w, 8); ctx.lineTo(x + w - 170, H); ctx.lineTo(x - 170, H); ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(148,186,214,.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(W * 0.22, H * 0.78, 120, 30, -0.1, 0.2, 2.6); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.2, 140, 26, 0.12, 3.4, 5.9); ctx.stroke();
    // 1칸 = 1 N 격자 (고리에 맞춤)
    ctx.strokeStyle = 'rgba(14,116,144,.09)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (BC.cx - BC.hook) % NPX; x < W; x += NPX) { ctx.moveTo(Math.round(x) + 0.5, 8); ctx.lineTo(Math.round(x) + 0.5, H - 8); }
    for (let y = BC.cy % NPX; y < H; y += NPX) { ctx.moveTo(8, Math.round(y) + 0.5); ctx.lineTo(W - 8, Math.round(y) + 0.5); }
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#60a5fa'; rr(8, 8, W - 16, H - 16, 26); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; rr(12, 12, W - 24, H - 24, 22); ctx.stroke();
    pill('1칸 = 1 N', 22, 30, { align: 'left', color: '#0e7490', size: 13 });
    // 범퍼
    bumper(28, B.bump.L, 1); bumper(W - 28, B.bump.R, -1);
  }
  function bumper(x, sq, dir) {
    const w = 16 - sq * 6, h = 132, x0 = dir > 0 ? x - 8 : x + 8 - w;
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, '#fb7185'); g.addColorStop(1, '#be123c');
    ctx.fillStyle = g; rr(x0, BC.cy - h / 2, w, h, 7); ctx.fill();
    ctx.strokeStyle = '#881337'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawCrate(alpha) {
    const h = BC.half;
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.34)'; ctx.shadowBlur = 14; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#b07a43'; rr(-h, -h, 2 * h, 2 * h, 7); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(-h, -h, h, h);
    g.addColorStop(0, '#f2cb92'); g.addColorStop(1, '#c48a4f');
    ctx.fillStyle = g; rr(-h, -h, 2 * h, 2 * h, 7); ctx.fill();
    ctx.save(); rr(-h, -h, 2 * h, 2 * h, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(110,64,24,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-h, -h / 3); ctx.lineTo(h, -h / 3); ctx.moveTo(-h, h / 3); ctx.lineTo(h, h / 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,72,30,.26)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let r = 0; r < 3; r++) {
      const y0 = -h + (r + 0.5) * (2 * h / 3);
      for (let s = -1; s <= 1; s += 2) {
        for (let xx = -h; xx <= h; xx += 8) { const yy = y0 + s * 5 + Math.sin(xx * 0.09 + r * 2 + s) * 2.2; if (xx === -h) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 3; rr(-h, -h, 2 * h, 2 * h, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-h + 5, h - 9); ctx.lineTo(-h + 5, -h + 5); ctx.lineTo(h - 9, -h + 5); ctx.stroke();
    ctx.fillStyle = '#6b7280';
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * (h - 8), b * (h - 8), 2.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  function drawHookB(i) {
    const hk = hookLocal(i), side = i === 0 ? -1 : 1;
    ctx.fillStyle = '#94a3b8'; rr(side * BC.half - 3, hk.y - 6, 6, 12, 2); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(side * (BC.half + 2), hk.y); ctx.lineTo(hk.x - side * 6.5, hk.y); ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(hk.x, hk.y, 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(hk.x, hk.y, 6.5, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  }
  function drawPin(p) {
    if (p <= 0.01) return;
    const lift = 1 - p;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 1.5);
    softShadow(3 + lift * 12, 4 + lift * 12, 11 + lift * 5, 8, 0.35);
    const r = 9 * (1 + lift * 0.7);
    D.sphere(0, -lift * 20, r, '#ef4444', {});
    ctx.restore();
  }
  function knob(x, y, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = o.locked ? '#94a3b8' : COL.push; ctx.stroke();
    ctx.fillStyle = o.locked ? '#94a3b8' : '#c2410c';
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 3, y - 4.5); ctx.lineTo(x - 3, y + 4.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 3, y - 4.5); ctx.lineTo(x + 3, y + 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function knobPos(i) {
    const hk = hookLocal(i), f = B.F[i], side = i === 0 ? -1 : 1;
    if (!f) return { x: hk.x + side * 30, y: hk.y };
    const pull = i === 0 ? f < 0 : f > 0;
    return { x: hk.x + f * NPX + Math.sign(f) * (pull ? 20 : 15), y: hk.y };
  }
  function drawSceneB(dt) {
    drawRink();
    // 긁힘 자국
    ctx.save(); ctx.globalAlpha = B.scrA; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    B.scr.forEach((path) => {
      if (path.length < 2) return;
      ctx.strokeStyle = 'rgba(125,170,205,.5)'; ctx.lineWidth = 2.4; ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 1) : ctx.moveTo(p.x, p.y + 1))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4; ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    });
    ctx.restore();
    // 작용선 (3단계)
    if (on('line')) drawLines();
    // 잔상
    B.ghosts.forEach((g) => {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.th);
      ctx.strokeStyle = 'rgba(124,74,28,' + (0.32 * g.a).toFixed(3) + ')'; ctx.lineWidth = 2; rr(-BC.half, -BC.half, BC.half * 2, BC.half * 2, 7); ctx.stroke();
      ctx.restore();
    });
    // 상자 + 힘 (상자와 함께 회전)
    const ap = B.appear < 1 ? EASE.outBack(B.appear) : 1;
    ctx.save();
    ctx.translate(B.x, B.y); ctx.rotate(B.th);
    const sq = B.sq.value;
    ctx.save(); ctx.scale((1 - sq * 0.14) * ap, (1 + sq * 0.08) * ap);
    drawCrate();
    drawHookB(0); drawHookB(1);
    drawPin(B.pin);
    ctx.restore();
    if (on('line') && B.st === 'pinned') {
      BC.slots.forEach((sy, k) => {
        if (k === B.slot) return;
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(BC.hook, sy, 7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      });
      const m = game && game.current();
      if (m && game.isActive(m) && m.key === 'B5' && B.slot === 1) D.ring(BC.hook, BC.slots[0], 10, NOW(), { color: '#16a34a', width: 2 });
    }
    for (let i = 0; i < 2; i++) {
      const a = B.a[i];
      if (!a.shown) continue;
      const hk = hookLocal(i), dx = a.dx * a.k;
      if (Math.abs(dx) < 2) continue;
      const pull = i === 0 ? dx < 0 : dx > 0;
      drawHandForce(hk.x, hk.y, dx, 0, { pose: pull ? 'pull' : 'push', locked: B.lock[i] });
    }
    ctx.restore();
    // 손잡이 (핀이 꽂혀 있을 때만)
    if (B.st === 'pinned' && on('twoForces')) {
      for (let i = 0; i < 2; i++) {
        const kp = knobPos(i), wp = toW(kp.x, kp.y);
        knob(wp.x, wp.y, { locked: B.lock[i] });
        const m = game && game.current();
        if (m && game.isActive(m) && !B.lock[i] && (m.key === 'B1' || m.key === 'B2' || m.key === 'B4') && B.F[i] === 0) D.ring(wp.x, wp.y, 16, NOW(), { color: COL.push, width: 2 });
      }
      if (B.drag && B.drag.mode === 'mag') drawTicks(B.drag.i);
    }
    // 힘 값 pill (회전과 무관하게 바로 세움)
    for (let i = 0; i < 2; i++) {
      const hk = hookLocal(i), f = B.F[i], side = i === 0 ? -1 : 1;
      let lx, ly = hk.y + 30;
      if (!f) lx = hk.x + side * 30;
      else {
        const pull = i === 0 ? f < 0 : f > 0;
        lx = pull ? hk.x + f * NPX / 2 : hk.x - Math.sign(f) * 44;
      }
      const wp = toW(lx, ly);
      pill('힘' + (i + 1) + ' ' + Math.abs(f) + ' N' + (B.lock[i] ? ' 🔒' : ''), wp.x, wp.y, { color: COL.push, size: 14, alpha: f ? 1 : 0.7, fit: true });
    }
    // 합력 화살표
    if (on('net')) drawNetB();
    if (isNew('twoForces') && B.st === 'pinned') { const kp = toW(knobPos(1).x, 0); newTag(kp.x - 16, kp.y - 16, 32, 32); }
    // 정지 타이머
    if (B.st === 'free' && net() === 0 && Math.abs(B.hy2 * B.F[1]) < 1e-6 && !B.run.still) {
      const p = Math.min(1, B.still / 2);
      ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(22,163,74,.25)';
      ctx.beginPath(); ctx.arc(B.x, B.y, BC.half + 20, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = COL.good; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(B.x, B.y, BC.half + 20, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke(); ctx.restore();
      txt('⏱ ' + B.still.toFixed(1) + '초', B.x, B.y + BC.half + 40, { color: COL.good, size: 14 });
    }
  }
  function drawLines() {
    const f1 = B.F[0], f2 = B.F[1];
    if (!f1 && !f2) return;
    ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.th);
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2;
    const same = Math.abs(B.hy2) < 1 && f1 && f2;
    [[f1, 0], [f2, B.hy2]].forEach(([f, y]) => {
      if (!f) return;
      ctx.strokeStyle = same ? 'rgba(22,163,74,.55)' : 'rgba(234,88,12,.45)';
      ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
    });
    ctx.restore();
    if (f1 && f2 && B.st === 'pinned') {
      const p = toW(-BC.hook - 150, Math.min(0, B.hy2) - 16);
      txt(same ? '같은 작용선' : '작용선이 달라요', clamp(p.x, 90, W - 90), p.y, { color: same ? COL.good : '#c2410c', size: 13 });
    }
  }
  function drawTicks(i) {
    const hk = toW(hookLocal(i).x, hookLocal(i).y), dir = i === 0 ? -1 : 1;
    ctx.save();
    for (let n = -6; n <= 6; n++) {
      const x = hk.x + n * NPX;
      if (x < 16 || x > W - 16) continue;
      ctx.strokeStyle = n === 0 ? 'rgba(71,85,105,.7)' : 'rgba(234,88,12,.45)'; ctx.lineWidth = n === 0 ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(x, hk.y - 22); ctx.lineTo(x, hk.y - 14); ctx.stroke();
      if (n && n % 2 === 0 && Math.sign(n) === dir) txt(Math.abs(n) + '', x, hk.y - 30, { size: 13, color: '#9a3412' });
    }
    ctx.restore();
  }
  function drawNetB() {
    const f = net(), ox = B.x, oy = B.y - BC.half - 52;
    const a = B.an, k = a.k;
    const c = Math.cos(B.th), s = Math.sin(B.th);
    const dx = a.dx * k * c, dy = a.dx * k * s;
    if (a.shown && Math.abs(a.dx * k) > 2) forceArrow(ox, oy, dx, dy, COL.net, { width: 9, head: 20, glow: true });
    else appDot(ox, oy, COL.net);
    const strF = netFormula(B.F[0], B.F[1]);
    pill(strF, ox, oy - 34, { solid: true, color: COL.net, size: 15, fit: true });
    if (f) pill('합력 ' + Math.abs(f) + ' N', ox + dx + Math.sign(f) * 52, oy, { color: COL.net, size: 13, fit: true });
    if (isNew('net')) newTag(ox - 90, oy - 50, 180, 64);
  }
  function stepB(dt) {
    B.a[0].update(dt); B.a[1].update(dt); B.an.update(dt);
    B.a[0].set(B.F[0] * NPX, 0); B.a[1].set(B.F[1] * NPX, 0); B.an.set(net() * NPX, 0);
    B.hy2 = SciSim.approach(B.hy2, BC.slots[B.slot], dt, 18);
    B.sq.update(dt);
    B.appear = Math.min(1, B.appear + dt / 0.5);
    B.bump.L = Math.max(0, B.bump.L - dt * 4); B.bump.R = Math.max(0, B.bump.R - dt * 4);
    for (let i = B.ghosts.length - 1; i >= 0; i--) { B.ghosts[i].a -= dt / 0.45; if (B.ghosts[i].a <= 0) B.ghosts.splice(i, 1); }
    if (B.st === 'pinned' && B.scrA > 0 && !B.scr[0].length) B.scrA = 1;
    if (B.st === 'pull') {
      B.t += dt;
      B.pin = 1 - EASE.outQuad(Math.min(1, B.t / 0.2));
      if (B.t >= 0.2) { B.st = 'free'; B.t = 0; B.pin = 0; }
    } else if (B.st === 'free') {
      B.t += dt;
      const nf = net(), tau = -B.hy2 * B.F[1];
      if (nf === 0 && Math.abs(tau) < 1e-6) {
        B.still += dt;
        if (B.still >= 2 && !B.run.still) {
          B.run.still = true; B.endAt = B.t + 1;
          badge('그대로 정지 ✔  합력 = 0', B.x, B.y + BC.half + 64, COL.good);
          Sound.tick();
        }
        if (B.run.still && B.t >= B.endAt) startReturn();
      } else {
        const c = Math.cos(B.th), s = Math.sin(B.th);
        B.vx += KA * nf * c * dt; B.vy += KA * nf * s * dt;
        B.x += B.vx * dt; B.y += B.vy * dt;
        B.w += KR * tau * dt; B.th += B.w * dt;
        B.run.moved = Math.max(B.run.moved, Math.hypot(B.x - BC.cx, B.y - BC.cy));
        B.gT += dt;
        if (B.gT > 0.09) {
          B.gT = 0;
          B.ghosts.push({ x: B.x, y: B.y, th: B.th, a: 1 });
          if (B.ghosts.length > 6) B.ghosts.shift();
          [-1, 1].forEach((s2, k) => { const p = toW(-Math.sign(nf || 1) * 26, s2 * 24); B.scr[k].push(p); if (B.scr[k].length > 80) B.scr[k].shift(); });
        }
        const sp = Math.hypot(B.vx, B.vy);
        if (sp > 40 && Math.random() < 0.5 && !RM) {
          const p = toW(-Math.sign(nf || 1) * BC.half, (Math.random() - 0.5) * 60);
          FX.emit({ x: p.x, y: p.y, vx: -B.vx * 0.12 + (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.45, size: 1.6 + Math.random() * 1.8, color: '#ffffff', gravity: 0, drag: 2 });
        }
        if (nf === 0 && B.t >= 1.6 && !B.run.rot) {
          B.run.rot = true; B.endAt = B.t + 0.7;
          badge('상자가 돌아가요 → 평형이 아니에요', B.x, B.y + BC.half + 78, COL.warn, 2.8);
          Sound.fail();
        }
        if (B.run.rot && B.t >= B.endAt) { startReturn(); return; }
        const ext = BC.half * (Math.abs(Math.cos(B.th)) + Math.abs(Math.sin(B.th)));
        if (B.x + ext >= W - 36) { B.x = W - 36 - ext; bumpBox('R'); }
        else if (B.x - ext <= 36) { B.x = 36 + ext; bumpBox('L'); }
        else if (B.y - ext <= 14 || B.y + ext >= H - 14) bumpBox('');
        else if (B.t > 4.5) startReturn();
      }
    } else if (B.st === 'bump') {
      B.t += dt;
      if (B.t > 0.5) startReturn();
    } else if (B.st === 'ret') {
      B.t += dt;
      const p = Math.min(1, B.t / 0.6), e = EASE.inOutCubic(p), r = B.ret;
      B.x = r.x + (BC.cx - r.x) * e; B.y = r.y + (BC.cy - r.y) * e; B.th = r.th * (1 - e);
      B.scrA = 1 - p;
      if (p >= 1) { B.st = 'pinIn'; B.t = 0; B.th = 0; B.scr = [[], []]; }
    } else if (B.st === 'pinIn') {
      B.t += dt;
      B.pin = Math.min(1, EASE.outBack(Math.min(1, B.t / 0.3)));
      if (B.t >= 0.3) { B.st = 'pinned'; B.pin = 1; updatePinBtn(); }
    }
  }
  function bumpBox(side) {
    B.st = 'bump'; B.t = 0;
    B.vx = B.vy = B.w = 0;
    if (side) B.bump[side] = 1;
    B.sq.velocity = 5;
    Sound.tone(140, 0.16, 'sine', 0.16);
  }
  function startReturn() {
    B.st = 'ret'; B.t = 0;
    let th = B.th % (Math.PI * 2);
    if (th > Math.PI) th -= Math.PI * 2; if (th < -Math.PI) th += Math.PI * 2;
    B.ret = { x: B.x, y: B.y, th };
    B.th = th; B.vx = B.vy = B.w = 0;
  }
  function pullPin() {
    if (B.st !== 'pinned' || scene !== 'B') return;
    B.st = 'pull'; B.t = 0; B.still = 0; B.vx = B.vy = B.w = 0; B.gT = 0;
    B.scr = [[], []]; B.scrA = 1; B.ghosts = [];
    B.run = { F1: B.F[0], F2: B.F[1], slot: B.slot, still: false, rot: false, moved: 0 };
    Sound.tone(900, 0.06, 'triangle', 0.09);
    hideHint();
    addRow(B.F[0], B.F[1]);
    updatePinBtn();
  }
  function updatePinBtn() { $('#pinBtn').disabled = B.st !== 'pinned'; $('#zeroBtn').disabled = B.st !== 'pinned'; }
  function setF(i, f, quiet) {
    f = clamp(Math.round(f), -6, 6);
    if (B.F[i] === f) return;
    B.F[i] = f;
    if (!quiet) Sound.tick();
  }
  function handleB(p) {
    if (B.st !== 'pinned') return null;
    let best = null;
    for (let i = 0; i < 2; i++) {
      const kp = knobPos(i), d = Math.hypot(p.x - (B.x + kp.x), p.y - (B.y + kp.y));
      if (d < 32 && (!best || d < best.d)) best = { i, d, mode: 'mag' };
    }
    if (best) return best;
    for (let i = 0; i < 2; i++) {
      const hk = hookLocal(i), hx = B.x + hk.x, hy = B.y + hk.y;
      if (Math.hypot(p.x - hx, p.y - hy) < 24) return { i, mode: i === 1 && on('line') ? 'pend' : 'mag' };
      const f = B.F[i];
      if (f) {
        const x1 = Math.min(hx, hx + f * NPX), x2 = Math.max(hx, hx + f * NPX);
        if (p.x >= x1 - 8 && p.x <= x2 + 30 && Math.abs(p.y - hy) < 20) return { i, mode: 'mag' };
      }
    }
    return null;
  }
  function dragMoveB(p) {
    const d = B.drag;
    if (d.mode === 'pend') {
      const dx = p.x - d.sx, dy = p.y - d.sy;
      if (Math.hypot(dx, dy) < 8) return;
      d.mode = Math.abs(dy) > Math.abs(dx) ? 'slot' : 'mag';
    }
    if (d.mode === 'slot') {
      let k = 0, best = 1e9;
      BC.slots.forEach((sy, j) => { const dd = Math.abs(p.y - (BC.cy + sy)); if (dd < best) { best = dd; k = j; } });
      if (k !== B.slot) { B.slot = k; Sound.tick(); }
      return;
    }
    if (B.lock[d.i]) {
      if (!d.warned) { d.warned = true; toast('🔒 왼쪽 힘은 4 N으로 잠겨 있어요. 오른쪽 힘을 조절해 보세요.'); Sound.fail(); }
      return;
    }
    const hk = hookLocal(d.i);
    setF(d.i, (p.x - (BC.cx + hk.x)) / NPX);
  }

  /* ---------- 실험 결과 표 ---------- */
  function addRow(f1, f2) {
    const i = B.rows.findIndex((r) => r.f1 === f1 && r.f2 === f2);
    const row = { f1, f2, n: f1 + f2 };
    if (i >= 0) { B.rows[i] = row; B.fresh = i; }
    else { if (B.rows.length >= 6) B.rows.shift(); B.rows.push(row); B.fresh = B.rows.length - 1; }
    renderTable();
  }
  function renderTable() {
    const cols = Math.max(4, B.rows.length);
    const r1 = $('#rowF1'), r2 = $('#rowF2'), rn = $('#rowN');
    r1.innerHTML = '<th>힘1 (왼쪽 고리)</th>'; r2.innerHTML = '<th>힘2 (오른쪽 고리)</th>'; rn.innerHTML = '<th>합력</th>';
    for (let i = 0; i < cols; i++) {
      const d = B.rows[i], cls = d ? (i === B.fresh ? 'fresh' : '') : 'empty';
      r1.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? fmtF(d.f1) : '·') + '</td>');
      r2.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? fmtF(d.f2) : '·') + '</td>');
      rn.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? fmtF(d.n) : '·') + '</td>');
    }
    $('#dataN').textContent = '기록 ' + B.rows.length + '개';
  }

  /* =========================================================
     장면 T · 위에서 본 줄다리기 (4단계) — 1칸 = 100 N
     ========================================================= */
  const TGX = { cx: W / 2, ry: 352, gap: PHONE ? 40 : 48, first: PHONE ? 92 : 116 };
  const KT = 0.45;                    // 합력 1 N당 깃발 가속(px/s², 시각용)
  const TG = {
    n: 1, st: 'ready', t: 0, xo: 0, v: 0, tie: 0, tieDone: false, from: 0,
    aL: new AArrow(), aR: new AArrow(), aN: new AArrow(),
    pop: [0, 1, 2, 3, 4].map((k) => new SciSim.Spring(k < 1 ? 1 : 0, { stiffness: 260, damping: 15 })),
  };
  const kidX = (team, i) => TGX.cx + team * (TGX.first + i * TGX.gap);
  const kidSide = (i) => (i % 2 === 0 ? -1 : 1);
  const tugNet = () => TG.n * 100 - 300;
  function drawField() {
    ctx.fillStyle = '#86c97a'; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 80) { ctx.fillStyle = (x / 80) % 2 ? 'rgba(255,255,255,.07)' : 'rgba(20,83,45,.05)'; ctx.fillRect(x, 0, 80, H); }
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,40,0,.1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 가운데 선과 승부 선
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(TGX.cx - 2.5, 200, 5, H - 220);
    ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(TGX.cx + s * 84, 214); ctx.lineTo(TGX.cx + s * 84, H - 20); ctx.stroke(); });
    ctx.restore();
    // 1칸 = 100 N 눈금판
    const gx0 = TGX.cx - 7 * TPX, gx1 = TGX.cx + 7 * TPX, gy0 = 40, gy1 = 196;
    ctx.fillStyle = 'rgba(255,255,255,.78)'; rr(gx0 - 8, gy0 - 10, gx1 - gx0 + 16, gy1 - gy0 + 16, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = gx0; x <= gx1 + 0.1; x += TPX) { ctx.moveTo(x + 0.5, gy0); ctx.lineTo(x + 0.5, gy1); }
    for (let y = gy0; y <= gy1 + 0.1; y += TPX) { ctx.moveTo(gx0, y + 0.5); ctx.lineTo(gx1, y + 0.5); }
    ctx.stroke();
    pill('1칸 = 100 N', gx0 - 2, gy0 - 2, { align: 'left', color: '#3b82f6', size: 13 });
  }
  function drawRope(xo) {
    const x1 = kidX(-1, 2) - 46 + xo, x2 = kidX(1, 4) + 46 + xo, y = TGX.ry;
    ctx.save(); ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = '#b8864b'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(120,80,30,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = x1 + 4; x < x2 - 4; x += 7) { ctx.moveTo(x, y + 4.5); ctx.lineTo(x + 5, y - 4.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y - 2.5); ctx.lineTo(x2, y - 2.5); ctx.stroke();
    ctx.restore();
    // 깃발 (줄 가운데)
    const fx = TGX.cx + xo;
    ctx.save();
    ctx.fillStyle = '#ef4444'; rr(fx - 5, y - 9, 10, 18, 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - 3, y + 7); ctx.quadraticCurveTo(fx - 12, y + 22, fx - 6, y + 34); ctx.lineTo(fx + 1, y + 20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx + 3, y + 7); ctx.quadraticCurveTo(fx + 13, y + 20, fx + 9, y + 33); ctx.lineTo(fx + 1, y + 20); ctx.closePath(); ctx.fillStyle = '#dc2626'; ctx.fill();
    ctx.restore();
  }
  function drawKid(x, y, team, i, alpha, sc, t) {
    if (alpha <= 0.01) return;
    const side = kidSide(i), dir = team;           // dir: 당기는 방향
    const effort = TG.st === 'run' || TG.st === 'tie' ? 1 : 0.35;
    const jig = RM ? 0 : Math.sin(t * 9 + i * 1.7 + team) * 1.6 * effort;
    const lean = dir * (8 + 5 * effort) + jig;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(sc, sc);
    const bx = lean, by = side * 19;
    softShadow(bx + 5, by + 6, 22, 15, 0.26);
    // 발
    ctx.fillStyle = '#334155';
    [-7, 7].forEach((o) => { ctx.beginPath(); ctx.ellipse(bx - dir * 18, by + o, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); });
    // 팔 (어깨 → 줄)
    ctx.strokeStyle = '#f1c39b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by - side * 11); ctx.lineTo(-dir * 10, 0); ctx.moveTo(bx, by + side * 6); ctx.lineTo(-dir * 1, 0); ctx.stroke();
    // 몸 (어깨)
    const shirt = team < 0 ? ['#60a5fa', '#2563eb'] : ['#fde047', '#eab308'];
    const g = ctx.createLinearGradient(bx - 12, by - 16, bx + 12, by + 16);
    g.addColorStop(0, shirt[0]); g.addColorStop(1, shirt[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, 12, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 손 (줄을 잡음)
    ctx.fillStyle = '#f1c39b';
    [-dir * 10, -dir * 1].forEach((hx) => { ctx.beginPath(); ctx.arc(hx, 0, 4.2, 0, Math.PI * 2); ctx.fill(); });
    // 머리 (위에서 보면 머리카락)
    D.sphere(bx - dir * 1.5, by, 9.5, ['#3b2a1e', '#5b3a24', '#1f2937', '#7c4a2a', '#2b2118'][(i + (team > 0 ? 2 : 0)) % 5], { gloss: true });
    ctx.restore();
  }
  function drawSceneT() {
    drawField();
    const t = NOW(), xo = TG.xo;
    drawRope(xo);
    for (let i = 0; i < 3; i++) drawKid(kidX(-1, i) + xo, TGX.ry, -1, i, 1, 1, t);
    for (let k = 0; k < 5; k++) {
      const p = clamp(TG.pop[k].value, 0, 1.3), x = kidX(1, k) + xo, y = TGX.ry + kidSide(k) * 19;
      if (k >= TG.n && TG.st === 'ready') {
        ctx.save(); ctx.globalAlpha = 0.9 * (1 - Math.min(1, p));
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        txt('+', x, y + 1, { color: '#fff', size: 20, halo: 'rgba(22,101,52,.6)' });
        ctx.restore();
      }
      drawKid(kidX(1, k) + xo, TGX.ry, 1, k, Math.min(1, p), 0.6 + 0.4 * p, t);
    }
    const m = game && game.current();
    if (m && game.isActive(m) && m.key === 'T1' && TG.st === 'ready' && TG.n !== 3) {
      const k = TG.n < 3 ? TG.n : TG.n - 1;
      D.ring(kidX(1, k), TGX.ry + kidSide(k) * 19, 20, t, { color: '#fde047', width: 2.5 });
    }
    // 두 팀이 당기는 힘 (깃발에서 시작, 같은 작용선)
    const fx = TGX.cx + xo, ay = 150;
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, ay + 8); ctx.lineTo(fx, TGX.ry - 12); ctx.stroke(); ctx.restore();
    const kL = TG.aL.k, kR = TG.aR.k;
    if (TG.aL.shown) forceArrow(fx, ay, TG.aL.dx * kL, 0, COL.push, {});
    if (TG.aR.shown) forceArrow(fx, ay, TG.aR.dx * kR, 0, COL.push, {});
    pill('왼쪽 팀 300 N', fx - 3 * TPX / 2, ay + 30, { color: COL.push, size: 14, fit: true });
    pill('오른쪽 팀 ' + TG.n * 100 + ' N', fx + TG.n * TPX / 2 + 8, ay - 28, { color: COL.push, size: 14, fit: true });
    // 합력
    if (on('net')) {
      const ny = 74, nf = tugNet();
      if (TG.aN.shown && Math.abs(TG.aN.dx * TG.aN.k) > 2) forceArrow(fx, ny, TG.aN.dx * TG.aN.k, 0, COL.net, { width: 9, head: 20, glow: true });
      else appDot(fx, ny, COL.net);
      const a = Math.max(TG.n * 100, 300), b = Math.min(TG.n * 100, 300);
      pill(nf ? '합력 = ' + a + ' N − ' + b + ' N = ' + Math.abs(nf) + ' N' : '합력 = 300 N − 300 N = 0', fx, ny - 30, { solid: true, color: COL.net, size: 14, fit: true });
    }
  }
  function stepT(dt) {
    TG.aL.update(dt); TG.aR.update(dt); TG.aN.update(dt);
    TG.aL.set(-3 * TPX, 0); TG.aR.set(TG.n * TPX, 0); TG.aN.set(tugNet() / 100 * TPX, 0);
    TG.pop.forEach((s, k) => { s.target = k < TG.n ? 1 : 0; s.update(dt); });
    if (TG.st === 'run') {
      TG.t += dt;
      const nf = tugNet();
      if (nf === 0) {
        TG.tie += dt;
        TG.xo = RM ? 0 : Math.sin(TG.t * 7) * 1.2;
        if (TG.tie >= 2) {
          TG.st = 'tie'; TG.t = 0; TG.tieDone = true; TG.xo = 0;
          badge('깃발이 가운데에 그대로! 두 힘이 평형 ✔', TGX.cx, TGX.ry + 112, COL.good, 2.6);
          Sound.tick(); updateTugBtns();
        }
      } else {
        TG.v += KT * nf * dt; TG.xo += TG.v * dt;
        if (Math.abs(TG.xo) >= 84) {
          TG.xo = Math.sign(TG.xo) * 84; TG.st = 'over'; TG.t = 0;
          badge(nf > 0 ? '깃발이 오른쪽으로 끌려갔어요 (합력 → ' + nf + ' N)' : '깃발이 왼쪽으로 끌려갔어요 (합력 ← ' + (-nf) + ' N)', TGX.cx, TGX.ry + 112, COL.warn, 2.4);
          Sound.fail();
        }
      }
    } else if (TG.st === 'tie') {
      TG.t += dt;
      if (TG.t > 1.2) { TG.st = 'ready'; updateTugBtns(); }
    } else if (TG.st === 'over') {
      TG.t += dt;
      if (TG.t > 1.3) { TG.st = 'back'; TG.t = 0; TG.from = TG.xo; }
    } else if (TG.st === 'back') {
      TG.t += dt;
      const p = Math.min(1, TG.t / 0.6);
      TG.xo = TG.from * (1 - EASE.inOutCubic(p));
      if (p >= 1) { TG.st = 'ready'; TG.xo = 0; TG.v = 0; updateTugBtns(); }
    }
  }
  function setKids(n) {
    n = clamp(n, 1, 5);
    if (n === TG.n || TG.st !== 'ready') return;
    TG.n = n; Sound.tick();
    $('#kidN').textContent = n + '명';
    hideHint(); updateTugBtns();
  }
  function startTug() {
    if (TG.st !== 'ready') return;
    TG.st = 'run'; TG.t = 0; TG.tie = 0; TG.v = 0; TG.xo = 0;
    Sound.click(); hideHint(); updateTugBtns();
  }
  function updateTugBtns() {
    const busy = TG.st !== 'ready';
    $('#kidMinus').disabled = busy || TG.n <= 1;
    $('#kidPlus').disabled = busy || TG.n >= 5;
    $('#tugBtn').disabled = busy;
    $('#kidN').textContent = TG.n + '명';
  }
  function hitT(p) {
    if (TG.st !== 'ready') return null;
    for (let k = 0; k < 5; k++) {
      const x = kidX(1, k), y = TGX.ry + kidSide(k) * 19;
      if (Math.hypot(p.x - x, p.y - y) < 26) return { k };
    }
    return null;
  }

  /* =========================================================
     장면 전환 · 입력 · 측정값
     ========================================================= */
  let scene = 'A';
  const trans = { t: 1 };
  const SCENE_LABEL = {
    A: '🧪 힘 실험대 <small>(옆에서 본 모습)</small>',
    B: '🧊 얼음판 위의 상자 <small>(위에서 본 모습)</small>',
    T: '🪢 줄다리기 <small>(위에서 본 모습)</small>',
  };
  function setScene(s) {
    const changed = s !== scene;
    scene = s;
    if (changed) { trans.t = RM ? 1 : 0; if (s === 'B') B.appear = 0; if (s === 'T') TG.pop.forEach((sp, k) => { sp.value = 0; sp.velocity = 0; }); }
    $('#sceneLabel').innerHTML = SCENE_LABEL[s];
    $('#roA').classList.toggle('off', s !== 'A');
    $('#roT').classList.toggle('off', s !== 'T');
    $('#ctrlB').classList.toggle('off', s !== 'B');
    $('#ctrlT').classList.toggle('off', s !== 'T');
    $('#ctrlCard').hidden = s === 'A';
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === s));
    syncDom();
  }
  let dataShown = false;
  function syncDom() {
    const show = scene === 'B' && on('record');
    const dc = $('#dataCard');
    if (show !== dataShown) {
      dataShown = show;
      dc.classList.toggle('off', !show);
      if (show && isNew('record')) { dc.classList.remove('feature-new'); void dc.offsetWidth; dc.classList.add('feature-new'); setTimeout(() => dc.classList.remove('feature-new'), 4600); }
    }
    const seg = $('#sceneSeg'), free = !!(game && game.free);
    if (seg.hidden === free) seg.hidden = !free;
    updatePinBtn(); updateTugBtns();
  }
  const LEVEL_SCENE = ['A', 'B', 'B', 'T'];
  function ensureScene(li) { setScene(LEVEL_SCENE[li] || 'A'); }

  function resetA() {
    A.clay.pts = clayRest(); A.clay.to = null;
    const c = A.cart; c.x = AX.home; c.st = 'idle'; c.vT = 0; c.hist = [];
    A.drawn = null; A.info = null; A.rel = null; A.drag = null; A.arrow.jump(0, 0);
  }
  function resetB(keepLocked) {
    for (let i = 0; i < 2; i++) if (!(keepLocked && B.lock[i])) B.F[i] = 0;
    if (!keepLocked) B.lock = [false, false];
    B.slot = 1; B.st = 'pinned'; B.pin = 1; B.x = BC.cx; B.y = BC.cy; B.th = 0; B.vx = B.vy = B.w = 0;
    B.scr = [[], []]; B.ghosts = []; B.drag = null; B.run = null; B.still = 0;
    updatePinBtn();
  }
  function resetT() { TG.n = 1; TG.st = 'ready'; TG.xo = 0; TG.v = 0; TG.tie = 0; updateTugBtns(); }

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  SciSim.pointer(view, {
    hover(p) {
      if (scene === 'A') return hitA(p) ? 'grab' : null;
      if (scene === 'B') { const h = handleB(p); return h ? (h.mode === 'pend' ? 'move' : 'ew-resize') : null; }
      return hitT(p) ? 'pointer' : null;
    },
    down(p) {
      if (scene === 'A') {
        if (!on('push')) return false;
        const h = hitA(p);
        if (!h) return false;
        if (A.drawMode) A.drawn = null;
        A.drag = Object.assign(h, { F: 0, ux: 1, uy: 0, pose: 'pull' });
        A.info = A.drag; A.arrow.jump(0, 0); A.rel = null;
        Sound.tick(); hideHint();
        return true;
      }
      if (scene === 'B') {
        if (!on('twoForces')) return false;
        const h = handleB(p);
        if (!h) return false;
        B.drag = { i: h.i, mode: h.mode, sx: p.x, sy: p.y };
        hideHint();
        return true;
      }
      const h = hitT(p);
      if (!h) return false;
      setKids(h.k < TG.n ? TG.n - 1 : TG.n + 1);
      return false;
    },
    move(p) {
      if (scene === 'A' && A.drag) dragMoveA(p);
      else if (scene === 'B' && B.drag) dragMoveB(p);
    },
    up() {
      if (scene === 'A') dragEndA();
      else if (scene === 'B') B.drag = null;
    },
  });
  // 휴대폰: 물체를 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      const p = view.toLocal(tc);
      const hit = scene === 'A' ? hitA(p) : scene === 'B' ? handleB(p) : hitT(p);
      if (hit) e.preventDefault();
    }, { passive: false });
  }

  $('#pinBtn').addEventListener('click', () => { pullPin(); });
  $('#zeroBtn').addEventListener('click', () => { Sound.click(); if (B.st !== 'pinned') return; for (let i = 0; i < 2; i++) if (!B.lock[i]) B.F[i] = 0; B.slot = 1; });
  $('#kidMinus').addEventListener('click', () => setKids(TG.n - 1));
  $('#kidPlus').addEventListener('click', () => setKids(TG.n + 1));
  $('#tugBtn').addEventListener('click', startTug);
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'A') resetA();
    else if (scene === 'B') { if (B.st === 'pinned' || B.st === 'free') resetB(true); }
    else if (TG.st === 'ready') resetT();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (scene === 'A') {
      const d = A.drag || A.drawn || A.info;
      $('#rP').textContent = d ? d.part : '—';
      $('#rD').textContent = d && d.F ? dirWord(d.ux, d.uy) : '—';
      $('#rF').innerHTML = (d && d.F ? d.F : 0) + '<small>N</small>';
    } else if (scene === 'T') {
      const nf = tugNet();
      $('#rTR').innerHTML = TG.n * 100 + '<small>N</small>';
      $('#rTN').innerHTML = (nf === 0 ? '0' : (nf > 0 ? '→ ' : '← ') + Math.abs(nf)) + '<small>N</small>';
    }
  }

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const svgArrow = (x1, y, x2, color, w) => {
    const dir = x2 > x1 ? 1 : -1, hx = x2 - dir * 16;
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + hx + '" y2="' + y + '" stroke="' + color + '" stroke-width="' + (w || 7) + '" stroke-linecap="round"/>' +
      '<path d="M' + x2 + ' ' + y + ' L' + hx + ' ' + (y - 10) + ' L' + hx + ' ' + (y + 10) + ' Z" fill="' + color + '"/>';
  };
  const SVG_THREE = '<svg viewBox="0 0 320 112" width="320" role="img" aria-label="힘을 나타내는 화살표의 세 요소" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="8" y="44" width="70" height="38" rx="8" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2"/>' +
    '<circle cx="26" cy="90" r="9" fill="#1f2937"/><circle cx="60" cy="90" r="9" fill="#1f2937"/>' +
    svgArrow(78, 63, 254, '#f97316') +
    '<circle cx="78" cy="63" r="5" fill="#9a3412" stroke="#fff" stroke-width="2"/>' +
    '<path d="M78 34 V27 H254 V34" fill="none" stroke="#64748b" stroke-width="1.6"/>' +
    '<text x="166" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">③ 크기 = 화살표의 길이 (1칸 = 1 N)</text>' +
    '<text x="86" y="104" font-size="13" font-weight="800" fill="#9a3412">① 작용점 = 시작점</text>' +
    '<text x="300" y="68" text-anchor="end" font-size="13" font-weight="800" fill="#c2410c">②</text>' +
    '<text x="300" y="86" text-anchor="end" font-size="13" font-weight="800" fill="#c2410c">방향</text></svg>';
  const SVG_NET = '<svg viewBox="0 0 320 120" width="320" role="img" aria-label="같은 방향과 반대 방향인 두 힘의 합력" style="max-width:100%" ' + SVGF + '>' +
    '<text x="4" y="22" font-size="13" font-weight="800" fill="#334155">같은 방향</text>' +
    svgArrow(14, 42, 50, '#f97316', 6) + svgArrow(54, 42, 104, '#f97316', 6) +
    '<text x="122" y="47" font-size="16" font-weight="800" fill="#334155">=</text>' + svgArrow(144, 42, 224, '#7c3aed', 8) +
    '<text x="232" y="47" font-size="13" font-weight="800" fill="#6d28d9">2 N + 3 N = 5 N</text>' +
    '<text x="4" y="78" font-size="13" font-weight="800" fill="#334155">반대 방향</text>' +
    svgArrow(54, 98, 22, '#f97316', 6) + svgArrow(54, 98, 124, '#f97316', 6) +
    '<text x="134" y="103" font-size="16" font-weight="800" fill="#334155">=</text>' + svgArrow(156, 98, 204, '#7c3aed', 8) +
    '<text x="214" y="103" font-size="13" font-weight="800" fill="#6d28d9">5 N − 2 N = 3 N</text></svg>';
  const SVG_EQ = '<svg viewBox="0 0 320 92" width="320" role="img" aria-label="크기가 같고 방향이 반대이며 같은 작용선 위에 있는 두 힘" style="max-width:100%" ' + SVGF + '>' +
    '<line x1="0" y1="44" x2="320" y2="44" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 5"/>' +
    '<rect x="135" y="20" width="50" height="48" rx="7" fill="#e7b97c" stroke="#7c4a1c" stroke-width="3"/>' +
    svgArrow(129, 44, 45, '#f97316', 6) + svgArrow(191, 44, 275, '#f97316', 6) +
    '<text x="86" y="78" text-anchor="middle" font-size="13" font-weight="800" fill="#c2410c">4 N</text>' +
    '<text x="234" y="78" text-anchor="middle" font-size="13" font-weight="800" fill="#c2410c">4 N</text>' +
    '<text x="160" y="88" text-anchor="middle" font-size="13" font-weight="800" fill="#6d28d9">합력 = 0 → 힘의 평형</text></svg>';
  const FIG_64 = '<svg viewBox="0 0 320 112" width="320" role="img" aria-label="상자에 왼쪽으로 6 N, 오른쪽으로 4 N의 힘이 작용한다" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="0" y="0" width="320" height="112" rx="12" fill="#e7f5ff"/>' +
    '<rect x="135" y="30" width="50" height="50" rx="7" fill="#e7b97c" stroke="#7c4a1c" stroke-width="3"/>' +
    svgArrow(129, 55, 27, '#f97316') + svgArrow(191, 55, 259, '#f97316') +
    '<circle cx="129" cy="55" r="5" fill="#9a3412" stroke="#fff" stroke-width="2"/><circle cx="191" cy="55" r="5" fill="#9a3412" stroke="#fff" stroke-width="2"/>' +
    '<text x="78" y="96" text-anchor="middle" font-size="15" font-weight="800" fill="#c2410c">6 N</text>' +
    '<text x="225" y="96" text-anchor="middle" font-size="15" font-weight="800" fill="#c2410c">4 N</text></svg>';
  const FIG_ARM = '<svg viewBox="0 0 320 124" width="320" role="img" aria-label="팔씨름을 하며 맞잡은 손이 움직이지 않는 모습" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="0" y="0" width="320" height="124" rx="12" fill="#fff7ed"/>' +
    '<rect x="24" y="96" width="272" height="14" rx="4" fill="#c98b4f"/>' +
    '<line x1="30" y1="92" x2="96" y2="90" stroke="#3b82f6" stroke-width="22" stroke-linecap="round"/>' +
    '<line x1="290" y1="92" x2="224" y2="90" stroke="#eab308" stroke-width="22" stroke-linecap="round"/>' +
    '<line x1="96" y1="90" x2="152" y2="44" stroke="#f6c49c" stroke-width="16" stroke-linecap="round"/>' +
    '<line x1="224" y1="90" x2="168" y2="44" stroke="#eab27f" stroke-width="16" stroke-linecap="round"/>' +
    '<circle cx="160" cy="40" r="16" fill="#f3bf95" stroke="#b7794a" stroke-width="2"/>' +
    '<text x="160" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="#7c2d12">움직이지 않아요!</text></svg>';
  const FIG_TUG = '<svg viewBox="0 0 320 70" width="320" role="img" aria-label="줄다리기에서 두 팀이 300 N으로 당긴다" style="max-width:100%" ' + SVGF + '>' +
    '<line x1="20" y1="44" x2="300" y2="44" stroke="#b8864b" stroke-width="7" stroke-linecap="round"/>' +
    '<rect x="155" y="34" width="10" height="20" rx="3" fill="#ef4444"/>' +
    svgArrow(160, 18, 70, '#f97316', 6) + svgArrow(160, 18, 250, '#f97316', 6) +
    '<text x="60" y="64" font-size="13" font-weight="800" fill="#c2410c">300 N</text>' +
    '<text x="222" y="64" font-size="13" font-weight="800" fill="#c2410c">300 N</text></svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  const mk = (b) => (b ? '✔' : '—');
  const statusA3 = () => {
    const ev = evalDrawn();
    if (!ev) return '수레 <b>고리</b>를 눌러 화살표를 그려 보세요. (1칸 = 1 N)';
    const d = A.drawn;
    const part = (ok, label, why) => (ok ? '✅ ' + label : '⬜ ' + label + ' <small>(' + why + ')</small>');
    return part(ev.okP, '작용점', '고리에서 시작해요') + ' · ' + part(ev.okD, '방향', '오른쪽으로 수평하게') + ' · ' + part(ev.okF, '크기 ' + d.F + ' N', '4칸이에요');
  };
  const isPair = (r, a, b) => r && ((r.F1 === a && r.F2 === b) || (r.F1 === b && r.F2 === a));

  game = SciSim.game({
    simId: 'm1-force-balance',
    mount: '#game',
    badge: '힘의 평형 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      push: '✋ 물체 밀고 당기기 (화살표 그리기)',
      twoForces: '↔️ 두 힘 조절 (화살표 끝 끌기)',
      net: '🟣 합력 화살표',
      record: '📋 실험 결과 표',
      line: '📍 작용점 옮기기 · 작용선',
    },
    onFeatures(set) {
      feat = set;
      syncDom();
    },
    onMissionStart(m) {
      ensureScene(m._level);
      A.drawMode = false;
      if (B.st === 'pinned') { B.lock = [false, false]; }
    },
    levels: [
      /* ---------------- 1단계 ---------------- */
      {
        title: '힘이 작용하면?', short: '힘의 뜻', icon: '✋', phase: '관찰',
        features: ['push'],
        intro: '<p class="si-q">❓ 탐구 질문: 손으로 물체를 밀거나 당기면 무엇이 변할까? 그 힘을 그림으로 어떻게 나타낼까?</p>' +
          '<p>책상 위의 <b>찰흙</b>과 <b>수레</b>를 손가락으로 누른 채 끌어 보세요. 끈 방향과 길이만큼 <b>힘 화살표</b>가 생기고, 손을 떼면 힘이 작용해요.</p>',
        setup() { ensureScene(0); A.drawMode = false; showHint('✋ 찰흙이나 수레를 누른 채 끌었다가 놓아 보세요', 6500); },
        recap: '<b>힘</b>은 물체의 <b>모양</b>이나 <b>운동 상태</b>를 변하게 하는 원인이고, 단위는 <b>N(뉴턴)</b>이에요. 힘은 화살표(작용점·방향·크기)로 나타내요.',
        summary: '<ul><li><b>힘</b>: 물체의 <b>모양</b>이나 <b>운동 상태</b>를 변하게 하는 원인</li><li>힘의 단위: <b>N</b>(뉴턴)</li></ul>' +
          '<p>' + SVG_THREE + '</p>' +
          '<ul><li>화살표의 <b>시작점</b> = 힘이 작용하는 점(<b>작용점</b>)</li><li>화살표의 <b>방향</b> = 힘의 방향</li><li>화살표의 <b>길이</b> = 힘의 크기</li></ul>',
        missions: [
          {
            key: 'A1',
            title: '힘을 주어 변화 만들기',
            goal: '찰흙을 눌러 <b>모양</b>을 바꾸고, 수레를 밀거나 당겨 <b>운동 상태</b>를 바꿔 보세요.',
            hint: '물체를 손가락으로 누른 채 끌었다가 놓아요. 끈 길이가 길수록 힘이 커요. 수레는 옆으로 밀거나 당겨야 굴러가요.',
            setup() { A.changed = { shape: false, motion: false }; },
            check: () => A.changed.shape && A.changed.motion,
            hold: 0.6,
            status: () => '모양 변화 <b>' + mk(A.changed.shape) + '</b> · 운동 상태 변화 <b>' + mk(A.changed.motion) + '</b>',
            explain: '힘이 작용하자 찰흙은 <b>모양</b>이 변하고, 멈춰 있던 수레는 움직이기 시작했어요(<b>운동 상태</b>의 변화). 이처럼 물체의 모양이나 운동 상태를 변하게 하는 원인을 <b>힘</b>이라고 해요. 힘의 단위는 <b>N</b>(뉴턴)이에요.',
          },
          {
            type: 'quiz',
            title: '과학에서 말하는 힘',
            goal: '과학에서 말하는 <b>힘</b>이 작용한 경우는?',
            choices: ['친구에게 힘내라고 응원했다', '손으로 찰흙을 눌러 납작하게 만들었다', '공부할 힘이 하나도 없다', '마음의 힘이 강하다'],
            answer: 1,
            feedback: [
              '응원은 물체의 모양이나 운동 상태를 바꾸지 않아요.',
              '',
              '여기서 ‘힘’은 기운을 뜻하는 일상어예요. 물체의 모양이나 운동 상태가 변하지 않아요.',
              '여기서 ‘힘’은 의지를 뜻하는 말이에요. 물체에 작용한 힘이 아니에요.',
            ],
            explain: '과학에서 힘은 물체의 <b>모양이나 운동 상태를 변하게 하는 원인</b>이에요. 찰흙을 눌러 모양이 변했으니 찰흙에 힘이 작용한 거예요.',
          },
          {
            key: 'A3',
            title: '화살표로 나타내기',
            goal: '수레 <b>고리</b>에 <b>오른쪽으로 4 N 당기는 힘</b>을 화살표로 그려 보세요.',
            hint: '초록 고리를 눌러 오른쪽으로 4칸(1칸 = 1 N)만큼 끌어요. 비스듬하지 않게 수평으로!',
            setup() { resetA(); A.drawMode = true; A.drawn = null; showHint('🎯 수레 고리를 눌러 오른쪽으로 끌어 보세요', 6000); },
            check: () => !!(evalDrawn() || {}).all,
            hold: 0.4,
            status: statusA3,
            explain: '화살표의 <b>시작점</b>은 힘이 작용하는 점(<b>작용점</b>), 화살표의 <b>방향</b>은 힘의 방향, 화살표의 <b>길이</b>는 힘의 크기를 나타내요. 1칸이 1 N이므로 4칸 길이의 화살표는 4 N이에요.',
          },
        ],
      },
      /* ---------------- 2단계 ---------------- */
      {
        title: '나란한 두 힘의 합력', short: '합력', icon: '↔️', phase: '실험',
        features: ['twoForces', 'net', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘을 화살표(작용점·방향·크기)로 나타냈어요.</div>' +
          '<p>이번에는 매끄러운 얼음판 위의 상자에 <b>두 힘</b>을 함께 작용해 봐요. 여러 힘과 같은 효과를 내는 하나의 힘을 <b>합력</b>(알짜힘)이라고 해요.</p>' +
          '<p>위에서 내려다본 모습이라 <b>수평 방향의 힘</b>만 생각해요.</p>',
        setup() { ensureScene(1); resetB(false); showHint('↔ 주황 손잡이를 좌우로 끌어 두 힘을 정한 뒤 핀을 빼 보세요', 6500); },
        recap: '두 힘의 방향이 같으면 합력 = <b>두 힘의 합</b>, 방향이 반대이면 합력 = <b>큰 힘 − 작은 힘</b>(방향은 큰 힘 쪽)이에요.',
        summary: '<ul><li><b>합력</b>(알짜힘): 한 물체에 작용하는 여러 힘과 같은 효과를 내는 하나의 힘</li>' +
          '<li>같은 방향: 합력의 크기 = 두 힘의 합, 방향 = 두 힘의 방향</li>' +
          '<li>반대 방향: 합력의 크기 = 큰 힘 − 작은 힘, 방향 = 큰 힘의 방향</li></ul><p>' + SVG_NET + '</p>',
        missions: [
          {
            key: 'B1',
            title: '같은 방향',
            goal: '두 힘을 모두 <b>오른쪽</b>으로 <b>2 N</b>, <b>3 N</b>으로 놓고 <b>▶ 핀 빼기</b>를 눌러 보세요.',
            hint: '주황 손잡이를 좌우로 끌어 크기를 정해요. 왼쪽 고리의 힘을 오른쪽으로 하려면 손잡이를 고리 오른쪽으로 끌어요(미는 힘).',
            setup() { resetB(false); B.run = null; },
            check: () => { const r = B.run; return !!r && Math.sign(r.F1) === Math.sign(r.F2) && r.F1 !== 0 && isPair({ F1: Math.abs(r.F1), F2: Math.abs(r.F2) }, 2, 3) && r.moved > 30; },
            hold: 0.3,
            status: () => {
              const a = Math.abs(B.F[0]), b = Math.abs(B.F[1]), same = B.F[0] && B.F[1] && Math.sign(B.F[0]) === Math.sign(B.F[1]);
              const ok = same && ((a === 2 && b === 3) || (a === 3 && b === 2));
              return '힘1 <b>' + fmtF(B.F[0]) + '</b> · 힘2 <b>' + fmtF(B.F[1]) + '</b> · 같은 방향 2 N, 3 N <b>' + mk(ok) + '</b> · 핀 빼기 <b>' + mk(!!B.run && B.st !== 'pinned') + '</b>';
            },
            explain: '두 힘의 방향이 같으면 합력의 크기는 두 힘의 합(2 N + 3 N = <b>5 N</b>)이고, 방향은 두 힘과 같은 <b>오른쪽</b>이에요. 상자는 합력의 방향으로 점점 빨라졌어요.',
          },
          {
            key: 'B2',
            title: '반대 방향',
            goal: '<b>왼쪽으로 2 N</b>, <b>오른쪽으로 5 N</b>이 되게 놓고 핀을 빼 보세요. 상자는 어느 쪽으로 움직일까요?',
            hint: '왼쪽 손잡이는 고리 왼쪽으로 2칸, 오른쪽 손잡이는 고리 오른쪽으로 5칸 끌어요.',
            setup() { resetB(false); B.run = null; },
            check: () => { const r = B.run; return !!r && isPair(r, -2, 5) && r.moved > 30; },
            hold: 0.3,
            status: () => {
              const ok = (B.F[0] === -2 && B.F[1] === 5) || (B.F[0] === 5 && B.F[1] === -2);
              return '힘1 <b>' + fmtF(B.F[0]) + '</b> · 힘2 <b>' + fmtF(B.F[1]) + '</b> · 왼쪽 2 N, 오른쪽 5 N <b>' + mk(ok) + '</b> · 핀 빼기 <b>' + mk(!!B.run && B.st !== 'pinned') + '</b>';
            },
            explain: '두 힘의 방향이 반대이면 합력의 크기는 큰 힘에서 작은 힘을 뺀 값(5 N − 2 N = <b>3 N</b>)이고, 방향은 <b>큰 힘의 방향</b>(오른쪽)이에요. 그래서 상자가 오른쪽으로 움직였어요.',
          },
          {
            type: 'quiz',
            title: '합력 구하기',
            goal: '상자에 왼쪽으로 6 N, 오른쪽으로 4 N의 힘이 작용할 때 <b>합력</b>은?',
            figure: FIG_64,
            choices: ['왼쪽으로 2 N', '오른쪽으로 2 N', '10 N', '0 N'],
            answer: 0,
            feedback: [
              '',
              '크기는 맞았지만 방향을 다시 보세요. 합력은 <b>큰 힘</b> 쪽을 향해요.',
              '방향이 반대인 두 힘은 더하지 않아요. 큰 힘에서 작은 힘을 빼요.',
              '두 힘의 크기가 다르면 합력은 0이 아니에요. 상자는 큰 힘 쪽으로 움직여요.',
            ],
            explain: '두 힘의 방향이 반대이므로 6 N − 4 N = <b>2 N</b>, 방향은 큰 힘인 <b>왼쪽</b>이에요. 화살표의 길이는 상자가 움직인 거리가 아니라 <b>힘의 크기</b>예요.',
          },
        ],
      },
      /* ---------------- 3단계 ---------------- */
      {
        title: '힘의 평형', short: '힘의 평형', icon: '⚖️', phase: '설명',
        features: ['line'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 힘의 합력을 구했어요. 그렇다면 합력이 0이면 어떻게 될까요?</div>' +
          '<p>핀을 빼도 상자가 <b>그대로 멈춰 있는</b> 조건을 찾아봐요. 이번에는 오른쪽 <b>작용점</b>도 위·아래로 옮길 수 있고, 점선으로 각 힘의 <b>작용선</b>이 보여요.</p>',
        setup() { ensureScene(2); resetB(false); },
        recap: '두 힘이 <b>크기가 같고, 방향이 반대이며, 같은 작용선 위</b>에 있으면 합력이 0인 <b>힘의 평형</b> 상태예요.',
        summary: '<ul><li><b>힘의 평형</b>: 한 물체에 작용하는 두 힘의 합력이 <b>0</b>인 상태</li>' +
          '<li>조건: ① 크기가 같다 ② 방향이 반대이다 ③ 같은 작용선 위에 있다</li>' +
          '<li>힘의 평형 상태에서 멈춰 있던 물체는 계속 멈춰 있다.</li></ul><p>' + SVG_EQ + '</p>' +
          '<p class="note">멈춰 있다고 힘이 없는 것이 아니에요. 힘이 2개 작용해도 합력이 0이면 멈춰 있어요.</p>',
        missions: [
          {
            key: 'B4',
            title: '멈춰 있게 하기',
            goal: '왼쪽 힘은 <b>왼쪽으로 4 N</b>에 잠겨 있어요🔒. 오른쪽 힘을 조절하고 핀을 빼서 상자가 <b>2초 동안 멈춰 있게</b> 해 보세요.',
            hint: '왼쪽으로 4 N이 당기고 있어요. 오른쪽 힘은 몇 N, 어느 방향이어야 합력이 0이 될까요? 작용점은 가운데 칸이에요.',
            setup() { resetB(false); B.F[0] = -4; B.lock = [true, false]; B.run = null; },
            check: () => { const r = B.run; return !!r && r.F1 === -4 && r.F2 === 4 && r.slot === 1 && r.still; },
            hold: 0,
            status: () => {
              let s = '오른쪽 힘 <b>' + fmtF(B.F[1]) + '</b> · 합력 <b>' + fmtF(net()) + '</b>';
              if (B.F[1] === 4 && B.slot !== 1) s += '<br>⚠️ 작용점을 <b>가운데 칸</b>으로 옮겨요.';
              if (B.st === 'free' && B.run && net() === 0 && B.slot === 1) s += ' · 정지 <b>⏱ ' + Math.min(2, B.still).toFixed(1) + '초</b>';
              return s;
            },
            explain: '크기가 같고(4 N) 방향이 반대인 두 힘이 같은 작용선 위에 작용하면 합력이 <b>0</b>이에요. 이것을 <b>힘의 평형</b>이라고 해요. 상자에는 힘이 2개나 작용하지만 합력이 0이라 계속 멈춰 있어요.',
          },
          {
            key: 'B5',
            title: '작용선이 다르면?',
            goal: '크기 <b>3 N</b>인 두 힘을 서로 <b>반대 방향</b>으로 놓고, 오른쪽 작용점을 <b>위 칸</b>으로 옮긴 뒤 핀을 빼 보세요.',
            hint: '오른쪽 고리를 위로 끌면 작용점이 위 칸으로 옮겨져요. 손잡이를 좌우로 끌어 크기를 3 N으로 맞춰요.',
            setup() { resetB(false); B.F[0] = -3; B.run = null; showHint('↕ 오른쪽 고리를 위로 끌어 작용점을 옮겨 보세요', 6000); },
            check: () => { const r = B.run; return !!r && r.rot && Math.abs(r.F1) === 3 && r.F1 === -r.F2 && r.slot !== 1; },
            hold: 0,
            status: () => {
              const eq = Math.abs(B.F[0]) === 3 && B.F[0] === -B.F[1];
              return '크기 3 N, 반대 방향 <b>' + mk(eq) + '</b> · 작용선 어긋남 <b>' + mk(B.slot !== 1) + '</b> · 핀 빼기 <b>' + mk(!!B.run && B.st !== 'pinned') + '</b>';
            },
            explain: '두 힘의 크기가 같고 방향이 반대여도 <b>작용선이 다르면</b> 상자가 제자리에서 돌아요. 그래서 힘의 평형을 이루려면 두 힘이 <b>같은 작용선</b> 위에 있어야 해요.',
          },
          {
            type: 'quiz',
            title: '평형 조건',
            goal: '두 힘이 <b>평형</b>을 이루는 조건으로 옳은 것은?',
            choices: [
              '크기가 같고, 방향이 반대이며, 같은 작용선 위에 있다',
              '크기가 같고, 방향이 같다',
              '방향만 반대이면 된다',
              '크기만 같으면 된다',
            ],
            answer: 0,
            feedback: [
              '',
              '두 힘이 같은 방향이면 합력이 두 배가 되어 상자가 미끄러졌어요.',
              '크기가 다르면 큰 힘 쪽으로 미끄러졌어요(왼쪽 2 N, 오른쪽 5 N 실험).',
              '크기가 같아도 방향이 같거나 작용선이 다르면 상자가 움직이거나 돌았어요.',
            ],
            explain: '힘의 평형 조건은 ① 크기가 같고 ② 방향이 반대이며 ③ 같은 작용선 위에 있는 것이에요. 이때 합력은 0이고 멈춰 있던 물체는 계속 멈춰 있어요. ‘멈춰 있으면 힘이 없다’가 아니라 ‘<b>합력이 0</b>’인 거예요!',
          },
        ],
      },
      /* ---------------- 4단계 ---------------- */
      {
        title: '생활 속 힘의 평형', short: '적용', icon: '🪢', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘의 평형 조건(크기 같음·방향 반대·같은 작용선)을 찾았어요.</div>' +
          '<p>생활 속 <b>줄다리기</b>와 <b>팔씨름</b>에서 힘의 평형을 찾아봐요. 줄다리기 장면에서는 <b>1칸 = 100 N</b>이에요.</p>',
        setup() { ensureScene(3); resetT(); showHint('👧 오른쪽 팀의 빈 자리(＋)를 눌러 아이를 더해 보세요', 6000); },
        recap: '줄다리기에서 깃발이 움직이지 않거나 팔씨름에서 손이 멈춰 있으면, 두 힘이 크기가 같고 방향이 반대인 <b>힘의 평형</b> 상태예요.',
        summary: '<ul><li>줄다리기에서 두 팀이 같은 크기의 힘으로 반대 방향으로 당기면 합력이 0 → 깃발이 움직이지 않는다.</li>' +
          '<li>팔씨름에서 맞잡은 손이 움직이지 않으면 두 사람의 힘이 평형을 이룬다.</li></ul><p>' + FIG_TUG + '</p>' +
          '<p class="note">다음 차시에서는 중력과 탄성력을 화살표로 나타내 봐요.</p>',
        missions: [
          {
            key: 'T1',
            title: '줄다리기 비기기',
            goal: '왼쪽 팀은 <b>300 N</b>으로 당겨요. 오른쪽 팀에 아이를 더하거나 빼서(1명 = 100 N) <b>▶ 시작</b> 후 깃발이 <b>2초 동안</b> 가운데에 머물게 해 보세요.',
            hint: '왼쪽 팀은 3명(300 N)이에요. 오른쪽 팀도 같은 크기의 힘으로 반대 방향으로 당겨야 해요.',
            setup() { resetT(); TG.tieDone = false; },
            check: () => TG.tieDone,
            hold: 0,
            status: () => {
              const nf = tugNet();
              let s = '오른쪽 팀 <b>' + TG.n + '명 = ' + TG.n * 100 + ' N</b> · 합력 <b>' + (nf ? (nf > 0 ? '→ ' : '← ') + Math.abs(nf) + ' N' : '0') + '</b>';
              if (TG.st === 'run' && nf === 0) s += ' · ⏱ <b>' + Math.min(2, TG.tie).toFixed(1) + '초</b>';
              return s;
            },
            explain: '두 팀이 같은 크기(300 N)의 힘으로 반대 방향으로 당기면 합력이 <b>0</b>이 되어 깃발이 움직이지 않아요. 줄에 작용하는 두 힘이 <b>평형</b>을 이룬 거예요.',
          },
          {
            type: 'quiz',
            title: '팔씨름',
            goal: '팔씨름을 하는데 맞잡은 손이 움직이지 않아요. 옳은 설명은?',
            figure: FIG_ARM,
            choices: [
              '두 사람이 주는 힘의 크기가 같고 방향이 반대라 평형을 이룬다',
              '힘센 사람이 더 큰 힘을 주고 있다',
              '아무 힘도 작용하지 않는다',
              '두 힘의 방향이 같다',
            ],
            answer: 0,
            feedback: [
              '',
              '한쪽 힘이 더 크면 합력이 0이 아니어서 손이 그쪽으로 움직여야 해요.',
              '두 사람 모두 힘을 주고 있어요. 힘이 작용해도 합력이 0이면 멈춰 있어요.',
              '두 사람은 서로 반대쪽으로 밀어요.',
            ],
            explain: '손이 멈춰 있으니 합력이 0이에요. 두 사람이 주는 힘은 크기가 같고 방향이 반대인 <b>힘의 평형</b> 상태예요. 다음 차시에서는 중력과 탄성력을 화살표로 나타내 봐요.',
          },
        ],
      },
    ],
  });

  /* ---------- 성공하면 장면 위에 링 파동 + 반짝이 ---------- */
  let lastPhase = null, lastIdx = -1;
  function watchSuccess() {
    const ph = game.phase, i = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || i !== lastIdx)) {
      const m = game.current();
      if (m && m.type === 'task') {
        if (scene === 'A') {
          if (m.key === 'A3') { const hk = cartGeo().hook; celebrate(hk.x + 40, hk.y, 40); }
          else { const g = cartGeo(); celebrate(A.lastObj === 'clay' ? clayBox().cx : g.x, TY - 40, 56); }
        } else if (scene === 'B') celebrate(B.x, B.y, 56);
        else celebrate(TGX.cx + TG.xo, TGX.ry, 50);
      }
    }
    lastPhase = ph; lastIdx = i;
  }

  /* ---------- 시작 ---------- */
  renderTable();
  updatePinBtn(); updateTugBtns();
  SciSim.loop((dt, t) => {
    if (scene === 'A') stepA(dt); else if (scene === 'B') stepB(dt); else stepT(dt);
    view.clear('#eef5ff');
    if (scene === 'A') drawSceneA(); else if (scene === 'B') drawSceneB(dt); else drawSceneT();
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.45);
      ctx.fillStyle = 'rgba(238,245,255,' + (1 - EASE.outCubic(trans.t)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    watchSuccess();
    syncDom();
    updateReadouts(t);
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, A, B, TG, get game() { return game; }, W, H, NPX, TPX, BC, TGX, TY, AX,
    cartGeo, kidX, kidSide, clayBox, setScene, pullPin, setKids, startTug,
    setF(f1, f2) { B.F[0] = f1; B.F[1] = f2; },
  };
})();
