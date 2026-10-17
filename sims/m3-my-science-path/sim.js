/* =========================================================
   중3 Ⅷ. 과학과 나의 미래 — 나의 진로와 과학 학습 [9과23-02]
   ① [관찰] 나의 관심: 좋아하는 활동 8문항 → 관심 영역 레이더 차트 → 관심 직업 3개 고르기
   ② [탐구] 모든 직업 속 과학: 과학과 멀어 보이는 직업에 필요한 과학 분야 태그 붙이기
   ③ [설명] 고등학교 과학: 과목 지도(공통 → 일반 선택 → 진로 선택·융합 선택), 내 직업의 과목 경로 만들기
   ④ [적용] 학습 계획: 로드맵(중3 → 고1 → 고2·3 → 진로) 위에 학습 활동 카드를 놓아 계획 완성
   ※ 이름은 받지 않으며, 검사 결과와 계획은 이 기기(localStorage)에만 저장함.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const EZ = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const { rgba, mix, shade } = SciSim.color;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const JUA = '"Jua",' + FONT;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const fnt = (size, w, jua) => (jua ? size + 'px ' + JUA : (w || 700) + ' ' + size + 'px ' + FONT);
  const now = () => performance.now() / 1000;
  const TAU = Math.PI * 2;
  const BG = '#eef2f8';
  const INK = '#1b2333', MUTED = '#5b6b82';
  const SUBJ = '#64748b';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 계속 */ } },
  };

  /* =========================================================
     자료
     ========================================================= */
  const FIELDS = [
    { id: 'phys', name: '물리', color: '#2563eb' },
    { id: 'chem', name: '화학', color: '#8b5cf6' },
    { id: 'bio', name: '생명', color: '#16a34a' },
    { id: 'earth', name: '지구', color: '#0ea5e9' },
  ];
  const FIELD = {};
  FIELDS.forEach((f) => { FIELD[f.id] = f; });
  // 관심 영역(레이더 차트의 6개 축)
  const AXES = [
    { id: 'inq', name: '탐구' }, { id: 'make', name: '만들기' }, { id: 'care', name: '돌봄' },
    { id: 'express', name: '표현' }, { id: 'nature', name: '자연' }, { id: 'data', name: '자료 분석' },
  ];
  // 좋아하는 활동 8문항 (w: 영역별 가중치)
  const ACTS = [
    { icon: '🔬', text: '궁금한 것을 실험으로 확인해 보기', w: { inq: 2 } },
    { icon: '🛠️', text: '직접 무언가 만들고 고치기', w: { make: 2 } },
    { icon: '🤝', text: '아픈 사람이나 동물 돌보기', w: { care: 2 } },
    { icon: '🎨', text: '그림·음악·글로 생각 표현하기', w: { express: 2 } },
    { icon: '🌳', text: '산과 바다의 자연 관찰하기', w: { nature: 2 } },
    { icon: '📈', text: '표와 그래프로 자료 정리하기', w: { data: 2 } },
    { icon: '🧩', text: '어려운 문제의 규칙 찾기', w: { inq: 1, data: 1 } },
    { icon: '🌱', text: '식물·동물을 키우며 변화 기록하기', w: { nature: 1, care: 1 } },
  ];
  const RATE = [{ e: '😐', n: '별로' }, { e: '🙂', n: '좋아요' }, { e: '😍', n: '아주 좋아요' }];

  // 과학과 멀어 보이는 직업 10가지 (필요한 과학 분야 · 고등학교 과목 경로)
  const JOBS = [
    { id: 'arch', icon: '🏛️', name: '건축가', work: '사람이 살고 일하는 건물을 설계해요.', ax: { make: 2, express: 1, data: 1 }, tags: ['phys', 'earth'],
      why: { phys: '건물이 무너지지 않으려면 힘의 평형과 재료의 성질을 알아야 해요.', earth: '지진과 지반을 이해해야 안전한 건물을 설계할 수 있어요.' },
      path: ['integ1', 'phys', 'mech', 'earth', 'esys'], need: '건물이 받는 힘과 지진·지반을 이해하려면 물리학과 지구과학 계열 과목이 필요해요.', topic: '건축·구조', decoy: 'gene' },
    { id: 'forensic', icon: '🔍', name: '과학수사관', work: '사건 현장의 증거를 과학적으로 분석해요.', ax: { inq: 2, data: 1 }, tags: ['bio', 'chem'],
      why: { bio: '지문과 DNA처럼 생명체에서 나온 증거를 분석해요.', chem: '약물이나 섬유 같은 물질의 성분을 화학적으로 분석해요.' },
      path: ['integ1', 'chem', 'life', 'gene'], need: 'DNA와 물질을 분석하려면 화학과 생명과학 계열 과목이 필요해요.', topic: '증거 분석', decoy: 'astro' },
    { id: 'perfumer', icon: '🌸', name: '조향사', work: '여러 향 물질을 섞어 새로운 향기를 만들어요.', ax: { make: 1, express: 2, nature: 1 }, tags: ['chem'],
      why: { chem: '향을 내는 물질의 성질과 섞는 방법은 화학이에요.' },
      path: ['integ1', 'chem', 'matter'], need: '향 물질의 성질과 구조를 배우려면 화학 계열 과목이 필요해요.', topic: '향과 물질', decoy: 'esys' },
    { id: 'audio', icon: '🎧', name: '음향 엔지니어', work: '공연장과 녹음실의 소리를 설계하고 조절해요.', ax: { make: 2, express: 1, data: 1 }, tags: ['phys'],
      why: { phys: '소리는 파동이라서 진동수와 진폭을 이해해야 소리를 조절할 수 있어요.' },
      path: ['integ1', 'phys', 'em'], need: '소리와 전기 신호를 다루려면 물리학 계열 과목이 필요해요.', topic: '소리와 파동', decoy: 'react' },
    { id: 'light', icon: '💡', name: '무대 조명 디자이너', work: '빛의 색과 밝기로 무대 분위기를 만들어요.', ax: { express: 2, make: 1 }, tags: ['phys'],
      why: { phys: '빛의 합성과 색, 직진하는 빛의 성질을 이용해요.' },
      path: ['integ1', 'phys', 'em'], need: '빛과 전기를 다루려면 물리학 계열 과목이 필요해요.', topic: '빛과 색', decoy: 'gene' },
    { id: 'restorer', icon: '🖼️', name: '미술품 복원가', work: '오래되고 상한 그림과 문화재를 원래 모습으로 되살려요.', ax: { express: 2, inq: 1, make: 1 }, tags: ['chem', 'phys'],
      why: { chem: '물감과 종이의 성분이 시간이 지나며 어떻게 변하는지 알아야 해요.', phys: '빛과 열이 작품에 주는 영향을 알아야 해요.' },
      path: ['integ1', 'chem', 'phys', 'matter'], need: '재료의 성분과 빛의 영향을 이해하려면 화학과 물리학이 필요해요.', topic: '재료 보존', decoy: 'astro' },
    { id: 'sf', icon: '✍️', name: 'SF 작가', work: '과학 지식을 바탕으로 그럴듯한 미래 이야기를 써요.', ax: { express: 2, inq: 1 }, tags: ['phys', 'chem', 'bio', 'earth'],
      why: { phys: '우주선과 로봇이 움직이는 원리를 알아야 이야기가 그럴듯해요.', chem: '새로운 물질과 화학 반응을 상상하려면 기본 원리를 알아야 해요.', bio: '외계 생명체와 사람의 몸을 그럴듯하게 그리려면 생명 지식이 필요해요.', earth: '행성과 기후 같은 세계를 만들려면 지구·우주 지식이 필요해요.' },
      path: ['integ1', 'integ2', 'hist', 'conv'], need: 'SF는 모든 과학 분야를 폭넓게 알수록 쓰기 좋아요. 통합과학과 융합 선택 과목이 도움이 돼요.', topic: 'SF와 과학', decoy: null },
    { id: 'chef', icon: '🍳', name: '요리사', work: '재료를 굽고 끓여 맛있는 음식을 만들어요.', ax: { make: 2, express: 1, care: 1 }, tags: ['chem', 'phys'],
      why: { chem: '굽고 끓이면 음식 속 물질이 화학 변화를 일으켜요.', phys: '열이 어떻게 전달되는지 알아야 알맞게 익힐 수 있어요.' },
      path: ['integ1', 'chem', 'react'], need: '요리 속 화학 변화를 이해하려면 화학 계열 과목이 필요해요.', topic: '음식과 열', decoy: 'astro' },
    { id: 'sports', icon: '🏃', name: '스포츠 과학자', work: '선수의 움직임과 몸을 분석해 기록을 높여요.', ax: { care: 1, data: 2, inq: 1 }, tags: ['phys', 'bio'],
      why: { phys: '운동할 때의 힘, 속력, 에너지를 분석해요.', bio: '근육과 호흡 등 몸이 에너지를 쓰는 과정을 알아야 해요.' },
      path: ['integ1', 'phys', 'mech', 'life', 'cell'], need: '운동과 몸속 에너지를 이해하려면 물리학과 생명과학 계열 과목이 필요해요.', topic: '운동과 몸', decoy: 'esys' },
    { id: 'climatep', icon: '🌏', name: '기후 정책 담당자', work: '기후 자료를 바탕으로 환경을 지키는 정책을 세워요.', ax: { data: 2, nature: 1, care: 1 }, tags: ['earth'],
      why: { earth: '기후 자료와 지구 시스템을 이해해야 알맞은 정책을 세울 수 있어요.' },
      path: ['integ1', 'integ2', 'earth', 'esys', 'climate'], need: '기후와 지구 시스템을 이해하려면 지구과학 계열 과목이 필요해요.', topic: '기후와 환경', decoy: 'react' },
  ];
  const JOB = {};
  JOBS.forEach((j) => { JOB[j.id] = j; });
  const DEFAULT_JOBS = ['arch', 'forensic', 'perfumer', 'audio', 'sf', 'restorer', 'chef', 'sports', 'climatep', 'light'];

  // 2022 개정 고등학교 과학 과목
  const TIERS = [
    { id: 'common', name: '공통 과목', sub: '모든 학생', color: '#64748b', stage: '고1' },
    { id: 'general', name: '일반 선택', sub: '', color: '#2563eb', stage: '고2·3' },
    { id: 'career', name: '진로 선택', sub: '', color: '#7c3aed', stage: '고2·3' },
    { id: 'fusion', name: '융합 선택', sub: '', color: '#d97706', stage: '고2·3' },
  ];
  const TIER = {};
  TIERS.forEach((t) => { TIER[t.id] = t; });
  const SUBJECTS = [
    { id: 'integ1', name: '통합과학1', tier: 'common', about: '물질과 규칙성, 자연의 시스템 등 과학의 기본 개념을 통합적으로 배워요.' },
    { id: 'integ2', name: '통합과학2', tier: 'common', about: '환경과 에너지, 과학과 사회 이야기를 통합적으로 배워요.' },
    { id: 'exp1', name: '과학탐구실험1', tier: 'common', about: '실험을 설계하고 자료를 분석하는 탐구 활동 중심으로 배워요.' },
    { id: 'exp2', name: '과학탐구실험2', tier: 'common', about: '다양한 주제로 탐구 활동을 하며 과학적 탐구 능력을 길러요.' },
    { id: 'phys', name: '물리학', tier: 'general', about: '힘과 운동, 에너지, 전자기 등을 더 깊이 배워요.' },
    { id: 'chem', name: '화학', tier: 'general', about: '물질의 구조와 성질, 화학 반응을 더 깊이 배워요.' },
    { id: 'life', name: '생명과학', tier: 'general', about: '세포, 유전, 생태계 등 생명 현상을 더 깊이 배워요.' },
    { id: 'earth', name: '지구과학', tier: 'general', about: '지구와 우주, 기후 등을 더 깊이 배워요.' },
    { id: 'mech', name: '역학과 에너지', tier: 'career', parent: 'phys', about: '힘과 운동, 에너지를 더 자세히 다뤄요.' },
    { id: 'em', name: '전자기와 양자', tier: 'career', parent: 'phys', about: '전기·자기와 빛, 양자의 세계를 배워요.' },
    { id: 'matter', name: '물질과 에너지', tier: 'career', parent: 'chem', about: '물질의 구조와 에너지 변화를 깊이 배워요.' },
    { id: 'react', name: '화학 반응의 세계', tier: 'career', parent: 'chem', about: '화학 반응의 규칙과 쓰임을 배워요.' },
    { id: 'cell', name: '세포와 물질대사', tier: 'career', parent: 'life', about: '세포와 몸속 에너지 변환(물질대사)을 배워요.' },
    { id: 'gene', name: '생물의 유전', tier: 'career', parent: 'life', about: '유전의 원리와 DNA를 배워요.' },
    { id: 'esys', name: '지구시스템과학', tier: 'career', parent: 'earth', about: '지구의 각 권이 서로 영향을 주는 시스템을 배워요.' },
    { id: 'astro', name: '행성우주과학', tier: 'career', parent: 'earth', about: '행성과 우주를 탐구해요.' },
    { id: 'hist', name: '과학의 역사와 문화', tier: 'fusion', parent: 'integ2', about: '과학이 역사와 문화 속에서 발전해 온 과정을 배워요.' },
    { id: 'climate', name: '기후변화와 환경생태', tier: 'fusion', parent: 'integ2', about: '기후 변화와 환경, 생태계 문제를 융합적으로 배워요.' },
    { id: 'conv', name: '융합과학 탐구', tier: 'fusion', parent: 'integ2', about: '여러 과학 분야를 합쳐 주제를 탐구해요.' },
  ];
  const SUB = {};
  SUBJECTS.forEach((s) => { SUB[s.id] = s; });
  const EDGES = [];
  SUBJECTS.forEach((s) => {
    if (s.parent) EDGES.push([s.parent, s.id]);
    else if (s.tier === 'general') EDGES.push(['integ1', s.id]);
  });

  // 학습 로드맵의 단계와 활동 카드
  const STAGES = [
    { id: 'm3', name: '중3 (지금)', icon: '🏫' },
    { id: 'h1', name: '고1', icon: '🎒' },
    { id: 'h23', name: '고2·3', icon: '📚' },
  ];
  const ACTIVITY = [
    { id: 'book', icon: '📖', type: '독서', make: (j) => j.topic + ' 관련 과학 책 읽기' },
    { id: 'inq', icon: '🔬', type: '탐구 활동', make: (j) => j.topic + ' 탐구 보고서 쓰기' },
    { id: 'club', icon: '🧪', type: '동아리', make: (j) => j.topic + ' 동아리 활동' },
    { id: 'exp', icon: '🚌', type: '체험', make: (j) => j.name + ' 직업 체험·견학' },
  ];
  const stageOfSubject = (sid) => (SUB[sid].tier === 'common' ? 'h1' : 'h23');

  // 이 기기에만 저장되는 나의 선택 (이름은 받지 않음)
  const ME = { likes: ACTS.map(() => null), jobs: [], pathJob: null, planJob: null, saved: false };
  (function loadMe() {
    const v = store.get('m3-my-science-path:v1');
    if (!v) return;
    if (Array.isArray(v.likes) && v.likes.length === ACTS.length) ME.likes = v.likes.map((x) => (x === 0 || x === 1 || x === 2 ? x : null));
    if (Array.isArray(v.jobs)) ME.jobs = v.jobs.filter((id) => JOB[id]).slice(0, 3);
    if (v.pathJob && JOB[v.pathJob]) ME.pathJob = v.pathJob;
  })();
  const saveMe = () => store.set('m3-my-science-path:v1', { likes: ME.likes, jobs: ME.jobs, pathJob: ME.pathJob });
  const myJobs = () => (ME.jobs.length ? ME.jobs : DEFAULT_JOBS.slice(0, 3));
  // 레이더 값 (0~1)
  function axisValues() {
    return AXES.map((a) => {
      let s = 0, m = 0;
      ACTS.forEach((c, i) => { const w = c.w[a.id] || 0; if (!w) return; m += w * 2; s += w * (ME.likes[i] == null ? 0 : ME.likes[i]); });
      return m ? s / m : 0;
    });
  }
  function matchOf(job) {
    const v = axisValues();
    let s = 0, m = 0;
    AXES.forEach((a, i) => { const w = job.ax[a.id] || 0; s += w * v[i]; m += w; });
    return m ? s / m : 0;
  }
  const answered = () => ME.likes.filter((x) => x != null).length;
  /* =========================================================
     상태 · 무대
     ========================================================= */
  const S = { scene: 'interest', from: null, sceneP: 1, fb: null, rings: [], pops: [], hintAt: -99 };
  const SC = {};          // 장면 모음 { enter, layout, update, draw, down, move, up, hover }
  const PT = new SciSim.Particles();
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));

  const LAYS = { wide: { kind: 'wide', w: 800, h: 600 }, tall: { kind: 'tall', w: 480, h: 820 } };
  let view = null, ctx = null, D = null, LAY = null;
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  const handlers = {
    down: (p) => onDown(p), move: (p) => onMove(p), up: (p) => onUp(p), hover: (p) => onHover(p),
  };
  const isTall = () => LAY.kind === 'tall';
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    LAY = LAYS[kind];
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, background: BG, onResize: clearCaches });
    ctx = view.ctx;
    D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (kind === 'tall') {
      // 휴대폰: 카드를 잡은 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        const sc = SC[S.scene];
        if (tc && sc && sc.grab && sc.grab(view.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    clearCaches();
    Object.keys(SC).forEach((k) => SC[k].layout && SC[k].layout(true));
  }
  // 장면 안에서 쓰는 영역 계산용 단축
  const W = () => LAY.w, H = () => LAY.h;
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* =========================================================
     그리기 도우미 (캐시: 글자 줄바꿈 · 이모지 · 부드러운 그림자)
     ========================================================= */
  const WRAP = new Map();
  const EMO = new Map();
  const SHD = new Map();
  const LAYER = new Map();
  function clearCaches() { EMO.clear(); SHD.clear(); LAYER.clear(); }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { WRAP.clear(); });
  const kpx = () => view.scale * view.dpr;

  function rr(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function T(str, x, y, size, o) {
    o = o || {};
    if (o.fit) {
      ctx.font = fnt(size, o.w, o.jua);
      const tw = ctx.measureText(str).width;
      if (tw > o.fit) size = Math.max(11, size * o.fit / tw);
    }
    ctx.font = fnt(size, o.w, o.jua);
    ctx.textAlign = o.a || 'left';
    ctx.textBaseline = o.b || 'alphabetic';
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.c || '#1b2333';
    ctx.fillText(str, x, y);
  }
  function wrapLines(str, maxW, f) {
    const key = f + '|' + Math.round(maxW) + '|' + str;
    let lines = WRAP.get(key);
    if (lines) return lines;
    ctx.save();
    ctx.font = f;
    lines = [];
    let cur = '';
    str.split(' ').forEach((word) => {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW) { cur = test; return; }
      if (cur) lines.push(cur);
      if (ctx.measureText(word).width <= maxW) { cur = word; return; }
      let part = '';
      for (const ch of word) {
        if (ctx.measureText(part + ch).width > maxW && part) { lines.push(part); part = ch; } else part += ch;
      }
      cur = part;
    });
    if (cur) lines.push(cur);
    ctx.restore();
    WRAP.set(key, lines);
    return lines;
  }
  // 여러 줄 글: 높이를 돌려줌
  function para(str, x, y, maxW, size, o) {
    o = o || {};
    const f = fnt(size, o.w || 600, o.jua);
    const lines = wrapLines(str, maxW, f);
    const lh = o.lh || Math.round(size * 1.36);
    const n = o.max ? Math.min(o.max, lines.length) : lines.length;
    if (o.measure) return n * lh;
    ctx.font = f;
    ctx.fillStyle = o.c || '#1b2333';
    ctx.textAlign = o.a || 'left';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < n; i++) {
      let s = lines[i];
      if (o.max && i === n - 1 && lines.length > n) s = s.slice(0, Math.max(0, s.length - 1)) + '…';
      ctx.fillText(s, x, y + i * lh);
    }
    return n * lh;
  }
  function emo(ch, x, y, size, alpha) {
    const k = kpx();
    const px = Math.max(8, Math.round(size * k));
    const key = ch + '|' + px;
    let c = EMO.get(key);
    if (!c) {
      c = document.createElement('canvas');
      const pad = Math.ceil(px * 0.22);
      c.width = c.height = px + pad * 2;
      const g = c.getContext('2d');
      g.font = px + 'px ' + EMOJI_FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ch, c.width / 2, c.height / 2 + px * 0.05);
      c._s = c.width / k;
      EMO.set(key, c);
    }
    const s = c._s;
    if (alpha != null && alpha < 1) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * alpha; ctx.drawImage(c, x - s / 2, y - s / 2, s, s); ctx.globalAlpha = ga; }
    else ctx.drawImage(c, x - s / 2, y - s / 2, s, s);
  }
  // 미리 흐리게 만든 그림자 조각 (shadowBlur를 매 프레임 쓰지 않음)
  function shadowSprite(w, h, r, blur) {
    const k = kpx();
    const key = Math.round(w) + 'x' + Math.round(h) + '|' + r + '|' + blur + '|' + Math.round(k * 100);
    let c = SHD.get(key);
    if (!c) {
      const pad = blur * 1.6;
      c = document.createElement('canvas');
      c.width = Math.ceil((w + pad * 2) * k);
      c.height = Math.ceil((h + pad * 2) * k);
      const g = c.getContext('2d');
      g.shadowColor = 'rgba(20,40,80,1)';
      g.shadowBlur = blur * k;
      g.shadowOffsetX = 10000;
      g.fillStyle = '#000';
      const x0 = pad * k - 10000, y0 = pad * k, ww = w * k, hh = h * k, rad = Math.min(r * k, ww / 2, hh / 2);
      g.beginPath();
      g.moveTo(x0 + rad, y0); g.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, rad); g.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, rad);
      g.arcTo(x0, y0 + hh, x0, y0, rad); g.arcTo(x0, y0, x0 + ww, y0, rad); g.closePath(); g.fill();
      c._pad = pad;
      SHD.set(key, c);
    }
    return c;
  }
  function softShadow(x, y, w, h, r, lift, alpha) {
    const a = alpha != null ? alpha : 1;
    const ga = ctx.globalAlpha;
    const l = clamp(lift || 0, 0, 1);
    if (l < 0.99) {
      const c = shadowSprite(w, h, r, 14);
      ctx.globalAlpha = ga * 0.2 * a * (1 - l);
      ctx.drawImage(c, x - c._pad, y - c._pad + 5, w + c._pad * 2, h + c._pad * 2);
    }
    if (l > 0.01) {
      const c = shadowSprite(w, h, r, 22);
      ctx.globalAlpha = ga * 0.28 * a * l;
      ctx.drawImage(c, x - c._pad, y - c._pad + 10, w + c._pad * 2, h + c._pad * 2);
    }
    ctx.globalAlpha = ga;
  }
  function contact(x, y, rx, ry, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(20,40,80,' + (a != null ? a : 0.2) + ')');
    g.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function ellipse(x, y, rx, ry, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill(); }
  function lingrad(x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }
  // 둥근 말풍선 (꼬리: tx, ty)
  function bubble(x, y, w, h, tx, ty, o) {
    o = o || {};
    const r = o.r || 14;
    if (o.shadow !== false) softShadow(x, y, w, h, r, 0, 0.9);
    ctx.beginPath();
    rr(x, y, w, h, r);
    ctx.fillStyle = o.fill || '#fff';
    ctx.fill();
    if (tx != null) {
      const bx = clamp(tx, x + r + 6, x + w - r - 6);
      const up = ty < y;
      const by = up ? y : y + h;
      ctx.beginPath();
      ctx.moveTo(bx - 9, by); ctx.lineTo(tx, ty); ctx.lineTo(bx + 9, by); ctx.closePath();
      ctx.fill();
    }
    if (o.stroke) {
      ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2;
      rr(x, y, w, h, r); ctx.stroke();
    }
  }

  /* ---- 공용 그림 도구 ---- */
  function shk(t0) { const a = now() - t0; return a > 0.45 ? 0 : Math.sin(a * 46) * 6 * (1 - a / 0.45); }
  function card(x, y, w, h, o) {
    o = o || {};
    const r = o.r != null ? o.r : 14;
    if (o.shadow !== false) softShadow(x, y, w, h, r, o.lift || 0, o.alpha != null ? o.alpha : 1);
    ctx.beginPath(); rr(x, y, w, h, r);
    if (o.grad) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; }
    else ctx.fillStyle = o.fill || '#fff';
    ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
  }
  function chip(x, y, w, h, text, o) {
    o = o || {};
    ctx.beginPath(); rr(x, y, w, h, o.r != null ? o.r : h / 2);
    ctx.fillStyle = o.fill || '#fff'; ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
    if (text) T(text, x + w / 2, y + h / 2 + 5, o.size || 14, { a: 'center', c: o.c || INK, w: o.w || 800, fit: w - (o.pad != null ? o.pad : 14) });
  }
  function fx(x, y, colors) {
    S.rings.push({ x, y, t0: now() });
    PT.burst(x, y, { count: 12, colors: colors || ['#14a058', '#ffd34d', '#5eead4', '#a78bfa'], speed: 150, size: 3.6, gravity: 120 });
    Sound.tick();
  }
  function say(text, x, y, kind, dur) { S.fb = { text, x, y, kind: kind || 'good', t0: now(), dur: dur || 2.6 }; }
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 5000);
  }
  function badge(text, x, y, color) {
    ctx.font = fnt(12, 800);
    const tw = ctx.measureText(text).width + 14;
    chip(x - tw / 2, y - 10, tw, 20, text, { fill: color || '#7c3aed', c: '#fff', size: 12, pad: 6 });
  }
  // '예상' 표시: 이 차시의 미래 이야기는 모두 예상임을 알리는 작은 띠
  function forecastTag(x, y) {
    chip(x, y, 76, 24, '🔮 예상', { fill: '#fef3c7', stroke: '#f59e0b', c: '#92400e', size: 13, lw: 1.5 });
  }

  /* =========================================================
     장면 관리 · 입력
     ========================================================= */
  const SCENE_LABEL = { interest: "🧭 나의 관심 찾기", pick: "⭐ 관심 직업 고르기", tag: "🏷️ 직업 속 과학 태그", map: "🗺️ 고등학교 과학 과목 지도", road: "🛣️ 나의 학습 로드맵", plan: "📋 나의 과학 학습 계획 카드" };
  function setScene(name) {
    if (S.scene === name) { syncUI(); return; }
    S.from = S.scene; S.scene = name; S.sceneP = 0; S.fb = null;
    const sc = SC[name];
    sc.enter && sc.enter();
    SciSim.tween(S, { sceneP: 1 }, { duration: 0.45, ease: 'outCubic', onDone: () => { S.from = null; } });
    syncUI();
  }
  const curSc = () => SC[S.scene];
  function onDown(p) { if (S.sceneP < 1) return false; const sc = curSc(); return !!(sc.down && sc.down(p)); }
  function onMove(p) { const sc = curSc(); sc.move && sc.move(p); }
  function onUp(p) { const sc = curSc(); sc.up && sc.up(p); }
  function onHover(p) { if (S.sceneP < 1) return null; const sc = curSc(); return sc.hover ? sc.hover(p) : null; }

  /* =========================================================
     DOM 컨트롤
     ========================================================= */
  const ctrlCard = $('#ctrlCard'), sceneLabel = $('#sceneLabel'), tbReset = $('#tbReset');
  $$('#sceneGrid button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  tbReset.addEventListener('click', () => { Sound.click(); const sc = curSc(); sc.reset && sc.reset(); });
  function syncUI() {
    const free = !!(game && game.free);
    ctrlCard.hidden = !free;
    $$('#sceneGrid button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    sceneLabel.textContent = SCENE_LABEL[S.scene];
    const sc = curSc();
    const tb = sc.toolbar ? sc.toolbar() : {};
    tbReset.hidden = !tb.reset;
  }
  /* =========================================================
     ① 좋아하는 활동 8문항 → 관심 영역 레이더 차트
     ========================================================= */
  const RADAR_COLOR = '#7c3aed';
  function drawRadar(cx, cy, R, vals, o) {
    o = o || {};
    const n = AXES.length;
    const ang = (i) => -Math.PI / 2 + (i / n) * TAU;
    const P = (i, k) => ({ x: cx + Math.cos(ang(i)) * R * k, y: cy + Math.sin(ang(i)) * R * k });
    // 눈금(육각형)
    [1 / 3, 2 / 3, 1].forEach((k, ri) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = P(i, k); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
      ctx.closePath();
      ctx.fillStyle = ri === 2 ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,0)'; ctx.fill();
      ctx.strokeStyle = '#d5deea'; ctx.lineWidth = ri === 2 ? 2 : 1.4; ctx.stroke();
    });
    ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 1.4;
    for (let i = 0; i < n; i++) { const p = P(i, 1); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    // 값 다각형
    const pts = vals.map((v, i) => P(i, Math.max(0.04, v)));
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, rgba(RADAR_COLOR, 0.22)); g.addColorStop(1, rgba(RADAR_COLOR, 0.5));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = RADAR_COLOR; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    pts.forEach((p, i) => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = RADAR_COLOR; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
    });
    // 이름표
    const top = o.top || [];
    for (let i = 0; i < n; i++) {
      const p = P(i, 1.2 + (o.lab || 0));
      const hi = top.includes(i);
      if (hi) { const q = P(i, 1.2 + (o.lab || 0)); ctx.fillStyle = rgba(RADAR_COLOR, 0.16); ctx.beginPath(); rr(q.x - 38, q.y - 14, 76, 28, 14); ctx.fill(); }
      T(AXES[i].name, p.x, p.y + 5, o.size || 15, { a: 'center', c: hi ? RADAR_COLOR : MUTED, w: 800 });
    }
  }

  SC.interest = (() => {
    const st = { rows: [], rv: AXES.map(() => 0), pop: {}, L: null, allAt: -9, lastAll: false };
    function layout() {
      const tall = isTall();
      const rh = tall ? 44 : 50, pitch = tall ? 50 : 56, y0 = tall ? 50 : 60, x = tall ? 8 : 14, w = tall ? 464 : 480;
      const bw = tall ? 46 : 52, bh = tall ? 36 : 40;
      st.rows = ACTS.map((a, i) => {
        const y = y0 + i * pitch;
        const bx0 = x + w - 3 * (bw + 4) - 6;
        return { i, x, y, w, h: rh, btn: [0, 1, 2].map((k) => ({ x: bx0 + k * (bw + 4), y: y + (rh - bh) / 2, w: bw, h: bh })), tx: x + 50, tw: bx0 - (x + 50) - 8 };
      });
      st.L = tall ? { cx: 240, cy: 618, R: 104, chipY: 758, noteY: 800 } : { cx: 646, cy: 232, R: 104, chipY: 396, noteY: 520 };
    }
    const topAxes = () => {
      if (answered() < ACTS.length) return [];
      const v = axisValues();
      const idx = v.map((x, i) => i).sort((a, b) => v[b] - v[a] || a - b);
      return idx.filter((i) => v[i] > 0.01).slice(0, 2);
    };
    function rate(i, k) {
      ME.likes[i] = k; saveMe(); st.pop[i + '_' + k] = now();
      Sound.click();
      const b = st.rows[i].btn[k];
      PT.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 6, speed: 80, size: 2.8, colors: [RADAR_COLOR, '#ffd34d'], gravity: 80, life: 0.5 });
      if (answered() === ACTS.length && !st.lastAll) {
        st.lastAll = true; st.allAt = now();
        setTimeout(() => { fx(st.L.cx, st.L.cy, [RADAR_COLOR, '#ffd34d', '#5eead4']); say('나의 관심 영역 레이더 차트가 완성됐어요!', st.L.cx, st.L.cy - st.L.R - 40, 'good', 3); }, RM ? 0 : 500);
      }
    }
    return {
      st, layout,
      reset() { ME.likes = ACTS.map(() => null); saveMe(); st.lastAll = false; },
      enter() { if (!st.L) layout(); st.lastAll = answered() === ACTS.length; },
      update(dt) {
        const v = axisValues();
        for (let i = 0; i < st.rv.length; i++) st.rv[i] = SciSim.approach(st.rv[i], v[i], dt, 6);
      },
      draw(t) {
        const L = st.L, tall = isTall();
        T('좋아하는 정도를 눌러 보세요', st.rows[0].x + 6, st.rows[0].y - 14, 14.5, { c: MUTED, w: 800 });
        T(answered() + ' / ' + ACTS.length, st.rows[0].x + st.rows[0].w - 6, st.rows[0].y - 14, 14.5, { a: 'right', c: answered() === ACTS.length ? '#14a058' : MUTED, w: 800 });
        st.rows.forEach((r) => {
          const a = ACTS[r.i], v = ME.likes[r.i];
          card(r.x, r.y, r.w, r.h, { r: 12, fill: v != null ? '#fff' : '#fbfcfe', stroke: v != null ? rgba(RADAR_COLOR, 0.55) : '#d5deea', lw: v != null ? 2.5 : 2, lift: 0 });
          emo(a.icon, r.x + 26, r.y + r.h / 2, tall ? 24 : 26);
          const lines = wrapLines(a.text, r.tw, fnt(tall ? 13.5 : 14.5, 800));
          if (lines.length <= 1) T(a.text, r.tx, r.y + r.h / 2 + 5, tall ? 13.5 : 14.5, { c: INK, w: 800, fit: r.tw });
          else para(a.text, r.tx, r.y + r.h / 2 - 4, r.tw, tall ? 13 : 14, { c: INK, w: 800, lh: 16, max: 2 });
          r.btn.forEach((b, k) => {
            const on = v === k;
            const pp = clamp(1 - (now() - (st.pop[r.i + '_' + k] || -9)) / 0.35, 0, 1);
            const sc = 1 + Math.sin(pp * Math.PI) * 0.14;
            ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(sc, sc); ctx.translate(-b.w / 2, -b.h / 2);
            ctx.beginPath(); rr(0, 0, b.w, b.h, 10);
            ctx.fillStyle = on ? RADAR_COLOR : '#f1f5f9'; ctx.fill();
            ctx.strokeStyle = on ? RADAR_COLOR : '#d5deea'; ctx.lineWidth = 2; ctx.stroke();
            ctx.globalAlpha = on || v == null ? 1 : 0.55;
            emo(RATE[k].e, b.w / 2, b.h / 2 + 1, tall ? 22 : 24);
            ctx.restore();
          });
          if (v == null && !RM) { const q = 0.5 + 0.5 * Math.sin(t * 3 + r.i); ctx.fillStyle = rgba(RADAR_COLOR, 0.15 + 0.35 * q); ctx.beginPath(); ctx.arc(r.x + r.w - 4, r.y + 4, 4, 0, TAU); ctx.fill(); }
        });
        // 레이더
        const top = topAxes();
        T('🧭 나의 관심 영역', L.cx, tall ? L.cy - L.R - 66 : L.cy - L.R - 64, 16, { a: 'center', c: INK, w: 800 });
        drawRadar(L.cx, L.cy, L.R, st.rv, { top, size: tall ? 14 : 15 });
        if (answered() === 0) T('왼쪽 질문에 답하면 그려져요', L.cx, L.cy + 6, 14, { a: 'center', c: '#9aa8bb', w: 800 });
        // 요약 칩
        const cy = L.chipY;
        if (top.length) {
          const k = clamp((now() - st.allAt) / 0.5, 0, 1);
          ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 8);
          T('가장 높은 영역', L.cx, cy - 12, 13.5, { a: 'center', c: MUTED, w: 800 });
          const ws = top.map((i) => { ctx.font = fnt(15, 800); return ctx.measureText(AXES[i].name).width + 28; });
          const tot = ws.reduce((a, b) => a + b, 0) + 10 * (top.length - 1);
          let x = L.cx - tot / 2;
          top.forEach((i, j) => { chip(x, cy, ws[j], 30, AXES[i].name, { fill: RADAR_COLOR, c: '#fff', size: 15 }); x += ws[j] + 10; });
          ctx.restore();
        } else T('8문항에 모두 답하면 가장 높은 영역을 알려 줘요', L.cx, cy + 10, 13.5, { a: 'center', c: '#9aa8bb', w: 800 });
        T('🔒 결과는 이 기기에만 저장돼요 · 이름은 받지 않아요', L.cx, L.noteY, 13, { a: 'center', c: MUTED, w: 700, fit: tall ? 440 : 280 });
      },
      down(p) {
        for (const r of st.rows) for (let k = 0; k < 3; k++) if (inR(p, r.btn[k])) { rate(r.i, k); return false; }
        return false;
      },
      hover(p) { return st.rows.some((r) => inR(p, r)) ? 'pointer' : null; },
      toolbar() { return { reset: true }; },
    };
  })();
  /* =========================================================
     ① 관심 직업 3개 고르기 (관심 영역과 어울리는 정도 ★)
     ========================================================= */
  SC.pick = (() => {
    const st = { cards: [], tray: [], L: null, info: null, infoAt: -9, shake: {} };
    JOBS.forEach((j, i) => st.cards.push({ id: j.id, x: new SciSim.Spring(0, { stiffness: 170, damping: 20 }), y: new SciSim.Spring(0, { stiffness: 170, damping: 20 }), s: 1, lift: 0 }));
    function layout(instant) {
      const tall = isTall();
      const cw = tall ? 148 : 148, ch = tall ? 98 : 108, cols = tall ? 3 : 5;
      const gx = tall ? 10 : 8, gy = tall ? 8 : 10;
      const x0 = (LAY.w - (cols * cw + (cols - 1) * gx)) / 2, y0 = tall ? 48 : 58;
      st.L = {
        tall, cw, ch, cols, gx, gy, x0, y0,
        slot: (i) => tall ? { x: 8 + i * 158, y: 508, w: 148, h: 92 } : { x: 14 + i * 262, y: 332, w: 250, h: 92 },
        panel: tall ? { x: 8, y: 618, w: 464, h: 170 } : { x: 14, y: 448, w: 772, h: 138 },
        trayLabel: tall ? 494 : 322,
      };
      reorder(instant);
      st.tray.forEach((t) => { const s = st.L.slot(t.slot); t.x.target = s.x; t.y.target = s.y; if (instant) { t.x.value = s.x; t.y.value = s.y; } });
    }
    function order() {
      const arr = JOBS.map((j, i) => ({ id: j.id, m: answered() ? matchOf(j) : 0, i }));
      arr.sort((a, b) => b.m - a.m || a.i - b.i);
      return arr.map((o) => o.id);
    }
    function reorder(instant) {
      const L = st.L; if (!L) return;
      order().forEach((id, k) => {
        const c = st.cards.find((q) => q.id === id);
        const col = k % L.cols, row = Math.floor(k / L.cols);
        c.x.target = L.x0 + col * (L.cw + L.gx); c.y.target = L.y0 + row * (L.ch + L.gy);
        if (instant) { c.x.value = c.x.target; c.y.value = c.y.target; }
      });
    }
    const cardOf = (id) => st.cards.find((c) => c.id === id);
    function toggle(id) {
      const k = ME.jobs.indexOf(id);
      if (k >= 0) {
        ME.jobs.splice(k, 1); st.tray = st.tray.filter((t) => t.id !== id); Sound.click();
      } else {
        if (ME.jobs.length >= 3) { st.shake[id] = now(); say('3개까지 고를 수 있어요. 하나를 먼저 빼 보세요.', cardOf(id).x.value + st.L.cw / 2, cardOf(id).y.value, 'bad', 2.2); return; }
        ME.jobs.push(id);
        const c = cardOf(id), slot = st.L.slot(ME.jobs.length - 1);
        st.tray.push({ id, slot: ME.jobs.length - 1, x: new SciSim.Spring(c.x.value, { stiffness: 200, damping: 20 }), y: new SciSim.Spring(c.y.value, { stiffness: 200, damping: 20 }), a: 1 });
        const t = st.tray[st.tray.length - 1]; t.x.target = slot.x; t.y.target = slot.y;
        fx(slot.x + slot.w / 2, slot.y + slot.h / 2, [RADAR_COLOR, '#ffd34d', '#fff']);
      }
      st.tray.forEach((t) => { t.slot = ME.jobs.indexOf(t.id); const s = st.L.slot(t.slot); t.x.target = s.x; t.y.target = s.y; });
      saveMe();
    }
    function showInfo(id) { st.info = id; st.infoAt = now(); }
    function stars(x, y, n, size) {
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.fillStyle = i < n ? '#f59e0b' : '#d5deea';
        const cx = x + i * (size * 1.15), s = size * 0.5;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? s * 0.45 : s, a = -Math.PI / 2 + k * Math.PI / 5; const px = cx + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    const starN = (j) => { if (!answered()) return 0; const mx = Math.max(...JOBS.map(matchOf)); if (mx <= 0) return 1; const r = matchOf(j) / mx; return r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1; };
    function jobFace(j, x, y, w, h, o) {
      o = o || {};
      const sel = ME.jobs.indexOf(j.id);
      card(x, y, w, h, { r: 14, fill: sel >= 0 ? '#f5f3ff' : '#fff', stroke: sel >= 0 ? RADAR_COLOR : '#d5deea', lw: sel >= 0 ? 3.5 : 2.4, lift: o.lift || 0 });
      emo(j.icon, x + 30, y + 38, 30);
      const nl = wrapLines(j.name, w - 78, fnt(isTall() ? 14.5 : 15, 800));
      if (nl.length <= 1) T(j.name, x + 56, y + 44, isTall() ? 14.5 : 15, { c: INK, w: 800, fit: w - 66 });
      else para(j.name, x + 56, y + 36, w - 64, isTall() ? 14 : 14.5, { c: INK, w: 800, lh: 17, max: 2 });
      if (answered()) { stars(x + 18, y + h - 22, starN(j), 19); T('어울림', x + w - 12, y + h - 16, 12.5, { a: 'right', c: MUTED, w: 800 }); }
      else T('관심 영역 검사 전', x + w / 2, y + h - 18, 12.5, { a: 'center', c: '#9aa8bb', w: 700 });
      if (sel >= 0 && o.badge !== false) { ctx.fillStyle = RADAR_COLOR; ctx.beginPath(); ctx.arc(x + w - 14, y + 14, 11, 0, TAU); ctx.fill(); T(String(sel + 1), x + w - 14, y + 19, 14, { a: 'center', c: '#fff', w: 800 }); }
    }
    return {
      st, layout, toggle,
      count: () => ME.jobs.length,
      reset() { ME.jobs = []; st.tray = []; st.info = null; saveMe(); },
      enter() {
        if (!st.L) layout(true);
        reorder(false);
        // 저장된 선택이 있으면 선택 칸을 복원
        st.tray = ME.jobs.map((id, i) => { const s = st.L.slot(i); const t = { id, slot: i, x: new SciSim.Spring(s.x, {}), y: new SciSim.Spring(s.y, {}), a: 1 }; return t; });
      },
      update(dt) {
        st.cards.forEach((c) => { c.x.update(dt); c.y.update(dt); });
        st.tray.forEach((t) => { t.x.update(dt); t.y.update(dt); });
        reorder(false);
      },
      draw(t) {
        const L = st.L;
        T(answered() ? '관심 영역과 어울리는 순서로 놓았어요 · 관심 직업 3개를 눌러 보세요' : '먼저 ‘나의 관심 찾기’에 답하면 어울리는 순서로 놓여요', L.tall ? 10 : 16, L.tall ? 32 : 40, L.tall ? 13.5 : 15, { c: MUTED, w: 800, fit: LAY.w - 24 });
        st.cards.forEach((c) => {
          const sh = shk(st.shake[c.id] || -9), x = c.x.value + sh, y = c.y.value;
          jobFace(JOB[c.id], x, y, L.cw, L.ch, { lift: ME.jobs.includes(c.id) ? 0.3 : 0 });
        });
        T('⭐ 나의 관심 직업 (' + ME.jobs.length + '/3)', L.tall ? 10 : 16, L.trayLabel, 15, { c: INK, w: 800 });
        for (let i = 0; i < 3; i++) {
          const s = L.slot(i);
          if (!ME.jobs[i]) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.beginPath(); rr(s.x, s.y, s.w, s.h, 14); ctx.stroke(); ctx.setLineDash([]); T((i + 1) + '번째', s.x + s.w / 2, s.y + s.h / 2 + 5, 14, { a: 'center', c: '#b3bfd0', w: 800 }); }
        }
        st.tray.forEach((tr) => jobFace(JOB[tr.id], tr.x.value, tr.y.value, L.slot(0).w, L.slot(0).h, { lift: 0.6, badge: false }));
        // 설명 칸
        const pn = L.panel;
        card(pn.x, pn.y, pn.w, pn.h, { r: 16, fill: '#fff', stroke: '#d5deea', lw: 2 });
        if (!st.info) {
          para('직업 카드를 누르면 하는 일과 어울리는 관심 영역이 나와요. 카드를 한 번 더 누르면 선택이 풀려요.', pn.x + 16, pn.y + 30, pn.w - 32, 15, { w: 700, c: MUTED, lh: 22 });
        } else {
          const j = JOB[st.info], a = clamp((now() - st.infoAt) / 0.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 6);
          emo(j.icon, pn.x + 34, pn.y + 34, 30);
          T(j.name, pn.x + 62, pn.y + 40, 19, { c: INK, w: 800 });
          para(j.work, pn.x + 16, pn.y + 70, pn.w - 32, 15, { w: 700, c: INK, lh: 21, max: 2 });
          const ax = AXES.filter((q) => j.ax[q.id]).sort((p, q) => j.ax[q.id] - j.ax[p.id]).map((q) => q.name).join(' · ');
          T('어울리는 관심 영역', pn.x + 16, pn.y + pn.h - 38, 13.5, { c: MUTED, w: 800 });
          T(ax, pn.x + 16, pn.y + pn.h - 14, 16, { c: RADAR_COLOR, w: 800 });
          ctx.restore();
        }
      },
      down(p) {
        const L = st.L;
        for (const tr of st.tray) if (inR(p, { x: tr.x.value, y: tr.y.value, w: L.slot(0).w, h: L.slot(0).h })) { showInfo(tr.id); toggle(tr.id); return false; }
        for (const c of st.cards) if (inR(p, { x: c.x.value, y: c.y.value, w: L.cw, h: L.ch })) { showInfo(c.id); toggle(c.id); return false; }
        return false;
      },
      hover(p) { const L = st.L; return (st.cards.some((c) => inR(p, { x: c.x.value, y: c.y.value, w: L.cw, h: L.ch }))) ? 'pointer' : null; },
      toolbar() { return { reset: true }; },
    };
  })();
  /* =========================================================
     ② 과학과 멀어 보이는 직업에 필요한 과학 분야 태그 붙이기
     ========================================================= */
  SC.tag = (() => {
    const st = { cards: [], L: null, drag: null, arm: null, info: null, infoAt: -9, chips: [], hov: null };
    function tagJobs() {
      const ids = myJobs().slice();
      DEFAULT_JOBS.forEach((id) => { if (ids.length < 6 && !ids.includes(id)) ids.push(id); });
      return ids.slice(0, 6);
    }
    function rebuild() {
      const ids = tagJobs();
      const old = st.cards;
      st.cards = ids.map((id) => old.find((c) => c.id === id) || { id, tags: [], pop: {}, shake: -9, doneAt: -9 });
      layout();
    }
    function layout() {
      const tall = isTall();
      const cw = tall ? 226 : 250, ch = tall ? 128 : 142, gx = tall ? 12 : 12, gy = tall ? 10 : 10;
      const cols = tall ? 2 : 3;
      const x0 = (LAY.w - (cols * cw + (cols - 1) * gx)) / 2, y0 = tall ? 48 : 56;
      st.cards.forEach((c, i) => { c.x = x0 + (i % cols) * (cw + gx); c.y = y0 + Math.floor(i / cols) * (ch + gy); c.w = cw; c.h = ch; });
      const rows = Math.ceil(st.cards.length / cols);
      const cy = y0 + rows * (ch + gy) + (tall ? 8 : 6);
      st.L = { tall, cw, ch, chipY: cy + 26, chipLabel: cy + 14, panel: tall ? { x: 8, y: cy + 98, w: 464, h: 150 } : { x: 14, y: cy + 84, w: 772, h: 100 } };
      const chw = tall ? 108 : 150, chg = tall ? 8 : 14, tw = 4 * chw + 3 * chg;
      st.chips = FIELDS.map((f, i) => ({ id: f.id, x: (LAY.w - tw) / 2 + i * (chw + chg), y: st.L.chipY, w: chw, h: 46, home: null }));
    }
    const need = (c) => JOB[c.id].tags.length;
    const complete = (c) => c.tags.length === need(c);
    const doneCount = () => st.cards.filter(complete).length;
    function apply(card_, field, pos) {
      const j = JOB[card_.id];
      if (card_.tags.includes(field)) return;
      if (j.tags.includes(field)) {
        card_.tags.push(field); card_.pop[field] = now();
        const fcol = FIELD[field].color;
        fx(card_.x + card_.w - 40, card_.y + card_.h - 26, [fcol, '#ffd34d', '#fff']);
        st.info = { job: j.id, field, ok: true }; st.infoAt = now();
        if (complete(card_)) { card_.doneAt = now(); setTimeout(() => PT.burst(card_.x + card_.w / 2, card_.y + card_.h / 2, { count: 14, speed: 140, size: 3.4, colors: [fcol, '#ffd34d', '#14a058'] }), RM ? 0 : 100); }
        if (doneCount() === st.cards.length) setTimeout(() => say('모든 직업에 필요한 과학 분야를 붙였어요!', LAY.w / 2, 50, 'good', 3), 500);
      } else {
        card_.shake = now();
        say('‘' + FIELD[field].name + '’ 분야는 이 직업과 거리가 멀어요. ' + j.name + '이 하는 일을 떠올려 봐요: ' + j.work, clamp(card_.x + card_.w / 2, 170, LAY.w - 170), clamp(card_.y + 20, 110, LAY.h - 120), 'bad', 4.4);
        st.info = null;
      }
    }
    const cardAt = (p) => st.cards.find((c) => inR(p, c));
    const chipAt = (p) => st.chips.find((c) => inR(p, c));
    function drawCard(c, t) {
      const j = JOB[c.id], done = complete(c);
      const sh = shk(c.shake);
      const hov = (st.drag && st.hov === c) || (st.arm && st.hov === c);
      const pulse = clamp(1 - (now() - c.doneAt) / 0.5, 0, 1);
      ctx.save();
      const cx = c.x + c.w / 2 + sh, cy = c.y + c.h / 2, k = 1 + Math.sin(pulse * Math.PI) * 0.04 + (hov ? 0.025 : 0);
      ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-c.w / 2, -c.h / 2);
      card(0, 0, c.w, c.h, { r: 16, fill: done ? '#f0fdf4' : '#fff', stroke: done ? '#14a058' : (hov ? SUBJ : '#d5deea'), lw: done || hov ? 3.2 : 2.4, lift: hov ? 1 : 0 });
      emo(j.icon, 32, 34, 30);
      T(j.name, 60, 40, 17, { c: INK, w: 800, fit: c.w - 100 });
      if (done) D.check(c.w - 22, 22, 10, 1);
      para(j.work, 16, 76, c.w - 32, 13.5, { c: MUTED, w: 700, lh: 18, max: 2 });
      // 태그 칸
      const n = need(c);
      const bw = c.w < 240 ? 48 : 52, gap = 6;
      for (let i = 0; i < n; i++) {
        const x = 14 + i * (bw + gap), y = c.h - 40;
        const f = c.tags[i];
        if (!f) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.8; ctx.setLineDash([4, 4]); ctx.beginPath(); rr(x, y, bw, 26, 13); ctx.stroke(); ctx.setLineDash([]); }
        else {
          const pp = clamp((now() - c.pop[f]) / 0.4, 0, 1), s = EZ.outBack(pp);
          ctx.save(); ctx.translate(x + bw / 2, y + 13); ctx.scale(s, s); ctx.translate(-bw / 2, -13);
          chip(0, 0, bw, 26, FIELD[f].name, { fill: FIELD[f].color, c: '#fff', size: 14 });
          ctx.restore();
        }
      }
      if (n === 4) T('필요한 분야: 모두', c.w - 14, 52, 12.5, { a: 'right', c: MUTED, w: 800 });
      else T('필요한 분야 ' + n + '개', c.w - 14, c.h - 20, 12.5, { a: 'right', c: MUTED, w: 800 });
      ctx.restore();
    }
    return {
      st, layout, rebuild, doneCount,
      total: () => st.cards.length,
      reset() { st.cards.forEach((c) => { c.tags = []; c.pop = {}; }); st.info = null; },
      enter() { rebuild(); },
      update(dt) {},
      draw(t) {
        const L = st.L;
        T('분야 표시를 끌어서 직업 카드에 붙여 보세요', LAY.w / 2, L.tall ? 30 : 38, L.tall ? 15 : 17, { a: 'center', c: MUTED, w: 800 });
        T(doneCount() + ' / ' + st.cards.length + ' 직업 완성', LAY.w - 12, L.tall ? 30 : 38, 13.5, { a: 'right', c: doneCount() === st.cards.length ? '#14a058' : MUTED, w: 800 });
        st.cards.forEach((c) => drawCard(c, t));
        T('🏷️ 과학 분야 표시', L.tall ? 10 : 16, L.chipLabel, 14, { c: MUTED, w: 800 });
        st.chips.forEach((c) => {
          const f = FIELD[c.id], armed = st.arm === c.id, dr = st.drag && st.drag.f === c.id;
          ctx.save(); ctx.globalAlpha = dr ? 0.5 : 1;
          const cx = c.x + c.w / 2, cy = c.y + c.h / 2, k = armed ? 1.06 : 1;
          ctx.translate(cx, cy - (armed ? 3 : 0)); ctx.scale(k, k); ctx.translate(-cx, -cy);
          card(c.x, c.y, c.w, c.h, { r: 23, fill: f.color, shadow: true, lift: armed ? 1 : 0.1 });
          T('🏷️ ' + f.name, cx, cy + 6, 17, { a: 'center', c: '#fff', w: 800 });
          ctx.restore();
        });
        if (st.drag && st.drag.moved) {
          const f = FIELD[st.drag.f];
          ctx.save(); ctx.translate(st.drag.x, st.drag.y - 6); ctx.scale(1.08, 1.08);
          card(-56, -22, 112, 44, { r: 22, fill: f.color, lift: 1 });
          T('🏷️ ' + f.name, 0, 6, 17, { a: 'center', c: '#fff', w: 800 });
          ctx.restore();
        }
        // 설명 칸
        const pn = L.panel;
        card(pn.x, pn.y, pn.w, pn.h, { r: 16, fill: '#fff', stroke: '#d5deea', lw: 2 });
        if (!st.info) {
          para('분야 표시를 끌어서 놓거나, 표시를 누른 뒤 직업 카드를 눌러 붙여요. 알맞게 붙이면 왜 필요한지 알려 줘요.', pn.x + 16, pn.y + 30, pn.w - 32, 15, { w: 700, c: MUTED, lh: 22 });
        } else {
          const j = JOB[st.info.job], f = FIELD[st.info.field], a = clamp((now() - st.infoAt) / 0.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 6);
          emo(j.icon, pn.x + 32, pn.y + 28, 26);
          T(j.name + '  +  ' + f.name, pn.x + 58, pn.y + 34, 17, { c: f.color, w: 800 });
          para(j.why[st.info.field], pn.x + 16, pn.y + 64, pn.w - 32, 15.5, { w: 700, c: INK, lh: 22, max: 3 });
          ctx.restore();
        }
      },
      grab(p) { return !!chipAt(p); },
      down(p) {
        const ch = chipAt(p);
        if (ch) { st.drag = { f: ch.id, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; Sound.click(); return true; }
        const c = cardAt(p);
        if (c && st.arm) { apply(c, st.arm, p); return false; }
        return false;
      },
      move(p) {
        const d = st.drag; if (!d) return;
        d.x = p.x; d.y = p.y;
        if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true;
        st.hov = cardAt(p) || null;
      },
      up(p) {
        const d = st.drag; if (!d) return;
        st.drag = null; st.hov = null;
        if (!d.moved) { st.arm = st.arm === d.f ? null : d.f; return; }
        const c = cardAt(p);
        if (c) apply(c, d.f, p);
      },
      hover(p) { st.hov = st.arm ? cardAt(p) : null; return chipAt(p) ? 'grab' : (st.arm && cardAt(p) ? 'pointer' : null); },
      toolbar() { return { reset: true }; },
    };
  })();
  /* =========================================================
     ③ 고등학교 과학 과목 지도 (공통 → 일반 선택 → 진로 선택 · 융합 선택)
     ========================================================= */
  SC.map = (() => {
    const st = { nodes: {}, edges: [], heads: [], chips: [], job: null, tapped: {}, done: new Set(), sel: null, selAt: -9, L: null, doneAt: -9 };
    SUBJECTS.forEach((s) => { st.nodes[s.id] = { id: s.id, x: 0, y: 0, w: 100, h: 36, lit: 0, shake: -9, pop: -9 }; });
    const jobId = () => st.job || ME.pathJob || myJobs()[0];
    const tappedSet = (id) => (st.tapped[id] || (st.tapped[id] = new Set()));
    function polyLen(pts) { let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); cum.push(L); } return { L, cum }; }
    function bezPts(a, b, vertical, off) {
      const pts = [], n = 22;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        let x1, y1, x2, y2;
        if (vertical) { const d = (b.y - a.y) * 0.5; x1 = a.x; y1 = a.y + d; x2 = b.x; y2 = b.y - d; }
        else { const d = (b.x - a.x) * 0.5; x1 = a.x + d; y1 = a.y; x2 = b.x - d; y2 = b.y; }
        pts.push({ x: u * u * u * a.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * b.y });
      }
      return pts;
    }
    function layout() {
      const tall = isTall(), N = st.nodes;
      const set = (id, x, y, w, h) => { const n = N[id]; n.x = x; n.y = y; n.w = w; n.h = h; };
      const gen = ['phys', 'chem', 'life', 'earth'];
      st.heads = [];
      if (!tall) {
        const y0 = 98, ph = 34, pitch = 40;
        gen.forEach((g, k) => {
          const kids = SUBJECTS.filter((s) => s.parent === g);
          kids.forEach((s, j) => set(s.id, 338, y0 + (k * 2 + j) * pitch, 210, ph));
          set(g, 176, y0 + (k * 2 + 0.5) * pitch + ph / 2 - 20, 128, 40);
        });
        const midG = (N.phys.y + N.earth.y) / 2;
        set('integ1', 14, midG, 128, 40); set('exp1', 14, y0, 128, 40); set('exp2', 14, y0 + 48, 128, 40);
        const fy = 438;
        set('integ2', 14, fy, 128, 38);
        set('hist', 176, fy, 190, 38); set('climate', 376, fy, 190, 38); set('conv', 576, fy, 210, 38);
        st.heads = [{ t: '공통 과목', x: 78, y: 86, c: TIER.common.color }, { t: '일반 선택', x: 240, y: 86, c: TIER.general.color }, { t: '진로 선택', x: 443, y: 86, c: TIER.career.color }, { t: '융합 선택', x: 176, y: 428, c: TIER.fusion.color, left: true }];
        st.busY = 490;
        st.chipRect = (i) => ({ x: 14 + i * 190, y: 500, w: 180, h: 40 });
        st.panel = { x: 14, y: 546, w: 772, h: 48 };
      } else {
        gen.forEach((g, k) => {
          const cx = 8 + k * 118;
          set(g, cx, 190, 110, 44);
          const kids = SUBJECTS.filter((s) => s.parent === g);
          set(kids[0].id, cx, 276, 84, 46); set(kids[1].id, cx + 26, 336, 84, 46);
        });
        set('integ1', 8, 76, 110, 44); set('exp1', 126, 76, 110, 44); set('exp2', 244, 76, 110, 44);
        const fy = 436;
        set('integ2', 8, fy, 100, 46);
        set('hist', 118, fy, 112, 46); set('climate', 236, fy, 112, 46); set('conv', 354, fy, 112, 46);
        st.heads = [{ t: '공통 과목', x: 8, y: 68, c: TIER.common.color, left: true }, { t: '일반 선택', x: 8, y: 182, c: TIER.general.color, left: true }, { t: '진로 선택', x: 8, y: 268, c: TIER.career.color, left: true }, { t: '융합 선택', x: 118, y: 428, c: TIER.fusion.color, left: true }];
        st.busY = 502;
        st.chipRect = (i) => ({ x: 8 + i * 158, y: 524, w: 150, h: 46 });
        st.panel = { x: 8, y: 590, w: 464, h: 190 };
      }
      // 이음선
      st.edges = EDGES.map(([p, c]) => {
        const a = N[p], b = N[c];
        let pts;
        if (p === 'integ2') {
          const ax = a.x + a.w / 2, ay = a.y + a.h, bx = b.x + b.w / 2, by = b.y + b.h;
          pts = [{ x: ax, y: ay }, { x: ax, y: st.busY }, { x: bx, y: st.busY }, { x: bx, y: by }];
        } else if (!tall) pts = bezPts({ x: a.x + a.w, y: a.y + a.h / 2 }, { x: b.x, y: b.y + b.h / 2 }, false);
        else {
          const sib = SUBJECTS.filter((s) => s.parent === p).findIndex((s) => s.id === c);
          const gx = p === 'integ1' ? 0 : (sib === 1 ? 40 : -14);
          pts = bezPts({ x: a.x + a.w / 2 + (p === 'integ1' ? (N[c].x - a.x) * 0.05 : gx), y: a.y + a.h }, { x: b.x + b.w / 2, y: b.y }, true);
        }
        const e = { p, c, pts }; Object.assign(e, polyLen(pts)); return e;
      });
    }
    function samp(e, s) {
      const d = s * e.L;
      let i = 1; while (i < e.cum.length - 1 && e.cum[i] < d) i++;
      const k = (d - e.cum[i - 1]) / Math.max(0.0001, e.cum[i] - e.cum[i - 1]);
      return { x: e.pts[i - 1].x + (e.pts[i].x - e.pts[i - 1].x) * k, y: e.pts[i - 1].y + (e.pts[i].y - e.pts[i - 1].y) * k };
    }
    const nodeAt = (p) => { for (const id in st.nodes) { const n = st.nodes[id]; if (inR(p, n)) return n; } return null; };
    const chipAt = (p) => { const L = myJobs(); for (let i = 0; i < L.length; i++) if (inR(p, st.chipRect(i))) return L[i]; return null; };
    const isDone = (id) => JOB[id].path.every((s) => tappedSet(id).has(s));
    function tapNode(n) {
      const j = JOB[jobId()], sub = SUB[n.id];
      st.sel = n.id; st.selAt = now();
      const set = tappedSet(j.id);
      if (j.path.includes(n.id)) {
        if (set.has(n.id)) { Sound.click(); return; }
        set.add(n.id); n.pop = now();
        const col = TIER[sub.tier].color;
        fx(n.x + n.w / 2, n.y + n.h / 2, [col, '#ffd34d', '#fff']);
        if (isDone(j.id) && !st.done.has(j.id)) {
          st.done.add(j.id); st.doneAt = now();
          setTimeout(() => { say('‘' + j.name + '’의 과목 경로가 완성됐어요!', LAY.w / 2, 50, 'good', 3.4); }, RM ? 0 : 350);
        }
      } else {
        n.shake = now();
        say('‘' + sub.name + '’은 ' + sub.about.replace(/(해요|요)\.$/, '요.') + ' ' + j.name + '에는 이 과목이 꼭 필요하지는 않아요.', clamp(n.x + n.w / 2, 170, LAY.w - 170), clamp(n.y, 120, LAY.h - 150), 'bad', 4.4);
      }
    }
    function drawNode(n, t) {
      const sub = SUB[n.id], col = TIER[sub.tier].color, tall = isTall();
      const lit = n.lit, sh = shk(n.shake), pp = clamp(1 - (now() - n.pop) / 0.45, 0, 1);
      const sc = 1 + Math.sin(pp * Math.PI) * 0.08;
      ctx.save();
      const cx = n.x + n.w / 2 + sh, cy = n.y + n.h / 2;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-n.w / 2, -n.h / 2);
      if (lit > 0.02) D.glow(n.w / 2, n.h / 2, n.w * 0.75, col, 0.45 * lit * (0.8 + 0.2 * Math.sin(t * 3)));
      card(0, 0, n.w, n.h, { r: 11, fill: lit > 0.5 ? mix('#ffffff', col, 0.16 + 0.1 * lit) : '#fff', stroke: lit > 0.02 ? col : '#cbd5e1', lw: 2 + lit * 1.8, lift: lit * 0.6 });
      if (st.sel === n.id && !RM) { ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 2; ctx.beginPath(); rr(-4, -4, n.w + 8, n.h + 8, 14); ctx.stroke(); }
      const lines = wrapLines(sub.name, n.w - 12, fnt(tall ? 12.5 : 14.5, 800));
      if (lines.length <= 1 || !tall && n.h < 36) T(sub.name, n.w / 2, n.h / 2 + 5, tall ? 12.5 : (n.h < 36 ? 14 : 14.5), { a: 'center', c: lit > 0.5 ? shade(col, -0.25) : INK, w: 800, fit: n.w - 14 });
      else para(sub.name, n.w / 2, n.h / 2 - 3, n.w - 10, 12.5, { a: 'center', c: lit > 0.5 ? shade(col, -0.25) : INK, w: 800, lh: 15, max: 2 });
      if (lit > 0.5) D.check(n.w - 8, 8, 7.5, 1, { color: col });
      ctx.restore();
    }
    return {
      st, layout, nodes: st.nodes,
      doneCount: () => st.done.size,
      current: jobId,
      reset() { st.tapped = {}; st.done = new Set(); st.sel = null; },
      enter() {
        if (!st.job || !myJobs().includes(st.job)) st.job = ME.pathJob && myJobs().includes(ME.pathJob) ? ME.pathJob : myJobs()[0];
      },
      update(dt) {
        const j = JOB[jobId()], set = tappedSet(j.id);
        for (const id in st.nodes) { const n = st.nodes[id]; n.lit = SciSim.approach(n.lit, set.has(id) ? 1 : 0, dt, 9); }
      },
      draw(t) {
        const tall = isTall(), j = JOB[jobId()], set = tappedSet(j.id), col0 = TIER.career.color;
        T('내 직업에 필요한 과목을 눌러 길을 이어 보세요', LAY.w / 2, tall ? 30 : 38, tall ? 15 : 17, { a: 'center', c: MUTED, w: 800 });
        st.heads.forEach((h) => T(h.t, h.x, h.y, 14, { a: h.left ? 'left' : 'center', c: h.c, w: 800 }));
        // 이음선
        st.edges.forEach((e) => {
          const a = st.nodes[e.p], b = st.nodes[e.c];
          const on = Math.min(a.lit, b.lit);
          const col = TIER[SUB[e.c].tier].color;
          ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.beginPath(); e.pts.forEach((q, i) => { if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
          ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 2.6; ctx.stroke();
          if (on > 0.02) {
            ctx.strokeStyle = rgba(col, 0.22 * on); ctx.lineWidth = 11; ctx.stroke();
            ctx.strokeStyle = rgba(col, on); ctx.lineWidth = 4; ctx.stroke();
          }
          ctx.restore();
          if (on > 0.5 && !RM) for (let i = 0; i < 3; i++) { const q = samp(e, (t * 0.4 + i / 3) % 1); ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(q.x, q.y, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); }
        });
        Object.keys(st.nodes).forEach((id) => drawNode(st.nodes[id], t));
        // 직업 선택 칸
        const L = myJobs();
        L.forEach((id, i) => {
          const r = st.chipRect(i), jb = JOB[id], on = id === jobId(), tp = tappedSet(id), done = isDone(id);
          card(r.x, r.y, r.w, r.h, { r: 14, fill: on ? '#f5f3ff' : '#fff', stroke: done ? '#14a058' : (on ? RADAR_COLOR : '#d5deea'), lw: on || done ? 3.2 : 2.2, lift: on ? 0.5 : 0 });
          emo(jb.icon, r.x + 24, r.y + r.h / 2, 24);
          T(jb.name, r.x + 46, r.y + r.h / 2 - 2, tall ? 14 : 15, { c: INK, w: 800, fit: r.w - 56 });
          T(done ? '✔ 경로 완성' : '과목 ' + tp.size + '/' + jb.path.length, r.x + 46, r.y + r.h / 2 + 15, 12.5, { c: done ? '#14a058' : MUTED, w: 800 });
        });
        // 설명 칸
        const pn = st.panel;
        card(pn.x, pn.y, pn.w, pn.h, { r: 14, fill: '#fff', stroke: '#d5deea', lw: 2 });
        const a = clamp((now() - st.selAt) / 0.3, 0, 1);
        if (st.sel) {
          const s = SUB[st.sel], tc = TIER[s.tier];
          ctx.save(); ctx.globalAlpha = a;
          if (tall) {
            T(s.name, pn.x + 14, pn.y + 30, 18, { c: tc.color, w: 800 }); chip(pn.x + pn.w - 98, pn.y + 12, 84, 26, tc.name, { fill: tc.color, c: '#fff', size: 13 });
            para(s.about, pn.x + 14, pn.y + 62, pn.w - 28, 15, { w: 700, c: INK, lh: 21, max: 3 });
            if (isDone(j.id)) para(j.need, pn.x + 14, pn.y + 134, pn.w - 28, 14, { w: 800, c: '#14a058', lh: 19, max: 2 });
          } else {
            T(s.name, pn.x + 14, pn.y + 22, 16, { c: tc.color, w: 800 }); chip(pn.x + 14 + 130, pn.y + 6, 76, 22, tc.name, { fill: tc.color, c: '#fff', size: 12.5 });
            T(isDone(j.id) ? j.need : s.about, pn.x + 14, pn.y + 41, 14, { c: isDone(j.id) ? '#14a058' : INK, w: 700, fit: pn.w - 28 });
          }
          ctx.restore();
        } else {
          if (tall) para('아래 직업을 고르고, 그 직업에 필요한 과목을 눌러 보세요. 맞으면 길이 빛나요.', pn.x + 14, pn.y + 32, pn.w - 28, 15, { w: 700, c: MUTED, lh: 21 });
          else T('직업을 고르고, 필요한 과목을 눌러 보세요. 맞으면 길이 빛나요.', pn.x + 14, pn.y + 30, 15, { c: MUTED, w: 700, fit: pn.w - 28 });
        }
        T(j.icon + ' ' + j.name + ' · 필요한 과목 ' + set.size + '/' + j.path.length, LAY.w - 12, tall ? 52 : 62, 13.5, { a: 'right', c: isDone(j.id) ? '#14a058' : MUTED, w: 800 });
      },
      down(p) {
        const c = chipAt(p);
        if (c) { st.job = c; ME.pathJob = c; saveMe(); st.sel = null; Sound.click(); return false; }
        const n = nodeAt(p);
        if (n) tapNode(n);
        return false;
      },
      hover(p) { return (nodeAt(p) || chipAt(p)) ? 'pointer' : null; },
      toolbar() { return { reset: true }; },
    };
  })();
  /* =========================================================
     ④ 학습 로드맵 (중3 → 고1 → 고2·3 → 진로): 활동 카드를 놓으면 길이 자라요
     ========================================================= */
  const planJobId = () => ME.planJob || ME.pathJob || myJobs()[0];
  SC.road = (() => {
    const st = { job: null, cards: [], L: null, drag: null, sel: null, grow: 0, growT: 0, popAt: {}, complete: false, completeAt: -9, info: null, hoverStage: null, goalPop: 0 };
    const CAP = 4;
    function buildDeck(id) {
      const j = JOB[id]; st.job = id;
      const list = [];
      j.path.forEach((sid) => list.push({ kind: 'subject', sid, text: SUB[sid].name, stage: stageOfSubject(sid) }));
      ACTIVITY.forEach((a) => list.push({ kind: 'act', aid: a.id, icon: a.icon, type: a.type, text: a.make(j) }));
      if (j.decoy) list.push({ kind: 'decoy', sid: j.decoy, text: SUB[j.decoy].name });
      const n = list.length;
      st.cards = list.map((c, i) => Object.assign(c, { key: i, placed: null, slot: -1, shake: -9, lift: 0, s: 1, x: new SciSim.Spring(0, { stiffness: 210, damping: 22 }), y: new SciSim.Spring(0, { stiffness: 210, damping: 22 }), ord: (i * 7 + 3) % n }));
      st.cards.sort((a, b) => a.ord - b.ord);
      st.complete = false; st.grow = 0; st.growT = 0; st.info = null; st.sel = null;
      const sv = store.get('m3-my-science-path:road');
      if (sv && sv.job === id && sv.p) st.cards.forEach((c) => { const sg = sv.p[c.text]; if (sg && STAGES.some((q) => q.id === sg)) c.placed = sg; });
      relayout(true);
      if (st.cards.some((c) => c.placed) && !problem()) { st.complete = true; relayout(true); st.grow = st.growT; }
    }
    function saveRoad() { const p = {}; st.cards.forEach((c) => { if (c.placed) p[c.text] = c.placed; }); store.set('m3-my-science-path:road', { job: st.job, p }); }
    function layout() {
      const tall = isTall();
      const cw = tall ? 148 : 186, ch = tall ? 56 : 48;
      const colX = tall ? [8, 166, 324] : [8, 200, 392];
      const L = {
        tall, cw, ch, colX,
        cols: STAGES.map((s, i) => ({ id: s.id, x: colX[i], y: tall ? 112 : 130, w: cw, h: tall ? 306 : 276 })),
        slot: (si, k) => ({ x: colX[si], y: (tall ? 164 : 184) + k * (ch + (tall ? 6 : 6)) }),
        tray: (i) => tall ? { x: 8 + (i % 3) * 158, y: 548 + Math.floor(i / 3) * 62 } : { x: 8 + (i % 4) * 192, y: 440 + Math.floor(i / 4) * 54 },
        trayLabel: tall ? 538 : 428,
        road: tall ? { x0: 30, x1: 440, y: 76 } : { x0: 30, x1: 690, y: 92 },
        stopX: tall ? [colX[0] + 74, colX[1] + 74, colX[2] + 74] : [colX[0] + 93, colX[1] + 93, colX[2] + 93],
        goal: tall ? { x: 8, y: 424, w: 464, h: 100 } : { x: 588, y: 130, w: 204, h: 276 },
      };
      L.fStop = L.stopX.map((x) => (x - L.road.x0) / (L.road.x1 - L.road.x0));
      st.L = L;
      relayout(true);
    }
    function relayout(instant) {
      if (!st.L) return;
      const per = [0, 0, 0]; let free = 0;
      st.cards.forEach((c) => {
        let pos;
        if (c.placed) { const si = STAGES.findIndex((s) => s.id === c.placed); c.slot = per[si]++; pos = st.L.slot(si, c.slot); }
        else pos = st.L.tray(free++);
        if (st.drag && st.drag.c === c) return;
        c.x.target = pos.x; c.y.target = pos.y;
        if (instant) { c.x.value = pos.x; c.y.value = pos.y; }
      });
      // 길이 자라는 목표
      let hi = -1; STAGES.forEach((s, i) => { if (per[i] > 0) hi = i; });
      st.growT = st.complete ? 1 : (hi < 0 ? 0.05 : st.L.fStop[hi]);
    }
    const subjCards = () => st.cards.filter((c) => c.kind === 'subject');
    const actPlaced = () => st.cards.filter((c) => c.kind === 'act' && c.placed).length;
    const subjPlaced = () => subjCards().filter((c) => c.placed).length;
    function problem() {
      const un = subjCards().filter((c) => !c.placed);
      if (un.length) return '아직 놓지 않은 과목이 있어요: ' + un.map((c) => c.text).join(', ');
      if (actPlaced() < 3) return '독서·탐구 활동·동아리·체험 카드를 3장 이상 놓아 주세요. (지금 ' + actPlaced() + '장)';
      return null;
    }
    function markComplete() {
      if (problem() || st.complete) return;
      st.complete = true; st.completeAt = now(); relayout(false);
      const g = st.L.goal;
      setTimeout(() => { PT.burst(g.x + g.w / 2, g.y + g.h / 2, { count: 30, speed: 240, size: 4.2, colors: ['#ffd34d', '#7c3aed', '#2563eb', '#16a34a', '#f472b6'], gravity: 200 }); Sound.tick(); }, RM ? 0 : 900);
    }
    const colAt = (p) => st.L.cols.find((c) => inR(p, c)) || null;
    function cardAt(p) {
      for (let i = st.cards.length - 1; i >= 0; i--) {
        const c = st.cards[i];
        if (c.placed) continue;
        if (inR(p, { x: c.x.value, y: c.y.value, w: st.L.cw, h: st.L.ch })) return c;
      }
      return null;
    }
    function place(c, stageId) {
      const j = JOB[st.job], cx = c.x.value + st.L.cw / 2, cy = c.y.value + st.L.ch / 2;
      const si = STAGES.findIndex((s) => s.id === stageId);
      const used = st.cards.filter((q) => q.placed === stageId).length;
      let msg = null;
      if (c.kind === 'decoy') msg = '‘' + c.text + '’(' + SUB[c.sid].about + ') ' + j.name + '에는 꼭 필요하지 않은 과목이에요.';
      else if (c.kind === 'subject' && c.stage !== stageId) msg = '‘' + c.text + '’은 ' + (c.stage === 'h1' ? '고1에서 모든 학생이 배우는 공통 과목이에요. 고1 칸에 놓아 보세요.' : '고1 이후 고2·3에서 고르는 ' + TIER[SUB[c.sid].tier].name + ' 과목이에요. 고2·3 칸에 놓아 보세요.');
      else if (used >= CAP) msg = '이 단계 칸이 가득 찼어요. 다른 단계에도 나누어 놓아 보세요.';
      if (msg) { c.shake = now(); say(msg, clamp(cx, 170, LAY.w - 170), clamp(cy - 16, 120, LAY.h - 120), 'bad', 4.2); relayout(false); st.sel = null; return; }
      c.placed = stageId; c.s = 1.12; st.sel = null;
      relayout(false);
      const sp = st.L.slot(si, c.slot);
      fx(sp.x + st.L.cw / 2, sp.y + st.L.ch / 2, ['#7c3aed', '#ffd34d', '#fff']);
      st.popAt[stageId] = now();
      saveRoad();
      markComplete();
    }
    function cardFace(c, x, y, w, h, o) {
      o = o || {};
      let col = '#94a3b8', icon = '', sub = '';
      if (c.kind === 'act') { col = '#0d9488'; icon = c.icon; }
      else { const t = TIER[SUB[c.sid].tier]; col = t.color; icon = '📘'; sub = t.name; }
      card(x, y, w, h, { r: 11, fill: c.placed ? mix('#ffffff', col, 0.1) : '#fff', stroke: c.placed ? col : (o.sel ? RADAR_COLOR : '#cbd5e1'), lw: c.placed || o.sel ? 2.8 : 2.2, lift: o.lift || 0 });
      ctx.fillStyle = col; ctx.beginPath(); rr(x, y, 7, h, 4); ctx.fill();
      emo(icon, x + 26, y + h / 2, h > 50 ? 24 : 22);
      if (c.kind === 'act') {
        const lines = wrapLines(c.text, w - 56, fnt(13.5, 800));
        if (lines.length <= 1) T(c.text, x + 44, y + h / 2 + 5, 13.5, { c: INK, w: 800, fit: w - 54 });
        else para(c.text, x + 44, y + h / 2 - 3, w - 52, 13, { c: INK, w: 800, lh: 15.5, max: 2 });
      } else {
        T(c.text, x + 44, y + h / 2 - 1, 15, { c: INK, w: 800, fit: w - 54 });
        T(sub, x + 44, y + h / 2 + 15, 12.5, { c: col, w: 800 });
      }
    }
    function drawRoad(t) {
      const L = st.L, r = L.road, g = st.grow;
      // 배경 띠
      const by = L.tall ? 28 : 38, bh = L.tall ? 104 : 100;
      ctx.save(); ctx.beginPath(); rr(4, by, LAY.w - 8, bh, 16); ctx.clip();
      ctx.fillStyle = lingrad(0, by, 0, by + bh, ['#dbeeff', '#eaf6e6']); ctx.fillRect(4, by, LAY.w - 8, bh);
      ctx.fillStyle = '#cfe8c4'; ctx.beginPath(); ctx.moveTo(4, by + bh); ctx.lineTo(4, by + bh - 28); ctx.quadraticCurveTo(LAY.w * 0.3, by + bh - 52, LAY.w * 0.55, by + bh - 24); ctx.quadraticCurveTo(LAY.w * 0.8, by + bh - 4, LAY.w, by + bh - 34); ctx.lineTo(LAY.w, by + bh); ctx.fill();
      ctx.restore();
      const yAt = (s) => r.y + Math.sin(s * 8) * 8;
      const xAt = (s) => r.x0 + (r.x1 - r.x0) * s;
      // 길(전체 윤곽: 연하게) + 자란 부분
      const draw = (s1, color, w, dash) => {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const s = s1 * i / 60; if (i === 0) ctx.moveTo(xAt(s), yAt(s)); else ctx.lineTo(xAt(s), yAt(s)); }
        ctx.stroke(); ctx.restore();
      };
      draw(1, 'rgba(100,116,139,.18)', 18, [2, 14]);
      if (g > 0.002) { draw(g, '#64748b', 22); draw(g, '#94a3b8', 17); draw(g, '#fff', 3, [10, 12]); }
      // 정류장
      STAGES.forEach((s, i) => {
        const f = L.fStop[i], x = L.stopX[i], y = yAt(f) - (L.tall ? 0 : 0);
        const reached = g >= f - 0.005;
        const pp = clamp(1 - (now() - (st.popAt[s.id] || -9)) / 0.5, 0, 1);
        const k = (reached ? 1 : 0.8) * (1 + Math.sin(pp * Math.PI) * 0.12);
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        if (reached) D.glow(0, 0, 38, '#ffd34d', 0.4);
        ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fillStyle = reached ? '#fff' : '#e8edf4'; ctx.fill(); ctx.strokeStyle = reached ? '#7c3aed' : '#cbd5e1'; ctx.lineWidth = 3.4; ctx.stroke();
        ctx.globalAlpha = reached ? 1 : 0.5; emo(s.icon, 0, 1, 22); ctx.restore();
      });
      // 도착: 깃발과 목표 직업
      const gx = xAt(1), gy = yAt(1), reached = g >= 0.995;
      ctx.save(); ctx.translate(gx, gy);
      const gp = EZ.outBack(clamp(st.goalPop, 0, 1));
      ctx.scale(0.7 + 0.3 * gp, 0.7 + 0.3 * gp);
      if (reached) D.glow(0, -10, 50, '#ffd34d', 0.5);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, -32); ctx.stroke();
      ctx.fillStyle = reached ? '#7c3aed' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(30 + Math.sin(t * 5) * 3 * (reached ? 1 : 0), -23); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
      ctx.restore();
      emo(JOB[st.job].icon, gx + (L.tall ? 14 : 38), gy - 4, 26);
      // 걷는 학생
      if (g > 0.01 && !(reached && !RM && false)) {
        const s = Math.min(g, 0.995), bob = RM ? 0 : Math.abs(Math.sin(t * 7)) * 3;
        emo('🧑‍🎓', xAt(s), yAt(s) - 22 - bob, 26);
      }
    }
    function drawGoal(t) {
      const gl = st.L.goal, j = JOB[st.job], tall = st.L.tall;
      card(gl.x, gl.y, gl.w, gl.h, { r: 16, fill: st.complete ? '#fffdf2' : '#fff', stroke: st.complete ? '#f59e0b' : '#d5deea', lw: st.complete ? 3.5 : 2.2, lift: st.complete ? 0.6 : 0 });
      emo(j.icon, gl.x + 34, gl.y + 38, 34);
      T('🎯 목표 직업', gl.x + 64, gl.y + 26, 13, { c: MUTED, w: 800 });
      T(j.name, gl.x + 64, gl.y + 50, 18, { c: INK, w: 800, fit: gl.w - 76 });
      const sp = subjPlaced(), st_ = subjCards().length, ap = actPlaced();
      if (tall) {
        T('과목 ' + sp + '/' + st_ + ' · 활동 ' + ap + '/3', gl.x + gl.w - 14, gl.y + 30, 14, { a: 'right', c: st.complete ? '#14a058' : MUTED, w: 800 });
        para(st.complete ? '계획이 완성됐어요! ‘확인하기’를 눌러요.' : j.need, gl.x + 14, gl.y + 74, gl.w - 28, 14, { c: st.complete ? '#14a058' : INK, w: 700, lh: 19, max: 2 });
      } else {
        para(j.need, gl.x + 14, gl.y + 86, gl.w - 28, 14, { c: INK, w: 700, lh: 19.5, max: 6 });
        T('📌 과목 ' + sp + '/' + st_, gl.x + 14, gl.y + gl.h - 56, 14.5, { c: sp === st_ ? '#14a058' : MUTED, w: 800 });
        T('📌 활동 카드 ' + ap + '/3', gl.x + 14, gl.y + gl.h - 34, 14.5, { c: ap >= 3 ? '#14a058' : MUTED, w: 800 });
        if (st.complete) T('✔ 계획 완성!', gl.x + 14, gl.y + gl.h - 12, 15, { c: '#14a058', w: 800 });
      }
    }
    return {
      st, layout, buildDeck, problem, markComplete, relayout,
      get complete() { return st.complete; },
      reset() { store.set('m3-my-science-path:road', null); if (st.job) buildDeck(st.job); },
      enter() { if (!st.job) buildDeck(planJobId()); },
      update(dt) {
        st.grow = SciSim.approach(st.grow, st.growT, dt, 2.2);
        if (st.grow > 0.99) st.goalPop = Math.min(1, st.goalPop + dt * 2.5); else st.goalPop = Math.max(0, st.goalPop - dt * 3);
        st.cards.forEach((c) => {
          c.x.update(dt); c.y.update(dt);
          c.lift = SciSim.approach(c.lift, (st.drag && st.drag.c === c) ? 1 : (st.sel === c ? 0.5 : 0), dt, 14);
          c.s = SciSim.approach(c.s, st.drag && st.drag.c === c ? 1.05 : 1, dt, 14);
        });
      },
      draw(t) {
        const L = st.L, tall = L.tall;
        drawRoad(t);
        // 단계 칸
        L.cols.forEach((col, i) => {
          const hov = st.drag && st.hoverStage === col.id;
          const reached = st.grow >= L.fStop[i] - 0.005;
          ctx.beginPath(); rr(col.x, col.y, col.w, col.h, 14);
          ctx.fillStyle = hov ? 'rgba(124,58,237,.12)' : 'rgba(241,245,249,.8)'; ctx.fill();
          ctx.strokeStyle = hov ? RADAR_COLOR : '#cbd5e1'; ctx.lineWidth = hov ? 3 : 2; ctx.setLineDash(hov ? [] : [8, 6]); ctx.stroke(); ctx.setLineDash([]);
          T(STAGES[i].icon + ' ' + STAGES[i].name, col.x + col.w / 2, col.y + 28, 15.5, { a: 'center', c: reached ? RADAR_COLOR : MUTED, w: 800 });
          for (let k = 0; k < CAP; k++) { const sp = L.slot(i, k); if (!st.cards.some((c) => c.placed === col.id && c.slot === k)) { ctx.strokeStyle = '#dbe3ee'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]); ctx.beginPath(); rr(sp.x, sp.y, L.cw, L.ch, 10); ctx.stroke(); ctx.setLineDash([]); } }
        });
        T('🎒 활동·과목 카드 (' + st.cards.filter((c) => !c.placed).length + '장 남음)', tall ? 10 : 12, L.trayLabel, 14, { c: MUTED, w: 800 });
        const order = st.cards.slice().sort((a, b) => ((st.drag && st.drag.c === a) ? 1 : 0) - ((st.drag && st.drag.c === b) ? 1 : 0));
        order.forEach((c) => {
          const x = c.x.value + shk(c.shake), y = c.y.value - c.lift * 5;
          ctx.save(); const cx = x + L.cw / 2, cy = y + L.ch / 2; ctx.translate(cx, cy); ctx.scale(c.s, c.s); ctx.translate(-cx, -cy);
          cardFace(c, x, y, L.cw, L.ch, { lift: c.lift, sel: st.sel === c });
          ctx.restore();
        });
        if (st.sel && !st.drag) L.cols.forEach((col, i) => D.ring(col.x + col.w / 2, col.y + 28, 14, t + i * 0.3, { color: RADAR_COLOR, width: 2.5 }));
        drawGoal(t);
        if (!st.complete && subjPlaced() === 0 && actPlaced() === 0) T('카드를 끌어서 알맞은 단계 칸에 놓으세요', tall ? 240 : 400, tall ? 22 : 22, 14.5, { a: 'center', c: MUTED, w: 800 });
      },
      grab(p) { return !!cardAt(p); },
      down(p) {
        if (st.sel) { const col = colAt(p), c = cardAt(p); if (col && !c) { place(st.sel, col.id); return false; } }
        const c = cardAt(p);
        if (!c) { st.sel = null; return false; }
        st.drag = { c, ox: p.x - c.x.value, oy: p.y - c.y.value, sx: p.x, sy: p.y, moved: false };
        Sound.click();
        return true;
      },
      move(p) {
        const d = st.drag; if (!d) return;
        if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
        if (d.moved) { d.c.x.value = d.c.x.target = p.x - d.ox; d.c.y.value = d.c.y.target = p.y - d.oy; d.c.x.velocity = d.c.y.velocity = 0; }
        const col = colAt({ x: d.c.x.value + st.L.cw / 2, y: d.c.y.value + st.L.ch / 2 }) || colAt(p);
        st.hoverStage = col ? col.id : null;
      },
      up(p) {
        const d = st.drag; if (!d) return;
        st.drag = null; st.hoverStage = null;
        if (!d.moved) { st.sel = st.sel === d.c ? null : d.c; return; }
        const col = colAt({ x: d.c.x.value + st.L.cw / 2, y: d.c.y.value + st.L.ch / 2 }) || colAt(p);
        if (col) place(d.c, col.id); else relayout(false);
      },
      hover(p) { return cardAt(p) ? 'grab' : null; },
      toolbar() { return { reset: true }; },
    };
  })();

  /* =========================================================
     ④ 완성된 나의 과학 학습 계획 카드 (이 기기에만 저장)
     ========================================================= */
  SC.plan = (() => {
    const st = { fp: 1, btn: null, savedAt: -9 };
    const rs = () => SC.road.st;
    function layout() {
      const tall = isTall();
      st.card = tall ? { x: 8, y: 10, w: 464, h: 700 } : { x: 40, y: 12, w: 720, h: 520 };
      st.btn = tall ? { x: 80, y: 730, w: 320, h: 56 } : { x: 240, y: 538, w: 320, h: 52 };
    }
    function save() {
      if (ME.saved) return;
      ME.saved = true; st.savedAt = now();
      const R = rs();
      store.set('m3-my-science-path:plan', { job: R.job, stages: STAGES.map((s) => ({ stage: s.id, items: R.cards.filter((c) => c.placed === s.id).map((c) => c.text) })) });
      fx(st.btn.x + st.btn.w / 2, st.btn.y + st.btn.h / 2, ['#14a058', '#ffd34d', '#fff']);
      say('이 기기에 저장했어요. 다른 사람에게는 보내지 않아요.', LAY.w / 2, st.btn.y - 6, 'good', 3);
    }
    return {
      st, layout, save,
      get saved() { return ME.saved; },
      reset() { ME.saved = false; },
      enter() {
        if (!st.card) layout();
        st.fp = 0; SciSim.tween(st, { fp: 1 }, { duration: 0.7, ease: 'outBack' });
        setTimeout(() => PT.burst(st.card.x + st.card.w / 2, st.card.y + 60, { count: 24, speed: 220, size: 4, colors: ['#ffd34d', '#7c3aed', '#2563eb', '#16a34a', '#f472b6'], gravity: 220 }), RM ? 0 : 450);
      },
      update(dt) {},
      draw(t) {
        const c = st.card, tall = isTall(), R = rs();
        if (!R.job) R.buildDeck(planJobId());
        const j = JOB[R.job];
        ctx.save();
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        ctx.translate(cx, cy); ctx.scale(Math.max(0.04, st.fp), 1); ctx.translate(-cx, -cy);
        D.glow(cx, cy, c.w * 0.62, '#ffd34d', 0.16);
        card(c.x, c.y, c.w, c.h, { r: 20, grad: ['#ffffff', '#f6f8fc'], stroke: '#7c3aed', lw: 3.5, lift: 0.8 });
        ctx.save(); ctx.beginPath(); rr(c.x, c.y, c.w, c.h, 20); ctx.clip(); ctx.fillStyle = RADAR_COLOR; ctx.fillRect(c.x, c.y, c.w, 64); ctx.restore();
        T('📋 나의 과학 학습 계획', c.x + 20, c.y + 40, 22, { c: '#fff', w: 800 });
        emo(j.icon, c.x + c.w - 44, c.y + 32, 34);
        T(j.name, c.x + c.w - 70, c.y + 40, 17, { a: 'right', c: '#fff', w: 800, fit: 180 });
        let y = c.y + 94;
        T('🎯 목표 직업: ' + j.icon + ' ' + j.name, c.x + 22, y, 17, { c: INK, w: 800 });
        const top = answered() === ACTS.length ? (() => { const v = axisValues(); return v.map((q, i) => i).sort((a, b) => v[b] - v[a]).slice(0, 2).map((i) => AXES[i].name); })() : [];
        if (top.length) T('나의 관심 영역: ' + top.join(' · '), c.x + c.w - 22, y, 14.5, { a: 'right', c: RADAR_COLOR, w: 800 });
        y += 14;
        if (tall) {
          STAGES.forEach((s, i) => {
            const items = R.cards.filter((q) => q.placed === s.id).sort((a, b) => a.slot - b.slot);
            T(s.icon + ' ' + s.name, c.x + 22, y + 24, 16, { c: RADAR_COLOR, w: 800 });
            let yy = y + 36;
            if (!items.length) { T('(비어 있어요)', c.x + 34, yy + 16, 14, { c: '#9aa8bb', w: 700 }); yy += 28; }
            items.forEach((q) => { const hh = para(q.text, c.x + 36, yy + 16, c.w - 70, 14.5, { c: INK, w: 700, lh: 19, max: 2 }); T('•', c.x + 24, yy + 16, 15, { c: RADAR_COLOR, w: 800 }); yy += Math.max(26, hh + 8); });
            y = yy + 8;
          });
        } else {
          const cw3 = (c.w - 44 - 24) / 3;
          STAGES.forEach((s, i) => {
            const x = c.x + 22 + i * (cw3 + 12), items = R.cards.filter((q) => q.placed === s.id).sort((a, b) => a.slot - b.slot);
            ctx.beginPath(); rr(x, y + 4, cw3, 304, 14); ctx.fillStyle = 'rgba(241,245,249,.9)'; ctx.fill();
            T(s.icon + ' ' + s.name, x + cw3 / 2, y + 34, 16, { a: 'center', c: RADAR_COLOR, w: 800 });
            items.forEach((q, k) => {
              const yy = y + 50 + k * 64;
              ctx.beginPath(); rr(x + 8, yy, cw3 - 16, 56, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 1.6; ctx.stroke();
              para(q.text, x + 16, yy + (wrapLines(q.text, cw3 - 32, fnt(14, 700)).length > 1 ? 22 : 33), cw3 - 32, 14, { c: INK, w: 700, lh: 18, max: 2 });
            });
            if (!items.length) T('(비어 있어요)', x + cw3 / 2, y + 90, 14, { a: 'center', c: '#9aa8bb', w: 700 });
          });
          y += 322;
        }
        const ny = tall ? Math.max(y + 6, c.y + c.h - 100) : c.y + c.h - 68;
        para('💡 ' + j.need, c.x + 22, ny + 14, c.w - 44, 15, { c: '#0f766e', w: 800, lh: 21, max: tall ? 3 : 2 });
        T('🔒 이 기기에만 저장돼요', c.x + c.w - 16, c.y + c.h - 12, 12.5, { a: 'right', c: MUTED, w: 700 });
        ctx.restore();
        const b = st.btn, saved = ME.saved;
        ctx.save();
        const k = 1 + (saved ? 0 : Math.sin(t * 4) * 0.012);
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(k, k); ctx.translate(-b.w / 2, -b.h / 2);
        card(0, 0, b.w, b.h, { r: 16, fill: saved ? '#f0fdf4' : RADAR_COLOR, stroke: saved ? '#14a058' : null, lw: 2.5, lift: saved ? 0 : 0.6 });
        T(saved ? '✔ 이 기기에 저장했어요' : '💾 이 기기에 저장하기', b.w / 2, b.h / 2 + 6, 17, { a: 'center', c: saved ? '#14a058' : '#fff', w: 800 });
        ctx.restore();
      },
      down(p) { if (st.fp > 0.8 && inR(p, st.btn)) { if (!ME.saved) save(); else Sound.click(); } return false; },
      hover(p) { return inR(p, st.btn) ? 'pointer' : null; },
      toolbar() { return {}; },
    };
  })();
  /* =========================================================
     미션
     ========================================================= */
  const jobNames = (ids) => ids.map((id) => JOB[id].name).join(', ');
  const levels = [
    {
      title: '나의 관심 찾기', short: '나의 관심', icon: '🧭', phase: '관찰',
      features: ['interest', 'pick'],
      intro: '<p class="si-q">❓ 탐구 질문: 내가 꿈꾸는 직업에는 어떤 과학이 필요할까?</p>' +
        '<p>먼저 <b>나는 어떤 활동을 좋아하는지</b> 알아봐요. 좋아하는 활동 8가지에 답하면 <b>관심 영역 레이더 차트</b>가 그려져요. 그 차트와 어울리는 직업 중 <b>관심 직업 3개</b>를 골라요.</p>' +
        '<p>🔒 이름은 묻지 않아요. 결과는 이 기기에만 저장돼요.</p>',
      setup() { setScene('interest'); showHint('웃는 얼굴을 눌러 좋아하는 정도를 알려 주세요', 6000); },
      recap: '좋아하는 활동에서 나의 관심 영역을 찾고, 그와 어울리는 직업을 골라 진로를 생각해 볼 수 있어요.',
      summary: '<p><b>나의 관심 영역 6가지</b>: 탐구, 만들기, 돌봄, 표현, 자연, 자료 분석</p><p>좋아하는 활동을 살펴보면 나의 관심 영역을 알 수 있고, 그 영역과 어울리는 직업을 찾아 진로를 생각해 볼 수 있다. 검사 결과는 이 기기에만 저장된다.</p>',
      missions: [
        {
          title: '관심 영역 레이더 차트 만들기',
          goal: '좋아하는 활동 <b>8가지</b>에 모두 답해서 나의 관심 영역 레이더 차트를 완성하세요.',
          hint: '😐 별로 · 🙂 좋아요 · 😍 아주 좋아요 중에서 나에게 맞는 얼굴을 눌러요. 정답은 없어요!',
          setup() { setScene('interest'); },
          check: () => answered() === ACTS.length,
          status: () => '답한 질문 <b>' + answered() + '/' + ACTS.length + '</b>',
          hold: 0.8,
          explain: '레이더 차트는 여러 영역을 한눈에 비교하는 그래프예요. 바깥쪽으로 튀어나온 영역이 지금 나의 <b>관심이 큰 영역</b>이에요. 관심은 경험에 따라 바뀔 수 있어요.',
        },
        {
          title: '관심 직업 3개 고르기',
          goal: '직업 카드의 <b>어울림(★)</b>을 참고해서 관심 직업 <b>3개</b>를 고르세요.',
          hint: '카드를 누르면 하는 일과 어울리는 관심 영역이 나와요. 별이 많아도, 적어도 내가 끌리는 직업을 골라도 좋아요.',
          setup() { setScene('pick'); },
          check: () => ME.jobs.length === 3,
          status: () => '고른 직업 <b>' + ME.jobs.length + '/3</b>' + (ME.jobs.length ? ' · ' + jobNames(ME.jobs) : ''),
          hold: 0.6,
          explain: '건축가, 조향사, SF 작가처럼 <b>과학자가 아니어도</b> 과학이 필요한 직업이 많아요. 다음 단계에서 고른 직업에 어떤 과학이 필요한지 알아봐요.',
        },
      ],
    },
    {
      title: '모든 직업 속 과학', short: '직업 속 과학', icon: '🏷️', phase: '탐구',
      features: ['tag'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 나의 관심 영역을 찾고 관심 직업 3개를 골랐어요.</div>' +
        '<p>건축가, 조향사, SF 작가처럼 <b>과학과 멀어 보이는 직업</b>에도 과학이 숨어 있어요. 직업 카드에 <b>필요한 과학 분야</b>(물리·화학·생명·지구)를 붙여 봐요.</p>',
      setup() { SC.tag.reset(); setScene('tag'); showHint('분야 표시를 끌어서 직업 카드에 붙여 보세요', 6000); },
      recap: '기술·공학·사회·예술·문학 분야의 직업에도 과학 지식이 필요해요.',
      summary: '<ul><li>건축가: 물리(힘의 평형·재료), 지구(지진·지반)</li><li>과학수사관: 생명(DNA·지문), 화학(성분 분석)</li><li>조향사: 화학(향 물질)</li><li>음향 엔지니어: 물리(소리의 파동)</li><li>미술품 복원가: 화학(물감 성분), 물리(빛)</li><li>SF 작가: 모든 분야</li></ul><p>과학과 직접 관련이 없어 보이는 직업에서도 과학은 중요하고 유용하다.</p>',
      missions: [
        {
          title: '직업에 필요한 과학 분야 붙이기', manual: true,
          goal: '직업 카드 <b>6장</b>에 필요한 과학 분야를 모두 붙이세요.',
          hint: '그 직업이 하는 일을 떠올려 보세요. 틀리면 이유를 알려 줘요. 카드 아래의 점선 칸 수가 필요한 분야의 수예요.',
          setup() { setScene('tag'); },
          check: () => {
            const T0 = SC.tag.st.cards.filter((c) => c.tags.length < JOB[c.id].tags.length);
            if (!T0.length) return true;
            return '아직 분야를 다 붙이지 못한 직업이 있어요: ' + T0.map((c) => JOB[c.id].name).join(', ');
          },
          explain: '건축가는 <b>물리·지구</b>, 과학수사관은 <b>생명·화학</b>, 조향사는 <b>화학</b>, 음향 엔지니어는 <b>물리</b>, 미술품 복원가는 <b>화학·물리</b>, SF 작가는 <b>모든 분야</b>의 과학이 필요해요.',
        },
        {
          type: 'quiz', title: '모든 직업 속 과학',
          setup() { setScene('tag'); },
          goal: '건축가, 조향사, SF 작가 같은 직업에 대한 설명으로 알맞은 것은?',
          choices: ['과학과 거리가 멀어서 과학 학습이 필요 없다', '과학 지식이 일의 바탕이 되거나 일을 더 잘하도록 도와준다', '과학자가 되어야만 과학 지식을 쓸 수 있다', '한 직업에는 반드시 한 가지 과학 분야만 필요하다'],
          answer: 1,
          feedback: ['건축가는 힘의 평형과 지진, 조향사는 화학이 필요했어요.', '', '건축가·조향사·요리사는 과학자가 아니지만 과학 지식을 써요.', 'SF 작가는 네 분야를 모두, 건축가는 물리와 지구를 썼어요.'],
          explain: '과학 지식은 과학자만 쓰는 것이 아니에요. 기술, 공학, 사회, 예술, 문학 분야의 직업에서도 <b>과학의 중요성과 유용성</b>을 찾을 수 있어요.',
        },
      ],
    },
    {
      title: '고등학교 과학 과목 지도', short: '고등학교 과학', icon: '🗺️', phase: '설명',
      features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모든 직업에 필요한 과학 분야가 있다는 것을 확인했어요.</div>' +
        '<p>이제 그 과학을 어디서 배울 수 있는지 볼까요? <b>2022 개정 교육과정 고등학교 과학 과목</b>은 <b>공통 → 일반 선택 → 진로 선택 · 융합 선택</b>으로 이어져요. 내 관심 직업에 필요한 과목을 골라 길을 이어 봐요.</p>',
      setup() { SC.map.reset(); setScene('map'); showHint('아래에서 직업을 고르고 필요한 과목을 눌러 보세요', 6000); },
      recap: '고등학교 과학은 공통 과목(통합과학 등)을 배운 뒤, 관심과 진로에 따라 일반 선택, 진로 선택, 융합 선택 과목을 골라요.',
      summary: '<ul><li><b>공통</b>: 통합과학1·2, 과학탐구실험1·2</li><li><b>일반 선택</b>: 물리학, 화학, 생명과학, 지구과학</li><li><b>진로 선택</b>: 역학과 에너지, 전자기와 양자, 물질과 에너지, 화학 반응의 세계, 세포와 물질대사, 생물의 유전, 지구시스템과학, 행성우주과학</li><li><b>융합 선택</b>: 과학의 역사와 문화, 기후변화와 환경생태, 융합과학 탐구</li></ul><p>진로에 맞는 과목을 골라 단계적으로 배운다.</p>',
      missions: [
        {
          title: '내 직업의 과목 경로 만들기',
          goal: '아래에서 관심 직업을 하나 고르고, 그 직업에 필요한 <b>과학 과목</b>을 눌러 길을 완성하세요.',
          hint: '과목을 누르면 설명이 나와요. 직업이 하는 일과 관련 있는 과목을 찾아보세요. 통합과학1은 모든 직업의 출발점이에요.',
          setup() { setScene('map'); },
          check: () => SC.map.doneCount() >= 1,
          status: () => { const id = SC.map.current(), s = SC.map.st; const set = s.tapped[id] || new Set(); return JOB[id].name + ' · 과목 <b>' + set.size + '/' + JOB[id].path.length + '</b>'; },
          hold: 0.8,
          explain: '진로가 정해지지 않았어도 괜찮아요. 관심 분야가 생기면 그 분야의 일반 선택 과목과 진로 선택 과목을 골라 더 깊이 배울 수 있어요.',
        },
        {
          type: 'quiz', title: '모든 학생이 배우는 과목',
          setup() { setScene('map'); },
          goal: '고등학교에서 모든 학생이 공통으로 배우는 과학 과목은?',
          choices: ['물리학', '통합과학', '지구시스템과학', '기후변화와 환경생태'],
          answer: 1,
          feedback: ['물리학은 일반 선택 과목이에요. 원하는 학생이 골라서 배워요.', '', '지구시스템과학은 진로 선택 과목이에요.', '기후변화와 환경생태는 융합 선택 과목이에요.'],
          explain: '<b>통합과학</b>은 공통 과목이라 모든 학생이 배워요. 이후 관심에 따라 일반 선택, 진로 선택, 융합 선택 과목을 골라요.',
        },
        {
          type: 'quiz', title: '과목 이어 배우기',
          setup() { setScene('map'); },
          goal: '진로 선택 과목 ‘화학 반응의 세계’를 배우기 전에 먼저 배우면 좋은 일반 선택 과목은?',
          choices: ['물리학', '화학', '생명과학', '지구과학'],
          answer: 1,
          feedback: ['물리학은 ‘역학과 에너지’, ‘전자기와 양자’로 이어져요.', '', '생명과학은 ‘세포와 물질대사’, ‘생물의 유전’으로 이어져요.', '지구과학은 ‘지구시스템과학’, ‘행성우주과학’으로 이어져요.'],
          explain: '일반 선택 <b>화학</b>을 배운 뒤 진로 선택 <b>물질과 에너지</b>, <b>화학 반응의 세계</b>로 이어서 더 깊이 배울 수 있어요.',
        },
      ],
    },
    {
      title: '나만의 과학 학습 계획', short: '학습 계획', icon: '🛣️', phase: '적용',
      features: ['road', 'plan'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직업에 필요한 고등학교 과목 경로를 만들어 봤어요.</div>' +
        '<p>이제 <b>중3 → 고1 → 고2·3 → 진로</b>로 이어지는 나만의 <b>과학 학습 계획</b>을 세워요. 과목 카드와 <b>독서·탐구 활동·동아리·체험</b> 카드를 알맞은 단계에 놓으면 길이 자라요.</p>' +
        '<p>비슷한 진로를 가진 친구들과 모둠을 만들어 함께 조사하고 발표해도 좋아요.</p>',
      setup() { ME.planJob = ME.pathJob || myJobs()[0]; ME.saved = false; SC.road.buildDeck(planJobId()); setScene('road'); showHint('카드를 끌어서 알맞은 단계 칸에 놓으세요', 6000); },
      recap: '필요한 과목과 활동을 단계별로 계획하면 진로를 위한 과학 학습의 방향이 분명해져요.',
      summary: '<p><b>나의 과학 학습 계획</b>: 중3(지금) → 고1(공통 과목) → 고2·3(선택 과목) → 진로</p><ul><li>과목: 직업에 필요한 일반·진로·융합 선택 과목</li><li>활동: 독서, 탐구 활동, 동아리, 체험</li></ul><p>비슷한 진로를 가진 친구들과 모둠을 만들어 함께 조사하고 발표할 수 있다. 계획은 상황에 따라 바꿀 수 있다.</p>',
      missions: [
        {
          title: '학습 로드맵 완성하기', manual: true,
          goal: '과목 카드를 모두, 활동 카드를 <b>3장 이상</b> 알맞은 단계 칸에 놓아 로드맵을 완성하세요.',
          hint: '통합과학1 같은 공통 과목은 고1, 선택 과목은 고2·3 칸에 놓아요. 직업과 관련 없는 과목 카드도 섞여 있어요.',
          setup() { setScene('road'); },
          check: () => SC.road.problem() || true,
          explain: '공통 과목은 <b>고1</b>에서 배우고, 관심과 진로에 따라 <b>고2·3</b>에서 선택 과목을 골라요. 독서, 탐구 활동, 동아리, 체험은 중3인 지금부터 시작할 수 있어요.',
        },
        {
          title: '나의 학습 계획 카드 저장하기',
          goal: '완성된 계획 카드를 확인하고 <b>이 기기에 저장</b>하세요.',
          hint: '카드 아래의 ‘이 기기에 저장하기’ 버튼을 눌러요.',
          setup() { setScene('plan'); },
          check: () => ME.saved,
          status: () => (ME.saved ? '저장 <b>완료</b>' : '저장 버튼을 눌러요'),
          hold: 0.5,
          explain: '계획 카드는 <b>이 기기에만</b> 저장돼요. 이름이나 개인 정보는 받지 않아요. 계획은 경험에 따라 바꾸어도 좋아요.',
        },
        {
          type: 'quiz', title: '과학 학습 계획 세우기',
          setup() { setScene('plan'); },
          goal: '진로를 위한 과학 학습 계획을 세우는 방법으로 가장 알맞은 것은?',
          choices: ['관심 직업과 필요한 과학 분야를 정하고, 단계별로 과목과 활동을 계획한다', '모든 과목을 한꺼번에 시작한다', '직업은 정하지 말고 계획 없이 공부한다', '친구가 고른 과목을 그대로 따라 고른다'],
          answer: 0,
          feedback: ['', '한꺼번에 하면 어려워요. 단계별로 나누어 계획해야 해요.', '관심 분야를 정해 보면 필요한 과목이 더 분명해져요. (바뀌어도 괜찮아요)', '친구와 진로가 다를 수 있어요. 나의 관심과 직업에 맞게 계획해요.'],
          explain: '관심 직업과 필요한 과학 분야를 정한 뒤 <b>단계별로 과목과 활동을 계획</b>하면 돼요. 계획은 경험에 따라 언제든 고칠 수 있어요.',
        },
      ],
    },
  ];

  /* =========================================================
     시작: 무대 → 게임 엔진
     ========================================================= */
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  game = SciSim.game({
    simId: 'm3-my-science-path',
    mount: '#game',
    badge: '진로 설계사',
    homeHref: '../../index.html#g3',
    featureLabels: {
      interest: '🧭 관심 영역 레이더 차트', pick: '⭐ 관심 직업 고르기', tag: '🏷️ 직업 속 과학 태그', map: '🗺️ 고등학교 과학 과목 지도', road: '🛣️ 학습 로드맵', plan: '📋 학습 계획 카드',
    },
    onFeatures(set) { F = new Set(set); syncUI(); },
    onMissionStart() { S.fb = null; hintEl.classList.add('hide'); },
    onHint() { S.hintAt = now(); },
    onComplete() { syncUI(); },
    levels,
  });
  function drawOverlay(t) {
    PT.draw(ctx);
    S.rings = S.rings.filter((r) => now() - r.t0 < 0.6);
    S.rings.forEach((r) => {
      const k = (now() - r.t0) / 0.6;
      ctx.strokeStyle = rgba('#14a058', 0.8 * (1 - k)); ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, 14 + k * 46, 0, TAU); ctx.stroke();
    });
    const fb = S.fb;
    if (fb) {
      const age = now() - fb.t0;
      if (age > fb.dur) { S.fb = null; return; }
      const a = clamp(age / 0.15, 0, 1) * clamp((fb.dur - age) / 0.3, 0, 1);
      const w = Math.min(330, LAY.w - 24);
      const bh = para(fb.text, 0, 0, w - 24, 14, { measure: true, lh: 19 });
      const h = bh + 20;
      const x = clamp(fb.x - w / 2, 12, LAY.w - w - 12);
      const y = clamp(fb.y - h - 12, 8, LAY.h - h - 8);
      ctx.save(); ctx.globalAlpha = a;
      bubble(x, y, w, h, clamp(fb.x, x + 20, x + w - 20), y + h + 10, { r: 12, fill: fb.kind === 'bad' ? '#fff1f2' : '#ffffff', stroke: fb.kind === 'bad' ? '#f87171' : '#cbd5e1' });
      para(fb.text, x + 12, y + 24, w - 24, 14, { lh: 19, c: fb.kind === 'bad' ? '#9f1239' : '#334155', w: 700 });
      ctx.restore();
    }
  }
  function frame(dt) {
    const t = now();
    Object.keys(SC).forEach((k) => SC[k].update && SC[k].update(dt));
    PT.update(dt);
    view.clear(BG);
    if (S.sceneP < 1 && S.from) {
      const e = S.sceneP, Wd = LAY.w, Hd = LAY.h;
      ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(-e * Wd * 0.2, 0); SC[S.from].draw(t); ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp(e * 1.5, 0, 1);
      const sc = 0.96 + 0.04 * e;
      ctx.translate((1 - e) * Wd * 0.25 + Wd / 2, Hd / 2); ctx.scale(sc, sc); ctx.translate(-Wd / 2, -Hd / 2);
      SC[S.scene].draw(t);
      ctx.restore();
    } else SC[S.scene].draw(t);
    drawOverlay(t);
  }
  syncUI();
  let uiT = 0;
  SciSim.loop((dt) => {
    frame(dt);
    uiT += dt;
    if (uiT > 0.25) { uiT = 0; syncUI(); }
  });

  /* ---------- 테스트용 디버그 훅 ---------- */
  window.__sim = {
    S, SC, JOBS, ME, game,
    get layout() { return LAY.kind; },
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / LAY.w, y: r.top + y * r.height / LAY.h }; },
    setScene,
  };
})();
