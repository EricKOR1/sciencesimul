/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전류 조종사
   전압·전류·저항의 관계(옴의 법칙 V = IR)
   전류의 방향과 전자의 이동 방향, 소비 전력(P = VI)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 / 상태 ---------- */
  const V_MAX = 12, R_MIN = 5, R_MAX = 40, P_MAX = 30;
  const A_SCALE = 3, V_SCALE = 15;          // 전류계 0~3 A, 전압계 0~15 V
  const E_SPEED = 75;                       // 전자 표시 속력(px/s) = E_SPEED × 전류(A)
  const S = {
    V: 3,             // 전원 장치 전압(V)
    R: 10,            // 전구 저항(Ω)
    closed: false,    // 스위치
    showE: true,      // 전자 흐름 보기
    showI: false,     // 전류 방향 보기
    nA: 0, nV: 0,     // 계기 바늘(애니메이션)
    glow: 0,          // 전구 밝기(애니메이션 0~1)
    swAng: 0.62,      // 스위치 막대 각도(0 = 닫힘)
    phase: 0,         // 전자 이동량(px)
    data: [],         // 기록: {V, I, R}
    target: null,     // {I:{v,tol}, P:{v,tol}}
    lockV: null, lockR: null,
    knob: null,       // 전원 장치 손잡이 드래그 정보
    hinted: false,
  };
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const amps = () => (S.closed ? S.V / S.R : 0);     // 회로에 흐르는 전류(A)
  const volts = () => (S.closed ? S.V : 0);          // 전구 양 끝의 전압(전압계 측정값)
  const watts = () => volts() * amps();              // 소비 전력(W)
  const shownI = () => r2(amps());
  const shownP = () => r2(watts());
  const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
  const brightness = (P) => (P <= 0 ? 0 : clamp(Math.log(1 + P) / Math.log(1 + 28.8), 0, 1));

  /* ---------- 회로 배치(가상 좌표) ---------- */
  const G = {
    L: 40, R: 440, T: 150, B: 482,
    box: { x: 160, y: 384, w: 160, h: 128 },
    tN: { x: 188, y: 482 }, tP: { x: 292, y: 482 },
    knob: { x: 240, y: 482, r: 13 },
    bulb: { x: 240, gy: 88, gr: 34 },
    vm: { x: 240, y: 268, r: 58 },
    am: { x: 440, y: 320, r: 58 },
    sw: { top: 285, pivot: 345, len: 60 },
    jL: 150, jR: 330,
  };
  const LAYOUTS = {
    wide: { w: 800, h: 520, reserve: 250, power: { x: 512, y: 10, w: 278, h: 100 }, graph: { x: 512, y: 120, w: 278, h: 392 } },
    tall: { w: 500, h: 860, reserve: 140, power: { x: 10, y: 528, w: 480, h: 100 }, graph: { x: 10, y: 638, w: 480, h: 214 } },
  };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const f = (size, w) => (w || 'bold') + ' ' + size + 'px ' + FONT;
  const R_COLORS = { 5: '#e11d48', 10: '#2563eb', 15: '#16a34a', 20: '#9333ea', 25: '#d97706', 30: '#0891b2', 35: '#db2777', 40: '#475569' };
  const WIRE = '#3f4a5c';
  const E_COLOR = '#2563eb';
  const I_COLOR = '#f97316';

  /* ---------- 경로 도우미 (전자 위치 계산) ---------- */
  function makePath(pts, closed) {
    const segs = [];
    let total = 0;
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, len, s0: total });
      total += len;
    }
    return {
      total,
      at(s) {
        s = ((s % total) + total) % total;
        for (let i = 0; i < segs.length; i++) {
          const g = segs[i];
          if (s <= g.s0 + g.len || i === segs.length - 1) {
            const t = clamp((s - g.s0) / g.len, 0, 1);
            return { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t };
          }
        }
        return { x: pts[0].x, y: pts[0].y };
      },
    };
  }
  // 전자의 이동 방향: (−)극 → 왼쪽 → 위 → 전구 → 오른쪽 → 전류계 → (+)극 → (전원 장치 내부) → (−)극
  const loopPath = makePath([
    { x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.T }, { x: G.R, y: G.T }, { x: G.R, y: G.B }, { x: G.tP.x, y: G.B },
  ], true);
  const NE = 48;
  // 전압계 도선의 전자(전압계에는 전류가 거의 흐르지 않으므로 정지)
  const leadDots = [];
  [[{ x: G.jL, y: G.T }, { x: G.jL, y: G.vm.y }, { x: G.vm.x - G.vm.r, y: G.vm.y }],
   [{ x: G.jR, y: G.T }, { x: G.jR, y: G.vm.y }, { x: G.vm.x + G.vm.r, y: G.vm.y }]].forEach((pts) => {
    const p = makePath(pts, false);
    for (let s = 26; s < p.total - 10; s += 30) leadDots.push(p.at(s));
  });
  function hiddenE(p) {
    if (p.y === G.B && p.x > G.tN.x - 13 && p.x < G.tP.x + 13) return true;          // 전원 장치 내부·단자
    if (p.y === G.T && p.x > 212 && p.x < 268) return true;                          // 전구 소켓·필라멘트
    if (p.x === G.R && Math.abs(p.y - G.am.y) < G.am.r + 3) return true;              // 전류계 내부
    if (p.x === G.L && p.y > G.sw.top - 5 && p.y < G.sw.pivot + 5 && (!S.closed || S.swAng > 0.05)) return true; // 열린 스위치
    return false;
  }
  // 전류 방향 화살표 위치와 방향 ((+)극 → 회로 → (−)극)
  const ARROWS = [
    [370, G.B, 1, 0], [G.R, 434, 0, -1], [G.R, 206, 0, -1], [392, G.T, -1, 0],
    [190, G.T, -1, 0], [92, G.T, -1, 0], [G.L, 214, 0, 1], [G.L, 432, 0, 1], [112, G.B, 1, 0],
  ];

  /* ---------- 캔버스 (화면 폭에 따라 가로형/세로형 배치) ---------- */
  let view = null, ctx = null, LAY = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
  const handlers = {
    hover(p) {
      if (hitSwitch(p)) return 'pointer';
      if (hitKnob(p)) return S.lockV != null ? 'not-allowed' : 'grab';
      return null;
    },
    down(p) {
      if (hitSwitch(p)) { toggleSwitch(); return false; }
      if (hitKnob(p)) {
        if (S.lockV != null) { toast('🔒 이 미션에서는 전압이 고정되어 있어요'); return false; }
        S.knob = { x: p.x, y: p.y, V0: S.V };
        hideHint();
        return true;
      }
      return false;
    },
    move(p) {
      if (!S.knob) return;
      const d = (p.x - S.knob.x) - (p.y - S.knob.y);
      setV(S.knob.V0 + d * 0.03);
    },
    up() { S.knob = null; },
  };
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      // 배치가 바뀌면 새 캔버스로 교체 (가상 좌표계가 달라지므로)
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    LAY = Object.assign({ kind }, LAYOUTS[kind]);
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, reserve: LAY.reserve });
    ctx = view.ctx;
    SciSim.pointer(view, handlers);
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }

  function hitSwitch(p) { return p.x > 6 && p.x < 116 && p.y > G.sw.top - 26 && p.y < G.sw.pivot + 16; }
  function hitKnob(p) { return Math.hypot(p.x - G.knob.x, p.y - G.knob.y) < 24; }

  /* ---------- 그리기 도우미 ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function text(str, x, y, font, color, align, base) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic';
    ctx.fillText(str, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  function mix(c1, c2, t) {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = (v, s) => (v >> s) & 255;
    const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')';
  }
  function panel(x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.08)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(x, y, w, h, 12); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(x, y, w, h, 12); ctx.stroke();
  }

  /* ---------- 그리기 ---------- */
  function draw() {
    view.clear('#fff');
    drawGlow();
    drawWires();
    drawSwitch();
    if (S.showE) drawElectrons();
    drawBulb();
    drawMeter(G.vm, { max: V_SCALE, major: 5, mid: 0, minor: 1, val: S.nV, unit: 'V', letter: 'V', color: '#0891b2', reading: volts().toFixed(1) + ' V', plusRight: true });
    drawMeter(G.am, { max: A_SCALE, major: 1, mid: 0.5, minor: 0.1, val: S.nA, unit: 'A', letter: 'A', color: '#7c3aed', reading: shownI().toFixed(2) + ' A', target: S.target && S.target.I, vertical: true });
    drawSupply();
    if (S.showI && amps() > 0) ARROWS.forEach((a) => drawArrow(a[0], a[1], a[2], a[3], 1));
    drawLabels();
    drawLegend();
    drawPower(LAY.power);
    drawGraph(LAY.graph);
  }

  function drawWires() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 전압계 연결 도선 (전구와 병렬)
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(G.jL, G.T); ctx.lineTo(G.jL, G.vm.y); ctx.lineTo(G.vm.x - G.vm.r, G.vm.y);
    ctx.moveTo(G.jR, G.T); ctx.lineTo(G.jR, G.vm.y); ctx.lineTo(G.vm.x + G.vm.r, G.vm.y);
    ctx.stroke();
    // 주 회로 도선
    ctx.strokeStyle = WIRE; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(G.tN.x, G.B); ctx.lineTo(G.L, G.B); ctx.lineTo(G.L, G.sw.pivot);
    ctx.moveTo(G.L, G.sw.top); ctx.lineTo(G.L, G.T); ctx.lineTo(G.R, G.T); ctx.lineTo(G.R, G.B); ctx.lineTo(G.tP.x, G.B);
    ctx.stroke();
    // 접속점
    ctx.fillStyle = WIRE;
    circle(G.jL, G.T, 6); ctx.fill();
    circle(G.jR, G.T, 6); ctx.fill();
  }

  function drawSwitch() {
    const x = G.L, top = G.sw.top, pv = G.sw.pivot, len = G.sw.len;
    const a = S.swAng;
    const ex = x + Math.sin(a) * len, ey = pv - Math.cos(a) * len;
    // 열려 있으면 깜빡이는 안내 고리
    if (!S.closed) {
      const t = performance.now() / 1000;
      ctx.save();
      ctx.strokeStyle = 'rgba(242,107,58,' + (0.45 + 0.3 * Math.sin(t * 4)) + ')';
      ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      circle(x + 14, (top + pv) / 2, 44 + 3 * Math.sin(t * 4)); ctx.stroke();
      ctx.restore();
    }
    // 접점(위)과 회전축(아래)
    ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    rr(x - 9, top - 6, 18, 12, 3); ctx.fill(); ctx.stroke();
    // 막대
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, pv); ctx.lineTo(ex, ey); ctx.stroke();
    // 손잡이
    ctx.fillStyle = '#f26b3a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const hx = x + Math.sin(a) * (len * 0.55), hy = pv - Math.cos(a) * (len * 0.55);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    rr(-8, -11, 16, 22, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#334155'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    circle(x, pv, 7); ctx.fill(); ctx.stroke();
  }

  function electron(x, y, r, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = E_COLOR; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    circle(x, y, r); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.48, y); ctx.lineTo(x + r * 0.48, y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawElectrons() {
    leadDots.forEach((p) => electron(p.x, p.y, 4.5, 0.6));
    const gap = loopPath.total / NE;
    for (let i = 0; i < NE; i++) {
      const p = loopPath.at(i * gap + S.phase);
      if (hiddenE(p)) continue;
      electron(p.x, p.y, 6);
    }
  }

  function drawArrow(x, y, dx, dy, scale) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = I_COLOR; ctx.fill();
    ctx.restore();
  }

  function drawGlow() {
    const b = S.glow;
    if (b < 0.01) return;
    const x = G.bulb.x, y = G.bulb.gy;
    const R = 42 + 58 * b;
    const g = ctx.createRadialGradient(x, y, 8, x, y, R);
    g.addColorStop(0, 'rgba(255,236,140,' + (0.25 + 0.7 * b) + ')');
    g.addColorStop(0.5, 'rgba(255,214,80,' + (0.45 * b) + ')');
    g.addColorStop(1, 'rgba(255,205,60,0)');
    ctx.fillStyle = g; circle(x, y, R); ctx.fill();
    if (b > 0.12) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,170,0,' + Math.min(0.85, b) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const ang = -Math.PI / 2 + (i - 5.5) * (Math.PI / 7.5);
        if (Math.sin(ang) > 0.45) continue;   // 아래쪽(소켓 방향)은 생략
        const r0 = G.bulb.gr + 10, r1v = r0 + 8 + 20 * b;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
        ctx.lineTo(x + Math.cos(ang) * r1v, y + Math.sin(ang) * r1v);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBulb() {
    const x = G.bulb.x, gy = G.bulb.gy, gr = G.bulb.gr, b = S.glow;
    // 유리구
    ctx.beginPath();
    ctx.arc(x, gy, gr, Math.PI * 0.68, Math.PI * 0.32);
    ctx.lineTo(x + 12, 124); ctx.lineTo(x - 12, 124); ctx.closePath();
    ctx.fillStyle = b > 0.01 ? mix('#eef2f7', '#fff3b8', Math.min(1, b * 1.4)) : 'rgba(238,242,247,.95)';
    ctx.fill();
    ctx.strokeStyle = b > 0.01 ? mix('#94a3b8', '#e0a100', b) : '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    // 지지선
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 6, 124); ctx.lineTo(x - 14, gy + 4);
    ctx.moveTo(x + 6, 124); ctx.lineTo(x + 14, gy + 4);
    ctx.stroke();
    // 필라멘트 (저항이 클수록 더 길게 감긴 코일)
    const turns = 1 + S.R / 5;
    const fc = b < 0.5 ? mix('#5b6577', '#ff8a00', b / 0.5) : mix('#ff8a00', '#fff1a8', (b - 0.5) / 0.5);
    if (b > 0.05) { ctx.save(); ctx.shadowColor = 'rgba(255,170,0,.9)'; ctx.shadowBlur = 10 * b; }
    ctx.strokeStyle = fc; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    const x0 = x - 14, x1 = x + 14, steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t, py = gy + 4 - Math.sin(t * Math.PI) * 6 + Math.sin(t * turns * Math.PI * 2) * 4.5;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
    if (b > 0.05) ctx.restore();
    // 반사광
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, gy, gr - 8, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
    // 소켓
    const sg = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
    sg.addColorStop(0, '#8792a5'); sg.addColorStop(0.45, '#d5dbe5'); sg.addColorStop(1, '#7c8799');
    ctx.fillStyle = sg; rr(x - 22, 124, 44, 30, 5); ctx.fill();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(70,80,95,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let yy = 131; yy <= 145; yy += 7) { ctx.moveTo(x - 20, yy); ctx.lineTo(x + 20, yy + 2); }
    ctx.stroke();
  }

  function drawMeter(m, o) {
    const cx = m.x, cy = m.y, r = m.r;
    // 몸체
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; circle(cx, cy, r); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = o.color; ctx.lineWidth = 5; circle(cx, cy, r - 1); ctx.stroke();
    const px = cx, py = cy + 16, ar = 40;
    const a0 = Math.PI * (7 / 6), a1 = Math.PI * (11 / 6);
    const ang = (v) => a0 + (a1 - a0) * clamp(v / o.max, 0, 1.02);
    // 눈금
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, ar, a0, a1); ctx.stroke();
    const nMinor = Math.round(o.max / o.minor);
    for (let i = 0; i <= nMinor; i++) {
      const v = i * o.minor;
      const major = Math.abs(v / o.major - Math.round(v / o.major)) < 1e-6;
      const mid = !major && o.mid && Math.abs(v / o.mid - Math.round(v / o.mid)) < 1e-6;
      const a = ang(v), l = major ? 10 : mid ? 7 : 4;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = major ? 2.2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * ar, py + Math.sin(a) * ar);
      ctx.lineTo(px + Math.cos(a) * (ar - l), py + Math.sin(a) * (ar - l));
      ctx.stroke();
      if (major) text(String(Math.round(v)), px + Math.cos(a) * (ar + 10), py + Math.sin(a) * (ar + 10) + 1, f(12), '#334155', 'center', 'middle');
    }
    // 목표 표시
    if (o.target) {
      const a = ang(o.target.v);
      ctx.strokeStyle = 'rgba(20,160,88,.35)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16);
      ctx.lineTo(px + Math.cos(a) * (ar - 3), py + Math.sin(a) * (ar - 3));
      ctx.stroke();
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16);
      ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1));
      ctx.stroke();
      ctx.fillStyle = '#14a058'; circle(px + Math.cos(a) * ar, py + Math.sin(a) * ar, 4); ctx.fill();
    }
    // 바늘
    const a = ang(o.val);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(a) * 6, py - Math.sin(a) * 6);
    ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1));
    ctx.stroke();
    ctx.fillStyle = '#334155'; circle(px, py, 5); ctx.fill();
    // 디지털 값
    ctx.fillStyle = '#f1f5f9'; rr(cx - 29, cy + 27, 58, 19, 6); ctx.fill();
    text(o.reading, cx, cy + 37, 'bold 13px ' + MONO, '#1b2333', 'center', 'middle');
    // 기호 배지 (Ⓐ, Ⓥ)
    const bx = cx - r * 0.72, by = cy - r * 0.72;
    ctx.fillStyle = o.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    circle(bx, by, 12); ctx.fill(); ctx.stroke();
    text(o.letter, bx, by + 1, f(14), '#fff', 'center', 'middle');
    // 단자 (+ 빨강, − 검정)
    let tp, tn;
    if (o.vertical) { tp = { x: cx, y: cy + r }; tn = { x: cx, y: cy - r }; }
    else { tp = { x: cx + r, y: cy }; tn = { x: cx - r, y: cy }; }
    [[tp, '#dc2626', '+'], [tn, '#111827', '−']].forEach(([t, c, s]) => {
      ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      circle(t.x, t.y, 6.5); ctx.fill(); ctx.stroke();
      const lx = o.vertical ? t.x + 15 : t.x + (s === '+' ? 6 : -6);
      const ly = o.vertical ? t.y + (s === '+' ? 5 : 3) : t.y + 18;
      text(s, lx, ly, f(16, '900'), c, 'center', 'middle');
    });
  }

  function drawSupply() {
    const b = G.box;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, '#475569'); bg.addColorStop(1, '#2b3546');
    ctx.fillStyle = bg; rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.restore();
    text('전원 장치', b.x + b.w / 2, b.y + 17, f(12), '#e2e8f0', 'center');
    // 전압 표시창
    ctx.fillStyle = '#0f241a'; rr(b.x + 16, b.y + 24, b.w - 32, 34, 6); ctx.fill();
    ctx.strokeStyle = '#1f3b2c'; ctx.lineWidth = 2; ctx.stroke();
    text(S.V.toFixed(1) + ' V', b.x + b.w / 2, b.y + 42, 'bold 22px ' + MONO, '#4ade80', 'center', 'middle');
    // 극 표시
    text('(−)극', G.tN.x, b.y + 80, f(12), '#e2e8f0', 'center');
    text('(+)극', G.tP.x, b.y + 80, f(12), '#fca5a5', 'center');
    text('전압', G.knob.x, b.y + 80, f(12), '#cbd5e1', 'center');
    // 단자
    [[G.tN, '#111827', '−'], [G.tP, '#dc2626', '+']].forEach(([t, c, s]) => {
      ctx.fillStyle = c; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      circle(t.x, t.y, 11); ctx.fill(); ctx.stroke();
      text(s, t.x, t.y + 1, f(17, '900'), '#fff', 'center', 'middle');
    });
    // 전압 조절 손잡이
    const k = G.knob;
    const kg = ctx.createRadialGradient(k.x - 4, k.y - 4, 2, k.x, k.y, k.r);
    kg.addColorStop(0, '#e2e8f0'); kg.addColorStop(1, '#94a3b8');
    ctx.fillStyle = kg; ctx.strokeStyle = S.knob ? '#f26b3a' : '#1f2937'; ctx.lineWidth = S.knob ? 3 : 2;
    circle(k.x, k.y, k.r); ctx.fill(); ctx.stroke();
    const ka = (135 + 270 * S.V / V_MAX) * Math.PI / 180;
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + Math.cos(ka) * (k.r - 3), k.y + Math.sin(ka) * (k.r - 3)); ctx.stroke();
  }

  function drawLabels() {
    // 전구
    text('전구', 284, 74, f(15), '#1b2333');
    text('R = ' + S.R + ' Ω', 284, 94, f(13, '700'), '#5d6879');
    // 전압계
    text('전압계', G.vm.x, G.vm.y + G.vm.r + 20, f(13), '#0e7490', 'center');
    // 전류계
    text('전류계', G.am.x - G.am.r - 10, G.am.y - 4, f(13), '#6d28d9', 'right');
    if (S.target && S.target.I) text('🎯 ' + S.target.I.v.toFixed(2) + ' A', G.am.x - G.am.r - 10, G.am.y + 16, f(13), '#0b7a41', 'right');
    // 스위치
    text('스위치', 58, G.sw.pivot + 26, f(13), '#3a4456');
    text(S.closed ? '닫힘' : '열림', 58, G.sw.pivot + 44, f(13), S.closed ? '#0b7a41' : '#c2410c');
  }

  function drawLegend() {
    const items = [];
    if (S.showE) items.push('e');
    if (S.showI) items.push('i');
    if (!items.length) return;
    const iLabel = amps() > 0 ? '전류의 방향' : '전류의 방향 (흐르지 않음)';
    ctx.font = f(13);
    const tw = Math.max(S.showE ? ctx.measureText('전자의 이동').width : 0, S.showI ? ctx.measureText(iLabel).width : 0);
    const x = 12, y = 12, w = Math.max(150, 34 + tw + 14), h = 10 + items.length * 24;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; ctx.stroke();
    items.forEach((it, i) => {
      const yy = y + 17 + i * 24;
      if (it === 'e') {
        electron(x + 18, yy, 6);
        text('전자의 이동', x + 34, yy + 1, f(13), '#1d4ed8', 'left', 'middle');
      } else {
        drawArrow(x + 17, yy, 1, 0, 0.75);
        text(iLabel, x + 34, yy + 1, f(13), '#c2410c', 'left', 'middle');
      }
    });
  }

  function drawPower(P2) {
    const { x, y, w, h } = P2;
    panel(x, y, w, h);
    text('⚡ 소비 전력', x + 12, y + 22, f(13), '#3a4456');
    const tgt = S.target && S.target.P;
    if (tgt) text('🎯 목표 ' + tgt.v.toFixed(1) + ' W', x + w - 12, y + 22, f(13), '#0b7a41', 'right');
    // 식: P = V × I
    const eq = 'P = ' + volts().toFixed(1) + ' V × ' + shownI().toFixed(2) + ' A = ';
    const res = shownP().toFixed(2) + ' W';
    let size = 16;
    ctx.font = f(size);
    while (size > 12 && ctx.measureText(eq + res).width > w - 24) { size--; ctx.font = f(size); }
    const eqW = ctx.measureText(eq).width;
    text(eq, x + 12, y + 48, f(size), '#3a4456');
    text(res, x + 12 + eqW, y + 48, f(size + 1, '900'), '#c2410c');
    // 막대
    const bx = x + 12, bw = w - 24, by = y + 58, bh = 14;
    ctx.fillStyle = '#eef2f7'; rr(bx, by, bw, bh, 7); ctx.fill();
    const fw = bw * clamp(watts() / P_MAX, 0, 1);
    if (fw > 1) {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#fde047'); g.addColorStop(0.5, '#fb923c'); g.addColorStop(1, '#ef4444');
      ctx.fillStyle = g; rr(bx, by, Math.max(fw, 8), bh, 7); ctx.fill();
    }
    for (let v = 0; v <= P_MAX; v += 5) {
      const tx = bx + bw * v / P_MAX;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, by + bh + 1); ctx.lineTo(tx, by + bh + (v % 10 === 0 ? 6 : 4)); ctx.stroke();
      if (v % 10 === 0) text(v + (v === P_MAX ? ' W' : ''), tx, by + bh + 17, f(12, '700'), '#5d6879', v === 0 ? 'left' : v === P_MAX ? 'right' : 'center');
    }
    if (tgt) {
      const tx = bx + bw * tgt.v / P_MAX;
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, by - 3); ctx.lineTo(tx, by + bh + 3); ctx.stroke();
      ctx.fillStyle = '#14a058';
      ctx.beginPath(); ctx.moveTo(tx, by - 1); ctx.lineTo(tx - 6, by - 9); ctx.lineTo(tx + 6, by - 9); ctx.closePath(); ctx.fill();
    }
  }

  function drawGraph(G2) {
    const { x: gx, y: gy, w: gw, h: gh } = G2;
    panel(gx, gy, gw, gh);
    const pad = { l: 46, r: 16, t: 40, b: 38 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const XM = V_MAX, YM = 2.5;
    const px = (v) => x0 + (v / XM) * (x1 - x0);
    const py = (i) => y0 - (i / YM) * (y0 - y1);
    text('📈 전압–전류 그래프', gx + 12, gy + 21, f(13), '#3a4456');
    // 격자
    ctx.lineWidth = 1;
    for (let v = 0; v <= XM; v += 2) {
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      text(String(v), px(v), y0 + 15, f(12, '600'), '#5d6879', 'center');
    }
    for (let i = 0; i <= YM + 1e-9; i += 0.5) {
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x0, py(i)); ctx.lineTo(x1, py(i)); ctx.stroke();
      text(i === 0 ? '0' : i.toFixed(1), x0 - 6, py(i) + 4, f(12, '600'), '#5d6879', 'right');
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 4); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    text('전압 (V)', (x0 + x1) / 2, y0 + 31, f(12), '#5d6879', 'center');
    ctx.save(); ctx.translate(gx + 13, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    text('전류 (A)', 0, 0, f(12), '#5d6879', 'center', 'middle');
    ctx.restore();

    // 기록한 점 (저항별 색)
    const groups = {};
    S.data.forEach((d) => { (groups[d.R] = groups[d.R] || []).push(d); });
    const Rs = Object.keys(groups).map(Number).sort((a, b) => a - b);
    Rs.forEach((R) => {
      const pts = groups[R].slice().sort((a, b) => a.V - b.V);
      const col = R_COLORS[R] || '#334155';
      if (pts.length > 1) {
        ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.2;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(px(p.V), py(p.I)) : ctx.moveTo(px(p.V), py(p.I))));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      pts.forEach((p) => {
        ctx.fillStyle = col; circle(px(p.V), py(Math.min(p.I, YM)), 5.5); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      });
    });
    // 현재 상태
    const cx = px(clamp(volts(), 0, XM)), cy = py(clamp(amps(), 0, YM));
    const pulse = 7 + Math.sin(performance.now() / 200) * 2;
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2;
    circle(cx, cy, pulse); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; circle(cx, cy, 3.5); ctx.fill();
    // 범례
    if (Rs.length) {
      const rowH = 17, maxRows = Math.max(3, Math.floor((y0 - y1) * 0.5 / rowH));
      Rs.forEach((R, i) => {
        const col = Math.floor(i / maxRows), row = i % maxRows;
        const lx = x0 + 10 + col * 62, ly = y1 + 10 + row * rowH;
        ctx.fillStyle = R_COLORS[R] || '#334155'; circle(lx, ly, 5); ctx.fill();
        text(R + ' Ω', lx + 9, ly + 1, f(12), '#3a4456', 'left', 'middle');
      });
    } else {
      text('📍 데이터 기록 버튼을 눌러', (x0 + x1) / 2, y1 + 26, f(12, '600'), '#8a95a6', 'center');
      text('그래프에 점을 찍어 보세요', (x0 + x1) / 2, y1 + 44, f(12, '600'), '#8a95a6', 'center');
    }
  }

  /* ---------- 입력 ---------- */
  const sV = $('#sV'), sR = $('#sR'), swBtn = $('#swBtn'), tgE = $('#tgE'), tgI = $('#tgI');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => (+v).toFixed(1) + ' V', (v) => { S.V = clamp(r1(v), 0, V_MAX); hideHint(); });
  const rangeR = SciSim.bindRange(sR, $('#oR'), (v) => v + ' Ω', (v) => { S.R = clamp(Math.round(v), R_MIN, R_MAX); });

  function setV(v) {
    if (S.lockV != null) v = S.lockV;
    S.V = clamp(r1(v), 0, V_MAX);
    rangeV.set(S.V);
  }
  function setR(r) {
    if (S.lockR != null) r = S.lockR;
    S.R = clamp(Math.round(r / 5) * 5, R_MIN, R_MAX);
    rangeR.set(S.R);
  }
  function setClosed(c) {
    S.closed = !!c;
    swBtn.classList.toggle('closed', S.closed);
    swBtn.setAttribute('aria-pressed', String(S.closed));
    swBtn.textContent = S.closed ? '✋ 스위치 열기' : '🔌 스위치 닫기';
  }
  function toggleSwitch() {
    Sound.click();
    setClosed(!S.closed);
    hideHint();
  }
  function setShow(e, i) {
    S.showE = !!e; S.showI = !!i;
    tgE.setAttribute('aria-pressed', String(S.showE));
    tgI.setAttribute('aria-pressed', String(S.showI));
  }
  function applyLocks() {
    const lv = S.lockV != null, lr = S.lockR != null;
    sV.disabled = lv;
    $$('.nudge[data-target="V"]').forEach((b) => (b.disabled = lv));
    $('#lockV').hidden = !lv;
    if (lv) $('#lockV').textContent = '🔒 이 미션에서는 전압을 ' + S.lockV + ' V로 고정해요';
    sR.disabled = lr;
    $$('.nudge[data-target="R"]').forEach((b) => (b.disabled = lr));
    $('#lockR').hidden = !lr;
    if (lr) $('#lockR').textContent = '🔒 이 미션에서는 저항을 ' + S.lockR + ' Ω으로 고정해요';
  }
  function lock(kind, val) {
    if (kind === 'V') { S.lockV = val; setV(val); }
    else { S.lockR = val; setR(val); }
    applyLocks();
  }

  swBtn.addEventListener('click', toggleSwitch);
  tgE.addEventListener('click', () => { Sound.click(); setShow(!S.showE, S.showI); });
  tgI.addEventListener('click', () => { Sound.click(); setShow(S.showE, !S.showI); });
  $$('.nudge').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    Sound.tick();
    const d = +b.dataset.d;
    if (b.dataset.target === 'V') setV(S.V + d); else setR(S.R + d);
    hideHint();
  }));

  function hideHint() { if (!S.hinted) { S.hinted = true; $('#stageHint').classList.add('hide'); } }

  $('#recBtn').addEventListener('click', () => {
    if (!S.closed) { Sound.click(); toast('🔌 스위치를 닫아야 전류가 흘러서 측정할 수 있어요', 'bad'); return; }
    Sound.tick();
    const d = { V: S.V, I: r2(amps()), R: S.R };
    const i = S.data.findIndex((q) => q.R === d.R && Math.abs(q.V - d.V) < 0.05);
    if (i >= 0) S.data[i] = d; else S.data.push(d);
    if (S.data.length > 80) S.data.shift();
    toast('📍 기록: ' + d.V.toFixed(1) + ' V, ' + d.I.toFixed(2) + ' A (' + d.R + ' Ω)');
  });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.data = []; });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    setV(3); setR(10); setClosed(false); setShow(true, false);
  });

  /* ---------- 측정값 표시 ---------- */
  const rV = $('#rV'), rI = $('#rI'), rR = $('#rR'), rP = $('#rP');
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    rV.innerHTML = volts().toFixed(1) + '<small>V</small>';
    rI.innerHTML = shownI().toFixed(2) + '<small>A</small>';
    rR.innerHTML = S.R + '<small>Ω</small>';
    rP.innerHTML = shownP().toFixed(2) + '<small>W</small>';
  }

  /* ---------- 미션 ---------- */
  function distinctV(R) {
    const vals = S.data.filter((d) => d.R === R).map((d) => d.V).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    vals.forEach((v) => { if (v - last >= 0.95) { n++; last = v; } });
    return n;
  }
  const openWarn = () => (S.closed ? '' : '<br><span style="color:#c2410c">🔌 스위치가 열려 있어 전류가 흐르지 않아요</span>');
  const ok = (b) => (b ? ' ✅' : '');

  const CONCEPT = `
    <h3>⚡ 전압·전류·저항</h3>
    <ul>
      <li><b>전류</b>: 전하(전자)의 흐름. 단위 <b>A</b>(암페어) · 전류계는 회로에 <b>직렬</b>로 연결해요.</li>
      <li><b>전압</b>: 회로에 전류를 흐르게 하는 능력. 단위 <b>V</b>(볼트) · 전압계는 측정하려는 부분에 <b>병렬</b>로 연결해요.</li>
      <li><b>저항</b>: 전류의 흐름을 방해하는 정도. 단위 <b>Ω</b>(옴)</li>
    </ul>
    <h3>🔁 전류의 방향과 전자의 이동 방향</h3>
    <ul>
      <li>전류의 방향: 전원의 <b>(+)극 → 회로 → (−)극</b> (전자를 발견하기 전에 약속한 방향)</li>
      <li>전자의 이동 방향: <b>(−)극 → 회로 → (+)극</b> → 전류의 방향과 <b>반대</b></li>
      <li>전자는 전원 장치에서 새로 생기는 것이 아니라, 도선 속에 원래 있던 전자들이 한꺼번에 움직여요.</li>
    </ul>
    <h3>📏 옴의 법칙</h3>
    <p>전류의 세기는 전압에 <b>비례</b>하고, 저항에 <b>반비례</b>해요.</p>
    <span class="formula">I = V ÷ R &nbsp;⇔&nbsp; V = I × R</span>
    <ul>
      <li>전압–전류 그래프는 <b>원점을 지나는 직선</b>이에요.</li>
      <li>그래프의 기울기(전류 ÷ 전압) = <b>1/R</b> → 저항이 클수록 기울기가 완만해요.</li>
    </ul>
    <h3>💡 소비 전력과 전기 에너지</h3>
    <p><b>소비 전력</b>은 전기 기구가 1초 동안 사용하는 전기 에너지예요. 단위 <b>W</b>(와트)</p>
    <span class="formula">소비 전력(W) = 전압(V) × 전류(A)</span>
    <ul>
      <li>전구는 전기 에너지를 <b>빛에너지와 열에너지</b>로 바꿔요. 소비 전력이 클수록 밝아요.</li>
      <li>같은 전압이 걸리면 저항이 작은 전구일수록 전류가 커서 더 밝아요.</li>
      <li>전력량(사용한 전기 에너지) = 소비 전력 × 사용 시간 (단위 Wh)</li>
    </ul>
    <h3>💧 물의 흐름에 비유하면</h3>
    <ul>
      <li>물의 높이 차(펌프) ↔ <b>전압</b>(전원 장치)</li>
      <li>물의 흐름 ↔ <b>전류</b></li>
      <li>좁은 관 ↔ <b>저항</b> · 물레방아 ↔ 전구</li>
    </ul>
    <p class="note">⚠️ 이 시뮬레이션에서는 전구를 <b>저항값이 일정한 저항</b>처럼 다뤄요. 실제 전구는 필라멘트가 뜨거워질수록 저항이 커져서 전압–전류 그래프가 조금 휘어져요. 또 실제 도선 속 전자는 화면보다 훨씬 느리게 움직이고, 전압계에는 전류가 거의 흐르지 않아요.</p>
  `;

  SciSim.game({
    simId: 'm2-ohms-law',
    mount: '#game',
    concept: CONCEPT,
    badge: '전기 마스터',
    homeHref: '../../index.html#g2',
    onMissionStart() {
      S.target = null;
      S.lockV = null; S.lockR = null;
      applyLocks();
    },
    onComplete() {
      S.target = null;
      S.lockV = null; S.lockR = null;
      applyLocks();
    },
    levels: [
      {
        title: '회로 켜기',
        missions: [
          {
            title: '전구에 불을 켜라!',
            goal: '회로의 <b>스위치</b>를 눌러 닫고, 전구에 불을 켜 보세요. 전자(−)들이 어떻게 움직이는지도 살펴보세요.',
            hint: '회로 왼쪽의 스위치(주황 손잡이)를 누르거나, 위쪽의 [🔌 스위치 닫기] 버튼을 눌러요.',
            setup() { setClosed(false); setV(3); setR(10); },
            check: () => S.closed && amps() > 0,
            status: () => '스위치: <b>' + (S.closed ? '닫힘 ✅' : '열림') + '</b> · 전류: <b>' + shownI().toFixed(2) + ' A</b>' +
              (S.closed && S.V === 0 ? '<br><span style="color:#c2410c">전압이 0 V예요. 전압을 높여 보세요!</span>' : ''),
            hold: 0.6,
            explain: '스위치를 닫으면 끊어진 곳 없이 이어진 <b>닫힌 회로</b>가 되어 전류가 흘러요. 이때 전자는 전원 장치에서 새로 생기는 게 아니라, <b>도선 속에 원래 있던 전자들이 한꺼번에</b> 움직이기 시작해요. 스위치를 열면 회로가 끊겨 전류가 곧바로 멈춰요.',
          },
          {
            title: '전류계 바늘을 0.50 A에!',
            goal: '전구의 저항은 <b>10 Ω</b>으로 고정되어 있어요. 전원 장치의 <b>전압</b>을 조절해 전류계 바늘을 초록 표시인 <b>0.50 A</b>에 맞춰 보세요.',
            hint: '저항이 10 Ω일 때는 전압을 1 V 올릴 때마다 전류가 0.1 A씩 늘어나요. 슬라이더 옆 −/+ 버튼으로 0.1 V씩 조절할 수 있어요.',
            setup() { lock('R', 10); setV(2); setClosed(true); S.target = { I: { v: 0.5, tol: 0.01 } }; },
            check: () => S.closed && near(shownI(), 0.5, 0.01),
            status: () => '전압: <b>' + S.V.toFixed(1) + ' V</b> · 전류: <b>' + shownI().toFixed(2) + ' A</b> (목표 0.50 A)' + openWarn(),
            hold: 1,
            explain: '전압을 <b>5.0 V</b>로 높이자 전류가 <b>0.50 A</b>가 되었어요. 전압은 회로에 전류를 흐르게 하는 능력이에요. 전압이 클수록 전자를 더 세게 밀어 주어 <b>전류가 세지고</b>, 전자도 더 빨리 움직여요.',
          },
          {
            type: 'quiz',
            title: '전압을 2배로 높이면?',
            goal: '저항이 10 Ω인 전구에 <b>5 V</b>를 걸었더니 전류가 <b>0.5 A</b> 흘렀어요. 전압을 <b>10 V</b>(2배)로 높이면 전류는 어떻게 될까요? (직접 실험해 봐도 좋아요!)',
            choices: ['0.25 A (½배로 줄어든다)', '0.5 A (변하지 않는다)', '1.0 A (2배가 된다)', '2.0 A (4배가 된다)'],
            answer: 2,
            feedback: [
              '전압은 전류를 흐르게 하는 능력이에요. 전압을 높였는데 전류가 줄어들까요? 슬라이더로 10 V를 걸어 보세요.',
              '전원 장치가 항상 같은 양의 전류를 내보내는 건 아니에요. 전압을 바꾸면 전류계 바늘이 움직였죠?',
              '',
              '너무 많이 늘었어요. 10 Ω에서 10 V를 걸고 전류계를 직접 읽어 보세요.',
            ],
            explain: '저항이 일정할 때 <b>전류는 전압에 비례</b>해요. 전압이 2배 → 전류도 2배 (5 V: 0.5 A → 10 V: 1.0 A). 전구도 훨씬 밝아지죠!',
          },
          {
            type: 'quiz',
            title: '전류의 방향 vs 전자의 이동 방향',
            goal: '[전자 흐름 보기]와 [전류 방향 보기]를 모두 켰어요. 파란 <b>전자(−)</b>와 주황 <b>화살표</b>를 비교해 보세요. 옳은 설명은?',
            setup() { setShow(true, true); setClosed(true); if (S.V < 3) setV(6); },
            choices: [
              '전류와 전자 모두 (+)극 → (−)극 방향으로 이동한다',
              '전류는 (+)극 → (−)극, 전자는 (−)극 → (+)극 방향으로, 서로 반대이다',
              '전류는 (−)극 → (+)극, 전자는 (+)극 → (−)극 방향이다',
              '전류만 흐르고 전자는 움직이지 않는다',
            ],
            answer: 1,
            feedback: [
              '파란 전자를 잘 보세요. 주황색 화살표와 같은 쪽으로 움직이나요?',
              '',
              '방향이 거꾸로예요. 전원 장치의 빨간 (+)극에 연결된 도선 위의 주황 화살표를 따라가 보세요.',
              '스위치를 닫으면 도선 속 전자들이 실제로 움직여요. 전류는 전자(전하)의 흐름이에요.',
            ],
            explain: '과학자들은 전자를 발견하기 전에 전류의 방향을 <b>(+)극 → (−)극</b>으로 약속했어요. 나중에 밝혀진 실제 <b>전자의 이동 방향은 (−)극 → (+)극</b>으로, 전류의 방향과 반대예요. 지금도 전류의 방향은 처음 약속대로 써요.',
          },
        ],
      },
      {
        title: '옴의 법칙 발견',
        missions: [
          {
            title: '전압–전류 그래프 그리기',
            goal: '저항을 <b>10 Ω</b>으로 고정했어요. 전압을 바꿔 가며 <b>📍 데이터 기록</b>을 눌러, 서로 다른 전압에서 점을 <b>4개</b> 이상 찍어 보세요.',
            hint: '2 V, 4 V, 6 V, 8 V처럼 전압을 1 V 이상씩 다르게 바꿀 때마다 📍 데이터 기록을 눌러요.',
            setup() { lock('R', 10); setClosed(true); },
            check: () => distinctV(10) >= 4,
            status: () => '10 Ω에서 기록한 점: <b>' + Math.min(4, distinctV(10)) + ' / 4</b>' + openWarn(),
            hold: 0,
            explain: '기록한 점마다 <b>전압 ÷ 전류</b>를 계산해 보세요. 2 V ÷ 0.2 A = 10, 6 V ÷ 0.6 A = 10 … 모두 <b>10</b>으로 일정해요! 이 일정한 값이 바로 전구의 <b>저항(Ω)</b>이에요.',
          },
          {
            type: 'quiz',
            title: '그래프의 모양은?',
            goal: '저항 10 Ω에서 기록한 <b>전압–전류 그래프</b>를 보세요. 그래프의 모양과 그 의미로 옳은 것은?',
            choices: [
              '원점을 지나는 직선 → 전류는 전압에 비례한다',
              '오른쪽 아래로 내려가는 곡선 → 전류는 전압에 반비례한다',
              '수평인 직선 → 전압과 관계없이 전류는 일정하다',
              '원점을 지나지 않는 직선 → 0 V에서도 전류가 흐른다',
            ],
            answer: 0,
            feedback: [
              '',
              '점들이 오른쪽 아래로 내려가나요? 전압을 높였을 때 전류가 어떻게 변했는지 떠올려 보세요.',
              '전류는 전원 장치에서 늘 같은 양이 나오는 게 아니에요. 전압이 커질 때 점이 위로 올라가죠?',
              '전압을 0 V로 맞추고 전류계를 보세요. 전압이 없으면 전자를 밀어 주지 못해 전류도 0이에요.',
            ],
            explain: '전압–전류 그래프는 <b>원점을 지나는 직선</b>이에요. 전류가 전압에 비례한다는 이 관계를 <b>옴의 법칙</b>이라고 해요.<span class="formula">V = I × R</span>직선의 기울기(전류 ÷ 전압)는 <b>1/R</b>이에요.',
          },
          {
            title: '저항으로 전류 줄이기',
            goal: '이번엔 전압을 <b>6 V</b>로 고정했어요. 전구의 <b>저항</b>을 바꿔서 전류를 <b>0.20 A</b>로 만들어 보세요.',
            hint: '저항이 클수록 전류가 작아져요. 6 V ÷ 0.2 A = ? Ω',
            setup() { lock('V', 6); setR(10); setClosed(true); S.target = { I: { v: 0.2, tol: 0.01 } }; },
            check: () => S.closed && S.V === 6 && near(shownI(), 0.2, 0.01),
            status: () => '저항: <b>' + S.R + ' Ω</b> · 전류: <b>' + shownI().toFixed(2) + ' A</b> (목표 0.20 A)' + openWarn(),
            hold: 1,
            explain: '저항을 <b>30 Ω</b>으로 하면 I = V ÷ R = 6 V ÷ 30 Ω = <b>0.2 A</b>예요. 저항은 전류의 흐름을 방해하는 정도예요. 저항이 클수록 전자가 지나가기 어려워 전류가 작아지고, 전구도 어두워져요.',
          },
          {
            type: 'quiz',
            title: '저항이 2배가 되면?',
            goal: '전압이 일정할 때, 전구의 저항을 <b>2배</b>로 바꾸면 전류는 어떻게 될까요?',
            choices: ['2배가 된다', '½배가 된다', '변하지 않는다', '4배가 된다'],
            answer: 1,
            feedback: [
              '저항은 전류의 흐름을 <b>방해</b>하는 정도예요. 방해가 커지면 전류는? 6 V에서 15 Ω → 30 Ω으로 바꿔 보세요.',
              '',
              '방금 미션에서 저항을 바꾸니 전류계 바늘이 움직였죠?',
              '전류는 저항에 반비례해요. 6 V에서 15 Ω과 30 Ω일 때 전류를 직접 비교해 보세요.',
            ],
            explain: '<span class="formula">I = V ÷ R</span>전압이 일정하면 <b>전류는 저항에 반비례</b>해요. 6 V에서 15 Ω → 0.4 A, 30 Ω → 0.2 A. 여러 저항으로 그래프를 그려 보면 저항이 클수록 직선의 <b>기울기가 완만</b>해요.',
          },
        ],
      },
      {
        title: '전력 엔지니어',
        missions: [
          {
            title: '3.6 W 전구 만들기',
            goal: '전압과 저항을 자유롭게 조절해 전구의 <b>소비 전력</b>을 정확히 <b>3.6 W</b>로 만들어 보세요. (방법은 여러 가지예요!)',
            hint: '소비 전력 = 전압 × 전류예요. 저항 10 Ω에 6 V를 걸면 전류는 0.6 A → 6 × 0.6 = ?',
            setup() { setClosed(true); setV(3); setR(10); S.target = { P: { v: 3.6, tol: 0.05 } }; },
            check: () => S.closed && near(shownP(), 3.6, 0.05),
            status: () => '소비 전력: <b>' + volts().toFixed(1) + ' V × ' + shownI().toFixed(2) + ' A = ' + shownP().toFixed(2) + ' W</b> (목표 3.6 W)' + openWarn(),
            hold: 1,
            explain: '예를 들어 6 V, 10 Ω이면 0.6 A가 흘러 <b>6 V × 0.6 A = 3.6 W</b>예요. (12 V·40 Ω처럼 다른 조합도 가능해요!) <b>소비 전력</b>은 전기 기구가 1초 동안 사용하는 전기 에너지로, <b>전압 × 전류</b>로 구해요. 전구는 이 전기 에너지를 빛과 열에너지로 바꿔요.',
          },
          {
            type: 'quiz',
            title: '어느 전구가 더 밝을까?',
            goal: '같은 <b>6 V</b> 전압을 걸 때, <b>10 Ω 전구</b>와 <b>30 Ω 전구</b> 중 더 밝은 것은? (저항 슬라이더로 직접 비교해 보세요!)',
            setup() { setClosed(true); setV(6); setR(10); },
            choices: [
              '30 Ω 전구 — 저항이 큰 전구가 더 뜨겁게 달아오르므로',
              '10 Ω 전구 — 전류가 더 많이 흘러 소비 전력이 크므로',
              '두 전구의 밝기는 같다 — 걸린 전압이 같으므로',
              '10 Ω 전구 — 저항이 작은 전구에 더 큰 전압이 걸리므로',
            ],
            answer: 1,
            feedback: [
              '직접 확인해 보세요! 6 V에서 저항을 30 Ω으로 바꾸면 전류가 ⅓로 줄어 전구가 어두워져요.',
              '',
              '전압이 같아도 흐르는 전류가 달라요. 소비 전력 = 전압 × 전류에서 전류가 다르면?',
              '두 경우 모두 전구에 걸린 전압은 6 V로 같아요(전압계를 보세요). 차이가 나는 것은 전류예요.',
            ],
            explain: '같은 전압에서는 저항이 작을수록 전류가 커서(I = V ÷ R) 소비 전력(P = V × I)이 커요. 6 V일 때 10 Ω → 0.6 A, <b>3.6 W</b> / 30 Ω → 0.2 A, <b>1.2 W</b>. 그래서 저항이 작은 전구가 더 밝아요. (두 전구에 <b>같은 전압</b>이 걸릴 때의 이야기예요.)',
          },
          {
            title: '🏆 최종 도전: 0.3 A · 2.7 W',
            goal: '전류는 <b>0.30 A</b>, 소비 전력은 <b>2.7 W</b>가 <b>동시에</b> 되도록 전압과 저항을 설계하세요!',
            hint: '소비 전력 = 전압 × 전류이므로 전압 = 2.7 W ÷ 0.3 A = ? V. 그다음 옴의 법칙으로 저항 = 전압 ÷ 전류를 구해요.',
            setup() { setClosed(true); setV(3); setR(10); S.target = { I: { v: 0.3, tol: 0.01 }, P: { v: 2.7, tol: 0.05 } }; },
            check: () => S.closed && near(shownI(), 0.3, 0.01) && near(shownP(), 2.7, 0.05),
            status: () => '전류: <b>' + shownI().toFixed(2) + ' A</b>' + ok(near(shownI(), 0.3, 0.01)) +
              ' · 소비 전력: <b>' + shownP().toFixed(2) + ' W</b>' + ok(near(shownP(), 2.7, 0.05)) + openWarn(),
            hold: 1.2,
            explain: '전압 = 2.7 W ÷ 0.3 A = <b>9 V</b>, 저항 = 9 V ÷ 0.3 A = <b>30 Ω</b>이에요. 옴의 법칙(V = I × R)과 소비 전력(P = V × I)을 함께 쓰면 원하는 밝기의 전구 회로를 <b>설계</b>할 수 있어요!',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  setClosed(S.closed);
  applyLocks();
  if (S.closed) hideHint();     // 이어 하기로 스위치가 이미 닫힌 미션에서 시작한 경우
  setTimeout(hideHint, 6000);
  SciSim.loop((dt, t) => {
    const k = Math.min(1, dt * 8);
    S.nA += (amps() - S.nA) * k;
    S.nV += (volts() - S.nV) * k;
    S.glow += (brightness(watts()) - S.glow) * Math.min(1, dt * 10);
    S.swAng += ((S.closed ? 0 : 0.62) - S.swAng) * Math.min(1, dt * 16);
    if (Math.abs(S.swAng) < 0.003) S.swAng = 0;
    S.phase += E_SPEED * amps() * dt;
    draw();
    updateReadouts(t);
  });
})();
