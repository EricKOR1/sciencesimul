/* =========================================================
   중1 Ⅵ. 기체의 성질 - 기체 압력 탐험대
   개념의 위계에 따라 6단계로 차근차근:
   ① 기체 입자의 운동 → ② 압력 = 입자의 충돌 → ③ 부피와 압력(보일 법칙)
   → ④ 그래프로 규칙 찾기 → ⑤ 온도와 부피(샤를 법칙) → ⑥ 생활 속 기체
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound, toast } = SciSim;

  /* ---------- 상태 ---------- */
  const BASE_N = 50;            // 기준 입자 수
  const BASE_V = 100;           // 기준 부피(mL) : 27 °C, 1기압일 때
  const BASE_T = 300;           // 기준 온도(K)
  const PX_PER_ML = 1.5;
  const S = {
    mode: 'boyle',              // boyle(온도 일정) | charles(압력 일정)
    N: BASE_N,
    V: 100, Vshown: 100,
    Tc: 27,
    P: 1, needle: 1,
    showHits: true,
    data: { boyle: [], charles: [] },
    target: null,               // {kind:'V'|'P', value, tol}
    hits: [], flashes: [],
    dragging: false, dragOff: 0,
    track: -1, trackBounces: 0, trail: [],
  };
  const TK = () => S.Tc + 273;
  let F = new Set();            // 열린 도구
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => game && game.isNew(f);

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fff' });
  const ctx = view.ctx;
  const CYL = { x: 70, w: 250, bottom: 450 };
  const pistonY = (V) => CYL.bottom - V * PX_PER_ML;

  /* ---------- 입자 ---------- */
  const R = 5;
  const BASE_SPEED = 220;
  const parts = [];
  function speedScale() { return Math.sqrt(TK() / BASE_T); }
  let curScale = 1;
  function makeParticle() {
    const top = pistonY(S.Vshown);
    const a = Math.random() * Math.PI * 2;
    const sp = BASE_SPEED * (0.55 + Math.random() * 0.9) * curScale;
    return {
      x: CYL.x + R + Math.random() * (CYL.w - 2 * R),
      y: top + R + Math.random() * Math.max(1, CYL.bottom - top - 2 * R),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    };
  }
  function syncParticles() {
    while (parts.length < S.N) parts.push(makeParticle());
    while (parts.length > S.N) parts.pop();
    if (S.track >= parts.length) untrack();
  }

  /* ---------- 물리 계산 ---------- */
  // 이상 기체: P ∝ N·T / V  (기준: 입자 50개, 27 °C, 100 mL → 1기압)
  const computeP = () => (S.N / BASE_N) * (TK() / BASE_T) * (BASE_V / S.Vshown);
  const charlesV = () => BASE_V * (S.N / BASE_N) * TK() / BASE_T;

  function step(dt) {
    if (S.mode === 'charles') {
      S.V = charlesV();
      S.Vshown += (S.V - S.Vshown) * Math.min(1, dt * 2.5);
      S.P = 1 + (computeP() - 1) * 0.15;
    } else {
      S.Vshown += (S.V - S.Vshown) * Math.min(1, dt * 12);
      S.P = computeP();
    }
    S.needle += (S.P - S.needle) * Math.min(1, dt * 6);

    const target = speedScale();
    if (Math.abs(target - curScale) > 1e-4) {
      const k = target / curScale;
      parts.forEach((p) => { p.vx *= k; p.vy *= k; });
      curScale = target;
    }

    const top = pistonY(S.Vshown);
    const L = CYL.x + R, Rr = CYL.x + CYL.w - R, B = CYL.bottom - R, T = top + R;
    const now = performance.now();
    parts.forEach((p, i) => {
      let hit = false;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < L) { p.x = L + (L - p.x); p.vx = Math.abs(p.vx); flash(CYL.x, p.y); hit = true; }
      if (p.x > Rr) { p.x = Rr - (p.x - Rr); p.vx = -Math.abs(p.vx); flash(CYL.x + CYL.w, p.y); hit = true; }
      if (p.y > B) { p.y = B - (p.y - B); p.vy = -Math.abs(p.vy); flash(p.x, CYL.bottom); hit = true; }
      if (p.y < T) {
        p.y = Math.min(B, T + (T - p.y));
        if (p.vy < 0) { p.vy = Math.abs(p.vy); S.hits.push(now); flash(p.x, top, true); hit = true; }
      }
      if (i === S.track) {
        if (hit) S.trackBounces++;
        S.trail.push({ x: p.x, y: p.y });
        if (S.trail.length > 90) S.trail.shift();
      }
    });
    while (S.hits.length && now - S.hits[0] > 2000) S.hits.shift();
    S.flashes = S.flashes.filter((f) => now - f.t < 350);
  }
  function flash(x, y, piston) {
    if (S.showHits && on('hits')) S.flashes.push({ x, y, t: performance.now(), piston: !!piston });
  }

  /* ---------- 그리기 ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 아직 열리지 않은 도구 자리 표시
  function lockedBox(x, y, w, h, label, step) {
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#d3dae5'; ctx.lineWidth = 2;
    ctx.fillStyle = '#f8fafd';
    roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a3adbd'; ctx.textAlign = 'center';
    ctx.font = '26px sans-serif'; ctx.fillText('🔒', x + w / 2, y + h / 2 - 6);
    ctx.font = 'bold 14px sans-serif'; ctx.fillText(label, x + w / 2, y + h / 2 + 20);
    ctx.font = '12px sans-serif'; ctx.fillText(step + '단계에서 열려요', x + w / 2, y + h / 2 + 38);
    ctx.restore();
  }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = `rgba(139,92,246,${0.35 + a * 0.5})`; ctx.lineWidth = 4;
    roundRect(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.fillStyle = '#8b5cf6'; roundRect(x + w - 40, y - 16, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEW', x + w - 15, y);
    ctx.restore();
  }

  function draw() {
    view.clear('#ffffff');
    drawCylinder();
    if (on('gauge')) { drawGauge(500, 140, 82); if (isNew('gauge')) newRing(412, 40, 176, 190); }
    else lockedBox(412, 40, 176, 190, '압력계', 2);
    if (on('heat')) { drawThermo(690, 40, 200); if (isNew('heat')) newRing(664, 22, 70, 262); }
    else lockedBox(650, 40, 110, 200, '온도계', 5);
    if (on('graph')) { drawGraph(390, 278, 390, 222); if (isNew('graph')) newRing(390, 278, 390, 222); }
    else lockedBox(390, 278, 390, 222, '그래프', 4);
  }

  function drawCylinder() {
    const top = pistonY(S.Vshown);
    const x0 = CYL.x, x1 = CYL.x + CYL.w;

    // 가열판 / 받침
    const t = (S.Tc + 73) / 250;
    if (S.mode === 'charles') {
      const col = S.Tc >= 27 ? `rgb(${200 + 55 * t},${120 - 60 * t},${60 - 40 * t})` : `rgb(${90 + 80 * t},${150 + 60 * t},235)`;
      ctx.fillStyle = '#4b5565';
      roundRect(x0 - 24, CYL.bottom + 12, CYL.w + 48, 34, 8); ctx.fill();
      ctx.fillStyle = col;
      roundRect(x0 - 14, CYL.bottom + 16, CYL.w + 28, 10, 5); ctx.fill();
      if (S.Tc > 40) {
        const n = 9, now = performance.now() / 1000;
        for (let i = 0; i < n; i++) {
          const fx = x0 + (i + 0.5) * CYL.w / n;
          const fh = (6 + 16 * t) * (0.75 + 0.25 * Math.sin(now * 9 + i * 1.7));
          ctx.fillStyle = 'rgba(255,140,40,.85)';
          ctx.beginPath(); ctx.moveTo(fx - 6, CYL.bottom + 14); ctx.quadraticCurveTo(fx, CYL.bottom + 14 - fh * 1.6, fx + 6, CYL.bottom + 14); ctx.fill();
        }
      } else if (S.Tc < 0) {
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
        for (let i = 0; i < 6; i++) ctx.fillText('❄', x0 + 20 + i * 42, CYL.bottom + 42);
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(S.Tc > 40 ? '가열 중' : S.Tc < 0 ? '냉각 중' : '', x0 + CYL.w / 2, CYL.bottom + 41);
    } else {
      ctx.fillStyle = '#cfe3f5';
      roundRect(x0 - 24, CYL.bottom + 12, CYL.w + 48, 34, 8); ctx.fill();
      ctx.fillStyle = '#4a6a8a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('온도 일정 (27 °C)', x0 + CYL.w / 2, CYL.bottom + 34);
    }

    ctx.fillStyle = '#eaf2ff';
    ctx.fillRect(x0, top, CYL.w, CYL.bottom - top);

    // 목표선
    if (S.target && S.target.kind === 'V') {
      const ty = pistonY(S.target.value);
      ctx.save();
      ctx.fillStyle = 'rgba(20,160,88,.12)';
      const tol = S.target.tol * PX_PER_ML;
      ctx.fillRect(x0 - 30, ty - tol, CYL.w + 60, tol * 2);
      ctx.setLineDash([8, 6]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x0 - 30, ty); ctx.lineTo(x1 + 30, ty); ctx.stroke();
      ctx.setLineDash([]);
      const label = '🎯 목표 ' + S.target.value + ' mL';
      ctx.font = 'bold 13px sans-serif';
      const tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = '#14a058';
      roundRect(x1 - tw - 8, ty - 11, tw, 22, 11); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(label, x1 - 8 - tw / 2, ty + 5);
      ctx.restore();
    }

    // 따라가는 입자의 자취
    if (S.track >= 0 && S.trail.length > 1) {
      ctx.save(); ctx.strokeStyle = 'rgba(242,107,58,.55)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); S.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore();
    }

    // 입자
    parts.forEach((p) => {
      ctx.strokeStyle = 'rgba(56,103,244,.22)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
    });
    parts.forEach((p, i) => {
      const tracked = i === S.track;
      const r = tracked ? R + 3 : R;
      const g = ctx.createRadialGradient(p.x - 1.5, p.y - 1.5, 0.5, p.x, p.y, r);
      g.addColorStop(0, tracked ? '#ffd2b8' : '#9fb8ff'); g.addColorStop(1, tracked ? '#f26b3a' : '#2f5be3');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (tracked) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
    });

    // 충돌 표시
    const now = performance.now();
    S.flashes.forEach((f) => {
      const a = 1 - (now - f.t) / 350;
      ctx.strokeStyle = f.piston ? `rgba(242,107,58,${a})` : `rgba(242,160,58,${a * 0.45})`;
      ctx.lineWidth = f.piston ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * (f.piston ? 10 : 6), 0, Math.PI * 2); ctx.stroke();
    });

    // 유리 실린더
    ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, 120); ctx.lineTo(x0, CYL.bottom); ctx.lineTo(x1, CYL.bottom); ctx.lineTo(x1, 120); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + 8, 130); ctx.lineTo(x0 + 8, CYL.bottom - 10); ctx.stroke();

    // 눈금
    ctx.fillStyle = '#5d6879'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    for (let v = 0; v <= 200; v += 25) {
      const y = pistonY(v);
      ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = v % 50 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0 - (v % 50 === 0 ? 12 : 7), y); ctx.lineTo(x0, y); ctx.stroke();
      if (v % 50 === 0) ctx.fillText(v + '', x0 - 15, y + 4);
    }
    ctx.save(); ctx.translate(18, 300); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('부피 (mL)', 0, 0); ctx.restore();

    // 피스톤
    const ph = 18;
    const pg = ctx.createLinearGradient(0, top - ph, 0, top);
    pg.addColorStop(0, '#c9d1dd'); pg.addColorStop(1, '#8792a5');
    ctx.fillStyle = pg;
    roundRect(x0 + 2, top - ph, CYL.w - 4, ph, 4); ctx.fill();
    ctx.strokeStyle = '#6b768a'; ctx.lineWidth = 1.5; ctx.stroke();

    const cx = x0 + CYL.w / 2;
    if (S.mode === 'charles') {
      ctx.fillStyle = '#5d6879';
      ctx.beginPath();
      ctx.moveTo(cx - 55, top - ph); ctx.lineTo(cx + 55, top - ph); ctx.lineTo(cx + 40, top - ph - 42); ctx.lineTo(cx - 40, top - ph - 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('추 (압력 일정)', cx, top - ph - 16);
    } else if (on('piston')) {
      const hy = Math.max(20, top - 130);
      ctx.fillStyle = '#9aa5b6';
      ctx.fillRect(cx - 7, hy, 14, top - ph - hy);
      const hg = ctx.createLinearGradient(0, hy - 26, 0, hy);
      hg.addColorStop(0, S.dragging ? '#ff9b6b' : '#ffb48f'); hg.addColorStop(1, S.dragging ? '#e0552a' : '#f26b3a');
      ctx.fillStyle = hg;
      roundRect(cx - 56, hy - 26, 112, 30, 15); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('↕ 끌기', cx, hy - 6);
      if (isNew('piston')) {
        const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
        ctx.strokeStyle = `rgba(242,107,58,${0.3 + a * 0.6})`; ctx.lineWidth = 4;
        roundRect(cx - 64, hy - 34, 128, 46, 22); ctx.stroke();
      }
    } else {
      // 고정된 뚜껑 (아직 피스톤을 움직일 수 없음)
      ctx.fillStyle = '#5d6879'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔒 고정된 뚜껑', cx, top - ph - 8);
    }
  }

  function drawGauge(cx, cy, r) {
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, maxP = 4;
    const ang = (p) => a0 + (a1 - a0) * clamp(p / maxP, 0, 1);
    if (S.target && S.target.kind === 'P') {
      ctx.strokeStyle = 'rgba(20,160,88,.85)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r - 14, ang(S.target.value - S.target.tol * 2), ang(S.target.value + S.target.tol * 2)); ctx.stroke();
    }
    ctx.strokeStyle = '#e8edf4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, a0, a1); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= maxP; p += 0.5) {
      const a = ang(p);
      const major = p % 1 === 0;
      ctx.strokeStyle = '#3a4456'; ctx.lineWidth = major ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - (major ? 20 : 15)), cy + Math.sin(a) * (r - (major ? 20 : 15)));
      ctx.stroke();
      if (major) ctx.fillText(p, cx + Math.cos(a) * (r - 32), cy + Math.sin(a) * (r - 32));
    }
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#5d6879';
    ctx.fillText('압력계 (단위: 기압)', cx, cy - r - 12);
    const a = ang(S.needle);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); ctx.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18)); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a7b2c3'; ctx.lineWidth = 6; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(cx - r, cy + 20); ctx.lineTo(CYL.x + CYL.w + 22, cy + 20); ctx.lineTo(CYL.x + CYL.w + 22, CYL.bottom - 20); ctx.lineTo(CYL.x + CYL.w, CYL.bottom - 20); ctx.stroke();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  function drawThermo(x, y, h) {
    const t = clamp((S.Tc + 100) / 300, 0, 1);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 3;
    roundRect(x - 12, y, 24, h, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + h + 8, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e2464b';
    ctx.beginPath(); ctx.arc(x, y + h + 8, 13, 0, Math.PI * 2); ctx.fill();
    const lh = (h - 14) * t;
    roundRect(x - 5, y + h - lh, 10, lh + 6, 5); ctx.fill();
    ctx.fillStyle = '#5d6879'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    for (let c = -100; c <= 200; c += 50) {
      const yy = y + h - (h - 14) * ((c + 100) / 300);
      ctx.fillRect(x + 12, yy, 6, 1.5);
      ctx.fillText(c + '°', x + 21, yy + 4);
    }
    ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('온도계', x, y - 8);
  }

  function drawGraph(gx, gy, gw, gh) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5;
    roundRect(gx, gy, gw, gh, 12); ctx.fill(); ctx.stroke();
    const pad = { l: 46, r: 14, t: 26, b: 36 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const boyle = S.mode === 'boyle';
    const X = boyle ? { min: 0, max: 200, step: 50, label: '부피 (mL)' } : { min: -100, max: 200, step: 50, label: '온도 (°C)' };
    const Y = boyle ? { min: 0, max: 4, step: 1, label: '압력 (기압)' } : { min: 0, max: 200, step: 50, label: '부피 (mL)' };
    const px = (v) => x0 + (v - X.min) / (X.max - X.min) * (x1 - x0);
    const py = (v) => y0 - (v - Y.min) / (Y.max - Y.min) * (y0 - y1);

    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(boyle ? '📈 압력–부피 그래프' : '📈 부피–온도 그래프', gx + 12, gy + 18);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#5d6879';
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let v = X.min; v <= X.max; v += X.step) {
      ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(v, px(v), y0 + 14);
    }
    for (let v = Y.min; v <= Y.max; v += Y.step) {
      ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(v, x0 - 6, py(v) + 4);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    if (!boyle) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px(0), y0); ctx.lineTo(px(0), y1); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(X.label, (x0 + x1) / 2, y0 + 30);
    ctx.save(); ctx.translate(gx + 12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(Y.label, 0, 0); ctx.restore();

    const data = boyle ? S.data.boyle : S.data.charles;
    const pts = data.map((d) => boyle ? [d.V, d.P] : [d.T, d.V]).sort((a, b) => a[0] - b[0]);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1])))); ctx.stroke();
    }
    pts.forEach((p) => {
      ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    const cur = boyle ? [S.Vshown, S.P] : [S.Tc, S.Vshown];
    const cx = px(clamp(cur[0], X.min, X.max)), cy = py(clamp(cur[1], Y.min, Y.max));
    const pulse = 7 + Math.sin(performance.now() / 200) * 2;
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    if (!data.length) {
      ctx.fillStyle = '#8a95a6'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('📍 데이터 기록 버튼으로 점을 찍어 보세요', x1 - 4, y1 + 12);
    }
  }

  /* ---------- 입력 ---------- */
  const sV = $('#sV'), sT = $('#sT'), sN = $('#sN');
  const rangeV = SciSim.bindRange(sV, $('#oV'), (v) => v + ' mL', (v) => { S.V = v; hideHint(); });
  const rangeT = SciSim.bindRange(sT, $('#oT'), (v) => v + ' °C', (v) => { S.Tc = v; hideHint(); });
  const rangeN = SciSim.bindRange(sN, $('#oN'), (v) => v + ' 개', (v) => { S.N = v; syncParticles(); });
  $('#showHits').addEventListener('change', (e) => { S.showHits = e.target.checked; });

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  function setMode(mode) {
    if (S.mode === mode) return;
    S.mode = mode;
    $$('.segmented button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('#ctrlT').hidden = mode !== 'charles';
    $('#ctrlV').style.display = mode === 'boyle' ? '' : 'none';
    if (mode === 'boyle') {
      S.Tc = 27; rangeT.set(27);
      S.V = Math.round(S.Vshown); rangeV.set(S.V);
      $('#r4Label').textContent = '피스톤 충돌 횟수';
      showHint('↕ 피스톤 손잡이를 위아래로 끌어 보세요');
    } else {
      $('#r4Label').textContent = '입자 평균 속력';
      showHint('🔥 온도 슬라이더로 가열하거나 냉각해 보세요');
    }
  }
  $$('.segmented button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  function track(i) {
    S.track = i; S.trackBounces = 0; S.trail = [];
    $('#untrackBtn').hidden = i < 0;
  }
  function untrack() { track(-1); }
  $('#trackBtn').addEventListener('click', () => { Sound.click(); track(Math.floor(Math.random() * parts.length)); hideHint(); });
  $('#untrackBtn').addEventListener('click', () => { Sound.click(); untrack(); });

  SciSim.pointer(view, {
    hover(p) { return (on('piston') && S.mode === 'boyle' && hitPiston(p)) ? 'ns-resize' : (on('track') && nearestParticle(p) >= 0 ? 'pointer' : null); },
    down(p) {
      if (on('piston') && S.mode === 'boyle' && hitPiston(p)) {
        S.dragging = true; S.dragOff = p.y - pistonY(S.Vshown); hideHint();
        return true;
      }
      if (on('track')) {
        const i = nearestParticle(p);
        if (i >= 0) { Sound.tick(); track(i); hideHint(); }
      }
      return false;
    },
    move(p) {
      const V = Math.round(clamp((CYL.bottom - (p.y - S.dragOff)) / PX_PER_ML, 25, 200));
      S.V = V; rangeV.set(V);
    },
    up() { S.dragging = false; },
  });
  function nearestParticle(p) {
    let best = -1, bd = 26 * 26; // 손가락으로 누르기 쉽게 넉넉한 범위
    parts.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function hitPiston(p) {
    const top = pistonY(S.Vshown);
    const hy = Math.max(20, top - 130);
    const cx = CYL.x + CYL.w / 2;
    const onPlate = p.x > CYL.x - 10 && p.x < CYL.x + CYL.w + 10 && p.y > top - 34 && p.y < top + 10;
    const onRod = Math.abs(p.x - cx) < 64 && p.y > hy - 36 && p.y < top;
    return onPlate || onRod;
  }

  $('#recBtn').addEventListener('click', () => {
    Sound.tick();
    if (S.mode === 'boyle') {
      const V = Math.round(S.V);
      const arr = S.data.boyle;
      const i = arr.findIndex((d) => Math.abs(d.V - V) < 5);
      const d = { V, P: +computePAt(V).toFixed(2) };
      if (i >= 0) arr[i] = d; else arr.push(d);
      toast('📍 기록: ' + V + ' mL, ' + d.P.toFixed(2) + ' 기압');
    } else {
      const T = S.Tc;
      const arr = S.data.charles;
      const i = arr.findIndex((d) => Math.abs(d.T - T) < 5);
      const d = { T, V: +charlesV().toFixed(1) };
      if (i >= 0) arr[i] = d; else arr.push(d);
      toast('📍 기록: ' + T + ' °C, ' + d.V.toFixed(1) + ' mL');
    }
  });
  const computePAt = (V) => (S.N / BASE_N) * (TK() / BASE_T) * (BASE_V / V);
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.data[S.mode] = []; });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetState(); });

  function resetState(keepMode) {
    if (!keepMode) setMode(on('heat') && S.mode === 'charles' ? 'charles' : 'boyle');
    S.N = BASE_N; rangeN.set(BASE_N); syncParticles();
    S.V = 100; rangeV.set(100);
    S.Tc = 27; rangeT.set(27);
  }

  /* ---------- 측정값 표시 ---------- */
  const rV = $('#rV'), rP = $('#rP'), rT = $('#rT'), r4 = $('#r4'), rN = $('#rN');
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    rN.innerHTML = S.N + '<small>개</small>';
    rV.innerHTML = fmt(S.Vshown, 0) + '<small>mL</small>';
    rP.innerHTML = fmt(S.mode === 'charles' ? 1 : S.P, 2) + '<small>기압</small>';
    rT.innerHTML = fmt(S.Tc, 0) + '<small>°C</small>';
    if (S.mode === 'boyle') r4.innerHTML = fmt(S.hits.length / 2, 0) + '<small>회/초</small>';
    else r4.innerHTML = fmt(speedScale(), 2) + '<small>배</small>';
  }

  /* ---------- 미션 ---------- */
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const distinct = (arr, key, gap) => {
    const vals = arr.map((d) => d[key]).sort((a, b) => a - b);
    let n = 0, last = -Infinity;
    vals.forEach((v) => { if (v - last >= gap) { n++; last = v; } });
    return n;
  };
  const boyleBase = () => { setMode('boyle'); S.N = BASE_N; rangeN.set(BASE_N); syncParticles(); };

  game = SciSim.game({
    simId: 'm1-gas-law',
    mount: '#game',
    badge: '기체 박사',
    homeHref: '../../index.html#g1',
    featureLabels: {
      track: '🔍 입자 따라가기',
      gauge: '🧭 압력계',
      hits: '💥 충돌 표시',
      pump: '🫧 입자 수 조절',
      piston: '🖐️ 움직이는 피스톤',
      graph: '📈 그래프 · 데이터 기록',
      heat: '🔥 가열 장치 · 온도계',
    },
    onFeatures(set) {
      F = set;
      $('#tbLabel').hidden = set.has('heat');
      if (!set.has('heat') && S.mode === 'charles') setMode('boyle');
      if (!set.has('piston')) { S.V = 100; rangeV.set(100); }
    },
    onMissionStart() { S.target = null; },
    levels: [
      {
        title: '기체 입자의 운동', short: '입자 운동', icon: '🫧',
        features: ['track'],
        intro: '<p>공기 같은 <b>기체</b>는 눈에 보이지 않을 만큼 아주 작은 <b>입자</b>로 이루어져 있어요.</p>' +
          '<p>밀폐된 실린더 속 기체 입자가 어떻게 움직이는지 관찰하며 기체 탐험을 시작해 봐요!</p>',
        setup() { resetState(); showHint('👆 움직이는 입자 하나를 눌러 보세요', 7000); },
        recap: '기체 입자는 <b>모든 방향으로 끊임없이</b> 움직이며 벽에 부딪혀요. 입자 사이는 <b>빈 공간</b>이에요.',
        summary: '<ul><li>기체는 아주 작은 <b>입자</b>로 이루어져 있다.</li><li>기체 입자는 <b>모든 방향으로 끊임없이</b> 움직이며, 용기 벽에 계속 부딪힌다.</li><li>입자와 입자 사이는 <b>빈 공간</b>이다.</li></ul>',
        missions: [
          {
            title: '입자 하나를 따라가 보자',
            goal: '움직이는 입자 하나를 <b>눌러서</b> 주황색으로 표시하고, 그 입자가 벽에 <b>3번</b> 부딪힐 때까지 지켜보세요.',
            hint: '화면 속 파란 입자를 손가락으로 누르거나, 오른쪽 <b>🔍 입자 하나 따라가기</b> 버튼을 눌러요.',
            check: () => S.track >= 0 && S.trackBounces >= 3,
            status: () => S.track < 0 ? '아직 입자를 고르지 않았어요.' : '벽에 부딪힌 횟수: <b>' + Math.min(3, S.trackBounces) + ' / 3</b>',
            hold: 0,
            explain: '입자는 한곳에 머물지 않고 <b>곧게 날아가다 벽에 부딪히면 튕겨 나와요.</b> 이렇게 쉬지 않고 계속 움직여요.',
          },
          {
            type: 'quiz',
            title: '기체 입자의 운동',
            goal: '실린더 속 기체 입자의 운동을 바르게 설명한 것은?',
            choices: ['아래쪽에 가라앉아 가만히 있다', '한 방향으로만 움직인다', '모든 방향으로 끊임없이 움직인다', '가끔씩만 움직이고 대부분 멈춰 있다'],
            answer: 2,
            feedback: ['입자들이 실린더 전체에 퍼져 있었죠?', '입자들이 위, 아래, 옆 여러 방향으로 움직였어요.', '', '멈춰 있는 입자가 있었나요?'],
            explain: '기체 입자는 <b>모든 방향으로 끊임없이</b> 움직여요. 그래서 기체는 용기 전체를 가득 채워요.',
          },
          {
            type: 'quiz',
            title: '입자 사이에는 무엇이?',
            goal: '기체 입자와 입자 사이의 공간에는 무엇이 있을까요?',
            choices: ['공기', '아무것도 없는 빈 공간', '물', '아주 작은 먼지'],
            answer: 1,
            feedback: ['공기 자체가 기체 입자들이에요! 입자 사이에 또 공기가 있을까요?', '', '실린더 속에는 기체만 들어 있어요.', '입자 사이에는 다른 물질이 없어요.'],
            explain: '입자 사이는 <b>빈 공간</b>이에요. 기체는 입자 사이가 매우 멀어서 눌러서 부피를 줄일 수 있어요. (3단계에서 직접 해 봐요!)',
          },
        ],
      },
      {
        title: '압력: 입자의 충돌', short: '압력', icon: '🧭',
        features: ['gauge', 'hits', 'pump'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기체 입자가 끊임없이 움직이며 벽에 부딪히는 것을 봤어요.</div>' +
          '<p>입자가 벽에 부딪힐 때마다 벽을 살짝 <b>밀어요</b>. 수많은 입자가 벽을 미는 힘이 모여 생기는 것이 바로 <b>압력</b>이에요.</p>' +
          '<p>압력계와 충돌 표시를 켜고, 입자 수를 바꾸며 압력이 어떻게 달라지는지 알아봐요.</p>',
        setup() { untrack(); resetState(); showHint('💥 주황색 고리 = 입자가 피스톤에 부딪힌 곳', 6000); },
        recap: '입자가 벽에 <b>많이 부딪힐수록</b> 압력이 커져요.',
        summary: '<ul><li><b>압력</b>: 기체 입자가 용기 벽에 부딪히며 벽의 일정한 면적을 미는 힘</li><li>벽에 부딪히는 입자가 <b>많을수록(충돌 횟수가 많을수록)</b> 압력이 커진다.</li></ul><p class="note">예: 자전거 타이어에 공기를 더 넣으면(입자 수 증가) 타이어가 단단해진다.</p>',
        missions: [
          {
            title: '입자를 더 넣어라!',
            goal: '<b>🫧 입자 수</b>를 늘려 압력계 바늘을 초록색 구간 <b>2기압</b>에 맞춰 보세요. 충돌 표시도 함께 살펴보세요.',
            hint: '처음에는 입자 50개일 때 1기압이었어요. 2기압이 되려면 입자가 몇 개 필요할까요?',
            setup() { boyleBase(); S.target = { kind: 'P', value: 2, tol: 0.03 }; },
            check: () => near(S.P, 2, 0.03),
            status: () => '입자 <b>' + S.N + '개</b> · 압력 <b>' + fmt(S.P, 2) + ' 기압</b> · 피스톤 충돌 <b>' + fmt(S.hits.length / 2, 0) + '회/초</b>',
            hold: 0.8,
            explain: '입자 수를 50개 → <b>100개</b>로 2배 늘리자 피스톤에 부딪히는 횟수가 늘어나 압력도 <b>2배</b>가 되었어요.',
          },
          {
            type: 'quiz',
            title: '압력이 커진 까닭',
            goal: '입자 수를 늘렸을 때 압력이 커진 까닭으로 옳은 것은?',
            choices: ['입자 하나하나가 커졌기 때문', '벽에 부딪히는 입자의 충돌 횟수가 많아졌기 때문', '입자가 멈춰서 벽을 누르기 때문', '실린더의 크기가 커졌기 때문'],
            answer: 1,
            feedback: ['입자의 크기는 그대로였어요!', '', '입자는 멈추지 않고 계속 움직였어요.', '실린더(부피)는 그대로였어요.'],
            explain: '압력은 입자들이 벽에 부딪히는 <b>충돌</b> 때문에 생겨요. 같은 시간 동안 충돌이 많을수록 압력이 커져요.',
          },
        ],
      },
      {
        title: '부피와 압력 (보일 법칙)', short: '보일 법칙', icon: '🖐️',
        features: ['piston'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 횟수가 많을수록 압력이 커진다는 것을 알았어요.</div>' +
          '<p>이번에는 입자 수는 <b>그대로</b> 두고, 피스톤을 눌러 입자가 움직일 <b>공간(부피)</b>을 바꿔 봐요. 온도는 일정해요.</p>',
        setup() { boyleBase(); S.V = 100; rangeV.set(100); showHint('↕ 주황색 손잡이를 아래로 끌어 보세요', 6000); },
        recap: '온도가 일정할 때 부피가 줄면 압력이 커지고, 부피가 ½이면 압력은 2배예요.',
        summary: '<p>온도가 일정할 때, 기체의 <b>부피가 줄어들면 압력이 커진다</b>.</p><ul><li>같은 수의 입자가 좁은 공간에서 벽에 <b>더 자주</b> 부딪히기 때문</li><li>부피 ½배 → 압력 2배, 부피 2배 → 압력 ½배</li></ul><span class="formula">압력 × 부피 = 일정 (보일 법칙)</span>',
        missions: [
          {
            title: '피스톤을 꾹 눌러라!',
            goal: '피스톤 손잡이를 아래로 끌어서 부피를 <b>50 mL</b>로 줄여 보세요. 충돌 횟수와 압력계를 지켜보세요.',
            hint: '오른쪽 <b>피스톤 위치</b> 슬라이더를 써도 돼요.',
            setup() { boyleBase(); S.target = { kind: 'V', value: 50, tol: 2 }; },
            check: () => S.mode === 'boyle' && near(S.Vshown, 50, 2),
            status: () => '부피 <b>' + fmt(S.Vshown, 0) + ' mL</b> · 압력 <b>' + fmt(S.P, 2) + ' 기압</b>',
            hold: 0.8,
            explain: '부피가 100 mL → 50 mL로 줄자 압력이 1기압 → <b>2기압</b>이 되었어요. 입자 수는 그대로인데 공간이 좁아져서 피스톤에 <b>더 자주</b> 부딪히기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '압력은 몇 배?',
            goal: '온도가 일정할 때, 기체의 부피를 <b>처음의 ½</b>로 줄이면 압력은 어떻게 될까요?',
            choices: ['½배로 줄어든다', '변하지 않는다', '2배로 커진다', '4배로 커진다'],
            answer: 2,
            feedback: ['부피가 줄면 입자가 벽에 더 자주 부딪혀요.', '압력계 바늘이 움직였었죠?', '', '방금 실험에서 50 mL일 때 압력을 떠올려 보세요.'],
            explain: '1기압 × 100 mL = <b>2기압 × 50 mL</b>. 압력과 부피를 곱한 값이 일정해요.',
          },
          {
            title: '반대로 늘려 보기',
            goal: '이번엔 피스톤을 위로 올려 압력을 <b>0.80 기압</b>(초록색 구간)으로 맞춰 보세요.',
            hint: '압력 × 부피 = 100 이에요. 0.80 × (부피) = 100 이 되려면 부피는?',
            setup() { boyleBase(); S.target = { kind: 'P', value: 0.8, tol: 0.02 }; },
            check: () => S.mode === 'boyle' && near(S.P, 0.8, 0.02),
            status: () => '부피 <b>' + fmt(S.Vshown, 0) + ' mL</b> · 압력 <b>' + fmt(S.P, 2) + ' 기압</b>',
            hold: 0.8,
            explain: '부피를 <b>125 mL</b>로 늘리면 0.80기압이에요. 공간이 넓어지면 충돌이 줄어 압력이 작아져요.',
          },
        ],
      },
      {
        title: '그래프로 규칙 찾기', short: '그래프', icon: '📈',
        features: ['graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부피를 줄이면 압력이 커지는 것을 확인했어요.</div>' +
          '<p>여러 번 측정해서 <b>그래프</b>로 나타내면 숨어 있는 규칙이 한눈에 보여요. 과학자처럼 데이터를 모아 봐요!</p>',
        setup() { boyleBase(); },
        recap: '압력–부피 그래프는 <b>반비례</b> 곡선이에요. 규칙을 알면 결과를 미리 예측할 수 있어요.',
        summary: '<p>압력–부피 그래프는 오른쪽 아래로 휘어지며 내려가는 <b>곡선(반비례)</b>이다.</p><p>규칙(압력 × 부피 = 일정)을 이용하면 측정하지 않아도 결과를 <b>예측</b>할 수 있다.</p>',
        missions: [
          {
            title: '데이터 모으기',
            goal: '부피를 바꿔 가며 <b>📍 데이터 기록</b>을 눌러 그래프에 서로 다른 점을 <b>5개</b> 이상 찍어 보세요.',
            hint: '25, 50, 100, 150, 200 mL처럼 고르게 바꿔 가며 기록해 보세요.',
            setup() { boyleBase(); },
            check: () => distinct(S.data.boyle, 'V', 10) >= 5,
            status: () => '기록한 점: <b>' + Math.min(5, distinct(S.data.boyle, 'V', 10)) + ' / 5</b>',
            hold: 0,
            explain: '점들을 이으면 오른쪽 아래로 휘어지는 <b>곡선</b>이 돼요.',
          },
          {
            type: 'quiz',
            title: '그래프의 모양',
            goal: '온도가 일정할 때 기체의 압력과 부피 관계 그래프의 모양은?',
            choices: ['원점을 지나는 직선 (비례)', '오른쪽 아래로 휘어지는 곡선 (반비례)', '수평한 직선 (변화 없음)', '오른쪽 위로 휘어지는 곡선'],
            answer: 1,
            feedback: ['부피가 커질 때 압력도 커졌나요?', '', '압력이 변했었죠?', '부피가 커질수록 압력은 작아졌어요.'],
            explain: '부피가 커질수록 압력이 작아지는 <b>반비례</b> 관계예요.',
          },
          {
            title: '🎯 예측 도전',
            goal: '규칙을 이용해 미리 계산한 다음, 압력을 <b>1.25 기압</b>에 정확히 맞추고 유지하세요!',
            hint: '1 × 100 = 1.25 × (부피). 부피는 몇 mL일까요?',
            setup() { boyleBase(); S.target = { kind: 'P', value: 1.25, tol: 0.02 }; },
            check: () => S.mode === 'boyle' && near(S.P, 1.25, 0.02),
            status: () => '압력 <b>' + fmt(S.P, 2) + ' 기압</b>',
            hold: 1.2,
            explain: '부피 <b>80 mL</b>: 1.25 × 80 = 100. 규칙으로 결과를 <b>예측</b>할 수 있어요!',
          },
        ],
      },
      {
        title: '온도와 부피 (샤를 법칙)', short: '샤를 법칙', icon: '🔥',
        features: ['heat'],
        intro: '<div class="si-link">🔗 <b>지금까지는</b> 온도가 일정했어요. 입자의 빠르기도 그대로였죠.</div>' +
          '<p>이번에는 피스톤 위에 <b>추</b>를 올려 압력을 일정하게 하고, 기체를 <b>가열</b>하거나 <b>냉각</b>해 봐요. 입자의 운동이 어떻게 달라질까요?</p>',
        setup() { S.N = BASE_N; rangeN.set(BASE_N); syncParticles(); setMode('charles'); S.Tc = 27; rangeT.set(27); },
        recap: '압력이 일정할 때 온도가 높아지면 입자 운동이 활발해져 부피가 커져요.',
        summary: '<p>압력이 일정할 때, 기체의 <b>온도가 높아지면 부피가 커진다</b>.</p><ul><li>온도가 높아지면 입자의 운동이 <b>빨라져</b> 피스톤을 세게 밀어 올린다.</li><li>부피–온도 그래프는 오른쪽 위로 올라가는 <b>직선</b>: 온도가 1 °C 오를 때마다 0 °C 때 부피의 약 1/273씩 증가</li></ul><span class="formula">샤를 법칙</span><p class="note">⚠️ 온도가 높아져도 <b>입자의 크기와 개수는 변하지 않는다.</b> 입자 사이의 거리가 멀어질 뿐!</p>',
        missions: [
          {
            title: '피스톤을 목표선까지!',
            goal: '<b>온도</b>를 높여 피스톤을 초록 목표선 <b>120 mL</b>까지 올려 보세요.',
            hint: '오른쪽 온도 슬라이더를 오른쪽(높은 온도)으로 움직여요.',
            setup() { setMode('charles'); S.target = { kind: 'V', value: 120, tol: 2 }; },
            check: () => S.mode === 'charles' && near(S.Vshown, 120, 2) && near(S.V, 120, 2),
            status: () => S.mode !== 'charles' ? '🔥 <b>가열하기</b> 모드에서 해 보세요.' : '온도 <b>' + S.Tc + ' °C</b> · 부피 <b>' + fmt(S.Vshown, 0) + ' mL</b> · 입자 속력 <b>' + fmt(speedScale(), 2) + '배</b>',
            hold: 0.8,
            explain: '약 <b>87 °C</b>로 가열하자 입자가 빨라져 피스톤을 세게 밀어 올렸어요. 그래서 부피가 120 mL로 커졌어요.',
          },
          {
            type: 'quiz',
            title: '입자에게 무슨 일이?',
            goal: '기체를 가열했을 때 부피가 커지는 까닭으로 옳은 것은?',
            choices: ['입자 하나하나의 크기가 커지기 때문', '입자의 개수가 늘어나기 때문', '입자의 운동이 빨라져 벽을 더 세게, 자주 밀기 때문', '입자의 운동이 느려지기 때문'],
            answer: 2,
            feedback: ['화면 속 입자의 크기가 변했나요? 입자 크기는 그대로예요!', '실린더는 막혀 있어 입자 수는 그대로예요.', '', '온도가 높아지면 입자가 어떻게 움직였나요?'],
            explain: '온도가 높아지면 입자의 <b>운동이 활발</b>해져요. 입자의 크기와 개수는 그대로이고, <b>입자 사이의 거리</b>가 멀어져 부피가 커져요.',
          },
          {
            title: '얼음처럼 차갑게',
            goal: '반대로 온도를 낮춰서 부피를 <b>80 mL</b>로 줄여 보세요.',
            hint: '온도를 0 °C보다 낮게 내려야 해요.',
            setup() { setMode('charles'); S.target = { kind: 'V', value: 80, tol: 2 }; },
            check: () => S.mode === 'charles' && near(S.Vshown, 80, 2) && near(S.V, 80, 2),
            status: () => S.mode !== 'charles' ? '🔥 <b>가열하기</b> 모드에서 해 보세요.' : '온도 <b>' + S.Tc + ' °C</b> · 부피 <b>' + fmt(S.Vshown, 0) + ' mL</b>',
            hold: 0.8,
            explain: '약 <b>−33 °C</b>로 냉각하면 입자 운동이 느려져 피스톤이 내려와요.',
          },
          {
            title: '부피–온도 그래프',
            goal: '온도를 바꿔 가며 <b>📍 데이터 기록</b>으로 서로 다른 점을 <b>4개</b> 이상 찍어 보세요.',
            hint: '−50 °C, 0 °C, 50 °C, 100 °C, 150 °C처럼 고르게 기록해 보세요.',
            setup() { setMode('charles'); },
            check: () => distinct(S.data.charles, 'T', 15) >= 4,
            status: () => '기록한 점: <b>' + Math.min(4, distinct(S.data.charles, 'T', 15)) + ' / 4</b>',
            hold: 0,
            explain: '점들이 <b>오른쪽 위로 올라가는 직선</b> 위에 놓여요. 온도가 일정하게 오를 때마다 부피도 <b>일정하게</b> 늘어나요.',
          },
        ],
      },
      {
        title: '생활 속 기체 탐정', short: '생활 적용', icon: '🏠',
        features: [],
        intro: '<div class="si-link">🔗 <b>보일 법칙</b>(부피–압력)과 <b>샤를 법칙</b>(온도–부피)을 모두 배웠어요.</div>' +
          '<p>이제 생활 속 현상이 어느 법칙과 관련 있는지 탐정처럼 밝혀 봐요. 실험 도구는 자유롭게 써도 돼요!</p>',
        recap: '생활 속 기체의 부피 변화는 <b>압력</b>(보일) 또는 <b>온도</b>(샤를)의 변화로 설명할 수 있어요.',
        summary: '<ul><li><b>보일 법칙</b>: 높은 산에서 과자 봉지가 부푼다 · 잠수부의 공기 방울이 올라갈수록 커진다 · 주사기 끝을 막고 누르면 부피가 줄어든다</li><li><b>샤를 법칙</b>: 찌그러진 탁구공이 뜨거운 물에서 펴진다 · 열기구가 떠오른다 · 여름철 자동차 타이어가 팽팽해진다</li></ul>',
        missions: [
          {
            type: 'quiz',
            title: '찌그러진 탁구공',
            goal: '찌그러진 탁구공을 뜨거운 물에 넣었더니 다시 펴졌어요. 이 현상과 관계 깊은 것은?',
            figure: '<div style="font-size:44px">🏓 → ♨️ → 🏓</div>',
            choices: ['압력이 커지면 부피가 줄어든다 (보일 법칙)', '온도가 높아지면 기체의 부피가 커진다 (샤를 법칙)', '기체 입자의 크기가 커진다', '물이 탁구공 안으로 들어간다'],
            answer: 1,
            feedback: ['이 현상에서 바뀐 것은 압력일까요, 온도일까요?', '', '입자 크기는 변하지 않아요!', '탁구공은 막혀 있어요.'],
            explain: '탁구공 속 공기가 데워져 입자 운동이 활발해지고 부피가 커지면서 찌그러진 부분을 밀어내요. → <b>샤를 법칙</b>',
          },
          {
            type: 'quiz',
            title: '산 위의 과자 봉지',
            goal: '산 아래에서 산 정상으로 올라가니 과자 봉지가 빵빵하게 부풀었어요. 왜 그럴까요? (온도 변화는 무시해요)',
            figure: '<div style="font-size:44px">⛰️ 🛍️💨</div>',
            choices: ['산 정상은 기온이 높아서', '봉지 바깥의 압력(기압)이 낮아져서', '봉지 속 기체 입자 수가 늘어나서', '봉지 속 기체 입자가 커져서'],
            answer: 1,
            feedback: ['보통 산 위는 기온이 더 낮아요.', '', '봉지는 밀봉되어 있어 입자 수는 그대로예요.', '입자 크기는 변하지 않아요!'],
            explain: '높이 올라갈수록 대기압이 낮아져요. 바깥 압력이 줄면 봉지 속 기체의 부피가 커져요. → <b>보일 법칙</b>',
          },
          {
            type: 'quiz',
            title: '잠수부의 공기 방울',
            goal: '깊은 물속에서 잠수부가 내뿜은 공기 방울이 위로 올라갈수록 어떻게 될까요?',
            figure: '<div style="font-size:44px">🤿 ∘ ○ ◯</div>',
            choices: ['점점 작아진다', '크기가 변하지 않는다', '점점 커진다', '바로 사라진다'],
            answer: 2,
            feedback: ['물 위로 갈수록 공기 방울을 누르는 물의 압력은 어떻게 될까요?', '방울을 누르는 압력이 달라져요.', '', '공기 방울은 수면까지 올라가요.'],
            explain: '수면에 가까워질수록 물의 압력이 작아져 공기 방울의 부피가 커져요. → <b>보일 법칙</b>',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  syncParticles();
  SciSim.loop((dt, t) => {
    step(dt);
    draw();
    updateReadouts(t);
  });
})();
