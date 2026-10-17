/* =========================================================
   중2 Ⅶ. 전기와 자기 - 전류의 모형  [9과14-02 (앞부분)]
   ① 관찰: 닫힌 회로 → ② 모형: 전류는 전자의 흐름
   → ③ 설명: 전류는 소모되지 않는다(전류계 3개) → ④ 모형: 전압(물의 흐름 모형)
   애니메이션: 전자·전류 화살표는 전류에 비례한 속력으로 도선을 따라 흐르고, 전구 밝기는 전력에 비례해요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;
  const RM = SciSim.reduceMotion;
  const C = SciSim.color;
  const EASE = SciSim.ease;
  const ap = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));

  /* ---------- 상수 / 상태 ---------- */
  const V_MIN = 0.5, V_MAX = 6, V_BASE = 3, R_BULB = 10;
  const P_MAX = V_MAX * V_MAX / R_BULB;      // 전구의 최대 전력(W)
  const E_SPEED = 140;                       // 전자 표시 속력(px/s) = E_SPEED × 전류(A)
  const W_SPEED = 16;                        // 물방울 속력(px/s) = W_SPEED × 전압(V)
  const I_FULL = V_MAX / R_BULB;             // 전류계 눈금 끝(A)
  const spr = (v) => new SciSim.Spring(v, { stiffness: 140, damping: 8 });
  const S = {
    V: V_BASE, closed: false, prevClosed: false,
    showE: false, showI: false,
    t: 0, glow: 0, I: 0, Vd: V_BASE,
    sw: new SciSim.Spring(0.62, { stiffness: 230, damping: 14 }),
    glowSp: new SciSim.Spring(0, { stiffness: 75, damping: 9 }),
    knobAng: new SciSim.Spring((135 + 270 * V_BASE / V_MAX) * Math.PI / 180, { stiffness: 260, damping: 15 }),
    valve: new SciSim.Spring(0, { stiffness: 190, damping: 13 }),
    knobLift: 0, flash: 0, eA: 0, iA: 0,
    phase: 0, aphase: 0,
    wphase: 0, wheel: 0, pump: 0, wheelW: 0, pumpW: 0,
    offX: 150,                               // 회로 가로 위치(물 모형이 없으면 가운데)
    read: { a: false, b: false, c: false },  // 전류계 값을 읽었는지
    needle: { a: spr(0), b: spr(0), c: spr(0) },
    pop: { a: new SciSim.Spring(0, { stiffness: 260, damping: 11 }), b: new SciSim.Spring(0, { stiffness: 260, damping: 11 }), c: new SciSim.Spring(0, { stiffness: 260, damping: 11 }) },
    shake: { a: -9, b: -9, c: -9 },
    wrongAt: -9, chk: null, splash: 0,
    touched: { sw: false, knob: false },
    knob: null,
    seq: { on: false, off: false },          // 1단계: 켜기 → 끄기
    vHi: false, vLo: false,                  // 4단계: 높였다가 낮추기
  };
  // 새로 열린 도구가 나타나는 정도(0→1, 살짝 튕기며) / 장면이 들어오는 정도
  const T = { am_a: 0, am_b: 0, am_c: 0, volt: 0, water: 0, intro: 0 };
  const TT = {};
  let featInit = false;
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;
  const amps = () => (S.closed ? S.V / R_BULB : 0);
  const shownI = () => r2(amps());
  // 전구 밝기 = 전력(P = V × I)에 비례 (눈에 잘 보이도록 약간 완만하게)
  const brightness = () => (S.closed ? clamp(Math.pow((S.V * S.V / R_BULB) / P_MAX, 0.55), 0, 1) : 0);

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
    box: { x: 160, y: 370, w: 160, h: 142 },
    tN: { x: 188, y: 482 }, tP: { x: 292, y: 482 },
    knob: { x: 240, y: 482, r: 18 },
    bulb: { x: 240, gy: 88, gr: 34 },
    sw: { top: 285, pivot: 345, len: 60 },
  };
  const AM_W = 96, AM_H = 72;
  // 전류계 3개: 전류는 (+)극 → 오른쪽 도선 → ⓐ → 전구 → ⓑ → 스위치 → ⓒ → (−)극
  const AM = {
    a: { x: G.R, y: 300, vert: true, plus: 'bottom', tag: 'ⓐ', cap: '전구 앞', cx: G.R - AM_W / 2 - 12, cy: 300, ca: 'right' },
    b: { x: 130, y: G.T, vert: false, plus: 'right', tag: 'ⓑ', cap: '전구 뒤', cx: 130, cy: G.T + AM_H / 2 + 14, ca: 'center' },
    c: { x: 100, y: G.B, vert: false, plus: 'left', tag: 'ⓒ', cap: '(−)극 앞', cx: 100, cy: G.B - AM_H / 2 - 14, ca: 'center' },
  };
  const AMK = ['a', 'b', 'c'];
  const LAYOUTS = {
    wide: { w: 800, h: 520, water: { x: 520, y: 12, w: 268, h: 496 }, center: 150 },
    tall: { w: 500, h: 540, water: null, center: 0 },
    tallW: { w: 500, h: 900, water: { x: 10, y: 548, w: 480, h: 342 }, center: 0 },
  };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const f = (size, w) => (w || 'bold') + ' ' + size + 'px ' + FONT;
  const WIRE_P = '#d9434f', WIRE_N = '#3d4a63', E_COLOR = '#2563eb', I_COLOR = '#f97316', AM_COLOR = '#7c3aed';
  const WATER = '#38bdf8';

  /* ---------- 경로 도우미 ---------- */
  // 꺾이는 곳을 둥글게 다듬은 점 목록 (도선 그림과 전자 경로가 같은 곡선을 쓰도록)
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
      segs.push({ a, b, len, s0: total, ux: (b.x - a.x) / len, uy: (b.y - a.y) / len });
      total += len;
    }
    const out = { x: 0, y: 0, dx: 1, dy: 0 };
    return {
      total, pts,
      at(s) {          // 같은 객체를 다시 쓰므로 호출 직후에만 읽어요
        s = ((s % total) + total) % total;
        for (let i = 0; i < segs.length; i++) {
          const g = segs[i];
          if (s <= g.s0 + g.len || i === segs.length - 1) {
            const t = clamp((s - g.s0) / (g.len || 1), 0, 1);
            out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t; out.dx = g.ux; out.dy = g.uy;
            return out;
          }
        }
        return out;
      },
    };
  }
  // 전자의 이동 방향: (−)극 → 왼쪽 → 위 → 전구 → 오른쪽 → (+)극 → (전원 장치 내부) → (−)극
  const loopPath = makePath(roundPoly([
    { x: G.tN.x, y: G.B }, { x: G.L, y: G.B }, { x: G.L, y: G.T }, { x: G.R, y: G.T }, { x: G.R, y: G.B }, { x: G.tP.x, y: G.B },
  ], 18, true), true);
  const NE = 48;
  // 도선 그림용 경로 (극성별 색)
  const WIRES = [
    { pts: roundPoly([{ x: G.tP.x, y: G.B }, { x: G.R, y: G.B }, { x: G.R, y: G.T }, { x: 262, y: G.T }], 18, false), col: WIRE_P },
    { pts: roundPoly([{ x: 218, y: G.T }, { x: G.L, y: G.T }, { x: G.L, y: G.sw.top }], 18, false), col: WIRE_N },
    { pts: roundPoly([{ x: G.L, y: G.sw.pivot }, { x: G.L, y: G.B }, { x: G.tN.x, y: G.B }], 18, false), col: WIRE_N },
  ];
  // 전자가 보이는 정도(0~1): 전원 장치·전구 소켓·전류계 속은 가려요
  function visE(p) {
    if (Math.abs(p.y - G.B) < 1 && p.x > G.tN.x - 2 && p.x < G.tP.x + 2) return 0;
    if (Math.abs(p.y - G.T) < 1 && p.x > 214 && p.x < 266) return 0;
    for (let i = 0; i < 3; i++) {
      const m = AM[AMK[i]];
      if (T['am_' + AMK[i]] > 0.35 && Math.abs(p.x - m.x) < AM_W / 2 + 1 && Math.abs(p.y - m.y) < AM_H / 2 + 1) return 0;
    }
    if (Math.abs(p.x - G.L) < 1 && p.y > G.sw.top - 6 && p.y < G.sw.pivot + 6) return clamp(1 - S.sw.value / 0.12, 0, 1);
    return 1;
  }

  /* ---------- 캔버스 ---------- */
  let view = null, ctx = null, D = null, LAY = null, bgPat = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  const kindNow = () => (mq && mq.matches ? (on('water') ? 'tallW' : 'tall') : 'wide');
  const offTarget = () => (LAY.water && on('water') ? 0 : LAY.center);
  const toC = (p) => ({ x: p.x - S.offX, y: p.y });      // 캔버스 → 회로 좌표
  const handlers = {
    hover(p) {
      const c = toC(p);
      if (hitSwitch(c)) return 'pointer';
      if (on('voltage') && T.volt > 0.5 && hitKnob(c)) return 'grab';
      if (on('ammeters') && hitAmmeter(c)) return 'pointer';
      return null;
    },
    down(p) {
      const c = toC(p);
      if (hitSwitch(c)) { toggleSwitch(); return false; }
      if (on('voltage') && T.volt > 0.5 && hitKnob(c)) { S.knob = { x: p.x, y: p.y, V0: S.V }; S.touched.knob = true; Sound.tick(); hideHint(); return true; }
      const k = on('ammeters') && hitAmmeter(c);
      if (k) { readMeter(k); return false; }
      return false;
    },
    move(p) {
      if (!S.knob) return;
      const d = (p.x - S.knob.x) - (p.y - S.knob.y);   // 오른쪽·위로 끌면 전압 증가
      const v = clamp(Math.round((S.knob.V0 + d * 0.02) * 2) / 2, V_MIN, V_MAX);
      if (v !== S.V) Sound.tick();
      setV(v);
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
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: '#ebf2fa' });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    bgPat = ctx.createPattern(BG_TILE, 'repeat');
    SciSim.pointer(view, handlers);
    S.offX = offTarget();
  }

  function hitSwitch(p) { return p.x > 6 && p.x < 116 && p.y > G.sw.top - 26 && p.y < G.sw.pivot + 16; }
  function hitKnob(p) { return Math.hypot(p.x - G.knob.x, p.y - G.knob.y) < 30; }
  function hitAmmeter(p) {
    for (const k in AM) { const m = AM[k]; if (T['am_' + k] > 0.5 && Math.abs(p.x - m.x) < AM_W / 2 + 10 && Math.abs(p.y - m.y) < AM_H / 2 + 10) return k; }
    return null;
  }

  /* ---------- 미리 그려 둔 스프라이트 (전자·물방울·화살표·바탕 점무늬) ---------- */
  const SPR = 3;
  function mk(size, fn) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * SPR);
    const x = c.getContext('2d');
    x.scale(SPR, SPR);
    fn(x, SciSim.draw(x));
    return c;
  }
  const spE = mk(20, (x, d) => {               // 전자: 파란 구슬 + (−)
    d.sphere(10, 10, 6.6, '#2f62f0', { light: '#b4cbff', dark: '#14308a' });
    x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 1.3; x.beginPath(); x.arc(10, 10, 6.6, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(6.9, 10.2); x.lineTo(13.1, 10.2); x.stroke();
  });
  const spDrop = mk(14, (x, d) => { d.sphere(7, 7, 4.8, '#38bdf8', { light: '#e6f8ff', dark: '#0369a1' }); });
  const spArrow = mk(34, (x) => {               // 전류 방향: 주황 화살표 (오른쪽을 향함)
    x.translate(17, 17);
    x.beginPath(); x.moveTo(14, 0); x.lineTo(-8, -11.5); x.lineTo(-3, 0); x.lineTo(-8, 11.5); x.closePath();
    x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 3.2; x.stroke();
    const g = x.createLinearGradient(0, -11, 0, 11); g.addColorStop(0, '#ffa04a'); g.addColorStop(1, '#ea580c');
    x.fillStyle = g; x.fill();
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
  const fx = new SciSim.Particles();           // 불꽃·반짝임·물방울 (캔버스 좌표)

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
  // 절연 피복이 입혀진 도선 (그림자·가장자리·본체·하이라이트)
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
    // 전구가 켜지면 주변 바닥이 따뜻하게 밝아져요
    if (S.glow > 0.02) {
      const bx = G.bulb.x + S.offX, by = G.bulb.gy + 40, R = 190 + 120 * S.glow;
      const lg = ctx.createRadialGradient(bx, by, 10, bx, by, R);
      lg.addColorStop(0, 'rgba(255,228,140,' + (0.42 * S.glow) + ')'); lg.addColorStop(1, 'rgba(255,228,140,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, LAY.w, LAY.h);
    }
  }

  function draw() {
    view.clear();
    backdrop();
    const sh = RM ? 0 : Math.sin((S.t - S.wrongAt) * 38) * 4 * Math.exp(-(S.t - S.wrongAt) * 7) * ((S.t - S.wrongAt) < 0.7 ? 1 : 0);
    ctx.save();
    ctx.translate(S.offX + sh, (1 - T.intro) * 14);
    ctx.globalAlpha = clamp(T.intro, 0, 1);
    drawGlow();
    drawSwitchPlate();
    drawSupply();
    WIRES.forEach((w) => wire(w.pts, w.col));
    drawSwitchBlade();
    drawBulb();
    drawElectrons();
    drawArrows();
    drawPosts();
    AMK.forEach((k) => drawAmmeter(k));
    drawSwitchHandle();
    drawLabels();
    if (isNew('voltage')) newCircle(G.knob.x, G.knob.y, G.knob.r + 15, false);
    if (isNew('ammeters') && T.am_a > 0.8) AMK.forEach((k) => { const m = AM[k]; newRing(m.x - AM_W / 2, m.y - AM_H / 2, AM_W, AM_H, k === 'b'); });
    ctx.restore();
    drawLegend();
    if (LAY.water && T.water > 0.01) {
      drawWater(LAY.water, T.water);
      if (isNew('water') && T.water > 0.9) newRing(LAY.water.x, LAY.water.y, LAY.water.w, LAY.water.h);
    }
    fx.draw(ctx);
    drawCheck();
  }

  /* ----- 스위치 (칼날 스위치) ----- */
  function drawSwitchPlate() {
    const x = G.L - 19, y = G.sw.top - 20, w = 64, h = G.sw.pivot - G.sw.top + 40;
    D.shadow(() => {
      const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#f7f9fc'); g.addColorStop(1, '#dde4ee');
      ctx.fillStyle = g; D.roundRect(x, y, w, h, 10); ctx.fill();
    }, { blur: 9, y: 4, color: 'rgba(25,40,75,.22)' });
    ctx.strokeStyle = '#c9d3e1'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, h, 10); ctx.stroke();
    [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach((s) => D.sphere(s[0], s[1], 3.2, '#a8b3c4', { gloss: false }));
  }
  function bladeXY(a, len) { return { x: G.L + Math.sin(a) * len, y: G.sw.pivot - Math.cos(a) * len }; }
  function drawSwitchBlade() {
    const x = G.L, top = G.sw.top, pv = G.sw.pivot, len = G.sw.len, a = S.sw.value;
    // 윗쪽 접점(집게)
    ctx.fillStyle = metalGrad(x - 9, top - 8, x + 9, top + 8, '#aab4c4'); D.roundRect(x - 10, top - 9, 20, 9, 3); ctx.fill();
    [-7, 7].forEach((dx) => { ctx.fillStyle = metalGrad(x + dx - 2.5, top, x + dx + 2.5, top + 14, '#b8c2d1'); D.roundRect(x + dx - 2.5, top - 3, 5, 17, 2); ctx.fill(); });
    if (S.flash > 0.02) D.glow(x, top, 30, '#ffe27a', 0.85 * S.flash);
    // 칼날
    ctx.save(); ctx.translate(x, pv); ctx.rotate(a);
    ctx.shadowColor = 'rgba(20,30,50,.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = -2; ctx.shadowOffsetY = 3;
    const bg = ctx.createLinearGradient(-4, 0, 4, 0); bg.addColorStop(0, '#f1f4f9'); bg.addColorStop(0.5, '#a9b4c5'); bg.addColorStop(1, '#68758a');
    ctx.fillStyle = bg; D.roundRect(-3.8, -len, 7.6, len, 3); ctx.fill();
    ctx.restore();
    // 경첩(받침)
    D.sphere(x, pv, 8.5, '#8d99ad', { gloss: true, shadow: true });
    ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, pv + 1); ctx.lineTo(x + 4, pv - 1); ctx.stroke();
  }
  function drawSwitchHandle() {
    const x = G.L, pv = G.sw.pivot, len = G.sw.len, a = S.sw.value;
    const hp = bladeXY(a, len * 0.58);
    if (!S.closed && on('switch') && !RM) D.ring(hp.x, hp.y, 26, S.t, { color: '#f26b3a', speed: 1 });
    ctx.save(); ctx.translate(hp.x, hp.y); ctx.rotate(a);
    ctx.shadowColor = 'rgba(20,30,50,.35)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = -2; ctx.shadowOffsetY = 3;
    const g = ctx.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#ff9a5a'); g.addColorStop(0.5, '#f26b3a'); g.addColorStop(1, '#b8421a');
    ctx.fillStyle = g; D.roundRect(-9, -15, 18, 30, 7); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.8; D.roundRect(-9, -15, 18, 30, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,40,10,.35)'; ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-5, i * 6); ctx.lineTo(5, i * 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.5)'; D.roundRect(-6, -12, 4, 22, 2); ctx.fill();
    ctx.restore();
  }

  /* ----- 전자 · 전류 방향 ----- */
  function drawElectrons() {
    if (S.eA < 0.01) return;
    const gap = loopPath.total / NE, t = S.t;
    for (let i = 0; i < NE; i++) {
      const p = loopPath.at(i * gap + S.phase);
      const al = visE(p);
      if (al <= 0.01) continue;
      const k = EASE.outBack(clamp(S.eA * 1.7 - (i / NE) * 0.7, 0, 1));
      let jx = 0, jy = 0;
      if (!RM) { jx = Math.sin(t * 2.9 + i * 1.9) * 1.1; jy = Math.cos(t * 2.3 + i * 2.7) * 1.1; }   // 가만히 있어도 살짝 떨려요
      blit(spE, 20, p.x + jx, p.y + jy, k * 0.95, al * Math.min(1, S.eA * 2));
    }
  }
  function drawArrows() {
    const a = S.iA * clamp(S.I * 18, 0, 1);
    if (a < 0.02) return;
    const n = 9, gap = loopPath.total / n;
    for (let i = 0; i < n; i++) {
      const p = loopPath.at(i * gap + gap * 0.5 - S.aphase);
      const al = visE(p) * a;
      if (al <= 0.02) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(-p.dy, -p.dx));
      ctx.globalAlpha = al; ctx.drawImage(spArrow, -17 * 0.95, -17 * 0.95, 34 * 0.95, 34 * 0.95);
      ctx.restore();
    }
  }
  function drawLegend() {
    const ea = S.eA, ia = S.iA;
    if (ea < 0.02 && ia < 0.02) return;
    const iLabel = amps() > 0 ? '전류의 방향' : '전류의 방향 (흐르지 않음)';
    ctx.font = f(13);
    const tw = Math.max(ea > 0.02 ? ctx.measureText('전자의 이동').width : 0, ia > 0.02 ? ctx.measureText(iLabel).width : 0);
    const items = (ea > 0.02 ? 1 : 0) + (ia > 0.02 ? 1 : 0);
    const x = 12, y = 12, w = Math.max(150, 38 + tw + 14), h = 12 + items * 26;
    ctx.save();
    ctx.globalAlpha = Math.max(ea, ia);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.94)'; D.roundRect(x, y, w, h, 12); ctx.fill(); }, { blur: 8, y: 2, color: 'rgba(25,40,75,.16)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, h, 12); ctx.stroke();
    let row = 0;
    if (ea > 0.02) { const yy = y + 19 + row * 26; blit(spE, 20, x + 20, yy, 0.95, ea); text('전자의 이동', x + 38, yy + 1, f(13), '#1d4ed8', 'left', 'middle'); row++; }
    if (ia > 0.02) { const yy = y + 19 + row * 26; ctx.save(); ctx.translate(x + 20, yy); ctx.globalAlpha = ia; ctx.drawImage(spArrow, -14, -14, 28, 28); ctx.restore(); text(iLabel, x + 38, yy + 1, f(13), '#c2410c', 'left', 'middle'); }
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
    // 소켓 (도선이 양옆으로 들어가요)
    D.shadow(() => {
      const sg = ctx.createLinearGradient(x - 23, 0, x + 23, 0); sg.addColorStop(0, '#e9edf3'); sg.addColorStop(0.5, '#fbfcfe'); sg.addColorStop(1, '#c4cdda');
      ctx.fillStyle = sg; D.roundRect(x - 23, G.T - 13, 46, 30, 7); ctx.fill();
    }, { blur: 7, y: 4, color: 'rgba(25,40,75,.3)' });
    ctx.strokeStyle = '#a8b3c4'; ctx.lineWidth = 1.5; D.roundRect(x - 23, G.T - 13, 46, 30, 7); ctx.stroke();
    // 금속 캡(나사산)
    const cg = ctx.createLinearGradient(x - 15, 0, x + 15, 0); cg.addColorStop(0, '#8b97aa'); cg.addColorStop(0.4, '#e4e9f1'); cg.addColorStop(1, '#707d92');
    ctx.fillStyle = cg; D.roundRect(x - 15, 121, 30, 20, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(70,82,100,.6)'; ctx.lineWidth = 1.5; D.roundRect(x - 15, 121, 30, 20, 4); ctx.stroke();
    ctx.beginPath(); for (let yy = 127; yy <= 137; yy += 5) { ctx.moveTo(x - 14, yy); ctx.lineTo(x + 14, yy + 1.6); } ctx.stroke();
    // 유리 구
    const path = () => {
      ctx.beginPath();
      ctx.arc(x, gy, gr, Math.PI * 0.68, Math.PI * 0.32);
      ctx.lineTo(x + 12, 123); ctx.lineTo(x - 12, 123); ctx.closePath();
    };
    path();
    const off0 = 'rgba(255,255,255,.9)', off1 = 'rgba(222,232,246,.62)', off2 = 'rgba(176,194,220,.55)';
    const gg = ctx.createRadialGradient(x - 11, gy - 13, 3, x, gy, gr * 1.1);
    gg.addColorStop(0, bb > 0.02 ? C.mix('#ffffff', '#fffbe0', Math.min(1, bb * 1.5)) : off0);
    gg.addColorStop(0.55, bb > 0.02 ? C.mix('#dee8f6', '#ffe9a0', Math.min(1, bb * 1.5)) : off1);
    gg.addColorStop(1, bb > 0.02 ? C.mix('#b0c2dc', '#ffc94d', Math.min(1, bb * 1.4)) : off2);
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = bb > 0.01 ? C.mix('#8b9bb2', '#d99a00', bb) : '#8b9bb2'; ctx.lineWidth = 2.5; ctx.stroke();
    // 필라멘트 지지대 + 코일
    ctx.strokeStyle = '#7b8798'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, 123); ctx.lineTo(x - 14, gy + 4); ctx.moveTo(x + 5, 123); ctx.lineTo(x + 14, gy + 4); ctx.stroke();
    const fc = bb < 0.5 ? C.mix('#5b6577', '#ff8a00', bb / 0.5) : C.mix('#ff8a00', '#fff6c8', (bb - 0.5) / 0.5);
    ctx.save();
    if (bb > 0.05) { ctx.shadowColor = 'rgba(255,170,0,.95)'; ctx.shadowBlur = 12 * bb; }
    ctx.strokeStyle = fc; ctx.lineWidth = 2.3; ctx.lineJoin = 'round';
    ctx.beginPath();
    const x0 = x - 14, x1 = x + 14, steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t, py = gy + 4 - Math.sin(t * Math.PI) * 6 + Math.sin(t * 3 * Math.PI * 2) * 4.5;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.restore();
    // 유리 반사
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, gy, gr - 7, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, gy, gr - 7, Math.PI * 0.05, Math.PI * 0.22); ctx.stroke();
  }

  /* ----- 전류계 (바늘이 스프링처럼 흔들리며 값을 가리켜요) ----- */
  function drawAmmeter(k) {
    const m = AM[k], tv = T['am_' + k];
    if (tv <= 0.02) return;
    let ox = 0;
    const e = S.t - S.shake[k];
    if (!RM && e < 0.6) ox = Math.sin(e * 46) * 6 * Math.exp(-e * 7);
    const pop = S.pop[k].value;
    ctx.save();
    ctx.translate(m.x + ox, m.y);
    const sc = Math.max(0.01, tv) * (1 + pop * 0.08);
    ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(tv * 1.5, 0, 1);
    const x = -AM_W / 2, y = -AM_H / 2;
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, y, 0, y + AM_H); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8ecf5');
      ctx.fillStyle = g; D.roundRect(x, y, AM_W, AM_H, 13); ctx.fill();
    }, { blur: 10 + pop * 8, y: 4 + pop * 4, color: 'rgba(60,30,120,.28)' });
    ctx.strokeStyle = AM_COLOR; ctx.lineWidth = 3; D.roundRect(x, y, AM_W, AM_H, 13); ctx.stroke();
    // 눈금판
    ctx.fillStyle = '#fbfcff'; D.roundRect(x + 6, y + 6, AM_W - 12, AM_H - 12, 8); ctx.fill();
    const cx = 0, cy = 4, R = 26, a0 = -150 * Math.PI / 180, a1 = -30 * Math.PI / 180;
    ctx.lineCap = 'butt'; ctx.lineWidth = 5; ctx.strokeStyle = '#dde4ef';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    const v = S.needle[k].value;
    const th = a0 + (a1 - a0) * clamp(v / I_FULL, -0.03, 1.1);
    if (v > 0.004 && S.read[k]) { ctx.strokeStyle = C.rgba(AM_COLOR, 0.55); ctx.beginPath(); ctx.arc(cx, cy, R, a0, Math.min(th, a1)); ctx.stroke(); }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.4;
    for (let i = 0; i <= 6; i++) {
      const aa = a0 + (a1 - a0) * i / 6, r0 = R + 4, r1v = R + (i % 3 === 0 ? 9 : 7);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * r0, cy + Math.sin(aa) * r0); ctx.lineTo(cx + Math.cos(aa) * r1v, cy + Math.sin(aa) * r1v); ctx.stroke();
    }
    // 바늘
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(th) * 5, cy - Math.sin(th) * 5); ctx.lineTo(cx + Math.cos(th) * (R + 3), cy + Math.sin(th) * (R + 3)); ctx.stroke();
    ctx.restore();
    D.sphere(cx, cy, 4.6, '#334155', { gloss: true });
    // 숫자
    if (S.read[k]) text(S.I.toFixed(2) + ' A', 0, 21, 'bold 15px ' + MONO, '#1b2333', 'center', 'middle');
    else { ctx.globalAlpha *= 0.55 + 0.45 * Math.sin(S.t * 4.5); text('👆 ?', 0, 21, f(15), AM_COLOR, 'center', 'middle'); ctx.globalAlpha = clamp(tv * 1.5, 0, 1); }
    // 기호 배지
    D.sphere(x + 5, y + 5, 11, AM_COLOR, { text: 'A', textScale: 1.25, outline: '#fff', outlineWidth: 2, gloss: false });
    // 단자 (+ 빨강, − 검정): 전류가 들어오는 쪽이 (+)
    const ends = m.vert ? { top: { x: 0, y: y }, bottom: { x: 0, y: y + AM_H } } : { left: { x: x, y: 0 }, right: { x: x + AM_W, y: 0 } };
    Object.keys(ends).forEach((side) => {
      const t = ends[side], plus = side === m.plus;
      D.sphere(t.x, t.y, 7.2, plus ? '#dc2626' : '#1f2937', { outline: '#fff', outlineWidth: 2, gloss: true });
      const lx = m.vert ? t.x + 16 : t.x + (side === 'left' ? -7 : 6);
      const ly = m.vert ? t.y + (side === 'bottom' ? 10 : -9) : t.y - 17;
      text(plus ? '+' : '−', lx, ly, f(16, '900'), plus ? '#dc2626' : '#111827', 'center', 'middle');
    });
    ctx.restore();
    // 이름
    ctx.save(); ctx.globalAlpha = clamp(tv * 1.5, 0, 1);
    text(m.tag + ' ' + m.cap, m.cx, m.cy, f(13), '#6d28d9', m.ca, 'middle', 'rgba(255,255,255,.85)');
    ctx.restore();
  }

  /* ----- 전원 장치 ----- */
  function drawSupply() {
    const b = G.box;
    // 받침 다리
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
    // 액정 표시창
    const lx = b.x + 16, ly = b.y + 25, lw = b.w - 32, lh = 34;
    const lg = ctx.createLinearGradient(0, ly, 0, ly + lh); lg.addColorStop(0, '#07130e'); lg.addColorStop(1, '#0f2a1c');
    ctx.fillStyle = lg; D.roundRect(lx, ly, lw, lh, 7); ctx.fill();
    ctx.strokeStyle = '#1f4030'; ctx.lineWidth = 2; ctx.stroke();
    const vShow = Math.abs(S.Vd - S.V) < 0.05 ? S.V : S.Vd;
    ctx.save(); ctx.shadowColor = 'rgba(74,222,128,.75)'; ctx.shadowBlur = 8;
    if (T.volt < 0.98) { ctx.globalAlpha = 1 - clamp(T.volt, 0, 1); text('● 전원 켜짐', b.x + b.w / 2, ly + lh / 2 + 1, f(15), '#4ade80', 'center', 'middle'); }
    if (T.volt > 0.02) { ctx.globalAlpha = clamp(T.volt, 0, 1); text(vShow.toFixed(1) + ' V', b.x + b.w / 2, ly + lh / 2 + 1, 'bold 22px ' + MONO, '#4ade80', 'center', 'middle'); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.07)'; D.roundRect(lx + 3, ly + 3, lw - 6, lh / 2 - 3, 5); ctx.fill();
    text('(−)극', G.tN.x, b.y + 76, f(13), '#e2e8f0', 'center');
    text('(+)극', G.tP.x, b.y + 76, f(13), '#fca5a5', 'center');
    if (T.volt > 0.01) drawKnob();
  }
  function drawKnob() {
    const k = G.knob, tv = T.volt, lift = S.knobLift;
    ctx.save();
    ctx.globalAlpha = clamp(tv * 1.4, 0, 1);
    text('전압', k.x, G.box.y + 76, f(13), '#cbd5e1', 'center');
    ctx.translate(k.x, k.y);
    // 눈금 고리: 현재 전압까지 주황으로 켜져요
    for (let i = 0; i < 12; i++) {
      const vv = V_MIN + i * 0.5, aa = (135 + 270 * vv / V_MAX) * Math.PI / 180, lit = vv <= S.Vd + 0.01;
      ctx.strokeStyle = lit ? '#ffa45e' : 'rgba(203,213,225,.45)'; ctx.lineWidth = lit ? 2.6 : 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(aa) * (k.r + 6), Math.sin(aa) * (k.r + 6)); ctx.lineTo(Math.cos(aa) * (k.r + 10), Math.sin(aa) * (k.r + 10)); ctx.stroke();
    }
    const s = (0.4 + 0.6 * tv) * (1 + 0.1 * lift);
    ctx.scale(s, s);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,' + (0.35 + 0.15 * lift) + ')'; ctx.shadowBlur = 6 + 12 * lift; ctx.shadowOffsetY = 2 + 6 * lift;
    const kg = ctx.createRadialGradient(-5, -6, 2, 0, 0, k.r + 1);
    kg.addColorStop(0, '#f8fafc'); kg.addColorStop(0.55, '#b4bfcf'); kg.addColorStop(1, '#6b778b');
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
    if (!S.touched.knob && !RM && tv > 0.9) D.ring(k.x, k.y, k.r + 14, S.t, { color: '#f26b3a' });
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
    const bright = S.glow > 0.03;
    text('전구', 306, 82, f(15), '#1b2333', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
    text(bright ? '켜짐' : '꺼짐', 306, 102, f(13), bright ? '#b45309' : '#6b7689', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
    text('스위치', 94, G.sw.pivot + 18, f(13), '#3a4456', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
    text(S.closed ? '닫힘' : '열림', 94, G.sw.pivot + 36, f(13), S.closed ? '#0b7a41' : '#c2410c', 'left', 'alphabetic', 'rgba(255,255,255,.85)');
  }

  /* ---------- 물의 흐름 모형 ---------- */
  const LEGEND = [
    ['⚙️ 펌프', '전원 장치'],
    ['↕ 높이 차', '전압'],
    ['💧 물의 흐름', '전류'],
    ['🎡 물레방아', '전구'],
    ['🚰 밸브', '스위치'],
  ];
  let pipeCache = { key: '', path: null };
  function drawWater(P, a) {
    const slide = (1 - clamp(a, 0, 1)) * 46;
    ctx.save();
    ctx.globalAlpha = clamp(a * 1.4, 0, 1);
    ctx.translate(slide, 0);
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#eef7ff');
      ctx.fillStyle = g; D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    }, { blur: 14, y: 4, color: 'rgba(20,60,110,.2)' });
    ctx.strokeStyle = '#cfe3f3'; ctx.lineWidth = 1.5; D.roundRect(P.x, P.y, P.w, P.h, 14); ctx.stroke();
    text('💧 물의 흐름 모형', P.x + 12, P.y + 24, f(15), '#0369a1');
    const side = P.w > P.h;                                  // 가로로 넓으면 대응표를 오른쪽에
    const LW = side ? 196 : P.w - 16, LH = LEGEND.length * 22 + 30;
    const Dg = side ? { x: P.x + 8, y: P.y + 56, w: P.w - LW - 20, h: P.h - 62 } : { x: P.x + 8, y: P.y + 56, w: P.w - 16, h: P.h - 62 - LH };
    // 대응표
    const lx = side ? P.x + P.w - LW - 8 : P.x + 8, ly = side ? P.y + 60 : Dg.y + Dg.h + 6;
    ctx.fillStyle = '#e6f3fd'; D.roundRect(lx, ly, LW, LH - 4, 11); ctx.fill();
    text('물 모형  ↔  전기 회로', lx + 10, ly + 19, f(13), '#0369a1');
    LEGEND.forEach((row, i) => {
      const yy = ly + 40 + i * 22;
      text(row[0], lx + 10, yy, f(13, '700'), '#334155');
      text('↔ ' + row[1], lx + LW - 10, yy, f(13), '#c2410c', 'right');
    });

    // 관 경로 (높이 차는 부드럽게 변해요)
    const V = S.Vd, flowing = S.closed && S.V > 0;
    const left = Dg.x + 64, right = Dg.x + Dg.w - 34, bottom = Dg.y + Dg.h - 34, topMin = Dg.y + 26;
    const MIN_LIFT = 64;
    const tankY = bottom - MIN_LIFT - (bottom - topMin - MIN_LIFT) * ((V - V_MIN) / (V_MAX - V_MIN));
    const wy = tankY + (bottom - tankY) * 0.5;
    const key = left + ',' + right + ',' + bottom + ',' + tankY.toFixed(1);
    if (pipeCache.key !== key) {
      const poly = roundPoly([{ x: left, y: bottom }, { x: left, y: tankY }, { x: right, y: tankY }, { x: right, y: bottom }], 16, true);
      pipeCache = { key, poly, path: makePath(poly, true) };
    }
    const poly = pipeCache.poly, path = pipeCache.path;
    // 높이 차 표시
    const ax = Dg.x + 22;
    if (bottom - tankY > 20) {
      ctx.strokeStyle = '#fdba8c'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(ax - 8, tankY); ctx.lineTo(left - 14, tankY); ctx.moveTo(ax - 8, bottom); ctx.lineTo(left - 26, bottom); ctx.stroke(); ctx.setLineDash([]);
      D.arrow(ax, bottom - 3, ax, tankY + 3, { color: '#c2410c', width: 3, head: 11 });
      D.arrow(ax, tankY + 3, ax, bottom - 3, { color: '#c2410c', width: 3, head: 11 });
    }
    D.label(Dg.x + 34, tankY - 14, '높이 차', { bg: '#fff1e6', color: '#c2410c', size: 13, border: '#fdba8c', align: 'left' });
    // 관 (유리 + 물)
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokePath(poly, true);
    ctx.shadowColor = 'rgba(20,70,120,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = '#8fcbee'; ctx.lineWidth = 20; ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = flowing ? '#5cc0f3' : '#a8d8f1'; ctx.lineWidth = 14; ctx.stroke();
    // 흐름 줄무늬
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([7, 17]); ctx.lineDashOffset = -S.wphase; ctx.stroke(); ctx.setLineDash([]);
    ctx.translate(-2.5, -2.5); strokePath(poly, true);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // 물방울 (펌프 → 위 → 오른쪽 → 아래 → 왼쪽)
    const n = Math.max(6, Math.round(path.total / 24));
    for (let i = 0; i < n; i++) {
      const p = path.at(i * path.total / n + S.wphase);
      blit(spDrop, 14, p.x, p.y, 0.95, flowing ? 1 : 0.7);
    }
    // 밸브 (= 스위치): 아래쪽 관 가운데
    const vx = left + 56, vo = clamp(S.valve.value, -0.1, 1.1);
    ctx.save(); ctx.translate(vx, bottom);
    const bc = C.mix('#dc2626', '#16a34a', clamp(vo, 0, 1));
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    const vg = ctx.createLinearGradient(-10, 0, 10, 0); vg.addColorStop(0, C.shade(bc, 0.35)); vg.addColorStop(1, C.shade(bc, -0.3));
    ctx.fillStyle = vg; D.roundRect(-10, -15, 20, 30, 6); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; D.roundRect(-10, -15, 20, 30, 6); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    const la = -Math.PI / 2 * (1 - vo);                       // 열림: 관과 나란히, 잠김: 위로 세움
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -22); ctx.stroke();
    ctx.translate(0, -22); ctx.rotate(la);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
    D.sphere(14, 0, 4.2, '#f26b3a', { gloss: true }); D.sphere(-14, 0, 4.2, '#f26b3a', { gloss: true });
    ctx.restore();
    text(S.closed ? '밸브 열림' : '밸브 잠김', vx, bottom + 38, f(13), S.closed ? '#15803d' : '#b91c1c', 'center');
    // 물레방아 (= 전구)
    ctx.save(); ctx.translate(right, wy);
    D.shadow(() => { ctx.fillStyle = '#fde9b8'; ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(90,50,10,.35)' });
    ctx.rotate(S.wheel);
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const aa = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(aa) * 5, Math.sin(aa) * 5); ctx.lineTo(Math.cos(aa) * 21, Math.sin(aa) * 21); ctx.stroke();
      ctx.save(); ctx.rotate(aa); ctx.fillStyle = metalGrad(0, -4, 0, 4, '#e08a1e'); D.roundRect(19, -5, 9, 10, 2.5); ctx.fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    D.sphere(right, wy, 5.5, '#92400e', { gloss: true });
    D.label(right - 30, wy, '물레방아', { bg: 'rgba(255,255,255,.92)', color: '#92400e', size: 13, align: 'right', border: '#f3d9a4' });
    // 펌프 (= 전원 장치)
    ctx.save(); ctx.translate(left, bottom);
    D.shadow(() => { const pg = ctx.createRadialGradient(-7, -8, 2, 0, 0, 26); pg.addColorStop(0, '#7b8aa3'); pg.addColorStop(1, '#2f3a4e'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill(); }, { blur: 9, y: 4, color: 'rgba(20,35,70,.4)' });
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(S.pump);
    ctx.fillStyle = '#e8edf5';
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(14, -14, 19, -2); ctx.quadraticCurveTo(10, -4, 0, 3); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    D.sphere(left, bottom, 5, '#cbd5e1', { gloss: true });
    text('펌프', left - 28, bottom + 38, f(13), '#334155', 'right');
    // 물방울 튀김
    if (flowing && !RM && a > 0.95) {
      while (S.splash > 1) {
        S.splash -= 1;
        fx.emit({ x: right + (Math.random() - 0.5) * 24 + slide, y: wy + 22, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 60, life: 0.45, size: 2.2 + Math.random() * 1.4, color: '#7dd3fc', gravity: 320 });
      }
    }
    // 흐름 상태
    const msg = !S.closed ? '⛔ 밸브가 잠겨 물이 흐르지 않아요' : S.V >= 4.5 ? '높이 차가 커서 물이 빠르게 흘러요' : S.V <= 1.5 ? '높이 차가 작아 물이 느리게 흘러요' : '물이 흘러 물레방아를 돌려요';
    text(msg, P.x + 12, P.y + 46, f(13, '700'), flowing ? '#0369a1' : '#b91c1c');
    ctx.restore();
  }

  /* ---------- 성공 표시 ---------- */
  function celebrate() {
    const x = G.bulb.x + S.offX + 122, y = 62;
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
  const sV = $('#sV'), swBtn = $('#swBtn'), tgE = $('#tgE'), tgI = $('#tgI');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => (+v).toFixed(1) + ' V', (v) => { S.V = clamp(v, V_MIN, V_MAX); S.touched.knob = true; hideHint(); });
  function setV(v) { S.V = clamp(r1(v), V_MIN, V_MAX); rangeV.set(S.V); }
  function setClosed(c) {
    S.closed = !!c;
    swBtn.classList.toggle('closed', S.closed);
    swBtn.setAttribute('aria-pressed', String(S.closed));
    swBtn.textContent = S.closed ? '✋ 스위치 열기' : '🔌 스위치 닫기';
  }
  function toggleSwitch() { Sound.click(); S.touched.sw = true; setClosed(!S.closed); hideHint(); }
  function setShow(e, i) {
    S.showE = !!e; S.showI = !!i;
    tgE.setAttribute('aria-pressed', String(S.showE));
    tgI.setAttribute('aria-pressed', String(S.showI));
  }
  function readMeter(k) {
    if (!S.closed) { Sound.fail(); toast('🔌 스위치를 닫아야 전류가 흘러요'); S.shake[k] = S.t; }
    else {
      Sound.tick();
      const m = AM[k];
      fx.burst(m.x + S.offX, m.y, { count: 8, speed: 90, life: 0.5, size: 3, gravity: 0, colors: [AM_COLOR, '#c4b5fd', '#fff'], shape: 'star' });
    }
    S.pop[k].velocity = 5;
    S.read[k] = true;
    hideHint();
  }
  const readAll = (v) => { S.read = { a: v, b: v, c: v }; };

  swBtn.addEventListener('click', toggleSwitch);
  tgE.addEventListener('click', () => { Sound.click(); setShow(!S.showE, S.showI); hideHint(); });
  tgI.addEventListener('click', () => { Sound.click(); setShow(S.showE, !S.showI); hideHint(); });
  $$('.nudge').forEach((b) => b.addEventListener('click', () => { Sound.tick(); setV(S.V + +b.dataset.d); S.touched.knob = true; hideHint(); }));
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
      syncTools(set);
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

  /* ---------- 새 도구가 열릴 때: 살짝 튕기며 나타나요 ---------- */
  function tool(key, target, delay) {
    if (!featInit) { T[key] = target; TT[key] = target; return; }
    if (TT[key] === target) return;
    TT[key] = target;
    SciSim.tween(T, { [key]: target }, { duration: target ? 0.65 : 0.25, ease: target ? 'outBack' : 'outCubic', delay: target ? delay : 0 });
  }
  function syncTools(set) {
    AMK.forEach((k, i) => tool('am_' + k, set.has('ammeters') ? 1 : 0, 0.1 + i * 0.16));
    tool('volt', set.has('voltage') ? 1 : 0, 0.1);
    tool('water', set.has('water') ? 1 : 0, 0.35);
    featInit = true;
  }

  /* ---------- 시작 ---------- */
  function step(dt) {
    S.t += dt;
    // 스위치 칼날: 튕기며 움직이고, 닿는 순간 불꽃이 튀어요
    const prevSw = S.sw.value;
    S.sw.target = S.closed ? 0 : 0.62;
    S.sw.update(dt);
    if (S.sw.value < 0) { S.sw.value = 0; S.sw.velocity = Math.abs(S.sw.velocity) * 0.2; }
    if (S.closed && prevSw > 0.03 && S.sw.value <= 0.03 && !RM) {
      S.flash = 1;
      const x = G.L + S.offX, y = G.sw.top;
      for (let i = 0; i < 7; i++) fx.emit({ x, y, vx: (Math.random() - 0.5) * 140, vy: -30 - Math.random() * 90, life: 0.3 + Math.random() * 0.2, size: 2 + Math.random() * 1.5, color: i % 2 ? '#ffe27a' : '#fff', gravity: 360, shape: 'star' });
    }
    if (!S.closed && S.prevClosed && S.I > 0.04 && !RM) {      // 전류가 흐르다 끊길 때의 작은 불꽃
      const x = G.L + S.offX, y = G.sw.top;
      for (let i = 0; i < 6; i++) fx.emit({ x, y, vx: (Math.random() - 0.5) * 110, vy: -20 - Math.random() * 60, life: 0.22 + Math.random() * 0.15, size: 1.8 + Math.random(), color: i % 2 ? '#a5c8ff' : '#fff', gravity: 120 });
    }
    S.prevClosed = S.closed;
    S.flash = ap(S.flash, 0, dt, 7);
    // 전류·전압 (보이는 값은 부드럽게 따라가요)
    S.I = ap(S.I, amps(), dt, S.closed ? 6 : 10);
    S.Vd = ap(S.Vd, S.V, dt, 9);
    S.glowSp.target = brightness(); S.glowSp.update(dt);
    S.glow = Math.max(0, S.glowSp.value);
    S.phase += E_SPEED * S.I * dt;
    S.aphase += E_SPEED * S.I * dt;
    S.eA = ap(S.eA, showE() ? 1 : 0, dt, 5);
    S.iA = ap(S.iA, showI() ? 1 : 0, dt, 8);
    // 전류계 바늘 (스프링)
    AMK.forEach((k) => {
      S.needle[k].target = S.read[k] ? amps() : 0; S.needle[k].update(dt);
      S.pop[k].target = 0; S.pop[k].update(dt);
    });
    // 전원 장치 손잡이
    S.knobAng.target = (135 + 270 * S.V / V_MAX) * Math.PI / 180; S.knobAng.update(dt);
    S.knobLift = ap(S.knobLift, S.knob ? 1 : 0, dt, 14);
    // 물 모형
    const wv = S.closed ? S.Vd : 0;
    S.wphase += W_SPEED * wv * dt;
    S.wheelW = ap(S.wheelW, wv * 0.6, dt, 4);
    S.pumpW = ap(S.pumpW, wv * 0.9, dt, 4);
    S.wheel += S.wheelW * dt;
    S.pump += S.pumpW * dt;
    S.valve.target = S.closed ? 1 : 0; S.valve.update(dt);
    if (T.water > 0.95 && S.closed && !RM) S.splash += dt * S.wheelW * 9;
    S.offX = ap(S.offX, offTarget(), dt, 5);
    if (Math.abs(S.offX - offTarget()) < 0.05) S.offX = offTarget();
    fx.update(dt);
  }
  setClosed(S.closed);
  SciSim.tween(T, { intro: 1 }, { duration: 0.7, ease: 'outCubic' });
  SciSim.loop((dt, t) => {
    step(dt);
    draw();
    updateReadouts(t);
  });
  window.__sim = { S, T, AM, setV, setClosed, setShow, readAll, celebrate, get F() { return F; } };
})();
