/* =========================================================
   중3 Ⅷ. 과학과 나의 미래 — 과학 관련 직업과 미래 [9과23-01]
   ① [관찰] 직업 탐색: 분야 필터가 있는 직업 카드 도감 (카드를 뒤집어 하는 일 보기)
   ② [탐구] 직업 속 과학: 직업 ↔ 중학교 과학 개념 연결선
   ③ [분석] 미래의 변화: 과학기술 카드를 켜면 바뀌는 미래 도시 + 직업 변화 분류(모두 '예상')
   ④ [적용] 새 직업 설계: 미래 문제 → 과학 지식·기술 → 나만의 미래 직업 카드
   ※ 미래 모습은 모두 '예상'임을 화면에 표시. 입력 내용은 이 기기(localStorage)에만 저장하며 이름은 받지 않음.
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
  // 받침 여부에 따라 은/는 · 이/가 고르기 (이름이 바뀌어도 문장이 자연스럽게)
  const hasBatchim = (s) => {
    const ch = String(s).trim().slice(-1), c = ch.charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    if (/[0-9]/.test(ch)) return '013678'.indexOf(ch) >= 0;
    return false;
  };
  const iGa = (s) => s + (hasBatchim(s) ? '이' : '가');
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 계속 */ } },
  };

  /* =========================================================
     자료
     ========================================================= */
  const FIELDS = [
    { id: 'phys', name: '물리·공학', color: '#2563eb' },
    { id: 'chem', name: '화학', color: '#8b5cf6' },
    { id: 'bio', name: '생명', color: '#16a34a' },
    { id: 'earth', name: '지구·우주', color: '#0ea5e9' },
    { id: 'fusion', name: '융합', color: '#d97706' },
  ];
  const FIELD = {};
  FIELDS.forEach((f) => { FIELD[f.id] = f; });
  // 직업 카드 16장: 하는 일 · 쓰는 과학 지식(중학교 단원 연결) · 필요한 역량
  const JOBS = [
    { id: 'semi', f: 'phys', icon: '💾', name: '반도체 공학자', work: '스마트폰과 컴퓨터에 들어가는 작은 반도체 칩을 설계하고 만들어요.', sci: '전류·전압·저항', unit: '중2 · 전기와 자기', skill: ['꼼꼼함', '수학적 사고'] },
    { id: 'robot', f: 'phys', icon: '🤖', name: '로봇 공학자', work: '센서와 모터로 움직이는 로봇을 설계하고 움직임을 프로그램해요.', sci: '힘과 운동, 전기 회로', unit: '중1 · 힘의 작용 / 중2 · 전기와 자기', skill: ['창의적 설계', '코딩'] },
    { id: 'renew', f: 'phys', icon: '☀️', name: '신재생 에너지 기술자', work: '태양광·풍력으로 전기를 만드는 설비를 개발하고 관리해요.', sci: '에너지 전환과 전기 에너지', unit: '중3 · 운동과 에너지', skill: ['문제 해결력', '환경 감수성'] },
    { id: 'drug', f: 'chem', icon: '💊', name: '신약 개발 연구원', work: '병을 고치는 새 약 물질을 찾고 효과와 안전을 시험해요.', sci: '화학 반응, 분자', unit: '중3 · 화학 반응의 규칙성', skill: ['끈기', '실험 설계'] },
    { id: 'cosm', f: 'chem', icon: '🧴', name: '화장품 연구원', work: '피부에 좋은 성분을 섞고 분리해 크림과 로션을 만들어요.', sci: '혼합물, 용해와 분리', unit: '중2 · 물질의 특성', skill: ['관찰력', '창의성'] },
    { id: 'mater', f: 'chem', icon: '🧱', name: '신소재 공학자', work: '더 가볍고 튼튼한 새로운 물질을 만들어 제품에 활용해요.', sci: '원소와 화합물', unit: '중2 · 물질의 구성', skill: ['호기심', '정확한 실험'] },
    { id: 'biotech', f: 'bio', icon: '🧬', name: '생명 공학 연구원', work: '유전 정보를 연구해 병을 치료하고 새 품종을 개발해요.', sci: '유전, 세포', unit: '중3 · 생식과 유전', skill: ['탐구력', '윤리 의식'] },
    { id: 'vet', f: 'bio', icon: '🐾', name: '수의사', work: '동물의 병을 진단하고 치료해 동물과 사람의 건강을 지켜요.', sci: '동물의 몸(기관계)', unit: '중2 · 동물과 에너지', skill: ['책임감', '공감 능력'] },
    { id: 'food', f: 'bio', icon: '🍱', name: '식품 연구원', work: '영양이 풍부하고 안전한 새 식품을 개발해요.', sci: '소화와 영양소', unit: '중2 · 동물과 에너지', skill: ['관찰력', '위생 의식'] },
    { id: 'doctor', f: 'bio', icon: '🩺', name: '의사', work: '환자의 몸을 살펴 병을 진단하고 치료해요.', sci: '순환·호흡·배설 등 기관계', unit: '중2 · 동물과 에너지', skill: ['공감 능력', '책임감'] },
    { id: 'weather', f: 'earth', icon: '⛅', name: '기상 예보관', work: '기압과 구름 자료를 분석해 날씨를 예보해요.', sci: '기단과 전선, 일기도', unit: '중3 · 날씨와 기후변화', skill: ['자료 해석력', '빠른 판단'] },
    { id: 'quake', f: 'earth', icon: '🌋', name: '지진 연구원', work: '지진이 일어나는 원인을 연구하고 피해를 줄일 방법을 찾아요.', sci: '지권, 판의 경계', unit: '중2 · 지권의 변화', skill: ['끈기', '관측 분석력'] },
    { id: 'ocean', f: 'earth', icon: '🌊', name: '해양 연구원', work: '바다의 해류와 수온을 관측하고 해양 환경을 연구해요.', sci: '해수의 순환', unit: '중3 · 수권과 해수의 순환', skill: ['체력', '탐구력'] },
    { id: 'astro', f: 'earth', icon: '🔭', name: '천문학자', work: '망원경으로 별과 우주를 관측하고 우주의 비밀을 연구해요.', sci: '별과 우주', unit: '중2 · 별과 우주', skill: ['호기심', '수학적 사고'] },
    { id: 'data', f: 'fusion', icon: '📊', name: '데이터 과학자', work: '많은 자료를 모아 분석해 숨은 규칙을 찾아요.', sci: '자료 해석, 탐구 방법', unit: '중1 · 과학적 탐구 방법', skill: ['통계·코딩', '논리적 사고'] },
    { id: 'climate', f: 'fusion', icon: '🌍', name: '기후변화 대응 전문가', work: '기후 자료를 분석해 온실가스를 줄이고 피해를 막을 방법을 설계해요.', sci: '복사 평형과 온실 효과', unit: '중3 · 날씨와 기후변화', skill: ['융합적 사고', '소통 능력'] },
  ];
  const JOB = {};
  JOBS.forEach((j) => { JOB[j.id] = j; });

  // 2단계: 직업 ↔ 이전 단원 개념
  const CONCEPTS = [
    { id: 'earth', icon: '🪨', name: '지권', sub: '판의 경계', unit: '중2 · 지권의 변화' },
    { id: 'digest', icon: '🍚', name: '소화와 영양소', sub: '', unit: '중2 · 동물과 에너지' },
    { id: 'elec', icon: '⚡', name: '전기', sub: '전류·전압·저항', unit: '중2 · 전기와 자기' },
    { id: 'front', icon: '🌦️', name: '기단과 전선', sub: '', unit: '중3 · 날씨와 기후변화' },
    { id: 'react', icon: '⚗️', name: '화학 반응', sub: '', unit: '중3 · 화학 반응의 규칙성' },
  ];
  const CONCEPT = {};
  CONCEPTS.forEach((c) => { CONCEPT[c.id] = c; });
  const LINK_JOBS = [
    { job: 'weather', c: 'front', fb: '기상 예보관은 찬 공기와 따뜻한 공기가 만나는 경계(전선)를 보고 날씨를 예보해요.' },
    { job: 'semi', c: 'elec', fb: '반도체 칩은 전류가 흐르는 아주 작은 전기 회로예요. 전류·전압을 배운 단원을 떠올려 보세요.' },
    { job: 'drug', c: 'react', fb: '약 물질은 여러 물질이 반응해서 만들어요. 물질이 변하는 반응을 배운 단원을 떠올려 보세요.' },
    { job: 'quake', c: 'earth', fb: '지진은 지구 겉부분의 판이 만나는 경계에서 자주 일어나요. 지구의 땅을 다룬 단원이에요.' },
    { job: 'food', c: 'digest', fb: '식품 연구원은 음식 속 영양소가 몸에서 소화·흡수되는 과정을 고려해 식품을 개발해요.' },
  ];

  // 3단계: 과학기술 5가지와 도시의 변화(모두 예상)
  const TECHS = [
    { id: 'ai', icon: '🧠', name: '인공지능', color: '#7c3aed', jobs: [['new', '인공지능 윤리 전문가'], ['down', '자료 입력 사무원']] },
    { id: 'robot', icon: '🦾', name: '로봇', color: '#ea580c', jobs: [['new', '로봇 정비 기술자'], ['down', '공장 단순 조립원']] },
    { id: 'climate', icon: '🌍', name: '기후 위기 대응', color: '#16a34a', jobs: [['new', '탄소 중립 전문가']] },
    { id: 'space', icon: '🚀', name: '우주 개발', color: '#0284c7', jobs: [['new', '우주 쓰레기 관제 전문가']] },
    { id: 'bio', icon: '🧬', name: '생명 공학', color: '#db2777', jobs: [['new', '스마트 팜 전문가'], ['new', '디지털 헬스케어 전문가']] },
  ];
  const TECH = {};
  TECHS.forEach((t) => { TECH[t.id] = t; });
  const SORT_CATS = [
    { id: 'down', icon: '▼', name: '줄어듦', color: '#e11d48', soft: '#fff1f2' },
    { id: 'up', icon: '▲', name: '늘어남', color: '#2563eb', soft: '#eff6ff' },
    { id: 'new', icon: '✨', name: '새로 생김', color: '#7c3aed', soft: '#f5f3ff' },
  ];
  const SORT_JOBS = [
    { id: 'factory', icon: '🏭', name: '공장 단순 조립원', cat: 'down', why: '같은 동작을 반복하는 일은 로봇이 대신하기 쉬워 줄어들 것으로 예상해요.' },
    { id: 'entry', icon: '⌨️', name: '자료 입력 사무원', cat: 'down', why: '자료를 옮겨 적는 단순 반복 업무는 인공지능이 대신하기 쉬워 줄어들 것으로 예상해요.' },
    { id: 'cashier', icon: '🧾', name: '계산대 계산원', cat: 'down', why: '무인 계산대가 늘면 단순 계산 업무는 줄어들 것으로 예상해요.' },
    { id: 'inspect', icon: '🔎', name: '단순 검수원', cat: 'down', why: '제품의 겉모습을 보고 불량을 찾는 일은 인공지능 카메라가 대신하기 쉬워 줄어들 것으로 예상해요.' },
    { id: 'data', icon: '📊', name: '데이터 과학자', cat: 'up', why: '자료가 점점 많아져서 지금도 있는 이 직업이 더 많이 필요해질 것으로 예상해요.' },
    { id: 'robot', icon: '🤖', name: '로봇 공학자', cat: 'up', why: '로봇이 널리 쓰이면 로봇을 설계하는 이 직업이 더 필요해질 것으로 예상해요.' },
    { id: 'renew', icon: '☀️', name: '신재생 에너지 기술자', cat: 'up', why: '탄소 중립을 위해 지금도 있는 이 직업이 더 필요해질 것으로 예상해요.' },
    { id: 'biotech', icon: '🧬', name: '생명 공학 연구원', cat: 'up', why: '질병 치료와 식량 문제에 쓰이는 이 직업이 더 필요해질 것으로 예상해요.' },
    { id: 'ethic', icon: '⚖️', name: '인공지능 윤리 전문가', cat: 'new', why: '인공지능이 널리 쓰이면서 새로 생길 것으로 예상하는 직업이에요.' },
    { id: 'repair', icon: '🔧', name: '로봇 정비 기술자', cat: 'new', why: '로봇이 많아지면 로봇을 고치고 관리하는 일이 새로 생길 것으로 예상해요.' },
    { id: 'farm', icon: '🌱', name: '스마트 팜 전문가', cat: 'new', why: '센서와 인터넷으로 농사를 짓는 스마트 팜이 늘면서 새로 생길 것으로 예상해요.' },
    { id: 'health', icon: '📱', name: '디지털 헬스케어 전문가', cat: 'new', why: '건강 자료를 모아 관리하는 서비스가 늘면서 새로 생길 것으로 예상해요.' },
  ];

  // 4단계: 미래 문제 · 필요한 과학 지식 · 기술
  const KNOW_ALL = {
    heat: '열의 이동', greenhouse: '온실 효과와 기후', plant: '광합성과 식물', wave: '파동과 소리', gene: '유전', separate: '혼합물의 분리',
    force: '힘과 운동', gravity: '중력', explore: '우주 탐사', digest: '소화와 영양소', organ: '기관계(순환·호흡)', sense: '자극과 반응',
    react: '화학 반응', sea: '수권과 해양 환경', star: '별의 밝기와 색', circuit: '전류와 저항', moon: '달의 위상', erosion: '풍화와 토양', light: '빛의 반사',
  };
  const TECH_ALL = {
    ai: ['🧠', '인공지능·빅데이터'], energy: ['☀️', '신재생 에너지'], robot: ['🤖', '로봇'], sat: ['🛰️', '인공위성'], bio: ['🧬', '생명 공학'], vr: ['🥽', '가상 현실'],
  };
  const PROBLEMS = [
    { id: 'heat', icon: '🌡️', name: '폭염 도시', desc: '여름마다 도시가 너무 뜨거워져 쓰러지는 사람이 늘어요.',
      kRel: ['heat', 'greenhouse', 'plant'], kBad: ['wave', 'gene', 'separate'], tRel: ['ai', 'energy'], tBad: ['robot', 'vr'],
      names: { ai: '폭염 예측 데이터 분석가', energy: '도시 냉각 에너지 설계사' }, base: '도시 열 환경 전문가',
      kFb: { wave: '소리를 다루는 파동은 도시의 더위를 줄이는 일과 거리가 멀어요.', gene: '유전은 생물의 특징이 자손에게 전해지는 원리라, 도시의 더위와는 거리가 멀어요.', separate: '혼합물을 분리하는 방법은 도시의 더위와 거리가 멀어요.' },
      tFb: { robot: '로봇은 폭염의 원인을 예측하거나 전기를 만드는 데 직접 쓰이기보다 몸을 쓰는 일을 도와요.', vr: '가상 현실은 체험에 쓰이지만 도시의 열을 줄이는 데 직접 쓰이지는 않아요.' } },
    { id: 'space', icon: '🛰️', name: '우주 쓰레기', desc: '고장 난 위성과 로켓 조각이 우주를 떠돌며 우주선을 위협해요.',
      kRel: ['force', 'gravity', 'explore'], kBad: ['digest', 'plant', 'react'], tRel: ['robot', 'sat'], tBad: ['bio', 'vr'],
      names: { robot: '우주 쓰레기 수거 로봇 운영사', sat: '궤도 안전 관제 전문가' }, base: '우주 환경 전문가',
      kFb: { digest: '소화와 영양소는 우리 몸의 이야기라 우주 쓰레기와는 거리가 멀어요.', plant: '식물의 광합성은 우주 쓰레기를 치우는 일과 직접 관련이 적어요.', react: '화학 반응보다 우주에서 물체가 움직이는 원리가 더 중요해요.' },
      tFb: { bio: '생명 공학은 생명체를 다루는 기술이라 우주 쓰레기를 치우는 일과 거리가 멀어요.', vr: '가상 현실만으로는 우주 쓰레기를 치울 수 없어요.' } },
    { id: 'aging', icon: '👵', name: '고령 사회', desc: '나이 드신 분이 많아져 건강 관리와 돌봄이 더 필요해져요.',
      kRel: ['organ', 'digest', 'sense'], kBad: ['erosion', 'light', 'moon'], tRel: ['robot', 'ai'], tBad: ['sat', 'energy'],
      names: { robot: '돌봄 로봇 설계·정비사', ai: '건강 데이터 돌봄 설계사' }, base: '시니어 건강 전문가',
      kFb: { erosion: '풍화와 토양은 땅의 이야기라 사람의 건강 돌봄과 거리가 멀어요.', light: '빛의 반사는 건강 돌봄과 직접 관련이 적어요.', moon: '달의 위상은 건강 돌봄과 관련이 적어요.' },
      tFb: { sat: '인공위성은 통신·관측에 쓰이지만 몸을 돌보는 일에는 직접 쓰이지 않아요.', energy: '신재생 에너지는 전기를 만드는 기술이라 돌봄과는 거리가 멀어요.' } },
    { id: 'plastic', icon: '🧴', name: '플라스틱 쓰레기', desc: '버려진 플라스틱이 바다와 땅을 오염시키고 있어요.',
      kRel: ['separate', 'react', 'sea'], kBad: ['star', 'circuit', 'moon'], tRel: ['bio', 'robot'], tBad: ['sat', 'vr'],
      names: { bio: '플라스틱 분해 미생물 연구원', robot: '자원 순환 로봇 기술자' }, base: '자원 순환 전문가',
      kFb: { star: '별의 밝기와 색은 플라스틱 문제와 거리가 멀어요.', circuit: '전류와 저항은 플라스틱 쓰레기를 줄이는 일과 직접 관련이 적어요.', moon: '달의 위상은 플라스틱 문제와 관련이 적어요.' },
      tFb: { sat: '인공위성은 플라스틱 쓰레기를 분해하거나 분리하는 데 직접 쓰이지 않아요.', vr: '가상 현실은 플라스틱 쓰레기를 직접 줄이지 못해요.' } },
  ];
  const PROB = {};
  PROBLEMS.forEach((p) => { PROB[p.id] = p; });
  // 칩 순서(고정): 관련 있는 것과 없는 것을 섞어 둠
  const mixOrder = (rel, bad) => [rel[0], bad[0], rel[1], bad[1], rel[2], bad[2]];
  const mixOrderT = (rel, bad) => [rel[0], bad[0], rel[1], bad[1]];

  /* =========================================================
     상태 · 무대
     ========================================================= */
  const S = { scene: 'dex', from: null, sceneP: 1, fb: null, rings: [], pops: [], hintAt: -99 };
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
  const SCENE_LABEL = { dex: '📖 과학 직업 도감', link: '🔗 직업 속 과학 연결', city: '🏙️ 미래 도시 (예상)', sort: '🗂️ 직업 변화 분류 (예상)', design: '🪪 나의 미래 직업 카드' };
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
  const ctrlCard = $('#ctrlCard'), sceneLabel = $('#sceneLabel'), tbReset = $('#tbReset'), jobName = $('#jobName');
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
    jobName.hidden = !tb.name;
  }

  /* =========================================================
     ① 직업 카드 도감 (분야 필터 + 카드 뒤집기)
     ========================================================= */
  function cardFront(job, w, h, seen, t) {
    const f = FIELD[job.f];
    const r = h * 0.1;
    card(0, 0, w, h, { r, grad: ['#ffffff', '#f3f6fb'], stroke: rgba(f.color, 0.55), lw: 2.5, shadow: false });
    ctx.save(); ctx.beginPath(); rr(0, 0, w, h, r); ctx.clip();
    ctx.fillStyle = f.color; ctx.fillRect(0, 0, w, h * 0.2);
    ctx.fillStyle = rgba('#fff', 0.14); ctx.beginPath(); ctx.arc(w * 0.92, -h * 0.05, h * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
    T(f.name, w / 2, h * 0.14, Math.max(11, h * 0.095), { a: 'center', c: '#fff', w: 800 });
    const g = ctx.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, h * 0.3);
    g.addColorStop(0, rgba(f.color, 0.18)); g.addColorStop(1, rgba(f.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h * 0.5, h * 0.3, 0, TAU); ctx.fill();
    emo(job.icon, w / 2, h * 0.5, h * 0.33);
    T(job.name, w / 2, h * 0.88, Math.max(12, h * 0.12), { a: 'center', c: INK, w: 800, fit: w - 14 });
    if (seen) {
      ctx.fillStyle = '#14a058'; ctx.beginPath(); ctx.arc(w - h * 0.1, h * 0.31, h * 0.075, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, h * 0.02); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const cx = w - h * 0.1, cy = h * 0.31, k = h * 0.075;
      ctx.beginPath(); ctx.moveTo(cx - k * 0.45, cy); ctx.lineTo(cx - k * 0.1, cy + k * 0.35); ctx.lineTo(cx + k * 0.5, cy - k * 0.35); ctx.stroke();
    }
  }
  function cardBack(job, w, h) {
    const f = FIELD[job.f];
    const r = h * 0.06;
    card(0, 0, w, h, { r, grad: ['#ffffff', '#f6f8fc'], stroke: f.color, lw: 3, shadow: false });
    ctx.save(); ctx.beginPath(); rr(0, 0, w, h, r); ctx.clip();
    ctx.fillStyle = f.color; ctx.fillRect(0, 0, w, 66);
    ctx.restore();
    emo(job.icon, 40, 34, 38);
    T(job.name, 70, 42, 24, { c: '#fff', w: 800, fit: w - 200 });
    chip(w - 104, 21, 90, 26, f.name, { fill: 'rgba(255,255,255,.25)', c: '#fff', size: 13 });
    T('🛠️ 하는 일', 24, 96, 15, { c: f.color, w: 800 });
    para(job.work, 24, 120, w - 48, 18, { lh: 25, c: INK, w: 700, max: 3 });
    T('🔗 쓰는 과학 지식', 24, 212, 15, { c: f.color, w: 800 });
    chip(24, 222, Math.min(w - 48, 330), 30, job.sci, { fill: rgba(f.color, 0.12), stroke: rgba(f.color, 0.5), c: INK, size: 15, lw: 1.5 });
    T('📚 ' + job.unit, 26, 276, 13.5, { c: MUTED, w: 700, fit: w - 52 });
    T('💪 필요한 역량', 24, 308, 15, { c: f.color, w: 800 });
    job.skill.forEach((s, i) => chip(24 + i * 136, 318, 126, 30, s, { fill: '#fff', stroke: f.color, c: INK, size: 14, lw: 2 }));
  }

  SC.dex = (() => {
    const st = { filter: 'all', cards: [], seen: new Set(), open: null, o: 0, r0: null, tabs: [], press: null, hover: null, tabAt: {}, vis: new Set(JOBS.map((j) => j.id)) };
    JOBS.forEach((j) => st.cards.push({
      job: j, x: new SciSim.Spring(0, { stiffness: 190, damping: 22 }), y: new SciSim.Spring(0, { stiffness: 190, damping: 22 }),
      a: 1, s: 1, ta: 1, ts: 1, lift: 0, w: 170, h: 112, flipAt: -9,
    }));
    const TABS = [{ id: 'all', name: '전체' }].concat(FIELDS);
    const detail = () => (isTall() ? { w: 440, h: 330, cx: 240, cy: 400 } : { w: 560, h: 368, cx: 400, cy: 300 });
    function layout(instant) {
      const tall = isTall();
      const tw = tall ? 73 : 120, gap = tall ? 5 : 8, th = tall ? 38 : 40, x0 = tall ? 8 : 20;
      st.tabs = TABS.map((tb, i) => ({ id: tb.id, name: tb.name, x: x0 + i * (tw + gap), y: tall ? 10 : 10, w: tw, h: th }));
      const cols = tall ? 3 : 4, cw = tall ? 144 : 170, ch = tall ? 108 : 112, gx = tall ? 10 : 14, gy = tall ? 9 : 12;
      const gx0 = (LAY.w - (cols * cw + (cols - 1) * gx)) / 2, gy0 = tall ? 60 : 66;
      let n = 0;
      st.cards.forEach((c) => {
        c.w = cw; c.h = ch;
        const vis = st.vis.has(c.job.id);
        if (vis) {
          const col = n % cols, row = Math.floor(n / cols); n++;
          c.x.target = gx0 + col * (cw + gx); c.y.target = gy0 + row * (ch + gy);
          c.ta = 1; c.ts = 1;
        } else { c.ta = 0; c.ts = 0.8; }
        if (instant) { c.x.value = c.x.target; c.y.value = c.y.target; c.a = c.ta; c.s = c.ts; }
      });
      st.bar = { x: 20, y: tall ? 762 : 562, w: LAY.w - 40, h: tall ? 56 : 30 };
    }
    function setFilter(id) {
      st.filter = id;
      st.vis = new Set(JOBS.filter((j) => id === 'all' || j.f === id).map((j) => j.id));
      layout(false);
      st.tabAt[id] = now();
    }
    function cardAt(p) {
      for (let i = st.cards.length - 1; i >= 0; i--) {
        const c = st.cards[i];
        if (c.ta < 0.5) continue;
        if (inR(p, { x: c.x.value, y: c.y.value, w: c.w, h: c.h })) return c;
      }
      return null;
    }
    function openCard(c) {
      st.open = c;
      st.r0 = { x: c.x.value, y: c.y.value, w: c.w, h: c.h };
      const before = fieldsSeen();
      st.seen.add(c.job.id);
      const after = fieldsSeen();
      st.o = 0;
      SciSim.tween(st, { o: 1 }, { duration: 0.62, ease: 'inOutQuad' });
      Sound.click();
      if (after.size > before.size) {
        const tb = st.tabs.find((x) => x.id === c.job.f);
        if (tb) { fx(tb.x + tb.w / 2, tb.y + tb.h, [FIELD[c.job.f].color, '#ffd34d', '#fff']); st.tabAt[c.job.f] = now(); }
      }
    }
    function closeCard() {
      if (!st.open || st.closing) return;
      st.closing = true;
      SciSim.tween(st, { o: 0 }, { duration: 0.45, ease: 'inOutQuad', onDone: () => { st.open = null; st.closing = false; } });
      Sound.click();
    }
    function fieldsSeen() { const s = new Set(); st.seen.forEach((id) => s.add(JOB[id].f)); return s; }
    function update(dt) {
      st.cards.forEach((c) => {
        c.x.update(dt); c.y.update(dt);
        c.a = SciSim.approach(c.a, c.ta, dt, 12); c.s = SciSim.approach(c.s, c.ts, dt, 12);
        const wantLift = (st.hover === c || st.press === c) ? 1 : 0;
        c.lift = SciSim.approach(c.lift, wantLift, dt, 14);
      });
    }
    function drawCards(t) {
      st.cards.forEach((c) => {
        if (c.a < 0.02) return;
        if (st.open === c && st.o > 0.02) return;
        const cx = c.x.value + c.w / 2, cy = c.y.value + c.h / 2 - c.lift * 4;
        const sc = c.s * (st.press === c ? 0.96 : 1 + c.lift * 0.03);
        ctx.save();
        ctx.globalAlpha *= clamp(c.a, 0, 1);
        ctx.translate(cx, cy); ctx.scale(sc, sc);
        softShadow(-c.w / 2, -c.h / 2, c.w, c.h, 12, c.lift, 1);
        ctx.translate(-c.w / 2, -c.h / 2);
        cardFront(c.job, c.w, c.h, st.seen.has(c.job.id), t);
        ctx.restore();
      });
    }
    function drawTabs(t) {
      const fs = fieldsSeen();
      st.tabs.forEach((tb) => {
        const on = st.filter === tb.id;
        const col = tb.id === 'all' ? SUBJ : FIELD[tb.id].color;
        const pop = clamp(1 - (now() - (st.tabAt[tb.id] || -9)) / 0.4, 0, 1);
        const dy = -Math.sin(pop * Math.PI) * 4;
        ctx.save(); ctx.translate(0, dy);
        card(tb.x, tb.y, tb.w, tb.h, { r: tb.h / 2, fill: on ? col : '#fff', stroke: on ? col : '#cbd5e1', lw: 2, lift: on ? 0.5 : 0 });
        T(tb.name, tb.x + tb.w / 2, tb.y + tb.h / 2 + 5, isTall() ? 13 : 15, { a: 'center', c: on ? '#fff' : INK, w: 800, fit: tb.w - 10 });
        if (tb.id !== 'all' && fs.has(tb.id)) {
          ctx.fillStyle = '#14a058'; ctx.beginPath(); ctx.arc(tb.x + tb.w - 6, tb.y + 4, 9, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(tb.x + tb.w - 10, tb.y + 4); ctx.lineTo(tb.x + tb.w - 7, tb.y + 7); ctx.lineTo(tb.x + tb.w - 2, tb.y + 1); ctx.stroke();
        }
        ctx.restore();
      });
    }
    function drawBar(t) {
      const b = st.bar, n = st.seen.size;
      T('열람한 카드 ' + n + ' / ' + JOBS.length, b.x, b.y + 15, 14, { c: MUTED, w: 800 });
      const bx = isTall() ? b.x : b.x + 168, bw = isTall() ? b.w : 230, by = isTall() ? b.y + 26 : b.y + 4;
      ctx.fillStyle = '#dbe3ee'; ctx.beginPath(); rr(bx, by, bw, 12, 6); ctx.fill();
      st.barV = SciSim.approach(st.barV || 0, n / JOBS.length, 0.016, 8);
      ctx.fillStyle = '#14a058'; ctx.beginPath(); rr(bx, by, Math.max(12, bw * (n / JOBS.length)), 12, 6); ctx.fill();
      const fs = fieldsSeen();
      const dx = isTall() ? b.x + 6 : bx + bw + 24, dy = isTall() ? b.y + 49 : b.y + 10;
      if (isTall()) { /* 아래 줄에 분야 점 */ }
      T('열람한 분야', isTall() ? b.x + 120 : dx, isTall() ? b.y + 15 : b.y + 15, 14, { c: MUTED, w: 800, a: 'left' });
      FIELDS.forEach((f, i) => {
        const x = (isTall() ? b.x + 232 : dx + 96) + i * 26, y = isTall() ? b.y + 10 : b.y + 10;
        ctx.fillStyle = fs.has(f.id) ? f.color : '#dbe3ee'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
        if (fs.has(f.id)) D.check(x, y, 6, 1, { color: f.color });
      });
    }
    function drawDetail(t) {
      const c = st.open;
      if (!c || st.o < 0.001) return;
      const dt = detail(), e = st.o;
      ctx.fillStyle = 'rgba(15,23,42,' + (0.5 * e).toFixed(3) + ')';
      ctx.fillRect(0, 0, LAY.w, LAY.h);
      const r0 = st.r0;
      const rw = lerp(r0.w, dt.w, e), rh = lerp(r0.h, dt.h, e);
      const cx = lerp(r0.x + r0.w / 2, dt.cx, e), cy = lerp(r0.y + r0.h / 2, dt.cy, e) - Math.sin(e * Math.PI) * 14;
      const flip = clamp((e - 0.18) / 0.7, 0, 1);
      const sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * flip)));
      const back = flip > 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sx * rw / dt.w, rh / dt.h);
      // 그림자는 뒤집히는 동안 가로로 줄어듦
      softShadow(-dt.w / 2, -dt.h / 2, dt.w, dt.h, 20, 1, e);
      ctx.translate(-dt.w / 2, -dt.h / 2);
      if (back) cardBack(c.job, dt.w, dt.h); else cardFront(c.job, dt.w, dt.h, true, t);
      ctx.restore();
      if (e > 0.95 && !st.closing) {
        T('카드를 누르면 닫혀요', dt.cx, dt.cy + dt.h / 2 + 28, 15, { a: 'center', c: '#fff', w: 800 });
      }
    }
    return {
      st, layout, update, setFilter,
      enter() { st.open = null; st.o = 0; },
      draw(t) { drawTabs(t); drawCards(t); drawBar(t); drawDetail(t); },
      down(p) {
        if (st.open) { if (st.o > 0.9) closeCard(); return false; }
        const tb = st.tabs.find((x) => inR(p, x));
        if (tb) { Sound.click(); setFilter(tb.id); return false; }
        const c = cardAt(p);
        if (c) { st.press = c; setTimeout(() => { if (st.press === c) st.press = null; }, 140); openCard(c); }
        return false;
      },
      hover(p) { const c = st.open ? null : cardAt(p); st.hover = c; return c || st.tabs.find((x) => inR(p, x)) ? 'pointer' : (st.open ? 'pointer' : null); },
      toolbar() { return {}; },
      seenCount: () => st.seen.size,
      fieldsSeen,
    };
  })();
  /* =========================================================
     ② 직업 ↔ 중학교 과학 개념 연결선
     ========================================================= */
  SC.link = (() => {
    const J_ORDER = ['weather', 'semi', 'drug', 'quake', 'food'];
    const C_ORDER = ['digest', 'react', 'front', 'elec', 'earth'];
    const st = { jr: {}, cr: {}, links: {}, sel: null, drag: null, hoverC: null, shake: {}, retract: null, msg: null, msgAt: -9, panel: null, cShake: {} };
    const LJ = {};
    LINK_JOBS.forEach((l) => { LJ[l.job] = l; });
    function layout() {
      const tall = isTall();
      const jw = tall ? 196 : 262, cw = tall ? 196 : 262, h = tall ? 84 : 62;
      const top = tall ? 92 : 84, pitch = tall ? 108 : 78;
      const jx = tall ? 12 : 24, cx = LAY.w - cw - (tall ? 12 : 24);
      J_ORDER.forEach((id, i) => { st.jr[id] = { x: jx, y: top + i * pitch, w: jw, h }; });
      C_ORDER.forEach((id, i) => { st.cr[id] = { x: cx, y: top + i * pitch, w: cw, h }; });
      st.panel = tall ? { x: 12, y: top + 5 * pitch + 6, w: LAY.w - 24, h: 150 } : { x: 24, y: 490, w: LAY.w - 48, h: 96 };
    }
    const anchorJ = (id) => { const r = st.jr[id]; return { x: r.x + r.w, y: r.y + r.h / 2 }; };
    const anchorC = (id) => { const r = st.cr[id]; return { x: r.x, y: r.y + r.h / 2 }; };
    function bez(a, b, t) {
      const dx = Math.max(60, (b.x - a.x) * 0.45);
      const u = 1 - t;
      const x1 = a.x + dx, x2 = b.x - dx;
      return {
        x: u * u * u * a.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y,
      };
    }
    function strokeCurve(a, b, p, color, w, dash) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      const n = 28;
      for (let i = 0; i <= n * p; i++) { const q = bez(a, b, Math.min(p, i / n)); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
      if (p < 1) { const q = bez(a, b, p); ctx.lineTo(q.x, q.y); }
      ctx.stroke(); ctx.restore();
    }
    const count = () => Object.keys(st.links).length;
    function jobAt(p) { for (const id of J_ORDER) if (inR(p, st.jr[id])) return id; return null; }
    function conAt(p) { for (const id of C_ORDER) if (inR(p, st.cr[id])) return id; return null; }
    const usedC = (c) => Object.keys(st.links).some((j) => st.links[j].c === c);
    function tryLink(j, c, pos) {
      if (st.links[j] || usedC(c)) return;
      const job = JOB[j], con = CONCEPT[c];
      if (LJ[j].c === c) {
        const L = { c, p: 0, t0: now() };
        st.links[j] = L;
        SciSim.tween(L, { p: 1 }, { duration: 0.55, ease: 'outCubic' });
        st.msg = { j, c }; st.msgAt = now();
        const a = anchorC(c);
        setTimeout(() => fx(a.x + 30, a.y, [FIELD[job.f].color, '#ffd34d', '#5eead4']), RM ? 0 : 420);
        st.cShake[c] = now();
        if (count() === J_ORDER.length) setTimeout(() => say('다섯 직업이 모두 중학교 과학과 이어졌어요!', LAY.w / 2, 56, 'good', 3.2), 700);
      } else {
        st.shake[j] = now();
        const a = anchorJ(j);
        st.retract = { j, x: pos.x, y: pos.y, t0: now() };
        say('‘' + con.name + '’' + (hasBatchim(con.name) ? '은' : '는') + ' 아니에요. ' + iGa(job.name) + ' 하는 일을 떠올려 봐요. ' + job.work, clamp(pos.x, 160, LAY.w - 160), clamp(pos.y - 10, 120, LAY.h - 100), 'bad', 4);
        Sound.wrong && Sound.wrong();
      }
      st.sel = null;
    }
    function chipJob(id, t) {
      const r = st.jr[id], j = JOB[id], f = FIELD[j.f];
      const linked = !!st.links[id], sel = st.sel === id || (st.drag && st.drag.id === id);
      const sh = shk(st.shake[id] || -9);
      const lift = sel ? 1 : 0;
      ctx.save(); ctx.translate(sh, sel ? -3 : 0);
      card(r.x, r.y, r.w, r.h, { r: 14, fill: linked ? '#f0fdf4' : '#fff', stroke: sel ? f.color : (linked ? '#14a058' : '#d5deea'), lw: sel ? 3.5 : 2.5, lift });
      ctx.fillStyle = f.color; ctx.beginPath(); rr(r.x, r.y, 9, r.h, 5); ctx.fill();
      emo(j.icon, r.x + 38, r.y + r.h / 2, isTall() ? 34 : 32);
      if (isTall()) {
        para(j.name, r.x + 66, r.y + 34, r.w - 76, 16, { w: 800, c: INK, lh: 20, max: 2 });
        T(f.name, r.x + 66, r.y + r.h - 14, 13, { c: f.color, w: 800 });
      } else {
        T(j.name, r.x + 66, r.y + 28, 17, { w: 800, c: INK, fit: r.w - 100 });
        T(f.name, r.x + 66, r.y + 49, 13, { c: f.color, w: 800 });
      }
      if (linked) D.check(r.x + r.w - 16, r.y + 16, 9, 1);
      else if (!st.drag && !st.sel) { const p = 0.5 + 0.5 * Math.sin(t * 3 + J_ORDER.indexOf(id)); ctx.fillStyle = rgba(f.color, 0.25 + 0.4 * p); ctx.beginPath(); ctx.arc(r.x + r.w - 12, r.y + r.h / 2, 5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function chipCon(id, t) {
      const r = st.cr[id], c = CONCEPT[id];
      const linked = usedC(id);
      const hov = st.drag && st.hoverC === id && !linked;
      const sh = (st.cShake[id] && now() - st.cShake[id] < 0.5) ? Math.sin((now() - st.cShake[id]) * 30) * 0 : 0;
      const pulse = linked ? clamp(1 - (now() - (st.cShake[id] || -9)) / 0.5, 0, 1) : 0;
      ctx.save();
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, sc = 1 + pulse * 0.07 + (hov ? 0.04 : 0);
      ctx.translate(cx + sh, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      card(r.x, r.y, r.w, r.h, { r: 14, fill: linked ? '#f0fdf4' : (hov ? '#f1f5f9' : '#fff'), stroke: hov ? SUBJ : (linked ? '#14a058' : '#d5deea'), lw: hov ? 3.5 : 2.5, lift: hov ? 1 : 0 });
      ctx.fillStyle = SUBJ; ctx.beginPath(); rr(r.x + r.w - 9, r.y, 9, r.h, 5); ctx.fill();
      emo(c.icon, r.x + 36, r.y + r.h / 2, isTall() ? 32 : 30);
      const tx = r.x + 64;
      if (isTall()) {
        para(c.name, tx, r.y + 30, r.w - 84, 16, { w: 800, c: INK, lh: 19, max: 2 });
        para(c.sub || c.unit, tx, r.y + r.h - 26, r.w - 80, 12.5, { w: 700, c: MUTED, lh: 15, max: 2 });
      } else {
        T(c.name, tx, r.y + 27, 17, { w: 800, c: INK, fit: r.w - 90 });
        T(c.unit, tx, r.y + 48, 13, { c: MUTED, w: 700, fit: r.w - 90 });
      }
      if (!linked && !st.drag && !st.sel) { /* 빈 연결점 */ }
      ctx.restore();
      // 연결점
      const a = anchorC(id);
      ctx.fillStyle = linked ? '#14a058' : '#fff'; ctx.strokeStyle = linked ? '#14a058' : '#94a3b8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    function drawPanel(t) {
      const pn = st.panel;
      const age = now() - st.msgAt;
      card(pn.x, pn.y, pn.w, pn.h, { r: 16, fill: '#fff', stroke: '#d5deea', lw: 2 });
      const pad = 18;
      if (!st.msg) {
        T('📝 연결 기록', pn.x + pad, pn.y + 30, 15, { c: MUTED, w: 800 });
        para('왼쪽 직업 카드를 끌어서(또는 눌러서) 그 직업에 쓰이는 중학교 과학 개념에 연결해 보세요. 연결하면 이유가 이곳에 기록돼요.', pn.x + pad, pn.y + 58, pn.w - pad * 2, 15.5, { c: INK, w: 700, lh: 22 });
        return;
      }
      const j = JOB[st.msg.j], c = CONCEPT[st.msg.c], f = FIELD[j.f];
      const a = clamp(age / 0.35, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 8);
      emo(j.icon, pn.x + pad + 14, pn.y + 30, 26);
      T(j.name + '  ↔  ' + c.icon + ' ' + c.name, pn.x + pad + 38, pn.y + 36, 18, { c: f.color, w: 800, fit: pn.w - pad * 2 - 40 });
      para(LJ[j.id].fb, pn.x + pad, pn.y + 66, pn.w - pad * 2, 15.5, { c: INK, w: 700, lh: 22, max: isTall() ? 4 : 2 });
      T('📚 ' + c.unit, pn.x + pad, pn.y + pn.h - 12, 13.5, { c: MUTED, w: 800 });
      ctx.restore();
    }
    return {
      st, layout, count,
      reset() { st.links = {}; st.sel = null; st.drag = null; st.msg = null; st.retract = null; st.shake = {}; st.cShake = {}; },
      enter() { if (!st.jr.weather) layout(); },
      update(dt) {},
      draw(t) {
        T('직업 카드를 끌어서 그 직업에 쓰이는 과학 개념에 이어 보세요', LAY.w / 2, isTall() ? 34 : 40, isTall() ? 15 : 18, { a: 'center', c: MUTED, w: 800, fit: LAY.w - 24 });
        T('직업', st.jr.weather.x + st.jr.weather.w / 2, st.jr.weather.y - 12, 14, { a: 'center', c: MUTED, w: 800 });
        T('중학교 과학 개념', st.cr.digest.x + st.cr.digest.w / 2, st.cr.digest.y - 12, 14, { a: 'center', c: MUTED, w: 800 });
        // 연결선 (완료)
        Object.keys(st.links).forEach((j) => {
          const L = st.links[j], a = anchorJ(j), b = anchorC(L.c), col = FIELD[JOB[j].f].color;
          strokeCurve(a, b, Math.max(0.001, L.p), rgba(col, 0.28), 11);
          strokeCurve(a, b, Math.max(0.001, L.p), col, 4);
          if (L.p >= 1 && !RM) {
            for (let i = 0; i < 3; i++) {
              const q = bez(a, b, ((t * 0.35 + i / 3) % 1));
              ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(q.x, q.y, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
            }
          }
        });
        // 틀린 연결: 되감기
        if (st.retract) {
          const k = (now() - st.retract.t0) / 0.5;
          if (k >= 1) st.retract = null;
          else {
            const a = anchorJ(st.retract.j), e = 1 - EZ.outCubic(k);
            const px = a.x + (st.retract.x - a.x) * e, py = a.y + (st.retract.y - a.y) * e;
            ctx.save(); ctx.strokeStyle = rgba('#e11d48', 1 - k); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([8, 7]);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
            T('✕', px, py + 6, 20, { a: 'center', c: rgba('#e11d48', 1 - k), w: 800 });
          }
        }
        J_ORDER.forEach((id) => chipJob(id, t));
        C_ORDER.forEach((id) => chipCon(id, t));
        // 끌고 있는 선
        if (st.drag && st.drag.moved) {
          const a = anchorJ(st.drag.id), col = FIELD[JOB[st.drag.id].f].color;
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -t * 30;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(st.drag.x, st.drag.y); ctx.stroke(); ctx.restore();
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(st.drag.x, st.drag.y, 9, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        } else if (st.sel) {
          // 눌러서 고르기: 연결하지 않은 개념 칸이 맥박
          C_ORDER.forEach((c) => { if (!usedC(c)) { const a = anchorC(c); D.ring(a.x, a.y, 11, t + C_ORDER.indexOf(c) * 0.2, { color: SUBJ, width: 2.5 }); } });
        }
        drawPanel(t);
        // 진행 표시
        const n = count();
        const pw = 130;
        T(n + ' / ' + J_ORDER.length + ' 연결', LAY.w - 24, isTall() ? 62 : 62, 14, { a: 'right', c: n === J_ORDER.length ? '#14a058' : MUTED, w: 800 });
      },
      grab(p) { return !!jobAt(p) && !st.links[jobAt(p)]; },
      down(p) {
        const c = conAt(p);
        if (c && st.sel && !usedC(c)) { tryLink(st.sel, c, p); return false; }
        const j = jobAt(p);
        if (j && !st.links[j]) {
          st.drag = { id: j, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
          Sound.click();
          return true;
        }
        st.sel = null;
        return false;
      },
      move(p) {
        const d = st.drag; if (!d) return;
        d.x = p.x; d.y = p.y;
        if (Math.hypot(p.x - d.sx, p.y - d.sy) > 10) d.moved = true;
        st.hoverC = conAt(p);
      },
      up(p) {
        const d = st.drag; if (!d) return;
        st.drag = null; st.hoverC = null;
        if (!d.moved) { st.sel = st.sel === d.id ? null : d.id; return; }
        const c = conAt(p);
        if (c && !usedC(c)) tryLink(d.id, c, p);
      },
      hover(p) { return (jobAt(p) && !st.links[jobAt(p)]) ? 'grab' : (st.sel && conAt(p) ? 'pointer' : null); },
      toolbar() { return {}; },
    };
  })();
  /* =========================================================
     ③-a 미래 도시 장면 (과학기술 카드를 켜면 도시가 바뀜 · 모두 '예상')
     ========================================================= */
  const TDESC = {
    ai: '많은 자료로 학습해 판단하고 예측하는 컴퓨터 프로그램',
    robot: '사람 대신 반복적이거나 위험한 일을 하는 기계',
    climate: '온실가스를 줄이고 기후 변화의 피해를 막는 기술',
    space: '로켓과 인공위성으로 우주를 탐사하고 활용하는 기술',
    bio: '생명의 원리(유전자 등)를 활용해 건강·식량 문제를 푸는 기술',
  };
  SC.city = (() => {
    const st = { on: {}, lv: {}, cards: [], R: null, cap: null, capAt: -9, chips: [], cardAt: {}, tm: 0, cars: [], rocket: { y: 0, v: 0, state: 'pad', wait: 1.5, a: 1 }, bot: { x: 205, d: 1 }, hov: null };
    TECHS.forEach((t) => { st.on[t.id] = false; st.lv[t.id] = 0; });
    const BLD = [
      { x: -6, w: 52, h: 150, c: '#b4c2d6' }, { x: 196, w: 46, h: 118, c: '#aebdd2' }, { x: 240, w: 52, h: 96, c: '#b9c6d8' },
      { x: 296, w: 108, h: 236, c: '#9fb2cc' }, { x: 410, w: 60, h: 130, c: '#b2c0d4' }, { x: 470, w: 56, h: 164, c: '#a6b6cd' },
      { x: 640, w: 52, h: 112, c: '#b4c2d6' }, { x: 688, w: 40, h: 150, c: '#a9b9cf' },
    ];
    function layout() {
      const tall = isTall();
      st.R = tall ? { x: 0, y: 0, w: 480, h: 536 } : { x: 0, y: 0, w: 800, h: 450 };
      st.cards = TECHS.map((t, i) => {
        if (tall) { const row = i < 3 ? 0 : 1, col = row ? i - 3 : i, n = row ? 2 : 3, w = 148, g = 10, x0 = (480 - (n * w + (n - 1) * g)) / 2; return { id: t.id, x: x0 + col * (w + g), y: 556 + row * 98, w, h: 88 }; }
        return { id: t.id, x: 10 + i * 158, y: 466, w: 148, h: 100 };
      });
    }
    function setTech(id, on) {
      if (st.on[id] === on) return;
      st.on[id] = on; st.cardAt[id] = now();
      const c = st.cards.find((k) => k.id === id);
      if (on) { fx(c.x + c.w / 2, c.y + 20, [TECH[id].color, '#ffd34d', '#fff']); st.cap = id; st.capAt = now(); }
      else Sound.click();
    }
    const onCount = () => TECHS.filter((t) => st.on[t.id]).length;
    function chipList() {
      const out = [];
      TECHS.forEach((t) => { if (st.on[t.id]) t.jobs.forEach((j) => out.push({ kind: j[0], name: j[1], tech: t.id })); });
      return out;
    }
    function update(dt) {
      st.tm += dt;
      TECHS.forEach((t) => { st.lv[t.id] = SciSim.approach(st.lv[t.id], st.on[t.id] ? 1 : 0, dt, RM ? 60 : 2.6); });
      // 차 움직임
      if (!st.cars.length) st.cars = [
        { x: 60, lane: 0, v: 70, c: '#e11d48' }, { x: 420, lane: 0, v: 82, c: '#f59e0b' }, { x: 700, lane: 1, v: 64, c: '#0ea5e9' }, { x: 250, lane: 1, v: 76, c: '#64748b' },
      ];
      st.cars.forEach((c) => { const dir = c.lane ? -1 : 1; c.x += dir * c.v * dt * (RM ? 0.3 : 1); if (c.x > 860) c.x = -60; if (c.x < -60) c.x = 860; });
      // 배달 로봇
      const b = st.bot; b.x += b.d * 26 * dt; if (b.x > 292) b.d = -1; if (b.x < 198) b.d = 1;
      // 로켓
      const r = st.rocket;
      if (st.lv.space > 0.6) {
        if (r.state === 'pad') { r.wait -= dt; r.a = Math.min(1, r.a + dt * 2); if (r.wait <= 0) { r.state = 'up'; r.v = 8; Sound.tick(); } }
        else if (r.state === 'up') {
          r.v += 150 * dt; r.y += r.v * dt;
          if (!RM) { const P = pt(748, -20 - r.y); PT.emit({ x: P.x + (Math.random() - 0.5) * 6, y: P.y, vx: (Math.random() - 0.5) * 24, vy: 30 + Math.random() * 20, life: 1.1, size: 6 * st.sc, color: '#e2e8f0', shape: 'smoke', grow: 10, gravity: 0 }); }
          if (r.y > 520) { r.state = 'gone'; r.wait = 1.6; r.a = 0; }
        } else if (r.state === 'gone') { r.wait -= dt; if (r.wait <= 0) { r.state = 'pad'; r.y = 0; r.v = 0; r.wait = 4.5; } }
      }
      // 칩 위치
      const list = chipList();
      const keep = [];
      list.forEach((it) => {
        let c = st.chips.find((k) => k.name === it.name);
        if (!c) { c = { name: it.name, kind: it.kind, a: 0, x: 0, y: 0, fresh: true }; st.chips.push(c); }
        c.alive = true; keep.push(c);
      });
      st.chips.forEach((c) => { if (!keep.includes(c)) c.alive = false; });
      let cx = 14, cy = isTall() ? 62 : 58;
      const maxW = st.R.w - 28;
      ctx.font = fnt(13.5, 800);
      st.chips.forEach((c) => {
        c.w = ctx.measureText((c.kind === 'new' ? '✨ ' : '▼ ') + c.name).width + 22;
      });
      keep.forEach((c) => {
        if (cx + c.w > maxW && cx > 14) { cx = 14; cy += 32; }
        c.tx = cx; c.ty = cy; cx += c.w + 8;
        if (c.fresh) { c.x = c.tx; c.y = c.ty; c.fresh = false; }
      });
      st.chips.forEach((c) => {
        c.a = SciSim.approach(c.a, c.alive ? 1 : 0, dt, 10);
        if (c.tx != null) { c.x = SciSim.approach(c.x, c.tx, dt, 12); c.y = SciSim.approach(c.y, c.ty, dt, 12); }
      });
      st.chips = st.chips.filter((c) => c.alive || c.a > 0.02);
    }
    // 지역 좌표(지면 y=0, 위가 음수) → 화면
    function pt(x, y) { return { x: x * st.sc, y: st.gy + y * st.sc }; }
    const pop = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : EZ.outBack(v));
    function drawBuilding(b, i, t) {
      const x = b.x, y = -b.h;
      const g = ctx.createLinearGradient(x, y, x + b.w, y);
      g.addColorStop(0, shade(b.c, 0.12)); g.addColorStop(1, shade(b.c, -0.1));
      ctx.fillStyle = g; ctx.fillRect(x, y, b.w, b.h);
      ctx.fillStyle = rgba('#fff', 0.35); ctx.fillRect(x, y, b.w, 4);
      const cols = Math.max(2, Math.floor((b.w - 8) / 15)), rows = Math.floor((b.h - 14) / 20);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = ((r * 7 + c * 13 + i * 5) % 5) < 2;
        ctx.fillStyle = lit ? 'rgba(235,247,255,.92)' : 'rgba(110,135,170,.45)';
        ctx.fillRect(x + 6 + c * ((b.w - 12) / cols), y + 10 + r * 20, (b.w - 12) / cols - 4, 12);
      }
    }
    function drawCar(c, t) {
      const ai = st.lv.ai, dir = c.lane ? -1 : 1, y = c.lane ? 30 : 15;
      ctx.save(); ctx.translate(c.x, y); ctx.scale(dir, 1);
      const col = mix(c.c, '#f1f8ff', ai);
      ctx.fillStyle = 'rgba(20,40,80,.2)'; ctx.beginPath(); ctx.ellipse(0, 8, 26, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); rr(-24, -10, 48, 15, 6); ctx.fill();
      ctx.fillStyle = shade(col, -0.12); ctx.beginPath(); rr(-14, -19, 28, 11, 5); ctx.fill();
      ctx.fillStyle = 'rgba(190,230,255,.95)'; ctx.fillRect(-10, -17, 9, 7); ctx.fillRect(1, -17, 10, 7);
      ctx.fillStyle = '#334155'; [-14, 14].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, 5, 5, 0, TAU); ctx.fill(); });
      if (ai > 0.05) {
        // 센서 파동
        for (let k = 0; k < 2; k++) {
          const ph = ((t * 0.9 + k * 0.5 + c.x * 0.01) % 1);
          ctx.strokeStyle = rgba('#22d3ee', ai * (1 - ph) * 0.8); ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(10, -4, 14 + ph * 26, -0.9, 0.9); ctx.stroke();
        }
        ctx.fillStyle = rgba('#22d3ee', ai); ctx.beginPath(); ctx.arc(0, -21, 3.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    function drawAIHolo(t) {
      const a = st.lv.ai; if (a < 0.02) return;
      const cx = 350, cy = -296, s = pop(a);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      D.glow(0, 0, 74, '#7c3aed', 0.3 * a);
      const N = 7, nodes = [];
      for (let i = 0; i < N; i++) { const ang = i / N * TAU + t * 0.4; nodes.push({ x: Math.cos(ang) * 46, y: Math.sin(ang) * 30 }); }
      nodes.push({ x: 0, y: 0 });
      ctx.lineWidth = 1.8;
      nodes.forEach((n, i) => nodes.forEach((m, j) => { if (j > i && (j === N || (j - i) % N <= 2)) { ctx.strokeStyle = rgba('#a78bfa', 0.55 + 0.3 * Math.sin(t * 3 + i)); ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke(); } }));
      nodes.forEach((n, i) => { ctx.fillStyle = i === N ? '#7c3aed' : '#c4b5fd'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.x, n.y, i === N ? 9 : 5.5, 0, TAU); ctx.fill(); ctx.stroke(); });
      ctx.restore();
      ctx.strokeStyle = rgba('#7c3aed', 0.5 * a); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(350, -268); ctx.lineTo(350, -240); ctx.stroke(); ctx.setLineDash([]);
    }
    function drawFactory(t) {
      const rb = st.lv.robot;
      ctx.fillStyle = lingrad(0, -84, 0, 0, ['#c7d2e0', '#a5b4c8']);
      ctx.fillRect(46, -84, 146, 84);
      ctx.fillStyle = '#8c9bb0'; ctx.fillRect(160, -128, 14, 46);
      ctx.fillStyle = rgba('#fff', 0.35); ctx.fillRect(46, -84, 146, 4);
      ctx.fillStyle = '#e8f2fb'; ctx.beginPath(); rr(56, -70, 126, 50, 6); ctx.fill();
      // 컨베이어
      ctx.fillStyle = '#64748b'; ctx.fillRect(58, -34, 122, 6);
      for (let i = 0; i < 6; i++) { const bx = 62 + ((i * 22 + t * 18) % 122); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx - 5, -45, 10, 11); }
      // 사람 노동자
      if (rb < 0.98) {
        ctx.save(); ctx.globalAlpha = 1 - rb; ctx.translate(0, rb * 12);
        [76, 108].forEach((wx, i) => { emo('🧑‍🏭', wx, -54 + Math.sin(t * 3 + i * 2) * 1.5, 26); });
        ctx.restore();
      }
      // 로봇 팔
      if (rb > 0.02) {
        const s = pop(rb);
        [92, 140].forEach((bx, i) => {
          ctx.save(); ctx.translate(bx, -34); ctx.scale(s, s);
          ctx.fillStyle = '#475569'; ctx.beginPath(); rr(-9, -4, 18, 10, 3); ctx.fill();
          const a1 = -1.15 + Math.sin(t * 2 + i * 1.7) * 0.35, a2 = 1.5 + Math.sin(t * 2 + i * 1.7 + 1) * 0.5;
          ctx.strokeStyle = '#ea580c'; ctx.lineCap = 'round'; ctx.lineWidth = 8;
          const ex = Math.cos(a1) * 26, ey = Math.sin(a1) * 26, hx = ex + Math.cos(a1 + a2) * 22, hy = ey + Math.sin(a1 + a2) * 22;
          ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(ex, ey - 2); ctx.stroke();
          ctx.lineWidth = 6; ctx.strokeStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(ex, ey - 2); ctx.lineTo(hx, hy - 2); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey - 2, 4, 0, TAU); ctx.fill();
          ctx.restore();
        });
      }
      // 배달 로봇
      if (rb > 0.02) {
        const b = st.bot, s = pop(rb), bob = Math.sin(t * 9) * 0.8;
        ctx.save(); ctx.translate(b.x, -10 + bob); ctx.scale(s * b.d, s);
        ctx.fillStyle = 'rgba(20,40,80,.2)'; ctx.beginPath(); ctx.ellipse(0, 10, 15, 3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f97316'; ctx.beginPath(); rr(-13, -10, 26, 16, 5); ctx.fill();
        ctx.fillStyle = '#fed7aa'; ctx.beginPath(); rr(-9, -22, 18, 12, 3); ctx.fill();
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(-4, -3, 2, 0, TAU); ctx.arc(5, -3, 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(-8, 7, 4, 0, TAU); ctx.arc(8, 7, 4, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    function drawTurbine(x, h, t, s) {
      if (s <= 0.01) return;
      ctx.save(); ctx.translate(x, 0); ctx.scale(s, s);
      ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(-3.5, 0); ctx.lineTo(3.5, 0); ctx.lineTo(1.6, -h); ctx.lineTo(-1.6, -h); ctx.closePath(); ctx.fill();
      ctx.translate(0, -h);
      ctx.rotate(t * 1.2 + x);
      ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-1.5, -54); ctx.lineTo(1.5, -54); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function drawTree(x, s, t) {
      if (s <= 0.01) return;
      ctx.save(); ctx.translate(x, 2); ctx.scale(s, s);
      ctx.fillStyle = '#92400e'; ctx.fillRect(-2.5, -16, 5, 16);
      const sw = Math.sin(t * 1.4 + x) * 1.2;
      ctx.fillStyle = '#22a55a'; ctx.beginPath(); ctx.arc(sw, -26, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(sw - 4, -30, 7, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function drawSolar(x, y, w, s) {
      if (s <= 0.01) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, -8); ctx.lineTo(w, -2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * i / 4, -8 * i / 4 + 6 * (1 - i / 4)); ctx.lineTo(w * i / 4, -2 * i / 4 + 6 * (1 - i / 4) - 1); ctx.stroke(); }
      ctx.restore();
    }
    function drawBio(t) {
      const b = st.lv.bio;
      // 병원
      ctx.fillStyle = lingrad(0, -120, 0, 0, ['#f1f5f9', '#d4dde9']);
      ctx.fillRect(532, -112, 54, 112);
      ctx.fillStyle = '#e11d48'; ctx.fillRect(552, -100, 14, 36); ctx.fillRect(541, -89, 36, 14);
      ctx.fillStyle = 'rgba(110,135,170,.5)'; for (let i = 0; i < 3; i++) { ctx.fillRect(540, -52 + i * 18, 12, 10); ctx.fillRect(566, -52 + i * 18, 12, 10); }
      // 온실
      const s = pop(b);
      ctx.save(); ctx.translate(612, 0);
      ctx.fillStyle = 'rgba(190,240,215,.55)'; ctx.strokeStyle = '#6aae8a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26, -34); ctx.quadraticCurveTo(0, -80 * (0.5 + 0.5 * s), 26, -34); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (b > 0.02) {
        for (let i = 0; i < 4; i++) {
          const gx = 596 + i * 11, h = (10 + (i % 2) * 6) * clamp(b * 1.2 - i * 0.1, 0, 1);
          ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, -h); ctx.stroke();
          ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(gx - 3, -h, 4, 2.4, -0.5, 0, TAU); ctx.ellipse(gx + 3, -h + 2, 4, 2.4, 0.5, 0, TAU); ctx.fill();
        }
        // DNA 홀로그램
        const cx = 560, cy = -158, sc = s;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        D.glow(0, 0, 46, '#db2777', 0.22 * b);
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = k ? '#f472b6' : '#a78bfa'; ctx.lineWidth = 3.2; ctx.beginPath();
          for (let i = 0; i <= 24; i++) { const yy = -32 + i * (64 / 24), xx = Math.sin(i * 0.5 + t * 2.4 + k * Math.PI) * 15; if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
          ctx.stroke();
        }
        ctx.strokeStyle = rgba('#fff', 0.7); ctx.lineWidth = 1.8;
        for (let i = 1; i < 24; i += 3) { const yy = -32 + i * (64 / 24), xx = Math.sin(i * 0.5 + t * 2.4) * 15; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(-xx, yy); ctx.stroke(); }
        ctx.restore();
      }
    }
    function drawRocket(t) {
      const sp = st.lv.space; if (sp < 0.02) return;
      const r = st.rocket;
      // 발사대
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(724, -12, 48, 12); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(764, -92, 6, 80);
      if (r.a > 0.02) {
        ctx.save(); ctx.globalAlpha = r.a * clamp(sp * 1.5, 0, 1); ctx.translate(748, -12 - r.y);
        if (r.state === 'pad' && !RM) ctx.translate(Math.sin(t * 30) * (r.wait < 0.8 ? 0.8 : 0), 0);
        if (r.state === 'up') {
          const fl = 18 + Math.sin(t * 40) * 5;
          const g = ctx.createLinearGradient(0, 0, 0, fl + 8); g.addColorStop(0, '#fff7c2'); g.addColorStop(0.5, '#fb923c'); g.addColorStop(1, 'rgba(239,68,68,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, fl + 8); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(0, -66); ctx.quadraticCurveTo(11, -48, 10, 0); ctx.lineTo(-10, 0); ctx.quadraticCurveTo(-11, -48, 0, -66); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(0, -66); ctx.quadraticCurveTo(5, -58, 6, -52); ctx.lineTo(-6, -52); ctx.quadraticCurveTo(-5, -58, 0, -66); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(0, -36, 4.6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-18, 2); ctx.lineTo(-10, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(18, 2); ctx.lineTo(10, 0); ctx.fill();
        ctx.restore();
      }
      // 인공위성
      const ang = t * 0.35, sx = 400 + Math.cos(ang) * 360, sy = -330 + Math.sin(ang) * 46;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(pop(sp), pop(sp)); ctx.rotate(Math.sin(ang) * 0.3);
      ctx.fillStyle = '#1d4ed8'; ctx.fillRect(-22, -4, 14, 8); ctx.fillRect(8, -4, 14, 8);
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); rr(-8, -7, 16, 14, 3); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
      ctx.restore();
      // 궤도 점선
      ctx.save(); ctx.strokeStyle = rgba('#fff', 0.5 * sp); ctx.lineWidth = 1.6; ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.ellipse(400, -330, 360, 46, 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
    function drawCityScene(t) {
      const R = st.R, sc = R.w / 800;
      st.sc = sc; st.gy = R.h - 44 * sc;
      const haze = 1 - st.lv.climate;
      // 하늘
      const top = mix('#6fc2ff', '#aab8c4', haze * 0.85), mid = mix('#bfe6ff', '#e0cdb0', haze * 0.9);
      ctx.fillStyle = lingrad(0, 0, 0, R.h, [top, mid, '#eef6fc']);
      ctx.fillRect(R.x, R.y, R.w, R.h);
      // 해
      const sunx = R.w * 0.14, suny = R.h * 0.2;
      D.glow(sunx, suny, 90 * sc + 20, '#fff2b0', 0.55 - haze * 0.25);
      ctx.fillStyle = mix('#ffe58a', '#f4b36a', haze); ctx.beginPath(); ctx.arc(sunx, suny, 26 * sc + 6, 0, TAU); ctx.fill();
      // 구름 / 매연
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 230 + t * (6 + i * 2)) % 1000) - 100, cy = (60 + i * 44) * (isTall() ? 1.4 : 0.9);
        const col = mix('#ffffff', '#8c8f96', haze * 0.8);
        ctx.fillStyle = rgba(col, 0.82);
        ctx.beginPath(); ctx.arc(cx * sc, cy, 20 * sc + 8, 0, TAU); ctx.arc((cx + 26) * sc, cy - 8, 26 * sc + 8, 0, TAU); ctx.arc((cx + 56) * sc, cy, 20 * sc + 8, 0, TAU); ctx.fill();
      }
      ctx.save();
      ctx.translate(0, st.gy); ctx.scale(sc, sc);
      // 위성·로켓 (뒤쪽)
      // 풍력 발전기 (뒤쪽 언덕)
      ctx.fillStyle = mix('#b5d9b8', '#a8b5a3', haze);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34); ctx.quadraticCurveTo(200, -64, 400, -30); ctx.quadraticCurveTo(620, -6, 800, -38); ctx.lineTo(800, 0); ctx.fill();
      drawTurbine(216, 168, t, pop(st.lv.climate));
      drawTurbine(504, 150, t * 0.9, pop(clamp(st.lv.climate * 1.4 - 0.2, 0, 1)));
      drawTurbine(650, 128, t * 1.1, pop(clamp(st.lv.climate * 1.4 - 0.35, 0, 1)));
      BLD.forEach((b, i) => drawBuilding(b, i, t));
      drawFactory(t);
      drawBio(t);
      drawRocket(t);
      drawAIHolo(t);
      // 옥상 태양광
      drawSolar(414, -130, 44, pop(st.lv.climate)); drawSolar(474, -164, 44, pop(clamp(st.lv.climate * 1.3 - 0.2, 0, 1))); drawSolar(644, -112, 44, pop(clamp(st.lv.climate * 1.3 - 0.3, 0, 1)));
      // 인도 · 도로
      ctx.fillStyle = '#cdd6e2'; ctx.fillRect(-10, 0, 820, 8);
      ctx.fillStyle = '#5b6678'; ctx.fillRect(-10, 8, 820, 36);
      ctx.fillStyle = rgba('#fff', 0.8);
      for (let x = -20 + ((t * 20) % 40); x < 820; x += 40) ctx.fillRect(x, 25, 22, 3);
      st.cars.forEach((c) => drawCar(c, t));
      // 가로수
      [20, 196, 304, 412, 600, 700, 770].forEach((x, i) => drawTree(x, pop(clamp(st.lv.climate * 1.5 - i * 0.12, 0, 1)), t));
      ctx.restore();
    }
    function drawCards(t) {
      st.cards.forEach((k) => {
        const T0 = TECH[k.id], on = st.on[k.id];
        const pr = now() - (st.cardAt[k.id] || -9);
        const bump = pr < 0.4 ? Math.sin(pr / 0.4 * Math.PI) * 0.06 : 0;
        const hov = st.hov === k.id;
        ctx.save();
        const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
        ctx.translate(cx, cy - (hov ? 2 : 0)); ctx.scale(1 + bump + (hov ? 0.02 : 0), 1 + bump + (hov ? 0.02 : 0)); ctx.translate(-cx, -cy);
        if (on) D.glow(cx, cy, k.w * 0.7, T0.color, 0.25);
        card(k.x, k.y, k.w, k.h, { r: 16, fill: on ? '#fff' : '#f7f9fc', stroke: on ? T0.color : '#d5deea', lw: on ? 3.5 : 2.5, lift: on ? 0.6 : 0 });
        emo(T0.icon, cx, k.y + 28, 30);
        T(T0.name, cx, k.y + 62, 15, { a: 'center', c: INK, w: 800, fit: k.w - 14 });
        // 스위치
        const sw = { x: cx - 24, y: k.y + k.h - 22, w: 48, h: 16 };
        ctx.fillStyle = on ? T0.color : '#cbd5e1'; ctx.beginPath(); rr(sw.x, sw.y, sw.w, sw.h, 8); ctx.fill();
        const kx = sw.x + 8 + (on ? 32 : 0) * st.lv[k.id] + (on ? 0 : 0);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sw.x + 8 + 32 * st.lv[k.id], sw.y + 8, 6.5, 0, TAU); ctx.fill();
        ctx.restore();
      });
    }
    function drawChips(t) {
      st.chips.forEach((c) => {
        if (c.a < 0.03) return;
        const isNew = c.kind === 'new';
        const w = c.w, h = 26, k = 0.85 + 0.15 * Math.min(1, c.a);
        ctx.save();
        ctx.globalAlpha = clamp(c.a, 0, 1);
        const cx = c.x + w / 2, cy = c.y + h / 2;
        ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
        card(c.x, c.y, w, h, { r: 13, fill: isNew ? '#f5f3ff' : '#fff1f2', stroke: isNew ? '#7c3aed' : '#e11d48', lw: 2, alpha: 0.7 });
        T((isNew ? '✨ ' : '▼ ') + c.name, c.x + 11, c.y + 18.5, 13.5, { c: isNew ? '#5b21b6' : '#9f1239', w: 800 });
        ctx.restore();
      });
    }
    return {
      st, layout, update, onCount, setTech,
      reset() { TECHS.forEach((t) => { st.on[t.id] = false; }); st.cap = null; },
      allOn() { TECHS.forEach((t) => setTech(t.id, true)); },
      enter() { if (!st.R) layout(); },
      draw(t) {
        const R = st.R;
        ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
        drawCityScene(t);
        ctx.restore();
        drawChips(t);
        forecastTag(R.w - 88, 12);
        // 설명 띠
        const n = onCount();
        let msg = '과학기술 카드를 켜 보세요', col = MUTED;
        if (st.cap) { msg = TECH[st.cap].icon + ' ' + TECH[st.cap].name + ': ' + TDESC[st.cap]; col = TECH[st.cap].color; }
        ctx.font = fnt(13.5, 800);
        const lim = R.w - 28 - 90;
        const lines = wrapLines(msg, lim - 24, fnt(13.5, 800));
        const ch = lines.length * 18 + 12;
        const a = clamp((now() - st.capAt) / 0.3, 0, 1);
        ctx.save(); ctx.globalAlpha = st.cap ? a : 1;
        card(14, 12, Math.min(lim, ctx.measureText(lines[0]).width + 28 + (lines.length > 1 ? 80 : 0)), ch, { r: 12, fill: 'rgba(255,255,255,.92)', stroke: rgba(col, 0.7), lw: 1.8, alpha: 0.6 });
        lines.forEach((l, i) => T(l, 26, 31 + i * 18, 13.5, { c: col, w: 800 }));
        ctx.restore();
        drawCards(t);
        if (isTall()) T('켜 둔 기술 ' + n + ' / ' + TECHS.length, 240, 780, 15, { a: 'center', c: n === TECHS.length ? '#14a058' : MUTED, w: 800 });
        else T('켜 둔 기술 ' + n + ' / ' + TECHS.length, 400, 588, 14, { a: 'center', c: n === TECHS.length ? '#14a058' : MUTED, w: 800 });
      },
      down(p) {
        const k = st.cards.find((c) => inR(p, c));
        if (k) { setTech(k.id, !st.on[k.id]); if (!st.on[k.id]) { st.cap = null; } }
        return false;
      },
      hover(p) { const k = st.cards.find((c) => inR(p, c)); st.hov = k ? k.id : null; return k ? 'pointer' : null; },
      toolbar() { return {}; },
    };
  })();
  /* =========================================================
     ③-b 직업 변화 분류 (줄어듦 / 늘어남 / 새로 생김 · 모두 '예상')
     ========================================================= */
  SC.sort = (() => {
    const USE = ['factory', 'entry', 'cashier', 'data', 'renew', 'biotech', 'ethic', 'repair', 'farm'];
    const SORT9 = USE.map((id) => SORT_JOBS.find((j) => j.id === id));
    const CAT_DESC = { down: '기계가 대신하기 쉬운 일', up: '더 많이 필요해지는 일', new: '새로 만들어지는 일' };
    const CAT_ORDER = ['down', 'up', 'new'];
    const st = { cards: [], L: null, drag: null, sel: null, msg: null, msgAt: -9, hoverCat: null, catPop: {} };
    SORT9.forEach((j, i) => { st.cards.push({ job: j, x: new SciSim.Spring(0, { stiffness: 220, damping: 22 }), y: new SciSim.Spring(0, { stiffness: 220, damping: 22 }), placed: null, slot: -1, lift: 0, s: 1, shake: -9, order: [4, 0, 7, 2, 8, 5, 1, 6, 3][i] }); });
    // 트레이 순서: 섞어서 놓기
    st.cards.sort((a, b) => a.order - b.order);
    function layout(instant) {
      const tall = isTall();
      const cw = tall ? 148 : 232, ch = tall ? 66 : 52;
      const gx = tall ? 8 : 12, x0 = tall ? 8 : 20;
      const colW = tall ? 148 : 240;
      const cols = CAT_ORDER.map((id, i) => ({ id, x: x0 + i * (colW + gx), y: tall ? 56 : 58, w: colW, h: tall ? 288 : 250 }));
      st.L = {
        tall, cw, ch, cols,
        slot: (cat, k) => { const c = cols[CAT_ORDER.indexOf(cat)]; return { x: c.x + (c.w - cw) / 2, y: c.y + (tall ? 58 : 66) + k * (ch + (tall ? 8 : 8)) }; },
        tray: (i) => tall
          ? { x: 8 + (i % 3) * 156, y: 388 + Math.floor(i / 3) * (ch + 10) }
          : { x: 20 + (i % 3) * 252, y: 334 + Math.floor(i / 3) * (ch + 10) },
        panel: tall ? { x: 8, y: 640, w: 464, h: 156 } : { x: 20, y: 516, w: 760, h: 72 },
        trayLabelY: tall ? 372 : 322,
      };
      relayout(instant);
    }
    function relayout(instant) {
      let free = 0;
      const per = { down: 0, up: 0, new: 0 };
      st.cards.forEach((c) => {
        let pos;
        if (c.placed) { c.slot = per[c.placed]++; pos = st.L.slot(c.placed, c.slot); }
        else pos = st.L.tray(free++);
        if (st.drag && st.drag.c === c) return;
        c.x.target = pos.x; c.y.target = pos.y;
        if (instant) { c.x.value = pos.x; c.y.value = pos.y; }
      });
    }
    const count = () => st.cards.filter((c) => c.placed).length;
    function colAt(p) { return st.L.cols.find((c) => inR(p, c)) || null; }
    function cardAt(p) {
      for (let i = st.cards.length - 1; i >= 0; i--) {
        const c = st.cards[i];
        if (c.placed) continue;
        if (inR(p, { x: c.x.value, y: c.y.value, w: st.L.cw, h: st.L.ch })) return c;
      }
      return null;
    }
    function place(c, cat) {
      const cx = c.x.value + st.L.cw / 2, cy = c.y.value + st.L.ch / 2;
      if (c.job.cat === cat) {
        c.placed = cat; c.s = 1.12;
        relayout(false);
        const pos = st.L.slot(cat, c.slot);
        fx(pos.x + st.L.cw / 2, pos.y + st.L.ch / 2, [SORT_CATS.find((k) => k.id === cat).color, '#ffd34d', '#fff']);
        st.msg = c.job; st.msgAt = now(); st.catPop[cat] = now();
        if (count() === SORT9.length) setTimeout(() => say('모든 직업을 분류했어요!', LAY.w / 2, 50, 'good', 3), 500);
      } else {
        c.shake = now();
        const cn = SORT_CATS.find((k) => k.id === cat).name;
        say('‘' + cn + '’ 칸이 아니에요. ' + hintFor(c.job), clamp(cx, 150, LAY.w - 150), clamp(cy - 20, 100, LAY.h - 100), 'bad', 4.2);
        relayout(false);
      }
      st.sel = null;
    }
    function hintFor(j) {
      if (j.cat === 'down') return '이 일은 단순 반복에 가까워 기계가 대신할 수 있는지 생각해 보세요.';
      if (j.cat === 'up') return '지금도 있는 직업이에요. 과학기술이 발달하면 더 필요해질지 생각해 보세요.';
      return '지금은 없거나 아주 드문 직업이에요. 새 기술이 퍼지면 생길 일을 생각해 보세요.';
    }
    function drawCardFace(c, x, y, w, h, o) {
      o = o || {};
      const cat = c.placed ? SORT_CATS.find((k) => k.id === c.placed) : null;
      card(x, y, w, h, { r: 12, fill: cat ? cat.soft : '#fff', stroke: cat ? cat.color : (o.sel ? SUBJ : '#cbd5e1'), lw: cat || o.sel ? 3 : 2.2, lift: o.lift || 0 });
      emo(c.job.icon, x + 26, y + h / 2, isTall() ? 24 : 28);
      if (isTall()) para(c.job.name, x + 46, y + h / 2 - 2 - (wrapLines(c.job.name, w - 56, fnt(13.5, 800)).length > 1 ? 8 : -4), w - 54, 13.5, { w: 800, c: INK, lh: 16.5, max: 3 });
      else T(c.job.name, x + 50, y + h / 2 + 6, 15.5, { w: 800, c: INK, fit: w - 62 });
    }
    return {
      st, layout, count, relayout,
      reset() { st.cards.forEach((c) => { c.placed = null; c.slot = -1; }); st.msg = null; st.sel = null; st.drag = null; relayout(false); },
      enter() { if (!st.L) layout(true); },
      update(dt) {
        st.cards.forEach((c) => {
          c.x.update(dt); c.y.update(dt);
          const want = (st.drag && st.drag.c === c) ? 1 : (st.sel === c ? 0.5 : 0);
          c.lift = SciSim.approach(c.lift, want, dt, 14);
          c.s = SciSim.approach(c.s, st.drag && st.drag.c === c ? 1.05 : 1, dt, 14);
        });
      },
      draw(t) {
        const L = st.L;
        T('직업 카드를 알맞은 칸에 놓아 보세요', LAY.w / 2, isTall() ? 30 : 34, isTall() ? 16 : 18, { a: 'center', c: MUTED, w: 800 });
        forecastTag(LAY.w - 86, 8);
        // 칸
        L.cols.forEach((col) => {
          const cat = SORT_CATS.find((k) => k.id === col.id);
          const hov = st.drag && st.hoverCat === col.id;
          const pp = clamp(1 - (now() - (st.catPop[col.id] || -9)) / 0.45, 0, 1);
          ctx.save();
          const cx = col.x + col.w / 2, cy = col.y + col.h / 2, k = 1 + Math.sin(pp * Math.PI) * 0.025;
          ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
          ctx.beginPath(); rr(col.x, col.y, col.w, col.h, 16);
          ctx.fillStyle = hov ? rgba(cat.color, 0.16) : cat.soft; ctx.fill();
          ctx.strokeStyle = hov ? cat.color : rgba(cat.color, 0.55); ctx.lineWidth = hov ? 3.5 : 2.2; ctx.setLineDash(hov ? [] : [8, 6]); ctx.stroke(); ctx.setLineDash([]);
          // 머리글
          ctx.beginPath(); rr(col.x + 6, col.y + 6, col.w - 12, L.tall ? 40 : 46, 11); ctx.fillStyle = cat.color; ctx.fill();
          T(cat.icon + ' ' + cat.name, col.x + col.w / 2, col.y + (L.tall ? 32 : 28), L.tall ? 17 : 19, { a: 'center', c: '#fff', w: 800 });
          if (!L.tall) T(CAT_DESC[col.id], col.x + col.w / 2, col.y + 43, 13, { a: 'center', c: 'rgba(255,255,255,.92)', w: 700, fit: col.w - 20 });
          // 빈 칸
          for (let i = 0; i < 3; i++) {
            const sp = L.slot(col.id, i);
            const filled = st.cards.some((c) => c.placed === col.id && c.slot === i);
            if (!filled) { ctx.strokeStyle = rgba(cat.color, 0.28); ctx.lineWidth = 1.8; ctx.setLineDash([5, 5]); ctx.beginPath(); rr(sp.x, sp.y, L.cw, L.ch, 12); ctx.stroke(); ctx.setLineDash([]); }
          }
          ctx.restore();
        });
        T('직업 카드 (' + (SORT9.length - count()) + '장 남음)', L.tall ? 12 : 24, L.trayLabelY, 14, { c: MUTED, w: 800 });
        // 카드: 놓인 카드 먼저, 잡은 카드가 맨 위
        const order = st.cards.slice().sort((a, b) => ((st.drag && st.drag.c === a) ? 1 : 0) - ((st.drag && st.drag.c === b) ? 1 : 0));
        order.forEach((c) => {
          const sh = shk(c.shake);
          const x = c.x.value + sh, y = c.y.value - c.lift * 6;
          const sc = c.s;
          ctx.save();
          const cx = x + L.cw / 2, cy = y + L.ch / 2;
          ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
          drawCardFace(c, x, y, L.cw, L.ch, { lift: c.lift, sel: st.sel === c });
          ctx.restore();
        });
        if (st.sel && !st.drag) L.cols.forEach((col, i) => D.ring(col.x + col.w / 2, col.y + 26, 14, t + i * 0.3, { color: SUBJ, width: 2.5 }));
        // 설명 칸
        const pn = L.panel;
        card(pn.x, pn.y, pn.w, pn.h, { r: 16, fill: '#fff', stroke: '#d5deea', lw: 2 });
        if (!st.msg) {
          para('카드를 끌어서(또는 카드를 누르고 칸을 눌러서) 놓아요. 틀리면 카드가 돌아오고 힌트가 나와요. 모두 미래를 예상한 것이에요.', pn.x + 16, pn.y + 28, pn.w - 32, 15, { w: 700, c: MUTED, lh: 21 });
        } else {
          const j = st.msg, cat = SORT_CATS.find((k) => k.id === j.cat), a = clamp((now() - st.msgAt) / 0.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 6);
          T(j.icon + ' ' + j.name + '  →  ' + cat.icon + ' ' + cat.name, pn.x + 16, pn.y + 26, 16, { c: cat.color, w: 800, fit: pn.w - 32 });
          para(j.why, pn.x + 16, pn.y + 50, pn.w - 32, 14.5, { w: 700, c: INK, lh: 20, max: L.tall ? 5 : 2 });
          ctx.restore();
        }
      },
      grab(p) { return !!cardAt(p); },
      down(p) {
        if (st.sel) { const col = colAt(p); const c = cardAt(p); if (col && !c) { place(st.sel, col.id); return false; } }
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
        st.hoverCat = col ? col.id : null;
      },
      up(p) {
        const d = st.drag; if (!d) return;
        st.drag = null; st.hoverCat = null;
        if (!d.moved) { st.sel = st.sel === d.c ? null : d.c; return; }
        const col = colAt({ x: d.c.x.value + st.L.cw / 2, y: d.c.y.value + st.L.ch / 2 }) || colAt(p);
        if (col) place(d.c, col.id); else relayout(false);
      },
      hover(p) { return cardAt(p) ? 'grab' : null; },
      toolbar() { return {}; },
    };
  })();
  /* =========================================================
     ④ 나만의 미래 직업 카드 만들기 (문제 → 과학 지식 → 기술 → 카드 발급)
     ========================================================= */
  const WORK = {
    heat: '폭염이 심한 도시의 열 환경을 분석해 시민의 건강을 지키는 방법을 설계해요.',
    space: '우주 쓰레기의 움직임을 추적하고 안전하게 치우는 방법을 설계해요.',
    aging: '어르신의 건강을 지키고 일상생활을 돕는 방법을 설계해요.',
    plastic: '플라스틱 쓰레기를 줄이고 다시 쓰거나 분해하는 방법을 설계해요.',
  };
  SC.design = (() => {
    const st = { problem: null, know: new Set(), tech: new Set(), kc: [], tc: [], issued: false, issueAt: -9, flip: 1, name: '', pShake: {}, L: null, btnHot: 0, sel: {} };
    const stored = store.get('m3-science-careers:name');
    if (typeof stored === 'string') st.name = stored.slice(0, 14);
    function layout() {
      const tall = isTall();
      const L = { tall };
      L.pw = tall ? 226 : 222; L.ph = 50;
      L.prob = PROBLEMS.map((p, i) => ({ id: p.id, x: (tall ? 8 : 16) + (i % 2) * (L.pw + 8), y: (tall ? 28 : 56) + Math.floor(i / 2) * 58, w: L.pw, h: L.ph }));
      L.l1 = tall ? 20 : 46;
      L.kn = tall
        ? { x0: 8, w: 148, gap: 10, y0: 176, h: 44, rowGap: 6, cols: 3, label: 164 }
        : { x0: 16, w: 144, gap: 11, y0: 204, h: 44, rowGap: 6, cols: 3, label: 192 };
      L.te = tall
        ? { x0: 8, w: 226, gap: 8, y0: 308, h: 44, rowGap: 6, cols: 2, label: 296 }
        : { x0: 16, w: 222, gap: 8, y0: 332, h: 44, rowGap: 6, cols: 2, label: 320 };
      L.btn = tall ? { x: 8, y: 410, w: 464, h: 54 } : { x: 16, y: 438, w: 454, h: 54 };
      L.note = tall ? { x: 12, y: 480 } : { x: 18, y: 520 };
      L.card = tall ? { x: 8, y: 508, w: 464, h: 304 } : { x: 490, y: 20, w: 294, h: 500 };
      st.L = L;
      buildChips(false);
    }
    function pos(g, i) { return { x: g.x0 + (i % g.cols) * (g.w + g.gap), y: g.y0 + Math.floor(i / g.cols) * (g.h + g.rowGap), w: g.w, h: g.h }; }
    function buildChips(pop) {
      const L = st.L, p = st.problem ? PROB[st.problem] : null;
      const kIds = p ? mixOrder(p.kRel, p.kBad) : [];
      const tIds = p ? mixOrderT(p.tRel, p.tBad) : [];
      const t0 = now();
      st.kc = kIds.map((id, i) => Object.assign({ id, text: KNOW_ALL[id], t0: pop ? t0 + i * 0.06 : t0 - 2, shake: -9, rel: p.kRel.includes(id) }, pos(L.kn, i)));
      st.tc = tIds.map((id, i) => Object.assign({ id, icon: TECH_ALL[id][0], text: TECH_ALL[id][1], t0: pop ? t0 + 0.4 + i * 0.06 : t0 - 2, shake: -9, rel: p.tRel.includes(id) }, pos(L.te, i)));
    }
    const valid = () => !!st.problem && st.know.size >= 2 && st.tech.size >= 1;
    function jobTitle() {
      if (st.name) return st.name;
      if (!st.problem) return '나만의 미래 직업';
      const p = PROB[st.problem];
      for (const t of st.tech) if (p.names[t]) return p.names[t];
      return p.base;
    }
    function chooseProblem(id) {
      if (st.problem === id) return;
      st.problem = id; st.know = new Set(); st.tech = new Set(); st.issued = false; st.flip = 1;
      buildChips(true);
      Sound.click();
      const r = st.L.prob.find((k) => k.id === id);
      st.pShake[id] = now();
      fx(r.x + r.w / 2, r.y + r.h / 2, ['#64748b', '#ffd34d', '#fff']);
    }
    function tapChip(c, set, max, fbMap, label) {
      const p = PROB[st.problem];
      if (!c.rel) {
        c.shake = now();
        say(fbMap[c.id] || '이 문제와는 거리가 멀어요.', clamp(c.x + c.w / 2, 160, LAY.w - 160), c.y - 6, 'bad', 3.6);
        return;
      }
      if (set.has(c.id)) { set.delete(c.id); Sound.click(); }
      else if (set.size >= max) { say('최대 ' + max + '개까지 고를 수 있어요. 하나를 먼저 빼 보세요.', LAY.w / 2, c.y - 6, 'bad', 2.4); }
      else { set.add(c.id); fx(c.x + c.w / 2, c.y + c.h / 2, [TECH_COLOR, '#ffd34d', '#fff']); st.issued = false; st.flip = 1; }
    }
    const TECH_COLOR = SUBJ;
    function issue() {
      if (!valid() || st.issued) return;
      st.issued = true; st.issueAt = now();
      st.flip = 0;
      SciSim.tween(st, { flip: 1 }, { duration: 0.7, ease: 'outCubic' });
      const c = st.L.card;
      setTimeout(() => {
        PT.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 34, speed: 260, size: 4.5, colors: ['#ffd34d', '#7c3aed', '#2563eb', '#16a34a', '#f472b6'], gravity: 220 });
        Sound.tick();
      }, RM ? 0 : 280);
      store.set('m3-science-careers:card', { problem: st.problem, know: [...st.know], tech: [...st.tech], name: jobTitle() });
    }
    function chipDraw(c, selSet, t) {
      const k = clamp((now() - c.t0) / 0.38, 0, 1);
      if (k <= 0) return;
      const sc = EZ.outBack(k), sel = selSet.has(c.id), sh = shk(c.shake);
      const cx = c.x + c.w / 2 + sh, cy = c.y + c.h / 2;
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.6); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      const bad = now() - c.shake < 0.6;
      card(c.x + sh, c.y, c.w, c.h, { r: 12, fill: sel ? '#eef2f7' : '#fff', stroke: bad ? '#e11d48' : (sel ? '#334155' : '#cbd5e1'), lw: sel || bad ? 3 : 2.2, lift: sel ? 0.4 : 0 });
      if (c.icon) emo(c.icon, c.x + sh + 24, c.y + c.h / 2, 24);
      T(c.text, c.x + sh + (c.icon ? 46 : 12), c.y + c.h / 2 + 5, 14.5, { w: 800, c: INK, fit: c.w - (c.icon ? 58 : 38) });
      if (sel) D.check(c.x + sh + c.w - 14, c.y + 14, 8, 1, { color: '#334155' });
      ctx.restore();
    }
    function ghostRow(g, n, text) {
      for (let i = 0; i < n; i++) {
        const r = pos(g, i);
        ctx.strokeStyle = '#d5deea'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); rr(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    function drawCardPreview(t) {
      const c = st.L.card, tall = st.L.tall;
      const x = c.x, y = c.y, w = c.w, h = c.h;
      const p = st.problem ? PROB[st.problem] : null;
      const sx = Math.max(0.03, Math.abs(Math.cos(Math.PI * (1 - st.flip))) * (st.flip < 1 ? 1 : 1));
      ctx.save();
      const cx = x + w / 2, cy = y + h / 2;
      ctx.translate(cx, cy); ctx.scale(st.flip < 1 ? Math.max(0.03, Math.abs(Math.cos(Math.PI * (1 - st.flip) * 0.5 + 0))) : 1, 1); ctx.translate(-cx, -cy);
      const done = st.issued;
      if (done) D.glow(cx, cy, w * 0.8, '#ffd34d', 0.28 + 0.08 * Math.sin(t * 3));
      card(x, y, w, h, { r: 18, grad: done ? ['#fffdf2', '#fff7d6'] : ['#ffffff', '#f4f6fa'], stroke: done ? '#f59e0b' : '#b6c2d4', lw: done ? 4 : 2.5, lift: done ? 0.8 : 0.2 });
      ctx.save(); ctx.beginPath(); rr(x, y, w, h, 18); ctx.clip();
      ctx.fillStyle = done ? '#f59e0b' : SUBJ; ctx.fillRect(x, y, w, 42);
      ctx.restore();
      T('🪪 나의 미래 직업 카드', x + 14, y + 27, 16, { c: '#fff', w: 800 });
      chip(x + w - 74, y + 9, 64, 24, '🔮 예상', { fill: '#fef3c7', c: '#92400e', size: 12.5, pad: 4 });
      // 이름
      const ty = y + 42;
      if (p) emo(p.icon, x + 38, ty + 38, tall ? 34 : 42); else T('?', x + 38, ty + 48, 40, { a: 'center', c: '#cbd5e1', w: 800 });
      const nm = jobTitle();
      para(nm, x + 72, ty + (nm.length > 11 ? 34 : 44), w - 86, tall ? 18 : 20, { w: 800, c: p ? INK : '#9aa8bb', lh: tall ? 22 : 25, max: 2 });
      // 본문
      let yy = ty + (tall ? 82 : 92);
      const lab = (s) => { T(s, x + 16, yy, 13.5, { c: SUBJ, w: 800 }); yy += tall ? 7 : 10; };
      lab('🌍 해결할 문제');
      T(p ? p.name : '문제를 고르면 채워져요', x + 16, yy + 16, 15.5, { c: p ? INK : '#9aa8bb', w: 800 });
      yy += tall ? 36 : 44;
      lab('🔬 필요한 과학 지식');
      const kn = [...st.know].map((id) => KNOW_ALL[id]);
      let cx2 = x + 16, cy2 = yy;
      if (!kn.length) T('지식을 고르면 채워져요', x + 16, yy + 16, 14.5, { c: '#9aa8bb', w: 700 });
      kn.forEach((s) => {
        ctx.font = fnt(13.5, 800); const tw = ctx.measureText(s).width + 20;
        if (cx2 + tw > x + w - 12) { cx2 = x + 16; cy2 += 28; }
        chip(cx2, cy2, tw, 24, s, { fill: '#eef2f7', stroke: '#94a3b8', c: INK, size: 13.5, lw: 1.5, pad: 8 }); cx2 += tw + 6;
      });
      yy = cy2 + (kn.length ? 34 : 30) + (tall ? 4 : 10);
      lab('🛠️ 쓰는 기술');
      cx2 = x + 16; cy2 = yy;
      if (!st.tech.size) T('기술을 고르면 채워져요', x + 16, yy + 16, 14.5, { c: '#9aa8bb', w: 700 });
      [...st.tech].forEach((id) => {
        const s = TECH_ALL[id][0] + ' ' + TECH_ALL[id][1];
        ctx.font = fnt(13.5, 800); const tw = ctx.measureText(s).width + 20;
        if (cx2 + tw > x + w - 12) { cx2 = x + 16; cy2 += 28; }
        chip(cx2, cy2, tw, 24, s, { fill: '#eef2f7', stroke: '#94a3b8', c: INK, size: 13.5, lw: 1.5, pad: 8 }); cx2 += tw + 6;
      });
      yy = cy2 + (st.tech.size ? 34 : 30) + (tall ? 4 : 10);
      if (!tall || yy < y + h - 70) {
        lab('📝 하는 일');
        para(p ? WORK[p.id] : '카드를 완성하면 하는 일이 정리돼요', x + 16, yy + 14, w - 32, 14.5, { w: 700, c: p ? INK : '#9aa8bb', lh: 20, max: tall ? 3 : 4 });
      }
      if (done) {
        const k = clamp((now() - st.issueAt - 0.35) / 0.4, 0, 1);
        if (k > 0) {
          ctx.save(); ctx.translate(x + w - 70, y + h - 50); ctx.rotate(-0.22); const s = 1.4 - 0.4 * EZ.outBack(k); ctx.scale(s, s); ctx.globalAlpha = k;
          ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3.5; ctx.beginPath(); rr(-52, -20, 104, 40, 8); ctx.stroke();
          T('발급 완료', 0, 7, 20, { a: 'center', c: '#dc2626', w: 800 });
          ctx.restore();
        }
      }
      T('이 기기에만 저장돼요', x + w - 12, y + h - 10, 12.5, { a: 'right', c: MUTED, w: 700 });
      ctx.restore();
    }
    return {
      st, layout, valid, jobTitle,
      issue,
      get issued() { return st.issued; },
      reset() { st.problem = null; st.know = new Set(); st.tech = new Set(); st.issued = false; st.flip = 1; buildChips(false); },
      setName(v) { st.name = (v || '').slice(0, 14); store.set('m3-science-careers:name', st.name); },
      getName() { return st.name; },
      enter() { if (!st.L) layout(); },
      update(dt) { st.btnHot = SciSim.approach(st.btnHot, valid() && !st.issued ? 1 : 0, dt, 8); },
      draw(t) {
        const L = st.L;
        T('① 해결할 미래 문제', L.tall ? 10 : 16, L.l1, 14, { c: MUTED, w: 800 });
        L.prob.forEach((r) => {
          const p = PROB[r.id], on = st.problem === r.id, sh = shk(st.pShake[r.id] || -9) * 0;
          const pop = clamp(1 - (now() - (st.pShake[r.id] || -9)) / 0.4, 0, 1);
          ctx.save();
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2, k = 1 + Math.sin(pop * Math.PI) * 0.05;
          ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
          card(r.x, r.y, r.w, r.h, { r: 14, fill: on ? '#eef2f7' : '#fff', stroke: on ? '#334155' : '#cbd5e1', lw: on ? 3.5 : 2.2, lift: on ? 0.5 : 0 });
          emo(p.icon, r.x + 28, r.y + r.h / 2, 28);
          T(p.name, r.x + 54, r.y + r.h / 2 + 6, 16, { w: 800, c: INK, fit: r.w - 64 });
          if (on) D.check(r.x + r.w - 15, r.y + 15, 9, 1, { color: '#334155' });
          ctx.restore();
        });
        if (!st.problem && !RM) { L.prob.forEach((r, i) => D.ring(r.x + r.w - 20, r.y + r.h / 2, 5, t + i * 0.25, { color: SUBJ, width: 2 })); }
        T('② 필요한 과학 지식 (관련 있는 것 2~3개)', L.tall ? 10 : 16, L.kn.label + (L.tall ? 0 : 0), 14, { c: MUTED, w: 800 });
        if (!st.problem) ghostRow(L.kn, 6); else st.kc.forEach((c) => chipDraw(c, st.know, t));
        T('③ 문제를 푸는 기술 (1~2개)', L.tall ? 10 : 16, L.te.label, 14, { c: MUTED, w: 800 });
        if (!st.problem) ghostRow(L.te, 4); else st.tc.forEach((c) => chipDraw(c, st.tech, t));
        if (!st.problem) T('먼저 해결하고 싶은 문제를 골라요', L.kn.x0 + 227, L.kn.y0 + 52, 15, { a: 'center', c: '#9aa8bb', w: 800 });
        // 발급 버튼
        const b = L.btn, hot = st.btnHot;
        ctx.save();
        const bx = b.x + b.w / 2, by = b.y + b.h / 2, bk = 1 + (hot > 0.5 ? Math.sin(t * 5) * 0.012 : 0);
        ctx.translate(bx, by); ctx.scale(bk, bk); ctx.translate(-bx, -by);
        card(b.x, b.y, b.w, b.h, { r: 16, fill: st.issued ? '#f1f5f9' : (hot > 0.5 ? SUBJ : '#e2e8f0'), shadow: hot > 0.5, lift: hot * 0.5 });
        T(st.issued ? '✔ 카드 발급 완료!' : (valid() ? '🪪 미래 직업 카드 발급하기' : '🪪 문제·지식·기술을 고르면 발급할 수 있어요'), b.x + b.w / 2, b.y + b.h / 2 + 6, 17, { a: 'center', c: st.issued ? '#14a058' : (hot > 0.5 ? '#fff' : '#94a3b8'), w: 800, fit: b.w - 24 });
        ctx.restore();
        drawCardPreview(t);
      },
      down(p) {
        const L = st.L;
        const pr = L.prob.find((r) => inR(p, r)); if (pr) { chooseProblem(pr.id); return false; }
        if (st.problem) {
          const kc = st.kc.find((c) => inR(p, c)); if (kc) { tapChip(kc, st.know, 3, PROB[st.problem].kFb); return false; }
          const tc = st.tc.find((c) => inR(p, c)); if (tc) { tapChip(tc, st.tech, 2, PROB[st.problem].tFb); return false; }
        }
        if (inR(p, L.btn)) { if (valid()) issue(); else say(!st.problem ? '먼저 해결할 문제를 골라요.' : '관련 있는 과학 지식 2개 이상과 기술 1개 이상이 필요해요.', LAY.w / 2, L.btn.y - 6, 'bad', 2.6); }
        return false;
      },
      hover(p) {
        const L = st.L; if (!L) return null;
        return (L.prob.some((r) => inR(p, r)) || st.kc.some((c) => inR(p, c)) || st.tc.some((c) => inR(p, c)) || inR(p, L.btn)) ? 'pointer' : null;
      },
      toolbar() { return { reset: true, name: true }; },
    };
  })();
  /* =========================================================
     미션
     ========================================================= */
  SC.dex.reset = function () { const st = SC.dex.st; st.seen.clear(); st.open = null; st.o = 0; st.closing = false; SC.dex.setFilter('all'); };
  const levels = [
    {
      title: '과학 관련 직업 둘러보기', short: '직업 탐색', icon: '📖', phase: '관찰',
      features: ['dex'],
      intro: '<p class="si-q">❓ 탐구 질문: 과학을 배우면 어떤 일을 할 수 있고, 미래에는 어떤 직업이 생길까?</p>' +
        '<p><b>과학 관련 직업 카드 16장</b>을 분야별로 살펴봐요. 카드를 누르면 뒤집혀서 <b>하는 일</b>, <b>쓰는 과학 지식</b>, <b>필요한 역량</b>이 나타나요.</p>',
      setup() { setScene('dex'); SC.dex.reset(); showHint('위의 분야 버튼으로 골라 보고, 카드를 눌러 뒤집어 보세요', 6000); },
      recap: '과학 관련 직업은 물리·공학, 화학, 생명, 지구·우주, 융합 등 여러 분야에 있고, 분야마다 하는 일과 쓰는 과학 지식이 달라요.',
      summary: '<p><b>과학 관련 직업의 분야</b></p><ul><li>물리·공학: 반도체 공학자, 로봇 공학자, 신재생 에너지 기술자</li><li>화학: 신약 개발 연구원, 화장품 연구원, 신소재 공학자</li><li>생명: 생명 공학 연구원, 수의사, 식품 연구원, 의사</li><li>지구·우주: 기상 예보관, 지진 연구원, 해양 연구원, 천문학자</li><li>융합: 데이터 과학자, 기후변화 대응 전문가</li></ul><p>직업마다 하는 일, 쓰는 과학 지식, 필요한 역량이 있다.</p>',
      missions: [
        {
          title: '직업 카드 열어 보기',
          goal: '분야 버튼을 눌러 가며 직업 카드를 열어 보세요. <b>4개 분야</b> 이상에서 카드를 1장씩 열면 돼요.',
          hint: '위쪽의 분야 버튼(물리·공학, 화학, 생명, 지구·우주, 융합)을 누르면 그 분야의 카드만 보여요.',
          setup() { setScene('dex'); },
          check: () => SC.dex.fieldsSeen().size >= 4,
          status: () => '열어 본 분야 <b>' + Math.min(4, SC.dex.fieldsSeen().size) + '/4</b> · 열어 본 카드 <b>' + SC.dex.seenCount() + '장</b>',
          hold: 0.3,
          explain: '과학 관련 직업은 한 분야에만 있지 않아요. 물리·공학, 화학, 생명, 지구·우주, 그리고 여러 분야를 합친 융합 분야까지 다양해요.',
        },
        {
          type: 'quiz', title: '과학 관련 직업이란?',
          setup() { setScene('dex'); },
          goal: '직업 카드를 살펴본 결과로 알맞은 설명은?',
          choices: ['과학자와 연구원만 과학 지식을 쓴다', '분야마다 하는 일은 다르지만, 모두 과학 지식과 탐구하는 능력을 활용한다', '카드 뒷면의 과학 지식은 직업과 관계가 없다', '과학 관련 직업은 실험실 안에서만 일한다'],
          answer: 1,
          feedback: ['의사, 수의사, 기상 예보관, 식품 연구원도 과학 지식을 써요. 연구원만 쓰는 것이 아니에요.', '', '카드 뒷면의 ‘쓰는 과학 지식’이 바로 그 직업이 하는 일의 바탕이에요.', '기상 예보관, 해양 연구원처럼 현장에서 일하는 직업도 많아요.'],
          explain: '과학 관련 직업은 분야가 다양하고 하는 일도 달라요. 하지만 모두 <b>과학 지식</b>과 <b>탐구 능력</b>을 바탕으로 문제를 해결해요.',
        },
      ],
    },
    {
      title: '직업 속에 숨은 과학', short: '직업 속 과학', icon: '🔗', phase: '탐구',
      features: ['link'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직업 카드 뒷면에서 직업마다 ‘쓰는 과학 지식’이 있다는 것을 확인했어요.</div>' +
        '<p>이번에는 직업을 <b>중학교에서 배운 과학 개념</b>과 이어 봐요. 직업 카드를 끌어서 알맞은 개념에 놓으면 연결선이 생겨요.</p>',
      setup() { setScene('link'); SC.link.reset(); showHint('직업 카드를 끌어서(또는 눌러서) 개념에 이어 보세요', 6000); },
      recap: '직업에서 쓰는 과학 지식은 중학교에서 배운 개념과 이어져 있어요.',
      summary: '<ul><li>기상 예보관 ↔ 기단과 전선 (중3 날씨와 기후변화)</li><li>반도체 공학자 ↔ 전기 (중2 전기와 자기)</li><li>신약 개발 연구원 ↔ 화학 반응 (중3 화학 반응의 규칙성)</li><li>지진 연구원 ↔ 지권 (중2 지권의 변화)</li><li>식품 연구원 ↔ 소화와 영양소 (중2 동물과 에너지)</li></ul><p>지금 배우는 과학이 미래 직업의 바탕이 된다.</p>',
      missions: [
        {
          title: '직업과 과학 개념 연결하기',
          goal: '직업 카드 <b>5개</b>를 그 직업에 쓰이는 과학 개념에 연결하세요.',
          hint: '직업 카드를 누르면 하는 일이 떠올라요. 틀리면 그 직업이 하는 일이 나오니 힌트로 쓰세요.',
          setup() { setScene('link'); },
          check: () => SC.link.count() >= 5,
          status: () => '연결한 직업 <b>' + SC.link.count() + '/5</b>',
          hold: 0.5,
          explain: '기상 예보관은 기단과 전선, 반도체 공학자는 전기, 신약 개발 연구원은 화학 반응, 지진 연구원은 지권, 식품 연구원은 소화와 영양소를 써요. 중학교에서 배우는 과학이 직업의 바탕이 돼요.',
        },
        {
          type: 'quiz', title: '연결선이 알려 주는 것',
          setup() { setScene('link'); },
          goal: '연결선을 보고 알 수 있는 내용으로 가장 알맞은 것은?',
          choices: ['직업에는 한 가지 과학 개념만 필요하다', '중학교에서 배우는 과학은 직업과 관계가 없다', '직업에서 쓰는 과학 지식은 중학교에서 배운 과학 개념과 이어져 있다', '과학 개념은 과학자만 알면 된다'],
          answer: 2,
          feedback: ['로봇 공학자는 힘과 운동, 전기 회로를 함께 쓰는 것처럼 여러 개념이 필요한 직업도 많아요.', '방금 이은 5개의 선이 반대로 보여 주고 있어요.', '', '식품 연구원, 기상 예보관처럼 여러 직업이 과학 개념을 활용해요.'],
          explain: '직업에서 쓰는 과학 지식은 지금 배우는 과학 개념에서 시작해요. 그래서 <b>과학 학습은 직업의 바탕</b>이 돼요.',
        },
      ],
    },
    {
      title: '과학기술이 바꿀 미래 직업', short: '미래의 변화', icon: '🏙️', phase: '분석',
      features: ['city', 'sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직업과 과학 개념이 이어져 있다는 것을 확인했어요.</div>' +
        '<p>과학기술이 발달하면 도시와 직업은 어떻게 달라질까요? <b>과학기술 카드 5장</b>을 켜서 미래 도시가 바뀌는 모습을 보고, 직업이 <b>줄어들지 · 늘어날지 · 새로 생길지</b> 분류해 봐요.</p>' +
        '<p>🔮 미래 이야기는 모두 <b>예상</b>이에요. 근거를 가지고 예상해 보는 것이 중요해요.</p>',
      setup() { setScene('city'); SC.city.reset(); SC.sort.reset(); showHint('아래 카드의 스위치를 켜면 도시가 바뀌어요', 6000); },
      recap: '인공지능·로봇 같은 과학기술이 발달하면 단순 반복 업무는 줄고, 기술을 다루고 관리하는 새로운 직업이 생길 것으로 예상해요.',
      summary: '<p><b>미래 직업 변화 (예상)</b></p><ul><li>줄어듦: 공장 단순 조립원, 자료 입력 사무원, 계산대 계산원</li><li>늘어남: 데이터 과학자, 신재생 에너지 기술자, 생명 공학 연구원</li><li>새로 생김: 인공지능 윤리 전문가, 로봇 정비 기술자, 스마트 팜 전문가 등</li></ul><p>변화의 원인: 인공지능·로봇 등 과학기술의 발달. 미래 직업은 정확히 알 수 없으므로 근거를 가지고 <b>예상</b>한다.</p>',
      missions: [
        {
          title: '미래 도시 바꾸기',
          goal: '과학기술 카드 <b>5장</b>을 모두 켜서 도시가 어떻게 바뀌는지 살펴보세요.',
          hint: '화면 아래의 카드를 하나씩 눌러 스위치를 켜 보세요. 켜면 위쪽에 직업 이름표가 나타나요.',
          setup() { setScene('city'); },
          check: () => SC.city.onCount() >= 5,
          status: () => '켠 기술 <b>' + SC.city.onCount() + '/5</b>',
          hold: 1,
          explain: '인공지능은 자율 주행과 자료 분석, 로봇은 공장 자동화, 기후 위기 대응은 신재생 에너지, 우주 개발은 위성과 로켓, 생명 공학은 의료와 식량 분야를 바꿀 것으로 예상해요. 도시가 바뀌면 필요한 직업도 달라져요.',
        },
        {
          title: '직업 변화 분류하기',
          goal: '직업 카드 <b>9장</b>을 <b>줄어듦 · 늘어남 · 새로 생김</b> 칸에 놓으세요. (모두 예상이에요)',
          hint: '단순 반복 업무는 기계가 대신하기 쉬워요. 지금도 있는 직업 중 더 필요해지는 것과, 새 기술 때문에 처음 생기는 직업을 구분해 보세요.',
          setup() { setScene('sort'); },
          check: () => SC.sort.count() >= 9,
          status: () => '분류한 직업 <b>' + SC.sort.count() + '/9</b>',
          hold: 0.6,
          explain: '단순 반복 업무는 인공지능·로봇이 대신하기 쉬워 줄어들 것으로 예상해요. 데이터 과학자처럼 지금도 있는 직업은 더 필요해지고, 인공지능 윤리 전문가·로봇 정비 기술자·스마트 팜 전문가 같은 직업은 새로 생길 것으로 예상해요.',
        },
        {
          type: 'quiz', title: '직업이 변하는 까닭',
          setup() { setScene('sort'); },
          goal: '어떤 직업은 줄어들고 새로운 직업이 생길 것으로 예상하는 가장 알맞은 까닭은?',
          choices: ['사람들이 점점 일하기 싫어하기 때문에', '과학기술이 발달하면 기계가 대신할 수 있는 일은 줄고, 그 기술을 다루고 관리하는 새로운 일이 생기기 때문에', '직업은 한 번 정해지면 절대 변하지 않기 때문에', '미래 직업은 지금 정확히 알 수 있기 때문에'],
          answer: 1,
          feedback: ['직업의 변화는 일하기 싫어서가 아니라 기술이 발달하면서 필요한 일이 달라지기 때문이에요.', '', '과거에도 새로운 기술이 나오면서 직업이 사라지고 새로 생겼어요. 직업은 계속 변해요.', '미래는 정확히 알 수 없어요. 그래서 근거를 가지고 ‘예상’해 보는 거예요.'],
          explain: '과학기술의 발달은 <b>줄어드는 일</b>과 <b>새로 생기는 일</b>을 함께 만들어요. 그래서 변화를 예상하고 필요한 과학 지식을 배우는 것이 중요해요.',
        },
      ],
    },
    {
      title: '나만의 미래 직업 설계', short: '새 직업 설계', icon: '🪪', phase: '적용',
      features: ['design'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 과학기술이 발달하면 새로운 직업이 생길 것으로 예상했어요.</div>' +
        '<p>이번에는 내가 직접 <b>미래의 문제</b>를 하나 골라, 그 문제를 푸는 <b>새로운 과학 직업</b>을 설계해요. 필요한 <b>과학 지식</b>과 <b>기술</b>을 고르면 직업 카드가 완성돼요.</p>' +
        '<p>🔒 이름은 묻지 않아요. 만든 카드는 이 기기에만 저장돼요.</p>',
      setup() { setScene('design'); SC.design.reset(); showHint('문제를 고른 뒤, 관련 있는 지식과 기술을 골라 보세요', 6000); },
      recap: '사회의 문제를 풀려면 과학 지식과 기술이 필요하고, 그 일을 하는 새로운 직업이 만들어져요.',
      summary: '<p><b>새로운 직업이 만들어지는 과정</b></p><p>사회의 문제(폭염, 우주 쓰레기, 고령 사회, 플라스틱 쓰레기) → 필요한 과학 지식 → 필요한 기술 → 새로운 직업</p><p>미래의 직업은 예상이며, 과학 학습이 새로운 직업을 만드는 바탕이 된다.</p>',
      missions: [
        {
          title: '문제 · 지식 · 기술 고르기', manual: true,
          goal: '해결하고 싶은 <b>문제 1개</b>, 관련 있는 <b>과학 지식 2개 이상</b>, <b>기술 1개 이상</b>을 고르세요.',
          hint: '관련 없는 것을 누르면 칩이 흔들리고 이유가 나와요. 문제를 풀 때 쓰이는 것을 골라 보세요.',
          setup() { setScene('design'); },
          check: () => {
            const d = SC.design.st;
            if (!d.problem) return '먼저 해결하고 싶은 문제를 하나 골라 주세요.';
            if (d.know.size < 2) return '관련 있는 과학 지식을 2개 이상 골라 주세요. (지금 ' + d.know.size + '개)';
            if (d.tech.size < 1) return '문제를 푸는 데 쓰이는 기술을 1개 이상 골라 주세요.';
            return true;
          },
          explain: '새로운 직업은 사회의 문제를 풀기 위해 만들어져요. 문제에 알맞은 <b>과학 지식</b>과 <b>기술</b>을 함께 쓰는 사람이 필요해요.',
        },
        {
          title: '미래 직업 카드 발급',
          goal: '버튼을 눌러 <b>미래 직업 카드</b>를 발급하세요. 위쪽 칸에 직업 이름을 직접 지어도 좋아요.',
          hint: '화면의 ‘미래 직업 카드 발급하기’ 버튼을 눌러요.',
          setup() { setScene('design'); },
          check: () => SC.design.issued,
          hold: 0.5,
          status: () => (SC.design.issued ? '카드 발급 <b>완료</b>' : SC.design.valid() ? '발급 버튼을 눌러요' : '먼저 지식·기술 고르기'),
          explain: '내가 만든 카드는 <b>예상</b>이에요. 하지만 문제 → 과학 지식과 기술 → 직업으로 이어지는 생각 과정은 실제 직업을 정할 때도 똑같이 쓰여요.',
        },
        {
          type: 'quiz', title: '새로운 직업의 탄생',
          setup() { setScene('design'); },
          goal: '새로운 과학 직업이 만들어지는 과정으로 가장 알맞은 것은?',
          choices: ['직업 이름을 먼저 정하고, 문제는 나중에 찾는다', '과학 지식이나 기술 없이도 모든 문제를 풀 수 있다', '사회의 문제 → 필요한 과학 지식과 기술 → 그 일을 하는 새로운 직업', '이미 있는 직업만 계속 생긴다'],
          answer: 2,
          feedback: ['직업은 해결해야 할 문제와 필요한 일에서 생겨나요.', '폭염이나 우주 쓰레기 같은 문제는 과학 지식과 기술이 있어야 풀 수 있어요.', '', '과학기술이 발달하면 이전에 없던 직업도 새로 생겨요.'],
          explain: '사회에 풀어야 할 문제가 생기면, 그것을 해결하는 데 필요한 <b>과학 지식과 기술</b>이 모이고 그 일을 맡는 <b>새로운 직업</b>이 만들어져요.',
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
  const savedName = SC.design.getName();
  if (savedName) jobName.value = savedName;
  jobName.addEventListener('input', () => SC.design.setName(jobName.value.trim()));
  game = SciSim.game({
    simId: 'm3-science-careers',
    mount: '#game',
    badge: '미래 직업 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      dex: '📖 과학 직업 도감', link: '🔗 직업-과학 연결', city: '🏙️ 미래 도시 (예상)', sort: '🗂️ 직업 변화 분류 (예상)', design: '🪪 미래 직업 카드 만들기',
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
    S, SC, JOBS, game,
    get layout() { return LAY.kind; },
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / LAY.w, y: r.top + y * r.height / LAY.h }; },
    setScene,
  };
})();
