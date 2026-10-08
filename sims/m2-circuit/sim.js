/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전류의 모형  [9과14-02 (앞부분)]
   ① 관찰: 닫힌 회로 → ② 모형: 전류는 전자의 흐름
   → ③ 설명: 전류는 소모되지 않는다(전류계 3개) → ④ 모형: 전압(물의 흐름 모형)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 / 상태 ---------- */
  const V_MIN = 0.5, V_MAX = 6, V_BASE = 3, R_BULB = 10;
  const E_SPEED = 110;                       // 전자 표시 속력(px/s) = E_SPEED × 전류(A)
  const W_SPEED = 16;                        // 물방울 속력(px/s) = W_SPEED × 전압(V)
  const S = {
    V: V_BASE, closed: false,
    showE: false, showI: false,
    glow: 0, swAng: 0.62, phase: 0,
    wphase: 0, wheel: 0, pump: 0,
    offX: 150,                               // 회로 가로 위치(물 모형이 없으면 가운데)
    read: { a: false, b: false, c: false },  // 전류계 값을 읽었는지
    knob: null,
    seq: { on: false, off: false },          // 1단계: 켜기 → 끄기
    vHi: false, vLo: false,                  // 4단계: 높였다가 낮추기
  };
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const amps = () => (S.closed ? S.V / R_BULB : 0);
  const shownI = () => r2(amps());
  const brightness = () => clamp(Math.pow(amps() / 0.6, 1.15), 0, 1);

  /* ---------- 열린 도구 ---------- */
  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const showE = () => on('electrons') && S.showE;
  const showI = () => on('current') && S.showI;

  /* ---------- 회로 배치(가상 좌표, 회로 기준) ---------- */
  const G = {
    L: 40, R: 440, T: 150, B: 482,
    box: { x: 160, y: 384, w: 160, h: 128 },
    tN: { x: 188, y: 482 }, tP: { x: 292, y: 482 },
    knob: { x: 240, y: 482, r: 16 },
    bulb: { x: 240, gy: 88, gr: 34 },
    sw: { top: 285, pivot: 345, len: 60 },
  };
  // 전류계 3개: 전류는 (+)극 → 오른쪽 도선 → ⓐ → 전구 → ⓑ → 스위치 → ⓒ → (−)극
  const AM = {
    a: { x: G.R, y: 300, vert: true, plus: 'bottom', tag: 'ⓐ', cap: '전구 앞', cx: G.R - 52, cy: 305, ca: 'right' },
    b: { x: 130, y: G.T, vert: false, plus: 'right', tag: 'ⓑ', cap: '전구 뒤', cx: 130, cy: G.T + 46, ca: 'center' },
    c: { x: 106, y: G.B, vert: false, plus: 'left', tag: 'ⓒ', cap: '(−)극 앞', cx: 106, cy: G.B - 47, ca: 'center' },
  };
  const AM_W = 84, AM_H = 50;
  const LAYOUTS = {
    wide: { w: 800, h: 520, water: { x: 520, y: 12, w: 268, h: 496 }, center: 150 },
    tall: { w: 500, h: 540, water: null, center: 0 },
    tallW: { w: 500, h: 900, water: { x: 10, y: 548, w: 480, h: 342 }, center: 0 },
  };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const f = (size, w) => (w || 'bold') + ' ' + size + 'px ' + FONT;
  const WIRE = '#3f4a5c', E_COLOR = '#2563eb', I_COLOR = '#f97316', AM_COLOR = '#7c3aed';
  const WATER = '#38bdf8', WATER_D = '#0284c7';

  /* ---------- 경로 도우미 ---------- */
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
            const t = clamp((s - g.s0) / (g.len || 1), 0, 1);
            return { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t };
          }
        }
        return { x: pts[0].x, y: pts[0].y };
      },
    };
  }
  // 전자의 이동 방향: (−)극 → 왼쪽 → 위 → 전구 → 오른쪽 → (+)극 → (전원 장치 내부) → (−)극
  const loopPath = makePath([
    { x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.T }, { x: G.R, y: G.T }, { x: G.R, y: G.B }, { x: G.tP.x, y: G.B },
  ], true);
  const NE = 48;
  function inAmmeter(p) {
    for (const k in AM) {
      const m = AM[k];
      if (Math.abs(p.x - m.x) < AM_W / 2 + 2 && Math.abs(p.y - m.y) < AM_H / 2 + 2) return true;
    }
    return false;
  }
  function hiddenE(p) {
    if (p.y === G.B && p.x > G.tN.x - 13 && p.x < G.tP.x + 13) return true;          // 전원 장치 내부
    if (p.y === G.T && p.x > 212 && p.x < 268) return true;                          // 전구 소켓
    if (on('ammeters') && inAmmeter(p)) return true;                                 // 전류계 내부
    if (p.x === G.L && p.y > G.sw.top - 5 && p.y < G.sw.pivot + 5 && (!S.closed || S.swAng > 0.05)) return true;
    return false;
  }
  // 전류 방향 화살표 ((+)극 → 회로 → (−)극)
  const ARROWS = [
    [370, G.B, 1, 0], [G.R, 420, 0, -1], [G.R, 196, 0, -1], [392, G.T, -1, 0],
    [190, G.T, -1, 0], [62, G.T, -1, 0], [G.L, 214, 0, 1], [G.L, 420, 0, 1], [160 - 2, G.B, 1, 0],
  ];

  /* ---------- 캔버스 ---------- */
  let view = null, ctx = null, LAY = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  const kindNow = () => (mq && mq.matches ? (on('water') ? 'tallW' : 'tall') : 'wide');
  const offTarget = () => (LAY.water && on('water') ? 0 : LAY.center);
  const toC = (p) => ({ x: p.x - S.offX, y: p.y });      // 캔버스 → 회로 좌표
  const handlers = {
    hover(p) {
      const c = toC(p);
      if (hitSwitch(c)) return 'pointer';
      if (on('voltage') && hitKnob(c)) return 'grab';
      if (on('ammeters') && hitAmmeter(c)) return 'pointer';
      return null;
    },
    down(p) {
      const c = toC(p);
      if (hitSwitch(c)) { toggleSwitch(); return false; }
      if (on('voltage') && hitKnob(c)) { S.knob = { x: p.x, y: p.y, V0: S.V }; hideHint(); return true; }
      const k = on('ammeters') && hitAmmeter(c);
      if (k) { readMeter(k); return false; }
      return false;
    },
    move(p) {
      if (!S.knob) return;
      const d = (p.x - S.knob.x) - (p.y - S.knob.y);   // 오른쪽·위로 끌면 전압 증가
      setV(Math.round((S.knob.V0 + d * 0.02) * 2) / 2);
    },
    up() { S.knob = null; },
  };
  function buildStage() {
    const kind = kindNow();
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    LAY = Object.assign({ kind }, LAYOUTS[kind]);
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: '#fff' });
    ctx = view.ctx;
    SciSim.pointer(view, handlers);
    S.offX = offTarget();
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }

  function hitSwitch(p) { return p.x > 6 && p.x < 116 && p.y > G.sw.top - 26 && p.y < G.sw.pivot + 16; }
  function hitKnob(p) { return Math.hypot(p.x - G.knob.x, p.y - G.knob.y) < 30; }
  function hitAmmeter(p) {
    for (const k in AM) { const m = AM[k]; if (Math.abs(p.x - m.x) < AM_W / 2 + 10 && Math.abs(p.y - m.y) < AM_H / 2 + 10) return k; }
    return null;
  }

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
  const pulseA = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function newBadge(cx, cy) {
    ctx.fillStyle = '#f26b3a'; rr(cx - 25, cy - 11, 50, 22, 11); ctx.fill();
    text('NEW', cx, cy + 1, f(13), '#fff', 'center', 'middle');
  }
  function newRing(x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + pulseA() * 0.5) + ')'; ctx.lineWidth = 4;
    rr(x - 5, y - 5, w + 10, h + 10, 16); ctx.stroke();
    newBadge(Math.min(x + w - 22, view.vw - 30), Math.max(14, y - 4));
    ctx.restore();
  }
  function newCircle(x, y, r, bx, by) {
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + pulseA() * 0.5) + ')'; ctx.lineWidth = 4;
    circle(x, y, r); ctx.stroke();
    newBadge(bx != null ? bx : x + r * 0.72, by != null ? by : y - r * 0.85);
    ctx.restore();
  }

  /* ---------- 그리기 ---------- */
  function draw() {
    view.clear('#fff');
    ctx.save();
    ctx.translate(S.offX, 0);
    drawGlow();
    drawWires();
    drawSwitch();
    if (showE()) drawElectrons();
    drawBulb();
    drawSupply();
    if (on('ammeters')) Object.keys(AM).forEach((k) => drawAmmeter(k));
    if (showI() && amps() > 0) ARROWS.forEach((a) => drawArrow(a[0], a[1], a[2], a[3], 1));
    drawLabels();
    if (isNew('voltage')) newCircle(G.knob.x, G.knob.y, G.knob.r + 11, G.knob.x + 44, G.knob.y - 30);
    if (isNew('ammeters')) Object.keys(AM).forEach((k) => { const m = AM[k]; newRing(m.x - AM_W / 2, m.y - AM_H / 2, AM_W, AM_H); });
    ctx.restore();
    drawLegend();
    if (LAY.water && on('water') && Math.abs(S.offX - offTarget()) < 40) {
      drawWater(LAY.water);
      if (isNew('water')) newRing(LAY.water.x, LAY.water.y, LAY.water.w, LAY.water.h);
    }
  }

  function drawWires() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = WIRE; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(G.tN.x, G.B); ctx.lineTo(G.L, G.B); ctx.lineTo(G.L, G.sw.pivot);
    ctx.moveTo(G.L, G.sw.top); ctx.lineTo(G.L, G.T); ctx.lineTo(G.R, G.T); ctx.lineTo(G.R, G.B); ctx.lineTo(G.tP.x, G.B);
    ctx.stroke();
  }

  function drawSwitch() {
    const x = G.L, top = G.sw.top, pv = G.sw.pivot, len = G.sw.len;
    const a = S.swAng;
    const ex = x + Math.sin(a) * len, ey = pv - Math.cos(a) * len;
    if (!S.closed) {
      const t = performance.now() / 1000;
      ctx.save();
      ctx.strokeStyle = 'rgba(242,107,58,' + (0.45 + 0.3 * Math.sin(t * 4)) + ')';
      ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      circle(x + 14, (top + pv) / 2, 44 + 3 * Math.sin(t * 4)); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    rr(x - 9, top - 6, 18, 12, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, pv); ctx.lineTo(ex, ey); ctx.stroke();
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
        if (Math.sin(ang) > 0.45) continue;
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
    ctx.beginPath();
    ctx.arc(x, gy, gr, Math.PI * 0.68, Math.PI * 0.32);
    ctx.lineTo(x + 12, 124); ctx.lineTo(x - 12, 124); ctx.closePath();
    ctx.fillStyle = b > 0.01 ? mix('#eef2f7', '#fff3b8', Math.min(1, b * 1.4)) : 'rgba(238,242,247,.95)';
    ctx.fill();
    ctx.strokeStyle = b > 0.01 ? mix('#94a3b8', '#e0a100', b) : '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 6, 124); ctx.lineTo(x - 14, gy + 4);
    ctx.moveTo(x + 6, 124); ctx.lineTo(x + 14, gy + 4);
    ctx.stroke();
    const turns = 3;
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
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, gy, gr - 8, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
    const sg = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
    sg.addColorStop(0, '#8792a5'); sg.addColorStop(0.45, '#d5dbe5'); sg.addColorStop(1, '#7c8799');
    ctx.fillStyle = sg; rr(x - 22, 124, 44, 30, 5); ctx.fill();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(70,80,95,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let yy = 131; yy <= 145; yy += 7) { ctx.moveTo(x - 20, yy); ctx.lineTo(x + 20, yy + 2); }
    ctx.stroke();
  }

  // 전류계 (디지털, 회로에 직렬)
  function drawAmmeter(k) {
    const m = AM[k];
    const x = m.x - AM_W / 2, y = m.y - AM_H / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(x, y, AM_W, AM_H, 12); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = AM_COLOR; ctx.lineWidth = 3; rr(x, y, AM_W, AM_H, 12); ctx.stroke();
    // 기호 배지 (가로형은 위 가운데, 세로형은 왼쪽 위)
    const bx = m.vert ? x + 4 : m.x, by = m.vert ? y + 4 : y;
    ctx.fillStyle = AM_COLOR; circle(bx, by, 11); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    text('A', bx, by + 1, f(13), '#fff', 'center', 'middle');
    // 값
    if (S.read[k]) text(shownI().toFixed(2) + ' A', m.x, m.y + 2, 'bold 17px ' + MONO, '#1b2333', 'center', 'middle');
    else {
      const a = 0.55 + 0.45 * Math.sin(performance.now() / 220);
      ctx.globalAlpha = a;
      text('👆 ?', m.x, m.y + 2, f(18), AM_COLOR, 'center', 'middle');
      ctx.globalAlpha = 1;
    }
    // 단자 (+ 빨강, − 검정): 전류가 들어오는 쪽이 (+)
    const ends = m.vert ? { top: { x: m.x, y: y }, bottom: { x: m.x, y: y + AM_H } } : { left: { x: x, y: m.y }, right: { x: x + AM_W, y: m.y } };
    Object.keys(ends).forEach((side) => {
      const t = ends[side], plus = side === m.plus;
      ctx.fillStyle = plus ? '#dc2626' : '#111827'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      circle(t.x, t.y, 6.5); ctx.fill(); ctx.stroke();
      const lx = m.vert ? t.x + 15 : t.x + (side === 'left' ? -2 : 2);
      const ly = m.vert ? t.y + (side === 'bottom' ? 9 : -8) : t.y - 15;
      text(plus ? '+' : '−', lx, ly, f(15, '900'), plus ? '#dc2626' : '#111827', 'center', 'middle');
    });
    // 이름
    text(m.tag + ' ' + m.cap, m.cx, m.cy, f(13), '#6d28d9', m.ca, 'middle');
  }

  function drawSupply() {
    const b = G.box;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, '#475569'); bg.addColorStop(1, '#2b3546');
    ctx.fillStyle = bg; rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.restore();
    text('전원 장치', b.x + b.w / 2, b.y + 17, f(13), '#e2e8f0', 'center');
    ctx.fillStyle = '#0f241a'; rr(b.x + 16, b.y + 24, b.w - 32, 34, 6); ctx.fill();
    ctx.strokeStyle = '#1f3b2c'; ctx.lineWidth = 2; ctx.stroke();
    if (on('voltage')) text(S.V.toFixed(1) + ' V', b.x + b.w / 2, b.y + 42, 'bold 22px ' + MONO, '#4ade80', 'center', 'middle');
    else text('● 전원 켜짐', b.x + b.w / 2, b.y + 42, f(15), '#4ade80', 'center', 'middle');
    text('(−)극', G.tN.x, b.y + 76, f(13), '#e2e8f0', 'center');
    text('(+)극', G.tP.x, b.y + 76, f(13), '#fca5a5', 'center');
    [[G.tN, '#111827', '−'], [G.tP, '#dc2626', '+']].forEach(([t, c, s]) => {
      ctx.fillStyle = c; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      circle(t.x, t.y, 11); ctx.fill(); ctx.stroke();
      text(s, t.x, t.y + 1, f(17, '900'), '#fff', 'center', 'middle');
    });
    if (!on('voltage')) return;
    const k = G.knob;
    text('전압', k.x, b.y + 76, f(13), '#cbd5e1', 'center');
    const kg = ctx.createRadialGradient(k.x - 4, k.y - 4, 2, k.x, k.y, k.r);
    kg.addColorStop(0, '#f1f5f9'); kg.addColorStop(1, '#94a3b8');
    ctx.fillStyle = kg; ctx.strokeStyle = S.knob ? '#f26b3a' : '#1f2937'; ctx.lineWidth = S.knob ? 3.5 : 2;
    circle(k.x, k.y, k.r); ctx.fill(); ctx.stroke();
    const ka = (135 + 270 * S.V / V_MAX) * Math.PI / 180;
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + Math.cos(ka) * (k.r - 3), k.y + Math.sin(ka) * (k.r - 3)); ctx.stroke();
  }

  function drawLabels() {
    text('전구', 304, 80, f(15), '#1b2333');
    text(S.glow > 0.03 ? '켜짐' : '꺼짐', 304, 100, f(13), S.glow > 0.03 ? '#b45309' : '#8a95a6');
    text('스위치', 58, G.sw.pivot + 26, f(13), '#3a4456');
    text(S.closed ? '닫힘' : '열림', 58, G.sw.pivot + 44, f(13), S.closed ? '#0b7a41' : '#c2410c');
  }

  function drawLegend() {
    const items = [];
    if (showE()) items.push('e');
    if (showI()) items.push('i');
    if (!items.length) return;
    const iLabel = amps() > 0 ? '전류의 방향' : '전류의 방향 (흐르지 않음)';
    ctx.font = f(13);
    const tw = Math.max(showE() ? ctx.measureText('전자의 이동').width : 0, showI() ? ctx.measureText(iLabel).width : 0);
    const x = 12, y = 12, w = Math.max(150, 34 + tw + 14), h = 10 + items.length * 24;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; ctx.stroke();
    items.forEach((it, i) => {
      const yy = y + 17 + i * 24;
      if (it === 'e') { electron(x + 18, yy, 6); text('전자의 이동', x + 34, yy + 1, f(13), '#1d4ed8', 'left', 'middle'); }
      else { drawArrow(x + 17, yy, 1, 0, 0.75); text(iLabel, x + 34, yy + 1, f(13), '#c2410c', 'left', 'middle'); }
    });
  }

  /* ---------- 물의 흐름 모형 ---------- */
  const LEGEND = [
    ['⚙️ 펌프', '전원 장치'],
    ['↕ 높이 차', '전압'],
    ['💧 물의 흐름', '전류'],
    ['🎡 물레방아', '전구'],
    ['🚰 밸브', '스위치'],
  ];
  function drawWater(P) {
    panel(P.x, P.y, P.w, P.h);
    text('💧 물의 흐름 모형', P.x + 12, P.y + 24, f(15), '#0369a1');
    const side = P.w > P.h;                                  // 가로로 넓으면 대응표를 오른쪽에
    const LW = side ? 196 : P.w - 16, LH = LEGEND.length * 22 + 30;
    const D = side ? { x: P.x + 8, y: P.y + 56, w: P.w - LW - 20, h: P.h - 62 } : { x: P.x + 8, y: P.y + 56, w: P.w - 16, h: P.h - 62 - LH };
    // 대응표
    const lx = side ? P.x + P.w - LW - 8 : P.x + 8, ly = side ? P.y + 60 : D.y + D.h + 6;
    ctx.fillStyle = '#f0f9ff'; rr(lx, ly, LW, LH - 4, 10); ctx.fill();
    text('물 모형  ↔  전기 회로', lx + 10, ly + 19, f(13), '#0369a1');
    LEGEND.forEach((row, i) => {
      const yy = ly + 40 + i * 22;
      text(row[0], lx + 10, yy, f(13, '700'), '#334155');
      text('↔ ' + row[1], lx + LW - 10, yy, f(13), '#c2410c', 'right');
    });

    // 관 경로
    const V = S.V, flowing = S.closed && V > 0;
    const left = D.x + 64, right = D.x + D.w - 34, bottom = D.y + D.h - 34, topMin = D.y + 26;
    const MIN_LIFT = 64;
    const tankY = bottom - MIN_LIFT - (bottom - topMin - MIN_LIFT) * ((V - V_MIN) / (V_MAX - V_MIN));
    const wy = tankY + (bottom - tankY) * 0.5;
    // 높이 차 화살표
    if (bottom - tankY > 14) {
      const ax = D.x + 20;
      ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(ax, bottom); ctx.lineTo(ax, tankY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#c2410c';
      [[tankY, -1], [bottom, 1]].forEach(([yy, d]) => { ctx.beginPath(); ctx.moveTo(ax, yy); ctx.lineTo(ax - 6, yy - d * 9); ctx.lineTo(ax + 6, yy - d * 9); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = '#fdba8c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax - 8, tankY); ctx.lineTo(left - 14, tankY); ctx.moveTo(ax - 8, bottom); ctx.lineTo(left - 20, bottom); ctx.stroke();
    }
    text('높이 차', D.x + 4, tankY - 10, f(13), '#c2410c');
    // 관
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const pipe = () => { ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(left, tankY); ctx.lineTo(right, tankY); ctx.lineTo(right, bottom); ctx.closePath(); };
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 18; pipe(); ctx.stroke();
    ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 12; pipe(); ctx.stroke();
    // 물방울 (펌프 → 위 → 오른쪽 → 아래 → 왼쪽)
    const path = makePath([{ x: left, y: bottom }, { x: left, y: tankY }, { x: right, y: tankY }, { x: right, y: bottom }], true);
    const n = Math.max(6, Math.round(path.total / 22));
    for (let i = 0; i < n; i++) {
      const p = path.at(i * path.total / n + S.wphase);
      ctx.fillStyle = flowing ? WATER : '#93c5fd'; circle(p.x, p.y, 4.5); ctx.fill();
    }
    // 밸브 (= 스위치): 아래쪽 관 가운데
    const vx = left + 52;
    ctx.fillStyle = S.closed ? '#16a34a' : '#dc2626'; rr(vx - 9, bottom - 16, 18, 32, 5); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(vx, bottom - 16); ctx.lineTo(vx, bottom - 26); ctx.moveTo(vx - 10, bottom - 26); ctx.lineTo(vx + 10, bottom - 26); ctx.stroke();
    text(S.closed ? '밸브 열림' : '밸브 잠김', vx, bottom + 32, f(13), S.closed ? '#15803d' : '#b91c1c', 'center');
    // 물레방아 (= 전구)
    ctx.save(); ctx.translate(right, wy); ctx.rotate(S.wheel);
    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.5;
    circle(0, 0, 22); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#b45309'; circle(right, wy, 4); ctx.fill();
    text('물레방아', right - 30, wy + 5, f(13), '#92400e', 'right');
    // 펌프 (= 전원 장치)
    ctx.fillStyle = '#475569'; circle(left, bottom, 22); ctx.fill();
    ctx.save(); ctx.translate(left, bottom); ctx.rotate(S.pump);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.stroke(); }
    ctx.restore();
    text('펌프', left - 24, bottom + 32, f(13), '#334155', 'right');
    // 흐름 상태
    const msg = !S.closed ? '⛔ 밸브가 잠겨 물이 흐르지 않아요' : V >= 4.5 ? '높이 차가 커서 물이 빠르게 흘러요' : V <= 1.5 ? '높이 차가 작아 물이 느리게 흘러요' : '물이 흘러 물레방아를 돌려요';
    text(msg, P.x + 12, P.y + 46, f(13, '700'), flowing ? '#0369a1' : '#b91c1c');
  }

  /* ---------- 입력 ---------- */
  const sV = $('#sV'), swBtn = $('#swBtn'), tgE = $('#tgE'), tgI = $('#tgI');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => (+v).toFixed(1) + ' V', (v) => { S.V = clamp(v, V_MIN, V_MAX); hideHint(); });
  function setV(v) { S.V = clamp(r1(v), V_MIN, V_MAX); rangeV.set(S.V); }
  function setClosed(c) {
    S.closed = !!c;
    swBtn.classList.toggle('closed', S.closed);
    swBtn.setAttribute('aria-pressed', String(S.closed));
    swBtn.textContent = S.closed ? '✋ 스위치 열기' : '🔌 스위치 닫기';
  }
  function toggleSwitch() { Sound.click(); setClosed(!S.closed); hideHint(); }
  function setShow(e, i) {
    S.showE = !!e; S.showI = !!i;
    tgE.setAttribute('aria-pressed', String(S.showE));
    tgI.setAttribute('aria-pressed', String(S.showI));
  }
  function readMeter(k) {
    if (!S.closed) { Sound.click(); toast('🔌 스위치를 닫아야 전류가 흘러요'); }
    else Sound.tick();
    S.read[k] = true;
    hideHint();
  }
  const readAll = (v) => { S.read = { a: v, b: v, c: v }; };

  swBtn.addEventListener('click', toggleSwitch);
  tgE.addEventListener('click', () => { Sound.click(); setShow(!S.showE, S.showI); hideHint(); });
  tgI.addEventListener('click', () => { Sound.click(); setShow(S.showE, !S.showI); hideHint(); });
  $$('.nudge').forEach((b) => b.addEventListener('click', () => { Sound.tick(); setV(S.V + +b.dataset.d); hideHint(); }));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); setV(V_BASE); setClosed(false); });

  const hintEl = $('#stageHint');
  function showHint(msg, ms) {
    hintEl.textContent = msg; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ---------- 측정값 표시 ---------- */
  const rC = $('#rC'), rB = $('#rB'), rV = $('#rV');
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    rC.textContent = S.closed ? '닫힌 회로' : '열린 회로';
    rC.className = 'value state ' + (S.closed ? 'on' : 'off');
    const b = brightness();
    rB.textContent = b <= 0 ? '꺼짐' : b > 0.7 ? '아주 밝음' : b < 0.25 ? '어두움' : '켜짐';
    rB.className = 'value state ' + (b > 0 ? 'on' : 'off');
    rV.innerHTML = S.V.toFixed(1) + '<small>V</small>';
  }

  const box = (b) => (b ? '✅' : '⬜');

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm2-circuit',
    mount: '#game',
    badge: '전류 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      switch: '🔌 스위치',
      bulb: '💡 전구',
      electrons: '🔵 전자 흐름 보기',
      current: '➡️ 전류 방향 보기',
      ammeters: 'Ⓐ 전류계 3개',
      voltage: '🔋 전압 조절',
      water: '💧 물의 흐름 모형',
    },
    onFeatures(set) {
      F = set;
      if (!set.has('voltage')) setV(V_BASE);
      buildStage();
    },
    onComplete() { readAll(true); },
    levels: [
      /* ---------- 1단계 ---------- */
      {
        title: '닫힌 회로', short: '회로', icon: '🔌', phase: '관찰',
        features: ['switch', 'bulb'],
        intro: '<p><b>🔍 탐구 질문: 스위치를 누르면 전구는 어떻게 켜질까?</b></p>' +
          '<p>전원 장치, 스위치, 전구를 도선으로 이은 <b>전기 회로</b>가 있어요. 스위치를 닫았다 열었다 하며 전구를 관찰해 봐요.</p>',
        setup() { setClosed(false); setShow(false, false); showHint('👆 스위치를 눌러 보세요', 7000); },
        recap: '끊어진 곳 없이 이어진 <b>닫힌 회로</b>에서만 전류가 흘러 전구가 켜져요.',
        summary: '<ul><li><b>전기 회로</b>: 전원 장치, 전구, 스위치 등을 도선으로 연결한 것</li>' +
          '<li><b>닫힌 회로</b>: 끊어진 곳 없이 이어진 회로 → 전류가 흘러 전구가 켜진다.</li>' +
          '<li><b>열린 회로</b>: 스위치를 열거나 도선이 끊어진 회로 → 전류가 흐르지 못한다.</li></ul>',
        missions: [
          {
            title: '켜고 끄기',
            goal: '스위치를 <b>닫아</b> 전구를 켠 뒤, 다시 <b>열어</b> 꺼 보세요.',
            hint: '회로 왼쪽 스위치의 주황 손잡이를 누르거나, <b>🔌 스위치 닫기</b> 버튼을 눌러요.',
            setup() { setClosed(false); S.seq = { on: false, off: false }; },
            check: () => { if (S.closed) S.seq.on = true; else if (S.seq.on) S.seq.off = true; return S.seq.on && S.seq.off; },
            status: () => box(S.seq.on) + ' 스위치 닫기 (전구 켜기) · ' + box(S.seq.off) + ' 스위치 열기 (전구 끄기)',
            hold: 0.5,
            explain: '스위치를 닫으면 회로가 하나로 이어져 전구가 켜지고, 열면 스위치 부분이 끊어져 전구가 꺼져요.',
          },
          {
            type: 'quiz',
            title: '전구가 꺼진 까닭',
            goal: '스위치를 열었더니 전구가 곧바로 꺼졌어요. 그 까닭은?',
            choices: [
              '전원 장치의 전기가 모두 닳았기 때문',
              '회로가 끊어져(열린 회로) 전류가 흐르지 못하기 때문',
              '스위치를 열면 전원 장치가 꺼지기 때문',
              '전구가 고장 났기 때문',
            ],
            answer: 1,
            feedback: [
              '스위치를 다시 닫으면 곧바로 켜지죠? 전기가 닳은 것이 아니에요.',
              '',
              '전원 장치 표시창은 계속 "전원 켜짐"이에요. 스위치는 회로를 잇거나 끊는 장치예요.',
              '다시 닫으면 켜지니 전구는 멀쩡해요.',
            ],
            explain: '전류는 끊어진 곳 없이 이어진 <b>닫힌 회로</b>에서만 흘러요. 스위치를 열면 회로가 끊겨 전류가 흐르지 못해요.',
          },
        ],
      },
      /* ---------- 2단계 ---------- */
      {
        title: '전류는 전자의 흐름', short: '전류', icon: '🔵', phase: '모형',
        features: ['electrons', 'current'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 닫힌 회로에서 전류가 흘러 전구가 켜지는 것을 봤어요.</div>' +
          '<p>도선 속에서는 무엇이 움직일까요? 눈에 보이지 않는 <b>전자</b>의 움직임과 <b>전류의 방향</b>을 모형으로 나타내 비교해 봐요.</p>',
        setup() { setClosed(true); setShow(false, false); showHint('👆 위쪽 [전자 흐름 보기]를 눌러 보세요', 7000); },
        recap: '전류는 전자의 흐름이에요. 전자는 (−)극 → (+)극, 전류는 (+)극 → (−)극으로 <b>반대 방향</b>이에요.',
        summary: '<ul><li><b>전류</b>: 전하의 흐름. 도선 속에서는 (−)전하를 띤 <b>전자</b>가 이동한다.</li>' +
          '<li>전자의 이동 방향: <b>(−)극 → (+)극</b> / 전류의 방향: <b>(+)극 → (−)극</b> (서로 반대)</li>' +
          '<li>전자는 도선 속에 원래 있다. 스위치를 닫으면 회로 전체의 전자가 <b>한꺼번에</b> 움직인다.</li></ul>' +
          '<p class="note">전류의 방향은 전자를 발견하기 전에 정한 약속이라 지금도 그대로 쓴다.</p>',
        missions: [
          {
            title: '전자와 전류 보기',
            goal: '<b>[전자 흐름 보기]</b>와 <b>[전류 방향 보기]</b>를 모두 켜고, 닫힌 회로를 잠시 지켜보세요.',
            hint: '캔버스 위 도구 막대의 두 버튼을 눌러요. 스위치가 열려 있으면 닫아요.',
            setup() { setClosed(true); setShow(false, false); },
            check: () => S.closed && showE() && showI(),
            status: () => box(showE()) + ' 전자 흐름 · ' + box(showI()) + ' 전류 방향 · ' + box(S.closed) + ' 스위치 닫기',
            hold: 2,
            explain: '파란 점(−)이 <b>전자</b>, 주황 화살표가 <b>전류의 방향</b>이에요. 둘의 방향을 비교해 보세요.',
          },
          {
            type: 'quiz',
            title: '전자와 전류의 방향',
            goal: '파란 전자와 주황 화살표의 방향을 비교하면?',
            setup() { setShow(true, true); setClosed(true); },
            choices: [
              '전자와 전류 모두 (+)극 → (−)극으로 이동한다',
              '전자는 (−)극 → (+)극, 전류는 (+)극 → (−)극으로 서로 반대이다',
              '전자는 (+)극 → (−)극, 전류는 (−)극 → (+)극이다',
              '전류만 흐르고 전자는 움직이지 않는다',
            ],
            answer: 1,
            feedback: [
              '파란 전자가 주황 화살표와 같은 쪽으로 움직이나요?',
              '',
              '거꾸로예요. 빨간 (+)극에서 나오는 도선 위의 주황 화살표를 따라가 보세요.',
              '스위치를 닫으면 도선 속 전자가 실제로 움직여요. 전류는 전자의 흐름이에요.',
            ],
            explain: '전류의 방향은 전자를 발견하기 전에 <b>(+)극 → (−)극</b>으로 정했어요. 실제 <b>전자는 (−)극 → (+)극</b>으로, 전류와 반대 방향으로 이동해요.',
          },
          {
            type: 'quiz',
            title: '전구가 곧바로 켜지는 까닭',
            goal: '스위치를 닫자마자 멀리 있는 전구도 곧바로 켜져요. 그 까닭은?',
            setup() { setShow(true, false); },
            choices: [
              '전원 장치에서 나온 전자가 빛처럼 빠르게 전구까지 달려가서',
              '도선 속에 원래 있던 전자들이 회로 전체에서 한꺼번에 움직이기 시작해서',
              '스위치 안에 전자가 모여 있다가 전구로 튀어 나가서',
              '전구 속에서 전자가 새로 만들어져서',
            ],
            answer: 1,
            feedback: [
              '스위치를 닫는 순간을 다시 보세요. 전원 장치 근처뿐 아니라 모든 도선의 전자가 동시에 움직여요.',
              '',
              '스위치를 열어도 전자는 회로의 모든 도선에 고르게 퍼져 있어요.',
              '전자는 새로 생기지 않아요. 도선 속에 원래 있던 전자가 움직여요.',
            ],
            explain: '전자는 도선 속에 <b>원래</b> 가득 있어요. 스위치를 닫으면 회로 전체의 전자가 <b>동시에</b> 밀려 움직이므로 전구가 곧바로 켜져요.',
          },
        ],
      },
      /* ---------- 3단계 ---------- */
      {
        title: '전류는 소모될까?', short: '전류 모형', icon: '🔁', phase: '설명',
        features: ['ammeters'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 회로 전체의 전자가 함께 움직이는 것이 전류라는 것을 알았어요.</div>' +
          '<p>"전구를 지나면 전류가 줄어든다"는 말은 맞을까요? 회로의 세 곳 ⓐ, ⓑ, ⓒ에 <b>전류계</b>를 연결해 전류의 세기를 비교해 봐요.</p>',
        setup() { setClosed(true); setShow(true, S.showI); readAll(false); showHint('👆 전류계 ⓐ, ⓑ, ⓒ를 하나씩 눌러 보세요', 7000); },
        recap: '한 줄로 이어진 회로에서 전류의 세기는 <b>어디서나 같아요</b>. 전류는 전구에서 소모되지 않아요.',
        summary: '<ul><li>한 줄로 이어진 회로에서는 전구 앞, 전구 뒤 어디서나 <b>전류의 세기가 같다</b>.</li>' +
          '<li>전자는 사라지거나 새로 생기지 않고 회로를 따라 계속 돈다 → 전류는 <b>소모되지 않는다</b>.</li>' +
          '<li><b>전류계</b>는 전류가 지나가는 길에 <b>직렬</b>로 연결한다. 단위 A(암페어)</li></ul>',
        missions: [
          {
            title: '세 곳의 전류 재기',
            goal: '스위치를 닫고 전류계 <b>ⓐ, ⓑ, ⓒ</b>를 하나씩 눌러 값을 읽어 보세요.',
            hint: '보라색 전류계 상자(👆 ?)를 손가락으로 눌러요. 스위치가 닫혀 있어야 전류가 흘러요.',
            setup() { setClosed(true); readAll(false); },
            check: () => S.closed && S.read.a && S.read.b && S.read.c,
            status: () => ['a', 'b', 'c'].map((k) => AM[k].tag + ' ' + (S.read[k] ? '<b>' + shownI().toFixed(2) + ' A</b>' : '?')).join(' · ') +
              (S.closed ? '' : '<br><span style="color:#c2410c">🔌 스위치가 열려 있어요</span>'),
            hold: 0.8,
            explain: '세 전류계가 모두 <b>' + (V_BASE / R_BULB).toFixed(2) + ' A</b>로 같아요. 전구를 지나기 전과 지난 뒤의 전류가 똑같아요.',
          },
          {
            type: 'quiz',
            title: '전류는 줄어들까?',
            goal: '친구가 "전류는 전구에서 소모되어 ⓐ보다 ⓑ에서 약하다"고 말했어요. 측정 결과로 옳은 것은?',
            setup() { setClosed(true); readAll(true); },
            choices: [
              'ⓐ > ⓑ > ⓒ — 전구를 지날수록 전류가 줄어든다',
              'ⓐ = ⓑ = ⓒ — 회로 어디서나 전류의 세기가 같다',
              'ⓐ < ⓑ — 전구에서 전류가 더 만들어진다',
              'ⓑ = 0 — 전구 뒤에는 전류가 흐르지 않는다',
            ],
            answer: 1,
            feedback: [
              '세 전류계의 값을 다시 보세요. 정말 줄어들었나요?',
              '',
              '전구는 전류를 만들지 않아요. ⓐ와 ⓑ의 값을 비교해 보세요.',
              'ⓑ 전류계의 값을 보세요. 전구 뒤 도선에도 전류가 흘러요.',
            ],
            explain: '측정값이 ⓐ = ⓑ = ⓒ로 모두 같아요. 한 줄로 이어진 회로에서 전류는 <b>소모되지 않아요</b>. (전구에서 빛이 나는 까닭은 전기 에너지 단원에서 배워요.)',
          },
          {
            type: 'quiz',
            title: '전자 모형으로 설명하기',
            goal: '전구를 지난 뒤에도 전류가 줄지 않는 까닭을 전자 모형으로 설명하면?',
            setup() { setShow(true, S.showI); },
            choices: [
              '전구 속에서 전자가 새로 생겨나기 때문',
              '전자가 전구에 쌓이기 때문',
              '전자가 사라지지 않고 회로를 따라 같은 빠르기로 계속 돌기 때문',
              '전원 장치가 전자를 계속 새로 만들어 보내기 때문',
            ],
            answer: 2,
            feedback: [
              '전자는 새로 생기지 않아요. 전구 앞과 뒤의 전자 수를 비교해 보세요.',
              '전자가 전구에 멈춰 있나요? 전구를 지나 계속 움직여요.',
              '',
              '전자는 전원 장치에서 만들어지는 게 아니라 도선 속에 원래 있던 거예요(2단계).',
            ],
            explain: '전자는 사라지거나 새로 생기지 않고, 회로 전체에서 <b>같은 빠르기로</b> 돌아요. 그래서 어느 곳을 지나가는 전자의 양도 같고, 전류의 세기도 같아요.',
          },
        ],
      },
      /* ---------- 4단계 ---------- */
      {
        title: '전압: 물의 흐름 모형', short: '전압', icon: '💧', phase: '모형',
        features: ['voltage', 'water'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전류는 회로 어디서나 같고 소모되지 않는다는 것을 알았어요.</div>' +
          '<p>그럼 전자를 움직이게 하는 것은 무엇일까요? 펌프가 물을 높이 올리면 물이 흐르듯, 전원 장치의 <b>전압</b>이 전류를 흐르게 해요. 물 모형과 나란히 비교해 봐요.</p>',
        setup() { setClosed(true); setV(V_BASE); setShow(true, S.showI); readAll(true); showHint('↔ 전원 장치 손잡이를 끌거나 전압 슬라이더를 움직여 보세요', 7000); },
        recap: '전압은 전류를 흐르게 하는 능력이에요. 전압이 높을수록 전자가 빠르게 이동해 전류가 세지고 전구가 밝아져요.',
        summary: '<ul><li><b>전압</b>: 회로에 전류를 흐르게 하는 능력. 단위 <b>V</b>(볼트)</li>' +
          '<li>물의 흐름 모형: 펌프 ↔ 전원 장치, 높이 차 ↔ 전압, 물의 흐름 ↔ 전류, 물레방아 ↔ 전구, 밸브 ↔ 스위치</li>' +
          '<li>전압이 높을수록 전자가 더 세게 밀려 <b>빠르게</b> 이동한다 → 전류가 세지고 전구가 밝아진다.</li></ul>' +
          '<p class="note">전압이 높아져도 도선 속 전자의 수는 그대로이고, 전자의 이동 속력이 달라진다.</p>',
        missions: [
          {
            title: '높이 차를 바꿔 보자',
            goal: '전압을 <b>5 V 이상</b>으로 높였다가, 다시 <b>1 V 이하</b>로 낮춰 보세요. 물과 전자의 빠르기를 비교해요.',
            hint: '전원 장치의 둥근 손잡이를 오른쪽·위로 끌면 전압이 높아져요. 슬라이더나 −/+ 버튼을 써도 돼요.',
            setup() { setClosed(true); setV(V_BASE); S.vHi = false; S.vLo = false; },
            check: () => { if (S.closed && S.V >= 5) S.vHi = true; if (S.vHi && S.closed && S.V <= 1) S.vLo = true; return S.vHi && S.vLo; },
            status: () => '전압 <b>' + S.V.toFixed(1) + ' V</b> · ' + box(S.vHi) + ' 5 V 이상 · ' + box(S.vLo) + ' 다시 1 V 이하' +
              (S.closed ? '' : '<br><span style="color:#c2410c">🔌 스위치(밸브)를 닫아야 흘러요</span>'),
            hold: 0.6,
            explain: '전압이 높으면 펌프가 물을 더 높이 올려 물이 빠르게 흐르듯, 전자도 <b>빠르게</b> 움직여 전구가 밝아져요. 전압이 낮으면 반대로 느려지고 어두워져요.',
          },
          {
            type: 'quiz',
            title: '펌프는 무엇일까?',
            goal: '물 모형에서 <b>펌프가 물을 높이 올리는 것</b>은 전기 회로의 무엇에 해당할까요?',
            choices: ['도선 속을 흐르는 전류', '전원 장치가 만드는 전압', '빛을 내는 전구', '회로를 잇고 끊는 스위치'],
            answer: 1,
            feedback: [
              '전류는 관 속을 흐르는 "물의 흐름"에 해당해요.',
              '',
              '전구는 흐르는 물이 돌리는 "물레방아"에 해당해요.',
              '스위치는 물길을 열고 닫는 "밸브"에 해당해요.',
            ],
            explain: '펌프가 물을 높이 올려 <b>높이 차</b>를 만들면 물이 흘러요. 마찬가지로 전원 장치가 <b>전압</b>을 걸어 주면 전류가 흘러요.',
          },
          {
            type: 'quiz',
            title: '전압을 높이면 왜 전류가 세질까?',
            goal: '전압을 높였을 때 전류가 세지는 까닭을 전자 모형으로 설명하면?',
            choices: [
              '도선 속 전자의 수가 늘어나기 때문',
              '전자를 더 세게 밀어 주어 전자가 더 빠르게 이동하기 때문',
              '전자 하나하나의 크기가 커지기 때문',
              '전구가 전자를 더 많이 소모하기 때문',
            ],
            answer: 1,
            feedback: [
              '전자는 새로 생기지 않아요. 전압을 높여도 도선 속 전자의 수는 그대로예요.',
              '',
              '전자의 크기는 변하지 않아요. 화면 속 전자의 무엇이 달라졌나요?',
              '3단계에서 확인했듯이 전류(전자)는 전구에서 소모되지 않아요.',
            ],
            explain: '전압은 전자를 미는 능력이에요. 전압이 높을수록 같은 수의 전자가 <b>더 빠르게</b> 이동해, 1초 동안 지나가는 전자의 양(전류)이 많아져요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  setClosed(S.closed);
  SciSim.loop((dt, t) => {
    S.glow += (brightness() - S.glow) * Math.min(1, dt * 10);
    S.swAng += ((S.closed ? 0 : 0.62) - S.swAng) * Math.min(1, dt * 16);
    if (Math.abs(S.swAng) < 0.003) S.swAng = 0;
    S.phase += E_SPEED * amps() * dt;
    const wv = S.closed ? S.V : 0;
    S.wphase += W_SPEED * wv * dt;
    S.wheel += wv * 0.6 * dt;
    S.pump += wv * 0.9 * dt;
    S.offX += (offTarget() - S.offX) * Math.min(1, dt * 5);
    draw();
    updateReadouts(t);
  });
})();
