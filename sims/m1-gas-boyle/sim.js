/* =========================================================
   중1 Ⅵ. 기체의 성질 — 압력과 부피 [9과06-02]
   ① [관찰] 끝을 막은 주사기의 피스톤 누르기
   ② [실험] 부피·압력 측정 → 표와 그래프 → 관계 찾기
   ③ [설명] 입자 모형으로 해석 (온도 일정: 입자 수·크기·빠르기 그대로, 충돌 횟수 증가)
   ④ [적용] 생활 속 예
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
  const V0 = 40, VMIN = 10, VMAX = 50;      // 처음 부피 40 mL에서 1기압
  const S = {
    V: V0, Vs: V0, needle: 1,
    data: [], fresh: -1,
    target: null, stage1: 0,
    dragging: false, dragOff: 0,
    showParticles: true, showHits: true,
    hits: [], flashes: [],
    big: { t: 0, done: false, rate: 0 }, small: { t: 0, done: false, rate: 0 },
  };
  const P = () => V0 / S.Vs;               // 온도가 일정할 때 기체의 압력 (측정값)

  /* ---------- 주사기 ---------- */
  const SYR = { x: 96, w: 180, bottom: 440, top: 112 };
  const PX = 6;                             // 1 mL당 픽셀
  const pistonY = (V) => SYR.bottom - V * PX;
  const TIP = { x: SYR.x + SYR.w / 2 };

  /* ---------- 입자 ---------- */
  const NP = 30, R = 6, SPEED = 210;
  const parts = [];
  for (let i = 0; i < NP; i++) {
    const a = Math.random() * Math.PI * 2, sp = SPEED * (0.65 + Math.random() * 0.7);
    parts.push({ x: SYR.x + R + Math.random() * (SYR.w - 2 * R), y: pistonY(V0) + R + Math.random() * (V0 * PX - 2 * R), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }
  function stepParticles(dt) {
    const top = pistonY(S.Vs);
    const L = SYR.x + R, Rr = SYR.x + SYR.w - R, B = SYR.bottom - R, T = top + R;
    const now = performance.now();
    parts.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < L) { p.x = L + (L - p.x); p.vx = Math.abs(p.vx); }
      if (p.x > Rr) { p.x = Rr - (p.x - Rr); p.vx = -Math.abs(p.vx); }
      if (p.y > B) { p.y = B - (p.y - B); p.vy = -Math.abs(p.vy); }
      if (p.y < T) {
        p.y = Math.min(B, T + (T - p.y));
        if (p.vy < 0) {
          p.vy = Math.abs(p.vy);
          S.hits.push(now);
          if (S.showHits && on('hits')) S.flashes.push({ x: p.x, y: top, t: now });
        }
      }
    });
    while (S.hits.length && now - S.hits[0] > 2000) S.hits.shift();
    S.flashes = S.flashes.filter((f) => now - f.t < 350);
  }
  const hitRate = () => S.hits.length / 2;

  function step(dt) {
    S.Vs += (S.V - S.Vs) * Math.min(1, dt * 12);
    if (Math.abs(S.V - S.Vs) < 0.02) S.Vs = S.V;
    S.needle += (P() - S.needle) * Math.min(1, dt * 8);
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
    const x0 = align === 'left' ? x : x - w / 2;
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

  // 그래프가 열리면 압력계를 위로 옮겨 자리를 나눔
  function layout() {
    return on('record')
      ? { gauge: { cx: 566, cy: 126, r: 84 }, graph: { x: 352, y: 246, w: 436, h: 262 } }
      : { gauge: { cx: 570, cy: 250, r: 124 }, graph: null };
  }

  function draw() {
    view.clear('#ffffff');
    const L = layout();
    ctx.fillStyle = '#5d6879'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('🌡 온도 일정', 300, 28);
    if (on('gauge')) drawTube(L.gauge);
    drawSyringe();
    if (on('gauge')) {
      drawGauge(L.gauge.cx, L.gauge.cy, L.gauge.r);
      if (isNew('gauge')) newRing(L.gauge.cx - L.gauge.r, L.gauge.cy - L.gauge.r, L.gauge.r * 2, L.gauge.r * 2 + 24);
    }
    if (L.graph) {
      drawGraph(L.graph);
      if (isNew('record')) newRing(L.graph.x, L.graph.y, L.graph.w, L.graph.h);
    }
  }

  function drawTube(g) {
    ctx.strokeStyle = '#a7b2c3'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(TIP.x, SYR.bottom + 30);
    ctx.lineTo(TIP.x, 500); ctx.lineTo(326, 500); ctx.lineTo(326, g.cy); ctx.lineTo(g.cx - g.r + 4, g.cy);
    ctx.stroke();
    ctx.lineJoin = 'miter';
  }

  function drawSyringe() {
    const top = pistonY(S.Vs);
    const x0 = SYR.x, x1 = SYR.x + SYR.w;
    // 기체 (입자 모형이 꺼져 있을 때는 색으로)
    const showP = on('particles') && S.showParticles;
    const dens = clamp((V0 / S.Vs) / 4, 0, 1);
    ctx.fillStyle = showP ? '#f3f7ff' : `rgba(96,140,240,${0.12 + dens * 0.33})`;
    ctx.fillRect(x0, top, SYR.w, SYR.bottom - top);
    if (!showP) {
      ctx.fillStyle = '#2f4ea8'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('공기', x0 + SYR.w / 2, top + (SYR.bottom - top) / 2 + 5);
    }

    // 목표선
    if (S.target) {
      const ty = pistonY(S.target.V);
      ctx.save();
      ctx.setLineDash([8, 6]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x0 - 26, ty); ctx.lineTo(x1 + 18, ty); ctx.stroke();
      ctx.restore();
      pill(S.target.label, x1 + 8, ty, '#14a058', '#fff', 'left');
    }

    if (showP) {
      parts.forEach((p) => {
        ctx.strokeStyle = 'rgba(56,103,244,.2)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
      });
      parts.forEach((p) => {
        const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 0.5, p.x, p.y, R);
        g.addColorStop(0, '#9fb8ff'); g.addColorStop(1, '#2f5be3');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      });
      const now = performance.now();
      S.flashes.forEach((f) => {
        const a = 1 - (now - f.t) / 350;
        ctx.strokeStyle = `rgba(242,107,58,${a})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - a) * 11, 0, Math.PI * 2); ctx.stroke();
      });
    }

    // 주사기 몸통
    ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, SYR.top); ctx.lineTo(x0, SYR.bottom); ctx.lineTo(x1, SYR.bottom); ctx.lineTo(x1, SYR.top); ctx.stroke();
    ctx.fillStyle = '#8a97ab';
    roundRect(x0 - 22, SYR.top - 6, SYR.w + 44, 10, 4); ctx.fill();         // 손가락 걸이
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + 8, SYR.top + 12); ctx.lineTo(x0 + 8, SYR.bottom - 10); ctx.stroke();
    // 끝 (막힘 → 압력계 연결)
    ctx.fillStyle = '#8a97ab';
    ctx.beginPath(); ctx.moveTo(TIP.x - 26, SYR.bottom); ctx.lineTo(TIP.x + 26, SYR.bottom); ctx.lineTo(TIP.x + 8, SYR.bottom + 18); ctx.lineTo(TIP.x - 8, SYR.bottom + 18); ctx.closePath(); ctx.fill();
    ctx.fillRect(TIP.x - 6, SYR.bottom + 16, 12, 16);
    if (!on('gauge')) {
      ctx.fillStyle = '#3a4456'; roundRect(TIP.x - 11, SYR.bottom + 28, 22, 14, 4); ctx.fill();
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#3a4456';
      ctx.fillText('← 끝을 막음', TIP.x + 18, SYR.bottom + 40);
    }

    // 눈금
    ctx.fillStyle = '#5d6879'; ctx.font = '13px sans-serif'; ctx.textAlign = 'right';
    for (let v = 0; v <= 52; v += 5) {
      const y = pistonY(v);
      if (y < SYR.top + 4) break;
      ctx.strokeStyle = '#8a97ab'; ctx.lineWidth = v % 10 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0 - (v % 10 === 0 ? 12 : 7), y); ctx.lineTo(x0, y); ctx.stroke();
      if (v % 10 === 0) ctx.fillText(v + '', x0 - 15, y + 4);
    }
    ctx.save(); ctx.translate(26, 300); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('부피 (mL)', 0, 0); ctx.restore();

    // 피스톤 + 손잡이
    const ph = 16;
    const pg = ctx.createLinearGradient(0, top - ph, 0, top);
    pg.addColorStop(0, '#c9d1dd'); pg.addColorStop(1, '#8792a5');
    ctx.fillStyle = pg; roundRect(x0 + 2, top - ph, SYR.w - 4, ph, 4); ctx.fill();
    ctx.strokeStyle = '#6b768a'; ctx.lineWidth = 1.5; ctx.stroke();
    const cx = x0 + SYR.w / 2;
    const hy = handleY();
    ctx.fillStyle = '#9aa5b6'; ctx.fillRect(cx - 7, hy, 14, top - ph - hy);
    if (on('piston')) {
      const hg = ctx.createLinearGradient(0, hy - 28, 0, hy);
      hg.addColorStop(0, S.dragging ? '#ff9b6b' : '#ffb48f'); hg.addColorStop(1, S.dragging ? '#e0552a' : '#f26b3a');
      ctx.fillStyle = hg; roundRect(cx - 62, hy - 28, 124, 32, 16); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('↕ 끌기', cx, hy - 7);
      if (isNew('piston')) {
        const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
        ctx.strokeStyle = `rgba(242,107,58,${0.3 + a * 0.6})`; ctx.lineWidth = 4;
        roundRect(cx - 70, hy - 36, 140, 48, 24); ctx.stroke();
      }
    }
  }
  const handleY = () => Math.max(34, pistonY(S.Vs) - 96);

  function drawGauge(cx, cy, r) {
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, maxP = 4;
    const ang = (p) => a0 + (a1 - a0) * clamp(p / maxP, 0, 1);
    ctx.strokeStyle = '#e8edf4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, a0, a1); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold ' + (r > 100 ? 16 : 13) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= maxP + 1e-9; p += 0.5) {
      const a = ang(p), major = Math.abs(p % 1) < 1e-9;
      ctx.strokeStyle = '#3a4456'; ctx.lineWidth = major ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - (major ? 20 : 15)), cy + Math.sin(a) * (r - (major ? 20 : 15)));
      ctx.stroke();
      if (major) ctx.fillText(p, cx + Math.cos(a) * (r - 34), cy + Math.sin(a) * (r - 34));
    }
    const a = ang(S.needle);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = r > 100 ? 5 : 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); ctx.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18)); ctx.stroke();
    ctx.fillStyle = '#3a4456'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#5d6879';
    ctx.fillText('기압', cx, cy + r * 0.42);
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#3a4456';
    ctx.fillText('🧭 압력계  ' + fmt(S.needle, 2) + ' 기압', cx, cy + r + 22);
    ctx.restore();
  }

  function drawGraph(G) {
    const { x: gx, y: gy, w: gw, h: gh } = G;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5;
    roundRect(gx, gy, gw, gh, 12); ctx.fill(); ctx.stroke();
    const pad = { l: 50, r: 16, t: 38, b: 40 };
    const x0 = gx + pad.l, x1 = gx + gw - pad.r, y0 = gy + gh - pad.b, y1 = gy + pad.t;
    const X = { min: 0, max: 50, step: 10 }, Y = { min: 0, max: 4, step: 1 };
    const px = (v) => x0 + (v - X.min) / (X.max - X.min) * (x1 - x0);
    const py = (v) => y0 - (v - Y.min) / (Y.max - Y.min) * (y0 - y1);
    ctx.fillStyle = '#3a4456'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('📈 부피–압력 그래프', gx + 12, gy + 19);
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
    ctx.fillText('부피 (mL)', (x0 + x1) / 2, y0 + 34);
    ctx.save(); ctx.translate(gx + 15, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('압력 (기압)', 0, 0); ctx.restore();

    const pts = S.data.map((d) => [d.V, d.P]).sort((a, b) => a[0] - b[0]);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1])))); ctx.stroke();
    }
    pts.forEach((p) => {
      ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    const cx = px(clamp(S.Vs, X.min, X.max)), cy = py(clamp(S.needle, Y.min, Y.max));
    const pulse = 7 + Math.sin(performance.now() / 200) * 2;
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    if (!S.data.length) {
      ctx.fillStyle = '#8a95a6'; ctx.font = '13px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('📍 기록하기를 누르면 점이 찍혀요', x1 - 4, y1 + 14);
    }
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
    const d = { V, P: +(V0 / V).toFixed(2) };
    const i = S.data.findIndex((x) => Math.abs(x.V - V) < 2);
    if (i >= 0) { S.data[i] = d; S.fresh = i; } else { if (S.data.length >= 9) S.data.shift(); S.data.push(d); S.fresh = S.data.length - 1; }
    renderTable();
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
      if (o.t >= 2) { o.done = true; o.rate = hitRate(); Sound.tick(); }
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

  /* ---------- 시작 ---------- */
  SciSim.loop((dt, t) => {
    step(dt);
    watchCompare(dt);
    draw();
    updateReadouts(t);
  });
})();
