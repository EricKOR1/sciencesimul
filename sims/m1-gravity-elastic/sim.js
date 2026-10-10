/* =========================================================
   중1 Ⅴ. 힘의 작용 — 중력과 탄성력 [9과05-02 ①]
   ① [관찰] 중력의 방향   지구 둘레의 아이들이 사과를 놓아요 → 어디서나 지구 중심 쪽
   ② [실험] 용수철의 탄성력   늘이고 누르기, 추를 매달아 기록 → 탄성력 ∝ 늘어난 길이, 탄성력 = 추의 무게
   ③ [설명] 질량과 무게   지구·달의 용수철저울(N)과 양팔저울(kg) → 질량은 일정, 무게는 장소에 따라 달라요
   ④ [적용] 생활 속 중력과 탄성력   용수철저울의 원리, ‘몸무게 50 kg’, 탄성력을 이용한 사례
   범위: 만유인력 공식, 용수철 상수 k, 탄성 한계 계산은 다루지 않음
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
  const view = SciSim.stage($('#cv'), { width: W, height: H, background: '#0b1230' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  let feat = new Set();
  const on = (f) => feat.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const NOW = () => performance.now() / 1000;
  const COL = { push: '#f97316', grav: '#e11d48', elas: '#16a34a', ink: '#1b2333', muted: '#5d6879', good: '#16a34a', warn: '#dc2626' };

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

  /* =========================================================
     장면 G · 지구와 사과 (1단계: 중력의 방향)
     ========================================================= */
  const GL = { cx: W / 2, cy: 286, R: 160 };
  const FALL_T = 0.6, PICK_T = 0.42;
  const HOLD = { x: 19, y: -68 };          // 손에 든 사과 위치 (아이 기준: +x 오른쪽, -y 위쪽=지구 바깥쪽)
  const AR = 9;                            // 사과 반지름
  const KIDS = [
    { id: 'N', name: '북극', deg: 0, shirt: '#38bdf8', hair: '#3b2a1e', pants: '#475569' },
    { id: 'K', name: '대한민국', sub: '북위 약 37°', deg: 53, ld: 120, shirt: '#f472b6', hair: '#1f2937', pants: '#334155' },
    { id: 'S', name: '남극', deg: 180, shirt: '#facc15', hair: '#7c4a2a', pants: '#475569' },
    { id: 'E', name: '적도 반대편', deg: 270, shirt: '#34d399', hair: '#2b2118', pants: '#3f3f46' },
  ];
  const G = {
    kids: KIDS.map((k) => Object.assign({}, k, {
      st: 'held', t: 0, arm: 1, redrop: false, done: false, dash: 0,
      ar: new AArrow(), sq: new SciSim.Spring(0, { stiffness: 340, damping: 13 }),
    })),
    cloud: 0, center: 0,
  };
  function blob(cx, cy, rx, ry, seed) {
    const n = 22, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const k = 1 + 0.22 * Math.sin(a * 3 + seed) + 0.14 * Math.sin(a * 5 + seed * 2.3) + 0.08 * Math.sin(a * 8 + seed * 0.7);
      pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
    }
    return pts;
  }
  const CONT = [
    blob(96, -92, 66, 46, 1.2), blob(-120, 4, 44, 62, 2.4), blob(30, 92, 58, 36, 0.5),
    blob(-44, -116, 30, 18, 3.3), blob(128, 40, 20, 30, 4.1), blob(-72, 118, 26, 16, 5.2),
  ];
  const CLOUDS = [[0.2, 0.86, 22], [0.8, 0.7, 26], [1.5, 0.88, 20], [2.2, 0.55, 24], [3.0, 0.82, 26], [3.8, 0.66, 22], [4.5, 0.9, 20], [5.3, 0.6, 24], [5.9, 0.8, 18]];
  function smoothPath(pts) {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2); }
    ctx.closePath();
  }
  function kidFrame(k) { const th = rad(k.deg); return { th, sx: GL.cx + GL.R * Math.sin(th), sy: GL.cy - GL.R * Math.cos(th), c: Math.cos(th), s: Math.sin(th) }; }
  function toWorld(k, lx, ly) { const f = kidFrame(k); return { x: f.sx + lx * f.c - ly * f.s, y: f.sy + lx * f.s + ly * f.c }; }
  function applePos(k) {
    const h = toWorld(k, HOLD.x, HOLD.y);
    const dx = h.x - GL.cx, dy = h.y - GL.cy, d0 = Math.hypot(dx, dy), ux = dx / d0, uy = dy / d0, ds = GL.R + AR;
    let d = d0 + (k.st === 'held' && !RM ? Math.sin(NOW() * 2.2 + k.deg * 0.05) * 1.6 : 0);
    if (k.st === 'fall') { const s = clamp(k.t / FALL_T, 0, 1); d = d0 + (ds - d0) * s * s; }
    else if (k.st === 'land') d = ds;
    else if (k.st === 'pick') { const s = clamp(k.t / PICK_T, 0, 1); d = ds + (d0 - ds) * EASE.outCubic(s); }
    return { x: GL.cx + ux * d, y: GL.cy + uy * d, ux, uy, d };
  }
  function drawApple(x, y, phi, sq, spin) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(phi + (spin || 0));
    ctx.translate(0, AR); ctx.scale(1 + 0.6 * sq, 1 - sq); ctx.translate(0, -AR);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    D.sphere(0, 0, AR, '#e11d48', { light: '#fb7185', dark: '#9f1239' });
    ctx.restore();
    ctx.fillStyle = 'rgba(80,0,20,.45)'; ctx.beginPath(); ctx.ellipse(0, -AR + 1.8, 3, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -AR + 1.5); ctx.quadraticCurveTo(1, -AR - 3, 2.6, -AR - 5.5); ctx.stroke();
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(5.6, -AR - 3.2, 4.6, 2.2, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawKid(k) {
    const f = kidFrame(k);
    ctx.save(); ctx.translate(f.sx, f.sy); ctx.rotate(f.th);
    softShadow(0, 1, 22, 5.5, 0.34);
    // 다리 + 신발
    ctx.fillStyle = k.pants; rr(-9.5, -23, 8.5, 23, 3); ctx.fill(); rr(1, -23, 8.5, 23, 3); ctx.fill();
    ctx.fillStyle = '#1e293b'; [-6.2, 6.2].forEach((x) => { ctx.beginPath(); ctx.ellipse(x, -1.6, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill(); });
    // 내려 둔 팔
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(k.shirt, -0.28); ctx.lineWidth = 6.6; ctx.beginPath(); ctx.moveTo(-10.5, -41); ctx.lineTo(-14.5, -28); ctx.stroke();
    ctx.strokeStyle = '#f6c79f'; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(-14.5, -28); ctx.lineTo(-15, -24); ctx.stroke();
    // 몸통
    const tg = ctx.createLinearGradient(-11, -46, 11, -20);
    tg.addColorStop(0, shade(k.shirt, 0.35)); tg.addColorStop(0.55, k.shirt); tg.addColorStop(1, shade(k.shirt, -0.3));
    ctx.fillStyle = tg; rr(-11.5, -45, 23, 27, 8); ctx.fill();
    ctx.strokeStyle = shade(k.shirt, -0.45); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(-8, -42, 5, 12, 2.5); ctx.fill();
    // 들어 올린 팔 (사과를 쥔 손)
    const lo = { x: 15, y: -27 }, hi = { x: HOLD.x - 1, y: HOLD.y + 9 };
    const hx = lo.x + (hi.x - lo.x) * k.arm, hy = lo.y + (hi.y - lo.y) * k.arm;
    ctx.strokeStyle = shade(k.shirt, -0.28); ctx.lineWidth = 6.6;
    ctx.beginPath(); ctx.moveTo(10.5, -41); ctx.lineTo(10.5 + (hx - 10.5) * 0.55, -41 + (hy + 41) * 0.55); ctx.stroke();
    ctx.strokeStyle = '#f6c79f'; ctx.lineWidth = 5.4;
    ctx.beginPath(); ctx.moveTo(10.5 + (hx - 10.5) * 0.55, -41 + (hy + 41) * 0.55); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#f6c79f'; ctx.beginPath(); ctx.arc(hx, hy, 4.3, 0, Math.PI * 2); ctx.fill();
    // 머리
    const hg = ctx.createRadialGradient(-3, -57, 1.5, 0, -54, 12);
    hg.addColorStop(0, '#ffe3c8'); hg.addColorStop(1, '#f1b98d');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -55, 10.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(146,82,40,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = k.hair;
    ctx.beginPath(); ctx.moveTo(-11.2, -54); ctx.arc(0, -55, 11.2, Math.PI, Math.PI * 2); ctx.quadraticCurveTo(5, -62.5, -1, -59.6); ctx.quadraticCurveTo(-7, -58.6, -11.2, -54); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e293b'; [-3.9, 3.9].forEach((x) => { ctx.beginPath(); ctx.arc(x, -54.2, 1.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, -52.6, 3.6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(244,114,182,.38)'; [-6.8, 6.8].forEach((x) => { ctx.beginPath(); ctx.arc(x, -51.4, 2.3, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  function drawEarth(t) {
    const { cx, cy, R } = GL;
    let g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.3);
    g.addColorStop(0, 'rgba(125,200,255,.55)'); g.addColorStop(0.35, 'rgba(90,170,255,.22)'); g.addColorStop(1, 'rgba(90,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.08, cx, cy, R);
    g.addColorStop(0, '#86d6ff'); g.addColorStop(0.45, '#2b95e8'); g.addColorStop(1, '#0a3f94');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy);
    CONT.forEach((c, i) => {
      smoothPath(c);
      const lg = ctx.createLinearGradient(-R, -R, R, R);
      lg.addColorStop(0, '#8bd88a'); lg.addColorStop(0.5, '#4fb465'); lg.addColorStop(1, '#2f7d4a');
      ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = 'rgba(20,83,45,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (i < 3) { // 사막/산 느낌의 연한 얼룩
        ctx.fillStyle = 'rgba(214,190,120,.35)'; ctx.beginPath(); ctx.ellipse(c[3].x * 0.7, c[3].y * 0.7, 16, 9, 0.5, 0, Math.PI * 2); ctx.fill();
      }
    });
    // 극지방 얼음
    [[-1, 56, 26], [1, 66, 30]].forEach(([s, rx, ry]) => {
      const ig = ctx.createLinearGradient(0, s * R, 0, s * (R - ry * 1.6));
      ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, 'rgba(226,240,255,.5)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(0, s * (R - 4), rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    });
    // 구름층 (천천히 돌아요)
    const rot = G.cloud;
    CLOUDS.forEach(([a, rf, s]) => {
      const ang = a + rot, x = Math.cos(ang) * R * rf, y = Math.sin(ang) * R * rf;
      [[-0.6, 0.05, 0.55], [0, -0.25, 0.72], [0.62, 0.08, 0.5]].forEach(([ox, oy, k]) => {
        const rg = ctx.createRadialGradient(x + ox * s, y + oy * s, 0, x + ox * s, y + oy * s, s * k);
        rg.addColorStop(0, 'rgba(255,255,255,.88)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x + ox * s, y + oy * s, s * k, 0, Math.PI * 2); ctx.fill();
      });
    });
    ctx.translate(-cx, -cy);
    // 빛은 왼쪽 위에서: 오른쪽 아래를 어둡게
    const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.45, cx, cy, R * 1.04);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.7, 'rgba(2,12,40,.16)'); sh.addColorStop(1, 'rgba(2,12,40,.62)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(190,230,255,.55)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(cx - R * 0.42, cy - R * 0.5, R * 0.26, R * 0.12, -0.7, 0, Math.PI * 2); ctx.fill();
  }
  const kidHit = (k, p) => {
    const c = toWorld(k, 4, -36);
    if (Math.hypot(p.x - c.x, p.y - c.y) < 36 * HIT) return true;
    if (k.st === 'held' || k.st === 'land') { const a = applePos(k); return Math.hypot(p.x - a.x, p.y - a.y) < 24 * HIT; }
    return false;
  };
  function dropApple(k) {
    k.st = 'fall'; k.t = 0; k.redrop = false; k.dash = 0;
    Sound.tone(700, 0.2, 'triangle', 0.06);
    hideHint();
  }
  function landApple(k) {
    k.st = 'land'; k.t = 0; k.done = true;
    k.sq.value = 0.46; k.sq.velocity = 0; k.sq.target = 0;
    const a = applePos(k);
    Sound.tone(150, 0.14, 'sine', 0.16);
    if (!RM) {
      for (let i = 0; i < 9; i++) {
        const sd = (Math.random() - 0.5) * 2, v = 30 + Math.random() * 60;
        FX.emit({ x: a.x - a.ux * 6, y: a.y - a.uy * 6, vx: -a.uy * sd * v + a.ux * v * 0.6, vy: a.ux * sd * v + a.uy * v * 0.6, life: 0.55, size: 2 + Math.random() * 2.5, color: 'rgba(214,180,130,.75)', drag: 2.4, shape: 'smoke' });
      }
    }
    const bx = clamp(a.x * 0.45 + GL.cx * 0.55, 110, W - 110), by = clamp(a.y * 0.45 + GL.cy * 0.55, 24, H - 24);
    badge(k.name + ': 지구 중심 쪽으로!', bx, by, COL.grav, 2.2);
  }
  function stepG(dt) {
    G.cloud += RM ? 0 : dt * 0.04;
    let any = false;
    G.kids.forEach((k) => {
      if (k.st === 'fall') { k.t += dt; if (k.t >= FALL_T) landApple(k); }
      else if (k.st === 'land') { k.t += dt; k.dash = approach(k.dash, 1, dt, 3); }
      else if (k.st === 'pick') { k.t += dt; k.dash = approach(k.dash, 0, dt, 9); if (k.t >= PICK_T) { k.st = 'held'; if (k.redrop) dropApple(k); } }
      k.arm = approach(k.arm, k.st === 'held' || k.st === 'pick' ? 1 : 0, dt, 9);
      k.sq.update(dt);
      if (k.st === 'fall') { const a = applePos(k); k.ar.set(-a.ux * 2 * NPX, -a.uy * 2 * NPX); } else k.ar.set(0, 0);
      k.ar.update(dt);
      if (k.done) any = true;
    });
    G.center = approach(G.center, any ? 1 : 0, dt, 4);
  }
  function drawSceneG(t) {
    D.space(0, 0, W, H, t, { top: '#1b2c66', bottom: '#050916', stars: 130 });
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 420);
    sg.addColorStop(0, 'rgba(255,238,190,.22)'); sg.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    drawEarth(t);
    drawScaleBar(18, 574, NPX, '1 N', true);
    const m = game && game.current();
    const mActive = !!(m && game.isActive(m) && m.key === 'G1');
    // 착지한 사과 → 지구 중심 점선 (모두 한 점으로 모여요)
    G.kids.forEach((k) => {
      if (!k.done || k.dash < 0.02) return;
      const a = applePos(k);
      ctx.save(); ctx.globalAlpha = k.dash;
      ctx.setLineDash([7, 6]); ctx.lineDashOffset = RM ? 0 : (t * 26) % 13; ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(255,255,255,.88)';
      ctx.beginPath(); ctx.moveTo(a.x - a.ux * 12, a.y - a.uy * 12); ctx.lineTo(GL.cx + a.ux * 12, GL.cy + a.uy * 12); ctx.stroke();
      ctx.restore();
    });
    if (G.center > 0.02) {
      ctx.save(); ctx.globalAlpha = G.center;
      D.glow(GL.cx, GL.cy, 26 + 4 * Math.sin(t * 3), '#ffffff', 0.55);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(GL.cx, GL.cy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(GL.cx, GL.cy, 8, 0, Math.PI * 2); ctx.stroke();
      pill('지구 중심', GL.cx, GL.cy + 26, { color: '#e11d48', size: 14 });
      ctx.restore();
    }
    // 아이와 사과
    G.kids.forEach((k) => {
      drawKid(k);
      const a = applePos(k), phi = Math.atan2(a.ux, -a.uy);
      const spin = k.st === 'fall' ? (k.t / FALL_T) * 0.5 * (k.deg > 100 && k.deg < 200 ? -1 : 1) : 0;
      drawApple(a.x, a.y, phi, k.sq.value, spin);
      if (mActive && !k.done && k.st === 'held') {
        const c = toWorld(k, 4, -36);
        D.ring(c.x, c.y, 40, t + k.deg / 90, { color: '#fde047', width: 2.5 });
      }
    });
    // 중력 화살표 (떨어지는 동안)
    G.kids.forEach((k) => {
      const ar = k.ar;
      if (!ar.shown) return;
      const a = applePos(k), kk = ar.k, dx = ar.dx * kk, dy = ar.dy * kk, L = Math.hypot(dx, dy);
      if (L < 2) return;
      forceArrow(a.x, a.y, dx, dy, COL.grav, { width: 7 });
      const th = rad(k.deg), tx = Math.cos(th), ty = Math.sin(th);      // 아이에서 사과 쪽(바깥쪽 옆)으로 라벨을 빼 둬요
      pill('중력 약 2 N', clamp(a.x + dx * 0.5 + tx * 58, 70, W - 70), clamp(a.y + dy * 0.5 + ty * 58, 20, H - 20), { color: COL.grav, size: 14 });
    });
    // 이름표
    G.kids.forEach((k) => {
      const f = kidFrame(k), d = GL.R + (k.ld || 104);
      const lx = clamp(GL.cx + Math.sin(f.th) * d, 70, W - 70), ly = clamp(GL.cy - Math.cos(f.th) * d, 22, H - 22);
      pill(k.name + (k.done ? ' ✔' : ''), lx, ly, { color: k.done ? COL.good : shade(k.shirt, -0.3), size: 14 });
      if (k.sub) txt(k.sub, lx, ly + 24, { size: 12, color: '#dbeafe', halo: 'rgba(10,20,60,.8)', weight: 700 });
    });
  }
  function hitG(p) { for (let i = 0; i < G.kids.length; i++) if (kidHit(G.kids[i], p)) return G.kids[i]; return null; }
  function resetG() {
    G.kids.forEach((k) => { k.st = 'held'; k.t = 0; k.arm = 1; k.done = false; k.dash = 0; k.redrop = false; k.ar.jump(0, 0); k.sq.value = 0; k.sq.velocity = 0; k.sq.target = 0; });
    G.center = 0;
  }

  /* =========================================================
     장면 S · 용수철 실험 (2단계)  /  장면 U · 미지의 상자 (4단계)
     1 N에 2 cm (0.5 N/cm), 화면에서 1 cm = 12 px → 1 N = 24 px (화살표도 같은 눈금)
     ========================================================= */
  const AXS = 172;                                   // 용수철 축 x (실험대 기준)
  const ARM_Y = 62, SP_TOP = 84, SP_L0 = 132, SP_N = 13;
  const YZ = SP_TOP + SP_L0 + 14;                    // 늘어나지 않았을 때 용수철 끝(고리 아래)의 y = 230
  const CMPX = 12;                                   // 1 cm = 12 px
  const RXL = 210, RXW = 54;                         // 자 위치
  const BENCH = 516;                                 // 실험대 윗면
  const TRAY = { x0: 296, pitch: 34, y: BENCH - 14 - 13 };
  const BOX_N = 3.5;                                 // 4단계 상자의 무게(N)
  const SP = {
    mode: 'lab', x: 0, v: 0, pan: 0, panT: 0, hand: null, handShow: 0, handDir: 1,
    items: [0, 1, 2, 3, 4].map((i) => new Item({ id: 'w' + i, hx: TRAY.x0 + i * TRAY.pitch, hy: TRAY.y, w: 30, h: 26, label: '1 N' })),
    rec: {}, pt: {}, lineK: 0, recFlash: 0, maxStretch: 0, maxCompress: 0, settledT: 0, settled: false,
    aG: new AArrow(), elasA: 0, tray: 0, drag: null, pend: null,
    box: { t: 0, hung: 0, checked: false, val: 3, in: 0 },
  };
  const loadN = () => SP.items.filter((it) => it.att && (it.mode === 'on' || it.u > 0.7)).length;
  const attachedN = () => SP.items.filter((it) => it.att).length;
  const eqX = () => (SP.mode === 'box' ? (SP.box.hung ? BOX_N * NPX : 0) : loadN() * NPX);
  const labX = () => 250 * (1 - SP.pan);
  const hangPos = (slot) => ({ x: AXS, y: YZ + SP.x + 20 + slot * 26 });
  const nfmt = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : fm(v, 1));

  function stepSpring(dt) {
    const w0 = 7, z = 0.4;
    if (SP.hand) {
      const nx = approach(SP.x, SP.hand.x, dt, 26);
      SP.v = clamp((nx - SP.x) / Math.max(dt, 1e-3), -420, 420); SP.x = nx;
      SP.maxStretch = Math.max(SP.maxStretch, SP.x / CMPX); SP.maxCompress = Math.max(SP.maxCompress, -SP.x / CMPX);
    } else {
      const xeq = eqX(), n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) { const a = -w0 * w0 * (SP.x - xeq) - 2 * z * w0 * SP.v; SP.v += a * h; SP.x += SP.v * h; }
      if (Math.abs(SP.x - xeq) < 0.35 && Math.abs(SP.v) < 6) { SP.x = xeq; SP.v = 0; }
    }
    const moving = SP.items.some((it) => it.mode === 'drag' || (it.u < 1 && (it.att || it.mode === 'home')));
    const calm = !SP.hand && Math.abs(SP.v) < 0.5 && Math.abs(SP.x - eqX()) < 0.5 && !moving;
    SP.settledT = calm ? SP.settledT + dt : 0;
    SP.settled = SP.settledT > 0.25;
  }
  function stepS(dt) {
    SP.pan = approach(SP.pan, SP.panT, dt, 4.2);
    if (Math.abs(SP.pan - SP.panT) < 0.002) SP.pan = SP.panT;
    SP.tray = approach(SP.tray, SP.panT > 0.5 && SP.mode === 'lab' && on('weights') ? 1 : 0, dt, 5);
    SP.handShow = approach(SP.handShow, SP.hand ? 1 : 0, dt, 12);
    if (SP.hand) SP.handDir = SP.x >= 0 ? 1 : -1;
    if (SP.mode === 'box') {
      const b = SP.box; b.t += dt;
      b.in = approach(b.in, b.t > 0.35 ? 1 : 0, dt, 9);
      if (b.t > 0.75 && !b.hung) { b.hung = 1; Sound.tick(); }
    }
    SP.items.forEach((it) => it.update(dt));
    stepSpring(dt);
    const n = SP.mode === 'box' ? (SP.box.hung ? BOX_N : 0) : attachedN();
    SP.aG.set(0, n * NPX); SP.aG.update(dt);
    SP.elasA = approach(SP.elasA, Math.abs(SP.x) > 3 ? 1 : 0, dt, 12);
    SP.recFlash = Math.max(0, SP.recFlash - dt * 2.2);
    Object.keys(SP.pt).forEach((k) => { SP.pt[k] = Math.min(1, SP.pt[k] + dt / 0.45); });
    const nrec = Object.keys(SP.rec).length;
    SP.lineK = approach(SP.lineK, SP.mode === 'box' || nrec >= 2 ? 1 : 0, dt, 2.4);
    if (SP.lineK > 0.995) SP.lineK = 1;
  }

  /* ---------- 그리기: 배경 · 스탠드 · 자 · 코일 ---------- */
  function drawLabBackground() {
    const wg = ctx.createLinearGradient(0, 0, 0, BENCH);
    wg.addColorStop(0, '#f6f9ff'); wg.addColorStop(1, '#dce7f6');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, W, BENCH + 2);
    ctx.fillStyle = 'rgba(100,130,180,.08)'; ctx.fillRect(0, BENCH - 74, W, 74);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, BENCH - 76, W, 3);
    const top = ctx.createLinearGradient(0, BENCH, 0, BENCH + 24);
    top.addColorStop(0, '#ecc08a'); top.addColorStop(1, '#cf9257');
    ctx.fillStyle = top; ctx.fillRect(0, BENCH, W, 24);
    ctx.fillStyle = '#a86a35'; ctx.fillRect(0, BENCH + 22, W, H - BENCH - 22);
    ctx.strokeStyle = 'rgba(120,70,30,.22)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const y = BENCH + 6 + k * 5; ctx.moveTo(0, y); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.05 + k * 1.7) * 1.2); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, BENCH + 1); ctx.lineTo(W, BENCH + 1); ctx.stroke();
    const sh = ctx.createLinearGradient(0, BENCH + 24, 0, BENCH + 60);
    sh.addColorStop(0, 'rgba(60,30,10,.28)'); sh.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, BENCH + 24, W, 36);
  }
  function drawStand() {
    const px = 40;
    softShadow(px + 12, BENCH + 2, 62, 6, 0.3);
    const bg = ctx.createLinearGradient(0, BENCH - 12, 0, BENCH);
    bg.addColorStop(0, '#a3afc0'); bg.addColorStop(1, '#5b6779');
    ctx.fillStyle = bg; rr(px - 36, BENCH - 12, 96, 12, 4); ctx.fill();
    const pg = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
    pg.addColorStop(0, '#8693a5'); pg.addColorStop(0.45, '#eef2f8'); pg.addColorStop(1, '#6b7788');
    ctx.fillStyle = pg; rr(px - 5, ARM_Y - 26, 10, BENCH - ARM_Y + 18, 3); ctx.fill();
    const ag = ctx.createLinearGradient(0, ARM_Y - 5, 0, ARM_Y + 5);
    ag.addColorStop(0, '#f1f5f9'); ag.addColorStop(1, '#7a8799');
    ctx.fillStyle = ag; rr(px - 4, ARM_Y - 5, AXS - px + 34, 10, 4); ctx.fill();
    ctx.fillStyle = '#475569'; rr(px - 10, ARM_Y - 11, 20, 22, 4); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(px, ARM_Y, 3.6, 0, Math.PI * 2); ctx.fill();
    // 용수철을 거는 고리
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(AXS, ARM_Y + 5); ctx.lineTo(AXS, SP_TOP - 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(AXS, ARM_Y + 9, 3.6, 0, Math.PI * 2); ctx.stroke();
  }
  function drawRuler() {
    const y0 = YZ - 66, y1 = YZ + 13 * CMPX + 16, x = RXL, w = RXW;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    rr(x, y0, w, y1 - y0, 8); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; rr(x, y0, w, y1 - y0, 8); ctx.stroke();
    for (let i = -5; i <= 13; i++) {
      const y = YZ + i * CMPX, major = i % 2 === 0;
      ctx.strokeStyle = i < 0 ? '#b6c0cf' : '#334155'; ctx.lineWidth = major ? 1.8 : 1.1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (major ? 16 : 9), y); ctx.stroke();
      if (major && i > 0) txt(String(i), x + 31, y, { size: 12.5, color: '#334155', halo: 'rgba(255,255,255,.95)', weight: 700 });
    }
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 7, YZ); ctx.lineTo(x + w - 6, YZ); ctx.stroke();
    txt('0', x + 31, YZ, { size: 13, color: '#2563eb', halo: 'rgba(255,255,255,.95)' });
    pill('cm', x + w / 2, y0 - 14, { color: '#64748b', size: 12 });
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
  function drawWeight(it) {
    const lift = it.lift, w = it.w, h = it.h;
    ctx.save(); ctx.translate(it.x, it.y - lift * 4); ctx.scale(1 + 0.1 * lift, 1 + 0.1 * lift);
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,' + (0.28 + 0.1 * lift).toFixed(2) + ')'; ctx.shadowBlur = 5 + 9 * lift; ctx.shadowOffsetY = 2 + 5 * lift;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#fde9a1'); g.addColorStop(0.5, '#f2c44a'); g.addColorStop(1, '#b8820f');
    ctx.fillStyle = g; rr(-w / 2, -h / 2, w, h, 5); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 1.6; rr(-w / 2, -h / 2, w, h, 5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-w / 2 + 3, -h / 2 + 2.5, w - 6, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(90,60,0,.3)'; rr(-4.5, -h / 2, 9, 4.5, 2); ctx.fill();
    txt(it.label, 0, 2, { size: 13, color: '#5a3a00', halo: 'rgba(255,240,180,.85)' });
    ctx.restore();
  }
  function drawCrate(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.32)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(-23, -20, 23, 20); g.addColorStop(0, '#f2cb92'); g.addColorStop(1, '#c48a4f');
    ctx.fillStyle = g; rr(-23, -20, 46, 40, 6); ctx.fill(); ctx.restore();
    ctx.save(); rr(-23, -20, 46, 40, 6); ctx.clip();
    ctx.strokeStyle = 'rgba(110,64,24,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-23, -7); ctx.lineTo(23, -7); ctx.moveTo(-23, 7); ctx.lineTo(23, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,72,30,.25)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let r = 0; r < 3; r++) { const yy = -20 + r * 14 + 7; for (let xx = -23; xx <= 23; xx += 6) { const y2 = yy + Math.sin(xx * 0.2 + r) * 1.6; if (xx === -23) ctx.moveTo(xx, y2); else ctx.lineTo(xx, y2); } }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 2.6; rr(-23, -20, 46, 40, 6); ctx.stroke();
    D.sphere(0, 0, 11, '#fff', { gloss: false });
    txt('?', 0, 1, { size: 18, color: '#7c4a1c', halo: false });
    ctx.restore();
  }
  function drawNeedle(yEnd, color, dashed, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.8;
    if (dashed) { ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(AXS + 8, yEnd); ctx.lineTo(RXL + 8, yEnd); ctx.stroke(); ctx.setLineDash([]); }
    ctx.beginPath(); ctx.moveTo(AXS + 9, yEnd - 3); ctx.lineTo(RXL + 8, yEnd); ctx.lineTo(AXS + 9, yEnd + 3); ctx.closePath();
    if (dashed) ctx.stroke(); else ctx.fill();
    ctx.restore();
  }
  function drawSpringAndLoad(t) {
    const yEnd = YZ + SP.x, yBot = SP_TOP + SP_L0 + SP.x;
    drawCoil(AXS, SP_TOP, yBot, SP_N, 15);
    // 아래 고리
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(AXS, yEnd - 5, 5.2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(AXS, yEnd - 5, 5.2, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    drawNeedle(yEnd, '#e11d48', false);
    // 걸린 물건
    if (SP.mode === 'box') {
      const b = SP.box, k = EASE.outBack(clamp(b.in, 0, 1));
      if (b.in > 0.02) {
        ctx.save(); ctx.globalAlpha = Math.min(1, b.in * 1.6);
        drawCrate(AXS, yEnd + 27 - (1 - Math.min(1, b.in)) * 46, 0.2 + 0.8 * k);
        ctx.restore();
      }
    } else {
      const att = SP.items.filter((it) => it.att).sort((a, b) => a.slot - b.slot);
      if (att.length) {
        const last = att[att.length - 1];
        ctx.strokeStyle = '#6b7788'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(AXS, yEnd); ctx.lineTo(AXS, last.y); ctx.stroke();
      }
      att.forEach(drawWeight);
    }
  }
  /* 힘 화살표: 용수철 축 왼쪽에 나란히 (같은 작용선) */
  function drawSpringForces(t) {
    const yEnd = YZ + SP.x, xe = AXS - 36;
    const n = SP.mode === 'box' ? (SP.box.hung ? BOX_N : 0) : attachedN();
    if (SP.handShow > 0.03 && SP.mode === 'lab') {
      const dir = SP.handDir, F = Math.abs(SP.x) / NPX;
      ctx.save(); ctx.globalAlpha = SP.handShow;
      // 장갑: 용수철 끝(고리)을 잡고 있어요
      if (dir > 0) glove(AXS, yEnd - 4, 0, 1, 'pull', { scale: 0.9 });
      else glove(AXS, yEnd + 2, 0, -1, 'push', { scale: 0.9 });
      if (F > 0.12) {
        const L = Math.abs(SP.x);
        forceArrow(xe, yEnd, 0, dir * L, COL.push, {});                    // 손이 용수철에 가하는 힘
        forceArrow(xe, yEnd, 0, -dir * L, COL.elas, { dot: false });       // 탄성력(손을 되돌리려는 힘)
        pill((dir > 0 ? '손이 당기는 힘 ' : '손이 미는 힘 ') + nfmt(F) + ' N', xe - 14, yEnd + dir * (L * 0.5 + 12), { align: 'right', color: COL.push, size: 13 });
        pill('탄성력 ' + nfmt(F) + ' N', xe - 14, yEnd - dir * (L * 0.5 + 12), { align: 'right', color: COL.elas, size: 13 });
      }
      ctx.restore();
      return;
    }
    if (n <= 0 || SP.pan < 0.3) return;
    const a = SP.aG, kk = a.k, gL = a.dy * kk;
    const yc = yEnd + 20 + (Math.max(1, n) - 1) * 13;
    ctx.save(); ctx.globalAlpha = Math.min(1, SP.pan * 1.4);
    // 탄성력 (위쪽, 늘어난 길이에 비례)
    const F = SP.x / NPX, L = SP.x;
    const unknown = SP.mode === 'box';
    if (Math.abs(L) > 3) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.elas, 0.55); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(AXS - 7, yEnd); ctx.lineTo(xe + 4, yEnd); ctx.stroke(); ctx.restore();
      forceArrow(xe, yEnd, 0, -L * SP.elasA, COL.elas, {});
      pill('탄성력 ' + (unknown ? '? N' : nfmt(F) + ' N'), xe - 14, yEnd - L * 0.5, { align: 'right', color: COL.elas, size: 13 });
    }
    // 중력 (아래쪽, 추의 무게)
    if (a.shown && Math.abs(gL) > 2) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(COL.grav, 0.55); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(AXS - 17, yc); ctx.lineTo(xe + 4, yc); ctx.stroke(); ctx.restore();
      forceArrow(xe, yc, 0, gL, COL.grav, {});
      pill((unknown ? '무게 ? N' : '중력 ' + nfmt(n) + ' N'), xe - 14, yc + gL * 0.5, { align: 'right', color: COL.grav, size: 13 });
    }
    if (SP.settled && n > 0 && !unknown) pill('평형: 탄성력 = 추의 무게', AXS + 118, 448, { solid: true, color: COL.good, size: 14 });
    if (unknown && SP.settled && SP.box.hung) pill('멈춰 있으니 탄성력 = 상자의 무게', AXS + 112, 448, { solid: true, color: COL.good, size: 14 });
    ctx.restore();
  }
  function drawReading() {
    const yEnd = YZ + SP.x, cm = SP.x / CMPX;
    if (Math.abs(cm) < 0.15 && SP.mode === 'lab') return;
    const label = (cm >= 0 ? '늘어난 길이 ' : '줄어든 길이 ') + fm(Math.abs(cm), 1) + ' cm';
    pill(label, RXL + RXW + 14, yEnd, { align: 'left', color: '#be123c', size: 13.5 });
  }
  function drawTray(t) {
    const k = SP.tray;
    if (k < 0.01) return;
    const x0 = TRAY.x0 - 26, w = 4 * TRAY.pitch + 52, y = BENCH - 14 + (1 - k) * 46;
    ctx.save(); ctx.globalAlpha = k;
    softShadow(x0 + w / 2, BENCH + 2, w * 0.56, 6, 0.28);
    const g = ctx.createLinearGradient(0, y, 0, y + 14);
    g.addColorStop(0, '#dfe6ef'); g.addColorStop(1, '#8d9ab0');
    ctx.fillStyle = g; rr(x0, y, w, 14, 5); ctx.fill();
    ctx.strokeStyle = '#6b7788'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(x0 + 6, y + 2, w - 12, 3, 1.5); ctx.fill();
    ctx.restore();
    if (isNew('weights') && k > 0.9) newTag(x0 - 6, y - 40, w + 12, 54);
  }
  const niceCm = (c) => fm(c, 1);

  /* ---------- 그래프 (오른쪽 카드) ---------- */
  const GRP = { x: 462, y: 34, w: 322, h: 520 };
  function drawGraph(k) {
    const gx = GRP.x + (1 - k) * 360, gy = GRP.y, gw = GRP.w, gh = GRP.h;
    const ox = gx + 64, oy = gy + gh - 64, xl = 240, yl = 360;
    const PX = xl / 12, PY = yl / 6;                    // 1 cm = 20 px, 1 N = 60 px
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.3);
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    rr(gx, gy, gw, gh, 18); ctx.fillStyle = 'rgba(255,255,255,.97)'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#dbe3ee'; ctx.lineWidth = 1.5; rr(gx, gy, gw, gh, 18); ctx.stroke();
    txt('📈 탄성력과 늘어난 길이', gx + gw / 2, gy + 30, { size: 16, color: '#1b2333', halo: false });
    // 눈금
    ctx.strokeStyle = 'rgba(100,116,139,.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= 12; c += 2) { ctx.moveTo(ox + c * PX, oy); ctx.lineTo(ox + c * PX, oy - yl); }
    for (let f = 0; f <= 6; f++) { ctx.moveTo(ox, oy - f * PY); ctx.lineTo(ox + xl, oy - f * PY); }
    ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy + 6); ctx.lineTo(ox, oy - yl - 10); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + xl + 12, oy); ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(ox, oy - yl - 16); ctx.lineTo(ox - 5, oy - yl - 6); ctx.lineTo(ox + 5, oy - yl - 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox + xl + 18, oy); ctx.lineTo(ox + xl + 8, oy - 5); ctx.lineTo(ox + xl + 8, oy + 5); ctx.closePath(); ctx.fill();
    for (let c = 0; c <= 12; c += 2) txt(String(c), ox + c * PX, oy + 17, { size: 12.5, color: '#475569', halo: false, weight: 700 });
    for (let f = 1; f <= 6; f++) txt(String(f), ox - 14, oy - f * PY, { size: 12.5, color: '#475569', halo: false, weight: 700 });
    txt('늘어난 길이 (cm)', ox + xl / 2, oy + 40, { size: 13.5, color: '#334155', halo: false });
    txt('탄성력 (N)', ox - 14, oy - yl - 28, { size: 13.5, color: '#334155', halo: false, align: 'left' });
    const nrec = Object.keys(SP.rec).length;
    // 원점을 지나는 직선
    if (SP.lineK > 0.01) {
      const e = EASE.outCubic(SP.lineK);
      ctx.save(); ctx.strokeStyle = rgba(COL.elas, 0.9); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + xl * e, oy - yl * e); ctx.stroke();
      ctx.restore();
      if (e > 0.95) pill('원점을 지나는 직선 → 비례', ox + 150, oy - 64, { color: COL.elas, size: 13, alpha: (e - 0.95) * 20 });
    } else if (nrec === 1) {
      const kx = Object.keys(SP.rec)[0];
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(COL.elas, 0.6); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + SP.rec[kx] * PX, oy - kx * PY); ctx.stroke(); ctx.restore();
    }
    // 기록한 점
    Object.keys(SP.rec).forEach((kx) => {
      const p = SP.pt[kx] == null ? 1 : SP.pt[kx], s = EASE.outBack(clamp(p, 0, 1));
      const px = ox + SP.rec[kx] * PX, py = oy - kx * PY;
      ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
      D.glow(0, 0, 15, COL.elas, 0.4);
      ctx.fillStyle = COL.elas; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.restore();
    });
    // 지금 용수철의 상태 (살아 있는 점): 늘어난 길이 ↔ 탄성력
    const ex = SP.x / CMPX;
    if (ex > 0.25 && SP.mode === 'lab' || (SP.mode === 'box' && ex > 0.25)) {
      const lx = ox + Math.min(ex, 12.6) * PX, ly = oy - (Math.min(ex, 12.6) * 0.5) * PY;
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(30,41,59,.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, oy); ctx.lineTo(lx, ly); ctx.lineTo(ox, ly); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(lx, ly, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const txtv = SP.mode === 'lab' ? nfmt(ex * 0.5) + ' N · ' + fm(ex, 1) + ' cm' : fm(ex, 1) + ' cm';
      const flip = lx > ox + 120;
      pill(txtv, flip ? lx - 12 : lx + 12, ly + 26, { align: flip ? 'right' : 'left', color: '#0f172a', size: 12.5 });
    }
    ctx.restore();
  }

  /* ---------- 장면 그리기 ---------- */
  function drawSceneS(t) {
    drawLabBackground();
    drawScaleBar(122, 556, NPX, '1 N', true);
    const k = SP.pan;
    if (k > 0.01 && (SP.mode === 'box' || on('record'))) drawGraph(k);
    ctx.save(); ctx.translate(labX(), 0);
    drawStand(); drawRuler(); drawSpringAndLoad(t);
    drawReading();
    // 기록 직후 반짝
    if (SP.recFlash > 0) { ctx.save(); ctx.globalAlpha = SP.recFlash; ctx.strokeStyle = COL.good; ctx.lineWidth = 4; rr(RXL - 6, YZ + SP.x - 14, RXW + 12, 28, 10); ctx.stroke(); ctx.restore(); }
    // 4단계: 학생이 정한 무게에 해당하는 늘어난 길이(점선 바늘)
    if (SP.mode === 'box' && SP.box.checked) {
      const gy = YZ + SP.box.val * NPX;
      drawNeedle(gy, '#7c3aed', true, 0.9);
      pill('내 예상 ' + fm(SP.box.val * 2, 1) + ' cm', RXL + RXW + 14, gy + (Math.abs(gy - (YZ + SP.x)) < 22 ? 22 : 0), { align: 'left', color: '#7c3aed', size: 13 });
    }
    drawSpringForces(t);
    drawTray(t);
    SP.items.forEach((it) => {
      if (it.att) return;
      if (it.mode === 'home') {
        const kk = SP.tray;
        if (kk < 0.02) return;
        ctx.save(); ctx.globalAlpha = kk; const y0 = it.y; it.y += (1 - kk) * 46; drawWeight(it); it.y = y0; ctx.restore();
      } else drawWeight(it);
    });
    // 드래그 목표 표시
    const m = game && game.current();
    if (m && game.isActive(m) && m.key === 'S1' && !SP.hand && SP.handShow < 0.1 && (SP.maxStretch < 3 || SP.maxCompress < 2) && attachedN() === 0) {
      D.ring(AXS, YZ + SP.x + 4, 20, t, { color: COL.push, width: 2.5 });
    }
    if (m && game.isActive(m) && m.key === 'S2' && SP.tray > 0.9 && attachedN() === 0) {
      D.ring(SP.items[0].x, SP.items[0].y, 24, t, { color: '#f59e0b', width: 2.5 });
    }
    ctx.restore();
  }

  /* ---------- 입력: 용수철 실험 ---------- */
  function hitS(p) {
    const lp = { x: p.x - labX(), y: p.y };
    if (SP.mode === 'box') return null;
    if (SP.tray > 0.7) {
      const it = pickNearest(SP.items.filter((q) => !q.att && q.mode === 'home'), lp, 6);
      if (it) return { kind: 'tray', it, lp };
    }
    const n = attachedN();
    if (n > 0) {
      const top = YZ + SP.x + 7, bot = YZ + SP.x + 20 + (n - 1) * 26 + 13;
      if (Math.abs(lp.x - AXS) < 26 * HIT && lp.y > top - 6 && lp.y < bot + 8 * HIT) {
        const it = SP.items.filter((q) => q.att).sort((a, b) => b.slot - a.slot)[0];
        return { kind: 'hung', it, lp };
      }
      return null;
    }
    if (on('spring') && Math.abs(lp.x - AXS) < 34 * HIT && lp.y > YZ + SP.x - 40 * HIT && lp.y < YZ + SP.x + 34 * HIT) return { kind: 'end', lp };
    return null;
  }
  function attachItem(it) {
    it.att = true; it.slot = attachedN() - 1 < 0 ? 0 : SP.items.filter((q) => q !== it && q.att).length;
    it.go('fly', () => hangPos(it.slot), 0.38);
    it.onArrive = () => { it.mode = 'on'; Sound.tick(); };
    Sound.tone(520, 0.08, 'triangle', 0.08);
    hideHint();
  }
  function detachItem(it, instant) {
    it.att = false;
    if (!instant) it.go('home', null, 0.45);
    Sound.tone(380, 0.08, 'triangle', 0.07);
  }
  function downS(p) {
    const h = hitS(p);
    if (!h) return false;
    hideHint();
    if (h.kind === 'end') {
      SP.hand = { x: SP.x, off: p.y - (YZ + SP.x) };
      Sound.tick();
      return true;
    }
    if (h.kind === 'hung') detachItem(h.it, true);
    const it = h.it;
    it.mode = 'drag'; it.u = 1;
    SP.drag = { it, sx: p.x, sy: p.y, ox: it.x - h.lp.x, oy: it.y - h.lp.y, moved: false, from: h.kind };
    return true;
  }
  function moveS(p) {
    if (SP.hand) {
      SP.hand.x = clamp(p.y - SP.hand.off - YZ, -5 * CMPX, 12 * CMPX);
      return;
    }
    const d = SP.drag;
    if (!d) return;
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
    d.it.x = p.x - labX() + d.ox; d.it.y = p.y + d.oy;
  }
  function upS(p) {
    if (SP.hand) { SP.hand = null; Sound.tick(); return; }
    const d = SP.drag;
    if (!d) return;
    SP.drag = null;
    const it = d.it, lp = { x: p.x - labX(), y: p.y };
    const nearSpring = Math.abs(lp.x - AXS) < 78 * HIT && lp.y > YZ + SP.x - 40 && lp.y < YZ + SP.x + 230;
    const full = SP.items.filter((q) => q !== it && q.att).length >= 5;
    if (d.from === 'hung') {
      if (d.moved && nearSpring) attachItem(it);              // 다시 걸기
      else detachItem(it);
    } else if (!d.moved || nearSpring) {
      if (!full) attachItem(it); else it.go('home', null, 0.4);
    } else it.go('home', null, 0.4);
  }
  function resetS() {
    SP.x = 0; SP.v = 0; SP.hand = null; SP.handShow = 0; SP.drag = null;
    SP.items.forEach((it) => { it.att = false; it.mode = 'home'; it.x = it.hx; it.y = it.hy; it.u = 1; it.lift = 0; it.onArrive = null; });
    SP.settledT = 0; SP.settled = false;
    SP.box.t = 0; SP.box.hung = 0; SP.box.in = 0;
  }
  function removeAllWeights() { SP.items.forEach((it) => { if (it.att || it.mode !== 'home') { it.att = false; it.go('home', null, 0.4); } }); }

  /* ---------- 기록 표 ---------- */
  function canRecord() { return scene === 'S' && SP.mode === 'lab' && SP.settled && loadN() > 0 && SP.items.every((it) => it.mode !== 'drag'); }
  function doRecord() {
    if (!canRecord()) return;
    const n = loadN();
    SP.rec[n] = Math.round(SP.x / CMPX * 10) / 10;
    SP.pt[n] = 0; SP.recFlash = 1;
    Sound.tone(880, 0.12, 'triangle', 0.1); Sound.tone(1175, 0.12, 'triangle', 0.08);
    renderTable();
    badge('📍 ' + n + ' N · ' + fm(SP.rec[n], 1) + ' cm 기록!', AXS + labX() + 150, 118, COL.good, 1.8);
  }
  function renderTable() {
    const rn = $('#rowN'), rc = $('#rowC');
    if (!rn) return;
    rn.innerHTML = '<th>탄성력 (= 추의 무게)</th>'; rc.innerHTML = '<th>늘어난 길이</th>';
    let c = 0;
    for (let n = 1; n <= 5; n++) {
      const has = SP.rec[n] != null; if (has) c++;
      rn.insertAdjacentHTML('beforeend', '<td class="' + (has ? '' : 'empty') + '">' + (has ? n + ' N' : '·') + '</td>');
      rc.insertAdjacentHTML('beforeend', '<td class="' + (has ? '' : 'empty') + '">' + (has ? fm(SP.rec[n], 1) + ' cm' : '·') + '</td>');
    }
    $('#dataN').textContent = '기록 ' + c + '/5';
  }

  /* =========================================================
     장면 W · 지구 실험실과 달 기지 (3단계: 질량과 무게)
     1 kg 추의 무게: 지구 9.8 N, 달 1.6 N  (화살표 1 N = 12 px, 용수철저울 눈금 1 N = 12 px)
     ========================================================= */
  const MID = W / 2, TBL = 498;
  const GRAV = { E: 9.8, M: 1.6 };
  const SSX = { E: 84, M: 484 };                      // 용수철저울 x
  const SS = { top: 64, len: 212, pxn: 12, c0: 64 + 62, plateW: 46 };   // c0: 0 N일 때 바늘(고리) y
  const HOOK0 = SS.top + SS.len + 20;                 // 0 N일 때 갈고리 y
  const BEAM = { L: 76, py: 318, string: 60 };
  const BASEY = 536;
  const BAL_X = { E: 276, M: 656 };
  const SC = { E: { d: 0, v: 0, item: null, cal: 0 }, M: { d: 0, v: 0, item: null, cal: 0 } };
  const OBJ = new Item({ id: 'obj', hx: 166, hy: 540, w: 38, h: 48, g: 1000, label: '1 kg' });
  const WTS = [
    new Item({ id: 'w500', g: 500, w: 38, h: 32, label: '500 g', hx: 226, hy: 568 }),
    new Item({ id: 'w200a', g: 200, w: 32, h: 28, label: '200 g', hx: 272, hy: 570 }),
    new Item({ id: 'w200b', g: 200, w: 32, h: 28, label: '200 g', hx: 310, hy: 570 }),
    new Item({ id: 'w100', g: 100, w: 28, h: 24, label: '100 g', hx: 345, hy: 572 }),
  ];
  const ALL3 = [OBJ].concat(WTS);
  const BAL = { side: 'E', x: BAL_X.E, lift: 0, fly: null, ang: 0, av: 0, L: [], R: [], levelT: 0, count: 0 };
  const WS = { meas: { E: false, M: false }, val: { E: 0, M: 0 }, lvE: false, lvM: false, massShown: false, arO: new AArrow(), arSide: 'E' };
  const hookY = (s) => HOOK0 + SC[s].d;
  const scaleEq = (s) => { const it = SC[s].item; return it && (it.mode === 'on' || it.u > 0.7) ? (it.g / 1000) * GRAV[s] * SS.pxn : 0; };
  const massOf = (arr) => arr.reduce((m, it) => m + (it.mode === 'on' || it.u > 0.6 ? it.g : 0), 0);

  function balGeo() {
    const cx = BAL.x, py = BEAM.py - BAL.lift, a = BAL.ang, c = Math.cos(a), s = Math.sin(a);
    const lx = cx - BEAM.L * c, ly = py + BEAM.L * s, rx = cx + BEAM.L * c, ry = py - BEAM.L * s;
    return { cx, py, lx, ly, rx, ry, pl: { x: lx, y: ly + BEAM.string + 8 }, pr: { x: rx, y: ry + BEAM.string + 8 }, base: BASEY - BAL.lift };
  }
  /* 접시 위 물건 배치: 한 줄에 2개씩, 폭만큼 나란히 놓고 그 위에 다음 줄을 쌓아요 */
  function panLayout(arr) {
    const out = new Map();
    let base = 0;
    for (let r = 0; r * 2 < arr.length; r++) {
      const row = arr.slice(r * 2, r * 2 + 2), gap = 3;
      const tot = row.reduce((s, it) => s + it.w, 0) + gap * (row.length - 1);
      let x = -tot / 2;
      row.forEach((it) => { out.set(it, { ox: x + it.w / 2, base }); x += it.w + gap; });
      base += Math.max.apply(null, row.map((it) => it.h)) - 1;
    }
    return out;
  }
  function panTgt(it, side) {
    return () => {
      const g = balGeo(), pan = side === 'L' ? g.pl : g.pr, s = panLayout(BAL[side]).get(it) || { ox: 0, base: 0 };
      return { x: pan.x + s.ox, y: pan.y - 4 - s.base - it.h / 2 };
    };
  }
  function releaseItem(it) {            // 어디에 걸려 있든 떼어 내기
    ['E', 'M'].forEach((s) => { if (SC[s].item === it) { SC[s].item = null; SC[s].cal = 0; } });
    ['L', 'R'].forEach((s) => { const i = BAL[s].indexOf(it); if (i >= 0) BAL[s].splice(i, 1); });
  }
  function hangOnScale(it, s) {
    if (SC[s].item && SC[s].item !== it) { const o = SC[s].item; releaseItem(o); o.go('home', null, 0.45); }
    releaseItem(it);
    SC[s].item = it; SC[s].cal = 0; it.smooth = 0;
    it.go('fly', () => ({ x: SSX[s], y: hookY(s) + 4 + it.h / 2 }), 0.42);
    it.onArrive = () => { it.mode = 'on'; Sound.tick(); };
    Sound.tone(520, 0.08, 'triangle', 0.08); hideHint();
  }
  function placeOnPan(it, side) {
    releaseItem(it);
    BAL[side].push(it); it.smooth = 16;
    it.go('fly', panTgt(it, side), 0.4);
    it.onArrive = () => { it.mode = 'on'; Sound.tick(); };
    Sound.tone(520, 0.08, 'triangle', 0.08); hideHint();
  }
  function sendHome(it) { releaseItem(it); it.smooth = 0; it.go('home', null, 0.45); }
  function whereIsObj() { return SC.E.item === OBJ ? 'E' : SC.M.item === OBJ ? 'M' : null; }

  function stepW(dt) {
    // 용수철저울 (같은 추 → 같은 빠르기로 흔들리고, 평형 위치만 달라요)
    ['E', 'M'].forEach((s) => {
      const c = SC[s], eq = scaleEq(s), w0 = 7, z = 0.4, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) { const a = -w0 * w0 * (c.d - eq) - 2 * z * w0 * c.v; c.v += a * h; c.d += c.v * h; }
      if (Math.abs(c.d - eq) < 0.3 && Math.abs(c.v) < 5) { c.d = eq; c.v = 0; }
      const calm = c.item && c.item.mode === 'on' && Math.abs(c.v) < 0.5 && Math.abs(c.d - eq) < 0.5;
      c.cal = calm ? c.cal + dt : 0;
      if (c.cal > 0.45 && !WS.meas[s]) {
        WS.meas[s] = true; WS.val[s] = Math.round(eq / SS.pxn * 10) / 10;
        celebrate(SSX[s], hookY(s) + 30, 36);
      }
    });
    // 물건의 무게 화살표 (어느 쪽 중력인지에 따라 부드럽게 늘었다 줄었다)
    const wh = whereIsObj();
    let side = null;
    if (OBJ.mode === 'drag') side = OBJ.x < MID ? 'E' : 'M'; else if (wh && (OBJ.mode === 'on' || OBJ.u > 0.3)) side = wh;
    if (side) { WS.arSide = side; WS.arO.set(0, GRAV[side] * SS.pxn); } else WS.arO.set(0, 0);
    WS.arO.update(dt);
    // 양팔저울
    const bf = BAL.fly;
    if (bf) {
      bf.t += dt;
      const u = clamp(bf.t / bf.dur, 0, 1), e = EASE.inOutCubic(u);
      BAL.x = bf.from + (bf.to - bf.from) * e; BAL.lift = Math.sin(Math.PI * u) * 150;
      BAL.av += (Math.random() - 0.5) * 0.4 * dt;
      if (!RM) {
        for (let i = 0; i < 2; i++) FX.emit({ x: BAL.x + (Math.random() - 0.5) * 40, y: BASEY - BAL.lift + 4, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 70, life: 0.5, size: 5 + Math.random() * 5, color: Math.random() < 0.5 ? 'rgba(255,190,90,.8)' : 'rgba(255,255,255,.7)', shape: 'smoke', drag: 1.2 });
      }
      if (u >= 1) {
        BAL.fly = null; BAL.side = bf.dest; BAL.x = bf.to; BAL.lift = 0; BAL.av += (bf.dest === 'M' ? 0.5 : -0.5);
        Sound.tone(130, 0.18, 'sine', 0.14);
        if (!RM) for (let i = 0; i < 12; i++) { const sd = (Math.random() - 0.5) * 2; FX.emit({ x: BAL.x + sd * 50, y: BASEY + 2, vx: sd * (bf.dest === 'M' ? 60 : 90), vy: -Math.random() * (bf.dest === 'M' ? 40 : 25), life: bf.dest === 'M' ? 1.1 : 0.6, size: 4 + Math.random() * 4, color: bf.dest === 'M' ? 'rgba(200,205,215,.7)' : 'rgba(214,180,130,.7)', shape: 'smoke', drag: bf.dest === 'M' ? 1 : 2 }); }
        badge(bf.dest === 'M' ? '🌕 달에 도착! 저울은 여전히 수평일까?' : '🌍 지구로 돌아왔어요', BAL.x, BASEY - 230, '#334155', 2.4);
      }
    }
    const smr = BAL.fly ? 90 : 16;
    ALL3.forEach((it) => { if (it.smooth) it.smooth = smr; });
    const mL = massOf(BAL.L), mR = massOf(BAL.R), diff = mL - mR;
    const tgt = diff === 0 ? 0 : Math.sign(diff) * Math.max(0.05, Math.min(0.22, Math.abs(diff) * 0.0006));
    const w0 = 5.8, z = 0.26, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) { const a = -w0 * w0 * (BAL.ang - tgt) - 2 * z * w0 * BAL.av; BAL.av += a * h; BAL.ang += BAL.av * h; }
    if (!BAL.fly && Math.abs(BAL.ang - tgt) < 0.002 && Math.abs(BAL.av) < 0.02) { BAL.ang = tgt; BAL.av = 0; }
    ALL3.forEach((it) => it.update(dt));
    const level = mL > 0 && diff === 0 && Math.abs(BAL.ang) < 0.012 && Math.abs(BAL.av) < 0.06 && !BAL.fly;
    BAL.levelT = level ? BAL.levelT + dt : 0;
    if (BAL.levelT > 0.7) {
      if (BAL.side === 'E' && !WS.lvE && mL === 1000) { WS.lvE = true; WS.massShown = true; celebrate(BAL.x, BEAM.py, 60); Sound.tick(); }
      if (BAL.side === 'M' && WS.lvE && !WS.lvM) { WS.lvM = true; celebrate(BAL.x, BEAM.py, 60); }
    }
  }
  function flyBalance(dest) {
    if (BAL.fly) return;
    BAL.fly = { t: 0, dur: 1.3, from: BAL.x, to: BAL_X[dest], dest };
    Sound.tone(260, 0.5, 'sawtooth', 0.04);
    hideHint();
  }

  /* ---------- 그리기 ---------- */
  function drawWorld(t) {
    // 지구 실험실
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, MID, H); ctx.clip();
    const wg = ctx.createLinearGradient(0, 0, 0, TBL); wg.addColorStop(0, '#e4f3ff'); wg.addColorStop(1, '#c4e0f8');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, MID, TBL + 2);
    // 창문
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; rr(210, 52, 150, 112, 8); ctx.fill(); ctx.restore();
    const sk = ctx.createLinearGradient(0, 60, 0, 156); sk.addColorStop(0, '#7cc4ff'); sk.addColorStop(1, '#cdeaff');
    ctx.fillStyle = sk; rr(218, 60, 134, 96, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; [[250, 100, 18], [272, 96, 24], [300, 102, 18]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#7bc47f'; ctx.beginPath(); ctx.moveTo(218, 156); ctx.quadraticCurveTo(260, 130, 352, 150); ctx.lineTo(352, 156); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(284, 60, 4, 96); ctx.fillRect(218, 106, 134, 4);
    // 탁자
    const top = ctx.createLinearGradient(0, TBL, 0, H); top.addColorStop(0, '#ecc08a'); top.addColorStop(0.55, '#cf9257'); top.addColorStop(1, '#a86a35');
    ctx.fillStyle = top; ctx.fillRect(0, TBL, MID, H - TBL);
    ctx.strokeStyle = 'rgba(120,70,30,.2)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const y = TBL + 10 + k * 13; ctx.moveTo(0, y); for (let x = 0; x <= MID; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.05 + k * 1.7) * 1.4); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, TBL, MID, 2);
    ctx.restore();
    // 달 기지
    ctx.save(); ctx.beginPath(); ctx.rect(MID, 0, W - MID, H); ctx.clip();
    D.space(MID, 0, W - MID, TBL, t, { top: '#10173a', bottom: '#02040c', stars: 70 });
    // 하늘에 뜬 지구
    D.glow(730, 82, 62, '#7cc4ff', 0.38);
    D.sphere(730, 82, 30, '#2b95e8', { light: '#86d6ff', dark: '#0a3f94', gloss: true });
    ctx.save(); ctx.beginPath(); ctx.arc(730, 82, 30, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(95,191,106,.9)'; ctx.beginPath(); ctx.ellipse(722, 76, 11, 8, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(740, 92, 8, 6, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(732, 68, 12, 3.5, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(718, 96, 9, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 땅
    const gg = ctx.createLinearGradient(0, TBL - 40, 0, H); gg.addColorStop(0, '#c4c9d2'); gg.addColorStop(0.35, '#9aa1ad'); gg.addColorStop(1, '#5d6471');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(MID, TBL - 18); ctx.quadraticCurveTo(MID + 200, TBL - 40, W, TBL - 16); ctx.lineTo(W, H); ctx.lineTo(MID, H); ctx.closePath(); ctx.fill();
    [[470, 530, 46, 10], [620, 572, 62, 12], [750, 536, 34, 8], [545, 580, 30, 7]].forEach(([x, y, rx, ry]) => {
      ctx.fillStyle = 'rgba(60,66,80,.35)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(MID, TBL + 1, W - MID, 0);
    ctx.restore();
    // 가운데 경계
    ctx.fillStyle = '#334155'; ctx.fillRect(MID - 2, 0, 4, H);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(MID - 2, 0, 1.5, H);
    pill('🌍 지구 실험실', 18, 26, { align: 'left', color: '#2563eb', size: 14.5 });
    pill('🌕 달 기지', MID + 18, 26, { align: 'left', color: '#475569', size: 14.5 });
    pill('달의 중력 = 지구의 약 1/6', W - 18, 26, { align: 'right', solid: true, color: '#475569', size: 13 });
  }
  function drawSpringScale(s, t) {
    const x = SSX[s], c = SC[s], top = SS.top, len = SS.len, cy = SS.c0 + c.d;
    // 스탠드 (기둥 + 팔)
    const px = s === 'E' ? 24 : MID + 24;
    softShadow(px + 6, TBL + 28, 44, 6, 0.3);
    const pg = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
    pg.addColorStop(0, '#8693a5'); pg.addColorStop(0.45, '#eef2f8'); pg.addColorStop(1, '#6b7788');
    ctx.fillStyle = pg; rr(px - 5, 36, 10, TBL - 16, 3); ctx.fill();
    ctx.fillStyle = '#5b6779'; rr(px - 28, TBL + 12, 68, 12, 4); ctx.fill();
    const ag = ctx.createLinearGradient(0, 42, 0, 54); ag.addColorStop(0, '#f1f5f9'); ag.addColorStop(1, '#7a8799');
    ctx.fillStyle = ag; rr(px - 4, 42, x - px + 20, 10, 4); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, top - 4); ctx.stroke();
    // 몸통 (유리관)
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const bg = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
    bg.addColorStop(0, 'rgba(235,243,252,.95)'); bg.addColorStop(0.5, 'rgba(255,255,255,.88)'); bg.addColorStop(1, 'rgba(205,218,235,.95)');
    ctx.fillStyle = bg; rr(x - 22, top, 44, len, 9); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#8b9bb0'; ctx.lineWidth = 2.4; rr(x - 22, top, 44, len, 9); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(x - 22, top, 44, 12, 7); ctx.fill();
    ctx.fillStyle = '#64748b'; rr(x - 22, top + len - 9, 44, 9, 5); ctx.fill();
    // 안쪽 용수철
    ctx.save(); rr(x - 21, top + 11, 42, len - 21, 4); ctx.clip();
    drawCoil(x, top + 14, cy, 10, 11);
    ctx.restore();
    // 바늘(고리)과 아래로 나온 막대
    ctx.strokeStyle = '#4b5565'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, hookY(s) - 8); ctx.stroke();
    ctx.fillStyle = '#e11d48'; rr(x - 14, cy - 3, 28, 6, 3); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(x, hookY(s) - 3, 5.4, 0, Math.PI * 2); ctx.stroke();
    // 눈금판 (N)
    const px0 = x + 26;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.16)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rr(px0, SS.c0 - 22, SS.plateW, SS.pxn * 10 + 44, 7); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4; rr(px0, SS.c0 - 22, SS.plateW, SS.pxn * 10 + 44, 7); ctx.stroke();
    for (let n = 0; n <= 10; n++) {
      const y = SS.c0 + n * SS.pxn, major = n % 2 === 0;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = major ? 1.8 : 1.1;
      ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + (major ? 14 : 8), y); ctx.stroke();
      if (major) txt(String(n), px0 + 29, y, { size: 12, color: '#334155', halo: 'rgba(255,255,255,.95)', weight: 700 });
    }
    txt('N', px0 + SS.plateW / 2, SS.c0 - 12, { size: 12.5, color: '#2563eb', halo: false });
    // 바늘이 가리키는 곳
    ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(x + 14, cy); ctx.lineTo(px0 + 4, cy - 3.5); ctx.lineTo(px0 + 4, cy + 3.5); ctx.closePath(); ctx.fill();
    const reading = c.d / SS.pxn;
    if (c.item || reading > 0.15) pill(fm(Math.max(0, reading), 1) + ' N', px0 + SS.plateW + 10, cy, { align: 'left', color: '#0f172a', size: 14 });
  }
  function drawItem3(it) {
    ctx.save(); ctx.translate(it.x, it.y - it.lift * 4); ctx.scale(1 + 0.1 * it.lift, 1 + 0.1 * it.lift);
    const w = it.w, h = it.h, lift = it.lift;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,' + (0.3 + 0.1 * lift).toFixed(2) + ')'; ctx.shadowBlur = 6 + 9 * lift; ctx.shadowOffsetY = 3 + 5 * lift;
    if (it.id === 'obj') {
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, '#9aa7b8'); g.addColorStop(0.35, '#eef2f8'); g.addColorStop(0.7, '#aab6c6'); g.addColorStop(1, '#6f7c90');
      ctx.fillStyle = g; rr(-w / 2, -h / 2 + 4, w, h - 4, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#516076'; ctx.lineWidth = 1.8; rr(-w / 2, -h / 2 + 4, w, h - 4, 7); ctx.stroke();
      ctx.fillStyle = '#b8c3d3'; ctx.beginPath(); ctx.ellipse(0, -h / 2 + 5, w / 2, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -h / 2 - 1, 5.5, Math.PI, 0); ctx.stroke();
      txt('1 kg', 0, 6, { size: 14, color: '#1e293b', halo: 'rgba(255,255,255,.7)' });
    } else {
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, '#c58a12'); g.addColorStop(0.35, '#fde9a1'); g.addColorStop(0.7, '#e0a82a'); g.addColorStop(1, '#9a6a08');
      ctx.fillStyle = g; rr(-w / 2, -h / 2 + 3, w, h - 3, 5); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#7a5200'; ctx.lineWidth = 1.6; rr(-w / 2, -h / 2 + 3, w, h - 3, 5); ctx.stroke();
      ctx.fillStyle = '#e9c460'; ctx.beginPath(); ctx.arc(0, -h / 2 + 3, 4.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      txt(it.label, 0, 4, { size: it.g >= 500 ? 12.5 : 11.5, color: '#4a3000', halo: 'rgba(255,240,180,.8)' });
    }
    ctx.restore();
  }
  function drawBalance(t) {
    const g = balGeo(), cx = g.cx;
    softShadow(cx + 4, BASEY + 6, 66, 9, 0.3 * (1 - BAL.lift / 190));
    if (BAL.fly && !RM) { ctx.save(); ctx.translate(cx, g.base + 3); ctx.scale(1, -1); D.flame(0, 0, 30 + BAL.lift / 5, t, { glow: '#ffb347' }); ctx.restore(); }
    // 받침 + 기둥
    const bg = ctx.createLinearGradient(0, g.base - 16, 0, g.base + 2);
    bg.addColorStop(0, '#a7b3c4'); bg.addColorStop(1, '#55627a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(cx - 56, g.base + 2); ctx.quadraticCurveTo(cx - 52, g.base - 14, cx - 30, g.base - 16); ctx.lineTo(cx + 30, g.base - 16); ctx.quadraticCurveTo(cx + 52, g.base - 14, cx + 56, g.base + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3f4a5e'; ctx.lineWidth = 1.5; ctx.stroke();
    const pg = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
    pg.addColorStop(0, '#7b8798'); pg.addColorStop(0.45, '#f1f5f9'); pg.addColorStop(1, '#6a768a');
    ctx.fillStyle = pg; rr(cx - 6, g.py, 12, g.base - 14 - g.py, 3); ctx.fill();
    // 수평 눈금 (기둥 앞의 작은 판)
    ctx.fillStyle = '#fff'; rr(cx - 17, g.py + 20, 34, 18, 5); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = BAL.levelT > 0.7 ? COL.good : '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, g.py + 22); ctx.lineTo(cx, g.py + 36); ctx.stroke();
    // 끈과 접시
    [['L', g.lx, g.ly, g.pl], ['R', g.rx, g.ry, g.pr]].forEach(([k, ex, ey, pan]) => {
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.beginPath();
      ctx.moveTo(ex, ey); ctx.lineTo(pan.x - 32, pan.y - 3); ctx.moveTo(ex, ey); ctx.lineTo(pan.x + 32, pan.y - 3); ctx.stroke();
      const pgg = ctx.createLinearGradient(0, pan.y - 4, 0, pan.y + 9);
      pgg.addColorStop(0, '#dbe3ee'); pgg.addColorStop(1, '#7f8ca1');
      ctx.fillStyle = pgg; ctx.beginPath(); ctx.ellipse(pan.x, pan.y, 38, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5b6779'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(pan.x - 6, pan.y - 2.5, 22, 3, 0, 0, Math.PI * 2); ctx.fill();
    });
    // 막대
    ctx.save(); ctx.translate(cx, g.py); ctx.rotate(-BAL.ang);
    const bgm = ctx.createLinearGradient(0, -5, 0, 5); bgm.addColorStop(0, '#f1f5f9'); bgm.addColorStop(1, '#7a8799');
    ctx.fillStyle = bgm; rr(-BEAM.L - 7, -4.5, 2 * BEAM.L + 14, 9, 4.5); ctx.fill();
    ctx.strokeStyle = '#4b5565'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; [-BEAM.L, BEAM.L].forEach((x) => { ctx.beginPath(); ctx.arc(x, 0, 4.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.stroke();
    ctx.restore();
    D.sphere(cx, g.py, 8, '#94a3b8', { gloss: true });
    // 각 접시의 질량
    [['L', g.pl], ['R', g.pr]].forEach(([k, pan]) => {
      const m = massOf(BAL[k]);
      if (m > 0) pill(m + ' g', pan.x, pan.y + 24, { color: '#334155', size: 13 });
    });
    if (BAL.levelT > 0.7 && !BAL.fly) pill('수평! ' + massOf(BAL.L) + ' g = ' + massOf(BAL.R) + ' g', cx, g.py - 48, { solid: true, color: COL.good, size: 14.5 });
  }
  function drawSceneW(t) {
    drawWorld(t);
    drawScaleBar(16, 584, 2 * SS.pxn, '2 N', true);
    drawSpringScale('E', t); drawSpringScale('M', t);
    drawBalance(t);
    // 물건 (맨 위: 들고 있는 것)
    const order = ALL3.slice().sort((a, b) => (a.mode === 'drag') - (b.mode === 'drag'));
    order.forEach((it) => {
      if (it.mode === 'home' || it.mode === 'on' || it.mode === 'fly') drawItem3(it);
    });
    order.forEach((it) => { if (it.mode === 'drag') drawItem3(it); });
    // 무게 화살표 (1 kg 추)
    const a = WS.arO;
    if (a.shown && (OBJ.mode === 'on' || OBJ.mode === 'drag' || OBJ.u > 0.3)) {
      const kk = a.k, L = a.dy * kk;
      if (L > 2) {
        const ax = OBJ.x + 34, ay = OBJ.y;
        forceArrow(ax, ay, 0, L, COL.grav, {});
        pill('무게 ' + fm(GRAV[WS.arSide], 1) + ' N', ax + 12, ay + Math.max(20, L * 0.5), { align: 'left', color: COL.grav, size: 14, fit: true });
      }
    }
    // 목표 안내
    const m = game && game.current();
    if (m && game.isActive(m)) {
      if (m.key === 'W1' && OBJ.mode === 'home') D.ring(OBJ.x, OBJ.y, 34, t, { color: '#f59e0b', width: 2.5 });
      if (m.key === 'W1' && OBJ.mode === 'on' && WS.meas.E && !WS.meas.M && whereIsObj() === 'E') D.ring(SSX.M, HOOK0 + 6, 26, t, { color: '#22c55e', width: 2.5 });
      if (m.key === 'W2' && !WS.lvE && !BAL.fly) {
        if (OBJ.mode === 'home') D.ring(OBJ.x, OBJ.y, 34, t, { color: '#f59e0b', width: 2.5 });
        else if (OBJ.mode === 'on' && whereIsObj() === null) { const g = balGeo(); WTS.forEach((w) => { if (w.mode === 'home') D.ring(w.x, w.y, 22, t + w.hx, { color: '#f59e0b', width: 2 }); }); }
      }
    }
    if (isNew('moon')) newTag(MID + 12, 8, 112, 36);
    if (isNew('balance') && BAL.side === 'E' && !BAL.fly) newTag(BAL_X.E - 100, BEAM.py - 34, 200, 150);
  }
  function hitW(p) {
    if (BAL.fly) return null;
    return pickNearest(ALL3.filter((it) => !(it.mode === 'fly' && it.u < 0.9)), p, 6);
  }
  let dragW = null;
  function downW(p) {
    const it = hitW(p);
    if (!it) return false;
    hideHint();
    releaseItem(it);
    it.mode = 'drag'; it.u = 1; it.smooth = 0; it.tgt = null;
    dragW = { it, ox: it.x - p.x, oy: it.y - p.y, sx: p.x, sy: p.y };
    return true;
  }
  function moveW(p) { if (dragW) { dragW.it.x = p.x + dragW.ox; dragW.it.y = p.y + dragW.oy; } }
  function upW(p) {
    const d = dragW; if (!d) return;
    dragW = null;
    const it = d.it, g = balGeo();
    // 용수철저울 (1 kg 추만)
    if (it === OBJ) {
      let best = null, bd = 1e9;
      ['E', 'M'].forEach((s) => { const dx = Math.abs(it.x - SSX[s]), ok = dx < 66 && it.y > SS.top + 120 && it.y < SS.top + SS.len + 330; if (ok && dx < bd) { bd = dx; best = s; } });
      if (best) { hangOnScale(it, best); return; }
    }
    const dl = Math.hypot(it.x - g.pl.x, it.y - (g.pl.y - 20)), dr = Math.hypot(it.x - g.pr.x, it.y - (g.pr.y - 20));
    if (Math.min(dl, dr) < 62 * HIT) { placeOnPan(it, dl <= dr ? 'L' : 'R'); return; }
    sendHome(it);
  }
  function resetW() {
    ALL3.forEach((it) => { it.mode = 'home'; it.x = it.hx; it.y = it.hy; it.u = 1; it.lift = 0; it.smooth = 0; it.tgt = null; it.onArrive = null; });
    ['E', 'M'].forEach((s) => { SC[s].d = 0; SC[s].v = 0; SC[s].item = null; SC[s].cal = 0; });
    BAL.side = 'E'; BAL.x = BAL_X.E; BAL.lift = 0; BAL.fly = null; BAL.ang = 0; BAL.av = 0; BAL.L = []; BAL.R = []; BAL.levelT = 0;
    WS.meas = { E: false, M: false }; WS.val = { E: 0, M: 0 }; WS.lvE = false; WS.lvM = false; WS.massShown = false; WS.arO.jump(0, 0);
    dragW = null;
  }

  /* =========================================================
     장면 전환 · 입력 · 측정값
     ========================================================= */
  let scene = 'G';
  const trans = { t: 1, color: '#0b1230' };
  const SCENE_LABEL = {
    G: '🌍 지구와 사과 <small>(지구를 가로로 자른 모습)</small>',
    S: '🔩 용수철 실험대 <small>(옆에서 본 모습)</small>',
    U: '📦 미지의 상자 <small>(용수철저울의 원리)</small>',
    W: '⚖️ 지구와 달 <small>(질량과 무게)</small>',
  };
  const SCENE_BG = { G: '#0b1230', S: '#eef3fb', U: '#eef3fb', W: '#e9eef7' };
  const LEVEL_SCENE = ['G', 'S', 'W', 'U'];
  const ctrlCard = $('#ctrlCard'), dataCard = $('#dataCard'), seg = $('#sceneSeg'), recBtn = $('#recBtn'), rocketBtn = $('#rocketBtn');
  function setScene(s) {
    const prev = scene;
    scene = s;
    if (s !== prev) {
      trans.t = RM ? 1 : 0; trans.color = SCENE_BG[s];
      if (s === 'U') { SP.mode = 'box'; resetS(); SP.box.val = 3; SP.box.checked = false; $('#wVal').textContent = '3.0 N'; SP.panT = 1; }
      else if (s === 'S') { if (SP.mode !== 'lab' || prev === 'U') { SP.mode = 'lab'; resetS(); } if (game && game.free) SP.panT = 1; }
    }
    view.wrap.style.setProperty('--stage-bg', SCENE_BG[s]);
    $('#sceneLabel').innerHTML = SCENE_LABEL[s];
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === s));
    syncDom(true);
  }
  const ensureScene = (li) => setScene(LEVEL_SCENE[li] || 'G');
  const cache = {};
  function setHid(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.hidden = v; } }
  function setOff(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.classList.toggle('off', v); } }
  function setHtml(el, v, key) { if (cache[key] !== v) { cache[key] = v; el.innerHTML = v; } }
  function syncDom(force) {
    if (force) Object.keys(cache).forEach((k) => delete cache[k]);
    const free = !!(game && game.free);
    const m = game && game.current();
    const mk = m && game.isActive(m) ? m.key : '';
    const showS = scene === 'S' && on('record') && (mk === 'S2' || free);
    const showW = scene === 'W' && (mk === 'W2' || free);
    const showU = scene === 'U' && mk === 'U1';
    setHid(seg, !free, 'seg');
    setHid(ctrlCard, !(showS || showW || showU), 'ctrl');
    setOff($('#ctrlS'), !showS, 'cS'); setOff($('#ctrlW'), !showW, 'cW'); setOff($('#ctrlU'), !showU, 'cU');
    setOff(dataCard, !(scene === 'S' && on('record') && SP.pan > 0.5), 'data');
    const can = canRecord();
    if (recBtn.disabled === can) recBtn.disabled = !can;
    const n = loadN();
    setHtml(recBtn, !n ? '📍 기록하기 <small>(추를 먼저 매달아요)</small>' : SP.settled ? '📍 ' + n + ' N · ' + fm(SP.x / CMPX, 1) + ' cm 기록하기' : '⏳ 멈출 때까지 기다려요…', 'recTxt');
    const rk = !!BAL.fly || (!free && BAL.side === 'E' && !WS.lvE);
    if (rocketBtn.disabled !== rk) rocketBtn.disabled = rk;
    setHtml(rocketBtn, BAL.side === 'E' ? '🚀 저울을 달로 옮기기' : '🌍 지구로 되돌리기', 'rkTxt');
  }

  SciSim.pointer(view, {
    hover(p) {
      if (scene === 'G') return hitG(p) ? 'pointer' : null;
      if (scene === 'S') { const h = hitS(p); return h ? (h.kind === 'end' ? 'ns-resize' : 'grab') : null; }
      if (scene === 'W') return hitW(p) ? 'grab' : null;
      return null;
    },
    down(p) {
      if (scene === 'G') {
        const k = hitG(p);
        if (k) { if (k.st === 'held') dropApple(k); else if (k.st === 'land') { k.st = 'pick'; k.t = 0; k.redrop = true; Sound.tick(); } }
        return false;
      }
      if (scene === 'S') return downS(p);
      if (scene === 'W') return downW(p);
      return false;
    },
    move(p) { if (scene === 'S') moveS(p); else if (scene === 'W') moveW(p); },
    up(p) { if (scene === 'S') upS(p); else if (scene === 'W') upW(p); },
  });
  if (PHONE) {     // 휴대폰: 물건을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      const p = view.toLocal(tc);
      const hit = scene === 'G' ? hitG(p) : scene === 'S' ? hitS(p) : scene === 'W' ? hitW(p) : null;
      if (hit) e.preventDefault();
    }, { passive: false });
  }

  recBtn.addEventListener('click', doRecord);
  rocketBtn.addEventListener('click', () => { Sound.click(); flyBalance(BAL.side === 'E' ? 'M' : 'E'); });
  const stepWt = (d) => {
    SP.box.val = clamp(Math.round((SP.box.val + d) * 2) / 2, 0, 9);
    $('#wVal').textContent = fm(SP.box.val, 1) + ' N';
    Sound.tick();
  };
  $('#wMinus').addEventListener('click', () => stepWt(-0.5));
  $('#wPlus').addEventListener('click', () => stepWt(0.5));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'G') resetG();
    else if (scene === 'S') { SP.hand = null; removeAllWeights(); }
    else if (scene === 'U') { SP.box.checked = false; }
    else resetW();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    const R = (i, label, val) => { setHtml($('#r' + i + 'L'), label, 'r' + i + 'L'); setHtml($('#r' + i + 'V'), val, 'r' + i + 'V'); };
    if (scene === 'G') {
      const last = G.kids.filter((k) => k.done || k.st !== 'held').pop();
      R(1, '① 작용점', last ? '사과 · ' + last.name : '—');
      R(2, '② 힘의 방향', last ? '지구 중심 쪽' : '—');
      R(3, '③ 힘의 크기', last ? '약 2<small>N</small>' : '—');
    } else if (scene === 'S') {
      const n = loadN(), hand = SP.hand || SP.handShow > 0.2;
      R(1, hand ? '① 손의 힘' : '① 추의 무게', hand ? nfmt(Math.abs(SP.x) / NPX) + '<small>N</small>' : n + '<small>N</small>');
      R(2, '② 늘어난 길이', fm(SP.x / CMPX, 1) + '<small>cm</small>');
      R(3, '③ 탄성력', nfmt(Math.abs(SP.x) / NPX) + '<small>N</small>');
    } else if (scene === 'U') {
      R(1, '① 상자가 늘어난 길이', SP.box.in > 0.5 ? fm(SP.x / CMPX, 1) + '<small>cm</small>' : '—');
      R(2, '② 내가 정한 무게', fm(SP.box.val, 1) + '<small>N</small>');
      R(3, '③ 그 무게일 때 늘어날 길이', SP.box.checked ? fm(SP.box.val * 2, 1) + '<small>cm</small>' : '—');
    } else {
      R(1, '질량 (양팔저울)', WS.massShown ? '1000<small>g</small> = 1<small>kg</small>' : '—');
      R(2, '무게 · 지구', WS.meas.E ? fm(WS.val.E, 1) + '<small>N</small>' : '—');
      R(3, '무게 · 달', WS.meas.M ? fm(WS.val.M, 1) + '<small>N</small>' : '—');
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
  const zig = (x, y0, y1, n, a) => {
    let s = 'M' + x + ' ' + y0 + ' L' + x + ' ' + (y0 + 6);
    const h = (y1 - y0 - 12) / n;
    for (let i = 0; i < n; i++) s += ' L' + (x + (i % 2 ? -a : a)) + ' ' + (y0 + 6 + h * (i + 0.5));
    return s + ' L' + x + ' ' + (y1 - 6) + ' L' + x + ' ' + y1;
  };
  const EARTH_DEFS = '<defs><radialGradient id="eg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#86d6ff"/><stop offset=".5" stop-color="#2b95e8"/><stop offset="1" stop-color="#0a3f94"/></radialGradient></defs>';
  const FIG_SOUTH = '<svg viewBox="0 0 320 206" width="320" role="img" aria-label="남극에 서 있는 아이가 사과를 들고 있는 모습" style="max-width:100%" ' + SVGF + '>' + EARTH_DEFS +
    '<rect width="320" height="206" rx="12" fill="#0f1a44"/>' +
    '<circle cx="40" cy="30" r="1.6" fill="#fff"/><circle cx="270" cy="24" r="1.4" fill="#fff"/><circle cx="292" cy="96" r="1.8" fill="#fff"/><circle cx="30" cy="120" r="1.4" fill="#fff"/><circle cx="236" cy="60" r="1.2" fill="#fff"/>' +
    '<circle cx="160" cy="80" r="52" fill="url(#eg)"/>' +
    '<path d="M138 60 q14-12 30-4 q10 10 2 22 q-12 8-26 2 q-10-8-6-20z" fill="#5fbf6a"/><path d="M178 92 q10-4 14 6 q-2 10-12 10 q-6-6-2-16z" fill="#5fbf6a"/>' +
    '<ellipse cx="160" cy="31" rx="22" ry="6" fill="#fff" opacity=".9"/><ellipse cx="160" cy="129" rx="26" ry="6" fill="#fff" opacity=".9"/>' +
    '<text x="160" y="16" text-anchor="middle" font-size="13" font-weight="800" fill="#bfdbfe">북극</text>' +
    '<rect x="152" y="132" width="16" height="26" rx="6" fill="#facc15"/><rect x="153" y="156" width="6" height="16" rx="2" fill="#475569"/><rect x="161" y="156" width="6" height="16" rx="2" fill="#475569"/>' +
    '<circle cx="160" cy="124" r="9" fill="#f6c79f"/><path d="M151 124 a9 9 0 0 1 18 0 q-6 -4 -9 -3 q-4 0 -9 3z" fill="#7c4a2a"/>' +
    '<line x1="168" y1="140" x2="188" y2="150" stroke="#facc15" stroke-width="6" stroke-linecap="round"/><circle cx="192" cy="153" r="4" fill="#f6c79f"/>' +
    '<circle cx="196" cy="164" r="8" fill="#e11d48"/><path d="M196 156 q1-5 4-6" stroke="#7c4a1c" stroke-width="2" fill="none"/>' +
    '<text x="120" y="152" text-anchor="end" font-size="14" font-weight="800" fill="#fde68a">남극</text>' +
    '<text x="236" y="168" font-size="14" font-weight="800" fill="#fff">사과를 놓으면?</text>' +
    '<text x="160" y="198" text-anchor="middle" font-size="12" font-weight="700" fill="#93c5fd">(아이는 지구 바깥쪽을 보고 서 있어요)</text></svg>';
  const SVG_GRAV = '<svg viewBox="0 0 260 214" width="260" role="img" aria-label="어느 곳에서나 중력은 지구 중심을 향한다" style="max-width:100%" ' + SVGF + '>' + EARTH_DEFS +
    '<circle cx="130" cy="108" r="58" fill="url(#eg)"/>' +
    '<path d="M112 80 q16-14 34-4 q10 12 0 24 q-16 8-30 0 q-8-8-4-20z" fill="#5fbf6a"/><path d="M92 128 q10-4 14 6 q-4 10-14 8 q-4-6 0-14z" fill="#5fbf6a"/>' +
    [[130, 30, 130, 62], [195, 108, 163, 108], [130, 186, 130, 154], [65, 108, 97, 108]].map((a) => '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="8" fill="#e11d48"/>' + svgA(a[0] + (a[2] - a[0]) * 0.2, a[1] + (a[3] - a[1]) * 0.2, a[2], a[3], '#e11d48', 5)).join('') +
    '<circle cx="130" cy="108" r="4" fill="#fff" stroke="#e11d48" stroke-width="2"/>' +
    '<text x="130" y="206" text-anchor="middle" font-size="13" font-weight="800" fill="#be123c">중력은 어디서나 지구 중심 쪽</text></svg>';
  const SVG_ELAS = '<svg viewBox="0 0 330 184" width="330" role="img" aria-label="용수철을 늘이거나 누를 때 탄성력의 방향" style="max-width:100%" ' + SVGF + '>' +
    '<rect x="20" y="8" width="110" height="7" rx="3" fill="#94a3b8"/><rect x="200" y="8" width="110" height="7" rx="3" fill="#94a3b8"/>' +
    '<path d="' + zig(75, 15, 118, 9, 15) + '" fill="none" stroke="#64748b" stroke-width="4" stroke-linejoin="round"/><circle cx="75" cy="120" r="5" fill="none" stroke="#334155" stroke-width="3"/>' +
    '<path d="' + zig(255, 15, 62, 9, 15) + '" fill="none" stroke="#64748b" stroke-width="4" stroke-linejoin="round"/><circle cx="255" cy="64" r="5" fill="none" stroke="#334155" stroke-width="3"/>' +
    svgA(106, 120, 106, 162, '#f97316', 6) + svgA(44, 120, 44, 78, '#16a34a', 6) +
    svgA(286, 64, 286, 22, '#f97316', 6) + svgA(224, 64, 224, 106, '#16a34a', 6) +
    '<text x="114" y="148" font-size="12" font-weight="800" fill="#c2410c">손</text><text x="38" y="100" text-anchor="end" font-size="12" font-weight="800" fill="#15803d">탄성력</text>' +
    '<text x="294" y="44" font-size="12" font-weight="800" fill="#c2410c">손</text><text x="218" y="92" text-anchor="end" font-size="12" font-weight="800" fill="#15803d">탄성력</text>' +
    '<text x="75" y="180" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">늘이면 → 탄성력은 위쪽</text><text x="255" y="180" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">누르면 → 탄성력은 아래쪽</text></svg>';
  const FIG_GRAPH = '<svg viewBox="0 0 320 190" width="320" role="img" aria-label="늘어난 길이와 탄성력을 나타낸 그래프: 원점을 지나는 직선" style="max-width:100%" ' + SVGF + '>' +
    '<rect width="320" height="190" rx="12" fill="#f8fafc"/>' +
    '<path d="M50 160 H300 M50 160 V16" stroke="#334155" stroke-width="2.4" fill="none"/>' +
    [1, 2, 3, 4, 5].map((n) => '<line x1="50" y1="' + (160 - n * 26) + '" x2="296" y2="' + (160 - n * 26) + '" stroke="#e2e8f0"/><text x="42" y="' + (164 - n * 26) + '" text-anchor="end" font-size="11" font-weight="700" fill="#475569">' + n + '</text>').join('') +
    [2, 4, 6, 8, 10].map((c) => '<text x="' + (50 + c * 24) + '" y="176" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">' + c + '</text>').join('') +
    '<line x1="50" y1="160" x2="290" y2="30" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>' +
    [1, 2, 3, 4, 5].map((n) => '<circle cx="' + (50 + n * 48) + '" cy="' + (160 - n * 26) + '" r="5.5" fill="#16a34a" stroke="#fff" stroke-width="2"/>').join('') +
    '<text x="296" y="184" text-anchor="end" font-size="11" font-weight="800" fill="#334155">늘어난 길이 (cm)</text><text x="56" y="14" font-size="11" font-weight="800" fill="#334155">탄성력 (N)</text></svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  const mk = (b) => (b ? '✔' : '—');
  const nameChips = () => G.kids.map((k) => (k.done ? '✅ ' : '⬜ ') + k.name).join(' · ');
  const MINI = '<table class="mini-table">';

  game = SciSim.game({
    simId: 'm1-gravity-elastic',
    mount: '#game',
    badge: '중력·탄성력 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      drop: '🍎 사과 떨어뜨리기 (아이를 눌러요)',
      spring: '🔩 용수철 (끝을 잡아 늘이고 누르기)',
      weights: '🟡 1 N 추 (눌러서 매달기)',
      record: '📍 기록 표와 그래프',
      moon: '🌕 달 기지와 용수철저울',
      balance: '⚖️ 양팔저울과 분동',
    },
    onFeatures(set) { feat = set; syncDom(true); },
    onMissionStart(m) {
      ensureScene(m._level);
      hideHint();
    },
    levels: [
      /* ---------------- 1단계: 중력의 방향 ---------------- */
      {
        title: '중력의 방향', short: '중력', icon: '🌍', phase: '관찰',
        features: ['drop'],
        intro: '<p class="si-q">❓ 탐구 질문: 지구 반대편 사람이 사과를 놓으면 사과는 어디로 떨어질까? 무게는 어떻게 잴까?</p>' +
          '<p>지구 둘레에 서 있는 아이들이 사과를 들고 있어요. <b>아이를 눌러</b> 사과를 놓고, 사과가 어느 쪽으로 떨어지는지 살펴봐요. 빨간 화살표는 사과에 작용하는 <b>중력</b>이에요.</p>',
        setup() { ensureScene(0); resetG(); showHint('🍎 아이를 눌러 사과를 놓아 보세요', 6500); },
        recap: '<b>중력</b>은 지구가 물체를 <b>지구 중심</b> 쪽으로 끌어당기는 힘이에요. 지구 어디에서나 중력의 방향은 지구 중심 쪽이에요.',
        summary: '<ul><li><b>중력</b>: 지구가 물체를 <b>지구 중심</b> 쪽으로 끌어당기는 힘</li>' +
          '<li>방향: 어느 곳에서나 <b>지구 중심 쪽</b> (북극, 남극, 우리나라 모두)</li>' +
          '<li>‘아래’는 그림의 아래쪽이 아니라 <b>지구 중심 쪽</b></li></ul><p>' + SVG_GRAV + '</p>',
        missions: [
          {
            key: 'G1',
            title: '4곳에서 사과 떨어뜨리기',
            goal: '<b>북극, 대한민국, 남극, 적도 반대편</b>의 아이를 눌러 사과를 모두 떨어뜨려 보세요.',
            hint: '아이나 사과를 누르면 사과를 놓아요. 아직 안 해 본 곳은 노란 고리로 표시돼요.',
            check: () => G.kids.every((k) => k.done),
            hold: 0.7,
            status: () => '지구 중심 쪽으로 떨어진 곳 <b>' + G.kids.filter((k) => k.done).length + '/4</b><br>' + nameChips(),
            explain: '어느 곳에서 놓아도 사과는 <b>지구 중심</b> 쪽으로 떨어졌어요. 이렇게 지구가 물체를 지구 중심 쪽으로 끌어당기는 힘을 <b>중력</b>이라고 해요. 그림에서 위·아래가 달라 보여도 중력의 방향은 언제나 <b>지구 중심 쪽</b>이에요.',
          },
          {
            type: 'quiz',
            title: '남극의 사과',
            goal: '남극에 선 아이가 사과를 놓으면 사과는 어디로 떨어질까요?',
            figure: FIG_SOUTH,
            choices: ['발밑(지구 중심 쪽)으로 떨어진다', '그림의 아래쪽, 우주 쪽으로 떨어진다', '공중에 떠 있다', '북극 쪽으로 떨어진다'],
            answer: 0,
            feedback: [
              '',
              '‘아래’는 그림의 아래쪽이 아니라 <b>지구 중심 쪽</b>이에요. 방금 4곳에서 사과는 모두 지구 중심 쪽으로 떨어졌어요.',
              '조금 전 4곳에서 사과는 모두 떨어졌어요. 남극이라고 달라지지 않아요.',
              '북극 쪽으로 가려면 지구 한가운데를 지나가야 해요. 사과는 북극이 아니라 <b>지구 중심</b> 쪽으로 끌려가요.',
            ],
            explain: '<b>중력</b>은 지구가 물체를 지구 중심 쪽으로 끌어당기는 힘이에요. 남극에서도 지구 중심 쪽, 곧 발밑으로 떨어져요. 사과는 공기가 눌러서 떨어지는 것이 아니라 <b>중력</b> 때문에 떨어져요(공기가 없는 곳에서도 물체는 떨어져요).',
          },
        ],
      },
      /* ---------------- 2단계: 탄성력 ---------------- */
      {
        title: '용수철의 탄성력', short: '탄성력', icon: '🔩', phase: '실험',
        features: ['spring', 'weights', 'record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구가 사과를 끌어당기는 <b>중력</b>을 화살표로 나타냈어요.</div>' +
          '<p>이번에는 <b>용수철</b>에 생기는 힘을 알아봐요. 용수철을 늘이거나 누르면 <b>원래 모양으로 되돌아가려는 힘</b>, 곧 <b>탄성력</b>이 생겨요. 이 힘은 어느 쪽으로 작용할까요? 늘어난 길이와 어떤 관계일까요?</p>',
        setup() { ensureScene(1); SP.mode = 'lab'; resetS(); SP.rec = {}; SP.pt = {}; SP.lineK = 0; SP.pan = 0; SP.panT = 0; renderTable(); },
        recap: '<b>탄성력</b>은 변형된 물체가 원래 모양으로 되돌아가려는 힘이에요. 방향은 변형된 방향과 <b>반대</b>이고, 용수철에서는 크기가 <b>늘어난 길이에 비례</b>해요.',
        summary: '<ul><li><b>탄성력</b>: 변형된 물체가 원래 모양으로 되돌아가려는 힘</li>' +
          '<li>방향: 변형된 방향과 <b>반대</b></li><li>크기: 변형이 클수록 크다. 용수철에서는 <b>늘어난 길이에 비례</b>(늘어난 길이가 2배 → 탄성력도 2배)</li>' +
          '<li>추가 멈춰 있으면 <b>탄성력 = 추의 무게</b>(힘의 평형)</li></ul><p>' + SVG_ELAS + '</p>' +
          '<p class="note">너무 많이 늘이면 용수철이 원래대로 돌아오지 않아요(탄성 한계). 실험에서는 한계 안에서만 늘여요.</p>',
        missions: [
          {
            key: 'S1',
            title: '탄성력의 방향',
            goal: '용수철 끝을 잡고 <b>3 cm 이상 늘이고</b>, <b>2 cm 이상 눌러</b> 보세요. 초록 화살표가 탄성력이에요.',
            hint: '용수철 끝(고리)을 눌러 아래로 끌면 늘어나고, 위로 밀어 올리면 눌려요. 오른쪽 자의 눈금을 보세요.',
            setup() { SP.panT = 0; SP.maxStretch = 0; SP.maxCompress = 0; removeAllWeights(); showHint('🔩 용수철 끝(고리)을 잡고 아래로 끌어 보세요', 6500); },
            check: () => SP.maxStretch >= 3 && SP.maxCompress >= 2,
            hold: 0.5,
            status: () => '늘이기 3 cm ↑ <b>' + mk(SP.maxStretch >= 3) + '</b> (최대 ' + fm(Math.max(0, SP.maxStretch), 1) + ' cm) · 누르기 2 cm ↑ <b>' + mk(SP.maxCompress >= 2) + '</b> (최대 ' + fm(Math.max(0, SP.maxCompress), 1) + ' cm)',
            explain: '용수철을 <b>늘이면</b> 탄성력은 <b>위쪽</b>으로, <b>누르면</b> 탄성력은 <b>아래쪽</b>으로 생겼어요. 탄성력의 방향은 언제나 변형된 방향과 <b>반대</b>, 곧 <b>원래 모양으로 되돌아가려는 방향</b>이에요.',
          },
          {
            key: 'S2',
            title: '추를 매달아 기록',
            goal: '1 N 추를 <b>1개부터 5개까지</b> 차례로 매달고, 용수철이 멈추면 <b>📍 기록하기</b>를 눌러 <b>서로 다른 5개</b>의 값을 기록하세요.',
            hint: '추를 눌러 용수철에 매달아요. 출렁임이 멈춘 뒤에야 기록 버튼이 켜져요. 추 개수를 바꿔 가며 기록해요.',
            setup() { SP.panT = 1; removeAllWeights(); showHint('🟡 추를 눌러 용수철에 매달아 보세요', 6500); },
            check: () => Object.keys(SP.rec).length >= 5,
            hold: 0.5,
            status: () => '기록 <b>' + Object.keys(SP.rec).length + '/5</b> · 지금 ' + loadN() + ' N' + (loadN() ? (SP.settled ? ' (멈췄어요 → 기록!)' : ' (출렁이는 중…)') : ''),
            explain: '추가 멈춰 있으니 탄성력과 추의 무게(중력)가 <b>힘의 평형</b>(크기가 같고 방향이 반대)을 이뤄요. 그래서 <b>탄성력 = 추의 무게</b>예요. 기록한 값을 그래프에 찍어 보면 점들이 <b>원점을 지나는 한 직선</b> 위에 놓여요.',
          },
          {
            type: 'quiz',
            title: '그래프 해석',
            goal: '표와 그래프를 보고 알 수 있는 것은?',
            figure: FIG_GRAPH,
            choices: ['용수철이 늘어난 길이가 2배가 되면 탄성력도 2배가 된다', '용수철이 늘어날수록 탄성력은 줄어든다', '늘어난 길이와 탄성력은 관계가 없다', '탄성력은 용수철의 전체 길이에 비례한다'],
            answer: 0,
            feedback: [
              '',
              '그래프에서 늘어난 길이가 커질수록 탄성력도 <b>커졌어요</b>.',
              '점들이 원점을 지나는 한 직선 위에 있어요. 두 값은 서로 관계가 있어요.',
              '가로축은 용수철의 ‘전체 길이’가 아니라 <b>늘어난 길이</b>(원래 길이에서 늘어난 만큼)예요.',
            ],
            explain: '용수철은 늘어난 길이가 <b>2배, 3배</b>가 되면 탄성력도 <b>2배, 3배</b>가 돼요. 이렇게 한쪽이 몇 배가 되면 다른 쪽도 같은 배수가 되는 관계를 <b>비례</b>라고 해요. 이 실험에서는 <b>1 N일 때 2 cm</b> 늘어났어요.',
          },
        ],
      },
      /* ---------------- 3단계: 질량과 무게 ---------------- */
      {
        title: '질량과 무게', short: '질량과 무게', icon: '⚖️', phase: '설명',
        features: ['moon', 'balance'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용수철에 매단 추가 멈춰 있으면 <b>탄성력 = 추의 무게</b>라는 것을 알았어요. 이 원리로 만든 도구가 <b>용수철저울</b>이에요.</div>' +
          '<p>같은 추를 <b>지구</b>와 <b>달</b>에서 재어 봐요. <b>무게</b>는 물체에 작용하는 중력의 크기이고 단위는 <b>N(뉴턴)</b>이에요. 초등학교에서는 무게를 kg으로 말했지만, 이제부터는 달라요. 그렇다면 <b>질량</b>(kg, g)은 무엇일까요?</p>',
        setup() { ensureScene(2); resetW(); showHint('🏋️ 1 kg 추를 끌어 용수철저울에 매달아 보세요', 6500); },
        recap: '<b>질량</b>은 물체의 고유한 양(kg, g)으로 장소가 바뀌어도 변하지 않아요. <b>무게</b>는 중력의 크기(N)로 장소에 따라 달라지고, 달에서는 지구의 약 <b>1/6</b>이에요.',
        summary: MINI + '<tr><th></th><th>질량</th><th>무게</th></tr>' +
          '<tr><th>뜻</th><td>물체의 고유한 양</td><td>물체에 작용하는 중력의 크기</td></tr>' +
          '<tr><th>단위</th><td>kg, g</td><td>N (뉴턴)</td></tr>' +
          '<tr><th>장소가 바뀌면</th><td>변하지 않는다</td><td>변한다 (달에서는 지구의 약 1/6)</td></tr>' +
          '<tr><th>측정 도구</th><td>양팔저울</td><td>용수철저울</td></tr></table>' +
          '<p>지구에서 질량이 <b>1 kg</b>인 물체의 무게는 약 <b>9.8 N</b>, 달에서는 약 <b>1.6 N</b>이에요.</p>',
        missions: [
          {
            key: 'W1',
            title: '지구와 달에서 무게 재기',
            goal: '<b>1 kg 추</b>를 끌어서 <b>지구</b>의 용수철저울에, 그다음 <b>달</b>의 용수철저울에 매달아 무게를 재어 보세요.',
            hint: '추를 누른 채 끌어 용수철저울의 고리 아래에서 놓아요. 바늘이 멈추면 값이 기록돼요. 지구 → 달 순서로 해 보세요.',
            check: () => WS.meas.E && WS.meas.M,
            hold: 0.5,
            status: () => '지구 <b>' + (WS.meas.E ? fm(WS.val.E, 1) + ' N ✔' : '—') + '</b> · 달 <b>' + (WS.meas.M ? fm(WS.val.M, 1) + ' N ✔' : '—') + '</b>',
            explain: '같은 1 kg 추라도 <b>지구에서는 9.8 N</b>, <b>달에서는 약 1.6 N</b>이에요. 달의 중력이 지구의 약 <b>1/6</b>이라서 <b>무게</b>(중력의 크기)가 달라진 거예요. 화살표의 길이도 함께 줄어들었어요.',
          },
          {
            key: 'W2',
            title: '질량 재기',
            goal: '지구에서 <b>양팔저울</b>의 왼쪽 접시에 1 kg 추를, 오른쪽 접시에 분동을 올려 <b>수평</b>을 맞추세요. 그다음 <b>🚀 버튼</b>으로 저울을 달로 옮겨도 수평인지 확인해요.',
            hint: '분동 500 g, 200 g, 200 g, 100 g을 모두 올려야 1000 g(= 1 kg)이 돼요.',
            setup() { showHint('⚖️ 1 kg 추와 분동을 접시에 올려 수평을 맞춰 보세요', 6500); },
            check: () => WS.lvE && WS.lvM,
            hold: 0.5,
            status: () => '지구에서 수평 <b>' + mk(WS.lvE) + '</b> · 달에서도 수평 <b>' + mk(WS.lvM) + '</b>' + (WS.lvE && !WS.lvM ? '<br>🚀 버튼으로 저울을 달로 옮겨 보세요.' : ''),
            explain: '양팔저울은 양쪽 접시에 작용하는 중력이 같으므로 <b>물체끼리의 질량</b>을 비교해요. 달로 옮기면 양쪽의 중력이 똑같이 1/6로 줄어서 수평이 그대로예요. 그래서 <b>질량은 장소가 바뀌어도 변하지 않아요</b>(1 kg = 1000 g).',
          },
          {
            type: 'quiz',
            title: '달에 간 우주인',
            goal: '지구에서 <b>질량이 60 kg</b>인 우주인이 달에 가면?',
            choices: ['질량은 60 kg 그대로이고, 무게는 약 1/6로 줄어든다', '질량과 무게가 모두 약 1/6로 줄어든다', '질량은 10 kg이 되고, 무게는 그대로이다', '질량과 무게가 모두 그대로이다'],
            answer: 0,
            feedback: [
              '',
              '질량은 물체의 고유한 양이라서 장소가 바뀌어도 변하지 않아요. 양팔저울이 달에서도 수평이었어요.',
              '달에 가도 몸을 이루는 물질의 양은 그대로이니 질량은 60 kg이에요. 줄어드는 것은 중력의 크기인 <b>무게</b>예요.',
              '달의 중력은 지구의 약 1/6이라서 <b>무게는 변해요</b>. 용수철저울의 눈금이 달에서는 훨씬 작았어요.',
            ],
            explain: '<b>질량</b>은 어디서나 60 kg이에요. 달의 중력은 지구의 약 1/6이므로 <b>무게</b>는 지구에서 약 590 N이던 것이 달에서는 약 1/6인 100 N 정도가 돼요.',
          },
        ],
      },
      /* ---------------- 4단계: 적용 ---------------- */
      {
        title: '생활 속 중력과 탄성력', short: '적용', icon: '🏠', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용수철은 <b>1 N에 2 cm</b>씩 늘어나고(탄성력은 늘어난 길이에 비례), 무게의 단위는 <b>N</b>이라는 것을 배웠어요.</div>' +
          '<p>배운 것을 이용해 <b>용수철저울의 원리</b>를 확인하고, 생활 속 표현과 사례를 과학적으로 살펴봐요.</p>',
        setup() { ensureScene(3); },
        recap: '용수철저울은 <b>탄성력이 늘어난 길이에 비례</b>하는 성질을 이용해 무게를 재요. 몸무게 같은 말은 과학에서는 <b>질량(kg)</b>과 <b>무게(N)</b>로 구별해서 말해요.',
        summary: '<ul><li><b>용수철저울의 원리</b>: 추가 멈춰 있으면 탄성력 = 물체의 무게. 탄성력은 늘어난 길이에 비례하므로 늘어난 길이로 무게를 알 수 있다. (1 N에 2 cm인 용수철에서 7 cm 늘어나면 3.5 N)</li>' +
          '<li>‘몸무게 50 kg’ → 질량 <b>50 kg</b>, 무게 약 <b>490 N</b></li>' +
          '<li>트램펄린·활·장대높이뛰기 → <b>탄성력</b> 이용 / 폭포의 물이 떨어짐 → <b>중력</b></li></ul>' +
          '<p class="note">다음 차시에서는 마찰력과 부력을 용수철저울로 재어 봐요.</p>',
        missions: [
          {
            key: 'U1',
            title: '미지의 물체 무게',
            manual: true,
            goal: '용수철에 <b>상자</b>를 매달았더니 <b>7 cm</b> 늘어났어요. 상자의 <b>무게는 몇 N</b>일까요? − + 버튼으로 값을 정하고 <b>✔ 확인하기</b>를 눌러요.',
            hint: '1 N일 때 2 cm 늘어났어요. 7 cm는 몇 N일 때일까요? 오른쪽 그래프의 직선도 이용해 보세요.',
            check: () => {
              const v = SP.box.val;
              SP.box.checked = true;
              if (Math.abs(v - BOX_N) < 1e-6) return true;
              if (v === 7) return '7은 늘어난 길이(cm)예요. <b>cm와 N을 구별해요</b>: 이 용수철은 1 N에 2 cm 늘어나요.';
              return '내가 정한 ' + fm(v, 1) + ' N이면 ' + fm(v * 2, 1) + ' cm 늘어나요. 그런데 상자는 7 cm 늘어났으니 ' + (v * 2 > 7 ? '더 가벼워요.' : '더 무거워요.') + ' (보라색 점선 바늘과 비교해 보세요)';
            },
            explain: '탄성력은 늘어난 길이에 비례하고 1 N에 2 cm 늘어나므로 7 cm ÷ 2 cm/N = <b>3.5 N</b>이에요. 상자가 멈춰 있으니 <b>탄성력 = 상자의 무게</b>예요. 이것이 <b>용수철저울</b>의 원리예요.',
          },
          {
            type: 'quiz',
            title: '‘몸무게 50 kg’의 과학적 표현',
            goal: '“내 <b>몸무게는 50 kg</b>이야.” 이 말을 과학적으로 바르게 나타낸 것은?',
            choices: ['질량 50 kg (무게는 약 490 N)', '무게 50 kg', '무게 50 N', '질량 490 N'],
            answer: 0,
            feedback: [
              '',
              '무게의 단위는 kg이 아니라 <b>N</b>이에요. kg은 질량의 단위예요.',
              '무게 50 N은 질량이 약 5 kg인 물체의 무게예요. 50 kg인 사람의 무게는 약 490 N이에요.',
              '질량의 단위는 N이 아니라 <b>kg</b>(또는 g)이에요. 490 N은 무게예요.',
            ],
            explain: '‘몸무게 50 kg’은 일상에서 쓰는 표현이에요. 과학에서는 <b>질량이 50 kg</b>이고, 지구에서 <b>무게는 약 490 N</b>(50 × 9.8)이라고 말해요.',
          },
          {
            type: 'quiz',
            title: '탄성력을 이용하지 않은 것',
            goal: '다음 중 <b>탄성력을 이용하지 않은</b> 경우는?',
            choices: ['🤸 트램펄린에서 높이 뛰어오른다', '🏹 활시위를 당겼다 놓아 화살을 쏜다', '🏃 휘어진 장대로 높이 뛰어넘는다', '💧 폭포의 물이 아래로 떨어진다'],
            answer: 3,
            feedback: [
              '트램펄린은 눌렸다가 원래대로 돌아가려는 <b>탄성력</b>으로 나를 밀어 올려요.',
              '당겨진 활이 원래 모양으로 돌아가려는 <b>탄성력</b>으로 화살이 날아가요.',
              '휘어진 장대가 곧게 펴지려는 <b>탄성력</b>으로 몸을 밀어 올려요.',
              '',
            ],
            explain: '트램펄린·활·장대는 모두 변형된 물체가 되돌아가려는 <b>탄성력</b>을 이용해요. 폭포의 물은 지구가 끌어당기는 <b>중력</b>(지구 중심 쪽) 때문에 떨어져요.',
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
        if (m.key === 'G1') celebrate(GL.cx, GL.cy, 96);
        else if (m.key === 'S1') celebrate(AXS + labX(), YZ + SP.x, 50);
        else if (m.key === 'S2') celebrate(GRP.x + 200, GRP.y + 150, 54);
        else if (m.key === 'U1') celebrate(AXS + labX(), YZ + SP.x + 30, 50);
      }
    }
    lastPhase = ph; lastIdx = i;
  }

  /* ---------- 시작 ---------- */
  renderTable();
  syncDom(true);
  let freeSwitched = false;
  SciSim.loop((dt, t) => {
    if (game.free && scene === 'U' && !freeSwitched) { freeSwitched = true; setScene('S'); SP.panT = 1; }
    if (!game.free) freeSwitched = false;
    if (scene === 'G') stepG(dt); else if (scene === 'W') stepW(dt); else stepS(dt);
    view.clear(SCENE_BG[scene]);
    if (scene === 'G') drawSceneG(t); else if (scene === 'W') drawSceneW(t); else drawSceneS(t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.45);
      ctx.fillStyle = rgba(trans.color.length === 7 ? trans.color : '#eef3fb', 1 - EASE.outCubic(trans.t));
      ctx.fillRect(0, 0, W, H);
    }
    watchSuccess();
    syncDom();
    updateReadouts(t);
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, G, SP, SC, BAL, WS, OBJ, WTS, get game() { return game; }, W, H, GL, KIDS,
    setScene, applePos, toWorld, dropApple, hitS, hitW, hitG, labX, loadN, attachItem, doRecord, flyBalance,
    hangOnScale, placeOnPan, balGeo, YZ, AXS, TRAY, SSX, SS, hookY, CMPX, NPX, BOX_N, canRecord,
  };
})();
