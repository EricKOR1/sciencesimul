/* =========================================================
   중1 Ⅵ. 기체의 성질 — 기체의 압력 [9과06-01]
   ① [관찰] 압력의 뜻 (같은 벽돌을 넓은 면/좁은 면으로 눈 위에)
   ② [관찰] 기체 입자의 운동 (입자 하나 따라가기, 빈 공간)
   ③ [설명] 입자의 충돌과 기체의 압력 (고무막 상자 + 압력계 + 펌프)
   ④ [적용] 생활 속 기체의 압력 (풍선, 자전거 타이어)
   ※ 정성적 설명에 주안점: 계산·예측 미션 없음
   ※ 그림은 assets/js/anim.js(애니메이션 도구)로 그림: 광택 입자, 유리 용기, 부드러운 움직임, 성공 효과
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease, ap = SciSim.approach;
  const now = () => performance.now() / 1000;
  const rand = (a, b) => a + Math.random() * (b - a);

  const BG = '#eef3fb';
  const sprites = makeSprites();
  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: BG, onResize: (v) => sprites.setScale(v.scale * v.dpr) });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 눈가루·공기 방울·성공 효과
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const LEVEL_SCENE = ['block', 'box', 'membrane', 'balloon'];

  /* ---------- 입자 그림(광택 구)을 미리 그려 두기: 매 프레임 그라데이션을 만들지 않도록 ---------- */
  function makeSprites() {
    const cache = new Map();
    let k = 2;
    function sphere(color, r) {
      const pad = Math.ceil(r * 0.7) + 2, size = 2 * (r + pad);
      const cv = document.createElement('canvas');
      cv.width = cv.height = Math.max(4, Math.ceil(size * k));
      const c = cv.getContext('2d');
      c.setTransform(k, 0, 0, k, 0, 0);
      const x = size / 2, y = size / 2;
      c.save();
      c.shadowColor = 'rgba(25,35,70,.30)'; c.shadowBlur = r * 0.55 * k; c.shadowOffsetY = r * 0.22 * k;
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, shade(color, 0.6)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.32));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.restore();
      if (r > 3) {
        c.fillStyle = 'rgba(255,255,255,.6)';
        c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.42, r * 0.33, r * 0.19, -0.6, 0, TAU); c.fill();
      }
      return { cv, size };
    }
    function glow(color, r) {
      const size = r * 2;
      const cv = document.createElement('canvas');
      cv.width = cv.height = Math.max(4, Math.ceil(size * k));
      const c = cv.getContext('2d');
      c.setTransform(k, 0, 0, k, 0, 0);
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, rgba(color, 0.55)); g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g; c.fillRect(0, 0, size, size);
      return { cv, size };
    }
    return {
      setScale(s) { const nk = clamp(Math.ceil(s * 2) / 2, 1, 4); if (nk !== k) { k = nk; cache.clear(); } },
      draw(color, x, y, r, base) {
        const R = base || Math.max(2, Math.round(r));
        const key = color + '|' + R;
        let sp = cache.get(key);
        if (!sp) { sp = sphere(color, R); cache.set(key, sp); }
        const s = sp.size * (r / R);
        ctx.drawImage(sp.cv, x - s / 2, y - s / 2, s, s);
      },
      glow(color, x, y, r) {
        const key = 'g' + color + '|' + Math.round(r);
        let sp = cache.get(key);
        if (!sp) { sp = glow(color, Math.round(r)); cache.set(key, sp); }
        ctx.drawImage(sp.cv, x - sp.size / 2, y - sp.size / 2, sp.size, sp.size);
      },
    };
  }
  /* 움직이지 않는 배경은 한 번만 그려 두고 다시 쓰기 */
  function makeLayer(w, h, paint, edge) {
    let cv = null, k = 0;
    return {
      draw() {
        const s = clamp(Math.ceil(view.scale * view.dpr * 2) / 2, 1, 3);
        if (!cv || s !== k) {
          k = s; cv = document.createElement('canvas');
          cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
          const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
          paint(c, SciSim.draw(c));
          if (edge) {   // 가장자리를 바깥 배경색과 이어지게
            const n = 40;
            [[0, 0, 0, n, 0, 0, w, n], [0, h, 0, h - n, 0, h - n, w, n], [0, 0, n, 0, 0, 0, n, h], [w, 0, w - n, 0, w - n, 0, n, h]].forEach((e) => {
              const g = c.createLinearGradient(e[0], e[1], e[2], e[3]);
              g.addColorStop(0, edge); g.addColorStop(1, rgba(edge, 0));
              c.fillStyle = g; c.fillRect(e[4], e[5], e[6], e[7]);
            });
          }
        }
        ctx.drawImage(cv, 0, 0, w, h);
      },
    };
  }
  function newBadge(x, y) {
    const a = 0.6 + 0.4 * Math.sin(now() * 6);
    ctx.save(); ctx.globalAlpha = a;
    D.label(x, y, 'NEW', { bg: '#8b5cf6', size: 13 });
    ctx.restore();
  }
  /* 새 도구 둘레에서 맥박 치는 네모 고리 + NEW 이름표 (도구를 가리지 않게 바깥에 그림) */
  function newRect(x, y, w, h, t, color) {
    const k = (t * 1.2) % 1, c = color || '#8b5cf6', g = 4 + k * 10;
    ctx.save();
    ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 3.5;
    D.roundRect(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.strokeStyle = rgba(c, 0.55 * (1 - k)); ctx.lineWidth = 3;
    D.roundRect(x - 6 - g, y - 6 - g, w + 12 + 2 * g, h + 12 + 2 * g, 16 + g); ctx.stroke();
    ctx.restore();
    newBadge(x + w - 14, y - 8);
  }
  /* 성공 효과: 폭죽 + 체크 */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 22, colors: ['#8b5cf6', '#14a058', '#ffb400', '#3867f4', '#ec4899'], speed: 190 });
    checks.push({ x, y, t0: now() });
  }
  function drawChecks(t) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i], e = t - c.t0;
      if (e > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = e > 1.3 ? 1 - (e - 1.3) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, e / 0.35));
      ctx.translate(c.x, c.y - 10 * ease.outCubic(Math.min(1, e / 0.6))); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, e / 0.5));
      ctx.restore();
    }
  }
  /* 여러 개의 이름표를 한 줄로 이어 붙이기 */
  function captions(items) {
    let x = 16;
    items.forEach((it) => {
      const r = D.label(x, 30, it.text, { align: 'left', bg: it.bg || 'rgba(255,255,255,.88)', color: it.color || '#3a4456', size: 13, border: it.border });
      x = r.x + r.w + 8;
    });
  }
  /* 🔍 돋보기 테두리 + 손잡이 (x, y, w, h = 안쪽 상자) */
  function lensRim(x, y, w, h, rad, t) {
    const o = 9;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#c4b5fd'); g.addColorStop(0.5, '#7c3aed'); g.addColorStop(1, '#4c1d95');
    ctx.save();
    ctx.strokeStyle = g; ctx.lineWidth = 5;
    D.roundRect(x - o, y - o, w + o * 2, h + o * 2, rad + o); ctx.stroke();
    ctx.lineCap = 'round';
    const hx = x + w + o - 4, hy = y + h + o - 4;
    ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(hx + 6, hy + 6); ctx.lineTo(hx + 44, hy + 44); ctx.stroke();
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(hx + 6, hy + 6); ctx.lineTo(hx + 44, hy + 44); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 상태 ---------- */
  const S = {
    scene: '', sceneT: 0,
    // 벽돌과 눈
    orient: 'wide', bx: 400, bxT: 400, by: 200, bvy: 0, bstate: 'held', sink: 0,
    vw: 216, vh: 78, lift: 0, sq: new SciSim.Spring(0, { stiffness: 320, damping: 13 }),
    tried: { wide: false, narrow: false }, dents: {},
    drag: null,
    // 기체 입자
    track: -1, trackWalls: {}, trackHits: 0, trail: [],
    showHits: true,
    rate: { top: [], bottom: [], left: [], right: [] },
    shown: { top: 0, bottom: 0, left: 0, right: 0 },       // 화면에 부드럽게 보이는 충돌 횟수
    kick: { top: 0, bottom: 0, left: 0, right: 0 },          // 고무막이 부딪힌 순간 출렁이는 정도
    cum: { top: 0, bottom: 0, left: 0, right: 0 },
    flashes: [],
    needle: 1, needleSp: new SciSim.Spring(1, { stiffness: 150, damping: 12 }), bulge: 8,
    arrowL: 24,
    br: 70, targetR: 0, bpulse: 0,
    pump: { k: 0 },
    air: [],                // 호스 속을 흐르는 공기 방울
    shake: 0,
    k: { gauge: 0, pump: 0, hits: 0 },   // 새 도구가 나타나는 정도 (0~1)
    winPulse: 0,
  };

  /* =========================================================
     ① 벽돌과 눈
     ========================================================= */
  const SNOW = { x0: 40, x1: 760, y: 372, bottom: 502 };
  const SKY = '#d6e9ff';
  const BRICK = { wide: { w: 216, h: 78 }, narrow: { w: 72, h: 216 } };
  const DEPTH = { wide: 10, narrow: 30 };          // 눈이 눌리는 깊이(px) — 같은 힘, 면적이 좁을수록 깊게
  const STATION = { wide: 230, narrow: 570 };
  const PX_PER_CM = 5;
  const dent = new Float32Array(SNOW.x1 - SNOW.x0 + 1);
  const FLAKES = [];
  for (let i = 0; i < 34; i++) FLAKES.push({ x: rand(0, 800), y: rand(0, 372), v: rand(14, 34), r: rand(1.2, 2.8), ph: rand(0, 6) });
  const SPECKS = [];     // 벽돌 표면 무늬 (고정)
  for (let i = 0; i < 34; i++) SPECKS.push({ u: Math.random(), v: Math.random(), a: Math.random() < 0.5 ? 1 : 0 });
  const SPARK = [];      // 눈 반짝임 (고정 위치)
  for (let i = 0; i < 26; i++) SPARK.push({ x: rand(SNOW.x0 + 8, SNOW.x1 - 8), y: rand(SNOW.y + 14, SNOW.bottom - 10), ph: rand(0, 6) });

  const blockBG = makeLayer(800, 520, (c, d) => {
    const g = c.createLinearGradient(0, 0, 0, 380);
    g.addColorStop(0, '#bfdcff'); g.addColorStop(1, '#eef6ff');
    c.fillStyle = g; c.fillRect(0, 0, 800, 520);
    c.fillStyle = '#e1eefc'; c.fillRect(0, 372, 800, 148);
    // 해(왼쪽 위 빛)
    d.glow(70, 44, 150, '#fff3c4', 0.75);
    d.glow(70, 44, 36, '#fffbe8', 0.95);
    // 먼 산
    c.fillStyle = '#d9e8fb';
    c.beginPath(); c.moveTo(0, 372); c.lineTo(0, 300); c.lineTo(90, 262); c.lineTo(170, 306); c.lineTo(270, 236); c.lineTo(380, 316); c.lineTo(470, 276); c.lineTo(580, 326); c.lineTo(680, 250); c.lineTo(800, 312); c.lineTo(800, 372); c.closePath(); c.fill();
    c.fillStyle = '#e9f2fd';
    c.beginPath(); c.moveTo(0, 372); c.lineTo(0, 330); c.lineTo(130, 306); c.lineTo(250, 340); c.lineTo(400, 322); c.lineTo(540, 346); c.lineTo(700, 312); c.lineTo(800, 338); c.lineTo(800, 372); c.closePath(); c.fill();
    // 구름
    [[470, 84, 1], [690, 130, 0.8]].forEach(([cx, cy, s]) => {
      c.fillStyle = 'rgba(255,255,255,.8)';
      [[0, 0, 34], [30, 6, 26], [-30, 8, 24], [8, 12, 30]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(cx + dx * s, cy + dy * s, r * s, 0, TAU); c.fill(); });
    });
  }, SKY);
  const gasBG = makeLayer(800, 520, (c, d) => {
    c.fillStyle = BG; c.fillRect(0, 0, 800, 520);
    d.glow(140, 80, 360, '#ffffff', 0.95);
    // 은은한 점 무늬
    c.fillStyle = 'rgba(140,160,190,.14)';
    for (let x = 20; x < 800; x += 36) for (let y = 20; y < 520; y += 36) { c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); }
  }, BG);

  function resetBlock() {
    dent.fill(0);
    S.dents = {}; S.tried = { wide: false, narrow: false };
    S.orient = 'wide'; S.bx = S.bxT = 400; S.by = 250; S.bvy = 0; S.bstate = 'held'; S.sink = 0; S.drag = null;
    S.vw = BRICK.wide.w; S.vh = BRICK.wide.h; S.lift = 0; S.sq.value = 0; S.sq.velocity = 0;
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
  /* 벽돌이 눈에 닿을 때 눈가루가 튀어 오르는 효과 */
  function puff(x, y, w, n) {
    if (RM) return;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      FX.emit({ x: x + side * rand(0.1, 0.5) * w, y: y - 2, vx: side * rand(30, 110), vy: -rand(30, 90), life: rand(0.5, 0.9), size: rand(7, 12), color: '#f4f9ff', shape: 'smoke', gravity: 40, drag: 2, grow: 12 });
      if (i % 3 === 0) FX.emit({ x: x + side * rand(0, 0.5) * w, y: y - 4, vx: side * rand(40, 120), vy: -rand(80, 170), life: 0.7, size: 2.4, color: '#bfe0ff', shape: 'star', gravity: 300, drag: 1, rot: rand(0, 6), vr: rand(-6, 6) });
    }
  }
  function dropBlock(orient, x) {
    const was = S.bstate;
    S.orient = orient;
    S.bx = x != null ? x : S.bx;
    S.bxT = x != null ? x : STATION[orient];
    clampBx();
    const wasX = S.bx; S.bx = S.bxT; clampBx(); S.bxT = S.bx; S.bx = wasX;   // 목표 x는 눈 안쪽으로
    if (was === 'rest' || was === 'sink') { S.bvy = -640; }                  // 통 튀어 올랐다가 새 자리로
    else { S.by = Math.min(S.by, SNOW.y - 60); S.bvy = 0; }
    S.by = Math.max(S.by, BRICK[orient].h + 16);
    S.bstate = 'air'; S.drag = null;
    updateFaceBtns();
  }
  function stepBlock(dt) {
    const d = BRICK[S.orient];
    S.vw = ap(S.vw, d.w, dt, 14); S.vh = ap(S.vh, d.h, dt, 14);
    S.lift = ap(S.lift, S.drag && S.drag.moved ? 1 : 0, dt, 14);
    S.sq.update(dt);
    if (S.bstate === 'held') return;
    if (S.bstate === 'air') {
      S.bx = ap(S.bx, S.bxT, dt, 11);
      S.bvy += 2200 * dt; S.by += S.bvy * dt;
      const base = minDentUnder(S.bx, d.w);
      const contact = SNOW.y + base;
      if (S.bvy > 0 && S.by >= contact) {
        const hitV = S.bvy;
        S.by = contact; S.bvy = 0; S.sink = base;
        S.sq.velocity = Math.min(9, hitV / 120);
        puff(S.bx, SNOW.y + base, d.w, 6);
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
    S.dents[S.orient] = { x: S.bx, w: d.w, depth: DEPTH[S.orient], t0: now() };
    puff(S.bx, SNOW.y + S.sink, d.w, 8);
    Sound.click();
  }

  function drawBlockScene(t, dt) {
    blockBG.draw();
    // 내리는 눈 (장식)
    if (!RM) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath();
      for (let i = 0; i < FLAKES.length; i++) {
        const f = FLAKES[i];
        f.y += f.v * dt; f.x += Math.sin(t * 0.8 + f.ph) * 8 * dt;
        if (f.y > SNOW.y - 4) { f.y = -6; f.x = rand(0, 800); }
        ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, TAU);
      }
      ctx.fill();
    }
    // 안내
    D.text(22, 30, '⚖️ 벽돌의 무게(누르는 힘)는 언제나 같아요', { size: 14, weight: 800, color: '#34405a', align: 'left', stroke: 'rgba(255,255,255,.9)', strokeWidth: 5 });
    D.text(22, 52, '⬇ 주황 화살표: 벽돌이 눈의 각 부분을 누르는 정도(압력)', { size: 13, weight: 800, color: '#c2410c', align: 'left', stroke: 'rgba(255,255,255,.9)', strokeWidth: 5 });

    // 눈
    ctx.beginPath();
    ctx.moveTo(SNOW.x0, SNOW.bottom - 16);
    ctx.lineTo(SNOW.x0, SNOW.y + dent[0]);
    for (let x = SNOW.x0; x <= SNOW.x1; x += 2) ctx.lineTo(x, SNOW.y + dent[x - SNOW.x0]);
    ctx.lineTo(SNOW.x1, SNOW.bottom - 16); ctx.quadraticCurveTo(SNOW.x1, SNOW.bottom, SNOW.x1 - 16, SNOW.bottom); ctx.lineTo(SNOW.x0 + 16, SNOW.bottom); ctx.quadraticCurveTo(SNOW.x0, SNOW.bottom, SNOW.x0, SNOW.bottom - 16); ctx.closePath();
    D.shadow(() => { ctx.fillStyle = '#e3eefb'; ctx.fill(); }, { blur: 14, y: -2, color: 'rgba(80,120,170,.25)' });
    const sg = ctx.createLinearGradient(0, SNOW.y, 0, SNOW.bottom);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#eaf3fd'); sg.addColorStop(1, '#cfe1f6');
    ctx.fillStyle = sg; ctx.fill();
    // 눈 반짝임
    ctx.fillStyle = '#fff';
    for (let i = 0; i < SPARK.length; i++) {
      const s = SPARK[i];
      const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph);
      if (s.y < SNOW.y + dent[clamp(Math.round(s.x) - SNOW.x0, 0, dent.length - 1)] + 6) continue;
      ctx.globalAlpha = 0.25 + 0.55 * k;
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.3 + k * 0.9, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 눈 표면선(눌린 곳의 안쪽 그림자 포함)
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(110,150,200,.28)'; ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = SNOW.x0; x <= SNOW.x1; x += 2) { const y = SNOW.y + dent[x - SNOW.x0] + 3; x === SNOW.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = '#9dbbe0'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = SNOW.x0; x <= SNOW.x1; x += 2) { const y = SNOW.y + dent[x - SNOW.x0]; x === SNOW.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    D.text(SNOW.x0 + 8, SNOW.bottom - 10, '❄ 푹신한 눈', { size: 14, weight: 800, color: '#6f8fb8', align: 'left' });

    // 눌린 자국 표시 (처음 눈 높이 + 깊이)
    ['wide', 'narrow'].forEach((o) => {
      const dd = S.dents[o];
      if (!dd) return;
      const col = o === 'wide' ? '#2f5be3' : '#d9480f';
      const e = Math.min(1, (t - dd.t0) / 0.5), ek = ease.outCubic(e);
      ctx.save();
      ctx.globalAlpha = ek;
      D.dashedLine(dd.x - dd.w / 2 - 14, SNOW.y, dd.x + dd.w / 2 + 14, SNOW.y, { color: '#7f9bbf', width: 1.8, dash: [5, 4] });
      const lx = dd.x + dd.w / 2 + 12;
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx - 5, SNOW.y); ctx.lineTo(lx + 5, SNOW.y); ctx.moveTo(lx, SNOW.y); ctx.lineTo(lx, SNOW.y + dd.depth * ek); ctx.moveTo(lx - 5, SNOW.y + dd.depth * ek); ctx.lineTo(lx + 5, SNOW.y + dd.depth * ek); ctx.stroke();
      ctx.translate(0, (1 - ek) * 8);
      D.label(dd.x, SNOW.y + 92, o === 'wide' ? '넓은 면으로 놓은 자국' : '좁은 면으로 놓은 자국', { bg: col, size: 14 });
      D.text(dd.x, SNOW.y + 120, '깊이 약 ' + Math.round(dd.depth / PX_PER_CM) + ' cm · ' + (o === 'wide' ? '얕게 눌림' : '깊게 눌림'), { size: 14, weight: 800, color: '#2a3550' });
      ctx.restore();
    });

    drawBrick(t);
  }

  function drawBrick(t) {
    const d = BRICK[S.orient];
    const w = S.vw, h = S.vh;
    const airborne = S.bstate === 'held' || S.bstate === 'air' || S.bstate === 'drag';
    const bob = S.bstate === 'held' && !S.drag && !RM ? Math.sin(t * 3.2) * 3 : 0;
    const lift = S.lift;
    const x = S.bx, yb = S.by + bob;
    // 놓일 자리 안내 + 바닥 그림자
    if (airborne || S.drag) {
      const base = SNOW.y + minDentUnder(S.bx, d.w);
      const hgt = clamp((base - S.by) / 300, 0, 1);
      ctx.fillStyle = `rgba(40,70,120,${0.2 - hgt * 0.1})`;
      ctx.beginPath(); ctx.ellipse(S.bx, base + 2, d.w / 2 * (1 - hgt * 0.25), 6 + (1 - hgt) * 2, 0, 0, TAU); ctx.fill();
      if (S.drag && S.drag.moved) {
        ctx.save(); ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 8);
        D.dashedLine(S.bx - d.w / 2, base - 1, S.bx + d.w / 2, base - 1, { color: '#f26b3a', width: 3, dash: [8, 6], offset: t * 30 });
        ctx.restore();
      }
    }
    // 무게 화살표 (항상 같은 길이)
    const top = yb - h - lift * 4;
    if (top > 80) D.arrow(x, top - 70, x, top - 8, { color: '#55627c', width: 5, head: 14, label: '무게', labelColor: '#34405a' });
    // 몸체
    ctx.save();
    ctx.translate(x, yb);
    const sq = S.sq.value;
    ctx.scale(1 + 0.05 * sq + 0.045 * lift, 1 - 0.07 * sq + 0.045 * lift);
    const body = () => D.roundRect(-w / 2, -h, w, h, 7);
    if (airborne || lift > 0.02) D.shadow(() => { body(); ctx.fillStyle = '#b4492f'; ctx.fill(); }, { blur: 8 + lift * 18, y: 4 + lift * 12, color: 'rgba(40,20,10,.35)' });
    const g = ctx.createLinearGradient(-w / 2, -h, w / 2, 0);
    g.addColorStop(0, '#f09373'); g.addColorStop(0.5, '#d4603f'); g.addColorStop(1, '#a43d27');
    body(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); body(); ctx.clip();
    // 표면 무늬(반점)
    for (let i = 0; i < SPECKS.length; i++) {
      const s = SPECKS[i];
      ctx.fillStyle = s.a ? 'rgba(255,255,255,.16)' : 'rgba(70,15,5,.16)';
      ctx.fillRect(-w / 2 + s.u * w, -h + s.v * h, 2.6, 2.6);
    }
    // 벽돌 줄눈
    ctx.strokeStyle = 'rgba(255,235,225,.28)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (S.orient === 'wide') { ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.moveTo(-w / 6, -h); ctx.lineTo(-w / 6, -h / 2); ctx.moveTo(w / 4, -h / 2); ctx.lineTo(w / 4, 0); }
    else { ctx.moveTo(0, -h); ctx.lineTo(0, 0); }
    ctx.stroke();
    // 윗면·왼쪽 하이라이트, 아래·오른쪽 그늘
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 5, -6); ctx.lineTo(-w / 2 + 5, -h + 7); ctx.lineTo(w / 2 - 8, -h + 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,15,5,.28)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w / 2 - 3, -h + 8); ctx.lineTo(w / 2 - 3, -3); ctx.lineTo(-w / 2 + 8, -3); ctx.stroke();
    // 눈에 닿는 면 강조
    ctx.fillStyle = 'rgba(255,214,110,.96)';
    D.roundRect(-w / 2 + 2, -7, w - 4, 6, 3); ctx.fill();
    ctx.restore();
    if (S.drag && S.drag.moved) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; body(); ctx.stroke(); }
    D.text(0, -h / 2 + 5, '벽돌', { size: 15, weight: 800, color: '#fff', stroke: 'rgba(110,30,10,.55)', strokeWidth: 4 });
    ctx.restore();

    // 압력 화살표 (닿아 있을 때만; 길이는 눌린 깊이를 따라 부드럽게 자람)
    if (S.bstate === 'sink' || S.bstate === 'rest') {
      const L = 10 + S.sink * 0.95;
      const x0 = x - d.w / 2;
      for (let ax = x0 + 12; ax <= x0 + d.w - 11; ax += 20) D.arrow(ax, S.by + 4, ax, S.by + 4 + L, { color: '#f26b3a', width: 3, head: 9 });
    }
    // 들고 있을 때 안내
    if (S.bstate === 'held') {
      D.label(S.bx, S.by - h - 92 + bob, '✋ 끌어서 눈 위에 놓기', { bg: '#1b2333', size: 14 });
      if (isNew('block')) D.ring(S.bx, S.by - h / 2 + bob, d.w / 2 + 16, t, { color: '#8b5cf6' });
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
  const COL_P = '#3d6df2', COL_T = '#f26b3a';
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
    return Object.assign({ x, y, s: 1 }, randVel(sc));
  }
  function fill(n) { parts = []; for (let i = 0; i < n; i++) parts.push(makeParticle(S.scene)); }
  const HOSE = {
    membrane: { x0: 428, y0: 408, cx: 600, cy: 480, x1: 622, y1: 468 },
    balloon: { x0: BAL.cx, y0: BAL.neck + 4, cx: BAL.cx + 120, cy: 512, x1: 622, y1: 468 },
  };
  function addAir(n) {
    for (let i = 0; i < n; i++) {
      let p;
      if (S.scene === 'balloon') {
        const a = -Math.PI * (0.1 + Math.random() * 0.8), sp = SPD.balloon * (0.6 + Math.random() * 0.8);
        p = { x: BAL.cx + (Math.random() - 0.5) * 16, y: balloonCy() + S.br - 12 - Math.random() * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 0.2 };
      } else {
        const a = Math.PI + 0.1 + Math.random() * 1.4, sp = SPD.membrane * (0.6 + Math.random() * 0.8);
        p = { x: BOXM.x + BOXM.w - 12 - Math.random() * 8, y: BOXM.y + BOXM.h - 12 - Math.random() * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 0.2 };
      }
      parts.push(p);
    }
    if (!RM) for (let i = 0; i < 7 && S.air.length < 16; i++) S.air.push({ t: 1 + i * 0.07, dir: -1 });
  }
  function removeAir(n) {
    for (let i = 0; i < n && parts.length; i++) parts.pop();
    if (S.track >= parts.length) untrack();
    if (!RM) for (let i = 0; i < 6 && S.air.length < 16; i++) S.air.push({ t: -i * 0.07, dir: 1 });
  }
  function resetRates() {
    S.rate = { top: [], bottom: [], left: [], right: [] };
    S.cum = { top: 0, bottom: 0, left: 0, right: 0 };
    S.shown = { top: 0, bottom: 0, left: 0, right: 0 };
    S.rateT0 = performance.now();
  }
  function hit(wall, x, y) {
    const nw = performance.now();
    S.rate[wall].push(nw);
    S.cum[wall]++;
    S.kick[wall] = Math.min(1, S.kick[wall] + 0.22);
    if (S.showHits && on('hits') && S.flashes.length < 60) S.flashes.push({ x, y, t: nw });
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
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.s < 1) p.s = Math.min(1, p.s + dt * 3.2);
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
    }
  }
  function stepBalloon(dt) {
    const R = RAD.balloon;
    const prev = balloonCy();
    const target = rBalloon(parts.length);
    S.br += (target - S.br) * Math.min(1, dt * 3);
    const cy = balloonCy(), dy = cy - prev;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.s < 1) p.s = Math.min(1, p.s + dt * 3.2);
      p.y += dy;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const dx = p.x - BAL.cx, dyy = p.y - cy, d = Math.hypot(dx, dyy), lim = S.br - R - 2;
      if (d > lim && d > 0) {
        const nx = dx / d, ny = dyy / d, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; jitter(p, 0.5); hit(Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : (ny < 0 ? 'top' : 'bottom'), BAL.cx + nx * (S.br - 2), cy + ny * (S.br - 2)); }
        p.x = BAL.cx + nx * lim; p.y = cy + ny * lim;
      }
      if (i === S.track) { S.trail.push({ x: p.x, y: p.y }); if (S.trail.length > 150) S.trail.shift(); }
    }
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
    const nw = performance.now();
    for (const k in S.rate) {
      const a = S.rate[k]; let n = 0;
      while (n < a.length && nw - a[n] > RATE_WIN) n++;
      if (n) a.splice(0, n);
      S.kick[k] = ap(S.kick[k], 0, dt, 9);
      S.shown[k] = ap(S.shown[k], rateOf(k), dt, 5);
    }
    let w = 0;
    for (let i = 0; i < S.flashes.length; i++) if (nw - S.flashes[i].t < 380) S.flashes[w++] = S.flashes[i];
    S.flashes.length = w;
  }
  const rateOf = (w) => S.rate[w].length / (clamp(performance.now() - (S.rateT0 || 0), 800, RATE_WIN) / 1000);
  const totalRate = () => rateOf('top') + rateOf('bottom') + rateOf('left') + rateOf('right');

  /* 입자 그리기: 꼬리(속도) → 광택 구 → 따라가는 입자 강조 */
  function drawParticles(R, t) {
    ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = R * 0.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); }
    ctx.stroke();
    ctx.lineCap = 'butt';
    for (let i = 0; i < parts.length; i++) {
      if (i === S.track) continue;
      const p = parts[i];
      sprites.draw(COL_P, p.x, p.y, R * ease.outBack(p.s));
    }
    if (S.track >= 0 && parts[S.track]) {
      const p = parts[S.track];
      sprites.glow(COL_T, p.x, p.y, 30);
      sprites.draw(COL_T, p.x, p.y, R + 3);
      const k = (t * 1.4) % 1;
      ctx.strokeStyle = rgba(COL_T, 0.9); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 7, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(COL_T, 0.5 * (1 - k)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 7 + k * 12, 0, TAU); ctx.stroke();
    }
  }
  function drawTrail() {
    if (S.track < 0 || S.trail.length < 2) return;
    const n = S.trail.length;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (let tier = 0; tier < 3; tier++) {
      const a = Math.floor((n - 1) * tier / 3), b = Math.floor((n - 1) * (tier + 1) / 3) + 1;
      ctx.strokeStyle = 'rgba(242,107,58,' + (0.14 + tier * 0.2) + ')';
      ctx.beginPath();
      for (let i = a; i <= Math.min(b, n - 1); i++) i === a ? ctx.moveTo(S.trail[i].x, S.trail[i].y) : ctx.lineTo(S.trail[i].x, S.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawFlashes() {
    const nw = performance.now();
    ctx.lineWidth = 2.5;
    for (let i = 0; i < S.flashes.length; i++) {
      const f = S.flashes[i];
      const a = 1 - (nw - f.t) / 380;
      ctx.strokeStyle = `rgba(242,107,58,${a})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 12, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,190,120,${a * 0.45})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 2 + (1 - a) * 6, 0, TAU); ctx.fill();
    }
  }
  /* 호스 속 공기 방울 */
  function hosePt(h, u) {
    const v = 1 - u;
    return { x: v * v * h.x0 + 2 * v * u * h.cx + u * u * h.x1, y: v * v * h.y0 + 2 * v * u * h.cy + u * u * h.y1 };
  }
  function stepAir(dt) {
    for (let i = S.air.length - 1; i >= 0; i--) {
      const a = S.air[i];
      a.t += a.dir * dt * 1.5;
      if (a.t < -0.1 || a.t > 1.2) S.air.splice(i, 1);
    }
  }
  function drawHose(h, w) {
    ctx.save(); ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(h.x0, h.y0); ctx.quadraticCurveTo(h.cx, h.cy, h.x1, h.y1); };
    ctx.strokeStyle = 'rgba(40,60,90,.22)'; ctx.lineWidth = w + 3; ctx.save(); ctx.translate(0, 3); path(); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#7f8da3'; ctx.lineWidth = w; path(); ctx.stroke();
    ctx.strokeStyle = '#c9d3e1'; ctx.lineWidth = w * 0.4; ctx.save(); ctx.translate(0, -w * 0.18); path(); ctx.stroke(); ctx.restore();
    ctx.restore();
  }
  function drawAir(h) {
    for (let i = 0; i < S.air.length; i++) {
      const a = S.air[i];
      if (a.t < 0 || a.t > 1) continue;
      const q = hosePt(h, a.t);
      sprites.draw('#8fd0ff', q.x, q.y, 3.6, 4);
    }
  }

  /* ---- ② 밀폐된 용기 ---- */
  function drawJar(cx, cy, w, h) {
    ctx.save();
    // 병 + 뚜껑
    D.shadow(() => { D.roundRect(cx - w / 2, cy - h / 2 + 10, w, h - 10, 14); ctx.fillStyle = 'rgba(214,232,255,.8)'; ctx.fill(); }, { blur: 10, y: 4 });
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.25, 'rgba(200,225,255,.35)'); g.addColorStop(1, 'rgba(150,185,230,.5)');
    D.roundRect(cx - w / 2, cy - h / 2 + 10, w, h - 10, 14); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#9db6d6'; ctx.lineWidth = 3; ctx.stroke();
    const lg = ctx.createLinearGradient(0, cy - h / 2, 0, cy - h / 2 + 14);
    lg.addColorStop(0, '#aab6c8'); lg.addColorStop(1, '#7e8ba0');
    D.roundRect(cx - w / 2 + 6, cy - h / 2 - 2, w - 12, 16, 5); ctx.fillStyle = lg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 8, cy - h / 2 + 26); ctx.lineTo(cx - w / 2 + 8, cy + h / 2 - 14); ctx.stroke();
    ctx.restore();
  }
  function drawBoxScene(t) {
    gasBG.draw();
    const B = BOX2;
    // 🔍 확대 설명: 실제 병 → 돋보기 → 입자 모형
    const jx = 724, jy = 262;
    ctx.save();
    ctx.fillStyle = 'rgba(139,92,246,.09)';
    ctx.beginPath(); ctx.moveTo(jx - 24, jy - 22); ctx.lineTo(B.x + B.w + 9, B.y - 9); ctx.lineTo(B.x + B.w + 9, B.y + B.h + 9); ctx.lineTo(jx - 24, jy + 22); ctx.closePath(); ctx.fill();
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(jx - 24, jy - 22); ctx.lineTo(B.x + B.w + 9, B.y - 9); ctx.moveTo(jx - 24, jy + 22); ctx.lineTo(B.x + B.w + 9, B.y + B.h + 9); ctx.stroke();
    ctx.restore();
    drawJar(jx, jy, 64, 92);
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(jx, jy + 4, 25, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(jx + 18, jy + 22); ctx.lineTo(jx + 30, jy + 36); ctx.stroke(); ctx.lineCap = 'butt';
    D.text(jx, jy + 76, '병 속 공기', { size: 13, weight: 800, color: '#5d6879' });

    // 용기(유리)
    D.shadow(() => { D.roundRect(B.x, B.y, B.w, B.h, 14); ctx.fillStyle = '#f5f9ff'; ctx.fill(); }, { blur: 22, y: 8, color: 'rgba(40,60,110,.25)' });
    const ig = ctx.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
    ig.addColorStop(0, '#f9fbff'); ig.addColorStop(1, '#e6effc');
    D.roundRect(B.x, B.y, B.w, B.h, 14); ctx.fillStyle = ig; ctx.fill();
    ctx.save(); D.roundRect(B.x, B.y, B.w, B.h, 14); ctx.clip();
    drawTrail();
    drawParticles(RAD.box, t);
    drawFlashes();
    // 안쪽 그늘
    const sh = ctx.createLinearGradient(B.x, 0, B.x + 26, 0); sh.addColorStop(0, 'rgba(60,90,140,.12)'); sh.addColorStop(1, 'rgba(60,90,140,0)');
    ctx.fillStyle = sh; ctx.fillRect(B.x, B.y, 26, B.h);
    ctx.restore();
    // 유리 테두리 + 반사광
    ctx.strokeStyle = '#8397b3'; ctx.lineWidth = 7; D.roundRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; D.roundRect(B.x + 4, B.y + 4, B.w - 8, B.h - 8, 11); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.moveTo(B.x + 12, B.y + 12); ctx.lineTo(B.x + 120, B.y + 12); ctx.lineTo(B.x + 12, B.y + 170); ctx.closePath(); ctx.fill();
    lensRim(B.x, B.y, B.w, B.h, 14, t);
    // 따라가는 입자가 부딪힌 벽
    if (S.track >= 0) {
      const walls = [
        ['top', '위', B.x + B.w / 2, B.y - 30, B.x + 10, B.y - 3, B.x + B.w - 10, B.y - 3],
        ['bottom', '아래', B.x + B.w / 2, B.y + B.h + 32, B.x + 10, B.y + B.h + 3, B.x + B.w - 10, B.y + B.h + 3],
        ['left', '왼쪽', B.x - 52, B.y + B.h / 2, B.x - 3, B.y + 10, B.x - 3, B.y + B.h - 10],
        ['right', '오른쪽', B.x + B.w + 56, B.y + B.h / 2, B.x + B.w + 3, B.y + 10, B.x + B.w + 3, B.y + B.h - 10],
      ];
      walls.forEach(([k, name, lx, ly, ax, ay, bx, by]) => {
        const ok = !!S.trackWalls[k];
        if (ok) {
          ctx.save(); ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(20,160,88,.35)'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.strokeStyle = 'rgba(20,160,88,.95)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.restore();
        }
        D.label(lx, ly, (ok ? '✔ ' : '') + name, { bg: ok ? '#14a058' : '#e3e9f2', color: ok ? '#fff' : '#5d6879', size: 13 });
      });
    }
    captions([{ text: '🔒 밀폐된 용기 속 기체' }, { text: '🔍 입자 모형으로 보기', bg: '#5b21b6', color: '#fff' }]);
    if (isNew('track') && S.track < 0 && parts[0]) {
      D.ring(parts[0].x, parts[0].y, 20, t, { color: '#8b5cf6' }); newBadge(parts[0].x + 30, parts[0].y - 26);
    }
  }

  /* ---- ③ 고무막 상자 + 압력계 + 펌프 ---- */
  const GAUGE_M = { cx: 642, cy: 116, r: 84 };
  const PUMP = { x: 640, top: 330, base: 482 };
  function membranePath(B, bt, bb, bl, br) {
    const x0 = B.x, y0 = B.y, x1 = B.x + B.w, y1 = B.y + B.h, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, y0 - 2 * bt, x1, y0);
    ctx.quadraticCurveTo(x1 + 2 * br, cy, x1, y1);
    ctx.quadraticCurveTo(cx, y1 + 2 * bb, x0, y1);
    ctx.quadraticCurveTo(x0 - 2 * bl, cy, x0, y0);
    ctx.closePath();
  }
  /* 새로 열린 도구가 부드럽게 나타나도록: 중심을 기준으로 커지며 서서히 보이기 */
  function toolIn(k, cx, cy, fn) {
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.4);
    const s = 0.82 + 0.18 * ease.outBack(Math.min(1, k));
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
  }
  function drawMembraneScene(t) {
    gasBG.draw();
    const B = BOXM, b = S.bulge;
    const x0 = B.x, y0 = B.y, x1 = B.x + B.w, y1 = B.y + B.h, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const P = pressure();
    ctx.save();
    if (S.shake > 0.02) ctx.translate(Math.sin(t * 70) * 4 * S.shake, 0);
    // 관: 상자 → 압력계, 상자 → 펌프
    if (S.k.gauge > 0.01) {
      ctx.save(); ctx.globalAlpha = Math.min(1, S.k.gauge * 1.4);
      const h = { x0: x1 - 2, y0: y0 + 2, cx: (x1 + GAUGE_M.cx - GAUGE_M.r) / 2, cy: y0 + 2, x1: GAUGE_M.cx - GAUGE_M.r + 4, y1: y0 + 2 };
      drawHose(h, 8);
      ctx.restore();
    }
    if (S.k.pump > 0.01) { ctx.save(); ctx.globalAlpha = Math.min(1, S.k.pump * 1.4); drawHose(HOSE.membrane, 8); ctx.restore(); drawAir(HOSE.membrane); }
    // 안쪽(기체의 진하기)
    const bt = b + S.kick.top * 2.5, bb = b + S.kick.bottom * 2.5, bl = b + S.kick.left * 2.5, br = b + S.kick.right * 2.5;
    membranePath(B, bt, bb, bl, br);
    D.shadow(() => { ctx.fillStyle = '#f3f7ff'; ctx.fill(); }, { blur: 20, y: 7, color: 'rgba(40,60,110,.22)' });
    const gg = ctx.createRadialGradient(cx - 40, cy - 60, 10, cx, cy, 220);
    gg.addColorStop(0, '#fbfdff'); gg.addColorStop(1, rgba('#7fa6ff', clamp(0.12 + 0.08 * P, 0.1, 0.4)));
    ctx.fillStyle = gg; ctx.fill();
    ctx.save(); membranePath(B, bt, bb, bl, br); ctx.clip();
    drawTrail();
    drawParticles(RAD.membrane, t);
    drawFlashes();
    ctx.restore();
    // 고무막
    membranePath(B, bt, bb, bl, br);
    const rg = ctx.createLinearGradient(x0, y0, x1, y1);
    rg.addColorStop(0, '#fcd34d'); rg.addColorStop(0.5, '#f59e0b'); rg.addColorStop(1, '#c2670a');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,60,0,.3)'; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = rg; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.6; ctx.stroke();
    // 모서리 틀
    [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([px, py]) => {
      const bg = ctx.createLinearGradient(px - 8, py - 8, px + 8, py + 8); bg.addColorStop(0, '#a5b1c4'); bg.addColorStop(1, '#4b5565');
      D.shadow(() => { D.roundRect(px - 8, py - 8, 16, 16, 4); ctx.fillStyle = bg; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(px - 5, py - 5, 6, 2);
    });
    ctx.restore();
    captions([{ text: '🟧 사방이 얇은 고무막인 상자', color: '#8a4b00' }, { text: '🔍 입자 모형', bg: '#5b21b6', color: '#fff' }]);

    // 바깥으로 미는 화살표 + 벽마다 충돌 횟수
    if (S.k.hits > 0.01) {
      ctx.save(); ctx.globalAlpha = Math.min(1, S.k.hits * 1.4);
      const L = S.arrowL, col = '#e0552a';
      const kk = 1 + 0.06 * Math.sin(t * 6);
      D.arrow(cx + 30, y0 - bt - 6, cx + 30, y0 - bt - 6 - L * kk, { color: col, width: 4, head: 12 });     // 왼쪽 위 안내 라벨과 겹치지 않게 살짝 오른쪽
      D.arrow(cx + 30, y1 + bb + 6, cx + 30, y1 + bb + 6 + L * kk, { color: col, width: 4, head: 12 });
      D.arrow(x0 - bl - 6, cy, x0 - bl - 6 - L * kk, cy, { color: col, width: 4, head: 12 });
      D.arrow(x1 + br + 6, cy, x1 + br + 6 + L * kk, cy, { color: col, width: 4, head: 12 });
      const lab = (w) => '💥 ' + fmt(S.shown[w], 0) + '회/초';
      const o = { bg: 'rgba(255,255,255,.94)', color: '#9a3412', size: 13, border: 'rgba(224,85,42,.35)' };
      D.label(cx + 118, y0 - bt - 20, lab('top'), o);
      D.label(cx + 118, y1 + bb + 24, lab('bottom'), o);
      D.label(x0 - bl - 48, cy + 40, lab('left'), o);
      D.label(x1 + br + 52, cy + 40, lab('right'), o);
      ctx.restore();
    }
    toolIn(S.k.gauge, GAUGE_M.cx, GAUGE_M.cy, () => drawGauge(GAUGE_M.cx, GAUGE_M.cy, GAUGE_M.r, t));
    if (S.k.gauge > 0.01 && isNew('gauge')) { D.ring(GAUGE_M.cx, GAUGE_M.cy, GAUGE_M.r + 14, t, { color: '#8b5cf6' }); newBadge(GAUGE_M.cx + GAUGE_M.r * 0.8, GAUGE_M.cy - GAUGE_M.r * 0.85); }
    toolIn(S.k.pump, PUMP.x, (PUMP.top + PUMP.base) / 2, () => drawPump());
    if (S.k.pump > 0.01 && isNew('pump')) newRect(PUMP.x - 50, PUMP.top - 66, 100, PUMP.base - PUMP.top + 92, t);
    if (S.k.hits > 0.01 && isNew('hits') && !isNew('gauge')) newBadge(cx + 52, y0 - bt - 40);
  }

  function drawGauge(cx, cy, r, t) {
    const maxP = 4, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = (p) => a0 + (a1 - a0) * clamp(p / maxP, 0, 1);
    ctx.save();
    // 테두리(금속)와 바탕
    D.shadow(() => { ctx.fillStyle = '#dde4ee'; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill(); }, { blur: 16, y: 6, color: 'rgba(30,50,90,.3)' });
    const bz = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bz.addColorStop(0, '#f4f7fb'); bz.addColorStop(0.5, '#b4c0d2'); bz.addColorStop(1, '#8794ab');
    ctx.fillStyle = bz; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
    const fg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 4, cx, cy, r);
    fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, '#eef2f8');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(226,70,75,.30)'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.arc(cx, cy, r - 14, ang(2), ang(4)); ctx.stroke();
    ctx.fillStyle = '#34405a'; ctx.font = D.font(14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= maxP; p += 0.5) {
      const a = ang(p), major = p % 1 === 0;
      ctx.strokeStyle = '#34405a'; ctx.lineWidth = major ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
      ctx.lineTo(cx + Math.cos(a) * (r - (major ? 20 : 15)), cy + Math.sin(a) * (r - (major ? 20 : 15)));
      ctx.stroke();
      if (major) ctx.fillText(p, cx + Math.cos(a) * (r - 33), cy + Math.sin(a) * (r - 33));
    }
    ctx.font = D.font(13, 800); ctx.fillStyle = '#5d6879';
    ctx.fillText('기압', cx, cy + r * 0.46);
    ctx.textBaseline = 'alphabetic';
    // 바늘 (스프링으로 살짝 출렁이며 따라감)
    const a = ang(clamp(S.needleSp.value, -0.1, 4.2));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 12, cy - Math.sin(a) * 12); ctx.lineTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16)); ctx.stroke();
    ctx.restore();
    D.sphere(cx, cy, 8, '#48546b', { shadow: true });
    // 유리 반사
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.34, cy - r * 0.5, r * 0.5, r * 0.22, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    D.label(cx, cy + r + 24, '🧭 압력계', { bg: '#34405a', size: 13 });
  }

  function drawPump() {
    const px = PUMP.x, top = PUMP.top, base = PUMP.base;
    const push = S.pump.k * 38;
    ctx.save();
    // 받침
    const fg = ctx.createLinearGradient(0, base - 12, 0, base + 4);
    fg.addColorStop(0, '#7b8aa0'); fg.addColorStop(1, '#4b5565');
    D.shadow(() => { D.roundRect(px - 48, base - 12, 96, 14, 6); ctx.fillStyle = fg; ctx.fill(); }, { blur: 8, y: 3 });
    // 피스톤 막대 + 손잡이 (몸통 뒤)
    const hy = top - 50 + push;
    const rod = ctx.createLinearGradient(px - 4, 0, px + 4, 0); rod.addColorStop(0, '#dfe6f1'); rod.addColorStop(1, '#8f9cb2');
    ctx.fillStyle = rod; ctx.fillRect(px - 4, hy, 8, top - hy + 20);
    // 몸통(유리 + 하이라이트)
    D.shadow(() => { D.roundRect(px - 19, top, 38, base - 12 - top, 8); ctx.fillStyle = '#cfd9e8'; ctx.fill(); }, { blur: 10, y: 4 });
    const g = ctx.createLinearGradient(px - 19, 0, px + 19, 0);
    g.addColorStop(0, '#a9b9d0'); g.addColorStop(0.3, '#f2f6fb'); g.addColorStop(0.7, '#d5dfec'); g.addColorStop(1, '#8c9bb3');
    D.roundRect(px - 19, top, 38, base - 12 - top, 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7d8ba1'; ctx.lineWidth = 2; ctx.stroke();
    // 몸통 속 피스톤
    const pyy = Math.min(base - 24, top + 30 + push * 1.2);
    ctx.fillStyle = '#48546b'; D.roundRect(px - 16, pyy, 32, 12, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(px - 12, top + 8, 4, base - 12 - top - 22);
    // 손잡이
    const hg = ctx.createLinearGradient(0, hy - 16, 0, hy + 4);
    hg.addColorStop(0, '#ff9b6b'); hg.addColorStop(1, '#e0552a');
    D.shadow(() => { D.roundRect(px - 46, hy - 16, 92, 22, 11); ctx.fillStyle = '#e0552a'; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(120,40,10,.4)' });
    D.roundRect(px - 46, hy - 16, 92, 22, 11); ctx.fillStyle = hg; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; D.roundRect(px - 38, hy - 13, 76, 5, 2.5); ctx.fill();
    D.text(px, hy - 0.5, '누르기', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(140,40,10,.5)', strokeWidth: 3 });
    ctx.restore();
    D.label(px, base + 16, '공기 펌프', { bg: '#34405a', size: 13 });
  }
  function hitPump(p) {
    return Math.abs(p.x - PUMP.x) < 54 && p.y > PUMP.top - 70 && p.y < PUMP.base + 4;
  }

  /* ---- ④ 풍선 ---- */
  function drawBalloonScene(t) {
    gasBG.draw();
    const cy = balloonCy(), pr = S.bpulse * 3, r = S.br + pr;
    const P = parts.length / N0;
    ctx.save();
    if (S.shake > 0.02) ctx.translate(Math.sin(t * 70) * 4 * S.shake, 0);
    // 호스: 펌프 → 풍선 입구
    drawHose(HOSE.balloon, 8);
    drawAir(HOSE.balloon);
    // 목표 크기
    if (S.targetR) {
      const ty = BAL.neck - 28 - S.targetR;
      ctx.save(); ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(BAL.cx, ty, S.targetR, 0, TAU); ctx.stroke(); ctx.restore();
      if (S.br >= S.targetR - 3 && parts.length >= 60) D.ring(BAL.cx, ty, S.targetR + 6, t, { color: '#14a058' });
    }
    // 풍선(고무)
    ctx.save();
    ctx.translate(BAL.cx, cy);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,150,175,.35)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }, { blur: 24, y: 10, color: 'rgba(120,20,60,.28)' });
    const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    bg.addColorStop(0, 'rgba(255,225,235,.55)'); bg.addColorStop(0.7, 'rgba(255,130,165,.28)'); bg.addColorStop(1, 'rgba(226,70,107,.5)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(BAL.cx, cy, r - 1, 0, TAU); ctx.clip();
    drawTrail();
    drawParticles(RAD.balloon, t);
    drawFlashes();
    ctx.restore();
    // 고무막 두께 + 반사광
    ctx.strokeStyle = '#c92f58'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(BAL.cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,195,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(BAL.cx, cy, r - 3.5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(BAL.cx, cy, r - 16, Math.PI * 1.1, Math.PI * 1.36); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(BAL.cx, cy, r - 16, Math.PI * 1.42, Math.PI * 1.47); ctx.stroke(); ctx.lineCap = 'butt';
    // 매듭과 입구
    const kg = ctx.createLinearGradient(BAL.cx - 9, 0, BAL.cx + 9, 0); kg.addColorStop(0, '#f0597f'); kg.addColorStop(1, '#b32549');
    ctx.fillStyle = kg;
    ctx.beginPath(); ctx.moveTo(BAL.cx - 10, cy + r + 11); ctx.lineTo(BAL.cx + 10, cy + r + 11); ctx.lineTo(BAL.cx, cy + r - 2); ctx.closePath(); ctx.fill();
    ctx.fillRect(BAL.cx - 6, cy + r + 8, 12, BAL.neck - (cy + r + 8) + 4);
    ctx.fillStyle = '#8f98a8'; D.roundRect(BAL.cx - 11, BAL.neck - 6, 22, 14, 4); ctx.fill();
    ctx.restore();
    // 모든 방향으로 미는 화살표 (압력이 클수록 길어짐)
    if (S.k.hits > 0.01) {
      ctx.save(); ctx.globalAlpha = Math.min(1, S.k.hits * 1.4);
      const len = clamp(S.arrowL, 12, 40) * (1 + 0.05 * Math.sin(t * 6));
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + Math.PI / 12;
        if (Math.abs(a - Math.PI / 2) < 0.4) continue; // 입구 쪽 생략
        const r0 = r + 8, r1 = r0 + len;
        D.arrow(BAL.cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, BAL.cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, { color: 'rgba(224,85,42,.9)', width: 3, head: 10 });
      }
      ctx.restore();
    }
    ctx.restore();
    if (S.targetR) D.label(BAL.cx, Math.max(58, BAL.neck - 28 - 2 * S.targetR - 26), '🎯 여기까지 부풀리기', { bg: '#14a058', size: 14 });
    captions([{ text: '🎈 펌프로 공기를 넣는 고무풍선', color: '#9f1239' }, { text: '🔍 풍선 속 입자 모형', bg: '#5b21b6', color: '#fff' }]);
    toolIn(S.k.pump, PUMP.x, (PUMP.top + PUMP.base) / 2, () => drawPump());
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
    const changed = S.scene !== sc;
    S.scene = sc;
    S.sceneT = 0;
    if (changed) { FX.clear(); S.air.length = 0; S.k.gauge = S.k.pump = S.k.hits = 0; }
    untrack(); S.flashes = []; resetRates(); S.targetR = 0; S.bpulse = 0; S.shake = 0;
    if (sc === 'block') { parts = []; resetBlock(); }
    else if (sc === 'box') fill(24);
    else if (sc === 'membrane') { S.needle = 1; S.needleSp.value = 1; S.needleSp.velocity = 0; S.bulge = 8; S.arrowL = 24; fill(N0); }
    else if (sc === 'balloon') { S.br = rBalloon(10); S.arrowL = 14; fill(10); }
    view.wrap.style.setProperty('--stage-bg', sc === 'block' ? SKY : BG);
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

  function pumpPress() { tween(S.pump, { k: 1 }, 0.1, () => tween(S.pump, { k: 0 }, 0.35, null, 'outBack')); }
  function tween(o, to, dur, done, e) { SciSim.tween(o, to, { duration: dur, ease: e || 'outQuad', onDone: done }); }
  function pumpIn() {
    const max = S.scene === 'balloon' ? 90 : 120;
    if (parts.length >= max) { S.shake = 1; Sound.fail(); SciSim.toast(S.scene === 'balloon' ? '풍선이 터질 것 같아요! 더 넣지 마세요 🎈' : '더 넣으면 상자가 터질 것 같아요!'); return; }
    Sound.tick(); pumpPress(); addAir(Math.min(10, max - parts.length)); hideHint();
    S.bpulse = 1;
  }
  function pumpOut() {
    const min = S.scene === 'balloon' ? 10 : 20;
    if (parts.length <= min) { S.shake = 1; SciSim.toast('더 이상 뺄 수 없어요'); return; }
    Sound.tick(); removeAir(Math.min(10, parts.length - min)); hideHint();
    S.bpulse = -1;
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
      S.bx = p.x - S.drag.ox; clampBx(); S.bxT = S.bx;
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
        if (S.bstate === 'drag') S.bstate = 'air';
        dropBlock(o, S.bx);
      } else {
        S.bvy = 0; S.bstate = 'air'; S.bxT = S.bx;
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

  /* 미션 성공 순간을 감지해 화면 위에 축하 효과 */
  function winSpot() {
    if (S.scene === 'block') return { x: clamp(S.bx + BRICK[S.orient].w / 2 + 70, 120, 730), y: SNOW.y - 150 };
    if (S.scene === 'box') return { x: BOX2.x + BOX2.w / 2, y: BOX2.y + BOX2.h / 2 };
    if (S.scene === 'membrane') return { x: BOXM.x + BOXM.w / 2, y: BOXM.y + BOXM.h / 2 };
    return { x: BAL.cx, y: balloonCy() };
  }
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) {
      const w = winSpot();
      celebrate(w.x, w.y);
    }
    lastPhase = ph; lastIdx = idx;
  }

  /* ---------- 시작 ---------- */
  if (!S.scene) setScene(LEVEL_SCENE[game.level] || 'block');
  refreshUI();

  function update(dt) {
    S.sceneT += dt;
    if (S.scene === 'block') stepBlock(dt); else stepGas(dt);
    const want = { gauge: S.scene === 'membrane' && on('gauge'), pump: (S.scene === 'membrane' || S.scene === 'balloon') && on('pump'), hits: (S.scene === 'membrane' || S.scene === 'balloon') && on('hits') };
    for (const k in want) S.k[k] = RM ? (want[k] ? 1 : 0) : ap(S.k[k], want[k] ? 1 : 0, dt, 5);
    S.shake = ap(S.shake, 0, dt, 4);
    S.bpulse = ap(S.bpulse, 0, dt, 7);
    S.needleSp.target = S.needle; S.needleSp.update(dt);
    S.arrowL = ap(S.arrowL, 14 + 10 * clamp(pressure(), 0.3, 3), dt, 4);
    stepAir(dt);
    FX.update(dt);
  }
  function draw(t, dt) {
    view.clear(S.scene === 'block' ? SKY : BG);
    if (S.scene === 'block') drawBlockScene(t, dt);
    else if (S.scene === 'box') drawBoxScene(t);
    else if (S.scene === 'membrane') drawMembraneScene(t);
    else drawBalloonScene(t);
    FX.draw(ctx);
    drawChecks(t);
    if (S.sceneT < 0.4) {       // 장면 전환: 부드럽게 나타나기
      ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.4);
      ctx.fillStyle = S.scene === 'block' ? SKY : BG; ctx.fillRect(0, 0, 800, 520); ctx.restore();
    }
  }
  SciSim.loop((dt, t) => {
    update(dt);
    draw(now(), dt);
    updateReadouts(t);
    watchGame();
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    S, setScene, pressure, hitPump, view,
    feat(list) { F = new Set(list); refreshUI(); },
    get n() { return parts.length; },
    get fx() { return FX.count; },
    nan() { return parts.some((p) => p.x !== p.x || p.y !== p.y); },
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / 800, y: r.top + (y * r.height) / 520 }; },
  };
})();
