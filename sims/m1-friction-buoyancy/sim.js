/* =========================================================
   중1 Ⅴ. 힘의 작용 — 마찰력과 부력 [9과05-02 ②]
   ① [관찰] 마찰력의 방향   튕겨 미끄러지는 도막, 살짝 당겨도 꿈쩍 않는 도막 → 운동(하려는) 방향과 반대
   ② [실험] 마찰력의 크기   용수철저울로 움직이기 시작할 때의 눈금 → 접촉면이 거칠수록·무게가 클수록 커요
   ③ [탐구] 물속에서 부력 측정   공기 중 무게 − 물속 무게 = 부력, 잠긴 부피가 클수록 커요
   ④ [적용] 생활 속 마찰력과 부력   마찰력 크게/작게 분류, 구명조끼
   범위: 정지·운동 마찰이라는 용어, 마찰 계수, 아르키메데스 원리 식, 밀도와 뜨고 가라앉는 조건, 접촉 면적은 다루지 않음
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const EASE = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const { rgba, shade, mix } = SciSim.color;

  /* ---------- 캔버스 (태블릿·휴대폰 모두 800×600, 휴대폰은 글자를 키움) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const W = 800, H = 600, FS = PHONE ? 1.3 : 1, HIT = PHONE ? 1.45 : 1;
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#eef3fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  let feat = new Set();
  const on = (f) => feat.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const NOW = () => performance.now() / 1000;
  const COL = { push: '#f97316', grav: '#e11d48', elas: '#16a34a', fric: '#b45309', buoy: '#0284c7', ink: '#1b2333', muted: '#5d6879', good: '#16a34a', warn: '#dc2626' };

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

  /* ---------- 공통 보조: 움직이는 물건(추·분동·상자) ---------- */
  const NPX = 24;                        // 화살표 1 N = 24 px (용수철 장면), 용수철은 1 N에 2 cm = 24 px
  const hideHint = () => { const h = $('#stageHint'); if (h) h.classList.add('hide'); };
  function showHint(text, ms) {
    const h = $('#stageHint');
    if (!h) return;
    h.textContent = text; h.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  const approach = SciSim.approach;
  const rad = (d) => d * Math.PI / 180;
  const fm = (v, d) => (+v).toFixed(d == null ? 1 : d);
  /* 물건 하나: home(제자리) · drag(손에 든 상태) · fly(날아가는 중) · on(어딘가에 걸림/놓임)
     tgt()가 돌려주는 자리로 outBack으로 날아가고, 도착한 뒤에는 그 자리를 계속 따라가요. */
  class Item {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, hx: 0, hy: 0, w: 32, h: 26, mode: 'home', u: 1, fx: 0, fy: 0, dur: 0.38, tgt: null, lift: 0, smooth: 0, vis: 1, id: '', g: 0, label: '' }, o);
      this.x = this.hx; this.y = this.hy;
    }
    rest() { return this.mode === 'home' || !this.tgt ? { x: this.hx, y: this.hy } : this.tgt(); }
    go(mode, tgt, dur) {
      this.fx = this.x; this.fy = this.y; this.mode = mode; this.tgt = tgt || null; this.u = 0; this.dur = dur || 0.38;
      this.arrived = false;
    }
    update(dt) {
      if (this.mode === 'drag') { this.lift = approach(this.lift, 1, dt, 20); return; }
      this.lift = approach(this.lift, 0, dt, 14);
      const r = this.rest();
      if (this.u < 1) {
        this.u = Math.min(1, this.u + dt / this.dur);
        const e = RM ? 1 : (this.mode === 'home' ? EASE.outBack(this.u) : EASE.outCubic(this.u));
        this.x = this.fx + (r.x - this.fx) * e; this.y = this.fy + (r.y - this.fy) * e;
        if (this.u >= 1) { this.arrived = true; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(this); } }
      } else if (this.smooth) { this.x = approach(this.x, r.x, dt, this.smooth); this.y = approach(this.y, r.y, dt, this.smooth); }
      else { this.x = r.x; this.y = r.y; }
    }
    hit(p, pad) { pad = pad == null ? 4 : pad; return Math.abs(p.x - this.x) <= this.w / 2 + pad * HIT && Math.abs(p.y - this.y) <= this.h / 2 + pad * HIT; }
  }

  /* 화살표 길이 기준: 막대 하나의 길이가 몇 N인지 알려 줘요 */
  function drawScaleBar(x, y, px, label, onDark) {
    ctx.save();
    ctx.strokeStyle = onDark ? '#fef3c7' : '#334155'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.moveTo(x + px, y - 6); ctx.lineTo(x + px, y + 6); ctx.stroke();
    txt('화살표 이 길이 = ' + label, x + px + 9, y, { align: 'left', size: 13, color: onDark ? '#fff7ed' : '#334155', halo: onDark ? 'rgba(15,23,42,.65)' : 'rgba(255,255,255,.9)' });
    ctx.restore();
  }

  /* 손가락은 굵으니 가장 가까운 물건을 골라요 (휴대폰에서는 더 넉넉하게) */
  function pickNearest(list, p, pad) {
    let best = null, bd = 1e9;
    pad = (pad == null ? 6 : pad) + (PHONE ? 24 : 0);
    list.forEach((it) => { if (it.hit(p, pad)) { const d = Math.hypot(p.x - it.x, (p.y - it.y) * 0.85); if (d < bd) { bd = d; best = it; } } });
    return best;
  }

  const COIL = { x: new Float32Array(260), y: new Float32Array(260) };
  function drawCoil(x, y0, y1, turns, a) {
    const seg = 14, n = turns * seg, pitch = (y1 - y0) / turns, e = a * 0.24;
    for (let i = 0; i <= n; i++) {
      const ph = (i / seg) * Math.PI * 2;
      COIL.x[i] = x + Math.cos(ph) * a; COIL.y[i] = y0 + pitch * (ph / (Math.PI * 2)) + Math.sin(ph) * e;
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const strand = (front) => {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const isFront = Math.sin(((i + 0.5) / seg) * Math.PI * 2) > 0;
        if (isFront !== front) { pen = false; continue; }
        if (!pen) { ctx.moveTo(COIL.x[i], COIL.y[i]); pen = true; }
        ctx.lineTo(COIL.x[i + 1], COIL.y[i + 1]);
      }
    };
    strand(false); ctx.strokeStyle = '#6b7a90'; ctx.lineWidth = 3.6; ctx.stroke();
    strand(true); ctx.strokeStyle = '#3b475a'; ctx.lineWidth = 5.6; ctx.stroke();
    strand(true); ctx.strokeStyle = '#c3cedd'; ctx.lineWidth = 3.8; ctx.stroke();
    ctx.translate(-0.7, -0.9); strand(true); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
    // 양 끝 연결선
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0 - 6); ctx.lineTo(x + a, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + a, y1); ctx.lineTo(x, y1 + 6); ctx.stroke();
  }

  const nfmt = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : fm(v, 1));
  const tri = (u) => { const f = u - Math.floor(u); return f < 0.5 ? f * 2 : (1 - f) * 2; };
  /* 속이 빈 화살표 (운동 방향) */
  function hollowArrow(x, y, dx, dy, color, alpha) {
    const L = Math.hypot(dx, dy);
    if (L < 8) return;
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    arrowPath(x, y, dx, dy, 9, 20);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     장면 F · 마찰력 (1단계 관찰 · 2단계 실험)
     화살표 1 N = 24 px. 나무 위 도막 1개(5 N)의 마찰력 2.0 N
     ========================================================= */
  const FLOOR = 430, STRIP = 44;
  const BW = 112, BH = 60;
  const HOME = 380, LHOME = 232;
  const AF = 300, KV = 3.4, SLACK = 52, REST_DX = 38;     // 미끄러질 때 줄어드는 속력, 끈 길이당 처음 속력, 줄 처짐
  const SURF = {
    glass: { name: '유리', f: 1.2, A: 1.6, P: 10, icon: '🪟', dust: 'rgba(200,225,240,.75)' },
    wood: { name: '나무', f: 2.0, A: 7, P: 24, icon: '🪵', dust: 'rgba(168,120,70,.6)' },
    sand: { name: '사포', f: 3.5, A: 12, P: 30, icon: '🏜️', dust: 'rgba(214,160,90,.7)' },
  };
  const SURF_KEYS = ['glass', 'wood', 'sand'];
  const LENS = { x: 668, y: 134, r: 80 };
  const SAND = [];
  { let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 280; i++) SAND.push({ x: rnd() * W, y: rnd() * STRIP, r: 0.7 + rnd() * 1.5, c: rnd() }); }
  /* 모래알은 한 번만 경로로 만들어 두고 두 번의 fill 로 그려요 (매 프레임 280번 fill 하지 않기 위해) */
  const SAND_P = [new Path2D(), new Path2D()];
  SAND.forEach((s) => { const p = SAND_P[s.c < 0.5 ? 0 : 1]; p.moveTo(s.x + s.r, s.y); p.arc(s.x, s.y, s.r, 0, Math.PI * 2); });
  const FR = {
    mode: 'free', surf: 'wood', surfFrom: 'wood', surfK: 1, blocks: 1,
    x: HOME, v: 0, st: 'idle', t: 0, x0: 0, xs: 0,
    aim: null, pull: { dx: REST_DX, T: 0, drag: false, off: 0, sv: 0, lastX: 0 }, handShow: 0,
    pullHold: 0, maxSlide: { R: 0, L: 0 },
    fr: new AArrow(), pa: new AArrow(),
    // 2단계(실험)
    F: 0, maxF: 0, hold: false, holdFresh: false, gauge: new SciSim.Spring(0, { stiffness: 280, damping: 20 }), maxNeedle: 0, slipT: 0, slipD: 0, done: 0,
    rec: {}, flash: 0, lensKey: 'wood', tableDirty: true,
    lens: { shift: 0, jit: 0, strain: 0, press: 1 },
  };
  const fsNow = () => SURF[FR.surf].f * FR.blocks;
  const recKey = (s, n) => s + n;
  const hookX = () => FR.x + BW / 2 + 3;
  const hookY = () => FLOOR - BH / 2;
  const homeX = () => (FR.mode === 'lab' ? LHOME : HOME);

  /* ---------- 움직임 ---------- */
  function stepFree(dt) {
    const f = FR;
    if (f.st === 'slide') {
      const dir = Math.sign(f.v);
      f.v -= dir * AF * dt;
      if (dir * f.v <= 0) { f.v = 0; f.st = 'rest'; f.t = 0; }
      else {
        f.x += f.v * dt;
        if (f.x < 70 || f.x > W - 70) { f.x = clamp(f.x, 70, W - 70); f.v = 0; f.st = 'rest'; f.t = 0; Sound.tone(150, 0.1, 'sine', 0.12); }
        if (!RM && Math.random() < Math.min(0.9, Math.abs(f.v) / 220)) FX.emit({ x: f.x - dir * (BW / 2 - 4), y: FLOOR - 2, vx: -dir * (20 + Math.random() * 40), vy: -10 - Math.random() * 28, life: 0.45, size: 2 + Math.random() * 2.4, color: 'rgba(168,120,70,.55)', shape: 'smoke', drag: 2 });
      }
    } else if (f.st === 'rest') {
      f.t += dt;
      if (f.t > 0.9) { f.st = 'ret'; f.t = 0; f.x0 = f.x; }
    } else if (f.st === 'ret') {
      f.t += dt;
      const p = Math.min(1, f.t / 0.7);
      f.x = f.x0 + (HOME - f.x0) * EASE.inOutCubic(p);
      if (p >= 1) { f.st = 'idle'; f.x = HOME; }
    } else if (f.st === 'pdrag') {
      const tx = f.pull.px - f.pull.off, nx = clamp(approach(f.x, tx, dt, 22), 70, W - 70);
      f.pull.sv = approach(f.pull.sv, (nx - f.x) / Math.max(dt, 1e-3), dt, 14);
      f.x = nx;
    }
    // 손잡이는 놓으면 제자리로 (줄이 느슨해져요)
    if (!f.pull.drag && f.st !== 'pdrag') f.pull.dx = approach(f.pull.dx, REST_DX, dt, 10);
    if (f.st === 'pull') f.pull.T = Math.max(0, (f.pull.dx - SLACK) / NPX);
    if (f.st === 'pdrag') f.pull.dx = clamp(f.pull.px - (hookX() + 8), SLACK + NPX * 1.6, SLACK + NPX * 7);
    if (f.st !== 'pull' && f.st !== 'pdrag') f.pull.T = approach(f.pull.T, 0, dt, 12);
    // 움직인 거리 기록
    if (f.st === 'slide' || f.st === 'pdrag') {
      const d = f.x - f.xs;
      if (d > 0) f.maxSlide.R = Math.max(f.maxSlide.R, d); else f.maxSlide.L = Math.max(f.maxSlide.L, -d);
    }
    // 1.5초 동안 꿈쩍 않게 당기기
    if (f.st === 'pull' && f.pull.T >= 1.0 && f.pull.T < 1.98) f.pullHold += dt; else f.pullHold = 0;
    // 화살표
    let fr = 0, pa = 0;
    if (f.st === 'pull') { fr = -f.pull.T * NPX; pa = f.pull.T * NPX; }
    else if (f.st === 'pdrag') { fr = -2 * NPX; pa = 2 * NPX; }
    else if (f.st === 'slide') fr = -Math.sign(f.v) * 2 * NPX;
    f.fr.set(fr, 0); f.pa.set(pa, 0);
    f.lens.strain = approach(f.lens.strain, f.st === 'pull' ? f.pull.T / 2 * 3.2 : 0, dt, 14);
    f.lens.jit = approach(f.lens.jit, f.st === 'slide' || f.st === 'pdrag' ? Math.min(1, Math.abs(f.st === 'slide' ? f.v : f.pull.sv) / 160) : 0, dt, 10);
  }
  function startSlide(v) {
    FR.v = clamp(v, -420, 420); FR.st = 'slide';
    Sound.tone(300, 0.12, 'triangle', 0.08);
  }
  function stepLab(dt) {
    const f = FR, fs = fsNow();
    f.gauge.target = f.F; f.gauge.update(dt);
    if (f.st === 'idle') {
      if (f.hold && f.holdFresh) { f.st = 'hold'; f.holdFresh = false; f.maxF = 0; f.maxNeedle = 0; }
      else f.F = approach(f.F, 0, dt, 7);
    }
    if (f.st === 'hold') {
      if (!f.hold) f.st = 'idle';
      else {
        f.F += 1.5 * dt; f.maxF = Math.max(f.maxF, f.F); f.maxNeedle = f.maxF;
        if (f.F >= fs - 1e-6) { f.F = fs; f.maxF = fs; f.maxNeedle = fs; f.st = 'slip'; f.t = 0; f.x0 = f.x; slipRecord(); }
      }
    } else if (f.st === 'slip') {
      f.t += dt;
      const t = f.t, s = 46 * (1 - Math.exp(-7 * t) * (Math.cos(16 * t) + 0.44 * Math.sin(16 * t)));
      f.x = f.x0 + (RM ? 46 : s);
      f.F = fs * (0.84 + 0.16 * (1 - Math.exp(-4 * t)));
      if (!RM && t < 0.5 && Math.random() < 0.7) FX.emit({ x: f.x - BW / 2 + 6, y: FLOOR - 2, vx: -30 - Math.random() * 40, vy: -8 - Math.random() * 24, life: 0.45, size: 2 + Math.random() * 2.2, color: SURF[f.surf].dust, shape: 'smoke', drag: 2 });
      if (t > 1.3) { f.st = 'back'; f.t = 0; f.x1 = f.x; }
    } else if (f.st === 'back') {
      f.t += dt;
      const p = Math.min(1, f.t / 0.7);
      f.x = f.x1 + (LHOME - f.x1) * EASE.inOutCubic(p);
      f.F = approach(f.F, 0, dt, 6);
      if (p >= 1) { f.st = 'idle'; f.x = LHOME; f.F = 0; }
    }
    // 화살표: 당기는 힘 = 마찰력 (움직이기 전까지 계속 같아요)
    const arrowF = f.st === 'hold' || f.st === 'slip' ? f.F : (f.st === 'idle' ? f.F : 0);
    f.pa.set(arrowF * NPX, 0); f.fr.set(-arrowF * NPX, 0);
    f.lens.strain = approach(f.lens.strain, (f.st === 'hold' ? f.F / Math.max(fs, 0.1) * 3.4 : 0), dt, 14);
    f.lens.jit = approach(f.lens.jit, f.st === 'slip' ? Math.max(0, 1 - f.t * 1.8) : 0, dt, 12);
    f.done = f.st === 'idle' ? 0 : 1;
    f.lens.press = approach(f.lens.press, f.blocks, dt, 8);
    f.slipD = f.st === 'slip' ? 1 : 0;
  }
  function slipRecord() {
    const f = FR, k = recKey(f.surf, f.blocks), fs = fsNow(), first = f.rec[k] == null;
    f.rec[k] = fs; f.tableDirty = true; f.flash = 1; renderTableF();
    Sound.tone(220, 0.14, 'sawtooth', 0.06); Sound.tone(880, 0.12, 'triangle', 0.09, 0.08);
    badge('움직이기 시작! 마찰력 ' + fm(fs, 1) + ' N', clamp(f.x + 20, 140, W - 140), FLOOR - BH * f.blocks - 70, COL.fric, 2.4);
    if (!RM) FX.burst(hookX() + 4, hookY(), { count: 8, life: 0.5, speed: 120, gravity: 120, size: 3.6, colors: ['#fcd34d', '#fb923c'] });
    if (first) Sound.tick();
  }
  function stepF(dt) {
    FR.surfK = Math.min(1, FR.surfK + dt / 0.35);
    FR.flash = Math.max(0, FR.flash - dt * 1.6);
    if (FR.mode === 'free') stepFree(dt); else stepLab(dt);
    FR.fr.update(dt); FR.pa.update(dt);
    FR.handShow = approach(FR.handShow, FR.mode === 'free' ? (FR.pull.drag ? 1 : 0) : (FR.hold || FR.st === 'slip' ? 1 : 0), dt, 12);
    const speed = FR.mode === 'free' ? (FR.st === 'slide' ? FR.v : FR.st === 'pdrag' ? FR.pull.sv : 0) : (FR.st === 'slip' ? 60 : 0);
    FR.lens.shift += speed * dt * 0.5;
    FR.lens.shift += (FR.mode === 'free' ? 0 : 0);
  }
  /* ---------- 그리기 ---------- */
  function drawStrip(key, alpha, t) {
    ctx.save(); ctx.globalAlpha *= alpha;
    const y = FLOOR, h = STRIP;
    if (key === 'wood') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f2d3a3'); g.addColorStop(1, '#d9aa6c');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
      ctx.strokeStyle = 'rgba(120,70,30,.38)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = 70; x < W; x += 170) { ctx.moveTo(x, y); ctx.lineTo(x - 6, y + h); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,85,40,.26)'; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let k = 0; k < 4; k++) { const yy = y + 9 + k * 9; ctx.moveTo(0, yy); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, yy + Math.sin(x * 0.04 + k * 1.9) * 1.6); }
      ctx.stroke();
    } else if (key === 'glass') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#eaf8ff'); g.addColorStop(0.55, '#b9e1f6'); g.addColorStop(1, '#7fb9de');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
      ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, h); ctx.clip();
      const sh = RM ? 0 : (t * 18) % 160;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let x = -160 + sh; x < W + 160; x += 160) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y); ctx.lineTo(x + 6, y + h); ctx.lineTo(x - 28, y + h); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, y + h - 7, W, 3);
      ctx.restore();
      ctx.strokeStyle = 'rgba(80,150,200,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y + h - 0.5); ctx.lineTo(W, y + h - 0.5); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#eab16d'); g.addColorStop(1, '#c98440');
      ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
      ctx.save(); ctx.translate(0, y);
      ctx.fillStyle = 'rgba(120,70,20,.5)'; ctx.fill(SAND_P[0]);
      ctx.fillStyle = 'rgba(255,230,180,.6)'; ctx.fill(SAND_P[1]);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawRoomF(t) {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#f6f9ff'); g.addColorStop(1, '#dde7f5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR + 2);
    ctx.fillStyle = 'rgba(100,130,180,.08)'; ctx.fillRect(0, FLOOR - 86, W, 86);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, FLOOR - 88, W, 3);
    // 실험대 앞면
    const fg = ctx.createLinearGradient(0, FLOOR + STRIP, 0, H);
    fg.addColorStop(0, '#b87a3f'); fg.addColorStop(1, '#8a5428');
    ctx.fillStyle = fg; ctx.fillRect(0, FLOOR + STRIP, W, H - FLOOR - STRIP);
    ctx.strokeStyle = 'rgba(60,30,10,.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const y = FLOOR + STRIP + 14 + k * 22; ctx.moveTo(0, y); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.05 + k) * 1.4); }
    ctx.stroke();
    // 바닥(접촉면)
    if (FR.surfK < 1) drawStrip(FR.surfFrom, 1, t);
    drawStrip(FR.surf, FR.surfK < 1 ? EASE.outCubic(FR.surfK) : 1, t);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, FLOOR - 1, W, 2);
    const sh = ctx.createLinearGradient(0, FLOOR + STRIP, 0, FLOOR + STRIP + 26);
    sh.addColorStop(0, 'rgba(40,20,5,.35)'); sh.addColorStop(1, 'rgba(40,20,5,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, FLOOR + STRIP, W, 26);
  }
  function drawBlockF(cx, bottom, label, hook) {
    const w = BW, h = BH, x = cx - w / 2, y = bottom - h;
    ctx.save();
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.32)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#f6d3a0'); g.addColorStop(1, '#c58a4e');
    ctx.fillStyle = g; rr(x, y, w, h, 7); ctx.fill(); ctx.restore();
    ctx.save(); rr(x, y, w, h, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(120,70,30,.28)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 0; k < 6; k++) { const yy = y + 9 + k * 9.5; ctx.moveTo(x, yy); for (let xx = x; xx <= x + w; xx += 8) ctx.lineTo(xx, yy + Math.sin(xx * 0.09 + k * 2.1) * 2); }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 2.6; rr(x, y, w, h, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y + h - 9); ctx.lineTo(x + 6, y + 6); ctx.lineTo(x + w - 10, y + 6); ctx.stroke();
    if (hook) {
      ctx.fillStyle = '#94a3b8'; rr(x + w - 3, bottom - h / 2 - 5, 7, 10, 2); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w + 8, bottom - h / 2, 5.5, 0, Math.PI * 2); ctx.stroke();
    }
    if (label) pill(label, cx, y + h / 2 + 1, { color: '#7c4a1c', size: 13.5 });
    ctx.restore();
  }
  function drawLens(t) {
    const { x, y, r } = LENS, key = FR.mode === 'lab' ? FR.surf : 'wood', s = SURF[key], L = FR.lens;
    const A = s.A, P = s.P;
    ctx.save();
    // 손잡이
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(x + r * 0.7, y + r * 0.7); ctx.lineTo(x + r * 1.16, y + r * 1.16); ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + r * 0.7, y + r * 0.7); ctx.lineTo(x + r * 1.16, y + r * 1.16); ctx.stroke();
    // 유리 안쪽
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#fbfdff'; ctx.fill(); ctx.clip();
    const jx = L.jit * (RM ? 0 : (Math.random() - 0.5) * 3), jy = L.jit * (RM ? 0 : (Math.random() - 0.5) * 3);
    ctx.translate(jx, jy);
    const y0 = y + 8, shift = L.shift + L.strain * 1;
    const lift = A * (1 - Math.abs(Math.cos(Math.PI * shift / P)));
    const yF = (px) => y0 + A * tri((px - x) / P);
    const yB = (px) => yF(px - shift) - lift;
    // 바닥 (아래)
    ctx.beginPath(); ctx.moveTo(x - r - 4, y + r + 4);
    for (let px = x - r - 4; px <= x + r + 4; px += 2) ctx.lineTo(px, yF(px));
    ctx.lineTo(x + r + 4, y + r + 4); ctx.closePath();
    const fg = ctx.createLinearGradient(0, y0, 0, y + r);
    if (key === 'glass') { fg.addColorStop(0, '#a8d8f2'); fg.addColorStop(1, '#5f9fca'); }
    else if (key === 'sand') { fg.addColorStop(0, '#d98f48'); fg.addColorStop(1, '#a8651f'); }
    else { fg.addColorStop(0, '#b98350'); fg.addColorStop(1, '#8a5a30'); }
    ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = 'rgba(90,50,15,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    // 도막 (위)
    ctx.beginPath(); ctx.moveTo(x - r - 4, y - r - 4);
    for (let px = x - r - 4; px <= x + r + 4; px += 2) { if (px === x - r - 4) ctx.lineTo(px, yB(px)); else ctx.lineTo(px, yB(px)); }
    ctx.lineTo(x + r + 4, y - r - 4); ctx.closePath();
    const bg = ctx.createLinearGradient(0, y - r, 0, y0);
    bg.addColorStop(0, '#fff0d4'); bg.addColorStop(1, '#f2c98d');
    ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = 'rgba(110,60,20,.6)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(140,85,40,.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 1; k < 5; k++) { const yy = y0 - 18 - k * 14; ctx.moveTo(x - r, yy); for (let px = x - r; px <= x + r; px += 10) ctx.lineTo(px, yy + Math.sin(px * 0.08 + k) * 1.5); }
    ctx.stroke();
    // 누르는 화살표 (무게)
    const pr = L.press;
    ctx.fillStyle = COL.grav;
    [-26, 0, 26].slice(0, 3).forEach((ox, i) => {
      const len = 10 + 12 * pr, ay = y - 46;
      ctx.globalAlpha = i === 1 ? 1 : 0.55 + 0.2 * (pr - 1);
      ctx.beginPath(); ctx.moveTo(x + ox, ay + len); ctx.lineTo(x + ox - 6, ay + len - 9); ctx.lineTo(x + ox + 6, ay + len - 9); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + ox - 1.6, ay, 3.2, len - 8);
    });
    ctx.globalAlpha = 1;
    // 마찰 화살표 (접촉면 위에서 운동과 반대 방향)
    const fa = FR.fr.k * FR.fr.dx;
    if (Math.abs(fa) > 6) {
      const dir = Math.sign(fa), ln = Math.min(60, 22 + Math.abs(fa) * 0.3);
      forceArrow(x - dir * ln * 0.45, y0 - 16 - A * 0.4, dir * ln, 0, COL.fric, { width: 5.5, head: 14, dot: false });
    }
    // 유리 반사
    const gl = ctx.createLinearGradient(x - r, y - r, x + r * 0.2, y + r * 0.2);
    gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(0.35, 'rgba(255,255,255,.08)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
    // 테두리
    const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rg.addColorStop(0, '#e2e8f0'); rg.addColorStop(0.5, '#64748b'); rg.addColorStop(1, '#334155');
    ctx.lineWidth = 8; ctx.strokeStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x, y, r - 5, Math.PI * 1.08, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
    pill('🔍 접촉면 확대 (모형)', x, y + r + 30, { color: '#475569', size: 13 });
  }
  /* 도막의 접촉 지점과 돋보기를 점선으로 이어 줘요 (다른 그림 뒤에) */
  function drawLensLink() {
    const { x, y, r } = LENS, cx = FR.x, cy = FLOOR + 1;
    ctx.save(); ctx.setLineDash([2, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(71,85,105,.45)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo((cx + x) / 2, FLOOR + 40, x - r * 0.74, y + r * 0.74); ctx.stroke(); ctx.restore();
  }
  function drawContactRing() {
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(FR.x, FLOOR + 1, 8, 0, Math.PI * 2); ctx.stroke();
  }
  /* 줄과 손잡이 (1단계) */
  function drawRopeHandle(t) {
    const f = FR, hx = hookX() + 8, hy = hookY(), dx = f.pull.dx, ex = hx + dx;
    const slack = Math.max(0, SLACK - dx), sag = slack * 0.55 + (dx < SLACK ? 4 : 0);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ex) / 2, hy + sag, ex, hy); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.8; ctx.stroke();
    // 손잡이
    const g = ctx.createRadialGradient(ex - 4, hy - 4, 2, ex, hy, 15);
    g.addColorStop(0, '#fde9b8'); g.addColorStop(1, '#c58a3a');
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 7 + 5 * f.handShow; ctx.shadowOffsetY = 3 + 2 * f.handShow;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, hy, 14 + 1.5 * f.handShow, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ex, hy, 14 + 1.5 * f.handShow, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7c4a1c'; ctx.beginPath(); ctx.arc(ex, hy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (f.handShow > 0.03) { ctx.save(); ctx.globalAlpha = f.handShow; glove(ex + 6, hy, 1, 0, 'pull', { scale: 0.9 }); ctx.restore(); }
  }
  function drawForcesF(t) {
    const f = FR, hx = hookX(), hy = hookY();
    const stackH = f.mode === 'lab' ? f.blocks * BH : BH;
    // 당기는 힘 (주황): 줄·저울 아래쪽에 나란히
    const pa = f.pa, kp = pa.k, pL = pa.dx * kp;
    if (pa.shown && Math.abs(pL) > 3) {
      const ay = hy + 26;
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.push, 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 4, hy + 5); ctx.lineTo(hx + 4, ay - 3); ctx.stroke(); ctx.restore();
      forceArrow(hx + 4, ay, pL, 0, COL.push, {});
      const Fv = Math.abs(pa.dx) / NPX;
      pill('당기는 힘 ' + nfmt(Fv) + ' N', hx + 4 + Math.max(60, pL / 2), ay + 28, { color: COL.push, size: 14 });
    }
    // 마찰력 (갈색): 접촉면에서 운동(하려는) 방향의 반대
    const fa = f.fr, kf = fa.k, fL = fa.dx * kf;
    if (fa.shown && Math.abs(fL) > 3) {
      const ay = FLOOR + 17;
      forceArrow(f.x, ay, fL, 0, COL.fric, {});
      const Fv = Math.abs(fa.dx) / NPX;
      pill('마찰력 ' + nfmt(Fv) + ' N', f.x + fL / 2, ay + 40, { color: COL.fric, size: 14 });
    }
    // 운동 방향 (속이 빈 회색 화살표)
    const v = f.mode === 'free' ? (f.st === 'slide' ? f.v : f.st === 'pdrag' ? f.pull.sv : 0) : 0;
    if (Math.abs(v) > 18) {
      const L = clamp(Math.abs(v) * 0.32, 30, 120), dir = Math.sign(v), ay = FLOOR - BH - 30;
      hollowArrow(f.x - dir * 0, ay, dir * L, 0, '#64748b');
      pill('운동 방향', f.x + dir * (L / 2), ay - 26, { color: '#64748b', size: 13 });
    }
  }
  function drawSceneF1(t) {
    drawRoomF(t);
    drawScaleBar(16, 576, NPX, '1 N', true);
    drawLensLink();
    // 도막 + 먼지
    drawBlockF(f_x(), FLOOR, null, true);
    drawContactRing();
    drawRopeHandle(t);
    drawForcesF(t);
    drawLens(t);
    // 목표 안내
    const m = game && game.current();
    if (m && game.isActive(m)) {
      if (m.key === 'F1' && FR.st === 'idle') D.ring(FR.x, FLOOR - BH / 2, 46, t, { color: '#f59e0b', width: 2.5 });
      if (m.key === 'F2' && FR.st === 'idle') D.ring(hookX() + 8 + FR.pull.dx, hookY(), 24, t, { color: '#f59e0b', width: 2.5 });
    }
    // 튕기기 조준: 끈 길이에 비례하는 처음 속력
    if (FR.st === 'aim' && FR.aim) {
      const d = FR.aim.d, dir = -Math.sign(d) || 1;
      hollowArrow(FR.x, FLOOR - BH - 34, dir * clamp(Math.abs(d) * 1.1, 0, 150), 0, '#64748b');
      pill('놓으면 이쪽으로 튕겨요', FR.x + dir * (Math.abs(d) * 0.55 + 20), FLOOR - BH - 62, { color: '#64748b', size: 13, fit: true });
    }
  }
  const f_x = () => FR.x;

  /* ---------- 2단계: 용수철저울 실험 ---------- */
  const GAUGE = { len: 128, h: 32 };
  const PXF = 12;                                     // 저울 막대가 1 N당 나오는 길이(px)
  function gaugeGeo() {
    const gx = hookX() + 12;
    return { x0: gx, x1: gx + GAUGE.len, y: hookY(), ext: FR.gauge.value * PXF, dialX: gx + GAUGE.len / 2, dialY: hookY() - 84 };
  }
  function drawGauge(t) {
    const f = FR, g = gaugeGeo(), y = g.y, ext = g.ext;
    // 도막과 저울을 잇는 고리
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hookX() + 6, y); ctx.lineTo(g.x0 + 4, y); ctx.stroke();
    // 늘어나는 막대
    const rodEnd = g.x1 + ext + 14;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(g.x1 - 10, y); ctx.lineTo(rodEnd, y); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(g.x1 - 10, y - 1.5); ctx.lineTo(rodEnd, y - 1.5); ctx.stroke();
    // 몸통(유리관) + 안쪽 용수철
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.22)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 4;
    const bg = ctx.createLinearGradient(0, y - GAUGE.h / 2, 0, y + GAUGE.h / 2);
    bg.addColorStop(0, 'rgba(250,252,255,.97)'); bg.addColorStop(0.5, 'rgba(226,234,244,.95)'); bg.addColorStop(1, 'rgba(190,204,222,.97)');
    ctx.fillStyle = bg; rr(g.x0, y - GAUGE.h / 2, GAUGE.len, GAUGE.h, 10); ctx.fill(); ctx.restore();
    ctx.save(); rr(g.x0 + 5, y - GAUGE.h / 2 + 4, GAUGE.len - 10, GAUGE.h - 8, 6); ctx.clip();
    ctx.translate(g.x0 + 8, y); ctx.rotate(-Math.PI / 2);   // 세로 코일을 가로로 눕혀서 그려요
    drawCoil(0, 0, GAUGE.len - 28 + ext * 0.6, 9, 9);
    ctx.restore();
    ctx.strokeStyle = '#8b9bb0'; ctx.lineWidth = 2.4; rr(g.x0, y - GAUGE.h / 2, GAUGE.len, GAUGE.h, 10); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(g.x0, y - GAUGE.h / 2, 12, GAUGE.h, 6); ctx.fill(); rr(g.x1 - 12, y - GAUGE.h / 2, 12, GAUGE.h, 6); ctx.fill();
    // 손잡이 고리 + 손
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(rodEnd + 5, y, 6, 0, Math.PI * 2); ctx.stroke();
    if (f.handShow > 0.03) { ctx.save(); ctx.globalAlpha = f.handShow; glove(rodEnd + 8, y, 1, 0, 'pull', { scale: 0.95 }); ctx.restore(); }
    // 다이얼
    const r = 56;
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(g.dialX, y - GAUGE.h / 2 + 2); ctx.lineTo(g.dialX, g.dialY + r - 4); ctx.stroke(); ctx.restore();
    D.dial(g.dialX, g.dialY, r, clamp(f.gauge.value, 0, 10), 0, 10, { ticks: 5, color: '#e11d48' });
    // 최대값을 붙잡는 회색 바늘
    if (f.maxNeedle > 0.02) {
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, a = a0 + (a1 - a0) * clamp(f.maxNeedle / 10, 0, 1);
      ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(g.dialX + Math.cos(a) * 14, g.dialY + Math.sin(a) * 14); ctx.lineTo(g.dialX + Math.cos(a) * (r - 14), g.dialY + Math.sin(a) * (r - 14)); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(g.dialX + Math.cos(a) * (r - 11), g.dialY + Math.sin(a) * (r - 11), 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    txt('N', g.dialX, g.dialY + 22, { size: 12.5, color: '#64748b', halo: false });
    // 읽는 값
    pill(fm(Math.max(0, f.gauge.value), 1) + ' N', g.dialX + r + 36, g.dialY, { color: '#0f172a', size: 15 });
    if (f.maxNeedle > 0.02) pill('최대 ' + fm(f.maxNeedle, 1) + ' N', g.dialX + r + 44, g.dialY + 32, { color: '#64748b', size: 13 });
  }
  function drawSceneF2(t) {
    drawRoomF(t);
    drawScaleBar(16, 576, NPX, '1 N', true);
    drawLensLink();
    // 도막 (위쪽 도막이 있으면 쌓기)
    drawBlockF(f_x(), FLOOR, '5 N', true);
    if (FR.blocks > 1) drawBlockF(f_x(), FLOOR - BH, '5 N', false);
    drawContactRing();
    drawGauge(t);
    drawForcesF(t);
    drawLens(t);
    // 기록 직후 반짝
    if (FR.flash > 0) { ctx.save(); ctx.globalAlpha = FR.flash; ctx.strokeStyle = COL.good; ctx.lineWidth = 4; rr(FR.x - BW / 2 - 6, FLOOR - BH * FR.blocks - 6, BW + 12, BH * FR.blocks + 12, 12); ctx.stroke(); ctx.restore(); }
    if (isNew('scale') && game && !game.free) newTag(gaugeGeo().x0 - 8, gaugeGeo().dialY - 56, GAUGE.len + 16, 150);
  }

  /* ---------- 입력 ---------- */
  function hitBlock(p) { return Math.abs(p.x - FR.x) <= BW / 2 + 6 * HIT && p.y >= FLOOR - BH - 8 * HIT && p.y <= FLOOR + 4; }
  function hitHandle(p) { const ex = hookX() + 8 + FR.pull.dx; return Math.hypot(p.x - ex, p.y - hookY()) < 30 * HIT; }
  function hitF(p) {
    if (FR.mode !== 'free') return null;
    if (FR.st !== 'idle' && FR.st !== 'pull') return null;
    if (on('pull') && hitHandle(p)) return 'handle';
    if (on('flick') && FR.st === 'idle' && hitBlock(p)) return 'block';
    return null;
  }
  function downF(p) {
    const h = hitF(p);
    if (!h) return false;
    hideHint();
    if (h === 'handle') {
      FR.st = 'pull'; FR.pull.drag = true; FR.pull.px = p.x; FR.pull.off = 0; FR.pull.grab = p.x - (hookX() + 8 + FR.pull.dx);
      Sound.tick();
    } else { FR.st = 'aim'; FR.aim = { sx: p.x, d: 0, x0: FR.x }; Sound.tick(); }
    return true;
  }
  function moveF(p) {
    if (FR.st === 'aim' && FR.aim) {
      const d = clamp(p.x - FR.aim.sx, -120, 120);
      FR.aim.d = d; FR.x = FR.aim.x0 + d;
    } else if (FR.st === 'pull' || FR.st === 'pdrag') {
      const pl = FR.pull;
      pl.px = p.x - pl.grab;
      if (FR.st === 'pull') {
        pl.dx = clamp(pl.px - (hookX() + 8), 8, SLACK + NPX * 6.5);
        const T = Math.max(0, (pl.dx - SLACK) / NPX);
        if (T >= 2.0 - 1e-6) {                   // 2 N을 넘기면 도막이 움직이기 시작해요
          FR.st = 'pdrag'; pl.off = pl.px - FR.x; pl.sv = 0; FR.xs = FR.x; pl.T = 2;
          Sound.tone(260, 0.12, 'sawtooth', 0.05);
          if (!RM) FX.burst(hookX() + 6, hookY(), { count: 7, life: 0.45, speed: 110, gravity: 100, size: 3.2, colors: ['#fcd34d', '#fb923c'] });
        }
      }
    }
  }
  function upF(p) {
    if (FR.st === 'aim' && FR.aim) {
      const d = FR.aim.d;
      FR.aim = null;
      if (Math.abs(d) < 14) { FR.st = 'rest'; FR.t = 0.5; return; }
      startSlide(-Math.sign(d) * KV * Math.abs(d));
      FR.xs = FR.x;
    } else if (FR.st === 'pull') {
      FR.pull.drag = false; FR.st = 'idle';
    } else if (FR.st === 'pdrag') {
      FR.pull.drag = false;
      if (Math.abs(FR.pull.sv) > 30) startSlide(FR.pull.sv); else { FR.st = 'rest'; FR.t = 0; }
    }
  }
  function resetF() {
    FR.x = homeX(); FR.v = 0; FR.st = 'idle'; FR.t = 0; FR.aim = null; FR.pull = { dx: REST_DX, T: 0, drag: false, off: 0, sv: 0, lastX: 0 };
    FR.fr.jump(0, 0); FR.pa.jump(0, 0); FR.F = 0; FR.maxF = 0; FR.maxNeedle = 0; FR.hold = false; FR.gauge.value = 0; FR.gauge.target = 0; FR.gauge.velocity = 0; FR.handShow = 0; FR.pullHold = 0;
    FR.lens.shift = 0; FR.lens.jit = 0; FR.lens.strain = 0;
  }

  /* =========================================================
     장면 B · 물속에서 부력 측정 (3단계)
     원기둥: 공기 중 무게 5.0 N, 부피 200 cm³ → 완전히 잠기면 부력 1.96 N (화살표 1 N = 24 px)
     ========================================================= */
  const TK = { x0: 300, x1: 700, top: 296, bot: 550, wl0: 426 };            // 유리 물통과 처음 물 높이
  const CY = { x: 468, w: 54, h: 98, W: 5.0, FB: 1.96 };
  const SB = { len: 108, pxn: 14 };                                       // 용수철저울 몸통 길이, 1 N = 14 px
  const WL_RISE = 26;                                                     // 원기둥이 다 잠길 때 물이 올라오는 높이(px)
  const ARM_MIN = 64, ARM_MAX = 232, POLE_X = 96;
  const A_SC = SB.pxn * CY.FB;                                            // 부력만큼 저울 용수철이 줄어드는 길이(px)
  const DETENTS = [80, 160, 210, 228];                                    // 0 %, 50 %, 100 %, 더 깊이
  const BALL = { x: 520, r: 38, W: 1.0, FBF: 4.0, G: 520 };
  const BB = {
    stage: 1, stand: 0, ballA: 1,
    armY: 80, armT: 80, grab: null, snapAt: -1,
    read: 5.0, readV: 0,
    rec: {}, pt: {}, flash: 0, rip: 0, ripX: 520, wave: 0,
    ball: { y: TK.wl0 - 13, vy: 0, drag: false, off: 0, maxDepth: 0, pushed: false, released: false, settleT: 0, done: false, fbArrow: new AArrow(), gArrow: new AArrow(), floatT: 0 },
    cG: new AArrow(), cB: new AArrow(), cE: new AArrow(),
    settledT: 0, settled: false,
  };
  const armGeo = (armY) => {
    const top = armY + 8, c0 = top + 30;
    return { top, c0, bot: top + SB.len, B0: armY + 8 + SB.len + 18 + 5 * SB.pxn + 14 + CY.h };
  };
  const eqFrac = (armY) => clamp((armGeo(armY).B0 - TK.wl0) / (CY.h - WL_RISE + A_SC), 0, 1);
  function bGeo() {
    const g = armGeo(BB.armY), r = BB.read;
    const collarY = g.c0 + r * SB.pxn, hookY = g.bot + 18 + r * SB.pxn, cylTop = hookY + 14, cylBot = cylTop + CY.h;
    const fracV = clamp((cylBot - TK.wl0) / (CY.h - WL_RISE), 0, 1);       // 지금 보이는 잠긴 정도
    const ws = TK.wl0 - WL_RISE * fracV;
    return { top: g.top, c0: g.c0, bot: g.bot, collarY, hookY, cylTop, cylBot, frac: fracV, ws };
  }
  const BCAT = { air: '잠기지 않음(0 %)', half: '반쯤 잠김(50 %)', full: '완전히 잠김(100 %)', deep: '더 깊이 완전히 잠김' };
  const BKEYS = ['air', 'half', 'full', 'deep'];
  function bCategory() {
    const ef = eqFrac(BB.armT);
    if (ef < 0.02) return 'air';
    if (Math.abs(ef - 0.5) < 0.06) return 'half';
    if (ef > 0.98 && BB.armT < 220) return 'full';
    if (ef > 0.98 && BB.armT >= 224) return 'deep';
    return null;
  }
  const bTarget = () => CY.W - CY.FB * eqFrac(BB.armY);

  function ballFrac(b) {
    const r = BALL.r, h = clamp(b.y + r - TK.wl0, 0, 2 * r);
    return { h, frac: h * h * (3 * r - h) / (4 * r * r * r), depth: h / (2 * r) };
  }
  function stepBall(dt) {
    const b = BB.ball, r = BALL.r;
    if (b.drag) { b.vy = 0; }
    else {
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) {
        const f = ballFrac(b);
        const a = BALL.G * (1 - f.frac * (BALL.FBF / BALL.W)) - (f.h > 0 ? 5.2 : 0.4) * b.vy;
        b.vy += a * h; b.y += b.vy * h;
        if (b.y > TK.bot - 6 - r) { b.y = TK.bot - 6 - r; b.vy = 0; }
        if (b.y - r < TK.top - 120) { b.y = TK.top - 120 + r; b.vy = 0; }
      }
    }
    const f = ballFrac(b);
    if (b.drag) { b.maxDepth = Math.max(b.maxDepth, f.depth); if (b.maxDepth >= 0.8) b.pushed = true; }
    if (b.released && b.pushed && !b.drag) {
      const eq = Math.abs(b.vy) < 6 && f.frac > 0.12 && f.frac < 0.4;
      b.settleT = eq ? b.settleT + dt : 0;
      if (b.settleT > 0.9 && !b.done) { b.done = true; }
    }
    // 화살표: 중력(아래) · 부력(위, 잠긴 정도에 따라)
    b.gArrow.set(0, BALL.W * NPX); b.fbArrow.set(0, -f.frac * BALL.FBF * NPX); b.gArrow.update(dt); b.fbArrow.update(dt);
    // 물결과 거품
    if (Math.abs(b.vy) > 40 || b.drag) BB.rip = Math.min(1, BB.rip + dt * 2.2 * (Math.abs(b.vy) / 300 + (b.drag ? 0.5 : 0)));
    BB.ripX = BALL.x;
    if (!RM && f.h > 0 && f.h < 2 * r && (Math.abs(b.vy) > 80) && Math.random() < 0.5) FX.emit({ x: BALL.x + (Math.random() - 0.5) * r, y: b.y + r * 0.6, vx: (Math.random() - 0.5) * 16, vy: -40 - Math.random() * 40, life: 0.8, size: 2.5 + Math.random() * 3, color: '#cfeaff', shape: 'bubble', drag: 0.4, gravity: -20 });
  }
  function stepB(dt) {
    BB.wave += dt;
    BB.rip = Math.max(0, BB.rip - dt * 0.9);
    BB.stand = approach(BB.stand, BB.stage === 2 ? 1 : 0, dt, 4.5);
    if (Math.abs(BB.stand - (BB.stage === 2 ? 1 : 0)) < 0.002) BB.stand = BB.stage === 2 ? 1 : 0;
    BB.ballA = approach(BB.ballA, BB.stage === 1 ? 1 : 0, dt, 5);
    BB.flash = Math.max(0, BB.flash - dt * 2);
    Object.keys(BB.pt).forEach((k) => { BB.pt[k] = Math.min(1, BB.pt[k] + dt / 0.5); });
    if (BB.stage === 1) stepBall(dt);
    // 저울 눈금 (용수철: 같은 빠르기로 출렁여요)
    BB.armY = approach(BB.armY, BB.armT, dt, 18);
    if (Math.abs(BB.armY - BB.armT) < 0.15) BB.armY = BB.armT;
    const tg = bTarget(), w0 = 8, z = 0.35, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -w0 * w0 * (BB.read - tg) - 2 * z * w0 * BB.readV; BB.readV += a * h; BB.read += BB.readV * h; }
    if (Math.abs(BB.read - tg) < 0.004 && Math.abs(BB.readV) < 0.03) { BB.read = tg; BB.readV = 0; }
    const calm = !BB.grab && BB.armY === BB.armT && Math.abs(BB.readV) < 0.02 && Math.abs(BB.read - tg) < 0.015;
    BB.settledT = calm ? BB.settledT + dt : 0;
    BB.settled = BB.settledT > 0.3;
    const g = bGeo();
    BB.cG.set(0, CY.W * NPX); BB.cE.set(0, -BB.read * NPX); BB.cB.set(0, -g.frac * CY.FB * NPX);
    BB.cG.update(dt); BB.cE.update(dt); BB.cB.update(dt);
    if (BB.stage === 2) {
      const sx = CY.x, fast = Math.abs(BB.armY - BB.armT) > 1.5 || Math.abs(BB.readV) > 0.2;
      if (fast && g.frac > 0.02 && g.frac < 1.0) BB.rip = Math.min(1, BB.rip + dt * 1.6);
      BB.ripX = sx;
      if (!RM && fast && g.frac > 0.02 && g.frac < 1 && Math.random() < 0.3) FX.emit({ x: sx + (Math.random() - 0.5) * CY.w, y: g.ws + 4, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 0.6, size: 2 + Math.random() * 2.5, color: '#cfeaff', shape: 'bubble', drag: 0.5, gravity: -10 });
    }
  }

  /* ---------- 그리기 ---------- */
  function drawRoomB() {
    const g = ctx.createLinearGradient(0, 0, 0, TK.bot); g.addColorStop(0, '#f6f9ff'); g.addColorStop(1, '#dce7f6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(100,130,180,.08)'; ctx.fillRect(0, TK.bot - 90, W, 90);
    // 실험대
    const by = TK.bot + 2;
    const top = ctx.createLinearGradient(0, by, 0, by + 22); top.addColorStop(0, '#ecc08a'); top.addColorStop(1, '#cf9257');
    ctx.fillStyle = top; ctx.fillRect(0, by, W, 24);
    ctx.fillStyle = '#a86a35'; ctx.fillRect(0, by + 22, W, H - by - 22);
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, by + 1); ctx.lineTo(W, by + 1); ctx.stroke();
    const sh = ctx.createLinearGradient(0, by + 24, 0, by + 52); sh.addColorStop(0, 'rgba(60,30,10,.28)'); sh.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, by + 24, W, 30);
  }
  function waterSurfaceY(x, ws) {
    const amp = 1.4 + BB.rip * 4.2, d = Math.abs(x - BB.ripX);
    return ws + Math.sin(BB.wave * 2.6 + x * 0.045) * amp * 0.6 + Math.sin(BB.wave * 4.1 - d * 0.09) * amp * Math.exp(-d / 160) * 0.8;
  }
  function drawTankBack() {
    // 물통 뒷벽
    ctx.save();
    const gl = ctx.createLinearGradient(TK.x0, 0, TK.x1, 0);
    gl.addColorStop(0, 'rgba(210,228,246,.55)'); gl.addColorStop(0.5, 'rgba(235,245,255,.32)'); gl.addColorStop(1, 'rgba(200,222,244,.55)');
    ctx.fillStyle = gl; rr(TK.x0, TK.top, TK.x1 - TK.x0, TK.bot - TK.top, 14); ctx.fill();
    ctx.restore();
  }
  function drawWater(ws, t) {
    const x0 = TK.x0 + 6, x1 = TK.x1 - 6, yb = TK.bot - 4;
    ctx.save();
    rr(TK.x0 + 3, TK.top + 3, TK.x1 - TK.x0 - 6, TK.bot - TK.top - 6, 12); ctx.clip();
    ctx.beginPath(); ctx.moveTo(x0, yb);
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, waterSurfaceY(x, ws));
    ctx.lineTo(x1, yb); ctx.closePath();
    const wg = ctx.createLinearGradient(0, ws, 0, yb);
    wg.addColorStop(0, 'rgba(110,190,245,.46)'); wg.addColorStop(1, 'rgba(14,100,190,.66)');
    ctx.fillStyle = wg; ctx.fill();
    // 물속 빛줄기
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    for (let k = 0; k < 4; k++) { const sx = x0 + 40 + k * 100 + Math.sin(BB.wave * 0.6 + k) * 16; ctx.beginPath(); ctx.moveTo(sx, ws); ctx.lineTo(sx + 30, ws); ctx.lineTo(sx - 10, yb); ctx.lineTo(sx - 46, yb); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // 수면 반짝임
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = x0; x <= x1; x += 6) { const y = waterSurfaceY(x, ws); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
    // 메니스커스 (벽을 따라 물이 살짝 올라가요)
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    [[TK.x0 + 6, 1], [TK.x1 - 6, -1]].forEach(([x, s]) => { ctx.beginPath(); ctx.moveTo(x, ws - 6); ctx.quadraticCurveTo(x, ws, x + s * 12, ws + 1); ctx.stroke(); });
    ctx.restore();
  }
  function drawTankFront() {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,150,190,.85)'; ctx.lineWidth = 5; rr(TK.x0, TK.top, TK.x1 - TK.x0, TK.bot - TK.top, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; rr(TK.x0 + 5, TK.top + 5, TK.x1 - TK.x0 - 10, TK.bot - TK.top - 10, 11); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(TK.x0 + 14, TK.top + 20, 9, TK.bot - TK.top - 60, 4); ctx.fill();
    ctx.restore();
  }
  function drawBall(t) {
    const b = BB.ball, r = BALL.r;
    ctx.save(); ctx.globalAlpha *= BB.ballA;
    softShadow(BALL.x, TK.bot - 6, r * 1.1, 6, 0.22 * (b.y + r > TK.wl0 + 40 ? 1 : 0.4));
    ctx.translate(BALL.x, b.y);
    ctx.rotate(Math.sin(BB.wave * 1.2) * 0.05 + (b.y - TK.wl0) * 0.002);
    // 비치볼: 6조각
    const cols = ['#ef4444', '#facc15', '#38bdf8', '#ffffff', '#22c55e', '#f97316'];
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r + 2, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = cols[i]; ctx.fill();
    }
    const sg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    sg.addColorStop(0, 'rgba(255,255,255,.6)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(10,20,60,.34)');
    ctx.fillStyle = sg; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(0, -r + 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawStandB(t) {
    const k = EASE.outCubic(BB.stand);
    if (k < 0.01) return;
    const g = bGeo(), x = CY.x, ox = -(1 - k) * 280;
    ctx.save(); ctx.translate(ox, 0); ctx.globalAlpha *= Math.min(1, k * 1.5);
    // 기둥과 받침
    softShadow(POLE_X + 24, TK.bot + 6, 70, 7, 0.3);
    const bg = ctx.createLinearGradient(0, TK.bot - 12, 0, TK.bot + 2); bg.addColorStop(0, '#a3afc0'); bg.addColorStop(1, '#5b6779');
    ctx.fillStyle = bg; rr(POLE_X - 50, TK.bot - 12, 110, 14, 4); ctx.fill();
    const pg = ctx.createLinearGradient(POLE_X - 5, 0, POLE_X + 5, 0); pg.addColorStop(0, '#8693a5'); pg.addColorStop(0.45, '#eef2f8'); pg.addColorStop(1, '#6b7788');
    ctx.fillStyle = pg; rr(POLE_X - 5, 34, 10, TK.bot - 44, 3); ctx.fill();
    // 팔 (위아래로 끌 수 있어요)
    const ay = BB.armY;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    const ag = ctx.createLinearGradient(0, ay - 5, 0, ay + 5); ag.addColorStop(0, '#f1f5f9'); ag.addColorStop(1, '#7a8799');
    ctx.fillStyle = ag; rr(POLE_X - 4, ay - 5, x - POLE_X + 24, 10, 4); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#475569'; rr(POLE_X - 11, ay - 12, 22, 24, 5); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(POLE_X, ay, 3.6, 0, Math.PI * 2); ctx.fill();
    // 손잡이(↕)
    const kx = POLE_X + 96, lift = BB.grab ? 1 : 0;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.28)'; ctx.shadowBlur = 6 + 8 * lift; ctx.shadowOffsetY = 2 + 4 * lift;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, ay - 2 * lift, 13 * (1 + 0.15 * lift), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = COL.push; ctx.beginPath(); ctx.arc(kx, ay - 2 * lift, 13 * (1 + 0.15 * lift), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c2410c';
    ctx.beginPath(); ctx.moveTo(kx, ay - 2 * lift - 8.5); ctx.lineTo(kx - 4.6, ay - 2 * lift - 3.4); ctx.lineTo(kx + 4.6, ay - 2 * lift - 3.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(kx, ay - 2 * lift + 8.5); ctx.lineTo(kx - 4.6, ay - 2 * lift + 3.4); ctx.lineTo(kx + 4.6, ay - 2 * lift + 3.4); ctx.closePath(); ctx.fill();
    // 용수철저울 (세로)
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, ay + 5); ctx.lineTo(x, g.top - 3); ctx.stroke();
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const hg = ctx.createLinearGradient(x - 22, 0, x + 22, 0); hg.addColorStop(0, 'rgba(235,243,252,.95)'); hg.addColorStop(0.5, 'rgba(255,255,255,.88)'); hg.addColorStop(1, 'rgba(205,218,235,.95)');
    ctx.fillStyle = hg; rr(x - 22, g.top, 44, SB.len, 9); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#8b9bb0'; ctx.lineWidth = 2.4; rr(x - 22, g.top, 44, SB.len, 9); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(x - 22, g.top, 44, 11, 7); ctx.fill(); rr(x - 22, g.bot - 8, 44, 8, 5); ctx.fill();
    ctx.save(); rr(x - 21, g.top + 10, 42, SB.len - 19, 4); ctx.clip(); drawCoil(x, g.top + 13, g.collarY, 9, 11); ctx.restore();
    ctx.strokeStyle = '#4b5565'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x, g.collarY); ctx.lineTo(x, g.hookY - 6); ctx.stroke();
    ctx.fillStyle = '#e11d48'; rr(x - 14, g.collarY - 3, 28, 6, 3); ctx.fill();
    // N 눈금판
    const px0 = x + 26;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.16)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rr(px0, g.c0 - 20, 46, 6 * SB.pxn + 38, 7); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4; rr(px0, g.c0 - 20, 46, 6 * SB.pxn + 38, 7); ctx.stroke();
    for (let n = 0; n <= 6; n++) {
      const y = g.c0 + n * SB.pxn, major = n % 2 === 0;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = major ? 1.8 : 1.1; ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + (major ? 14 : 8), y); ctx.stroke();
      if (major) txt(String(n), px0 + 29, y, { size: 12, color: '#334155', halo: 'rgba(255,255,255,.95)', weight: 700 });
    }
    txt('N', px0 + 23, g.c0 - 10, { size: 12.5, color: '#2563eb', halo: false });
    ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(x + 14, g.collarY); ctx.lineTo(px0 + 4, g.collarY - 3.5); ctx.lineTo(px0 + 4, g.collarY + 3.5); ctx.closePath(); ctx.fill();
    // 갈고리 + 원기둥
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(x, g.hookY - 2, 5.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, g.hookY + 3); ctx.lineTo(x, g.cylTop + 3); ctx.stroke();
    const cx0 = x - CY.w / 2;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const cg = ctx.createLinearGradient(cx0, 0, cx0 + CY.w, 0);
    cg.addColorStop(0, '#8693a6'); cg.addColorStop(0.28, '#f1f5f9'); cg.addColorStop(0.62, '#aab6c6'); cg.addColorStop(1, '#68758a');
    ctx.fillStyle = cg; rr(cx0, g.cylTop + 4, CY.w, CY.h - 4, 8); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#4b5a70'; ctx.lineWidth = 1.8; rr(cx0, g.cylTop + 4, CY.w, CY.h - 4, 8); ctx.stroke();
    ctx.fillStyle = '#c4cedc'; ctx.beginPath(); ctx.ellipse(x, g.cylTop + 5, CY.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9c460'; ctx.beginPath(); ctx.arc(x, g.cylTop + 3, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7a5200'; ctx.stroke();
    ctx.strokeStyle = 'rgba(51,65,85,.55)'; ctx.lineWidth = 1.4;
    [0.25, 0.5, 0.75].forEach((p) => { const yy = g.cylTop + 4 + (CY.h - 4) * (1 - p); ctx.beginPath(); ctx.moveTo(cx0 + CY.w - 12, yy); ctx.lineTo(cx0 + CY.w, yy); ctx.stroke(); });
    txt('금속', x - 2, g.cylTop + CY.h * 0.5, { size: 13, color: '#334155', halo: 'rgba(255,255,255,.55)' });
    ctx.restore();
  }
  function drawBForces(t, g) {
    if (BB.stand < 0.6) return;
    const x = CY.x, a = BB.stand;
    ctx.save(); ctx.globalAlpha = Math.min(1, (a - 0.6) * 2.5);
    const xl = x - CY.w / 2 - 30, xr = x + CY.w / 2 + 30;
    // 저울이 당기는 탄성력 (위쪽): 갈고리에서 위로
    const kE = BB.cE.k, eL = BB.cE.dy * kE;
    if (Math.abs(eL) > 3) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.elas, 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 6, g.cylTop + 4); ctx.lineTo(xl + 4, g.cylTop + 4); ctx.stroke(); ctx.restore();
      forceArrow(xl, g.cylTop + 4, 0, eL, COL.elas, {});
      pill('탄성력 ' + fm(BB.read, 1) + ' N', xl - 12, g.cylTop + 4 + eL * 0.5, { align: 'right', color: COL.elas, size: 13 });
    }
    // 부력 (위쪽, 잠긴 정도에 비례): 잠긴 부분의 가운데에서 위로
    const kB = BB.cB.k, bL = BB.cB.dy * kB;
    if (g.frac > 0.02 && Math.abs(bL) > 3) {
      const sub = CY.h * g.frac, yb = g.cylBot - sub / 2;
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.buoy, 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - CY.w / 2 + 2, yb); ctx.lineTo(xl + 4, yb); ctx.stroke(); ctx.restore();
      forceArrow(xl, yb, 0, bL, COL.buoy, {});
      pill('부력 ' + fm(g.frac * CY.FB, 1) + ' N', xl - 12, yb + bL * 0.5 - 4, { align: 'right', color: COL.buoy, size: 13 });
    }
    // 중력 (아래쪽, 원기둥 무게)
    const kG = BB.cG.k, gL = BB.cG.dy * kG, yc = g.cylTop + 4 + CY.h / 2;
    if (Math.abs(gL) > 3) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.grav, 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + CY.w / 2 - 2, yc); ctx.lineTo(xr - 4, yc); ctx.stroke(); ctx.restore();
      forceArrow(xr, yc, 0, gL, COL.grav, {});
      pill('중력 ' + fm(CY.W, 1) + ' N', xr + 12, yc + gL * 0.5, { align: 'left', color: COL.grav, size: 13 });
    }
    ctx.restore();
    // 잠긴 정도
    if (g.frac > 0.02) pill('잠긴 정도 ' + Math.round(g.frac * 100) + ' %', TK.x1 - 98, g.ws - 24, { solid: true, color: COL.buoy, size: 13.5 });
    // 물 높이가 올라간 만큼 (밀려난 물)
    if (g.frac > 0.05) {
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(2,132,199,.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(TK.x1 - 58, TK.wl0); ctx.lineTo(TK.x1 - 10, TK.wl0); ctx.stroke(); ctx.restore();
      const dy = TK.wl0 - g.ws;
      if (dy > 3) { ctx.fillStyle = 'rgba(2,132,199,.9)'; ctx.beginPath(); ctx.moveTo(TK.x1 - 34, g.ws + 1); ctx.lineTo(TK.x1 - 40, g.ws + 8); ctx.lineTo(TK.x1 - 28, g.ws + 8); ctx.closePath(); ctx.fill(); txt('물 높이 ↑', TK.x1 - 34, TK.wl0 + 16, { size: 12, color: '#075985', halo: 'rgba(255,255,255,.7)' }); }
    }
  }
  function drawInfoCard(g) {
    if (BB.stand < 0.7) return;
    const x = 552, y = 14, w = 236, h = 118, a = Math.min(1, (BB.stand - 0.7) * 3.3);
    ctx.save(); ctx.globalAlpha = a;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.16)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    rr(x, y, w, h, 14); ctx.fillStyle = 'rgba(255,255,255,.97)'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#dbe3ee'; ctx.lineWidth = 1.5; rr(x, y, w, h, 14); ctx.stroke();
    const rd = Math.round(BB.read * 10) / 10;
    const buoy = Math.round((CY.W - rd) * 10) / 10;
    txt('부력 구하기', x + 14, y + 18, { size: 14.5, color: '#075985', align: 'left', halo: false });
    txt('공기 중 무게', x + 14, y + 44, { size: 14, color: '#334155', align: 'left', halo: false, weight: 700 });
    txt(fm(CY.W, 1) + ' N', x + w - 14, y + 44, { size: 15, color: '#334155', align: 'right', halo: false });
    txt('물속 무게 (저울 눈금)', x + 14, y + 68, { size: 14, color: '#334155', align: 'left', halo: false, weight: 700 });
    txt(fm(rd, 1) + ' N', x + w - 14, y + 68, { size: 15, color: COL.elas, align: 'right', halo: false });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 14, y + 81); ctx.lineTo(x + w - 14, y + 81); ctx.stroke();
    txt('부력 = 5.0 − ' + fm(rd, 1), x + 14, y + 100, { size: 14, color: COL.buoy, align: 'left', halo: false });
    txt('= ' + fm(buoy, 1) + ' N', x + w - 14, y + 100, { size: 17, color: COL.buoy, align: 'right', halo: false });
    ctx.restore();
  }
  function drawSceneB(t) {
    drawRoomB();
    drawScaleBar(16, 580, NPX, '1 N', true);
    drawTankBack();
    const g = bGeo();
    const ws = BB.stage === 2 ? g.ws : TK.wl0 - 5 * ballFrac(BB.ball).frac;
    if (BB.stage === 2 || BB.stand > 0.01) drawStandB(t);
    if (BB.ballA > 0.02) drawBall(t);
    drawWater(ws, t);
    drawTankFront();
    // 비치볼의 힘 화살표
    if (BB.stage === 1 && BB.ballA > 0.5) {
      const b = BB.ball, f = ballFrac(b), r = BALL.r;
      const xl = BALL.x - r - 34, xr = BALL.x + r + 34;
      const kB = b.fbArrow.k, bL = b.fbArrow.dy * kB, kG = b.gArrow.k, gL = b.gArrow.dy * kG;
      if (f.frac > 0.02 && Math.abs(bL) > 3) {
        const yb = b.y + r - f.h * 0.45;
        forceArrow(xl, yb, 0, bL, COL.buoy, {});
        pill('부력 ' + fm(f.frac * BALL.FBF, 1) + ' N', xl - 12, yb + bL * 0.5, { align: 'right', color: COL.buoy, size: 13.5 });
      }
      if (Math.abs(gL) > 3) { forceArrow(xr, b.y, 0, gL, COL.grav, {}); pill('중력 ' + fm(BALL.W, 1) + ' N', xr + 12, b.y + gL * 0.5 + 6, { align: 'left', color: COL.grav, size: 13.5 }); }
      if (b.drag || f.depth > 0.05) pill('잠긴 깊이 ' + Math.round(f.depth * 100) + ' %', TK.x1 - 100, TK.wl0 - 30, { solid: true, color: f.depth >= 0.8 ? COL.good : COL.buoy, size: 13.5 });
    } else drawBForces(t, g);
    if (BB.stage === 2) drawInfoCard(g);
    // 기록 직후 반짝
    if (BB.flash > 0 && BB.stage === 2) { ctx.save(); ctx.globalAlpha = BB.flash; ctx.strokeStyle = COL.good; ctx.lineWidth = 4; rr(CY.x - CY.w / 2 - 8, g.cylTop - 4, CY.w + 16, CY.h + 12, 12); ctx.stroke(); ctx.restore(); }
    // 안내
    const m = game && game.current();
    if (m && game.isActive(m)) {
      if (m.key === 'B1' && !BB.ball.drag && !BB.ball.released) D.ring(BALL.x, BB.ball.y, 50, t, { color: '#f59e0b', width: 2.5 });
      if (m.key === 'B2' && !BB.grab && BB.stand > 0.95 && Object.keys(BB.rec).length === 0 && BB.armT === 80) D.ring(POLE_X + 96, BB.armY, 24, t, { color: '#f59e0b', width: 2.5 });
    }
  }

  /* ---------- 입력 ---------- */
  function hitB(p) {
    if (BB.stage === 1) {
      const b = BB.ball;
      return Math.hypot(p.x - BALL.x, p.y - b.y) < BALL.r + 12 * HIT ? 'ball' : null;
    }
    if (BB.stand < 0.95) return null;
    const g = bGeo();
    const nearArm = Math.abs(p.y - BB.armY) < 22 * HIT && p.x > POLE_X - 20 && p.x < CY.x + 30;
    const nearScale = Math.abs(p.x - CY.x) < 36 * HIT && p.y > g.top - 10 && p.y < g.cylBot + 6;
    return nearArm || nearScale ? 'arm' : null;
  }
  function downB(p) {
    const h = hitB(p);
    if (!h) return false;
    hideHint();
    if (h === 'ball') { const b = BB.ball; b.drag = true; b.off = b.y - p.y; b.released = false; b.maxDepth = 0; b.settleT = 0; Sound.tick(); return true; }
    BB.grab = { off: BB.armT - p.y }; Sound.tick(); return true;
  }
  function moveB(p) {
    if (BB.stage === 1 && BB.ball.drag) {
      const b = BB.ball;
      b.y = clamp(p.y + b.off, TK.wl0 - 60, TK.bot - 6 - BALL.r);
    } else if (BB.grab) {
      let t = clamp(p.y + BB.grab.off, ARM_MIN, ARM_MAX);
      let snap = -1;
      DETENTS.forEach((d, i) => { if (Math.abs(t - d) < 8) { t = d; snap = i; } });
      if (snap !== BB.snapAt) { if (snap >= 0) Sound.tick(); BB.snapAt = snap; }
      BB.armT = t;
    }
  }
  function upB() {
    if (BB.stage === 1 && BB.ball.drag) { const b = BB.ball; b.drag = false; b.released = true; if (b.pushed) Sound.tone(420, 0.14, 'sine', 0.1); }
    BB.grab = null;
  }
  function resetB() {
    const b = BB.ball; b.y = TK.wl0 - 13; b.vy = 0; b.drag = false; b.maxDepth = 0; b.pushed = false; b.released = false; b.settleT = 0; b.done = false; b.fbArrow.jump(0, 0); b.gArrow.jump(0, 0);
    BB.armY = BB.armT = 80; BB.grab = null; BB.read = CY.W; BB.readV = 0; BB.snapAt = -1;
  }
  function canRecordB() { return scene === 'B' && BB.stage === 2 && BB.stand > 0.95 && BB.settled && bCategory() !== null; }
  function doRecordB() {
    if (!canRecordB()) return;
    const key = bCategory(), rd = Math.round(BB.read * 10) / 10;
    BB.rec[key] = { pct: Math.round(eqFrac(BB.armT) * 100), read: rd, buoy: Math.round((CY.W - rd) * 10) / 10 };
    BB.pt[key] = 0; BB.flash = 1; renderTableB();
    Sound.tone(880, 0.12, 'triangle', 0.1); Sound.tone(1175, 0.12, 'triangle', 0.08, 0.07);
    badge('📍 ' + BCAT[key] + ' · ' + fm(rd, 1) + ' N 기록!', CY.x + 130, 160, COL.good, 1.9);
  }
  function renderTableB() {
    const r1 = $('#rowB1'), r2 = $('#rowB2'), r3 = $('#rowB3');
    if (!r1) return;
    r1.innerHTML = '<th>잠긴 정도</th>'; r2.innerHTML = '<th>저울 눈금 (물속 무게)</th>'; r3.innerHTML = '<th>부력 = 5.0 − 눈금</th>';
    let c = 0;
    BKEYS.forEach((k) => {
      const d = BB.rec[k]; if (d) c++;
      const lab = { air: '0 %', half: '50 %', full: '100 %', deep: '100 % (더 깊이)' }[k];
      r1.insertAdjacentHTML('beforeend', '<td class="' + (d ? '' : 'empty') + '">' + (d ? lab : '·') + '</td>');
      r2.insertAdjacentHTML('beforeend', '<td class="' + (d ? '' : 'empty') + '">' + (d ? fm(d.read, 1) + ' N' : '·') + '</td>');
      r3.insertAdjacentHTML('beforeend', '<td class="' + (d ? 'buoy' : 'empty') + '">' + (d ? fm(d.buoy, 1) + ' N' : '·') + '</td>');
    });
    $('#dataBN').textContent = '기록 ' + c + '/4';
  }

  /* =========================================================
     장면 C · 생활 속 마찰력 분류 카드 (4단계)
     ========================================================= */
  const CARD_DEF = [
    { id: 'boots', icon: '🥾', name: '등산화의 울퉁불퉁한 밑창', big: true, hint: '밑창이 울퉁불퉁하면 바닥과 잘 걸려서 마찰력이 커져요. 그래서 미끄러지지 않아요.' },
    { id: 'chain', icon: '⛓️', name: '눈길 자동차 체인', big: true, hint: '체인이 눈과 얼음에 파고들어 접촉면이 거칠어지니 마찰력이 커져요.' },
    { id: 'mat', icon: '🛁', name: '욕실 미끄럼 방지 매트', big: true, hint: '돌기가 있는 거친 매트는 마찰력이 커서 발이 미끄러지지 않아요.' },
    { id: 'bike', icon: '🚲', name: '자전거 체인에 기름칠', big: false, hint: '기름을 바르면 접촉면이 매끄러워져서 마찰력이 작아져요.' },
    { id: 'ski', icon: '⛷️', name: '스키 바닥에 왁스칠', big: false, hint: '왁스를 바르면 바닥이 매끄러워져서 눈 위에서 마찰력이 작아져요.' },
    { id: 'bowl', icon: '🎳', name: '볼링 레인에 기름칠', big: false, hint: '레인에 기름을 바르면 매끄러워져서 공이 마찰을 적게 받고 잘 굴러가요.' },
  ];
  const CW = 188, CH = 110;
  const CPOS = [[150, 112], [400, 112], [650, 112], [150, 238], [400, 238], [650, 238]];
  const CBIN = { L: { x: 24, y: 372, w: 366, h: 196 }, R: { x: 410, y: 372, w: 366, h: 196 } };
  const SHUF = [3, 0, 5, 2, 4, 1];
  const CS = {
    cards: CARD_DEF.map((d, i) => { const p = CPOS[SHUF.indexOf(i)]; return Object.assign({ it: new Item({ id: d.id, hx: p[0], hy: p[1], w: CW, h: CH }), placed: null, shake: 0 }, d); }),
    hint: null, hot: null, drag: null, done: 0,
  };
  const binSlot = (side, n) => ({ x: CBIN[side].x + 62 + n * 120, y: CBIN[side].y + 108 });
  function emojiFont(sz) { return sz + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",' + FONT; }
  function drawCard(c, mini, t) {
    const it = c.it, s = mini ? 0.64 : 1;
    ctx.save();
    ctx.translate(it.x + (c.shake ? Math.sin(c.shake * 38) * 7 * c.shake : 0), it.y - it.lift * 5);
    ctx.scale(s * (1 + 0.06 * it.lift), s * (1 + 0.06 * it.lift));
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,' + (0.2 + 0.1 * it.lift).toFixed(2) + ')'; ctx.shadowBlur = 8 + 10 * it.lift; ctx.shadowOffsetY = 3 + 5 * it.lift;
    const g = ctx.createLinearGradient(0, -CH / 2, 0, CH / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = g; rr(-CW / 2, -CH / 2, CW, CH, 14); ctx.fill(); ctx.restore();
    ctx.lineWidth = 2.6; ctx.strokeStyle = c.placed ? (c.big ? COL.fric : COL.buoy) : '#cbd5e1'; rr(-CW / 2, -CH / 2, CW, CH, 14); ctx.stroke();
    ctx.font = emojiFont(40); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.icon, 0, -18);
    // 이름 (두 줄까지)
    const words = c.name.split(' '); let l1 = '', l2 = '';
    words.forEach((w) => { if (measure(l1 + ' ' + w, 14) < CW - 24 && !l2) l1 = (l1 + ' ' + w).trim(); else l2 = (l2 + ' ' + w).trim(); });
    txt(l1, 0, 24 + (l2 ? 0 : 8), { size: 14, color: '#1e293b', halo: false });
    if (l2) txt(l2, 0, 43, { size: 14, color: '#1e293b', halo: false });
    if (c.placed) { ctx.fillStyle = COL.good; ctx.beginPath(); ctx.arc(CW / 2 - 16, -CH / 2 + 16, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(CW / 2 - 21, -CH / 2 + 16); ctx.lineTo(CW / 2 - 17, -CH / 2 + 20); ctx.lineTo(CW / 2 - 10, -CH / 2 + 12); ctx.stroke(); }
    ctx.restore();
  }
  function drawBin(side, t) {
    const b = CBIN[side], big = side === 'L', col = big ? COL.fric : COL.buoy, hot = CS.hot === side;
    ctx.save();
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, big ? '#fff4e0' : '#e6f4ff'); g.addColorStop(1, big ? '#fde4bd' : '#cfe7fb');
    ctx.fillStyle = g; rr(b.x, b.y, b.w, b.h, 18); ctx.fill(); ctx.restore();
    ctx.lineWidth = hot ? 5 : 3; ctx.strokeStyle = hot ? col : rgba(col, 0.55); ctx.setLineDash(hot ? [] : [9, 7]); rr(b.x, b.y, b.w, b.h, 18); ctx.stroke(); ctx.setLineDash([]);
    // 제목
    pill((big ? '마찰력 크게 ⬆' : '마찰력 작게 ⬇'), b.x + b.w / 2, b.y + 26, { solid: true, color: col, size: 16 });
    // 거친/매끄러운 바닥 장식
    ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
    const yy = b.y + b.h - 24;
    if (big) { ctx.moveTo(b.x + 24, yy); for (let x = b.x + 24; x < b.x + b.w - 24; x += 14) { ctx.lineTo(x + 7, yy - 9); ctx.lineTo(x + 14, yy); } }
    else { ctx.moveTo(b.x + 24, yy - 4); for (let x = b.x + 24; x <= b.x + b.w - 24; x += 6) ctx.lineTo(x, yy - 4 + Math.sin((x - b.x) * 0.045) * 2.2); }
    ctx.stroke();
    ctx.restore();
  }
  function stepC(dt) {
    CS.cards.forEach((c) => { c.it.update(dt); c.shake = Math.max(0, c.shake - dt * 2.4); });
    if (CS.hint) { CS.hint.t += dt; if (CS.hint.t > 4.2) CS.hint = null; }
    CS.done = CS.cards.filter((c) => c.placed).length;
  }
  function drawSceneC(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f4f8ff'); g.addColorStop(1, '#e1ebf7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 안내판
    pill('카드를 끌어서 알맞은 통에 넣어요', W / 2, 26, { color: '#475569', size: 15 });
    ctx.fillStyle = 'rgba(100,130,180,.1)'; rr(14, 46, W - 28, 308, 20); ctx.fill();
    drawBin('L', t); drawBin('R', t);
    const order = CS.cards.slice().sort((a, b) => (a.it.mode === 'drag') - (b.it.mode === 'drag'));
    order.forEach((c) => drawCard(c, !!c.placed && c.it.mode !== 'drag' && c.it.mode !== 'fly', t));
    if (CS.hint) {
      const a = CS.hint.t < 0.3 ? EASE.outBack(CS.hint.t / 0.3) : CS.hint.t > 3.8 ? (4.2 - CS.hint.t) / 0.4 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(W / 2, 366); ctx.scale(Math.max(0.01, Math.min(1, a)), Math.max(0.01, Math.min(1, a)));
      const w = Math.min(W - 40, measure('💡 ' + CS.hint.text, 14.5) + 34);
      ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      rr(-w / 2, -20, w, 40, 20); ctx.fillStyle = '#1e293b'; ctx.fill(); ctx.restore();
      txt('💡 ' + CS.hint.text, 0, 1, { size: 14.5, color: '#fff', halo: false });
      ctx.restore();
    }
    const m = game && game.current();
    if (m && game.isActive(m) && m.key === 'C1' && CS.done === 0 && !CS.drag) D.ring(CS.cards[0].it.x, CS.cards[0].it.y, 100, t, { color: '#f59e0b', width: 2.5 });
  }
  function hitC(p) {
    const list = CS.cards.filter((c) => !c.placed && c.it.mode !== 'fly');
    return pickNearest(list.map((c) => c.it), p, 4);
  }
  const cardOf = (it) => CS.cards.find((c) => c.it === it);
  function downC(p) {
    const it = hitC(p);
    if (!it) return false;
    hideHint();
    it.mode = 'drag'; it.u = 1;
    CS.drag = { it, ox: it.x - p.x, oy: it.y - p.y };
    Sound.tick();
    return true;
  }
  function moveC(p) {
    const d = CS.drag; if (!d) return;
    d.it.x = p.x + d.ox; d.it.y = p.y + d.oy;
    const ins = (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 30 && p.y <= b.y + b.h;
    CS.hot = ins(CBIN.L) ? 'L' : ins(CBIN.R) ? 'R' : null;
  }
  function upC(p) {
    const d = CS.drag; if (!d) return;
    CS.drag = null; CS.hot = null;
    const it = d.it, c = cardOf(it);
    const ins = (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 30 && p.y <= b.y + b.h;
    const side = ins(CBIN.L) ? 'L' : ins(CBIN.R) ? 'R' : null;
    if (!side) { it.go('home', null, 0.4); return; }
    const right = (side === 'L') === c.big;
    if (right) {
      const n = CS.cards.filter((q) => q.placed === side).length;
      c.placed = side;
      const s = binSlot(side, n);
      it.go('fly', () => ({ x: s.x, y: s.y }), 0.42);
      it.onArrive = () => { it.mode = 'on'; };
      Sound.tone(660, 0.1, 'triangle', 0.1); Sound.tone(990, 0.1, 'triangle', 0.08, 0.07);
      if (!RM) FX.burst(s.x, s.y, { count: 9, life: 0.55, speed: 140, gravity: 120, size: 3.8, colors: side === 'L' ? ['#f59e0b', '#b45309', '#fcd34d'] : ['#38bdf8', '#0284c7', '#bae6fd'] });
    } else {
      c.shake = 1; Sound.fail();
      CS.hint = { text: c.hint, t: 0 };
      it.go('home', null, 0.55);
      badge('이 통이 아니에요', clamp(p.x, 110, W - 110), clamp(p.y - 46, 40, H - 40), COL.warn, 1.6);
    }
  }
  function resetC() {
    CS.cards.forEach((c) => { c.placed = null; c.shake = 0; c.it.mode = 'home'; c.it.x = c.it.hx; c.it.y = c.it.hy; c.it.u = 1; c.it.onArrive = null; });
    CS.hint = null; CS.drag = null; CS.hot = null;
  }

  /* =========================================================
     장면 전환 · 입력 · 측정값
     ========================================================= */
  let scene = 'F';
  const trans = { t: 1, color: '#eef3fb' };
  const SCENE_LABEL = {
    F: '🪵 마찰력 관찰 <small>(옆에서 본 모습)</small>',
    L: '🔧 마찰력 측정 <small>(용수철저울)</small>',
    B: '💧 물속에서 부력 측정 <small>(옆에서 본 모습)</small>',
    C: '🏷️ 생활 속 마찰력 분류 <small>(카드 분류)</small>',
  };
  const SCENE_BG = { F: '#eef3fb', L: '#eef3fb', B: '#eef3fb', C: '#eef3fb' };
  const LEVEL_SCENE = ['F', 'L', 'B', 'C'];
  const ctrlCard = $('#ctrlCard'), seg = $('#sceneSeg'), pullBtn = $('#pullBtn'), recBBtn = $('#recBBtn'), ballBtn = $('#ballBtn');
  function setScene(s) {
    const prev = scene;
    scene = s;
    if (s !== prev) {
      trans.t = RM ? 1 : 0;
      if (s === 'F') { FR.mode = 'free'; FR.surf = 'wood'; FR.surfFrom = 'wood'; FR.surfK = 1; FR.blocks = 1; resetF(); }
      else if (s === 'L') { FR.mode = 'lab'; FR.blocks = 1; resetF(); }
      else if (s === 'B') { /* 단계 설정에서 */ }
    }
    view.wrap.style.setProperty('--stage-bg', SCENE_BG[s]);
    $('#sceneLabel').innerHTML = SCENE_LABEL[s];
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === s));
    syncDom(true);
  }
  const ensureScene = (li) => setScene(LEVEL_SCENE[li] || 'F');
  const cache = {};
  function setHid(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.hidden = v; } }
  function setOff(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.classList.toggle('off', v); } }
  function setHtml(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.innerHTML = v; } }
  function syncDom(force) {
    if (force) Object.keys(cache).forEach((k) => delete cache[k]);
    const free = !!(game && game.free);
    const showL = scene === 'L';
    const showB = scene === 'B' && BB.stage === 2;
    setHid(seg, !free, 'seg');
    setHid(ctrlCard, !(showL || showB), 'ctrl');
    setOff($('#ctrlL'), !showL, 'cL'); setOff($('#ctrlB'), !showB, 'cB');
    setOff($('#dataCardF'), !(scene === 'L' && on('record')), 'dF');
    setOff($('#dataCardB'), !(scene === 'B' && BB.stage === 2 && on('recordB')), 'dB');
    setOff(ballBtn, !(free && scene === 'B'), 'ballBtn');
    if (scene === 'L') {
      $$('#surfSeg button').forEach((b) => { const o = b.dataset.surf === FR.surf; if (cache['sf' + b.dataset.surf] !== o) { cache['sf' + b.dataset.surf] = o; b.classList.toggle('on', o); } });
      setHtml($('#stackBtn'), FR.blocks === 1 ? '＋ 도막 쌓기' : '－ 도막 내리기', 'stackTxt');
      const busy = FR.st === 'slip' || FR.st === 'back';
      setHtml(pullBtn, busy ? '⏳ 다시 준비해요…' : FR.st === 'hold' ? '✊ 당기는 중…<small>' + fm(FR.F, 1) + ' N</small>' : '✊ 당기기<small>꾹 누르고 있어요</small>', 'pullTxt');
      if (pullBtn.classList.contains('busy') !== busy) pullBtn.classList.toggle('busy', busy);
    }
    if (scene === 'B') {
      const can = canRecordB();
      if (recBBtn.disabled === can) recBBtn.disabled = !can;
      const cat = bCategory();
      setHtml(recBBtn, !cat ? '📍 기록하기 <small>(0 %, 50 %, 100 % 위치에 맞춰요)</small>' : !BB.settled ? '⏳ 눈금이 멈출 때까지 기다려요…' : '📍 ' + BCAT[cat] + ' · ' + fm(BB.read, 1) + ' N 기록하기', 'recBTxt');
      setHtml(ballBtn, BB.stage === 1 ? '🔩 원기둥으로 바꾸기' : '🏐 비치볼로 바꾸기', 'ballTxt');
    }
  }
  SciSim.pointer(view, {
    hover(p) {
      if (scene === 'F') return hitF(p) ? (hitF(p) === 'handle' ? 'ew-resize' : 'grab') : null;
      if (scene === 'B') { const h = hitB(p); return h === 'ball' ? 'ns-resize' : h ? 'ns-resize' : null; }
      if (scene === 'C') return hitC(p) ? 'grab' : null;
      return null;
    },
    down(p) { if (scene === 'F') return downF(p); if (scene === 'B') return downB(p); if (scene === 'C') return downC(p); return false; },
    move(p) { if (scene === 'F') moveF(p); else if (scene === 'B') moveB(p); else if (scene === 'C') moveC(p); },
    up(p) { if (scene === 'F') upF(p); else if (scene === 'B') upB(p); else if (scene === 'C') upC(p); },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      const p = view.toLocal(tc);
      const hit = scene === 'F' ? hitF(p) : scene === 'B' ? hitB(p) : scene === 'C' ? hitC(p) : null;
      if (hit) e.preventDefault();
    }, { passive: false });
  }

  /* 버튼 */
  const holdOn = () => { if (scene === 'L') { FR.hold = true; FR.holdFresh = true; hideHint(); } };
  const holdOff = () => { FR.hold = false; };
  pullBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); try { pullBtn.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } holdOn(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => pullBtn.addEventListener(n, holdOff));
  pullBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdOn(); } });
  pullBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') holdOff(); });
  pullBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  $('#stackBtn').addEventListener('click', () => {
    if (FR.st !== 'idle') return;
    Sound.click(); FR.blocks = FR.blocks === 1 ? 2 : 1; FR.F = 0; hideHint();
    if (!RM && FR.blocks === 2) FX.burst(FR.x, FLOOR - BH * 2, { count: 8, life: 0.5, speed: 110, gravity: 140, size: 3.4, colors: ['#f6d3a0', '#c58a4e', '#fde68a'] });
  });
  $$('#surfSeg button').forEach((b) => b.addEventListener('click', () => {
    if (FR.st !== 'idle' || b.dataset.surf === FR.surf) return;
    Sound.click(); FR.surfFrom = FR.surf; FR.surf = b.dataset.surf; FR.surfK = 0; FR.F = 0; hideHint();
  }));
  recBBtn.addEventListener('click', doRecordB);
  ballBtn.addEventListener('click', () => { Sound.click(); setStageB(BB.stage === 1 ? 2 : 1); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'F' || scene === 'L') { if (FR.st === 'idle' || FR.st === 'rest' || FR.st === 'pull') resetF(); }
    else if (scene === 'B') { if (BB.stage === 1) resetB(); else { BB.armT = 80; BB.snapAt = -1; } }
    else if (scene === 'C') resetC();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const s = b.dataset.scene; if (s === 'B') setStageB(2); setScene(s); }));
  function setStageB(n) {
    BB.stage = n; BB.grab = null;
    if (n === 1) { resetB(); BB.ball.y = TK.wl0 - 13; } else { BB.read = bTarget(); }
  }

  /* 기록 표 (마찰력) */
  function renderTableF() {
    ['1', '2'].forEach((n) => {
      const row = $('#rowF' + n);
      if (!row) return;
      row.innerHTML = '<th>도막 ' + n + '개 (' + (5 * n) + ' N)</th>';
      SURF_KEYS.forEach((s) => {
        const v = FR.rec[recKey(s, +n)];
        const pct = v ? Math.round(v / 7 * 100) : 0;
        row.insertAdjacentHTML('beforeend', '<td class="' + (v ? 'bar' : 'empty') + '"' + (v ? ' style="--w:' + pct + '%"' : '') + '>' + (v ? fm(v, 1) + ' N' : '·') + '</td>');
      });
    });
    $('#dataFN').textContent = '기록 ' + Object.keys(FR.rec).length + '/6';
  }

  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    const R = (i, label, val) => { setHtml($('#r' + i + 'L'), label, 'r' + i + 'L'); setHtml($('#r' + i + 'V'), val, 'r' + i + 'V'); };
    if (scene === 'F') {
      const T = FR.st === 'pull' ? FR.pull.T : FR.st === 'pdrag' ? 2 : 0;
      const fr = FR.fr.dx / NPX, has = Math.abs(FR.fr.dx) > 3;
      R(1, '① 당기는 힘', T > 0.05 ? nfmt(T) + '<small>N</small>' : '—');
      R(2, '② 마찰력의 크기', has ? nfmt(Math.abs(fr)) + '<small>N</small>' : '—');
      R(3, '③ 마찰력의 방향', has ? (fr < 0 ? '← 왼쪽' : '→ 오른쪽') : '—');
    } else if (scene === 'L') {
      R(1, '① 접촉면', SURF[FR.surf].name);
      R(2, '② 도막 (무게)', FR.blocks + '개 (' + 5 * FR.blocks + ' N)');
      R(3, '③ 움직이기 시작할 때 눈금', FR.rec[recKey(FR.surf, FR.blocks)] != null ? fm(FR.rec[recKey(FR.surf, FR.blocks)], 1) + '<small>N</small>' : '—');
    } else if (scene === 'B') {
      if (BB.stage === 1) {
        const f = ballFrac(BB.ball);
        R(1, '① 잠긴 깊이', Math.round(f.depth * 100) + '<small>%</small>');
        R(2, '② 부력', fm(f.frac * BALL.FBF, 1) + '<small>N</small>');
        R(3, '③ 공의 중력', fm(BALL.W, 1) + '<small>N</small>');
      } else {
        const g = bGeo();
        R(1, '① 잠긴 정도', Math.round(g.frac * 100) + '<small>%</small>');
        R(2, '② 저울 눈금 (물속 무게)', fm(BB.read, 1) + '<small>N</small>');
        R(3, '③ 부력 (= 5.0 − 눈금)', fm(Math.max(0, Math.round((CY.W - BB.read) * 10) / 10), 1) + '<small>N</small>');
      }
    } else {
      R(1, '① 맞힌 카드', CS.done + '<small>/ 6</small>');
      R(2, '② 마찰력 크게', CS.cards.filter((c) => c.placed === 'L').length + '<small>장</small>');
      R(3, '③ 마찰력 작게', CS.cards.filter((c) => c.placed === 'R').length + '<small>장</small>');
    }
  }

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const svgA = (x1, y1, x2, y2, color, w) => {
    w = w || 6;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, hl = 15;
    const bx = x2 - ux * hl, by = y2 - uy * hl, nx = -uy, ny = ux;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + bx + '" y2="' + by + '" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M' + x2 + ' ' + y2 + ' L' + (bx + nx * 9) + ' ' + (by + ny * 9) + ' L' + (bx - nx * 9) + ' ' + (by - ny * 9) + ' Z" fill="' + color + '"/>';
  };
  const svgHollow = (x1, y, x2, color) => {
    const d = x2 > x1 ? 1 : -1, hx = x2 - d * 16;
    return '<path d="M' + x1 + ' ' + (y - 6) + ' L' + hx + ' ' + (y - 6) + ' L' + hx + ' ' + (y - 14) + ' L' + x2 + ' ' + y + ' L' + hx + ' ' + (y + 14) + ' L' + hx + ' ' + (y + 6) + ' L' + x1 + ' ' + (y + 6) + ' Z" fill="#fff" stroke="' + color + '" stroke-width="3" stroke-linejoin="round"/>';
  };
  const BLOCK_SVG = (x, y) => '<rect x="' + x + '" y="' + y + '" width="86" height="46" rx="7" fill="#e9bf86" stroke="#7c4a1c" stroke-width="3"/><path d="M' + (x + 8) + ' ' + (y + 14) + ' q20-5 40 0 t30 0 M' + (x + 8) + ' ' + (y + 30) + ' q20-5 40 0 t30 0" stroke="#b07a42" stroke-width="1.5" fill="none"/>';
  const SVG_FRIC = '<svg viewBox="0 0 330 150" width="330" role="img" aria-label="운동 방향과 반대로 작용하는 마찰력" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="6" y="104" width="318" height="26" rx="5" fill="#e4bd8a" stroke="#a16a35" stroke-width="2"/>' +
    BLOCK_SVG(40, 58) + svgHollow(132, 82, 214, '#64748b') +
    svgA(120, 117, 60, 117, COL.fric, 6) +
    '<text x="224" y="78" font-size="12.5" font-weight="800" fill="#475569">운동 방향</text>' +
    '<text x="90" y="144" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">마찰력 (운동과 반대)</text>' +
    '<text x="165" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">움직이려는 방향과 반대로 작용해요</text></svg>';
  const FIG_FRIC = '<svg viewBox="0 0 330 124" width="330" role="img" aria-label="오른쪽으로 미끄러지는 도막" style="max-width:100%" ' + SVGF + '>' +
    '<rect width="330" height="124" rx="12" fill="#f1f5f9"/><rect x="6" y="86" width="318" height="26" rx="5" fill="#e4bd8a" stroke="#a16a35" stroke-width="2"/>' +
    BLOCK_SVG(70, 40) + svgHollow(164, 62, 248, '#64748b') + '<text x="256" y="58" font-size="13" font-weight="800" fill="#475569">미끄러져요</text>' +
    '<text x="116" y="28" text-anchor="middle" font-size="22" font-weight="800" fill="#b45309">마찰력의 방향은?</text></svg>';
  const SVG_BUOY = '<svg viewBox="0 0 300 190" width="300" role="img" aria-label="물속의 물체에 작용하는 중력, 부력, 탄성력" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="70" y="86" width="160" height="96" rx="10" fill="#bfe3fb" stroke="#64748b" stroke-width="3"/>' +
    '<rect x="132" y="8" width="36" height="26" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="2.5"/><line x1="150" y1="34" x2="150" y2="62" stroke="#64748b" stroke-width="3"/>' +
    '<rect x="132" y="60" width="36" height="70" rx="6" fill="#c3ccd8" stroke="#4b5a70" stroke-width="2.5"/>' +
    svgA(112, 66, 112, 22, '#16a34a', 6) + svgA(112, 124, 112, 96, COL.buoy, 6) + svgA(188, 90, 188, 150, COL.grav, 6) +
    '<text x="104" y="40" text-anchor="end" font-size="12.5" font-weight="800" fill="#15803d">탄성력</text><text x="104" y="114" text-anchor="end" font-size="12.5" font-weight="800" fill="#0369a1">부력 ↑</text><text x="198" y="124" font-size="12.5" font-weight="800" fill="#be123c">중력</text>' +
    '<text x="150" y="176" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">부력 = 공기 중 무게 − 물속 무게</text></svg>';
  const SVG_LIFE = '<svg viewBox="0 0 300 120" width="300" role="img" aria-label="구명조끼를 입으면 부력이 커져 물에 뜬다" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="6" y="56" width="288" height="58" rx="8" fill="#bfe3fb"/><path d="M6 56 q24-8 48 0 t48 0 t48 0 t48 0 t48 0 t48 0" stroke="#fff" stroke-width="3" fill="none"/>' +
    '<circle cx="150" cy="40" r="12" fill="#f6c79f"/><rect x="132" y="50" width="36" height="34" rx="9" fill="#f97316"/><rect x="128" y="56" width="44" height="22" rx="8" fill="#fb923c" stroke="#c2410c" stroke-width="2"/>' +
    svgA(210, 100, 210, 62, COL.buoy, 6) + '<text x="222" y="86" font-size="12.5" font-weight="800" fill="#0369a1">부력 ↑</text>' +
    svgA(90, 62, 90, 100, COL.grav, 6) + '<text x="78" y="86" text-anchor="end" font-size="12.5" font-weight="800" fill="#be123c">중력</text></svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  const mk = (b) => (b ? '✔' : '—');
  const MINI = '<table class="mini-table">';

  game = SciSim.game({
    simId: 'm1-friction-buoyancy',
    mount: '#game',
    badge: '마찰·부력 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      flick: '👆 도막 튕기기 (끌었다 놓기)',
      pull: '🪢 줄 손잡이 당기기',
      scale: '🔧 용수철저울 (최대 눈금 바늘)',
      surface: '🪟 접촉면 바꾸기 (유리·나무·사포)',
      stack: '🧱 도막 쌓기 (무게 2배)',
      record: '📋 마찰력 기록 표',
      ball: '🏐 비치볼 (물속에 눌러 보기)',
      dip: '🔩 원기둥을 물속에 내리기',
      recordB: '📋 부력 기록 표',
    },
    onFeatures(set) { feat = set; syncDom(true); },
    onMissionStart(m) { ensureScene(m._level); hideHint(); },
    levels: [
      /* ---------------- 1단계: 마찰력의 방향 ---------------- */
      {
        title: '마찰력의 방향', short: '마찰력', icon: '🪵', phase: '관찰',
        features: ['flick', 'pull'],
        intro: '<p class="si-q">❓ 탐구 질문: 미끄러지던 나무 도막은 왜 멈출까? 물속에서는 왜 물체가 가볍게 느껴질까?</p>' +
          '<p>먼저 <b>마찰력</b>부터 알아봐요. 나무 바닥 위의 도막을 <b>끌었다 놓아 튕겨</b> 보고, <b>줄 손잡이</b>를 살짝 당겨도 봐요. 갈색 화살표가 접촉면에서 생기는 힘, <b>마찰력</b>이에요. 오른쪽 위 돋보기에서 접촉면을 확대해 볼 수 있어요.</p>',
        setup() { ensureScene(0); FR.rec = FR.rec || {}; FR.maxSlide = { R: 0, L: 0 }; resetF(); showHint('👆 도막을 누른 채 끌었다 놓아 보세요', 6500); },
        recap: '<b>마찰력</b>은 접촉면에서 물체의 운동을 방해하는 힘이에요. 방향은 물체가 운동하거나 운동하려는 방향과 <b>반대</b>예요.',
        summary: '<ul><li><b>마찰력</b>: 두 물체가 맞닿은 면(접촉면)에서 물체의 운동을 <b>방해</b>하는 힘</li>' +
          '<li>방향: 물체가 <b>운동하는 방향</b>(또는 운동하려는 방향)과 <b>반대</b></li>' +
          '<li>움직이지 않아도 당기면 마찰력이 작용해요 (당기는 힘과 크기가 같고 방향이 반대)</li></ul><p>' + SVG_FRIC + '</p>',
        missions: [
          {
            key: 'F1',
            title: '미끄러지는 도막과 마찰력',
            goal: '도막을 <b>끌었다 놓아</b> 오른쪽과 왼쪽으로 각각 <b>100 px 이상</b> 미끄러뜨려 보세요. 마찰력 화살표는 어느 쪽을 가리킬까요?',
            hint: '도막을 누른 채 반대쪽으로 길게 끌었다 놓으면 튕겨 나가요. 길게 끌수록 더 멀리 미끄러져요.',
            setup() { FR.maxSlide = { R: 0, L: 0 }; },
            check: () => FR.maxSlide.R >= 100 && FR.maxSlide.L >= 100,
            hold: 0.5,
            status: () => '오른쪽으로 미끄러짐 <b>' + mk(FR.maxSlide.R >= 100) + '</b> (' + Math.round(FR.maxSlide.R) + ' px) · 왼쪽으로 <b>' + mk(FR.maxSlide.L >= 100) + '</b> (' + Math.round(FR.maxSlide.L) + ' px)',
            explain: '도막이 오른쪽으로 미끄러질 때는 마찰력이 <b>왼쪽</b>, 왼쪽으로 미끄러질 때는 <b>오른쪽</b>을 가리켰어요. 마찰력은 운동 방향과 <b>반대</b>로 작용해서 도막의 운동을 방해하고, 그래서 도막이 점점 느려지다 멈춰요.',
          },
          {
            key: 'F2',
            title: '꿈쩍 않는 도막',
            goal: '줄 손잡이를 끌어 <b>1~2 N</b>의 힘으로 <b>1.5초 동안</b> 당겨 보세요. 도막은 움직이지 않아요.',
            hint: '손잡이를 천천히 끌면서 ‘당기는 힘’이 1~2 N 사이에 오게 해요. 2 N이 넘으면 도막이 움직이기 시작해요.',
            setup() { FR.pullHold = 0; showHint('🪢 줄 손잡이를 오른쪽으로 살짝 끌어 보세요', 6500); },
            check: () => FR.pullHold >= 1.5,
            hold: 0,
            status: () => '당기는 힘 <b>' + (FR.st === 'pull' ? nfmt(FR.pull.T) : '0') + ' N</b> · 도막은 ' + (FR.st === 'pull' ? '정지' : '—') + ' · ⏱ <b>' + fm(Math.min(1.5, FR.pullHold), 1) + '초</b> / 1.5초',
            explain: '당겨도 도막이 움직이지 않는 것은 <b>당기는 힘과 크기가 같고 방향이 반대인 마찰력</b>이 작용해서 두 힘이 평형을 이루기 때문이에요. 움직이지 않아도 <b>움직이려는 방향과 반대로</b> 마찰력이 작용해요.',
          },
          {
            type: 'quiz',
            title: '마찰력의 방향',
            goal: '오른쪽으로 미끄러지고 있는 도막에 작용하는 <b>마찰력의 방향</b>은?',
            figure: FIG_FRIC,
            choices: ['왼쪽', '오른쪽', '아래쪽', '미끄러지고 있으니 마찰력이 없다'],
            answer: 0,
            feedback: [
              '',
              '오른쪽은 도막이 움직이는 방향이에요. 마찰력은 운동을 <b>방해</b>하니까 반대 방향이에요.',
              '아래쪽은 중력의 방향이에요(2차시). 마찰력은 접촉면을 따라 운동과 반대로 작용해요.',
              '도막이 점점 느려지다 멈춘 것은 마찰력이 작용했기 때문이에요. 미끄러지는 동안에도 마찰력이 작용해요.',
            ],
            explain: '마찰력은 접촉면에서 물체의 운동을 방해하는 힘이라서, 오른쪽으로 미끄러지는 도막에는 <b>왼쪽</b>(운동 방향과 반대)으로 작용해요. 움직이려고만 할 때도 마찰력은 <b>움직이려는 방향과 반대</b>예요.',
          },
        ],
      },
      /* ---------------- 2단계: 마찰력의 크기 ---------------- */
      {
        title: '마찰력의 크기', short: '마찰력 크기', icon: '🔧', phase: '실험',
        features: ['scale', 'surface', 'stack', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마찰력의 방향(운동하려는 방향과 반대)을 알았어요.</div>' +
          '<p>이번에는 마찰력의 <b>크기</b>를 재어요. 2차시에서 만든 <b>용수철저울</b>을 도막에 걸고 서서히 당기면, 도막이 <b>움직이기 시작할 때의 눈금</b>이 마찰력의 크기예요(회색 바늘이 최댓값을 붙잡아 줘요). 접촉면(유리·나무·사포)과 도막의 개수(무게)를 바꿔 가며 재어 봐요.</p>',
        setup() { ensureScene(1); FR.rec = {}; FR.tableDirty = true; FR.surf = 'wood'; FR.surfFrom = 'wood'; FR.surfK = 1; FR.blocks = 1; resetF(); renderTableF(); },
        recap: '마찰력은 접촉면이 <b>거칠수록</b>, 물체의 <b>무게가 클수록</b> 커요.',
        summary: MINI + '<tr><th></th><th>유리</th><th>나무</th><th>사포</th></tr>' +
          '<tr><th>도막 1개 (5 N)</th><td>1.2 N</td><td>2.0 N</td><td>3.5 N</td></tr>' +
          '<tr><th>도막 2개 (10 N)</th><td>2.4 N</td><td>4.0 N</td><td>7.0 N</td></tr></table>' +
          '<ul><li>마찰력의 크기 = 도막이 <b>움직이기 시작할 때의</b> 용수철저울 눈금</li>' +
          '<li>접촉면이 <b>거칠수록</b> 마찰력이 커요 (유리 < 나무 < 사포)</li>' +
          '<li>물체의 <b>무게가 클수록</b> 마찰력이 커요 (도막 2개가 1개의 2배)</li></ul>',
        missions: [
          {
            key: 'F3',
            title: '접촉면 3가지 재기',
            goal: '도막 1개로 <b>유리, 나무, 사포</b> 접촉면에서 마찰력을 모두 재어 보세요. <b>✊ 당기기</b>를 꾹 누르면 당기는 힘이 서서히 커져요.',
            hint: '접촉면 칩을 눌러 바꾸고, ✊ 당기기를 도막이 덜컥 움직일 때까지 꾹 누르고 있어요. 값은 표에 자동으로 기록돼요.',
            setup() { showHint('🔧 ✊ 당기기를 꾹 눌러 도막이 움직이기 시작하는 눈금을 재 보세요', 7000); },
            check: () => SURF_KEYS.every((s) => FR.rec[recKey(s, 1)] != null),
            hold: 0.6,
            status: () => SURF_KEYS.map((s) => SURF[s].name + ' <b>' + (FR.rec[recKey(s, 1)] != null ? fm(FR.rec[recKey(s, 1)], 1) + ' N ✔' : '—') + '</b>').join(' · '),
            explain: '도막이 움직이기 시작할 때의 눈금이 마찰력의 크기예요. <b>유리 1.2 N, 나무 2.0 N, 사포 3.5 N</b>으로 접촉면이 거칠수록 마찰력이 커졌어요. 돋보기 속 울퉁불퉁한 돌기가 더 크게 걸리기 때문이에요.',
          },
          {
            key: 'F4',
            title: '무게가 2배이면?',
            goal: '<b>나무</b> 접촉면에서 <b>＋ 도막 쌓기</b>로 도막을 2개 쌓아 재어 보세요. 도막 1개일 때(2.0 N)와 비교해 봐요.',
            hint: '나무 칩을 고르고 ＋ 도막 쌓기를 눌러요. 도막 1개와 2개 모두 나무에서 측정해야 해요.',
            setup() { showHint('🧱 ＋ 도막 쌓기로 무게를 2배로 해 보세요', 6500); },
            check: () => FR.rec[recKey('wood', 1)] != null && FR.rec[recKey('wood', 2)] != null,
            hold: 0.6,
            status: () => '나무 · 도막 1개 <b>' + (FR.rec[recKey('wood', 1)] != null ? fm(FR.rec[recKey('wood', 1)], 1) + ' N ✔' : '—') + '</b> · 도막 2개 <b>' + (FR.rec[recKey('wood', 2)] != null ? fm(FR.rec[recKey('wood', 2)], 1) + ' N ✔' : '—') + '</b>',
            explain: '같은 나무 접촉면에서 도막이 1개일 때 <b>2.0 N</b>, 2개(무게 2배)일 때 <b>4.0 N</b>이었어요. 물체의 <b>무게가 클수록</b> 접촉면을 누르는 힘이 커져서 마찰력도 커져요.',
          },
          {
            type: 'quiz',
            title: '마찰력의 크기',
            goal: '표의 값을 보고 마찰력의 크기에 대해 옳게 설명한 것은?',
            choices: ['접촉면이 거칠수록, 무게가 클수록 마찰력이 커진다', '접촉면이 매끄러울수록 마찰력이 커진다', '물체가 가벼울수록 마찰력이 커진다', '마찰력은 언제나 같은 크기이다'],
            answer: 0,
            feedback: [
              '',
              '표를 보면 유리(1.2 N) < 나무(2.0 N) < 사포(3.5 N)예요. <b>거칠수록</b> 마찰력이 컸어요.',
              '도막 1개(2.0 N)보다 2개(4.0 N)일 때 마찰력이 더 컸어요. <b>무거울수록</b> 커요.',
              '접촉면과 무게에 따라 마찰력이 1.2 N부터 7.0 N까지 달라졌어요.',
            ],
            explain: '마찰력은 접촉면이 <b>거칠수록</b>(유리 1.2 → 나무 2.0 → 사포 3.5 N), 물체의 <b>무게가 클수록</b>(도막 1개 2.0 N → 2개 4.0 N) 커요.',
          },
        ],
      },
      /* ---------------- 3단계: 부력 ---------------- */
      {
        title: '물속에서 부력 측정', short: '부력', icon: '🛟', phase: '탐구',
        features: ['ball', 'dip', 'recordB'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용수철저울로 마찰력의 크기를 쟀어요. 이번에는 같은 용수철저울로 <b>물속에서</b> 물체의 무게가 어떻게 달라지는지 알아봐요.</div>' +
          '<p>물에 들어가면 몸이 가볍게 느껴져요. 물이 물체를 <b>위로 밀어 올리는 힘</b>, 곧 <b>부력</b> 때문이에요. 먼저 <b>비치볼</b>을 물속에 눌러 부력의 방향을 보고, 다음에 <b>금속 원기둥</b>을 물에 내려 부력의 크기를 재어 봐요.</p>',
        setup() { ensureScene(2); BB.stage = 1; BB.stand = 0; resetB(); BB.rec = {}; BB.pt = {}; renderTableB(); },
        recap: '<b>부력</b>은 액체나 기체가 물체를 <b>위로</b> 밀어 올리는 힘이에요. 크기는 <b>공기 중 무게 − 물속 무게</b>이고, 물체가 <b>잠긴 부피가 클수록</b> 커요. 완전히 잠긴 뒤에는 깊이와 관계없이 일정해요.',
        summary: '<ul><li><b>부력</b>: 액체나 기체가 물체를 <b>위로</b> 밀어 올리는 힘 (방향은 중력과 반대인 위쪽)</li>' +
          '<li>부력의 크기 = <b>공기 중 무게 − 물속 무게</b> (용수철저울 눈금 차이)</li>' +
          '<li>잠긴 부피가 클수록 커요. <b>완전히 잠긴 뒤</b>에는 더 깊이 넣어도 <b>일정</b>해요.</li></ul><p>' + SVG_BUOY + '</p>' +
          '<p class="note">원기둥이 반쯤 잠기면 눈금이 약 4.0 N(부력 약 1.0 N), 완전히 잠기면 약 3.0 N(부력 약 2.0 N)이에요.</p>',
        missions: [
          {
            key: 'B1',
            title: '부력의 방향',
            goal: '<b>비치볼</b>을 눌러 물속으로 <b>80 % 이상</b> 밀어 넣었다가 놓아 보세요. 공은 어느 쪽으로 움직일까요?',
            hint: '비치볼을 누른 채 아래로 끌어 물속 깊이 넣고(‘잠긴 깊이’가 80 %를 넘으면 초록색), 손을 떼요.',
            setup() { BB.stage = 1; resetB(); showHint('🏐 비치볼을 눌러 물속으로 밀어 넣어 보세요', 6500); },
            check: () => BB.ball.pushed && BB.ball.done,
            hold: 0.4,
            status: () => '깊이 ' + Math.round(BB.ball.maxDepth * 100) + ' % (80 % 이상 <b>' + mk(BB.ball.pushed) + '</b>) · 놓았더니 떠올라 <b>' + mk(BB.ball.done) + '</b>',
            explain: '물속의 공을 놓으면 <b>위쪽</b>으로 튀어 올랐어요. 물이 물체를 <b>위로 밀어 올리는 힘</b>이 작용하기 때문이에요. 이 힘이 <b>부력</b>이고, 방향은 중력과 반대인 <b>위쪽</b>이에요. 깊이 눌수록 잠긴 부피가 커져서 부력도 커졌어요.',
          },
          {
            key: 'B2',
            title: '측정 기록',
            goal: '스탠드의 <b>↕ 손잡이</b>를 끌어 원기둥을 내리며 <b>잠기지 않았을 때(0 %), 반쯤(50 %), 완전히(100 %), 더 깊이 완전히</b> 잠겼을 때의 저울 눈금을 기록하세요.',
            hint: '손잡이를 천천히 끌면 0 %, 50 %, 100 %, 더 깊이 위치에서 ‘딸깍’ 멈춰요. 눈금이 멈추면 📍 기록하기를 눌러요.',
            setup() { BB.stage = 2; BB.read = bTarget(); BB.rec = {}; BB.pt = {}; renderTableB(); showHint('↕ 스탠드의 손잡이를 아래로 끌어 보세요', 6500); },
            check: () => BKEYS.every((k) => BB.rec[k] != null),
            hold: 0.6,
            status: () => '기록 <b>' + Object.keys(BB.rec).length + '/4</b> · ' + (bCategory() ? BCAT[bCategory()] : '위치를 맞춰요') + ' · 눈금 ' + fm(BB.read, 1) + ' N',
            explain: '물에 잠길수록 저울 눈금이 줄어들었어요(5.0 → 약 4.0 → 약 3.0 N). 줄어든 만큼이 부력이에요: <b>부력 = 공기 중 무게 − 물속 무게</b>. 완전히 잠긴 뒤에는 더 깊이 넣어도 눈금이 <b>약 3.0 N으로 그대로</b>예요.',
          },
          {
            type: 'quiz',
            title: '부력의 크기',
            goal: '기록한 표를 보고 알 수 있는 <b>부력의 크기</b>는?',
            figure: SVG_BUOY,
            choices: ['잠긴 부피가 클수록 커지고, 완전히 잠긴 뒤에는 깊이와 관계없이 일정하다', '물속 깊이 들어갈수록 계속 커진다', '무거운 물체일수록 부력이 크다', '물속에서는 중력이 작아져서 무게가 줄어든다'],
            answer: 0,
            feedback: [
              '',
              '완전히 잠긴 뒤(100 %)에는 더 깊이 넣어도 눈금이 약 3.0 N으로 그대로였어요. 부력은 <b>일정</b>했어요.',
              '이 실험에서는 같은 원기둥으로 잠긴 정도만 바꿨어요. 부력은 <b>잠긴 부피</b>에 따라 달라졌어요.',
              '중력은 그대로예요(5.0 N). 물이 위로 <b>부력</b>을 작용해서 저울이 당겨야 할 힘이 줄어든 거예요.',
            ],
            explain: '부력은 물체가 <b>잠긴 부피가 클수록</b> 커요(0 → 약 1.0 → 약 2.0 N). 완전히 잠긴 뒤에는 더 깊이 내려도 <b>일정</b>해요. 무게(중력)는 그대로이고 위쪽 부력이 더해져서 저울 눈금이 줄어든 거예요.',
          },
        ],
      },
      /* ---------------- 4단계: 적용 ---------------- */
      {
        title: '생활 속 마찰력과 부력', short: '적용', icon: '🏠', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마찰력은 접촉면이 <b>거칠수록</b>, 부력은 잠긴 부피가 <b>클수록</b> 커진다는 것을 알았어요.</div>' +
          '<p>생활 속에서 <b>마찰력을 크게</b> 하거나 <b>작게</b> 하려고 쓰는 방법을 분류해 보고, 구명조끼에서 부력을 찾아봐요.</p>',
        setup() { ensureScene(3); resetC(); },
        recap: '미끄러지지 않게 하려면 접촉면을 <b>거칠게</b>(마찰력 크게), 잘 미끄러지게 하려면 <b>매끄럽게</b>(기름·왁스, 마찰력 작게) 해요. 구명조끼는 부피가 커서 <b>부력</b>이 커져요.',
        summary: '<ul><li>마찰력을 <b>크게</b>: 등산화 밑창, 눈길 자동차 체인, 미끄럼 방지 매트 → 접촉면을 <b>거칠게</b></li>' +
          '<li>마찰력을 <b>작게</b>: 자전거 체인 기름칠, 스키 왁스, 볼링 레인 기름 → 접촉면을 <b>매끄럽게</b></li>' +
          '<li>구명조끼: 부피가 큰 조끼가 물에 잠기며 위쪽 <b>부력</b>이 커져서 몸이 떠요. (헬륨 풍선·열기구는 공기 속에서 부력을 받아 떠요.)</li></ul><p>' + SVG_LIFE + '</p>' +
          '<p class="note">다음 차시에서는 힘이 작용하면 운동 상태가 어떻게 변하는지 알아봐요.</p>',
        missions: [
          {
            key: 'C1',
            title: '분류 카드',
            goal: '카드 6장을 끌어서 <b>마찰력 크게</b> 통과 <b>마찰력 작게</b> 통에 알맞게 넣어 보세요.',
            hint: '미끄러지지 않게 하려는 것은 마찰력을 크게, 잘 미끄러지게 하려는 것은 마찰력을 작게 해요. 기름·왁스는 표면을 매끄럽게 해요.',
            setup() { resetC(); showHint('🏷️ 카드를 끌어서 알맞은 통에 넣어 보세요', 6500); },
            check: () => CS.done >= 6,
            hold: 0.8,
            status: () => '맞힌 카드 <b>' + CS.done + ' / 6</b> · 마찰력 크게 ' + CS.cards.filter((c) => c.placed === 'L').length + '장 · 작게 ' + CS.cards.filter((c) => c.placed === 'R').length + '장',
            explain: '등산화 밑창·눈길 체인·미끄럼 방지 매트는 접촉면을 <b>거칠게</b> 해서 마찰력을 <b>크게</b> 하고, 자전거 체인·스키 바닥·볼링 레인은 기름이나 왁스로 접촉면을 <b>매끄럽게</b> 해서 마찰력을 <b>작게</b> 해요.',
          },
          {
            type: 'quiz',
            title: '구명조끼',
            goal: '구명조끼를 입으면 물에 잘 뜨는 까닭은?',
            figure: SVG_LIFE,
            choices: ['부피가 큰 조끼가 물에 잠기며 위쪽으로 작용하는 부력이 커지기 때문이다', '몸의 무게가 사라지기 때문이다', '조끼 속 공기가 몸을 아래로 밀기 때문이다', '중력이 작아지기 때문이다'],
            answer: 0,
            feedback: [
              '',
              '구명조끼를 입어도 몸의 무게(중력)는 그대로예요. 위로 작용하는 힘이 더 커진 거예요.',
              '물이 조끼를 위로 밀어 올려요. 공기가 몸을 아래로 미는 것이 아니에요.',
              '중력은 그대로예요. 부피가 커져서 <b>부력</b>이 커진 거예요.',
            ],
            explain: '구명조끼는 부피가 커서 물에 잠기는 부피가 늘고, 그만큼 위쪽 <b>부력</b>이 커져서 몸이 떠요. 부력은 물속뿐 아니라 기체 속에서도 작용해요. 헬륨 풍선이나 열기구가 하늘에 뜨는 것도 공기가 위로 밀어 올리는 <b>부력</b> 때문이에요.',
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
        if (m.key === 'F1' || m.key === 'F2') celebrate(FR.x, FLOOR - 40, 60);
        else if (m.key === 'F3' || m.key === 'F4') celebrate(FR.x, FLOOR - 50, 64);
        else if (m.key === 'B1') celebrate(BALL.x, BB.ball.y, 56);
        else if (m.key === 'B2') celebrate(CY.x, bGeo().cylTop + 50, 64);
        else if (m.key === 'C1') celebrate(W / 2, 300, 110);
      }
    }
    lastPhase = ph; lastIdx = i;
  }

  /* ---------- 시작 ---------- */
  renderTableF(); renderTableB();
  syncDom(true);
  SciSim.loop((dt, t) => {
    if (scene === 'F' || scene === 'L') stepF(dt); else if (scene === 'B') stepB(dt); else stepC(dt);
    view.clear('#eef3fb');
    if (scene === 'F') drawSceneF1(t); else if (scene === 'L') drawSceneF2(t); else if (scene === 'B') drawSceneB(t); else drawSceneC(t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.45);
      ctx.fillStyle = rgba('#eef3fb', 1 - EASE.outCubic(trans.t));
      ctx.fillRect(0, 0, W, H);
    }
    watchSuccess();
    syncDom();
    updateReadouts(t);
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, FR, BB, CS, SURF, get game() { return game; }, W, H, FLOOR, BW, BH, HOME, LHOME, NPX, TK, CY, BALL, DETENTS, ARM_MIN, ARM_MAX, POLE_X,
    setScene, hookX, hookY, hitF, hitB, hitC, bGeo, bCategory, eqFrac, canRecordB, doRecordB, setStageB, ballFrac, startSlide, fsNow, SURF_KEYS, CARD_DEF,
  };
})();
