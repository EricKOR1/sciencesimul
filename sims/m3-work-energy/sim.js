/* =========================================================
   중3 Ⅳ. 운동과 에너지 - 일과 에너지  [9과19-03]
   일의 정의를 알고, 자유 낙하하는 물체의 운동에서 중력이 한 일을
   위치 에너지와 운동 에너지로 표현한다.
   ① 관찰: 과학에서의 일 → ② 실험: 중력에 대해 한 일 = 위치 에너지
   → ③ 실험: 중력이 한 일 = 운동 에너지 → ④ 적용: 계산과 예측
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound } = SciSim;

  /* ---------- 상수 ---------- */
  const G = 9.8;
  // 휴대폰(폭 600px 미만)에서는 에너지 막대를 실험 화면 아래에 놓는다.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 880 : 600;
  const SW = PHONE ? 600 : 576;            // 실험 장면의 폭
  const FS = PHONE ? 1.2 : 1;
  const font = (n, bold) => (bold ? 'bold ' : '') + Math.round(n * FS * 2) / 2 + 'px sans-serif';
  const PANEL = PHONE ? { x: 10, y: 610, w: 580, h: 260 } : { x: 578, y: 10, w: 214, h: 580 };
  const C = { ep: '#3b82f6', epInk: '#1d4ed8', ek: '#f97316', ekInk: '#c2410c', work: '#be123c', force: '#e2464b', move: '#2563eb', good: '#16a34a' };

  // 1단계: 일의 뜻 (사람과 상자)
  const FLOOR = 450;                        // 바닥 y
  const APPM = 150;                         // 1 m = 150 px
  const BOX_A = 64;                         // 상자 크기 (px)
  const F_BOX = 10;                         // 상자의 무게 = 들어 올리는 힘 (N)
  const ACT = {
    lift: { name: '들어 올리기', icon: '⬆', dur: 1.6 },
    hold: { name: '들고 서 있기', icon: '🧍', dur: 2.6 },
    walk: { name: '들고 걸어가기', icon: '🚶', dur: 2.6 },
  };
  const ACT_KEYS = ['lift', 'hold', 'walk'];
  const BXA = 236, WALK_X0 = 150, WALK_D = 2;  // 상자 위치, 걷기 시작 위치, 걷는 거리(m)

  // 2~4단계: 크레인으로 들어 올리기와 자유 낙하
  const GY = 500;                           // 지면(높이 0 m) y
  const PPM = 40;                           // 1 m = 40 px
  const H_TOP = 10;
  const BX = 250;                           // 상자 중심 x
  const SLOW = 0.5;                         // 낙하는 ½배속으로 보여 줌
  const px = (h) => GY - h * PPM;

  /* ---------- 상태 ---------- */
  const S = {
    // 1단계
    act: null, actT: 0, actRun: false, done: {},
    // 2~4단계
    m: 2, h: 0,
    state: 'hold',                          // hold | fall | landed
    hDrop: 0, t: 0, v: 0,
    impact: null, drops: [], ghosts: [], lastGhost: 0,
    hTarget: null, pulseBox: false,
    drag: false, dragOff: 0, hover: false,
    fx: [],
    // 화면 효과용 (부드럽게 따라가는 값)
    V: { boxX: BXA, boxH: 0, pX: BXA - 84, phase: 0, fa: 0 }, pop: 0,
    liftP: 0, hd: 0, liftK: 0, hookY: 0, hookOpen: 0, faL: 0, shake: 0, landT: null, dropA: 0,
    bar: { up: 0, Ep: 0, gw: 0, Ek: 0 }, emax: 200, emaxT: 200, xfer: [], xferAcc: 0, barPos: null,
    cel: null, prevPh: '', inited: false,
  };
  let feat = new Set();
  const on = (f) => feat.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));
  const scene = () => (on('lift') ? 'lift' : 'act');

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const PT = new SciSim.Particles();           // 먼지 · 땀방울 · 반짝임
  const RM = SciSim.reduceMotion;
  const AP = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nowS = () => SciSim.time();
  const SCN = PHONE ? { x: 6, y: 6, w: 588, h: 596 } : { x: 6, y: 6, w: 566, h: 588 };   // 실험 장면 카드

  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); };
  // 글자 (흰 테두리): size는 기본 크기, 휴대폰에서는 FS배
  function ht(text, x, y, color, size, align) {
    D.text(x, y, text, { size: Math.max(13, size || 14) * FS, weight: 800, color, align: align || 'center', stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
  }
  function pill(text, x, y, bg, fg, size, align) {
    return D.label(x, y, text, { bg, color: fg, size: Math.max(13, size || 13) * FS, pad: 8 * FS, align: align === 'center' ? 'center' : align });
  }
  function card(x, y, w, h, r, fill) {
    D.shadow(() => { ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, r); ctx.fill(); }, { blur: 12, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(x, y, w, h, r); ctx.stroke();
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(nowS() * 6);
  function attention(x, y, w, h) {
    const a = pulse();
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.3 + a * 0.6).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(x - 8 - a * 3, y - 8 - a * 3, w + 16 + a * 6, h + 16 + a * 6, 14); ctx.stroke();
    ctx.restore();
  }
  // 빗금 무늬 (‘일’ 막대): 같은 색의 에너지로 바뀐다는 것을 보여 줌
  function hatch(color) {
    const c = document.createElement('canvas'); c.width = 12; c.height = 12;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 12, 12);
    g.strokeStyle = color; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(-3, 15); g.lineTo(15, -3); g.moveTo(-3, 3); g.lineTo(3, -3); g.moveTo(9, 15); g.lineTo(15, 9); g.stroke();
    return ctx.createPattern(c, 'repeat');
  }
  const HATCH = { ep: hatch(C.ep), ek: hatch(C.ek) };
  const fJ = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? fmt(Math.round(v), 0) : fmt(v, 1));
  const f1 = (v) => fmt(v, 1);

  function draw(tSec) {
    view.clear('#f4f8fd');
    const lp = S.liftP;
    if (lp < 0.999) { ctx.save(); ctx.globalAlpha = 1 - lp; drawActScene(tSec); ctx.restore(); drawActPanel(1 - lp); }
    if (lp > 0.001) { ctx.save(); ctx.globalAlpha = lp; ctx.translate((1 - lp) * 26, 0); drawLiftScene(tSec); ctx.restore(); drawLiftPanel(lp); }
    PT.draw(ctx);
    drawFx();
    drawCelebrate();
  }
  function addFx(text, x, y, color) { S.fx.push({ text, x, y, color, t0: nowS() }); }
  function drawFx() {
    const now = nowS();
    S.fx = S.fx.filter((f) => now - f.t0 < 1.5);
    S.fx.forEach((f) => {
      const a = now - f.t0, p = a / 1.5;
      const sc = 0.6 + 0.4 * SciSim.ease.outBack(clamp01(a / 0.3));
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      ctx.translate(f.x, f.y - p * 22); ctx.scale(sc, sc);
      ht(f.text, 0, 0, f.color, 21);
      ctx.restore();
    });
  }
  function celebrate() {
    // 상자·사람을 가리지 않도록 빈 곳에서 터뜨려요
    const lift = scene() === 'lift';
    const x = lift ? SCN.x + 118 : SCN.x + SCN.w * 0.8, y = lift ? SCN.y + 190 : SCN.y + SCN.h * 0.42;
    PT.burst(x, y, { count: 26, speed: 230, size: 4.5, life: 1 });
    S.cel = { x, y, t0: nowS() };
  }
  function drawCelebrate() {
    const c = S.cel;
    if (!c) return;
    const age = nowS() - c.t0;
    if (age > 1.6) { S.cel = null; return; }
    ctx.save(); ctx.globalAlpha = age > 1.1 ? 1 - (age - 1.1) / 0.5 : 1;
    D.shadow(() => D.check(c.x, c.y, 30 * FS * SciSim.ease.outBack(clamp01(age / 0.35)), clamp01((age - 0.15) / 0.4)), { blur: 14, y: 4 });
    ctx.restore();
  }

  /* ---------- 공통 그림: 나무 상자 ---------- */
  // (cx, cy) 가운데, s 한 변, sq 찌그러짐(+이면 납작), lift 0~1, label 글자, glow 색
  function crate(cx, cy, s, label, o) {
    o = o || {};
    const sq = o.sq || 0, lift = o.lift || 0, k = 1 + 0.06 * lift;
    ctx.save();
    ctx.translate(cx, cy + s / 2); ctx.scale((1 + sq * 0.7) * k, (1 - sq) * k); ctx.translate(0, -s / 2);
    const x = -s / 2, y = -s / 2;
    if (o.glow) D.glow(0, 0, s * 1.15, o.glow, o.glowA || 0.4);
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, y, 0, y + s);
      g.addColorStop(0, o.hot ? '#f6d29e' : '#e9c38b'); g.addColorStop(1, '#bd8744');
      ctx.fillStyle = g; rr(x, y, s, s, 6); ctx.fill();
    }, { blur: 8 + 10 * lift, y: 3 + 7 * lift, color: 'rgba(60,35,10,.35)' });
    // 널빤지 선
    ctx.strokeStyle = 'rgba(110,70,25,.38)'; ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 3, y + (s * i) / 4); ctx.lineTo(x + s - 3, y + (s * i) / 4); ctx.stroke(); }
    // 테두리 · 가로대
    ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2.4; rr(x, y, s, s, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + s / 2 - 6, y + 2, 12, s - 4);
    ctx.fillStyle = 'rgba(70,45,15,.22)'; ctx.fillRect(x + s / 2 - 6, y + s - 8, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + 4, y + 4, s * 0.5, 5, 2.5); ctx.fill();
    // 모서리 쇠판
    ctx.fillStyle = '#7b8798';
    [[x + 2, y + 2], [x + s - 8, y + 2], [x + 2, y + s - 8], [x + s - 8, y + s - 8]].forEach(([qx, qy]) => { rr(qx, qy, 6, 6, 2); ctx.fill(); });
    if (label) {
      const lw = Math.max(36 * FS, s * 0.62);
      ctx.fillStyle = '#fff7e6'; rr(-lw / 2, -9 * FS, lw, 18 * FS, 5); ctx.fill();
      ctx.strokeStyle = '#a06b2e'; ctx.lineWidth = 1.2; ctx.stroke();
      D.text(0, 4.6 * FS, label, { size: 13 * FS, weight: 800, color: '#5b3a14' });
    }
    ctx.restore();
  }
  function softShadow(x, y, rx, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(30,25,10,${a})`); g.addColorStop(1, 'rgba(30,25,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     1단계 장면: 상자에 힘을 주는 세 가지 동작
     ========================================================= */
  function actPose() {
    // 상자 위치(m 단위의 높이, 가로 px), 걷기 위상
    const a = S.act, p = a ? clamp(S.actT / ACT[a].dur, 0, 1) : 0;
    if (!a) return { boxX: BXA, boxH: 0, phase: 0, p: 0, d: 0, moved: 0 };
    if (a === 'lift') {
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      return { boxX: BXA, boxH: e, phase: 0, p, d: e, moved: e };
    }
    if (a === 'hold') return { boxX: BXA, boxH: 1, phase: 0, p, d: 0, moved: 0 };
    const dist = WALK_D * p;
    return { boxX: WALK_X0 + dist * APPM, boxH: 1, phase: p * Math.PI * 6, p, d: 0, moved: dist };
  }
  function ik(a, b, L, bend) {
    // a→b 사이를 길이 L인 두 마디로 잇는 관절 위치
    const dx = b.x - a.x, dy = b.y - a.y, Dd = Math.hypot(dx, dy);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (Dd >= 2 * L || Dd < 1) return { x: mx, y: my };
    const k = Math.sqrt(L * L - (Dd / 2) * (Dd / 2)) / Dd;
    return { x: mx - dy * k * bend, y: my + dx * k * bend };
  }
  // 두 겹으로 그려 윤곽이 또렷한 팔다리
  function limb(pts, color, edge, w) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[edge, w + 3], [color, w]].forEach(([c, lw]) => {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    });
  }
  function drawPerson(fx, boxCx, boxCy, phase, strain, tSec) {
    const swing = Math.sin(phase) * 13;
    const shoulderTarget = boxCx == null ? 0 : boxCy - 34;
    const hipY = clamp(shoulderTarget + 92, FLOOR - 118, FLOOR - 62);
    const lean = clamp((hipY - (FLOOR - 118)) * 0.55, 0, 30);
    const hip = { x: fx, y: hipY };
    const sh = { x: fx + 6 + lean, y: hipY - 92 };
    const head = { x: sh.x + 4 + lean * 0.3, y: sh.y - 32 + (strain ? Math.sin(tSec * 30) * 0.6 : 0) };
    const lf = { x: fx - 12 + swing, y: FLOOR - 4 }, rf = { x: fx + 12 - swing, y: FLOOR - 4 };
    softShadow(fx + 4, FLOOR + 4, 46, 0.3);
    ctx.save();
    // 다리
    [lf, rf].forEach((f) => { const kn = ik(hip, f, 60, -1); limb([hip, kn, f], '#2447a8', '#14275f', 11); });
    [lf, rf].forEach((f) => {
      const sg = ctx.createLinearGradient(0, FLOOR - 9, 0, FLOOR); sg.addColorStop(0, '#64748b'); sg.addColorStop(1, '#1e293b');
      ctx.fillStyle = sg; rr(f.x - 8, FLOOR - 9, 26, 9, 4); ctx.fill();
    });
    // 몸통
    const tg = ctx.createLinearGradient(hip.x - 12, 0, hip.x + 14, 0); tg.addColorStop(0, '#ff9a62'); tg.addColorStop(1, '#e8571f');
    limb([{ x: hip.x, y: hip.y - 6 }, { x: sh.x, y: sh.y + 6 }], tg, '#b9420f', 22);
    // 머리
    D.shadow(() => { ctx.fillStyle = '#ffd7b5'; ctx.beginPath(); ctx.arc(head.x, head.y, 20, 0, Math.PI * 2); ctx.fill(); }, { blur: 4, y: 2, color: 'rgba(60,30,10,.25)' });
    ctx.strokeStyle = '#c98a5b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(head.x, head.y, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3b2a1e';
    ctx.beginPath(); ctx.arc(head.x - 2, head.y - 6, 20, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#1b2333';
    ctx.beginPath(); ctx.arc(head.x + 8, head.y - 1, 2.6, 0, Math.PI * 2); ctx.fill();
    if (strain) { ctx.fillStyle = 'rgba(255,120,90,.35)'; ctx.beginPath(); ctx.arc(head.x + 11, head.y + 5, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (strain) { ctx.moveTo(head.x + 4, head.y + 9); ctx.lineTo(head.x + 13, head.y + 9); }
    else ctx.arc(head.x + 8, head.y + 6, 5, 0.2, Math.PI - 0.6);
    ctx.stroke();
    // 팔 (상자 왼쪽 면을 잡음)
    [-9, 9].forEach((dy) => {
      const hand = boxCx == null ? { x: sh.x + dy * 0.8 + 4, y: sh.y + 100 } : { x: boxCx - BOX_A / 2 + 4, y: boxCy + dy };
      const el = ik(sh, hand, 54, 1);
      limb([{ x: sh.x, y: sh.y + 4 }, el, hand], '#ffd7b5', '#c98a5b', 9);
      D.sphere(hand.x, hand.y, 6, '#ffd7b5', { gloss: false, light: '#fff0e0', dark: '#e0a77c' });
    });
    ctx.restore();
    return { head };
  }
  function drawActBackdrop() {
    const sc = SCN;
    // 벽
    const g = ctx.createLinearGradient(0, sc.y, 0, FLOOR);
    g.addColorStop(0, '#e6f0ff'); g.addColorStop(1, '#fbfdff');
    ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, FLOOR - sc.y);
    ctx.fillStyle = 'rgba(120,150,200,.07)';
    for (let x = sc.x + 30; x < sc.x + sc.w; x += 60) ctx.fillRect(x, sc.y, 26, FLOOR - sc.y);
    // 걸레받이
    ctx.fillStyle = '#f3eadb'; ctx.fillRect(sc.x, FLOOR - 14, sc.w, 14);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(sc.x, FLOOR - 14, sc.w, 2);
    // 마루
    const fg = ctx.createLinearGradient(0, FLOOR, 0, sc.y + sc.h);
    fg.addColorStop(0, '#e9cfa3'); fg.addColorStop(1, '#cfae7c');
    ctx.fillStyle = fg; ctx.fillRect(sc.x, FLOOR, sc.w, sc.y + sc.h - FLOOR);
    ctx.strokeStyle = 'rgba(120,80,30,.22)'; ctx.lineWidth = 2;
    let row = 0;
    for (let y = FLOOR + 34; y < sc.y + sc.h; y += 34, row++) {
      ctx.beginPath(); ctx.moveTo(sc.x, y); ctx.lineTo(sc.x + sc.w, y); ctx.stroke();
      ctx.lineWidth = 1.4;
      for (let x = sc.x + ((row % 2) * 70) + 40; x < sc.x + sc.w; x += 140) { ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.lineWidth = 2;
    }
  }
  function drawActScene(tSec) {
    const sc = SCN, P = actPose(), V = S.V;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.save();
    rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.clip();
    drawActBackdrop();
    // 1 m 높이 눈금
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(52,84,128,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sc.x + 12, FLOOR - APPM); ctx.lineTo(sc.x + sc.w - 12, FLOOR - APPM); ctx.stroke(); ctx.restore();
    ht('1 m', sc.x + 16, FLOOR - APPM - 8, '#4b5b72', 13, 'left');
    ht('바닥 (0 m)', sc.x + 16, FLOOR + 24, '#6b4f26', 13, 'left');

    const boxCx = V.boxX, boxCy = FLOOR - V.boxH * APPM - BOX_A / 2;
    const fx = V.pX;
    const holding = !!S.act;
    const tremble = S.act === 'hold' && S.actRun && S.actT > 0 && !RM ? Math.sin(tSec * 38) * 0.9 : 0;
    // 걷기 · 들어 올리기의 출발 위치 표시
    if (S.act === 'walk' || S.act === 'lift') {
      const sx = S.act === 'walk' ? WALK_X0 : BXA, sy = S.act === 'walk' ? FLOOR - APPM - BOX_A / 2 : FLOOR - BOX_A / 2;
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(37,99,235,.5)'; ctx.lineWidth = 2;
      rr(sx - BOX_A / 2, sy - BOX_A / 2, BOX_A, BOX_A, 6); ctx.stroke(); ctx.restore();
    }
    // 상자 그림자 (바닥에 가까울수록 진해요)
    softShadow(boxCx, FLOOR + 3, BOX_A * (0.55 + 0.15 * V.boxH), 0.32 - 0.13 * V.boxH);
    drawPerson(fx, holding ? boxCx : null, holding ? boxCy + tremble : FLOOR - 80, V.phase, S.act === 'hold' || (S.act === 'lift' && S.actRun && S.actT > 0), tSec);
    crate(boxCx, boxCy + tremble, BOX_A, '10 N', { lift: 0 });
    if (!holding) ht('◀ 상자 (무게 10 N)', boxCx + BOX_A / 2 + 10, boxCy + 5, '#5b3a14', 14, 'left');

    // 힘 화살표 (빨강, 위쪽): 힘을 주기 시작하면 쑥 자라남
    const top = boxCy - BOX_A / 2;
    if (holding && V.fa > 0.02) {
      const len = 80 * V.fa;
      D.arrow(boxCx, top - 4, boxCx, top - 4 - len, { color: C.force, width: 6, head: 18 });
      if (V.fa > 0.6) ht('힘 10 N', boxCx + 14, top - 4 - len * 0.7, C.force, 15, 'left');
    }
    // 이동 화살표 (파랑)
    if (S.act === 'lift' && P.d > 0.02) {
      const x = boxCx + BOX_A / 2 + 26;
      D.arrow(x, FLOOR - BOX_A / 2, x, boxCy, { color: C.move, width: 5 });
      ht('이동 ' + f1(P.d) + ' m', x + 12, (FLOOR - BOX_A / 2 + boxCy) / 2 + 5, C.move, 15, 'left');
    } else if (S.act === 'walk') {
      const y = FLOOR + 34;
      if (P.moved > 0.02) D.arrow(WALK_X0, y, boxCx, y, { color: C.move, width: 5 });
      ht('이동 ' + f1(P.moved) + ' m →', Math.max(WALK_X0 + 60, (WALK_X0 + boxCx) / 2), y + 30, C.move, 15);
      // 힘(위)과 이동 방향(옆)은 수직
      ht('힘(위쪽)과 이동 방향(옆쪽)은 수직', clamp(boxCx, sc.x + 150, sc.x + sc.w - 150), top - 100, '#334155', 14);
    } else if (S.act === 'hold') {
      ht('이동 0 m', boxCx + BOX_A / 2 + 14, boxCy + 5, C.move, 15, 'left');
      const sec = Math.min(Math.max(0, S.actT), ACT.hold.dur);
      pill('⏱ ' + f1(sec) + '초 동안 들고 있어요', sc.x + 18, 146, '#334155', '#fff', 14, 'left');
    }
    drawFormulaBanner(P);
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.stroke();
  }
  function drawFormulaBanner(P) {
    const sc = SCN, x = sc.x + 12, y = sc.y + 8, w = sc.w - 24, h = 96;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(x, y, w, h, 14); ctx.fill(); }, { blur: 10, y: 3 });
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; rr(x, y, w, h, 14); ctx.stroke();
    D.text(x + w / 2, y + 34, '일 = 힘 × 힘의 방향으로 이동한 거리', { size: 17 * FS, weight: 800, color: '#1b2333' });
    if (!S.act) { D.text(x + w / 2, y + 72, '위쪽 동작 버튼을 눌러 보세요', { size: 15 * FS, weight: 700, color: '#5d6879' }); return; }
    const d = Math.round(P.d * 10) / 10;
    const W = F_BOX * d;
    ctx.save(); ctx.translate(x + w / 2, y + 66); const sp = 1 + 0.16 * S.pop; ctx.scale(sp, sp);
    D.text(0, 6, '10 N × ' + f1(d) + ' m = ' + fJ(W) + ' J', { size: 21 * FS, weight: 800, color: C.work });
    ctx.restore();
    if (S.act === 'walk') D.text(x + w / 2, y + 90, '(힘의 방향인 위쪽으로는 이동하지 않았어요)', { size: 13 * FS, weight: 700, color: '#5d6879' });
  }
  function drawActPanel(a) {
    const P = PANEL;
    ctx.save(); ctx.globalAlpha = a;
    card(P.x, P.y, P.w, P.h, 14, 'rgba(255,255,255,.98)');
    D.text(P.x + 14, P.y + 30, '📋 일 기록표', { size: 16 * FS, weight: 800, align: 'left', color: '#1b2333' });
    const n = ACT_KEYS.length;
    ACT_KEYS.forEach((k, i) => {
      let x, y, w, h;
      if (PHONE) { w = (P.w - 28 - 2 * 10) / 3; h = 150; x = P.x + 14 + i * (w + 10); y = P.y + 46; }
      else { w = P.w - 24; h = 118; x = P.x + 12; y = P.y + 48 + i * (h + 12); }
      const rec = S.done[k], now = S.act === k;
      const pop = rec ? clamp01(rec.pop) : 1, pk = SciSim.ease.outBack(pop);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.94 + 0.06 * pk, 0.94 + 0.06 * pk); ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.fillStyle = rec ? (rec.W > 0 ? '#fff1f2' : '#f5f8fd') : '#fafbfd';
      rr(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = now ? '#f26b3a' : (rec && rec.W > 0 ? '#f9a8b4' : '#dde4ef'); ctx.lineWidth = now ? 3 : 1.5; ctx.stroke();
      D.text(x + 12, y + 28, ACT[k].icon + ' ' + ACT[k].name, { size: 15 * FS, weight: 800, align: 'left', color: '#1b2333' });
      if (!rec) {
        D.text(x + 12, y + 60, now ? '측정하는 중…' : '아직 해 보지 않았어요', { size: 13 * FS, weight: 700, align: 'left', color: '#8a95a6' });
        ctx.restore();
        return;
      }
      D.text(x + 12, y + 54, '힘 10 N · 힘의 방향', { size: 13 * FS, weight: 700, align: 'left', color: '#5d6879' });
      D.text(x + 12, y + 74, (PHONE ? '힘 방향 이동 ' : '힘의 방향 이동 거리 ') + f1(rec.d) + ' m', { size: 13 * FS, weight: 700, align: 'left', color: '#5d6879' });
      D.text(x + 12, y + (PHONE ? 130 : 104), '일 = ' + fJ(rec.W) + ' J', { size: 19 * FS, weight: 800, align: 'left', color: rec.W > 0 ? C.work : '#475569' });
      ctx.restore();
    });
    if (!PHONE) {
      const y = P.y + 48 + n * 130 + 18;
      D.text(P.x + P.w / 2, y + 10, '일의 단위: J (줄)', { size: 13, weight: 700, color: '#5d6879' });
      D.text(P.x + P.w / 2, y + 32, '1 J = 1 N × 1 m', { size: 13, weight: 700, color: '#5d6879' });
    }
    ctx.restore();
  }

  function startAct(k) {
    if (S.actRun) return;
    const first = !S.act;
    S.act = k; S.actT = first ? 0 : -0.45; S.actRun = true;      // 앞 동작의 자세에서 부드럽게 준비
    hideHint();
    markActs();
  }
  function stepAct(dt) {
    // 장면에 보이는 값은 목표를 향해 부드럽게 움직여요
    const P = actPose(), V = S.V, holding = !!S.act;
    V.boxX = AP(V.boxX, P.boxX, dt, S.actT < 0 ? 9 : 22);
    V.boxH = AP(V.boxH, P.boxH, dt, S.actT < 0 ? 9 : 22);
    V.pX = AP(V.pX, V.boxX - 84, dt, 30);
    V.phase = P.phase;
    V.fa = AP(V.fa, holding && !(S.actT < 0 && S.act !== 'lift') ? 1 : (holding ? 1 : 0), dt, 7);
    S.pop = AP(S.pop, 0, dt, 5);
    if (!S.actRun) return;
    S.actT += dt;
    const A = ACT[S.act];
    // 힘쓰는 땀방울
    if (S.act === 'hold' && S.actT > 0.3 && !RM && Math.random() < dt * 3.5) {
      PT.emit({ x: V.pX + 30, y: FLOOR - 190 - 20, vx: rnd(10, 40), vy: rnd(-40, -10), life: 0.7, size: 3.2, color: '#7dd3fc', gravity: 420, shape: 'bubble' });
    }
    if (S.actT >= A.dur) {
      S.actT = A.dur; S.actRun = false;
      const Pn = actPose();
      S.done[S.act] = { d: Pn.d, W: F_BOX * Pn.d, moved: Pn.moved, pop: 0 };
      SciSim.tween(S.done[S.act], { pop: 1 }, { duration: 0.5, ease: 'outBack' });
      S.pop = 1;
      Sound.tick();
      markActs();
      const bx = V.boxX, by = FLOOR - V.boxH * APPM - BOX_A / 2;
      if (S.act === 'lift') { PT.burst(bx, by - BOX_A / 2 - 10, { count: 14, speed: 150, size: 3.5, life: 0.7, colors: ['#be123c', '#ffb400', '#f26b3a'] }); addFx('+10 J', bx + 4, by - BOX_A / 2 - 20, C.work); }
      else addFx('0 J', bx + 4, by - BOX_A / 2 - 20, '#475569');
    }
  }
  function resetAct() { S.act = null; S.actT = 0; S.actRun = false; S.done = {}; markActs(); }
  function markActs() {
    $$('.act-btn').forEach((b) => {
      const k = b.dataset.act;
      b.classList.toggle('on', S.act === k);
      b.innerHTML = ACT[k].icon + ' ' + ACT[k].name + (S.done[k] ? ' <span class="ok">✓</span>' : '');
    });
  }
  $$('.act-btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); startAct(b.dataset.act); }));

  /* =========================================================
     2~4단계 장면: 크레인으로 들어 올리기 → 놓기(자유 낙하)
     ========================================================= */
  const boxSide = () => 34 + 6 * S.m;
  function liftEnergies() {
    const m = S.m, h = S.h, w = G * m;
    if (S.state === 'fall') {
      const gw = w * (S.hDrop - h);
      return { h, Ep: w * h, up: w * S.hDrop, gw, Ek: gw, v: S.v, weight: w };
    }
    if (S.state === 'landed' && S.impact) {
      const I = S.impact;
      return { h: 0, Ep: 0, up: I.W, gw: I.W, Ek: I.Ek, v: I.v, weight: G * I.m, landed: true };
    }
    return { h, Ep: w * h, up: w * h, gw: 0, Ek: 0, v: 0, weight: w };
  }
  const CLOUDS = [[40, 70, 1, 6], [330, 120, 0.8, 4], [190, 26, 0.7, 8]];
  function cloud(cx, cy, s) {
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2); ctx.arc(cx + 24 * s, cy - 10 * s, 25 * s, 0, Math.PI * 2);
    ctx.arc(cx + 52 * s, cy, 19 * s, 0, Math.PI * 2); ctx.rect(cx, cy, 52 * s, 19 * s); ctx.fill();
  }
  function drawLiftBackdrop(tSec) {
    const sc = SCN;
    D.sky(sc.x, sc.y, sc.w, GY - sc.y, '#8ccbff', '#e9f6ff');
    D.glow(sc.x + 350, sc.y + 100, 120, '#fff6c8', 0.8);
    D.sphere(sc.x + 350, sc.y + 100, 18, '#ffe27a', { gloss: false, light: '#fffbe0', dark: '#ffc83d' });
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    CLOUDS.forEach(([x0, y0, s, sp]) => {
      const span = sc.w + 140, cx = sc.x - 70 + ((x0 + (RM ? 0 : tSec * sp * FS)) % span);
      cloud(cx, sc.y + y0, s);
    });
    [['#a8dca4', 46, 0.011, 0.4], ['#86c987', 26, 0.018, 2]].forEach(([col, amp, f, ph]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sc.x, GY);
      for (let x = sc.x; x <= sc.x + sc.w + 12; x += 12) ctx.lineTo(x, GY - amp * (0.5 + 0.5 * Math.sin(x * f + ph)));
      ctx.lineTo(sc.x + sc.w + 12, GY); ctx.closePath(); ctx.fill();
    });
    const gh = sc.y + sc.h - GY, gg = ctx.createLinearGradient(0, GY, 0, GY + gh);
    gg.addColorStop(0, '#9bdc8f'); gg.addColorStop(0.1, '#6cbf6a'); gg.addColorStop(0.34, '#5fae60'); gg.addColorStop(0.35, '#d6bb8a'); gg.addColorStop(1, '#bf9c68');
    ctx.fillStyle = gg; ctx.fillRect(sc.x, GY, sc.w, gh);
  }
  function drawLiftScene(tSec) {
    const sc = SCN;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.save();
    if (S.shake > 0.02) ctx.translate(Math.sin(tSec * 70) * 4 * S.shake, Math.cos(tSec * 55) * 3 * S.shake);
    rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.clip();
    drawLiftBackdrop(tSec);
    // 높이 눈금
    for (let h = 0; h <= H_TOP; h++) {
      const y = px(h);
      if (h > 0) { ctx.strokeStyle = h % 5 === 0 ? 'rgba(52,84,128,.24)' : 'rgba(52,84,128,.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(52, y); ctx.lineTo(430, y); ctx.stroke(); }
      D.text(42, y + 4.5, h + '', { size: 13 * (h % 5 === 0 ? 1 : 1), weight: h % 5 === 0 ? 800 : 600, align: 'right', color: '#3d4c63', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    }
    D.text(sc.x + 8, 78, '높이(m)', { size: 13, weight: 800, align: 'left', color: '#3d4c63', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    drawCrane();

    const E = liftEnergies();
    const s = boxSide(), hd = S.hd, bottom = px(hd), top = bottom - s, cy = (top + bottom) / 2;
    const lk = S.liftK, falling = S.state === 'fall';
    // 낙하 기록 (잔상): 0.1초마다 하나씩 톡
    S.ghosts.forEach((gh, i) => {
      const age = falling ? S.t - (i + 1) * 0.1 : 1, pop = RM ? 1 : clamp01(age / 0.12);
      ctx.save(); ctx.globalAlpha = 0.5 * Math.min(1, pop * 1.5);
      const gs = s * (0.85 + 0.15 * pop);
      ctx.fillStyle = 'rgba(242,107,58,.07)'; rr(BX - gs / 2, px(gh) - s / 2 - gs / 2, gs, gs, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(242,107,58,.75)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    });
    // 목표 높이: 초록 선이 맥박 치듯 깜빡여요
    if (S.hTarget != null && S.state === 'hold') {
      const y = px(S.hTarget), ok = Math.abs(S.h - S.hTarget) < 0.05;
      D.dashedLine(52, y, 430, y, { color: C.good, width: 2.6, dash: [8, 6], offset: RM ? 0 : -tSec * 22 });
      if (!ok) D.ring(BX + s / 2 + 70, y, 11, tSec, { color: C.good });
      pill((ok ? '✓ 목표 ' : '🎯 목표 ') + S.hTarget + ' m', 60, y, C.good, '#fff', 14, 'left');
    }
    // 높이 표시
    if (hd > 0.05) {
      const lx = BX - s / 2 - 16;
      D.dashedLine(lx, bottom, lx, GY, { color: 'rgba(37,99,235,.75)', width: 2, dash: [4, 4] });
      ctx.strokeStyle = 'rgba(37,99,235,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx - 6, bottom); ctx.lineTo(lx + 6, bottom); ctx.moveTo(lx - 6, GY); ctx.lineTo(lx + 6, GY); ctx.stroke();
      ht('높이 ' + f1(S.h) + ' m', lx - 8, (bottom + GY) / 2 + 5, C.epInk, 14, 'right');
    }
    // 땅 그림자: 높이 올라갈수록 작고 옅어짐
    const prox = 1 - clamp01(hd / H_TOP);
    softShadow(BX, GY + 4, s * (0.6 + 0.45 * prox), 0.12 + 0.28 * prox);
    // 크레인 고리 + 줄
    drawHook(top, s, falling || S.state === 'landed');
    // 상자 (위치 에너지는 파란 빛, 운동 에너지는 주황 빛)
    if ((S.pulseBox || isNew('lift')) && S.state === 'hold') attention(BX - s / 2, top, s, s);
    let sq = 0;
    if (S.landT != null) { const tau = nowS() - S.landT; if (tau < 0.8) sq = 0.26 * Math.exp(-9 * tau) * Math.cos(28 * tau); }
    const epA = clamp01(E.Ep / 200) * 0.5, ekA = clamp01(E.Ek / 200) * 0.6;
    if (epA > 0.03 && !RM) D.glow(BX, cy, s * 1.3, C.ep, epA);
    if (ekA > 0.03 && !RM) D.glow(BX, cy, s * 1.3, C.ek, ekA);
    // 속도 선
    if (falling && S.v > 2 && !RM) {
      const len = Math.min(70, S.v * 4.5), w = s * 0.7;
      const sg = ctx.createLinearGradient(0, top, 0, top - len);
      sg.addColorStop(0, 'rgba(249,115,22,.3)'); sg.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = sg; rr(BX - w / 2, top - len, w, len, w / 2); ctx.fill();
    }
    crate(BX, cy, s, S.m + ' kg', { sq, lift: lk, hot: S.hover || S.drag });
    if (S.state !== 'fall' && !S.drag) {
      const bob = RM ? 0 : Math.sin(tSec * 4) * 3;
      ht('끌어 올리기', BX - s / 2 - 16, cy + 5 + bob, '#c2410c', 14, 'right');
      D.arrow(BX - s / 2 - 8, cy + bob - 16, BX - s / 2 - 8, cy + bob - 30, { color: '#c2410c', width: 3, head: 8 });
      D.arrow(BX - s / 2 - 8, cy + bob + 18, BX - s / 2 - 8, cy + bob + 32, { color: '#c2410c', width: 3, head: 8 });
    }

    // 힘 화살표: 무게(질량)에 비례해 길어져요
    const ax = BX + s / 2 + 24, wLen = 26 + 12 * S.m;
    const wt = fmt(E.weight, 1);
    if (S.state === 'hold' && S.h > 0.001) {
      D.arrow(ax, top + 10, ax, top + 10 - wLen * S.faL, { color: C.force, width: 5, head: 15 });
      ht('들어 올리는 힘 ' + wt + ' N', ax + 10, top + 10 - wLen * S.faL - 8, C.force, 14, 'left');
    }
    if (S.state !== 'landed') {
      D.arrow(ax - 0, bottom - 10, ax, bottom - 10 + wLen, { color: '#334155', width: 5, head: 15 });
      ht('중력 ' + wt + ' N', ax + 10, bottom - 10 + wLen + 14, '#334155', 14, 'left');
    }
    // 속력 화살표: 빨라질수록 길어져요
    if (falling || S.state === 'landed') {
      if (falling) {
        const vLen = Math.min(120, S.v * 7), vx = BX - s / 2 - 12;
        if (vLen > 8) D.arrow(vx, bottom - s * 0.4, vx, bottom - s * 0.4 + vLen, { color: '#c2410c', width: 5, head: 15 });
        pill('속력 ' + f1(E.v) + ' m/s', vx - 10, Math.max(64, top - 14), '#c2410c', '#fff', 14, 'right');
        pill('🐢 ½배속으로 보여 줘요', sc.x + 14, GY + 38, 'rgba(27,35,51,.78)', '#fff', 13, 'left');
      } else pill('땅에 닿기 직전 속력 ' + f1(E.v) + ' m/s', sc.x + 14, GY + 38, '#c2410c', '#fff', 14, 'left');
    }
    // 충격 파동
    if (S.landT != null) {
      const tau = nowS() - S.landT;
      if (tau < 0.7) { ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - tau / 0.7)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(BX, GY + 3, s * 0.6 + tau * 180, 5 + tau * 22, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.stroke();
  }
  function drawHook(top, s, released) {
    const hookY = released ? S.hookY : top - 4;
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(BX, 38); ctx.lineTo(BX, hookY - 8); ctx.stroke();
    // 고리 몸체 + 집게 (놓으면 벌어져요)
    D.shadow(() => { ctx.fillStyle = '#64748b'; rr(BX - 9, hookY - 12, 18, 12, 4); ctx.fill(); }, { blur: 4, y: 2 });
    const open = S.hookOpen;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(BX + d * 6, hookY); ctx.quadraticCurveTo(BX + d * (10 + 7 * open), hookY + 8, BX + d * (7 + 10 * open), hookY + 14); ctx.stroke(); });
    if (!released || S.hookOpen < 0.5) {
      ctx.strokeStyle = 'rgba(71,85,105,.9)'; ctx.lineWidth = 1.8;
      [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(BX + d * 6, hookY + 2); ctx.lineTo(BX + d * s * 0.36, hookY + 2 + Math.min(s * 0.4, 22)); ctx.stroke(); });
    }
  }
  function drawCrane() {
    const mx = 448;
    // 기둥 (격자)
    const cg = ctx.createLinearGradient(mx, 0, mx + 16, 0);
    cg.addColorStop(0, '#ffd23f'); cg.addColorStop(0.5, '#ffe58a'); cg.addColorStop(1, '#e0a400');
    D.shadow(() => { ctx.fillStyle = cg; ctx.fillRect(mx, 22, 16, GY - 22); }, { blur: 8, x: 4, y: 3, color: 'rgba(60,40,0,.3)' });
    ctx.strokeStyle = '#b07d00'; ctx.lineWidth = 1.5;
    for (let y = 30; y < GY; y += 22) { ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx + 16, y + 22); ctx.moveTo(mx + 16, y); ctx.lineTo(mx, y + 22); ctx.stroke(); }
    // 팔
    const ag = ctx.createLinearGradient(0, 18, 0, 30); ag.addColorStop(0, '#ffe58a'); ag.addColorStop(1, '#e0a400');
    D.shadow(() => { ctx.fillStyle = ag; rr(BX - 30, 18, mx + 70 - (BX - 30), 12, 3); ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(60,40,0,.3)' });
    ctx.strokeStyle = '#b07d00'; ctx.lineWidth = 1.5; rr(BX - 30, 18, mx + 70 - (BX - 30), 12, 3); ctx.stroke();
    ctx.fillStyle = '#64748b'; rr(mx + 40, 30, 34, 26, 4); ctx.fill();       // 균형추
    D.sphere(BX, 34, 8, '#475569', { gloss: false });                         // 도르래
    D.sphere(BX, 34, 3, '#cbd5e1', { gloss: false });
    // 운전실 · 감는 장치
    ctx.fillStyle = '#5b6b80'; rr(mx - 18, GY - 64, 52, 40, 5); ctx.fill();
    ctx.fillStyle = 'rgba(186,230,253,.9)'; rr(mx - 12, GY - 58, 24, 16, 3); ctx.fill();
    D.text(mx + 8, GY - 30, '크레인', { size: 13, weight: 800, color: '#fff' });
  }

  /* ---------- 에너지 막대 (일 → 에너지 짝) ---------- */
  function barRow(x, y, w, label, val, fill, ink, tag) {
    D.text(x, y, label, { size: 14 * FS, weight: 800, align: 'left', color: ink });
    D.text(x + w, y, fJ(val) + ' J', { size: 15 * FS, weight: 800, align: 'right', color: ink });
    const by = y + 8, bh = 24;
    const tg = ctx.createLinearGradient(0, by, 0, by + bh); tg.addColorStop(0, '#e1e7f0'); tg.addColorStop(1, '#f4f7fb');
    ctx.fillStyle = tg; rr(x, by, w, bh, 7); ctx.fill();
    const bw = val > 0.01 ? Math.max(6, clamp01(val / S.emax) * w) : 0;
    if (bw > 0) {
      ctx.save(); rr(x, by, w, bh, 7); ctx.clip();
      ctx.fillStyle = fill; ctx.fillRect(x, by, bw, bh);
      if (fill !== HATCH.ep && fill !== HATCH.ek) {
        const gg = ctx.createLinearGradient(0, by, 0, by + bh); gg.addColorStop(0, 'rgba(255,255,255,.4)'); gg.addColorStop(0.5, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(0,0,0,.12)');
        ctx.fillStyle = gg; ctx.fillRect(x, by, bw, bh);
      }
      ctx.restore();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6; rr(x, by, Math.max(bw, 8), bh, 7); ctx.stroke();
    }
    // 눈금
    ctx.strokeStyle = 'rgba(80,96,120,.45)'; ctx.lineWidth = 1;
    const tick = S.emaxT > 200 ? 100 : 50;
    for (let e = tick; e < S.emax; e += tick) { const tx = x + e / S.emax * w; ctx.beginPath(); ctx.moveTo(tx, by + bh - 6); ctx.lineTo(tx, by + bh); ctx.stroke(); }
    return { endX: x + bw, y: by + bh / 2 };
  }
  // 에너지가 한쪽에서 다른 쪽으로 옮겨 가는 작은 알갱이
  function chevrons(x, y, color, flow, tSec) {
    ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const k = RM ? 0.5 : ((tSec * 1.4 * (flow ? 1 : 0.35) + i / 3) % 1), yy = y - 8 + k * 22;
      ctx.globalAlpha = 0.25 + 0.75 * Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.moveTo(x - 5, yy); ctx.lineTo(x + 5, yy); ctx.lineTo(x, yy + 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function pairBlock(x, y, w, def, tSec) {
    if (def.tag) pill(def.tag, x + w, y - 30, '#334155', '#fff', 13, 'right');
    const a = barRow(x, y, w, def.a.label, def.a.val, def.a.fill, def.a.ink);
    chevrons(x + 8, y + 62 - 6, def.b.ink, def.flow, tSec);
    D.text(x + w / 2 + 6, y + 63, def.arrow, { size: 14 * FS, weight: 800, color: def.b.ink });
    const b = barRow(x, y + 92, w, def.b.label, def.b.val, def.b.fill, def.b.ink);
    D.text(x, y + 146, def.formula, { size: 13 * FS, weight: 700, align: 'left', color: '#5d6879' });
    if (def.isNew) {
      const k = pulse();
      ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + k * 0.55).toFixed(2) + ')'; ctx.lineWidth = 4;
      rr(x - 8, y - 24, w + 16, 184, 14); ctx.stroke(); ctx.restore();
      pill('NEW', x + w + 4, y - 26, '#f26b3a', '#fff', 13, 'right');
    }
    return { a, b };
  }
  function drawLiftPanel(al) {
    const P = PANEL, tSec = nowS();
    const Bv = S.bar;
    ctx.save(); ctx.globalAlpha = al;
    card(P.x, P.y, P.w, P.h, 14, 'rgba(255,255,255,.98)');
    D.text(P.x + 14, P.y + 30, '⚡ 일과 에너지', { size: 16 * FS, weight: 800, align: 'left', color: '#1b2333' });
    const falling = S.state === 'fall';
    const A = {
      a: { label: '중력에 대해 한 일', val: Bv.up, fill: HATCH.ep, ink: C.epInk },
      b: { label: '위치 에너지', val: Bv.Ep, fill: C.ep, ink: C.epInk },
      arrow: '위치 에너지로 저장', formula: '= 9.8 × 질량 × 높이', flow: S.state === 'hold' && (S.drag || Math.abs(S.hd - S.h) > 0.02),
    };
    const dA = S.dropA;
    const B = {
      a: { label: '중력이 한 일', val: Bv.gw, fill: HATCH.ek, ink: C.ekInk },
      b: { label: '운동 에너지', val: Bv.Ek, fill: C.ek, ink: C.ekInk },
      arrow: '운동 에너지로 전환', formula: '= ½ × 질량 × 속력²',
      tag: S.state === 'landed' ? '땅에 닿기 직전' : null, isNew: isNew('drop'), flow: falling,
    };
    const drawLocked = (x, y, w, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha * al;
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(248,250,253,.95)';
      rr(x - 4, y - 22, w + 8, 196, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      D.text(x + w / 2, y + 66, '🔒 놓아서 떨어뜨리기', { size: 15 * FS, weight: 800, color: '#8a95a6' });
      D.text(x + w / 2, y + 90, '3단계에서 열려요', { size: 13 * FS, weight: 700, color: '#8a95a6' });
      ctx.restore();
    };
    let pa, pb, bx, by, bw;
    if (PHONE) {
      const w = (P.w - 50) / 2; bw = w; bx = P.x + 34 + w; by = P.y + 70;
      pa = pairBlock(P.x + 16, P.y + 70, w, A, tSec);
    } else {
      const w = P.w - 28; bw = w; bx = P.x + 14; by = P.y + 320;
      pa = pairBlock(P.x + 14, P.y + 76, w, A, tSec);
      D.text(P.x + P.w / 2, P.y + P.h - 14, '막대 눈금: ' + (S.emaxT > 200 ? 100 : 50) + ' J마다', { size: 13, weight: 600, color: '#7b8798' });
    }
    if (dA < 0.99) drawLocked(bx, by, bw, 1 - dA);
    if (dA > 0.01) { ctx.save(); ctx.globalAlpha = dA * al; ctx.translate(0, (1 - dA) * 16); pb = pairBlock(bx, by, bw, B, tSec); ctx.restore(); }
    S.barPos = pb ? { pe: { x: pa.b.endX, y: pa.b.y }, ek: { x: pb.b.endX, y: pb.b.y } } : null;
    // 위치 에너지가 줄어드는 만큼 운동 에너지로: 알갱이가 옮겨 가요
    S.xfer.forEach((q) => {
      const pp = S.barPos; if (!pp) return;
      const x0 = pp.pe.x, y0 = pp.pe.y, x2 = pp.ek.x, y2 = pp.ek.y;
      const k = q.k, cx = PHONE ? (x0 + x2) / 2 : P.x + P.w - 8, cyy = PHONE ? y0 - 62 : (y0 + y2) / 2;
      const X = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cx + k * k * x2, Y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cyy + k * k * y2;
      D.sphere(X, Y, 4.5, SciSim.color.mix(C.ep, C.ek, k), { gloss: false });
    });
    ctx.restore();
  }

  /* ---------- 들어 올리기 / 놓기 ---------- */
  function setH(h, fromSlider) {
    h = clamp(Math.round(h * 10) / 10, 0, H_TOP);
    if (S.state !== 'hold') { S.state = 'hold'; S.ghosts = []; }
    S.h = h;
    if (!fromSlider) rangeH.set(h);
    updateButtons();
  }
  function setMass(v) {
    v = clamp(Math.round(v), 1, 5);
    // 땅에 닿은 뒤 질량을 바꾸면 이전 낙하 결과(옛 질량)와 상자 표시가 어긋나므로 '들어 올리기' 상태로 돌아가요
    if (v !== S.m && S.state === 'landed') { S.state = 'hold'; S.ghosts = []; S.v = 0; updateButtons(); }
    S.m = v; rangeM.set(v);
  }
  function drop() {
    if (!on('drop') || S.state !== 'hold' || S.h <= 0.001) return;
    S.hDrop = S.h; S.t = 0; S.v = 0; S.state = 'fall';
    S.ghosts = []; S.lastGhost = 0; S.pulseBox = false;
    hideHint(); Sound.click();
    updateButtons();
  }
  function again() {
    if (S.hDrop <= 0) return;
    S.state = 'hold'; S.h = S.hDrop; S.v = 0; S.ghosts = [];
    rangeH.set(S.h);
    updateButtons();
  }
  function stepFall(dt) {
    if (S.state !== 'fall') return;
    S.t += dt * SLOW;
    const h = S.hDrop - 0.5 * G * S.t * S.t;
    if (S.t - S.lastGhost >= 0.1 - 1e-9 && h > 0) { S.ghosts.push(h); S.lastGhost = Math.round(S.t * 10) / 10; }
    if (h <= 0) {
      const v = Math.sqrt(2 * G * S.hDrop);
      S.h = 0; S.v = v;
      S.impact = { m: S.m, hDrop: S.hDrop, W: G * S.m * S.hDrop, Ek: 0.5 * S.m * v * v, v };
      S.drops.push(S.impact);
      if (S.drops.length > 20) S.drops.shift();
      S.state = 'landed';
      rangeH.set(0);
      addFx('쿵!', BX, GY - boxSide() - 18, '#7c2d12');
      S.landT = nowS(); S.shake = RM ? 0 : clamp(S.impact.Ek / 160, 0.3, 1);
      S.hd = 0;
      if (!RM) {
        for (let k = 0; k < 8; k++) PT.emit({ x: BX + rnd(-1, 1) * boxSide() * 0.5, y: GY + 2, vx: (k % 2 ? 1 : -1) * rnd(30, 110), vy: -rnd(10, 45), life: 0.8, size: 6, grow: 18, color: '#e8dcc0', shape: 'smoke', drag: 2 });
        for (let k = 0; k < 6; k++) PT.emit({ x: BX, y: GY, vx: rnd(-110, 110), vy: -rnd(100, 230), life: 0.55, size: 2.6, color: '#8a6a3c', gravity: 560 });
      }
      Sound.tone(150, 0.2, 'sine', 0.18);
      updateButtons();
      return;
    }
    S.h = h; S.v = G * S.t;
  }
  function updateButtons() {
    const db = $('#dropBtn'), ab = $('#againBtn');
    db.disabled = S.state !== 'hold' || S.h <= 0.001;
    ab.disabled = S.state === 'hold' || S.hDrop <= 0;
    $('#sH').disabled = S.state === 'fall';
    $('#sM').disabled = S.state === 'fall';
  }
  $('#dropBtn').addEventListener('click', drop);
  $('#againBtn').addEventListener('click', () => { Sound.click(); again(); });

  function hitBox(p) {
    if (scene() !== 'lift' || S.state === 'fall') return false;
    const s = boxSide(), bottom = px(S.h), pad = Math.max(16, 22 / (view.scale || 1));
    return p.x > BX - s / 2 - pad && p.x < BX + s / 2 + pad && p.y > bottom - s - pad && p.y < bottom + pad;
  }
  SciSim.pointer(view, {
    hover(p) { S.hover = hitBox(p); return S.hover ? 'ns-resize' : null; },
    down(p) {
      if (!hitBox(p)) return false;
      S.drag = true; S.dragOff = p.y - px(S.h); S.pulseBox = false;
      hideHint(); Sound.tick();
      return true;
    },
    move(p) { if (S.drag) setH((GY - (p.y - S.dragOff)) / PPM); },
    up() { S.drag = false; },
  });
  view.canvas.addEventListener('pointerleave', () => { if (!S.drag) S.hover = false; });

  const rangeH = SciSim.bindRange($('#sH'), $('#oH'), (v) => fmt(v, 1) + ' m', (v) => { S.pulseBox = false; hideHint(); setH(v, true); });
  const rangeM = SciSim.bindRange($('#sM'), $('#oM'), (v) => v + ' kg', (v) => setMass(v));

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ---------- 측정값 ---------- */
  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.08) return;
    lastUI = t;
    if (scene() === 'act') {
      const P = actPose();
      const d = Math.round(P.d * 10) / 10;
      $('#rD').innerHTML = f1(d) + '<small>m</small>';
      $('#rW').innerHTML = fJ(F_BOX * d) + '<small>J</small>';
    } else {
      const E = liftEnergies();
      $('#rH').innerHTML = f1(E.h) + '<small>m</small>';
      $('#rEp').innerHTML = fJ(E.Ep) + '<small>J</small>';
      $('#rV').innerHTML = f1(E.v) + '<small>m/s</small>';
      $('#rEk').innerHTML = fJ(E.Ek) + '<small>J</small>';
    }
  }

  /* ---------- 미션 도우미 ---------- */
  function clearMarks() { S.hTarget = null; S.pulseBox = false; }
  function prep(o) {
    S.state = 'hold'; S.ghosts = []; S.v = 0; S.impact = null; S.hDrop = 0; S.drag = false;
    if (o.mass != null) setMass(o.mass);
    S.h = o.h != null ? o.h : 0; rangeH.set(S.h);
    updateButtons();
  }
  const workNow = () => G * S.m * S.h;
  const lastDrop = () => S.drops[S.drops.length - 1] || null;

  game = SciSim.game({
    simId: 'm3-work-energy',
    mount: '#game',
    badge: '일과 에너지 탐구자',
    homeHref: '../../index.html#g3',
    featureLabels: {
      act: '🙋 상자에 하는 동작 3가지',
      lift: '🏗️ 상자 끌어 올리기 · 높이 조절',
      mass: '⚖️ 질량 조절',
      drop: '✋ 놓기 (자유 낙하)',
    },
    onFeatures(set) {
      feat = set;
      const lift = set.has('lift');
      $('#actRow').hidden = lift;
      $('#tbLift').hidden = !lift;
      $('#roAct').hidden = lift;
      $('#roLift').hidden = !lift;
      if (!set.has('drop') && S.state !== 'hold') prep({});
    },
    onMissionStart() { clearMarks(); },
    levels: [
      /* ---------------- 1단계 ---------------- */
      {
        title: '과학에서의 일', short: '일의 뜻', icon: '📦', phase: '관찰',
        features: ['act'],
        intro: '<p>🤔 <b>탐구 질문</b> — 무거운 상자를 들고 <b>서 있기만</b> 하면 일을 한 걸까?</p>' +
          '<p>과학에서 말하는 <b>일</b>은 생활 속 ‘일’과 뜻이 달라요. 상자에 힘을 주는 세 가지 동작을 해 보며 과학에서의 일을 알아봐요.</p>',
        setup() { clearMarks(); resetAct(); showHint('위쪽 동작 버튼으로 상자에 힘을 주어 보세요', 6000); },
        recap: '과학에서 <b>일 = 힘 × 힘의 방향으로 이동한 거리</b>이고, 단위는 J(줄)이에요.',
        summary: '<ul><li>물체에 힘을 주어 물체가 <b>힘의 방향으로 이동</b>하면 힘이 물체에 <b>일</b>을 했다고 한다.</li>' +
          '<li>힘을 주어도 물체가 이동하지 않거나, 이동 방향이 힘의 방향과 <b>수직</b>이면 한 일은 0이다.</li></ul>' +
          '<span class="formula">일(J) = 힘(N) × 힘의 방향으로 이동한 거리(m)</span>' +
          '<p class="note">1 J은 1 N의 힘으로 물체를 힘의 방향으로 1 m 이동시킬 때 한 일이에요.</p>',
        missions: [
          {
            title: '세 가지 동작 비교하기',
            goal: '<b>⬆ 들어 올리기</b>, <b>🧍 들고 서 있기</b>, <b>🚶 들고 걸어가기</b>를 모두 해 보고, 기록표에서 한 일을 비교하세요.',
            hint: '위쪽 버튼을 하나씩 눌러요. 빨간 화살표는 상자에 준 힘, 파란 화살표는 상자가 이동한 방향이에요.',
            setup() { resetAct(); },
            check: () => ACT_KEYS.every((k) => !!S.done[k]),
            hold: 0.4,
            status: () => {
              const n = ACT_KEYS.filter((k) => S.done[k]).length;
              return '해 본 동작 <b>' + n + ' / 3</b> · ' + ACT_KEYS.map((k) => ACT[k].icon + ' ' + (S.done[k] ? '<b>' + fJ(S.done[k].W) + ' J</b>' : '—')).join(' · ');
            },
            explain: '세 동작 모두 상자에 위쪽으로 10 N의 힘을 주었지만, <b>힘의 방향으로 이동한 거리</b>가 있는 것은 들어 올리기(1 m)뿐이에요. 그래서 한 일은 10 N × 1 m = <b>10 J</b>이고, 나머지는 <b>0 J</b>이에요.',
          },
          {
            type: 'quiz',
            title: '탐구 질문의 답',
            goal: '무거운 상자를 들고 <b>서 있기만</b> 하면 과학에서 말하는 일을 한 걸까요?',
            choices: [
              '힘을 계속 주고 있으니 일을 했다',
              '팔이 아프고 힘이 드니 일을 했다',
              '상자가 이동하지 않았으니 한 일은 0이다',
              '상자를 들고 수평으로 걸어가야 일을 한 것이 된다',
            ],
            answer: 2,
            feedback: [
              '힘을 주기만 해서는 일이 아니에요. 일 = 힘 × <b>힘의 방향으로 이동한 거리</b>예요.',
              '생활 속 ‘힘든 일’과 과학에서의 일은 달라요. 기록표의 들고 서 있기 값을 보세요.',
              '',
              '들고 걸어가기도 0 J이었어요. 이동 방향(옆)이 힘의 방향(위)과 수직이기 때문이에요.',
            ],
            explain: '이동 거리가 0이면 힘이 아무리 커도 일 = 힘 × 0 = <b>0 J</b>이에요. 물체에 힘을 주고, 그 <b>힘의 방향으로 물체가 이동</b>해야 일을 한 거예요.',
          },
        ],
      },
      /* ---------------- 2단계 ---------------- */
      {
        title: '중력에 대해 한 일과 위치 에너지', short: '위치 에너지', icon: '🏗️', phase: '실험',
        features: ['lift', 'mass'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 일 = 힘 × 힘의 방향으로 이동한 거리라는 것을 알았어요.</div>' +
          '<p>물체를 들어 올리려면 물체에 작용하는 <b>중력(9.8 × 질량)</b>만큼의 힘으로 끌어 올려야 해요. 이렇게 <b>중력에 대해 한 일</b>은 어떻게 될까요?</p>',
        setup() { clearMarks(); prep({ mass: 2, h: 0 }); S.pulseBox = true; showHint('↕ 상자를 손가락으로 끌어 올려 보세요', 6000); },
        recap: '물체를 들어 올리며 <b>중력에 대해 한 일</b>은 <b>위치 에너지</b>로 저장돼요. (위치 에너지 = 9.8 × 질량 × 높이)',
        summary: '<ul><li>질량 m인 물체에 작용하는 중력 = 9.8 × m (N)</li>' +
          '<li>물체를 높이 h까지 들어 올릴 때 <b>중력에 대해 한 일</b> = 9.8 × m × h</li>' +
          '<li>중력에 대해 한 일은 물체의 <b>위치 에너지</b>로 저장된다. → 위치 에너지는 질량과 높이에 각각 비례</li></ul>' +
          '<span class="formula">위치 에너지(J) = 9.8 × 질량(kg) × 높이(m)</span>',
        missions: [
          {
            title: '2 kg 상자를 5 m까지',
            goal: '질량 2 kg인 상자를 초록 목표선 <b>5 m</b>까지 끌어 올리세요. 중력에 대해 한 일과 위치 에너지를 비교해 보세요.',
            hint: '상자를 손가락으로 끌어 올리거나 <b>📏 들어 올린 높이</b> 슬라이더를 써요. 2 kg에 작용하는 중력은 9.8 × 2 = 19.6 N이에요.',
            setup() { prep({ mass: 2, h: 0 }); S.hTarget = 5; S.pulseBox = true; },
            check: () => S.state === 'hold' && S.m === 2 && Math.abs(S.h - 5) < 0.05,
            hold: 0.6,
            status: () => {
              let s = '19.6 N × <b>' + f1(S.h) + ' m</b> = 중력에 대해 한 일 <b>' + fJ(workNow()) + ' J</b>';
              if (S.m !== 2) s = '⚠️ 질량은 <b>2 kg</b>으로 두세요.<br>' + s;
              return s;
            },
            explain: '중력에 대해 한 일 = 19.6 N × 5 m = <b>98 J</b>. 이 일은 사라지지 않고 높은 곳에 있는 상자의 <b>위치 에너지(98 J)</b>로 저장되었어요.',
          },
          {
            title: '일을 2배로!',
            goal: '질량이나 높이를 바꿔서 중력에 대해 한 일을 <b>196 J</b>(98 J의 2배)로 만들어 보세요.',
            hint: '처음(2 kg, 5 m)보다 질량을 2배로 하거나, 높이를 2배로 해 보세요. 9.8 × 질량 × 높이 = 196 이에요.',
            setup() { prep({ mass: 2, h: 5 }); },
            check: () => S.state === 'hold' && Math.abs(workNow() - 196) < 0.5,
            hold: 0.6,
            status: () => {
              const W = workNow();
              return '9.8 × <b>' + S.m + ' kg</b> × <b>' + f1(S.h) + ' m</b> = <b>' + fJ(W) + ' J</b>' + (Math.abs(W - 196) < 0.5 ? ' 🎯' : W > 196 ? ' (더 작게!)' : ' (더 크게!)');
            },
            explain: '2 kg × 10 m도, 4 kg × 5 m도 모두 <b>196 J</b>이에요. 질량이 2배이거나 높이가 2배이면 중력에 대해 한 일과 위치 에너지가 2배가 돼요. → 위치 에너지는 <b>질량과 높이에 각각 비례</b>해요.',
          },
          {
            type: 'quiz',
            title: '한 일은 어디로?',
            goal: '상자를 들어 올린 뒤 높은 곳에 멈춰 두었어요. 상자를 들어 올리며 <b>중력에 대해 한 일</b>은 어떻게 되었을까요?',
            choices: [
              '상자가 멈췄으니 사라졌다',
              '상자의 위치 에너지로 저장되었다',
              '상자의 운동 에너지로 저장되었다',
              '상자의 질량이 늘어났다',
            ],
            answer: 1,
            feedback: [
              '에너지는 그냥 사라지지 않아요. 파란 위치 에너지 막대를 보세요!',
              '',
              '멈춰 있는 상자는 운동 에너지가 0이에요.',
              '들어 올려도 질량은 변하지 않아요.',
            ],
            explain: '중력에 대해 한 일만큼 상자에 <b>위치 에너지</b>가 생겨요. 높은 곳에 있는 물체는 이 에너지 덕분에 떨어지면서 다른 물체에 일을 할 수 있어요.',
          },
        ],
      },
      /* ---------------- 3단계 ---------------- */
      {
        title: '중력이 한 일과 운동 에너지', short: '운동 에너지', icon: '🪂', phase: '실험',
        features: ['drop'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 들어 올린 상자에는 중력에 대해 한 일만큼 <b>위치 에너지</b>가 저장되었어요.</div>' +
          '<p>이제 상자를 <b>놓아</b> 자유 낙하시켜 봐요. 떨어지는 동안에는 <b>중력이 상자에 일</b>을 해요. 중력이 한 일은 어떤 에너지가 될까요?</p>',
        setup() { clearMarks(); prep({ mass: 2, h: 5 }); showHint('✋ 놓기 버튼을 눌러 상자를 떨어뜨려 보세요', 6000); },
        recap: '자유 낙하하는 동안 <b>중력이 한 일</b>은 <b>운동 에너지</b>로 바뀌어요. (운동 에너지 = ½ × 질량 × 속력²)',
        summary: '<ul><li>자유 낙하할 때 <b>중력이 한 일</b> = 9.8 × 질량 × 낙하 거리</li>' +
          '<li>중력이 한 일만큼 물체의 <b>운동 에너지</b>가 증가한다.</li>' +
          '<li>땅에 닿기 직전 운동 에너지 = 들어 올릴 때 중력에 대해 한 일</li></ul>' +
          '<span class="formula">운동 에너지(J) = ½ × 질량(kg) × 속력²</span>' +
          '<p class="note">예: 2 kg 상자가 5 m 떨어지면 중력이 한 일 98 J → 땅에 닿기 직전 운동 에너지 98 J (속력 약 9.9 m/s)</p>',
        missions: [
          {
            title: '상자를 놓아 보자',
            goal: '<b>✋ 놓기</b>를 눌러 5 m 높이의 2 kg 상자를 떨어뜨리고, 땅에 닿기 직전의 에너지 막대를 확인하세요.',
            hint: '위쪽의 ✋ 놓기 버튼을 눌러요. 다시 하려면 ↺ 다시 들어 올리기를 눌러요.',
            setup() { prep({ mass: 2, h: 5 }); },
            check: () => S.state === 'landed' && !!S.impact && S.impact.m === 2 && Math.abs(S.impact.hDrop - 5) < 0.05,
            hold: 0.6,
            status: () => {
              const E = liftEnergies();
              if (S.state === 'hold') return (S.m !== 2 || Math.abs(S.h - 5) > 0.05 ? '⚠️ 2 kg 상자를 5 m에서 떨어뜨려요.<br>' : '') + '<b>✋ 놓기</b>를 눌러 보세요.';
              if (S.state === 'landed' && !(S.impact.m === 2 && Math.abs(S.impact.hDrop - 5) < 0.05)) return '↺ 다시 들어 올린 뒤 <b>2 kg, 5 m</b>에서 떨어뜨려요.';
              return '낙하 거리 <b>' + f1(S.hDrop - E.h) + ' m</b> · 중력이 한 일 <b>' + fJ(E.gw) + ' J</b> · 운동 에너지 <b>' + fJ(E.Ek) + ' J</b>';
            },
            explain: '떨어지는 동안 중력이 한 일(19.6 N × 5 m = <b>98 J</b>)만큼 <b>운동 에너지</b>가 생겼어요. 땅에 닿기 직전 운동 에너지는 처음에 들어 올릴 때 한 일(98 J)과 같아요!',
          },
          {
            title: '다른 높이에서 떨어뜨리기',
            goal: '상자를 <b>다른 높이</b>까지 끌어 올려 다시 떨어뜨려 보세요. 땅에 닿기 직전 운동 에너지가 들어 올릴 때 한 일과 같나요?',
            hint: '땅에 있는 상자를 손가락으로 끌어 올리거나 높이 슬라이더를 써요. 5 m와 1 m 이상 다른 높이로 해 보세요.',
            setup() { prep({ mass: 2, h: 5 }); S.drops = []; },
            check: () => S.state === 'landed' && S.drops.some((d) => Math.abs(d.hDrop - 5) >= 0.95),
            hold: 0.5,
            status: () => {
              const list = S.drops.slice(-3).map((d) => '<b>' + f1(d.hDrop) + ' m</b>(' + d.m + ' kg) → 땅 직전 <b>' + fJ(d.Ek) + ' J</b>');
              return list.length ? '기록: ' + list.join(' · ') : '<b>✋ 놓기</b>로 먼저 한 번 떨어뜨려 보세요.';
            },
            explain: '어느 높이에서 떨어뜨려도 <b>땅에 닿기 직전 운동 에너지 = 중력이 한 일 = 들어 올릴 때 중력에 대해 한 일</b>이에요. 높이가 2배이면 운동 에너지도 2배예요.',
          },
          {
            type: 'quiz',
            title: '중력이 한 일은 어디로?',
            goal: '물체가 자유 낙하하는 동안 <b>중력이 한 일</b>은 어떻게 될까요?',
            choices: [
              '물체의 위치 에너지를 늘린다',
              '물체의 운동 에너지를 늘린다',
              '어떤 에너지로도 바뀌지 않고 사라진다',
              '물체의 질량을 늘린다',
            ],
            answer: 1,
            feedback: [
              '떨어질수록 높이가 낮아져 위치 에너지는 오히려 줄어요.',
              '',
              '에너지는 그냥 사라지지 않아요. 주황 운동 에너지 막대를 보세요!',
              '떨어져도 질량은 변하지 않아요.',
            ],
            explain: '중력이 한 일만큼 <b>운동 에너지</b>가 늘어나 속력이 빨라져요. 이때 줄어든 위치 에너지와 늘어난 운동 에너지의 양이 같아요.',
          },
        ],
      },
      /* ---------------- 4단계 ---------------- */
      {
        title: '일과 에너지 계산하기', short: '적용', icon: '🧮', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중력에 대해 한 일은 위치 에너지로, 중력이 한 일은 운동 에너지로 바뀌는 것을 확인했어요.</div>' +
          '<p>이제 식을 이용해 일과 에너지를 <b>계산</b>하고 결과를 <b>예측</b>해 봐요. 시뮬레이션으로 직접 확인해도 좋아요!</p>',
        setup() { clearMarks(); prep({ mass: 2, h: 5 }); },
        recap: '<b>일 = 힘 × 이동 거리</b>를 이용하면 들어 올린 일(위치 에너지)과 떨어질 때의 운동 에너지를 계산하고 예측할 수 있어요.',
        summary: '<ul><li>2 kg을 5 m 들어 올린 일 = 9.8 × 2 × 5 = 98 J = 위치 에너지</li>' +
          '<li>같은 물체가 5 m 떨어지면 중력이 한 일 = 98 J = 땅에 닿기 직전 운동 에너지</li>' +
          '<li>질량이나 높이가 2배 → 일과 에너지도 2배</li></ul>' +
          '<p class="note">다음 차시에서는 위치 에너지와 운동 에너지가 서로 바뀌며 그 합이 보존되는지 알아봐요.</p>',
        missions: [
          {
            type: 'quiz',
            title: '들어 올린 일 계산',
            goal: '질량 2 kg인 물체를 높이 5 m까지 천천히 들어 올렸어요. <b>중력에 대해 한 일</b>은?',
            choices: ['10 J', '19.6 J', '49 J', '98 J'],
            answer: 3,
            feedback: [
              '2 × 5만 계산했어요. 물체에 작용하는 중력은 9.8 × 2 = 19.6 N이에요.',
              '그건 들어 올리는 데 필요한 <b>힘(N)</b>이에요. 일 = 힘 × 이동 거리예요.',
              '절반만 계산했나요? 19.6 N × 5 m를 계산해 보세요.',
              '',
            ],
            explain: '일 = 19.6 N × 5 m = <b>98 J</b>. 이 일은 물체의 위치 에너지(98 J)로 저장돼요.',
          },
          {
            type: 'quiz',
            title: '높이가 2배라면?',
            goal: '같은 물체를 <b>10 m</b>에서 떨어뜨리면, 땅에 닿기 직전 운동 에너지는 5 m에서 떨어뜨릴 때(98 J)의 몇 배일까요?',
            choices: ['1배 (같다)', '2배', '4배', '½배'],
            answer: 1,
            feedback: [
              '중력이 한 일 = 9.8 × 질량 × <b>낙하 거리</b>예요. 낙하 거리가 달라졌어요.',
              '',
              '4배는 지나쳐요. 중력이 한 일(9.8 × 질량 × 낙하 거리)이 몇 배가 되는지 생각해 보세요.',
              '더 높은 곳에서 떨어지면 중력이 더 많은 일을 해요.',
            ],
            explain: '낙하 거리가 2배이면 중력이 한 일도 2배 → 운동 에너지도 <b>2배(196 J)</b>예요. 시뮬레이션으로 확인해 보세요!',
          },
          {
            title: '예측하고 확인하기',
            goal: '질량 <b>4 kg</b>인 상자가 땅에 닿기 직전 운동 에너지가 <b>98 J</b>이 되도록 높이를 예측해 끌어 올린 뒤 떨어뜨리세요.',
            hint: '9.8 × 4 × 높이 = 98 → 높이 = 98 ÷ 39.2 = ? (질량이 2배이면 높이는 ½)',
            setup() { prep({ mass: 4, h: 0 }); },
            check: () => S.state === 'landed' && !!S.impact && S.impact.m === 4 && Math.abs(S.impact.Ek - 98) < 1,
            hold: 0.5,
            status: () => {
              if (S.m !== 4) return '⚠️ 질량은 <b>4 kg</b>으로 두세요.';
              const I = S.impact;
              if (S.state === 'landed' && I) return '땅에 닿기 직전 운동 에너지 <b>' + fJ(I.Ek) + ' J</b>' + (Math.abs(I.Ek - 98) < 1 ? ' 🎯' : I.Ek > 98 ? ' (너무 커요 — 더 낮게!)' : ' (부족해요 — 더 높게!)');
              return '들어 올린 높이 <b>' + f1(S.h) + ' m</b> → 높이를 정했으면 <b>✋ 놓기</b>!';
            },
            explain: '9.8 × 4 × 2.5 = <b>98 J</b>. 질량이 2배(2 kg → 4 kg)이면 같은 에너지를 위해 높이는 ½(5 m → 2.5 m)이면 돼요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  updateButtons();
  markActs();
  function stepFx(dt) {
    const snap1 = !S.inited; S.inited = true;
    PT.update(dt);
    const lift = scene() === 'lift', falling = S.state === 'fall';
    S.liftP = snap1 ? (lift ? 1 : 0) : AP(S.liftP, lift ? 1 : 0, dt, 4.5);
    if (Math.abs(S.liftP - (lift ? 1 : 0)) < 0.002) S.liftP = lift ? 1 : 0;
    S.dropA = snap1 ? (on('drop') ? 1 : 0) : AP(S.dropA, on('drop') ? 1 : 0, dt, 4);
    if (falling) S.hd = S.h; else { S.hd = AP(S.hd, S.h, dt, S.drag ? 26 : 14); if (Math.abs(S.hd - S.h) < 0.003) S.hd = S.h; }
    S.liftK = AP(S.liftK, S.drag ? 1 : 0, dt, 18);
    S.shake = AP(S.shake, 0, dt, 6);
    S.faL = AP(S.faL, S.state === 'hold' && S.h > 0.001 ? 1 : 0, dt, 9);
    S.hookOpen = AP(S.hookOpen, S.state === 'hold' ? 0 : 1, dt, 14);
    const s = boxSide();
    if (S.state === 'hold') S.hookY = px(S.hd) - s - 4;
    else S.hookY = AP(S.hookY, px(S.hDrop) - s - 4, dt, 14);
    const E = liftEnergies();
    const rate = falling ? 40 : 12;
    ['up', 'Ep', 'gw', 'Ek'].forEach((k) => { S.bar[k] = AP(S.bar[k], E[k], dt, rate); if (Math.abs(S.bar[k] - E[k]) < 0.03) S.bar[k] = E[k]; });
    S.emaxT = Math.max(E.up, E.Ep, E.gw, E.Ek) > 200.5 ? 500 : 200;
    S.emax = AP(S.emax, S.emaxT, dt, 8); if (Math.abs(S.emax - S.emaxT) < 0.5) S.emax = S.emaxT;
    // 위치 에너지 → 운동 에너지 알갱이
    if (falling && E.h > 0.05 && !RM && S.barPos) { S.xferAcc += dt * 14; while (S.xferAcc >= 1) { S.xferAcc -= 1; if (S.xfer.length < 24) S.xfer.push({ k: 0 }); } }
    S.xfer.forEach((q) => { q.k += dt / 0.75; });
    S.xfer = S.xfer.filter((q) => q.k < 1);
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.prevPh !== 'success') celebrate();
    S.prevPh = ph;
  }
  SciSim.loop((dt, t) => {
    stepAct(dt);
    stepFall(dt);
    stepFx(dt);
    draw(SciSim.time());
    updateReadouts(t);
  });

  // 테스트·디버깅용 (읽기 전용으로 사용)
  window.WorkDebug = { S, PT, liftEnergies, actPose, get game() { return game; }, VW, VH, BX, GY, PPM, boxSide };
})();
