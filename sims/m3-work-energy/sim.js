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
  let E_MAX = 200;                          // 에너지 막대 최대 (J): 값이 크면 500 J로 바뀜

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
  };
  let feat = new Set();
  const on = (f) => feat.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));
  const scene = () => (on('lift') ? 'lift' : 'act');

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#ffffff' });
  const ctx = view.ctx;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function haloText(text, x, y, color, f, align, base) {
    ctx.font = f; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'alphabetic';
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  function arrow(x1, y1, x2, y2, color, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 4) return;
    const hl = Math.min(16, L * 0.6);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w || 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.8, y2 - Math.sin(a) * hl * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a) * hl - Math.sin(a) * hl * 0.55, y2 - Math.sin(a) * hl + Math.cos(a) * hl * 0.55);
    ctx.lineTo(x2 - Math.cos(a) * hl + Math.sin(a) * hl * 0.55, y2 - Math.sin(a) * hl - Math.cos(a) * hl * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function pill(text, x, y, bg, fg, f, align) {
    ctx.font = f || font(13, 1);
    const w = ctx.measureText(text).width + 18, h = 24 * FS;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = bg; roundRect(x0, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + w / 2, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function attention(x, y, w, h) {
    const a = pulse();
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.3 + a * 0.6).toFixed(2) + ')'; ctx.lineWidth = 4;
    roundRect(x - 8 - a * 3, y - 8 - a * 3, w + 16 + a * 6, h + 16 + a * 6, 14); ctx.stroke();
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

  function draw() {
    view.clear('#ffffff');
    if (scene() === 'act') { drawActScene(); drawActPanel(); }
    else { drawLiftScene(); drawLiftPanel(); }
    drawFx();
  }
  function addFx(text, x, y, color) { S.fx.push({ text, x, y, color, t0: performance.now() }); }
  function drawFx() {
    const now = performance.now();
    S.fx = S.fx.filter((f) => now - f.t0 < 1400);
    S.fx.forEach((f) => {
      const p = (now - f.t0) / 1400;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      haloText(f.text, f.x, f.y - p * 16, f.color, font(20, 1));
      ctx.globalAlpha = 1;
    });
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
    const dx = b.x - a.x, dy = b.y - a.y, D = Math.hypot(dx, dy);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (D >= 2 * L || D < 1) return { x: mx, y: my };
    const k = Math.sqrt(L * L - (D / 2) * (D / 2)) / D;
    return { x: mx - dy * k * bend, y: my + dx * k * bend };
  }
  function drawPerson(fx, boxCx, boxCy, phase, strain) {
    const swing = Math.sin(phase) * 13;
    const shoulderTarget = boxCx == null ? 0 : boxCy - 34;
    const hipY = clamp(shoulderTarget + 92, FLOOR - 118, FLOOR - 62);
    const lean = clamp((hipY - (FLOOR - 118)) * 0.55, 0, 30);
    const hip = { x: fx, y: hipY };
    const sh = { x: fx + 6 + lean, y: hipY - 92 };
    const head = { x: sh.x + 4 + lean * 0.3, y: sh.y - 32 };
    const lf = { x: fx - 12 + swing, y: FLOOR - 4 }, rf = { x: fx + 12 - swing, y: FLOOR - 4 };
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 다리
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 11;
    [lf, rf].forEach((f) => {
      const kn = ik(hip, f, 60, -1);
      ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(kn.x, kn.y); ctx.lineTo(f.x, f.y); ctx.stroke();
    });
    ctx.fillStyle = '#334155';
    [lf, rf].forEach((f) => { roundRect(f.x - 8, FLOOR - 9, 26, 9, 4); ctx.fill(); });
    // 몸통
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y - 6); ctx.lineTo(sh.x, sh.y + 6); ctx.stroke();
    // 머리
    ctx.fillStyle = '#ffd7b5'; ctx.strokeStyle = '#c98a5b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(head.x, head.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2a1e';
    ctx.beginPath(); ctx.arc(head.x - 2, head.y - 6, 20, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#1b2333';
    ctx.beginPath(); ctx.arc(head.x + 8, head.y - 1, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (strain) { ctx.moveTo(head.x + 4, head.y + 9); ctx.lineTo(head.x + 13, head.y + 9); }
    else ctx.arc(head.x + 8, head.y + 6, 5, 0.2, Math.PI - 0.6);
    ctx.stroke();
    // 팔 (상자 왼쪽 면을 잡음)
    ctx.strokeStyle = '#ffd7b5'; ctx.lineWidth = 9;
    [-9, 9].forEach((dy) => {
      const hand = boxCx == null ? { x: sh.x + dy * 0.8 + 4, y: sh.y + 100 } : { x: boxCx - BOX_A / 2 + 4, y: boxCy + dy };
      const el = ik(sh, hand, 54, 1);
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y + 4); ctx.lineTo(el.x, el.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
    });
    ctx.restore();
    return { head };
  }
  function drawBoxA(cx, cy) {
    const x = cx - BOX_A / 2, y = cy - BOX_A / 2;
    const g = ctx.createLinearGradient(0, y, 0, y + BOX_A);
    g.addColorStop(0, '#e2b77e'); g.addColorStop(1, '#c08a4a');
    ctx.fillStyle = g; roundRect(x, y, BOX_A, BOX_A, 6); ctx.fill();
    ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + BOX_A / 2 - 6, y, 12, BOX_A);
    ctx.fillStyle = '#5b3a14'; ctx.font = font(13, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('10 N', cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function drawActScene() {
    // 방
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
    g.addColorStop(0, '#eef5ff'); g.addColorStop(1, '#fbfdff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, FLOOR);
    ctx.fillStyle = '#e8d3b0'; ctx.fillRect(0, FLOOR, VW, 600 - FLOOR);
    ctx.fillStyle = '#d4b98e'; ctx.fillRect(0, FLOOR, VW, 4);
    ctx.strokeStyle = 'rgba(140,100,50,.18)'; ctx.lineWidth = 2;
    for (let y = FLOOR + 34; y < 600; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SW, y); ctx.stroke(); }
    // 1 m 높이 눈금
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(52,84,128,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, FLOOR - APPM); ctx.lineTo(SW - 14, FLOOR - APPM); ctx.stroke(); ctx.restore();
    haloText('1 m', 16, FLOOR - APPM - 7, '#4b5b72', font(13, 1), 'left');
    haloText('바닥 (0 m)', 16, FLOOR + 22, '#7a5a2e', font(13, 1), 'left');

    const P = actPose();
    const boxCx = P.boxX, boxCy = FLOOR - P.boxH * APPM - BOX_A / 2;
    const fx = boxCx - 84;
    const holding = !!S.act;
    // 걷기의 출발 위치 표시
    if (S.act === 'walk') {
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(37,99,235,.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(WALK_X0 - BOX_A / 2, boxCy - BOX_A / 2, BOX_A, BOX_A); ctx.restore();
    }
    if (S.act === 'lift') {
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(37,99,235,.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(boxCx - BOX_A / 2, FLOOR - BOX_A, BOX_A, BOX_A); ctx.restore();
    }
    drawPerson(fx, holding ? boxCx : null, holding ? boxCy : FLOOR - 80, P.phase, S.act === 'hold' || (S.act === 'lift' && S.actRun));
    drawBoxA(boxCx, boxCy);
    if (!holding) {
      // 동작 전: 상자 옆에 서 있음 (상자는 바닥 위)
      haloText('◀ 상자 (무게 10 N)', boxCx + BOX_A / 2 + 10, boxCy + 5, '#5b3a14', font(14, 1), 'left');
    }

    // 힘 화살표 (빨강, 위쪽)
    const top = boxCy - BOX_A / 2;
    if (holding) {
      arrow(boxCx, top - 4, boxCx, top - 84, C.force, 6);
      haloText('힘 10 N', boxCx + 12, top - 58, C.force, font(15, 1), 'left');
    }
    // 이동 화살표 (파랑)
    if (S.act === 'lift' && P.d > 0.02) {
      const x = boxCx + BOX_A / 2 + 26;
      arrow(x, FLOOR - BOX_A / 2, x, boxCy, C.move, 5);
      haloText('이동 ' + f1(P.d) + ' m', x + 10, (FLOOR - BOX_A / 2 + boxCy) / 2 + 5, C.move, font(15, 1), 'left');
    } else if (S.act === 'walk') {
      const y = FLOOR + 34;
      if (P.moved > 0.02) arrow(WALK_X0, y, boxCx, y, C.move, 5);
      haloText('이동 ' + f1(P.moved) + ' m →', Math.max(WALK_X0 + 60, (WALK_X0 + boxCx) / 2), y + 30, C.move, font(15, 1));
      // 힘(위)과 이동 방향(옆)은 수직
      haloText('힘(위쪽)과 이동 방향(옆쪽)은 수직', clamp(boxCx, 140, SW - 140), top - 100, '#334155', font(14, 1));
    } else if (S.act === 'hold') {
      haloText('이동 0 m', boxCx + BOX_A / 2 + 14, boxCy + 5, C.move, font(15, 1), 'left');
      const sec = Math.min(S.actT, ACT.hold.dur);
      pill('⏱ ' + f1(sec) + '초 동안 들고 있어요', 24, 146, '#334155', '#fff', font(14, 1));
    }
    drawFormulaBanner(P);
  }
  function drawFormulaBanner(P) {
    const x = 16, y = 14, w = SW - 32, h = 96;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = font(17, 1); ctx.textAlign = 'center';
    ctx.fillText('일 = 힘 × 힘의 방향으로 이동한 거리', x + w / 2, y + 34);
    if (!S.act) {
      ctx.fillStyle = '#5d6879'; ctx.font = font(15, 1);
      ctx.fillText('위쪽 동작 버튼을 눌러 보세요', x + w / 2, y + 72);
      return;
    }
    const d = Math.round(P.d * 10) / 10;
    const W = F_BOX * d;
    ctx.fillStyle = C.work; ctx.font = font(21, 1);
    ctx.fillText('10 N × ' + f1(d) + ' m = ' + fJ(W) + ' J', x + w / 2, y + 72);
    if (S.act === 'walk') {
      ctx.fillStyle = '#5d6879'; ctx.font = font(13, 1);
      ctx.fillText('(힘의 방향인 위쪽으로는 이동하지 않았어요)', x + w / 2, y + 90);
    }
  }
  function drawActPanel() {
    const P = PANEL;
    ctx.fillStyle = 'rgba(255,255,255,.97)'; roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = font(16, 1); ctx.textAlign = 'left';
    ctx.fillText('📋 일 기록표', P.x + 14, P.y + 30);
    const n = ACT_KEYS.length;
    ACT_KEYS.forEach((k, i) => {
      let x, y, w, h;
      if (PHONE) { w = (P.w - 28 - 2 * 10) / 3; h = 150; x = P.x + 14 + i * (w + 10); y = P.y + 46; }
      else { w = P.w - 24; h = 118; x = P.x + 12; y = P.y + 48 + i * (h + 12); }
      const rec = S.done[k], now = S.act === k;
      ctx.fillStyle = rec ? (rec.W > 0 ? '#fff1f2' : '#f5f8fd') : '#fafbfd';
      roundRect(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = now ? '#f26b3a' : '#dde4ef'; ctx.lineWidth = now ? 3 : 1.5; ctx.stroke();
      ctx.fillStyle = '#1b2333'; ctx.font = font(15, 1); ctx.textAlign = 'left';
      ctx.fillText(ACT[k].icon + ' ' + ACT[k].name, x + 12, y + 28);
      if (!rec) {
        ctx.fillStyle = '#9aa5b6'; ctx.font = font(13, 1);
        ctx.fillText(now ? '측정하는 중…' : '아직 해 보지 않았어요', x + 12, y + 60);
        return;
      }
      ctx.fillStyle = '#5d6879'; ctx.font = font(13, 1);
      ctx.fillText('힘 10 N · 힘의 방향', x + 12, y + 54);
      ctx.fillText('이동 거리 ' + f1(rec.d) + ' m', x + 12, y + 74);
      ctx.fillStyle = rec.W > 0 ? C.work : '#475569'; ctx.font = font(19, 1);
      ctx.fillText('일 = ' + fJ(rec.W) + ' J', x + 12, y + (PHONE ? 130 : 104));
    });
    if (!PHONE) {
      const y = P.y + 48 + n * 130 + 18;
      ctx.fillStyle = '#5d6879'; ctx.font = font(13, 1); ctx.textAlign = 'center';
      ctx.fillText('일의 단위: J (줄)', P.x + P.w / 2, y + 10);
      ctx.fillText('1 J = 1 N × 1 m', P.x + P.w / 2, y + 32);
    }
  }

  function startAct(k) {
    if (S.actRun) return;
    S.act = k; S.actT = 0; S.actRun = true;
    hideHint();
    markActs();
  }
  function stepAct(dt) {
    if (!S.actRun) return;
    S.actT += dt;
    const A = ACT[S.act];
    if (S.actT >= A.dur) {
      S.actT = A.dur; S.actRun = false;
      const P = actPose();
      S.done[S.act] = { d: P.d, W: F_BOX * P.d, moved: P.moved };
      Sound.tick();
      markActs();
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
  function drawLiftScene() {
    // 하늘과 땅
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#c9e6ff'); g.addColorStop(1, '#f3f9ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, GY);
    ctx.fillStyle = '#93d27f'; ctx.fillRect(0, GY, VW, 600 - GY);
    ctx.fillStyle = '#6fb85c'; ctx.fillRect(0, GY, VW, 4);
    // 높이 눈금
    ctx.textBaseline = 'middle';
    for (let h = 0; h <= H_TOP; h++) {
      const y = px(h);
      if (h > 0) {
        ctx.strokeStyle = h % 5 === 0 ? 'rgba(52,84,128,.2)' : 'rgba(52,84,128,.09)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(430, y); ctx.stroke();
      }
      ctx.fillStyle = '#4b5b72'; ctx.font = font(13, h % 5 === 0); ctx.textAlign = 'right';
      ctx.fillText(h + '', 40, y);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#4b5b72'; ctx.font = font(13, 1); ctx.textAlign = 'left';
    ctx.fillText('높이(m)', 6, 80);
    drawCrane();

    const E = liftEnergies();
    const s = boxSide(), bottom = px(S.h), top = bottom - s;
    // 낙하 기록 (잔상)
    S.ghosts.forEach((gh) => {
      ctx.strokeStyle = 'rgba(242,107,58,.35)'; ctx.lineWidth = 2;
      roundRect(BX - s / 2, px(gh) - s, s, s, 5); ctx.stroke();
    });
    // 밧줄 (들고 있을 때만)
    if (S.state === 'hold') {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(BX, 38); ctx.lineTo(BX, top); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(BX, top - 4, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5;
      const hookY = px(S.hDrop) - s - 4;
      ctx.beginPath(); ctx.moveTo(BX, 38); ctx.lineTo(BX, hookY); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(BX, hookY, 5, 0, Math.PI * 2); ctx.fill();
    }
    // 목표 높이
    if (S.hTarget != null && S.state === 'hold') {
      const y = px(S.hTarget), ok = Math.abs(S.h - S.hTarget) < 0.05;
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = C.good; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(430, y); ctx.stroke(); ctx.restore();
      pill((ok ? '✓ 목표 ' : '🎯 목표 ') + S.hTarget + ' m', 56, y, C.good, '#fff', font(14, 1));
    }
    // 높이 표시
    if (S.h > 0.05) {
      const lx = BX - s / 2 - 16;
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, bottom); ctx.lineTo(lx, GY); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx - 6, bottom); ctx.lineTo(lx + 6, bottom); ctx.moveTo(lx - 6, GY); ctx.lineTo(lx + 6, GY); ctx.stroke();
      haloText('높이 ' + f1(S.h) + ' m', lx - 8, (bottom + GY) / 2 + 5, C.epInk, font(14, 1), 'right');
    }
    // 상자
    if ((S.pulseBox || isNew('lift')) && S.state === 'hold') attention(BX - s / 2, top, s, s);
    const bg = ctx.createLinearGradient(0, top, 0, bottom);
    bg.addColorStop(0, S.drag || S.hover ? '#f0c58e' : '#e2b77e'); bg.addColorStop(1, '#c08a4a');
    ctx.fillStyle = bg; roundRect(BX - s / 2, top, s, s, 6); ctx.fill();
    ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5b3a14'; ctx.font = font(14, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.m + ' kg', BX, top + s / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    if (S.state !== 'fall' && !S.drag) haloText('끌어 올리기 ↕', BX - s / 2 - 14, top + s / 2 + 5, '#c2410c', font(14, 1), 'right');

    // 힘 화살표
    const ax = BX + s / 2 + 22;
    const wt = fmt(E.weight, 1);
    if (S.state === 'hold' && S.h > 0.001) {
      arrow(ax, top + 8, ax, top - 56, C.force, 5);
      haloText('들어 올리는 힘 ' + wt + ' N', ax + 8, top - 34, C.force, font(14, 1), 'left');
    }
    if (S.state !== 'landed') {
      arrow(ax, bottom - 8, ax, bottom + 54, '#334155', 5);
      haloText('중력 ' + wt + ' N', ax + 8, bottom + 38, '#334155', font(14, 1), 'left');
    }
    if (S.state === 'fall' || S.state === 'landed') {
      if (S.state === 'fall') {
        pill('속력 ' + f1(E.v) + ' m/s', BX - s / 2 - 12, Math.min(GY - 18, (top + bottom) / 2), '#c2410c', '#fff', font(14, 1), 'right');
        pill('🐢 ½배속으로 보여 줘요', 52, GY + 32, 'rgba(27,35,51,.75)', '#fff', font(13, 1));
      } else pill('땅에 닿기 직전 속력 ' + f1(E.v) + ' m/s', 52, GY + 32, '#c2410c', '#fff', font(14, 1));
    }
  }
  function drawCrane() {
    // 기둥
    const mx = 448;
    ctx.fillStyle = '#f5b301';
    ctx.fillRect(mx, 22, 16, GY - 22);
    ctx.strokeStyle = '#b07d00'; ctx.lineWidth = 1.5;
    for (let y = 30; y < GY; y += 22) { ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx + 16, y + 22); ctx.moveTo(mx + 16, y); ctx.lineTo(mx, y + 22); ctx.stroke(); }
    // 팔
    ctx.fillStyle = '#f5b301'; ctx.fillRect(BX - 30, 18, mx + 70 - (BX - 30), 12);
    ctx.strokeStyle = '#b07d00'; ctx.strokeRect(BX - 30, 18, mx + 70 - (BX - 30), 12);
    ctx.fillStyle = '#64748b'; ctx.fillRect(mx + 40, 30, 34, 26);       // 균형추
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(BX, 34, 8, 0, Math.PI * 2); ctx.fill(); // 도르래
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(BX, 34, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b6b80'; ctx.fillRect(mx - 18, GY - 64, 52, 40);   // 감는 장치
    ctx.fillStyle = '#fff'; ctx.font = font(13, 1); ctx.textAlign = 'center';
    ctx.fillText('크레인', mx + 8, GY - 38);
  }

  /* ---------- 에너지 막대 (일 → 에너지 짝) ---------- */
  function barRow(x, y, w, label, val, fill, ink, locked) {
    ctx.fillStyle = locked ? '#a3adbd' : ink; ctx.font = font(14, 1); ctx.textAlign = 'left';
    ctx.fillText(label, x, y);
    if (!locked) { ctx.textAlign = 'right'; ctx.font = font(15, 1); ctx.fillText(fJ(val) + ' J', x + w, y); }
    const by = y + 8, bh = 22;
    ctx.fillStyle = '#eef2f7'; roundRect(x, by, w, bh, 6); ctx.fill();
    if (!locked && val > 0.01) {
      const bw = Math.max(4, clamp(val / E_MAX, 0, 1) * w);
      ctx.fillStyle = fill; roundRect(x, by, bw, bh, 6); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // 눈금
    ctx.strokeStyle = 'rgba(80,96,120,.35)'; ctx.lineWidth = 1;
    const tick = E_MAX > 200 ? 100 : 50;
    for (let e = tick; e < E_MAX; e += tick) { const tx = x + e / E_MAX * w; ctx.beginPath(); ctx.moveTo(tx, by + bh - 5); ctx.lineTo(tx, by + bh); ctx.stroke(); }
  }
  function pairBlock(x, y, w, def) {
    const locked = def.locked;
    if (locked) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(248,250,253,.95)';
      roundRect(x - 4, y - 22, w + 8, 196, 12); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#8a95a6'; ctx.textAlign = 'center'; ctx.font = font(15, 1);
      ctx.fillText('🔒 ' + def.lockText, x + w / 2, y + 66);
      ctx.font = font(13); ctx.fillText(def.lockStep + '단계에서 열려요', x + w / 2, y + 90);
      return;
    }
    if (def.tag) pill(def.tag, x + w, y - 30, '#334155', '#fff', font(13, 1), 'right');
    barRow(x, y, w, def.a.label, def.a.val, def.a.fill, def.a.ink);
    ctx.fillStyle = def.b.ink; ctx.font = font(14, 1); ctx.textAlign = 'center';
    ctx.fillText('⬇ ' + def.arrow, x + w / 2, y + 62);
    barRow(x, y + 92, w, def.b.label, def.b.val, def.b.fill, def.b.ink);
    ctx.fillStyle = '#5d6879'; ctx.font = font(13, 1); ctx.textAlign = 'left';
    ctx.fillText(def.formula, x, y + 146);
    if (def.isNew) {
      const a = pulse();
      ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + a * 0.55).toFixed(2) + ')'; ctx.lineWidth = 4;
      roundRect(x - 8, y - 24, w + 16, 184, 14); ctx.stroke(); ctx.restore();
      pill('NEW', x + w + 4, y - 26, '#f26b3a', '#fff', font(13, 1), 'right');
    }
  }
  function drawLiftPanel() {
    const P = PANEL, E = liftEnergies();
    E_MAX = Math.max(E.up, E.Ep, E.gw, E.Ek) > 200.5 ? 500 : 200;
    ctx.fillStyle = 'rgba(255,255,255,.97)'; roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = font(16, 1); ctx.textAlign = 'left';
    ctx.fillText('⚡ 일과 에너지', P.x + 14, P.y + 30);
    const A = {
      a: { label: '중력에 대해 한 일', val: E.up, fill: HATCH.ep, ink: C.epInk },
      b: { label: '위치 에너지', val: E.Ep, fill: C.ep, ink: C.epInk },
      arrow: '위치 에너지로 저장', formula: '= 9.8 × 질량 × 높이',
    };
    const B = on('drop') ? {
      a: { label: '중력이 한 일', val: E.gw, fill: HATCH.ek, ink: C.ekInk },
      b: { label: '운동 에너지', val: E.Ek, fill: C.ek, ink: C.ekInk },
      arrow: '운동 에너지로 전환', formula: '= ½ × 질량 × 속력²',
      tag: E.landed ? '땅에 닿기 직전' : null, isNew: isNew('drop'),
    } : { locked: true, lockText: '놓아서 떨어뜨리기', lockStep: 3 };
    if (PHONE) {
      const w = (P.w - 50) / 2;
      pairBlock(P.x + 16, P.y + 70, w, A);
      pairBlock(P.x + 34 + w, P.y + 70, w, B);
    } else {
      const w = P.w - 28;
      pairBlock(P.x + 14, P.y + 76, w, A);
      pairBlock(P.x + 14, P.y + 320, w, B);
      ctx.fillStyle = '#7b8798'; ctx.font = font(13); ctx.textAlign = 'center';
      ctx.fillText('막대 눈금: ' + (E_MAX > 200 ? 100 : 50) + ' J마다', P.x + P.w / 2, P.y + P.h - 14);
    }
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
  SciSim.loop((dt, t) => {
    stepAct(dt);
    stepFall(dt);
    draw();
    updateReadouts(t);
  });

  // 테스트·디버깅용 (읽기 전용으로 사용)
  window.WorkDebug = { S, liftEnergies, actPose, get game() { return game; }, VW, VH, BX, GY, PPM, boxSide };
})();
