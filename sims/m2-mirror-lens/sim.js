/* =========================================================
   중2 Ⅲ. 빛과 파동 — 거울과 렌즈의 상 [9과10-02]
   ① [관찰] 평면거울        글자 카드를 옮기면 상은 거울 뒤 같은 거리에, 같은 크기로, 좌우가 바뀌어 보여요
   ② [설명] 상의 원리       한 점에서 나온 빛 두 줄기가 반사 법칙대로 반사 → 반사 광선의 연장선이 만나는 곳 = 상
   ③ [실험] 볼록·오목 거울   같은 물체를 가까이/멀리 두고 상의 크기·방향을 정성적으로 비교, 쓰임 짝짓기
   ④ [적용] 렌즈            볼록·오목 렌즈의 상 비교, 사례 분류
   범위: 평면거울만 반사 법칙으로 설명. 곡면 거울·렌즈는 상의 위치·크기를 계산하지 않고(수치 표시 없음) 크기·방향 같은 정성적 특징만 비교.
         실상·허상을 구분하는 활동·용어는 쓰지 않아요(빛이 실제로 모이는 곳은 실선, 연장선은 점선으로만 그려요).
   광선: 반사 d' = d − 2(d·n)n, 곡면 거울·렌즈는 기하 광학의 이상적인 모형(주요 광선 두 줄기의 교점)으로 상을 찾아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const EASE = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const { rgba, shade, mix } = SciSim.color;
  const approach = SciSim.approach;

  /* ---------- 캔버스 (태블릿 800×520 · 휴대폰 520×440) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const W = PHONE ? 520 : 800, H = PHONE ? 440 : 520, FS = PHONE ? 1.3 : 1;
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#0b1226' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const NOW = () => performance.now() / 1000;
  const sgn = (v) => (v < 0 ? -1 : 1);
  let game = null;
  let feat = new Set();
  const on = (f) => feat.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  const COL = {
    laser: '#ff4d5a', inc: '#fbbf24', ref: '#2dd4bf', rfr: '#c4b5fd', water: '#38a3e8', glass: '#7ee7e0',
    ink: '#e8eefc', muted: '#9fb0d0', good: '#22c55e', warn: '#fb7185', warm: '#ffd66b', accent: '#f26b3a',
  };

  /* =========================================================
     그리기 도구
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
    if (o.halo !== false) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo || 'rgba(6,10,24,.92)'; ctx.lineWidth = 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || COL.ink; ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(str, size, weight) { ctx.save(); ctx.font = font(size || 14, weight || 800); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  /* 알약 라벨: {color, solid, size, align, alpha, fit, textColor} */
  function pill(str, x, y, o) {
    o = o || {};
    const size = o.size || 14;
    ctx.save();
    ctx.font = font(size, 800);
    const tw = ctx.measureText(str).width, padX = 9 * FS, h = (size + 10) * FS, w = tw + padX * 2;
    let x0 = x - w / 2;
    if (o.align === 'left') x0 = x; else if (o.align === 'right') x0 = x - w;
    if (o.fit) { x0 = clamp(x0, 6, W - w - 6); y = clamp(y, h / 2 + 4, H - h / 2 - 4); }
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    rr(x0, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.solid ? o.color : 'rgba(9,15,36,.9)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (!o.solid) { ctx.lineWidth = 2; ctx.strokeStyle = o.color || '#475569'; ctx.stroke(); }
    ctx.fillStyle = o.solid ? (o.textColor || '#fff') : (o.textColor || shade(o.color || '#94a3b8', 0.55));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x0 + w / 2, y + 0.5);
    ctx.restore();
    return { x: x0, y: y - h / 2, w, h };
  }
  function softShadow(cx, cy, rx, ry, a) {
    a = a == null ? 0.35 : a;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,8,' + a + ')');
    g.addColorStop(0.55, 'rgba(0,0,8,' + (a * 0.45).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,0,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBG() {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 30, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, '#1b2a56'); g.addColorStop(1, '#080d1f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(148,163,205,.11)';
    for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) ctx.fillRect(x - 1, y - 1, 2, 2);
  }

  /* ---------- 빛줄기: 겹쳐 그린 가산 혼합으로 번짐(bloom) ---------- */
  function polyPath(pts) { ctx.beginPath(); for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y); }
  function beam(pts, o) {
    o = o || {};
    const c = o.color || COL.laser, a = o.alpha == null ? 1 : o.alpha, w = o.width || 3;
    if (a <= 0.01 || pts.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const passes = [[w * 8, 0.055], [w * 4.6, 0.1], [w * 2.6, 0.2], [w * 1.5, 0.42]];
    for (let i = 0; i < passes.length; i++) { polyPath(pts); ctx.lineWidth = passes[i][0]; ctx.strokeStyle = rgba(c, passes[i][1] * a); ctx.stroke(); }
    polyPath(pts); ctx.lineWidth = w * 0.7; ctx.strokeStyle = rgba('#ffffff', 0.95 * a); ctx.stroke();
    ctx.restore();
  }
  function glowDot(x, y, r, color, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba('#ffffff', Math.min(1, a))); g.addColorStop(0.25, rgba(color, a * 0.7)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- 경로(PATH)와 빛 알갱이(펄스) : 물·유리 속에서는 더 느리게 ---------- */
  function makePath(pts, facs) {
    const cum = [0];
    for (let i = 0; i < pts.length - 1; i++) cum.push(cum[i] + Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y));
    return { pts, facs: facs || pts.slice(1).map(() => 1), cum, total: cum[cum.length - 1] };
  }
  function segIndex(P, s) { let i = 0; while (i < P.facs.length - 1 && s > P.cum[i + 1]) i++; return i; }
  function pathAt(P, s) {
    const i = segIndex(P, s), a = P.pts[i], b = P.pts[i + 1], L = (P.cum[i + 1] - P.cum[i]) || 1;
    const u = clamp((s - P.cum[i]) / L, 0, 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, tx: (b.x - a.x) / L, ty: (b.y - a.y) / L, seg: i };
  }
  class Pulses {
    constructor(gap, v0) { this.list = []; this.clock = 0; this.gap = gap || 0.6; this.v0 = v0 || 340; this.arrived = 0; }
    reset() { this.list.length = 0; this.clock = this.gap * 0.85; this.arrived = 0; }
    update(dt, P, active) {
      if (RM || !P || P.total < 6 || !active) { this.list.length = 0; this.clock = this.gap * 0.85; return; }
      this.clock += dt;
      if (this.clock >= this.gap) { this.clock -= this.gap; this.list.push({ s: 0 }); }
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.s += this.v0 * P.facs[segIndex(P, p.s)] * dt;
        if (p.s >= P.total) { this.list.splice(i, 1); this.arrived = NOW(); }
      }
    }
    draw(P, color, size) {
      if (!P || !this.list.length) return;
      size = size || 3;
      this.list.forEach((p) => {
        const q = pathAt(P, p.s), fac = P.facs[q.seg];
        const a = Math.min(1, p.s / 24, (P.total - p.s) / 24 + 0.15);
        const tail = size * 6 * Math.max(0.55, fac);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const gr = ctx.createLinearGradient(q.x - q.tx * tail, q.y - q.ty * tail, q.x, q.y);
        gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(1, rgba('#ffffff', 0.9 * a));
        ctx.strokeStyle = gr; ctx.lineWidth = size * 1.5;
        ctx.beginPath(); ctx.moveTo(q.x - q.tx * tail, q.y - q.ty * tail); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.restore();
        glowDot(q.x, q.y, size * 4.2, color, 0.8 * a);
      });
    }
  }

  /* 각도 호 + 부채꼴: 법선(기준 각 nAng)에서 광선 방향(rAng)까지 */
  function angleArc(cx, cy, r, nAng, rAng, color, fillA) {
    const a0 = Math.min(nAng, rAng), a1 = Math.max(nAng, rAng);
    if (a1 - a0 < 0.004) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
    ctx.fillStyle = rgba(color, fillA == null ? 0.16 : fillA); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    ctx.restore();
  }
  function dashed(x1, y1, x2, y2, color, w, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 1.6; ctx.setLineDash(dash || [6, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }

  /* ---------- 눈 (옆모습이 아닌 정면 눈 아이콘) ---------- */
  function drawEye(x, y, s, lx, ly, o) {
    o = o || {};
    const w = 78 * s, h = 25 * s;
    ctx.save();
    ctx.translate(x, y);
    if (o.glow > 0.01) {
      glowDot(0, 0, 70 * s, '#fde68a', 0.55 * o.glow);
    }
    // 흰자
    ctx.beginPath(); ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(0, -h * 1.9, w / 2, 0); ctx.quadraticCurveTo(0, h * 1.9, -w / 2, 0); ctx.closePath();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    const gs = ctx.createLinearGradient(0, -h * 1.4, 0, h * 1.4);
    gs.addColorStop(0, '#ffffff'); gs.addColorStop(1, '#dbe3f0');
    ctx.fillStyle = gs; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.clip();
    // 홍채 + 동공
    const m = Math.hypot(lx, ly) || 1, ix = (lx / m) * Math.min(1, m / 40) * 8 * s, iy = (ly / m) * Math.min(1, m / 40) * 4 * s;
    const ir = 17 * s;
    const gi = ctx.createRadialGradient(ix - 4 * s, iy - 4 * s, 2, ix, iy, ir);
    gi.addColorStop(0, '#7dd3fc'); gi.addColorStop(0.6, '#2563eb'); gi.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    const pr = (o.pupil || 8.5) * s;
    ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.arc(ix, iy, pr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(ix - 6 * s, iy - 6 * s, 3.8 * s, 0, TAU); ctx.fill();
    ctx.restore();
    // 윤곽과 속눈썹
    ctx.beginPath(); ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(0, -h * 1.9, w / 2, 0); ctx.quadraticCurveTo(0, h * 1.9, -w / 2, 0); ctx.closePath();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const t = i / 2.4, ex = t * w * 0.36, ey = -h * 0.95 * (1 - t * t) - 1;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + t * 6 * s, ey - 8 * s); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 효과: 성공(링 파동 + 반짝이), 배지, NEW 표시 ---------- */
  const rings = [];
  let checkFx = null;
  function celebrate(x, y, r) {
    r = r || 46;
    rings.push({ x, y, r, t: 0 }, { x, y, r, t: -0.14 });
    FX.burst(x, y, { count: 14, life: 0.7, speed: 190, gravity: 100, size: 4.5, shape: 'star', colors: ['#fde047', '#fb923c', '#a78bfa', '#34d399', '#60a5fa'] });
    checkFx = { x, y: Math.max(30, y - r - 18), t: 0 };
  }
  function drawFx(dt) {
    FX.update(dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i]; g.t += dt;
      if (g.t >= 0.6) { rings.splice(i, 1); continue; }
      if (g.t < 0) continue;
      const p = g.t / 0.6;
      ctx.save(); ctx.strokeStyle = rgba('#4ade80', 0.85 * (1 - p)); ctx.lineWidth = 5 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r + p * 48, 0, TAU); ctx.stroke(); ctx.restore();
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
    badges.push({ str, x, y, color: color || COL.good, t: 0, dur: dur || 2.4 });
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
    ctx.save(); ctx.strokeStyle = rgba('#fb923c', 0.35 + a * 0.5); ctx.lineWidth = 3.5;
    rr(x - 6, y - 6, w + 12, h + 12, 14); ctx.stroke(); ctx.restore();
    pill('NEW', x + w + 2, y - 6, { solid: true, color: '#f26b3a', size: 12, align: 'right' });
  }
  const mk = (b) => (b ? '✅' : '⬜');
  const chip = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ---------- 기하 도우미 ---------- */
  function segHitRect(ax, ay, bx, by, r) {            // 선분 a→b 가 사각형 r={x,y,w,h} 와 만나는 첫 위치(0~1) 또는 null
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    const P = [-dx, dx, -dy, dy], Q = [ax - r.x, r.x + r.w - ax, ay - r.y, r.y + r.h - ay];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(P[i]) < 1e-9) { if (Q[i] < 0) return null; continue; }
      const t = Q[i] / P[i];
      if (P[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
      else { if (t < t0) return null; if (t < t1) t1 = t; }
    }
    return t0;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function reflectVec(d, n) { const k = 2 * (d.x * n.x + d.y * n.y); return { x: d.x - k * n.x, y: d.y - k * n.y }; }

  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const near = (a, ref) => { while (a - ref > Math.PI) a -= TAU; while (a - ref < -Math.PI) a += TAU; return a; };
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function lineHit(p1, d1, p2, d2) {                       // 두 직선 p1 + s·d1, p2 + t·d2 의 교점 (평행이면 null)
    const den = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(den) < 1e-6) return null;
    const t = ((p2.x - p1.x) * d1.y - (p2.y - p1.y) * d1.x) / den;
    return { x: p2.x + d2.x * t, y: p2.y + d2.y * t };
  }
  const unit = (v) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; };
  /* 선분이 화면 안에서 끝나는 점 */
  function toEdge(p, d, pad) {
    pad = pad == null ? 18 : pad;
    let t = 1e9;
    if (d.x > 1e-6) t = Math.min(t, (W - pad - p.x) / d.x); else if (d.x < -1e-6) t = Math.min(t, (pad - p.x) / d.x);
    if (d.y > 1e-6) t = Math.min(t, (H - pad - p.y) / d.y); else if (d.y < -1e-6) t = Math.min(t, (pad - p.y) / d.y);
    t = Math.max(t, 0);
    return { x: p.x + d.x * t, y: p.y + d.y * t };
  }

  /* 빛이 닿는 곳에서 튀는 작은 불꽃 */
  let sparkClock = 0;
  function sparkAt(dt, x, y, color, rate, spread) {
    if (RM) return;
    sparkClock += dt;
    if (sparkClock < (rate || 0.1)) return;
    sparkClock = 0;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * (spread || 2.4), sp = 30 + Math.random() * 70;
    FX.emit({ x: x + (Math.random() - 0.5) * 8, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.4, size: 1.2 + Math.random() * 1.6, color: color || '#fff', gravity: 120, drag: 1.2, shape: 'circle' });
  }

  function starShape(x, y, R, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
  }

  /* ---------- 촛불: (x, yb)=바닥 가운데, h=키(양수는 바로, 음수는 거꾸로) ---------- */
  function drawCandle(x, yb, h, o) {
    o = o || {};
    const sc = Math.max(0.05, Math.abs(h) / 70), flip = h < 0 ? -1 : 1, t = NOW();
    ctx.save();
    ctx.translate(x, yb);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.scale(sc, sc * flip);
    if (!o.ghost) { ctx.fillStyle = 'rgba(0,0,12,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 19, 4.5, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = o.ghost ? '#8fa1c4' : '#7b8aa8'; ctx.beginPath(); ctx.ellipse(0, -1, 16, 5, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(-9, 0, 9, 0);
    g.addColorStop(0, '#f1d596'); g.addColorStop(0.35, '#fff7e0'); g.addColorStop(1, '#dfb870');
    ctx.fillStyle = g; rr(-9, -43, 18, 41, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(122,82,22,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-5.5, -40, 2.4, 33);
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.ellipse(0, -43, 9, 3, 0, 0, TAU); ctx.fill();           // 윗면
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(0, -50); ctx.stroke();
    // 불꽃
    const fl = RM ? 1 : 1 + Math.sin(t * 13 + (o.ph || 0)) * 0.07 + Math.sin(t * 7.3) * 0.05, sway = RM ? 0 : Math.sin(t * 5.1) * 1.4;
    if (!o.ghost) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(0, -58, 0, 0, -58, 34 * (o.glow == null ? 1 : o.glow));
      gl.addColorStop(0, 'rgba(255,214,120,.55)'); gl.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -58, 34 * (o.glow == null ? 1 : o.glow), 0, TAU); ctx.fill();
      ctx.restore();
    }
    const fg = ctx.createLinearGradient(0, -50, 0, -50 - 20 * fl);
    fg.addColorStop(0, o.ghost ? 'rgba(180,200,235,.9)' : '#ffd34e'); fg.addColorStop(0.55, o.ghost ? 'rgba(200,215,240,.9)' : '#ff9d2e'); fg.addColorStop(1, o.ghost ? 'rgba(220,230,250,.5)' : 'rgba(255,90,30,.6)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(0, -49);
    ctx.bezierCurveTo(8, -54, 7 + sway * 0.3, -62, sway, -50 - 20 * fl);
    ctx.bezierCurveTo(-7 + sway * 0.3, -62, -8, -54, 0, -49); ctx.closePath(); ctx.fill();
    if (!o.ghost) { ctx.fillStyle = 'rgba(255,255,235,.9)'; ctx.beginPath(); ctx.ellipse(sway * 0.3, -54, 2.6, 6 * fl, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- 글자 카드 (위에서 본 모습): (x, y)=가운데, s=한 변 ---------- */
  function drawFCard(x, y, s, o) {
    o = o || {};
    const lift = o.lift || 0;
    ctx.save();
    ctx.translate(x, y - 3 * lift);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.flip) ctx.scale(-1, 1);
    const sc = 1 + 0.08 * lift; ctx.scale(sc, sc);
    if (!o.ghost) { ctx.shadowColor = 'rgba(0,0,10,' + (0.5 + 0.15 * lift) + ')'; ctx.shadowBlur = 12 + 10 * lift; ctx.shadowOffsetY = 4 + 6 * lift; }
    const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    g.addColorStop(0, o.ghost ? 'rgba(215,232,255,.55)' : '#fffdf0'); g.addColorStop(1, o.ghost ? 'rgba(150,185,235,.5)' : '#efe3bd');
    ctx.fillStyle = g; rr(-s / 2, -s / 2, s, s, s * 0.14); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.ghost) { ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(170,205,255,.95)'; } else { ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(120,90,30,.55)'; }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = o.ghost ? 'rgba(90,150,255,.85)' : '#1d4ed8';
    ctx.font = font(s * 0.86 / FS * 1, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('F', 0, s * 0.04);
    if (o.dot) {
      const dx = s * 0.36, dy = -s * 0.36;
      ctx.fillStyle = o.ghost ? 'rgba(255,255,255,.9)' : '#ff4d5a'; ctx.beginPath(); ctx.arc(dx, dy, s * 0.085, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 평면거울 (세로 막대, 왼쪽 면이 반사면) ---------- */
  function drawVMirror(mx, y0, y1, t, ent) {
    ctx.save();
    ctx.globalAlpha *= ent;
    const w = 12;
    ctx.shadowColor = 'rgba(0,0,10,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#18213d'; rr(mx - 1, y0 - 6, w + 6, y1 - y0 + 12, 6); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(140,160,215,.18)'; ctx.lineWidth = 1.4;
    for (let y = y0; y < y1; y += 16) { ctx.beginPath(); ctx.moveTo(mx + 5, y + 14); ctx.lineTo(mx + w + 3, y); ctx.stroke(); }
    const gm = ctx.createLinearGradient(mx - 7, 0, mx + 1, 0);
    gm.addColorStop(0, '#f7fbff'); gm.addColorStop(0.5, '#b4c5e6'); gm.addColorStop(1, '#8196c0');
    ctx.fillStyle = gm; rr(mx - 7, y0, 8, y1 - y0, 3); ctx.fill();
    if (!RM) {
      ctx.save(); rr(mx - 7, y0, 8, y1 - y0, 3); ctx.clip();
      const sy = y0 - 120 + (((t * 0.2) % 1.6) / 1.6) * (y1 - y0 + 240);
      const gs = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
      gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,255,255,.95)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gs; ctx.fillRect(mx - 8, sy - 60, 10, 120);
      ctx.restore();
    }
    ctx.restore();
  }

  /* 눈금자 : 거울이 0, 양쪽으로 cm 눈금 */
  function drawRuler(mx, y, pxCm, ent) {
    ctx.save();
    ctx.globalAlpha *= ent;
    const x0 = Math.max(10, mx - pxCm * 11), x1 = Math.min(W - 10, mx + pxCm * 10.4);
    const g = ctx.createLinearGradient(0, y - 10, 0, y + 14);
    g.addColorStop(0, '#f6e7a6'); g.addColorStop(1, '#d9bf63');
    ctx.shadowColor = 'rgba(0,0,10,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = g; rr(x0, y - 8, x1 - x0, 20, 4); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(80,60,10,.8)'; ctx.fillStyle = 'rgba(70,50,8,.95)';
    ctx.font = font(11, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let c = -11; c <= 10; c += 1) {
      const x = mx + c * pxCm;
      if (x < x0 + 2 || x > x1 - 2) continue;
      const major = c % 2 === 0;
      ctx.lineWidth = major ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 8 + (major ? 9 : 5)); ctx.stroke();
      if (major) ctx.fillText(String(Math.abs(c)), x, y + 9);
    }
    ctx.restore();
  }

  /* =========================================================
     장면 ① 평면거울 : 글자 카드와 거울 속 상 (위에서 본 모습)
     ========================================================= */
  const PLG = PHONE
    ? { mx: 318, y0: 74, y1: 338, cm: 18.5, ry: 402, card: 34 }
    : { mx: 478, y0: 104, y1: 400, cm: 29, ry: 476, card: 48 };
  PLG.cy = (PLG.y0 + PLG.y1) / 2;
  const PL = {
    x: PLG.mx - 6 * PLG.cm, y: PLG.cy - 10, drag: false, ox: 0, oy: 0, lift: 0, dragged: false, tw: null,
    hold: { 4: 0, 8: 0 }, ok: { 4: false, 8: false }, snapX: PLG.mx - 6 * PLG.cm,
  };
  const plCm = () => (PLG.mx - PL.x) / PLG.cm;
  function plGoCm(cm, user) {
    cm = clamp(Math.round(cm * 2) / 2, 2, 10);
    PL.snapX = PLG.mx - cm * PLG.cm;
    if (PL.tw) PL.tw.cancel();
    PL.tw = SciSim.tween(PL, { x: PL.snapX }, { duration: 0.4, ease: 'outBack' });
    if (user) Sound.tick();
    syncSliders();
  }
  function stepPlane(dt) {
    PL.lift = approach(PL.lift, PL.drag ? 1 : 0, dt, 14);
    if (scene !== 'plane') return;
    const cm = plCm(), settled = !PL.drag && Math.abs(PL.x - PL.snapX) < 1.5;
    [4, 8].forEach((T) => {
      if (Math.abs(cm - T) < 0.26 && settled) PL.hold[T] += dt; else PL.hold[T] = 0;
      if (PL.hold[T] >= 0.6 && !PL.ok[T]) {
        PL.ok[T] = true; Sound.success();
        FX.burst(PLG.mx - T * PLG.cm, PL.y, { count: 8, life: 0.5, speed: 90, size: 3.2, gravity: 0, shape: 'star', colors: ['#fde047', '#2dd4bf', '#fff'] });
        badge('거울에서 ' + T + ' cm → 상도 ' + T + ' cm!', W / 2, 34 * FS, COL.good, 2.6);
      }
    });
  }
  function drawTable(ent) {
    ctx.save(); ctx.globalAlpha *= ent;
    ctx.fillStyle = 'rgba(255,255,255,.035)'; rr(14, 14, W - 28, H - 28, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,205,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function drawPlane(dt, t) {
    const g = PLG, ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1));
    drawBG(); drawTable(ent);
    drawVMirror(g.mx, g.y0, g.y1, t, ent);
    drawRuler(g.mx, g.ry, g.cm, ent);
    pill('평면거울', g.mx - 4, g.y0 - 24 * FS, { color: '#cbd5e1', size: 13, alpha: ent, fit: true });
    const x = PL.x, y = PL.y, ix = 2 * g.mx - x, cm = plCm();
    // 같은 거리 : 점선 + 같은 눈금(‖)
    ctx.save(); ctx.globalAlpha *= ent;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ix, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = COL.inc; ctx.lineWidth = 2.6;
    [[(x + g.mx) / 2, COL.inc], [(g.mx + ix) / 2, COL.ref]].forEach(([mxp, c]) => { ctx.strokeStyle = c; [-3, 3].forEach((o) => { ctx.beginPath(); ctx.moveTo(mxp + o, y - 8); ctx.lineTo(mxp + o, y + 8); ctx.stroke(); }); });
    ctx.restore();
    // 눈금자 위의 거리 표시
    ctx.save(); ctx.globalAlpha *= ent;
    [[x, COL.inc], [ix, COL.ref]].forEach(([px, c]) => {
      ctx.strokeStyle = rgba(c, 0.7); ctx.lineWidth = 1.6; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(px, y + g.card / 2 + 2); ctx.lineTo(px, g.ry - 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, g.ry - 8, 4.5, 0, TAU); ctx.fill();
    });
    ctx.restore();
    pill('물체 ' + cm.toFixed(1) + ' cm', x, g.ry - 34 * FS, { color: COL.inc, size: 13.5, alpha: ent, fit: true });
    pill('상 ' + cm.toFixed(1) + ' cm', ix, g.ry - 34 * FS, { color: COL.ref, size: 13.5, alpha: ent, fit: true });
    // 상(거울 속 모습) : 좌우가 바뀌어요
    drawFCard(ix, y, g.card, { ghost: true, flip: true, alpha: ent });
    pill('상 (좌우가 바뀌었어요)', ix, y - g.card / 2 - 22 * FS, { color: '#9ec5ff', size: 12.5, alpha: ent, fit: true });
    // 물체
    drawFCard(x, y, g.card, { lift: PL.lift, alpha: ent });
    pill('물체', x, y - g.card / 2 - 20 * FS, { color: '#fcd34d', size: 12.5, alpha: ent, fit: true });
    if (!PL.dragged && ent > 0.9) txt('↔ 카드를 끌어 보세요', clamp(x, 90 * FS, W - 90 * FS), y + g.card / 2 + 24 * FS, { size: 13, color: '#fde68a', alpha: 0.55 + 0.4 * Math.sin(t * 4) });
    if (isNew('plane')) newTag(x - g.card / 2 - 6, y - g.card / 2 - 6, g.card + 12, g.card + 12);
  }
  const plHit = (p) => Math.abs(p.x - PL.x) <= PLG.card / 2 + 16 && Math.abs(p.y - PL.y) <= PLG.card / 2 + 16;

  /* =========================================================
     장면 ② 광선과 상 / ②-2 눈의 위치
     ========================================================= */
  const PLR = {
    cx: PLG.mx - 6.2 * PLG.cm, cy: PLG.cy, ay: PLG.cy - 22, by: PLG.cy + 40,
    extOn: false, extT: 0, sx: PLG.mx + (W - PLG.mx) * 0.72, sy: PLG.cy + (PHONE ? 70 : 104), placed: false,
    flag: { rays: false, ext: false, star: false }, drag: null, lift: { A: 0, B: 0, S: 0, E: 0, C: 0 }, off: { x: 0, y: 0 },
    sepHold: 0, extHold: 0, ghost: 0, dragged: false, tw: null, sel: 'A', selT: 0,
  };
  const EY = { x: PHONE ? 66 : 96, y: PLG.cy - (PHONE ? 90 : 128), drag: false, lift: 0, moved: 0, blind: 0, last: null, flag: { moved: false, blind: false }, vis: true, shown: 1 };
  const plrP = () => ({ x: PLR.cx + PLG.card * 0.36, y: PLR.cy - PLG.card * 0.36 });
  const plrP2 = () => { const P = plrP(); return { x: 2 * PLG.mx - P.x, y: P.y }; };
  const mirrorYs = () => [PLG.y0 + 16, PLG.y1 - 16];
  function stepRays(dt) {
    const R = PLR;
    ['A', 'B', 'S', 'E', 'C'].forEach((k) => { R.lift[k] = approach(R.lift[k], R.drag === k ? 1 : 0, dt, 14); });
    R.selT = Math.max(0, R.selT - dt);
    R.extT = approach(R.extT, R.extOn ? 1 : 0, dt, 2.8);
    if (R.extOn && R.extT > 0.985) R.extT = 1;
    R.ghost = approach(R.ghost, R.placed ? 1 : 0, dt, 4);
    EY.lift = approach(EY.lift, EY.drag ? 1 : 0, dt, 14);
    if (scene === 'rays') {
      if (Math.abs(R.ay - R.by) >= (PHONE ? 90 : 150)) R.sepHold += dt; else R.sepHold = 0;
      if (R.sepHold > 0.3 && !R.flag.rays) { R.flag.rays = true; Sound.success(); badge('두 광선이 멀리 떨어졌어요!', W / 2, 34 * FS, COL.good); }
      if (R.extOn && R.extT >= 1) R.extHold += dt; else R.extHold = 0;
      if (R.extHold > 0.3 && !R.flag.ext) { R.flag.ext = true; Sound.success(); }
    } else if (scene === 'eye') {
      const P2 = plrP2(), k = (PLG.mx - EY.x) / (P2.x - EY.x), qy = EY.y + (P2.y - EY.y) * k;
      const ys = mirrorYs(), vis = qy >= ys[0] && qy <= ys[1];
      EY.vis = vis; EY.shown = approach(EY.shown, vis ? 1 : 0, dt, 12);
      if (EY.last) { if (vis) EY.moved += Math.hypot(EY.x - EY.last.x, EY.y - EY.last.y); }
      EY.last = { x: EY.x, y: EY.y };
      if (EY.moved >= 260 && !EY.flag.moved) { EY.flag.moved = true; Sound.success(); badge('눈을 옮겨도 상은 그 자리에 있어요!', W / 2, H - 28 * FS, COL.good); }
      if (!vis && EY.moved > 20) EY.blind += dt; else EY.blind = Math.max(0, EY.blind - dt);
      if (EY.blind >= 0.6 && !EY.flag.blind) { EY.flag.blind = true; Sound.success(); badge('거울에 비치지 않는 곳이에요', W / 2, H - 28 * FS, COL.warn); }
    }
  }
  function arrowHead(x, y, ux, uy, color, s) {
    s = s || 8;
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = 'rgba(4,7,20,.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + ux * s, y + uy * s); ctx.lineTo(x - ux * s * 0.7 - uy * s * 0.75, y - uy * s * 0.7 + ux * s * 0.75); ctx.lineTo(x - ux * s * 0.7 + uy * s * 0.75, y - uy * s * 0.7 - ux * s * 0.75); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
  function handleDot(x, y, color, lift, label) {
    softShadow(x + 3, y + 12, 15 + 4 * lift, 5, 0.3);
    ctx.save();
    ctx.translate(x, y - 3 * lift); ctx.scale(1 + 0.12 * lift, 1 + 0.12 * lift);
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 8 + 8 * lift; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.restore();
    if (label) pill(label, x - 66 * FS, y, { color, size: 13 });
  }
  function raySet(P, Ay, label, idx, ent, t, showArcs) {
    const g = PLG, R = PLR, A = { x: g.mx, y: Ay }, P2 = plrP2();
    const dIn = unit({ x: A.x - P.x, y: A.y - P.y }), dOut = { x: -dIn.x, y: dIn.y };
    const far = toEdge(A, dOut, 16);
    beam([P, A], { color: '#ffd45e', width: 2.5, alpha: ent });
    beam([A, far], { color: '#ffd45e', width: 2.5, alpha: ent });
    // 화살촉 (빛이 가는 방향)
    const m1 = { x: (P.x + A.x) / 2, y: (P.y + A.y) / 2 }, m2 = { x: (A.x + far.x) / 2, y: (A.y + far.y) / 2 };
    arrowHead(m1.x, m1.y, dIn.x, dIn.y, '#ffe9a0', 8); arrowHead(m2.x, m2.y, dOut.x, dOut.y, '#ffe9a0', 8);
    glowDot(A.x, A.y, 20, '#ffd45e', 0.6 * ent);
    // 법선과 각도 (입사각 = 반사각)
    dashed(A.x + 6, A.y, A.x - 96, A.y, 'rgba(255,255,255,.65)', 1.5, [5, 5]);
    const nA = Math.PI, aIn = near(Math.atan2(-dIn.y, -dIn.x), nA), aOut = near(Math.atan2(dOut.y, dOut.x), nA);
    angleArc(A.x, A.y, 40, nA, aIn, COL.inc, 0.25); angleArc(A.x, A.y, 52, nA, aOut, COL.ref, 0.2);
    const ang = Math.round(Math.abs(aIn - nA) / DEG);
    // 연장선 (점선) : 거울 뒤로
    if (R.extT > 0.01) {
      const ex = A.x + (P2.x - A.x) * R.extT, ey = A.y + (P2.y - A.y) * R.extT;
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = RM ? 0 : -t * 22;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    }
    return { A, ang, dOut };
  }
  function drawRaysScene(dt, t) {
    const g = PLG, R = PLR, ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1)), eyeMode = scene === 'eye';
    drawBG(); drawTable(ent);
    drawVMirror(g.mx, g.y0, g.y1, t, ent);
    pill('평면거울', g.mx - 4, g.y0 - 24 * FS, { color: '#cbd5e1', size: 13, alpha: ent, fit: true });
    const P = plrP(), P2 = plrP2();
    // 물체 카드 (P = 빛이 나오는 한 점)
    drawFCard(R.cx, R.cy, g.card, { dot: true, alpha: ent, lift: R.lift.C });
    glowDot(P.x, P.y, 20, '#ff6b76', 0.55 * ent);
    // 상 카드 (별을 놓거나 눈 장면에서 나타나요)
    const gh = eyeMode ? 1 : R.ghost;
    if (gh > 0.02) {
      ctx.save(); ctx.globalAlpha *= gh; ctx.translate(P2.x, P2.y); ctx.scale(0.8 + 0.2 * gh, 0.8 + 0.2 * gh); ctx.translate(-P2.x, -P2.y);
      drawFCard(2 * g.mx - R.cx, R.cy, g.card, { ghost: true, flip: true, dot: true });
      ctx.restore();
      pill('상', P2.x + 4, R.cy + g.card / 2 + 22 * FS, { color: '#9ec5ff', size: 13, alpha: gh });
    }
    if (!eyeMode) {
      const ra = raySet(P, R.ay, '①', 0, ent, t), rb = raySet(P, R.by, '②', 1, ent, t);
      R.angs = [ra.ang, rb.ang];
      handleDot(ra.A.x, R.ay, '#f26b3a', R.lift.A, null); handleDot(rb.A.x, R.by, '#f26b3a', R.lift.B, null);
      if (!PHONE) {
        pill('① 입사각 = 반사각 = ' + ra.ang + '°', ra.A.x + 108, R.ay + (R.ay < P.y ? -24 : 24), { color: COL.inc, size: 13, alpha: ent, fit: true });
        pill('② 입사각 = 반사각 = ' + rb.ang + '°', rb.A.x + 108, R.by + (R.by < P.y ? -24 : 24), { color: COL.inc, size: 13, alpha: ent, fit: true });
      } else {
        pill('①', ra.A.x + 30, R.ay + (R.ay < P.y ? -22 : 22), { color: COL.inc, size: 13, alpha: ent });
        pill('②', rb.A.x + 30, R.by + (R.by < P.y ? -22 : 22), { color: COL.inc, size: 13, alpha: ent });
      }
      pill('물체의 한 점', P.x - 8, P.y - g.card / 2 - 20 * FS, { color: '#ff8a93', size: 12.5, alpha: ent, fit: true });
      if (R.extT > 0.5 && !PHONE) { const lo = R.ay > R.by ? R.ay : R.by; pill('반사 광선의 연장선', (g.mx + P2.x) / 2 + 56, (lo + P2.y) / 2 + 26, { color: '#ffffff', size: 12.5, alpha: clamp((R.extT - 0.5) * 2, 0, 1), fit: true }); }
      // 별 (상의 위치?)
      const star = { x: R.sx, y: R.sy };
      softShadow(star.x + 3, star.y + 16, 16 + 4 * R.lift.S, 5, 0.3);
      if (R.placed) glowDot(star.x, star.y, 44, '#fde047', 0.6);
      ctx.save(); ctx.translate(star.x, star.y - 3 * R.lift.S); ctx.scale(1 + 0.14 * R.lift.S, 1 + 0.14 * R.lift.S);
      ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 8 + 8 * R.lift.S; ctx.shadowOffsetY = 3;
      starShape(0, 0, 19, 8.5); ctx.fillStyle = R.placed ? '#fde047' : '#fbbf24'; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.lineWidth = 2.4; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      if (!R.placed) pill('상의 위치 ★', star.x, star.y + 30 * FS, { color: '#fbbf24', size: 12.5, alpha: ent, fit: true });
      if (R.extT >= 1 && !R.placed) txt('연장선이 만나는 곳에 ★를 놓아요', clamp(P2.x, 130 * FS, W - 130 * FS), H - 30 * FS, { size: 13.5, color: '#fde68a', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
      else if (!R.flag.rays && !R.dragged) txt('주황색 점을 끌어 두 광선을 벌려 보세요', clamp(g.mx - (PHONE ? 100 : 150), 120 * FS, W - 120 * FS), H - 30 * FS, { size: 13.5, color: '#fde68a', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
      if (isNew('rays')) newTag(g.mx - 24, R.ay - 30, 48, 60);
    } else {
      // ----- 눈의 위치 -----
      const ys0 = mirrorYs();
      ctx.save(); ctx.globalAlpha *= ent;
      const wg = ctx.createLinearGradient(P2.x, 0, 20, 0);
      wg.addColorStop(0, 'rgba(125,211,252,.0)'); wg.addColorStop(0.45, 'rgba(125,211,252,.10)'); wg.addColorStop(1, 'rgba(125,211,252,.05)');
      const ex0 = 20, kk = (P2.x - ex0) / (P2.x - g.mx);
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(g.mx, ys0[0]); ctx.lineTo(g.mx, ys0[1]);
      ctx.lineTo(ex0, P2.y + (ys0[1] - P2.y) * kk); ctx.lineTo(ex0, P2.y + (ys0[0] - P2.y) * kk); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,.4)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(g.mx, ys0[0]); ctx.lineTo(ex0, P2.y + (ys0[0] - P2.y) * kk); ctx.moveTo(g.mx, ys0[1]); ctx.lineTo(ex0, P2.y + (ys0[1] - P2.y) * kk); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      pill('상이 보이는 구역', g.mx - (PHONE ? 70 : 100), g.y1 + (PHONE ? 26 : 34), { color: '#7dd3fc', size: 12.5, alpha: ent * 0.9, fit: true });
      const k = (g.mx - EY.x) / (P2.x - EY.x), qy = EY.y + (P2.y - EY.y) * k, Q = { x: g.mx, y: qy }, vis = EY.vis;
      if (vis) {
        const a = EY.shown;
        const le = Math.hypot(Q.x - EY.x, Q.y - EY.y) || 1, stop = { x: EY.x + (Q.x - EY.x) * (44 * (PHONE ? 0.8 : 1) / le), y: EY.y + (Q.y - EY.y) * (44 * (PHONE ? 0.8 : 1) / le) };
        beam([P, Q], { color: '#ffd45e', width: 2.6, alpha: a * ent });
        beam([Q, stop], { color: '#ffd45e', width: 2.6, alpha: a * ent });
        const d1 = unit({ x: Q.x - P.x, y: Q.y - P.y }), d2 = unit({ x: stop.x - Q.x, y: stop.y - Q.y });
        arrowHead((P.x + Q.x) / 2, (P.y + Q.y) / 2, d1.x, d1.y, '#ffe9a0', 8); arrowHead((Q.x + stop.x) / 2, (Q.y + stop.y) / 2, d2.x, d2.y, '#ffe9a0', 8);
        glowDot(Q.x, Q.y, 22, '#ffd45e', 0.7 * a);
        if (!RM && NOW() % 0.12 < dt * 1.2) sparkAt(dt, Q.x - 4, Q.y, '#fff3c4', 0.05, 2.2);
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.globalAlpha *= a;
        ctx.beginPath(); ctx.moveTo(Q.x, Q.y); ctx.lineTo(P2.x, P2.y); ctx.stroke(); ctx.restore();
        pill('눈에는 빛이 상에서 온 것처럼 보여요', clamp((Q.x + P2.x) / 2 + 20, 150 * FS, W - 150 * FS), clamp((Q.y + P2.y) / 2 + (qy < P2.y ? -30 : 30), 30, H - 20), { color: '#ffffff', size: 12.5, alpha: a * ent, fit: true });
      } else {
        // 거울 밖을 지나가요
        const cy2 = clamp(qy, 20, H - 20);
        dashed(EY.x, EY.y, g.mx, qy, 'rgba(251,113,133,.7)', 1.8, [6, 7]);
        ctx.save(); ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.mx - 9, cy2 - 9); ctx.lineTo(g.mx + 9, cy2 + 9); ctx.moveTo(g.mx + 9, cy2 - 9); ctx.lineTo(g.mx - 9, cy2 + 9); ctx.stroke(); ctx.restore();
        pill('눈에서 상으로 가는 길이 거울을 비켜 가서 상이 안 보여요', W / 2, H - 28 * FS, { solid: true, color: '#e11d48', size: 13, fit: true });
      }
      handleEyeNode(t, ent, vis);
      if (!EY.flag.moved) txt('↕ 눈을 끌어서 옮겨 보세요', clamp(EY.x + 20, 100 * FS, W - 100 * FS), EY.y + 76 * FS, { size: 13, color: '#fde68a', alpha: 0.6 + 0.4 * Math.sin(t * 4) });
      if (isNew('eye')) newTag(EY.x - 50, EY.y - 24, 100, 48);
    }
  }
  function handleEyeNode(t, ent, vis) {
    const sc = (PHONE ? 0.8 : 1) * (1 + 0.08 * EY.lift);
    ctx.save(); ctx.globalAlpha *= ent;
    softShadow(EY.x + 4, EY.y + 34 * sc, 34 * sc, 8, 0.3);
    const P2 = plrP2();
    drawEye(EY.x, EY.y - 3 * EY.lift, sc, PLG.mx - EY.x, (vis ? (EY.y < P2.y ? 20 : -20) : 0) , { glow: vis ? 0.5 : 0 });
    ctx.restore();
    pill(vis ? '보여요 👀' : '안 보여요 🚫', EY.x, EY.y + 48 * FS * (PHONE ? 0.85 : 1), { color: vis ? '#4ade80' : '#fb7185', size: 12.5, alpha: ent });
  }
  const eyeHit = (p) => Math.hypot(p.x - EY.x, p.y - EY.y) <= 44;
  function raysDown(p) {
    const R = PLR, g = PLG;
    if (scene === 'eye') {
      if (eyeHit(p)) { EY.drag = true; R.off = { x: p.x - EY.x, y: p.y - EY.y }; hideHint(); return true; }
      return false;
    }
    if (Math.hypot(p.x - R.sx, p.y - R.sy) <= 32) { R.drag = 'S'; R.off = { x: p.x - R.sx, y: p.y - R.sy }; R.placed = false; R.flag.star = false; R.dragged = true; Sound.click(); hideHint(); return true; }
    if (Math.hypot(p.x - g.mx, p.y - R.ay) <= 30) { R.drag = 'A'; R.dragged = true; R.sel = 'A'; Sound.click(); hideHint(); return true; }
    if (Math.hypot(p.x - g.mx, p.y - R.by) <= 30) { R.drag = 'B'; R.dragged = true; R.sel = 'B'; Sound.click(); hideHint(); return true; }
    if (game && game.free && Math.hypot(p.x - R.cx, p.y - R.cy) <= g.card / 2 + 14) { R.drag = 'C'; R.off = { x: p.x - R.cx, y: p.y - R.cy }; hideHint(); return true; }
    return false;
  }
  function raysMove(p) {
    const R = PLR, g = PLG, ys = mirrorYs();
    if (scene === 'eye') {
      if (EY.drag) { EY.x = clamp(p.x - R.off.x, 44, g.mx - 54); EY.y = clamp(p.y - R.off.y, 40, H - 60); }
      return;
    }
    if (R.drag === 'A') R.ay = clamp(p.y, ys[0], ys[1]);
    else if (R.drag === 'B') R.by = clamp(p.y, ys[0], ys[1]);
    else if (R.drag === 'S') { R.sx = clamp(p.x - R.off.x, 20, W - 20); R.sy = clamp(p.y - R.off.y, 20, H - 20); }
    else if (R.drag === 'C') {
      const nx = clamp(p.x - R.off.x, 60, g.mx - 120), ny = clamp(p.y - R.off.y, g.y0 + 40, g.y1 - 40);
      R.cx = nx; R.cy = ny;
      if (R.placed && Math.hypot(R.sx - plrP2().x, R.sy - plrP2().y) > 34) { R.placed = false; R.flag.star = false; }
    }
  }
  function raysUp() {
    const R = PLR;
    if (R.drag === 'S') {
      const P2 = plrP2();
      if (Math.hypot(R.sx - P2.x, R.sy - P2.y) <= 30) {
        R.placed = true; R.flag.star = true; Sound.success();
        if (R.tw) R.tw.cancel();
        R.tw = SciSim.tween(R, { sx: P2.x, sy: P2.y }, { duration: 0.4, ease: 'outBack' });
        celebrate(P2.x, P2.y, 40); badge('상의 위치를 찾았어요!', W / 2, 34 * FS, COL.good);
      }
    }
    R.drag = null; EY.drag = false;
  }
  function raysReset() {
    const R = PLR;
    R.ay = PLG.cy - 22; R.by = PLG.cy + 40; R.extOn = false; R.placed = false; R.sx = PLG.mx + (W - PLG.mx) * 0.72; R.sy = PLG.cy + (PHONE ? 70 : 104);
    R.flag = { rays: false, ext: false, star: false }; R.sepHold = 0; R.extHold = 0; R.dragged = false; R.cx = PLG.mx - 6.2 * PLG.cm; R.cy = PLG.cy;
    $('#extBtn').setAttribute('aria-pressed', 'false');
  }
  function eyeReset() { EY.x = PHONE ? 66 : 96; EY.y = PLG.cy - (PHONE ? 90 : 128); EY.moved = 0; EY.blind = 0; EY.flag = { moved: false, blind: false }; EY.last = null; }

  /* =========================================================
     장면 ③ 볼록·오목 거울 / ④ 볼록·오목 렌즈 : 광학대 (옆에서 본 모습)
     상은 주요 광선 두 줄기가 만나는 곳(또는 그 연장선이 만나는 곳)에 그려요.
     상의 위치·크기는 계산해서 보여 주지 않고, 크기·방향의 정성적 특징만 비교해요.
     ========================================================= */
  const BG_ = PHONE
    ? { ya: 258, f: 62, hh: 34, ap: 62, xm: 380, xl: 246, dmin: 26, dmax: 208, fl: 66, ins: { x: 6, y: 6, w: 176, h: 84 }, cand: 34 }
    : { ya: 312, f: 100, hh: 56, ap: 98, xm: 566, xl: 340, dmin: 46, dmax: 332, fl: 104, ins: { x: 10, y: 10, w: 258, h: 112 }, cand: 56 };
  const BN = { mtype: 'convex', kap: -1, d: BG_.dmax * 0.55 + BG_.dmin * 0.45, dt: 0, drag: false, ox: 0, lift: 0, fade: 1, dragged: false, hold: { convex: 0, near: 0, far: 0 }, seen: { convex: false, near: false, far: false }, tw: null };
  const LN = { ltype: 'convex', kap: 1, d: BG_.dmax * 0.55 + BG_.dmin * 0.45, dt: 0, drag: false, ox: 0, lift: 0, fade: 1, dragged: false, hold: { cnear: 0, cfar: 0, vnear: 0, vfar: 0 }, seen: { cnear: false, cfar: false, vnear: false, vfar: false }, tw: null };
  BN.dt = BN.d; LN.dt = LN.d;
  const BPU = new Pulses(0.7, 460), LPU = new Pulses(0.7, 460);
  const Fm = () => BG_.f, Fl = () => BG_.fl;

  /* 거울 : 오목(+) / 볼록(−). 이상적인 거울 모형에서 평행 광선과 꼭짓점 광선의 교점이 상이에요. */
  function calcMirror() {
    const g = BG_, xe = g.xm, ya = g.ya, f = g.f, hh = g.hh, d = BN.d, conc = BN.mtype === 'concave';
    const T = { x: xe - d, y: ya - hh }, V = { x: xe, y: ya }, Fp = { x: conc ? xe - f : xe + f, y: ya };
    const V1 = { x: xe, y: T.y };
    const d1 = unit({ x: Fp.x - V1.x, y: Fp.y - V1.y });
    const dv = unit({ x: V.x - T.x, y: V.y - T.y }), d2 = { x: -dv.x, y: dv.y };
    const I = lineHit(V1, d1, V, d2);
    const dir1 = conc ? d1 : { x: -d1.x, y: -d1.y };
    const sagAt = (y) => (conc ? 1 : -1) * (y - ya) * (y - ya) / (4 * f);
    const H1 = { x: xe - sagAt(T.y), y: T.y };
    let r1 = dir1, real = false, m = 0, ok = !!I && Math.abs(I.x - xe) < 5000;
    if (ok) {
      real = I.x < xe - 1;
      r1 = real ? unit({ x: I.x - H1.x, y: I.y - H1.y }) : unit({ x: H1.x - I.x, y: H1.y - I.y });
      m = (ya - I.y) / hh;
    }
    return { T, V, H1, Fp, I: ok ? I : null, real, m, r1, r2: d2, conc, d, xe, ya, f, hh };
  }
  /* 렌즈 : 볼록(+) / 오목(−) 이상적인 얇은 렌즈 */
  function calcLens() {
    const g = BG_, xe = g.xl, ya = g.ya, f = g.fl, hh = g.hh, d = LN.d, conv = LN.ltype === 'convex';
    const T = { x: xe - d, y: ya - hh }, V = { x: xe, y: ya }, H1 = { x: xe, y: T.y };
    const dir1 = conv ? unit({ x: f, y: ya - T.y }) : unit({ x: f, y: T.y - ya });
    const dir2 = unit({ x: V.x - T.x, y: V.y - T.y });
    const I = lineHit(H1, dir1, V, dir2);
    const ok = !!I && Math.abs(I.x - xe) < 5000;
    const real = ok && I.x > xe + 1, m = ok ? (ya - I.y) / hh : 0;
    return { T, V, H1, I: ok ? I : null, real, m, dir1, dir2, conv, d, xe, ya, f, hh };
  }
  const sizeWord = (m) => (Math.abs(m) > 1.12 ? '물체보다 커요' : Math.abs(m) < 0.89 ? '물체보다 작아요' : '물체와 크기가 같아요');
  const dirWord = (m) => (m > 0 ? '바로 서 있어요' : '거꾸로 서 있어요');
  const posWord = (d, f) => (Math.abs(d - f) < f * 0.07 ? '초점' : d < f ? '초점 안쪽' : '초점 바깥쪽');

  function stepBench(dt) {
    BN.d = approach(BN.d, BN.dt, dt, 18); LN.d = approach(LN.d, LN.dt, dt, 18);
    BN.lift = approach(BN.lift, BN.drag ? 1 : 0, dt, 14); LN.lift = approach(LN.lift, LN.drag ? 1 : 0, dt, 14);
    BN.kap = approach(BN.kap, BN.mtype === 'concave' ? 1 : -1, dt, 9);
    LN.kap = approach(LN.kap, LN.ltype === 'convex' ? 1 : -1, dt, 9);
    BN.fade = approach(BN.fade, 1, dt, 6); LN.fade = approach(LN.fade, 1, dt, 6);
    if (scene === 'mirror') {
      const c = calcMirror(), vis = c.I && Math.abs(c.m) <= 3.4 && BN.fade > 0.9;
      const conds = { convex: BN.mtype === 'convex' && vis, near: BN.mtype === 'concave' && vis && c.d < c.f - 10 && c.m > 0, far: BN.mtype === 'concave' && vis && c.d > c.f + 10 && c.m < 0 };
      const msg = { convex: '볼록 거울: 작고 바로 선 상!', near: '오목 거울(가까이): 크고 바로 선 상!', far: '오목 거울(멀리): 거꾸로 선 상!' };
      Object.keys(conds).forEach((k) => {
        if (conds[k]) BN.hold[k] += dt; else BN.hold[k] = 0;
        if (BN.hold[k] >= 0.9 && !BN.seen[k]) { BN.seen[k] = true; Sound.success(); badge(msg[k], W / 2, 34 * FS, COL.good, 2.6); }
      });
    } else if (scene === 'lens') {
      const c = calcLens(), vis = c.I && Math.abs(c.m) <= 3.4 && LN.fade > 0.9;
      const conds = {
        cnear: LN.ltype === 'convex' && vis && c.d < c.f - 10 && c.m > 0, cfar: LN.ltype === 'convex' && vis && c.d > c.f + 10 && c.m < 0,
        vnear: LN.ltype === 'concave' && vis && c.d < c.f, vfar: LN.ltype === 'concave' && vis && c.d > c.f * 1.6,
      };
      const msg = { cnear: '볼록 렌즈(가까이): 크고 바로 선 상! (돋보기)', cfar: '볼록 렌즈(멀리): 거꾸로 선 상!', vnear: '오목 렌즈(가까이): 작고 바로 선 상!', vfar: '오목 렌즈(멀리): 역시 작고 바로 선 상!' };
      Object.keys(conds).forEach((k) => {
        if (conds[k]) LN.hold[k] += dt; else LN.hold[k] = 0;
        if (LN.hold[k] >= 0.9 && !LN.seen[k]) { LN.seen[k] = true; Sound.success(); badge(msg[k], W / 2, 34 * FS, COL.good, 2.8); }
      });
    }
  }

  function drawMirrorBody(xe, ya, ap, f, kap, ent) {
    ctx.save(); ctx.globalAlpha *= ent;
    const N = 28, th = 13;
    const sag = (y) => kap * (y - ya) * (y - ya) / (4 * f);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const y = ya - ap + (2 * ap * i) / N; i ? ctx.lineTo(xe - sag(y), y) : ctx.moveTo(xe - sag(y), y); }
    for (let i = N; i >= 0; i--) { const y = ya - ap + (2 * ap * i) / N; ctx.lineTo(xe - sag(y) + th, y); }
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,10,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 4;
    const gb = ctx.createLinearGradient(xe - 10, 0, xe + th + 6, 0);
    gb.addColorStop(0, '#6b7ba3'); gb.addColorStop(1, '#1a2342');
    ctx.fillStyle = gb; ctx.fill();
    ctx.shadowColor = 'transparent';
    // 반사면 (은색)
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const y = ya - ap + (2 * ap * i) / N; i ? ctx.lineTo(xe - sag(y), y) : ctx.moveTo(xe - sag(y), y); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8fa4cf'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#f2f7ff'; ctx.lineWidth = 3.4; ctx.stroke();
    if (!RM) {
      const sy = ya - ap - 90 + (((NOW() * 0.2) % 1.6) / 1.6) * (2 * ap + 180);
      ctx.save(); ctx.beginPath();
      for (let i = 0; i <= N; i++) { const y = ya - ap + (2 * ap * i) / N; i ? ctx.lineTo(xe - sag(y), y) : ctx.moveTo(xe - sag(y), y); }
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0)'; ctx.stroke();
      const gs = ctx.createLinearGradient(0, sy - 50, 0, sy + 50);
      gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,255,255,.95)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gs; ctx.lineWidth = 4; ctx.globalCompositeOperation = 'lighter'; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawLensBody(xe, ya, ap, kap, ent) {
    ctx.save(); ctx.globalAlpha *= ent;
    const k = (kap + 1) / 2, N = 30;
    const wv = (u) => lerp(3.5 + 12.5 * u * u, 16 * (1 - u * u) + 1.6, k);
    const edge = (sign) => { for (let i = 0; i <= N; i++) { const u = -1 + (2 * i) / N, y = ya + u * ap; const x = xe + sign * wv(u); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
    ctx.beginPath(); edge(-1);
    for (let i = N; i >= 0; i--) { const u = -1 + (2 * i) / N; ctx.lineTo(xe + wv(u), ya + u * ap); }
    ctx.closePath();
    ctx.shadowColor = 'rgba(40,200,255,.35)'; ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(xe - 20, 0, xe + 20, 0);
    g.addColorStop(0, 'rgba(160,235,255,.42)'); g.addColorStop(0.5, 'rgba(110,205,240,.26)'); g.addColorStop(1, 'rgba(160,235,255,.4)');
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(200,245,255,.95)'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 3; i <= N / 2; i++) { const u = -1 + (2 * i) / N, y = ya + u * ap, x = xe - wv(u) + 4; i > 3 ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
  }
  function focusMark(x, y, label, ent) {
    ctx.save(); ctx.globalAlpha *= ent;
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (label) pill(label, x, y + 46 * FS, { color: '#fde68a', size: 12, alpha: ent });
  }

  /* 눈에 보이는 상 (작은 창): 왼쪽은 물체, 오른쪽은 상의 크기·방향대로 그린 촛불 */
  function drawViewInset(c, ent, t) {
    const p = BG_.ins, m = c.m, has = !!c.I;
    ctx.save(); ctx.globalAlpha *= ent;
    ctx.shadowColor = 'rgba(0,0,10,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(p.x, p.y, p.w, p.h, 14); ctx.fillStyle = 'rgba(11,18,42,.95)'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(125,211,252,.6)'; ctx.stroke();
    ctx.save(); rr(p.x, p.y, p.w, p.h, 14); ctx.clip();
    txt('👁 눈에 보이는 상', p.x + 10 * FS, p.y + 13 * FS, { size: 12, align: 'left', color: '#bcd0f5', halo: false });
    const top = p.y + 26 * FS, bottom = p.y + p.h - 17 * FS, avail = bottom - top, unitH = avail / 2.4;
    const cxo = p.x + p.w * 0.27, cxi = p.x + p.w * 0.72;
    drawCandle(cxo, bottom, unitH, { glow: 0.5 });
    txt('물체', cxo, p.y + p.h - 8 * FS, { size: 11.5, color: '#fcd34d', halo: false });
    txt('상', cxi, p.y + p.h - 8 * FS, { size: 11.5, color: '#9ec5ff', halo: false });
    ctx.strokeStyle = 'rgba(160,185,235,.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(p.x + p.w * 0.5, top); ctx.lineTo(p.x + p.w * 0.5, p.y + p.h - 18 * FS); ctx.stroke(); ctx.setLineDash([]);
    if (has) {
      ctx.globalAlpha *= sstep(5.4, 3.6, Math.abs(m));
      const hp = unitH * clamp(Math.abs(m), 0.14, 2.4) * sgn(m);
      if (m > 0) drawCandle(cxi, bottom, hp, { glow: 0.5 });
      else drawCandle(cxi, top, hp, { glow: 0.5 });
    } else txt('?', cxi, p.y + p.h / 2 + 4, { size: 28, color: 'rgba(160,175,215,.7)', halo: false });
    ctx.restore();
    ctx.restore();
    const cap = !has ? '상이 생기지 않아요' : Math.abs(m) > 3.6 ? '아주 크게 보여요' : (Math.abs(m) > 1.12 ? '큰 ' : Math.abs(m) < 0.89 ? '작은 ' : '같은 크기의 ') + (m > 0 ? '바로 선 상' : '거꾸로 선 상');
    pill(cap, p.x + p.w / 2, p.y + p.h + 17 * FS, { color: '#7dd3fc', size: 12.5, alpha: ent });
  }

  function drawBenchScene(kind, dt, t) {
    const g = BG_, ya = g.ya, ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1));
    const isM = kind === 'mirror', st = isM ? BN : LN;
    const c = isM ? calcMirror() : calcLens(), xe = c.xe;
    drawBG();
    // 광학대 (축)
    ctx.save(); ctx.globalAlpha *= ent;
    ctx.strokeStyle = 'rgba(190,205,245,.35)'; ctx.lineWidth = 1.6; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(24, ya); ctx.lineTo(W - 24, ya); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 렌즈·거울 + 초점
    if (isM) {
      drawMirrorBody(xe, ya, g.ap, g.f, BN.kap, ent);
      focusMark(c.conc ? xe - g.f : xe + g.f, ya, '초점', ent);
      pill(c.conc ? '오목 거울' : '볼록 거울', xe + 14, ya - g.ap - 24 * FS, { color: '#cbd5e1', size: 13, alpha: ent, fit: true });
    } else {
      drawLensBody(xe, ya, g.ap, LN.kap, ent);
      focusMark(xe - g.fl, ya, '초점', ent); focusMark(xe + g.fl, ya, '초점', ent);
      pill(c.conv ? '볼록 렌즈' : '오목 렌즈', xe, ya - g.ap - 24 * FS, { color: '#cbd5e1', size: 13, alpha: ent, fit: true });
    }
    // 광선
    const a = ent * st.fade, bw = 2.5, col = '#ffd45e';
    const T = c.T, V = c.V;
    let p1, p2, ext = [];
    if (isM) {
      p1 = [T, c.H1, toEdge(c.H1, c.r1, 16)]; p2 = [T, V, toEdge(V, c.r2, 16)];
      if (c.I && !c.real) ext = [[c.H1, c.I], [V, c.I]];
    } else {
      p1 = [T, c.H1, toEdge(c.H1, c.dir1, 16)]; p2 = [T, V, toEdge(V, c.dir2, 16)];
      if (c.I && !c.real) ext = [[c.H1, c.I], [T, c.I]];
    }
    beam(p1, { color: col, width: bw, alpha: a }); beam(p2, { color: col, width: bw, alpha: a });
    const P1 = makePath(p1), P2 = makePath(p2), pu = isM ? BPU : LPU;
    pu.update(dt, P1, ent > 0.9 && a > 0.8); pu.draw(P1, col, 2.8);
    // 점선(연장선): 빛이 실제로 모이지는 않지만 눈은 그 방향에서 온 것으로 느껴요
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = RM ? 0 : -t * 20;
    ext.forEach(([s, e]) => { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); });
    ctx.restore();
    if (ext.length && a > 0.7 && !PHONE) { const s0 = ext[0][0], e0 = ext[0][1]; if (Math.hypot(e0.x - s0.x, e0.y - s0.y) > 120) pill('연장선(점선)', (s0.x + e0.x) / 2, (s0.y + e0.y) / 2 - 18, { color: '#ffffff', size: 12, alpha: a, fit: true }); }
    glowDot(c.H1.x, c.H1.y, 15, col, 0.5 * a); glowDot(V.x, V.y, 15, col, 0.5 * a);
    if (isM && ent > 0.9) sparkAt(dt, V.x - 3, V.y, '#fff3c4', 0.2, 2.2);
    // 상
    if (c.I) {
      const I = c.I, fadeI = sstep(5.6, 3.7, Math.abs(c.m)) * a;
      if (fadeI > 0.01) {
        const ih = c.m * g.hh;
        ctx.save(); ctx.globalAlpha *= fadeI;
        if (c.real) glowDot(I.x, I.y, 46, '#ffe08a', 0.35);
        drawCandle(I.x, ya, ih, { ghost: !c.real, alpha: c.real ? 1 : 0.6, glow: 1.2, ph: 2 });
        if (!c.real) { ctx.strokeStyle = 'rgba(200,220,255,.75)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; const bx = Math.max(18, Math.abs(ih) * 0.17 * 1.2); rr(I.x - bx - 8, Math.min(ya, ya - ih) - 6, bx * 2 + 16, Math.abs(ih) + 12, 10); ctx.stroke(); ctx.setLineDash([]); }
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= fadeI; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(I.x, I.y, 4, 0, TAU); ctx.fill(); ctx.restore();
        const ly = clamp(ih > 0 ? I.y - 22 * FS : I.y + 24 * FS, 24, H - 22);
        pill('상', clamp(I.x, 24, W - 24), ly, { color: '#9ec5ff', size: 13, alpha: fadeI, fit: true });
      } else if (a > 0.5) pill('상이 아주 커져서 화면 밖으로 나가요', W / 2 + (PHONE ? 0 : 60), H - 28 * FS, { color: '#fbbf24', size: 13, fit: true });
    } else if (a > 0.5) pill('초점: 빛이 나란히 나가서 상이 생기지 않아요', W / 2 + (PHONE ? 0 : 60), H - 28 * FS, { color: '#fbbf24', size: 13, fit: true });
    // 물체 (촛불)
    ctx.save(); ctx.globalAlpha *= ent;
    softShadow(T.x + 4, ya + 4, 24, 5, 0.3);
    drawCandle(T.x, ya - 2 * st.lift, g.hh, { glow: 1 });
    ctx.restore();
    pill('물체', T.x, ya + 24 * FS, { color: '#fcd34d', size: 12.5, alpha: ent, fit: true });
    if (!st.dragged && ent > 0.9) txt('↔ 촛불을 끌어 보세요', clamp(T.x, 90 * FS, W - 90 * FS), ya - g.hh - 24 * FS, { size: 13, color: '#fde68a', alpha: 0.55 + 0.4 * Math.sin(t * 4) });
    if (isNew(isM ? 'mirror' : 'lens')) newTag(xe - 40, ya - g.ap - 40, 80, 24);
    drawViewInset(c, ent, t);
    benchInfo = { m: c.I ? c.m : null, d: c.d, f: isM ? c.f : c.f, real: c.real };
  }
  let benchInfo = null;
  function setBenchD(kind, d, user) {
    const st = kind === 'mirror' ? BN : LN, lo = BG_.dmin, hi = BG_.dmax;
    st.dt = clamp(d, lo, hi);
    if (user) st.d = st.dt;
  }
  /* 슬라이더 눈금: 초점 안쪽(가까이)·초점 근처(상이 아주 커지는 구간)·초점 바깥쪽(멀리)을 고르게 나눠 써요 */
  function benchBreaks(kind) { const f = kind === 'mirror' ? BG_.f : BG_.fl; return [BG_.dmin, f * 0.72, f * 1.3, BG_.dmax]; }
  function vToD(kind, v) {
    const [lo, a, b, hi] = benchBreaks(kind); v = clamp(v, 0, 100);
    return v <= 30 ? lo + (a - lo) * v / 30 : v <= 45 ? a + (b - a) * (v - 30) / 15 : b + (hi - b) * (v - 45) / 55;
  }
  function benchSlider(kind) {
    const st = kind === 'mirror' ? BN : LN, [lo, a, b, hi] = benchBreaks(kind), d = clamp(st.dt, lo, hi);
    return Math.round(d <= a ? 30 * (d - lo) / (a - lo) : d <= b ? 30 + 15 * (d - a) / (b - a) : 45 + 55 * (d - b) / (hi - b));
  }
  const benchHit = (kind, p) => {
    const st = kind === 'mirror' ? BN : LN, x = (kind === 'mirror' ? BG_.xm : BG_.xl) - st.d;
    return Math.abs(p.x - x) <= 40 && p.y >= BG_.ya - BG_.hh - 40 && p.y <= BG_.ya + 34;
  };

  /* =========================================================
     장면 ③-2 거울 쓰임 짝짓기 · ④-2 렌즈 사례 분류 (카드를 끌어 상자에 놓기)
     ========================================================= */
  const SORTS = {
    sortM: {
      title: '거울 쓰임 짝짓기',
      bins: [
        { id: 'plane', label: '평면거울', color: '#7dd3fc', icon: 'plane' },
        { id: 'convex', label: '볼록 거울', color: '#c4b5fd', icon: 'mconvex' },
        { id: 'concave', label: '오목 거울', color: '#fdba74', icon: 'mconcave' },
      ],
      cards: [
        { t: '전신 거울', e: '🧍', bin: 'plane', why: '내 모습을 같은 크기의 바로 선 상으로 보여 줘요.', hint: '실제 모습과 크기가 같게 보여야 해요.' },
        { t: '자동차 옆 거울', e: '🚗', bin: 'convex', why: '넓은 범위를 작은 상으로 보여 줘서 뒤쪽 상황을 많이 볼 수 있어요.', hint: '넓은 범위가 보이는 거울이에요.' },
        { t: '화장용 확대 거울', e: '💄', bin: 'concave', why: '가까이 대면 크고 바로 선 상이 보여요.', hint: '얼굴을 크게 보여 주는 거울이에요.' },
        { t: '도로 모퉁이 반사경', e: '🛣️', bin: 'convex', why: '넓은 범위가 작게 비쳐서 커브길 건너편을 볼 수 있어요.', hint: '넓은 범위를 한눈에 보는 거울이에요.' },
        { t: '손전등 반사판', e: '🔦', bin: 'concave', why: '빛을 모아 한쪽으로 보내 주는 오목한 거울이에요.', hint: '안쪽으로 오목하게 들어간 거울이에요.' },
        { t: '세면대 거울', e: '🚿', bin: 'plane', why: '평평해서 있는 그대로의 크기로 비춰 줘요.', hint: '평평한 거울이에요.' },
      ],
    },
    sortL: {
      title: '렌즈 사례 분류',
      bins: [
        { id: 'convex', label: '볼록 렌즈', color: '#7dd3fc', icon: 'lconvex' },
        { id: 'concave', label: '오목 렌즈', color: '#fda4af', icon: 'lconcave' },
      ],
      cards: [
        { t: '돋보기', e: '🔍', bin: 'convex', why: '가까이 대면 물체가 크고 바로 선 상으로 보여요.', hint: '가운데가 볼록한 렌즈예요.' },
        { t: '근시 안경', e: '🤓', bin: 'concave', why: '물체가 작고 바로 선 상으로 보이게 하는 오목 렌즈예요.', hint: '가운데가 오목한 렌즈예요.' },
        { t: '카메라 렌즈', e: '📷', bin: 'convex', why: '멀리 있는 물체의 상을 모아 사진으로 남겨요.', hint: '빛을 모아서 상을 만들어요.' },
        { t: '원시 안경', e: '👓', bin: 'convex', why: '빛을 모아 주는 볼록 렌즈예요.', hint: '빛을 모아 주는 렌즈예요.' },
        { t: '현관문 도어 렌즈', e: '🚪', bin: 'concave', why: '문 밖의 넓은 범위가 작고 바로 선 상으로 보여요.', hint: '넓은 범위를 작게 보여 주는 렌즈예요.' },
        { t: '현미경 렌즈', e: '🔬', bin: 'convex', why: '작은 물체를 크게 보여 주는 볼록 렌즈예요.', hint: '작은 것을 크게 보여 줘요.' },
      ],
    },
  };
  const SORT = { kind: 'sortM', cards: [], bins: [], hot: -1, drag: -1, off: { x: 0, y: 0 }, wrong: 0, placed: { sortM: 0, sortL: 0 }, msg: null, tw: [], last: '' };
  function sortLayout(kind) {
    const S = SORTS[kind], n = S.cards.length, nb = S.bins.length;
    const cw = PHONE ? 150 : 196, ch = PHONE ? 46 : 58;
    const cols = PHONE ? 2 : 3, rows = Math.ceil(n / cols);
    const gx = PHONE ? 10 : 16, gy = PHONE ? 10 : 14;
    const totalW = cols * cw + (cols - 1) * gx, x0 = (W - totalW) / 2, y0 = PHONE ? 54 : 84;
    const homes = S.cards.map((c, i) => ({ x: x0 + (i % cols) * (cw + gx) + cw / 2, y: y0 + Math.floor(i / cols) * (ch + gy) + ch / 2 }));
    const bGap = PHONE ? 8 : 20, bw = (W - (PHONE ? 16 : 52) - bGap * (nb - 1)) / nb, bh = PHONE ? 160 : 210, by = H - bh - (PHONE ? 8 : 16), bx0 = (W - (nb * bw + (nb - 1) * bGap)) / 2;
    const bins = S.bins.map((b, i) => Object.assign({ x: bx0 + i * (bw + bGap), y: by, w: bw, h: bh, n: 0 }, b));
    return { cw, ch, homes, bins };
  }
  function sortSetup(kind) {
    SORT.kind = kind;
    const S = SORTS[kind], L = sortLayout(kind);
    SORT.L = L; SORT.bins = L.bins; SORT.wrong = 0; SORT.placed[kind] = 0; SORT.hot = -1; SORT.drag = -1; SORT.msg = null;
    const order = S.cards.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    SORT.cards = order.map((ci, slot) => ({ def: S.cards[ci], ci, x: L.homes[slot].x, y: L.homes[slot].y, hx: L.homes[slot].x, hy: L.homes[slot].y, placed: false, lift: 0, shake: 0, s: 0, bin: -1, appear: slot * 0.08, age: 0, sz: 0 }));
  }
  function sortSlot(bin, k) {                              // 상자 안에 놓인 k번째 카드의 자리
    const perRow = bin.w >= 330 ? 2 : (PHONE && bin.w >= 220 ? 2 : 1), w = bin.w - 20, cw = (w - (perRow - 1) * 8) / perRow, ch = PHONE ? 30 : 38;
    const r = Math.floor(k / perRow), c = k % perRow;
    return { x: bin.x + 10 + c * (cw + 8) + cw / 2, y: bin.y + (PHONE ? 62 : 84) + r * (ch + 6) + ch / 2, w: cw, h: ch };
  }
  function sortBinAt(p) { for (let i = 0; i < SORT.bins.length; i++) { const b = SORT.bins[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return i; } return -1; }
  function stepSort(dt) {
    SORT.cards.forEach((c) => {
      c.lift = approach(c.lift, SORT.drag >= 0 && SORT.cards[SORT.drag] === c ? 1 : 0, dt, 14);
      c.shake = Math.max(0, c.shake - dt);
      c.age += dt; c.s = clamp((c.age - c.appear) / 0.35, 0, 1);
      c.sz = approach(c.sz, c.placed ? 1 : 0, dt, 12);
    });
    if (SORT.msg) { SORT.msg.t += dt; if (SORT.msg.t > SORT.msg.dur) SORT.msg = null; }
  }
  function drawBinIcon(kind, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'plane') { ctx.strokeStyle = '#eaf2ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
    else if (kind === 'mconvex' || kind === 'mconcave') {
      const k = kind === 'mconvex' ? -1 : 1;
      ctx.beginPath(); for (let i = 0; i <= 12; i++) { const yy = -22 + 44 * i / 12, xx = -k * (yy * yy) / 70; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.strokeStyle = '#eaf2ff'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 12; i++) { const yy = -22 + 44 * i / 12, xx = -k * (yy * yy) / 70 + 8; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.strokeStyle = 'rgba(160,180,230,.45)'; ctx.lineWidth = 4; ctx.stroke();
    } else {
      const cv = kind === 'lconvex';
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const u = -1 + 2 * i / 14, w = cv ? 8 * (1 - u * u) + 1 : 2 + 7 * u * u; i ? ctx.lineTo(-w, u * 22) : ctx.moveTo(-w, u * 22); }
      for (let i = 14; i >= 0; i--) { const u = -1 + 2 * i / 14, w = cv ? 8 * (1 - u * u) + 1 : 2 + 7 * u * u; ctx.lineTo(w, u * 22); }
      ctx.closePath(); ctx.fillStyle = 'rgba(160,235,255,.4)'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
    }
    ctx.restore();
  }
  function drawSortCard(c, x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    if (o.shake) ctx.translate(Math.sin(o.shake * 60) * 6 * Math.min(1, o.shake / 0.2), 0);
    const sc = (o.s == null ? 1 : EASE.outBack(o.s)) * (1 + 0.06 * (o.lift || 0));
    ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,10,' + (0.4 + 0.15 * (o.lift || 0)) + ')'; ctx.shadowBlur = 8 + 12 * (o.lift || 0); ctx.shadowOffsetY = 3 + 6 * (o.lift || 0);
    rr(-w / 2, -h / 2, w, h, h / 2.6);
    ctx.fillStyle = o.fill || '#f8fbff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2; ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.stroke();
    ctx.font = font(h * 0.5 / FS, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.def.e, -w / 2 + h * 0.22, 1);
    const tx = -w / 2 + h * 0.92, avail = w - h * 0.92 - (o.check ? h * 0.7 : 10);
    ctx.fillStyle = o.ink || '#1e293b';
    let fs = 15;
    ctx.font = font(fs, 800); const mw = ctx.measureText(c.def.t).width;
    if (mw > avail) { fs = Math.max(9.5, fs * avail / mw); ctx.font = font(fs, 800); }
    ctx.fillText(c.def.t, tx, 1);
    if (o.check) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(w / 2 - h * 0.36, 0, h * 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); const q = h * 0.2; ctx.moveTo(w / 2 - h * 0.36 - q * 0.5, 0); ctx.lineTo(w / 2 - h * 0.36 - q * 0.1, q * 0.4); ctx.lineTo(w / 2 - h * 0.36 + q * 0.5, -q * 0.4); ctx.stroke(); }
    ctx.restore();
  }
  function drawSort(dt, t) {
    const S = SORTS[SORT.kind], L = SORT.L, ent = EASE.outCubic(clamp(sceneT / 0.6, 0, 1));
    drawBG();
    pill(S.title + ' — 카드를 끌어서 알맞은 상자에 놓아요', W / 2, PHONE ? 20 : 30, { color: '#e2e8f0', size: 14, alpha: ent, fit: true });
    // 상자
    SORT.bins.forEach((b, i) => {
      ctx.save(); ctx.globalAlpha *= ent;
      const hot = SORT.hot === i;
      ctx.shadowColor = hot ? rgba(b.color, 0.7) : 'rgba(0,0,10,.4)'; ctx.shadowBlur = hot ? 26 : 12; ctx.shadowOffsetY = 4;
      rr(b.x, b.y, b.w, b.h, 18);
      const gg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      gg.addColorStop(0, rgba(b.color, hot ? 0.3 : 0.16)); gg.addColorStop(1, 'rgba(12,19,44,.85)');
      ctx.fillStyle = gg; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.setLineDash(hot ? [] : [8, 7]); ctx.lineWidth = hot ? 3.5 : 2.2; ctx.strokeStyle = rgba(b.color, hot ? 1 : 0.75); ctx.stroke(); ctx.setLineDash([]);
      drawBinIcon(b.icon, b.x + 30 * (PHONE ? 0.8 : 1), b.y + (PHONE ? 30 : 38), PHONE ? 0.9 : 1.15, b.color);
      txt(b.label, b.x + (PHONE ? 54 : 66), b.y + (PHONE ? 28 : 36), { size: 16, align: 'left', color: shade(b.color, 0.5) });
      ctx.restore();
    });
    // 놓인 카드
    const cnt = SORT.bins.map(() => 0);
    SORT.cards.forEach((c) => { if (c.placed) c.slotK = cnt[c.bin]++; });
    SORT.cards.forEach((c, i) => {
      if (c.placed || SORT.drag === i) return;
      drawSortCard(c, c.x, c.y, SORT.L.cw, SORT.L.ch, { s: c.s, shake: c.shake, lift: c.lift });
    });
    SORT.cards.forEach((c) => {
      if (!c.placed) return;
      const b = SORT.bins[c.bin], sl = sortSlot(b, c.slotK || 0);
      drawSortCard(c, c.x, c.y, lerp(SORT.L.cw, sl.w, c.sz), lerp(SORT.L.ch, sl.h, c.sz), { s: 1, fill: rgba(b.color, 0.28 * c.sz + 0.97 * (1 - c.sz) * 0.0), stroke: b.color, ink: c.sz > 0.5 ? '#f1f5ff' : '#1e293b', check: c.sz > 0.5 });
    });
    if (SORT.drag >= 0) { const c = SORT.cards[SORT.drag]; drawSortCard(c, c.x, c.y, SORT.L.cw * 1.02, SORT.L.ch * 1.02, { s: 1, lift: 1 }); }
    // 안내 말풍선
    if (SORT.msg) {
      const m = SORT.msg, a = clamp(Math.min(m.t / 0.2, (m.dur - m.t) / 0.4), 0, 1);
      pill(m.text, W / 2, H - (PHONE ? 176 : 232), { solid: true, color: m.good ? '#16a34a' : '#e11d48', size: 13.5, alpha: a, fit: true });
    }
    if (SORT.placed[SORT.kind] === 0 && SORT.drag < 0 && SORT.wrong === 0 && ent > 0.9) txt('카드를 끌어 상자에 넣어 보세요', W / 2, PHONE ? 40 : 58, { size: 13, color: '#fde68a', alpha: 0.5 + 0.4 * Math.sin(t * 4) });
  }
  function sortSay(text, good, dur) { SORT.msg = { text, good, t: 0, dur: dur || 3.2 }; }
  function sortDown(p) {
    for (let i = SORT.cards.length - 1; i >= 0; i--) {
      const c = SORT.cards[i];
      if (c.placed) continue;
      if (Math.abs(p.x - c.x) <= SORT.L.cw / 2 + 4 && Math.abs(p.y - c.y) <= SORT.L.ch / 2 + 6) {
        SORT.drag = i; SORT.off = { x: p.x - c.x, y: p.y - c.y }; if (c.tw) c.tw.cancel();
        const mv = SORT.cards.splice(i, 1)[0]; SORT.cards.push(mv); SORT.drag = SORT.cards.length - 1;
        Sound.click(); hideHint(); return true;
      }
    }
    return false;
  }
  function sortMove(p) {
    if (SORT.drag < 0) return;
    const c = SORT.cards[SORT.drag];
    c.x = clamp(p.x - SORT.off.x, SORT.L.cw / 2, W - SORT.L.cw / 2); c.y = clamp(p.y - SORT.off.y, 20, H - 12);
    const b = sortBinAt(p); if (b !== SORT.hot) { SORT.hot = b; if (b >= 0) Sound.tick(); }
  }
  function sortUp(p) {
    if (SORT.drag < 0) return;
    const c = SORT.cards[SORT.drag], bi = sortBinAt(p); SORT.drag = -1; SORT.hot = -1;
    if (bi < 0) { c.tw = SciSim.tween(c, { x: c.hx, y: c.hy }, { duration: 0.4, ease: 'outBack' }); return; }
    const b = SORT.bins[bi];
    if (b.id === c.def.bin) {
      c.placed = true; c.bin = bi; SORT.placed[SORT.kind]++; Sound.success();
      const k = SORT.cards.filter((q) => q.placed && q.bin === bi).length - 1, sl = sortSlot(b, k);
      c.tw = SciSim.tween(c, { x: sl.x, y: sl.y }, { duration: 0.4, ease: 'outBack' });
      FX.burst(sl.x, sl.y, { count: 10, life: 0.6, speed: 120, size: 3.4, gravity: 60, shape: 'star', colors: [b.color, '#fde047', '#fff'] });
      sortSay(c.def.t + ': ' + c.def.why, true, 3.6);
    } else {
      c.shake = 0.45; SORT.wrong++; Sound.fail();
      c.tw = SciSim.tween(c, { x: c.hx, y: c.hy }, { duration: 0.5, ease: 'outBack' });
      sortSay('앗! ' + c.def.t + ' → ' + c.def.hint, false, 3.4);
    }
  }
  const sortHit = (p) => SORT.cards.some((c) => !c.placed && Math.abs(p.x - c.x) <= SORT.L.cw / 2 + 4 && Math.abs(p.y - c.y) <= SORT.L.ch / 2 + 6);

  /* =========================================================
     장면 관리 · 조작 · 측정값
     ========================================================= */
  const trans = { t: 1 };
  const SCENE_LABEL = {
    plane: '🪞 평면거울 <small>(위에서 본 모습)</small>',
    rays: '✨ 한 점에서 나온 빛 두 줄기',
    eye: '👁️ 눈의 위치와 상',
    mirror: '🔍 볼록·오목 거울 <small>(옆에서 본 모습)</small>',
    lens: '🔭 볼록·오목 렌즈 <small>(옆에서 본 모습)</small>',
    sortM: '🃏 거울 쓰임 짝짓기',
    sortL: '🃏 렌즈 사례 분류',
  };
  const groupOf = (s) => (s === 'sortM' || s === 'sortL' ? 'sort' : s);
  const slBind = {
    plane: SciSim.bindRange($('#slPlane'), $('#outPlane'), (v) => v.toFixed(1) + ' cm', (v) => plGoCm(v, true)),
    mir: SciSim.bindRange($('#slMir'), $('#outMir'), () => $('#outMir').textContent, (v) => { setBenchD('mirror', vToD('mirror', v), true); BN.dragged = true; }),
    lens: SciSim.bindRange($('#slLens'), $('#outLens'), () => $('#outLens').textContent, (v) => { setBenchD('lens', vToD('lens', v), true); LN.dragged = true; }),
  };
  function syncSliders() {
    slBind.plane.set(clamp(Math.round(plCm() * 2) / 2, 2, 10));
  }
  function syncUI() {
    const free = !!(game && game.free);
    $$('#ctrlCard .grp').forEach((g) => {
      const id = g.id.slice(2);
      g.classList.toggle('off', id === 'free' ? !free : id !== groupOf(scene));
    });
    $('#sceneLabel').innerHTML = SCENE_LABEL[scene] || '';
    $$('#freeGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.free === scene));
    $$('#mtypeGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.mtype === BN.mtype));
    $$('#ltypeGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.ltype === LN.ltype));
    $('#extBtn').setAttribute('aria-pressed', PLR.extOn ? 'true' : 'false');
    $('#sortTitle').textContent = scene === 'sortL' ? '🃏 렌즈 사례를 분류해요' : '🃏 거울 쓰임을 짝지어요';
    syncSliders();
  }
  let scene = 'plane', sceneT = 0;
  function setScene(name, fresh) {
    if (!SCENE_LABEL[name]) return;
    if (scene !== name || fresh) { sceneT = 0; trans.t = 0; hideHint(); }
    scene = name;
    if (name === 'sortM' || name === 'sortL') { if (SORT.kind !== name || !SORT.cards.length || fresh) sortSetup(name); }
    BPU.reset(); LPU.reset();
    syncUI();
  }
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'plane') { PL.y = PLG.cy - 10; plGoCm(6, false); }
    else if (scene === 'rays') raysReset();
    else if (scene === 'eye') eyeReset();
    else if (scene === 'mirror') { setBenchD('mirror', vToD('mirror', 70)); }
    else if (scene === 'lens') { setBenchD('lens', vToD('lens', 70)); }
    else sortSetup(scene);
  });
  $('#extBtn').addEventListener('click', () => { Sound.click(); PLR.extOn = !PLR.extOn; syncUI(); });
  $('#raysReset').addEventListener('click', () => { Sound.click(); raysReset(); syncUI(); });
  $('#eyeReset').addEventListener('click', () => { Sound.click(); eyeReset(); });
  $('#sortReset').addEventListener('click', () => { Sound.click(); sortSetup(scene); });
  $$('#mtypeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (BN.mtype !== b.dataset.mtype) { BN.mtype = b.dataset.mtype; BN.fade = 0; } syncUI(); }));
  $$('#ltypeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (LN.ltype !== b.dataset.ltype) { LN.ltype = b.dataset.ltype; LN.fade = 0; } syncUI(); }));
  $$('#freeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.free, true); }));

  /* ---------- 입력 ---------- */
  const setCursor = (c) => { view.canvas.style.cursor = c; };
  const rayHit = (p) => {
    if (scene === 'eye') return eyeHit(p);
    const R = PLR;
    return Math.hypot(p.x - R.sx, p.y - R.sy) <= 32 || Math.hypot(p.x - PLG.mx, p.y - R.ay) <= 30 || Math.hypot(p.x - PLG.mx, p.y - R.by) <= 30 || !!(game && game.free && Math.hypot(p.x - R.cx, p.y - R.cy) <= PLG.card / 2 + 14);
  };
  function pointerHit(p) {
    if (scene === 'plane') return plHit(p);
    if (scene === 'rays' || scene === 'eye') return rayHit(p);
    if (scene === 'mirror') return benchHit('mirror', p);
    if (scene === 'lens') return benchHit('lens', p);
    return sortHit(p);
  }
  function benchDragTo(kind, p) {
    const st = kind === 'mirror' ? BN : LN, xe = kind === 'mirror' ? BG_.xm : BG_.xl;
    setBenchD(kind, xe - (p.x - st.ox), true); st.dragged = true;
  }
  SciSim.pointer(view, {
    hover(p) { return pointerHit(p) ? 'grab' : null; },
    down(p) {
      let ok = false;
      if (scene === 'plane') { if (plHit(p)) { PL.drag = true; PL.dragged = true; PL.ox = p.x - PL.x; PL.oy = p.y - PL.y; if (PL.tw) PL.tw.cancel(); Sound.click(); hideHint(); ok = true; } }
      else if (scene === 'rays' || scene === 'eye') ok = raysDown(p);
      else if (scene === 'mirror' || scene === 'lens') {
        if (benchHit(scene, p)) { const st = scene === 'mirror' ? BN : LN; st.drag = true; st.dragged = true; st.ox = p.x - ((scene === 'mirror' ? BG_.xm : BG_.xl) - st.d); Sound.click(); hideHint(); ok = true; }
      } else ok = sortDown(p);
      if (ok) setCursor('grabbing');
      return ok;
    },
    move(p) {
      if (scene === 'plane') { PL.x = clamp(p.x - PL.ox, PLG.mx - 10.4 * PLG.cm, PLG.mx - 1.6 * PLG.cm); PL.y = clamp(p.y - PL.oy, PLG.y0 + 34, PLG.y1 - 34); }
      else if (scene === 'rays' || scene === 'eye') raysMove(p);
      else if (scene === 'mirror' || scene === 'lens') benchDragTo(scene, p);
      else sortMove(p);
    },
    up(p) {
      if (scene === 'plane') { if (PL.drag) { PL.drag = false; plGoCm(plCm(), true); } }
      else if (scene === 'rays' || scene === 'eye') raysUp(p);
      else if (scene === 'mirror' || scene === 'lens') { BN.drag = false; LN.drag = false; }
      else sortUp(p);
      setCursor('default');
    },
  });
  if (PHONE) {                                  // 휴대폰: 끌 수 있는 것을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      if (pointerHit(view.toLocal(tc))) e.preventDefault();
    }, { passive: false });
  }

  /* ---------- 측정값 ---------- */
  const roCache = {};
  function ro(i, label, html) {
    const k = 'r' + i, s = label + '|' + html;
    if (roCache[k] === s) return;
    roCache[k] = s;
    $('#rL' + i).textContent = label; $('#rV' + i).innerHTML = html;
  }
  function updateReadouts() {
    const amber = (s) => '<span style="color:#b45309">' + s + '</span>', teal = (s) => '<span style="color:#0f766e">' + s + '</span>';
    const sm = (s) => '<span style="font-size:' + (PHONE ? 13 : 15) + 'px;white-space:normal;line-height:1.15;display:inline-block;vertical-align:middle">' + s + '</span>';
    if (scene === 'plane') {
      const cm = plCm();
      ro(1, '물체 ↔ 거울', amber(cm.toFixed(1) + '<small>cm</small>'));
      ro(2, '거울 ↔ 상', teal(cm.toFixed(1) + '<small>cm</small>'));
      ro(3, '상의 모습', sm('같은 크기 · 좌우가 바뀜'));
    } else if (scene === 'rays') {
      const R = PLR, a = R.angs || [0, 0];
      ro(1, '① 입사각 = 반사각', amber(a[0] + '°')); ro(2, '② 입사각 = 반사각', amber(a[1] + '°'));
      ro(3, '상의 위치', R.placed ? sm('거울 뒤 ' + ((2 * PLG.mx - plrP().x - PLG.mx) / PLG.cm).toFixed(1) + ' cm') : sm('아직 못 찾았어요'));
    } else if (scene === 'eye') {
      ro(1, '눈에 보이나요?', EY.vis ? '보여요 👀' : '안 보여요');
      ro(2, '상의 위치', sm('거울 뒤 (그대로)'));
      ro(3, '반사된 곳', sm(EY.vis ? '거울 위의 한 점' : '거울을 비켜 가요'));
    } else if (scene === 'mirror' || scene === 'lens') {
      const c = scene === 'mirror' ? calcMirror() : calcLens(), has = !!c.I && Math.abs(c.m) < 5;
      ro(1, '상의 크기', has ? sm(sizeWord(c.m)) : sm('—'));
      ro(2, '상의 방향', has ? sm(dirWord(c.m)) : sm('—'));
      ro(3, '물체의 위치', sm(posWord(c.d, scene === 'mirror' ? c.f : c.f)));
    } else {
      const S = SORTS[SORT.kind], n = SORT.placed[SORT.kind];
      ro(1, '맞게 넣은 카드', n + '<small> / ' + S.cards.length + '</small>');
      ro(2, '틀린 횟수', SORT.wrong + '<small>번</small>');
      ro(3, '남은 카드', (S.cards.length - n) + '<small>장</small>');
    }
  }
  function syncBenchSliders() {
    if (scene === 'mirror') {
      const v = benchSlider('mirror'); if (+$('#slMir').value !== v) slBind.mir.set(v);
      const c = calcMirror(); const tx = posWord(c.d, c.f); if ($('#outMir').textContent !== tx) $('#outMir').textContent = tx;
    } else if (scene === 'lens') {
      const v = benchSlider('lens'); if (+$('#slLens').value !== v) slBind.lens.set(v);
      const c = calcLens(); const tx = posWord(c.d, c.f); if ($('#outLens').textContent !== tx) $('#outLens').textContent = tx;
    }
  }

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const f1 = (v) => (Math.round(v * 10) / 10);
  const svgLine = (x1, y1, x2, y2, color, w, extra) => '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + color + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" ' + (extra || '') + '/>';
  const svgText = (x, y, s, size, color, anchor, w) => '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + (size || 13) + '" font-weight="' + (w || 800) + '" fill="' + (color || '#334155') + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  const svgHead = (x, y, ux, uy, color, s) => { s = s || 8; const nx = -uy, ny = ux; return '<path d="M' + f1(x) + ' ' + f1(y) + ' L' + f1(x - ux * s * 1.6 + nx * s * 0.8) + ' ' + f1(y - uy * s * 1.6 + ny * s * 0.8) + ' L' + f1(x - ux * s * 1.6 - nx * s * 0.8) + ' ' + f1(y - uy * s * 1.6 - ny * s * 0.8) + ' Z" fill="' + color + '"/>'; };
  const svgRay = (x1, y1, x2, y2, color, w) => { const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L; return svgLine(x1, y1, x2 - ux * 8, y2 - uy * 8, color, w || 3) + svgHead(x2, y2, ux, uy, color, (w || 3) * 1.5); };

  /* 요약 ①: 평면거울의 상 */
  const SUM_PLANE = '<svg viewBox="0 0 300 138" width="300" style="max-width:100%" role="img" aria-label="평면거울 앞의 글자 카드와 거울 뒤의 상" ' + SVGF + '>' +
    '<rect width="300" height="138" rx="12" fill="#101a3b"/>' +
    '<rect x="146" y="14" width="8" height="96" rx="3" fill="#d6e0f6"/>' + svgText(150, 126, '거울', 12.5, '#cbd5e1') +
    '<rect x="52" y="50" width="38" height="38" rx="6" fill="#fff8e1"/>' + svgText(71, 79, 'F', 28, '#1d4ed8', 'middle', 900) + svgText(71, 40, '물체', 12.5, '#fcd34d') +
    '<rect x="210" y="50" width="38" height="38" rx="6" fill="rgba(160,200,255,.35)" stroke="#9ec5ff" stroke-width="2" stroke-dasharray="4 3"/>' +
    '<text transform="translate(229 79) scale(-1 1)" font-size="28" font-weight="900" fill="#9ec5ff" text-anchor="middle" ' + SVGF.replace('font-family=', 'font-family=') + '>F</text>' + svgText(229, 40, '상', 12.5, '#9ec5ff') +
    svgLine(90, 69, 142, 69, '#fbbf24', 2.4, 'stroke-dasharray="4 4"') + svgLine(158, 69, 210, 69, '#2dd4bf', 2.4, 'stroke-dasharray="4 4"') +
    svgText(116, 62, '같은 거리', 11.5, '#fbbf24') + svgText(184, 62, '같은 거리', 11.5, '#2dd4bf') + '</svg>';

  /* 요약 ②: 상이 생기는 원리 (반사 광선의 연장선) */
  const SUM_RAYS = (() => {
    const P = { x: 70, y: 72 }, mx = 150, A = { x: mx, y: 34 }, B = { x: mx, y: 114 }, P2 = { x: 2 * mx - P.x, y: P.y };
    const out = (Q) => { const d = unit({ x: Q.x - P.x, y: Q.y - P.y }); return { x: Q.x - d.x * 62, y: Q.y + d.y * 62 }; };
    const oa = out(A), ob = out(B);
    return '<svg viewBox="0 0 300 150" width="300" style="max-width:100%" role="img" aria-label="반사 광선의 연장선이 거울 뒤에서 만나는 곳에 상이 보이는 그림" ' + SVGF + '>' +
      '<rect width="300" height="150" rx="12" fill="#101a3b"/>' +
      '<rect x="146" y="12" width="8" height="126" rx="3" fill="#d6e0f6"/>' +
      svgLine(A.x, A.y, P2.x, P2.y, '#fff', 2, 'stroke-dasharray="5 4"') + svgLine(B.x, B.y, P2.x, P2.y, '#fff', 2, 'stroke-dasharray="5 4"') +
      svgRay(P.x, P.y, A.x, A.y, '#ffd45e', 3) + svgRay(P.x, P.y, B.x, B.y, '#ffd45e', 3) + svgRay(A.x, A.y, oa.x, oa.y, '#ffd45e', 3) + svgRay(B.x, B.y, ob.x, ob.y, '#ffd45e', 3) +
      '<circle cx="' + P.x + '" cy="' + P.y + '" r="6" fill="#ff4d5a"/>' + svgText(P.x, P.y + 24, '물체의 한 점', 12, '#ff9aa3') +
      '<circle cx="' + P2.x + '" cy="' + P2.y + '" r="6" fill="none" stroke="#9ec5ff" stroke-width="2.5" stroke-dasharray="3 2"/>' + svgText(P2.x, P2.y + 24, '상', 12.5, '#9ec5ff') +
      svgText(224, 22, '연장선(점선)', 12, '#fff') + '</svg>';
  })();

  /* 퀴즈 그림: 자동차 옆 거울 (보이는 범위) */
  const FIG_CAR = (() => {
    const panel = (ox, title, wide) => {
      const r = '<rect x="' + (ox + 14) + '" y="34" width="142" height="132" rx="6" fill="#dfe7f3"/>' +
        svgLine(ox + 61, 34, ox + 61, 166, '#fff', 2, 'stroke-dasharray="7 6"') + svgLine(ox + 108, 34, ox + 108, 166, '#fff', 2, 'stroke-dasharray="7 6"');
      const wedge = wide ? '<polygon points="' + (ox + 58) + ',58 ' + (ox + 16) + ',166 ' + (ox + 154) + ',166" fill="rgba(251,191,36,.38)"/>' : '<polygon points="' + (ox + 58) + ',58 ' + (ox + 62) + ',166 ' + (ox + 98) + ',166" fill="rgba(251,191,36,.38)"/>';
      const car = '<rect x="' + (ox + 20) + '" y="42" width="30" height="58" rx="8" fill="#3b82f6"/><circle cx="' + (ox + 52) + '" cy="58" r="4.5" fill="#fbbf24" stroke="#fff" stroke-width="1.5"/>';
      const other = '<rect x="' + (ox + 74) + '" y="116" width="22" height="38" rx="6" fill="#ef4444"/>' + '<rect x="' + (ox + 121) + '" y="76" width="22" height="38" rx="6" fill="' + (wide ? '#22c55e' : '#94a3b8') + '"/>' + (wide ? '' : svgText(ox + 132, 100, '?', 18, '#fff', 'middle', 900));
      return svgText(ox + 85, 22, title, 14, '#1e293b', 'middle', 900) + r + wedge + car + other;
    };
    return '<svg viewBox="0 0 340 176" width="340" style="max-width:100%" role="img" aria-label="평면거울과 볼록 거울로 볼 수 있는 범위 비교" ' + SVGF + '><rect width="340" height="176" rx="14" fill="#eef5ff"/>' + panel(0, '평면거울', false) + panel(170, '볼록 거울', true) + '</svg>';
  })();

  const tbl = (rows) => '<table style="width:100%;border-collapse:collapse;font-size:13.5px;line-height:1.35">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th style="background:#fff1ea;color:#9a3412;padding:5px 6px;border:1px solid #f3d3c4;text-align:left">' : '<td style="padding:5px 6px;border:1px solid #e3e8f1;vertical-align:top">') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SUM_MIRRORS = tbl([['거울', '물체의 위치', '상의 모습', '쓰임'],
    ['평면거울', '—', '같은 크기, 좌우가 바뀐 상', '전신 거울, 세면대 거울'],
    ['볼록 거울', '어디서나', '<b>작고 바로 선 상</b> (넓은 범위)', '자동차 옆 거울, 도로 반사경'],
    ['오목 거울', '초점 안쪽(가까이)', '<b>크고 바로 선 상</b>', '화장용 거울'],
    ['오목 거울', '초점 바깥쪽(멀리)', '<b>거꾸로 선 상</b> (멀수록 작아져요)', '손전등 반사판']]);
  const SUM_LENSES = tbl([['렌즈', '물체의 위치', '상의 모습', '쓰임'],
    ['볼록 렌즈', '초점 안쪽(가까이)', '<b>크고 바로 선 상</b>', '돋보기'],
    ['볼록 렌즈', '초점 바깥쪽(멀리)', '<b>거꾸로 선 상</b>', '카메라, 현미경'],
    ['오목 렌즈', '어디서나', '<b>작고 바로 선 상</b>', '근시 안경, 도어 렌즈']]);

  /* =========================================================
     단계 · 미션
     ========================================================= */
  game = SciSim.game({
    simId: 'm2-mirror-lens',
    mount: '#game',
    badge: '상(像) 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      plane: '🪞 평면거울과 글자 카드',
      rays: '✨ 광선 두 줄기와 연장선',
      eye: '👁️ 눈 위치 옮기기',
      mirror: '🔍 볼록·오목 거울',
      sortM: '🃏 거울 쓰임 짝짓기',
      lens: '🔭 볼록·오목 렌즈',
      sortL: '🃏 렌즈 사례 분류',
    },
    onFeatures(set) { feat = set; if (game) syncUI(); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, false); },
    levels: [
      /* ---------------- STEP 1 · 관찰 ---------------- */
      {
        title: '평면거울 속의 상', short: '평면거울', icon: '🪞', phase: '관찰',
        features: ['plane'],
        intro: '<p class="si-q">❓ 탐구 질문: 거울 속의 나는 어디에 있는 것일까?</p>' +
          '<p>거울을 보면 거울 속에 또 하나의 내가 있는 것 같아요. 이렇게 거울 속에 보이는 모습을 <b>상</b>(像)이라고 해요. 평평한 <b>평면거울</b> 앞에 글자 카드 <b>F</b>를 놓고, 상이 어디에, 어떤 모습으로 생기는지 관찰해요.</p>' +
          '<p>눈금자로 <b>거울에서 카드까지</b>의 거리와 <b>거울에서 상까지</b>의 거리를 비교해 봐요.</p>',
        setup() { setScene('plane', true); },
        recap: '<b>평면거울</b>의 상은 거울 뒤쪽에, 물체와 <b>같은 거리</b>에 생겨요. 물체와 <b>크기가 같고 좌우가 바뀌어</b> 보여요.',
        summary: '<p>' + SUM_PLANE + '</p><ul><li>평면거울의 <b>상</b>은 거울 <b>뒤쪽</b>에 생겨요.</li><li>거울에서 물체까지의 거리와 거울에서 상까지의 거리가 <b>같아요</b>.</li><li>상의 크기는 물체와 <b>같아요</b>.</li><li>상은 물체와 <b>좌우가 바뀌어</b> 보여요.</li></ul>',
        missions: [
          {
            id: 'ml-dist', scene: 'plane',
            title: '상의 거리 확인하기',
            goal: '글자 카드를 끌어서 <b>거울에서 4 cm</b>, <b>8 cm</b> 떨어진 곳에 각각 놓고, 상이 거울 뒤 몇 cm에 있는지 눈금자로 확인해요.',
            hint: '카드를 끌거나 오른쪽 슬라이더를 움직여요. 눈금자 위의 숫자가 카드와 상의 위치를 알려 줘요.',
            setup() { PL.ok[4] = PL.ok[8] = false; PL.hold[4] = PL.hold[8] = 0; PL.dragged = false; PL.y = PLG.cy - 10; plGoCm(6, false); showHint('카드를 끌어 거울에서 4 cm, 8 cm 되는 곳에 놓아 봐요', 8000); },
            check: () => PL.ok[4] && PL.ok[8],
            status: () => chip(PL.ok[4], '거울에서 4 cm') + ' · ' + chip(PL.ok[8], '거울에서 8 cm') + '<br><small>지금: 물체 ' + plCm().toFixed(1) + ' cm → 상 ' + plCm().toFixed(1) + ' cm</small>',
            hold: 0.3,
            explain: '카드가 거울에서 4 cm일 때 상도 거울 뒤 4 cm, 8 cm일 때 상도 8 cm에 있었지요? 평면거울의 상은 <b>거울 뒤쪽, 거울에서 물체까지와 같은 거리</b>에 생겨요. 글자 F의 좌우가 바뀌어 보이는 것도 평면거울 상의 특징이에요.',
          },
          {
            id: 'ml-quiz1', scene: 'plane', type: 'quiz',
            title: '거울 속 글자 카드의 상',
            goal: '평면거울에 비친 글자 카드 <b>F</b>의 상에 대한 설명으로 옳은 것은?',
            choices: ['거울 면 위에 같은 크기로 생긴다', '거울 뒤쪽, 물체와 같은 거리에 같은 크기로 생기며 좌우가 바뀐다', '거울 뒤쪽 더 먼 곳에 더 작게 생긴다', '거울 앞쪽에 위아래가 바뀌어 생긴다'],
            answer: 1,
            feedback: ['상은 거울 면 위가 아니라 거울 뒤쪽에 생겨요. 눈금자에서 상이 있던 곳을 다시 봐요.', '', '상의 크기는 물체와 같고, 거리도 같아요. 눈금자로 두 거리를 비교해 봤지요?', '평면거울의 상은 거울 앞이 아니라 뒤쪽에 있고, 위아래가 아니라 좌우가 바뀌어요.'],
            explain: '평면거울의 상은 <b>거울 뒤쪽</b>에 생기고, 거울에서 물체까지의 거리와 <b>같은 거리</b>, <b>같은 크기</b>예요. 글자의 <b>좌우가 바뀌어</b> 보여요.',
          },
        ],
      },
      /* ---------------- STEP 2 · 설명 ---------------- */
      {
        title: '상이 생기는 원리', short: '상의 원리', icon: '💡', phase: '설명',
        features: ['rays', 'eye'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평면거울의 상이 거울 뒤쪽, 같은 거리에 생기는 것을 관찰했어요.</div>' +
          '<p>그런데 거울 뒤에는 아무것도 없는데 왜 상이 거기에 보일까요? 물체의 한 점에서 나온 빛이 거울에서 <b>반사 법칙</b>(입사각 = 반사각)대로 반사되어 눈으로 들어오기 때문이에요.</p>' +
          '<p>한 점에서 나온 <b>빛 두 줄기</b>를 거울에 보내고, 반사된 빛을 거울 뒤로 <b>연장</b>해서 상이 어디에 생기는지 찾아봐요.</p>',
        setup() { setScene('rays', true); raysReset(); },
        recap: '물체의 한 점에서 나온 빛은 거울에서 <b>반사 법칙</b>대로 반사돼요. 반사 광선의 <b>연장선이 만나는 곳</b>에 상이 있는 것처럼 보여요.',
        summary: '<p>' + SUM_RAYS + '</p><ul><li>물체의 한 점에서 나온 빛이 거울에서 반사돼요. (입사각 = 반사각)</li><li>반사된 빛은 거울 뒤의 한 점에서 퍼져 나온 것처럼 눈에 들어와요.</li><li>반사 광선의 <b>연장선(점선)이 만나는 곳</b>이 상이 보이는 위치예요.</li><li>눈의 위치가 달라도 상의 위치는 변하지 않아요. (거울에 비치는 곳에서만 보여요)</li></ul>',
        missions: [
          {
            id: 'ml-rays', scene: 'rays',
            title: '광선 두 줄기로 상 찾기',
            goal: '① 거울의 <b>주황색 점</b>을 끌어 두 광선을 멀리 떨어뜨려요. ② <b>연장선 그리기</b>를 눌러요. ③ 연장선이 만나는 곳에 <b>★</b>를 놓아요.',
            hint: '두 점을 거울의 위쪽 끝과 아래쪽 끝으로 벌려 보세요. 점선이 거울 뒤쪽 한 곳에서 만나는 것을 찾아요.',
            setup() { raysReset(); PLR.flag = { rays: false, ext: false, star: false }; syncUI(); showHint('거울의 주황색 점을 위아래로 끌어요', 8000); },
            check: () => PLR.flag.rays && PLR.flag.ext && PLR.flag.star,
            status: () => chip(PLR.flag.rays, '두 광선 벌리기') + ' · ' + chip(PLR.flag.ext, '연장선 그리기') + ' · ' + chip(PLR.flag.star, '★ 놓기'),
            hold: 0.5,
            explain: '눈에 들어온 반사된 빛은 거울 뒤의 한 점에서 퍼져 나온 것처럼 보여요. 두 반사 광선의 <b>연장선이 만나는 곳</b>이 바로 <b>상의 위치</b>예요. 두 광선 모두 <b>입사각 = 반사각</b>으로 반사됐어요.',
          },
          {
            id: 'ml-eye', scene: 'eye',
            title: '눈을 옮겨 보기',
            goal: '<b>눈</b>을 끌어 여러 곳으로 옮겨 보세요. 눈이 달라져도 상의 위치는 그대로인지, <b>상이 안 보이는 곳</b>은 어디인지 찾아봐요.',
            hint: '눈을 위·아래·앞·뒤로 옮겨 봐요. 거울 가장자리 밖으로 가면 어떻게 될까요?',
            setup() { eyeReset(); showHint('눈을 끌어서 여러 곳으로 옮겨 봐요', 7000); },
            check: () => EY.flag.moved && EY.flag.blind,
            status: () => chip(EY.flag.moved, '눈을 충분히 옮겨 보기') + ' · ' + chip(EY.flag.blind, '상이 안 보이는 곳 찾기'),
            hold: 0.4,
            explain: '눈의 위치가 달라도 반사 광선의 연장선은 늘 <b>같은 한 점</b>(상)에서 만나요. 그래서 상의 위치는 그대로예요. 다만 거울 밖으로 지나가는 곳에서는 빛이 눈에 들어오지 못해서 상이 보이지 않아요.',
          },
          {
            id: 'ml-quiz2', scene: 'rays', type: 'quiz',
            title: '상이 거울 뒤에 보이는 까닭',
            goal: '거울 뒤에는 아무것도 없는데도 상이 거울 뒤에 있는 것처럼 보이는 까닭은?',
            figure: SUM_RAYS,
            choices: ['빛이 거울을 통과해서 거울 뒤에 모이기 때문이다', '거울이 물체를 거울 뒤로 옮기기 때문이다', '반사된 빛이 거울 뒤의 한 점에서 나온 것처럼 눈에 들어오기 때문이다', '눈이 거울 뒤쪽의 물체를 직접 보기 때문이다'],
            answer: 2,
            feedback: ['빛은 거울을 통과하지 않고 반사돼요. 그림에서 실선은 거울 앞쪽에만 있지요?', '거울은 물체를 옮기지 않아요. 물체는 그대로 거울 앞에 있어요.', '', '눈은 거울 앞에 있고, 반사되어 들어온 빛만 받아요. 거울 뒤쪽의 점선은 빛이 실제로 지나간 길이 아니에요.'],
            explain: '눈에는 <b>반사된 빛</b>이 들어와요. 눈은 그 빛이 곧게 온 것처럼 느끼기 때문에, <b>반사 광선의 연장선이 만나는 곳</b>(거울 뒤)에 상이 있는 것처럼 보여요.',
          },
        ],
      },
      /* ---------------- STEP 3 · 실험 ---------------- */
      {
        title: '볼록 거울과 오목 거울', short: '볼록·오목', icon: '🔍', phase: '실험',
        features: ['mirror', 'sortM'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평면거울에서는 반사 법칙으로 상이 생기는 까닭을 알았어요.</div>' +
          '<p>거울이 <b>휘어 있으면</b> 상은 어떻게 달라질까요? 가운데가 볼록한 <b>볼록 거울</b>과 가운데가 오목한 <b>오목 거울</b>에 촛불을 비춰 봐요. 촛불을 거울에 가까이, 또 멀리 놓고 <b>상의 크기와 방향</b>을 비교해요.</p>' +
          '<p>화면 속 <b>초점(◆)</b>은 거울의 축과 나란히 들어온 빛이 모이거나 퍼져 나가는 기준이 되는 점이에요. <b>점선</b>은 반사된 빛을 거꾸로 연장한 선이에요. 눈에 보이는 상은 왼쪽 위의 작은 창에서 볼 수 있어요.</p>',
        setup() { setScene('mirror', true); },
        recap: '<b>볼록 거울</b>은 늘 작고 바로 선 상(넓은 범위)을 만들어요. <b>오목 거울</b>은 초점 안쪽에서는 크고 바로 선 상, 초점 바깥쪽에서는 거꾸로 선 상을 만들어요.',
        summary: '<p>' + SUM_MIRRORS + '</p><ul style="margin-top:8px"><li>볼록 거울은 <b>넓은 범위</b>를 작게 보여 줘요.</li><li>오목 거울은 물체가 초점 안쪽이면 <b>확대된 바로 선 상</b>, 바깥쪽이면 <b>거꾸로 선 상</b>이에요.</li></ul>',
        missions: [
          {
            id: 'ml-mirror', scene: 'mirror',
            title: '거울의 종류와 거리를 바꿔 보기',
            goal: '촛불을 거울에 가깝게, 멀게 놓아 보면서 <b>볼록 거울</b>과 <b>오목 거울</b>이 만드는 상의 크기·방향을 비교해요. 왼쪽 위의 <b>눈에 보이는 상</b> 창을 살펴봐요.',
            hint: '버튼으로 거울을 바꾸고, 촛불을 끌어서 초점(◆) 안쪽과 바깥쪽에 놓아 봐요.',
            setup() { BN.seen = { convex: false, near: false, far: false }; BN.hold = { convex: 0, near: 0, far: 0 }; BN.mtype = 'convex'; BN.dragged = false; BN.fade = 0; setBenchD('mirror', vToD('mirror', 70)); syncUI(); showHint('촛불을 끌어 거울에서 멀리, 가까이 놓아 봐요', 8000); },
            check: () => BN.seen.convex && BN.seen.near && BN.seen.far,
            status: () => chip(BN.seen.convex, '볼록 거울') + '<br>' + chip(BN.seen.near, '오목 거울 · 초점 안쪽') + ' · ' + chip(BN.seen.far, '오목 거울 · 초점 바깥쪽'),
            hold: 0.3,
            explain: '<b>볼록 거울</b>은 촛불이 어디에 있어도 <b>작고 바로 선 상</b>을 만들어요. <b>오목 거울</b>은 촛불이 초점 안쪽(가까이)이면 <b>크고 바로 선 상</b>, 초점 바깥쪽(멀리)이면 <b>거꾸로 선 상</b>을 만들어요.',
          },
          {
            id: 'ml-sortM', scene: 'sortM',
            title: '거울 쓰임 짝짓기',
            goal: '일상생활에서 쓰이는 거울 <b>6가지</b>를 평면거울·볼록 거울·오목 거울 상자에 알맞게 넣어요.',
            hint: '넓은 범위를 봐야 하면 볼록 거울, 크게 보거나 빛을 모으면 오목 거울, 있는 그대로 보면 평면거울이에요.',
            setup() { sortSetup('sortM'); showHint('카드를 끌어서 알맞은 상자에 넣어요', 7000); },
            check: () => SORT.placed.sortM >= SORTS.sortM.cards.length,
            status: () => chip(SORT.placed.sortM >= 6, '맞게 넣은 카드 ' + SORT.placed.sortM + ' / 6') + ' · 틀린 횟수 ' + SORT.wrong,
            hold: 0.5,
            explain: '<b>볼록 거울</b>은 넓은 범위를 작게 보여 줘서 자동차 옆 거울·도로 반사경에, <b>오목 거울</b>은 가까이에서 크게 보여 주거나 빛을 모아서 화장용 거울·손전등 반사판에, <b>평면거울</b>은 있는 그대로의 상을 보여 줘서 전신 거울·세면대 거울에 써요.',
          },
          {
            id: 'ml-quiz3', scene: 'mirror', type: 'quiz',
            title: '자동차 옆 거울이 볼록 거울인 까닭',
            goal: '자동차의 오른쪽 옆 거울은 볼록 거울이에요. 그 까닭은?',
            figure: FIG_CAR,
            choices: ['상을 크게 확대해서 보여 주려고', '상이 거꾸로 서서 헷갈리지 않도록', '빛을 한곳에 모아 밝게 보이게 하려고', '넓은 범위를 작은 상으로 볼 수 있게 하려고'],
            answer: 3,
            feedback: ['확대해서 보여 주는 것은 오목 거울(가까이)이에요. 볼록 거울의 상은 늘 물체보다 작아요.', '볼록 거울의 상은 늘 바로 서 있어요. 거꾸로 선 상은 오목 거울에서 생겨요.', '빛을 모으는 것은 오목 거울의 쓰임이에요. 볼록 거울은 빛을 퍼뜨려요.', ''],
            explain: '볼록 거울은 평면거울보다 <b>넓은 범위</b>를 <b>작은 상</b>으로 보여 줘요. 그래서 운전할 때 뒤쪽의 넓은 범위를 한눈에 볼 수 있어요.',
          },
        ],
      },
      /* ---------------- STEP 4 · 적용 ---------------- */
      {
        title: '렌즈로 보는 상', short: '렌즈', icon: '🔭', phase: '적용',
        features: ['lens', 'sortL'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 볼록 거울과 오목 거울이 만드는 상의 크기·방향을 비교했어요.</div>' +
          '<p>이번에는 <b>렌즈</b>예요. 가운데가 두꺼운 <b>볼록 렌즈</b>와 가운데가 얇은 <b>오목 렌즈</b>에 촛불을 비추면 어떤 상이 생길까요? 빛이 렌즈를 지나며 꺾이는 모습과 상의 크기·방향을 살펴보고, 일상생활의 렌즈 사례를 분류해 봐요.</p>',
        setup() { setScene('lens', true); },
        recap: '<b>볼록 렌즈</b>는 초점 안쪽에서는 크고 바로 선 상(돋보기), 바깥쪽에서는 거꾸로 선 상을 만들어요. <b>오목 렌즈</b>는 늘 작고 바로 선 상을 만들어요.',
        summary: '<p>' + SUM_LENSES + '</p><ul style="margin-top:8px"><li>볼록 렌즈는 빛을 <b>모으고</b>, 오목 렌즈는 빛을 <b>퍼지게</b> 해요.</li><li>돋보기(볼록 렌즈)를 가까이 대면 물체가 <b>크게</b> 보여요.</li></ul>',
        missions: [
          {
            id: 'ml-convex', scene: 'lens',
            title: '볼록 렌즈로 관찰하기',
            goal: '<b>볼록 렌즈</b>에서 촛불을 초점 안쪽(가까이)과 초점 바깥쪽(멀리)에 놓고 상의 크기와 방향을 관찰해요.',
            hint: '촛불을 끌어서 렌즈 가까이, 멀리 놓아 보세요. 돋보기처럼 가까이 대면 어떻게 보일까요?',
            setup() { LN.ltype = 'convex'; LN.seen.cnear = LN.seen.cfar = false; LN.hold.cnear = LN.hold.cfar = 0; LN.dragged = false; LN.fade = 0; setBenchD('lens', vToD('lens', 70)); syncUI(); showHint('촛불을 끌어 렌즈에 가깝게, 멀게 놓아 봐요', 8000); },
            check: () => LN.seen.cnear && LN.seen.cfar,
            status: () => chip(LN.seen.cnear, '초점 안쪽: 크고 바로 선 상') + '<br>' + chip(LN.seen.cfar, '초점 바깥쪽: 거꾸로 선 상'),
            hold: 0.3,
            explain: '볼록 렌즈는 촛불이 초점 안쪽에 있으면 <b>크고 바로 선 상</b>(돋보기), 초점 바깥쪽에 있으면 <b>거꾸로 선 상</b>을 만들어요. 가운데가 두꺼운 렌즈는 빛을 모아 줘요.',
          },
          {
            id: 'ml-concave', scene: 'lens',
            title: '오목 렌즈로 관찰하기',
            goal: '<b>오목 렌즈</b>로 바꾸고 촛불을 가까이, 멀리 놓아 보세요. 상이 어떻게 달라지는지 비교해요.',
            hint: '오목 렌즈 버튼을 누르고 촛불을 끌어 봐요. 촛불의 위치를 바꿔도 달라지지 않는 점이 있어요.',
            setup() { LN.ltype = 'concave'; LN.seen.vnear = LN.seen.vfar = false; LN.hold.vnear = LN.hold.vfar = 0; LN.fade = 0; setBenchD('lens', vToD('lens', 60)); syncUI(); showHint('촛불을 렌즈 가까이, 멀리에 놓아 봐요', 7000); },
            check: () => LN.seen.vnear && LN.seen.vfar,
            status: () => chip(LN.seen.vnear, '가까이: 작고 바로 선 상') + '<br>' + chip(LN.seen.vfar, '멀리: 작고 바로 선 상'),
            hold: 0.3,
            explain: '오목 렌즈는 빛을 <b>퍼지게</b> 해요. 그래서 촛불이 어디에 있어도 <b>작고 바로 선 상</b>만 보여요. 근시 안경이 오목 렌즈예요.',
          },
          {
            id: 'ml-sortL', scene: 'sortL',
            title: '렌즈 사례 분류하기',
            goal: '일상생활에서 쓰이는 렌즈 <b>6가지</b>를 볼록 렌즈·오목 렌즈 상자에 알맞게 넣어요.',
            hint: '크게 보이거나 빛을 모아 주는 렌즈는 볼록 렌즈, 작고 바로 선 상을 보여 주는 렌즈는 오목 렌즈예요.',
            setup() { sortSetup('sortL'); showHint('카드를 끌어서 알맞은 상자에 넣어요', 7000); },
            check: () => SORT.placed.sortL >= SORTS.sortL.cards.length,
            status: () => chip(SORT.placed.sortL >= 6, '맞게 넣은 카드 ' + SORT.placed.sortL + ' / 6') + ' · 틀린 횟수 ' + SORT.wrong,
            hold: 0.5,
            explain: '<b>볼록 렌즈</b>: 돋보기·카메라 렌즈·원시 안경·현미경 렌즈(빛을 모아서 상을 만들어요). <b>오목 렌즈</b>: 근시 안경·도어 렌즈(빛을 퍼지게 해서 작고 바로 선 상을 보여 줘요).',
          },
        ],
      },
    ],
  });
  syncUI();

  /* ---------- 시작 ---------- */
  let lastFree = null;
  SciSim.loop((dt, t) => {
    sceneT += dt;
    stepPlane(dt); stepRays(dt); stepBench(dt);
    if (scene === 'sortM' || scene === 'sortL') stepSort(dt);
    view.clear('#0b1226');
    if (scene === 'plane') drawPlane(dt, t);
    else if (scene === 'rays' || scene === 'eye') drawRaysScene(dt, t);
    else if (scene === 'mirror' || scene === 'lens') drawBenchScene(scene, dt, t);
    else drawSort(dt, t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.45);
      ctx.fillStyle = 'rgba(8,13,31,' + (1 - EASE.outCubic(trans.t)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (game && !!game.free !== lastFree) { lastFree = !!game.free; syncUI(); }
    syncBenchSliders();
    updateReadouts();
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, get game() { return game; }, W, H, PHONE, PL, PLR, EY, BN, LN, SORT, SORTS, PLG, BG_,
    setScene, plGoCm, plCm, setBenchD, calcMirror, calcLens, sortSetup, plrP, plrP2, mirrorYs,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; },
    benchObj(kind) { const st = kind === 'mirror' ? BN : LN; return { x: (kind === 'mirror' ? BG_.xm : BG_.xl) - st.d, y: BG_.ya - 10 }; },
  };
})();
