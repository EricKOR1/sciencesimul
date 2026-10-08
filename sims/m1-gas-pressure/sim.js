/* =========================================================
   중1 Ⅵ. 기체의 성질 — 기체의 압력 [9과06-01]
   ① [관찰] 압력의 뜻 (같은 벽돌을 넓은 면/좁은 면으로 눈 위에)
   ② [관찰] 기체 입자의 운동 (입자 하나 따라가기, 빈 공간)
   ③ [설명] 입자의 충돌과 기체의 압력 (고무막 상자 + 압력계 + 펌프)
   ④ [적용] 생활 속 기체의 압력 (풍선, 자전거 타이어)
   ※ 정성적 설명에 주안점: 계산·예측 미션 없음
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound } = SciSim;

  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fff' });
  const ctx = view.ctx;
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const LEVEL_SCENE = ['block', 'box', 'membrane', 'balloon'];

  /* ---------- 상태 ---------- */
  const S = {
    scene: '',
    // 벽돌과 눈
    orient: 'wide', bx: 400, by: 200, bvy: 0, bstate: 'held', sink: 0,
    tried: { wide: false, narrow: false }, dents: {},
    drag: null,
    // 기체 입자
    track: -1, trackWalls: {}, trackHits: 0, trail: [],
    showHits: true,
    rate: { top: [], bottom: [], left: [], right: [] },
    cum: { top: 0, bottom: 0, left: 0, right: 0 },
    flashes: [],
    needle: 1, bulge: 8,
    br: 70, targetR: 0,
    pump: 0,
  };

  /* ---------- 공통 그리기 도우미 ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function arrow(x0, y0, x1, y1, color, width, head) {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = head || 10;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * 0.6, y1 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl);
    ctx.lineTo(x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl);
    ctx.closePath(); ctx.fill();
    ctx.lineCap = 'butt';
  }
  function pill(text, x, y, bg, fg, font) {
    ctx.font = font || 'bold 13px sans-serif';
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = bg; roundRect(x - w / 2, y - 12, w, 24, 12); ctx.fill();
    ctx.fillStyle = fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
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

  /* =========================================================
     ① 벽돌과 눈
     ========================================================= */
  const SNOW = { x0: 40, x1: 760, y: 372, bottom: 502 };
  const SKY = '#eef5ff';
  const BRICK = { wide: { w: 216, h: 78 }, narrow: { w: 72, h: 216 } };
  const DEPTH = { wide: 10, narrow: 30 };          // 눈이 눌리는 깊이(px) — 같은 힘, 면적이 좁을수록 깊게
  const STATION = { wide: 230, narrow: 570 };
  const PX_PER_CM = 5;
  const dent = new Float32Array(SNOW.x1 - SNOW.x0 + 1);

  function resetBlock() {
    dent.fill(0);
    S.dents = {}; S.tried = { wide: false, narrow: false };
    S.orient = 'wide'; S.bx = 400; S.by = 250; S.bvy = 0; S.bstate = 'held'; S.sink = 0; S.drag = null;
    updateFaceBtns();
  }
  function clampBx() {
    const d = BRICK[S.orient];
    S.bx = clamp(S.bx, SNOW.x0 + d.w / 2 + 4, SNOW.x1 - d.w / 2 - 4);
  }
  function minDentUnder(x, w) {
    let m = Infinity;
    for (let i = Math.round(x - w / 2); i <= Math.round(x + w / 2); i++) {
      const k = i - SNOW.x0;
      if (k >= 0 && k < dent.length) m = Math.min(m, dent[k]);
    }
    return m === Infinity ? 0 : m;
  }
  function carve(x, w, depth) {
    const e = 5;
    for (let i = Math.floor(x - w / 2 - e); i <= Math.ceil(x + w / 2 + e); i++) {
      const k = i - SNOW.x0;
      if (k < 0 || k >= dent.length) continue;
      const out = Math.max(0, Math.abs(i - x) - w / 2);
      const d = out <= 0 ? depth : depth * Math.max(0, 1 - out / e);
      if (d > dent[k]) dent[k] = d;
    }
  }
  function dropBlock(orient, x) {
    S.orient = orient;
    S.bx = x != null ? x : STATION[orient];
    clampBx();
    S.by = Math.min(S.by, SNOW.y - 60);
    if (S.bstate === 'rest' || S.bstate === 'sink') S.by = SNOW.y - 90;
    S.by = Math.max(S.by, BRICK[orient].h + 16);
    S.bvy = 0; S.bstate = 'air'; S.drag = null;
    updateFaceBtns();
  }
  function stepBlock(dt) {
    const d = BRICK[S.orient];
    if (S.bstate === 'held') return;
    if (S.bstate === 'air') {
      S.bvy += 2200 * dt; S.by += S.bvy * dt;
      const base = minDentUnder(S.bx, d.w);
      const contact = SNOW.y + base;
      if (S.by >= contact) {
        S.by = contact; S.bvy = 0; S.sink = base;
        S.bstate = base >= DEPTH[S.orient] ? 'rest' : 'sink';
        Sound.tick();
        if (S.bstate === 'rest') settle();
      }
    }
    if (S.bstate === 'sink') {
      const target = DEPTH[S.orient];
      S.sink = Math.min(target, S.sink + target * 1.6 * dt + 2 * dt);
      carve(S.bx, d.w, S.sink);
      S.by = SNOW.y + S.sink;
      if (S.sink >= target) settle();
    }
  }
  function settle() {
    const d = BRICK[S.orient];
    S.bstate = 'rest';
    S.tried[S.orient] = true;
    S.dents[S.orient] = { x: S.bx, w: d.w, depth: DEPTH[S.orient] };
    Sound.click();
  }

  function drawBlockScene() {
    // 하늘
    ctx.fillStyle = SKY; ctx.fillRect(0, 0, 800, 520);
    // 안내
    ctx.textAlign = 'left'; ctx.fillStyle = '#3a4456'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('⚖️ 벽돌의 무게(누르는 힘)는 언제나 같아요', 22, 30);
    ctx.fillStyle = '#c2410c'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('⬇ 주황 화살표: 벽돌이 눈의 각 부분을 누르는 정도(압력)', 22, 52);

    // 눈
    ctx.beginPath();
    ctx.moveTo(SNOW.x0, SNOW.bottom);
    ctx.lineTo(SNOW.x0, SNOW.y + dent[0]);
    for (let x = SNOW.x0; x <= SNOW.x1; x += 2) ctx.lineTo(x, SNOW.y + dent[x - SNOW.x0]);
    ctx.lineTo(SNOW.x1, SNOW.bottom); ctx.closePath();
    const sg = ctx.createLinearGradient(0, SNOW.y, 0, SNOW.bottom);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#d9e8f8');
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = '#8fb0d8'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = SNOW.x0; x <= SNOW.x1; x += 2) { const y = SNOW.y + dent[x - SNOW.x0]; x === SNOW.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = '#7f9cc0'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('❄ 푹신한 눈', SNOW.x0 + 6, SNOW.bottom - 8);

    // 눌린 자국 표시 (처음 눈 높이 + 깊이)
    ['wide', 'narrow'].forEach((o) => {
      const dd = S.dents[o];
      if (!dd) return;
      const col = o === 'wide' ? '#3867f4' : '#e0552a';
      ctx.save();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#8aa0bd'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dd.x - dd.w / 2 - 14, SNOW.y); ctx.lineTo(dd.x + dd.w / 2 + 14, SNOW.y); ctx.stroke();
      ctx.restore();
      const lx = dd.x + dd.w / 2 + 12;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx - 4, SNOW.y); ctx.lineTo(lx + 4, SNOW.y); ctx.moveTo(lx, SNOW.y); ctx.lineTo(lx, SNOW.y + dd.depth); ctx.moveTo(lx - 4, SNOW.y + dd.depth); ctx.lineTo(lx + 4, SNOW.y + dd.depth); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = col; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(o === 'wide' ? '넓은 면으로 놓은 자국' : '좁은 면으로 놓은 자국', dd.x, SNOW.y + 92);
      ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('깊이 약 ' + Math.round(dd.depth / PX_PER_CM) + ' cm · ' + (o === 'wide' ? '얕게 눌림' : '깊게 눌림'), dd.x, SNOW.y + 112);
    });

    // 벽돌
    const d = BRICK[S.orient];
    const x = S.bx - d.w / 2, y = S.by - d.h;
    const bob = S.bstate === 'held' ? Math.sin(performance.now() / 300) * 3 : 0;
    if (S.bstate === 'held' || S.bstate === 'air' || S.drag) {
      // 그림자
      const base = SNOW.y + minDentUnder(S.bx, d.w);
      ctx.fillStyle = 'rgba(40,60,90,.12)';
      ctx.beginPath(); ctx.ellipse(S.bx, base + 2, d.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save(); ctx.translate(0, bob);
    // 무게 화살표 (항상 같은 길이)
    arrow(S.bx, y - 70, S.bx, y - 8, '#5b6b84', 5, 14);
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('무게', S.bx + 10, y - 44);
    // 몸체
    const g = ctx.createLinearGradient(x, y, x + d.w, y + d.h);
    g.addColorStop(0, '#e07a5f'); g.addColorStop(1, '#b4492f');
    ctx.fillStyle = g; roundRect(x, y, d.w, d.h, 6); ctx.fill();
    ctx.strokeStyle = S.drag ? '#f26b3a' : '#8f3a2a'; ctx.lineWidth = S.drag ? 3 : 2; ctx.stroke();
    // 벽돌 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
    if (S.orient === 'wide') { ctx.beginPath(); ctx.moveTo(x + 10, y + d.h / 2); ctx.lineTo(x + d.w - 10, y + d.h / 2); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x + d.w / 2, y + 10); ctx.lineTo(x + d.w / 2, y + d.h - 10); ctx.stroke(); }
    // 닿는 면 강조
    ctx.fillStyle = 'rgba(255,209,102,.95)';
    roundRect(x + 2, S.by - 7, d.w - 4, 6, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('벽돌', S.bx, y + d.h / 2 + 5);
    ctx.restore();

    // 압력 화살표 (닿아 있을 때만)
    if (S.bstate === 'sink' || S.bstate === 'rest') {
      const L = 8 + S.sink * 0.95;
      for (let ax = x + 12; ax <= x + d.w - 11; ax += 20) arrow(ax, S.by + 3, ax, S.by + 3 + L, '#f26b3a', 3, 8);
    }
    // 들고 있을 때 안내
    if (S.bstate === 'held') {
      pill('✋ 끌어서 눈 위에 놓기', S.bx, y - 92 + bob, '#1b2333', '#fff');
    }
  }

  /* =========================================================
     ②~④ 기체 입자
     ========================================================= */
  const BOX2 = { x: 210, y: 76, w: 380, h: 372 };     // 2단계: 밀폐된 용기
  const BOXM = { x: 130, y: 110, w: 300, h: 300 };    // 3단계: 고무막 상자
  const BAL = { cx: 300, neck: 482 };                 // 4단계: 풍선
  const N0 = 40;                                      // 3단계 기준 입자 수 (1기압)
  const RATE_WIN = 4000;                              // 충돌 횟수 평균 구간(ms)
  const RAD = { box: 8, membrane: 6, balloon: 6 };
  const SPD = { box: 170, membrane: 200, balloon: 190 };
  let parts = [];

  const rBalloon = (n) => 70 + 120 * Math.sqrt(clamp((n - 10) / 80, 0, 1));
  const balloonCy = () => BAL.neck - 28 - S.br;
  const pressure = () => parts.length / N0;

  function randVel(sc) {
    const a = Math.random() * Math.PI * 2;
    const sp = SPD[sc] * (0.65 + Math.random() * 0.7);
    return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp };
  }
  function makeParticle(sc) {
    const R = RAD[sc] || 6;
    let x, y;
    if (sc === 'balloon') {
      const cy = balloonCy();
      const r = (S.br - R - 2) * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      x = BAL.cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
    } else {
      const B = sc === 'box' ? BOX2 : BOXM;
      x = B.x + R + Math.random() * (B.w - 2 * R); y = B.y + R + Math.random() * (B.h - 2 * R);
    }
    return Object.assign({ x, y }, randVel(sc));
  }
  function fill(n) { parts = []; for (let i = 0; i < n; i++) parts.push(makeParticle(S.scene)); }
  function addAir(n) {
    for (let i = 0; i < n; i++) {
      let p;
      if (S.scene === 'balloon') {
        const a = -Math.PI * (0.1 + Math.random() * 0.8), sp = SPD.balloon * (0.6 + Math.random() * 0.8);
        p = { x: BAL.cx + (Math.random() - 0.5) * 16, y: balloonCy() + S.br - 12 - Math.random() * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp };
      } else {
        const a = Math.PI + 0.1 + Math.random() * 1.4, sp = SPD.membrane * (0.6 + Math.random() * 0.8);
        p = { x: BOXM.x + BOXM.w - 12 - Math.random() * 8, y: BOXM.y + BOXM.h - 12 - Math.random() * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp };
      }
      parts.push(p);
    }
  }
  function removeAir(n) {
    for (let i = 0; i < n && parts.length; i++) parts.pop();
    if (S.track >= parts.length) untrack();
  }
  function resetRates() {
    S.rate = { top: [], bottom: [], left: [], right: [] };
    S.cum = { top: 0, bottom: 0, left: 0, right: 0 };
    S.rateT0 = performance.now();
  }
  function hit(wall, x, y) {
    const now = performance.now();
    S.rate[wall].push(now);
    S.cum[wall]++;
    if (S.showHits && on('hits')) S.flashes.push({ x, y, t: now });
  }

  // 벽에 부딪힌 뒤 방향을 살짝 흩뜨림(실제 벽면은 울퉁불퉁) — 입자가 고르게 퍼지도록
  function jitter(p, amt) {
    const a = (Math.random() - 0.5) * amt, c = Math.cos(a), s = Math.sin(a);
    const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
    p.vx = vx; p.vy = vy;
  }
  // 사각 용기 (b = 고무막이 부푼 정도, 0이면 단단한 벽)
  function stepRect(dt, B, R, b) {
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2, hw = B.w / 2, hh = B.h / 2;
    parts.forEach((p, i) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const fu = Math.max(0, 1 - ((p.y - cy) / hh) ** 2);
      const fv = Math.max(0, 1 - ((p.x - cx) / hw) ** 2);
      const L = B.x - b * fu + R, Rr = B.x + B.w + b * fu - R, T = B.y - b * fv + R, Bt = B.y + B.h + b * fv - R;
      let w = null;
      if (p.x < L) { p.x = Math.min(Rr, L + (L - p.x)); if (p.vx < 0) { p.vx = -p.vx; w = 'left'; hit(w, L - R, p.y); } }
      else if (p.x > Rr) { p.x = Math.max(L, Rr - (p.x - Rr)); if (p.vx > 0) { p.vx = -p.vx; w = 'right'; hit(w, Rr + R, p.y); } }
      if (p.y < T) { p.y = Math.min(Bt, T + (T - p.y)); if (p.vy < 0) { p.vy = -p.vy; w = 'top'; hit(w, p.x, T - R); } }
      else if (p.y > Bt) { p.y = Math.max(T, Bt - (p.y - Bt)); if (p.vy > 0) { p.vy = -p.vy; w = 'bottom'; hit(w, p.x, Bt + R); } }
      if (w && b > 0 && i !== S.track) jitter(p, 0.5);
      if (i === S.track) {
        if (w) { S.trackWalls[w] = true; S.trackHits++; }
        S.trail.push({ x: p.x, y: p.y });
        if (S.trail.length > 150) S.trail.shift();
      }
    });
  }
  function stepBalloon(dt) {
    const R = RAD.balloon;
    const prev = balloonCy();
    const target = rBalloon(parts.length);
    S.br += (target - S.br) * Math.min(1, dt * 3);
    const cy = balloonCy(), dy = cy - prev;
    parts.forEach((p) => {
      p.y += dy;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const dx = p.x - BAL.cx, dyy = p.y - cy, d = Math.hypot(dx, dyy), lim = S.br - R - 2;
      if (d > lim && d > 0) {
        const nx = dx / d, ny = dyy / d, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; jitter(p, 0.5); hit(Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : (ny < 0 ? 'top' : 'bottom'), BAL.cx + nx * (S.br - 2), cy + ny * (S.br - 2)); }
        p.x = BAL.cx + nx * lim; p.y = cy + ny * lim;
      }
    });
  }

  function stepGas(dt) {
    if (S.scene === 'box') stepRect(dt, BOX2, RAD.box, 0);
    else if (S.scene === 'membrane') {
      const P = pressure();
      S.needle += (P - S.needle) * Math.min(1, dt * 5);
      const bt = clamp(8 + 10 * (P - 1), 2, 30);
      S.bulge += (bt - S.bulge) * Math.min(1, dt * 4);
      stepRect(dt, BOXM, RAD.membrane, S.bulge);
    } else if (S.scene === 'balloon') stepBalloon(dt);
    const now = performance.now();
    for (const k in S.rate) { const a = S.rate[k]; while (a.length && now - a[0] > RATE_WIN) a.shift(); }
    S.flashes = S.flashes.filter((f) => now - f.t < 350);
    S.pump = Math.max(0, S.pump - dt * 3);
  }
  const rateOf = (w) => S.rate[w].length / (clamp(performance.now() - (S.rateT0 || 0), 800, RATE_WIN) / 1000);
  const totalRate = () => rateOf('top') + rateOf('bottom') + rateOf('left') + rateOf('right');

  function drawParticles(R) {
    parts.forEach((p) => {
      ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
    });
    parts.forEach((p, i) => {
      const tracked = i === S.track;
      const r = tracked ? R + 3 : R;
      const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0.5, p.x, p.y, r);
      g.addColorStop(0, tracked ? '#ffd2b8' : '#9fb8ff'); g.addColorStop(1, tracked ? '#f26b3a' : '#2f5be3');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (tracked) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
    });
  }
  function drawTrail() {
    if (S.track < 0 || S.trail.length < 2) return;
    ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.5)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); S.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore();
  }
  function drawFlashes() {
    const now = performance.now();
    S.flashes.forEach((f) => {
      const a = 1 - (now - f.t) / 350;
      ctx.strokeStyle = `rgba(242,107,58,${a})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 10, 0, Math.PI * 2); ctx.stroke();
    });
  }

  /* ---- ② 밀폐된 용기 ---- */
  function drawBoxScene() {
    const B = BOX2;
    ctx.fillStyle = '#f3f7ff'; roundRect(B.x, B.y, B.w, B.h, 10); ctx.fill();
    drawTrail();
    drawParticles(RAD.box);
    drawFlashes();
    ctx.strokeStyle = '#7d8ba1'; ctx.lineWidth = 7; roundRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 12); ctx.stroke();
    // 따라가는 입자가 부딪힌 벽
    if (S.track >= 0) {
      const walls = [
        ['top', '위', B.x + B.w / 2, B.y - 22, B.x + 10, B.y - 3, B.x + B.w - 10, B.y - 3],
        ['bottom', '아래', B.x + B.w / 2, B.y + B.h + 24, B.x + 10, B.y + B.h + 3, B.x + B.w - 10, B.y + B.h + 3],
        ['left', '왼쪽', B.x - 52, B.y + B.h / 2, B.x - 3, B.y + 10, B.x - 3, B.y + B.h - 10],
        ['right', '오른쪽', B.x + B.w + 56, B.y + B.h / 2, B.x + B.w + 3, B.y + 10, B.x + B.w + 3, B.y + B.h - 10],
      ];
      walls.forEach(([k, name, lx, ly, ax, ay, bx, by]) => {
        const ok = !!S.trackWalls[k];
        if (ok) {
          ctx.strokeStyle = 'rgba(20,160,88,.75)'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
        pill((ok ? '✔ ' : '') + name, lx, ly, ok ? '#14a058' : '#e3e9f2', ok ? '#fff' : '#5d6879');
      });
    }
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('🔒 밀폐된 용기 속 기체', 18, 30);
  }

  /* ---- ③ 고무막 상자 + 압력계 + 펌프 ---- */
  const GAUGE_M = { cx: 642, cy: 116, r: 84 };
  const PUMP = { x: 640, top: 330, base: 482 };
  function membranePath(B, b) {
    const x0 = B.x, y0 = B.y, x1 = B.x + B.w, y1 = B.y + B.h, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, y0 - 2 * b, x1, y0);
    ctx.quadraticCurveTo(x1 + 2 * b, cy, x1, y1);
    ctx.quadraticCurveTo(cx, y1 + 2 * b, x0, y1);
    ctx.quadraticCurveTo(x0 - 2 * b, cy, x0, y0);
    ctx.closePath();
  }
  function drawMembraneScene() {
    const B = BOXM, b = S.bulge;
    const x0 = B.x, y0 = B.y, x1 = B.x + B.w, y1 = B.y + B.h, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // 관: 상자 → 압력계, 상자 → 펌프
    if (on('gauge')) {
      ctx.strokeStyle = '#a7b2c3'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x1 - 2, y0 + 2); ctx.lineTo(GAUGE_M.cx - GAUGE_M.r + 4, y0 + 2); ctx.stroke();
    }
    if (on('pump')) {
      ctx.strokeStyle = '#9aa5b6'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x1 - 2, y1 - 2); ctx.quadraticCurveTo(PUMP.x - 40, y1 + 70, PUMP.x - 18, PUMP.base - 14); ctx.stroke();
    }
    // 안쪽
    membranePath(B, b);
    ctx.fillStyle = '#f3f7ff'; ctx.fill();
    drawTrail();
    drawParticles(RAD.membrane);
    drawFlashes();
    // 고무막
    membranePath(B, b);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.stroke();
    // 모서리 틀
    ctx.fillStyle = '#5d6879';
    [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([px, py]) => { roundRect(px - 7, py - 7, 14, 14, 3); ctx.fill(); });
    ctx.fillStyle = '#9a5b00'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('🟧 사방이 얇은 고무막인 상자', 18, 30);

    // 바깥으로 미는 화살표 + 벽마다 충돌 횟수
    if (on('hits')) {
      const P = pressure();
      const L = 14 + 10 * clamp(P, 0.3, 3);
      const col = '#e0552a';
      arrow(cx, y0 - b - 4, cx, y0 - b - 4 - L, col, 4, 11);
      arrow(cx, y1 + b + 4, cx, y1 + b + 4 + L, col, 4, 11);
      arrow(x0 - b - 4, cy, x0 - b - 4 - L, cy, col, 4, 11);
      arrow(x1 + b + 4, cy, x1 + b + 4 + L, cy, col, 4, 11);
      const lab = (w) => '💥 ' + fmt(rateOf(w), 0) + '회/초';
      pill(lab('top'), cx + 86, y0 - b - 18, 'rgba(255,255,255,.92)', '#9a3412');
      pill(lab('bottom'), cx + 86, y1 + b + 22, 'rgba(255,255,255,.92)', '#9a3412');
      pill(lab('left'), x0 - b - 46, cy + 34, 'rgba(255,255,255,.92)', '#9a3412', 'bold 12px sans-serif');
      pill(lab('right'), x1 + b + 40, cy + 34, 'rgba(255,255,255,.92)', '#9a3412', 'bold 12px sans-serif');
    }
    if (on('gauge')) {
      drawGauge(GAUGE_M.cx, GAUGE_M.cy, GAUGE_M.r, S.needle);
      if (isNew('gauge')) newRing(GAUGE_M.cx - GAUGE_M.r, GAUGE_M.cy - GAUGE_M.r, GAUGE_M.r * 2, GAUGE_M.r * 2 + 26);
    }
    if (on('pump')) drawPump();
  }

  function drawGauge(cx, cy, r, val) {
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, maxP = 4;
    const ang = (p) => a0 + (a1 - a0) * clamp(p / maxP, 0, 1);
    ctx.strokeStyle = 'rgba(226,70,75,.22)'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(cx, cy, r - 14, ang(2), ang(4)); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= maxP; p += 0.5) {
      const a = ang(p), major = p % 1 === 0;
      ctx.strokeStyle = '#3a4456'; ctx.lineWidth = major ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - (major ? 20 : 15)), cy + Math.sin(a) * (r - (major ? 20 : 15)));
      ctx.stroke();
      if (major) ctx.fillText(p, cx + Math.cos(a) * (r - 32), cy + Math.sin(a) * (r - 32));
    }
    const a = ang(val);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); ctx.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18)); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#5d6879';
    ctx.fillText('기압', cx, cy + r * 0.45);
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#3a4456';
    ctx.fillText('🧭 압력계', cx, cy + r + 20);
    ctx.restore();
  }

  function drawPump() {
    const px = PUMP.x, top = PUMP.top, base = PUMP.base;
    const push = S.pump * 34;
    // 받침
    ctx.fillStyle = '#5d6879'; roundRect(px - 46, base - 10, 92, 12, 5); ctx.fill();
    // 몸통
    const g = ctx.createLinearGradient(px - 18, 0, px + 18, 0);
    g.addColorStop(0, '#9fb2cc'); g.addColorStop(0.5, '#dfe7f2'); g.addColorStop(1, '#9fb2cc');
    ctx.fillStyle = g; roundRect(px - 18, top, 36, base - 10 - top, 6); ctx.fill();
    ctx.strokeStyle = '#7d8ba1'; ctx.lineWidth = 2; ctx.stroke();
    // 손잡이
    const hy = top - 46 + push;
    ctx.fillStyle = '#7d8ba1'; ctx.fillRect(px - 4, hy, 8, top - hy + 4);
    ctx.fillStyle = '#f26b3a'; roundRect(px - 44, hy - 14, 88, 18, 9); ctx.fill();
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('공기 펌프', px, base + 18 > 515 ? base - 18 : base + 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('누르기', px, hy - 1);
  }
  function hitPump(p) {
    return Math.abs(p.x - PUMP.x) < 54 && p.y > PUMP.top - 70 && p.y < PUMP.base + 4;
  }

  /* ---- ④ 풍선 ---- */
  function drawBalloonScene() {
    const cy = balloonCy(), r = S.br;
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('🎈 펌프로 공기를 넣는 고무풍선', 18, 30);
    // 호스: 펌프 → 풍선 입구
    ctx.strokeStyle = '#9aa5b6'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(BAL.cx, BAL.neck + 4); ctx.quadraticCurveTo(BAL.cx + 120, 512, PUMP.x - 18, PUMP.base - 14); ctx.stroke();
    // 목표 크기
    if (S.targetR) {
      ctx.save(); ctx.setLineDash([8, 7]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(BAL.cx, BAL.neck - 28 - S.targetR, S.targetR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // 풍선
    ctx.beginPath(); ctx.arc(BAL.cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,120,150,.16)'; ctx.fill();
    drawParticles(RAD.balloon);
    drawFlashes();
    ctx.beginPath(); ctx.arc(BAL.cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2466b'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(BAL.cx, cy, r - 14, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke(); ctx.lineCap = 'butt';
    // 매듭과 입구
    ctx.fillStyle = '#e2466b';
    ctx.beginPath(); ctx.moveTo(BAL.cx - 9, cy + r + 10); ctx.lineTo(BAL.cx + 9, cy + r + 10); ctx.lineTo(BAL.cx, cy + r - 2); ctx.closePath(); ctx.fill();
    ctx.fillRect(BAL.cx - 6, cy + r + 8, 12, BAL.neck - (cy + r + 8) + 4);
    // 모든 방향으로 미는 화살표
    if (on('hits')) {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + Math.PI / 12;
        if (Math.abs(a - Math.PI / 2) < 0.4) continue; // 입구 쪽 생략
        const r0 = r + 7, r1 = r + 29;
        arrow(BAL.cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, BAL.cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 'rgba(224,85,42,.85)', 3, 9);
      }
    }
    if (S.targetR) pill('🎯 여기까지 부풀리기', BAL.cx, BAL.neck - 28 - 2 * S.targetR - 4, '#14a058', '#fff');
    drawPump();
  }

  /* ---------- 장면 전환 ---------- */
  const SCENE_LABEL = {
    block: '❄️ 눈 위에 벽돌 놓기',
    box: '🫧 밀폐된 용기 속 기체 입자',
    membrane: '💥 입자의 충돌과 기체의 압력',
    balloon: '🎈 풍선 속 기체 입자',
  };
  const SCENE_HINT = {
    block: '✋ 벽돌을 끌어서 눈 위에 놓아 보세요',
    box: '👆 움직이는 입자 하나를 눌러 보세요',
    membrane: '💥 주황색 고리 = 입자가 벽에 부딪힌 곳',
    balloon: '🫧 공기 넣기 버튼이나 펌프를 눌러 보세요',
  };
  function setScene(sc, force) {
    if (S.scene === sc && !force) return;
    S.scene = sc;
    untrack(); S.flashes = []; resetRates(); S.targetR = 0;
    if (sc === 'block') { parts = []; resetBlock(); }
    else if (sc === 'box') fill(24);
    else if (sc === 'membrane') { S.needle = 1; S.bulge = 8; fill(N0); }
    else if (sc === 'balloon') { S.br = rBalloon(10); fill(10); }
    view.wrap.style.setProperty('--stage-bg', sc === 'block' ? SKY : '#fff');
    $('#tbLabel').textContent = SCENE_LABEL[sc];
    $('#pumpTitle').textContent = sc === 'balloon' ? '🫧 풍선에 공기 넣기' : '🫧 상자에 공기 넣기';
    showHint(SCENE_HINT[sc], 6000);
    refreshUI();
  }

  /* ---------- 화면 요소 보이기/숨기기 (장면 + 도구) ---------- */
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/);
      const need = node.getAttribute('data-need');
      node.hidden = !(scs.indexOf(S.scene) >= 0 && (!need || on(need)));
    });
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 700;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    lastFree = free;
  }
  function updateFaceBtns() {
    $('#wideBtn').classList.toggle('on', S.orient === 'wide' && S.bstate !== 'held');
    $('#narrowBtn').classList.toggle('on', S.orient === 'narrow' && S.bstate !== 'held');
  }

  /* ---------- 입력 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  function track(i) {
    S.track = i; S.trackWalls = {}; S.trackHits = 0; S.trail = [];
    if (i >= 0) {
      // 너무 한 방향(가로·세로)으로만 움직이지 않게 살짝 비스듬히
      const p = parts[i], sp = Math.hypot(p.vx, p.vy);
      let a = Math.atan2(p.vy, p.vx);
      const q = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      if (q < 0.45 || q > Math.PI / 2 - 0.45) a += 0.6;
      const v = Math.max(sp, 190);
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
    }
    $('#untrackBtn').hidden = i < 0;
  }
  function untrack() { S.track = -1; S.trackWalls = {}; S.trackHits = 0; S.trail = []; const b = $('#untrackBtn'); if (b) b.hidden = true; }
  $('#trackBtn').addEventListener('click', () => { Sound.click(); if (parts.length) track(Math.floor(Math.random() * parts.length)); hideHint(); });
  $('#untrackBtn').addEventListener('click', () => { Sound.click(); untrack(); });
  $('#showHits').addEventListener('change', (e) => { S.showHits = e.target.checked; });

  $('#wideBtn').addEventListener('click', () => { Sound.click(); hideHint(); dropBlock('wide'); });
  $('#narrowBtn').addEventListener('click', () => { Sound.click(); hideHint(); dropBlock('narrow'); });

  function pumpIn() {
    const max = S.scene === 'balloon' ? 90 : 120;
    if (parts.length >= max) { SciSim.toast(S.scene === 'balloon' ? '풍선이 터질 것 같아요! 더 넣지 마세요 🎈' : '더 넣으면 상자가 터질 것 같아요!'); return; }
    Sound.tick(); S.pump = 1; addAir(Math.min(10, max - parts.length)); hideHint();
  }
  function pumpOut() {
    const min = S.scene === 'balloon' ? 10 : 20;
    if (parts.length <= min) { SciSim.toast('더 이상 뺄 수 없어요'); return; }
    Sound.tick(); removeAir(Math.min(10, parts.length - min)); hideHint();
  }
  $('#pumpIn').addEventListener('click', pumpIn);
  $('#pumpOut').addEventListener('click', pumpOut);

  $('#resetBtn').addEventListener('click', () => { Sound.click(); setScene(S.scene, true); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  function nearestParticle(p) {
    let best = -1, bd = 30 * 30;
    parts.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function hitBlock(p) {
    const d = BRICK[S.orient];
    return p.x > S.bx - d.w / 2 - 10 && p.x < S.bx + d.w / 2 + 10 && p.y > S.by - d.h - 10 && p.y < S.by + 8;
  }
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'block') return hitBlock(p) ? 'grab' : null;
      if ((S.scene === 'membrane' || S.scene === 'balloon') && on('pump') && hitPump(p)) return 'pointer';
      if (S.scene === 'box' && on('track')) return nearestParticle(p) >= 0 ? 'pointer' : null;
      return null;
    },
    down(p) {
      if (S.scene === 'block') {
        if (!hitBlock(p)) return false;
        S.drag = { ox: p.x - S.bx, oy: p.y - S.by, sx: p.x, sy: p.y, moved: false };
        if (S.bstate !== 'held') S.bstate = 'drag';
        hideHint();
        return true;
      }
      if ((S.scene === 'membrane' || S.scene === 'balloon') && on('pump') && hitPump(p)) { pumpIn(); return false; }
      if (S.scene === 'box' && on('track')) {
        const i = nearestParticle(p);
        if (i >= 0) { Sound.tick(); track(i); hideHint(); }
      }
      return false;
    },
    move(p) {
      if (!S.drag) return;
      if (Math.hypot(p.x - S.drag.sx, p.y - S.drag.sy) > 6) S.drag.moved = true;
      if (!S.drag.moved) return;
      const d = BRICK[S.orient];
      S.bstate = 'drag';
      S.bx = p.x - S.drag.ox; clampBx();
      S.by = clamp(p.y - S.drag.oy, d.h + 14, SNOW.y + minDentUnder(S.bx, d.w) - 2);
    },
    up() {
      if (!S.drag) return;
      const moved = S.drag.moved;
      S.drag = null;
      if (!moved) {
        // 톡 누르기: 세우기 ↔ 눕히기
        Sound.click();
        const o = S.orient === 'wide' ? 'narrow' : 'wide';
        S.by = SNOW.y - 60;
        dropBlock(o, S.bx);
      } else {
        S.bvy = 0; S.bstate = 'air';
        updateFaceBtns();
      }
    },
  });

  /* ---------- 측정값 표시 ---------- */
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    if (S.scene === 'block') {
      const touching = S.bstate === 'sink' || S.bstate === 'rest';
      $('#rArea').textContent = S.bstate === 'held' ? '-' : (S.orient === 'wide' ? '넓은 면 ▬' : '좁은 면 ▮');
      $('#rDepth').innerHTML = touching ? '약 ' + fmt(S.sink / PX_PER_CM, 0) + '<small>cm</small>' : '-';
      updateFaceBtns();
    } else {
      $('#rN').innerHTML = parts.length + '<small>개</small>';
      $('#rTrack').innerHTML = S.track >= 0 ? S.trackHits + '<small>번</small>' : '<small>입자를 골라 보세요</small>';
      $('#rP').innerHTML = fmt(S.needle, 2) + '<small>기압</small>';
      $('#rHits').innerHTML = fmt(totalRate(), 0) + '<small>회/초</small>';
      $('#rD').innerHTML = fmt(S.br * 2 / 10, 0) + '<small>cm</small>';
    }
  }

  /* ---------- 미션 ---------- */
  const mark = (b) => (b ? '✔' : '—');
  const WALL_KO = { top: '위', bottom: '아래', left: '왼쪽', right: '오른쪽' };

  game = SciSim.game({
    simId: 'm1-gas-pressure',
    mount: '#game',
    badge: '압력 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      block: '🧱 벽돌과 눈',
      track: '🔍 입자 따라가기',
      hits: '💥 충돌 표시',
      gauge: '🧭 압력계',
      pump: '🫧 공기 펌프',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      S.targetR = 0;
      if (!(game && game.free)) setScene(LEVEL_SCENE[m._level]);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '압력의 뜻', short: '압력의 뜻', icon: '🧱', phase: '관찰',
        features: ['block'],
        intro: '<p>❓ <b>탐구 질문: 눈 위를 걸을 때 왜 설피(넓은 신발)를 신으면 덜 빠질까?</b></p>' +
          '<p>무게가 같은 벽돌을 <b>넓은 면</b>과 <b>좁은 면</b>으로 각각 눈 위에 놓고, 눈이 눌린 깊이를 비교해 봐요.</p>',
        setup() { setScene('block', true); },
        recap: '같은 힘이라도 <b>누르는 면적이 좁을수록 압력이 커요</b>. 압력은 일정한 면적에 수직으로 작용하는 힘이에요.',
        summary: '<p><b>압력</b>: 일정한 면적에 수직으로 작용하는 힘</p>' +
          '<ul><li>같은 힘이라도 누르는 <b>면적이 좁을수록</b> 압력이 크다.</li>' +
          '<li>압력을 크게 이용: 칼날, 못 끝, 송곳</li>' +
          '<li>압력을 작게 이용: 설피, 눈썰매, 넓은 가방끈</li></ul>',
        missions: [
          {
            title: '같은 벽돌, 다른 면',
            goal: '벽돌을 <b>넓은 면</b>과 <b>좁은 면</b>으로 각각 눈 위에 놓아 보세요. 어느 쪽이 더 깊이 눌리나요?',
            hint: '<b>▬ 넓은 면으로</b>, <b>▮ 좁은 면으로</b> 버튼을 차례로 눌러요. 벽돌을 직접 끌어서 놓아도 돼요.',
            setup() { if (S.scene === 'block' && S.bstate === 'held') showHint(SCENE_HINT.block, 6000); },
            check: () => S.tried.wide && S.tried.narrow,
            status: () => '넓은 면으로 놓기 <b>' + mark(S.tried.wide) + '</b> · 좁은 면으로 놓기 <b>' + mark(S.tried.narrow) + '</b>',
            hold: 0.3,
            explain: '벽돌의 무게(누르는 힘)는 같은데, <b>좁은 면</b>으로 놓았을 때 눈이 더 깊이 눌렸어요. 같은 힘이 좁은 면적에 모여서 작용했기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '더 깊이 눌린 까닭',
            goal: '같은 벽돌인데 <b>좁은 면</b>으로 놓았을 때 눈이 더 깊이 눌린 까닭은?',
            choices: ['벽돌이 더 무거워졌기 때문', '같은 힘이 더 좁은 면적에 작용해 압력이 커졌기 때문', '눈이 더 부드러워졌기 때문', '넓은 면으로 놓으면 힘이 사라지기 때문'],
            answer: 1,
            feedback: ['같은 벽돌이에요. 무게(누르는 힘)는 그대로예요.', '', '같은 눈이에요. 달라진 것은 눈에 닿는 면적이에요.', '힘은 사라지지 않아요. 넓은 면적에 나뉘어 작용할 뿐이에요.'],
            explain: '<b>압력</b>은 일정한 면적에 수직으로 작용하는 힘이에요. 같은 힘이라도 <b>면적이 좁을수록 압력이 커요</b>. 설피는 발이 닿는 면적을 넓혀 압력을 작게 하므로 눈에 덜 빠져요.',
          },
          {
            type: 'quiz',
            title: '생활 속 압력',
            goal: '다음 중 면적을 <b>넓혀서 압력을 작게</b> 한 예는?',
            choices: ['칼날을 얇고 날카롭게 간다', '못의 끝을 뾰족하게 만든다', '눈썰매의 바닥을 넓게 만든다', '하이힐의 굽을 가늘게 만든다'],
            answer: 2,
            feedback: ['칼날은 면적을 좁혀 압력을 크게 해서 잘 잘리게 한 예예요.', '못 끝은 면적을 좁혀 압력을 크게 해서 잘 박히게 한 예예요.', '', '가는 굽은 면적이 좁아 압력이 커요. 그래서 하이힐 굽은 잔디나 눈에 쉽게 박혀요.'],
            explain: '면적을 <b>좁히면</b> 압력이 커지고(칼날, 못 끝, 하이힐 굽), 면적을 <b>넓히면</b> 압력이 작아져요(눈썰매, 설피, 넓은 가방끈).',
          },
        ],
      },
      {
        title: '기체 입자의 운동', short: '입자 운동', icon: '🫧', phase: '관찰',
        features: ['track'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력은 일정한 면적에 수직으로 작용하는 힘이라는 것을 알았어요.</div>' +
          '<p>눈에 보이지 않는 <b>기체</b>도 압력을 나타낼까요? 먼저 밀폐된 용기 속 <b>기체 입자</b>가 어떻게 움직이는지 관찰해 봐요.</p>',
        setup() { setScene('box', true); },
        recap: '기체 입자는 <b>모든 방향으로 끊임없이</b> 움직이며 용기 벽에 부딪혀요. 입자 사이는 <b>빈 공간</b>이에요.',
        summary: '<ul><li>기체는 매우 작은 <b>입자</b>로 이루어져 있다.</li>' +
          '<li>기체 입자는 <b>모든 방향으로 끊임없이</b> 움직이며 용기의 벽에 부딪힌다.</li>' +
          '<li>입자와 입자 사이는 <b>빈 공간</b>이다.</li></ul>',
        missions: [
          {
            title: '입자 하나를 따라가 보자',
            goal: '움직이는 입자 하나를 <b>눌러</b> 주황색으로 표시하고, 그 입자가 <b>위·아래·왼쪽·오른쪽</b> 벽에 모두 부딪힐 때까지 지켜보세요.',
            hint: '파란 입자를 손가락으로 누르거나, <b>🔍 입자 따라가기</b> 버튼을 눌러요.',
            check: () => S.track >= 0 && ['top', 'bottom', 'left', 'right'].every((k) => S.trackWalls[k]),
            status: () => S.track < 0 ? '아직 입자를 고르지 않았어요.' :
              '부딪힌 벽: ' + ['top', 'bottom', 'left', 'right'].map((k) => WALL_KO[k] + ' <b>' + mark(S.trackWalls[k]) + '</b>').join(' · '),
            hold: 0,
            explain: '입자는 멈추지 않고 곧게 날아가다 벽에 부딪히면 튕겨 나와 다른 방향으로 움직여요. 기체 입자는 <b>모든 방향으로 끊임없이</b> 움직여요.',
          },
          {
            type: 'quiz',
            title: '입자 사이에는 무엇이?',
            goal: '기체 입자와 입자 사이의 공간에는 무엇이 있을까요?',
            choices: ['공기', '아무것도 없는 빈 공간', '물', '아주 작은 먼지'],
            answer: 1,
            feedback: ['공기가 바로 기체 입자들이에요! 입자 사이에 또 공기가 있을까요?', '', '용기 속에는 기체만 들어 있어요.', '입자 사이에는 다른 물질이 없어요.'],
            explain: '입자와 입자 사이는 <b>빈 공간</b>이에요. 기체 입자는 빈 공간을 지나 <b>모든 방향으로 끊임없이</b> 움직이며 용기 벽에 부딪혀요.',
          },
        ],
      },
      {
        title: '입자의 충돌과 기체의 압력', short: '충돌과 압력', icon: '💥', phase: '설명',
        features: ['hits', 'gauge', 'pump'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체 입자가 끊임없이 움직이며 벽에 부딪히는 것을 봤어요.</div>' +
          '<p>이번에는 상자의 벽을 얇은 <b>고무막</b>으로 바꾸고 <b>압력계</b>를 연결했어요. 입자가 벽에 부딪힐 때 벽에 어떤 일이 생기는지 살펴봐요.</p>',
        setup() { setScene('membrane', true); },
        recap: '기체의 압력은 입자가 벽에 <b>충돌</b>하여 생기고 <b>모든 방향</b>으로 작용해요. 충돌 횟수가 많을수록 압력이 커요.',
        summary: '<p><b>기체의 압력</b>: 기체 입자가 용기 벽에 <b>충돌</b>하여 일정한 면적에 가하는 힘</p>' +
          '<ul><li>기체 입자는 모든 방향으로 움직이므로 기체의 압력은 <b>모든 방향으로</b> 작용한다.</li>' +
          '<li>벽에 부딪히는 <b>충돌 횟수가 많을수록</b> 기체의 압력이 크다.</li></ul>',
        missions: [
          {
            title: '벽을 미는 입자들',
            goal: '💥 충돌 표시를 보며 입자가 <b>네 벽</b>에 각각 <b>20번</b> 이상 부딪힐 때까지 관찰해 보세요. 고무막은 어느 쪽으로 부풀었나요?',
            hint: '그냥 지켜보기만 하면 돼요. 벽 바깥의 숫자와 고무막의 모양을 살펴보세요.',
            setup() { resetRates(); },
            check: () => S.scene === 'membrane' && ['top', 'bottom', 'left', 'right'].every((k) => S.cum[k] >= 20),
            status: () => '지금까지 부딪힌 횟수: ' + ['top', 'bottom', 'left', 'right'].map((k) => WALL_KO[k] + ' <b>' + Math.min(20, S.cum[k]) + '</b>').join(' · '),
            hold: 0,
            explain: '입자는 위·아래·옆 <b>모든 방향</b>의 벽에 고르게 부딪혀요. 부딪힐 때마다 벽을 바깥으로 밀어서 고무막이 <b>모든 방향으로 똑같이</b> 부풀어요. 이렇게 기체 입자가 벽에 충돌하여 <b>일정한 면적에 가하는 힘</b>이 <b>기체의 압력</b>이에요.',
          },
          {
            title: '공기를 더 넣어라!',
            goal: '<b>🫧 공기 넣기</b>로 입자 수를 늘려 압력계 바늘이 <b>빨간 구간</b>까지 올라가게 해 보세요. 충돌 횟수도 살펴보세요.',
            hint: '공기 넣기 버튼(또는 화면 속 펌프)을 여러 번 눌러요.',
            check: () => S.scene === 'membrane' && pressure() >= 2 && S.needle >= 1.97,
            status: () => '입자 <b>' + parts.length + '개</b> · 벽에 부딪히는 횟수 <b>' + fmt(totalRate(), 0) + '회/초</b> · 압력 <b>' + fmt(S.needle, 2) + ' 기압</b>',
            hold: 0.6,
            explain: '입자 수가 많아지자 벽에 부딪히는 <b>충돌 횟수</b>가 늘어나 압력계 바늘이 올라가고, 고무막도 더 크게 부풀었어요.',
          },
          {
            type: 'quiz',
            title: '압력이 커진 까닭',
            goal: '상자에 공기를 더 넣었을 때 기체의 압력이 커진 까닭은?',
            choices: ['입자 하나하나의 크기가 커졌기 때문', '벽에 부딪히는 입자의 충돌 횟수가 많아졌기 때문', '입자들이 멈춰서 벽에 달라붙었기 때문', '입자들이 한쪽 벽으로만 몰렸기 때문'],
            answer: 1,
            feedback: ['화면 속 입자의 크기는 그대로였어요!', '', '입자는 멈추지 않고 계속 움직였어요.', '입자는 모든 방향의 벽에 고르게 부딪혔어요.'],
            explain: '기체의 압력은 입자가 벽에 <b>충돌</b>하여 생겨요. 일정한 면적에 부딪히는 입자가 많을수록(충돌 횟수가 많을수록) 압력이 커져요.',
          },
        ],
      },
      {
        title: '생활 속 기체의 압력', short: '적용', icon: '🎈', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체의 압력은 입자의 충돌로 생기고, 모든 방향으로 작용한다는 것을 알았어요.</div>' +
          '<p>이제 풍선에 공기를 넣어 보고, 생활 속 현상을 기체 입자의 운동으로 설명해 봐요.</p>',
        setup() { setScene('balloon', true); },
        recap: '풍선이 둥글게 부풀고 타이어가 단단해지는 것은 기체 입자의 <b>충돌</b>로 생기는 압력 때문이에요.',
        summary: '<ul><li><b>풍선</b>: 기체 입자가 풍선 안쪽 벽에 모든 방향으로 충돌 → 압력이 모든 방향으로 작용 → 둥글게 부푼다.</li>' +
          '<li><b>자전거 타이어</b>: 공기를 넣으면 입자 수가 많아져 충돌 횟수 증가 → 압력이 커져 단단해진다.</li>' +
          '<li>축구공, 에어 매트, 튜브도 기체의 압력을 이용한다.</li></ul>',
        missions: [
          {
            title: '풍선 부풀리기',
            goal: '<b>🫧 공기 넣기</b>로 풍선을 <b>초록 점선</b> 크기까지 부풀려 보세요. 풍선이 어떤 모양으로 부푸는지 살펴보세요.',
            hint: '공기 넣기 버튼(또는 화면 속 펌프)을 여러 번 눌러요.',
            setup() { S.targetR = rBalloon(60); },
            check: () => S.scene === 'balloon' && parts.length >= 60 && S.br >= S.targetR - 3,
            status: () => '입자 <b>' + parts.length + '개</b> · 풍선 지름 <b>' + fmt(S.br * 2 / 10, 0) + ' cm</b>',
            hold: 0.5,
            explain: '공기를 넣을수록 풍선 속 입자 수가 많아져 고무막 안쪽에 부딪히는 입자가 많아지고, 풍선이 점점 커졌어요. 풍선이 한쪽으로만 늘어났나요, 둥글게 부풀었나요?',
          },
          {
            type: 'quiz',
            title: '풍선은 왜 둥글까?',
            goal: '풍선에 공기를 넣으면 한쪽으로만 늘어나지 않고 <b>둥글게</b> 부풀어요. 그 까닭은?',
            choices: ['기체 입자가 위쪽으로만 움직이기 때문', '기체 입자가 모든 방향으로 충돌해 압력이 모든 방향으로 작용하기 때문', '풍선 고무가 원래 공 모양이기 때문', '기체 입자가 풍선 고무에 달라붙기 때문'],
            answer: 1,
            feedback: ['풍선 속 입자들은 위·아래·옆 모든 방향으로 움직였어요.', '', '바람 빠진 풍선은 납작해요. 무엇이 고무를 밀어 둥글게 만들까요?', '입자는 달라붙지 않고 부딪힌 뒤 튕겨 나와요.'],
            explain: '풍선 속 기체 입자가 풍선 안쪽 벽에 <b>모든 방향으로 고르게</b> 충돌해요. 그래서 기체의 압력이 모든 방향으로 작용해 풍선이 <b>둥글게</b> 부풀어요.',
          },
          {
            type: 'quiz',
            title: '단단해진 자전거 타이어',
            goal: '바람이 빠진 자전거 타이어에 공기를 넣으면 타이어가 단단해져요. 그 까닭은?',
            figure: '<div style="font-size:44px">🚲 + 🫧 → 💪</div>',
            choices: ['타이어 속 기체 입자의 크기가 커지기 때문', '타이어 속 입자 수가 많아져 안쪽 벽에 충돌하는 횟수가 많아지기 때문', '타이어 속 기체 입자가 움직이지 않게 되기 때문', '타이어 고무가 두꺼워지기 때문'],
            answer: 1,
            feedback: ['입자의 크기는 변하지 않아요!', '', '기체 입자는 언제나 끊임없이 움직여요.', '고무의 두께는 그대로예요. 안에서 무엇이 달라졌을까요?'],
            explain: '공기를 넣으면 입자 수가 많아져 타이어 안쪽 벽에 부딪히는 <b>충돌 횟수가 많아지므로</b> 기체의 압력이 커져 타이어가 단단해져요. 축구공, 에어 매트도 같은 원리예요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  if (!S.scene) setScene(LEVEL_SCENE[game.level] || 'block');
  refreshUI();
  SciSim.loop((dt, t) => {
    if (S.scene === 'block') stepBlock(dt); else stepGas(dt);
    view.clear(S.scene === 'block' ? SKY : '#ffffff');
    if (S.scene === 'block') drawBlockScene();
    else if (S.scene === 'box') drawBoxScene();
    else if (S.scene === 'membrane') drawMembraneScene();
    else drawBalloonScene();
    updateReadouts(t);
  });
})();
