/* =========================================================
   중1 Ⅲ. 열 — 온도와 열평형  [9과03-01]
   온도와 열평형 과정을 물질을 구성하는 입자들의 배치나 움직임 등으로 설명할 수 있다.
   ① [관찰] 온도와 입자: 20 °C 물과 80 °C 물을 입자 모형 돋보기로 비교 (온도 = 입자 운동의 활발한 정도)
   ② [실험] 열의 이동: 80 °C 물이 든 금속 컵을 20 °C 물 수조에 넣고, 온도 센서로 시간–온도 그래프 기록
   ③ [설명] 열평형: 경계면 확대 — 활발한 입자가 덜 활발한 입자와 충돌하며 운동을 전달, 두 온도가 같아지면 열평형
   ④ [적용] 생활 속 열평형: 체온계, 계곡물 속 수박, 냉장고 속 음식, 뜨거운 국 속 숟가락
   ※ 정성적 설명에 주안점: 열량 계산(Q = cmΔT)은 다루지 않음. 입자의 빠르기는 비교용(실제 값 아님).
   화면: 태블릿용 가로 캔버스(800×580)와 휴대폰용 세로 캔버스(520×900)를 같은 장면 코드로 그림
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const approach = SciSim.approach;
  const rgba = SciSim.color.rgba;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const font = (px, w) => (w || 700) + ' ' + px.toFixed(1) + 'px ' + FONT;
  const mono = (px, w) => (w || 800) + ' ' + px.toFixed(1) + 'px ' + MONO;
  const mark = (b) => (b ? '✅' : '⬜');

  /* ---------- 색 ---------- */
  const h2r = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const r2h = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  function ramp(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i], k = (x - a[0]) / (b[0] - a[0]);
        const A = h2r(a[1]), B = h2r(b[1]);
        return r2h([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
      }
    }
    return stops[stops.length - 1][1];
  }
  // 물의 색(온도에 따라 살짝): 차가우면 파랑, 뜨거우면 빨강
  const WATER = [[0, '#3b82f6'], [30, '#60a5fa'], [55, '#a78bfa'], [80, '#f87171'], [100, '#ef4444']];
  const WCACHE = new Map();
  const waterColor = (T) => {
    const k = Math.round(clamp(T, 0, 100) * 2);
    let c = WCACHE.get(k);
    if (!c) { c = ramp(WATER, k / 2); WCACHE.set(k, c); }
    return c;
  };
  // 입자의 색(온도): 5 °C 단위로 미리 만든 공 그림을 씀
  const PART = [[0, '#2563eb'], [30, '#3f7df0'], [55, '#9b5de5'], [80, '#e2463e'], [100, '#d42a2a']];
  const PARTC = [];
  for (let i = 0; i <= 20; i++) PARTC.push(ramp(PART, i * 5));
  const partColor = (T) => PARTC[clamp(Math.round(T / 5), 0, 20)];
  const HOT = '#e2463e', COLD = '#2f6fe4', HEAT = '#ff7a2f';

  /* ---------- 입자 그림(광택 있는 공)을 미리 그려 두고 재사용 ---------- */
  const SPR = new Map();
  function ball(ctx, x, y, r, color) {
    const rq = Math.max(1, Math.round(r * 2) / 2), key = color + rq;
    let c = SPR.get(key);
    if (!c) {
      const k = 3, pad = 2, s = Math.ceil((rq + pad) * 2 * k);
      c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.scale(k, k);
      SciSim.draw(g).sphere(rq + pad, rq + pad, rq, color);
      SPR.set(key, c);
    }
    const h = rq + 2;
    ctx.drawImage(c, x - h, y - h, h * 2, h * 2);
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }

  /* ---------- 화면 배치: wide = 태블릿(800×580), tall = 휴대폰(520×900) ---------- */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 580, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 900, fs: 1.25 },
  };
  const GEO = {
    wide: {
      beakers: {
        bench: { x: 0, y: 512, w: 800, h: 68 },
        A: { x: 100, y: 300, w: 190, h: 212 }, B: { x: 510, y: 300, w: 190, h: 212 },
        magA: { x: 195, y: 156, r: 108 }, magB: { x: 605, y: 156, r: 108 },
        lensA: { x: 166, y: 440, r: 24 }, lensB: { x: 576, y: 440, r: 24 },
        thA: { x: 262, y: 286, h: 172 }, thB: { x: 672, y: 286, h: 172 },
        tagY: 549,
        bars: { x: 330, y: 56, w: 140, h: 316, horiz: false },
      },
      contact: {
        bench: { x: 0, y: 524, w: 398, h: 56 },
        tank: { x: 34, y: 262, w: 332, h: 262 }, waterTop: 312,
        cup: { x: 148, y: 298, w: 104, h: 220 }, lift: 256, cupWater: 44,
        dispC: { x: 10, y: 10, w: 132, h: 82 }, dispT: { x: 258, y: 10, w: 132, h: 82 },
        probeT: { x: 330, top: 200, bot: 488 },
        lensY: 440, cone: 'left',
        right: { x: 406, y: 10, w: 384, h: 560 }, split: 236,
      },
      life: { tiles: [{ x: 12, y: 12, w: 382, h: 274 }, { x: 406, y: 12, w: 382, h: 274 }, { x: 12, y: 296, w: 382, h: 274 }, { x: 406, y: 296, w: 382, h: 274 }] },
    },
    tall: {
      beakers: {
        bench: { x: 0, y: 592, w: 520, h: 40 },
        A: { x: 40, y: 382, w: 190, h: 210 }, B: { x: 290, y: 382, w: 190, h: 210 },
        magA: { x: 135, y: 192, r: 110 }, magB: { x: 385, y: 192, r: 110 },
        lensA: { x: 108, y: 520, r: 22 }, lensB: { x: 358, y: 520, r: 22 },
        thA: { x: 204, y: 366, h: 176 }, thB: { x: 454, y: 366, h: 176 },
        tagY: 612,
        bars: { x: 16, y: 650, w: 488, h: 236, horiz: true },
      },
      contact: {
        bench: { x: 0, y: 474, w: 520, h: 28 },
        tank: { x: 56, y: 236, w: 408, h: 238 }, waterTop: 284,
        cup: { x: 206, y: 268, w: 108, h: 200 }, lift: 234, cupWater: 42,
        dispC: { x: 8, y: 8, w: 188, h: 92 }, dispT: { x: 324, y: 8, w: 188, h: 92 },
        probeT: { x: 420, top: 176, bot: 448 },
        lensY: 404, cone: 'top',
        right: { x: 10, y: 512, w: 500, h: 380 }, split: 200,
      },
      life: { tiles: [0, 1, 2, 3].map((i) => ({ x: 10, y: 10 + i * 222, w: 500, h: 212 })) },
    },
  };
  const LEVEL = 0.72;                                 // 비커 속 물 높이(비율)
  const SCENE_LABEL = {
    beakers: '🔬 20 °C 물과 80 °C 물 · 입자 모형 돋보기',
    contact: '🥤 금속 컵(80 °C 물) + 수조(20 °C 물)',
    life: '🏠 생활 속 열평형',
  };

  /* ---------- 1단계: 돋보기 속 물 입자 ----------
     돋보기 반지름을 1로 둔 좌표에서 움직임. 온도가 높을수록 평균 빠르기가 큼(비교용 값). */
  const PR = 0.085, NSW = 15;
  const speedOf = (T) => 0.22 + 0.0225 * clamp(T, 0, 100);
  const VMAX = speedOf(100) * 1.1;
  function makeSwarm(n, T) {
    const L = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let tries = 0; tries < 80; tries++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (1 - PR * 1.4);
        x = Math.cos(a) * d; y = Math.sin(a) * d;
        if (!L.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (2.3 * PR) ** 2)) break;
      }
      const a = Math.random() * TAU, sp = speedOf(T) * (0.7 + Math.random() * 0.6);
      L.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
    return L;
  }
  // 같은 질량의 두 입자의 탄성 충돌 (부딪히면 true)
  function collide(a, b, r) {
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * r;
    if (d2 >= min * min || d2 < 1e-12) return false;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (min - d) / 2;
    a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (rel <= 0) return false;
    a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
    return true;
  }
  // 평균 빠르기를 목표값으로 부드럽게 맞춤 (온도 = 입자 운동의 활발한 정도)
  function thermostat(L, vT, dt) {
    let s = 0;
    for (const p of L) s += Math.hypot(p.vx, p.vy);
    const mean = s / L.length || 1e-6;
    const k = 1 + (vT / mean - 1) * Math.min(1, dt * 4);
    for (const p of L) { p.vx *= k; p.vy *= k; }
    return mean;
  }
  function stepSwarm(L, T, dt) {
    const lim = 1 - PR;
    for (const p of L) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const d = Math.hypot(p.x, p.y);
      if (d > lim) {
        const nx = p.x / d, ny = p.y / d;
        p.x = nx * lim; p.y = ny * lim;
        const vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
      }
    }
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) collide(L[i], L[j], PR);
    return thermostat(L, speedOf(T), dt);
  }
  const SW_A = makeSwarm(NSW, 20), SW_B = makeSwarm(NSW, 80);

  /* ---------- 2·3단계: 금속 컵(80 °C 물) + 수조(20 °C 물) ----------
     두 물의 온도는 같은 열평형 온도로 지수적으로 다가감 (열량 계산은 하지 않음) */
  const T_C0 = 80, T_T0 = 20, T_EQ = 35, TAU_M = 1.15, T_END = 10, TSPEED = 0.75; // 분, 분/초
  const EQ_TOL = 0.06;                                // 두 온도계가 같은 값(소수 첫째 자리)을 가리키는 정도
  const EXP = {
    k: 0, tw: null, drag: false, dk0: 0, dy0: 0, lift: 0, inserting: false,
    cupIn: false, run: false, done: false, t: 0, rec: [], nextRec: 0.05,
    Tc: T_C0, Tt: T_T0, splashed: false, eqT: -1, eqPop: { s: 0 },
    ripples: [], bob: new SciSim.Spring(0, { stiffness: 140, damping: 9 }),
  };
  const tempsAt = (t) => { const e = Math.exp(-t / TAU_M); return [T_EQ + (T_C0 - T_EQ) * e, T_EQ + (T_T0 - T_EQ) * e]; };

  /* 경계면 확대: 상자 높이 = 1, 가운데 x = 0이 경계면. 왼쪽 = 컵 속 물, 오른쪽 = 수조 물 */
  const ZR = 0.05;
  const zSpeed = (T) => 0.16 + 0.0115 * clamp(T, 0, 100);
  const Z = { A: 1.2, L: [], R: [], hits: [], ready: false, mL: zSpeed(T_C0), mR: zSpeed(T_T0) };
  function zoomInit(A) {
    Z.A = A; Z.L = []; Z.R = []; Z.hits = [];
    const n = Math.round(A * 24);
    const place = (arr, x0, x1, T) => {
      const cols = Math.max(2, Math.round(Math.sqrt(n * (x1 - x0)))), rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const x = x0 + ((c + 0.5) / cols) * (x1 - x0) + (Math.random() - 0.5) * 0.03;
        const y = -0.5 + ZR + ((r + 0.5) / rows) * (1 - 2 * ZR) + (Math.random() - 0.5) * 0.03;
        const a = Math.random() * TAU, sp = zSpeed(T) * (0.7 + Math.random() * 0.6);
        arr.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
    };
    place(Z.L, -A + ZR, -ZR, EXP.Tc);
    place(Z.R, ZR, A - ZR, EXP.Tt);
    Z.ready = true;
  }
  function stepZoom(dt) {
    const A = Z.A, lo = -0.5 + ZR, hi = 0.5 - ZR;
    const move = (arr, x0, x1) => {
      for (const p of arr) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < x0) { p.x = x0; p.vx = Math.abs(p.vx); }
        if (p.x > x1) { p.x = x1; p.vx = -Math.abs(p.vx); }
        if (p.y < lo) { p.y = lo; p.vy = Math.abs(p.vy); }
        if (p.y > hi) { p.y = hi; p.vy = -Math.abs(p.vy); }
      }
    };
    // 컵이 수조에 들어가기 전에는 두 물이 맞닿지 않음 → 경계에 틈
    const gap = EXP.cupIn ? 0 : ZR * 1.6;
    move(Z.L, -A + ZR, -gap); move(Z.R, gap, A - ZR);
    const L = Z.L, R = Z.R;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) collide(L[i], L[j], ZR);
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) collide(R[i], R[j], ZR);
    if (EXP.cupIn) {
      for (const a of L) {
        if (a.x < -2.2 * ZR) continue;
        for (const b of R) {
          if (b.x > 2.2 * ZR) continue;
          const ea = a.vx * a.vx + a.vy * a.vy, eb = b.vx * b.vx + b.vy * b.vy;
          if (collide(a, b, ZR) && Z.hits.length < 12) Z.hits.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, age: 0, hot: ea > eb });
        }
      }
    }
    Z.mL = thermostat(L, zSpeed(EXP.Tc), dt);
    Z.mR = thermostat(R, zSpeed(EXP.Tt), dt);
    for (let i = Z.hits.length - 1; i >= 0; i--) { Z.hits[i].age += dt; if (Z.hits[i].age > 0.45) Z.hits.splice(i, 1); }
  }

  /* ---------- 4단계: 생활 속 열평형 ---------- */
  const LIFE = [
    { title: '🌡️ 체온 재기', hot: '몸', cold: '체온계', h0: 36.5, c0: 25, eq: 36.5, flow: '몸 → 체온계' },
    { title: '🍉 계곡물 속 수박', hot: '수박', cold: '계곡물', h0: 30, c0: 15, eq: 15, flow: '수박 → 계곡물' },
    { title: '🧊 냉장고 속 음식', hot: '음식', cold: '냉장고 공기', h0: 60, c0: 4, eq: 4, flow: '음식 → 차가운 공기' },
    { title: '🥄 뜨거운 국 속 숟가락', hot: '국', cold: '숟가락', h0: 70, c0: 20, eq: 66, flow: '국 → 숟가락' },
  ];
  const LS = LIFE.map(() => ({ p: 0, play: false, seen: false, press: new SciSim.Spring(0, { stiffness: 260, damping: 14 }) }));
  const KQ = 4.6, EQK = Math.exp(-KQ);
  const lifeT = (it, p, hot) => { const f = (Math.exp(-KQ * p) - EQK) / (1 - EQK); return it.eq + ((hot ? it.h0 : it.c0) - it.eq) * f; };
  const PLAY_S = 3.4;

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'beakers', fade: { k: 1 },
    TA: 20, TB: 80, TBset: 80, vA: speedOf(20), vB: speedOf(80), steam: 0,
    target: null, stage1: 0,
    zoomOn: true, zoomK: 0,
  };
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 캔버스 두 개 ---------- */
  const VIEWS = ['wide', 'tall'].map((key) => {
    const L = LAYOUTS[key];
    const v = SciSim.stage($(key === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#f4f8fd' });
    return { key, L, v, ctx: v.ctx, D: SciSim.draw(v.ctx), G: GEO[key], fx: new SciSim.Particles(), steam: new SciSim.Particles(), hint: $(key === 'wide' ? '#hintWide' : '#hintTall'), gmap: null, bg: null };
  });
  const activeView = () => VIEWS.find((V) => V.v.canvas.offsetWidth > 0) || VIEWS[0];

  /* =========================================================
     업데이트
     ========================================================= */
  function update(dt, t) {
    const V = activeView();
    if (S.scene === 'beakers') updateBeakers(dt, V);
    updateExp(dt, V);
    if (S.scene === 'contact' && S.zoomK > 0.01) stepZoomSafe(dt);
    S.zoomK = approach(S.zoomK, S.scene === 'contact' && on('zoom') && S.zoomOn ? 1 : 0, dt, 7);
    if (S.zoomK < 0.002) S.zoomK = 0;
    updateLife(dt, V);
    watchSuccess(dt);
    VIEWS.forEach((W) => { W.fx.update(dt); W.steam.update(dt); });
  }
  function stepZoomSafe(dt) {
    if (!Z.ready) return;
    const n = dt > 0.02 ? 2 : 1;
    for (let i = 0; i < n; i++) stepZoom(dt / n);
  }

  function updateBeakers(dt, V) {
    S.TB = approach(S.TB, S.TBset, dt, 2.4);
    if (Math.abs(S.TB - S.TBset) < 0.05) S.TB = S.TBset;
    const n = dt > 0.02 ? 2 : 1;
    let mA = S.vA, mB = S.vB;
    for (let i = 0; i < n; i++) { mA = stepSwarm(SW_A, S.TA, dt / n); mB = stepSwarm(SW_B, S.TB, dt / n); }
    S.vA = approach(S.vA, mA, dt, 3);
    S.vB = approach(S.vB, mB, dt, 3);
    // 뜨거운 물에서 피어오르는 김
    const B = V.G.beakers.B;
    S.steam += RM ? 0 : dt * clamp((S.TB - 45) / 55, 0, 1) * 15;
    while (S.steam >= 1) {
      S.steam -= 1;
      V.steam.emit({ x: B.x + 24 + Math.random() * (B.w - 48), y: B.y + B.h * (1 - LEVEL) - 2, vx: (Math.random() - 0.5) * 12, vy: -20 - Math.random() * 18,
        life: 1.6 + Math.random() * 0.9, size: 5 + Math.random() * 4, grow: 10, color: 'rgba(150,166,190,.40)', shape: 'smoke', drag: 0.4 });
    }
  }

  function updateExp(dt, V) {
    const G = V.G.contact;
    if (EXP.run) {
      EXP.t = Math.min(T_END, EXP.t + dt * TSPEED);
      [EXP.Tc, EXP.Tt] = tempsAt(EXP.t);
      while (EXP.nextRec <= EXP.t + 1e-9) {
        const tt = EXP.nextRec, T2 = tempsAt(tt);
        EXP.rec.push([tt, T2[0], T2[1]]);
        EXP.nextRec = Math.round((EXP.nextRec + 0.05) * 1000) / 1000;
      }
      if (EXP.eqT < 0 && EXP.Tc - EXP.Tt < EQ_TOL) onEquilibrium(V);
      if (EXP.t >= T_END) { EXP.run = false; EXP.done = true; }
    }
    EXP.lift = approach(EXP.lift, EXP.drag ? 1 : 0, dt, 14);
    EXP.bob.update(dt);
    // 컵 바닥이 수면에 닿으면 물이 튐
    const bottom = G.cup.y + G.cup.h - (1 - EXP.k) * G.lift;
    if (!EXP.splashed && bottom > G.waterTop + 3 && S.scene === 'contact') { EXP.splashed = true; splash(V); }
    if (EXP.k < 0.05 && !EXP.cupIn) EXP.splashed = false;
    for (let i = EXP.ripples.length - 1; i >= 0; i--) { EXP.ripples[i].age += dt; if (EXP.ripples[i].age > 1.2) EXP.ripples.splice(i, 1); }
  }
  function splash(V) {
    const G = V.G.contact, c = G.cup;
    EXP.ripples.push({ age: 0 }, { age: -0.25 });
    if (RM) return;
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      const x = c.x + c.w / 2 + side * (c.w / 2 + 4 + Math.random() * 16);
      V.fx.emit({ x, y: G.waterTop, vx: side * (30 + Math.random() * 60), vy: -90 - Math.random() * 90, gravity: 520, life: 0.6 + Math.random() * 0.3, size: 2.2 + Math.random() * 2, color: '#6fb1f2', drag: 0.4 });
    }
    Sound.tone(420, 0.12, 'sine', 0.06);
  }
  function onEquilibrium(V) {
    EXP.eqT = EXP.t;
    EXP.eqPop.s = 0;
    SciSim.tween(EXP.eqPop, { s: 1 }, { duration: 0.6, ease: 'outBack' });
    Sound.tone(880, 0.14, 'triangle', 0.08); Sound.tone(1175, 0.18, 'triangle', 0.07, 0.1);
    if (V.gmap && S.scene === 'contact') {
      V.fx.burst(V.gmap.px(EXP.t), V.gmap.py(EXP.Tc), { count: 22, colors: ['#ffb400', '#a78bfa', '#14a058', '#f26b3a'], speed: 150 });
    }
  }

  function updateLife(dt, V) {
    LS.forEach((s, i) => {
      s.press.update(dt);
      if (!s.play) return;
      s.p = Math.min(1, s.p + dt / PLAY_S);
      if (s.p >= 1) {
        s.play = false;
        const first = !s.seen;
        s.seen = true;
        Sound.tone(988, 0.12, 'triangle', 0.07);
        if (first && S.scene === 'life') {
          const R = V.G.life.tiles[i];
          V.fx.burst(R.x + R.w - 40, R.y + 26, { count: 16, speed: 120, colors: ['#14a058', '#ffb400', '#f26b3a'] });
        }
      }
    });
  }
  function playTile(i) {
    const s = LS[i];
    s.press.target = 0; s.press.value = -0.05; s.press.velocity = RM ? 0 : 1.6;
    if (s.play) return;
    s.p = 0; s.play = true;
    Sound.click();
    hideHint();
  }

  /* =========================================================
     그리기
     ========================================================= */
  /* ---------- 미션 성공 표시: 화면 오른쪽 위에 체크가 톡 튀어나오며 반짝임이 터짐 ---------- */
  const SUCC = { s: 0, a: 0, t: 0 };
  let lastPhase = '';
  function watchSuccess(dt) {
    const ph = game ? game.phase : '';
    if (ph === 'success' && lastPhase !== 'success') {
      SUCC.s = 0; SUCC.a = 1; SUCC.t = 0;
      SciSim.tween(SUCC, { s: 1 }, { duration: 0.55, ease: 'outBack' });
      const V = activeView();
      if (!RM) V.fx.burst(V.L.vw - 42, 42, { count: 20, speed: 170, life: 0.9, colors: ['#14a058', '#ffb400', '#3867f4', '#f26b3a'] });
    }
    lastPhase = ph;
    if (SUCC.a > 0) { SUCC.t += dt; if (SUCC.t > 1.3) SUCC.a = Math.max(0, SUCC.a - dt * 2.2); }
  }
  function drawSuccess(V) {
    if (SUCC.a <= 0.01) return;
    const { ctx, D } = V;
    ctx.save(); ctx.globalAlpha = SUCC.a;
    D.check(V.L.vw - 42, 42, 24 * clamp(SUCC.s, 0, 1.15), clamp(SUCC.s, 0, 1));
    ctx.restore();
  }

  function drawView(V, t) {
    const { ctx } = V;
    V.v.clear();
    if (!V.bg) {
      V.bg = ctx.createLinearGradient(0, 0, 0, V.L.vh);
      V.bg.addColorStop(0, '#f9fbff'); V.bg.addColorStop(1, '#e8eff8');
    }
    ctx.fillStyle = V.bg; ctx.fillRect(0, 0, V.L.vw, V.L.vh);
    const k = clamp(S.fade.k, 0, 1);
    ctx.save();
    if (k < 1) { ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 18); }
    if (S.scene === 'beakers') drawBeakers(V, t);
    else if (S.scene === 'contact') drawContact(V, t);
    else drawLife(V, t);
    ctx.restore();
    drawSuccess(V);
    V.fx.draw(ctx);
  }

  function drawBench(ctx, R) {
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    g.addColorStop(0, '#e4eaf2'); g.addColorStop(0.2, '#cfd8e4'); g.addColorStop(0.215, '#a9b6c7'); g.addColorStop(1, '#8f9db1');
    ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(R.x, R.y, R.w, 1.5);
  }
  function groundShadow(ctx, x, y, rx, ry, a) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(25,40,70,' + a + ')'); g.addColorStop(1, 'rgba(25,40,70,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, rx); ctx.fill();
    ctx.restore();
  }
  function newRing(V, R, t) {
    const { ctx, D } = V;
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = rgba('#f26b3a', 0.35 + a * 0.5); ctx.lineWidth = 4;
    D.roundRect(R.x - 5, R.y - 5, R.w + 10, R.h + 10, 18); ctx.stroke();
    D.label(R.x + R.w - 22, R.y - 3, 'NEW', { bg: '#f26b3a', size: 13 });
    ctx.restore();
  }

  /* ---------- 1단계 장면: 두 비커 + 돋보기 ---------- */
  function drawBeakers(V, t) {
    const { ctx, D } = V, G = V.G.beakers, fs = V.L.fs;
    drawBench(ctx, G.bench);
    drawBeaker(V, G.A, G.thA, S.TA, t);
    drawBeaker(V, G.B, G.thB, S.TB, t + 1.7);
    V.steam.draw(ctx);
    // 오른쪽 비커: 온도를 바꾸는 중이면 표시
    const dT = S.TBset - S.TB;
    if (Math.abs(dT) > 1.2) {
      const B = G.B;
      D.label(B.x + B.w / 2, B.y - 16, dT > 0 ? '🔥 데우는 중' : '❄️ 식히는 중', { bg: dT > 0 ? '#c2410c' : '#1d4ed8', size: 13 * fs });
    }
    if (on('mag')) {
      drawMag(V, G.magA, G.lensA, SW_A, S.TA, '🔍 왼쪽 물 속', t);
      drawMag(V, G.magB, G.lensB, SW_B, S.TB, '🔍 오른쪽 물 속', t);
    }
    drawBars(V, G.bars, t);
    // 이름표
    [[G.A, S.TA], [G.B, S.TB]].forEach(([B, T]) => {
      D.label(B.x + B.w / 2, G.tagY, '💧 물 ' + Math.round(T) + ' °C', { bg: SciSim.color.shade(partColor(T), -0.12), size: 15 * fs });
    });
  }
  function drawBeaker(V, B, th, T, t) {
    const { ctx, D } = V;
    groundShadow(ctx, B.x + B.w / 2, B.y + B.h + 2, B.w * 0.62, 9, 0.22);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    D.roundRect(B.x, B.y, B.w, B.h, 10); ctx.fill();
    D.thermometer(th.x, th.y, th.h, T, 0, 100, { ticks: false, color: '#e2464b' });
    D.beaker(B.x, B.y, B.w, B.h, { level: LEVEL, liquid: waterColor(T), t, wave: RM ? 0.6 : 0.8 + T / 55, ticks: 6 });
  }
  function tangents(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(b.r - a.r) + 1) return null;
    const th = Math.atan2(dy, dx), ph = Math.acos((a.r - b.r) / d);
    const P = (c, ang) => ({ x: c.x + Math.cos(ang) * c.r, y: c.y + Math.sin(ang) * c.r });
    return [[P(a, th + ph), P(b, th + ph)], [P(a, th - ph), P(b, th - ph)]];
  }
  function drawMag(V, M, lens, swarm, T, title, t) {
    const { ctx, D } = V, fs = V.L.fs;
    // 비커와 돋보기를 잇는 빛 원뿔
    const big = { x: M.x, y: M.y, r: M.r + 8 };
    const tg = tangents(lens, big);
    if (tg) {
      ctx.fillStyle = 'rgba(120,150,200,.12)';
      ctx.beginPath(); ctx.moveTo(tg[0][0].x, tg[0][0].y); ctx.lineTo(tg[0][1].x, tg[0][1].y); ctx.lineTo(tg[1][1].x, tg[1][1].y); ctx.lineTo(tg[1][0].x, tg[1][0].y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(90,110,140,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(tg[0][0].x, tg[0][0].y); ctx.lineTo(tg[0][1].x, tg[0][1].y); ctx.moveTo(tg[1][0].x, tg[1][0].y); ctx.lineTo(tg[1][1].x, tg[1][1].y); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 비커 위의 작은 렌즈
    ctx.fillStyle = 'rgba(255,255,255,.25)'; circle(ctx, lens.x, lens.y, lens.r); ctx.fill();
    ctx.strokeStyle = '#5b6b82'; ctx.lineWidth = 2.5; ctx.stroke();
    // 큰 돋보기
    D.shadow(() => { ctx.fillStyle = '#fff'; circle(ctx, M.x, M.y, M.r + 8); ctx.fill(); }, { blur: 18, y: 6, color: 'rgba(20,40,80,.28)' });
    const rg = ctx.createLinearGradient(M.x - M.r, M.y - M.r, M.x + M.r, M.y + M.r);
    rg.addColorStop(0, '#f6f8fb'); rg.addColorStop(0.5, '#aeb9c8'); rg.addColorStop(1, '#6f7d92');
    ctx.fillStyle = rg; circle(ctx, M.x, M.y, M.r + 8); ctx.fill();
    ctx.save();
    circle(ctx, M.x, M.y, M.r); ctx.clip();
    const bg = ctx.createRadialGradient(M.x - M.r * 0.3, M.y - M.r * 0.4, M.r * 0.1, M.x, M.y, M.r * 1.05);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, rgba(waterColor(T), 0.32));
    ctx.fillStyle = bg; ctx.fillRect(M.x - M.r, M.y - M.r, M.r * 2, M.r * 2);
    const col = partColor(T), r = PR * M.r;
    // 움직임 꼬리(빠를수록 길게)
    ctx.strokeStyle = rgba(col, 0.28); ctx.lineWidth = r * 1.1; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const p of swarm) {
      const x = M.x + p.x * M.r, y = M.y + p.y * M.r;
      ctx.moveTo(x, y); ctx.lineTo(x - p.vx * M.r * 0.075, y - p.vy * M.r * 0.075);
    }
    ctx.stroke();
    for (const p of swarm) ball(ctx, M.x + p.x * M.r, M.y + p.y * M.r, r, col);
    // 유리 반사
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath(); ctx.ellipse(M.x - M.r * 0.42, M.y - M.r * 0.5, M.r * 0.42, M.r * 0.16, -0.65, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,50,70,.35)'; ctx.lineWidth = 1.5; circle(ctx, M.x, M.y, M.r); ctx.stroke();
    D.label(M.x, M.y - M.r - 22, title, { bg: '#2b3445', size: 13.5 * fs });
  }
  function drawBars(V, R, t) {
    const { ctx, D } = V, fs = V.L.fs;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.95)'; D.roundRect(R.x, R.y, R.w, R.h, 16); ctx.fill(); }, { blur: 12, y: 3, color: 'rgba(20,40,80,.14)' });
    const items = [[S.vA, S.TA, '왼쪽'], [S.vB, S.TB, '오른쪽']];
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const tgt = S.target;
    // 목표 칸: 막대 위에 초록 테두리로 겹쳐 그림 (막대가 목표에 들어오면 같이 보임)
    const targetBox = (x, y, w, h, hit) => {
      const a = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = rgba('#14a058', 0.14 + a * 0.12 + (hit ? 0.12 : 0)); D.roundRect(x, y, w, h, 7); ctx.fill();
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = hit ? 3.2 : 2.4; ctx.setLineDash(hit ? [] : [6, 4]); D.roundRect(x, y, w, h, 7); ctx.stroke(); ctx.setLineDash([]);
    };
    if (!R.horiz) {
      const cx = R.x + R.w / 2;
      ctx.fillStyle = '#2b3445'; ctx.font = font(14, 800);
      ctx.fillText('입자 운동의', cx, R.y + 25); ctx.fillText('빠르기', cx, R.y + 44);
      const top = R.y + 78, bot = R.y + R.h - 56, bw = 34, H = bot - top;
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13, 700);
      ctx.fillText('빠름 ▲', cx, top - 10);
      items.forEach(([v, T, lab], i) => {
        const x = R.x + R.w * (i ? 0.71 : 0.29);
        ctx.fillStyle = '#edf1f6'; D.roundRect(x - bw / 2, top, bw, H, 10); ctx.fill();
        const h = H * clamp(v / VMAX, 0, 1), col = partColor(T);
        const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
        g.addColorStop(0, SciSim.color.shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, SciSim.color.shade(col, -0.2));
        ctx.fillStyle = g; D.roundRect(x - bw / 2, bot - h, bw, h, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; D.roundRect(x - bw / 2 + 5, bot - h + 4, 5, Math.max(0, h - 8), 3); ctx.fill();
        if (i === 1 && tgt) {
          const y1 = bot - H * clamp(speedOf(tgt.hi) / VMAX, 0, 1), y0 = bot - H * clamp(speedOf(tgt.lo) / VMAX, 0, 1);
          const hh = Math.max(16, y0 - y1), yy = (y0 + y1) / 2 - hh / 2;
          targetBox(x - bw / 2 - 7, yy, bw + 14, hh, v >= speedOf(tgt.lo) && v <= speedOf(tgt.hi));
          ctx.fillStyle = '#0b7a41'; ctx.font = font(15, 800); ctx.fillText('🎯', x + bw / 2 + 17, yy + hh / 2 + 5);
        }
        ctx.fillStyle = '#3a4456'; ctx.font = font(13.5, 800);
        ctx.fillText(lab, x, bot + 21);
      });
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13, 700);
      ctx.fillText('느림 ▼', cx, bot + 44);
    } else {
      const x0 = R.x + 110 * fs * 0.8, x1 = R.x + R.w - 24, bh = 30, W = x1 - x0;
      ctx.fillStyle = '#2b3445'; ctx.font = font(15 * fs, 800); ctx.textAlign = 'left';
      ctx.fillText('입자 운동의 빠르기', R.x + 16, R.y + 30 * fs);
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'right';
      ctx.fillText('느림 ◀  ▶ 빠름', x1, R.y + 30 * fs);
      items.forEach(([v, T, lab], i) => {
        const y = R.y + 66 * fs + i * 74 * fs;
        ctx.fillStyle = '#edf1f6'; D.roundRect(x0, y, W, bh, 10); ctx.fill();
        const w = W * clamp(v / VMAX, 0, 1), col = partColor(T);
        const g = ctx.createLinearGradient(0, y, 0, y + bh);
        g.addColorStop(0, SciSim.color.shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, SciSim.color.shade(col, -0.2));
        ctx.fillStyle = g; D.roundRect(x0, y, Math.max(bh, w), bh, 10); ctx.fill();
        if (i === 1 && tgt) {
          const xa = x0 + W * clamp(speedOf(tgt.lo) / VMAX, 0, 1), xb = x0 + W * clamp(speedOf(tgt.hi) / VMAX, 0, 1);
          const ww = Math.max(18, xb - xa), xx = (xa + xb) / 2 - ww / 2;
          targetBox(xx, y - 7, ww, bh + 14, v >= speedOf(tgt.lo) && v <= speedOf(tgt.hi));
        }
        ctx.fillStyle = '#3a4456'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'left';
        ctx.fillText(lab, R.x + 16, y + bh / 2 + 6);
      });
    }
    ctx.textAlign = 'left';
  }

  /* ---------- 2·3단계 장면: 금속 컵 + 수조 + 그래프 (+ 경계면 확대) ---------- */
  function cupRect(G) {
    const off = (1 - EXP.k) * G.lift - EXP.bob.value;
    return { x: G.cup.x, y: G.cup.y - off, w: G.cup.w, h: G.cup.h };
  }
  function rightPanels(G) {
    const R = G.right, k = S.zoomK, sp = G.split * k;
    return {
      zoom: k > 0.01 ? { x: R.x, y: R.y, w: R.w, h: Math.max(10, G.split - 10) } : null,
      graph: { x: R.x, y: R.y + sp, w: R.w, h: R.h - sp },
    };
  }
  function drawContact(V, t) {
    const { ctx, D } = V, G = V.G.contact, fs = V.L.fs;
    const P = rightPanels(G);
    drawBench(ctx, G.bench);
    const cup = cupRect(G);
    const subm = clamp((cup.y + cup.h - G.waterTop) / (G.cup.y + G.cup.h - G.waterTop), 0, 1);
    const wTop = G.waterTop - 6 * subm;
    const T = G.tank;
    groundShadow(ctx, T.x + T.w / 2, T.y + T.h + 2, T.w * 0.6, 9, 0.22);
    // 수조 뒷면 유리
    ctx.fillStyle = 'rgba(214,230,246,.5)'; D.roundRect(T.x, T.y, T.w, T.h, 8); ctx.fill();
    // 수조 물
    const wc = waterColor(EXP.Tt);
    const wg = ctx.createLinearGradient(0, wTop, 0, T.y + T.h);
    wg.addColorStop(0, rgba(wc, 0.42)); wg.addColorStop(1, rgba(wc, 0.72));
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(T.x + 3, T.y + T.h - 3);
    for (let i = 0; i <= 24; i++) {
      const x = T.x + 3 + (T.w - 6) * i / 24;
      ctx.lineTo(x, wTop + (RM ? 0 : Math.sin(t * 2.2 + i * 0.8) * 1.3));
    }
    ctx.lineTo(T.x + T.w - 3, T.y + T.h - 3); ctx.closePath(); ctx.fill();
    // 물결 고리
    EXP.ripples.forEach((r) => {
      if (r.age < 0) return;
      const a = 1 - r.age / 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.75 * a).toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cup.x + cup.w / 2, wTop + 1, cup.w / 2 + 8 + r.age * 90, 4 + r.age * 4, 0, 0, TAU); ctx.stroke();
    });
    // 넣을 자리 안내
    if (!EXP.cupIn && on('cup') && !EXP.inserting) {
      const a = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = rgba('#14a058', 0.5 + a * 0.4); ctx.lineWidth = 2.5;
      D.roundRect(G.cup.x - 6, G.cup.y - 6, G.cup.w + 12, G.cup.h + 12, 12); ctx.stroke(); ctx.restore();
      if (!EXP.drag) D.arrow(G.cup.x + G.cup.w / 2, G.cup.y + 40 + a * 10, G.cup.x + G.cup.w / 2, G.cup.y + 92 + a * 10, { color: '#14a058', width: 6, head: 18 });
    }
    // 금속 컵 (단면)
    drawCup(V, G, cup, t);
    // 컵 앞쪽 물(컵이 물에 잠긴 듯 보이게)
    if (subm > 0) {
      ctx.fillStyle = rgba(wc, 0.2);
      ctx.fillRect(cup.x - 2, wTop + 2, cup.w + 4, Math.min(cup.y + cup.h, T.y + T.h - 3) - wTop - 2);
    }
    // 수조 유리 테두리 + 반사
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(T.x, T.y + T.h - 8); ctx.quadraticCurveTo(T.x, T.y + T.h, T.x + 8, T.y + T.h);
    ctx.lineTo(T.x + T.w - 8, T.y + T.h); ctx.quadraticCurveTo(T.x + T.w, T.y + T.h, T.x + T.w, T.y + T.h - 8); ctx.lineTo(T.x + T.w, T.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(T.x + 9, T.y + 14); ctx.lineTo(T.x + 9, T.y + T.h - 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(T.x + 17, T.y + 14); ctx.lineTo(T.x + 17, T.y + T.h * 0.55); ctx.stroke();
    // 열의 이동 화살표 (컵 벽 → 수조 물)
    if (EXP.cupIn) drawHeatFlow(V, cup, wTop, t);
    D.label(T.x + 16, T.y + T.h - 18, '수조 물', { bg: 'rgba(29,78,216,.9)', size: 13 * fs, align: 'left' });
    // 경계면 확대 원뿔
    if (P.zoom && EXP.cupIn) drawCone(V, G, cup, P.zoom);
    // 온도 센서
    if (on('sensor')) drawSensors(V, G, cup, wTop, t);
    // 오른쪽: 경계면 확대 + 그래프
    if (P.zoom) drawZoom(V, P.zoom, t, S.zoomK);
    if (on('graph')) {
      drawGraph(V, P.graph, t);
      if (isNew('graph')) newRing(V, P.graph, t);
    }
    if (P.zoom && isNew('zoom')) newRing(V, P.zoom, t);
  }
  function metalGrad(ctx, x0, x1) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#9aa6b6'); g.addColorStop(0.35, '#eef2f7'); g.addColorStop(0.7, '#c3ccd8'); g.addColorStop(1, '#7f8ba0');
    return g;
  }
  function drawCup(V, G, c, t) {
    const { ctx, D } = V, fs = V.L.fs, wall = 7;
    const lift = EXP.lift;
    if (lift > 0.02) groundShadow(ctx, c.x + c.w / 2, c.y + c.h + 14 + lift * 10, c.w * (0.55 + lift * 0.15), 7, 0.18 * lift);
    ctx.save();
    if (lift > 0.01) {
      const s = 1 + lift * 0.03;
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(s, s); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2));
      ctx.shadowColor = 'rgba(20,40,80,' + (0.3 * lift).toFixed(3) + ')'; ctx.shadowBlur = 18 * lift; ctx.shadowOffsetY = 10 * lift;
    }
    // 컵 속 물
    const wc = waterColor(EXP.Tc), ly = c.y + G.cupWater;
    const g = ctx.createLinearGradient(0, ly, 0, c.y + c.h);
    g.addColorStop(0, rgba(wc, 0.62)); g.addColorStop(1, rgba(wc, 0.9));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(c.x + wall, c.y + c.h - wall);
    for (let i = 0; i <= 10; i++) ctx.lineTo(c.x + wall + (c.w - 2 * wall) * i / 10, ly + (RM ? 0 : Math.sin(t * 3 + i) * 1.1));
    ctx.lineTo(c.x + c.w - wall, c.y + c.h - wall); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    // 금속 벽(단면)
    ctx.fillStyle = metalGrad(ctx, c.x, c.x + wall); D.roundRect(c.x, c.y, wall, c.h, 3); ctx.fill();
    ctx.fillStyle = metalGrad(ctx, c.x + c.w - wall, c.x + c.w); D.roundRect(c.x + c.w - wall, c.y, wall, c.h, 3); ctx.fill();
    const bg = ctx.createLinearGradient(0, c.y + c.h - wall, 0, c.y + c.h);
    bg.addColorStop(0, '#d5dce6'); bg.addColorStop(1, '#8794a8');
    ctx.fillStyle = bg; D.roundRect(c.x, c.y + c.h - wall, c.w, wall, 3); ctx.fill();
    ctx.fillStyle = '#e9eef4'; D.roundRect(c.x - 3, c.y - 3, wall + 6, 6, 3); ctx.fill(); D.roundRect(c.x + c.w - wall - 3, c.y - 3, wall + 6, 6, 3); ctx.fill();
    ctx.restore();
    if (!EXP.cupIn) {
      D.label(c.x + c.w / 2, c.y + G.cupWater + 40, '80 °C 물', { bg: 'rgba(194,65,12,.92)', size: 13 * fs });
      D.label(c.x + c.w / 2, c.y + c.h - 30, '금속 컵', { bg: 'rgba(58,68,86,.88)', size: 13 * fs });
    }
  }
  function drawHeatFlow(V, c, wTop, t) {
    const { ctx } = V;
    const dT = EXP.Tc - EXP.Tt;
    if (dT < 0.4) return;
    const a = clamp(dT / 35, 0.2, 0.95), len = 30;
    const ys = [0.35, 0.58, 0.8].map((f) => Math.max(wTop + 18, c.y + c.h * f));
    ctx.save(); ctx.lineCap = 'round';
    [-1, 1].forEach((side) => {
      const x0 = side < 0 ? c.x - 3 : c.x + c.w + 3;
      ys.forEach((y, i) => {
        const ph = RM ? 0.5 : ((t * 0.9 + i * 0.33 + (side > 0 ? 0.15 : 0)) % 1);
        const x1 = x0 + side * len;
        ctx.strokeStyle = rgba(HEAT, a * 0.55); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.fillStyle = rgba(HEAT, a);
        ctx.beginPath(); ctx.moveTo(x1 + side * 9, y); ctx.lineTo(x1, y - 6); ctx.lineTo(x1, y + 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba('#ffd27a', a);
        circle(ctx, x0 + side * len * ph, y, 3.2); ctx.fill();
      });
    });
    ctx.restore();
  }
  function drawCone(V, G, c, Zr) {
    const { ctx } = V;
    const lx = c.x + c.w, ly = G.lensY, r = 22;
    let p1, p2;
    if (G.cone === 'left') { p1 = { x: Zr.x, y: Zr.y + 4 }; p2 = { x: Zr.x, y: Zr.y + Zr.h - 4 }; }
    else { p1 = { x: Zr.x + 4, y: Zr.y }; p2 = { x: Zr.x + Zr.w - 4, y: Zr.y }; }
    ctx.save();
    ctx.globalAlpha *= S.zoomK;
    ctx.fillStyle = 'rgba(120,150,200,.10)';
    ctx.beginPath(); ctx.moveTo(lx, ly - r); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(lx, ly + r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,140,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(lx, ly - r); ctx.lineTo(p1.x, p1.y); ctx.moveTo(lx, ly + r); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; circle(ctx, lx, ly, r); ctx.fill();
    ctx.strokeStyle = '#5b6b82'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  function drawProbe(V, x, top, bot, color) {
    const { ctx, D } = V;
    ctx.fillStyle = metalGrad(ctx, x - 3, x + 3); ctx.fillRect(x - 2.5, top + 26, 5, bot - top - 26);
    ctx.fillStyle = '#2b3445'; D.roundRect(x - 7, top, 14, 30, 5); ctx.fill();
    ctx.fillStyle = color; D.roundRect(x - 7, top + 4, 14, 5, 2); ctx.fill();
    ctx.fillStyle = '#5b6576'; circle(ctx, x, bot, 3.6); ctx.fill();
  }
  function cable(ctx, x1, y1, x2, y2, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + 40, x2, y2 - 50, x2, y2); ctx.stroke();
  }
  function drawSensors(V, G, c, wTop, t) {
    const { ctx } = V;
    const pc = { x: c.x + 26, top: c.y - 30, bot: c.y + c.h - 40 };
    const pt = G.probeT;
    cable(ctx, G.dispC.x + G.dispC.w / 2, G.dispC.y + G.dispC.h - 2, pc.x, pc.top + 2, '#3a4456');
    cable(ctx, G.dispT.x + G.dispT.w / 2, G.dispT.y + G.dispT.h - 2, pt.x, pt.top + 2, '#3a4456');
    drawProbe(V, pc.x, pc.top, pc.bot, HOT);
    drawProbe(V, pt.x, pt.top, pt.bot, COLD);
    drawDisplay(V, G.dispC, '🔴 컵 속 물', EXP.Tc, '#ff8a7a');
    drawDisplay(V, G.dispT, '🔵 수조 물', EXP.Tt, '#8ec5ff');
  }
  function drawDisplay(V, R, label, T, col) {
    const { ctx, D } = V, fs = V.L.fs;
    D.shadow(() => { ctx.fillStyle = '#2b3445'; D.roundRect(R.x, R.y, R.w, R.h, 12); ctx.fill(); }, { blur: 10, y: 3 });
    ctx.fillStyle = '#d6deeb'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, R.x + 10, R.y + 19 * fs);
    const lx = R.x + 8, ly = R.y + 27 * fs, lw = R.w - 16, lh = R.h - 27 * fs - 8;
    ctx.fillStyle = '#101a2b'; D.roundRect(lx, ly, lw, lh, 7); ctx.fill();
    ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = mono(Math.min(27, lh * 0.72) * (fs > 1 ? 1.05 : 1), 800);
    ctx.fillText(T.toFixed(1), lx + lw - 34 * fs, ly + lh / 2 + 1);
    ctx.font = font(14 * fs, 800); ctx.fillText('°C', lx + lw - 8, ly + lh / 2 + 1);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  }

  function drawZoom(V, R, t, alpha) {
    const { ctx, D } = V, fs = V.L.fs;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(0, (1 - alpha) * -14);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.fill(); }, { blur: 14, y: 4, color: 'rgba(20,40,80,.14)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.2; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.stroke();
    ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText('🔍 경계면 확대 (입자 모형)', R.x + 12, R.y + 21 * fs);
    const bx = R.x + 12, by = R.y + 30 * fs, bw = R.w - 24, bh = R.h - 30 * fs - 40 * fs;
    const A = bw / bh / 2;
    if (!Z.ready || Math.abs(A - Z.A) > 0.04) zoomInit(A);
    const U = bh, cx = bx + bw / 2, cy = by + bh / 2;
    ctx.save();
    D.roundRect(bx, by, bw, bh, 10); ctx.clip();
    ctx.fillStyle = rgba(waterColor(EXP.Tc), 0.18); ctx.fillRect(bx, by, bw / 2, bh);
    ctx.fillStyle = rgba(waterColor(EXP.Tt), 0.18); ctx.fillRect(cx, by, bw / 2, bh);
    if (!EXP.cupIn) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - ZR * 1.6 * U, by, ZR * 3.2 * U, bh); }
    const r = ZR * U;
    const drawSide = (arr, T) => {
      const col = partColor(T);
      ctx.strokeStyle = rgba(col, 0.25); ctx.lineWidth = r * 1.1; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const p of arr) { const x = cx + p.x * U, y = cy + p.y * U; ctx.moveTo(x, y); ctx.lineTo(x - p.vx * U * 0.09, y - p.vy * U * 0.09); }
      ctx.stroke();
      for (const p of arr) ball(ctx, cx + p.x * U, cy + p.y * U, r, col);
    };
    drawSide(Z.L, EXP.Tc); drawSide(Z.R, EXP.Tt);
    // 경계면에서의 충돌 (운동이 전달되는 순간)
    for (const h of Z.hits) {
      const k = h.age / 0.45, x = cx + h.x * U, y = cy + h.y * U;
      ctx.strokeStyle = rgba('#ffb400', 0.9 * (1 - k)); ctx.lineWidth = 2.5;
      circle(ctx, x, y, r * (0.6 + k * 1.6)); ctx.stroke();
      D.spark(x, y, r * 0.9 * (1 - k * 0.5), t, '#fff2b3');
    }
    // 경계면 선
    D.dashedLine(cx, by, cx, by + bh, { color: 'rgba(40,50,70,.45)', dash: [5, 5], width: 2 });
    // 열의 이동 화살표 (온도 차가 클수록 굵게)
    const dT = EXP.Tc - EXP.Tt;
    if (EXP.cupIn && dT > EQ_TOL) {
      const w = 4 + 10 * clamp(dT / 60, 0, 1), aw = Math.min(70, bw * 0.16);
      D.arrow(cx - aw, by + bh - 16 * fs, cx + aw, by + bh - 16 * fs, { color: HEAT, width: w, head: w * 2.2 + 6, alpha: 0.82 });
      D.label(cx, by + bh - 36 * fs - w / 2, '열', { bg: 'rgba(194,65,12,.9)', size: 13 * fs });
    }
    ctx.restore();
    D.label(bx + 8, by + 14 * fs, '컵 속 물', { bg: 'rgba(194,65,12,.88)', size: 13 * fs, align: 'left' });
    D.label(bx + bw - 8, by + 14 * fs, '수조 물', { bg: 'rgba(29,78,216,.88)', size: 13 * fs, align: 'right' });
    if (!EXP.cupIn) D.label(cx, cy, '컵을 넣으면 맞닿아요', { bg: 'rgba(43,52,69,.86)', size: 13 * fs });
    else if (dT <= EQ_TOL) {
      const s = 0.6 + 0.4 * clamp(EXP.eqPop.s, 0, 1.2);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      D.label(0, 0, '⚖️ 열평형: 입자 운동의 활발한 정도가 같아요', { bg: 'rgba(20,160,88,.92)', size: 13 * fs });
      ctx.restore();
    }
    // 아래: 두 쪽 입자의 평균 빠르기 막대
    const yb = by + bh + 12 * fs, bwid = (bw - 16) / 2 - 56 * fs;
    [[Z.mL, EXP.Tc, bx, '빠르기'], [Z.mR, EXP.Tt, bx + bw / 2 + 8, '빠르기']].forEach(([m, T, x0, lab]) => {
      ctx.fillStyle = '#5d6879'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(lab, x0, yb + 9 * fs);
      const x1 = x0 + 50 * fs, W = bwid;
      ctx.fillStyle = '#edf1f6'; D.roundRect(x1, yb + 2 * fs, W, 14 * fs, 7 * fs); ctx.fill();
      ctx.fillStyle = partColor(T); D.roundRect(x1, yb + 2 * fs, Math.max(14 * fs, W * clamp(m / zSpeed(100), 0, 1)), 14 * fs, 7 * fs); ctx.fill();
    });
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function drawGraph(V, R, t) {
    const { ctx, D } = V, fs = V.L.fs;
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.fill(); }, { blur: 14, y: 4, color: 'rgba(20,40,80,.14)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.2; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.stroke();
    const x0 = R.x + 46 * fs, x1 = R.x + R.w - 16, y1 = R.y + 54 * fs, y0 = R.y + R.h - 38 * fs;
    const XM = T_END, YMIN = 0, YMAX = 100;
    const px = (v) => x0 + (v / XM) * (x1 - x0);
    const py = (v) => y0 - ((v - YMIN) / (YMAX - YMIN)) * (y0 - y1);
    V.gmap = { px, py };
    ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText('📈 시간–온도 그래프', R.x + 12, R.y + 21 * fs);
    // 범례
    ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
    const lgY = R.y + 21 * fs;
    ctx.fillStyle = COLD; ctx.fillText('● 수조 물', R.x + R.w - 12, lgY);
    const w2 = ctx.measureText('● 수조 물').width;
    ctx.fillStyle = HOT; ctx.fillText('● 컵 속 물', R.x + R.w - 22 - w2, lgY);
    // 처음 두 온도 사이 구간
    if (on('eq')) {
      ctx.fillStyle = 'rgba(255,180,0,.10)'; ctx.fillRect(x0, py(T_C0), x1 - x0, py(T_T0) - py(T_C0));
      ctx.fillStyle = '#9a6b00'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
      ctx.fillText('처음 두 온도 사이', x1 - 4, py(T_C0) + 14 * fs);
    }
    // 눈금
    const ySmall = R.h < 260;
    ctx.font = font(13 * fs, 600); ctx.lineWidth = 1;
    for (let v = 0; v <= XM; v += 2) {
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      ctx.fillStyle = '#5d6879'; ctx.textAlign = 'center'; ctx.fillText(String(v), px(v), y0 + 16 * fs);
    }
    for (let v = YMIN; v <= YMAX; v += ySmall ? 20 : 10) {
      ctx.strokeStyle = v % 20 === 0 ? '#e7ecf3' : '#f2f5f9'; ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      if (v % 20 === 0) { ctx.fillStyle = '#5d6879'; ctx.textAlign = 'right'; ctx.fillText(String(v), x0 - 6, py(v) + 4); }
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 6); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    ctx.fillStyle = '#5d6879'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
    ctx.fillText('시간 (분)', x1, y0 + 31 * fs);
    ctx.textAlign = 'left'; ctx.fillText('온도 (°C)', R.x + 12, y1 - 12 * fs);
    // 열평형 온도 선
    if (on('eq') && EXP.eqT >= 0) {
      D.dashedLine(x0, py(T_EQ), x1, py(T_EQ), { color: '#14a058', width: 2, dash: [7, 5] });
      const s = clamp(EXP.eqPop.s, 0, 1.3);
      ctx.save(); ctx.translate(px(Math.min(XM - 2.2, EXP.eqT + 1.4)), py(T_EQ) - 16 * fs); ctx.scale(s, s);
      D.label(0, 0, '열평형 온도 ' + T_EQ + ' °C', { bg: '#14a058', size: 13 * fs });
      ctx.restore();
    }
    // 측정 곡선
    const rec = EXP.rec;
    if (rec.length) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y1 - 10, x1 - x0 + 10, y0 - y1 + 20); ctx.clip();
      [[1, HOT], [2, COLD]].forEach(([k, col]) => {
        ctx.strokeStyle = rgba(col, 0.22); ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const path = () => {
          ctx.beginPath();
          for (let i = 0; i < rec.length; i++) { const x = px(rec[i][0]), y = py(rec[i][k]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          if (EXP.run) ctx.lineTo(px(EXP.t), py(k === 1 ? EXP.Tc : EXP.Tt));
        };
        path(); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 3.4; path(); ctx.stroke();
      });
      ctx.restore();
      // 현재 점
      const tt = EXP.cupIn ? EXP.t : 0;
      [[EXP.Tc, HOT], [EXP.Tt, COLD]].forEach(([T, col]) => {
        const x = px(tt), y = py(T);
        if (EXP.run) { const pr = 7 + Math.sin(t * 7) * 2; ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 2; circle(ctx, x, y, pr); ctx.stroke(); }
        ball(ctx, x, y, 5.5, col);
      });
    } else {
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'center';
      ctx.fillText('컵을 수조에 넣으면 기록이 시작돼요', (x0 + x1) / 2, (y0 + y1) / 2);
    }
    if (EXP.eqT >= 0 && on('eq')) {
      const s = clamp(EXP.eqPop.s, 0, 1);
      if (s > 0.05) D.check(px(EXP.eqT), py(T_EQ), 11 * s, s);
    }
    ctx.textAlign = 'left';
  }

  /* ---------- 4단계 장면: 생활 속 열평형 카드 4장 ---------- */
  function drawLife(V, t) {
    const { ctx, D } = V, fs = V.L.fs;
    V.G.life.tiles.forEach((R, i) => {
      const s = LS[i], it = LIFE[i];
      const sc = 1 + s.press.value;
      ctx.save();
      ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(sc, sc); ctx.translate(-(R.x + R.w / 2), -(R.y + R.h / 2));
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(R.x, R.y, R.w, R.h, 16); ctx.fill(); }, { blur: s.play ? 22 : 12, y: s.play ? 6 : 3, color: s.play ? 'rgba(242,107,58,.28)' : 'rgba(20,40,80,.14)' });
      ctx.strokeStyle = s.play ? '#fdba74' : s.seen ? '#9ddcb8' : '#dde4ef'; ctx.lineWidth = s.play || s.seen ? 2.5 : 1.2;
      D.roundRect(R.x, R.y, R.w, R.h, 16); ctx.stroke();
      ctx.fillStyle = '#2b3445'; ctx.font = font(15.5 * fs * (fs > 1 ? 0.92 : 1), 800); ctx.textAlign = 'left';
      ctx.fillText(it.title, R.x + 14, R.y + 25 * fs);
      // 그림 + 정보 영역
      const split = R.w * (fs > 1 ? 0.56 : 0.6);
      const ill = { x: R.x + 8, y: R.y + 34 * fs, w: split - 8, h: R.h - 34 * fs - 8 };
      const inf = { x: R.x + split + 6, y: R.y + 34 * fs, w: R.w - split - 18, h: R.h - 34 * fs - 12 };
      const p = s.p, Th = lifeT(it, p, true), Tc = lifeT(it, p, false);
      const scale = Math.min(ill.w / 220, ill.h / 200);
      ctx.save();
      ctx.translate(ill.x + (ill.w - 220 * scale) / 2, ill.y + (ill.h - 200 * scale) / 2); ctx.scale(scale, scale);
      ILL[i](ctx, D, s, t, Th, Tc);
      ctx.restore();
      drawLifeInfo(V, inf, it, s, Th, Tc, t);
      // 안내/완료 표시
      if (!s.play && !s.seen) D.label(ill.x + ill.w / 2, ill.y + ill.h - 14 * fs, '▶ 눌러서 보기', { bg: 'rgba(242,107,58,.95)', size: 13 * fs });
      if (s.play) D.label(ill.x + ill.w / 2, ill.y + ill.h - 14 * fs, '🔥 열: ' + it.flow, { bg: 'rgba(194,65,12,.92)', size: 13 * fs });
      if (s.seen && !s.play) D.check(R.x + R.w - 22, R.y + 22, 12, 1);
      ctx.restore();
    });
  }
  function drawLifeInfo(V, R, it, s, Th, Tc, t) {
    const { ctx, D } = V, fs = V.L.fs;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const row = (y, name, T, col) => {
      ctx.fillStyle = col; circle(ctx, R.x + 6, y - 5 * fs, 5 * fs); ctx.fill();
      ctx.fillStyle = '#3a4456'; ctx.font = font(13 * fs, 700); ctx.fillText(name, R.x + 16 * fs, y);
      ctx.fillStyle = col; ctx.font = mono(15 * fs, 800); ctx.textAlign = 'right'; ctx.fillText(T.toFixed(1) + '°', R.x + R.w, y); ctx.textAlign = 'left';
    };
    row(R.y + 14 * fs, it.hot, Th, HOT);
    row(R.y + 36 * fs, it.cold, Tc, COLD);
    // 작은 시간–온도 그래프
    const gx = R.x + 2, gy = R.y + 48 * fs, gw = R.w - 2, gh = R.h - 48 * fs - 26 * fs;
    ctx.fillStyle = '#f6f8fc'; D.roundRect(gx, gy, gw, gh, 8); ctx.fill();
    ctx.strokeStyle = '#a3afc0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx + 8, gy + 6); ctx.lineTo(gx + 8, gy + gh - 8); ctx.lineTo(gx + gw - 6, gy + gh - 8); ctx.stroke();
    const lo = Math.min(it.c0, it.eq) - 4, hi = Math.max(it.h0, it.eq) + 4;
    const X = (p) => gx + 10 + p * (gw - 20), Y = (T) => gy + gh - 10 - ((T - lo) / (hi - lo)) * (gh - 18);
    const pEnd = s.seen && !s.play ? 1 : s.p;
    [[true, HOT], [false, COLD]].forEach(([hot, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const p = (k / 30) * pEnd, x = X(p), y = Y(lifeT(it, p, hot));
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'right';
    ctx.fillText('시간 →', gx + gw - 6, gy + gh - 12);
    ctx.textAlign = 'left';
    // 상태
    const done = s.seen && !s.play;
    D.label(R.x + R.w / 2, R.y + R.h - 9 * fs, done ? '⚖️ 열평형' : s.play ? '온도가 변하는 중…' : '온도 변화 보기', { bg: done ? '#14a058' : s.play ? '#f59e0b' : '#94a3b8', size: 13 * fs });
  }

  // 흐르는 점으로 열의 이동 표시 (그림 좌표 220×200)
  function flowArrow(ctx, x1, y1, x2, y2, t, a) {
    if (a <= 0.02) return;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(HEAT, 0.45 * a); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * 8, y2 - uy * 8); ctx.stroke();
    ctx.fillStyle = rgba(HEAT, 0.95 * a);
    ctx.beginPath(); ctx.moveTo(x2 + ux * 4, y2 + uy * 4); ctx.lineTo(x2 - ux * 9 - uy * 7, y2 - uy * 9 + ux * 7); ctx.lineTo(x2 - ux * 9 + uy * 7, y2 - uy * 9 - ux * 7); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ph = RM ? 0.5 : (t * 1.1 + i * 0.5) % 1;
      ctx.fillStyle = rgba('#ffd27a', a * Math.sin(ph * Math.PI));
      circle(ctx, x1 + dx * ph * 0.85, y1 + dy * ph * 0.85, 3.4); ctx.fill();
    }
    ctx.restore();
  }
  function wisps(ctx, x, y, n, spread, t, a) {
    if (a <= 0.02) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const ph = RM ? 0.4 : ((t * 0.45 + i / n) % 1);
      const bx = x + (i - (n - 1) / 2) * spread;
      ctx.strokeStyle = 'rgba(150,166,190,' + (a * 0.55 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const yy = y - ph * 26 - k * 4, xx = bx + Math.sin(k * 0.9 + t * 2 + i) * 4;
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  const ILL = [
    // 체온 재기: 입에 문 디지털 체온계
    function (ctx, D, s, t, Th, Tc) {
      const hx = 84, hy = 98, hr = 60, a = s.play ? 1 - s.p * 0.85 : 0;
      ctx.fillStyle = '#7fb3f5'; D.roundRect(hx - 66, 160, 132, 60, 30); ctx.fill();
      const sk = ctx.createRadialGradient(hx - 20, hy - 24, 6, hx, hy, hr);
      sk.addColorStop(0, '#ffe8d3'); sk.addColorStop(1, '#f1b48d');
      ctx.fillStyle = sk; circle(ctx, hx, hy, hr); ctx.fill();
      ctx.fillStyle = '#4a3428';
      ctx.beginPath(); ctx.arc(hx, hy, hr + 1, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(hx + 30, hy - 30, hx - 6, hy - 34); ctx.quadraticCurveTo(hx - 40, hy - 28, hx - hr, hy - 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b2a20';
      ellipse(ctx, hx - 20, hy + 4, 4.5, 6.5); ctx.fill(); ellipse(ctx, hx + 16, hy + 4, 4.5, 6.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,.35)'; circle(ctx, hx - 34, hy + 24, 9); ctx.fill(); circle(ctx, hx + 30, hy + 24, 9); ctx.fill();
      // 체온계
      const mx = hx + 12, my = hy + 34;
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; SciSim.draw(ctx).glow(mx, my, 26, '#ff8a3d', 0.5); ctx.restore(); }
      ctx.save(); ctx.translate(mx, my); ctx.rotate(0.38);
      ctx.fillStyle = '#c3ccd8'; D.roundRect(-4, -4, 22, 8, 4); ctx.fill();
      D.shadow(() => { ctx.fillStyle = '#ffffff'; D.roundRect(14, -10, 104, 20, 10); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = '#b9c3d3'; ctx.lineWidth = 1.5; D.roundRect(14, -10, 104, 20, 10); ctx.stroke();
      ctx.fillStyle = '#cdeedd'; D.roundRect(52, -7, 50, 14, 3); ctx.fill();
      ctx.fillStyle = '#1d3b2c'; ctx.font = mono(11.5, 800); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(Tc.toFixed(1), 99, 0.5);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
      ctx.fillStyle = '#9b3b3b'; ellipse(ctx, mx, my, 7, 5); ctx.fill();
      flowArrow(ctx, hx - 16, hy + 46, mx - 2, my + 4, t, a);
      flowArrow(ctx, hx + 40, hy + 6, mx + 6, my - 4, t, a);
    },
    // 계곡물 속 수박
    function (ctx, D, s, t, Th, Tc) {
      const a = s.play ? 1 - s.p * 0.85 : 0, wy = 112;
      const wg = ctx.createLinearGradient(0, wy, 0, 200);
      wg.addColorStop(0, '#8fd0f5'); wg.addColorStop(1, '#2f86d1');
      ctx.fillStyle = '#d9e7f3'; ctx.fillRect(0, 0, 220, wy);
      ctx.fillStyle = '#7d8a99'; ellipse(ctx, 30, 196, 34, 12); ctx.fill(); ellipse(ctx, 190, 194, 30, 11); ctx.fill();
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(0, 200);
      for (let i = 0; i <= 22; i++) ctx.lineTo(i * 10, wy + (RM ? 0 : Math.sin(t * 2.6 + i * 0.7) * 2));
      ctx.lineTo(220, 200); ctx.closePath(); ctx.fill();
      // 수박
      const mx = 110, my = 104;
      if (Th > 16 && s.play) { ctx.save(); ctx.globalAlpha = a; SciSim.draw(ctx).glow(mx, my, 80, '#ff8a3d', 0.35); ctx.restore(); }
      const mg = ctx.createRadialGradient(mx - 22, my - 22, 6, mx, my, 70);
      mg.addColorStop(0, '#5fbf4a'); mg.addColorStop(1, '#1f6b26');
      ctx.fillStyle = mg; ellipse(ctx, mx, my, 64, 48); ctx.fill();
      ctx.save(); ellipse(ctx, mx, my, 64, 48); ctx.clip();
      ctx.strokeStyle = '#174f1c'; ctx.lineWidth = 6;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        for (let j = 0; j <= 10; j++) { const y = my - 50 + j * 10, x = mx + k * 20 + Math.sin(j * 1.3) * 4 + (y - my) * k * 0.05; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.beginPath(); ctx.ellipse(mx - 26, my - 24, 18, 8, -0.5, 0, TAU); ctx.fill();
      // 앞쪽 물(잠긴 부분)
      ctx.fillStyle = 'rgba(80,160,225,.42)';
      ctx.beginPath(); ctx.moveTo(0, 200);
      for (let i = 0; i <= 22; i++) ctx.lineTo(i * 10, wy + 2 + (RM ? 0 : Math.sin(t * 2.6 + i * 0.7) * 2));
      ctx.lineTo(220, 200); ctx.closePath(); ctx.fill();
      // 흐르는 물결
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const x = ((t * 30 + k * 60) % 260) - 30, y = 150 + k * 11; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 24, y); ctx.stroke(); }
      flowArrow(ctx, 72, 128, 40, 164, t, a); flowArrow(ctx, 110, 146, 110, 186, t, a); flowArrow(ctx, 148, 128, 180, 164, t, a);
    },
    // 냉장고 속 음식
    function (ctx, D, s, t, Th, Tc) {
      const a = s.play ? 1 - s.p * 0.85 : 0;
      D.shadow(() => { ctx.fillStyle = '#eef3f8'; D.roundRect(14, 4, 192, 194, 14); ctx.fill(); }, { blur: 6, y: 2 });
      const ig = ctx.createLinearGradient(0, 14, 0, 190);
      ig.addColorStop(0, '#f4fbff'); ig.addColorStop(1, '#d4ebfa');
      ctx.fillStyle = ig; D.roundRect(24, 14, 172, 176, 8); ctx.fill();
      SciSim.draw(ctx).glow(110, 18, 40, '#ffffff', 0.9);
      ctx.fillStyle = 'rgba(160,190,215,.7)'; ctx.fillRect(24, 76, 172, 4); ctx.fillRect(24, 150, 172, 4);
      // 위 칸: 우유팩, 병
      ctx.fillStyle = '#ffffff'; D.roundRect(46, 36, 26, 40, 3); ctx.fill(); ctx.fillStyle = '#5aa0e6'; ctx.fillRect(46, 50, 26, 10);
      ctx.fillStyle = '#7cc47f'; D.roundRect(150, 34, 16, 42, 6); ctx.fill();
      // 차가운 공기 알갱이
      for (let k = 0; k < 9; k++) {
        const x = 34 + ((k * 47 + t * 8) % 150), y = 92 + ((k * 23) % 50) + Math.sin(t + k) * 3;
        ctx.fillStyle = 'rgba(120,180,240,.55)'; circle(ctx, x, y, 2.6); ctx.fill();
      }
      // 음식(그릇)
      const bx = 110, by = 140;
      const bw = ctx.createLinearGradient(0, by - 20, 0, by + 10);
      bw.addColorStop(0, '#ffffff'); bw.addColorStop(1, '#c9d3df');
      ctx.fillStyle = bw; ctx.beginPath(); ctx.ellipse(bx, by - 14, 40, 9, 0, 0, Math.PI); ctx.lineTo(bx - 40, by - 14); ctx.ellipse(bx, by - 14, 40, 26, 0, Math.PI, 0, true); ctx.fill();
      const heat = clamp((Th - 4) / 56, 0, 1);
      const fg = ctx.createRadialGradient(bx - 8, by - 18, 2, bx, by - 14, 40);
      fg.addColorStop(0, '#ffb26b'); fg.addColorStop(1, '#d9662b');
      ctx.fillStyle = fg; ellipse(ctx, bx, by - 14, 36, 7.5); ctx.fill();
      wisps(ctx, bx, by - 22, 3, 14, t, heat * (s.play || !s.seen ? 1 : 0));
      flowArrow(ctx, bx - 24, by - 26, bx - 58, by - 52, t, a); flowArrow(ctx, bx + 24, by - 26, bx + 58, by - 52, t, a);
    },
    // 뜨거운 국 속 숟가락
    function (ctx, D, s, t, Th, Tc) {
      const a = s.play ? 1 - s.p * 0.85 : 0, bx = 104, by = 132;
      const heat = clamp((Tc - 20) / 46, 0, 1);
      const hx0 = bx - 36, hy0 = by + 3, ex = 204, ey = 22;            // 숟가락 머리 중심 · 손잡이 끝
      const ang = Math.atan2(ey - hy0, ex - hx0), ux = Math.cos(ang), uy = Math.sin(ang);
      const metal = (h) => ramp([[0, '#c9d1dc'], [1, '#ff9a55']], h);
      // 그릇
      const bg = ctx.createLinearGradient(0, by, 0, by + 64);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c4cedb');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(bx - 92, by); ctx.bezierCurveTo(bx - 88, by + 70, bx + 88, by + 70, bx + 92, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4f7fbf'; ctx.fillRect(bx - 70, by + 30, 140, 5);
      // 국
      const sp = ctx.createRadialGradient(bx - 20, by - 4, 4, bx, by, 92);
      sp.addColorStop(0, '#ffb070'); sp.addColorStop(1, '#c4502a');
      ctx.fillStyle = sp; ellipse(ctx, bx, by, 88, 15); ctx.fill();
      ctx.fillStyle = '#5bb25a'; ctx.fillRect(bx - 4, by - 6, 8, 3); ctx.fillRect(bx + 22, by + 3, 9, 3); ctx.fillRect(bx + 50, by - 6, 7, 3);
      // 숟가락 머리(국에 반쯤 잠김)
      ctx.save(); ctx.translate(hx0, hy0); ctx.rotate(ang);
      const hg = ctx.createLinearGradient(-26, 0, 26, 0); hg.addColorStop(0, '#e4e9f0'); hg.addColorStop(1, metal(heat));
      ctx.fillStyle = hg; ellipse(ctx, 0, 0, 26, 13); ctx.fill();
      ctx.fillStyle = 'rgba(196,80,42,.38)'; ellipse(ctx, 0, 0, 26, 13); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
      ctx.restore();
      // 손잡이 (뜨거운 쪽부터 색이 번짐)
      ctx.save(); ctx.lineCap = 'round';
      const sg = ctx.createLinearGradient(hx0, hy0, ex, ey);
      sg.addColorStop(0, metal(heat)); sg.addColorStop(clamp(heat * 0.95, 0.02, 0.98), metal(heat * 0.55)); sg.addColorStop(1, '#c7cfda');
      ctx.strokeStyle = sg; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(hx0 + ux * 22, hy0 + uy * 22); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx0 + ux * 30 + uy * 3, hy0 + uy * 30 - ux * 3); ctx.lineTo(ex - 3 + uy * 3, ey - 3 - ux * 3); ctx.stroke();
      ctx.restore();
      wisps(ctx, bx - 40, by - 8, 3, 18, t, 0.9);
      // 열의 이동: 국 → 숟가락 머리 → 손잡이 쪽 (손잡이 옆에 나란히)
      const px = uy * 22, py = -ux * 22;
      flowArrow(ctx, bx - 8, by + 22, hx0 + 8, hy0 + 12, t, a);
      flowArrow(ctx, hx0 + ux * 44 - px, hy0 + uy * 44 - py, hx0 + ux * 96 - px, hy0 + uy * 96 - py, t, a);
      flowArrow(ctx, hx0 + ux * 112 - px, hy0 + uy * 112 - py, hx0 + ux * 158 - px, hy0 + uy * 158 - py, t + 0.3, a);
    },
  ];

  /* =========================================================
     입력
     ========================================================= */
  function hitCup(V, p) {
    if (S.scene !== 'contact' || EXP.cupIn || EXP.inserting || !on('cup')) return false;
    const G = V.G.contact, c = cupRect(G);
    return p.x > c.x - 18 && p.x < c.x + c.w + 18 && p.y > c.y - 40 && p.y < c.y + c.h + 10;
  }
  function hitTile(V, p) {
    if (S.scene !== 'life' || !on('life')) return -1;
    return V.G.life.tiles.findIndex((R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h);
  }
  VIEWS.forEach((V) => {
    const hits = (p) => hitCup(V, p) || hitTile(V, p) >= 0;
    SciSim.pointer(V.v, {
      hover: (p) => (hitCup(V, p) ? 'grab' : hitTile(V, p) >= 0 ? 'pointer' : null),
      down(p) {
        if (hitCup(V, p)) {
          if (EXP.tw) { EXP.tw.cancel(); EXP.tw = null; }
          EXP.drag = true; EXP.dk0 = EXP.k; EXP.dy0 = p.y;
          hideHint(); Sound.click();
          V.v.canvas.style.cursor = 'grabbing';
          return true;
        }
        const i = hitTile(V, p);
        if (i >= 0) { playTile(i); return true; }
        return false;
      },
      move(p) {
        if (!EXP.drag) return;
        EXP.k = clamp(EXP.dk0 + (p.y - EXP.dy0) / V.G.contact.lift, 0, 1);
      },
      up() {
        if (!EXP.drag) return;
        EXP.drag = false;
        V.v.canvas.style.cursor = '';
        if (EXP.k > 0.42) insertCup();
        else EXP.tw = SciSim.tween(EXP, { k: 0 }, { duration: 0.5, ease: 'outBack', onDone: () => { EXP.tw = null; } });
      },
    });
    if (V.key === 'tall') {
      // 휴대폰: 컵·카드를 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      V.v.canvas.style.touchAction = 'pan-y';
      V.v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && hits(V.v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
  });

  function insertCup() {
    if (EXP.cupIn || EXP.inserting) return;
    if (EXP.tw) { EXP.tw.cancel(); EXP.tw = null; }
    EXP.inserting = true;
    hideHint();
    syncCupBtn();
    EXP.tw = SciSim.tween(EXP, { k: 1 }, { duration: 0.35 + 0.8 * (1 - EXP.k), ease: 'inOutCubic', onDone: () => { EXP.tw = null; EXP.inserting = false; startRun(); } });
  }
  function startRun() {
    EXP.k = 1; EXP.cupIn = true; EXP.run = true; EXP.done = false;
    EXP.t = 0; EXP.rec = [[0, T_C0, T_T0]]; EXP.nextRec = 0.05; EXP.eqT = -1;
    EXP.bob.value = 0; EXP.bob.velocity = RM ? 0 : -60;
    Sound.tick();
    syncCupBtn();
    if (S.scene === 'contact' && on('sensor')) showHint('📟 온도 센서가 두 물의 온도를 기록하고 있어요', 3500);
  }
  function resetExp() {
    if (EXP.tw) { EXP.tw.cancel(); EXP.tw = null; }
    Object.assign(EXP, { k: 0, drag: false, inserting: false, cupIn: false, run: false, done: false, t: 0, rec: [], nextRec: 0.05, Tc: T_C0, Tt: T_T0, splashed: false, eqT: -1 });
    EXP.eqPop.s = 0;
    EXP.ripples.length = 0;
    EXP.bob.value = 0; EXP.bob.velocity = 0;
    Z.ready = false;
    syncCupBtn();
  }
  // 그래프를 읽는 퀴즈: 기록이 없으면 실험 결과를 바로 채워 줌
  function finishRun() {
    if (EXP.tw) { EXP.tw.cancel(); EXP.tw = null; }
    EXP.inserting = false;
    if (!EXP.cupIn) { EXP.k = 1; EXP.cupIn = true; EXP.splashed = true; EXP.rec = [[0, T_C0, T_T0]]; EXP.nextRec = 0.05; }
    EXP.t = T_END;
    while (EXP.nextRec <= T_END + 1e-9) { const T2 = tempsAt(EXP.nextRec); EXP.rec.push([EXP.nextRec, T2[0], T2[1]]); EXP.nextRec = Math.round((EXP.nextRec + 0.05) * 1000) / 1000; }
    [EXP.Tc, EXP.Tt] = tempsAt(T_END);
    if (EXP.eqT < 0) { EXP.eqT = TAU_M * Math.log((T_C0 - T_T0) / EQ_TOL); EXP.eqPop.s = 1; }
    EXP.run = false; EXP.done = true;
    syncCupBtn();
  }
  function ensureRun() { if (!EXP.done && !EXP.run) finishRun(); }

  /* ---------- DOM 조작 ---------- */
  function showHint(text, ms) {
    VIEWS.forEach((V) => { V.hint.textContent = text; V.hint.classList.remove('hide'); });
    clearTimeout(showHint.t);
    showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { VIEWS.forEach((V) => V.hint.classList.add('hide')); }

  const rangeTB = SciSim.bindRange($('#sTB'), $('#oTB'), (v) => v + ' °C', (v) => { S.TBset = v; hideHint(); });
  function setTB(v) { S.TBset = clamp(Math.round(v), 0, 100); rangeTB.set(S.TBset); }
  const cupBtn = $('#cupBtn');
  function syncCupBtn() { cupBtn.disabled = EXP.cupIn || EXP.inserting; }
  cupBtn.addEventListener('click', () => { Sound.click(); insertCup(); });
  $('#againBtn').addEventListener('click', () => { Sound.click(); resetExp(); showHint('↓ 금속 컵을 끌어 수조에 넣어 보세요', 4000); });
  $('#tgZoom').addEventListener('click', () => { Sound.click(); S.zoomOn = !S.zoomOn; syncUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name;
      S.fade.k = 0;
      SciSim.tween(S.fade, { k: 1 }, { duration: 0.45, ease: 'outCubic' });
      VIEWS.forEach((V) => V.steam.clear());
    }
    document.body.dataset.scene = name;
    syncUI();
  }
  function syncUI() {
    const free = !!(game && game.free);
    document.body.classList.toggle('free-mode', free);
    $('#sceneSeg').hidden = !free;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $$('.only-beakers, .only-contact, .only-life').forEach((n) => { n.style.display = n.classList.contains('only-' + S.scene) ? '' : 'none'; });
    const vis = (n) => !n.hidden && n.style.display !== 'none';
    $('#ctrlCard').hidden = !$$('#ctrlCard .control').some(vis);
    $('#readouts').style.display = $$('#readouts .readout').some(vis) ? '' : 'none';
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene];
    $('#tgZoom').setAttribute('aria-pressed', S.zoomOn ? 'true' : 'false');
    syncCupBtn();
  }

  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (S.scene === 'beakers') {
      $('#rA').innerHTML = fmt(S.TA, 0) + '<small>°C</small>';
      $('#rB').innerHTML = fmt(S.TB, 0) + '<small>°C</small>';
    } else if (S.scene === 'contact') {
      $('#rC').innerHTML = fmt(EXP.Tc, 1) + '<small>°C</small>';
      $('#rT').innerHTML = fmt(EXP.Tt, 1) + '<small>°C</small>';
      $('#rTime').innerHTML = fmt(EXP.t, 1) + '<small>분</small>';
      $('#rDiff').innerHTML = fmt(Math.max(0, EXP.Tc - EXP.Tt), 1) + '<small>°C</small>';
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  const SCENE_OF = ['beakers', 'contact', 'contact', 'life'];
  function setTarget(lo, hi) { S.target = { lo, hi }; }
  const SVG_EQ = '<svg viewBox="0 0 300 150" width="300" role="img" aria-label="70 °C 물과 10 °C 물이 맞닿았을 때의 시간–온도 그래프" font-family="sans-serif">' +
    '<rect x="1" y="1" width="298" height="148" rx="12" fill="#fff" stroke="#dde4ef"/>' +
    '<path d="M46 16 V124 H286" fill="none" stroke="#94a3b8" stroke-width="2"/>' +
    '<text x="40" y="31" font-size="13" font-weight="700" fill="#5d6879" text-anchor="end">70</text>' +
    '<text x="40" y="120" font-size="13" font-weight="700" fill="#5d6879" text-anchor="end">10</text>' +
    '<path d="M46 27 C 92 74, 140 80, 196 80" fill="none" stroke="#e2463e" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M46 116 C 92 92, 140 86, 196 86" fill="none" stroke="#2f6fe4" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="232" cy="83" r="17" fill="#fff4dc" stroke="#f59e0b" stroke-width="2"/>' +
    '<text x="232" y="90" font-size="20" font-weight="800" fill="#b45309" text-anchor="middle">?</text>' +
    '<text x="166" y="143" font-size="12" font-weight="700" fill="#5d6879" text-anchor="middle">시간 →</text>' +
    '<text x="60" y="60" font-size="12" font-weight="700" fill="#e2463e">70 °C 물</text>' +
    '<text x="60" y="108" font-size="12" font-weight="700" fill="#2f6fe4">10 °C 물</text></svg>';

  game = SciSim.game({
    simId: 'm1-heat-equilibrium',
    mount: '#game',
    badge: '열평형 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      mag: '🔍 입자 모형 돋보기',
      temp: '🌡️ 물의 온도 조절',
      cup: '🥤 금속 컵과 수조',
      sensor: '📟 온도 센서',
      graph: '📈 시간–온도 그래프',
      zoom: '🔍 경계면 확대',
      eq: '⚖️ 열평형 표시',
      life: '🏠 생활 속 장면 카드',
    },
    onFeatures(set, added) {
      F = set;
      if (added.indexOf('zoom') >= 0) S.zoomOn = true;
      syncUI();
    },
    onMissionStart(m) {
      S.target = null;
      setScene(SCENE_OF[m._level]);
    },
    levels: [
      {
        title: '온도와 입자', short: '온도와 입자', icon: '🌡️', phase: '관찰',
        features: ['mag', 'temp'],
        intro: '<p class="si-q">❓ 탐구 질문: 뜨거운 물에 차가운 금속 컵을 넣으면 두 물체의 온도는 어떻게 될까?</p>' +
          '<p>먼저 <b>온도</b>가 무엇인지 알아봐요. 20 °C 물과 80 °C 물을 <b>🔍 입자 모형 돋보기</b>로 들여다보고, 물의 온도를 바꾸며 입자의 움직임을 비교해 봐요.</p>',
        setup() { setScene('beakers'); setTB(80); },
        recap: '<b>온도</b>는 물질을 이루는 입자 운동의 활발한 정도를 나타내며, 온도가 높을수록 입자 운동이 활발해요.',
        summary: '<p><b>온도</b>: 물체의 차갑고 뜨거운 정도를 수치로 나타낸 것으로, 물질을 이루는 <b>입자 운동이 활발한 정도</b>를 나타낸다.</p>' +
          '<ul><li>온도가 높을수록 입자 운동이 활발하다(빠르다).</li><li>온도가 같으면 입자 운동의 활발한 정도도 같다.</li><li>온도가 변해도 입자의 크기와 개수는 변하지 않는다.</li></ul>',
        missions: [
          {
            title: '입자의 빠르기 맞추기',
            goal: '🌡️ 오른쪽 비커 물의 온도를 바꿔 ① 입자를 <b>초록 목표</b>만큼 빠르게 만든 뒤, ② 입자의 빠르기를 <b>왼쪽 비커와 같게</b> 맞춰 보세요.',
            hint: '온도를 높이면 입자가 빨라지고, 낮추면 느려져요. ②는 왼쪽 비커의 온도를 보세요.',
            setup() { S.stage1 = 0; setTB(80); setTarget(92, 100); },
            check: () => {
              if (S.stage1 === 0 && S.TB >= 91.5) { S.stage1 = 1; setTarget(S.TA - 2.5, S.TA + 2.5); Sound.tick(); }
              return S.stage1 === 1 && Math.abs(S.TB - S.TA) <= 2.5;
            },
            hold: 0.8,
            status: () => '① 더 빠르게 ' + mark(S.stage1 >= 1) + ' · ② 왼쪽과 같게 ' + mark(S.stage1 >= 1 && Math.abs(S.TB - S.TA) <= 2.5) + ' · 오른쪽 물 <b>' + fmt(S.TB, 0) + ' °C</b>',
            explain: '물의 온도가 높을수록 입자가 <b>빠르게</b> 움직였어요. 오른쪽 물을 왼쪽 물과 같은 <b>20 °C</b>로 맞추자 입자의 빠르기도 같아졌어요. 온도는 입자 운동이 활발한 정도를 나타내요.',
          },
          {
            type: 'quiz',
            title: '온도가 높아지면?',
            goal: '물의 온도를 높이면 물을 이루는 입자는 어떻게 될까요?',
            choices: ['입자의 크기가 커진다', '입자의 개수가 많아진다', '입자의 운동이 활발해진다', '입자가 움직이지 않게 된다'],
            answer: 2,
            feedback: ['돋보기 속 입자의 크기를 다시 보세요. 온도가 바뀌어도 입자의 크기는 그대로예요!', '물을 더 넣지 않았어요. 입자의 개수는 그대로예요.', '', '입자는 늘 움직여요. 온도가 높을수록 더 빠르게 움직였지요?'],
            explain: '온도가 높을수록 입자 운동이 <b>활발</b>해요. 그래서 <b>온도는 입자 운동의 활발한 정도</b>를 나타낸다고 해요. 입자의 크기와 개수는 변하지 않아요.',
          },
        ],
      },
      {
        title: '열의 이동', short: '열의 이동', icon: '🥤', phase: '실험',
        features: ['cup', 'sensor', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 높을수록 입자 운동이 활발하다는 것을 알았어요.</div>' +
          '<p>이제 온도가 다른 두 물체를 맞닿게 해 봐요. <b>80 °C 물</b>이 든 금속 컵을 <b>20 °C 물</b>이 든 수조에 넣고, <b>📟 온도 센서</b>로 두 물의 온도를 재어 <b>📈 시간–온도 그래프</b>로 기록해요.</p>',
        setup() { setScene('contact'); resetExp(); },
        recap: '열은 온도가 높은 물체에서 낮은 물체로 이동해, 뜨거운 물체의 온도는 내려가고 차가운 물체의 온도는 올라가요.',
        summary: '<p><b>열</b>: 온도가 다른 두 물체 사이에서 이동하는 에너지. 열은 <b>온도가 높은 물체 → 온도가 낮은 물체</b>로 이동한다.</p>' +
          '<ul><li>열을 잃은 물체는 온도가 내려가고, 열을 얻은 물체는 온도가 올라간다.</li><li>시간–온도 그래프: 뜨거운 물(빨강)은 내려가고 차가운 물(파랑)은 올라가다가 두 온도가 같아진다.</li></ul>',
        missions: [
          {
            title: '컵을 넣고 그래프 그리기',
            goal: '금속 컵을 끌어 수조에 넣으세요. 온도 센서가 두 물의 온도를 <b>10분</b> 동안 기록해 그래프를 완성할 때까지 지켜봐요.',
            hint: '컵을 아래로 끌어 수조에 넣어요. <b>🥤 컵 넣기</b> 버튼을 눌러도 돼요. (화면에서는 시간이 빠르게 흘러요)',
            setup() { resetExp(); showHint('↓ 금속 컵을 끌어 수조에 넣어 보세요', 6000); },
            check: () => EXP.done,
            hold: 0,
            status: () => '컵 넣기 ' + mark(EXP.cupIn) + ' · 기록 <b>' + fmt(Math.min(EXP.t, T_END), 1) + ' / 10분</b>',
            explain: '컵 속 물(빨강)의 온도는 <b>내려가고</b>, 수조 물(파랑)의 온도는 <b>올라갔어요</b>. 시간이 지나자 두 그래프가 만나 <b>같은 온도</b>가 되었어요.',
          },
          {
            type: 'quiz',
            title: '그래프 읽기',
            setup: ensureRun,
            goal: '📈 그래프에서 컵 속 물(빨강)과 수조 물(파랑)의 온도는 어떻게 변했나요?',
            choices: ['빨강은 내려가고 파랑은 올라가다가, 두 온도가 같아졌다', '빨강과 파랑 모두 계속 내려갔다', '빨강은 올라가고 파랑은 내려갔다', '시간이 지나도 빨강이 파랑보다 훨씬 높았다'],
            answer: 0,
            feedback: ['', '파랑 그래프는 위로 갔나요, 아래로 갔나요?', '컵 속 물(빨강)은 처음에 80 °C였어요. 그래프가 어느 쪽으로 움직였나요?', '그래프의 오른쪽 끝(10분)에서 두 선을 비교해 보세요.'],
            explain: '뜨거운 물의 온도는 내려가고 차가운 물의 온도는 올라가요. 처음에는 빠르게 변하다가 점점 천천히 변해, 결국 <b>두 온도가 같아져요</b>.',
          },
          {
            type: 'quiz',
            title: '무엇이 이동했을까?',
            setup: ensureRun,
            goal: '컵 속 물의 온도는 내려가고 수조 물의 온도는 올라간 까닭은 무엇일까요?',
            choices: ['열이 온도가 높은 컵 속 물에서 온도가 낮은 수조 물로 이동했기 때문', '차가움이 수조 물에서 컵 속 물로 이동했기 때문', '열이 온도가 낮은 수조 물에서 컵 속 물로 이동했기 때문', '아무것도 이동하지 않고 두 물의 온도가 저절로 변했기 때문'],
            answer: 0,
            feedback: ['', '‘차가움’이 이동하는 것이 아니에요. 이동하는 것은 <b>열</b>이에요. 열은 어느 쪽에서 어느 쪽으로 이동할까요?', '그렇다면 컵 속 물의 온도가 올라가야 해요. 그래프를 다시 보세요.', '두 물이 맞닿자 온도가 변하기 시작했어요. 무엇인가 이동했어요!'],
            explain: '<b>열</b>은 온도가 높은 물체에서 온도가 낮은 물체로 이동해요. 열을 잃은 컵 속 물은 온도가 내려가고, 열을 얻은 수조 물은 온도가 올라가요.',
          },
        ],
      },
      {
        title: '열평형', short: '열평형', icon: '⚖️', phase: '설명',
        features: ['zoom', 'eq'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 뜨거운 물의 온도는 내려가고 차가운 물의 온도는 올라가다가 같아지는 것을 그래프로 확인했어요.</div>' +
          '<p>두 물이 맞닿은 <b>경계면</b>을 입자 모형으로 확대해 봐요. 입자들 사이에서 무슨 일이 일어날까요? 두 온도가 같아지면 어떻게 될까요?</p>',
        setup() { setScene('contact'); S.zoomOn = true; resetExp(); syncUI(); },
        recap: '두 물체의 온도가 같아져 열의 이동이 멈춘 것처럼 보이는 상태가 <b>열평형</b>이고, 열평형 온도는 처음 두 온도 사이에 있어요.',
        summary: '<p><b>열평형</b>: 온도가 다른 두 물체가 접촉한 뒤 시간이 지나 <b>두 물체의 온도가 같아진 상태</b>. 열의 이동이 멈춘 것처럼 보인다.</p>' +
          '<ul><li>경계면에서 운동이 활발한 입자가 덜 활발한 입자와 충돌하며 운동을 전달한다 → 뜨거운 쪽 입자 운동은 둔해지고, 차가운 쪽 입자 운동은 활발해진다.</li>' +
          '<li>열평형 상태에서는 두 물체의 입자 운동의 활발한 정도가 같다.</li><li>열평형 온도는 처음 두 물체의 온도 <b>사이</b>에 있다.</li></ul>',
        missions: [
          {
            title: '열평형까지 기다리기',
            goal: '금속 컵을 다시 수조에 넣고, 🔍 경계면 확대를 보며 두 물의 온도가 <b>같아질 때까지</b> 기다리세요.',
            hint: '컵을 넣은 뒤 경계면에서 빠른 입자와 느린 입자가 부딪히는 모습을 지켜보세요. 그래프의 두 선이 만나면 성공!',
            setup() { resetExp(); showHint('↓ 금속 컵을 끌어 수조에 넣어 보세요', 5000); },
            check: () => EXP.cupIn && EXP.t > 0.2 && EXP.Tc - EXP.Tt < EQ_TOL,
            hold: 0.6,
            status: () => '컵 넣기 ' + mark(EXP.cupIn) + ' · 컵 속 물 <b>' + fmt(EXP.Tc, 1) + ' °C</b> · 수조 물 <b>' + fmt(EXP.Tt, 1) + ' °C</b> · 온도 차 <b>' + fmt(Math.max(0, EXP.Tc - EXP.Tt), 1) + ' °C</b>',
            explain: '두 물의 온도가 <b>35 °C</b>로 같아졌어요. 이 상태를 <b>열평형</b>이라고 해요. 열평형 온도 35 °C는 처음 두 온도 80 °C와 20 °C <b>사이</b>에 있어요.',
          },
          {
            type: 'quiz',
            title: '열평형일 때의 입자',
            goal: '열평형 상태가 되었을 때 두 물의 입자 운동은 어떻게 될까요?',
            choices: ['두 물 모두 입자 운동이 멈춘다', '두 물의 입자 운동의 활발한 정도가 같아진다', '컵 속 물의 입자가 작아진다', '컵 속 물의 입자가 여전히 더 활발하게 움직인다'],
            answer: 1,
            feedback: ['🔍 경계면 확대를 보세요. 입자는 여전히 움직이고 있어요. 열의 이동만 멈춘 것처럼 보일 뿐이에요.', '', '입자의 크기는 변하지 않아요!', '두 물의 온도가 같아졌어요. 온도는 입자 운동의 활발한 정도를 나타내지요?'],
            explain: '열평형 상태에서는 두 물의 온도가 같으므로 <b>입자 운동의 활발한 정도도 같아요</b>. 입자는 계속 움직이지만 열이 어느 한쪽으로 이동하지 않아 열의 이동이 멈춘 것처럼 보여요.',
          },
          {
            type: 'quiz',
            title: '열평형 온도는 어디에?',
            goal: '70 °C 물과 10 °C 물을 맞닿게 두었어요. 열평형이 되었을 때의 온도는 어느 범위에 있을까요?',
            figure: SVG_EQ,
            choices: ['10 °C보다 낮다', '10 °C와 70 °C 사이에 있다', '70 °C보다 높다', '언제나 정확히 두 온도의 가운데(40 °C)이다'],
            answer: 1,
            feedback: ['차가운 물은 열을 얻어 온도가 올라가요. 10 °C보다 낮아질 수 없어요.', '', '뜨거운 물은 열을 잃어 온도가 내려가요. 70 °C보다 높아질 수 없어요.', '앞 실험에서 80 °C와 20 °C의 가운데는 50 °C였지만, 열평형 온도는 35 °C였어요.'],
            explain: '뜨거운 물체는 온도가 내려가고 차가운 물체는 온도가 올라가므로, 열평형 온도는 언제나 <b>처음 두 온도 사이</b>에 있어요. 두 물체의 양 등에 따라 가운데가 아닐 수도 있어요.',
          },
        ],
      },
      {
        title: '생활 속 열평형', short: '적용', icon: '🏠', phase: '적용',
        features: ['life'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 물체의 온도가 같아져 열의 이동이 멈춘 것처럼 보이는 상태가 <b>열평형</b>임을 알았어요.</div>' +
          '<p>생활 속에서 열평형을 찾아봐요. 장면 카드를 눌러 열이 어느 쪽에서 어느 쪽으로 이동하는지, 두 물체의 온도가 어떻게 변하는지 살펴보세요.</p>',
        setup() { setScene('life'); },
        recap: '체온계, 계곡물 속 수박, 냉장고 속 음식처럼 생활 속에서도 열은 온도가 높은 쪽에서 낮은 쪽으로 이동해 열평형에 이르러요.',
        summary: '<ul><li><b>체온계</b>: 몸에서 체온계로 열이 이동한다. 몸과 열평형을 이룰 때까지 기다린 뒤 읽는다.</li>' +
          '<li><b>계곡물 속 수박</b>, <b>냉장고 속 음식</b>: 열이 수박(음식)에서 차가운 물(공기)로 이동해 시원해진다.</li>' +
          '<li><b>뜨거운 국 속 숟가락</b>: 열이 국에서 숟가락으로 이동해 숟가락이 뜨거워진다.</li></ul>',
        missions: [
          {
            title: '생활 속 장면 살펴보기',
            goal: '장면 카드 <b>4장</b>을 하나씩 눌러, 열이 어느 쪽으로 이동하고 두 물체의 온도가 어떻게 되는지 끝까지 지켜보세요.',
            hint: '카드를 누르면 온도가 변하는 모습이 재생돼요. 끝나면 카드에 ✔가 생겨요.',
            setup() { LS.forEach((s) => { s.seen = false; s.p = 0; s.play = false; }); showHint('🖐️ 장면 카드를 눌러 보세요', 4000); },
            check: () => LS.every((s) => s.seen),
            hold: 0,
            status: () => LIFE.map((it, i) => it.title.split(' ')[0] + ' ' + mark(LS[i].seen)).join(' · '),
            explain: '네 장면 모두 열이 <b>온도가 높은 쪽에서 낮은 쪽으로</b> 이동했고, 시간이 지나 두 물체의 온도가 같아지는 <b>열평형</b>에 이르렀어요.',
          },
          {
            type: 'quiz',
            title: '체온을 잴 때',
            goal: '체온을 잴 때 체온계를 몸에 대고 <b>잠시 기다린 뒤</b> 읽는 까닭은 무엇일까요?',
            figure: '<div style="font-size:44px;line-height:1.2">🤒 ⏳</div>',
            choices: ['체온계의 차가움이 몸으로 모두 이동해야 하기 때문', '체온계와 몸이 열평형을 이룰 때까지 기다려야 하기 때문', '체온계가 몸보다 뜨거워질 때까지 기다려야 하기 때문', '기다리는 동안 몸의 체온이 올라가기 때문'],
            answer: 1,
            feedback: ['차가움이 이동하는 것이 아니에요. 열은 어느 쪽에서 어느 쪽으로 이동할까요?', '', '체온계는 몸보다 뜨거워지지 않아요. 두 온도가 같아지면 열의 이동이 멈춘 것처럼 보여요.', '몸의 온도는 거의 그대로예요. 변하는 것은 체온계의 온도예요.'],
            explain: '처음에는 열이 몸에서 체온계로 이동해 체온계의 온도가 올라가요. 체온계와 몸의 온도가 같아지는 <b>열평형</b>에 이르면 숫자가 더 이상 변하지 않아요. 그때의 온도가 체온이에요.',
          },
          {
            type: 'quiz',
            title: '계곡물 속 수박',
            goal: '시원한 계곡물에 수박을 담가 두면 수박이 시원해지는 까닭은 무엇일까요?',
            figure: '<div style="font-size:44px;line-height:1.2">🍉 🌊</div>',
            choices: ['계곡물의 차가움이 수박으로 이동하기 때문', '열이 계곡물에서 수박으로 이동하기 때문', '열이 수박에서 계곡물로 이동해 수박의 온도가 내려가기 때문', '물속에서 수박 입자의 크기가 작아지기 때문'],
            answer: 2,
            feedback: ['‘차가움’은 이동하지 않아요. 이동하는 것은 열이에요.', '그렇다면 수박은 더 따뜻해져야 해요. 열은 온도가 높은 쪽에서 낮은 쪽으로 이동해요.', '', '입자의 크기는 변하지 않아요!'],
            explain: '수박의 온도가 계곡물보다 높으므로 열은 <b>수박 → 계곡물</b>로 이동해요. 열을 잃은 수박은 온도가 내려가 계곡물과 열평형에 가까워져요.',
          },
        ],
      },
    ],
  });
  syncUI();

  // 테스트·디버그용 (화면 동작에는 영향 없음)
  window.__sim = { S, EXP, LS, Z, finishRun, insertCup, resetExp, setTB, setScene, playTile, game };

  /* ---------- 시작 ---------- */
  SciSim.loop((dt, t) => {
    update(dt, t);
    VIEWS.forEach((V) => { if (V.v.canvas.offsetWidth > 0) drawView(V, t); });
    updateReadouts(t);
  });
})();
