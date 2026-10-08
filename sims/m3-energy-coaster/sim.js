/* =========================================================
   중3 Ⅳ. 운동과 에너지 - 에너지 롤러코스터
   위치 에너지(9.8mh), 운동 에너지(½mv²),
   역학적 에너지 전환과 보존, 마찰에 의한 역학적 에너지 감소(열에너지로 전환)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const G = 9.8;                  // 중력 가속도 (m/s²)
  const MU = 0.2;                 // 마찰 있음: 손실 에너지 = μ·m·g·cosθ·ds = μ·m·g·|dx|
  const N = 6;                    // 레일 조절점 수
  const DX = 2.2;                 // 조절점 사이 가로 간격 (m)
  const PPM = 40;                 // 1 m = 40 px (가로·세로 같은 축척)
  const X0 = 100;                 // 출발점(첫 조절점)의 x 좌표 (px)
  const GY = 460;                 // 지면(높이 0 m)의 y 좌표 (px)
  const XLAST = (N - 1) * DX;     // 마지막 조절점 위치 (m)
  const XEND = XLAST + 0.45;      // 도착 게이트 (m) - 마지막 조절점 뒤는 평평한 승강장
  const KNOB_X = 64;              // 출발 높이 손잡이 x 좌표 (px)
  const H_TOP = 10;               // 최고 높이 (m)
  const E_MAX = 500;              // 에너지 막대 최대 (J)
  const V_MAX = 15;               // 속력계 최대 (m/s)
  // 좁은 화면(휴대폰 세로)에서는 에너지 막대를 레일 아래에 가로로 배치하고 글자를 키운다
  const PORTRAIT = Math.min(window.innerWidth || 1024, (document.documentElement && document.documentElement.clientWidth) || 9999) < 640;
  const VW = PORTRAIT ? 600 : 800, VH = PORTRAIT ? 800 : 520;
  const FS = PORTRAIT ? 1.22 : 1;
  const F = (n, bold) => (bold ? 'bold ' : '') + Math.round(n * FS * 2) / 2 + 'px sans-serif';
  const C = { ep: '#3b82f6', ek: '#f97316', heat: '#e11d48', mech: '#8b5cf6', cart: '#f26b3a', good: '#16a34a' };
  const PANEL = PORTRAIT ? { x: 10, y: 528, w: 580, h: 262 } : { x: 580, y: 12, w: 210, h: 496 };
  const px = (x) => X0 + x * PPM;
  const py = (h) => GY - h * PPM;

  const PRESETS = {
    valley: { name: 'U자 계곡', h: [8, 2, 0, 0, 2, 10] },
    hill: { name: '언덕 넘기', h: [5, 0.5, 2.5, 6, 1, 1] },
    twin: { name: '두 개의 언덕', h: [9, 1, 7, 2, 5, 2] },
  };
  const HILL_IDX = 3;             // '언덕 넘기'의 6 m 언덕
  const HILL_X = HILL_IDX * DX;

  /* ---------- 상태 ---------- */
  const S = {
    preset: 'valley',
    H: PRESETS.valley.h.slice(),
    d: new Array(N).fill(0),
    hMin: 0,
    m: 2,
    friction: false,
    rate: 1,
    state: 'ready',               // ready | running | paused | settled | finished
    x: 0, v: 0,                   // 출발점에서의 가로 위치(m), 레일 방향 속도(m/s, 오른쪽 +)
    Emech: 0, heat: 0, E0: 0,     // 역학적 에너지, 열에너지, 처음 에너지 (J)
    run: null,                    // 이번 주행 기록
    turns: [],                    // 되돌아온 지점(최고 높이)
    bottomLog: [],                // 가장 낮은 곳 통과 기록
    inLow: false, lowEntry: null,
    sparks: [], fx: [],
    locks: null,                  // { preset, idx: [] } 고정된 손잡이
    flag: null,                   // { preset, idx } 목표 깃발
    lowMark: false,               // '가장 낮은 곳' 표시
    speedTarget: null,            // { v, tol } 속력계 목표 구간
    drag: -1, dragOff: 0, hover: -1,
    hinted: false,
  };

  /* ---------- 레일 (단조 3차 스플라인: 조절점 사이에서 넘치지 않음) ---------- */
  function rebuild() {
    const H = S.H, del = [];
    for (let i = 0; i < N - 1; i++) del.push((H[i + 1] - H[i]) / DX);
    const d = S.d;
    d[0] = 0.3 * del[0];          // 출발점은 바로 옆 점을 향해 살짝 기울어짐 → 정지 상태에서 굴러 내려감
    d[N - 1] = 0;                 // 도착점은 평평한 승강장으로 이어짐
    for (let i = 1; i < N - 1; i++) {
      const a = del[i - 1], b = del[i];
      d[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    }
    S.hMin = Math.min.apply(null, H);
  }
  function segOf(x) { return clamp(Math.floor(x / DX), 0, N - 2); }
  function heightAt(x) {
    if (x >= XLAST) return S.H[N - 1];
    if (x <= 0) return S.H[0];
    const i = segOf(x), t = (x - i * DX) / DX, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * S.H[i] + (t3 - 2 * t2 + t) * DX * S.d[i]
      + (-2 * t3 + 3 * t2) * S.H[i + 1] + (t3 - t2) * DX * S.d[i + 1];
  }
  function slopeAt(x) {
    if (x >= XLAST) return 0;
    if (x < 0) x = 0;
    const i = segOf(x), t = (x - i * DX) / DX, t2 = t * t;
    return ((6 * t2 - 6 * t) * S.H[i] + (3 * t2 - 4 * t + 1) * DX * S.d[i]
      + (-6 * t2 + 6 * t) * S.H[i + 1] + (3 * t2 - 2 * t) * DX * S.d[i + 1]) / DX;
  }

  /* ---------- 주행 제어 ---------- */
  function resetRun() {
    S.state = 'ready';
    S.x = 0; S.v = 0;
    S.heat = 0;
    S.Emech = S.m * G * S.H[0];
    S.E0 = S.Emech;
    S.run = null; S.turns = []; S.sparks = [];
    S.inLow = false; S.lowEntry = null;
    updateRunBtn();
  }
  function startRun() {
    if (S.state === 'running') { S.state = 'paused'; updateRunBtn(); return; }
    if (S.state === 'paused') { S.state = 'running'; updateRunBtn(); return; }
    if (S.state === 'settled' || S.state === 'finished') resetRun();
    const s0 = slopeAt(0);
    if (s0 >= -1e-9) {
      Sound.fail();
      toast('출발점이 바로 오른쪽 레일보다 높아야 수레가 굴러가요! ↕', 'bad', 2600);
      return;
    }
    if (S.friction && -s0 <= MU) {
      Sound.fail();
      toast('경사가 너무 완만해서 마찰 때문에 출발하지 못해요.', 'bad', 2600);
      return;
    }
    S.state = 'running';
    S.run = { h0: S.H[0], t: 0, passedLow: false, lowV: null, maxX: 0, vmax: 0, fricAll: S.friction, anyFric: S.friction, turned: false };
    S.inLow = false; S.lowEntry = null;
    hideHint();
    updateRunBtn();
  }
  function updateRunBtn() {
    const b = $('#runBtn');
    if (!b) return;
    b.innerHTML = S.state === 'running' ? '⏸ 일시정지' : S.state === 'paused' ? '▶ 계속' : (S.state === 'ready' ? '▶ 출발' : '▶ 다시 출발');
  }

  /* ---------- 물리 ----------
     레일 위 수레(크기 무시, 레일에 고정)를 가로 위치 x로 추적한다.
     매 단계 가속도로 방향과 이동량을 구한 뒤, 속력은 에너지로부터 다시 계산한다.
     (마찰 없음: ½mv² = 역학적 에너지 − 9.8mh → 출발 높이보다 높이 올라갈 수 없다) */
  function physics(dt) {
    if (S.state !== 'running') return;
    const T = dt * S.rate;
    const n = Math.max(1, Math.ceil(T / 0.001));
    const h = T / n;
    for (let k = 0; k < n && S.state === 'running'; k++) substep(h);
    if (S.run) S.run.t += T;
  }
  function substep(dt) {
    const m = S.m, x = S.x, v0 = S.v;
    const sl = slopeAt(x);
    const cs = 1 / Math.sqrt(1 + sl * sl), sn = sl * cs;
    let a = -G * sn;
    if (S.friction) {
      const f = MU * G * cs;
      if (v0 === 0) {
        if (Math.abs(a) <= f) { settle(); return; }   // 정지 마찰로 멈춤
        a -= Math.sign(a) * f;
      } else a -= Math.sign(v0) * f;
    }
    const v = v0 + a * dt;
    let nx = x + v * cs * dt;
    if (nx < 0) nx = 0;
    if (nx > XEND) nx = XEND;
    const loss = S.friction ? MU * m * G * Math.abs(nx - x) : 0;
    const E = S.Emech - loss;
    const hN = heightAt(nx);
    const K = E - m * G * hN;
    if (K > 0) {
      const dir = v > 0 ? 1 : v < 0 ? -1 : 0;
      S.x = nx; S.Emech = E; S.heat += loss;
      S.v = dir * Math.sqrt((2 * K) / m);
      if (v0 !== 0 && dir !== 0 && dir !== Math.sign(v0)) turning(x);
    } else {
      // 운동 에너지가 0 → 되돌아오는 지점
      if (v0 !== 0) turning(x);
      S.v = 0;
    }
    track();
    if (S.x >= XEND - 1e-9 && S.v > 0) finish();
  }
  function track() {
    const r = S.run;
    if (!r) return;
    if (S.x > r.maxX) r.maxX = S.x;
    const sp = Math.abs(S.v);
    if (sp > r.vmax) r.vmax = sp;
    const hh = heightAt(S.x);
    if (hh <= S.hMin + 0.02) {
      if (!S.inLow) {
        S.inLow = true;
        if (!r.passedLow) r.lowT = performance.now();
        r.passedLow = true;
        S.lowEntry = { m: S.m, h0: r.h0, hLow: S.hMin, v: sp, fric: r.anyFric };
        S.bottomLog.push(S.lowEntry);
        if (S.bottomLog.length > 30) S.bottomLog.shift();
      } else if (S.lowEntry && sp > S.lowEntry.v) S.lowEntry.v = sp;
      if (r.lowV == null || sp > r.lowV) r.lowV = sp;
    } else if (hh > S.hMin + 0.1) S.inLow = false;
  }
  function turning(x) {
    if (S.friction && Math.abs(slopeAt(x)) <= MU) return; // 곧 멈출 곳은 표시하지 않음
    S.turns.push({ x, h: heightAt(x), t: performance.now() });
    if (S.turns.length > 4) S.turns.shift();
    if (S.run) S.run.turned = true;
  }
  function settle() {
    S.v = 0;
    S.state = 'settled';
    updateRunBtn();
    addFx('멈췄어요!', px(S.x), py(heightAt(S.x)) - 44, '#9f1239');
    Sound.tone(330, 0.18, 'triangle', 0.08);
  }
  function finish() {
    S.x = XEND;
    S.state = 'finished';
    updateRunBtn();
    addFx('🏁 통과!', px(XLAST) - 6, py(S.H[N - 1]) - 62, C.good);
    Sound.success();
  }
  function addFx(text, x, y, color) { S.fx.push({ text, x, y, color, t0: performance.now() }); }

  function updateSparks(dt) {
    const now = performance.now();
    if (S.state === 'running' && S.friction && Math.abs(S.v) > 0.3) {
      const power = MU * S.m * G * Math.abs(S.v); // 열로 바뀌는 빠르기 (W)
      const n = Math.min(2, Math.floor(Math.min(1.6, power / 60) * S.rate + Math.random()));
      const cx = px(S.x), cy = py(heightAt(S.x));
      for (let i = 0; i < n; i++) {
        S.sparks.push({ x: cx + (Math.random() - 0.5) * 22, y: cy - 2, vx: -Math.sign(S.v) * (20 + Math.random() * 40), vy: -(30 + Math.random() * 50), t0: now, hot: Math.random() < 0.5 });
      }
    }
    S.sparks.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; });
    S.sparks = S.sparks.filter((s) => now - s.t0 < 380);
    if (S.sparks.length > 40) S.sparks.splice(0, S.sparks.length - 40);
    S.fx = S.fx.filter((f) => now - f.t0 < 1600);
  }

  /* ---------- 에너지 값 (표시용: 합이 맞도록 반올림) ---------- */
  function energies() {
    const h = heightAt(S.x);
    const Ep = S.m * G * h;
    const mech = Math.max(Ep, S.Emech);
    const Ek = Math.max(0, mech - Ep);
    const mechR = Math.round(mech), EpR = Math.round(Ep);
    const E0R = Math.round(S.E0);
    return { h, Ep, Ek, mech, EpR, EkR: Math.max(0, mechR - EpR), mechR, heatR: Math.max(0, E0R - mechR), E0R, heat: S.heat };
  }

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, reserve: 250 });
  const ctx = view.ctx;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function haloText(text, x, y, color, font, align) {
    ctx.font = font; ctx.textAlign = align || 'center';
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  const isLocked = (i) => !!(S.locks && S.locks.preset === S.preset && S.locks.idx.indexOf(i) >= 0);
  const flagOn = () => !!(S.flag && S.flag.preset === S.preset);

  function draw() {
    view.clear(PORTRAIT ? '#ffffff' : '#eaf5ff');
    drawScene();
    drawStartLine();
    drawTrack();
    drawLowMark();
    drawFlag();
    drawTurns();
    drawHandles();
    drawCart();
    drawGate();
    drawSparks();
    drawFx();
    drawSpeedBar();
    drawPanel();
  }

  function drawScene() {
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#c9e6ff'); g.addColorStop(1, '#f3f9ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, GY);
    cloud(255, 44, 1); cloud(452, 96, 0.75);
    // 높이 눈금
    ctx.textBaseline = 'middle';
    for (let h = 0; h <= H_TOP; h++) {
      const y = py(h);
      if (h > 0) {
        ctx.strokeStyle = h % 5 === 0 ? 'rgba(52,84,128,.20)' : 'rgba(52,84,128,.09)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(572, y); ctx.stroke();
      }
      ctx.fillStyle = '#4b5b72'; ctx.font = F(12, h % 5 === 0); ctx.textAlign = 'right';
      ctx.fillText(h + '', 40, y);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#4b5b72'; ctx.font = F(12, 1); ctx.textAlign = 'left';
    ctx.fillText('높이(m)', 8, 30);
    // 지면
    ctx.fillStyle = '#93d27f'; ctx.fillRect(0, GY, VW, 520 - GY);
    ctx.fillStyle = '#6fb85c'; ctx.fillRect(0, GY, VW, 4);
  }
  function cloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * s, y + 4 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 20 * s, y - 6 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStartLine() {
    const h0 = S.H[0], y = py(h0);
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(37,99,235,.6)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(X0 - 2, y); ctx.lineTo(px(XEND), y); ctx.stroke();
    ctx.restore();
    haloText('출발 높이 ' + fmt(h0, 1) + ' m', X0 + 44, y - 7, '#1d4ed8', F(12, 1), 'left');
  }

  function drawTrack() {
    // 받침 기둥
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#c3ccda'; ctx.lineWidth = 3;
    for (let X = X0 + 11; X < px(XEND); X += 22) {
      const h = heightAt((X - X0) / PPM);
      if (h < 0.3) continue;
      ctx.beginPath(); ctx.moveTo(X, py(h) + 4); ctx.lineTo(X, GY); ctx.stroke();
    }
    // 출발 탑
    ctx.strokeStyle = '#aab4c4'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(X0, py(S.H[0]) + 4); ctx.lineTo(X0, GY); ctx.stroke();
    // 레일
    ctx.beginPath();
    for (let X = X0; X <= px(XEND) + 0.1; X += 2) {
      const y = py(heightAt((X - X0) / PPM));
      if (X === X0) ctx.moveTo(X, y); else ctx.lineTo(X, y);
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#a8b3c4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function lowRange() {
    let lo = null, hi = null;
    for (let x = 0; x <= XLAST + 1e-6; x += 0.05) {
      if (heightAt(x) <= S.hMin + 0.02) { if (lo === null) lo = x; hi = x; }
    }
    return lo === null ? null : [lo, hi];
  }
  function drawLowMark() {
    if (!S.lowMark) return;
    const r = lowRange();
    if (!r) return;
    const done = S.run && S.run.passedLow;
    const pulse = 0.55 + 0.25 * Math.sin(performance.now() / 260);
    ctx.save();
    ctx.strokeStyle = done ? 'rgba(22,163,74,.55)' : 'rgba(22,163,74,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = r[0]; x <= r[1] + 1e-6; x += 0.05) {
      const X = px(x), Y = py(heightAt(x));
      if (x === r[0]) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    if (r[1] - r[0] < 0.05) ctx.lineTo(px(r[0]) + 0.5, py(heightAt(r[0])));
    ctx.stroke();
    ctx.restore();
    const cx = px((r[0] + r[1]) / 2), cy = py(S.hMin);
    if (!done) haloText('⬇ 가장 낮은 곳', cx, cy - 40, C.good, F(14, 1));
    else if (performance.now() - (S.run.lowT || 0) < 2500) haloText('✓ 가장 낮은 곳 통과!', cx, cy - 40, C.good, F(14, 1));
  }

  function drawFlag() {
    if (!flagOn()) return;
    const i = S.flag.idx, x = px(i * DX), y = py(S.H[i]);
    const done = S.run && S.run.maxX > i * DX + 0.15;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 62); ctx.stroke();
    const label = done ? '✓ 언덕 통과!' : '🎯 ' + fmt(S.H[i], 0) + ' m 언덕 넘기';
    ctx.font = F(13, 1);
    const w = ctx.measureText(label).width + 18;
    ctx.fillStyle = done ? C.good : '#e2464b';
    ctx.beginPath();
    ctx.moveTo(x, y - 62); ctx.lineTo(x + w, y - 62); ctx.lineTo(x + w - 8, y - 50); ctx.lineTo(x + w, y - 38); ctx.lineTo(x, y - 38); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 7, y - 45);
  }

  function drawTurns() {
    const now = performance.now();
    S.turns.forEach((tp, k) => {
      const last = k === S.turns.length - 1;
      const X = px(tp.x), Y = py(tp.h);
      ctx.globalAlpha = last ? 1 : 0.45;
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X - 14, Y); ctx.lineTo(X + 14, Y); ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath(); ctx.moveTo(X, Y - 3); ctx.lineTo(X - 6, Y - 12); ctx.lineTo(X + 6, Y - 12); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (last && now - tp.t > 120 && tp.h > S.hMin + 0.6) {
        const tx = clamp(X, 120, 548);
        haloText('최고 ' + fmt(tp.h, 1) + ' m', tx, Y - 18, '#1d4ed8', F(13, 1));
      }
    });
  }

  function handleCircle(x, y, i, label) {
    const locked = isLocked(i);
    const active = S.drag === i || S.hover === i;
    ctx.beginPath(); ctx.arc(x, y, active ? 13 : 11, 0, Math.PI * 2);
    ctx.fillStyle = locked ? '#e5e7eb' : active ? '#ffe4d6' : '#fff';
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = locked ? '#94a3b8' : C.cart; ctx.stroke();
    ctx.fillStyle = locked ? '#64748b' : '#c2410c';
    ctx.font = locked ? F(12) : F(13, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(locked ? '🔒' : (label || '↕'), x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function drawHandles() {
    // 출발 높이 손잡이 (엘리베이터)
    const y0 = py(S.H[0]);
    ctx.strokeStyle = 'rgba(71,85,105,.22)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(KNOB_X, py(H_TOP)); ctx.lineTo(KNOB_X, py(0.5)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(KNOB_X + 12, y0); ctx.lineTo(X0 - 3, y0); ctx.stroke(); ctx.restore();
    handleCircle(KNOB_X, y0, 0);
    haloText('출발', KNOB_X, y0 + 27, '#c2410c', F(12, 1));
    // 레일 조절점
    for (let i = 1; i < N; i++) {
      const x = px(i * DX), y = py(S.H[i]);
      handleCircle(x, y, i);
      if (flagOn() && S.flag.idx === i) continue;
      const t = fmt(S.H[i], 1) + ' m';
      if (i === N - 1) haloText(t, x - 14, y - 16, '#334155', F(12, 1), 'right');
      else haloText(t, x, y - 19, '#334155', F(12, 1));
    }
  }

  function drawCart() {
    if (S.state === 'finished') return;
    const h = heightAt(S.x), sl = slopeAt(S.x);
    const cx = px(S.x), cy = py(h), ang = -Math.atan(sl);
    // 높이 표시 (기준면까지)
    if (h > 0.7) {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(37,99,235,.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, GY); ctx.stroke(); ctx.restore();
      const right = cx < 470, label = fmt(h, 1) + ' m';
      ctx.font = F(13, 1);
      const tw = ctx.measureText(label).width + 10, th = 13 * FS + 7;
      const lx = right ? cx + 5 : cx - 5 - tw, ly = (cy + GY) / 2 - th / 2;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(lx, ly, tw, th, th / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(37,99,235,.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1d4ed8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + tw / 2, ly + th / 2 + 0.5);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    // 속도 화살표
    const sp = Math.abs(S.v);
    if (sp > 0.25) {
      const dir = S.v > 0 ? 1 : -1;
      const L = 8 + sp * 3.4;
      const xa = dir * 22, xb = dir * (22 + L), yy = -15;
      ctx.strokeStyle = '#ea580c'; ctx.fillStyle = '#ea580c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb - dir * 6, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xb, yy); ctx.lineTo(xb - dir * 11, yy - 7); ctx.lineTo(xb - dir * 11, yy + 7); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt';
    }
    // 바퀴
    ctx.fillStyle = '#1f2937';
    [-11, 11].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -5, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#9ca3af';
    [-11, 11].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -5, 1.8, 0, Math.PI * 2); ctx.fill(); });
    // 차체
    const bg = ctx.createLinearGradient(0, -30, 0, -8);
    bg.addColorStop(0, '#ff9b6b'); bg.addColorStop(1, '#e0552a');
    ctx.fillStyle = bg;
    roundRect(-20, -30, 40, 21, 6); ctx.fill();
    ctx.strokeStyle = '#b8401c'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = F(12, 1); ctx.textAlign = 'center';
    ctx.fillText(S.m + ' kg', 0, -15);
    ctx.restore();
    // 출발 전 안내
    if (S.state === 'ready' && !S.hinted) {
      haloText('▶ 출발!', cx, cy - 40, '#c2410c', F(13, 1));
    }
  }

  function drawGate() {
    const x0 = px(XLAST) + 13, x1 = px(XLAST) + 33, y = py(S.H[N - 1]);
    ctx.fillStyle = 'rgba(30,41,59,.88)';
    ctx.fillRect(x0, y - 36, x1 - x0, 32);
    ctx.fillStyle = '#334155';
    ctx.fillRect(x0 - 2, y - 40, 4, 40); ctx.fillRect(x1 - 2, y - 40, 4, 40);
    // 체크무늬 지붕
    const cw = (x1 - x0 + 8) / 6;
    for (let k = 0; k < 6; k++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (k + r) % 2 ? '#111827' : '#ffffff';
        ctx.fillRect(x0 - 4 + k * cw, y - 48 + r * 5, cw, 5);
      }
    }
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 4, y - 48, x1 - x0 + 8, 10);
    if (y > 72) haloText('도착', (x0 + x1) / 2, y - 53, '#111827', F(12, 1));
    else haloText('도착', (x0 + x1) / 2, y + 20, '#111827', F(12, 1));
  }

  function drawSparks() {
    const now = performance.now();
    S.sparks.forEach((s) => {
      const a = Math.max(0, 1 - (now - s.t0) / 380);
      ctx.fillStyle = (s.hot ? 'rgba(249,115,22,' : 'rgba(251,191,36,') + (a * 0.95).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.5 + a * 2, 0, Math.PI * 2); ctx.fill();
    });
  }
  function drawFx() {
    const now = performance.now();
    S.fx.forEach((f) => {
      const p = (now - f.t0) / 1600;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      haloText(f.text, f.x, f.y - p * 18, f.color, F(18, 1));
      ctx.globalAlpha = 1;
    });
  }

  function drawSpeedBar() {
    const x = 56, y = 470, w = 512, hgt = 42;
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    roundRect(x, y, w, hgt, 10); ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.font = F(13, 1); ctx.textAlign = 'left';
    ctx.fillText('🏎️ 속력', x + 10, y + 22);
    const bx = x + 76, bw = 330, by = y + 10, bh = 12;
    const vx = (v) => bx + clamp(v / V_MAX, 0, 1) * bw;
    ctx.fillStyle = '#e5e9f0'; roundRect(bx, by, bw, bh, 6); ctx.fill();
    if (S.speedTarget) {
      const t = S.speedTarget;
      ctx.fillStyle = 'rgba(22,163,74,.35)';
      ctx.fillRect(vx(t.v - t.tol), by - 4, vx(t.v + t.tol) - vx(t.v - t.tol), bh + 8);
      ctx.fillStyle = C.good; ctx.fillRect(vx(t.v) - 1, by - 5, 2, bh + 10);
    }
    const sp = Math.abs(S.v);
    if (sp > 0.01 && S.state !== 'finished') {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#fdba74'); g.addColorStop(1, '#ea580c');
      ctx.fillStyle = g; roundRect(bx, by, Math.max(bh, vx(sp) - bx), bh, 6); ctx.fill();
    }
    if (S.run && S.run.vmax > 0.05) {
      const mx = vx(S.run.vmax);
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(mx, by - 1); ctx.lineTo(mx - 5, by - 7); ctx.lineTo(mx + 5, by - 7); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#5d6879'; ctx.font = F(12); ctx.textAlign = 'center';
    for (let v = 0; v <= V_MAX; v += 5) ctx.fillText(v + '', vx(v), y + 37);
    ctx.textAlign = 'right'; ctx.fillStyle = '#c2410c'; ctx.font = F(15, 1);
    ctx.fillText(fmt(S.state === 'finished' ? Math.abs(S.v) : sp, 1) + ' m/s', x + w - 10, y + 21);
    if (S.run && S.run.vmax > 0.05) {
      ctx.fillStyle = '#7c2d12'; ctx.font = F(12);
      ctx.fillText('▼최고 ' + fmt(S.run.vmax, 1), x + w - 10, y + 37);
    }
  }

  function drawPanel() {
    if (PORTRAIT) { drawPanelWide(); return; }
    const P = PANEL;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = F(15, 1); ctx.textAlign = 'left';
    ctx.fillText('⚡ 에너지', P.x + 14, P.y + 28);
    ctx.fillStyle = '#5d6879'; ctx.font = F(12, 1); ctx.textAlign = 'right';
    ctx.fillText('단위: J', P.x + P.w - 14, P.y + 28);

    const y0 = 392, yT = 92, k = (y0 - yT) / E_MAX;
    const by = (e) => y0 - clamp(e, 0, E_MAX) * k;
    ctx.font = F(12); ctx.textBaseline = 'middle';
    for (let e = 0; e <= E_MAX; e += 100) {
      const y = by(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(P.x + 40, y); ctx.lineTo(P.x + P.w - 8, y); ctx.stroke();
      ctx.fillStyle = '#7b8798'; ctx.textAlign = 'right'; ctx.fillText(e + '', P.x + 35, y);
    }
    ctx.textBaseline = 'alphabetic';

    const E = energies();
    const showHeat = S.friction || E.heatR > 0;
    const cols = [
      { key: 'ep', name: ['위치', '에너지'], val: E.EpR, color: C.ep },
      { key: 'ek', name: ['운동', '에너지'], val: E.EkR, color: C.ek },
      { key: 'mech', name: ['역학적', '에너지'], val: E.mechR, color: C.mech },
    ];
    if (showHeat) cols.push({ key: 'heat', name: ['열', '에너지'], val: E.heatR, color: C.heat });
    const left = P.x + 46, right = P.x + P.w - 10;
    const step = (right - left) / cols.length;
    const bw = Math.min(38, step - 12);

    // 처음 에너지 점선
    const yE0 = by(E.E0R);
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left - 4, yE0); ctx.lineTo(right, yE0); ctx.stroke(); ctx.restore();

    cols.forEach((c, i) => {
      const cx = left + step * (i + 0.5), x = cx - bw / 2;
      if (c.key === 'mech') {
        const yEp = by(E.EpR), yTop = by(E.mechR);
        ctx.fillStyle = C.ep; ctx.fillRect(x, yEp, bw, y0 - yEp);
        ctx.fillStyle = C.ek; ctx.fillRect(x, yTop, bw, yEp - yTop);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, yTop - 1.5, bw + 3, y0 - yTop + 1.5);
      } else {
        const yTop = by(c.val);
        ctx.fillStyle = c.color; ctx.fillRect(x, yTop, bw, y0 - yTop);
      }
      const ink = c.key === 'mech' ? '#6d28d9' : c.key === 'heat' ? '#be123c' : c.key === 'ep' ? '#1d4ed8' : '#c2410c';
      haloText(c.val + '', cx, by(c.val) - (c.key === 'mech' ? 9 : 6), ink, F(13, 1));
      ctx.fillStyle = ink; ctx.font = F(12.5, 1); ctx.textAlign = 'center';
      ctx.fillText(c.name[0], cx, y0 + 19);
      ctx.fillText(c.name[1], cx, y0 + 35);
    });

    // 범례와 관계식
    const ly = 452;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.x + 14, ly - 4); ctx.lineTo(P.x + 38, ly - 4); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#475569'; ctx.font = F(12); ctx.textAlign = 'left';
    ctx.fillText('처음 에너지 ' + E.E0R + ' J', P.x + 44, ly);
    ctx.font = F(12.5, 1); ctx.textAlign = 'center';
    if (showHeat) {
      ctx.fillStyle = '#6d28d9'; ctx.fillText('역학적 + 열 = ' + (E.mechR + E.heatR) + ' J', P.x + P.w / 2, 476);
      ctx.fillStyle = '#5d6879'; ctx.font = F(12); ctx.fillText('(전체 에너지는 일정)', P.x + P.w / 2, 494);
    } else {
      ctx.fillStyle = '#6d28d9'; ctx.fillText('역학적 = 위치 + 운동', P.x + P.w / 2, 476);
      ctx.fillStyle = '#5d6879'; ctx.font = F(12); ctx.fillText('(마찰이 없으면 일정)', P.x + P.w / 2, 494);
    }
  }

  // 좁은 화면용: 가로 막대그래프
  function drawPanelWide() {
    const P = PANEL;
    ctx.fillStyle = '#ffffff';
    roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    const E = energies();
    ctx.fillStyle = '#1b2333'; ctx.font = F(15, 1); ctx.textAlign = 'left';
    ctx.fillText('⚡ 에너지 (J)', P.x + 14, P.y + 30);
    // 범례
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(P.x + P.w - 200, P.y + 25); ctx.lineTo(P.x + P.w - 176, P.y + 25); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#475569'; ctx.font = F(12.5); ctx.textAlign = 'left';
    ctx.fillText('처음 에너지 ' + E.E0R + ' J', P.x + P.w - 170, P.y + 30);

    const bx0 = P.x + 128, bx1 = P.x + P.w - 22;
    const k = (bx1 - bx0) / E_MAX;
    const bx = (e) => bx0 + clamp(e, 0, E_MAX) * k;
    const top = P.y + 48, bottom = P.y + 206;
    // 눈금
    ctx.font = F(12); ctx.textAlign = 'center';
    for (let e = 0; e <= E_MAX; e += 100) {
      const x = bx(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.fillStyle = '#7b8798'; ctx.fillText(e + '', x, bottom + 18);
    }
    const showHeat = S.friction || E.heatR > 0;
    const rows = [
      { key: 'ep', name: '위치 에너지', val: E.EpR, color: C.ep, ink: '#1d4ed8' },
      { key: 'ek', name: '운동 에너지', val: E.EkR, color: C.ek, ink: '#c2410c' },
      { key: 'mech', name: '역학적 에너지', val: E.mechR, color: C.mech, ink: '#6d28d9' },
    ];
    if (showHeat) rows.push({ key: 'heat', name: '열에너지', val: E.heatR, color: C.heat, ink: '#be123c' });
    const xE0 = bx(E.E0R);
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(xE0, top); ctx.lineTo(xE0, bottom); ctx.stroke(); ctx.restore();
    const rowH = 38, bh = 24;
    const y0 = top + (bottom - top - rows.length * rowH) / 2;
    rows.forEach((r, i) => {
      const cy = y0 + rowH * (i + 0.5), y = cy - bh / 2;
      if (r.key === 'mech') {
        ctx.fillStyle = C.ep; ctx.fillRect(bx0, y, bx(E.EpR) - bx0, bh);
        ctx.fillStyle = C.ek; ctx.fillRect(bx(E.EpR), y, bx(E.mechR) - bx(E.EpR), bh);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(bx0, y - 1.5, bx(E.mechR) - bx0 + 1.5, bh + 3);
      } else {
        ctx.fillStyle = r.color; ctx.fillRect(bx0, y, bx(r.val) - bx0, bh);
      }
      ctx.fillStyle = r.ink; ctx.font = F(12.5, 1); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(r.name, bx0 - 8, cy);
      const vx = bx(r.val);
      const label = r.val + '';
      if (vx > bx1 - 50) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(label, vx - 6, cy); }
      else haloText(label, vx + (r.key === 'mech' ? 8 : 6), cy, r.ink, F(12.5, 1), 'left');
      ctx.textBaseline = 'alphabetic';
    });
    // 관계식
    ctx.textAlign = 'center'; ctx.font = F(13, 1); ctx.fillStyle = '#6d28d9';
    ctx.fillText(showHeat ? '역학적 + 열 = ' + (E.mechR + E.heatR) + ' J (전체 에너지는 일정)' : '역학적 에너지 = 위치 + 운동 (마찰이 없으면 일정)', P.x + P.w / 2, P.y + P.h - 14);
  }

  /* ---------- 입력: 손잡이 끌기 ---------- */
  function handlePos(i) { return i === 0 ? { x: KNOB_X, y: py(S.H[0]) } : { x: px(i * DX), y: py(S.H[i]) }; }
  function hitHandle(p) {
    const r = Math.max(24, 20 / (view.scale || 1));
    let best = -1, bd = r;
    for (let i = 0; i < N; i++) {
      const hp = handlePos(i);
      const dd = Math.hypot(p.x - hp.x, p.y - hp.y);
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best < 0) {
      // 출발점의 수레(또는 레일 끝)를 직접 끌어도 출발 높이가 바뀜
      const cx = px(0), cy = py(S.H[0]);
      const onStart = Math.abs(p.x - cx) < 26 && p.y > cy - 40 && p.y < cy + 16;
      if (onStart && (S.state === 'ready' || Math.hypot(p.x - cx, p.y - cy) < 18)) best = 0;
    }
    return best;
  }
  function setHeight(i, h) {
    const lo = i === 0 ? 0.5 : 0;
    h = clamp(Math.round(h * 10) / 10, lo, H_TOP);
    if (S.H[i] === h && S.state === 'ready') return;
    S.H[i] = h;
    rebuild();
    resetRun();
    if (i === 0) rangeH.set(h);
  }
  SciSim.pointer(view, {
    hover(p) {
      const i = hitHandle(p);
      S.hover = i;
      if (i < 0) return null;
      return isLocked(i) ? 'not-allowed' : 'ns-resize';
    },
    down(p) {
      const i = hitHandle(p);
      if (i < 0) return false;
      if (isLocked(i)) {
        Sound.fail();
        toast('🔒 이 미션에서는 이 지점의 높이를 바꿀 수 없어요.', 'bad');
        return false;
      }
      S.drag = i;
      S.dragOff = p.y - py(S.H[i]);
      hideHint();
      Sound.tick();
      return true;
    },
    move(p) {
      if (S.drag < 0) return;
      setHeight(S.drag, (GY - (p.y - S.dragOff)) / PPM);
    },
    up() { S.drag = -1; S.hover = -1; },
  });
  view.canvas.addEventListener('pointerleave', () => { if (S.drag < 0) S.hover = -1; });

  /* ---------- 입력: 버튼과 슬라이더 ---------- */
  const rangeH = SciSim.bindRange($('#sH'), $('#oH'), (v) => fmt(v, 1) + ' m', (v) => { hideHint(); setHeight(0, v); });
  const rangeM = SciSim.bindRange($('#sM'), $('#oM'), (v) => v + ' kg', (v) => setMass(v));
  function setMass(v) {
    v = clamp(Math.round(v), 1, 5);
    if (v === S.m) return;
    // 질량이 바뀌어도 운동(속력)은 그대로, 에너지는 질량에 비례해 바뀜
    const k = v / S.m;
    S.Emech *= k; S.heat *= k; S.E0 *= k;
    S.m = v;
    rangeM.set(v);
  }
  function setFriction(on) {
    S.friction = !!on;
    $('#fric').checked = S.friction;
    if (S.run) {
      if (!S.friction) S.run.fricAll = false;
      else S.run.anyFric = true;
    }
    $('#fricBox').classList.toggle('on', S.friction);
    $('#fricNote').textContent = S.friction
      ? '레일과 바퀴 사이의 마찰로 역학적 에너지의 일부가 열에너지로 바뀌어요.'
      : '마찰이 없어요. 역학적 에너지가 그대로 보존돼요.';
  }
  $('#fric').addEventListener('change', (e) => { Sound.click(); setFriction(e.target.checked); });
  $('#runBtn').addEventListener('click', () => { Sound.click(); startRun(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetRun(); });
  function setPreset(key) {
    S.preset = key;
    S.H = PRESETS[key].h.slice();
    $$('#presetSeg button').forEach((b) => b.classList.toggle('on', b.dataset.preset === key));
    rebuild();
    resetRun();
    rangeH.set(S.H[0]);
  }
  $$('#presetSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPreset(b.dataset.preset); }));
  function setRate(r) {
    S.rate = r;
    $$('#rateSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.rate === r));
  }
  $$('#rateSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setRate(+b.dataset.rate); }));

  function hideHint() { if (!S.hinted) { S.hinted = true; $('#stageHint').classList.add('hide'); } }
  function placeHint() {
    const tb = $('#toolbar');
    $('#stageHint').style.top = (tb ? tb.offsetHeight : 52) + 12 + 'px';
  }
  window.addEventListener('resize', placeHint);

  /* ---------- 측정값 ---------- */
  const rH = $('#rH'), rV = $('#rV'), rEp = $('#rEp'), rEk = $('#rEk');
  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.08) return;
    lastUI = t;
    const E = energies();
    rH.innerHTML = fmt(E.h, 1) + '<small>m</small>';
    rV.innerHTML = fmt(Math.abs(S.v), 1) + '<small>m/s</small>';
    rEp.innerHTML = E.EpR + '<small>J</small>';
    rEk.innerHTML = E.EkR + '<small>J</small>';
  }

  /* ---------- 미션 도우미 ---------- */
  function prep(o) {
    setPreset(o.preset || 'valley');
    if (o.h0 != null) { S.H[0] = o.h0; rebuild(); rangeH.set(o.h0); }
    if (o.mass != null) setMass(o.mass);
    if (o.friction != null) setFriction(o.friction);
    resetRun();
  }
  const f1 = (v) => fmt(v, 1);
  const hillPassed = () => !!(S.run && S.run.maxX > HILL_X + 0.15);
  function hillStatus() {
    if (S.preset !== 'hill') return '🎢 <b>언덕 넘기</b> 레일에서 해 보세요.';
    let s = '출발 높이 <b>' + f1(S.H[0]) + ' m</b> · 언덕 꼭대기 <b>' + f1(S.H[HILL_IDX]) + ' m</b>';
    if (S.run && S.run.turned && !hillPassed()) {
      const tp = S.turns[S.turns.length - 1];
      s += '<br>↩ 언덕을 넘지 못하고 되돌아왔어요' + (tp ? ' (최고 ' + f1(tp.h) + ' m)' : '');
    } else if (S.run && S.state === 'running') s += '<br>🎢 달리는 중… 속력 <b>' + f1(Math.abs(S.v)) + ' m/s</b>';
    return s;
  }
  function lastLog(mass) {
    for (let i = S.bottomLog.length - 1; i >= 0; i--) {
      const r = S.bottomLog[i];
      if (r.m === mass && !r.fric) return r;
    }
    return null;
  }

  const CONCEPT = `
    <h3>🎢 위치 에너지</h3>
    <p>높은 곳에 있는 물체가 가지는 에너지예요. 기준면(여기서는 지면, 0 m)으로부터 <b>높을수록</b>, <b>질량이 클수록</b> 커요.</p>
    <span class="formula">위치 에너지 = 9.8 × 질량 × 높이<br>= 9.8<i>mh</i></span>
    <h3>🏃 운동 에너지</h3>
    <p>운동하는 물체가 가지는 에너지예요. 질량에 비례하고, <b>속력의 제곱</b>에 비례해요.</p>
    <span class="formula">운동 에너지 = ½ × 질량 × 속력²<br>= ½<i>mv</i>²</span>
    <p class="note">질량은 kg, 높이는 m, 속력은 m/s 단위로 넣으면 에너지의 단위는 J(줄)이에요.</p>
    <h3>🔄 역학적 에너지 전환과 보존</h3>
    <ul>
      <li><b>역학적 에너지</b> = 위치 에너지 + 운동 에너지</li>
      <li>내려갈 때: 위치 에너지 → 운동 에너지 (속력이 빨라져요)</li>
      <li>올라갈 때: 운동 에너지 → 위치 에너지 (속력이 느려져요)</li>
      <li>마찰이나 공기 저항이 없으면 역학적 에너지는 <b>항상 일정</b>해요. → <b>역학적 에너지 보존</b></li>
    </ul>
    <span class="formula">감소한 위치 에너지 = 증가한 운동 에너지</span>
    <p>높이 <i>h</i>에서 정지 상태로 출발한 수레가 바닥(0 m)에 오면 9.8<i>mh</i> = ½<i>mv</i>² 이에요. 양쪽의 질량이 약분되므로 바닥에서의 속력은 <b>질량과 관계없이 높이로만</b> 정해져요. (예: 10 m → 14 m/s)</p>
    <p>마찰이 없으면 수레는 반대편에서 <b>출발 높이와 같은 높이</b>까지 올라갔다가 되돌아와요. 출발 높이보다 높은 언덕은 넘을 수 없어요.</p>
    <h3>🔥 마찰이 있을 때</h3>
    <p>마찰이 있으면 역학적 에너지의 일부가 <b>열에너지, 소리 에너지</b> 등으로 전환되어 역학적 에너지가 점점 줄어요. 그래서 수레는 출발 높이까지 다시 올라가지 못하고 결국 멈춰요.</p>
    <p>하지만 줄어든 역학적 에너지만큼 다른 형태의 에너지가 생기므로 <b>전체 에너지는 보존</b>돼요.</p>
    <span class="formula">처음 역학적 에너지 = 나중 역학적 에너지 + 열에너지 등</span>
    <p class="note">⚠️ 이 시뮬레이션의 수레는 레일에 고정되어 달리며, 크기와 바퀴의 회전은 무시했어요. 마찰로 생긴 소리 에너지 등은 모두 ‘열에너지’ 막대에 합쳐서 나타냈어요.</p>
  `;

  const game = SciSim.game({
    simId: 'm3-energy-coaster',
    mount: '#game',
    concept: CONCEPT,
    badge: '에너지 설계자',
    homeHref: '../../index.html#g3',
    onMissionStart() {
      S.locks = null; S.flag = null; S.lowMark = false; S.speedTarget = null;
    },
    levels: [
      {
        title: '에너지 전환 관찰',
        missions: [
          {
            title: '출발! 가장 낮은 곳까지',
            goal: '<b>▶ 출발</b>을 눌러 수레를 굴려 보세요. 수레가 초록색 <b>가장 낮은 곳</b>을 지날 때 오른쪽 에너지 막대가 어떻게 바뀌는지 지켜보세요.',
            hint: '화면 위쪽의 ▶ 출발 버튼을 누르면 수레가 출발점에서 정지 상태로 출발해요.',
            setup() { prep({ preset: 'valley', h0: 8, friction: false }); S.lowMark = true; },
            check: () => !!(S.run && S.run.passedLow),
            hold: 0.4,
            status: () => {
              if (!S.run) return '▶ <b>출발</b> 버튼을 눌러 보세요.';
              const E = energies();
              return '높이 <b>' + f1(E.h) + ' m</b> · 위치 에너지 <b>' + E.EpR + ' J</b> · 운동 에너지 <b>' + E.EkR + ' J</b>';
            },
            explain: '내려가는 동안 높이가 낮아져 <b>위치 에너지가 줄고</b>, 줄어든 만큼 속력이 빨라져 <b>운동 에너지가 늘어요</b>. 가장 낮은 곳에서 운동 에너지가 가장 크고, 다시 올라갈 때는 운동 에너지가 위치 에너지로 바뀌어요.',
          },
          {
            type: 'quiz',
            title: '가장 낮은 곳의 에너지',
            goal: '마찰이 없을 때, 수레가 레일의 <b>가장 낮은 곳</b>을 지나는 순간에 대한 설명으로 옳은 것은?',
            choices: [
              '위치 에너지가 가장 크다',
              '운동 에너지가 가장 크고, 위치 에너지가 가장 작다',
              '위치 에너지와 운동 에너지가 같다',
              '역학적 에너지가 가장 크다',
            ],
            answer: 1,
            feedback: [
              '가장 낮은 곳은 높이가 가장 작아요. 위치 에너지 = 9.8 × 질량 × 높이 를 떠올려 보세요.',
              '',
              '막대그래프에서 두 막대가 같아지는 곳은 출발 높이의 절반 높이를 지날 때예요. 가장 낮은 곳에서는 어땠나요?',
              '보라색 역학적 에너지 막대는 어디서나 높이가 같았어요. 마찰이 없으면 역학적 에너지는 일정해요.',
            ],
            explain: '높이가 가장 낮으니 위치 에너지가 가장 작고, 줄어든 위치 에너지만큼 운동 에너지가 늘어 <b>속력이 가장 빨라요</b>. 둘을 합한 역학적 에너지는 그대로예요.',
          },
          {
            title: '6 m 언덕을 넘어라!',
            goal: '깃발이 꽂힌 <b>6 m 언덕</b>을 수레가 넘어가도록 <b>출발 높이</b>를 바꾼 뒤 출발시키세요. (마찰 없음)',
            hint: '마찰이 없으면 수레는 출발 높이보다 높이 올라갈 수 없어요. 왼쪽 ‘출발’ 손잡이나 출발 높이 슬라이더로 출발점을 6 m보다 높게 올려 보세요.',
            setup() {
              prep({ preset: 'hill', h0: 5, friction: false });
              S.locks = { preset: 'hill', idx: [HILL_IDX] };
              S.flag = { preset: 'hill', idx: HILL_IDX };
            },
            check: () => S.preset === 'hill' && !S.friction && !!S.run && !S.run.anyFric && hillPassed() && S.H[HILL_IDX] >= 5.95,
            hold: 0.3,
            status: () => S.friction ? '마찰을 끄고 해 보세요.' : hillStatus(),
            explain: '출발 높이가 6 m보다 높아야 언덕 꼭대기에서도 <b>운동 에너지가 남아</b> 언덕을 넘을 수 있어요. 출발 높이가 6 m보다 낮으면 꼭대기에 닿기 전에 운동 에너지가 0이 되어 되돌아와요.',
          },
          {
            type: 'quiz',
            title: '반대편으로 얼마나 높이?',
            goal: '마찰이 없을 때, U자 계곡의 <b>8 m</b> 높이에서 정지 상태로 출발한 수레는 반대편에서 최대 몇 m 높이까지 올라갈까요? (직접 실험해 봐도 좋아요!)',
            setup() { prep({ preset: 'valley', h0: 8, friction: false }); },
            choices: [
              '4 m (출발 높이의 절반)',
              '8 m (출발 높이와 같은 높이)',
              '8 m보다 높이 (내려오면서 속력이 붙었으므로)',
              '수레가 무거울수록 더 높이 올라간다',
            ],
            answer: 1,
            feedback: [
              '내려오면서 에너지가 절반으로 줄어드는 게 아니에요. 마찰이 없으면 역학적 에너지는 그대로예요.',
              '',
              '내려오며 생긴 운동 에너지는 원래 위치 에너지가 바뀐 것이에요. 처음 가진 에너지보다 많아질 수는 없어요.',
              '질량을 바꿔 실험해 보세요. 질량이 커지면 에너지도 커지지만 올라가는 높이는 같아요.',
            ],
            explain: '바닥에서 가졌던 운동 에너지가 모두 위치 에너지로 다시 바뀌면, 처음과 <b>같은 높이(8 m)</b>에서 순간 멈췄다가 되돌아와요. 파란 점선(출발 높이)까지 정확히 올라가는 것을 확인할 수 있어요.',
          },
        ],
      },
      {
        title: '계산 도전',
        missions: [
          {
            type: 'quiz',
            title: '바닥에서의 운동 에너지',
            goal: '질량 <b>2 kg</b>인 수레가 높이 <b>5 m</b>에서 정지 상태로 출발했어요. 높이 <b>0 m</b>인 바닥을 지날 때 수레의 운동 에너지는? (마찰 무시)',
            hint: '출발할 때의 위치 에너지 = 9.8 × 질량 × 높이. 바닥(0 m)에서는 위치 에너지가 0이에요.',
            setup() { prep({ preset: 'valley', h0: 5, mass: 2, friction: false }); },
            choices: ['10 J', '49 J', '98 J', '196 J'],
            answer: 2,
            feedback: [
              '2 × 5 만 계산했어요. 위치 에너지 = 9.8 × 질량 × 높이 예요.',
              '위치 에너지의 절반만 바뀌는 게 아니에요. 바닥에서는 위치 에너지가 0이 되므로 모두 운동 에너지로 바뀌어요.',
              '',
              '9.8 × 2 × 5 를 다시 계산해 보세요.',
            ],
            explain: '출발할 때 위치 에너지 = 9.8 × 2 × 5 = <b>98 J</b>. 바닥(0 m)에서 위치 에너지는 0이 되므로 98 J이 모두 운동 에너지로 바뀌어요. ▶ 출발해서 막대그래프로 확인해 보세요!',
          },
          {
            title: '속력 14 m/s를 만들어라',
            goal: '바닥(0 m)을 지날 때 속력이 <b>14 m/s</b>가 되도록 출발 높이를 정하고 출발시키세요. 속력계의 초록 구간을 노려요!',
            hint: '위치 에너지 = 운동 에너지 → 9.8 × m × h = ½ × m × v². 양쪽의 질량은 약분돼요. 14 × 14 = 196 = 2 × 9.8 × h 이니 h는?',
            setup() {
              prep({ preset: 'valley', h0: 6, mass: 2, friction: false });
              S.locks = { preset: 'valley', idx: [2, 3] };
              S.speedTarget = { v: 14, tol: 0.3 };
            },
            check: () => !!(S.run && !S.run.anyFric && S.run.passedLow && S.hMin <= 0.01 && S.run.lowV != null && Math.abs(S.run.lowV - 14) <= 0.3),
            hold: 0.3,
            status: () => {
              if (S.friction) return '마찰을 끄고 해 보세요.';
              if (S.hMin > 0.01) return '🎢 바닥이 0 m인 <b>U자 계곡</b> 레일에서 해 보세요.';
              let s = '출발 높이 <b>' + f1(S.H[0]) + ' m</b>';
              if (S.run && S.run.lowV != null) s += ' · 바닥에서의 속력 <b>' + f1(S.run.lowV) + ' m/s</b>' + (Math.abs(S.run.lowV - 14) > 0.3 ? (S.run.lowV < 14 ? ' (더 빨라야 해요)' : ' (너무 빨라요)') : '');
              return s;
            },
            explain: '9.8 × h = ½ × 14² = 98 → <b>h = 10 m</b>. 10 m 높이의 위치 에너지가 바닥에서 모두 운동 에너지로 바뀌면 속력이 14 m/s가 돼요. 이때 질량은 계산에 필요 없었어요!',
          },
          {
            title: '무거운 수레 vs 가벼운 수레',
            goal: '출발 높이는 그대로 두고, 질량 <b>1 kg</b>으로 한 번, <b>5 kg</b>으로 한 번 출발시켜 <b>바닥에서의 속력</b>을 비교해 보세요.',
            hint: '질량 슬라이더를 1 kg에 두고 ▶ 출발 → 바닥을 지나면 질량을 5 kg으로 바꾸고 다시 출발해요. 달리는 도중에 질량을 바꿔 봐도 돼요!',
            setup() { prep({ preset: 'valley', h0: 6, mass: 1, friction: false }); S.bottomLog = []; S.lowMark = true; },
            check: () => {
              const a = lastLog(1), b = lastLog(5);
              return !!(a && b && Math.abs(a.h0 - b.h0) < 0.05 && Math.abs(a.hLow - b.hLow) < 0.05);
            },
            hold: 0.3,
            status: () => {
              const a = lastLog(1), b = lastLog(5);
              const v = (r) => r ? '<b>' + f1(r.v) + ' m/s</b>' : '—';
              let s = '바닥에서의 속력 → 1 kg: ' + v(a) + ' · 5 kg: ' + v(b);
              if (a && b && (Math.abs(a.h0 - b.h0) >= 0.05 || Math.abs(a.hLow - b.hLow) >= 0.05)) s += '<br>⚠️ 두 실험의 출발 높이와 레일이 같아야 해요.';
              return s;
            },
            explain: '질량이 5배가 되면 위치 에너지와 운동 에너지가 모두 5배가 되지만 <b>속력은 똑같아요</b>. 9.8<i>mh</i> = ½<i>mv</i>² 에서 양쪽의 <i>m</i>이 약분되어 v는 높이로만 정해지기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '무거우면 더 빠를까?',
            goal: '같은 높이에서 출발할 때 수레의 질량을 <b>2배</b>로 하면 어떻게 될까요? (마찰 무시)',
            choices: [
              '위치 에너지가 2배가 되므로 바닥에서의 속력도 2배가 된다',
              '출발할 때 위치 에너지는 2배가 되고, 바닥에서의 속력은 같다',
              '위치 에너지는 같고, 바닥에서의 속력은 느려진다',
              '위치 에너지와 바닥에서의 속력 모두 변하지 않는다',
            ],
            answer: 1,
            feedback: [
              '무거우면 더 빠를 것 같지만, 방금 실험에서 속력은 같았어요! 에너지가 2배인 대신 움직여야 할 질량도 2배예요.',
              '',
              '위치 에너지 = 9.8 × 질량 × 높이 — 질량에 비례해요.',
              '위치 에너지는 질량에 비례해요. 질량 슬라이더를 움직이며 막대그래프를 보세요.',
            ],
            explain: '위치 에너지(9.8<i>mh</i>)와 운동 에너지(½<i>mv</i>²)가 모두 질량에 비례하므로, 질량이 2배면 두 에너지가 모두 2배가 되고 <b>속력은 그대로</b>예요.',
          },
        ],
      },
      {
        title: '마찰의 세계',
        missions: [
          {
            title: '마찰이 있는 레일',
            goal: '<b>🔥 마찰 있음</b>을 켜고 수레를 출발시킨 뒤 수레가 <b>멈출 때까지</b> 지켜보세요. 반대편에서 출발 높이(파란 점선)까지 올라가나요?',
            hint: '오른쪽의 ‘마찰 있음’ 스위치를 켜고 ▶ 출발을 누르세요. 보라색 역학적 에너지 막대와 빨간 열에너지 막대를 비교해 보세요.',
            setup() { prep({ preset: 'valley', h0: 8, friction: false }); },
            check: () => !!(S.run && S.run.fricAll && (S.state === 'settled' || S.run.t >= 15)),
            hold: 0.5,
            status: () => {
              if (!S.friction && !(S.run && S.run.fricAll)) return '먼저 <b>🔥 마찰 있음</b>을 켜세요.';
              if (!S.run) return '▶ <b>출발</b>을 눌러 보세요.';
              if (!S.run.fricAll) return '마찰을 켠 상태로 ⏹ 리셋 후 다시 출발해 보세요.';
              const E = energies();
              const tp = S.turns[S.turns.length - 1];
              return '열에너지 <b>' + E.heatR + ' J</b>' + (tp ? ' · 최근 최고 높이 <b>' + f1(tp.h) + ' m</b> (출발 ' + f1(S.run.h0) + ' m)' : '') + (S.state === 'settled' ? '<br>🛑 수레가 멈췄어요!' : '');
            },
            explain: '마찰이 있으면 수레가 움직이는 동안 역학적 에너지의 일부가 <b>열에너지</b>로 바뀌어요. 그래서 출발 높이까지 올라가지 못하고, 올라가는 높이가 점점 낮아지다가 결국 골짜기에서 멈춰요.',
          },
          {
            type: 'quiz',
            title: '줄어든 에너지는 어디로?',
            goal: '마찰이 있는 레일에서 수레의 역학적 에너지가 줄어들었어요. 줄어든 역학적 에너지는 어떻게 되었을까요?',
            choices: [
              '에너지가 사라져 없어졌다',
              '마찰에 의해 열에너지, 소리 에너지 등 다른 형태의 에너지로 전환되었다',
              '위치 에너지로 저장되었다가 나중에 다시 운동 에너지가 된다',
              '수레의 질량이 줄어들었다',
            ],
            answer: 1,
            feedback: [
              '에너지는 저절로 생기거나 없어지지 않아요. 빨간 열에너지 막대를 보세요!',
              '',
              '수레가 멈춘 뒤에도 위치 에너지는 늘지 않았어요. 위치 에너지는 높이로 정해져요.',
              '수레의 질량은 변하지 않아요.',
            ],
            explain: '마찰 때문에 레일과 바퀴가 데워지고(열에너지) 소리도 나요(소리 에너지). 역학적 에너지는 줄었지만 줄어든 만큼 다른 에너지가 생겨 <b>전체 에너지는 보존</b>돼요. (역학적 에너지 + 열에너지 = 처음 에너지)',
          },
          {
            title: '마찰을 이기고 언덕 넘기',
            goal: '<b>마찰이 있는</b> 레일에서도 깃발이 꽂힌 <b>6 m 언덕</b>을 넘도록 레일을 설계하세요. (마찰 있음 유지)',
            hint: '출발 높이 6.5 m로는 부족해요. 언덕까지 가는 동안 열에너지로 바뀌는 만큼 출발 높이를 더 높여야 해요. 언덕 앞 골짜기의 높이를 바꿔 봐도 좋아요.',
            setup() {
              prep({ preset: 'hill', h0: 6.5, friction: true });
              S.locks = { preset: 'hill', idx: [HILL_IDX] };
              S.flag = { preset: 'hill', idx: HILL_IDX };
            },
            check: () => S.preset === 'hill' && S.friction && !!S.run && S.run.fricAll && hillPassed() && S.H[HILL_IDX] >= 5.95,
            hold: 0.3,
            status: () => {
              if (!S.friction) return '🔥 <b>마찰 있음</b>을 켜고 해 보세요.';
              let s = hillStatus();
              if (S.run && S.preset === 'hill') s += '<br>열에너지로 바뀐 에너지 <b>' + energies().heatR + ' J</b>';
              return s;
            },
            explain: '마찰이 있으면 언덕까지 가는 동안 역학적 에너지 일부가 열에너지로 바뀌어요. 그래서 언덕 높이(6 m)보다 <b>충분히 더 높은 곳</b>에서 출발해야 꼭대기에서도 운동 에너지가 남아 언덕을 넘을 수 있어요.',
          },
          {
            type: 'quiz',
            title: '진짜 롤러코스터의 비밀',
            goal: '실제 롤러코스터는 보통 <b>첫 번째 언덕이 가장 높고</b>, 뒤로 갈수록 언덕이 낮아져요. 그 까닭으로 가장 알맞은 것은? (‘두 개의 언덕’ 레일로 실험해 봐도 좋아요)',
            setup() { prep({ preset: 'twin', friction: true }); },
            choices: [
              '내려올수록 속력이 계속 쌓이므로 뒤의 언덕은 낮아도 된다',
              '달리는 동안 마찰과 공기 저항으로 역학적 에너지가 줄어들기 때문에, 뒤의 언덕은 처음보다 낮아야 넘을 수 있다',
              '언덕을 지날 때마다 역학적 에너지가 늘어나므로 첫 언덕만 높으면 된다',
              '수레가 무거울수록 높이 올라가므로 언덕 높이는 상관없다',
            ],
            answer: 1,
            feedback: [
              '속력은 위치 에너지가 바뀐 것일 뿐, 언덕을 오르면 다시 줄어들어요. 에너지가 계속 쌓이지는 않아요.',
              '',
              '역학적 에너지는 저절로 늘어나지 않아요. 마찰이 있으면 오히려 줄어들어요.',
              '질량은 올라가는 높이에 영향을 주지 않아요.',
            ],
            explain: '출발할 때 가진 역학적 에너지가 가장 커요. 달리는 동안 마찰과 공기 저항으로 역학적 에너지가 줄어드므로, 뒤의 언덕은 <b>출발 높이보다 낮아야</b> 넘을 수 있어요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  rebuild();
  if (!S.run && S.state === 'ready') resetRun();
  placeHint();
  setTimeout(placeHint, 300);
  setTimeout(hideHint, 6000);
  SciSim.loop((dt, t) => {
    physics(dt);
    updateSparks(dt);
    draw();
    updateReadouts(t);
  });

  // 테스트·디버깅용 (읽기 전용으로 사용)
  window.CoasterDebug = { S, heightAt, slopeAt, energies, game };
})();
