/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 대사성 질환 알아보기 (단원 6차시)
   성취기준 [12생과01-05] 물질대사 관련 질병 조사를 위한 방법을 고안하여 수행하고 대사성 질환을 예방하기 위한
   올바른 생활 습관에 대해 토의하며 협력적으로 소통할 수 있다.
   ① 관찰: 대사성 질환 (포도당 부하 검사 혈당 곡선 2개 비교, 에너지 저장·사용 불균형 흐름)
   ② 탐구: 조사 설계 (연구 질문 → 조사 계획서 6항목)
   ③ 분석: 자료 분석 (가상 학생 40명: 군별 평균 막대그래프 · 걸음 수–BMI 산점도, 상관 ≠ 인과)
   ④ 적용: 습관 토의 (에너지 균형 계산 · 습관 카드 3개와 근거 · 가상 모둠원 의견 비교)
   ※ 모든 자료는 '교육용 가상 데이터'. 개인 건강 정보 입력 기능 없음. 의료 조언 아님.
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
  const BG = '#f3f8f4', INK = '#14532d', MUTED = '#64748b', WARN = '#b45309';
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
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const DISC = '교육용 가상 데이터 · 의료 조언이 아니에요';

  /* ---------- 자료 (모두 교육용 가상 데이터) ---------- */
  const TIMES = [0, 30, 60, 120];
  const OG_DATA = { A: [90, 140, 120, 95], B: [130, 250, 270, 220] };
  const PERSON = { A: { name: '가상 인물 A', col: '#16a34a' }, B: { name: '가상 인물 B', col: '#dc2626' } };
  const fastClass = (v) => (v < 100 ? '정상' : v < 126 ? '주의' : '당뇨병 의심');
  const FLOW = {
    A: ['🍚 음식을 먹어요', '혈당이 올라요', '혈당을 낮추는 호르몬이 충분히 작용해요', '세포가 포도당을 흡수 · 사용 · 저장해요', '혈당이 정상으로 돌아와요'],
    B: ['🍚 음식을 먹어요', '혈당이 올라요', '혈당을 낮추는 호르몬 작용이 충분하지 않아요', '세포가 포도당을 잘 쓰거나 저장하지 못해요', '혈당이 오래 높게 유지돼요 (에너지 저장 · 사용 불균형)'],
  };
  /* 조사 계획서 */
  const QUESTION = '단 음료를 자주 마시는 습관은 공복 혈당과 관련이 있을까?';
  const PLAN = [
    { label: '조사 방법', ans: 2, opts: [
      { t: '설문만 한다 (주당 단 음료 횟수만 조사)', why: '혈당 자료가 없으면 혈당과의 관련을 확인할 수 없어요.' },
      { t: '인터넷 후기 몇 개를 모아 본다', why: '출처와 대상이 불분명해서 믿을 만한 자료가 아니에요.' },
      { t: '설문으로 주당 단 음료 횟수를 묻고, 건강검진 자료의 공복 혈당과 연결해 비교한다', why: '' },
      { t: '건강검진의 공복 혈당 자료만 본다', why: '단 음료 습관 자료가 없으면 습관과의 관련을 알 수 없어요.' } ] },
    { label: '변수 정의', ans: 0, opts: [
      { t: '비교할 변수: 주당 단 음료 마신 횟수(회) / 측정할 변수: 공복 혈당(mg/dL)', why: '' },
      { t: '비교할 변수: 공복 혈당 / 측정할 변수: 단 음료 마신 횟수', why: '조사하려는 습관과 측정하는 결과가 거꾸로예요.' },
      { t: '‘건강한 정도’를 느낌으로 점수 매긴다', why: '측정 기준이 없어 사람마다 달라져요. 숫자로 잴 수 있는 변수가 필요해요.' },
      { t: '단 음료의 맛과 기분을 비교한다', why: '혈당과 관련 있는 변수가 아니고 측정하기도 어려워요.' } ] },
    { label: '비교 집단', ans: 1, opts: [
      { t: '단 음료를 마시는 학생만 조사한다', why: '적게 마시는 비교 집단이 없으면 차이가 있는지 알 수 없어요.' },
      { t: '마시는 횟수에 따라 0~2회 / 3~6회 / 7회 이상 군으로 나눈다', why: '' },
      { t: '키가 큰 학생과 작은 학생으로 나눈다', why: '조사하려는 변수와 상관없는 기준으로 나눴어요.' },
      { t: '이름 가나다순으로 반을 나눈다', why: '의미 없는 기준이라 비교할 수 없어요.' } ] },
    { label: '표본 수', ans: 3, opts: [
      { t: '단 음료를 좋아하는 5명만', why: '표본이 적고 한쪽으로 치우쳤어요.' },
      { t: '1명을 한 달 동안만', why: '한 사람의 자료로는 집단의 경향을 알 수 없어요.' },
      { t: '3명', why: '표본이 너무 적으면 우연의 영향이 커서 일반화하기 곤란해요.' },
      { t: '가상 학교 학생 40명 (1~40번)', why: '' } ] },
    { label: '개인 정보 보호', ans: 0, opts: [
      { t: '이름 대신 번호(1~40)만 쓰고, 개인이 드러나지 않게 집단 결과로 발표한다', why: '' },
      { t: '이름과 학번을 함께 발표한다', why: '개인이 드러나면 건강 정보가 노출돼요.' },
      { t: '친구 몰래 건강검진 결과를 가져온다', why: '동의 없이 개인의 건강 정보를 얻으면 안 돼요.' },
      { t: '본인이나 가족의 실제 혈당을 이 화면에 입력한다', why: '이 시뮬레이션은 실제 건강 정보를 입력하지 않아요. 가상 자료만 써요.' } ] },
    { label: '한계', ans: 2, opts: [
      { t: '관련이 있으면 단 음료가 혈당을 높인 것이 확실하다', why: '관련이 있어도 원인이라고 단정할 수 없어요(상관 ≠ 인과).' },
      { t: '이 결과는 다른 학교에서도 똑같이 나올 것이다', why: '이 자료만으로 다른 집단까지 확정할 수 없어요.' },
      { t: '관련이 있어 보여도 원인이라고 단정할 수 없고, 운동량 · 유전 · 식사량 같은 다른 요인이 영향을 줄 수 있다', why: '' },
      { t: '한계는 없다', why: '모든 조사에는 표본 · 측정 · 다른 요인 같은 한계가 있어요.' } ] },
  ];
  /* 가상 학생 40명: 군별 공복 혈당 평균이 88 · 94 · 103이 되도록 만든 자료, 걸음 수와 BMI는 대체로 반비례 */
  const GROUPS = [{ name: '0~2회 군', n: 18, mean: 88, col: '#38bdf8' }, { name: '3~6회 군', n: 14, mean: 94, col: '#f59e0b' }, { name: '7회 이상 군', n: 8, mean: 103, col: '#ef4444' }];
  function makeStudents() {
    const R = mulberry(6140511), st = [];
    const gid = []; GROUPS.forEach((g, gi) => { for (let i = 0; i < g.n; i++) gid.push(gi); });
    for (let i = gid.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [gid[i], gid[j]] = [gid[j], gid[i]]; }
    const vals = GROUPS.map((g) => { const a = []; for (let i = 0; i < g.n; i++) a.push(Math.round(g.mean + (R() + R() - 1) * 16)); let d = g.mean * g.n - a.reduce((x, y) => x + y, 0), k = 0; while (d !== 0) { const s = d > 0 ? 1 : -1; if (a[k % g.n] + s >= 72 && a[k % g.n] + s <= 124) { a[k % g.n] += s; d -= s; } k++; } return a; });
    const cnt = [0, 0, 0];
    for (let i = 0; i < 40; i++) {
      const g = gid[i], steps = Math.round((2500 + R() * 11000) / 100) * 100;
      const bmi = Math.round(clamp(28.6 - 0.00058 * steps + (R() + R() - 1) * 3.2, 18.6, 32.4) * 10) / 10;
      st.push({ no: i + 1, g, glu: vals[g][cnt[g]++], steps, bmi, px: 0, py: 0, pr: 0 });
    }
    return st;
  }
  const STU = makeStudents();
  const gStat = (g) => { const v = STU.filter((s) => s.g === g).map((s) => s.glu); return { n: v.length, mean: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v) }; };
  const regress = () => { const n = STU.length, mx = STU.reduce((a, s) => a + s.steps, 0) / n, my = STU.reduce((a, s) => a + s.bmi, 0) / n; let sxy = 0, sxx = 0; STU.forEach((s) => { sxy += (s.steps - mx) * (s.bmi - my); sxx += (s.steps - mx) ** 2; }); const b = sxy / sxx; return { b, a: my - b * mx }; };
  const STATEMENTS = [
    { t: '단 음료를 자주 마시는 군일수록 평균 공복 혈당이 높은 경향이 보인다', ok: true, why: '' },
    { t: '단 음료를 많이 마셔서 혈당이 높아진 것이다', ok: false, why: '“단 음료가 혈당을 높였다”는 이 자료만으로 단정할 수 없어요(관련 ≠ 원인).' },
    { t: '7회 이상 군의 평균 공복 혈당은 0~2회 군보다 15 mg/dL 높다', ok: true, why: '' },
    { t: '하루 걸음 수가 많은 학생일수록 BMI가 대체로 낮은 경향이 보인다', ok: true, why: '' },
    { t: '걸음 수를 늘리면 누구나 BMI가 반드시 낮아진다', ok: false, why: '산점도는 경향을 보여 줄 뿐, 모두에게 반드시 적용되는 것은 아니에요.' },
  ];
  /* 생활 습관 카드 */
  const HAB = [
    { icon: '🥗', name: '균형 잡힌 식단', ans: 1, r: ['먹는 양은 몸의 에너지와 관계가 없어서', '섭취 에너지를 소비 에너지와 맞춰 에너지 균형을 유지할 수 있어서', '한 가지 음식만 먹으면 혈당이 반드시 낮아져서', '친구들이 모두 하고 있어서'] },
    { icon: '🏃', name: '규칙적인 신체 활동', ans: 3, r: ['땀을 많이 흘리면 병원체가 사라져서', '운동을 하면 에너지를 쓰지 않게 되어서', '걸음 수와 BMI는 아무 관계가 없어서', '에너지 소비가 늘어 균형을 맞추는 데 도움이 되고, 걸음 수가 많은 학생의 BMI가 대체로 낮은 경향이 있어서'] },
    { icon: '😴', name: '충분한 수면', ans: 0, r: ['규칙적인 생활 리듬과 건강한 대사를 유지하는 데 도움이 된다고 알려져 있어서', '잠을 자는 동안에는 세포호흡이 멈추어서', '잠을 자면 혈당이 항상 0이 되어서', '수면 시간과 몸의 물질대사는 완전히 무관해서'] },
    { icon: '🥤', name: '단 음료 줄이기', ans: 2, r: ['단 음료가 병원체를 옮기기 때문에', '단 음료는 에너지가 전혀 없어서', '단 음료를 많이 마시는 군의 평균 공복 혈당이 높은 경향이 있고, 섭취 에너지도 줄일 수 있어서', '이 조사에서 단 음료가 혈당을 높인 것이 증명되었기 때문에'] },
    { icon: '⏰', name: '규칙적인 식사', ans: 1, r: ['식사 횟수가 많을수록 혈당이 반드시 내려가서', '한꺼번에 많이 먹는 것을 막아 혈당이 갑자기 오르는 것을 줄일 수 있어서', '식사를 거르면 에너지가 저절로 만들어져서', '시간을 지키면 소화 효소가 필요 없어져서'] },
    { icon: '🌙', name: '야식 줄이기', ans: 3, r: ['밤에는 소화 효소가 작용하지 않아서', '야식은 항상 병원체를 늘려서', '밤에 먹으면 에너지가 사라져서', '늦은 밤의 섭취 에너지를 줄여 섭취가 소비보다 많아지는 것을 막을 수 있어서'] },
  ];
  const TEAM = [
    { name: '가은', icon: '🧒', pick: [1, 3, 2] },
    { name: '나래', icon: '👧', pick: [0, 1, 5] },
    { name: '도윤', icon: '🧑', pick: [1, 3, 4] },
  ];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'ogtt', sub: 'calc', view: 'bar', clock: 0, fade: 0, hover: '', epoch: 0, msg: '', msgT: 0, pick: null,
    og: { p: 'A', ti: 0, meas: { A: [null, null, null, null], B: [null, null, null, null] }, cur: 0 },
    plan: { sel: [-1, -1, -1, -1, -1, -1], shake: -1, shakeT: 0 },
    data: { g: -1, pt: -1, gSeen: new Set(), pSeen: new Set(), trend: false, trendP: 0, stm: new Set(), enter: 0, dots: [] },
    hab: { intake: 2000, expend: 2000, ok: false, tilt: 0, day: 0, picks: [], reason: [-1, -1, -1], shake: -1, shakeT: 0, answer: '' },
  };
  let game = null;
  function say(m, sec) { S.msg = m; S.msgT = sec || 3; }

  /* ======================================================
     ① 포도당 부하 검사
     ====================================================== */
  const OGG = () => (PHONE
    ? { gx: 58, gy: 70, gw: 440, gh: 220, c1: { x: 10, y: 340, w: 500, h: 76 }, flow: { x: 10, y: 462, w: 500 } }
    : { gx: 80, gy: 62, gw: 440, gh: 246, c1: { x: 548, y: 56, w: 240, h: 112 }, c2: { x: 548, y: 176, w: 240, h: 168 }, flow: { x: 12, y: 404, w: 776 } });
  const ogY = (v) => { const g = OGG(); return g.gy + g.gh - (clamp(v, 60, 300) - 60) / 240 * g.gh; };
  const ogX = (t) => { const g = OGG(); return g.gx + g.gw * t / 120; };
  const ogCount = () => ['A', 'B'].reduce((a, k) => a + S.og.meas[k].filter(Boolean).length, 0);
  function doMeasure() {
    const o = S.og, m = o.meas[o.p];
    if (m[o.ti]) { say('이미 측정한 시점이에요. 다른 시점을 골라요.'); Sound.tick(); return; }
    const pt = { t: TIMES[o.ti], v: OG_DATA[o.p][o.ti], pop: 0, drop: 0 };
    m[o.ti] = pt; Sound.click();
    SciSim.tween(pt, { drop: 1 }, { duration: RM ? 0.01 : 0.45, ease: 'inCubic', onDone: () => { SciSim.tween(pt, { pop: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outBack' }); Sound.success(); if (!RM) parts.burst(ogX(pt.t), ogY(pt.v), { count: 10, speed: 90, size: 2.8, life: 0.6, colors: [PERSON[o.p].col, '#fff'], shape: 'circle', gravity: 0 }); } });
    // 다음 시점으로 자동 이동
    const nx = m.findIndex((x) => !x); if (nx >= 0) o.ti = nx;
    updateCtl();
  }
  function catmull(pts, n) {
    const out = []; if (pts.length < 2) return pts.slice();
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    out.push(pts[pts.length - 1]); return out;
  }
  function drawFlow(x, y, w, list, active, col, t) {
    if (PHONE) {
      const rh = 50, gap = 6;
      list.forEach((txt, i) => {
        const yy = y + i * (rh + gap);
        card(x, yy, w, rh, i === list.length - 1 && active === 'B' ? '#fef2f2' : '#fff', i === list.length - 1 ? col : '#d1fae5');
        T(x + 22, yy + rh / 2 + 6, String(i + 1), 16, col, 'center', 800);
        block(x + 42, yy + 21, w - 56, txt, 13, INK, 16, 800);
        if (i < list.length - 1) D.arrow(x + w / 2, yy + rh + 1, x + w / 2, yy + rh + gap + 1, { color: col, width: 3, head: 7 });
      });
      return;
    }
    const n = list.length, gap = 22, cw = (w - gap * (n - 1)) / n, ch = 108;
    list.forEach((txt, i) => {
      const xx = x + i * (cw + gap), last = i === n - 1;
      card(xx, y, cw, ch, last && active === 'B' ? '#fef2f2' : '#fff', last ? col : '#d1fae5');
      T(xx + 12, y + 20, String(i + 1), 14, col, 'left', 800);
      block(xx + 12, y + 42, cw - 22, txt, 13, INK, 17, 800);
      if (i < n - 1) { const ax = xx + cw + 2, ph = (t * 1.4 + i * 0.25) % 1; D.arrow(ax, y + ch / 2, ax + gap - 4, y + ch / 2, { color: col, width: 3.5, head: 8, alpha: 0.5 + 0.5 * Math.sin(ph * TAU) * 0.5 + 0.25 }); }
    });
  }
  function drawOgtt(t) {
    const g = OGG(), o = S.og, pc = PERSON[o.p];
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(g.gx, P(26, 26), '포도당 부하 검사 (가상 인물 A · B)', P(16, 14.5), INK, 'left', 800);
    card(g.gx - 40, g.gy - 20, g.gw + 56, g.gh + 74, '#fff', '#e2e8f0');
    // 정상 곡선이 지나는 범위 띠 (A의 곡선 ± 15)
    const up = OG_DATA.A.map((v, i) => [ogX(TIMES[i]), ogY(v + 15)]), dn = OG_DATA.A.map((v, i) => [ogX(TIMES[i]), ogY(v - 15)]);
    const cu = catmull(up, 14), cd = catmull(dn, 14).reverse();
    ctx.save(); ctx.fillStyle = 'rgba(34,197,94,.14)'; ctx.beginPath(); cu.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); cd.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore();
    T(ogX(75), ogY(P(88, 80)), '정상 곡선이 지나는 범위 (예시)', P(12, 11.5), '#15803d', 'center', 800);
    // 격자 · 축
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let v = 60; v <= 300; v += 40) { const y = ogY(v); ctx.beginPath(); ctx.moveTo(g.gx, y); ctx.lineTo(g.gx + g.gw, y); ctx.stroke(); T(g.gx - 8, y + 4, String(v), 12, MUTED, 'right', 700); }
    TIMES.forEach((m) => { const x = ogX(m); ctx.beginPath(); ctx.moveTo(x, g.gy); ctx.lineTo(x, g.gy + g.gh); ctx.stroke(); T(x, g.gy + g.gh + 17, String(m), 12, MUTED, 'center', 700); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.gx, g.gy - 4); ctx.lineTo(g.gx, g.gy + g.gh); ctx.lineTo(g.gx + g.gw + 4, g.gy + g.gh); ctx.stroke(); ctx.restore();
    T(g.gx + g.gw / 2, g.gy + g.gh + 38, '포도당 용액을 마신 뒤 시간 (분)', 12.5, MUTED, 'center', 800);
    ctx.save(); ctx.translate(g.gx - 44, g.gy + g.gh / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '혈당 (mg/dL)', 12.5, MUTED, 'center', 800); ctx.restore();
    // 공복 기준 띠 (0분)
    [[60, 100, '#86efac'], [100, 126, '#fde047'], [126, 300, '#fca5a5']].forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(g.gx + 1, ogY(Math.min(b, 300)), 9, ogY(a) - ogY(Math.min(b, 300))); });
    // 곡선
    ['A', 'B'].forEach((k) => {
      const ms = o.meas[k].filter(Boolean); if (!ms.length) return;
      const sel = k === o.p; ctx.save(); ctx.globalAlpha = sel ? 1 : 0.55;
      const pts = ms.map((m) => [ogX(m.t), ogY(m.v)]);
      if (pts.length >= 2) { ctx.strokeStyle = PERSON[k].col; ctx.lineWidth = sel ? 4 : 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); catmull(pts, 16).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
      ms.forEach((m) => {
        const px = ogX(m.t), py = ogY(m.v), dr = m.drop;
        if (dr < 1) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); const yy = lerp(py - 60, py, dr); ctx.arc(px, yy, 5, 0, TAU); ctx.fill(); }
        else { const s = Math.max(0.01, m.pop); D.sphere(px, py, 7.5 * s, PERSON[k].col, { gloss: true }); if (m.pop > 0.6) T(px, py - 13, String(m.v), 12.5, PERSON[k].col, 'center', 800, { stroke: '#fff', strokeWidth: 4 }); }
      });
      ctx.restore();
    });
    // 오른쪽(또는 아래) 카드
    const ms = o.meas[o.p], done = ms.filter(Boolean).length === 4;
    if (!PHONE) {
      const c1 = g.c1, c2 = g.c2;
      card(c1.x, c1.y, c1.w, c1.h, '#fff', '#fde68a');
      T(c1.x + 12, c1.y + 22, '📏 공복(0분) 혈당 기준', 13.5, WARN, 'left', 800);
      [['#86efac', '100 미만: 정상'], ['#fde047', '100~125: 주의'], ['#fca5a5', '126 이상: 당뇨병 의심']].forEach((r, i) => { ctx.fillStyle = r[0]; rr(c1.x + 14, c1.y + 36 + i * 22, 14, 14, 4).fill(); T(c1.x + 36, c1.y + 48 + i * 22, r[1] + (i < 2 ? '' : ''), 13, INK, 'left', 800); });
      card(c2.x, c2.y, c2.w, c2.h, '#fff', rgba(pc.col, 0.5));
      T(c2.x + 12, c2.y + 22, pc.name, 14.5, pc.col, 'left', 800);
      TIMES.forEach((m, i) => { const q = ms[i]; T(c2.x + 14, c2.y + 46 + i * 20, m + '분', 13, MUTED, 'left', 800); T(c2.x + 70, c2.y + 46 + i * 20, q ? q.v + ' mg/dL' + (i === 0 ? ' · ' + fastClass(q.v) : '') : '—', 13, q ? INK : '#cbd5e1', 'left', 800); });
      if (done) block(c2.x + 12, c2.y + 138, c2.w - 20, o.p === 'A' ? '혈당이 올랐다가 2시간 뒤 처음 수준으로 돌아와요.' : '혈당이 크게 오르고 2시간 뒤에도 높아요 (조절 이상, 예시).', 12, INK, 15, 800);
    } else {
      const c1 = g.c1; card(c1.x, c1.y, c1.w, c1.h, '#fff', rgba(pc.col, 0.5));
      T(c1.x + 12, c1.y + 22, pc.name + ' · 공복 기준: 100 미만 정상 · 100~125 주의 · 126 이상 의심', 12, pc.col, 'left', 800);
      TIMES.forEach((m, i) => { const q = ms[i]; T(c1.x + 14 + i * 122, c1.y + 46, m + '분', 12, MUTED, 'left', 800); T(c1.x + 14 + i * 122, c1.y + 64, q ? q.v + (i === 0 ? ' ' + fastClass(q.v) : '') : '—', 12.5, q ? INK : '#cbd5e1', 'left', 800); });
    }
    T(PHONE ? 260 : 400, g.flow.y - P(12, 10), '에너지 저장 · 사용의 흐름 — ' + pc.name, P(14, 13), pc.col, 'center', 800);
    drawFlow(g.flow.x, g.flow.y + P(4, 8), g.flow.w, FLOW[o.p], o.p, pc.col, t);
    T(VW / 2, VH - 6, DISC, 11.5, WARN, 'center', 800);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(350, 306), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }

  /* ======================================================
     ② 조사 설계 (조사 계획서)
     ====================================================== */
  const PLG = () => (PHONE
    ? { qy: 40, qh: 62, y0: 112, rh: 90, lx: 10, lw: 90, w: 500 }
    : { qy: 36, qh: 54, y0: 98, rh: 62, lx: 16, lw: 136, w: 768 });
  const planRect = (i) => { const g = PLG(); return { x: g.lx, y: g.y0 + i * g.rh, w: g.w, h: g.rh - 7 }; };
  const planOK = (i) => S.plan.sel[i] === PLAN[i].ans;
  const planCount = () => PLAN.filter((p, i) => planOK(i)).length;
  function planFeedback() {
    const pl = S.plan;
    const empty = pl.sel.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
    if (empty.length) return '아직 고르지 않은 칸이 있어요: <b>' + empty.map((i) => PLAN[i].label).join(', ') + '</b>.';
    const bad = PLAN.map((p, i) => i).filter((i) => !planOK(i));
    if (bad.length) { const i = bad[0]; return '<b>' + PLAN[i].label + '</b>: ' + PLAN[i].opts[pl.sel[i]].why; }
    return true;
  }
  function openPlanPick(i) {
    const g = PLG();
    S.pick = { row: i, opts: PLAN[i].opts.map((o, k) => ({ k, label: o.t })), w: P(620, 488) };
    Sound.click();
  }
  function drawPlan(t) {
    const g = PLG(), pl = S.plan;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(g.lx, g.qy, g.w, g.qh, '#ecfdf5', '#86efac');
    T(g.lx + 14, g.qy + 24, '❓ 연구 질문', 13, '#166534', 'left', 800);
    block(g.lx + 14, g.qy + 46, g.w - 28, QUESTION, P(16, 14.5), INK, 20, 800);
    PLAN.forEach((p, i) => {
      const r = planRect(i), sel = pl.sel[i], ok = sel >= 0 && planOK(i), bad = sel >= 0 && !ok, hv = S.hover === 'p' + i;
      const sh = pl.shake === i && pl.shakeT > 0 ? Math.sin(pl.shakeT * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { ctx.fillStyle = ok ? '#f0fdf4' : bad ? '#fef2f2' : hv ? '#f8fafc' : '#fff'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = ok ? '#16a34a' : bad ? '#f87171' : '#cbd5e1'; ctx.lineWidth = ok || bad ? 2.5 : 2; if (sel < 0) ctx.setLineDash([6, 5]); rr(r.x, r.y, r.w, r.h, 12).stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#16a34a'; rr(r.x, r.y, g.lw, r.h, 12).fill(); ctx.fillStyle = '#16a34a'; ctx.fillRect(r.x + g.lw - 12, r.y, 12, r.h);
      TF(r.x + 6 + (g.lw - 12) / 2, r.y + r.h / 2 + 5, p.label, g.lw - 14, P(14.5, 13), '#fff', 'center', 800);
      if (sel >= 0) { block(r.x + g.lw + 12, r.y + P(25, 24), r.w - g.lw - 52, p.opts[sel].t, P(13.5, 12.5), INK, P(19, 18), 800); if (ok) D.check(r.x + r.w - 20, r.y + r.h / 2, 11, 1); else T(r.x + r.w - 20, r.y + r.h / 2 + 8, '✕', 22, '#dc2626', 'center', 800); }
      else T(r.x + g.lw + 14, r.y + r.h / 2 + 5, '눌러서 고르기', 13.5, '#16a34a', 'left', 800);
      ctx.restore();
      if (pl.shake === i && pl.shakeT > 0) pl.shakeT -= 0.016;
    });
    TF(VW / 2, VH - P(26, 40), P('🔒 개인 정보 보호: 본인·가족의 건강 정보를 입력하는 칸은 없어요. 가상 인물 번호만 써요.', '🔒 건강 정보 입력 칸은 없고, 가상 인물 번호만 써요.'), VW - 24, P(12, 12), '#475569', 'center', 800);
    T(VW / 2, VH - P(8, 18), DISC, 11.5, WARN, 'center', 800);
    if (S.msgT > 0 && !S.pick) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); const ls = wrapLines(S.msg, P(700, 470), 13.5, 800); const h = 14 + ls.length * 19; D.shadow(() => { ctx.fillStyle = '#1b2333'; rr(VW / 2 - P(360, 245), P(478, 662), P(720, 490), h + 10, 12).fill(); }, { blur: 8 }); ls.forEach((l, i) => T(VW / 2, P(478, 662) + 22 + i * 19, l, 13.5, '#fff', 'center', 800)); ctx.restore(); }
  }
  function drawPicker() {
    const pk = S.pick; if (!pk) return;
    ctx.fillStyle = 'rgba(15,23,42,.35)'; ctx.fillRect(0, 0, VW, VH);
    const size = P(13.5, 12.5), lh = P(18, 17), w = pk.w; const hs = pk.opts.map((o) => 18 + wrapLines(o.label, w - 56, size, 800).length * lh);
    const total = hs.reduce((a, b) => a + b + 8, 0) + 56; const x = (VW - w) / 2, y = Math.max(10, (VH - total) / 2);
    pk.rect = { x, y, w, h: total };
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, total, 16).fill(); }, { blur: 20, y: 8 });
    T(x + 18, y + 28, '📝 ' + PLAN[pk.row].label + ' — 알맞은 것을 골라요', 14.5, INK, 'left', 800);
    let yy = y + 44;
    pk.opts.forEach((o, i) => {
      const r = { x: x + 12, y: yy, w: w - 24, h: hs[i] }; o.r = r; yy += hs[i] + 8;
      const hv = S.hover === 'pk' + i;
      ctx.fillStyle = hv ? '#dcfce7' : '#f8fafc'; rr(r.x, r.y, r.w, r.h, 12).fill(); ctx.strokeStyle = hv ? '#16a34a' : '#e2e8f0'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 12).stroke();
      T(r.x + 18, r.y + 22, ['①', '②', '③', '④'][i], size + 1, '#16a34a', 'center', 800);
      block(r.x + 36, r.y + 22, r.w - 50, o.label, size, INK, lh, 800);
    });
  }

  /* ======================================================
     ③ 자료 분석
     ====================================================== */
  const DG = () => (PHONE
    ? { gx: 56, gy: 50, gw: 444, gh: 300, card: { x: 10, y: 414, w: 500, h: 168 } }
    : { gx: 84, gy: 46, gw: 440, gh: 380, card: { x: 552, y: 46, w: 236, h: 330 } });
  const barX = (g, i) => { const G = DG(); return G.gx + G.gw * (i + 0.5) / 3; };
  const gbY = (v) => { const G = DG(); return G.gy + G.gh - v / 130 * G.gh; };
  const scX = (s) => { const G = DG(); return G.gx + (s - 2000) / 12000 * G.gw; };
  const scY = (b) => { const G = DG(); return G.gy + G.gh - (b - 16) / 18 * G.gh; };
  function layoutDots() {
    const R = mulberry(777);
    STU.forEach((s) => { s.jit = (R() - 0.5) * 0.8; s.fx = 0; s.fy = 0; });
  }
  function enterData() { const d = S.data; d.enter = 0; d.bars = [0, 0, 0]; STU.forEach((s, i) => { s.t0 = i * 0.03; s.fly = 0; }); d.trendP = d.trend ? 1 : 0; }
  function stepData(dt) {
    const d = S.data; d.enter = Math.min(2.5, d.enter + dt);
    GROUPS.forEach((g, i) => { d.bars[i] = RM ? gStat(i).mean : SciSim.approach(d.bars[i], gStat(i).mean, dt, 4); });
    STU.forEach((s) => { const k = clamp((d.enter - s.t0) / 0.7, 0, 1); s.fly = RM ? 1 : SciSim.ease.outCubic(k); });
    d.trendP = RM ? (d.trend ? 1 : 0) : SciSim.approach(d.trendP, d.trend ? 1 : 0, dt, 4);
  }
  const bmiCol = (b) => (b < 23 ? '#38bdf8' : b < 25 ? '#f59e0b' : '#ef4444');
  function drawData(t) {
    const G = DG(), d = S.data;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(G.gx - 52, G.gy - 24, G.gw + P(76, 62), G.gh + 78, '#fff', '#e2e8f0');
    if (S.view === 'bar') {
      T(G.gx - 40, G.gy - 8, '군별 평균 공복 혈당 (가상 학생 40명)', P(14, 13), INK, 'left', 800);
      ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      for (let v = 0; v <= 120; v += 20) { const y = gbY(v); ctx.beginPath(); ctx.moveTo(G.gx, y); ctx.lineTo(G.gx + G.gw, y); ctx.stroke(); T(G.gx - 8, y + 4, String(v), 12, MUTED, 'right', 700); }
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.gx, G.gy - 4); ctx.lineTo(G.gx, G.gy + G.gh); ctx.lineTo(G.gx + G.gw + 4, G.gy + G.gh); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(G.gx - 38, G.gy + G.gh / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '공복 혈당 (mg/dL)', 12.5, MUTED, 'center', 800); ctx.restore();
      D.dashedLine(G.gx, gbY(100), G.gx + G.gw, gbY(100), { color: '#d97706', width: 2, dash: [8, 6], offset: t * 12 });
      T(G.gx + 8, gbY(100) - 6, '100 mg/dL (공복 혈당 주의 기준)', 12, '#b45309', 'left', 800);
      GROUPS.forEach((g, i) => {
        const cx = barX(G, i), bw = G.gw / 3 * 0.5, h = G.gh * d.bars[i] / 130, sel = d.g === i;
        D.shadow(() => { ctx.fillStyle = g.col; rr(cx - bw / 2, G.gy + G.gh - h, bw, Math.max(0.5, h), Math.min(8, h / 2)).fill(); }, { blur: sel ? 12 : 4, y: 2 });
        if (sel) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; rr(cx - bw / 2 - 2, G.gy + G.gh - h - 2, bw + 4, h + 4, 8).stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(cx - bw / 2 + 6, G.gy + G.gh - h + 6, 8, Math.max(0, h - 12), 4).fill();
        T(cx, G.gy + G.gh - h / 2 + 6, Math.round(d.bars[i]) + '', P(22, 20), '#fff', 'center', 800, { stroke: 'rgba(15,23,42,.55)', strokeWidth: 4 });
        T(cx, G.gy + G.gh + 18, g.name, P(13, 12), INK, 'center', 800);
        T(cx, G.gy + G.gh + 35, '(' + g.n + '명)', 12, MUTED, 'center', 700);
      });
      STU.forEach((s) => {
        const cx = barX(G, s.g) + s.jit * G.gw / 3 * 0.9, y = gbY(s.glu), sy = lerp(G.gy - 30, y, s.fly);
        ctx.globalAlpha = 0.35 + 0.65 * s.fly; D.sphere(cx, sy, d.g === s.g ? 5 : 3.8, '#1e293b', { gloss: false, outline: '#fff', outlineWidth: 1.4 }); ctx.globalAlpha = 1;
      });
      T(G.gx + 6, G.gy + G.gh - 8, '● 점 하나 = 가상 학생 1명', 11.5, MUTED, 'left', 800);
    } else {
      T(G.gx - 40, G.gy - 8, '하루 걸음 수와 BMI (가상 학생 40명)', P(14, 13), INK, 'left', 800);
      ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      for (let b = 16; b <= 34; b += 3) { const y = scY(b); ctx.beginPath(); ctx.moveTo(G.gx, y); ctx.lineTo(G.gx + G.gw, y); ctx.stroke(); T(G.gx - 8, y + 4, String(b), 12, MUTED, 'right', 700); }
      for (let s = 2000; s <= 14000; s += 2000) { const x = scX(s); ctx.beginPath(); ctx.moveTo(x, G.gy); ctx.lineTo(x, G.gy + G.gh); ctx.stroke(); T(x, G.gy + G.gh + 17, String(s / 1000) + '천', 11.5, MUTED, 'center', 700); }
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.gx, G.gy - 4); ctx.lineTo(G.gx, G.gy + G.gh); ctx.lineTo(G.gx + G.gw + 4, G.gy + G.gh); ctx.stroke(); ctx.restore();
      T(G.gx + G.gw / 2, G.gy + G.gh + 38, '하루 걸음 수 (보)', 12.5, MUTED, 'center', 800);
      ctx.save(); ctx.translate(G.gx - 38, G.gy + G.gh / 2); ctx.rotate(-Math.PI / 2); T(0, 0, 'BMI (kg/m²)', 12.5, MUTED, 'center', 800); ctx.restore();
      [[23, '23 과체중'], [25, '25 비만']].forEach(([b, l]) => { D.dashedLine(G.gx, scY(b), G.gx + G.gw, scY(b), { color: b === 25 ? '#ef4444' : '#f59e0b', width: 1.8, dash: [7, 6], offset: t * 10 }); T(G.gx + G.gw - 4, scY(b) - 5, l, 11.5, b === 25 ? '#dc2626' : '#b45309', 'right', 800); });
      if (d.trendP > 0.01) { const r = regress(), x0 = 2200, x1 = 2200 + (13800 - 2200) * d.trendP; ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(scX(x0), scY(r.a + r.b * x0)); ctx.lineTo(scX(x1), scY(r.a + r.b * x1)); ctx.stroke(); ctx.restore(); if (d.trendP > 0.9) T(scX(9800), scY(r.a + r.b * 9800) - 14, '경향선: 걸음 수 ↑ → BMI 대체로 ↓', 12, '#6d28d9', 'center', 800, { stroke: '#fff', strokeWidth: 4 }); }
      STU.forEach((s) => {
        const x = scX(s.steps), y = scY(s.bmi), sy = lerp(G.gy - 40, y, s.fly), sel = d.pt === s.no;
        s.px = x; s.py = y; s.pr = 9;
        ctx.globalAlpha = 0.3 + 0.7 * s.fly; D.sphere(x, sy, sel ? 8 : 5.6, bmiCol(s.bmi), { gloss: true, outline: sel ? '#0f172a' : null, outlineWidth: 2.4 }); ctx.globalAlpha = 1;
      });
    }
    // 정보 카드
    const c = G.card; card(c.x, c.y, c.w, c.h, '#fff', '#bbf7d0');
    if (S.view === 'bar') {
      const g = d.g;
      if (g < 0) { T(c.x + 14, c.y + 26, '📊 막대를 눌러 보세요', 14.5, INK, 'left', 800); block(c.x + 14, c.y + 52, c.w - 28, '막대 하나는 한 군의 평균이에요. 점은 그 군의 가상 학생 한 명 한 명을 나타내요. 막대마다 눌러서 값을 읽어요.', 13, '#334155', 18, 700); }
      else { const s = gStat(g); T(c.x + 14, c.y + 26, '📊 ' + GROUPS[g].name, 15, GROUPS[g].col === '#38bdf8' ? '#0369a1' : GROUPS[g].col === '#f59e0b' ? '#b45309' : '#b91c1c', 'left', 800); [['학생 수', s.n + '명'], ['평균', Math.round(s.mean) + ' mg/dL'], ['가장 낮은 값', s.min + ' mg/dL'], ['가장 높은 값', s.max + ' mg/dL']].forEach((r, i) => { T(c.x + 14, c.y + 56 + i * 24, r[0], 13, MUTED, 'left', 700); T(c.x + c.w - 14, c.y + 56 + i * 24, r[1], 14, INK, 'right', 800); }); block(c.x + 14, c.y + 56 + 4 * 24 + 6, c.w - 28, '(주당 단 음료 ' + ['0~2회', '3~6회', '7회 이상'][g] + ' 마신 가상 학생)', 12, MUTED, 16, 700); }
    } else {
      const s = STU.find((q) => q.no === d.pt);
      if (!s) { T(c.x + 14, c.y + 26, '🔵 점을 눌러 보세요', 14.5, INK, 'left', 800); block(c.x + 14, c.y + 52, c.w - 28, '점 하나는 가상 학생 한 명이에요. 걸음 수가 많을수록 BMI가 대체로 낮은 경향이 보이는지 살펴봐요. 점 색: 파랑 BMI 23 미만, 주황 23~24.9, 빨강 25 이상.', 13, '#334155', 18, 700); }
      else { T(c.x + 14, c.y + 26, '🔵 가상 학생 ' + s.no + '번', 15, INK, 'left', 800); [['하루 걸음 수', s.steps.toLocaleString('ko-KR') + ' 보'], ['BMI', s.bmi.toFixed(1)], ['BMI 구분', s.bmi < 18.5 ? '저체중' : s.bmi < 23 ? '정상' : s.bmi < 25 ? '과체중' : '비만']].forEach((r, i) => { T(c.x + 14, c.y + 58 + i * 26, r[0], 13, MUTED, 'left', 700); T(c.x + c.w - 14, c.y + 58 + i * 26, r[1], 14, INK, 'right', 800); }); block(c.x + 14, c.y + 58 + 3 * 26 + 6, c.w - 28, '※ 가상 학생의 값이에요. 개인의 BMI를 판단하는 것이 아니에요.', 12, MUTED, 16, 700); }
    }
    T(VW / 2, VH - 6, '교육용 가상 데이터 (가상 학교 학생 40명, 번호 1~40) · 의료 조언이 아니에요', 11.5, WARN, 'center', 800);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(500, 566), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }
  function stmFeedback() {
    const st = S.data.stm, want = STATEMENTS.map((s, i) => (s.ok ? i : -1)).filter((i) => i >= 0);
    if (!st.size) return '이 자료만으로 <b>말할 수 있는 문장</b>을 모두 골라요.';
    const wrong = [...st].filter((i) => !STATEMENTS[i].ok);
    if (wrong.length) return STATEMENTS[wrong[0]].why;
    const miss = want.filter((i) => !st.has(i));
    if (miss.length) return '말할 수 있는 문장이 <b>' + miss.length + '개 더</b> 있어요. 막대그래프와 산점도에서 읽을 수 있는 경향을 다시 찾아봐요.';
    return true;
  }

  /* ======================================================
     ④ 습관 토의
     ====================================================== */
  const HG = () => (PHONE
    ? { top: { x: 10, y: 38, w: 500, h: 70 }, pivot: { x: 260, y: 232 }, beam: 168, jar: { x: 260, y: 470, w: 160, h: 220 }, cards: { x: 10, y: 44, cw: 244, ch: 150, gap: 12 }, team: { x: 10, y: 40, w: 500 } }
    : { top: { x: 16, y: 40, w: 768, h: 64 }, pivot: { x: 270, y: 224 }, beam: 190, jar: { x: 640, y: 270, w: 160, h: 220 }, cards: { x: 16, y: 50, cw: 248, ch: 200, gap: 16 }, team: { x: 16, y: 44, w: 768 } });
  const diff = () => S.hab.intake - S.hab.expend;
  const daysFor = () => (diff() > 0 ? 7700 / diff() : Infinity);
  function stepHab(dt) {
    const h = S.hab, d = diff();
    const tt = -clamp(d / 700, -1, 1) * 0.3; h.tilt = RM ? tt : SciSim.approach(h.tilt, tt, dt, 4);
    const days = daysFor();
    if (isFinite(days)) { h.day += dt * Math.max(2, days / 4.2); if (h.day > days + days * 0.25) h.day = 0; } else h.day = 0;
    if (h.shakeT > 0) h.shakeT -= dt;
  }
  function drawCalc(t) {
    const g = HG(), h = S.hab, d = diff(), days = daysFor();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    card(g.top.x, g.top.y, g.top.w, g.top.h, '#fff', '#bbf7d0');
    T(g.top.x + 14, g.top.y + 25, '🧑 가상 인물 K · 하루 에너지 균형 (교육용 예시)', P(15, 13.5), INK, 'left', 800);
    T(g.top.x + 14, g.top.y + 52, '균형 = 섭취 − 소비 = ' + h.intake + ' − ' + h.expend + ' = ' + (d > 0 ? '+' : '') + d + ' kcal', P(17, 15), d > 0 ? '#b91c1c' : d < 0 ? '#1d4ed8' : '#166534', 'left', 800);
    // 저울
    const pv = g.pivot, L = g.beam, th = h.tilt;
    const ex = (s) => ({ x: pv.x + s * L * Math.cos(th), y: pv.y + s * L * Math.sin(th) });
    ctx.save();
    ctx.fillStyle = '#94a3b8'; rr(pv.x - 8, pv.y, 16, P(200, 170), 6).fill(); rr(pv.x - 60, pv.y + P(190, 160), 120, 14, 7).fill();
    ctx.restore();
    D.shadow(() => { ctx.strokeStyle = '#475569'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex(-1).x, ex(-1).y); ctx.lineTo(ex(1).x, ex(1).y); ctx.stroke(); }, { blur: 6, y: 3 });
    D.sphere(pv.x, pv.y, 12, '#64748b', { gloss: true });
    [[-1, '🍽️', '섭취', h.intake, '#f59e0b'], [1, '🏃', '소비', h.expend, '#16a34a']].forEach(([s, ic, nm, v, col]) => {
      const e = ex(s), py = e.y + P(76, 70), pw = P(104, 92);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - pw / 2, py); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + pw / 2, py); ctx.stroke();
      D.shadow(() => { ctx.fillStyle = rgba(col, 0.18); rr(e.x - pw / 2, py, pw, 14, 7).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = col; ctx.lineWidth = 3; rr(e.x - pw / 2, py, pw, 14, 7).stroke();
      const n = Math.round((v - 1600) / 1600 * 5) + 1;
      T(e.x, py - 12, (s < 0 ? '🍚' : ic).repeat(Math.min(n, 4)), P(24, 20), INK, 'center', 700);
      T(e.x, py + 36, nm + ' ' + v + ' kcal', P(14, 12.5), INK, 'center', 800);
    });
    // 체지방 항아리
    const j = g.jar; const jx = PHONE ? 260 - 80 : j.x - 80, jy = PHONE ? 470 : j.y - 60;
    const fx = P(560, 90), fy = P(150, 500);
    card(PHONE ? 10 : 556, PHONE ? 470 : 118, PHONE ? 500 : 232, PHONE ? 296 : 372, '#fff', '#fde68a');
    const cx = PHONE ? 130 : 672, cy = PHONE ? 500 : 156;
    T(PHONE ? 20 : 572, PHONE ? 496 : 144, '체지방 1 kg ≈ 약 7700 kcal (근사)', P(13.5, 13), '#78350f', 'left', 800);
    const jw = 96, jh = 140, jx0 = cx - jw / 2, jy0 = cy + (PHONE ? 30 : 36);
    ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(jx0 - 6, jy0); ctx.lineTo(jx0, jy0 + 10); ctx.lineTo(jx0, jy0 + jh - 12); ctx.quadraticCurveTo(jx0, jy0 + jh, jx0 + 14, jy0 + jh); ctx.lineTo(jx0 + jw - 14, jy0 + jh); ctx.quadraticCurveTo(jx0 + jw, jy0 + jh, jx0 + jw, jy0 + jh - 12); ctx.lineTo(jx0 + jw, jy0 + 10); ctx.lineTo(jx0 + jw + 6, jy0); ctx.stroke();
    const fill = isFinite(days) ? clamp(h.day / days, 0, 1) : 0;
    ctx.beginPath(); ctx.rect(jx0 + 2, jy0 + jh - (jh - 14) * fill, jw - 4, (jh - 14) * fill + 12); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(250,204,21,.85)'; rr(jx0 + 2, jy0 + 6, jw - 4, jh - 8, 12).fill(); ctx.restore(); ctx.restore();
    T(cx, jy0 + jh + 24, isFinite(days) ? '경과 ' + Math.min(Math.round(h.day), Math.round(days)) + '일' : '경과 —', P(15, 14), INK, 'center', 800);
    const tx = PHONE ? 270 : 572, ty = PHONE ? 548 : 392;
    const tw = PHONE ? 228 : 210;
    if (isFinite(days)) { let yy = ty; yy += 18 * block(tx, yy, tw, '하루 ' + d + ' kcal 초과', 14, '#b91c1c', 18, 800) + 4; yy += 18 * block(tx, yy, tw, '7700 ÷ ' + d + ' = ' + (Math.round(days * 100) / 100), 14, INK, 18, 800); yy += 18 * block(tx, yy, tw, '→ 약 ' + Math.round(days) + '일', 15, '#b91c1c', 18, 800) + 6; block(tx, yy, tw, '체지방 1 kg에 해당하는 에너지가 쌓여요.', 12.5, MUTED, 17, 700); }
    else block(tx, ty, tw, d === 0 ? '섭취 = 소비 → 에너지 균형이에요. (쌓이지 않아요)' : '소비가 더 많아요. (초과 에너지가 없어요)', 14, '#166534', 18, 800);
    T(VW / 2, VH - 6, DISC + ' · 가상 인물의 수치예요', 11.5, WARN, 'center', 800);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(520, 450), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }
  const cardRect = (i) => { const g = HG().cards, col = i % (PHONE ? 2 : 3), row = Math.floor(i / (PHONE ? 2 : 3)); return { x: g.x + col * (g.cw + g.gap), y: g.y + row * (g.ch + g.gap), w: g.cw, h: g.ch }; };
  function drawCards(t) {
    const h = S.hab;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    HAB.forEach((c, i) => {
      const r = cardRect(i), sel = h.picks.indexOf(i), hv = S.hover === 'h' + i;
      const sh = h.shake === i && h.shakeT > 0 ? Math.sin(h.shakeT * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, hv ? -2 : 0);
      D.shadow(() => { ctx.fillStyle = sel >= 0 ? '#f0fdf4' : '#fff'; rr(r.x, r.y, r.w, r.h, 16).fill(); }, { blur: sel >= 0 ? 12 : 6, y: sel >= 0 ? 5 : 2 });
      ctx.strokeStyle = sel >= 0 ? '#16a34a' : '#d1d5db'; ctx.lineWidth = sel >= 0 ? 4 : 2; rr(r.x, r.y, r.w, r.h, 16).stroke();
      T(r.x + r.w / 2, r.y + r.h * 0.5, c.icon, P(54, 46), INK, 'center', 700);
      TF(r.x + r.w / 2, r.y + r.h - 22, c.name, r.w - 20, P(16.5, 15), INK, 'center', 800);
      if (sel >= 0) { D.sphere(r.x + 26, r.y + 26, 15, '#16a34a', { gloss: true }); T(r.x + 26, r.y + 32, String(sel + 1), 17, '#fff', 'center', 800); if (h.reason[sel] === c.ans) D.check(r.x + r.w - 26, r.y + 26, 12, 1); }
      ctx.restore();
    });
    const yb = P(494, 554);
    T(VW / 2, yb, '토의할 습관 카드 3개를 골라요  (고른 카드 ' + h.picks.length + ' / 3)', P(15, 14), INK, 'center', 800);
    block(VW / 2 - P(340, 240), yb + 24, P(680, 480), '카드를 고르면 오른쪽(아래) 칸에 이유를 고르는 목록이 나타나요. 이유는 앞에서 배운 에너지 균형이나 조사 자료를 근거로 골라요.', P(13, 12.5), MUTED, 17, 700);
    T(VW / 2, VH - 6, DISC, 11.5, WARN, 'center', 800);
    if (S.msgT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, S.msgT * 2); D.label(VW / 2, P(520, 744), S.msg, { bg: '#1b2333', color: '#fff', size: 13 }); ctx.restore(); }
  }
  function drawTeam(t) {
    const g = HG().team, h = S.hab;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(VW / 2, P(28, 28), '👥 가상 모둠원의 생활 습관 의견 (교육용 가상 의견)', P(16, 14), INK, 'center', 800);
    const cols = [{ name: '나', icon: '🙋', pick: h.picks.slice() }, ...TEAM];
    const lw = P(210, 150), cw = (g.w - lw) / 4, rh = P(60, 62), y0 = P(134, 150), x0 = g.x;
    // 말풍선 머리
    cols.forEach((c, i) => {
      const cx = x0 + lw + cw * i + cw / 2, pop = RM ? 1 : clamp((S.clock - (S.teamT0 || 0) - i * 0.18) / 0.4, 0, 1), s = SciSim.ease.outBack(pop);
      ctx.save(); ctx.translate(cx, P(76, 82)); ctx.scale(s, s);
      D.shadow(() => { ctx.fillStyle = i === 0 ? '#dcfce7' : '#fff'; rr(-cw / 2 + 4, -34, cw - 8, 54, 16).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = i === 0 ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = 2; rr(-cw / 2 + 4, -34, cw - 8, 54, 16).stroke();
      ctx.fillStyle = i === 0 ? '#dcfce7' : '#fff'; ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(0, 30); ctx.lineTo(8, 20); ctx.fill();
      T(0, -6, c.icon, P(24, 22), INK, 'center', 700); T(0, 14, c.name, P(14, 13), INK, 'center', 800);
      ctx.restore();
    });
    T(x0 + lw + cw * 4 + 4, P(86, 92), '', 12, MUTED, 'left');
    card(g.x, y0 - 20, g.w, rh * 6 + 30, '#fff', '#e2e8f0');
    HAB.forEach((hb, r) => {
      const y = y0 + r * rh;
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x + 8, y - 6 + 0); ctx.lineTo(g.x + g.w - 8, y - 6); ctx.stroke();
      T(g.x + 14, y + rh / 2 - 2, hb.icon, P(26, 22), INK, 'left', 700); TF(g.x + 14 + P(40, 34), y + rh / 2 + 3, hb.name, lw - P(54, 44), P(14.5, 13), INK, 'left', 800);
      let cnt = 0;
      cols.forEach((c, i) => {
        const on = c.pick.indexOf(r) >= 0; if (on && i > 0) cnt++;
        const cx = x0 + lw + cw * i + cw / 2, cy = y + rh / 2;
        if (on) { const pop = RM ? 1 : clamp((S.clock - (S.teamT0 || 0) - 0.5 - r * 0.07 - i * 0.05) / 0.35, 0, 1); D.sphere(cx, cy, 13 * SciSim.ease.outBack(pop), i === 0 ? '#16a34a' : '#3b82f6', { gloss: true }); if (pop > 0.7) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 1, cy + 4); ctx.lineTo(cx + 6, cy - 4); ctx.stroke(); } }
        else { ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill(); }
      });
    });
    // 모둠원 합계
    T(x0 + lw + cw * 4 - 6, y0 - 28, '', 12, MUTED, 'right');
    const cntTxt = HAB.map((hb, r) => TEAM.filter((m) => m.pick.indexOf(r) >= 0).length);
    ctx.save(); ctx.textAlign = 'right';
    T(g.x + g.w - 10, y0 + rh * 6 + 6, '(가은 · 나래 · 도윤 중 고른 사람 수: ' + HAB.map((hb, r) => hb.icon + cntTxt[r]).join('  ') + ')', P(12.5, 11.5), MUTED, 'right', 800);
    ctx.restore();
    T(VW / 2, VH - 6, DISC, 11.5, WARN, 'center', 800);
  }
  const habDone = () => S.hab.picks.length === 3 && S.hab.picks.every((p, i) => S.hab.reason[i] === HAB[p].ans);
  function habFeedback() {
    const h = S.hab;
    if (h.picks.length < 3) return '습관 카드를 <b>3개</b> 골라요. (지금 ' + h.picks.length + '개)';
    const miss = h.picks.map((p, i) => (h.reason[i] < 0 ? i : -1)).filter((i) => i >= 0);
    if (miss.length) return '고른 카드마다 <b>이유</b>를 골라요. (' + miss.map((i) => HAB[h.picks[i]].name).join(', ') + ')';
    const bad = h.picks.map((p, i) => (h.reason[i] !== HAB[p].ans ? i : -1)).filter((i) => i >= 0);
    if (bad.length) return '<b>' + HAB[h.picks[bad[0]]].name + '</b>의 이유를 다시 생각해 봐요. 앞에서 배운 에너지 균형이나 조사 자료를 근거로 골라요.';
    return true;
  }
  const TEAM_COMMON = () => HAB.map((hb, r) => (TEAM.every((m) => m.pick.indexOf(r) >= 0) ? r : -1)).filter((r) => r >= 0);

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { ogtt: '🩸 혈당 곡선', plan: '📝 조사 설계', data: '📊 자료 분석', habit: '💬 습관 토의' };
  const VIEWS = { data: [['bar', '📊 군별 평균'], ['sc', '🔵 산점도']], habit: [['calc', '⚖️ 에너지 균형'], ['cards', '🗂 습관 카드'], ['team', '👥 모둠 의견']] };
  function setMode(m, v) {
    if (S.mode !== m || (v && (m === 'data' ? S.view !== v : S.sub !== v))) S.fade = 1;
    S.mode = m;
    if (m === 'data') { if (v) S.view = v; } else if (m === 'habit') { if (v) S.sub = v; }
    S.pick = null; S.hover = ''; parts.clear(); S.msgT = 0;
    if (m === 'data') enterData();
    if (m === 'habit' && S.sub === 'team') S.teamT0 = S.clock;
    updateCtl();
  }
  const ensure = (m, v) => { if (S.mode !== m || (v && (m === 'data' ? S.view !== v : S.sub !== v))) setMode(m, v); };
  function updateCtl() {
    const o = S.og, h = S.hab, d = S.data;
    const key = S.mode === 'habit' ? S.sub : S.mode;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.show.split(' ').includes(key); });
    const free = !!(game && game.free); $('#modeSeg').hidden = !free; $('#tbLabel').hidden = free;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const vs = $('#viewSeg'), vl = VIEWS[S.mode];
    if (!vl) vs.hidden = true; else {
      vs.hidden = false;
      if (vs.dataset.m !== S.mode) { vs.dataset.m = S.mode; vs.innerHTML = ''; vl.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = t; vs.appendChild(b); }); }
      $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === (S.mode === 'data' ? S.view : S.sub)));
    }
    $('#oOg').textContent = ogCount() + ' / 8';
    $$('#perSeg button').forEach((b) => b.classList.toggle('on', b.dataset.p === o.p));
    $$('#tmSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.t === o.ti); b.textContent = TIMES[+b.dataset.t] + '분' + (o.meas[o.p][+b.dataset.t] ? ' ✔' : ''); });
    $('#oTm').textContent = TIMES[o.ti] + '분';
    $('#bMeas').disabled = !!o.meas[o.p][o.ti];
    $('#oPlan').textContent = planCount() + ' / 6';
    $('#bTrend').textContent = d.trend ? '📈 경향선 숨기기' : '📈 경향선 보기';
    $('#oStm').textContent = d.stm.size + ' 개';
    $('#dataNote').textContent = S.view === 'bar' ? '막대를 눌러 평균과 값의 범위를 읽어요. (' + d.gSeen.size + ' / 3군 확인)' : '점을 눌러 가상 학생의 값을 읽어요. (' + d.pSeen.size + '개 확인)';
    const sc = $('#stmChips'); if (!sc.children.length) STATEMENTS.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.i = i; b.textContent = s.t; sc.appendChild(b); });
    $$('#stmChips .chip').forEach((b, i) => { b.classList.toggle('on', d.stm.has(i)); b.setAttribute('aria-pressed', d.stm.has(i) ? 'true' : 'false'); });
    $('#oIn').textContent = h.intake + ' kcal'; $('#oEx').textContent = h.expend + ' kcal';
    $('#calcNote').textContent = h.ok ? '✔ 맞아요! 7700 ÷ ' + (h.intake - h.expend) + ' ≈ ' + Math.round(7700 / (h.intake - h.expend)) + '일' : (h.answer || '섭취와 소비를 정한 뒤 7700 ÷ (섭취 − 소비)로 날수를 구해요.');
    $('#oHab').textContent = h.picks.length + ' / 3';
    for (let i = 0; i < 3; i++) {
      const w = $('#hW' + (i + 1)), sel = $('#hS' + (i + 1)), pi = h.picks[i];
      w.hidden = pi == null;
      if (pi != null) {
        $('#hL' + (i + 1)).textContent = HAB[pi].icon + ' ' + HAB[pi].name + ' — 이유';
        if (sel.dataset.card !== String(pi)) { sel.dataset.card = String(pi); sel.innerHTML = ''; const o0 = document.createElement('option'); o0.value = '-1'; o0.textContent = '— 이유 고르기 —'; sel.appendChild(o0); HAB[pi].r.forEach((t, k) => { const op = document.createElement('option'); op.value = String(k); op.textContent = t; sel.appendChild(op); }); }
        sel.value = String(h.reason[i]);
      } else sel.dataset.card = '';
    }
    $('#habNote').hidden = h.picks.length > 0;
  }
  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode(b.dataset.mode); } });
  $('#viewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); setMode(S.mode, b.dataset.v); } });
  $('#perSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.og.p = b.dataset.p; const nx = S.og.meas[S.og.p].findIndex((x) => !x); if (nx >= 0 && S.og.meas[S.og.p][S.og.ti]) S.og.ti = nx; updateCtl(); } });
  $('#tmSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.og.ti = +b.dataset.t; updateCtl(); } });
  $('#bMeas').addEventListener('click', doMeasure);
  $('#bOgReset').addEventListener('click', () => { Sound.click(); S.og.meas = { A: [null, null, null, null], B: [null, null, null, null] }; S.og.ti = 0; S.og.p = 'A'; updateCtl(); });
  $('#bTrend').addEventListener('click', () => { Sound.click(); S.data.trend = !S.data.trend; if (S.data.trend && S.view !== 'sc') setMode('data', 'sc'); updateCtl(); });
  $('#stmChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; const i = +b.dataset.i, st = S.data.stm; if (st.has(i)) st.delete(i); else st.add(i); Sound.tick(); updateCtl(); });
  const sbIn = SciSim.bindRange($('#sIn'), $('#oIn'), (v) => v + ' kcal', (v) => { S.hab.intake = v; S.hab.ok = false; S.hab.day = 0; updateCtl(); });
  const sbEx = SciSim.bindRange($('#sEx'), $('#oEx'), (v) => v + ' kcal', (v) => { S.hab.expend = v; S.hab.ok = false; S.hab.day = 0; updateCtl(); });
  $('#bDays').addEventListener('click', () => {
    const h = S.hab, d = h.intake - h.expend, v = parseFloat(String($('#inDays').value).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (d !== 400) { h.answer = '이 경우는 섭취 2400 kcal, 소비 2000 kcal(하루 400 kcal 초과)로 맞춘 뒤 확인해요.'; Sound.fail(); say(h.answer); updateCtl(); return; }
    if (!isFinite(v)) { h.answer = '날수를 숫자로 써 주세요.'; Sound.fail(); updateCtl(); return; }
    if (v >= 18.5 && v <= 19.5) { h.ok = true; h.answer = ''; Sound.success(); if (!RM) parts.burst(VW * 0.7, VH * 0.5, { count: 18, speed: 150, size: 3.4, life: 0.9, shape: 'star' }); }
    else { h.answer = '7700 ÷ 400 을 다시 계산해 봐요. (소수 첫째 자리까지 구한 뒤 가까운 날수로 어림해요.)'; Sound.fail(); say(h.answer); }
    updateCtl();
  });
  [['#hS1', 0], ['#hS2', 1], ['#hS3', 2]].forEach(([id, i]) => $(id).addEventListener('change', () => { S.hab.reason[i] = +$(id).value; Sound.tick(); updateCtl(); }));

  /* ---------- 포인터 ---------- */
  function pickHit(p) { const pk = S.pick; if (!pk) return null; for (let i = 0; i < pk.opts.length; i++) if (pk.opts[i].r && hit(p, pk.opts[i].r)) return i; return -1; }
  function dataHit(p) {
    const G = DG();
    if (S.view === 'bar') { for (let i = 0; i < 3; i++) { const cx = barX(G, i), bw = G.gw / 3 * 0.5; if (Math.abs(p.x - cx) <= bw / 2 + 14 && p.y >= G.gy && p.y <= G.gy + G.gh + 4) return { g: i }; } return null; }
    let best = null, bd = 16 * 16;
    STU.forEach((s) => { const dd = (p.x - s.px) ** 2 + (p.y - s.py) ** 2; if (dd < bd) { bd = dd; best = s; } });
    return best ? { pt: best.no } : null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.pick) {
        const i = pickHit(p); const pk = S.pick;
        if (i >= 0) { S.pick = null; const pl = S.plan; pl.sel[pk.row] = pk.opts[i].k; Sound.tick(); if (!planOK(pk.row)) { pl.shake = pk.row; pl.shakeT = 0.4; Sound.fail(); say('✕ ' + PLAN[pk.row].opts[pk.opts[i].k].why, 4.5); } else say('✔ 알맞아요!', 1.4); updateCtl(); }
        else S.pick = null;
        return false;
      }
      if (S.mode === 'plan') { for (let i = 0; i < PLAN.length; i++) if (hit(p, planRect(i))) { openPlanPick(i); return false; } return false; }
      if (S.mode === 'data') {
        const r = dataHit(p); if (!r) return false;
        if (r.g != null) { S.data.g = r.g; S.data.gSeen.add(r.g); } else { S.data.pt = r.pt; S.data.pSeen.add(r.pt); }
        Sound.tick(); updateCtl(); return false;
      }
      if (S.mode === 'habit' && S.sub === 'cards') {
        for (let i = 0; i < HAB.length; i++) if (hit(p, cardRect(i))) {
          const h = S.hab, k = h.picks.indexOf(i);
          if (k >= 0) { h.picks.splice(k, 1); h.reason.splice(k, 1); h.reason.push(-1); Sound.click(); }
          else if (h.picks.length >= 3) { h.shake = i; h.shakeT = 0.4; Sound.fail(); say('카드는 3개까지만 고를 수 있어요. 하나를 먼저 빼 주세요.'); }
          else { h.picks.push(i); h.reason[h.picks.length - 1] = -1; Sound.click(); }
          updateCtl(); return false;
        }
      }
      return false;
    },
    hover(p) {
      if (S.pick) { const i = pickHit(p); S.hover = i >= 0 ? 'pk' + i : ''; return i >= 0 ? 'pointer' : 'default'; }
      if (S.mode === 'plan') { for (let i = 0; i < PLAN.length; i++) if (hit(p, planRect(i))) { S.hover = 'p' + i; return 'pointer'; } S.hover = ''; return 'default'; }
      if (S.mode === 'data') return dataHit(p) ? 'pointer' : 'default';
      if (S.mode === 'habit' && S.sub === 'cards') { for (let i = 0; i < HAB.length; i++) if (hit(p, cardRect(i))) { S.hover = 'h' + i; return 'pointer'; } S.hover = ''; }
      return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let A, a, B, b, Cc, c;
    const o = S.og, h = S.hab, d = S.data;
    if (S.mode === 'ogtt') {
      A = '측정한 점'; a = ogCount() + ' / 8';
      const m = o.meas[o.p]; B = PERSON[o.p].name; b = m.filter(Boolean).map((q) => q.v).join(' · ') || '—';
      Cc = '공복(0분) 혈당'; c = m[0] ? m[0].v + ' mg/dL (' + fastClass(m[0].v) + ')' : '—';
    } else if (S.mode === 'plan') {
      A = '알맞게 채운 칸'; a = planCount() + ' / 6';
      B = '고른 칸'; b = S.plan.sel.filter((v) => v >= 0).length + ' / 6';
      Cc = '연구 질문'; c = '단 음료 ↔ 공복 혈당';
    } else if (S.mode === 'data') {
      A = '확인한 군'; a = d.gSeen.size + ' / 3';
      B = '확인한 점'; b = d.pSeen.size + '개';
      Cc = '고른 문장'; c = d.stm.size + '개';
    } else {
      const df = h.intake - h.expend;
      A = '하루 에너지 균형'; a = (df > 0 ? '+' : '') + df + ' kcal';
      B = '체지방 1 kg까지'; b = df > 0 ? '약 ' + Math.round(7700 / df) + '일' : '쌓이지 않음';
      Cc = '고른 습관 카드'; c = h.picks.length + ' / 3';
    }
    const key = A + a + B + b + Cc + c; if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = Cc; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    S.epoch++;
    if (li === 0) { S.og = { p: 'A', ti: 0, meas: { A: [null, null, null, null], B: [null, null, null, null] }, cur: 0 }; setMode('ogtt'); }
    else if (li === 1) { S.plan.sel = [-1, -1, -1, -1, -1, -1]; setMode('plan'); }
    else if (li === 2) { Object.assign(S.data, { g: -1, pt: -1, gSeen: new Set(), pSeen: new Set(), trend: false, stm: new Set() }); S.view = 'bar'; setMode('data', 'bar'); }
    else { Object.assign(S.hab, { intake: 2000, expend: 2000, ok: false, picks: [], reason: [-1, -1, -1], answer: '', day: 0 }); $('#sIn').value = 2000; $('#sEx').value = 2000; sbIn.refresh(); sbEx.refresh(); $('#inDays').value = ''; S.sub = 'calc'; setMode('habit', 'calc'); }
    updateCtl();
  }
  const ogDone = () => ogCount() === 8;
  const levels = [
    {
      title: '대사성 질환과 혈당 곡선', short: '대사성 질환', icon: '🩺', phase: '관찰',
      features: ['ogtt'],
      intro: '<p class="si-q">❓ 탐구 질문: 건강한 습관은 대사성 질환을 정말로 줄여 줄까? 어떻게 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 물질대사(동화 · 이화)가 생명 활동에 필요한 에너지를 저장하고 쓰는 과정임을 배웠고, 소화된 영양소가 몸의 세포로 운반되는 것도 확인했어요.</div>' +
        '<p>물질대사에 이상이 생겨 나타나는 질환을 <b>대사성 질환</b>이라고 해요. 당뇨병, 이상 지질혈증, 비만, 고혈압 등이 대표적이에요. 먼저 가상의 두 사람(A · B)에게 <b>포도당 부하 검사</b>를 해서 혈당이 어떻게 변하는지 비교해 봐요.</p>' +
        '<p class="note">※ 이 차시의 모든 자료는 <b>교육용 가상 데이터</b>예요. 개인의 건강 정보를 입력하는 기능은 없고, <b>의료 조언이 아니에요</b>.</p>',
      setup() { enterLevel(0); },
      recap: '정상인 사람은 혈당이 올랐다가 곧 돌아오지만, 혈당 조절에 이상이 있으면 높은 혈당이 오래 유지돼요. 대사성 질환은 병원체 없이 물질대사의 이상으로 생겨요.',
      summary: '<ul><li><b>대사성 질환</b>: 물질대사(에너지 저장 · 사용)의 이상으로 생기는 질환. 당뇨병 · 이상 지질혈증 · 비만 · 고혈압 등. 병원체가 없고 전염되지 않아요.</li><li>포도당 부하 검사(가상 예시, mg/dL; 0 · 30 · 60 · 120분): 정상 90 · 140 · 120 · 95 / 당뇨병 의심 130 · 250 · 270 · 220.</li><li>공복 혈당 기준(단순화 예시): 100 미만 정상, 100~125 주의, 126 이상 당뇨병 의심. 혈당을 낮추는 호르몬 작용이 충분하지 않으면 혈당이 오래 높게 유지돼요.</li></ul>',
      missions: [
        {
          title: '혈당 곡선 2개 비교하기',
          goal: '가상 인물 <b>A와 B</b>의 혈당을 <b>0 · 30 · 60 · 120분</b>에 모두 측정해(8개) 곡선 2개를 완성하세요.',
          hint: '가상 인물과 시점을 고르고 🩸 혈당 측정하기를 눌러요. 측정하면 다음 시점이 자동으로 골라져요.',
          setup() { ensure('ogtt'); },
          check: ogDone, hold: 0.8,
          status: () => ['A', 'B'].map((k) => mark(S.og.meas[k].every(Boolean)) + ' ' + PERSON[k].name + ' ' + S.og.meas[k].filter(Boolean).length + '/4').join(' · '),
          explain: '<b>A</b>는 혈당이 올랐다가 120분 뒤 처음과 비슷한 95 mg/dL로 돌아왔어요. <b>B</b>는 130 → 250 → 270 → 220으로 크게 오르고 120분 뒤에도 높아요. B처럼 높은 혈당이 오래 유지되는 것은 혈당을 조절하는 물질대사에 문제가 있다는 신호예요(교육용 가상 자료).',
        },
        {
          type: 'quiz', title: '곡선이 오래 높게 유지된다는 것은?',
          goal: 'B의 곡선처럼 <b>혈당이 오랫동안 높게 유지될 때</b>의 의미로 가장 알맞은 것은?',
          setup() { ensure('ogtt'); },
          choices: ['혈액 속 병원체가 포도당을 모두 먹어 치웠다는 뜻이다', '포도당이 세포로 흡수되어 이용·저장되는 혈당 조절에 이상이 있다는 뜻이다', '몸이 포도당을 아주 잘 이용하고 있다는 뜻이다', '검사 전에 아무것도 먹지 않아서 나타나는 정상적인 변화이다'],
          answer: 1,
          feedback: ['병원체와는 관계가 없어요. 혈당이 높다는 것은 혈액 속 포도당이 많이 남아 있다는 뜻이에요.', '', '잘 이용했다면 혈당이 빨리 내려왔을 거예요.', 'A도 같은 조건에서 혈당이 2시간 뒤 돌아왔어요. B의 높은 혈당은 정상적인 변화가 아니에요.'],
          explain: '정상일 때는 혈당을 낮추는 호르몬이 충분히 작용해 세포가 포도당을 흡수하고 쓰거나 저장해서 혈당이 내려가요. 이 과정에 문제가 생기면 포도당이 혈액에 남아 <b>높은 혈당이 오래 유지</b>돼요.',
        },
        {
          type: 'quiz', title: '대사성 질환 vs 감염성 질병',
          goal: '<b>대사성 질환</b>의 특징으로 옳은 것은?',
          setup() { ensure('ogtt'); },
          choices: ['병원체가 몸에 들어와 증식하며 다른 사람에게 옮을 수 있다', '예방접종으로 완전히 막을 수 있다', '물질대사의 이상으로 생기며, 병원체가 없고 다른 사람에게 옮지 않는다', '며칠 안에 저절로 낫는 질병이다'],
          answer: 2,
          feedback: ['이것은 감염성 질병의 특징이에요. 대사성 질환에는 병원체가 없어요.', '예방접종은 주로 감염성 질병을 막는 방법이에요.', '', '대사성 질환은 오랫동안 이어지는 경우가 많고, 생활 습관 · 유전 등 여러 요인이 관여해요.'],
          explain: '대사성 질환은 <b>병원체 없이</b> 에너지의 저장 · 사용 같은 물질대사의 이상으로 생겨요. 그래서 전염되지 않고, 식사 · 운동 같은 <b>생활 습관</b>과 유전 등 여러 요인이 함께 영향을 줘요.',
        },
      ],
    },
    {
      title: '조사 계획서 설계', short: '조사 설계', icon: '📝', phase: '탐구',
      features: ['plan'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대사성 질환은 병원체가 아니라 물질대사의 이상으로 생기고 생활 습관이 관여한다는 것을 확인했어요. 그렇다면 <b>생활 습관과 혈당이 정말 관련이 있는지</b>는 어떻게 알아낼까요?</div>' +
        '<p>연구 질문은 <b>“단 음료를 자주 마시는 습관은 공복 혈당과 관련이 있을까?”</b>예요. 조사 방법을 정하고 <b>변수 · 비교 집단 · 표본 수 · 개인 정보 보호 · 한계</b>를 알맞게 채워 <b>조사 계획서</b>를 완성해 보세요. 알맞지 않은 선택에는 이유를 알려 줘요.</p>',
      setup() { enterLevel(1); },
      recap: '좋은 조사는 질문에 맞는 방법과 변수, 비교 집단, 충분한 표본, 개인 정보 보호, 한계에 대한 생각을 갖추어야 해요.',
      summary: '<ul><li><b>조사 방법</b>: 설문(단 음료 횟수) + 건강검진 자료(공복 혈당)를 연결해 비교.</li><li><b>변수</b>: 비교할 변수(주당 단 음료 횟수)와 측정할 변수(공복 혈당)를 숫자로 정의. <b>비교 집단</b>: 마시는 횟수에 따라 0~2회 / 3~6회 / 7회 이상.</li><li><b>표본 수</b>가 너무 적으면(예: 3명) 우연의 영향이 커서 일반화하기 곤란해요 → 가상 학생 40명.</li><li><b>개인 정보 보호</b>: 이름 대신 번호, 집단 결과로 발표. <b>한계</b>: 관련이 있어도 원인이라 단정할 수 없고 운동량 · 유전 · 식사량 같은 다른 요인이 있어요.</li></ul>',
      missions: [
        {
          title: '조사 계획서 완성하기',
          goal: '계획서의 <b>6개 칸</b>(조사 방법 · 변수 · 비교 집단 · 표본 수 · 개인 정보 보호 · 한계)을 모두 알맞게 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '칸을 누르면 선택지가 나타나요. 알맞지 않은 것을 고르면 이유가 나와요. 연구 질문(단 음료 ↔ 공복 혈당)에 맞는 것을 골라요.',
          manual: true,
          setup() { ensure('plan'); },
          check: planFeedback,
          explain: '단 음료 습관(설문)과 공복 혈당(건강검진)을 <b>둘 다</b> 확인해야 관련을 볼 수 있어요. 마시는 횟수에 따라 군을 나누어 <b>비교 집단</b>을 만들고, <b>표본을 충분히(40명)</b> 모으며, 이름 대신 번호만 써서 개인 정보를 지켜요. 관련이 있어도 <b>다른 요인 때문일 수 있다는 한계</b>도 적어 둬요.',
        },
        {
          type: 'quiz', title: '표본이 너무 적으면 왜 곤란할까?',
          goal: '단 음료와 혈당을 조사하면서 <b>표본이 3명</b>뿐이라면 가장 큰 문제는?',
          setup() { ensure('plan'); },
          choices: ['평균을 계산할 수 없다', '우연의 영향이 커서 결과를 다른 사람들에게 일반화하기 곤란하다', '혈당이 높은 사람이 아무도 없게 된다', '개인 정보 보호가 필요 없어진다'],
          answer: 1,
          feedback: ['3명이어도 평균은 계산할 수 있어요. 문제는 믿을 수 있느냐예요.', '', '표본 수가 적어도 혈당이 높은 사람이 있을 수 있어요. 문제는 우연의 영향이에요.', '표본 수와 상관없이 개인 정보는 항상 보호해야 해요.'],
          explain: '표본이 적으면 한두 명의 특별한 값이 결과를 크게 좌우해서 <b>우연의 영향</b>이 커져요. 그래서 일반적인 경향이라고 말하기 어려워요(<b>일반화 곤란</b>). 표본이 충분히 크고 한쪽으로 치우치지 않아야 믿을 만해요.',
        },
      ],
    },
    {
      title: '가상 자료 분석', short: '자료 분석', icon: '📊', phase: '분석',
      features: ['data'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 조사 계획서를 완성했어요. 이제 계획대로 모은 <b>가상 학교 학생 40명</b>의 자료를 분석해요.</div>' +
        '<p>단 음료를 마신 횟수에 따른 <b>군별 평균 공복 혈당</b>(막대그래프)과 <b>하루 걸음 수와 BMI</b>(산점도)를 읽고, 이 자료로 <b>말할 수 있는 것과 말할 수 없는 것</b>을 구분해 보세요. 두 값이 함께 변해도 하나가 다른 하나의 원인이라고 단정할 수는 없어요.</p>',
      setup() { enterLevel(2); },
      recap: '두 값이 함께 변하는 경향(관련)이 보여도 이 자료만으로 원인과 결과를 단정할 수 없어요. 다른 요인도 고려해야 해요.',
      summary: '<ul><li>군별 평균 공복 혈당(가상 예시): 0~2회 군 <b>88</b>, 3~6회 군 <b>94</b>, 7회 이상 군 <b>103</b> mg/dL → 단 음료를 자주 마실수록 평균이 높은 <b>경향</b>.</li><li>하루 걸음 수와 BMI는 <b>대체로 반비례</b>하는 경향(산점도). BMI = 체중(kg) ÷ 키(m)²: 18.5 미만 저체중, 18.5~22.9 정상, 23~24.9 과체중, 25 이상 비만.</li><li><b>상관관계 ≠ 인과관계</b>: “관련이 있어 보인다”는 말할 수 있지만 “단 음료가 혈당을 높였다”는 이 자료만으로 단정할 수 없어요. 운동량 · 유전 · 식사량 같은 <b>다른 요인</b>이 영향을 줄 수 있어요.</li></ul>',
      missions: [
        {
          title: '그래프에서 값 읽기',
          goal: '📊 <b>막대 3개</b>를 모두 눌러 평균을 읽고, 🔵 산점도에서 <b>점 3개 이상</b>을 눌러 가상 학생의 값을 읽으세요.',
          hint: '막대를 하나씩 누르면 학생 수와 평균이 나와요. 위쪽 🔵 산점도로 바꿔 점을 눌러요.',
          setup() { ensure('data'); },
          check: () => S.data.gSeen.size === 3 && S.data.pSeen.size >= 3, hold: 0.5,
          status: () => mark(S.data.gSeen.size === 3) + ' 막대 ' + S.data.gSeen.size + '/3 · ' + mark(S.data.pSeen.size >= 3) + ' 점 ' + S.data.pSeen.size + '/3',
          explain: '막대는 군별 <b>평균</b>(88 · 94 · 103 mg/dL)이고, 점은 가상 학생 한 명 한 명이에요. 같은 군 안에서도 값이 퍼져 있다는 것도 볼 수 있어요. 산점도에서는 걸음 수가 많을수록 BMI가 대체로 낮은 경향이 보여요.',
        },
        {
          title: '이 자료로 말할 수 있는 문장 고르기',
          goal: '오른쪽 문장 중 이 자료만으로 <b>말할 수 있는 것</b>을 모두 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“경향이 보인다”와 “원인이다 · 반드시 그렇다”는 달라요. 그래프에서 직접 읽을 수 있는 것만 골라요.',
          manual: true,
          setup() { ensure('data'); },
          check: stmFeedback,
          explain: '그래프에서 읽을 수 있는 것은 <b>경향(관련)</b>이에요: 단 음료를 자주 마시는 군의 평균 혈당이 더 높고(88 → 94 → 103), 걸음 수가 많을수록 BMI가 대체로 낮아요. 하지만 <b>“단 음료가 혈당을 높였다”</b>나 <b>“반드시 낮아진다”</b>처럼 원인이나 모두에게 적용된다고 단정하는 문장은 이 자료만으로 말할 수 없어요.',
        },
        {
          type: 'quiz', title: '상관과 인과, 그리고 다른 요인',
          goal: '단 음료와 공복 혈당이 <b>관련이 있어 보여도</b> 원인이라고 단정하기 어려운 까닭으로 알맞은 것은?',
          setup() { ensure('data'); },
          choices: ['표본 수가 많을수록 인과 관계가 저절로 증명되기 때문이다', '두 값이 함께 변하는 경향일 뿐이며, 운동량 · 유전 · 식사량 같은 다른 요인이 영향을 줄 수 있기 때문이다', '평균은 원래 계산하면 안 되는 값이기 때문이다', '혈당에 영향을 주는 다른 요인은 전혀 없기 때문이다'],
          answer: 1,
          feedback: ['표본이 많아도 관련이 곧 원인이 되는 것은 아니에요. 설계와 다른 요인 통제가 필요해요.', '', '평균은 경향을 파악하는 데 쓰는 좋은 값이에요. 문제는 해석이에요.', '운동량 · 유전 · 식사량처럼 혈당에 영향을 주는 요인이 여럿 있어요.'],
          explain: '두 값이 함께 변하는 것(<b>상관</b>)은 한쪽이 다른 쪽의 원인이라는 뜻(<b>인과</b>)이 아니에요. 단 음료를 많이 마시는 학생이 <b>운동을 덜 하거나 식사량이 많을 수도</b> 있고, <b>유전적 요인</b>도 있어요. 인과를 알려면 다른 요인을 통제한 더 정교한 조사가 필요해요.',
        },
      ],
    },
    {
      title: '생활 습관 토의', short: '습관 토의', icon: '💬', phase: '적용',
      features: ['habit'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단 음료와 혈당, 걸음 수와 BMI에서 경향이 보였지만 원인이라고 단정하기는 어렵다는 것을 확인했어요. 그래도 <b>근거가 있는 생활 습관</b>은 토의할 수 있어요.</div>' +
        '<p>먼저 <b>에너지 균형(섭취 − 소비)</b>이 쌓이면 어떤 일이 생기는지 계산해 보고, 습관 카드 <b>3개</b>를 골라 <b>이유를 근거로</b> 제시해요. 마지막으로 가상 모둠원 3명의 의견과 비교해 공통점과 차이점을 정리해 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '대사성 질환을 예방하려면 에너지 균형을 맞추고 신체 활동, 식사, 수면 같은 생활 습관을 근거를 가지고 실천하는 것이 도움이 돼요.',
      summary: '<ul><li>에너지 균형 = 섭취 − 소비. 체지방 1 kg ≈ 약 7700 kcal(근사). 하루 400 kcal 초과(섭취 2400, 소비 2000)이면 7700 ÷ 400 ≈ <b>약 19일</b>마다 체지방 1 kg에 해당하는 에너지가 쌓여요.</li><li>토의 문장 만들기: <b>“나는 ○○을(를) 실천하겠다. 왜냐하면 (자료나 에너지 균형의 근거) 때문이다.”</b></li><li>생활 습관 예: 균형 잡힌 식단, 규칙적인 신체 활동, 충분한 수면, 단 음료 줄이기, 규칙적인 식사, 야식 줄이기.</li><li>모둠 토의에서는 <b>공통점</b>(모두 고른 습관)과 <b>차이점</b>을 정리하고, 서로의 근거를 존중하며 소통해요. (자료는 모두 교육용 가상 데이터이며 의료 조언이 아니에요.)</li></ul>',
      missions: [
        {
          title: '에너지 균형 계산하기',
          goal: '하루 섭취를 <b>2400 kcal</b>, 소비를 <b>2000 kcal</b>로 맞추고, 체지방 1 kg(약 7700 kcal)이 쌓이는 날수를 구해 <b>✔ 날수 확인</b>을 누르세요.',
          hint: '저울이 한쪽으로 기울어요. 하루 초과 에너지는 2400 − 2000 = 400 kcal, 날수 = 7700 ÷ 400 = 19.25 → 약 19일.',
          setup() { ensure('habit', 'calc'); },
          check: () => S.hab.ok && S.hab.intake - S.hab.expend === 400, hold: 0.4,
          status: () => mark(S.hab.intake === 2400 && S.hab.expend === 2000) + ' 2400 / 2000 kcal · ' + mark(S.hab.ok) + ' 날수 확인',
          explain: '섭취가 소비보다 하루 <b>400 kcal</b> 많으면 7700 ÷ 400 = 19.25, 즉 <b>약 19일</b>마다 체지방 1 kg에 해당하는 에너지가 쌓여요. 매일 조금씩 남는 에너지가 오랜 시간 쌓이면 비만과 대사성 질환의 위험이 커질 수 있어요.',
        },
        {
          title: '습관 카드와 근거 고르기',
          goal: '🗂 습관 카드 <b>3개</b>를 고르고, 카드마다 <b>알맞은 이유(근거)</b>를 골라 토의 문장을 완성한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '카드를 눌러 3개를 고르면 오른쪽(아래)에 이유 목록이 나타나요. 에너지 균형이나 앞에서 읽은 자료를 근거로 한 이유가 알맞아요.',
          manual: true,
          setup() { ensure('habit', 'cards'); },
          check: habFeedback,
          explain: '좋은 토의 문장은 <b>“무엇을 하겠다 + 근거”</b>를 함께 말해요. 예: “신체 활동을 늘리겠다. 에너지 소비가 늘어 균형을 맞추는 데 도움이 되고, 걸음 수가 많은 학생의 BMI가 대체로 낮은 경향이 있기 때문이다.” 그러나 이 자료가 원인을 증명한 것은 아니라는 점도 함께 말해야 해요.',
        },
        {
          type: 'quiz', title: '모둠원 의견 비교하기',
          goal: '가상 모둠원 <b>가은 · 나래 · 도윤</b> 세 명이 <b>모두 고른</b> 습관은?',
          setup() { ensure('habit', 'team'); },
          choices: ['균형 잡힌 식단', '규칙적인 신체 활동', '단 음료 줄이기', '충분한 수면'],
          answer: 1,
          feedback: ['나래만 골랐어요. 표에서 세 사람의 체크를 다시 확인해요.', '', '가은과 도윤은 골랐지만 나래는 고르지 않았어요.', '가은만 골랐어요.'],
          explain: '세 사람이 모두 고른 습관은 <b>규칙적인 신체 활동</b>이에요(공통점). 단 음료 줄이기는 두 명이 골랐고 나머지는 한 명씩만 골라서 서로 다른 점이 있어요. 모둠 토의에서는 공통점으로 합의하고, 차이점은 서로의 근거를 듣고 이야기하며 정리해요.',
        },
      ],
    },
  ];

  layoutDots(); enterData();
  game = SciSim.game({
    simId: 'hb-metabolic-disease', mount: '#game', badge: '건강 탐구 설계자', homeHref: '../../index.html#hb',
    featureLabels: { ogtt: '🩸 포도당 부하 검사 · 혈당 곡선', plan: '📝 조사 계획서 (연구 질문)', data: '📊 막대그래프 · 산점도 · 문장 고르기', habit: '⚖️ 에너지 균형 · 🗂 습관 카드 · 👥 모둠 의견' },
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
    if (S.plan.shakeT > 0) S.plan.shakeT -= dt;
    if (S.mode === 'data') stepData(dt); else if (S.mode === 'habit') stepHab(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'ogtt') drawOgtt(t); else if (S.mode === 'plan') drawPlan(t); else if (S.mode === 'data') drawData(t);
    else if (S.sub === 'calc') drawCalc(t); else if (S.sub === 'cards') drawCards(t); else drawTeam(t);
    parts.draw(ctx);
    drawPicker();
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,248,244,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, ensure, updateCtl, enterLevel, doMeasure, PLAN, STU, GROUPS, gStat, regress, STATEMENTS, HAB, TEAM, planRect, openPlanPick, cardRect, DG, barX, gbY, planOK, habDone, TEAM_COMMON, OG_DATA, OGG, ogX, ogY, PLG, planCount,
  };
})();
