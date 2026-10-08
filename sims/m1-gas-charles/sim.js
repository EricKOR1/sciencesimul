/* =========================================================
   중1 Ⅵ. 기체의 성질 — 온도와 부피 [9과06-03]
   ① [관찰] 추를 올린 피스톤(압력 일정) 속 기체를 가열·냉각
   ② [실험] 온도·부피 측정 → 표와 그래프 → 관계 찾기
   ③ [설명] 입자 모형으로 해석 (운동 빠르기 변화, 입자의 크기·개수는 그대로)
   ④ [적용] 찌그러진 탁구공, 열기구, 냉장고 속 페트병
   ※ 정성적 설명에 주안점: 계산·예측 미션 없음 (측정값은 실험 결과로만 표시)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound, toast } = SciSim;

  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fff' });
  const ctx = view.ctx;
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 상태 ---------- */
  const T0 = 20;
  const Vof = (T) => 60 * (T + 273) / 273;   // 압력이 일정할 때 기체의 부피 (측정값)
  const S = {
    scene: '',
    Tset: T0, Tg: T0,
    data: [], fresh: -1,
    target: null, stage1: 0,
    showParticles: true, showHits: true, flashes: [],
    cold: { t: 0, done: false }, hot: { t: 0, done: false },
    // 탁구공
    ball: null,
    ballParts: [],
  };
  const settled = () => Math.abs(S.Tset - S.Tg) < 0.05;

  /* ---------- 배치 ---------- */
  const CYL = { x: 250, w: 180, bottom: 400, top: 84 };
  const PX = 3;                                 // 1 mL당 픽셀
  const pistonY = (V) => CYL.bottom - V * PX;
  function layout() {
    return on('record')
      ? { cx: 92, th: 338, graph: { x: 398, y: 26, w: 390, h: 480 } }
      : { cx: 236, th: 610, graph: null };
  }

  /* ---------- 입자 ---------- */
  const NP = 30, R = 6, BASE_SPEED = 170;
  const speedScale = (T) => (T + 273) / (T0 + 273);   // 온도가 높을수록 빠르게 (정성적 표현)
  const parts = [];
  let curScale = 1;
  for (let i = 0; i < NP; i++) {
    const a = Math.random() * Math.PI * 2, sp = BASE_SPEED * (0.65 + Math.random() * 0.7);
    parts.push({ x: CYL.x + R + Math.random() * (CYL.w - 2 * R), y: pistonY(Vof(T0)) + R + Math.random() * (Vof(T0) * PX - 2 * R), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }
  function stepParticles(dt) {
    const k = speedScale(S.Tg) / curScale;
    if (Math.abs(k - 1) > 1e-4) { parts.forEach((p) => { p.vx *= k; p.vy *= k; }); curScale *= k; }
    const top = pistonY(Vof(S.Tg));
    const L = CYL.x + R, Rr = CYL.x + CYL.w - R, B = CYL.bottom - R, T = top + R;
    const now = performance.now();
    const fl = S.showHits && on('hits');
    parts.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < L) { p.x = L + (L - p.x); p.vx = Math.abs(p.vx); }
      if (p.x > Rr) { p.x = Rr - (p.x - Rr); p.vx = -Math.abs(p.vx); }
      if (p.y > B) { p.y = B - (p.y - B); p.vy = -Math.abs(p.vy); }
      if (p.y < T) {
        p.y = Math.min(B, T + (T - p.y));
        if (p.vy < 0) { p.vy = Math.abs(p.vy); if (fl) S.flashes.push({ x: p.x, y: top, t: now, s: Math.hypot(p.vx, p.vy) }); }
      }
    });
    S.flashes = S.flashes.filter((f) => now - f.t < 380);
  }

  function step(dt) {
    // 기체 온도는 장치 온도를 천천히 따라감 (마지막에는 일정한 빠르기로 정확히 도달)
    const diff = S.Tset - S.Tg;
    let d = diff * Math.min(1, dt * 2);
    if (Math.abs(d) < 6 * dt) d = Math.sign(diff) * Math.min(Math.abs(diff), 6 * dt);
    S.Tg += d;
    // 배치가 바뀌면 입자도 함께 옮김
    const L = layout();
    if (L.cx !== CYL.x) { const dx = L.cx - CYL.x; parts.forEach((p) => { p.x += dx; }); CYL.x = L.cx; }
    stepParticles(dt);
  }

  /* ---------- 그리기 도우미 ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function pill(text, x, y, bg, fg, align) {
    ctx.font = 'bold 13px sans-serif';
    const w = ctx.measureText(text).width + 16;
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    ctx.fillStyle = bg; roundRect(x0, y - 12, w, 24, 12); ctx.fill();
    ctx.fillStyle = fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + w / 2, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = `rgba(139,92,246,${0.35 + a * 0.5})`; ctx.lineWidth = 4;
    roundRect(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.fillStyle = '#8b5cf6'; roundRect(x + w - 40, y - 16, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEW', x + w - 15, y);
    ctx.restore();
  }

  /* ---------- 실린더 장면 ---------- */
  function drawCylScene() {
    const L = layout();
    drawHeater();
    drawCylinder();
    if (on('thermo')) {
      drawThermo(L.th, 92, 290);
      if (isNew('thermo')) newRing(L.th - 22, 66, 70, 340);
    }
    if (L.graph) {
      drawGraph(L.graph);
      if (isNew('record')) newRing(L.graph.x, L.graph.y + 8, L.graph.w, L.graph.h - 8);
    }
  }

  function drawHeater() {
    const x0 = CYL.x, w = CYL.w;
    const t = clamp((S.Tset - T0) / 130, -1, 1);
    ctx.fillStyle = '#4b5565';
    roundRect(x0 - 20, CYL.bottom + 14, w + 40, 52, 10); ctx.fill();
    const col = t >= 0 ? `rgb(${210 + 45 * t},${150 - 100 * t},${110 - 90 * t})` : `rgb(${150 + 60 * t},${190 + 20 * t},245)`;
    ctx.fillStyle = col;
    roundRect(x0 - 10, CYL.bottom + 18, w + 20, 10, 5); ctx.fill();
    const now = performance.now() / 1000;
    if (S.Tset > 30) {
      const n = 8, k = (S.Tset - 30) / 120;
      for (let i = 0; i < n; i++) {
        const fx = x0 + (i + 0.5) * w / n;
        const fh = (6 + 16 * k) * (0.75 + 0.25 * Math.sin(now * 9 + i * 1.7));
        ctx.fillStyle = 'rgba(255,140,40,.9)';
        ctx.beginPath(); ctx.moveTo(fx - 6, CYL.bottom + 16); ctx.quadraticCurveTo(fx, CYL.bottom + 16 - fh * 1.5, fx + 6, CYL.bottom + 16); ctx.fill();
      }
    } else if (S.Tset < 10) {
      ctx.fillStyle = 'rgba(190,225,255,.95)'; ctx.font = '15px sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < 5; i++) ctx.fillText('❄', x0 + 18 + i * (w - 36) / 4, CYL.bottom + 12);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(S.Tset > 30 ? '🔥 가열 중' : S.Tset < 10 ? '❄ 냉각 중' : '가열·냉각 장치', x0 + w / 2, CYL.bottom + 52);
  }

  function drawCylinder() {
    const V = Vof(S.Tg), top = pistonY(V);
    const x0 = CYL.x, x1 = CYL.x + CYL.w;
    const showP = on('particles') && S.showParticles;
    ctx.fillStyle = showP ? '#f3f7ff' : 'rgba(96,140,240,.22)';
    ctx.fillRect(x0, top, CYL.w, CYL.bottom - top);
    if (!showP) {
      ctx.fillStyle = '#2f4ea8'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('공기', x0 + CYL.w / 2, top + (CYL.bottom - top) / 2 + 5);
    }
    // 목표선
    if (S.target) {
      const ty = pistonY(S.target.V);
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x0 - 26, ty); ctx.lineTo(x1 + 14, ty); ctx.stroke(); ctx.restore();
      pill(S.target.label, x1 + 6, ty, '#14a058', '#fff', 'left');
    }
    if (showP) {
      parts.forEach((p) => {
        ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
      });
      parts.forEach((p) => {
        const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 0.5, p.x, p.y, R);
        g.addColorStop(0, '#9fb8ff'); g.addColorStop(1, '#2f5be3');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      });
      const now = performance.now();
      S.flashes.forEach((f) => {
        const a = 1 - (now - f.t) / 380, big = clamp(f.s / BASE_SPEED, 0.5, 2.2);
        ctx.strokeStyle = `rgba(242,107,58,${a})`; ctx.lineWidth = 1.5 + big;
        ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 8 * big, 0, Math.PI * 2); ctx.stroke();
      });
    }
    // 실린더
    ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, CYL.top); ctx.lineTo(x0, CYL.bottom); ctx.lineTo(x1, CYL.bottom); ctx.lineTo(x1, CYL.top); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + 8, CYL.top + 10); ctx.lineTo(x0 + 8, CYL.bottom - 10); ctx.stroke();
    // 눈금
    ctx.fillStyle = '#5d6879'; ctx.font = '13px sans-serif'; ctx.textAlign = 'right';
    for (let v = 0; v <= 100; v += 10) {
      const y = pistonY(v);
      ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = v % 20 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0 - (v % 20 === 0 ? 12 : 7), y); ctx.lineTo(x0, y); ctx.stroke();
      if (v % 20 === 0) ctx.fillText(v + '', x0 - 15, y + 4);
    }
    ctx.save(); ctx.translate(x0 - 50, 250); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('부피 (mL)', 0, 0); ctx.restore();
    // 피스톤 + 추
    const ph = 16;
    const pg = ctx.createLinearGradient(0, top - ph, 0, top);
    pg.addColorStop(0, '#c9d1dd'); pg.addColorStop(1, '#8792a5');
    ctx.fillStyle = pg; roundRect(x0 + 2, top - ph, CYL.w - 4, ph, 4); ctx.fill();
    ctx.strokeStyle = '#6b768a'; ctx.lineWidth = 1.5; ctx.stroke();
    const cx = x0 + CYL.w / 2;
    ctx.fillStyle = '#5d6879';
    ctx.beginPath(); ctx.moveTo(cx - 58, top - ph); ctx.lineTo(cx + 58, top - ph); ctx.lineTo(cx + 42, top - ph - 44); ctx.lineTo(cx - 42, top - ph - 44); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('추', cx, top - ph - 24);
    ctx.font = 'bold 12px sans-serif'; ctx.fillText('(압력 일정)', cx, top - ph - 8);
  }

  function drawThermo(x, y, h) {
    const lo = -50, hi = 150;
    const t = clamp((S.Tg - lo) / (hi - lo), 0, 1);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 3;
    roundRect(x - 12, y, 24, h, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + h + 10, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e2464b';
    ctx.beginPath(); ctx.arc(x, y + h + 10, 14, 0, Math.PI * 2); ctx.fill();
    const span = h - 18, lh = span * t;
    roundRect(x - 5, y + h - 4 - lh, 10, lh + 12, 5); ctx.fill();
    ctx.fillStyle = '#5d6879'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    for (let c = lo; c <= hi; c += 25) {
      const yy = y + h - 4 - span * ((c - lo) / (hi - lo));
      ctx.fillRect(x + 12, yy, c % 50 === 0 ? 8 : 5, 1.5);
      if (c % 50 === 0) ctx.fillText(c + '°', x + 23, yy + 5);
    }
    ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#3a4456';
    ctx.fillText('🌡 온도계', x + 8, y - 12);
    pill(fmt(S.Tg, 0) + ' °C', x, y + h + 46, '#e2464b', '#fff');
  }

  function drawGraph(G) {
    const { x: gx, y: gy, w: gw, h: gh } = G;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5;
    roundRect(gx, gy, gw, gh, 12); ctx.fill(); ctx.stroke();
    const pad = { l: 52, r: 18, t: 40, b: 42 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const X = { min: -50, max: 150, step: 50 }, Y = { min: 0, max: 100, step: 20 };
    const px = (v) => x0 + (v - X.min) / (X.max - X.min) * (x1 - x0);
    const py = (v) => y0 - (v - Y.min) / (Y.max - Y.min) * (y0 - y1);
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('📈 온도–부피 그래프', gx + 12, gy + 21);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#5d6879'; ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let v = X.min; v <= X.max; v += X.step) {
      ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(v, px(v), y0 + 16);
    }
    for (let v = Y.min; v <= Y.max; v += Y.step) {
      ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(v, x0 - 7, py(v) + 4);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('온도 (°C)', (x0 + x1) / 2, y0 + 34);
    ctx.save(); ctx.translate(gx + 16, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('부피 (mL)', 0, 0); ctx.restore();

    const pts = S.data.map((d) => [d.T, d.V]).sort((a, b) => a[0] - b[0]);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1])))); ctx.stroke();
    }
    pts.forEach((p) => {
      ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    const cx = px(clamp(S.Tg, X.min, X.max)), cy = py(clamp(Vof(S.Tg), Y.min, Y.max));
    const pulse = 7 + Math.sin(performance.now() / 200) * 2;
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    if (!S.data.length) {
      ctx.fillStyle = '#8a95a6'; ctx.font = '13px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('📍 기록하기를 누르면 점이 찍혀요', x1 - 4, y1 + 14);
    }
  }

  /* ---------- 탁구공 장면 ---------- */
  const POT = { x: 452, y: 214, w: 280, h: 270, water: 262 };
  const TABLE = 486;
  const BALL_R = 62;
  function resetBall() {
    S.ball = { x: 180, y: TABLE - BALL_R, vy: 0, inWater: false, T: 20, dent: 20, drag: null, popped: false };
    S.ballParts = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * (BALL_R - 16), sp = 110 * (0.7 + Math.random() * 0.6);
      S.ballParts.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r, vx: Math.cos(a + 1) * sp, vy: Math.sin(a + 1) * sp });
    }
  }
  const inPot = (x) => x > POT.x + 16 && x < POT.x + POT.w - 16;
  function stepPong(dt) {
    const b = S.ball;
    if (!b.drag) {
      if (b.inWater) {
        // 물 위에 떠서 살짝 출렁임
        const ty = POT.water + BALL_R * 0.35 + Math.sin(performance.now() / 500) * 2;
        b.y += (ty - b.y) * Math.min(1, dt * 6);
        b.x += (clamp(b.x, POT.x + BALL_R + 6, POT.x + POT.w - BALL_R - 6) - b.x) * Math.min(1, dt * 8);
      } else if (b.y < TABLE - BALL_R) {
        // 탁자 위로 떨어짐
        b.vy += 1800 * dt; b.y = Math.min(TABLE - BALL_R, b.y + b.vy * dt);
        if (b.y >= TABLE - BALL_R) { b.vy = 0; Sound.tick(); }
      }
    }
    b.T += ((b.inWater ? 80 : 20) - b.T) * Math.min(1, dt * (b.inWater ? 0.9 : 0.15));
    const want = 20 * clamp((58 - b.T) / 34, 0, 1);
    if (want < b.dent) b.dent = want;                 // 한 번 펴지면 다시 찌그러지지 않음
    if (!b.popped && b.dent <= 0.01) { b.popped = true; b.dent = 0; Sound.success(); toast('뽁! 탁구공이 다시 펴졌어요 🏓'); }
    // 공 속 입자
    const sc = (b.T + 273) / 293;
    const lim = BALL_R - 10;
    S.ballParts.forEach((p) => {
      const k = sc * 110 / Math.max(1, Math.hypot(p.vx, p.vy)) * (p.base || (p.base = Math.hypot(p.vx, p.vy) / 110));
      p.vx *= k; p.vy *= k;
      p.dx += p.vx * dt; p.dy += p.vy * dt;
      const d = Math.hypot(p.dx, p.dy);
      if (d > lim) {
        const nx = p.dx / d, ny = p.dy / d, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
        p.dx = nx * lim; p.dy = ny * lim;
      }
    });
  }
  // 찌그러진 곳: 오른쪽 위가 부드럽게 오목하게 들어간 모양
  function ballPath(x, y, r, dent) {
    const c = -Math.PI / 4, w = 0.8, N = 90;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = i / N * Math.PI * 2;
      let d = Math.atan2(Math.sin(th - c), Math.cos(th - c));
      const bump = Math.abs(d) < w ? Math.cos(Math.PI / 2 * d / w) ** 2 : 0;
      const rr = r - dent * 1.05 * bump;
      const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function drawPongScene() {
    const b = S.ball;
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('❓ 찌그러진 탁구공을 뜨거운 물에 넣으면?', 20, 32);
    // 탁자
    ctx.fillStyle = '#e9dcc8'; ctx.fillRect(0, TABLE, 800, 520 - TABLE);
    ctx.strokeStyle = '#c9b391'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, TABLE); ctx.lineTo(800, TABLE); ctx.stroke();
    // 비커 + 뜨거운 물
    ctx.fillStyle = 'rgba(255,170,120,.28)';
    ctx.fillRect(POT.x, POT.water, POT.w, POT.y + POT.h - POT.water);
    ctx.strokeStyle = '#e8875a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(POT.x, POT.water); ctx.lineTo(POT.x + POT.w, POT.water); ctx.stroke();
    // 김
    const now = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(160,170,190,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const sx = POT.x + 50 + i * 60, ph = now * 1.3 + i;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const yy = POT.water - 12 - k * 6, xx = sx + Math.sin(ph + k * 0.6) * 7; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // 공 (물 위에 있을 때 앞쪽 물을 다시 그려 잠긴 느낌)
    drawBall(b);
    if (b.inWater && !b.drag) {
      ctx.save(); ballPath(b.x, b.y, BALL_R + 3, b.dent); ctx.clip();
      ctx.fillStyle = 'rgba(255,170,120,.45)';
      ctx.fillRect(POT.x + 2, POT.water, POT.w - 4, POT.y + POT.h - POT.water);
      ctx.restore();
    }
    // 비커 벽
    ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(POT.x, POT.y); ctx.lineTo(POT.x, POT.y + POT.h); ctx.lineTo(POT.x + POT.w, POT.y + POT.h); ctx.lineTo(POT.x + POT.w, POT.y); ctx.stroke();
    ctx.fillStyle = '#c2410c'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♨ 뜨거운 물 (약 80 °C)', POT.x + POT.w / 2, POT.y + POT.h + 26);
    if (!b.inWater && !b.drag && !b.popped) {
      // 안내 화살표
      ctx.save(); ctx.setLineDash([8, 7]); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x + 40, b.y - 74); ctx.quadraticCurveTo(330, 90, POT.x + 80, POT.water - 34); ctx.stroke(); ctx.restore();
      pill('✋ 끌어서 뜨거운 물에 넣기', 330, 128, '#1b2333', '#fff');
    }
  }
  function drawBall(b) {
    // 그림자
    if (!b.inWater) {
      const hgt = clamp((TABLE - BALL_R - b.y) / 300, 0, 1);
      ctx.fillStyle = `rgba(80,60,40,${0.18 - hgt * 0.1})`;
      ctx.beginPath(); ctx.ellipse(b.x, TABLE + 4, BALL_R * (0.85 - hgt * 0.3), 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ballPath(b.x, b.y, BALL_R, b.dent);
    const g = ctx.createRadialGradient(b.x - 20, b.y - 22, 6, b.x, b.y, BALL_R);
    g.addColorStop(0, '#fff3e0'); g.addColorStop(1, '#ffb066');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ballPath(b.x, b.y, BALL_R, b.dent); ctx.clip();
    S.ballParts.forEach((p) => {
      ctx.fillStyle = '#2f5be3';
      ctx.beginPath(); ctx.arc(b.x + p.dx, b.y + p.dy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(56,103,244,.3)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(b.x + p.dx, b.y + p.dy); ctx.lineTo(b.x + p.dx - p.vx * 0.06, b.y + p.dy - p.vy * 0.06); ctx.stroke();
    });
    ctx.restore();
    ballPath(b.x, b.y, BALL_R, b.dent);
    ctx.strokeStyle = b.drag ? '#f26b3a' : '#e08a2e'; ctx.lineWidth = b.drag ? 3.5 : 2.5; ctx.stroke();
    if (b.dent > 0.5) pill('찌그러진 곳', b.x + 62, b.y - 72, '#fff4e6', '#9a3412');
  }

  /* ---------- 장면 전환 & 화면 요소 ---------- */
  function setScene(sc, force) {
    if (S.scene === sc && !force) return;
    S.scene = sc;
    if (sc === 'pong') resetBall();
    $('#tbLabel').innerHTML = sc === 'pong' ? '🏓 찌그러진 탁구공과 뜨거운 물' : '🔥 추를 올린 피스톤 <small>(압력 일정)</small>';
    refreshUI();
  }
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/);
      const need = node.getAttribute('data-need');
      node.hidden = !(scs.indexOf(S.scene) >= 0 && (!need || on(need)));
    });
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1100;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    lastFree = free;
  }

  /* ---------- 입력 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  const rangeT = SciSim.bindRange($('#sT'), $('#oT'), (v) => v + ' °C', (v) => { S.Tset = v; hideHint(); });
  function setT(v, instant) { S.Tset = v; rangeT.set(v); if (instant) S.Tg = v; }
  $('#showHits').addEventListener('change', (e) => { S.showHits = e.target.checked; });
  const tgP = $('#tgParticles');
  function setParticles(onOff) { S.showParticles = onOff; tgP.setAttribute('aria-pressed', onOff ? 'true' : 'false'); }
  tgP.addEventListener('click', () => { Sound.click(); setParticles(!S.showParticles); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); if (S.scene === 'pong') resetBall(); else setT(T0, true); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  SciSim.pointer(view, {
    hover(p) { return S.scene === 'pong' && Math.hypot(p.x - S.ball.x, p.y - S.ball.y) < BALL_R + 10 ? 'grab' : null; },
    down(p) {
      if (S.scene !== 'pong') return false;
      const b = S.ball;
      if (Math.hypot(p.x - b.x, p.y - b.y) > BALL_R + 14) return false;
      b.drag = { ox: p.x - b.x, oy: p.y - b.y }; hideHint();
      return true;
    },
    move(p) {
      const b = S.ball;
      if (!b.drag) return;
      b.x = clamp(p.x - b.drag.ox, BALL_R + 4, 800 - BALL_R - 4);
      b.y = clamp(p.y - b.drag.oy, BALL_R + 4, TABLE - BALL_R);
      b.inWater = false; b.vy = 0;
    },
    up() {
      const b = S.ball;
      if (!b.drag) return;
      b.drag = null;
      b.inWater = inPot(b.x);
      if (b.inWater) Sound.tick();
    },
  });

  /* ---------- 기록 ---------- */
  function renderTable() {
    const rows = S.data.slice().sort((a, b) => a.T - b.T);
    const cols = Math.max(4, rows.length);
    const rt = $('#rowT'), rv = $('#rowV');
    rt.innerHTML = '<th>온도 (°C)</th>'; rv.innerHTML = '<th>부피 (mL)</th>';
    for (let i = 0; i < cols; i++) {
      const d = rows[i];
      const cls = d ? (d === S.data[S.fresh] ? 'fresh' : '') : 'empty';
      rt.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? d.T : '·') + '</td>');
      rv.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? d.V : '·') + '</td>');
    }
    $('#dataN').textContent = '기록 ' + S.data.length + '개';
  }
  $('#recBtn').addEventListener('click', () => {
    if (!settled()) { Sound.fail(); toast('🌡 온도계 눈금이 멈출 때까지 잠깐 기다렸다가 기록하세요'); return; }
    Sound.tick();
    const T = Math.round(S.Tg), V = Math.round(Vof(T));
    const d = { T, V };
    const i = S.data.findIndex((x) => Math.abs(x.T - T) < 5);
    if (i >= 0) { S.data[i] = d; S.fresh = i; } else { if (S.data.length >= 9) S.data.shift(); S.data.push(d); S.fresh = S.data.length - 1; }
    renderTable();
    toast('📍 기록: 온도 ' + T + ' °C, 부피 ' + V + ' mL');
  });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.data = []; S.fresh = -1; renderTable(); });
  renderTable();

  /* ---------- 측정값 표시 ---------- */
  let lastUI = 0;
  function speedWord(T) {
    const s = speedScale(T);
    const n = clamp(Math.round((s - 0.7) / 0.8 * 5) + 1, 1, 6);
    return '▮'.repeat(n) + '<span style="color:#c3ccd9">' + '▮'.repeat(6 - n) + '</span> ' + (s < 0.93 ? '느림' : s > 1.12 ? '빠름' : '보통');
  }
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    $('#rT').innerHTML = fmt(S.Tg, 0) + '<small>°C</small>';
    $('#rV').innerHTML = fmt(Vof(S.Tg), 0) + '<small>mL</small>';
    $('#rN').innerHTML = NP + '<small>개</small>';
    $('#rS').innerHTML = speedWord(S.Tg);
    $('#rBT').innerHTML = fmt(S.ball.T, 0) + '<small>°C</small>';
    $('#rDent').textContent = S.ball.dent > 0.5 ? (S.ball.dent > 12 ? '많이 찌그러짐' : '조금 찌그러짐') : '동그랗게 펴짐 ✔';
  }

  // 3단계 미션 1: 차가울 때·뜨거울 때 각각 2초 관찰
  function watchCompare(dt) {
    const m = game && game.current();
    if (!m || !m.compare || !game.isActive(m)) return;
    [['cold', S.Tg <= 0.5], ['hot', S.Tg >= 99.5]].forEach(([k, inside]) => {
      const o = S[k];
      if (o.done) return;
      o.t = inside ? o.t + dt : 0;
      if (o.t >= 2) { o.done = true; Sound.tick(); }
    });
  }

  /* ---------- 미션 ---------- */
  const mark = (b) => (b ? '✔' : '—');
  const distinctT = () => {
    const vals = S.data.map((d) => d.T).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    vals.forEach((v) => { if (v - last >= 15) { n++; last = v; } });
    return n;
  };
  function mini(kind) {
    const d = { up: 'M9 33 L58 9', downcurve: 'M9 6 Q14 34 58 35', flat: 'M9 21 L58 21', down: 'M9 9 L58 33' }[kind];
    return '<span style="display:inline-flex;align-items:center;gap:10px"><svg viewBox="0 0 64 42" width="64" height="42" aria-hidden="true" style="flex:none">' +
      '<path d="M6 3V38H61" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="' + d + '" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/></svg>';
  }
  const choiceG = (kind, text) => mini(kind) + '<span>' + text + '</span></span>';
  const LEVEL_SCENE = ['cyl', 'cyl', 'cyl', 'pong'];

  // 다시 열어서 표가 비어 있으면 먼저 기록하도록 안내
  function needData() { if (distinctT() < 3) toast('📋 표가 비어 있어요. 먼저 측정값을 몇 개 기록한 뒤 답해 보세요.', null, 3500); }

  game = SciSim.game({
    simId: 'm1-gas-charles',
    mount: '#game',
    badge: '온도·부피 탐구가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      heater: '🔥 가열·냉각 장치',
      thermo: '🌡 온도계',
      record: '📋 실험 결과 표 · 📈 그래프',
      particles: '🔬 입자 모형',
      hits: '💥 충돌 표시',
      pong: '🏓 탁구공 실험',
    },
    onFeatures(set, added) {
      F = set;
      if (added.indexOf('particles') >= 0) setParticles(true);
      refreshUI();
    },
    onMissionStart(m) {
      S.target = null;
      if (!(game && game.free)) setScene(LEVEL_SCENE[m._level]);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '기체를 가열하면?', short: '관찰', icon: '🔥', phase: '관찰',
        features: ['heater', 'thermo'],
        intro: '<p>❓ <b>탐구 질문: 찌그러진 탁구공을 뜨거운 물에 넣으면 왜 펴질까?</b></p>' +
          '<p>자유롭게 움직이는 피스톤 위에 <b>추</b>를 올려 기체의 압력을 일정하게 했어요. 실린더 속 기체를 <b>가열</b>하거나 <b>냉각</b>하며 부피를 관찰해 봐요.</p>',
        setup() { setScene('cyl', true); setT(T0, true); showHint('🔥 가열·냉각 장치 슬라이더로 온도를 바꿔 보세요', 6000); },
        recap: '압력이 일정할 때 기체를 <b>가열하면 부피가 커지고</b>, 냉각하면 부피가 작아져요.',
        summary: '<p>압력이 일정할 때 기체를 <b>가열하면 부피가 커지고</b>, <b>냉각하면 부피가 작아진다</b>.</p>',
        missions: [
          {
            title: '가열했다가 냉각하기',
            goal: '① 기체를 <b>가열</b>해 피스톤을 초록 선 위로 올렸다가, ② <b>냉각</b>해 초록 선 아래로 내려 보세요.',
            hint: '<b>🔥 가열·냉각 장치</b> 슬라이더를 오른쪽(가열) 끝까지 옮겼다가, 왼쪽(냉각) 끝까지 옮겨 보세요.',
            setup() { S.stage1 = 0; S.target = { V: 82, label: '① 가열해서 여기 위로' }; },
            check: () => {
              const V = Vof(S.Tg);
              if (S.stage1 === 0 && V >= 82) { S.stage1 = 1; S.target = { V: 54, label: '② 냉각해서 여기 아래로' }; Sound.tick(); }
              else if (S.stage1 === 1 && V <= 54) { S.stage1 = 2; S.target = null; }
              return S.stage1 === 2;
            },
            status: () => '① 가열하기 <b>' + mark(S.stage1 >= 1) + '</b> · ② 냉각하기 <b>' + mark(S.stage1 >= 2) + '</b> · 온도 <b>' + fmt(S.Tg, 0) + ' °C</b> · 부피 <b>' + fmt(Vof(S.Tg), 0) + ' mL</b>',
            hold: 0,
            explain: '기체를 가열하자 피스톤이 올라가 <b>부피가 커지고</b>, 냉각하자 피스톤이 내려와 <b>부피가 작아졌어요</b>. 추의 무게는 그대로이므로 기체의 압력은 일정해요.',
          },
          {
            type: 'quiz',
            title: '관찰 결과 정리',
            goal: '압력이 일정할 때, 기체의 온도가 <b>높아지면</b> 부피는 어떻게 될까요?',
            choices: ['커진다', '작아진다', '변하지 않는다', '커졌다가 바로 작아진다'],
            answer: 0,
            feedback: ['', '가열했을 때 피스톤이 올라갔나요, 내려갔나요?', '피스톤이 움직였었죠?', '가열하는 동안 피스톤은 계속 올라간 채로 있었어요.'],
            explain: '기체의 온도가 높아지면 부피가 커지고, 온도가 낮아지면 부피가 작아져요. 다음 단계에서 여러 온도에서 측정해 관계를 확인해 봐요.',
          },
        ],
      },
      {
        title: '측정하고 기록하기', short: '실험', icon: '📋', phase: '실험',
        features: ['record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체를 가열하면 부피가 커지는 것을 관찰했어요.</div>' +
          '<p>이번에는 온도를 여러 번 바꾸며 부피를 <b>측정</b>하고, <b>표</b>와 <b>그래프</b>로 정리해 두 변인 사이의 관계를 찾아봐요.</p>',
        setup() { setScene('cyl', true); setT(T0, true); },
        recap: '압력이 일정할 때 기체의 <b>온도가 높아지면 부피가 일정하게 증가</b>해요. 그래프는 오른쪽 위로 올라가는 직선이에요.',
        summary: '<p>압력이 일정할 때 기체의 <b>온도가 높아지면 부피가 일정하게 증가</b>한다.</p>' +
          '<p>' + mini('up') + '<span>온도–부피 그래프: 오른쪽 위로 올라가는 <b>직선</b></span></span></p>',
        missions: [
          {
            title: '측정값 기록하기',
            goal: '온도를 바꿔 가며 <b>📍 기록하기</b>를 눌러, 서로 다른 온도에서 측정값을 <b>4개</b> 이상 기록하세요.',
            hint: '−50, 0, 50, 100, 150 °C처럼 고르게 바꾸고, 온도계 눈금이 멈추면 기록하세요.',
            check: () => distinctT() >= 4,
            status: () => '기록한 측정값: <b>' + Math.min(4, distinctT()) + ' / 4</b>' + (settled() ? '' : ' · 🌡 온도 변하는 중…'),
            hold: 0,
            explain: '측정 결과가 표와 그래프에 모였어요. 이제 결과에서 두 변인 사이의 규칙을 찾아봐요.',
          },
          {
            type: 'quiz',
            title: '표에서 규칙 찾기',
            setup: needData,
            goal: '📋 실험 결과 표를 보세요. 기체의 <b>온도가 높아질 때</b> 부피는 어떻게 변하나요?',
            choices: ['부피가 감소한다', '부피가 일정하게 증가한다', '부피가 변하지 않는다', '부피가 증가하다가 감소한다'],
            answer: 1,
            feedback: ['표에서 온도가 높아질수록 부피 값은 어떻게 되나요?', '', '부피 값이 모두 같았나요?', '표를 왼쪽(낮은 온도)부터 오른쪽(높은 온도)으로 읽어 보세요.'],
            explain: '온도가 높아질수록 부피가 <b>일정하게 증가</b>해요. 온도가 같은 간격으로 높아지면 부피도 거의 같은 양씩 늘어나요.',
          },
          {
            type: 'quiz',
            title: '그래프의 모양',
            setup: needData,
            goal: '📈 온도–부피 그래프는 어떤 모양인가요?',
            choices: [
              choiceG('up', '오른쪽 위로 올라가는 직선'),
              choiceG('downcurve', '오른쪽 아래로 내려가는 곡선'),
              choiceG('flat', '수평인 직선'),
              choiceG('down', '오른쪽 아래로 내려가는 직선'),
            ],
            answer: 0,
            feedback: ['', '온도가 높아질 때 부피가 작아졌나요? 그래프의 점을 다시 보세요.', '부피가 변하지 않았나요? 피스톤이 움직였어요.', '온도가 높은 쪽(오른쪽)의 점이 위에 있나요, 아래에 있나요?'],
            explain: '온도–부피 그래프는 <b>오른쪽 위로 올라가는 직선</b>이에요. 온도가 높아지면 기체의 부피가 <b>일정하게 증가</b>해요.',
          },
        ],
      },
      {
        title: '입자 모형으로 해석하기', short: '설명', icon: '🔬', phase: '설명',
        features: ['particles', 'hits'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 높아지면 부피가 일정하게 증가하는 것을 실험 결과로 확인했어요.</div>' +
          '<p>실린더 속을 <b>입자 모형</b>으로 들여다보며, 온도가 달라질 때 입자의 운동이 어떻게 달라지는지 살펴봐요.</p>',
        setup() { setScene('cyl', true); setT(T0, true); setParticles(true); showHint('💥 주황색 고리 = 입자가 피스톤에 부딪힌 곳', 6000); },
        recap: '온도가 높아지면 입자 운동이 <b>빨라져</b> 피스톤을 밀어 올리므로 부피가 커져요. 입자의 크기와 개수는 변하지 않아요.',
        summary: '<p>압력이 일정할 때 온도가 높아지면</p><ul>' +
          '<li>입자의 운동이 <b>빨라져</b> 피스톤(벽)에 더 세게, 더 자주 충돌한다.</li>' +
          '<li>피스톤이 밀려 올라가 <b>입자 사이의 거리가 멀어지고</b> 부피가 커진다.</li>' +
          '<li>입자의 <b>크기와 개수는 변하지 않는다</b>.</li></ul>',
        missions: [
          {
            title: '차갑게, 뜨겁게',
            goal: '온도를 <b>0 °C 이하</b>로 낮춰 입자의 움직임을 <b>2초</b> 동안 지켜본 다음, <b>100 °C 이상</b>으로 높여 다시 지켜보세요.',
            hint: '가열·냉각 장치 슬라이더를 왼쪽 끝으로 옮겨 2초쯤 지켜본 뒤, 오른쪽 끝으로 옮겨 보세요.',
            compare: true,
            setup() { S.cold = { t: 0, done: false }; S.hot = { t: 0, done: false }; },
            check: () => S.cold.done && S.hot.done,
            status: () => '차가울 때 <b>' + (S.cold.done ? '✔' : S.cold.t > 0 ? '관찰 중…' : '—') + '</b> · 뜨거울 때 <b>' + (S.hot.done ? '✔' : S.hot.t > 0 ? '관찰 중…' : '—') + '</b> · 입자 빠르기 <b>' + speedWord(S.Tg).replace(/<[^>]+>/g, '').replace(/▮/g, '').trim() + '</b>',
            hold: 0,
            explain: '온도가 높아지면 입자의 운동이 <b>빨라져</b> 피스톤에 <b>더 세게, 더 자주</b> 부딪혀요. 그래서 피스톤이 밀려 올라가 부피가 커져요. 온도가 낮아지면 입자 운동이 느려져 부피가 작아져요.',
          },
          {
            type: 'quiz',
            title: '가열해도 변하지 않는 것',
            goal: '기체를 가열하여 부피가 커졌을 때, <b>변하지 않는 것</b>은?',
            choices: ['입자의 운동 빠르기', '입자 사이의 거리', '입자의 크기와 개수', '기체의 부피'],
            answer: 2,
            feedback: ['온도가 높아지자 입자가 더 빨리 움직였어요.', '부피가 커지면서 입자 사이의 거리는 멀어졌어요.', '', '피스톤이 올라가 부피는 커졌어요.'],
            explain: '입자 하나하나의 <b>크기</b>와 입자의 <b>개수</b>는 변하지 않아요. 입자의 운동이 빨라지고 <b>입자 사이의 거리가 멀어져</b> 부피가 커져요.',
          },
          {
            type: 'quiz',
            title: '부피가 커진 까닭',
            goal: '압력이 일정할 때 기체를 가열하면 부피가 커지는 까닭으로 옳은 것은?',
            choices: ['입자 하나하나의 크기가 커지기 때문', '입자의 개수가 늘어나기 때문', '입자의 운동이 빨라져 피스톤을 더 세게 밀어 올리기 때문', '입자의 운동이 느려지기 때문'],
            answer: 2,
            feedback: ['화면 속 입자의 크기가 변했나요? 입자 크기는 그대로예요!', '실린더는 막혀 있어 입자 수는 그대로 30개예요.', '', '온도가 높아지면 입자가 어떻게 움직였나요?'],
            explain: '온도가 높아지면 입자의 운동이 활발해져 피스톤을 <b>더 세게 밀어 올려요</b>. 그래서 입자 사이의 거리가 멀어지며 부피가 커져요.',
          },
        ],
      },
      {
        title: '생활 속 온도와 부피', short: '적용', icon: '🏓', phase: '적용',
        features: ['pong'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 높아지면 입자 운동이 빨라져 부피가 커진다는 것을 알았어요.</div>' +
          '<p>이제 처음의 탐구 질문을 해결하고, 생활 속 현상을 입자의 운동으로 설명해 봐요.</p>',
        setup() { setScene('pong', true); showHint('✋ 탁구공을 끌어서 뜨거운 물에 넣어 보세요', 6000); },
        recap: '탁구공, 열기구, 냉장고 속 페트병처럼 생활 속에서도 <b>온도가 높아지면 기체의 부피가 커지고</b>, 낮아지면 작아져요.',
        summary: '<ul><li><b>찌그러진 탁구공</b>: 뜨거운 물에 넣으면 속의 기체 입자 운동이 빨라져 부피가 커지며 펴진다.</li>' +
          '<li><b>열기구</b>: 버너로 공기를 가열하면 기체의 부피가 커져 풍선이 부푼다.</li>' +
          '<li><b>여름철 타이어</b>: 기온이 높아 타이어 속 기체가 팽창하므로 공기를 조금 덜 넣는다.</li>' +
          '<li><b>냉장고 속 페트병</b>: 온도가 낮아져 기체의 부피가 줄어들어 찌그러진다.</li></ul>',
        missions: [
          {
            title: '찌그러진 탁구공 펴기',
            goal: '찌그러진 탁구공을 끌어서 <b>뜨거운 물</b>에 넣어 보세요. 탁구공 속 입자의 움직임도 살펴보세요.',
            hint: '탁구공을 손가락(마우스)으로 눌러 뜨거운 물이 든 비커 속으로 끌어다 놓아요.',
            check: () => S.scene === 'pong' && S.ball.popped,
            status: () => '탁구공 속 공기 <b>' + fmt(S.ball.T, 0) + ' °C</b> · ' + (S.ball.popped ? '<b>펴짐 ✔</b>' : '찌그러짐 <b>' + '▮'.repeat(Math.ceil(S.ball.dent / 5)) + '</b>'),
            hold: 0.3,
            explain: '뜨거운 물이 탁구공 속 공기를 데우면 기체 입자의 운동이 <b>빨라져</b> 탁구공 안쪽 벽을 더 세게 밀어요. 그래서 기체의 부피가 커지며 찌그러진 부분이 펴져요.',
          },
          {
            type: 'quiz',
            title: '하늘로 떠오르는 열기구',
            goal: '열기구 아래의 버너로 풍선 속 공기를 가열하면 풍선이 크게 부풀어요. 이때 풍선 속 기체 입자는?',
            figure: '<div style="font-size:44px">🎈🔥</div>',
            choices: ['입자의 크기가 커진다', '입자의 개수가 늘어난다', '입자의 운동이 빨라지고 입자 사이의 거리가 멀어진다', '입자의 운동이 느려진다'],
            answer: 2,
            feedback: ['입자의 크기는 변하지 않아요!', '가열한다고 입자가 새로 생기지는 않아요.', '', '가열하면 입자 운동은 어떻게 될까요?'],
            explain: '가열하면 입자의 운동이 빨라지고 <b>입자 사이의 거리가 멀어져</b> 기체의 부피가 커져요. 입자의 크기와 개수는 그대로예요.',
          },
          {
            type: 'quiz',
            title: '냉장고 속 페트병',
            goal: '빈 페트병의 뚜껑을 꼭 닫아 냉장고에 넣어 두었더니 페트병이 찌그러졌어요. 그 까닭은?',
            figure: '<div style="font-size:44px">🧴 → 🧊 → 🫙</div>',
            choices: ['온도가 낮아져 기체 입자의 운동이 느려지고 부피가 줄어들었기 때문', '페트병 속 기체 입자가 밖으로 빠져나갔기 때문', '페트병 속 기체 입자의 크기가 작아졌기 때문', '온도가 낮아져 기체 입자의 운동이 빨라졌기 때문'],
            answer: 0,
            feedback: ['', '뚜껑을 꼭 닫았으니 입자는 빠져나갈 수 없어요.', '입자의 크기는 변하지 않아요!', '온도가 낮아지면 입자 운동은 어떻게 될까요?'],
            explain: '온도가 낮아지면 입자의 운동이 <b>느려져</b> 기체의 부피가 줄어들어요. 반대로 여름철에는 기온이 높아 타이어 속 기체의 부피가 커지려 하므로 타이어에 공기를 조금 덜 넣어요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  if (!S.scene) setScene(LEVEL_SCENE[game.level] || 'cyl');
  if (!S.ballParts.length) resetBall();
  refreshUI();
  SciSim.loop((dt, t) => {
    step(dt);
    if (S.scene === 'pong') stepPong(dt);
    watchCompare(dt);
    view.clear('#ffffff');
    if (S.scene === 'pong') drawPongScene(); else drawCylScene();
    updateReadouts(t);
  });
})();
