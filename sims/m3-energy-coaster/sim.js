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
  const SB = { x: 48, y: 504, w: 524, h: 86 };   // 속력계 상자

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
    // 화면 효과용 (부드럽게 따라가는 값)
    Hd: PRESETS.valley.h.slice(), dd: new Array(N).fill(0),
    thd: 0, omd: 0, xd: 0, spd: 0, wheel: 0, liftK: 0, mechA: 0, sf: 1, finT: null,
    Ed: { ep: 0, ek: 0, e0: 0 }, trail: [], btrail: [], xfer: [], xferAcc: 0, prevEp: null, panelPos: null,
    cel: null, prevPh: '', inited: false,
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
  function buildD(H, d) {
    const del = [];
    for (let i = 0; i < N - 1; i++) del.push((H[i + 1] - H[i]) / DX);
    d[0] = 0.3 * del[0];
    d[N - 1] = 0;
    for (let i = 1; i < N - 1; i++) {
      const a = del[i - 1], b = del[i];
      d[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    }
  }
  function rebuild() {
    buildD(S.H, S.d);
    S.hMin = Math.min.apply(null, S.H);
  }
  function segOf(x) { return clamp(Math.floor(x / DX), 0, N - 2); }
  function splineH(H, d, x) {
    if (x >= XLAST) return H[N - 1];
    if (x <= 0) return H[0];
    const i = segOf(x), t = (x - i * DX) / DX, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * H[i] + (t3 - 2 * t2 + t) * DX * d[i]
      + (-2 * t3 + 3 * t2) * H[i + 1] + (t3 - t2) * DX * d[i + 1];
  }
  function splineS(H, d, x) {
    if (x >= XLAST) return 0;
    if (x < 0) x = 0;
    const i = segOf(x), t = (x - i * DX) / DX, t2 = t * t;
    return ((6 * t2 - 6 * t) * H[i] + (3 * t2 - 4 * t + 1) * DX * d[i]
      + (-6 * t2 + 6 * t) * H[i + 1] + (3 * t2 - 2 * t) * DX * d[i + 1]) / DX;
  }
  const heightAt = (x) => splineH(S.H, S.d, x);
  const slopeAt = (x) => splineS(S.H, S.d, x);
  const heightD = (x) => splineH(S.Hd, S.dd, x);     // 화면에 보이는(부드럽게 바뀌는) 레일
  const slopeD = (x) => splineS(S.Hd, S.dd, x);
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
      if (pendH() <= lowTol()) {
        if (!r.passedLow) { r.lowT = performance.now(); if (S.lowMark) { const bp = bobPos(S.th); ping(bp.x, bp.y); } }
        r.passedLow = true;
      }
      return;
    }
    if (S.x > r.maxX) r.maxX = S.x;
    if (flagOn() && !r.flagDone && S.x > S.flag.idx * DX + 0.15) { r.flagDone = true; ping(px(S.flag.idx * DX), py(heightAt(S.flag.idx * DX)) - 52, ['#16a34a', '#86efac', '#fde047']); addFx('✓ 언덕 통과!', px(S.flag.idx * DX), py(heightAt(S.flag.idx * DX)) - 78, C.good); }
    const hh = heightAt(S.x);
    if (hh <= S.hMin + 0.02) {
      if (!S.inLow) {
        S.inLow = true;
        if (!r.passedLow) { r.lowT = performance.now(); if (S.lowMark) ping(px(S.x), py(hh) - 14); }
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
    if (S.scene === 'pend') { const bp = bobPos(p.th); ping(bp.x, bp.y, ['#3b82f6', '#93c5fd', '#ffffff']); }
    else ping(px(p.x), py(h) - 10, ['#3b82f6', '#93c5fd', '#ffffff']);
    if (S.turns.length > 4) S.turns.shift();
    if (S.run) S.run.turns++;
  }
  function finish() {
    S.x = XEND;
    S.state = 'finished';
    S.finT = nowS();
    PT.burst(px(XLAST) + 17, py(S.H[N - 1]) - 34, { count: 24, speed: 210, size: 4.2, life: 1 });
    updateRunBtn();
    addFx('🏁 통과!', px(XLAST) - 6, py(S.H[N - 1]) - 62, C.good);
    Sound.success();
  }

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
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const PT = new SciSim.Particles();           // 반짝임 · 폭죽 · 먼지
  const RM = SciSim.reduceMotion;
  const AP = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nowS = () => SciSim.time();
  const SCN = PHONE ? { x: 4, y: 4, w: 592, h: 600 } : { x: 4, y: 4, w: 570, h: 592 };   // 실험 장면 카드

  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); };
  function ht(text, x, y, color, size, align) {
    D.text(x, y, text, { size: Math.max(13, size || 14) * FS, weight: 800, color, align: align || 'center', stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
  }
  function pill(text, x, y, bg, fg, size, align) {
    return D.label(x, y, text, { bg, color: fg, size: Math.max(13, size || 13) * FS, pad: 8 * FS, align: align === 'center' ? 'center' : align });
  }
  function card(x, y, w, h, r, fill) {
    D.shadow(() => { ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, r); ctx.fill(); }, { blur: 12, y: 4 });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(x, y, w, h, r); ctx.stroke();
  }
  const isLocked = (i) => !!(S.locks && S.locks.preset === S.preset && S.locks.idx.indexOf(i) >= 0);
  const flagOn = () => !!(S.flag && S.flag.preset === S.preset);
  const pulse = () => 0.5 + 0.5 * Math.sin(nowS() * 6);
  function newRing(x, y, w, h, a) {
    const k = pulse();
    ctx.save(); if (a != null) ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.35 + k * 0.55).toFixed(2) + ')'; ctx.lineWidth = 4;
    rr(x - 5, y - 5, w + 10, h + 10, 14); ctx.stroke();
    ctx.restore();
    pill('NEW', x + w + 6, y - 6, '#f26b3a', '#fff', 13, 'right');
  }
  function attentionRing(x, y, r) {
    const k = pulse();
    ctx.save();
    ctx.strokeStyle = 'rgba(242,107,58,' + (0.3 + k * 0.6).toFixed(2) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, (r || 21) + k * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function heightTag(cx, cy, groundY, h, decimals, gap) {
    if (h < 0.05) return;
    D.dashedLine(cx, cy + 6, cx, groundY, { color: 'rgba(37,99,235,.7)', width: 2, dash: [4, 4] });
    const right = cx < SCN.x + SCN.w - 110, label = fmt(h, decimals) + ' m';
    const size = 14 * FS;
    ctx.font = D.font(size, 800);
    const tw = ctx.measureText(label).width + 16, th = size + 10;
    let g = 6, ly = Math.min((cy + groundY) / 2, groundY - th / 2 - 4) - th / 2;
    if (gap) {   // 진자: 기준면 바로 위에 붙이고, 추와 겹치면 옆으로 비킴
      ly = groundY - th - 6;
      if (cy + 6 > ly - 4) g = gap;
    }
    const lx = right ? cx + g : cx - g - tw;
    D.label(lx, ly + th / 2, label, { bg: 'rgba(255,255,255,.95)', color: '#1d4ed8', size, border: 'rgba(37,99,235,.4)', align: 'left' });
  }

  function draw(tSec) {
    view.clear('#f4f8fd');
    ctx.save(); ctx.globalAlpha = S.sf; ctx.translate((1 - S.sf) * 28, 0);
    if (S.scene === 'pend') drawPend(tSec); else drawCoaster(tSec);
    ctx.restore();
    drawFx();
    drawSpeed(tSec);
    drawPanel(tSec);
    PT.draw(ctx);
    drawCelebrate();
  }
  function addFx(text, x, y, color) { S.fx.push({ text, x, y, color, t0: nowS() }); }
  function drawFx() {
    const now = nowS();
    S.fx = S.fx.filter((f) => now - f.t0 < 1.6);
    S.fx.forEach((f) => {
      const a = now - f.t0, p = a / 1.6, sc = 0.6 + 0.4 * SciSim.ease.outBack(clamp01(a / 0.3));
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      ctx.translate(clamp(f.x, SCN.x + 70, SCN.x + SCN.w - 60), f.y - p * 22); ctx.scale(sc, sc);
      ht(f.text, 0, 0, f.color, 20);
      ctx.restore();
    });
  }
  function celebrate() {
    // 장면의 빈 곳(왼쪽 위)에서 폭죽 + 체크
    const x = SCN.x + 120, y = SCN.y + 120;
    PT.burst(x, y, { count: 26, speed: 230, size: 4.5, life: 1 });
    S.cel = { x, y, t0: nowS() };
  }
  function drawCelebrate() {
    const c = S.cel;
    if (!c) return;
    const age = nowS() - c.t0;
    if (age > 1.6) { S.cel = null; return; }
    ctx.save(); ctx.globalAlpha = age > 1.1 ? 1 - (age - 1.1) / 0.5 : 1;
    D.shadow(() => D.check(c.x, c.y, 30 * FS * SciSim.ease.outBack(clamp01(age / 0.35)), clamp01((age - 0.15) / 0.4)), { blur: 14, y: 4 });
    ctx.restore();
  }
  function ping(x, y, colors) { PT.burst(x, y, { count: 12, speed: 120, size: 3.4, life: 0.6, gravity: 140, colors: colors || ['#16a34a', '#86efac', '#ffb400'] }); }

  function softShadow(x, y, rx, a, sy) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, sy || 0.22);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(30,35,50,${a})`); g.addColorStop(1, 'rgba(30,35,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const CLOUDS = [[40, 70, 1, 6], [330, 150, 0.8, 4], [190, 26, 0.7, 8]];
  function cloud(cx, cy, s) {
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2); ctx.arc(cx + 24 * s, cy - 10 * s, 25 * s, 0, Math.PI * 2);
    ctx.arc(cx + 52 * s, cy, 19 * s, 0, Math.PI * 2); ctx.rect(cx, cy, 52 * s, 19 * s); ctx.fill();
  }
  function skyBackdrop(tSec, groundY) {
    const sc = SCN;
    D.sky(sc.x, sc.y, sc.w, groundY - sc.y, '#8ccbff', '#eaf6ff');
    D.glow(sc.x + 420, sc.y + 70, 120, '#fff6c8', 0.8);
    D.sphere(sc.x + 420, sc.y + 70, 18, '#ffe27a', { gloss: false, light: '#fffbe0', dark: '#ffc83d' });
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    CLOUDS.forEach(([x0, y0, s, sp]) => {
      const span = sc.w + 140, cx = sc.x - 70 + ((x0 + (RM ? 0 : tSec * sp * FS)) % span);
      cloud(cx, sc.y + y0, s);
    });
    [['#a8dca4', 46, 0.011, 0.4], ['#86c987', 26, 0.018, 2]].forEach(([col, amp, f, ph]) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sc.x, groundY);
      for (let x = sc.x; x <= sc.x + sc.w + 12; x += 12) ctx.lineTo(x, groundY - amp * (0.5 + 0.5 * Math.sin(x * f + ph)));
      ctx.lineTo(sc.x + sc.w + 12, groundY); ctx.closePath(); ctx.fill();
    });
  }

  /* =========================================================
     진자 장면
     ========================================================= */
  function bobPos(th) { return { x: PIV.x + Math.sin(th) * LP * PPP, y: PIV.y + Math.cos(th) * LP * PPP }; }
  const FLOOR_Y = 430;
  function drawPend(tSec) {
    const sc = SCN, mech = on('mech');
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.save();
    rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.clip();
    // 실험실 벽과 바닥
    const g = ctx.createLinearGradient(0, sc.y, 0, FLOOR_Y);
    g.addColorStop(0, '#e6eef9'); g.addColorStop(1, '#f9fbff');
    ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, FLOOR_Y - sc.y);
    ctx.fillStyle = 'rgba(120,150,200,.06)';
    for (let x = sc.x + 20; x < sc.x + sc.w; x += 56) ctx.fillRect(x, sc.y, 24, FLOOR_Y - sc.y);
    const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, sc.y + sc.h);
    fg.addColorStop(0, '#d4dce8'); fg.addColorStop(1, '#bcc7d7');
    ctx.fillStyle = fg; ctx.fillRect(sc.x, FLOOR_Y, sc.w, sc.y + sc.h - FLOOR_Y);
    ctx.fillStyle = '#eef2f8'; ctx.fillRect(sc.x, FLOOR_Y - 12, sc.w, 12);
    ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(sc.x, FLOOR_Y, sc.w, 3);
    // 천장 받침대
    const bg0 = ctx.createLinearGradient(0, 26, 0, 42); bg0.addColorStop(0, '#94a3b8'); bg0.addColorStop(1, '#5b6a80');
    D.shadow(() => { ctx.fillStyle = bg0; rr(PIV.x - 150, 26, 300, 16, 6); ctx.fill(); }, { blur: 8, y: 4 });
    [-130, -70, 70, 130].forEach((dx) => D.sphere(PIV.x + dx, 34, 3, '#e2e8f0', { gloss: false }));
    D.shadow(() => { ctx.fillStyle = '#475569'; rr(PIV.x - 14, 38, 28, 22, 4); ctx.fill(); }, { blur: 5, y: 2 });

    const th0 = thOf(S.hp0);
    // 진자가 지나는 길 (점선 원호)
    ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(PIV.x, PIV.y, LP * PPP, Math.PI / 2 - th0, Math.PI / 2 + th0); ctx.stroke(); ctx.restore();
    // 기준면
    D.dashedLine(sc.x + 14, BOT, sc.x + sc.w - 14, BOT, { color: 'rgba(52,84,128,.5)', width: 1.8, dash: [8, 6] });
    ht('기준면 (높이 0 m)', sc.x + sc.w - 14, BOT - 8, '#4b5b72', 13, 'right');
    // 처음 높이 선 (2단계부터): 나타날 때 쓱 그려져요
    if (S.mechA > 0.02) {
      const y = pyP(S.hp0);
      ctx.save(); ctx.globalAlpha = S.mechA;
      D.dashedLine(sc.x + 14, y, sc.x + 14 + (sc.w - 28) * S.mechA, y, { color: 'rgba(37,99,235,.65)', width: 1.9, dash: [7, 6] });
      ht('처음 높이 ' + fmt(S.hp0, 2) + ' m', PIV.x, y - 8, '#1d4ed8', 13);
      ctx.restore();
    }
    if (S.halfLine) {
      const y = pyP(S.hp0 / 2);
      D.dashedLine(sc.x + 14, y, sc.x + sc.w - 14, y, { color: 'rgba(22,163,74,.9)', width: 2.6, dash: [9, 6], offset: RM ? 0 : -tSec * 24 });
      ht('처음 높이의 ½ = ' + fmt(S.hp0 / 2, 2) + ' m (위치 = 운동)', PIV.x, y + 20, C.good, 13);
    }
    // 가장 낮은 곳 표시
    if (S.lowMark) {
      const a = thOf(lowTol());
      const done = S.run && S.run.passedLow;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = done ? 'rgba(22,163,74,.5)' : 'rgba(22,163,74,' + (0.4 + 0.3 * pulse()).toFixed(2) + ')';
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(PIV.x, PIV.y, LP * PPP, Math.PI / 2 - a, Math.PI / 2 + a); ctx.stroke(); ctx.restore();
      if (!done) D.ring(PIV.x, BOT, 20, tSec, { color: C.good });
      ht(done ? '✓ 가장 낮은 곳 통과!' : '⬆ 가장 낮은 곳', PIV.x, BOT + 52, C.good, 15);
    }
    // 되돌아온 지점 (2단계부터): 톡 하고 나타나요
    if (mech) {
      const now = performance.now();
      S.turns.forEach((tp, k) => {
        if (tp.th == null) return;
        const last = k === S.turns.length - 1, b = bobPos(tp.th), pop = RM ? 1 : SciSim.ease.outBack(clamp01((now - tp.t) / 350));
        ctx.save(); ctx.globalAlpha = last ? 1 : 0.4; ctx.translate(b.x, b.y - BOB_R - 4); ctx.scale(pop, pop);
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -10); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (last && now - tp.t > 100) ht('최고 ' + fmt(tp.h, 2) + ' m', clamp(b.x, sc.x + 70, sc.x + sc.w - 70), b.y - BOB_R - 20, '#1d4ed8', 14);
      });
    }
    // 줄과 추
    const b = bobPos(S.thd), h = LP * (1 - Math.cos(S.thd)), active = S.drag === 0 || S.hover === 0;
    // 바닥 그림자: 높이 올라갈수록 옅어지고 퍼져요
    softShadow(b.x, FLOOR_Y + 22, BOB_R * (1.5 + 0.5 * (h / HP_MAX)), 0.32 - 0.1 * (h / HP_MAX), 0.26);
    // 잔상 (빠를수록 길게)
    if (S.state === 'running' && !RM) {
      const tr = S.btrail, now = nowS();
      for (let i = 0; i < tr.length; i++) {
        const q = tr[i], age = now - q.t;
        if (age > 0.4) continue;
        ctx.globalAlpha = 0.16 * (1 - age / 0.4);
        ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.arc(q.x, q.y, BOB_R * (0.9 - age * 0.9), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 줄: 굵은 선 + 반짝이는 선
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PIV.x, PIV.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PIV.x - 0.8, PIV.y); ctx.lineTo(b.x - 0.8, b.y); ctx.stroke();
    D.sphere(PIV.x, PIV.y, 5.5, '#1f2937', { gloss: false });
    if (h >= 0.25) heightTag(b.x, b.y + BOB_R - 6, BOT, h, 2, BOB_R + 6);
    if ((S.pulseBob || S.state === 'ready' && !S.everRan) && S.drag < 0) attentionRing(b.x, b.y, BOB_R + 8);
    // 속도 화살표 (원의 접선 방향): 빠를수록 길어져요
    const sp = Math.abs(S.omd) * LP;
    if (sp > 0.15) {
      const dir = Math.sign(S.omd), tx = Math.cos(S.thd) * dir, ty = -Math.sin(S.thd) * dir;
      const L = 14 + sp * 7;
      const x1 = b.x + tx * (BOB_R + 8), y1 = b.y + ty * (BOB_R + 8);
      D.arrow(x1, y1, x1 + tx * L, y1 + ty * L, { color: '#ea580c', width: 4.5, head: 13 });
    }
    // 추: 끌면 살짝 커지고 그림자가 진해져요
    const lift = S.liftK, R = BOB_R * (1 + 0.12 * lift);
    ctx.save();
    if (lift > 0.01) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14 * lift; ctx.shadowOffsetY = 7 * lift; }
    D.sphere(b.x, b.y - 4 * lift, R, active ? '#ff8a55' : '#f26b3a', { shadow: lift < 0.01, light: '#ffd1b3', dark: '#b8401c' });
    ctx.restore();
    // 에너지 고리: 파랑(위치)과 주황(운동)의 비율
    if (on('ep') && on('ek')) {
      const E = S.Ed, tot = Math.max(1, E.ep + E.ek), a0 = -Math.PI / 2, a1 = a0 + (E.ep / tot) * Math.PI * 2;
      ctx.lineWidth = 5; ctx.lineCap = 'butt';
      ctx.strokeStyle = C.ep; ctx.beginPath(); ctx.arc(b.x, b.y - 4 * lift, R + 6, a0, a1); ctx.stroke();
      ctx.strokeStyle = C.ek; ctx.beginPath(); ctx.arc(b.x, b.y - 4 * lift, R + 6, a1, a0 + Math.PI * 2); ctx.stroke();
    }
    D.text(b.x, b.y - 4 * lift + 4.6 * FS, S.m + ' kg', { size: 13 * FS, weight: 800, color: '#fff', stroke: 'rgba(120,40,10,.55)', strokeWidth: 3 });
    if (S.state === 'ready' && !S.everRan) ht('↔ 추를 끌어 올려요', clamp(b.x, sc.x + 92, sc.x + sc.w - 92), b.y - BOB_R - 18, '#c2410c', 14);
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.stroke();
  }

  /* =========================================================
     롤러코스터 장면
     ========================================================= */
  function drawCoaster(tSec) {
    const sc = SCN;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.save();
    rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.clip();
    skyBackdrop(tSec, GY);
    const gh = sc.y + sc.h - GY, gg = ctx.createLinearGradient(0, GY, 0, GY + gh);
    gg.addColorStop(0, '#9bdc8f'); gg.addColorStop(0.08, '#6cbf6a'); gg.addColorStop(0.3, '#5fae60'); gg.addColorStop(0.31, '#d6bb8a'); gg.addColorStop(1, '#bf9c68');
    ctx.fillStyle = gg; ctx.fillRect(sc.x, GY, sc.w, gh);
    for (let h = 0; h <= H_TOP; h++) {
      const y = py(h);
      if (h > 0) { ctx.strokeStyle = h % 5 === 0 ? 'rgba(52,84,128,.24)' : 'rgba(52,84,128,.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(sc.x + sc.w - 4, y); ctx.stroke(); }
      D.text(42, y + 4.5, h + '', { size: 13, weight: h % 5 === 0 ? 800 : 600, align: 'right', color: '#3d4c63', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    }
    D.text(sc.x + 8, 56, '높이(m)', { size: 13, weight: 800, align: 'left', color: '#3d4c63', stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    // 출발 높이 선
    const y0 = py(S.Hd[0]);
    D.dashedLine(X0 - 2, y0, px(XEND), y0, { color: 'rgba(37,99,235,.65)', width: 1.9, dash: [7, 6] });
    ht('출발 높이 ' + fmt(S.H[0], 1) + ' m', X0 + 44, y0 - 8, '#1d4ed8', 13, 'left');
    drawTrack(tSec);
    drawLowMark(tSec);
    drawFlag(tSec);
    drawCoasterTurns();
    drawHandles(tSec);
    drawCart(tSec);
    drawGate(tSec);
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.stroke();
  }
  function drawTrack(tSec) {
    // 지지대: 위가 가는 기둥 + 가로대
    for (let X = X0 + 11, k = 0; X < px(XEND); X += 22, k++) {
      const h = heightD((X - X0) / PPM);
      if (h < 0.3) continue;
      const top = py(h) + 4;
      const g = ctx.createLinearGradient(X - 3, 0, X + 3, 0); g.addColorStop(0, '#d5dce8'); g.addColorStop(1, '#9aa6ba');
      ctx.fillStyle = g; ctx.fillRect(X - 2.5, top, 5, GY - top);
      if (k % 2 === 0 && h > 1.2) { ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X - 11, py(h * 0.5) + 4); ctx.lineTo(X + 11, py(h * 0.5) - 4); ctx.moveTo(X + 11, py(h * 0.5) + 4); ctx.lineTo(X - 11, py(h * 0.5) - 4); ctx.stroke(); }
    }
    const g0 = ctx.createLinearGradient(X0 - 3, 0, X0 + 3, 0); g0.addColorStop(0, '#c0c9d8'); g0.addColorStop(1, '#8d9ab0');
    ctx.fillStyle = g0; ctx.fillRect(X0 - 3, py(S.Hd[0]) + 4, 6, GY - py(S.Hd[0]) - 4);
    // 레일 (침목 + 이중 레일)
    const pts = [];
    for (let X = X0; X <= px(XEND) + 0.1; X += 3) pts.push([X, py(heightD((X - X0) / PPM))]);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(90,100,120,.7)'; ctx.lineWidth = 2;
    for (let i = 3; i < pts.length - 1; i += 4) {
      const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      ctx.beginPath(); ctx.moveTo(pts[i][0] - nx * 6, pts[i][1] - ny * 6); ctx.lineTo(pts[i][0] + nx * 8, pts[i][1] + ny * 8); ctx.stroke();
    }
    const path = () => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
    D.shadow(() => { path(); ctx.strokeStyle = '#3f4a5e'; ctx.lineWidth = 8; ctx.stroke(); }, { blur: 8, y: 4, color: 'rgba(30,40,60,.3)' });
    path(); ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 5; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.save(); ctx.translate(0, -1.6); ctx.stroke(); ctx.restore();
    // 수레가 지나간 자리: 속력에 따라 주황빛이 번져요
    if (S.trail.length > 1 && !RM) {
      const now = nowS();
      for (let i = 1; i < S.trail.length; i++) {
        const q0 = S.trail[i - 1], q1 = S.trail[i], age = now - q1.t;
        if (age > 1.1) continue;
        ctx.strokeStyle = `rgba(249,115,22,${0.55 * (1 - age / 1.1) * clamp01(q1.v / 8)})`; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(px(q0.x), py(q0.h)); ctx.lineTo(px(q1.x), py(q1.h)); ctx.stroke();
      }
    }
  }
  function lowRange() {
    let lo = null, hi = null;
    for (let x = 0; x <= XLAST + 1e-6; x += 0.05) {
      if (heightAt(x) <= S.hMin + 0.02) { if (lo === null) lo = x; hi = x; }
    }
    return lo === null ? null : [lo, hi];
  }
  function drawLowMark(tSec) {
    if (!S.lowMark) return;
    const r = lowRange();
    if (!r) return;
    const done = S.run && S.run.passedLow;
    ctx.save();
    ctx.strokeStyle = done ? 'rgba(22,163,74,.55)' : 'rgba(22,163,74,' + (0.4 + 0.3 * pulse()).toFixed(2) + ')';
    ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = r[0]; x <= r[1] + 1e-6; x += 0.05) {
      const X = px(x), Y = py(heightD(x));
      if (x === r[0]) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    if (r[1] - r[0] < 0.05) ctx.lineTo(px(r[0]) + 0.5, py(heightD(r[0])));
    ctx.stroke();
    ctx.restore();
    const cx = clamp(px((r[0] + r[1]) / 2), 130, 520), cy = py(S.hMin);
    if (!done) D.ring(px((r[0] + r[1]) / 2), cy, 20, tSec, { color: C.good });
    ht(done ? '✓ 가장 낮은 곳 통과!' : '⬇ 가장 낮은 곳', cx, cy - 66, C.good, 15);
  }
  function drawFlag(tSec) {
    if (!flagOn()) return;
    const i = S.flag.idx, x = px(i * DX), y = py(S.Hd[i]);
    const done = S.run && S.run.maxX > i * DX + 0.15;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 68); ctx.stroke();
    D.sphere(x, y - 69, 3.5, '#fbbf24', { gloss: false });
    const label = done ? '✓ 언덕 통과!' : '🎯 ' + fmt(S.H[i], 0) + ' m 언덕 넘기';
    ctx.font = D.font(14 * FS, 800);
    const w = ctx.measureText(label).width + 22, wav = RM ? 0 : Math.sin(tSec * 5);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.fillStyle = done ? C.good : '#e2464b';
    ctx.beginPath();
    ctx.moveTo(x, y - 66);
    ctx.quadraticCurveTo(x + w * 0.5, y - 66 + wav * 3, x + w, y - 66 + wav * 1.5);
    ctx.lineTo(x + w - 8, y - 52 + wav * 1.5); ctx.lineTo(x + w, y - 38 + wav * 1.5);
    ctx.quadraticCurveTo(x + w * 0.5, y - 38 - wav * 3, x, y - 38);
    ctx.closePath(); ctx.fill(); ctx.restore();
    D.text(x + 8, y - 47, label, { size: 14 * FS, weight: 800, align: 'left', color: '#fff' });
  }
  function drawCoasterTurns() {
    const now = performance.now();
    S.turns.forEach((tp, k) => {
      if (tp.x == null) return;
      const last = k === S.turns.length - 1;
      const X = px(tp.x), Y = py(tp.h), pop = RM ? 1 : SciSim.ease.outBack(clamp01((now - tp.t) / 350));
      ctx.save(); ctx.globalAlpha = last ? 1 : 0.45; ctx.translate(X, Y); ctx.scale(pop, pop);
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-6, -12); ctx.lineTo(6, -12); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (last && now - tp.t > 120 && tp.h > S.hMin + 0.6) ht('최고 ' + fmt(tp.h, 1) + ' m', clamp(X, 120, 540), Y - 19, '#1d4ed8', 14);
    });
  }
  function handleCircle(x, y, i, tSec) {
    const locked = isLocked(i);
    const active = S.drag === i || S.hover === i;
    const r = (active ? 16 : 14) + (S.drag === i ? 2 : 0);
    ctx.save();
    if (S.drag === i) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    else { ctx.shadowColor = 'rgba(30,40,60,.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    const g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, r);
    g.addColorStop(0, locked ? '#f3f4f6' : '#ffffff'); g.addColorStop(1, locked ? '#cdd3dc' : active ? '#ffd0b8' : '#ffe6d8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = locked ? '#94a3b8' : C.cart; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    D.text(x, y + 5, locked ? '🔒' : '↕', { size: (locked ? 13 : 16) * FS, weight: 800, color: locked ? '#64748b' : '#c2410c' });
  }
  function drawHandles(tSec) {
    const y0 = py(S.Hd[0]);
    ctx.strokeStyle = 'rgba(71,85,105,.22)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(KNOB_X, py(H_TOP)); ctx.lineTo(KNOB_X, py(0.5)); ctx.stroke();
    D.dashedLine(KNOB_X + 14, y0, X0 - 3, y0, { color: 'rgba(242,107,58,.85)', width: 2, dash: [3, 3] });
    const fresh = isNew('coaster');
    if (fresh) attentionRing(KNOB_X, y0);
    handleCircle(KNOB_X, y0, 0, tSec);
    ht('출발', KNOB_X, y0 + 31 > GY - 4 ? y0 - 22 : y0 + 31, '#c2410c', 13);
    for (let i = 1; i < N; i++) {
      const x = px(i * DX), y = py(S.Hd[i]);
      if (fresh) attentionRing(x, y);
      handleCircle(x, y, i, tSec);
      if (flagOn() && S.flag.idx === i) continue;
      const t = fmt(S.H[i], 1) + ' m';
      if (i === N - 1) ht(t, x - 18, y - 17, '#334155', 13, 'right');
      else ht(t, x, y - 22, '#334155', 13);
    }
  }
  function drawCart(tSec) {
    if (S.state === 'finished') return;
    const xd = S.xd, h = heightD(xd), sl = slopeD(xd);
    const cx = px(xd), cy = py(h), ang = -Math.atan(sl);
    if (h > 0.7) heightTag(cx, cy, GY, h, 1);
    softShadow(cx, GY + 5, 26 + 6 * (1 - clamp01(h / H_TOP)), 0.1 + 0.25 * (1 - clamp01(h / H_TOP)), 0.24);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    const sp = Math.abs(S.v);
    // 속도 줄: 빠를수록 길어져요
    if (sp > 2 && !RM) {
      const dir = S.v > 0 ? -1 : 1;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const yy = -14 - k * 7, L = Math.min(40, sp * 2.4) * (1 - k * 0.2); ctx.beginPath(); ctx.moveTo(dir * 26, yy); ctx.lineTo(dir * (26 + L), yy); ctx.stroke(); }
    }
    // 바퀴
    [-12, 12].forEach((wx) => {
      D.sphere(wx, -5, 5.4, '#1f2937', { gloss: false });
      ctx.save(); ctx.translate(wx, -5); ctx.rotate(S.wheel); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-3.6, 0); ctx.lineTo(3.6, 0); ctx.moveTo(0, -3.6); ctx.lineTo(0, 3.6); ctx.stroke(); ctx.restore();
    });
    // 몸체
    const bg = ctx.createLinearGradient(0, -34, 0, -8);
    bg.addColorStop(0, '#ffa57a'); bg.addColorStop(0.55, '#f26b3a'); bg.addColorStop(1, '#c9441a');
    D.shadow(() => { ctx.fillStyle = bg; rr(-23, -33, 46, 24, 7); ctx.fill(); }, { blur: 6, y: 3, color: 'rgba(80,30,10,.35)' });
    ctx.strokeStyle = '#a8381a'; ctx.lineWidth = 1.5; rr(-23, -33, 46, 24, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; rr(-19, -31, 30, 5, 2.5); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(S.v >= 0 ? 21 : -21, -20, 2.6, 0, Math.PI * 2); ctx.fill();
    D.text(0, -16.5, S.m + ' kg', { size: 13 * FS, weight: 800, color: '#fff', stroke: 'rgba(120,40,10,.5)', strokeWidth: 3 });
    // 속도 화살표
    if (sp > 0.25) {
      const dir = S.v > 0 ? 1 : -1, L = 10 + sp * 3.4;
      D.arrow(dir * 26, -44, dir * (26 + L), -44, { color: '#ea580c', width: 4.5, head: 12 });
    }
    ctx.restore();
  }
  function drawGate(tSec) {
    const x0 = px(XLAST) + 8, x1 = px(XLAST) + 26, y = py(S.Hd[N - 1]);
    const k = S.finT != null ? clamp01(1 - (nowS() - S.finT) / 1.2) : 0;
    if (k > 0) D.glow((x0 + x1) / 2, y - 24, 60, '#fff6c2', 0.7 * k);
    ctx.fillStyle = 'rgba(30,41,59,.9)';
    ctx.fillRect(x0, y - 36, x1 - x0, 32);
    const pg = ctx.createLinearGradient(0, 0, 4, 0); pg.addColorStop(0, '#64748b'); pg.addColorStop(1, '#334155');
    ctx.fillStyle = pg; ctx.fillRect(x0 - 2, y - 40, 4, 40); ctx.fillRect(x1 - 2, y - 40, 4, 40);
    const cw = (x1 - x0 + 8) / 6;
    for (let kk = 0; kk < 6; kk++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (kk + r) % 2 ? '#111827' : '#ffffff';
        ctx.fillRect(x0 - 4 + kk * cw, y - 48 + r * 5, cw, 5);
      }
    }
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 4, y - 48, x1 - x0 + 8, 10);
    ht('도착', (x0 + x1) / 2, y > 80 ? y - 54 : y + 22, '#111827', 13);
  }

  /* ---------- 속력계 ---------- */
  function drawSpeed(tSec) {
    const B = SB, sc = SC();
    card(B.x, B.y, B.w, B.h, 12, 'rgba(255,255,255,.96)');
    D.text(B.x + 14, B.y + 27, '🏎️ 속력계', { size: 15 * FS, weight: 800, align: 'left', color: '#1b2333' });
    const sp = S.spd;
    D.text(B.x + B.w - 14, B.y + 28, fmt(energies().v, 1) + ' m/s', { size: 19 * FS, weight: 800, align: 'right', color: '#c2410c' });
    const bx = B.x + 18, bw = B.w - 36, by = B.y + 40, bh = 18;
    const vx = (v) => bx + clamp(v / sc.V, 0, 1) * bw;
    const tg = ctx.createLinearGradient(0, by, 0, by + bh); tg.addColorStop(0, '#dbe2ec'); tg.addColorStop(1, '#eef2f7');
    ctx.fillStyle = tg; rr(bx, by, bw, bh, 9); ctx.fill();
    if (S.speedTarget && S.scene === 'coaster') {
      const t = S.speedTarget, k = 0.6 + 0.4 * pulse();
      ctx.fillStyle = `rgba(22,163,74,${0.22 + 0.2 * k})`;
      ctx.fillRect(vx(t.v - t.tol), by - 5, vx(t.v + t.tol) - vx(t.v - t.tol), bh + 10);
      ctx.fillStyle = C.good; ctx.fillRect(vx(t.v) - 1.5, by - 6, 3, bh + 12);
      D.text(B.x + 262, B.y + 27, '🎯 목표 ' + t.v + ' m/s', { size: 13 * FS, weight: 800, align: 'left', color: C.good });
    }
    if (sp > 0.01 && S.state !== 'finished') {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#fdba74'); g.addColorStop(1, '#ea580c');
      ctx.save(); rr(bx, by, bw, bh, 9); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(bx, by, Math.max(bh, vx(sp) - bx), bh);
      const gl = ctx.createLinearGradient(0, by, 0, by + bh); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(bx, by, Math.max(bh, vx(sp) - bx), bh);
      ctx.restore();
    }
    if (S.run && S.run.vmax > 0.05) {
      const mx = vx(S.run.vmax);
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(mx, by - 1); ctx.lineTo(mx - 6, by - 9); ctx.lineTo(mx + 6, by - 9); ctx.closePath(); ctx.fill();
      D.text(B.x + 120, B.y + 27, '▼ 최고 ' + fmt(S.run.vmax, 1) + ' m/s', { size: 13 * FS, weight: 800, align: 'left', color: '#7c2d12' });
    }
    for (let v = 0; v <= sc.V; v += sc.Vt) D.text(v === sc.V ? vx(v) - 14 : vx(v), by + bh + 19, v === sc.V ? v + ' m/s' : v + '', { size: 13 * FS, weight: 600, color: '#5d6879' });
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
  function glossBar(x, y, w, h, color, vertical) {
    const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, SciSim.color.shade(color, 0.28)); g.addColorStop(0.5, color); g.addColorStop(1, SciSim.color.shade(color, -0.2));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  // 위치 에너지 ↔ 운동 에너지가 옮겨 가는 알갱이 (막대 윗부분 사이를 오가요)
  function drawXfer() {
    const pp = S.panelPos; if (!pp) return;
    S.xfer.forEach((q) => {
      const a = q.dir > 0 ? pp.ep : pp.ek, b = q.dir > 0 ? pp.ek : pp.ep, k = q.k;
      const cx = PHONE ? Math.max(a.x, b.x) + 30 : (a.x + b.x) / 2, cy = PHONE ? (a.y + b.y) / 2 : Math.min(a.y, b.y) - 36;
      const X = (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * cx + k * k * b.x, Y = (1 - k) * (1 - k) * a.y + 2 * (1 - k) * k * cy + k * k * b.y;
      D.sphere(X, Y, 4.5, SciSim.color.mix(q.dir > 0 ? C.ep : C.ek, q.dir > 0 ? C.ek : C.ep, k), { gloss: false });
    });
  }
  function drawPanel(tSec) {
    if (PHONE) { drawPanelWide(tSec); return; }
    const P = PANEL, sc = SC(), Bd = S.Ed;
    card(P.x, P.y, P.w, P.h, 14, 'rgba(255,255,255,.98)');
    D.text(P.x + 14, P.y + 30, '⚡ 에너지', { size: 16, weight: 800, align: 'left', color: '#1b2333' });
    D.text(P.x + P.w - 12, P.y + 30, '단위: J', { size: 13, weight: 700, align: 'right', color: '#5d6879' });
    const y0 = P.y + 436, yT = P.y + 70, k = (y0 - yT) / sc.E;
    const by = (e) => y0 - clamp(e, 0, sc.E) * k;
    for (let e = 0; e <= sc.E; e += sc.Et) {
      const y = by(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(P.x + 38, y); ctx.lineTo(P.x + P.w - 8, y); ctx.stroke();
      D.text(P.x + 34, y + 4.5, e + '', { size: 13, weight: 600, align: 'right', color: '#7b8798' });
    }
    const E = energies();
    const left = P.x + 42, right = P.x + P.w - 8;
    const step = (right - left) / COLS.length, bw = 32;
    if (on('mech')) {
      const yE0 = by(Bd.e0);
      D.dashedLine(left - 4, yE0, right, yE0, { color: '#475569', width: 1.6, dash: [6, 4], offset: RM ? 0 : -tSec * 14 });
    }
    S.panelPos = { ep: { x: 0, y: 0 }, ek: { x: 0, y: 0 } };
    COLS.forEach((c, i) => {
      const cx = left + step * (i + 0.5), x = cx - bw / 2;
      const unlocked = !c.step || on(c.key), ua = c.step ? S.mechA : 1;
      if (c.step && ua < 0.99) {
        ctx.save(); ctx.globalAlpha = 1 - ua;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#d3dae5'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(244,247,251,.9)';
        rr(cx - 20, yT, 40, y0 - yT, 10); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        D.text(cx, (yT + y0) / 2 - 2, '🔒', { size: 18, weight: 700, color: '#a3adbd' });
        D.text(cx, (yT + y0) / 2 + 24, c.step + '단계', { size: 13, weight: 800, color: '#a3adbd' });
        D.text(cx, y0 + 22, c.name, { size: 14, weight: 800, color: '#a3adbd' });
        ctx.restore();
      }
      if (!unlocked && ua < 0.01) return;
      ctx.save(); ctx.globalAlpha = ua;
      const val = colVal(E, c.key);
      if (c.key === 'mech') {
        const yEp = by(Bd.ep), yTop = by(Bd.ep + Bd.ek);
        glossBar(x, yEp, bw, y0 - yEp, C.ep, true); glossBar(x, yTop, bw, yEp - yTop, C.ek, true);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, yTop - 1.5, bw + 3, y0 - yTop + 1.5);
      } else {
        const yTop = by(c.key === 'ep' ? Bd.ep : Bd.ek);
        glossBar(x, yTop, bw, y0 - yTop, c.color, true);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 4, yTop, 4, y0 - yTop);
        S.panelPos[c.key] = { x: cx, y: yTop - 8 };
      }
      ht(val + '', cx, by(c.key === 'mech' ? Bd.ep + Bd.ek : c.key === 'ep' ? Bd.ep : Bd.ek) - (c.key === 'mech' ? 9 : 6), c.ink, 15);
      D.text(cx, y0 + 22, c.name, { size: 14, weight: 800, color: c.ink });
      ctx.restore();
      if (c.step && isNew(c.key)) newRing(cx - 22, yT - 2, 44, y0 - yT + 32, ua);
    });
    drawXfer();
    const ly = y0 + 54;
    if (on('mech')) {
      D.dashedLine(P.x + 14, ly - 5, P.x + 38, ly - 5, { color: '#475569', width: 1.6, dash: [6, 4] });
      D.text(P.x + 44, ly, '처음 에너지 ' + E.E0R + ' J', { size: 13, weight: 700, align: 'left', color: '#475569' });
    }
    panelFooter(E).forEach((l, i) => D.text(P.x + P.w / 2, ly + 32 + i * 22, l[0], { size: 13, weight: 800, color: l[1] }));
  }
  // 휴대폰용: 장면 아래 가로 막대그래프
  function drawPanelWide(tSec) {
    const P = PANEL, sc = SC(), Bd = S.Ed;
    card(P.x, P.y, P.w, P.h, 14, '#ffffff');
    const E = energies();
    D.text(P.x + 14, P.y + 30, '⚡ 에너지 (J)', { size: 15 * FS, weight: 800, align: 'left', color: '#1b2333' });
    if (on('mech')) {
      D.dashedLine(P.x + P.w - 232, P.y + 24, P.x + P.w - 208, P.y + 24, { color: '#475569', width: 1.8, dash: [6, 4] });
      D.text(P.x + P.w - 200, P.y + 30, '처음 에너지 ' + E.E0R + ' J', { size: 13 * FS, weight: 700, align: 'left', color: '#475569' });
    }
    const bx0 = P.x + 132, bx1 = P.x + P.w - 22;
    const k = (bx1 - bx0) / sc.E;
    const bx = (e) => bx0 + clamp(e, 0, sc.E) * k;
    const top = P.y + 48, bottom = P.y + 200;
    for (let e = 0; e <= sc.E; e += sc.Et) {
      const x = bx(e);
      ctx.strokeStyle = e === 0 ? '#94a3b8' : '#eef2f7'; ctx.lineWidth = e === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      D.text(x, bottom + 20, e + '', { size: 13 * FS, weight: 600, color: '#7b8798' });
    }
    if (on('mech')) {
      const xE0 = bx(Bd.e0);
      D.dashedLine(xE0, top, xE0, bottom, { color: '#475569', width: 1.8, dash: [6, 4], offset: RM ? 0 : -tSec * 14 });
    }
    S.panelPos = { ep: { x: 0, y: 0 }, ek: { x: 0, y: 0 } };
    const rowH = (bottom - top) / COLS.length, bh = 26;
    COLS.forEach((r, i) => {
      const cy = top + rowH * (i + 0.5), y = cy - bh / 2;
      const unlocked = !r.step || on(r.key), ua = r.step ? S.mechA : 1;
      if (r.step && ua < 0.99) {
        ctx.save(); ctx.globalAlpha = 1 - ua;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#d3dae5'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(244,247,251,.9)';
        rr(bx0, y, bx1 - bx0, bh, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        D.text((bx0 + bx1) / 2, cy + 5, '🔒 ' + r.step + '단계에서 열려요', { size: 13 * FS, weight: 800, color: '#a3adbd' });
        D.text(bx0 - 8, cy + 5, r.full, { size: 13 * FS, weight: 800, align: 'right', color: '#a3adbd' });
        ctx.restore();
      }
      if (!unlocked && ua < 0.01) return;
      ctx.save(); ctx.globalAlpha = ua;
      const val = colVal(E, r.key);
      if (r.key === 'mech') {
        glossBar(bx0, y, bx(Bd.ep) - bx0, bh, C.ep, false); glossBar(bx(Bd.ep), y, bx(Bd.ep + Bd.ek) - bx(Bd.ep), bh, C.ek, false);
        ctx.strokeStyle = C.mech; ctx.lineWidth = 3; ctx.strokeRect(bx0, y - 1.5, bx(Bd.ep + Bd.ek) - bx0 + 1.5, bh + 3);
      } else {
        const v = r.key === 'ep' ? Bd.ep : Bd.ek;
        glossBar(bx0, y, bx(v) - bx0, bh, r.color, false);
        S.panelPos[r.key] = { x: bx(v) + 8, y: cy };
      }
      D.text(bx0 - 8, cy + 5, r.full, { size: 13 * FS, weight: 800, align: 'right', color: r.ink });
      const vv = r.key === 'mech' ? Bd.ep + Bd.ek : r.key === 'ep' ? Bd.ep : Bd.ek, vxx = bx(vv);
      if (vxx > bx1 - 50) D.text(vxx - 6, cy + 5, val + '', { size: 13 * FS, weight: 800, align: 'right', color: '#fff' });
      else ht(val + '', vxx + (r.key === 'mech' ? 8 : 6), cy + 5, r.ink, 13, 'left');
      ctx.restore();
      if (r.step && isNew(r.key)) newRing(bx0 - 4, y - 2, bx1 - bx0 + 8, bh + 4, ua);
    });
    drawXfer();
    const ft = panelFooter(E);
    D.text(P.x + P.w / 2, P.y + P.h - 14, ft[0][0] + ' ' + ft[1][0], { size: 13 * FS, weight: 800, color: ft[0][1] });
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
    if (S.inited && sc !== S.scene) S.sf = 0;       // 장면이 바뀔 때 스르르 나타나요
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
  function stepFx(dt) {
    const snap1 = !S.inited; S.inited = true;
    PT.update(dt);
    const running = S.state === 'running', now = nowS(), E = energies();
    if (snap1) { S.thd = S.th; S.omd = S.om; S.xd = S.x; S.Hd = S.H.slice(); S.mechA = on('mech') ? 1 : 0; S.Ed = { ep: E.Ep, ek: E.Ek, e0: E.E0R }; S.spd = E.v; }
    // 진자
    if (running && S.scene === 'pend') { S.thd = S.th; S.omd = S.om; }
    else { S.thd = AP(S.thd, S.th, dt, 22); S.omd = AP(S.omd, S.om, dt, 20); if (Math.abs(S.thd - S.th) < 0.0004) S.thd = S.th; }
    if (S.scene === 'pend' && running) { const b = bobPos(S.th); S.btrail.push({ x: b.x, y: b.y, t: now }); }
    while (S.btrail.length && now - S.btrail[0].t > 0.5) S.btrail.shift();
    // 롤러코스터: 수레 · 레일 모양이 부드럽게 바뀌어요
    if (running && S.scene === 'coaster') S.xd = S.x; else { S.xd = AP(S.xd, S.x, dt, 14); if (Math.abs(S.xd - S.x) < 0.002) S.xd = S.x; }
    let moved = false;
    for (let i = 0; i < N; i++) {
      const nv = AP(S.Hd[i], S.H[i], dt, 22);
      S.Hd[i] = Math.abs(nv - S.H[i]) < 0.004 ? S.H[i] : nv;
      if (S.Hd[i] !== S.H[i]) moved = true;
    }
    if (moved || S.dd[0] === 0 && S.dd[1] === 0 && S.dd[2] === 0) buildD(S.Hd, S.dd);
    if (S.scene === 'coaster' && running) { S.trail.push({ x: S.x, h: heightAt(S.x), v: Math.abs(S.v), t: now }); S.wheel += S.v * dt * S.rate * PPM / 5.4; }
    while (S.trail.length && now - S.trail[0].t > 1.2) S.trail.shift();
    S.spd = AP(S.spd, E.v, dt, 18);
    S.liftK = AP(S.liftK, S.drag >= 0 ? 1 : 0, dt, 18);
    S.mechA = AP(S.mechA, on('mech') ? 1 : 0, dt, 4);
    S.sf = AP(S.sf, 1, dt, 8);
    // 막대는 값을 부드럽게 따라가요
    const rate = running ? 40 : 14, Ed = S.Ed;
    Ed.ep = AP(Ed.ep, E.Ep, dt, rate); Ed.ek = AP(Ed.ek, E.Ek, dt, rate); Ed.e0 = AP(Ed.e0, E.E0R, dt, 14);
    if (Math.abs(Ed.ep - E.Ep) < 0.02) Ed.ep = E.Ep;
    if (Math.abs(Ed.ek - E.Ek) < 0.02) Ed.ek = E.Ek;
    if (Math.abs(Ed.e0 - E.E0R) < 0.02) Ed.e0 = E.E0R;
    // 위치 에너지 ↔ 운동 에너지 알갱이
    if (running && !RM && S.prevEp != null && dt > 0) {
      const dEp = E.Ep - S.prevEp, pps = clamp(Math.abs(dEp) / dt / 14, 0, 16);
      S.xferAcc += pps * dt;
      while (S.xferAcc >= 1) { S.xferAcc -= 1; if (S.xfer.length < 24 && Math.abs(dEp) > 1e-4) S.xfer.push({ k: 0, dir: dEp < 0 ? 1 : -1 }); }
    }
    S.prevEp = E.Ep;
    S.xfer.forEach((q) => { q.k += dt / 0.6; });
    S.xfer = S.xfer.filter((q) => q.k < 1);
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.prevPh !== 'success') celebrate();
    S.prevPh = ph;
  }
  SciSim.loop((dt, t) => {
    physics(dt);
    stepFx(dt);
    draw(SciSim.time());
    updateReadouts(t);
  });

  // 테스트·디버깅용 (읽기 전용으로 사용)
  window.CoasterDebug = { S, PT, heightAt, slopeAt, energies, bobPos, get game() { return game; }, VW, VH, PIV, LP, PPP, BOT };
})();
