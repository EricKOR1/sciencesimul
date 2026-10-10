/* =========================================================
   중1 Ⅴ. 힘의 작용 — 힘과 운동 상태 변화 [9과05-03]
   ① [관찰] 운동 상태란?      두 손으로 정지한 퍽 당기기, 다중 섬광 사진 읽기 (알짜힘 0 / 0이 아님)
   ② [실험] 힘의 방향에 따른 변화  힘 구역: 같은 방향 · 반대 방향 · 수직(줄과 기둥) · 비스듬히
   ③ [설명] 알짜힘으로 설명하기    움직이는 퍽에 앞·뒤 힘, 던진 공(중력), 굴러가다 멈추는 공(마찰력)
   ④ [적용] 놀이공원 사례 조사·분류 8가지 놀이 기구를 속력/방향/둘 다로 분류
   범위: 운동 상태 = 속력 + 운동 방향. 관성(법칙)·가속도·F=ma·속도의 벡터 계산은 다루지 않음 (수치는 속력 m/s만 표시)
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

  const COL = { hand: '#f97316', net: '#7c3aed', motion: '#64748b', grav: '#e11d48', fric: '#b45309', ink: '#1b2333', muted: '#5d6879', good: '#16a34a', warn: '#dc2626' };

  /* ---------- 눈금(스케일) ---------- */
  const PM = 100;                       // 1 m = 100 px
  const MASS = 2;                       // 퍽의 질량(화면에는 나타내지 않아요): 가속 = 알짜힘 ÷ 2
  const NPX = PHONE ? 22 : 32;          // 힘 화살표: 1 N = 32 px
  const VPX = PHONE ? 50 : 60;          // 운동 방향 화살표: 1 m/s = 60 px
  const R = 20;                         // 퍽 반지름
  const FDT = 0.2;                      // 다중 섬광 간격(초)
  const IN = { l: 34, r: W - 34, t: 34, b: H - 34 };

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
  /* 운동 방향 화살표: 속이 빈 회색 */
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
  /* 장갑 손(당기는 자세): +x = 힘의 방향, 주먹이 원점부터 앞쪽 */
  function glove(x, y, ux, uy, o) {
    o = o || {};
    const s = (o.scale || 1) * (PHONE ? 1.08 : 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(uy, ux));
    if (ux < -0.01) ctx.scale(1, -1);
    ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const skin = '#fff7ed', line = '#9a3412', cuff = '#fb923c', sleeve = '#60a5fa', sleeveLine = '#2563eb';
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
    ctx.fillStyle = sleeve; rr(29, -10, 38, 20, 7); ctx.fill(); rr(0, -14, 27, 28, 10); ctx.fillStyle = skin; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = sleeveLine; ctx.lineWidth = 1.5; rr(29, -10, 38, 20, 7); ctx.stroke();
    ctx.fillStyle = cuff; rr(24, -12.5, 9, 25, 3); ctx.fill();
    rr(0, -14, 27, 28, 10); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(line, 0.5);
    [-7, 0, 7].forEach((yy) => { ctx.beginPath(); ctx.moveTo(1, yy); ctx.lineTo(9, yy); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(4, -14); ctx.quadraticCurveTo(12, -20.5, 20, -14.5);
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function ropeLine(x1, y1, x2, y2, alpha, wid) {
    ctx.save(); ctx.lineCap = 'round';
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = wid || 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = (wid || 5) * 0.4; ctx.stroke();
    ctx.restore();
  }
  /* 손 하나 = 밧줄 + 화살표 + 장갑 (당기는 힘) */
  function drawHandPull(x, y, dx, dy, alpha) {
    const L = Math.hypot(dx, dy);
    if (L < 2) return;
    const ux = dx / L, uy = dy / L;
    ropeLine(x, y, x + dx + ux * 6, y + dy + uy * 6, alpha);
    forceArrow(x, y, dx, dy, COL.hand, { alpha });
    glove(x + dx + ux * 7, y + dy + uy * 7, ux, uy, { alpha });
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
  const mk = (b) => (b ? '✅' : '⬜');

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* =========================================================
     퍽 세계 · 얼음판 · 퍽 · 다중 섬광 · 발사기
     ========================================================= */
  const PU = { x: 0, y: 0, vx: 0, vy: 0, alpha: 1, pop: 1 };
  let FL = [];                       // 다중 섬광 점 [{x, y, age, life}]
  let flashClk = 0;
  let strobeOn = true;
  const ARR = { net: new AArrow(), mot: new AArrow(), hl: new AArrow(), hr: new AArrow() };
  let head0 = null;                  // 처음 운동 방향(rad)
  const spdMS = () => Math.hypot(PU.vx, PU.vy) / PM;
  function turnedDeg() {
    const sp = Math.hypot(PU.vx, PU.vy);
    if (head0 == null || sp < 4) return null;
    let d = Math.atan2(PU.vy, PU.vx) - head0;
    while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    return d;
  }
  function addFlash(life) { FL.push({ x: PU.x, y: PU.y, age: 0, life: life || 9 }); }
  function stepFlash(dt, moving, life) {
    for (let i = FL.length - 1; i >= 0; i--) { FL[i].age += dt; if (FL[i].age > FL[i].life) FL.splice(i, 1); }
    if (!moving) return;
    flashClk += dt;
    while (flashClk >= FDT) { flashClk -= FDT; addFlash(life); }
  }
  function clearFlashes() { FL.length = 0; flashClk = 0; }
  function drawFlashes() {
    if (!strobeOn || !on('strobe') || !FL.length) return;
    ctx.save();
    ctx.lineJoin = 'round';
    // 이어진 선: 운동 방향
    for (let i = 1; i < FL.length; i++) {
      const a = FL[i - 1], b = FL[i], al = clamp(Math.min(a.life - a.age, b.life - b.age) / 1.5, 0, 1);
      ctx.strokeStyle = 'rgba(71,85,105,' + (0.3 * al).toFixed(3) + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    FL.forEach((f) => {
      const al = clamp((f.life - f.age) / 1.5, 0, 1) * Math.min(1, f.age / 0.05 + 0.2);
      ctx.fillStyle = 'rgba(51,65,85,' + (0.34 * al).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.7, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(15,23,42,' + (0.45 * al).toFixed(3) + ')'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * al).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, TAU); ctx.fill();
    });
    ctx.restore();
  }
  function drawPuck(x, y, alpha, sc) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (sc != null && sc !== 1) { ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y); }
    softShadow(x + 4, y + 9, R + 6, (R + 6) * 0.6, 0.3);
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y + 4, R, 0, TAU); ctx.fill();
    ctx.fillRect(x - R, y, R * 2, 4);
    const g = ctx.createRadialGradient(x - 7, y - 8, 2, x, y, R);
    g.addColorStop(0, '#8493a8'); g.addColorStop(0.55, '#475569'); g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, R - 5, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - 7, y - 9, 6, 3, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
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
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#60a5fa'; rr(8, 8, W - 16, H - 16, 26); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.8)'; rr(12, 12, W - 24, H - 24, 22); ctx.stroke();
  }
  /* 화살표 눈금: 1 N, 1 m/s 길이 */
  function drawLegend(showMotion) {
    const x = 26, y = 30;
    ctx.save();
    forceArrow(x, y, NPX, 0, COL.net, { width: 5, head: 12, dot: false });
    txt('알짜힘 1 N', x + NPX + 10, y, { align: 'left', size: 12, color: '#5b21b6' });
    if (showMotion) {
      hollowArrow(x, y + 26, VPX, 0, { width: 9, head: 14 });
      txt('속력 1 m/s', x + VPX + 10, y + 26, { align: 'left', size: 12, color: '#475569' });
    }
    ctx.restore();
  }

  /* ---------- 퍽 발사기 (용수철 판) ---------- */
  const LA = { ext: 0, t: 9, active: false, startX: 0 };
  function drawLauncher(x0, y) {
    // x0: 퍽 출발 위치(중심). 판은 퍽 왼쪽 면에 닿아 있다가 퍽을 밀어 낸다.
    const home = x0 - R - 5, px = home + LA.ext, wallX = IN.l - 14;
    ctx.save();
    // 용수철
    const len = px - 6 - (wallX + 6), n = Math.max(5, Math.round(len / 13));
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(wallX + 6, y);
    for (let i = 0; i < n; i++) ctx.lineTo(wallX + 6 + len * (i + 0.5) / n, y + (i % 2 ? 9 : -9));
    ctx.lineTo(px - 6, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wallX + 6, y - 1); for (let i = 0; i < n; i++) ctx.lineTo(wallX + 6 + len * (i + 0.5) / n, y + (i % 2 ? 8 : -10)); ctx.stroke();
    // 받침
    const g = ctx.createLinearGradient(wallX - 8, 0, wallX + 6, 0);
    g.addColorStop(0, '#64748b'); g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g; rr(wallX - 8, y - 20, 14, 40, 4); ctx.fill();
    // 판
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    const g2 = ctx.createLinearGradient(px - 5, 0, px + 2, 0);
    g2.addColorStop(0, '#cbd5e1'); g2.addColorStop(1, '#64748b');
    ctx.fillStyle = g2; rr(px - 5, y - 17, 8, 34, 3); ctx.fill();
    ctx.restore();
  }
  function stepLauncher(dt) {
    if (LA.active) { LA.t += dt; LA.ext = clamp(PU.x - LA.startX, 0, 30); if (LA.t > 0.2) LA.active = false; }
    else LA.ext = approach(LA.ext, 0, dt, 3.2);
  }
  function startLaunch(x0) { LA.active = true; LA.t = 0; LA.startX = x0; }
  function integrate(dt, fx, fy) {                         // 일정한 알짜힘(N)이 작용하는 동안의 운동 (작은 시간 간격으로 쪼개어 계산)
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    const ax = fx / MASS * PM, ay = fy / MASS * PM;
    for (let i = 0; i < n; i++) { PU.vx += ax * h; PU.vy += ay * h; PU.x += PU.vx * h; PU.y += PU.vy * h; }
  }
  let frost = 0;
  function frostTrail(dt) {
    if (RM) return;
    const sp = Math.hypot(PU.vx, PU.vy);
    if (sp < 90) return;
    frost += dt;
    while (frost > 0.05) {
      frost -= 0.05;
      const ux = PU.vx / sp, uy = PU.vy / sp;
      FX.emit({ x: PU.x - ux * R * 0.9 + (Math.random() - 0.5) * 8, y: PU.y - uy * R * 0.9 + (Math.random() - 0.5) * 8, vx: -ux * 26 + (Math.random() - 0.5) * 20, vy: -uy * 26 + (Math.random() - 0.5) * 20, life: 0.5, size: 2.6, color: '#ffffff', gravity: 0, drag: 2 });
    }
  }

  /* 값 pill 놓을 자리 찾기: 화살표 끝 너머에 두되, 다른 화살표나 pill과 겹치면 옆으로 비켜요 */
  function segHitsRect(s, r) {
    for (let i = 0; i <= 10; i++) {
      const x = s.x1 + (s.x2 - s.x1) * i / 10, y = s.y1 + (s.y2 - s.y1) * i / 10;
      if (x > r.x - s.th && x < r.x + r.w + s.th && y > r.y - s.th && y < r.y + r.h + s.th) return true;
    }
    return false;
  }
  const rectsHit = (a, b) => a.x < b.x + b.w + 4 && a.x + a.w > b.x - 4 && a.y < b.y + b.h + 4 && a.y + a.h > b.y - 4;
  function placeTag(str, size, tx, ty, ux, uy, avoid, rects, extra) {
    const w = measure(str, size) + 18 * FS, h = (size + 10) * FS;
    const off = Math.abs(ux) * (w / 2 + 8) + Math.abs(uy) * (h / 2 + 8) + 6 + (extra || 0);
    const nx = -uy, ny = ux, step = Math.abs(nx) * (w / 2 + 8) + Math.abs(ny) * (h / 2 + 8) + 12;
    const cands = [[0, 0], [nx * step, ny * step], [-nx * step, -ny * step], [ux * 40, uy * 40]];
    let best = null;
    for (const c of cands) {
      const x0 = clamp(tx + ux * off + c[0] - w / 2, 6, W - w - 6), y0 = clamp(ty + uy * off + c[1] - h / 2, 4, H - h - 4);
      const r = { x: x0, y: y0, w, h };
      if (!best) best = r;
      if (avoid.some((sg) => segHitsRect(sg, r)) || rects.some((q) => rectsHit(q, r))) continue;
      return r;
    }
    return best;
  }
  /* 퍽에 그리는 화살표 두 개: 운동 방향(회색, 속이 빈 화살표)은 아래에, 알짜힘(보라)은 그 위에 */
  function drawPuckVectors(o) {
    const am = ARR.mot, an = ARR.net;
    let ns = null, ms = null;
    if (an.shown && an.len > 2) { const dx = an.dx * an.k, dy = an.dy * an.k, L = Math.hypot(dx, dy); ns = { x1: o.nx, y1: o.ny, x2: o.nx + dx, y2: o.ny + dy, dx, dy, ux: dx / L, uy: dy / L, th: 12 }; }
    if (am.shown && am.len > 2) { const dx = am.dx * am.k, dy = am.dy * am.k, L = Math.hypot(dx, dy); ms = { x1: o.mx, y1: o.my, x2: o.mx + dx, y2: o.my + dy, dx, dy, ux: dx / L, uy: dy / L, th: 14 }; }
    if (ms) hollowArrow(o.mx, o.my, ms.dx, ms.dy);
    if (ns) forceArrow(o.nx, o.ny, ns.dx, ns.dy, COL.net, { width: 9, head: 20, glow: true });
    const rects = [];
    if (ns) {
      const behind = !!o.netBehind;
      const r = behind ? placeTag(o.netPill, 13, o.nx, o.ny, -ns.ux, -ns.uy, ms ? [ms] : [], rects, R + 4) : placeTag(o.netPill, 13, ns.x2, ns.y2, ns.ux, ns.uy, ms ? [ms] : [], rects);
      rects.push(r); pill(o.netPill, r.x + r.w / 2, r.y + r.h / 2, { color: COL.net, size: 13 });
    }
    if (ms) {
      const r = placeTag(o.motPill, 13, ms.x2, ms.y2, ms.ux, ms.uy, ns ? [ns] : [], rects);
      pill(o.motPill, r.x + r.w / 2, r.y + r.h / 2, { color: COL.motion, size: 13 });
    }
  }
  function setPuckVectors(netX, netY) {                        // 알짜힘(N)을 화살표 목표값으로
    ARR.net.set(netX * NPX, netY * NPX);
    const sp = Math.hypot(PU.vx, PU.vy);
    if (sp > 6) ARR.mot.set(PU.vx / PM * VPX, PU.vy / PM * VPX); else ARR.mot.set(0, 0);
  }

  /* =========================================================
     장면 ① 두 손으로 당기기 (kind: 'hands' 정지한 퍽 / 'two' 움직이는 퍽)
     ========================================================= */
  const PL = {
    kind: 'hands', F: [2, 2], st: 'ready', t: 0, x0: W / 2, y0: 262, lim: 100,
    drag: null, doneEq: false, doneNe: false, ran2: false, runNet: 0, v0: 0, vEnd: 0, fade: 1, pin: 1,
    shownStill: false, lastNet: 0,
  };
  const PULL_Y = 262;
  const PULL_CFG = {
    hands: { x0: W / 2, lim: PHONE ? 54 : 100, v0: 0 },
    two: { x0: PHONE ? 236 : 300, lim: PHONE ? 140 : 190, v0: 1.0 },
  };
  const FMAX = 6;
  const plNet = () => PL.F[1] - PL.F[0];
  function pullReset(keepF) {
    const c = PULL_CFG[PL.kind];
    PL.x0 = c.x0; PL.y0 = PULL_Y; PL.lim = c.lim; PL.v0 = c.v0;
    PL.st = 'ready'; PL.t = 0; PL.drag = null; PL.fade = 1; PL.shownStill = false; PL.pin = 1;
    if (!keepF) PL.F = PL.kind === 'hands' ? [2, 2] : [2, 2];
    PU.x = PL.x0; PU.y = PL.y0; PU.vx = PU.vy = 0; PU.alpha = RM ? 1 : 0; PU.pop = RM ? 1 : 0;
    clearFlashes(); head0 = null;
    ARR.hl.jump(-PL.F[0] * NPX, 0); ARR.hr.jump(PL.F[1] * NPX, 0); ARR.net.jump(0, 0); ARR.mot.jump(0, 0);
    ARR.net.set(plNet() * NPX, 0);
    LA.ext = 0; LA.active = false;
    syncGo();
  }
  function pullGo() {
    if (PL.st !== 'ready') return;
    Sound.click();
    PL.st = 'run'; PL.t = PL.kind === 'hands' ? -0.22 : 0; PL.drag = null; PL.runNet = plNet(); PL.fade = 1; PL.shownStill = false;
    clearFlashes(); head0 = null;
    PU.vx = 0; PU.vy = 0;
    if (PL.kind === 'two') { addFlash(8); startLaunch(PL.x0); head0 = 0; }
    hideHint();
    syncGo();
  }
  function pullFinish(why) {
    if (PL.st !== 'run') return;
    PL.vEnd = spdMS();
    if (PL.kind === 'hands') {
      if (PL.runNet === 0 && PL.F[0] >= 1) PL.doneEq = true;
    } else {
      if (PL.runNet === 2 && PL.vEnd > PL.v0 + 0.4) { PL.ran2 = true; Sound.success(); celebrate(PU.x, PU.y - 58, 40); }
    }
    PL.st = 'fade'; PL.t = 0;
    syncGo();
  }
  function stepPull(dt) {
    const P = PL;
    const net = plNet();
    ARR.hl.set(-P.F[0] * NPX, 0); ARR.hr.set(P.F[1] * NPX, 0);
    ARR.hl.update(dt); ARR.hr.update(dt);
    if (P.st === 'ready') {
      PU.alpha = Math.min(1, PU.alpha + dt / 0.3); PU.pop = Math.min(1, PU.pop + dt / 0.3);
      ARR.net.set(net * NPX, 0); ARR.mot.set(0, 0);
      stepFlash(dt, false);
    } else if (P.st === 'run' && P.t < 0) {                          // 핀이 빠지는 동안(0.22초)
      P.t = Math.min(0, P.t + dt);
      P.pin = clamp(-P.t / 0.22, 0, 1);
      ARR.net.set(net * NPX, 0); ARR.mot.set(0, 0);
      if (P.t >= 0) { P.pin = 0; addFlash(8); }
    } else if (P.st === 'run') {
      P.t += dt;
      const moving = true;
      if (P.kind === 'two' && P.t < 0.14) {                       // 발사기가 밀어 주는 동안 0 → 1.0 m/s
        PU.vx = P.v0 * PM * EASE.outQuad(P.t / 0.14); PU.x += PU.vx * dt;
      } else integrate(dt, net, 0);
      if (head0 == null && Math.hypot(PU.vx, PU.vy) > 8) head0 = Math.atan2(PU.vy, PU.vx);
      stepFlash(dt, moving, 8);
      ARR.net.set(net * NPX, 0);
      setPuckVectors(net, 0);
      frostTrail(dt);
      const sp = spdMS();
      if (P.kind === 'hands') {
        if (net === 0) {
          if (!P.shownStill && P.t > 1.1) { P.shownStill = true; badge(P.F[0] >= 1 ? '그대로 정지 ✔  알짜힘 0 N' : '힘이 없으니 알짜힘 0 N → 정지', PU.x, PU.y - 128, COL.good); Sound.tick(); }
          if (P.t > 2.2) pullFinish('still');
        } else {
          if (!P.doneNe && sp >= 0.3) { P.doneNe = true; badge('움직이기 시작했어요!', PU.x, PU.y - 128, COL.net); Sound.tick(); }
          if (Math.abs(PU.x - P.x0) >= P.lim || P.t > 3.4) pullFinish('moved');
        }
      } else if (P.t > 0.2) {
        if (PU.x - P.x0 >= P.lim || P.x0 - PU.x >= 90 || P.t > 3.6) pullFinish('moved');
      }
    } else if (P.st === 'fade') {
      P.t += dt;
      integrate(dt, plNet(), 0);                                  // 사라지는 동안에도 계속 움직여요
      stepFlash(dt, true, 8);
      setPuckVectors(plNet(), 0);
      ARR.net.set(plNet() * NPX, 0);
      PU.alpha = Math.max(0, 1 - P.t / 0.3);
      if (P.t >= 0.3) {
        const eq = P.runNet === 0;
        pullReset(true);
        // 방금 실험한 힘의 값은 그대로 두고 퍽만 제자리로
        if (eq) { /* 정지 실험 후에는 그대로 */ }
      }
    }
    ARR.net.update(dt); ARR.mot.update(dt);
  }
  const hookX = (i) => PU.x + (i === 0 ? -1 : 1) * (R + 6);
  function knobPos(i) {
    const a = i === 0 ? ARR.hl : ARR.hr, s = i === 0 ? -1 : 1;
    const len = PL.F[i] ? Math.abs(a.dx * a.k) : 0;
    return { x: hookX(i) + s * (len + (PL.F[i] ? 21 : 30)), y: PU.y };
  }
  function knob(x, y, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = COL.hand; ctx.stroke();
    ctx.fillStyle = '#c2410c';
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 3, y - 4.5); ctx.lineTo(x - 3, y + 4.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 3, y - 4.5); ctx.lineTo(x + 3, y + 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function hookRing(x, y, side) {
    ctx.save();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(x, y, 5.2, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, 5.2, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  }
  const netWord = (n) => (n === 0 ? '0 N' : Math.abs(n) + ' N ' + (n > 0 ? '→' : '←'));
  function pullFormula() {
    const f0 = PL.F[0], f1 = PL.F[1], n = f1 - f0;
    const a = PL.kind === 'hands' ? '오른쪽 ' : '앞쪽 ', b = PL.kind === 'hands' ? '왼쪽 ' : '뒤쪽 ';
    if (!f0 && !f1) return '알짜힘 = 0 N';
    if (f0 === f1) return '알짜힘 = ' + f1 + ' N − ' + f0 + ' N = 0 N';
    return '알짜힘 = ' + a + Math.max(f0, f1) + ' N − ' + Math.min(f0, f1) + ' N = ' + Math.abs(n) + ' N';
  }
  function drawPull(dt) {
    const P = PL;
    drawRink();
    drawLegend(true);
    if (P.kind === 'two') {
      // 출발 안내: 처음 속력 1.0 m/s
      if (P.st === 'ready') {
        hollowArrow(P.x0, PU.y + 58, 1.0 * VPX, 0, { alpha: 0.55 });
        txt('처음 속력 1.0 m/s', P.x0 + 1.0 * VPX + 12, PU.y + 58, { align: 'left', size: 13, color: '#475569' });
      }
    }
    drawFlashes();
    const y = PU.y;
    // 두 손(밧줄 + 화살표 + 장갑)
    ctx.save();
    ctx.globalAlpha *= clamp(PU.alpha * 1.6, 0, 1);
    for (let i = 0; i < 2; i++) {
      const a = i === 0 ? ARR.hl : ARR.hr;
      const dx = a.dx * a.k;
      if (!a.shown || Math.abs(dx) < 2) continue;
      drawHandPull(hookX(i), y, dx, 0, 1);
    }
    ctx.restore();
    drawPuck(PU.x, y, PU.alpha, 0.85 + 0.15 * EASE.outBack(clamp(PU.pop, 0, 1)));
    ctx.save(); ctx.globalAlpha *= PU.alpha; hookRing(hookX(0), y, -1); hookRing(hookX(1), y, 1); ctx.restore();
    if (P.kind === 'hands' && P.pin > 0.01 && PU.alpha > 0.05) {          // 퍽을 붙잡고 있는 핀
      const lift = 1 - P.pin;
      ctx.save(); ctx.globalAlpha *= Math.min(1, P.pin * 1.5) * PU.alpha;
      softShadow(PU.x + 3 + lift * 12, y + 5 + lift * 12, 11 + lift * 5, 8, 0.35);
      D.sphere(PU.x, y - lift * 22, 9 * (1 + lift * 0.7), '#ef4444', {});
      ctx.restore();
    }
    // 손잡이(손을 끌어 힘을 정해요)
    if (P.st === 'ready' && on('hands')) {
      for (let i = 0; i < 2; i++) {
        const kp = knobPos(i);
        knob(kp.x, kp.y);
        const m = game && game.current();
        if (m && game.isActive(m) && m.pulse && P.F[i] === P.F[1 - i] && !P.drag) D.ring(kp.x, kp.y, 17, NOW(), { color: COL.hand, width: 2 });
      }
    }
    // 힘 값 pill
    const names = P.kind === 'hands' ? ['왼쪽 손', '오른쪽 손'] : ['뒤쪽 힘', '앞쪽 힘'];
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1, a = i === 0 ? ARR.hl : ARR.hr, len = Math.abs(a.dx * a.k);
      const str = names[i] + ' ' + P.F[i] + ' N', pw = measure(str, 14) + 18 * FS;
      const px = hookX(i) + s * Math.max(P.F[i] ? len / 2 : 0, pw / 2 + 2);        // 두 pill이 가운데에서 겹치지 않게
      pill(str, px, y + 34, { color: COL.hand, size: 14, alpha: P.F[i] ? 1 : 0.7, fit: true });
    }
    // 알짜힘(위)과 운동 방향(아래)
    const net = plNet();
    const nx = PU.x, ny = y - 58;
    if (ARR.net.shown && ARR.net.len > 2) {
      forceArrow(nx, ny, ARR.net.dx * ARR.net.k, ARR.net.dy * ARR.net.k, COL.net, { width: 9, head: 20, glow: true });
    } else appDot(nx, ny, COL.net);
    pill(pullFormula(), nx, ny - 34, { solid: true, color: COL.net, size: 15, fit: true });
    if (ARR.mot.shown && ARR.mot.len > 2) {
      const dx = ARR.mot.dx * ARR.mot.k, dy = ARR.mot.dy * ARR.mot.k;
      hollowArrow(PU.x, y + 62, dx, dy);
      const ux = Math.sign(dx) || 1;
      pill('속력 ' + spdMS().toFixed(1) + ' m/s', PU.x + dx + ux * 68, y + 62, { color: COL.motion, size: 13, fit: true });
    }
    if (isNew('hands') && P.st === 'ready') { const kp = knobPos(1); newTag(kp.x - 16, kp.y - 16, 32, 32); }
    if (P.kind === 'two' && isNew('twoOnMoving') && P.st === 'ready') { const kp = knobPos(1); newTag(kp.x - 16, kp.y - 16, 32, 32); }
  }
  function pullHit(p) {
    if (PL.st !== 'ready' || !on('hands')) return -1;
    for (let i = 0; i < 2; i++) { const k = knobPos(i); if (Math.hypot(p.x - k.x, p.y - k.y) < 30) return i; }
    return -1;
  }
  function pullDrag(p) {
    const i = PL.drag; if (i == null) return;
    const s = i === 0 ? -1 : 1;
    const d = (p.x - hookX(i)) * s - 21;
    const f = clamp(Math.round(d / NPX), 0, FMAX);
    if (f !== PL.F[i]) { PL.F[i] = f; Sound.tick(); }
  }

  /* =========================================================
     장면 ② 힘 구역 (모드 ① 같은 방향 ② 반대 방향 ③ 줄과 기둥 ④ 비스듬히)
     ========================================================= */
  const ZX = PHONE ? 196 : 292;           // 힘 구역의 왼쪽 끝
  const X0 = PHONE ? 74 : 92;             // 퍽 출발 위치
  const ZW = { 1: 200, 2: 95, 3: 200, 4: 200 };          // 구역 폭(px). ②는 퍽이 멈추지 않고 나가도록 짧게
  const ZY = { 1: 262, 2: 262, 3: 104, 4: 300 };         // 퍽이 지나는 높이
  const ZF = 2;                            // 구역 안의 힘 (N)
  const ROPE = 150;                        // 줄 길이(px) = 1.5 m → 줄이 당기는 힘 = 2 × 1.5² ÷ 1.5 = 3 N
  const V_Z = 1.5;                         // 구역에 들어가는 속력 (m/s)
  const DIR4 = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };   // ④ 비스듬한 방향(↗ 45°)
  const MODE_NAME = { 1: '① 같은 방향', 2: '② 반대 방향', 3: '③ 줄과 기둥', 4: '④ 비스듬히' };
  const Z = {
    mode: 1, st: 'ready', t: 0, y: ZY[1], bandW: ZW[1], done: {}, res: {},
    inside: false, exited: false, tAfter: 0, endT: 0, after: 1.2,
    attached: false, attachT: 0, released: false, th: 0, ropeK: 0, rel: 0,
    exit: null, bump: 0,
  };
  const zoneNet = () => {                      // 지금 퍽에 작용하는 알짜힘 (N)
    if (Z.st !== 'run' && Z.st !== 'end') return { x: 0, y: 0 };
    if (Z.mode === 3) {
      if (!Z.attached || Z.released) return { x: 0, y: 0 };
      const T = MASS * Math.pow(V_Z, 2) / (ROPE / PM), cx = ZX, cy = Z.cy;
      const dx = cx - PU.x, dy = cy - PU.y, L = Math.hypot(dx, dy) || 1;
      return { x: dx / L * T, y: dy / L * T };
    }
    if (!Z.inside) return { x: 0, y: 0 };
    if (Z.mode === 1) return { x: ZF, y: 0 };
    if (Z.mode === 2) return { x: -ZF, y: 0 };
    return { x: ZF * DIR4.x, y: ZF * DIR4.y };
  };
  function zoneReset(clearRes) {
    Z.st = 'ready'; Z.t = 0; Z.inside = false; Z.exited = false; Z.tAfter = 0; Z.endT = 0;
    Z.attached = false; Z.released = false; Z.th = 0; Z.ropeK = 0; Z.exit = null;
    Z.after = Z.mode === 2 ? 1.6 : 1.2;
    PU.x = X0; PU.y = Z.y; PU.vx = PU.vy = 0; PU.alpha = RM ? 1 : 0; PU.pop = RM ? 1 : 0;
    clearFlashes(); head0 = null;
    ARR.net.jump(0, 0); ARR.mot.jump(0, 0);
    LA.ext = 0; LA.active = false;
    if (clearRes) { Z.done = {}; Z.res = {}; renderTable(); }
    syncGo();
  }
  function zoneSetMode(m) {
    if (Z.st === 'launch' || Z.st === 'run') return;
    Z.mode = m;
    if (Z.st === 'end') zoneReset(false);
    $$('#modeGrid .mode-btn').forEach((b) => b.classList.toggle('on', +b.dataset.mode === m));
    Z.cy = ZY[m] + ROPE;
  }
  function zoneGo() {
    if (Z.st === 'launch' || Z.st === 'run') return;
    Sound.click();
    zoneReset(false);
    Z.y = ZY[Z.mode]; PU.y = Z.y; PU.alpha = 1; PU.pop = 1;
    Z.cy = Z.y + ROPE;
    Z.st = 'launch'; Z.t = 0;
    head0 = 0; addFlash(8);
    startLaunch(X0);
    hideHint();
    syncGo();
  }
  function zoneFinish() {
    if (Z.st === 'end') return;
    Z.st = 'end'; Z.endT = 0;
    const m = Z.mode;
    if (!Z.done[m]) { Z.done[m] = true; }
    renderTable(m);
    Sound.tick();
    const r = Z.res[m];
    if (r) {
      const txtS = (r.spd === 'up' ? '빨라졌어요' : r.spd === 'down' ? '느려졌어요' : '속력 그대로') + (r.dir === 'turn' ? ' · 방향이 바뀌었어요' : ' · 방향 그대로');
      badge(txtS, PU.x, clamp(PU.y - 70, 70, H - 60), r.dir === 'turn' ? COL.net : r.spd === 'up' ? '#ea580c' : '#2563eb', 3);
    }
    syncGo();
  }
  function zoneRecordExit() {
    if (Z.exit) return;
    const v = spdMS(), d = turnedDeg();
    const ang = d == null ? 0 : d;
    const spd = v > V_Z + 0.05 ? 'up' : v < V_Z - 0.05 ? 'down' : 'same';
    const dir = Math.abs(ang) * 180 / Math.PI >= 3 ? 'turn' : 'same';
    Z.exit = { v, ang };
    Z.res[Z.mode] = { v0: V_Z, v1: v, ang, spd, dir };
    Sound.tick();
  }
  function zoneSpark(x, y, c) {
    if (RM) return;
    FX.burst(x, y, { count: 9, life: 0.55, speed: 110, gravity: 0, size: 3.2, shape: 'circle', colors: [c, '#ffffff'] });
  }
  function stepZone(dt) {
    const z = Z;
    z.bandW = approach(z.bandW, ZW[z.mode], dt, 9);
    if (z.st === 'ready' || z.st === 'end') z.y = approach(z.y, ZY[z.mode], dt, 10);
    if (z.st === 'ready') {
      PU.y = z.y; PU.alpha = Math.min(1, PU.alpha + dt / 0.3); PU.pop = Math.min(1, PU.pop + dt / 0.3);
      ARR.net.set(0, 0); ARR.mot.set(0, 0);
      stepFlash(dt, false);
      z.cy = z.y + ROPE;
    } else if (z.st === 'launch' || z.st === 'run') {
      z.t += dt;
      const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (let i = 0; i < n; i++) {
        if (z.st === 'launch') {
          const lt = z.t - dt + h * (i + 1);
          if (lt >= 0.16) { z.st = 'run'; PU.vx = V_Z * PM; }
          else PU.vx = V_Z * PM * EASE.outQuad(lt / 0.16);
          PU.x += PU.vx * h;
          continue;
        }
        if (z.mode === 3) {
          if (!z.attached && PU.x >= ZX) {                 // 줄이 기둥에 걸려요
            z.attached = true; z.attachT = 0; z.th = -Math.PI / 2; PU.x = ZX; PU.y = z.y;
            Sound.tick(); zoneSpark(ZX, z.cy, '#a78bfa');
          }
          if (z.attached && !z.released) {
            const om = V_Z * PM / ROPE;
            z.th += om * h;
            if (z.th >= Math.PI / 2) { z.th = Math.PI / 2; z.released = true; z.rel = 0; zoneRecordExit(false); zoneSpark(ZX, z.cy, '#fb923c'); }
            const c = Math.cos(z.th), s = Math.sin(z.th);
            PU.x = ZX + ROPE * c; PU.y = z.cy + ROPE * s;
            PU.vx = -V_Z * PM * s; PU.vy = V_Z * PM * c;
            if (z.released) { PU.x = ZX; PU.y = z.cy + ROPE; PU.vx = -V_Z * PM; PU.vy = 0; }
            continue;
          }
          PU.x += PU.vx * h; PU.y += PU.vy * h;
          if (z.released) z.tAfter += h;
        } else {
          const inside = PU.x >= ZX && PU.x < ZX + ZW[z.mode];
          if (inside && !z.inside) { Sound.tick(); zoneSpark(ZX, PU.y, '#a78bfa'); }
          if (!inside && z.inside) { z.exited = true; zoneRecordExit(); zoneSpark(ZX + ZW[z.mode], PU.y, '#fb923c'); }
          z.inside = inside;
          const f = inside ? (z.mode === 1 ? [ZF, 0] : z.mode === 2 ? [-ZF, 0] : [ZF * DIR4.x, ZF * DIR4.y]) : [0, 0];
          const ax = f[0] / MASS * PM, ay = f[1] / MASS * PM;
          PU.vx += ax * h; PU.vy += ay * h; PU.x += PU.vx * h; PU.y += PU.vy * h;
          if (z.exited) z.tAfter += h;
        }
      }
      if (z.st !== 'end') {
        stepFlash(dt, true, 8);
        if (z.attached && !z.released) z.attachT += dt;
        const nf = zoneNet();
        ARR.net.set(nf.x * NPX, nf.y * NPX);
        setPuckVectors(nf.x, nf.y);
        frostTrail(dt);
        if (z.mode === 3) z.ropeK = z.attached && !z.released ? Math.min(1, z.attachT / 0.14) : Math.max(0, z.ropeK - dt / 0.12);
        const out = PU.x > IN.r - R || PU.x < IN.l + R || PU.y < IN.t + R || PU.y > IN.b - R;
        if (z.tAfter >= z.after || out) { if (!z.exit) zoneRecordExit(); zoneFinish(); }
      }
    } else if (z.st === 'end') {
      z.endT += dt;
      // 사라지면서도 계속 미끄러져요
      if (z.endT < 0.45) {
        PU.x += PU.vx * dt; PU.y += PU.vy * dt;
        const out = PU.x > IN.r - R + 6 || PU.x < IN.l + R - 6 || PU.y < IN.t + R - 6 || PU.y > IN.b - R + 6;
        if (out) { PU.x = clamp(PU.x, IN.l + R - 6, IN.r - R + 6); PU.y = clamp(PU.y, IN.t + R - 6, IN.b - R + 6); PU.vx = PU.vy = 0; }
        PU.alpha = Math.max(0, 1 - z.endT / 0.45);
        stepFlash(dt, true, 8);
      } else { PU.alpha = 0; stepFlash(dt, false); }
      ARR.net.set(0, 0); ARR.mot.set(0, 0);
      z.ropeK = Math.max(0, z.ropeK - dt / 0.12);
      if (z.endT > 2.4) { zoneReset(false); }
    }
    ARR.net.update(dt); ARR.mot.update(dt);
  }
  function drawBand(t) {
    const bw = Z.bandW, m = Z.mode, top = 30, bh = H - 60;
    ctx.save();
    const g = ctx.createLinearGradient(ZX, 0, ZX + bw, 0);
    g.addColorStop(0, 'rgba(124,58,237,.17)'); g.addColorStop(0.5, 'rgba(124,58,237,.09)'); g.addColorStop(1, 'rgba(124,58,237,.17)');
    ctx.fillStyle = g; ctx.fillRect(ZX, top, bw, bh);
    ctx.beginPath(); ctx.rect(ZX, top, bw, bh); ctx.clip();
    if (m !== 3) {
      const ang = m === 1 ? 0 : m === 2 ? Math.PI : -Math.PI / 4;
      const ca = Math.cos(ang), sa = Math.sin(ang), sp = 52, ph = RM ? 0 : (t * 70) % sp;
      ctx.strokeStyle = 'rgba(109,40,217,.38)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const cx0 = ZX + bw / 2, cy0 = H / 2;
      ctx.beginPath();
      for (let a = -9; a <= 9; a++) {
        for (let b = -9; b <= 9; b++) {
          const along = a * sp + ph, across = b * 54 + ((a & 1) ? 27 : 0);
          const x = cx0 + ca * along - sa * across, y = cy0 + sa * along + ca * across;
          if (x < ZX - 12 || x > ZX + bw + 12 || y < top - 12 || y > top + bh + 12) continue;
          const fx = (px, py) => [x + ca * px - sa * py, y + sa * px + ca * py];
          const p1 = fx(-6, -8), p2 = fx(4, 0), p3 = fx(-6, 8);
          ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(109,40,217,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ZX, top); ctx.lineTo(ZX, top + bh); ctx.moveTo(ZX + bw, top); ctx.lineTo(ZX + bw, top + bh); ctx.stroke();
    ctx.restore();
    const lab = m === 3 ? '🪢 줄이 당기는 힘 3 N' : '💨 힘 구역 ' + ZF + ' N ' + (m === 1 ? '→' : m === 2 ? '←' : '↗');
    pill(lab, ZX + bw / 2, top + 20, { solid: true, color: '#7c3aed', size: 13 });
    if (isNew('zone')) newTag(ZX, top + 40, bw, 56);
  }
  function drawPost(t) {
    const cx = ZX, cy = Z.cy;
    // 점선 반원 (퍽이 돌 길)
    ctx.save();
    ctx.setLineDash([4, 7]); ctx.strokeStyle = 'rgba(109,40,217,.4)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, ROPE, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.restore();
    // 기둥(위에서 본 모습)
    softShadow(cx + 3, cy + 5, 17, 10, 0.3);
    ctx.save();
    const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 13);
    g.addColorStop(0, '#f8fafc'); g.addColorStop(0.6, '#94a3b8'); g.addColorStop(1, '#475569');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#334155'; ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
    ctx.restore();
    txt('기둥', cx, cy + 26, { size: 13, color: '#475569' });
  }
  function drawRope() {
    const k = Z.ropeK;
    if (k <= 0.01) return;
    const cx = ZX, cy = Z.cy, dx = PU.x - cx, dy = PU.y - cy, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ex = cx + ux * Math.min(L - R * 0.7, L * k), ey = cy + uy * Math.min(L - R * 0.7, L * k);
    ropeLine(cx, cy, ex, ey, 1, 5);
  }
  function drawRightAngle() {
    const m = Z.mode;
    if (m !== 3 || !Z.attached || Z.released) return;
    const nf = zoneNet(), nl = Math.hypot(nf.x, nf.y);
    const sp = Math.hypot(PU.vx, PU.vy);
    if (nl < 0.1 || sp < 5) return;
    const a = { x: PU.vx / sp, y: PU.vy / sp }, b = { x: nf.x / nl, y: nf.y / nl }, s = 15;
    ctx.save();
    ctx.lineJoin = 'miter'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(PU.x + a.x * s, PU.y + a.y * s); ctx.lineTo(PU.x + (a.x + b.x) * s, PU.y + (a.y + b.y) * s); ctx.lineTo(PU.x + b.x * s, PU.y + b.y * s); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.strokeStyle = '#0f172a'; ctx.stroke();
    ctx.restore();
    const lx = PU.x - (a.x + b.x) * 46, ly = PU.y - (a.y + b.y) * 46;
    pill('수직 ∟', lx, ly, { color: '#0f172a', size: 12, fit: true });
  }
  function drawZone(dt, t) {
    drawRink();
    drawLegend(true);
    // 처음 방향(기준선)
    ctx.save();
    ctx.setLineDash([3, 8]); ctx.strokeStyle = 'rgba(71,85,105,.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(IN.l, Z.y); ctx.lineTo(IN.r, Z.y); ctx.stroke();
    ctx.restore();
    if (Z.st === 'ready' || Z.st === 'launch') txt('처음 방향', IN.r - 6, Z.y - 14, { align: 'right', size: 12, color: '#64748b' });
    drawBand(t);
    if (Z.mode === 3) drawPost(t);
    drawLauncher(X0, Z.y);
    drawFlashes();
    drawRope();
    drawPuck(PU.x, PU.y, PU.alpha, 0.85 + 0.15 * EASE.outBack(clamp(PU.pop, 0, 1)));
    const nf = zoneNet(), nl = Math.hypot(nf.x, nf.y);
    const nm = Z.mode === 3 ? '줄이 당기는 힘 ' : '알짜힘 ';
    drawPuckVectors({ mx: PU.x, my: PU.y, nx: PU.x, ny: PU.y, netBehind: Z.mode === 3, netPill: nm + (Math.round(nl * 10) / 10) + ' N', motPill: '속력 ' + spdMS().toFixed(1) + ' m/s' });
    drawRightAngle();
    // 구역 앞뒤 속력 표시
    if (Z.exit && Z.st !== 'ready') {
      const r = Z.res[Z.mode];
      if (r && Z.mode !== 3) {
        pill('들어갈 때 ' + V_Z.toFixed(1) + ' m/s', ZX - 6, H - 44, { color: '#475569', size: 13, align: 'right' });
        pill('나갈 때 ' + r.v1.toFixed(1) + ' m/s', ZX + ZW[Z.mode] + 6, H - 44, { solid: true, color: r.spd === 'up' ? '#ea580c' : r.spd === 'down' ? '#2563eb' : '#475569', size: 13, align: 'left' });
      }
    }
  }
  /* 결과 표 */
  function thumbSVG(r) {
    const sp = (v) => v * 9;                           // 0.2초 동안 움직인 거리(그림 속 px)
    const o = 70, y1 = 13, y2 = 33;
    let s = '<svg viewBox="0 0 160 44" width="160" height="44" aria-hidden="true">';
    s += '<text x="4" y="' + (y1 + 4) + '" font-size="11" font-weight="800" fill="#64748b">앞</text><text x="4" y="' + (y2 + 4) + '" font-size="11" font-weight="800" fill="#64748b">뒤</text>';
    s += '<path d="M' + o + ' ' + y1 + ' H' + (o + sp(r.v0) * 3.4) + '" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"/>';
    for (let i = 0; i < 4; i++) s += '<circle cx="' + (o + sp(r.v0) * i).toFixed(1) + '" cy="' + y1 + '" r="3.6" fill="#334155"/>';
    const h = r.ang || 0, c = Math.cos(h), sn = Math.sin(h);
    s += '<path d="M' + o + ' ' + y2 + ' L' + (o + c * sp(r.v1) * 3.4).toFixed(1) + ' ' + (y2 + sn * sp(r.v1) * 3.4).toFixed(1) + '" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"/>';
    for (let i = 0; i < 4; i++) s += '<circle cx="' + (o + c * sp(r.v1) * i).toFixed(1) + '" cy="' + (y2 + sn * sp(r.v1) * i).toFixed(1) + '" r="3.6" fill="' + (r.spd === 'up' ? '#ea580c' : r.spd === 'down' ? '#2563eb' : '#334155') + '"/>';
    return s + '</svg>';
  }
  function renderTable(fresh) {
    const body = $('#resBody');
    if (!body) return;
    const ms = [1, 2, 3, 4];
    const cell = (cls, html) => '<td class="' + cls + '">' + html + '</td>';
    let h1 = '<tr class="hd"><th>실험</th>', h2 = '<tr class="pic"><th>섬광 간격</th>', h3 = '<tr><th>속력</th>', h4 = '<tr><th>운동 방향</th>';
    ms.forEach((m) => {
      const r = Z.res[m], f = fresh === m ? ' fresh' : '';
      h1 += '<td>' + MODE_NAME[m] + '</td>';
      if (!r) { h2 += cell('empty', '·'); h3 += cell('empty', '·'); h4 += cell('empty', '·'); return; }
      h2 += cell(f.trim(), thumbSVG(r));
      h3 += cell((r.spd + f).trim(), r.spd === 'up' ? '빨라짐 ↑ ' + r.v1.toFixed(1) : r.spd === 'down' ? '느려짐 ↓ ' + r.v1.toFixed(1) : '그대로 ' + r.v1.toFixed(1));
      h4 += cell((r.dir === 'turn' ? 'turn' : 'same') + f, r.dir === 'turn' ? '바뀜 ' + Math.round(Math.abs(r.ang) * 180 / Math.PI) + '°' : '그대로');
    });
    body.innerHTML = h1 + '</tr>' + h2 + '</tr>' + h3 + '</tr>' + h4 + '</tr>';
    $('#resN').textContent = '기록 ' + Object.keys(Z.res).length + ' / 4';
  }

  /* =========================================================
     장면 ③ 힘이 작용하지 않는 퍽 (다중 섬광 사진 만들기)
     ========================================================= */
  const G = { st: 'ready', t: 0, hold: 0, y: 262, v: 1.2 };
  function glideStart() {
    G.st = 'run'; G.t = 0; G.hold = 0;
    clearFlashes(); head0 = 0;
    PU.x = X0; PU.y = G.y; PU.vx = PU.vy = 0; PU.alpha = 1; PU.pop = 1;
    addFlash(14); startLaunch(X0);
    ARR.net.jump(0, 0); ARR.mot.jump(0, 0);
  }
  function stepGlide(dt) {
    if (G.st === 'ready') { glideStart(); return; }
    if (G.st === 'run') {
      G.t += dt;
      const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (let i = 0; i < n; i++) {
        const lt = G.t - dt + h * (i + 1);
        PU.vx = lt >= 0.16 ? G.v * PM : G.v * PM * EASE.outQuad(lt / 0.16);
        PU.x += PU.vx * h;
      }
      stepFlash(dt, true, 14);
      ARR.net.set(0, 0); setPuckVectors(0, 0);
      frostTrail(dt);
      if (PU.x >= IN.r - R - 8) { G.st = 'hold'; G.hold = 0; }
    } else if (G.st === 'hold') {
      G.hold += dt;
      PU.alpha = Math.max(0, 1 - G.hold / 0.5);
      stepFlash(dt, false);
      ARR.mot.set(0, 0);
      if (G.hold > 4.2) { G.st = 'ready'; }
    }
    ARR.net.update(dt); ARR.mot.update(dt);
  }
  function drawGlide(dt, t) {
    drawRink();
    drawLegend(true);
    drawLauncher(X0, G.y);
    drawFlashes();
    drawPuck(PU.x, PU.y, PU.alpha, 1);
    drawPuckVectors({ mx: PU.x, my: PU.y, nx: PU.x, ny: PU.y, netPill: '알짜힘 0 N', motPill: '속력 ' + spdMS().toFixed(1) + ' m/s' });
    pill('알짜힘 0 N · 0.2초마다 한 장씩 찍은 사진', W / 2, H - 28, { color: '#475569', size: 13, fit: true });
  }

  /* =========================================================
     장면 ④ 옆에서 본 모습: 위로 던진 공 · 굴러가다 멈추는 공 (3단계 퀴즈)
     ========================================================= */
  const SA = { mot: new AArrow(), grav: new AArrow(), net: new AArrow(), hand: new AArrow(), fric: new AArrow() };
  function saJump() { Object.keys(SA).forEach((k) => SA[k].jump(0, 0)); }
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#cfe8ff'); g.addColorStop(1, '#f5faff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    [[0.12, 62, 1], [0.5, 40, 0.75], [0.88, 96, 1.15]].forEach(([fx, y, s]) => {
      const x = W * fx;
      ctx.beginPath();
      ctx.arc(x, y, 22 * s, 0, TAU); ctx.arc(x + 26 * s, y - 8 * s, 28 * s, 0, TAU); ctx.arc(x + 54 * s, y, 22 * s, 0, TAU); ctx.rect(x, y, 54 * s, 22 * s);
      ctx.fill();
    });
  }
  function ballSprite(x, y, r, rot, base) {
    D.sphere(x, y, r, base, { shadow: false, gloss: true });
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(120,53,15,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-r * 0.9, 0, r * 0.95, -1.2, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.95, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 위로 던진 공 (느리게 보기 ×0.4) ---------- */
  const TO_X = Math.round(W * 0.3), TO_G = 9.8, TO_V0 = 6.0, TO_PM = 150, TO_SLOW = 0.4, TO_BR = 17;
  const TO_PALM = 436, TO_RISE = 40, TO_WT = 3, TO_VS = 20, TO_COL = Math.round(W * 0.78);
  const TO_YREST = TO_PALM - TO_BR - 3, TO_YREL = TO_PALM - TO_RISE - TO_BR - 3, TO_TEND = 2 * TO_V0 / TO_G;
  const TO = { st: 'ready', t: 0, rt: 0, v: 0, y: TO_YREST, palm: TO_PALM, dots: [], nd: 0, ph: '' };
  function tossStart() {
    TO.st = 'ready'; TO.t = 0; TO.rt = 0; TO.v = 0; TO.y = TO_YREST; TO.palm = TO_PALM; TO.dots = []; TO.nd = 0; TO.ph = '';
    saJump(); badges.length = 0;
  }
  function stepToss(dt) {
    if (TO.st === 'ready') {
      TO.t += dt; TO.v = 0;
      if (TO.t > 0.9) { TO.st = 'throw'; TO.t = 0; Sound.tick(); }
    } else if (TO.st === 'throw') {
      TO.t += dt;
      const p = clamp(TO.t / 0.34, 0, 1), e = EASE.outQuad(p);
      TO.palm = TO_PALM - TO_RISE * e; TO.y = TO.palm - TO_BR - 3; TO.v = TO_V0 * e;
      if (p >= 1) {
        TO.st = 'fly'; TO.t = 0; TO.rt = 0; TO.v = TO_V0; TO.dots = [TO_YREL]; TO.nd = 0;
        FX.burst(TO_X, TO.palm - 4, { count: 8, life: 0.45, speed: 90, gravity: 0, size: 3, shape: 'circle', colors: ['#fde68a', '#ffffff'] });
        badge('손을 떠났어요! 이제 던지는 힘은 없어요', TO_X + 70, TO.palm + 20, '#ea580c', 3.2);
      }
    } else if (TO.st === 'fly') {
      TO.t += dt; TO.rt = Math.min(TO_TEND, TO.rt + dt * TO_SLOW);
      const rt = TO.rt, h = TO_V0 * rt - 0.5 * TO_G * rt * rt;
      TO.v = TO_V0 - TO_G * rt; TO.y = TO_YREL - h * TO_PM;
      while ((TO.nd + 1) * 0.1 <= rt) { TO.nd++; const tk = TO.nd * 0.1; TO.dots.push(TO_YREL - (TO_V0 * tk - 0.5 * TO_G * tk * tk) * TO_PM); }
      const target = rt > TO_TEND - 0.16 ? TO_PALM - TO_RISE : TO_PALM;
      TO.palm = approach(TO.palm, target, dt, 10);
      if (rt >= TO_TEND) { TO.st = 'done'; TO.t = 0; TO.y = TO_YREL; TO.v = 0; TO.palm = TO_PALM - TO_RISE; Sound.tick(); }
    } else if (TO.st === 'done') {
      TO.t += dt; TO.v = 0; TO.y = TO_YREL; TO.palm = approach(TO.palm, TO_PALM - TO_RISE, dt, 10);
    }
    const flying = TO.st === 'fly';
    if (flying && Math.abs(TO.v) > 0.15) SA.mot.set(0, -TO.v * TO_VS); else SA.mot.set(0, 0);
    SA.grav.set(0, flying ? TO_WT * NPX : 0); SA.net.set(0, flying ? TO_WT * NPX : 0);
    SA.hand.set(0, TO.st === 'throw' ? -4 * NPX : 0);
    Object.keys(SA).forEach((k) => SA[k].update(dt));
    TO.ph = TO.st === 'throw' ? '손으로 밀어 올리는 중' : TO.st === 'fly' ? (Math.abs(TO.v) < 0.25 ? '꼭대기' : TO.v > 0 ? '⬆ 올라가는 중' : '⬇ 내려오는 중') : TO.st === 'done' ? '손으로 받았어요' : '';
  }
  function drawToss(dt, t) {
    drawSky();
    const gg = ctx.createLinearGradient(0, 470, 0, H);
    gg.addColorStop(0, '#8fd18a'); gg.addColorStop(0.12, '#6cbf6a'); gg.addColorStop(0.13, '#c9a776'); gg.addColorStop(1, '#a8865a');
    ctx.fillStyle = gg; ctx.fillRect(0, 470, W, H - 470);
    // 다중 섬광 열: 0.1초마다 공의 높이
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; rr(TO_COL - 50, 56, 100, 404, 16); ctx.fill();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 2; rr(TO_COL - 50, 56, 100, 404, 16); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TO_COL, 66); ctx.lineTo(TO_COL, 450); ctx.stroke();
    TO.dots.forEach((y, i) => {
      ctx.fillStyle = 'rgba(245,158,11,.5)'; ctx.beginPath(); ctx.arc(TO_COL, y, TO_BR * 0.85, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(180,83,9,.7)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(TO_COL, y, 2.4, 0, TAU); ctx.fill();
    });
    ctx.restore();
    pill('📸 0.1초마다 찍은 사진', TO_COL, 40, { color: '#b45309', size: 13, fit: true });
    if (TO.st === 'fly') {                                 // 지금 공의 높이 표시
      ctx.save(); ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(TO_COL - 56, TO.y - 6); ctx.lineTo(TO_COL - 46, TO.y); ctx.lineTo(TO_COL - 56, TO.y + 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 손(팔)
    const px = TO_X, py = TO.palm;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.2)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#60a5fa'; rr(px - 20, py + 10, 40, H - py, 10); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fb923c'; rr(px - 21, py + 10, 42, 12, 4); ctx.fill();
    ctx.fillStyle = '#fff7ed'; ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 2.2;
    rr(px - 34, py - 2, 68, 15, 7.5); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(154,52,18,.5)';
    [-14, 0, 14].forEach((dx) => { ctx.beginPath(); ctx.moveTo(px + dx, py + 1); ctx.lineTo(px + dx, py + 7); ctx.stroke(); });
    // 공
    const by = TO.y;
    softShadow(TO_X, 466, 24 + (TO_YREST - by) * 0.04, 6, 0.22);
    ballSprite(TO_X, by, TO_BR + 1, 0.4, '#f59e0b');
    // 화살표
    const A = SA;
    if (A.hand.shown && A.hand.len > 2) { forceArrow(TO_X, py - 2, A.hand.dx * A.hand.k, A.hand.dy * A.hand.k, COL.hand, { width: 8, head: 18 }); pill('던지는 힘', TO_X - 60, py - 40, { color: COL.hand, size: 13, align: 'right' }); }
    if (A.mot.shown && A.mot.len > 2) {
      const dy = A.mot.dy * A.mot.k;
      hollowArrow(TO_X - 44, by, 0, dy);
      pill('속력 ' + Math.abs(TO.v).toFixed(1) + ' m/s', TO_X - 62, by + dy / 2 + (dy < 0 ? 0 : 0), { color: COL.motion, size: 13, align: 'right', fit: true });
    }
    if (A.grav.shown && A.grav.len > 2) {
      const dy = A.grav.dy * A.grav.k;
      forceArrow(TO_X + 38, by, 0, dy, COL.grav, { width: 7, head: 18 });
      const dn = A.net.dy * A.net.k;
      forceArrow(TO_X + 66, by, 0, dn, COL.net, { width: 9, head: 20, glow: true });
      pill('중력 ' + TO_WT + ' N', TO_X + 88, by + dy * 0.35, { color: COL.grav, size: 13, align: 'left', fit: true });
      pill('알짜힘 ' + TO_WT + ' N', TO_X + 88, by + dy * 0.35 + 30, { color: COL.net, size: 13, align: 'left', fit: true });
    }
    if (TO.ph) pill(TO.ph, W / 2 - (PHONE ? 20 : 60), 36, { solid: true, color: '#475569', size: 14, fit: true });
    pill('🐢 느리게 보기 · 공기 저항은 생각하지 않아요', W / 2, H - 22, { color: '#475569', size: 12.5, fit: true });
  }

  /* ---------- 굴러가다 멈추는 공 ---------- */
  const RO_FLOOR = 372, RO_R = 24, RO_V0 = PHONE ? 2.6 : 3.0, RO_A = 1.0, RO_X0 = PHONE ? 58 : 70;
  const RO = { st: 'ready', t: 0, x: RO_X0, v: 0, dots: [], clk: 0, rot: 0, endT: 0 };
  function rollStart() {
    RO.st = 'run'; RO.t = 0; RO.x = RO_X0; RO.v = RO_V0; RO.dots = [RO_X0]; RO.clk = 0; RO.rot = 0; RO.endT = 0;
    saJump(); badges.length = 0;
  }
  function stepRoll(dt) {
    if (RO.st === 'ready') { rollStart(); return; }
    if (RO.st === 'run') {
      RO.t += dt;
      const v0 = RO.v; RO.v = Math.max(0, RO.v - RO_A * dt);
      const dx = (v0 + RO.v) / 2 * PM * dt;
      RO.x += dx; RO.rot += dx / RO_R;
      RO.clk += dt; while (RO.clk >= FDT) { RO.clk -= FDT; RO.dots.push(RO.x); }
      if (RO.v <= 0) { RO.st = 'done'; RO.endT = 0; RO.dots.push(RO.x); Sound.tick(); badge('멈췄어요', RO.x, RO_FLOOR - 120, '#475569', 2.6); }
    } else if (RO.st === 'done') RO.endT += dt;
    const run = RO.st === 'run';
    SA.mot.set(run ? RO.v * VPX : 0, 0);
    SA.fric.set(run ? -1 * NPX : 0, 0);
    SA.net.set(run ? -1 * NPX : 0, 0);
    Object.keys(SA).forEach((k) => SA[k].update(dt));
  }
  function pinShape(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.bezierCurveTo(-9, -12, -4, -20, -3, -26); ctx.bezierCurveTo(-8, -32, -3, -42, 0, -42); ctx.bezierCurveTo(3, -42, 8, -32, 3, -26);
    ctx.bezierCurveTo(4, -20, 9, -12, 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-4, -33, 8, 3);
    ctx.restore();
  }
  function drawRoll(dt, t) {
    drawSky();
    // 레인(옆에서 본 마룻바닥)
    const fg = ctx.createLinearGradient(0, RO_FLOOR, 0, H);
    fg.addColorStop(0, '#e8c28a'); fg.addColorStop(0.2, '#d9a566'); fg.addColorStop(1, '#b57d44');
    ctx.fillStyle = fg; ctx.fillRect(0, RO_FLOOR, W, H - RO_FLOOR);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, RO_FLOOR, W, 3);
    ctx.strokeStyle = 'rgba(120,70,30,.28)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 6; i++) { const y = RO_FLOOR + 6 + i * i * 4.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    [W - 92, W - 66, W - 40].forEach((x, i) => pinShape(x, RO_FLOOR - 1, 0.9));
    // 섬광 (지나간 자리에 남은 공 사진)
    ctx.save();
    RO.dots.forEach((x) => {
      ctx.fillStyle = 'rgba(59,74,99,.28)'; ctx.beginPath(); ctx.arc(x, RO_FLOOR - RO_R, RO_R * 0.95, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(30,41,59,.6)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, RO_FLOOR - RO_R, 2.6, 0, TAU); ctx.fill();
    });
    ctx.restore();
    softShadow(RO.x + 3, RO_FLOOR + 3, RO_R + 4, 6, 0.28);
    D.sphere(RO.x, RO_FLOOR - RO_R, RO_R, '#3b4a63', { shadow: false });
    ctx.fillStyle = '#0b1220';
    [0, 0.75, 1.5].forEach((d) => { const a = RO.rot + d - 0.2; ctx.beginPath(); ctx.arc(RO.x + Math.cos(a) * RO_R * 0.5, RO_FLOOR - RO_R + Math.sin(a) * RO_R * 0.5, 3.2, 0, TAU); ctx.fill(); });
    // 화살표: 알짜힘(보라) · 운동 방향(회색) · 마찰력(갈색)
    const A = SA, y = RO_FLOOR - RO_R;
    if (A.net.shown && A.net.len > 2) {
      const dx = A.net.dx * A.net.k;
      forceArrow(RO.x, y - 86, dx, 0, COL.net, { width: 9, head: 20, glow: true });
      pill('알짜힘 1 N', RO.x + dx - 54, y - 86, { color: COL.net, size: 13, fit: true });
    }
    if (A.mot.shown && A.mot.len > 2) {
      const dx = A.mot.dx * A.mot.k;
      hollowArrow(RO.x, y - 50, dx, 0);
      pill('속력 ' + (RO.v).toFixed(1) + ' m/s', RO.x + dx + 62, y - 50, { color: COL.motion, size: 13, fit: true });
    }
    if (A.fric.shown && A.fric.len > 2) {
      const dx = A.fric.dx * A.fric.k;
      forceArrow(RO.x, RO_FLOOR, dx, 0, COL.fric, { width: 7, head: 16 });
      pill('마찰력 1 N', RO.x + dx - 52, RO_FLOOR + 28, { color: COL.fric, size: 13, fit: true });
    }
    pill('수평 방향의 힘만 생각해요 · 0.2초마다 한 장씩', W / 2, H - 22, { color: '#475569', size: 12.5, fit: true });
  }

  /* =========================================================
     장면 ⑤ 놀이공원 사례 조사·분류 (4단계)
     카드를 누르면 조사 창에서 다중 섬광·알짜힘 화살표가 재생되고, 통으로 끌어다 놓아 분류해요.
     ========================================================= */
  const BUCKETS = [
    { cls: 'speed', title: '속력만 변함', color: '#ea580c', soft: '#fff1e6' },
    { cls: 'dir', title: '방향만 변함', color: '#2563eb', soft: '#e8f0ff' },
    { cls: 'both', title: '속력과 방향 모두 변함', color: '#7c3aed', soft: '#f3eeff' },
  ];
  const RIDES = [
    { id: 'drop', name: '자이로드롭 낙하', icon: '🗼', cls: 'speed', cap: '높은 곳에서 아래로 떨어져요', why: '중력이 운동 방향과 같아서 속력만 커져요' },
    { id: 'train', name: '출발하는 열차', icon: '🚆', cls: 'speed', cap: '직선 레일에서 멈춰 있다가 출발해요', why: '힘이 운동 방향과 같아서 속력만 커져요' },
    { id: 'bowl', name: '굴러가는 볼링공', icon: '🎳', cls: 'speed', cap: '곧은 레인을 굴러가다가 멈춰요', why: '마찰력이 운동 방향과 반대라서 속력만 줄어요' },
    { id: 'horse', name: '도는 회전목마', icon: '🎠', cls: 'dir', cap: '원을 그리며 돌아요', why: '힘이 늘 운동 방향에 수직이라서 방향만 바뀌어요' },
    { id: 'wheel', name: '대관람차', icon: '🎡', cls: 'dir', cap: '커다란 원을 그리며 돌아요', why: '힘이 늘 운동 방향에 수직이라서 방향만 바뀌어요' },
    { id: 'viking', name: '바이킹', icon: '🚢', cls: 'both', cap: '그네처럼 왔다 갔다 해요', why: '힘이 비스듬해서 속력과 방향이 모두 바뀌어요' },
    { id: 'coaster', name: '롤러코스터 루프', icon: '🎢', cls: 'both', cap: '둥근 고리 모양 레일을 따라 달려요', why: '힘의 방향이 비스듬하게 바뀌어 속력과 방향이 모두 바뀌어요' },
    { id: 'ring', name: '던진 고리', icon: '⭕', cls: 'both', cap: '손을 떠난 고리가 날아가요', why: '중력이 운동 방향과 비스듬해서 속력과 방향이 모두 바뀌어요' },
  ];
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const LW = 450, LH = 180;                      // 놀이 기구 그림의 기준 크기

  /* ---------- 놀이 기구 움직임 모형: pos(t) (그림 좌표, px) ---------- */
  const COG = 220;                               // 롤러코스터 중력(시각용)
  const CO = { x0: 28, y0: 36, x1: 130, y1: 150, xe: 250, r: 40, xo: 424 };
  CO.rampL = Math.hypot(CO.x1 - CO.x0, CO.y1 - CO.y0); CO.flat = CO.xe - CO.x1; CO.loopL = TAU * CO.r; CO.exitL = CO.xo - CO.xe;
  CO.total = CO.rampL + CO.flat + CO.loopL + CO.exitL; CO.H = CO.y1 - CO.y0; CO.cy = CO.y1 - CO.r;
  function coInfo(s) {                           // 트랙 위 s(px) 지점의 위치·접선·높이·곡률 중심
    s = clamp(s, 0, CO.total);
    if (s <= CO.rampL) {
      const u = s / CO.rampL;
      return { x: CO.x0 + (CO.x1 - CO.x0) * u, y: CO.y0 + (CO.y1 - CO.y0) * u, tx: (CO.x1 - CO.x0) / CO.rampL, ty: (CO.y1 - CO.y0) / CO.rampL, h: CO.H * (1 - u), dh: -CO.H / CO.rampL, loop: false };
    }
    s -= CO.rampL;
    if (s <= CO.flat) return { x: CO.x1 + s, y: CO.y1, tx: 1, ty: 0, h: 0, dh: 0, loop: false };
    s -= CO.flat;
    if (s <= CO.loopL) {
      const f = s / CO.r;
      return { x: CO.xe + CO.r * Math.sin(f), y: CO.cy + CO.r * Math.cos(f), tx: Math.cos(f), ty: -Math.sin(f), h: CO.r * (1 - Math.cos(f)), dh: Math.sin(f), loop: true, nx: -Math.sin(f), ny: -Math.cos(f) };
    }
    s -= CO.loopL;
    return { x: CO.xe + s, y: CO.y1, tx: 1, ty: 0, h: 0, dh: 0, loop: false };
  }
  const coSpeed = (s) => Math.sqrt(Math.max(14 * 14, 2 * COG * (CO.H - coInfo(s).h)));
  const COT = [];                                // s(t) 표 (1/240초 간격)
  (function () { let s = 0; for (let i = 0; i < 4000 && s < CO.total; i++) { COT.push(s); s += coSpeed(s) / 240; } })();
  const coS = (t) => { const f = clamp(t * 240, 0, COT.length - 1), i = Math.floor(f); return COT[i] + (COT[Math.min(COT.length - 1, i + 1)] - COT[i]) * (f - i); };

  const MODELS = {
    drop: {
      T: 1.5, pos: (t) => ({ x: 225, y: 28 + 56 * t * t }),
      bg(c) {
        c.fillStyle = '#dbeafe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#86d17a'; c.fillRect(-300, 168, LW + 600, 52);
        c.fillStyle = '#94a3b8'; c.fillRect(219, 12, 12, 156);
        c.fillStyle = '#e2e8f0'; for (let y = 20; y < 160; y += 16) c.fillRect(219, y, 12, 5);
        c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(212, 12); c.lineTo(238, 12); c.lineTo(225, -2); c.closePath(); c.fill();
        c.fillStyle = '#64748b'; c.fillRect(196, 164, 58, 8);
      },
      tok(c, p) { c.fillStyle = '#f97316'; rrc(c, p.x - 20, p.y - 7, 40, 14, 5); c.fill(); c.fillStyle = '#fde68a'; [-11, -2, 7].forEach((dx) => { c.beginPath(); c.arc(p.x + dx + 2, p.y - 11, 4, 0, TAU); c.fill(); }); },
    },
    train: {
      T: 3.4, pos: (t) => ({ x: 52 + 30 * t * t, y: 124 }),
      bg(c) {
        c.fillStyle = '#e0f2fe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#c7e8b5'; c.fillRect(-300, 140, LW + 600, 80);
        c.fillStyle = '#a16207'; for (let x = -294; x < LW + 300; x += 14) c.fillRect(x, 142, 8, 16);
        c.fillStyle = '#64748b'; c.fillRect(-300, 146, LW + 600, 4); c.fillRect(-300, 154, LW + 600, 4);
        c.fillStyle = '#cbd5e1'; c.fillRect(8, 112, 30, 28); c.fillStyle = '#ef4444'; c.fillRect(4, 106, 38, 8);
        c.fillStyle = '#334155'; c.fillRect(410, 122, 8, 22);
      },
      tok(c, p) {
        c.fillStyle = '#2563eb'; rrc(c, p.x - 26, p.y - 12, 52, 26, 6); c.fill();
        c.fillStyle = '#bfdbfe'; c.fillRect(p.x - 18, p.y - 7, 12, 9); c.fillRect(p.x + 2, p.y - 7, 12, 9);
        c.fillStyle = '#1e293b'; [-14, 14].forEach((dx) => { c.beginPath(); c.arc(p.x + dx, p.y + 15, 5.5, 0, TAU); c.fill(); });
      },
    },
    bowl: {
      T: 3.4, pos: (t) => ({ x: 46 + 170 * t - 25 * t * t, y: 123 }),
      bg(c) {
        c.fillStyle = '#fef3c7'; c.fillRect(-300, -100, LW + 600, LH + 200);
        const g = c.createLinearGradient(0, 136, 0, 180); g.addColorStop(0, '#e8c28a'); g.addColorStop(1, '#b57d44');
        c.fillStyle = g; c.fillRect(-300, 136, LW + 600, 84);
        c.strokeStyle = 'rgba(120,70,30,.3)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-300, 148 + i * 12); c.lineTo(LW + 300, 148 + i * 12); c.stroke(); }
        [392, 410, 428].forEach((x) => { c.fillStyle = '#fff'; c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5; rrc(c, x - 5, 108, 10, 28, 5); c.fill(); c.stroke(); c.fillStyle = '#ef4444'; c.fillRect(x - 4, 116, 8, 3); });
      },
      tok(c, p, rt) {
        c.fillStyle = '#1e293b'; c.beginPath(); c.arc(p.x, p.y, 13, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(p.x - 4, p.y - 5, 4, 2.2, -0.6, 0, TAU); c.fill();
        c.fillStyle = '#0f172a'; const a = p.x / 13; [0, 0.7, 1.4].forEach((d) => { c.beginPath(); c.arc(p.x + Math.cos(a + d) * 6, p.y + Math.sin(a + d) * 6, 1.8, 0, TAU); c.fill(); });
      },
    },
    horse: {
      T: 5.4, pos: (t) => { const a = -Math.PI / 2 + 1.16 * t; return { x: 225 + 66 * Math.cos(a), y: 92 + 66 * Math.sin(a) }; },
      bg(c, rt) {
        c.fillStyle = '#e0f2fe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        for (let i = 0; i < 10; i++) {                                      // 위에서 본 지붕
          const a0 = i * TAU / 10 + 1.16 * rt, a1 = a0 + TAU / 10;
          c.fillStyle = i % 2 ? '#fecdd3' : '#fda4af'; c.beginPath(); c.moveTo(225, 92); c.arc(225, 92, 86, a0, a1); c.closePath(); c.fill();
        }
        c.strokeStyle = '#be123c'; c.lineWidth = 3; c.beginPath(); c.arc(225, 92, 86, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(225, 92, 36, 0, TAU); c.fill();
        c.fillStyle = '#facc15'; c.beginPath(); c.arc(225, 92, 8, 0, TAU); c.fill();
      },
      tok(c, p) { c.fillStyle = '#fff'; c.strokeStyle = '#7c3aed'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 12, 0, TAU); c.fill(); c.stroke(); c.font = '15px ' + EMOJI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText('🐴', p.x, p.y + 1); c.textBaseline = 'alphabetic'; },
    },
    wheel: {
      T: 4.6, pos: (t) => { const a = Math.PI * 0.75 + 0.9 * t; return { x: 225 + 70 * Math.cos(a), y: 94 + 70 * Math.sin(a) }; },
      bg(c, rt) {
        c.fillStyle = '#e0f2fe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#86d17a'; c.fillRect(-300, 168, LW + 600, 52);
        c.strokeStyle = '#64748b'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(225, 94); c.lineTo(190, 170); c.moveTo(225, 94); c.lineTo(260, 170); c.stroke();
        const a0 = Math.PI * 0.75 + 0.9 * rt;
        c.strokeStyle = '#94a3b8'; c.lineWidth = 2.5;
        for (let i = 0; i < 8; i++) { const a = a0 + i * TAU / 8; c.beginPath(); c.moveTo(225, 94); c.lineTo(225 + 70 * Math.cos(a), 94 + 70 * Math.sin(a)); c.stroke(); }
        c.strokeStyle = '#475569'; c.lineWidth = 4; c.beginPath(); c.arc(225, 94, 70, 0, TAU); c.stroke();
        for (let i = 0; i < 8; i++) { const a = a0 + (i + 0.5) * TAU / 8; c.fillStyle = ['#fb7185', '#fbbf24', '#34d399', '#60a5fa'][i % 4]; rrc(c, 225 + 70 * Math.cos(a) - 6, 94 + 70 * Math.sin(a) - 4, 12, 10, 3); c.fill(); }
        c.fillStyle = '#facc15'; c.beginPath(); c.arc(225, 94, 7, 0, TAU); c.fill();
      },
      tok(c, p) { c.fillStyle = '#fff'; c.strokeStyle = '#7c3aed'; c.lineWidth = 3; rrc(c, p.x - 11, p.y - 8, 22, 17, 5); c.fill(); c.stroke(); c.fillStyle = '#bfdbfe'; c.fillRect(p.x - 7, p.y - 4, 14, 6); },
    },
    viking: {
      T: 4.2, pos: (t) => { const th = -Math.cos(1.5 * t); return { x: 225 + 128 * Math.sin(th), y: 16 + 128 * Math.cos(th) }; },
      bg(c, rt) {
        c.fillStyle = '#e0f2fe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#86d17a'; c.fillRect(-300, 168, LW + 600, 52);
        c.strokeStyle = '#64748b'; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(225, 14); c.lineTo(172, 170); c.moveTo(225, 14); c.lineTo(278, 170); c.stroke();
        const th = -Math.cos(1.5 * rt), px = 225 + 128 * Math.sin(th), py = 16 + 128 * Math.cos(th);
        c.strokeStyle = '#a16207'; c.lineWidth = 4; c.beginPath(); c.moveTo(225, 16); c.lineTo(px, py); c.stroke();
        c.fillStyle = '#facc15'; c.beginPath(); c.arc(225, 14, 6, 0, TAU); c.fill();
      },
      tok(c, p, rt) {
        const th = -Math.cos(1.5 * rt);
        c.save(); c.translate(p.x, p.y); c.rotate(-th);
        c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-24, -6); c.lineTo(24, -6); c.lineTo(16, 9); c.lineTo(-16, 9); c.closePath(); c.fill();
        c.fillStyle = '#fde68a'; [-10, 0, 10].forEach((dx) => { c.beginPath(); c.arc(dx, -10, 3.6, 0, TAU); c.fill(); });
        c.restore();
      },
    },
    coaster: {
      get T() { return COT.length / 240; },
      pos: (t) => { const i = coInfo(coS(t)); return { x: i.x, y: i.y }; },
      kin(t) {
        const s = coS(t), i = coInfo(s), v = coSpeed(s);
        const at = -COG * i.dh, an = i.loop ? v * v / CO.r : 0;
        return { x: i.x, y: i.y, vx: v * i.tx, vy: v * i.ty, ax: at * i.tx + (i.loop ? an * i.nx : 0), ay: at * i.ty + (i.loop ? an * i.ny : 0) };
      },
      bg(c) {
        c.fillStyle = '#e0f2fe'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#86d17a'; c.fillRect(-300, 160, LW + 600, 60);
        c.strokeStyle = '#94a3b8'; c.lineWidth = 3;
        for (let x = 40; x < 250 - 50; x += 26) { const y = CO.y0 + (CO.y1 - CO.y0) * (x - CO.x0) / (CO.x1 - CO.x0); if (x < CO.x1) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, 160); c.stroke(); } }
        c.strokeStyle = '#ef4444'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(CO.x0, CO.y0); c.lineTo(CO.x1, CO.y1); c.lineTo(CO.xe, CO.y1); c.stroke();
        c.beginPath(); c.arc(CO.xe, CO.cy, CO.r, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(CO.xe, CO.y1); c.lineTo(CO.xo, CO.y1); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.setLineDash([3, 6]);
        c.beginPath(); c.moveTo(CO.x0, CO.y0); c.lineTo(CO.x1, CO.y1); c.lineTo(CO.xe, CO.y1); c.arc(CO.xe, CO.cy, CO.r, Math.PI / 2, Math.PI / 2 + TAU); c.moveTo(CO.xe, CO.y1); c.lineTo(CO.xo, CO.y1); c.stroke(); c.setLineDash([]);
      },
      tok(c, p, rt) {
        const k = this.kin(rt), a = Math.atan2(k.vy, k.vx);
        c.save(); c.translate(p.x, p.y); c.rotate(a);
        c.fillStyle = '#2563eb'; rrc(c, -13, -9, 26, 14, 4); c.fill();
        c.fillStyle = '#fde68a'; c.beginPath(); c.arc(-4, -10, 3.4, 0, TAU); c.arc(5, -10, 3.4, 0, TAU); c.fill();
        c.restore();
      },
    },
    ring: {
      T: 2.17, pos: (t) => ({ x: 52 + 110 * t, y: 150 - 130 * t + 60 * t * t }),
      bg(c) {
        c.fillStyle = '#fef9c3'; c.fillRect(-300, -100, LW + 600, LH + 200);
        c.fillStyle = '#86d17a'; c.fillRect(-300, 158, LW + 600, 62);
        c.fillStyle = '#fb923c'; rrc(c, 20, 144, 36, 22, 6); c.fill();
        c.fillStyle = '#fff7ed'; c.strokeStyle = '#9a3412'; c.lineWidth = 2; rrc(c, 36, 124, 20, 24, 8); c.fill(); c.stroke();
        c.fillStyle = '#a16207'; c.fillRect(300, 130, 8, 30); c.fillRect(340, 130, 8, 30); c.fillRect(380, 130, 8, 30);
        c.fillStyle = '#8b5a2b'; c.fillRect(280, 158, 130, 6);
      },
      tok(c, p) { c.strokeStyle = '#ef4444'; c.lineWidth = 4.5; c.beginPath(); c.ellipse(p.x, p.y, 11, 7, 0, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(p.x, p.y - 1, 9.5, 5.5, 0, Math.PI, TAU - 0.6); c.stroke(); },
    },
  };
  function rrc(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  /* 속도·알짜힘 방향 (그림 좌표, px/s · px/s²) — 위치 함수를 미분해서 얻어요 */
  function kinOf(md, t) {
    if (md.kin) return md.kin(t);
    const T = md.T, h = 0.004, t1 = Math.min(T, t + h), tm = Math.max(0, t - h), d = (t1 - tm) || h;
    const p1 = md.pos(t1), pm = md.pos(tm), p0 = md.pos(t);
    const h2 = 0.02, tc = clamp(t, h2, T - h2), a1 = md.pos(tc + h2), a0 = md.pos(tc), am = md.pos(tc - h2);
    return { x: p0.x, y: p0.y, vx: (p1.x - pm.x) / d, vy: (p1.y - pm.y) / d, ax: (a1.x - 2 * a0.x + am.x) / (h2 * h2), ay: (a1.y - 2 * a0.y + am.y) / (h2 * h2) };
  }
  function modelRange(md) {
    if (md._vmax) return;
    let vm = 1, am = 1;
    for (let i = 0; i <= 60; i++) { const k = kinOf(md, md.T * i / 60); vm = Math.max(vm, Math.hypot(k.vx, k.vy)); am = Math.max(am, Math.hypot(k.ax, k.ay)); }
    md._vmax = vm; md._amax = am;
  }

  /* ---------- 배치 ---------- */
  function parkLayout() {
    if (!PHONE) {
      const pv = { x: 14, y: 12, w: W - 28, h: 196 };
      const cw = (W - 28 - 27) / 4, ch = 44;
      const cards = RIDES.map((r, i) => ({ x: 14 + (i % 4) * (cw + 9), y: 220 + Math.floor(i / 4) * (ch + 8), w: cw, h: ch }));
      const bw = (W - 28 - 20) / 3;
      const bk = [0, 1, 2].map((i) => ({ x: 14 + i * (bw + 10), y: 330, w: bw, h: 180 }));
      return { pv, cards, bk, stage: { x: pv.x + 12, y: pv.y + 30, w: 452, h: 156 }, graph: { x: pv.x + 480, y: pv.y + 10, w: pv.w - 492, h: pv.h - 20 }, chip: { w: (bw - 30) / 2, h: 40, cols: 2 } };
    }
    const pv = { x: 8, y: 8, w: W - 16, h: 188 };
    const cw = (W - 16 - 18) / 4, ch = 48;
    const cards = RIDES.map((r, i) => ({ x: 8 + (i % 4) * (cw + 6), y: 204 + Math.floor(i / 4) * (ch + 6), w: cw, h: ch }));
    const bw = (W - 16 - 16) / 3;
    const bk = [0, 1, 2].map((i) => ({ x: 8 + i * (bw + 8), y: 322, w: bw, h: 190 }));
    return { pv, cards, bk, stage: { x: pv.x + 8, y: pv.y + 26, w: 330, h: 150 }, graph: { x: pv.x + 346, y: pv.y + 8, w: pv.w - 354, h: pv.h - 16 }, chip: { w: bw - 16, h: 40, cols: 1 } };
  }
  const PL_ = parkLayout();
  const K = {
    cards: RIDES.map((r, i) => {
      const h = PL_.cards[i];
      return { i, r, x: h.x, y: h.y, w: h.w, h: h.h, tw: h.w, th: h.h, home: h, lift: 0, placed: -1, slot: -1, shake: 0 };
    }),
    sel: 0, drag: null, msg: null, hover: -1, tapped: false, poster: false, posterAt: 0, placedN: 0, doneAll: false, pop: [0, 0, 0],
  };
  const KP = { ph: 'wait', t: 0, rt: 0, fl: [], sp: [], an: [], acc: 0, head0: null, last: null, nextFl: 0, trendS: '—', trendD: '—', a: { mot: new AArrow(), net: new AArrow() } };
  function previewSelect(i) {
    K.sel = i; KP.ph = 'wait'; KP.t = 0; KP.rt = 0; KP.fl = []; KP.sp = []; KP.an = []; KP.head0 = null; KP.acc = 0; KP.nextFl = 0; KP.trendS = '—'; KP.trendD = '—';
    KP.a.mot.jump(0, 0); KP.a.net.jump(0, 0);
  }
  function parkReset() {
    K.cards.forEach((c) => { c.placed = -1; c.slot = -1; c.x = c.home.x; c.y = c.home.y; c.w = c.tw = c.home.w; c.h = c.th = c.home.h; c.lift = 0; c.shake = 0; });
    K.drag = null; K.msg = null; K.placedN = 0; K.poster = false; K.doneAll = false; K.pop = [0, 0, 0];
    previewSelect(0);
    syncPark();
  }
  const bucketCount = (b) => K.cards.filter((c) => c.placed === b).length;
  function chipPos(b, slot) {
    const bk = PL_.bk[b], ch = PL_.chip;
    const col = slot % ch.cols, row = Math.floor(slot / ch.cols);
    return { x: bk.x + 12 + col * (ch.w + 6), y: bk.y + 46 + row * (ch.h + 6), w: ch.w, h: ch.h };
  }
  function wrongHint(c, b) {
    const att = BUCKETS[b].cls, real = c.r.cls;
    if (att === 'speed') return real === 'dir' ? '경로가 휘어져요. 운동 방향도 바뀌는지 보세요. 힘이 운동 방향과 수직이면?' : '경로가 직선이 아니에요. 방향도 바뀌는지 살펴보세요.';
    if (att === 'dir') return real === 'speed' ? '경로가 곧은 직선이에요. 방향은 그대로예요. 섬광 점 사이 간격을 보세요.' : '섬광 점 사이 간격이 달라지나요? 속력도 변해요.';
    return real === 'speed' ? '경로가 직선이에요. 힘의 방향과 운동 방향이 이루는 각을 보세요.' : '점 사이 간격이 일정한지 보세요. 속력이 그대로예요.';
  }
  function cardAt(p) {
    for (let i = K.cards.length - 1; i >= 0; i--) { const c = K.cards[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; }
    return null;
  }
  function parkDown(p) {
    if (K.poster) return false;
    const c = cardAt(p);
    if (!c) return false;
    K.tapped = true;
    if (c.placed >= 0) { if (K.sel !== c.i) { previewSelect(c.i); Sound.tick(); } return false; }
    K.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
    K.cards.splice(K.cards.indexOf(c), 1); K.cards.push(c);                 // 맨 위로
    Sound.tick(); hideHint();
    return true;
  }
  function parkMove(p) {
    const d = K.drag; if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 7) d.moved = true;
    if (d.moved) { d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; }
    K.hover = d.moved ? bucketAt(d.c.x + d.c.w / 2, d.c.y + d.c.h / 2) : -1;
  }
  const bucketAt = (x, y) => PL_.bk.findIndex((b) => x >= b.x && x <= b.x + b.w && y >= b.y - 10 && y <= b.y + b.h + 10);
  function parkUp(p) {
    const d = K.drag; if (!d) return;
    K.drag = null; K.hover = -1;
    const c = d.c;
    if (!d.moved) { if (K.sel !== c.i) previewSelect(c.i); return; }
    const b = bucketAt(c.x + c.w / 2, c.y + c.h / 2);
    if (b < 0) return;
    if (BUCKETS[b].cls === c.r.cls) {
      c.placed = b; c.slot = bucketCount(b) - 1;
      const t = chipPos(b, c.slot); c.tw = t.w; c.th = t.h;
      c.tx = t.x; c.ty = t.y; c.pop = 0.0001;
      K.placedN++; K.pop[b] = 1;
      Sound.tick();
      celebrate(t.x + t.w / 2, t.y + t.h / 2, 26);
      K.msg = { text: '✔ ' + c.r.name + ': ' + c.r.why, color: BUCKETS[b].color, t: 0 };
      previewSelect(c.i);
      if (K.placedN >= RIDES.length) { K.doneAll = true; K.posterAt = NOW() + 1.6; }
    } else {
      c.shake = 0.6; Sound.fail();
      K.msg = { text: '🤔 ' + wrongHint(c, b), color: COL.warn, t: 0 };
    }
  }
  function stepPark(dt) {
    const md = MODELS[RIDES[K.sel].id];
    modelRange(md);
    KP.t += dt;
    if (KP.ph === 'wait') {
      if (KP.t >= 0.7) { KP.ph = 'play'; KP.t = 0; KP.rt = 0; KP.fl = []; KP.sp = []; KP.an = []; KP.head0 = null; KP.acc = 0; KP.nextFl = 0; }
      KP.a.mot.set(0, 0); KP.a.net.set(0, 0);
    } else if (KP.ph === 'play') {
      KP.rt = Math.min(md.T, KP.t);
      const k = kinOf(md, KP.rt), sp = Math.hypot(k.vx, k.vy);
      if (KP.head0 == null && sp > md._vmax * 0.04) KP.head0 = Math.atan2(k.vy, k.vx);
      let ang = 0;
      if (KP.head0 != null) { ang = Math.atan2(k.vy, k.vx) - KP.head0; while (ang > Math.PI) ang -= TAU; while (ang < -Math.PI) ang += TAU; ang = Math.abs(ang); }
      KP.acc += dt;
      while (KP.acc >= 1 / 30) { KP.acc -= 1 / 30; KP.sp.push(sp / md._vmax); KP.an.push(ang / Math.PI); }
      if (KP.rt >= KP.nextFl) { KP.fl.push({ x: k.x, y: k.y }); KP.nextFl += md.T / 11; }
      // 추세 (0.4초 전과 비교)
      const kb = kinOf(md, Math.max(0, KP.rt - 0.4)), spb = Math.hypot(kb.vx, kb.vy);
      const dsp = (sp - spb) / md._vmax;
      KP.trendS = KP.rt < 0.3 ? '—' : Math.abs(dsp) < 0.035 ? '일정' : dsp > 0 ? '커지는 중' : '작아지는 중';
      let angB = 0; if (KP.head0 != null) { angB = Math.atan2(kb.vy, kb.vx) - KP.head0; while (angB > Math.PI) angB -= TAU; while (angB < -Math.PI) angB += TAU; angB = Math.abs(angB); }
      KP.trendD = KP.rt < 0.3 ? '—' : Math.abs(ang - angB) < 0.045 ? '일정' : '바뀌는 중';
      KP.a.mot.set(k.vx / md._vmax * 66 * (PHONE ? 0.8 : 1), k.vy / md._vmax * 66 * (PHONE ? 0.8 : 1));
      const am = Math.hypot(k.ax, k.ay);
      if (am > md._amax * 0.06) KP.a.net.set(k.ax / md._amax * 58 * (PHONE ? 0.8 : 1), k.ay / md._amax * 58 * (PHONE ? 0.8 : 1)); else KP.a.net.set(0, 0);
      if (KP.t >= md.T) { KP.ph = 'hold'; KP.t = 0; }
    } else {
      KP.a.mot.set(0, 0); KP.a.net.set(0, 0);
      if (KP.t > 1.7) { KP.ph = 'wait'; KP.t = 0; KP.fl = []; KP.sp = []; KP.an = []; KP.trendS = '—'; KP.trendD = '—'; }
    }
    KP.a.mot.update(dt); KP.a.net.update(dt);
    // 카드 움직임
    K.cards.forEach((c) => {
      const d = K.drag && K.drag.c === c && K.drag.moved;
      c.lift = approach(c.lift, d ? 1 : 0, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (d) { c.w = approach(c.w, c.tw, dt, 16); c.h = approach(c.h, c.th, dt, 16); return; }
      if (K.drag && K.drag.c === c) return;
      const tx = c.placed >= 0 ? c.tx : c.home.x, ty = c.placed >= 0 ? c.ty : c.home.y;
      c.x = approach(c.x, tx, dt, c.placed >= 0 ? 12 : 9); c.y = approach(c.y, ty, dt, c.placed >= 0 ? 12 : 9);
      c.w = approach(c.w, c.tw, dt, 12); c.h = approach(c.h, c.th, dt, 12);
    });
    for (let b = 0; b < 3; b++) K.pop[b] = Math.max(0, K.pop[b] - dt * 2.4);
    if (K.msg) { K.msg.t += dt; if (K.msg.t > 4.2) K.msg = null; }
    if (K.doneAll && !K.poster && NOW() >= K.posterAt) { K.poster = true; Sound.level(); FX.burst(W / 2, 120, { count: 26, life: 1.1, speed: 260, gravity: 200, size: 5 }); syncPark(); }
  }

  /* ---------- 그리기 ---------- */
  function chart(x, y, w, h, title, data, N, color) {
    ctx.save();
    rr(x, y, w, h, 10); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
    txt(title, x + 9, y + 13, { size: 12, align: 'left', color: '#475569', halo: false });
    const px = x + 10, py = y + 24, pw = w - 20, ph = h - 32;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    if (data.length > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      data.forEach((v, i) => { const X = px + (i / N) * pw, Y = py + ph - clamp(v, 0, 1) * (ph - 4) - 2; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.stroke();
      const lv = data[data.length - 1], lx = px + ((data.length - 1) / N) * pw, ly = py + ph - clamp(lv, 0, 1) * (ph - 4) - 2;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 4.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
  function drawPreview(t) {
    const L = PL_, pv = L.pv, md = MODELS[RIDES[K.sel].id], ride = RIDES[K.sel];
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.16)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(pv.x, pv.y, pv.w, pv.h, 18); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    if (!K.msg) {
      const t1 = '🔎 조사 창: ' + ride.name;
      txt(t1, pv.x + 16, pv.y + 15, { align: 'left', size: PHONE ? 13 : 14.5, color: '#334155', halo: false });
      if (measure(t1, PHONE ? 13 : 14.5) + measure(ride.cap, 12.5, 600) + 40 < L.stage.w) txt(ride.cap, pv.x + L.stage.w + 6, pv.y + 15, { align: 'right', size: 12.5, color: '#64748b', halo: false });
    }
    const st = L.stage, sc = Math.min(st.w / LW, st.h / LH), ox = st.x + (st.w - LW * sc) / 2, oy = st.y + (st.h - LH * sc) / 2;
    const rt = KP.ph === 'wait' ? 0 : KP.rt;
    ctx.save();
    rr(st.x, st.y, st.w, st.h, 12); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(sc, sc);
    md.bg(ctx, rt);
    // 다중 섬광
    if (strobeOn) {
      ctx.save();
      for (let i = 1; i < KP.fl.length; i++) { ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 2 / sc; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(KP.fl[i - 1].x, KP.fl[i - 1].y); ctx.lineTo(KP.fl[i].x, KP.fl[i].y); ctx.stroke(); }
      ctx.setLineDash([]);
      KP.fl.forEach((f) => {
        ctx.fillStyle = 'rgba(51,65,85,.36)'; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 2.2, 0, TAU); ctx.fill();
      });
      ctx.restore();
    }
    const p = md.pos(KP.ph === 'wait' ? 0 : KP.rt);
    md.tok(ctx, p, rt);
    ctx.restore();
    // 화살표 (화면 좌표)
    const sx = ox + p.x * sc, sy = oy + p.y * sc, A = KP.a;
    if (A.net.shown && A.net.len > 2) forceArrow(sx, sy, A.net.dx * A.net.k, A.net.dy * A.net.k, COL.net, { width: 8, head: 17, glow: true });
    if (A.mot.shown && A.mot.len > 2) hollowArrow(sx, sy, A.mot.dx * A.mot.k, A.mot.dy * A.mot.k, { width: 11, head: 17 });
    // 범례
    const lg = { x: st.x + 8, y: st.y + st.h - 14 };
    ctx.save(); ctx.globalAlpha = 0.92;
    pill('⇨ 운동 방향(속력)', lg.x, lg.y, { color: COL.motion, size: 11.5, align: 'left' });
    pill('→ 알짜힘', lg.x + 118 * FS, lg.y, { color: COL.net, size: 11.5, align: 'left' });
    ctx.restore();
    // 그래프
    const g = L.graph, gh = (g.h - 8) / 2, N = Math.max(2, Math.round(md.T * 30));
    chart(g.x, g.y, g.w, gh, '속력', KP.sp, N, '#475569');
    chart(g.x, g.y + gh + 8, g.w, gh, '처음 방향에서 돌아간 각도', KP.an, N, '#7c3aed');
    if (KP.ph === 'wait' || !K.tapped) { /* 안내는 힌트로 */ }
  }
  function drawCard(c, selected) {
    ctx.save();
    const lift = c.lift, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let ox = 0;
    if (c.shake > 0) ox = Math.sin(c.shake * 46) * 7 * (c.shake / 0.6);
    ctx.translate(cx + ox, cy - lift * 5); ctx.scale(1 + lift * 0.07, 1 + lift * 0.07); ctx.translate(-c.w / 2, -c.h / 2);
    const placed = c.placed >= 0, col = placed ? BUCKETS[c.placed].color : '#94a3b8';
    ctx.shadowColor = 'rgba(15,23,42,' + (0.14 + lift * 0.14).toFixed(2) + ')'; ctx.shadowBlur = 6 + lift * 14; ctx.shadowOffsetY = 2 + lift * 7;
    rr(0, 0, c.w, c.h, 12); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = selected ? 3.2 : 2; ctx.strokeStyle = selected ? '#7c3aed' : col; rr(0, 0, c.w, c.h, 12); ctx.stroke();
    const small = c.h < 44;
    ctx.font = (small ? 20 : 24) * FS + 'px ' + EMOJI; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.r.icon, 8, c.h / 2 + 1);
    const tx = (small ? 32 : 40) * FS;
    ctx.font = font(PHONE ? 12 : (small ? 13.5 : 14.5), 800); ctx.fillStyle = '#1b2333';
    const maxW = c.w - tx - 6;
    const lines = [c.r.name];
    if (ctx.measureText(c.r.name).width > maxW && c.r.name.indexOf(' ') > 0) { const i = c.r.name.indexOf(' '); lines.length = 0; lines.push(c.r.name.slice(0, i), c.r.name.slice(i + 1)); }
    if (lines.length === 1) ctx.fillText(lines[0], tx, c.h / 2 + 1);
    else { ctx.font = font(PHONE ? 11 : 12.5, 800); ctx.fillText(lines[0], tx, c.h / 2 - 8 * FS); ctx.fillText(lines[1], tx, c.h / 2 + 9 * FS); }
    if (placed) { ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(c.w - 6, 6, 8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.w - 10, 6); ctx.lineTo(c.w - 7, 9); ctx.lineTo(c.w - 2.5, 3); ctx.stroke(); }
    ctx.restore();
  }
  function drawBuckets() {
    BUCKETS.forEach((b, i) => {
      const r = PL_.bk[i], hov = K.hover === i, pop = EASE.outQuad(K.pop[i]);
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2); const s = 1 + pop * 0.03 + (hov ? 0.02 : 0); ctx.scale(s, s); ctx.translate(-r.w / 2, -r.h / 2);
      rr(0, 0, r.w, r.h, 16); ctx.fillStyle = hov ? shade(b.soft, -0.04) : b.soft; ctx.fill();
      ctx.setLineDash(hov ? [] : [8, 6]); ctx.lineWidth = hov ? 4 : 2.5; ctx.strokeStyle = b.color; rr(0, 0, r.w, r.h, 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = b.color; rr(0, 0, r.w, 34, 16); ctx.fill(); ctx.fillRect(0, 18, r.w, 16);
      ctx.fillStyle = '#fff'; ctx.font = font(PHONE ? 12.5 : 15, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.title, r.w / 2, 18);
      ctx.restore();
      // 빈 칸 표시
      const n = bucketCount(i);
      const slots = i === 1 ? 2 : 3;
      for (let s2 = n; s2 < slots; s2++) {
        const p = chipPos(i, s2);
        ctx.save(); ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(b.color, 0.35); rr(p.x, p.y, p.w, p.h, 10); ctx.stroke(); ctx.restore();
      }
    });
  }
  function wrapLines(str, maxW, size) {
    const out = []; let cur = '';
    for (const ch of str) {
      if (measure(cur + ch, size, 700) > maxW && cur) { out.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function drawPoster() {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#fff7e6'); g.addColorStop(0.5, '#fdf2f8'); g.addColorStop(1, '#eef2ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; rr(10, 10, W - 20, H - 20, 24); ctx.stroke();
    ctx.setLineDash([2, 10]); ctx.lineCap = 'round'; ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 4; rr(20, 20, W - 40, H - 40, 18); ctx.stroke(); ctx.setLineDash([]);
    txt('🎡 나의 놀이 기구 분류 포스터', W / 2, 56, { size: PHONE ? 20 : 27, color: '#9a3412', halo: '#fff' });
    txt('알짜힘이 0이 아니면 운동 상태가 변해요 — 속력, 운동 방향, 또는 둘 다!', W / 2, 90, { size: PHONE ? 12.5 : 14.5, color: '#475569', halo: '#fff' });
    const cw = (W - 60 - 20) / 3;
    BUCKETS.forEach((b, i) => {
      const x = 30 + i * (cw + 10), y = 112;
      rr(x, y, cw, 36, 14); ctx.fillStyle = b.color; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = font(PHONE ? 12.5 : 15.5, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.title, x + cw / 2, y + 19);
      const list = K.cards.filter((c) => c.placed === i).sort((a, b2) => a.i - b2.i);
      list.forEach((c, k) => {
        const cy = y + 46 + k * (PHONE ? 112 : 108), ch = PHONE ? 104 : 100;
        ctx.save(); ctx.shadowColor = 'rgba(15,23,42,.14)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        rr(x, cy, cw, ch, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
        ctx.lineWidth = 2.2; ctx.strokeStyle = b.color; rr(x, cy, cw, ch, 14); ctx.stroke();
        ctx.font = 28 * FS + 'px ' + EMOJI; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.r.icon, x + 10, cy + 26);
        txt(c.r.name, x + 12 + 34 * FS, cy + 26, { align: 'left', size: PHONE ? 13 : 15, halo: false });
        const lines = wrapLines(c.r.why, cw - 24, PHONE ? 12 : 13.5);
        lines.slice(0, 3).forEach((ln, j) => txt(ln, x + 12, cy + 54 + j * (PHONE ? 17 : 18), { align: 'left', size: PHONE ? 11.5 : 13, color: '#475569', weight: 700, halo: false }));
      });
    });
  }
  function drawPark(dt, t) {
    ctx.fillStyle = '#eef5ff'; ctx.fillRect(0, 0, W, H);
    if (K.poster) { drawPoster(); return; }
    // 하늘 배경과 파스텔 구름
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eaf4ff'); g.addColorStop(1, '#f6f1ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawPreview(t);
    drawBuckets();
    // 트레이 빈 자리
    K.cards.forEach((c) => {
      if (c.placed >= 0) { const h = c.home; ctx.save(); ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(100,116,139,.35)'; rr(h.x, h.y, h.w, h.h, 12); ctx.stroke(); ctx.restore(); }
    });
    // 카드 (끌고 있는 카드가 맨 위)
    K.cards.forEach((c) => { if (!(K.drag && K.drag.c === c)) drawCard(c, K.sel === c.i); });
    if (K.drag) drawCard(K.drag.c, true);
    // 처음 안내: 첫 카드 고리
    if (!K.tapped && K.placedN === 0) {
      const h = PL_.cards[0], k = (t * 1.2) % 1;
      ctx.save(); ctx.strokeStyle = rgba('#7c3aed', 0.9); ctx.lineWidth = 3; rr(h.x - 3, h.y - 3, h.w + 6, h.h + 6, 14); ctx.stroke();
      ctx.strokeStyle = rgba('#7c3aed', 0.55 * (1 - k)); ctx.lineWidth = 3; const e = k * 9; rr(h.x - 3 - e, h.y - 3 - e, h.w + 6 + 2 * e, h.h + 6 + 2 * e, 14 + e); ctx.stroke();
      ctx.restore();
    }
    if (K.msg) {
      const pv = PL_.pv, a = Math.min(1, K.msg.t / 0.18) * Math.min(1, (4.2 - K.msg.t) / 0.4);
      const lines = wrapLines(K.msg.text, pv.w - 56, PHONE ? 12.5 : 14);
      const bh = lines.length * (PHONE ? 19 : 21) + 12;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.translate(0, (1 - EASE.outCubic(Math.min(1, K.msg.t / 0.22))) * -8);
      ctx.shadowColor = 'rgba(15,23,42,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      rr(pv.x + 8, pv.y + 5, pv.w - 16, bh, 13); ctx.fillStyle = K.msg.color; ctx.fill(); ctx.shadowColor = 'transparent';
      lines.forEach((ln, i) => { ctx.fillStyle = '#fff'; ctx.font = font(PHONE ? 12.5 : 14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ln, pv.x + pv.w / 2, pv.y + 5 + 6 + (PHONE ? 9.5 : 10.5) + i * (PHONE ? 19 : 21)); });
      ctx.restore();
    }
  }
  function savePoster() {
    if (!K.poster) return;
    Sound.click();
    try {
      view.canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'my-force-motion-poster.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('📸 포스터를 저장했어요!');
      }, 'image/png');
    } catch (e) { toast('포스터를 저장할 수 없어요. 화면을 캡처해 보세요.'); }
  }

  /* =========================================================
     장면 전환 · 조작판 · 측정값
     ========================================================= */
  let scene = 'hands';
  const trans = { t: 1 };
  const PUCK = { hands: 1, two: 1, zone: 1, glide: 1 };
  const SCENE_LABEL = {
    hands: '🏒 얼음판 위의 퍽 <small>(위에서 본 모습)</small>',
    two: '🏒 움직이는 퍽 <small>(위에서 본 모습)</small>',
    zone: '💨 힘 구역을 지나는 퍽 <small>(위에서 본 모습)</small>',
    glide: '📸 힘이 없을 때의 퍽 <small>(위에서 본 모습)</small>',
    toss: '⚾ 위로 던진 공 <small>(옆에서 본 모습)</small>',
    roll: '🎳 굴러가다 멈추는 공 <small>(옆에서 본 모습)</small>',
    park: '🎡 놀이공원 조사·분류',
  };
  const MODE_LABEL = { 1: '① → 같은 방향', 2: '② ← 반대 방향', 3: '③ 🪢 줄과 기둥', 4: '④ ↗ 비스듬히' };
  function setScene(s, force) {
    const changed = s !== scene;
    scene = s;
    if (changed || force) {
      trans.t = RM ? 1 : 0;
      badges.length = 0; FX.clear();
      hideHint();
      if (s === 'hands' || s === 'two') { PL.kind = s; pullReset(false); }
      else if (s === 'zone') { if (Z.st === 'launch' || Z.st === 'run') Z.st = 'end'; zoneReset(false); }
      else if (s === 'glide') { G.st = 'ready'; clearFlashes(); if (!strobeOn) { strobeOn = true; $('#tgStrobe').setAttribute('aria-pressed', 'true'); } }
      else if (s === 'toss') tossStart();
      else if (s === 'roll') rollStart();
      else if (s === 'park') previewSelect(K.sel);
    }
    syncScene();
  }
  let lastFree = null;
  function syncScene() {
    $('#sceneLabel').innerHTML = SCENE_LABEL[scene];
    const free = !!(game && game.free);
    lastFree = free;
    const show = (sel, b) => $(sel).classList.toggle('off', !b);
    const pull = scene === 'hands' || scene === 'two', side = scene === 'toss' || scene === 'roll';
    show('#grpPull', pull); show('#grpZone', scene === 'zone'); show('#grpSide', side); show('#grpPark', scene === 'park');
    show('#grpFree', free); show('#resultCard', scene === 'zone');
    show('#tgStrobe', !!PUCK[scene] || scene === 'park');
    const any = pull || side || scene === 'zone' || scene === 'park' || free;
    $('#ctrlCard').hidden = !any;
    if (pull) {
      $('#pullTitle').textContent = scene === 'hands' ? '👐 양쪽에서 당기기' : '↔️ 움직이는 퍽에 두 힘 걸기';
      $('#pullNote').innerHTML = scene === 'hands'
        ? '화면 속 <b>손</b>을 바깥쪽으로 끌어 당기는 힘을 정해요 (0~6 N). <b>▶ 놓기</b>를 누르면 퍽을 붙잡은 핀이 빠져요.'
        : '<b>앞쪽 손</b>과 <b>뒤쪽 손</b>을 끌어 두 힘을 정해요. 퍽은 처음에 오른쪽으로 <b>1.0 m/s</b>로 달려요.';
    }
    if (side) {
      $('#sideTitle').textContent = scene === 'toss' ? '⚾ 위로 던진 공' : '🎳 굴러가다 멈추는 공';
      $('#sideNote').textContent = scene === 'toss' ? '공기 저항은 생각하지 않아요. 천천히(×0.4) 보여 줘요.' : '수평 방향의 힘만 생각해요.';
    }
    $$('#freeGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.free === scene));
    syncGo();
  }
  function syncGo() {
    const gp = $('#goPull'), gz = $('#goZone');
    if (gp) { gp.disabled = PL.st !== 'ready'; gp.textContent = PL.kind === 'hands' ? '▶ 놓기' : '▶ 실행'; }
    const run = Z.st === 'launch' || Z.st === 'run';
    if (gz) gz.disabled = run;
    $$('#modeGrid .mode-btn').forEach((b) => {
      const m = +b.dataset.mode;
      b.disabled = run; b.classList.toggle('on', m === Z.mode);
      const html = MODE_LABEL[m] + (Z.done[m] ? ' <span class="ok">✔</span>' : '');
      if (b._h !== html) { b._h = html; b.innerHTML = html; }
    });
    const pb = $('#posterBtn'); if (pb) pb.classList.toggle('off', !K.poster);
    const pr = $('#parkResetBtn'); if (pr) pr.textContent = K.poster ? '🃏 다시 분류하기' : '🃏 처음부터 분류';
  }
  function syncPark() { syncGo(); }

  /* 측정값 (0.1초마다 갱신) */
  let lastUI = 0;
  const roCache = {};
  function ro(i, label, value) {
    const k = i + '|' + label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#rL' + i).textContent = label; $('#rV' + i).innerHTML = value;
  }
  const dirName = (v) => (v > 0.05 ? '→ 오른쪽' : v < -0.05 ? '← 왼쪽' : '—');
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (PUCK[scene]) {
      const d = turnedDeg();
      let net = 0;
      if (scene === 'hands' || scene === 'two') net = Math.abs(plNet());
      else if (scene === 'zone') { const n = zoneNet(); net = Math.hypot(n.x, n.y); }
      ro(1, '속력', spdMS().toFixed(1) + '<small>m/s</small>');
      ro(2, PHONE ? '돌아간 각도' : '처음 방향에서 돌아간 각도', d == null ? '—' : Math.round(Math.abs(d) * 180 / Math.PI) + '<small>°</small>');
      ro(3, '알짜힘', (Math.round(net * 10) / 10) + '<small>N</small>');
    } else if (scene === 'toss') {
      ro(1, '속력', Math.abs(TO.v).toFixed(1) + '<small>m/s</small>');
      ro(2, '운동 방향', TO.st !== 'fly' ? (TO.st === 'throw' ? '↑ 위쪽' : '—') : Math.abs(TO.v) < 0.25 ? '꼭대기' : TO.v > 0 ? '↑ 위쪽' : '↓ 아래쪽');
      ro(3, '알짜힘', TO.st === 'fly' ? TO_WT + '<small>N ↓</small>' : '—');
    } else if (scene === 'roll') {
      ro(1, '속력', RO.v.toFixed(1) + '<small>m/s</small>');
      ro(2, '운동 방향', RO.v > 0.02 ? '→ 오른쪽' : '멈춤');
      ro(3, '알짜힘', RO.st === 'run' ? '1<small>N ←</small>' : '0<small>N</small>');
    } else if (scene === 'park') {
      ro(1, '조사 중인 놀이 기구', '<span style="font-size:15px">' + RIDES[K.sel].name + '</span>');
      ro(2, '속력', '<span style="font-size:16px">' + KP.trendS + '</span>');
      ro(3, '운동 방향', '<span style="font-size:16px">' + KP.trendD + '</span>');
    }
  }
  $('#rV3').style.color = '#6d28d9';

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    hover(p) {
      if (scene === 'hands' || scene === 'two') return pullHit(p) >= 0 ? 'ew-resize' : null;
      if (scene === 'park') return !K.poster && cardAt(p) ? 'grab' : null;
      return null;
    },
    down(p) {
      if (scene === 'hands' || scene === 'two') { const i = pullHit(p); if (i < 0) return false; PL.drag = i; hideHint(); return true; }
      if (scene === 'park') return parkDown(p);
      return false;
    },
    move(p) {
      if ((scene === 'hands' || scene === 'two') && PL.drag != null) pullDrag(p);
      else if (scene === 'park') parkMove(p);
    },
    up(p) {
      if (scene === 'hands' || scene === 'two') PL.drag = null;
      else if (scene === 'park') parkUp(p);
    },
  });
  // 휴대폰: 끌 수 있는 것을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      if (!tc) return;
      const p = view.toLocal(tc);
      const hit = (scene === 'hands' || scene === 'two') ? pullHit(p) >= 0 : scene === 'park' ? (!K.poster && !!cardAt(p)) : false;
      if (hit) e.preventDefault();
    }, { passive: false });
  }

  $('#goPull').addEventListener('click', pullGo);
  $('#goZone').addEventListener('click', zoneGo);
  $$('#modeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); zoneSetMode(+b.dataset.mode); syncGo(); }));
  $('#replayBtn').addEventListener('click', () => { Sound.click(); if (scene === 'toss') tossStart(); else rollStart(); });
  $('#parkResetBtn').addEventListener('click', () => { Sound.click(); parkReset(); });
  $('#posterBtn').addEventListener('click', savePoster);
  $('#tgStrobe').addEventListener('click', () => {
    Sound.click(); strobeOn = !strobeOn;
    $('#tgStrobe').setAttribute('aria-pressed', strobeOn ? 'true' : 'false');
  });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'hands' || scene === 'two') { pullReset(false); }
    else if (scene === 'zone') { if (Z.st === 'launch' || Z.st === 'run') Z.st = 'end'; zoneReset(false); }
    else if (scene === 'glide') { G.st = 'ready'; }
    else if (scene === 'toss') tossStart();
    else if (scene === 'roll') rollStart();
    else parkReset();
  });
  $$('#freeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.free, true); }));

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const svgArrow = (x1, y, x2, color, w) => {
    const dir = x2 > x1 ? 1 : -1, hx = x2 - dir * 14;
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + hx + '" y2="' + y + '" stroke="' + color + '" stroke-width="' + (w || 6) + '" stroke-linecap="round"/>' +
      '<path d="M' + x2 + ' ' + y + ' L' + hx + ' ' + (y - 9) + ' L' + hx + ' ' + (y + 9) + ' Z" fill="' + color + '"/>';
  };
  const dots = (x, y, gap, n, c) => { let s = ''; for (let i = 0; i < n; i++) s += '<circle cx="' + (x + gap * i) + '" cy="' + y + '" r="5.5" fill="' + (c || '#334155') + '" fill-opacity=".85"/>'; return s; };
  /* 공책: 알짜힘의 방향 네 가지 한눈에 보기 (다중 섬광 그림) */
  const dotsAt = (pts, c) => pts.map((q) => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4.6" fill="' + (c || '#334155') + '" fill-opacity=".88"/>').join('');
  const cellSvg = (x, y, title, color, pic, cap) => '<g transform="translate(' + x + ' ' + y + ')"><rect width="152" height="98" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/>' +
    '<text x="76" y="18" text-anchor="middle" font-size="12.5" font-weight="800" fill="' + color + '">' + title + '</text>' + pic +
    '<text x="76" y="90" text-anchor="middle" font-size="12" font-weight="800" fill="' + color + '">' + cap + '</text></g>';
  const arcPts = []; for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; arcPts.push([(76 + 30 * Math.cos(a)).toFixed(1), (66 + 24 * Math.sin(a)).toFixed(1)]); }
  const SVG_FOUR = '<svg viewBox="0 0 320 206" width="320" role="img" aria-label="알짜힘의 방향에 따른 운동 상태 변화 네 가지" style="max-width:100%" ' + SVGF + '>' +
    cellSvg(4, 2, '① 같은 방향', '#c2410c', svgArrow(40, 34, 104, '#7c3aed', 5) + dotsAt([[14, 62], [28, 62], [42, 62], [60, 62], [82, 62], [108, 62], [138, 62]], '#ea580c'), '빨라져요 (방향 그대로)') +
    cellSvg(164, 2, '② 반대 방향', '#1d4ed8', svgArrow(112, 34, 48, '#7c3aed', 5) + dotsAt([[10, 62], [40, 62], [66, 62], [88, 62], [106, 62], [120, 62], [130, 62], [137, 62], [142, 62]], '#2563eb'), '느려져요 (방향 그대로)') +
    cellSvg(4, 104, '③ 늘 수직', '#6d28d9', '<path d="M46 66 A30 24 0 0 1 106 66" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3 3"/>' + '<line x1="76" y1="48" x2="76" y2="58" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"/><path d="M76 66 L70 56 L82 56 Z" fill="#7c3aed"/>' + dotsAt(arcPts), '방향만 변해요') +
    cellSvg(164, 104, '④ 비스듬히', '#6d28d9', '<path d="M12 68 Q70 66 142 30" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3 3"/>' + dotsAt([[14, 68], [28, 67.5], [44, 66], [62, 62], [82, 55], [104, 46], [128, 35]], '#7c3aed'), '속력과 방향이 모두 변해요') +
    '</svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  const chip = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  function zoneFullReset() { Z.done = {}; Z.res = {}; Z.mode = 1; Z.y = ZY[1]; Z.bandW = ZW[1]; Z.st = 'ready'; zoneReset(true); zoneSetMode(1); syncGo(); }

  game = SciSim.game({
    simId: 'm1-net-force-motion',
    mount: '#game',
    badge: '알짜힘 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      hands: '👐 양쪽 손으로 당기기',
      strobe: '📸 다중 섬광',
      zone: '💨 힘 구역',
      modes: '🔀 힘의 방향 고르기',
      results: '📋 결과 표',
      twoOnMoving: '↔️ 움직이는 퍽에 두 힘 걸기',
      toss: '⚾ 던진 공 · 🎳 굴러가는 공',
      park: '🎡 놀이공원 조사',
    },
    onFeatures(set) { feat = set; if (game) syncScene(); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, !!m.fresh); },
    levels: [
      /* ---------------- STEP 1 · 관찰 ---------------- */
      {
        title: '운동 상태란?', short: '운동 상태', icon: '👀', phase: '관찰',
        features: ['hands', 'strobe'],
        intro: '<p class="si-q">❓ 탐구 질문: 얼음판 위의 퍽을 어느 방향으로 밀면 빨라지고, 느려지고, 휘어질까?</p>' +
          '<p>움직이는 물체의 <b>운동 상태</b>는 <b>속력</b>과 <b>운동 방향</b>으로 나타내요. 알짜힘이 작용하면 운동 상태가 어떻게 변하는지 알아봐요.</p>' +
          '<p>매끄러운 얼음판 위의 퍽에는 마찰이 거의 없어요. 퍽이 남기는 <b>다중 섬광</b> 점은 <b>0.2초마다</b> 찍은 퍽의 위치예요. <b>점 사이 간격 = 속력</b>, <b>점을 이은 선 = 운동 방향</b>이에요.</p>',
        setup() { setScene('hands', true); },
        recap: '운동 상태는 <b>속력</b>과 <b>운동 방향</b>으로 나타내요. 알짜힘이 <b>0이면</b> 운동 상태가 변하지 않고, <b>0이 아니면</b> 변해요.',
        summary: '<ul><li><b>운동 상태</b> = <b>속력</b> + <b>운동 방향</b> (멈춰 있는 것도 운동 상태예요).</li>' +
          '<li>알짜힘이 <b>0</b>이면 운동 상태가 <b>변하지 않아요</b>. 멈춰 있던 퍽은 계속 멈춰 있고, 움직이던 퍽은 속력과 방향이 그대로예요.</li>' +
          '<li>알짜힘이 <b>0이 아니면</b> 운동 상태가 <b>변해요</b>.</li>' +
          '<li>다중 섬광 사진: 점 사이 <b>간격</b> = 속력, 점을 이은 <b>선</b> = 운동 방향.</li></ul>',
        missions: [
          {
            scene: 'hands', fresh: true, pulse: true,
            title: '알짜힘이 0일 때와 아닐 때',
            goal: '퍽 양쪽의 <b>손</b>을 끌어 두 힘을 정하고 <b>▶ 놓기</b>를 눌러요. <b>① 두 힘의 크기를 같게</b>, <b>② 서로 다르게</b> 해서 각각 놓아 보세요.',
            hint: '손을 바깥쪽으로 끌면 힘이 커져요. 먼저 두 손의 힘을 똑같이 맞추고 놓은 다음, 한쪽만 바꿔서 다시 놓아 보세요.',
            setup() { PL.doneEq = false; PL.doneNe = false; showHint('👐 손을 바깥쪽으로 끌어 힘을 정하고 ▶ 놓기를 눌러요', 8000); },
            check: () => PL.doneEq && PL.doneNe,
            status: () => chip(PL.doneEq, '같은 크기로 놓기') + ' · ' + chip(PL.doneNe, '다른 크기로 놓기'),
            hold: 0.3,
            explain: '두 힘의 크기가 같고 방향이 반대이면 <b>알짜힘(합력)이 0</b>이라서, 멈춰 있던 퍽은 <b>그대로 정지</b>해 있어요. 힘이 2개 작용해도 알짜힘이 0이면 운동 상태는 변하지 않아요.' +
              '<br>크기가 다르면 알짜힘이 0이 아니에요. 퍽은 <b>알짜힘의 방향</b>으로 움직이기 시작해요. 정지해 있던 퍽의 <b>운동 상태가 변한</b> 거예요.',
          },
          {
            scene: 'glide', fresh: true,
            type: 'quiz',
            title: '다중 섬광 사진 읽기',
            goal: '얼음판 위의 퍽에 <b>힘이 작용하지 않을 때</b>(알짜힘 0 N) 0.2초마다 찍은 사진이에요. 이 사진에서 알 수 있는 것은?',
            choices: ['속력과 운동 방향이 일정하다', '점점 느려진다', '점점 빨라진다', '운동 방향이 바뀐다'],
            answer: 0,
            feedback: ['', '점 사이 간격이 점점 줄어들었나요? 간격이 같다면 속력은 그대로예요. 힘이 없으면 움직이는 퍽이 저절로 느려지지 않아요.', '점 사이 간격이 점점 넓어지면 빨라지는 거예요. 이 사진의 간격은 어떤가요?', '점들이 한 직선 위에 있나요? 직선이면 운동 방향은 그대로예요.'],
            explain: '점 사이 <b>간격이 일정</b>하니 속력이 그대로이고, 점들이 <b>일직선</b> 위에 있으니 운동 방향도 그대로예요. 알짜힘이 0이면 운동 상태가 변하지 않아요. 움직이는 물체가 저절로 멈추는 것이 아니라, 속력을 바꾸는 힘이 작용해야 해요.',
          },
          {
            scene: 'glide',
            type: 'quiz',
            title: '운동 상태를 나타내는 두 가지',
            goal: '물체의 <b>운동 상태</b>를 나타내는 두 가지는 무엇일까요?',
            choices: ['속력과 운동 방향', '질량과 무게', '위치와 크기', '모양과 색'],
            answer: 0,
            feedback: ['', '질량과 무게는 물체가 가진 양과 힘이에요. 어떻게 움직이는지를 나타내지는 않아요.', '크기는 물체의 모양에 관한 것이에요. 얼마나 빠르게, 어느 쪽으로 움직이는지가 운동 상태예요.', '모양이 변하는 것은 힘의 또 다른 효과예요(찰흙). 운동 상태와는 달라요.'],
            explain: '운동 상태는 <b>속력</b>과 <b>운동 방향</b>으로 나타내요. 속력이 변하거나, 운동 방향이 변하거나, 둘 다 변하면 <b>운동 상태가 변했다</b>고 해요.',
          },
        ],
      },
      /* ---------------- STEP 2 · 실험 ---------------- */
      {
        title: '힘의 방향에 따른 변화', short: '힘의 방향', icon: '🧪', phase: '실험',
        features: ['zone', 'modes', 'results'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘이 0이 아니면 운동 상태가 변하는 것을 봤어요.</div>' +
          '<p>이번에는 알짜힘의 <b>방향</b>에 따라 운동 상태가 어떻게 달라지는지 실험해요. 퍽이 오른쪽으로 <b>1.5 m/s</b>로 달리다가 보라색 <b>힘 구역</b>에 들어가요. 구역 안에서만 일정한 힘이 작용해요.</p>' +
          '<p>네 가지 모드를 실행하고 <b>결과 표</b>에서 속력과 운동 방향이 어떻게 변하는지 비교해요.</p>',
        setup() { setScene('zone', true); zoneFullReset(); },
        recap: '알짜힘이 운동 방향과 <b>같으면 빨라지고</b>, <b>반대이면 느려져요</b>. 늘 <b>수직</b>이면 방향만, <b>비스듬하면</b> 속력과 방향이 모두 변해요.',
        summary: '<p>' + SVG_FOUR + '</p><ul><li>알짜힘이 운동 방향과 <b>같은 방향</b> → <b>속력이 커져요</b>(빨라짐). 방향은 그대로.</li>' +
          '<li><b>반대 방향</b> → <b>속력이 줄어요</b>(느려짐). 방향은 그대로.</li>' +
          '<li>늘 운동 방향에 <b>수직</b> → 속력은 그대로, <b>운동 방향만</b> 변해요(원을 그리며 돌아요).</li>' +
          '<li><b>비스듬한</b> 방향 → 속력과 운동 방향이 <b>모두</b> 변해요.</li></ul>',
        missions: [
          {
            scene: 'zone', fresh: true,
            title: '같은 방향과 반대 방향',
            goal: '<b>① 같은 방향</b>과 <b>② 반대 방향</b> 모드를 각각 <b>▶ 출발</b>시켜 보세요. 구역을 지난 뒤 퍽의 속력이 어떻게 달라지는지 지켜봐요.',
            hint: '모드 ①을 고르고 ▶ 출발을 누른 뒤, 끝나면 모드 ②를 골라 다시 출발해요. 점 사이 간격과 속력 값을 비교해 봐요.',
            setup() { zoneSetMode(1); showHint('모드를 고르고 ▶ 출발을 눌러요', 7000); },
            check: () => !!Z.done[1] && !!Z.done[2],
            status: () => chip(Z.done[1], '① 같은 방향') + ' · ' + chip(Z.done[2], '② 반대 방향'),
            hold: 0.5,
            explain: '알짜힘의 방향이 운동 방향과 <b>같으면</b> 속력이 커져 <b>빨라지고</b>, <b>반대이면</b> 속력이 줄어 <b>느려져요</b>. 두 경우 모두 퍽이 일직선으로 움직여서 <b>운동 방향은 그대로</b>예요. 속력만 변해요.',
          },
          {
            scene: 'zone',
            title: '수직인 힘과 비스듬한 힘',
            goal: '<b>③ 줄과 기둥</b>과 <b>④ 비스듬히</b> 모드를 실행해 보세요. ③에서는 줄이 퍽을 늘 기둥 쪽으로 당겨요.',
            hint: '모드 ③을 고르고 ▶ 출발! 줄이 당기는 방향과 퍽의 운동 방향 사이의 ∟ 표시를 찾아봐요.',
            setup() { zoneSetMode(3); },
            check: () => !!Z.done[3] && !!Z.done[4],
            status: () => chip(Z.done[3], '③ 줄과 기둥') + ' · ' + chip(Z.done[4], '④ 비스듬히'),
            hold: 0.5,
            explain: '③ 줄이 당기는 힘은 늘 퍽의 운동 방향에 <b>수직</b>이에요. 그래서 속력은 그대로이고 <b>운동 방향만</b> 변해요(원을 그리며 돌아요).' +
              '<br>④ 힘이 운동 방향과 <b>비스듬하면</b> 속력도 운동 방향도 <b>모두</b> 변해요. 경로가 휘면서 빨라졌지요?',
          },
          {
            scene: 'zone',
            type: 'quiz',
            title: '수직으로 계속 작용하면?',
            goal: '알짜힘이 퍽의 <b>운동 방향과 수직</b>으로 계속 작용하면 퍽의 운동 상태는 어떻게 될까요?',
            choices: ['속력은 그대로, 운동 방향만 변한다', '속력만 변한다', '속력과 운동 방향이 모두 변한다', '아무것도 변하지 않는다'],
            answer: 0,
            feedback: ['', '결과 표에서 ③의 속력을 다시 보세요. 퍽은 같은 빠르기로 돌았어요.', '③ 실험에서 속력 값이 변했나요? 줄이 당기는 힘은 늘 운동 방향과 수직이었어요.', '퍽이 원을 그리며 휘었죠? 운동 방향이 바뀌었으니 운동 상태가 변한 거예요.'],
            explain: '운동 방향과 수직인 힘은 속력을 늘리거나 줄이지 못하고 <b>방향만</b> 바꿔요. 그래서 일정한 빠르기로 원을 그리며 돌 수 있어요.',
          },
        ],
      },
      /* ---------------- STEP 3 · 설명 ---------------- */
      {
        title: '알짜힘으로 설명하기', short: '알짜힘', icon: '💡', phase: '설명',
        features: ['twoOnMoving', 'toss'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘의 방향이 운동 방향과 같은지, 반대인지, 수직인지에 따라 운동 상태가 달라지는 것을 실험했어요.</div>' +
          '<p>이번에는 힘이 <b>여러 개</b> 작용할 때를 <b>알짜힘</b>으로 설명해요. 움직이는 퍽에 앞쪽 힘과 뒤쪽 힘을 걸어 알짜힘을 만들고, 던진 공과 굴러가는 공도 알짜힘으로 설명해 봐요.</p>',
        setup() { setScene('two', true); },
        recap: '힘이 여러 개여도 <b>알짜힘</b>의 방향이 운동 방향과 같으면 속력이 늘고, 반대이면 줄어요. 던진 공(중력)과 굴러가는 공(마찰력)도 알짜힘으로 설명할 수 있어요.',
        summary: '<ul><li>힘이 여러 개 작용해도 <b>알짜힘(합력)</b>으로 운동 상태의 변화를 설명해요.</li>' +
          '<li>알짜힘이 운동 방향과 <b>같으면 빨라지고</b>, <b>반대이면 느려져요</b>. 알짜힘이 0이면 변하지 않아요.</li>' +
          '<li><b>위로 던진 공</b>: 손을 떠난 뒤에는 <b>중력</b>만 작용해요. 올라갈 때는 알짜힘(아래)이 운동 방향(위)과 반대라서 속력이 줄어요.</li>' +
          '<li><b>굴러가다 멈추는 공</b>: 운동 반대 방향으로 <b>마찰력</b>이 작용해서 점점 느려져요.</li></ul>',
        missions: [
          {
            scene: 'two', fresh: true, pulse: false,
            title: '알짜힘 맞추기',
            goal: '움직이는 퍽에 <b>앞쪽 힘</b>과 <b>뒤쪽 힘</b>을 걸어 <b>알짜힘이 앞쪽으로 2 N</b>이 되게 맞춘 뒤 <b>▶ 실행</b>하세요.',
            hint: '알짜힘 = 앞쪽 힘 − 뒤쪽 힘이에요. 예를 들어 앞쪽 4 N, 뒤쪽 2 N이면 알짜힘은 2 N이에요.',
            setup() { PL.ran2 = false; showHint('앞쪽 손과 뒤쪽 손을 끌어 알짜힘을 2 N으로 맞춰요', 8000); },
            check: () => PL.ran2,
            status: () => {
              const n = PL.F[1] - PL.F[0];
              return '앞쪽 ' + PL.F[1] + ' N − 뒤쪽 ' + PL.F[0] + ' N = <b>알짜힘 ' + n + ' N</b> ' + (n === 2 ? '✅' : '⬜ <small>(2 N이 되게 맞춰요)</small>') + '<br>' + chip(PL.ran2, '실행해서 빨라지는 것 확인');
            },
            hold: 0.4,
            explain: '앞쪽 힘이 뒤쪽 힘보다 2 N 커서 알짜힘은 <b>앞쪽(운동 방향)으로 2 N</b>이에요. 알짜힘이 운동 방향과 같으니 퍽이 <b>빨라졌어요</b>.' +
              '<br>두 힘을 같게 하면 알짜힘이 0이 되어 속력이 그대로이고, 뒤쪽 힘이 더 크면 알짜힘이 운동 방향과 반대라서 느려져요.',
          },
          {
            scene: 'toss', fresh: true,
            type: 'quiz',
            title: '위로 던진 공',
            goal: '손을 떠나 <b>위로 올라가는 동안</b> 공에 작용하는 힘과 공의 변화는? (공기 저항은 생각하지 않아요)',
            choices: ['아래쪽 중력만 작용해서, 운동 방향과 반대이므로 속력이 줄어든다', '던진 힘이 계속 위쪽으로 작용해서 위로 올라간다', '아무 힘도 작용하지 않는다', '중력이 위쪽으로 작용한다'],
            answer: 0,
            feedback: ['', '손을 떠난 뒤에는 손이 공을 밀지 않아요. 장면에서 주황색 「던지는 힘」 화살표가 사라졌지요? 그 뒤에 공에 작용하는 힘은 무엇인가요?', '공의 속력이 계속 변하고 있어요. 속력이 변하면 알짜힘이 0이 아니에요. 빨간 화살표를 찾아보세요.', '중력은 늘 지구 중심 쪽, 아래쪽으로 작용해요.'],
            explain: '손을 떠난 공에는 <b>중력(아래쪽)</b>만 작용해요. 올라가는 동안 알짜힘(아래쪽)이 운동 방향(위쪽)과 <b>반대</b>라서 속력이 점점 줄어요. 꼭대기를 지나 내려올 때는 알짜힘과 운동 방향이 <b>같아서</b> 속력이 늘어나요.',
          },
          {
            scene: 'roll', fresh: true,
            type: 'quiz',
            title: '굴러가다 멈추는 공',
            goal: '평평한 바닥에서 굴러가던 공이 점점 느려지다가 멈췄어요. 그 까닭은? (수평 방향의 힘만 생각해요)',
            choices: ['운동 반대 방향으로 마찰력이 작용해서(알짜힘이 0이 아니어서)', '공이 가진 힘이 다 떨어져서', '공에 아무 힘도 작용하지 않아서', '중력이 점점 커져서'],
            answer: 0,
            feedback: ['', '힘은 물체에 저장되는 것이 아니에요. 다른 물체가 공에 작용하는 거예요. 바닥이 공에 작용하는 힘을 찾아보세요.', '힘이 하나도 없다면 얼음판 위의 퍽처럼 속력이 그대로예요. 공은 느려졌으니 알짜힘이 0이 아니에요.', '중력은 아래쪽으로 작용해요. 수평 방향의 속력을 줄이는 힘은 아니에요.'],
            explain: '바닥이 공의 운동 반대 방향으로 <b>마찰력</b>을 작용해요. 알짜힘이 운동 방향과 반대라서 공은 <b>점점 느려지다가 멈춰요</b>. 마찰이 거의 없는 얼음판 위의 퍽이 멈추지 않았던 것과 비교해 보세요.',
          },
        ],
      },
      /* ---------------- STEP 4 · 적용 ---------------- */
      {
        title: '놀이공원 사례 조사·분류', short: '사례 분류', icon: '🎡', phase: '적용',
        features: ['park'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘의 방향으로 속력과 운동 방향의 변화를 설명했어요.</div>' +
          '<p>놀이공원의 놀이 기구 <b>8가지</b>를 조사해서 <b>속력만 변함 / 방향만 변함 / 속력과 방향 모두 변함</b>으로 분류해요.</p>' +
          '<p>카드를 <b>누르면</b> 조사 창에서 다중 섬광과 알짜힘 화살표가 재생돼요.</p>',
        setup() { setScene('park', true); parkReset(); },
        recap: '놀이 기구도 알짜힘의 방향으로 분류할 수 있어요. 같은·반대 방향 → 속력만, 수직 → 방향만, 비스듬 → 둘 다 변해요.',
        summary: '<ul><li><b>속력만 변함</b>: 자이로드롭 낙하, 출발하는 열차, 굴러가다 멈추는 볼링공 (알짜힘이 운동 방향과 같거나 반대)</li>' +
          '<li><b>방향만 변함</b>: 일정한 빠르기로 도는 회전목마, 대관람차 (알짜힘이 늘 운동 방향에 수직)</li>' +
          '<li><b>속력과 방향 모두 변함</b>: 바이킹, 롤러코스터 루프, 던진 고리 (알짜힘이 비스듬)</li></ul>',
        missions: [
          {
            scene: 'park', fresh: true,
            title: '놀이 기구 조사·분류',
            goal: '카드를 <b>누르면</b> 조사 창에서 움직임이 재생돼요. 카드 8장을 알맞은 통으로 <b>끌어다 놓아</b> 모두 분류하세요.',
            hint: '힘의 방향과 운동 방향이 이루는 각을 보세요. 같거나 반대면 속력만, 수직이면 방향만, 비스듬하면 둘 다 변해요. 점 사이 간격(속력)과 경로(방향)도 살펴봐요.',
            setup() { showHint('카드를 눌러 조사하고, 통으로 끌어다 놓아요', 8000); },
            check: () => K.placedN >= RIDES.length,
            status: () => BUCKETS.map((b, i) => '<b>' + b.title.replace('속력과 방향 모두 변함', '둘 다 변함') + '</b> ' + bucketCount(i) + '장').join(' · ') + '<br>' + chip(K.placedN >= RIDES.length, '분류한 카드 ' + K.placedN + ' / ' + RIDES.length),
            hold: 0.8,
            explain: '<b>직선</b>으로 움직이며 알짜힘이 운동 방향과 <b>같거나 반대</b>이면 속력만 변해요. 알짜힘이 늘 운동 방향에 <b>수직</b>이면 속력은 그대로이고 방향만 변해요. 알짜힘이 <b>비스듬</b>하면 속력과 방향이 모두 변해요.' +
              '<br>🎡 분류가 끝나면 <b>나의 분류 포스터</b>가 만들어져요!',
          },
          {
            scene: 'park',
            type: 'quiz',
            title: '친구의 조사 보고서 점검',
            goal: '친구가 놀이 기구를 조사해서 쓴 보고서예요. <b>잘못된 문장</b>을 고르세요.',
            choices: ['자이로드롭이 떨어질 때는 중력이 운동 방향과 같아서 속력이 커진다.', '일정한 빠르기로 도는 회전목마는 속력이 변한다.', '대관람차의 곤돌라는 힘이 늘 운동 방향에 수직이라서 운동 방향만 바뀐다.', '롤러코스터가 루프를 돌 때는 속력과 운동 방향이 모두 변한다.'],
            answer: 1,
            feedback: ['이 문장은 옳아요. 떨어질 때 중력(아래쪽)과 운동 방향(아래쪽)이 같아서 빨라져요. 잘못된 문장을 찾아보세요.', '', '이 문장은 옳아요. 곤돌라는 일정한 빠르기로 돌고, 힘이 운동 방향에 수직이에요. 다른 문장을 살펴보세요.', '이 문장은 옳아요. 루프에서는 속력도, 운동 방향도 계속 바뀌어요. 다른 문장을 살펴보세요.'],
            explain: '회전목마가 <b>일정한 빠르기</b>로 돈다는 것은 속력이 변하지 않는다는 뜻이에요. 알짜힘이 늘 중심 쪽(운동 방향에 수직)으로 작용해서 <b>운동 방향만</b> 계속 바뀌어요.',
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
        if (scene === 'hands' || scene === 'two') celebrate(PU.x, PU.y, 48);
        else if (scene === 'zone') celebrate(ZX + 100, Z.y, 56);
        else if (scene === 'park') celebrate(W / 2, 110, 60);
      }
    }
    lastPhase = ph; lastIdx = i;
  }

  /* ---------- 시작 ---------- */
  renderTable();
  syncScene();                                   // (장면은 단계 소개·미션 시작 때 이미 정해졌어요: 이어하기에도 맞게)
  SciSim.loop((dt, t) => {
    if (scene === 'hands' || scene === 'two') stepPull(dt);
    else if (scene === 'zone') stepZone(dt);
    else if (scene === 'glide') stepGlide(dt);
    else if (scene === 'toss') stepToss(dt);
    else if (scene === 'roll') stepRoll(dt);
    else stepPark(dt);
    if (PUCK[scene]) { stepLauncher(dt); }
    view.clear('#eef5ff');
    if (scene === 'hands' || scene === 'two') drawPull(dt);
    else if (scene === 'zone') drawZone(dt, t);
    else if (scene === 'glide') drawGlide(dt, t);
    else if (scene === 'toss') drawToss(dt, t);
    else if (scene === 'roll') drawRoll(dt, t);
    else drawPark(dt, t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.4);
      ctx.fillStyle = 'rgba(238,245,255,' + (1 - EASE.outCubic(trans.t)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    watchSuccess();
    if (game && !!game.free !== lastFree) syncScene();
    if (K.poster !== syncPark._p) { syncPark._p = K.poster; syncGo(); }
    updateReadouts(t);
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, get game() { return game; }, W, H, PL, Z, G, TO, RO, K, KP, PU, FL: () => FL, ARR, NPX, VPX, PM, ZX, X0,
    RIDES, BUCKETS, MODELS, cardAt, chipPos, setScene, pullGo, zoneGo, zoneSetMode, previewSelect, parkReset, plNet, zoneNet, spdMS, turnedDeg, tossStart, rollStart, savePoster,
    knobPos, hookX, parkLayout: () => PL_,
    setF(a, b) { PL.F[0] = a; PL.F[1] = b; },
  };
})();
