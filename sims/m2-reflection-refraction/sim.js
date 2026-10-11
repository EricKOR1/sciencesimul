/* =========================================================
   중2 Ⅲ. 빛과 파동 — 빛의 반사와 굴절 [9과10-01]
   ① [관찰] 물체를 보는 과정   광원 → 물체 → 눈, 빛의 경로 그리기 · 가림판으로 빛의 길 막기
   ② [실험] 반사               레이저 + 각도기 + 법선: 입사각 = 반사각, 정반사·난반사 비교
   ③ [실험] 굴절               공기 → 물·유리: 법선 쪽으로 꺾임, 수직 입사는 직진, 물고기가 떠 보임(빛의 경로)
   ④ [적용] 경로 퍼즐          거울을 돌려 레이저로 목표 맞히기, 잠망경 원리
   범위: 굴절 법칙은 정량적으로 다루지 않음(각도는 관찰·비교만, sin·굴절률 표시 없음)
   광선은 모두 기하학으로 계산: 반사 d' = d - 2(d·n)n, 굴절은 하나의 스넬 모형(공기 1.00 · 물 1.33 · 유리 1.50)
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

  /* ---------- 각도기 (법선 기준, 5° 눈금) ---------- */
  function protractor(cx, cy, R, o) {
    o = o || {};
    const dir = o.dir || 'up';                    // up | down | both
    const k = o.k == null ? 1 : o.k;              // 나타나는 정도 0~1
    const labelStep = PHONE ? 30 : 10;
    ctx.save();
    ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha) * k;
    const halves = dir === 'both' ? [1, -1] : [dir === 'down' ? -1 : 1];
    halves.forEach((hv) => {
      const a0 = hv > 0 ? Math.PI : 0, a1 = hv > 0 ? TAU : Math.PI;
      const sw0 = a0, sw1 = a0 + (a1 - a0) * k;
      // 띠
      ctx.beginPath(); ctx.arc(cx, cy, R, sw0, sw1); ctx.arc(cx, cy, R - 20, sw1, sw0, true); ctx.closePath();
      const g = ctx.createRadialGradient(cx, cy, R - 20, cx, cy, R);
      g.addColorStop(0, 'rgba(226,232,255,.04)'); g.addColorStop(1, 'rgba(226,232,255,.13)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,255,.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, R, sw0, sw1); ctx.stroke();
      ctx.strokeStyle = 'rgba(226,232,255,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R - 20, sw0, sw1); ctx.stroke();
      for (let d = -90; d <= 90; d += 5) {
        if ((d + 90) / 180 > k + 0.001) break;
        const s = Math.sin(d * DEG), c = Math.cos(d * DEG), major = d % 10 === 0, mid = d % 30 === 0;
        const len = mid ? 13 : major ? 9 : 5;
        ctx.strokeStyle = d === 0 ? 'rgba(255,255,255,.95)' : major ? 'rgba(226,232,255,.7)' : 'rgba(226,232,255,.4)';
        ctx.lineWidth = d === 0 ? 2.2 : 1.3;
        ctx.beginPath(); ctx.moveTo(cx + R * s, cy - hv * R * c); ctx.lineTo(cx + (R - len) * s, cy - hv * (R - len) * c); ctx.stroke();
        if (d % labelStep === 0 && Math.abs(d) <= 80) {
          txt(String(Math.abs(d)), cx + (R - 31) * s, cy - hv * (R - 31) * c, { size: 11.5, weight: 700, color: 'rgba(214,223,255,.82)', halo: 'rgba(8,13,31,.7)' });
        }
      }
    });
    ctx.restore();
  }
  /* 각도기 위의 표시 점 (현재 각도) */
  function ringDot(cx, cy, R, deg, side, color, hv) {
    const s = Math.sin(deg * DEG * side), c = Math.cos(deg * DEG);
    const x = cx + (R - 10) * s, y = cy - (hv || 1) * (R - 10) * c;
    glowDot(x, y, 15, color, 0.7);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
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

  /* ---------- 레이저 포인터 : (x,y)=몸통 가운데, ang=빛이 나가는 방향 ---------- */
  const LS = 1.16, DEVOFF = 38 * LS + 6;      // 레이저 크기, 몸통 가운데가 각도기 바깥으로 떨어진 거리
  function laserDevice(x, y, ang, o) {
    o = o || {};
    const lift = o.lift || 0, sc = 1 + 0.07 * lift;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(LS, LS);
    // 그림자 (눌러 들면 커지고 멀어져요)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,10,' + (0.45 + 0.2 * lift) + ')'; ctx.shadowBlur = 10 + 12 * lift; ctx.shadowOffsetY = 4 + 8 * lift;
    ctx.fillStyle = '#1f2937'; rr(-38 * sc, -10 * sc, 76 * sc, 20 * sc, 8); ctx.fill();
    ctx.restore();
    ctx.scale(sc, sc);
    const g = ctx.createLinearGradient(0, -10, 0, 10);
    g.addColorStop(0, '#9aa7bf'); g.addColorStop(0.35, '#566179'); g.addColorStop(1, '#1d2536');
    ctx.fillStyle = g; rr(-38, -10, 76, 20, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
    // 손잡이 띠
    ctx.fillStyle = '#10151f'; rr(-30, -10, 22, 20, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    for (let i = -27; i < -10; i += 4) { ctx.beginPath(); ctx.moveTo(i, -9); ctx.lineTo(i, 9); ctx.stroke(); }
    // 앞쪽 은색 캡
    const g2 = ctx.createLinearGradient(0, -11, 0, 11);
    g2.addColorStop(0, '#f1f5f9'); g2.addColorStop(0.5, '#94a3b8'); g2.addColorStop(1, '#475569');
    ctx.fillStyle = g2; rr(20, -11, 18, 22, 6); ctx.fill();
    // 윗면 하이라이트
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -6.5); ctx.lineTo(18, -6.5); ctx.stroke();
    // 렌즈 + 빨간 발광
    ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.arc(38, 0, 4.2, 0, TAU); ctx.fill();
    ctx.restore();
    if (o.on !== false) glowDot(x + Math.cos(ang) * 38 * LS, y + Math.sin(ang) * 38 * LS, 17, o.color || COL.laser, 0.85);
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
  /* 굴절 (하나의 스넬 모형): 법선 n(경계에서 매질1 쪽)과 입사 방향 d 로부터 굴절 방향. 전반사면 null (이 수업에서는 쓰지 않아요) */
  function refractVec(d, n, n1, n2) {
    const cosI = -(d.x * n.x + d.y * n.y), r = n1 / n2, k = 1 - r * r * (1 - cosI * cosI);
    if (k < 0) return null;
    const t = r * cosI - Math.sqrt(k);
    return { x: r * d.x + t * n.x, y: r * d.y + t * n.y };
  }

  /* =========================================================
     장면 ① 어두운 방 : 전등(광원) → 사과(물체) → 눈
     ========================================================= */
  const SEEP = PHONE
    ? { L: { x: 92, y: 96 }, A: { x: 246, y: 316 }, E: { x: 436, y: 204 }, rA: 33, bub: { x: 440, y: 86 }, home: { x: 440, y: 340 }, bw: 12, bh: 92, rb: 34 }
    : { L: { x: 150, y: 112 }, A: { x: 410, y: 376 }, E: { x: 664, y: 236 }, rA: 42, bub: { x: 684, y: 102 }, home: { x: 700, y: 410 }, bw: 16, bh: 128, rb: 44 };
  (function () {
    const P = SEEP, u1 = { x: P.L.x - P.A.x, y: P.L.y - P.A.y }, u2 = { x: P.E.x - P.A.x, y: P.E.y - P.A.y };
    const n1 = Math.hypot(u1.x, u1.y), n2 = Math.hypot(u2.x, u2.y);
    const sx = u1.x / n1 + u2.x / n2, sy = u1.y / n1 + u2.y / n2, sn = Math.hypot(sx, sy);
    P.nrm = { x: sx / sn, y: sy / sn };                                   // 반사점에서의 법선 (입사 · 반사 방향의 이등분선)
    P.H = { x: P.A.x + P.nrm.x * P.rA * 0.97, y: P.A.y + P.nrm.y * P.rA * 0.97 };
  })();
  const SEE = {
    arrows: [], drag: null,
    lampWant: false, lamp: 0,
    boardOn: false,
    bd: { x: SEEP.home.x, y: SEEP.home.y, w: SEEP.bw, h: SEEP.bh, lift: 0, drag: false, ox: 0, oy: 0 },
    appleB: 0, seen: 0, lampSeen: 0, lampSeenT: 0,
    blockLA: false, blockAE: false, tLA: 0, tAE: 0, doneLA: false, doneAE: false,
    eyeFlash: 0, built: { LA: false, AE: false, LE: false }, completed: false,
    pu: { LH: new Pulses(0.5, 400), HE: new Pulses(0.5, 400), LE: new Pulses(0.75, 400) },
    dust: [],
  };
  for (let i = 0; i < 16; i++) SEE.dust.push({ a: Math.random() * TAU, r: 30 + Math.random() * 230, s: 0.05 + Math.random() * 0.12, z: 0.8 + Math.random() * 1.6, p: Math.random() * 6 });

  const boardRect = () => { const b = SEE.bd; return { x: b.x - b.w / 2 - 2, y: b.y - b.h / 2, w: b.w + 4, h: b.h }; };
  const blockedSeg = (ax, ay, bx, by) => SEE.boardOn && segHitRect(ax, ay, bx, by, boardRect()) != null;
  /* 전등 → 사과 : 사과 위에 고른 표본 광선 중 막히지 않은 비율 */
  function litFraction() {
    const L = SEEP.L, A = SEEP.A, r = SEEP.rA, K = 9;
    const dx = A.x - L.x, dy = A.y - L.y, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
    let n = 0;
    for (let i = 0; i < K; i++) { const o = (i / (K - 1) * 2 - 1) * r * 0.92; if (!blockedSeg(L.x, L.y, A.x + nx * o, A.y + ny * o)) n++; }
    return n / K;
  }
  /* 사과 → 눈 */
  function eyeFraction() {
    const E = SEEP.E, A = SEEP.A, r = SEEP.rA, K = 7;
    const dx = E.x - A.x, dy = E.y - A.y, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
    let n = 0;
    for (let i = 0; i < K; i++) { const o = (i / (K - 1) * 2 - 1) * r * 0.9; if (!blockedSeg(A.x + nx * o, A.y + ny * o, E.x, E.y)) n++; }
    return n / K;
  }
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function seePaths() {
    const P = SEEP, L = P.L, H = P.H, E = P.E;
    const eyeEdge = (from) => { const dx = E.x - from.x, dy = E.y - from.y, d = Math.hypot(dx, dy) || 1; return { x: E.x - dx / d * 34 * (PHONE ? 0.8 : 1), y: E.y - dy / d * 34 * (PHONE ? 0.8 : 1) }; };
    const cut = (a, b) => {                                  // 가림판에 막히면 거기서 끝
      if (!SEE.boardOn) return { end: b, hit: false };
      const t = segHitRect(a.x, a.y, b.x, b.y, boardRect());
      return t == null ? { end: b, hit: false } : { end: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, hit: true };
    };
    const lh = cut(L, H), he = cut(H, eyeEdge(H)), le = cut(L, eyeEdge(L));
    return { LH: lh, HE: he, LE: le, eLH: lh.end, eHE: he.end, eLE: le.end };
  }

  function stepSee(dt) {
    const S = SEE, P = SEEP;
    S.boardOn = S.boardOn || (!!game && game.free);
    // 화살표 진행
    for (let i = S.arrows.length - 1; i >= 0; i--) {
      const a = S.arrows[i];
      a.age += dt;
      if (a.p < 1) {
        a.p = Math.min(1, a.p + dt / 0.38);
        if (a.p >= 1 && a.valid) { Sound.tick(); const q = arrowEnds(a); FX.burst(q.x2, q.y2, { count: 6, life: 0.4, speed: 80, size: 3, gravity: 0, colors: ['#bae6fd', '#fff'] }); }
      }
      if (!a.valid && a.age > a.life) S.arrows.splice(i, 1);
    }
    const done = (f, t) => S.arrows.some((a) => a.valid && a.from === f && a.to === t && a.p >= 1);
    S.built.LA = done('L', 'A'); S.built.AE = done('A', 'E'); S.built.LE = done('L', 'E');
    if (S.built.LA && S.built.AE && !S.completed) {
      S.completed = true; S.lampWant = true;
      celebrate(P.H.x, P.H.y, 40); badge('빛의 길 완성!', W / 2, 34 * FS, COL.good);
    }
    if (!(S.built.LA && S.built.AE)) S.completed = false;

    // 빛과 밝기
    S.lamp = approach(S.lamp, S.lampWant ? 1 : 0, dt, 6);
    const lit = S.boardOn ? litFraction() : 1, vis = S.boardOn ? eyeFraction() : 1;
    S.appleB = approach(S.appleB, S.lamp * lit, dt, 9);
    S.seen = approach(S.seen, S.appleB > 0.3 ? sstep(0.12, 0.6, vis) * Math.min(1, S.appleB * 1.2) : 0, dt, 9);
    const directBlocked = blockedSeg(P.L.x, P.L.y, P.E.x, P.E.y);
    S.lampSeen = approach(S.lampSeen, S.lamp > 0.5 && !directBlocked ? 1 : 0, dt, 9);
    S.blockLA = S.lamp > 0.9 && lit < 0.2;
    S.blockAE = S.lamp > 0.9 && lit > 0.8 && vis < 0.2;
    S.tLA = S.blockLA ? S.tLA + dt : 0; S.tAE = S.blockAE ? S.tAE + dt : 0;
    if (S.tLA > 0.5 && !S.doneLA) { S.doneLA = true; badge('사과에 빛이 닿지 못해요!', W / 2, 34 * FS, COL.warn); }
    if (S.tAE > 0.5 && !S.doneAE) { S.doneAE = true; badge('반사된 빛이 눈에 못 들어와요!', W / 2, 34 * FS, COL.warn); }
    S.bd.lift = approach(S.bd.lift, S.bd.drag ? 1 : 0, dt, 14);
    S.eyeFlash = Math.max(0, S.eyeFlash - dt * 2.2);

    // 빛 알갱이
    const ps = seePaths();
    const pLH = makePath([P.L, ps.eLH]), pHE = makePath([P.H, ps.eHE]), pLE = makePath([P.L, ps.eLE]);
    S.pLH = pLH; S.pHE = pHE; S.pLE = pLE;
    const lampOk = S.lamp > 0.6;
    S.pu.LH.update(dt, pLH, lampOk);
    S.pu.HE.update(dt, pHE, lampOk && S.appleB > 0.2);
    S.pu.LE.update(dt, pLE, lampOk);
    if (!ps.HE.hit && S.appleB > 0.3 && NOW() - S.pu.HE.arrived < 0.08) S.eyeFlash = 1;
    if (!ps.LE.hit && NOW() - S.pu.LE.arrived < 0.08) S.eyeFlash = Math.max(S.eyeFlash, 0.8);
    SEE.ps = ps;
  }

  /* 화살표 끝점 (노드 가장자리에서 가장자리까지) */
  function arrowEnds(a) {
    const P = SEEP;
    const pt = { L: P.L, A: P.H, E: P.E };
    let s = pt[a.from], e = pt[a.to];
    if (a.from === 'A' && a.to !== 'A') s = { x: P.A.x, y: P.A.y };
    if (a.to === 'A') e = (a.from === 'L') ? P.H : { x: P.A.x, y: P.A.y };
    if (a.from === 'A' && a.to === 'E') s = P.H;
    const gapS = a.from === 'L' ? 26 : a.from === 'E' ? 36 : a.from === 'A' && a.to === 'E' ? 4 : P.rA + 4;
    const gapE = a.to === 'L' ? 26 : a.to === 'E' ? 38 : a.to === 'A' ? (a.from === 'L' ? 3 : P.rA + 6) : 4;
    const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1;
    return { x1: s.x + dx / d * gapS, y1: s.y + dy / d * gapS, x2: e.x - dx / d * gapE, y2: e.y - dy / d * gapE };
  }
  function dArrow(x1, y1, x2, y2, p, color, o) {
    o = o || {};
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 6 || p <= 0.01) return;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, len = L * p, ex = x1 + ux * len, ey = y1 + uy * len;
    const head = Math.min(17, len * 0.8), w = o.width || 5, nx = -uy, ny = ux, hw = head * 0.62;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.strokeStyle = 'rgba(4,7,20,.8)'; ctx.lineWidth = w + 4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex - ux * head * 0.5, ey - uy * head * 0.5); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex - ux * head * 0.5, ey - uy * head * 0.5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * head + nx * hw, ey - uy * head + ny * hw); ctx.lineTo(ex - ux * head - nx * hw, ey - uy * head - ny * hw); ctx.closePath();
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(4,7,20,.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  /* ----- 그림: 사과 · 전등 · 눈 말풍선 · 가림판 ----- */
  function drawApple(x, y, r, b, hx, hy) {
    const body = mix('#2b2433', '#dc2626', b), hi = mix('#3a3042', '#ff8d7a', b), lo = mix('#1a1522', '#7a0f1c', b);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.6);
    ctx.bezierCurveTo(x + r * 0.35, y - r * 1.02, x + r * 1.1, y - r * 0.8, x + r * 1.0, y - r * 0.02);
    ctx.bezierCurveTo(x + r * 0.96, y + r * 0.72, x + r * 0.46, y + r * 1.08, x, y + r * 0.94);
    ctx.bezierCurveTo(x - r * 0.46, y + r * 1.08, x - r * 0.96, y + r * 0.72, x - r * 1.0, y - r * 0.02);
    ctx.bezierCurveTo(x - r * 1.1, y - r * 0.8, x - r * 0.35, y - r * 1.02, x, y - r * 0.6);
    ctx.closePath();
    const g = ctx.createRadialGradient(x + hx * r * 0.45, y + hy * r * 0.45, r * 0.08, x, y, r * 1.25);
    g.addColorStop(0, hi); g.addColorStop(0.5, body); g.addColorStop(1, lo);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    if (b > 0.05) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * b).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x + hx * r * 0.52, y + hy * r * 0.5, r * 0.16, r * 0.28, Math.atan2(hy, hx) + Math.PI / 2, 0, TAU); ctx.fill();
    }
    // 꼭지와 잎
    ctx.strokeStyle = mix('#2a2018', '#7c4a1e', b); ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.55); ctx.quadraticCurveTo(x + r * 0.04, y - r * 0.85, x + r * 0.16, y - r * 1.0); ctx.stroke();
    ctx.fillStyle = mix('#1c2a28', '#22c55e', b);
    ctx.beginPath(); ctx.ellipse(x + r * 0.36, y - r * 0.92, r * 0.3, r * 0.14, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawLamp(x, y, on, t) {
    const s = PHONE ? 0.85 : 1;
    ctx.save();
    ctx.strokeStyle = '#3c4766'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, y - 46 * s); ctx.stroke();
    if (on > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = 1 + (RM ? 0 : Math.sin(t * 9) * 0.015);
      D.glow(x, y, 130 * on * fl, '#ffd470', 0.55 * on);
      D.glow(x, y, 54 * on, '#fff3c4', 0.8 * on);
      ctx.restore();
    }
    // 갓
    const gs = ctx.createLinearGradient(x - 36 * s, 0, x + 36 * s, 0);
    gs.addColorStop(0, '#8793ab'); gs.addColorStop(0.45, '#c3cde0'); gs.addColorStop(1, '#5b6580');
    ctx.fillStyle = gs;
    ctx.beginPath(); ctx.moveTo(x - 36 * s, y - 8 * s); ctx.quadraticCurveTo(x - 30 * s, y - 40 * s, x, y - 50 * s); ctx.quadraticCurveTo(x + 30 * s, y - 40 * s, x + 36 * s, y - 8 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 전구
    const bulb = mix('#3b4254', '#fff4c2', on);
    const gb = ctx.createRadialGradient(x - 4 * s, y - 3 * s, 1, x, y, 16 * s);
    gb.addColorStop(0, mix('#6b7488', '#ffffff', on)); gb.addColorStop(1, bulb);
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(x, y, 15 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function drawBubble(seen, lampSeen, t) {
    const b = SEEP.bub, r = SEEP.rb, E = SEEP.E;
    ctx.save();
    // 생각 방울 꼬리
    [[0.3, 5], [0.55, 7], [0.78, 9]].forEach(([k, rad]) => {
      const x = E.x + (b.x - E.x) * k * 0.7, y = (E.y - 30) + (b.y + r - (E.y - 30)) * k;
      ctx.fillStyle = 'rgba(190,210,255,.28)'; ctx.beginPath(); ctx.arc(x, y, rad * FS * 0.85, 0, TAU); ctx.fill();
    });
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    const g = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.4, r * 0.1, b.x, b.y, r);
    g.addColorStop(0, '#223260'); g.addColorStop(1, '#10183a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.5; ctx.strokeStyle = seen > 0.5 ? 'rgba(125,211,252,.9)' : 'rgba(148,163,205,.5)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, r - 3, 0, TAU); ctx.clip();
    if (seen > 0.04) {
      ctx.globalAlpha = Math.min(1, 0.25 + seen);
      drawApple(b.x, b.y + 2, r * 0.5, seen, -0.5, -0.6);
    } else {
      txt('?', b.x, b.y + 2, { size: 30, color: 'rgba(160,175,215,.7)', halo: false });
    }
    if (lampSeen > 0.5) {                                   // 광원은 직접 보여요
      ctx.globalAlpha = lampSeen;
      glowDot(b.x - r * 0.52, b.y - r * 0.5, 13 * FS, '#ffe08a', 0.9);
    }
    ctx.restore();
    txt('눈에 보이는 모습', b.x, b.y + r + 15 * FS, { size: 12.5, color: '#b6c6ee', halo: 'rgba(6,10,24,.8)' });
  }
  function drawBoard(t) {
    const b = SEE.bd, k = b.lift;
    // 놓인 자리 표시
    const hm = SEEP.home;
    if (Math.hypot(b.x - hm.x, b.y - hm.y) > 30) {
      ctx.save(); ctx.strokeStyle = 'rgba(180,195,235,.28)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6;
      rr(hm.x - b.w / 2 - 2, hm.y - b.h / 2, b.w + 4, b.h, 3); ctx.stroke(); ctx.restore();
    }
    softShadow(b.x + 4 + 8 * k, b.y + b.h / 2 + 2 + 5 * k, 30 + 8 * k, 7 + 2 * k, 0.4);
    ctx.save();
    ctx.translate(b.x, b.y - 6 * k); ctx.scale(1 + 0.06 * k, 1 + 0.06 * k);
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 8 + 10 * k; ctx.shadowOffsetY = 3 + 5 * k;
    const g = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
    g.addColorStop(0, '#e2c9a0'); g.addColorStop(0.55, '#c9a46f'); g.addColorStop(1, '#8a6a3f');
    ctx.fillStyle = g; rr(-b.w / 2, -b.h / 2, b.w, b.h, 3); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(40,24,6,.55)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-b.w / 2 + 2, -b.h / 2 + 4, 2, b.h - 8);
    // 받침
    ctx.fillStyle = '#5b4426'; rr(-b.w / 2 - 9, b.h / 2 - 5, b.w + 18, 9, 3); ctx.fill();
    ctx.restore();
    pill('가림판', b.x, b.y - b.h / 2 - 18 * FS, { color: '#d9b57a', size: 12.5 });
  }
  function drawShadowOf(on) {
    if (!SEE.boardOn || on < 0.02) return;
    const b = boardRect(), L = SEEP.L;
    const cs = [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h }];
    let lo = null, hi = null;
    cs.forEach((c) => { const a = Math.atan2(c.y - L.y, c.x - L.x); c.a = a; if (!lo || a < lo.a) lo = c; if (!hi || a > hi.a) hi = c; });
    const far = 1400, f = (c) => ({ x: L.x + (c.x - L.x) / Math.hypot(c.x - L.x, c.y - L.y) * far, y: L.y + (c.y - L.y) / Math.hypot(c.x - L.x, c.y - L.y) * far });
    const fl = f(lo), fh = f(hi), mx = (lo.x + hi.x) / 2, my = (lo.y + hi.y) / 2, mf = f({ x: mx, y: my });
    const g = ctx.createLinearGradient(mx, my, mf.x, mf.y);
    g.addColorStop(0, 'rgba(3,6,18,' + (0.62 * on).toFixed(3) + ')'); g.addColorStop(1, 'rgba(3,6,18,' + (0.32 * on).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(lo.x, lo.y); ctx.lineTo(hi.x, hi.y); ctx.lineTo(fh.x, fh.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.fill();
  }

  function drawSee(dt, t) {
    const S = SEE, P = SEEP, L = P.L, A = P.A, E = P.E, on = S.lamp;
    // 방 (벽 + 바닥)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c1329'); g.addColorStop(0.5, '#111a3a'); g.addColorStop(1, '#080c1d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const fy = A.y + P.rA + (PHONE ? 52 : 70);
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = 'rgba(148,163,205,.09)';
    for (let x = 24; x < W; x += 48) for (let y = 24; y < fy - 8; y += 48) ctx.fillRect(x - 1, y - 1, 2, 2);
    // 전등 불빛이 방을 밝혀요
    if (on > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(L.x, L.y, 10, L.x, L.y, Math.max(W, H) * 0.95);
      rg.addColorStop(0, 'rgba(255,214,120,' + (0.34 * on).toFixed(3) + ')'); rg.addColorStop(0.5, 'rgba(255,190,90,' + (0.1 * on).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 탁자
    const tx0 = A.x - (PHONE ? 100 : 140), tw = (PHONE ? 200 : 280), ty = A.y + P.rA + 3;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    const gt = ctx.createLinearGradient(0, ty, 0, ty + 18);
    gt.addColorStop(0, mix('#3a2f2a', '#b98a5c', on * 0.85)); gt.addColorStop(1, mix('#241c19', '#7a5634', on * 0.85));
    ctx.fillStyle = gt; rr(tx0, ty, tw, 18, 5); ctx.fill();
    ctx.restore();
    ctx.fillStyle = mix('#1d1714', '#6b4a2c', on * 0.8);
    ctx.fillRect(tx0 + 14, ty + 18, 12, fy - ty - 12); ctx.fillRect(tx0 + tw - 26, ty + 18, 12, fy - ty - 12);
    // 그림자 (가림판 뒤)
    drawShadowOf(on);
    // 전등에서 사방으로 퍼지는 빛
    if (on > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.3;
      const N = PHONE ? 20 : 26;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU + 0.07, dx = Math.cos(a), dy = Math.sin(a);
        let ex = L.x + dx * 1200, ey = L.y + dy * 1200;
        const hit = S.boardOn ? segHitRect(L.x, L.y, ex, ey, boardRect()) : null;
        if (hit != null) { ex = L.x + (ex - L.x) * hit; ey = L.y + (ey - L.y) * hit; }
        const len = hit != null ? Math.hypot(ex - L.x, ey - L.y) : Math.min(Math.max(W, H) * 0.9, 560);
        const gr = ctx.createLinearGradient(L.x, L.y, L.x + dx * len, L.y + dy * len);
        gr.addColorStop(0, 'rgba(255,221,130,' + (0.2 * on).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,221,130,0)');
        ctx.strokeStyle = gr; ctx.beginPath(); ctx.moveTo(L.x + dx * 20, L.y + dy * 20); ctx.lineTo(L.x + dx * len, L.y + dy * len); ctx.stroke();
      }
      ctx.restore();
      // 사과로 가는 빛다발 (원뿔)
      const d = Math.hypot(A.x - L.x, A.y - L.y), nx = -(A.y - L.y) / d, ny = (A.x - L.x) / d;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cone = ctx.createLinearGradient(L.x, L.y, A.x, A.y);
      cone.addColorStop(0, 'rgba(255,224,140,0)'); cone.addColorStop(1, 'rgba(255,224,140,' + (0.17 * on * S.appleB).toFixed(3) + ')');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(A.x + nx * P.rA * 0.95, A.y + ny * P.rA * 0.95); ctx.lineTo(A.x - nx * P.rA * 0.95, A.y - ny * P.rA * 0.95); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 사과 그림자
    softShadow(A.x + 8, A.y + P.rA + 1, P.rA * 1.2, 7, 0.28 + 0.2 * S.appleB);
    // 사과
    const hl = { x: L.x - A.x, y: L.y - A.y }, hn = Math.hypot(hl.x, hl.y);
    drawApple(A.x, A.y, P.rA, S.appleB, hl.x / hn, hl.y / hn);
    if (S.appleB < 0.25) {                                   // 어두운 방: 윤곽만 희미하게
      ctx.save(); ctx.globalAlpha = 0.2 * (1 - S.appleB / 0.25); ctx.strokeStyle = '#8ea2d6'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(A.x, A.y, P.rA + 7, 0, TAU); ctx.stroke(); ctx.restore();
    }

    // 사과 표면에서 사방으로 흩어지는 빛 (난반사) + 눈으로 가는 빛
    const ps = S.ps;
    if (ps && S.appleB > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const base = Math.atan2(P.nrm.y, P.nrm.x);
      for (let i = -4; i <= 4; i++) {
        const sa = base + i * 0.2, px = A.x + Math.cos(sa) * P.rA * 0.98, py = A.y + Math.sin(sa) * P.rA * 0.98;
        for (let j = -1; j <= 1; j++) {
          const ra = sa + j * 0.55 + Math.sin(i * 2.3 + j) * 0.12, len = (26 + 14 * Math.abs(Math.sin(i * 1.7 + j * 2.1 + t * 0.7))) * (PHONE ? 0.8 : 1);
          if (i === 0 && j === 0) continue;
          const gr = ctx.createLinearGradient(px, py, px + Math.cos(ra) * len, py + Math.sin(ra) * len);
          gr.addColorStop(0, 'rgba(255,200,120,' + (0.38 * S.appleB).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ra) * len, py + Math.sin(ra) * len); ctx.stroke();
        }
      }
      ctx.restore();
    }
    // 핵심 빛줄기
    if (ps && on > 0.03) {
      const wB = PHONE ? 2.2 : 2.6;
      beam([L, ps.eLH], { color: '#ffd45e', alpha: on, width: wB });
      if (S.appleB > 0.05) beam([SEEP.H, ps.eHE], { color: '#ffd45e', alpha: Math.min(1, S.appleB * 1.1), width: wB });
      beam([L, ps.eLE], { color: '#ffe9a0', alpha: on * 0.55, width: wB * 0.8 });
      S.pu.LH.draw(S.pLH, '#ffd45e', 3); S.pu.HE.draw(S.pHE, '#ffd45e', 3); S.pu.LE.draw(S.pLE, '#ffe9a0', 2.6);
      // 가림판에 부딪히는 곳
      [[ps.LH, ps.eLH], [ps.HE, ps.eHE], [ps.LE, ps.eLE]].forEach(([r, p]) => { if (r.hit) glowDot(p.x, p.y, 16, '#ffd45e', 0.55 * on); });
      // 반사점 반짝
      if (S.appleB > 0.3) glowDot(SEEP.H.x, SEEP.H.y, 14 + (RM ? 0 : Math.sin(t * 6) * 2), '#fff3c4', 0.5 * S.appleB);
      // 반사점의 법선과 입사·반사 (살짝)
      if (S.appleB > 0.5) dashed(SEEP.H.x, SEEP.H.y, SEEP.H.x + P.nrm.x * 34, SEEP.H.y + P.nrm.y * 34, 'rgba(255,255,255,.35)', 1.4, [4, 4]);
    }
    // 먼지 알갱이 (빛 속)
    if (on > 0.05 && !RM) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      S.dust.forEach((d) => {
        d.p += dt * d.s; const a = d.p, x = L.x + Math.cos(a + d.a) * d.r, y = L.y + Math.sin(a + d.a) * d.r * 0.8 + 40;
        if (x < 6 || x > W - 6 || y < 6 || y > fy) return;
        ctx.fillStyle = 'rgba(255,230,160,' + (0.35 * on * (0.5 + 0.5 * Math.sin(t * 1.3 + d.z * 5))).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, d.z, 0, TAU); ctx.fill();
      });
      ctx.restore();
    }

    // 전등 · 눈 · 방울
    drawLamp(L.x, L.y, on, t);
    drawEye(E.x, E.y, PHONE ? 0.8 : 1, A.x - E.x, A.y - E.y, { glow: S.eyeFlash, pupil: 8.5 - 2.2 * S.lamp });
    drawBubble(S.seen, S.lampSeen, t);

    // 이름표
    pill('광원 · 전등', L.x, L.y + (PHONE ? 38 : 48), { color: '#ffd66b', size: 13 });
    pill('물체 · 사과', A.x, A.y + P.rA + (PHONE ? 66 : 82), { color: '#ff8d7a', size: 13 });
    pill('눈', E.x, E.y + (PHONE ? 36 : 44), { color: '#7dd3fc', size: 13 });
    if (!S.lampWant && !S.arrows.length) {                   // 전등을 눌러 보라는 맥박
      const k = (t * 1.1) % 1;
      ctx.save(); ctx.strokeStyle = rgba('#ffd66b', 0.7 * (1 - k)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(L.x, L.y - 6, 26 + k * 24, 0, TAU); ctx.stroke(); ctx.restore();
    }

    // 학생이 그린 화살표 (빛의 경로)
    S.arrows.forEach((a) => {
      const q = arrowEnds(a);
      const col = a.valid ? (a.to === 'E' && a.from === 'L' ? '#fde68a' : '#d7f3ff') : '#fb7185';
      let al = 1, ox = 0;
      if (!a.valid) { al = clamp((a.life - a.age) / 0.5, 0, 1); ox = Math.sin(a.age * 40) * 3 * Math.max(0, 1 - a.age * 2.2); }
      ctx.save(); ctx.translate(ox, 0);
      dArrow(q.x1, q.y1, q.x2, q.y2, EASE.outCubic(a.p), col, { alpha: al, width: a.valid ? 5 : 4.5, dash: a.valid ? null : [8, 6] });
      ctx.restore();
      if (!a.valid && a.p >= 1 && al > 0.1) {
        const mx = (q.x1 + q.x2) / 2, my = (q.y1 + q.y2) / 2;
        pill('✕ ' + a.msg, clamp(mx, 120, W - 120), my + (a.from === 'L' || a.to === 'L' ? 22 : -22), { solid: true, color: '#e11d48', size: 13.5, alpha: al, fit: true });
      }
      if (a.valid && a.from === 'L' && a.to === 'E' && a.p >= 1) {
        pill('광원은 직접 눈에 들어와요', (q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2 - 20, { color: '#fde68a', size: 12.5 });
      }
    });
    // 끌고 있는 중
    if (S.drag && S.drag.moved) {
      const d = S.drag, n = SEEP[d.from], target = seeNodeAt({ x: d.x, y: d.y });
      const x1 = n.x, y1 = n.y;
      const dxx = d.x - x1, dyy = d.y - y1, dl = Math.hypot(dxx, dyy) || 1;
      dArrow(x1 + dxx / dl * 24, y1 + dyy / dl * 24, d.x, d.y, 1, '#bae6fd', { alpha: 0.85, dash: [3, 8], width: 4 });
      if (target && target !== d.from) {
        const tn = SEEP[target];
        ctx.save(); ctx.strokeStyle = rgba('#7dd3fc', 0.9); ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(tn.x, tn.y, target === 'A' ? P.rA + 12 : 40, 0, TAU); ctx.stroke(); ctx.restore();
      }
    }
    // 다음에 시작할 곳 안내 맥박
    if (on_('draw') && S.arrows.length < 4 && !S.drag) {
      let from = null;
      if (!S.built.LA) from = 'L'; else if (!S.built.AE) from = 'A';
      if (from && game && game.phase === 'active' && game.current() && game.current().id === 'rr-path') {
        const n = SEEP[from], k = (t * 1.2) % 1;
        ctx.save(); ctx.strokeStyle = rgba('#7dd3fc', 0.8 * (1 - k)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(n.x, n.y - (from === 'L' ? 6 : 0), (from === 'A' ? P.rA : 28) + 6 + k * 20, 0, TAU); ctx.stroke(); ctx.restore();
      }
    }
    if (S.boardOn) drawBoard(t);
  }
  function on_(f) { return feat.has(f); }

  function seeNodeAt(p) {
    const P = SEEP;
    const nodes = [['E', P.E, 46], ['A', P.A, P.rA + 12], ['L', P.L, 44]];
    for (const [k, n, r] of nodes) if (Math.hypot(p.x - n.x, p.y - (k === 'L' ? n.y - 6 : n.y)) <= r) return k;
    return null;
  }
  function addArrow(from, to) {
    const S = SEE;
    S.arrows = S.arrows.filter((a) => !(a.from === from && a.to === to));
    const valid = (from === 'L' && to === 'A') || (from === 'A' && to === 'E') || (from === 'L' && to === 'E');
    const a = { from, to, valid, p: 0, age: 0, life: valid ? 1e9 : 2.6, msg: '' };
    if (!valid) {
      a.msg = from === 'E' ? '빛은 눈에서 나가지 않아요!' : '거꾸로예요! 빛은 광원에서 출발해요';
      Sound.fail();
    } else Sound.click();
    S.arrows.push(a);
  }
  function seeDown(p) {
    const S = SEE, b = S.bd;
    if (S.boardOn && Math.abs(p.x - b.x) <= b.w / 2 + 16 && Math.abs(p.y - b.y) <= b.h / 2 + 10) {
      b.drag = true; b.ox = p.x - b.x; b.oy = p.y - b.y; Sound.click(); hideHint(); return true;
    }
    const n = seeNodeAt(p);
    if (!n) return false;
    S.drag = { from: n, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
    hideHint();
    return true;
  }
  function seeMove(p) {
    const S = SEE, b = S.bd;
    if (b.drag) {
      b.x = clamp(p.x - b.ox, b.w, W - b.w); b.y = clamp(p.y - b.oy, b.h / 2 + 24 * FS, H - b.h / 2 - 8);
    } else if (S.drag) {
      S.drag.x = p.x; S.drag.y = p.y;
      if (Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 12) S.drag.moved = true;
    }
  }
  function seeUp(p) {
    const S = SEE;
    if (S.bd.drag) { S.bd.drag = false; return; }
    const d = S.drag; S.drag = null;
    if (!d) return;
    if (!d.moved) { if (d.from === 'L') { S.lampWant = !S.lampWant; Sound.click(); } return; }
    const to = seeNodeAt(p);
    if (to && to !== d.from) addArrow(d.from, to);
  }
  function seeReset() { SEE.arrows.length = 0; SEE.drag = null; }

  /* =========================================================
     장면 ② 반사 · 장면 ②-2 정반사와 난반사
     법선(점선) 기준 입사각 = 반사각
     ========================================================= */
  const RG = PHONE ? { ox: 260, oy: 330, R: 142, ra: 66, mx0: 30, mx1: 490 } : { ox: 400, oy: 386, R: 196, ra: 88, mx0: 62, mx1: 738 };
  const RF = {
    a: -30, sp: new SciSim.Spring(-30, { stiffness: 250, damping: 21 }),
    drag: false, lift: 0, dragged: false, last: -30,
    hold: { 30: 0, 50: 0 }, rec: { 30: false, 50: false },
    mode: 'mirror', modeT: 0, seen: { mirror: 0, rough: 0 },
    pu: new Pulses(0.5, 560), pu2: [],
    flash: 0,
  };
  const TILT = [14, -11, 18, -20, 8];     // 거친 면의 아주 작은 면들이 기울어진 정도(도)
  const limitsOf = () => (scene === 'surface' ? [10, 50] : [5, 80]);
  function setRFAngle(a, user) {
    const [lo, hi] = limitsOf();
    let mag = clamp(Math.round(Math.abs(a) / 5) * 5, lo, hi);
    const s = a === 0 ? sgn(RF.a) : sgn(a);
    const v = s * mag;
    if (v !== RF.a) { RF.a = v; if (user) { Sound.tick(); RF.dragged = true; } syncSliders(); }
  }
  function rfAngleFrom(p) {
    const dx = p.x - RG.ox, dy = RG.oy - p.y;
    return Math.atan2(dx, Math.max(dy, 1)) / DEG;
  }
  const rfHitDevice = (p) => {
    const av = RF.sp.value, u = { x: Math.sin(av * DEG), y: -Math.cos(av * DEG) };
    const c = { x: RG.ox + u.x * (RG.R + DEVOFF), y: RG.oy + u.y * (RG.R + DEVOFF) };
    if (Math.hypot(p.x - c.x, p.y - c.y) <= 50) return true;
    const d = Math.hypot(p.x - RG.ox, p.y - RG.oy);
    return p.y < RG.oy - 6 && d > RG.R - 34 && d < RG.R + 96;       // 각도기 둘레를 눌러도 그 자리로 와요
  };

  function stepReflect(dt) {
    RF.sp.target = RF.a; RF.sp.update(dt);
    RF.lift = approach(RF.lift, RF.drag ? 1 : 0, dt, 14);
    RF.modeT = approach(RF.modeT, RF.mode === 'rough' ? 1 : 0, dt, 6);
    RF.flash = Math.max(0, RF.flash - dt * 2);
    if (scene === 'reflect') {
      [30, 50].forEach((T) => {
        if (Math.abs(RF.a) === T && Math.abs(RF.sp.value - RF.a) < 1.2) RF.hold[T] += dt; else RF.hold[T] = 0;
        if (RF.hold[T] >= 0.5 && !RF.rec[T]) {
          RF.rec[T] = true; Sound.success(); RF.flash = 1;
          const g = RG, s = Math.sin(RF.a * DEG), c = Math.cos(RF.a * DEG);
          FX.burst(g.ox + s * (g.R - 10), g.oy - c * (g.R - 10), { count: 8, life: 0.5, speed: 90, size: 3.2, gravity: 0, shape: 'star', colors: ['#fde047', '#2dd4bf', '#fff'] });
          badge('입사각 ' + T + '° 기록!', W / 2, 34 * FS, COL.good);
        }
      });
    } else if (scene === 'surface') {
      const k = RF.mode;
      if (Math.abs(RF.modeT - (k === 'rough' ? 1 : 0)) < 0.05) { RF.seen[k] += dt; }
      else RF.seen[k] = Math.max(0, RF.seen[k] - dt * 0.5);
    }
  }

  function drawMirrorBase(t, ent) {
    const g = RG, y = g.oy, x0 = g.mx0, x1 = g.mx1, k = RF.modeT, rough = scene === 'surface';
    const w = x1 - x0;
    ctx.save();
    ctx.globalAlpha *= ent;
    // 받침대
    const gb = ctx.createLinearGradient(0, y, 0, y + 50);
    gb.addColorStop(0, '#2b3656'); gb.addColorStop(1, '#10162a');
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    ctx.fillStyle = gb; rr(x0 - 8, y + 5, w + 16, 44, 9); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(160,180,230,.2)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 거울면 (은색 유리) / 거친 종이
    if (k < 0.99) {
      ctx.save(); ctx.globalAlpha *= 1 - k;
      const gm = ctx.createLinearGradient(0, y, 0, y + 10);
      gm.addColorStop(0, '#f4f8ff'); gm.addColorStop(0.5, '#b7c6e3'); gm.addColorStop(1, '#7d8fb4');
      ctx.fillStyle = gm; rr(x0, y, w, 10, 3); ctx.fill();
      // 지나가는 반짝임
      if (!RM) {
        ctx.save(); rr(x0, y, w, 10, 3); ctx.clip();
        const sx = x0 - 120 + (((t * 0.22) % 1.7) / 1.7) * (w + 240);
        const gs = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
        gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,255,255,.95)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gs; ctx.fillRect(sx - 60, y, 120, 10);
        ctx.restore();
      }
      ctx.restore();
    }
    if (k > 0.01) {
      ctx.save(); ctx.globalAlpha *= k;
      ctx.fillStyle = '#e9e0cb'; rr(x0, y, w, 10, 3); ctx.fill();
      ctx.fillStyle = 'rgba(120,98,60,.5)';
      for (let i = 0; i < 90; i++) { const px = x0 + ((i * 97.3) % w), py = y + 1.5 + ((i * 31.7) % 7); ctx.fillRect(px, py, 2.2, 1.4); }
      ctx.restore();
    }
    ctx.restore();
  }

  /* 빛 상자 (여러 줄기의 나란한 빛): 앞면(틈새판)이 원점에서 빛이 나가는 쪽 */
  function lightBox(x, y, ang, half, lift) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const sc = 1 + 0.05 * (lift || 0);
    ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 12 + 8 * (lift || 0); ctx.shadowOffsetY = 5;
    const g = ctx.createLinearGradient(-32, 0, 30, 0);
    g.addColorStop(0, '#242d46'); g.addColorStop(0.6, '#44516f'); g.addColorStop(1, '#7f8cab');
    ctx.fillStyle = g; rr(-34, -half - 8, 62, half * 2 + 16, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(-30, -half - 4, 6, half * 2 + 8, 3); ctx.fill();
    ctx.fillStyle = '#080b16'; rr(20, -half - 4, 9, half * 2 + 8, 3); ctx.fill();          // 틈새판
    ctx.fillStyle = '#ffd9dc';
    for (let i = -2; i <= 2; i++) ctx.fillRect(20.5, i * (half - 4) / 2 - 1.6, 8, 3.2);
    ctx.restore();
  }

  /* 각도 라벨 위치: 각이 작으면 광선과 면 사이(바깥), 50° 이상이면 법선과 광선 사이(안쪽). 옮겨 갈 때는 부드럽게 미끄러져요 */
  const LBL = {};
  let curDt = 0.016;
  function angleLabelPos(O, sd, deg, hv, R, key) {
    const inner = deg >= 50;
    const phi = inner ? deg / 2 : (90 + deg) / 2, rad = R * (inner ? 0.66 : 0.6);
    const x = O.x + sd * Math.sin(phi * DEG) * rad, y = O.y - hv * Math.cos(phi * DEG) * rad;
    let L = LBL[key];
    if (!L || sceneT < 0.05) L = LBL[key] = { x, y };
    L.x = approach(L.x, x, curDt, 16); L.y = approach(L.y, y, curDt, 16);
    return { x: L.x, y: L.y };
  }
  /* 각도기 눈금 숫자가 현재 각도에서 색깔로 켜져요 */
  function ringReadout(O, R, deg, sd, color, hv) {
    const s = Math.sin(deg * DEG * sd), c = Math.cos(deg * DEG);
    pill(String(Math.round(deg)), O.x + (R - 31) * s, O.y - hv * (R - 31) * c, { solid: true, color, textColor: '#0b1226', size: 12.5 });
  }

  function drawReflectScene(dt, t) {
    const g = RG, O = { x: g.ox, y: g.oy };
    const ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1));
    const surf = scene === 'surface';
    const av = RF.sp.value, aRad = av * DEG;
    const u = { x: Math.sin(aRad), y: -Math.cos(aRad) };            // 점 O 에서 레이저 쪽으로
    const dIn = { x: -u.x, y: -u.y };
    const side = av < 0 ? -1 : 1;                                   // 레이저가 있는 쪽
    const incV = Math.abs(av), incT = Math.abs(RF.a);               // 화면 속 각도 · 글자로 읽는 각도(5° 단위)
    const dOut = reflectVec(dIn, { x: 0, y: -1 });

    drawBG();
    drawMirrorBase(t, ent);
    // 각도기와 법선
    protractor(O.x, O.y, g.R, { dir: 'up', k: ent, alpha: surf ? 0.6 : 1 });
    dashed(O.x, O.y, O.x, O.y - g.R - 18, 'rgba(255,255,255,.8)', 1.8, [7, 6]);
    pill('법선', O.x, O.y - g.R - 30 * FS, { color: '#cbd5e1', size: 12.5, alpha: ent });
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;                  // 직각 표시
    ctx.beginPath(); ctx.moveTo(O.x + 11, O.y); ctx.lineTo(O.x + 11, O.y - 11); ctx.lineTo(O.x, O.y - 11); ctx.stroke(); ctx.restore();

    const tipD = g.R + 6;
    if (!surf) {
      // ----- 레이저 한 줄기 -----
      const T = { x: O.x + u.x * tipD, y: O.y + u.y * tipD };
      const end = { x: O.x + dOut.x * 700, y: O.y + dOut.y * 700 };
      const bw = 3.2, fl = 1 + RF.flash * 0.6;
      beam([T, O], { color: COL.laser, width: bw * fl, alpha: ent });
      beam([O, end], { color: COL.laser, width: bw * fl, alpha: ent });
      const P = makePath([T, O, end]);
      RF.pu.update(dt, P, ent > 0.9);
      RF.pu.draw(P, COL.laser, 3.2);
      glowDot(O.x, O.y, 26 + (RM ? 0 : Math.sin(t * 8) * 3), COL.laser, 0.7 * ent);       // 반사점 불빛
      if (ent > 0.9) sparkAt(dt, O.x, O.y - 2, '#ffd9dc', 0.08, 2.6);
      // 각도 호
      const nAng = -Math.PI / 2, rIn = Math.atan2(u.y, u.x), rOut = Math.atan2(dOut.y, dOut.x);
      const ra = g.ra * (0.5 + 0.5 * ent);
      angleArc(O.x, O.y, ra, nAng, rIn, COL.inc, 0.2);
      angleArc(O.x, O.y, ra + 12, nAng, rOut, COL.ref, 0.16);
      ringDot(O.x, O.y, g.R, incV, side, COL.inc, 1);
      ringDot(O.x, O.y, g.R, incV, -side, COL.ref, 1);
      ringReadout(O, g.R, incV, side, COL.inc, 1); ringReadout(O, g.R, incV, -side, COL.ref, 1);
      // 레이저 본체
      const c = { x: O.x + u.x * (g.R + DEVOFF), y: O.y + u.y * (g.R + DEVOFF) };
      laserDevice(c.x, c.y - (1 - ent) * 60, Math.atan2(dIn.y, dIn.x), { lift: RF.lift });
      // 라벨
      const lp1 = angleLabelPos(O, side, incV, 1, g.R, 'rf-in'), lp2 = angleLabelPos(O, -side, incV, 1, g.R, 'rf-out');
      pill('입사각 ' + incT + '°', lp1.x, lp1.y, { color: COL.inc, size: 14, alpha: ent });
      pill('반사각 ' + incT + '°', lp2.x, lp2.y, { color: COL.ref, size: 14, alpha: ent });
      if (!RF.dragged && scene === 'reflect' && ent > 0.9) {
        txt('↔ 레이저를 끌어 보세요', clamp(c.x + u.x * 62 * FS, 90 * FS, W - 90 * FS), c.y + u.y * 62 * FS - 6, { size: 13, color: '#fde68a', alpha: 0.55 + 0.4 * Math.sin(t * 4) });
      }
      if (isNew('protractor')) newTag(O.x - g.R - 4, O.y - 56, 66, 26);
    } else {
      drawSurfaceBundle(dt, t, O, u, dIn, side, incV, incT, ent);
    }
  }

  /* ----- 정반사 · 난반사 : 나란한 빛 5줄기 ----- */
  function drawSurfaceBundle(dt, t, O, u, dIn, side, incV, incT, ent) {
    const g = RG, k = RF.modeT, gp = PHONE ? 20 : 27;               // 줄기 사이 간격(빛이 가는 방향에 수직)
    const perp = { x: -dIn.y, y: dIn.x };                           // dIn 에 수직
    const tipD = g.R + 6;
    const rays = [];
    for (let i = -2; i <= 2; i++) {
      // 출발점: 상자 앞면(원점에서 tipD 떨어진, 빛의 방향에 수직인 직선) 위
      const o0 = { x: O.x + u.x * tipD + perp.x * i * gp, y: O.y + u.y * tipD + perp.y * i * gp };
      const s = (O.y - o0.y) / dIn.y;
      const hit = { x: o0.x + dIn.x * s, y: O.y };
      const tau = TILT[i + 2] * k;
      const n = { x: Math.sin(tau * DEG), y: -Math.cos(tau * DEG) };
      let dOut = reflectVec(dIn, n);
      if (dOut.y > -0.1) dOut = { x: dOut.x > 0 ? 0.995 : -0.995, y: -0.1 };         // 너무 낮게 나가는 빛은 표면 위로
      rays.push({ i, o0, hit, dOut, n });
    }
    // 빛줄기
    const bw = 2.5;
    rays.forEach((r) => {
      const end = { x: r.hit.x + r.dOut.x * 640, y: r.hit.y + r.dOut.y * 640 };
      beam([r.o0, r.hit], { color: COL.laser, width: bw, alpha: ent });
      beam([r.hit, end], { color: COL.laser, width: bw, alpha: ent });
      glowDot(r.hit.x, r.hit.y, 15, COL.laser, 0.6 * ent);
    });
    // 빛 알갱이 (가운데 줄기만)
    const rc = rays[2], endc = { x: rc.hit.x + rc.dOut.x * 640, y: rc.hit.y + rc.dOut.y * 640 };
    const Pc = makePath([rc.o0, rc.hit, endc]);
    RF.pu.update(dt, Pc, ent > 0.9);
    RF.pu.draw(Pc, COL.laser, 3);
    // 빛 상자
    const c = { x: O.x + u.x * (tipD + 30), y: O.y + u.y * (tipD + 30) };
    lightBox(c.x, c.y - (1 - ent) * 60, Math.atan2(dIn.y, dIn.x), gp * 2 + 6, RF.lift);
    // 각도 호 (입사각만)
    angleArc(O.x, O.y, g.ra * 0.8, -Math.PI / 2, Math.atan2(u.y, u.x), COL.inc, 0.2);
    ringDot(O.x, O.y, g.R, incV, side, COL.inc, 1);
    ringReadout(O, g.R, incV, side, COL.inc, 1);
    const lp = angleLabelPos(O, side, incV, 1, g.R, 'sf-in');
    pill('입사각 ' + incT + '°', lp.x, lp.y, { color: COL.inc, size: 14, alpha: ent });
    // 이름표
    const rough = k > 0.5;
    const info = rough ? '난반사 : 여러 방향으로 흩어져요' : '정반사 : 나란히 반사돼요';
    pill(info, O.x, O.y + 80 * FS, { color: rough ? '#fb923c' : COL.ref, size: 14.5, alpha: ent, fit: true });
    if (!RF.dragged && ent > 0.9) txt('↔ 빛 상자를 끌어 보세요', clamp(c.x + u.x * 70 * FS, 90 * FS, W - 90 * FS), c.y + u.y * 70 * FS, { size: 13, color: '#fde68a', alpha: 0.55 + 0.4 * Math.sin(t * 4) });
    drawZoomInset(rays, dIn, k, ent, t);
  }
  function drawZoomInset(rays, dIn, k, ent, t) {
    const pw = PHONE ? 176 : 244, ph = PHONE ? 118 : 160, px = W - pw - 12, py = 12;
    ctx.save();
    ctx.globalAlpha *= ent;
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(px, py, pw, ph, 14); ctx.fillStyle = 'rgba(11,18,42,.94)'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(125,211,252,.6)'; ctx.stroke();
    rr(px, py, pw, ph, 14); ctx.clip();
    txt('🔍 표면을 확대하면', px + 10, py + 14 * FS, { size: 12.5, align: 'left', color: '#bcd0f5', halo: false });
    // 표면 윤곽 (거친 정도 k)
    const fw = (pw - 20) / 5, base = py + ph - 26 * FS;
    const pts = [];
    let y = 0;
    const facets = [];
    for (let i = 0; i < 5; i++) {
      const tau = TILT[i] * k, rise = Math.tan(tau * DEG) * fw;
      facets.push({ x0: px + 10 + i * fw, y0: y, x1: px + 10 + (i + 1) * fw, y1: y + rise, tau });
      y += rise;
    }
    const mid = facets.reduce((s, f) => s + (f.y0 + f.y1) / 2, 0) / 5;
    facets.forEach((f) => { f.y0 = base + f.y0 - mid; f.y1 = base + f.y1 - mid; });
    // 단면 채우기
    ctx.beginPath(); ctx.moveTo(px + 6, py + ph); ctx.lineTo(facets[0].x0, facets[0].y0);
    facets.forEach((f) => ctx.lineTo(f.x1, f.y1)); ctx.lineTo(px + pw - 6, facets[4].y1); ctx.lineTo(px + pw - 6, py + ph); ctx.closePath();
    const gm = ctx.createLinearGradient(0, base - 10, 0, py + ph);
    if (k < 0.5) { gm.addColorStop(0, '#c7d4ee'); gm.addColorStop(1, '#6b7da3'); } else { gm.addColorStop(0, '#e9e0cb'); gm.addColorStop(1, '#a89a78'); }
    ctx.fillStyle = gm; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#f8fafc'; ctx.lineJoin = 'round'; ctx.stroke();
    // 빛줄기
    const inLen = 50 * (PHONE ? 0.85 : 1), outLen = 46 * (PHONE ? 0.85 : 1);
    facets.forEach((f, i) => {
      const c = { x: (f.x0 + f.x1) / 2, y: (f.y0 + f.y1) / 2 };
      const r = rays[i];
      const n = { x: Math.sin(f.tau * DEG), y: -Math.cos(f.tau * DEG) };
      let dout = reflectVec(dIn, n);
      if (dout.y > -0.06) dout = r.dOut;
      const a = { x: c.x - dIn.x * inLen, y: c.y - dIn.y * inLen }, b = { x: c.x + dout.x * outLen, y: c.y + dout.y * outLen };
      dashed(c.x, c.y, c.x + n.x * 20, c.y + n.y * 20, 'rgba(255,255,255,.7)', 1.3, [3, 3]);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 2.3;
      ctx.strokeStyle = '#ff6b76'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
      // 화살촉
      const ah = (p, d) => { ctx.fillStyle = '#ff6b76'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - d.x * 7 + -d.y * 3.2, p.y - d.y * 7 + d.x * 3.2); ctx.lineTo(p.x - d.x * 7 - -d.y * 3.2, p.y - d.y * 7 - d.x * 3.2); ctx.closePath(); ctx.fill(); };
      ah({ x: c.x - dIn.x * 8, y: c.y - dIn.y * 8 }, dIn); ah(b, dout);
    });
    ctx.restore();
  }
  const SURF_LABEL = { mirror: '매끄러운 거울', rough: '거친 종이' };

  /* =========================================================
     장면 ③ 굴절 : 공기 → 물 · 유리
     (하나의 스넬 모형: 공기 1.00 · 물 1.33 · 유리 1.50 — 숫자는 화면에 나타내지 않아요)
     ========================================================= */
  const RRG = PHONE ? { ox: 260, oy: 212, R: 108, ra: 50 } : { ox: 400, oy: 264, R: 150, ra: 62 };
  const N_WATER = 1.33, N_GLASS = 1.5;
  const RR = {
    a: -40, sp: new SciSim.Spring(-40, { stiffness: 250, damping: 21 }), med: 'water', medT: 0,
    drag: false, lift: 0, dragged: false, side: -1,
    hold: { water: 0, glass: 0, normal: 0 }, seen: { water: false, glass: false, normal: false },
    pu: new Pulses(0.42, 420), rip: [], ripClock: 0, th: 0,
  };
  const nNow = () => N_WATER + (N_GLASS - N_WATER) * RR.medT;
  function setRRAngle(a, user) {
    const m = clamp(Math.round(Math.abs(a) / 5) * 5, 0, 80);
    const s = a === 0 ? RR.side : sgn(a);
    const v = m === 0 ? 0 : s * m;
    if (m !== 0) RR.side = s;
    if (v !== RR.a) { RR.a = v; if (user) { Sound.tick(); RR.dragged = true; } syncSliders(); }
  }
  const rrHit = (p) => {
    const av = RR.sp.value, u = { x: Math.sin(av * DEG), y: -Math.cos(av * DEG) }, g = RRG;
    const c = { x: g.ox + u.x * (g.R + DEVOFF), y: g.oy + u.y * (g.R + DEVOFF) };
    if (Math.hypot(p.x - c.x, p.y - c.y) <= 50) return true;
    const d = Math.hypot(p.x - g.ox, p.y - g.oy);
    return p.y < g.oy - 6 && d > g.R - 34 && d < g.R + 96;
  };
  function refractNow() {
    const av = RR.sp.value, aR = av * DEG;
    const u = { x: Math.sin(aR), y: -Math.cos(aR) }, dIn = { x: -u.x, y: -u.y };
    const n2 = nNow();
    const dT = refractVec(dIn, { x: 0, y: -1 }, 1, n2) || { x: dIn.x, y: dIn.y };
    const cosI = dIn.y, R0 = Math.pow((n2 - 1) / (n2 + 1), 2), fres = R0 + (1 - R0) * Math.pow(1 - cosI, 5);
    return { u, dIn, dT, n2, dR: reflectVec(dIn, { x: 0, y: -1 }), fres, thI: Math.abs(av), thT: Math.atan2(Math.abs(dT.x), dT.y) / DEG };
  }
  function stepRefract(dt) {
    RR.sp.target = RR.a; RR.sp.update(dt);
    RR.lift = approach(RR.lift, RR.drag ? 1 : 0, dt, 14);
    RR.medT = approach(RR.medT, RR.med === 'glass' ? 1 : 0, dt, 7);
    if (scene === 'refract') {
      const st = refractNow(), settled = Math.abs(RR.sp.value - RR.a) < 1.2 && Math.abs(RR.medT - (RR.med === 'glass' ? 1 : 0)) < 0.03;
      RR.th = st.thT;
      const cond = { water: RR.med === 'water' && Math.abs(RR.a) >= 40, glass: RR.med === 'glass' && Math.abs(RR.a) >= 40, normal: RR.a === 0 };
      Object.keys(cond).forEach((k) => {
        if (cond[k] && settled) RR.hold[k] += dt; else RR.hold[k] = 0;
        if (RR.hold[k] >= 0.7 && !RR.seen[k]) {
          RR.seen[k] = true; Sound.success();
          badge(k === 'normal' ? '수직으로 들어가면 꺾이지 않아요' : (k === 'water' ? '물에서 꺾이는 것을 확인!' : '유리에서 꺾이는 것을 확인!'), W / 2, 34 * FS, COL.good, 2.6);
        }
      });
      RR.ripClock += dt;
      if (RR.ripClock > 0.5) { RR.ripClock = 0; RR.rip.push({ t: 0 }); }
    }
    for (let i = RR.rip.length - 1; i >= 0; i--) { RR.rip[i].t += dt; if (RR.rip[i].t > 1.1) RR.rip.splice(i, 1); }
  }

  function drawWaterBody(y0, t, a) {
    const x0 = 0, x1 = W, y1 = H;
    ctx.save();
    ctx.globalAlpha *= a;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(42,132,214,.78)'); g.addColorStop(0.6, 'rgba(17,76,146,.88)'); g.addColorStop(1, 'rgba(8,36,84,.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, y1);
    for (let x = x0; x <= x1 + 8; x += 8) ctx.lineTo(x, y0 + (RM ? 0 : Math.sin(x * 0.03 + t * 1.8) * 1.4 + Math.sin(x * 0.071 - t * 1.1) * 0.8));
    ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
    // 일렁이는 빛무늬
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(160,215,255,' + (0.05 + 0.02 * Math.sin(t + i)) + ')'; ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) { const yy = y0 + 36 + i * 38 + (RM ? 0 : Math.sin(x * 0.02 + t * 0.9 + i * 1.7) * 7); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    ctx.restore();
    // 수면 하이라이트 + 반짝임
    ctx.strokeStyle = 'rgba(190,230,255,.85)'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 8; x += 8) { const yy = y0 + (RM ? 0 : Math.sin(x * 0.03 + t * 1.8) * 1.4 + Math.sin(x * 0.071 - t * 1.1) * 0.8); x > x0 ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
    ctx.stroke();
    if (!RM) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const px = ((i * 211.7 + t * 14) % (W + 40)) - 20, tw = Math.max(0, Math.sin(t * 2.2 + i * 1.9));
        ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * tw).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(px, y0 + 1, 7 * tw + 1, 1.5, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawGlassBody(y0, t, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    const g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(126,231,224,.34)'); g.addColorStop(1, 'rgba(70,170,190,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H - y0); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const sx = ((i * 260 + t * 8) % (W + 300)) - 150;
      const gr = ctx.createLinearGradient(sx, 0, sx + 90, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.save(); ctx.translate(sx, y0); ctx.transform(1, 0, -0.5, 1, 0, 0); ctx.fillRect(-30, 0, 90, H - y0); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(220,255,252,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,230,225,.4)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, y0 + 6); ctx.lineTo(W, y0 + 6); ctx.stroke();
    ctx.restore();
  }

  function drawRefractScene(dt, t) {
    const g = RRG, O = { x: g.ox, y: g.oy };
    const ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1));
    drawBG();
    // 매질
    if (RR.medT < 0.99) drawWaterBody(O.y, t, (1 - RR.medT) * ent);
    if (RR.medT > 0.01) drawGlassBody(O.y, t, RR.medT * ent);
    // 이름표 (속력 차이)
    pill(RR.medT < 0.5 ? '물 · 빛이 느려져요' : '유리 · 빛이 느려져요', 16, O.y + 28 * FS, { color: RR.medT < 0.5 ? '#7cc4ff' : '#7ee7e0', size: 13, align: 'left', alpha: ent });
    pill('공기 · 빛이 빠르게 나아가요', 16, O.y - 28 * FS, { color: '#cbd5e1', size: 13, align: 'left', alpha: ent });

    const st = refractNow();
    protractor(O.x, O.y, g.R, { dir: 'both', k: ent });
    dashed(O.x, O.y - g.R - 16, O.x, O.y + g.R + 16, 'rgba(255,255,255,.8)', 1.8, [7, 6]);
    pill('법선', O.x, O.y - g.R - 28 * FS, { color: '#cbd5e1', size: 12.5, alpha: ent });
    const tipD = g.R + 6;
    const T = { x: O.x + st.u.x * tipD, y: O.y + st.u.y * tipD };
    const endT = { x: O.x + st.dT.x * 640, y: O.y + st.dT.y * 640 };
    const endR = { x: O.x + st.dR.x * 560, y: O.y + st.dR.y * 560 };
    // 물 표면의 물결 (빛이 닿는 곳)
    RR.rip.forEach((r) => {
      const k = r.t / 1.1;
      ctx.save(); ctx.strokeStyle = 'rgba(200,235,255,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(O.x, O.y + 1, 10 + k * 62, 2.5 + k * 9, 0, 0, TAU); ctx.stroke(); ctx.restore();
    });
    // 빛줄기
    const bw = 3.2;
    beam([T, O], { color: COL.laser, width: bw, alpha: ent });
    beam([O, endT], { color: COL.laser, width: bw * (1 + (st.n2 - 1.33) * 0.4), alpha: ent });
    beam([O, endR], { color: COL.laser, width: bw * 0.8, alpha: clamp(0.1 + st.fres * 1.8, 0.1, 0.8) * ent });
    const P = makePath([T, O, endT], [1, 1 / st.n2]);
    RR.pu.update(dt, P, ent > 0.9);
    RR.pu.draw(P, COL.laser, 3.2);
    glowDot(O.x, O.y, 24 + (RM ? 0 : Math.sin(t * 8) * 3), COL.laser, 0.65 * ent);
    if (ent > 0.9) sparkAt(dt, O.x, O.y - 2, '#d7ecff', 0.14, 2.4);
    // 각도 호
    const rIn = Math.atan2(st.u.y, st.u.x), rT = Math.atan2(st.dT.y, st.dT.x);
    angleArc(O.x, O.y, g.ra * (0.5 + 0.5 * ent), -Math.PI / 2, rIn, COL.inc, 0.22);
    if (st.thI > 0.5) angleArc(O.x, O.y, g.ra * (0.5 + 0.5 * ent), Math.PI / 2, rT, COL.rfr, 0.24);
    const sdI = st.u.x < 0 ? -1 : 1, sdT = st.dT.x < 0 ? -1 : 1;
    ringDot(O.x, O.y, g.R, st.thI, sdI, COL.inc, 1);
    ringReadout(O, g.R, st.thI, sdI, COL.inc, 1);
    if (st.thI > 0.5) { ringDot(O.x, O.y, g.R, st.thT, sdT, COL.rfr, -1); ringReadout(O, g.R, st.thT, sdT, COL.rfr, -1); }
    const c = { x: O.x + st.u.x * (g.R + DEVOFF), y: O.y + st.u.y * (g.R + DEVOFF) };
    laserDevice(c.x, c.y - (1 - ent) * 60, Math.atan2(st.dIn.y, st.dIn.x), { lift: RR.lift });
    // 라벨 (각도기 눈금 숫자와 같은 값을 보여 줘요)
    const li = angleLabelPos(O, sdI, st.thI, 1, g.R, 'rr-in'), lt = angleLabelPos(O, sdT, st.thT, -1, g.R, 'rr-t');
    pill('입사각 ' + Math.round(st.thI) + '°', li.x, li.y, { color: COL.inc, size: 14, alpha: ent });
    if (st.thI > 0.5) pill('굴절각 ' + Math.round(st.thT) + '°', lt.x, lt.y, { color: COL.rfr, size: 14, alpha: ent });
    else pill('수직으로 들어가면 꺾이지 않아요', O.x + 118 * FS, O.y + g.R * 0.62, { color: COL.rfr, size: 13, alpha: ent, fit: true });
    if (!RR.dragged && ent > 0.9) txt('↔ 레이저를 끌어 보세요', clamp(c.x + st.u.x * 62 * FS, 90 * FS, W - 90 * FS), c.y + st.u.y * 62 * FS - 6, { size: 13, color: '#fde68a', alpha: 0.55 + 0.4 * Math.sin(t * 4) });
    if (isNew('water')) newTag(W - 160, O.y + 20, 120, 30);
  }

  /* =========================================================
     장면 ③-2 레이저로 물고기 맞히기 (물속 물고기는 실제보다 떠 보여요)
     눈은 레이저 위치에 있고, 눈에 보이는 위치(상)는 빛이 곧게 온 것처럼 느끼는 자리
     ========================================================= */
  const FG = PHONE
    ? { px: 62, py: 84, x0: 174, x1: 502, ys: 170, yb: 396, rimY: 136 }
    : { px: 100, py: 104, x0: 286, x1: 764, ys: 218, yb: 486, rimY: 168 };
  const FPOS = [[0.66, 0.62], [0.36, 0.78], [0.82, 0.44], [0.52, 0.5]];
  const fishAt = (i) => { const f = FPOS[i % FPOS.length]; return { x: FG.x0 + f[0] * (FG.x1 - FG.x0), y: FG.ys + f[1] * (FG.yb - FG.ys) }; };
  const FSH = {
    qx: FG.x0 + 0.12 * (FG.x1 - FG.x0), qv: 0, q0: 0, armed: false, drag: false, lift: 0, dragged: false,
    idx: 0, fish: Object.assign({ s: 1 }, fishAt(0)), hits: 0, hitT: 0, counted: false, nextAt: 0, idle: 0,
    pu: new Pulses(0.45, 460), bubbles: [], rip: [], ripClock: 0, tail: 0, near: false,
  };
  FSH.qv = FSH.qx; FSH.q0 = FSH.qx;
  function fishGhost(F) {
    const E = { x: FG.px, y: FG.py }, ys = FG.ys, n = N_WATER;
    let lo = E.x, hi = F.x;
    const f = (qx) => (qx - E.x) / Math.hypot(qx - E.x, ys - E.y) - n * (F.x - qx) / Math.hypot(F.x - qx, F.y - ys);
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    const qx = (lo + hi) / 2, k = (F.x - E.x) / (qx - E.x);
    return { qx, x: F.x, y: E.y + k * (ys - E.y) };
  }
  function fishBeam(qx) {                                    // 레이저: 눈 → 수면 qx → (굴절) → 물속
    const E = { x: FG.px, y: FG.py }, Q = { x: qx, y: FG.ys };
    const d = { x: Q.x - E.x, y: Q.y - E.y }, L = Math.hypot(d.x, d.y); d.x /= L; d.y /= L;
    const dT = refractVec(d, { x: 0, y: -1 }, 1, N_WATER);
    // 물속에서 탱크 벽·바닥까지
    let tEnd = 1e9;
    if (dT.x > 1e-6) tEnd = Math.min(tEnd, (FG.x1 - 6 - Q.x) / dT.x);
    if (dT.y > 1e-6) tEnd = Math.min(tEnd, (FG.yb - 6 - Q.y) / dT.y);
    return { E, Q, d, dT, end: { x: Q.x + dT.x * tEnd, y: Q.y + dT.y * tEnd } };
  }
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function setFishAim(p) {
    if (p.y <= FG.py + 12) return;
    const qx = FG.px + (p.x - FG.px) * (FG.ys - FG.py) / (p.y - FG.py);
    FSH.qx = clamp(qx, FG.x0 + 16, FG.x1 - 16);
    if (Math.abs(FSH.qx - FSH.q0) > 10) FSH.armed = true;
  }
  function moveFish(toIdx) {
    FSH.idx = toIdx % FPOS.length;
    const to = fishAt(FSH.idx);
    SciSim.tween(FSH.fish, { x: to.x, y: to.y }, { duration: 0.9, ease: 'inOutCubic' });
    FSH.counted = false; FSH.hitT = 0; FSH.armed = false; FSH.q0 = FSH.qx;      // 물고기가 옮겨 가면 레이저를 다시 겨냥해야 해요
  }
  function stepFish(dt) {
    FSH.qv = approach(FSH.qv, FSH.qx, dt, 22);
    FSH.lift = approach(FSH.lift, FSH.drag ? 1 : 0, dt, 14);
    FSH.tail += dt;
    if (scene !== 'fish') return;
    const bm = fishBeam(FSH.qv), F = FSH.fish;
    const dmin = distToSeg(F, bm.Q, bm.end), hit = FSH.armed && dmin <= 27;
    FSH.near = FSH.armed && !hit && dmin < 70;
    if (hit) FSH.hitT += dt; else FSH.hitT = Math.max(0, FSH.hitT - dt * 2);
    if (FSH.hitT > 0.4 && !FSH.counted) {
      FSH.counted = true; FSH.hits++; Sound.success();
      celebrate(F.x, F.y, 40); badge('명중! 빛이 물 표면에서 꺾여 물고기를 맞혔어요', W / 2, 34 * FS, COL.good, 3);
      FSH.nextAt = NOW() + 1.5;
    }
    if (FSH.counted && NOW() > FSH.nextAt && FSH.nextAt) { FSH.nextAt = 0; if (!(game && game.phase === 'active' && FSH.hits >= 2 && game.current() && game.current().id === 'rr-fish')) moveFish(FSH.idx + 1); }
    FSH.idle += dt;
    // 방울
    FSH.ripClock += dt;
    if (FSH.ripClock > 0.55) { FSH.ripClock = 0; FSH.rip.push({ t: 0, x: bm.Q.x }); }
    for (let i = FSH.rip.length - 1; i >= 0; i--) { FSH.rip[i].t += dt; if (FSH.rip[i].t > 1) FSH.rip.splice(i, 1); }
    if (!RM && Math.random() < dt * 0.9) FSH.bubbles.push({ x: F.x - 24 * FSH.fish.s + (Math.random() - 0.5) * 6, y: F.y - 6, r: 2 + Math.random() * 2.6, v: 26 + Math.random() * 18, p: Math.random() * 6 });
    for (let i = FSH.bubbles.length - 1; i >= 0; i--) { const b = FSH.bubbles[i]; b.y -= b.v * dt; b.x += Math.sin(b.p + b.y * 0.05) * 0.25; if (b.y < FG.ys + 2) FSH.bubbles.splice(i, 1); }
  }
  function drawFish(x, y, s, t, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const wag = Math.sin(t * 7 + (o.ph || 0)) * 0.22;
    // 꼬리 (왼쪽을 보고 있어서 꼬리는 오른쪽)
    ctx.save(); ctx.translate(22, 0); ctx.rotate(wag);
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(14, -10, 28, -17); ctx.quadraticCurveTo(22, 0, 28, 17); ctx.quadraticCurveTo(14, 10, -2, 0); ctx.closePath();
    ctx.fillStyle = o.tail || '#f59e0b'; ctx.fill(); ctx.restore();
    // 몸통
    const g = ctx.createLinearGradient(0, -16, 0, 16);
    g.addColorStop(0, o.top || '#fdba74'); g.addColorStop(0.55, o.mid || '#fb923c'); g.addColorStop(1, o.bot || '#ea580c');
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 16.5, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = o.line || 'rgba(124,45,18,.8)'; ctx.stroke();
    // 줄무늬 · 지느러미 · 눈
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.ellipse(-2, 0, 3, 13, 0.08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 0, 2.4, 10.5, 0.05, 0, TAU); ctx.fill();
    ctx.fillStyle = o.fin || '#f97316';
    ctx.beginPath(); ctx.moveTo(-6, -15); ctx.quadraticCurveTo(2, -26, 12, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-17, -3, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-18, -3, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawFishScene(dt, t) {
    const g = FG, ent = EASE.outCubic(clamp(sceneT / 0.7, 0, 1));
    drawBG();
    const F = FSH.fish, gh = fishGhost(F), bm = fishBeam(FSH.qv), E = bm.E;
    // 탱크 (유리) + 물
    ctx.save();
    ctx.globalAlpha *= ent;
    const tankW = g.x1 - g.x0;
    ctx.save();
    rr(g.x0, g.ys - 0, tankW, g.yb - g.ys + 8, 12); ctx.clip();
    const gw = ctx.createLinearGradient(0, g.ys, 0, g.yb);
    gw.addColorStop(0, 'rgba(56,150,230,.55)'); gw.addColorStop(0.7, 'rgba(20,84,160,.75)'); gw.addColorStop(1, 'rgba(10,46,98,.9)');
    ctx.fillStyle = gw; ctx.fillRect(g.x0, g.ys, tankW, g.yb - g.ys + 8);
    // 모래
    ctx.fillStyle = 'rgba(214,190,140,.55)'; ctx.fillRect(g.x0, g.yb - 14, tankW, 24);
    ctx.fillStyle = 'rgba(160,135,90,.5)';
    for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.arc(g.x0 + ((i * 41.3) % tankW), g.yb - 8 + ((i * 7) % 8), 2, 0, TAU); ctx.fill(); }
    // 빛무늬
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = 'rgba(160,215,255,' + (0.06 + 0.02 * Math.sin(t + i)) + ')'; ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      for (let x = g.x0; x <= g.x1; x += 10) { const yy = g.ys + 30 + i * 44 + (RM ? 0 : Math.sin(x * 0.02 + t * 0.9 + i * 1.7) * 6); x > g.x0 ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    ctx.restore();
    // 수면
    ctx.save(); rr(g.x0, g.rimY, tankW, g.yb - g.rimY + 8, 12); ctx.clip();
    ctx.strokeStyle = 'rgba(200,236,255,.9)'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let x = g.x0; x <= g.x1 + 6; x += 6) { const yy = g.ys + (RM ? 0 : Math.sin(x * 0.04 + t * 1.8) * 1.3); x > g.x0 ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
    ctx.stroke(); ctx.restore();
    // 유리 테두리
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(190,225,255,.55)'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(g.x0, g.rimY); ctx.lineTo(g.x0, g.yb); ctx.quadraticCurveTo(g.x0, g.yb + 8, g.x0 + 12, g.yb + 8); ctx.lineTo(g.x1 - 12, g.yb + 8); ctx.quadraticCurveTo(g.x1, g.yb + 8, g.x1, g.yb); ctx.lineTo(g.x1, g.rimY); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.moveTo(g.x0 + 8, g.rimY + 10); ctx.lineTo(g.x0 + 8, g.yb - 14); ctx.stroke();
    ctx.restore();

    // 물결(빛이 닿는 곳)
    FSH.rip.forEach((r) => {
      const k = r.t, ctxA = (1 - k) * 0.5;
      ctx.save(); ctx.strokeStyle = 'rgba(210,240,255,' + ctxA.toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, g.ys + 1, 8 + k * 44, 2 + k * 7, 0, 0, TAU); ctx.stroke(); ctx.restore();
    });
    // 방울
    ctx.save(); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(220,240,255,.7)';
    FSH.bubbles.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); });
    ctx.restore();

    // 눈에 보이는 물고기(상)와 실제 물고기
    const hitGlow = clamp(FSH.hitT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha *= ent;
    // 눈 → 눈에 보이는 위치 : 곧은 시선 (점선)
    dashed(E.x, E.y, gh.x, gh.y, 'rgba(255,255,255,.55)', 1.8, [7, 7]);
    // 실제 빛의 길 (물고기 → 수면 → 눈) 은 명중 후에 강조
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= 0.5 * ent;
    drawFish(gh.x, gh.y, 1, t, { ph: 1.3 });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; ctx.globalAlpha *= ent;
    ctx.beginPath(); ctx.ellipse(gh.x, gh.y, 40, 26, 0, 0, TAU); ctx.stroke(); ctx.restore();
    pill('눈에 보이는 위치', gh.x, gh.y - 40 * FS, { color: '#e2e8f0', size: 12.5, alpha: ent });
    // 실제 물고기
    ctx.save(); ctx.globalAlpha *= ent;
    if (hitGlow > 0) glowDot(F.x, F.y, 60, '#fde047', 0.7 * hitGlow);
    drawFish(F.x, F.y, 1 + 0.12 * hitGlow, t, {});
    ctx.restore();
    pill('실제 위치', F.x, F.y + 38 * FS, { color: '#fdba74', size: 12.5, alpha: ent });

    // 레이저 빛줄기
    const bw = 3;
    const T0 = { x: E.x + bm.d.x * 78, y: E.y + bm.d.y * 78 };
    beam([T0, bm.Q], { color: COL.laser, width: bw, alpha: ent });
    beam([bm.Q, bm.end], { color: COL.laser, width: bw, alpha: ent });
    const P = makePath([T0, bm.Q, bm.end], [1, 1 / N_WATER]);
    FSH.pu.update(dt, P, ent > 0.9);
    FSH.pu.draw(P, COL.laser, 3);
    glowDot(bm.Q.x, bm.Q.y, 22, COL.laser, 0.6 * ent);
    if (ent > 0.9) sparkAt(dt, bm.Q.x, bm.Q.y - 2, '#d7ecff', 0.12, 2.4);
    // 눈 + 레이저
    ctx.save(); ctx.globalAlpha *= ent;
    drawEye(E.x, E.y - 30 * FS, PHONE ? 0.55 : 0.62, bm.d.x * 40, bm.d.y * 40, { pupil: 8 });
    laserDevice(E.x + bm.d.x * 40, E.y + bm.d.y * 40, Math.atan2(bm.d.y, bm.d.x), { lift: FSH.lift });
    ctx.restore();
    pill('눈과 레이저', E.x, E.y - 64 * FS, { color: '#7dd3fc', size: 12.5, alpha: ent });
    if (FSH.near && !FSH.counted) pill('아슬아슬! 눈에 보이는 위치를 겨냥해 보세요', clamp(bm.Q.x + 40, 150, W - 150), g.rimY - 28 * FS, { color: '#fbbf24', size: 13, fit: true });
    if (hitGlow > 0.6 || FSH.counted) {
      // 명중하면 실제 빛이 간 길과 눈에 보이는 위치의 차이를 알려 줘요
      pill('빛은 물 표면에서 꺾여요', bm.Q.x, g.ys - 30 * FS, { color: '#fde68a', size: 13, fit: true });
    }
    if (isNew('fish')) newTag(g.x1 - 118, g.rimY - 4, 110, 28);
  }

  /* =========================================================
     장면 ④ 거울 퍼즐 : 거울을 돌려 레이저로 목표 맞히기 (판 3개)
     모든 광선은 반사 법칙으로 계산: d' = 2(d·t)t − d  (t = 거울면 방향)
     ========================================================= */
  const BW = 800, BH = 520;
  const BOARDS = [
    { name: '판 1 · 거울 1개', emit: { x: 70, y: 430, a: 0 }, target: { x: 674, y: 139, r: 26 },
      walls: [{ x: 250, y: 120, w: 70, h: 200 }],
      mirrors: [{ x: 430, y: 430, a0: 90, len: 96 }] },
    { name: '판 2 · 거울 2개 (잠망경)', emit: { x: 70, y: 440, a: 0 }, target: { x: 700, y: 120, r: 26 },
      walls: [{ x: 345, y: 235, w: 390, h: 56 }],
      mirrors: [{ x: 200, y: 440, a0: 90, len: 96 }, { x: 390, y: 110, a0: 90, len: 96 }] },
    { name: '판 3 · 거울 3개', emit: { x: 60, y: 120, a: 8 }, target: { x: 560, y: 150, r: 26 },
      walls: [{ x: 375, y: 150, w: 40, h: 150 }, { x: 585, y: 375, w: 48, h: 150 }],
      mirrors: [{ x: 260, y: 148, a0: 90, len: 96 }, { x: 215, y: 370, a0: 90, len: 96 }, { x: 520, y: 465, a0: 90, len: 96 }] },
  ];
  function rayAABB(o, d, r) {
    let t0 = 0, t1 = 1e9;
    for (const ax of ['x', 'y']) {
      const lo = ax === 'x' ? r.x : r.y, hi = lo + (ax === 'x' ? r.w : r.h);
      if (Math.abs(d[ax]) < 1e-9) { if (o[ax] < lo || o[ax] > hi) return null; }
      else {
        let a = (lo - o[ax]) / d[ax], b = (hi - o[ax]) / d[ax];
        if (a > b) { const tmp = a; a = b; b = tmp; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) return null;
      }
    }
    return t0 > 1e-6 ? t0 : null;
  }
  function raySeg(o, d, a, b) {
    const ex = b.x - a.x, ey = b.y - a.y, den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den, u = ((a.x - o.x) * d.y - (a.y - o.y) * d.x) / den;
    return t > 1e-6 && u >= 0 && u <= 1 ? { t, u } : null;
  }
  function rayCircle(o, d, c, r) {
    const fx = o.x - c.x, fy = o.y - c.y, b = fx * d.x + fy * d.y, cc = fx * fx + fy * fy - r * r, disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 1e-6 ? t : null;
  }
  function pzTrace(B, angs) {
    const pts = [{ x: B.emit.x, y: B.emit.y }], hits = [];
    let o = { x: B.emit.x, y: B.emit.y }, d = { x: Math.cos(B.emit.a * DEG), y: Math.sin(B.emit.a * DEG) }, skip = -1, end = 'edge', wallAt = null;
    for (let k = 0; k <= 8; k++) {
      const tx = d.x > 0 ? (BW - o.x) / d.x : d.x < 0 ? -o.x / d.x : 1e9, ty = d.y > 0 ? (BH - o.y) / d.y : d.y < 0 ? -o.y / d.y : 1e9;
      let best = { t: Math.min(tx, ty), kind: 'edge' };
      B.walls.forEach((w) => { const t = rayAABB(o, d, w); if (t != null && t < best.t) best = { t, kind: 'wall' }; });
      B.mirrors.forEach((m, i) => {
        if (i === skip) return;
        const a = angs[i] * DEG, hx = Math.cos(a) * m.len / 2, hy = Math.sin(a) * m.len / 2;
        const r = raySeg(o, d, { x: m.x - hx, y: m.y - hy }, { x: m.x + hx, y: m.y + hy });
        if (r && r.t < best.t) best = { t: r.t, kind: 'mirror', i, a };
      });
      const tt = rayCircle(o, d, B.target, B.target.r);
      if (tt != null && tt < best.t) best = { t: tt, kind: 'target' };
      if (k > 0) { const te = rayCircle(o, d, B.emit, 19); if (te != null && te < best.t) best = { t: te, kind: 'wall' }; }
      const p = { x: o.x + d.x * best.t, y: o.y + d.y * best.t };
      pts.push(p);
      if (best.kind === 'mirror') {
        const tv = { x: Math.cos(best.a), y: Math.sin(best.a) }, dt2 = d.x * tv.x + d.y * tv.y;
        const dn = { x: 2 * dt2 * tv.x - d.x, y: 2 * dt2 * tv.y - d.y };
        hits.push({ i: best.i, p, din: d, dout: dn, tv });
        d = dn; o = p; skip = best.i;
      } else { end = best.kind; wallAt = p; break; }
    }
    return { pts, end, hits, bounces: hits.length, wallAt };
  }

  const PZ = {
    bi: 0, ang: [], angv: [], lift: [0, 0, 0], drag: -1, sel: -1, selT: 0, solved: [false, false, false],
    hitT: 0, trace: null, enter: 0, adv: 0, dragged: false, pu: new Pulses(0.38, 600), hit: false, celebrated: false,
    s: PHONE ? 520 / 800 : 1, ox: 0, oy: PHONE ? (H - 520 * 520 / 800) / 2 : 0, last: [],
  };
  const pzB = () => BOARDS[PZ.bi];
  const pzToBoard = (p) => ({ x: (p.x - PZ.ox) / PZ.s, y: (p.y - PZ.oy) / PZ.s });
  const pzToView = (x, y) => ({ x: PZ.ox + x * PZ.s, y: PZ.oy + y * PZ.s });
  function pzLoad(i, instant) {
    PZ.bi = clamp(i, 0, BOARDS.length - 1);
    const B = pzB();
    PZ.ang = B.mirrors.map((m) => m.a0); PZ.angv = PZ.ang.slice(); PZ.lift = B.mirrors.map(() => 0);
    PZ.drag = -1; PZ.sel = -1; PZ.hitT = 0; PZ.hit = false; PZ.celebrated = PZ.solved[PZ.bi]; PZ.adv = 0;
    PZ.enter = instant ? 1 : 0; PZ.last = PZ.ang.slice();
    PZ.pu.reset();
    syncBoardBtns();
  }
  const angDiff = (a, b) => ((a - b) % 180 + 270) % 180 - 90;
  function stepPuzzle(dt) {
    const B = pzB();
    PZ.enter = Math.min(1, PZ.enter + dt / 0.7);
    for (let i = 0; i < PZ.ang.length; i++) {
      PZ.angv[i] += angDiff(PZ.ang[i], PZ.angv[i]) * (RM ? 1 : 1 - Math.exp(-18 * dt));
      PZ.lift[i] = approach(PZ.lift[i], PZ.drag === i ? 1 : 0, dt, 14);
    }
    PZ.selT = Math.max(0, PZ.selT - dt);
    PZ.trace = pzTrace(B, PZ.angv);
    PZ.hit = PZ.trace.end === 'target';
    const settled = PZ.ang.every((a, i) => Math.abs(angDiff(PZ.angv[i], a)) < 0.7);
    if (PZ.hit && settled && PZ.drag < 0) PZ.hitT += dt; else PZ.hitT = Math.max(0, PZ.hitT - dt * 3);
    if (PZ.hitT > 0.4 && !PZ.solved[PZ.bi]) {
      PZ.solved[PZ.bi] = true; PZ.celebrated = true; Sound.success();
      const tp = pzToView(B.target.x, B.target.y);
      celebrate(tp.x, tp.y, 40 * PZ.s + 8);
      badge(PZ.bi < 2 ? '성공! 다음 판으로 가요' : '모든 판 성공!', W / 2, 34 * FS, COL.good, 2.6);
      if (scene === 'puzzle' && PZ.bi < 2) PZ.adv = NOW() + 2.0;
      syncBoardBtns();
    }
    if (PZ.adv && NOW() > PZ.adv) { PZ.adv = 0; if (PZ.bi < 2 && PZ.solved[PZ.bi]) pzLoad(PZ.bi + 1); }
  }

  function drawWall(w, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,10,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    const g = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
    g.addColorStop(0, '#566075'); g.addColorStop(1, '#2b3243');
    ctx.fillStyle = g; rr(w.x, w.y, w.w, w.h, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(190,205,240,.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rr(w.x, w.y, w.w, w.h, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 6;
    for (let k = -w.h; k < w.w + w.h; k += 22) { ctx.beginPath(); ctx.moveTo(w.x + k, w.y); ctx.lineTo(w.x + k - w.h, w.y + w.h); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function drawTargetPz(T, hit, t, a) {
    ctx.save(); ctx.globalAlpha *= a;
    if (hit) glowDot(T.x, T.y, 70, '#4ade80', 0.7);
    const rings = [[T.r, hit ? '#16a34a' : '#e11d48'], [T.r * 0.68, '#f8fafc'], [T.r * 0.38, hit ? '#16a34a' : '#e11d48']];
    ctx.shadowColor = 'rgba(0,0,10,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rings.forEach(([r, c], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, TAU); ctx.fill(); if (i === 0) ctx.shadowColor = 'transparent'; });
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(T.x, T.y, T.r, 0, TAU); ctx.stroke();
    ctx.restore();
    if (!hit) D.ring(T.x, T.y, T.r + 6, t, { color: '#fb7185', speed: 0.9 });
  }
  function drawMirrorPz(m, ang, i, t, a) {
    const hl = m.len / 2, lift = PZ.lift[i], sel = PZ.sel === i, hk = PHONE ? 1.45 : 1;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(m.x, m.y - 4 * lift);
    // 돌릴 수 있다는 표시 (점선 원)
    ctx.save();
    ctx.strokeStyle = sel ? 'rgba(251,191,36,.75)' : 'rgba(180,200,245,.28)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.arc(0, 0, hl + 12, 0, TAU); ctx.stroke(); ctx.restore();
    if (sel || lift > 0.05) {                                        // 5° 눈금
      ctx.save(); ctx.strokeStyle = 'rgba(226,232,255,.5)'; ctx.lineWidth = 1.2;
      for (let d = 0; d < 360; d += 15) { const c = Math.cos(d * DEG), s = Math.sin(d * DEG); ctx.beginPath(); ctx.moveTo((hl + 12) * c, (hl + 12) * s); ctx.lineTo((hl + 19) * c, (hl + 19) * s); ctx.stroke(); }
      ctx.restore();
    }
    ctx.rotate(ang * DEG);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,10,' + (0.5 + 0.2 * lift) + ')'; ctx.shadowBlur = 10 + 10 * lift; ctx.shadowOffsetY = 4 + 6 * lift;
    ctx.scale(1, 1 + 0.25 * lift);
    const g = ctx.createLinearGradient(0, -5, 0, 5);
    g.addColorStop(0, '#f8fbff'); g.addColorStop(0.5, '#aebddc'); g.addColorStop(1, '#f1f5ff');
    ctx.fillStyle = g; rr(-hl, -4.5, m.len, 9, 4.5); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,41,72,.65)'; ctx.lineWidth = 1.2; rr(-hl, -4.5, m.len, 9, 4.5); ctx.stroke();
    // 돌릴 수 있는 끝(손잡이)
    [-hl, hl].forEach((x) => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, 0, (8.5 + 1.5 * lift) * hk, 0, TAU); ctx.fill();
      ctx.lineWidth = 3 * (PHONE ? 1.3 : 1); ctx.strokeStyle = sel ? '#fbbf24' : COL.accent; ctx.stroke();
    });
    ctx.restore();
  }
  function drawEmitter(E, t, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#1b2440'; rr(E.x - 22, E.y + 12, 44, 22, 6); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= a;
    laserDevice(E.x, E.y, E.a * DEG, {});
    ctx.restore();
  }

  function drawPuzzle(dt, t) {
    const B = pzB(), tr = PZ.trace || pzTrace(B, PZ.angv), e = EASE.outCubic(PZ.enter);
    drawBG();
    ctx.save();
    ctx.translate(PZ.ox, PZ.oy); ctx.scale(PZ.s, PZ.s);
    if (PHONE) { ctx.strokeStyle = 'rgba(148,163,205,.25)'; ctx.lineWidth = 2; rr(1, 1, BW - 2, BH - 2, 18); ctx.stroke(); }
    B.walls.forEach((w, k) => { ctx.save(); ctx.translate(0, (1 - EASE.outCubic(clamp(PZ.enter * 1.4 - k * 0.15, 0, 1))) * -30); drawWall(w, e); ctx.restore(); });
    drawTargetPz(B.target, PZ.hit && PZ.hitT > 0.05 || PZ.solved[PZ.bi] && PZ.hit, t, e);
    // 빛줄기
    const pts = tr.pts, bw = 3.1 / Math.max(0.8, PZ.s * 1.2);
    beam(pts, { color: COL.laser, width: bw, alpha: e });
    const P = makePath(pts);
    PZ.pu.update(dt, P, e > 0.8);
    PZ.pu.draw(P, COL.laser, 3 / Math.max(0.8, PZ.s * 1.2));
    for (let k = 1; k < pts.length; k++) {
      const q = pts[k], hitMirror = k <= tr.hits.length;
      if (hitMirror) { glowDot(q.x, q.y, 20, '#ffd1d5', 0.55); }
      else if (tr.end === 'wall') glowDot(q.x, q.y, 24 + (RM ? 0 : Math.sin(t * 20) * 3), '#fb923c', 0.8);
    }
    // 눌러 돌리는 거울: 법선과 입사각·반사각 (잠깐 보여 줘요)
    const selHit = PZ.sel >= 0 && (PZ.selT > 0 || PZ.drag >= 0) ? tr.hits.find((h) => h.i === PZ.sel) : null;
    if (selHit) {
      const h = selHit, nrm = { x: -h.tv.y, y: h.tv.x };
      const toIn = { x: -h.din.x, y: -h.din.y };
      if (nrm.x * toIn.x + nrm.y * toIn.y < 0) { nrm.x = -nrm.x; nrm.y = -nrm.y; }
      dashed(h.p.x - nrm.x * 46, h.p.y - nrm.y * 46, h.p.x + nrm.x * 62, h.p.y + nrm.y * 62, 'rgba(255,255,255,.8)', 1.6, [5, 5]);
      const nA = Math.atan2(nrm.y, nrm.x), aIn = Math.atan2(toIn.y, toIn.x), aOut = Math.atan2(h.dout.y, h.dout.x);
      const adj = (a) => { let d = a - nA; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return nA + d; };
      const al = clamp(PZ.drag >= 0 ? 1 : PZ.selT / 0.6, 0, 1);
      ctx.save(); ctx.globalAlpha *= al;
      angleArc(h.p.x, h.p.y, 38, nA, adj(aIn), COL.inc, 0.25); angleArc(h.p.x, h.p.y, 48, nA, adj(aOut), COL.ref, 0.2);
      ctx.restore();
      const ang = Math.round(Math.abs(adj(aIn) - nA) / DEG);
      const lp = pzToView(h.p.x + nrm.x * 90, h.p.y + nrm.y * 90);
      PZ.label = { x: lp.x, y: lp.y, ang, al };
    } else PZ.label = null;
    B.mirrors.forEach((m, i) => drawMirrorPz(m, PZ.angv[i], i, t, e));
    drawEmitter(B.emit, t, e);
    ctx.restore();
    // 글씨 (확대·축소와 상관없이 읽기 좋게)
    const tp = pzToView(B.target.x, B.target.y - B.target.r - 20), ep = pzToView(B.emit.x, B.emit.y + 38);
    pill('목표', tp.x, tp.y, { color: '#fb7185', size: 12.5, alpha: e, fit: true });
    pill('레이저', ep.x, ep.y + (PHONE ? 6 : 8), { color: '#cbd5e1', size: 12.5, alpha: e, fit: true });
    if (PZ.label) {
      const q = PZ.label;
      pill('입사각 = 반사각 = ' + q.ang + '°', clamp(q.x, 100, W - 100), clamp(q.y, 30, H - 20), { color: COL.inc, size: 13.5, alpha: q.al, fit: true });
    }
    pill(B.name, 14, (PHONE ? PZ.oy - 2 : 24), { color: '#e2e8f0', size: 14, align: 'left', alpha: e });
    if (PZ.solved[PZ.bi]) { const bp = pzToView(B.target.x, B.target.y); pill('✔ 성공!', bp.x, bp.y + B.target.r * PZ.s + 22 * FS, { solid: true, color: '#16a34a', size: 13.5, fit: true }); }
    if (!PZ.dragged && e > 0.9 && PZ.bi === 0 && !PZ.solved[0]) {
      const m = B.mirrors[0], mp = pzToView(m.x, m.y), a = 0.5 + 0.4 * Math.sin(t * 4);
      txt('거울 끝을 끌어 돌려 보세요', mp.x, mp.y + (60 * PZ.s + 18) * 1, { size: 13, color: '#fde68a', alpha: a, fit: true });
    }
    if (isNew('puzzle')) newTag(W - 142, 8, 110, 28);
  }
  function pzDown(p) {
    const b = pzToBoard(p), B = pzB();
    let best = -1, bd = 1e9;
    B.mirrors.forEach((m, i) => {
      const a = PZ.angv[i] * DEG, hx = Math.cos(a) * m.len / 2, hy = Math.sin(a) * m.len / 2;
      const d = distToSeg(b, { x: m.x - hx, y: m.y - hy }, { x: m.x + hx, y: m.y + hy });
      if (d < bd) { bd = d; best = i; }
    });
    if (best < 0 || bd > 38 / PZ.s * (PHONE ? 0.9 : 1)) return false;
    PZ.drag = best; PZ.sel = best; PZ.selT = 1.2; PZ.dragged = true; Sound.click(); hideHint();
    pzMove(p);
    return true;
  }
  function pzMove(p) {
    if (PZ.drag < 0) return;
    const b = pzToBoard(p), m = pzB().mirrors[PZ.drag];
    const dx = b.x - m.x, dy = b.y - m.y;
    if (Math.hypot(dx, dy) < 16) return;
    let deg = Math.atan2(dy, dx) / DEG;
    deg = ((Math.round(deg / 5) * 5) % 180 + 180) % 180;
    if (deg !== PZ.ang[PZ.drag]) { PZ.ang[PZ.drag] = deg; Sound.tick(); }
    PZ.selT = 1.2;
  }
  function pzUp() { PZ.selT = 0.9; PZ.drag = -1; }
  function pzResetMirrors() { const B = pzB(); PZ.ang = B.mirrors.map((m) => m.a0); PZ.hitT = 0; }

  /* =========================================================
     장면 관리 · 조작 · 측정값
     ========================================================= */
  const trans = { t: 1 };
  const SCENE_LABEL = {
    see: '🔦 어두운 방 <small>(전등 → 사과 → 눈)</small>',
    reflect: '🪞 레이저와 거울 <small>(위에서 본 모습)</small>',
    surface: '📄 거울과 종이에서의 반사',
    refract: '💧 공기에서 물·유리로 <small>(옆에서 본 모습)</small>',
    fish: '🐟 물속 물고기 <small>(옆에서 본 모습)</small>',
    puzzle: '🧩 거울 퍼즐 <small>(위에서 본 모습)</small>',
  };
  const slBind = {
    inc: SciSim.bindRange($('#slInc'), $('#outInc'), (v) => v + '°', (v) => setRFAngle(sgn(RF.a) * v, true)),
    inc2: SciSim.bindRange($('#slInc2'), $('#outInc2'), (v) => v + '°', (v) => setRFAngle(sgn(RF.a) * v, true)),
    inc3: SciSim.bindRange($('#slInc3'), $('#outInc3'), (v) => v + '°', (v) => setRRAngle((RR.a === 0 ? RR.side : sgn(RR.a)) * v, true)),
  };
  function syncSliders() {
    slBind.inc.set(Math.abs(RF.a)); slBind.inc2.set(clamp(Math.abs(RF.a), 10, 50)); slBind.inc3.set(Math.abs(RR.a));
  }
  function syncBoardBtns() {
    $$('#boardGrid .mode-btn').forEach((b) => {
      const i = +b.dataset.board, free = !!(game && game.free);
      const open = free || i === 0 || PZ.solved[i - 1] || PZ.solved[i];
      b.disabled = !open;
      b.classList.toggle('on', PZ.bi === i);
      b.innerHTML = '판 ' + (i + 1) + (PZ.solved[i] ? ' <span class="ok">✔</span>' : '');
    });
  }
  function syncUI() {
    const free = !!(game && game.free);
    $$('#ctrlCard .grp').forEach((g) => {
      const id = g.id.slice(2);
      g.classList.toggle('off', id === 'free' ? !free : id !== scene);
    });
    $('#sceneLabel').innerHTML = SCENE_LABEL[scene] || '';
    $$('#freeGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.free === scene));
    $$('#surfGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.surf === RF.mode));
    $$('#medGrid .mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.med === RR.med));
    syncSliders(); syncBoardBtns();
  }
  let scene = 'see', sceneT = 0;
  function setScene(name, fresh) {
    if (!SCENE_LABEL[name]) return;
    if (scene !== name || fresh) { sceneT = 0; trans.t = 0; hideHint(); }
    scene = name;
    if (name === 'reflect' || name === 'surface') setRFAngle(RF.a, false);
    if (name === 'puzzle') { PZ.pu.reset(); }
    if (name === 'fish') { FSH.pu.reset(); }
    if (name === 'see') { SEE.pu.LH.reset(); SEE.pu.HE.reset(); SEE.pu.LE.reset(); }
    RF.pu.reset(); RR.pu.reset();
    syncUI();
  }

  $('#seeClear').addEventListener('click', () => { Sound.click(); seeReset(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (scene === 'see') { seeReset(); SEE.lampWant = false; SEE.bd.x = SEEP.home.x; SEE.bd.y = SEEP.home.y; }
    else if (scene === 'reflect') setRFAngle(-30, false);
    else if (scene === 'surface') { RF.mode = 'mirror'; setRFAngle(-35, false); syncUI(); }
    else if (scene === 'refract') { RR.med = 'water'; setRRAngle(-40, false); syncUI(); }
    else if (scene === 'fish') { FSH.qx = FG.x0 + 0.12 * (FG.x1 - FG.x0); moveFish(FSH.idx); }
    else pzResetMirrors();
  });
  $$('#surfGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); RF.mode = b.dataset.surf; syncUI(); }));
  $$('#medGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); RR.med = b.dataset.med; syncUI(); }));
  $$('#boardGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); pzLoad(+b.dataset.board); }));
  $('#pzReset').addEventListener('click', () => { Sound.click(); pzResetMirrors(); });
  $('#fishNext').addEventListener('click', () => { Sound.click(); moveFish(FSH.idx + 1); });
  $$('#freeGrid .mode-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.free, true); }));

  /* ---------- 입력 ---------- */
  let grabbing = false;
  const setCursor = (c) => { view.canvas.style.cursor = c; };
  function pointerHit(p) {
    if (scene === 'see') return !!(seeNodeAt(p) || (SEE.boardOn && Math.abs(p.x - SEE.bd.x) <= SEE.bd.w / 2 + 16 && Math.abs(p.y - SEE.bd.y) <= SEE.bd.h / 2 + 10));
    if (scene === 'reflect' || scene === 'surface') return rfHitDevice(p);
    if (scene === 'refract') return rrHit(p);
    if (scene === 'fish') return p.y > FG.py + 12;
    if (scene === 'puzzle') {
      const b = pzToBoard(p);
      return pzB().mirrors.some((m, i) => { const a = PZ.angv[i] * DEG, hx = Math.cos(a) * m.len / 2, hy = Math.sin(a) * m.len / 2; return distToSeg(b, { x: m.x - hx, y: m.y - hy }, { x: m.x + hx, y: m.y + hy }) <= 38 / PZ.s; });
    }
    return false;
  }
  SciSim.pointer(view, {
    hover(p) { return pointerHit(p) ? (scene === 'fish' ? 'crosshair' : 'grab') : null; },
    down(p) {
      let ok = false;
      if (scene === 'see') ok = seeDown(p);
      else if (scene === 'reflect' || scene === 'surface') {
        if (rfHitDevice(p)) { RF.drag = true; RF.dragged = true; setRFAngle(rfAngleFrom(p), true); ok = true; hideHint(); }
      } else if (scene === 'refract') {
        if (rrHit(p)) { RR.drag = true; RR.dragged = true; setRRAngle(rfAngleFromRR(p), true); ok = true; hideHint(); }
      } else if (scene === 'fish') {
        if (p.y > FG.py + 12) { FSH.drag = true; FSH.dragged = true; setFishAim(p); ok = true; hideHint(); }
      } else if (scene === 'puzzle') ok = pzDown(p);
      if (ok) setCursor('grabbing');
      return ok;
    },
    move(p) {
      if (scene === 'see') seeMove(p);
      else if (scene === 'reflect' || scene === 'surface') setRFAngle(rfAngleFrom(p), true);
      else if (scene === 'refract') setRRAngle(rfAngleFromRR(p), true);
      else if (scene === 'fish') setFishAim(p);
      else if (scene === 'puzzle') pzMove(p);
    },
    up(p) {
      if (scene === 'see') seeUp(p);
      RF.drag = false; RR.drag = false; FSH.drag = false;
      if (scene === 'puzzle') pzUp();
      setCursor('default');
    },
  });
  function rfAngleFromRR(p) {
    const dx = p.x - RRG.ox, dy = RRG.oy - p.y;
    return Math.atan2(dx, Math.max(dy, 1)) / DEG;
  }
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
    const k = 'r' + i;
    const s = label + '|' + html;
    if (roCache[k] === s) return;
    roCache[k] = s;
    $('#rL' + i).textContent = label; $('#rV' + i).innerHTML = html;
  }
  function updateReadouts() {
    const amber = (s) => '<span style="color:#b45309">' + s + '</span>', teal = (s) => '<span style="color:#0f766e">' + s + '</span>', vio = (s) => '<span style="color:#6d28d9">' + s + '</span>';
    const sm = (s) => '<span style="font-size:' + (PHONE ? 13 : 15) + 'px;white-space:normal;line-height:1.15;display:inline-block;vertical-align:middle">' + s + '</span>';
    if (scene === 'see') {
      const S = SEE;
      ro(1, '광원(전등)', S.lampWant ? '켜짐 💡' : '꺼짐');
      ro(2, '빛의 경로', S.built.LA && S.built.AE ? sm('전등→사과→눈') : S.built.LA ? sm('전등→사과…') : '—');
      ro(3, '사과가 보이나요?', S.seen > 0.5 ? '보여요 👀' : '안 보여요');
    } else if (scene === 'reflect') {
      const a = Math.abs(RF.a);
      ro(1, '입사각', amber(a + '°')); ro(2, '반사각', teal(a + '°'));
      ro(3, '기록한 입사각', sm((RF.rec[30] ? '✅30°' : '⬜30°') + ' ' + (RF.rec[50] ? '✅50°' : '⬜50°')));
    } else if (scene === 'surface') {
      ro(1, '입사각', amber(Math.abs(RF.a) + '°'));
      ro(2, '반사하는 면', sm(SURF_LABEL[RF.mode]));
      ro(3, '반사된 빛', sm(RF.modeT > 0.5 ? '여러 방향(난반사)' : '나란히(정반사)'));
    } else if (scene === 'refract') {
      const st = refractNow(), ti = Math.round(st.thI), tt = Math.round(st.thT);
      ro(1, '입사각 (공기)', amber(ti + '°'));
      ro(2, '굴절각 (' + (RR.med === 'water' ? '물' : '유리') + ')', vio(tt + '°'));
      ro(3, '비교', ti === 0 ? sm('꺾이지 않아요') : sm('굴절각 &lt; 입사각'));
    } else if (scene === 'fish') {
      const bm = fishBeam(FSH.qv), ti = Math.round(Math.atan2(Math.abs(bm.d.x), bm.d.y) / DEG), tt = Math.round(Math.atan2(Math.abs(bm.dT.x), bm.dT.y) / DEG);
      ro(1, '명중한 물고기', FSH.hits + '<small> / 2마리</small>');
      ro(2, '조준 결과', sm(FSH.hitT > 0.2 ? '명중! 🎯' : FSH.near ? '아슬아슬…' : '빗나감'));
      ro(3, '수면에서 입사각 → 굴절각', sm(ti + '° → ' + tt + '°'));
    } else if (scene === 'puzzle') {
      const tr = PZ.trace;
      ro(1, '판', (PZ.bi + 1) + '<small> / 3</small>');
      ro(2, '빛이 반사된 횟수', (tr ? tr.bounces : 0) + '<small>번</small>');
      ro(3, '목표', PZ.solved[PZ.bi] ? '명중 ✅' : (PZ.hit ? '거의 다…' : '아직'));
    }
  }

  /* =========================================================
     퀴즈 그림 · 공책 그림 (SVG)
     ========================================================= */
  const SVGF = 'font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,Noto Sans KR,sans-serif"';
  const f1 = (v) => (Math.round(v * 10) / 10);
  const svgHead = (x, y, ux, uy, color, s) => {
    s = s || 9; const nx = -uy, ny = ux;
    return '<path d="M' + f1(x) + ' ' + f1(y) + ' L' + f1(x - ux * s * 1.6 + nx * s * 0.8) + ' ' + f1(y - uy * s * 1.6 + ny * s * 0.8) + ' L' + f1(x - ux * s * 1.6 - nx * s * 0.8) + ' ' + f1(y - uy * s * 1.6 - ny * s * 0.8) + ' Z" fill="' + color + '"/>';
  };
  const svgLine = (x1, y1, x2, y2, color, w, extra) => '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + color + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" ' + (extra || '') + '/>';
  const svgText = (x, y, s, size, color, anchor, w) => '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + (size || 13) + '" font-weight="' + (w || 800) + '" fill="' + (color || '#334155') + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  const svgRay = (x1, y1, x2, y2, color, w) => {                 // 화살표 광선
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    return svgLine(x1, y1, x2 - ux * 10, y2 - uy * 10, color, w || 4) + svgHead(x2, y2, ux, uy, color, (w || 4) * 1.6);
  };
  const svgArc = (cx, cy, r, a0, a1, color) => {                   // 각도는 화면 기준(도), 시계 방향으로 a0→a1
    const p = (a) => [cx + r * Math.cos(a * DEG), cy + r * Math.sin(a * DEG)];
    const s = p(a0), e = p(a1);
    return '<path d="M' + f1(s[0]) + ' ' + f1(s[1]) + ' A' + r + ' ' + r + ' 0 0 1 ' + f1(e[0]) + ' ' + f1(e[1]) + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round"/>';
  };
  const hatch = (x0, x1, y, n) => { let s = ''; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; s += svgLine(x, y, x - 9, y + 12, '#8ea2cf', 2); } return s; };

  /* 거울면과 60°를 이루는 빛 */
  const FIG_MIRROR60 = (() => {
    const O = { x: 150, y: 124 }, L = 98;
    const sx = O.x - L * Math.sin(30 * DEG), sy = O.y - L * Math.cos(30 * DEG), ex = O.x + L * Math.sin(30 * DEG);
    return '<svg viewBox="0 0 300 176" width="300" style="max-width:100%" role="img" aria-label="거울면과 60도를 이루며 들어오는 레이저 빛" ' + SVGF + '>' +
      '<rect width="300" height="176" rx="14" fill="#101a3b"/>' +
      '<rect x="36" y="' + O.y + '" width="228" height="9" rx="3" fill="#d6e0f6"/>' + hatch(46, 258, O.y + 9, 14) +
      svgLine(O.x, O.y, O.x, 24, '#ffffff', 1.8, 'stroke-dasharray="6 5"') + svgText(O.x + 4, 32, '법선', 12.5, '#cbd5e1', 'start') +
      svgRay(sx, sy, O.x, O.y, '#ff5a67', 4.2) + svgLine(O.x, O.y, ex, sy, '#ff5a67', 3, 'stroke-dasharray="6 6" opacity=".85"') +
      svgText(ex + 4, sy - 6, '반사 광선', 12.5, '#ffb3ba', 'middle') + svgText(sx - 2, sy - 6, '입사 광선', 12.5, '#ffb3ba', 'middle') +
      svgArc(O.x, O.y, 40, 180, 240, '#fbbf24') + svgText(O.x - 56, O.y - 20, '60°', 15, '#fbbf24', 'middle', 900) +
      '<path d="M' + (O.x + 12) + ' ' + O.y + ' L' + (O.x + 12) + ' ' + (O.y - 12) + ' L' + O.x + ' ' + (O.y - 12) + '" fill="none" stroke="#fff" stroke-width="1.5"/>' +
      svgText(O.x + 56, O.y - 22, '반사각 = ?', 15, '#5eead4', 'middle', 900) + '</svg>';
  })();

  /* 컵 속 빨대 : 눈에 들어오는 빛의 길과 눈이 느끼는 위치 (같은 스넬 모형으로 계산) */
  const FIG_STRAW = (() => {
    const ys = 92, E = { x: 296, y: 38 }, T = { x: 142, y: 170 }, n = N_WATER;
    let lo = T.x, hi = E.x;
    const f = (qx) => (E.x - qx) / Math.hypot(E.x - qx, E.y - ys) - n * (qx - T.x) / Math.hypot(qx - T.x, T.y - ys);
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    const Q = { x: (lo + hi) / 2, y: ys };
    const k = (T.x - E.x) / (Q.x - E.x), Tp = { x: T.x, y: E.y + k * (ys - E.y) };
    const S0 = { x: 96, y: 22 }, enterX = S0.x + (T.x - S0.x) * (ys - S0.y) / (T.y - S0.y);
    return '<svg viewBox="0 0 340 196" width="340" style="max-width:100%" role="img" aria-label="물이 든 컵에 빨대를 넣은 모습과 빛의 경로" ' + SVGF + '>' +
      '<rect width="340" height="196" rx="14" fill="#eef5ff"/>' +
      '<path d="M62 ' + ys + ' L72 182 Q74 188 82 188 L206 188 Q214 188 216 182 L226 ' + ys + ' Z" fill="#7fc0f0" opacity=".75"/>' +
      '<path d="M54 52 L68 182 Q70 190 80 190 L208 190 Q218 190 220 182 L234 52" fill="none" stroke="#94a3b8" stroke-width="3.5" stroke-linejoin="round"/>' +
      svgLine(48, ys, 240, ys, '#1d6fb8', 2.2, 'stroke-dasharray="5 4"') + svgText(262, ys + 5, '물 표면', 12.5, '#1d6fb8', 'start') +
      svgLine(S0.x, S0.y, enterX, ys, '#f59e0b', 7) +                                         // 물 밖의 빨대
      svgLine(enterX, ys, T.x, T.y, '#cbd5e1', 6, 'stroke-dasharray="3 7" opacity=".9"') +    // 실제 빨대(희미)
      svgLine(enterX, ys, Tp.x, Tp.y, '#f59e0b', 7, 'opacity=".55"') +                          // 눈에 보이는 빨대
      svgLine(T.x, T.y, Q.x, Q.y, '#e11d48', 3) + svgRay(Q.x, Q.y, E.x - 22 * (E.x - Q.x) / Math.hypot(E.x - Q.x, E.y - Q.y), E.y - 22 * (E.y - Q.y) / Math.hypot(E.x - Q.x, E.y - Q.y), '#e11d48', 3) +
      svgLine(Q.x, Q.y, Tp.x, Tp.y, '#e11d48', 2, 'stroke-dasharray="4 4" opacity=".8"') +
      '<circle cx="' + T.x + '" cy="' + T.y + '" r="5" fill="#e11d48"/>' + svgText(T.x + 10, T.y + 18, '빨대 끝', 12.5, '#9f1239', 'start') +
      '<circle cx="' + f1(Tp.x) + '" cy="' + f1(Tp.y) + '" r="4.5" fill="#fff" stroke="#e11d48" stroke-width="2"/>' + svgText(Tp.x + 10, Tp.y + 4, '눈에 보이는 끝', 12.5, '#9f1239', 'start') +
      '<text x="' + E.x + '" y="' + (E.y + 6) + '" font-size="26" text-anchor="middle">👁️</text>' + svgText(E.x, E.y + 28, '눈', 12.5, '#334155') +
      '</svg>';
  })();

  /* 잠망경 : 평행한 거울 두 개 */
  const FIG_PERI = (() => {
    const mir = (cx, cy) => svgLine(cx - 17, cy + 17, cx + 17, cy - 17, '#475569', 8) + svgLine(cx - 17, cy + 17, cx + 17, cy - 17, '#e8eefc', 4);
    return '<svg viewBox="0 0 330 210" width="330" style="max-width:100%" role="img" aria-label="거울 두 개로 만든 잠망경" ' + SVGF + '>' +
      '<rect width="330" height="210" rx="14" fill="#eef5ff"/>' +
      '<rect x="170" y="84" width="34" height="126" fill="#94a3b8"/>' + svgText(187, 156, '벽', 15, '#fff', 'middle', 900) +
      '<path d="M92 46 L136 46 M136 76 L136 164 L92 164 M92 46 L92 136 M92 160 L92 164" fill="none" stroke="#475569" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' +
      mir(114, 62) + mir(114, 148) +
      svgRay(270, 62, 126, 62, '#e11d48', 3.5) + svgRay(114, 64, 114, 140, '#e11d48', 3.5) + svgRay(114, 148, 60, 148, '#e11d48', 3.5) +
      '<text x="290" y="70" font-size="30" text-anchor="middle">🚩</text>' + svgText(290, 94, '벽 너머 물체', 12.5, '#334155') +
      '<text x="38" y="156" font-size="26" text-anchor="middle">👁️</text>' + svgText(38, 182, '눈', 12.5, '#334155') +
      svgText(114, 28, '잠망경', 15, '#475569', 'middle', 900) +
      '</svg>';
  })();

  const SUM_REFLECT = (() => {
    const O = { x: 130, y: 114 }, L = 90, a = 38 * DEG;
    const sx = O.x - L * Math.sin(a), sy = O.y - L * Math.cos(a), ex = O.x + L * Math.sin(a);
    return '<svg viewBox="0 0 260 150" width="260" style="max-width:100%" role="img" aria-label="입사각과 반사각이 같은 반사 그림" ' + SVGF + '>' +
      '<rect width="260" height="150" rx="12" fill="#101a3b"/>' +
      '<rect x="22" y="' + O.y + '" width="216" height="8" rx="3" fill="#d6e0f6"/>' +
      svgLine(O.x, O.y, O.x, 14, '#fff', 1.6, 'stroke-dasharray="5 5"') + svgText(O.x + 4, 22, '법선', 11.5, '#cbd5e1', 'start') +
      svgRay(sx, sy, O.x, O.y, '#ff5a67', 3.6) + svgRay(O.x, O.y, ex, sy, '#ff5a67', 3.6) +
      svgArc(O.x, O.y, 36, 270 - 38, 270, '#fbbf24') + svgArc(O.x, O.y, 36, 270, 270 + 38, '#5eead4') +
      svgText(O.x - 56, O.y - 52, '입사각', 13, '#fbbf24') + svgText(O.x + 56, O.y - 52, '반사각', 13, '#5eead4') + svgText(O.x, 144, '입사각 = 반사각', 13, '#fff', 'middle', 900) + '</svg>';
  })();
  const SUM_REFRACT = (() => {
    const O = { x: 130, y: 82 }, L = 66, ai = 52 * DEG, at = Math.asin(Math.sin(ai) / N_WATER);
    const sx = O.x - L * Math.sin(ai), sy = O.y - L * Math.cos(ai), ex = O.x + L * 1.1 * Math.sin(at), ey = O.y + L * 1.1 * Math.cos(at);
    return '<svg viewBox="0 0 260 170" width="260" style="max-width:100%" role="img" aria-label="공기에서 물로 들어갈 때 법선 쪽으로 꺾이는 빛" ' + SVGF + '>' +
      '<rect width="260" height="170" rx="12" fill="#101a3b"/>' +
      '<rect x="0" y="' + O.y + '" width="260" height="88" rx="0" fill="#1d6fb8" opacity=".7"/>' +
      svgLine(O.x, 10, O.x, 160, '#fff', 1.6, 'stroke-dasharray="5 5"') + svgText(O.x + 4, 20, '법선', 11.5, '#cbd5e1', 'start') +
      svgRay(sx, sy, O.x, O.y, '#ff5a67', 3.6) + svgRay(O.x, O.y, ex, ey, '#ff5a67', 3.6) +
      svgArc(O.x, O.y, 34, 270 - 52, 270, '#fbbf24') + svgArc(O.x, O.y, 34, 90 - Math.round(at / DEG), 90, '#c4b5fd') +
      svgText(36, 34, '공기', 13, '#e2e8f0', 'start') + svgText(36, 160, '물', 13, '#e2e8f0', 'start') +
      svgText(O.x - 64, O.y - 62, '입사각', 13, '#fbbf24') + svgText(O.x + 62, O.y + 56, '굴절각', 13, '#c4b5fd') + svgText(O.x + 40, 150, '굴절각 &lt; 입사각', 12.5, '#fff', 'middle', 900) + '</svg>';
  })();
  const SUM_SEE = '<svg viewBox="0 0 300 120" width="300" style="max-width:100%" role="img" aria-label="전등에서 나온 빛이 사과에서 반사되어 눈으로 들어오는 그림" ' + SVGF + '>' +
    '<rect width="300" height="120" rx="12" fill="#101a3b"/>' +
    '<text x="38" y="40" font-size="30" text-anchor="middle">💡</text>' + svgText(38, 64, '광원', 12.5, '#fde68a') +
    '<text x="150" y="98" font-size="30" text-anchor="middle">🍎</text>' + svgText(150, 116, '물체', 12.5, '#fecaca', 'middle') +
    '<text x="262" y="40" font-size="30" text-anchor="middle">👁️</text>' + svgText(262, 64, '눈', 12.5, '#bae6fd') +
    svgRay(62, 46, 138, 82, '#ffd45e', 3.6) + svgRay(164, 82, 238, 46, '#ffd45e', 3.6) + '</svg>';

  /* =========================================================
     단계 · 미션
     ========================================================= */
  function seeLevelReset() { seeReset(); SEE.lampWant = false; SEE.boardOn = false; SEE.bd.x = SEEP.home.x; SEE.bd.y = SEEP.home.y; SEE.doneLA = SEE.doneAE = false; SEE.tLA = SEE.tAE = 0; }

  game = SciSim.game({
    simId: 'm2-reflection-refraction',
    mount: '#game',
    badge: '빛의 경로 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      draw: '✏️ 빛의 경로 그리기',
      board: '🧱 가림판',
      protractor: '📐 각도기와 법선',
      surface: '📄 정반사·난반사 비교',
      water: '💧 물·유리 경계',
      fish: '🐟 물고기 맞히기',
      puzzle: '🧩 거울 퍼즐',
    },
    onFeatures(set) { feat = set; if (game) syncUI(); },
    onMissionStart(m) { if (m.scene) setScene(m.scene, false); },
    levels: [
      /* ---------------- STEP 1 · 관찰 ---------------- */
      {
        title: '물체를 보는 과정', short: '보는 과정', icon: '👀', phase: '관찰',
        features: ['draw', 'board'],
        intro: '<p class="si-q">❓ 탐구 질문: 우리는 어떻게 물체를 볼 수 있을까?</p>' +
          '<p>깜깜한 방에서는 사과가 보이지 않아요. 전등을 켜면 보이지요. 빛은 어디에서 출발해서, 어디를 지나, <b>눈</b>까지 올까요?</p>' +
          '<p>전등이나 해처럼 <b>스스로 빛을 내는</b> 물체를 <b>광원</b>이라고 해요. 이번 단계에서는 <b>빛의 경로</b>를 직접 그려 보고, 빛의 길을 가림판으로 막아 봐요.</p>',
        setup() { setScene('see', true); seeLevelReset(); },
        recap: '광원에서 나온 빛이 물체에서 <b>반사</b>되어 <b>눈에 들어올 때</b> 물체를 볼 수 있어요.',
        summary: '<p>' + SUM_SEE + '</p><ul><li><b>광원</b>: 전등, 해처럼 스스로 빛을 내는 물체</li>' +
          '<li>물체를 보는 과정: <b>광원 → 물체 → 눈</b>. 빛이 물체에서 <b>반사</b>되어 눈에 들어와요.</li>' +
          '<li>광원은 빛이 <b>직접</b> 눈에 들어와서 보여요.</li>' +
          '<li>눈에서 빛이 나가는 것이 아니에요. <b>빛이 눈에 들어와야</b> 볼 수 있어요.</li></ul>',
        missions: [
          {
            id: 'rr-path', scene: 'see',
            title: '빛의 길 이어 주기',
            goal: '<b>전등 → 사과 → 눈</b> 순서로 손가락(마우스)을 끌어, 빛이 지나가는 길을 화살표로 그려 보세요.',
            hint: '전등 그림에서 시작해 사과까지 끌고, 다시 사과에서 시작해 눈까지 끌어요. 빛이 어디에서 출발하는지 생각해 봐요!',
            setup() { seeLevelReset(); showHint('전등 → 사과 → 눈 순서로 끌어서 화살표를 그려요', 9000); },
            check: () => SEE.built.LA && SEE.built.AE,
            status: () => chip(SEE.built.LA, '전등 → 사과') + ' · ' + chip(SEE.built.AE, '사과 → 눈'),
            hold: 0.8,
            explain: '빛은 <b>광원(전등)</b>에서 출발해 사과에 닿고, 사과 표면에서 <b>반사</b>되어 <b>눈</b>으로 들어와요. 사과는 스스로 빛을 내지 못해서 <b>빛이 있어야</b> 보여요. 전등을 끄면 사과도 보이지 않지요.',
          },
          {
            id: 'rr-block', scene: 'see',
            title: '빛의 길을 막아 보기',
            goal: '<b>가림판</b>을 끌어서 ① 전등과 사과 사이, ② 사과와 눈 사이를 각각 막아 보세요. 사과가 어떻게 보이는지 관찰해요.',
            hint: '가림판을 전등과 사과 사이에 세우면 사과에 빛이 닿지 못해요. 사과와 눈 사이에 세우면 반사된 빛이 눈에 못 들어와요.',
            setup() { SEE.boardOn = true; SEE.lampWant = true; SEE.doneLA = SEE.doneAE = false; SEE.tLA = SEE.tAE = 0; SEE.bd.x = SEEP.home.x; SEE.bd.y = SEEP.home.y; showHint('오른쪽 아래의 가림판을 끌어서 빛의 길을 막아 봐요', 8000); },
            check: () => SEE.doneLA && SEE.doneAE,
            status: () => chip(SEE.doneLA, '전등과 사과 사이 막기') + '<br>' + chip(SEE.doneAE, '사과와 눈 사이 막기'),
            hold: 0.4,
            explain: '<b>빛의 길 어느 한 곳이라도 막히면</b> 사과가 보이지 않아요. ① 빛이 사과에 닿아야 하고, ② 사과에서 반사된 빛이 눈에 들어와야 하기 때문이에요.',
          },
          {
            id: 'rr-quiz1', scene: 'see', type: 'quiz',
            title: '눈이 사과를 보는 까닭',
            goal: '우리가 사과를 볼 수 있는 까닭을 가장 바르게 설명한 것은?',
            choices: ['눈에서 나온 빛이 사과에 닿았다가 돌아오기 때문이다', '사과가 스스로 빛을 내기 때문이다', '전등에서 나온 빛이 사과에서 반사되어 눈에 들어오기 때문이다', '전등의 빛이 눈으로 곧바로 들어오기 때문이다'],
            answer: 2,
            feedback: ['눈은 빛을 내지 않아요. 눈은 들어온 빛을 받아들이는 곳이에요. 눈에서 빛이 나간다면 깜깜한 방에서도 사과가 보여야 해요.', '사과는 광원이 아니에요. 스스로 빛을 낸다면 불을 꺼도 보여야 하는데, 불을 끄면 보이지 않았지요?', '', '전등 같은 광원을 볼 때는 맞는 설명이에요. 하지만 사과는 광원이 아니라서, 사과에 닿았다가 반사된 빛이 눈으로 들어와야 보여요.'],
            explain: '물체를 보려면 <b>빛이 눈에 들어와야</b> 해요. 사과 같은 물체는 광원의 빛을 <b>반사</b>하고, 그 빛이 눈에 들어오면 사과가 보여요. 광원은 빛이 직접 눈에 들어와도 보여요.',
          },
        ],
      },
      /* ---------------- STEP 2 · 실험 ---------------- */
      {
        title: '빛의 반사: 입사각과 반사각', short: '반사', icon: '🪞', phase: '실험',
        features: ['protractor', 'surface'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물체에 닿은 빛이 <b>반사</b>되어 눈에 들어와야 물체가 보인다는 것을 알았어요.</div>' +
          '<p>이번에는 <b>레이저</b>를 거울에 비춰서 빛이 어떻게 반사되는지 알아봐요. 거울면에 수직인 선을 <b>법선</b>이라고 해요. 법선과 들어오는 빛 사이의 각이 <b>입사각</b>, 법선과 반사된 빛 사이의 각이 <b>반사각</b>이에요.</p>',
        setup() { setScene('reflect', true); },
        recap: '빛이 반사될 때 <b>입사각과 반사각의 크기는 같아요</b>(반사 법칙). 매끄러운 면에서는 나란히(정반사), 거친 면에서는 여러 방향으로(난반사) 반사돼요.',
        summary: '<p>' + SUM_REFLECT + '</p><ul><li><b>법선</b>: 반사면에 수직인 선. 각도는 법선에서부터 재요.</li>' +
          '<li><b>반사 법칙</b>: 입사각 = 반사각</li>' +
          '<li><b>정반사</b>: 매끄러운 면(거울)에서 나란히 들어온 빛이 나란히 반사돼요.</li>' +
          '<li><b>난반사</b>: 거친 면(종이, 벽)에서 빛이 여러 방향으로 반사돼요. 어느 방향에서나 물체가 보이는 까닭이에요.</li></ul>',
        missions: [
          {
            id: 'rr-measure', scene: 'reflect',
            title: '입사각 30°, 50°에서 반사각 재기',
            goal: '레이저를 각도기 위에서 끌어 <b>입사각 30°</b>와 <b>50°</b>를 만들고, 반사각이 얼마인지 확인해요.',
            hint: '레이저를 원호를 따라 끌거나 슬라이더를 움직여요. 각도는 거울면이 아니라 법선(점선)에서부터 재요.',
            setup() { RF.rec[30] = RF.rec[50] = false; RF.hold[30] = RF.hold[50] = 0; RF.dragged = false; setRFAngle(-20, false); showHint('레이저를 끌어 입사각 30°와 50°를 만들어 봐요', 8000); },
            check: () => RF.rec[30] && RF.rec[50],
            status: () => chip(RF.rec[30], '입사각 30° 기록') + ' · ' + chip(RF.rec[50], '입사각 50° 기록') + '<br><small>지금: 입사각 ' + Math.abs(RF.a) + '° → 반사각 ' + Math.abs(RF.a) + '°</small>',
            hold: 0.3,
            explain: '입사각이 30°일 때 반사각도 30°, 50°일 때 반사각도 50°였지요? 빛이 반사할 때는 늘 <b>입사각 = 반사각</b>이에요. 이것을 <b>반사 법칙</b>이라고 해요.',
          },
          {
            id: 'rr-surface', scene: 'surface',
            title: '정반사와 난반사 비교',
            goal: '<b>매끄러운 거울</b>과 <b>거친 종이</b>에 나란한 빛 다섯 줄기를 비추고, 반사된 빛을 비교해요. 확대 창도 살펴봐요.',
            hint: '반사하는 면을 바꾸는 버튼을 눌러 보세요. 거친 종이를 확대하면 아주 작은 면들이 제각각 기울어 있어요.',
            setup() { RF.mode = 'mirror'; RF.seen.mirror = 0; RF.seen.rough = 0; setRFAngle(-35, false); syncUI(); showHint('거울과 종이를 번갈아 눌러서 반사된 빛을 비교해 봐요', 8000); },
            check: () => RF.seen.mirror >= 1.5 && RF.seen.rough >= 1.5,
            status: () => chip(RF.seen.mirror >= 1.5, '매끄러운 거울 관찰') + ' · ' + chip(RF.seen.rough >= 1.5, '거친 종이 관찰'),
            hold: 0.3,
            explain: '거친 면도 아주 작은 부분마다 <b>반사 법칙</b>이 그대로 적용돼요. 다만 작은 면들이 제각각 기울어 있어서 반사된 빛이 <b>여러 방향</b>으로 흩어지는 거예요(난반사). 우리가 어느 방향에서나 책이나 벽을 볼 수 있는 까닭이에요.',
          },
          {
            id: 'rr-quiz2', scene: 'reflect', type: 'quiz',
            title: '거울면과 60°를 이룬 빛',
            goal: '레이저 빛이 거울면과 <b>60°</b>를 이루며 들어왔어요. 이 빛의 <b>반사각</b>은 몇 도일까요?',
            figure: FIG_MIRROR60,
            choices: ['30°', '60°', '90°', '120°'],
            answer: 0,
            feedback: ['', '60°는 거울면과 이루는 각이에요. 입사각과 반사각은 거울면이 아니라 <b>법선</b>에서부터 재요.', '90°는 법선과 거울면 사이의 각이에요. 입사 광선과 법선 사이의 각을 찾아봐요.', '반사각은 입사각과 같아요. 먼저 입사각(법선과 입사 광선 사이의 각)이 몇 도인지 구해 봐요.'],
            explain: '입사각은 <b>법선</b>에서부터 재요. 법선은 거울면과 90°를 이루니까 입사각은 90° − 60° = 30°이고, 반사각도 <b>30°</b>예요.',
          },
        ],
      },
      /* ---------------- STEP 3 · 실험 ---------------- */
      {
        title: '빛의 굴절: 경계에서 꺾여요', short: '굴절', icon: '💧', phase: '실험',
        features: ['water', 'fish'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛이 거울에서 <b>반사</b>될 때의 규칙(입사각 = 반사각)을 알아봤어요.</div>' +
          '<p>빛이 공기에서 <b>물</b>이나 <b>유리</b>로 들어갈 때는 어떻게 될까요? 서로 다른 물질의 <b>경계</b>에서 빛은 <b>꺾여서</b> 나아가요. 이것을 빛의 <b>굴절</b>이라고 해요.</p>' +
          '<p>빛의 속력은 물질마다 달라요. 속력이 달라지는 경계에서 빛이 꺾여요. 법선과 굴절된 빛 사이의 각을 <b>굴절각</b>이라고 해요.</p>',
        setup() { setScene('refract', true); },
        recap: '빛이 공기에서 물·유리로 <b>비스듬히</b> 들어가면 경계에서 <b>법선 쪽으로 꺾여요</b>(굴절각 &lt; 입사각). 수직으로 들어가면 꺾이지 않아요.',
        summary: '<p>' + SUM_REFRACT + '</p><ul><li><b>굴절</b>: 빛이 서로 다른 물질의 경계를 지날 때 꺾이는 현상 (경계에서 빛의 속력이 달라져요)</li>' +
          '<li>공기 → 물·유리(비스듬히): <b>법선 쪽으로</b> 꺾여요. 굴절각 &lt; 입사각</li>' +
          '<li>물·유리 → 공기: 법선에서 <b>멀어지는 쪽</b>으로 꺾여요.</li>' +
          '<li>경계에 <b>수직</b>으로 들어가면 꺾이지 않고 곧게 나아가요.</li>' +
          '<li>굴절 때문에 물속 물고기가 실제보다 <b>떠 보이고</b>, 컵 속 빨대가 <b>꺾여 보여요</b>.</li></ul>',
        missions: [
          {
            id: 'rr-refract', scene: 'refract',
            title: '물과 유리에서 꺾이는 빛',
            goal: '레이저를 <b>① 물</b>에 비스듬히(입사각 40° 이상), <b>② 유리</b>에 비스듬히, <b>③ 수직으로(0°)</b> 쏘아 보세요.',
            hint: '입사각을 크게 하면 꺾이는 모습이 잘 보여요. 0°로 맞추면 어떻게 될까요? 물질은 오른쪽 버튼으로 바꿔요.',
            setup() { RR.seen.water = RR.seen.glass = RR.seen.normal = false; RR.hold.water = RR.hold.glass = RR.hold.normal = 0; RR.med = 'water'; RR.dragged = false; setRRAngle(-25, false); syncUI(); showHint('입사각을 바꾸고 물·유리를 번갈아 눌러 봐요', 8000); },
            check: () => RR.seen.water && RR.seen.glass && RR.seen.normal,
            status: () => chip(RR.seen.water, '물에 비스듬히') + ' · ' + chip(RR.seen.glass, '유리에 비스듬히') + '<br>' + chip(RR.seen.normal, '수직(0°)으로 입사'),
            hold: 0.3,
            explain: '공기에서 물이나 유리로 비스듬히 들어가면 <b>법선 쪽으로 꺾여요</b>(굴절각이 입사각보다 작아요). 수직(입사각 0°)으로 들어가면 꺾이지 않고 곧게 나아가요. 빛이 물이나 유리 속에서 <b>더 느리게</b> 나아가서 경계에서 꺾이는 거예요. 반짝이는 점은 빛이 나아가는 모습인데, 물속에서 더 천천히 움직이고 간격도 좁아졌지요? 경계에서는 빛의 일부가 반사되기도 해요.',
          },
          {
            id: 'rr-fish', scene: 'fish',
            title: '레이저로 물고기 맞히기',
            goal: '화면을 눌러 끌면 레이저가 그쪽을 향해요. 눈에 보이는 물고기를 겨냥해서 <b>물고기 2마리</b>를 맞혀 보세요.',
            hint: '실제 물고기를 겨냥하면 빛이 물 표면에서 꺾여서 빗나가요. <b>눈에 보이는 위치</b>(반투명 물고기)를 겨냥해 보세요.',
            setup() { FSH.hits = 0; FSH.counted = false; FSH.hitT = 0; FSH.idle = 0; FSH.nextAt = 0; FSH.dragged = false; FSH.qx = FG.x0 + 0.12 * (FG.x1 - FG.x0); FSH.q0 = FSH.qx; FSH.armed = false; FSH.hintShown = false; FSH.fish.x = fishAt(0).x; FSH.fish.y = fishAt(0).y; FSH.idx = 0; showHint('화면을 눌러 끌어서 레이저를 물고기에게 겨냥해요', 8000); },
            check: () => FSH.hits >= 2,
            status: () => chip(FSH.hits >= 1, '첫 번째 물고기') + ' · ' + chip(FSH.hits >= 2, '두 번째 물고기'),
            hold: 0.5,
            explain: '물속 물고기에서 나온 빛은 물에서 공기로 나올 때 법선에서 <b>멀어지는 쪽</b>으로 꺾여 눈에 들어와요. 우리 눈은 빛이 곧게 온 것으로 느껴서 물고기가 <b>실제보다 떠(얕게) 보여요</b>. 반대로 보이는 물고기를 향해 쏜 레이저는 물에서 꺾여서 <b>실제 물고기</b>를 맞혀요.',
          },
          {
            id: 'rr-quiz3', scene: 'refract', type: 'quiz',
            title: '컵 속 빨대',
            goal: '물이 든 컵에 빨대를 넣으면 물 표면에서 빨대가 <b>꺾여 보여요</b>. 그 까닭은?',
            figure: FIG_STRAW,
            choices: ['빨대가 물속에서 실제로 휘어지기 때문이다', '컵의 유리가 빛을 모두 흡수하기 때문이다', '물 표면이 거울처럼 빛을 반사하기 때문이다', '물속 빨대에서 나온 빛이 물에서 공기로 나올 때 꺾이기 때문이다'],
            answer: 3,
            feedback: ['빨대를 꺼내 보면 곧게 펴져 있지요? 빨대가 휜 것이 아니라 빛의 경로가 꺾이는 거예요.', '유리가 빛을 모두 흡수하면 빨대가 아예 보이지 않을 거예요. 그림의 빛의 경로를 다시 봐요.', '반사는 빛이 되돌아 나오는 현상이에요. 그림에서 빛은 물 표면을 지나 눈까지 가면서 꺾이고 있어요.', ''],
            explain: '물속 빨대에서 나온 빛은 <b>물에서 공기로 나올 때 꺾여서</b> 눈에 들어와요. 우리는 빛이 곧게 온 것으로 느끼기 때문에, 물속 부분이 실제보다 <b>위로 올라온 것처럼</b> 보여서 빨대가 꺾여 보여요.',
          },
        ],
      },
      /* ---------------- STEP 4 · 적용 ---------------- */
      {
        title: '거울로 빛의 길 찾기', short: '경로 퍼즐', icon: '🧩', phase: '적용',
        features: ['puzzle'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛이 반사될 때 입사각과 반사각이 같다는 것, 빛이 경계에서 꺾인다는 것을 알았어요.</div>' +
          '<p>이제 반사 법칙을 이용해서 <b>레이저가 목표에 닿도록</b> 거울을 돌려 봐요. 거울의 <b>끝</b>을 끌어 방향을 바꾸면 빛의 길이 달라져요. 벽에 막히지 않는 길을 찾아봐요!</p>',
        setup() { setScene('puzzle', true); },
        recap: '반사 법칙을 이용하면 거울의 방향을 바꾸어 <b>빛의 경로</b>를 원하는 대로 꺾을 수 있어요. 잠망경은 평행한 거울 두 개로 빛을 두 번 반사시켜요.',
        summary: '<ul><li>거울을 돌리면 입사각이 바뀌고, 반사각도 똑같이 바뀌어서 <b>반사된 빛의 방향</b>이 달라져요.</li>' +
          '<li><b>잠망경</b>: 거울 두 개로 빛을 두 번 반사시켜서 벽이나 장애물 너머를 볼 수 있어요.</li>' +
          '<li>빛의 경로를 그리면 <b>물체를 보는 과정</b>을 설명할 수 있어요: 광원 → (물체에서 반사) → 눈</li></ul><p>' + FIG_PERI + '</p>',
        missions: [
          {
            id: 'rr-puzzle', scene: 'puzzle',
            title: '거울 퍼즐 3판',
            goal: '거울의 끝을 끌어 돌려서 레이저가 <b>목표(◎)</b>에 닿게 하세요. 판은 모두 3개예요.',
            hint: '빛은 반사 법칙대로 나아가요. 레이저 빛이 거울에 닿는 곳에서 어느 쪽으로 반사되면 좋을지 생각하며 거울을 조금씩 돌려 봐요.',
            setup() { PZ.solved = [false, false, false]; PZ.dragged = false; pzLoad(0); showHint('거울 끝의 동그라미를 끌어서 돌려요. 5°씩 딱딱 맞춰져요', 8000); },
            check: () => PZ.solved.every(Boolean),
            status: () => PZ.solved.map((s, i) => chip(s, '판 ' + (i + 1))).join(' · '),
            hold: 0.6,
            explain: '거울을 돌릴 때마다 <b>입사각이 바뀌고 반사각도 똑같이 바뀌어서</b> 빛이 가는 방향이 달라졌어요. 반사 법칙을 이용하면 거울을 여러 개 써서 빛의 경로를 원하는 대로 만들 수 있어요.',
          },
          {
            id: 'rr-quiz4', scene: 'puzzle', type: 'quiz',
            title: '잠망경의 원리',
            goal: '잠망경으로는 벽 너머의 물체를 볼 수 있어요. 잠망경 속 거울 두 개는 어떤 일을 할까요?',
            figure: FIG_PERI,
            choices: ['빛을 굴절시켜서 벽을 통과하게 한다', '빛을 두 번 반사시켜서 빛의 경로를 꺾는다', '물체를 크게 확대해서 보여 준다', '벽을 투명하게 만든다'],
            answer: 1,
            feedback: ['벽은 빛을 통과시키지 않아요. 그림에서 빛이 벽을 지나가나요, 위를 돌아가나요?', '', '확대하는 것은 렌즈의 일이에요. 그림의 거울들은 빛의 방향만 바꾸고 있어요.', '벽은 그대로예요. 빛이 벽을 피해 돌아가는 길을 찾아보세요.'],
            explain: '잠망경의 거울은 빛을 <b>두 번 반사</b>시켜 벽 위로 돌아오게 해요. 거울이 서로 평행하면 들어간 빛과 나오는 빛의 방향이 같아서 물체를 그대로 볼 수 있어요. 반사 법칙(입사각 = 반사각)을 이용한 거예요.',
          },
        ],
      },
    ],
  });
  syncUI();

  /* ---------- 시작 ---------- */
  let lastFree = null;
  SciSim.loop((dt, t) => {
    sceneT += dt; curDt = dt;
    if (scene === 'see') stepSee(dt);
    else if (scene === 'reflect' || scene === 'surface') stepReflect(dt);
    else if (scene === 'refract') stepRefract(dt);
    else if (scene === 'fish') stepFish(dt);
    else stepPuzzle(dt);
    view.clear('#0b1226');
    if (scene === 'see') drawSee(dt, t);
    else if (scene === 'reflect' || scene === 'surface') drawReflectScene(dt, t);
    else if (scene === 'refract') drawRefractScene(dt, t);
    else if (scene === 'fish') drawFishScene(dt, t);
    else drawPuzzle(dt, t);
    drawBadges(dt);
    drawFx(dt);
    if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / 0.45);
      ctx.fillStyle = 'rgba(8,13,31,' + (1 - EASE.outCubic(trans.t)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (game && !!game.free !== lastFree) { lastFree = !!game.free; syncUI(); }
    updateReadouts();
    if (scene === 'fish' && game && game.phase === 'active' && FSH.idle > 11 && FSH.hits === 0 && !FSH.hintShown) { FSH.hintShown = true; showHint('눈에 보이는(반투명) 물고기를 겨냥해 보세요', 7000); }
  });

  // 테스트·디버깅용
  window.__sim = {
    get scene() { return scene; }, get game() { return game; }, W, H, PHONE, SEE, SEEP, RF, RR, FSH, FG, PZ, BOARDS, RG, RRG,
    setScene, setRFAngle, setRRAngle, pzLoad, pzTrace, moveFish, fishGhost, fishBeam, seeNodeAt, addArrow, seeReset, refractNow, FX,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; },
    pzMirrorAt(i) { const m = pzB().mirrors[i]; return pzToView(m.x, m.y); },
    pzEnd(i, ang) { const m = pzB().mirrors[i], a = ang * DEG; return pzToView(m.x + Math.cos(a) * m.len / 2, m.y + Math.sin(a) * m.len / 2); },
    pzSolution: [[155], [150, 150], [55, 60, 150]],
  };
})();
