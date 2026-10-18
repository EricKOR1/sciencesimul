/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 기관계의 통합적 작용 (단원 5차시)
   성취기준 [12생과01-04] 소화, 순환, 호흡, 배설 과정이 기관계의 통합적 작용으로 나타남을 신체의 생리적 변화와
   연관지어 추론할 수 있다.
   ① 관찰: 운동 중 몸 (안정 ↔ 30분 달리기: 심박수·호흡수·체온·땀·오줌, 측정표)
   ② 분석: 산소 운반 (심박출량 = 심박수 × 1회 박출량 ÷ 1000, 산소 소비량 = 심박출량 × 산소 함량 차 ÷ 100)
   ③ 모형: 통합 지도 (정보 그림 + 역할놀이)
   ④ 적용: 사례 추론 (고산 적응 · 빈혈 · 땀)
   ※ 신경계·내분비계는 이름만(조절은 다음 단원). 모든 값은 '교육용 가상 예시 값'.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.16 : 1;
  const TAU = Math.PI * 2;
  const P = (a, b) => (PHONE ? b : a);
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BG = '#f3f8f4', INK = '#14532d', MUTED = '#64748b';
  const mix = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));
  const rgba = (c, a) => SciSim.color.rgba(c, a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color: color || INK, align: align || 'center', weight: weight || 800 }, extra));
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch === ' ' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function block(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrapLines(str, maxW, size, weight);
    ls.forEach((l, i) => T(x, y + i * (lh || size * 1.35), l, size, color || INK, align || 'left', weight || 700));
    return ls.length;
  }
  function fit(str, maxW, size, weight) {
    ctx.save(); let s = size;
    while (s > 9) { ctx.font = D.font(s, weight || 800); if (ctx.measureText(str).width <= maxW) break; s -= 0.5; }
    ctx.restore(); return s;
  }
  const TF = (x, y, str, maxW, size, color, align, weight) => T(x, y, str, fit(str, maxW, size, weight), color, align, weight);
  const jong = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const eun = (w) => w + (jong(w) ? '은' : '는');
  const hit = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const card = (x, y, w, h, fill, line, r) => { D.shadow(() => { ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, r || 14).fill(); }, { blur: 7, y: 2 }); if (line) { ctx.strokeStyle = line; ctx.lineWidth = 2; rr(x, y, w, h, r || 14).stroke(); } };

  /* ---------- 자료 (교육용 가상 예시 값) ---------- */
  const REST = { name: '안정 시', icon: '🛌', hr: 70, sv: 70, rr: 14, temp: 37.0, avd: 5, co: 4.9, coR: 5, vo: 0.25, musc: 20, gut: 25, other: 55 };
  const RUN = { name: '30분 달리기', icon: '🏃', hr: 150, sv: 130, rr: 35, temp: 38.5, avd: 15, co: 19.5, coR: 20, vo: 3.0, musc: 80, gut: 5, other: 15 };
  const CASE = { rest: REST, run: RUN };
  const fmtCO = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const SW = (s) => (s < 0.1 ? '거의 없음' : s < 0.6 ? '조금 나요' : '많이 나요');
  const UR = (u) => (u > 0.9 ? '보통' : u > 0.6 ? '조금 줄어듦' : '적음');
  const ROWS = [
    { key: 'hr', name: '심박수', unit: '회/분', dir: 'up' },
    { key: 'rr', name: '호흡수', unit: '회/분', dir: 'up' },
    { key: 'temp', name: '체온', unit: '°C', dir: 'up' },
    { key: 'sweat', name: '땀', unit: '', dir: 'up' },
    { key: 'urine', name: '오줌 생성량', unit: '', dir: 'down' },
  ];
  const SYS = [
    { id: 'dig', name: '소화계', icon: '🍽️', color: '#f59e0b' },
    { id: 'res', name: '호흡계', icon: '🫁', color: '#38bdf8' },
    { id: 'cir', name: '순환계', icon: '❤️', color: '#ef4444' },
    { id: 'exc', name: '배설계', icon: '💧', color: '#a78bfa' },
  ];
  const JOBS = ['음식물을 작게 분해해 영양소를 흡수한다', '산소를 받아들이고 이산화 탄소를 내보낸다', '혈액으로 물질을 온몸에 운반한다', '혈액 속 요소·물을 걸러 몸 밖으로 내보낸다'];
  const TAKES = ['음식물', '공기(산소)', '운반할 영양소·산소·노폐물', '노폐물이 든 혈액'];
  const GIVES = ['영양소를 혈액으로', '산소를 혈액으로', '물질을 온몸의 세포와 기관계로', '오줌(요소·물)을 몸 밖으로'];
  /* 통합 지도 */
  const NODE = {
    dig: { name: '소화계', icon: '🍽️', color: '#f59e0b', x: P(120, 95), y: P(110, 110) },
    res: { name: '호흡계', icon: '🫁', color: '#38bdf8', x: P(120, 95), y: P(400, 560) },
    cir: { name: '순환계', icon: '❤️', color: '#ef4444', x: P(400, 260), y: P(255, 325) },
    exc: { name: '배설계', icon: '💧', color: '#a78bfa', x: P(680, 425), y: P(110, 110) },
    skin: { name: '피부', icon: '🌡️', color: '#fb7185', x: P(680, 425), y: P(400, 560) },
    mus: { name: '근육 세포', icon: '💪', color: '#16a34a', x: P(400, 260), y: P(462, 690) },
  };
  const EDGES = [
    { a: 'dig', b: 'cir', cargo: '영양소', col: '#f59e0b', bend: 0, lt: 0.5 },
    { a: 'res', b: 'cir', cargo: '산소 (O₂)', col: '#ef4444', bend: -1, lt: 0.4 },
    { a: 'cir', b: 'res', cargo: '이산화 탄소', col: '#3b82f6', bend: -1, lt: 0.62 },
    { a: 'cir', b: 'mus', cargo: '산소 · 영양소', col: '#ef4444', bend: 1, lt: 0.3 },
    { a: 'mus', b: 'cir', cargo: 'CO₂ · 요소 · 열', col: '#3b82f6', bend: 1, lt: 0.7 },
    { a: 'cir', b: 'exc', cargo: '요소 · 물', col: '#a78bfa', bend: 0, lt: 0.5 },
    { a: 'cir', b: 'skin', cargo: '열 · 땀(물)', col: '#fb7185', bend: 0, lt: 0.5 },
  ];
  /* 사례 추론 */
  const SLOT1 = ['호흡계', '순환계', '소화계', '배설계', '피부 (땀 분비)'];
  const CASES = {
    a: { icon: '⛰️', title: 'ⓐ 고산 지대 적응 훈련', story: '산소 분압이 낮은 높은 산에서 훈련한 선수는 몇 주 뒤 혈액 속 적혈구 수가 늘어나요.',
      ans: [0, 1, 2], s1: SLOT1,
      s2: ['오줌에 포도당이 섞여 나온다', '혈액의 산소가 부족해져 적혈구 수가 늘어난다', '소화액 분비량이 늘어난다', '혈액의 이산화 탄소가 줄어든다'],
      s3: ['소화되는 영양소가 늘어난다', '오줌 생성량이 늘어난다', '혈액이 운반하는 산소량이 늘어 근육의 세포호흡이 유지된다', '체온이 크게 낮아진다'] },
    b: { icon: '🩸', title: 'ⓑ 빈혈 환자의 쉬운 피로', story: '적혈구나 헤모글로빈이 부족한 빈혈 환자는 조금만 움직여도 쉽게 지치고 숨이 차요.',
      ans: [1, 2, 0], s1: SLOT1,
      s2: ['소화 효소가 부족해져 영양소 흡수가 막힌다', '폐에서 이산화 탄소가 너무 많이 빠져나간다', '근육 세포에 전달되는 산소가 줄어 세포호흡(에너지 생성)이 떨어진다', '콩팥이 물을 너무 많이 내보낸다'],
      s3: ['쉽게 피로하고 숨이 차며, 보상으로 호흡수·심박수가 늘어난다', '땀이 줄고 체온이 낮아진다', '오줌 생성량이 늘어난다', '배가 고파져 소화가 빨라진다'] },
    c: { icon: '💦', title: 'ⓒ 땀을 많이 흘린 뒤', story: '더운 날 오래 달려 땀을 많이 흘린 뒤에는 오줌의 양이 적어지고 색이 진해져요.',
      ans: [4, 0, 3], s1: SLOT1,
      s2: ['몸의 수분이 줄어 혈액량이 줄고, 콩팥이 물을 더 되돌려 받는다', '폐에서 물을 더 많이 흡수한다', '소화계가 물을 더 많이 만들어 낸다', '근육이 혈액 속 물을 모두 쓴다'],
      s3: ['오줌의 양이 늘고 색이 연해진다', '심장이 멈춘다', '혈액 속 산소가 늘어난다', '오줌의 양은 적어지고 더 진해진다'] },
  };
  const CASE_KEYS = ['a', 'b', 'c'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'run', clock: 0, fade: 0, hover: '', epoch: 0, msg: '', msgT: 0,
    run: { I: 0, hr: 70, rr: 14, temp: 37, sweat: 0, urine: 1, leg: 0, scroll: 0, heartPh: 0, lungPh: 0, rec: { rest: null, run: null }, dir: {}, pressed: 0, shake: 0 },
    o2: { c: 'rest', ok: { rest: false, run: false }, in: { rest: { co: '', vo: '' }, run: { co: '', vo: '' } }, g: 0, dist: { musc: 20, gut: 25, other: 55 }, flow: [], lungPh: 0, heartPh: 0, msg: '', calcTried: 0 },
    map: { links: new Set(), from: null, drag: null, msg: '', shake: 0, roles: {}, rsys: 0, flow: [], t: 0 },
    cs: { k: 'a', pick: { a: [-1, -1, -1], b: [-1, -1, -1], c: [-1, -1, -1] }, rbc: [] },
  };
  let game = null;
  function say(m, sec) { S.msg = m; S.msgT = sec || 2.8; }

  /* ======================================================
     ① 운동 중 몸
     ====================================================== */
  const RG = () => (PHONE
    ? { sceneY: 40, ground: 214, rx: 120, dials: [{ x: 86, y: 290, r: 58 }, { x: 222, y: 290, r: 58 }], therm: { x: 330, y: 244, h: 90 }, bars: { x: 14, y: 392, w: 496 }, inner: { x: 330, y: 84 } }
    : { sceneY: 12, ground: 280, rx: 175, dials: [{ x: 452, y: 124, r: 64 }, { x: 590, y: 124, r: 64 }], therm: { x: 728, y: 40, h: 140 }, bars: { x: 400, y: 240, w: 290 }, inner: { x: 318, y: 92 } });
  const TG = () => (PHONE
    ? { x: 10, y: 452, hdr: 34, rh: 44, cols: [124, 108, 108, 160], w: 500 }
    : { x: 40, y: 340, hdr: 30, rh: 34, cols: [170, 150, 150, 250], w: 720 });
  const targetOf = (I) => ({ hr: lerp(REST.hr, RUN.hr, I / 100), rr: lerp(REST.rr, RUN.rr, I / 100), temp: lerp(REST.temp, RUN.temp, I / 100), sweat: I / 100, urine: lerp(1, 0.4, I / 100) });
  function stepRun(dt) {
    const R = S.run, tg = targetOf(R.I);
    const ap = (cur, to, rate, eps) => { const v = RM ? to : SciSim.approach(cur, to, dt, rate); return Math.abs(v - to) < eps ? to : v; };
    R.hr = ap(R.hr, tg.hr, 1.7, 0.2); R.rr = ap(R.rr, tg.rr, 1.4, 0.2); R.temp = ap(R.temp, tg.temp, 0.8, 0.012);
    R.sweat = ap(R.sweat, tg.sweat, 0.9, 0.01); R.urine = ap(R.urine, tg.urine, 0.7, 0.01);
    const sp = R.I / 100;
    R.leg += dt * (R.I < 1 ? 0 : 3.2 + 9 * sp * (R.hr - 70) / 80 * 0 + 9 * sp);
    R.scroll += dt * (R.I < 1 ? 0 : 40 + 330 * sp);
    R.heartPh += dt * TAU * R.hr / 60; R.lungPh += dt * TAU * R.rr / 60;
    if (R.shake > 0) R.shake -= dt;
    const g = RG();
    if (!RM && R.sweat > 0.25 && Math.random() < dt * R.sweat * 9) {
      const hx = g.rx + 30 + sp * 16, hy = g.ground - 138 + sp * 8;
      parts.emit({ x: hx + rnd(-8, 8), y: hy + rnd(-4, 6), vx: rnd(-35, -8) - sp * 40, vy: rnd(-70, -20), life: 0.7, size: rnd(2.2, 3.6), color: '#7dd3fc', gravity: 340 });
    }
  }
  const runSettled = () => { const R = S.run, tg = targetOf(R.I); return Math.abs(R.hr - tg.hr) < 0.01 && Math.abs(R.rr - tg.rr) < 0.01 && Math.abs(R.temp - tg.temp) < 0.001 && Math.abs(R.sweat - tg.sweat) < 0.001 && Math.abs(R.urine - tg.urine) < 0.001; };
  function recordNow() {
    const R = S.run;
    if (R.I !== 0 && R.I !== 100) { say('강도를 0 %(🛌)나 100 %(🏃)에 맞춘 뒤 기록해요.'); Sound.fail(); return; }
    if (!runSettled()) { say('값이 멈출 때까지 잠깐 기다렸다가 기록해요.'); Sound.fail(); return; }
    const key = R.I === 0 ? 'rest' : 'run';
    R.rec[key] = { hr: String(Math.round(R.hr)), rr: String(Math.round(R.rr)), temp: R.temp.toFixed(1), sweat: SW(R.sweat), urine: UR(R.urine) };
    R.pressed = 1; Sound.success();
    if (!RM) { const t = TG(); parts.burst(t.x + t.cols[0] + t.cols[1] * (key === 'rest' ? 0.5 : 1.5), t.y + t.hdr + 2.5 * t.rh, { count: 12, speed: 120, size: 3, life: 0.7, shape: 'star' }); }
    updateCtl();
  }
  const dirRect = (row, which) => { const g = TG(), x0 = g.x + g.cols[0] + g.cols[1] + g.cols[2], bw = (g.cols[3] - 18) / 2; return { x: x0 + 6 + (which === 'up' ? 0 : bw + 6), y: g.y + g.hdr + row * g.rh + 3, w: bw, h: g.rh - 6 }; };
  function drawRunner(cx, gy, leg, sp, t) {
    const sc = P(1.0, 0.95), hipY = gy - 70 * sc, run = sp > 0.02;
    const A = run ? 0.35 + 0.6 * sp : 0.04, B = run ? 0.7 + 0.8 * sp : 0, lean = run ? 0.1 + 0.22 * sp : 0;
    const bob = run ? Math.abs(Math.sin(leg * 1)) * (3 + 5 * sp) : Math.sin(t * 1.6) * 1.2;
    const hx = cx, hy = hipY - bob;
    const shx = hx + Math.sin(lean) * 42 * sc, shy = hy - Math.cos(lean) * 42 * sc;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(cx, gy + 3, 44 * sc, 7, 0, 0, TAU); ctx.fill();
    const limb = (x, y, a1, a2, l1, l2, col, w) => { const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1; const fx = kx + Math.sin(a1 + a2) * l2, fy = ky + Math.cos(a1 + a2) * l2; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke(); return [fx, fy]; };
    const s1 = Math.sin(leg), s2 = Math.sin(leg + Math.PI);
    const knee = (s) => (run ? Math.max(0, -Math.cos(s * 0 + 0)) * 0 : 0);
    // 뒤쪽 다리/팔
    const legA = (ph) => ({ a1: Math.sin(ph) * A, a2: run ? -Math.max(0, Math.cos(ph + 0.6)) * B : 0 });
    const L1 = legA(leg), L2 = legA(leg + Math.PI);
    limb(shx, shy + 6, -Math.sin(leg + Math.PI) * A * 1.1 - 0.2, -0.9 - (run ? 0.3 * sp : 0), 22 * sc, 20 * sc, '#f1c27d', 6 * sc);
    const f2 = limb(hx, hy, L2.a1, L2.a2, 30 * sc, 30 * sc, '#1e3a8a', 9 * sc);
    ctx.fillStyle = '#334155'; rr(f2[0] - 5, f2[1] - 3, 15, 7, 3).fill();
    // 몸통
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 14 * sc; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(shx, shy); ctx.stroke();
    // 앞쪽 다리
    const f1 = limb(hx, hy, L1.a1, L1.a2, 30 * sc, 30 * sc, '#1d4ed8', 9 * sc);
    ctx.fillStyle = '#0f172a'; rr(f1[0] - 5, f1[1] - 3, 15, 7, 3).fill();
    // 앞쪽 팔
    limb(shx, shy + 6, -Math.sin(leg) * A * 1.1 - 0.2, -0.9 - (run ? 0.3 * sp : 0), 22 * sc, 20 * sc, '#f1c27d', 6 * sc);
    // 머리
    const hdx = shx + Math.sin(lean) * 12 * sc, hdy = shy - Math.cos(lean) * 12 * sc - 8 * sc;
    D.sphere(hdx, hdy, 13 * sc, '#f6d3a2', { gloss: false });
    ctx.fillStyle = '#3b2f2f'; ctx.beginPath(); ctx.arc(hdx - 1, hdy - 3, 13 * sc, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(hdx + 5 * sc, hdy - 1, 1.6, 0, TAU); ctx.fill();
    // 땀 번쩍임 / 속도선
    if (sp > 0.3) { ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 2.4; for (let i = 0; i < 3; i++) { const yy = gy - 100 + i * 28, xx = cx - 70 - ((t * 200 + i * 30) % 50); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 26 - sp * 30, yy); ctx.stroke(); } }
    ctx.restore();
    return { x: hdx, y: hdy };
  }
  function drawHeartLung(x, y, R, t) {
    // 심장과 폐 모식 (박동 · 호흡 리듬)
    const hp = Math.max(0, Math.sin(R.heartPh)), hs = 1 + 0.2 * hp * hp;
    const lp = 0.5 + 0.5 * Math.sin(R.lungPh), ls = 0.88 + 0.22 * lp;
    card(x - 62, y - 56, 124, 112, 'rgba(255,255,255,.92)', '#e2e8f0', 16);
    [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(x + sd * 33, y + 2); ctx.scale(ls, ls); ctx.fillStyle = '#fda4af'; ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 16, 28, sd * 0.18, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); });
    ctx.save(); ctx.translate(x, y + 6); ctx.scale(hs, hs); ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-22, -2, -14, -20, 0, -8); ctx.bezierCurveTo(14, -20, 22, -2, 0, 14); ctx.fill(); ctx.stroke(); ctx.restore();
    T(x, y + 50, '심장 · 폐', 12, MUTED, 'center', 800);
  }
  function drawRun(t) {
    const g = RG(), R = S.run, sp = R.I / 100;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 장면 배경
    const sy = g.sceneY, sh = g.ground - sy + 38, sw = P(776, 500), sx = P(12, 10);
    ctx.save(); rr(sx, sy, sw, sh, 16).clip();
    D.sky(sx, sy, sw, sh, '#d7efff', '#f2fbff');
    // 멀리 나무 (스크롤)
    for (let i = -1; i < 7; i++) { const tx = ((i * 170 - R.scroll * 0.35) % 1190 + 1190) % 1190 - 200; ctx.fillStyle = '#86c98c'; ctx.beginPath(); ctx.arc(tx, g.ground - 62, 28, 0, TAU); ctx.fill(); ctx.fillStyle = '#8b6b4a'; ctx.fillRect(tx - 4, g.ground - 40, 8, 40); }
    D.ground(sx, g.ground - 4, sw, 60, { top: '#9be09a', mid: '#6cbf6a', soil: '#e7c9a0', bottom: '#d3a978' });
    ctx.fillStyle = '#c0714b'; ctx.fillRect(sx, g.ground + 4, sw, 30);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.setLineDash([26, 22]); ctx.lineDashOffset = R.scroll % 48; ctx.beginPath(); ctx.moveTo(sx, g.ground + 20); ctx.lineTo(sx + sw, g.ground + 20); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const hd = drawRunner(g.rx, g.ground + 6, R.leg, sp, t);
    // 내부 모식 (심장/폐) 말풍선
    const inn = g.inner;
    if (!PHONE) { ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(g.rx + 18, g.ground - 90); ctx.lineTo(inn.x - 62, inn.y); ctx.stroke(); ctx.restore(); }
    drawHeartLung(inn.x, inn.y, R, t);
    // 다이얼
    const dv = [{ v: R.hr, min: 0, max: 200, label: '심박수', unit: '회/분', ticks: 4, col: '#ef4444' }, { v: R.rr, min: 0, max: 60, label: '호흡수', unit: '회/분', ticks: 3, col: '#0ea5e9' }];
    g.dials.forEach((d, i) => {
      const q = dv[i];
      D.dial(d.x, d.y, d.r, clamp(q.v, q.min, q.max), q.min, q.max, { label: q.label, color: q.col, ticks: q.ticks });
      T(d.x, d.y + d.r + 22, Math.round(q.v) + ' ' + q.unit, P(16, 14), INK, 'center', 800);
    });
    D.thermometer(g.therm.x, g.therm.y, g.therm.h, clamp(R.temp, 36, 40), 36, 40, { ticks: true, step: 1, unit: '°', color: mix('#fb923c', '#dc2626', (R.temp - 37) / 1.5) });
    T(g.therm.x, g.therm.y + g.therm.h + 42, R.temp.toFixed(1) + ' °C', P(16, 14), INK, 'center', 800);
    // 땀 · 오줌 막대
    const bx = g.bars.x, by = g.bars.y, bw = g.bars.w;
    const bar = (yy, label, v, col, txt) => {
      const lw = PHONE ? 62 : 74, tw = PHONE ? 130 : 96, w0 = bw - lw - tw;
      T(bx, yy + 14, label, 13.5, INK, 'left', 800);
      ctx.fillStyle = '#e2e8f0'; rr(bx + lw, yy, w0, 18, 9).fill();
      const w = w0 * clamp(v, 0, 1); ctx.fillStyle = col; if (w > 1) rr(bx + lw, yy, w, 18, Math.min(9, w / 2)).fill();
      T(bx + lw + w0 + 10, yy + 14, txt, 13, INK, 'left', 800);
    };
    bar(by, '💧 땀', R.sweat, '#38bdf8', SW(R.sweat));
    bar(by + P(32, 26), '🚽 오줌', R.urine, '#facc15', UR(R.urine));
    // 기록 표
    drawTable(t);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, g.sceneY + 18, S.msg, { bg: '#1b2333', color: '#fff', size: 13.5 }); ctx.restore(); }
    T(VW / 2, VH - 8, '교육용 가상 측정값 · 개인 건강 정보가 아니에요', 11.5, '#b45309', 'center', 800);
  }
  function drawTable(t) {
    const g = TG(), R = S.run;
    card(g.x - 8, g.y - 8, g.w + 16, g.hdr + 5 * g.rh + 16, '#fff');
    const heads = ['항목', '안정 시', '달리기 중', '달리기 중 변화는?'];
    let x = g.x;
    heads.forEach((h, i) => { ctx.fillStyle = '#ecfdf5'; ctx.fillRect(x, g.y, g.cols[i], g.hdr); T(x + g.cols[i] / 2, g.y + g.hdr / 2 + 5, h, P(14, 12.5), INK, 'center', 800); x += g.cols[i]; });
    ROWS.forEach((r, i) => {
      const y = g.y + g.hdr + i * g.rh;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke();
      T(g.x + 10, y + g.rh / 2 + 5, r.name + (r.unit ? ' (' + r.unit + ')' : ''), P(14, 12), INK, 'left', 800);
      [['rest', 1], ['run', 2]].forEach(([k, ci]) => {
        const cx = g.x + g.cols.slice(0, ci).reduce((a, b) => a + b, 0) + g.cols[ci] / 2, v = R.rec[k] ? R.rec[k][r.key] : null;
        if (v != null) TF(cx, y + g.rh / 2 + 5, v, g.cols[ci] - 8, P(15, 13), '#0f172a', 'center', 800);
        else T(cx, y + g.rh / 2 + 5, '—', 14, '#cbd5e1', 'center', 700);
      });
      ['up', 'down'].forEach((w) => {
        const rc = dirRect(i, w), on = R.dir[r.key] === w, hv = S.hover === 'd' + i + w;
        ctx.fillStyle = on ? '#16a34a' : hv ? '#dcfce7' : '#f1f5f9'; rr(rc.x, rc.y, rc.w, rc.h, 10).fill();
        ctx.strokeStyle = on ? '#15803d' : '#cbd5e1'; ctx.lineWidth = 1.5; rr(rc.x, rc.y, rc.w, rc.h, 10).stroke();
        T(rc.x + rc.w / 2, rc.y + rc.h / 2 + 5, w === 'up' ? '▲ 늘어요' : '▼ 줄어요', P(13.5, 12), on ? '#fff' : '#475569', 'center', 800);
      });
    });
    if (R.pressed > 0) R.pressed = Math.max(0, R.pressed - 0.03);
  }

  /* ======================================================
     ② 산소 운반
     ====================================================== */
  const OG = () => (PHONE
    ? { data: { x: 10, y: 38, w: 500, h: 80 }, form: { x: 10, y: 124, w: 500, h: 150 }, L: { x: 95, y: 376 }, H: { x: 425, y: 376 }, M: { x: 260, y: 470 }, dist: { x: 10, y: 520, w: 500, h: 124 }, gauge: { x: 110, y: 714, r: 50 } }
    : { data: { x: 16, y: 44, w: 410, h: 108 }, form: { x: 16, y: 160, w: 410, h: 132 }, L: { x: 510, y: 138 }, H: { x: 710, y: 138 }, M: { x: 610, y: 285 }, dist: { x: 16, y: 304, w: 410, h: 236 }, gauge: { x: 540, y: 442, r: 78 } });
  const loopPts = () => { const g = OG(); return [[g.L.x, g.L.y], [g.H.x, g.H.y], [g.M.x, g.M.y], [g.L.x, g.L.y]]; };
  const LOOP_LEN = () => polyLen(loopPts());
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function polyAt(pts, d) { for (let i = 1; i < pts.length; i++) { const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= sl) { const f = d / sl; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f), i]; } d -= sl; } const l = pts[pts.length - 1]; return [l[0], l[1], pts.length]; }
  function initFlow() { const o = S.o2; o.flow = []; for (let i = 0; i < 15; i++) o.flow.push({ s: i / 15, id: i }); }
  function stepO2(dt) {
    const o = S.o2, C = CASE[o.c], g = OG();
    const total = LOOP_LEN(), spd = C.coR * (PHONE ? 7 : 6.4); // px/s : 심박출량에 비례
    o.lungPh += dt * TAU * C.rr / 60; o.heartPh += dt * TAU * C.hr / 60;
    o.dist.musc = SciSim.approach(o.dist.musc, C.musc, dt, 4); o.dist.gut = SciSim.approach(o.dist.gut, C.gut, dt, 4); o.dist.other = SciSim.approach(o.dist.other, C.other, dt, 4);
    const tg = o.ok[o.c] ? C.vo : 0; o.g = RM ? tg : SciSim.approach(o.g, tg, dt, 2.6);
    const pts = loopPts();
    o.flow.forEach((f) => {
      const s0 = f.s; f.s += spd * dt / total; if (f.s >= 1) f.s -= 1;
      // 근육 도착(2/3 지점 직전)에서 산소 내려놓기, 폐 도착에서 산소 싣기
      const sM = (polyLen(pts.slice(0, 3))) / total;
      if (!RM && s0 < sM && f.s >= sM) { for (let k = 0; k < Math.round(avdDots(C)); k++) parts.emit({ x: g.M.x + rnd(-6, 6), y: g.M.y - 6, vx: rnd(-26, 26), vy: rnd(-10, 26), life: 0.8, size: 3.3, color: '#fca5a5', gravity: 30 }); }
      if (!RM && s0 > f.s) { for (let k = 0; k < Math.round(avdDots(C)); k++) parts.emit({ x: g.L.x + rnd(-14, 14), y: g.L.y + rnd(-14, 14), vx: rnd(-14, 14), vy: rnd(-14, 14), life: 0.6, size: 3, color: '#fca5a5', gravity: 0 }); }
    });
  }
  const avdDots = (C) => C.avd / 5; // 산소 1칸 = 5 mL/100 mL
  function drawLungShape(x, y, ph, big) {
    const k = 0.5 + 0.5 * Math.sin(ph), s = (0.9 + 0.2 * k) * (big || 1);
    [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(x + sd * 16 * (big || 1), y); ctx.scale(s, s); ctx.fillStyle = '#fda4af'; ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 14, 25, sd * 0.2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); });
  }
  function drawHeartShape(x, y, ph, big) {
    const p = Math.max(0, Math.sin(ph)), s = (1 + 0.2 * p * p) * (big || 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-34, -2, -22, -30, 0, -12); ctx.bezierCurveTo(22, -30, 34, -2, 0, 22); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawBloodCell(x, y, red, dots, ang) {
    ctx.save(); ctx.translate(x, y);
    D.sphere(0, 0, 9, mix('#3b5bdb', '#ef4444', red), { gloss: true });
    for (let k = 0; k < dots; k++) { const a = (k / 4) * TAU + ang; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a) * 12.5, Math.sin(a) * 12.5, 3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }
  function drawO2(t) {
    const g = OG(), o = S.o2, C = CASE[o.c];
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    // 데이터 카드
    const d = g.data; card(d.x, d.y, d.w, d.h, '#fff', o.c === 'run' ? '#fecaca' : '#bfdbfe');
    T(d.x + 12, d.y + 24, C.icon + ' ' + C.name + ' (교육용 가상 예시)', P(15, 14), INK, 'left', 800);
    const items = [['심박수', C.hr + ' 회/분'], ['1회 박출량', C.sv + ' mL'], ['산소 함량 차', C.avd + ' mL/100 mL'], ['호흡수', C.rr + ' 회/분']];
    items.forEach((it, i) => { const cw = d.w / 4; T(d.x + cw * i + cw / 2, d.y + P(54, 46), it[0], 12, MUTED, 'center', 700); TF(d.x + cw * i + cw / 2, d.y + P(78, 68), it[1], cw - 8, PHONE ? 13 : 15, '#0f172a', 'center', 800); });
    // 식 카드
    const f = g.form; card(f.x, f.y, f.w, f.h, '#fff', '#d1fae5');
    T(f.x + 12, f.y + 24, '📐 계산식', 14.5, INK, 'left', 800);
    block(f.x + 12, f.y + 48, f.w - 24, '① 심박출량(L/분) = 심박수 × 1회 박출량(mL) ÷ 1000', P(13.5, 12.5), '#334155', 17, 800);
    block(f.x + 12, f.y + 48 + P(26, 30), f.w - 24, '② 산소 소비량(L/분) = 심박출량 × 산소 함량 차 ÷ 100', P(13.5, 12.5), '#334155', 17, 800);
    if (o.ok[o.c]) {
      T(f.x + 12, f.y + f.h - P(36, 36), '① ' + C.hr + ' × ' + C.sv + ' ÷ 1000 = ' + fmtCO(C.co) + ' ≈ ' + C.coR + ' L/분', P(14, 13), '#166534', 'left', 800);
      T(f.x + 12, f.y + f.h - 14, '② ' + C.coR + ' × ' + C.avd + ' ÷ 100 = ' + (C.vo === 3 ? '3.0' : C.vo) + ' L/분', P(14, 13), '#166534', 'left', 800);
    } else T(f.x + 12, f.y + f.h - 16, '오른쪽 칸에 계산 결과를 써 보세요.', 13, MUTED, 'left', 700);
    // 순환 모형
    const L = g.L, H = g.H, M = g.M, pts = loopPts();
    if (!PHONE) card(446, 44, 338, 286, '#fff', '#e2e8f0', 16); else card(10, 282, 500, 230, '#fff', '#e2e8f0', 16);
    // 관
    ctx.save(); ctx.lineCap = 'round';
    const seg = (a, b, col) => { ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1] - 2); ctx.lineTo(b[0], b[1] - 2); ctx.stroke(); };
    seg(pts[0], pts[1], '#fca5a5'); seg(pts[1], pts[2], '#fca5a5'); seg(pts[2], pts[3], '#93c5fd');
    ctx.restore();
    // 장기
    D.glow(M.x, M.y, 52, '#fdba74', 0.4);
    ctx.fillStyle = '#fed7aa'; ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.4; rr(M.x - 42, M.y - 22, 84, 44, 22).fill(); rr(M.x - 42, M.y - 22, 84, 44, 22).stroke();
    T(M.x, M.y + 5, '💪 근육', 14, '#9a3412', 'center', 800);
    drawLungShape(L.x, L.y, o.lungPh, 1.05); drawHeartShape(H.x, H.y, o.heartPh, 0.85);
    T(L.x, L.y - 40, '폐 · ' + C.rr + '회/분', 13, INK, 'center', 800); T(H.x, H.y - 40, '심장 · ' + C.hr + '회/분', 13, INK, 'center', 800);
    // 혈액 입자
    const total = LOOP_LEN(), sM = polyLen(pts.slice(0, 3)) / total;
    o.flow.forEach((fl, i) => {
      const q = polyAt(pts, fl.s * total);
      let red = 1, dots = 4;
      if (fl.s > sM - 0.04 && fl.s < sM + 0.06) { const u = clamp((fl.s - (sM - 0.04)) / 0.1, 0, 1); red = 1 - u; dots = Math.round(lerp(4, 4 - avdDots(C), u)); }
      else if (fl.s >= sM + 0.06 && fl.s < 0.96) { red = 0; dots = 4 - avdDots(C); }
      else if (fl.s >= 0.96) { const u = (fl.s - 0.96) / 0.04; red = u; dots = Math.round(lerp(4 - avdDots(C), 4, u)); }
      drawBloodCell(q[0], q[1], red, dots, t * 0.6 + i);
    });
    T(PHONE ? 260 : 615, PHONE ? 304 : 66, '● 산소 많은 피 → 산소 적은 피 (O₂ 1칸 = 5 mL/100 mL)', PHONE ? 11.5 : 12, MUTED, 'center', 800);
    // 혈류 분배
    const ds = g.dist; card(ds.x, ds.y, ds.w, ds.h, '#fff', '#e2e8f0');
    T(ds.x + 12, ds.y + 24, '🩸 심박출량이 가는 곳 (%)', P(14.5, 13.5), INK, 'left', 800);
    [['💪 근육', o.dist.musc, '#f97316', C.musc], ['🍽️ 소화관', o.dist.gut, '#f59e0b', C.gut], ['그 밖', o.dist.other, '#94a3b8', C.other]].forEach((b, i) => {
      const yy = ds.y + 44 + i * P(56, 24), bw = ds.w - 150;
      T(ds.x + 12, yy + 15, b[0], 13.5, INK, 'left', 800);
      ctx.fillStyle = '#e2e8f0'; rr(ds.x + 94, yy, bw, 20, 10).fill();
      const w = bw * clamp(b[1] / 100, 0, 1); ctx.fillStyle = b[2]; if (w > 1) rr(ds.x + 94, yy, w, 20, Math.min(10, w / 2)).fill();
      T(ds.x + 94 + bw + 10, yy + 15, Math.round(b[1]) + ' %', 13.5, INK, 'left', 800);
    });
    T(ds.x + 12, ds.y + ds.h - 10, '교육용 가상 예시 값', 11.5, '#b45309', 'left', 800);
    // 계기
    const gg = g.gauge;
    if (!PHONE) card(446, 340, 338, 200, '#fff', '#e2e8f0', 16); else card(10, 652, 500, 124, '#fff', '#e2e8f0', 16);
    D.dial(gg.x, gg.y + (PHONE ? 10 : 6), gg.r, clamp(o.g, 0, 3.5), 0, 3.5, { label: '산소 소비량', color: '#16a34a', ticks: 7 });
    const tx = PHONE ? 280 : 540 + gg.r + 70 - 40;
    const lines = [o.ok.rest ? '🛌 안정 ' + REST.vo + ' L/분' : '🛌 안정 ? L/분', o.ok.run ? '🏃 달리기 ' + RUN.vo.toFixed(1) + ' L/분' : '🏃 달리기 ? L/분'];
    lines.forEach((l, i) => T(PHONE ? 220 : gg.x + gg.r + 18, (PHONE ? 706 : 410) + i * 26, l, PHONE ? 14 : 15, '#0f172a', 'left', 800));
    if (o.ok.rest && o.ok.run) D.label(PHONE ? 330 : gg.x + gg.r + 84, PHONE ? 758 : 482, '달리기는 안정의 ' + Math.round(RUN.vo / REST.vo) + '배', { bg: '#16a34a', size: 13 });
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(300, 272), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }
  function closeTo(x, arr, tol) { return arr.some((a) => Math.abs(x - a) <= tol); }
  function checkCalc() {
    const o = S.o2, C = CASE[o.c], inp = o.in[o.c];
    const co = parseFloat(String(inp.co).replace(',', '.')), vo = parseFloat(String(inp.vo).replace(',', '.'));
    if (!isFinite(co) || !isFinite(vo)) { o.note = '①과 ②를 모두 숫자로 써 주세요.'; Sound.fail(); return false; }
    const okCO = closeTo(co, [C.co, C.coR], 0.051);
    const okVO = o.c === 'rest' ? (vo >= 0.24 && vo <= 0.26) : (vo >= 2.9 && vo <= 3.05);
    if (okCO && okVO) { o.ok[o.c] = true; o.note = '정답이에요! 산소 소비량은 ' + (C.vo === 3 ? '3.0' : C.vo) + ' L/분이에요.'; Sound.success(); if (!RM) parts.burst(OG().gauge.x, OG().gauge.y - 20, { count: 16, speed: 150, size: 3.4, life: 0.8, shape: 'star' }); updateCtl(); return true; }
    o.note = !okCO ? '① 심박출량: ' + C.hr + ' × ' + C.sv + ' ÷ 1000 을 다시 계산해 봐요.' : '② 산소 소비량: 심박출량(' + C.coR + ' L/분) × ' + C.avd + ' ÷ 100 을 다시 계산해 봐요.';
    Sound.fail(); say(o.note); updateCtl(); return false;
  }

  /* ======================================================
     ③ 통합 지도
     ====================================================== */
  const NW = () => P(124, 112), NH = () => P(64, 58);
  const nodeRect = (id) => { const n = NODE[id]; return { x: n.x - NW() / 2, y: n.y - NH() / 2, w: NW(), h: NH() }; };
  const nodeAt = (p) => { for (const k in NODE) if (hit(p, nodeRect(k))) return k; return null; };
  function edgePath(e) {
    // 노드 사각형 가장자리에서 가장자리로 가는 곡선 (양방향은 서로 반대쪽으로 휘어짐)
    const A = NODE[e.a], B = NODE[e.b];
    const ang = Math.atan2(B.y - A.y, B.x - A.x), nx = -Math.sin(ang), ny = Math.cos(ang);
    const off = e.bend * 17;
    const edgePt = (n, tx, ty, sgn) => { const dx = tx - n.x, dy = ty - n.y; const hw = NW() / 2 + 3, hh = NH() / 2 + 3; const k = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh, 1e-6); return [n.x + dx * k, n.y + dy * k]; };
    const a = edgePt(A, B.x, B.y), b = edgePt(B, A.x, A.y);
    const a2 = [a[0] + nx * off, a[1] + ny * off], b2 = [b[0] + nx * off, b[1] + ny * off];
    const mx = (a2[0] + b2[0]) / 2 + nx * off * 0.6, my = (a2[1] + b2[1]) / 2 + ny * off * 0.6;
    return { a: a2, b: b2, c: [mx, my] };
  }
  const qpt = (p, t) => { const u = 1 - t; return [u * u * p.a[0] + 2 * u * t * p.c[0] + t * t * p.b[0], u * u * p.a[1] + 2 * u * t * p.c[1] + t * t * p.b[1]]; };
  const linkKey = (a, b) => a + '>' + b;
  const mapDone = () => EDGES.every((e) => S.map.links.has(linkKey(e.a, e.b)));
  function tryLink(a, b) {
    const m = S.map; if (a === b) return;
    const k = linkKey(a, b);
    const e = EDGES.find((q) => q.a === a && q.b === b);
    if (e) {
      if (m.links.has(k)) { say('이미 이어진 연결이에요.'); return; }
      m.links.add(k); Sound.success(); const p = edgePath(e); const q = qpt(p, 0.5); if (!RM) parts.burst(q[0], q[1], { count: 10, speed: 110, size: 3, life: 0.6, colors: [e.col, '#fff'], shape: 'circle', gravity: 0 });
      m.flow.push({ e, t: 0 });
      say(NODE[a].name + ' → ' + NODE[b].name + ': ' + e.cargo); updateCtl(); return;
    }
    m.shake = 0.35; Sound.fail();
    const rev = EDGES.find((q) => q.a === b && q.b === a);
    if (rev) say('방향을 바꿔 봐요. ' + NODE[b].name + (jong(NODE[b].name) ? '이 ' : '가 ') + NODE[a].name + ' 쪽으로 주는 흐름이에요.');
    else if (a !== 'cir' && b !== 'cir') say('기관계끼리는 직접 주고받지 않고 순환계(혈액)를 거쳐요.');
    else say('달리는 동안 이 방향으로 가는 물질은 없어요. 다시 생각해 봐요.');
  }
  function stepMap(dt) {
    const m = S.map; m.t += dt; if (m.shake > 0) m.shake -= dt;
    m.flow.forEach((f) => { f.t += dt * 0.35; if (f.t > 1) f.t -= 1; });
  }
  function drawMap(t) {
    const m = S.map;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(VW / 2, P(28, 28), '달리는 몸속 물질의 길 — 기관계 연결선을 이어요', P(16, 14), INK, 'center', 800);
    // 목표(점선) 안내: 아직 이어지지 않은 곳은 희미한 점선 힌트 없이 노드만
    EDGES.forEach((e) => {
      if (!m.links.has(linkKey(e.a, e.b))) return;
      const p = edgePath(e);
      ctx.save(); ctx.strokeStyle = e.col; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.a[0], p.a[1]); ctx.quadraticCurveTo(p.c[0], p.c[1], p.b[0], p.b[1]); ctx.stroke();
      const q1 = qpt(p, 0.94), q0 = qpt(p, 0.86); D.arrow(q0[0], q0[1], p.b[0], p.b[1], { color: e.col, width: 4, head: 11 });
      ctx.restore();
      const mid = qpt(p, e.lt);
      D.label(mid[0], mid[1], e.cargo, { bg: '#fff', color: e.col, size: PHONE ? 11.5 : 12.5, border: e.col, pad: 6 });
    });
    // 흐르는 입자 (모든 연결 완성 후 더 많이)
    m.flow.forEach((f) => { const p = edgePath(f.e); for (let k = 0; k < 3; k++) { const tt = (f.t + k / 3) % 1, q = qpt(p, tt); D.sphere(q[0], q[1], 4.2, f.e.col, { gloss: true }); } });
    // 만드는 중인 선
    if (m.drag && m.drag.moved) { const A = NODE[m.drag.from]; D.arrow(A.x, A.y, m.drag.x, m.drag.y, { color: '#64748b', width: 3.5, dash: [8, 6], head: 11 }); }
    // 노드
    Object.keys(NODE).forEach((id) => {
      const n = NODE[id], r = nodeRect(id), sel = m.from === id, hv = S.hover === 'n' + id;
      const sh = m.shake > 0 && (sel || hv) ? Math.sin(m.shake * 70) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 16).fill(); }, { blur: sel ? 14 : 7, y: sel ? 5 : 2 });
      ctx.strokeStyle = sel ? '#0f172a' : n.color; ctx.lineWidth = sel ? 4 : 3; rr(r.x, r.y, r.w, r.h, 16).stroke();
      ctx.fillStyle = rgba(n.color, 0.14); rr(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 13).fill();
      T(r.x + P(28, 24), r.y + r.h / 2 + 9, n.icon, P(26, 22), INK, 'center', 700);
      TF(r.x + P(74, 70), r.y + r.h / 2 + 5, n.name, r.w - P(52, 50), P(16, 14), INK, 'center', 800);
      ctx.restore();
    });
    // 역할놀이 상태
    const done = SYS.filter((s, i) => roleOK(i)).length;
    D.label(VW - P(100, 80), VH - P(22, 24), '🎭 역할 카드 ' + done + ' / 4', { bg: done >= 2 ? '#16a34a' : '#64748b', size: 12.5 });
    D.label(P(110, 90), VH - P(22, 24), '🔗 연결 ' + m.links.size + ' / ' + EDGES.length, { bg: mapDone() ? '#16a34a' : '#64748b', size: 12.5 });
    if (m.links.size === EDGES.length) T(VW / 2, P(48, 50), '✔ 지도 완성! 물질이 흘러요', 14, '#166534', 'center', 800);
    else T(VW / 2, P(48, 50), '기관계(근육 세포)를 눌러 고른 뒤, 물질을 받는 곳을 눌러요. 끌어다 놓아도 돼요.', P(13, 12), MUTED, 'center', 700);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(528, 560), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }
  const roleOK = (i) => { const r = S.map.roles[i]; return !!r && r.job === i && r.take === i && r.give === i; };
  function roleFeedback() {
    const ok = SYS.filter((s, i) => roleOK(i)).length;
    if (ok >= 2) return true;
    const m = S.map, started = SYS.map((s, i) => [s, i]).filter(([s, i]) => m.roles[i] && (m.roles[i].job != null || m.roles[i].take != null || m.roles[i].give != null));
    if (!started.length) return '🎭 역할놀이 카드에서 <b>기관계를 고르고</b> 일 · 받는 것 · 주는 것을 모두 골라요. (2개 이상 완성해요)';
    const [s, i] = started.find(([ss, ii]) => !roleOK(ii)) || started[0];
    const r = m.roles[i] || {}; const bad = [];
    if (r.job == null) bad.push('내가 맡은 일'); else if (r.job !== i) bad.push('내가 맡은 일');
    if (r.take == null) bad.push('받는 것'); else if (r.take !== i) bad.push('받는 것');
    if (r.give == null) bad.push('주는 것'); else if (r.give !== i) bad.push('주는 것');
    return (ok ? '지금까지 ' + ok + '개 완성했어요. ' : '') + '<b>' + s.name + '</b> 카드의 <b>' + bad.join(', ') + '</b>' + (bad.length ? (jong(bad[bad.length - 1]) ? '을' : '를') + ' 다시 확인해 봐요.' : '가 비어 있어요.') + ' (2개 이상 완성해야 해요)';
  }
  function mapFeedback() {
    const m = S.map, miss = EDGES.filter((e) => !m.links.has(linkKey(e.a, e.b)));
    if (!miss.length) return true;
    return '아직 <b>' + miss.length + '개</b>의 연결이 남았어요. 소화 · 호흡의 물질이 어디로 들어가고, 근육의 노폐물과 열은 어디로 나가는지 생각해 봐요.';
  }

  /* ======================================================
     ④ 사례 추론
     ====================================================== */
  const CGm = () => (PHONE
    ? { card: { x: 10, y: 40, w: 500, h: 110 }, boxes: [{ x: 10, y: 162, w: 500, h: 92 }, { x: 10, y: 282, w: 500, h: 92 }, { x: 10, y: 402, w: 500, h: 92 }], vis: { x: 10, y: 520, w: 500, h: 220 } }
    : { card: { x: 16, y: 44, w: 768, h: 100 }, boxes: [{ x: 16, y: 164, w: 236, h: 150 }, { x: 282, y: 164, w: 236, h: 150 }, { x: 548, y: 164, w: 236, h: 150 }], vis: { x: 16, y: 332, w: 768, h: 208 } });
  const csPickText = (k, slot) => { const c = CASES[k], i = S.cs.pick[k][slot]; return i < 0 ? '' : (slot === 0 ? c.s1 : slot === 1 ? c.s2 : c.s3)[i]; };
  const csSlotOK = (k, slot) => S.cs.pick[k][slot] === CASES[k].ans[slot];
  const csCaseOK = (k) => [0, 1, 2].every((s) => csSlotOK(k, s));
  function csFeedback() {
    for (const k of CASE_KEYS) {
      const p = S.cs.pick[k];
      if (p.some((v) => v < 0)) return '<b>' + CASES[k].title.slice(0, 1) + '</b> 사례의 ①②③을 모두 골라요. (세 사례 모두 완성해요)';
    }
    for (const k of CASE_KEYS) {
      const bad = [0, 1, 2].filter((s) => !csSlotOK(k, s));
      if (bad.length) return '<b>' + CASES[k].title.slice(0, 1) + '</b> 사례의 ' + bad.map((s) => '①②③'[s]).join(', ') + '번을 다시 생각해 봐요. 산소가 어디서 줄거나 늘고, 그다음 어디가 달라지는지 따라가요.';
    }
    return true;
  }
  function stepCase(dt) {
    const c = S.cs;
    if (!c.rbc.length) for (let i = 0; i < 26; i++) c.rbc.push({ x: Math.random(), y: Math.random(), v: rnd(0.05, 0.12), ph: Math.random() * 6 });
    c.rbc.forEach((r) => { r.x += r.v * dt; if (r.x > 1) { r.x -= 1; r.y = Math.random(); } });
  }
  function drawCase(t) {
    const g = CGm(), k = S.cs.k, C = CASES[k];
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(g.card.x, g.card.y, g.card.w, g.card.h, '#fff', '#bbf7d0');
    T(g.card.x + 40, g.card.y + g.card.h / 2 + 14, C.icon, 44, INK, 'center', 700);
    T(g.card.x + 82, g.card.y + 32, C.title, P(18, 16), INK, 'left', 800);
    block(g.card.x + 82, g.card.y + 58, g.card.w - 100, C.story, P(14.5, 13.5), '#334155', P(21, 19), 700);
    const labels = ['① 먼저 영향을 받는 곳', '② 이어지는 변화', '③ 나타나는 결과'];
    g.boxes.forEach((b, i) => {
      const txt = csPickText(k, i), ok = txt && csSlotOK(k, i);
      card(b.x, b.y, b.w, b.h, ok ? '#f0fdf4' : '#fff', txt ? (ok ? '#16a34a' : '#fda4af') : '#cbd5e1');
      T(b.x + 12, b.y + 24, labels[i], 13, MUTED, 'left', 800);
      if (txt) block(b.x + 12, b.y + 50, b.w - 24, txt, P(14, 13.5), INK, P(19, 18), 800);
      else T(b.x + b.w / 2, b.y + b.h / 2 + 12, '오른쪽에서 골라요', 13.5, '#94a3b8', 'center', 700);
      if (ok) D.check(b.x + b.w - 20, b.y + 22, 10, 1);
      if (i < 2) { if (PHONE) D.arrow(b.x + b.w / 2, b.y + b.h + 2, b.x + b.w / 2, b.y + b.h + 18, { color: '#16a34a', width: 4, head: 11 }); else D.arrow(b.x + b.w + 3, b.y + b.h / 2, b.x + b.w + 27, b.y + b.h / 2, { color: '#16a34a', width: 4, head: 11 }); }
    });
    // 미니 장면
    const v = g.vis; card(v.x, v.y, v.w, v.h, '#fff', '#e2e8f0');
    drawCaseVisual(k, v, t);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(322, 510), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
    T(VW / 2, VH - 6, '교육용 모식도 · 가상 사례', 11.5, '#b45309', 'center', 800);
  }
  function vessel(x, y, w, h, n, label, col) {
    ctx.save(); ctx.fillStyle = '#fee2e2'; rr(x, y, w, h, h / 2).fill(); ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; rr(x, y, w, h, h / 2).stroke();
    ctx.beginPath(); rr(x + 2, y + 2, w - 4, h - 4, h / 2 - 2).clip();
    const rs = S.cs.rbc;
    for (let i = 0; i < n; i++) { const r = rs[i % rs.length]; const px = x + ((r.x + i * 0.137) % 1) * w, py = y + h * 0.22 + ((i * 0.37 + r.y * 0.3) % 1) * h * 0.56; ctx.fillStyle = col || '#dc2626'; ctx.beginPath(); ctx.ellipse(px, py, 8, 5.5, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(px, py, 3.2, 2, 0.3, 0, TAU); ctx.fill(); }
    ctx.restore();
    T(x + w / 2, y + h + 20, label, 13.5, INK, 'center', 800);
  }
  function drawCaseVisual(k, v, t) {
    const w2 = (v.w - 40) / 2, x1 = v.x + 14, x2 = v.x + 26 + w2, y = v.y + 56;
    if (k === 'a' || k === 'b') {
      const n1 = k === 'a' ? 12 : 12, n2 = k === 'a' ? 20 : 5;
      T(v.x + 14, v.y + 26, k === 'a' ? '🩸 혈관 속 적혈구 (그림)' : '🩸 혈관 속 적혈구 (그림)', 14, INK, 'left', 800);
      vessel(x1, y, w2, P(52, 46), n1, k === 'a' ? '평지에서' : '건강한 사람', '#dc2626');
      vessel(x2, y, w2, P(52, 46), n2, k === 'a' ? '고산 지대 적응 후' : '빈혈 환자', '#dc2626');
      D.arrow(x1 + w2 / 2 - 10, y + P(52, 46) + 40, x2 + w2 / 2 + 10, y + P(52, 46) + 40, { color: '#16a34a', width: 3, head: 9 });
      block(v.x + 14, y + P(52, 46) + 76, v.w - 28, k === 'a' ? '적혈구가 많아지면 한 번에 운반하는 산소량이 늘어요 (그림은 개수 비교를 위한 모식도).' : '적혈구가 적으면 같은 양의 피로 운반하는 산소가 줄어요 (그림은 개수 비교를 위한 모식도).', 13, MUTED, 17, 700);
    } else {
      T(v.x + 14, v.y + 26, '💦 땀을 많이 흘린 뒤 (그림)', 14, INK, 'left', 800);
      const cup = (cx, lv, col, label) => { ctx.save(); ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 34, y); ctx.lineTo(cx - 28, y + 76); ctx.lineTo(cx + 28, y + 76); ctx.lineTo(cx + 34, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 33, y + 76 - 70 * lv); ctx.lineTo(cx + 33, y + 76 - 70 * lv); ctx.lineTo(cx + 28, y + 76); ctx.lineTo(cx - 28, y + 76); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); T(cx, y + 98, label, 13.5, INK, 'center', 800); };
      cup(x1 + w2 / 2, 0.8, 'rgba(253,230,138,.9)', '보통 때의 오줌');
      cup(x2 + w2 / 2, 0.32, 'rgba(217,119,6,.8)', '땀 흘린 뒤: 적고 진해요');
      for (let i = 0; i < 5; i++) { const px = x2 + w2 / 2 - 60 + ((t * 40 + i * 30) % 150) * 0 + i * 30, py = y - 6 + ((t * 50 + i * 17) % 40); ctx.fillStyle = 'rgba(56,189,248,.8)'; ctx.beginPath(); ctx.arc(px - 6, py - 10, 3.4, 0, TAU); ctx.fill(); }
      block(v.x + 14, y + 128, v.w - 28, '수분이 땀으로 빠져나가면 몸은 콩팥에서 물을 되돌려 받아 오줌의 양을 줄여요.', 13, MUTED, 17, 700);
    }
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { run: '🏃 운동 중 몸', o2: '🩸 산소 운반', map: '🗺 통합 지도', case: '🔎 사례 추론' };
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; S.hover = ''; parts.clear(); S.msgT = 0; updateCtl();
  }
  const ensure = (m) => { if (S.mode !== m) setMode(m); };
  const sbInt = SciSim.bindRange($('#sInt'), $('#oInt'), (v) => v + ' %', (v) => { S.run.I = v; updateCtl(); });
  function setInt(v) { S.run.I = v; $('#sInt').value = v; sbInt.refresh(); updateCtl(); }
  function fillSelect(sel, list, placeholder) { sel.innerHTML = ''; const o0 = document.createElement('option'); o0.value = '-1'; o0.textContent = placeholder; sel.appendChild(o0); list.forEach((t, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = t; sel.appendChild(o); }); }
  function syncRole() {
    const i = S.map.rsys, r = S.map.roles[i] || {};
    $('#rSys').value = String(i); $('#rJob').value = String(r.job != null ? r.job : -1); $('#rTake').value = String(r.take != null ? r.take : -1); $('#rGive').value = String(r.give != null ? r.give : -1);
  }
  function syncCase() {
    const k = S.cs.k, c = CASES[k];
    fillSelect($('#cS1'), c.s1, '— 고르기 —'); fillSelect($('#cS2'), c.s2, '— 고르기 —'); fillSelect($('#cS3'), c.s3, '— 고르기 —');
    ['#cS1', '#cS2', '#cS3'].forEach((id, i) => { $(id).value = String(S.cs.pick[k][i]); });
  }
  function updateCtl() {
    const R = S.run, o = S.o2;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.show.split(' ').includes(S.mode); });
    const free = !!(game && game.free); $('#modeSeg').hidden = !free; $('#tbLabel').hidden = free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#oInt').textContent = R.I + ' %';
    $('#runNote').innerHTML = '기록한 값: 안정 시 <b>' + (R.rec.rest ? '✔' : '—') + '</b> · 달리기 중 <b>' + (R.rec.run ? '✔' : '—') + '</b>. 강도 0 %(🛌)와 100 %(🏃)에서 값이 멈춘 뒤 각각 기록해요.';
    $$('#caseSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === o.c));
    $('#inCO').value = o.in[o.c].co; $('#inVO').value = o.in[o.c].vo;
    $('#calcNote').textContent = o.ok[o.c] ? '✔ 이 경우의 계산을 마쳤어요. 다른 경우(🛌/🏃)도 해 봐요.' : (o.note || '식에 표의 값을 넣어 계산해요. 심박출량은 가까운 정수로 어림해서 ②에 써도 돼요.');
    $('#oRole').textContent = SYS.filter((s, i) => roleOK(i)).length + ' / 4';
    $$('#rSys option').forEach((op, i) => { op.textContent = SYS[i].name + (roleOK(i) ? ' ✔' : ''); });
    $$('#casesSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === S.cs.k));
  }
  $('#bInt0').addEventListener('click', () => { Sound.click(); setInt(0); });
  $('#bInt1').addEventListener('click', () => { Sound.click(); setInt(100); });
  $('#bRec').addEventListener('click', recordNow);
  $('#bRecReset').addEventListener('click', () => { Sound.click(); S.run.rec = { rest: null, run: null }; S.run.dir = {}; updateCtl(); });
  $('#caseSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.o2.c = b.dataset.c; S.o2.note = ''; updateCtl(); } });
  $('#inCO').addEventListener('input', () => { S.o2.in[S.o2.c].co = $('#inCO').value; });
  $('#inVO').addEventListener('input', () => { S.o2.in[S.o2.c].vo = $('#inVO').value; });
  $('#bCalc').addEventListener('click', () => { S.o2.in[S.o2.c].co = $('#inCO').value; S.o2.in[S.o2.c].vo = $('#inVO').value; checkCalc(); });
  fillSelect($('#rSys'), SYS.map((s) => s.name), '— 고르기 —'); $('#rSys').firstChild.remove();
  fillSelect($('#rJob'), JOBS, '— 고르기 —'); fillSelect($('#rTake'), TAKES, '— 고르기 —'); fillSelect($('#rGive'), GIVES, '— 고르기 —');
  $('#rSys').addEventListener('change', () => { S.map.rsys = +$('#rSys').value; syncRole(); Sound.click(); });
  [['#rJob', 'job'], ['#rTake', 'take'], ['#rGive', 'give']].forEach(([id, key]) => $(id).addEventListener('change', () => {
    const i = S.map.rsys, r = (S.map.roles[i] = S.map.roles[i] || {}); const v = +$(id).value; r[key] = v < 0 ? null : v; Sound.tick(); updateCtl();
    if (roleOK(i)) { Sound.success(); say(SYS[i].name + ' 카드 완성!'); }
  }));
  $('#bLinkReset').addEventListener('click', () => { Sound.click(); S.map.links.clear(); S.map.flow = []; S.map.from = null; updateCtl(); });
  $('#casesSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.cs.k = b.dataset.k; syncCase(); updateCtl(); } });
  ['#cS1', '#cS2', '#cS3'].forEach((id, i) => $(id).addEventListener('change', () => { S.cs.pick[S.cs.k][i] = +$(id).value; Sound.tick(); if (csCaseOK(S.cs.k)) { Sound.success(); say('사례를 모두 맞게 이었어요!'); } }));
  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode(b.dataset.mode); } });

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'run') {
        for (let i = 0; i < ROWS.length; i++) for (const w of ['up', 'down']) if (hit(p, dirRect(i, w))) { S.run.dir[ROWS[i].key] = w; Sound.tick(); updateCtl(); return false; }
        return false;
      }
      if (S.mode === 'map') {
        const id = nodeAt(p); if (!id) { S.map.from = null; return false; }
        const m = S.map;
        if (m.from && m.from !== id) { const a = m.from; m.from = null; tryLink(a, id); return false; }
        m.from = id; m.drag = { from: id, x: p.x, y: p.y, moved: false, sx: p.x, sy: p.y }; Sound.click(); return true;
      }
      return false;
    },
    move(p) { const d = S.map.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true; },
    up(p) {
      const d = S.map.drag; if (!d) return; S.map.drag = null;
      if (!d.moved) return;
      const id = nodeAt(p); S.map.from = null;
      if (id && id !== d.from) tryLink(d.from, id);
    },
    hover(p) {
      if (S.mode === 'run') { for (let i = 0; i < ROWS.length; i++) for (const w of ['up', 'down']) if (hit(p, dirRect(i, w))) { S.hover = 'd' + i + w; return 'pointer'; } S.hover = ''; return 'default'; }
      if (S.mode === 'map') { const id = nodeAt(p); S.hover = id ? 'n' + id : ''; return id ? 'pointer' : 'default'; }
      return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let A, a, B, b, Cc, c;
    if (S.mode === 'run') {
      const R = S.run;
      A = '심박수 · 호흡수'; a = Math.round(R.hr) + ' · ' + Math.round(R.rr) + ' 회/분';
      B = '체온'; b = R.temp.toFixed(1) + ' °C';
      Cc = '기록한 값'; c = (R.rec.rest ? '안정 ✔' : '안정 —') + ' · ' + (R.rec.run ? '달리기 ✔' : '달리기 —');
    } else if (S.mode === 'o2') {
      const o = S.o2, C = CASE[o.c];
      A = '심박출량 (식 ①)'; b = ''; a = o.ok[o.c] ? fmtCO(C.co) + ' ≈ ' + C.coR + ' L/분' : '계산하기';
      B = '산소 소비량 (식 ②)'; b = o.ok[o.c] ? (C.vo === 3 ? '3.0' : C.vo) + ' L/분' : '계산하기';
      Cc = '완성한 경우'; c = (o.ok.rest ? '안정 ✔' : '안정 —') + ' · ' + (o.ok.run ? '달리기 ✔' : '달리기 —');
    } else if (S.mode === 'map') {
      A = '이은 연결선'; a = S.map.links.size + ' / ' + EDGES.length;
      B = '완성한 역할 카드'; b = SYS.filter((s, i) => roleOK(i)).length + ' / 4';
      Cc = '고른 기관계'; c = S.map.from ? NODE[S.map.from].name : '—';
    } else {
      A = '고른 사례'; a = CASES[S.cs.k].title.slice(0, 1) + ' ' + CASES[S.cs.k].title.slice(2);
      B = '이 사례에서 맞게 고른 칸'; b = [0, 1, 2].filter((s) => csSlotOK(S.cs.k, s)).length + ' / 3';
      Cc = '완성한 사례'; c = CASE_KEYS.filter(csCaseOK).length + ' / 3';
    }
    const key = A + a + B + b + Cc + c; if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = Cc; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    S.epoch++;
    if (li === 0) { S.run.rec = { rest: null, run: null }; S.run.dir = {}; setInt(0); setMode('run'); }
    else if (li === 1) { S.o2 = Object.assign(S.o2, { c: 'rest', ok: { rest: false, run: false }, in: { rest: { co: '', vo: '' }, run: { co: '', vo: '' } }, g: 0, note: '' }); initFlow(); setMode('o2'); }
    else if (li === 2) { S.map.links.clear(); S.map.flow = []; S.map.from = null; S.map.roles = {}; S.map.rsys = 0; syncRole(); setMode('map'); }
    else { S.cs.pick = { a: [-1, -1, -1], b: [-1, -1, -1], c: [-1, -1, -1] }; S.cs.k = 'a'; syncCase(); setMode('case'); }
    updateCtl();
  }
  function tableFeedback() {
    const R = S.run;
    if (!R.rec.rest || !R.rec.run) return '먼저 <b>안정 시</b>와 <b>달리기 중</b> 값을 모두 <b>📏 기록</b>해요.';
    const missing = ROWS.filter((r) => !R.dir[r.key]);
    if (missing.length) return '아직 고르지 않은 줄이 있어요: <b>' + missing.map((r) => r.name).join(', ') + '</b>. 표의 두 값을 비교해 ▲ 또는 ▼를 눌러요.';
    const bad = ROWS.filter((r) => R.dir[r.key] !== r.dir);
    if (bad.length) return '<b>' + bad.map((r) => r.name).join(', ') + '</b> 줄을 다시 비교해 봐요. 안정 시 값과 달리기 중 값 중 어느 쪽이 더 큰가요?';
    return true;
  }

  const levels = [
    {
      title: '운동 중 몸의 변화', short: '운동 중 몸', icon: '🏃', phase: '관찰',
      features: ['run'],
      intro: '<p class="si-q">❓ 탐구 질문: 30분 달리는 동안 소화 · 순환 · 호흡 · 배설 기관계는 어떻게 힘을 합칠까?</p>' +
        '<div class="si-link">🔗 <b>중학교 2학년 \'동물과 에너지\'에서</b> 소화 · 순환 · 호흡 · 배설 기관계의 구조와 기능을 배웠고, 앞 차시에서는 소화된 영양소가 순환계를 타고 세포로 간다는 것을 확인했어요.</div>' +
        '<p>이번에는 각 기관계를 따로 외우지 않고 <b>달리기라는 실제 활동</b>에서 기관계가 <b>어떻게 연결되어 함께 일하는지</b>를 살펴봐요. 먼저 안정 상태와 달리는 중의 몸을 <b>측정해서 비교</b>해 보세요.</p>' +
        '<p class="note">※ 신경계와 내분비계는 몸을 조절하는 기관계로, 이름만 알아 두고 자세한 내용은 다음 단원에서 배워요. 모든 측정값은 <b>교육용 가상 예시 값</b>이고 개인의 건강 정보가 아니에요.</p>',
      setup() { enterLevel(0); },
      recap: '달리기를 하면 심박수 · 호흡수 · 체온 · 땀이 늘고 오줌 생성량은 줄어요. 여러 기관계가 함께 변하는 거예요.',
      summary: '<ul><li>안정 시 (예시): 심박수 <b>70</b>회/분, 호흡수 <b>14</b>회/분, 체온 <b>37.0 °C</b>. 30분 달리기 후: <b>150</b>회/분, <b>35</b>회/분, 약 <b>38.5 °C</b>.</li><li>달리면 <b>땀이 늘고</b>, <b>오줌 생성량은 줄어요</b>.</li><li>이 변화들은 따로 일어나는 것이 아니라 <b>서로 연결</b>되어 있어요: 근육이 에너지를 더 쓰면 → 산소가 더 필요하고 → 호흡·심장이 빨라지며 → 열이 늘어 땀으로 내보내요.</li></ul>',
      missions: [
        {
          title: '안정 → 달리기 전환 관찰',
          goal: '강도를 <b>0 %(안정)</b>에서 <b>100 %(달리기)</b>로 바꿔 보며 값이 멈추면 각각 <b>📏 기록</b>해 표를 채우세요.',
          hint: '🛌 버튼으로 0 %, 🏃 버튼으로 100 %를 맞춰요. 숫자가 멈추면 📏 기록하기를 눌러요. 체온은 천천히 올라가요.',
          setup() { ensure('run'); },
          check: () => !!S.run.rec.rest && !!S.run.rec.run, hold: 0.4,
          status: () => mark(!!S.run.rec.rest) + ' 안정 시 기록 · ' + mark(!!S.run.rec.run) + ' 달리기 중 기록',
          explain: '안정 시에는 심박수 70회/분, 호흡수 14회/분, 체온 37.0 °C였고, 30분 달리기 뒤에는 150회/분, 35회/분, 38.5 °C로 변했어요(교육용 가상 값). 근육이 에너지를 많이 쓰기 때문에 몸 전체가 함께 반응하는 거예요.',
        },
        {
          title: '표 채우기: 무엇이 늘고 줄었을까?',
          goal: '표의 두 값을 비교해 달리기 중 <b>심박수 · 호흡수 · 체온 · 땀 · 오줌 생성량</b>이 늘었는지(▲) 줄었는지(▼) 모두 고르세요.',
          hint: '표 오른쪽 칸에서 ▲ 늘어요 / ▼ 줄어요 를 눌러요. 안정 시 값과 달리기 중 값을 비교해요.',
          manual: true,
          setup() { ensure('run'); },
          check: tableFeedback,
          explain: '심박수 70 → 150, 호흡수 14 → 35, 체온 37.0 → 38.5 °C, 땀은 늘고 <b>오줌 생성량은 줄었어요</b>. 오줌이 줄어드는 것은 혈액이 근육 쪽으로 많이 가고 땀으로 수분을 잃기 때문이에요(다음 단계에서 확인해요).',
        },
        {
          type: 'quiz', title: '서로 연결된 변화 찾기',
          goal: '달리는 동안 일어나는 변화와 그 까닭을 <b>바르게 연결한 것</b>은?',
          setup() { ensure('run'); },
          choices: ['땀이 늘어서 체온이 올라간다', '호흡수가 늘면 심박수는 줄어든다', '체온이 오르면 땀이 늘어 열이 몸 밖으로 나가며, 이때 순환계가 열을 피부로 운반한다', '오줌이 줄어드는 것은 소화계가 활발해졌기 때문이다'],
          answer: 2,
          feedback: ['원인과 결과가 거꾸로예요. 체온이 오르기 때문에 땀이 늘어요.', '달릴 때는 호흡수와 심박수가 함께 늘어요.', '', '오줌이 줄어드는 것은 배설계와 순환계의 변화 때문이에요. 소화계와는 관계가 적어요.'],
          explain: '근육에서 만들어진 열은 혈액(순환계)을 따라 피부로 운반되고, <b>땀(피부)</b>으로 열을 내보내 체온 상승을 막아요. 여러 기관계가 연결되어 함께 일하는 사례예요.',
        },
      ],
    },
    {
      title: '산소는 얼마나 운반될까?', short: '산소 운반', icon: '🩸', phase: '분석',
      features: ['o2'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달리면 심박수와 호흡수가 크게 늘었어요. 이 변화가 근육 세포에 <b>산소를 얼마나 더 보내 주는지</b>를 계산으로 확인해 봐요.</div>' +
        '<p>혈액이 1분 동안 심장에서 나가는 양을 <b>심박출량</b>이라고 해요. 산소 소비량은 심박출량에 <b>혈액이 내려놓은 산소의 양(산소 함량 차)</b>을 곱해서 구해요. 표의 값을 식에 넣어 안정 시와 달리기 중을 계산해 보세요.</p>',
      setup() { enterLevel(1); },
      recap: '달리기 중에는 심박출량과 산소 함량 차가 모두 커져서 산소 소비량이 안정 시의 12배가 되고, 혈액은 소화관보다 근육으로 많이 가요.',
      summary: '<ul><li>심박출량(L/분) = 심박수(회/분) × 1회 박출량(mL) ÷ 1000</li><li>산소 소비량(L/분) = 심박출량 × 동맥혈과 정맥혈의 산소 함량 차(혈액 100 mL당 mL) ÷ 100</li><li>안정 시: 70 × 70 ÷ 1000 = 4.9 ≈ <b>5</b> L/분 → 5 × 5 ÷ 100 = <b>0.25</b> L/분. 달리기: 150 × 130 ÷ 1000 = 19.5 ≈ <b>20</b> L/분 → 20 × 15 ÷ 100 = <b>3.0</b> L/분 (안정의 <b>12배</b>).</li><li>호흡수가 늘면 폐에서 산소를 더 많이 싣고, 심장이 빨리 뛰면 그 피가 근육으로 더 빨리 운반돼요. 혈류는 소화관(약 25 → 5 %)에서 근육(약 20 → 80 %)으로 옮겨 가요.</li></ul>',
      missions: [
        {
          title: '안정 시 산소 소비량 계산',
          goal: '🛌 <b>안정 시</b>의 심박출량(①)과 산소 소비량(②)을 계산해서 써 넣고 <b>✔ 계산 확인</b>을 누르세요.',
          hint: '① 70 × 70 ÷ 1000 = 4.9 (≈ 5). ② 심박출량 × 산소 함량 차(5) ÷ 100.',
          setup() { ensure('o2'); S.o2.c = 'rest'; updateCtl(); },
          check: () => S.o2.ok.rest, hold: 0.3,
          status: () => mark(S.o2.ok.rest) + ' 안정 시 계산 완료',
          explain: '안정 시: 심박출량 = 70 × 70 ÷ 1000 = 4.9 ≈ 5 L/분, 산소 소비량 = 5 × 5 ÷ 100 = <b>0.25 L/분</b>이에요. 혈액 한 번이 순환할 때 산소 1칸(5 mL/100 mL)을 내려놓는 셈이에요.',
        },
        {
          title: '달리기 때 산소 소비량 계산',
          goal: '🏃 <b>달리기</b> 값으로 심박출량(①)과 산소 소비량(②)을 계산해 <b>✔ 계산 확인</b>을 누르세요.',
          hint: '① 150 × 130 ÷ 1000 = 19.5 (≈ 20). ② 심박출량 × 산소 함량 차(15) ÷ 100.',
          setup() { ensure('o2'); S.o2.c = 'run'; updateCtl(); },
          check: () => S.o2.ok.run, hold: 0.3,
          status: () => mark(S.o2.ok.run) + ' 달리기 계산 완료',
          explain: '달리기: 심박출량 = 150 × 130 ÷ 1000 = 19.5 ≈ 20 L/분, 산소 소비량 = 20 × 15 ÷ 100 = <b>3.0 L/분</b>이에요. 안정 시의 <b>12배</b>예요. 혈액이 더 많이, 더 빨리 흐르고, 한 번에 내려놓는 산소(3칸)도 늘었어요.',
        },
        {
          type: 'quiz', title: '심박수만 두 배가 되면?',
          goal: '1회 박출량과 산소 함량 차가 그대로인데 <b>심박수만 두 배</b>가 되면 산소 소비량은?',
          setup() { ensure('o2'); },
          choices: ['변함없다', '절반이 된다', '네 배가 된다', '두 배가 된다'],
          answer: 3,
          feedback: ['심박출량 = 심박수 × 1회 박출량 ÷ 1000이라서, 심박수가 늘면 심박출량도 늘어요.', '심박수가 늘면 심박출량이 늘어요. 줄어드는 방향이 아니에요.', '심박수가 두 배면 심박출량이 두 배이고, 산소 소비량도 심박출량에 비례해서 두 배예요. 네 배는 아니에요.', ''],
          explain: '산소 소비량 = 심박출량 × 산소 함량 차 ÷ 100이고, 심박출량 = 심박수 × 1회 박출량 ÷ 1000이에요. 나머지 값이 그대로면 산소 소비량은 <b>심박수에 비례</b>해서 두 배가 돼요. 실제로 달릴 때는 1회 박출량과 산소 함량 차도 함께 커져서 12배까지 늘어요.',
        },
      ],
    },
    {
      title: '통합 지도와 역할놀이', short: '통합 지도', icon: '🗺', phase: '모형',
      features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산소는 폐에서 혈액에 실려 근육으로 운반되고, 소화관에서 근육으로 가는 혈액의 비율이 바뀌는 것을 확인했어요. 이제 달리는 몸 전체의 <b>물질의 흐름</b>을 한 장의 정보 그림으로 완성해요.</div>' +
        '<p>소화계 → 순환계 ← 호흡계 → 근육 세포 → 순환계 → 호흡계 · 배설계 · 피부. <b>모든 길은 순환계(혈액)를 지나요.</b> 연결선을 이어 지도를 완성하고, 기관계 한 곳을 맡아 <b>역할놀이 카드</b>를 채워 보세요.</p>',
      setup() { enterLevel(2); },
      recap: '소화·호흡이 들여온 영양소와 산소는 순환계를 통해 근육 세포로 가고, 세포가 만든 이산화 탄소·요소·열은 순환계를 통해 호흡계·배설계·피부로 나가요.',
      summary: '<ul><li><b>소화계</b>: 영양소를 흡수해 혈액에 줘요. <b>호흡계</b>: 산소를 혈액에 주고 이산화 탄소를 받아 내보내요.</li><li><b>순환계</b>: 영양소와 산소를 세포로, 이산화 탄소·요소·열을 호흡계·배설계·피부로 운반해요.</li><li><b>근육 세포</b>: 영양소와 산소로 세포호흡을 해 에너지를 얻고 이산화 탄소 · 요소 · 열을 내놓아요.</li><li><b>배설계</b>: 혈액 속 요소와 물을 걸러 오줌으로 내보내고, <b>피부</b>는 땀으로 열과 물을 내보내요.</li><li>기관계는 서로 <b>직접 연결</b>되기보다 <b>순환계를 중심</b>으로 협력하며, 몸의 조절은 신경계와 내분비계가 맡아요(다음 단원).</li></ul>',
      missions: [
        {
          title: '정보 그림 연결하기',
          goal: '물질이 가는 길을 따라 <b>7개의 연결선</b>(화살표)을 이어 통합 지도를 완성하세요. 모두 이었으면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '출발하는 곳을 누르고 도착하는 곳을 눌러요. 소화계와 호흡계의 물질은 어디로 들어갈까요? 근육 세포가 내놓는 것은 어디로 나갈까요?',
          manual: true,
          setup() { ensure('map'); },
          check: mapFeedback,
          explain: '영양소는 소화계 → 순환계, 산소는 호흡계 → 순환계로 들어가요. 순환계는 산소·영양소를 근육 세포로 운반하고, 근육 세포가 내놓은 이산화 탄소·요소·열을 받아 호흡계(이산화 탄소), 배설계(요소·물), 피부(열·땀)로 보내요.',
        },
        {
          title: '역할놀이: 내가 맡은 기관계',
          goal: '🎭 역할놀이 카드에서 기관계 <b>2개 이상</b>을 골라 <b>맡은 일 · 받는 것 · 주는 것</b>을 모두 알맞게 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '오른쪽 카드에서 기관계를 고른 뒤 세 칸을 모두 골라요. 완성하면 기관계 이름 옆에 ✔가 나타나요.',
          manual: true,
          setup() { ensure('map'); syncRole(); },
          check: roleFeedback,
          explain: '역할놀이 문장 예: <b>소화계</b> — 음식물을 분해해 영양소를 흡수한다 / 받는 것: 음식물 / 주는 것: 영양소를 혈액으로. <b>호흡계</b> — 산소를 받아들이고 이산화 탄소를 내보낸다 / 받는 것: 공기 / 주는 것: 산소를 혈액으로. <b>순환계</b>는 운반, <b>배설계</b>는 요소·물을 걸러 오줌으로 내보내는 일을 맡아요.',
        },
      ],
    },
    {
      title: '사례로 추론하기', short: '사례 추론', icon: '🔎', phase: '적용',
      features: ['case'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모든 물질의 길이 순환계를 중심으로 이어진다는 지도를 완성했어요. 이 지도를 이용하면 <b>한 곳이 바뀔 때 몸 전체에서 어떤 일이 일어나는지</b> 추론할 수 있어요.</div>' +
        '<p>세 가지 사례(<b>ⓐ 고산 지대 적응 · ⓑ 빈혈 · ⓒ 땀을 많이 흘린 뒤</b>)에서 <b>① 먼저 영향을 받는 곳 → ② 이어지는 변화 → ③ 나타나는 결과</b>를 골라 연쇄 반응을 완성해요.</p>',
      setup() { enterLevel(3); },
      recap: '기관계는 하나의 시스템으로 연결되어 있어서, 한 기관계의 변화는 다른 기관계의 변화를 이끌어 내요.',
      summary: '<ul><li>ⓐ <b>고산 지대</b>: 산소 분압이 낮아 호흡계로 흡수되는 산소가 줄어요 → 적혈구 수가 늘어요 → 혈액의 산소 운반량이 늘어 근육의 세포호흡이 유지돼요.</li><li>ⓑ <b>빈혈</b>: 순환계(혈액)의 산소 운반 능력이 줄어요 → 근육 세포에 전달되는 산소가 줄어 세포호흡이 떨어져요 → 쉽게 피로하고, 호흡수·심박수가 늘어 보상해요.</li><li>ⓒ <b>땀</b>: 피부로 수분이 빠져나가요 → 혈액량이 줄어 콩팥(배설계)이 물을 더 되돌려 받아요 → 오줌이 적고 진해져요.</li><li>한 기관계의 이상은 순환계를 통해 <b>다른 기관계의 변화</b>로 이어져요. 이것이 <b>기관계의 통합적 작용</b>이에요.</li></ul>',
      missions: [
        {
          title: '세 사례의 연쇄 반응 완성',
          goal: '<b>ⓐ ⓑ ⓒ</b> 세 사례 모두 ① 먼저 영향을 받는 곳, ② 이어지는 변화, ③ 나타나는 결과를 골라 연쇄를 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '오른쪽에서 사례를 바꿔 가며 선택해요. 산소나 물이 어디에서 줄거나 늘고, 그다음에 어느 기관계가 달라지는지 따라가요.',
          manual: true,
          setup() { ensure('case'); syncCase(); },
          check: csFeedback,
          explain: 'ⓐ 호흡계 → 적혈구 증가 → 산소 운반량 증가. ⓑ 순환계 → 근육으로 가는 산소 감소 → 피로·호흡수 증가. ⓒ 피부(땀) → 혈액량 감소, 콩팥이 물을 되돌려 받음 → 오줌이 적고 진해짐. 모두 <b>한 곳의 변화가 순환계를 거쳐 다른 기관계의 변화</b>로 이어지는 사례예요.',
        },
        {
          type: 'quiz', title: '한 기관계의 이상이 다른 기관계에 미치는 영향',
          goal: '한 기관계의 이상이 <b>다른 기관계의 변화</b>로 이어지는 예로 가장 알맞은 것은?',
          setup() { ensure('case'); },
          choices: ['폐의 기능이 떨어져 산소 흡수가 줄면, 순환계의 심박수가 늘어 보상하려고 한다', '소화계가 영양소를 더 많이 흡수하면 호흡계가 산소를 만들어 낸다', '배설계가 물을 더 내보내면 소화계의 효소가 늘어난다', '피부로 땀이 나면 호흡계에서 이산화 탄소가 사라진다'],
          answer: 0,
          feedback: ['', '호흡계는 산소를 만들지 못하고 몸 밖에서 받아들여요.', '배설계의 물 배출과 소화 효소의 양은 직접 이어지지 않아요.', '땀과 이산화 탄소 배출은 다른 경로예요.'],
          explain: '폐의 기능이 떨어지면 혈액에 실리는 산소가 줄어 근육 세포에 산소가 부족해져요. 그러면 순환계가 심박수를 높여 혈액을 더 빨리 보내서 부족한 산소를 보충하려고 해요. 이렇게 기관계는 <b>서로 영향을 주고받으며 하나의 시스템</b>으로 작동해요.',
        },
        {
          type: 'quiz', title: '운동 직후에도 심박수가 높은 까닭',
          goal: '운동을 멈춘 직후에도 심박수가 <b>천천히 안정 시 값으로 돌아오는</b> 까닭으로 가장 알맞은 것은?',
          setup() { ensure('case'); },
          choices: ['운동을 멈추면 몸은 에너지를 전혀 쓰지 않기 때문이다', '심장이 근육이라서 운동 직후에는 저절로 멈추기 때문이다', '운동이 끝나면 곧바로 모든 기관계가 안정 시 상태로 바뀌기 때문이다', '체온이 아직 높고 쌓인 물질을 처리하며 소비한 에너지(ATP)를 다시 만드는 데 산소가 계속 필요하기 때문이다'],
          answer: 3,
          feedback: ['운동이 끝난 뒤에도 몸은 에너지를 써요.', '심장은 멈추지 않고, 오히려 계속 뛰며 혈액을 보내요.', '몸의 변화는 서서히 돌아와요. 체온과 호흡이 바로 안정 시로 바뀌지 않아요.', ''],
          explain: '운동 직후에는 체온이 높아 열을 내보내야 하고, 근육이 써 버린 에너지(ATP)를 다시 만들기 위해 세포호흡에 산소가 계속 필요해요. 그래서 심박수와 호흡수가 <b>서서히</b> 줄어들어요.',
        },
      ],
    },
  ];

  initFlow();
  fillSelect($('#cS1'), CASES.a.s1, '— 고르기 —'); syncCase(); syncRole();
  game = SciSim.game({
    simId: 'hb-organ-systems', mount: '#game', badge: '기관계 협동 박사', homeHref: '../../index.html#hb',
    featureLabels: { run: '🏃 달리기 강도 · 심박수/호흡수/체온 측정표', o2: '🩸 산소 운반 모형 · 계산 도구', map: '🗺 기관계 통합 지도 · 🎭 역할놀이', case: '🔎 사례 연쇄 추론' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.msgT > 0) S.msgT -= dt;
    if (S.mode === 'run') stepRun(dt); else if (S.mode === 'o2') stepO2(dt); else if (S.mode === 'map') stepMap(dt); else stepCase(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'run') drawRun(t); else if (S.mode === 'o2') drawO2(t); else if (S.mode === 'map') drawMap(t); else drawCase(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,248,244,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, ensure, updateCtl, enterLevel, setInt, recordNow, checkCalc, tryLink, nodeRect, NODE, EDGES, CASES, ROWS, dirRect, TG, OG, CGm, SYS, roleOK, mapDone, csCaseOK, syncCase, syncRole, runSettled, REST, RUN,
  };
})();
