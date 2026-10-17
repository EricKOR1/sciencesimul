/* =========================================================
   중2 Ⅵ. 동물과 에너지 — 세포호흡과 기관계의 통합 [9과13-05]
   ① [관찰] 운동과 몸: 운동 강도 → 심박수 · 호흡수 · 체온
   ② [설명] 세포호흡: 근육 세포 → 미토콘드리아에서 포도당 + 산소 → 이산화 탄소 + 물 + 에너지
   ③ [모형] 통합 지도: 소화 · 순환 · 호흡 · 배설계를 연결해 세포로 가는 길과 나오는 길 완성
   ④ [적용] 한 기관계에 문제가 생기면?
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const W = 800, H = 600;
  const BG = '#eef6ef';
  let view = null, ctx = null, D = null;

  /* ---------- 그리기 도우미 ---------- */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) { while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); } }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  const lineCache = new Map();
  function lines(s, maxW, size, weight) {
    const key = s + '|' + maxW + '|' + size + '|' + (weight || 700);
    let out = lineCache.get(key);
    if (out) return out;
    ctx.save(); ctx.font = font(size, weight);
    out = [];
    s.split('\n').forEach((par) => {
      let cur = '';
      par.split(' ').forEach((w) => {
        const tryS = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tryS).width <= maxW) { cur = tryS; return; }
        if (cur) out.push(cur);
        cur = w;
      });
      if (cur) out.push(cur);
    });
    ctx.restore();
    lineCache.set(key, out);
    return out;
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    return { x: lx, y: y - h / 2, w, h };
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r || 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r || 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#fde047', '#fb923c', '#fff'], speed: 150, gravity: 80, size: 4 }, o || {})); }
  const rgba = SciSim.color.rgba;
  const shade = SciSim.color.shade;
  const mix = SciSim.color.mix;
  function lgrad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function smooth(pts, closed) {
    const n = pts.length;
    ctx.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1;
      const p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  }
  const approach = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const mark = (b) => (b ? '✅' : '⬜');
  const wrap = (a, n) => ((a % n) + n) % n;

  /* ---------- 색 ---------- */
  const COL = { gluc: '#f59e0b', o2: '#3b82f6', co2: '#6b7280', h2o: '#22d3ee', waste: '#b45309', energy: '#fde047', blood: '#e11d48' };

  /* =========================================================
     상태
     ========================================================= */
  const S = {
    scene: 'body', sceneT: 1,
    I: 0, Id: 0,                  // 운동 강도 (목표 · 화면값) 0~1
    bpm: 66, resp: 14, temp: 36.5, ph: 0, track: 0, hb: 0, br: 0,
    rest: 0, walk: 0, run: 0,     // 단계 1: 강도별 관찰 시간
    msg: '', msgT: 0, msgKind: 'info', t: 0,
    react: 0, alone: { gluc: 0, o2: 0 }, used: [0, 0, 0], nextUse: 0,
    fault: 'none', faultT: { dig: 0, resp: 0, circ: 0, exc: 0 }, energyD: 1, wasteD: 0.08,
  };
  function say(text, kind) { S.msg = text; S.msgT = 4.2; S.msgKind = kind || 'info'; }
  let F = new Set();
  let game = null;
  const has = (n) => (game ? game.has(n) : F.has(n));

  /* 운동 강도 → 몸의 반응 */
  const bpmOf = (i) => 66 + 118 * i;
  const respOf = (i) => 14 + 30 * i;
  const tempOf = (i) => 36.5 + 1.7 * i;
  const levelName = (i) => (i < 0.12 ? '쉬기' : i < 0.4 ? '천천히 걷기' : i < 0.65 ? '빠르게 걷기' : i < 0.88 ? '달리기' : '전력 달리기');

  /* ---------- 하트 · 폐 ---------- */
  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + 26 * s);
    ctx.bezierCurveTo(x - 46 * s, y - 2 * s, x - 36 * s, y - 36 * s, x - 14 * s, y - 32 * s);
    ctx.bezierCurveTo(x - 6 * s, y - 31 * s, x, y - 24 * s, x, y - 20 * s);
    ctx.bezierCurveTo(x, y - 24 * s, x + 6 * s, y - 31 * s, x + 14 * s, y - 32 * s);
    ctx.bezierCurveTo(x + 36 * s, y - 36 * s, x + 46 * s, y - 2 * s, x, y + 26 * s);
    ctx.closePath();
  }
  function drawHeart(x, y, s, glow) {
    ctx.save();
    if (glow) D.glow(x, y, 58 * s, '#fb7185', 0.45 * glow);
    ctx.shadowColor = 'rgba(120,20,40,.35)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetY = 3 * s;
    heartPath(x, y, s);
    ctx.fillStyle = lgrad(x - 30 * s, y - 30 * s, x + 30 * s, y + 30 * s, [[0, '#fb7185'], [0.55, '#e11d48'], [1, '#9f1239']]); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(x - 17 * s, y - 18 * s, 9 * s, 5 * s, -0.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#be123c'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 28 * s); ctx.lineTo(x - 12 * s, y - 42 * s); ctx.moveTo(x + 8 * s, y - 28 * s); ctx.lineTo(x + 12 * s, y - 42 * s); ctx.stroke();
  }
  function drawLungs(x, y, s, k) {
    // k: 부푼 정도 (1 = 기본)
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * (0.94 + 0.08 * k), s * (0.94 + 0.1 * k)); ctx.translate(-x, -y);
    ctx.strokeStyle = '#e8a7a7'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 8); ctx.moveTo(x, y - 8); ctx.lineTo(x - 22, y + 8); ctx.moveTo(x, y - 8); ctx.lineTo(x + 22, y + 8); ctx.stroke();
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(x + d * 8, y - 14);
      ctx.bezierCurveTo(x + d * 18, y - 28, x + d * 52, y - 18, x + d * 52, y + 14);
      ctx.bezierCurveTo(x + d * 52, y + 38, x + d * 40, y + 44, x + d * 26, y + 42);
      ctx.bezierCurveTo(x + d * 12, y + 40, x + d * 8, y + 24, x + d * 8, y - 14);
      ctx.closePath();
      ctx.fillStyle = lgrad(x, y - 30, x + d * 50, y + 44, [[0, '#fbb6c2'], [1, '#f08ca3']]); ctx.fill();
      ctx.strokeStyle = '#d96a86'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,60,100,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + d * 14, y - 4); ctx.lineTo(x + d * 36, y + 10); ctx.moveTo(x + d * 14, y + 14); ctx.lineTo(x + d * 34, y + 28); ctx.stroke();
    });
    ctx.restore();
  }

  /* ---------- 달리는 사람 ---------- */
  function limb(x0, y0, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function drawRunner(x, y, sc, ph, I, br) {
    const run = Math.min(1, I * 1.4);
    const A = 0.1 + 0.95 * I, lean = 0.04 + 0.26 * I;
    const bob = Math.abs(Math.sin(ph)) * 7 * I + Math.sin(br) * 1.2 * (1 - I);
    const hx = 0, hy = -96 - bob;
    const sx = hx + Math.sin(lean) * 56, sy = hy - Math.cos(lean) * 56;
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    // 그림자
    ctx.fillStyle = 'rgba(30,50,30,.18)'; ctx.beginPath(); ctx.ellipse(0, 4, 54 - bob, 8, 0, 0, TAU); ctx.fill();
    const legs = [0, 1].map((i) => {
      const p = ph + i * Math.PI, a1 = A * Math.sin(p) + 0.05, flex = (0.2 + 1.0 * I) * Math.max(0, Math.cos(p));
      const a2 = a1 - flex - 0.1;
      const kx = hx + Math.sin(a1) * 48, ky = hy + Math.cos(a1) * 48;
      return { kx, ky, fx: kx + Math.sin(a2) * 50, fy: ky + Math.cos(a2) * 50, a2, z: i };
    });
    const arms = [0, 1].map((i) => {
      const p = ph + i * Math.PI, b1 = -(0.15 + 1.0 * I) * Math.sin(p) + 0.1, b2 = b1 + 0.5 + 1.0 * I;
      const ex = sx + Math.sin(b1) * 38, ey = sy + Math.cos(b1) * 38;
      return { ex, ey, wx: ex + Math.sin(b2) * 34, wy: ey + Math.cos(b2) * 34 };
    });
    const back = legs[0].fx < legs[1].fx ? 0 : 1; // 뒤쪽 다리
    const drawLeg = (L, dark) => {
      limb(hx, hy, L.kx, L.ky, L.fx, L.fy, 15, dark ? '#1e40af' : '#2563eb');
      limb(L.fx, L.fy, L.fx + 14, L.fy + 3, L.fx + 14, L.fy + 3, 11, '#1f2937');
      ctx.strokeStyle = dark ? '#c9926b' : '#f2c29b'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(L.kx + (L.fx - L.kx) * 0.18, L.ky + (L.fy - L.ky) * 0.18); ctx.lineTo(L.fx, L.fy - 2); ctx.stroke();
    };
    drawLeg(legs[back], true);
    limb(sx, sy, arms[back].ex, arms[back].ey, arms[back].wx, arms[back].wy, 10, '#d97b3a');
    // 몸통
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 30; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy - 4); ctx.lineTo(sx, sy + 6); ctx.stroke();
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 8); ctx.lineTo(sx - 6, sy + 8); ctx.stroke();
    drawLeg(legs[1 - back], false);
    limb(sx, sy, arms[1 - back].ex, arms[1 - back].ey, arms[1 - back].wx, arms[1 - back].wy, 10, '#f97316');
    ctx.strokeStyle = '#f2c29b'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(arms[1 - back].ex + (arms[1 - back].wx - arms[1 - back].ex) * 0.2, arms[1 - back].ey + (arms[1 - back].wy - arms[1 - back].ey) * 0.2); ctx.lineTo(arms[1 - back].wx, arms[1 - back].wy); ctx.stroke();
    // 머리
    const hdx = sx + Math.sin(lean) * 22, hdy = sy - Math.cos(lean) * 22 - 6;
    ctx.fillStyle = '#f2c29b'; ctx.beginPath(); ctx.arc(hdx, hdy, 19, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(hdx - 2, hdy - 4, 19.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillStyle = '#ef4444'; rr(hdx - 21, hdy - 10, 42, 7, 3.5); ctx.fill();   // 머리띠
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(hdx + 8, hdy + 1, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hdx + 9, hdy + 8, 5 + I * 2, 0.1, 1.6); ctx.stroke();
    ctx.restore();
    return { hx: x + hdx * sc, hy: y + hdy * sc };
  }

  /* =========================================================
     장면 1: 운동과 몸
     ========================================================= */
  const beat = (ph) => { const p = wrap(ph, TAU) / TAU; return Math.max(Math.exp(-Math.pow((p - 0.06) / 0.05, 2)), 0.55 * Math.exp(-Math.pow((p - 0.3) / 0.06, 2))); };
  function updateVitals(dt) {
    S.t += dt;
    S.Id = approach(S.Id, S.I, dt, 4);
    S.bpm = approach(S.bpm, bpmOf(S.Id), dt, 3);
    S.resp = approach(S.resp, respOf(S.Id), dt, 3);
    S.temp = approach(S.temp, tempOf(S.Id), dt, 0.7);
    S.hb += dt * S.bpm / 60 * TAU;
    S.br += dt * S.resp / 60 * TAU;
    S.ph += dt * (S.Id < 0.04 ? 0 : 3.2 + 9.5 * S.Id);
    S.track += dt * S.Id * 300;
    if (S.scene === 'body') {
      // 슬라이더 옆에 적힌 이름(쉬기 < 0.12 · 걷기 0.12~0.65 · 달리기 0.65~)과 같은 구간으로 세어요
      if (Math.abs(S.Id - S.I) < 0.03) {          // 화면 값이 슬라이더를 따라잡은 뒤부터 세요
        if (S.I < 0.12) S.rest += dt;
        else if (S.I < 0.65) S.walk += dt;
        else S.run += dt;
      }
    }
  }
  const runnerHead = { hx: 240, hy: 200 };
  function drawBody(t, dt) {
    const I = S.Id;
    // ----- 왼쪽: 달리는 사람
    ctx.save();
    rr(14, 64, 440, 402, 22); ctx.clip();
    ctx.fillStyle = lgrad(0, 64, 0, 400, [[0, '#cfe9fb'], [1, '#f1f8e9']]); ctx.fillRect(14, 64, 440, 402);
    // 먼 산
    ctx.fillStyle = '#d6ead0';
    ctx.beginPath(); ctx.moveTo(14, 372); for (let x = 14; x <= 454; x += 20) ctx.lineTo(x, 340 - Math.sin((x + S.track * 0.08) * 0.018) * 22 - Math.sin((x + S.track * 0.08) * 0.05) * 6); ctx.lineTo(454, 400); ctx.lineTo(14, 400); ctx.closePath(); ctx.fill();
    // 나무
    for (let i = 0; i < 4; i++) {
      const tx = wrap(i * 150 - S.track * 0.45, 600) - 80, ty = 392;
      ctx.fillStyle = '#9a6b3f'; ctx.fillRect(tx - 5, ty - 52, 10, 56);
      ctx.fillStyle = i % 2 ? '#4caf6a' : '#3f9d5e'; ctx.beginPath(); ctx.arc(tx, ty - 70, 30, 0, TAU); ctx.arc(tx - 20, ty - 52, 20, 0, TAU); ctx.arc(tx + 20, ty - 52, 20, 0, TAU); ctx.fill();
    }
    // 길
    ctx.fillStyle = lgrad(0, 400, 0, 466, [[0, '#d97757'], [1, '#c2603f']]); ctx.fillRect(14, 400, 440, 66);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 6; i++) { const lx = wrap(i * 90 - S.track, 540) - 60; ctx.fillRect(lx, 432, 46, 5); }
    ctx.restore();
    rr(14, 64, 440, 402, 22); ctx.strokeStyle = 'rgba(30,60,40,.15)'; ctx.lineWidth = 2; ctx.stroke();
    const hd = drawRunner(240, 404, 1.3, S.ph, I, S.br);
    runnerHead.hx = hd.hx; runnerHead.hy = hd.hy;
    // 땀 · 숨
    if (!RM && S.scene === 'body') {
      if (I > 0.5 && Math.random() < dt * (I - 0.35) * 16) PFX.emit({ x: hd.hx - 10 + Math.random() * 14, y: hd.hy - 14, vx: -20 - Math.random() * 40, vy: -40 - Math.random() * 30, gravity: 220, life: 0.8, size: 3.2, color: '#38bdf8', shape: 'circle' });
      if (Math.random() < dt * (0.8 + I * 5)) PFX.emit({ x: hd.hx + 24, y: hd.hy + 8, vx: 36 + I * 30, vy: -10 - Math.random() * 8, life: 0.9, size: 3 + I * 3, grow: 6, color: '#ffffff', alpha: 0.7, shape: 'bubble' });
    }
    pill(levelName(I) + (I > 0.12 ? ' 중' : ''), 34, 88, { align: 'left', bg: 'rgba(27,35,51,.85)', size: 15, h: 30, pad: 14 });

    // ----- 오른쪽: 세 가지 측정 카드
    const cx = 474, cw = 312, cards = [66, 208, 350], ch = 132;
    const bt = beat(S.hb), bl = 0.5 + 0.5 * Math.sin(S.br - 1.2);
    cards.forEach((y0, i) => {
      panel(cx, y0, cw, ch, { r: 18 });
      ctx.fillStyle = ['#e11d48', '#ec4899', '#f97316'][i]; rr(cx, y0 + 14, 6, ch - 28, 3); ctx.fill();
    });
    // 심박수
    {
      const y0 = cards[0];
      if (bt > 0.2) { ctx.strokeStyle = 'rgba(244,63,94,' + (bt * 0.35).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 66, y0 + 70, 38 + (1 - bt) * 10, 0, TAU); ctx.stroke(); }
      drawHeart(cx + 66, y0 + 72, 1.05 + 0.22 * bt, 0.3 + bt * 0.7);
      txt('❤️ 심박수', cx + 128, y0 + 34, { size: 16, color: '#475569', weight: 800 });
      txt(String(Math.round(S.bpm)), cx + 128, y0 + 86, { size: 42, weight: 800, color: '#be123c' });
      txt('회/분', cx + 128 + ctx.measureText(String(Math.round(S.bpm))).width + 8, y0 + 86, { size: 16, color: '#64748b' });
      rr(cx + 128, y0 + 104, 160, 9, 4.5); ctx.fillStyle = '#ffe4e6'; ctx.fill();
      rr(cx + 128, y0 + 104, Math.max(9, 160 * clamp((S.bpm - 60) / 130, 0, 1)), 9, 4.5); ctx.fillStyle = '#f43f5e'; ctx.fill();
    }
    // 호흡수
    {
      const y0 = cards[1];
      drawLungs(cx + 66, y0 + 68, 0.95, 0.5 + bl * (0.6 + S.Id * 0.5));
      txt('🫁 호흡수', cx + 128, y0 + 34, { size: 16, color: '#475569', weight: 800 });
      txt(String(Math.round(S.resp)), cx + 128, y0 + 86, { size: 42, weight: 800, color: '#be185d' });
      txt('회/분', cx + 128 + ctx.measureText(String(Math.round(S.resp))).width + 8, y0 + 86, { size: 16, color: '#64748b' });
      rr(cx + 128, y0 + 104, 160, 9, 4.5); ctx.fillStyle = '#fce7f3'; ctx.fill();
      rr(cx + 128, y0 + 104, Math.max(9, 160 * clamp((S.resp - 10) / 36, 0, 1)), 9, 4.5); ctx.fillStyle = '#ec4899'; ctx.fill();
    }
    // 체온
    {
      const y0 = cards[2], tx = cx + 66, top = y0 + 20, bot = y0 + 98;
      const f = clamp((S.temp - 36) / 3, 0, 1);
      rr(tx - 9, top, 18, bot - top, 9); ctx.fillStyle = '#fff7ed'; ctx.fill(); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, bot + 8, 15, 0, TAU); ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#fdba74'; ctx.stroke();
      const fh = 12 + (bot - top - 8) * f;
      rr(tx - 4.5, bot - fh + 4, 9, fh + 4, 4.5); ctx.fillStyle = lgrad(0, top, 0, bot, [[0, '#f97316'], [1, '#ef4444']]); ctx.fill();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#fdba74'; ctx.fillRect(tx + 11, top + 8 + k * 17, k % 2 ? 6 : 9, 2); }
      txt('🌡️ 체온', cx + 128, y0 + 34, { size: 16, color: '#475569', weight: 800 });
      txt(S.temp.toFixed(1), cx + 128, y0 + 86, { size: 42, weight: 800, color: '#c2410c' });
      txt('°C', cx + 128 + ctx.measureText(S.temp.toFixed(1)).width + 8, y0 + 86, { size: 16, color: '#64748b' });
      rr(cx + 128, y0 + 104, 160, 9, 4.5); ctx.fillStyle = '#ffedd5'; ctx.fill();
      rr(cx + 128, y0 + 104, Math.max(9, 160 * f), 9, 4.5); ctx.fillStyle = '#f97316'; ctx.fill();
    }
    // ----- 아래: 원인(에너지) 막대
    panel(14, 488, 772, 82, { r: 18 });
    txt('⚡ 근육 세포가 쓰는 에너지', 34, 518, { size: 17, weight: 800, color: '#854d0e' });
    const bx = 34, bw = 732, by = 534;
    rr(bx, by, bw, 18, 9); ctx.fillStyle = '#fef9c3'; ctx.fill();
    const fw = Math.max(18, bw * (0.06 + 0.94 * I));
    rr(bx, by, fw, 18, 9); ctx.fillStyle = lgrad(bx, 0, bx + bw, 0, [[0, '#fde047'], [1, '#f97316']]); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); D.glow(bx + fw, by + 9, 26, '#fde047', 0.6); ctx.restore();
    txt(I < 0.12 ? '쉴 때도 조금은 써요' : I < 0.6 ? '더 많이 써요' : '아주 많이 써요!', bx + bw, 518, { size: 15, weight: 800, color: '#a16207', align: 'right' });
  }

  /* =========================================================
     장면 2: 근육 세포 속 미토콘드리아 (세포호흡)
     ========================================================= */
  const CELLC = { x: 400, y: 308, rx: 222, ry: 142 };
  const MITO = { x: 400, y: 312, rx: 92, ry: 50 };
  const DISP = { gluc: { x: 80, y: 236, name: '포도당' }, o2: { x: 80, y: 356, name: '산소' } };
  const SLOT = { gluc: { x: 362, y: 312 }, o2: { x: 438, y: 312 } };
  const TILES = [
    { x: 250, y: 542, w: 150, name: '근육 운동', icon: '💪', col: '#f97316' },
    { x: 410, y: 542, w: 150, name: '체온 유지', icon: '🌡️', col: '#ef4444' },
    { x: 570, y: 542, w: 150, name: '생장', icon: '🌱', col: '#22c55e' },
  ];
  const C = {
    gluc: false, o2: false, popG: 0, popO: 0, glow: 0, shake: 0, R: null,
    tok: [], prod: [], orbs: [], tile: [0, 0, 0], drag: null, prodT: 9, aloneMsg: { gluc: false, o2: false },
    rbcL: [], rbcR: [], over: false, wob: 0,
  };
  for (let i = 0; i < 9; i++) { C.rbcL.push({ y: 130 + i * 40, dx: (i % 3 - 1) * 16, k: Math.random() }); C.rbcR.push({ y: 130 + i * 40, dx: (i % 3 - 1) * 16, k: Math.random() }); }

  function insideCell(x, y) { return Math.pow((x - CELLC.x) / (CELLC.rx + 6), 2) + Math.pow((y - CELLC.y) / (CELLC.ry + 6), 2) <= 1; }
  function resetCell() {
    C.gluc = false; C.o2 = false; C.R = null; C.tok.length = 0; C.prod.length = 0; C.orbs.length = 0; C.drag = null;
    C.aloneMsg = { gluc: false, o2: false }; C.glow = 0;
  }
  function tokenFly(t) { const s = SLOT[t.kind]; t.st = 'fly'; t.k = 0; t.x0 = t.x; t.y0 = t.y; t.tx = s.x; t.ty = s.y; }
  function dropToken(t) {
    const kind = t.kind;
    if (!insideCell(t.x, t.y)) { t.st = 'back'; t.k = 0; t.x0 = t.x; t.y0 = t.y; Sound.fail(); say('세포 안, 미토콘드리아 쪽으로 끌어다 놓아요.', 'bad'); return; }
    const busy = (kind === 'gluc' ? C.gluc : C.o2) || (C.R && C.R.t < 0.75);
    if (busy) { t.st = 'back'; t.k = 0; t.x0 = t.x; t.y0 = t.y; Sound.fail(); say(C.R ? '반응이 끝난 뒤에 넣어요.' : '이미 들어 있어요. 다른 재료를 넣어 보세요.', 'info'); return; }
    tokenFly(t); Sound.click();
  }
  function startReaction() { S.msgT = 0; C.R = { t: 0, done: false }; C.aloneMsg = { gluc: false, o2: false }; Sound.success(); }
  function finishReaction() {
    const R = C.R; R.done = true;
    C.gluc = false; C.o2 = false; S.react++; C.prodT = 0; C.glow = 1;
    burst(MITO.x, MITO.y, [COL.energy, '#fb923c', '#fff', '#fef08a'], 26, { speed: 220, size: 5, gravity: 40, life: 1.0 });
    const kinds = ['co2', 'h2o', 'co2', 'h2o'];
    kinds.forEach((k, i) => {
      const a = i / 4 * TAU + 0.5;
      C.prod.push({ kind: k, x: MITO.x + Math.cos(a) * 30, y: MITO.y + Math.sin(a) * 18, x0: MITO.x + Math.cos(a) * 30, y0: MITO.y + Math.sin(a) * 18, tx: 716 + (i % 2 - 0.5) * 14, ty: 190 + Math.random() * 110, k: -i * 0.12, dur: 2.0, fade: 0 });
    });
    const use = S.nextUse++ % 3;
    C.orbs.push({ x: MITO.x, y: MITO.y, x0: MITO.x, y0: MITO.y, k: -0.1, use, dur: 1.15 });
    Sound.success();
  }
  function updateCell(dt) {
    C.glow = approach(C.glow, C.R && C.R.t > 0.35 && C.R.t < 1.4 ? 1 : (C.gluc && C.o2 ? 0.4 : 0), dt, 5);
    C.prodT += dt;
    C.popG = approach(C.popG, C.gluc ? 1 : 0, dt, 12);
    C.popO = approach(C.popO, C.o2 ? 1 : 0, dt, 12);
    C.shake = Math.max(0, C.shake - dt);
    C.wob += dt;
    for (let i = 0; i < 3; i++) C.tile[i] = Math.max(0, C.tile[i] - dt * 1.4);
    // 혈관 속 적혈구
    C.rbcL.forEach((c) => { c.y += 36 * dt; if (c.y > 490) c.y = 124; });
    C.rbcR.forEach((c) => { c.y += 44 * dt; if (c.y > 490) c.y = 124; });
    // 날아가는 재료
    for (let i = C.tok.length - 1; i >= 0; i--) {
      const t = C.tok[i];
      if (t.st === 'fly') {
        t.k += dt / 0.55; const e = EASE.inOutQuad(Math.min(1, t.k));
        t.x = t.x0 + (t.tx - t.x0) * e; t.y = t.y0 + (t.ty - t.y0) * e - Math.sin(e * Math.PI) * 24;
        if (t.k >= 1) {
          if (t.kind === 'gluc') C.gluc = true; else C.o2 = true;
          if (t.kind === 'gluc') C.popG = 0; else C.popO = 0;
          burst(t.tx, t.ty, [COL[t.kind], '#fff'], 8, { speed: 70, size: 3 });
          C.tok.splice(i, 1);
          if (C.gluc && C.o2 && !C.R) startReaction();
        }
      } else if (t.st === 'back') {
        t.k += dt / 0.5; const e = EASE.outCubic(Math.min(1, t.k)), d = DISP[t.kind];
        t.x = t.x0 + (d.x - t.x0) * e; t.y = t.y0 + (d.y - t.y0) * e;
        if (t.k >= 1) C.tok.splice(i, 1);
      }
    }
    // 반응
    if (C.R) {
      C.R.t += dt;
      if (!C.R.done && C.R.t >= 0.75) finishReaction();
      if (C.R.t >= 1.5) C.R = null;
    } else {
      if (C.gluc && !C.o2) S.alone.gluc += dt;
      if (C.o2 && !C.gluc) S.alone.o2 += dt;
      ['gluc', 'o2'].forEach((k) => {
        if (S.alone[k] >= 1.2 && !C.aloneMsg[k] && (k === 'gluc' ? C.gluc && !C.o2 : C.o2 && !C.gluc)) {
          C.aloneMsg[k] = true;
          say(k === 'gluc' ? '산소가 없어요! 포도당만으로는 에너지를 만들 수 없어요.' : '포도당이 없어요! 산소만으로는 에너지를 만들 수 없어요.', 'info');
        }
      });
    }
    // 생성물
    for (let i = C.prod.length - 1; i >= 0; i--) {
      const p = C.prod[i];
      p.k += dt / p.dur;
      if (p.k < 0) continue;
      if (p.k < 1) {
        const e = EASE.inOutQuad(p.k);
        p.x = p.x0 + (p.tx - p.x0) * e; p.y = p.y0 + (p.ty - p.y0) * e - Math.sin(e * Math.PI) * 40;
      } else { p.fade += dt; p.y += 70 * dt; if (p.fade > 1.0) C.prod.splice(i, 1); }
    }
    // 에너지 구슬
    for (let i = C.orbs.length - 1; i >= 0; i--) {
      const o = C.orbs[i];
      o.k += dt / o.dur;
      if (o.k < 0) continue;
      const tl = TILES[o.use], e = EASE.inOutCubic(Math.min(1, o.k));
      o.x = o.x0 + (tl.x - o.x0) * e; o.y = o.y0 + (tl.y - 20 - o.y0) * e - Math.sin(e * Math.PI) * 50;
      if (!RM && Math.random() < dt * 40) PFX.emit({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.5, size: 4, color: '#fde047', shape: 'star', rot: Math.random() * 6 });
      if (o.k >= 1) {
        C.tile[o.use] = 1; S.used[o.use]++;
        burst(tl.x, tl.y - 10, [tl.col, COL.energy, '#fff'], 14, { speed: 110, size: 4, gravity: 120 });
        C.orbs.splice(i, 1);
      }
    }
  }
  function drawTok(kind, x, y, r, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (kind === 'gluc') {
      ctx.save();
      if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = r * 0.7; ctx.shadowOffsetY = r * 0.3; }
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath();
      ctx.fillStyle = rgrad(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.1, [[0, '#fde68a'], [0.55, '#f59e0b'], [1, '#b45309']]); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.16, -0.6, 0, TAU); ctx.fill();
    } else {
      const col = kind === 'o2' ? '#3b82f6' : kind === 'co2' ? '#6b7280' : '#22d3ee';
      D.sphere(x, y, r, col, { shadow: o.shadow, text: kind === 'o2' ? 'O₂' : kind === 'co2' ? 'CO₂' : 'H₂O', textScale: kind === 'o2' ? 0.95 : 0.62 });
    }
    ctx.restore();
  }
  function drawMito(x, y, rx, ry, rot, glow, label) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    if (glow > 0.02) D.glow(0, 0, rx * 1.9, '#fde047', 0.75 * glow);
    ctx.shadowColor = 'rgba(120,50,10,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fillStyle = lgrad(0, -ry, 0, ry, [[0, '#fdba74'], [1, '#f97316']]); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#c2410c'; ctx.lineWidth = Math.max(2, rx * 0.035); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.88, ry * 0.8, 0, 0, TAU); ctx.fillStyle = rgba(mix('#ffedd5', '#fde047', glow * 0.8), 0.9); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.88, ry * 0.8, 0, 0, TAU); ctx.clip();
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = Math.max(1.5, rx * 0.028); ctx.lineJoin = 'round';
    const n = 5;
    for (let i = 0; i < n; i++) {
      const cx = lerp(-rx * 0.66, rx * 0.66, i / (n - 1)), top = i % 2 === 0;
      ctx.beginPath(); ctx.moveTo(cx, top ? -ry : ry);
      for (let k = 1; k <= 4; k++) ctx.lineTo(cx + (k % 2 ? 1 : -1) * rx * 0.07, (top ? -ry : ry) + (top ? 1 : -1) * (ry * 1.25) * k / 4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-rx * 0.4, -ry * 0.62, rx * 0.26, ry * 0.12, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawVessel(x, flowCells, t, down) {
    const x0 = x - 44, y0 = 124, w = 88, h = 366;
    ctx.save();
    ctx.shadowColor = 'rgba(120,20,40,.2)'; ctx.shadowBlur = 10;
    rr(x0, y0, w, h, 40); ctx.fillStyle = lgrad(x0, 0, x0 + w, 0, [[0, '#fda4af'], [0.5, '#fecdd3'], [1, '#fda4af']]); ctx.fill();
    ctx.restore();
    rr(x0, y0, w, h, 40); ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); rr(x0 + 3, y0 + 3, w - 6, h - 6, 38); ctx.clip();
    flowCells.forEach((c, i) => {
      const cy = c.y, cxp = x + c.dx;
      ctx.fillStyle = lgrad(cxp - 12, cy - 8, cxp + 12, cy + 8, [[0, '#ef4444'], [1, '#b91c1c']]);
      ctx.beginPath(); ctx.ellipse(cxp, cy, 13, 8, 0.3 * Math.sin(i + t), 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(127,29,29,.45)'; ctx.beginPath(); ctx.ellipse(cxp, cy, 5, 3, 0.3 * Math.sin(i + t), 0, TAU); ctx.fill();
    });
    ctx.restore();
  }
  function drawCell(t, dt) {
    const R = C.R, shake = C.shake > 0 ? Math.sin(t * 60) * 3 * C.shake : 0;
    panel(6, 78, 788, 420, { r: 24, bg: 'rgba(255,255,255,.55)' });
    // 혈관
    drawVessel(80, C.rbcL, t, true);
    drawVessel(720, C.rbcR, t, true);
    // 혈관 속 작은 입자 (장식)
    if (!RM) for (let i = 0; i < 7; i++) {
      const yy = wrap(130 + i * 53 + t * 38, 360) + 124;
      D.sphere(80 + ((i * 37) % 50) - 25, yy, 4, i % 2 ? '#f59e0b' : '#3b82f6', { gloss: false });
    }
    pill('🩸 혈액이 가져와요', 80, 104, { bg: '#be123c', size: 14, h: 26, pad: 10 });
    pill('🩸 혈액이 가져가요', 720, 104, { bg: '#be123c', size: 14, h: 26, pad: 10 });
    pill('→ 폐 · 콩팥으로', 720, 506, { bg: '#64748b', size: 13, h: 24, pad: 8 });
    // 세포
    const wb = RM ? 0 : Math.sin(t * 1.3) * 3;
    const pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, k = 1 + 0.03 * Math.sin(a * 3 + 1) + wb * 0.003 * Math.sin(a * 5 + t); pts.push([CELLC.x + Math.cos(a) * CELLC.rx * k, CELLC.y + Math.sin(a) * CELLC.ry * k]); }
    ctx.save();
    ctx.shadowColor = 'rgba(190,60,100,.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.beginPath(); smooth(pts, true);
    ctx.fillStyle = rgrad(CELLC.x - 60, CELLC.y - 60, 20, CELLC.x, CELLC.y, 260, [[0, '#ffeef2'], [1, '#fbc4d2']]); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); smooth(pts, true); ctx.clip();
    ctx.strokeStyle = 'rgba(220,110,140,.22)'; ctx.lineWidth = 6;
    for (let i = 0; i < 9; i++) { const yy = CELLC.y - 150 + i * 36; ctx.beginPath(); ctx.moveTo(CELLC.x - 240, yy); for (let x = -240; x <= 240; x += 40) ctx.lineTo(CELLC.x + x, yy + Math.sin(x * 0.03 + i) * 4); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); smooth(pts, true); ctx.strokeStyle = '#e07a98'; ctx.lineWidth = 4; ctx.stroke();
    // 핵 · 작은 미토콘드리아
    ctx.save(); ctx.translate(292, 236); ctx.rotate(-0.3);
    ctx.fillStyle = lgrad(0, -26, 0, 26, [[0, '#ddd6fe'], [1, '#a78bfa']]); ctx.beginPath(); ctx.ellipse(0, 0, 36, 26, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#6d28d9'; ctx.beginPath(); ctx.arc(6, -2, 8, 0, TAU); ctx.fill(); ctx.restore();
    txt('핵', 292, 282, { size: 13, color: '#6d28d9', align: 'center', weight: 800 });
    drawMito(512, 232, 40, 20, 0.5, C.glow * 0.5);
    drawMito(318, 392, 38, 19, -0.35, C.glow * 0.5);
    drawMito(500, 392, 36, 18, 0.2, C.glow * 0.4);
    pill('근육 세포', 262, 186, { bg: '#be185d', size: 14, h: 26 });
    // 큰 미토콘드리아
    drawMito(MITO.x + shake, MITO.y, MITO.rx, MITO.ry, 0, C.glow);
    if (C.over) { ctx.save(); ctx.strokeStyle = 'rgba(22,163,74,' + (0.5 + 0.4 * Math.sin(t * 8)).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(MITO.x, MITO.y, MITO.rx + 12, MITO.ry + 12, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    pill('미토콘드리아', MITO.x, MITO.y + MITO.ry + 28, { bg: '#9a3412', size: 15, h: 28, pad: 12 });
    // 슬롯 (재료 자리)
    ['gluc', 'o2'].forEach((k) => {
      const s = SLOT[k], pop = k === 'gluc' ? C.popG : C.popO;
      let px = s.x, py = s.y, sc = 1;
      if (R && !R.done) { const e = EASE.inOutQuad(Math.min(1, R.t / 0.7)); px = lerp(s.x, MITO.x, e); py = lerp(s.y, MITO.y, e); sc = 1 - 0.25 * e; }
      if ((k === 'gluc' ? C.gluc : C.o2) || (R && !R.done)) {
        const bump = 1 + 0.25 * Math.sin(clamp(pop, 0, 1) * Math.PI);
        drawTok(k, px, py, 16 * sc * bump);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(154,52,18,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, TAU); ctx.stroke(); ctx.restore();
        txt(DISP[k].name, s.x, s.y + 33, { size: 13, weight: 800, color: '#9a3412', align: 'center', halo: 'rgba(255,237,213,.9)' });
      }
    });
    // 안내 화살표 (처음)
    if (S.react === 0 && !C.drag && !C.tok.length && !C.gluc && !C.o2) {
      ctx.save(); ctx.strokeStyle = 'rgba(22,163,74,.85)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30; ctx.lineCap = 'round';
      [DISP.gluc, DISP.o2].forEach((d) => { ctx.beginPath(); ctx.moveTo(d.x + 36, d.y); ctx.quadraticCurveTo((d.x + MITO.x) / 2 - 30, d.y + (d.y < 300 ? -30 : 30), MITO.x - MITO.rx - 6, MITO.y + (d.y < 300 ? -10 : 10)); ctx.stroke(); });
      ctx.restore();
    }
    // 재료 공급기
    [DISP.gluc, DISP.o2].forEach((d, i) => {
      const k = i === 0 ? 'gluc' : 'o2', bob = RM ? 0 : Math.sin(t * 2.4 + i * 2) * 3;
      const dragging = C.drag && C.drag.kind === k;
      ctx.save(); ctx.globalAlpha = dragging ? 0.45 : 1;
      drawTok(k, d.x, d.y + bob, 25, { shadow: true });
      ctx.restore();
      pill(d.name, d.x, d.y + 46, { bg: k === 'gluc' ? '#b45309' : '#1d4ed8', size: 14, h: 24, pad: 10 });
      if (!dragging && S.react < 2) D.ring(d.x, d.y + bob, 36, t, { color: k === 'gluc' ? '#f59e0b' : '#3b82f6', width: 3 });
    });
    // 날아가는 재료 · 끌고 있는 재료
    C.tok.forEach((tk) => { drawTok(tk.kind, tk.x, tk.y, tk.st === 'drag' ? 28 : 22, { shadow: true }); });
    // 생성물
    C.prod.forEach((p) => { if (p.k < 0) return; drawTok(p.kind, p.x, p.y, p.kind === 'co2' ? 15 : 13, { alpha: p.k < 1 ? 1 : Math.max(0, 1 - p.fade) }); });
    // 에너지 구슬
    C.orbs.forEach((o) => { if (o.k < 0) return; D.glow(o.x, o.y, 36, COL.energy, 0.9); D.sphere(o.x, o.y, 11, '#fde047', { gloss: true }); D.spark(o.x, o.y, 15, S.t, '#fff7ae'); });
    // 반응식
    panel(120, 12, 560, 54, { r: 18 });
    const items = [['포도당', 'gluc'], ['+'], ['산소', 'o2'], ['→'], ['이산화 탄소', 'co2'], ['+'], ['물', 'h2o'], ['+'], ['에너지', 'en']];
    ctx.font = font(15, 800);
    const ws = items.map((it) => (it.length > 1 ? ctx.measureText(it[0]).width + 22 : 18));
    const total = ws.reduce((a, b) => a + b, 0) + (items.length - 1) * 4;
    let ex = 400 - total / 2;
    const lit = { gluc: C.gluc || (R && !R.done), o2: C.o2 || (R && !R.done), co2: C.prodT < 2.2, h2o: C.prodT < 2.2, en: C.prodT < 2.2 };
    items.forEach((it, i) => {
      if (it.length === 1) { txt(it[0], ex + ws[i] / 2, 46, { size: it[0] === '→' ? 20 : 18, weight: 800, color: '#64748b', align: 'center' }); }
      else {
        const on = lit[it[1]];
        const bg = on ? { gluc: '#f59e0b', o2: '#3b82f6', co2: '#6b7280', h2o: '#0ea5e9', en: '#eab308' }[it[1]] : '#e2e8f0';
        if (on && it[1] === 'en') D.glow(ex + ws[i] / 2, 39, 46, '#fde047', 0.7);
        pill(it[0], ex + ws[i] / 2, 39, { bg, color: on ? '#fff' : '#64748b', size: 15, h: 28, pad: 11 });
      }
      ex += ws[i] + 4;
    });
    // 에너지 쓰임새
    txt('만들어진 에너지는 이렇게 쓰여요', 410, 512, { size: 14, weight: 800, color: '#64748b', align: 'center' });
    TILES.forEach((tl, i) => {
      const pu = C.tile[i];
      panel(tl.x - tl.w / 2, tl.y - 18, tl.w, 56, { r: 16, bg: pu > 0 ? mix('#ffffff', '#fef9c3', pu) : '#fff', border: pu > 0.05 ? tl.col : null });
      if (pu > 0.05) D.glow(tl.x, tl.y + 10, 80, tl.col, 0.35 * pu);
      txt(tl.icon, tl.x - 40, tl.y + 20 - 2 * Math.sin(pu * Math.PI * 2), { size: 26 + pu * 8, align: 'center' });
      txt(tl.name, tl.x + 14, tl.y + 8, { size: 15, weight: 800, color: '#334155', align: 'center', max: 80 });
      txt(S.used[i] ? '×' + S.used[i] : '', tl.x + 14, tl.y + 28, { size: 13, weight: 800, color: tl.col, align: 'center' });
    });
    pill('⚡ 에너지 만든 횟수 ' + S.react, 400, 482, { bg: '#854d0e', size: 14, h: 26, pad: 12 });
  }

  /* =========================================================
     장면 3 · 4: 통합 지도 (소화 · 순환 · 호흡 · 배설계 + 세포)
     ========================================================= */
  const NODES = {
    resp: { x: 290, y: 108, r: 52, name: '호흡계', col: '#ec4899' },
    circ: { x: 290, y: 262, r: 50, name: '순환계', col: '#e11d48' },
    dig: { x: 230, y: 408, r: 54, name: '소화계', col: '#f59e0b' },
    exc: { x: 350, y: 408, r: 54, name: '배설계', col: '#0ea5e9' },
    cell: { x: 640, y: 262, r: 112, name: '근육 세포', col: '#a855f7' },
  };
  const NKEYS = Object.keys(NODES);
  const LINKS = [
    { id: 'dig-circ', from: 'dig', to: 'circ', label: '영양소(포도당)', cols: [COL.gluc], off: 0, bend: 0, side: -1, grp: 'in',
      ok: '소화계에서 흡수한 영양소(포도당)가 혈액(순환계)에 실려요.' },
    { id: 'resp-circ', from: 'resp', to: 'circ', label: '산소', cols: [COL.o2], off: 13, bend: 0, side: 1, grp: 'in',
      ok: '호흡계(폐)에서 얻은 산소가 혈액에 실려요.' },
    { id: 'circ-cell', from: 'circ', to: 'cell', label: '영양소 · 산소', cols: [COL.gluc, COL.o2], off: 13, bend: 0, side: 1, grp: 'in',
      ok: '순환계가 영양소와 산소를 온몸의 세포로 운반해요.' },
    { id: 'cell-circ', from: 'cell', to: 'circ', label: '이산화 탄소 · 노폐물', cols: [COL.co2, COL.waste], off: 13, bend: 0, side: 1, grp: 'out',
      ok: '세포호흡으로 생긴 이산화 탄소와 노폐물이 혈액으로 나와요.' },
    { id: 'circ-resp', from: 'circ', to: 'resp', label: '이산화 탄소', cols: [COL.co2], off: 13, bend: 0, side: 1, grp: 'out',
      ok: '이산화 탄소는 혈액을 따라 폐로 가서 날숨으로 나가요.' },
    { id: 'circ-exc', from: 'circ', to: 'exc', label: '요소 · 물', cols: [COL.waste], off: 0, bend: 0, side: -1, grp: 'out',
      ok: '요소와 물 같은 노폐물은 혈액을 따라 콩팥으로 가서 오줌이 되어 나가요.' },
  ];
  const LINK = {};
  LINKS.forEach((L) => {
    LINK[L.id] = L;
    const a = NODES[L.from], b = NODES[L.to];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const sx = a.x + ux * (a.r - 6) + nx * L.off, sy = a.y + uy * (a.r - 6) + ny * L.off;
    const ex = b.x - ux * (b.r + 3) + nx * L.off, ey = b.y - uy * (b.r + 3) + ny * L.off;
    L.pts = []; L.nx = nx; L.ny = ny; L.ux = ux; L.uy = uy;
    const n = 24;
    for (let i = 0; i <= n; i++) { const k = i / n; L.pts.push([sx + (ex - sx) * k, sy + (ey - sy) * k]); }
    L.len = Math.hypot(ex - sx, ey - sy);
    L.done = false; L.k = 0; L.phase = Math.random(); L.shake = 0;
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    L.mx = mx; L.my = my; L.ex = ex; L.ey = ey; L.sx = sx; L.sy = sy;
  });
  const MAP = { drag: null, shake: {}, over: null, cellGlow: 0, burstT: 0, lastLinkT: 0 };
  const FAULT_E = { none: 1, dig: 0.2, resp: 0.2, circ: 0.1, exc: 0.9 };
  const FAULT_W = { none: 0.1, dig: 0.1, resp: 0.6, circ: 0.9, exc: 1 };
  const FAULT_MSG = {
    none: '모든 기관계가 정상이에요. 세포호흡이 잘 일어나 에너지가 충분해요!',
    dig: '소화계에 문제가 생기면 영양소(포도당)를 흡수하지 못해, 세포가 에너지를 만들 재료가 부족해져요.',
    resp: '호흡계에 문제가 생기면 산소를 얻지 못하고 이산화 탄소도 내보내지 못해요. 세포호흡이 잘 일어나지 않아요.',
    circ: '순환계에 문제가 생기면 영양소와 산소가 세포에 닿지 못하고, 노폐물도 나오지 못해요.',
    exc: '배설계에 문제가 생기면 요소 같은 노폐물이 몸에 쌓여요. 에너지는 한동안 만들 수 있지만 몸에는 해로워요.',
  };
  /* 고장 났을 때 흐르지 않는 물질 */
  function blocked(L, ci) {
    const f = S.fault;
    if (f === 'none' || !has('fault')) return false;
    if (f === 'dig') return L.id === 'dig-circ' || (L.id === 'circ-cell' && ci === 0);
    if (f === 'resp') return L.id === 'resp-circ' || L.id === 'circ-resp' || (L.id === 'circ-cell' && ci === 1);
    if (f === 'exc') return L.id === 'circ-exc';
    return false;
  }
  const faultOf = (f) => (has('fault') ? f : 'none');
  const linksDone = (ids) => ids.every((id) => LINK[id].done);
  const supplyOK = () => linksDone(['dig-circ', 'resp-circ', 'circ-cell']);
  const outOK = () => linksDone(['cell-circ', 'circ-resp', 'circ-exc']);
  const nodeAt = (p, pad) => { let best = null, bd = 1e9; NKEYS.forEach((k) => { const n = NODES[k], d = Math.hypot(p.x - n.x, p.y - n.y); if (d <= n.r + (pad || 6) && d < bd) { bd = d; best = k; } }); return best; };
  function wrongLink(a, b) {
    if (LINK[b + '-' + a]) return '화살표 방향이 반대예요! 물질이 어디에서 어디로 이동하는지 생각해 봐요.';
    if (a === 'dig' && b === 'cell') return '소화계에서 흡수한 영양소는 세포로 바로 가지 않아요. 혈액(순환계)이 운반해요.';
    if (a === 'resp' && b === 'cell') return '산소도 세포로 바로 가지 않아요. 혈액(순환계)에 실려 운반돼요.';
    if (a === 'cell' && (b === 'resp' || b === 'exc')) return '세포에서 나온 노폐물은 먼저 혈액(순환계)으로 나와요.';
    if (a !== 'circ' && b !== 'circ') return '두 기관계는 직접 이어지지 않아요. 물질은 순환계(혈액)를 거쳐 이동해요.';
    return '그 방향으로 이동하는 물질은 없어요. 다른 길을 찾아봐요.';
  }
  function connect(a, b) {
    const L = LINK[a + '-' + b];
    if (!L) { MAP.shake[a] = 0.45; MAP.shake[b] = 0.45; Sound.fail(); say(wrongLink(a, b), 'bad'); return false; }
    if (L.done) { say('이미 이어진 길이에요.', 'info'); return false; }
    L.done = true; L.k = 0; L.phase = 0;
    SciSim.tween(L, { k: 1 }, { duration: 0.7, ease: 'outCubic' });
    Sound.success();
    burst(L.ex, L.ey, [L.cols[0], '#fff', '#fde047'], 14, { speed: 100, size: 4 });
    MAP.shake[b] = 0; NODES[b].pulse = 1;
    say('✔ ' + L.ok, 'good');
    return true;
  }
  function setLinks(on) { LINKS.forEach((L) => { L.done = on; L.k = on ? 1 : 0; }); }
  NKEYS.forEach((k) => { NODES[k].pulse = 0; });

  function updateMap(dt) {
    S.energyD = approach(S.energyD, supplyOK() ? FAULT_E[faultOf(S.fault)] : 0.04, dt, 2.2);
    S.wasteD = approach(S.wasteD, outOK() ? FAULT_W[faultOf(S.fault)] : 0.55, dt, 1.4);
    const fa = faultOf(S.fault);
    if (fa !== 'none') S.faultT[fa] += dt;
    NKEYS.forEach((k) => { NODES[k].pulse = Math.max(0, NODES[k].pulse - dt * 1.6); if (MAP.shake[k] > 0) MAP.shake[k] = Math.max(0, MAP.shake[k] - dt); });
    const sp = 52 * (0.55 + 1.5 * S.Id);
    LINKS.forEach((L) => {
      if (!L.done) return;
      const f = fa === 'circ' ? 0.3 : 1;
      L.phase = wrap(L.phase + dt * sp * f / L.len, 1);
    });
    MAP.cellGlow = approach(MAP.cellGlow, S.energyD * (0.45 + 0.4 * beat(S.hb)), dt, 6);
    // 에너지 폭발 (세포)
    if (!RM && S.energyD > 0.15) {
      MAP.burstT -= dt;
      if (MAP.burstT <= 0) {
        MAP.burstT = (0.9 - 0.55 * S.Id) / S.energyD * (0.7 + Math.random() * 0.6);
        const a = Math.random() * TAU, rr0 = 20 + Math.random() * 50, N = NODES.cell;
        const bx = N.x + Math.cos(a) * rr0, by = N.y + Math.sin(a) * rr0 * 0.8;
        burst(bx, by, [COL.energy, '#fb923c', '#fff'], 7, { speed: 80, size: 3.5, gravity: -20, life: 0.7 });
      }
    }
  }

  function drawStomachIntestine(x, y) {
    ctx.save();
    // 위
    ctx.beginPath(); ctx.moveTo(x - 6, y - 36); ctx.bezierCurveTo(x - 8, y - 22, x - 30, y - 22, x - 30, y - 6); ctx.bezierCurveTo(x - 30, y + 6, x - 14, y + 8, x - 4, y - 2); ctx.bezierCurveTo(x + 6, y - 10, x + 10, y - 22, x + 8, y - 30); ctx.closePath();
    ctx.fillStyle = lgrad(x - 30, y - 30, x + 10, y + 8, [[0, '#fdba74'], [1, '#ea7a3c']]); ctx.fill(); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2.5; ctx.stroke();
    // 작은창자 (구불구불)
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 4, y + 8);
    const rows = [[x + 24, y + 10], [x - 20, y + 20], [x + 24, y + 30], [x - 20, y + 40]];
    ctx.lineTo(x + 20, y + 10); ctx.lineTo(x - 22, y + 20); ctx.lineTo(x + 22, y + 30); ctx.lineTo(x - 18, y + 40); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 20, y + 10); ctx.lineTo(x - 22, y + 20); ctx.lineTo(x + 22, y + 30); ctx.lineTo(x - 18, y + 40); ctx.stroke();
    ctx.restore();
  }
  function drawKidneys(x, y) {
    ctx.save();
    [-1, 1].forEach((d) => {
      ctx.save(); ctx.translate(x + d * 28, y - 14); ctx.rotate(d * 0.25);
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 24, 0, 0, TAU);
      ctx.fillStyle = lgrad(-14, -20, 14, 20, [[0, '#d9693a'], [1, '#8f2d14']]); ctx.fill(); ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f5e6d8'; ctx.beginPath(); ctx.ellipse(-d * 12, 0, 6, 10, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + d * 16, y - 8); ctx.quadraticCurveTo(x + d * 14, y + 8, x + d * 3, y + 20); ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(x, y + 28, 13, 12, 0, 0, TAU); ctx.fillStyle = lgrad(x, y + 16, x, y + 40, [[0, '#fef3c7'], [1, '#fcd34d']]); ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function drawCellNode(N, t) {
    const x = N.x, y = N.y;
    ctx.save();
    ctx.shadowColor = 'rgba(190,60,100,.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.beginPath(); ctx.arc(x, y, N.r, 0, TAU);
    ctx.fillStyle = rgrad(x - 40, y - 40, 10, x, y, N.r, [[0, '#fff1f5'], [1, '#fbc4d2']]); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#e07a98'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, N.r, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, N.r - 2, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(220,110,140,.2)'; ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) { const yy = y - 90 + i * 30; ctx.beginPath(); ctx.moveTo(x - 110, yy); ctx.lineTo(x + 110, yy); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.ellipse(x - 52, y - 52, 24, 18, -0.3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.stroke();
    drawMito(x + 6, y + 6, 54, 29, -0.1, MAP.cellGlow);
    drawMito(x - 46, y + 62, 28, 15, 0.4, MAP.cellGlow * 0.8);
    drawMito(x + 56, y - 52, 26, 14, 0.5, MAP.cellGlow * 0.8);
    if (MAP.cellGlow > 0.5) D.glow(x + 6, y + 6, 100, '#fde047', (MAP.cellGlow - 0.4) * 0.4);
    txt('미토콘드리아', x + 6, y + 56, { size: 12.5, weight: 800, color: '#9a3412', align: 'center', halo: 'rgba(255,237,213,.9)', haloW: 3 });
  }
  function drawNode(k, t) {
    const N = NODES[k], sh = MAP.shake[k] > 0 ? Math.sin(t * 70) * 5 * MAP.shake[k] : 0;
    const x = N.x + sh, y = N.y;
    const bt = beat(S.hb), pulse = N.pulse;
    if (k === 'cell') { drawCellNode(N, t); }
    else {
      ctx.save();
      ctx.shadowColor = 'rgba(30,60,40,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      ctx.beginPath(); ctx.arc(x, y, N.r, 0, TAU); ctx.fillStyle = '#fffaf5'; ctx.fill();
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = N.col; ctx.beginPath(); ctx.arc(x, y, N.r, 0, TAU); ctx.stroke();
      if (k === 'resp') drawLungs(x, y + 2, 0.98, 0.5 + 0.5 * Math.sin(S.br) * (0.6 + S.Id * 0.5) + 0.5 * (0.4 + 0.5 * S.Id));
      else if (k === 'circ') drawHeart(x, y + 2, 1.05 + 0.2 * bt, 0.3 + bt * 0.7);
      else if (k === 'dig') drawStomachIntestine(x, y - 4);
      else drawKidneys(x, y + 2);
    }
    if (pulse > 0.02) { ctx.strokeStyle = rgba(N.col, pulse * 0.8); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, N.r + 6 + (1 - pulse) * 16, 0, TAU); ctx.stroke(); }
    if (MAP.over === k) { ctx.strokeStyle = 'rgba(22,163,74,.9)'; ctx.lineWidth = 5; ctx.setLineDash([9, 6]); ctx.beginPath(); ctx.arc(x, y, N.r + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    const fa = faultOf(S.fault);
    if (fa === k) {
      const a = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.strokeStyle = 'rgba(220,38,38,' + (0.5 + a * 0.5).toFixed(2) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, N.r + 5, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x + N.r * 0.72, y - N.r * 0.72, 15, 0, TAU); ctx.fill();
      txt('!', x + N.r * 0.72, y - N.r * 0.72 + 1, { size: 20, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    }
    // 이름표
    if (k === 'resp' || k === 'circ') pill(N.name, x - N.r - 8, y, { align: 'right', bg: N.col, size: 15, h: 28, pad: 12 });
    else pill(N.name, x, y + N.r + 18, { bg: N.col, size: 15, h: 28, pad: 12 });
  }
  function drawLink(L, t) {
    if (!L.done && L.k <= 0) return;
    const k = L.k, n = L.pts.length, last = Math.max(1, Math.floor((n - 1) * k));
    const fa = faultOf(S.fault);
    const allBlocked = L.cols.every((c, i) => blocked(L, i));
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pathTo = () => { ctx.beginPath(); ctx.moveTo(L.pts[0][0], L.pts[0][1]); for (let i = 1; i <= last; i++) ctx.lineTo(L.pts[i][0], L.pts[i][1]); };
    pathTo(); ctx.strokeStyle = allBlocked ? 'rgba(148,163,184,.35)' : 'rgba(100,116,139,.28)'; ctx.lineWidth = 15; ctx.stroke();
    pathTo(); ctx.strokeStyle = allBlocked ? '#e2e8f0' : '#fff'; ctx.lineWidth = 10; ctx.stroke();
    if (allBlocked) { pathTo(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.stroke(); ctx.setLineDash([]); }
    // 흐르는 입자
    const nd = Math.max(3, Math.floor(L.len / 24));
    for (let i = 0; i < nd; i++) {
      const u = wrap(i / nd + L.phase, 1);
      if (u > k) continue;
      const ci = i % L.cols.length;
      if (blocked(L, ci)) continue;
      if (fa === 'circ' && i % 4 !== 0) continue;
      const f = u * (n - 1), i0 = Math.min(n - 2, Math.floor(f)), r0 = f - i0;
      const x = L.pts[i0][0] + (L.pts[i0 + 1][0] - L.pts[i0][0]) * r0, y = L.pts[i0][1] + (L.pts[i0 + 1][1] - L.pts[i0][1]) * r0;
      const a = Math.min(1, u * 10, (1 - u) * 10);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = L.cols[ci]; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.arc(x - 1.3, y - 1.5, 1.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 화살촉
    if (k >= 0.98) {
      const ex = L.ex, ey = L.ey, ux = L.ux, uy = L.uy;
      ctx.fillStyle = allBlocked ? '#94a3b8' : '#475569';
      ctx.beginPath(); ctx.moveTo(ex + ux * 5, ey + uy * 5); ctx.lineTo(ex - ux * 11 + L.nx * 8, ey - uy * 11 + L.ny * 8); ctx.lineTo(ex - ux * 11 - L.nx * 8, ey - uy * 11 - L.ny * 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawLinkLabel(L) {
    if (!L.done || L.k < 0.95) return;
    ctx.font = font(13.5, 800);
    const w = ctx.measureText(L.label).width + 18;
    const m = Math.abs(L.nx) * (w / 2 + 14) + Math.abs(L.ny) * 17;
    const px = L.mx + L.nx * L.side * m, py = L.my + L.ny * L.side * m;
    pill(L.label, px, py, { bg: '#ffffff', color: '#334155', border: L.cols[0], borderW: 2.5, size: 13.5, h: 24, pad: 9, shadow: true });
  }
  function drawBodyBackdrop() {
    ctx.save();
    ctx.fillStyle = '#fbe9d9'; ctx.strokeStyle = '#f0c9a8'; ctx.lineWidth = 3;
    // 다리
    [[250, 592], [330, 592]].forEach(([x]) => { rr(x - 28, 440, 56, 170, 26); ctx.fill(); ctx.stroke(); });
    // 팔
    ctx.lineCap = 'round'; ctx.strokeStyle = '#f0c9a8'; ctx.lineWidth = 42; ctx.beginPath(); ctx.moveTo(172, 100); ctx.lineTo(132, 330); ctx.moveTo(408, 100); ctx.lineTo(446, 300); ctx.stroke();
    ctx.strokeStyle = '#fbe9d9'; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(172, 100); ctx.lineTo(132, 330); ctx.moveTo(408, 100); ctx.lineTo(446, 300); ctx.stroke();
    // 몸통 · 머리
    rr(172, 58, 236, 420, 74); ctx.fillStyle = '#fdeee0'; ctx.fill(); ctx.strokeStyle = '#f0c9a8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fbe9d9'; ctx.beginPath(); ctx.arc(290, 34, 26, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawMap(t, dt) {
    drawBodyBackdrop();
    // 확대 표시 (팔 근육 → 세포)
    ctx.save();
    ctx.strokeStyle = 'rgba(168,85,247,.45)'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 14;
    ctx.beginPath(); ctx.moveTo(446, 170); ctx.lineTo(578, 172); ctx.moveTo(446, 196); ctx.lineTo(578, 352); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f9a8d4'; ctx.beginPath(); ctx.arc(442, 183, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#be185d'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    LINKS.forEach((L) => drawLink(L, t));
    // 드래그 중인 선
    if (MAP.drag) {
      const N = NODES[MAP.drag.from], d = MAP.drag;
      ctx.save(); ctx.strokeStyle = 'rgba(22,163,74,.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(d.x, d.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, TAU); ctx.fill(); ctx.restore();
    }
    NKEYS.forEach((k) => drawNode(k, t));
    LINKS.forEach(drawLinkLabel);
    // 처음 안내
    if (!LINKS.some((L) => L.done) && !MAP.drag && game && !game.free && game.level === 2) {
      const a = NODES.dig, b = NODES.circ;
      const u = (t * 0.5) % 1;
      const hx = a.x + (b.x - a.x) * u, hy = a.y + (b.y - a.y) * u;
      txt('👆', hx + 8, hy + 10, { size: 30, align: 'center' });
      pill('소화계에서 순환계로 끌어 보세요', 300, 560, { bg: 'rgba(22,101,52,.92)', size: 15, h: 30, pad: 14, shadow: true });
    }
    // 범례 (아래 한 줄)
    {
      const items = [['영양소', COL.gluc], ['산소', COL.o2], ['이산화 탄소', COL.co2], ['노폐물', COL.waste]];
      ctx.font = font(14, 700);
      const ws = items.map((r) => ctx.measureText(r[0]).width + 24);
      const tot = ws.reduce((x, y) => x + y, 0) + 14;
      let lx = 788 - tot;
      panel(lx - 4, 570, tot + 8, 28, { r: 14, bg: 'rgba(255,255,255,.9)' });
      lx += 10;
      items.forEach((r, i) => {
        ctx.fillStyle = r[1]; ctx.beginPath(); ctx.arc(lx + 6, 584, 5.5, 0, TAU); ctx.fill();
        txt(r[0], lx + 16, 589, { size: 14, weight: 700, color: '#334155' });
        lx += ws[i];
      });
    }
    // 진행 · 결과 패널
    if (has('fault')) {
      panel(548, 412, 240, 118, { r: 16 });
      txt('세포의 에너지 생산', 566, 438, { size: 15, weight: 800, color: '#854d0e' });
      rr(566, 446, 204, 16, 8); ctx.fillStyle = '#fef9c3'; ctx.fill();
      rr(566, 446, Math.max(10, 204 * S.energyD), 16, 8); ctx.fillStyle = S.energyD > 0.6 ? '#eab308' : '#ef4444'; ctx.fill();
      txt('몸속 노폐물 쌓임', 566, 494, { size: 15, weight: 800, color: '#7c2d12' });
      rr(566, 502, 204, 16, 8); ctx.fillStyle = '#ffedd5'; ctx.fill();
      rr(566, 502, Math.max(10, 204 * S.wasteD), 16, 8); ctx.fillStyle = S.wasteD > 0.5 ? '#b45309' : '#fdba74'; ctx.fill();
      txt(Math.round(S.energyD * 100) + '%', 770, 438, { size: 14, weight: 800, color: '#854d0e', align: 'right' });
      txt(S.wasteD > 0.57 ? '많이 쌓여요' : S.wasteD > 0.3 ? '조금 쌓여요' : '정상', 770, 494, { size: 14, weight: 800, color: '#7c2d12', align: 'right' });
    } else {
      const n = LINKS.filter((L) => L.done).length;
      pill('연결선 ' + n + ' / 6', 664, 436, { bg: n === 6 ? '#16a34a' : '#475569', size: 15, h: 30, pad: 14 });
    }
  }

  /* =========================================================
     장면 전환 · 화면 구성
     ========================================================= */
  const SCENE_LABEL = {
    body: '🏃 운동하면 몸이 어떻게 달라질까?',
    cell: '⚡ 근육 세포 속 미토콘드리아 — 세포호흡',
    map: '🗺️ 통합 지도 — 에너지를 얻기 위한 기관계의 협력',
    fault: '🩺 한 기관계에 문제가 생기면?',
  };
  let sceneBtns = [], faultBtns = [];
  const intRange = SciSim.bindRange($('#sInt'), $('#oInt'), (v) => levelName(v / 100), (v) => { S.I = v / 100; });
  function updateUI() {
    const sc = S.scene;
    $('#sceneLabel').textContent = sc === 'map' && has('fault') && game && (game.level >= 3 || game.free) ? SCENE_LABEL.fault : SCENE_LABEL[sc];
    sceneBtns.forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    faultBtns.forEach((b) => b.classList.toggle('on', b.dataset.fault === S.fault));
    const show = { int: sc === 'body' || sc === 'map', fault: sc === 'map' && has('fault'), reset: sc === 'map' && has('map'), cellnote: sc === 'cell' };
    let any = false;
    $$('#ctrlCard [data-ctl]').forEach((n) => { const on = !!show[n.dataset.ctl]; n.hidden = !on; if (on) any = true; });
    $('#ctrlCard').hidden = !any;
  }
  function setScene(name, o) {
    o = o || {};
    if (name === S.scene && !o.force) { updateUI(); return; }
    S.scene = name; S.sceneT = 0;
    if (!RM) SciSim.tween(S, { sceneT: 1 }, { duration: 0.5, ease: 'outCubic' }); else S.sceneT = 1;
    if (name === 'cell' && o.reset) resetCell();
    MAP.drag = null; MAP.over = null; C.drag = null;
    C.tok = C.tok.filter((t) => t.st !== 'drag');
    updateUI();
  }
  function setFault(f) {
    S.fault = f;
    faultBtns.forEach((b) => b.classList.toggle('on', b.dataset.fault === f));
    Sound.click();
    say(FAULT_MSG[f], f === 'none' ? 'good' : 'info'); S.msgT = 8;
  }
  function syncSlider() { const el = $('#sInt'); el.value = Math.round(S.I * 100); intRange.refresh(); }

  /* =========================================================
     갱신 · 그리기 루프
     ========================================================= */
  function update(dt) {
    updateVitals(dt);
    if (S.scene === 'cell') updateCell(dt);
    if (S.scene === 'map') updateMap(dt);
    PFX.update(dt);
    if (S.msgT > 0) S.msgT -= dt;
  }
  const BUB = { body: { x: 240, y: 130, w: 400 }, cell: { x: 400, y: 114, w: 500 }, map: { x: 632, y: 72, w: 320 } };
  function draw(t, dt) {
    view.clear(BG);
    ctx.save();
    const k = clamp(S.sceneT, 0, 1);
    ctx.globalAlpha = k;
    const sc = 1 + (1 - k) * 0.03;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    if (S.scene === 'body') drawBody(t, dt);
    else if (S.scene === 'cell') drawCell(t, dt);
    else drawMap(t, dt);
    ctx.restore();
    PFX.draw(ctx);
    if (S.msgT > 0) {
      const b = BUB[S.scene], a = Math.min(1, S.msgT / 0.4);
      ctx.save(); ctx.globalAlpha = a;
      const ls = lines(S.msg, b.w - 36, 15, 800), hh = ls.length * 22 + 16;
      rr(b.x - b.w / 2, b.y - hh / 2, b.w, hh, 14);
      ctx.fillStyle = S.msgKind === 'bad' ? '#7f1d1d' : S.msgKind === 'good' ? '#166534' : '#1e3a5f'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.fill();
      ctx.shadowColor = 'transparent';
      ls.forEach((ln, i) => txt(ln, b.x, b.y - hh / 2 + 19 + i * 22, { size: 15, weight: 800, color: '#fff', align: 'center', base: 'middle' }));
      ctx.restore();
    }
  }

  /* =========================================================
     포인터
     ========================================================= */
  const handlers = {
    down(p) {
      if (S.scene === 'cell') {
        for (const k of ['gluc', 'o2']) {
          const d = DISP[k];
          if (Math.hypot(p.x - d.x, p.y - d.y) <= 40) {
            C.drag = { kind: k };
            C.tok.push({ kind: k, x: p.x, y: p.y, st: 'drag', k: 0 }); Sound.click();
            return true;
          }
        }
        return false;
      }
      if (S.scene === 'map' && has('map')) {
        const n = nodeAt(p, 4);
        if (n) { MAP.drag = { from: n, x: p.x, y: p.y }; Sound.click(); return true; }
      }
      return false;
    },
    move(p) {
      if (C.drag) { const t = C.tok.find((q) => q.st === 'drag'); if (t) { t.x = p.x; t.y = p.y; C.over = insideCell(p.x, p.y); } }
      if (MAP.drag) { MAP.drag.x = p.x; MAP.drag.y = p.y; const n = nodeAt(p, 4); MAP.over = n && n !== MAP.drag.from ? n : null; }
    },
    up(p) {
      if (C.drag) { const t = C.tok.find((q) => q.st === 'drag'); C.drag = null; C.over = false; if (t) dropToken(t); return; }
      if (MAP.drag) {
        const from = MAP.drag.from, to = nodeAt(p, 4); MAP.drag = null; MAP.over = null;
        if (to && to !== from) connect(from, to);
        else if (!to) say('다른 기관계 위에서 손가락을 떼 보세요.', 'info');
      }
    },
    hover(p) {
      if (S.scene === 'cell') return Math.hypot(p.x - DISP.gluc.x, p.y - DISP.gluc.y) <= 40 || Math.hypot(p.x - DISP.o2.x, p.y - DISP.o2.y) <= 40 ? 'grab' : null;
      if (S.scene === 'map' && has('map')) return nodeAt(p, 4) ? 'grab' : null;
      return null;
    },
  };

  /* =========================================================
     차시 구성
     ========================================================= */
  const FAULT_ORDER = ['dig', 'resp', 'circ', 'exc'];
  const FAULT_NAME = { dig: '소화계', resp: '호흡계', circ: '순환계', exc: '배설계' };

  const levels = [
    /* ---------------- STEP 1 ---------------- */
    {
      title: '운동하면 몸이 어떻게 달라질까?', short: '운동과 몸', icon: '🏃', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 달리기를 하면 왜 숨이 차고 심장이 빨리 뛸까?</p>' +
        '<p>운동 강도를 바꿔 가며 <b>심장 박동</b>, <b>호흡</b>, <b>체온</b>이 어떻게 달라지는지 살펴봐요.</p>' +
        '<p>소화·순환·호흡·배설 차시에서 배운 기관계들이 <b>함께 일하는 까닭</b>을 알아보는 마지막 차시예요.</p>',
      features: ['body'],
      setup() { setScene('body', { force: true }); },
      recap: '운동이 세질수록 심장 박동, 호흡, 체온이 올라가요. 근육 세포가 에너지를 더 많이 쓰기 때문이에요.',
      summary: '<ul><li>운동 강도가 높아지면 <b>심장 박동수</b>와 <b>호흡수</b>가 늘고 <b>체온</b>이 올라가요.</li>' +
        '<li>근육 세포가 <b>에너지를 더 많이</b> 쓰기 때문이에요.</li><li>에너지를 만들려면 <b>산소와 영양소</b>가 더 많이 필요해요.</li></ul>',
      missions: [
        {
          title: '운동 강도를 바꿔 보기',
          goal: '강도를 쉬기, 걷기, 달리기로 바꾸며 각각 2초 넘게 지켜봐요.',
          hint: '오른쪽 슬라이더를 왼쪽 끝(쉬기), 가운데(걷기), 오른쪽 끝(달리기)으로 옮겨 보세요.',
          hold: 0.5,
          setup() { S.rest = 0; S.walk = 0; S.run = 0; },
          status: () => mark(S.rest >= 2) + ' 쉬기 · ' + mark(S.walk >= 2) + ' 걷기 · ' + mark(S.run >= 2) + ' 달리기',
          check: () => S.rest >= 2 && S.walk >= 2 && S.run >= 2,
          explain: '쉴 때는 심장이 1분에 약 66번, 호흡은 약 14번이에요. 달리면 심장은 훨씬 빨리 뛰고 호흡도 늘며 체온이 올라가요. 이 변화는 모두 <b>근육 세포가 쓰는 에너지</b>가 늘어났기 때문에 생겨요.',
        },
        {
          title: '퀴즈: 숨이 차고 심장이 빨리 뛰는 까닭',
          goal: '운동할 때 호흡과 심장 박동이 빨라지는 까닭으로 가장 알맞은 것은?',
          choices: ['폐와 심장이 갑자기 커지기 때문에', '근육 세포가 에너지를 더 많이 만들어서 산소와 영양소가 더 필요하기 때문에', '체온을 낮추려고 소화가 더 활발해지기 때문에', '노폐물이 사라져서 몸이 가벼워지기 때문에'],
          answer: 1,
          feedback: ['폐와 심장의 크기가 갑자기 커지지는 않아요. 일하는 속도가 빨라질 뿐이에요.', null, '소화가 활발해지는 것이 아니라, 에너지를 만드는 근육이 더 많은 재료를 필요로 해요.', '운동하면 오히려 이산화 탄소 같은 노폐물이 더 많이 생겨요.'],
          explain: '운동하면 근육 세포가 <b>에너지를 더 많이</b> 만들어야 해요. 에너지를 만드는 데 필요한 <b>산소와 영양소</b>를 더 빨리 보내고 <b>이산화 탄소</b>를 더 빨리 내보내려고 호흡과 심장 박동이 빨라져요.',
        },
      ],
    },
    /* ---------------- STEP 2 ---------------- */
    {
      title: '세포에서 에너지를 얻는 세포호흡', short: '세포호흡', icon: '⚡', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 운동이 세질수록 근육 세포가 에너지를 더 많이 쓰고, 호흡과 심장 박동이 빨라지는 것을 봤어요.</div>' +
        '<p>세포 안에서는 무슨 일이 일어날까요? 근육 세포를 확대해 <b>미토콘드리아</b>에서 에너지가 만들어지는 과정을 살펴봐요.</p>',
      features: ['cell'],
      setup() { setScene('cell', { reset: true, force: true }); S.react = 0; S.used = [0, 0, 0]; S.nextUse = 0; },
      recap: '세포호흡: 포도당 + 산소 → 이산화 탄소 + 물 + 에너지. 세포의 미토콘드리아에서 일어나요.',
      summary: '<ul><li><b>세포호흡</b>: 포도당(영양소)을 산소로 분해해 <b>에너지</b>를 얻는 과정이에요.</li>' +
        '<li>포도당 + 산소 → <b>이산화 탄소 + 물 + 에너지</b></li><li>세포 속 <b>미토콘드리아</b>에서 일어나요.</li>' +
        '<li>에너지는 <b>근육 운동, 체온 유지, 생장</b> 등에 쓰여요.</li><li><b>호흡 운동</b>(숨 쉬기)과 달리, 세포호흡은 세포 안에서 일어나는 화학 반응이에요.</li></ul>',
      missions: [
        {
          title: '재료를 넣어 에너지 만들기',
          goal: '포도당과 산소를 끌어서 미토콘드리아에 넣어 에너지를 3번 만들어요.',
          hint: '왼쪽 혈관의 포도당과 산소를 하나씩 끌어 미토콘드리아에 놓아요. 둘이 모이면 반응이 시작돼요!',
          hold: 0.6,
          setup() { resetCell(); S.react = 0; },
          status: () => '⚡ 에너지 만든 횟수 <b>' + Math.min(S.react, 3) + ' / 3</b>',
          check: () => S.react >= 3,
          explain: '미토콘드리아에서 <b>포도당과 산소</b>가 반응해 <b>이산화 탄소와 물</b>이 생기고 <b>에너지</b>가 나와요. 이 과정이 <b>세포호흡</b>이에요. 에너지는 근육 운동, 체온 유지, 생장 등에 쓰여요.',
        },
        {
          title: '재료가 하나만 있으면?',
          goal: '포도당만 넣고 잠시 기다리고, 산소만 넣고도 기다려 보세요.',
          hint: '한 가지 재료만 넣고 1.5초 넘게 기다려요. 두 번째 재료를 넣으면 반응이 시작되니, 기다린 뒤에 넣어요.',
          hold: 0.5,
          setup() { resetCell(); S.alone = { gluc: 0, o2: 0 }; },
          status: () => mark(S.alone.gluc >= 1.5) + ' 포도당만 있을 때 · ' + mark(S.alone.o2 >= 1.5) + ' 산소만 있을 때',
          check: () => S.alone.gluc >= 1.5 && S.alone.o2 >= 1.5,
          explain: '세포호흡에는 <b>포도당(영양소)과 산소가 둘 다</b> 있어야 해요. 하나라도 부족하면 에너지를 만들 수 없어요. 그래서 <b>소화계(영양소)와 호흡계(산소)</b>가 꼭 필요해요.',
        },
        {
          title: '퀴즈: 세포호흡과 호흡 운동',
          goal: '세포호흡과 호흡 운동(들숨·날숨)의 차이를 옳게 설명한 것은?',
          choices: ['둘 다 폐에서 일어나는 같은 현상이에요.', '호흡 운동은 폐로 공기를 드나들게 하는 움직임이고, 세포호흡은 세포에서 양분으로 에너지를 얻는 과정이에요.', '호흡 운동은 에너지를 만들고, 세포호흡은 공기를 들이마시는 일이에요.', '세포호흡은 산소 없이 이산화 탄소만으로 일어나요.'],
          answer: 1,
          feedback: ['호흡 운동은 폐로 공기를 드나들게 하는 일이고, 세포호흡은 세포 속 미토콘드리아에서 일어나요.', null, '반대로 말했어요. 에너지를 만드는 것은 세포호흡이에요.', '세포호흡에는 산소가 필요하고, 이산화 탄소는 그 결과로 생겨요.'],
          explain: '<b>호흡 운동</b>은 갈비뼈와 가로막으로 공기를 들이마시고 내보내는 움직임(호흡계)이에요. <b>세포호흡</b>은 세포의 미토콘드리아에서 영양소를 분해해 에너지를 얻는 반응이에요. 호흡 운동으로 얻은 산소가 세포호흡에 쓰여요.',
        },
      ],
    },
    /* ---------------- STEP 3 ---------------- */
    {
      title: '기관계가 함께 일하는 통합 지도', short: '통합 지도', icon: '🗺️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포는 포도당과 산소로 에너지를 만들고, 이산화 탄소와 물이 생긴다는 것을 알았어요.</div>' +
        '<p>그런데 포도당과 산소는 어디에서 올까요? 노폐물은 어디로 갈까요? 몸 지도에서 <b>소화·순환·호흡·배설계</b>를 선으로 이어 보세요.</p>' +
        '<p>출발 기관계를 끌어서 도착 기관계 위에 놓으면 돼요.</p>',
      features: ['map'],
      setup() { setLinks(false); setScene('map', { force: true }); S.fault = 'none'; },
      recap: '소화계(영양소)와 호흡계(산소)가 순환계에 실려 세포로 가고, 세포의 이산화 탄소와 노폐물은 순환계를 거쳐 호흡계와 배설계로 나가요.',
      summary: '<ul><li><b>소화계</b>: 영양소(포도당)를 흡수해요.  <b>호흡계</b>: 산소를 얻고 이산화 탄소를 내보내요.</li>' +
        '<li><b>순환계</b>: 영양소와 산소를 세포로 운반하고, 이산화 탄소와 노폐물을 나르는 <b>운반 담당</b>이에요.</li>' +
        '<li><b>세포</b>: 세포호흡으로 에너지를 만들어요.</li><li><b>배설계</b>: 요소와 물 같은 노폐물을 오줌으로 내보내요.</li>' +
        '<li>네 기관계가 <b>함께</b> 일해서 세포가 에너지를 얻어요.</li></ul>',
      missions: [
        {
          title: '영양소와 산소가 세포로 가는 길',
          goal: '소화계 → 순환계, 호흡계 → 순환계, 순환계 → 세포 선을 이어요.',
          hint: '소화계를 끌어서 순환계(심장) 위에 놓아요. 산소를 얻는 호흡계도 순환계로 이어요. 마지막으로 순환계에서 세포까지 이어요.',
          hold: 0.8,
          status: () => mark(LINK['dig-circ'].done) + ' 소화계→순환계 · ' + mark(LINK['resp-circ'].done) + ' 호흡계→순환계 · ' + mark(LINK['circ-cell'].done) + ' 순환계→세포',
          check: () => linksDone(['dig-circ', 'resp-circ', 'circ-cell']),
          explain: '소화계가 흡수한 <b>영양소</b>와 호흡계가 얻은 <b>산소</b>는 <b>순환계(혈액)</b>에 실려 온몸의 세포로 운반돼요. 소화계나 호흡계가 세포로 직접 보내 주는 것이 아니에요.',
        },
        {
          title: '이산화 탄소와 노폐물이 나가는 길',
          goal: '세포 → 순환계, 순환계 → 호흡계, 순환계 → 배설계 선을 이어요.',
          hint: '세포에서 나온 물질도 먼저 순환계로 가요. 이산화 탄소는 호흡계로, 요소와 물은 배설계로 이어요.',
          hold: 0.8,
          status: () => mark(LINK['cell-circ'].done) + ' 세포→순환계 · ' + mark(LINK['circ-resp'].done) + ' 순환계→호흡계 · ' + mark(LINK['circ-exc'].done) + ' 순환계→배설계',
          check: () => linksDone(['cell-circ', 'circ-resp', 'circ-exc']),
          explain: '세포호흡으로 생긴 <b>이산화 탄소</b>는 혈액을 따라 폐로 가서 <b>날숨</b>으로, <b>물과 요소</b> 같은 노폐물은 콩팥으로 가서 <b>오줌</b>으로 나가요. 이때도 운반은 <b>순환계</b>가 맡아요.',
        },
        {
          title: '퀴즈: 세포까지 운반하는 기관계',
          goal: '영양소와 산소를 온몸의 세포까지 운반하는 기관계는 무엇일까요?',
          choices: ['소화계', '호흡계', '순환계', '배설계'],
          answer: 2,
          feedback: ['소화계는 영양소를 소화하고 흡수하는 곳이에요. 세포까지 나르지는 않아요.', '호흡계는 산소를 얻고 이산화 탄소를 내보내는 곳이에요.', null, '배설계는 노폐물을 몸 밖으로 내보내는 곳이에요.'],
          explain: '<b>순환계</b>가 혈액으로 영양소와 산소를 세포에 운반하고, 세포에서 나온 이산화 탄소와 노폐물을 호흡계·배설계로 운반해요.',
        },
      ],
    },
    /* ---------------- STEP 4 ---------------- */
    {
      title: '한 기관계에 문제가 생기면?', short: '적용', icon: '🩺', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소화·순환·호흡·배설계가 이어져 세포호흡을 돕는 것을 지도로 완성했어요.</div>' +
        '<p>이 중 한 기관계에 문제가 생기면 어떻게 될까요? 기관계를 하나씩 고장 내 보고, 세포의 <b>에너지 생산</b>과 <b>노폐물</b>이 어떻게 변하는지 살펴봐요.</p>',
      features: ['fault'],
      setup() { setLinks(true); setScene('map', { force: true }); S.fault = 'none'; faultBtns.forEach((b) => b.classList.toggle('on', b.dataset.fault === 'none')); },
      recap: '한 기관계에 문제가 생기면 세포가 재료를 못 얻거나 노폐물이 쌓여서, 에너지를 얻는 일에 문제가 생겨요.',
      summary: '<ul><li><b>소화계 문제</b> → 영양소 부족 → 에너지 재료 부족</li><li><b>호흡계 문제</b> → 산소 부족 · 이산화 탄소 배출 어려움 → 에너지 감소</li>' +
        '<li><b>순환계 문제</b> → 재료 운반과 노폐물 운반이 모두 막힘</li><li><b>배설계 문제</b> → 요소 같은 노폐물이 몸에 쌓임</li>' +
        '<li>예) <b>빈혈</b>: 산소를 나르는 적혈구가 부족 → 세포호흡이 줄어 쉽게 피곤해요.</li></ul>',
      missions: [
        {
          title: '기관계를 하나씩 멈춰 보기',
          goal: '소화·호흡·순환·배설계를 하나씩 고르고 에너지와 노폐물이 어떻게 변하는지 1.5초씩 지켜봐요.',
          hint: '오른쪽의 기관계 버튼을 하나씩 눌러 보세요. 빨간 느낌표가 생긴 기관계가 문제가 생긴 곳이에요.',
          hold: 0.5,
          setup() { S.faultT = { dig: 0, resp: 0, circ: 0, exc: 0 }; },
          status: () => FAULT_ORDER.map((k) => mark(S.faultT[k] >= 1.5) + ' ' + FAULT_NAME[k]).join(' · '),
          check: () => FAULT_ORDER.every((k) => S.faultT[k] >= 1.5),
          explain: '<b>소화계·호흡계·순환계</b>에 문제가 생기면 세포가 재료를 얻지 못해 <b>에너지 생산이 줄어요</b>. <b>배설계</b>에 문제가 생기면 에너지는 한동안 만들 수 있지만 <b>노폐물이 몸에 쌓여요</b>.',
        },
        {
          title: '퀴즈: 빈혈이면 쉽게 피곤한 까닭',
          goal: '빈혈은 산소를 나르는 적혈구가 부족한 상태예요. 빈혈이 있으면 쉽게 피곤해지는 까닭은?',
          choices: ['소화계가 영양소를 흡수하지 못해서', '산소가 세포에 충분히 운반되지 못해 세포호흡으로 얻는 에너지가 줄어서', '배설계가 노폐물을 너무 많이 내보내서', '세포가 산소 없이 이산화 탄소로 에너지를 만들어서'],
          answer: 1,
          feedback: ['빈혈은 영양소 흡수가 아니라 산소 운반과 관련이 있어요.', null, '노폐물 배출이 너무 많아서 피곤한 것이 아니에요.', '세포호흡에는 산소가 필요해요. 이산화 탄소는 결과로 생겨요.'],
          explain: '적혈구가 부족하면 <b>순환계</b>가 산소를 충분히 운반하지 못해요. 산소가 부족하면 <b>세포호흡</b>으로 얻는 에너지가 줄어 쉽게 피곤해져요.',
        },
        {
          title: '퀴즈: 통합해서 설명하기',
          goal: '달리기를 하면 숨이 차고 심장이 빨리 뛰는 까닭을 가장 알맞게 설명한 것은?',
          choices: ['폐가 이산화 탄소를 직접 만들어 내기 때문이에요.', '소화계만 빨리 일해서 포도당을 만들기 때문이에요.', '근육 세포가 에너지를 더 많이 만들어야 해서, 호흡계는 산소를 더 얻고 순환계는 재료와 노폐물을 더 빨리 나르기 때문이에요.', '배설계가 일을 멈추고 심장이 대신 일하기 때문이에요.'],
          answer: 2,
          feedback: ['이산화 탄소는 폐가 아니라 세포호흡의 결과로 세포에서 생겨요.', '소화계만이 아니라 호흡계와 순환계도 함께 빨라져요.', null, '배설계는 일을 멈추지 않아요. 네 기관계가 함께 일해요.'],
          explain: '운동하면 근육 세포가 <b>세포호흡</b>으로 에너지를 더 많이 만들어요. 그래서 <b>호흡계</b>는 산소를 더 많이 얻고, <b>순환계</b>는 영양소·산소를 더 빨리 보내고 이산화 탄소·노폐물을 더 빨리 나르며, <b>배설계</b>는 노폐물을 내보내요. 네 기관계가 에너지를 얻기 위해 함께 일해요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작
     ========================================================= */
  sceneBtns = $$('#sceneSeg button');
  faultBtns = $$('#faultSeg button');
  sceneBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, b.dataset.scene === 'cell' ? { reset: false } : {}); }));
  faultBtns.forEach((b) => b.addEventListener('click', () => setFault(b.dataset.fault)));
  $('#resetLinks').addEventListener('click', () => { setLinks(false); Sound.click(); say('연결선을 모두 지웠어요. 다시 이어 보세요!', 'info'); });
  const cv = $('#cv');
  view = SciSim.stage(cv, { width: W, height: H, background: BG });
  ctx = view.ctx;
  D = SciSim.draw(ctx);
  SciSim.pointer(view, handlers);

  game = SciSim.game({
    simId: 'm2-cell-respiration',
    mount: '#game',
    badge: '에너지 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      body: '🏃 운동 강도 슬라이더 · 심박수 · 호흡수 · 체온',
      cell: '⚡ 근육 세포 확대 · 미토콘드리아',
      map: '🗺️ 몸 지도 · 연결선 긋기',
      fault: '🩺 기관계 고장 실험',
    },
    onFeatures(set) { F = new Set(set); updateUI(); },
    onMissionStart() { S.msgT = 0; updateUI(); },
    onComplete() { updateUI(); },
    levels,
  });
  updateUI();

  window.__sim = {
    S, C, MAP, NODES, LINKS, LINK, SLOT, MITO, DISP, game, setScene, setFault, connect, setLinks, update, resetCell, syncSlider,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + (y / H) * r.height }; },
    dispPoint(k) { return this.toClient(DISP[k].x, DISP[k].y); },
    mitoPoint() { return this.toClient(MITO.x, MITO.y); },
    nodePoint(k) { return this.toClient(NODES[k].x, NODES[k].y); },
  };

  SciSim.loop((dt, t) => {
    update(dt);
    draw(t, dt);
  });
})();
