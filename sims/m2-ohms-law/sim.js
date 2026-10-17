/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전압·전류·저항의 관계  [9과14-02 (뒷부분)]
   ① 관찰: 물질마다 다른 저항(도체·부도체, 반도체 소개)
   → ② 실험: 전압과 전류(비례) → ③ 실험: 저항과 전류(반비례)
   → ④ 적용: 세 양의 관계(옴의 법칙)로 예측하기
   애니메이션: 전자(파란 점)는 전류에 비례한 속력으로 흐르고, 전류계·전압계 바늘은 스프링처럼 흔들리며 값을 가리켜요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const RM = SciSim.reduceMotion;
  const C = SciSim.color;
  const EASE = SciSim.ease;
  const ap = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));

  /* ---------- 상수 / 상태 ---------- */
  const V_MAX = 10, V_BASE = 2, R_BASE = 10;
  const V_MAT = 3, R_BULB = 10;               // 물질 시험 회로: 3 V 전원 + 전구(10 Ω)
  const A_SCALE = 1, V_SCALE = 10;            // 전류계 0~1 A, 전압계 0~10 V
  const E_SPEED = 160;                        // 전자 표시 속력(px/s) = E_SPEED × 전류(A)
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
  const spr = (v, k, d) => new SciSim.Spring(v, { stiffness: k || 130, damping: d || 9 });
  const S = {
    mode: 'material',     // material(물질 시험) | resistor(니크롬선 저항 실험)
    V: V_BASE, R: R_BASE,
    slot: null,           // 집게 사이의 물질 id
    tested: {},           // 시험한 물질 id → 전류
    drag: null,           // 물질 끌기
    knob: null,
    data: [],             // 기록: {V, I, R}
    tried: {},            // 3단계: 6 V에서 고른 저항 → 전류
    target: null,
    lockV: null, lockR: null,
    // --- 그림용 (부드럽게 따라가는 값) ---
    t: 0, mf: 1, modeRes: 0,
    needA: spr(0, 120, 8), needV: spr(0, 120, 8),
    glowSp: spr(0, 75, 9), glow: 0,
    I: 0, Vd: V_BASE, Rd: R_BASE, gV: 0, gI: 0, heat: 0, phase: 0,
    knobAng: spr((135 + 270 * V_BASE / V_MAX) * Math.PI / 180, 260, 15), knobLift: 0, knobShake: -9,
    samp: { dx: 0, dy: 0, sc: 1 }, clamp: 0, slotShake: -9, resPop: spr(0, 260, 11), platePop: spr(0, 240, 10),
    flyers: [], wrongAt: -9, chk: null, touched: { mat: false, knob: false },
  };
  const T = { knob: 0, vm: 0, graph: 0, tray: 0, res: 0, intro: 0 };
  const TT = {};
  let featInit = false;
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const matAmps = (id) => (id && isFinite(MAT[id].R) ? V_MAT / (R_BULB + MAT[id].R) : 0);
  const amps = () => (S.mode === 'material' ? matAmps(S.slot) : S.V / S.R);
  const volts = () => (S.mode === 'material' ? 0 : S.V);     // 니크롬선 양 끝의 전압(전압계)
  const shownI = () => r2(amps());
  const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;
  // 전구 밝기 = 전구에서 쓰는 전력(P = I²R)에 비례 (눈에 잘 보이도록 약간 완만하게)
  const brightness = () => (S.mode === 'material' ? clamp(Math.pow((amps() * amps() * R_BULB) / 0.9, 0.55), 0, 1) * 0.96 : 0);
  const resultOf = (I) => (I >= 0.25 ? { t: '💡 밝게 켜짐', c: '#0b7a41' } : I > 0 ? { t: '💡 약하게 켜짐', c: '#b45309' } : { t: '✖ 안 켜짐', c: '#b91c1c' });

  /* ---------- 열린 도구 ---------- */
  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);

  /* ---------- 회로 배치(가상 좌표) ---------- */
  const G = {
    L: 54, R: 440, T: 150, B: 482,
    box: { x: 160, y: 370, w: 160, h: 142 },
    tN: { x: 188, y: 482 }, tP: { x: 292, y: 482 },
    knob: { x: 240, y: 482, r: 18 },
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
  const WIRE_P = '#d9434f', WIRE_N = '#3d4a63';

  /* ---------- 경로 도우미 ---------- */
  function roundPoly(pts, r, closed) {
    const n = pts.length, out = [];
    const cnt = closed ? n : n - 2;
    if (!closed) out.push({ x: pts[0].x, y: pts[0].y });
    for (let k = 0; k < cnt; k++) {
      const i = closed ? k : k + 1;
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const l1 = Math.hypot(p0.x - p1.x, p0.y - p1.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const d = Math.min(r, l1 / 2, l2 / 2);
      const a = { x: p1.x + (p0.x - p1.x) / l1 * d, y: p1.y + (p0.y - p1.y) / l1 * d };
      const b = { x: p1.x + (p2.x - p1.x) / l2 * d, y: p1.y + (p2.y - p1.y) / l2 * d };
      for (let s = 0; s <= 8; s++) {
        const u = s / 8, w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
        out.push({ x: a.x * w0 + p1.x * w1 + b.x * w2, y: a.y * w0 + p1.y * w1 + b.y * w2 });
      }
    }
    if (!closed) out.push({ x: pts[n - 1].x, y: pts[n - 1].y });
    return out;
  }
  function makePath(pts, closed) {
    const segs = [];
    let total = 0;
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-6) continue;
      segs.push({ a, b, len, s0: total });
      total += len;
    }
    const out = { x: 0, y: 0 };
    return {
      total,
      at(s) {
        s = ((s % total) + total) % total;
        for (let i = 0; i < segs.length; i++) {
          const g = segs[i];
          if (s <= g.s0 + g.len || i === segs.length - 1) {
            const t = clamp((s - g.s0) / (g.len || 1), 0, 1);
            out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t;
            return out;
          }
        }
        return out;
      },
    };
  }
  // 전자의 이동 방향: (−)극 → 왼쪽 → 위 → 오른쪽 → (+)극
  const loopPath = makePath(roundPoly([
    { x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.T }, { x: G.R, y: G.T }, { x: G.R, y: G.B }, { x: G.tP.x, y: G.B },
  ], 18, true), true);
  const NE = 40;
  const WIRES_MAT = [
    { pts: roundPoly([{ x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.slot.bot }], 18, false), col: WIRE_N },
    { pts: roundPoly([{ x: G.L, y: G.slot.top }, { x: G.L, y: G.T }, { x: 218, y: G.T }], 18, false), col: WIRE_N },
    { pts: roundPoly([{ x: G.tP.x, y: G.B }, { x: G.R, y: G.B }, { x: G.R, y: G.T }, { x: 262, y: G.T }], 18, false), col: WIRE_P },
  ];
  const WIRES_RES = [
    { pts: roundPoly([{ x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.T }, { x: G.res.x0 + 4, y: G.T }], 18, false), col: WIRE_N },
    { pts: roundPoly([{ x: G.tP.x, y: G.B }, { x: G.R, y: G.B }, { x: G.R, y: G.T }, { x: G.res.x1 - 4, y: G.T }], 18, false), col: WIRE_P },
  ];
  const VM_WIRES = [
    roundPoly([{ x: G.jL, y: G.T }, { x: G.jL, y: G.vm.y }, { x: G.vm.x - G.vm.r, y: G.vm.y }], 14, false),
    roundPoly([{ x: G.jR, y: G.T }, { x: G.jR, y: G.vm.y }, { x: G.vm.x + G.vm.r, y: G.vm.y }], 14, false),
  ];
  // 니크롬선 지그재그 (n: 꺾임 횟수, 연속값이라 저항을 바꾸면 부드럽게 변해요)
  function zig(n, u) {
    const q = (((u * n) % 1) + 1) % 1;
    const s = q < 0.25 ? 4 * q : q < 0.75 ? 2 - 4 * q : -4 + 4 * q;
    return -11 * s;
  }
  const zigN = () => 4 + S.Rd / 5;

  /* ---------- 캔버스 ---------- */
  let view = null, ctx = null, D = null, LAY = null, bgPat = null;
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
        if (id) { startDrag(id, 'tray', p); return true; }
        if (S.slot && hitSlot(p)) { startDrag(S.slot, 'slot', p); return true; }
        return false;
      }
      if (on('voltage') && T.knob > 0.5 && hitKnob(p)) {
        if (S.lockV != null) { Sound.fail(); S.knobShake = S.t; toast('🔒 이 미션에서는 전압이 ' + S.lockV + ' V로 고정되어 있어요'); return false; }
        S.knob = { x: p.x, y: p.y, V0: S.V }; S.touched.knob = true;
        Sound.tick();
        hideHint();
        return true;
      }
      return false;
    },
    move(p) {
      if (S.drag) {
        S.drag.x = p.x; S.drag.y = p.y;
        if (!S.drag.moved && Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 10) { S.drag.moved = true; Sound.tick(); }
        return;
      }
      if (!S.knob) return;
      const d = (p.x - S.knob.x) - (p.y - S.knob.y);     // 오른쪽·위로 끌면 전압 증가
      const before = S.V;
      setV(S.knob.V0 + d * 0.025);
      if (Math.floor(S.V) !== Math.floor(before)) Sound.tick();
    },
    up(p) {
      S.knob = null;
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      if (!d.moved) { if (d.from === 'tray') insert(d.id, tileCenter(d.id)); else removeSample(); return; }
      if (hitSlot(p, 30)) insert(d.id, { x: d.px, y: d.py });
      else if (d.from === 'slot') removeSample({ x: d.px, y: d.py });
      else flyBack(d.id, d.px, d.py);
    },
  };
  function startDrag(id, from, p) {
    S.drag = { id, from, x: p.x, y: p.y, sx: p.x, sy: p.y, px: p.x, py: p.y, moved: false, lift: 0, tilt: 0 };
    S.touched.mat = true;
    hideHint();
  }
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
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: '#ebf2fa' });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    bgPat = ctx.createPattern(BG_TILE, 'repeat');
    SciSim.pointer(view, handlers);
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
    if (T.tray < 0.5) return null;
    const t = trayLayout().find((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
    return t ? t.id : null;
  }
  function tileCenter(id) {
    const t = trayLayout().find((r) => r.id === id);
    return t ? { x: t.x + t.w / 2, y: t.y + 24 } : { x: LAY.panel.x + 60, y: LAY.panel.y + 60 };
  }

  /* ---------- 미리 그려 둔 스프라이트 ---------- */
  const SPR = 3;
  function mk(size, fn) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * SPR);
    const x = c.getContext('2d');
    x.scale(SPR, SPR);
    fn(x, SciSim.draw(x));
    return c;
  }
  const spE = mk(20, (x, d) => {
    d.sphere(10, 10, 6.6, '#2f62f0', { light: '#b4cbff', dark: '#14308a' });
    x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 1.3; x.beginPath(); x.arc(10, 10, 6.6, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(6.9, 10.2); x.lineTo(13.1, 10.2); x.stroke();
  });
  const BG_TILE = mk(28, (x) => { x.fillStyle = 'rgba(100,125,165,.16)'; x.beginPath(); x.arc(14, 14, 1.3, 0, Math.PI * 2); x.fill(); });
  function blit(sp, size, x, y, k, a) {
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.drawImage(sp, x - size * k / 2, y - size * k / 2, size * k, size * k);
    ctx.globalAlpha = 1;
  }

  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  const fx = new SciSim.Particles();

  /* ---------- 그리기 도우미 ---------- */
  function text(str, x, y, font, color, align, base, stroke) {
    ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic';
    if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  function strokePath(pts, closed) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y);
    if (closed) ctx.closePath();
  }
  function wire(pts, base, w) {
    w = w || 7;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokePath(pts);
    ctx.shadowColor = 'rgba(25,40,75,.3)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 4;
    ctx.strokeStyle = C.shade(base, -0.5); ctx.lineWidth = w + 3; ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = base; ctx.lineWidth = w; ctx.stroke();
    ctx.translate(-1.2, -1.5);
    strokePath(pts);
    ctx.strokeStyle = C.rgba(C.shade(base, 0.6), 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function metalGrad(x0, y0, x1, y1, c) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.shade(c, 0.5)); g.addColorStop(0.45, c); g.addColorStop(1, C.shade(c, -0.4));
    return g;
  }
  const pulseA = () => 0.5 + 0.5 * Math.sin(S.t * 6);
  function newRing(x, y, w, h, badge) {
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + pulseA() * 0.5) + ')'; ctx.lineWidth = 4;
    D.roundRect(x - 5, y - 5, w + 10, h + 10, 16); ctx.stroke();
    if (badge !== false) D.label(Math.min(x + w - 22, view.vw - 30), Math.max(14, y - 4), 'NEW', { bg: '#f26b3a', color: '#fff', size: 13 });
    ctx.restore();
  }
  function newCircle(x, y, r, bx, by) {
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + pulseA() * 0.5) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    if (bx !== false) D.label(bx != null ? bx : x + r * 0.72, by != null ? by : y - r * 0.85, 'NEW', { bg: '#f26b3a', color: '#fff', size: 13 });
    ctx.restore();
  }

  /* ---------- 그리기 ---------- */
  function backdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, LAY.h);
    g.addColorStop(0, '#e9f0fa'); g.addColorStop(1, '#eef4fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LAY.w, LAY.h);
    ctx.save(); ctx.scale(1 / 2, 1 / 2); ctx.fillStyle = bgPat; ctx.fillRect(0, 0, LAY.w * 2, LAY.h * 2); ctx.restore();
    if (S.glow > 0.02) {
      const bx = G.bulb.x, by = G.bulb.gy + 40, R = 190 + 120 * S.glow;
      const lg = ctx.createRadialGradient(bx, by, 10, bx, by, R);
      lg.addColorStop(0, 'rgba(255,228,140,' + (0.42 * S.glow) + ')'); lg.addColorStop(1, 'rgba(255,228,140,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, LAY.w, LAY.h);
    }
  }

  function draw() {
    view.clear();
    backdrop();
    const mat = S.mode === 'material';
    const sh = RM ? 0 : Math.sin((S.t - S.wrongAt) * 38) * 4 * Math.exp(-(S.t - S.wrongAt) * 7) * ((S.t - S.wrongAt) < 0.7 ? 1 : 0);
    ctx.save();
    ctx.translate(sh, (1 - S.mf) * 12);
    ctx.globalAlpha = clamp(S.mf * T.intro, 0, 1);
    if (mat) drawGlow();
    drawSupply();
    (mat ? WIRES_MAT : WIRES_RES).forEach((w) => wire(w.pts, w.col));
    if (mat) { drawSlot(); drawBulb(); }
    else {
      drawResistor();
      if (T.vm > 0.02) drawVoltmeterWires();
    }
    drawDots();
    drawPosts();
    drawDial(G.am, { max: A_SCALE, major: 0.5, minor: 0.1, val: S.needA.value, letter: 'A', color: '#7c3aed', reading: S.I.toFixed(2) + ' A', target: S.target && S.target.I, vertical: true, s: 1 });
    if (!mat && T.vm > 0.02) drawDial(G.vm, { max: V_SCALE, major: 5, minor: 1, val: S.needV.value, letter: 'V', color: '#0891b2', reading: S.gV.toFixed(1) + ' V', s: T.vm });
    drawLabels();
    drawLegend();
    if (!mat) {
      if (isNew('voltage') && T.knob > 0.8) newCircle(G.knob.x, G.knob.y, G.knob.r + 15, false);
      if (isNew('voltmeter') && T.vm > 0.8) newCircle(G.vm.x, G.vm.y, G.vm.r + 8);
      if (isNew('resistance')) newRing(G.res.x0 - 6, 52, G.res.x1 - G.res.x0 + 12, 120);
    }
    ctx.restore();
    if (mat) drawTray(); else if (T.graph > 0.01) drawGraph(LAY.panel, T.graph);
    if (!mat && isNew('graph') && T.graph > 0.9) newRing(LAY.panel.x, LAY.panel.y, LAY.panel.w, LAY.panel.h);
    drawFlyers();
    if (S.drag && S.drag.moved) drawDragged();
    fx.draw(ctx);
    drawCheck();
  }

  /* ----- 전자(파란 점): 속력은 전류에 비례 ----- */
  function drawDots() {
    const mat = S.mode === 'material', gap = loopPath.total / NE, t = S.t;
    const a = mat ? 1 : 1, x0 = G.res.x0 + 14, x1 = G.res.x1 - 14, n = zigN();
    const conductor = mat && S.slot && isFinite(MAT[S.slot].R);
    const jam = conductor ? 1 + Math.min(3.5, MAT[S.slot].R * 0.4) : 1;
    for (let i = 0; i < NE; i++) {
      const p = loopPath.at(i * gap + S.phase);
      let px = p.x, py = p.y, al = a;
      if (Math.abs(py - G.B) < 1.5 && px > G.tN.x - 2 && px < G.tP.x + 2) continue;
      if (Math.hypot(px - G.am.x, py - G.am.y) < G.am.r + 3) continue;
      let amp = 1.1;
      if (mat) {
        if (Math.abs(py - G.T) < 1.5 && px > 214 && px < 266) continue;
        if (Math.abs(px - G.L) < 1.5 && py > G.slot.top + 2 && py < G.slot.bot - 2) {
          if (!conductor) continue;
          al = S.clamp * 0.95; amp = jam;
        }
      } else if (Math.abs(py - G.T) < 1.5 && px > G.res.x0 + 4 && px < G.res.x1 - 4) {
        if (px < x0 || px > x1) { al = 1; } else py += zig(n, (px - x0) / (x1 - x0));
      }
      if (al <= 0.01) continue;
      if (!RM) { px += Math.sin(t * 2.9 + i * 1.9) * amp; py += Math.cos(t * 2.3 + i * 2.7) * amp; }
      blit(spE, 20, px, py, 0.9, al * clamp(S.mf * 1.5, 0, 1));
    }
  }
  function drawLegend() {
    const x = 12, y = 12;
    ctx.font = f(13);
    const label = '전자의 이동 (전류가 셀수록 빨라요)';
    const w = ctx.measureText(label).width + 52;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.94)'; D.roundRect(x, y, w, 32, 16); ctx.fill(); }, { blur: 8, y: 2, color: 'rgba(25,40,75,.16)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, 32, 16); ctx.stroke();
    blit(spE, 20, x + 20, y + 16, 0.95);
    text(label, x + 36, y + 17, f(13), '#1d4ed8', 'left', 'middle');
  }

  /* ----- 물질 집게 ----- */
  function clip(x, y, dir, color, open) {
    // dir: 1 = 아래를 물고 있는 위쪽 집게, -1 = 위를 물고 있는 아래쪽 집게
    const oy = dir * -open * 9;
    ctx.save(); ctx.translate(0, oy);
    D.shadow(() => {
      ctx.fillStyle = metalGrad(x - 10, y, x + 10, y, '#c7cfdb');
      ctx.beginPath(); ctx.moveTo(x - 10, y + (dir > 0 ? -2 : 2)); ctx.lineTo(x, y + dir * 13); ctx.lineTo(x + 10, y + (dir > 0 ? -2 : 2)); ctx.closePath(); ctx.fill();
    }, { blur: 5, y: 2 });
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0); g.addColorStop(0, C.shade(color, 0.45)); g.addColorStop(0.5, color); g.addColorStop(1, C.shade(color, -0.4));
    ctx.fillStyle = g; D.roundRect(x - 11, y - (dir > 0 ? 20 : -2), 22, 18, 5); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(x - 7, y - (dir > 0 ? 17 : -5), 5, 12, 2); ctx.fill();
    ctx.restore();
  }
  function drawSlot() {
    const x = G.L, top = G.slot.top, bot = G.slot.bot, mid = (top + bot) / 2;
    const dragging = S.drag && S.drag.moved;
    const hot = dragging && hitSlot({ x: S.drag.px, y: S.drag.py }, 30);
    const sk = RM ? 0 : Math.sin((S.t - S.slotShake) * 50) * 4 * Math.exp(-(S.t - S.slotShake) * 8) * ((S.t - S.slotShake) < 0.6 ? 1 : 0);
    if (!S.slot || dragging) {
      ctx.save();
      const a = hot ? 0.9 : dragging ? 0.55 + 0.3 * pulseA() : 0.6;
      ctx.strokeStyle = dragging ? 'rgba(20,160,88,' + a + ')' : '#bcc7d8'; ctx.lineWidth = hot ? 3.5 : 2.5; ctx.setLineDash([6, 5]);
      ctx.fillStyle = hot ? 'rgba(20,160,88,.16)' : dragging ? 'rgba(20,160,88,.08)' : 'rgba(255,255,255,.7)';
      D.roundRect(x - 26, top + 10, 52, bot - top - 20, 12); ctx.fill(); ctx.stroke();
      ctx.restore();
      if ((dragging || (!S.touched.mat && !S.slot)) && !RM) {       // 목표 지점이 맥박처럼 퍼져 나가요
        const k = (S.t * 1.2) % 1;
        ctx.strokeStyle = 'rgba(20,160,88,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 3;
        D.roundRect(x - 26 - k * 12, top + 10 - k * 12, 52 + k * 24, bot - top - 20 + k * 24, 12 + k * 6); ctx.stroke();
      }
    }
    ctx.save(); ctx.translate(sk, 0);
    if (S.slot && !(S.drag && S.drag.from === 'slot' && S.drag.moved)) {
      ctx.fillStyle = 'rgba(255,255,255,.8)'; D.roundRect(x - 17, top + 8, 34, bot - top - 16, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(160,175,200,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save();
      ctx.translate(x + S.samp.dx, mid + S.samp.dy); ctx.scale(S.samp.sc, S.samp.sc);
      drawSample(S.slot, 0, 0, bot - top - 4, true, 1, S.samp.sc > 1.02 || S.samp.dx !== 0 ? { shadow: true } : null);
      ctx.restore();
    }
    clip(x, top + 2, 1, '#dc2626', 1 - S.clamp);
    clip(x, bot - 2, -1, '#1f2937', 1 - S.clamp);
    ctx.restore();
    // 이름표
    const lx = x + 38;
    if (S.slot) {
      const r = resultOf(matAmps(S.slot));
      text(MAT[S.slot].name, lx, mid - 6, f(16), '#1b2333', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
      ctx.save(); const sc = 1 + S.resPop.value * 0.15; ctx.translate(lx, mid + 20); ctx.scale(sc, sc);
      D.label(0, 0, r.t, { bg: '#fff', color: r.c, size: 13, border: r.c, align: 'left' });
      ctx.restore();
    } else {
      text('집게', lx, mid - 6, f(15), '#3a4456', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
      text('← 물질을 끼워요', lx, mid + 15, f(13, '600'), '#6b7689', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
    }
  }

  /* ----- 물질 모양 (가로 막대 기준, 가운데 0,0) ----- */
  function drawSample(id, cx, cy, len, vertical, alpha, o) {
    const m = MAT[id];
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);
    if (o && o.shadow) { ctx.shadowColor = 'rgba(20,40,80,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = vertical ? 0 : 6; ctx.shadowOffsetX = vertical ? 6 : 0; }
    const h = len / 2;
    const cyl = (th, c, r, stroke) => {
      const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
      g.addColorStop(0, C.shade(c, 0.6)); g.addColorStop(0.35, c); g.addColorStop(1, C.shade(c, -0.45));
      ctx.fillStyle = g; D.roundRect(-h, -th / 2, len, th, r != null ? r : Math.min(th / 2, 6)); ctx.fill();
      ctx.save(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = stroke || C.shade(c, -0.55); ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
    };
    const gloss = (th, a) => { ctx.fillStyle = 'rgba(255,255,255,' + (a || 0.5) + ')'; D.roundRect(-h + 5, -th / 2 + 1.5, len - 10, Math.max(1.5, th * 0.18), th * 0.1); ctx.fill(); };
    if (id === 'cu') {
      cyl(9, m.col);
      ctx.strokeStyle = 'rgba(255,225,190,.8)'; ctx.lineWidth = 1.3;
      for (let x = -h + 6; x < h - 4; x += 7) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 4, 4); ctx.stroke(); }
      gloss(9, 0.55);
    } else if (id === 'al') {
      cyl(20, m.col, 5, '#94a3b8');
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); for (let x = -h + 4; x < h - 4; x += 9) { ctx.moveTo(x, -6); ctx.lineTo(x + 5, 2); ctx.lineTo(x + 2, 7); } ctx.stroke();
      ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let x = -h + 8; x < h - 4; x += 9) { ctx.moveTo(x, -8); ctx.lineTo(x - 3, 0); ctx.lineTo(x, 8); } ctx.stroke();
    } else if (id === 'fe') {
      const g = ctx.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, '#d5dae3'); g.addColorStop(0.4, '#8b94a3'); g.addColorStop(1, '#4b5563');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-h + 6, -4); ctx.lineTo(h - 12, -4); ctx.lineTo(h, 0); ctx.lineTo(h - 12, 4); ctx.lineTo(-h + 6, 4); ctx.closePath(); ctx.fill();
      const g2 = ctx.createLinearGradient(0, -11, 0, 11); g2.addColorStop(0, '#e3e7ee'); g2.addColorStop(0.5, '#8b94a3'); g2.addColorStop(1, '#4b5563');
      ctx.fillStyle = g2; D.roundRect(-h, -11, 7, 22, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-h + 8, -2); ctx.lineTo(h - 14, -2); ctx.stroke();
    } else if (id === 'c') {
      cyl(11, '#5a5a66');
      gloss(11, 0.5);
    } else if (id === 'rubber') {
      cyl(18, m.col, 7, '#b45309'); gloss(18, 0.4);
    } else if (id === 'glass') {
      const g = ctx.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, 'rgba(240,250,255,.95)'); g.addColorStop(0.5, 'rgba(186,230,253,.75)'); g.addColorStop(1, 'rgba(125,190,230,.8)');
      ctx.fillStyle = g; D.roundRect(-h, -7, len, 14, 7); ctx.fill();
      ctx.save(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-h + 7, -3); ctx.lineTo(h - 7, -3); ctx.stroke();
    } else if (id === 'wood') {
      cyl(12, m.col, 5, '#a16207');
      ctx.strokeStyle = 'rgba(146,64,14,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-h + 6, -1); ctx.lineTo(h - 10, 1); ctx.moveTo(-h + 14, 2.5); ctx.lineTo(h - 20, 2); ctx.stroke();
      gloss(12, 0.3);
    } else if (id === 'plastic') {
      const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, 'rgba(221,214,254,.95)'); g.addColorStop(1, 'rgba(167,139,250,.9)');
      ctx.fillStyle = g; D.roundRect(-h, -10, len, 20, 5); ctx.fill();
      ctx.save(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let x = -h + 6, i = 0; x < h - 3; x += 6, i++) { ctx.moveTo(x, -10); ctx.lineTo(x, i % 5 === 0 ? -2 : -5); } ctx.stroke();
      gloss(20, 0.3);
    }
    ctx.restore();
  }

  /* ----- 니크롬선 저항 ----- */
  function drawResistor() {
    const x0 = G.res.x0, x1 = G.res.x1, y = G.T;
    const heat = S.heat;
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, y - 22, 0, y + 22); g.addColorStop(0, '#fbf0d9'); g.addColorStop(1, '#e3cb9a');
      ctx.fillStyle = g; D.roundRect(x0, y - 22, x1 - x0, 44, 9); ctx.fill();
    }, { blur: 9, y: 4, color: 'rgba(25,40,75,.28)' });
    ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 2; D.roundRect(x0, y - 22, x1 - x0, 44, 9); ctx.stroke();
    ctx.fillStyle = 'rgba(120,85,40,.14)'; D.roundRect(x0 + 16, y - 17, x1 - x0 - 32, 34, 6); ctx.fill();
    if (heat > 0.02) D.glow((x0 + x1) / 2, y, 70, '#ff8a3d', 0.35 * heat);
    // 단자
    [x0 + 8, x1 - 8].forEach((tx) => { D.sphere(tx, y, 5.5, '#aab4c4', { gloss: true, outline: '#64748b', outlineWidth: 1.2 }); });
    // 니크롬선 (저항이 클수록 촘촘하게, 전류가 셀수록 살짝 달아올라요)
    const n = zigN(), a = x0 + 14, b = x1 - 14;
    ctx.save();
    if (heat > 0.05) { ctx.shadowColor = 'rgba(255,120,40,.9)'; ctx.shadowBlur = 10 * heat; }
    ctx.strokeStyle = C.mix('#7c6a5c', '#ff7a2f', heat); ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 8, y); ctx.lineTo(a, y);
    const steps = 150;
    for (let i = 0; i <= steps; i++) { const u = i / steps; ctx.lineTo(a + (b - a) * u, y + zig(n, u)); }
    ctx.lineTo(b, y); ctx.lineTo(x1 - 8, y); ctx.stroke();
    ctx.restore();
    const col = R_COLORS[S.R] || '#334155';
    const pop = 1 + S.platePop.value * 0.12;
    text('니크롬선 (저항)', (x0 + x1) / 2, y - 52, f(14), '#3a4456', 'center', 'alphabetic', 'rgba(255,255,255,.85)');
    ctx.save(); ctx.translate((x0 + x1) / 2, y - 31); ctx.scale(pop, pop);
    text('R = ' + Math.round(S.Rd) + ' Ω', 0, 0, f(19, '900'), col, 'center', 'middle', 'rgba(255,255,255,.9)');
    ctx.restore();
  }
  function drawVoltmeterWires() {
    ctx.save(); ctx.globalAlpha *= clamp(T.vm, 0, 1);
    VM_WIRES.forEach((w) => wire(w, '#4b8fa8', 4));
    [G.jL, G.jR].forEach((jx) => D.sphere(jx, G.T, 6, '#aab4c4', { gloss: true, outline: '#475569', outlineWidth: 1.4 }));
    ctx.restore();
  }

  /* ----- 전구 ----- */
  function drawGlow() {
    const b = S.glow;
    if (b < 0.01) return;
    const x = G.bulb.x, y = G.bulb.gy;
    const R = 46 + 62 * b;
    const g = ctx.createRadialGradient(x, y, 8, x, y, R);
    g.addColorStop(0, 'rgba(255,238,150,' + Math.min(1, 0.3 + 0.7 * b) + ')');
    g.addColorStop(0.5, 'rgba(255,214,80,' + (0.45 * b) + ')');
    g.addColorStop(1, 'rgba(255,205,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    if (b > 0.1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,170,0,' + Math.min(0.85, b) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const wob = RM ? 0 : Math.sin(S.t * 3) * 0.04;
      for (let i = 0; i < 12; i++) {
        const ang = -Math.PI / 2 + (i - 5.5) * (Math.PI / 7.5) + wob;
        if (Math.sin(ang) > 0.45) continue;
        const r0 = G.bulb.gr + 10, r1v = r0 + 8 + 20 * b + (RM ? 0 : Math.sin(S.t * 5 + i) * 2);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
        ctx.lineTo(x + Math.cos(ang) * r1v, y + Math.sin(ang) * r1v);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawBulb() {
    const x = G.bulb.x, gy = G.bulb.gy, gr = G.bulb.gr, b = clamp(S.glow, 0, 1.15), bb = Math.min(1, b);
    D.shadow(() => {
      const sg = ctx.createLinearGradient(x - 23, 0, x + 23, 0); sg.addColorStop(0, '#e9edf3'); sg.addColorStop(0.5, '#fbfcfe'); sg.addColorStop(1, '#c4cdda');
      ctx.fillStyle = sg; D.roundRect(x - 23, G.T - 13, 46, 30, 7); ctx.fill();
    }, { blur: 7, y: 4, color: 'rgba(25,40,75,.3)' });
    ctx.strokeStyle = '#a8b3c4'; ctx.lineWidth = 1.5; D.roundRect(x - 23, G.T - 13, 46, 30, 7); ctx.stroke();
    const cg = ctx.createLinearGradient(x - 15, 0, x + 15, 0); cg.addColorStop(0, '#8b97aa'); cg.addColorStop(0.4, '#e4e9f1'); cg.addColorStop(1, '#707d92');
    ctx.fillStyle = cg; D.roundRect(x - 15, 121, 30, 20, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(70,82,100,.6)'; ctx.lineWidth = 1.5; D.roundRect(x - 15, 121, 30, 20, 4); ctx.stroke();
    ctx.beginPath(); for (let yy = 127; yy <= 137; yy += 5) { ctx.moveTo(x - 14, yy); ctx.lineTo(x + 14, yy + 1.6); } ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, gy, gr, Math.PI * 0.68, Math.PI * 0.32);
    ctx.lineTo(x + 12, 123); ctx.lineTo(x - 12, 123); ctx.closePath();
    const gg = ctx.createRadialGradient(x - 11, gy - 13, 3, x, gy, gr * 1.1);
    gg.addColorStop(0, bb > 0.02 ? C.mix('#ffffff', '#fffbe0', Math.min(1, bb * 1.5)) : 'rgba(255,255,255,.9)');
    gg.addColorStop(0.55, bb > 0.02 ? C.mix('#dee8f6', '#ffe9a0', Math.min(1, bb * 1.5)) : 'rgba(222,232,246,.62)');
    gg.addColorStop(1, bb > 0.02 ? C.mix('#b0c2dc', '#ffc94d', Math.min(1, bb * 1.4)) : 'rgba(176,194,220,.55)');
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = bb > 0.01 ? C.mix('#8b9bb2', '#d99a00', bb) : '#8b9bb2'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, 123); ctx.lineTo(x - 14, gy + 4); ctx.moveTo(x + 5, 123); ctx.lineTo(x + 14, gy + 4); ctx.stroke();
    const fc = bb < 0.5 ? C.mix('#5b6577', '#ff8a00', bb / 0.5) : C.mix('#ff8a00', '#fff6c8', (bb - 0.5) / 0.5);
    ctx.save();
    if (bb > 0.05) { ctx.shadowColor = 'rgba(255,170,0,.95)'; ctx.shadowBlur = 12 * bb; }
    ctx.strokeStyle = fc; ctx.lineWidth = 2.3; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const px = x - 14 + 28 * t, py = gy + 4 - Math.sin(t * Math.PI) * 6 + Math.sin(t * 3 * Math.PI * 2) * 4.5;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, gy, gr - 7, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, gy, gr - 7, Math.PI * 0.05, Math.PI * 0.22); ctx.stroke();
  }

  /* ----- 계기판 (바늘이 스프링처럼 흔들려요) ----- */
  function drawDial(m, o) {
    const r = m.r, s = o.s == null ? 1 : o.s;
    if (s <= 0.02) return;
    ctx.save();
    ctx.translate(m.x, m.y); ctx.scale(Math.max(0.01, s), Math.max(0.01, s));
    ctx.globalAlpha *= clamp(s * 1.4, 0, 1);
    D.shadow(() => {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 4, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8edf5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }, { blur: 14, y: 5, color: 'rgba(25,40,75,.3)' });
    ctx.strokeStyle = o.color; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, Math.PI * 2); ctx.stroke();
    const px = 0, py = 16, ar = 40;
    const a0 = Math.PI * (7 / 6), a1 = Math.PI * (11 / 6);
    const ang = (v) => a0 + (a1 - a0) * clamp(v / o.max, -0.03, 1.08);
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
      const a = ang(o.target.v), pu = RM ? 1 : 0.7 + 0.3 * Math.sin(S.t * 4);
      ctx.strokeStyle = 'rgba(20,160,88,' + (0.3 * pu) + ')'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); ctx.lineTo(px + Math.cos(a) * (ar - 3), py + Math.sin(a) * (ar - 3)); ctx.stroke();
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1)); ctx.stroke();
      D.sphere(px + Math.cos(a) * ar, py + Math.sin(a) * ar, 4.5, '#14a058', { gloss: false });
    }
    const a = ang(o.val);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * 6, py - Math.sin(a) * 6); ctx.lineTo(px + Math.cos(a) * (ar + 1), py + Math.sin(a) * (ar + 1)); ctx.stroke();
    ctx.restore();
    D.sphere(px, py, 5.5, '#334155', { gloss: true });
    // 유리 반사
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 6, 0, Math.PI * 2); ctx.clip();
    const rg = ctx.createLinearGradient(-r, -r, r * 0.4, r * 0.2); rg.addColorStop(0, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(-8, -30, r * 0.85, r * 0.36, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#eef2f8'; D.roundRect(-31, 26, 62, 21, 6); ctx.fill();
    text(o.reading, 0, 37, 'bold 14px ' + MONO, '#1b2333', 'center', 'middle');
    const bx = -r * 0.72, by = -r * 0.72;
    D.sphere(bx, by, 12.5, o.color, { text: o.letter, textScale: 1.1, outline: '#fff', outlineWidth: 2.5, gloss: false });
    let tp, tn;
    if (o.vertical) { tp = { x: 0, y: r }; tn = { x: 0, y: -r }; } else { tp = { x: r, y: 0 }; tn = { x: -r, y: 0 }; }
    [[tp, '#dc2626', '+'], [tn, '#1f2937', '−']].forEach(([t, c, sg]) => {
      D.sphere(t.x, t.y, 7.2, c, { outline: '#fff', outlineWidth: 2, gloss: true });
      const lx = o.vertical ? t.x + 16 : t.x + (sg === '+' ? 6 : -6);
      const ly = o.vertical ? t.y + (sg === '+' ? 6 : 3) : t.y + 19;
      text(sg, lx, ly, f(16, '900'), c, 'center', 'middle');
    });
    ctx.restore();
  }

  /* ----- 전원 장치 ----- */
  function drawSupply() {
    const b = G.box;
    ctx.fillStyle = '#1f2937'; D.roundRect(b.x + 14, b.y + b.h - 2, 30, 7, 3); ctx.fill(); D.roundRect(b.x + b.w - 44, b.y + b.h - 2, 30, 7, 3); ctx.fill();
    D.shadow(() => {
      const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      bg.addColorStop(0, '#5b6a82'); bg.addColorStop(0.5, '#3e4a5f'); bg.addColorStop(1, '#2a3344');
      ctx.fillStyle = bg; D.roundRect(b.x, b.y, b.w, b.h, 15); ctx.fill();
    }, { blur: 16, y: 7, color: 'rgba(20,35,70,.38)' });
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; D.roundRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 13.5); ctx.stroke();
    const sh = ctx.createLinearGradient(0, b.y, 0, b.y + 40); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; D.roundRect(b.x + 3, b.y + 3, b.w - 6, 38, 12); ctx.fill();
    text('전원 장치', b.x + b.w / 2, b.y + 17, f(13), '#e2e8f0', 'center');
    const lx = b.x + 16, ly = b.y + 25, lw = b.w - 32, lh = 34;
    const lg = ctx.createLinearGradient(0, ly, 0, ly + lh); lg.addColorStop(0, '#07130e'); lg.addColorStop(1, '#0f2a1c');
    ctx.fillStyle = lg; D.roundRect(lx, ly, lw, lh, 7); ctx.fill();
    ctx.strokeStyle = '#1f4030'; ctx.lineWidth = 2; ctx.stroke();
    const vShow = S.mode === 'material' ? V_MAT : (Math.abs(S.Vd - S.V) < 0.05 ? S.V : S.Vd);
    ctx.save(); ctx.shadowColor = 'rgba(74,222,128,.75)'; ctx.shadowBlur = 8;
    text(vShow.toFixed(1) + ' V', b.x + b.w / 2, ly + lh / 2 + 1, 'bold 22px ' + MONO, '#4ade80', 'center', 'middle');
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.07)'; D.roundRect(lx + 3, ly + 3, lw - 6, lh / 2 - 3, 5); ctx.fill();
    text('(−)극', G.tN.x, b.y + 76, f(13), '#e2e8f0', 'center');
    text('(+)극', G.tP.x, b.y + 76, f(13), '#fca5a5', 'center');
    const kv = T.knob * S.modeRes;
    if (kv > 0.01) drawKnob(kv);
  }
  function drawKnob(kv) {
    const k = G.knob, lift = S.knobLift, locked = S.lockV != null;
    const e = S.t - S.knobShake;
    const ox = !RM && e < 0.6 ? Math.sin(e * 46) * 4 * Math.exp(-e * 7) : 0;
    ctx.save();
    ctx.globalAlpha *= clamp(kv * 1.4, 0, 1);
    text('전압', k.x, G.box.y + 76, f(13), '#cbd5e1', 'center');
    ctx.translate(k.x + ox, k.y);
    for (let i = 0; i <= 10; i++) {
      const aa = (135 + 270 * i / V_MAX) * Math.PI / 180, lit = i <= S.Vd + 0.01 && i > 0;
      ctx.strokeStyle = lit ? '#ffa45e' : 'rgba(203,213,225,.45)'; ctx.lineWidth = lit ? 2.6 : 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(aa) * (k.r + 6), Math.sin(aa) * (k.r + 6)); ctx.lineTo(Math.cos(aa) * (k.r + 10), Math.sin(aa) * (k.r + 10)); ctx.stroke();
    }
    const s = (0.4 + 0.6 * kv) * (1 + 0.1 * lift);
    ctx.scale(s, s);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,' + (0.35 + 0.15 * lift) + ')'; ctx.shadowBlur = 6 + 12 * lift; ctx.shadowOffsetY = 2 + 6 * lift;
    const kg = ctx.createRadialGradient(-5, -6, 2, 0, 0, k.r + 1);
    kg.addColorStop(0, locked ? '#d5dbe5' : '#f8fafc'); kg.addColorStop(0.55, locked ? '#98a3b5' : '#b4bfcf'); kg.addColorStop(1, locked ? '#5a6577' : '#6b778b');
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(0, 0, k.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = S.knob ? '#f26b3a' : 'rgba(31,41,55,.85)'; ctx.lineWidth = S.knob ? 3.5 : 2; ctx.beginPath(); ctx.arc(0, 0, k.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,50,70,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) { const aa = i * Math.PI / 9; ctx.beginPath(); ctx.moveTo(Math.cos(aa) * (k.r - 3), Math.sin(aa) * (k.r - 3)); ctx.lineTo(Math.cos(aa) * (k.r - 0.5), Math.sin(aa) * (k.r - 0.5)); ctx.stroke(); }
    const ig = ctx.createRadialGradient(-3, -4, 1, 0, 0, k.r - 5); ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, '#c3ccda');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, 0, k.r - 5, 0, Math.PI * 2); ctx.fill();
    const ka = S.knobAng.value;
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(Math.cos(ka) * 3, Math.sin(ka) * 3); ctx.lineTo(Math.cos(ka) * (k.r - 4), Math.sin(ka) * (k.r - 4)); ctx.stroke();
    ctx.restore();
    if (locked) text('🔒', k.x + 22, k.y - 16, f(14), '#fff', 'center', 'middle');
    if (!S.touched.knob && !locked && !RM && kv > 0.9 && S.mode === 'resistor') D.ring(k.x, k.y, k.r + 14, S.t, { color: '#f26b3a' });
  }
  function drawPosts() {
    [[G.tN, '#1f2937', '−'], [G.tP, '#dc2626', '+']].forEach(([t, c, s]) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = metalGrad(t.x - 13, t.y - 13, t.x + 13, t.y + 13, '#c3ccd9'); ctx.beginPath(); ctx.arc(t.x, t.y, 13.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      D.sphere(t.x, t.y, 10.5, c, { outline: 'rgba(255,255,255,.85)', outlineWidth: 1.5 });
      text(s, t.x, t.y + 1, f(17, '900'), '#fff', 'center', 'middle');
    });
  }

  function drawLabels() {
    if (S.mode === 'material') text('전구', 306, 86, f(15), '#1b2333', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
    else if (T.vm > 0.5) text('전압계', G.vm.x, G.vm.y + G.vm.r + 20, f(13), '#0e7490', 'center', 'alphabetic', 'rgba(255,255,255,.85)');
    text('전류계', G.am.x - G.am.r - 10, G.am.y - 4, f(13), '#6d28d9', 'right', 'alphabetic', 'rgba(255,255,255,.85)');
    if (S.target && S.target.I) text('🎯 ' + S.target.I.v.toFixed(2) + ' A', G.am.x - G.am.r - 10, G.am.y + 16, f(13), '#0b7a41', 'right', 'alphabetic', 'rgba(255,255,255,.85)');
  }

  /* ----- 물질 상자 ----- */
  function drawPanelCard(P, a) {
    const slide = (1 - clamp(a, 0, 1)) * 46;
    ctx.translate(slide, 0);
    ctx.globalAlpha *= clamp(a * 1.4, 0, 1);
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f6fc');
      ctx.fillStyle = g; D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    }, { blur: 14, y: 4, color: 'rgba(25,40,75,.2)' });
    ctx.strokeStyle = '#dbe4f0'; ctx.lineWidth = 1.5; D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.stroke();
  }
  function drawTray() {
    const P = LAY.panel;
    if (T.tray < 0.02) return;
    ctx.save();
    ctx.globalAlpha = clamp(S.mf, 0, 1);
    drawPanelCard(P, T.tray);
    text('🧺 물질 상자', P.x + 12, P.y + 24, f(15), '#3a4456');
    text('끌어다 집게에 끼우거나 눌러요', P.x + 12, P.y + 43, f(13, '600'), '#6b7689');
    const tiles = trayLayout();
    const away = {}; S.flyers.forEach((q) => { away[q.id] = true; });
    tiles.forEach((t) => {
      const m = MAT[t.id];
      const inSlot = S.slot === t.id;
      const dragging = S.drag && S.drag.moved && S.drag.id === t.id && S.drag.from === 'tray';
      D.shadow(() => { ctx.fillStyle = inSlot ? '#f0fdf4' : '#fff'; D.roundRect(t.x, t.y, t.w, t.h, 12); ctx.fill(); }, { blur: 5, y: 2, color: 'rgba(25,40,75,.12)' });
      ctx.save();
      if (inSlot || dragging) { ctx.setLineDash([6, 4]); ctx.strokeStyle = inSlot ? '#14a058' : '#9aa7ba'; ctx.lineWidth = 2; } else { ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; }
      D.roundRect(t.x, t.y, t.w, t.h, 12); ctx.stroke();
      ctx.restore();
      const cx = t.x + t.w / 2;
      if (!inSlot) drawSample(t.id, cx, t.y + 24, Math.min(t.w - 34, 92), false, dragging || away[t.id] ? 0.25 : 1);
      else text('▶ 집게에 있음', cx, t.y + 28, f(13), '#0b7a41', 'center');
      text(m.name, cx, t.y + 56, f(14), '#1b2333', 'center');
      const ty = t.y + Math.min(80, t.h - 12);
      if (S.tested[t.id] != null) {
        const r = resultOf(S.tested[t.id]);
        const age = S.t - (S.testedAt[t.id] || -9), pop = RM ? 1 : EASE.outBack(clamp(age / 0.4, 0, 1));
        ctx.save(); ctx.translate(cx, ty); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        text(r.t, 0, 0, f(13), r.c, 'center');
        ctx.restore();
      } else text('?', cx, ty, f(13), '#a3adbd', 'center');
    });
    const n = Object.keys(S.tested).length;
    text('시험한 물질 ' + n + ' / ' + MATS.length, P.x + P.w / 2, P.y + P.h - 12, f(13), '#5d6879', 'center');
    ctx.restore();
  }
  S.testedAt = {};
  function drawFlyers() {
    for (let i = S.flyers.length - 1; i >= 0; i--) {
      const q = S.flyers[i], k = clamp((S.t - q.t0) / q.dur, 0, 1);
      if (k >= 1) { S.flyers.splice(i, 1); continue; }
      const e = RM ? 1 : EASE.outCubic(k);
      const x = q.x + (q.tx - q.x) * e, y = q.y + (q.ty - q.y) * e - (RM ? 0 : Math.sin(Math.PI * k) * 26);
      const sc = 1 + 0.12 * Math.sin(Math.PI * k);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      drawSample(q.id, 0, 0, 92, false, 1, { shadow: true });
      ctx.restore();
    }
  }
  function drawDragged() {
    const d = S.drag, lift = EASE.outCubic(clamp(d.lift, 0, 1)), hot = hitSlot({ x: d.px, y: d.py }, 30);
    ctx.save();
    ctx.translate(d.px, d.py - 6 * lift); ctx.rotate(d.tilt); ctx.scale(1 + 0.1 * lift, 1 + 0.1 * lift);
    ctx.shadowColor = 'rgba(20,40,80,' + (0.18 + 0.16 * lift) + ')'; ctx.shadowBlur = 8 + 16 * lift; ctx.shadowOffsetY = 4 + 10 * lift;
    ctx.globalAlpha *= hot ? 0.82 : 1; ctx.fillStyle = 'rgba(255,255,255,.95)'; D.roundRect(-62, -34, 124, 66, 14); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; D.roundRect(-62, -34, 124, 66, 14); ctx.stroke();
    drawSample(d.id, 0, -12, 92, false);
    text(MAT[d.id].name, 0, 20, f(13), '#1b2333', 'center');
    ctx.restore();
  }

  /* ----- 전압–전류 그래프 ----- */
  function graphGeom(P) {
    const pad = { l: 50, r: 16, t: 42, b: 42 };
    const x0 = P.x + pad.l, x1 = P.x + P.w - pad.r, y0 = P.y + P.h - pad.b, y1 = P.y + pad.t;
    return { x0, x1, y0, y1, px: (v) => x0 + (v / V_MAX) * (x1 - x0), py: (i) => y0 - (i / 1) * (y0 - y1) };
  }
  function drawGraph(P, a) {
    ctx.save();
    ctx.globalAlpha = clamp(S.mf, 0, 1);
    drawPanelCard(P, a);
    const { x0, x1, y0, y1, px, py } = graphGeom(P);
    text('📈 전압–전류 그래프', P.x + 12, P.y + 24, f(15), '#3a4456');
    ctx.lineWidth = 1;
    for (let v = 0; v <= V_MAX; v += 2) {
      ctx.strokeStyle = '#e9eef6'; ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      text(String(v), px(v), y0 + 17, f(13, '600'), '#5d6879', 'center');
    }
    for (let i = 0; i <= 5; i++) {
      const v = i * 0.2;
      ctx.strokeStyle = '#e9eef6'; ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      text(i === 0 ? '0' : v.toFixed(1), x0 - 7, py(v) + 5, f(13, '600'), '#5d6879', 'right');
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y1 - 4); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    text('전압 (V)', (x0 + x1) / 2, y0 + 35, f(13), '#5d6879', 'center');
    ctx.save(); ctx.translate(P.x + 13, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    text('전류 (A)', 0, 0, f(13), '#5d6879', 'center', 'middle');
    ctx.restore();
    const groups = {};
    S.data.forEach((d) => { (groups[d.R] = groups[d.R] || []).push(d); });
    const Rs = Object.keys(groups).map(Number).sort((q, w) => q - w);
    Rs.forEach((R) => {
      const pts = groups[R].slice().sort((q, w) => q.V - w.V);
      const col = R_COLORS[R] || '#334155';
      if (pts.length > 1) {
        ctx.strokeStyle = C.rgba(col, 0.5); ctx.lineWidth = 2.6;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p.V), py(p.I)) : ctx.moveTo(px(p.V), py(p.I)))); ctx.stroke();
      }
      pts.forEach((p) => {
        const k = RM ? 1 : EASE.outBack(clamp((S.t - (p.born || -9)) / 0.45, 0, 1));
        D.sphere(px(p.V), py(Math.min(p.I, 1)), 6.5 * Math.max(0.01, k), col, { outline: '#fff', outlineWidth: 2 });
      });
    });
    // 지금 값 (부드럽게 따라가는 표시)
    const cx = px(clamp(S.gV, 0, V_MAX)), cy = py(clamp(S.gI, 0, 1));
    if (!RM) D.ring(cx, cy, 8, S.t, { color: '#f26b3a', width: 2 });
    else { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, Math.PI * 2); ctx.fill();
    if (Rs.length) {
      Rs.forEach((R, i) => {
        const lx = x0 + 12, ly = y1 + 8 + i * 20;
        D.sphere(lx, ly, 6, R_COLORS[R] || '#334155', { gloss: false });
        text(R + ' Ω', lx + 11, ly + 1, f(13), '#3a4456', 'left', 'middle');
      });
    } else {
      text('📍 데이터 기록 버튼을 눌러', (x0 + x1) / 2, y1 + 24, f(13, '600'), '#6b7689', 'center');
      text('그래프에 점을 찍어 보세요', (x0 + x1) / 2, y1 + 44, f(13, '600'), '#6b7689', 'center');
    }
    ctx.restore();
  }

  /* ---------- 성공 표시 ---------- */
  function celebrate() {
    const x = 372, y = 64;
    fx.burst(x, y, { count: 24, speed: 200, life: 0.9, size: 4 });
    S.chk = { t0: S.t, x, y };
  }
  function drawCheck() {
    if (!S.chk) return;
    const e = S.t - S.chk.t0;
    if (e > 1.8) { S.chk = null; return; }
    const sc = RM ? 1 : EASE.outBack(clamp(e / 0.4, 0, 1));
    ctx.save();
    ctx.globalAlpha = clamp((1.8 - e) / 0.4, 0, 1);
    ctx.translate(S.chk.x, S.chk.y); ctx.scale(sc, sc);
    D.check(0, 0, 24, clamp(e / 0.5, 0, 1));
    ctx.restore();
  }
  (function watchGame() {
    const gm = $('#game');
    if (!gm || !window.MutationObserver) return;
    new MutationObserver((list) => {
      list.forEach((m) => {
        const el = m.target;
        if (!el.classList) return;
        if (el.classList.contains('mission-card') && el.classList.contains('success') && !el._ok) { el._ok = true; celebrate(); }
        if (el.classList.contains('mission-feedback') && el.classList.contains('bad')) S.wrongAt = S.t;
      });
    }).observe(gm, { subtree: true, attributes: true, attributeFilter: ['class'] });
  })();

  /* ---------- 입력 ---------- */
  const sV = $('#sV');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => (+v).toFixed(1) + ' V', (v) => { S.V = clamp(r1(v), 0, V_MAX); S.touched.knob = true; hideHint(); });
  function setV(v, force) {
    if (S.lockV != null && !force) v = S.lockV;
    S.V = clamp(r1(v), 0, V_MAX);
    rangeV.set(S.V);
  }
  function setR(r, force) {
    if (S.lockR != null && !force) r = S.lockR;
    const old = S.R;
    S.R = R_LIST.indexOf(r) >= 0 ? r : R_BASE;
    if (S.R !== old && featInit) S.platePop.velocity = 6;
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
    if (m !== S.mode && featInit && !RM) { S.mf = 0; SciSim.tween(S, { mf: 1 }, { duration: 0.55, ease: 'outCubic' }); }
    S.mode = m;
    S.drag = null; S.knob = null;
    $$('[data-mode]').forEach((n) => { if (n.closest('#modeSeg')) n.classList.toggle('on', n.dataset.mode === m); else n.style.display = n.dataset.mode === m ? '' : 'none'; });
    $('#tbLabel').textContent = m === 'material' ? '🧺 물질 시험: 집게 사이에 물질 끼우기' : '📏 니크롬선 저항 실험';
    $('#tbLabel').hidden = !!(game && game.free);
  }
  // 물질을 집게에 끼우기: 놓은 자리에서 집게로 쏙 들어가요(outBack)
  function insert(id, from) {
    if (S.slot && S.slot !== id) flyBack(S.slot, G.L, (G.slot.top + G.slot.bot) / 2);
    const mid = (G.slot.top + G.slot.bot) / 2;
    S.slot = id;
    S.tested[id] = matAmps(id);
    S.testedAt[id] = S.t;
    S.touched.mat = true;
    S.samp.dx = from ? from.x - G.L : 0; S.samp.dy = from ? from.y - mid : -40; S.samp.sc = 1.25;
    SciSim.tween(S.samp, { dx: 0, dy: 0, sc: 1 }, { duration: 0.5, ease: 'outBack' });
    S.clamp = 0;
    S.resPop.velocity = 6;
    Sound.tick();
    if (!isFinite(MAT[id].R)) S.slotShake = S.t + 0.35;      // 부도체: 전류가 안 흘러 살짝 흔들려요
    else if (!RM) setTimeout(() => { if (S.slot === id) fx.burst(G.L, mid, { count: 8, speed: 90, life: 0.5, size: 3, gravity: 0, colors: ['#ffe27a', '#fff', '#ffb400'], shape: 'star' }); }, 380);
    hideHint();
  }
  function flyBack(id, x, y) {
    const c = tileCenter(id);
    S.flyers.push({ id, x, y, tx: c.x, ty: c.y, t0: S.t, dur: RM ? 0.01 : 0.38 });
  }
  function removeSample(from) {
    if (!S.slot) return;
    const mid = (G.slot.top + G.slot.bot) / 2;
    flyBack(S.slot, from ? from.x : G.L, from ? from.y : mid);
    S.slot = null; Sound.click();
  }

  $$('.nudge').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    Sound.tick();
    setV(S.V + +b.dataset.d);
    S.touched.knob = true;
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
  $('#emptyBtn').addEventListener('click', () => removeSample());

  const hintEl = $('#stageHint');
  function showHint(msg, ms) {
    hintEl.textContent = msg; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  $('#recBtn').addEventListener('click', () => {
    if (S.mode !== 'resistor') return;
    Sound.tick();
    const d = { V: S.V, I: r2(amps()), R: S.R, born: S.t };
    const i = S.data.findIndex((q) => q.R === d.R && Math.abs(q.V - d.V) < 0.05);
    if (i >= 0) S.data[i] = d; else S.data.push(d);
    if (S.data.length > 80) S.data.shift();
    const g = graphGeom(LAY.panel);
    fx.burst(g.px(d.V), g.py(Math.min(d.I, 1)), { count: 9, speed: 80, life: 0.5, size: 2.8, gravity: 0, colors: [R_COLORS[d.R] || '#334155', '#ffd24a', '#fff'], shape: 'star' });
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
      syncTools(set);
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

  /* ---------- 새 도구가 열릴 때: 살짝 튕기며 나타나요 ---------- */
  function tool(key, target, delay) {
    if (!featInit) { T[key] = target; TT[key] = target; return; }
    if (TT[key] === target) return;
    TT[key] = target;
    SciSim.tween(T, { [key]: target }, { duration: target ? 0.65 : 0.25, ease: target ? 'outBack' : 'outCubic', delay: target ? delay : 0 });
  }
  function syncTools(set) {
    tool('tray', set.has('materials') ? 1 : 0, 0.1);
    tool('knob', set.has('voltage') ? 1 : 0, 0.2);
    tool('vm', set.has('voltmeter') ? 1 : 0, 0.35);
    tool('graph', set.has('graph') ? 1 : 0, 0.5);
    tool('res', set.has('resistance') ? 1 : 0, 0.1);
    featInit = true;
  }

  /* ---------- 시작 ---------- */
  function step(dt) {
    S.t += dt;
    S.needA.target = amps(); S.needA.update(dt);
    S.needV.target = volts(); S.needV.update(dt);
    S.I = ap(S.I, amps(), dt, 8);
    S.phase += E_SPEED * S.I * dt;
    S.Vd = ap(S.Vd, S.V, dt, 9);
    S.Rd = ap(S.Rd, S.R, dt, 9);
    if (Math.abs(S.Rd - S.R) < 0.02) S.Rd = S.R;
    S.gV = ap(S.gV, volts(), dt, 9);
    S.gI = ap(S.gI, amps(), dt, 9);
    S.heat = ap(S.heat, S.mode === 'resistor' ? clamp((S.V * S.V / S.R - 1.2) / 5, 0, 1) : 0, dt, 3);
    S.glowSp.target = brightness(); S.glowSp.update(dt);
    S.glow = Math.max(0, S.glowSp.value);
    S.knobAng.target = (135 + 270 * S.V / V_MAX) * Math.PI / 180; S.knobAng.update(dt);
    S.knobLift = ap(S.knobLift, S.knob ? 1 : 0, dt, 14);
    S.modeRes = ap(S.modeRes, S.mode === 'resistor' ? 1 : 0, dt, 10);
    S.clamp = ap(S.clamp, S.slot ? 1 : 0, dt, 10);
    S.resPop.target = 0; S.resPop.update(dt);
    S.platePop.target = 0; S.platePop.update(dt);
    const d = S.drag;
    if (d) {
      d.px = ap(d.px, d.x, dt, 26); d.py = ap(d.py, d.y, dt, 26);
      d.lift = ap(d.lift, d.moved ? 1 : 0, dt, 12);
      d.tilt = RM ? 0 : clamp((d.x - d.px) * 0.012, -0.25, 0.25);
    }
    fx.update(dt);
  }
  setR(S.R, true);
  setMode(S.mode);
  applyLocks();
  SciSim.tween(T, { intro: 1 }, { duration: 0.7, ease: 'outCubic' });
  SciSim.loop((dt, t) => {
    step(dt);
    draw();
    updateReadouts(t);
  });
  window.__sim = { S, T, setV, setR, setMode, insert, removeSample, celebrate, MATS, get F() { return F; } };
})();
