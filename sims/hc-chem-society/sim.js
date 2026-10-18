/* =========================================================
   화학 Ⅰ. 화학의 언어 - 화학과 우리 사회 [12화학01-01]
   ① 관찰: 일상 속 화학 (하루 장면에서 화학 제품 8개 찾기, 흑백 ↔ 컬러)
   ② 탐구: 사례 조사 (사례 카드 6장 · 문제 → 화학의 해결 → 성과 → 한계)
   ③ 설명: 발표 준비 (한 장 포스터 · 2분 발표 순서)
   ④ 적용: 왜 배울까 (인류의 문제 ↔ 화학 개념 지도)
   계산 없음 · 화학식은 이름표 수준. 공업 공정 조건과 반응 메커니즘은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 836 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const gray = (hex) => { const c = C.hexToRgb(hex); const l = Math.round(0.3 * c.r + 0.59 * c.g + 0.11 * c.b); const v = Math.round(l * 0.85 + 30); const h = v.toString(16).padStart(2, '0'); return '#' + h + h + h; };
  const hasJong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  const josa = (w, a, b) => w + (hasJong(w) ? a : b);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* ---------- 자료 ---------- */
  const ITEMS = [
    { id: 'rice', name: '아침밥', fx: 0.09, tag: '쌀농사에 쓰는 질소 비료는 암모니아로 만들어요.' },
    { id: 'brush', name: '칫솔·치약', fx: 0.20, tag: '치약에는 충치를 막는 불소 화합물이 들어 있어요.' },
    { id: 'soap', name: '비누', fx: 0.31, tag: '비누는 기름때를 물에 씻기게 하는 화학 물질이에요.' },
    { id: 'med', name: '감기약', fx: 0.42, tag: '해열·진통제 같은 약은 화학 반응으로 합성해요.' },
    { id: 'uni', name: '교복', fx: 0.57, tag: '교복에는 폴리에스터 같은 합성 섬유가 많이 쓰여요.' },
    { id: 'phone', name: '스마트폰', fx: 0.68, tag: '배터리는 리튬 이온 전지예요. 화학 반응으로 전기를 내요.' },
    { id: 'bottle', name: '물병', fx: 0.80, tag: '페트(PET)병은 화학으로 만든 고분자 소재예요.' },
    { id: 'tap', name: '수돗물', fx: 0.92, tag: '수돗물은 염소로 소독해서 병균을 없애요.' },
  ];
  const CASES = [
    { id: 'food', icon: '🌾', domain: '식량', name: '하버–보슈법', year: '20세기 초', color: '#16a34a', key: '암모니아 (NH₃)',
      title: '하버–보슈법으로 식량을 늘리다',
      problem: '인구가 늘어 질소 비료가 부족해졌어요.',
      solve: '질소와 수소를 반응시켜 암모니아를 대량 합성했어요. (N₂ + 3H₂ → 2NH₃)',
      result: '비료를 대량으로 만들어 식량 생산이 크게 늘었어요.',
      limit: '비료를 너무 많이 쓰면 하천 부영양화가 생겨요.',
      ask: '질소 28 g과 수소 6 g이 반응하면 암모니아는 몇 g일까?' },
    { id: 'med', icon: '💊', domain: '의약', name: '아스피린', year: '1890년대 말', color: '#e2464b', key: '아세틸살리실산',
      title: '아스피린으로 통증을 줄이다',
      problem: '버드나무 껍질의 통증 완화 성분만으로는 많은 사람이 쓰기 어려웠어요.',
      solve: '아세틸살리실산(아스피린)을 합성해 약으로 만들어 팔았어요.',
      result: '해열·진통제를 안정적으로 많이 만들어 쓸 수 있게 됐어요.',
      limit: '위 자극 같은 부작용이 있어서 사용법을 꼭 안내해야 해요.',
      ask: '약에는 왜 사용법과 부작용 안내가 꼭 필요할까?' },
    { id: 'energy', icon: '🔋', domain: '에너지', name: '리튬 이온 전지', year: '2019년 노벨 화학상', color: '#f59e0b', key: '리튬 이온 (Li⁺)',
      title: '리튬 이온 전지로 전기를 담다',
      problem: '휴대 기기와 전기차에 쓸 가볍고 오래가는 전지가 필요했어요.',
      solve: '리튬 이온이 오가며 충전과 방전이 되는 리튬 이온 전지를 개발했어요.',
      result: '스마트폰과 전기차를 다시 충전해서 쓸 수 있게 됐어요.',
      limit: '다 쓴 전지는 재활용해서 자원을 되찾아야 해요.',
      ask: '다 쓴 전지는 어떻게 모아서 다시 쓸 수 있을까?' },
    { id: 'material', icon: '🧵', domain: '소재', name: '나일론', year: '1930년대', color: '#0ea5e9', key: '고분자 (나일론)',
      title: '고분자 소재로 생활을 바꾸다',
      problem: '가볍고 질긴 섬유와 소재가 필요했어요.',
      solve: '작은 분자를 길게 이어 붙인 나일론 같은 고분자를 합성했어요.',
      result: '옷, 로프, 포장재 등 다양한 제품을 값싸게 만들 수 있게 됐어요.',
      limit: '쓰고 버린 플라스틱이 쌓여 폐플라스틱 문제가 생겼어요.',
      ask: '쓰고 난 플라스틱을 어떻게 줄일 수 있을까?' },
    { id: 'env', icon: '🛡️', domain: '환경', name: 'CFC 규제', year: '1987년', color: '#06b6d4', key: 'CFC · 오존 (O₃)',
      title: '오존층을 지키는 화학',
      problem: '냉장고 냉매로 쓰던 CFC가 오존층을 파괴한다는 것이 밝혀졌어요.',
      solve: '1987년 몬트리올 의정서로 CFC 사용을 규제하고 대체 물질을 개발했어요.',
      result: '오존층을 파괴하는 물질의 사용이 크게 줄었어요.',
      limit: '화학 물질은 만들기 전에 환경에 미칠 영향을 미리 따져 봐야 해요.',
      ask: 'CFC는 화학이 만든 문제일까, 해결책일까?' },
    { id: 'hyg', icon: '🚰', domain: '위생', name: '염소 소독', year: '20세기 초', color: '#14a058', key: '염소 (Cl₂)',
      title: '염소 소독으로 물을 지키다',
      problem: '깨끗하지 않은 물 때문에 수인성 감염병이 퍼졌어요.',
      solve: '수돗물을 염소로 소독해 세균을 없앴어요.',
      result: '콜레라 같은 수인성 감염병이 크게 줄었어요.',
      limit: '소독 부산물이 생길 수 있어서 염소의 양을 관리해야 해요.',
      ask: '수돗물에 넣는 염소의 양을 왜 관리해야 할까?' },
  ];
  const ROWS = [{ k: 'problem', n: '문제', s: '문제', ic: '❗' }, { k: 'solve', n: '화학의 해결', s: '해결', ic: '🔧' }, { k: 'result', n: '성과', s: '성과', ic: '🌟' }, { k: 'limit', n: '한계', s: '한계', ic: '⚠️' }];
  const CELLS = [{ k: 'title', n: '제목' }, { k: 'key', n: '핵심 물질' }, { k: 'result', n: '사회적 영향' }, { k: 'limit', n: '한계' }, { k: 'ask', n: '친구에게 질문' }];
  const TALK = [
    { t: '인사하고 발표 제목 소개하기', s: 10 }, { t: '해결해야 했던 문제 상황 설명하기', s: 30 },
    { t: '화학이 문제를 푼 방법과 성과 말하기', s: 40 }, { t: '한계와 우리가 할 일 이야기하기', s: 20 }, { t: '친구들에게 질문하고 답 듣기', s: 20 },
  ];
  const TALK_SHOW = [2, 4, 0, 3, 1];                 // 화면에 보이는 카드 순서 (뒤섞음)
  const TALK_TOTAL = TALK.reduce((s, q) => s + q.s, 0);
  const PROBS = [{ id: 'food', n: '식량', ic: '🌾' }, { id: 'health', n: '건강', ic: '💊' }, { id: 'energy', n: '에너지', ic: '🔋' }, { id: 'env', n: '환경', ic: '🌍' }, { id: 'mat', n: '소재', ic: '🧵' }];
  const CONCS = [{ id: 'mol', n: '몰', sub: '다음 차시에서 배워요', ic: '🥚' }, { id: 'bond', n: '화학 결합', sub: '이 과목에서 배워요', ic: '🔗' }, { id: 'eq', n: '화학 평형', sub: '이 과목에서 배워요', ic: '⚖️' }, { id: 'ab', n: '산과 염기', sub: '이 과목에서 배워요', ic: '🧪' }];
  const LINKS = {
    'food-mol': '필요한 질소와 수소의 양을 몰로 계산해요.', 'food-eq': '암모니아를 더 많이 얻는 조건을 화학 평형으로 찾아요.',
    'health-ab': '위산과 제산제, 약의 산성·염기성을 따져요.', 'health-bond': '약 분자의 구조(결합)가 약의 작용을 정해요.',
    'energy-bond': '연료가 탈 때 결합이 끊기고 새로 생기며 에너지가 나와요.', 'energy-mol': '연료 몇 mol이 타는지로 낼 수 있는 에너지를 계산해요.',
    'env-ab': '산성비와 바다의 산성화를 이해해요.', 'env-eq': '이산화 탄소가 바닷물에 녹는 평형을 다뤄요.',
    'mat-bond': '고분자 사슬은 결합으로 이어져 성질이 정해져요.', 'mat-mol': '원료를 몇 mol 섞을지 정해요.',
  };
  const probName = (id) => PROBS.find((p) => p.id === id).n;
  const concName = (id) => CONCS.find((p) => p.id === id).n;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'day', t: 0, fade: 0, sub: 'poster',
    day: { found: {}, last: '', cam: 0, camT: 0, wipe: 0, wipeT: 0, pop: {}, drag: null, flash: 0 },
    cs: { opened: CASES.map(() => false), flip: CASES.map(() => ({ v: 0 })), sel: -1, fill: CASES.map(() => [-1, -1, -1, -1]), pos: CASES.map(() => []), drag: null, t: 0, pulse: 0 },
    ps: { cs: 0, cell: 0, done: CASES.map(() => CELLS.map(() => false)), bad: CASES.map(() => CELLS.map(() => ({}))), stamp: CASES.map(() => CELLS.map(() => ({ k: 1 }))), seq: [], seqAnim: { r: 0 }, shake: 0, shakeCell: -1 },
    wy: { links: [], selP: -1, selC: -1, pick: -1, msg: '', shake: 0, shakeNode: '' },
    gate: '',
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { day: '🏠 일상 속 화학', cases: '🔎 사례 조사', poster: '🖼️ 발표 준비', why: '🧭 왜 배울까' };
  const foundN = () => ITEMS.filter((q) => S.day.found[q.id]).length;
  const openedN = () => S.cs.opened.filter(Boolean).length;

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.cs.drag = null; S.day.drag = null; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sub === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#psView button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub));
    $$('#psCase button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.ps.cs); b.classList.toggle('done', S.ps.done[k].every(Boolean)); });
    $$('#psCell button').forEach((b) => { const k = +b.dataset.v; b.classList.toggle('on', k === S.ps.cell); b.classList.toggle('done', S.ps.done[S.ps.cs][k]); });
    buildOpts();
    $$('#whyPick button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.wy.pick));
    $('#oCam').textContent = S.day.camT < VW * 0.5 ? '아침 · 집' : '낮 · 학교 가는 길';
    $('#oWipe').textContent = Math.round(S.day.wipeT * 100) + ' %';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  CASES.forEach((c, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = c.icon + ' ' + c.domain; $('#psCase').appendChild(b); });
  CELLS.forEach((c, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = c.n; $('#psCell').appendChild(b); });
  PROBS.forEach((p, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.textContent = p.ic + ' ' + p.n; $('#whyPick').appendChild(b); });

  /* ================= ① 일상 속 화학 ================= */
  const PW = VW * 2;
  const FLOOR = PHONE ? 500 : 352, ICY = PHONE ? 430 : 290, WTOP = 52, WBOT = PHONE ? 640 : 456;
  const itemX = (q) => q.fx * PW;
  function drawItem(kind, x, y, m, t) {
    const c = (h) => (m ? gray(h) : h);
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const ink = c('#394258');
    if (kind === 'rice') {
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = c('#c9d2e0'); ctx.globalAlpha = 0.6; const ph = (t * 0.6 + i / 3) % 1; ctx.beginPath(); ctx.moveTo(-14 + i * 14, -26 - ph * 14); ctx.quadraticCurveTo(-8 + i * 14, -34 - ph * 14, -14 + i * 14, -42 - ph * 14); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c('#fff'); ctx.beginPath(); ctx.arc(0, -6, 28, Math.PI, 0); ctx.fill(); ctx.strokeStyle = c('#d6dcea'); ctx.stroke();
      ctx.fillStyle = c('#5b7bd5'); ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.quadraticCurveTo(30, 28, 0, 30); ctx.quadraticCurveTo(-30, 28, -34, -8); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
    } else if (kind === 'brush') {
      ctx.fillStyle = c('#38bdf8'); D.roundRect(-34, -4, 56, 10, 5); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = c('#38bdf8'); D.roundRect(18, -14, 18, 12, 4); ctx.fill();
      ctx.fillStyle = c('#fff'); for (let i = 0; i < 4; i++) ctx.fillRect(20 + i * 4, -26, 2.6, 12);
      ctx.save(); ctx.translate(-6, 22); ctx.rotate(-0.25); ctx.fillStyle = c('#e2464b'); D.roundRect(-28, -8, 48, 16, 5); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); ctx.fillStyle = c('#fff'); ctx.fillRect(20, -5, 10, 10); ctx.restore();
    } else if (kind === 'soap') {
      ctx.fillStyle = c('#f9a8d4'); D.roundRect(-30, -12, 60, 34, 12); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-12, -4, 12, 5, -0.3, 0, TAU); ctx.fill();
      [[-22, -26, 8], [4, -34, 11], [24, -24, 7]].forEach((b, i) => { const bob = RM ? 0 : Math.sin(t * 2 + i) * 2; ctx.strokeStyle = c('#7cc4ff'); ctx.lineWidth = 2; ctx.fillStyle = 'rgba(190,230,255,.45)'; ctx.beginPath(); ctx.arc(b[0], b[1] + bob, b[2], 0, TAU); ctx.fill(); ctx.stroke(); });
    } else if (kind === 'med') {
      ctx.save(); ctx.rotate(-0.5);
      ctx.fillStyle = c('#e2464b'); D.roundRect(-30, -12, 32, 24, 12); ctx.fill(); ctx.fillStyle = c('#fff'); D.roundRect(-2, -12, 32, 24, 12); ctx.fill(); ctx.strokeStyle = ink; D.roundRect(-30, -12, 60, 24, 12); ctx.stroke(); ctx.restore();
      ctx.fillStyle = c('#fff'); D.roundRect(-8, 6, 40, 26, 6); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); ctx.fillStyle = c('#14a058'); ctx.fillRect(8, 12, 8, 14); ctx.fillRect(4, 16, 16, 6);
    } else if (kind === 'uni') {
      ctx.fillStyle = c('#4c6ef5'); ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-34, -20); ctx.lineTo(-40, 0); ctx.lineTo(-28, 4); ctx.lineTo(-24, -6); ctx.lineTo(-24, 30); ctx.lineTo(24, 30); ctx.lineTo(24, -6); ctx.lineTo(28, 4); ctx.lineTo(40, 0); ctx.lineTo(34, -20); ctx.lineTo(14, -30); ctx.quadraticCurveTo(0, -18, -14, -30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = c('#fff'); ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(0, -12); ctx.lineTo(14, -30); ctx.lineTo(8, -32); ctx.lineTo(0, -22); ctx.lineTo(-8, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c('#e2464b'); ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-6, 2); ctx.lineTo(0, 22); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill();
    } else if (kind === 'phone') {
      ctx.fillStyle = c('#394258'); D.roundRect(-20, -34, 40, 68, 8); ctx.fill();
      ctx.fillStyle = c('#c7e9ff'); D.roundRect(-16, -28, 32, 50, 4); ctx.fill();
      ctx.strokeStyle = c('#14a058'); ctx.lineWidth = 2.4; D.roundRect(-9, -14, 18, 10, 2); ctx.stroke(); ctx.fillStyle = c('#14a058'); ctx.fillRect(-7, -12, 9 + (RM ? 0 : Math.sin(t * 2) * 3), 6); ctx.fillRect(9, -11, 2.6, 4);
      ctx.fillStyle = c('#ffb400'); ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(-5, 12); ctx.lineTo(0, 12); ctx.lineTo(-2, 20); ctx.lineTo(6, 8); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill();
    } else if (kind === 'bottle') {
      ctx.fillStyle = c('#dff3ff'); ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(8, -34); ctx.lineTo(8, -24); ctx.quadraticCurveTo(22, -16, 22, -2); ctx.lineTo(22, 28); ctx.quadraticCurveTo(22, 34, 16, 34); ctx.lineTo(-16, 34); ctx.quadraticCurveTo(-22, 34, -22, 28); ctx.lineTo(-22, -2); ctx.quadraticCurveTo(-22, -16, -8, -24); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
      ctx.fillStyle = c('#7cc4ff'); ctx.fillRect(-20, 6, 40, 26); ctx.fillStyle = c('#38bdf8'); D.roundRect(-9, -40, 18, 8, 3); ctx.fill();
      ctx.fillStyle = c('#14a058'); ctx.fillRect(-21, -2, 42, 10);
    } else if (kind === 'tap') {
      ctx.strokeStyle = c('#7b8798'); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(-26, -24); ctx.quadraticCurveTo(-26, -36, -12, -36); ctx.lineTo(4, -36); ctx.quadraticCurveTo(14, -36, 14, -26); ctx.lineTo(14, -18); ctx.stroke();
      ctx.fillStyle = c('#7b8798'); D.roundRect(8, -20, 12, 8, 2); ctx.fill();
      ctx.fillStyle = c('#7cc4ff');
      for (let i = 0; i < 3; i++) { const ph = RM ? i / 3 : (t * 1.2 + i / 3) % 1; ctx.globalAlpha = 1 - ph * 0.5; ctx.beginPath(); ctx.ellipse(14, -8 + ph * 34, 3.4, 5, 0, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c('#e8eef7'); ctx.strokeStyle = ink; ctx.lineWidth = 2.4; D.roundRect(-34, 22, 68, 16, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c('#7cc4ff'); D.roundRect(-28, 26, 56, 8, 3); ctx.fill();
    }
    ctx.restore();
  }
  function drawWorld(m, cam, t) {
    const c = (h) => (m ? gray(h) : h);
    // 배경 (하늘/벽)
    let g = ctx.createLinearGradient(0, WTOP, 0, FLOOR); g.addColorStop(0, c('#fff1e0')); g.addColorStop(1, c('#fde0c4'));
    ctx.fillStyle = g; ctx.fillRect(0, WTOP, PW * 0.5 - cam + 2, FLOOR - WTOP);
    g = ctx.createLinearGradient(0, WTOP, 0, FLOOR); g.addColorStop(0, c('#9ad4ff')); g.addColorStop(1, c('#e6f5ff'));
    ctx.fillStyle = g; ctx.fillRect(PW * 0.5 - cam, WTOP, PW * 0.5 + 2, FLOOR - WTOP);
    // 구름 (시차)
    ctx.fillStyle = c('#ffffff'); ctx.globalAlpha = 0.9;
    [[0.58, 92, 1], [0.78, 130, 0.8], [0.96, 84, 1.1]].forEach((q) => { const cx = q[0] * PW - cam * 0.85 + (RM ? 0 : Math.sin(t * 0.3 + q[0] * 9) * 6); ctx.beginPath(); ctx.arc(cx, q[1], 18 * q[2], 0, TAU); ctx.arc(cx + 20 * q[2], q[1] + 4, 14 * q[2], 0, TAU); ctx.arc(cx - 20 * q[2], q[1] + 5, 13 * q[2], 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(-cam, 0);
    // 실내: 창문, 시계, 선반
    const wx = PW * 0.14;
    ctx.fillStyle = c('#bfe3ff'); D.roundRect(wx - 46, 78, 92, 84, 6); ctx.fill(); ctx.strokeStyle = c('#b08968'); ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, 78); ctx.lineTo(wx, 162); ctx.moveTo(wx - 46, 120); ctx.lineTo(wx + 46, 120); ctx.lineWidth = 3; ctx.stroke();
    if (!m) { D.glow(wx - 20, 100, 30, '#ffe58a', 0.8); }
    const clx = PW * 0.36;
    ctx.fillStyle = c('#fff'); ctx.beginPath(); ctx.arc(clx, 110, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = c('#516079'); ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(clx, 110); ctx.lineTo(clx, 94); ctx.moveTo(clx, 110); ctx.lineTo(clx + 11, 114); ctx.stroke();
    // 문
    const dx = PW * 0.5;
    ctx.fillStyle = c('#c08a5a'); D.roundRect(dx - 28, FLOOR - 150, 56, 150, 4); ctx.fill(); ctx.strokeStyle = c('#7b5a3a'); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = c('#ffd447'); ctx.beginPath(); ctx.arc(dx + 16, FLOOR - 72, 4, 0, TAU); ctx.fill();
    // 학교 건물
    const bx = PW * 0.60;
    ctx.fillStyle = c('#f4b183'); ctx.fillRect(bx, FLOOR - 190, 230, 190); ctx.fillStyle = c('#c0784f'); ctx.beginPath(); ctx.moveTo(bx - 10, FLOOR - 190); ctx.lineTo(bx + 115, FLOOR - 236); ctx.lineTo(bx + 240, FLOOR - 190); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#dff3ff'); for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) ctx.fillRect(bx + 18 + q * 52, FLOOR - 170 + r * 62, 34, 40);
    // 나무
    const tx = PW * 0.87;
    ctx.fillStyle = c('#8b5a2b'); ctx.fillRect(tx - 6, FLOOR - 70, 12, 70); ctx.fillStyle = c('#4caf50'); ctx.beginPath(); ctx.arc(tx, FLOOR - 96, 38, 0, TAU); ctx.arc(tx - 26, FLOOR - 74, 26, 0, TAU); ctx.arc(tx + 26, FLOOR - 74, 26, 0, TAU); ctx.fill();
    // 바닥
    ctx.fillStyle = c('#d9b48a'); ctx.fillRect(0, FLOOR, PW * 0.5, WBOT - FLOOR + 40);
    ctx.fillStyle = c('#a9774b'); for (let i = 0; i < 14; i++) ctx.fillRect(i * (PW * 0.5 / 14), FLOOR, 2, WBOT - FLOOR + 40);
    ctx.fillStyle = c('#7bc67e'); ctx.fillRect(PW * 0.5, FLOOR, PW * 0.5, 20);
    ctx.fillStyle = c('#9aa3b2'); ctx.fillRect(PW * 0.5, FLOOR + 20, PW * 0.5, WBOT - FLOOR + 20);
    ctx.fillStyle = c('#f5f7fb'); for (let i = 0; i < 9; i++) ctx.fillRect(PW * 0.5 + 20 + i * (PW * 0.5 / 9), FLOOR + 66, 40, 6);
    // 물건
    ITEMS.forEach((q, i) => {
      const x = itemX(q), bob = RM ? 0 : Math.sin(t * 1.6 + i) * 2;
      if (m) {
        ctx.strokeStyle = '#a7afbd'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, ICY, 34, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        T(x, ICY + 60, '없음', 13, '#7b8494', 'center', 800);
      } else {
        const pop = S.day.pop[q.id] || 0, sc = 1 + 0.28 * pop;
        ctx.fillStyle = 'rgba(40,30,20,.14)'; ctx.beginPath(); ctx.ellipse(x, ICY + 42, 30, 7, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, ICY + bob); ctx.scale(sc, sc); drawItem(q.id, 0, 0, false, t); ctx.restore();
        if (!S.day.found[q.id]) { if (!RM) D.spark(x + 30, ICY - 36 + bob, 7, t + i, '#fff2a8'); } else T(x, ICY + 62, q.name, 14, INK, 'center', 800, { stroke: '#fff', strokeWidth: 4 });
      }
    });
    ctx.restore();
  }
  function drawDay(t) {
    const d = S.day, cam = d.cam, wx = d.wipe * VW;
    T(14, 26, '🏠 하루 속 화학 제품을 찾아요', PHONE ? 15 : 17, INK, 'left', 800);
    T(14, PHONE ? 46 : 46, '물건을 눌러요 · 화면을 옆으로 밀면 하루가 흘러가요', PHONE ? 12.5 : 13.5, MUTED, 'left', 700);
    ctx.save(); ctx.beginPath(); ctx.rect(0, WTOP, VW, WBOT - WTOP); ctx.clip();
    if (wx > 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, WTOP, wx, WBOT - WTOP); ctx.clip(); drawWorld(true, cam, t); ctx.restore(); }
    if (wx < VW - 1) { ctx.save(); ctx.beginPath(); ctx.rect(wx, WTOP, VW - wx, WBOT - WTOP); ctx.clip(); drawWorld(false, cam, t); ctx.restore(); }
    if (wx > 1 && wx < VW - 1) {
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(wx - 2, WTOP, 4, WBOT - WTOP);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wx, (WTOP + WBOT) / 2, 15, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
      T(wx, (WTOP + WBOT) / 2 + 5, '↔', 15, PUR, 'center', 800);
      if (wx > 120) D.label(wx - 8, WTOP + 18, '화학 제품 없는 하루', { bg: '#516079', size: 13, align: 'right' });
    } else if (wx >= VW - 1) D.label(VW / 2, WTOP + 18, '화학 제품 없는 하루', { bg: '#516079', size: 13 });
    ctx.restore();
    // 아래 패널: 발견 칸 + 설명
    const by = WBOT + 8, bh = VH - by - 8;
    panel(8, by, VW - 16, bh, 14);
    const n = foundN();
    T(22, by + 24, '찾은 화학 제품 ' + n + ' / ' + ITEMS.length, 14, INK, 'left', 800);
    const sr = PHONE ? 22 : 20, sp = PHONE ? 54 : 46, sx0 = 22 + sr, sy = by + (PHONE ? 66 : 60);
    ITEMS.forEach((q, i) => {
      const x = sx0 + i * sp, f = S.day.found[q.id], pop = S.day.pop[q.id] || 0;
      ctx.fillStyle = f ? '#fff' : '#eef1f7'; ctx.strokeStyle = f ? '#14a058' : '#cfd6e4'; ctx.lineWidth = f ? 2.6 : 1.6; ctx.setLineDash(f ? [] : [4, 4]);
      ctx.beginPath(); ctx.arc(x, sy, sr * (1 + 0.2 * pop), 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      if (f) { ctx.save(); ctx.translate(x, sy); ctx.scale(0.4, 0.4); drawItem(q.id, 0, 0, false, t); ctx.restore(); } else T(x, sy + 5, '?', 15, '#9aa5b6', 'center', 800);
    });
    const info = ITEMS.find((q) => q.id === d.last);
    const ix = PHONE ? 22 : 22 + 8 * sp + 14, iy = PHONE ? by + 112 : by + 12, iw = PHONE ? VW - 44 : VW - ix - 20;
    if (info) { T(ix, iy + (PHONE ? 4 : 14), '💡 ' + info.name, 14, '#5b21b6', 'left', 800); textBlock(ix, iy + (PHONE ? 26 : 36), iw, info.tag, PHONE ? 13.5 : 14, INK, PHONE ? 18 : 19, 700); }
    else textBlock(ix, iy + (PHONE ? 14 : 24), iw, '아침부터 낮까지 물건을 눌러 화학 제품을 찾아보세요.', PHONE ? 13.5 : 14, MUTED, 19, 700);
  }
  function dayDown(p) {
    S.day.drag = { x: p.x, cam: S.day.camT, moved: false, px: p.x, py: p.y };
    return true;
  }
  function dayMove(p) {
    const d = S.day.drag; if (!d) return;
    if (Math.abs(p.x - d.px) > 8) d.moved = true;
    if (d.moved) { S.day.camT = clamp(d.cam - (p.x - d.px), 0, VW); $('#sCam').value = Math.round(S.day.camT / VW * 100); updateCtl(); }
  }
  function dayUp(p) {
    const d = S.day.drag; S.day.drag = null; if (!d || d.moved) return;
    dayTap(p);
  }
  function dayTap(p) {
    if (p.y < WTOP || p.y > WBOT) return;
    const wx = S.day.wipe * VW;
    let best = null, bd = 1e9;
    ITEMS.forEach((q) => { const sx = itemX(q) - S.day.cam, d = Math.hypot(p.x - sx, p.y - ICY); if (d < (PHONE ? 52 : 50) && d < bd) { bd = d; best = q; } });
    if (!best) return;
    const sx = itemX(best) - S.day.cam;
    if (sx < wx) { showHint('흑백 쪽에는 화학 제품이 없어요. 가리개를 줄여서 물건을 찾아요.', 3600); Sound.fail(); return; }
    S.day.last = best.id;
    if (!S.day.found[best.id]) {
      S.day.found[best.id] = true; Sound.success();
      parts.burst(sx, ICY - 6, { count: 14, speed: 150, size: 3, colors: ['#ffb400', '#8b5cf6', '#14a058', '#fff'] });
      S.day.pop[best.id] = 1;
      SciSim.tween(S.day.pop, { [best.id]: 0 }, { duration: 0.7, ease: 'outBounce' });
    } else Sound.click();
  }
  function stepDay(dt) {
    const d = S.day;
    d.cam = SciSim.approach(d.cam, d.camT, dt, 7); d.wipe = SciSim.approach(d.wipe, d.wipeT, dt, 9);
    if (Math.abs(d.cam - d.camT) < 0.05) d.cam = d.camT; if (Math.abs(d.wipe - d.wipeT) < 0.0005) d.wipe = d.wipeT;
  }
  $('#sCam').addEventListener('input', (e) => { S.day.camT = +e.target.value / 100 * VW; updateCtl(); });
  $('#sWipe').addEventListener('input', (e) => { S.day.wipeT = +e.target.value / 100; updateCtl(); });

  /* ================= ② 사례 조사 ================= */
  const CARD = PHONE ? { w: 146, h: 74, gap: 8, x0: 13, y0: 46, cols: 3 } : { w: 118, h: 92, gap: 10, x0: 21, y0: 44, cols: 6 };
  const cardRect = (i) => ({ x: CARD.x0 + (i % CARD.cols) * (CARD.w + CARD.gap), y: CARD.y0 + Math.floor(i / CARD.cols) * (CARD.h + CARD.gap), w: CARD.w, h: CARD.h });
  const AB = PHONE ? { x: 12, y: 232, w: 456, h: 104 } : { x: 12, y: 164, w: 250, h: 186 };
  const TB = PHONE ? { lx: 12, lw: 54, sx: 70, sw: 398, y0: 344, rh: 58, sh: 52 } : { lx: 272, lw: 74, sx: 352, sw: 436, y0: 166, rh: 46, sh: 40 };
  const TRAYY = PHONE ? 600 : 380;
  const CHIP = PHONE ? { w: 226, h: 70, gx: 8, gy: 6, x0: 11, cols: 2 } : { w: 256, h: 70, gx: 10, gy: 6, x0: 6, cols: 3 };
  const slotRect = (r) => ({ x: TB.sx, y: TB.y0 + r * TB.rh, w: TB.sw, h: TB.sh });
  const CHIP_SHOW = (ci) => { const base = [0, 1, 2, 3, 4], s = (ci * 2 + 1) % 5; return base.map((_, i) => (i * 2 + s) % 5); };     // 트레이에 놓인 순서 (고정, 뒤섞임)
  function chipText(ci, c) { return c < 4 ? CASES[ci][ROWS[c].k] : CASES[(ci + 3) % 6].limit; }
  function trayRect(ci, c) { const idx = CHIP_SHOW(ci).indexOf(c); return { x: CHIP.x0 + (idx % CHIP.cols) * (CHIP.w + CHIP.gx), y: TRAYY + Math.floor(idx / CHIP.cols) * (CHIP.h + CHIP.gy), w: CHIP.w, h: CHIP.h }; }
  function chipTarget(ci, c) { const r = S.cs.fill[ci].indexOf(c); return r >= 0 ? slotRect(r) : trayRect(ci, c); }
  function ensurePos(ci) { if (!S.cs.pos[ci].length) S.cs.pos[ci] = [0, 1, 2, 3, 4].map((c) => Object.assign({}, trayRect(ci, c))); }
  CASES.forEach((_, i) => ensurePos(i));
  const tableOK = (ci) => ci >= 0 && S.cs.fill[ci].every((c, r) => c === r);
  const filledN = (ci) => (ci < 0 ? 0 : S.cs.fill[ci].filter((c) => c >= 0).length);
  function openCard(i) {
    const cs = S.cs;
    if (!cs.opened[i]) {
      cs.opened[i] = true; Sound.success();
      SciSim.tween(cs.flip[i], { v: 1 }, { duration: 0.5, ease: 'outCubic' });
      const r = cardRect(i); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 10, speed: 110, size: 3, colors: [CASES[i].color, '#fff', '#ffb400'] });
    } else Sound.click();
    cs.sel = i; cs.t = 0; cs.drag = null;
    ensurePos(i);
    updateCtl();
  }
  function csDown(p) {
    const cs = S.cs;
    if (cs.sel >= 0 && cs.opened[cs.sel]) {
      let best = -1, bd = 1e9;
      cs.pos[cs.sel].forEach((q, c) => { if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) { const d = Math.hypot(p.x - (q.x + q.w / 2), p.y - (q.y + q.h / 2)); if (d < bd) { bd = d; best = c; } } });
      if (best >= 0) {
        const q = cs.pos[cs.sel][best], r = cs.fill[cs.sel].indexOf(best);
        if (r >= 0) cs.fill[cs.sel][r] = -1;
        cs.drag = { c: best, ox: q.x - p.x, oy: q.y - p.y, from: r };
        Sound.click(); return true;
      }
    }
    for (let i = 0; i < CASES.length; i++) { const r = cardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { openCard(i); return false; } }
    return false;
  }
  function csMove(p) { const cs = S.cs, d = cs.drag; if (!d) return; const q = cs.pos[cs.sel][d.c]; q.x = clamp(p.x + d.ox, -20, VW - q.w + 20); q.y = clamp(p.y + d.oy, 40, VH - 20); }
  function csUp(p) {
    const cs = S.cs, d = cs.drag; if (!d) return; cs.drag = null;
    let slot = -1;
    for (let r = 0; r < 4; r++) { const s = slotRect(r); if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y - 3 && p.y <= s.y + s.h + 3) slot = r; }
    if (slot >= 0) {
      cs.fill[cs.sel][slot] = d.c;
      Sound.click(); const s = slotRect(slot); parts.burst(s.x + 22, s.y + s.h / 2, { count: 5, speed: 60, size: 2.4, colors: [CASES[cs.sel].color, '#fff'], gravity: 0 });
    } else Sound.click();
    updateCtl();
  }
  function stepCases(dt) {
    const cs = S.cs; cs.t += dt;
    if (cs.sel < 0) return;
    cs.pos[cs.sel].forEach((q, c) => {
      if (cs.drag && cs.drag.c === c) return;
      const tg = chipTarget(cs.sel, c);
      q.x = SciSim.approach(q.x, tg.x, dt, 14); q.y = SciSim.approach(q.y, tg.y, dt, 14); q.w = SciSim.approach(q.w, tg.w, dt, 14); q.h = SciSim.approach(q.h, tg.h, dt, 14);
    });
  }
  function drawCaseAnim(ci, x, y, w, h, t) {
    const cs = CASES[ci];
    ctx.save(); D.roundRect(x, y, w, h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, C.mix(cs.color, '#ffffff', 0.86)); g.addColorStop(1, '#ffffff'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2 + (PHONE ? 8 : 8);
    const kx = PHONE ? 1.5 : w / 250, ky = PHONE ? 0.74 : 1, R = PHONE ? 10 : 11;
    const bond = (x1, y1, x2, y2, col, lw) => { ctx.strokeStyle = col || '#8a95a6'; ctx.lineWidth = lw || 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (ci === 0) {
      // N2 + 3H2 -> 2NH3 (원자 수는 그대로, 짝만 바뀌어요)
      const p = RM ? 1 : (t * 0.22) % 1, mv = sm((p - 0.38) / 0.24), phase = p < 0.38 ? 0 : p > 0.62 ? 2 : 1;
      const X = (v) => cx + v * kx, Y = (v) => cy + v * ky;
      const Na = [[-84, -4], [-84, 20]], Nb = [[58, -6], [58, 40]];
      const Ha = [[-40, -22], [-40, -4], [-40, 20], [-40, 38], [-10, 8], [-10, -28]], Hb = [[34, -26], [82, -26], [58, -30], [34, 14], [82, 14], [58, 16]];
      const hp = (i) => [Ha[i][0] + (Hb[i][0] - Ha[i][0]) * mv, Ha[i][1] + (Hb[i][1] - Ha[i][1]) * mv];
      const np = (i) => [Na[i][0] + (Nb[i][0] - Na[i][0]) * mv, Na[i][1] + (Nb[i][1] - Na[i][1]) * mv];
      if (phase === 0) { bond(X(np(0)[0]), Y(np(0)[1]), X(np(1)[0]), Y(np(1)[1])); bond(X(hp(0)[0]), Y(hp(0)[1]), X(hp(1)[0]), Y(hp(1)[1])); bond(X(hp(2)[0]), Y(hp(2)[1]), X(hp(3)[0]), Y(hp(3)[1])); bond(X(hp(4)[0]), Y(hp(4)[1]), X(hp(5)[0]), Y(hp(5)[1])); }
      if (phase === 2) for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) { const a = np(k), b = hp(k * 3 + j); bond(X(a[0]), Y(a[1]), X(b[0]), Y(b[1])); }
      [0, 1].forEach((i) => { const q = np(i); D.sphere(X(q[0]), Y(q[1]), R * 1.25, '#3867f4', { text: 'N', textScale: 0.9 }); });
      Ha.forEach((_, i) => { const q = hp(i); D.sphere(X(q[0]), Y(q[1]), R * 0.82, '#eef1f7', { outline: '#8a95a6', outlineWidth: 1, text: 'H', textColor: '#394258', textScale: 1 }); });
      D.arrow(X(-52), Y(-54), X(44), Y(-54), { color: '#8b5cf6', width: 3, head: 11 });
      T(x + w / 2, y + 20, PHONE ? '질소 28 g + 수소 6 g → 암모니아 34 g' : 'N₂ + 3H₂ → 2NH₃', 13, INK, 'center', 800);
      if (!PHONE) T(x + w / 2, y + h - 12, '28 g + 6 g → 34 g', 13, '#14803f', 'center', 800);
    } else if (ci === 4) {
      // Cl + O3 -> ClO + O2 (염소 원자가 오존에서 산소 원자 하나를 가져가요)
      const p = RM ? 1 : (t * 0.2) % 1, mv = sm((p - 0.12) / 0.34), out = sm((p - 0.55) / 0.3);
      const k = PHONE ? 1.15 : 0.85, X = (v) => cx + v * k, Y = (v) => cy + v * (PHONE ? 0.8 : 1);
      const A = [-6 - 70 * out, -24 - 10 * out], B = [30, 14], Cc = [66, -24];
      const Cl = [-110 + 78 * mv - 70 * out, -24 - 10 * out];
      if (out < 0.3) bond(X(A[0]), Y(A[1]), X(B[0]), Y(B[1]));
      bond(X(B[0]), Y(B[1]), X(Cc[0]), Y(Cc[1]));
      if (mv > 0.95) bond(X(Cl[0]), Y(Cl[1]), X(A[0]), Y(A[1]));
      D.sphere(X(B[0]), Y(B[1]), R, '#e2464b', { text: 'O', textScale: 0.9 }); D.sphere(X(Cc[0]), Y(Cc[1]), R, '#e2464b', { text: 'O', textScale: 0.9 });
      D.sphere(X(A[0]), Y(A[1]), R, '#e2464b', { text: 'O', textScale: 0.9 });
      D.sphere(X(Cl[0]), Y(Cl[1]), R * 1.35, '#14a058', { text: 'Cl', textScale: 0.8 });
      T(x + w / 2, y + 20, PHONE ? 'Cl이 오존(O₃)을 분해해요' : 'CFC에서 떨어진 염소(Cl)가 오존(O₃)을 분해해요', 13, INK, 'center', 800);
      T(x + w / 2, y + h - 10, 'Cl + O₃ → ClO + O₂', 13, '#0e7490', 'center', 800);
    } else {
      const bob = RM ? 0 : Math.sin(t * 2) * 3;
      D.glow(cx, cy, 58, cs.color, 0.35);
      T(cx, cy + 14 + bob, cs.icon, PHONE ? 46 : 62, '#000', 'center', 700);
      T(x + w / 2, y + 22, cs.key, 14, INK, 'center', 800);
      if (!RM) for (let q = 0; q < 3; q++) { const ph = (t * 0.5 + q / 3) % 1; D.spark(cx - 50 + q * 50, cy - 20 - ph * 30, 6, t + q, '#fff2a8'); }
    }
    ctx.restore();
  }
  function drawChip(ci, c, lift) {
    const q = S.cs.pos[ci][c];
    D.shadow(() => { D.roundRect(q.x, q.y, q.w, q.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 14 : 4, y: lift ? 6 : 2 });
    ctx.strokeStyle = lift ? PUR : '#d6dcea'; ctx.lineWidth = lift ? 2.6 : 1.5; D.roundRect(q.x, q.y, q.w, q.h, 10); ctx.stroke();
    const lines = wrap(chipText(ci, c), q.w - 16, 13, 700), lh = 16, n = Math.min(lines.length, Math.floor((q.h - 6) / lh)), y0 = q.y + q.h / 2 - (n - 1) * lh / 2 + 4;
    for (let i = 0; i < n; i++) T(q.x + 8, y0 + i * lh, lines[i], 13, INK, 'left', 700);
  }
  function drawCases(t) {
    const cs = S.cs;
    T(14, 26, '🔎 화학이 해결한 사례를 조사해요', PHONE ? 15 : 17, INK, 'left', 800);
    CASES.forEach((c, i) => {
      const r = cardRect(i), f = cs.flip[i].v, sc = Math.abs(Math.cos(Math.PI * f)), front = f < 0.5, cx = r.x + r.w / 2;
      ctx.save(); ctx.translate(cx, r.y + r.h / 2); ctx.scale(Math.max(0.02, sc), 1); ctx.translate(-cx, -(r.y + r.h / 2));
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = front ? '#fff' : C.mix(c.color, '#ffffff', 0.84); ctx.fill(); }, { blur: i === cs.sel ? 12 : 5, y: 2, color: i === cs.sel ? C.rgba(c.color, 0.55) : undefined });
      ctx.strokeStyle = i === cs.sel ? c.color : '#d6dcea'; ctx.lineWidth = i === cs.sel ? 3 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (front) {
        T(cx, r.y + r.h * 0.5 + (PHONE ? 2 : 4), c.icon, PHONE ? 30 : 38, '#000', 'center', 700);
        T(cx, r.y + r.h - (PHONE ? 8 : 10), '사례 ' + (i + 1) + ' · ' + c.domain, 13, MUTED, 'center', 800);
        if (!cs.opened[i] && !RM) D.spark(r.x + r.w - 14, r.y + 16, 6, t + i, '#ffd447');
      } else {
        ctx.fillStyle = c.color; ctx.save(); D.roundRect(r.x, r.y, r.w, 8, 4); ctx.clip(); ctx.fillRect(r.x, r.y, r.w, 8); ctx.restore();
        const nl = wrap(c.name, r.w - 12, 14, 800); nl.slice(0, 2).forEach((l, k) => T(cx, r.y + 30 + k * 17, l, 14, INK, 'center', 800));
        T(cx, r.y + (PHONE ? 52 : 62), c.icon, PHONE ? 20 : 24, '#000', 'center', 700);
        T(cx, r.y + r.h - (PHONE ? 7 : 8), c.year, 13, MUTED, 'center', 800, { alpha: 1 });
      }
      ctx.restore();
    });
    if (cs.sel < 0) {
      panel(AB.x, AB.y, VW - 24, VH - AB.y - 12, 14);
      textBlock(VW / 2, AB.y + 70, VW - 80, '위의 카드를 눌러 뒤집어 보세요. 3장 이상 조사하고, 조사 노트의 표를 채워요.', 15, MUTED, 22, 800, 'center');
      T(VW / 2, AB.y + 40, '📓 조사 노트', 15, INK, 'center', 800);
      return;
    }
    const ci = cs.sel, c = CASES[ci];
    panel(AB.x, AB.y, AB.w, AB.h, 12);
    drawCaseAnim(ci, AB.x + 2, AB.y + 2, AB.w - 4, AB.h - 4, cs.t);
    // 표
    if (!PHONE) { T(TB.lx, TB.y0 - 10, '📓 조사 노트: ' + c.icon + ' ' + c.name + ' (' + c.year + ')', 14, INK, 'left', 800); }
    else T(14, AB.y - 8, '📓 ' + c.icon + ' ' + c.name + ' (' + c.year + ')', 14, INK, 'left', 800);
    ROWS.forEach((r, k) => {
      const s = slotRect(k), filled = cs.fill[ci][k] >= 0;
      D.roundRect(TB.lx, s.y, TB.lw, s.h, 10); ctx.fillStyle = c.color; ctx.fill();
      T(TB.lx + TB.lw / 2, s.y + s.h / 2 - 2, r.ic, PHONE ? 16 : 17, '#fff', 'center', 800);
      T(TB.lx + TB.lw / 2, s.y + s.h / 2 + 14, PHONE ? r.s : r.n, 13, '#fff', 'center', 800);
      if (!filled) { ctx.strokeStyle = '#b4bfcf'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); D.roundRect(s.x, s.y, s.w, s.h, 10); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(s.x, s.y, s.w, s.h, 10); ctx.fill(); T(s.x + s.w / 2, s.y + s.h / 2 + 5, '카드를 끌어다 놓아요', 13, '#9aa5b6', 'center', 700); }
    });
    const trayLabelY = TRAYY - 8;
    T(PHONE ? 14 : 8, trayLabelY, '📎 카드 5장 중 알맞은 4장을 골라 표에 놓아요', 13.5, MUTED, 'left', 800);
    for (let c2 = 0; c2 < 5; c2++) if (!(cs.drag && cs.drag.c === c2)) drawChip(ci, c2, false);
    if (cs.drag) drawChip(ci, cs.drag.c, true);
  }

  /* ================= ③ 발표 준비 ================= */
  function optsFor(ci, cell) {
    const f = CELLS[cell].k, correct = CASES[ci][f], arr = [];
    const d = [1, 2, 3].map((j) => CASES[(ci + j) % CASES.length][f]);
    const pos = (ci + cell * 2) % 4;
    for (let i = 0, di = 0; i < 4; i++) arr.push(i === pos ? { t: correct, ok: true } : { t: d[di++], ok: false });
    return arr;
  }
  function buildOpts() {
    const box = $('#psOpt'); if (!box) return;
    const ci = S.ps.cs, cell = S.ps.cell, key = ci + '-' + cell + '-' + S.ps.done[ci][cell] + '-' + Object.keys(S.ps.bad[ci][cell]).join(',');
    if (box.dataset.key === key) return;
    box.dataset.key = key; box.innerHTML = '';
    optsFor(ci, cell).forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = o.t;
      if (S.ps.done[ci][cell]) { b.disabled = true; if (o.ok) b.classList.add('ok'); }
      else if (S.ps.bad[ci][cell][i]) { b.disabled = true; b.classList.add('bad'); }
      b.addEventListener('click', () => psPick(i));
      box.appendChild(b);
    });
  }
  function psPick(i) {
    const ps = S.ps, ci = ps.cs, cell = ps.cell;
    if (ps.done[ci][cell]) return;
    const o = optsFor(ci, cell)[i];
    if (o.ok) {
      ps.done[ci][cell] = true; Sound.success();
      ps.stamp[ci][cell].k = 0; SciSim.tween(ps.stamp[ci][cell], { k: 1 }, { duration: 0.55, ease: 'outBack' });
      const r = cellRect(cell); parts.burst(r.x + r.w - 30, r.y + 30, { count: 14, speed: 140, size: 3, colors: [CASES[ci].color, '#ffb400', '#fff'] });
      const nx = ps.done[ci].findIndex((v) => !v); if (nx >= 0) ps.cell = nx;
    } else {
      ps.bad[ci][cell][i] = true; ps.shake = 0.45; ps.shakeCell = cell; Sound.fail();
      showHint('이 사례의 내용이 아니에요. 다른 사례의 내용이 섞여 있어요.', 3200);
    }
    updateCtl();
  }
  const PAPER = PHONE ? { x: 12, y: 52, w: 456, h: 750 } : { x: 60, y: 52, w: 680, h: 452 };
  function cellRect(k) {
    const P = PAPER;
    if (PHONE) { if (k === 0) return { x: P.x + 12, y: P.y + 12, w: P.w - 24, h: 130 }; return { x: P.x + 12, y: P.y + 154 + (k - 1) * 146, w: P.w - 24, h: 136 }; }
    if (k === 0) return { x: P.x + 14, y: P.y + 14, w: P.w - 28, h: 84 };
    const cw = (P.w - 28 - 12) / 2, ch = (P.h - 14 - 84 - 14 - 12 - 14) / 2;
    const col = (k - 1) % 2, row = Math.floor((k - 1) / 2);
    return { x: P.x + 14 + col * (cw + 12), y: P.y + 14 + 84 + 12 + row * (ch + 12), w: cw, h: ch };
  }
  const posterDone = () => S.ps.done[S.ps.cs].every(Boolean);
  function drawPoster(t) {
    const ps = S.ps, ci = ps.cs, c = CASES[ci], P = PAPER;
    T(14, 26, '🖼️ 한 장 포스터 만들기', PHONE ? 15 : 17, INK, 'left', 800);
    T(PHONE ? 14 : 200, PHONE ? 26 : 26, PHONE ? '' : '오른쪽에서 칸을 고르고 알맞은 내용을 골라요', 13.5, MUTED, 'left', 700);
    panel(P.x, P.y, P.w, P.h, 16, '#fffdf7');
    ctx.strokeStyle = C.rgba(c.color, 0.5); ctx.lineWidth = 3; D.roundRect(P.x + 6, P.y + 6, P.w - 12, P.h - 12, 12); ctx.stroke();
    CELLS.forEach((cell, k) => {
      const r = cellRect(k), done = ps.done[ci][k], act = ps.cell === k, st = ps.stamp[ci][k].k;
      const sh = ps.shake > 0 && ps.shakeCell === k ? Math.sin(t * 70) * 4 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.roundRect(r.x, r.y, r.w, r.h, 12);
      ctx.fillStyle = done ? C.mix(c.color, '#ffffff', 0.9) : '#fff'; ctx.fill();
      ctx.strokeStyle = act ? c.color : done ? C.mix(c.color, '#ffffff', 0.5) : '#c8d0df'; ctx.lineWidth = act ? 3.2 : 2; if (!done) ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      D.label(r.x + 10, r.y + 16, cell.n, { bg: c.color, size: 13, align: 'left' });
      if (done) {
        const txt = c[cell.k];
        if (k === 0) { textBlock(r.x + r.w / 2, r.y + r.h / 2 + 10, r.w - 40, txt, PHONE ? 19 : 22, INK, PHONE ? 26 : 30, 800, 'center'); }
        else textBlock(r.x + 14, r.y + 46, r.w - 28, txt, PHONE ? 15 : 15, INK, PHONE ? 21 : 21, 800);
        const sc = 1 + 0.9 * (1 - st), a = clamp(st * 1.4, 0, 1);
        ctx.save(); ctx.translate(r.x + r.w - 26, r.y + r.h - 24); ctx.rotate(-0.25); ctx.scale(sc, sc); ctx.globalAlpha = a;
        ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.stroke();
        T(0, 5, '확인', 13, '#14a058', 'center', 800); ctx.restore();
      } else {
        T(r.x + r.w / 2, r.y + r.h / 2 + 12, act ? '오른쪽에서 알맞은 내용을 골라요' : '아직 비어 있어요', PHONE ? 14 : 14, act ? c.color : '#9aa5b6', 'center', 800);
        if (act) D.ring(r.x + r.w / 2, r.y + r.h / 2 - 12, 10, t, { color: c.color, speed: 1 });
      }
      ctx.restore();
    });
    const n = ps.done[ci].filter(Boolean).length;
    if (!PHONE) T(VW / 2, P.y + P.h + 30, c.icon + ' ' + c.name + ' 포스터: ' + n + ' / 5칸 완성', 14, INK, 'center', 800);
  }
  const OC = PHONE ? { x: 12, w: 456, h: 58, y0: 62, gap: 8 } : { x: 36, w: 470, h: 56, y0: 62, gap: 10 };
  const ocRect = (pos) => ({ x: OC.x, y: OC.y0 + pos * (OC.h + OC.gap), w: OC.w, h: OC.h });
  function drawOrder(t) {
    const ps = S.ps;
    T(14, 26, '⏱️ 2분 발표 순서 정하기', PHONE ? 15 : 17, INK, 'left', 800);
    TALK_SHOW.forEach((ti, pos) => {
      const r = ocRect(pos), num = ps.seq.indexOf(ti), on = num >= 0;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? '#f3edff' : '#fff'; ctx.fill(); }, { blur: on ? 8 : 4, y: 2 });
      ctx.strokeStyle = on ? PUR : '#d6dcea'; ctx.lineWidth = on ? 2.6 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (on) { D.sphere(r.x + 28, r.y + r.h / 2, 16, PUR, { text: String(num + 1), textScale: 1.0 }); } else { ctx.strokeStyle = '#c8d0df'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(r.x + 28, r.y + r.h / 2, 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      const lines = wrap(TALK[ti].t, r.w - 130, 14.5, 800);
      lines.slice(0, 2).forEach((l, k) => T(r.x + 54, r.y + r.h / 2 + 5 - (lines.length > 1 ? 9 : 0) + k * 18, l, 14.5, INK, 'left', 800));
      D.label(r.x + r.w - 12, r.y + r.h / 2, TALK[ti].s + '초', { bg: on ? PUR : '#8a95a6', size: 13, align: 'right' });
    });
    // 시간표 막대
    const bx = PHONE ? 14 : 36, bw = PHONE ? VW - 28 : 470, by = PHONE ? OC.y0 + 5 * (OC.h + OC.gap) + 22 : OC.y0 + 5 * (OC.h + OC.gap) + 22;
    T(bx, by - 6, '발표 시간표 (합계 ' + TALK_TOTAL + '초 = 2분)', 13.5, MUTED, 'left', 800);
    D.roundRect(bx, by, bw, 26, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    let acc = 0;
    ctx.save(); D.roundRect(bx, by, bw, 26, 8); ctx.clip();
    const cols = ['#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];
    ps.seq.forEach((ti, i) => { const w = bw * TALK[ti].s / TALK_TOTAL; ctx.fillStyle = cols[i % 5]; ctx.fillRect(bx + acc, by, w - 1.5, 26); T(bx + acc + w / 2, by + 18, String(i + 1), 13, '#fff', 'center', 800); acc += w; });
    ctx.restore();
    // 링 (진행)
    const secs = ps.seq.reduce((s, ti) => s + TALK[ti].s, 0);
    ps.seqAnim.r = SciSim.approach(ps.seqAnim.r, secs / TALK_TOTAL, 1 / 60, 8);
    const rx = PHONE ? VW / 2 : 650, ry = PHONE ? by + 120 : 220, rr = PHONE ? 62 : 74;
    ctx.strokeStyle = '#e4e8f1'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = PUR; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(ps.seqAnim.r, 0, 1)); ctx.stroke(); ctx.lineCap = 'butt';
    T(rx, ry + 2, secs + '초', PHONE ? 28 : 32, INK, 'center', 800); T(rx, ry + 26, '/ ' + TALK_TOTAL + '초', 14, MUTED, 'center', 800);
    if (!PHONE) { T(rx, 400 + (RM ? 0 : Math.sin(S.t * 2) * 4), '🎤', 52, '#000', 'center', 700); T(rx, ry - rr - 18, '정한 발표 시간', 14, INK, 'center', 800); const okk = orderOK(); T(rx, ry + rr + 34, okk ? '✅ 순서가 알맞아요' : ps.seq.length === 5 ? '🤔 순서를 다시 생각해요' : '카드를 눌러 순서대로', 14, okk ? '#14803f' : MUTED, 'center', 800); }
  }
  const orderOK = () => S.ps.seq.length === 5 && S.ps.seq.every((v, i) => v === i);
  function orderTap(p) {
    for (let pos = 0; pos < 5; pos++) {
      const r = ocRect(pos);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const ti = TALK_SHOW[pos], n = S.ps.seq.indexOf(ti);
        if (n >= 0) { S.ps.seq.length = n; Sound.click(); } else { S.ps.seq.push(ti); Sound.click(); parts.burst(r.x + 28, r.y + r.h / 2, { count: 6, speed: 70, size: 2.4, colors: [PUR, '#fff'], gravity: 0 }); }
        return;
      }
    }
  }
  $$('#psView button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sub = b.dataset.v; S.fade = 0.5; updateCtl(); }));
  $('#psCase').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.ps.cs = +b.dataset.v; const nx = S.ps.done[S.ps.cs].findIndex((v) => !v); S.ps.cell = nx >= 0 ? nx : 0; updateCtl(); });
  $('#psCell').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.ps.cell = +b.dataset.v; updateCtl(); });
  $('#bOrderClear').addEventListener('click', () => { Sound.click(); S.ps.seq = []; });
  $('#bTrayReset').addEventListener('click', () => { Sound.click(); if (S.cs.sel >= 0) S.cs.fill[S.cs.sel] = [-1, -1, -1, -1]; updateCtl(); });

  /* ================= ④ 왜 배울까 ================= */
  const WP = PHONE ? { x: 12, w: 170, h: 58, y0: 62, gap: 22 } : { x: 40, w: 230, h: 54, y0: 66, gap: 16 };
  const WC = PHONE ? { x: 298, w: 170, h: 64, y0: 66, gap: 40 } : { x: 530, w: 230, h: 62, y0: 72, gap: 28 };
  const pRect = (i) => ({ x: WP.x, y: WP.y0 + i * (WP.h + WP.gap), w: WP.w, h: WP.h });
  const cRect = (i) => ({ x: WC.x, y: WC.y0 + i * (WC.h + WC.gap), w: WC.w, h: WC.h });
  const WBY = PHONE ? 470 : 418;
  const linkKey = (p, c) => PROBS[p].id + '-' + CONCS[c].id;
  const linkedTo = (p) => S.wy.links.filter((l) => l.p === p);
  function wyTap(p) {
    const wy = S.wy;
    for (let i = 0; i < 5; i++) { const r = pRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { wy.selP = wy.selP === i ? -1 : i; Sound.click(); wyTry(); return; } }
    for (let i = 0; i < 4; i++) { const r = cRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { wy.selC = wy.selC === i ? -1 : i; Sound.click(); wyTry(); return; } }
  }
  function wyTry() {
    const wy = S.wy; if (wy.selP < 0 || wy.selC < 0) return;
    const p = wy.selP, c = wy.selC, key = linkKey(p, c);
    if (wy.links.some((l) => l.p === p && l.c === c)) { wy.links = wy.links.filter((l) => !(l.p === p && l.c === c)); wy.msg = '연결을 지웠어요.'; wy.selP = wy.selC = -1; Sound.click(); updateCtl(); return; }
    if (LINKS[key]) {
      const l = { p, c, prog: 0, key }; wy.links.push(l); wy.msg = PROBS[p].n + ' ↔ ' + concName(CONCS[c].id) + ': ' + LINKS[key];
      SciSim.tween(l, { prog: 1 }, { duration: 0.6, ease: 'outCubic' }); Sound.success();
      const a = pRect(p), b = cRect(c); parts.burst((a.x + a.w + b.x) / 2, (a.y + b.y) / 2 + 28, { count: 10, speed: 110, size: 3, colors: [PUR, '#ffb400', '#fff'], gravity: 0 });
    } else {
      wy.msg = '아직 ' + josa(PROBS[p].n, '과', '와') + ' ' + josa(concName(CONCS[c].id), '은', '는') + ' 바로 이어 보기 어려워요. 다른 개념과 이어 보세요.'; Sound.fail(); wy.shake = 0.45; wy.shakeNode = 'p' + p + 'c' + c;
      showHint('이 둘은 이번에는 이어지지 않아요. 다른 개념을 골라 보세요.', 3200);
    }
    wy.selP = wy.selC = -1; updateCtl();
  }
  function whyReady() {
    const wy = S.wy;
    for (let i = 0; i < 5; i++) if (!linkedTo(i).length) return '아직 이어지지 않은 문제가 있어요: ' + PROBS.filter((_, k) => !linkedTo(k).length).map((q) => q.n).join(', ');
    if (wy.pick < 0) return '"내가 풀고 싶은 문제"를 하나 골라 주세요.';
    if (linkedTo(wy.pick).length < 2) return PROBS[wy.pick].n + ' 문제에는 필요한 개념을 2개 이어 보세요. (지금 ' + linkedTo(wy.pick).length + '개)';
    return true;
  }
  function drawWhy(t) {
    const wy = S.wy;
    T(14, 26, '🧭 인류의 문제와 화학 개념 지도', PHONE ? 15 : 17, INK, 'left', 800);
    T(PHONE ? 14 : 14, 46, PHONE ? '' : '문제와 개념을 차례로 눌러 선으로 이어요', 13.5, MUTED, 'left', 700);
    // 선
    wy.links.forEach((l) => {
      const a = pRect(l.p), b = cRect(l.c), x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, mx = (x1 + x2) / 2;
      ctx.save(); ctx.strokeStyle = l.p === wy.pick ? '#f59e0b' : PUR; ctx.lineWidth = l.p === wy.pick ? 5 : 4; ctx.lineCap = 'round';
      ctx.beginPath(); const N = 30, n = Math.max(1, Math.round(N * l.prog));
      for (let i = 0; i <= n; i++) { const u = i / N, v = 1 - u; const x = v * v * v * x1 + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * x2, y = v * v * v * y1 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
    });
    PROBS.forEach((q, i) => {
      const r = pRect(i), sel = wy.selP === i, pick = wy.pick === i, sh = wy.shake > 0 && wy.shakeNode.startsWith('p' + i + 'c') ? Math.sin(t * 70) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = pick ? '#fff7e0' : '#fff'; ctx.fill(); }, { blur: sel ? 12 : 5, y: 2 });
      ctx.strokeStyle = sel ? PUR : pick ? '#f59e0b' : '#d6dcea'; ctx.lineWidth = sel || pick ? 3.2 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      T(r.x + 30, r.y + r.h / 2 + 9, q.ic, 26, '#000', 'center', 700); T(r.x + 56, r.y + r.h / 2 + 6, q.n, 17, INK, 'left', 800);
      if (pick) { if (PHONE) T(r.x + r.w - 14, r.y + 22, '⭐', 16, '#b45309', 'right', 800); else D.label(r.x + r.w - 10, r.y + 14, '풀고 싶은 문제', { bg: '#f59e0b', size: 13, align: 'right' }); }
      T(r.x + r.w - 14, r.y + r.h - 9, linkedTo(i).length + '개', 13, MUTED, 'right', 800);
      ctx.restore();
    });
    CONCS.forEach((q, i) => {
      const r = cRect(i), sel = wy.selC === i, sh = wy.shake > 0 && wy.shakeNode.endsWith('c' + i) ? Math.sin(t * 70) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = '#f3edff'; ctx.fill(); }, { blur: sel ? 12 : 5, y: 2 });
      ctx.strokeStyle = sel ? PUR : '#cdbdf5'; ctx.lineWidth = sel ? 3.2 : 1.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
      T(r.x + 28, r.y + r.h / 2 + 9, q.ic, 24, '#000', 'center', 700); T(r.x + 52, r.y + 26, q.n, 17, '#4c1d95', 'left', 800); T(r.x + 52, r.y + 46, q.sub, 13, MUTED, 'left', 700);
      ctx.restore();
    });
    // 아래 패널
    const bh = VH - WBY - 8; panel(8, WBY, VW - 16, bh, 14);
    T(22, WBY + 26, '🔎 이어 본 이유', 14, INK, 'left', 800);
    if (wy.msg) textBlock(22, WBY + 50, VW - 44, wy.msg, 14, '#5b21b6', 19, 800); else textBlock(22, WBY + 50, VW - 44, '문제 하나와 개념 하나를 차례로 눌러요.', 14, MUTED, 19, 700);
    let yy = WBY + 50 + (wy.msg ? wrap(wy.msg, VW - 44, 14, 800).length * 19 : 19) + 12;
    if (wy.pick >= 0) {
      const ls = linkedTo(wy.pick);
      T(22, yy, '⭐ 내가 풀고 싶은 문제: ' + PROBS[wy.pick].ic + ' ' + PROBS[wy.pick].n, 14, '#b45309', 'left', 800); yy += 22;
      T(22, yy, '필요한 화학 개념: ' + (ls.length ? ls.map((l) => concName(CONCS[l.c].id)).join(' · ') : '아직 없어요'), 14, INK, 'left', 800); yy += 30;
    }
    if (PHONE) {
      for (let i = wy.links.length - 1; i >= 0 && yy < VH - 30; i--) { const l = wy.links[i]; yy += textBlock(22, yy, VW - 44, '· ' + PROBS[l.p].n + ' ↔ ' + concName(CONCS[l.c].id) + ': ' + LINKS[l.key], 13, MUTED, 17, 700) + 6; }
    }
  }
  $('#whyPick').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Sound.click(); S.wy.pick = S.wy.pick === +b.dataset.v ? -1 : +b.dataset.v; updateCtl(); });
  $('#bWhyClear').addEventListener('click', () => { Sound.click(); S.wy.links = []; S.wy.msg = ''; S.wy.selP = S.wy.selC = -1; });

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'day') return dayDown(p);
      if (S.mode === 'cases') return csDown(p);
      if (S.mode === 'poster' && S.sub === 'order') { orderTap(p); return false; }
      if (S.mode === 'why') { wyTap(p); return false; }
      return false;
    },
    move(p) { if (S.mode === 'day') dayMove(p); else if (S.mode === 'cases') csMove(p); },
    up(p) { if (S.mode === 'day') dayUp(p); else if (S.mode === 'cases') csUp(p); },
    hover(p) {
      if (S.mode === 'day') return 'grab';
      if (S.mode === 'cases') return CASES.some((_, i) => { const r = cardRect(i); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) ? 'pointer' : 'default';
      return S.mode === 'why' || (S.mode === 'poster' && S.sub === 'order') ? 'pointer' : 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'day') {
      const q = ITEMS.find((i) => i.id === S.day.last);
      L1 = '찾은 화학 제품'; a = foundN() + ' / ' + ITEMS.length + '개';
      L2 = '마지막으로 찾은 것'; b = q ? q.name : '아직 없어요';
      L3 = '흑백으로 가린 정도'; c = Math.round(S.day.wipeT * 100) + ' %';
    } else if (S.mode === 'cases') {
      L1 = '조사한 사례'; a = openedN() + ' / ' + CASES.length + '장';
      L2 = '고른 사례'; b = S.cs.sel >= 0 ? CASES[S.cs.sel].icon + ' ' + CASES[S.cs.sel].name : '카드를 눌러요';
      L3 = '조사 노트 표'; c = S.cs.sel >= 0 ? filledN(S.cs.sel) + ' / 4칸' + (tableOK(S.cs.sel) ? ' · 완성' : '') : '—';
    } else if (S.mode === 'poster') {
      const k = S.ps.cs;
      if (S.sub === 'poster') {
        L1 = '발표할 사례'; a = CASES[k].icon + ' ' + CASES[k].name;
        L2 = '완성한 포스터 칸'; b = S.ps.done[k].filter(Boolean).length + ' / 5칸';
        L3 = '지금 고른 칸'; c = CELLS[S.ps.cell].n;
      } else {
        const secs = S.ps.seq.reduce((s, ti) => s + TALK[ti].s, 0);
        L1 = '순서를 정한 카드'; a = S.ps.seq.length + ' / 5장';
        L2 = '발표 시간 합계'; b = secs + ' / ' + TALK_TOTAL + '초';
        L3 = '순서 판정'; c = orderOK() ? '알맞아요' : S.ps.seq.length === 5 ? '다시 생각해요' : '정하는 중';
      }
    } else {
      const wy = S.wy;
      L1 = '이은 선'; a = wy.links.length + '개';
      L2 = '이어진 문제'; b = PROBS.filter((_, i) => linkedTo(i).length).length + ' / 5개';
      L3 = '내가 풀고 싶은 문제'; c = wy.pick >= 0 ? PROBS[wy.pick].ic + ' ' + PROBS[wy.pick].n + ' (' + linkedTo(wy.pick).length + '개 이음)' : '아직 안 골랐어요';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '일상 속 화학: 하루 속 화학 제품', short: '일상 속 화학', icon: '🏠', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 화학이 없었다면 우리의 하루는 어떻게 달라졌을까? 우리는 왜 화학을 배울까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 우리 주변의 물질이 원소와 화합물로 이루어져 있고, 새로운 물질이 화학 반응으로 만들어진다는 것을 배웠어요. 이제 그 화학이 <b>우리 하루 어디에 숨어 있는지</b> 찾아봐요.</div>' +
        '<p>아침부터 낮까지 하루 장면을 살펴보며 <b>화학 제품 8개</b>를 찾아요. 흑백 가리개를 밀어 <b>화학 제품이 없는 하루</b>와 비교해 보세요.</p>',
      features: ['day'],
      setup() { S.gate = ''; setScene('day'); },
      recap: '화학은 실험실 안에만 있는 것이 아니에요. 음식, 비누, 약, 옷, 전지, 물병, 수돗물까지 우리 하루는 화학으로 만든 물질과 제품으로 가득해요.',
      summary: '<ul><li>아침밥(질소 비료), 칫솔·치약, 비누, 감기약, 교복(합성 섬유), 스마트폰(리튬 이온 전지), 물병(고분자), 수돗물(염소 소독) 모두 <b>화학</b>이 만든 것이에요.</li><li>화학 제품이 없는 하루는 흑백처럼 비어 있어요. 화학은 우리 생활 곳곳에서 쓰이는 지식이에요.</li></ul>',
      missions: [
        {
          title: '하루 속 화학 제품 8개 찾기',
          goal: '하루 장면에서 <b>화학 제품 8개</b>를 눌러 찾으세요. 화면을 옆으로 밀면 하루가 흘러가요.',
          hint: '집 안(아침밥 · 칫솔 · 비누 · 약)과 학교 가는 길(교복 · 스마트폰 · 물병 · 수돗물)을 모두 살펴보세요. 반짝이는 물건을 눌러요.',
          setup() { setScene('day'); },
          check: () => foundN() >= ITEMS.length, hold: 0.5,
          status: () => '찾은 제품 ' + foundN() + ' / ' + ITEMS.length + ' &nbsp; ' + ITEMS.map((q) => (S.day.found[q.id] ? '✅' : '⬜')).join(''),
          explain: '아침밥을 짓는 쌀의 비료, 치약의 불소 화합물, 비누의 계면 활성제, 약, 합성 섬유, 리튬 이온 전지, 고분자 물병, 염소 소독 수돗물 모두 <b>화학</b>이 만들었어요. 흑백 쪽에는 이런 제품이 사라져 비어 있어요.',
        },
        {
          type: 'quiz', title: '화학은 어디에서 쓰일까?',
          goal: '"화학은 실험실 안에서만 쓰이는 지식이다." 이 말에 대한 설명으로 알맞은 것은?',
          setup() { setScene('day'); },
          choices: ['맞아요. 화학 제품은 실험실에서만 만들고 쓰기 때문이에요.', '틀려요. 음식, 옷, 약, 전지처럼 일상 속 물질과 제품에 화학이 쓰여요.', '맞아요. 일상 속 물건은 화학과 관계가 없어요.', '틀려요. 화학 제품은 공장에서만 볼 수 있어요.'],
          answer: 1,
          feedback: ['방금 하루 속에서 찾은 제품들은 실험실이 아닌 집과 학교 가는 길에 있었어요.', '', '칫솔, 비누, 약, 옷, 스마트폰 모두 화학으로 만든 물질이 들어 있어요.', '공장에서 만든 제품은 집과 학교 가는 길에서 우리가 직접 쓰고 있어요. 화학 제품은 일상 어디에나 있어요.'],
          explain: '화학은 <b>물질을 이해하고 새로운 물질을 만드는 학문</b>이라서 음식, 옷, 약, 전지, 물까지 일상 곳곳에 쓰여요.',
        },
      ],
    },
    {
      title: '사례 조사: 화학이 풀어 온 문제들', short: '사례 조사', icon: '🔎', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 하루 속 화학 제품 8개를 찾았어요. 그 제품들은 모두 <b>어떤 문제를 풀려고</b> 만들어졌을까요?</div>' +
        '<p>사례 카드 6장 가운데 <b>3장 이상</b>을 뒤집어 조사해요. 사례마다 <b>문제 → 화학의 해결 → 성과 → 한계</b>를 함께 살펴보면 화학이 사회에 어떤 책임을 지는지도 알 수 있어요.</p>',
      features: ['cases'],
      setup() { S.gate = ''; setScene('cases'); },
      recap: '화학은 식량, 의약, 에너지, 소재, 환경, 위생 문제를 풀어 왔어요. 그리고 모든 사례에는 성과와 함께 한계·부작용이 있어서 책임 있게 사용해야 해요.',
      summary: '<ul><li>식량: 하버–보슈법(N<sub>2</sub> + 3H<sub>2</sub> → 2NH<sub>3</sub>)으로 비료 대량 생산 / 한계: 부영양화</li><li>의약: 아스피린 합성 / 한계: 위 자극 등 부작용</li><li>에너지: 리튬 이온 전지 / 한계: 폐전지 재활용</li><li>소재: 나일론 같은 고분자 / 한계: 폐플라스틱</li><li>환경: CFC 규제와 대체 물질 / 화학이 문제를 일으키고 또 해결했어요.</li><li>위생: 염소 소독 / 한계: 소독 부산물 관리</li></ul>',
      missions: [
        {
          title: '사례 카드 3장 조사하기',
          goal: '사례 카드 <b>3장 이상</b>을 눌러 뒤집으세요. 카드를 누르면 아래 조사 노트에 사례가 나타나요.',
          hint: '카드를 누르면 뒤집혀요. 하버–보슈법과 CFC 카드는 입자가 반응하는 모습도 볼 수 있어요.',
          setup() { setScene('cases'); },
          check: () => openedN() >= 3, hold: 0.5,
          status: () => '조사한 카드 ' + openedN() + ' / 3 &nbsp; ' + CASES.map((c, i) => (S.cs.opened[i] ? c.icon : '⬜')).join(' '),
          explain: '식량(질소와 수소가 암모니아로)과 환경(염소 원자가 오존을 분해)은 <b>입자가 바뀌는 모습</b>으로도 이해할 수 있어요. 화학은 눈에 보이지 않는 입자의 변화를 설명해서 문제를 풀어요.',
        },
        {
          title: '조사 노트 표 완성하기', manual: true,
          goal: '조사한 사례를 하나 골라, 카드 5장 중 알맞은 <b>4장</b>을 <b>문제 → 화학의 해결 → 성과 → 한계</b> 칸에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '문제는 "무엇이 필요했나", 해결은 "화학이 한 일", 성과는 "좋아진 점", 한계는 "조심할 점"이에요. 카드 하나는 다른 사례의 내용이라 필요 없어요.',
          setup() { if (S.cs.sel < 0) { const i = S.cs.opened.findIndex(Boolean); if (i >= 0) { S.cs.sel = i; ensurePos(i); } } setScene('cases'); },
          check() {
            const ci = S.cs.sel;
            if (ci < 0 || !S.cs.opened[ci]) return '먼저 카드를 눌러 사례를 조사해요.';
            const f = S.cs.fill[ci], n = filledN(ci);
            if (n < 4) return '아직 표가 다 채워지지 않았어요. (' + n + ' / 4칸)';
            const bad = f.map((c, r) => (c === r ? -1 : r)).filter((r) => r >= 0);
            if (bad.length) return '"' + ROWS[bad[0]].n + '" 칸의 카드를 다시 확인해 보세요. 이 사례의 내용이 맞는지 살펴요.';
            return true;
          },
          status: () => (S.cs.sel >= 0 ? CASES[S.cs.sel].icon + ' ' + CASES[S.cs.sel].name + ': ' + filledN(S.cs.sel) + ' / 4칸 채움' : '조사할 카드를 눌러요'),
          explain: '한 사례를 <b>문제 → 화학의 해결 → 성과 → 한계</b>로 정리하면 화학이 왜 필요했고, 어떤 점을 조심해야 하는지 한눈에 보여요.',
        },
        {
          type: 'quiz', title: 'CFC 사례에서 화학의 역할',
          goal: 'CFC 사례에서 화학의 역할을 가장 알맞게 설명한 것은?',
          setup() { setScene('cases'); const i = 4; if (!S.cs.opened[i]) openCard(i); else { S.cs.sel = i; ensurePos(i); S.cs.t = 0; updateCtl(); } },
          choices: ['CFC는 처음부터 해로운 물질이라 만들면 안 되는 물질이었어요.', '화학이 편리한 냉매 CFC를 만들었지만, 오존층 파괴의 원인을 밝히고 규제와 대체 물질을 만든 것도 화학이었어요.', '오존층 문제는 화학과 관계없는 자연 현상이에요.', '규제 이후에는 화학이 더 이상 필요하지 않게 됐어요.'],
          answer: 1,
          feedback: ['CFC는 처음에는 안전한 냉매로 쓰였어요. 나중에 오존층을 파괴한다는 사실이 밝혀졌어요.', '', 'CFC에서 떨어진 염소가 오존을 분해하는 화학 반응이 원인이었어요.', '대체 물질을 개발하고 환경 영향을 따지는 데에도 화학이 계속 필요해요.'],
          explain: '화학은 문제의 <b>원인이 되기도</b> 하고 <b>해결책이 되기도</b> 해요. 그래서 새 물질을 만들 때 환경과 사회에 미칠 영향을 미리 따져 보는 책임이 필요해요.',
        },
      ],
    },
    {
      title: '발표 준비: 포스터와 2분 발표', short: '발표 준비', icon: '🖼️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사례를 조사해 표로 정리했어요. 이제 친구들 앞에서 <b>발표</b>할 차례예요.</div>' +
        '<p>사례 하나를 골라 <b>한 장 포스터</b>(제목 · 핵심 물질 · 사회적 영향 · 한계 · 친구에게 던질 질문)를 완성하고, <b>2분 발표</b>의 순서를 정해요.</p>',
      features: ['poster'],
      setup() { S.gate = ''; S.sub = 'poster'; setScene('poster'); },
      recap: '조사한 사례는 포스터 한 장으로 정리하고, 문제 → 해결 → 성과 → 한계 → 질문 순서로 발표해요. 믿을 만한 자료는 출처가 분명하고 연도와 수치를 확인할 수 있어야 해요.',
      summary: '<ul><li>포스터 5칸: 제목 · 핵심 물질 · 사회적 영향 · 한계 · 친구에게 던질 질문</li><li>2분 발표 순서: 인사(10초) → 문제 상황(30초) → 해결과 성과(40초) → 한계와 할 일(20초) → 질문(20초)</li><li>믿을 만한 조사: 출처가 분명한 자료를 쓰고, 연도와 수치를 확인해요.</li></ul>',
      missions: [
        {
          title: '포스터 5칸 완성하기', manual: true,
          goal: '발표할 사례를 하나 고르고 포스터의 <b>5칸</b>(제목 · 핵심 물질 · 사회적 영향 · 한계 · 질문)을 모두 채운 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '오른쪽에서 칸을 고르면 알맞은 내용 4개가 나와요. 이 사례의 내용을 골라 보세요. 맞으면 도장이 찍혀요.',
          setup() { S.sub = 'poster'; setScene('poster'); },
          check() {
            const k = S.ps.cs, n = S.ps.done[k].filter(Boolean).length;
            if (n < 5) return '아직 비어 있는 칸이 있어요. (' + n + ' / 5칸)';
            return true;
          },
          status: () => CASES[S.ps.cs].icon + ' ' + CASES[S.ps.cs].name + ': ' + S.ps.done[S.ps.cs].filter(Boolean).length + ' / 5칸 &nbsp; ' + CELLS.map((c, i) => mark(S.ps.done[S.ps.cs][i])).join(''),
          explain: '포스터에는 <b>핵심 물질</b>, 사회적 <b>영향</b>, <b>한계</b>, 친구에게 던질 <b>질문</b>이 모두 들어가야 해요. 성과만이 아니라 한계까지 함께 말하면 더 균형 있는 발표가 돼요.',
        },
        {
          title: '2분 발표 순서 정하기',
          goal: '발표 카드 5장을 <b>발표하는 순서대로</b> 하나씩 눌러서 번호를 붙이세요. 합계가 <b>120초(2분)</b>가 돼요.',
          hint: '인사로 시작해서 문제 상황 → 화학의 해결과 성과 → 한계 → 질문 순서로 이야기해요.',
          setup() { S.sub = 'order'; S.ps.seq = []; setScene('poster'); },
          check: () => orderOK(), hold: 0.6,
          status: () => '순서를 정한 카드 ' + S.ps.seq.length + ' / 5 &nbsp; ' + S.ps.seq.map((ti) => TALK[ti].s + '초').join(' → '),
          explain: '발표는 <b>인사 → 문제 → 해결과 성과 → 한계 → 질문</b> 순서로 말하면 듣는 사람이 따라가기 쉬워요. 10 + 30 + 40 + 20 + 20 = <b>120초</b>, 즉 2분이에요.',
        },
        {
          type: 'quiz', title: '믿을 만한 조사 방법',
          goal: '발표 자료를 만들 때 가장 믿을 만한 조사 방법은?',
          setup() { S.sub = 'poster'; setScene('poster'); },
          choices: ['친구에게 들은 이야기를 그대로 적는다.', '출처가 분명한 자료를 찾고 연도와 수치를 확인한다.', '가장 눈에 띄는 광고 문구를 가져온다.', '내용이 재미있으면 출처 없이 쓴다.'],
          answer: 1,
          feedback: ['들은 이야기는 틀릴 수 있어요. 원래 자료를 찾아 확인해야 해요.', '', '광고는 제품을 팔려는 목적이 있어서 과장될 수 있어요.', '출처가 없으면 사실인지 확인할 수 없어요.'],
          explain: '믿을 만한 조사는 <b>출처가 분명한 자료</b>를 쓰고, <b>연도와 수치</b>를 확인하는 거예요. 같은 내용을 여러 자료에서 확인하면 더 믿을 수 있어요.',
        },
      ],
    },
    {
      title: '왜 배울까: 문제와 화학 개념 잇기', short: '왜 배울까', icon: '🧭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화학이 풀어 온 문제와 그 한계를 발표로 정리했어요. 앞으로 우리가 풀어 갈 문제에는 <b>어떤 화학 개념</b>이 필요할까요?</div>' +
        '<p>인류의 문제(식량 · 건강 · 에너지 · 환경 · 소재)와 앞으로 배울 개념(<b>몰 · 화학 결합 · 화학 평형 · 산과 염기</b>)을 선으로 이어 보고, <b>내가 풀고 싶은 문제</b> 하나에 필요한 개념 2개를 골라요.</p>',
      features: ['why'],
      setup() { S.gate = ''; setScene('why'); },
      recap: '식량, 건강, 에너지, 환경, 소재 문제를 풀려면 몰, 화학 결합, 화학 평형, 산과 염기 같은 화학 개념이 필요해요. 그 첫걸음이 물질의 양을 세는 단위, 몰이에요.',
      summary: '<ul><li>문제와 개념 이음 예: 식량–몰 · 화학 평형, 건강–산과 염기 · 화학 결합, 에너지–화학 결합 · 몰, 환경–산과 염기 · 화학 평형, 소재–화학 결합 · 몰</li><li>암모니아를 많이 만들려면 반응하는 질소와 수소의 <b>양</b>을 알아야 해요. 분자는 너무 작아서 낱개로 셀 수 없으니 묶음 단위인 <b>몰</b>이 필요해요. 다음 차시에서 만나요.</li></ul>',
      missions: [
        {
          title: '문제와 화학 개념 잇기', manual: true,
          goal: '<b>5가지 문제</b>를 각각 필요한 화학 개념과 이어요. 그리고 <b>내가 풀고 싶은 문제</b>를 하나 골라 개념을 <b>2개</b> 이은 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '문제 하나와 개념 하나를 차례로 눌러요. 이어지면 선이 그려지고 이유가 나와요. 식량은 "반응물의 양"과 "얼마나 만들어지나"를 생각해 보세요.',
          setup() { setScene('why'); },
          check: () => whyReady(),
          status: () => '이어진 문제 ' + PROBS.filter((_, i) => linkedTo(i).length).length + ' / 5 &nbsp; ' + (S.wy.pick >= 0 ? '⭐ ' + PROBS[S.wy.pick].n + ' 개념 ' + linkedTo(S.wy.pick).length + '개' : '⭐ 풀고 싶은 문제를 골라요'),
          explain: '하나의 문제에도 여러 화학 개념이 함께 쓰여요. 예를 들어 식량 문제는 필요한 양을 정하는 <b>몰</b>, 얼마나 만들어지는지 알려 주는 <b>화학 평형</b>이 필요해요.',
        },
        {
          type: 'quiz', title: '암모니아를 많이 만들려면?',
          goal: '비료의 원료인 암모니아를 많이 만들려면 반응하는 질소와 수소의 <b>양</b>을 알아야 해요. 그런데 분자는 너무 작아서 낱개로 셀 수 없어요. 이 문제를 풀어 줄 것은?',
          setup() { setScene('why'); },
          choices: ['분자를 하나씩 현미경으로 세는 방법', '많은 입자를 한 묶음으로 세는 단위인 몰(mol)', '눈으로 보고 어림하는 방법', '반응물의 양을 따지지 않는 방법'],
          answer: 1,
          feedback: ['분자는 현미경으로도 하나씩 세기 어렵고, 개수가 너무 많아요.', '', '어림하면 필요한 양을 정확히 알 수 없어요.', '반응하는 물질의 양을 모르면 원하는 만큼 만들 수 없어요.'],
          explain: '아주 작은 입자는 <b>묶음 단위</b>로 세어야 편리해요. 화학에서는 그 묶음을 <b>몰(mol)</b>이라고 해요. 다음 차시 "몰과 아보가드로 수"에서 배워요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-chem-society', mount: '#game', badge: '화학 탐험가', homeHref: '../../index.html#hc',
    featureLabels: { day: '🏠 하루 장면 · 흑백 가리개', cases: '🔎 사례 카드 6장 · 조사 노트', poster: '🖼️ 포스터 · 발표 순서', why: '🧭 문제–개념 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('day');
  updateCtl();
  function stepAll1(dt) {
    S.ps.shake = Math.max(0, S.ps.shake - dt); S.wy.shake = Math.max(0, S.wy.shake - dt);
    if (S.mode === 'day') stepDay(dt); else if (S.mode === 'cases') stepCases(dt);
  }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = '#f3f0fb'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'day') drawDay(t); else if (S.mode === 'cases') drawCases(t); else if (S.mode === 'poster') { if (S.sub === 'poster') drawPoster(t); else drawOrder(t); } else drawWhy(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, ITEMS, CASES, PROBS, CONCS, LINKS, TALK, TALK_SHOW, CELLS, ROWS, get game() { return game; },
    setScene, itemX, ICY, WTOP, WBOT, cardRect, slotRect, chipTarget, trayRect, optsFor, psPick, ocRect, pRect, cRect, orderOK, whyReady, tableOK, openCard, dayTap, wyTap, orderTap,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
