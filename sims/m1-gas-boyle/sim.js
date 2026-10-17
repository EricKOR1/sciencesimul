/* =========================================================
   중1 Ⅵ. 기체의 성질 — 압력과 부피 [9과06-02]
   ① [관찰] 끝을 막은 주사기의 피스톤 누르기
   ② [실험] 부피·압력 측정 → 표와 그래프 → 관계 찾기
   ③ [설명] 입자 모형으로 해석 (온도 일정: 입자 수·크기·빠르기 그대로, 충돌 횟수 증가)
   ④ [적용] 생활 속 예
   ※ 정성적 설명에 주안점: 계산·예측 미션 없음 (측정값은 실험 결과로만 표시)
   ※ 그림은 assets/js/anim.js(애니메이션 도구)로 그림: 광택 입자, 유리 주사기, 부드러운 움직임, 성공 효과
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
  const FX = new SciSim.Particles();          // 기록할 때·목표에 닿을 때·미션 성공 효과
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

  /* ---------- 상태 ---------- */
  const V0 = 40, VMIN = 10, VMAX = 50;      // 처음 부피 40 mL에서 1기압
  const S = {
    V: V0, Vs: V0, needle: 1, needleSp: new SciSim.Spring(1, { stiffness: 150, damping: 12 }),
    data: [], fresh: -1,
    target: null, stage1: 0, lastStage: 0,
    dragging: false, dragOff: 0, hl: 0, hlSp: new SciSim.Spring(0, { stiffness: 260, damping: 14 }),
    showParticles: true, showHits: true,
    hits: [], flashes: [],
    pk: 1,                                   // 입자 모형이 보이는 정도 (0~1)
    g: { cx: 570, cy: 250, r: 124 },          // 압력계 위치(부드럽게 이동)
    k: { gauge: 0, graph: 0 },
    pulse: 0, tgPrev: null,
    big: { t: 0, done: false, rate: 0 }, small: { t: 0, done: false, rate: 0 },
  };
  const P = () => V0 / S.Vs;               // 온도가 일정할 때 기체의 압력 (측정값)

  /* ---------- 주사기 ---------- */
  const SYR = { x: 96, w: 180, bottom: 440, top: 112 };
  const PX = 6;                             // 1 mL당 픽셀
  const pistonY = (V) => SYR.bottom - V * PX;
  const TIP = { x: SYR.x + SYR.w / 2 };
  const GRAPH = { x: 352, y: 246, w: 436, h: 262 };
  const G_SMALL = { cx: 566, cy: 126, r: 84 }, G_BIG = { cx: 570, cy: 250, r: 124 };

  /* ---------- 입자 ---------- */
  const NP = 30, R = 6, SPEED = 210;
  const COL_P = '#3d6df2';
  const parts = [];
  for (let i = 0; i < NP; i++) {
    const a = Math.random() * Math.PI * 2, sp = SPEED * (0.65 + Math.random() * 0.7);
    parts.push({ x: SYR.x + R + Math.random() * (SYR.w - 2 * R), y: pistonY(V0) + R + Math.random() * (V0 * PX - 2 * R), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }
  function stepParticles(dt) {
    const top = pistonY(S.Vs);
    const L = SYR.x + R, Rr = SYR.x + SYR.w - R, B = SYR.bottom - R, T = top + R;
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
        if (p.vy < 0) {
          p.vy = Math.abs(p.vy);
          S.hits.push(nw);
          S.pulse = Math.min(1, S.pulse + 0.06);
          if (fl && S.flashes.length < 50) S.flashes.push({ x: p.x, y: top, t: nw });
        }
      }
    }
    let n = 0;
    while (n < S.hits.length && nw - S.hits[n] > 2000) n++;
    if (n) S.hits.splice(0, n);
    let w = 0;
    for (let i = 0; i < S.flashes.length; i++) if (nw - S.flashes[i].t < 380) S.flashes[w++] = S.flashes[i];
    S.flashes.length = w;
  }
  const hitRate = () => S.hits.length / 2;

  function step(dt) {
    S.Vs += (S.V - S.Vs) * Math.min(1, dt * 12);
    if (Math.abs(S.V - S.Vs) < 0.02) S.Vs = S.V;
    S.needle += (P() - S.needle) * Math.min(1, dt * 8);
    S.needleSp.target = S.needle; S.needleSp.update(dt);
    S.hlSp.target = S.dragging ? 1 : 0; S.hlSp.update(dt); S.hl = S.hlSp.value;
    S.pulse = ap(S.pulse, 0, dt, 10);
    // 입자 모형 켜짐/꺼짐, 새 도구 등장, 압력계 이동: 모두 부드럽게
    const showP = on('particles') && S.showParticles;
    S.pk = RM ? (showP ? 1 : 0) : ap(S.pk, showP ? 1 : 0, dt, 7);
    S.k.gauge = RM ? (on('gauge') ? 1 : 0) : ap(S.k.gauge, on('gauge') ? 1 : 0, dt, 5);
    S.k.graph = RM ? (on('record') ? 1 : 0) : ap(S.k.graph, on('record') ? 1 : 0, dt, 5);
    const tg = on('record') ? G_SMALL : G_BIG;
    S.g.cx = ap(S.g.cx, tg.cx, dt, 6); S.g.cy = ap(S.g.cy, tg.cy, dt, 6); S.g.r = ap(S.g.r, tg.r, dt, 6);
    for (let i = 0; i < S.data.length; i++) { const d = S.data[i]; if (d.k < 1) d.k = Math.min(1, d.k + dt * 3.2); }
    // 목표선에 닿은 순간 효과
    if (S.stage1 > S.lastStage && S.tgPrev != null) FX.burst(SYR.x + SYR.w / 2, pistonY(S.tgPrev), { count: 12, speed: 110, life: 0.6, colors: ['#14a058', '#ffb400', '#8b5cf6'] });
    S.lastStage = S.stage1;
    if (S.target) S.tgPrev = S.target.V;
    FX.update(dt);
    stepParticles(dt);
  }

  /* ---------- 그리기 도우미 ---------- */
  function tube(pts, w) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    ctx.strokeStyle = 'rgba(40,60,90,.2)'; ctx.lineWidth = w + 3; ctx.translate(0, 3); path(); ctx.stroke(); ctx.translate(0, -3);
    ctx.strokeStyle = '#7f8da3'; ctx.lineWidth = w; path(); ctx.stroke();
    ctx.strokeStyle = '#c9d3e1'; ctx.lineWidth = w * 0.38; ctx.translate(-w * 0.14, -w * 0.14); path(); ctx.stroke();
    ctx.restore();
  }

  function draw(t) {
    view.clear(BG);
    gasBG.draw();
    const g = S.g;
    D.text(300, 28, '🌡 온도 일정', { size: 13, weight: 800, color: '#5d6879', align: 'left' });
    if (S.k.gauge > 0.01) { ctx.save(); ctx.globalAlpha = Math.min(1, S.k.gauge * 1.5); drawTube(g); ctx.restore(); }
    drawSyringe(t);
    if (S.k.gauge > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.k.gauge * 1.5);
      const sc = 0.85 + 0.15 * ease.outBack(Math.min(1, S.k.gauge));
      ctx.translate(g.cx, g.cy); ctx.scale(sc, sc); ctx.translate(-g.cx, -g.cy);
      drawGauge(g.cx, g.cy, g.r);
      ctx.restore();
      if (isNew('gauge')) { D.ring(g.cx, g.cy, g.r + 14, t, { color: '#8b5cf6' }); newBadge(g.cx + g.r * 0.78, g.cy - g.r * 0.9); }
    }
    if (S.k.graph > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, S.k.graph * 1.4);
      ctx.translate((1 - ease.outCubic(S.k.graph)) * 36, 0);
      drawGraph(GRAPH, t);
      ctx.restore();
      if (isNew('record')) newRect(GRAPH.x, GRAPH.y, GRAPH.w, GRAPH.h, t);
    }
    FX.draw(ctx);
    drawChecks(t);
  }

  function drawTube(g) {
    tube([[TIP.x, SYR.bottom + 30], [TIP.x, 500], [326, 500], [326, g.cy], [g.cx - g.r + 4, g.cy]], 8);
  }

  function drawSyringe(t) {
    const top = pistonY(S.Vs);
    const x0 = SYR.x, x1 = SYR.x + SYR.w, cx = x0 + SYR.w / 2;
    const gasH = SYR.bottom - top;
    const pk = S.pk;
    // 몸통 뒤쪽 유리 + 안쪽 기체
    D.shadow(() => { D.roundRect(x0 - 2, SYR.top, SYR.w + 4, SYR.bottom - SYR.top + 4, 8); ctx.fillStyle = '#e8f0fb'; ctx.fill(); }, { blur: 22, y: 8, color: 'rgba(40,60,110,.28)' });
    const bg = ctx.createLinearGradient(x0, 0, x1, 0);
    bg.addColorStop(0, 'rgba(238,245,255,.9)'); bg.addColorStop(0.5, 'rgba(250,252,255,.7)'); bg.addColorStop(1, 'rgba(220,232,250,.9)');
    D.roundRect(x0, SYR.top, SYR.w, SYR.bottom - SYR.top, 6); ctx.fillStyle = bg; ctx.fill();
    // 기체: 압축될수록 진해지는 색(입자 모형이 꺼져 있을 때) ↔ 입자 모형
    const dens = clamp((V0 / S.Vs) / 4, 0, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, top, SYR.w, gasH); ctx.clip();
    const tg = ctx.createLinearGradient(0, top, 0, SYR.bottom);
    tg.addColorStop(0, `rgba(110,150,245,${0.2 + dens * 0.4})`); tg.addColorStop(1, `rgba(70,110,230,${0.14 + dens * 0.38})`);
    ctx.globalAlpha = 1 - pk * 0.85; ctx.fillStyle = tg; ctx.fillRect(x0, top, SYR.w, gasH);
    ctx.globalAlpha = pk; ctx.fillStyle = '#f4f8ff'; ctx.fillRect(x0, top, SYR.w, gasH);
    ctx.globalAlpha = 1;
    if (pk < 0.98) {
      ctx.globalAlpha = 1 - pk;
      D.text(cx, top + gasH / 2 + 6, '공기', { size: 16, weight: 800, color: '#2f4ea8', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
      ctx.globalAlpha = 1;
    }
    if (pk > 0.02) {
      ctx.globalAlpha = pk;
      // 목표선은 입자 아래에 깔림
      // 꼬리 → 광택 입자 → 충돌 고리
      ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < parts.length; i++) { const p = parts[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); }
      ctx.stroke(); ctx.lineCap = 'butt';
      for (let i = 0; i < parts.length; i++) sprites.draw(COL_P, parts[i].x, parts[i].y, R);
      const nw = performance.now();
      ctx.lineWidth = 2.5;
      for (let i = 0; i < S.flashes.length; i++) {
        const f = S.flashes[i], a = 1 - (nw - f.t) / 380;
        ctx.strokeStyle = `rgba(242,107,58,${a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 12, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(255,190,120,${a * 0.45})`; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + (1 - a) * 6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 안쪽 그늘(입체감)
    const sh = ctx.createLinearGradient(x0, 0, x0 + 22, 0); sh.addColorStop(0, 'rgba(60,90,140,.14)'); sh.addColorStop(1, 'rgba(60,90,140,0)');
    ctx.fillStyle = sh; ctx.fillRect(x0, top, 22, gasH);
    ctx.restore();

    // 🔍 입자 모형 표시(돋보기 테두리)
    if (pk > 0.02) {
      ctx.save(); ctx.globalAlpha = pk;
      ctx.setLineDash([9, 6]); ctx.lineDashOffset = RM ? 0 : -t * 14;
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3;
      D.roundRect(x0 + 2, top + 2, SYR.w - 4, gasH - 4, 5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(x1 - 4, SYR.bottom - 4); ctx.lineTo(x1 + 30, SYR.bottom + 30); ctx.stroke();
      ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x1 - 4, SYR.bottom - 4); ctx.lineTo(x1 + 30, SYR.bottom + 30); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = pk;
      D.label(SYR.x - 36, SYR.bottom + 54, '🔍 입자 모형', { bg: '#5b21b6', size: 13, align: 'left' });
      ctx.restore();
    }

    // 목표선
    if (S.target) {
      const ty = pistonY(S.target.V);
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.save();
      ctx.setLineDash([9, 6]); ctx.lineDashOffset = RM ? 0 : -t * 22; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0 - 26, ty); ctx.lineTo(x1 + 18, ty); ctx.stroke();
      ctx.restore();
      D.ring(x1 + 8, ty, 7 + pulse * 2, t, { color: '#14a058', width: 2 });
      D.label(x1 + 24, ty, S.target.label, { bg: '#14a058', size: 13, align: 'left' });
    }

    // 주사기 몸통(유리 벽) + 하이라이트
    const wallG = ctx.createLinearGradient(x0 - 3, 0, x0 + 3, 0); wallG.addColorStop(0, '#6f7e95'); wallG.addColorStop(1, '#a6b3c7');
    ctx.fillStyle = wallG; ctx.fillRect(x0 - 3, SYR.top, 5, SYR.bottom - SYR.top + 2);
    const wallG2 = ctx.createLinearGradient(x1 - 2, 0, x1 + 4, 0); wallG2.addColorStop(0, '#a6b3c7'); wallG2.addColorStop(1, '#6f7e95');
    ctx.fillStyle = wallG2; ctx.fillRect(x1 - 2, SYR.top, 5, SYR.bottom - SYR.top + 2);
    ctx.strokeStyle = '#8190a6'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 - 1, SYR.bottom); ctx.lineTo(x1 + 1, SYR.bottom); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 9, SYR.top + 16); ctx.lineTo(x0 + 9, SYR.bottom - 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1 - 9, SYR.top + 30); ctx.lineTo(x1 - 9, SYR.bottom - 40); ctx.stroke();
    ctx.lineCap = 'butt';
    // 손가락 걸이(플랜지)
    const fg = ctx.createLinearGradient(0, SYR.top - 8, 0, SYR.top + 6); fg.addColorStop(0, '#c4cedc'); fg.addColorStop(1, '#7d8ba1');
    D.shadow(() => { D.roundRect(x0 - 24, SYR.top - 8, SYR.w + 48, 12, 5); ctx.fillStyle = '#8190a6'; ctx.fill(); }, { blur: 6, y: 3 });
    D.roundRect(x0 - 24, SYR.top - 8, SYR.w + 48, 12, 5); ctx.fillStyle = fg; ctx.fill();
    // 끝 (막힘 → 압력계 연결)
    const ng = ctx.createLinearGradient(TIP.x - 26, 0, TIP.x + 26, 0); ng.addColorStop(0, '#8a97ab'); ng.addColorStop(0.4, '#d4dbe6'); ng.addColorStop(1, '#7d8ba1');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.moveTo(TIP.x - 28, SYR.bottom + 1); ctx.lineTo(TIP.x + 28, SYR.bottom + 1); ctx.lineTo(TIP.x + 8, SYR.bottom + 19); ctx.lineTo(TIP.x - 8, SYR.bottom + 19); ctx.closePath(); ctx.fill();
    ctx.fillRect(TIP.x - 6, SYR.bottom + 17, 12, 16);
    if (S.k.gauge < 0.5) {
      ctx.save(); ctx.globalAlpha = 1 - S.k.gauge * 2;
      const cg = ctx.createLinearGradient(0, SYR.bottom + 28, 0, SYR.bottom + 44); cg.addColorStop(0, '#5a667c'); cg.addColorStop(1, '#2f3949');
      D.roundRect(TIP.x - 12, SYR.bottom + 28, 24, 15, 4); ctx.fillStyle = cg; ctx.fill();
      D.text(TIP.x + 20, SYR.bottom + 41, '← 끝을 막음', { size: 13, weight: 800, color: '#34405a', align: 'left' });
      ctx.restore();
    }

    // 눈금
    ctx.fillStyle = '#4a5568'; ctx.font = D.font(13, 700); ctx.textAlign = 'right';
    for (let v = 0; v <= 52; v += 5) {
      const y = pistonY(v);
      if (y < SYR.top + 4) break;
      ctx.strokeStyle = '#7d8ba1'; ctx.lineWidth = v % 10 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0 - (v % 10 === 0 ? 13 : 8), y); ctx.lineTo(x0 - 3, y); ctx.stroke();
      if (v % 10 === 0) ctx.fillText(v + '', x0 - 17, y + 4);
    }
    ctx.save(); ctx.translate(26, 300); ctx.rotate(-Math.PI / 2); D.text(0, 0, '부피 (mL)', { size: 13, weight: 800, color: '#4a5568' }); ctx.restore();

    // 피스톤: 고무 마개 + 금속판 + 막대 + 손잡이
    const ph = 16;
    const hy = handleY();
    ctx.save();
    const rod = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0); rod.addColorStop(0, '#e1e7f1'); rod.addColorStop(0.5, '#b4c0d2'); rod.addColorStop(1, '#8794ab');
    ctx.fillStyle = rod; ctx.fillRect(cx - 7, hy, 14, top - ph - hy);
    // 고무 마개(검정)
    const rg = ctx.createLinearGradient(0, top - 7, 0, top); rg.addColorStop(0, '#454e61'); rg.addColorStop(1, '#232a37');
    D.shadow(() => { D.roundRect(x0 + 1, top - 8, SYR.w - 2, 9, 3); ctx.fillStyle = '#232a37'; ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(0,0,0,.35)' });
    D.roundRect(x0 + 1, top - 8, SYR.w - 2, 9, 3); ctx.fillStyle = rg; ctx.fill();
    if (S.pulse > 0.03 && pk > 0.5) {   // 입자가 부딪힐 때마다 피스톤 아래가 살짝 반짝
      const eg = ctx.createLinearGradient(0, top, 0, top + 16); eg.addColorStop(0, `rgba(255,150,90,${S.pulse * 0.55})`); eg.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.fillStyle = eg; ctx.fillRect(x0 + 2, top + 1, SYR.w - 4, 16);
    }
    const pg = ctx.createLinearGradient(0, top - ph, 0, top - 7);
    pg.addColorStop(0, '#dde4ef'); pg.addColorStop(1, '#8e9ab0');
    D.roundRect(x0 + 3, top - ph, SYR.w - 6, 10, 4); ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = '#6b768a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(x0 + 10, top - ph + 2, SYR.w - 30, 2);
    ctx.restore();
    if (on('piston')) {
      const lift = S.hl;
      ctx.save();
      ctx.translate(cx, hy - 12);
      ctx.scale(1 + 0.07 * lift, 1 + 0.07 * lift);
      const hg = ctx.createLinearGradient(0, -16, 0, 16);
      hg.addColorStop(0, S.dragging ? '#ffb48f' : '#ffb996'); hg.addColorStop(1, S.dragging ? '#e0552a' : '#f26b3a');
      D.shadow(() => { D.roundRect(-62, -16, 124, 32, 16); ctx.fillStyle = '#e0552a'; ctx.fill(); }, { blur: 8 + lift * 16, y: 4 + lift * 8, color: 'rgba(120,40,10,.4)' });
      D.roundRect(-62, -16, 124, 32, 16); ctx.fillStyle = hg; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(-50, -13, 100, 6, 3); ctx.fill();
      D.text(0, 5, '↕ 끌기', { size: 15, weight: 800, color: '#fff', stroke: 'rgba(140,40,10,.45)', strokeWidth: 3 });
      ctx.restore();
      if (isNew('piston')) D.ring(cx, hy - 12, 70, t, { color: '#f26b3a' });
    }
    if (isNew('particles') && pk > 0.5) { D.ring(x1 + 14, SYR.bottom + 14, 24, t, { color: '#8b5cf6' }); newBadge(x1 + 52, SYR.bottom - 8); }
    if (isNew('hits') && S.showHits && pk > 0.5) newBadge(x1 + 30, top - 8);
  }
  const handleY = () => Math.max(34, pistonY(S.Vs) - 96);

  function drawGauge(cx, cy, r) {
    const maxP = 4, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = (p) => a0 + (a1 - a0) * clamp(p / maxP, 0, 1);
    const big = r > 100;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#dde4ee'; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill(); }, { blur: 16, y: 6, color: 'rgba(30,50,90,.3)' });
    const bz = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bz.addColorStop(0, '#f4f7fb'); bz.addColorStop(0.5, '#b4c0d2'); bz.addColorStop(1, '#8794ab');
    ctx.fillStyle = bz; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
    const fgr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 4, cx, cy, r);
    fgr.addColorStop(0, '#ffffff'); fgr.addColorStop(1, '#eef2f8');
    ctx.fillStyle = fgr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(226,70,75,.22)'; ctx.lineWidth = big ? 15 : 12;
    ctx.beginPath(); ctx.arc(cx, cy, r - (big ? 16 : 14), ang(2.5), ang(4)); ctx.stroke();
    ctx.fillStyle = '#34405a'; ctx.font = D.font(big ? 17 : 14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= maxP + 1e-9; p += 0.5) {
      const a = ang(p), major = Math.abs(p % 1) < 1e-9;
      ctx.strokeStyle = '#34405a'; ctx.lineWidth = major ? 2.6 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - (major ? 21 : 16)), cy + Math.sin(a) * (r - (major ? 21 : 16)));
      ctx.stroke();
      if (major) ctx.fillText(p, cx + Math.cos(a) * (r - (big ? 37 : 33)), cy + Math.sin(a) * (r - (big ? 37 : 33)));
    }
    ctx.font = D.font(13, 800); ctx.fillStyle = '#5d6879';
    ctx.fillText('기압', cx, cy + r * 0.44);
    ctx.textBaseline = 'alphabetic';
    const a = ang(clamp(S.needleSp.value, -0.1, 4.2));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = big ? 5 : 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 12, cy - Math.sin(a) * 12); ctx.lineTo(cx + Math.cos(a) * (r - 17), cy + Math.sin(a) * (r - 17)); ctx.stroke();
    ctx.restore();
    D.sphere(cx, cy, 8, '#48546b', { shadow: true });
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.34, cy - r * 0.5, r * 0.5, r * 0.22, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    D.label(cx, cy + r + 26, '🧭 압력계  ' + fmt(S.needle, 2) + ' 기압', { bg: '#34405a', size: 14 });
  }

  function drawGraph(G, t) {
    const { x: gx, y: gy, w: gw, h: gh } = G;
    D.shadow(() => { D.roundRect(gx, gy, gw, gh, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 5, color: 'rgba(40,60,110,.2)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; D.roundRect(gx, gy, gw, gh, 14); ctx.stroke();
    const pad = { l: 50, r: 18, t: 40, b: 42 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const X = { min: 0, max: 50, step: 10 }, Y = { min: 0, max: 4, step: 1 };
    const px = (v) => x0 + (v - X.min) / (X.max - X.min) * (x1 - x0);
    const py = (v) => y0 - (v - Y.min) / (Y.max - Y.min) * (y0 - y1);
    D.text(gx + 14, gy + 24, '📈 부피–압력 그래프', { size: 14, weight: 800, color: '#34405a', align: 'left' });
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
    D.text((x0 + x1) / 2, y0 + 35, '부피 (mL)', { size: 13, weight: 800, color: '#5d6879' });
    ctx.save(); ctx.translate(gx + 16, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '압력 (기압)', { size: 13, weight: 800, color: '#5d6879' }); ctx.restore();

    // 지금의 값 → 축까지 점선 (살짝만)
    const cx = px(clamp(S.Vs, X.min, X.max)), cy = py(clamp(S.needle, Y.min, Y.max));
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(242,107,58,.4)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, y0); ctx.moveTo(cx, cy); ctx.lineTo(x0, cy); ctx.stroke(); ctx.restore();

    const pts = S.data.slice().sort((a, b) => a.V - b.V);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p.V), py(p.P)) : ctx.moveTo(px(p.V), py(p.P)))); ctx.stroke(); ctx.lineCap = 'butt';
    }
    pts.forEach((p) => {
      const k = ease.outBack(Math.min(1, p.k == null ? 1 : p.k));
      D.sphere(px(p.V), py(p.P), 7.5 * k, '#8b5cf6', { shadow: true, outline: '#fff', outlineWidth: 2 });
    });
    const pulse = 8 + (RM ? 0 : Math.sin(t * 5) * 2);
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, TAU); ctx.fill();
    if (!S.data.length) D.text(x1 - 4, y1 + 16, '📍 기록하기를 누르면 점이 찍혀요', { size: 13, weight: 700, color: '#7b8798', align: 'right' });
  }
  function graphPoint(d) {
    const G = GRAPH, pad = { l: 50, r: 18, t: 40, b: 42 };
    const x0 = G.x + pad.l, x1 = G.x + G.w - pad.r, y0 = G.y + G.h - pad.b, y1 = G.y + pad.t;
    return { x: x0 + d.V / 50 * (x1 - x0), y: y0 - d.P / 4 * (y0 - y1) };
  }

  /* ---------- 입력 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  const rangeV = SciSim.bindRange($('#sV'), $('#oV'), (v) => v + ' mL', (v) => { S.V = v; hideHint(); });
  function setV(v) { S.V = clamp(Math.round(v), VMIN, VMAX); rangeV.set(S.V); }

  $('#showHits').addEventListener('change', (e) => { S.showHits = e.target.checked; });
  const tgP = $('#tgParticles');
  function setParticles(onOff) { S.showParticles = onOff; tgP.setAttribute('aria-pressed', onOff ? 'true' : 'false'); }
  tgP.addEventListener('click', () => { Sound.click(); setParticles(!S.showParticles); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); setV(V0); });

  SciSim.pointer(view, {
    hover(p) { return on('piston') && hitPiston(p) ? 'ns-resize' : null; },
    down(p) {
      if (!on('piston') || !hitPiston(p)) return false;
      S.dragging = true; S.dragOff = p.y - pistonY(S.Vs); hideHint();
      return true;
    },
    move(p) { setV((SYR.bottom - (p.y - S.dragOff)) / PX); },
    up() { S.dragging = false; },
  });
  function hitPiston(p) {
    const top = pistonY(S.Vs), hy = handleY(), cx = SYR.x + SYR.w / 2;
    const onPlate = p.x > SYR.x - 10 && p.x < SYR.x + SYR.w + 10 && p.y > top - 30 && p.y < top + 10;
    const onRod = Math.abs(p.x - cx) < 70 && p.y > hy - 40 && p.y < top;
    return onPlate || onRod;
  }

  /* ---------- 기록 ---------- */
  function renderTable() {
    const rows = S.data.slice().sort((a, b) => b.V - a.V);
    const cols = Math.max(5, rows.length);
    const rv = $('#rowV'), rp = $('#rowP');
    rv.innerHTML = '<th>부피 (mL)</th>'; rp.innerHTML = '<th>압력 (기압)</th>';
    for (let i = 0; i < cols; i++) {
      const d = rows[i];
      const cls = d ? (d === S.data[S.fresh] ? 'fresh' : '') : 'empty';
      rv.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? d.V : '·') + '</td>');
      rp.insertAdjacentHTML('beforeend', '<td class="' + cls + '">' + (d ? d.P.toFixed(2) : '·') + '</td>');
    }
    $('#dataN').textContent = '기록 ' + S.data.length + '개';
  }
  $('#recBtn').addEventListener('click', () => {
    Sound.tick();
    S.Vs = S.V; S.needle = P();
    const V = Math.round(S.V);
    const d = { V, P: +(V0 / V).toFixed(2), k: 0 };
    const i = S.data.findIndex((x) => Math.abs(x.V - V) < 2);
    if (i >= 0) { S.data[i] = d; S.fresh = i; } else { if (S.data.length >= 9) S.data.shift(); S.data.push(d); S.fresh = S.data.length - 1; }
    renderTable();
    if (on('record')) { const q = graphPoint(d); FX.burst(q.x, q.y, { count: 10, speed: 90, life: 0.6, colors: ['#8b5cf6', '#c4b5fd', '#f26b3a'] }); }
    toast('📍 기록: 부피 ' + V + ' mL, 압력 ' + d.P.toFixed(2) + ' 기압');
  });
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.data = []; S.fresh = -1; renderTable(); });
  renderTable();

  /* ---------- 측정값 표시 ---------- */
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    $('#rV').innerHTML = fmt(S.Vs, 0) + '<small>mL</small>';
    $('#rP').innerHTML = fmt(S.needle, 2) + '<small>기압</small>';
    $('#rN').innerHTML = NP + '<small>개</small>';
    $('#rHits').innerHTML = fmt(hitRate(), 0) + '<small>회/초</small>';
  }

  // 3단계 미션 1: 큰 부피·작은 부피에서 각각 2초 동안 관찰
  function watchCompare(dt) {
    const m = game && game.current();
    if (!m || !m.compare || !game.isActive(m)) return;
    [['big', S.Vs >= 39.5], ['small', S.Vs <= 20.5]].forEach(([k, inside]) => {
      const o = S[k];
      if (o.done) return;
      o.t = inside ? o.t + dt : 0;
      if (o.t >= 2) { o.done = true; o.rate = hitRate(); Sound.tick(); FX.burst(SYR.x + SYR.w / 2, pistonY(S.Vs) + 40, { count: 8, speed: 80, life: 0.5, colors: ['#14a058', '#8b5cf6'] }); }
    });
  }

  /* ---------- 미션 ---------- */
  const mark = (b) => (b ? '✔' : '—');
  const distinctV = () => {
    const vals = S.data.map((d) => d.V).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    vals.forEach((v) => { if (v - last >= 4) { n++; last = v; } });
    return n;
  };
  function mini(kind) {
    let d;
    if (kind === 'up') d = 'M9 35 L58 7';
    else if (kind === 'flat') d = 'M9 21 L58 21';
    else if (kind === 'upcurve') d = 'M9 35 Q44 34 58 6';
    else {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const X = 0.2 + 0.8 * i / 14, Pp = 0.2 / X; pts.push((9 + 49 * (X - 0.2) / 0.8).toFixed(1) + ' ' + (36 - 30 * Pp).toFixed(1)); }
      d = 'M' + pts.join(' L');
    }
    return '<span style="display:inline-flex;align-items:center;gap:10px"><svg viewBox="0 0 64 42" width="64" height="42" aria-hidden="true" style="flex:none">' +
      '<path d="M6 3V38H61" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="' + d + '" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/></svg>';
  }
  const choiceG = (kind, text) => mini(kind) + '<span>' + text + '</span></span>';

  // 다시 열어서 표가 비어 있으면 먼저 기록하도록 안내
  function needData() { if (distinctV() < 3) toast('📋 표가 비어 있어요. 먼저 측정값을 몇 개 기록한 뒤 답해 보세요.', null, 3500); }

  game = SciSim.game({
    simId: 'm1-gas-boyle',
    mount: '#game',
    badge: '압력·부피 탐구가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      piston: '🖐️ 피스톤 손잡이',
      gauge: '🧭 압력계',
      record: '📋 실험 결과 표 · 📈 그래프',
      particles: '🔬 입자 모형',
      hits: '💥 충돌 표시',
    },
    onFeatures(set, added) {
      F = set;
      if (added.indexOf('particles') >= 0) setParticles(true);
    },
    onMissionStart() { S.target = null; },
    levels: [
      {
        title: '주사기 속 기체 누르기', short: '관찰', icon: '💉', phase: '관찰',
        features: ['piston', 'gauge'],
        intro: '<p>❓ <b>탐구 질문: 주사기 끝을 막고 피스톤을 누르면 어떻게 될까?</b></p>' +
          '<p>끝을 막은 주사기에 <b>압력계</b>를 연결했어요. 피스톤을 눌렀다가 당기며 기체의 <b>부피</b>와 <b>압력</b>이 어떻게 변하는지 관찰해 봐요.</p>',
        setup() { setV(V0); showHint('↕ 주황색 손잡이를 끌어 피스톤을 눌러 보세요', 6000); },
        recap: '피스톤을 눌러 기체의 <b>부피가 줄면 압력이 커지고</b>, 당겨서 부피가 늘면 압력이 작아져요.',
        summary: '<p>끝을 막은 주사기의 피스톤을 누르면 기체의 <b>부피가 줄어들고 압력은 커진다</b>. 피스톤을 당기면 부피가 늘어나고 압력은 작아진다.</p>',
        missions: [
          {
            title: '눌렀다가 당겨 보기',
            goal: '피스톤 손잡이를 끌어 ① 초록 선까지 <b>눌렀다가</b>, ② 다시 초록 선까지 <b>당겨</b> 보세요. 압력계 바늘을 지켜보세요.',
            hint: '주황색 손잡이를 위아래로 끌어요. <b>🖐️ 피스톤 위치</b> 슬라이더를 써도 돼요.',
            setup() { S.stage1 = 0; S.target = { V: 20, label: '① 여기까지 누르기' }; },
            check: () => {
              if (S.stage1 === 0 && S.Vs <= 20.5) { S.stage1 = 1; S.target = { V: 48, label: '② 여기까지 당기기' }; Sound.tick(); }
              else if (S.stage1 === 1 && S.Vs >= 47.5) { S.stage1 = 2; S.target = null; }
              return S.stage1 === 2;
            },
            status: () => '① 누르기 <b>' + mark(S.stage1 >= 1) + '</b> · ② 당기기 <b>' + mark(S.stage1 >= 2) + '</b> · 부피 <b>' + fmt(S.Vs, 0) + ' mL</b> · 압력 <b>' + fmt(S.needle, 2) + ' 기압</b>',
            hold: 0,
            explain: '피스톤을 누르자 기체의 <b>부피가 줄고 압력은 커졌어요</b>. 반대로 당기자 부피가 늘고 압력은 작아졌어요. 누를수록 손이 더 힘들게 느껴지는 것도 기체의 압력이 커지기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '관찰 결과 정리',
            goal: '온도가 일정할 때, 끝을 막은 주사기의 피스톤을 누르면 기체는 어떻게 될까요?',
            choices: ['부피가 줄고, 압력은 커진다', '부피가 줄고, 압력도 작아진다', '부피는 줄지만, 압력은 변하지 않는다', '부피도 압력도 변하지 않는다'],
            answer: 0,
            feedback: ['', '압력계 바늘이 어느 쪽으로 움직였나요?', '압력계 바늘이 움직였었죠?', '피스톤이 내려가며 기체가 차지하는 공간이 줄었어요.'],
            explain: '기체의 부피가 줄어들면 압력이 커져요. 두 변인 사이에 어떤 관계가 있는지, 다음 단계에서 여러 번 측정해 확인해 봐요.',
          },
        ],
      },
      {
        title: '측정하고 기록하기', short: '실험', icon: '📋', phase: '실험',
        features: ['record'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부피가 줄면 압력이 커지는 것을 관찰했어요.</div>' +
          '<p>이번에는 부피를 여러 번 바꾸며 압력을 <b>측정</b>하고, <b>표</b>와 <b>그래프</b>로 정리해 두 변인 사이의 관계를 찾아봐요.</p>',
        setup() { setV(V0); },
        recap: '온도가 일정할 때 기체의 <b>부피가 감소하면 압력은 증가</b>해요. 그래프는 부피가 커질수록 압력이 작아지는 곡선이에요.',
        summary: '<p>온도가 일정할 때 기체의 <b>부피가 감소하면 압력은 증가</b>하고, 부피가 증가하면 압력은 감소한다.</p>' +
          '<p>' + mini('curve') + '<span>부피–압력 그래프: 부피가 커질수록 압력이 작아지는 <b>곡선</b> (반비례 관계)</span></span></p>',
        missions: [
          {
            title: '측정값 기록하기',
            goal: '부피를 바꿔 가며 <b>📍 기록하기</b>를 눌러, 서로 다른 부피에서 측정값을 <b>5개</b> 이상 기록하세요.',
            hint: '50, 40, 30, 20, 10 mL처럼 고르게 바꿔 가며 기록하면 규칙이 잘 보여요.',
            check: () => distinctV() >= 5,
            status: () => '기록한 측정값: <b>' + Math.min(5, distinctV()) + ' / 5</b>',
            hold: 0,
            explain: '측정 결과가 표와 그래프에 모였어요. 이제 결과에서 두 변인 사이의 규칙을 찾아봐요.',
          },
          {
            type: 'quiz',
            title: '표에서 규칙 찾기',
            setup: needData,
            goal: '📋 실험 결과 표를 보세요. 기체의 <b>부피가 감소할 때</b> 압력은 어떻게 변하나요?',
            choices: ['압력도 감소한다', '압력은 증가한다', '압력은 변하지 않는다', '압력이 증가하다가 감소한다'],
            answer: 1,
            feedback: ['표에서 부피가 작아질수록 압력 값은 어떻게 되나요?', '', '압력 값이 모두 같았나요?', '표를 왼쪽(큰 부피)부터 오른쪽(작은 부피)으로 읽어 보세요.'],
            explain: '부피가 감소할수록 압력은 <b>증가</b>하고, 부피가 증가할수록 압력은 <b>감소</b>해요.',
          },
          {
            type: 'quiz',
            title: '그래프의 모양',
            setup: needData,
            goal: '📈 부피–압력 그래프는 어떤 모양인가요?',
            choices: [
              choiceG('up', '부피가 커질수록 압력이 커지는 직선'),
              choiceG('curve', '부피가 커질수록 압력이 작아지는 곡선'),
              choiceG('flat', '부피가 변해도 압력이 일정한 직선'),
              choiceG('upcurve', '부피가 커질수록 압력이 커지는 곡선'),
            ],
            answer: 1,
            feedback: ['부피가 커질 때 압력도 커졌나요? 그래프의 점을 다시 보세요.', '', '압력계 바늘이 움직였어요. 압력은 변했어요.', '부피가 큰 쪽(오른쪽)의 점이 위에 있나요, 아래에 있나요?'],
            explain: '부피가 커질수록 압력이 작아지는 <b>곡선</b>이 나타나요. 이처럼 한 변인이 커질 때 다른 변인이 작아지는 관계를 <b>반비례 관계</b>라고 해요.',
          },
        ],
      },
      {
        title: '입자 모형으로 해석하기', short: '설명', icon: '🔬', phase: '설명',
        features: ['particles', 'hits'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부피가 감소하면 압력이 증가한다는 것을 실험 결과로 확인했어요.</div>' +
          '<p>왜 그럴까요? 주사기 속 기체를 <b>입자 모형</b>으로 들여다봐요. 온도가 일정하므로 입자의 <b>빠르기는 변하지 않아요</b>.</p>',
        setup() { setV(V0); setParticles(true); showHint('💥 주황색 고리 = 입자가 피스톤에 부딪힌 곳', 6000); },
        recap: '부피가 줄면 입자 사이의 거리가 가까워지고 벽에 <b>충돌하는 횟수가 많아져</b> 압력이 커져요. 입자의 크기와 수는 변하지 않아요.',
        summary: '<p>온도가 일정할 때 부피가 줄어들면</p><ul>' +
          '<li>입자의 <b>수와 크기</b>, 운동 빠르기는 <b>변하지 않는다</b>.</li>' +
          '<li>입자 사이의 <b>거리가 가까워진다</b>.</li>' +
          '<li>일정한 시간 동안 입자가 벽에 <b>충돌하는 횟수가 많아져</b> 압력이 커진다.</li></ul>',
        missions: [
          {
            title: '충돌 횟수 비교하기',
            goal: '부피가 <b>클 때</b>(40 mL 이상)와 <b>작을 때</b>(20 mL 이하) 각각 <b>2초</b> 동안 지켜보며, 피스톤에 부딪히는 횟수를 비교해 보세요.',
            hint: '피스톤을 40 mL 위로 올려 2초쯤 지켜본 다음, 20 mL 아래로 눌러 2초쯤 지켜보세요.',
            compare: true,
            setup() { S.big = { t: 0, done: false, rate: 0 }; S.small = { t: 0, done: false, rate: 0 }; },
            check: () => S.big.done && S.small.done,
            status: () => '부피가 클 때 <b>' + (S.big.done ? '✔ ' + fmt(S.big.rate, 0) + '회/초' : (S.big.t > 0 ? '관찰 중…' : '—')) + '</b> · 부피가 작을 때 <b>' + (S.small.done ? '✔ ' + fmt(S.small.rate, 0) + '회/초' : (S.small.t > 0 ? '관찰 중…' : '—')) + '</b>',
            hold: 0,
            explain: '부피가 작아지면 입자가 움직일 공간이 좁아져, 같은 시간 동안 벽(피스톤)에 <b>더 자주</b> 부딪혀요. 그래서 기체의 압력이 커져요.',
          },
          {
            type: 'quiz',
            title: '입자에게 무슨 일이?',
            goal: '피스톤을 눌러 부피를 줄였을 때, 주사기 속 기체 입자에 대한 설명으로 옳은 것은?',
            choices: ['입자의 크기가 작아진다', '입자의 개수가 줄어든다', '입자의 크기와 개수는 그대로이고, 입자 사이의 거리가 가까워진다', '입자가 움직이지 않고 멈춘다'],
            answer: 2,
            feedback: ['화면 속 입자의 크기가 변했나요? 입자 하나의 크기는 그대로예요!', '주사기 끝이 막혀 있어 입자는 빠져나갈 수 없어요. 입자 수 표시를 보세요.', '', '온도가 일정하면 입자는 같은 빠르기로 계속 움직여요.'],
            explain: '부피가 줄어도 입자의 <b>크기와 개수는 변하지 않아요</b>. 입자가 움직일 수 있는 공간이 좁아져 <b>입자 사이의 거리가 가까워질</b> 뿐이에요.',
          },
          {
            type: 'quiz',
            title: '압력이 커진 까닭',
            goal: '온도가 일정할 때 기체의 부피가 줄어들면 압력이 커지는 까닭은?',
            choices: ['입자가 작아져서 더 빨리 움직이기 때문', '입자의 개수가 늘어나기 때문', '일정한 시간 동안 입자가 벽에 충돌하는 횟수가 많아지기 때문', '입자들끼리 달라붙어 벽을 누르기 때문'],
            answer: 2,
            feedback: ['입자의 크기도, 빠르기(온도 일정)도 그대로예요.', '입자 수는 그대로 30개예요.', '', '입자는 달라붙지 않고 계속 움직여요.'],
            explain: '같은 수의 입자가 더 좁은 공간에서 움직이므로 벽에 <b>더 자주 충돌</b>해요. 충돌 횟수가 많아지면 기체의 압력이 커져요.',
          },
        ],
      },
      {
        title: '생활 속 압력과 부피', short: '적용', icon: '🏠', phase: '적용',
        features: [],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력과 부피의 관계를 입자 모형으로 설명했어요.</div>' +
          '<p>생활 속에서 기체에 가해지는 압력이 달라질 때 부피가 어떻게 변하는지 찾아 설명해 봐요. 주사기는 자유롭게 써도 돼요.</p>',
        setup() { setV(V0); },
        recap: '생활 속에서도 기체에 가해지는 압력이 <b>작아지면 부피가 커지고</b>, 압력이 <b>커지면 부피가 작아져요</b>.',
        summary: '<ul><li><b>높은 산의 과자 봉지</b>: 높은 곳은 공기의 압력이 낮아 봉지 속 기체의 부피가 커진다.</li>' +
          '<li><b>잠수부의 공기 방울</b>: 수면으로 올라갈수록 물의 압력이 작아져 공기 방울이 커진다.</li>' +
          '<li><b>끝을 막은 주사기</b>: 누를수록 부피가 줄고 압력이 커져 누르기 힘들어진다.</li></ul>',
        missions: [
          {
            type: 'quiz',
            title: '산 위의 과자 봉지',
            goal: '산 아래에서 산꼭대기로 과자 봉지를 가지고 올라갔더니 봉지가 빵빵하게 부풀었어요. 그 까닭은? (온도 변화는 생각하지 않아요)',
            figure: '<div style="font-size:44px">⛰️ 🛍️💨</div>',
            choices: ['봉지 속 기체 입자의 수가 늘어났기 때문', '봉지 속 기체 입자의 크기가 커졌기 때문', '산꼭대기는 공기의 압력이 낮아 봉지 속 기체의 부피가 커졌기 때문', '산꼭대기는 공기의 압력이 더 높기 때문'],
            answer: 2,
            feedback: ['봉지는 밀봉되어 있어 입자 수는 그대로예요.', '입자의 크기는 변하지 않아요!', '', '높이 올라갈수록 공기의 압력은 낮아져요.'],
            explain: '높은 곳일수록 봉지를 바깥에서 누르는 공기의 압력이 낮아요. 기체에 가해지는 압력이 작아지면 기체의 <b>부피가 커져요</b>. 입자의 수와 크기는 그대로예요.',
          },
          {
            type: 'quiz',
            title: '잠수부의 공기 방울',
            goal: '깊은 물속에서 잠수부가 내뿜은 공기 방울이 수면으로 올라갈수록 어떻게 될까요?',
            figure: '<div style="font-size:44px">🤿 ∘ ○ ◯</div>',
            choices: ['점점 작아진다', '크기가 변하지 않는다', '점점 커진다', '바로 터져 사라진다'],
            answer: 2,
            feedback: ['수면에 가까워질수록 공기 방울을 누르는 물의 압력은 어떻게 될까요?', '방울을 누르는 물의 압력이 달라져요.', '', '공기 방울은 수면까지 올라가요.'],
            explain: '수면에 가까워질수록 물의 압력이 작아져요. 공기 방울에 가해지는 압력이 작아지므로 공기 방울의 <b>부피가 커져요</b>.',
          },
          {
            type: 'quiz',
            title: '점점 누르기 힘든 주사기',
            goal: '끝을 막은 주사기의 피스톤을 누를수록 점점 더 누르기 힘들어져요. 그 까닭은?',
            figure: '<div style="font-size:44px">💉✋</div>',
            choices: ['주사기 속 입자가 커져서 공간이 부족하기 때문', '부피가 줄수록 기체의 압력이 커져 피스톤을 미는 힘이 커지기 때문', '주사기 속 입자의 개수가 점점 줄어들기 때문', '주사기 속 입자가 멈춰서 피스톤을 막기 때문'],
            answer: 1,
            feedback: ['입자의 크기는 변하지 않아요!', '끝이 막혀 있어 입자 수는 그대로예요.', '', '입자는 멈추지 않아요. 더 자주 부딪힐 뿐이에요.'],
            explain: '부피가 줄수록 입자가 피스톤에 <b>더 자주 충돌</b>해 기체의 압력이 커져요. 그래서 피스톤을 밀어내는 힘이 커져 누르기 힘들어져요.',
          },
        ],
      },
    ],
  });

  /* 미션 성공 순간을 감지해 화면 위에 축하 효과 */
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) celebrate(372, 150);
    lastPhase = ph; lastIdx = idx;
  }

  /* ---------- 시작 ---------- */
  SciSim.loop((dt, t) => {
    step(dt);
    watchCompare(dt);
    draw(now());
    updateReadouts(t);
    watchGame();
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    S, view, parts,
    feat(list) { F = new Set(list); },
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) step(1 / 60); },
    nan() { return parts.some((p) => p.x !== p.x || p.y !== p.y); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / 800, y: r.top + (y * r.height) / 520 }; },
  };
})();
