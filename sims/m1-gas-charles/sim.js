/* =========================================================
   중1 Ⅵ. 기체의 성질 — 온도와 부피 [9과06-03]
   ① [관찰] 추를 올린 피스톤(압력 일정) 속 기체를 가열·냉각
   ② [실험] 온도·부피 측정 → 표와 그래프 → 관계 찾기
   ③ [설명] 입자 모형으로 해석 (운동 빠르기 변화, 입자의 크기·개수는 그대로)
   ④ [적용] 찌그러진 탁구공, 열기구, 냉장고 속 페트병
   ※ 정성적 설명에 주안점: 계산·예측 미션 없음 (측정값은 실험 결과로만 표시)
   ※ 그림은 assets/js/anim.js(애니메이션 도구)로 그림: 광택 입자, 유리 실린더, 불꽃·얼음, 부드러운 움직임, 성공 효과
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound, toast } = SciSim;
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
  const FX = new SciSim.Particles();          // 김·물방울·얼음 가루·성공 효과
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

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
  const gasBG = makeLayer(800, 520, (c, d) => {
    c.fillStyle = BG; c.fillRect(0, 0, 800, 520);
    d.glow(140, 80, 360, '#ffffff', 0.95);
    c.fillStyle = 'rgba(140,160,190,.14)';
    for (let x = 20; x < 800; x += 36) for (let y = 20; y < 520; y += 36) { c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill(); }
  }, BG);
  const TABLE = 486;
  const pongBG = makeLayer(800, 520, (c, d) => {
    const g = c.createLinearGradient(0, 0, 0, TABLE);
    g.addColorStop(0, '#f6f2ec'); g.addColorStop(1, '#f1ebe2');
    c.fillStyle = BG; c.fillRect(0, 0, 800, 520);
    c.fillStyle = g; c.fillRect(0, 0, 800, TABLE);
    d.glow(120, 60, 320, '#ffffff', 0.9);
    // 탁자(나무)
    const w = c.createLinearGradient(0, TABLE, 0, 520);
    w.addColorStop(0, '#e6d3b4'); w.addColorStop(0.15, '#d9c19b'); w.addColorStop(1, '#c4a77c');
    c.fillStyle = w; c.fillRect(0, TABLE, 800, 520 - TABLE);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(0, TABLE, 800, 3);
    c.strokeStyle = 'rgba(120,80,30,.12)'; c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, TABLE + 8 + i * 5); c.bezierCurveTo(250, TABLE + 4 + i * 5, 520, TABLE + 12 + i * 5, 800, TABLE + 7 + i * 5); c.stroke(); }
  }, BG);

  /* ---------- 상태 ---------- */
  const T0 = 20;
  const Vof = (T) => 60 * (T + 273) / 273;   // 압력이 일정할 때 기체의 부피 (측정값)
  const S = {
    scene: '', sceneT: 0,
    Tset: T0, Tg: T0,
    data: [], fresh: -1,
    target: null, stage1: 0, lastStage: 0, tgPrev: null,
    showParticles: true, showHits: true, flashes: [],
    cold: { t: 0, done: false }, hot: { t: 0, done: false },
    Vd: new SciSim.Spring(Vof(T0), { stiffness: 130, damping: 17 }),   // 눈에 보이는 피스톤 위치(부드럽게 따라감)
    heat: 0, pk: 1, thx: 610,
    k: { heater: 0, thermo: 0, graph: 0 },
    // 탁구공
    ball: null,
    ballParts: [],
    bsq: new SciSim.Spring(0, { stiffness: 300, damping: 12 }), lift: 0, ripples: [], water: 0,
  };
  const settled = () => Math.abs(S.Tset - S.Tg) < 0.05;

  /* ---------- 배치 ---------- */
  const CYL = { x: 250, w: 180, bottom: 400, top: 84 };
  const PX = 3;                                 // 1 mL당 픽셀
  const pistonY = (V) => CYL.bottom - V * PX;
  const GRAPH = { x: 398, y: 26, w: 390, h: 480 };
  const layX = () => (on('record') ? { cx: 92, th: 338 } : { cx: 236, th: 610 });

  /* ---------- 입자 ---------- */
  const NP = 30, R = 6, BASE_SPEED = 170;
  const speedScale = (T) => (T + 273) / (T0 + 273);   // 온도가 높을수록 빠르게 (정성적 표현)
  // 빠르기에 따라 입자 색이 파랑 → 빨강으로 (7단계로 미리 정해 두기)
  const PCOL = ['#2fb3f5', '#3a8af3', '#3d6df2', '#7a5af0', '#c24bd0', '#ee4f7a', '#ef4a2f'];
  const colIdx = (T) => clamp(Math.round((speedScale(T) - 0.76) / 0.68 * 6), 0, 6);
  const parts = [];
  let curScale = 1;
  for (let i = 0; i < NP; i++) {
    const a = Math.random() * Math.PI * 2, sp = BASE_SPEED * (0.65 + Math.random() * 0.7);
    parts.push({ x: CYL.x + R + Math.random() * (CYL.w - 2 * R), y: pistonY(Vof(T0)) + R + Math.random() * (Vof(T0) * PX - 2 * R), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }
  function stepParticles(dt) {
    const k = speedScale(S.Tg) / curScale;
    if (Math.abs(k - 1) > 1e-4) { for (let i = 0; i < parts.length; i++) { parts[i].vx *= k; parts[i].vy *= k; } curScale *= k; }
    const top = pistonY(S.Vd.value);
    const L = CYL.x + R, Rr = CYL.x + CYL.w - R, B = CYL.bottom - R, T = top + R;
    const nw = performance.now();
    const fl = S.showHits && on('hits');
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < L) { p.x = L + (L - p.x); p.vx = Math.abs(p.vx); }
      if (p.x > Rr) { p.x = Rr - (p.x - Rr); p.vx = -Math.abs(p.vx); }
      if (p.y > B) { p.y = B - (p.y - B); p.vy = -Math.abs(p.vy); }
      if (p.y < T) {
        p.y = Math.min(B, T + (T - p.y));
        if (p.vy < 0) { p.vy = Math.abs(p.vy); if (fl && S.flashes.length < 50) S.flashes.push({ x: p.x, y: top, t: nw, s: Math.hypot(p.vx, p.vy) }); }
      }
    }
    let w = 0;
    for (let i = 0; i < S.flashes.length; i++) if (nw - S.flashes[i].t < 400) S.flashes[w++] = S.flashes[i];
    S.flashes.length = w;
  }

  function step(dt) {
    S.sceneT += dt;
    // 기체 온도는 장치 온도를 천천히 따라감 (마지막에는 일정한 빠르기로 정확히 도달)
    const diff = S.Tset - S.Tg;
    let d = diff * Math.min(1, dt * 2);
    if (Math.abs(d) < 6 * dt) d = Math.sign(diff) * Math.min(Math.abs(diff), 6 * dt);
    S.Tg += d;
    S.Vd.target = Vof(S.Tg); S.Vd.update(dt);
    S.heat = ap(S.heat, clamp((S.Tset - T0) / 130, -1, 1), dt, 4);
    const showP = on('particles') && S.showParticles;
    S.pk = RM ? (showP ? 1 : 0) : ap(S.pk, showP ? 1 : 0, dt, 7);
    const cyl = S.scene === 'cyl';
    S.k.heater = RM ? (cyl && on('heater') ? 1 : 0) : ap(S.k.heater, cyl && on('heater') ? 1 : 0, dt, 5);
    S.k.thermo = RM ? (cyl && on('thermo') ? 1 : 0) : ap(S.k.thermo, cyl && on('thermo') ? 1 : 0, dt, 5);
    S.k.graph = RM ? (cyl && on('record') ? 1 : 0) : ap(S.k.graph, cyl && on('record') ? 1 : 0, dt, 5);
    // 배치가 바뀌면 입자도 함께 부드럽게 옮김
    const L = layX();
    const nx = Math.abs(L.cx - CYL.x) < 0.3 ? L.cx : ap(CYL.x, L.cx, dt, 6);
    if (nx !== CYL.x) { const dx = nx - CYL.x; for (let i = 0; i < parts.length; i++) parts[i].x += dx; CYL.x = nx; }
    S.thx = Math.abs(L.th - S.thx) < 0.3 ? L.th : ap(S.thx, L.th, dt, 6);
    for (let i = 0; i < S.data.length; i++) { const q = S.data[i]; if (q.k < 1) q.k = Math.min(1, q.k + dt * 3.2); }
    // 목표선에 닿은 순간 효과
    if (S.stage1 > S.lastStage && S.tgPrev != null) FX.burst(CYL.x + CYL.w / 2, pistonY(S.tgPrev), { count: 12, speed: 110, life: 0.6, colors: ['#14a058', '#ffb400', '#8b5cf6'] });
    S.lastStage = S.stage1;
    if (S.target) S.tgPrev = S.target.V;
    // 불꽃 불씨 · 얼음 가루 (장식)
    if (!RM && cyl && S.k.heater > 0.5) {
      const hx = CYL.x + CYL.w / 2;
      if (S.heat > 0.12 && Math.random() < dt * 14 * S.heat) FX.emit({ x: hx + rand(-70, 70), y: CYL.bottom + 22, vx: rand(-14, 14), vy: -rand(40, 90), life: rand(0.5, 0.9), size: rand(1.4, 2.6), color: '#ffb347', gravity: -20, shape: 'circle' });
      if (S.heat < -0.12 && Math.random() < dt * 12 * -S.heat) FX.emit({ x: hx + rand(-70, 70), y: CYL.bottom + 24, vx: rand(-10, 10), vy: rand(20, 50), life: rand(0.7, 1.1), size: rand(1.6, 2.8), color: '#bfe6ff', gravity: 40, shape: 'star', rot: rand(0, 6), vr: rand(-4, 4) });
    }
    FX.update(dt);
    stepParticles(dt);
  }

  /* ---------- 실린더 장면 ---------- */
  function drawCylScene(t) {
    gasBG.draw();
    const L = layX();
    if (S.k.heater > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.k.heater * 1.5);
      ctx.translate(0, (1 - ease.outCubic(S.k.heater)) * 30);
      drawHeater(t);
      ctx.restore();
      if (isNew('heater')) newRect(CYL.x - 24, CYL.bottom + 24, CYL.w + 48, 58, t);
    }
    drawCylinder(t);
    if (S.k.thermo > 0.01) {
      ctx.save();
      const th = S.thx, k = S.k.thermo, sc = 0.85 + 0.15 * ease.outBack(Math.min(1, k));
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.translate(th, 240); ctx.scale(sc, sc); ctx.translate(-th, -240);
      drawThermo(th, 92, 290);
      ctx.restore();
      if (isNew('thermo')) newRect(th - 26, 62, 82, 400, t);
    }
    if (S.k.graph > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.k.graph * 1.4);
      ctx.translate((1 - ease.outCubic(S.k.graph)) * 36, 0);
      drawGraph(GRAPH, t);
      ctx.restore();
      if (isNew('record')) newRect(GRAPH.x, GRAPH.y, GRAPH.w, GRAPH.h, t);
    }
    if (S.pk > 0.02) {
      ctx.save(); ctx.globalAlpha = S.pk;
      captions([{ text: '🔍 입자 모형으로 본 기체 (확대한 그림)', bg: '#5b21b6', color: '#fff' }]);
      ctx.restore();
    }
  }

  /* 가열·냉각 장치: 철제 받침 + 불꽃/얼음 (장치 온도에 따라 서서히 바뀜) */
  function drawHeater(t) {
    const x0 = CYL.x, w = CYL.w, cx = x0 + w / 2;
    const hy = CYL.bottom + 30;               // 장치 윗면
    const h = S.heat;
    if (Math.abs(h) > 0.05) D.glow(cx, CYL.bottom + 10, 150 + 40 * Math.abs(h), h > 0 ? '#ff7a2f' : '#7cc4ff', 0.18 + 0.28 * Math.abs(h));
    // 본체
    const bg = ctx.createLinearGradient(0, hy, 0, hy + 52);
    bg.addColorStop(0, '#6b7689'); bg.addColorStop(1, '#3b4455');
    D.shadow(() => { D.roundRect(x0 - 24, hy, w + 48, 52, 11); ctx.fillStyle = '#3b4455'; ctx.fill(); }, { blur: 14, y: 6, color: 'rgba(30,40,60,.35)' });
    D.roundRect(x0 - 24, hy, w + 48, 52, 11); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; D.roundRect(x0 - 20, hy + 3, w + 40, 6, 3); ctx.fill();
    // 윗판(온도에 따라 달아오름/차가워짐)
    const pc = h >= 0 ? mix('#a9b3c4', '#ff6a3a', h) : mix('#a9b3c4', '#7cc4ff', -h);
    D.roundRect(x0 - 12, hy - 7, w + 24, 12, 6); ctx.fillStyle = pc; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; D.roundRect(x0 - 8, hy - 6, w + 16, 3, 1.5); ctx.fill();
    // 불꽃
    if (h > 0.08) {
      const n = 5, size = 24 + 26 * h;
      for (let i = 0; i < n; i++) {
        const fx = x0 + (i + 0.5) * w / n;
        D.flame(fx, hy - 6, size * (0.85 + 0.15 * Math.sin(t * 7 + i * 2)), t * (RM ? 0 : 1) + i * 1.3, {});
      }
    } else if (h < -0.08) {
      // 얼음 덩어리
      const n = 3, a = Math.min(1, -h * 1.6);
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < n; i++) {
        const ix = x0 + (i + 0.5) * w / n - 14, iy = hy - 6 - 28;
        const ig = ctx.createLinearGradient(ix, iy, ix + 28, iy + 28); ig.addColorStop(0, 'rgba(225,245,255,.95)'); ig.addColorStop(1, 'rgba(140,200,245,.85)');
        D.shadow(() => { D.roundRect(ix, iy + 2 * (i % 2), 30, 28, 6); ctx.fillStyle = '#9fd3f7'; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(40,100,160,.3)' });
        D.roundRect(ix, iy + 2 * (i % 2), 30, 28, 6); ctx.fillStyle = ig; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix + 5, iy + 2 * (i % 2) + 20); ctx.lineTo(ix + 5, iy + 2 * (i % 2) + 7); ctx.lineTo(ix + 17, iy + 2 * (i % 2) + 5); ctx.stroke();
      }
      ctx.restore();
    }
    // 표시창
    ctx.fillStyle = '#1f2633'; D.roundRect(cx - 62, hy + 16, 124, 24, 8); ctx.fill();
    const lab = S.Tset > 30 ? '🔥 가열 중' : S.Tset < 10 ? '❄ 냉각 중' : '가열·냉각 장치';
    D.text(cx, hy + 33, lab, { size: 13, weight: 800, color: S.Tset > 30 ? '#ffb27a' : S.Tset < 10 ? '#a8dcff' : '#d6deea' });
  }

  function drawCylinder(t) {
    const V = S.Vd.value, top = pistonY(V);
    const x0 = CYL.x, x1 = CYL.x + CYL.w, cx = x0 + CYL.w / 2;
    const gasH = CYL.bottom - top, pk = S.pk;
    // 유리 몸통(뒤)
    D.shadow(() => { D.roundRect(x0 - 2, CYL.top, CYL.w + 4, CYL.bottom - CYL.top + 6, 8); ctx.fillStyle = '#e8f0fb'; ctx.fill(); }, { blur: 22, y: 8, color: 'rgba(40,60,110,.28)' });
    const bgG = ctx.createLinearGradient(x0, 0, x1, 0);
    bgG.addColorStop(0, 'rgba(238,245,255,.9)'); bgG.addColorStop(0.5, 'rgba(250,252,255,.7)'); bgG.addColorStop(1, 'rgba(220,232,250,.9)');
    D.roundRect(x0, CYL.top, CYL.w, CYL.bottom - CYL.top, 6); ctx.fillStyle = bgG; ctx.fill();
    // 기체: 온도에 따라 색이 달라지는 공기 ↔ 입자 모형
    const warm = clamp((S.Tg - T0) / 130, -1, 1);
    const cTop = warm >= 0 ? mix('#7ea5f7', '#f4906a', warm) : mix('#7ea5f7', '#8fd0ff', -warm), cBot = warm >= 0 ? mix('#5b86ee', '#ef5a3a', warm) : mix('#5b86ee', '#6cb6f2', -warm);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, CYL.w, gasH); ctx.clip();
    const tg = ctx.createLinearGradient(0, top, 0, CYL.bottom);
    tg.addColorStop(0, rgba(cTop, 0.38)); tg.addColorStop(1, rgba(cBot, 0.5));
    ctx.globalAlpha = 1 - pk * 0.85; ctx.fillStyle = tg; ctx.fillRect(x0, top, CYL.w, gasH);
    ctx.globalAlpha = pk; ctx.fillStyle = '#f4f8ff'; ctx.fillRect(x0, top, CYL.w, gasH);
    const wg = ctx.createLinearGradient(0, top, 0, CYL.bottom);
    wg.addColorStop(0, rgba(cTop, 0.0)); wg.addColorStop(1, rgba(cBot, 0.16 * Math.abs(warm) * 2));
    ctx.fillStyle = wg; ctx.fillRect(x0, top, CYL.w, gasH);
    ctx.globalAlpha = 1;
    if (pk < 0.98) {
      ctx.globalAlpha = 1 - pk;
      D.text(cx, top + gasH / 2 + 6, '공기', { size: 16, weight: 800, color: '#2f4ea8', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
      ctx.globalAlpha = 1;
    }
    if (pk > 0.02) {
      ctx.globalAlpha = pk;
      const sp = 0.045 * clamp(speedScale(S.Tg), 0.7, 1.5);
      ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      if (warm > 0.25) ctx.strokeStyle = 'rgba(239,74,47,.22)';
      ctx.beginPath();
      for (let i = 0; i < parts.length; i++) { const p = parts[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * sp, p.y - p.vy * sp); }
      ctx.stroke(); ctx.lineCap = 'butt';
      const col = PCOL[colIdx(S.Tg)];
      for (let i = 0; i < parts.length; i++) sprites.draw(col, parts[i].x, parts[i].y, R);
      const nw = performance.now();
      for (let i = 0; i < S.flashes.length; i++) {
        const f = S.flashes[i], a = 1 - (nw - f.t) / 400, big = clamp(f.s / BASE_SPEED, 0.5, 2.2);
        ctx.strokeStyle = `rgba(242,107,58,${a})`; ctx.lineWidth = 1.5 + big;
        ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 8 * big, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(255,190,120,${a * 0.4})`; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + (1 - a) * 5 * big, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const sh = ctx.createLinearGradient(x0, 0, x0 + 22, 0); sh.addColorStop(0, 'rgba(60,90,140,.14)'); sh.addColorStop(1, 'rgba(60,90,140,0)');
    ctx.fillStyle = sh; ctx.fillRect(x0, top, 22, gasH);
    ctx.restore();

    // 🔍 입자 모형 표시 (돋보기 테두리)
    if (pk > 0.02) {
      ctx.save(); ctx.globalAlpha = pk;
      ctx.setLineDash([9, 6]); ctx.lineDashOffset = RM ? 0 : -t * 14;
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3;
      D.roundRect(x0 + 2, top + 2, CYL.w - 4, gasH - 4, 5); ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = 'round';
      ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(x1 - 3, CYL.bottom - 8); ctx.lineTo(x1 + 24, CYL.bottom + 18); ctx.stroke();
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x1 - 3, CYL.bottom - 8); ctx.lineTo(x1 + 24, CYL.bottom + 18); ctx.stroke();
      ctx.restore();
    }
    // 목표선
    if (S.target) {
      const ty = pistonY(S.target.V);
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.save(); ctx.setLineDash([9, 6]); ctx.lineDashOffset = RM ? 0 : -t * 22; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0 - 26, ty); ctx.lineTo(x1 + 14, ty); ctx.stroke(); ctx.restore();
      D.ring(x1 + 6, ty, 7 + pulse * 2, t, { color: '#14a058', width: 2 });
      D.label(x1 + 22, ty, S.target.label, { bg: '#14a058', size: 13, align: 'left' });
    }
    // 실린더 유리 벽 + 하이라이트
    const wallG = ctx.createLinearGradient(x0 - 3, 0, x0 + 3, 0); wallG.addColorStop(0, '#6f7e95'); wallG.addColorStop(1, '#a6b3c7');
    ctx.fillStyle = wallG; ctx.fillRect(x0 - 3, CYL.top, 5, CYL.bottom - CYL.top + 4);
    const wallG2 = ctx.createLinearGradient(x1 - 2, 0, x1 + 4, 0); wallG2.addColorStop(0, '#a6b3c7'); wallG2.addColorStop(1, '#6f7e95');
    ctx.fillStyle = wallG2; ctx.fillRect(x1 - 2, CYL.top, 5, CYL.bottom - CYL.top + 4);
    const bot = ctx.createLinearGradient(0, CYL.bottom, 0, CYL.bottom + 8); bot.addColorStop(0, '#a1aec2'); bot.addColorStop(1, '#6a778c');
    D.roundRect(x0 - 3, CYL.bottom - 1, CYL.w + 6, 9, 3); ctx.fillStyle = bot; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 9, CYL.top + 14); ctx.lineTo(x0 + 9, CYL.bottom - 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1 - 9, CYL.top + 30); ctx.lineTo(x1 - 9, CYL.bottom - 40); ctx.stroke();
    ctx.lineCap = 'butt';
    // 눈금
    ctx.fillStyle = '#4a5568'; ctx.font = D.font(13, 700); ctx.textAlign = 'right';
    for (let v = 0; v <= 100; v += 10) {
      const y = pistonY(v);
      ctx.strokeStyle = '#7d8ba1'; ctx.lineWidth = v % 20 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0 - (v % 20 === 0 ? 13 : 8), y); ctx.lineTo(x0 - 3, y); ctx.stroke();
      if (v % 20 === 0) ctx.fillText(v + '', x0 - 17, y + 4);
    }
    ctx.save(); ctx.translate(x0 - 50, 250); ctx.rotate(-Math.PI / 2); D.text(0, 0, '부피 (mL)', { size: 13, weight: 800, color: '#4a5568' }); ctx.restore();
    // 피스톤 + 추
    const ph = 16;
    const rg = ctx.createLinearGradient(0, top - 8, 0, top); rg.addColorStop(0, '#454e61'); rg.addColorStop(1, '#232a37');
    D.shadow(() => { D.roundRect(x0 + 1, top - 8, CYL.w - 2, 9, 3); ctx.fillStyle = '#232a37'; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(0,0,0,.35)' });
    D.roundRect(x0 + 1, top - 8, CYL.w - 2, 9, 3); ctx.fillStyle = rg; ctx.fill();
    const pg = ctx.createLinearGradient(0, top - ph, 0, top - 7);
    pg.addColorStop(0, '#dde4ef'); pg.addColorStop(1, '#8e9ab0');
    D.roundRect(x0 + 3, top - ph, CYL.w - 6, 10, 4); ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = '#6b768a'; ctx.lineWidth = 1.2; ctx.stroke();
    // 추 (쇠)
    const wy = top - ph;
    const wgd = ctx.createLinearGradient(cx - 58, 0, cx + 58, 0);
    wgd.addColorStop(0, '#4b5565'); wgd.addColorStop(0.35, '#8a96a9'); wgd.addColorStop(1, '#3a4252');
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(cx - 58, wy); ctx.lineTo(cx + 58, wy); ctx.lineTo(cx + 42, wy - 44); ctx.lineTo(cx - 42, wy - 44); ctx.closePath(); ctx.fillStyle = '#4b5565'; ctx.fill(); }, { blur: 10, y: 4, color: 'rgba(20,30,50,.35)' });
    ctx.beginPath(); ctx.moveTo(cx - 58, wy); ctx.lineTo(cx + 58, wy); ctx.lineTo(cx + 42, wy - 44); ctx.lineTo(cx - 42, wy - 44); ctx.closePath(); ctx.fillStyle = wgd; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 40, wy - 40); ctx.lineTo(cx + 38, wy - 40); ctx.stroke();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, wy - 50, 9, Math.PI, 0); ctx.stroke();
    D.text(cx, wy - 24, '추', { size: 15, weight: 800, color: '#fff' });
    D.text(cx, wy - 8, '(압력 일정)', { size: 13, weight: 800, color: '#e3e9f2' });
    if (isNew('particles') && pk > 0.5) { D.ring(x1 + 12, CYL.bottom + 10, 24, t, { color: '#8b5cf6' }); newBadge(on('record') ? 292 : x1 + 54, on('record') ? 30 : CYL.bottom - 12); }
    if (isNew('hits') && S.showHits && pk > 0.5) newBadge(x1 + 34, top - 10);
  }

  function drawThermo(x, y, h) {
    const lo = -50, hi = 150, tk = clamp((S.Tg - lo) / (hi - lo), 0, 1);
    const col = S.Tg <= T0 ? mix('#3b82f6', '#e2464b', clamp((S.Tg + 50) / 70, 0, 1)) : mix('#e2464b', '#b91c1c', clamp((S.Tg - T0) / 130, 0, 1));
    D.thermometer(x, y, h, S.Tg, lo, hi, { color: col, step: 50, unit: '°' });
    D.text(x + 8, y - 12, '🌡 온도계', { size: 13, weight: 800, color: '#34405a' });
    D.label(x, y + h + 48, fmt(S.Tg, 0) + ' °C', { bg: col, size: 14 });
  }

  function drawGraph(G, t) {
    const { x: gx, y: gy, w: gw, h: gh } = G;
    D.shadow(() => { D.roundRect(gx, gy, gw, gh, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 5, color: 'rgba(40,60,110,.2)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(gx, gy, gw, gh, 14); ctx.stroke();
    const pad = { l: 52, r: 18, t: 40, b: 42 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const X = { min: -50, max: 150, step: 50 }, Y = { min: 0, max: 100, step: 20 };
    const px = (v) => x0 + (v - X.min) / (X.max - X.min) * (x1 - x0);
    const py = (v) => y0 - (v - Y.min) / (Y.max - Y.min) * (y0 - y1);
    D.text(gx + 14, gy + 25, '📈 온도–부피 그래프', { size: 14, weight: 800, color: '#34405a', align: 'left' });
    ctx.font = D.font(13, 600); ctx.fillStyle = '#5d6879'; ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let v = X.min; v <= X.max; v += X.step) {
      ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(v, px(v), y0 + 17);
    }
    for (let v = Y.min; v <= Y.max; v += Y.step) {
      ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(v, x0 - 8, py(v) + 4);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke(); ctx.lineCap = 'butt';
    D.text((x0 + x1) / 2, y0 + 35, '온도 (°C)', { size: 13, weight: 800, color: '#5d6879' });
    ctx.save(); ctx.translate(gx + 16, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '부피 (mL)', { size: 13, weight: 800, color: '#5d6879' }); ctx.restore();

    const cx = px(clamp(S.Tg, X.min, X.max)), cy = py(clamp(Vof(S.Tg), Y.min, Y.max));
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(242,107,58,.4)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, y0); ctx.moveTo(cx, cy); ctx.lineTo(x0, cy); ctx.stroke(); ctx.restore();

    const pts = S.data.slice().sort((a, b) => a.T - b.T);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p.T), py(p.V)) : ctx.moveTo(px(p.T), py(p.V)))); ctx.stroke(); ctx.lineCap = 'butt';
    }
    pts.forEach((p) => {
      const k = ease.outBack(Math.min(1, p.k == null ? 1 : p.k));
      D.sphere(px(p.T), py(p.V), 7.5 * k, '#8b5cf6', { shadow: true, outline: '#fff', outlineWidth: 2 });
    });
    const pulse = 8 + (RM ? 0 : Math.sin(t * 5) * 2);
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, TAU); ctx.fill();
    if (!S.data.length) D.text(x1 - 4, y1 + 16, '📍 기록하기를 누르면 점이 찍혀요', { size: 13, weight: 700, color: '#7b8798', align: 'right' });
  }
  function graphPoint(d) {
    const G = GRAPH, pad = { l: 52, r: 18, t: 40, b: 42 };
    const x0 = G.x + pad.l, x1 = G.x + G.w - pad.r, y0 = G.y + G.h - pad.b, y1 = G.y + pad.t;
    return { x: x0 + (d.T + 50) / 200 * (x1 - x0), y: y0 - d.V / 100 * (y0 - y1) };
  }

  /* ---------- 탁구공 장면 ---------- */
  const POT = { x: 452, y: 214, w: 280, h: 270, water: 262 };
  const BALL_R = 62;
  const LENS = { cx: 138, cy: 176, r: 84 };
  function resetBall() {
    S.ball = { x: 180, y: TABLE - BALL_R, vy: 0, inWater: false, T: 20, dent: 20, drag: null, popped: false };
    S.ballParts = [];
    S.ripples.length = 0; S.lift = 0;
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * (BALL_R - 16), sp = 110 * (0.7 + Math.random() * 0.6);
      S.ballParts.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r, vx: Math.cos(a + 1) * sp, vy: Math.sin(a + 1) * sp });
    }
  }
  const inPot = (x) => x > POT.x + 16 && x < POT.x + POT.w - 16;
  function splash(x) {
    S.ripples.push({ x, t: 0 });
    if (RM) return;
    for (let i = 0; i < 12; i++) FX.emit({ x: x + rand(-30, 30), y: POT.water, vx: rand(-60, 60), vy: -rand(90, 220), life: rand(0.5, 0.9), size: rand(2.5, 4.5), color: '#ffc29a', gravity: 520, shape: 'circle' });
  }
  function stepPong(dt) {
    const b = S.ball;
    S.lift = ap(S.lift, b.drag ? 1 : 0, dt, 14);
    S.bsq.update(dt);
    if (!b.drag) {
      if (b.inWater) {
        // 물 위에 떠서 살짝 출렁임
        const ty = POT.water + BALL_R * 0.35 + (RM ? 0 : Math.sin(performance.now() / 500) * 2);
        b.y += (ty - b.y) * Math.min(1, dt * 6);
        b.x += (clamp(b.x, POT.x + BALL_R + 6, POT.x + POT.w - BALL_R - 6) - b.x) * Math.min(1, dt * 8);
      } else if (b.y < TABLE - BALL_R) {
        // 탁자 위로 떨어짐
        b.vy += 1800 * dt; b.y = Math.min(TABLE - BALL_R, b.y + b.vy * dt);
        if (b.y >= TABLE - BALL_R) { S.bsq.velocity = Math.min(8, b.vy / 130); b.vy = 0; Sound.tick(); }
      }
    }
    b.T += ((b.inWater ? 80 : 20) - b.T) * Math.min(1, dt * (b.inWater ? 0.9 : 0.15));
    const want = 20 * clamp((58 - b.T) / 34, 0, 1);
    if (want < b.dent) b.dent = want;                 // 한 번 펴지면 다시 찌그러지지 않음
    if (!b.popped && b.dent <= 0.01) {
      b.popped = true; b.dent = 0; Sound.success(); toast('뽁! 탁구공이 다시 펴졌어요 🏓');
      S.ripples.push({ x: b.x, y: b.y, t: 0, ball: true });
      FX.burst(b.x, b.y, { count: 14, speed: 150, life: 0.7, colors: ['#ffb066', '#fff3e0', '#ffd166'], shape: 'star' });
    }
    // 공 속 입자
    const sc = (b.T + 273) / 293;
    const lim = BALL_R - 10;
    for (let i = 0; i < S.ballParts.length; i++) {
      const p = S.ballParts[i];
      const k = sc * 110 / Math.max(1, Math.hypot(p.vx, p.vy)) * (p.base || (p.base = Math.hypot(p.vx, p.vy) / 110));
      p.vx *= k; p.vy *= k;
      p.dx += p.vx * dt; p.dy += p.vy * dt;
      const d = Math.hypot(p.dx, p.dy);
      if (d > lim) {
        const nx = p.dx / d, ny = p.dy / d, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
        p.dx = nx * lim; p.dy = ny * lim;
      }
    }
    for (let i = S.ripples.length - 1; i >= 0; i--) { S.ripples[i].t += dt; if (S.ripples[i].t > 1.4) S.ripples.splice(i, 1); }
    // 뜨거운 물의 김과 거품
    if (!RM) {
      if (Math.random() < dt * 5) FX.emit({ x: POT.x + rand(30, POT.w - 30), y: POT.water - 4, vx: rand(-8, 8), vy: -rand(26, 46), life: rand(1.2, 1.9), size: rand(10, 16), color: 'rgba(255,255,255,.7)', shape: 'smoke', grow: 12 });
      if (Math.random() < dt * 4) FX.emit({ x: POT.x + rand(24, POT.w - 24), y: POT.y + POT.h - 12, vx: rand(-6, 6), vy: -rand(50, 90), life: (POT.y + POT.h - POT.water) / 70, size: rand(3, 5.5), color: 'rgba(255,255,255,.9)', shape: 'bubble' });
    }
  }
  // 찌그러진 곳: 오른쪽 위가 부드럽게 오목하게 들어간 모양
  function ballPath(x, y, r, dent) {
    const c = -Math.PI / 4, w = 0.8, N = 72;
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
  /* 공 → 돋보기 연결 (확대 원뿔) */
  function drawCone(b) {
    const L = LENS, r = L.r;
    const dx = L.cx - b.x, dy = L.cy - b.y, d = Math.hypot(dx, dy);
    if (d <= r + BALL_R) return;
    const th = Math.atan2(dy, dx), be = Math.acos((BALL_R - r) / d);
    const a1 = th + be, a2 = th - be;
    const x1 = b.x + BALL_R * Math.cos(a1), y1 = b.y + BALL_R * Math.sin(a1), x2 = L.cx + r * Math.cos(a1), y2 = L.cy + r * Math.sin(a1);
    const x3 = L.cx + r * Math.cos(a2), y3 = L.cy + r * Math.sin(a2), x4 = b.x + BALL_R * Math.cos(a2), y4 = b.y + BALL_R * Math.sin(a2);
    ctx.save();
    ctx.fillStyle = 'rgba(139,92,246,.10)';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.moveTo(x4, y4); ctx.lineTo(x3, y3); ctx.stroke();
    ctx.restore();
  }
  /* 🔍 돋보기 창: 탁구공 속 입자를 크게 */
  function drawLens(b, t) {
    const L = LENS, r = L.r;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L.cx, L.cy, r + 7, 0, TAU); ctx.fill(); }, { blur: 20, y: 6, color: 'rgba(40,30,90,.25)' });
    ctx.save();
    ctx.beginPath(); ctx.arc(L.cx, L.cy, r, 0, TAU); ctx.clip();
    const hotK = clamp((b.T - 20) / 60, 0, 1);
    ctx.fillStyle = mix('#f1f6ff', '#fff0e4', hotK); ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    // 공의 안쪽 벽(찌그러진 모양 포함)
    const sc = (r - 6) / (BALL_R + 2);
    ctx.save(); ctx.translate(L.cx, L.cy); ctx.scale(sc, sc);
    ballPath(0, 0, BALL_R, b.dent);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
    ctx.lineWidth = 4 / sc; ctx.strokeStyle = '#e08a2e'; ctx.stroke();
    ctx.restore();
    const col = PCOL[clamp(Math.round((((b.T + 273) / 293) - 0.76) / 0.68 * 6), 0, 6)];
    ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < S.ballParts.length; i++) { const p = S.ballParts[i]; const qx = L.cx + p.dx * sc, qy = L.cy + p.dy * sc; ctx.moveTo(qx, qy); ctx.lineTo(qx - p.vx * 0.06 * sc, qy - p.vy * 0.06 * sc); }
    ctx.stroke(); ctx.lineCap = 'butt';
    for (let i = 0; i < S.ballParts.length; i++) { const p = S.ballParts[i]; sprites.draw(col, L.cx + p.dx * sc, L.cy + p.dy * sc, 7.5); }
    const gl = ctx.createLinearGradient(L.cx - r, L.cy - r, L.cx + r * 0.2, L.cy + r * 0.2);
    gl.addColorStop(0, 'rgba(255,255,255,.4)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    ctx.restore();
    const rg = ctx.createLinearGradient(L.cx - r, L.cy - r, L.cx + r, L.cy + r);
    rg.addColorStop(0, '#c4b5fd'); rg.addColorStop(0.5, '#7c3aed'); rg.addColorStop(1, '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(L.cx, L.cy, r + 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(L.cx, L.cy, r - 4, Math.PI * 1.1, Math.PI * 1.42); ctx.stroke();
    // 손잡이
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(L.cx + r * 0.72, L.cy + r * 0.72); ctx.lineTo(L.cx + r * 0.72 + 30, L.cy + r * 0.72 + 30); ctx.stroke();
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(L.cx + r * 0.72, L.cy + r * 0.72); ctx.lineTo(L.cx + r * 0.72 + 30, L.cy + r * 0.72 + 30); ctx.stroke();
    ctx.restore();
    D.label(L.cx, L.cy - r - 18, '🔍 탁구공 속 공기 ' + fmt(b.T, 0) + ' °C', { bg: '#5b21b6', size: 13 });
  }
  function drawPongScene(t) {
    const b = S.ball;
    pongBG.draw();
    D.text(20, 34, '❓ 찌그러진 탁구공을 뜨거운 물에 넣으면?', { size: 14, weight: 800, color: '#4a5568', align: 'left' });
    // 비커 속 뜨거운 물
    const pw = POT.w, px0 = POT.x, wy = POT.water;
    ctx.save();
    D.roundRect(px0 + 3, POT.y, pw - 6, POT.h - 3, 10); ctx.clip();
    ctx.beginPath(); ctx.moveTo(px0, POT.y + POT.h);
    for (let i = 0; i <= 28; i++) {
      const xx = px0 + pw * i / 28;
      let wv = RM ? 0 : Math.sin(t * 2.3 + i * 0.7) * 1.6;
      for (let k = 0; k < S.ripples.length; k++) { const rp = S.ripples[k]; if (rp.ball) continue; const dd = Math.abs(xx - rp.x) - rp.t * 130; wv += Math.exp(-(dd * dd) / 160) * 4 * (1 - rp.t / 1.4); }
      ctx.lineTo(xx, wy + wv);
    }
    ctx.lineTo(px0 + pw, POT.y + POT.h); ctx.closePath();
    const wgd = ctx.createLinearGradient(0, wy, 0, POT.y + POT.h);
    wgd.addColorStop(0, 'rgba(255,170,120,.38)'); wgd.addColorStop(1, 'rgba(255,125,70,.58)');
    ctx.fillStyle = wgd; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(px0 + 4, wy - 1, pw - 8, 3);
    ctx.restore();
    // 공 (물 위에 있을 때 앞쪽 물을 다시 그려 잠긴 느낌)
    drawCone(b);
    drawBall(b, t);
    if (b.inWater && !b.drag) {
      ctx.save(); ballPath(b.x, b.y, BALL_R + 3, b.dent); ctx.clip();
      ctx.fillStyle = 'rgba(255,150,100,.42)';
      ctx.fillRect(POT.x + 2, POT.water, POT.w - 4, POT.y + POT.h - POT.water);
      ctx.restore();
    }
    // 비커 유리(앞)
    D.beaker(POT.x, POT.y, POT.w, POT.h, { level: 0, ticks: 6, glass: '#8fa3bd' });
    D.label(POT.x + POT.w / 2, POT.y + POT.h + 26, '♨ 뜨거운 물 (약 80 °C)', { bg: '#c2410c', size: 14 });
    // 물결 고리
    for (let i = 0; i < S.ripples.length; i++) {
      const rp = S.ripples[i];
      if (rp.ball) { ctx.strokeStyle = `rgba(255,176,102,${0.7 * (1 - rp.t / 1.4)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R + rp.t * 90, 0, TAU); ctx.stroke(); continue; }
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - rp.t / 1.4)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(rp.x, wy, 20 + rp.t * 90, 5 + rp.t * 10, 0, 0, TAU); ctx.stroke();
    }
    // 안내: 끌어서 뜨거운 물에 넣기
    if (!b.inWater && !b.popped) {
      ctx.save(); ctx.setLineDash([9, 7]); ctx.lineDashOffset = RM ? 0 : -t * 24; ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      if (!b.drag) { ctx.beginPath(); ctx.moveTo(b.x + 44, b.y - 70); ctx.quadraticCurveTo(360, 70, POT.x + 100, POT.water - 40); ctx.stroke(); }
      ctx.restore();
      if (b.drag) D.ring(POT.x + POT.w / 2, POT.water, 70, t, { color: '#14a058' });
      else D.label(360, 118, '✋ 끌어서 뜨거운 물에 넣기', { bg: '#1b2333', size: 14 });
      if (!b.drag && isNew('pong')) D.ring(b.x, b.y, BALL_R + 14, t, { color: '#8b5cf6' });
    }
    drawLens(b, t);
  }
  function drawBall(b, t) {
    const lift = S.lift, sq = S.bsq.value;
    // 그림자
    if (!b.inWater) {
      const hgt = clamp((TABLE - BALL_R - b.y) / 300, 0, 1);
      ctx.fillStyle = `rgba(80,60,40,${0.26 - hgt * 0.14})`;
      ctx.beginPath(); ctx.ellipse(b.x, TABLE + 5, BALL_R * (0.85 - hgt * 0.3), 7, 0, 0, TAU); ctx.fill();
    }
    ctx.save();
    ctx.translate(b.x, b.y + BALL_R);
    ctx.scale((1 + 0.05 * lift) * (1 + 0.05 * sq), (1 + 0.05 * lift) * (1 - 0.07 * sq));
    ctx.translate(-b.x, -(b.y + BALL_R));
    ballPath(b.x, b.y, BALL_R, b.dent);
    const g = ctx.createRadialGradient(b.x - 22, b.y - 24, 6, b.x, b.y, BALL_R);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, '#ffd9a8'); g.addColorStop(1, '#f39a4a');
    if (lift > 0.02) D.shadow(() => { ctx.fillStyle = '#f39a4a'; ctx.fill(); }, { blur: 8 + lift * 16, y: 5 + lift * 12, color: 'rgba(120,60,10,.35)' });
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ballPath(b.x, b.y, BALL_R, b.dent); ctx.clip();
    // 찌그러진 곳의 그늘
    if (b.dent > 0.4) {
      const dc = { x: b.x + Math.cos(-Math.PI / 4) * (BALL_R - b.dent * 0.8), y: b.y + Math.sin(-Math.PI / 4) * (BALL_R - b.dent * 0.8) };
      const dg = ctx.createRadialGradient(dc.x, dc.y, 2, dc.x, dc.y, 40);
      dg.addColorStop(0, `rgba(120,50,10,${0.1 + b.dent / 20 * 0.28})`); dg.addColorStop(1, 'rgba(120,50,10,0)');
      ctx.fillStyle = dg; ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);
    }
    // 공 속 입자 (작게)
    const col = PCOL[clamp(Math.round((((b.T + 273) / 293) - 0.76) / 0.68 * 6), 0, 6)];
    for (let i = 0; i < S.ballParts.length; i++) { const p = S.ballParts[i]; sprites.draw(col, b.x + p.dx, b.y + p.dy, 4.5); }
    ctx.restore();
    // 광택 + 테두리
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(b.x - 22, b.y - 30, 17, 9, -0.6, 0, TAU); ctx.fill();
    ballPath(b.x, b.y, BALL_R, b.dent);
    ctx.strokeStyle = b.drag ? '#f26b3a' : '#d9822a'; ctx.lineWidth = b.drag ? 3.5 : 2.5; ctx.stroke();
    ctx.restore();
    if (b.dent > 0.5) D.label(b.x + 66, b.y - 74, '찌그러진 곳', { bg: '#fff4e6', color: '#9a3412', size: 13, border: '#f5b57a' });
  }

  /* ---------- 장면 전환 & 화면 요소 ---------- */
  function setScene(sc, force) {
    if (S.scene === sc && !force) return;
    if (S.scene !== sc) { FX.clear(); S.sceneT = 0; }
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
  function setT(v, instant) { S.Tset = v; rangeT.set(v); if (instant) { S.Tg = v; S.Vd.value = Vof(v); S.Vd.velocity = 0; } }
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
      if (b.inWater) { Sound.tick(); splash(b.x); }
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
    const d = { T, V, k: 0 };
    const i = S.data.findIndex((x) => Math.abs(x.T - T) < 5);
    if (i >= 0) { S.data[i] = d; S.fresh = i; } else { if (S.data.length >= 9) S.data.shift(); S.data.push(d); S.fresh = S.data.length - 1; }
    renderTable();
    if (on('record')) { const q = graphPoint(d); FX.burst(q.x, q.y, { count: 10, speed: 90, life: 0.6, colors: ['#8b5cf6', '#c4b5fd', '#f26b3a'] }); }
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
      if (o.t >= 2) { o.done = true; Sound.tick(); FX.burst(CYL.x + CYL.w / 2, pistonY(S.Vd.value) + 50, { count: 8, speed: 80, life: 0.5, colors: ['#14a058', '#8b5cf6'] }); }
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

  /* 미션 성공 순간을 감지해 화면 위에 축하 효과 */
  function winSpot() {
    if (S.scene === 'pong') return { x: S.ball.x, y: S.ball.y - BALL_R - 50 };
    return on('record') ? { x: 338, y: 474 } : { x: CYL.x + CYL.w + 64, y: 150 };
  }
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) { const w = winSpot(); celebrate(w.x, w.y); }
    lastPhase = ph; lastIdx = idx;
  }

  /* ---------- 시작 ---------- */
  if (!S.scene) setScene(LEVEL_SCENE[game.level] || 'cyl');
  if (!S.ballParts.length) resetBall();
  refreshUI();
  function draw(t) {
    view.clear(BG);
    if (S.scene === 'pong') drawPongScene(t); else drawCylScene(t);
    FX.draw(ctx);
    drawChecks(t);
    if (S.sceneT < 0.4) {       // 장면 전환: 부드럽게 나타나기
      ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.4);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, 800, 520); ctx.restore();
    }
  }
  SciSim.loop((dt, t) => {
    step(dt);
    if (S.scene === 'pong') stepPong(dt);
    watchCompare(dt);
    draw(now());
    updateReadouts(t);
    watchGame();
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    S, view, parts, setScene, setT,
    feat(list) { F = new Set(list); refreshUI(); },
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { step(1 / 60); if (S.scene === 'pong') stepPong(1 / 60); } },
    nan() { return parts.some((p) => p.x !== p.x || p.y !== p.y); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / 800, y: r.top + (y * r.height) / 520 }; },
  };
})();
