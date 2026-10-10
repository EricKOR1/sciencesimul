/* =========================================================
   중1 Ⅴ. 힘의 작용 — 힘의 평형과 장치 설계 [9과05-04]
   ① [관찰] 책상 위의 책   책상을 치우면? 책을 쌓으면? → 바닥이 떠받치는 힘, 중력과 크기가 같아 평형
   ② [탐구] 여러 사례에서 평형 찾기  힘 칩을 끌어다 물체에 놓고 크기를 정해 힘 그림 만들기 (탄성력·부력·마찰력)
   ③ [설명] 힘의 평형 관계        짐을 실은 배(중력↑ → 부력↑), 밀어도 정지한 상자(미는 힘↑ → 마찰력↑)
   ④ [적용] 힘을 이용한 장치 설계 용수철저울 · 구조용 부표 · 눈길 미끄럼 방지 바퀴를 설계하고 시험
   범위: 수직항력이라는 용어, 빗면에서 힘의 분해, 작용 반작용, 밀도는 다루지 않음.
   설계 판정은 2~3차시에서 측정한 규칙만 사용 (탄성력 ∝ 늘어난 길이, 부력은 잠긴 부피에 따라 커짐, 마찰력은 거칠수록 큼)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const EASE = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const { rgba, shade, mix } = SciSim.color;

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
  const approach = SciSim.approach;
  const TAU = Math.PI * 2;
  const Spring = SciSim.Spring;

  // 힘 화살표 색 (Ⅴ단원 공통): 떠받치는 힘 #0d9488, 중력 #e11d48, 탄성력 #16a34a, 부력 #0284c7, 마찰력 #b45309, 미는 힘 #f97316, 알짜힘 #7c3aed
  const COL = { push: '#f97316', hand: '#f97316', net: '#7c3aed', grav: '#e11d48', elas: '#16a34a', buoy: '#0284c7', fric: '#b45309', supp: '#0d9488', motion: '#64748b', ink: '#1b2333', muted: '#5d6879', good: '#16a34a', warn: '#dc2626' };
  const mk = (b) => (b ? '✅' : '⬜');
  const chip = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;


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
    if (o.fit) { x0 = clamp(x0, 6, W - w - 6); y = clamp(y, h / 2 + 4, H - h / 2 - 4); }
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
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
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
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU);
    ctx.fillStyle = shade(color, -0.35); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }
  function hollowArrow(x, y, dx, dy, o) {
    o = o || {};
    if (Math.hypot(dx, dy) < 3) return;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    arrowPath(x, y, dx, dy, o.width || 15, o.head || 22);
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = COL.motion; ctx.stroke();
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
    get len() { return Math.hypot(this.dx, this.dy) * this.k; }
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

  function ropeLine(x1, y1, x2, y2, alpha, wid) {
    ctx.save(); ctx.lineCap = 'round';
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = wid || 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = (wid || 5) * 0.4; ctx.stroke();
    ctx.restore();
  }
  /* ---------- 효과: 성공(링 파동 + 반짝이), 결과 배지, NEW 표시 ---------- */
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

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }



  /* =========================================================
     장면 ① 책상 위의 책 (옆에서 본 모습)
     ========================================================= */
  const DKY = 296;                         // 책상 윗면의 높이
  const FLY = 438;                         // 바닥의 높이
  const BH = PHONE ? 28 : 33, BW = PHONE ? 150 : 196;   // 책 한 권의 두께 · 폭
  const SX = Math.round(W * (PHONE ? 0.34 : 0.37));   // 책 더미 가운데 x
  const NB = PHONE ? 6.5 : 8;              // 힘 화살표: 1 N = 8 px
  const BOOKW = 5;                         // 책 한 권의 무게 5 N
  const GPX = 700;                         // 낙하 가속(시각용, px/s²)
  const BCOL = [['#60a5fa', '#1d4ed8'], ['#fb7185', '#be123c'], ['#4ade80', '#15803d']];
  const DK = {
    books: [{ y: 0, vy: 0, a: 1, landed: true, leave: false, pop: 1 }],
    tab: 1, mode: 'on', t: 0, off: 0, vy: 0, bounced: false,
    comp: new Spring(1 / 3, { stiffness: 230, damping: 9 }),
    sq: new Spring(0, { stiffness: 380, damping: 15 }),
    ghosts: [], gclk: 0, removedOnce: false, restoredOnce: false, lens: 1,
    aG: new AArrow(), aS: new AArrow(), aN: new AArrow(),
  };
  DK.comp.value = 1 / 3;
  const landedN = () => DK.books.filter((b) => b.landed && !b.leave).length;
  const dkW = () => landedN() * BOOKW;
  const dkSupport = () => Math.max(0, DK.comp.value) * 15;               // 바닥(책상)이 떠받치는 힘 (N)
  const dkSettled = () => Math.abs(DK.comp.value - DK.comp.target) < 0.012 && Math.abs(DK.comp.velocity) < 0.08 && DK.books.every((b) => b.landed || b.leave);
  function deskReset(n) {
    DK.books = []; for (let i = 0; i < n; i++) DK.books.push({ y: 0, vy: 0, a: 1, landed: true, leave: false, pop: 1 });
    DK.tab = 1; DK.mode = 'on'; DK.t = 0; DK.off = 0; DK.vy = 0; DK.bounced = false; DK.ghosts = []; DK.lens = 1;
    DK.comp.value = n / 3; DK.comp.target = n / 3; DK.comp.velocity = 0; DK.sq.value = 0; DK.sq.velocity = 0;
    DK.aG.jump(0, 0); DK.aS.jump(0, 0); DK.aN.jump(0, 0);
    syncDesk();
  }
  function deskToggle() {
    if (DK.mode === 'on') {
      DK.mode = 'falling'; DK.t = 0; DK.vy = 0; DK.off = 0; DK.removedOnce = true; DK.bounced = false; DK.gclk = 0; DK.ghosts = [];
      DK.books.forEach((b) => { if (!b.landed) { b.landed = true; b.y = 0; } });
    } else if (DK.mode === 'falling' || DK.mode === 'landed') {
      DK.mode = 'restoring'; DK.t = 0;
    }
    Sound.click(); syncDesk();
  }
  function bookAdd() {
    if (DK.mode !== 'on' && DK.mode !== 'landed') return;
    if (DK.books.filter((b) => !b.leave).length >= 3) return;
    DK.books.push({ y: -190, vy: 0, a: 1, landed: false, leave: false, pop: 1 });
    Sound.click(); syncDesk();
  }
  function bookSub() {
    if (DK.mode !== 'on' && DK.mode !== 'landed') return;
    const live = DK.books.filter((b) => !b.leave);
    if (live.length <= 1) return;
    live[live.length - 1].leave = true;
    Sound.click(); syncDesk();
  }
  function dust(x, y, n) {
    if (RM) return;
    for (let i = 0; i < n; i++) FX.emit({ x: x + (Math.random() - 0.5) * 120, y: y - 2, vx: (Math.random() - 0.5) * 120, vy: -20 - Math.random() * 40, life: 0.6, size: 6 + Math.random() * 5, color: 'rgba(160,140,120,.5)', gravity: 0, drag: 2, shape: 'smoke' });
  }
  function stepDesk(dt) {
    const k = DK;
    k.t += dt;
    const live = k.books.filter((b) => !b.leave).length;
    // 책상이 나타나고 사라져요
    const tabT = (k.mode === 'on' || (k.mode === 'restoring' && k.t > 0.1)) ? 1 : 0;
    k.tab = approach(k.tab, tabT, dt, 9);
    if (Math.abs(k.tab - tabT) < 0.003) k.tab = tabT;
    // 떨어지는 책 더미
    if (k.mode === 'falling') {
      if (k.t > 0.12) {
        k.vy += GPX * dt; k.off += k.vy * dt;
        k.gclk += dt; if (k.gclk >= 0.075) { k.gclk = 0; k.ghosts.push({ off: k.off, age: 0 }); }
        if (k.off >= FLY - DKY) {
          k.off = FLY - DKY;
          if (!k.bounced && k.vy > 160) { k.vy = -k.vy * 0.2; k.bounced = true; }
          else { k.vy = 0; k.mode = 'landed'; }
          k.sq.velocity -= 5; k.comp.velocity += 4;
          dust(SX, FLY, 7); Sound.tick();
        }
      }
    } else if (k.mode === 'landed') {
      // (바닥에 놓인 책은 바닥이 떠받쳐요)
    } else if (k.mode === 'restoring') {
      const out = k.t < 0.3;
      k.books.forEach((b) => { b.a = approach(b.a, out ? 0 : 1, dt, 14); });
      if (k.t >= 0.3 && k.off !== 0) { k.off = 0; k.vy = 0; k.ghosts = []; k.books.forEach((b) => { b.pop = 0; b.y = 0; b.landed = true; b.leave = false; }); }
      if (k.t >= 0.55) { k.mode = 'on'; if (k.removedOnce) k.restoredOnce = true; k.comp.velocity += 1.5; syncDesk(); }
    }
    // 새로 올리는 책 / 내리는 책
    k.books.forEach((b) => {
      if (!b.landed && !b.leave) {
        b.vy += GPX * dt; b.y += b.vy * dt;
        if (b.y >= 0) { b.y = 0; b.landed = true; b.vy = 0; k.comp.velocity += 2.6; k.sq.velocity -= 2.5; dust(SX, k.mode === 'on' ? DKY - 6 : FLY - 6, 4); Sound.tick(); syncDesk(); }
      }
      if (b.leave) { b.y -= 90 * dt; b.a = Math.max(0, b.a - dt * 3.2); }
      if (b.pop < 1) b.pop = Math.min(1, b.pop + dt / 0.35);
    });
    k.books = k.books.filter((b) => !(b.leave && b.a <= 0));
    for (let i = k.ghosts.length - 1; i >= 0; i--) { k.ghosts[i].age += dt; if (k.ghosts[i].age > 1.4) k.ghosts.splice(i, 1); }
    // 책상(또는 바닥)이 눌리는 정도 = 떠받치는 힘
    const n = landedN();
    k.comp.target = (k.mode === 'on' || k.mode === 'landed') ? n / 3 : 0;
    if (k.mode === 'restoring' && k.t < 0.55) k.comp.target = 0;
    k.comp.update(dt); k.sq.update(dt);
    k.lens = approach(k.lens, (k.mode === 'on' || k.mode === 'landed') ? 1 : 0, dt, 10);
    // 화살표
    const W_ = dkW(), S_ = dkSupport(), vis = n > 0 && k.mode !== 'restoring';
    k.aG.set(0, vis ? W_ * NB : 0);
    k.aS.set(0, vis && S_ > 0.5 ? -S_ * NB : 0);
    k.aN.set(0, k.mode === 'falling' && k.t > 0.12 ? W_ * NB : 0);
    k.aG.update(dt); k.aS.update(dt); k.aN.update(dt);
  }
  function drawRoom() {
    const g = ctx.createLinearGradient(0, 0, 0, FLY);
    g.addColorStop(0, '#fff6e9'); g.addColorStop(1, '#ffe6c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLY);
    // 창문
    ctx.save();
    const wx = PHONE ? 18 : 32, wy = 34, ww = PHONE ? 70 : 96, wh = 96;
    ctx.fillStyle = '#d6ecff'; rr(wx, wy, ww, wh, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(wx + 8, wy + 8); ctx.lineTo(wx + 30, wy + 8); ctx.lineTo(wx + 8, wy + 56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; rr(wx, wy, ww, wh, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    ctx.restore();
    // 바닥
    const fg = ctx.createLinearGradient(0, FLY, 0, H);
    fg.addColorStop(0, '#d9a45f'); fg.addColorStop(1, '#b97f3d');
    ctx.fillStyle = fg; ctx.fillRect(0, FLY, W, H - FLY);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, FLY, W, 3);
    ctx.fillStyle = '#f5dfc0'; ctx.fillRect(0, FLY - 10, W, 10);
    ctx.strokeStyle = 'rgba(110,64,24,.28)'; ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) { const y = FLY + i * 20 + i * i * 1.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function drawDeskTable(a) {
    if (a <= 0.01) return;
    const tw = PHONE ? 330 : 430, x0 = SX - tw / 2, x1 = SX + tw / 2;
    ctx.save();
    ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 46);
    softShadow(SX, FLY + 6, tw * 0.5, 10, 0.2);
    // 다리
    const lg = ctx.createLinearGradient(0, DKY, 0, FLY);
    lg.addColorStop(0, '#b9803e'); lg.addColorStop(1, '#8a5a26');
    ctx.fillStyle = lg;
    rr(x0 + 22, DKY + 14, 22, FLY - DKY - 14, 4); ctx.fill();
    rr(x1 - 44, DKY + 14, 22, FLY - DKY - 14, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x0 + 40, DKY + 14, 4, FLY - DKY - 14); ctx.fillRect(x1 - 26, DKY + 14, 4, FLY - DKY - 14);
    // 상판
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    const tg = ctx.createLinearGradient(0, DKY, 0, DKY + 26);
    tg.addColorStop(0, '#e9b872'); tg.addColorStop(0.35, '#d99a52'); tg.addColorStop(1, '#a96f33');
    ctx.fillStyle = tg; rr(x0, DKY, tw, 26, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(120,72,30,.35)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0 + 14 + i * 30, DKY + 8 + (i % 2) * 6); ctx.lineTo(x1 - 20 - i * 24, DKY + 8 + (i % 2) * 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(x0 + 6, DKY + 2, tw - 12, 4, 2); ctx.fill();
    ctx.restore();
  }
  function drawBook(cx, top, w, h, ci, alpha, sc) {
    const c = BCOL[ci % 3];
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (sc != null && sc !== 1) { ctx.translate(cx, top + h / 2); ctx.scale(sc, sc); ctx.translate(-cx, -(top + h / 2)); }
    const x0 = cx - w / 2;
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    ctx.fillStyle = g; rr(x0, top, w, h, 5); ctx.fill(); ctx.restore();
    // 쪽 (페이지)
    ctx.fillStyle = '#fff8e8'; rr(x0 + 12, top + 5, w - 15, h - 10, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(160,130,90,.45)'; ctx.lineWidth = 1;
    for (let y = top + 9; y < top + h - 7; y += 3.2) { ctx.beginPath(); ctx.moveTo(x0 + 14, y); ctx.lineTo(x0 + w - 5, y); ctx.stroke(); }
    // 책등과 반짝임
    ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(x0, top, 11, h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(x0 + 3, top + 2, w - 6, 2.5, 1.2); ctx.fill();
    ctx.restore();
  }
  function drawStack(offY, alpha, sc) {
    const live = DK.books.filter((b) => !b.leave || b.a > 0), sq = DK.sq.value, by = DKY + offY;
    ctx.save();
    ctx.translate(SX, by); ctx.scale(1 + 0.03 * sq, 1 - 0.05 * sq); ctx.translate(-SX, -by);
    live.forEach((b) => {
      const slot = DK.books.indexOf(b);
      const top = by - (slot + 1) * BH + b.y;
      drawBook(SX, top, BW, BH, slot, b.a * alpha, (sc == null ? 1 : sc) * EASE.outBack(clamp(b.pop, 0, 1)));
    });
    ctx.restore();
  }
  /* 책상 표면(또는 바닥)을 확대한 모형: 작은 용수철이 늘어선 모습 */
  function drawLens(cx, cy, r, comp, a) {
    if (a <= 0.01) return;
    const surface = DK.mode === 'landed' ? '바닥' : '책상';
    ctx.save();
    ctx.globalAlpha *= a;
    const cpx = SX + (PHONE ? 38 : 56), cpy = (DK.mode === 'landed' ? FLY : DKY);
    // 안내선
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(71,85,105,.55)'; ctx.lineWidth = 2;
    const ang = Math.atan2(cpy - cy, cpx - cx);
    [-0.5, 0.5].forEach((d) => { ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang + d) * r, cy + Math.sin(ang + d) * r); ctx.lineTo(cpx, cpy); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cpx, cpy, 11, 0, TAU); ctx.stroke();
    // 유리
    ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, TAU); ctx.clip();
    const bg = ctx.createLinearGradient(0, cy - r, 0, cy + r); bg.addColorStop(0, '#eef6ff'); bg.addColorStop(1, '#dbeafe');
    ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    // 확대 모형: 책 바닥면 / 작은 용수철 / 책상 속
    const baseY = cy + r * 0.52, free = r * 0.62, minH = r * 0.3;
    const c = clamp(comp, 0, 1.25), hh = free - (free - minH) * Math.min(c, 1.25);
    const topY = baseY - hh;
    const n = 5, left = cx - r * 0.78, right = cx + r * 0.78, step = (right - left) / n;
    ctx.fillStyle = '#c28a4a'; ctx.fillRect(cx - r, baseY, 2 * r, r);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - r, baseY, 2 * r, 4);
    for (let i = 0; i < n; i++) {
      const sx = left + step * (i + 0.5);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, baseY);
      const zig = 7;
      for (let j = 0; j < zig; j++) ctx.lineTo(sx + (j % 2 ? -9 : 9), baseY - hh * (j + 0.5) / zig);
      ctx.lineTo(sx, topY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sx - 1, baseY - 2); for (let j = 0; j < zig; j++) ctx.lineTo(sx + (j % 2 ? -9 : 9) - 1.5, baseY - hh * (j + 0.5) / zig - 1); ctx.stroke();
    }
    const lc = BCOL[0];
    const bgd = ctx.createLinearGradient(0, topY - 22, 0, topY); bgd.addColorStop(0, lc[0]); bgd.addColorStop(1, lc[1]);
    ctx.fillStyle = bgd; rr(cx - r * 0.9, topY - 22, r * 1.8, 22, 6); ctx.fill();
    txt('책', cx, topY - 11, { size: 12, color: '#fff', halo: false });
    // 눌린 정도 표시선
    ctx.strokeStyle = 'rgba(13,148,136,.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx - r + 6, baseY - free); ctx.lineTo(cx + r - 6, baseY - free); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 렌즈 테두리와 손잡이
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 6, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#78716c'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(cx + r * 0.72, cy + r * 0.72); ctx.lineTo(cx + r * 1.12, cy + r * 1.12); ctx.stroke();
    ctx.restore();
    pill('🔍 ' + surface + ' 표면을 확대한 모형', cx, cy - r - 16, { color: '#0f766e', size: 13, fit: true, alpha: a });
    pill('실제로는 아주 조금만 눌려요', cx, cy + r + 22, { color: '#64748b', size: 12.5, fit: true, alpha: a });
  }
  function drawDesk(dt, t) {
    drawRoom();
    const k = DK;
    drawDeskTable(k.tab);
    // 떨어지는 동안의 잔상 (다중 섬광)
    const rows = k.books.filter((b) => !b.leave).length;
    k.ghosts.forEach((g) => {
      const al = 0.34 * (1 - g.age / 1.4);
      ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,' + al.toFixed(3) + ')'; ctx.fillStyle = 'rgba(100,116,139,' + (al * 0.4).toFixed(3) + ')'; ctx.lineWidth = 2;
      rr(SX - BW / 2, DKY + g.off - rows * BH, BW, rows * BH, 5); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    drawStack(k.off, 1, 1);
    const n = landedN(), W_ = dkW(), S_ = dkSupport();
    const center = DKY + k.off - n * BH / 2, bottom = DKY + k.off;
    const gx = SX - 20, sx = SX + 20;
    // 중력(↓)과 떠받치는 힘(↑)
    if (k.aG.shown && k.aG.len > 2) {
      forceArrow(gx, center, 0, k.aG.dy * k.aG.k, COL.grav, { width: 7, head: 17 });
    }
    if (k.aS.shown && k.aS.len > 2) {
      forceArrow(sx, bottom, 0, k.aS.dy * k.aS.k, COL.supp, { width: 7, head: 17 });
    }
    if (n > 0 && k.mode !== 'restoring') {
      const gl = k.aG.len, sl = k.aS.len;
      pill('중력 ' + W_ + ' N', gx - 6, Math.min(H - 24, center + gl + 22), { color: COL.grav, size: 13.5, align: 'right', fit: true });
      if (k.aS.shown && sl > 6) pill('떠받치는 힘 ' + Math.round(S_) + ' N', sx + 6, Math.max(26, bottom - sl - 22), { color: COL.supp, size: 13.5, align: 'left', fit: true });
    }
    // 알짜힘: 책상이 없을 때는 중력만 남아요
    if (k.aN.shown && k.aN.len > 2) {
      const x = SX - BW / 2 - 40;
      forceArrow(x, center, 0, k.aN.dy * k.aN.k, COL.net, { width: 9, head: 20, glow: true });
      pill('알짜힘 ' + W_ + ' N ↓', x - 8, center + k.aN.len + 22, { solid: true, color: COL.net, size: 13.5, align: 'right', fit: true });
    } else if (n > 0 && (k.mode === 'on' || k.mode === 'landed') && dkSettled()) {
      pill('알짜힘 0 N  →  평형', SX + (PHONE ? 20 : 60), PHONE ? 60 : 64, { color: COL.good, size: 14, fit: true });
    }
    // 확대 모형
    if (on('zoom')) {
      const lr = PHONE ? 74 : 98, lx = W - lr - (PHONE ? 22 : 48), ly = 40 + lr + 24;
      drawLens(lx, ly, lr, k.comp.value, k.lens);
      if (isNew('zoom') && k.lens > 0.5) newTag(lx - lr, ly - lr, lr * 2, lr * 2);
    }
    if (isNew('table') && k.mode === 'on') pill('NEW', SX + 150, DKY + 12, { solid: true, color: '#f97316', size: 12 });
  }



  /* =========================================================
     장면 ② 힘 그림 그리기: 정지한 물체에 작용하는 힘 칩을 끌어다 놓고 크기를 정해요
     ========================================================= */
  const FTYPES = [
    { id: 'grav', name: '중력', col: COL.grav },
    { id: 'elas', name: '탄성력', col: COL.elas },
    { id: 'buoy', name: '부력', col: COL.buoy },
    { id: 'fric', name: '마찰력', col: COL.fric },
    { id: 'supp', name: '떠받치는 힘', col: COL.supp },
    { id: 'push', name: '미는 힘', col: COL.push },
  ];
  const FT = {}; FTYPES.forEach((f) => { FT[f.id] = f; });
  const OX = Math.round(W * (PHONE ? 0.3 : 0.33));
  const CASES = {
    A: { name: '용수철에 매달린 추', label: '🔩 용수철에 매달린 추', given: { grav: 5 }, need: 'elas', needN: 5, snap: 1, max: 10, px: PHONE ? 18 : 22, axis: 'y' },
    B: { name: '물에 떠 있는 오리 튜브', label: '🦆 물에 떠 있는 오리 튜브', given: { grav: 3 }, need: 'buoy', needN: 3, snap: 1, max: 8, px: PHONE ? 24 : 30, axis: 'y' },
    C: { name: '밀어도 정지한 상자', label: '📦 밀어도 정지한 상자', given: { push: 20 }, need: 'fric', needN: 20, snap: 5, max: 40, px: PHONE ? 4 : 5.5, axis: 'x' },
  };
  const GEO = {
    A: { grav: { x: OX, y: 268, d: [0, 1] }, elas: { x: OX + 24, y: 234, d: [0, -1] } },
    B: { grav: { x: OX - 24, y: 322, d: [0, 1] }, buoy: { x: OX + 24, y: 354, d: [0, -1] } },
    C: { push: { x: OX - 54, y: 318, d: [1, 0] }, fric: { x: OX, y: 354, d: [-1, 0] } },
  };
  const NOPE = {
    A: { grav: '중력은 이미 그려져 있어요.', buoy: '추는 물속에 있지 않아요. 부력은 없어요.', fric: '추가 닿아서 미끄러지는 바닥이 없어요.', supp: '바닥이 추를 받치고 있지 않아요. 추는 용수철에 매달려 있어요.', push: '추를 손으로 미는 사람은 없어요.' },
    B: { grav: '중력은 이미 그려져 있어요.', elas: '늘어난 용수철이 없어요.', fric: '수평으로 움직이려는 힘이 없어요.', supp: '바닥이 아니라 물이 받치고 있어요. 물이 위로 미는 힘은 무엇일까요?', push: '튜브를 손으로 미는 사람은 없어요.' },
    C: { grav: '이번에는 수평 방향의 힘만 생각해요. (위아래 힘은 이미 서로 비겨요)', supp: '이번에는 수평 방향의 힘만 생각해요. (위아래 힘은 이미 서로 비겨요)', elas: '늘어난 용수철이 없어요.', buoy: '상자는 물속에 있지 않아요.', push: '미는 힘은 이미 20 N으로 그려져 있어요.' },
  };
  const STX = PHONE ? 176 : OX + 190, STY = PHONE ? 470 : 124;       // 평형·미리보기 안내 pill 자리
  const FB = {
    case: 'A', v: {}, a: {}, drag: null, handle: null, glow: 0, ghost: null, net: new AArrow(), msg: null, shake: {}, okOnce: false, checked: 0,
    chipPos: {}, quiz: 0,
  };
  FTYPES.forEach((f) => { FB.a[f.id] = new AArrow(); });
  const PAL = PHONE ? { x: W - 258, y: 78, cw: 120, ch: 40, cols: 2, gx: 6, gy: 8 } : { x: W - 206, y: 88, cw: 188, ch: 44, cols: 1, gx: 0, gy: 9 };
  const palPos = (i) => ({ x: PAL.x + (i % PAL.cols) * (PAL.cw + PAL.gx), y: PAL.y + Math.floor(i / PAL.cols) * (PAL.ch + PAL.gy), w: PAL.cw, h: PAL.ch });
  FTYPES.forEach((f, i) => { const p = palPos(i); FB.chipPos[f.id] = { x: p.x, y: p.y, hx: p.x, hy: p.y, lift: 0 }; });
  const fbCase = () => CASES[FB.case];
  const fbVec = (id, n) => { const g = GEO[FB.case][id], c = fbCase(); return [g.d[0] * n * c.px, g.d[1] * n * c.px]; };
  function fbReset(id, keep) {
    FB.case = id || FB.case; FB.v = {}; FB.glow = 0; FB.ghost = null; FB.msg = null; FB.drag = null; FB.handle = null; FB.okOnce = false; FB.quiz = 0;
    const c = fbCase();
    FTYPES.forEach((f) => { FB.a[f.id].jump(0, 0); });
    FB.net.jump(0, 0);
    Object.keys(c.given).forEach((id2) => { const v = fbVec(id2, c.given[id2]); FB.a[id2].set(v[0], v[1]); });
    $$('#fbCases .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.case === FB.case));
  }
  /* 3단계 퀴즈 장면: 상자를 30 N으로 밀어요. 마찰력은 ? (정답을 맞히면 화살표가 나타나요) */
  function fbQuiz(n) {
    fbReset('C'); FB.quiz = n; FB.v = {};
    const v = fbVec('push', n); FB.a.push.set(v[0], v[1]);
    if (typeof syncScene === 'function') syncScene();
  }
  function fbQuizReveal() {
    if (!FB.quiz) return;
    FB.v.fric = FB.quiz; const v = fbVec('fric', FB.quiz); FB.a.fric.set(v[0], v[1]); FB.glow = 1; FB.okOnce = true;
  }
  function fbPlaced(id) { return FB.v[id] != null || fbCase().given[id] != null; }
  const fbTotal = (id) => (fbCase().given[id] != null ? fbCase().given[id] : FB.v[id]);
  function fbNetN() {                                  // 알짜힘 (N): 양수 = 중력/미는 힘 방향(아래 또는 오른쪽)
    const c = fbCase(), have = FB.v[c.need] == null ? 0 : FB.v[c.need];
    const g = c.given[Object.keys(c.given)[0]];
    return g - have;
  }
  /* 판정: 부수 효과 없음 (엔진이 계속 다시 부르기 때문) */
  function fbJudge() {
    const c = fbCase();
    if (FB.v[c.need] == null) return { ok: false, net: fbNetN(), msg: '아직 빠진 힘이 있어요. 힘 칩에서 알맞은 힘을 끌어다 물체 위에 놓아 보세요.' };
    const net = fbNetN();
    if (net === 0) return { ok: true, net: 0 };
    const dirWord = c.axis === 'y' ? (net > 0 ? '아래쪽' : '위쪽') : (net > 0 ? '오른쪽' : '왼쪽');
    const who = FT[c.need].name;
    const more = net > 0 ? '더 크게' : '더 작게';
    return { ok: false, net, msg: '알짜힘이 0이 아니라서 물체가 ' + dirWord + '으로 움직여요. ' + who + ' 화살표를 ' + more + ' 맞춰 보세요.' };
  }
  function fbVerdictFx(r) {
    const c = fbCase();
    FB.checked++;
    if (r.ok) {
      FB.glow = 1; FB.okOnce = true; FB.ghost = null;
      const o = fbObjCenter(); celebrate(o.x, o.y, 54);
    } else if (FB.v[c.need] != null) {
      FB.ghost = { t: 0, net: r.net };
      Sound.fail();
    } else Sound.fail();
  }
  function fbObjCenter() { const o = { A: [OX, 268], B: [OX, 322], C: [OX, 318] }[FB.case]; return { x: o[0], y: o[1] }; }
  const fbClear = () => {
    const c = fbCase();
    FB.v = {}; FB.glow = 0; FB.ghost = null; FB.okOnce = false;
    FTYPES.forEach((f) => { if (c.given[f.id] == null) FB.a[f.id].set(0, 0); });
    Sound.click();
  };

  /* ---------- 물체 그리기 ---------- */
  function drawSpringCoil(x, y0, y1, w, coils) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const n = coils * 2, dy = (y1 - y0) / n;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(x, y0);
    for (let i = 0; i < n; i++) ctx.lineTo(x + (i % 2 ? -w : w) / 2, y0 + dy * (i + 0.5));
    ctx.lineTo(x, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 1, y0);
    for (let i = 0; i < n; i++) ctx.lineTo(x + (i % 2 ? -w : w) / 2 - 1.5, y0 + dy * (i + 0.5) - 1);
    ctx.stroke();
    ctx.restore();
  }
  function drawWeightObj(x, y, alpha, glow) {
    ctx.save(); ctx.globalAlpha *= alpha;
    if (glow > 0.01) { ctx.shadowColor = rgba('#22c55e', 0.9 * glow); ctx.shadowBlur = 24 * glow; }
    ctx.shadowColor = glow > 0.01 ? rgba('#22c55e', 0.95 * glow) : 'rgba(15,23,42,.3)';
    ctx.shadowBlur = glow > 0.01 ? 26 : 10; ctx.shadowOffsetY = glow > 0.01 ? 0 : 4;
    const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
    g.addColorStop(0, '#94a3b8'); g.addColorStop(0.35, '#e2e8f0'); g.addColorStop(0.7, '#94a3b8'); g.addColorStop(1, '#64748b');
    ctx.fillStyle = g; rr(x - 30, y, 60, 72, 10); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.strokeStyle = glow > 0.01 ? rgba('#16a34a', 0.5 + 0.5 * glow) : '#64748b'; ctx.lineWidth = glow > 0.01 ? 4 : 2; rr(x - 30, y, 60, 72, 10); ctx.stroke();
    ctx.fillStyle = '#334155'; rr(x - 22, y + 24, 44, 24, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('추', x, y + 37);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y - 3, 6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawDuck(x, y, alpha, glow) {
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.shadowColor = glow > 0.01 ? rgba('#22c55e', 0.95 * glow) : 'rgba(15,23,42,.25)'; ctx.shadowBlur = glow > 0.01 ? 26 : 8; ctx.shadowOffsetY = glow > 0.01 ? 0 : 3;
    const g = ctx.createRadialGradient(x - 14, y - 16, 4, x, y, 60);
    g.addColorStop(0, '#fff3a3'); g.addColorStop(0.6, '#facc15'); g.addColorStop(1, '#ca8a04');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 4, 62, 30, 0, 0, TAU); ctx.fill();            // 튜브 몸통
    ctx.beginPath(); ctx.arc(x + 44, y - 26, 20, 0, TAU); ctx.fill();                                      // 머리
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(x + 60, y - 28); ctx.quadraticCurveTo(x + 82, y - 26, x + 76, y - 18); ctx.quadraticCurveTo(x + 66, y - 14, x + 58, y - 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x + 48, y - 31, 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 4, 62, 30, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - 8, y + 4, 46, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - 22, y - 12, 12, 5, -0.4, 0, TAU); ctx.fill();
    if (glow > 0.01) { ctx.strokeStyle = rgba('#16a34a', 0.5 + 0.5 * glow); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + 4, 62, 30, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function drawCrate(x, y, w, h, alpha, glow) {
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.save(); ctx.shadowColor = glow > 0.01 ? rgba('#22c55e', 0.95 * glow) : 'rgba(15,23,42,.3)'; ctx.shadowBlur = glow > 0.01 ? 26 : 12; ctx.shadowOffsetY = glow > 0.01 ? 0 : 6;
    ctx.fillStyle = '#b07a43'; rr(x - w / 2, y - h / 2, w, h, 7); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, '#f2cb92'); g.addColorStop(1, '#c48a4f');
    ctx.fillStyle = g; rr(x - w / 2, y - h / 2, w, h, 7); ctx.fill();
    ctx.save(); rr(x - w / 2, y - h / 2, w, h, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(110,64,24,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 6); ctx.lineTo(x + w / 2, y - h / 6); ctx.moveTo(x - w / 2, y + h / 6); ctx.lineTo(x + w / 2, y + h / 6); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = glow > 0.01 ? rgba('#16a34a', 0.5 + 0.5 * glow) : '#7c4a1c'; ctx.lineWidth = glow > 0.01 ? 4 : 3; rr(x - w / 2, y - h / 2, w, h, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2 + 5, y + h / 2 - 9); ctx.lineTo(x - w / 2 + 5, y - h / 2 + 5); ctx.lineTo(x + w / 2 - 9, y - h / 2 + 5); ctx.stroke();
    ctx.restore();
  }
  function drawWater(y0, x0, x1, bottom, t, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    const g = ctx.createLinearGradient(0, y0, 0, bottom);
    g.addColorStop(0, 'rgba(96,180,255,.72)'); g.addColorStop(1, 'rgba(37,99,235,.82)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let i = 0; i <= 40; i++) { const px = x0 + (x1 - x0) * i / 40; ctx.lineTo(px, y0 + Math.sin(t * 2 + i * 0.5) * 2.2 + Math.sin(t * 3.1 + i * 0.9) * 1.2); }
    ctx.lineTo(x1, bottom); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const px = x0 + (x1 - x0) * i / 40, py = y0 + Math.sin(t * 2 + i * 0.5) * 2.2 + Math.sin(t * 3.1 + i * 0.9) * 1.2; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.restore();
  }
  function drawFbScene(t, dx, dy, alpha, glow, ghost) {
    const id = FB.case;
    if (id === 'A') {
      if (!ghost) {
        ctx.save();
        const sg = ctx.createLinearGradient(0, 0, 0, 300); sg.addColorStop(0, '#fff6e9'); sg.addColorStop(1, '#ffe9cf');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
        ctx.restore();
        // 스탠드와 용수철
        ctx.fillStyle = '#64748b'; rr(OX - 70, 22, 140, 24, 7); ctx.fill();
        ctx.fillStyle = '#94a3b8'; rr(OX - 70, 22, 140, 8, 4); ctx.fill();
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(OX, 46, 7, 0, TAU); ctx.fill();
        drawSpringCoil(OX, 50, 230, 28, 11);
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(OX, 232, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(15,23,42,.1)'; ctx.fillRect(0, 470, W, H - 470);
        ctx.fillStyle = '#d9a45f'; ctx.fillRect(0, 456, W, H - 456);
      }
      drawWeightObj(OX + dx, 236 + dy, alpha, glow);
    } else if (id === 'B') {
      if (!ghost) {
        const sg = ctx.createLinearGradient(0, 0, 0, 330); sg.addColorStop(0, '#d6ecff'); sg.addColorStop(1, '#f1f9ff');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        [[0.2, 70], [0.55, 52]].forEach(([fx, y]) => { const x = W * fx; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.arc(x + 24, y - 7, 24, 0, TAU); ctx.arc(x + 48, y, 18, 0, TAU); ctx.rect(x, y, 48, 18); ctx.fill(); });
        // 수영장 벽
        ctx.fillStyle = '#e2e8f0'; rr(20, 322, W * (PHONE ? 0.62 : 0.6) + 20, 160, 12); ctx.fill();
      }
      const px1 = W * (PHONE ? 0.62 : 0.6);
      if (!ghost) {
        drawDuckFull(dx, dy, alpha, glow, px1);
      } else {
        drawDuck(OX + dx, 322 + dy, alpha, glow);
      }
    } else {
      if (!ghost) {
        const sg = ctx.createLinearGradient(0, 0, 0, 360); sg.addColorStop(0, '#fff6e9'); sg.addColorStop(1, '#ffe6c8');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
        const fg = ctx.createLinearGradient(0, 360, 0, H); fg.addColorStop(0, '#d9a45f'); fg.addColorStop(1, '#b97f3d');
        ctx.fillStyle = fg; ctx.fillRect(0, 360, W, H - 360);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 360, W, 3);
        ctx.strokeStyle = 'rgba(110,64,24,.3)'; ctx.lineWidth = 1.4;
        for (let i = 1; i < 6; i++) { const y = 362 + i * 24; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        // 거친 바닥 표시
        ctx.fillStyle = 'rgba(110,64,24,.35)'; for (let x = 12; x < W - 220; x += 22) { ctx.beginPath(); ctx.arc(x + (x % 3) * 3, 366 + (x % 5), 1.8, 0, TAU); ctx.fill(); }
        // 미는 사람의 손 (장갑)
        const gx = OX - 54 - 2;
        glove(gx, 318, 1, 0, 'push', { scale: 1.1 });
      }
      softShadow(OX + dx + 4, 362, 62, 8, 0.25 * alpha);
      drawCrate(OX + dx, 318 + dy, 104, 84, alpha, glow);
    }
  }
  function drawDuckFull(dx, dy, alpha, glow, px1) {
    // 물 아래(오리 아랫부분)는 물이 덮어요
    const t = NOW();
    drawDuck(OX + dx, 322 + dy, alpha, glow);
    drawWater(334, 24, px1 + 18, 470, t);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(24, 340, px1 - 6, 6); ctx.restore();
  }
  function fbArrowPill(id, v, o) {
    const c = fbCase(), g = GEO[FB.case][id], a = FB.a[id];
    const len = a.len; if (len < 4 || !a.shown) return null;
    const str = FT[id].name + ' ' + v + ' N', w = measure(str, 13.5) + 18 * FS, h = 24 * FS;
    if (id === c.need) {                                  // 크기를 조절하는 화살표: 손잡이와 겹치지 않게 화살표 옆에
      if (g.d[1] !== 0) return pill(str, g.x + 20 + w / 2, g.y + g.d[1] * len * 0.5, { color: FT[id].col, size: 13.5, fit: true });
      return pill(str, g.x + g.d[0] * len * 0.5, g.y + 30, { color: FT[id].col, size: 13.5, fit: true });
    }
    const tipX = g.x + g.d[0] * len, tipY = g.y + g.d[1] * len;
    const off = Math.abs(g.d[0]) * (w / 2 + 12) + Math.abs(g.d[1]) * (h / 2 + 12);
    return pill(str, tipX + g.d[0] * off, tipY + g.d[1] * off, { color: FT[id].col, size: 13.5, fit: true });
  }
  function drawFbd(dt, t) {
    const c = fbCase(), id = FB.case, G = GEO[id];
    drawFbScene(t, 0, 0, 1, FB.glow, false);
    // 고스트: 물체가 실제로 움직일 방향으로 미끄러져요
    const gh = FB.ghost;
    if (gh) {
      const p = clamp(gh.t / 1.1, 0, 1), dist = Math.min(78, 22 + Math.abs(gh.net) * (c.axis === 'x' ? 2.2 : 14));
      const e = p * p, sgn = gh.net > 0 ? 1 : -1;
      const off = e * dist * sgn;
      const a = gh.t < 2.4 ? 0.55 : Math.max(0, 0.55 * (1 - (gh.t - 2.4) / 0.4));
      const gdx = c.axis === 'x' ? off : 0, gdy = c.axis === 'y' ? off : 0;
      drawFbScene(t, gdx, gdy, a, 0, true);
      // 알짜힘 화살표
      const o = fbObjCenter();
      FB.net.set(c.axis === 'x' ? sgn * Math.abs(gh.net) * c.px : 0, c.axis === 'y' ? sgn * Math.abs(gh.net) * c.px : 0);
    } else FB.net.set(0, 0);
    // 화살표 (주어진 힘 + 내가 그린 힘)
    const ids = FB.quiz ? ['push'].concat(FB.v.fric != null ? ['fric'] : []) : Object.keys(c.given).concat(Object.keys(FB.v));
    ids.forEach((fid) => {
      const a = FB.a[fid], g = G[fid];
      if (!a.shown || a.len < 2) return;
      forceArrow(g.x, g.y, a.dx * a.k, a.dy * a.k, FT[fid].col, { width: 8, head: 19, glow: FB.glow > 0.5 });
    });
    // 수직 방향 생략 안내 (상자)
    if (id === 'C') {
      ctx.save(); ctx.globalAlpha = 0.5;
      forceArrow(OX + 18, 318, 0, 40, COL.grav, { width: 5, head: 12, dot: false });
      forceArrow(OX - 18, 360, 0, -40, COL.supp, { width: 5, head: 12, dot: false });
      ctx.restore();
      if (!FB.quiz) pill('위아래 힘은 이미 평형 (중력 = 떠받치는 힘)', OX, 394, { color: '#64748b', size: 12.5, fit: true });
    }
    // 값 pill
    if (FB.quiz) {
      fbArrowPill('push', FB.quiz);
      if (FB.v.fric == null) {
        const g = G.fric;
        ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([8, 6]); ctx.strokeStyle = COL.fric; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 110, g.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COL.fric; ctx.beginPath(); ctx.moveTo(g.x - 128, g.y); ctx.lineTo(g.x - 108, g.y - 11); ctx.lineTo(g.x - 108, g.y + 11); ctx.closePath(); ctx.fill();
        ctx.restore();
        pill('마찰력 ? N', g.x - 62, g.y + 32, { color: COL.fric, size: 13.5, fit: true });
      } else fbArrowPill('fric', FB.v.fric);
    } else {
      Object.keys(c.given).forEach((fid) => fbArrowPill(fid, c.given[fid]));
      Object.keys(FB.v).forEach((fid) => fbArrowPill(fid, FB.v[fid]));
    }
    // 알짜힘(고스트일 때)
    if (FB.net.shown && FB.net.len > 3) {
      const o = fbObjCenter(), nx = id === 'C' ? o.x + 6 : o.x + (id === 'B' ? 90 : 70), ny = id === 'C' ? o.y - 80 : o.y;
      forceArrow(nx, ny, FB.net.dx * FB.net.k, FB.net.dy * FB.net.k, COL.net, { width: 9, head: 20, glow: true });
      const dirw = id === 'C' ? (FB.net.dx > 0 ? '→' : '←') : (FB.net.dy > 0 ? '↓' : '↑');
      pill('알짜힘 ' + Math.abs(gh ? gh.net : 0) + ' N ' + dirw, nx + (id === 'C' ? FB.net.dx * 0.5 : 0), ny + (id === 'C' ? -26 : FB.net.dy + (FB.net.dy > 0 ? 24 : -24)), { solid: true, color: COL.net, size: 13.5, fit: true });
      pill('그렇다면 물체가 움직여야 해요!', STX, STY, { solid: true, color: '#7c3aed', size: 14.5, fit: true });
    }
    // 크기 조절 손잡이
    const h = c.need;
    if (!FB.quiz && FB.v[h] != null && !FB.ghost) {
      const a = FB.a[h], g = G[h];
      const hx = g.x + g.d[0] * a.len, hy = g.y + g.d[1] * a.len;
      knobXY(hx + g.d[0] * 22, hy + g.d[1] * 22, g.d);
      if (FB.glow < 0.3 && FB.checked === 0) D.ring(hx + g.d[0] * 22, hy + g.d[1] * 22, 20, t, { color: FT[h].col, width: 2 });
    }
    // 안내
    if (FB.glow > 0.05) {
      ctx.save(); ctx.globalAlpha *= FB.glow;
      pill('평형 ✔  알짜힘 0 N', STX, STY, { solid: true, color: COL.good, size: 15, fit: true });
      ctx.restore();
    }
    // 팔레트
    if (!FB.quiz) drawPalette(t);
    if (FB.msg) {
      const m = FB.msg, a = Math.min(1, m.t / 0.15) * Math.min(1, (3.6 - m.t) / 0.4);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      const lines = wrapText(m.text, PAL.x - 40, 13.5);
      lines.forEach((ln, i) => pill(ln, (PAL.x - 10) / 2 + 6, H - 30 - (lines.length - 1 - i) * 30, { solid: true, color: COL.warn, size: 13.5, fit: true }));
      ctx.restore();
    }
  }
  function wrapText(str, maxW, size) {
    const out = []; let cur = '';
    for (const ch of str) {
      if (measure(cur + ch, size, 800) + 24 > maxW && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function knobXY(x, y, d) {
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = '#475569'; ctx.stroke();
    ctx.fillStyle = '#334155';
    const vx = d[0], vy = d[1];
    [-1, 1].forEach((s) => {
      ctx.beginPath(); ctx.moveTo(x + vx * s * 9, y + vy * s * 9); ctx.lineTo(x + vx * s * 3 - vy * 5, y + vy * s * 3 + vx * 5); ctx.lineTo(x + vx * s * 3 + vy * 5, y + vy * s * 3 - vx * 5); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  function drawPalette(t) {
    const c = fbCase();
    const first = palPos(0), lastRow = Math.ceil(FTYPES.length / PAL.cols), bh = lastRow * (PAL.ch + PAL.gy) + 40;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(PAL.x - 12, PAL.y - 40, PAL.cols * PAL.cw + (PAL.cols - 1) * PAL.gx + 24, bh + 4, 16); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill();
    ctx.restore();
    txt('🧩 힘 칩 — 끌어다 물체에 놓아요', PAL.x - 2, PAL.y - 22, { size: 13, align: 'left', color: '#475569', halo: false });
    FTYPES.forEach((f, i) => {
      if (FB.drag && FB.drag.id === f.id) return;
      drawChip(f, FB.chipPos[f.id], false);
    });
    if (FB.drag) drawChip(FT[FB.drag.id], FB.chipPos[FB.drag.id], true);
  }
  function drawChip(f, p, dragging) {
    const c = fbCase(), given = c.given[f.id] != null, used = FB.v[f.id] != null;
    const w = PAL.cw, h = PAL.ch, lift = p.lift;
    ctx.save();
    const sh = FB.shake[f.id] || 0;
    ctx.translate(p.x + w / 2 + (sh > 0 ? Math.sin(sh * 50) * 6 * sh : 0), p.y + h / 2 - lift * 5);
    ctx.scale(1 + lift * 0.07, 1 + lift * 0.07); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = 'rgba(15,23,42,' + (0.16 + lift * 0.14).toFixed(2) + ')'; ctx.shadowBlur = 6 + lift * 12; ctx.shadowOffsetY = 2 + lift * 6;
    rr(0, 0, w, h, h / 2); ctx.fillStyle = (given || used) ? '#f1f5f9' : '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = (given || used) ? '#cbd5e1' : f.col; rr(0, 0, w, h, h / 2); ctx.stroke();
    // 화살표 아이콘
    ctx.fillStyle = (given || used) ? '#cbd5e1' : f.col;
    ctx.beginPath(); ctx.arc(h / 2, h / 2, h / 2 - 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(h / 2 - 5, h / 2 + 5); ctx.lineTo(h / 2 + 5, h / 2 - 5); ctx.moveTo(h / 2 + 5, h / 2 - 5); ctx.lineTo(h / 2 + 5, h / 2 + 1); ctx.moveTo(h / 2 + 5, h / 2 - 5); ctx.lineTo(h / 2 - 1, h / 2 - 5); ctx.stroke();
    ctx.fillStyle = (given || used) ? '#94a3b8' : '#1b2333'; ctx.font = font(PHONE ? 12.5 : 14.5, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const label = f.name;
    ctx.fillText(label, h + 4, h / 2 + 1);
    if (given || used) { ctx.fillStyle = '#16a34a'; ctx.font = font(13, 800); ctx.textAlign = 'right'; ctx.fillText('✔', w - 12, h / 2 + 1); }
    ctx.restore();
  }
  function fbDropZone() {
    const o = fbObjCenter(), c = fbCase();
    return c.axis === 'x' || FB.case === 'B' ? { x: o.x - 110, y: o.y - 90, w: 220, h: 200 } : { x: o.x - 80, y: o.y - 160, w: 160, h: 260 };
  }
  function fbDropChip(id) {
    const c = fbCase();
    const home = FB.chipPos[id];
    if (c.given[id] != null || FB.v[id] != null) { fbReject(id, c.given[id] != null ? NOPE[FB.case][id] || '이미 그려져 있어요.' : '이미 놓았어요.'); return; }
    if (id !== c.need) { fbReject(id, NOPE[FB.case][id] || '이 힘은 필요하지 않아요.'); return; }
    FB.v[id] = c.snap; Sound.tick();
    const v = fbVec(id, c.snap); FB.a[id].set(v[0], v[1]);
    FB.glow = 0; FB.ghost = null; FB.checked = 0;
    const g = GEO[FB.case][id]; FX.burst(g.x, g.y, { count: 8, life: 0.5, speed: 120, gravity: 0, size: 3.4, colors: [FT[id].col, '#ffffff'] });
    showHint('화살표 끝의 ◂▸ 손잡이를 끌어 크기를 정해요', 5000);
  }
  function fbReject(id, text) {
    FB.shake[id] = 0.5; Sound.fail();
    FB.msg = { text, t: 0 };
  }
  function fbHandlePos() {
    const c = fbCase(), h = c.need;
    if (FB.v[h] == null) return null;
    const a = FB.a[h], g = GEO[FB.case][h];
    return { x: g.x + g.d[0] * (a.len + 22), y: g.y + g.d[1] * (a.len + 22), g, id: h };
  }
  function fbDown(p) {
    if (FB.quiz) return false;
    const hp = fbHandlePos();
    if (hp && !FB.ghost && Math.hypot(p.x - hp.x, p.y - hp.y) < 30) { FB.handle = hp; FB.glow = 0; FB.checked = 0; hideHint(); return true; }
    for (let i = FTYPES.length - 1; i >= 0; i--) {
      const f = FTYPES[i], cp = FB.chipPos[f.id];
      if (p.x >= cp.x && p.x <= cp.x + PAL.cw && p.y >= cp.y && p.y <= cp.y + PAL.ch) {
        FB.drag = { id: f.id, ox: p.x - cp.x, oy: p.y - cp.y }; Sound.tick(); hideHint(); FB.ghost = null; return true;
      }
    }
    return false;
  }
  function fbMove(p) {
    if (FB.handle) {
      const g = FB.handle.g, c = fbCase();
      const proj = ((p.x - g.x) * g.d[0] + (p.y - g.y) * g.d[1] - 22) / c.px;
      const n = clamp(Math.round(proj / c.snap) * c.snap, c.snap, c.max);
      const id = FB.handle.id;
      if (n !== FB.v[id]) { FB.v[id] = n; const v = fbVec(id, n); FB.a[id].set(v[0], v[1]); Sound.tick(); }
    } else if (FB.drag) {
      const cp = FB.chipPos[FB.drag.id];
      cp.x = p.x - FB.drag.ox; cp.y = p.y - FB.drag.oy;
    }
  }
  function fbUp(p) {
    if (FB.handle) { FB.handle = null; return; }
    if (!FB.drag) return;
    const id = FB.drag.id, cp = FB.chipPos[id]; FB.drag = null;
    const z = fbDropZone(), cx = cp.x + PAL.cw / 2, cy = cp.y + PAL.ch / 2;
    if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) fbDropChip(id);
  }
  function stepFbd(dt) {
    FTYPES.forEach((f) => {
      const cp = FB.chipPos[f.id];
      const dragging = FB.drag && FB.drag.id === f.id;
      cp.lift = approach(cp.lift, dragging ? 1 : 0, dt, 14);
      if (!dragging) { cp.x = approach(cp.x, cp.hx, dt, 12); cp.y = approach(cp.y, cp.hy, dt, 12); }
      if (FB.shake[f.id] > 0) FB.shake[f.id] = Math.max(0, FB.shake[f.id] - dt);
      FB.a[f.id].update(dt);
    });
    FB.net.update(dt);
    if (FB.ghost) { FB.ghost.t += dt; if (FB.ghost.t > 2.8) FB.ghost = null; }
    if (FB.msg) { FB.msg.t += dt; if (FB.msg.t > 3.6) FB.msg = null; }
    if (FB.glow > 0 && !FB.okOnce) FB.glow = Math.max(0, FB.glow - dt * 2);
  }



  /* =========================================================
     장면 ③ 짐을 실은 배: 무게가 바뀌면 부력도 함께 바뀌어 다시 평형을 이뤄요
     ========================================================= */
  const TK = { x0: Math.round(W * (PHONE ? 0.4 : 0.37)), x1: W - 16, top: PHONE ? 150 : 112, bot: 476 };
  const BXC = Math.round((TK.x0 + TK.x1) / 2);
  const W_BOAT = 10, W_BOX = 5;
  const KBUOY = 0.625;                      // 잠긴 깊이 1 px당 부력 (N) — 시각용
  const D_T = 25 / KBUOY;                   // 목표 흘수: 중력 25 N일 때 (40 px)
  const WL0 = PHONE ? 340 : 326;            // 배 무게 10 N일 때의 수면 높이
  const NBT = PHONE ? 3.4 : 4;              // 힘 화살표: 1 N = 4 px
  const HULL = PHONE ? { top: 72, w1: 176, w0: 136 } : { top: 92, w1: 244, w0: 188 };
  const CBW = PHONE ? 44 : 56, CBH = PHONE ? 40 : 50;
  const SLOTS = PHONE ? [[-48, 0], [0, 0], [48, 0], [-24, 1], [24, 1]] : [[-64, 0], [0, 0], [64, 0], [-32, 1], [32, 1]];   // 갑판 위 짐 자리 (가로 위치, 층)
  const BTW = (n) => W_BOAT + W_BOX * n;
  const BT = {
    d: W_BOAT / KBUOY, vd: 0, roll: 0, rv: 0,
    boxes: [], drag: null, rings: [], clk: 0,
    aG: new AArrow(), aB: new AArrow(), msg: null,
  };
  const DOCKW = TK.x0 - 36;
  function dockHome(i) { const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3; return { x: 18 + CBW / 2 + col * ((DOCKW - CBW) / 2.4) + (row ? (DOCKW - CBW) / 4.8 : 0), y: 396 - CBH * (row + 1) - 2 * row }; }
  function boatReset() {
    BT.boxes = []; for (let i = 0; i < 5; i++) { const h = dockHome(i); BT.boxes.push({ i, st: 'dock', x: h.x, y: h.y, hx: h.x, hy: h.y, slot: -1, lx: 0, ly: 0, land: false, lift: 0, pop: 1 }); }
    BT.d = W_BOAT / KBUOY; BT.vd = 0; BT.roll = 0; BT.rv = 0; BT.drag = null; BT.rings = []; BT.msg = null;
    BT.aG.jump(0, 0); BT.aB.jump(0, 0);
  }
  const boatLoaded = () => BT.boxes.filter((b) => b.st === 'boat' && b.land).length;
  const boatW = () => BTW(boatLoaded());
  const boatB = () => KBUOY * BT.d;
  const waterY = () => WL0 - 0.22 * (BT.d - W_BOAT / KBUOY);
  const boatSettled = () => Math.abs(BT.d - boatW() / KBUOY) < 1.0 && Math.abs(BT.vd) < 4 && BT.boxes.every((b) => b.st !== 'boat' || b.land) && !BT.drag;
  function slotLocal(k) { const s = SLOTS[k]; return { x: s[0], y: -HULL.top - CBH / 2 - 3 - s[1] * CBH }; }   // 갑판 위 짐의 중심(배 기준)
  function boatToWorld(lx, ly) {
    const by = waterY() + BT.d, c = Math.cos(BT.roll), s = Math.sin(BT.roll);
    return { x: BXC + lx * c - ly * s, y: by + lx * s + ly * c };
  }
  function boatFromWorld(x, y) {
    const by = waterY() + BT.d, c = Math.cos(-BT.roll), s = Math.sin(-BT.roll), dx = x - BXC, dy = y - by;
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }
  function stepBoat(dt) {
    // 부력과 중력의 차이로 배가 위아래로 움직여요 (감쇠 진동)
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const acc = 88 * (boatW() - KBUOY * BT.d) - 3.4 * BT.vd;
      BT.vd += acc * h; BT.d += BT.vd * h;
      BT.d = clamp(BT.d, 4, 100);
      BT.rv += (-42 * BT.roll - 1.8 * BT.rv) * h; BT.roll += BT.rv * h;
    }
    BT.clk += dt;
    BT.boxes.forEach((b) => {
      b.lift = approach(b.lift, BT.drag && BT.drag.b === b ? 1 : 0, dt, 14);
      if (b.pop < 1) b.pop = Math.min(1, b.pop + dt / 0.3);
      if (BT.drag && BT.drag.b === b) return;
      if (b.st === 'dock') { b.x = approach(b.x, b.hx, dt, 12); b.y = approach(b.y, b.hy, dt, 12); b.land = false; }
      else if (b.st === 'boat') {
        const t = slotLocal(b.slot);
        b.lx = approach(b.lx, t.x, dt, 14); b.ly = approach(b.ly, t.y, dt, 11);
        if (!b.land && Math.abs(b.lx - t.x) < 4 && Math.abs(b.ly - t.y) < 4) {
          b.land = true; BT.vd += 42; BT.rv += (b.slot % 2 ? 1 : -1) * 0.5 * (b.slot === 1 ? 0 : 1);
          const wp = boatToWorld(t.x, 0); BT.rings.push({ x: wp.x, y: waterY(), t: 0 });
          Sound.tick(); syncBoat();
        }
      }
    });
    for (let i = BT.rings.length - 1; i >= 0; i--) { BT.rings[i].t += dt; if (BT.rings[i].t > 1.1) BT.rings.splice(i, 1); }
    if (BT.msg) { BT.msg.t += dt; if (BT.msg.t > 2.4) BT.msg = null; }
    const W_ = boatW(), B_ = boatB();
    BT.aG.set(0, W_ * NBT); BT.aB.set(0, -B_ * NBT);
    BT.aG.update(dt); BT.aB.update(dt);
  }
  function hullPath(x0, y0, top, w1, w0) {            // (x0, y0)=배 바닥 가운데, 위로 top만큼
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(x0 - w1 / 2, y0 - top);
    ctx.lineTo(x0 - w0 / 2 - 4, y0 - r);
    ctx.quadraticCurveTo(x0 - w0 / 2, y0, x0 - w0 / 2 + r, y0);
    ctx.lineTo(x0 + w0 / 2 - r, y0);
    ctx.quadraticCurveTo(x0 + w0 / 2, y0, x0 + w0 / 2 + 4, y0 - r);
    ctx.lineTo(x0 + w1 / 2, y0 - top);
    ctx.closePath();
  }
  function drawBoat() {
    const by = waterY() + BT.d;
    ctx.save();
    ctx.translate(BXC, by); ctx.rotate(BT.roll);
    ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, -HULL.top, 0, 0);
    g.addColorStop(0, '#f87171'); g.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g; hullPath(0, 0, HULL.top, HULL.w1, HULL.w0); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); hullPath(0, 0, HULL.top, HULL.w1, HULL.w0); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(-130, -HULL.top + 16, 260, 12);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-130, -HULL.top + 3, 260, 6);
    // 목표선: 이 높이까지 물에 잠기게 해요
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-130, -D_T); ctx.lineTo(130, -D_T); ctx.stroke();
    ctx.setLineDash([9, 6]); ctx.lineWidth = 3.4; ctx.strokeStyle = '#15803d';
    ctx.beginPath(); ctx.moveTo(-130, -D_T); ctx.lineTo(130, -D_T); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3; hullPath(0, 0, HULL.top, HULL.w1, HULL.w0); ctx.stroke();
    // 갑판 테두리
    ctx.fillStyle = '#92400e'; rr(-HULL.w1 / 2 - 4, -HULL.top - 7, HULL.w1 + 8, 12, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(-HULL.w1 / 2, -HULL.top - 6, HULL.w1, 3, 2); ctx.fill();
    // 깃발
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(HULL.w1 / 2 - 14, -HULL.top - 4); ctx.lineTo(HULL.w1 / 2 - 14, -HULL.top - 40); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(HULL.w1 / 2 - 14, -HULL.top - 40); ctx.lineTo(HULL.w1 / 2 + 8, -HULL.top - 33); ctx.lineTo(HULL.w1 / 2 - 14, -HULL.top - 26); ctx.closePath(); ctx.fill();
    // 짐 상자
    BT.boxes.forEach((b) => { if (b.st === 'boat' && !(BT.drag && BT.drag.b === b)) drawCargo(b.lx, b.ly, 1, 0); });
    ctx.restore();
  }
  function drawCargo(x, y, a, lift) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y - lift * 4); ctx.scale(1 + lift * 0.08, 1 + lift * 0.08);
    ctx.shadowColor = 'rgba(15,23,42,' + (0.24 + lift * 0.1) + ')'; ctx.shadowBlur = 6 + lift * 10; ctx.shadowOffsetY = 3 + lift * 5;
    const g = ctx.createLinearGradient(-CBW / 2, -CBH / 2, CBW / 2, CBH / 2); g.addColorStop(0, '#fbbf24'); g.addColorStop(1, '#d97706');
    ctx.fillStyle = g; rr(-CBW / 2, -CBH / 2, CBW, CBH, 6); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.4; rr(-CBW / 2, -CBH / 2, CBW, CBH, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(146,64,14,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-CBW / 2, 0); ctx.lineTo(CBW / 2, 0); ctx.moveTo(0, -CBH / 2); ctx.lineTo(0, CBH / 2); ctx.stroke();
    ctx.fillStyle = '#fff'; rr(-17, -8, 34, 16, 5); ctx.fill();
    ctx.fillStyle = '#92400e'; ctx.font = font(12.5, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('5 N', 0, 1);
    ctx.restore();
  }
  function drawBoatScene(dt, t) {
    // 하늘과 작업대
    const sg = ctx.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, '#dff1ff'); sg.addColorStop(1, '#f6fbff');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ecd7b6'; ctx.fillRect(0, 396, TK.x0 - 14, H - 396);
    const bg = ctx.createLinearGradient(0, 396, 0, 416); bg.addColorStop(0, '#d9a45f'); bg.addColorStop(1, '#a96f33');
    ctx.fillStyle = bg; rr(10, 396, TK.x0 - 16, 20, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(14, 398, TK.x0 - 24, 4, 2); ctx.fill();
    ctx.fillStyle = '#8a5a26'; ctx.fillRect(26, 416, 16, H - 416); ctx.fillRect(TK.x0 - 48, 416, 16, H - 416);
    txt('짐 상자 (5 N씩)', (TK.x0 - 20) / 2 + 4, 446, { size: 13, color: '#78350f', halo: false });
    // 수조 뒷면과 물
    const tkW = TK.x1 - TK.x0, wy = waterY();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(TK.x0, TK.top, tkW, TK.bot - TK.top, 14); ctx.fill();
    ctx.save(); rr(TK.x0, TK.top, tkW, TK.bot - TK.top, 14); ctx.clip();
    drawBoat();                                              // 배를 먼저 그리고 물을 그 위에 반투명하게 덮어 잠긴 부분을 표현
    drawWater(wy, TK.x0, TK.x1, TK.bot, t, 1);
    BT.rings.forEach((r) => {
      const p = r.t / 1.1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - p)).toFixed(3) + ')'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(r.x, wy + 2, 14 + p * 70, 4 + p * 8, 0, 0, TAU); ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(100,116,139,.8)'; ctx.lineWidth = 4; rr(TK.x0, TK.top, tkW, TK.bot - TK.top, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TK.x0 + 10, TK.top + 20); ctx.lineTo(TK.x0 + 10, TK.bot - 30); ctx.stroke();
    // 물 높이 눈금
    ctx.save();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6;
    for (let i = 0; i <= 8; i++) { const y = WL0 - 24 + i * 6; ctx.beginPath(); ctx.moveTo(TK.x1 - 6, y); ctx.lineTo(TK.x1 - (i % 2 ? 14 : 22), y); ctx.stroke(); }
    ctx.fillStyle = '#0369a1'; ctx.beginPath(); ctx.moveTo(TK.x1 - 26, wy); ctx.lineTo(TK.x1 - 38, wy - 6); ctx.lineTo(TK.x1 - 38, wy + 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    txt('물 높이', TK.x1 - 44, wy + 22, { size: 12.5, color: '#0369a1', align: 'right' });
    // 목표선 설명
    pill('초록 점선 = 목표선 (중력 25 N)', TK.x0 + 12, TK.top + 20, { color: '#15803d', size: 12.5, align: 'left', fit: true });
    // 상자 (작업대 위 / 끌고 있는 것)
    BT.boxes.forEach((b) => { if (b.st === 'dock' || (BT.drag && BT.drag.b === b)) drawCargo(b.x, b.y + CBH / 2, 1, b.lift); });
    // 화살표: 중력(↓)은 배 왼쪽, 부력(↑)은 오른쪽에 그리고 작용점과 점선으로 이어요
    const W_ = boatW(), B_ = boatB();
    const cg = boatToWorld(0, -HULL.top * 0.45), cgA = boatToWorld(-(HULL.w1 / 2 + 24), -HULL.top * 0.45);
    const cb = boatToWorld(0, -8), cbA = boatToWorld(HULL.w1 / 2 + 24, -8);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(190,18,60,.55)'; ctx.beginPath(); ctx.moveTo(cg.x, cg.y); ctx.lineTo(cgA.x, cgA.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(2,132,199,.6)'; ctx.beginPath(); ctx.moveTo(cb.x, cb.y); ctx.lineTo(cbA.x, cbA.y); ctx.stroke();
    ctx.restore();
    appDot(cg.x, cg.y, COL.grav); appDot(cb.x, cb.y, COL.buoy);
    if (BT.aG.shown && BT.aG.len > 2) forceArrow(cgA.x, cgA.y, 0, BT.aG.dy * BT.aG.k, COL.grav, { width: 8, head: 18 });
    if (BT.aB.shown && BT.aB.len > 2) forceArrow(cbA.x, cbA.y, 0, BT.aB.dy * BT.aB.k, COL.buoy, { width: 8, head: 18 });
    pill('중력 ' + W_ + ' N', cgA.x, cgA.y + BT.aG.len + 20, { color: COL.grav, size: 13.5, fit: true });
    pill('부력 ' + Math.round(B_) + ' N', cbA.x + 4, cbA.y - BT.aB.len - 20, { color: COL.buoy, size: 13.5, fit: true });
    if (boatSettled()) pill(W_ === 25 ? '부력 = 중력 → 평형  ✔ 목표선!' : '부력 = 중력 → 평형', BXC, TK.top - 16, { color: COL.good, size: 13.5, fit: true });
    if (BT.msg) pill(BT.msg.text, BXC, TK.top + 54, { solid: true, color: COL.warn, size: 13.5, fit: true, alpha: Math.min(1, (2.4 - BT.msg.t) / 0.4) });
    if (BT.drag) drawCargo(BT.drag.b.x, BT.drag.b.y + CBH / 2, 1, 1);
    if (isNew('boat') && !BT.boxes.some((b) => b.st === 'boat')) { const h = BT.boxes[0]; newTag(h.x - CBW / 2, h.y, CBW, CBH); }
  }
  function boatBoxAt(p) {
    for (let i = BT.boxes.length - 1; i >= 0; i--) {
      const b = BT.boxes[i];
      let x, y;
      if (b.st === 'dock') { x = b.x; y = b.y + CBH / 2; } else if (b.st === 'boat') { const w = boatToWorld(b.lx, b.ly); x = w.x; y = w.y; } else continue;
      if (Math.abs(p.x - x) < CBW / 2 + 4 && Math.abs(p.y - y) < CBH / 2 + 4) return b;
    }
    return null;
  }
  function boatDown(p) {
    const b = boatBoxAt(p);
    if (!b) return false;
    if (b.st === 'boat') { const w = boatToWorld(b.lx, b.ly); b.x = w.x; b.y = w.y - CBH / 2; b.slot = -1; b.land = false; b.st = 'dock'; syncBoat(); }
    BT.drag = { b, ox: p.x - b.x, oy: p.y - CBH / 2 - b.y, sx: p.x, sy: p.y, moved: false };
    Sound.tick(); hideHint();
    return true;
  }
  function boatMove(p) {
    const d = BT.drag; if (!d) return;
    d.moved = true; d.b.x = p.x - d.ox; d.b.y = p.y - CBH / 2 - d.oy;
  }
  function boatUp(p) {
    const d = BT.drag; if (!d) return;
    BT.drag = null;
    const b = d.b, cx = b.x, cy = b.y + CBH / 2;
    const l = boatFromWorld(cx, cy);
    const free = [0, 1, 2, 3, 4].filter((k) => !BT.boxes.some((q) => q !== b && q.st === 'boat' && q.slot === k));
    const near = l.x > -HULL.w1 / 2 - 30 && l.x < HULL.w1 / 2 + 30 && l.y > -HULL.top - 150 && l.y < 30;
    if (d.moved && near && free.length) {
      const k = free[0];
      b.st = 'boat'; b.slot = k; b.land = false; b.lx = l.x; b.ly = l.y; b.pop = 1;
      Sound.click();
    } else {
      b.st = 'dock'; b.land = false; b.slot = -1;
      if (d.moved && near && !free.length) BT.msg = { text: '배가 가득 찼어요', t: 0 };
    }
    syncBoat();
  }

  /* =========================================================
     장면 ④ 설계 공방: 힘의 특징을 이용해 장치를 설계하고 시험해요
       저울(탄성력은 늘어난 길이에 비례) · 부표(부력은 잠긴 부피가 클수록 큼) · 바퀴(마찰력은 거칠수록 큼)
     ========================================================= */
  const TASKS = {
    scale: { title: '과제 ① 휴대용 용수철저울', need: '눈금판 길이 10 cm · 최대 10 N까지 잴 수 있어야 해요', label: '⚖️ 휴대용 용수철저울' },
    buoy: { title: '과제 ② 구조용 부표', need: '20 N 구조 키트를 매단 부표가 파도 위에 떠 있어야 해요', label: '🛟 구조용 부표' },
    wheel: { title: '과제 ③ 눈길 미끄럼 방지', need: '눈 덮인 비탈을 내려오던 수레가 정지선 앞에서 멈춰야 해요', label: '🛞 눈길 미끄럼 방지' },
  };
  const PARTS = {
    scale: [
      { id: 'A', name: '용수철 A', sub: '아주 부드러워요', info: '1 N에 2 cm 늘어나요', cm: 2, col: '#f59e0b' },
      { id: 'B', name: '용수철 B', sub: '보통이에요', info: '1 N에 1 cm 늘어나요', cm: 1, col: '#22c55e' },
      { id: 'C', name: '용수철 C', sub: '아주 뻑뻑해요', info: '1 N에 0.5 cm 늘어나요', cm: 0.5, col: '#64748b' },
    ],
    buoy: [
      { id: '1', name: '부표 1 L', sub: '작은 부표', info: '완전히 잠기면 부력 약 9.8 N', V: 1 },
      { id: '2', name: '부표 2 L', sub: '중간 부표', info: '완전히 잠기면 부력 약 19.6 N', V: 2 },
      { id: '3', name: '부표 3 L', sub: '큰 부표', info: '완전히 잠기면 부력 약 29.4 N', V: 3 },
    ],
    wheel: [
      { id: 'smooth', name: '매끈한 바퀴', sub: '표면이 매끈해요', info: '', f: 1 },
      { id: 'chain', name: '체인 바퀴', sub: '표면이 울퉁불퉁해요', info: '', f: 5 },
      { id: 'oil', name: '기름칠한 바퀴', sub: '표면이 미끌미끌해요', info: '', f: 0.5 },
    ],
  };
  const SH = {
    task: 'scale', sel: { scale: -1, buoy: -1, wheel: -1 }, tested: { scale: {}, buoy: {}, wheel: {} },
    st: 'idle', t: 0, cur: -1, res: null, cWarned: false, hover: -1, ghosts: [], gclk: 0, msg: null,
    ext: new Spring(0, { stiffness: 150, damping: 5.5 }),
    bz: 0, bv: 0, bt: 0, sunk: false,
    cs: 0, cv: 0, wheelRot: 0, crash: 0,
    aA: new AArrow(), aB: new AArrow(), aC: new AArrow(),
  };
  const PX_CM = PHONE ? 10 : 11;                     // 1 cm = 11 px
  const SHL = PHONE ? { stX: 8, stY: 62, stW: W - 16, stH: 332, cardY: 402, cardH: 110, cardGap: 8 } : { stX: 14, stY: 66, stW: W - 28, stH: 328, cardY: 402, cardH: 110, cardGap: 10 };
  const cardRect = (i) => { const cw = (SHL.stW - 2 * SHL.cardGap) / 3; return { x: SHL.stX + i * (cw + SHL.cardGap), y: SHL.cardY, w: cw, h: SHL.cardH }; };
  function shopReset(task, full) {
    SH.task = task || SH.task; SH.st = 'idle'; SH.t = 0; SH.res = null; SH.cur = -1; SH.ghosts = []; SH.msg = null; SH.crash = 0;
    SH.ext.value = 0; SH.ext.velocity = 0; SH.ext.target = 0; SH.bz = 0; SH.bv = 0; SH.sunk = false; SH.cs = 0; SH.cv = 0;
    SH.aA.jump(0, 0); SH.aB.jump(0, 0); SH.aC.jump(0, 0);
    if (full) { SH.sel[SH.task] = -1; SH.tested[SH.task] = {}; SH.cWarned = false; }
    $$('#shopTasks .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.task === SH.task));
    syncShop();
  }
  const shopSel = () => SH.sel[SH.task];
  function shopSelect(i) {
    if (SH.st === 'run') return;
    SH.sel[SH.task] = i; SH.st = 'idle'; SH.res = null; SH.t = 0; SH.cWarned = SH.cWarned && SH.task === 'scale' && i === 2;
    SH.ext.value = 0; SH.ext.velocity = 0; SH.ext.target = 0; SH.bz = 0; SH.bv = 0; SH.cs = 0; SH.cv = 0; SH.sunk = false; SH.ghosts = [];
    Sound.tick(); syncShop();
  }
  function shopTest() {
    if (SH.st === 'run') return;
    const i = shopSel();
    if (i < 0) { SH.msg = { text: '먼저 아래에서 부품을 하나 골라요!', t: 0 }; Sound.fail(); return; }
    Sound.click();
    SH.st = 'run'; SH.t = 0; SH.cur = i; SH.res = null; SH.ghosts = []; SH.gclk = 0; SH.crash = 0;
    if (SH.task === 'scale') { SH.ext.value = 0; SH.ext.velocity = 0; SH.ext.target = 10 * PARTS.scale[i].cm; }
    else if (SH.task === 'buoy') { SH.bz = -40; SH.bv = 0; SH.sunk = false; }
    else { SH.cs = SLOPE.s0; SH.cv = SLOPE.v0; SH.wheelRot = 0; }
    syncShop();
  }
  /* 시험 결과 → 판정 (2~3차시에서 측정한 규칙과 같은 규칙만 사용) */
  function shopFinish() {
    const task = SH.task, i = SH.cur, p = PARTS[task][i];
    let r;
    if (task === 'scale') {
      const ext = 10 * p.cm;
      if (ext > 10.5) r = { ok: false, ext, msg: '용수철 ' + p.id + '는 1 N에 ' + p.cm + ' cm씩 늘어나서 10 N을 달면 ' + ext + ' cm나 늘어나요. 눈금판(10 cm)을 넘어가서 10 N을 잴 수 없어요. 덜 늘어나는 용수철을 골라 보세요.', badge: '눈금판을 넘었어요 ✗' };
      else if (ext < 9.5) r = { ok: true, soft: true, ext, msg: '용수철 ' + p.id + '는 10 N에서 ' + ext + ' cm만 늘어나요. 눈금이 촘촘해서 읽기 어려워요. 눈금판을 알맞게 쓰는 용수철이 있을까요? (그대로 쓰려면 한 번 더 ✔ 확인하기)', badge: '눈금이 촘촘해요 (읽기 어려워요)' };
      else r = { ok: true, ext, badge: '눈금판에 딱 맞아요 ✔' };
    } else if (task === 'buoy') {
      const bmax = 9.8 * p.V;
      if (bmax >= 21) r = { ok: true, bmax, badge: '파도 위에 떠 있어요 ✔' };
      else r = { ok: false, bmax, msg: p.V + ' L 부표는 완전히 잠겨도 부력이 약 ' + bmax.toFixed(1) + ' N이라서 키트의 무게 20 N을 받치지 못하고 가라앉았어요. 잠긴 부피가 클수록 부력이 커요. 더 큰 부표를 골라 보세요.', badge: '가라앉았어요 ✗' };
    } else {
      const crashed = SH.crash > 0;
      if (!crashed) r = { ok: true, f: p.f, badge: '정지선 앞에서 멈췄어요 ✔' };
      else r = { ok: false, f: p.f, msg: p.name + '는 눈 위에서 마찰력이 ' + p.f + ' N으로 작아서 수레가 멈추지 못하고 정지선을 지나쳤어요. 접촉면이 거칠수록 마찰력이 커요. 더 거친 바퀴를 골라 보세요.', badge: '정지선을 지나쳤어요 ✗' };
    }
    SH.res = r; SH.tested[task][p.id] = r; SH.st = 'done'; SH.t = 0;
    if (r.ok && !r.soft) { celebrate(W * 0.34, 200, 56); Sound.success(); } else { Sound.fail(); }
    syncShop();
  }
  /* 판정(부수 효과 없음) */
  function shopJudge(task, user) {
    const i = SH.sel[task];
    if (i < 0) return '먼저 아래에서 부품을 하나 골라요.';
    const r = SH.tested[task][PARTS[task][i].id];
    if (!r) return '먼저 🧪 시험하기를 눌러 결과를 확인해 보세요.';
    if (!r.ok) return r.msg;
    if (r.soft) { if (user && SH.cWarned) return true; if (user) SH.cWarned = true; return r.msg; }      // 두 번째로 누르면 인정 (안내 문구는 계속 보여 줘요)
    return true;
  }
  function stepShop(dt) {
    const s = SH;
    if (s.msg) { s.msg.t += dt; if (s.msg.t > 2.4) s.msg = null; }
    s.aA.update(dt); s.aB.update(dt); s.aC.update(dt);
    if (s.task === 'scale') {
      s.ext.update(dt);
      if (s.st === 'run') { s.t += dt; if (s.t > 2.6 && Math.abs(s.ext.velocity) < 1.2) shopFinish(); else if (s.t > 4.5) shopFinish(); }
      else if (s.st === 'done') s.t += dt;
    } else if (s.task === 'buoy') {
      s.bt += dt;
      if (s.st === 'run' || s.st === 'done') {
        const p = PARTS.buoy[s.cur], V = p.V, r = 16 + V * 5.6;
        const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
        for (let i = 0; i < n; i++) {
          const z = s.bz + 0;                                   // 부표 중심의 평균 수면 아래 깊이(px)
          const u = clamp((z + r) / (2 * r), 0, 1), f = u * u * (3 - 2 * u);
          const B = 9.8 * V * f, Wt = 20;
          const acc = 40 * (Wt - B) - (2 + 0.02 * Math.abs(s.bv)) * s.bv;
          s.bv += acc * h; s.bz += s.bv * h;
        }
        if (s.st === 'run') { s.t += dt; if (s.t > 6) shopFinish(); } else s.t += dt;
      }
    } else {
      if (s.st === 'run') {
        s.t += dt;
        const p = PARTS.wheel[s.cur];
        const a = 45 * (3 - p.f);                               // 비탈 방향으로의 가속(시각용): 알짜힘 = (3 N − 마찰력)
        const stopS = SLOPE.stopS;
        if (s.crash > 0) { s.crash += dt; s.cv = 0; if (s.crash > 1.2) shopFinish(); }
        else {
          const v0 = s.cv; s.cv = s.cv + a * dt; if (s.cv < 0) s.cv = 0;
          s.cs += (v0 + s.cv) / 2 * dt; s.wheelRot += (v0 + s.cv) / 2 * dt / 13;
          s.gclk += dt; if (s.gclk >= 0.25) { s.gclk = 0; s.ghosts.push({ s: s.cs, age: 0 }); }
          if (s.cs >= stopS && s.cv > 0) { s.crash = 0.001; s.cs = stopS; FX.burst(wheelPos(s.cs).x, wheelPos(s.cs).y, { count: 14, life: 0.7, speed: 200, gravity: 160, size: 4, shape: 'star' }); Sound.fail(); }
          else if (s.cv <= 0 && a < 0) { s.cv = 0; if (s.t > 0.3) { shopFinish(); } }
        }
      } else if (s.st === 'done') s.t += dt;
      for (let i = s.ghosts.length - 1; i >= 0; i--) { s.ghosts[i].age += dt; if (s.ghosts[i].age > 3) s.ghosts.splice(i, 1); }
    }
  }

  /* ---------- 공방 그리기 ---------- */
  function drawWheel(x, y, r, type, rot) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#475569'); g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    if (type === 'chain') {                               // 체인: 울퉁불퉁한 고리 모양
      ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = Math.max(2, r * 0.2); ctx.setLineDash([r * 0.34, r * 0.2]);
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = Math.max(1.6, r * 0.12);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 1), Math.sin(a) * (r - 1)); ctx.lineTo(Math.cos(a + 0.5) * (r * 0.62), Math.sin(a + 0.5) * (r * 0.62)); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, TAU); ctx.fill();
    ctx.restore();
    if (type === 'oil') {                                 // 기름: 반짝이는 막과 방울
      ctx.save();
      ctx.fillStyle = 'rgba(250,204,21,.45)'; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath(); ctx.arc(x, y, r - 2, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      ctx.fillStyle = '#facc15'; [[0.3, 1.2], [-0.5, 1.5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(x + dx * r, y + dy * r, r * 0.12, r * 0.2, 0, 0, TAU); ctx.fill(); });
      ctx.restore();
    }
  }
  function drawSpringIcon(x, y, w, h, p, ext) {          // (x, y): 위쪽 가운데, h: 길이
    const coil = { A: [26, 2.8, 9], B: [22, 3.6, 8], C: [18, 5, 7] }[p.id];
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const n = coil[2] * 2, dy = h / n;
    ctx.strokeStyle = p.col; ctx.lineWidth = coil[1];
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) ctx.lineTo(x + (i % 2 ? -coil[0] : coil[0]) / 2, y + dy * (i + 0.5));
    ctx.lineTo(x, y + h); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, coil[1] * 0.35);
    ctx.beginPath(); ctx.moveTo(x - 0.5, y);
    for (let i = 0; i < n; i++) ctx.lineTo(x + (i % 2 ? -coil[0] : coil[0]) / 2 - 1, y + dy * (i + 0.5) - 1);
    ctx.stroke();
    ctx.restore();
  }
  function drawBuoyBall(x, y, r, wob) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(wob || 0);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#f8fafc'); g.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-r, -r * 0.34, 2 * r, r * 0.68);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.38, r * 0.3, r * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.fillRect(-2, -r - 22, 4, 24);
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(2, -r - 22); ctx.lineTo(18, -r - 16); ctx.lineTo(2, -r - 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawKit(x, y, a) {
    ctx.save(); ctx.globalAlpha *= a == null ? 1 : a;
    ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const g = ctx.createLinearGradient(0, y - 22, 0, y + 22); g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#c2410c');
    ctx.fillStyle = g; rr(x - 30, y - 22, 60, 44, 8); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2.5; rr(x - 30, y - 22, 60, 44, 8); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 14, 8, 28); ctx.fillRect(x - 14, y - 4, 28, 8);
    ctx.restore();
  }
  function cardIcon(task, i, cx, cy, size) {
    const p = PARTS[task][i];
    if (task === 'scale') drawSpringIcon(cx, cy - size * 0.5, size, size, p);
    else if (task === 'buoy') drawBuoyBall(cx, cy + 6, 12 + p.V * 5, 0);
    else drawWheel(cx, cy, size * 0.42, p.id, 0.4);
  }
  function drawShopCards() {
    const task = SH.task, sel = shopSel();
    PARTS[task].forEach((p, i) => {
      const r = cardRect(i), on_ = sel === i, busy = SH.st === 'run';
      ctx.save();
      ctx.shadowColor = on_ ? 'rgba(13,148,136,.4)' : 'rgba(15,23,42,.14)'; ctx.shadowBlur = on_ ? 16 : 8; ctx.shadowOffsetY = 3;
      rr(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.lineWidth = on_ ? 4 : 2; ctx.strokeStyle = on_ ? '#0d9488' : '#cbd5e1'; rr(r.x, r.y, r.w, r.h, 16); ctx.stroke();
      if (on_) { ctx.fillStyle = '#0d9488'; ctx.beginPath(); ctx.arc(r.x + r.w - 16, r.y + 16, 11, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r.x + r.w - 21, r.y + 16); ctx.lineTo(r.x + r.w - 17, r.y + 20); ctx.lineTo(r.x + r.w - 10, r.y + 12); ctx.stroke(); }
      const iw = PHONE ? 50 : 66;
      ctx.save(); ctx.beginPath(); rr(r.x + 6, r.y + 6, iw, r.h - 12, 12); ctx.clip();
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(r.x + 6, r.y + 6, iw, r.h - 12);
      cardIcon(task, i, r.x + 6 + iw / 2, r.y + r.h / 2, Math.min(iw - 10, 62));
      ctx.restore();
      const tx = r.x + iw + 16;
      const tw = r.w - iw - 24;
      txt(p.name, tx, r.y + 24, { align: 'left', size: PHONE ? 13.5 : 16, halo: false });
      const subL = wrapText(p.sub, tw + 24, PHONE ? 11.5 : 13).slice(0, 2);
      subL.forEach((ln, k) => txt(ln, tx, r.y + 46 + k * (PHONE ? 15 : 17), { align: 'left', size: PHONE ? 11.5 : 13, color: '#64748b', weight: 700, halo: false }));
      if (p.info) wrapText(p.info, tw + 24, PHONE ? 11.5 : 12.5).slice(0, 2).forEach((ln, k) => txt(ln, tx, r.y + 46 + (subL.length * (PHONE ? 15 : 17)) + 4 + k * (PHONE ? 15 : 17), { align: 'left', size: PHONE ? 11 : 12.5, color: '#0f766e', weight: 800, halo: false }));
      ctx.restore();
    });
  }
  function shopCardAt(p) {
    for (let i = 0; i < 3; i++) { const r = cardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i; }
    return -1;
  }
  const SLOPE = { x0: SHL.stX + 34, y0: SHL.stY + 96, ang: 0.2, L: 0, stopS: 0, s0: 40, v0: 0 };
  SLOPE.L = Math.round((SHL.stW - 80) / Math.cos(SLOPE.ang)); SLOPE.stopS = Math.round(0.62 * SLOPE.L); SLOPE.v0 = Math.sqrt(2 * 90 * 0.36 * SLOPE.L);
  const wheelPos = (s) => ({ x: SLOPE.x0 + Math.cos(SLOPE.ang) * s, y: SLOPE.y0 + Math.sin(SLOPE.ang) * s });

  function drawShopScale(t) {
    const st = SHL, ax = st.stX + st.stW * (PHONE ? 0.3 : 0.28), y0 = st.stY + 40, L0 = 36;
    const pxc = PHONE ? 8 : 9;
    const sel = shopSel(), p = sel >= 0 ? PARTS.scale[sel] : null;
    // 스탠드
    ctx.fillStyle = '#94a3b8'; rr(ax - 112, st.stY + st.stH - 26, 224, 16, 7); ctx.fill();
    ctx.fillStyle = '#64748b'; rr(ax - 104, st.stY + 18, 14, st.stH - 36, 5); ctx.fill();
    ctx.fillStyle = '#64748b'; rr(ax - 104, st.stY + 18, 108, 14, 5); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(ax, y0 - 4, 6, 0, TAU); ctx.fill();
    // 눈금판 (길이 10 cm)
    const bx = ax + 34, by0 = y0 + L0, by1 = by0 + 10 * pxc;
    const ext = SH.st === 'idle' ? 0 : SH.ext.value;
    const over = ext > 10.4;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    rr(bx, by0 - 16, 62, 10 * pxc + 32, 8); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = over ? 4 : 2; ctx.strokeStyle = over ? '#ef4444' : '#a8a29e'; rr(bx, by0 - 16, 62, 10 * pxc + 32, 8); ctx.stroke();
    ctx.strokeStyle = '#44403c'; ctx.fillStyle = '#44403c'; ctx.lineWidth = 1.6;
    for (let i = 0; i <= 10; i++) {
      const y = by0 + i * pxc;
      ctx.beginPath(); ctx.moveTo(bx + 4, y); ctx.lineTo(bx + (i % 5 === 0 ? 24 : 15), y); ctx.stroke();
      if (i % 5 === 0) txt(i + ' N', bx + 28, y, { align: 'left', size: 12, halo: false, color: '#44403c' });
    }
    ctx.restore();
    txt('눈금판 10 cm', bx + 31, by1 + 30, { size: 12, color: '#78716c', halo: false });
    // 용수철 + 추 + 바늘
    if (p) {
      const len = L0 + ext * pxc, yb = y0 + len;
      drawSpringIcon(ax, y0, 0, Math.max(10, len), p);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ax, yb + 6, 6, 0, TAU); ctx.stroke();
      if (SH.st !== 'idle' || true) {
        const wy = yb + 12;
        const g = ctx.createLinearGradient(ax - 28, 0, ax + 28, 0); g.addColorStop(0, '#94a3b8'); g.addColorStop(0.4, '#e2e8f0'); g.addColorStop(1, '#64748b');
        ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        if (SH.st !== 'idle') { ctx.fillStyle = g; rr(ax - 28, wy, 56, 46, 9); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(ax - 28, wy, 56, 46, 9); ctx.stroke(); txt('10 N', ax, wy + 24, { size: 14, color: '#1e293b', halo: false }); }
        ctx.restore();
      }
      // 바늘
      ctx.strokeStyle = over ? '#ef4444' : '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax + 4, yb + 6); ctx.lineTo(bx + 56, yb + 6); ctx.stroke();
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(bx + 62, yb + 6); ctx.lineTo(bx + 50, yb); ctx.lineTo(bx + 50, yb + 12); ctx.closePath(); ctx.fill();
    } else {
      txt('부품을 골라요', ax, y0 + 80, { size: 14, color: '#94a3b8' });
    }
    // 오른쪽: 시험 결과 패널
    const px = st.stX + st.stW * (PHONE ? 0.58 : 0.52), pw = st.stX + st.stW - px - 16, py = st.stY + 18;
    ctx.save();
    rr(px, py, pw, st.stH - 36, 16); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    txt('📏 10 N 추를 매달면', px + 14, py + 24, { align: 'left', size: PHONE ? 13.5 : 15.5, halo: false });
    const barX = px + 14, barW = pw - 28, barY = py + 112;
    const limit = barW * 0.5, scaleF = limit / 10;                    // 막대 길이: 10 cm = 절반
    ctx.fillStyle = '#e2e8f0'; rr(barX, barY, barW, 22, 11); ctx.fill();
    const el = clamp(ext, 0, 20) * scaleF;
    if (el > 2) { ctx.fillStyle = over ? '#ef4444' : (SH.res && SH.res.soft ? '#f59e0b' : '#16a34a'); rr(barX, barY, el, 22, 11); ctx.fill(); }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(barX + limit, barY - 8); ctx.lineTo(barX + limit, barY + 30); ctx.stroke(); ctx.setLineDash([]);
    txt('눈금판 끝 (10 cm)', barX + limit, barY + 44, { size: 12, color: '#334155', halo: false });
    txt('늘어난 길이  ' + (SH.st === 'idle' ? '—' : ext.toFixed(1)) + ' cm', barX, py + 82, { align: 'left', size: PHONE ? 15 : 18, color: over ? '#dc2626' : '#0f172a', halo: false });
    if (p) txt('선택: ' + p.name + ' (' + p.info + ')', px + 14, py + 50, { align: 'left', size: PHONE ? 11.5 : 12.5, color: '#0f766e', halo: false });
    txt('탄성력은 늘어난 길이에 비례해요', px + 14, py + st.stH - 62, { align: 'left', size: PHONE ? 11.5 : 12.5, color: '#64748b', halo: false });
    if (SH.res) {
      const r = SH.res;
      const a = Math.min(1, SH.t / 0.25);
      ctx.save(); ctx.globalAlpha = a;
      pill(r.badge, px + pw / 2, barY + 92, { solid: true, color: r.ok ? (r.soft ? '#f59e0b' : COL.good) : COL.warn, size: PHONE ? 13.5 : 15, fit: true });
      ctx.restore();
    }
    if (SH.msg) pill(SH.msg.text, st.stX + st.stW / 2, st.stY + st.stH - 24, { solid: true, color: COL.warn, size: 13.5, fit: true });
  }
  function drawShopBuoy(t) {
    const st = SHL, bx = st.stX + st.stW * (PHONE ? 0.32 : 0.3), y0 = st.stY + 112;
    const sel = shopSel(), p = sel >= 0 ? PARTS.buoy[sel] : null;
    ctx.save();
    rr(st.stX + 2, st.stY + 2, st.stW - 4, st.stH - 4, 18); ctx.clip();
    const sg = ctx.createLinearGradient(0, st.stY, 0, y0); sg.addColorStop(0, '#cfe8ff'); sg.addColorStop(1, '#eaf5ff');
    ctx.fillStyle = sg; ctx.fillRect(st.stX, st.stY, st.stW, y0 - st.stY);
    // 파도 위의 바닷속
    const wave = (x) => Math.sin(t * 2.1 + x * 0.024) * 5 + Math.sin(t * 1.3 + x * 0.05) * 2.5;
    const buoyW = bx - st.stX;
    const r = p ? 16 + p.V * 5.6 : 22;
    const z = (SH.st === 'idle' || !p) ? 0 : SH.bz;
    const surf = y0 + wave(bx);
    const by = surf + z;                                    // 부표 중심 높이
    const kitY = by + r + 62, kitX = bx;
    // 물 아래 (먼저 그리고 물을 덮어요)
    if (p) {
      ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by + r * 0.6); ctx.lineTo(kitX, kitY - 22); ctx.stroke();
      drawKit(kitX, kitY, 1);
      drawBuoyBall(bx, by, r, Math.sin(t * 2.1 + bx * 0.024) * 0.07);
    }
    ctx.beginPath(); ctx.moveTo(st.stX, y0 + 6);
    for (let x = st.stX; x <= st.stX + st.stW; x += 8) ctx.lineTo(x, y0 + wave(x));
    ctx.lineTo(st.stX + st.stW, st.stY + st.stH); ctx.lineTo(st.stX, st.stY + st.stH); ctx.closePath();
    const wg = ctx.createLinearGradient(0, y0, 0, st.stY + st.stH); wg.addColorStop(0, 'rgba(56,150,240,.62)'); wg.addColorStop(1, 'rgba(30,64,175,.82)');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = st.stX; x <= st.stX + st.stW; x += 8) { const yy = y0 + wave(x); if (x === st.stX) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
    // 물 위로 드러난 부표 윗부분을 다시 그림 (잠긴 부분은 물에 가려요)
    if (p && by - r < surf + 2) {
      ctx.save(); ctx.beginPath(); ctx.rect(bx - r - 30, st.stY, 2 * r + 60, surf - st.stY + 1); ctx.clip();
      drawBuoyBall(bx, by, r, Math.sin(t * 2.1 + bx * 0.024) * 0.07); ctx.restore();
    }
    ctx.restore();
    // 화살표: 중력(키트)과 부력
    if (p && SH.st !== 'idle') {
      const V = p.V, u = clamp((z + r) / (2 * r), 0, 1), f = u * u * (3 - 2 * u), B = 9.8 * V * f;
      const kc = kitY, k3 = 2.6;
      forceArrow(kitX + 44, kc, 0, 20 * k3, COL.grav, { width: 7, head: 16 });
      pill('중력 20 N (키트)', kitX + 58, kc + 20 * k3 * 0.5, { color: COL.grav, size: 12.5, align: 'left', fit: true });
      if (B > 0.8) {
        forceArrow(bx + r + 20, by + r * 0.5, 0, -B * 2.6, COL.buoy, { width: 8, head: 17 });
        pill('부력 ' + B.toFixed(1) + ' N', bx + r + 28, by + r * 0.5 - B * 2.6 - 18, { color: COL.buoy, size: 13, align: 'left', fit: true });
      }
      if (SH.bv > 2 && f >= 0.98 && !RM && Math.random() < 0.3) FX.emit({ x: bx + (Math.random() - 0.5) * r, y: by - r * 0.4, vx: (Math.random() - 0.5) * 10, vy: -40 - Math.random() * 30, life: 1, size: 3 + Math.random() * 3, color: 'rgba(255,255,255,.9)', shape: 'bubble', gravity: 0 });
    }
    // 오른쪽 안내 패널
    const px = st.stX + st.stW * (PHONE ? 0.58 : 0.56), pw = st.stX + st.stW - px - 16, py = st.stY + 18;
    ctx.save(); rr(px, py, pw, 138, 16); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    txt('🌊 파도 위의 구조 키트', px + 14, py + 24, { align: 'left', size: PHONE ? 13.5 : 15.5, halo: false });
    txt('키트의 무게  20 N', px + 14, py + 56, { align: 'left', size: PHONE ? 12.5 : 14.5, color: COL.grav, halo: false });
    txt(p ? '완전히 잠기면 부력  약 ' + (9.8 * p.V).toFixed(1) + ' N' : '부표를 골라요', px + 14, py + 84, { align: 'left', size: PHONE ? 12.5 : 14.5, color: COL.buoy, halo: false });
    txt('부력은 잠긴 부피가 클수록 커요', px + 14, py + 114, { align: 'left', size: PHONE ? 11.5 : 12.5, color: '#64748b', halo: false });
    if (SH.res) {
      ctx.save(); ctx.globalAlpha = Math.min(1, SH.t / 0.25);
      pill(SH.res.badge, px + pw / 2, py + 166, { solid: true, color: SH.res.ok ? COL.good : COL.warn, size: PHONE ? 13.5 : 15, fit: true });
      ctx.restore();
    }
    if (SH.msg) pill(SH.msg.text, st.stX + st.stW / 2, st.stY + st.stH - 24, { solid: true, color: COL.warn, size: 13.5, fit: true });
  }
  function drawShopWheel(t) {
    const st = SHL;
    ctx.save();
    rr(st.stX + 2, st.stY + 2, st.stW - 4, st.stH - 4, 18); ctx.clip();
    const sg = ctx.createLinearGradient(0, st.stY, 0, st.stY + st.stH); sg.addColorStop(0, '#d6ecff'); sg.addColorStop(1, '#f1f8ff');
    ctx.fillStyle = sg; ctx.fillRect(st.stX, st.stY, st.stW, st.stH);
    // 눈 덮인 비탈
    const ca = Math.cos(SLOPE.ang), sa = Math.sin(SLOPE.ang);
    const x1 = SLOPE.x0 + ca * SLOPE.L + 40, y1 = SLOPE.y0 + sa * SLOPE.L + 8 * sa;
    const p0 = wheelPos(-60);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y + 16); ctx.lineTo(x1, y1 + 16); ctx.lineTo(x1, st.stY + st.stH); ctx.lineTo(p0.x, st.stY + st.stH); ctx.closePath();
    const ig = ctx.createLinearGradient(0, SLOPE.y0, 0, st.stY + st.stH); ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, '#dbeafe');
    ctx.fillStyle = ig; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p0.x, p0.y + 16); ctx.lineTo(x1, y1 + 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(147,197,253,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p0.x, p0.y + 22); ctx.lineTo(x1, y1 + 22); ctx.stroke();
    for (let i = 0; i < 14; i++) { const q = wheelPos(30 + i * 46); const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); ctx.fillStyle = 'rgba(147,197,253,' + (0.4 + 0.5 * tw).toFixed(2) + ')'; ctx.fillRect(q.x + (i % 3) * 8, q.y + 28 + (i % 4) * 12, 3, 3); }
    // 정지선
    const sp = wheelPos(SLOPE.stopS);
    ctx.save(); ctx.translate(sp.x + 16, sp.y + 16); ctx.rotate(SLOPE.ang);
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(-3, -86, 6, 86);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#ef4444'; ctx.fillRect(-3, -86 + i * 14.3, 6, 14.3); }
    ctx.fillStyle = '#ef4444'; rr(-34, -104, 68, 22, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(12.5, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('정지선', 0, -93);
    ctx.restore();
    // 잔상(다중 섬광)
    SH.ghosts.forEach((g) => {
      const q = wheelPos(g.s), al = 0.32 * (1 - g.age / 3);
      ctx.save(); ctx.translate(q.x, q.y + 4); ctx.rotate(SLOPE.ang);
      ctx.strokeStyle = 'rgba(71,85,105,' + al.toFixed(3) + ')'; ctx.fillStyle = 'rgba(100,116,139,' + (al * 0.45).toFixed(3) + ')'; ctx.lineWidth = 2;
      rr(-38, -50, 76, 40, 8); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    // 수레
    const sel = shopSel(), p = sel >= 0 ? PARTS.wheel[sel] : null;
    const cs = SH.st === 'idle' || !p ? SLOPE.s0 : SH.cs;
    const q = wheelPos(cs);
    let shake = 0; if (SH.crash > 0 && SH.crash < 0.5) shake = Math.sin(SH.crash * 60) * 4 * (1 - SH.crash / 0.5);
    ctx.save(); ctx.translate(q.x + shake, q.y + 4); ctx.rotate(SLOPE.ang);
    softShadow(0, 18, 46, 6, 0.25);
    const bg = ctx.createLinearGradient(0, -52, 0, -12); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bg; rr(-40, -52, 80, 34, 9); ctx.fill(); ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2.4; rr(-40, -52, 80, 34, 9); ctx.stroke();
    ctx.fillStyle = '#dbeafe'; rr(-14, -46, 34, 18, 5); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(34, -40, 4, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.translate(q.x + shake, q.y + 4); ctx.rotate(SLOPE.ang);
    const wt = p ? p.id : 'smooth';
    drawWheel(-24, -8, 14, wt, SH.wheelRot || 0); drawWheel(24, -8, 14, wt, SH.wheelRot || 0);
    ctx.restore();
    // 화살표: 마찰력(갈색) · 알짜힘(보라) · 운동 방향(회색)
    if (p && SH.st !== 'idle') {
      const net = 3 - p.f, dirx = ca, diry = sa;
      const fx = q.x - 24 * ca + 8 * sa, fy = q.y + 4 - 24 * sa - 8 * ca + 14;
      forceArrow(q.x - 24, q.y + 22, -dirx * p.f * 14, -diry * p.f * 14, COL.fric, { width: 7, head: 15 });
      pill('마찰력 ' + p.f + ' N', q.x - 24 - dirx * p.f * 14 - 10, q.y + 44, { color: COL.fric, size: 12.5, align: 'right', fit: true });
      if (SH.cv > 4) {
        const mx = q.x + 6, my = q.y - 70;
        hollowArrow(mx, my, dirx * Math.min(120, SH.cv * 0.45), diry * Math.min(120, SH.cv * 0.45), { width: 12, head: 17 });
        pill('속력 ' + (SH.cv / 100).toFixed(1) + ' m/s', mx + dirx * Math.min(120, SH.cv * 0.45) * 0.5 + 6, my + diry * Math.min(120, SH.cv * 0.45) * 0.5 - 24, { color: COL.motion, size: 12.5, fit: true });
      }
    }
    // 안내와 결과
    txt('눈 덮인 비탈', st.stX + 20, st.stY + 28, { align: 'left', size: 14, color: '#475569', halo: false });
    if (SH.res) { ctx.save(); ctx.globalAlpha = Math.min(1, SH.t / 0.25); pill(SH.res.badge, st.stX + st.stW * 0.5, st.stY + st.stH - 30, { solid: true, color: SH.res.ok ? COL.good : COL.warn, size: 15, fit: true }); ctx.restore(); }
    if (SH.msg) pill(SH.msg.text, st.stX + st.stW / 2, st.stY + st.stH - 24, { solid: true, color: COL.warn, size: 13.5, fit: true });
  }
  function drawShop(dt, t) {
    ctx.fillStyle = '#eef5ff'; ctx.fillRect(0, 0, W, H);
    const st = SHL, T = TASKS[SH.task];
    // 설계 과제 카드
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.14)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(st.stX, 8, st.stW, 50, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f26b3a'; rr(st.stX, 8, 8, 50, 4); ctx.fill();
    txt('📝 ' + T.title, st.stX + 22, 26, { align: 'left', size: PHONE ? 14 : 16.5, halo: false });
    txt(T.need, st.stX + 22, 46, { align: 'left', size: PHONE ? 11.5 : 13, color: '#475569', weight: 700, halo: false });
    // 시험 무대
    ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.12)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    rr(st.stX, st.stY, st.stW, st.stH, 18); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.save(); rr(st.stX, st.stY, st.stW, st.stH, 18); ctx.clip();
    if (SH.task === 'scale') drawShopScale(t); else if (SH.task === 'buoy') drawShopBuoy(t); else drawShopWheel(t);
    ctx.restore();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rr(st.stX, st.stY, st.stW, st.stH, 18); ctx.stroke();
    drawShopCards();
    if (isNew('workshop') && shopSel() < 0 && SH.st === 'idle') { const r = cardRect(1); newTag(r.x, r.y, r.w, r.h); }
  }


  /* =========================================================
     장면 전환 · 조작판 · 측정값
     ========================================================= */
  let scene = 'desk';
  const trans = { t: 1 };
  const sceneLabel = () => ({
    desk: '📚 책상 위의 책 <small>(옆에서 본 모습)</small>',
    fbd: '✏️ ' + fbCase().name + ' <small>(힘 그림)</small>',
    boat: '🚤 짐을 실은 배 <small>(옆에서 본 모습)</small>',
    shop: '🛠️ 설계 공방 <small>· ' + TASKS[SH.task].label + '</small>',
  }[scene]);
  function setScene(s, force) {
    const changed = s !== scene;
    scene = s;
    if (changed || force) {
      trans.t = RM ? 1 : 0;
      badges.length = 0; FX.clear(); hideHint();
      if (s === 'desk') deskReset(1);
      else if (s === 'fbd') fbReset(FB.case);
      else if (s === 'boat') boatReset();
      else if (s === 'shop') shopReset(SH.task, false);
    }
    syncScene();
  }
  let lastFree = null;
  function syncScene() {
    $('#sceneLabel').innerHTML = sceneLabel();
    const free = !!(game && game.free);
    lastFree = free;
    const show = (sel, b) => $(sel).classList.toggle('off', !b);
    show('#grpDesk', scene === 'desk'); show('#grpFbd', scene === 'fbd' && !FB.quiz); show('#grpBoat', scene === 'boat'); show('#grpShop', scene === 'shop');
    show('#grpFree', free); show('#fbCases', free && scene === 'fbd'); show('#shopTasks', free && scene === 'shop');
    $('#ctrlCard').hidden = !(scene !== 'fbd' || !FB.quiz || free);
    $$('#freeGrid .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.free === scene));
    $$('#fbCases .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.case === FB.case));
    $$('#shopTasks .chip-btn').forEach((b) => b.classList.toggle('on', b.dataset.task === SH.task));
    if (scene === 'shop') $('#shopTitle').textContent = '🛠️ ' + TASKS[SH.task].label;
    syncDesk(); syncShop();
  }
  function syncDesk() {
    const btn = $('#deskBtn'); if (!btn) return;
    btn.textContent = DK.mode === 'on' ? '🪑 책상 치우기' : DK.mode === 'restoring' ? '🪑 책상 놓는 중…' : '🪑 책상 다시 놓기';
    btn.disabled = DK.mode === 'restoring';
    const live = DK.books.filter((b) => !b.leave).length, rest = DK.mode === 'on' || DK.mode === 'landed';
    $('#bookAdd').disabled = !rest || live >= 3 || DK.books.some((b) => !b.landed);
    $('#bookSub').disabled = !rest || live <= 1;
    $('#deskNote').innerHTML = DK.mode === 'on' ? '책 한 권의 무게는 <b>5 N</b>이에요. 책을 쌓으면 화살표가 어떻게 달라질까요?' : DK.mode === 'landed' || DK.mode === 'falling' ? '책상이 없으니 책이 떨어졌어요! 바닥에 닿으면 <b>바닥</b>이 책을 떠받쳐요.' : '책상을 다시 가져오고 있어요…';
  }
  function syncBoat() { /* 읽기 전용 값은 updateReadouts에서 */ }
  function syncShop() {
    const b = $('#shopTest'); if (!b) return;
    b.disabled = SH.st === 'run';
    b.textContent = SH.st === 'run' ? '⏳ 시험 중…' : SH.st === 'done' ? '🧪 다시 시험하기' : '🧪 시험하기';
    const task = SH.task;
    $('#shopNote').innerHTML = task === 'scale' ? '용수철을 <b>눌러 고르고</b> 10 N 추를 매달아 시험해요.' : task === 'buoy' ? '부표를 <b>눌러 고르고</b> 파도 위에서 시험해요.' : '바퀴를 <b>눌러 고르고</b> 비탈에서 시험해요.';
  }

  /* 측정값 (0.1초마다 갱신) */
  let lastUI = 0;
  const roCache = {};
  function ro(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#rL' + i).textContent = label; $('#rV' + i).innerHTML = value;
  }
  const small = (s) => '<span style="font-size:15px">' + s + '</span>';
  const dirN = (n, up) => (Math.abs(n) < 0.5 ? '0<small>N</small>' : Math.round(n) + '<small>N ' + (up ? '↑' : '↓') + '</small>');
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (scene === 'desk') {
      const Wn = dkW(), S = DK.mode === 'falling' || DK.mode === 'restoring' ? 0 : dkSupport(), net = Wn - S;
      ro(1, '중력', Wn + '<small>N ↓</small>');
      ro(2, '떠받치는 힘', Math.round(S) + '<small>N ↑</small>');
      ro(3, '알짜힘', Math.abs(net) < 0.6 ? '0<small>N</small>' : Math.round(Math.abs(net)) + '<small>N ' + (net > 0 ? '↓' : '↑') + '</small>');
    } else if (scene === 'fbd' && FB.quiz) {
      ro(1, '대상 물체', small('밀어도 정지한 상자'));
      ro(2, '주어진 힘', small('미는 힘 ' + FB.quiz + ' N →'));
      ro(3, '바닥이 작용하는 마찰력', FB.v.fric == null ? '?' : small('마찰력 ' + FB.v.fric + ' N ←'));
    } else if (scene === 'fbd') {
      const c = fbCase(), g0 = Object.keys(c.given)[0], own = FB.v[c.need];
      ro(1, '대상 물체', small(c.name));
      ro(2, '주어진 힘', small(FT[g0].name + ' ' + c.given[g0] + ' N ' + (c.axis === 'y' ? '↓' : '→')));
      ro(3, '내가 그린 힘', own == null ? '—' : small(FT[c.need].name + ' ' + own + ' N ' + (c.need === 'fric' ? '←' : '↑')));
    } else if (scene === 'boat') {
      const n = boatLoaded();
      ro(1, '실은 짐', n + '<small>개</small>');
      ro(2, '중력 (배 + 짐)', boatW() + '<small>N ↓</small>');
      ro(3, '부력', Math.round(boatB()) + '<small>N ↑</small>');
    } else if (scene === 'shop') {
      const sel = shopSel(), p = sel >= 0 ? PARTS[SH.task][sel] : null;
      if (SH.task === 'scale') {
        ro(1, '선택한 용수철', p ? small(p.name) : '—');
        ro(2, '10 N에서 늘어난 길이', SH.st === 'idle' ? '—' : SH.ext.value.toFixed(1) + '<small>cm</small>');
        ro(3, '눈금판 길이', '10<small>cm</small>');
      } else if (SH.task === 'buoy') {
        ro(1, '선택한 부표', p ? small(p.name) : '—');
        ro(2, '완전히 잠길 때 부력', p ? (9.8 * p.V).toFixed(1) + '<small>N</small>' : '—');
        ro(3, '키트의 무게', '20<small>N</small>');
      } else {
        ro(1, '선택한 바퀴', p ? small(p.name) : '—');
        ro(2, '눈 위 마찰력', p && SH.st !== 'idle' ? p.f + '<small>N</small>' : '—');
        ro(3, '수레의 속력', SH.st === 'idle' ? '—' : (SH.cv / 100).toFixed(1) + '<small>m/s</small>');
      }
    }
  }
  $('#rV3').style.color = '';

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    hover(p) {
      if (scene === 'fbd') { const hp = fbHandlePos(); if (hp && Math.hypot(p.x - hp.x, p.y - hp.y) < 30) return FB.case === 'C' ? 'ew-resize' : 'ns-resize'; return FTYPES.some((f) => { const cp = FB.chipPos[f.id]; return p.x >= cp.x && p.x <= cp.x + PAL.cw && p.y >= cp.y && p.y <= cp.y + PAL.ch; }) ? 'grab' : null; }
      if (scene === 'boat') return boatBoxAt(p) ? 'grab' : null;
      if (scene === 'shop') return shopCardAt(p) >= 0 ? 'pointer' : null;
      return null;
    },
    down(p) {
      if (scene === 'fbd') return fbDown(p);
      if (scene === 'boat') return boatDown(p);
      if (scene === 'shop') { const i = shopCardAt(p); if (i >= 0) shopSelect(i); return false; }
      return false;
    },
    move(p) {
      if (scene === 'fbd') fbMove(p); else if (scene === 'boat') boatMove(p);
    },
    up(p) {
      if (scene === 'fbd') fbUp(p); else if (scene === 'boat') boatUp(p);
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      const p = view.toLocal(tc);
      let hit = false;
      if (scene === 'fbd') { const hp = fbHandlePos(); hit = (hp && Math.hypot(p.x - hp.x, p.y - hp.y) < 30) || FTYPES.some((f) => { const cp = FB.chipPos[f.id]; return p.x >= cp.x && p.x <= cp.x + PAL.cw && p.y >= cp.y && p.y <= cp.y + PAL.ch; }); }
      else if (scene === 'boat') hit = !!boatBoxAt(p);
      else if (scene === 'shop') hit = shopCardAt(p) >= 0;
      if (hit) e.preventDefault();
    }, { passive: false });
  }

  $('#deskBtn').addEventListener('click', deskToggle);
  $('#bookAdd').addEventListener('click', bookAdd);
  $('#bookSub').addEventListener('click', bookSub);
  $('#fbClear').addEventListener('click', () => { fbClear(); });
  $('#boatClear').addEventListener('click', () => { Sound.click(); BT.boxes.forEach((b) => { if (b.st === 'boat') { const w = boatToWorld(b.lx, b.ly); b.x = w.x; b.y = w.y - CBH / 2; b.st = 'dock'; b.land = false; b.slot = -1; } }); syncBoat(); });
  $('#shopTest').addEventListener('click', shopTest);
  $$('#fbCases .chip-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); fbReset(b.dataset.case); syncScene(); }));
  $$('#shopTasks .chip-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); shopReset(b.dataset.task, false); syncScene(); }));
  $$('#freeGrid .chip-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.free, true); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'desk') deskReset(1); else if (scene === 'fbd') fbReset(FB.case); else if (scene === 'boat') boatReset(); else shopReset(SH.task, false);
  });

  /* 엔진의 「✔ 확인하기」를 사용자가 눌렀을 때만 판정 효과(고스트 미리보기 등)를 보여 줘요. (엔진은 판정 함수를 계속 다시 부르므로) */
  let userCheck = false;
  $('#game').addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) userCheck = true; }, true);
  const takeUser = () => { const u = userCheck; userCheck = false; return u; };

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const vArrow = (x, y1, y2, color, w) => {
    const dir = y2 > y1 ? 1 : -1, hy = y2 - dir * 13;
    return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + hy + '" stroke="' + color + '" stroke-width="' + (w || 6) + '" stroke-linecap="round"/><path d="M' + x + ' ' + y2 + ' L' + (x - 8) + ' ' + hy + ' L' + (x + 8) + ' ' + hy + ' Z" fill="' + color + '"/>';
  };
  const hArrow = (x1, y, x2, color, w) => {
    const dir = x2 > x1 ? 1 : -1, hx = x2 - dir * 13;
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + hx + '" y2="' + y + '" stroke="' + color + '" stroke-width="' + (w || 6) + '" stroke-linecap="round"/><path d="M' + x2 + ' ' + y + ' L' + hx + ' ' + (y - 8) + ' L' + hx + ' ' + (y + 8) + ' Z" fill="' + color + '"/>';
  };
  const SVG_BOOK = '<svg viewBox="0 0 320 150" width="320" role="img" aria-label="책상 위의 책에 작용하는 중력과 떠받치는 힘" style="max-width:100%" ' + SVGF + '>' +
    '<rect width="320" height="150" rx="12" fill="#fff7ed"/>' +
    '<rect x="50" y="104" width="220" height="14" rx="5" fill="#d99a52"/><rect x="66" y="118" width="12" height="28" fill="#a96f33"/><rect x="242" y="118" width="12" height="28" fill="#a96f33"/>' +
    '<rect x="112" y="76" width="96" height="14" rx="3" fill="#60a5fa"/><rect x="112" y="90" width="96" height="14" rx="3" fill="#fb7185"/>' +
    vArrow(144, 90, 140, COL.grav, 5) + vArrow(176, 104, 44, COL.supp, 5) +
    '<text x="60" y="136" font-size="13" font-weight="800" fill="#be123c">중력 ↓</text>' +
    '<text x="196" y="40" font-size="13" font-weight="800" fill="#0f766e">떠받치는 힘 ↑</text>' +
    '<text x="160" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#475569">크기가 같고 방향이 반대 → 평형</text></svg>';
  const SVG_EQ4 = '<svg viewBox="0 0 320 112" width="320" role="img" aria-label="정지한 물체의 힘의 평형 세 가지" style="max-width:100%" ' + SVGF + '>' +
    '<rect width="320" height="112" rx="12" fill="#f8fafc"/>' +
    '<rect x="42" y="38" width="30" height="34" rx="6" fill="#94a3b8"/>' + vArrow(50, 38, 14, COL.elas, 5) + vArrow(64, 56, 92, COL.grav, 5) +
    '<text x="57" y="106" text-anchor="middle" font-size="12" font-weight="800" fill="#15803d">탄성력 = 중력</text>' +
    '<ellipse cx="160" cy="58" rx="30" ry="15" fill="#facc15" stroke="#a16207" stroke-width="2"/><rect x="120" y="62" width="80" height="34" fill="#60a5fa" fill-opacity=".5"/>' + vArrow(148, 64, 28, COL.buoy, 5) + vArrow(172, 56, 90, COL.grav, 5) +
    '<text x="160" y="106" text-anchor="middle" font-size="12" font-weight="800" fill="#0369a1">부력 = 중력</text>' +
    '<rect x="248" y="46" width="44" height="34" rx="5" fill="#e7b97c" stroke="#7c4a1c" stroke-width="2"/>' + hArrow(220, 62, 246, COL.push, 5) + hArrow(270, 90, 244, COL.fric, 5) +
    '<text x="262" y="106" text-anchor="middle" font-size="12" font-weight="800" fill="#92400e">마찰력 = 미는 힘</text></svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  game = SciSim.game({
    simId: 'm1-force-design',
    mount: '#game',
    badge: '평형 설계사',
    homeHref: '../../index.html#g1',
    featureLabels: {
      table: '🪑 책상 치우기',
      stack: '📚 책 쌓기',
      zoom: '🔍 확대 모형',
      fbd: '✏️ 힘 칩으로 힘 그림 그리기',
      boat: '🚤 짐 싣는 배',
      workshop: '🛠️ 설계 공방',
    },
    onFeatures(set) { feat = set; if (game) syncScene(); },
    onMissionStart(m) {
      if (m.fbCase) FB.case = m.fbCase;
      if (m.shTask) SH.task = m.shTask;
      if (m.scene) setScene(m.scene, !!m.fresh);
    },
    levels: [
      /* ---------------- STEP 1 · 관찰 ---------------- */
      {
        title: '책상 위의 책', short: '떠받치는 힘', icon: '📚', phase: '관찰',
        features: ['table', 'stack', 'zoom'],
        intro: '<p class="si-q">❓ 탐구 질문: 중력이 계속 당기는데, 책상 위의 책은 왜 떨어지지 않을까?</p>' +
          '<p>책은 가만히 놓여 있어요. 그렇다면 책에 작용하는 힘은 없을까요? <b>책상을 치워 보고</b>, <b>책을 쌓아 가며</b> 알아봐요.</p>',
        setup() { setScene('desk', true); },
        recap: '바닥(책상)은 물체를 위로 <b>떠받치는 힘</b>을 작용해요. 정지한 책에는 중력과 떠받치는 힘이 크기가 같고 방향이 반대라서 평형을 이뤄요.',
        summary: '<p>' + SVG_BOOK + '</p><ul><li>바닥에 놓인 물체에는 <b>중력(↓)</b>과 바닥이 위로 <b>떠받치는 힘(↑)</b>이 작용해요.</li>' +
          '<li>정지한 물체는 두 힘의 <b>크기가 같고 방향이 반대</b>라서 합력이 0이에요. → <b>힘의 평형</b></li>' +
          '<li>물체가 <b>무거울수록</b> 떠받치는 힘도 커져요. (책 1권 5 N → 3권 15 N)</li></ul>',
        missions: [
          {
            scene: 'desk', fresh: true,
            title: '책상이 없다면?',
            goal: '<b>🪑 책상 치우기</b>를 눌러 무슨 일이 생기는지 보세요. 그다음 <b>🪑 책상 다시 놓기</b>로 제자리에 돌려놓아요.',
            hint: '버튼을 한 번 눌러 책상을 치우고, 책이 떨어지는 모습을 지켜본 뒤 다시 눌러요.',
            setup() { deskReset(1); DK.removedOnce = false; DK.restoredOnce = false; showHint('🪑 책상 치우기를 눌러 보세요', 7000); },
            check: () => DK.removedOnce && DK.restoredOnce && DK.mode === 'on',
            status: () => chip(DK.removedOnce, '책상 치우기') + ' · ' + chip(DK.restoredOnce, '다시 놓기'),
            hold: 0.4,
            explain: '책상을 치우자 책이 <b>점점 빨라지며</b> 떨어졌어요. 책상이 있을 때는 떨어지지 않았으니, <b>책상이 책을 위로 떠받치고</b> 있었다는 뜻이에요. 이 힘을 <b>떠받치는 힘</b>이라고 해요.' +
              '<br>책상이 없으면 중력만 남아 알짜힘이 0이 아니고, 그래서 책의 속력이 변해요.',
          },
          {
            scene: 'desk',
            title: '책 쌓기',
            goal: '<b>📚 책 올리기</b>로 책을 <b>3권</b>까지 쌓아 보세요. 두 화살표(중력 · 떠받치는 힘)와 확대 그림 속 작은 용수철을 살펴봐요.',
            hint: '책을 하나 올릴 때마다 화살표 길이와 작은 용수철이 눌리는 정도가 어떻게 변하는지 보세요.',
            setup() { deskReset(1); showHint('📚 책 올리기를 눌러 3권까지 쌓아요', 7000); },
            check: () => landedN() === 3 && DK.mode === 'on' && dkSettled(),
            status: () => '책 <b>' + landedN() + '권</b> · 중력 <b>' + dkW() + ' N</b> · 떠받치는 힘 <b>' + Math.round(dkSupport()) + ' N</b>' + (landedN() === 3 ? ' ✅' : ''),
            hold: 1.0,
            explain: '책이 한 권 늘 때마다 중력이 5 N씩 커졌어요. 책상이 떠받치는 힘도 <b>같은 크기</b>로 함께 커져서 두 힘이 계속 평형을 이뤄요.' +
              '<br>확대해 보면 책상 표면이 아주 조금 눌리며 용수철처럼 <b>되돌아가려는 힘</b>(탄성력)으로 책을 떠받쳐요. 무거울수록 더 많이 눌려요.',
          },
          {
            scene: 'desk',
            type: 'quiz',
            title: '책상 위의 책에 작용하는 힘',
            goal: '책상 위에 가만히 놓여 있는 책에 작용하는 힘에 대한 설명으로 옳은 것은?',
            choices: ['아래로 중력, 위로 떠받치는 힘이 작용하고, 두 힘의 크기가 같아 평형을 이룬다', '정지해 있으니 중력만 작용한다', '떠받치는 힘이 중력보다 커서 책이 떨어지지 않는다', '책상은 힘을 줄 수 없어서 책에는 힘이 작용하지 않는다'],
            answer: 0,
            feedback: ['', '책상을 치우면 책이 떨어졌어요. 책상이 책을 받치는 힘이 있었다는 뜻이에요.', '두 화살표의 길이를 비교해 보세요. 크기가 같았나요? 떠받치는 힘이 더 크면 책이 위로 움직이게 돼요.', '가만히 있는 물체도 힘을 줄 수 있어요. 책상이 없으면 책이 떨어졌잖아요.'],
            explain: '책에는 <b>중력(아래)</b>과 <b>떠받치는 힘(위)</b> 두 힘이 작용해요. 크기가 같고 방향이 반대이며 같은 작용선 위에 있어서 <b>합력이 0</b>이므로 힘의 평형이에요. 정지해 있어도 힘이 없는 것이 아니에요.',
          },
        ],
      },
      /* ---------------- STEP 2 · 탐구 ---------------- */
      {
        title: '여러 사례에서 평형 찾기', short: '평형 찾기', icon: '🔎', phase: '탐구',
        features: ['fbd'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바닥이 물체를 위로 떠받치는 힘이 있고, 정지한 물체에서는 중력과 크기가 같아 평형을 이루는 것을 알았어요.</div>' +
          '<p>이번에는 <b>다른 정지한 사례</b> 세 가지에서 어떤 힘이 평형을 이루는지 <b>힘 그림</b>을 직접 그려 봐요.</p>' +
          '<p>오른쪽의 <b>힘 칩</b>을 끌어다 물체 위에 놓으면 화살표가 생겨요. 화살표 끝을 끌어 크기를 정한 뒤 <b>✔ 확인하기</b>를 눌러요.</p>',
        setup() { setScene('fbd', true); },
        recap: '정지한 물체에는 크기가 같고 방향이 반대인 힘이 작용해 평형을 이뤄요: 매달린 물체(중력 + 탄성력), 떠 있는 물체(중력 + 부력), 밀어도 정지한 물체(미는 힘 + 마찰력).',
        summary: '<p>' + SVG_EQ4 + '</p><ul><li>용수철에 <b>매달려 정지한 물체</b>: 중력(↓) = <b>탄성력</b>(↑)</li>' +
          '<li>물에 <b>떠서 정지한 물체</b>: 중력(↓) = <b>부력</b>(↑)</li>' +
          '<li>밀어도 <b>움직이지 않는 물체</b>: 미는 힘(→) = <b>마찰력</b>(←)</li>' +
          '<li>움직이지 않아도 힘이 없는 것이 아니에요. 두 힘이 서로 비길 뿐이에요.</li></ul>',
        missions: [
          {
            scene: 'fbd', fbCase: 'A', fresh: true, manual: true,
            title: '용수철에 매달린 추',
            goal: '추에 작용하는 <b>중력 5 N</b>은 이미 그려져 있어요. 빠진 힘을 힘 칩에서 골라 놓고, 화살표 끝을 끌어 크기를 정한 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '추는 가만히 매달려 있어요. 중력(아래)과 평형을 이루려면 위쪽으로 당기는 힘이 필요해요. 위에서 추를 당기는 것은 무엇일까요?',
            setup() { fbReset('A'); showHint('✏️ 오른쪽 힘 칩을 끌어다 추 위에 놓아요', 8000); },
            check() { const r = fbJudge(); if (takeUser()) fbVerdictFx(r); return r.ok ? true : r.msg; },
            explain: '추는 정지해 있으니 힘의 평형이에요. 중력 5 N(↓)과 크기가 같고 방향이 반대인 <b>탄성력 5 N(↑)</b>이 용수철에서 작용해요. 이것이 용수철저울의 원리예요.',
          },
          {
            scene: 'fbd', fbCase: 'B', fresh: true, manual: true,
            title: '물에 떠 있는 오리 튜브',
            goal: '오리 튜브가 물에 떠서 가만히 있어요. <b>중력 3 N</b>이 그려져 있어요. 빠진 힘을 그려 평형을 만들어 보세요.',
            hint: '물이 튜브를 위로 밀어 올려요. 물속에서 위로 작용하는 힘을 뭐라고 했죠?',
            setup() { fbReset('B'); },
            check() { const r = fbJudge(); if (takeUser()) fbVerdictFx(r); return r.ok ? true : r.msg; },
            explain: '튜브가 물에 떠서 정지해 있으니 평형이에요. 중력 3 N(↓)과 크기가 같고 방향이 반대인 <b>부력 3 N(↑)</b>이 작용해요.',
          },
          {
            scene: 'fbd', fbCase: 'C', fresh: true, manual: true,
            title: '밀어도 정지한 상자',
            goal: '상자를 오른쪽으로 <b>20 N</b>의 힘으로 밀고 있는데도 움직이지 않아요. <b>수평 방향</b>의 힘만 생각해서 빠진 힘을 그려요.',
            hint: '상자가 움직이지 않으니 미는 힘과 비기는 힘이 있어요. 바닥이 상자를 붙잡고 있는 힘이에요. 방향은 미는 힘과 반대예요.',
            setup() { fbReset('C'); },
            check() { const r = fbJudge(); if (takeUser()) fbVerdictFx(r); return r.ok ? true : r.msg; },
            explain: '상자가 움직이지 않으니 수평 방향도 평형이에요. 미는 힘 20 N(→)과 크기가 같고 방향이 반대인 <b>마찰력 20 N(←)</b>이 바닥에서 작용해요. 움직이지 않아도 마찰력은 있어요.',
          },
        ],
      },
      /* ---------------- STEP 3 · 설명 ---------------- */
      {
        title: '힘의 평형 관계', short: '평형 관계', icon: '⚖️', phase: '설명',
        features: ['boat'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정지한 물체에서는 크기가 같고 방향이 반대인 두 힘이 평형을 이루는 것을 확인했어요.</div>' +
          '<p>그런데 물체의 <b>무게가 바뀌면</b> 어떻게 될까요? 장난감 배에 짐을 싣고, 밀어도 정지한 상자를 살피며 <b>다른 힘도 함께 바뀌어 다시 평형</b>을 이루는 것을 알아봐요.</p>',
        setup() { setScene('boat', true); },
        recap: '물체의 무게(중력)가 바뀌면 부력·마찰력 같은 다른 힘도 <b>함께 바뀌어 다시 평형</b>을 이뤄요.',
        summary: '<ul><li>배에 짐을 실으면 <b>중력이 커져요</b>. 배가 더 깊이 잠겨 <b>부력도 커지고</b>, 두 힘이 같아지는 곳에서 다시 평형을 이뤄요.</li>' +
          '<li>밀어도 정지한 상자: 미는 힘이 커지면 <b>마찰력도 같은 크기로 커져서</b> 평형이 유지돼요 (어느 한계까지).</li>' +
          '<li>평형이면 힘이 여러 개여도 <b>합력은 0</b>이에요.</li></ul>',
        missions: [
          {
            scene: 'boat', fresh: true,
            title: '짐을 실은 배',
            goal: '배(10 N)에 짐 상자(5 N씩)를 끌어 실어서, 배가 <b>초록 목표선</b>까지 잠기게(중력 25 N) 해 보세요. 짐을 실을 때마다 <b>부력 화살표</b>를 살펴봐요.',
            hint: '짐 상자를 3개 실으면 25 N이에요. 너무 많이 실었다면 배 위의 상자를 눌러서 내려요.',
            setup() { boatReset(); showHint('🚤 짐 상자를 끌어다 배에 실어요', 7000); },
            check: () => boatLoaded() === 3 && Math.abs(BT.d - D_T) < 1.6 && Math.abs(BT.vd) < 4 && !BT.drag,
            status: () => '배 + 짐 = <b>' + boatW() + ' N</b> ' + (boatW() === 25 ? '✅' : '⬜ <small>(25 N이 되게)</small>') + '<br>' + chip(boatLoaded() === 3 && Math.abs(BT.d - D_T) < 1.6, '물이 목표선에 닿고 평형!'),
            hold: 1.0,
            explain: '짐을 실어 중력이 커지자 배가 더 깊이 잠겼어요. 잠기는 부피가 늘어나 <b>부력도 함께 커져서</b> 중력과 다시 크기가 같아졌고, 배는 새 자리에서 평형을 이뤄요.',
          },
          {
            scene: 'fbd', fbCase: 'C', fresh: true, fbQuiz: 30,
            type: 'quiz',
            setup() { fbQuiz(30); },
            title: '30 N으로 밀어도 정지한 상자',
            goal: '바닥에 놓인 상자를 오른쪽으로 <b>30 N</b>의 힘으로 밀었는데도 움직이지 않아요. 이때 바닥이 상자에 작용하는 <b>마찰력</b>의 크기는? (앞에서는 20 N으로 밀었어요)',
            choices: ['30 N', '20 N 그대로', '0 N', '30 N보다 크다'],
            answer: 0,
            feedback: ['', '미는 힘이 20 N에서 30 N으로 커졌어요. 마찰력이 20 N 그대로라면 상자는 어느 쪽으로 움직일까요?', '마찰력이 없다면 상자는 미는 방향으로 움직여요. 움직이지 않으니 마찰력이 있어요.', '마찰력이 더 크다면 상자가 반대쪽(왼쪽)으로 움직이게 돼요. 상자는 움직이지 않아요.'],
            explain: '상자가 움직이지 않으니 평형이에요. 미는 힘이 30 N이면 마찰력도 <b>30 N</b>이어야 크기가 같아요. 미는 힘이 커지면 마찰력도 함께 커져서 다시 평형을 이뤄요 (어느 한계까지).',
          },
        ],
      },
      /* ---------------- STEP 4 · 적용 ---------------- */
      {
        title: '힘을 이용한 장치 설계', short: '장치 설계', icon: '🛠️', phase: '적용',
        features: ['workshop'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘의 평형 관계를 알았어요. 이제 힘의 <b>특징</b>을 이용해 장치를 설계해요.</div>' +
          '<p>탄성력은 <b>늘어난 길이에 비례</b>하고, 부력은 <b>잠긴 부피가 클수록</b> 커요. 마찰력은 접촉면이 <b>거칠수록</b> 커요.</p>' +
          '<p><b>설계 공방</b>의 과제 3개를 해결해요. 부품을 골라 <b>🧪 시험하기</b>로 확인한 뒤 <b>✔ 확인하기</b>를 눌러요.</p>',
        setup() { setScene('shop', true); },
        recap: '힘의 특징(탄성력은 늘어난 길이에 비례, 부력은 잠긴 부피가 클수록 큼, 마찰력은 접촉면이 거칠수록 큼)을 이용해 장치를 설계할 수 있어요.',
        summary: '<ul><li><b>용수철저울</b>: 탄성력이 늘어난 길이에 <b>비례</b>하는 것을 이용해요. 최대 10 N일 때 눈금판(10 cm)에 딱 맞는 용수철(1 N에 1 cm)을 골라요.</li>' +
          '<li><b>구조용 부표</b>: 부력은 잠긴 부피가 클수록 커요. 20 N 키트를 띄우려면 완전히 잠겼을 때 부력이 20 N보다 큰 부표(3 L)가 필요해요.</li>' +
          '<li><b>눈길 미끄럼 방지</b>: 접촉면이 거칠수록 마찰력이 커요. 눈길에서는 체인을 감은 바퀴가 수레를 멈추게 해요.</li></ul>',
        missions: [
          {
            scene: 'shop', shTask: 'scale', fresh: true, manual: true,
            title: '휴대용 용수철저울',
            goal: '눈금판 길이가 <b>10 cm</b>이고 <b>최대 10 N</b>까지 잴 수 있는 저울을 만들어요. 용수철 A·B·C 중 하나를 골라 <b>🧪 시험하기</b>(10 N 추)로 확인한 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '탄성력은 늘어난 길이에 비례해요. 10 N을 달았을 때 늘어난 길이가 눈금판 10 cm에 딱 맞아야 해요.',
            setup() { shopReset('scale', true); showHint('용수철 카드를 눌러 고르고 🧪 시험하기를 눌러요', 8000); },
            check() { return shopJudge('scale', takeUser()); },
            get explain() {
              return '탄성력은 용수철이 늘어난 길이에 <b>비례</b>해요. 1 N에 1 cm 늘어나는 용수철 B는 10 N일 때 10 cm 늘어나 눈금판에 딱 맞아요. 용수철 A는 20 cm로 눈금판을 넘고, 용수철 C는 5 cm만 늘어나 눈금이 촘촘해져요.' +
                (SH.sel.scale === 2 ? '<br>⭐ 용수철 C도 쓸 수는 있지만 눈금이 촘촘해서 읽기 어려웠어요. 더 읽기 쉬운 용수철을 고르면 더 좋은 설계예요.' : '');
            },
          },
          {
            scene: 'shop', shTask: 'buoy', fresh: true, manual: true,
            title: '구조용 부표',
            goal: '<b>20 N</b> 구조 키트를 매단 부표가 파도 위에 <b>떠 있어야</b> 해요. 부표(1 L, 2 L, 3 L) 중 하나를 골라 <b>🧪 시험하기</b>로 확인한 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '부력은 물에 잠긴 부피가 클수록 커요. 완전히 잠겼을 때의 부력이 키트의 무게 20 N보다 커야 해요.',
            setup() { shopReset('buoy', true); },
            check() { return shopJudge('buoy', takeUser()); },
            explain: '부력은 물에 <b>잠긴 부피가 클수록</b> 커요. 3 L 부표는 일부만 잠겨도 부력이 키트의 중력 20 N과 같아져서 평형을 이루며 떠 있어요. 1 L·2 L 부표는 완전히 잠겨도 부력이 20 N에 모자라 가라앉아요.',
          },
          {
            scene: 'shop', shTask: 'wheel', fresh: true, manual: true,
            title: '눈길 미끄럼 방지',
            goal: '눈 덮인 비탈을 내려가던 수레가 <b>정지선 앞에서 멈춰야</b> 해요. 바퀴를 하나 골라 <b>🧪 시험하기</b>로 확인한 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '마찰력은 접촉면이 거칠수록 커요. 눈 위에서 수레를 멈추려면 마찰력이 커야 해요.',
            setup() { shopReset('wheel', true); },
            check() { return shopJudge('wheel', takeUser()); },
            explain: '접촉면이 거칠수록 마찰력이 커요. 체인을 감은 바퀴는 눈과의 접촉면이 거칠어서 마찰력이 커요. 마찰력이 운동 반대 방향의 알짜힘을 만들어 수레가 <b>정지선 앞에서 멈췄어요</b>.',
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
      if (m && m.fbQuiz) { fbQuizReveal(); celebrate(OX, 318, 56); }
      if (m && m.type === 'task') {
        if (scene === 'desk') celebrate(SX, DKY - 50, 56);
        else if (scene === 'boat') celebrate(BXC, waterY() - 30, 60);
        else if (scene === 'fbd' && !FB.okOnce) { const o = fbObjCenter(); celebrate(o.x, o.y, 54); }
        else if (scene === 'shop' && SH.res && SH.res.ok && SH.res.soft) celebrate(W * 0.34, 200, 56);
      }
    }
    lastPhase = ph; lastIdx = i;
  }

  /* ---------- 시작 ---------- */
  syncScene();                                   // (장면은 단계 소개·미션 시작 때 이미 정해졌어요: 이어하기에도 맞게)
  SciSim.loop((dt, t) => {
    if (scene === 'desk') stepDesk(dt);
    else if (scene === 'fbd') stepFbd(dt);
    else if (scene === 'boat') stepBoat(dt);
    else stepShop(dt);
    view.clear('#eef5ff');
    if (scene === 'desk') drawDesk(dt, t);
    else if (scene === 'fbd') drawFbd(dt, t);
    else if (scene === 'boat') drawBoatScene(dt, t);
    else drawShop(dt, t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.4);
      ctx.fillStyle = 'rgba(238,245,255,' + (1 - EASE.outCubic(trans.t)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    watchSuccess();
    if (game && !!game.free !== lastFree) syncScene();
    updateReadouts(t);
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, get game() { return game; }, W, H, DK, FB, BT, SH, FTYPES, CASES, GEO, PARTS, TASKS,
    setScene, deskToggle, bookAdd, bookSub, fbReset, fbJudge, fbDropChip, shopSelect, shopTest, shopReset, boatReset, boatToWorld, boatLoaded, boatW, boatB, landedN, dkW, dkSupport, dkSettled,
    palPos, cardRect, SX, DKY, FLY, D_T, TK, BXC, PAL, SLOPE, dockHome, fbHandlePos, fbObjCenter,
    setV(id, n) { const c = fbCase(); FB.v[id] = n; const v = fbVec(id, n); FB.a[id].set(v[0], v[1]); },
  };
})();
