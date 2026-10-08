/* =========================================================
   중3 Ⅳ. 운동과 에너지 - 역학적 에너지 보존  [9과19-04]
   물체의 운동에서 역학적 에너지의 전환과 보존을 이해하고,
   이를 활용하여 일상생활 속 물체의 운동을 예측한다.
   ① 관찰: 진자의 운동(전환) → ② 탐구: 역학적 에너지 보존
   → ③ 확인: 롤러코스터 운동 예측 → ④ 적용: 생활 속 예측
   (공기 저항과 마찰은 무시)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, fmt, Sound, toast } = SciSim;

  /* ---------- 공통 상수 ---------- */
  const G = 9.8;
  // 휴대폰(폭 600px 미만)에서는 에너지 막대를 실험 화면 아래에 가로로 배치하고 글자를 키운다.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 880 : 600;
  const SW = PHONE ? 600 : 576;   // 실험 장면의 폭
  const FS = PHONE ? 1.2 : 1;
  const font = (n, bold) => (bold ? 'bold ' : '') + Math.round(n * FS * 2) / 2 + 'px sans-serif';
  const C = { ep: '#3b82f6', ek: '#f97316', mech: '#8b5cf6', cart: '#f26b3a', good: '#16a34a' };
  const PANEL = PHONE ? { x: 10, y: 610, w: 580, h: 260 } : { x: 578, y: 10, w: 214, h: 580 };
  const SB = { x: 48, y: 490, w: 524, h: 102 };   // 속력계 상자

  /* ---------- 진자 ---------- */
  const LP = 5;                   // 진자 길이 (m)
  const PPP = 56;                 // 1 m = 56 px
  const PIV = { x: SW / 2, y: 58 };
  const BOT = PIV.y + LP * PPP;   // 가장 낮은 곳(기준면)의 y
  const HP_MIN = 0.2, HP_MAX = 2.5;
  const BOB_R = 22;
  const pyP = (h) => BOT - h * PPP;

  /* ---------- 롤러코스터 ---------- */
  const N = 6;                    // 레일 조절점 수
  const DX = 2.2;                 // 조절점 사이 가로 간격 (m)
  const PPM = 40;                 // 1 m = 40 px
  const X0 = 100;                 // 출발점의 x 좌표 (px)
  const GY = 480;                 // 지면(높이 0 m)의 y 좌표
  const XLAST = (N - 1) * DX;
  const XEND = XLAST + 0.45;      // 도착 게이트 (m)
  const KNOB_X = 64;              // 출발 높이 손잡이 x
  const H_TOP = 10;
  const px = (x) => X0 + x * PPM;
  const py = (h) => GY - h * PPM;
  const PRESETS = {
    valley: { name: 'U자 계곡', h: [8, 2, 0, 0, 2, 10] },
    hill: { name: '언덕 넘기', h: [5, 0.5, 2.5, 6, 1, 1] },
    twin: { name: '두 언덕', h: [9, 1, 7, 2, 5, 2] },
  };
  const HILL_IDX = 3;
  const HILL_X = HILL_IDX * DX;

  // 장면별 막대·속력계 눈금
  const SCALE = {
    pend: { E: 125, Et: 25, V: 8, Vt: 2 },
    coaster: { E: 500, Et: 100, V: 15, Vt: 5 },
  };

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'pend',
    m: 2,
    rate: 1,
    state: 'ready',               // ready | running | paused | finished(롤러코스터 도착)
    run: null,                    // 이번 운동 기록
    turns: [],                    // 되돌아온 지점(최고 높이)
    fx: [],
    // 진자
    hp0: 2, side: -1, th: 0, om: 0,
    // 롤러코스터
    preset: 'valley', H: PRESETS.valley.h.slice(), d: new Array(N).fill(0), hMin: 0,
    x: 0, v: 0, Emech: 0, E0: 0,
    bottomLog: [], inLow: false,
    // 미션 표시
    locks: null, flag: null, lowMark: false, speedTarget: null, halfLine: false,
    pulseBob: false, everRan: false,
    drag: -1, dragOff: 0, hover: -1,
  };
  let feat = new Set();
  const on = (f) => feat.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));
  const SC = () => SCALE[S.scene];

  /* ---------- 진자 물리 ---------- */
  const thOf = (h) => Math.acos(clamp(1 - h / LP, -1, 1));
  const pendH = () => LP * (1 - Math.cos(S.th));
  function pendReset() {
    S.th = S.side * thOf(S.hp0); S.om = 0;
  }
  // 각속도는 적분으로 방향을 정하고, 크기는 에너지(½v² = g(h₀−h))로 다시 계산한다.
  // → 역학적 에너지가 정확히 보존되어 처음 높이까지 올라간다.
  function pendSub(dt) {
    const om0 = S.om;
    let om = om0 - (G / LP) * Math.sin(S.th) * dt;
    let th = S.th + om * dt;
    const thMax = thOf(S.hp0);
    if (Math.abs(th) >= thMax) {
      th = Math.sign(th) * thMax;
      if (om0 !== 0) turned({ th });
      S.th = th; S.om = 0;
      return;
    }
    const K = G * (S.hp0 - LP * (1 - Math.cos(th)));
    const sp = Math.sqrt(Math.max(0, 2 * K));
    const dir = om > 0 ? 1 : om < 0 ? -1 : 0;
    if (om0 !== 0 && dir !== 0 && dir !== Math.sign(om0)) turned({ th: S.th });
    S.th = th; S.om = dir * sp / LP;
    trackRun(sp);
  }

  /* ---------- 롤러코스터 레일 (단조 3차 스플라인) ---------- */
  function rebuild() {
    const H = S.H, del = [];
    for (let i = 0; i < N - 1; i++) del.push((H[i + 1] - H[i]) / DX);
    const d = S.d;
    d[0] = 0.3 * del[0];
    d[N - 1] = 0;
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
  // 수레(크기 무시, 레일에 고정)를 가로 위치 x로 추적: 방향은 가속도로, 속력은 에너지로 계산
  function coasterSub(dt) {
    const m = S.m, x = S.x, v0 = S.v;
    const sl = slopeAt(x);
    const cs = 1 / Math.sqrt(1 + sl * sl), sn = sl * cs;
    const v = v0 - G * sn * dt;
    let nx = x + v * cs * dt;
    if (nx < 0) nx = 0;
    if (nx > XEND) nx = XEND;
    const K = S.Emech - m * G * heightAt(nx);
    if (K > 0) {
      const dir = v > 0 ? 1 : v < 0 ? -1 : 0;
      S.x = nx;
      S.v = dir * Math.sqrt((2 * K) / m);
      if (v0 !== 0 && dir !== 0 && dir !== Math.sign(v0)) turned({ x });
    } else {
      if (v0 !== 0) turned({ x });
      S.v = 0;
    }
    trackRun(Math.abs(S.v));
    if (S.x >= XEND - 1e-9 && S.v > 0) finish();
  }

  /* ---------- 운동 제어 ---------- */
  function resetRun() {
    S.state = 'ready';
    S.run = null; S.turns = [];
    S.inLow = false;
    if (S.scene === 'pend') pendReset();
    else { S.x = 0; S.v = 0; S.Emech = S.m * G * S.H[0]; S.E0 = S.Emech; }
    updateRunBtn();
  }
  function startRun() {
    if (S.state === 'running') { S.state = 'paused'; updateRunBtn(); return; }
    if (S.state === 'paused') { S.state = 'running'; updateRunBtn(); return; }
    if (S.state === 'finished') resetRun();
    if (S.scene === 'coaster' && slopeAt(0) >= -1e-9) {
      Sound.fail();
      toast('출발점이 바로 오른쪽 레일보다 높아야 수레가 굴러가요! ↕', 'bad', 2600);
      return;
    }
    if (S.state === 'ready' || !S.run) {
      resetRun();
      S.run = { h0: startH(), t: 0, turns: 0, passedLow: false, lowV: null, maxX: 0, vmax: 0 };
    }
    S.state = 'running';
    S.everRan = true; S.pulseBob = false;
    hideHint();
    updateRunBtn();
  }
  function updateRunBtn() {
    const b = $('#runBtn');
    const go = S.scene === 'pend' ? '▶ 놓기' : '▶ 출발';
    b.innerHTML = S.state === 'running' ? '⏸ 일시정지' : S.state === 'paused' ? '▶ 계속' : S.state === 'finished' ? '▶ 다시 출발' : go;
  }
  function physics(dt) {
    if (S.state !== 'running') return;
    const T = dt * S.rate;
    const n = Math.max(1, Math.ceil(T / 0.001));
    const h = T / n;
    for (let k = 0; k < n && S.state === 'running'; k++) (S.scene === 'pend' ? pendSub : coasterSub)(h);
    if (S.run) S.run.t += T;
  }
  const startH = () => (S.scene === 'pend' ? S.hp0 : S.H[0]);
  const curH = () => (S.scene === 'pend' ? pendH() : heightAt(S.x));
  const lowTol = () => Math.max(0.08, 0.12 * S.hp0);
  function trackRun(sp) {
    const r = S.run;
    if (!r) return;
    if (sp > r.vmax) r.vmax = sp;
    if (S.scene === 'pend') {
      if (pendH() <= lowTol()) { if (!r.passedLow) r.lowT = performance.now(); r.passedLow = true; }
      return;
    }
    if (S.x > r.maxX) r.maxX = S.x;
    const hh = heightAt(S.x);
    if (hh <= S.hMin + 0.02) {
      if (!S.inLow) {
        S.inLow = true;
        if (!r.passedLow) r.lowT = performance.now();
        r.passedLow = true;
        S.bottomLog.push({ m: S.m, h0: r.h0, hLow: S.hMin, v: sp });
        if (S.bottomLog.length > 30) S.bottomLog.shift();
      } else if (S.bottomLog.length && sp > S.bottomLog[S.bottomLog.length - 1].v) S.bottomLog[S.bottomLog.length - 1].v = sp;
      if (r.lowV == null || sp > r.lowV) r.lowV = sp;
    } else if (hh > S.hMin + 0.1) S.inLow = false;
  }
  function turned(p) {
    const h = S.scene === 'pend' ? LP * (1 - Math.cos(p.th)) : heightAt(p.x);
    S.turns.push(Object.assign({ h, t: performance.now() }, p));
    if (S.turns.length > 4) S.turns.shift();
    if (S.run) S.run.turns++;
  }
  function finish() {
    S.x = XEND;
    S.state = 'finished';
    updateRunBtn();
    addFx('🏁 통과!', px(XLAST) - 6, py(S.H[N - 1]) - 62, C.good);
    Sound.success();
  }
  function addFx(text, x, y, color) { S.fx.push({ text, x, y, color, t0: performance.now() }); }

  /* ---------- 에너지 값 (표시용: 합이 맞도록 반올림) ---------- */
  function energies() {
    let h, mech;
    if (S.scene === 'pend') { h = pendH(); mech = S.m * G * S.hp0; }
    else { h = heightAt(S.x); mech = S.Emech; }
    const Ep = S.m * G * h;
    mech = Math.max(Ep, mech);
    const Ek = Math.max(0, mech - Ep);
    const mechR = Math.round(mech), EpR = Math.round(Ep);
    const v = S.scene === 'pend' ? Math.abs(S.om) * LP : Math.abs(S.v);
    return { h, Ep, Ek, mech, EpR, EkR: Math.max(0, mechR - EpR), mechR, E0R: Math.round(S.m * G * startH()), v };
  }

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#ffffff' });
  const ctx = view.ctx;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function haloText(text, x, y, color, f, align) {
    ctx.font = f; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function pill(text, x, y, bg, fg, f, align) {
    ctx.font = f || font(13, 1);
    const w = ctx.measureText(text).width + 18, h = 24 * FS;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = bg; roundRect(x0, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + w / 2, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }
  const isLocked = (i) => !!(S.locks && S.locks.preset === S.preset && S.locks.idx.indexOf(i) >= 0);
  const flagOn = () => !!(S.flag && S.flag.preset === S.preset);
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function newRing(x, y, w, h) {
    const a = pulse();
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + a * 0.55).toFixed(2) + ')'; ctx.lineWidth = 4;
    roundRect(x - 5, y - 5, w + 10, h + 10, 14); ctx.stroke();
    ctx.restore();
    pill('NEW', x + w + 6, y - 6, '#f26b3a', '#fff', font(13, 1), 'right');
  }
  function attentionRing(x, y, r) {
    const a = pulse();
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.3 + a * 0.6).toFixed(2) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, (r || 21) + a * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function heightTag(cx, cy, groundY, h, decimals, gap) {
    if (h < 0.05) return;
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(37,99,235,.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, groundY); ctx.stroke(); ctx.restore();
    const right = cx < SW - 110, label = fmt(h, decimals) + ' m';
    ctx.font = font(14, 1);
    const tw = ctx.measureText(label).width + 12, th = 14 * FS + 8;
    let g = 6, ly = Math.min((cy + groundY) / 2, groundY - th / 2 - 4) - th / 2;
    if (gap) {   // 진자: 기준면 바로 위에 붙이고, 추와 겹치면 옆으로 비킴
      ly = groundY - th - 6;
      if (cy + 6 > ly - 4) g = gap;
    }
    const lx = right ? cx + g : cx - g - tw;
    ctx.fillStyle = 'rgba(255,255,255,.93)'; roundRect(lx, ly, tw, th, th / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(37,99,235,.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1d4ed8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + tw / 2, ly + th / 2 + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  function draw() {
    view.clear('#ffffff');
    if (S.scene === 'pend') drawPend(); else drawCoaster();
    drawFx();
    drawSpeed();
    drawPanel();
  }
  function drawFx() {
    const now = performance.now();
    S.fx = S.fx.filter((f) => now - f.t0 < 1600);
    S.fx.forEach((f) => {
      const p = (now - f.t0) / 1600;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      haloText(f.text, clamp(f.x, 70, SW - 60), f.y - p * 18, f.color, font(19, 1));
      ctx.globalAlpha = 1;
    });
  }

  /* =========================================================
     진자 장면
     ========================================================= */
  function bobPos(th) { return { x: PIV.x + Math.sin(th) * LP * PPP, y: PIV.y + Math.cos(th) * LP * PPP }; }
  function drawPend() {
    // 실험실 벽과 바닥
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, '#eef4fb'); g.addColorStop(1, '#fbfdff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 430);
    ctx.fillStyle = '#dfe6ef'; ctx.fillRect(0, 430, VW, 600 - 430);
    ctx.fillStyle = '#c8d2df'; ctx.fillRect(0, 430, VW, 3);
    // 천장 받침대
    ctx.fillStyle = '#64748b'; roundRect(PIV.x - 150, 26, 300, 16, 6); ctx.fill();
    ctx.fillStyle = '#475569'; roundRect(PIV.x - 14, 38, 28, 22, 4); ctx.fill();

    const th0 = thOf(S.hp0), mech = on('mech');
    // 진자가 지나는 길 (점선 원호)
    ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(PIV.x, PIV.y, LP * PPP, Math.PI / 2 - th0, Math.PI / 2 + th0); ctx.stroke(); ctx.restore();
    // 기준면
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(52,84,128,.45)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(14, BOT); ctx.lineTo(SW - 14, BOT); ctx.stroke(); ctx.restore();
    haloText('기준면 (높이 0 m)', SW - 14, BOT - 8, '#4b5b72', font(13, 1), 'right');
    // 처음 높이 선 (2단계부터)
    if (mech) {
      const y = pyP(S.hp0);
      ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(37,99,235,.6)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(SW - 14, y); ctx.stroke(); ctx.restore();
      haloText('처음 높이 ' + fmt(S.hp0, 2) + ' m', PIV.x, y - 8, '#1d4ed8', font(13, 1));
    }
    if (S.halfLine) {
      const y = pyP(S.hp0 / 2);
      ctx.save(); ctx.setLineDash([9, 6]); ctx.strokeStyle = 'rgba(22,163,74,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(SW - 14, y); ctx.stroke(); ctx.restore();
      haloText('처음 높이의 ½ = ' + fmt(S.hp0 / 2, 2) + ' m (위치 = 운동)', PIV.x, y + 20, C.good, font(13, 1));
    }
    // 가장 낮은 곳 표시
    if (S.lowMark) {
      const a = thOf(lowTol());
      const done = S.run && S.run.passedLow;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = done ? 'rgba(22,163,74,.5)' : 'rgba(22,163,74,' + (0.45 + 0.3 * pulse()).toFixed(2) + ')';
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(PIV.x, PIV.y, LP * PPP, Math.PI / 2 - a, Math.PI / 2 + a); ctx.stroke(); ctx.restore();
      haloText('⬆ 가장 낮은 곳', PIV.x, BOT + 46, C.good, font(15, 1));
    }
    // 되돌아온 지점 (2단계부터)
    if (mech) {
      const now = performance.now();
      S.turns.forEach((tp, k) => {
        if (tp.th == null) return;
        const last = k === S.turns.length - 1, b = bobPos(tp.th);
        ctx.globalAlpha = last ? 1 : 0.4;
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.moveTo(b.x, b.y - BOB_R - 4); ctx.lineTo(b.x - 7, b.y - BOB_R - 14); ctx.lineTo(b.x + 7, b.y - BOB_R - 14); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        if (last && now - tp.t > 100) haloText('최고 ' + fmt(tp.h, 2) + ' m', clamp(b.x, 70, SW - 70), b.y - BOB_R - 20, '#1d4ed8', font(14, 1));
      });
    }
    // 줄과 추
    const b = bobPos(S.th), h = pendH();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(PIV.x, PIV.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(PIV.x, PIV.y, 5, 0, Math.PI * 2); ctx.fill();
    if (h >= 0.25) heightTag(b.x, b.y + BOB_R - 6, BOT, h, 2, BOB_R + 6);
    if ((S.pulseBob || S.state === 'ready' && !S.everRan) && S.drag < 0) attentionRing(b.x, b.y, BOB_R + 6);
    // 속도 화살표 (원의 접선 방향)
    const sp = Math.abs(S.om) * LP;
    if (sp > 0.15) {
      const dir = Math.sign(S.om), tx = Math.cos(S.th) * dir, ty = -Math.sin(S.th) * dir;
      const L = 14 + sp * 7;
      const x1 = b.x + tx * (BOB_R + 4), y1 = b.y + ty * (BOB_R + 4), x2 = x1 + tx * L, y2 = y1 + ty * L;
      ctx.strokeStyle = '#ea580c'; ctx.fillStyle = '#ea580c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - tx * 6, y2 - ty * 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - tx * 12 - ty * 7, y2 - ty * 12 + tx * 7); ctx.lineTo(x2 - tx * 12 + ty * 7, y2 - ty * 12 - tx * 7); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt';
    }
    const active = S.drag === 0 || S.hover === 0;
    const bg = ctx.createRadialGradient(b.x - 6, b.y - 7, 3, b.x, b.y, BOB_R);
    bg.addColorStop(0, active ? '#ffc29f' : '#ffb08a'); bg.addColorStop(1, '#e0552a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, BOB_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b8401c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(13, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.m + ' kg', b.x, b.y + 1);
    ctx.textBaseline = 'alphabetic';
    if (S.state === 'ready' && !S.everRan) haloText('↔ 추를 끌어 올려요', clamp(b.x, 92, SW - 92), b.y - BOB_R - 14, '#c2410c', font(14, 1));
  }

  /* =========================================================
     롤러코스터 장면
     ========================================================= */
  function drawCoaster() {
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#c9e6ff'); g.addColorStop(1, '#f3f9ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, GY);
    cloud(255, 44, 1); cloud(452, 100, 0.75);
    ctx.textBaseline = 'middle';
    for (let h = 0; h <= H_TOP; h++) {
      const y = py(h);
      if (h > 0) {
        ctx.strokeStyle = h % 5 === 0 ? 'rgba(52,84,128,.20)' : 'rgba(52,84,128,.09)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(572, y); ctx.stroke();
      }
      ctx.fillStyle = '#4b5b72'; ctx.font = font(13, h % 5 === 0); ctx.textAlign = 'right';
      ctx.fillText(h + '', 40, y);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#4b5b72'; ctx.font = font(13, 1); ctx.textAlign = 'left';
    ctx.fillText('높이(m)', 6, 56);
    ctx.fillStyle = '#93d27f'; ctx.fillRect(0, GY, VW, 600 - GY);
    ctx.fillStyle = '#6fb85c'; ctx.fillRect(0, GY, VW, 4);
    // 출발 높이 선
    const y0 = py(S.H[0]);
    ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(37,99,235,.6)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(X0 - 2, y0); ctx.lineTo(px(XEND), y0); ctx.stroke(); ctx.restore();
    haloText('출발 높이 ' + fmt(S.H[0], 1) + ' m', X0 + 44, y0 - 8, '#1d4ed8', font(13, 1), 'left');
    drawTrack();
    drawLowMark();
    drawFlag();
    drawCoasterTurns();
    drawHandles();
    drawCart();
    drawGate();
  }
  function cloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 22 * s, y + 4 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 20 * s, y - 6 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawTrack() {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#c3ccda'; ctx.lineWidth = 3;
    for (let X = X0 + 11; X < px(XEND); X += 22) {
      const h = heightAt((X - X0) / PPM);
      if (h < 0.3) continue;
      ctx.beginPath(); ctx.moveTo(X, py(h) + 4); ctx.lineTo(X, GY); ctx.stroke();
    }
    ctx.strokeStyle = '#aab4c4'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(X0, py(S.H[0]) + 4); ctx.lineTo(X0, GY); ctx.stroke();
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
    ctx.save();
    ctx.strokeStyle = done ? 'rgba(22,163,74,.55)' : 'rgba(22,163,74,' + (0.45 + 0.3 * pulse()).toFixed(2) + ')';
    ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = r[0]; x <= r[1] + 1e-6; x += 0.05) {
      const X = px(x), Y = py(heightAt(x));
      if (x === r[0]) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    if (r[1] - r[0] < 0.05) ctx.lineTo(px(r[0]) + 0.5, py(heightAt(r[0])));
    ctx.stroke();
    ctx.restore();
    const cx = clamp(px((r[0] + r[1]) / 2), 130, 520), cy = py(S.hMin);
    haloText(done ? '✓ 가장 낮은 곳 통과!' : '⬇ 가장 낮은 곳', cx, cy - 40, C.good, font(15, 1));
  }
  function drawFlag() {
    if (!flagOn()) return;
    const i = S.flag.idx, x = px(i * DX), y = py(S.H[i]);
    const done = S.run && S.run.maxX > i * DX + 0.15;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 64); ctx.stroke();
    const label = done ? '✓ 언덕 통과!' : '🎯 ' + fmt(S.H[i], 0) + ' m 언덕 넘기';
    ctx.font = font(14, 1);
    const w = ctx.measureText(label).width + 20;
    ctx.fillStyle = done ? C.good : '#e2464b';
    ctx.beginPath();
    ctx.moveTo(x, y - 64); ctx.lineTo(x + w, y - 64); ctx.lineTo(x + w - 8, y - 51); ctx.lineTo(x + w, y - 38); ctx.lineTo(x, y - 38); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 7, y - 50.5);
    ctx.textBaseline = 'alphabetic';
  }
  function drawCoasterTurns() {
    const now = performance.now();
    S.turns.forEach((tp, k) => {
      if (tp.x == null) return;
      const last = k === S.turns.length - 1;
      const X = px(tp.x), Y = py(tp.h);
      ctx.globalAlpha = last ? 1 : 0.45;
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X - 14, Y); ctx.lineTo(X + 14, Y); ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath(); ctx.moveTo(X, Y - 3); ctx.lineTo(X - 6, Y - 12); ctx.lineTo(X + 6, Y - 12); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (last && now - tp.t > 120 && tp.h > S.hMin + 0.6) haloText('최고 ' + fmt(tp.h, 1) + ' m', clamp(X, 120, 540), Y - 19, '#1d4ed8', font(14, 1));
    });
  }
  function handleCircle(x, y, i) {
    const locked = isLocked(i);
    const active = S.drag === i || S.hover === i;
    ctx.beginPath(); ctx.arc(x, y, active ? 16 : 14, 0, Math.PI * 2);
    ctx.fillStyle = locked ? '#e5e7eb' : active ? '#ffe4d6' : '#fff';
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = locked ? '#94a3b8' : C.cart; ctx.stroke();
    ctx.fillStyle = locked ? '#64748b' : '#c2410c';
    ctx.font = locked ? font(13) : font(15, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(locked ? '🔒' : '↕', x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function drawHandles() {
    const y0 = py(S.H[0]);
    ctx.strokeStyle = 'rgba(71,85,105,.22)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(KNOB_X, py(H_TOP)); ctx.lineTo(KNOB_X, py(0.5)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(KNOB_X + 14, y0); ctx.lineTo(X0 - 3, y0); ctx.stroke(); ctx.restore();
    const fresh = isNew('coaster');
    if (fresh) attentionRing(KNOB_X, y0);
    handleCircle(KNOB_X, y0, 0);
    haloText('출발', KNOB_X, y0 + 31 > GY - 4 ? y0 - 22 : y0 + 31, '#c2410c', font(13, 1));
    for (let i = 1; i < N; i++) {
      const x = px(i * DX), y = py(S.H[i]);
      if (fresh) attentionRing(x, y);
      handleCircle(x, y, i);
      if (flagOn() && S.flag.idx === i) continue;
      const t = fmt(S.H[i], 1) + ' m';
      if (i === N - 1) haloText(t, x - 18, y - 17, '#334155', font(13, 1), 'right');
      else haloText(t, x, y - 22, '#334155', font(13, 1));
    }
  }
  function drawCart() {
    if (S.state === 'finished') return;
    const h = heightAt(S.x), sl = slopeAt(S.x);
    const cx = px(S.x), cy = py(h), ang = -Math.atan(sl);
    if (h > 0.7) heightTag(cx, cy, GY, h, 1);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    const sp = Math.abs(S.v);
    if (sp > 0.25) {
      const dir = S.v > 0 ? 1 : -1;
      const L = 8 + sp * 3.4;
      const xa = dir * 24, xb = dir * (24 + L), yy = -16;
      ctx.strokeStyle = '#ea580c'; ctx.fillStyle = '#ea580c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb - dir * 6, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xb, yy); ctx.lineTo(xb - dir * 11, yy - 7); ctx.lineTo(xb - dir * 11, yy + 7); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt';
    }
    ctx.fillStyle = '#1f2937';
    [-12, 12].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -5, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#9ca3af';
    [-12, 12].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -5, 1.8, 0, Math.PI * 2); ctx.fill(); });
    const bg = ctx.createLinearGradient(0, -32, 0, -8);
    bg.addColorStop(0, '#ff9b6b'); bg.addColorStop(1, '#e0552a');
    ctx.fillStyle = bg;
    roundRect(-22, -32, 44, 23, 6); ctx.fill();
    ctx.strokeStyle = '#b8401c'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(13, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(S.m + ' kg', 0, -20);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  function drawGate() {
    const x0 = px(XLAST) + 13, x1 = px(XLAST) + 33, y = py(S.H[N - 1]);
    ctx.fillStyle = 'rgba(30,41,59,.88)';
    ctx.fillRect(x0, y - 36, x1 - x0, 32);
    ctx.fillStyle = '#334155';
    ctx.fillRect(x0 - 2, y - 40, 4, 40); ctx.fillRect(x1 - 2, y - 40, 4, 40);
    const cw = (x1 - x0 + 8) / 6;
    for (let k = 0; k < 6; k++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (k + r) % 2 ? '#111827' : '#ffffff';
        ctx.fillRect(x0 - 4 + k * cw, y - 48 + r * 5, cw, 5);
      }
    }
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 4, y - 48, x1 - x0 + 8, 10);
    haloText('도착', (x0 + x1) / 2, y > 80 ? y - 54 : y + 22, '#111827', font(13, 1));
  }

  /* ---------- 속력계 ---------- */
  function drawSpeed() {
    const B = SB, sc = SC();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    roundRect(B.x, B.y, B.w, B.h, 12); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = font(15, 1); ctx.textAlign = 'left';
    ctx.fillText('🏎️ 속력계', B.x + 14, B.y + 27);
    const sp = energies().v;
    ctx.textAlign = 'right'; ctx.fillStyle = '#c2410c'; ctx.font = font(19, 1);
    ctx.fillText(fmt(sp, 1) + ' m/s', B.x + B.w - 14, B.y + 28);
    const bx = B.x + 18, bw = B.w - 36, by = B.y + 40, bh = 18;
    const vx = (v) => bx + clamp(v / sc.V, 0, 1) * bw;
    ctx.fillStyle = '#e5e9f0'; roundRect(bx, by, bw, bh, 9); ctx.fill();
    if (S.speedTarget && S.scene === 'coaster') {
      const t = S.speedTarget;
      ctx.fillStyle = 'rgba(22,163,74,.35)';
      ctx.fillRect(vx(t.v - t.tol), by - 5, vx(t.v + t.tol) - vx(t.v - t.tol), bh + 10);
      ctx.fillStyle = C.good; ctx.fillRect(vx(t.v) - 1.5, by - 6, 3, bh + 12);
    }
    if (sp > 0.01 && S.state !== 'finished') {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#fdba74'); g.addColorStop(1, '#ea580c');
      ctx.fillStyle = g; roundRect(bx, by, Math.max(bh, vx(sp) - bx), bh, 9); ctx.fill();
    }
    if (S.run && S.run.vmax > 0.05) {
      const mx = vx(S.run.vmax);
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(mx, by - 1); ctx.lineTo(mx - 6, by - 9); ctx.lineTo(mx + 6, by - 9); ctx.closePath(); ctx.fill();
      ctx.font = font(13, 1); ctx.textAlign = 'left';
      ctx.fillText('▼ 최고 ' + fmt(S.run.vmax, 1) + ' m/s', B.x + 14, B.y + B.h - 9);
    }
    ctx.fillStyle = '#5d6879'; ctx.font = font(13); ctx.textAlign = 'center';
    for (let v = 0; v <= sc.V; v += sc.Vt) ctx.fillText(v === sc.V ? v + ' m/s' : v + '', v === sc.V ? vx(v) - 14 : vx(v), by + bh + 19);
  }

  /* ---------- 에너지 막대그래프 ---------- */
  const COLS = [
    { key: 'ep', name: '위치', full: '위치 에너지', color: C.ep, ink: '#1d4ed8' },
    { key: 'ek', name: '운동', full: '운동 에너지', color: C.ek, ink: '#c2410c' },
    { key: 'mech', name: '역학적', full: '역학적 에너지', color: C.mech, ink: '#6d28d9', step: 2 },
  ];
  const colVal = (E, key) => (key === 'ep' ? E.EpR : key === 'ek' ? E.EkR : E.mechR);
  function panelFooter(E) {
    if (on('mech')) return [['역학적 = 위치 + 운동', '#6d28d9'], ['= ' + E.mechR + ' J (언제나 일정)', '#6d28d9']];
    return [['위치 E = 9.8 × 질량 × 높이', '#1d4ed8'], ['운동 E = ½ × 질량 × 속력²', '#c2410c']];
  }
  function drawPanel() {
    if (PHONE) { drawPanelWide(); return; }
    const P = PANEL, sc = SC();
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.font = font(16, 1); ctx.textAlign = 'left';
    ctx.fillText('⚡ 에너지', P.x + 14, P.y + 30);
    ctx.fillStyle = '#5d6879'; ctx.font = font(13, 1); ctx.textAlign = 'right';
    ctx.fillText('단위: J', P.x + P.w - 12, P.y + 30);
    const y0 = P.y + 436, yT = P.y + 70, k = (y0 - yT) / sc.E;
    const by = (e) => y0 - clamp(e, 0, sc.E) * k;
    ctx.font = font(13); ctx.textBaseline = 'middle';
    for (let e = 0; e <= sc.E; e += sc.Et) {
      const y = by(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(P.x + 38, y); ctx.lineTo(P.x + P.w - 8, y); ctx.stroke();
      ctx.fillStyle = '#7b8798'; ctx.textAlign = 'right'; ctx.fillText(e + '', P.x + 34, y);
    }
    ctx.textBaseline = 'alphabetic';
    const E = energies();
    const left = P.x + 42, right = P.x + P.w - 8;
    const step = (right - left) / COLS.length, bw = 32;
    if (on('mech')) {
      const yE0 = by(E.E0R);
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(left - 4, yE0); ctx.lineTo(right, yE0); ctx.stroke(); ctx.restore();
    }
    COLS.forEach((c, i) => {
      const cx = left + step * (i + 0.5), x = cx - bw / 2;
      if (c.step && !on(c.key)) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#d3dae5'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(244,247,251,.9)';
        roundRect(cx - 20, yT, 40, y0 - yT, 10); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#a3adbd'; ctx.textAlign = 'center'; ctx.font = font(18);
        ctx.fillText('🔒', cx, (yT + y0) / 2 - 6);
        ctx.font = font(13, 1); ctx.fillText(c.step + '단계', cx, (yT + y0) / 2 + 20);
        ctx.font = font(14, 1); ctx.fillText(c.name, cx, y0 + 22);
        return;
      }
      const val = colVal(E, c.key);
      if (c.key === 'mech') {
        const yEp = by(E.EpR), yTop = by(E.mechR);
        ctx.fillStyle = C.ep; ctx.fillRect(x, yEp, bw, y0 - yEp);
        ctx.fillStyle = C.ek; ctx.fillRect(x, yTop, bw, yEp - yTop);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, yTop - 1.5, bw + 3, y0 - yTop + 1.5);
      } else {
        const yTop = by(val);
        ctx.fillStyle = c.color; ctx.fillRect(x, yTop, bw, y0 - yTop);
      }
      haloText(val + '', cx, by(val) - (c.key === 'mech' ? 9 : 6), c.ink, font(15, 1));
      ctx.fillStyle = c.ink; ctx.font = font(14, 1); ctx.textAlign = 'center';
      ctx.fillText(c.name, cx, y0 + 22);
      if (c.step && isNew(c.key)) newRing(cx - 22, yT - 2, 44, y0 - yT + 32);
    });
    const ly = y0 + 54;
    if (on('mech')) {
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(P.x + 14, ly - 5); ctx.lineTo(P.x + 38, ly - 5); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#475569'; ctx.font = font(13); ctx.textAlign = 'left';
      ctx.fillText('처음 에너지 ' + E.E0R + ' J', P.x + 44, ly);
    }
    const ft = panelFooter(E);
    ctx.textAlign = 'center';
    ft.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.font = font(13, 1); ctx.fillText(l[0], P.x + P.w / 2, ly + 32 + i * 22); });
  }
  // 휴대폰용: 장면 아래 가로 막대그래프
  function drawPanelWide() {
    const P = PANEL, sc = SC();
    ctx.fillStyle = '#ffffff';
    roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
    ctx.strokeStyle = '#d5dde9'; ctx.lineWidth = 1.5; ctx.stroke();
    const E = energies();
    ctx.fillStyle = '#1b2333'; ctx.font = font(15, 1); ctx.textAlign = 'left';
    ctx.fillText('⚡ 에너지 (J)', P.x + 14, P.y + 30);
    if (on('mech')) {
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(P.x + P.w - 232, P.y + 24); ctx.lineTo(P.x + P.w - 208, P.y + 24); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#475569'; ctx.font = font(13); ctx.textAlign = 'left';
      ctx.fillText('처음 에너지 ' + E.E0R + ' J', P.x + P.w - 200, P.y + 30);
    }
    const bx0 = P.x + 132, bx1 = P.x + P.w - 22;
    const k = (bx1 - bx0) / sc.E;
    const bx = (e) => bx0 + clamp(e, 0, sc.E) * k;
    const top = P.y + 48, bottom = P.y + 200;
    ctx.font = font(13); ctx.textAlign = 'center';
    for (let e = 0; e <= sc.E; e += sc.Et) {
      const x = bx(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.fillStyle = '#7b8798'; ctx.fillText(e + '', x, bottom + 20);
    }
    if (on('mech')) {
      const xE0 = bx(E.E0R);
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(xE0, top); ctx.lineTo(xE0, bottom); ctx.stroke(); ctx.restore();
    }
    const rowH = (bottom - top) / COLS.length, bh = 26;
    COLS.forEach((r, i) => {
      const cy = top + rowH * (i + 0.5), y = cy - bh / 2;
      ctx.textBaseline = 'middle';
      if (r.step && !on(r.key)) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#d3dae5'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(244,247,251,.9)';
        roundRect(bx0, y, bx1 - bx0, bh, 8); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#a3adbd'; ctx.font = font(13, 1); ctx.textAlign = 'center';
        ctx.fillText('🔒 ' + r.step + '단계에서 열려요', (bx0 + bx1) / 2, cy + 1);
        ctx.textAlign = 'right'; ctx.fillText(r.full, bx0 - 8, cy);
        ctx.textBaseline = 'alphabetic';
        return;
      }
      const val = colVal(E, r.key);
      if (r.key === 'mech') {
        ctx.fillStyle = C.ep; ctx.fillRect(bx0, y, bx(E.EpR) - bx0, bh);
        ctx.fillStyle = C.ek; ctx.fillRect(bx(E.EpR), y, bx(E.mechR) - bx(E.EpR), bh);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(bx0, y - 1.5, bx(E.mechR) - bx0 + 1.5, bh + 3);
      } else {
        ctx.fillStyle = r.color; ctx.fillRect(bx0, y, bx(val) - bx0, bh);
      }
      ctx.fillStyle = r.ink; ctx.font = font(13, 1); ctx.textAlign = 'right';
      ctx.fillText(r.full, bx0 - 8, cy);
      const vx = bx(val);
      if (vx > bx1 - 50) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(val + '', vx - 6, cy); }
      else haloText(val + '', vx + (r.key === 'mech' ? 8 : 6), cy + 5, r.ink, font(13, 1), 'left');
      ctx.textBaseline = 'alphabetic';
      if (r.step && isNew(r.key)) newRing(bx0 - 4, y - 2, bx1 - bx0 + 8, bh + 4);
    });
    const ft = panelFooter(E);
    ctx.textAlign = 'center'; ctx.font = font(13, 1); ctx.fillStyle = ft[0][1];
    ctx.fillText(ft[0][0] + ' ' + ft[1][0], P.x + P.w / 2, P.y + P.h - 14);
  }

  /* ---------- 입력: 끌기 ---------- */
  const hitR = () => Math.max(28, 24 / (view.scale || 1));
  function hitHandle(p) {
    if (S.scene === 'pend') {
      const b = bobPos(S.th);
      return Math.hypot(p.x - b.x, p.y - b.y) < Math.max(BOB_R + 12, hitR()) ? 0 : -1;
    }
    if (!on('coaster')) return -1;
    let best = -1, bd = hitR();
    for (let i = 0; i < N; i++) {
      const hp = i === 0 ? { x: KNOB_X, y: py(S.H[0]) } : { x: px(i * DX), y: py(S.H[i]) };
      const dd = Math.hypot(p.x - hp.x, p.y - hp.y);
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best < 0) {
      const cx = px(0), cy = py(S.H[0]);
      if (Math.abs(p.x - cx) < 28 && p.y > cy - 44 && p.y < cy + 18 && S.state === 'ready') best = 0;
    }
    return best;
  }
  function setPendFromPoint(p) {
    let th = Math.atan2(p.x - PIV.x, p.y - PIV.y);
    const tmax = thOf(HP_MAX), tmin = thOf(HP_MIN);
    if (Math.abs(th) > Math.PI / 2) th = Math.sign(th) * tmax;
    th = Math.sign(th || -1) * clamp(Math.abs(th), tmin, tmax);
    S.side = th < 0 ? -1 : 1;
    setStartH(Math.round(LP * (1 - Math.cos(th)) * 20) / 20);
  }
  function setStartH(h) {
    if (S.scene === 'pend') {
      h = clamp(Math.round(h * 20) / 20, HP_MIN, HP_MAX);
      S.hp0 = h; rangeH.set(h);
      resetRun();
      return;
    }
    setHeight(0, h);
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
      return isLocked(i) ? 'not-allowed' : S.scene === 'pend' ? 'grab' : 'ns-resize';
    },
    down(p) {
      const i = hitHandle(p);
      if (i < 0) return false;
      if (S.scene === 'coaster' && isLocked(i)) {
        Sound.fail();
        toast('🔒 이 미션에서는 이 지점의 높이를 바꿀 수 없어요.', 'bad');
        return false;
      }
      S.drag = i;
      S.dragOff = S.scene === 'pend' ? 0 : p.y - py(S.H[i]);
      S.pulseBob = false;
      hideHint();
      Sound.tick();
      return true;
    },
    move(p) {
      if (S.drag < 0) return;
      if (S.scene === 'pend') setPendFromPoint(p);
      else setHeight(S.drag, (GY - (p.y - S.dragOff)) / PPM);
    },
    up() { S.drag = -1; S.hover = -1; },
  });
  view.canvas.addEventListener('pointerleave', () => { if (S.drag < 0) S.hover = -1; });

  /* ---------- 입력: 버튼과 슬라이더 ---------- */
  const sH = $('#sH');
  const rangeH = SciSim.bindRange(sH, $('#oH'), (v) => fmt(v, S.scene === 'pend' ? 2 : 1) + ' m', (v) => { hideHint(); S.pulseBob = false; setStartH(v); });
  const rangeM = SciSim.bindRange($('#sM'), $('#oM'), (v) => v + ' kg', (v) => setMass(v));
  function setMass(v) {
    v = clamp(Math.round(v), 1, 5);
    if (v !== S.m) {
      // 질량이 바뀌어도 운동(속력)은 그대로, 에너지는 질량에 비례해 바뀜
      const k = v / S.m;
      S.Emech *= k; S.E0 *= k;
      S.m = v;
    }
    rangeM.set(v);
  }
  $('#runBtn').addEventListener('click', () => { Sound.click(); startRun(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetRun(); });
  function markPreset() { $$('#presetSeg button').forEach((b) => b.classList.toggle('on', b.dataset.preset === S.preset)); }
  function setPreset(key) {
    S.preset = key;
    S.H = PRESETS[key].h.slice();
    markPreset();
    rebuild();
    resetRun();
    if (S.scene === 'coaster') rangeH.set(S.H[0]);
  }
  $$('#presetSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setPreset(b.dataset.preset); }));
  function setRate(r) {
    S.rate = r;
    $$('#rateSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.rate === r));
  }
  $$('#rateSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setRate(+b.dataset.rate); }));
  function setScene(sc) {
    S.scene = sc;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    $('#presetRow').hidden = !(sc === 'coaster' && on('coaster'));
    if (sc === 'pend') { sH.min = HP_MIN; sH.max = HP_MAX; sH.step = 0.05; }
    else { sH.min = 0.5; sH.max = H_TOP; sH.step = 0.1; }
    $('#sHLabel').textContent = sc === 'pend' ? '🚩 처음 높이 (추)' : '🚩 출발 높이 (수레)';
    rangeH.set(startH());
    resetRun();
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ---------- 측정값 ---------- */
  const rH = $('#rH'), rV = $('#rV'), rEp = $('#rEp'), rEk = $('#rEk'), rMech = $('#rMech');
  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.08) return;
    lastUI = t;
    const E = energies();
    rH.innerHTML = fmt(E.h, S.scene === 'pend' ? 2 : 1) + '<small>m</small>';
    rV.innerHTML = fmt(E.v, 1) + '<small>m/s</small>';
    rEp.innerHTML = E.EpR + '<small>J</small>';
    rEk.innerHTML = E.EkR + '<small>J</small>';
    rMech.innerHTML = E.mechR + '<small>J</small>';
  }

  /* ---------- 미션 도우미 ---------- */
  function clearMarks() {
    S.locks = null; S.flag = null; S.lowMark = false; S.speedTarget = null; S.halfLine = false; S.pulseBob = false;
  }
  function prepPend(o) {
    if (S.scene !== 'pend') setScene('pend');
    if (o.mass != null) setMass(o.mass);
    if (o.rate != null) setRate(o.rate);
    S.side = -1; S.hp0 = o.h0 != null ? o.h0 : 2; rangeH.set(S.hp0);
    resetRun();
  }
  function prepCoaster(o) {
    if (S.scene !== 'coaster') setScene('coaster');
    setPreset(o.preset || 'valley');
    if (o.h0 != null) { S.H[0] = o.h0; rebuild(); rangeH.set(o.h0); }
    if (o.mass != null) setMass(o.mass);
    if (o.rate != null) setRate(o.rate);
    resetRun();
  }
  const f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);
  const hillPassed = () => !!(S.run && S.run.maxX > HILL_X + 0.15);
  function hillStatus() {
    if (S.scene !== 'coaster' || S.preset !== 'hill') return '🎢 롤러코스터의 <b>언덕 넘기</b> 레일에서 해 보세요.';
    let s = '출발 높이 <b>' + f1(S.H[0]) + ' m</b> · 언덕 꼭대기 <b>' + f1(S.H[HILL_IDX]) + ' m</b>';
    if (S.run && S.run.turns > 0 && !hillPassed()) {
      const tp = S.turns[S.turns.length - 1];
      s += '<br>↩ 언덕을 넘지 못하고 되돌아왔어요' + (tp ? ' (최고 ' + f1(tp.h) + ' m)' : '');
    } else if (S.run && S.state === 'running') s += '<br>🎢 달리는 중… 속력 <b>' + f1(Math.abs(S.v)) + ' m/s</b>';
    return s;
  }
  const pendStatus = () => {
    const E = energies();
    return '높이 <b>' + f2(E.h) + ' m</b> · 위치 <b>' + E.EpR + ' J</b> · 운동 <b>' + E.EkR + ' J</b>';
  };
  const halfOk = () => { const E = energies(); return E.mech > 1 && Math.abs(E.Ep - E.Ek) <= 0.12 * E.mech; };
  const lowOk = () => S.scene === 'pend' && pendH() <= lowTol();

  game = SciSim.game({
    simId: 'm3-energy-coaster',
    mount: '#game',
    badge: '에너지 예측왕',
    homeHref: '../../index.html#g3',
    featureLabels: {
      swing: '🕰️ 진자 (추 끌기 · ▶ 놓기)',
      ep: '🔵 위치 에너지 막대',
      ek: '🟠 운동 에너지 막대',
      slow: '🐢 느린 재생',
      mech: '🟣 역학적 에너지 막대 · 처음 높이 선',
      coaster: '🎢 롤러코스터 (레일 모양 · 손잡이)',
      mass: '⚖️ 질량 조절',
    },
    onFeatures(set) {
      feat = set;
      if (!set.has('coaster') && S.scene === 'coaster') setScene('pend');
      $('#presetRow').hidden = !(set.has('coaster') && S.scene === 'coaster');
      if (!set.has('slow') && S.rate !== 1) setRate(1);
    },
    onMissionStart() { clearMarks(); },
    onHint(m) { if (m.onHint) m.onHint(); },
    levels: [
      /* ---------------- 1단계 ---------------- */
      {
        title: '진자의 운동과 에너지 전환', short: '전환', icon: '🕰️', phase: '관찰',
        features: ['swing', 'ep', 'ek', 'slow'],
        intro: '<p>🤔 <b>탐구 질문</b> — 그네처럼 왔다 갔다 하는 진자는 높이와 빠르기가 계속 바뀌어요. 이때 에너지는 어떻게 될까?</p>' +
          '<p>추를 옆으로 끌어 올렸다가 놓고, <b>위치 에너지</b>와 <b>운동 에너지</b> 막대를 관찰해 봐요. (공기 저항은 무시해요)</p>',
        setup() { clearMarks(); prepPend({ h0: 2, mass: 2, rate: 1 }); S.pulseBob = true; showHint('추를 옆으로 끌어 올린 뒤 ▶ 놓기를 눌러 보세요', 6000); },
        recap: '진자가 내려갈 때는 위치 에너지가 운동 에너지로, 올라갈 때는 운동 에너지가 위치 에너지로 <b>전환</b>돼요.',
        summary: '<ul><li><b>역학적 에너지 전환</b>: 위치 에너지와 운동 에너지가 서로 바뀌는 것</li>' +
          '<li>내려갈 때: 위치 에너지 → 운동 에너지 (빨라짐) / 올라갈 때: 운동 에너지 → 위치 에너지 (느려짐)</li>' +
          '<li>가장 높은 곳: 위치 에너지 최대, 운동 에너지 0 / 가장 낮은 곳: 위치 에너지 최소, 운동 에너지 최대</li></ul>' +
          '<span class="formula">위치 에너지 = 9.8 × 질량 × 높이<br>운동 에너지 = ½ × 질량 × 속력²</span>',
        missions: [
          {
            title: '진자를 놓아 보자',
            goal: '추를 끌어 올린 뒤 <b>▶ 놓기</b>를 눌러, 진자가 반대편에 갔다가 <b>돌아올 때까지</b> 두 막대를 관찰하세요.',
            hint: '주황색 추를 손가락으로 옆으로 끌어 올리거나, 그대로 위쪽의 ▶ 놓기를 눌러요.',
            setup() { prepPend({ h0: 2 }); S.pulseBob = true; },
            check: () => S.scene === 'pend' && !!S.run && S.run.turns >= 2,
            hold: 0.3,
            status: () => (!S.run ? '▶ <b>놓기</b>를 눌러 보세요.' : pendStatus() + '<br>되돌아온 횟수 <b>' + Math.min(2, S.run.turns) + ' / 2</b>'),
            explain: '추가 내려갈 때는 높이가 낮아져 <b>위치 에너지가 운동 에너지로</b>, 올라갈 때는 <b>운동 에너지가 위치 에너지로</b> 바뀌어요. 이것을 <b>역학적 에너지 전환</b>이라고 해요.',
          },
          {
            title: '가장 낮은 곳에서 멈추기',
            goal: '추가 초록색 <b>가장 낮은 곳</b>을 지나는 순간 <b>⏸ 일시정지</b>를 눌러 두 막대를 확인하세요.',
            hint: '오른쪽 🐢 재생 속도를 0.25×로 바꾸면 쉬워요. 놓쳤다면 ▶ 계속을 눌러 다시 노려요.',
            setup() { prepPend({ h0: 2 }); S.lowMark = true; },
            check: () => S.state === 'paused' && lowOk(),
            hold: 0.5,
            status: () => {
              if (!S.run) return '▶ <b>놓기</b>를 누른 뒤, 가장 낮은 곳에서 <b>⏸</b>!';
              let s = pendStatus();
              if (S.state === 'paused' && !lowOk()) s += '<br>⏸ 아직 가장 낮은 곳이 아니에요. <b>▶ 계속</b>을 눌러 다시 노려요!';
              return s;
            },
            explain: '가장 낮은 곳에서는 높이가 0이라 <b>위치 에너지가 최소(0)</b>이고, 처음 위치 에너지가 모두 운동 에너지로 바뀌어 <b>운동 에너지가 최대</b>예요. 그래서 속력도 가장 빨라요.',
          },
          {
            type: 'quiz',
            title: '가장 높은 곳에서는?',
            goal: '진자의 추가 <b>양 끝(가장 높은 곳)</b>에 있는 순간에 대한 설명으로 옳은 것은?',
            choices: [
              '속력이 가장 빠르다',
              '위치 에너지가 최대이고, 운동 에너지는 0이다',
              '운동 에너지가 최대이다',
              '위치 에너지와 운동 에너지가 모두 0이다',
            ],
            answer: 1,
            feedback: [
              '양 끝에서 추는 방향을 바꾸며 순간 멈춰요. 속력계를 확인해 보세요!',
              '',
              '운동 에너지가 최대인 곳은 가장 낮은 곳이었어요.',
              '가장 높은 곳이니 위치 에너지는 오히려 가장 커요.',
            ],
            explain: '양 끝에서 추는 순간 멈추므로 <b>운동 에너지 = 0</b>이고, 높이가 가장 높아 <b>위치 에너지가 최대</b>예요.',
          },
        ],
      },
      /* ---------------- 2단계 ---------------- */
      {
        title: '역학적 에너지 보존', short: '보존', icon: '🔄', phase: '탐구',
        features: ['mech'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 진자가 움직이는 동안 위치 에너지와 운동 에너지가 서로 바뀌는 것을 봤어요.</div>' +
          '<p>그렇다면 두 에너지를 <b>더한 값</b>은 어떻게 될까요? 위치 에너지와 운동 에너지의 합인 <b>역학적 에너지</b> 막대로 탐구해 봐요.</p>',
        setup() { clearMarks(); prepPend({ h0: 2, mass: 2, rate: 1 }); showHint('🟣 역학적 에너지 막대를 지켜보며 놓아 보세요', 6000); },
        recap: '공기 저항과 마찰이 없으면 <b>역학적 에너지(위치 + 운동)는 항상 일정</b>하게 보존돼요.',
        summary: '<ul><li><b>역학적 에너지</b> = 위치 에너지 + 운동 에너지</li>' +
          '<li>공기 저항이나 마찰이 없으면 역학적 에너지는 <b>일정하게 보존</b>된다. → 감소한 위치 에너지 = 증가한 운동 에너지</li>' +
          '<li>처음 높이의 ½을 지날 때 위치 에너지 = 운동 에너지</li>' +
          '<li>반대편에서는 <b>처음과 같은 높이</b>까지 올라간다.</li></ul>' +
          '<span class="formula">위치 에너지 + 운동 에너지 = 일정<br>(역학적 에너지 보존 법칙)</span>',
        missions: [
          {
            title: '두 에너지가 같아지는 순간',
            goal: '진자를 놓은 뒤, <b>위치 에너지</b>와 <b>운동 에너지</b> 막대의 길이가 <b>같아지는 순간</b>에 <b>⏸ 일시정지</b>를 누르세요.',
            hint: '역학적 에너지는 일정하니, 두 에너지가 같아지는 곳은 위치 에너지가 처음의 절반인 <b>처음 높이의 ½</b>이에요. 화면에 초록 선으로 표시해 둘게요! (🐢 느린 재생도 써 보세요)',
            onHint() { S.halfLine = true; },
            setup() { prepPend({ h0: 2 }); },
            check: () => S.state === 'paused' && S.scene === 'pend' && halfOk(),
            hold: 0.5,
            status: () => {
              if (!S.run) return '▶ <b>놓기</b>를 누른 뒤, 두 막대가 같아질 때 <b>⏸</b>!';
              let s = pendStatus();
              if (S.state === 'paused' && !halfOk()) s += '<br>⏸ 아직 두 막대의 차이가 커요. <b>▶ 계속</b>을 눌러 다시 노려요!';
              return s;
            },
            explain: '처음 높이 2 m의 절반인 <b>1 m</b>쯤에서 위치 에너지와 운동 에너지가 약 20 J로 같아요. 줄어든 위치 에너지만큼 운동 에너지가 늘어나서 <b>두 에너지의 합(39 J)은 언제나 그대로</b>예요.',
          },
          {
            type: 'quiz',
            title: '반대편으로 얼마나 높이?',
            goal: '추를 높이 <b>1.5 m</b>에서 놓으면, 반대편에서 최대 몇 m 높이까지 올라갈까요? (직접 실험해 봐도 좋아요!)',
            setup() { prepPend({ h0: 1.5 }); },
            choices: [
              '0.75 m (처음 높이의 절반)',
              '1.5 m (처음과 같은 높이)',
              '1.5 m보다 높이 (내려오며 속력이 붙어서)',
              '추가 무거울수록 더 높이 올라간다',
            ],
            answer: 1,
            feedback: [
              '내려오는 동안 에너지가 절반으로 줄어드는 게 아니에요. 보라색 역학적 에너지 막대를 보세요.',
              '',
              '내려오며 생긴 운동 에너지는 원래 위치 에너지가 바뀐 것이에요. 처음 에너지보다 많아질 수 없어요.',
              '질량이 커지면 에너지도 함께 커져서 올라가는 높이는 같아요.',
            ],
            explain: '역학적 에너지가 보존되므로, 운동 에너지가 모두 위치 에너지로 바뀌는 반대편 끝에서 <b>처음과 같은 높이(1.5 m)</b>까지 올라가요. 파란 ‘처음 높이’ 선으로 확인해 보세요.',
          },
          {
            type: 'quiz',
            title: '보존으로 계산하기',
            goal: '처음 위치 에너지가 <b>40 J</b>인 진자의 추가 위치 에너지 <b>15 J</b>인 높이를 지나고 있어요. 이때 운동 에너지는? (공기 저항 무시)',
            choices: ['15 J', '25 J', '40 J', '55 J'],
            answer: 1,
            feedback: [
              '그건 그 순간의 위치 에너지예요. 역학적 에너지(40 J)에서 빼 보세요.',
              '',
              '40 J은 역학적 에너지 전체예요. 아직 위치 에너지 15 J이 남아 있어요.',
              '역학적 에너지는 늘어나지 않아요! 40 + 15를 한 것 같아요.',
            ],
            explain: '역학적 에너지 = 위치 + 운동 = 40 J로 일정 → 운동 에너지 = 40 − 15 = <b>25 J</b>. 감소한 위치 에너지(25 J)만큼 운동 에너지가 늘었어요.',
          },
        ],
      },
      /* ---------------- 3단계 ---------------- */
      {
        title: '롤러코스터 운동 예측', short: '예측', icon: '🎢', phase: '예측',
        features: ['coaster'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 역학적 에너지가 보존되어 진자가 처음 높이까지 다시 올라가는 것을 확인했어요.</div>' +
          '<p>롤러코스터도 마찬가지예요! 역학적 에너지 보존을 이용해 수레의 운동을 <b>먼저 예측</b>하고, 출발시켜 <b>확인</b>해 봐요.</p>',
        setup() { clearMarks(); prepCoaster({ preset: 'valley', h0: 8, mass: 2, rate: 1 }); showHint('🎢 롤러코스터로 바뀌었어요. ▶ 출발해 보세요', 6000); },
        recap: '역학적 에너지 보존을 이용하면 수레가 언덕을 넘을지, 얼마나 빨라질지 <b>미리 예측</b>할 수 있어요.',
        summary: '<ul><li>역학적 에너지가 보존되므로 수레는 <b>출발 높이보다 높은</b> 곳까지 올라갈 수 없다. → 출발 높이보다 낮은 언덕만 넘는다.</li>' +
          '<li>정지 상태에서 출발해 높이 차 h만큼 내려오면 9.8 × 질량 × h = ½ × 질량 × 속력²</li>' +
          '<li>질량이 약분되므로 속력은 <b>높이 차로만</b> 정해진다. (예: 10 m → 14 m/s)</li></ul>' +
          '<span class="formula">9.8 × 높이 차 = ½ × 속력²</span>',
        missions: [
          {
            type: 'quiz',
            title: '언덕을 넘을 수 있을까?',
            goal: '출발 높이 <b>5 m</b>에서 정지 상태로 출발한 수레가 <b>6 m 언덕</b>을 넘을 수 있을지 예측해 보세요. (▶ 출발로 확인해도 좋아요)',
            setup() {
              prepCoaster({ preset: 'hill', h0: 5 });
              S.locks = { preset: 'hill', idx: [HILL_IDX] };
              S.flag = { preset: 'hill', idx: HILL_IDX };
            },
            choices: [
              '내려오며 속력이 붙으므로 넘는다',
              '5 m 높이까지만 올라가고 되돌아온다',
              '언덕 꼭대기(6 m)에서 딱 멈춘다',
              '수레가 무거우면 넘을 수 있다',
            ],
            answer: 1,
            feedback: [
              '속력은 위치 에너지가 바뀐 것일 뿐이에요. 처음 역학적 에너지로는 5 m까지만 올라갈 수 있어요.',
              '',
              '6 m까지 올라가려면 처음보다 더 많은 위치 에너지가 필요해요.',
              '질량이 커지면 에너지도 함께 커져서 올라가는 높이는 같아요.',
            ],
            explain: '역학적 에너지가 보존되므로 수레는 <b>출발 높이(5 m)보다 높이 올라갈 수 없어요</b>. 5 m에서 운동 에너지가 0이 되어 되돌아와요. ▶ 출발해서 확인해 보세요!',
          },
          {
            title: '6 m 언덕을 넘어라!',
            goal: '출발 높이를 바꿔서 수레가 깃발이 꽂힌 <b>6 m 언덕</b>을 넘어가게 하세요.',
            hint: '출발 손잡이(주황 ↕)를 끌거나 🚩 출발 높이 슬라이더로 출발점을 6 m보다 높게 올려요.',
            setup() {
              prepCoaster({ preset: 'hill', h0: 5 });
              S.locks = { preset: 'hill', idx: [HILL_IDX] };
              S.flag = { preset: 'hill', idx: HILL_IDX };
            },
            check: () => S.scene === 'coaster' && S.preset === 'hill' && hillPassed() && S.H[HILL_IDX] >= 5.95,
            hold: 0.3,
            status: () => hillStatus(),
            explain: '출발 높이가 6 m보다 높아야 언덕 꼭대기에서도 <b>운동 에너지가 남아</b> 언덕을 넘을 수 있어요.',
          },
          {
            title: '속력 14 m/s 예측하기',
            goal: '가장 낮은 곳(0 m)을 지날 때 속력이 <b>14 m/s</b>가 되는 출발 높이를 <b>계산으로 예측</b>한 뒤 출발시키세요.',
            hint: '9.8 × 높이 = ½ × 14² = 98 → 높이 = ? (질량은 양쪽에서 약분돼요)',
            setup() {
              prepCoaster({ preset: 'valley', h0: 6 });
              S.locks = { preset: 'valley', idx: [2, 3] };
              S.speedTarget = { v: 14, tol: 0.3 };
              S.lowMark = true;
            },
            check: () => !!(S.scene === 'coaster' && S.run && S.run.passedLow && S.hMin <= 0.01 && S.run.lowV != null && Math.abs(S.run.lowV - 14) <= 0.3),
            hold: 0.3,
            status: () => {
              if (S.scene !== 'coaster' || S.hMin > 0.01) return '🎢 바닥이 0 m인 <b>U자 계곡</b> 레일에서 해 보세요.';
              let s = '출발 높이 <b>' + f1(S.H[0]) + ' m</b>';
              if (S.run && S.run.lowV != null) s += ' · 가장 낮은 곳의 속력 <b>' + f1(S.run.lowV) + ' m/s</b>' + (Math.abs(S.run.lowV - 14) > 0.3 ? (S.run.lowV < 14 ? ' (더 빨라야 해요)' : ' (너무 빨라요)') : ' 🎯');
              return s;
            },
            explain: '9.8 × h = ½ × 14² = 98 → <b>h = 10 m</b>. 10 m 높이의 위치 에너지가 모두 운동 에너지로 바뀌면 속력이 14 m/s가 돼요. 질량은 계산에 필요 없었어요!',
          },
        ],
      },
      /* ---------------- 4단계 ---------------- */
      {
        title: '생활 속 운동 예측', short: '적용', icon: '🏠', phase: '적용',
        features: ['mass'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 역학적 에너지 보존으로 롤러코스터의 운동을 예측했어요.</div>' +
          '<p>그네, 자이로드롭처럼 생활 속 물체의 운동도 같은 방법으로 예측할 수 있어요. <b>⚖️ 질량</b>을 바꿔 가며 직접 확인해 봐요.</p>',
        setup() { clearMarks(); prepPend({ h0: 2, mass: 2, rate: 1 }); showHint('⚖️ 질량을 바꿔도 속력계 값이 달라질까요?', 6000); },
        recap: '역학적 에너지 보존을 이용하면 그네나 놀이 기구처럼 <b>생활 속 물체의 운동</b>을 예측할 수 있어요. 질량은 속력에 영향을 주지 않아요.',
        summary: '<ul><li>그네·바이킹: 처음 높이까지 올라가고, 가장 낮은 곳에서 가장 빠르다. 타는 사람의 질량과 관계없이 속력이 같다.</li>' +
          '<li>자이로드롭(자유 낙하): 내려온 높이만큼의 위치 에너지가 운동 에너지로 바뀐다.</li></ul>' +
          '<p class="note">실제로는 공기 저항과 마찰 때문에 역학적 에너지가 조금씩 줄어들어, 그네가 점점 낮게 올라가요.</p>',
        missions: [
          {
            type: 'quiz',
            title: '그네의 속력',
            goal: '몸무게가 다른 두 친구가 <b>같은 높이</b>에서 그네를 타기 시작했어요. 가장 낮은 곳을 지날 때의 속력은? (마찰 무시)',
            choices: [
              '무거운 친구가 더 빠르다',
              '가벼운 친구가 더 빠르다',
              '두 친구의 속력이 같다',
              '무거운 친구는 반대편에서 더 높이 올라간다',
            ],
            answer: 2,
            feedback: [
              '무거우면 위치 에너지가 크지만, 움직여야 할 질량도 커요. ⚖️ 질량을 바꿔 속력계를 확인해 보세요!',
              '가벼우면 에너지도 작아요. ⚖️ 질량을 바꿔 속력계를 확인해 보세요.',
              '',
              '올라가는 높이는 질량과 관계없이 처음 높이와 같아요.',
            ],
            explain: '위치 에너지(9.8<i>mh</i>)와 운동 에너지(½<i>mv</i>²)가 모두 질량에 비례해 질량이 약분되므로, 속력은 <b>높이로만</b> 정해져요. 질량을 바꿔도 속력계 값은 같아요.',
          },
          {
            type: 'quiz',
            title: '자이로드롭',
            goal: '자이로드롭이 높이 <b>40 m</b>에서 정지 상태로 떨어지기 시작했어요. 높이 <b>10 m</b>를 지날 때 위치 에너지 : 운동 에너지는? (공기 저항 무시)',
            choices: ['1 : 1', '1 : 3', '3 : 1', '1 : 4'],
            answer: 1,
            feedback: [
              '1 : 1이 되는 곳은 처음 높이의 절반인 20 m예요.',
              '',
              '거꾸로예요. 10 m까지 내려오면 남은 위치 에너지보다 운동 에너지가 더 커요.',
              '운동 에너지는 감소한 위치 에너지(40 m → 10 m, 30 m만큼)와 같아요.',
            ],
            explain: '위치 에너지는 높이에 비례해요. 40 m에서의 역학적 에너지를 4로 보면, 10 m에서 위치 에너지는 1이고 줄어든 3만큼이 운동 에너지 → <b>1 : 3</b>이에요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  rebuild();
  if (!S.run && S.state === 'ready') resetRun();
  SciSim.loop((dt, t) => {
    physics(dt);
    draw();
    updateReadouts(t);
  });

  // 테스트·디버깅용 (읽기 전용으로 사용)
  window.CoasterDebug = { S, heightAt, slopeAt, energies, bobPos, get game() { return game; }, VW, VH, PIV, LP, PPP, BOT };
})();
