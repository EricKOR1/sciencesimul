/* =========================================================
   중3 Ⅳ. 운동과 에너지 - 직선 운동의 그래프 (단원 1차시)
   성취기준 [9과19-01] 직선상에서 움직이는 물체의 운동을 그래프로 나타내고 해석할 수 있다.
   ① 관찰: 세 로봇 자동차의 위치를 1초마다 기록 → 점 간격으로 운동 구별
   ② 실험: 등속 운동의 시간–이동 거리 그래프 (원점을 지나는 직선, 기울기 = 속력)
   ③ 분석: 시간–속력 그래프 (등속 · 일정하게 증가 · 일정하게 감소, 넓이 = 이동 거리)
   ④ 적용: 지하철 그래프 해석, 그래프대로 운전하기
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 900 : 560;
  const FS = PHONE ? 1.3 : 1;
  const CS = PHONE ? 1.3 : 1;                 // 자동차 크기 배율
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const font = (n, bold) => (bold ? '800 ' : '600 ') + Math.round(n * FS) + 'px ' + FONT;
  const mono = (n) => '800 ' + Math.round(n * FS) + 'px ui-monospace,Menlo,Consolas,monospace';
  const COL = { A: '#3867f4', B: '#f26b3a', C: '#8b5cf6', ME: '#f59e0b' };
  const SHAPE = { A: 'circle', B: 'tri', C: 'sq', ME: 'circle' };
  const GREEN = '#14a058', RED = '#e2464b', AXIS = '#5d6879', GRID = '#e8edf5', GRID2 = '#f3f6fa', TAPE = '#ffd84d', PAPER = '#fffdf6';
  const TMAX = 6;
  const G = PHONE
    ? { sky: 78, skyLab: 96, road: 84, strip: 56, gap: 12, ruler: 32 }
    : { sky: 66, skyLab: 78, road: 58, strip: 40, gap: 8, ruler: 28 };
  const PITCH = G.road + G.strip + G.gap;
  const ACC_DEG = 4.5;                        // 1초마다 속력 변화 1 m/s 당 차체 기울기(도)

  const CARDS = [
    { id: 'slow', text: '점점 느려짐', ans: 'C' },
    { id: 'const', text: '속력이 일정', ans: 'A' },
    { id: 'fast', text: '점점 빨라짐', ans: 'B' },
  ];
  const KIND = { A: 'const', B: 'fast', C: 'slow' };
  const DIFFS = { A: [3, 3, 3, 3, 3, 3], B: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5], C: [5.5, 4.5, 3.5, 2.5, 1.5, 0.5] };
  const PROG = { A: 'A: 속력 3 m/s 유지', B: 'B: 정지 → 1초마다 +1 m/s', C: 'C: 6 m/s → 1초마다 −1 m/s' };

  /* ---------- 운동 계산 (m, s, m/s) ---------- */
  function posOf(c, t, vA) {
    if (c === 'A') return vA * t;
    if (c === 'B') return t <= 0 ? 0 : 0.5 * t * t;
    return t <= 0 ? 6 * t : 6 * t - 0.5 * t * t;
  }
  function velOf(c, t, vA) {
    if (c === 'A') return vA;
    if (c === 'B') return t <= 0 ? 0 : t;
    return t <= 0 ? 6 : 6 - t;
  }
  function accOf(c, t) {
    if (t <= 0 || t >= TMAX) return 0;
    return c === 'B' ? 1 : c === 'C' ? -1 : 0;
  }
  const t0Of = (c) => (c === 'B' ? 0 : -1);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const fnum = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : f1(v));
  const mark = (b) => (b ? '✅' : '⬜');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'race', view: 'race', car: 'A', vA: 3, stamp: false, cues: false,
    state: 'ready',                 // ready | preroll | running | done
    t: 0, clock: 0, run: null,
    stamps: { A: [], B: [], C: [], ME: [] },
    br: { A: { n: 0, a: 0, col: null }, B: { n: 0, a: 0, col: null }, C: { n: 0, a: 0, col: null }, ME: { n: 0, a: 0, col: null } },
    pulse: { A: -9, B: -9, C: -9 },
    slots: { A: { ok: false, shake: -9 }, B: { ok: false, shake: -9 }, C: { ok: false, shake: -9 } },
    cardsOn: false, sel: null,
    photo: 0, flashAt: -9, bannerY: -80, goAt: -9, swPulse: 0, swAt: -9,
    dg: { lines: [], cur: null, steps: [], placed: {}, live: false, stars: [{ t: 3, d: 12, hit: false, at: -9 }, { t: 6, d: 6, hit: false, at: -9 }], showStars: false, msg: '', msgAt: -9, flashRow: {} },
    vg: { lines: { A: null, B: null, C: null }, cur: null, steps: { B: 0, C: 0 }, area: { state: 'idle', k: 0, times: [], doneAt: -9, arrowP: 0 } },
    prog: { A: { flip: 0, done: false }, B: { flip: 0, done: false }, C: { flip: 0, done: false } },
    runs: { A: 0, B: 0, C: 0 },
    drag: null, ptr: null,
    pedal: { gas: false, brake: false },
    drive: { phase: 'ready', t: 0, x: 0, v: 0, inT: 0, match: 0, best: 0, cnt: 3, cntT: 0, n: 0, tt: new Float32Array(240), vv: new Float32Array(240), ii: new Uint8Array(240), res: null, hintAt: -9, prevInBand: true },
    rm: 0,                           // 줄자가 그래프 축으로 변하는 정도(0~1)
    cnt: { race: 0, stampRace: 0, runA: 0, runB: 0, runC: 0, drive: 0 },
  };
  const base = {};
  const snap = () => Object.assign(base, S.cnt);
  const since = (k) => S.cnt[k] - (base[k] || 0);
  let game = null;
  const has = (n) => !!(game && game.has(n));
  const isNew = (n) => !!(game && game.isNew(n));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const RM = SciSim.reduceMotion;

  /* ---------- 화면 배치 (영역 사각형은 0.55초 동안 부드럽게 바뀜) ---------- */
  function targetLayout() {
    const v = S.view, T = { dg: { a: 0 }, tbl: { a: 0 }, vg: { a: 0 }, tray: { a: 0 }, lane: {} };
    const lab = v !== 'race';
    if (!PHONE) {
      T.track = lab ? { x: 10, y: 10, w: 780, h: 206 } : { x: 10, y: 10, w: 780, h: 540 };
      if (v === 'lab1') { T.dg = { x: 10, y: 226, w: 420, h: 324, a: 1 }; T.tbl = { x: 440, y: 226, w: 350, h: 324, a: 1 }; }
      if (v === 'lab2') { T.dg = { x: 10, y: 226, w: 385, h: 324, a: 1 }; T.vg = { x: 405, y: 226, w: 385, h: 324, a: 1 }; }
      if (v === 'drive') T.vg = { x: 10, y: 226, w: 780, h: 324, a: 1 };
    } else {
      T.track = lab ? { x: 8, y: 8, w: 584, h: 300 } : { x: 8, y: 8, w: 584, h: 600 };
      if (v === 'race') T.tray = { x: 8, y: 616, w: 584, h: 276, a: 1 };
      if (v === 'lab1') { T.dg = { x: 8, y: 318, w: 584, h: 330, a: 1 }; T.tbl = { x: 8, y: 656, w: 584, h: 236, a: 1 }; }
      if (v === 'lab2') { T.dg = { x: 8, y: 318, w: 584, h: 282, a: 1 }; T.vg = { x: 8, y: 610, w: 584, h: 282, a: 1 }; }
      if (v === 'drive') T.vg = { x: 8, y: 318, w: 584, h: 574, a: 1 };
    }
    const tr = T.track;
    T.skyH = lab ? G.skyLab : G.sky;
    if (v === 'race' && !PHONE) T.tray = { x: tr.x, y: 0, w: tr.w, h: 0, a: 1 };
    const y0 = tr.y + T.skyH;
    ['A', 'B', 'C', 'ME'].forEach((c, i) => {
      let show;
      if (v === 'race') show = c !== 'ME';
      else if (S.mode === 'drive') show = c === 'ME';
      else show = c === S.car;
      T.lane[c] = { y: show ? (v === 'race' ? y0 + i * PITCH : y0) : (v === 'race' ? y0 + Math.min(i, 2) * PITCH : y0), a: show ? 1 : 0, off: show ? 0 : 160 };
    });
    T.rulerY = y0 + (v === 'race' ? 3 : 1) * PITCH - G.gap + 2;
    if (v === 'race' && !PHONE) { T.tray.y = T.rulerY + G.ruler + 6; T.tray.h = tr.y + tr.h - 4 - T.tray.y; }
    return T;
  }
  const Lc = (function () {   // 현재(애니메이션 중) 배치
    const T = targetLayout();
    return JSON.parse(JSON.stringify(T));
  })();
  function approachObj(cur, tgt, dt, rate) {
    for (const k in tgt) {
      const tv = tgt[k];
      if (tv && typeof tv === 'object') { if (!cur[k]) cur[k] = JSON.parse(JSON.stringify(tv)); approachObj(cur[k], tv, dt, rate); }
      else if (typeof tv === 'number') cur[k] = (cur[k] == null || RM) ? tv : SciSim.approach(cur[k], tv, dt, rate);
    }
  }
  let TL = targetLayout();
  function relayout() { TL = targetLayout(); }
  function snapLayout() { relayout(); approachObj(Lc, TL, 1, 1000); }

  const ppm = () => (Lc.track.w - 38) / 27;
  const xm = (m) => Lc.track.x + 24 + (m + 3) * ppm();

  /* ---------- 자동차의 보이는 상태 ---------- */
  const V = {};
  ['A', 'B', 'C', 'ME'].forEach((c) => { V[c] = { x: 0, v: 0, wheel: 0, tilt: new SciSim.Spring(0, { stiffness: 120, damping: 11 }), alpha: 1, press: -9, brakeL: 0, a: 0 }; });

  /* 정적 질감: 아스팔트 잔점 / 연석 무늬 (한 번만 만들어 둠) */
  function mkPattern(w, h, fn) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); fn(c, w, h);
    return ctx.createPattern(cv, 'repeat');
  }
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const asphalt = mkPattern(128, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4b5563'); g.addColorStop(1, '#3f4652');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
  });
  const runup = mkPattern(128, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7b8494'); g.addColorStop(1, '#6b7382');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
  });
  const curb = mkPattern(16, 6, (c) => { c.fillStyle = '#e2464b'; c.fillRect(0, 0, 8, 6); c.fillStyle = '#fff'; c.fillRect(8, 0, 8, 6); });

  /* ---------- 그리기 도우미 ---------- */
  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function txt(s, x, y, size, color, align, bold) {
    ctx.font = font(size, bold !== false); ctx.fillStyle = color || '#1b2333'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }
  function pillL(s, x, y, bg, fg, size, align) { return D.label(x, y, s, { bg, color: fg, size: Math.round((size || 13) * FS), align: align || 'center', pad: 8 }); }
  function marker(shape, x, y, r, color, ring) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = ring || '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (shape === 'tri') { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y + r * 0.85); ctx.lineTo(x - r * 1.1, y + r * 0.85); ctx.closePath(); }
    else if (shape === 'sq') { ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); }
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function checker(x, y, w, h, n) {
    const s = h / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(w / s); j++) { ctx.fillStyle = (i + j) % 2 ? '#1b2333' : '#fff'; ctx.fillRect(x + j * s, y + i * s, s, s); }
  }
  function shakeX(at) { const a = S.clock - at; return a < 0.3 && !RM ? Math.sin(a * 60) * 6 * (1 - a / 0.3) : 0; }

  /* ---------- 로봇 자동차 (옆모습, 오른쪽이 앞) ---------- */
  function drawCar(c, noseX, wheelBottom, o) {
    const cs = CS, L = 46 * cs, r = 6.5 * cs;
    const col = COL[c], vs = V[c];
    ctx.save();
    ctx.globalAlpha *= vs.alpha;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(noseX - L / 2, wheelBottom + 1, L * 0.55, 3.2 * cs, 0, 0, Math.PI * 2); ctx.fill();
    // 속력 줄
    if (vs.v > 1.5 && vs.moving) {
      for (let i = 0; i < 3; i++) {
        const len = (6 + 4 * vs.v) * cs, yy = wheelBottom - (9 + i * 7) * cs;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.05 * vs.v})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(noseX - L - 4 * cs, yy); ctx.lineTo(noseX - L - 4 * cs - len, yy); ctx.stroke();
      }
    }
    // 기울기(뒷바퀴 중심 기준)
    const tilt = vs.tilt.value * Math.PI / 180;
    ctx.translate(noseX - L * 0.2, wheelBottom - r);
    ctx.rotate(tilt);
    ctx.translate(-(noseX - L * 0.2), -(wheelBottom - r));
    const by = wheelBottom - r - 4 * cs;           // 몸체 아랫면
    // 브레이크등
    if (vs.brakeL > 0.02) { D.glow(noseX - L - 1, by - 7 * cs, 16 * cs, '#ff3b3b', 0.75 * vs.brakeL); }
    // 몸체
    const bodyTop = by - 14 * cs;
    const g = ctx.createLinearGradient(0, bodyTop, 0, by);
    g.addColorStop(0, SciSim.color.shade(col, 0.25)); g.addColorStop(1, SciSim.color.shade(col, -0.25));
    ctx.fillStyle = g; rr(noseX - L, bodyTop, L, 14 * cs, 5 * cs); ctx.fill();
    // 지붕(유리창 포함)
    const cx0 = noseX - L * 0.72, cw = L * 0.5, ct = bodyTop - 10 * cs;
    const g2 = ctx.createLinearGradient(0, ct, 0, bodyTop);
    g2.addColorStop(0, SciSim.color.shade(col, 0.15)); g2.addColorStop(1, SciSim.color.shade(col, -0.1));
    ctx.fillStyle = g2; rr(cx0, ct, cw, 12 * cs, 4 * cs); ctx.fill();
    const wg = ctx.createLinearGradient(0, ct, 0, bodyTop);
    wg.addColorStop(0, '#d8f0ff'); wg.addColorStop(1, '#8cc4ec');
    ctx.fillStyle = wg; rr(cx0 + 3 * cs, ct + 2 * cs, cw - 6 * cs, 8 * cs, 3 * cs); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(cx0 + 6 * cs, ct + 2 * cs); ctx.lineTo(cx0 + 11 * cs, ct + 2 * cs); ctx.lineTo(cx0 + 7 * cs, ct + 10 * cs); ctx.lineTo(cx0 + 3 * cs, ct + 10 * cs); ctx.closePath(); ctx.fill();
    // LED 눈 · 안테나
    ctx.fillStyle = '#fff7b0'; ctx.beginPath(); ctx.arc(noseX - 4 * cs, bodyTop + 5 * cs, 2.4 * cs, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(noseX - 4 * cs, bodyTop + 10 * cs, 1.6 * cs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(noseX - L + 6 * cs, ct + 2 * cs); ctx.lineTo(noseX - L + 4 * cs, ct - 7 * cs); ctx.stroke();
    const blink = Math.sin(S.clock * Math.PI * 2) > 0;
    ctx.fillStyle = blink ? '#ff5a5a' : '#8a95a6'; ctx.beginPath(); ctx.arc(noseX - L + 4 * cs, ct - 8 * cs, 2.2 * cs, 0, Math.PI * 2); ctx.fill();
    // 옆면 글자
    ctx.font = '800 ' + Math.round(10 * cs * FS / (PHONE ? 1.2 : 1)) + 'px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c === 'ME' ? '나' : c, noseX - L * 0.5, bodyTop + 8 * cs); ctx.textBaseline = 'alphabetic';
    // 지붕 LED (단서)
    if (o && o.cues) {
      const sgn = vs.a > 0.3 ? 1 : vs.a < -0.3 ? -1 : 0;
      const lc = sgn > 0 ? '#22c55e' : sgn < 0 ? '#ef4444' : '#3b82f6';
      D.glow(cx0 + cw / 2, ct - 2 * cs, 9 * cs, lc, 0.7);
      ctx.fillStyle = lc; rr(cx0 + cw / 2 - 5 * cs, ct - 5 * cs, 10 * cs, 5 * cs, 2 * cs); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(6 * cs) + 'px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(sgn > 0 ? '▲' : sgn < 0 ? '▼' : '＝', cx0 + cw / 2, ct - 0.8 * cs);
    }
    // 바퀴
    const blur = vs.moving ? clamp((vs.v - 3) / 4, 0, 0.8) : 0;
    [noseX - 11 * cs, noseX - L + 11 * cs].forEach((wx) => {
      const wy = wheelBottom - r;
      ctx.fillStyle = '#20252e'; ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c5ccd8'; ctx.beginPath(); ctx.arc(wx, wy, r * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(vs.wheel);
      ctx.strokeStyle = `rgba(70,80,95,${1 - blur * 0.8})`; ctx.lineWidth = 1.4 * cs;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.55, 0); ctx.stroke(); }
      if (blur > 0.05) { ctx.fillStyle = `rgba(200,208,220,${blur * 0.7})`; ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#6b7382'; ctx.beginPath(); ctx.arc(wx, wy, r * 0.16, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  /* ---------- 줄자 ---------- */
  function drawTape(cx, cy, ang, len, th, ticks, nums) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    D.shadow(() => { ctx.fillStyle = TAPE; rr(-len / 2, -th / 2, len, th, 3); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 1;
    if (ticks) {
      const per = len / ticks.span;
      for (let m = ticks.from; m <= ticks.to + 1e-6; m += 0.5) {
        const px = -len / 2 + (m - ticks.from) * per, whole = Math.abs(m - Math.round(m)) < 1e-6, three = whole && Math.round(m) % 3 === 0;
        const h = three ? th * 0.55 : whole ? th * 0.38 : th * 0.2;
        ctx.beginPath(); ctx.moveTo(px, -th / 2); ctx.lineTo(px, -th / 2 + h); ctx.stroke();
        if (nums && three) { ctx.font = font(11, true); ctx.fillStyle = '#5a4300'; ctx.textAlign = 'center'; ctx.fillText(String(Math.round(m)), px, th / 2 - 2.5); }
      }
    }
    ctx.restore();
  }

  /* ---------- 트랙 ---------- */
  function drawLaneBase(c) {
    const ln = Lc.lane[c]; if (ln.a < 0.02) return false;
    const T = Lc.track, y = ln.y;
    ctx.save();
    ctx.globalAlpha = ln.a; ctx.translate(ln.off || 0, 0);
    // 도로
    ctx.fillStyle = asphalt; ctx.fillRect(T.x, y, T.w, G.road);
    ctx.fillStyle = runup; ctx.fillRect(xm(-3), y, xm(0) - xm(-3), G.road);
    ctx.fillStyle = curb; ctx.fillRect(T.x, y, T.w, 5 * FS); ctx.fillRect(T.x, y + G.road - 5 * FS, T.w, 5 * FS);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = font(12, true); ctx.textAlign = 'center'; ctx.fillText('도움닫기', (xm(-3) + xm(0)) / 2, y + 17 * FS);
    // 출발선
    checker(xm(0) - 3, y + 5 * FS, 6, G.road - 10 * FS, 6);
    // 결승선(1단계)
    if (S.view === 'race') {
      checker(xm(18) - 3, y + 5 * FS, 6, G.road - 10 * FS, 6);
    }
    if (S.view === 'race' && c === 'A') {
      const fx = xm(18), fy = y - 2;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 24 * FS); ctx.stroke();
      ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(fx, fy - 24 * FS);
      for (let i = 0; i <= 8; i++) ctx.lineTo(fx + i * 3.2, fy - 24 * FS + Math.sin(S.clock * 5 + i * 0.8) * 1.5 * (i / 8));
      ctx.lineTo(fx + 25.6, fy - 12 * FS); for (let i = 8; i >= 0; i--) ctx.lineTo(fx + i * 3.2, fy - 12 * FS + Math.sin(S.clock * 5 + i * 0.8) * 1.5 * (i / 8));
      ctx.closePath(); ctx.fill();
      txt('18 m', fx + 13, fy - 15.5 * FS, 10, '#fff', 'center');
    }
    // 주차 칸(4단계)
    if (S.mode === 'drive' && c === 'ME') {
      // 주차 칸: 21 m(주차선) ± 1 m 안에서 멈추면 '정확히 주차' (판정과 같은 범위)
      const px = xm(20), pw = 2 * ppm();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.strokeRect(px, y + 9 * FS, pw, G.road - 18 * FS);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(px, y + 9 * FS, pw, G.road - 18 * FS);
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xm(21), y + 9 * FS); ctx.lineTo(xm(21), y + G.road - 9 * FS); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = Math.round(18 * FS) + 'px ' + FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('🅿️', px + pw * 0.75, y + G.road / 2 + 7 * FS);
    }
    // 차선 이름표
    if (S.mode !== 'drive' && c !== 'ME') {
      ctx.fillStyle = COL[c]; ctx.beginPath(); ctx.arc(T.x + 13, y + G.road / 2, 8 * FS, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = font(11, true); ctx.textAlign = 'center'; ctx.fillText(c, T.x + 13, y + G.road / 2 + 4 * FS);
    }
    // 기록 띠
    const sy = y + G.road + 3;
    D.shadow(() => { ctx.fillStyle = PAPER; rr(T.x + 6, sy, T.w - 12, G.strip - 4, 4); ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.2)' });
    ctx.restore();
    return true;
  }

  function drawLaneTop(c) {
    const ln = Lc.lane[c]; if (ln.a < 0.02) return;
    const T = Lc.track, y = ln.y, sy = y + G.road + 3, st = S.stamps[c];
    ctx.save(); ctx.globalAlpha = ln.a; ctx.translate(ln.off || 0, 0);
    const dotY = sy + (G.strip - 4) * 0.52;
    // 괄호(간격 값)
    const br = S.br[c];
    if (br.a > 0.02 && st.length > 1) {
      ctx.globalAlpha = ln.a * br.a;
      const n = Math.min(br.n, st.length - 1), colr = br.col || COL[c];
      for (let i = 1; i <= n; i++) {
        const x1 = xm(st[i - 1].x), x2 = xm(st[i].x), by = sy + (G.strip - 4) - 6 * FS;
        ctx.strokeStyle = colr; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1 + 2, by - 4); ctx.lineTo(x1 + 2, by); ctx.lineTo(x2 - 2, by); ctx.lineTo(x2 - 2, by - 4); ctx.stroke();
        const d = st[i].x - st[i - 1].x, lab = fnum(Math.round(d * 100) / 100) + ((x2 - x1) >= 38 ? ' m' : '');
        ctx.font = font(11, true); const tw = ctx.measureText(lab).width + 6;
        ctx.fillStyle = PAPER; ctx.fillRect((x1 + x2) / 2 - tw / 2, by - 7 * FS, tw, 12 * FS);
        txt(lab, (x1 + x2) / 2, by + 3 * FS, 11, colr, 'center');
      }
      ctx.globalAlpha = ln.a;
    }
    // 점
    let lastLab = -99;
    for (let i = 0; i < st.length; i++) {
      const s = st[i], x = xm(s.x), age = S.clock - s.born;
      const pop = RM ? 1 : age < 0 ? 0 : age < 0.3 ? SciSim.ease.outBack(age / 0.3) : 1;
      const pu = Math.max(0, 1 - (S.clock - S.pulse[c] - i * 0.08) / 0.3), pulseK = (S.clock - S.pulse[c] - i * 0.08) > 0 ? pu : 0;
      const r = 5.2 * pop * (1 + pulseK * 0.5) * (PHONE ? 1.1 : 1);
      if (s.hidden) { ctx.strokeStyle = '#b7c0cf'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, dotY, 5.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      else if (r > 0.1) { marker('circle', x, dotY, r, COL[c], '#fff'); }
      if (age >= 0 && age < 0.3 && !RM && !s.hidden) { ctx.strokeStyle = SciSim.color.rgba(COL[c], 0.6 * (1 - age / 0.3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, dotY, 4 + 6 * (age / 0.3), 0, Math.PI * 2); ctx.stroke(); }
      if (x - lastLab >= 16 || s.k === 0 || s.k === 6) { txt(String(s.k), x, dotY - 8 * FS, 12, '#6b7382', 'center'); lastLab = x; }
    }
    ctx.restore();
  }

  function drawTrack() {
    const T = Lc.track;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(T.x, T.y, T.w, T.h, 14); ctx.fill(); }, { blur: 12, y: 4 });
    ctx.save();
    rr(T.x, T.y, T.w, T.h, 14); ctx.clip();
    D.sky(T.x, T.y, T.w, Lc.skyH, '#bfe3ff', '#eaf6ff');
    // 언덕 · 나무
    const hy = T.y + Lc.skyH;
    ctx.fillStyle = '#c9ebe0'; ctx.beginPath(); ctx.moveTo(T.x, hy);
    for (let x = 0; x <= T.w; x += 20) ctx.lineTo(T.x + x, hy - 14 - 8 * Math.sin(x / 90 + 1));
    ctx.lineTo(T.x + T.w, hy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b3e0cf'; ctx.beginPath(); ctx.moveTo(T.x, hy);
    for (let x = 0; x <= T.w; x += 20) ctx.lineTo(T.x + x, hy - 6 - 6 * Math.sin(x / 60 + 3));
    ctx.lineTo(T.x + T.w, hy); ctx.closePath(); ctx.fill();
    [[60, 1], [180, 0.8], [330, 1.1], [470, 0.85], [600, 1]].forEach((p) => {
      if (p[0] > T.w - 190 && Lc.skyH > 70 && S.view !== 'race' && has('speedo')) return;
      const tx = T.x + p[0], s = p[1];
      ctx.fillStyle = '#7a5b3a'; ctx.fillRect(tx - 1.5, hy - 12 * s, 3, 12 * s);
      ctx.fillStyle = '#7bc09a'; ctx.beginPath(); ctx.arc(tx, hy - 18 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
    });
    // 잔디
    const gg = ctx.createLinearGradient(0, hy, 0, T.y + T.h); gg.addColorStop(0, '#dff0d6'); gg.addColorStop(1, '#cfe6c4');
    ctx.fillStyle = gg; ctx.fillRect(T.x, hy, T.w, T.y + T.h - hy);
    // 줄자의 세로 안내선
    const nLanes = S.view === 'race' ? 3 : 1;
    const gTop = Lc.lane.A.y - 0, gBot = TL.rulerY;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let m = 0; m <= 24; m += 3) { ctx.beginPath(); ctx.moveTo(xm(m), Lc.lane[S.mode === 'drive' ? 'ME' : (S.view === 'race' ? 'A' : S.car)].y); ctx.lineTo(xm(m), Lc.rulerY); ctx.stroke(); }
    // 차선 바탕
    ['A', 'B', 'C', 'ME'].forEach(drawLaneBase);
    drawActors();
    // 줄자
    const rl = Lc.rulerY, rh = G.ruler;
    drawTape((xm(0) + xm(24)) / 2, rl + rh / 2, 0, 24 * ppm(), rh, { from: 0, to: 24, span: 24 }, true);
    txt('이동 거리 (m)', xm(-0.1), rl + rh / 2 + 4, 11, '#5a4300', 'right');
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(T.x, T.y, T.w, T.h, 14); ctx.stroke();
  }

  /* ---------- 그래프 패널 ---------- */
  function panelStart(r) { ctx.save(); const a = clamp01(r.a); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 20); }
  function panelCard(r, title) {
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14); ctx.fill(); }, { blur: 12, y: 4 });
    ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1; rr(r.x, r.y, r.w, r.h, 14); ctx.stroke();
    txt(title, r.x + 16, r.y + 26 * FS, 15, '#1b2333', 'left');
  }
  function newRing(r, name) {
    if (!isNew(name) || RM) return;
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = `rgba(242,107,58,${0.35 + a * 0.5})`; ctx.lineWidth = 4; rr(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12); ctx.stroke();
    ctx.fillStyle = '#f26b3a'; rr(r.x + r.w - 58, r.y + 8, 50, 22, 11); ctx.fill();
    txt('NEW', r.x + r.w - 33, r.y + 23, 12, '#fff', 'center'); ctx.restore();
  }
  const dgPlot = (r) => { const L = PHONE ? 74 : 64, T = PHONE ? 52 : 46, B = PHONE ? 52 : 46; return { x: r.x + L, y: r.y + T, w: r.w - L - 22, h: r.h - T - B }; };
  function axisArrow(x, y, dir) {
    ctx.fillStyle = AXIS; ctx.beginPath();
    if (dir === 'r') { ctx.moveTo(x + 9, y); ctx.lineTo(x, y - 4.5); ctx.lineTo(x, y + 4.5); } else { ctx.moveTo(x, y - 9); ctx.lineTo(x - 4.5, y); ctx.lineTo(x + 4.5, y); }
    ctx.closePath(); ctx.fill();
  }
  function penDot(x, y, color) { D.glow(x, y, 15, color, 0.7); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
  function curT() { return clamp(S.t, 0, TMAX); }
  function cursorLine(x, y1, y2) {
    if (!(S.state === 'running' || S.state === 'preroll') || S.t < 0) return;
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(93,104,121,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.restore();
  }
  function stairs(X, Y, st, col) {
    if (st.p <= 0.01) return;
    const x0 = X(st.t0), y0 = Y(st.d0), x1 = X(st.t0 + st.dt), y1 = Y(st.d0 + st.dd);
    const p = st.p, p1 = clamp01(p * 2), p2 = clamp01(p * 2 - 1);
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * p1, y0); if (p2 > 0) ctx.lineTo(x1, y0 + (y1 - y0) * p2); ctx.stroke(); ctx.restore();
    if (p1 > 0.6) pillL(st.lh, (x0 + x1) / 2, y0 + 14 * FS, '#fff', col, 12);
    if (p2 > 0.6) pillL(st.lv, x1 + 8 * FS, (y0 + y1) / 2, '#fff', col, 12, 'left');
  }
  function drawDG() {
    const r = Lc.dg; if (r.a < 0.02) return;
    const g = S.dg, lab2 = S.view === 'lab2', p = dgPlot(r);
    const X = (t) => p.x + t / 6 * p.w, Y = (d) => p.y + p.h - d / 24 * p.h;
    panelStart(r); panelCard(r, '📈 시간–이동 거리 그래프');
    const base = ctx.globalAlpha, ga = clamp01((S.rm - 0.8) / 0.2);
    ctx.globalAlpha = base * ga;
    // 격자
    for (let t = 0; t <= 6; t++) { ctx.strokeStyle = '#e1e8f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(t), p.y); ctx.lineTo(X(t), p.y + p.h); ctx.stroke(); }
    for (let d = 0; d <= 24; d += 3) { ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(p.x, Y(d)); ctx.lineTo(p.x + p.w, Y(d)); ctx.stroke(); }
    // 축
    ctx.strokeStyle = AXIS; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w + 6, p.y + p.h); ctx.stroke(); axisArrow(p.x + p.w + 6, p.y + p.h, 'r');
    for (let t = 0; t <= 6; t++) txt(String(t), X(t), p.y + p.h + 18 * FS, 12, AXIS, 'center');
    txt('시간 (s)', p.x + p.w / 2, p.y + p.h + 38 * FS, 13, AXIS, 'center');
    ctx.save(); ctx.translate(r.x + 14, p.y + p.h / 2); ctx.rotate(-Math.PI / 2); txt('이동 거리 (m)', 0, 0, 13, AXIS, 'center'); ctx.restore();
    // 세로 줄자(축)
    if (S.rm >= 0.999) {
      drawTape(p.x - 11, (Y(0) + Y(24)) / 2, -Math.PI / 2, Y(0) - Y(24), 18, { from: 0, to: 24, span: 24 }, false);
      for (let d = 0; d <= 24; d += 3) txt(String(d), p.x - 24, Y(d) + 4, 12, AXIS, 'right');
    }
    // B·C 안내
    const inLab2Other = lab2 && S.mode === 'lab' && S.car !== 'A';
    if (inLab2Other) {
      pillL('B·C처럼 속력이 변하는 운동은', p.x + p.w / 2, p.y + p.h * 0.36, 'rgba(255,255,255,.92)', '#6b7382', 13);
      pillL('오른쪽 시간–속력 그래프로 분석해요', p.x + p.w / 2, p.y + p.h * 0.36 + 28 * FS, 'rgba(255,255,255,.92)', '#6b7382', 13);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(p.x - 4, p.y - 8, p.w + 12, p.h + 12); ctx.clip();
    // 표시점(1단계 ‘점 옮기기’)
    if (!g.live) {
      for (let k = 0; k <= 6; k++) {
        if (k === 0 || g.placed[k]) {
          const age = S.clock - (g.placed[k] || -9), pop = RM || age > 0.35 ? 1 : SciSim.ease.outBack(clamp01(age / 0.35));
          if (!g.lines.length || k === 0) marker('circle', X(k), Y(3 * k), 5.5 * pop + (k === 0 ? 0 : 0), COL.A, '#fff');
          else marker('circle', X(k), Y(3 * k), 5.5 * pop, COL.A, '#fff');
        }
      }
    }
    // 선
    const shown = inLab2Other ? [] : g.lines;
    shown.forEach((ln) => {
      const cur = !!ln.latest, a = cur ? 1 : 0.35;
      if (ln.end <= 0.001) return;
      const ex = X(ln.end), ey = Y(ln.v * ln.end);
      ctx.save(); ctx.globalAlpha = base * ga * a; ctx.strokeStyle = COL.A; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(ex, ey); ctx.stroke();
      if (ln.dots) for (let k = 0; k <= 6; k++) {
        if (k > ln.end + 1e-6) break;
        const age = S.clock - (ln.pop[k] == null ? -9 : ln.pop[k]), pop = RM || age > 0.35 ? 1 : SciSim.ease.outBack(clamp01(age / 0.35));
        marker('circle', X(k), Y(ln.v * k), 5 * pop, COL.A, '#fff');
      }
      if (ln.pen) penDot(ex, ey, COL.A);
      ctx.restore();
      if (!cur && ln.end > 5.9 && ln.v > 0) pillL(fnum(ln.v) + ' m/s', Math.min(ex + 4, p.x + p.w - 30), clamp(ey, p.y + 12, p.y + p.h - 12), 'rgba(255,255,255,.9)', COL.A, 12, 'right');
    });
    // 계단
    g.steps.forEach((st) => stairs(X, Y, st, st.col || '#1b2333'));
    // 별
    if (g.showStars) g.stars.forEach((s) => {
      const sx = X(s.t), sy = Y(s.d);
      if (s.hit) { D.check(sx, sy, 11, clamp01((S.clock - s.at) / 0.4)); }
      else { D.ring(sx, sy, 13, S.clock, { color: '#f59e0b', width: 2.5 }); ctx.font = Math.round(18 * FS) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#f59e0b'; ctx.fillText('⭐', sx, sy + 6); }
      pillL('(' + s.t + '초, ' + s.d + ' m)', sx + 18, sy - 16 * FS, 'rgba(255,255,255,.92)', '#92600a', 12, 'left');
    });
    // 끌고 있는 점의 보조선
    if (S.drag && S.drag.kind === 'dot' && S.drag.overDG) {
      const dr = S.drag, t = Math.round(clamp((dr.x - p.x) / p.w * 6, 0, 6) * 10) / 10, d = Math.round(clamp((p.y + p.h - dr.y) / p.h * 24, 0, 24) * 2) / 2;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(56,103,244,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dr.x, dr.y); ctx.lineTo(dr.x, p.y + p.h); ctx.moveTo(dr.x, dr.y); ctx.lineTo(p.x, dr.y); ctx.stroke(); ctx.setLineDash([]);
      if (dr.near) { D.ring(X(dr.k), Y(3 * dr.k), 12, S.clock, { color: GREEN }); }
      pillL('(' + t.toFixed(1) + ' s, ' + d.toFixed(1) + ' m)', dr.x + 14, dr.y - 22 * FS, '#1b2333', '#fff', 12, 'left');
      if (dr.near) pillL('여기!', X(dr.k), Y(3 * dr.k) - 26 * FS, GREEN, '#fff', 12, 'center');
    }
    ctx.restore();
    cursorLine(X(curT()), p.y, p.y + p.h);
    ctx.globalAlpha = base;
    newRing(r, 'dgraph');
    ctx.restore();
  }

  function drawTable() {
    const r = Lc.tbl; if (r.a < 0.02) return;
    panelStart(r); panelCard(r, '📋 기록표');
    const x0 = r.x + 16, w = r.w - 32, top = r.y + 40 * FS, rh = (r.h - 40 * FS - 14) / 8;
    ctx.fillStyle = '#eef2f8'; rr(x0, top, w, rh, 6); ctx.fill();
    txt('시간 (s)', x0 + w * 0.25, top + rh * 0.68, 14, '#1b2333', 'center'); txt('이동 거리 (m)', x0 + w * 0.7, top + rh * 0.68, 14, '#1b2333', 'center');
    const st = S.stamps.A;
    for (let k = 0; k <= 6; k++) {
      const y = top + rh * (k + 1), s = st.find((q) => q.k === k), fl = S.dg.flashRow[k];
      const fa = fl != null ? clamp01(1 - (S.clock - fl) / 1.2) : 0;
      if (fa > 0) { ctx.fillStyle = `rgba(255,170,60,${0.5 * fa})`; rr(x0, y + 1, w, rh - 2, 6); ctx.fill(); }
      ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(x0, y + rh); ctx.lineTo(x0 + w, y + rh); ctx.stroke();
      txt(String(k), x0 + w * 0.25, y + rh * 0.7, 15, '#1b2333', 'center');
      if (s) txt(fnum(Math.round(s.x * 100) / 100), x0 + w * 0.7, y + rh * 0.7, 15, COL.A, 'center');
      else txt('', x0, y, 12);
      if (S.dg.placed[k] && !S.dg.live) txt('✓', x0 + w - 10, y + rh * 0.7, 16, GREEN, 'right');
    }
    ctx.restore();
  }

  function vgScale() { return S.view === 'drive' ? { t: 11, v: 6 } : { t: 6, v: 7 }; }
  function drawVG() {
    const r = Lc.vg; if (r.a < 0.02) return;
    const g = S.vg, sc = vgScale(), drive = S.view === 'drive', p = dgPlot(r);
    const X = (t) => p.x + t / sc.t * p.w, Y = (v) => p.y + p.h - v / sc.v * p.h;
    panelStart(r); panelCard(r, '📉 시간–속력 그래프');
    const base = ctx.globalAlpha;
    for (let t = 0; t <= sc.t; t++) { ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(t), p.y); ctx.lineTo(X(t), p.y + p.h); ctx.stroke(); }
    for (let v = 0; v <= sc.v; v++) { ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(p.x, Y(v)); ctx.lineTo(p.x + p.w, Y(v)); ctx.stroke(); }
    ctx.strokeStyle = AXIS; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w + 6, p.y + p.h); ctx.stroke();
    axisArrow(p.x + p.w + 6, p.y + p.h, 'r'); axisArrow(p.x, p.y - 8, 'u');
    for (let t = 0; t <= sc.t; t++) txt(String(t), X(t), p.y + p.h + 18 * FS, 12, AXIS, 'center');
    for (let v = 0; v <= sc.v; v++) txt(String(v), p.x - 8, Y(v) + 4, 12, AXIS, 'right');
    txt('시간 (s)', p.x + p.w / 2, p.y + p.h + 38 * FS, 13, AXIS, 'center');
    ctx.save(); ctx.translate(r.x + 14, p.y + p.h / 2); ctx.rotate(-Math.PI / 2); txt('속력 (m/s)', 0, 0, 13, AXIS, 'center'); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(p.x - 4, p.y - 6, p.w + 12, p.h + 10); ctx.clip();
    if (drive) drawVGDrive(X, Y, p);
    else {
      // 넓이(등속 운동)
      const ar = g.area, la = g.lines.A;
      if (la && la.end >= 5.99 && ar.state !== 'idle' && (S.mode !== 'lab' || S.car === 'A')) {
        const v = la.v, x1 = X(0), x2 = X(6), yT = Y(v), yB = Y(0);
        if (ar.state === 'ready') {
          ctx.setLineDash([6, 5]); ctx.strokeStyle = COL.A; ctx.lineWidth = 2; ctx.strokeRect(x1, yT, x2 - x1, yB - yT); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(56,103,244,.07)'; ctx.fillRect(x1, yT, x2 - x1, yB - yT);
          D.ring((x1 + x2) / 2, (yT + yB) / 2, 16, S.clock, { color: COL.A });
          pillL('👆 눌러 보세요', (x1 + x2) / 2, (yT + yB) / 2 + 30 * FS, '#1b2333', '#fff', 12, 'center');
        } else {
          for (let k = 0; k < 6; k++) {
            const bx = X(k), bw = X(k + 1) - X(k);
            const age = ar.k > k ? S.clock - (ar.times[k] || 0) : -1; if (age < 0) continue;
            const q = RM ? 1 : SciSim.ease.outCubic(clamp01(age / 0.22));
            const gr = ctx.createLinearGradient(0, yT, 0, yB); gr.addColorStop(0, 'rgba(56,103,244,.35)'); gr.addColorStop(1, 'rgba(56,103,244,.2)');
            ctx.fillStyle = gr; ctx.fillRect(bx + 1, yB - (yB - yT) * q, bw - 2, (yB - yT) * q);
            if (q > 0.9) txt(fnum(v) + ' m', bx + bw / 2, (yT + yB) / 2 + 5, 13, COL.A, 'center');
          }
        }
      }
      // 선
      ['A', 'B', 'C'].forEach((c) => {
        const ln = g.lines[c]; if (!ln || ln.end <= 0.001) return;
        const cur = !!ln.latest, a = cur ? 1 : 0.4;
        const v0 = c === 'A' ? ln.v : c === 'B' ? 0 : 6, sl = c === 'A' ? 0 : c === 'B' ? 1 : -1;
        const ex = X(ln.end), ey = Y(v0 + sl * ln.end);
        ctx.save(); ctx.globalAlpha = base * a; ctx.strokeStyle = COL[c]; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X(0), Y(v0)); ctx.lineTo(ex, ey); ctx.stroke();
        for (let k = 0; k <= 6; k++) {
          if (k > ln.end + 1e-6) break;
          const age = S.clock - (ln.pop[k] == null ? -9 : ln.pop[k]), pop = RM || age > 0.35 ? 1 : SciSim.ease.outBack(clamp01(age / 0.35));
          marker(SHAPE[c], X(k), Y(v0 + sl * k), 5 * pop, COL[c], '#fff');
        }
        if (ln.pen) penDot(ex, ey, COL[c]);
        ctx.restore();
        if (ln.end > 5.9) pillL(c, Math.min(ex + 6, p.x + p.w - 14), clamp(ey - (c === 'A' ? 14 : 0), p.y + 10, p.y + p.h - 10), COL[c], '#fff', 12, 'center');
      });
      // 1초 계단
      ['B', 'C'].forEach((c) => {
        const q = g.steps[c]; if (q <= 0.01) return;
        const v0 = c === 'B' ? 0 : 6, sl = c === 'B' ? 1 : -1, lab = c === 'B' ? '+1 m/s' : '−1 m/s';
        [[1, 'a'], [4, 'b']].forEach((s) => { stairs(X, Y, { t0: s[0], d0: v0 + sl * s[0], dt: 1, dd: sl, p: q, lh: '1 s', lv: lab }, COL[c]); });
      });
    }
    ctx.restore();
    cursorLine(X(drive ? clamp(S.drive.t, 0, 11) : curT()), p.y, p.y + p.h);
    if (drive) {
      const dr = S.drive;
      if (dr.phase === 'run' || dr.phase === 'done') pillL('일치도 ' + Math.round(dr.match * 100) + '%', p.x + p.w - 60 * FS, r.y + 26 * FS, dr.match >= 0.7 ? GREEN : '#5d6879', '#fff', 14, 'center');
    }
    ctx.globalAlpha = base;
    newRing(r, 'vgraph');
    ctx.restore();
  }

  function targetV(t) { return t < 3 ? t : t < 7 ? 3 : t < 10 ? 10 - t : 0; }
  function drawVGDrive(X, Y, p) {
    const dr = S.drive;
    // 목표 띠
    ctx.fillStyle = 'rgba(20,160,88,.22)'; ctx.beginPath();
    const pts = []; for (let t = 0; t <= 11.001; t += 0.1) pts.push(t);
    pts.forEach((t, i) => { const v = Math.min(6, targetV(Math.min(t, 10.0001)) + (t > 10 ? 0 : 0)) + 0.6; ctx[i ? 'lineTo' : 'moveTo'](X(t), Y(Math.min(v, 6))); });
    for (let i = pts.length - 1; i >= 0; i--) { const t = pts[i], v = Math.max(0, targetV(Math.min(t, 10.0001)) - 0.6); ctx.lineTo(X(t), Y(v)); }
    ctx.closePath(); ctx.fill();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5; ctx.beginPath();
    [0, 3, 7, 10, 11].forEach((t, i) => ctx[i ? 'lineTo' : 'moveTo'](X(t), Y(targetV(t === 10 ? 10 : t))));
    ctx.stroke(); ctx.setLineDash([]);
    // 구간 이름(힌트)
    const ha = clamp01(1 - (S.clock - dr.hintAt) / 5);
    if (ha > 0) { [['가속', 1.5, 2.6], ['유지', 5, 3.7], ['브레이크', 8.5, 2.6]].forEach((q) => pillL(q[0], X(q[1]), Y(q[2]) - 4, 'rgba(20,160,88,' + (0.92 * Math.min(1, ha * 2)) + ')', '#fff', 13, 'center')); }
    // 내 속력 선
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < dr.n; i++) {
      ctx.strokeStyle = dr.ii[i] ? GREEN : RED;
      ctx.beginPath(); ctx.moveTo(X(dr.tt[i - 1]), Y(dr.vv[i - 1])); ctx.lineTo(X(dr.tt[i]), Y(dr.vv[i])); ctx.stroke();
    }
    if (dr.phase === 'run') penDot(X(dr.t), Y(dr.v), dr.prevInBand ? GREEN : RED);
  }

  function drawFlyRuler() {
    const m = S.rm; if (m <= 0.001 || m >= 0.999) return;
    const e = SciSim.ease.inOutCubic(m), r = Lc.dg, p = dgPlot(TL.dg.h ? TL.dg : r);
    const Y = (d) => p.y + p.h - d / 24 * p.h;
    const sx = (xm(0) + xm(24)) / 2, sy = Lc.rulerY + G.ruler / 2, ex = p.x - 11, ey = (Y(0) + Y(24)) / 2;
    const slen = 24 * ppm(), elen = Y(0) - Y(24);
    const lift = Math.sin(m * Math.PI) * 18;
    drawTape(sx + (ex - sx) * e, sy + (ey - sy) * e - lift, -Math.PI / 2 * e, slen + (elen - slen) * e, G.ruler + (18 - G.ruler) * e, { from: 0, to: 24, span: 24 }, false);
  }

  /* ---------- 트랙 위 물체(점·도장 팔·자동차) ---------- */
  const stampOn = () => S.mode !== 'race' || S.stamp;
  function drawActors() {
    ['A', 'B', 'C', 'ME'].forEach((c) => {
      const ln = Lc.lane[c]; if (ln.a < 0.02) return;
      drawLaneTop(c);
      const vs = V[c], T = Lc.track, nx = xm(vs.x), wb = ln.y + G.road * 0.86;
      ctx.save();
      ctx.beginPath(); ctx.rect(T.x, ln.y - 24, T.w, G.road + G.strip + 30); ctx.clip();
      ctx.globalAlpha = ln.a; ctx.translate(ln.off || 0, 0);
      // 도장 팔
      if (stampOn() && (S.state === 'running' || S.state === 'preroll')) {
        const dotY = ln.y + G.road + 3 + (G.strip - 4) * 0.52, age = S.clock - vs.press;
        const dy = age >= 0 && age < 0.16 ? 2 * (age < 0.08 ? age / 0.08 : 1 - (age - 0.08) / 0.08) : 0;
        if (nx > T.x + 30) {
          ctx.strokeStyle = '#6b7382'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx - 2 * CS, wb - 12 * CS); ctx.lineTo(nx - 2 * CS, dotY - 7 + dy); ctx.stroke();
          ctx.fillStyle = COL[c]; ctx.beginPath(); ctx.arc(nx - 2 * CS, dotY - 7 + dy, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      drawCar(c, nx, wb, { cues: S.cues && (S.view !== 'race' || S.mode !== 'race') });
      // 이동 거리 알약
      if (S.state !== 'ready' || (S.mode === 'drive' && S.drive.phase !== 'ready')) {
        const x = c === 'ME' ? S.drive.x : posOf(c, S.t, S.vA);
        if (x >= -0.01 && vs.alpha > 0.8) pillL(f1(Math.max(0, x)) + ' m', nx - 23 * CS, ln.y + 14 * FS, 'rgba(255,255,255,.9)', '#1b2333', 13, 'center');
      }
      ctx.restore();
    });
  }

  /* ---------- 화면 위 표시 (스톱워치 · 속력계 · 프로그램 카드 · 배너) ---------- */
  const needle = new SciSim.Spring(0, { stiffness: 140, damping: 15 });
  function drawHUD() {
    const T = Lc.track, w = 146 * FS, h = 34 * FS, x = T.x + T.w / 2 - w / 2, y = T.y + 7;
    const dr = S.drive, isDrive = S.mode === 'drive';
    // 스톱워치
    const sc = 1 + (S.swPulse || 0) * 0.08;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); }, { blur: 8, y: 2 });
    let label;
    if (isDrive) label = dr.phase === 'ready' ? '⏱ 0.0 s' : '⏱ ' + f1(clamp(dr.t, 0, 11)) + ' s';
    else if (S.state === 'preroll') label = '⏱ 곧 출발';
    else if (S.state === 'done') label = '⏸ ' + f1(S.t) + ' s';
    else label = '⏱ ' + f1(Math.max(0, S.t)) + ' s';
    ctx.font = mono(17); ctx.fillStyle = S.state === 'done' && !isDrive ? '#92600a' : '#1b2333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1); ctx.textBaseline = 'alphabetic';
    ctx.restore();
    const ga = 1 - (S.clock - S.goAt) / 0.9;
    if (ga > 0 && !isDrive) pillL('출발!', x + w + 36 * FS, y + h / 2, 'rgba(242,107,58,' + clamp01(ga * 1.5) + ')', '#fff', 14, 'center');
    // 속력계
    if (S.view !== 'race' && (has('speedo'))) drawGauge(T);
    // 프로그램 카드
    if (S.view === 'lab2' && S.mode === 'lab') {
      const pg = S.prog[S.car], cw = PHONE ? 236 : 196, ch = PHONE ? 34 : 44, cx = T.x + 12, cy = T.y + (PHONE ? 56 : 7);
      const k = Math.abs(Math.cos(pg.flip * Math.PI)), back = pg.flip > 0.5;
      ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(Math.max(0.02, k), 1);
      D.shadow(() => { ctx.fillStyle = back ? '#fff' : '#eef2f8'; rr(-cw / 2, -ch / 2, cw, ch, 10); ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = COL[S.car]; ctx.lineWidth = 2.5; rr(-cw / 2, -ch / 2, cw, ch, 10); ctx.stroke();
      txt(back ? PROG[S.car] : '❓ ' + S.car + '의 주행 프로그램', 0, 5 * FS, PHONE ? 11.5 : 13, back ? COL[S.car] : '#5d6879', 'center');
      ctx.restore();
    }
    // 배너
    if (S.bannerY > -50) {
      const bw = 330 * FS, bh = 38 * FS;
      D.shadow(() => { ctx.fillStyle = '#1b2333'; rr(T.x + T.w / 2 - bw / 2, S.bannerY, bw, bh, bh / 2); ctx.fill(); }, { blur: 12, y: 4 });
      txt('📸 6.0초 — A·B·C 모두 18 m!', T.x + T.w / 2, S.bannerY + bh / 2 + 5 * FS, 16, '#fff', 'center');
    }
  }
  function drawGauge(T) {
    const r = 44 * (PHONE ? 1.1 : 1), cx = T.x + T.w - r - 26, cy = T.y + Lc.skyH - 8;
    const v = clamp(needle.value, 0, 8);
    ctx.save();
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.arc(cx, cy, r + 8, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 2 });
    const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#22c55e'); g.addColorStop(0.55, '#facc15'); g.addColorStop(1, '#ef4444');
    ctx.strokeStyle = g; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r - 6, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); ctx.lineTo(cx + Math.cos(a) * (r - 19), cy + Math.sin(a) * (r - 19)); ctx.stroke(); if (i % 2 === 0) txt(String(i), cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28) + 4, 10, '#5d6879', 'center'); }
    const a = Math.PI + v / 8 * Math.PI;
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const cv = S.mode === 'drive' ? S.drive.v : currentV();
    pillL(f1(cv) + ' m/s', cx - r - 54 * FS, cy - 12 * FS, '#1b2333', '#fff', 14, 'center');
  }
  function currentV() {
    if (S.mode === 'drive') return S.drive.v;
    if (S.state === 'ready') return 0;
    return velOf(S.car, S.t, S.vA);
  }

  /* ---------- 카드 트레이 · 돋보기 · 카드 끌어 놓기 ---------- */
  const cardObjs = CARDS.map((c) => Object.assign({ x: 0, y: 0, lift: 0, mode: 'follow', placed: null, sx: 0, sy: 0 }, c));
  const cardSize = () => (PHONE ? { w: 200, h: 48 } : { w: 150, h: 40 });
  function cardHome(i) {
    const tr = Lc.tray, cs = cardSize();
    if (PHONE) return { x: tr.x + 14, y: tr.y + 16 + i * (cs.h + 14) };
    return { x: tr.x + 14 + i * (cs.w + 12), y: tr.y + tr.h / 2 - cs.h / 2 };
  }
  function slotRect(c) {
    const ln = Lc.lane[c], x = xm(19.2), w = Math.min(140 * (PHONE ? 0.8 : 1), xm(24.2) - x), h = 36 * FS;
    return { x, y: ln.y + (G.road - h) / 2, w, h };
  }
  function drawTray() {
    const tr = Lc.tray; if (S.view !== 'race' || tr.a < 0.02 || tr.h < 20) return;
    ctx.save();
    if (PHONE) { D.shadow(() => { ctx.fillStyle = '#fff'; rr(tr.x, tr.y, tr.w, tr.h, 14); ctx.fill(); }, { blur: 12, y: 4 }); }
    else { ctx.fillStyle = 'rgba(234,242,250,.95)'; rr(tr.x + 6, tr.y, tr.w - 12, tr.h, 12); ctx.fill(); }
    // 돋보기 (결승선 ×3)
    const mr = Math.min(56, tr.h / 2 - 8), mx = tr.x + tr.w - mr - 28, my = tr.y + tr.h / 2;
    const pa = clamp01(S.photo);
    if (pa > 0.01) {
      ctx.save(); ctx.globalAlpha = pa; ctx.translate(mx, my); const sc = RM ? 1 : SciSim.ease.outBack(pa); ctx.scale(sc, sc);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, mr + 5, 0, Math.PI * 2); ctx.fill(); }, { blur: 10, y: 3 });
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#4b5563'; ctx.fillRect(-mr, -mr, mr * 2, mr * 2);
      checker(-4, -mr, 8, mr * 2, 12);
      ['A', 'B', 'C'].forEach((c, i) => {
        const yy = (i - 1) * mr * 0.58;
        ctx.fillStyle = COL[c]; rr(-mr, yy - 11, mr - 2, 22, 7); ctx.fill();
        ctx.fillStyle = '#fff7b0'; ctx.beginPath(); ctx.arc(-6, yy - 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-6, yy + 6, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 12px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(c, -mr * 0.55, yy + 4);
      });
      ctx.restore();
      ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      txt('결승선 ×3', mx, my + mr + 16, 12, '#5d6879', 'center');
    } else if (!S.cardsOn) {
      txt('🔍 결승선 사진이 이곳에 나타나요', tr.x + tr.w / 2, tr.y + tr.h / 2 + 5, 14, '#8a95a6', 'center');
    }
    ctx.restore();
  }
  function drawCards() {
    if (!S.cardsOn || S.view !== 'race') return;
    const cs = cardSize();
    // 빈 칸
    ['A', 'B', 'C'].forEach((c) => {
      const sl = slotRect(c), st = S.slots[c], dx = shakeX(st.shake);
      ctx.save(); ctx.translate(dx, 0);
      if (!st.ok) {
        ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(sl.x, sl.y, sl.w, sl.h, 10); ctx.fill();
        ctx.setLineDash([6, 5]); ctx.strokeStyle = S.sel ? COL[c] : '#8a95a6'; ctx.lineWidth = 2; rr(sl.x, sl.y, sl.w, sl.h, 10); ctx.stroke(); ctx.setLineDash([]);
        txt('이 자동차는?', sl.x + sl.w / 2, sl.y + sl.h / 2 + 5, 13, '#5d6879', 'center');
        if (S.sel) D.ring(sl.x + sl.w / 2, sl.y + sl.h / 2, sl.h * 0.7, S.clock, { color: COL[c], width: 2 });
      } else {
        ctx.strokeStyle = COL[c]; ctx.lineWidth = 3; rr(sl.x, sl.y, sl.w, sl.h, 10); ctx.stroke();
      }
      ctx.restore();
    });
    // 카드
    const order = cardObjs.slice().sort((a, b) => (a.mode === 'drag' ? 1 : 0) - (b.mode === 'drag' ? 1 : 0));
    order.forEach((cd) => {
      const lift = cd.lift || 0, sc = 1 + 0.06 * lift, k = cd.shrink || 0;
      const sl = cd.placed ? slotRect(cd.placed) : null;
      const w = sl ? cs.w + (sl.w - cs.w) * k : cs.w, h = sl ? cs.h + (sl.h - cs.h) * k : cs.h;
      ctx.save(); ctx.translate(cd.x + cs.w / 2, cd.y + cs.h / 2); ctx.scale(sc, sc);
      const sel = S.sel === cd;
      D.shadow(() => { ctx.fillStyle = cd.placed ? '#fff' : '#e5eaf2'; rr(-w / 2, -h / 2, w, h, 10); ctx.fill(); }, { blur: 6 + 12 * lift, y: 2 + 5 * lift });
      ctx.strokeStyle = cd.placed ? COL[cd.placed] : sel ? '#f26b3a' : '#c3ccda'; ctx.lineWidth = sel || cd.placed ? 3 : 1.5; rr(-w / 2, -h / 2, w, h, 10); ctx.stroke();
      txt(cd.text, 0, 5 * FS, 15 - 2 * k, '#1b2333', 'center');
      ctx.restore();
      if (cd.placed) D.check(cd.x + cs.w / 2 + w / 2 - 2, cd.y + cs.h / 2 - h / 2 + 2, 9 * FS * clamp01((S.clock - (cd.okAt || 0)) / 0.3 + 0.2), clamp01((S.clock - (cd.okAt || 0)) / 0.4));
    });
  }

  /* ---------- 달리기 제어 ---------- */
  const runCars = () => (S.mode === 'race' ? ['A', 'B', 'C'] : S.mode === 'drive' ? ['ME'] : [S.car]);
  function addStamp(c, k, quiet) {
    S.stamps[c].push({ k, x: posOf(c, k, S.vA), born: quiet ? -9 : S.clock });
    if (!quiet) { V[c].press = S.clock; }
  }
  function setBr(c, n, a, col) { const b = S.br[c]; b.n = n; b.a = a; b.col = col || null; }
  function clearStamps(cars) { (cars || ['A', 'B', 'C', 'ME']).forEach((c) => { S.stamps[c] = []; setBr(c, 0, 0); }); }
  function resetCars() {
    ['A', 'B', 'C', 'ME'].forEach((c) => { const v = V[c]; v.x = 0; v.v = 0; v.a = 0; v.alpha = 1; v.tilt.value = 0; v.tilt.velocity = 0; v.tilt.target = 0; v.brakeL = 0; });
    needle.target = 0;
  }
  function setReady() {
    S.state = 'ready'; S.t = 0; S.run = null; S.photo = 0; S.bannerY = -80;
    resetCars(); S.flashAt = -9;
    if (S.dg.cur) S.dg.cur.pen = false; if (S.vg.cur) S.vg.cur.pen = false;
    S.dg.cur = null; S.vg.cur = null;
  }
  function newLine(list, v, extra) {
    let ln = list.find((l) => l.v === v);
    if (!ln) { ln = { v, end: 0, pop: [], pen: true, dots: true }; list.push(ln); }
    ln.end = 0; ln.pop = []; ln.pen = true; ln.dots = true; if (extra) Object.assign(ln, extra);
    list.forEach((l) => { l.latest = l === ln; });
    return ln;
  }
  function startRun() {
    if (S.state === 'preroll' || S.state === 'running') return;
    if (S.mode === 'drive') { startDrive(); return; }
    const cars = runCars(), c0 = cars[0];
    S.run = { cars };
    clearStamps(cars);
    S.t = S.mode === 'race' ? -1 : t0Of(c0);
    S.state = S.t < 0 ? 'preroll' : 'running';
    S.photo = 0; S.bannerY = -80; S.swAt = S.clock;
    cars.forEach((c) => { const v = V[c]; v.alpha = (c === 'B' && S.mode === 'race') ? 1 : 0; v.x = posOf(c, S.t, S.vA); v.v = velOf(c, S.t, S.vA); v.tilt.value = 0; v.tilt.target = 0; });
    if (S.mode === 'lab') {
      if (S.view === 'lab2' && S.car === 'A' && S.dg.live === false) S.dg.live = true;
      if (S.dg.live && S.car === 'A') { S.dg.cur = newLine(S.dg.lines, S.vA); } else S.dg.cur = null;
      if (S.view === 'lab2') {
        const prev = S.vg.lines[S.car];
        S.vg.lines[S.car] = { v: S.car === 'A' ? S.vA : 0, end: 0, pop: [], pen: true, latest: true };
        ['A', 'B', 'C'].forEach((q) => { if (q !== S.car && S.vg.lines[q]) S.vg.lines[q].latest = false; });
        S.vg.cur = S.vg.lines[S.car];
        if (S.car === 'A') S.vg.area = { state: 'idle', k: 0, times: [], doneAt: -9, arrowP: 0 };
        S.vg.steps[S.car] = 0;
        if (S.car !== 'A') S.prog[S.car].flip = 0;
        if (prev) { /* 같은 조건으로 다시 달리면 그 선만 바꾼다 */ }
      }
      S.dg.flashRow = {};
      setBr('A', 0, 0);
    }
    if (S.t >= 0) onSecond(0);
    updateCtl();
  }
  function onSecond(k) {
    if (k === 0) { Sound.tone(880, 0.12, 'sine', 0.1); S.goAt = S.clock; } else Sound.tick();
    S.swPulse = 1;
    if (stampOn()) {
      S.run.cars.forEach((c) => addStamp(c, k));
      Sound.tone(520, 0.04, 'triangle', 0.05);
    }
    if (S.dg.cur) S.dg.cur.pop[k] = S.clock;
    if (S.vg.cur) S.vg.cur.pop[k] = S.clock;
    if (S.mode === 'lab' && S.car === 'A') S.dg.flashRow[k] = S.clock;
  }
  function hitStar(s) {
    s.hit = true; s.at = S.clock;
    const p = starXY(s);
    if (p) parts.burst(p.x, p.y, { count: 12, colors: ['#ffd84d', '#f59e0b', '#fff3b0'], shape: 'star', speed: 190, life: 0.9 });
    Sound.success();
    if (S.dg.stars.every((q) => q.hit)) {
      setTimeout(() => {
        S.dg.steps = [{ t0: 1, d0: 4, dt: 1, dd: 4, p: 0, lh: '1 s', lv: '+4 m', col: '#1b2333' }, { t0: 3, d0: 3, dt: 1, dd: 1, p: 0, lh: '1 s', lv: '+1 m', col: '#1b2333' }];
        S.dg.steps.forEach((st, i) => SciSim.tween(st, { p: 1 }, { duration: 0.8, ease: 'outCubic', delay: i * 0.9 }));
      }, 700);
    }
  }
  function starXY(s) {
    const r = TL.dg; if (!r || !r.h) return null; const p = dgPlot(r);
    return { x: p.x + s.t / 6 * p.w, y: p.y + p.h - s.d / 24 * p.h };
  }
  function advance(dt) {
    const prev = S.t;
    S.t = Math.min(TMAX, S.t + dt);
    if (S.state === 'preroll' && S.t >= 0) S.state = 'running';
    for (let k = Math.floor(prev + 1e-9) + 1; k <= Math.floor(S.t + 1e-9); k++) if (k >= 0) onSecond(k);
    const te = Math.max(0, S.t);
    if (S.dg.cur) S.dg.cur.end = te;
    if (S.vg.cur) S.vg.cur.end = te;
    if (S.view === 'lab1' && S.dg.showStars && S.dg.cur) S.dg.stars.forEach((s) => { if (!s.hit && S.t >= s.t - 1e-9 && S.vA * s.t === s.d) hitStar(s); });
    if (S.t >= TMAX) finishRun();
  }
  function finishRun() {
    S.t = TMAX; S.state = 'done';
    if (S.dg.cur) { S.dg.cur.end = TMAX; S.dg.cur.pen = false; }
    if (S.vg.cur) { S.vg.cur.end = TMAX; S.vg.cur.pen = false; }
    if (S.mode === 'race') {
      S.cnt.race++; if (S.stamp) S.cnt.stampRace++;
      S.flashAt = S.clock; Sound.tone(1300, 0.05, 'square', 0.07); Sound.tone(900, 0.07, 'square', 0.07, 0.08);
      S.photo = 0.001; tweenPhoto();
      S.bannerY = -50;
      SciSim.tween(S, { bannerY: Lc.track.y + 6 }, { duration: 0.6, ease: 'outBack', onDone: () => { setTimeout(() => SciSim.tween(S, { bannerY: -80 }, { duration: 0.5, ease: 'inOutCubic' }), 3200); } });
    } else if (S.mode === 'lab') {
      const c = S.car; S.cnt['run' + c]++; S.runs[c]++;
      if (S.view === 'lab2') {
        if (c === 'A') { S.vg.area.state = 'ready'; }
        else {
          SciSim.tween(S.vg.steps, { [c]: 1 }, { duration: 0.8, ease: 'outCubic', delay: 0.3 });
          SciSim.tween(S.prog[c], { flip: 1 }, { duration: 0.5, ease: 'inOutSine', delay: 0.6 }); S.prog[c].done = true;
        }
      }
      if (S.view === 'lab1' && S.dg.showStars) S.dg.stars.forEach((s) => { if (!s.hit && S.vA * s.t === s.d) hitStar(s); });
      Sound.tone(660, 0.1, 'triangle', 0.08);
    }
    updateCtl();
  }
  function tweenPhoto() { SciSim.tween(S, { photo: 1 }, { duration: 0.5, ease: 'linear' }); }

  /* ---------- 운전 모드 (STEP 4) ---------- */
  function startDrive() {
    const d = S.drive;
    d.phase = 'count'; d.cnt = 3; d.cntT = 0; d.t = 0; d.x = 0; d.v = 0; d.inT = 0; d.match = 0; d.n = 0; d.res = null; d.prevInBand = true;
    clearStamps(['ME']); resetCars(); V.ME.alpha = 1; S.state = 'running'; S.t = 0;
    Sound.tone(440, 0.12, 'sine', 0.1);
    updateCtl();
  }
  function driveStep(dt) {
    const d = S.drive;
    if (d.phase === 'count') {
      d.cntT += dt;
      if (d.cntT >= 0.6) { d.cntT -= 0.6; d.cnt--; if (d.cnt >= 1) Sound.tone(440, 0.12, 'sine', 0.1); else { d.phase = 'run'; d.t = 0; Sound.tone(880, 0.14, 'sine', 0.1); S.goAt = S.clock; d.lastSample = -1; addStamp('ME', 0); S.stamps.ME[0].x = 0; sample(0); } }
      return;
    }
    if (d.phase !== 'run') return;
    const n = Math.ceil(dt * 120), h = dt / n;
    for (let i = 0; i < n; i++) {
      const prevT = d.t;
      let a = 0;
      if (S.pedal.brake) a = -1; else if (S.pedal.gas) a = 1;
      d.v = clamp(d.v + a * h, 0, 5);
      if (d.v >= 5 - 1e-9 && a > 0) a = 0;
      d.a = (d.v <= 0 && a < 0) ? 0 : a;
      d.x += d.v * h; d.t += h;
      const tv = targetV(d.t), inb = Math.abs(d.v - tv) <= 0.6;
      d.prevInBand = inb;
      if (d.t <= 10) d.inT += inb ? h : 0;
      for (let k = Math.floor(prevT + 1e-9) + 1; k <= Math.floor(d.t + 1e-9); k++) { Sound.tick(); S.swPulse = 1; S.stamps.ME.push({ k, x: d.x, born: S.clock }); V.ME.press = S.clock; }
      if (d.x >= 24) { d.x = 24; endDrive(); return; }
      if (d.t >= 11) { d.t = 11; endDrive(); return; }
    }
    d.match = d.inT / Math.min(10, Math.max(d.t, 0.001));
    if (d.t - (d.lastSample || 0) >= 0.05 - 1e-9 && d.n < 235) sample(d.t);
    V.ME.a = d.a;
  }
  function sample(t) { const d = S.drive; d.lastSample = t; d.tt[d.n] = t; d.vv[d.n] = S.drive.v; d.ii[d.n] = Math.abs(d.v - targetV(t)) <= 0.6 ? 1 : 0; d.n++; }
  function endDrive() {
    const d = S.drive;
    d.phase = 'done'; S.state = 'done';
    d.match = d.inT / 10;
    const pct = Math.round(d.match * 100);
    if (d.match > d.best) d.best = d.match;
    d.res = { pct, x: d.x, v: d.v, parked: d.v < 0.05 && Math.abs(d.x - 21) <= 1, at: S.clock };
    S.cnt.drive++;
    V.ME.a = 0;
    if (d.match >= 0.7) { Sound.success(); const p = Lc.vg; parts.burst(p.x + p.w / 2, p.y + p.h / 2, { count: 26, speed: 230 }); }
    else Sound.fail();
    if (d.res.parked) { const T = Lc.track; parts.burst(xm(21) + 10, Lc.lane.ME.y + G.road / 2, { count: 20, speed: 160 }); }
    updateCtl();
  }
  function drawDriveOverlay() {
    const d = S.drive; if (S.mode !== 'drive') return;
    const T = Lc.track;
    if (d.phase === 'count' || (d.phase === 'run' && S.clock - S.goAt < 0.7)) {
      const cx = T.x + T.w / 2, cy = Lc.vg.a > 0.5 ? Lc.vg.y + Lc.vg.h * 0.45 : T.y + T.h / 2;
      let s, k;
      if (d.phase === 'count') { s = String(d.cnt); k = d.cntT / 0.6; } else { s = '출발!'; k = (S.clock - S.goAt) / 0.7; }
      const sc = 1 + 0.4 * (1 - SciSim.ease.outCubic(clamp01(k * 2))), al = d.phase === 'count' ? 1 - k * 0.5 : 1 - k;
      ctx.save(); ctx.globalAlpha = clamp01(al); ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.font = '900 ' + Math.round(96 * FS) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.strokeText(s, 0, 30); ctx.fillStyle = s === '출발!' ? '#14a058' : '#f26b3a'; ctx.fillText(s, 0, 30);
      ctx.restore();
    }
    if (d.phase === 'done' && d.res) {
      const r = Lc.vg, w = 330 * FS, h = 118 * FS, x = r.x + r.w / 2 - w / 2, age = S.clock - d.res.at, k = RM ? 1 : SciSim.ease.outBack(clamp01(age / 0.4));
      const y = r.y + 44 * FS;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k);
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.97)'; rr(-w / 2, -h / 2, w, h, 16); ctx.fill(); }, { blur: 18, y: 6 });
      const ok = d.res.pct >= 70;
      ctx.strokeStyle = ok ? GREEN : '#f59e0b'; ctx.lineWidth = 3; rr(-w / 2, -h / 2, w, h, 16); ctx.stroke();
      txt(ok ? '일치도 ' + d.res.pct + '%  🎉 성공!' : '일치도 ' + d.res.pct + '%', 0, -h / 2 + 36 * FS, 22, ok ? GREEN : '#92600a', 'center');
      if (!ok) txt('그래프를 다시 읽고 도전!', 0, -h / 2 + 62 * FS, 15, '#5d6879', 'center');
      txt('정차 위치 ' + f1(d.res.x) + ' m (주차선 21 m)', 0, -h / 2 + (ok ? 66 : 88) * FS, 15, '#1b2333', 'center');
      if (d.res.parked) txt('🅿️ 정확히 주차!', 0, -h / 2 + 100 * FS, 16, '#3867f4', 'center');
      ctx.restore();
    }
  }

  /* ---------- 프레임 갱신 ---------- */
  function updateCars(dt) {
    ['A', 'B', 'C', 'ME'].forEach((c) => {
      const v = V[c];
      let x = v.x, vel = v.v, a = 0, moving = false;
      if (c === 'ME') { if (S.mode === 'drive' && S.drive.phase !== 'ready') { x = S.drive.x; vel = S.drive.v; a = S.drive.phase === 'run' ? (S.drive.a || 0) : 0; moving = S.drive.phase === 'run'; } }
      else if (S.run && S.run.cars.indexOf(c) >= 0 && S.state !== 'ready') { x = posOf(c, S.t, S.vA); vel = velOf(c, S.t, S.vA); a = S.state === 'done' ? 0 : accOf(c, S.t); moving = S.state !== 'done'; }
      v.x = x; v.v = vel; v.a = a; v.moving = moving;
      if (moving) v.wheel += vel * ppm() / (6.5 * CS) * dt;
      v.alpha = SciSim.approach(v.alpha, 1, dt, 6);
      const cues = S.cues && S.view !== 'race';
      v.tilt.target = (cues || c === 'ME') ? -ACC_DEG * a : 0;
      v.tilt.update(dt);
      v.brakeL = SciSim.approach(v.brakeL, (cues || c === 'ME') && a < -0.3 ? 1 : 0, dt, 14);
    });
    const shown = S.mode === 'drive' ? 'ME' : S.mode === 'race' ? 'A' : S.car;
    needle.target = S.view === 'race' ? 0 : (S.mode === 'drive' ? S.drive.v : currentV());
    needle.update(dt);
  }
  function step(dt) {
    S.clock += dt;
    approachObj(Lc, TL, dt, 9);
    if (S.state === 'preroll' || (S.state === 'running' && S.mode !== 'drive')) advance(dt);
    if (S.mode === 'drive') driveStep(dt);
    updateCars(dt); updateCards(dt);
    S.swPulse = Math.max(0, (S.swPulse || 0) - dt / 0.18);
    // 괄호 값 알파
    ['A', 'B', 'C', 'ME'].forEach((c) => { const b = S.br[c]; if (b.target != null) b.a = SciSim.approach(b.a, b.target, dt, 8); });
    // 넓이 칠하기
    const ar = S.vg.area;
    if (ar.state === 'filling') {
      ar.acc = (ar.acc || 0) + dt;
      if (ar.acc >= 0.22 && ar.k < 6) { ar.acc = 0; ar.times[ar.k] = S.clock; ar.k++; Sound.tick(); setBr('A', ar.k, 1, COL.A); if (ar.k === 6) { ar.state = 'done'; ar.doneAt = S.clock; ar.acc = 0; onAreaDone(); } }
    }
    parts.update(dt);
  }
  function onAreaDone() {
    Sound.success();
    const p = TL.vg; if (p && p.h) { const pp = dgPlot(p); parts.burst(pp.x + pp.w / 2, pp.y + pp.h / 2, { count: 16, colors: [COL.A, '#ffd84d', '#fff'], speed: 160 }); }
    SciSim.tween(S.prog.A, { flip: 1 }, { duration: 0.5, ease: 'inOutSine', delay: 0.7 }); S.prog.A.done = true;
  }

  /* ---------- 전체 그리기 ---------- */
  function draw() {
    view.clear('#f4f8fd');
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    drawTrack();
    drawTray();
    drawCards();
    drawHUD();
    drawDG(); drawTable(); drawVG();
    drawFlyRuler();
    drawDriveOverlay();
    // 지금 끌고 있는 점
    const dr = S.drag;
    if (dr && dr.kind === 'dot') {
      D.shadow(() => marker('circle', dr.x, dr.y, 9, COL.A, '#fff'), { blur: 10, y: 4 });
    }
    if (S.conn) {
      const a = 1 - (S.clock - S.conn.at) / 1.0;
      if (a <= 0) S.conn = null;
      else { const h = dotHome(S.conn.k), r = TL.dg, pl = dgPlot(r); ctx.save(); ctx.globalAlpha = a * 0.8; ctx.setLineDash([4, 5]); ctx.strokeStyle = COL.A; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(pl.x + S.conn.k / 6 * pl.w, pl.y + pl.h - 3 * S.conn.k / 24 * pl.h); ctx.stroke(); ctx.restore(); }
    }
    if (S.fl) marker('circle', S.fl.x, S.fl.y, 7, COL.A, '#fff');
    parts.draw(ctx);
    // 셔터 플래시
    const fa = 1 - (S.clock - S.flashAt) / 0.35;
    if (fa > 0 && !RM) { ctx.fillStyle = `rgba(255,255,255,${0.7 * fa})`; rr(Lc.track.x, Lc.track.y, Lc.track.w, Lc.track.h, 14); ctx.fill(); }
  }

  /* ---------- 앞 단계 기록 불러오기 (새로고침·단계 건너뛰기 대비) ---------- */
  function resetDG() {
    const g = S.dg; g.lines = []; g.cur = null; g.steps = []; g.placed = {}; g.live = false; g.showStars = false; g.msg = ''; g.flashRow = {};
    g.stars.forEach((s) => { s.hit = false; s.at = -9; });
    S.stamps.A.forEach((s) => { s.hidden = false; });
  }
  function resetVG() {
    S.vg.lines = { A: null, B: null, C: null }; S.vg.cur = null; S.vg.steps = { B: 0, C: 0 };
    S.vg.area = { state: 'idle', k: 0, times: [], doneAt: -9, arrowP: 0 };
    ['A', 'B', 'C'].forEach((c) => { S.prog[c].flip = 0; S.prog[c].done = false; });
  }
  function loadNote() { toast('📋 앞 단계의 기록을 불러왔어요', '', 2200); }
  function ensureStampedRace() {
    if (S.mode === 'race' && S.state === 'done' && ['A', 'B', 'C'].every((c) => S.stamps[c].length === 7)) return;
    prep({ mode: 'race', view: 'race', stamp: true });
    S.run = { cars: ['A', 'B', 'C'] }; S.t = TMAX; S.state = 'done'; S.vA = 3;
    ['A', 'B', 'C'].forEach((c) => { for (let k = 0; k <= 6; k++) addStamp(c, k, true); });
    S.photo = 1; loadNote(); updateCtl();
  }
  function fillLineA(v, latest) {
    const ln = { v, end: TMAX, pop: [], pen: false, dots: true, latest: !!latest };
    for (let k = 0; k <= 6; k++) ln.pop[k] = -9;
    S.dg.lines.push(ln); return ln;
  }
  function ensurePlottedA3() {
    if (S.view === 'lab1' && S.car === 'A' && S.dg.lines.some((l) => l.v === 3 && l.end >= 6) && S.dg.steps.length) return;
    prep({ mode: 'lab', view: 'lab1', car: 'A', vA: 3, stamp: true });
    resetDG();
    for (let k = 1; k <= 6; k++) S.dg.placed[k] = -9;
    const ln = fillLineA(3, true); ln.dots = false;
    S.dg.steps = stepsA3(1);
    S.run = { cars: ['A'] }; S.t = TMAX; S.state = 'done';
    for (let k = 0; k <= 6; k++) addStamp('A', k, true);
    S.stamps.A.forEach((s) => { s.hidden = s.k > 0; });
    loadNote(); updateCtl();
  }
  function stepsA3(p) { return [{ t0: 0, d0: 0, dt: 1, dd: 3, p, lh: '1 s', lv: '+3 m', col: '#1b2333' }, { t0: 3, d0: 9, dt: 1, dd: 3, p, lh: '1 s', lv: '+3 m', col: '#1b2333' }]; }
  function ensureBC() {
    if (S.view === 'lab2' && S.vg.lines.B && S.vg.lines.C) return;
    if (S.view !== 'lab2') prep({ mode: 'lab', view: 'lab2', car: 'A', vA: 3, stamp: true, cues: true });
    if (!S.vg.lines.A) S.vg.lines.A = { v: 3, end: TMAX, pop: [-9, -9, -9, -9, -9, -9, -9], pen: false, latest: false };
    ['B', 'C'].forEach((c) => { S.vg.lines[c] = { v: 0, end: TMAX, pop: [-9, -9, -9, -9, -9, -9, -9], pen: false, latest: false }; S.vg.steps[c] = 1; S.prog[c].flip = 1; S.prog[c].done = true; });
    loadNote();
  }

  /* ---------- 상태 준비 ---------- */
  let ptype = null;
  function prep(o) {
    S.mode = o.mode; S.view = o.view;
    if (o.car) S.car = o.car;
    if (o.vA) S.vA = o.vA;
    if (o.stamp != null) S.stamp = o.stamp;
    S.cues = !!o.cues; S.cardsOn = false; S.sel = null;
    S.drive.phase = 'ready'; S.drive.res = null; S.drive.n = 0; S.drive.t = 0; S.drive.x = 0; S.drive.v = 0; S.drive.match = 0;
    S.pedal.gas = S.pedal.brake = false;
    clearStamps(); setReady();
    cardObjs.forEach((c) => { c.placed = null; c.mode = 'follow'; c.shrink = 0; c.lift = 0; const h = cardHome(cardObjs.indexOf(c)); c.x = h.x; c.y = h.y; });
    ['A', 'B', 'C'].forEach((c) => { S.slots[c].ok = false; });
    relayout();
    if (S.view === 'lab1' || S.view === 'lab2') { if (S.rm < 0.999 && !S.rmTween) { S.rmTween = true; SciSim.tween(S, { rm: 1 }, { duration: 0.9, ease: 'inOutCubic', onDone: () => { S.rmTween = false; } }); } }
    else if (S.view === 'race') { S.rm = 0; S.rmTween = false; }
    updateCtl();
  }

  /* ---------- 포인터: 카드 · 점 · 넓이 ---------- */
  const view$ = view;
  const inRect = (p, r, m) => p.x >= r.x - (m || 0) && p.x <= r.x + r.w + (m || 0) && p.y >= r.y - (m || 0) && p.y <= r.y + r.h + (m || 0);
  function dotHome(k) { const ln = Lc.lane.A; return { x: xm(3 * k), y: ln.y + G.road + 3 + (G.strip - 4) * 0.52 }; }
  function dotsActive() { return S.view === 'lab1' && S.mode === 'lab' && S.car === 'A' && !S.dg.live && S.state === 'done' && S.vA === 3; }
  function areaRect() {
    const r = Lc.vg, p = dgPlot(r), la = S.vg.lines.A; if (!la) return null;
    const X = (t) => p.x + t / 6 * p.w, Y = (v) => p.y + p.h - v / 7 * p.h;
    return { x: X(0), y: Y(la.v), w: X(6) - X(0), h: Y(0) - Y(la.v) };
  }
  function cardHit(p) {
    const cs = cardSize();
    for (let i = cardObjs.length - 1; i >= 0; i--) { const c = cardObjs[i]; if (!c.placed && p.x >= c.x && p.x <= c.x + cs.w && p.y >= c.y && p.y <= c.y + cs.h) return c; }
    return null;
  }
  function tryPlace(cd, lane) {
    const st = S.slots[lane], sl = slotRect(lane), cs = cardSize();
    if (st.ok) { cd.mode = 'follow'; return false; }
    if (cd.ans === lane) {
      st.ok = true; cd.placed = lane; cd.okAt = S.clock; cd.mode = 'tween';
      Sound.tick(); Sound.success();
      SciSim.tween(cd, { x: sl.x + (sl.w - cs.w) / 2, y: sl.y + (sl.h - cs.h) / 2, shrink: 1 }, { duration: 0.35, ease: 'outBack', onDone: () => { cd.mode = 'follow'; } });
      parts.burst(sl.x + sl.w / 2, sl.y + sl.h / 2, { count: 14, colors: [COL[lane], '#ffd84d', '#fff'], speed: 150 });
      setBr(lane, 6, 1); S.br[lane].target = 1; S.pulse[lane] = S.clock;
      return true;
    }
    cd.mode = 'follow'; st.shake = S.clock; Sound.fail();
    const k = cd.id;
    const msg = k === 'const' ? lane + '의 점 간격이 모두 같나요? 1초 동안 이동한 거리를 비교해 보세요.'
      : k === 'fast' ? (lane === 'A' ? 'A의 점 간격은 모두 3 m로 같아요.' : 'C는 같은 1초 동안 점점 덜 갔어요.')
      : (lane === 'A' ? 'A의 간격은 일정해요.' : 'B는 같은 1초 동안 점점 더 멀리 갔어요.');
    toast('🤔 ' + msg, 'bad', 2600);
    return false;
  }
  function slotAt(p) { for (const c of ['A', 'B', 'C']) { if (inRect(p, slotRect(c), 12)) return c; } return null; }
  function placeDot(k, quiet) {
    const g = S.dg; g.placed[k] = S.clock;
    const st = S.stamps.A.find((s) => s.k === k); if (st) st.hidden = true;
    const r = TL.dg, pl = dgPlot(r);
    if (!quiet) { parts.burst(pl.x + k / 6 * pl.w, pl.y + pl.h - 3 * k / 24 * pl.h, { count: 8, speed: 110, life: 0.6, colors: [COL.A, '#ffd84d', '#fff'] }); Sound.tick(); }
    if (!quiet) S.conn = { k, at: S.clock };
    if (Object.keys(g.placed).length >= 6) { onAllPlaced(); }
  }
  function onAllPlaced() {
    const g = S.dg; if (g.lines.length) return;
    const ln = { v: 3, end: 0, pop: [], pen: true, dots: false, latest: true }; g.lines.push(ln);
    SciSim.tween(ln, { end: TMAX }, { duration: 0.9, ease: 'inOutCubic', delay: 0.3, onDone: () => { ln.pen = false; } });
    g.steps = stepsA3(0);
    g.steps.forEach((st, i) => SciSim.tween(st, { p: 1 }, { duration: 0.8, ease: 'outCubic', delay: 1.4 + i * 0.9 }));
    Sound.success();
  }
  function dropDot(d, p) {
    const r = Lc.dg, pl = dgPlot(r);
    const t = (d.x - pl.x) / pl.w * 6, dist = (pl.y + pl.h - d.y) / pl.h * 24, k = d.k;
    const inDG = inRect({ x: d.x, y: d.y }, r, 0);
    const near = inDG && Math.abs(t - k) <= 0.3 && Math.abs(dist - 3 * k) <= 1.2;
    const fl = { x: d.x, y: d.y };
    S.drag = null;
    if (near) {
      S.fl = fl; const tx = pl.x + k / 6 * pl.w, ty = pl.y + pl.h - 3 * k / 24 * pl.h;
      SciSim.tween(fl, { x: tx, y: ty }, { duration: 0.3, ease: 'outBack', onDone: () => { S.fl = null; placeDot(k); } });
      S.dg.msg = '';
    } else {
      S.fl = fl; const h = dotHome(k);
      SciSim.tween(fl, { x: h.x, y: h.y }, { duration: 0.4, ease: 'outCubic', onDone: () => { S.fl = null; const st = S.stamps.A.find((s) => s.k === k); if (st) st.hidden = false; } });
      Sound.fail();
      S.dg.msg = '이 점은 ' + k + '초일 때 ' + 3 * k + ' m예요. 가로축 ' + k + ', 세로축 ' + 3 * k + '인 곳에 놓아요.'; S.dg.msgAt = S.clock;
    }
  }
  function fillArea() {
    const ar = S.vg.area;
    if (ar.state === 'ready') { ar.state = 'filling'; ar.acc = 0.22; ar.k = 0; ar.times = []; setBr('A', 0, 1, COL.A); S.br.A.target = 1; return true; }
    return false;
  }
  SciSim.pointer(view, {
    down(p, e) {
      if (S.view === 'race' && S.cardsOn) {
        const cd = cardHit(p);
        if (cd) {
          cd.mode = 'drag'; S.drag = { kind: 'card', card: cd, ox: p.x - cd.x, oy: p.y - cd.y, sx: p.x, sy: p.y, moved: false };
          SciSim.tween(cd, { lift: 1 }, { duration: 0.12 });
          return true;
        }
        const sc = slotAt(p);
        if (S.sel && sc) { const cd2 = S.sel; S.sel = null; tryPlace(cd2, sc); return false; }
        S.sel = null;
      }
      if (dotsActive()) {
        for (let k = 1; k <= 6; k++) {
          if (S.dg.placed[k]) continue;
          const h = dotHome(k);
          if (Math.hypot(p.x - h.x, p.y - h.y) <= 16 && S.stamps.A.some((s) => s.k === k)) {
            S.drag = { kind: 'dot', k, x: p.x, y: p.y };
            const st = S.stamps.A.find((s) => s.k === k); st.hidden = true;
            S.dg.flashRow[k] = S.clock; Sound.click();
            return true;
          }
        }
      }
      if (S.view === 'lab2' && S.mode === 'lab' && Lc.vg.a > 0.5 && inRect(p, Lc.vg, 0)) {
        if (S.car !== 'A') { toast('넓이 보기는 등속 운동(A)에서 해 봐요', '', 2000); return false; }
        const ar = areaRect();
        if (ar && inRect(p, ar, 0)) {
          if (S.vg.area.state === 'ready') fillArea();
          else if (S.vg.area.state === 'idle') toast('먼저 A를 달리게 해요', '', 1800);
        }
      }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.kind === 'card') {
        if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
        d.card.x = p.x - d.ox; d.card.y = p.y - d.oy;
      } else if (d.kind === 'dot') {
        d.x = p.x; d.y = p.y;
        const r = Lc.dg, pl = dgPlot(r);
        d.overDG = inRect(p, r, 0);
        const t = (p.x - pl.x) / pl.w * 6, dist = (pl.y + pl.h - p.y) / pl.h * 24;
        d.near = d.overDG && Math.abs(t - d.k) <= 0.3 && Math.abs(dist - 3 * d.k) <= 1.2;
      }
    },
    up(p) {
      const d = S.drag; if (!d) return;
      if (d.kind === 'card') {
        const cd = d.card; S.drag = null;
        SciSim.tween(cd, { lift: 0 }, { duration: 0.15 });
        if (!d.moved) { cd.mode = 'follow'; S.sel = S.sel === cd ? null : cd; Sound.click(); return; }
        const sc = slotAt({ x: cd.x + cardSize().w / 2, y: cd.y + cardSize().h / 2 });
        if (sc) tryPlace(cd, sc); else cd.mode = 'follow';
      } else if (d.kind === 'dot') { dropDot(d, p); }
    },
    hover(p) {
      if (S.view === 'race' && S.cardsOn && cardHit(p)) return 'grab';
      if (dotsActive() && [1, 2, 3, 4, 5, 6].some((k) => !S.dg.placed[k] && Math.hypot(p.x - dotHome(k).x, p.y - dotHome(k).y) <= 16)) return 'grab';
      if (S.view === 'lab2' && S.vg.area.state === 'ready') { const ar = areaRect(); if (ar && inRect(p, ar, 0)) return 'pointer'; }
      return 'default';
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; if (!t) return;
      const p = view.toLocal(t);
      const onCard = S.view === 'race' && S.cardsOn && (cardHit(p) || slotAt(p));
      const onDot = dotsActive() && [1, 2, 3, 4, 5, 6].some((k) => !S.dg.placed[k] && Math.hypot(p.x - dotHome(k).x, p.y - dotHome(k).y) <= 22);
      if (onCard || onDot) e.preventDefault();
    }, { passive: false });
  }
  function updateCards(dt) {
    const cs = cardSize();
    cardObjs.forEach((cd, i) => {
      if (cd.mode === 'follow') {
        const tg = cd.placed ? (() => { const sl = slotRect(cd.placed); return { x: sl.x + (sl.w - cs.w) / 2, y: sl.y + (sl.h - cs.h) / 2 }; })() : cardHome(i);
        cd.x = SciSim.approach(cd.x, tg.x, dt, cd.placed ? 20 : 11); cd.y = SciSim.approach(cd.y, tg.y, dt, cd.placed ? 20 : 11);
        if (RM) { cd.x = tg.x; cd.y = tg.y; }
      }
    });
  }

  /* ---------- 조작 (도구 막대) ---------- */
  let F = new Set();
  const goBtn = $('#goBtn'), stampBtn = $('#stampBtn'), speedSeg = $('#speedSeg'), carSeg = $('#carSeg'), gasBtn = $('#gasBtn'), brakeBtn = $('#brakeBtn'), modeSeg = $('#modeSeg');
  const hasF = (n) => F.has(n) || !!(game && game.free);
  function updateCtl() {
    const busy = S.state === 'preroll' || S.state === 'running' || (S.mode === 'drive' && S.drive.phase === 'count');
    const free = !!(game && game.free);
    goBtn.disabled = busy;
    goBtn.textContent = busy ? '⏳ ' + (S.mode === 'drive' ? '주행 중…' : '주행 중…') : S.state === 'done' ? (S.mode === 'drive' ? '↺ 다시 도전' : '↺ 다시 출발') : (S.mode === 'drive' ? '▶ 도전 시작' : '▶ 출발');
    stampBtn.hidden = !(S.mode === 'race' && hasF('stamp'));
    stampBtn.setAttribute('aria-pressed', S.stamp ? 'true' : 'false'); stampBtn.disabled = busy;
    speedSeg.hidden = !(S.mode === 'lab' && hasF('speed') && S.car === 'A' && (S.view === 'lab1' || free));
    $$('button', speedSeg).forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.vA); b.disabled = busy || !!S.lockSpeed; b.title = S.lockSpeed ? '미션 3에서 바꿀 수 있어요' : ''; });
    carSeg.hidden = !(S.mode === 'lab' && hasF('cars'));
    $$('button', carSeg).forEach((b) => { b.classList.toggle('on', b.dataset.car === S.car); b.disabled = busy || !!S.lockCar; });
    const dv = !(S.mode === 'drive' && hasF('drive'));
    gasBtn.hidden = dv; brakeBtn.hidden = dv;
    modeSeg.hidden = !free;
    $$('button', modeSeg).forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
  }
  function setCar(c) {
    if (c === S.car) return;
    S.car = c; clearStamps(); setReady(); relayout(); updateCtl();
  }
  function setMode(m) {
    S.mode = m; S.view = m === 'race' ? 'race' : m === 'drive' ? 'drive' : 'lab2';
    S.cues = m !== 'race'; if (m === 'lab') { S.car = 'A'; S.dg.live = true; }
    prep({ mode: m, view: S.view, car: S.car, stamp: S.stamp, cues: S.cues });
    S.lockSpeed = false; S.lockCar = false;
    if (m === 'lab') { resetDG(); S.dg.live = true; resetVG(); }
    updateCtl();
  }
  goBtn.addEventListener('click', () => { Sound.click(); startRun(); });
  stampBtn.addEventListener('click', () => { if (stampBtn.disabled) return; Sound.click(); S.stamp = !S.stamp; updateCtl(); });
  $$('button', speedSeg).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); S.vA = +b.dataset.v; clearStamps(['A']); setReady(); updateCtl(); }));
  $$('button', carSeg).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); setCar(b.dataset.car); }));
  $$('button', modeSeg).forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  function pedal(btn, key) {
    const set = (v) => { S.pedal[key] = v; btn.classList.toggle('down', v); };
    btn.addEventListener('pointerdown', (e) => { try { btn.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ } set(true); e.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, () => set(false)));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  pedal(gasBtn, 'gas'); pedal(brakeBtn, 'brake');
  window.addEventListener('keydown', (e) => {
    if (S.mode !== 'drive' || gasBtn.hidden) return;
    if (e.key === 'ArrowUp') { S.pedal.gas = true; gasBtn.classList.add('down'); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { S.pedal.brake = true; brakeBtn.classList.add('down'); e.preventDefault(); }
    else if (e.key === ' ' && !goBtn.disabled && document.activeElement && !/BUTTON|INPUT/.test(document.activeElement.tagName)) { e.preventDefault(); Sound.click(); startRun(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') { S.pedal.gas = false; gasBtn.classList.remove('down'); } else if (e.key === 'ArrowDown') { S.pedal.brake = false; brakeBtn.classList.remove('down'); }
  });
  window.addEventListener('blur', () => { S.pedal.gas = S.pedal.brake = false; gasBtn.classList.remove('down'); brakeBtn.classList.remove('down'); });

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }

  /* ---------- 읽음 칸 ---------- */
  const rT = $('#rT'), rD = $('#rD'), rV = $('#rV');
  let rlast = '';
  function readouts() {
    const dr = S.mode === 'drive';
    const t = dr ? clamp(S.drive.t, 0, 11) : Math.max(0, S.t);
    let d = '—', v = '—';
    if (S.mode === 'lab' || dr) {
      const c = dr ? 'ME' : S.car;
      d = f1(Math.max(0, V[c].x)) + '<small>m</small>'; v = f1(V[c].v) + '<small>m/s</small>';
    }
    const key = f1(t) + d + v;
    if (key === rlast) return; rlast = key;
    rT.innerHTML = f1(t) + '<small>s</small>'; rD.innerHTML = d; rV.innerHTML = v;
  }

  /* ---------- 퀴즈 그림 ---------- */
  const T12 = (x, y, s, a, rot) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" font-size="12" fill="#5d6879"' + (rot ? ' transform="rotate(-90 ' + x + ' ' + y + ')"' : '') + '>' + s + '</text>';
  const SVG_A = '<svg viewBox="0 0 300 180" role="img" aria-label="자동차 A의 시간–이동 거리 그래프" style="max-width:340px;width:100%;background:#fff;border:1px solid #dde4ef;border-radius:10px">' +
    '<g stroke="#e8edf5">' + [0, 1, 2, 3, 4, 5, 6].map((t) => '<line x1="' + (44 + 40 * t) + '" y1="12" x2="' + (44 + 40 * t) + '" y2="146"/>').join('') + '</g>' +
    '<line x1="44" y1="146" x2="292" y2="146" stroke="#5d6879" stroke-width="2"/><line x1="44" y1="146" x2="44" y2="10" stroke="#5d6879" stroke-width="2"/>' +
    '<polyline points="44,146 284,26" fill="none" stroke="#3867f4" stroke-width="3"/>' +
    [0, 1, 2, 3, 4, 5, 6].map((t) => '<circle cx="' + (44 + 40 * t) + '" cy="' + (146 - 6.67 * 3 * t).toFixed(1) + '" r="4" fill="#3867f4"/>').join('') +
    [0, 1, 2, 3, 4, 5, 6].map((t) => T12(44 + 40 * t, 162, t)).join('') + T12(160, 176, '시간 (s)') +
    [0, 6, 12, 18].map((d) => T12(38, (150 - 6.67 * d).toFixed(1), d, 'end')).join('') + T12(12, 80, '이동 거리 (m)', 'middle', true) + '</svg>';
  const SVG_BC = '<svg viewBox="0 0 300 180" role="img" aria-label="자동차 B와 C의 시간–속력 그래프" style="max-width:340px;width:100%;background:#fff;border:1px solid #dde4ef;border-radius:10px">' +
    '<g stroke="#e8edf5">' + [0, 1, 2, 3, 4, 5, 6].map((t) => '<line x1="' + (44 + 40 * t) + '" y1="26" x2="' + (44 + 40 * t) + '" y2="146"/>').join('') + [0, 1, 2, 3, 4, 5, 6].map((v) => '<line x1="44" y1="' + (146 - 20 * v) + '" x2="284" y2="' + (146 - 20 * v) + '"/>').join('') + '</g>' +
    '<line x1="44" y1="146" x2="292" y2="146" stroke="#5d6879" stroke-width="2"/><line x1="44" y1="146" x2="44" y2="14" stroke="#5d6879" stroke-width="2"/>' +
    '<line x1="44" y1="146" x2="284" y2="26" stroke="#f26b3a" stroke-width="3.5"/><line x1="44" y1="26" x2="284" y2="146" stroke="#8b5cf6" stroke-width="3.5"/>' +
    '<circle cx="164" cy="86" r="5" fill="#fff" stroke="#1b2333" stroke-width="2"/>' +
    '<text x="276" y="20" font-size="14" font-weight="800" fill="#f26b3a">B</text><text x="276" y="140" font-size="14" font-weight="800" fill="#8b5cf6">C</text>' +
    [0, 1, 2, 3, 4, 5, 6].map((t) => T12(44 + 40 * t, 162, t)).join('') + T12(160, 176, '시간 (s)') + [0, 2, 4, 6].map((v) => T12(38, 150 - 20 * v, v, 'end')).join('') + T12(12, 80, '속력 (m/s)', 'middle', true) + '</svg>';
  const SVG_SUB = '<svg viewBox="0 0 340 180" role="img" aria-label="지하철의 시간–속력 그래프" style="max-width:380px;width:100%;background:#fff;border:1px solid #dde4ef;border-radius:10px">' +
    '<text x="170" y="14" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">지하철의 시간–속력 그래프</text>' +
    '<line x1="44" y1="146" x2="332" y2="146" stroke="#5d6879" stroke-width="2"/><line x1="44" y1="146" x2="44" y2="24" stroke="#5d6879" stroke-width="2"/>' +
    '<g stroke="#8a95a6" stroke-dasharray="4 4"><line x1="99" y1="40" x2="99" y2="146"/><line x1="264" y1="40" x2="264" y2="146"/><line x1="44" y1="40" x2="99" y2="40"/></g>' +
    '<polyline points="44,146 99,40 264,40 319,146" fill="none" stroke="#f26b3a" stroke-width="3.5" stroke-linejoin="round"/>' +
    [[0, 44], [20, 99], [80, 264], [100, 319]].map((q) => T12(q[1], 162, q[0])).join('') + T12(190, 176, '시간 (s)') + T12(38, 44, '20', 'end') + T12(38, 150, '0', 'end') + T12(12, 90, '속력 (m/s)', 'middle', true) + '</svg>';
  const miniSVG = (pts, name) => '<figure><svg viewBox="0 0 96 72"><line x1="14" y1="58" x2="90" y2="58" stroke="#5d6879" stroke-width="1.5"/><line x1="14" y1="58" x2="14" y2="8" stroke="#5d6879" stroke-width="1.5"/><polyline points="' + pts + '" fill="none" stroke="#f26b3a" stroke-width="3" stroke-linecap="round"/></svg>' + name + '</figure>';

  /* ---------- 단계 준비 (새로고침으로 단계 중간에서 이어도 같은 화면이 되도록 미션 setup에서도 부른다) ---------- */
  function enterLevel(li) {
    S.lv = li;
    if (li === 0) { prep({ mode: 'race', view: 'race', stamp: false }); S.lockSpeed = false; S.lockCar = false; resetDG(); resetVG(); }
    else if (li === 1) { prep({ mode: 'lab', view: 'lab1', car: 'A', vA: 3, stamp: true }); resetDG(); resetVG(); S.lockSpeed = true; S.lockCar = true; }
    else if (li === 2) { prep({ mode: 'lab', view: 'lab2', car: 'A', vA: 3, stamp: true, cues: true }); resetDG(); S.dg.live = true; fillLineA(3, false); resetVG(); S.lockSpeed = true; S.lockCar = true; }
    else { prep({ mode: 'drive', view: 'drive', stamp: true, cues: true }); S.lockSpeed = false; S.lockCar = false; }
    updateCtl();
  }
  function ensureLevel(li) { if (S.lv !== li || (game && game.free)) { if (S.lv !== li) enterLevel(li); } }
  /* ---------- 미션 ---------- */
  const raceStatus = () => {
    if (S.state === 'ready') return '▶ <b>출발</b>을 눌러요.';
    if (S.state === 'preroll') return '⏳ 곧 출발해요…';
    if (S.state === 'running') {
      let best = 'C', bx = -99; ['A', 'B', 'C'].forEach((c) => { const x = posOf(c, S.t, S.vA); if (x > bx + 1e-6) { bx = x; best = c; } });
      return '⏳ 주행 중… <b>' + f1(Math.max(0, S.t)) + ' s</b>' + (S.t > 0.05 ? ' · 맨 앞: <b>' + best + '</b>' : '');
    }
    return '🏁 6.0 s · A·B·C 모두 <b>18 m</b>';
  };
  const placedN = () => Object.keys(S.dg.placed).length;
  const levels = [
    {
      title: '세 로봇 자동차의 위치 기록', short: '위치 기록', icon: '📍', phase: '관찰',
      features: ['race', 'stamp'],
      intro: '<p class="si-q">❓ 탐구 질문: 세 로봇 자동차가 출발선을 동시에 지나 6초 뒤 18 m 결승선에 함께 도착했어요. 세 자동차는 똑같이 움직였을까?</p>' +
        '<p>로봇 자동차 A·B·C에는 서로 다른 <b>주행 프로그램</b>이 숨어 있어요. 주행 시험을 하고 <b>1초마다 위치를 기록</b>해서 각 자동차가 어떻게 움직였는지 알아내 봐요. (출발선을 지나는 순간부터 시간을 재요. A와 C는 달려오면서 출발선을 지나고, B는 출발선에 서 있다가 출발해요.)</p>',
      setup() { enterLevel(0); showHint('▶ 출발을 눌러 주행 시험을 시작해요', 6000); },
      recap: '1초마다 찍은 점 사이 간격(1초 동안 이동한 거리)으로 운동을 구별해요. 간격이 일정하면 속력이 일정한 <b>등속 운동</b>이에요.',
      summary: '<ul><li><b>운동의 기록</b>: 일정한 시간 간격으로 물체의 위치를 기록한다. (시간기록계, 다중 섬광 사진, 운동 센서, 동영상 분석)</li><li>점 사이 간격 = 그 시간 동안 <b>이동한 거리</b> → 간격이 넓을수록 빠르다.</li><li>간격이 일정 → 속력이 일정한 <b>등속 운동</b> · 점점 넓어짐 → 점점 빨라짐 · 점점 좁아짐 → 점점 느려짐</li></ul>',
      missions: [
        {
          title: '주행 시험 지켜보기',
          goal: '<b>▶ 출발</b>을 눌러 세 로봇 자동차가 결승선에 닿을 때까지 지켜보세요. 달리는 동안 누가 앞서나요?',
          hint: '도구 막대의 파란 <b>▶ 출발</b> 버튼을 눌러요.',
          setup() { ensureLevel(0); snap(); },
          check: () => since('race') > 0 && S.state === 'done',
          status: raceStatus, hold: 0.8,
          explain: '세 자동차 모두 <b>6초 동안 18 m</b>를 가서 함께 도착했어요. 이동 거리와 걸린 시간으로 구한 속력(18 m ÷ 6 s = 3 m/s)도 모두 같아요. 그런데 달리는 동안에는 C가 계속 앞섰고 B가 가장 뒤에 있었죠? <b>달리는 동안의 운동</b>을 알려면 일정한 시간 간격으로 위치를 기록해야 해요.',
        },
        {
          title: '1초마다 위치 기록하기',
          goal: '<b>📍 1초마다 점 찍기</b>를 켜고 다시 출발하세요. 자동차가 1초마다 아래 기록 띠에 점을 찍어요.',
          hint: '도구 막대의 <b>📍 1초마다 점 찍기</b>를 눌러 켠 다음 <b>↺ 다시 출발</b>!',
          setup() { ensureLevel(0); S.stamp = false; snap(); updateCtl(); showHint('📍 점 찍기를 켜고 다시 출발해요', 6000); },
          check: () => since('stampRace') > 0 && S.stamp && S.state === 'done',
          status: () => mark(S.stamp) + ' 📍 점 찍기 켜기 · ' + (S.state === 'ready' ? '⬜ 출발' : S.state === 'done' ? '🏁 끝' : '⏳ 주행 중…'), hold: 0.8,
          explain: '기록 띠의 점 사이 간격은 <b>1초 동안 이동한 거리</b>예요. 같은 시간 동안 더 멀리 갔다면 그만큼 빨랐다는 뜻이죠. 실제 실험에서는 <b>시간기록계, 다중 섬광 사진, 운동 센서, 동영상 분석</b> 같은 도구로 이런 기록을 얻어요.',
        },
        {
          title: '점 간격으로 운동 알아내기',
          goal: '기록 띠의 <b>점 간격</b>을 보고, 아래 카드 3장을 알맞은 자동차 칸으로 끌어다 놓으세요.',
          hint: 'A의 점 간격은 모두 3 m로 같아요. 간격이 점점 넓어지는 자동차와 점점 좁아지는 자동차를 찾아보세요.',
          setup() { ensureLevel(0); ensureStampedRace(); S.cardsOn = true; S.sel = null; cardObjs.forEach((c, i) => { c.placed = null; c.mode = 'follow'; c.shrink = 0; const h = cardHome(i); c.x = h.x; c.y = h.y; }); ['A', 'B', 'C'].forEach((c) => { S.slots[c].ok = false; setBr(c, 0, 0); S.br[c].target = 0; }); updateCtl(); },
          check: () => ['A', 'B', 'C'].every((c) => S.slots[c].ok), manual: false,
          status: () => ['A', 'B', 'C'].map((c) => mark(S.slots[c].ok) + ' ' + c).join(' · '), hold: 0.5,
          explain: 'A처럼 같은 시간 동안 같은 거리를 이동하여 <b>속력이 일정한 운동</b>을 <b>등속 운동</b>이라고 해요. B는 1초 동안 이동한 거리가 점점 커지므로 <b>점점 빨라지는 운동</b>, C는 점점 작아지므로 <b>점점 느려지는 운동</b>이에요.',
        },
      ],
    },
    {
      title: '등속 운동의 시간–이동 거리 그래프', short: '등속 운동', icon: '📈', phase: '실험',
      features: ['dgraph', 'speed'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자동차 A는 1초마다 같은 거리(3 m)를 가는 <b>등속 운동</b>을 한다는 것을 알았어요.</div><p>이번에는 A의 기록을 <b>시간–이동 거리 그래프</b>로 직접 나타내고, 그래프의 <b>모양</b>과 <b>기울기</b>가 무엇을 뜻하는지 알아봐요.</p>',
      setup() { enterLevel(1); },
      recap: '등속 운동의 시간–이동 거리 그래프는 <b>원점을 지나는 기울어진 직선</b>이고, <b>기울기가 속력</b>을 나타내요.',
      summary: '<table class="mini"><tr><th>시간 (s)</th><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr><tr><th>이동 거리 (m)</th><td>0</td><td>3</td><td>6</td><td>9</td><td>12</td><td>15</td><td>18</td></tr></table><p>등속 운동의 <b>시간–이동 거리 그래프</b> = <b>원점을 지나는 기울어진 직선</b> (이동 거리는 시간에 비례)</p><span class="formula">기울기 = 이동 거리 ÷ 걸린 시간 = 속력</span><ul><li>속력이 빠를수록 그래프가 가파르다.</li></ul>',
      missions: [
        {
          title: '점을 그래프로 옮기기',
          goal: '<b>▶ 출발</b>로 A를 달리게 한 뒤, 기록 띠의 점을 하나씩 끌어 <b>시간–이동 거리 그래프</b>의 알맞은 자리에 놓으세요. (0초 점은 이미 놓여 있어요.)',
          hint: '가로축은 <b>시간</b>, 세로축은 <b>이동 거리</b>예요. 2초 점은 기록표에서 6 m → (2 s, 6 m)에 놓아요. 끄는 동안 손가락 옆에 좌표가 보여요.',
          setup() { ensureLevel(1); S.lockSpeed = true; snap(); updateCtl(); showHint('▶ 출발! 끝나면 기록 띠의 점을 그래프로 끌어요', 6000); },
          check: () => placedN() >= 6, hold: 0.3,
          status: () => (S.state !== 'done' && placedN() === 0 ? '▶ 먼저 출발! · ' : '') + '점 옮기기 <b>' + placedN() + ' / 6</b> · ' + [1, 2, 3, 4, 5, 6].map((k) => mark(!!S.dg.placed[k]) + k + ' s').join(' ') + (S.clock - S.dg.msgAt < 6 && S.dg.msg ? '<br>🤔 ' + S.dg.msg : ''),
          explain: '점들이 <b>원점을 지나는 한 직선</b> 위에 놓였어요. 1초마다 이동 거리가 3 m씩 똑같이 늘어나기 때문이에요.',
        },
        {
          type: 'quiz', title: '그래프 모양의 뜻',
          goal: 'A의 <b>시간–이동 거리 그래프</b>는 어떤 모양이고, 무엇을 뜻할까요?',
          figure: SVG_A,
          setup() { ensureLevel(1); ensurePlottedA3(); },
          choices: ['원점을 지나는 기울어진 직선 → 이동 거리가 시간에 비례하여 늘어난다', '시간 축에 나란한 직선 → 이동 거리가 일정하다', '원점을 지나는 기울어진 직선 → 속력이 시간에 비례하여 빨라진다', '점점 가팔라지는 곡선 → 1초마다 이동 거리가 점점 늘어난다'],
          answer: 0,
          feedback: ['', '수평선이면 시간이 지나도 이동 거리가 늘지 않는 것, 즉 멈춰 있는 거예요. A는 1초마다 3 m씩 갔어요.', '세로축을 다시 보세요. ‘속력’이 아니라 ‘이동 거리’예요. 1초마다 늘어나는 거리가 3 m로 같으니 속력은 일정해요.', '점들은 휘지 않고 곧게 늘어서 있어요. 1초마다 늘어나는 거리가 3 m로 일정하기 때문이에요.'],
          explain: '등속 운동에서는 1초마다 이동 거리가 똑같이 늘어나요. 시간이 2배, 3배가 되면 이동 거리도 2배, 3배 → 이동 거리는 시간에 <b>비례</b>하고 그래프는 원점을 지나는 직선이에요. 그래프를 읽을 때는 세로축이 무엇인지 먼저 확인해요!',
        },
        {
          title: '두 별을 지나는 그래프',
          goal: '<b>🎚️ 속력</b>을 바꿔 A를 달리게 해서, 그래프가 <b>⭐(3초, 12 m)</b>와 <b>⭐(6초, 6 m)</b>를 각각 지나게 만드세요. 이번에는 <b>운동 센서</b>가 그래프를 자동으로 그려요.',
          hint: '별까지의 이동 거리를 걸린 시간으로 나누면 필요한 속력이에요. 12 m ÷ 3 s = ? , 6 m ÷ 6 s = ?',
          setup() { ensureLevel(1); ensurePlottedA3(); S.dg.live = true; S.dg.showStars = true; S.dg.stars.forEach((s) => { s.hit = false; }); S.dg.lines.forEach((l) => { l.latest = false; l.dots = true; }); S.stamps.A.forEach((s) => { s.hidden = false; }); S.lockSpeed = false; snap(); updateCtl(); },
          check: () => S.dg.stars.every((s) => s.hit), hold: 0.6,
          status: () => mark(S.dg.stars[0].hit) + ' ⭐(3초, 12 m) · ' + mark(S.dg.stars[1].hit) + ' ⭐(6초, 6 m) · 지금 속력 <b>' + S.vA + ' m/s</b>',
          explain: '⭐(3초, 12 m)는 <b>4 m/s</b>(12 ÷ 3), ⭐(6초, 6 m)는 <b>1 m/s</b>(6 ÷ 6)로 달려야 지나요. (6초, 6 m)는 높이가 낮은 별이지만 느린 속력이에요. 속력이 빠를수록 직선이 가팔라요. 시간–이동 거리 그래프의 <b>기울기 = 이동 거리 ÷ 걸린 시간 = 속력</b>이에요.',
        },
      ],
    },
    {
      title: '시간–속력 그래프로 분석하기', short: '속력 그래프', icon: '🧭', phase: '분석',
      features: ['speedo', 'vgraph', 'cars', 'area'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 등속 운동의 시간–이동 거리 그래프는 원점을 지나는 직선이고, 기울기가 속력이라는 것을 알았어요.</div><p>이번에는 <b>속력계(운동 센서)</b>로 시각마다 속력을 재어 <b>시간–속력 그래프</b>를 그려요. 속력이 변하는 B와 C의 운동은 이 그래프로 분석해요.</p>',
      setup() { enterLevel(2); },
      recap: '시간–속력 그래프에서 등속 운동은 <b>시간 축에 나란한 직선</b>(아래 넓이 = 이동 거리), 속력이 일정하게 증가하면 <b>오른쪽 위로</b>, 일정하게 감소하면 <b>오른쪽 아래로</b> 기울어진 직선이에요.',
      summary: '<div class="gshapes">' + miniSVG('14,30 90,30', '등속 운동') + miniSVG('14,56 90,12', '속력이 일정하게 증가') + miniSVG('14,12 90,56', '속력이 일정하게 감소') + '</div>' +
        '<span class="formula">(등속 운동) 그래프 아래 넓이 = 속력 × 시간 = 이동 거리</span><ul><li>그래프가 직선이면 1초마다 속력 변화량이 일정하다. (B: +1 m/s, C: −1 m/s)</li><li>두 그래프가 만나는 점 = 속력이 같은 순간 (같은 위치가 아님)</li></ul>',
      missions: [
        {
          title: '등속 운동의 시간–속력 그래프와 넓이',
          goal: 'A를 달리게 해 <b>시간–속력 그래프</b>를 그린 뒤, 그래프 아래를 눌러 <b>넓이</b>를 칠해 보세요.',
          hint: '▶ 출발 → 주행이 끝나면 시간–속력 그래프에서 직선 아래(점선 칸)를 눌러요.',
          setup() { ensureLevel(2); if (S.car !== 'A') setCar('A'); S.lockCar = true; snap(); updateCtl(); showHint('▶ 출발! A의 속력계 바늘을 지켜봐요', 6000); },
          check: () => since('runA') > 0 && S.vg.area.state === 'done', hold: 0.6,
          status: () => mark(since('runA') > 0) + ' A 달리기 · ' + mark(S.vg.area.state === 'done') + ' 넓이 칠하기',
          explain: '등속 운동의 시간–속력 그래프는 <b>시간 축에 나란한 직선</b>이에요. 1초 칸 하나의 넓이(3 m/s × 1 s = 3 m)는 기록 띠의 점 간격 하나와 같고, 전체 넓이 <b>3 m/s × 6 s = 18 m</b>는 6초 동안 <b>이동한 거리</b>예요.',
        },
        {
          title: 'B와 C의 시간–속력 그래프',
          goal: '🚗 자동차를 <b>B</b>와 <b>C</b>로 바꿔 각각 달리게 하고, 속력계 바늘과 시간–속력 그래프를 비교하세요.',
          hint: '자동차 고르기에서 <b>B</b> → ▶ 출발, 끝나면 <b>C</b> → ▶ 출발.',
          setup() { ensureLevel(2); S.lockCar = false; snap(); updateCtl(); },
          check: () => since('runB') > 0 && since('runC') > 0, hold: 0.8,
          status: () => mark(since('runB') > 0) + ' B · ' + mark(since('runC') > 0) + ' C' + (S.state === 'running' && S.car !== 'A' ? ' · ⏳ 속력 <b>' + f1(V[S.car].v) + ' m/s</b>' : ''),
          explain: 'B는 1초마다 속력이 <b>1 m/s씩 일정하게 증가</b>해 그래프가 <b>오른쪽 위로</b>, C는 1초마다 <b>1 m/s씩 일정하게 감소</b>해 <b>오른쪽 아래로</b> 기울어진 직선이 되었어요. 그래프가 직선이면 1초 동안의 속력 변화량이 일정하다는 뜻이에요.',
        },
        {
          type: 'quiz', title: '시간–속력 그래프 해석',
          goal: '자동차 B와 C의 <b>시간–속력 그래프</b>를 바르게 해석한 것은?',
          figure: SVG_BC,
          setup() { ensureLevel(2); ensureBC(); },
          choices: ['B는 1초마다 속력이 1 m/s씩 일정하게 증가하고, C는 1초마다 1 m/s씩 일정하게 감소한다.', 'C의 그래프는 오른쪽 아래로 내려가므로 C는 뒤로 움직인다.', '3초일 때 두 그래프가 만나므로 B와 C는 같은 위치에 있다.', 'B와 C의 그래프는 직선이므로 둘 다 등속 운동이다.'],
          answer: 0,
          feedback: ['', '그래프의 모양은 길의 모양이나 움직이는 방향이 아니에요. C는 계속 앞으로 가면서 속력만 줄어들어요.', '시간–속력 그래프에서 만나는 점은 <b>속력이 같다</b>는 뜻이에요. 3초일 때 B는 4.5 m, C는 13.5 m 지점에 있었어요.', '그래프가 기울어져 있으면 속력이 변하는 운동이에요. 등속 운동의 시간–속력 그래프는 시간 축에 나란해요.'],
          explain: '시간–속력 그래프가 <b>오른쪽 위로 기울어진 직선</b>이면 속력이 일정하게 증가, <b>오른쪽 아래로 기울어진 직선</b>이면 일정하게 감소하는 운동이에요. 두 그래프가 만나는 3초에는 두 자동차의 속력(3 m/s)이 같을 뿐, 위치는 달라요.',
        },
      ],
    },
    {
      title: '그래프로 생활 속 운동 해석하기', short: '그래프 해석', icon: '🕹️', phase: '적용',
      features: ['drive'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시간–속력 그래프의 모양(수평·오른쪽 위·오른쪽 아래)으로 운동을 구별하고, 등속 운동에서 그래프 아래 넓이가 이동 거리라는 것을 알았어요.</div><p>이제 생활 속 운동의 그래프를 해석하고, 그래프대로 로봇 자동차를 직접 운전해 주차선에 세워 봐요!</p>',
      setup() { enterLevel(3); },
      recap: '그래프의 <b>축</b>을 먼저 확인하고 <b>모양</b>과 <b>넓이</b>를 읽으면 생활 속 운동을 해석할 수 있고, 그래프대로 운동을 만들 수도 있어요.',
      summary: '<ul><li><b>그래프 읽는 순서</b>: ① 축 확인(시간–이동 거리? 시간–속력?) ② 모양(수평·오른쪽 위·오른쪽 아래) ③ 값(1초마다 속력 변화량, 넓이)</li><li>시간–속력 그래프가 <b>수평</b> = 속력이 일정 (멈춘 것은 속력 0)</li><li><b>오른쪽 아래로</b> 내려가는 직선 = 느려지는 운동 (뒤로 가는 것이 아님)</li><li>예: 지하철 — 출발(일정하게 증가) → 등속(20 m/s, 60 s 동안 1200 m) → 도착(일정하게 감소)</li></ul>',
      missions: [
        {
          type: 'quiz', title: '지하철의 시간–속력 그래프',
          goal: '한 역을 출발해 다음 역에 도착할 때까지 지하철의 <b>시간–속력 그래프</b>예요. 바르게 해석한 것은?',
          figure: SVG_SUB,
          setup() { ensureLevel(3); },
          choices: ['20~80초 동안 그래프가 수평이므로 지하철은 멈춰 있다.', '80~100초 동안 그래프가 내려가므로 지하철은 뒤로 움직인다.', '20~80초 동안 지하철이 이동한 거리는 1200 m이다.', '0~20초 동안 1초마다 속력이 20 m/s씩 증가한다.'],
          answer: 2,
          feedback: ['시간–속력 그래프가 수평이면 <b>속력이 일정</b>하다는 뜻이에요. 이때 지하철은 20 m/s로 달리고 있어요. 멈춰 있다면 속력이 0이어야 해요.', '그래프가 내려가는 것은 속력이 줄어든다는 뜻이에요. 지하철은 계속 앞으로 가다가 100초에 멈춰요.', '', '20초 동안 20 m/s가 늘었으니 1초마다는 20 ÷ 20 = 1 m/s씩 증가해요.'],
          explain: '20~80초는 20 m/s의 등속 운동이므로 이동 거리 = 그래프 아래 넓이 = 20 m/s × 60 s = <b>1200 m</b>예요. 0~20초는 1초마다 1 m/s씩 증가, 80~100초는 1초마다 1 m/s씩 감소하는 운동이에요.',
        },
        {
          title: '그래프대로 운전하기',
          goal: '<b>가속 페달</b>과 <b>브레이크</b>로 내 로봇 자동차의 시간–속력 그래프가 <b>초록 띠</b>를 따라가게 운전하세요(손을 떼면 속력 유지). <b>일치도 70% 이상</b>이면 성공!',
          hint: '0~3초 오른쪽 위로 → 가속 페달 3초 / 3~7초 수평 → 손 떼기 / 7~10초 오른쪽 아래로 → 브레이크 3초.',
          setup() { ensureLevel(3); S.drive.best = 0; S.drive.hintAt = -9; snap(); updateCtl(); showHint('▶ 도전 시작! 페달은 누르고 있는 동안만 작동해요', 6000); },
          check: () => S.drive.phase === 'done' && S.drive.best >= 0.7, hold: 0,
          status: () => {
            const d = S.drive;
            if (d.phase === 'run') return '⏱ ' + f1(d.t) + ' s · 속력 <b>' + f1(d.v) + ' m/s</b> · 일치도 <b>' + Math.round(d.match * 100) + '%</b>';
            if (d.phase === 'count') return '⏳ 준비… 곧 출발해요!';
            return '최고 일치도 <b>' + Math.round(d.best * 100) + '%</b> (목표 70%)';
          },
          explain: '그래프를 읽고 운동을 직접 만들었어요! <b>오른쪽 위로 기울어진</b> 구간은 속력이 일정하게 증가(가속 페달), <b>수평</b> 구간은 속력이 일정(손 떼기), <b>오른쪽 아래로 기울어진</b> 구간은 속력이 일정하게 감소(브레이크)예요. 그래프대로 달리면 주차선(21 m)에 멈춰요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'm3-motion-graph', mount: '#game', badge: '운동 그래프 분석가', homeHref: '../../index.html#g3',
    featureLabels: {
      race: '🏁 로봇 자동차 3대 주행 시험', stamp: '📍 1초마다 점 찍기', dgraph: '📈 시간–이동 거리 그래프 · 📋 기록표', speed: '🎚️ 속력 바꾸기',
      speedo: '🧭 속력계(운동 센서)', vgraph: '📉 시간–속력 그래프', cars: '🚗 자동차 고르기', area: '🟧 넓이 보기', drive: '🕹️ 그래프대로 운전하기',
    },
    onFeatures(set) { F = set; updateCtl(); },
    onHint() { S.drive.hintAt = S.clock; },
    levels,
  });

  /* ---------- 시작 ---------- */
  updateCtl();
  snapLayout();
  SciSim.loop((dt) => { step(dt); draw(); readouts(); });

  /* ---------- 디버그 (Playwright) ---------- */
  function runToEnd() { let n = 0; while ((S.state === 'preroll' || S.state === 'running') && n++ < 500) step(0.05); }
  window.MotionGraphDebug = {
    S, Lc, TL, get game() { return game; }, VW, VH,
    layout: () => JSON.parse(JSON.stringify(Lc)),
    finishRun(car) { if (S.mode === 'lab' && car && car !== S.car) setCar(car); if (S.state === 'done') { S.state = 'ready'; } startRun(); runToEnd(); },
    placeAllDots() { for (let k = 1; k <= 6; k++) if (!S.dg.placed[k]) placeDot(k, true); },
    hitStars() { S.lockSpeed = false; [4, 1].forEach((v) => { S.vA = v; clearStamps(['A']); setReady(); startRun(); runToEnd(); }); },
    fillArea() { fillArea(); let n = 0; while (S.vg.area.state !== 'done' && n++ < 100) step(0.05); },
    placeChips() { cardObjs.forEach((c) => tryPlace(c, c.ans)); },
    autoDrive() {
      S.drive.phase = 'ready'; startDrive();
      let n = 0; while (S.drive.phase !== 'done' && n++ < 3000) { const t = S.drive.t; S.pedal.gas = S.drive.phase === 'run' && t < 3; S.pedal.brake = S.drive.phase === 'run' && t >= 7 && t < 10; step(1 / 60); }
      S.pedal.gas = S.pedal.brake = false;
    },
    step, startRun, setMode, setCar, ensureStampedRace, ensurePlottedA3, ensureBC, runToEnd, dotHome, slotRect, areaRect, cardObjs, dgPlot, cardHome,
  };
})();
