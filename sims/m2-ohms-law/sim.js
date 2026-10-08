/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전압·전류·저항의 관계  [9과14-02 (뒷부분)]
   ① 관찰: 물질마다 다른 저항(도체·부도체, 반도체 소개)
   → ② 실험: 전압과 전류(비례) → ③ 실험: 저항과 전류(반비례)
   → ④ 적용: 세 양의 관계(옴의 법칙)로 예측하기
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 / 상태 ---------- */
  const V_MAX = 10, V_BASE = 2, R_BASE = 10;
  const V_MAT = 3, R_BULB = 10;               // 물질 시험 회로: 3 V 전원 + 전구(10 Ω)
  const A_SCALE = 1, V_SCALE = 10;            // 전류계 0~1 A, 전압계 0~10 V
  const R_LIST = [10, 20, 30, 40];
  const R_COLORS = { 10: '#2563eb', 20: '#9333ea', 30: '#0891b2', 40: '#d97706' };
  const MATS = [
    { id: 'cu', name: '구리선', R: 0.1, col: '#c2703d' },
    { id: 'al', name: '알루미늄 포일', R: 0.2, col: '#cbd5e1' },
    { id: 'fe', name: '철 못', R: 0.5, col: '#6b7280' },
    { id: 'c', name: '연필심(흑연)', R: 8, col: '#27272a' },
    { id: 'rubber', name: '고무', R: Infinity, col: '#e07b39' },
    { id: 'glass', name: '유리 막대', R: Infinity, col: '#bae6fd' },
    { id: 'wood', name: '나무젓가락', R: Infinity, col: '#d6a76b' },
    { id: 'plastic', name: '플라스틱 자', R: Infinity, col: '#c4b5fd' },
  ];
  const MAT = {}; MATS.forEach((m) => { MAT[m.id] = m; });
  const S = {
    mode: 'material',     // material(물질 시험) | resistor(니크롬선 저항 실험)
    V: V_BASE, R: R_BASE,
    slot: null,           // 집게 사이의 물질 id
    tested: {},           // 시험한 물질 id → 전류
    drag: null,           // 물질 끌기
    knob: null,
    nA: 0, nV: 0, glow: 0,
    data: [],             // 기록: {V, I, R}
    tried: {},            // 3단계: 6 V에서 고른 저항 → 전류
    target: null,
    lockV: null, lockR: null,
  };
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const matAmps = (id) => (id && isFinite(MAT[id].R) ? V_MAT / (R_BULB + MAT[id].R) : 0);
  const amps = () => (S.mode === 'material' ? matAmps(S.slot) : S.V / S.R);
  const volts = () => (S.mode === 'material' ? 0 : S.V);     // 니크롬선 양 끝의 전압(전압계)
  const shownI = () => r2(amps());
  const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
  const brightness = () => (S.mode === 'material' ? clamp(Math.pow(amps() / 0.3, 1.3), 0, 1) * 0.92 : 0);
  const resultOf = (I) => (I >= 0.25 ? { t: '💡 밝게 켜짐', c: '#0b7a41' } : I > 0 ? { t: '💡 약하게 켜짐', c: '#b45309' } : { t: '✖ 안 켜짐', c: '#b91c1c' });

  /* ---------- 열린 도구 ---------- */
  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);

  /* ---------- 회로 배치(가상 좌표) ---------- */
  const G = {
    L: 54, R: 440, T: 150, B: 482,
    box: { x: 160, y: 384, w: 160, h: 128 },
    tN: { x: 188, y: 482 }, tP: { x: 292, y: 482 },
    knob: { x: 240, y: 482, r: 16 },
    bulb: { x: 240, gy: 88, gr: 34 },
    vm: { x: 240, y: 268, r: 58 },
    am: { x: 440, y: 320, r: 58 },
    jL: 150, jR: 330,
    slot: { top: 232, bot: 360 },        // 집게 위치(왼쪽 도선)
    res: { x0: 178, x1: 302 },           // 니크롬선 판
  };
  const LAYOUTS = {
    wide: { w: 800, h: 520, panel: { x: 512, y: 10, w: 278, h: 500 } },
    tall: { w: 500, h: 860, panel: { x: 10, y: 528, w: 480, h: 324 } },
  };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const f = (size, w) => (w || 'bold') + ' ' + size + 'px ' + FONT;
  const WIRE = '#3f4a5c';

  /* ---------- 캔버스 ---------- */
  let view = null, ctx = null, LAY = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  const handlers = {
    hover(p) {
      if (S.mode === 'material') return (tileAt(p) || (S.slot && hitSlot(p))) ? 'grab' : null;
      if (on('voltage') && hitKnob(p)) return S.lockV != null ? 'not-allowed' : 'grab';
      return null;
    },
    down(p) {
      if (S.mode === 'material') {
        const id = tileAt(p);
        if (id) { S.drag = { id, from: 'tray', x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; hideHint(); return true; }
        if (S.slot && hitSlot(p)) { S.drag = { id: S.slot, from: 'slot', x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; hideHint(); return true; }
        return false;
      }
      if (on('voltage') && hitKnob(p)) {
        if (S.lockV != null) { Sound.click(); toast('🔒 이 미션에서는 전압이 ' + S.lockV + ' V로 고정되어 있어요'); return false; }
        S.knob = { x: p.x, y: p.y, V0: S.V };
        hideHint();
        return true;
      }
      return false;
    },
    move(p) {
      if (S.drag) {
        S.drag.x = p.x; S.drag.y = p.y;
        if (Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 10) S.drag.moved = true;
        return;
      }
      if (!S.knob) return;
      const d = (p.x - S.knob.x) - (p.y - S.knob.y);     // 오른쪽·위로 끌면 전압 증가
      setV(S.knob.V0 + d * 0.025);
    },
    up(p) {
      S.knob = null;
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      if (!d.moved) { if (d.from === 'tray') insert(d.id); else removeSample(); return; }
      if (hitSlot(p, 30)) insert(d.id);
      else if (d.from === 'slot') removeSample();
    },
  };
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
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
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }

  function hitKnob(p) { return Math.hypot(p.x - G.knob.x, p.y - G.knob.y) < 30; }
  function hitSlot(p, extra) { const e = extra || 0; return Math.abs(p.x - G.L) < 56 + e && p.y > G.slot.top - 20 - e && p.y < G.slot.bot + 20 + e; }
  // 물질 상자 카드 배치
  function trayLayout() {
    const P = LAY.panel;
    const cols = P.w >= 400 ? 4 : 2, rows = Math.ceil(MATS.length / cols);
    const top = P.y + 52, gap = 8;
    const tw = (P.w - 16 - (cols - 1) * gap) / cols;
    const th = Math.min(100, (P.h - 52 - 34 - (rows - 1) * gap) / rows);
    return MATS.map((m, i) => ({ id: m.id, x: P.x + 8 + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th }));
  }
  function tileAt(p) {
    const t = trayLayout().find((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
    return t ? t.id : null;
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
    const mat = S.mode === 'material';
    if (mat) drawGlow();
    drawWires();
    if (mat) { drawSlot(); drawBulb(); }
    else {
      drawResistor();
      if (on('voltmeter')) drawMeter(G.vm, { max: V_SCALE, major: 5, minor: 1, val: S.nV, letter: 'V', color: '#0891b2', reading: volts().toFixed(1) + ' V' });
    }
    drawMeter(G.am, { max: A_SCALE, major: 0.5, minor: 0.1, val: S.nA, letter: 'A', color: '#7c3aed', reading: shownI().toFixed(2) + ' A', target: S.target && S.target.I, vertical: true });
    drawSupply();
    drawLabels();
    if (mat) drawTray(); else if (on('graph')) drawGraph(LAY.panel);
    // 새로 열린 도구 강조
    if (!mat) {
      if (isNew('voltage')) newCircle(G.knob.x, G.knob.y, G.knob.r + 11, G.knob.x + 44, G.knob.y - 30);
      if (isNew('voltmeter')) newCircle(G.vm.x, G.vm.y, G.vm.r + 8);
      if (isNew('graph')) newRing(LAY.panel.x, LAY.panel.y, LAY.panel.w, LAY.panel.h);
      if (isNew('resistance')) newRing(G.res.x0 - 6, 52, G.res.x1 - G.res.x0 + 12, 120);
    }
    if (S.drag && S.drag.moved) drawDragged();
  }

  function drawWires() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const res = S.mode === 'resistor';
    if (res && on('voltmeter')) {
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(G.jL, G.T); ctx.lineTo(G.jL, G.vm.y); ctx.lineTo(G.vm.x - G.vm.r, G.vm.y);
      ctx.moveTo(G.jR, G.T); ctx.lineTo(G.jR, G.vm.y); ctx.lineTo(G.vm.x + G.vm.r, G.vm.y);
      ctx.stroke();
    }
    ctx.strokeStyle = WIRE; ctx.lineWidth = 5;
    ctx.beginPath();
    // 아래(전원 장치 (−)극) → 왼쪽 도선
    ctx.moveTo(G.tN.x, G.B); ctx.lineTo(G.L, G.B);
    if (res) ctx.lineTo(G.L, G.T); else { ctx.lineTo(G.L, G.slot.bot); ctx.moveTo(G.L, G.slot.top); ctx.lineTo(G.L, G.T); }
    // 위쪽 도선
    if (res) { ctx.lineTo(G.res.x0, G.T); ctx.moveTo(G.res.x1, G.T); ctx.lineTo(G.R, G.T); } else ctx.lineTo(G.R, G.T);
    ctx.lineTo(G.R, G.B); ctx.lineTo(G.tP.x, G.B);
    ctx.stroke();
    if (res && on('voltmeter')) { ctx.fillStyle = WIRE; circle(G.jL, G.T, 6); ctx.fill(); circle(G.jR, G.T, 6); ctx.fill(); }
  }

  // 물질 모양 (가로 막대 기준, 가운데 0,0)
  function drawSample(id, cx, cy, len, vertical, alpha) {
    const m = MAT[id];
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);
    const h = len / 2;
    const rod = (th, fill, stroke) => { ctx.fillStyle = fill; rr(-h, -th / 2, len, th, Math.min(th / 2, 6)); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
    if (id === 'cu') {
      rod(8, m.col, '#8a4b24');
      ctx.strokeStyle = 'rgba(255,220,180,.8)'; ctx.lineWidth = 1.5;
      for (let x = -h + 6; x < h - 4; x += 7) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 4, 4); ctx.stroke(); }
    } else if (id === 'al') {
      rod(20, m.col, '#94a3b8');
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let x = -h + 4; x < h - 4; x += 9) { ctx.moveTo(x, -6); ctx.lineTo(x + 5, 2); ctx.lineTo(x + 2, 7); } ctx.stroke();
    } else if (id === 'fe') {
      ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo(-h + 6, -4); ctx.lineTo(h - 12, -4); ctx.lineTo(h, 0); ctx.lineTo(h - 12, 4); ctx.lineTo(-h + 6, 4); ctx.closePath(); ctx.fill();
      rr(-h, -11, 7, 22, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-h + 8, -2); ctx.lineTo(h - 14, -2); ctx.stroke();
    } else if (id === 'c') {
      rod(7, m.col);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-h + 4, -1.5); ctx.lineTo(h - 4, -1.5); ctx.stroke();
    } else if (id === 'rubber') {
      rod(16, m.col, '#b45309');
    } else if (id === 'glass') {
      rod(13, 'rgba(186,230,253,.85)', '#38bdf8');
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-h + 6, -2.5); ctx.lineTo(h - 6, -2.5); ctx.stroke();
    } else if (id === 'wood') {
      rod(11, m.col, '#a16207');
      ctx.strokeStyle = 'rgba(146,64,14,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-h + 6, -1); ctx.lineTo(h - 10, 1); ctx.moveTo(-h + 14, 2.5); ctx.lineTo(h - 20, 2); ctx.stroke();
    } else if (id === 'plastic') {
      rod(20, 'rgba(196,181,253,.9)', '#8b5cf6');
      ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let x = -h + 6, i = 0; x < h - 3; x += 6, i++) { ctx.moveTo(x, -10); ctx.lineTo(x, i % 5 === 0 ? -2 : -5); } ctx.stroke();
    }
    ctx.restore();
  }

  function clip(x, y, dir, color) {
    // dir: 1 = 아래를 물고 있는 위쪽 집게, -1 = 위를 물고 있는 아래쪽 집게
    ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    rr(x - 10, y - (dir > 0 ? 18 : -2), 20, 16, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, y + (dir > 0 ? -2 : 2)); ctx.lineTo(x, y + dir * 12); ctx.lineTo(x + 10, y + (dir > 0 ? -2 : 2)); ctx.closePath(); ctx.fill();
  }
  function drawSlot() {
    const x = G.L, top = G.slot.top, bot = G.slot.bot;
    const dragging = S.drag && S.drag.moved;
    if (!S.slot || dragging) {
      ctx.save();
      const a = dragging ? 0.4 + 0.5 * pulseA() : 0.6;
      ctx.strokeStyle = dragging ? 'rgba(20,160,88,' + a + ')' : '#c9d2df'; ctx.lineWidth = dragging ? 3 : 2; ctx.setLineDash([6, 5]);
      ctx.fillStyle = dragging ? 'rgba(20,160,88,.08)' : '#f8fafd';
      rr(x - 26, top + 10, 52, bot - top - 20, 10); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (S.slot && !(S.drag && S.drag.from === 'slot' && S.drag.moved)) drawSample(S.slot, x, (top + bot) / 2, bot - top - 4, true);
    clip(x, top + 2, 1, '#dc2626');
    clip(x, bot - 2, -1, '#111827');
    // 이름표
    const lx = x + 36;
    if (S.slot) {
      text(MAT[S.slot].name, lx, (top + bot) / 2 - 6, f(16), '#1b2333');
      const r = resultOf(matAmps(S.slot));
      text(r.t, lx, (top + bot) / 2 + 16, f(14), r.c);
    } else {
      text('집게', lx, (top + bot) / 2 - 6, f(15), '#3a4456');
      text('← 물질을 끼워요', lx, (top + bot) / 2 + 15, f(13, '600'), '#8a95a6');
    }
  }

  function drawResistor() {
    const x0 = G.res.x0, x1 = G.res.x1, y = G.T;
    ctx.fillStyle = '#f5e6c8'; rr(x0, y - 20, x1 - x0, 40, 8); ctx.fill();
    ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 2; ctx.stroke();
    // 단자
    ctx.fillStyle = '#64748b'; circle(x0 + 8, y, 5); ctx.fill(); circle(x1 - 8, y, 5); ctx.fill();
    // 니크롬선 (저항이 클수록 촘촘하게)
    const n = 4 + S.R / 5, a = x0 + 14, b = x1 - 14;
    ctx.strokeStyle = '#7c6a5c'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 8, y); ctx.lineTo(a, y);
    for (let i = 0; i < n; i++) {
      const xa = a + (b - a) * (i + 0.25) / n, xb = a + (b - a) * (i + 0.75) / n;
      ctx.lineTo(xa, y - 11); ctx.lineTo(xb, y + 11);
    }
    ctx.lineTo(b, y); ctx.lineTo(x1 - 8, y); ctx.stroke();
    const col = R_COLORS[S.R] || '#334155';
    text('니크롬선 (저항)', (x0 + x1) / 2, y - 52, f(14), '#3a4456', 'center');
    text('R = ' + S.R + ' Ω', (x0 + x1) / 2, y - 28, f(19, '900'), col, 'center');
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
    const fc = b < 0.5 ? mix('#5b6577', '#ff8a00', b / 0.5) : mix('#ff8a00', '#fff1a8', (b - 0.5) / 0.5);
    if (b > 0.05) { ctx.save(); ctx.shadowColor = 'rgba(255,170,0,.9)'; ctx.shadowBlur = 10 * b; }
    ctx.strokeStyle = fc; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const px = x - 14 + 28 * t, py = gy + 4 - Math.sin(t * Math.PI) * 6 + Math.sin(t * 3 * Math.PI * 2) * 4.5;
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

  function drawMeter(m, o) {
    const cx = m.x, cy = m.y, r = m.r;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; circle(cx, cy, r); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = o.color; ctx.lineWidth = 5; circle(cx, cy, r - 1); ctx.stroke();
    const px = cx, py = cy + 16, ar = 40;
    const a0 = Math.PI * (7 / 6), a1 = Math.PI * (11 / 6);
    const ang = (v) => a0 + (a1 - a0) * clamp(v / o.max, 0, 1.02);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, ar, a0, a1); ctx.stroke();
    const nMinor = Math.round(o.max / o.minor);
    for (let i = 0; i <= nMinor; i++) {
      const v = i * o.minor;
      const major = Math.abs(v / o.major - Math.round(v / o.major)) < 1e-6;
      const a = ang(v), l = major ? 10 : 4;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = major ? 2.2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * ar, py + Math.sin(a) * ar);
      ctx.lineTo(px + Math.cos(a) * (ar - l), py + Math.sin(a) * (ar - l));
      ctx.stroke();
      if (major) {
        const lab = Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1);
        text(lab, px + Math.cos(a) * (ar + 11), py + Math.sin(a) * (ar + 11) + 1, f(13), '#334155', 'center', 'middle');
      }
    }
    if (o.target) {
      const a = ang(o.target.v);
      ctx.strokeStyle = 'rgba(20,160,88,.35)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); ctx.lineTo(px + Math.cos(a) * (ar - 3), py + Math.sin(a) * (ar - 3)); ctx.stroke();
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1)); ctx.stroke();
      ctx.fillStyle = '#14a058'; circle(px + Math.cos(a) * ar, py + Math.sin(a) * ar, 4); ctx.fill();
    }
    const a = ang(o.val);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * 6, py - Math.sin(a) * 6); ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1)); ctx.stroke();
    ctx.fillStyle = '#334155'; circle(px, py, 5); ctx.fill();
    ctx.fillStyle = '#f1f5f9'; rr(cx - 31, cy + 26, 62, 21, 6); ctx.fill();
    text(o.reading, cx, cy + 37, 'bold 14px ' + MONO, '#1b2333', 'center', 'middle');
    const bx = cx - r * 0.72, by = cy - r * 0.72;
    ctx.fillStyle = o.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    circle(bx, by, 12); ctx.fill(); ctx.stroke();
    text(o.letter, bx, by + 1, f(14), '#fff', 'center', 'middle');
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
    text('전원 장치', b.x + b.w / 2, b.y + 17, f(13), '#e2e8f0', 'center');
    ctx.fillStyle = '#0f241a'; rr(b.x + 16, b.y + 24, b.w - 32, 34, 6); ctx.fill();
    ctx.strokeStyle = '#1f3b2c'; ctx.lineWidth = 2; ctx.stroke();
    const shownV = S.mode === 'material' ? V_MAT : S.V;
    text(shownV.toFixed(1) + ' V', b.x + b.w / 2, b.y + 42, 'bold 22px ' + MONO, '#4ade80', 'center', 'middle');
    text('(−)극', G.tN.x, b.y + 76, f(13), '#e2e8f0', 'center');
    text('(+)극', G.tP.x, b.y + 76, f(13), '#fca5a5', 'center');
    [[G.tN, '#111827', '−'], [G.tP, '#dc2626', '+']].forEach(([t, c, s]) => {
      ctx.fillStyle = c; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
      circle(t.x, t.y, 11); ctx.fill(); ctx.stroke();
      text(s, t.x, t.y + 1, f(17, '900'), '#fff', 'center', 'middle');
    });
    if (S.mode === 'material' || !on('voltage')) return;
    const k = G.knob;
    text('전압', k.x, b.y + 76, f(13), '#cbd5e1', 'center');
    const kg = ctx.createRadialGradient(k.x - 4, k.y - 4, 2, k.x, k.y, k.r);
    kg.addColorStop(0, '#f1f5f9'); kg.addColorStop(1, S.lockV != null ? '#7c8799' : '#94a3b8');
    ctx.fillStyle = kg; ctx.strokeStyle = S.knob ? '#f26b3a' : '#1f2937'; ctx.lineWidth = S.knob ? 3.5 : 2;
    circle(k.x, k.y, k.r); ctx.fill(); ctx.stroke();
    const ka = (135 + 270 * S.V / V_MAX) * Math.PI / 180;
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + Math.cos(ka) * (k.r - 3), k.y + Math.sin(ka) * (k.r - 3)); ctx.stroke();
  }

  function drawLabels() {
    if (S.mode === 'material') text('전구', 304, 86, f(15), '#1b2333');
    else if (on('voltmeter')) text('전압계', G.vm.x, G.vm.y + G.vm.r + 20, f(13), '#0e7490', 'center');
    text('전류계', G.am.x - G.am.r - 10, G.am.y - 4, f(13), '#6d28d9', 'right');
    if (S.target && S.target.I) text('🎯 ' + S.target.I.v.toFixed(2) + ' A', G.am.x - G.am.r - 10, G.am.y + 16, f(13), '#0b7a41', 'right');
  }

  // 물질 상자
  function drawTray() {
    const P = LAY.panel;
    panel(P.x, P.y, P.w, P.h);
    text('🧺 물질 상자', P.x + 12, P.y + 24, f(15), '#3a4456');
    text('끌어다 집게에 끼우거나 눌러요', P.x + 12, P.y + 43, f(13, '600'), '#8a95a6');
    const tiles = trayLayout();
    tiles.forEach((t) => {
      const m = MAT[t.id];
      const inSlot = S.slot === t.id;
      const dragging = S.drag && S.drag.moved && S.drag.id === t.id && S.drag.from === 'tray';
      ctx.fillStyle = inSlot ? '#f0fdf4' : '#f8fafd'; rr(t.x, t.y, t.w, t.h, 12); ctx.fill();
      ctx.save();
      if (inSlot) { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; } else { ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; }
      rr(t.x, t.y, t.w, t.h, 12); ctx.stroke();
      ctx.restore();
      const cx = t.x + t.w / 2;
      if (!inSlot) drawSample(t.id, cx, t.y + 24, Math.min(t.w - 34, 92), false, dragging ? 0.3 : 1);
      else text('▶ 집게에 있음', cx, t.y + 28, f(13), '#0b7a41', 'center');
      text(m.name, cx, t.y + 56, f(14), '#1b2333', 'center');
      if (S.tested[t.id] != null) { const r = resultOf(S.tested[t.id]); text(r.t, cx, t.y + Math.min(80, t.h - 12), f(13), r.c, 'center'); }
      else text('?', cx, t.y + Math.min(80, t.h - 12), f(13), '#a3adbd', 'center');
    });
    const n = Object.keys(S.tested).length;
    text('시험한 물질 ' + n + ' / ' + MATS.length, P.x + P.w / 2, P.y + P.h - 12, f(13), '#5d6879', 'center');
  }
  function drawDragged() {
    const d = S.drag;
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(d.x - 60, d.y - 30, 120, 58, 12); ctx.fill();
    ctx.restore();
    drawSample(d.id, d.x, d.y - 10, 92, false);
    text(MAT[d.id].name, d.x, d.y + 18, f(13), '#1b2333', 'center');
  }

  function drawGraph(G2) {
    const { x: gx, y: gy, w: gw, h: gh } = G2;
    panel(gx, gy, gw, gh);
    const pad = { l: 50, r: 16, t: 42, b: 42 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const XM = V_MAX, YM = 1;
    const px = (v) => x0 + (v / XM) * (x1 - x0);
    const py = (i) => y0 - (i / YM) * (y0 - y1);
    text('📈 전압–전류 그래프', gx + 12, gy + 24, f(15), '#3a4456');
    ctx.lineWidth = 1;
    for (let v = 0; v <= XM; v += 2) {
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      text(String(v), px(v), y0 + 17, f(13, '600'), '#5d6879', 'center');
    }
    for (let i = 0; i <= 5; i++) {
      const v = i * 0.2;
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      text(i === 0 ? '0' : v.toFixed(1), x0 - 7, py(v) + 5, f(13, '600'), '#5d6879', 'right');
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 4); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    text('전압 (V)', (x0 + x1) / 2, y0 + 35, f(13), '#5d6879', 'center');
    ctx.save(); ctx.translate(gx + 13, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    text('전류 (A)', 0, 0, f(13), '#5d6879', 'center', 'middle');
    ctx.restore();
    const groups = {};
    S.data.forEach((d) => { (groups[d.R] = groups[d.R] || []).push(d); });
    const Rs = Object.keys(groups).map(Number).sort((a, b) => a - b);
    Rs.forEach((R) => {
      const pts = groups[R].slice().sort((a, b) => a.V - b.V);
      const col = R_COLORS[R] || '#334155';
      if (pts.length > 1) {
        ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.4;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p.V), py(p.I)) : ctx.moveTo(px(p.V), py(p.I)))); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      pts.forEach((p) => { ctx.fillStyle = col; circle(px(p.V), py(Math.min(p.I, YM)), 6); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
    });
    const cx = px(clamp(volts(), 0, XM)), cy = py(clamp(amps(), 0, YM));
    const pulse = 7 + Math.sin(performance.now() / 200) * 2;
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; circle(cx, cy, pulse); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; circle(cx, cy, 3.5); ctx.fill();
    if (Rs.length) {
      Rs.forEach((R, i) => {
        const lx = x0 + 12, ly = y1 + 8 + i * 20;
        ctx.fillStyle = R_COLORS[R] || '#334155'; circle(lx, ly, 6); ctx.fill();
        text(R + ' Ω', lx + 11, ly + 1, f(13), '#3a4456', 'left', 'middle');
      });
    } else {
      text('📍 데이터 기록 버튼을 눌러', (x0 + x1) / 2, y1 + 24, f(13, '600'), '#8a95a6', 'center');
      text('그래프에 점을 찍어 보세요', (x0 + x1) / 2, y1 + 44, f(13, '600'), '#8a95a6', 'center');
    }
  }

  /* ---------- 입력 ---------- */
  const sV = $('#sV');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => (+v).toFixed(1) + ' V', (v) => { S.V = clamp(r1(v), 0, V_MAX); hideHint(); });
  function setV(v, force) {
    if (S.lockV != null && !force) v = S.lockV;
    S.V = clamp(r1(v), 0, V_MAX);
    rangeV.set(S.V);
  }
  function setR(r, force) {
    if (S.lockR != null && !force) r = S.lockR;
    S.R = R_LIST.indexOf(r) >= 0 ? r : R_BASE;
    $$('#rPick button').forEach((b) => {
      const v = +b.dataset.r;
      b.classList.toggle('on', v === S.R);
      b.style.setProperty('--rc', R_COLORS[v]);
    });
    $('#oR').textContent = S.R + ' Ω';
    $('#oR').style.color = R_COLORS[S.R];
  }
  function applyLocks() {
    const lv = S.lockV != null, lr = S.lockR != null;
    sV.disabled = lv;
    $$('.nudge[data-target="V"]').forEach((b) => (b.disabled = lv));
    $('#lockV').hidden = !lv;
    if (lv) $('#lockV').textContent = '🔒 이 미션에서는 전압을 ' + S.lockV + ' V로 고정해요';
    $$('#rPick button').forEach((b) => (b.disabled = lr));
    $('#lockR').hidden = !lr;
    if (lr) $('#lockR').textContent = '🔒 이 미션에서는 저항을 ' + S.lockR + ' Ω으로 고정해요';
  }
  function lock(kind, val) {
    if (kind === 'V') { S.lockV = val; setV(val, true); } else { S.lockR = val; setR(val, true); }
    applyLocks();
  }
  function unlockAll() { S.lockV = null; S.lockR = null; applyLocks(); }

  function setMode(m) {
    S.mode = m;
    S.drag = null; S.knob = null;
    $$('[data-mode]').forEach((n) => { if (n.closest('#modeSeg')) n.classList.toggle('on', n.dataset.mode === m); else n.style.display = n.dataset.mode === m ? '' : 'none'; });
    $('#tbLabel').textContent = m === 'material' ? '🧺 물질 시험: 집게 사이에 물질 끼우기' : '📏 니크롬선 저항 실험';
    $('#tbLabel').hidden = !!(game && game.free);
  }
  function insert(id) {
    S.slot = id;
    S.tested[id] = matAmps(id);
    Sound.tick();
    hideHint();
  }
  function removeSample() { if (S.slot) { S.slot = null; Sound.click(); } }

  $$('.nudge').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    Sound.tick();
    setV(S.V + +b.dataset.d);
    hideHint();
  }));
  setR(S.R, true);
  $$('#rPick button').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    Sound.click();
    setR(+b.dataset.r);
    hideHint();
  }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#emptyBtn').addEventListener('click', removeSample);

  const hintEl = $('#stageHint');
  function showHint(msg, ms) {
    hintEl.textContent = msg; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  $('#recBtn').addEventListener('click', () => {
    if (S.mode !== 'resistor') return;
    Sound.tick();
    const d = { V: S.V, I: r2(amps()), R: S.R };
    const i = S.data.findIndex((q) => q.R === d.R && Math.abs(q.V - d.V) < 0.05);
    if (i >= 0) S.data[i] = d; else S.data.push(d);
    if (S.data.length > 80) S.data.shift();
    toast('📍 기록: ' + d.V.toFixed(1) + ' V, ' + d.I.toFixed(2) + ' A (' + d.R + ' Ω)');
  });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.data = []; });

  /* ---------- 측정값 표시 ---------- */
  const rM = $('#rM'), rV = $('#rV'), rI = $('#rI'), rR = $('#rR');
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    rM.textContent = S.slot ? MAT[S.slot].name : '없음';
    rV.innerHTML = volts().toFixed(1) + '<small>V</small>';
    rI.innerHTML = shownI().toFixed(2) + '<small>A</small>';
    rR.innerHTML = S.R + '<small>Ω' + (on('resistance') ? '' : ' (고정)') + '</small>';
  }

  /* ---------- 미션 도우미 ---------- */
  function distinctV(R) {
    const vals = S.data.filter((d) => d.R === R).map((d) => d.V).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    vals.forEach((v) => { if (v - last >= 0.95) { n++; last = v; } });
    return n;
  }
  const seriesDone = () => R_LIST.filter((R) => distinctV(R) >= 3);
  const ok = (b) => (b ? ' ✅' : '');
  const testedN = () => Object.keys(S.tested).length;

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm2-ohms-law',
    mount: '#game',
    badge: '옴의 법칙 탐구자',
    homeHref: '../../index.html#g2',
    featureLabels: {
      materials: '🧺 물질 상자 · 집게',
      ammeter: 'Ⓐ 전류계',
      voltage: '🔋 전압 조절',
      voltmeter: 'Ⓥ 전압계 (병렬 연결)',
      graph: '📈 그래프 · 📍 데이터 기록',
      resistance: '🧱 니크롬선 바꾸기',
    },
    onFeatures(set) {
      F = set;
      if (!set.has('resistance')) { S.lockR = null; setR(R_BASE, true); }
      applyLocks();
      const free = !!(game && game.free);
      $('#modeSeg').hidden = !free;
      // 1단계는 물질 시험 회로, 2단계부터는 니크롬선 저항 회로 (자유 탐구에서는 직접 고름)
      setMode(free ? S.mode : set.has('voltage') ? 'resistor' : 'material');
    },
    onMissionStart() { S.target = null; unlockAll(); },
    onComplete() { S.target = null; unlockAll(); },
    levels: [
      /* ---------- 1단계 ---------- */
      {
        title: '물질마다 다른 저항', short: '저항', icon: '🧪', phase: '관찰',
        features: ['materials', 'ammeter'],
        intro: '<p><b>🔍 탐구 질문: 전선의 속은 구리로, 겉은 고무나 플라스틱으로 만드는 까닭은 무엇일까?</b></p>' +
          '<p>전구와 전류계를 연결한 회로의 <b>집게</b> 사이에 여러 가지 물질을 끼워, 전류가 잘 흐르는지 확인해 봐요.</p>',
        setup() { setMode('material'); S.slot = null; showHint('👆 물질 카드를 집게 쪽으로 끌어 보세요', 7000); },
        recap: '물질마다 <b>저항</b>이 달라요. 전류가 잘 흐르면 도체, 거의 흐르지 않으면 부도체예요.',
        summary: '<ul><li><b>저항</b>: 전류의 흐름을 방해하는 정도. 단위 <b>Ω</b>(옴). 물질의 종류에 따라 저항이 다르다.</li>' +
          '<li><b>도체</b>: 저항이 작아 전류가 잘 흐르는 물질 (구리·알루미늄·철 같은 금속, 흑연)</li>' +
          '<li><b>부도체(절연체)</b>: 저항이 매우 커서 전류가 거의 흐르지 않는 물질 (고무, 유리, 나무, 플라스틱)</li>' +
          '<li><b>반도체</b>: 도체와 부도체의 중간 성질을 띠는 물질(규소, 저마늄 등). 조건에 따라 전류가 흐르는 정도가 달라져 컴퓨터·스마트폰의 부품, LED 등에 쓰인다.</li></ul>' +
          '<p class="note">전선은 속을 도체(구리)로, 겉을 부도체(고무·플라스틱)로 만들어 감전을 막는다.</p>',
        missions: [
          {
            title: '여러 물질 시험하기',
            goal: '물질 상자의 물질을 집게 사이에 끼워 보세요. <b>6가지</b> 이상 시험해요.',
            hint: '물질 카드를 회로 왼쪽의 집게 쪽으로 끌어다 놓거나, 카드를 한 번 눌러도 끼워져요.',
            setup() { setMode('material'); },
            check: () => testedN() >= 6,
            status: () => '시험한 물질 <b>' + Math.min(6, testedN()) + ' / 6</b>' +
              (testedN() ? '<br><small>' + MATS.filter((m) => S.tested[m.id] != null).map((m) => m.name + ' ' + (S.tested[m.id] > 0 ? '💡' : '✖')).join(' · ') + '</small>' : ''),
            hold: 0.6,
            explain: '구리선, 알루미늄 포일, 철 못, 연필심을 끼우면 전구가 켜지고, 고무, 유리, 나무, 플라스틱을 끼우면 켜지지 않아요.',
          },
          {
            type: 'quiz',
            title: '도체와 부도체',
            goal: '전류가 잘 흐르는 물질을 <b>도체</b>, 거의 흐르지 않는 물질을 <b>부도체</b>라고 해요. 부도체끼리 짝지은 것은?',
            choices: ['구리선, 알루미늄 포일', '고무, 유리, 나무', '연필심, 철 못', '구리선, 플라스틱 자'],
            answer: 1,
            feedback: [
              '구리선과 알루미늄 포일을 끼웠을 때 전구가 켜졌죠? 둘 다 도체예요.',
              '',
              '연필심과 철 못을 끼워도 전구가 켜졌어요. 둘 다 도체예요.',
              '구리선은 전구가 밝게 켜지는 도체예요.',
            ],
            explain: '금속과 흑연은 <b>도체</b>, 고무·유리·나무·플라스틱은 <b>부도체</b>예요. 그래서 전선의 속은 구리로, 겉은 고무나 플라스틱으로 감싸요.',
          },
          {
            type: 'quiz',
            title: '연필심은 왜 어두울까?',
            goal: '연필심을 끼우면 구리선보다 전구가 어둡고 전류도 작아요. 그 까닭은?',
            setup() { setMode('material'); insert('c'); },
            choices: [
              '연필심은 부도체이기 때문',
              '연필심이 구리보다 전류의 흐름을 더 많이 방해하기(저항이 크기) 때문',
              '연필심이 전류를 소모하기 때문',
              '연필심 속에는 전자가 하나도 없기 때문',
            ],
            answer: 1,
            feedback: [
              '전구가 약하게라도 켜졌어요. 전류가 흐르니 연필심은 도체예요.',
              '',
              '전류는 소모되지 않아요(앞 차시 "전류의 모형"). 구리선과 전류계 값을 비교해 보세요.',
              '전자가 없다면 전류가 전혀 흐르지 않겠죠? 연필심에도 전류가 흘러요.',
            ],
            explain: '전류의 흐름을 방해하는 정도가 <b>저항</b>이에요. 연필심은 도체이지만 구리보다 저항이 커요. 도체와 부도체의 중간 성질을 띠는 <b>반도체</b>(규소 등)도 있는데, 컴퓨터와 스마트폰 부품에 쓰여요.',
          },
        ],
      },
      /* ---------- 2단계 ---------- */
      {
        title: '전압과 전류', short: '전압과 전류', icon: '📈', phase: '실험',
        features: ['voltage', 'voltmeter', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질마다 저항이 달라 전류가 흐르는 정도가 다르다는 것을 알았어요.</div>' +
          '<p>이번에는 전구 대신 저항이 <b>10 Ω</b>인 <b>니크롬선</b>을 연결해요. 전압을 바꾸면 전류는 어떻게 달라질까요? 전압계와 전류계로 측정해 그래프로 나타내 봐요.</p>',
        setup() { setMode('resistor'); S.data = []; setR(R_BASE, true); setV(V_BASE); showHint('↔ 전원 장치의 손잡이를 끌거나 슬라이더로 전압을 바꿔요', 7000); },
        recap: '저항이 일정할 때 <b>전류는 전압에 비례</b>해요. 전압–전류 그래프는 원점을 지나는 직선이에요.',
        summary: '<ul><li>전압계는 니크롬선에 <b>병렬</b>로, 전류계는 회로에 <b>직렬</b>로 연결한다.</li>' +
          '<li>저항이 일정할 때 전압을 높이면 전류가 커진다 → <b>전류는 전압에 비례</b>한다.</li>' +
          '<li>전압–전류 그래프: <b>원점을 지나는 직선</b></li></ul>',
        missions: [
          {
            title: '전압을 바꿔 가며 측정하기',
            goal: '전압을 바꿀 때마다 <b>📍 데이터 기록</b>을 눌러, 서로 다른 전압에서 점을 <b>4개</b> 이상 찍으세요.',
            hint: '2 V, 4 V, 6 V, 8 V처럼 1 V 이상씩 바꿔 가며 기록해요. 전원 장치의 손잡이를 끌어도 돼요.',
            setup() { setMode('resistor'); setR(R_BASE, true); },
            check: () => distinctV(R_BASE) >= 4,
            status: () => {
              const pts = S.data.filter((d) => d.R === R_BASE).sort((a, b) => a.V - b.V);
              return '기록한 점 <b>' + Math.min(4, distinctV(R_BASE)) + ' / 4</b>' +
                (pts.length ? '<br><small>' + pts.map((d) => d.V.toFixed(1) + ' V → ' + d.I.toFixed(2) + ' A').join(' · ') + '</small>' : '');
            },
            hold: 0,
            explain: '전압을 높일수록 전류도 커지고, 점들이 한 줄로 반듯하게 늘어서요.',
          },
          {
            type: 'quiz',
            title: '그래프가 말해 주는 것',
            goal: '전압–전류 그래프의 모양과 그 의미로 옳은 것은?',
            choices: [
              '원점을 지나는 직선 → 전류는 전압에 비례한다',
              '오른쪽 아래로 내려가는 곡선 → 전류는 전압에 반비례한다',
              '수평한 직선 → 전압과 관계없이 전류가 일정하다',
              '원점을 지나지 않는 직선 → 0 V에서도 전류가 흐른다',
            ],
            answer: 0,
            feedback: [
              '',
              '점들이 오른쪽 아래로 내려가나요? 전압을 높이면 전류가 어떻게 변했는지 보세요.',
              '전압을 바꾸면 전류계 바늘이 움직였어요. 전류는 일정하지 않아요.',
              '전압을 0 V로 맞추고 전류계를 보세요. 전압이 없으면 전류도 0이에요.',
            ],
            explain: '저항이 일정할 때 <b>전류는 전압에 비례</b>해요. 전압이 2배, 3배가 되면 전류도 2배, 3배가 돼요.',
          },
        ],
      },
      /* ---------- 3단계 ---------- */
      {
        title: '저항과 전류', short: '저항과 전류', icon: '🧱', phase: '실험',
        features: ['resistance'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저항이 일정할 때 전류는 전압에 비례한다는 것을 알았어요.</div>' +
          '<p>이번에는 저항이 다른 니크롬선(10 Ω, 20 Ω, 30 Ω, 40 Ω)으로 바꿔 봐요. 전압이 같을 때 저항이 커지면 전류는 어떻게 될까요?</p>',
        setup() { setMode('resistor'); showHint('🧱 니크롬선의 저항 버튼을 눌러 바꿔 보세요', 7000); },
        recap: '전압이 일정할 때 <b>저항이 클수록 전류가 작아져요</b>(반비례).',
        summary: '<ul><li>전압이 일정할 때 저항이 커지면 전류가 작아진다 → <b>전류는 저항에 반비례</b>한다. (저항 2배 → 전류 ½배)</li>' +
          '<li>전압–전류 그래프에서 저항이 클수록 직선의 기울기가 <b>완만</b>하다.</li></ul>',
        missions: [
          {
            title: '저항을 바꿔 전류 재기',
            goal: '전압은 <b>6 V</b>로 고정했어요. 니크롬선을 <b>3가지</b> 이상 바꿔 보며, 전류가 <b>0.20 A</b>가 되는 저항을 찾으세요.',
            hint: '저항 버튼을 하나씩 눌러 전류계 값을 비교해요. 저항이 클수록 전류는 어떻게 되나요?',
            setup() { setMode('resistor'); lock('V', 6); setR(R_BASE); S.tried = {}; S.target = { I: { v: 0.2, tol: 0.005 } }; },
            check: () => { if (S.V === 6) S.tried[S.R] = shownI(); return Object.keys(S.tried).length >= 3 && S.R === 30 && near(shownI(), 0.2, 0.005); },
            status: () => R_LIST.filter((R) => S.tried[R] != null).map((R) => '<span style="color:' + R_COLORS[R] + '">●</span> ' + R + ' Ω → <b>' + S.tried[R].toFixed(2) + ' A</b>').join(' · ') +
              '<br>비교한 저항 <b>' + Math.min(3, Object.keys(S.tried).length) + ' / 3</b>',
            hold: 0.8,
            explain: '6 V에서 10 Ω → 0.60 A, 20 Ω → 0.30 A, 30 Ω → 0.20 A, 40 Ω → 0.15 A. 저항이 2배, 3배가 되면 전류는 ½, ⅓이 돼요.',
          },
          {
            title: '저항별 그래프 비교',
            goal: '저항이 다른 니크롬선 <b>2가지</b>로 전압–전류 그래프를 그려 비교하세요. (각각 점 3개 이상)',
            hint: '저항을 고른 뒤 전압을 바꾸며 📍 데이터 기록 → 저항을 바꿔 다시 반복해요. 10 Ω과 30 Ω처럼 차이가 큰 값이 비교하기 좋아요.',
            setup() { setMode('resistor'); },
            check: () => seriesDone().length >= 2,
            status: () => {
              const Rs = R_LIST.filter((R) => distinctV(R) > 0);
              return '완성한 직선 <b>' + Math.min(2, seriesDone().length) + ' / 2</b>' +
                (Rs.length ? '<br>' + Rs.map((R) => '<span style="color:' + R_COLORS[R] + '">●</span> ' + R + ' Ω: ' + Math.min(3, distinctV(R)) + '점' + ok(distinctV(R) >= 3)).join(' · ') : '');
            },
            hold: 0,
            explain: '두 그래프 모두 원점을 지나는 직선이지만, <b>저항이 클수록 기울기가 완만</b>해요. 같은 전압에서 전류가 더 작게 흐르기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '저항이 2배가 되면?',
            goal: '전압이 일정할 때 니크롬선의 저항을 <b>2배</b>로 바꾸면 전류는?',
            choices: ['2배가 된다', '½배가 된다', '변하지 않는다', '4배가 된다'],
            answer: 1,
            feedback: [
              '저항은 전류의 흐름을 방해하는 정도예요. 방해가 커지면 전류는? 6 V에서 10 Ω과 20 Ω을 비교해 보세요.',
              '',
              '저항을 바꾸면 전류계 바늘이 움직였죠?',
              '6 V에서 10 Ω → 0.60 A, 20 Ω → ? A. 직접 비교해 보세요.',
            ],
            explain: '전압이 일정하면 <b>전류는 저항에 반비례</b>해요. 6 V에서 10 Ω → 0.6 A, 20 Ω → 0.3 A.',
          },
        ],
      },
      /* ---------- 4단계 ---------- */
      {
        title: '세 양의 관계: 옴의 법칙', short: '적용', icon: '🎯', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계까지</b> 전류는 전압에 비례하고, 저항에 반비례한다는 것을 알아냈어요.</div>' +
          '<p>세 양의 관계를 하나의 식으로 나타내고(<b>옴의 법칙</b>), 이 식으로 실험 결과를 미리 <b>예측</b>해 봐요.</p>',
        setup() { setMode('resistor'); },
        recap: '<b>전류 = 전압 ÷ 저항</b> (V = I × R). 이 관계로 전류를 미리 예측할 수 있어요.',
        summary: '<span class="formula">전류(A) = 전압(V) ÷ 저항(Ω) &nbsp;⇔&nbsp; V = I × R</span>' +
          '<ul><li>전류의 세기는 전압에 비례하고 저항에 반비례한다. 이 관계를 <b>옴의 법칙</b>이라고 한다.</li>' +
          '<li>저항 = 전압 ÷ 전류 → 전압–전류 그래프의 기울기가 완만할수록 저항이 크다.</li></ul>',
        missions: [
          {
            type: 'quiz',
            title: '세 양의 관계 찾기',
            goal: '기록한 점에서 <b>전압 ÷ 전류</b>를 계산해 보세요. (예: 10 Ω에서 6 V ÷ 0.6 A) 어떤 규칙이 있나요?',
            choices: [
              '전압 ÷ 전류는 그 니크롬선의 저항값과 같다',
              '전압 ÷ 전류는 어느 니크롬선이든 항상 10이다',
              '전압 × 전류가 항상 일정하다',
              '전압 ÷ 전류는 측정할 때마다 제각각이다',
            ],
            answer: 0,
            feedback: [
              '',
              '20 Ω 니크롬선에서도 계산해 보세요: 6 V ÷ 0.3 A = ?',
              '10 Ω에서 2 V × 0.2 A와 6 V × 0.6 A를 비교해 보세요. 같은가요?',
              '같은 니크롬선이라면 전압을 바꿔도 전압 ÷ 전류 값이 같아요.',
            ],
            explain: '전압 ÷ 전류 = 저항이에요. 정리하면<span class="formula">전류 = 전압 ÷ 저항 &nbsp;⇔&nbsp; V = I × R</span>이 관계를 <b>옴의 법칙</b>이라고 해요.',
          },
          {
            title: '🎯 계산으로 예측하기',
            goal: '20 Ω 니크롬선에 <b>0.30 A</b>가 흐르려면 전압은 몇 V일까요? 먼저 계산한 뒤, 전압을 맞춰 확인하세요.',
            hint: '전압 = 전류 × 저항 = 0.30 A × 20 Ω',
            setup() { setMode('resistor'); lock('R', 20); setV(V_BASE); S.target = { I: { v: 0.3, tol: 0.005 } }; },
            check: () => S.R === 20 && near(S.V, 6, 0.05) && near(shownI(), 0.3, 0.005),
            status: () => '전압 <b>' + S.V.toFixed(1) + ' V</b> · 전류 <b>' + shownI().toFixed(2) + ' A</b> (목표 0.30 A)',
            hold: 0.8,
            explain: '예측대로 <b>6 V</b>에서 0.30 A가 흘러요. 옴의 법칙을 쓰면 측정하기 전에 결과를 예측할 수 있어요.',
          },
          {
            type: 'quiz',
            title: '옴의 법칙 적용',
            goal: '<b>9 V</b> 전원에 <b>30 Ω</b> 니크롬선을 연결했어요. 흐르는 전류는?',
            choices: ['270 A', '0.3 A', '약 3.3 A', '39 A'],
            answer: 1,
            feedback: [
              '전압 × 저항을 계산했나요? 전류 = 전압 ÷ 저항이에요.',
              '',
              '저항 ÷ 전압을 계산했나요? 전류 = 전압 ÷ 저항이에요.',
              '전압과 저항을 더하면 안 돼요. 전류 = 전압 ÷ 저항이에요.',
            ],
            explain: '전류 = 9 V ÷ 30 Ω = <b>0.3 A</b>. 전압을 9 V, 저항을 30 Ω으로 맞춰 직접 확인해 보세요!',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  setR(S.R, true);
  setMode(S.mode);
  applyLocks();
  SciSim.loop((dt, t) => {
    const k = Math.min(1, dt * 8);
    S.nA += (amps() - S.nA) * k;
    S.nV += (volts() - S.nV) * k;
    S.glow += (brightness() - S.glow) * Math.min(1, dt * 10);
    draw();
    updateReadouts(t);
  });
})();
